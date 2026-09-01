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
	Video,
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
	audioDisplayName,
	createTextTranscription,
	createChunkedTranscription,
	formatTimestampWithMs,
	getStoredTranscriptionChunkSeconds,
	getStoredTranscriptionProvider,
	isMediaTranscriptKind,
	storeTranscriptionChunkSeconds,
	storeTranscriptionProvider,
	timestampMs,
	TRANSCRIPTION_CHUNK_PRESETS,
	TRANSCRIPTION_PROVIDERS,
	transcriptionErrorMessage,
} from './transcription-client';

/** Prepare audio → 0–15%. Chunk uploads/process → 15–96%. */
function prepareBarPercent(percent) {
	const p = Math.min(100, Math.max(0, Number(percent) || 0));
	return Math.round(p * 0.15);
}

function chunkBarPercent(chunkIndex, chunkTotal, localPercent = 0) {
	const total = Math.max(1, Number(chunkTotal) || 1);
	const index = Math.min(total, Math.max(1, Number(chunkIndex) || 1));
	const local = Math.min(100, Math.max(0, Number(localPercent) || 0));
	const prepareEnd = 15;
	const span = 81; // 15 → 96
	const chunkSpan = span / total;
	const start = prepareEnd + (index - 1) * chunkSpan;
	return Math.min(96, Math.round(start + (local / 100) * chunkSpan));
}

