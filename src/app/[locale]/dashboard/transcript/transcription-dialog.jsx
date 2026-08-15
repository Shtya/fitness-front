'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { AudioLines, Check, Clipboard, FileAudio, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	createTranscription,
	getStoredTranscriptionProvider,
	GROQ_FREE_MAX_FILE_SIZE,
	storeTranscriptionProvider,
	TRANSCRIPTION_PROVIDERS,
} from './transcription-client';

const labels = {
	en: {
		title: 'Transcribe voice message',
		description: 'Convert this voice note into editable text.',
		loadingFile: 'Loading voice message…',
		fileError: 'Could not load this voice message.',
		voiceFile: 'Voice message',
		method: 'Transcription method',
		transcribe: 'Transcribe',
		uploading: 'Uploading',
		processing: 'Transcribing audio…',
		failed: 'Transcription failed.',
		groqTooLarge: 'Groq free tier accepts files up to 25 MB.',
		result: 'Transcript',
		copy: 'Copy',
		copied: 'Transcript copied',
		save: 'Save changes',
		saved: 'Changes saved',
	},
	ar: {
		title: 'تحويل الرسالة الصوتية إلى نص',
		description: 'حوّل الرسالة الصوتية إلى نص يمكن تعديله.',
		loadingFile: 'جارٍ تحميل الرسالة الصوتية…',
		fileError: 'تعذر تحميل الرسالة الصوتية.',
		voiceFile: 'رسالة صوتية',
		method: 'طريقة التحويل',
		transcribe: 'تحويل إلى نص',
		uploading: 'جارٍ الرفع',
		processing: 'جارٍ تحويل الصوت إلى نص…',
		failed: 'فشل تحويل الرسالة الصوتية.',
		groqTooLarge: 'خطة Groq المجانية تقبل ملفات حتى 25 ميجابايت.',
		result: 'النص',
		copy: 'نسخ',
		copied: 'تم نسخ النص',
		save: 'حفظ التعديلات',
		saved: 'تم حفظ التعديلات',
	},
};

