'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Aperture, Camera, CameraOff, Eraser, ImagePlus, Palette, Pause, Play, SwitchCamera, Sun, Undo2, X } from 'lucide-react';
import { PALETTE } from '../config/outfit-config.js';
import { applyWhiteBalance, averageRegion, exposureWarning, medianColor, normalizeHex, rgbToHex, whiteBalanceGains } from '../engine/color.js';
import { FAMILY_PATTERN, inkOn, isArabic } from '../outfit-ui.js';

const SAMPLE_SIZE = 9;
const LIVE_INTERVAL_MS = 180;
const MAX_PHOTO_EDGE = 1280;
const LOUPE_SRC = 15;
const LOUPE_PX = 104;

/** Average of a size×size square around (x, y) on a 2D canvas context. */
function sampleCanvas(ctx, width, height, x, y, size = SAMPLE_SIZE) {
	const half = Math.floor(size / 2);
	const sx = Math.max(0, Math.round(x) - half);
	const sy = Math.max(0, Math.round(y) - half);
	const sw = Math.min(width - sx, size);
	const sh = Math.min(height - sy, size);
	if (sw <= 0 || sh <= 0) return null;
	const { data } = ctx.getImageData(sx, sy, sw, sh);
	return averageRegion(data, sw, sh, Math.round(x) - sx, Math.round(y) - sy, size);
}

function cameraSupport() {
	if (typeof window === 'undefined') return 'unknown';
	if (!window.isSecureContext) return 'insecure';
	if (!navigator.mediaDevices?.getUserMedia) return 'noCamera';
	return 'ok';
}

function drawLoupe(loupe, source, x, y) {
	const ctx = loupe?.getContext('2d');
	if (!ctx || !source) return;
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, LOUPE_PX, LOUPE_PX);
	const half = Math.floor(LOUPE_SRC / 2);
	ctx.drawImage(source, Math.round(x) - half, Math.round(y) - half, LOUPE_SRC, LOUPE_SRC, 0, 0, LOUPE_PX, LOUPE_PX);
	// The sampled 9×9 box, outlined in both a light and a dark stroke so it shows on any fabric.
	const cell = LOUPE_PX / LOUPE_SRC;
	const box = SAMPLE_SIZE * cell;
	const start = (LOUPE_PX - box) / 2;
	ctx.lineWidth = 2;
	ctx.strokeStyle = 'rgba(0,0,0,0.75)';
	ctx.strokeRect(start, start, box, box);
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'rgba(255,255,255,0.9)';
	ctx.strokeRect(start + 1.5, start + 1.5, box - 3, box - 3);
}

