/**
 * Optional server-side JSON store for AI Reading.
 * Primary persistence is client localStorage — this is a best-effort cache.
 *
 * On Vercel/Lambda the deploy FS is read-only (EROFS). We:
 *  1) Prefer AI_READING_DATA_DIR when set
 *  2) Use /tmp/ai-reading on serverless
 *  3) Soft-fail writes into an in-memory map so imports never 500
 */

import fs from 'fs/promises';
import path from 'path';
import { extractVariables } from './prompts.js';

const memory = new Map();

function isServerless() {
	return Boolean(
		process.env.VERCEL ||
			process.env.VERCEL_ENV ||
			process.env.AWS_LAMBDA_FUNCTION_NAME ||
			process.env.AI_READING_USE_TMP === '1',
	);
}

function dataRoot() {
	const custom = String(process.env.AI_READING_DATA_DIR || '').trim();
	if (custom) return custom;
	if (isServerless() || process.env.AI_READING_USE_TMP === '1') {
		return path.join('/tmp', 'ai-reading');
	}
	return path.join(process.cwd(), 'data', 'ai-reading');
}

async function ensure() {
	await fs.mkdir(dataRoot(), { recursive: true });
}

function memKey(name) {
	return name;
}

async function readJson(name, fallback) {
	if (memory.has(memKey(name))) {
		return structuredClone(memory.get(memKey(name)));
	}
	try {
		const file = path.join(dataRoot(), name);
		const raw = await fs.readFile(file, 'utf8');
		const parsed = JSON.parse(raw);
		memory.set(memKey(name), parsed);
		return structuredClone(parsed);
	} catch {
		return fallback;
	}
}

async function writeJson(name, data) {
	memory.set(memKey(name), data);
	try {
		await ensure();
		await fs.writeFile(path.join(dataRoot(), name), JSON.stringify(data, null, 2), 'utf8');
	} catch (err) {
		const code = err?.code || '';
		if (code === 'EROFS' || code === 'EACCES' || code === 'EPERM' || code === 'ENOENT') {
			console.warn(
				`[ai-reading/server-store] write skipped (${code || err.message}) — client storage is source of truth`,
			);
			return;
		}
		console.warn('[ai-reading/server-store] write failed', err?.message || err);
	}
}

export async function listServerBooks() {
	return readJson('books.json', []);
}

export async function saveServerBooks(books) {
	await writeJson('books.json', books);
	return books;
}

export async function upsertServerBook(book) {
	try {
		const books = await listServerBooks();
		const idx = books.findIndex(b => b.id === book.id);
		const next = { ...book, updatedAt: new Date().toISOString() };
		if (idx >= 0) books[idx] = next;
		else books.unshift(next);
		await saveServerBooks(books);
		return next;
	} catch (err) {
		console.warn('[ai-reading/server-store] upsertBook soft-fail', err?.message || err);
		const next = { ...book, updatedAt: new Date().toISOString() };
		return next;
	}
}

export async function deleteServerBook(id) {
	try {
		const books = (await listServerBooks()).filter(b => b.id !== id);
		await saveServerBooks(books);
	} catch (err) {
		console.warn('[ai-reading/server-store] deleteBook soft-fail', err?.message || err);
	}
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
	try {
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
	} catch (err) {
		console.warn('[ai-reading/server-store] upsertPrompt soft-fail', err?.message || err);
		return {
			...prompt,
			variables: extractVariables(prompt.body),
			updatedAt: new Date().toISOString(),
		};
	}
}

export async function deleteServerPrompt(id) {
	try {
		const prompts = (await listServerPrompts()).filter(p => p.id !== id);
		await saveServerPrompts(prompts);
	} catch (err) {
		console.warn('[ai-reading/server-store] deletePrompt soft-fail', err?.message || err);
	}
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