const labels = {
	en: {
		title: 'Transcribe voice or video',
		bundleTitle: 'Transcribe selected messages',
		description: 'Convert speech in this voice note or video into editable text.',
		bundleDescription:
			'Voice notes and videos are converted to text. Selected tickets stay as they are. Everything is merged in time order.',
		loadingFile: 'Loading media…',
		fileError: 'Could not load this media.',
		voiceFile: 'Voice or video',
		method: 'Transcription method',
		chunkLength: 'Chunk length',
		chunkLengthHint:
			'Videos are always converted to sound first, then split into small audio chunks before upload.',
		chunkProgress: 'Chunk {current} of {total}',
		transcribe: 'Transcribe',
		uploading: 'Uploading',
		preparing: 'Converting media to audio…',
		processing: 'Transcribing… this can take a few minutes for long media.',
		failed: 'Transcription failed.',
		timedOut: 'Transcription timed out. Keep the page open and try again.',
		groqTooLarge: 'Groq free tier accepts files up to 25 MB.',
		networkBlocked:
			'Upload blocked by the server proxy. Hard-refresh: video is converted to ~25s audio pieces first. If it still fails, raise nginx client_max_body_size to at least 10m.',
		result: 'Transcript',
		copy: 'Copy',
		copied: 'Transcript copied',
		save: 'Save changes',
		saved: 'Changes saved',
		enhance: 'Enhance with AI',
		enhancing: 'Enhancing…',
		summarize: 'Summarize',
		summarizing: 'Summarizing…',
		originalTranscript: 'Original transcript',
		correctedTranscript: 'Corrected transcript',
		showOriginal: 'Show original',
		hideOriginal: 'Hide original',
		audioLabel: 'Audio {n}',
		messageLabel: 'Message',
		missingVoice: '(Could not transcribe this voice note.)',
		selectedCount: '{count} selected',
		voiceCount: '{count} media files',
		ticketCount: '{count} messages',
		batchProgress: 'Media {current} of {total}',
		batchDone: 'Transcribed {count} files',
		batchPartial: 'Transcribed {done} of {total} files. Some failed.',
		noItems: 'Select at least one voice, video, or message.',
		copyTitle: 'Preparing messages to copy',
		copyDescription:
			'Transcribing voice notes that do not have a transcript yet. Everything will be copied in order when done.',
	},
	ar: {
		title: 'تحويل الصوت أو الفيديو إلى نص',
		bundleTitle: 'تحويل الرسائل المحددة إلى نص',
		description: 'حوّل الكلام في الرسالة الصوتية أو الفيديو إلى نص يمكن تعديله.',
		bundleDescription:
			'الصوت والفيديو يتحولان لنص. التيكتات المحددة تفضل زي ما هي. كله يترتب حسب الوقت.',
		loadingFile: 'جارٍ تحميل الملف…',
		fileError: 'تعذر تحميل هذا الملف.',
		voiceFile: 'صوت أو فيديو',
		method: 'طريقة التحويل',
		chunkLength: 'طول القطعة',
		chunkLengthHint:
			'الفيديو يتحول لصوت أولاً ثم يتقسم لقطع صوت صغيرة قبل الرفع.',
		chunkProgress: 'قطعة {current} من {total}',
		transcribe: 'تحويل إلى نص',
		uploading: 'جارٍ الرفع',
		preparing: 'جارٍ تحويل الملف إلى صوت…',
		processing: 'جارٍ التحويل إلى نص… قد يستغرق دقائق للملفات الطويلة.',
		failed: 'فشل تحويل الرسالة الصوتية.',
		timedOut: 'انتهت مهلة التحويل. اترك الصفحة مفتوحة وحاول مرة أخرى.',
		groqTooLarge: 'خطة Groq المجانية تقبل ملفات حتى 25 ميجابايت.',
		networkBlocked:
			'الرفع اترفض من البروكسي. حدّث الصفحة بقوة: الفيديو بيتحول لقطع صوت ~25 ثانية. لو استمر، زوّد nginx client_max_body_size إلى 10m على الأقل.',
		result: 'النص',
		copy: 'نسخ',
		copied: 'تم نسخ النص',
		save: 'حفظ التعديلات',
		saved: 'تم حفظ التعديلات',
		enhance: 'تحسين بالذكاء الاصطناعي',
		enhancing: 'جاري التحسين…',
		summarize: 'تلخيص',
		summarizing: 'جارٍ التلخيص…',
		originalTranscript: 'النص الأصلي',
		correctedTranscript: 'النص بعد التصحيح',
		showOriginal: 'إظهار الأصلي',
		hideOriginal: 'إخفاء الأصلي',
		audioLabel: 'صوت {n}',
		messageLabel: 'رسالة',
		missingVoice: '(تعذر تحويل هذه الرسالة الصوتية.)',
		selectedCount: '{count} محدد',
		voiceCount: '{count} ملف',
		ticketCount: '{count} رسالة',
		batchProgress: 'ملف {current} من {total}',
		batchDone: 'تم تحويل {count} ملف',
		batchPartial: 'تم تحويل {done} من {total}. بعضها فشل.',
		noItems: 'حدّد صوتًا أو فيديو أو رسالة واحدة على الأقل.',
		copyTitle: 'جارٍ تجهيز الرسائل للنسخ',
		copyDescription:
			'يتم تحويل الرسائل الصوتية التي لا تحتوي على نص. سيتم نسخ كل الرسائل بالترتيب عند الانتهاء.',
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
	return audioDisplayName({ fileName }, 0, fallback || 'Audio {n}');
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
		if (!isMediaTranscriptKind(item.kind)) return item;
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
	autoStart = false,
	intent = 'default',
}) {
	const locale = useLocale();
	const t = labels[locale] || labels.en;
	const isCopyIntent = intent === 'copy';
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
	const voiceSources = sources.filter(item => isMediaTranscriptKind(item.kind));
	const ticketCount = sources.filter(item => item.kind === 'text').length;
	const [file, setFile] = useState(null);
	const [fileError, setFileError] = useState('');
	const [provider, setProvider] = useState('local');
	const [chunkSeconds, setChunkSeconds] = useState(() => getStoredTranscriptionChunkSeconds());
	const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
	const [status, setStatus] = useState('idle');
	const [progress, setProgress] = useState(0);
	const [elapsed, setElapsed] = useState(0);
	const [batchIndex, setBatchIndex] = useState(0);
	const [result, setResult] = useState(null);
	const [text, setText] = useState('');
	const [originalTranscript, setOriginalTranscript] = useState('');
	const [originalExpanded, setOriginalExpanded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [aiBusy, setAiBusy] = useState({ enhancing: false, summarizing: false });
	const aiPanelRef = useRef(null);
	const autoStartKeyRef = useRef('');
	const onAiBusyChange = useCallback(next => {
		setAiBusy({
			enhancing: Boolean(next?.enhancing),
			summarizing: Boolean(next?.summarizing),
		});
	}, []);
	const busy = ['loading', 'preparing', 'uploading', 'processing'].includes(status);
	const singleVoice = !isBundle && isMediaTranscriptKind(sources[0]?.kind);

	const sourceKey = useMemo(
		() => sources.map(item => `${item.kind}:${item.id}`).join('|'),
		[sources],
	);

	useEffect(() => {
		if (!open) {
			autoStartKeyRef.current = '';
			return undefined;
		}
		let cancelled = false;
		setProvider(getStoredTranscriptionProvider());
		setChunkSeconds(getStoredTranscriptionChunkSeconds());
		setChunkProgress({ current: 0, total: 0 });
		setFile(null);
		setFileError('');
		setResult(null);
		setText('');
		setOriginalTranscript('');
		setOriginalExpanded(false);
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
		if (!open || !autoStart || !sources.length || busy) return;
		if (singleVoice && !file) return;
		if (autoStartKeyRef.current === sourceKey) return;
		autoStartKeyRef.current = sourceKey;
		void transcribe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, autoStart, sources.length, singleVoice, file, sourceKey, busy]);

	useEffect(() => {
		if (!result?.originalText || !result?.enhancedText) return;
		if (originalTranscript) return;
		setOriginalTranscript(String(result.originalText));
		setOriginalExpanded(false);
		if (typeof result.text === 'string' && result.text.trim()) {
			setText(result.text);
		} else {
			setText(String(result.enhancedText));
		}
	}, [result?.id, result?.originalText, result?.enhancedText, result?.text, originalTranscript]);

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

	const selectChunkSeconds = value => {
		const next = storeTranscriptionChunkSeconds(value);
		setChunkSeconds(next);
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
			setStatus('preparing');
			setProgress(0);
			setElapsed(0);
			setChunkProgress({ current: 0, total: 0 });
			try {
				const data = await createChunkedTranscription({
					file,
					provider,
					language: locale === 'ar' ? 'ar' : 'auto',
					customVocabulary: '',
					chunkSeconds,
					onPrepareProgress: ({ percent }) => {
						setStatus('preparing');
						setProgress(prepareBarPercent(percent));
					},
					onChunkProgress: ({ chunkIndex, chunkTotal }) => {
						setChunkProgress({ current: chunkIndex, total: chunkTotal });
						setStatus('uploading');
						setProgress(prev => Math.max(prev, chunkBarPercent(chunkIndex, chunkTotal, 0)));
					},
					onUploadProgress: event => {
						const chunkIndex = Number(event?.chunkIndex) || 1;
						const chunkTotal = Number(event?.chunkTotal) || 1;
						setStatus('uploading');
						if (event?.total === 100 && Number.isFinite(event.loaded)) {
							setProgress(Math.min(96, Math.max(15, Math.round(event.loaded))));
							return;
						}
						if (!event?.total) {
							setProgress(prev => Math.max(prev, chunkBarPercent(chunkIndex, chunkTotal, 70)));
							setStatus('processing');
							return;
						}
						const local = Math.min(100, Math.round((event.loaded * 100) / event.total));
						setProgress(chunkBarPercent(chunkIndex, chunkTotal, local));
					},
				});
				const nextText = String(data?.text || '').trim();
				setResult(data);
				setText(nextText);
				setOriginalTranscript('');
				setOriginalExpanded(false);
				setProgress(100);
				setStatus('done');
				onCompleted?.(nextText, data, {
					timeline: [
						{
							id: sources[0]?.id,
							kind: sources[0]?.kind || 'voice',
							timestamp: sources[0]?.timestamp,
							text: nextText,
						},
					],
				});
			} catch (error) {
				setStatus('error');
				const fallback =
					error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''))
						? t.timedOut
						: t.failed;
				toast.error(transcriptionErrorMessage(error, fallback));
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
					id: source.id,
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
				const voiceName =
					source.fileName ||
					nextFile?.name ||
					audioDisplayName(source, (source.audioIndex || 1) - 1, t.audioLabel);
				const data = await createChunkedTranscription({
					file: nextFile,
					provider,
					language: locale === 'ar' ? 'ar' : 'auto',
					customVocabulary: '',
					chunkSeconds,
					onPrepareProgress: ({ percent }) => {
						setStatus('preparing');
						setProgress(prepareBarPercent(percent));
					},
					onChunkProgress: ({ chunkIndex, chunkTotal }) => {
						setChunkProgress({ current: chunkIndex, total: chunkTotal });
						setStatus('uploading');
						setProgress(prev => Math.max(prev, chunkBarPercent(chunkIndex, chunkTotal, 0)));
					},
					onUploadProgress: event => {
						setStatus('uploading');
						if (event?.total === 100 && Number.isFinite(event.loaded)) {
							setProgress(Math.min(96, Math.max(15, Math.round(event.loaded))));
							return;
						}
						const chunkIndex = Number(event?.chunkIndex) || 1;
						const chunkTotal = Number(event?.chunkTotal) || 1;
						if (!event?.total) {
							setProgress(prev => Math.max(prev, chunkBarPercent(chunkIndex, chunkTotal, 70)));
							setStatus('processing');
							return;
						}
						const local = Math.min(100, Math.round((event.loaded * 100) / event.total));
						setProgress(chunkBarPercent(chunkIndex, chunkTotal, local));
					},
				});
				createdRecords.push(data);
				timeline.push({
					id: source.id,
					kind: 'voice',
					timestamp: source.timestamp,
					audioIndex: source.audioIndex,
					fileName: voiceName,
					originalFileName: data?.originalFileName || voiceName,
					name: voiceName,
					text: String(data?.text || '').trim(),
				});
			} catch (error) {
				failedVoices += 1;
				timeline.push({
					id: source.id,
					kind: 'voice',
					timestamp: source.timestamp,
					audioIndex: source.audioIndex,
					fileName: source.fileName || '',
					originalFileName: source.fileName || '',
					name: source.fileName || '',
					text: t.missingVoice,
				});
				toast.error(transcriptionErrorMessage(error, t.failed));
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
			setOriginalTranscript('');
			setOriginalExpanded(false);
			setStatus('done');
			onCompleted?.(combinedText, merged, { timeline });
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
			toast.error(transcriptionErrorMessage(error, t.failed));
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
			toast.error(transcriptionErrorMessage(error, t.failed));
		} finally {
			setSaving(false);
		}
	};

	const providerOptions = TRANSCRIPTION_PROVIDERS.map(item => ({
		value: item.id,
		label: `${item.name} · ${item.score}%`,
	}));
	const chunkOptions = TRANSCRIPTION_CHUNK_PRESETS.map(item => ({
		value: item.value,
		label: locale === 'ar' ? item.labelAr : item.labelEn,
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
						{isCopyIntent ? t.copyTitle : isBundle ? t.bundleTitle : t.title}
					</DialogTitle>
					<DialogDescription className="text-[12px] leading-5 text-slate-500">
						{isCopyIntent ? t.copyDescription : isBundle ? t.bundleDescription : t.description}
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
												{item.kind === 'video' ? (
													<Video className="size-3.5" />
												) : isMediaTranscriptKind(item.kind) ? (
													<FileAudio className="size-3.5" />
												) : (
													<MessageSquareText className="size-3.5" />
												)}
											</span>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[12px] font-semibold text-slate-800">
													{isMediaTranscriptKind(item.kind)
														? audioDisplayName(item, (item.audioIndex || 1) - 1, t.audioLabel)
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

						<div className={`wa-transcribe-controls grid grid-cols-[minmax(0,1fr)_minmax(6.75rem,8.25rem)_auto] items-end gap-2 ${isCopyIntent ? 'hidden' : ''}`}>
							<label className="grid min-w-0 gap-1 text-[11px] font-semibold text-slate-700">
								<span className="truncate">{t.method}</span>
								<WaCustomSelect
									value={provider}
									onChange={selectProvider}
									disabled={busy}
									ariaLabel={t.method}
									options={providerOptions}
									className="min-w-0"
								/>
							</label>

							<label className="grid min-w-0 gap-1 text-[11px] font-semibold text-slate-700">
								<span className="truncate">{t.chunkLength}</span>
								<WaCustomSelect
									value={chunkSeconds}
									onChange={selectChunkSeconds}
									disabled={busy}
									ariaLabel={t.chunkLength}
									options={chunkOptions}
									className="min-w-0"
								/>
							</label>

							<Button
								onClick={transcribe}
								disabled={busy || (singleVoice && !file)}
								className="h-10 shrink-0 rounded-xl px-3 sm:min-w-[7.25rem]"
							>
								{busy ? <Loader2 className="animate-spin" /> : <AudioLines />}
								<span className="truncate">{t.transcribe}</span>
							</Button>
						</div>

						{['preparing', 'uploading', 'processing'].includes(status) && (
							<div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
								<div className="flex items-center justify-between text-[13px] font-semibold text-slate-700">
									<span className="flex min-w-0 items-center gap-2">
										<Loader2 className="size-4 shrink-0 animate-spin text-[var(--color-primary-600)]" />
										<span className="truncate">
											{chunkProgress.total > 1
												? t.chunkProgress
													.replace('{current}', String(chunkProgress.current || 1))
													.replace('{total}', String(chunkProgress.total))
												: isBundle && voiceSources.length
													? t.batchProgress
														.replace('{current}', String(batchIndex || 1))
														.replace('{total}', String(voiceSources.length))
													: status === 'preparing'
														? t.preparing
														: status === 'uploading'
															? t.uploading
															: t.processing}
										</span>
									</span>
									<span className="shrink-0 tabular-nums text-slate-500">
										{status === 'processing' && progress >= 96
											? `${elapsed}s`
											: `${Math.min(99, Math.max(0, progress))}%`}
									</span>
								</div>
								<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
									<div
										className={`h-full rounded-full bg-[var(--color-primary-600)] transition-[width] duration-300 ease-out ${
											status === 'processing' && progress >= 96 ? 'animate-pulse' : ''
										}`}
										style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
									/>
								</div>
							</div>
						)}

						{result && (
							<div className="space-y-2">
								{originalTranscript ? (
									<div className="overflow-hidden rounded-xl border border-slate-200 bg-[#f7f8fa]">
										<button
											type="button"
											onClick={() => setOriginalExpanded(open => !open)}
											className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-start"
											aria-expanded={originalExpanded}
										>
											<span className="text-[12px] font-semibold text-slate-600">
												{t.originalTranscript}
											</span>
											<span className="text-[11px] font-medium text-slate-500">
												{originalExpanded ? t.hideOriginal : t.showOriginal}
											</span>
										</button>
										{originalExpanded ? (
											<pre
												dir="auto"
												className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words border-t border-slate-200 px-2.5 py-2 font-sans text-[12px] leading-5 text-slate-600"
											>
												{originalTranscript}
											</pre>
										) : null}
									</div>
								) : null}

								<div className="relative rounded-xl border border-slate-200 bg-white p-2.5">
									<div className="mb-2 flex items-center justify-between gap-2">
										<h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
											<Check className="size-4 text-emerald-600" />
											{originalTranscript ? t.correctedTranscript : t.result}
										</h3>
										<Button
											size="sm"
											variant="outline"
											disabled={aiBusy.enhancing}
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
										disabled={aiBusy.enhancing}
										onChange={event => setText(event.target.value)}
										className={`min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-[#f7f8fa] p-2.5 text-[12px] leading-5 outline-none focus:border-[var(--color-primary-400)] disabled:opacity-70 ${
											originalTranscript
												? 'border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/35'
												: ''
										}`}
									/>
									{aiBusy.enhancing ? (
										<div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 top-12 flex items-center justify-center rounded-xl bg-white/55 backdrop-blur-[1px]">
											<div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm">
												<Loader2 className="size-4 animate-spin text-[var(--color-primary-600)]" />
												{t.enhancing}
											</div>
										</div>
									) : null}
									<TranscriptionAiPanel
										ref={aiPanelRef}
										key={result.id}
										variant="compact"
										locale={locale}
										transcriptionId={result.id}
										transcriptText={text}
										onApplyText={nextText => {
											const next = String(nextText || '');
											setText(next);
											if (
												originalTranscript &&
												next.trim() === String(originalTranscript).trim()
											) {
												setOriginalTranscript('');
												setOriginalExpanded(false);
											}
										}}
										onEnhanced={payload => {
											const original = String(payload?.originalText || '').trim();
											const enhanced = String(payload?.enhancedText || '').trim();
											if (original) {
												setOriginalTranscript(original);
												setOriginalExpanded(false);
											}
											if (enhanced) {
												setText(enhanced);
												onCompleted?.(enhanced, result);
											}
										}}
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
