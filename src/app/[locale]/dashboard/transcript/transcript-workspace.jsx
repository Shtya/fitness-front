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
import {
	ACCEPTED_TRANSCRIPTION_EXTENSIONS as ACCEPTED_EXTENSIONS,
	CLOUD_TRANSCRIPTION_PROVIDER_IDS as CLOUD_PROVIDER_IDS,
	createTranscription,
	getStoredTranscriptionProvider,
	GROQ_FREE_MAX_FILE_SIZE,
	MAX_TRANSCRIPTION_FILE_SIZE as MAX_FILE_SIZE,
	storeTranscriptionProvider,
	TRANSCRIPTION_ACCEPT as ACCEPT,
	TRANSCRIPTION_PROVIDERS as PROVIDERS,
} from './transcription-client';

const copy = {
	en: {
		title: 'Transcript',
		subtitle: 'Turn uploads, microphone recordings, or meeting audio into editable text using the processing method you choose.',
		upload: 'Upload audio',
		microphone: 'Microphone',
		meeting: 'Meeting / tab',
		dropTitle: 'Drop an audio file here',
		dropHint: 'MP3, WAV, M4A, WEBM, OGG or MP4 — up to 500 MB',
		browse: 'Browse files',
		meetingHint: 'Records your microphone and the audio from the browser tab you share.',
		micHint: 'Record directly from your microphone.',
		start: 'Start recording',
		pause: 'Pause',
		resume: 'Resume',
		stop: 'Stop',
		cancel: 'Cancel',
		language: 'Language',
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
		fileRequired: 'Choose or record an audio file first.',
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
		subtitle: 'حوّل الملفات أو تسجيل الميكروفون أو صوت الاجتماع إلى نص قابل للتعديل باستخدام طريقة المعالجة التي تختارها.',
		upload: 'رفع ملف صوتي',
		microphone: 'الميكروفون',
		meeting: 'اجتماع / تبويب',
		dropTitle: 'اسحب الملف الصوتي هنا',
		dropHint: 'MP3 أو WAV أو M4A أو WEBM أو OGG أو MP4 — حتى 500 ميجابايت',
		browse: 'اختيار ملف',
		meetingHint: 'يسجل الميكروفون مع صوت تبويب المتصفح الذي تقوم بمشاركته.',
		micHint: 'سجل مباشرة من الميكروفون.',
		start: 'بدء التسجيل',
		pause: 'إيقاف مؤقت',
		resume: 'استكمال',
		stop: 'إنهاء',
		cancel: 'إلغاء',
		language: 'اللغة',
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
		fileRequired: 'اختر أو سجل ملفًا صوتيًا أولًا.',
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
	const [file, setFile] = useState(null);
	const [audioUrl, setAudioUrl] = useState('');
	const [provider, setProvider] = useState('local');
	const [language, setLanguage] = useState('auto');
	const [customVocabulary, setCustomVocabulary] = useState('');
	const [recordingState, setRecordingState] = useState('idle');
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [status, setStatus] = useState('idle');
	const [progress, setProgress] = useState(0);
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
		if (!file) {
			setAudioUrl('');
			return;
		}
		const nextUrl = URL.createObjectURL(file);
		setAudioUrl(nextUrl);
		return () => URL.revokeObjectURL(nextUrl);
	}, [file]);

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

	const selectFile = useCallback(
		selected => {
			if (!selected) return;
			const extension = selected.name.split('.').pop()?.toLowerCase();
			if (!ACCEPTED_EXTENSIONS.includes(extension)) {
				toast.error(t.unsupported);
				return;
			}
			if (selected.size > MAX_FILE_SIZE) {
				toast.error(t.tooLarge);
				return;
			}
			setFile(selected);
			setResult(null);
			setTranscriptText('');
			setStatus('idle');
			setProgress(0);
		},
		[t],
	);

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
		setFile(null);
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
					selectFile(new File([blob], `recording-${Date.now()}.webm`, { type }));
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
		if (!file) {
			toast.error(t.fileRequired);
			return;
		}
		if (provider === 'groq' && file.size > GROQ_FREE_MAX_FILE_SIZE) {
			toast.error(t.groqTooLarge);
			return;
		}
		setStatus('uploading');
		setProgress(0);
		setProcessingElapsed(0);
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
			setResult(data);
			setTranscriptText(data.text || '');
			setStatus('done');
			setHistory(current => [data, ...current.filter(item => item.id !== data.id)]);
		} catch (error) {
			setStatus('error');
			toast.error(error.response?.data?.message || t.failed);
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

	return (
		<div className="mx-auto w-full max-w-[1500px] space-y-5 pb-10" dir={isArabic ? 'rtl' : 'ltr'}>
			<header className="overflow-hidden rounded-2xl border border-[var(--color-primary-200)] bg-white/90 p-5 shadow-sm md:p-7">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-black text-slate-900 md:text-3xl">{t.title}</h1>
						<div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-50)] px-3 py-1 text-xs font-bold text-[var(--color-primary-700)]">
							<AudioLines className="size-4" />
							{providerMeta.name} · {providerMeta.score}%
						</div>
					</div>
					<div className="flex items-center gap-2">
						<label className="sr-only" htmlFor="header-transcription-provider">{t.method}</label>
						<select
							id="header-transcription-provider"
							value={provider}
							onChange={event => selectProvider(event.target.value)}
							disabled={busy}
							title={t.qualityEstimate}
							className="h-11 rounded-xl border bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-primary-400)]"
						>
							{PROVIDERS.map(item => (
								<option key={item.id} value={item.id}>
									{item.name} · {item.score}%
								</option>
							))}
						</select>
						{CLOUD_PROVIDER_IDS.includes(provider) && canManageProviderKey && (
							<button
								type="button"
								onClick={() => setShowCredentialModal(true)}
								className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-slate-50 px-3 text-xs font-bold text-slate-600 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
								aria-label={t.providerSettings}
								title={t.providerSettings}
							>
								<KeyRound className="size-5" />
								<span className="hidden lg:inline">{t.groqKeyManage}</span>
							</button>
						)}
					</div>
				</div>
			</header>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,.65fr)]">
				<div className="space-y-5">
					<section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
						<div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1.5">
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
									className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition md:text-sm ${
										mode === value ? 'bg-white text-[var(--color-primary-700)] shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
										selectFile(event.dataTransfer.files?.[0]);
									}}
									className={`flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
										dragging ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]' : 'border-slate-200 bg-slate-50/70'
									}`}
								>
									<div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white text-[var(--color-primary-600)] shadow-sm">
										<UploadCloud className="size-7" />
									</div>
									<h2 className="font-black text-slate-800">{t.dropTitle}</h2>
									<p className="mt-1 text-xs text-slate-500 md:text-sm">{t.dropHint}</p>
									<Button className="mt-5" onClick={() => fileInputRef.current?.click()} disabled={busy}>
										{t.browse}
									</Button>
									<input
										ref={fileInputRef}
										type="file"
										accept={ACCEPT}
										className="hidden"
										onChange={event => selectFile(event.target.files?.[0])}
									/>
								</div>
							) : (
								<div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border bg-slate-50/70 p-6 text-center">
									<div className={`relative mb-4 grid size-20 place-items-center rounded-full ${
										recordingState === 'recording' ? 'bg-red-50 text-red-600' : 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
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
										{!recording && <Button onClick={startRecording}><Mic />{t.start}</Button>}
										{recordingState === 'recording' && <Button variant="outline" onClick={pauseRecording}><Pause />{t.pause}</Button>}
										{recordingState === 'paused' && <Button variant="outline" onClick={resumeRecording}><Play />{t.resume}</Button>}
										{recording && <Button onClick={stopRecording}><Square />{t.stop}</Button>}
										{recording && <Button variant="destructive" onClick={cancelRecording}><X />{t.cancel}</Button>}
									</div>
								</div>
							)}
						</div>

						{file && !recording && (
							<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="flex min-w-0 items-center gap-3">
										<FileAudio className="size-6 shrink-0 text-emerald-600" />
										<div className="min-w-0">
											<p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
											<p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
										</div>
									</div>
									<button type="button" onClick={() => setFile(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600">
										<X className="size-4" />
									</button>
								</div>
								{audioUrl && <audio className="mt-3 h-10 w-full" controls src={audioUrl} />}
							</div>
						)}

						<div className="mt-4 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
							<label className="grid gap-1.5 text-sm font-bold text-slate-700">
								{t.language}
								<select
									value={language}
									onChange={event => setLanguage(event.target.value)}
									disabled={busy || recording}
									className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:border-[var(--color-primary-400)]"
								>
									<option value="auto">{t.auto}</option>
									<option value="ar">{t.arabic}</option>
									<option value="en">{t.english}</option>
								</select>
							</label>
							<label className="grid gap-1.5 text-sm font-bold text-slate-700">
								{t.vocabulary}
								<input
									value={customVocabulary}
									onChange={event => setCustomVocabulary(event.target.value)}
									disabled={busy || recording}
									maxLength={4000}
									placeholder={t.vocabularyHint}
									className="h-11 rounded-xl border bg-white px-3 text-sm font-normal outline-none focus:border-[var(--color-primary-400)]"
								/>
							</label>
						</div>

						{busy && (
							<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
								<div className="flex items-center justify-between text-sm font-bold text-blue-800">
									<span className="flex items-center gap-2">
										<LoaderCircle className="size-4 animate-spin" />
										{status === 'uploading'
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
								<div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
									<div
										className={`h-full rounded-full bg-[var(--color-primary-600)] transition-all ${status === 'processing' ? 'w-full animate-pulse' : ''}`}
										style={status === 'uploading' ? { width: `${progress}%` } : undefined}
									/>
								</div>
							</div>
						)}

						<Button size="lg" className="mt-5 w-full" disabled={!file || busy || recording} onClick={transcribe}>
							{busy ? <LoaderCircle className="animate-spin" /> : <AudioLines />}
							{t.transcribe}
						</Button>
					</section>

					{result && (
						<section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
									<Check className="size-5 text-emerald-600" />
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
									<div key={label} className="rounded-xl border bg-slate-50 p-3">
										<p className="text-[11px] font-bold text-slate-500">{label}</p>
										<p className="mt-1 text-lg font-black text-slate-900">{value}</p>
									</div>
								))}
							</div>

							<textarea
								value={transcriptText}
								onChange={event => setTranscriptText(event.target.value)}
								className="mt-4 min-h-72 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-800 outline-none focus:border-[var(--color-primary-400)] focus:bg-white"
							/>
							<div className="mt-3 flex justify-end">
								<Button onClick={saveTranscript} disabled={saving || transcriptText === result.text}>
									{saving ? <LoaderCircle className="animate-spin" /> : <Save />}
									{t.save}
								</Button>
							</div>
						</section>
					)}
				</div>

				<aside className="min-w-0">
					<section className="rounded-2xl border bg-white p-4 shadow-sm xl:sticky xl:top-4">
						<h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
							<History className="size-5 text-[var(--color-primary-600)]" />
							{t.history}
						</h2>
						<div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pe-1">
							{historyLoading ? (
								<div className="grid min-h-32 place-items-center"><LoaderCircle className="animate-spin text-slate-400" /></div>
							) : history.length === 0 ? (
								<div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">{t.noHistory}</div>
							) : history.map(item => (
								<div
									key={item.id}
									className={`group rounded-xl border p-3 transition hover:border-[var(--color-primary-300)] ${
										result?.id === item.id ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)]' : 'bg-slate-50/60'
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
											<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
												{PROVIDERS.find(providerItem => providerItem.id === item.provider)?.name ||
													'Local'}
											</span>
										</div>
										<p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.text || '—'}</p>
										<div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
											<span className="flex items-center gap-1"><Clock3 className="size-3" />{formatTime(item.durationSeconds)}</span>
											<span className="flex items-center gap-1" title={t.processingTime}>
												<LoaderCircle className="size-3" />
												{t.processingTime}: {formatTime(item.processingTimeSeconds)}
											</span>
											<span>{new Date(item.createdAt).toLocaleDateString(locale)}</span>
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
						<button type="button" onClick={loadHistory} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg p-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
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
