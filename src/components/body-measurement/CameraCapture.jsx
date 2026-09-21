'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, RefreshCw, Upload, AlertTriangle, SwitchCamera, Timer, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BodyPoseGuide from './BodyPoseGuide';
import { playCountdownTick, playShutterSound } from './camera-sound';
import usePoseAlignment from './usePoseAlignment';

const TIMER_OPTIONS = [0, 3, 5, 10];
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.4;
const ZOOM_STEP = 0.15;

async function blobFromFile(file) {
	if (!file) return null;
	return file;
}

function captureFrame(video, zoom = 1) {
	const canvas = document.createElement('canvas');
	const w = video.videoWidth || 720;
	const h = video.videoHeight || 960;
	const z = Math.max(1, zoom);
	const cropW = w / z;
	const cropH = h / z;
	const sx = (w - cropW) / 2;
	const sy = (h - cropH) / 2;
	const maxSide = 1280;
	const scale = Math.min(1, maxSide / Math.max(cropW, cropH));
	canvas.width = Math.round(cropW * scale);
	canvas.height = Math.round(cropH * scale);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
	return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92));
}

function OverlayIconButton({ onClick, disabled, label, children }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			title={label}
			className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm ring-1 ring-white/20 hover:bg-black/60 disabled:opacity-40"
		>
			{children}
		</button>
	);
}

