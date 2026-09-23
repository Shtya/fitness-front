import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import { buildRoadmapSystem } from '@/lib/ai-reading/prompts';
import { createIndexItem, createJourney, currentMonthKey } from '@/lib/ai-reading/schemas';

export const runtime = 'nodejs';
export const maxDuration = 90;

function fallbackRoadmap({ theme, language }) {
	const isAr = language === 'ar';
	const base = theme || (isAr ? 'الانضباط' : 'Discipline');
	const titles = isAr
		? ['أساسيات الفهم', 'السلوك البشري', 'التحيزات المعرفية', 'الدافعية', 'العادات', 'اتخاذ القرار', 'علم النفس الاجتماعي']
		: ['Psychology Basics', 'Human Behavior', 'Cognitive Biases', 'Motivation', 'Habits', 'Decision Making', 'Social Psychology'];
	return {
		title: isAr ? `فهم ${base}` : `Understanding ${base}`,
		theme: base,
		description: isAr
			? 'رحلة شهرية هادئة بجلسات قصيرة يمكنك إنهاؤها.'
			: 'A calm monthly path of short sessions you can actually finish.',
		items: titles.map((title, i) => ({
			order: i + 1,
			title,
			subtitle: `${8 + (i % 3)} min`,
			readingTimeMinutes: 8 + (i % 3) * 2,
		})),
	};
}

export async function POST(request) {
	try {
		const body = await request.json();
		const theme = String(body.theme || body.topic || '').trim();
		if (!theme) {
			return NextResponse.json({ error: 'theme is required' }, { status: 400 });
		}
		const language = body.language || 'en';
		const monthKey = body.monthKey || currentMonthKey();
		const ai = readingAiOpts(request, body);

		let data;
		let usedAi = false;
		if (isAiConfigured(ai)) {
			try {
				data = await completeJson(
					buildRoadmapSystem(),
					`Create a monthly learning journey themed around: ${theme}\nLanguage: ${language}\nMonth: ${monthKey}`,
					0.5,
					ai,
				);
				usedAi = true;
			} catch {
				data = fallbackRoadmap({ theme, language });
			}
		} else {
			data = fallbackRoadmap({ theme, language });
		}

		const journey = createJourney({
			title: data.title || theme,
			theme: data.theme || theme,
			description: data.description || '',
			language,
			monthKey,
			items: (data.items || []).map((it, i) =>
				createIndexItem({
					order: it.order || i + 1,
					title: it.title,
					subtitle: it.subtitle || `${it.readingTimeMinutes || 8} min`,
					readingTimeMinutes: it.readingTimeMinutes || 8,
				}),
			),
		});

		return NextResponse.json({ journey, provider: usedAi ? data.__provider || 'ai' : 'fallback', model: ai.modelKey });
	} catch (error) {
		console.error('[ai-reading/roadmap]', error);
		return NextResponse.json({ error: error.message || 'Roadmap failed' }, { status: 500 });
	}
}
