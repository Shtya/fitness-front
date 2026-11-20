/**
 * POST /api/wardrobe/analyze — tag one clothing photo with Claude (vision) and return strict,
 * zod-validated JSON. Body: { image: base64 (downscaled ≤768px, EXIF already stripped by the
 * client), mediaType, locale }. Auth: dashboard bearer token. Images are not stored here.
 */
import { NextResponse } from 'next/server';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { AnalysisOutput, AnalyzeRequest, normalizeAnalysis } from '@/app/[locale]/dashboard/whatsapp/outfit/engine/schemas.js';
import { WARDROBE_AI_MODEL, aiConfigured, aiErrorResponse, anthropic, fallbackParams, jsonError, readJson, requireUser, takeQuota } from '../_lib/server.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You tag photos of clothing for a personal wardrobe app.
Look only at the main garment in the photo and fill every field.
- category and subcategory: pick the closest allowed value. A suit jacket alone is "blazer"; a full suit is "suit". Socks are "socks".
- primaryHex: the garment's main colour as it would look in neutral daylight (ignore background, shadows and glare). secondaryHex: up to 2 other clearly visible garment colours, else [].
- pattern: "textured" means a visible weave/knit with no printed pattern.
- formality: 1 = gym/lounge, 2 = casual, 3 = smart casual, 4 = business, 5 = black tie.
- seasons: the weather it suits (hot, mild, cold, rain).
- sleeveLength / pantsLength: "na" when not applicable.
- details: short notable features (e.g. "logo", "pleats", "distressed"), max 5, in English.
- Each *Confidence is 0 to 1: how sure you are about that field.
- If the photo does not show a clothing item or accessory, set isClothing to false and give your best guess for the rest.`;

export async function POST(request) {
	const user = await requireUser(request);
	if (!user) return jsonError(401, 'unauthorized');
	if (!aiConfigured()) return jsonError(503, 'ai_not_configured');

	const { body, tooLarge, invalid } = await readJson(request, 1_700_000);
	if (tooLarge) return jsonError(413, 'too_large');
	if (invalid) return jsonError(400, 'invalid_json');
	const parsed = AnalyzeRequest.safeParse(body);
	if (!parsed.success) return jsonError(400, 'invalid_request');

	const quota = takeQuota(user.id, 'analyze');
	if (!quota.ok) return jsonError(429, 'quota', { usedToday: quota.usedToday, limitToday: quota.limitToday });

	const { image, mediaType } = parsed.data;
	const content = [
		{ type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
		{ type: 'text', text: 'Tag this item.' },
	];

	try {
		let lastError = null;
		// One retry when the output does not validate.
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const response = await anthropic().beta.messages.parse({
				model: WARDROBE_AI_MODEL,
				max_tokens: 4000,
				system: SYSTEM,
				output_config: { effort: 'low', format: betaZodOutputFormat(AnalysisOutput) },
				messages: [{ role: 'user', content }],
				...fallbackParams(),
			});
			if (response.stop_reason === 'refusal') return jsonError(422, 'ai_refused');
			try {
				const analysis = normalizeAnalysis(response.parsed_output);
				return NextResponse.json({ analysis, model: response.model, usedToday: quota.usedToday, limitToday: quota.limitToday });
			} catch (error) {
				lastError = error;
			}
		}
		console.error('[wardrobe/analyze] invalid output after retry', lastError?.message);
		return jsonError(502, 'ai_invalid');
	} catch (error) {
		return aiErrorResponse(error, 'analyze');
	}
}
