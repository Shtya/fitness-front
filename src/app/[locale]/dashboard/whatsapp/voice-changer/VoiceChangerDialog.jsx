'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	AudioLines,
	Check,
	ChevronDown,
	ExternalLink,
	KeyRound,
	Loader2,
	Mic,
	Pause,
	Play,
	Sparkles,
	Square,
	Trash2,
	Upload,
	UserRound,
	Wand2,
	Waves,
	X,
	Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { WaCustomSelect } from '../WaCustomSelect';
import {
	fetchVoiceChangerSettings,
	readVoiceChangerError,
	removeVoiceChangerCredential,
	saveVoiceChangerCredential,
	saveVoiceChangerSettings,
	cloneVoiceFromSamples,
	transformVoiceNote,
} from './voice-changer-client';

const FFMPEG_PRESETS = [
	{ id: 'deeper', en: 'Deeper', ar: 'أعمق', hintEn: 'Lower and heavier', hintAr: 'أثقل وأعمق' },
	{ id: 'male', en: 'Masculine', ar: 'أخشن', hintEn: 'Slightly lower pitch', hintAr: 'درجة أخشن شوية' },
	{ id: 'female', en: 'Feminine', ar: 'أنعم', hintEn: 'Softer and higher', hintAr: 'أنعم وأحدّ' },
	{ id: 'higher', en: 'Higher', ar: 'أحدّ', hintEn: 'Bright and sharp', hintAr: 'أحدّ وأوضح' },
	{ id: 'child', en: 'Younger', ar: 'أصغر', hintEn: 'Younger voice', hintAr: 'صوت أصغر سناً' },
	{ id: 'giant', en: 'Giant', ar: 'عملاق', hintEn: 'Very deep', hintAr: 'عميق جداً' },
	{ id: 'robot', en: 'Robot', ar: 'روبوت', hintEn: 'Metallic effect', hintAr: 'تأثير معدني' },
	{ id: 'custom', en: 'Custom', ar: 'مخصص', hintEn: 'Pick the exact pitch', hintAr: 'اختَر الدرجة بنفسك' },
];

const RECORD_SECONDS = 4;
const CLONE_SAMPLE_SECONDS = 30;

const PROVIDER_ICONS = {
	off: Mic,
	ffmpeg: Wand2,
	elevenlabs: AudioLines,
	clone: UserRound,
	groq: Zap,
	openai: Sparkles,
	huggingface: Waves,
	cartesia: AudioLines,
};

