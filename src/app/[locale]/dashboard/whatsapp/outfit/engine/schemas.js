/**
 * Zod schemas shared by the AI routes (server) and the client. The model output schemas stay
 * simple (no numeric bounds) because structured outputs reject some constraints; `normalize*`
 * then clamps and cleans every value before anything is stored.
 */
import { z } from 'zod/v4';
import { ITEM_FITS, MATERIALS, PATTERNS, SEASONS, STYLE_TAGS, SUBCATEGORIES, WARDROBE_CATEGORIES } from '../config/outfit-config.js';
import { normalizeHex } from './color.js';

const SUBS = Object.keys(SUBCATEGORIES);

export const AnalysisOutput = z.object({
	isClothing: z.boolean(),
	category: z.enum(WARDROBE_CATEGORIES),
	categoryConfidence: z.number(),
	subcategory: z.enum(SUBS),
	subcategoryConfidence: z.number(),
	primaryHex: z.string(),
	primaryConfidence: z.number(),
	secondaryHex: z.array(z.string()),
	pattern: z.enum(PATTERNS),
	patternConfidence: z.number(),
	fabric: z.enum(MATERIALS),
	fabricConfidence: z.number(),
	fit: z.enum(ITEM_FITS),
	fitConfidence: z.number(),
	sleeveLength: z.enum(['none', 'short', 'long', 'na']),
	pantsLength: z.enum(['full', 'ankle', 'cropped', 'shorts', 'na']),
	formality: z.number(),
	formalityConfidence: z.number(),
	seasons: z.array(z.enum(SEASONS)),
	seasonsConfidence: z.number(),
	styleTags: z.array(z.enum(STYLE_TAGS)),
	details: z.array(z.string()),
});

const conf = value => Math.min(1, Math.max(0, Number(value) || 0));
const clean = (value, max = 60) =>
	String(value || '')
		.replace(/[<>]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);

/** Clamp, de-duplicate and validate an analysis; throws when the core fields are unusable. */
export function normalizeAnalysis(raw) {
	const parsed = AnalysisOutput.parse(raw);
	const primary = normalizeHex(parsed.primaryHex);
	if (!primary) throw new Error('invalid primary colour');
	const sub = SUBCATEGORIES[parsed.subcategory];
	// The sub-category decides the category when they disagree (it is the more specific answer).
	const category = sub && sub.category !== parsed.category ? sub.category : parsed.category;
	return {
		isClothing: parsed.isClothing,
		category,
		subcategory: parsed.subcategory,
		primaryHex: primary,
		secondaryHex: [...new Set(parsed.secondaryHex.map(normalizeHex).filter(Boolean))].filter(hex => hex !== primary).slice(0, 2),
		pattern: parsed.pattern,
		fabric: parsed.fabric,
		fit: parsed.fit,
		sleeveLength: parsed.sleeveLength,
		pantsLength: parsed.pantsLength,
		formality: Math.min(5, Math.max(1, Math.round(Number(parsed.formality) || 2))),
		seasons: [...new Set(parsed.seasons)],
		styleTags: [...new Set(parsed.styleTags)].slice(0, 4),
		details: parsed.details.map(d => clean(d, 40)).filter(Boolean).slice(0, 5),
		confidence: {
			category: conf(parsed.categoryConfidence),
			subcategory: conf(parsed.subcategoryConfidence),
			color: conf(parsed.primaryConfidence),
			pattern: conf(parsed.patternConfidence),
			fabric: conf(parsed.fabricConfidence),
			fit: conf(parsed.fitConfidence),
			formality: conf(parsed.formalityConfidence),
			seasons: conf(parsed.seasonsConfidence),
		},
	};
}

export const ChatOutput = z.object({
	answer: z.string(),
	outfits: z.array(
		z.object({
			title: z.string(),
			itemIds: z.array(z.string()),
			reason: z.string(),
		}),
	),
	tips: z.array(z.string()),
});

/** Keep only outfits whose ids all exist in the wardrobe (no invented items). */
export function normalizeChat(raw, knownIds) {
	const parsed = ChatOutput.parse(raw);
	const known = new Set(knownIds);
	let dropped = 0;
	const outfits = [];
	for (const outfit of parsed.outfits.slice(0, 4)) {
		const ids = [...new Set(outfit.itemIds)];
		const valid = ids.filter(id => known.has(id));
		if (valid.length !== ids.length) dropped += ids.length - valid.length;
		if (!valid.length) continue;
		outfits.push({ title: clean(outfit.title, 80), itemIds: valid.slice(0, 8), reason: clean(outfit.reason, 400) });
	}
	return {
		answer: clean(parsed.answer, 1500),
		outfits,
		tips: parsed.tips.map(tip => clean(tip, 200)).filter(Boolean).slice(0, 4),
		dropped,
	};
}

/** Request bodies (validated on the server). */
export const AnalyzeRequest = z.object({
	image: z.string().min(100).max(1_600_000), // base64 JPEG/PNG/WebP, ≤ ~1.2 MB decoded
	mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
	locale: z.enum(['en', 'ar']).optional(),
});

export const ChatRequest = z.object({
	question: z.string().min(1).max(600),
	locale: z.enum(['en', 'ar']).optional(),
	context: z.object({ occasion: z.string().max(20).optional(), weather: z.string().max(20).optional() }).optional(),
	wardrobe: z
		.array(
			z.object({
				id: z.string().max(64),
				c: z.string().max(20),
				s: z.string().max(24),
				col: z.string().max(40),
				hex: z.string().max(7),
				pat: z.string().max(12).optional(),
				fit: z.string().max(12).optional(),
				f: z.number().optional(),
				sea: z.array(z.string().max(8)).max(4).optional(),
				st: z.string().max(10).optional(),
				n: z.string().max(40).optional(),
			}),
		)
		.max(400),
	history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1500) })).max(8).optional(),
});
