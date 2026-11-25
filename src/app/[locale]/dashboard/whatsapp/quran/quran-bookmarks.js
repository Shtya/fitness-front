/**
 * Page bookmarks for the mushaf: a few fixed ones (review / new memorisation / listening wird)
 * plus any you add. Each points at one page and can be moved to the page you are on; the
 * listening one follows the recitation by itself (the last ayah you listened to).
 * Pure helpers + a small localStorage store, synced to the account (newest edit of each wins).
 */
// Loaded on first use, so the pure helpers stay importable on their own (tests).
const putQuranRevisionState = patch => import('../../quran-revision/quran-revision-api').then(m => m.putQuranRevisionState(patch));

export const LS_BOOKMARKS = 'so7ba:quran-revision:bookmarks:v1';
export const BOOKMARKS_EVENT = 'so7ba:quran-bookmarks';
export const BOOKMARK_COLORS = ['gold', 'green', 'blue', 'red', 'purple', 'teal'];
export const DEFAULT_BOOKMARKS = [
	{ id: 'review', color: 'gold' },
	{ id: 'new', color: 'green' },
	// where you stopped listening (set by the recitation, not by hand)
	{ id: 'listen', color: 'blue' },
];
const FIXED = new Set(DEFAULT_BOOKMARKS.map(b => b.id));
export const isFixedBookmark = id => FIXED.has(id);

const validPage = p => (Number.isInteger(p) && p >= 1 && p <= 604 ? p : null);

/** Always the fixed three first (in order), then custom ones by creation. */
export function normalizeBookmarks(raw) {
	const list = Array.isArray(raw) ? raw : [];
	const byId = new Map();
	list.forEach(b => {
		if (!b || typeof b.id !== 'string' || !b.id) return;
		byId.set(b.id, {
			id: b.id,
			name: typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '',
			color: BOOKMARK_COLORS.includes(b.color) ? b.color : 'gold',
			page: validPage(Number(b.page)),
			ayah: typeof b.ayah === 'string' && /^\d{1,3}:\d{1,3}$/.test(b.ayah) ? b.ayah : '',
			createdAt: Number(b.createdAt) || 0,
			updatedAt: Number(b.updatedAt) || 0,
			...(b.deletedAt && !FIXED.has(b.id) ? { deletedAt: Number(b.deletedAt) || 1 } : {}),
		});
	});
	const fixed = DEFAULT_BOOKMARKS.map(d => ({ ...{ name: '', page: null, ayah: '', createdAt: 0, updatedAt: 0 }, ...byId.get(d.id), id: d.id, color: d.color }));
	const custom = [...byId.values()].filter(b => !FIXED.has(b.id) && b.name).sort((a, b) => a.createdAt - b.createdAt);
	return [...fixed, ...custom];
}

export function setBookmarkPage(list, id, page, now = Date.now()) {
	const p = validPage(page);
	return list.map(b => (b.id === id ? { ...b, page: p, updatedAt: now } : b));
}

/** The listening wird: the page and ayah the recitation reached. */
export function setListenMark(list, page, ayahKey, now = Date.now()) {
	const p = validPage(page);
	return list.map(b => (b.id === 'listen' ? { ...b, page: p ?? b.page, ayah: ayahKey || b.ayah, updatedAt: now } : b));
}

export const isAutoBookmark = id => id === 'listen';

export function addBookmark(list, name, page, now = Date.now()) {
	const clean = String(name || '').trim().slice(0, 40);
	if (!clean) return list;
	const used = new Set(list.map(b => b.color));
	const color = BOOKMARK_COLORS.find(c => !used.has(c)) || BOOKMARK_COLORS[list.length % BOOKMARK_COLORS.length];
	return [...list, { id: `bm-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: clean, color, page: validPage(page), createdAt: now, updatedAt: now }];
}

/** What the screen shows (deleted custom bookmarks are kept as tombstones for sync). */
export const visibleBookmarks = list => list.filter(b => !b.deletedAt);

/** Same id on two devices: the newest edit wins. */
export function mergeBookmarks(a, b) {
	const byId = new Map();
	[...(a || []), ...(b || [])].forEach(x => {
		if (!x || !x.id) return;
		const prev = byId.get(x.id);
		if (!prev || Number(x.updatedAt || 0) >= Number(prev.updatedAt || 0)) byId.set(x.id, x);
	});
	return normalizeBookmarks([...byId.values()]);
}

/** Custom bookmarks are deleted (tombstone); the fixed ones are only cleared. */
export function removeBookmark(list, id, now = Date.now()) {
	if (FIXED.has(id)) return list.map(b => (b.id === id ? { ...b, page: null, updatedAt: now } : b));
	return list.map(b => (b.id === id ? { ...b, page: null, deletedAt: now, updatedAt: now } : b));
}

export const bookmarksOnPage = (list, page) => list.filter(b => !b.deletedAt && b.page === page);

export function readBookmarks() {
	try {
		return normalizeBookmarks(JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]'));
	} catch {
		return normalizeBookmarks([]);
	}
}

export function writeBookmarks(list, { push = true } = {}) {
	const before = push ? readBookmarks() : [];
	try {
		localStorage.setItem(LS_BOOKMARKS, JSON.stringify(list));
		window.dispatchEvent(new Event(BOOKMARKS_EVENT));
	} catch {
		/* storage full / blocked: keep the in-memory list */
	}
	if (!push) return;
	// Send only what changed; the server merges by id.
	const old = new Map(before.map(b => [b.id, b.updatedAt]));
	const changed = list.filter(b => old.get(b.id) !== b.updatedAt);
	if (changed.length) void putQuranRevisionState({ bookmarks: changed }).catch(() => {});
}

/** Send some bookmarks to the account now (the listening wird is saved locally on every ayah, sent now and then). */
export function pushBookmarks(list, ids) {
	const want = new Set(ids);
	const out = list.filter(b => want.has(b.id));
	if (out.length) void putQuranRevisionState({ bookmarks: out }).catch(() => {});
}

/** Pull: merge the account's bookmarks into this device, then send back anything newer here. */
export function syncBookmarksFromCloud(cloud) {
	const local = readBookmarks();
	const merged = mergeBookmarks(local, cloud);
	writeBookmarks(merged, { push: false });
	const cloudAt = new Map((cloud || []).map(b => [b.id, Number(b.updatedAt || 0)]));
	const newer = merged.filter(b => b.updatedAt && b.updatedAt > (cloudAt.get(b.id) ?? -1));
	if (newer.length) void putQuranRevisionState({ bookmarks: newer }).catch(() => {});
	return merged;
}