const copy = {
	en: {
		title: 'Voice note',
		subtitle: 'Saved until you change it from the waves icon.',
		disclaimer: 'Only use a voice you have permission to change.',
		free: 'Free',
		needsKey: 'Key',
		keyAdded: 'Added',
		preset: 'Effect',
		customPitch: 'Pitch (semitones)',
		voice: 'Target voice',
		apiKey: 'API key',
		apiKeySaved: 'Key',
		fromEnv: 'Server key',
		fromStudio: 'Studio key',
		fromTranscript: 'Transcript key',
		getKey: 'Get API key',
		saveKey: 'Save',
		replaceKey: 'Change',
		removeKey: 'Remove',
		newKey: 'Paste a new key',
		cancelEdit: 'Cancel',
		preview: '4s sample',
		record: 'Try',
		reRecord: 'Re-record',
		stop: 'Stop',
		speakNow: 'Speak now',
		listening: 'Applying effect…',
		save: 'Save',
		cancel: 'Close',
		saved: 'Voice settings saved',
		keySaved: 'API key saved',
		needKey: 'Save an API key first, or pick the free pitch changer.',
		pasteKeyHint: 'Paste the API key to use this model. You can open the card, but conversion stays locked until the key is saved.',
		micDenied: 'Microphone permission was denied',
		previewFailed: 'Could not convert the sample',
		offHint: 'Mic recordings will be sent as your real voice. No processing.',
		tryHint: 'Record a sample, then tap play to hear it. Changing a voice never autoplays.',
		sampleReady: 'Sample ready. Tap play to listen. Change the option, then tap play again.',
		fallbackKeyHint:
			'This key is reused from Transcript or AI Studio. Changing it here updates the same saved key.',
		cloneName: 'Voice name',
		cloneNamePh: 'Coach Ahmed',
		cloneHint:
			'Upload 3–10 clean clips totaling about 60 seconds. Instant Voice Cloning needs a Starter (or higher) ElevenLabs key with Voices enabled. Restricted keys cannot create clones.',
		clonePermissionHint:
			'If cloning fails, keep this panel open. Check elevenlabs.io → Settings → API Keys → this key: Restricted off, Voices / Instant Voice Cloning on. Short clips also fail — add more samples.',
		cloneUpload: 'Upload samples',
		cloneRecord: 'Record 30s',
		cloneConsent: 'I have permission to clone this voice.',
		cloneCreate: 'Create clone',
		cloneCreating: 'Analyzing tone…',
		cloneReady: 'Clone ready. Record a WhatsApp note and it will use this voice.',
		cloneNeedSamples: 'Add at least one sample first.',
		cloneNeedConsent: 'Confirm permission before cloning.',
		cloneErrorKeepOpen: 'Clone failed. This panel stays open so you can fix the samples or key.',
		cloneSaved: 'Reference voice cloned',
	},
	ar: {
		title: 'الرسالة الصوتية',
		subtitle: 'الإعداد محفوظ لحد ما تغيّره من أيقونة الموجات.',
		disclaimer: 'غيّر صوتك أنت أو صوت مصرّح لك به.',
		free: 'مجاني',
		needsKey: 'مفتاح',
		keyAdded: 'مضاف',
		preset: 'التأثير',
		customPitch: 'الدرجة (نصف تون)',
		voice: 'الصوت المستهدف',
		apiKey: 'مفتاح API',
		apiKeySaved: 'مفتاح',
		fromEnv: 'مفتاح السيرفر',
		fromStudio: 'مفتاح الاستوديو',
		fromTranscript: 'مفتاح التفريغ',
		getKey: 'جيب المفتاح',
		saveKey: 'حفظ',
		replaceKey: 'تغيير',
		removeKey: 'مسح',
		newKey: 'الصق مفتاح جديد',
		cancelEdit: 'إلغاء',
		preview: 'عينة 4 ثواني',
		record: 'جرّب',
		reRecord: 'إعادة',
		stop: 'إيقاف',
		speakNow: 'اتكلم دلوقتي',
		listening: 'بيطبّق التأثير…',
		save: 'حفظ',
		cancel: 'إغلاق',
		saved: 'تم حفظ إعدادات الصوت',
		keySaved: 'تم حفظ المفتاح',
		needKey: 'احفظ مفتاح الـ API أولاً، أو اختار تغيير الدرجة المجاني.',
		pasteKeyHint: 'الصق مفتاح الـ API عشان تستخدم الموديل. تقدر تفتح الكارت، والتحويل مقفول لحد ما تحفظ المفتاح.',
		micDenied: 'الإذن للمايك مرفوض',
		previewFailed: 'تحويل العينة فشل',
		offHint: 'التسجيل هيتبعت بصوتك الحقيقي من غير أي معالجة.',
		tryHint: 'سجّل عينة، وبعدين اضغط تشغيل عشان تسمع. تغيير الصوت مش بيشغّل لوحده.',
		sampleReady: 'العينة جاهزة. اضغط تشغيل عشان تسمع. لو غيّرت الخيار، اضغط تشغيل تاني.',
		fallbackKeyHint:
			'المفتاح ده مستخدم من التفريغ أو استوديو الذكاء. تغييره هنا هيحدّث نفس المفتاح المحفوظ.',
		cloneName: 'اسم الصوت',
		cloneNamePh: 'الكوتش أحمد',
		cloneHint:
			'ارفع من 3 إلى 10 تسجيلات واضحة مجموعها حوالي 60 ثانية. Instant Voice Cloning يحتاج خطة Starter أو أعلى مع تفعيل Voices. المفتاح المحدود مش بينشئ استنساخاً.',
		clonePermissionHint:
			'لو الاستنساخ فشل، سيّب النافذة مفتوحة. راجع elevenlabs.io → Settings → API Keys → المفتاح ده: Restricted مقفول، وVoices / Instant Voice Cloning شغال. العيّنات القصيرة كمان بتفشل — ضيف تسجيلات أطول.',
		cloneUpload: 'رفع عيّنات',
		cloneRecord: 'سجّل 30 ثانية',
		cloneConsent: 'أنا مصرّح لي باستنساخ الصوت ده.',
		cloneCreate: 'إنشاء الاستنساخ',
		cloneCreating: 'بيحلّل النبرة…',
		cloneReady: 'الاستنساخ جاهز. سجّل رسالة واتساب وهيتحول للصوت ده.',
		cloneNeedSamples: 'ضيف عيّنة واحدة على الأقل.',
		cloneNeedConsent: 'أكّد التصريح قبل الاستنساخ.',
		cloneErrorKeepOpen: 'الاستنساخ فشل. النافذة هتفضل مفتوحة عشان تعدّل العيّنات أو المفتاح.',
		cloneSaved: 'تم استنساخ الصوت المرجعي',
	},
};

function formatClock(seconds) {
	const value = Math.max(0, Math.floor(Number(seconds) || 0));
	if (!Number.isFinite(value)) return '0:00';
	return `0:${String(value).padStart(2, '0')}`;
}

