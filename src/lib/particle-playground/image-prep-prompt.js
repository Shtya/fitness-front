export const IMAGE_PREP_PROMPT = `You are an expert image cleanup artist preparing a logo/mark for a PARTICLE MORPHING system (WebGL).

The final PNG will be sampled into thousands of particles. Bad edges, missing pieces, compression artifacts, or leftover backgrounds will destroy the morph quality.

I am attaching one source image. Fix it completely and return ONE final master PNG I can upload directly into the particle tool.

========================
PRIMARY GOAL
========================
Produce a clean, complete, high-resolution, transparent logo that looks perfect when converted into particles and when morphing between shapes.

========================
REPAIR & RECONSTRUCTION (VERY IMPORTANT)
========================
If the source has ANY of these problems, fix them intelligently:
- Cropped / cut off edges (missing left/right/top/bottom parts of the logo)
- Incomplete letters, icons, or shapes
- Soft/blurry, pixelated, or low-resolution areas
- JPEG compression artifacts, ringing, or color bleeding
- Jagged, broken, or dirty outlines
- Uneven thickness in strokes/letters
- Holes, scratches, dust, or stains on the mark
- Partial transparency / dirty fringing / leftover white halo
- Skew / tilt / bad perspective (straighten it)
- Uneven lighting or color noise on the logo itself

Rules for repair:
1. Reconstruct missing/cropped parts so the logo looks WHOLE and intentional again (not half-cut).
2. Restore sharpness and clean vector-like edges while keeping the original brand identity.
3. If a letter/shape is incomplete, rebuild it to match the remaining visible style as closely as possible.
4. Prefer a complete logo over a literal copy of a broken crop.
5. Do NOT invent a different brand. Rebuild the same logo, just corrected and completed.

========================
BACKGROUND & ALPHA
========================
- True transparent background ONLY (alpha channel).
- No white, gray, black matte, checkerboard, gradient, shadow plate, or studio backdrop.
- Clean anti-aliased edges with NO white/black halo.
- Remove scene shadows, reflections, paper, desk, hands, UI chrome, mockups.
- Keep only the logo/mark itself.

========================
GEOMETRY & COMPOSITION FOR PARTICLE MORPHING
========================
- Center the subject precisely.
- Keep a tight transparent padding of about 6–10% around all sides.
- Prefer square canvas (1:1) when possible.
- Make the silhouette readable and solid — particle systems love clear filled shapes.
- Avoid ultra-thin hairline strokes when they would disappear as particles; slightly reinforce thin critical strokes if needed for readability, without changing the brand look.
- Keep connected shapes coherent (no random broken fragments).
- Maximize contrast between filled logo pixels and transparent empty space.

========================
TEXT & ICONS (CRITICAL FOR READABILITY)
========================
Many particle scenes fail because text/icons are too thin, soft, or glowing.
If the image contains ANY letters, numbers, logos-with-type, or small icons:

1. Redraw text as BOLD, solid, high-contrast glyphs — not thin UI fonts.
2. Prefer filled letterforms (like a strong wordmark) over hairline strokes.
3. Minimum effective stroke weight: thick enough that every letter/icon is still
   readable after being sampled into particles (think poster type, not caption type).
4. Slightly increase letter spacing if characters are cramped or touching.
5. Icons must be solid silhouettes / simple filled marks — not tiny line icons.
6. REMOVE soft glow, bloom, outer light haze, motion blur, and photographic DOF
   from text/icons. Particles already create glow; source glow destroys sharpness.
7. Flatten gradients on small text when they hurt legibility; keep solid fills.
8. Do NOT raster-blur then "sharpen" — redraw crisp edges.
9. If a word is unreadable at particle scale, thicken it until it IS readable,
   while keeping the same word and brand identity.
10. Multi-logo diagrams (hub + labels): make EVERY label and node icon bold and clear.

========================
QUALITY / EXPORT
========================
- Output ONE PNG with transparency.
- High resolution: longest side at least 2048px if possible (minimum 1536px). Prefer 3072px when the scene has lots of text/icons.
- Crisp, clean, production-ready.
- Preserve original brand colors unless I explicitly ask to change them.
- No added text, watermarks, borders, glow frames, drop shadows, fake 3D, or mockup devices.
- No explanatory text in the image. Return the image file only.

========================
NEGATIVE / FORBIDDEN
========================
- White or solid background
- Cropped/incomplete logo left as-is
- Soft mushy edges
- Halo / fringe around the mark
- Glow / bloom / neon haze baked into the PNG
- Thin unreadable text or micro line-icons
- Low-res upscale with blur only
- Extra decorations
- Busy photographic backgrounds
- Multiple variants in one response

========================
FINAL CHECK BEFORE YOU RETURN
========================
Ask yourself:
1) Is every important part of the logo present (not cut off)?
2) Is the background fully transparent with clean edges?
3) Is it sharp and high-res enough for particle sampling?
4) Would this silhouette look beautiful as particles and morph cleanly?
5) Can every letter and icon still be recognized if viewed as glowing particles?
6) Did I remove source glow/bloom that would blur text in the particle tool?

If any answer is no, fix it again, then return the improved PNG only.`;

