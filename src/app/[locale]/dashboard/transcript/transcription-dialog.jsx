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
		description: 'Use the Transcript tool settings to convert this WhatsApp voice message into editable text.',
		loadingFile: 'Loading voice message…',
		fileError: 'Could not load this voice message.',
		method: 'Transcription method',
		language: 'Language',
		auto: 'Auto detect',
		arabic: 'Arabic',
		english: 'English',
		vocabulary: 'Custom vocabulary',
		vocabularyHint: 'Names or specialist terms, separated by commas',
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
		description: 'استخدم إعدادات أداة تحويل الصوت لتحويل رسالة واتساب إلى نص قابل للتعديل.',
		loadingFile: 'جارٍ تحميل الرسالة الصوتية…',
		fileError: 'تعذر تحميل الرسالة الصوتية.',
		method: 'طريقة التحويل',
		language: 'اللغة',
		auto: 'اكتشاف تلقائي',
		arabic: 'العربية',
		english: 'الإنجليزية',
		vocabulary: 'مصطلحات مخصصة',
		vocabularyHint: 'أسماء أو مصطلحات متخصصة مفصولة بفواصل',
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
	const [language, setLanguage] = useState('auto');
	const [customVocabulary, setCustomVocabulary] = useState('');
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
		setLanguage('auto');
		setCustomVocabulary('');
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
				language,
				customVocabulary,
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
				className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"
				onEscapeKeyDown={event => {
					if (busy) event.preventDefault();
				}}
				onPointerDownOutside={event => {
					if (busy) event.preventDefault();
				}}
			>
				<DialogHeader className="pe-12">
					<DialogTitle className="flex items-center gap-2 text-xl">
						<AudioLines className="size-5 text-[var(--color-primary-600)]" />
						{t.title}
					</DialogTitle>
					<DialogDescription>{t.description}</DialogDescription>
				</DialogHeader>

				{status === 'loading' ? (
					<div className="grid min-h-32 place-items-center text-sm text-slate-500">
						<span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{t.loadingFile}</span>
					</div>
				) : fileError ? (
					<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{fileError}</div>
				) : file ? (
					<>
						<div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
							<div className="flex items-center gap-2">
								<FileAudio className="size-5 shrink-0 text-emerald-600" />
								<span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{file.name}</span>
								<span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
							</div>
							{audioUrl && <audio controls src={audioUrl} className="mt-3 h-10 w-full" />}
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<label className="grid gap-1.5 text-sm font-bold text-slate-700">
								{t.method}
								<select
									value={provider}
									onChange={event => selectProvider(event.target.value)}
									disabled={busy}
									className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:border-[var(--color-primary-400)]"
								>
									{TRANSCRIPTION_PROVIDERS.map(item => (
										<option key={item.id} value={item.id}>{item.name} · {item.score}%</option>
									))}
								</select>
							</label>
							<label className="grid gap-1.5 text-sm font-bold text-slate-700">
								{t.language}
								<select
									value={language}
									onChange={event => setLanguage(event.target.value)}
									disabled={busy}
									className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:border-[var(--color-primary-400)]"
								>
									<option value="auto">{t.auto}</option>
									<option value="ar">{t.arabic}</option>
									<option value="en">{t.english}</option>
								</select>
							</label>
						</div>

						<label className="grid gap-1.5 text-sm font-bold text-slate-700">
							{t.vocabulary}
							<textarea
								value={customVocabulary}
								onChange={event => setCustomVocabulary(event.target.value)}
								disabled={busy}
								maxLength={4000}
								rows={2}
								placeholder={t.vocabularyHint}
								className="resize-y rounded-xl border bg-white p-3 text-sm font-normal outline-none focus:border-[var(--color-primary-400)]"
							/>
						</label>

						{['uploading', 'processing'].includes(status) && (
							<div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
								<div className="flex items-center justify-between text-sm font-bold text-blue-800">
									<span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{status === 'uploading' ? t.uploading : t.processing}</span>
									<span>{status === 'uploading' ? `${progress}%` : `${elapsed}s`}</span>
								</div>
								<div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
									<div className={`h-full rounded-full bg-[var(--color-primary-600)] ${status === 'processing' ? 'w-full animate-pulse' : ''}`} style={status === 'uploading' ? { width: `${progress}%` } : undefined} />
								</div>
							</div>
						)}

						<Button onClick={transcribe} disabled={busy} className="w-full">
							{busy ? <Loader2 className="animate-spin" /> : <AudioLines />}
							{t.transcribe}
						</Button>

						{result && (
							<div className="rounded-xl border bg-slate-50 p-3">
								<div className="mb-2 flex items-center justify-between gap-2">
									<h3 className="flex items-center gap-2 font-black text-slate-800"><Check className="size-4 text-emerald-600" />{t.result}</h3>
									<Button
										size="sm"
										variant="outline"
										onClick={async () => {
											await navigator.clipboard.writeText(text);
											toast.success(t.copied);
										}}
									>
										<Clipboard />{t.copy}
									</Button>
								</div>
								<textarea
									dir="auto"
									value={text}
									onChange={event => setText(event.target.value)}
									className="min-h-40 w-full resize-y rounded-xl border bg-white p-3 text-sm leading-7 outline-none focus:border-[var(--color-primary-400)]"
								/>
								<div className="mt-2 flex justify-end">
									<Button size="sm" onClick={save} disabled={saving || text === result.text}>
										{saving ? <Loader2 className="animate-spin" /> : <Save />}{t.save}
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
