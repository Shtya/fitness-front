import { DEFAULT_PARTICLE_CONFIG } from './particle-config';

const ALWAYS_INCLUDE = new Set(['src', 'count']);

/** Every studio prop that affects look / hover / sampling must be exportable. */
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
	'cursorEnabled',
	'interactionMode',
	'initialFormation',
	'formationDuration',
	'formationStrength',
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
		if (key === 'color' && merged.useOriginalColors !== false && !merged.color && !includeAll) {
			continue;
		}
		if (!includeAll && !shouldInclude(key, value) && key !== 'src' && key !== 'count') continue;
		if (includeAll || key === 'src' || key === 'count' || shouldInclude(key, value)) {
			props.push([key, value ?? (key === 'src' ? '' : DEFAULT_PARTICLE_CONFIG[key])]);
		}
	}
	if (!props.find(([k]) => k === 'src')) props.unshift(['src', src || '']);
	if (!props.find(([k]) => k === 'count')) props.splice(1, 0, ['count', merged.count]);
	// Match Studio: empty color = original image colors
	if (merged.useOriginalColors !== false && !merged.color) {
		const colorIdx = props.findIndex(([k]) => k === 'color');
		if (colorIdx >= 0) props.splice(colorIdx, 1);
	}
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

function snapshotLines(config = {}, src = '') {
	const merged = { ...DEFAULT_PARTICLE_CONFIG, ...config, src };
	const keys = [
		'src',
		'count',
		'size',
		'crispText',
		'rasterSize',
		'cursorEnabled',
		'interactionMode',
		'radius',
		'strength',
		'swirl',
		'spring',
		'damping',
		'drift',
		'scale',
		'cameraDistance',
		'fov',
		'floatIntensity',
		'rotationIntensity',
		'background',
		'alphaThreshold',
		'contrast',
		'brightness',
		'pointSoftness',
		'sampleJitter',
	];
	return keys
		.map((k) => `- \`${k}\`: \`${formatValue(merged[k])}\``)
		.join('\n');
}

/**
 * Full install guide so the website matches Particle Studio 1:1.
 */
