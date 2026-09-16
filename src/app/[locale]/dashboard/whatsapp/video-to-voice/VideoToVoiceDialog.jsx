'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	AudioLines,
	Loader2,
	Mic,
	Music4,
	Pause,
	Play,
	RotateCcw,
	Sparkles,
	Volume2,
	Wand2,
	X,
} from 'lucide-react';
import api from '@/utils/axios';
import {
	MAX_GAIN,
	MIN_GAIN,
	buildEditPayload,
	editSignature,
	formatClock,
	gainPercentLabel,
	initialEditState,
	isDefaultEditState,
	moveTrimHandle,
	parseClock,
	resolveEnd,
	selectionSeconds,
	setGain,
} from './voice-edit-model';

const copy = {
	en: {
		title: 'Send as voice message',
		subtitle: 'Pick the part you want, clean it up, then send it as a voice note.',
		loading: 'Reading the audio track…',
		trim: 'Selection',
		from: 'From',
		to: 'To',
		selected: 'Voice note length',
		cleanup: 'Audio cleanup',
		removeMusic: 'Remove background music',
		removeMusicHint: 'AI isolates the speech and drops music and ambience.',
		removeMusicNeedsKey: 'Needs an ElevenLabs API key in voice changer settings.',
		noiseReduction: 'Reduce noise',
		noiseReductionHint: 'Cuts hiss, fans and room hum.',
		voiceEnhancement: 'Enhance voice',
		voiceEnhancementHint: 'Evens out the level and sharpens speech.',
		volume: 'Volume',
		preview: 'Preview',
		renderPreview: 'Play preview',
		rerenderPreview: 'Play updated preview',
		previewStale: 'Settings changed — render again to hear them.',
		playing: 'Playing',
		reset: 'Reset',
		cancel: 'Cancel',
		send: 'Send as voice',
		sending: 'Sending…',
		stageTrim: 'Extracting the selected audio…',
		stageIsolate: 'Removing background music with AI…',
		stageEncode: 'Encoding the voice note…',
		stageSend: 'Sending…',
		failedLoad: 'Could not read the audio for this video.',
		failedPreview: 'Could not render the preview.',
		close: 'Close',
	},
	ar: {
		title: 'إرسال كرسالة صوتية',
		subtitle: 'اختَر الجزء المطلوب، نقّي الصوت، وبعدها ابعته كرسالة صوتية.',
		loading: 'جاري قراءة مسار الصوت…',
		trim: 'المقطع المحدد',
		from: 'من',
		to: 'إلى',
		selected: 'مدة الرسالة الصوتية',
		cleanup: 'تنقية الصوت',
		removeMusic: 'إزالة الموسيقى الخلفية',
		removeMusicHint: 'الذكاء الاصطناعي يعزل الكلام ويشيل الموسيقى والضجيج.',
		removeMusicNeedsKey: 'يحتاج مفتاح ElevenLabs في إعدادات تغيير الصوت.',
		noiseReduction: 'تقليل التشويش',
		noiseReductionHint: 'يقلل الهسهسة وأصوات المراوح وطنين الغرفة.',
		voiceEnhancement: 'تحسين الصوت',
		voiceEnhancementHint: 'يوازن مستوى الصوت ويوضّح الكلام.',
		volume: 'مستوى الصوت',
		preview: 'المعاينة',
		renderPreview: 'تشغيل المعاينة',
		rerenderPreview: 'تشغيل المعاينة المحدثة',
		previewStale: 'الإعدادات اتغيرت — اعمل معاينة تاني لتسمعها.',
		playing: 'جاري التشغيل',
		reset: 'إعادة ضبط',
		cancel: 'إلغاء',
		send: 'إرسال كصوت',
		sending: 'جاري الإرسال…',
		stageTrim: 'جاري استخراج الصوت المحدد…',
		stageIsolate: 'جاري إزالة الموسيقى بالذكاء الاصطناعي…',
		stageEncode: 'جاري تجهيز الرسالة الصوتية…',
		stageSend: 'جاري الإرسال…',
		failedLoad: 'تعذّرت قراءة صوت هذا الفيديو.',
		failedPreview: 'تعذّر تجهيز المعاينة.',
		close: 'إغلاق',
	},
};

/**
 * A blob body hides the server's JSON error, which is how the user finds out
 * things like "background-music removal needs an API key". Read it back out.
 */