function formatFileSize(bytes) {
	const size = Number(bytes);
	if (!Number.isFinite(size) || size <= 0) return '';
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
	return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function displayFileName(fileName, fallback) {
	const name = String(fileName || '');
	if (!name || /^whatsapp-voice-/i.test(name)) return fallback;
	return name;
}

export default function TranscriptionDialog({
	open,
	onOpenChange,
	loadFile,
	onCompleted,
}) {
	const locale = useLocale();
	const t = labels[locale] || labels.en;
	const [file, setFile] = useState(null);
	const [fileError, setFileError] = useState('');
	const [provider, setProvider] = useState('local');
	const [status, setStatus] = useState('idle');
	const [progress, setProgress] = useState(0);
	const [elapsed, setElapsed] = useState(0);
	const [result, setResult] = useState(null);
	const [text, setText] = useState('');
	const [saving, setSaving] = useState(false);
	const busy = ['loading', 'uploading', 'processing'].includes(status);

	useEffect(() => {
		if (!open) return undefined;
		let cancelled = false;
		setProvider(getStoredTranscriptionProvider());
		setFile(null);
		setFileError('');
		setResult(null);
		setText('');
		setProgress(0);
		setElapsed(0);
		setStatus('loading');
		Promise.resolve(loadFile())
			.then(nextFile => {
				if (cancelled) return;
				setFile(nextFile);
				setStatus('idle');
			})
			.catch(error => {
				if (cancelled) return;
				setFileError(error?.response?.data?.message || t.fileError);
				setStatus('error');
			});
		return () => {
			cancelled = true;
		};
	}, [loadFile, open, t.fileError]);

	useEffect(() => {
		if (status !== 'processing') return undefined;
		const startedAt = Date.now();
		const timer = window.setInterval(
			() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
			1000,
		);
		return () => window.clearInterval(timer);
	}, [status]);

	const audioUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
	useEffect(() => () => {
		if (audioUrl) URL.revokeObjectURL(audioUrl);
	}, [audioUrl]);

	const selectProvider = value => {
		if (!TRANSCRIPTION_PROVIDERS.some(item => item.id === value)) return;
		setProvider(value);
		storeTranscriptionProvider(value);
	};

	const transcribe = async () => {
		if (!file || busy) return;
		if (provider === 'groq' && file.size > GROQ_FREE_MAX_FILE_SIZE) {
			toast.error(t.groqTooLarge);
			return;
		}
		setStatus('uploading');
		setProgress(0);
		setElapsed(0);
		try {
			const data = await createTranscription({
				file,
				provider,
				language: 'auto',
				customVocabulary: '',
				onUploadProgress: event => {
					if (!event.total) return;
					const next = Math.min(100, Math.round((event.loaded * 100) / event.total));
					setProgress(next);
					if (next >= 100) setStatus('processing');
				},
			});
			const nextText = String(data?.text || '').trim();
			setResult(data);
			setText(nextText);
			setStatus('done');
			onCompleted?.(nextText, data);
		} catch (error) {
			setStatus('error');
			toast.error(error.response?.data?.message || t.failed);
		}
	};

	const save = async () => {
		if (!result?.id || saving) return;
		setSaving(true);
		try {
			const { data } = await api.patch(`/transcriptions/${result.id}`, { text });
			setResult(data);
			setText(data.text || '');
			onCompleted?.(data.text || '', data);
			toast.success(t.saved);
		} catch (error) {
			toast.error(error.response?.data?.message || t.failed);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen && busy) return;
				onOpenChange(nextOpen);
			}}
		>
			<DialogContent
				dir={locale === 'ar' ? 'rtl' : 'ltr'}
				className="gap-3 overflow-y-auto rounded-2xl p-4 sm:max-w-md"
				onEscapeKeyDown={event => {
					if (busy) event.preventDefault();
				}}
				onPointerDownOutside={event => {
					if (busy) event.preventDefault();
				}}
			>
				<DialogHeader className="pe-10 text-start">
					<DialogTitle className="flex items-center gap-2 text-[17px] font-semibold text-slate-900">
						<span className="grid size-8 place-items-center rounded-full bg-[#d9fdd3] text-[#128c7e]">
							<AudioLines className="size-4" />
						</span>
						{t.title}
					</DialogTitle>
					<DialogDescription className="text-[13px] leading-5 text-slate-500">
						{t.description}
					</DialogDescription>
				</DialogHeader>

				{status === 'loading' ? (
					<div className="grid min-h-24 place-items-center text-sm text-slate-500">
						<span className="flex items-center gap-2">
							<Loader2 className="size-4 animate-spin" />
							{t.loadingFile}
						</span>
					</div>
				) : fileError ? (
					<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
						{fileError}
					</div>
				) : file ? (
					<>
						<div className="overflow-hidden rounded-xl border border-black/6 bg-[#f7f8fa] p-2.5">
							<div className="mb-2 flex items-center gap-2 px-0.5">
								<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#128c7e] shadow-sm">
									<FileAudio className="size-4" />
								</span>
								<span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">
									{displayFileName(file.name, t.voiceFile)}
								</span>
								<span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
									{formatFileSize(file.size)}
								</span>
							</div>
							{audioUrl ? (
								<audio controls src={audioUrl} className="h-9 w-full" />
							) : null}
						</div>

						<label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
							{t.method}
							<select
								value={provider}
								onChange={event => selectProvider(event.target.value)}
								disabled={busy}
								className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[var(--color-primary-400)]"
							>
								{TRANSCRIPTION_PROVIDERS.map(item => (
									<option key={item.id} value={item.id}>
										{item.name} · {item.score}%
									</option>
								))}
							</select>
						</label>

						{['uploading', 'processing'].includes(status) && (
							<div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
								<div className="flex items-center justify-between text-[13px] font-semibold text-slate-700">
									<span className="flex items-center gap-2">
										<Loader2 className="size-4 animate-spin text-[var(--color-primary-600)]" />
										{status === 'uploading' ? t.uploading : t.processing}
									</span>
									<span className="tabular-nums text-slate-500">
										{status === 'uploading' ? `${progress}%` : `${elapsed}s`}
									</span>
								</div>
								<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
									<div
										className={`h-full rounded-full bg-[var(--color-primary-600)] ${status === 'processing' ? 'w-full animate-pulse' : ''}`}
										style={status === 'uploading' ? { width: `${progress}%` } : undefined}
									/>
								</div>
							</div>
						)}

						<Button onClick={transcribe} disabled={busy} className="h-10 w-full rounded-xl">
							{busy ? <Loader2 className="animate-spin" /> : <AudioLines />}
							{t.transcribe}
						</Button>

						{result && (
							<div className="rounded-xl border border-slate-200 bg-white p-2.5">
								<div className="mb-2 flex items-center justify-between gap-2">
									<h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
										<Check className="size-4 text-emerald-600" />
										{t.result}
									</h3>
									<Button
										size="sm"
										variant="outline"
										onClick={async () => {
											await navigator.clipboard.writeText(text);
											toast.success(t.copied);
										}}
									>
										<Clipboard />
										{t.copy}
									</Button>
								</div>
								<textarea
									dir="auto"
									value={text}
									onChange={event => setText(event.target.value)}
									className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-[#f7f8fa] p-3 text-[13px] leading-6 outline-none focus:border-[var(--color-primary-400)]"
								/>
								<div className="mt-2 flex justify-end">
									<Button size="sm" onClick={save} disabled={saving || text === result.text}>
										{saving ? <Loader2 className="animate-spin" /> : <Save />}
										{t.save}
									</Button>
								</div>
							</div>
						)}
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
