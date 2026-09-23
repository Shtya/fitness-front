/** Smart reading helpers — focus, resume, flashcards, TTS sentences, estimates. */

import { uid } from './schemas.js';

const WPM = 180;

export function pagePlainText(page) {
	if (!page?.blocks) return '';
	return (page.blocks || [])
		.map(b => {
			if (b.type === 'list') return (b.items || []).join('. ');
			return b.text || '';
		})
		.filter(Boolean)
		.join('\n\n');
}

export function countWords(text) {
	const t = String(text || '').trim();
	if (!t) return 0;
	if (/[\u0600-\u06FF]/.test(t)) return t.replace(/\s+/g, ' ').split(' ').filter(Boolean).length;
	return t.split(/\s+/).filter(Boolean).length;
}

export function estimateMinutesLeft(pages, pageIndex) {
	const remaining = (pages || []).slice(Math.max(0, pageIndex));
	const words = remaining.reduce((n, p) => n + countWords(pagePlainText(p.page)), 0);
	return Math.max(1, Math.ceil(words / WPM));
}

/** Latest highlight with pageId → resume target. */
export function findLastHighlight(book) {
	const list = [...(book?.knowledge?.highlights || [])].sort(
		(a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
	);
	return list.find(h => h.pageId || h.text) || null;
}

export function findPageIndexForHighlight(pages, highlight) {
	if (!highlight || !pages?.length) return -1;
	if (highlight.pageId) {
		const i = pages.findIndex(p => p.page.id === highlight.pageId);
		if (i >= 0) return i;
	}
	const needle = String(highlight.text || '').slice(0, 80);
	if (!needle) return -1;
	return pages.findIndex(p => pagePlainText(p.page).includes(needle));
}

/** Readable blocks for focus / listen (skip empty). */
export function focusBlocksFromPage(page) {
	const out = [];
	for (const b of page?.blocks || []) {
		if (b.type === 'list' && (b.items || []).length) {
			out.push({ ...b, _focusText: (b.items || []).join('\n') });
		} else if (b.text && String(b.text).trim()) {
			out.push({ ...b, _focusText: b.text });
		}
	}
	return out;
}

/** Split into speakable sentences (AR/EN). */
export function splitSentences(text) {
	const t = String(text || '').trim();
	if (!t) return [];
	return t
		.split(/(?<=[.!?؟。！؟])\s+|\n+/)
		.map(s => s.trim())
		.filter(s => s.length > 1);
}

/** Bionic-ish: bold first half of each word. */
export function bionicNodes(text) {
	const parts = String(text || '').split(/(\s+)/);
	return parts.map((part, i) => {
		if (/^\s+$/.test(part) || !part) return { key: i, bold: '', rest: part };
		const cut = Math.max(1, Math.ceil(part.length / 2));
		return { key: i, bold: part.slice(0, cut), rest: part.slice(cut) };
	});
}

/**
 * Build Anki-style flashcards from Important / Quote / Memorize / important words.
 * Front = cue, Back = answer / translation / text.
 */
export function buildFlashcardsFromBook(book) {
	const cards = [];
	const seen = new Set();

	const push = (id, front, back, source) => {
		const key = `${front}::${back}`.slice(0, 200);
		if (!front || !back || seen.has(key)) return;
		seen.add(key);
		cards.push({ id: id || uid('fc'), front, back, source });
	};

	for (const h of book?.knowledge?.highlights || []) {
		if (h.type === 'important') {
			push(h.id, 'Why is this important?', h.text, 'important');
		} else if (h.type === 'quote') {
			push(h.id, 'Recall this quote', h.text, 'quote');
		}
	}

	for (const m of book?.knowledge?.memorizations || []) {
		const original = m.selectedText || m.originalText || m.text || '';
		const summary =
			m.summary ||
			m.compressed ||
			(m.memorizedBlocks || []).map(b => b.text).filter(Boolean).join('\n\n');
		if (summary && original) {
			push(m.id, summary.slice(0, 280), original, 'memorize');
		} else if (original) {
			push(m.id, 'Memorize — expand', original, 'memorize');
		}
	}

	for (const w of book?.knowledge?.importantWords || []) {
		if (w.word && w.translation) {
			push(w.id, w.word, w.translation + (w.meaning ? `\n${w.meaning}` : ''), 'word');
		}
	}

	return cards;
}

/** Ensure flashcard texts are in the spaced-review queue. */
export function enqueueFlashcardReviews(book) {
	const cards = buildFlashcardsFromBook(book);
	const queue = [...(book.reviewQueue || [])];
	const existing = new Set(queue.map(q => q.itemId));
	const now = Date.now();

	for (const c of cards) {
		const itemId = `fc_${c.id}`;
		if (existing.has(itemId)) continue;
		queue.push({
			id: uid('rv'),
			itemId,
			type: 'flashcard',
			text: c.front,
			answer: c.back,
			source: c.source,
			ease: 2.5,
			interval: 1,
			reps: 0,
			nextReviewAt: new Date(now).toISOString(),
		});
		existing.add(itemId);
	}

	return { ...book, reviewQueue: queue, knowledge: { ...book.knowledge, flashcards: cards } };
}

export function ttsLangFor(text, fallback = 'en') {
	if (/[\u0600-\u06FF]/.test(String(text || ''))) return 'ar-SA';
	return fallback === 'ar' ? 'ar-SA' : 'en-US';
}
