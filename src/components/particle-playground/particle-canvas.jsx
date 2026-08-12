'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, MousePointerClick, Upload } from 'lucide-react';
import { createParticleObject } from '@/components/canvasui/ParticleObject';
import { formatParticleCount } from '@/lib/particle-playground/asset-utils';
import { Button } from '@/components/ui/button';

export function ParticleCanvas({
	src,
	config,
	morphCloud,
	rebuildKey,
	hasAssets = false,
	onPickFirstAsset,
	onUploadClick,
	onFps,
	onError,
	onLoad,
}) {
	const canvasRef = useRef(null);
	const instanceRef = useRef(null);
	const onFpsRef = useRef(onFps);
	const onErrorRef = useRef(onError);
	const onLoadRef = useRef(onLoad);
	const [fps, setFps] = useState(0);
	const [particles, setParticles] = useState(config?.count || 0);
	const [error, setError] = useState('');

	onFpsRef.current = onFps;
	onErrorRef.current = onError;
	onLoadRef.current = onLoad;

	const particleOptions = useMemo(() => {
		const color = config.useOriginalColors || !config.color ? '' : config.color;
		return {
			src: src || '',
			count: config.count,
			size: config.size,
			sizeVariance: config.sizeVariance,
			color,
			radius: config.radius,
			strength: config.cursorEnabled === false ? 0 : config.strength,
			swirl: config.swirl,
			spring: config.spring,
			damping: config.damping,
			drift: config.drift,
			background: config.background || '',
			scale: config.scale,
			xOffset: config.xOffset,
			yOffset: config.yOffset,
			floatIntensity: config.floatIntensity,
			rotationIntensity: config.rotationIntensity,
			floatSpeed: config.floatSpeed,
			orbit: !!config.orbit,
			zoom: !!config.zoom,
			autoRotate: !!config.autoRotate,
			autoRotateSpeed: config.autoRotateSpeed,
			fov: config.fov,
			cameraDistance: config.cameraDistance,
			cursorEnabled: config.cursorEnabled !== false,
			interactionMode: config.interactionMode || 'push',
			initialFormation: !!config.initialFormation,
			formationDuration: config.formationDuration,
			formationStrength: config.formationStrength,
			crispText: !!config.crispText,
			rasterSize: config.rasterSize,
			alphaThreshold: config.alphaThreshold,
			brightness: config.brightness,
			contrast: config.contrast,
			imageScale: config.imageScale,
			invertAlpha: !!config.invertAlpha,
			sampleJitter: config.sampleJitter,
			pointSoftness: config.pointSoftness,
			onFrame: ({ fps: nextFps, particles: nextParticles }) => {
				setFps(nextFps);
				setParticles(nextParticles);
				onFpsRef.current?.({ fps: nextFps, particles: nextParticles });
			},
			onLoad: () => {
				setError('');
				onLoadRef.current?.();
			},
			onError: (err) => {
				const message =
					err?.message ||
					'Unable to load image. The server may not allow cross-origin access. Try downloading the image into particle-assets instead.';
				setError(message);
				onErrorRef.current?.(err);
			},
		};
	}, [config, src]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return undefined;
		instanceRef.current = createParticleObject({ canvas }, particleOptions);
		return () => {
			instanceRef.current?.destroy();
			instanceRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		src,
		config.count,
		config.initialFormation,
		config.crispText,
		config.rasterSize,
		rebuildKey,
	]);

	useEffect(() => {
		instanceRef.current?.setOptions(particleOptions);
	}, [particleOptions]);

	useEffect(() => {
		if (!morphCloud?.positions) return;
		instanceRef.current?.setHomes?.(morphCloud.positions, morphCloud.colors);
	}, [morphCloud]);

	useEffect(() => {
		const onVisibility = () => {
			if (document.hidden) return;
			instanceRef.current?.resize?.();
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => document.removeEventListener('visibilitychange', onVisibility);
	}, []);

	return (
		<div className="relative h-full w-full overflow-hidden rounded-2xl border border-zinc-800 bg-[#050506] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
			<div
				className="pointer-events-none absolute inset-0 opacity-70"
				style={{
					backgroundImage:
						'radial-gradient(ellipse 55% 45% at 50% 45%, rgba(16,185,129,0.14), transparent 60%), linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
					backgroundSize: 'auto, 28px 28px, 28px 28px',
				}}
			/>
			<canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

			<div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
				<div className="rounded-lg border border-zinc-800/90 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] text-zinc-300 backdrop-blur">
					FPS {fps || '—'} · {formatParticleCount(particles)} particles
				</div>
			</div>

			{!src ? (
				<div className="absolute inset-0 z-10 flex items-center justify-center p-6">
					<div className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950/90 p-6 text-center shadow-2xl backdrop-blur-md">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 ring-1 ring-emerald-400/30">
							<ImagePlus className="h-5 w-5 text-emerald-400" />
						</div>
						<h2 className="text-base font-semibold text-zinc-50">
							{hasAssets ? 'Select an asset to preview' : 'Add a logo to begin'}
						</h2>
						<p className="mt-2 text-sm leading-relaxed text-zinc-400">
							{hasAssets
								? 'Your library already has files. Click one on the left to convert it into particles.'
								: 'Drop an image anywhere, paste with Ctrl+V, or upload from the left panel.'}
						</p>

						<div className="mt-5 grid gap-2 text-left text-[12px] text-zinc-400">
							<div className="flex items-center gap-2 rounded-lg bg-zinc-900/80 px-3 py-2">
								<Upload className="h-3.5 w-3.5 text-emerald-400" />
								<span>1. Upload / drop / paste image</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg bg-zinc-900/80 px-3 py-2">
								<MousePointerClick className="h-3.5 w-3.5 text-emerald-400" />
								<span>2. Click asset → live particle preview</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg bg-zinc-900/80 px-3 py-2">
								<ClipboardPaste className="h-3.5 w-3.5 text-emerald-400" />
								<span>3. Tune controls on the right, then Export</span>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap justify-center gap-2">
							{hasAssets ? (
								<Button
									type="button"
									size="sm"
									className="h-9 bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
									onClick={() => onPickFirstAsset?.()}
								>
									Preview first asset
								</Button>
							) : (
								<Button
									type="button"
									size="sm"
									className="h-9 bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
									onClick={() => onUploadClick?.()}
								>
									Upload Asset
								</Button>
							)}
						</div>
					</div>
				</div>
			) : null}

			{error ? (
				<div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-red-500/30 bg-red-950/80 px-3 py-2 text-xs text-red-100">
					{error}
				</div>
			) : null}
		</div>
	);
}
