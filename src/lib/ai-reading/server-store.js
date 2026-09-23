import fs from 'fs/promises';
import path from 'path';
import { extractVariables } from './prompts.js';

const ROOT = path.join(process.cwd(), 'data', 'ai-reading');

async function ensure() {
	await fs.mkdir(ROOT, { recursive: true });
}

async function readJson(name, fallback) {
	await ensure();
	const file = path.join(ROOT, name);
	try {
		const raw = await fs.readFile(file, 'utf8');
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

async function writeJson(name, data) {
	await ensure();
	await fs.writeFile(path.join(ROOT, name), JSON.stringify(data, null, 2), 'utf8');
}

export async function listServerBooks() {
	return readJson('books.json', []);
}

export async function saveServerBooks(books) {
	await writeJson('books.json', books);
	return books;
}

export async function upsertServerBook(book) {
	const books = await listServerBooks();
	const idx = books.findIndex(b => b.id === book.id);
	const next = { ...book, updatedAt: new Date().toISOString() };
	if (idx >= 0) books[idx] = next;
	else books.unshift(next);
	await saveServerBooks(books);
	return next;
}

export async function deleteServerBook(id) {
	const books = (await listServerBooks()).filter(b => b.id !== id);
	await saveServerBooks(books);
	return { ok: true };
}

export async function listServerPrompts() {
	const prompts = await readJson('prompts.json', null);
	if (Array.isArray(prompts)) return prompts;
	await writeJson('prompts.json', []);
	return [];
}

export async function saveServerPrompts(prompts) {
	await writeJson('prompts.json', prompts);
	return prompts;
}

export async function upsertServerPrompt(prompt) {
	const prompts = await listServerPrompts();
	const next = {
		...prompt,
		variables: extractVariables(prompt.body),
		updatedAt: new Date().toISOString(),
	};
	const idx = prompts.findIndex(p => p.id === next.id);
	if (idx >= 0) prompts[idx] = next;
	else prompts.unshift(next);
	await saveServerPrompts(prompts);
	return next;
}

export async function deleteServerPrompt(id) {
	const prompts = (await listServerPrompts()).filter(p => p.id !== id);
	await saveServerPrompts(prompts);
	return { ok: true };
}

export async function getServerPrefs() {
	return readJson('prefs.json', null);
}

export async function saveServerPrefs(prefs) {
	const next = { ...prefs, updatedAt: new Date().toISOString() };
	await writeJson('prefs.json', next);
	return next;
}