async function readBlobErrorMessage(error) {
	const data = error?.response?.data;
	if (typeof data?.message === 'string') return data.message;
	if (!(data instanceof Blob)) return '';
	try {
		const parsed = JSON.parse(await data.text());
		return typeof parsed?.message === 'string' ? parsed.message : '';
	} catch {
		return '';
	}
}

/** Rough, deterministic bars behind the trim range — a visual aid, not real audio data. */
function useWaveformBars(seed, count = 64) {
	return useMemo(() => {
		// xorshift32 via Math.imul: stays in int32 range, so the sequence does not
		// degenerate the way a float LCG does past 2^53.
		let state = 0x9e3779b9;
		for (const char of String(seed || 'wa')) {
			state = Math.imul(state ^ char.charCodeAt(0), 0x85ebca6b) >>> 0;
		}
		return Array.from({ length: count }, () => {
			state ^= state << 13;
			state ^= state >>> 17;
			state ^= state << 5;
			state >>>= 0;
			return 0.25 + (state % 1000) / 1000 * 0.75;
		});
	}, [seed, count]);
}

function ToggleRow({ icon, label, hint, checked, disabled, onChange }) {
	return (
		<label
			className={`flex items-start gap-3 rounded-xl border p-3 transition ${
				disabled
					? 'cursor-not-allowed border-slate-200 opacity-60'
					: checked
						? 'cursor-pointer border-emerald-300 bg-emerald-50/60'
						: 'cursor-pointer border-slate-200 hover:border-slate-300 hover:bg-slate-50'
			}`}
		>
			<span
				className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
					checked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
				}`}
			>
				{icon}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-semibold text-slate-800">{label}</span>
				<span className="mt-0.5 block text-xs leading-snug text-slate-500">{hint}</span>
			</span>
			<input
				type="checkbox"
				className="mt-1 size-4 shrink-0 accent-emerald-600"
				checked={checked}
				disabled={disabled}
				onChange={(event) => onChange(event.target.checked)}
			/>
		</label>
	);
}

export default function VideoToVoiceDialog({
	open,
	attachmentId,
	locale = 'en',
	onClose,
	onSend,
	sending = false,
}) {
	const t = copy[locale === 'ar' ? 'ar' : 'en'];
	const ar = locale === 'ar';

	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [source, setSource] = useState({ sourceSeconds: 0, canRemoveBackgroundMusic: false });
	const [state, setState] = useState(() => initialEditState(0));
	const [startText, setStartText] = useState('0:00');
	const [endText, setEndText] = useState('0:00');

	const [previewing, setPreviewing] = useState(false);
	const [previewError, setPreviewError] = useState('');
	const [preview, setPreview] = useState(null); // { url, signature }
	const [playing, setPlaying] = useState(false);
	const [stage, setStage] = useState('');

	const audioRef = useRef(null);
	const trackRef = useRef(null);
	const draggingRef = useRef(null);
	const previewUrlRef = useRef('');

	const sourceSeconds = source.sourceSeconds;
	const end = resolveEnd(state, sourceSeconds);
	const length = selectionSeconds(state, sourceSeconds);
	const signature = editSignature(state, sourceSeconds);
	const previewFresh = preview?.signature === signature;
	const bars = useWaveformBars(attachmentId);
	const busy = sending || Boolean(stage);

	const releasePreview = useCallback(() => {
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = '';
		}
		setPreview(null);
		setPlaying(false);
	}, []);

	// Load the source description once per open.
	useEffect(() => {
		if (!open || !attachmentId) return undefined;
		let cancelled = false;
		setLoading(true);
		setLoadError('');
		setPreviewError('');
		releasePreview();
		api
			.get(`/whatsapp/attachments/${attachmentId}/voice-edit`)
			.then(({ data }) => {
				if (cancelled) return;
				const seconds = Number(data?.sourceSeconds) || 0;
				setSource({
					sourceSeconds: seconds,
					canRemoveBackgroundMusic: Boolean(data?.canRemoveBackgroundMusic),
				});
				const next = initialEditState(seconds);
				setState(next);
				setStartText(formatClock(next.start));
				setEndText(formatClock(resolveEnd(next, seconds)));
				setLoading(false);
			})
			.catch((error) => {
				if (cancelled) return;
				setLoadError(error?.response?.data?.message || t.failedLoad);
				setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, attachmentId, releasePreview, t.failedLoad]);

	useEffect(() => () => releasePreview(), [releasePreview]);

	// Any settings change invalidates what the user is currently hearing.
	useEffect(() => {
		const audio = audioRef.current;
		if (audio && !previewFresh) {
			audio.pause();
			setPlaying(false);
		}
	}, [previewFresh]);

	const applyState = useCallback(
		(next) => {
			setState(next);
			setStartText(formatClock(next.start));
			setEndText(formatClock(resolveEnd(next, sourceSeconds)));
		},
		[sourceSeconds],
	);

	const moveHandle = useCallback(
		(edge, seconds) => {
			applyState(moveTrimHandle(state, sourceSeconds, edge, seconds));
		},
		[applyState, state, sourceSeconds],
	);

	const secondsFromPointer = useCallback(
		(clientX) => {
			const track = trackRef.current;
			if (!track || sourceSeconds <= 0) return 0;
			const rect = track.getBoundingClientRect();
			if (rect.width <= 0) return 0;
			const offset = ar ? rect.right - clientX : clientX - rect.left;
			return Math.min(1, Math.max(0, offset / rect.width)) * sourceSeconds;
		},
		[ar, sourceSeconds],
	);

	// Pointer capture on the window so a fast drag that leaves the track keeps working.
	useEffect(() => {
		if (!open) return undefined;
		const onMove = (event) => {
			if (!draggingRef.current) return;
			event.preventDefault();
			moveHandle(draggingRef.current, secondsFromPointer(event.clientX));
		};
		const onUp = () => {
			draggingRef.current = null;
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		};
	}, [open, moveHandle, secondsFromPointer]);

	const commitTimeText = useCallback(
		(edge, text) => {
			const parsed = parseClock(text);
			if (parsed == null) {
				// Reject silently and snap the field back to the live value.
				setStartText(formatClock(state.start));
				setEndText(formatClock(end));
				return;
			}
			moveHandle(edge, parsed);
		},
		[moveHandle, state.start, end],
	);

	const renderPreview = useCallback(async () => {
		if (!attachmentId || previewing) return;
		const audio = audioRef.current;
		if (previewFresh && audio) {
			if (playing) audio.pause();
			else void audio.play().catch(() => undefined);
			return;
		}
		setPreviewing(true);
		setPreviewError('');
		setStage(state.removeBackgroundMusic ? t.stageIsolate : t.stageTrim);
		try {
			const { data } = await api.post(
				`/whatsapp/attachments/${attachmentId}/voice-edit/preview`,
				buildEditPayload(state, sourceSeconds),
				{ responseType: 'blob' },
			);
			releasePreview();
			const url = URL.createObjectURL(data);
			previewUrlRef.current = url;
			setPreview({ url, signature });
			// Autoplay once the element has picked up the new src.
			requestAnimationFrame(() => {
				void audioRef.current?.play().catch(() => undefined);
			});
		} catch (error) {
			setPreviewError((await readBlobErrorMessage(error)) || t.failedPreview);
		} finally {
			setStage('');
			setPreviewing(false);
		}
	}, [
		attachmentId,
		previewing,
		previewFresh,
		playing,
		state,
		sourceSeconds,
		signature,
		releasePreview,
		t.failedPreview,
		t.stageIsolate,
		t.stageTrim,
	]);

	const submit = useCallback(async () => {
		if (busy) return;
		setStage(state.removeBackgroundMusic ? t.stageIsolate : t.stageEncode);
		try {
			await onSend?.(buildEditPayload(state, sourceSeconds));
		} finally {
			setStage('');
		}
	}, [busy, onSend, state, sourceSeconds, t.stageEncode, t.stageIsolate]);

	const reset = useCallback(() => {
		releasePreview();
		setPreviewError('');
		applyState(initialEditState(sourceSeconds));
	}, [applyState, releasePreview, sourceSeconds]);

	useEffect(() => {
		if (!open) return undefined;
		const onKeyDown = (event) => {
			if (event.key === 'Escape' && !busy) onClose?.();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [open, busy, onClose]);

	if (!open || typeof document === 'undefined') return null;

	const startPercent = sourceSeconds > 0 ? (state.start / sourceSeconds) * 100 : 0;
	const endPercent = sourceSeconds > 0 ? (end / sourceSeconds) * 100 : 100;
	const isDefault = isDefaultEditState(state, sourceSeconds);

	const handleStyle = (percent) => (ar ? { right: `${percent}%` } : { left: `${percent}%` });

	return createPortal(
		<div
			className="fixed inset-0 z-[130] grid place-items-end bg-black/45 p-4 backdrop-blur-sm sm:place-items-center"
			onClick={() => {
				if (!busy) onClose?.();
			}}
		>
			<div
				role="dialog"
				aria-label={t.title}
				dir={ar ? 'rtl' : 'ltr'}
				className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b px-5 py-4">
					<div className="min-w-0">
						<h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
							<AudioLines size={18} className="text-emerald-600" />
							{t.title}
						</h3>
						<p className="mt-1 text-xs leading-snug text-slate-500">{t.subtitle}</p>
					</div>
					<button
						type="button"
						aria-label={t.close}
						disabled={busy}
						onClick={() => onClose?.()}
						className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
					>
						<X size={18} />
					</button>
				</div>

				{loading ? (
					<div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500">
						<Loader2 size={16} className="animate-spin" />
						{t.loading}
					</div>
				) : loadError ? (
					<div className="px-5 py-10 text-center text-sm text-rose-600">{loadError}</div>
				) : (
					<div className="space-y-5 px-5 py-4">
						<section>
							<div className="mb-2 flex items-baseline justify-between">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									{t.trim}
								</span>
								<span className="text-xs text-slate-500">
									{t.selected}:{' '}
									<span className="font-semibold text-slate-800">{formatClock(length)}</span>
								</span>
							</div>

							<div
								ref={trackRef}
								className="relative h-20 select-none rounded-xl bg-slate-100 px-1"
								onPointerDown={(event) => {
									// Clicking the track moves the nearer handle to that point.
									const seconds = secondsFromPointer(event.clientX);
									const edge =
										Math.abs(seconds - state.start) <= Math.abs(seconds - end) ? 'start' : 'end';
									draggingRef.current = edge;
									moveHandle(edge, seconds);
								}}
							>
								<div className="flex h-full items-center gap-px">
									{bars.map((height, index) => {
										const at = ((index + 0.5) / bars.length) * 100;
										const inside = at >= startPercent && at <= endPercent;
										return (
											<span
												key={index}
												className={`flex-1 rounded-full transition-colors ${
													inside ? 'bg-emerald-500' : 'bg-slate-300'
												}`}
												style={{ height: `${height * 78}%` }}
											/>
										);
									})}
								</div>

								<div
									className="pointer-events-none absolute inset-y-0 border-x-2 border-emerald-500/70 bg-emerald-500/5"
									style={
										ar
											? { right: `${startPercent}%`, left: `${100 - endPercent}%` }
											: { left: `${startPercent}%`, right: `${100 - endPercent}%` }
									}
								/>

								{['start', 'end'].map((edge) => {
									const percent = edge === 'start' ? startPercent : endPercent;
									const value = edge === 'start' ? state.start : end;
									return (
										<button
											key={edge}
											type="button"
											role="slider"
											aria-label={edge === 'start' ? t.from : t.to}
											aria-valuemin={0}
											aria-valuemax={sourceSeconds}
											aria-valuenow={value}
											aria-valuetext={formatClock(value)}
											className="absolute top-1/2 z-10 h-16 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-emerald-600 shadow-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rtl:translate-x-1/2"
											style={handleStyle(percent)}
											onPointerDown={(event) => {
												event.stopPropagation();
												draggingRef.current = edge;
											}}
											onKeyDown={(event) => {
												const step = event.shiftKey ? 5 : 1;
												if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
													event.preventDefault();
													moveHandle(edge, value - step);
												} else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
													event.preventDefault();
													moveHandle(edge, value + step);
												}
											}}
										/>
									);
								})}
							</div>

							<div className="mt-3 flex items-center gap-3">
								{[
									{ edge: 'start', label: t.from, text: startText, setText: setStartText },
									{ edge: 'end', label: t.to, text: endText, setText: setEndText },
								].map(({ edge, label, text, setText }) => (
									<label key={edge} className="flex flex-1 items-center gap-2">
										<span className="text-xs text-slate-500">{label}</span>
										<input
											type="text"
											inputMode="numeric"
											dir="ltr"
											value={text}
											onChange={(event) => setText(event.target.value)}
											onBlur={(event) => commitTimeText(edge, event.target.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter') {
													event.preventDefault();
													commitTimeText(edge, event.currentTarget.value);
												}
											}}
											className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-medium tabular-nums outline-none focus:border-emerald-400"
										/>
									</label>
								))}
							</div>
						</section>

						<section>
							<span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
								{t.cleanup}
							</span>
							<div className="space-y-2">
								<ToggleRow
									icon={<Music4 size={16} />}
									label={t.removeMusic}
									hint={
										source.canRemoveBackgroundMusic ? t.removeMusicHint : t.removeMusicNeedsKey
									}
									checked={state.removeBackgroundMusic}
									disabled={!source.canRemoveBackgroundMusic}
									onChange={(checked) =>
										setState((prev) => ({ ...prev, removeBackgroundMusic: checked }))
									}
								/>
								<ToggleRow
									icon={<Wand2 size={16} />}
									label={t.noiseReduction}
									hint={t.noiseReductionHint}
									checked={state.noiseReduction}
									onChange={(checked) => setState((prev) => ({ ...prev, noiseReduction: checked }))}
								/>
								<ToggleRow
									icon={<Sparkles size={16} />}
									label={t.voiceEnhancement}
									hint={t.voiceEnhancementHint}
									checked={state.voiceEnhancement}
									onChange={(checked) =>
										setState((prev) => ({ ...prev, voiceEnhancement: checked }))
									}
								/>
							</div>
						</section>

						<section className="flex items-center gap-3">
							<Volume2 size={16} className="shrink-0 text-slate-500" />
							<span className="shrink-0 text-xs text-slate-500">{t.volume}</span>
							<input
								type="range"
								min={MIN_GAIN}
								max={MAX_GAIN}
								step={0.05}
								value={state.gain}
								onChange={(event) => setState((prev) => setGain(prev, event.target.value))}
								className="h-1.5 flex-1 accent-emerald-600"
							/>
							<span className="w-12 shrink-0 text-end text-xs font-semibold tabular-nums text-slate-700">
								{gainPercentLabel(state.gain)}
							</span>
						</section>

						<section className="rounded-xl border border-slate-200 p-3">
							<div className="flex items-center gap-3">
								<button
									type="button"
									disabled={previewing || busy}
									onClick={() => void renderPreview()}
									className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
								>
									{previewing ? (
										<Loader2 size={16} className="animate-spin" />
									) : playing ? (
										<Pause size={16} />
									) : (
										<Play size={16} />
									)}
									{previewFresh ? t.preview : preview ? t.rerenderPreview : t.renderPreview}
								</button>
								<div className="min-w-0 flex-1 text-xs text-slate-500">
									{previewError ? (
										<span className="text-rose-600">{previewError}</span>
									) : preview && !previewFresh ? (
										t.previewStale
									) : playing ? (
										t.playing
									) : (
										formatClock(length)
									)}
								</div>
							</div>
							{preview ? (
								<audio
									ref={audioRef}
									src={preview.url}
									controls
									className="mt-3 w-full"
									onPlay={() => setPlaying(true)}
									onPause={() => setPlaying(false)}
									onEnded={() => setPlaying(false)}
								/>
							) : null}
						</section>
					</div>
				)}

				<div className="flex items-center justify-between gap-2 border-t bg-slate-50 px-5 py-3">
					<button
						type="button"
						disabled={busy || isDefault || loading || Boolean(loadError)}
						onClick={reset}
						className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40"
					>
						<RotateCcw size={15} />
						{t.reset}
					</button>
					<div className="flex items-center gap-2">
						<button
							type="button"
							disabled={busy}
							onClick={() => onClose?.()}
							className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
						>
							{t.cancel}
						</button>
						<button
							type="button"
							disabled={busy || loading || Boolean(loadError)}
							onClick={() => void submit()}
							className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
						>
							{busy ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
							{busy ? stage || t.sending : t.send}
						</button>
					</div>
				</div>

				{busy ? (
					<div className="h-1 w-full overflow-hidden bg-emerald-100">
						<div className="h-full w-1/3 animate-[wa-voice-progress_1.2s_ease-in-out_infinite] rounded-full bg-emerald-500" />
					</div>
				) : null}
			</div>
		</div>,
		document.body,
	);
}
