import { DEFAULT_PARTICLE_CONFIG } from './particle-config';

const ALWAYS_INCLUDE = new Set(['src', 'count']);

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
	'orbit',
	'zoom',
	'autoRotate',
	'autoRotateSpeed',
	'fov',
	'cameraDistance',
];

function shouldInclude(key, value) {
	if (ALWAYS_INCLUDE.has(key)) return value !== undefined && value !== null && value !== '';
	if (typeof value === 'boolean') return value !== DEFAULT_PARTICLE_CONFIG[key];
	if (typeof value === 'number') return value !== DEFAULT_PARTICLE_CONFIG[key];
	if (typeof value === 'string') return value !== (DEFAULT_PARTICLE_CONFIG[key] ?? '');
	return false;
}

function formatValue(value) {
	if (typeof value === 'string') return `"${value}"`;
	if (typeof value === 'boolean' || typeof value === 'number') return String(value);
	return JSON.stringify(value);
}

function collectProps(config, src, { includeAll = false } = {}) {
	const merged = { ...DEFAULT_PARTICLE_CONFIG, ...config, src };
	const props = [];
	for (const key of EXPORTABLE_KEYS) {
		const value = key === 'src' ? src : merged[key];
		if (key === 'color' && merged.useOriginalColors && !includeAll) continue;
		if (!includeAll && !shouldInclude(key, value) && key !== 'src' && key !== 'count') continue;
		if (includeAll || key === 'src' || key === 'count' || shouldInclude(key, value)) {
			props.push([key, value ?? (key === 'src' ? '' : DEFAULT_PARTICLE_CONFIG[key])]);
		}
	}
	if (!props.find(([k]) => k === 'src')) props.unshift(['src', src || '']);
	if (!props.find(([k]) => k === 'count')) props.splice(1, 0, ['count', merged.count]);
	return props;
}

function propsToJsx(props, indent = '      ') {
	return props.map(([key, value]) => `${indent}${key}={${formatValue(value)}}`).join('\n');
}

export function generateReactCode(config, src) {
	const props = collectProps(config, src);
	return `import ParticleObject from "@/components/canvasui/ParticleObject";

export function ParticleHero() {
  return (
    <ParticleObject
${propsToJsx(props)}
    />
  );
}`;
}

export function generateNextCode(config, src) {
	const props = collectProps(config, src);
	return `"use client";

import ParticleObject from "@/components/canvasui/ParticleObject";

export default function ParticleHero() {
  return (
    <div className="relative h-screen w-full">
      <ParticleObject
${propsToJsx(props, '        ')}
      />
    </div>
  );
}`;
}

export function generateVanillaCode(config, src) {
	const props = collectProps(config, src);
	const obj = Object.fromEntries(props);
	return `import { createParticleObject } from "@/components/canvasui/ParticleObject";

const canvas = document.querySelector("#particle-canvas");
const instance = createParticleObject({ canvas }, ${JSON.stringify(obj, null, 2)});

// later: instance.destroy();`;
}

export function generateFullComponent(config, src, componentName = 'MyParticleHero') {
	const props = collectProps(config, src);
	return `"use client";

import ParticleObject from "@/components/canvasui/ParticleObject";

export default function ${componentName}() {
  return (
    <div className="relative h-screen w-full">
      <ParticleObject
${propsToJsx(props, '        ')}
      />
    </div>
  );
}`;
}

/**
 * Large copy-paste package: setup + deps + full props hero component.
 * ParticleObject.jsx itself is a separate ~900-line engine file you copy once.
 */
export function generateStandalonePackage(config, src, componentName = 'MyParticleHero') {
	const props = collectProps(config, src, { includeAll: true });
	const assetPath = src || '/particle-assets/images/your-logo.png';

	return `/*
========================================================
PARTICLE HERO — FULL INSTALL PACKAGE
========================================================
This is the big setup you copy into your real website.

What you need:
1) Three.js dependency
2) The ParticleObject engine file (large, copy once)
3) Your logo asset in /public
4) The hero component below (uses your current studio settings)

--------------------------------------------------------
STEP 1 — Install dependency
--------------------------------------------------------
npm install three

--------------------------------------------------------
STEP 2 — Copy the engine (ONE TIME)
--------------------------------------------------------
From this project, copy:
  src/components/canvasui/ParticleObject.jsx
into your target project at the same path:
  src/components/canvasui/ParticleObject.jsx

That file is the actual particle engine (shaders + sampling + interaction).
It is intentionally large. You copy it once, then reuse it everywhere.

--------------------------------------------------------
STEP 3 — Put your asset in public
--------------------------------------------------------
Example:
  public${assetPath}

--------------------------------------------------------
STEP 4 — Add this hero component
--------------------------------------------------------
Save as: src/components/MyParticleHero.jsx
*/

"use client";

import ParticleObject from "@/components/canvasui/ParticleObject";

export default function ${componentName}() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <ParticleObject
${propsToJsx(props, '        ')}
      />
    </section>
  );
}

/*
--------------------------------------------------------
STEP 5 — Use it in a page
--------------------------------------------------------
// app/page.jsx  (or any route)
import MyParticleHero from "@/components/MyParticleHero";

export default function Page() {
  return <MyParticleHero />;
}

--------------------------------------------------------
NOTES
--------------------------------------------------------
- Keep background="" for transparent canvas over your page background.
- Tune count/size/strength in Particle Studio, then re-copy this package.
- For morph between multiple logos, keep using Particle Studio sessions;
  the exported hero above is the production single-asset embed.
*/`;
}

export function generateConfigJson(scene) {
	return JSON.stringify(scene, null, 2);
}
