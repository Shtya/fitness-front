import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';

export const runtime = 'nodejs';
export const maxDuration = 90;

function fallbackSummary(text, language = 'en') {
	const isAr = language === 'ar';
	const sentences = String(text || '')
		.split(/(?<=[.!?۔؟])\s+/)
		.map(s => s.trim())
		.filter(Boolean);
	const picked = sentences.slice(0, 8);
	const lead = isAr
		? 'ملخص للحفظ (وضع محلي — فعّل مفتاح الـAI لجودة أعلى):'
		: 'Memorization note (local fallback — enable AI key for higher quality):';
	return {
		summary: `${lead}\n\n${picked.join('\n\n') || (isAr ? 'ملخص غير متاح.' : 'Summary unavailable.')}`,
		bullets: picked.slice(0, 6).map(s => s.slice(0, 160)),
	};
}

function buildMemorizeSystem(language) {
	const isAr = language === 'ar';
	return `You are an expert reading coach and editor. Your job is MEMORIZATION QUALITY — not a shallow TL;DR.

Return ONLY valid JSON:
{
  "summary": "string — clear multi-paragraph memorization note the reader can re-read later",
  "bullets": ["string — 3 to 7 sharp takeaways"],
  "actions": ["string — optional concrete next steps if present in the passage"]
}

Quality bar:
- Follow the user's memorization prompt strictly when provided.
- Keep the ideas that change thinking; drop filler, repetition, and throat-clearing.
- Preserve names, numbers, causal links, and examples that carry meaning.
- Write in ${isAr ? 'Arabic' : 'English'} unless the user prompt says otherwise.
- summary must feel like a polished note, not a dump of sentences.
- Prefer short paragraphs with clear rhythm.
- Do not invent facts that are not in the passage.
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
			const result = fallbackSummary(text, language);
			return NextResponse.json({ ...result, provider: 'fallback', language });
		}

		try {
			const userParts = [
				`Language: ${language}`,
				`Title: ${title}`,
				prompt
					? `USER MEMORIZATION PROMPT (follow this):\n${prompt}`
					: 'USER MEMORIZATION PROMPT:\nRewrite this passage into a clear memorization note I can recall later. Keep only what matters.',
				`\nPASSAGE:\n${text}`,
			];
			const json = await completeJson(buildMemorizeSystem(language), userParts.join('\n\n'), 0.28, {
				...ai,
				maxTokens: 4096,
			});
			const summary = String(json.summary || json.memorized || json.text || '').trim();
			const bullets = Array.isArray(json.bullets) ? json.bullets.map(String).filter(Boolean) : [];
			const actions = Array.isArray(json.actions) ? json.actions.map(String).filter(Boolean) : [];
			if (!summary) {
				const fb = fallbackSummary(text, language);
				return NextResponse.json({ ...fb, provider: 'fallback', language, warning: 'empty_ai_summary' });
			}
			const extras = [
				bullets.length ? bullets.map(b => `• ${b}`).join('\n') : '',
				actions.length ? `\n${language === 'ar' ? 'أفعال:' : 'Actions:'}\n${actions.map(a => `→ ${a}`).join('\n')}` : '',
			]
				.filter(Boolean)
				.join('\n\n');
			return NextResponse.json({
				summary: extras ? `${summary}\n\n${extras}` : summary,
				bullets,
				actions,
				provider: json.__provider || 'ai',
				language,
				model: json.__model || ai.modelKey,
			});
		} catch (e) {
			const result = fallbackSummary(text, language);
			return NextResponse.json({ ...result, provider: 'fallback', language, warning: e.message });
		}
	} catch (error) {
		console.error('[ai-reading/memorize]', error);
		return NextResponse.json({ error: error.message || 'Memorize failed' }, { status: 500 });
	}
}