export default function CameraCapture({
	variant = 'front',
	previewUrl,
	onCapture,
	onRetake,
	onBack,
	t,
}) {
	const videoRef = useRef(null);
	const streamRef = useRef(null);
	const fileRef = useRef(null);
	const captureRef = useRef(async () => {});
	const [status, setStatus] = useState('idle');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const [facingMode, setFacingMode] = useState('user');
	const [timerSec, setTimerSec] = useState(0);
	const [countdown, setCountdown] = useState(null);
	const [zoom, setZoom] = useState(1);
	const [flash, setFlash] = useState(false);
	const zoomRef = useRef(1);
	const capturingRef = useRef(false);

	const stopStream = useCallback(() => {
		streamRef.current?.getTracks()?.forEach((track) => track.stop());
		streamRef.current = null;
	}, []);

	const startCamera = useCallback(async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			setStatus('unavailable');
			setError(t('camera.unavailable'));
			return;
		}
		stopStream();
		setCountdown(null);
		setError('');
		setStatus('loading');
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					facingMode: { ideal: facingMode },
					width: { ideal: 1280 },
					height: { ideal: 1280 },
				},
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play().catch(() => undefined);
			}
			setStatus('live');
		} catch (err) {
			const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
			setStatus(denied ? 'denied' : 'unavailable');
			setError(denied ? t('camera.denied') : t('camera.unavailable'));
		}
	}, [facingMode, stopStream, t]);

	useEffect(() => {
		if (!previewUrl) startCamera();
		return () => stopStream();
	}, [previewUrl, startCamera, stopStream]);

	const aligned = usePoseAlignment(videoRef, { enabled: status === 'live' && !previewUrl, variant });

	const handleCapture = useCallback(async () => {
		if (!videoRef.current || capturingRef.current) return;
		capturingRef.current = true;
		setBusy(true);
		setCountdown(null);
		playShutterSound();
		setFlash(true);
		window.setTimeout(() => setFlash(false), 140);
		try {
			const blob = await captureFrame(videoRef.current, zoomRef.current);
			if (!blob) throw new Error('empty');
			stopStream();
			onCapture(blob);
		} catch {
			capturingRef.current = false;
			setError(t('camera.captureFailed'));
		} finally {
			setBusy(false);
		}
	}, [onCapture, stopStream, t]);

	captureRef.current = handleCapture;
	zoomRef.current = zoom;

	useEffect(() => {
		if (previewUrl) return undefined;
		capturingRef.current = false;
		return undefined;
	}, [previewUrl]);

	useEffect(() => {
		if (!aligned || previewUrl || status !== 'live' || busy || capturingRef.current) return undefined;
		const id = window.setTimeout(() => {
			captureRef.current();
		}, 850);
		return () => window.clearTimeout(id);
	}, [aligned, previewUrl, status, busy]);

	useEffect(() => {
		if (countdown == null) return undefined;
		if (countdown <= 0) {
			setCountdown(null);
			captureRef.current();
			return undefined;
		}
		playCountdownTick();
		const id = window.setTimeout(() => setCountdown((c) => (c == null ? c : c - 1)), 1000);
		return () => window.clearTimeout(id);
	}, [countdown]);

	const handleUpload = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		const blob = await blobFromFile(file);
		if (!blob) return;
		setCountdown(null);
		playShutterSound();
		stopStream();
		onCapture(blob);
	};

	const toggleFacing = () => {
		setCountdown(null);
		setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'));
	};

	const nudgeZoom = (delta) => {
		setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))));
	};

	const onShutter = () => {
		if (countdown != null) {
			setCountdown(null);
			handleCapture();
			return;
		}
		if (timerSec > 0) {
			setCountdown(timerSec);
			return;
		}
		handleCapture();
	};

	const counting = countdown != null;
	const selfie = facingMode === 'user';
	const frame = `relative overflow-hidden rounded-3xl bg-slate-950 aspect-[3/4] max-h-[62vh] mx-auto w-full max-w-sm shadow-[0_20px_50px_rgba(15,23,42,0.35)] transition-[box-shadow,ring-color] duration-300 ${
		aligned
			? 'ring-4 ring-emerald-400 shadow-[0_0_32px_rgba(52,211,153,0.55)]'
			: 'ring-1 ring-white/20'
	}`;

	const backBtn = onBack ? (
		<button
			type="button"
			onClick={onBack}
			className="inline-flex items-center gap-1 rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm ring-1 ring-white/20 hover:bg-black/60"
		>
			<ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
			{t('actions.back')}
		</button>
	) : null;

	if (previewUrl) {
		return (
			<div className="space-y-4">
				<div className={frame}>
					{backBtn && <div className="absolute top-3 start-3 z-20">{backBtn}</div>}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={previewUrl} alt="" className="h-full w-full object-cover" />
					<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-center text-xs font-bold text-white">
						{t('camera.captured')}
					</div>
				</div>
				<Button type="button" variant="outline" className="h-11 w-full rounded-xl" onClick={onRetake}>
					<RefreshCw className="h-4 w-4" />
					{t('camera.retake')}
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className={frame}>
				<video
					ref={videoRef}
					playsInline
					muted
					autoPlay
					className="h-full w-full object-cover origin-center"
					style={{ transform: selfie ? `scale(${-zoom}, ${zoom})` : `scale(${zoom})` }}
				/>
				<BodyPoseGuide variant={variant} aligned={aligned} />
				{flash && <div className="pointer-events-none absolute inset-0 z-30 bg-white/90" />}
				{status === 'live' && (
					<>
						<div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
							<div className="flex items-center gap-2">
								{backBtn}
								<OverlayIconButton
									onClick={toggleFacing}
									disabled={busy || counting}
									label={selfie ? t('camera.switchRear') : t('camera.switchSelfie')}
								>
									<SwitchCamera className="h-4 w-4" />
								</OverlayIconButton>
							</div>
							<div className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm ring-1 ring-white/20">
								{selfie ? t('camera.selfie') : t('camera.rear')}
							</div>
						</div>
						<div className="absolute end-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-black/40 p-1.5 backdrop-blur-sm ring-1 ring-white/15">
							<OverlayIconButton onClick={() => nudgeZoom(ZOOM_STEP)} disabled={counting || zoom >= ZOOM_MAX} label={t('camera.zoomIn')}>
								<Plus className="h-4 w-4" />
							</OverlayIconButton>
							<span className="py-1 text-[10px] font-black tabular-nums text-white">{zoom.toFixed(1)}x</span>
							<OverlayIconButton onClick={() => nudgeZoom(-ZOOM_STEP)} disabled={counting || zoom <= ZOOM_MIN} label={t('camera.zoomOut')}>
								<Minus className="h-4 w-4" />
							</OverlayIconButton>
						</div>
						{aligned && (
							<div className="absolute inset-x-0 bottom-3 z-20 flex justify-center">
								<span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white shadow-lg">
									{t('camera.autoCapturing')}
								</span>
							</div>
						)}
					</>
				)}
				{counting && (
					<div className="absolute inset-0 z-20 grid place-items-center bg-black/25">
						<p className="text-7xl font-black tabular-nums text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
							{countdown}
						</p>
					</div>
				)}
				{status === 'loading' && (
					<div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-sm font-semibold text-white">
						{t('camera.opening')}
					</div>
				)}
				{(status === 'denied' || status === 'unavailable') && (
					<div className="absolute inset-0 grid place-items-center bg-slate-950/85 p-6 text-center text-white">
						{backBtn && <div className="absolute top-3 start-3">{backBtn}</div>}
						<AlertTriangle className="mb-2 h-8 w-8 text-amber-300" />
						<p className="text-sm font-semibold">{error}</p>
					</div>
				)}
			</div>

			{error && status !== 'live' ? (
				<div className="flex gap-2">
					<Button type="button" className="h-11 flex-1 rounded-xl" onClick={startCamera}>
						<RefreshCw className="h-4 w-4" />
						{t('camera.retry')}
					</Button>
					<Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => fileRef.current?.click()}>
						<Upload className="h-4 w-4" />
						{t('camera.upload')}
					</Button>
				</div>
			) : (
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-center gap-1.5">
						<span className="me-1 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
							<Timer className="h-3.5 w-3.5" />
							{t('camera.timer')}
						</span>
						{TIMER_OPTIONS.map((sec) => {
							const on = timerSec === sec && !counting;
							return (
								<button
									key={sec}
									type="button"
									disabled={counting || busy}
									onClick={() => setTimerSec(sec)}
									className={`h-8 min-w-10 rounded-full px-3 text-xs font-bold ring-1 transition ${
										on
											? 'bg-[var(--color-primary-600)] text-white ring-[var(--color-primary-600)]'
											: 'bg-white text-slate-600 ring-slate-200 hover:ring-[var(--color-primary-300)]'
									}`}
								>
									{sec === 0 ? t('camera.timerOff') : t('camera.timerSeconds', { n: sec })}
								</button>
							);
						})}
					</div>
					<div className="flex items-center gap-3">
						<button
							type="button"
							disabled={status !== 'live' || busy}
							onClick={onShutter}
							className={`mx-auto grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border-4 text-white shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary-600)_40%,transparent)] transition disabled:opacity-50 ${
								aligned
									? 'border-emerald-300 bg-emerald-500 hover:bg-emerald-600'
									: 'border-white bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)]'
							}`}
							aria-label={counting ? t('camera.cancelTimer') : busy ? t('camera.capturing') : t('camera.capture')}
						>
							{counting ? <span className="h-4 w-4 rounded-sm bg-white" /> : <Camera className="h-7 w-7" />}
						</button>
						<Button type="button" variant="outline" className="h-11 rounded-xl" disabled={counting} onClick={() => fileRef.current?.click()}>
							<Upload className="h-4 w-4" />
							{t('camera.upload')}
						</Button>
					</div>
				</div>
			)}
			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				capture={selfie ? 'user' : 'environment'}
				className="hidden"
				onChange={handleUpload}
			/>
		</div>
	);
}
