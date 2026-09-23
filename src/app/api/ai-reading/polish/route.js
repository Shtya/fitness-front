import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';

export const runtime = 'nodejs';
export const maxDuration = 90;

function fallbackPolish(text, language = 'en') {
	const isAr = language === 'ar';
	const cleaned = String(text || '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return {
		improved: cleaned,
		title: '',
		audit: {
			summary: isAr
				? 'وضع محلي — فعّل مفتاح الـAI لتدقيق وتحسين أقوى.'
				: 'Local fallback — enable AI key for a real audit & polish.',
			removed: [],
			strengthened: [],
			added: [],
			notes: [isAr ? 'لم يتم تعديل عميق بدون AI.' : 'No deep rewrite without AI.'],
		},
	};
}

function buildPolishSystem(language) {
	const isAr = language === 'ar';
	return `You are a senior editor and ruthless page auditor for a reading product.
Your job is AUDIT + IMPROVE the page — not summarize, not memorize.

Return ONLY valid JSON:
{
  "improved": "string — full polished page text, paragraphs separated by \\n\\n",
  "title": "string — optional clearer page title if useful, else empty",
  "audit": {
    "summary": "string — short overview of what you changed and why",
    "removed": ["string — filler / random / empty fluff you cut"],
    "strengthened": ["string — weak or vague parts you rewrote"],
    "added": ["string — important clarifying info you added from clear context"],
    "notes": ["string — other editor notes"]
  }
}

Quality bar:
- Follow the USER EDITOR PROMPT strictly when provided.
- Cut filler, throat-clearing, repetition, and empty rhetoric.
- Strengthen weak or vague sentences; improve flow between paragraphs.
- Add missing clarity only when it clearly belongs to the topic — do not invent unrelated facts.
- Keep the author's voice and the same language (${isAr ? 'Arabic' : 'English'}) unless the user prompt says otherwise.
- improved must be a complete replacement page, not a TL;DR.
- Prefer short, strong paragraphs.
- Do not wrap JSON in markdown fences.`;
}

export async function POST(request) {
	try {
		const body = await request.json();
		const ai = readingAiOpts(request, body);
		const text = String(body.text || body.excerpt || '').trim().slice(0, 28000);
		const prompt = String(body.prompt || body.promptBody || '').trim();
		const language = body.language === 'ar' ? 'ar' : 'en';
		const title = String(body.title || 'Reading').slice(0, 200);

		if (!text || text.length < 20) {
			return NextResponse.json({ error: 'text is required' }, { status: 400 });
		}

		if (!isAiConfigured(ai)) {
			const result = fallbackPolish(text, language);
			return NextResponse.json({ ...result, provider: 'fallback', language });
		}

		try {
			const userParts = [
				`Language: ${language}`,
				`Title: ${title}`,
				prompt
					? `USER EDITOR PROMPT (follow this):\n${prompt}`
					: 'USER EDITOR PROMPT:\nAudit this page: cut filler, strengthen weak lines, improve flow, add only clearly needed clarity. Return a full improved page.',
				`\nPAGE TEXT:\n${text}`,
			];
			const json = await completeJson(buildPolishSystem(language), userParts.join('\n\n'), 0.3, {
				...ai,
				maxTokens: 4096,
			});
			const improved = String(json.improved || json.text || json.polished || '').trim();
			const auditRaw = json.audit && typeof json.audit === 'object' ? json.audit : {};
			const audit = {
				summary: String(auditRaw.summary || '').trim(),
				removed: Array.isArray(auditRaw.removed) ? auditRaw.removed.map(String).filter(Boolean) : [],
				strengthened: Array.isArray(auditRaw.strengthened)
					? auditRaw.strengthened.map(String).filter(Boolean)
					: [],
				added: Array.isArray(auditRaw.added) ? auditRaw.added.map(String).filter(Boolean) : [],
				notes: Array.isArray(auditRaw.notes) ? auditRaw.notes.map(String).filter(Boolean) : [],
			};
			if (!improved) {
				const fb = fallbackPolish(text, language);
				return NextResponse.json({ ...fb, provider: 'fallback', language, warning: 'empty_ai_polish' });
			}
			return NextResponse.json({
				improved,
				title: String(json.title || '').trim(),
				audit,
				provider: json.__provider || 'ai',
				language,
				model: json.__model || ai.modelKey,
			});
		} catch (e) {
			const result = fallbackPolish(text, language);
			return NextResponse.json({ ...result, provider: 'fallback', language, warning: e.message });
		}
	} catch (error) {
		console.error('[ai-reading/polish]', error);
		return NextResponse.json({ error: error.message || 'Polish failed' }, { status: 500 });
	}
}
