'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, Upload, AlertTriangle, SwitchCamera, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BodyPoseGuide from './BodyPoseGuide';
import { playShutterSound } from './camera-sound';
import usePoseAlignment from './usePoseAlignment';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.4;
const ZOOM_STEP = 0.15;

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
	const alignedRef = useRef(false);
	const [status, setStatus] = useState('idle');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const [facingMode, setFacingMode] = useState('user');
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

	const { aligned, issue } = usePoseAlignment(videoRef, {
		enabled: status === 'live' && !previewUrl,
		variant,
		zoom,
	});
	alignedRef.current = aligned;

	const handleCapture = useCallback(async () => {
		if (!videoRef.current || capturingRef.current) return;
		if (!alignedRef.current) return;
		capturingRef.current = true;
		setBusy(true);
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
			if (!alignedRef.current) return;
			captureRef.current();
		}, 1200);
		return () => window.clearTimeout(id);
	}, [aligned, previewUrl, status, busy]);

	const handleUpload = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		stopStream();
		onCapture(file);
	};

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
					<img src={previewUrl} alt="" className="h-full w-full object-contain bg-slate-950" />
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

	const issueText = issue ? t(`camera.issue.${issue}`) : t('camera.standStill');

	return (
		<div className="space-y-4">
			<div className={frame}>
				<video
					ref={videoRef}
					playsInline
					muted
					autoPlay
					className="h-full w-full object-contain origin-center bg-slate-950"
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
									onClick={() => setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'))}
									disabled={busy}
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
							<OverlayIconButton onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={busy || zoom >= ZOOM_MAX} label={t('camera.zoomIn')}>
								<Plus className="h-4 w-4" />
							</OverlayIconButton>
							<span className="py-1 text-[10px] font-black tabular-nums text-white">{zoom.toFixed(1)}x</span>
							<OverlayIconButton onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={busy || zoom <= ZOOM_MIN} label={t('camera.zoomOut')}>
								<Minus className="h-4 w-4" />
							</OverlayIconButton>
						</div>
						<div className="absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
							<span className={`max-w-[90%] rounded-full px-3 py-1.5 text-center text-[11px] font-black text-white shadow-lg ${aligned ? 'bg-emerald-500' : 'bg-black/55'}`}>
								{aligned ? t('camera.autoCapturing') : issueText}
							</span>
						</div>
					</>
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
				<p className="text-center text-sm font-semibold leading-relaxed text-slate-600">
					{t('camera.standStill')}
				</p>
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
