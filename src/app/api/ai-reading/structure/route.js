import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import { uid } from '@/lib/ai-reading/schemas';

export const runtime = 'nodejs';
export const maxDuration = 90;

const ALLOWED = new Set(['heading', 'paragraph', 'list', 'quote', 'key_idea', 'callout']);

function fallbackStructure(text, language = 'en', title = '') {
	const isAr = language === 'ar';
	const parts = String(text || '')
		.split(/\n{2,}/)
		.map(s => s.trim())
		.filter(Boolean);
	const blocks = [];
	if (title) {
		blocks.push({ type: 'heading', level: 2, text: title });
	} else if (parts[0] && parts[0].length < 80) {
		blocks.push({ type: 'heading', level: 2, text: parts[0] });
		parts.shift();
	}
	for (const p of parts) {
		const lines = p.split('\n').map(l => l.replace(/^[-*•]\s+/, '').trim()).filter(Boolean);
		if (lines.length >= 3 && p.split('\n').filter(l => /^[-*•]/.test(l.trim())).length >= 2) {
			blocks.push({ type: 'list', items: lines });
		} else {
			blocks.push({ type: 'paragraph', text: p });
		}
	}
	return {
		pageTitle: title || '',
		notes: isAr
			? 'ترتيب محلي بسيط — فعّل الـAI لهيكلة أغنى (عناوين / قوائم / تمييز).'
			: 'Simple local layout — enable AI for richer headings, lists, and callouts.',
		blocks,
	};
}

function buildStructureSystem(language) {
	const isAr = language === 'ar';
	return `You are a senior editorial designer for a reading app.
Your job is STRUCTURE the page for maximum readability — not summarize, not translate.

Return ONLY valid JSON:
{
  "pageTitle": "string — clear page title",
  "notes": "string — short note of what you structured",
  "blocks": [
    {
      "type": "heading|paragraph|list|quote|key_idea|callout",
      "text": "string — for non-list types",
      "level": 1|2|3|4,
      "items": ["string"] ,
      "calloutType": "note|action|tip|warning",
      "accent": "#hexcolor optional soft accent for visual tags"
    }
  ]
}

Rules:
- Keep the SAME language (${isAr ? 'Arabic' : 'English'}) and the same meaning — do not invent new facts.
- Turn messy walls of text into a clear reading sequence: title → short sections → paragraphs → lists where useful.
- Use heading for section titles (level 2 for main sections, 3 for sub).
- Use list for steps, bullets, or enumerated ideas.
- Use quote for memorable lines.
- Use key_idea for one crucial takeaway (sparingly, 0–2).
- Use callout for tips/actions/warnings (sparingly).
- Prefer short paragraphs (2–4 sentences).
- Optional accent colors: soft readable hex only (e.g. #0d9488, #2563eb, #ea580c, #7c3aed). Max ~4 accents on the page.
- Do not wrap JSON in markdown fences.`;
}

function normalizeBlocks(rawBlocks) {
	const out = [];
	for (const raw of Array.isArray(rawBlocks) ? rawBlocks : []) {
		const type = String(raw?.type || 'paragraph').trim();
		if (!ALLOWED.has(type)) continue;
		const accent = sanitizeAccent(raw?.accent);
		if (type === 'list') {
			const items = (Array.isArray(raw.items) ? raw.items : String(raw.text || '').split('\n'))
				.map(s => String(s || '').trim())
				.filter(Boolean)
				.slice(0, 24);
			if (!items.length) continue;
			out.push({
				id: uid('blk'),
				type: 'list',
				text: '',
				items,
				...(accent ? { accent } : {}),
			});
			continue;
		}
		const text = String(raw.text || '').trim();
		if (!text) continue;
		const block = { id: uid('blk'), type, text };
		if (type === 'heading') {
			const level = Math.min(4, Math.max(1, Number(raw.level) || 2));
			block.level = level;
		}
		if (type === 'callout') {
			const ct = String(raw.calloutType || 'note').toLowerCase();
			block.calloutType = ['note', 'action', 'tip', 'warning'].includes(ct) ? ct : 'note';
		}
		if (accent) block.accent = accent;
		out.push(block);
	}
	return out;
}

function sanitizeAccent(value) {
	const s = String(value || '').trim();
	if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s;
	return '';
}

export async function POST(request) {
	try {
		const body = await request.json();
		const ai = readingAiOpts(request, body);
		const text = String(body.text || body.excerpt || '').trim().slice(0, 28000);
		const language = body.language === 'ar' ? 'ar' : 'en';
		const title = String(body.title || '').slice(0, 200);

		if (!text || text.length < 20) {
			return NextResponse.json({ error: 'text is required' }, { status: 400 });
		}

		if (!isAiConfigured(ai)) {
			const result = fallbackStructure(text, language, title);
			return NextResponse.json({ ...result, provider: 'fallback', language });
		}

		try {
			const json = await completeJson(
				buildStructureSystem(language),
				`Language: ${language}\nCurrent page title: ${title || '(none)'}\n\nPAGE TEXT:\n${text}`,
				0.25,
				{ ...ai, maxTokens: 4096 },
			);
			const blocks = normalizeBlocks(json.blocks);
			if (!blocks.length) {
				const fb = fallbackStructure(text, language, title);
				return NextResponse.json({ ...fb, provider: 'fallback', language, warning: 'empty_structure' });
			}
			return NextResponse.json({
				pageTitle: String(json.pageTitle || title || '').trim(),
				notes: String(json.notes || '').trim(),
				blocks,
				provider: json.__provider || 'ai',
				language,
				model: json.__model || ai.modelKey,
			});
		} catch (e) {
			const result = fallbackStructure(text, language, title);
			return NextResponse.json({ ...result, provider: 'fallback', language, warning: e.message });
		}
	} catch (error) {
		console.error('[ai-reading/structure]', error);
		return NextResponse.json({ error: error.message || 'Structure failed' }, { status: 500 });
	}
}