export function Swatch({ hex, family, size = 'md', colorBlind, label, className = '' }) {
	const pattern = colorBlind ? FAMILY_PATTERN[family] || 'none' : 'none';
	return (
		<span
			className={`wa-of-swatch wa-of-swatch-${size} ${className}`}
			data-pattern={pattern}
			style={{ '--swatch': hex || 'transparent', '--swatch-ink': hex ? inkOn(hex) : 'currentColor' }}
			role={label ? 'img' : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		/>
	);
}

export default function ColorCapture({ locale, colorBlind, onDetected, initialMode = 'photo', bare = false }) {
	const t = useTranslations('outfitMatcher.input');
	const lang = isArabic(locale) ? 'ar' : 'en';
	const [mode, setMode] = useState(initialMode);
	const support = useMemo(() => cameraSupport(), []);
	const [points, setPoints] = useState([]);
	const [whiteGains, setWhiteGains] = useState(null);
	const [whiteArmed, setWhiteArmed] = useState(false);
	const [notice, setNotice] = useState('');

	// Points from any source → median → white balance → reported colour.
	const result = useMemo(() => {
		if (!points.length) return null;
		const median = medianColor(points.map(point => point.rgb));
		const clipped = Math.max(...points.map(point => point.rgb.clippedShare || 0));
		const balanced = applyWhiteBalance(median, whiteGains);
		return { hex: rgbToHex(balanced), warning: exposureWarning({ ...median, clippedShare: clipped }) };
	}, [points, whiteGains]);

	const lastReported = useRef('');
	useEffect(() => {
		const key = result ? `${result.hex}|${result.warning}` : '';
		if (key === lastReported.current) return;
		lastReported.current = key;
		if (result) onDetected?.(result.hex, result.warning);
	}, [result, onDetected]);

	const addSample = useCallback(
		(rgb, where) => {
			if (!rgb) return;
			if (whiteArmed) {
				const gains = whiteBalanceGains(rgb);
				setWhiteArmed(false);
				if (!gains) setNotice(t('pick.whiteRefBad'));
				else {
					setWhiteGains(gains);
					setNotice('');
				}
				return;
			}
			setNotice('');
			setPoints(list => [...list.slice(-11), { rgb, ...where, id: `${Date.now()}-${list.length}` }]);
		},
		[whiteArmed, t],
	);

	const switchMode = next => {
		setMode(next);
		setPoints([]);
		setWhiteArmed(false);
		setNotice('');
	};

	return (
		<section className={bare ? 'wa-of-capture-bare' : 'wa-of-card'} aria-label={t('title')}>
			{bare ? null : (
				<div className="wa-of-card-head">
					<h2 className="wa-of-card-title">{t('title')}</h2>
				</div>
			)}
			<div className="wa-of-segment" role="tablist" aria-label={t('title')}>
				{[
					['camera', Camera],
					['photo', ImagePlus],
					['manual', Palette],
				].map(([id, Icon]) => (
					<button
						key={id}
						type="button"
						role="tab"
						aria-selected={mode === id}
						className="wa-of-segment-btn"
						data-active={mode === id || undefined}
						onClick={() => switchMode(id)}
					>
						<Icon size={16} aria-hidden="true" />
						<span>{t(`modes.${id}`)}</span>
					</button>
				))}
			</div>

			{mode === 'camera' ? (
				<CameraPicker
					support={support}
					onSample={addSample}
					onFreeze={() => {
						setMode('photo');
					}}
					t={t}
				/>
			) : null}
			{mode === 'photo' ? <PhotoPicker points={points} onSample={addSample} t={t} /> : null}
			{mode === 'manual' ? (
				<ManualPicker
					lang={lang}
					colorBlind={colorBlind}
					t={t}
					onPick={hex => {
						const clean = normalizeHex(hex);
						if (!clean) return;
						lastReported.current = `${clean}|null`;
						onDetected?.(clean, null);
					}}
				/>
			) : null}

			{mode !== 'manual' ? (
				<div className="wa-of-pick-bar">
					<span className="wa-of-muted" aria-live="polite">
						{t('pick.points', { count: points.length })}
					</span>
					<div className="wa-of-row-gap">
						<button
							type="button"
							className="wa-of-icon-btn"
							onClick={() => setPoints(list => list.slice(0, -1))}
							disabled={!points.length}
							aria-label={t('pick.undo')}
							title={t('pick.undo')}
						>
							<Undo2 size={18} aria-hidden="true" />
						</button>
						<button
							type="button"
							className="wa-of-icon-btn"
							onClick={() => setPoints([])}
							disabled={!points.length}
							aria-label={t('pick.clear')}
							title={t('pick.clear')}
						>
							<Eraser size={18} aria-hidden="true" />
						</button>
						{whiteGains ? (
							<button type="button" className="wa-of-chip" data-active onClick={() => setWhiteGains(null)} aria-label={t('pick.whiteRefClear')}>
								<Sun size={15} aria-hidden="true" />
								<span>{t('pick.whiteRefSet')}</span>
								<X size={14} aria-hidden="true" />
							</button>
						) : (
							<button
								type="button"
								className="wa-of-chip"
								data-active={whiteArmed || undefined}
								aria-pressed={whiteArmed}
								onClick={() => setWhiteArmed(value => !value)}
								title={t('pick.whiteRefHint')}
							>
								<Sun size={15} aria-hidden="true" />
								<span>{whiteArmed ? t('pick.whiteRefArmed') : t('pick.whiteRef')}</span>
							</button>
						)}
					</div>
				</div>
			) : null}
			{whiteArmed ? <p className="wa-of-hint">{t('pick.whiteRefHint')}</p> : null}
			{notice ? (
				<p className="wa-of-alert" role="status">
					<AlertTriangle size={16} aria-hidden="true" />
					<span>{notice}</span>
				</p>
			) : null}
			{result?.warning && mode !== 'manual' ? (
				<p className="wa-of-alert" role="status">
					<AlertTriangle size={16} aria-hidden="true" />
					<span>{t(`warnings.${result.warning}`)}</span>
				</p>
			) : null}
		</section>
	);
}

/** A frame frozen from the camera, handed to the photo picker. Module-level so it survives the mode switch. */
const frozenRef = { current: null };

function CameraPicker({ support, onSample, onFreeze, t }) {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const streamRef = useRef(null);
	const rafRef = useRef(0);
	const [facing, setFacing] = useState('environment');
	const [status, setStatus] = useState(support === 'ok' ? 'idle' : support);
	const [live, setLive] = useState(null);

	const stop = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = 0;
		for (const track of streamRef.current?.getTracks() || []) track.stop();
		streamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
		setLive(null);
	}, []);

	const frameCtx = useCallback(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || !video.videoWidth) return null;
		const scale = Math.min(1, 640 / video.videoWidth);
		const w = Math.round(video.videoWidth * scale);
		const h = Math.round(video.videoHeight * scale);
		if (canvas.width !== w) canvas.width = w;
		if (canvas.height !== h) canvas.height = h;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		ctx.drawImage(video, 0, 0, w, h);
		return { ctx, w, h, scale };
	}, []);

	const start = useCallback(
		async nextFacing => {
			stop();
			if (support !== 'ok') return;
			setStatus('starting');
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
					audio: false,
				});
				streamRef.current = stream;
				const video = videoRef.current;
				if (!video) {
					stop();
					return;
				}
				video.srcObject = stream;
				await video.play().catch(() => {});
				setStatus('live');
				// Live centre preview, throttled; the loop is cancelled on stop/unmount/hidden.
				let last = 0;
				const loop = now => {
					rafRef.current = requestAnimationFrame(loop);
					if (now - last < LIVE_INTERVAL_MS) return;
					last = now;
					const frame = frameCtx();
					if (!frame) return;
					setLive(sampleCanvas(frame.ctx, frame.w, frame.h, frame.w / 2, frame.h / 2));
				};
				rafRef.current = requestAnimationFrame(loop);
			} catch (error) {
				stop();
				const name = error?.name;
				setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'noCamera' : 'failed');
			}
		},
		[frameCtx, stop, support],
	);

	useEffect(() => {
		const onHidden = () => {
			if (document.hidden && streamRef.current) {
				stop();
				setStatus('idle');
			}
		};
		document.addEventListener('visibilitychange', onHidden);
		return () => {
			document.removeEventListener('visibilitychange', onHidden);
			stop();
		};
	}, [stop]);

	const sampleAt = event => {
		const video = videoRef.current;
		const frame = frameCtx();
		if (!video || !frame) return;
		const rect = video.getBoundingClientRect();
		// object-fit: cover mapping from the element box to the frame.
		const coverScale = Math.max(rect.width / frame.w, rect.height / frame.h);
		const offsetX = (rect.width - frame.w * coverScale) / 2;
		const offsetY = (rect.height - frame.h * coverScale) / 2;
		const x = (event.clientX - rect.left - offsetX) / coverScale;
		const y = (event.clientY - rect.top - offsetY) / coverScale;
		onSample(sampleCanvas(frame.ctx, frame.w, frame.h, x, y), { fx: (event.clientX - rect.left) / rect.width, fy: (event.clientY - rect.top) / rect.height });
	};

	const captureCentre = () => {
		const frame = frameCtx();
		if (frame) onSample(sampleCanvas(frame.ctx, frame.w, frame.h, frame.w / 2, frame.h / 2), { fx: 0.5, fy: 0.5 });
	};

	const freeze = () => {
		const frame = frameCtx();
		if (!frame) return;
		const copy = document.createElement('canvas');
		copy.width = frame.w;
		copy.height = frame.h;
		copy.getContext('2d').drawImage(canvasRef.current, 0, 0);
		frozenRef.current = copy;
		stop();
		onFreeze();
	};

	const message = { insecure: t('camera.insecure'), noCamera: t('camera.noCamera'), denied: t('camera.denied'), failed: t('camera.failed') }[status];
	const liveHex = live ? rgbToHex(live) : null;

	return (
		<div className="wa-of-capture">
			<div className="wa-of-stage" data-state={status}>
				<video
					ref={videoRef}
					className="wa-of-video"
					playsInline
					muted
					onClick={status === 'live' ? sampleAt : undefined}
					aria-label={t('camera.hint')}
					hidden={status !== 'live'}
				/>
				<canvas ref={canvasRef} hidden />
				{status === 'live' ? (
					<>
						<span className="wa-of-reticle" aria-hidden="true" style={{ '--swatch': liveHex || 'transparent' }} />
						<button type="button" className="wa-of-stage-btn wa-of-stage-flip" onClick={() => {
							const next = facing === 'environment' ? 'user' : 'environment';
							setFacing(next);
							void start(next);
						}} aria-label={t('camera.flip')} title={t('camera.flip')}>
							<SwitchCamera size={20} aria-hidden="true" />
						</button>
					</>
				) : (
					<div className="wa-of-stage-empty">
						{status === 'starting' ? <span className="wa-of-spinner" aria-hidden="true" /> : <CameraOff size={28} aria-hidden="true" />}
						<p>{status === 'starting' ? t('camera.starting') : message || t('camera.hint')}</p>
					</div>
				)}
			</div>
			<div className="wa-of-row-gap wa-of-wrap">
				{status === 'live' ? (
					<>
						<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={captureCentre}>
							<Aperture size={18} aria-hidden="true" />
							{t('camera.capture')}
						</button>
						<button type="button" className="wa-of-btn" onClick={freeze}>
							<Pause size={18} aria-hidden="true" />
							{t('camera.freeze')}
						</button>
						<button type="button" className="wa-of-btn" onClick={() => { stop(); setStatus('idle'); }}>
							<CameraOff size={18} aria-hidden="true" />
							{t('camera.stop')}
						</button>
					</>
				) : support === 'ok' && status !== 'starting' ? (
					<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={() => void start(facing)}>
						<Play size={18} aria-hidden="true" />
						{t('camera.start')}
					</button>
				) : null}
			</div>
			{status === 'live' ? <p className="wa-of-hint">{t('camera.hint')}</p> : null}
		</div>
	);
}

