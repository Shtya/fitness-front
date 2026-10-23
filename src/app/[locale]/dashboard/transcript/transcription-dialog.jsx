'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
	AudioLines,
	Check,
	ChevronDown,
	Copy,
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import TranscriptionProviderSelect from './transcription-provider-select';
import TranscriptionAiPanel from './transcription-ai-panel';
import TranscriptVoicePlayer from './transcript-voice-player';
import {
	buildTimelineTranscript,
	audioDisplayName,
	createTextTranscription,
	createChunkedTranscription,
	DEFAULT_TRANSCRIPTION_PROVIDER,
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
import { WaCustomSelect } from '../whatsapp/WaCustomSelect';
import './transcription-dialog.css';

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
		words: 'words',
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
		words: 'كلمة',
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
	const [provider, setProvider] = useState(DEFAULT_TRANSCRIPTION_PROVIDER);
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
	const [copiedAt, setCopiedAt] = useState(0);
	const copiedRecently = Boolean(copiedAt);
	useEffect(() => {
		if (!copiedAt) return undefined;
		const timer = window.setTimeout(() => setCopiedAt(0), 1600);
		return () => window.clearTimeout(timer);
	}, [copiedAt]);
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

	const chunkOptions = TRANSCRIPTION_CHUNK_PRESETS.map(item => ({
		value: item.value,
		label: locale === 'ar' ? item.labelAr : item.labelEn,
	}));

	const progressLabel =
		chunkProgress.total > 1
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
						: t.processing;
	const waitingOnServer = status === 'processing' && progress >= 96;
	const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
	const fileExtension = String(file?.name || '').split('.').pop();

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
				className={`wa-dk wa-pop wtx !flex max-h-[min(92dvh,calc(100dvh-1.25rem))] min-h-0 w-full flex-col gap-0 overflow-hidden rounded-2xl p-0 ${
					isBundle ? 'sm:max-w-xl' : 'sm:max-w-[34rem]'
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
				<DialogHeader className="wtx-head">
					<DialogTitle className="wtx-title">
						<span className="wtx-title-icon" aria-hidden="true">
							<AudioLines />
						</span>
						{isCopyIntent ? t.copyTitle : isBundle ? t.bundleTitle : t.title}
					</DialogTitle>
					<DialogDescription className="wtx-sub">
						{isCopyIntent ? t.copyDescription : isBundle ? t.bundleDescription : t.description}
					</DialogDescription>
				</DialogHeader>

				<div className="wtx-body">
					{status === 'loading' ? (
						<div className="wtx-state">
							<Loader2 className="animate-spin" aria-hidden="true" />
							{t.loadingFile}
						</div>
					) : fileError ? (
						<div className="wtx-error" role="alert">
							{fileError}
						</div>
					) : sources.length ? (
						<>
							{singleVoice && file ? (
								<section className="wtx-media" aria-label={t.voiceFile}>
									<div className="wtx-media-head">
										<span className="wtx-media-icon" aria-hidden="true">
											<FileAudio />
										</span>
										<span className="wtx-media-name" title={file.name}>
											{displayFileName(file.name, t.voiceFile)}
										</span>
										<span className="wtx-media-meta">
											{fileExtension && fileExtension !== file.name ? (
												<span className="wtx-tag">{fileExtension}</span>
											) : null}
											{formatFileSize(file.size)}
										</span>
									</div>
									{audioUrl ? <TranscriptVoicePlayer src={audioUrl} seed={file.name} /> : null}
								</section>
							) : null}

							{isBundle ? (
								<section className="wtx-list">
									<p className="wtx-list-head">
										{t.selectedCount.replace('{count}', String(sources.length))}
										{voiceSources.length
											? ` · ${t.voiceCount.replace('{count}', String(voiceSources.length))}`
											: ''}
										{ticketCount
											? ` · ${t.ticketCount.replace('{count}', String(ticketCount))}`
											: ''}
									</p>
									<ul className="wtx-list-items">
										{sources.map(item => (
											<li key={`${item.kind}-${item.id}`} className="wtx-list-item">
												<span className="wtx-list-icon" aria-hidden="true">
													{item.kind === 'video' ? (
														<Video />
													) : isMediaTranscriptKind(item.kind) ? (
														<FileAudio />
													) : (
														<MessageSquareText />
													)}
												</span>
												<span className="min-w-0 flex-1">
													<span className="wtx-list-name">
														{isMediaTranscriptKind(item.kind)
															? audioDisplayName(item, (item.audioIndex || 1) - 1, t.audioLabel)
															: t.messageLabel}
													</span>
													<span className="wtx-list-meta" dir="auto">
														{formatTimestampWithMs(item.timestamp) || '—'}
														{item.kind === 'text' && item.text ? ` · ${item.text}` : ''}
													</span>
												</span>
											</li>
										))}
									</ul>
								</section>
							) : null}

							<section className={`wtx-controls ${isCopyIntent ? 'hidden' : ''}`}>
								<label className="wtx-field">
									<span className="wtx-label">{t.method}</span>
									<TranscriptionProviderSelect
										value={provider}
										onChange={selectProvider}
										disabled={busy}
										ariaLabel={t.method}
										className="min-w-0"
									/>
								</label>
								<label className="wtx-field" title={t.chunkLengthHint}>
									<span className="wtx-label">{t.chunkLength}</span>
									<WaCustomSelect
										value={chunkSeconds}
										onChange={selectChunkSeconds}
										disabled={busy}
										ariaLabel={t.chunkLength}
										options={chunkOptions}
										className="min-w-0"
									/>
								</label>
								<button
									type="button"
									onClick={transcribe}
									disabled={busy || (singleVoice && !file)}
									className="wtx-btn is-primary wtx-transcribe"
								>
									{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <AudioLines aria-hidden="true" />}
									<span className="truncate">{t.transcribe}</span>
								</button>
							</section>

							{['preparing', 'uploading', 'processing'].includes(status) && (
								<div className="wtx-progress" role="status" aria-live="polite">
									<div className="wtx-progress-row">
										<span className="wtx-progress-label">
											<Loader2 className="animate-spin" aria-hidden="true" />
											<span className="truncate">{progressLabel}</span>
										</span>
										<span className="wtx-progress-value">
											{waitingOnServer ? `${elapsed}s` : `${Math.min(99, Math.max(0, progress))}%`}
										</span>
									</div>
									<div className="wtx-progress-track">
										<div
											className={`wtx-progress-fill ${waitingOnServer ? 'is-waiting' : ''}`}
											style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
										/>
									</div>
								</div>
							)}

							{result && (
								<section className="wtx-result">
									{originalTranscript ? (
										<div className="wtx-original">
											<button
												type="button"
												onClick={() => setOriginalExpanded(open => !open)}
												className="wtx-original-toggle"
												aria-expanded={originalExpanded}
											>
												<span>{t.originalTranscript}</span>
												<span className="wtx-original-action">
													{originalExpanded ? t.hideOriginal : t.showOriginal}
													<ChevronDown
														className={originalExpanded ? 'rotate-180' : ''}
														aria-hidden="true"
													/>
												</span>
											</button>
											{originalExpanded ? (
												<pre dir="auto" className="wtx-original-text">
													{originalTranscript}
												</pre>
											) : null}
										</div>
									) : null}

									<div className="wtx-editor">
										<div className="wtx-editor-head">
											<span className={`wtx-chip ${originalTranscript ? 'is-ai' : ''}`}>
												{originalTranscript ? <Wand2 aria-hidden="true" /> : <Check aria-hidden="true" />}
												{originalTranscript ? t.correctedTranscript : t.result}
											</span>
											<span className="wtx-editor-meta">{wordCount ? `${wordCount} ${t.words}` : ''}</span>
											<button
												type="button"
												className="wtx-btn is-ghost is-sm"
												disabled={aiBusy.enhancing}
												onClick={async () => {
													await navigator.clipboard.writeText(text);
													toast.success(t.copied);
													setCopiedAt(Date.now());
												}}
											>
												{copiedRecently ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
												{t.copy}
											</button>
										</div>
										<div className="wtx-textarea-wrap">
											<textarea
												dir="auto"
												value={text}
												disabled={aiBusy.enhancing}
												aria-label={originalTranscript ? t.correctedTranscript : t.result}
												onChange={event => setText(event.target.value)}
												className={`wtx-textarea ${originalTranscript ? 'is-ai' : ''}`}
											/>
											{aiBusy.enhancing ? (
												<div className="wtx-textarea-busy">
													<span>
														<Loader2 className="animate-spin" aria-hidden="true" />
														{t.enhancing}
													</span>
												</div>
											) : null}
										</div>
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
								</section>
							)}
						</>
					) : null}
				</div>

				{result ? (
					<footer className="wtx-foot">
						<div className="wtx-foot-secondary">
							<button
								type="button"
								onClick={() => aiPanelRef.current?.summarize?.()}
								disabled={aiBusy.summarizing || !result.id || !text.trim()}
								className="wtx-btn is-ghost"
							>
								{aiBusy.summarizing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ListChecks aria-hidden="true" />}
								<span className="truncate">{aiBusy.summarizing ? t.summarizing : t.summarize}</span>
							</button>
							<button
								type="button"
								onClick={() => aiPanelRef.current?.enhance?.()}
								disabled={aiBusy.enhancing || !result.id || !text.trim()}
								className="wtx-btn is-soft"
							>
								{aiBusy.enhancing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Wand2 aria-hidden="true" />}
								<span className="truncate">{aiBusy.enhancing ? t.enhancing : t.enhance}</span>
							</button>
						</div>
						<button
							type="button"
							onClick={save}
							disabled={saving || text === result.text}
							className="wtx-btn is-primary wtx-save"
						>
							{saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
							<span className="truncate">{t.save}</span>
						</button>
					</footer>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
