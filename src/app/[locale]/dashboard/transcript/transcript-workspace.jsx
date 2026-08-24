'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
	AudioLines,
	Check,
	Clipboard,
	Clock3,
	Download,
	FileAudio,
	History,
	KeyRound,
	LoaderCircle,
	Mic,
	MonitorUp,
	Pause,
	Play,
	RotateCcw,
	Save,
	Square,
	Trash2,
	UploadCloud,
	X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import TranscriptionAiPanel from './transcription-ai-panel';
import TranscriptVoicePlayer from './transcript-voice-player';
import { WaCustomSelect } from '../whatsapp/WaCustomSelect';
import {
	ACCEPTED_TRANSCRIPTION_EXTENSIONS as ACCEPTED_EXTENSIONS,
	CLOUD_TRANSCRIPTION_PROVIDER_IDS as CLOUD_PROVIDER_IDS,
	audioDisplayName,
	createChunkedTranscription,
	getStoredTranscriptionChunkSeconds,
	getStoredTranscriptionProvider,
	GROQ_FREE_MAX_FILE_SIZE,
	MAX_TRANSCRIPTION_FILE_SIZE as MAX_FILE_SIZE,
	storeTranscriptionChunkSeconds,
	storeTranscriptionProvider,
	TRANSCRIPTION_ACCEPT as ACCEPT,
	TRANSCRIPTION_CHUNK_PRESETS,
	TRANSCRIPTION_PROVIDERS as PROVIDERS,
	transcriptionErrorMessage,
} from './transcription-client';
import { STUDIO } from '../ai-content-studio/components/studio-theme';

function formatSelectedFileSize(bytes) {
	const size = Number(bytes);
	if (!Number.isFinite(size) || size <= 0) return '';
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
	return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

/** Shorter label for dense file rows; full name stays in title tooltip. */
function shortSelectedFileLabel(fullName, index, fallbackTemplate) {
	const raw = String(fullName || '').trim();
	if (!raw) return String(fallbackTemplate || 'Audio {n}').replace('{n}', String(index + 1));
	const base = raw.split(/[/\\]/).pop() || raw;
	const noExt = base.replace(/\.[a-z0-9]{2,5}$/i, '');
	const waMatch = noExt.match(
		/whatsapp\s+audio\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?\s*(?:AM|PM)?)(?:\s*\((\d+)\))?/i,
	);
	if (waMatch) {
		const time = waMatch[2].replace(/\./g, ':');
		const dup = waMatch[3] ? ` (${waMatch[3]})` : '';
		return `${time}${dup}`;
	}
	if (noExt.length <= 28) return noExt;
	return `${noExt.slice(0, 18)}…${noExt.slice(-6)}`;
}

