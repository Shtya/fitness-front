/**
 * AI Reading store — Nest Postgres is the source of truth (no localStorage).
 * In-memory cache for sync reads; hydrate on Studio / Reader mount.
 */

import api from '@/utils/axios';
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

const LEGACY_KEYS = [
	'so7ba.aiReading.books.v1',
	'so7ba.aiReading.prompts.v2',
	'so7ba.aiReading.stats.v1',
	'so7ba.aiReading.prefs.v1',
	'so7ba.aiReading.topics.v2',
	'so7ba.aiReading.journeys.v1',
	'so7ba.aiReading.chat.v1',
	'so7ba.aiReading.prompts.v1',
];

const DEFAULT_PREFS = {
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
};

const cache = {
	books: [],
	prompts: null,
	topics: [],
	journeys: null,
	prefs: { ...DEFAULT_PREFS },
	stats: {
		streak: 0,
		lastReadDate: null,
		totalMinutes: 0,
		booksCompleted: 0,
		reviewsDone: 0,
	},
	chat: null,
	ready: false,
	hydrating: null,
};

let flushTimer = null;
let flushPromise = null;

function emit() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent('ai-reading:changed', { detail: { source: 'cloud' } }));
}

function readLegacy(key, fallback) {
	if (typeof window === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function clearLegacyLocalStorage() {
	if (typeof window === 'undefined') return;
	for (const key of LEGACY_KEYS) {
		try {
			localStorage.removeItem(key);
		} catch {
			/* ignore */
		}
	}
}

function snapshot() {
	return {
		books: cache.books,
		prompts: Array.isArray(cache.prompts) ? cache.prompts : [],
		topics: cache.topics,
		journeys: Array.isArray(cache.journeys) ? cache.journeys : [],
		prefs: cache.prefs,
		stats: cache.stats,
		chat: cache.chat,
	};
}

async function flushNow() {
	if (typeof window === 'undefined') return;
	const token = localStorage.getItem('accessToken');
	if (!token) return;
	const body = snapshot();
	try {
		const { data } = await api.put('/ai-reading/state', body, { timeout: 120000 });
		if (data && typeof data === 'object') {
			applyServerState(data, { emitChange: false });
		}
	} catch (err) {
		console.warn('[ai-reading] cloud flush failed', err?.message || err);
	}
}

function scheduleFlush() {
	emit();
	if (typeof window === 'undefined') return;
	if (!localStorage.getItem('accessToken')) return;
	clearTimeout(flushTimer);
	flushTimer = setTimeout(() => {
		flushPromise = flushNow().finally(() => {
			flushPromise = null;
		});
	}, 450);
}

function applyServerState(data, { emitChange = true } = {}) {
	if (!data || typeof data !== 'object') return;
	if (Array.isArray(data.books)) cache.books = data.books;
	if (Array.isArray(data.prompts)) cache.prompts = data.prompts;
	if (Array.isArray(data.topics)) cache.topics = data.topics;
	if (Array.isArray(data.journeys)) cache.journeys = data.journeys;
	if (data.prefs && typeof data.prefs === 'object') {
		cache.prefs = { ...DEFAULT_PREFS, ...data.prefs };
	}
	if (data.stats && typeof data.stats === 'object') {
		cache.stats = { ...cache.stats, ...data.stats };
	}
	if (data.chat !== undefined) cache.chat = data.chat;
	cache.ready = true;
	if (emitChange) emit();
}

/** Load user reading library from Nest DB. Call once on Studio / Reader mount. */
export async function hydrateAiReadingStore() {
	if (typeof window === 'undefined') return cache;
	if (cache.hydrating) return cache.hydrating;

	cache.hydrating = (async () => {
		const token = localStorage.getItem('accessToken');
		if (!token) {
			cache.ready = true;
			return cache;
		}
		try {
			const { data } = await api.get('/ai-reading/state', { timeout: 60000 });
			const empty =
				!data ||
				((!data.books || data.books.length === 0) &&
					(!data.prompts || data.prompts.length === 0) &&
					(!data.topics || data.topics.length === 0));

			/* One-time migrate from old localStorage → DB, then clear browser keys */
			if (empty) {
				const legacyBooks = readLegacy('so7ba.aiReading.books.v1', []);
				const legacyPrompts = readLegacy('so7ba.aiReading.prompts.v2', null);
				const legacyTopics = readLegacy('so7ba.aiReading.topics.v2', []);
				const legacyJourneys = readLegacy('so7ba.aiReading.journeys.v1', null);
				const legacyPrefs = readLegacy('so7ba.aiReading.prefs.v1', {});
				const legacyStats = readLegacy('so7ba.aiReading.stats.v1', {});
				const legacyChat = readLegacy('so7ba.aiReading.chat.v1', null);
				const hasLegacy =
					(Array.isArray(legacyBooks) && legacyBooks.length) ||
					(Array.isArray(legacyPrompts) && legacyPrompts.length) ||
					(Array.isArray(legacyTopics) && legacyTopics.length);

				if (hasLegacy) {
					const migrated = {
						books: Array.isArray(legacyBooks) ? legacyBooks : [],
						prompts: Array.isArray(legacyPrompts)
							? legacyPrompts
							: [buildDefaultPolishPrompt(), buildDefaultMemorizePrompt()],
						topics: Array.isArray(legacyTopics) ? legacyTopics : [],
						journeys: Array.isArray(legacyJourneys) ? legacyJourneys : [],
						prefs: { ...DEFAULT_PREFS, ...(legacyPrefs || {}) },
						stats: { ...cache.stats, ...(legacyStats || {}) },
						chat: legacyChat,
					};
					const { data: saved } = await api.put('/ai-reading/state', migrated, { timeout: 120000 });
					applyServerState(saved || migrated);
					clearLegacyLocalStorage();
					return cache;
				}
			}

			applyServerState(data || emptyStateLocal());
			clearLegacyLocalStorage();
		} catch (err) {
			console.warn('[ai-reading] hydrate failed', err?.message || err);
			cache.ready = true;
		} finally {
			cache.hydrating = null;
		}
		return cache;
	})();

	return cache.hydrating;
}

function emptyStateLocal() {
	return {
		books: [],
		prompts: [buildDefaultPolishPrompt(), buildDefaultMemorizePrompt()],
		topics: [],
		journeys: [],
		prefs: { ...DEFAULT_PREFS },
		stats: { ...cache.stats },
		chat: null,
	};
}

export function isAiReadingReady() {
	return cache.ready;
}

export async function flushAiReadingStore() {
	clearTimeout(flushTimer);
	if (flushPromise) await flushPromise;
	await flushNow();
}

export function getPrefs() {
	return { ...DEFAULT_PREFS, ...cache.prefs };
}

export function savePrefs(prefs) {
	cache.prefs = { ...getPrefs(), ...prefs };
	scheduleFlush();
	return cache.prefs;
}

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
	return { ...cache.stats };
}

export function saveStats(stats) {
	cache.stats = { ...getStats(), ...stats };
	scheduleFlush();
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
	return Array.isArray(cache.books) ? cache.books : [];
}

export function getBook(id) {
	return listBooks().find(b => b.id === id) || null;
}

export function upsertBook(book) {
	const books = [...listBooks()];
	const idx = books.findIndex(b => b.id === book.id);
	const next = { ...book, updatedAt: new Date().toISOString() };
	if (idx >= 0) books[idx] = next;
	else books.unshift(next);
	cache.books = books;
	scheduleFlush();
	/* Also push single book for faster durability on import */
	if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
		api.post('/ai-reading/books', { book: next }, { timeout: 120000 }).catch(() => {});
	}
	return next;
}

