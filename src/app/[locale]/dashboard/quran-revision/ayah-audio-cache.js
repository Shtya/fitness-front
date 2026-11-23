/**
 * Ayah audio, downloaded ahead of time so each ayah starts the moment the previous one ends.
 * Playing a fresh mp3 URL waits for the network every time (the pause between ayat); a file
 * already in memory starts at once. Keeps the most recent files only.
 */

const MAX_FILES = 16;
const files = new Map(); // remote URL → { promise, local }

function trim() {
	while (files.size > MAX_FILES) {
		const [oldest, entry] = files.entries().next().value;
		files.delete(oldest);
		if (entry.local) URL.revokeObjectURL(entry.local);
	}
}

/** Start downloading (no-op when already there); resolves to a local URL or null. */
export function prefetchAyahAudio(url) {
	if (!url || typeof fetch === 'undefined') return Promise.resolve(null);
	const existing = files.get(url);
	if (existing) {
		// Recently used → keep it longest.
		files.delete(url);
		files.set(url, existing);
		return existing.promise;
	}
	const entry = { local: null, promise: null };
	entry.promise = fetch(url)
		.then(res => {
			if (!res.ok) throw new Error(String(res.status));
			return res.blob();
		})
		.then(blob => {
			entry.local = URL.createObjectURL(blob);
			return entry.local;
		})
		.catch(() => {
			files.delete(url);
			return null;
		});
	files.set(url, entry);
	trim();
	return entry.promise;
}

/** The local copy when it is ready, else the remote URL (plays from the network as before). */
export function playableAyahUrl(url) {
	const entry = files.get(url);
	if (entry?.local) {
		files.delete(url);
		files.set(url, entry);
		return entry.local;
	}
	return url;
}
