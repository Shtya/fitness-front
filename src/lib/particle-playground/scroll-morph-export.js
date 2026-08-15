/**
 * NL3 / scroll-morph export mode.
 * Same colored Studio particles, driven by external progress 0..1
 * (hold → dissolve/explode → reassemble).
 */

import { DEFAULT_PARTICLE_CONFIG } from './particle-config';

export const SCROLL_MORPH_FOLDER_NAME = 'particle-scroll-morph';

const EXPORTABLE_KEYS = [
	'src',
	'count',
	'size',
	'sizeVariance',
	'color',
	'radius',
	'strength',
	'swirl',
	'spring',
	'damping',
	'drift',
	'background',
	'scale',
	'xOffset',
	'yOffset',
	'floatIntensity',
	'rotationIntensity',
	'floatSpeed',
	'fov',
	'cameraDistance',
	'cursorEnabled',
	'interactionMode',
	'crispText',
	'rasterSize',
	'sampleJitter',
	'pointSoftness',
	'alphaThreshold',
	'brightness',
	'contrast',
	'imageScale',
	'invertAlpha',
];

const DEFAULT_WINDOWS = [
	{ id: 'holdIn', range: [0, 0.12], kind: 'hold', from: 'formA', to: 'formA' },
	{ id: 'dissolve', range: [0.12, 0.48], kind: 'dissolve', from: 'formA', to: 'dissolve' },
	{ id: 'reassemble', range: [0.48, 0.88], kind: 'reassemble', from: 'dissolve', to: 'formA' },
	{ id: 'holdOut', range: [0.88, 1], kind: 'hold', from: 'formA', to: 'formA' },
];

function formatValue(value) {
	if (typeof value === 'string') return `"${value}"`;
	if (typeof value === 'boolean' || typeof value === 'number') return String(value);
	return JSON.stringify(value);
}

function collectScrollProps(config, src) {
	const merged = { ...DEFAULT_PARTICLE_CONFIG, ...config, src };
	const props = [];
	for (const key of EXPORTABLE_KEYS) {
		const value = key === 'src' ? src : merged[key];
		if (key === 'color' && merged.useOriginalColors !== false && !merged.color) continue;
		if (value === undefined || value === null) continue;
		props.push([key, value]);
	}
	return props;
}

function propsToObjectLiteral(props, indent = '        ') {
	return props.map(([key, value]) => `${indent}${key}: ${formatValue(value)},`).join('\n');
}

function sniffExt(bytes, fallback = 'png') {
	if (!bytes || bytes.length < 4) return fallback;
	if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
	if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'webp';
	const head = new TextDecoder().decode(bytes.slice(0, 80)).toLowerCase();
	if (head.includes('<svg')) return 'svg';
	return fallback;
}

export function publicSrcFromStudio(src) {
	if (!src || String(src).startsWith('blob:')) {
		return '/particle-assets/images/form-a.png';
	}
	return String(src);
}

export function buildScrollMorphManifest(config, src) {
	const merged = { ...DEFAULT_PARTICLE_CONFIG, ...config };
	const publicSrc = publicSrcFromStudio(src);
	return {
		version: 1,
		mode: 'scroll-morph',
		target: 'nl3',
		particle: {
			count: merged.count,
			size: merged.size,
			sizeVariance: merged.sizeVariance,
			color: merged.useOriginalColors !== false && !merged.color ? '' : merged.color || '',
			radius: merged.radius,
			strength: merged.strength,
			swirl: merged.swirl,
			spring: merged.spring,
			damping: merged.damping,
			drift: merged.drift,
			background: merged.background || '',
			scale: merged.scale,
			xOffset: merged.xOffset,
			yOffset: merged.yOffset,
			floatIntensity: merged.floatIntensity,
			rotationIntensity: merged.rotationIntensity,
			floatSpeed: merged.floatSpeed,
			orbit: false,
			zoom: false,
			autoRotate: false,
			fov: merged.fov,
			cameraDistance: merged.cameraDistance,
			cursorEnabled: merged.cursorEnabled,
			interactionMode: merged.interactionMode,
			crispText: merged.crispText,
			rasterSize: merged.rasterSize,
			sampleJitter: merged.sampleJitter,
			pointSoftness: merged.pointSoftness,
			alphaThreshold: merged.alphaThreshold,
			brightness: merged.brightness,
			contrast: merged.contrast,
			imageScale: merged.imageScale,
			invertAlpha: merged.invertAlpha,
			useOriginalColors: merged.useOriginalColors !== false,
		},
		scroll: {
			progressSpace: '0..1',
			easing: merged.morphEasing || 'power2.inOut',
			dispersion: 0.72,
			windows: DEFAULT_WINDOWS,
		},
		forms: [
			{
				id: 'formA',
				role: 'primary',
				src: publicSrc,
				sample: { kind: 'runtime' },
			},
			{
				id: 'dissolve',
				role: 'procedural',
				generator: 'gaussianScatter',
				seed: 1,
				scale: 2.35,
				sample: { kind: 'runtime' },
			},
		],
		notes: [
			'Copy assets/form-a.* into public at forms[0].src',
			'Mount <ScrollMorphHero progress={local0to1} />',
			'Same colored Studio particles; do not rewrite ParticleObject',
		],
	};
}