export function deleteBook(id) {
	cache.books = listBooks().filter(b => b.id !== id);
	scheduleFlush();
	if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
		api.delete(`/ai-reading/books/${encodeURIComponent(id)}`).catch(() => {});
	}
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
	if (!Array.isArray(cache.prompts)) {
		cache.prompts = [buildDefaultPolishPrompt(), buildDefaultMemorizePrompt()];
		scheduleFlush();
	}
	return cache.prompts;
}

export function ensureDefaultMemorizePrompt() {
	const prompts = listPrompts();
	if (prompts.some(p => p.id === DEFAULT_MEMORIZE_PROMPT_ID)) return prompts;
	cache.prompts = [buildDefaultMemorizePrompt(), ...prompts];
	scheduleFlush();
	return cache.prompts;
}

export function ensureDefaultPolishPrompt() {
	const prompts = listPrompts();
	if (prompts.some(p => p.id === DEFAULT_POLISH_PROMPT_ID)) return prompts;
	cache.prompts = [buildDefaultPolishPrompt(), ...prompts];
	scheduleFlush();
	return cache.prompts;
}

export function upsertPrompt(prompt) {
	const prompts = [...listPrompts()];
	const vars = extractVariables(prompt.body);
	const next = {
		...prompt,
		variables: vars,
		updatedAt: new Date().toISOString(),
	};
	const idx = prompts.findIndex(p => p.id === next.id);
	if (idx >= 0) prompts[idx] = next;
	else prompts.unshift(next);
	cache.prompts = prompts;
	scheduleFlush();
	return next;
}

export function deletePrompt(id) {
	cache.prompts = listPrompts().filter(p => p.id !== id);
	scheduleFlush();
}

export function listTopics() {
	return Array.isArray(cache.topics) ? cache.topics : [];
}

export function upsertTopic(topic) {
	const topics = [...listTopics()];
	const next = { ...topic, updatedAt: new Date().toISOString() };
	const idx = topics.findIndex(t => t.id === next.id);
	if (idx >= 0) topics[idx] = next;
	else topics.unshift(next);
	cache.topics = topics;
	scheduleFlush();
	return next;
}

export function deleteTopic(id) {
	cache.topics = listTopics().filter(t => t.id !== id);
	scheduleFlush();
}

export function listJourneys() {
	if (!Array.isArray(cache.journeys) || !cache.journeys.length) {
		cache.journeys = [defaultJourney()];
		scheduleFlush();
	}
	return cache.journeys.map(j => ({ ...j, progressPercent: journeyProgress(j) }));
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
	const journeys = [...listJourneys()];
	const next = {
		...journey,
		progressPercent: journeyProgress(journey),
		updatedAt: new Date().toISOString(),
	};
	const idx = journeys.findIndex(j => j.id === next.id);
	if (idx >= 0) journeys[idx] = next;
	else journeys.unshift(next);
	cache.journeys = journeys;
	scheduleFlush();
	return next;
}

export function deleteJourney(id) {
	cache.journeys = listJourneys().filter(j => j.id !== id);
	scheduleFlush();
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

export function getChatSession() {
	if (!cache.chat?.id) {
		cache.chat = createChatSession({
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
		scheduleFlush();
	}
	return cache.chat;
}

export function saveChatSession(session) {
	cache.chat = { ...session, updatedAt: new Date().toISOString() };
	scheduleFlush();
	return cache.chat;
}

export function clearChatSession() {
	cache.chat = createChatSession({
		messages: [
			{
				id: uid('msg'),
				role: 'assistant',
				content: 'Fresh start. What would you like to learn in the next 10 minutes?',
				createdAt: new Date().toISOString(),
			},
		],
	});
	scheduleFlush();
	return cache.chat;
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
