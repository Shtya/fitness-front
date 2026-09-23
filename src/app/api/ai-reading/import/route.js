import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import { buildImportEnhanceSystem } from '@/lib/ai-reading/prompts';
import { normalizeAiBook, transformRawToBook } from '@/lib/ai-reading/transform';
import { enqueueReviewItems } from '@/lib/ai-reading/spaced-review';
import { upsertServerBook } from '@/lib/ai-reading/server-store';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
	try {
		const body = await request.json();
		const raw = String(body.raw || '').trim();
		if (!raw) {
			return NextResponse.json({ error: 'Paste content to import' }, { status: 400 });
		}

		const enhance = body.enhance !== false;
		const ai = readingAiOpts(request, body);
		let book = transformRawToBook(raw, {
			title: body.title,
			language: body.language,
			author: body.author || 'Imported AI',
		});
		let provider = 'parser';

		if (enhance && isAiConfigured(ai) && raw.length < 120000) {
			try {
				const json = await completeJson(
					buildImportEnhanceSystem(),
					`Refine this parsed draft into a polished reading book JSON.\n\nDRAFT:\n${JSON.stringify({
						title: book.title,
						subtitle: book.subtitle,
						chapters: book.chapters,
					})}\n\nORIGINAL EXCERPT (first 8k chars):\n${raw.slice(0, 8000)}`,
					0.3,
					ai,
				);
				book = normalizeAiBook(json, {
					source: 'imported',
					language: book.language,
					style: book.style,
				});
				provider = json.__provider ? `${json.__provider}+parser` : 'ai+parser';
			} catch (e) {
				console.warn('[ai-reading/import] enhance failed, using parser', e?.message);
			}
		}

		// Seed knowledge from callouts / key ideas
		for (const ch of book.chapters || []) {
			for (const page of ch.pages || []) {
				for (const block of page.blocks || []) {
					if (block.type === 'key_idea' && block.text) {
						book.knowledge.keyIdeas.push({
							id: `idea_${Math.random().toString(36).slice(2, 8)}`,
							text: block.text,
							createdAt: new Date().toISOString(),
						});
					}
					if (block.type === 'callout' && block.calloutType === 'action' && block.text) {
						book.knowledge.actions.push({
							id: `act_${Math.random().toString(36).slice(2, 8)}`,
							text: block.text,
							done: false,
							createdAt: new Date().toISOString(),
						});
					}
				}
			}
		}

		enqueueReviewItems(book);
		await upsertServerBook(book);

		return NextResponse.json({ book, provider });
	} catch (error) {
		console.error('[ai-reading/import]', error);
		return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
	}
}