function PhotoPicker({ points, onSample, t }) {
	const canvasRef = useRef(null);
	const loupeRef = useRef(null);
	const uploadRef = useRef(null);
	const takeRef = useRef(null);
	const [hasImage, setHasImage] = useState(false);
	const [error, setError] = useState('');
	const [loupe, setLoupe] = useState(null);
	const pending = useRef(0);

	const paint = useCallback(source => {
		const canvas = canvasRef.current;
		if (!canvas || !source) return;
		const w = source.naturalWidth || source.width;
		const h = source.naturalHeight || source.height;
		const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(w, h));
		canvas.width = Math.max(1, Math.round(w * scale));
		canvas.height = Math.max(1, Math.round(h * scale));
		canvas.getContext('2d', { willReadFrequently: true }).drawImage(source, 0, 0, canvas.width, canvas.height);
		setHasImage(true);
		setError('');
	}, []);

	useEffect(() => {
		if (frozenRef.current) {
			paint(frozenRef.current);
			frozenRef.current = null;
		}
	}, [paint]);

	const load = file => {
		if (!file) return;
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			paint(img);
			URL.revokeObjectURL(url);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			setError(t('photo.failed'));
		};
		img.src = url;
	};

	const toCanvas = event => {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const fx = (event.clientX - rect.left) / rect.width;
		const fy = (event.clientY - rect.top) / rect.height;
		return { fx, fy, x: fx * canvas.width, y: fy * canvas.height, rect };
	};

	const showLoupe = event => {
		if (!hasImage) return;
		const { fx, fy, x, y, rect } = toCanvas(event);
		if (fx < 0 || fy < 0 || fx > 1 || fy > 1) return;
		cancelAnimationFrame(pending.current);
		pending.current = requestAnimationFrame(() => {
			drawLoupe(loupeRef.current, canvasRef.current, x, y);
		});
		setLoupe({ px: fx * rect.width, py: fy * rect.height });
	};

	useEffect(() => () => cancelAnimationFrame(pending.current), []);

	const pick = event => {
		if (!hasImage) return;
		const { fx, fy, x, y } = toCanvas(event);
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		onSample(sampleCanvas(ctx, canvas.width, canvas.height, x, y), { fx, fy });
		setLoupe(null);
	};

	return (
		<div className="wa-of-capture">
			<input ref={uploadRef} type="file" accept="image/*" hidden onChange={event => { load(event.target.files?.[0]); event.target.value = ''; }} />
			<input ref={takeRef} type="file" accept="image/*" capture="environment" hidden onChange={event => { load(event.target.files?.[0]); event.target.value = ''; }} />
			<div className="wa-of-stage" data-state={hasImage ? 'image' : 'empty'}>
				<canvas
					ref={canvasRef}
					className="wa-of-photo"
					hidden={!hasImage}
					onPointerDown={event => {
						event.currentTarget.setPointerCapture?.(event.pointerId);
						showLoupe(event);
					}}
					onPointerMove={event => (event.buttons || event.pointerType === 'mouse' ? showLoupe(event) : null)}
					onPointerUp={pick}
					onPointerLeave={() => setLoupe(null)}
					onPointerCancel={() => setLoupe(null)}
					role="img"
					aria-label={t('photo.hint')}
				/>
				{hasImage
					? points.map(point =>
							point.fx != null ? (
								<span key={point.id} className="wa-of-ring" aria-hidden="true" style={{ left: `${point.fx * 100}%`, top: `${point.fy * 100}%`, '--swatch': rgbToHex(point.rgb) }} />
							) : null,
						)
					: null}
				{loupe ? (
					<canvas
						ref={loupeRef}
						width={LOUPE_PX}
						height={LOUPE_PX}
						className="wa-of-loupe"
						aria-label={t('pick.loupe')}
						style={{ transform: `translate(${loupe.px - LOUPE_PX / 2}px, ${Math.max(0, loupe.py - LOUPE_PX - 24)}px)` }}
					/>
				) : null}
				{!hasImage ? (
					<div className="wa-of-stage-empty">
						<ImagePlus size={28} aria-hidden="true" />
						<p>{error || t('photo.empty')}</p>
					</div>
				) : null}
			</div>
			<div className="wa-of-row-gap wa-of-wrap">
				<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={() => uploadRef.current?.click()}>
					<ImagePlus size={18} aria-hidden="true" />
					{hasImage ? t('photo.change') : t('photo.upload')}
				</button>
				<button type="button" className="wa-of-btn" onClick={() => takeRef.current?.click()}>
					<Camera size={18} aria-hidden="true" />
					{t('photo.take')}
				</button>
			</div>
			{hasImage ? <p className="wa-of-hint">{t('photo.hint')}</p> : null}
		</div>
	);
}