export default function VoiceChangerDialog({ open, onOpenChange, locale = 'en', onSaved }) {
	const ar = locale === 'ar';
	const t = ar ? copy.ar : copy.en;
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState(null);
	const [provider, setProvider] = useState('off');
	const [preset, setPreset] = useState('deeper');
	const [pitchSemitones, setPitchSemitones] = useState(-6);
	const [voiceId, setVoiceId] = useState('');
	const [apiKeyDraft, setApiKeyDraft] = useState('');
	const [editingKey, setEditingKey] = useState(false);
	const [savingKey, setSavingKey] = useState(false);
	const [cloneName, setCloneName] = useState('');
	const [cloneSamples, setCloneSamples] = useState([]);
	const [cloneConsent, setCloneConsent] = useState(false);
	const [cloneError, setCloneError] = useState('');
	const [cloning, setCloning] = useState(false);
	const [recording, setRecording] = useState(false);
	const [recordLeft, setRecordLeft] = useState(RECORD_SECONDS);
	const [converting, setConverting] = useState(false);
	const [previewUrl, setPreviewUrl] = useState('');
	const [hasSample, setHasSample] = useState(false);
	const [sampleNonce, setSampleNonce] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [playTime, setPlayTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const recorderRef = useRef(null);
	const chunksRef = useRef([]);
	const streamRef = useRef(null);
	const listRef = useRef(null);
	const sourceFileRef = useRef(null);
	const convertSeqRef = useRef(0);
	const convertedSigRef = useRef('');
	const playWhenReadyRef = useRef(false);
	const audioRef = useRef(null);
	const recordTimerRef = useRef(null);
	const cloneFileRef = useRef(null);
	const cloneCaptureRef = useRef(false);
	const snapshotRef = useRef({});

	const catalog = settings?.catalog || [];
	const selected = catalog.find(item => item.id === provider) || catalog[0];
	const credential = settings?.credentials?.[provider];
	const providerKeySaved = (id = provider) => Boolean(settings?.credentials?.[id]?.configured);
	const busy = cloning || converting || recording || saving || savingKey;
	const previewSignature = () =>
		`${provider}|${preset}|${pitchSemitones}|${voiceId || ''}|${sampleNonce}`;
	snapshotRef.current = {
		provider,
		preset,
		pitchSemitones,
		voiceId,
		apiKey: apiKeyDraft.trim() || undefined,
	};

	useEffect(() => {
		if (!open) return undefined;
		let cancelled = false;
		setLoading(true);
		fetchVoiceChangerSettings()
			.then(data => {
				if (cancelled) return;
				setSettings(data);
				setProvider(data.provider || 'off');
				setPreset(data.preset || 'deeper');
				setPitchSemitones(Number(data.pitchSemitones) || -6);
				const providerVoices = data.catalog?.find(item => item.id === data.provider)?.voices || [];
				const savedVoice = data.voiceId || '';
				setVoiceId(
					(savedVoice && providerVoices.some(voice => voice.id === savedVoice) && savedVoice) ||
						providerVoices[0]?.id ||
						'',
				);
				setApiKeyDraft('');
				setEditingKey(false);
				setCloneError('');
			})
			.catch(error => toast.error(error.response?.data?.message || 'Could not load voice settings'))
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open]);

	useEffect(() => {
		if (open) return undefined;
		convertSeqRef.current += 1;
		sourceFileRef.current = null;
		if (recordTimerRef.current) clearInterval(recordTimerRef.current);
		streamRef.current?.getTracks().forEach(track => track.stop());
		setHasSample(false);
		setRecording(false);
		setConverting(false);
		setPlaying(false);
		playWhenReadyRef.current = false;
		convertedSigRef.current = '';
		setPlayTime(0);
		setDuration(0);
		setPreviewUrl('');
		return undefined;
	}, [open]);

	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	useEffect(() => {
		if (!open || loading) return undefined;
		const card = listRef.current?.querySelector(`[data-provider="${provider}"]`);
		card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		return undefined;
	}, [loading, open, provider]);

	useEffect(() => {
		if (!open) return;
		audioRef.current?.pause();
		setPlaying(false);
		playWhenReadyRef.current = false;
	}, [provider, preset, pitchSemitones, voiceId, open]);

	useEffect(() => {
		const voices = selected?.voices || [];
		if (!voices.length) return;
		if (!voices.some(voice => voice.id === voiceId)) setVoiceId(voices[0].id);
	}, [selected, voiceId]);

	useEffect(() => {
		if (!open || !hasSample || !sourceFileRef.current) return undefined;
		if (selected?.needsKey && !providerKeySaved() && !apiKeyDraft.trim()) return undefined;
		if (provider === 'clone' && !(selected?.voices || []).length) return undefined;
		if (selected?.needsKey) return undefined;
		const timer = setTimeout(() => {
			void convertPreview({ playAfter: false });
		}, 50);
		return () => clearTimeout(timer);
		// Convert only after a new recording, never when switching tabs or voices.
	}, [open, hasSample, sampleNonce]);

	useEffect(() => {
		const el = audioRef.current;
		if (!el || !previewUrl || converting) return undefined;
		if (!playWhenReadyRef.current) return undefined;
		const play = () => {
			playWhenReadyRef.current = false;
			el.currentTime = 0;
			el.play().catch(() => setPlaying(false));
		};
		if (el.readyState >= 3) play();
		else el.addEventListener('canplaythrough', play, { once: true });
		return () => el.removeEventListener('canplaythrough', play);
	}, [previewUrl, converting]);

	const convertPreview = async ({ playAfter = false } = {}) => {
		const file = sourceFileRef.current;
		const options = snapshotRef.current;
		if (!file) return false;
		const item = catalog.find(entry => entry.id === options.provider) || selected;
		if (item?.needsKey && !providerKeySaved(options.provider) && !options.apiKey) {
			if (playAfter) toast.error(t.needKey);
			return false;
		}
		if (options.provider === 'clone' && !(item?.voices || []).length) return false;
		const seq = ++convertSeqRef.current;
		setConverting(true);
		audioRef.current?.pause();
		setPlaying(false);
		try {
			const converted =
				options.provider === 'off' ? file : await transformVoiceNote(file, options);
			if (seq !== convertSeqRef.current) return false;
			playWhenReadyRef.current = Boolean(playAfter);
			setPreviewUrl(URL.createObjectURL(converted));
			setPlayTime(0);
			convertedSigRef.current = `${options.provider}|${options.preset}|${options.pitchSemitones}|${options.voiceId || ''}|${sampleNonce}`;
			return true;
		} catch (error) {
			playWhenReadyRef.current = false;
			if (seq !== convertSeqRef.current) return false;
			toast.error((await readVoiceChangerError(error, locale)) || t.previewFailed);
			return false;
		} finally {
			if (seq === convertSeqRef.current) setConverting(false);
		}
	};

	const applySettings = data => {
		setSettings(data);
		setProvider(data.provider || provider);
		const providerVoices = data.catalog?.find(item => item.id === (data.provider || provider))?.voices || [];
		const nextVoice = data.voiceId || voiceId;
		setVoiceId(
			(nextVoice && providerVoices.some(voice => voice.id === nextVoice) && nextVoice) ||
				providerVoices[0]?.id ||
				nextVoice ||
				'',
		);
	};

	const selectProvider = item => {
		audioRef.current?.pause();
		setPlaying(false);
		playWhenReadyRef.current = false;
		convertedSigRef.current = '';
		setPreviewUrl('');
		setProvider(item.id);
		setVoiceId(item.voices?.[0]?.id || '');
		setApiKeyDraft('');
		setEditingKey(false);
		setCloneError('');
	};

	const stopPreviewRecording = () => {
		if (recordTimerRef.current) clearInterval(recordTimerRef.current);
		if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
	};

	const startPreviewRecording = async (asCloneSample = false) => {
		if (recording || converting || cloning) return;
		if (selected?.needsKey && !providerKeySaved() && !asCloneSample) {
			toast.error(t.needKey);
			return;
		}
		cloneCaptureRef.current = Boolean(asCloneSample);
		const seconds = asCloneSample ? CLONE_SAMPLE_SECONDS : RECORD_SECONDS;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(type =>
				MediaRecorder.isTypeSupported(type),
			);
			const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
			chunksRef.current = [];
			recorder.ondataavailable = event => {
				if (event.data?.size) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				if (recordTimerRef.current) clearInterval(recordTimerRef.current);
				stream.getTracks().forEach(track => track.stop());
				streamRef.current = null;
				setRecording(false);
				const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
				if (!blob.size) return;
				const file = new File([blob], asCloneSample ? `clone-sample-${Date.now()}.webm` : 'voice-4s.webm', {
					type: blob.type,
				});
				if (cloneCaptureRef.current) {
					setCloneSamples(current => [...current, file].slice(0, 10));
					cloneCaptureRef.current = false;
					return;
				}
				sourceFileRef.current = file;
				setHasSample(true);
				setSampleNonce(value => value + 1);
			};
			recorderRef.current = recorder;
			setRecordLeft(seconds);
			const startedAt = Date.now();
			recordTimerRef.current = setInterval(() => {
				const left = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
				setRecordLeft(left);
			}, 120);
			recorder.start(200);
			setRecording(true);
			setTimeout(() => {
				if (recorder.state === 'recording') recorder.stop();
			}, seconds * 1000);
		} catch {
			toast.error(t.micDenied);
		}
	};

	const togglePlayback = () => {
		if (!hasSample || converting) return;
		if (selected?.needsKey && !providerKeySaved() && !apiKeyDraft.trim()) {
			toast.error(t.needKey);
			return;
		}
		const el = audioRef.current;
		const sig = previewSignature();
		if (!previewUrl || convertedSigRef.current !== sig) {
			playWhenReadyRef.current = true;
			void convertPreview({ playAfter: true });
			return;
		}
		if (!el) return;
		if (el.paused) el.play().catch(() => undefined);
		else el.pause();
	};

	const seekPlayback = event => {
		const el = audioRef.current;
		if (!el || !duration) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
		el.currentTime = (ar ? 1 - ratio : ratio) * duration;
	};

	const saveKey = async () => {
		if (!selected?.needsKey || !apiKeyDraft.trim()) return;
		setSavingKey(true);
		try {
			const data = await saveVoiceChangerCredential(provider, apiKeyDraft.trim());
			applySettings(data);
			setApiKeyDraft('');
			setEditingKey(false);
			toast.success(t.keySaved);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not save API key');
		} finally {
			setSavingKey(false);
		}
	};

	const removeKey = async () => {
		if (!selected?.needsKey) return;
		setSavingKey(true);
		try {
			const data = await removeVoiceChangerCredential(provider);
			applySettings(data);
			toast.success(t.removeKey);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not remove API key');
		} finally {
			setSavingKey(false);
		}
	};

	const submitClone = async () => {
		if (!cloneName.trim()) {
			toast.error(t.cloneName);
			return;
		}
		if (!cloneSamples.length) {
			toast.error(t.cloneNeedSamples);
			return;
		}
		if (!cloneConsent) {
			toast.error(t.cloneNeedConsent);
			return;
		}
		setCloning(true);
		setCloneError('');
		try {
			const data = await cloneVoiceFromSamples({
				name: cloneName.trim(),
				files: cloneSamples,
				consent: true,
			});
			applySettings(data);
			if (data.voiceId) setVoiceId(data.voiceId);
			setCloneSamples([]);
			setCloneConsent(false);
			setCloneError('');
			toast.success(t.cloneSaved);
		} catch (error) {
			const message =
				(await readVoiceChangerError(error, locale)) || (ar ? 'فشل استنساخ الصوت' : 'Could not clone this voice');
			setCloneError(message);
			toast.error(message);
		} finally {
			setCloning(false);
		}
	};

	const save = async () => {
		if (selected?.needsKey && !providerKeySaved() && !apiKeyDraft.trim()) {
			toast.error(t.needKey);
			return;
		}
		if (provider === 'clone' && !(selected?.voices || []).length && !voiceId) {
			toast.error(t.cloneNeedSamples);
			return;
		}
		setSaving(true);
		try {
			if (apiKeyDraft.trim() && selected?.needsKey) {
				await saveVoiceChangerCredential(provider, apiKeyDraft.trim());
			}
			const data = await saveVoiceChangerSettings({
				configured: true,
				enabled: provider !== 'off',
				provider,
				preset,
				pitchSemitones,
				voiceId: voiceId || null,
			});
			onSaved?.(data);
			toast.success(t.saved);
			onOpenChange(false);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not save voice settings');
		} finally {
			setSaving(false);
		}
	};

	const fieldClass =
		'h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-emerald-900/40';

	const ghostBtn =
		'inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:opacity-50 dark:hover:bg-slate-900 dark:hover:text-slate-100';

	const presetOptions = FFMPEG_PRESETS.map(item => ({
		value: item.id,
		label: ar ? item.ar : item.en,
		description: ar ? item.hintAr : item.hintEn,
	}));
	const voiceOptions = (selected?.voices || []).map(voice => ({
		value: voice.id,
		label: ar ? voice.labelAr : voice.label,
	}));
	const activeEffectLabel =
		selected?.id === 'ffmpeg'
			? (presetOptions.find(item => item.value === preset)?.label || preset)
			: (voiceOptions.find(item => item.value === voiceId)?.label || '');

	const renderPlayer = () => (
		<div className="overflow-hidden rounded-xl border border-emerald-100 bg-white p-2 dark:border-emerald-900/40 dark:bg-slate-950">
			<audio
				ref={audioRef}
				src={previewUrl || undefined}
				preload="auto"
				className="hidden"
				onTimeUpdate={event => {
					setPlayTime(event.currentTarget.currentTime || 0);
					setDuration(event.currentTarget.duration || 0);
				}}
				onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => setPlaying(false)}
			/>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={togglePlayback}
					disabled={!hasSample || converting}
					className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white disabled:opacity-40"
					aria-label={playing ? t.stop : t.preview}
				>
					{converting ? (
						<Loader2 size={14} className="animate-spin" />
					) : playing ? (
						<Pause size={14} />
					) : (
						<Play size={14} className="ms-0.5" />
					)}
				</button>
				<button
					type="button"
					onClick={seekPlayback}
					disabled={!previewUrl || converting}
					className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 disabled:opacity-50 dark:bg-slate-700"
					aria-label={t.preview}
				>
					<span
						className="absolute inset-y-0 start-0 rounded-full bg-emerald-500"
						style={{ width: `${duration ? Math.min(100, (playTime / duration) * 100) : 0}%` }}
					/>
				</button>
				<span className="shrink-0 font-mono text-[10px] font-bold text-slate-500">
					{formatClock(playTime)} / {formatClock(duration || RECORD_SECONDS)}
				</span>
			</div>
			<div className="mt-1.5 flex items-center justify-between gap-2">
				<span className="truncate text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
					{converting ? t.listening : hasSample ? `${activeEffectLabel} · ${t.sampleReady}` : t.tryHint}
				</span>
			</div>
		</div>
	);

	const renderFields = item => {
		const tryButton = (
			<button
				type="button"
				title={converting ? t.listening : hasSample ? t.reRecord : t.preview}
				onClick={recording ? stopPreviewRecording : () => startPreviewRecording(false)}
				disabled={converting}
				className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold leading-none text-white shadow-sm transition disabled:opacity-60 ${
					recording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
				}`}
			>
				{converting ? (
					<Loader2 size={13} className="animate-spin" />
				) : recording ? (
					<Square size={11} />
				) : (
					<Mic size={13} />
				)}
				{converting ? null : recording ? `${t.stop} ${recordLeft}` : hasSample ? t.reRecord : t.record}
			</button>
		);

		const keyLink = item.keyUrl ? (
			<a href={item.keyUrl} target="_blank" rel="noreferrer" title={t.getKey} className={ghostBtn}>
				<ExternalLink size={11} />
			</a>
		) : null;

		if (item.id === 'off') {
			return (
				<div className="space-y-2">
					<div className="flex items-center gap-1.5">
						<p className="min-w-0 flex-1 text-[11px] leading-4 text-slate-500">{t.offHint}</p>
						{tryButton}
					</div>
					{recording || hasSample || previewUrl ? renderPlayer() : null}
				</div>
			);
		}

		const showKeyForm = item.needsKey && (!credential?.configured || editingKey);

		if (item.needsKey && !providerKeySaved(item.id)) {
			return (
				<div className="space-y-2">
					<p className="text-[10px] leading-4 text-slate-500">
						{ar ? item.keyHintAr || t.pasteKeyHint : item.keyHint || t.pasteKeyHint}
					</p>
					{credential?.source && credential.source !== 'saved' && credential.configured ? (
						<p className="text-[10px] leading-4 text-slate-500">{t.fallbackKeyHint}</p>
					) : null}
					<div className="flex items-center gap-1.5">
						<input
							type="password"
							autoComplete="off"
							value={apiKeyDraft}
							onChange={event => setApiKeyDraft(event.target.value)}
							placeholder={item.id === 'huggingface' ? 'hf_...' : item.id === 'clone' || item.id === 'elevenlabs' ? 'sk_...' : 'sk-...'}
							className={fieldClass}
						/>
						<Button
							type="button"
							size="sm"
							className="h-8 shrink-0 px-2 text-[11px]"
							onClick={saveKey}
							disabled={savingKey || !apiKeyDraft.trim()}
						>
							{savingKey ? <Loader2 size={12} className="animate-spin" /> : t.saveKey}
						</Button>
						{keyLink}
					</div>
				</div>
			);
		}

		if (item.id === 'clone') {
			return (
				<div className="space-y-2">
					{showKeyForm ? (
						<div className="flex items-center gap-1.5">
							<input
								type="password"
								autoComplete="off"
								value={apiKeyDraft}
								onChange={event => setApiKeyDraft(event.target.value)}
								placeholder={credential?.configured ? t.newKey : 'sk_...'}
								className={fieldClass}
							/>
							<Button
								type="button"
								size="sm"
								className="h-8 shrink-0 px-2 text-[11px]"
								onClick={saveKey}
								disabled={savingKey || !apiKeyDraft.trim()}
							>
								{savingKey ? <Loader2 size={12} className="animate-spin" /> : t.saveKey}
							</Button>
							{credential?.configured ? (
								<button type="button" className={ghostBtn} onClick={() => { setEditingKey(false); setApiKeyDraft(''); }}>
									{t.cancelEdit}
								</button>
							) : null}
							{keyLink}
						</div>
					) : (
						<div className="flex items-center gap-1">
							<span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
								<KeyRound size={10} />
								{credential?.source === 'environment'
									? t.fromEnv
									: `${t.apiKeySaved} ···${credential?.lastFour || '****'}`}
							</span>
							<button type="button" className={ghostBtn} onClick={() => setEditingKey(true)}>
								{t.replaceKey}
							</button>
							{credential?.source === 'saved' ? (
								<button
									type="button"
									className={`${ghostBtn} text-rose-600 hover:text-rose-700`}
									title={t.removeKey}
									disabled={savingKey}
									onClick={removeKey}
								>
									{savingKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
								</button>
							) : null}
							{keyLink}
						</div>
					)}
					<input
						type="text"
						value={cloneName}
						onChange={event => setCloneName(event.target.value)}
						placeholder={t.cloneNamePh}
						aria-label={t.cloneName}
						className={fieldClass}
					/>
					<p className="text-[10px] leading-4 text-slate-500">{t.cloneHint}</p>
					<p className="text-[10px] leading-4 text-amber-700 dark:text-amber-300">{t.clonePermissionHint}</p>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => cloneFileRef.current?.click()}
							disabled={cloning}
							className={`${ghostBtn} h-8 border border-slate-200 bg-white px-2.5 text-slate-700 dark:border-slate-700`}
						>
							<Upload size={12} />
							{t.cloneUpload}
						</button>
						<button
							type="button"
							onClick={() => startPreviewRecording(true)}
							disabled={cloning || converting}
							className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold leading-none text-white ${
								recording && cloneCaptureRef.current ? 'bg-rose-600' : 'bg-emerald-600'
							}`}
						>
							{recording && cloneCaptureRef.current ? <Square size={11} /> : <Mic size={13} />}
							{recording && cloneCaptureRef.current ? `${t.stop} ${recordLeft}` : t.cloneRecord}
						</button>
						<input
							ref={cloneFileRef}
							type="file"
							accept="audio/*,.webm,.ogg,.mp3,.wav,.m4a"
							multiple
							hidden
							onChange={event => {
								const files = [...(event.target.files || [])];
								event.target.value = '';
								if (!files.length) return;
								setCloneSamples(current => [...current, ...files].slice(0, 10));
							}}
						/>
					</div>
					{cloneSamples.length ? (
						<ul className="max-h-24 space-y-1 overflow-y-auto">
							{cloneSamples.map((file, index) => (
								<li
									key={`${file.name}-${index}`}
									className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
								>
									<span className="min-w-0 flex-1 truncate">{file.name}</span>
									<button
										type="button"
										aria-label={t.removeKey}
										onClick={() => setCloneSamples(current => current.filter((_, itemIndex) => itemIndex !== index))}
										className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
									>
										<X size={11} />
									</button>
								</li>
							))}
						</ul>
					) : null}
					<label className="flex items-start gap-2 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
						<input
							type="checkbox"
							checked={cloneConsent}
							onChange={event => setCloneConsent(event.target.checked)}
							className="mt-0.5 accent-emerald-600"
						/>
						<span>{t.cloneConsent}</span>
					</label>
					<button
						type="button"
						onClick={submitClone}
						disabled={cloning || !(providerKeySaved('elevenlabs') || providerKeySaved('clone'))}
						className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
					>
						{cloning ? <Loader2 size={13} className="animate-spin" /> : <UserRound size={13} />}
						{cloning ? t.cloneCreating : t.cloneCreate}
					</button>
					{cloneError ? (
						<p className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] leading-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
							{t.cloneErrorKeepOpen} {cloneError}
						</p>
					) : null}
					{item.voices?.length ? (
						<div className="flex items-center gap-1.5">
							<WaCustomSelect
								size="sm"
								className="min-w-0 flex-1"
								ariaLabel={t.voice}
								value={voiceId}
								onChange={setVoiceId}
								options={voiceOptions}
							/>
							{tryButton}
						</div>
					) : null}
					{item.voices?.length ? <p className="text-[10px] leading-4 text-emerald-700">{t.cloneReady}</p> : null}
					{recording || hasSample || previewUrl ? renderPlayer() : null}
				</div>
			);
		}

		return (
			<div className="space-y-2">
				<div className="flex items-center gap-1.5">
					{item.id === 'ffmpeg' ? (
						<WaCustomSelect
							size="sm"
							className="min-w-0 flex-1"
							ariaLabel={t.preset}
							value={preset}
							onChange={setPreset}
							options={presetOptions}
						/>
					) : null}
					{item.voices?.length ? (
						<WaCustomSelect
							size="sm"
							className="min-w-0 flex-1"
							ariaLabel={t.voice}
							value={voiceId}
							onChange={setVoiceId}
							options={voiceOptions}
						/>
					) : null}
					{!item.voices?.length && item.id !== 'ffmpeg' ? <span className="min-w-0 flex-1" /> : null}
					{tryButton}
				</div>

				{recording ? (
					<div className="flex items-center gap-2 rounded-lg bg-rose-50 px-2 py-1.5 dark:bg-rose-950/40">
						<span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-500" />
						<span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">{t.speakNow}</span>
						<div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-rose-200 dark:bg-rose-900">
							<span
								className="block h-full rounded-full bg-rose-500 transition-[width] duration-150"
								style={{
									width: `${((RECORD_SECONDS - recordLeft) / RECORD_SECONDS) * 100}%`,
								}}
							/>
						</div>
						<span className="font-mono text-[10px] font-bold text-rose-600">{recordLeft}s</span>
					</div>
				) : (
					<p className="text-[10px] leading-4 text-slate-500">{hasSample ? t.sampleReady : t.tryHint}</p>
				)}

				{item.id === 'ffmpeg' && preset === 'custom' ? (
					<label className="flex items-center gap-2">
						<input
							type="range"
							min={-12}
							max={12}
							value={pitchSemitones}
							onChange={event => setPitchSemitones(Number(event.target.value))}
							className="w-full accent-emerald-600"
						/>
						<span className="w-6 text-end font-mono text-[11px] font-bold">{pitchSemitones}</span>
					</label>
				) : null}

				{item.needsKey && showKeyForm ? (
					<div className="flex items-center gap-1.5">
						<input
							type="password"
							autoComplete="off"
							value={apiKeyDraft}
							onChange={event => setApiKeyDraft(event.target.value)}
							placeholder={credential?.configured ? t.newKey : item.id === 'huggingface' ? 'hf_...' : 'sk-...'}
							className={fieldClass}
						/>
						<Button
							type="button"
							size="sm"
							className="h-8 shrink-0 px-2 text-[11px]"
							onClick={saveKey}
							disabled={savingKey || !apiKeyDraft.trim()}
						>
							{savingKey ? <Loader2 size={12} className="animate-spin" /> : t.saveKey}
						</Button>
						{credential?.configured ? (
							<button type="button" className={ghostBtn} onClick={() => { setEditingKey(false); setApiKeyDraft(''); }}>
								{t.cancelEdit}
							</button>
						) : null}
						{keyLink}
					</div>
				) : null}

				{item.needsKey && !showKeyForm ? (
					<div className="flex items-center gap-1">
						<span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
							<KeyRound size={10} />
							{credential?.source === 'environment'
								? t.fromEnv
								: credential?.source === 'studio'
									? `${t.fromStudio} ···${credential?.lastFour || '****'}`
									: credential?.source === 'transcription'
										? `${t.fromTranscript} ···${credential?.lastFour || '****'}`
										: `${t.apiKeySaved} ···${credential?.lastFour || '****'}`}
						</span>
						<button type="button" className={ghostBtn} onClick={() => setEditingKey(true)}>
							{t.replaceKey}
						</button>
						{credential?.source === 'saved' ? (
							<button
								type="button"
								className={`${ghostBtn} text-rose-600 hover:text-rose-700`}
								title={t.removeKey}
								disabled={savingKey}
								onClick={removeKey}
							>
								{savingKey ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
							</button>
						) : null}
						{keyLink}
					</div>
				) : null}

				{hasSample || previewUrl || converting ? renderPlayer() : null}
			</div>
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next && busy) return;
				onOpenChange(next);
			}}
		>
			<DialogContent
				dir={ar ? 'rtl' : 'ltr'}
				className="flex !max-h-[min(82vh,580px)] w-full max-w-md !flex-col !gap-0 overflow-hidden !p-0 sm:!max-w-md"
				onPointerDownOutside={event => {
					const target = event.target;
					if (target instanceof Element && target.closest('[data-wa-select-menu],[role="listbox"]')) {
						event.preventDefault();
					}
					if (busy || cloneSamples.length || cloneError) event.preventDefault();
				}}
				onFocusOutside={event => {
					const target = event.target;
					if (target instanceof Element && target.closest('[data-wa-select-menu],[role="listbox"]')) {
						event.preventDefault();
					}
				}}
				onInteractOutside={event => {
					const target = event.target;
					if (target instanceof Element && target.closest('[data-wa-select-menu],[role="listbox"],[data-sonner-toast],.go2072408551')) {
						event.preventDefault();
					}
					if (busy || cloneSamples.length || cloneError) event.preventDefault();
				}}
				onEscapeKeyDown={event => {
					if (busy) event.preventDefault();
				}}
			>
				<DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 px-4 pb-2.5 pe-12 pt-3 dark:border-slate-800">
					<DialogTitle className="flex items-center gap-2 text-sm">
						<span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
							<AudioLines size={14} />
						</span>
						{t.title}
					</DialogTitle>
					<DialogDescription className="text-[11px] leading-4 text-slate-500">{t.subtitle}</DialogDescription>
					<p className="text-[10px] leading-4 text-amber-700/90 dark:text-amber-300/80">{t.disclaimer}</p>
				</DialogHeader>

				{loading ? (
					<div className="flex flex-1 items-center justify-center py-10">
						<Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
					</div>
				) : (
					<div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
						{catalog.map(item => {
							const active = provider === item.id;
							const Icon = PROVIDER_ICONS[item.id] || AudioLines;
							const keyReady = Boolean(item.needsKey && providerKeySaved(item.id));
							return (
								<div
									key={item.id}
									data-provider={item.id}
									className={`overflow-hidden rounded-xl border transition ${
										active
											? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-500/60 dark:bg-emerald-950/30'
											: 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-900'
									}`}
								>
									<button
										type="button"
										title={ar ? item.descriptionAr : item.description}
										onClick={() => selectProvider(item)}
										className="flex w-full items-center gap-2 px-2.5 py-2 text-start leading-none"
									>
										<span
											className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
												active
													? 'bg-emerald-600 text-white'
													: 'bg-slate-100 text-slate-500 dark:bg-slate-800'
											}`}
										>
											{active ? <Check size={12} strokeWidth={2.8} /> : <Icon size={12} />}
										</span>
										<span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none text-slate-800 dark:text-slate-100">
											{ar ? item.labelAr : item.label}
										</span>
										<span
											title={
												keyReady
													? ar
														? 'المفتاح محفوظ'
														: 'API key saved'
													: item.needsKey
														? ar
															? 'يحتاج مفتاح API'
															: 'API key required'
														: undefined
											}
											className={`inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide ${
												keyReady
													? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
													: item.needsKey
														? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
														: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
											}`}
										>
											{keyReady ? <Check size={9} strokeWidth={2.8} /> : null}
											{item.needsKey ? (keyReady ? t.keyAdded : t.needsKey) : t.free}
										</span>
										<ChevronDown
											size={14}
											className={`shrink-0 text-slate-400 transition-transform ${active ? 'rotate-180 text-emerald-600' : ''}`}
										/>
									</button>
									{active ? (
										<div className="border-t border-emerald-100/80 px-2.5 pb-2 pt-1.5 dark:border-emerald-900/40">
											{renderFields(item)}
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				)}

				<div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-slate-200/80 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
					<Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => !busy && onOpenChange(false)}>
						{t.cancel}
					</Button>
					<Button
						type="button"
						size="sm"
						className="h-8 px-3 text-xs"
						onClick={save}
						disabled={
							saving ||
							loading ||
							(selected?.needsKey && !providerKeySaved() && !apiKeyDraft.trim())
						}
					>
						{saving ? <Loader2 size={14} className="animate-spin" /> : t.save}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