export const IMAGE_PREP_STEPS = [
	{
		title: 'Copy the prompt',
		body: 'Use the button below to copy the ChatGPT instructions.',
	},
	{
		title: 'Attach your logo',
		body: 'Open ChatGPT (or similar), paste the prompt, and attach the original image.',
	},
	{
		title: 'Get a transparent PNG',
		body: 'Ask for a true transparent background — not white, not gray.',
	},
	{
		title: 'Upload here',
		body: 'Download the result, then drop / paste / upload it into Particle Studio.',
	},
];

/** Optional prompt add-ons the user can toggle before copying */
export const IMAGE_PREP_OPTIONS = [
	{
		id: 'textSharp',
		label: 'Text & Icons',
		hint: 'كتابة وأيقونات واضحة',
		text: `
========================
OPTIONAL MODE: TEXT & ICONS SHARPNESS PASS (ENABLED)
========================
This image will be converted into particles. Thin text and soft icons become unreadable.

Do a dedicated TEXT/ICON pass before export:

A) TEXT
- Rebuild every word/letter bold, solid, and high-contrast.
- No thin fonts, no caption-size type, no soft anti-alias mush.
- Increase stroke weight and slightly open letter-spacing so particles can resolve each glyph.
- Keep the same words/brands — just make them particle-readable.
- If a label is tiny in a diagram, enlarge it enough to stay legible as particles.

B) ICONS / LOGOS
- Convert delicate line icons into filled, simple silhouettes.
- Protect distinctive brand marks, but thicken weak details that would vanish.
- Avoid micro details smaller than ~2–3% of canvas width.

C) ANTI-GLOW
- Strip bloom, neon glow, light bleed, and haze from the source.
- Sharp opaque pixels on transparent background only.
- Particles will add their own glow later — do NOT bake glow into the PNG.

D) SELF-QA (must pass)
1. Zoom out mentally to particle scale: can I still read every label?
2. Are icons recognizable as filled shapes?
3. Is there zero baked glow around letters?
4. Longest side ≥ 2048px (prefer 3072px for dense diagrams).

If any check fails, fix and re-export.
Return ONE transparent high-res PNG only.`,
	},
	{
		id: 'redesign',
		label: 'Redesign',
		hint: 'شكل جديد related',
		text: `
========================
OPTIONAL MODE: SMART REDESIGN (ENABLED)
========================
I do NOT love the current visual design of this logo.

Do this:
1. Understand what the brand/image is about (theme, industry, meaning, vibe).
2. Mentally reference modern logo systems in the same category (without copying any real brand).
3. Create a FRESH redesign that is clearly related to the same topic/identity, but visually stronger and more premium.
4. Keep it simple, iconic, and highly readable as a particle silhouette.
5. Improve geometry, balance, spacing, and uniqueness.
6. It should feel like a better regenerated version of the same idea — not a random unrelated logo.
7. If the design includes text/icons, keep them bold and particle-readable (no thin type, no baked glow).

Still return ONE transparent high-res PNG only.`,
	},
	{
		id: 'enhance',
		label: 'Enhance',
		hint: 'حسّن الموجود',
		text: `
========================
OPTIONAL MODE: ENHANCE CURRENT LOGO (ENABLED)
========================
Keep the same logo identity, but upgrade it heavily:
- Cleaner curves and corners
- Better optical balance and spacing
- Stronger contrast and silhouette clarity
- Slight premium polish (as if redrawn by a senior brand designer)
- Fix weak proportions without changing the recognizable concept
- Especially thicken/clarify any text or icons so they survive particle sampling

Do NOT turn it into a totally different logo.
Return ONE improved transparent high-res PNG only.`,
	},
	{
		id: 'regenerate',
		label: 'Regenerate',
		hint: 'نسخة تانية',
		text: `
========================
OPTIONAL MODE: REGENERATE ALTERNATE VERSION (ENABLED)
========================
Based on the attached image, generate an alternate logo variation in the same family:
- Same topic / same brand meaning
- Different composition or symbol treatment
- Still suitable for particle morphing (clear filled shapes, strong silhouette)
- Modern, distinctive, and production-ready
- Text/icons must stay bold and readable as particles

Treat this like exploring a second strong direction related to the original.
Return ONE transparent high-res PNG only.`,
	},
	{
		id: 'simplify',
		label: 'Simplify',
		hint: 'أبسط للجزيئات',
		text: `
========================
OPTIONAL MODE: SIMPLIFY FOR PARTICLES (ENABLED)
========================
Simplify the mark for particle morphing:
- Reduce tiny details that disappear as particles
- Prefer bold filled shapes over delicate hairlines
- Keep recognizability
- Maximize silhouette clarity
- Merge/omit micro text that cannot be made readable; keep only bold essential labels

Return ONE transparent high-res PNG only.`,
	},
	{
		id: 'mono',
		label: 'Mono',
		hint: 'لون واحد قوي',
		text: `
========================
OPTIONAL MODE: STRONG MONO MARK (ENABLED)
========================
Produce a strong single-color (or dual-tone max) version optimized for particle readability.
Keep transparency around the mark.
Prefer solid filled forms over gradients/textures.
Text and icons must remain bold and sharp with no glow.
Return ONE transparent high-res PNG only.`,
	},
	{
		id: 'tonal',
		label: 'One Color',
		hint: 'لون واحد بتدرجات',
		text: `
========================
OPTIONAL MODE: ONE-COLOR TONAL GRADIENTS (ENABLED)
========================
Recolor the entire logo into ONE color family only, using tonal gradients/shades of the same color.

Examples of what I mean:
- Black logo with soft gradients from deep black → charcoal → soft gray (still one family)
- White/light logo with gradients from white → off-white → soft silver
- Or any single brand color with light→dark tonal steps of THAT color only

Rules:
1. Use ONLY one hue/color family (monochrome tonal range). No rainbow, no multi-brand colors.
2. Gradients/shading are allowed ONLY as lighter/darker values of the same color.
3. Keep true transparent background outside the mark.
4. Preserve silhouette clarity for particle morphing (readable filled forms).
5. Prefer elegant soft tonal depth over flat flat-fill, but do not add textures, noise, glow frames, or fake 3D.
6. If the source has many colors, convert them into tonal values of the chosen single color.
7. Default to rich black tonal gradients unless the logo clearly needs white/light tonal treatment.
8. On small text/icons, prefer solid fills over soft gradients so glyphs stay readable as particles.

Return ONE transparent high-res PNG only.`,
	},
	{
		id: 'square',
		label: 'Square',
		hint: 'كانفس مربع',
		text: `
========================
OPTIONAL MODE: SQUARE MASTER (ENABLED)
========================
Compose the final asset on a perfect 1:1 square canvas, centered, with clean transparent padding (~8%).
Longest side at least 2048px (3072px if the scene has dense text/icons).
Return ONE transparent high-res PNG only.`,
	},
];

export function buildImagePrepPrompt(basePrompt, selectedIds = []) {
	const extras = IMAGE_PREP_OPTIONS.filter((opt) => selectedIds.includes(opt.id))
		.map((opt) => opt.text.trim())
		.join('\n\n');
	if (!extras) return basePrompt;
	return `${basePrompt.trim()}\n\n${extras}\n`;
}
