'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload, AlertTriangle, SwitchCamera, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BodyPoseGuide from './BodyPoseGuide';

const TIMER_OPTIONS = [0, 3, 5, 10];

async function blobFromFile(file) {
	if (!file) return null;
	return file;
}

function captureFrame(video) {
	const canvas = document.createElement('canvas');
	const w = video.videoWidth || 720;
	const h = video.videoHeight || 960;
	const maxSide = 1280;
	const scale = Math.min(1, maxSide / Math.max(w, h));
	canvas.width = Math.round(w * scale);
	canvas.height = Math.round(h * scale);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92));
}

export default function CameraCapture({
	variant = 'front',
	previewUrl,
	onCapture,
	onRetake,
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
	const [timerSec, setTimerSec] = useState(5);
	const [countdown, setCountdown] = useState(null);

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

	const handleCapture = useCallback(async () => {
		if (!videoRef.current) return;
		setBusy(true);
		setCountdown(null);
		try {
			const blob = await captureFrame(videoRef.current);
			if (!blob) throw new Error('empty');
			stopStream();
			onCapture(blob);
		} catch {
			setError(t('camera.captureFailed'));
		} finally {
			setBusy(false);
		}
	}, [onCapture, stopStream, t]);

	captureRef.current = handleCapture;

	useEffect(() => {
		if (countdown == null) return undefined;
		if (countdown <= 0) {
			setCountdown(null);
			captureRef.current();
			return undefined;
		}
		const id = window.setTimeout(() => setCountdown((c) => (c == null ? c : c - 1)), 1000);
		return () => window.clearTimeout(id);
	}, [countdown]);

	const handleUpload = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		const blob = await blobFromFile(file);
		if (!blob) return;
		setCountdown(null);
		stopStream();
		onCapture(blob);
	};

	const toggleFacing = () => {
		setCountdown(null);
		setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'));
	};

	const onShutter = () => {
		if (countdown != null) {
			setCountdown(null);
			return;
		}
		if (timerSec > 0) {
			setCountdown(timerSec);
			return;
		}
		handleCapture();
	};

	const frame = 'relative overflow-hidden rounded-3xl border border-white/20 bg-slate-950 aspect-[3/4] max-h-[62vh] mx-auto w-full max-w-sm shadow-[0_20px_50px_rgba(15,23,42,0.35)]';
	const overlayBtn = 'grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm ring-1 ring-white/20 hover:bg-black/60';

	if (previewUrl) {
		return (
			<div className="space-y-4">
				<div className={frame}>
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

	const counting = countdown != null;
	const selfie = facingMode === 'user';

	return (
		<div className="space-y-4">
			<div className={frame}>
				<video
					ref={videoRef}
					playsInline
					muted
					autoPlay
					className={`h-full w-full object-cover ${selfie ? '-scale-x-100' : ''}`}
				/>
				<BodyPoseGuide variant={variant} />
				{status === 'live' && (
					<div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
						<button
							type="button"
							className={overlayBtn}
							onClick={toggleFacing}
							disabled={busy || counting}
							aria-label={selfie ? t('camera.switchRear') : t('camera.switchSelfie')}
							title={selfie ? t('camera.switchRear') : t('camera.switchSelfie')}
						>
							<SwitchCamera className="h-4 w-4" />
						</button>
						<div className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm ring-1 ring-white/20">
							{selfie ? t('camera.selfie') : t('camera.rear')}
						</div>
					</div>
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
							className="mx-auto grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border-4 border-white bg-[var(--color-primary-600)] text-white shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary-600)_40%,transparent)] transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
							aria-label={counting ? t('camera.cancelTimer') : busy ? t('camera.capturing') : t('camera.capture')}
						>
							{counting ? (
								<span className="h-4 w-4 rounded-sm bg-white" />
							) : (
								<Camera className="h-7 w-7" />
							)}
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
