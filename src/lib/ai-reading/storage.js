import {
	createChatSession,
	createIndexItem,
	createJourney,
	currentMonthKey,
	journeyProgress,
	uid,
} from './schemas.js';
import { extractVariables } from './prompts.js';
import {
	DEFAULT_MEMORIZE_PROMPT_ID,
	DEFAULT_POLISH_PROMPT_ID,
	buildDefaultMemorizePrompt,
	buildDefaultPolishPrompt,
} from './default-prompts.js';

const KEYS = {
	books: 'so7ba.aiReading.books.v1',
	prompts: 'so7ba.aiReading.prompts.v2',
	stats: 'so7ba.aiReading.stats.v1',
	prefs: 'so7ba.aiReading.prefs.v1',
	topics: 'so7ba.aiReading.topics.v2',
	journeys: 'so7ba.aiReading.journeys.v1',
	chat: 'so7ba.aiReading.chat.v1',
};

function read(key, fallback) {
	if (typeof window === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function write(key, value) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(key, JSON.stringify(value));
	window.dispatchEvent(new CustomEvent('ai-reading:changed', { detail: { key } }));
}

export function getPrefs() {
	return {
		fontSize: 18,
		lineHeight: 1.75,
		maxWidth: 680,
		theme: 'light',
		fontWeight: 400,
		letterSpacing: 0,
		paragraphGap: 1.25,
		fontPreset: 'auto',
		pageMode: 'pages',
		wheelTurnsPage: true,
		aiModelKey: 'gpt-oss:20b',
		aiProvider: 'llm7-free',
		...read(KEYS.prefs, {}),
	};
}

export function savePrefs(prefs) {
	const next = { ...getPrefs(), ...prefs };
	write(KEYS.prefs, next);
	return next;
}

/** Appearance keys that can be overridden per article. AI model stays global. */
export const READING_APPEARANCE_KEYS = [
	'fontSize',
	'lineHeight',
	'maxWidth',
	'theme',
	'fontWeight',
	'letterSpacing',
	'paragraphGap',
	'fontPreset',
	'pageMode',
	'wheelTurnsPage',
];

export const READING_GLOBAL_KEYS = ['aiModelKey', 'aiProvider'];

export function pickPrefs(source, keys) {
	const out = {};
	if (!source || typeof source !== 'object') return out;
	for (const key of keys) {
		if (source[key] !== undefined) out[key] = source[key];
	}
	return out;
}

export function getBookReadingPrefs(book) {
	const raw = book?.readingPrefs;
	return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

/** Merge global defaults with optional per-article appearance overrides. */
export function resolveReadingPrefs(book, globalPrefs = null) {
	const global = globalPrefs || getPrefs();
	const local = pickPrefs(getBookReadingPrefs(book), READING_APPEARANCE_KEYS);
	return {
		...global,
		...local,
		aiModelKey: global.aiModelKey,
		aiProvider: global.aiProvider,
	};
}

export function bookHasCustomReadingPrefs(book) {
	return Object.keys(pickPrefs(getBookReadingPrefs(book), READING_APPEARANCE_KEYS)).length > 0;
}

export function getStats() {
	return {
		streak: 0,
		lastReadDate: null,
		totalMinutes: 0,
		booksCompleted: 0,
		reviewsDone: 0,
		...read(KEYS.stats, {}),
	};
}

export function saveStats(stats) {
	write(KEYS.stats, { ...getStats(), ...stats });
}

export function recordReadingActivity(minutes = 1) {
	const stats = getStats();
	const today = new Date().toISOString().slice(0, 10);
	let streak = stats.streak || 0;
	if (stats.lastReadDate !== today) {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const y = yesterday.toISOString().slice(0, 10);
		streak = stats.lastReadDate === y ? streak + 1 : 1;
	}
	saveStats({
		...stats,
		streak,
		lastReadDate: today,
		totalMinutes: (stats.totalMinutes || 0) + minutes,
	});
}

export function listBooks() {
	const books = read(KEYS.books, []);
	return Array.isArray(books) ? books : [];
}

export function getBook(id) {
	return listBooks().find(b => b.id === id) || null;
}

export function upsertBook(book) {
	const books = listBooks();
	const idx = books.findIndex(b => b.id === book.id);
	const next = { ...book, updatedAt: new Date().toISOString() };
	if (idx >= 0) books[idx] = next;
	else books.unshift(next);
	write(KEYS.books, books);
	return next;
}

export function deleteBook(id) {
	write(
		KEYS.books,
		listBooks().filter(b => b.id !== id),
	);
}

export function touchBookOpen(id) {
	const book = getBook(id);
	if (!book) return null;
	book.lastOpenedAt = new Date().toISOString();
	return upsertBook(book);
}

export function updateProgress(id, progress) {
	const book = getBook(id);
	if (!book) return null;
	book.progress = { ...book.progress, ...progress };
	return upsertBook(book);
}

export function listPrompts() {
	const prompts = read(KEYS.prompts, null);
	if (!Array.isArray(prompts)) {
		const seeded = [buildDefaultPolishPrompt(), buildDefaultMemorizePrompt()];
		write(KEYS.prompts, seeded);
		return seeded;
	}
	return prompts;
}

/** Ensure the default favorite memorize prompt exists (used by reading / prompts UI). */
export function ensureDefaultMemorizePrompt() {
	const prompts = listPrompts();
	if (prompts.some(p => p.id === DEFAULT_MEMORIZE_PROMPT_ID)) return prompts;
	const seeded = [buildDefaultMemorizePrompt(), ...prompts];
	write(KEYS.prompts, seeded);
	return seeded;
}

/** Ensure the default page polish / audit prompt exists. */
export function ensureDefaultPolishPrompt() {
	const prompts = listPrompts();
	if (prompts.some(p => p.id === DEFAULT_POLISH_PROMPT_ID)) return prompts;
	const seeded = [buildDefaultPolishPrompt(), ...prompts];
	write(KEYS.prompts, seeded);
	return seeded;
}

export function upsertPrompt(prompt) {
	const prompts = listPrompts();
	const vars = extractVariables(prompt.body);
	const next = {
		...prompt,
		variables: vars,
		updatedAt: new Date().toISOString(),
	};
	const idx = prompts.findIndex(p => p.id === next.id);
	if (idx >= 0) prompts[idx] = next;
	else prompts.unshift(next);
	write(KEYS.prompts, prompts);
	return next;
}

export function deletePrompt(id) {
	const prompts = listPrompts().filter(p => p.id !== id);
	write(KEYS.prompts, prompts);
}

/* ── Topics ── */
export function listTopics() {
	const topics = read(KEYS.topics, null);
	if (Array.isArray(topics)) return topics;
	write(KEYS.topics, []);
	return [];
}

export function upsertTopic(topic) {
	const topics = listTopics();
	const next = { ...topic, updatedAt: new Date().toISOString() };
	const idx = topics.findIndex(t => t.id === next.id);
	if (idx >= 0) topics[idx] = next;
	else topics.unshift(next);
	write(KEYS.topics, topics);
	return next;
}

export function deleteTopic(id) {
	const topics = listTopics().filter(t => t.id !== id);
	write(KEYS.topics, topics);
}

/* ── Journeys / monthly themes ── */
export function listJourneys() {
	let journeys = read(KEYS.journeys, null);
	if (!Array.isArray(journeys) || !journeys.length) {
		journeys = [defaultJourney()];
		write(KEYS.journeys, journeys);
	}
	return journeys.map(j => ({ ...j, progressPercent: journeyProgress(j) }));
}

export function getJourney(id) {
	return listJourneys().find(j => j.id === id) || null;
}

export function getActiveJourney() {
	const key = currentMonthKey();
	const all = listJourneys();
	return all.find(j => j.monthKey === key) || all[0] || null;
}

export function upsertJourney(journey) {
	const journeys = listJourneys();
	const next = {
		...journey,
		progressPercent: journeyProgress(journey),
		updatedAt: new Date().toISOString(),
	};
	const idx = journeys.findIndex(j => j.id === next.id);
	if (idx >= 0) journeys[idx] = next;
	else journeys.unshift(next);
	write(KEYS.journeys, journeys);
	return next;
}

export function deleteJourney(id) {
	write(
		KEYS.journeys,
		listJourneys().filter(j => j.id !== id),
	);
}

function defaultJourney() {
	const titles = [
		'Psychology Basics',
		'Human Behavior',
		'Cognitive Biases',
		'Motivation',
		'Habits',
		'Decision Making',
		'Social Psychology',
	];
	return createJourney({
		title: 'Understanding Psychology',
		theme: 'Discipline & the mind',
		description: 'A calm monthly path through psychology — short sessions you can finish.',
		items: titles.map((title, i) =>
			createIndexItem({
				order: i + 1,
				title,
				subtitle: `${8 + (i % 3)} min`,
				readingTimeMinutes: 8 + (i % 3) * 2,
			}),
		),
	});
}

/* ── Chat ── */
export function getChatSession() {
	let session = read(KEYS.chat, null);
	if (!session?.id) {
		session = createChatSession({
			messages: [
				{
					id: uid('msg'),
					role: 'assistant',
					content:
						'Welcome to your reading workspace. Pick a saved prompt or topic on the left, or ask me to outline, explain, or write a short article.',
					createdAt: new Date().toISOString(),
				},
			],
		});
		write(KEYS.chat, session);
	}
	return session;
}

export function saveChatSession(session) {
	const next = { ...session, updatedAt: new Date().toISOString() };
	write(KEYS.chat, next);
	return next;
}

export function clearChatSession() {
	const session = createChatSession({
		messages: [
			{
				id: uid('msg'),
				role: 'assistant',
				content: 'Fresh start. What would you like to learn in the next 10 minutes?',
				createdAt: new Date().toISOString(),
			},
		],
	});
	write(KEYS.chat, session);
	return session;
}

export function getContinueBook() {
	const books = listBooks()
		.filter(b => b.lastOpenedAt && (b.progress?.percent || 0) < 100 && !b.indexOnly)
		.sort((a, b) => String(b.lastOpenedAt).localeCompare(String(a.lastOpenedAt)));
	return books[0] || null;
}

export function getTodayPick() {
	const books = listBooks().filter(b => !b.indexOnly);
	if (!books.length) return null;
	const day = new Date().toISOString().slice(0, 10);
	const idx = [...day].reduce((s, c) => s + c.charCodeAt(0), 0) % books.length;
	return books[idx];
}

export function knowledgeStats() {
	const books = listBooks();
	let highlights = 0;
	let notes = 0;
	let actions = 0;
	let ideas = 0;
	for (const b of books) {
		highlights += b.knowledge?.highlights?.length || 0;
		notes += b.knowledge?.notes?.length || 0;
		actions += b.knowledge?.actions?.length || 0;
		ideas += b.knowledge?.keyIdeas?.length || 0;
	}
	return { highlights, notes, actions, ideas, books: books.length, topics: listTopics().length };
}
