import { flattenPages, uid } from './schemas.js';

function norm(s) {
	return String(s || '')
		.replace(/\s+/g, ' ')
		.trim();
}

function pagePlainText(page) {
	return norm(
		(page?.blocks || [])
			.map(b => {
				if (b.text) return b.text;
				if (Array.isArray(b.items)) return b.items.join(' ');
				return '';
			})
			.join(' '),
	);
}

/** Find pages that overlap the selected text (for memorization scope). */
export function findPagesForSelection(book, selectedText) {
	const sel = norm(selectedText);
	if (!sel || sel.length < 8) return [];

	const pages = flattenPages(book);
	const hits = [];
	const needle = sel.slice(0, Math.min(120, sel.length));

	for (const entry of pages) {
		const pageText = pagePlainText(entry.page);
		if (!pageText) continue;

		const overlap =
			sel.includes(pageText.slice(0, Math.min(60, pageText.length))) ||
			pageText.includes(needle) ||
			(entry.page.blocks || []).some(b => {
				const t = norm(b.text);
				return t.length >= 20 && (sel.includes(t.slice(0, 40)) || t.includes(needle.slice(0, 40)));
			});

		if (overlap) {
			hits.push({
				pageId: entry.page.id,
				chapterId: entry.chapter.id,
				blocks: structuredClone(entry.page.blocks || []),
			});
		}
	}

	// Fallback: current-ish pages if nothing matched (very short / partial selection)
	if (!hits.length && pages.length) {
		for (const entry of pages) {
			const pageText = pagePlainText(entry.page);
			if (pageText && sel.length >= 20 && pageText.includes(sel.slice(0, 20))) {
				hits.push({
					pageId: entry.page.id,
					chapterId: entry.chapter.id,
					blocks: structuredClone(entry.page.blocks || []),
				});
			}
		}
	}

	return hits;
}

/** Turn a summary string into readable paragraph blocks. */
export function summaryToBlocks(summary, language = 'en') {
	const text = String(summary || '').trim();
	if (!text) return [];

	const chunks = text
		.split(/\n{2,}|(?<=[.!?۔؟])\s+(?=[A-ZА-ЯÀ-ÖØ-Þ\u0600-\u06FF])/)
		.map(s => s.trim())
		.filter(Boolean);

	const parts = chunks.length ? chunks : [text];
	return parts.map((p, i) => ({
		id: uid('blk'),
		type: i === 0 ? 'key_idea' : 'paragraph',
		text: p,
		calloutType: i === 0 ? 'idea' : undefined,
	}));
}

export function createMemorization({ selectedText, summary, promptId, promptTitle, pages, language }) {
	const pageHits = pages || [];
	return {
		id: uid('mem'),
		selectedText: String(selectedText || '').slice(0, 20000),
		promptId: promptId || null,
		promptTitle: promptTitle || '',
		pageIds: pageHits.map(p => p.pageId),
		primaryPageId: pageHits[0]?.pageId || null,
		originalPages: pageHits,
		memorizedBlocks: summaryToBlocks(summary, language),
		active: 'memorized', // memorized | original
		createdAt: new Date().toISOString(),
	};
}

/** Resolve which blocks to render for a page given memorizations. */
export function resolvePageBlocks(page, memorizations = []) {
	const list = Array.isArray(memorizations) ? memorizations : [];
	const mem = list.find(m => (m.pageIds || []).includes(page.id));
	if (!mem) return { blocks: page.blocks || [], memorization: null, role: 'normal' };

	if (mem.active === 'original') {
		const snap = (mem.originalPages || []).find(p => p.pageId === page.id);
		return { blocks: snap?.blocks || page.blocks || [], memorization: mem, role: 'original' };
	}

	if (page.id === mem.primaryPageId) {
		return { blocks: mem.memorizedBlocks || [], memorization: mem, role: 'memorized-primary' };
	}

	return {
		blocks: [
			{
				id: `mem-stub-${mem.id}-${page.id}`,
				type: 'callout',
				calloutType: 'note',
				text: '', // UI fills label
				_memorizationStub: true,
				_memorizationId: mem.id,
			},
		],
		memorization: mem,
		role: 'memorized-stub',
	};
}

export function toggleMemorizationView(memorizations, id) {
	return (memorizations || []).map(m => {
		if (m.id !== id) return m;
		return { ...m, active: m.active === 'memorized' ? 'original' : 'memorized' };
	});
}
