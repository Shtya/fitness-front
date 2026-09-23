import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import { buildTopicSuggestSystem } from '@/lib/ai-reading/prompts';
import { createTopic } from '@/lib/ai-reading/schemas';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FALLBACK = [
	{ title: 'Why do people procrastinate?', folder: 'psychology', tags: ['mind'] },
	{ title: 'How does memory work?', folder: 'psychology', tags: ['learning'] },
	{ title: 'Psychology of money', folder: 'money', tags: ['money'] },
	{ title: 'How great negotiators think', folder: 'work', tags: ['work'] },
	{ title: 'Why motivation is not enough', folder: 'habits', tags: ['discipline'] },
	{ title: 'The role of sleep in learning', folder: 'health', tags: ['health'] },
	{ title: 'How to learn anything in small sessions', folder: 'habits', tags: ['learning'] },
	{ title: 'What willpower actually is', folder: 'psychology', tags: ['discipline'] },
];

export async function GET() {
	return NextResponse.json({ topics: FALLBACK.map(t => createTopic(t)) });
}

export async function POST(request) {
	try {
		const body = await request.json().catch(() => ({}));
		const seed = String(body.seed || body.theme || '').trim();
		const ai = readingAiOpts(request, body);

		if (!isAiConfigured(ai)) {
			return NextResponse.json({
				topics: FALLBACK.map(t => createTopic(t)),
				provider: 'fallback',
			});
		}

		try {
			const json = await completeJson(
				buildTopicSuggestSystem(),
				seed ? `Suggest topics related to: ${seed}` : 'Suggest curious general learning topics for adults.',
				0.7,
				ai,
			);
			const topics = (json.topics || []).map(t =>
				createTopic({
					title: t.title || t,
					folder: t.folder || 'inbox',
					tags: t.tags || [],
				}),
			);
			return NextResponse.json({ topics, provider: json.__provider || 'ai', model: json.__model || ai.modelKey });
		} catch {
			return NextResponse.json({ topics: FALLBACK.map(t => createTopic(t)), provider: 'fallback' });
		}
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
