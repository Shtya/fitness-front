import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import { buildEnrichSystem } from '@/lib/ai-reading/prompts';
import { translateLong } from '@/lib/ai-reading/mt-translate';

export const runtime = 'nodejs';
export const maxDuration = 90;

const MODES = new Set([
	'summarize',
	'explain',
	'simplify',
	'eli5',
	'coach',
	'key_ideas',
	'questions',
	'actions',
	'translate_ar',
	'translate_en',
	'translate',
]);

function fallbackEnrich(mode, excerpt, title, language = 'en') {
	const isAr = language === 'ar';
	const text = String(excerpt || '').trim();
	const sentences = text.split(/(?<=[.!?۔؟])\s+/).filter(Boolean);

	if (mode === 'summarize') {
		return {
			summary: sentences.slice(0, 3).join(' ') || (isAr ? `ملخص: ${title}` : `Summary of ${title}`),
			bullets: sentences.slice(0, 5),
		};
	}
	if (mode === 'explain') {
		return {
			explanation: sentences[0] || text.slice(0, 280),
			analogy: isAr
				? 'مثل تعلم آلة موسيقية — التدريب القصير اليومي يتراكم.'
				: 'Like learning an instrument — short daily practice compounds.',
		};
	}
	if (mode === 'simplify' || mode === 'eli5') {
		return { simplified: sentences.slice(0, 2).join(' ') || text.slice(0, 220) };
	}
	if (mode === 'coach') {
		return {
			questions: isAr
				? [`ما الفكرة الأساسية؟`, 'ماذا ستتذكر غداً؟', 'أي مثال أقنعك؟']
				: ['What is the main idea?', 'What will you remember tomorrow?', 'Which example stuck?'],
			action: isAr ? 'اكتب جملة واحدة عمّا قرأت اليوم' : 'Write one sentence about what you read today',
		};
	}
	if (mode === 'key_ideas') {
		return { keyIdeas: sentences.slice(0, 4).map(s => s.slice(0, 140)) };
	}
	if (mode === 'questions') {
		return {
			questions: isAr
				? [`ما الفكرة الأساسية في «${title}»؟`, 'أي مثال أقنعك أكثر؟', 'ماذا ستطبّق غداً؟']
				: [
						`What is the main claim in “${title}”?`,
						'What example convinced you most?',
						'What will you practice tomorrow?',
					],
		};
	}
	return {
		actions: isAr
			? ['راجع هذا القسم ١٠ دقائق صباح الغد', 'اشرح فكرة واحدة لشخص بجملتين']
			: ['Spend 20 minutes reviewing this section tomorrow morning', 'Teach one idea to someone in two sentences'],
	};
}

function stripMeta(json) {
	if (!json || typeof json !== 'object') return json;
	const { __provider, __model, ...rest } = json;
	return rest;
}

export async function POST(request) {
	try {
		const body = await request.json();
		const ai = readingAiOpts(request, body);
		const mode = String(body.mode || 'summarize');
		if (!MODES.has(mode)) {
			return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
		}
		const excerpt = String(body.excerpt || body.text || '').slice(0, 14000);
		const title = body.title || 'Reading';
		const isTranslate = mode === 'translate_ar' || mode === 'translate_en' || mode === 'translate';
		const language = isTranslate
			? mode === 'translate_ar' || body.targetLang === 'ar'
				? 'ar'
				: 'en'
			: body.language === 'ar'
				? 'ar'
				: 'en';

		if (!excerpt) {
			return NextResponse.json({ error: 'excerpt is required' }, { status: 400 });
		}

		/* Page / selection AR↔EN: free MT endpoint (not LLM). */
		if (isTranslate) {
			try {
				const mt = await translateLong(excerpt, language);
				let translatedTitle = '';
				if (title && title !== 'Reading') {
					try {
						translatedTitle = (await translateLong(String(title).slice(0, 500), language)).translatedText;
					} catch {
						translatedTitle = '';
					}
				}
				return NextResponse.json({
					result: {
						translation: mt.translatedText,
						title: translatedTitle || undefined,
					},
					provider: mt.provider,
					language: mt.targetLang,
					sourceLang: mt.sourceLang,
				});
			} catch (e) {
				return NextResponse.json(
					{
						error: e.message || 'Translation failed',
						result: { translation: '', title: '' },
						provider: 'error',
						language,
					},
					{ status: 502 },
				);
			}
		}

		if (!isAiConfigured(ai)) {
			return NextResponse.json({
				result: fallbackEnrich(mode, excerpt, title, language),
				provider: 'fallback',
				language,
			});
		}

		try {
			const json = await completeJson(
				buildEnrichSystem(mode, language),
				`Target language: ${language}\nTitle: ${title}\n\nExcerpt:\n${excerpt}`,
				0.4,
				{ ...ai, maxTokens: 2048 },
			);
			return NextResponse.json({
				result: stripMeta(json),
				provider: json.__provider || 'ai',
				model: json.__model || ai.modelKey,
				language,
			});
		} catch (e) {
			return NextResponse.json({
				result: fallbackEnrich(mode, excerpt, title, language),
				provider: 'fallback',
				language,
				warning: e.message,
			});
		}
	} catch (error) {
		console.error('[ai-reading/enrich]', error);
		return NextResponse.json({ error: error.message || 'Enrich failed' }, { status: 500 });
	}
}