export function generateScrollMorphDriverSource() {
	return `/** Scroll morph driver — lerp formA ↔ procedural dissolve via setHomes. */

export const easeFunctions = {
  linear: (t) => t,
  "power2.inOut": (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  "power2.out": (t) => 1 - (1 - t) * (1 - t),
  "power2.in": (t) => t * t,
};

export function getEase(name = "power2.inOut") {
  return easeFunctions[name] || easeFunctions["power2.inOut"];
}

export function lerpClouds(from, to, t) {
  const count = Math.min(from.positions.length, to.positions.length);
  const positions = new Float32Array(count);
  const colors = new Float32Array(count);
  const u = Math.max(0, Math.min(1, t));
  for (let i = 0; i < count; i++) {
    positions[i] = from.positions[i] + (to.positions[i] - from.positions[i]) * u;
    if (from.colors && to.colors) {
      colors[i] = from.colors[i] + (to.colors[i] - from.colors[i]) * u;
    } else if (from.colors) {
      colors[i] = from.colors[i];
    }
  }
  return { positions, colors };
}

/** Deterministic explode cloud — keeps logo colors while scattering positions. */
export function buildDissolveCloud(formA, { scale = 2.35, seed = 1 } = {}) {
  const n = formA.positions.length / 3;
  const positions = new Float32Array(formA.positions.length);
  const colors = formA.colors
    ? formA.colors.slice()
    : new Float32Array(formA.positions.length);
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const u = rnd();
    const v = rnd();
    const w = rnd();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = scale * Math.cbrt(w);
    positions[i3] = Math.sin(phi) * Math.cos(theta) * r;
    positions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    positions[i3 + 2] = Math.cos(phi) * r * 0.55;
  }
  return { positions, colors };
}

export function sampleWindowProgress(progress, windows) {
  const p = Math.max(0, Math.min(1, progress));
  const list = windows?.length ? windows : [];
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const [a, b] = w.range;
    if (p >= a && (p <= b || i === list.length - 1)) {
      const local = b <= a ? 1 : (p - a) / (b - a);
      return { window: w, local: Math.max(0, Math.min(1, local)) };
    }
  }
  const last = list[list.length - 1];
  return { window: last, local: 1 };
}

export function cloudAtProgress(progress, forms, windows, easing = "power2.inOut") {
  const ease = getEase(easing);
  const { window: w, local } = sampleWindowProgress(progress, windows);
  if (!w) return forms.formA;
  const from = forms[w.from] || forms.formA;
  const to = forms[w.to] || forms.formA;
  if (w.kind === "hold" || from === to) return from;
  return lerpClouds(from, to, ease(local));
}
`;
}

export function generateScrollMorphHeroSource(config, src) {
	const publicSrc = publicSrcFromStudio(src);
	const props = collectScrollProps(config, publicSrc);
	// src is applied dynamically; strip static src from baked props
	const propLines = propsToObjectLiteral(props.filter(([k]) => k !== 'src'));

	return `"use client";

import { useEffect, useRef } from "react";
import { createParticleObject } from "./ParticleObject";
import { buildDissolveCloud, cloudAtProgress } from "./scroll-morph-driver";
import manifest from "./scroll-morph-manifest";

/**
 * Scroll-driven Studio particles (NL3 / landing scroll stories).
 *
 * @param {number} progress section-local 0..1 — hold → dissolve → reassemble
 * @param {string} [src] override image URL (defaults to manifest forms[0].src)
 */
export default function ScrollMorphHero({
  progress = 0,
  src,
  className,
  style,
  windows,
  easing,
}) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);
  const formsRef = useRef(null);
  const progressRef = useRef(progress);
  const windowsRef = useRef(windows);
  const easingRef = useRef(easing);
  progressRef.current = progress;
  windowsRef.current = windows;
  easingRef.current = easing;

  const assetSrc = src || manifest?.forms?.[0]?.src || ${JSON.stringify(publicSrc)};
  const scrollWindows = windows || manifest?.scroll?.windows;
  const scrollEasing = easing || manifest?.scroll?.easing || "power2.inOut";

  function applyProgress(instance, p) {
    const forms = formsRef.current;
    if (!forms || !instance) return;
    const w = windowsRef.current || scrollWindows;
    const e = easingRef.current || scrollEasing;
    const cloud = cloudAtProgress(p, forms, w, e);
    if (cloud?.positions) instance.setHomes(cloud.positions, cloud.colors);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const instance = createParticleObject(
      { canvas },
      {
${propLines}
        src: assetSrc,
        orbit: false,
        zoom: false,
        autoRotate: false,
        initialFormation: false,
        onLoad: (api) => {
          const homes = api.getHomes();
          const colors = api.getColors();
          if (!homes) return;
          const formA = {
            positions: homes,
            colors: colors || new Float32Array(homes.length),
          };
          const dissolve = buildDissolveCloud(formA, { scale: 2.35, seed: 1 });
          formsRef.current = { formA, dissolve };
          applyProgress(api, progressRef.current);
        },
      },
    );
    instanceRef.current = instance;

    return () => {
      instance?.destroy?.();
      instanceRef.current = null;
      formsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetSrc]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !formsRef.current) return;
    applyProgress(instance, progress);
  }, [progress, scrollWindows, scrollEasing]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100%",
        overflow: "hidden",
        background: "transparent",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
        }}
      />
    </div>
  );
}
`;
}

