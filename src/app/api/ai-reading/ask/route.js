import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import { buildAskSystem } from '@/lib/ai-reading/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

function bookContext(book) {
	const parts = [];
	parts.push(`Title: ${book.title}`);
	if (book.subtitle) parts.push(`Subtitle: ${book.subtitle}`);
	for (const ch of book.chapters || []) {
		parts.push(`\n## ${ch.title}`);
		for (const page of ch.pages || []) {
			if (page.title) parts.push(`### ${page.title}`);
			for (const b of page.blocks || []) {
				if (b.type === 'list' && b.items) parts.push(`- ${b.items.join('\n- ')}`);
				else if (b.text) parts.push(b.text);
			}
		}
	}
	return parts.join('\n').slice(0, 14000);
}

export async function POST(request) {
	try {
		const body = await request.json();
		const ai = readingAiOpts(request, body);
		const question = String(body.question || '').trim();
		const book = body.book;
		const language = body.language === 'ar' || book?.language === 'ar' ? 'ar' : 'en';
		if (!question || !book) {
			return NextResponse.json({ error: 'question and book are required' }, { status: 400 });
		}

		if (!isAiConfigured(ai)) {
			const ideas = (book.knowledge?.keyIdeas || []).map(i => i.text).filter(Boolean);
			const isAr = language === 'ar';
			return NextResponse.json({
				answer: isAr
					? ideas.length > 0
						? `من ملاحظاتك في «${book.title}»: ${ideas[0]}. أعد قراءة المقاطع المظللة وحوّل فكرة واحدة إلى فعل اليوم.`
						: `افتح «${book.title}»، ظلّل الجملة التي تجيب عن سؤالك، واحفظها كفكرة أو فعل.`
					: ideas.length > 0
						? `Based on your notes in “${book.title}”: ${ideas[0]}. Re-read the highlighted sections and turn one idea into a small action today.`
						: `Re-open “${book.title}”, highlight the sentence that answers “${question}”, and save it as an Idea or Action.`,
				relatedIdeas: ideas.slice(0, 3),
				suggestedAction: isAr
					? 'اكتب جملة إجابة في ملاحظاتك، ثم خصص ٢٠ دقيقة لإعادة القراءة.'
					: 'Write one sentence answer in your notes, then schedule a 20-minute re-read.',
				provider: 'fallback',
			});
		}

		const json = await completeJson(
			buildAskSystem(book.title, language),
			[
				`Language: ${language}`,
				body.passage ? `PASSAGE (primary focus):\n${String(body.passage).slice(0, 4000)}` : '',
				`BOOK CONTEXT:\n${bookContext(book)}`,
				`QUESTION:\n${question}`,
			]
				.filter(Boolean)
				.join('\n\n'),
			0.4,
			{ ...ai, maxTokens: 2048 },
		);

		return NextResponse.json({
			answer: json.answer || json.summary || '',
			relatedIdeas: json.relatedIdeas || [],
			suggestedAction: json.suggestedAction || '',
			provider: json.__provider || 'ai',
			model: json.__model || ai.modelKey,
		});
	} catch (error) {
		console.error('[ai-reading/ask]', error);
		return NextResponse.json({ error: error.message || 'Ask failed' }, { status: 500 });
	}
}