export function generateInstallReadme(config, src) {
	const assetPath = src || '/particle-assets/images/your-logo.png';
	const assetFile = String(assetPath).split('/').pop() || 'your-logo.png';
	const merged = { ...DEFAULT_PARTICLE_CONFIG, ...config };

	return `# Particle Animation — README

Exported from **So7baFit Particle Studio**.
This package is meant to look **exactly** like the Studio preview:
same density, same crisp text/icons, same hover push, same camera, same colors.

If it looked different on your website before, you almost always missed one of:
container height, \`three\` version, image path, or studio props (especially \`crispText\` / hover).

---

## 1) What’s in this folder

| File | Role |
|------|------|
| \`ParticleObject.jsx\` | The engine (WebGL + sampling + hover physics). **Do not rewrite.** |
| \`MyParticleHero.jsx\` | Your Studio settings baked as props. This is what you mount. |
| \`particle-scene.json\` | Full scene snapshot (debug / re-import). |
| \`README.md\` | This guide. |

All files sit **in one flat folder** (no nested \`src/...\` paths).

---

## 2) Install dependency (required)

\`\`\`bash
npm install three@^0.185.1
\`\`\`

Use a modern \`three\` (r160+). Old versions break \`three/addons/...\` imports inside \`ParticleObject.jsx\`.

React + ReactDOM are assumed (Next.js App Router, Pages Router, Vite, CRA).

---

## 3) Copy the folder into your project

Example:

\`\`\`text
your-site/
  public/
    particle-assets/
      images/
        ${assetFile}          ← put THE SAME image you used in Studio
  src/
    components/
      particle-animation/     ← paste THIS whole folder here
        ParticleObject.jsx
        MyParticleHero.jsx
        particle-scene.json
        README.md
\`\`\`

Keep \`ParticleObject.jsx\` and \`MyParticleHero.jsx\` **next to each other**
(the hero imports \`./ParticleObject\`).

---

## 4) Put the image in \`public/\`

Studio \`src\` was:

\`\`\`text
${assetPath}
\`\`\`

So the file must exist at:

\`\`\`text
public${assetPath}
\`\`\`

Rules for a 1:1 match:
1. Use the **exact same PNG** you previewed in Studio (same crop, same glow removal, same resolution).
2. Path in \`MyParticleHero.jsx\` (\`src={...}\`) must match the public URL.
3. Prefer transparent PNG. Soft bloom baked into the image will look mushy as particles.

If you move the image, update the \`src\` prop only.

---

## 5) Mount it on a page

### Next.js App Router (\`app/...\`)

\`MyParticleHero.jsx\` already has \`"use client"\`.

\`\`\`jsx
import MyParticleHero from "@/components/particle-animation/MyParticleHero";

export default function Page() {
  return <MyParticleHero />;
}
\`\`\`

### Next.js Pages Router (\`pages/...\`)

\`"use client"\` is ignored (harmless). Import normally:

\`\`\`jsx
import MyParticleHero from "../components/particle-animation/MyParticleHero";

export default function Home() {
  return <MyParticleHero />;
}
\`\`\`

### Vite / CRA

Same import. Ensure the file extension resolves (\`.jsx\`).

---

## 6) CRITICAL: container size (most common “looks different” bug)

\`ParticleObject\` draws on a \`<canvas>\` with \`position: absolute; inset: 0\`.
If the parent has **no height**, the canvas collapses and the scene looks tiny / cropped / wrong.

\`MyParticleHero.jsx\` forces a full-viewport box with **inline styles** (works even without Tailwind):

- width: 100%
- height: 100vh
- overflow: hidden
- dark background like Studio (\`#050506\`)
- ParticleObject stretched with \`position: absolute; inset: 0; width/height: 100%\`

Do **not** wrap it in a zero-height div, a collapsed grid cell, or a card without \`min-height\`.

Good:

\`\`\`jsx
<div style={{ height: "100vh" }}>
  <MyParticleHero />
</div>
\`\`\`

Bad:

\`\`\`jsx
<div> {/* no height */}
  <MyParticleHero />
</div>
\`\`\`

---

## 7) Hover / interaction (must match Studio)

These props are baked into \`MyParticleHero.jsx\` from your Studio session:

- \`cursorEnabled={${merged.cursorEnabled !== false}}\`
- \`interactionMode="${merged.interactionMode || 'push'}"\`
- \`radius\`, \`strength\`, \`swirl\`, \`spring\`, \`damping\`

Checklist if hover does nothing:
1. \`cursorEnabled\` must be \`true\`
2. \`strength\` must be \`> 0\`
3. Pointer must be over the **canvas** (not covered by another transparent overlay / nav)
4. OS “reduce motion” can soften interaction — test with it off
5. Don’t remount the component every frame (that resets physics)

---

## 8) Crisp text / icons (must match Studio Optimize)

If you used **Optimize Text & Icons** in Studio, export includes:

- \`crispText={true}\`
- high \`rasterSize\` (e.g. 1920)
- denser \`count\`
- hard points (\`pointSoftness={0}\`, \`sampleJitter={0}\`)

If you omit these (or use an old export), the site will look sandy / blurry even with the same PNG.

---

## 9) Background & colors

- Studio often uses transparent WebGL clear (\`background=""\`) over a dark page.
- Hero section background is set to \`#050506\` to match Studio chrome.
- Empty / omitted \`color\` = use **original image colors** (same as Studio “Use Original Image Colors”).
- If you force a hex \`color\`, the whole cloud tints — that alone can look “totally different”.

---

## 10) Your exported settings snapshot

${snapshotLines(config, src)}

These values are also applied as JSX props in \`MyParticleHero.jsx\`.
**Do not delete props** if you want a Studio match — change them only when you intend to.

---

## 11) Quick verify checklist (1:1 with Studio)

1. \`npm ls three\` → modern version installed  
2. Image exists at \`public${assetPath}\`  
3. Hero section is full viewport height  
4. Open page → particle count / density feels like Studio  
5. Hover pushes particles  
6. Text/icons stay readable if you exported with crisp mode  
7. No extra CSS filters / mix-blend / transforms on the wrapper  

---

## 12) What this package does NOT include

- Multi-logo **morph timeline** playback (Studio-only for now). Export is the live single-formation hero.
- Lenis / scroll-story pages (different product).
- Server APIs from Particle Studio.

To change the look later: tweak in Particle Studio → Export → Download Folder again.

---

## 13) Minimal mental model

\`\`\`text
PNG in /public
   → ParticleObject samples pixels into points
   → props control size / hover / camera / crisp sampling
   → parent must give the canvas real width + height
\`\`\`

That’s the whole install. Keep the folder together, install \`three\`, mount \`MyParticleHero\`, match the image path — and it should match Studio.
`;
}

/**
 * Hero component for the flat download folder (imports ./ParticleObject).
 * Inline styles so it matches Studio even without Tailwind.
 */
export function generatePortableHero(config, src, componentName = 'MyParticleHero') {
	const props = collectProps(config, src, { includeAll: true });
	const bg =
		config?.background && String(config.background).trim()
			? String(config.background)
			: '#050506';

	return `"use client";

import ParticleObject from "./ParticleObject";

/**
 * Drop-in hero exported from Particle Studio.
 * Keep this file next to ParticleObject.jsx.
 * Parent must not collapse height — this section is 100vh by default.
 */
export default function ${componentName}() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        minHeight: "100vh",
        overflow: "hidden",
        background: "${bg}",
      }}
    >
      <ParticleObject
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
${propsToJsx(props, '        ')}
      />
    </section>
  );
}
`;
}

/**
 * Ready-to-drop file set — flat folder (no nested src/ paths).
 * @param {string} engineSource full ParticleObject.jsx source
 */
export function generatePortableFiles(config, src, scene, engineSource) {
	const readme = generateInstallReadme(config, src);
	const files = [
		{
			name: 'README.md',
			content: readme,
		},
		{
			name: 'INSTALL.md',
			content: readme,
		},
		{
			name: 'ParticleObject.jsx',
			content:
				engineSource ||
				'/* Missing engine — re-open Code modal while the Studio is running */\n',
		},
		{
			name: 'MyParticleHero.jsx',
			content: generatePortableHero(config, src),
		},
		{
			name: 'particle-scene.json',
			content: generateConfigJson(scene),
		},
	];
	return files;
}

/** One clipboard-friendly blob: all package files separated clearly. */
export function generatePortableClipboard(files) {
	return files
		.map(
			(f) =>
				`${'='.repeat(64)}\nFILE: ${f.name}\n${'='.repeat(64)}\n\n${f.content}\n`,
		)
		.join('\n');
}