export function generateScrollMorphReadme(config, src) {
	const publicSrc = publicSrcFromStudio(src);
	return `# Particle Scroll Morph (NL3)

Exported from **So7baFit Particle Studio** for scroll stories
(hold → dissolve/explode → reassemble) with the **same colored particles**.

## What’s in this folder

| File | Role |
|------|------|
| \`ParticleObject.jsx\` | Studio engine (\`createParticleObject\`, \`setHomes\`, \`getColors\`) |
| \`ScrollMorphHero.jsx\` | Mount this — pass \`progress={0..1}\` |
| \`scroll-morph-driver.js\` | Lerp + procedural dissolve |
| \`scroll-morph-manifest.js\` | Manifest (windows, particle props, asset path) |
| \`scroll-morph.json\` | Same manifest as JSON (debug) |
| \`assets/form-a.*\` | The image you used in Studio (copy into \`public\`) |
| \`README.md\` | This file |

## Install

\`\`\`bash
npm install three@^0.185.1
\`\`\`

## Asset

1. Copy \`assets/form-a.*\` → your site \`public\` folder.
2. Final URL must match \`forms[0].src\` in \`scroll-morph.json\`
   (default: \`${publicSrc}\`).

If Studio used a blob URL, we rewrote it to \`${publicSrc}\` —
put the PNG there.

## Use (Next.js / Dragify NL3)

\`\`\`jsx
import dynamic from "next/dynamic";

const ScrollMorphHero = dynamic(() => import("./ScrollMorphHero"), { ssr: false });

// Map page scroll into section-local 0..1 for this beat
export function PartnersBeat({ localProgress }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ScrollMorphHero progress={localProgress} />
    </div>
  );
}
\`\`\`

\`localProgress\` = 0 at section enter, 1 at section exit.
Inside the package, windows morph:

- \`0 → ~0.12\` hold form
- \`~0.12 → ~0.48\` dissolve / explode (colors kept)
- \`~0.48 → ~0.88\` reassemble
- \`~0.88 → 1\` hold

## Do not

- Rewrite \`ParticleObject.jsx\`
- Feed these clouds into a different R3F buffer with a different particle count
- Use the old single-hero export when you need scroll explode

## vs regular \`particle-animation\` export

| | \`particle-animation\` | \`particle-scroll-morph\` |
|--|----------------------|--------------------------|
| Mount | \`<MyParticleHero />\` | \`<ScrollMorphHero progress={t} />\` |
| Scroll explode | No | Yes |
| Colors | Studio | Studio |

That’s the whole install.
`;
}

/**
 * Build downloadable file list (text + optional binary asset).
 * @returns {Promise<{ name: string, content: string | Uint8Array }[]>}
 */
export async function generateScrollMorphFiles(config, src, engineSource) {
	const publicSrc = publicSrcFromStudio(src);
	const manifest = buildScrollMorphManifest(config, src);
	const files = [
		{ name: 'README.md', content: generateScrollMorphReadme(config, src) },
		{
			name: 'ParticleObject.jsx',
			content:
				engineSource ||
				'/* Missing engine — re-open Export while Studio is running */\n',
		},
		{ name: 'scroll-morph-driver.js', content: generateScrollMorphDriverSource() },
		{ name: 'ScrollMorphHero.jsx', content: generateScrollMorphHeroSource(config, src) },
		{
			name: 'scroll-morph-manifest.js',
			content: `/** Auto-generated scroll-morph manifest */\nexport default ${JSON.stringify(manifest, null, 2)};\n`,
		},
		{ name: 'scroll-morph.json', content: JSON.stringify(manifest, null, 2) },
	];

	// Embed the live Studio image when fetchable (blob or same-origin)
	if (src) {
		try {
			const res = await fetch(src);
			if (res.ok) {
				const buf = new Uint8Array(await res.arrayBuffer());
				const ext = sniffExt(buf, publicSrc.split('.').pop() || 'png');
				files.push({ name: `assets/form-a.${ext}`, content: buf });
				// Keep manifest src pointing at public path; README explains copy
			}
		} catch {
			/* asset optional — user copies manually */
		}
	}

	return files;
}
