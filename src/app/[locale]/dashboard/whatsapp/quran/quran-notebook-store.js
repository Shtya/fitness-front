/**
 * Shared access to the mistakes log for screens outside the log itself (the mushaf reader).
 * Same localStorage copy the log reads; new entries also go to the cloud right away
 * (the server merges by id, so sending just the new entry is safe).
 */
import { putQuranRevisionState } from '../../quran-revision/quran-revision-api';
import { createMistake, mergeMistakes, normalizeMistakes } from './quran-mistakes';

export const LS_MISTAKES = 'so7ba:quran-revision:mistakes:v1';
export const NOTEBOOK_EVENT = 'wa-quran-notebook-change';

export function readMistakes() {
	try {
		return normalizeMistakes(JSON.parse(localStorage.getItem(LS_MISTAKES) || '[]'));
	} catch {
		return [];
	}
}

function writeMistakes(list) {
	try {
		localStorage.setItem(LS_MISTAKES, JSON.stringify(list));
	} catch {
		/* quota / private mode */
	}
	window.dispatchEvent(new Event(NOTEBOOK_EVENT));
}

export function saveNewMistake(fields) {
	const m = createMistake(fields);
	if (!m) return null;
	writeMistakes(mergeMistakes(readMistakes(), [m]));
	void putQuranRevisionState({ mistakes: [m] }).catch(() => {});
	return m;
}

export function deleteMistake(id) {
	const now = Date.now();
	const list = readMistakes();
	const target = list.find(m => m.id === id);
	if (!target) return;
	const tomb = { ...target, deletedAt: now, updatedAt: now };
	writeMistakes(list.map(m => (m.id === id ? tomb : m)));
	void putQuranRevisionState({ mistakes: [tomb] }).catch(() => {});
}
