import { NextResponse } from 'next/server';
import { isAiConfigured, chatCompletion, readingAiOpts } from '@/lib/ai-reading/provider';
import { buildChatSystem } from '@/lib/ai-reading/prompts';
import { generateFallbackBook, normalizeAiBook } from '@/lib/ai-reading/transform';
import { createIndexItem } from '@/lib/ai-reading/schemas';

export const runtime = 'nodejs';
export const maxDuration = 120;

function fallbackChat(userText) {
	const lower = userText.toLowerCase();
	const wantsOutline = /outline|index|roadmap|فهرس|خطة/.test(lower);
	const wantsArticle = /article|write|generate|chapter|كتاب|مقال|اكتب/.test(lower);
	const wantsActions = /action|تطبيق|habit|عادة/.test(lower);
	const topicMatch = userText.match(/(?:about|around|حول|عن)\s+(.+)$/i);
	const topic = (topicMatch?.[1] || userText).replace(/["']/g, '').slice(0, 80).trim() || 'learning';

	if (wantsOutline) {
		const titles = [
			'Fundamentals',
			'How it works',
			'Core principles',
			'Common mistakes',
			'Environment & systems',
			'Making it easy',
			'Making it stick',
			'Practice plan',
		];
		return {
			reply: `Here is a short learning index for **${topic}**. Each item can become an 8–12 minute reading session.`,
			intent: 'outline',
			roadmap: {
				title: topic,
				theme: topic,
				description: `A calm path through ${topic}.`,
				items: titles.map((title, i) => ({
					order: i + 1,
					title,
					subtitle: `${8 + (i % 3)} min`,
					readingTimeMinutes: 8 + (i % 3),
				})),
			},
			book: null,
			topics: null,
			questions: null,
			actions: null,
			provider: 'fallback',
		};
	}

	if (wantsArticle) {
		const book = generateFallbackBook({
			topic,
			style: 'narrative',
			depth: 'standard',
			language: /[\u0600-\u06FF]/.test(userText) ? 'ar' : 'en',
			readingTimeMinutes: 10,
		});
		return {
			reply: `I drafted a short reading on **${topic}**. Open it from the right panel or save it to your library.`,
			intent: 'article',
			book,
			roadmap: null,
			topics: null,
			questions: book.knowledge?.questions?.map(q => q.text) || [],
			actions: book.knowledge?.actions?.map(a => a.text) || [],
			provider: 'fallback',
		};
	}

	if (wantsActions) {
		return {
			reply: `Try one small experiment this week related to your question.`,
			intent: 'actions',
			actions: [
				`Spend 10 minutes today reading about ${topic}`,
				'Write one sentence: what will I practice tomorrow?',
				'Remove one friction that blocks this habit tonight',
			],
			book: null,
			roadmap: null,
			topics: null,
			questions: [`What is the smallest useful step for ${topic}?`],
			provider: 'fallback',
		};
	}

	return {
		reply: `Let's keep this light. You can ask me to **outline**, **explain**, or **write a short article** about any topic. Example: “Write an easy article about ${topic}”.`,
		intent: 'chat',
		book: null,
		roadmap: null,
		topics: [`Why ${topic} matters`, `Common myths about ${topic}`, `A 7-day practice for ${topic}`],
		questions: null,
		actions: null,
		provider: 'fallback',
	};
}

export async function POST(request) {
	try {
		const body = await request.json();
		const messages = Array.isArray(body.messages) ? body.messages : [];
		const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || body.message || '';
		if (!String(lastUser).trim()) {
			return NextResponse.json({ error: 'message required' }, { status: 400 });
		}

		const ai = readingAiOpts(request, body);

		if (!isAiConfigured(ai)) {
			return NextResponse.json(fallbackChat(String(lastUser)));
		}

		try {
			const { json } = await chatCompletion({
				messages: [{ role: 'system', content: buildChatSystem() }, ...messages.slice(-12).map(m => ({ role: m.role, content: m.content }))],
				temperature: 0.55,
				json: true,
				modelKey: ai.modelKey,
				provider: ai.provider,
				authHeader: ai.authHeader,
				maxTokens: ai.maxTokens,
			});

			let book = null;
			if (json.book) {
				book = normalizeAiBook(json.book, { source: 'generated' });
			}

			let roadmap = json.roadmap || null;
			if (roadmap?.items) {
				roadmap.items = roadmap.items.map((it, i) =>
					createIndexItem({
						order: it.order || i + 1,
						title: it.title,
						subtitle: it.subtitle || `${it.readingTimeMinutes || 8} min`,
						readingTimeMinutes: it.readingTimeMinutes || 8,
					}),
				);
			}

			return NextResponse.json({
				reply: json.reply || '',
				intent: json.intent || 'chat',
				book,
				roadmap,
				topics: json.topics || null,
				questions: json.questions || null,
				actions: json.actions || null,
				provider: 'ai',
				model: ai.modelKey,
			});
		} catch (e) {
			console.warn('[ai-reading/chat] falling back', e?.message);
			return NextResponse.json(fallbackChat(String(lastUser)));
		}
	} catch (error) {
		console.error('[ai-reading/chat]', error);
		return NextResponse.json({ error: error.message || 'Chat failed' }, { status: 500 });
	}
}