function ManualPicker({ lang, colorBlind, t, onPick }) {
	const [hex, setHex] = useState('#1F2A44');
	const [draft, setDraft] = useState('#1F2A44');
	const valid = normalizeHex(draft);
	const timer = useRef(0);
	useEffect(() => () => clearTimeout(timer.current), []);

	const choose = value => {
		const clean = normalizeHex(value);
		if (!clean) return;
		setHex(clean);
		setDraft(clean);
		onPick(clean);
	};

	return (
		<div className="wa-of-capture">
			<div className="wa-of-row-gap wa-of-wrap">
				<label className="wa-of-color-input">
					<span className="wa-of-sr">{t('manual.picker')}</span>
					<input
						type="color"
						value={hex.toLowerCase()}
						onChange={event => {
							const value = event.target.value;
							setHex(value.toUpperCase());
							setDraft(value.toUpperCase());
							clearTimeout(timer.current);
							timer.current = setTimeout(() => onPick(value), 120);
						}}
					/>
				</label>
				<label className="wa-of-field wa-of-grow">
					<span className="wa-of-label">{t('manual.hex')}</span>
					<input
						className="wa-of-input"
						value={draft}
						dir="ltr"
						inputMode="text"
						autoComplete="off"
						spellCheck={false}
						maxLength={7}
						aria-invalid={!valid}
						onChange={event => {
							setDraft(event.target.value);
							const clean = normalizeHex(event.target.value);
							if (clean && clean.length === 7) {
								setHex(clean);
								clearTimeout(timer.current);
								timer.current = setTimeout(() => onPick(clean), 250);
							}
						}}
					/>
				</label>
			</div>
			{!valid ? <p className="wa-of-hint wa-of-hint-error">{t('manual.hexInvalid')}</p> : null}
			<p className="wa-of-label">{t('manual.palette')}</p>
			<div className="wa-of-palette" role="list">
				{PALETTE.map(color => (
					<button
						key={color.id}
						type="button"
						role="listitem"
						className="wa-of-palette-btn"
						data-active={hex === color.hex || undefined}
						onClick={() => choose(color.hex)}
						aria-label={color.names[lang]}
						title={color.names[lang]}
					>
						<Swatch hex={color.hex} family={color.family} colorBlind={colorBlind} size="lg" />
						<span className="wa-of-palette-name">{color.names[lang]}</span>
					</button>
				))}
			</div>
		</div>
	);
}
