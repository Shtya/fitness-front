import { NextResponse } from 'next/server';
import { getAiStatus, isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import {
	buildGenerateSystem,
	buildGenerateUser,
	buildTranscriptArticleSystem,
	buildTranscriptArticleUser,
} from '@/lib/ai-reading/prompts';
import { generateFallbackBook, normalizeAiBook } from '@/lib/ai-reading/transform';
import { enqueueReviewItems } from '@/lib/ai-reading/spaced-review';
import { upsertServerBook } from '@/lib/ai-reading/server-store';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
	try {
		const body = await request.json();
		const mode = body.mode === 'transcripts' ? 'transcripts' : 'topic';
		const style = body.style || 'narrative';
		const depth = body.depth || 'standard';
		const language = body.language || 'en';
		const readingTimeMinutes = Number(body.readingTimeMinutes) || (mode === 'transcripts' ? 15 : 10);
		const promptTemplate = body.promptTemplate || '';
		const aiStatus = getAiStatus();
		const ai = readingAiOpts(request, body);

		let topic = String(body.topic || '').trim();
		const transcripts = Array.isArray(body.transcripts)
			? body.transcripts
					.map(t => ({
						title: String(t?.title || '').trim(),
						text: String(t?.text || '').trim(),
					}))
					.filter(t => t.text.length > 40)
			: [];

		if (mode === 'transcripts') {
			if (!transcripts.length) {
				return NextResponse.json({ error: 'At least one transcript is required' }, { status: 400 });
			}
			if (!topic) topic = body.title || transcripts[0].title || 'Podcast article';
		} else if (!topic) {
			return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
		}

		let book;
		let provider = 'fallback';

		if (isAiConfigured(ai)) {
			try {
				const system =
					mode === 'transcripts' ? buildTranscriptArticleSystem(language) : buildGenerateSystem(language);
				const user =
					mode === 'transcripts'
						? buildTranscriptArticleUser({
								transcripts,
								promptTemplate,
								language,
								readingTimeMinutes,
								title: topic,
							})
						: buildGenerateUser({ topic, style, depth, language, readingTimeMinutes, promptTemplate });

				const json = await completeJson(system, user, mode === 'transcripts' ? 0.45 : 0.55, ai);
				book = normalizeAiBook(json, {
					topic,
					style,
					depth,
					language,
					readingTimeMinutes,
					source: mode === 'transcripts' ? 'transcripts' : 'generated',
				});
				provider = json.__provider || aiStatus.label || 'ai';
			} catch (e) {
				if (e?.code !== 'AI_NOT_CONFIGURED') {
					console.error('[ai-reading/generate]', e);
				}
				book = generateFallbackBook({ topic, style, depth, language, readingTimeMinutes });
				provider = 'fallback';
			}
		} else {
			book = generateFallbackBook({ topic, style, depth, language, readingTimeMinutes });
			provider = 'fallback';
		}

		enqueueReviewItems(book);
		await upsertServerBook(book);

		return NextResponse.json({ book, provider, ai: aiStatus });
	} catch (error) {
		console.error('[ai-reading/generate]', error);
		return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
	}
}
