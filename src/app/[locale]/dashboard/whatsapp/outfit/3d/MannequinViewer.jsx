'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Columns2, Download, Footprints, PersonStanding, RotateCw, X } from 'lucide-react';
import { DEFAULT_BODY, HEM_LENGTHS, SHOE_TYPES, SKIN_COLORS } from '../config/outfit-config.js';
import { hemFromIndex, hemIndex } from '../engine/advice.js';
import { applyToNamedMeshes, createMannequin } from './mannequin.js';
import { createPerson } from './realPerson.js';

const VIEWS = { front: 0, side: Math.PI / 2, back: Math.PI };
// Aim a little below the waist so the feet clear the on-stage controls.
const TARGET = new THREE.Vector3(0, 0.78, 0);

/**
 * Studio viewer for the parametric body. Loaded only on this tab (next/dynamic, ssr:false).
 * Renders on demand, pauses off-screen / when the tab is hidden, caps pixel ratio at 2, and
 * disposes everything on unmount. `apiRef.current.capture()` → PNG Blob (save / share).
 */
export default function MannequinViewer({
	outfit,
	compareOutfit,
	compareOn,
	onToggleCompare,
	body = DEFAULT_BODY,
	onBody,
	hem,
	onHem,
	hemStatus,
	fit,
	shoeType,
	onShoeType,
	pantsType,
	tuck,
	topLoose,
	modelUrl,
	label,
	apiRef,
	compact = false,
	overlay = null,
}) {
	const t = useTranslations('outfitMatcher.viewer');
	const th = useTranslations('outfitMatcher.advice.hem');
	const tc = useTranslations('outfitMatcher.context');
	const hostRef = useRef(null);
	const engineRef = useRef(null);
	const [autoRotate, setAutoRotate] = useState(false);
	const [failed, setFailed] = useState(false);
	const [panel, setPanel] = useState(null); // 'body' | 'fit' | null

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;
		let renderer;
		try {
			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
		} catch {
			setFailed(true);
			return undefined;
		}
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		// Neutral tone mapping keeps garment colours true (ACES darkens and shifts navy / olive).
		renderer.toneMapping = THREE.NeutralToneMapping;
		renderer.toneMappingExposure = 1;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.domElement.className = 'wa-of-gl';
		host.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		// Soft studio reflections: fabric sheen and leather highlights read much more real.
		const pmrem = new THREE.PMREMGenerator(renderer);
		const envScene = new RoomEnvironment();
		const env = pmrem.fromScene(envScene, 0.04).texture;
		scene.environment = env;
		scene.environmentIntensity = 0.38;

		const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
		camera.position.set(0.3, 1.0, 5.1);
		scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa0a8, 0.55));
		const key = new THREE.DirectionalLight(0xffffff, 1.9);
		key.position.set(1.6, 3.4, 2.6);
		key.castShadow = true;
		key.shadow.mapSize.set(2048, 2048);
		key.shadow.radius = 8;
		key.shadow.bias = -0.0004;
		key.shadow.normalBias = 0.015;
		Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 2.2, bottom: -0.4, near: 0.5, far: 9 });
		scene.add(key);
		const rim = new THREE.DirectionalLight(0xffffff, 0.8);
		rim.position.set(-2.2, 2.2, -2.5);
		scene.add(rim);
		const ground = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.ShadowMaterial({ opacity: 0.2 }));
		ground.rotation.x = -Math.PI / 2;
		ground.receiveShadow = true;
		scene.add(ground);

		// Real human (Rocketbox) with the procedural mannequin as a fallback.
		const onChange = () => engineRef.current?.invalidate();
		const a = createPerson({ createFallback: createMannequin, onChange });
		const b = createPerson({ createFallback: createMannequin, onChange });
		scene.add(a.root);
		b.root.visible = false;
		scene.add(b.root);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.target.copy(TARGET);
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		controls.enablePan = false;
		controls.minDistance = 1.6;
		controls.maxDistance = 7;
		controls.minPolarAngle = 0.3;
		controls.maxPolarAngle = Math.PI / 2 + 0.04;
		controls.autoRotateSpeed = 1.4;
		controls.update();

		let raf = 0;
		let visible = true;
		let dirty = true;
		const tick = () => {
			raf = 0;
			const moving = controls.update();
			if (dirty || moving || controls.autoRotate) {
				renderer.render(scene, camera);
				dirty = false;
			}
			if ((moving || controls.autoRotate) && visible && !document.hidden) raf = requestAnimationFrame(tick);
		};
		const invalidate = () => {
			dirty = true;
			if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
		};
		controls.addEventListener('change', invalidate);

		const resize = () => {
			const w = host.clientWidth || 1;
			const h = host.clientHeight || 1;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			invalidate();
		};
		const ro = new ResizeObserver(resize);
		ro.observe(host);
		resize();
		const io = new IntersectionObserver(entries => {
			visible = entries.some(entry => entry.isIntersecting);
			if (visible) invalidate();
			else if (raf) {
				cancelAnimationFrame(raf);
				raf = 0;
			}
		});
		io.observe(host);
		const onVisibility = () => {
			if (document.hidden && raf) {
				cancelAnimationFrame(raf);
				raf = 0;
			} else if (!document.hidden) invalidate();
		};
		document.addEventListener('visibilitychange', onVisibility);

		let glb = null;
		engineRef.current = { renderer, scene, camera, controls, a, b, invalidate, setGlb: value => (glb = value), getGlb: () => glb };
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			controls.removeEventListener('change', invalidate);
			controls.dispose();
			a.dispose();
			b.dispose();
			ground.geometry.dispose();
			ground.material.dispose();
			env.dispose();
			pmrem.dispose();
			envScene.traverse?.(object => {
				if (object.isMesh) {
					object.geometry?.dispose();
					for (const m of [].concat(object.material || [])) m.dispose();
				}
			});
			glb?.traverse(object => {
				if (!object.isMesh) return;
				object.geometry?.dispose();
				for (const m of [].concat(object.material || [])) m.dispose();
			});
			renderer.dispose();
			renderer.forceContextLoss();
			renderer.domElement.remove();
			engineRef.current = null;
		};
	}, []);

	useEffect(() => {
		const engine = engineRef.current;
		if (!engine || !modelUrl) return undefined;
		let cancelled = false;
		import('three/addons/loaders/GLTFLoader.js')
			.then(({ GLTFLoader }) => new GLTFLoader().loadAsync(modelUrl))
			.then(gltf => {
				if (cancelled || !engineRef.current) return;
				engine.a.root.visible = false;
				engine.scene.add(gltf.scene);
				engine.setGlb(gltf.scene);
				applyToNamedMeshes(gltf.scene, outfit?.slots || {});
				engine.invalidate();
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [modelUrl]);

	// Live updates. The mannequin rebuilds its shells in a microtask; render right after.
	useEffect(() => {
		const engine = engineRef.current;
		if (!engine) return;
		const { a, b, camera, controls } = engine;
		const shape = { body, hem, fit, shoeType, pantsType, tuck: Boolean(tuck), topLoose: Boolean(topLoose) };
		a.update({ ...shape, slots: outfit?.slots || {}, topSlot: outfit?.topSlot || 'shirt' });
		const glb = engine.getGlb();
		if (glb) applyToNamedMeshes(glb, outfit?.slots || {});
		const comparing = Boolean(compareOn && compareOutfit);
		b.root.visible = comparing;
		if (comparing) b.update({ ...shape, slots: compareOutfit.slots || {}, topSlot: compareOutfit.topSlot || 'shirt' });
		a.root.position.x = comparing ? -0.4 : 0;
		b.root.position.x = 0.4;
		controls.minDistance = comparing ? 3 : 1.6;
		if (comparing && camera.position.distanceTo(controls.target) < 5) {
			camera.position.sub(controls.target).setLength(5.6).add(controls.target);
			controls.update();
		}
		queueMicrotask(() => engine.invalidate());
	}, [outfit, compareOutfit, compareOn, body, hem, fit, shoeType, pantsType, tuck, topLoose]);

	useEffect(() => {
		const engine = engineRef.current;
		if (!engine) return;
		engine.controls.autoRotate = autoRotate;
		engine.invalidate();
	}, [autoRotate]);

	useEffect(() => {
		if (!apiRef) return undefined;
		apiRef.current = {
			capture: () =>
				new Promise(resolve => {
					const engine = engineRef.current;
					if (!engine) return resolve(null);
					engine.renderer.render(engine.scene, engine.camera);
					engine.renderer.domElement.toBlob(blob => resolve(blob), 'image/png');
				}),
		};
		return () => {
			apiRef.current = null;
		};
	}, [apiRef]);

	const view = name => {
		const engine = engineRef.current;
		if (!engine) return;
		const { camera, controls } = engine;
		const distance = camera.position.distanceTo(controls.target);
		const angle = VIEWS[name];
		camera.position.set(Math.sin(angle) * distance, TARGET.y + 0.2, Math.cos(angle) * distance);
		controls.update();
		engine.invalidate();
	};

	const save = async () => {
		const blob = await apiRef?.current?.capture?.();
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'outfit.png';
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 2000);
	};

	const setBodyValue = (key, value) => onBody?.({ ...body, [key]: value });

	return (
		<div className="wa-of-stage3d" data-compact={compact || undefined}>
			<div className="wa-of-stage3d-canvas" ref={hostRef} role="img" aria-label={label}>
				{failed ? <p className="wa-of-viewer-msg">{t('error')}</p> : null}
			</div>

			<div className="wa-of-stage3d-top">
				<div className="wa-of-seg-mini" role="group" aria-label={t('views')}>
					{['front', 'side', 'back'].map(name => (
						<button key={name} type="button" onClick={() => view(name)}>
							{t(name)}
						</button>
					))}
				</div>
				<div className="wa-of-row-gap">
					<button type="button" className="wa-of-fab" data-active={autoRotate || undefined} aria-pressed={autoRotate} onClick={() => setAutoRotate(v => !v)} aria-label={t('autoRotate')} title={t('autoRotate')}>
						<RotateCw size={18} aria-hidden="true" />
					</button>
					{onToggleCompare ? (
						<button type="button" className="wa-of-fab" data-active={compareOn || undefined} aria-pressed={Boolean(compareOn)} onClick={onToggleCompare} aria-label={compareOn ? t('compareOff') : t('compare')} title={compareOn ? t('compareOff') : t('compare')}>
							<Columns2 size={18} aria-hidden="true" />
						</button>
					) : null}
					<button type="button" className="wa-of-fab" onClick={save} aria-label={t('screenshot')} title={t('screenshot')}>
						<Download size={18} aria-hidden="true" />
					</button>
				</div>
			</div>
			{overlay}
			{compareOn ? (
				<div className="wa-of-stage3d-tags" aria-hidden="true">
					<span>{t('outfitA')}</span>
					<span>{compareOutfit ? t('outfitB') : t('compareHint')}</span>
				</div>
			) : null}

			{panel ? (
				<div className="wa-of-stage3d-panel" role="dialog" aria-label={panel === 'body' ? t('body') : t('shoesFit')}>
					<div className="wa-of-panel-head">
						<p className="wa-of-panel-title">{panel === 'body' ? t('body') : t('shoesFit')}</p>
						<button type="button" className="wa-of-icon-btn" onClick={() => setPanel(null)} aria-label={t('close')}>
							<X size={18} aria-hidden="true" />
						</button>
					</div>
					{panel === 'body' ? (
						<div className="wa-of-sliders">
							<Slider label={t('height')} unit="cm" min={145} max={205} value={body.height} onChange={v => setBodyValue('height', v)} />
							<Slider label={t('weight')} unit="kg" min={45} max={140} value={body.weight} onChange={v => setBodyValue('weight', v)} />
							<Slider label={t('hips')} min={-1} max={1} step={0.1} value={body.hips} onChange={v => setBodyValue('hips', v)} format={v => t(v < -0.3 ? 'narrow' : v > 0.3 ? 'wide' : 'average')} />
							<Slider label={t('shoulders')} min={-1} max={1} step={0.1} value={body.shoulders} onChange={v => setBodyValue('shoulders', v)} format={v => t(v < -0.3 ? 'narrow' : v > 0.3 ? 'wide' : 'average')} />
							<div className="wa-of-field">
								<span className="wa-of-label">{t('skin')}</span>
								<div className="wa-of-skin-row" role="radiogroup" aria-label={t('skin')}>
									{Object.entries(SKIN_COLORS).map(([id, hex]) => (
										<button key={id} type="button" role="radio" aria-checked={body.skin === id} className="wa-of-skin" data-active={body.skin === id || undefined} style={{ '--swatch': hex }} onClick={() => setBodyValue('skin', id)} aria-label={t(`skins.${id}`)} title={t(`skins.${id}`)} />
									))}
								</div>
							</div>
							<button type="button" className="wa-of-btn wa-of-btn-ghost" onClick={() => onBody?.({ ...DEFAULT_BODY })}>
								{t('resetBody')}
							</button>
						</div>
					) : (
						<div className="wa-of-sliders">
							{onShoeType ? (
								<label className="wa-of-field">
									<span className="wa-of-label">{tc('shoeType')}</span>
									<select className="wa-of-input wa-of-select" value={shoeType} onChange={event => onShoeType(event.target.value)}>
										{SHOE_TYPES.map(type => (
											<option key={type} value={type}>
												{tc(`shoeTypes.${type}`)}
											</option>
										))}
									</select>
								</label>
							) : null}
							<label className="wa-of-field">
								<span className="wa-of-label">
									{th('slider')}: <strong>{th(`lengths.${hem}`)}</strong>
								</span>
								<input className="wa-of-range" type="range" min={0} max={HEM_LENGTHS.length - 1} step={1} value={hemIndex(hem)} aria-valuetext={th(`lengths.${hem}`)} onChange={event => onHem?.(hemFromIndex(Number(event.target.value)))} />
								<span className="wa-of-hem-scale" aria-hidden="true">
									{HEM_LENGTHS.map(length => (
										<span key={length} data-active={length === hem || undefined}>
											{th(`lengths.${length}`)}
										</span>
									))}
								</span>
							</label>
							{hemStatus ? (
								<p className="wa-of-status" data-status={hemStatus}>
									{th(`status.${hemStatus}`)}
								</p>
							) : null}
						</div>
					)}
				</div>
			) : null}

			<div className="wa-of-stage3d-bottom">
				<button type="button" className="wa-of-pill-btn" aria-expanded={panel === 'body'} onClick={() => setPanel(p => (p === 'body' ? null : 'body'))}>
					<PersonStanding size={17} aria-hidden="true" />
					{t('body')}
				</button>
				<button type="button" className="wa-of-pill-btn" aria-expanded={panel === 'fit'} onClick={() => setPanel(p => (p === 'fit' ? null : 'fit'))}>
					<Footprints size={17} aria-hidden="true" />
					{t('shoesFit')}
				</button>
			</div>
		</div>
	);
}

function Slider({ label, unit, min, max, step = 1, value, onChange, format }) {
	const shown = format ? format(value) : `${value}${unit ? ` ${unit}` : ''}`;
	return (
		<label className="wa-of-field">
			<span className="wa-of-slider-head">
				<span className="wa-of-label">{label}</span>
				<span className="wa-of-slider-value">{shown}</span>
			</span>
			<input className="wa-of-range" type="range" min={min} max={max} step={step} value={value} aria-valuetext={shown} onChange={event => onChange(Number(event.target.value))} />
		</label>
	);
}
