import { uid } from './schemas.js';

/**
 * Lightweight spaced-review (SM-2 inspired).
 * Items: key ideas, questions, actions, highlights.
 */

export function enqueueReviewItems(book) {
	const now = Date.now();
	const queue = [...(book.reviewQueue || [])];
	const existing = new Set(queue.map(q => q.itemId));

	const push = (itemId, type, text) => {
		if (!text || existing.has(itemId)) return;
		queue.push({
			id: uid('rv'),
			itemId,
			type,
			text,
			ease: 2.5,
			interval: 1,
			reps: 0,
			nextReviewAt: new Date(now).toISOString(),
		});
		existing.add(itemId);
	};

	for (const idea of book.knowledge?.keyIdeas || []) push(idea.id, 'key_idea', idea.text);
	for (const q of book.knowledge?.questions || []) push(q.id, 'question', q.text);
	for (const a of book.knowledge?.actions || []) push(a.id, 'action', a.text);
	for (const h of book.knowledge?.highlights || []) {
		if (['idea', 'important', 'action', 'question', 'quote'].includes(h.type)) {
			push(h.id, 'highlight', h.text);
		}
	}
	for (const w of book.knowledge?.importantWords || []) {
		if (w.word && w.translation) {
			push(w.id, 'word', `${w.word} → ${w.translation}`);
		}
	}
	for (const m of book.knowledge?.memorizations || []) {
		const text =
			m.summary ||
			m.compressed ||
			(m.memorizedBlocks || []).map(b => b.text).filter(Boolean).join(' ') ||
			m.selectedText ||
			m.text;
		if (text) push(m.id, 'memorize', text);
	}

	book.reviewQueue = queue;
	return book;
}

export function dueReviews(book, now = Date.now()) {
	return (book.reviewQueue || [])
		.filter(item => new Date(item.nextReviewAt).getTime() <= now)
		.sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt));
}

/** quality: 0 forget … 5 easy */
export function answerReview(book, reviewId, quality) {
	const q = Math.max(0, Math.min(5, Number(quality)));
	const queue = book.reviewQueue || [];
	const idx = queue.findIndex(r => r.id === reviewId);
	if (idx < 0) return book;
	const item = { ...queue[idx] };

	if (q < 3) {
		item.reps = 0;
		item.interval = 1;
	} else {
		item.reps = (item.reps || 0) + 1;
		if (item.reps === 1) item.interval = 1;
		else if (item.reps === 2) item.interval = 3;
		else item.interval = Math.round((item.interval || 1) * (item.ease || 2.5));
	}

	item.ease = Math.max(1.3, (item.ease || 2.5) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
	const next = new Date();
	next.setDate(next.getDate() + (item.interval || 1));
	item.nextReviewAt = next.toISOString();
	item.lastQuality = q;
	item.lastReviewedAt = new Date().toISOString();

	queue[idx] = item;
	book.reviewQueue = queue;
	return book;
}

export function collectAllDue(books) {
	const now = Date.now();
	const items = [];
	for (const book of books) {
		for (const r of dueReviews(book, now)) {
			items.push({ ...r, bookId: book.id, bookTitle: book.title });
		}
	}
	return items;
}
