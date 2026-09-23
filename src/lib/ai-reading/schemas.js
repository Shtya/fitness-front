/** Shared constants & factories for the AI Reading Library. */

export const HIGHLIGHT_TYPES = [
	{ id: 'important', color: '#f59e0b', labelKey: 'highlights.important' },
	{ id: 'idea', color: '#0d9488', labelKey: 'highlights.idea' },
	{ id: 'quote', color: '#6366f1', labelKey: 'highlights.quote' },
	{ id: 'question', color: '#db2777', labelKey: 'highlights.question' },
	{ id: 'action', color: '#ea580c', labelKey: 'highlights.action' },
];

export const READING_THEMES = [
	'light',
	'dark',
	'sepia',
	'paper',
	'ivory',
	'sand',
	'forest',
	'midnight',
	'dusk',
	'slate',
];

export const STYLES = ['narrative', 'analytical', 'practical', 'philosophical', 'storytelling'];
export const DEPTHS = ['overview', 'standard', 'deep'];
export const READING_TIMES = [5, 10, 15, 25, 40];

export const PROMPT_CATEGORIES = ['generate', 'summarize', 'explain', 'actions', 'questions', 'outline', 'custom'];

export const TOPIC_FOLDERS = ['inbox', 'psychology', 'habits', 'money', 'work', 'health', 'monthly'];

export const COVER_PALETTES = [
	['#1a2e28', '#3d5a4c'],
	['#1e293b', '#475569'],
	['#3b1f1a', '#8b5a3c'],
	['#1a2332', '#2d4a6f'],
	['#2a1f3d', '#5b4a7a'],
	['#1f2a1a', '#4a6b3a'],
];

export function uid(prefix = 'id') {
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function emptyKnowledge() {
	return {
		notes: [],
		highlights: [],
		keyIdeas: [],
		questions: [],
		actions: [],
		importantWords: [],
		tags: [],
		review: null,
		bookmarks: [],
		memorizations: [],
	};
}

export function createBook(partial = {}) {
	const now = new Date().toISOString();
	const palette = COVER_PALETTES[Math.floor(Math.random() * COVER_PALETTES.length)];
	return {
		id: uid('book'),
		title: 'Untitled',
		subtitle: '',
		author: 'AI Reading Room',
		coverGradient: palette,
		language: 'en',
		tags: [],
		source: 'manual',
		style: 'narrative',
		depth: 'standard',
		readingTimeMinutes: 10,
		createdAt: now,
		updatedAt: now,
		lastOpenedAt: null,
		progress: { chapterId: null, pageId: null, percent: 0, scrollRatio: 0 },
		chapters: [],
		knowledge: emptyKnowledge(),
		reviewQueue: [],
		journeyId: null,
		topicId: null,
		indexOnly: false,
		indexItems: [],
		...partial,
	};
}

export function createBlock(type, text, extra = {}) {
	return { id: uid('blk'), type, text: text || '', ...extra };
}

export function createPage(title, blocks = []) {
	return { id: uid('page'), title: title || '', order: 0, blocks };
}

export function createChapter(title, pages = []) {
	return { id: uid('ch'), title: title || 'Chapter', order: 0, pages };
}

export function createPrompt(partial = {}) {
	const now = new Date().toISOString();
	return {
		id: uid('prompt'),
		title: 'Untitled prompt',
		body: '',
		category: 'custom',
		favorite: false,
		variables: [],
		createdAt: now,
		updatedAt: now,
		...partial,
	};
}

export function createTopic(partial = {}) {
	const now = new Date().toISOString();
	return {
		id: uid('topic'),
		title: '',
		notes: '',
		folder: 'inbox',
		tags: [],
		favorite: false,
		monthKey: null,
		date: null,
		status: 'saved',
		bookId: null,
		createdAt: now,
		updatedAt: now,
		...partial,
	};
}

export function createJourney(partial = {}) {
	const now = new Date().toISOString();
	const d = new Date();
	const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	return {
		id: uid('journey'),
		title: '',
		theme: '',
		monthKey,
		language: 'en',
		description: '',
		progressPercent: 0,
		items: [],
		createdAt: now,
		updatedAt: now,
		...partial,
	};
}

export function createIndexItem(partial = {}) {
	return {
		id: uid('idx'),
		order: 0,
		title: '',
		subtitle: '',
		readingTimeMinutes: 8,
		status: 'pending',
		bookId: null,
		...partial,
	};
}

export function createChatMessage(role, content, extra = {}) {
	return {
		id: uid('msg'),
		role,
		content: content || '',
		createdAt: new Date().toISOString(),
		...extra,
	};
}

export function createChatSession(partial = {}) {
	const now = new Date().toISOString();
	return {
		id: uid('chat'),
		title: 'Workspace chat',
		messages: [],
		createdAt: now,
		updatedAt: now,
		...partial,
	};
}

export function estimateReadingMinutes(book) {
	let words = 0;
	for (const ch of book.chapters || []) {
		for (const page of ch.pages || []) {
			for (const b of page.blocks || []) {
				words += String(b.text || '').split(/\s+/).filter(Boolean).length;
				if (Array.isArray(b.items)) {
					for (const it of b.items) words += String(it).split(/\s+/).filter(Boolean).length;
				}
			}
		}
	}
	return Math.max(1, Math.round(words / 200));
}

export function flattenPages(book) {
	const list = [];
	(book.chapters || []).forEach((ch, ci) => {
		(ch.pages || []).forEach((page, pi) => {
			list.push({ chapter: ch, chapterIndex: ci, page, pageIndex: pi });
		});
	});
	return list;
}

export function computeProgressPercent(book) {
	const pages = flattenPages(book);
	if (!pages.length) return book.progress?.percent || 0;
	const currentId = book.progress?.pageId;
	if (!currentId) return book.progress?.percent || 0;
	const idx = pages.findIndex(p => p.page.id === currentId);
	if (idx < 0) return 0;
	return Math.round(((idx + 1) / pages.length) * 100);
}

export function journeyProgress(journey) {
	const items = journey?.items || [];
	if (!items.length) return 0;
	const done = items.filter(i => i.status === 'done' || i.bookId).length;
	return Math.round((done / items.length) * 100);
}

export function currentMonthKey() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(monthKey, locale = 'en') {
	if (!monthKey) return '';
	const [y, m] = monthKey.split('-').map(Number);
	const date = new Date(y, (m || 1) - 1, 1);
	try {
		return date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' });
	} catch {
		return monthKey;
	}
}
