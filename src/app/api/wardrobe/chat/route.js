/**
 * POST /api/wardrobe/chat — "Ask my stylist". The client sends a compact JSON summary of the
 * wardrobe (ids + attributes, no images). The model answers in the user's language with
 * outfits made ONLY of those ids; unknown ids are filtered out before anything is returned.
 */
import { NextResponse } from 'next/server';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ChatOutput, ChatRequest, normalizeChat } from '@/app/[locale]/dashboard/whatsapp/outfit/engine/schemas.js';
import { WARDROBE_AI_MODEL, aiConfigured, aiErrorResponse, anthropic, fallbackParams, jsonError, readJson, requireUser, takeQuota } from '../_lib/server.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

function system(language) {
	return `You are a friendly, practical personal stylist inside a wardrobe app.
You can ONLY use clothes from the user's wardrobe JSON (fields: id, c=category, s=subcategory, col=colour name, hex, pat=pattern, fit, f=formality 1-5, sea=seasons, st=status, n=nickname).
Rules:
- Every outfit lists real item ids from the wardrobe. Never invent items. If something needed is missing, say so in the answer or a tip instead.
- Prefer items with st "clean". Mention when a needed item is in the laundry.
- Classic menswear and colour rules: clear light/dark contrast, at most 3 main colours, one bold pattern, belt matches leather shoes, shoes suit the occasion.
- Give 1 to 3 outfits when the question asks what to wear; give 0 outfits when it is a yes/no or explanation question.
- answer: 1 to 3 short sentences. reason per outfit: one sentence on why it works. tips: up to 3 short, specific tips.
- Write answer, titles, reasons and tips in ${language === 'ar' ? 'Egyptian Arabic, simple and friendly' : 'plain English'}.`;
}

export async function POST(request) {
	const user = await requireUser(request);
	if (!user) return jsonError(401, 'unauthorized');
	if (!aiConfigured()) return jsonError(503, 'ai_not_configured');

	const { body, tooLarge, invalid } = await readJson(request, 200_000);
	if (tooLarge) return jsonError(413, 'too_large');
	if (invalid) return jsonError(400, 'invalid_json');
	const parsed = ChatRequest.safeParse(body);
	if (!parsed.success) return jsonError(400, 'invalid_request');

	const quota = takeQuota(user.id, 'chat');
	if (!quota.ok) return jsonError(429, 'quota', { usedToday: quota.usedToday, limitToday: quota.limitToday });

	const { question, locale = 'en', context = {}, wardrobe, history = [] } = parsed.data;
	if (!wardrobe.length) return NextResponse.json({ answer: '', outfits: [], tips: [], empty: true });

	const messages = [];
	for (const turn of history) messages.push({ role: turn.role, content: turn.text });
	messages.push({
		role: 'user',
		content: [
			`WARDROBE:\n${JSON.stringify(wardrobe)}`,
			context.occasion || context.weather ? `CONTEXT: occasion=${context.occasion || 'any'}, weather=${context.weather || 'any'}` : '',
			`QUESTION:\n${question}`,
		]
			.filter(Boolean)
			.join('\n\n'),
	});
	// Conversations must start with a user turn.
	while (messages.length && messages[0].role !== 'user') messages.shift();

	try {
		const knownIds = wardrobe.map(item => item.id);
		let lastError = null;
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const response = await anthropic().beta.messages.parse({
				model: WARDROBE_AI_MODEL,
				max_tokens: 6000,
				system: system(locale),
				output_config: { effort: 'low', format: betaZodOutputFormat(ChatOutput) },
				messages,
				...fallbackParams(),
			});
			if (response.stop_reason === 'refusal') return jsonError(422, 'ai_refused');
			try {
				const result = normalizeChat(response.parsed_output, knownIds);
				return NextResponse.json({ ...result, usedToday: quota.usedToday, limitToday: quota.limitToday });
			} catch (error) {
				lastError = error;
			}
		}
		console.error('[wardrobe/chat] invalid output after retry', lastError?.message);
		return jsonError(502, 'ai_invalid');
	} catch (error) {
		return aiErrorResponse(error, 'chat');
	}
}
