import { NextResponse } from 'next/server';
import { translateText } from '@/lib/ai-reading/mt-translate';

export const runtime = 'nodejs';
export const maxDuration = 45;

export async function POST(request) {
	try {
		const body = await request.json();
		const word = String(body.word || body.text || '').trim().slice(0, 2000);
		const context = String(body.context || '').trim().slice(0, 600);
		const targetLang = body.targetLang === 'en' ? 'en' : 'ar';

		if (!word) {
			return NextResponse.json({ error: 'word is required' }, { status: 400 });
		}

		try {
			const result = await translateText(word, targetLang);
			return NextResponse.json({
				word,
				translation: result.translatedText,
				meaning: '',
				contextNote: context.slice(0, 180),
				provider: result.provider,
				sourceLang: result.sourceLang,
				targetLang: result.targetLang,
			});
		} catch (e) {
			return NextResponse.json(
				{
					error: e.message || 'Translation failed',
					word,
					translation: '',
					meaning: e.message || 'Translation failed',
					contextNote: context.slice(0, 180),
					provider: 'error',
					targetLang,
				},
				{ status: 502 },
			);
		}
	} catch (error) {
		console.error('[ai-reading/translate]', error);
		return NextResponse.json({ error: error.message || 'Translate failed' }, { status: 500 });
	}
}