const copy = {
	en: {
		title: 'Transcript',
		subtitle: 'Turn uploads, microphone recordings, or meeting audio into editable text — then enhance unclear speech with AI and memorize the details.',
		heroTitleBefore: 'Speak once.',
		heroTitleEm: 'Read clearly',
		heroSubtitle1: 'Upload or record',
		heroSubtitle2: 'AI cleanup',
		heroSubtitle3: 'Memorize details',
		upload: 'Upload audio',
		microphone: 'Microphone',
		meeting: 'Meeting / tab',
		dropTitle: 'Drop audio files here',
		dropHint: 'MP3, WAV, M4A, WEBM, OGG or MP4 — up to 500 MB each. Select multiple files to transcribe in one go.',
		browse: 'Browse files',
		selectedFiles: 'Selected files',
		clearFiles: 'Clear all',
		removeFile: 'Remove',
		batchProgress: 'File {current} of {total}',
		batchDone: 'Transcribed {count} files',
		batchPartial: 'Transcribed {done} of {total} files. Some failed.',
		fileSkipped: 'Skipped {name}',
		audioLabel: 'audio {n}',
		batchFileName: '{count} audio files',
		meetingHint: 'Records your microphone and the audio from the browser tab you share.',
		micHint: 'Record directly from your microphone.',
		start: 'Start recording',
		pause: 'Pause',
		resume: 'Resume',
		stop: 'Stop',
		cancel: 'Cancel',
		language: 'Language',
		chunkLength: 'Chunk length',
		chunkLengthHint: 'Long audio is split and sent one chunk per request (default 3.5 min).',
		chunkProgress: 'Chunk {current} of {total}',
		method: 'Transcription method',
		localMethod: 'Local · Private',
		groqMethod: 'Groq · Fast cloud',
		deepgramMethod: 'Deepgram · Nova-3',
		assemblyMethod: 'AssemblyAI · Universal 3.5 Pro',
		qualityEstimate: 'estimated mixed Arabic/English quality',
		groqSetup: 'Groq requires a server API key. Sign in to Groq Console, open API Keys, create a key, then ask the administrator to add it to backend/.env.',
		groqGetKey: 'Open provider dashboard',
		groqKeyLabel: 'Provider API key',
		groqKeyPlaceholder: 'Paste a new API key',
		groqKeySave: 'Save / replace key',
		groqKeySaved: 'API key saved securely',
		groqKeyConfigured: 'Configured key ending in',
		groqKeyMissing: 'No API key is configured',
		providerSettings: 'Provider credentials',
		groqKeyManage: 'Get / update API key',
		groqStepsTitle: 'How to get an API key',
		groqStep1: 'Sign in to the provider dashboard.',
		groqStep2: 'Open API Keys and click Create API Key.',
		groqStep3: 'Copy the key, paste it below, then click Save.',
		close: 'Close',
		localProcessing: 'Normalizing audio and transcribing locally…',
		groqProcessing: 'Transcribing with Groq Whisper Turbo…',
		deepgramProcessing: 'Transcribing with Deepgram Nova-3…',
		assemblyProcessing: 'Transcribing with AssemblyAI Universal 3.5 Pro…',
		auto: 'Auto detect',
		arabic: 'Arabic',
		english: 'English',
		vocabulary: 'Custom vocabulary',
		vocabularyHint: 'Names or specialist terms, separated by commas',
		transcribe: 'Transcribe audio',
		uploading: 'Uploading',
		processing: 'Normalizing audio and transcribing locally…',
		elapsed: 'Elapsed',
		ready: 'Ready to transcribe',
		transcript: 'Editable transcript',
		copy: 'Copy',
		download: 'Download TXT',
		save: 'Save changes',
		saved: 'Changes saved',
		words: 'Words',
		characters: 'Characters',
		duration: 'Audio duration',
		processingTime: 'Processing time',
		detected: 'Detected language',
		history: 'History',
		noHistory: 'Your transcriptions will appear here.',
		deleteConfirm: 'Delete this transcription?',
		recording: 'Recording',
		paused: 'Paused',
		fileRequired: 'Choose or record audio files first.',
		unsupported: 'Unsupported file format.',
		tooLarge: 'The maximum file size is 500 MB.',
		groqTooLarge: 'Groq free tier accepts files up to 25 MB.',
		tabAudioRequired: 'Share a browser tab and enable “Share tab audio”.',
		permissionError: 'Recording permission was denied or no audio source is available.',
		failed: 'Transcription failed. Check that the local transcription service is running.',
		copied: 'Transcript copied',
		removed: 'Transcription deleted',
	},
	ar: {
		title: 'تحويل الصوت إلى نص',
		subtitle: 'حوّل الملفات أو التسجيل إلى نص قابل للتعديل — ثم حسّن الكلام غير الواضح بالذكاء الاصطناعي وثبّته بتفاصيل أكثر.',
		heroTitleBefore: 'سجّل مرة.',
		heroTitleEm: 'واقرأ بوضوح',
		heroSubtitle1: 'رفع أو تسجيل',
		heroSubtitle2: 'تنظيف بالذكاء',
		heroSubtitle3: 'تثبيت التفاصيل',
		upload: 'رفع ملف صوتي',
		microphone: 'الميكروفون',
		meeting: 'اجتماع / تبويب',
		dropTitle: 'اسحب الملفات الصوتية هنا',
		dropHint: 'MP3 أو WAV أو M4A أو WEBM أو OGG أو MP4 — حتى 500 ميجابايت لكل ملف. يمكنك اختيار عدة ملفات وتحويلها دفعة واحدة.',
		browse: 'اختيار ملفات',
		selectedFiles: 'الملفات المحددة',
		clearFiles: 'مسح الكل',
		removeFile: 'إزالة',
		batchProgress: 'الملف {current} من {total}',
		batchDone: 'تم تحويل {count} ملفات',
		batchPartial: 'تم تحويل {done} من {total} ملفات. فشل بعضها.',
		fileSkipped: 'تم تخطي {name}',
		audioLabel: 'صوت {n}',
		batchFileName: '{count} ملفات صوتية',
		meetingHint: 'يسجل الميكروفون مع صوت تبويب المتصفح الذي تقوم بمشاركته.',
		micHint: 'سجل مباشرة من الميكروفون.',
		start: 'بدء التسجيل',
		pause: 'إيقاف مؤقت',
		resume: 'استكمال',
		stop: 'إنهاء',
		cancel: 'إلغاء',
		language: 'اللغة',
		chunkLength: 'طول القطعة',
		chunkLengthHint: 'الصوت الطويل يتقسم ويتبعت قطعة في كل طلب (الافتراضي 3.5 دقايق).',
		chunkProgress: 'قطعة {current} من {total}',
		method: 'طريقة التحويل',
		localMethod: 'محلي · خاص',
		groqMethod: 'Groq · سحابي سريع',
		deepgramMethod: 'Deepgram · Nova-3',
		assemblyMethod: 'AssemblyAI · Universal 3.5 Pro',
		qualityEstimate: 'تقدير جودة للعربية والإنجليزية المختلطة',
		groqSetup: 'يتطلب Groq مفتاح API على الخادم. سجّل الدخول إلى Groq Console ثم افتح API Keys وأنشئ مفتاحًا، وبعدها أضفه كمسؤول داخل backend/.env.',
		groqGetKey: 'فتح لوحة المزود',
		groqKeyLabel: 'مفتاح API للمزود',
		groqKeyPlaceholder: 'ألصق مفتاح API الجديد',
		groqKeySave: 'حفظ / استبدال المفتاح',
		groqKeySaved: 'تم حفظ مفتاح API بشكل آمن',
		groqKeyConfigured: 'المفتاح المفعّل ينتهي بـ',
		groqKeyMissing: 'لا يوجد مفتاح API مفعّل',
		providerSettings: 'بيانات اعتماد مزود التحويل',
		groqKeyManage: 'الحصول على / تحديث المفتاح',
		groqStepsTitle: 'طريقة الحصول على مفتاح API',
		groqStep1: 'سجّل الدخول إلى لوحة المزود.',
		groqStep2: 'افتح API Keys واضغط Create API Key.',
		groqStep3: 'انسخ المفتاح وألصقه بالأسفل ثم اضغط حفظ.',
		close: 'إغلاق',
		localProcessing: 'جارٍ توحيد الصوت وتحويله محليًا إلى نص…',
		groqProcessing: 'جارٍ التحويل عبر Groq Whisper Turbo…',
		deepgramProcessing: 'جارٍ التحويل عبر Deepgram Nova-3…',
		assemblyProcessing: 'جارٍ التحويل عبر AssemblyAI Universal 3.5 Pro…',
		auto: 'اكتشاف تلقائي',
		arabic: 'العربية',
		english: 'الإنجليزية',
		vocabulary: 'مصطلحات مخصصة',
		vocabularyHint: 'أسماء أو مصطلحات متخصصة مفصولة بفواصل',
		transcribe: 'تحويل إلى نص',
		uploading: 'جارٍ الرفع',
		processing: 'جارٍ توحيد الصوت وتحويله محليًا إلى نص…',
		elapsed: 'الوقت المنقضي',
		ready: 'جاهز للتحويل',
		transcript: 'النص القابل للتعديل',
		copy: 'نسخ',
		download: 'تنزيل TXT',
		save: 'حفظ التعديلات',
		saved: 'تم حفظ التعديلات',
		words: 'الكلمات',
		characters: 'الحروف',
		duration: 'مدة الصوت',
		processingTime: 'وقت المعالجة',
		detected: 'اللغة المكتشفة',
		history: 'السجل',
		noHistory: 'ستظهر عمليات التحويل الخاصة بك هنا.',
		deleteConfirm: 'هل تريد حذف هذا النص؟',
		recording: 'جارٍ التسجيل',
		paused: 'متوقف مؤقتًا',
		fileRequired: 'اختر أو سجل ملفات صوتية أولًا.',
		unsupported: 'صيغة الملف غير مدعومة.',
		tooLarge: 'الحد الأقصى لحجم الملف هو 500 ميجابايت.',
		groqTooLarge: 'خطة Groq المجانية تقبل ملفات حتى 25 ميجابايت.',
		tabAudioRequired: 'شارك تبويب متصفح وفعّل خيار مشاركة صوت التبويب.',
		permissionError: 'تعذر الوصول إلى التسجيل أو لا يوجد مصدر صوت متاح.',
		failed: 'فشل التحويل. تأكد من تشغيل خدمة التحويل المحلية.',
		copied: 'تم نسخ النص',
		removed: 'تم حذف النص',
	},
};

