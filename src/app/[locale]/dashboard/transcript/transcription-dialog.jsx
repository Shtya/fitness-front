'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
	AudioLines,
	Check,
	Clipboard,
	FileAudio,
	Loader2,
	ListChecks,
	MessageSquareText,
	Save,
	Wand2,
} from 'lucide-react';
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
import { WaCustomSelect } from '../whatsapp/WaCustomSelect';
import TranscriptionAiPanel from './transcription-ai-panel';
import TranscriptVoicePlayer from './transcript-voice-player';
import {
	buildTimelineTranscript,
	createTextTranscription,
	createTranscription,
	formatTimestampWithMs,
	getStoredTranscriptionProvider,
	GROQ_FREE_MAX_FILE_SIZE,
	storeTranscriptionProvider,
	timestampMs,
	TRANSCRIPTION_PROVIDERS,
} from './transcription-client';

const labels = {
	en: {
		title: 'Transcribe voice message',
		bundleTitle: 'Transcribe selected messages',
		description: 'Convert this voice note into editable text.',
		bundleDescription:
			'Voices are converted to text. Selected tickets stay as they are. Everything is merged in time order.',
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
		enhance: 'Enhance with AI',
		enhancing: 'Enhancing…',
		summarize: 'Summarize',
		summarizing: 'Summarizing…',
		audioLabel: 'Audio {n}',
		messageLabel: 'Message',
		missingVoice: '(Could not transcribe this voice note.)',
		selectedCount: '{count} selected',
		voiceCount: '{count} voices',
		ticketCount: '{count} messages',
		batchProgress: 'Audio {current} of {total}',
		batchDone: 'Transcribed {count} voices',
		batchPartial: 'Transcribed {done} of {total} voices. Some failed.',
		noItems: 'Select at least one voice or message.',
	},
	ar: {
		title: 'تحويل الرسالة الصوتية إلى نص',
		bundleTitle: 'تحويل الرسائل المحددة إلى نص',
		description: 'حوّل الرسالة الصوتية إلى نص يمكن تعديله.',
		bundleDescription:
			'الأصوات تتحول لنص. التيكتات المحددة تفضل زي ما هي. كله يترتب حسب الوقت.',
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
		enhance: 'تحسين بالذكاء الاصطناعي',
		enhancing: 'جاري التحسين…',
		summarize: 'تلخيص',
		summarizing: 'جارٍ التلخيص…',
		audioLabel: 'صوت {n}',
		messageLabel: 'رسالة',
		missingVoice: '(تعذر تحويل هذه الرسالة الصوتية.)',
		selectedCount: '{count} محدد',
		voiceCount: '{count} صوت',
		ticketCount: '{count} رسالة',
		batchProgress: 'صوت {current} من {total}',
		batchDone: 'تم تحويل {count} صوت',
		batchPartial: 'تم تحويل {done} من {total}. بعضها فشل.',
		noItems: 'حدّد صوتًا أو رسالة واحدة على الأقل.',
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

function sortSources(sources) {
	return [...sources].sort((a, b) => {
		const delta = timestampMs(a.timestamp) - timestampMs(b.timestamp);
		if (delta !== 0) return delta;
		return String(a.id || '').localeCompare(String(b.id || ''));
	});
}

function withAudioIndexes(sources) {
	let audioIndex = 0;
	return sortSources(sources).map(item => {
		if (item.kind !== 'voice') return item;
		audioIndex += 1;
		return { ...item, audioIndex };
	});
}

export default function TranscriptionDialog({
	open,
	onOpenChange,
	loadFile,
	loadVoiceFile,
	items,
	onCompleted,
}) {
	const locale = useLocale();
	const t = labels[locale] || labels.en;
	const sources = useMemo(
		() => {
			const provided = Array.isArray(items) ? items.filter(Boolean) : [];
			return withAudioIndexes(
				provided.length
					? provided
					: loadFile
						? [{ id: 'single', kind: 'voice', audioIndex: 1, loadFile, timestamp: Date.now() }]
						: [],
			);
		},
		[items, loadFile],
	);
	const isBundle = sources.length > 1 || sources.some(item => item.kind === 'text');
	const voiceSources = sources.filter(item => item.kind === 'voice');
	const ticketCount = sources.filter(item => item.kind === 'text').length;
	const [file, setFile] = useState(null);
	const [fileError, setFileError] = useState('');
	const [provider, setProvider] = useState('local');
	const [status, setStatus] = useState('idle');
	const [progress, setProgress] = useState(0);
	const [elapsed, setElapsed] = useState(0);
	const [batchIndex, setBatchIndex] = useState(0);
	const [result, setResult] = useState(null);
	const [text, setText] = useState('');
	const [saving, setSaving] = useState(false);
	const [aiBusy, setAiBusy] = useState({ enhancing: false, summarizing: false });
	const aiPanelRef = useRef(null);
	const onAiBusyChange = useCallback(next => {
		setAiBusy({
			enhancing: Boolean(next?.enhancing),
			summarizing: Boolean(next?.summarizing),
		});
	}, []);
	const busy = ['loading', 'uploading', 'processing'].includes(status);
	const singleVoice = !isBundle && sources[0]?.kind === 'voice';

	const sourceKey = useMemo(
		() => sources.map(item => `${item.kind}:${item.id}`).join('|'),
		[sources],
	);

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
		setBatchIndex(0);
		if (!sources.length) {
			setStatus('idle');
			return undefined;
		}
		if (!singleVoice) {
			setStatus('idle');
			return undefined;
		}
		setStatus('loading');
		const source = sources[0];
		const loader = source.loadFile || loadFile || (loadVoiceFile ? () => loadVoiceFile(source) : null);
		if (!loader) {
			setFileError(t.fileError);
			setStatus('error');
			return undefined;
		}
		Promise.resolve(loader())
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
	}, [loadFile, loadVoiceFile, open, singleVoice, sourceKey, t.fileError]);

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

	const resolveVoiceLoader = source => {
		if (typeof source?.loadFile === 'function') return source.loadFile;
		if (typeof loadFile === 'function' && sources.length === 1) return loadFile;
		if (typeof loadVoiceFile === 'function') return () => loadVoiceFile(source);
		return null;
	};

	const persistCombined = async ({ created, combinedText, fallbackName }) => {
		if (created?.id) {
			try {
				const { data } = await api.patch(`/transcriptions/${created.id}`, { text: combinedText });
				return data;
			} catch {
				return { ...created, text: combinedText };
			}
		}
		return createTextTranscription({
			text: combinedText,
			originalFileName: fallbackName,
			language: 'auto',
		});
	};

	const transcribe = async () => {
		if (busy) return;
		if (!sources.length) {
			toast.error(t.noItems);
			return;
		}

		if (singleVoice) {
			if (!file) return;
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
			return;
		}

		setStatus('uploading');
		setProgress(0);
		setElapsed(0);
		const createdRecords = [];
		let failedVoices = 0;
		const timeline = [];

		for (const source of sources) {
			if (source.kind === 'text') {
				timeline.push({
					kind: 'text',
					timestamp: source.timestamp,
					text: source.text,
				});
				continue;
			}

			setBatchIndex(source.audioIndex || createdRecords.length + 1);
			setStatus('uploading');
			setProgress(0);
			const loader = resolveVoiceLoader(source);
			try {
				if (!loader) throw new Error(t.fileError);
				const nextFile = await loader();
				if (provider === 'groq' && nextFile.size > GROQ_FREE_MAX_FILE_SIZE) {
					throw new Error(t.groqTooLarge);
				}
				const data = await createTranscription({
					file: nextFile,
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
				createdRecords.push(data);
				timeline.push({
					kind: 'voice',
					timestamp: source.timestamp,
					audioIndex: source.audioIndex,
					text: String(data?.text || '').trim(),
				});
			} catch (error) {
				failedVoices += 1;
				timeline.push({
					kind: 'voice',
					timestamp: source.timestamp,
					audioIndex: source.audioIndex,
					text: t.missingVoice,
				});
				toast.error(error?.response?.data?.message || error?.message || t.failed);
			}
		}

		const combinedText = buildTimelineTranscript(timeline, {
			audioLabel: t.audioLabel,
			messageLabel: t.messageLabel,
			missingVoice: t.missingVoice,
		});
		if (!combinedText.trim() && !ticketCount) {
			setStatus('error');
			toast.error(t.failed);
			return;
		}

		try {
			const extras = createdRecords.slice(1);
			const merged = await persistCombined({
				created: createdRecords[0],
				combinedText,
				fallbackName: `whatsapp-selection-${sources.length}.txt`,
			});
			if (extras.length) {
				await Promise.allSettled(extras.map(item => api.delete(`/transcriptions/${item.id}`)));
			}
			setResult(merged);
			setText(combinedText);
			setStatus('done');
			onCompleted?.(combinedText, merged);
			if (voiceSources.length && failedVoices === 0) {
				toast.success(t.batchDone.replace('{count}', String(voiceSources.length)));
			} else if (voiceSources.length && failedVoices > 0 && createdRecords.length > 0) {
				toast.error(
					t.batchPartial
						.replace('{done}', String(createdRecords.length))
						.replace('{total}', String(voiceSources.length)),
				);
			}
		} catch (error) {
			setStatus('error');
			toast.error(error?.response?.data?.message || t.failed);
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

	const providerOptions = TRANSCRIPTION_PROVIDERS.map(item => ({
		value: item.id,
		label: `${item.name} · ${item.score}%`,
	}));

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
				className={`!flex max-h-[min(92dvh,calc(100dvh-1.25rem))] min-h-0 w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 ${
					isBundle ? 'sm:max-w-xl' : 'sm:max-w-lg'
				}`}
				onEscapeKeyDown={event => {
					if (busy) event.preventDefault();
				}}
				onPointerDownOutside={event => {
					const target = event.target;
					if (
						busy ||
						(target instanceof Element && target.closest('[role="listbox"]'))
					) {
						event.preventDefault();
					}
				}}
				onFocusOutside={event => {
					const target = event.target;
					if (
						busy ||
						(target instanceof Element && target.closest('[role="listbox"]'))
					) {
						event.preventDefault();
					}
				}}
			>
				<DialogHeader className="shrink-0 px-4 pb-2 pe-14 pt-4 text-start">
					<DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
						<span className="grid size-8 place-items-center rounded-full bg-[#d9fdd3] text-[#128c7e]">
							<AudioLines className="size-4" />
						</span>
						{isBundle ? t.bundleTitle : t.title}
					</DialogTitle>
					<DialogDescription className="text-[12px] leading-5 text-slate-500">
						{isBundle ? t.bundleDescription : t.description}
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-3">
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
				) : sources.length ? (
					<>
						{singleVoice && file ? (
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
								{audioUrl ? <TranscriptVoicePlayer src={audioUrl} seed={file.name} /> : null}
							</div>
						) : null}

						{isBundle ? (
							<div className="max-h-44 overflow-y-auto rounded-xl border border-black/6 bg-[#f7f8fa] p-2">
								<p className="mb-1.5 px-1 text-[11px] font-semibold text-slate-500">
									{t.selectedCount.replace('{count}', String(sources.length))}
									{voiceSources.length
										? ` · ${t.voiceCount.replace('{count}', String(voiceSources.length))}`
										: ''}
									{ticketCount
										? ` · ${t.ticketCount.replace('{count}', String(ticketCount))}`
										: ''}
								</p>
								<div className="space-y-1">
									{sources.map(item => (
										<div
											key={`${item.kind}-${item.id}`}
											className="flex items-start gap-2 rounded-lg bg-white px-2 py-1.5"
										>
											<span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-[#d9fdd3] text-[#128c7e]">
												{item.kind === 'voice' ? (
													<FileAudio className="size-3.5" />
												) : (
													<MessageSquareText className="size-3.5" />
												)}
											</span>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[12px] font-semibold text-slate-800">
													{item.kind === 'voice'
														? t.audioLabel.replace('{n}', String(item.audioIndex || 1))
														: t.messageLabel}
												</p>
												<p className="truncate text-[11px] text-slate-500">
													{formatTimestampWithMs(item.timestamp) || '—'}
													{item.kind === 'text' && item.text ? ` · ${item.text}` : ''}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						) : null}

						<label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
							{t.method}
							<WaCustomSelect
								value={provider}
								onChange={selectProvider}
								disabled={busy}
								ariaLabel={t.method}
								options={providerOptions}
							/>
						</label>

						{['uploading', 'processing'].includes(status) && (
							<div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
								<div className="flex items-center justify-between text-[13px] font-semibold text-slate-700">
									<span className="flex items-center gap-2">
										<Loader2 className="size-4 animate-spin text-[var(--color-primary-600)]" />
										{isBundle && voiceSources.length
											? t.batchProgress
												.replace('{current}', String(batchIndex || 1))
												.replace('{total}', String(voiceSources.length))
											: status === 'uploading'
												? t.uploading
												: t.processing}
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
									className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-[#f7f8fa] p-2.5 text-[12px] leading-5 outline-none focus:border-[var(--color-primary-400)]"
								/>
								<TranscriptionAiPanel
									ref={aiPanelRef}
									key={result.id}
									variant="compact"
									locale={locale}
									transcriptionId={result.id}
									transcriptText={text}
									onApplyText={nextText => setText(nextText)}
									onBusyChange={onAiBusyChange}
									onResultUpdated={updated => {
										if (!updated) return;
										setResult(updated);
										if (typeof updated.text === 'string') setText(updated.text);
									}}
									initialCompare={
										result.originalText && result.enhancedText
											? {
													originalText: result.originalText,
													enhancedText: result.enhancedText,
													changesSummary: result.enhancementMeta?.changesSummary || [],
												}
											: null
									}
									initialSummary={result.summaryPayload || null}
								/>
							</div>
						)}
					</>
				) : null}
				</div>

				{result ? (
					<div className="shrink-0 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] backdrop-blur">
						<div className="grid grid-cols-3 gap-2">
							<Button
								onClick={save}
								disabled={saving || text === result.text}
								className="h-12 min-w-0 rounded-xl px-2 text-[11px] font-semibold sm:text-[13px]"
							>
								{saving ? <Loader2 className="animate-spin" /> : <Save />}
								<span className="truncate">{t.save}</span>
							</Button>
							<Button
								onClick={() => aiPanelRef.current?.enhance?.()}
								disabled={aiBusy.enhancing || !result.id || !text.trim()}
								className="h-12 min-w-0 rounded-xl px-2 text-[11px] font-semibold sm:text-[13px]"
							>
								{aiBusy.enhancing ? <Loader2 className="animate-spin" /> : <Wand2 />}
								<span className="truncate">{aiBusy.enhancing ? t.enhancing : t.enhance}</span>
							</Button>
							<Button
								variant="outline"
								onClick={() => aiPanelRef.current?.summarize?.()}
								disabled={aiBusy.summarizing || !result.id || !text.trim()}
								className="h-12 min-w-0 rounded-xl px-2 text-[11px] font-semibold sm:text-[13px]"
							>
								{aiBusy.summarizing ? <Loader2 className="animate-spin" /> : <ListChecks />}
								<span className="truncate">{aiBusy.summarizing ? t.summarizing : t.summarize}</span>
							</Button>
						</div>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