function formatTime(seconds = 0) {
	const value = Math.max(0, Math.round(Number(seconds) || 0));
	const hours = Math.floor(value / 3600);
	const minutes = Math.floor((value % 3600) / 60);
	const secs = value % 60;
	return [hours, minutes, secs]
		.filter((_, index) => hours > 0 || index > 0)
		.map(part => String(part).padStart(2, '0'))
		.join(':');
}

function fileKey(file) {
	return `${file.name}:${file.size}:${file.lastModified}`;
}

function buildCombinedTranscript(items, audioLabelTemplate, { forceLabels = false } = {}) {
	if (!items.length) return '';
	if (items.length === 1 && !forceLabels) return String(items[0]?.text || '').trim();
	return items
		.map((item, index) => {
			const label = audioDisplayName(item, index, audioLabelTemplate);
			const text = String(item?.text || '').trim();
			return `${label} :\n${text}`;
		})
		.join('\n\n');
}

function getRecorderMimeType() {
	const options = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];
	return options.find(type => window.MediaRecorder?.isTypeSupported(type)) || '';
}

export default function TranscriptWorkspace() {
	const locale = useLocale();
	const t = copy[locale] || copy.en;
	const isArabic = locale === 'ar';
	const currentUser = useUser();
	const canManageProviderKey = ['admin', 'super_admin'].includes(currentUser?.role);
	const [mode, setMode] = useState('upload');
	const [files, setFiles] = useState([]);
	const [previewUrls, setPreviewUrls] = useState([]);
	const [provider, setProvider] = useState('local');
	const [chunkSeconds, setChunkSeconds] = useState(() => getStoredTranscriptionChunkSeconds());
	const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
	const [language, setLanguage] = useState('auto');
	const [recordingState, setRecordingState] = useState('idle');
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [status, setStatus] = useState('idle');
	const [progress, setProgress] = useState(0);
	const [batchIndex, setBatchIndex] = useState(0);
	const [batchTotal, setBatchTotal] = useState(0);
	const [processingElapsed, setProcessingElapsed] = useState(0);
	const [result, setResult] = useState(null);
	const [transcriptText, setTranscriptText] = useState('');
	const [history, setHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [providerApiKey, setProviderApiKey] = useState('');
	const [providerCredential, setProviderCredential] = useState(null);
	const [savingProviderKey, setSavingProviderKey] = useState(false);
	const [showCredentialModal, setShowCredentialModal] = useState(false);

	const fileInputRef = useRef(null);
	const recorderRef = useRef(null);
	const chunksRef = useRef([]);
	const streamsRef = useRef([]);
	const audioContextRef = useRef(null);
	const timerRef = useRef(null);
	const cancelledRef = useRef(false);
	const providerMeta = PROVIDERS.find(item => item.id === provider) || PROVIDERS.at(-1);

	const releaseMedia = useCallback(() => {
		if (timerRef.current) window.clearInterval(timerRef.current);
		timerRef.current = null;
		streamsRef.current.forEach(stream => stream.getTracks().forEach(track => track.stop()));
		streamsRef.current = [];
		if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
			audioContextRef.current.close().catch(() => {});
		}
		audioContextRef.current = null;
	}, []);

	useEffect(() => {
		return () => {
			cancelledRef.current = true;
			const recorder = recorderRef.current;
			if (recorder) {
				recorder.ondataavailable = null;
				recorder.onstop = null;
				if (recorder.state !== 'inactive') recorder.stop();
			}
			releaseMedia();
		};
	}, [releaseMedia]);

	useEffect(() => {
		const nextUrls = files.map(item => URL.createObjectURL(item));
		setPreviewUrls(nextUrls);
		return () => nextUrls.forEach(url => URL.revokeObjectURL(url));
	}, [files]);

	const loadHistory = useCallback(async () => {
		try {
			const { data } = await api.get('/transcriptions', { params: { limit: 50 } });
			setHistory(Array.isArray(data) ? data : []);
		} catch {
			setHistory([]);
		} finally {
			setHistoryLoading(false);
		}
	}, []);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	useEffect(() => {
		setProvider(getStoredTranscriptionProvider());
		setChunkSeconds(getStoredTranscriptionChunkSeconds());
	}, []);

	const loadProviderCredential = useCallback(async () => {
		if (!canManageProviderKey || !CLOUD_PROVIDER_IDS.includes(provider)) {
			setProviderCredential(null);
			return;
		}
		try {
			const { data } = await api.get(`/transcriptions/providers/${provider}/credential`);
			setProviderCredential(data);
		} catch {
			setProviderCredential(null);
		}
	}, [canManageProviderKey, provider]);

	useEffect(() => {
		loadProviderCredential();
	}, [loadProviderCredential]);

	useEffect(() => {
		if (!showCredentialModal) return;
		const onKeyDown = event => {
			if (event.key === 'Escape') setShowCredentialModal(false);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [showCredentialModal]);

	useEffect(() => {
		if (status !== 'processing') return;
		const startedAt = Date.now();
		setProcessingElapsed(0);
		const interval = window.setInterval(() => {
			setProcessingElapsed(Math.floor((Date.now() - startedAt) / 1000));
		}, 1000);
		return () => window.clearInterval(interval);
	}, [status]);

	const selectFiles = useCallback(
		(incoming, { replace = false } = {}) => {
			const list = Array.from(incoming || []).filter(Boolean);
			if (!list.length) return;

			const accepted = [];
			for (const selected of list) {
				const extension = selected.name.split('.').pop()?.toLowerCase();
				if (!ACCEPTED_EXTENSIONS.includes(extension)) {
					toast.error(`${t.fileSkipped.replace('{name}', selected.name)}: ${t.unsupported}`);
					continue;
				}
				if (selected.size > MAX_FILE_SIZE) {
					toast.error(`${t.fileSkipped.replace('{name}', selected.name)}: ${t.tooLarge}`);
					continue;
				}
				accepted.push(selected);
			}
			if (!accepted.length) return;

			setFiles(current => {
				if (replace) return accepted;
				const existing = new Set(current.map(fileKey));
				const merged = [...current];
				for (const item of accepted) {
					if (!existing.has(fileKey(item))) merged.push(item);
				}
				return merged;
			});
			setResult(null);
			setTranscriptText('');
			setStatus('idle');
			setProgress(0);
			setBatchIndex(0);
			setBatchTotal(0);
		},
		[t],
	);

	const removeFile = useCallback(index => {
		setFiles(current => current.filter((_, i) => i !== index));
		setStatus('idle');
		setProgress(0);
	}, []);

	const clearFiles = useCallback(() => {
		setFiles([]);
		setResult(null);
		setTranscriptText('');
		setStatus('idle');
		setProgress(0);
		setBatchIndex(0);
		setBatchTotal(0);
		if (fileInputRef.current) fileInputRef.current.value = '';
	}, []);

	const startTimer = useCallback(() => {
		if (timerRef.current) window.clearInterval(timerRef.current);
		timerRef.current = window.setInterval(() => {
			setRecordingSeconds(value => value + 1);
		}, 1000);
	}, []);

	const startRecording = async () => {
		if (!navigator.mediaDevices || !window.MediaRecorder) {
			toast.error(t.permissionError);
			return;
		}
		cancelledRef.current = false;
		chunksRef.current = [];
		setRecordingSeconds(0);
		setFiles([]);
		setResult(null);

		try {
			let recorderStream;
			if (mode === 'meeting') {
				const display = await navigator.mediaDevices.getDisplayMedia({
					video: true,
					audio: true,
				});
				streamsRef.current.push(display);
				if (!display.getAudioTracks().length) {
					releaseMedia();
					toast.error(t.tabAudioRequired);
					return;
				}
				const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
				streamsRef.current.push(mic);
				const context = new AudioContext();
				audioContextRef.current = context;
				await context.resume();
				const destination = context.createMediaStreamDestination();
				context.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(destination);
				context.createMediaStreamSource(mic).connect(destination);
				recorderStream = destination.stream;
				display.getVideoTracks().forEach(track => {
					track.onended = () => {
						if (recorderRef.current?.state !== 'inactive') recorderRef.current.stop();
					};
				});
			} else {
				recorderStream = await navigator.mediaDevices.getUserMedia({
					audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
				});
				streamsRef.current.push(recorderStream);
			}

			const mimeType = getRecorderMimeType();
			const recorder = new MediaRecorder(recorderStream, mimeType ? { mimeType } : undefined);
			recorderRef.current = recorder;
			recorder.ondataavailable = event => {
				if (event.data.size) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				if (!cancelledRef.current && chunksRef.current.length) {
					const type = recorder.mimeType || 'audio/webm';
					const blob = new Blob(chunksRef.current, { type });
					selectFiles([new File([blob], `recording-${Date.now()}.webm`, { type })], { replace: true });
				}
				setRecordingState('idle');
				releaseMedia();
			};
			recorder.start(1000);
			setRecordingState('recording');
			startTimer();
		} catch {
			releaseMedia();
			setRecordingState('idle');
			toast.error(t.permissionError);
		}
	};

	const pauseRecording = () => {
		if (recorderRef.current?.state !== 'recording') return;
		recorderRef.current.pause();
		if (timerRef.current) window.clearInterval(timerRef.current);
		timerRef.current = null;
		setRecordingState('paused');
	};

	const resumeRecording = () => {
		if (recorderRef.current?.state !== 'paused') return;
		recorderRef.current.resume();
		setRecordingState('recording');
		startTimer();
	};

	const stopRecording = () => {
		if (recorderRef.current?.state === 'inactive') return;
		recorderRef.current?.stop();
	};

	const cancelRecording = () => {
		cancelledRef.current = true;
		chunksRef.current = [];
		if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
		else releaseMedia();
		setRecordingSeconds(0);
		setRecordingState('idle');
	};

	const transcribe = async () => {
		if (!files.length) {
			toast.error(t.fileRequired);
			return;
		}
		if (provider === 'groq') {
			const oversized = files.find(item => item.size > GROQ_FREE_MAX_FILE_SIZE);
			if (oversized) {
				toast.error(`${oversized.name}: ${t.groqTooLarge}`);
				return;
			}
		}

		const queue = [...files];
		setBatchTotal(queue.length);
		setBatchIndex(0);
		setChunkProgress({ current: 0, total: 0 });
		const created = [];
		let lastError = null;

		for (let index = 0; index < queue.length; index += 1) {
			const currentFile = queue[index];
			setBatchIndex(index + 1);
			setStatus('uploading');
			setProgress(0);
			setProcessingElapsed(0);
			setChunkProgress({ current: 0, total: 0 });
			try {
				const data = await createChunkedTranscription({
					file: currentFile,
					provider,
					language,
					chunkSeconds,
					onChunkProgress: ({ chunkIndex, chunkTotal }) => {
						setChunkProgress({ current: chunkIndex, total: chunkTotal });
						if (chunkTotal > 1) setStatus('processing');
					},
					onUploadProgress: event => {
						if (!event.total) {
							setStatus('processing');
							return;
						}
						const next = Math.min(100, Math.round((event.loaded * 100) / event.total));
						setProgress(next);
						if (next >= 95) setStatus('processing');
					},
				});
				created.push({
					...data,
					originalFileName: data?.originalFileName || currentFile.name,
					fileName: currentFile.name,
					name: currentFile.name,
				});
				const combinedText = buildCombinedTranscript(created, t.audioLabel, {
					forceLabels: queue.length > 1,
				});
				setTranscriptText(combinedText);
				setResult({
					...data,
					id: created[0].id,
					text: combinedText,
					originalFileName:
						created.length > 1 || queue.length > 1
							? t.batchFileName.replace('{count}', String(Math.max(created.length, queue.length)))
							: data.originalFileName,
					durationSeconds: created.reduce((sum, item) => sum + (Number(item.durationSeconds) || 0), 0),
					processingTimeSeconds: created.reduce(
						(sum, item) => sum + (Number(item.processingTimeSeconds) || 0),
						0,
					),
					detectedLanguage: created[0].detectedLanguage,
					provider: created[0].provider,
					batchIds: created.map(item => item.id),
				});
				setHistory(current => {
					const withoutBatch = current.filter(item => !created.some(entry => entry.id === item.id));
					const primary = {
						...created[0],
						text: combinedText,
						originalFileName:
							queue.length > 1
								? t.batchFileName.replace('{count}', String(queue.length))
								: created[0].originalFileName,
						durationSeconds: created.reduce((sum, item) => sum + (Number(item.durationSeconds) || 0), 0),
						processingTimeSeconds: created.reduce(
							(sum, item) => sum + (Number(item.processingTimeSeconds) || 0),
							0,
						),
					};
					return [primary, ...withoutBatch];
				});
			} catch (error) {
				lastError = error;
				toast.error(
					`${currentFile.name}: ${transcriptionErrorMessage(error, t.failed)}`,
				);
			}
		}

		if (created.length > 1) {
			try {
				const combinedText = buildCombinedTranscript(created, t.audioLabel, { forceLabels: true });
				const { data } = await api.patch(`/transcriptions/${created[0].id}`, { text: combinedText });
				const extras = created.slice(1);
				await Promise.allSettled(extras.map(item => api.delete(`/transcriptions/${item.id}`)));
				const merged = {
					...data,
					originalFileName: t.batchFileName.replace('{count}', String(created.length)),
					durationSeconds: created.reduce((sum, item) => sum + (Number(item.durationSeconds) || 0), 0),
					processingTimeSeconds: created.reduce(
						(sum, item) => sum + (Number(item.processingTimeSeconds) || 0),
						0,
					),
					batchIds: [data.id],
				};
				setResult(merged);
				setTranscriptText(combinedText);
				setHistory(current => {
					const extraIds = new Set(extras.map(item => item.id));
					return [
						merged,
						...current.filter(item => item.id !== data.id && !extraIds.has(item.id)),
					];
				});
			} catch {
				// Keep the local combined transcript even if merge persistence fails.
			}
		}

		if (created.length === queue.length) {
			setStatus('done');
			if (queue.length > 1) {
				toast.success(t.batchDone.replace('{count}', String(created.length)));
			}
		} else if (created.length > 0) {
			setStatus('done');
			toast.error(
				t.batchPartial
					.replace('{done}', String(created.length))
					.replace('{total}', String(queue.length)),
			);
		} else {
			setStatus('error');
			if (!lastError) toast.error(t.failed);
		}
	};

	const selectProvider = nextProvider => {
		if (!PROVIDERS.some(item => item.id === nextProvider)) return;
		setProvider(nextProvider);
		setProviderApiKey('');
		setProviderCredential(null);
		setShowCredentialModal(false);
		storeTranscriptionProvider(nextProvider);
	};

	const selectChunkSeconds = value => {
		setChunkSeconds(storeTranscriptionChunkSeconds(value));
	};

	const providerOptions = useMemo(
		() =>
			PROVIDERS.map(item => ({
				value: item.id,
				label: `${item.name} · ${item.score}%`,
			})),
		[],
	);
	const languageOptions = useMemo(
		() => [
			{ value: 'auto', label: t.auto },
			{ value: 'ar', label: t.arabic },
			{ value: 'en', label: t.english },
		],
		[t.auto, t.arabic, t.english],
	);
	const chunkOptions = useMemo(
		() =>
			TRANSCRIPTION_CHUNK_PRESETS.map(item => ({
				value: item.value,
				label: isArabic ? item.labelAr : item.labelEn,
			})),
		[isArabic],
	);

	const saveProviderKey = async () => {
		const apiKey = providerApiKey.trim();
		if (!apiKey) return;
		setSavingProviderKey(true);
		try {
			const { data } = await api.put(`/transcriptions/providers/${provider}/credential`, { apiKey });
			setProviderCredential(data);
			setProviderApiKey('');
			toast.success(`${providerMeta.name}: ${t.groqKeySaved}`);
		} catch (error) {
			toast.error(error.response?.data?.message || t.failed);
		} finally {
			setSavingProviderKey(false);
		}
	};

	const saveTranscript = async () => {
		if (!result?.id) return;
		setSaving(true);
		try {
			const { data } = await api.patch(`/transcriptions/${result.id}`, { text: transcriptText });
			setResult(data);
			setHistory(current => current.map(item => (item.id === data.id ? data : item)));
			toast.success(t.saved);
		} catch {
			toast.error(t.failed);
		} finally {
			setSaving(false);
		}
	};

	const deleteTranscript = async id => {
		if (!window.confirm(t.deleteConfirm)) return;
		try {
			await api.delete(`/transcriptions/${id}`);
			setHistory(current => current.filter(item => item.id !== id));
			if (result?.id === id) {
				setResult(null);
				setTranscriptText('');
			}
			toast.success(t.removed);
		} catch {
			toast.error(t.failed);
		}
	};

	const copyTranscript = async () => {
		await navigator.clipboard.writeText(transcriptText);
		toast.success(t.copied);
	};

	const downloadTranscript = () => {
		const url = URL.createObjectURL(new Blob([transcriptText], { type: 'text/plain;charset=utf-8' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `${result?.originalFileName?.replace(/\.[^.]+$/, '') || 'transcript'}.txt`;
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 0);
	};

	const liveCounts = useMemo(() => {
		const trimmed = transcriptText.trim();
		return {
			words: trimmed ? trimmed.split(/\s+/u).length : 0,
			characters: transcriptText.length,
		};
	}, [transcriptText]);

	const busy = status === 'uploading' || status === 'processing';
	const recording = recordingState !== 'idle';
	const panelClass =
		'relative rounded-[20px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_10px_20px_-10px_rgba(15,23,42,0.10),0_4px_6px_-4px_rgba(15,23,42,0.05)] md:p-6';

	return (
		<div className="relative mx-auto w-full max-w-[1500px] space-y-5 overflow-hidden pb-10" dir={isArabic ? 'rtl' : 'ltr'}>
			<div
				className="pointer-events-none absolute left-[8%] top-[-80px] h-[340px] w-[480px] rounded-full blur-3xl"
				style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, rgba(59,130,246,0.08) 45%, transparent 70%)' }}
			/>
			<div
				className="pointer-events-none absolute right-[4%] top-[12%] h-[280px] w-[380px] rounded-full blur-3xl"
				style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' }}
			/>

			<header
				className="relative z-10 flex min-h-[76px] flex-wrap items-center gap-3 rounded-[20px] bg-white px-5 py-3 sm:px-6"
				style={{ boxShadow: STUDIO.shadow }}
			>
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<span
						className="grid size-11 shrink-0 place-items-center rounded-xl text-white"
						style={{ background: STUDIO.gradientBr, boxShadow: STUDIO.shadow3dPrimary }}
					>
						<AudioLines size={20} strokeWidth={1.8} />
					</span>
					<div className="min-w-0">
						<h1 className="truncate text-[16px] font-bold tracking-tight text-[#111827]">
							{t.heroTitleBefore} <span className="text-[#6366F1]">{t.heroTitleEm}</span>
						</h1>
						<p className="mt-0.5 truncate text-[12px] text-[#6B7280]">
							{t.heroSubtitle1} · {t.heroSubtitle2} · {t.heroSubtitle3}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					 
					<label className="sr-only">{t.method}</label>
					<WaCustomSelect
						value={provider}
						onChange={selectProvider}
						disabled={busy}
						ariaLabel={t.method}
						options={providerOptions}
						className="min-w-[11rem]"
						buttonClassName="!h-10 !rounded-xl !px-3 !text-sm !font-semibold text-slate-800"
					/>
					{CLOUD_PROVIDER_IDS.includes(provider) && canManageProviderKey && (
						<button
							type="button"
							onClick={() => setShowCredentialModal(true)}
							className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#c7d2fe] hover:text-[#4f46e5]"
							aria-label={t.providerSettings}
							title={t.providerSettings}
						>
							<KeyRound className="size-4" />
							<span className="hidden lg:inline">{t.groqKeyManage}</span>
						</button>
					)}
				</div>
 			</header>

			<div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,.65fr)]">
				<div className="space-y-5">
					<section className={panelClass}>
						<div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
							{[
								['upload', UploadCloud, t.upload],
								['microphone', Mic, t.microphone],
								['meeting', MonitorUp, t.meeting],
							].map(([value, Icon, label]) => (
								<button
									key={value}
									type="button"
									disabled={recording || busy}
									onClick={() => setMode(value)}
									className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition md:text-sm ${
										mode === value
											? 'bg-white text-[#4f46e5] shadow-sm ring-1 ring-[#c7d2fe]'
											: 'text-slate-500 hover:text-slate-800'
									}`}
								>
									<Icon className="size-4" />
									<span className="truncate">{label}</span>
								</button>
							))}
						</div>

						<div className="mt-5">
							{mode === 'upload' ? (
								<div
									onDragEnter={event => { event.preventDefault(); setDragging(true); }}
									onDragOver={event => event.preventDefault()}
									onDragLeave={() => setDragging(false)}
									onDrop={event => {
										event.preventDefault();
										setDragging(false);
										selectFiles(event.dataTransfer.files);
									}}
									className={`flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
										dragging
											? 'border-[#6366F1] bg-[#eef2ff]'
											: 'border-slate-200 bg-gradient-to-b from-slate-50 to-white'
									}`}
								>
									<div
										className="mb-4 grid size-14 place-items-center rounded-2xl text-white"
										style={{ background: STUDIO.gradientBr, boxShadow: STUDIO.shadow3dPrimary }}
									>
										<UploadCloud className="size-7" />
									</div>
									<h2 className="font-bold text-slate-800">{t.dropTitle}</h2>
									<p className="mt-1 max-w-md text-xs text-slate-500 md:text-sm">{t.dropHint}</p>
									<Button
										className="mt-5 border-0 text-white hover:opacity-95"
										style={{ background: STUDIO.gradient, boxShadow: STUDIO.shadow3dPrimary }}
										onClick={() => fileInputRef.current?.click()}
										disabled={busy}
									>
										{t.browse}
									</Button>
									<input
										ref={fileInputRef}
										type="file"
										accept={ACCEPT}
										multiple
										className="hidden"
										onChange={event => {
											selectFiles(event.target.files);
											event.target.value = '';
										}}
									/>
								</div>
							) : (
								<div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 text-center">
									<div className={`relative mb-4 grid size-20 place-items-center rounded-full ${
										recordingState === 'recording' ? 'bg-red-50 text-red-600' : 'bg-[#eef2ff] text-[#4f46e5]'
									}`}>
										{recordingState === 'recording' && <span className="absolute inset-0 animate-ping rounded-full bg-red-200/50" />}
										{mode === 'meeting' ? <MonitorUp className="relative size-8" /> : <Mic className="relative size-8" />}
									</div>
									<p className="text-sm text-slate-600">{mode === 'meeting' ? t.meetingHint : t.micHint}</p>
									{recording && (
										<div className="mt-4 font-mono text-2xl font-black text-slate-900">
											{formatTime(recordingSeconds)}
											<span className="mt-1 block font-sans text-xs font-bold text-red-600">
												{recordingState === 'paused' ? t.paused : t.recording}
											</span>
										</div>
									)}
									<div className="mt-5 flex flex-wrap justify-center gap-2">
										{!recording && <Button onClick={startRecording} style={{ background: STUDIO.gradient }} className="border-0 text-white"><Mic />{t.start}</Button>}
										{recordingState === 'recording' && <Button variant="outline" onClick={pauseRecording}><Pause />{t.pause}</Button>}
										{recordingState === 'paused' && <Button variant="outline" onClick={resumeRecording}><Play />{t.resume}</Button>}
										{recording && <Button onClick={stopRecording}><Square />{t.stop}</Button>}
										{recording && <Button variant="destructive" onClick={cancelRecording}><X />{t.cancel}</Button>}
									</div>
								</div>
							)}
						</div>

						{files.length > 0 && !recording && (
							<div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
								<div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-3 py-2">
									<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
										{t.selectedFiles}
										<span className="ms-1.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-700 ring-1 ring-slate-200/80">
											{files.length}
										</span>
									</p>
									<button
										type="button"
										onClick={clearFiles}
										disabled={busy}
										className="text-[11px] font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50"
									>
										{t.clearFiles}
									</button>
								</div>
								<ul className="max-h-[220px] divide-y divide-slate-100 overflow-y-auto">
									{files.map((item, index) => {
										const fullName = audioDisplayName(item, index, t.audioLabel);
										const shortName = shortSelectedFileLabel(fullName, index, t.audioLabel);
										const active = busy && batchIndex === index + 1;
										return (
											<li
												key={`${fileKey(item)}-${index}`}
												className={`flex h-9 items-center gap-2 px-2.5 transition-colors ${
													active ? 'bg-[#eef2ff]' : 'hover:bg-slate-50/90'
												}`}
											>
												{previewUrls[index] ? (
													<div className="w-[132px] shrink-0 sm:w-[148px]">
														<TranscriptVoicePlayer
															variant="list"
															src={previewUrls[index]}
															seed={item.name || String(index)}
														/>
													</div>
												) : (
													<span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[#4f46e5]">
														<FileAudio className="size-3" />
													</span>
												)}
												<p
													className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-700"
													title={fullName}
												>
													{shortName}
												</p>
												<span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-400">
													{formatSelectedFileSize(item.size)}
												</span>
												<button
													type="button"
													onClick={() => removeFile(index)}
													disabled={busy}
													className="grid size-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-red-600 disabled:opacity-50"
													aria-label={t.removeFile}
												>
													<X className="size-3.5" />
												</button>
											</li>
										);
									})}
								</ul>
							</div>
						)}

						<div className="mt-4 grid gap-3 sm:grid-cols-2">
							<label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
								{t.language}
								<WaCustomSelect
									value={language}
									onChange={setLanguage}
									disabled={busy || recording}
									ariaLabel={t.language}
									options={languageOptions}
									buttonClassName="!h-11 !rounded-xl !px-3 !text-sm !font-semibold normal-case text-slate-800"
								/>
							</label>
							<label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
								{t.chunkLength}
								<WaCustomSelect
									value={chunkSeconds}
									onChange={selectChunkSeconds}
									disabled={busy || recording}
									ariaLabel={t.chunkLength}
									options={chunkOptions}
									buttonClassName="!h-11 !rounded-xl !px-3 !text-sm !font-semibold normal-case text-slate-800"
								/>
 							</label>
						</div>

						{busy && (
							<div className="mt-5 rounded-xl border border-[#c7d2fe] bg-[#eef2ff] p-4">
								<div className="flex items-center justify-between text-sm font-bold text-[#3730a3]">
									<span className="flex items-center gap-2">
										<LoaderCircle className="size-4 animate-spin" />
										{chunkProgress.total > 1
											? t.chunkProgress
												.replace('{current}', String(chunkProgress.current || 1))
												.replace('{total}', String(chunkProgress.total))
											: status === 'uploading'
												? t.uploading
												: {
														groq: t.groqProcessing,
														deepgram: t.deepgramProcessing,
														assemblyai: t.assemblyProcessing,
														local: t.localProcessing,
													}[provider]}
									</span>
									<span>
										{status === 'uploading'
											? `${progress}%`
											: `${t.elapsed}: ${formatTime(processingElapsed)}`}
									</span>
								</div>
								{batchTotal > 1 && (
									<p className="mt-2 text-xs font-bold text-[#4338ca]">
										{t.batchProgress
											.replace('{current}', String(batchIndex))
											.replace('{total}', String(batchTotal))}
										{files[batchIndex - 1]
											? ` · ${audioDisplayName(files[batchIndex - 1], batchIndex - 1, t.audioLabel)}`
											: ''}
									</p>
								)}
								<div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
									<div
										className={`h-full rounded-full transition-all ${status === 'processing' ? 'w-full animate-pulse' : ''}`}
										style={{
											background: STUDIO.gradient,
											...(status === 'uploading' ? { width: `${progress}%` } : null),
										}}
									/>
								</div>
							</div>
						)}

						<Button
							size="lg"
							className="mt-5 w-full border-0 text-white hover:opacity-95"
							style={{ background: STUDIO.gradient, boxShadow: STUDIO.shadow3dPrimary }}
							disabled={!files.length || busy || recording}
							onClick={transcribe}
						>
							{busy ? <LoaderCircle className="animate-spin" /> : <AudioLines />}
							{t.transcribe}
							{files.length > 1 ? ` (${files.length})` : ''}
						</Button>
					</section>

					{result && (
						<section className={panelClass}>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
									<span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
										<Check className="size-4" />
									</span>
									{t.transcript}
								</h2>
								<div className="flex flex-wrap gap-2">
									<Button size="sm" variant="outline" onClick={copyTranscript}><Clipboard />{t.copy}</Button>
									<Button size="sm" variant="outline" onClick={downloadTranscript}><Download />{t.download}</Button>
								</div>
							</div>

							<div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
								{[
									[
										t.method,
										PROVIDERS.find(item => item.id === result.provider)?.name ||
											'Local faster-whisper Base',
									],
									[t.words, liveCounts.words],
									[t.characters, liveCounts.characters],
									[t.duration, formatTime(result.durationSeconds)],
									[t.processingTime, formatTime(result.processingTimeSeconds)],
									[t.detected, result.detectedLanguage?.toUpperCase() || '—'],
								].map(([label, value]) => (
									<div key={label} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
										<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
										<p className="mt-1 truncate text-base font-bold text-slate-900">{value}</p>
									</div>
								))}
							</div>

							<textarea
								value={transcriptText}
								onChange={event => setTranscriptText(event.target.value)}
								className="mt-4 min-h-72 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-800 outline-none focus:border-[#6366F1] focus:bg-white focus:ring-2 focus:ring-[#6366F1]/20"
							/>
							<div className="mt-3 flex justify-end">
								<Button
									onClick={saveTranscript}
									disabled={saving || transcriptText === result.text}
									className="border-0 text-white"
									style={{ background: STUDIO.gradient }}
								>
									{saving ? <LoaderCircle className="animate-spin" /> : <Save />}
									{t.save}
								</Button>
							</div>

							<TranscriptionAiPanel
								key={result.id}
								locale={locale}
								transcriptionId={result.id}
								transcriptText={transcriptText}
								onApplyText={text => {
									setTranscriptText(text);
								}}
								onResultUpdated={updated => {
									if (!updated) return;
									setResult(updated);
									if (typeof updated.text === 'string') {
										setTranscriptText(updated.text);
									}
									setHistory(current =>
										current.map(item => (item.id === updated.id ? updated : item)),
									);
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
								initialMemorize={result.memorizePayload || null}
								initialSummary={result.summaryPayload || null}
							/>
						</section>
					)}
				</div>

				<aside className="min-w-0">
					<section className={`${panelClass} xl:sticky xl:top-4`}>
						<h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
							<span className="grid size-8 place-items-center rounded-lg bg-[#eef2ff] text-[#4f46e5]">
								<History className="size-4" />
							</span>
							{t.history}
						</h2>
						<div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pe-1">
							{historyLoading ? (
								<div className="grid min-h-32 place-items-center"><LoaderCircle className="animate-spin text-slate-400" /></div>
							) : history.length === 0 ? (
								<div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{t.noHistory}</div>
							) : history.map(item => (
								<div
									key={item.id}
									className={`group rounded-xl border p-3 transition hover:border-[#c7d2fe] ${
										result?.id === item.id ? 'border-[#a5b4fc] bg-[#eef2ff]' : 'border-slate-200 bg-slate-50/70'
									}`}
								>
									<button
										type="button"
										className="w-full text-start"
										onClick={() => {
											setResult(item);
											setTranscriptText(item.text || '');
										}}
									>
										<div className="flex items-center justify-between gap-2">
											<p className="truncate text-sm font-bold text-slate-800">{item.originalFileName}</p>
											<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 ring-1 ring-slate-200">
												{PROVIDERS.find(providerItem => providerItem.id === item.provider)?.name ||
													'Local'}
											</span>
										</div>
										<p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.text || '—'}</p>
										<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
											<span className="flex items-center gap-1"><Clock3 className="size-3" />{formatTime(item.durationSeconds)}</span>
											<span className="flex items-center gap-1" title={t.processingTime}>
												<LoaderCircle className="size-3" />
												{t.processingTime}: {formatTime(item.processingTimeSeconds)}
											</span>
											<span>{new Date(item.createdAt).toLocaleDateString(locale)}</span>
											{item.enhancedText ? (
												<span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
													AI
												</span>
											) : null}
											{item.memorizePayload ? (
												<span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
													Memo
												</span>
											) : null}
										</div>
									</button>
									<div className="mt-2 flex justify-end">
										<button
											type="button"
											onClick={() => deleteTranscript(item.id)}
											className="rounded-lg p-1.5 text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 xl:opacity-0 xl:group-hover:opacity-100"
											aria-label={t.cancel}
										>
											<Trash2 className="size-4" />
										</button>
									</div>
								</div>
							))}
						</div>
						<button type="button" onClick={loadHistory} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
							<RotateCcw className="size-3.5" />
							{t.history}
						</button>
					</section>
				</aside>
			</div>

			{showCredentialModal && canManageProviderKey && providerMeta.keyUrl && (
				<div
					className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
					onMouseDown={event => {
						if (event.target === event.currentTarget) setShowCredentialModal(false);
					}}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="provider-credentials-title"
						className="w-full max-w-lg rounded-2xl border bg-white p-5 shadow-2xl md:p-6"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 id="provider-credentials-title" className="text-lg font-black text-slate-900">
									{t.providerSettings} · {providerMeta.name}
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									{providerCredential?.configured
										? `${t.groqKeyConfigured} ••••${providerCredential.lastFour}`
										: t.groqKeyMissing}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowCredentialModal(false)}
								className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
								aria-label={t.close}
							>
								<X className="size-5" />
							</button>
						</div>

						<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
							<p className="font-black">{t.groqStepsTitle}</p>
							<ol className="mt-2 list-decimal space-y-1 ps-5 text-xs leading-5">
								<li>{t.groqStep1}</li>
								<li>{t.groqStep2}</li>
								<li>{t.groqStep3}</li>
							</ol>
						</div>

						<label htmlFor="groq-api-key" className="mt-5 block text-sm font-bold text-slate-700">
							{t.groqKeyLabel}
						</label>
						<input
							id="groq-api-key"
							type="password"
							value={providerApiKey}
							onChange={event => setProviderApiKey(event.target.value)}
							placeholder={
								providerCredential?.configured
									? `••••••••••••${providerCredential.lastFour}`
									: t.groqKeyPlaceholder
							}
							autoComplete="new-password"
							maxLength={512}
							autoFocus
							className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-amber-600 focus:bg-white"
						/>

						<div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
							<a
								href={providerMeta.keyUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 px-4 text-xs font-bold text-amber-900 hover:bg-amber-50"
							>
								{t.groqGetKey}
							</a>
							<Button
								type="button"
								onClick={saveProviderKey}
								disabled={!providerApiKey.trim() || savingProviderKey}
								className="bg-amber-900 hover:bg-amber-800"
							>
								{savingProviderKey && <LoaderCircle className="animate-spin" />}
								{t.groqKeySave}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
