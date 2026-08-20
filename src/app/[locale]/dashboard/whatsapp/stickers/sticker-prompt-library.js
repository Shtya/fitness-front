import { STICKER_AI_PRESETS, STICKER_PROMPT_CARDS } from './sticker-chatgpt-prompt';

export const NEW_STICKER_PROMPT_ID = '__new__';
export const SAVE_STICKER_PROMPT_ID = '__save__';

const STORAGE_KEY = 'so7ba.wa.sticker-prompt-library.v1';
const MAX_SAVED = 40;
const MAX_TITLE = 80;
const MAX_TEXT = 8000;

function safeParse(raw) {
	try {
		const value = JSON.parse(raw);
		return Array.isArray(value) ? value : [];
	} catch {
		return [];
	}
}

function normalizeSaved(item) {
	const id = String(item?.id || '').trim();
	const title = String(item?.title || '').trim().slice(0, MAX_TITLE);
	const text = String(item?.text || item?.prompt || '').trim().slice(0, MAX_TEXT);
	if (!id.startsWith('saved-') || !title || text.length < 2) return null;
	return {
		id,
		kind: 'saved',
		titleAr: title,
		titleEn: title,
		hintAr: arHint(text),
		hintEn: arHint(text),
		text,
		prompt: String(item?.prompt || text).trim().slice(0, 1200),
		createdAt: Number(item?.createdAt) || Date.now(),
	};
}

function arHint(text) {
	return text.replace(/\s+/g, ' ').slice(0, 72);
}

export function loadSavedStickerPrompts() {
	if (typeof window === 'undefined') return [];
	return safeParse(window.localStorage.getItem(STORAGE_KEY))
		.map(normalizeSaved)
		.filter(Boolean)
		.slice(0, MAX_SAVED);
}

export function persistSavedStickerPrompts(items) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify(items.slice(0, MAX_SAVED).map(item => ({
			id: item.id,
			title: item.titleAr || item.titleEn,
			text: item.text,
			prompt: item.prompt,
			createdAt: item.createdAt,
		}))),
	);
}

export function saveStickerPrompt({ title, text, prompt }) {
	const body = String(text || prompt || '').trim().slice(0, MAX_TEXT);
	const label = String(title || body).trim().slice(0, MAX_TITLE) || 'Prompt';
	if (body.length < 2) return null;
	const item = {
		id: `saved-${Date.now()}`,
		kind: 'saved',
		titleAr: label,
		titleEn: label,
		hintAr: arHint(body),
		hintEn: arHint(body),
		text: body,
		prompt: String(prompt || body).trim().slice(0, 1200),
		createdAt: Date.now(),
	};
	persistSavedStickerPrompts([item, ...loadSavedStickerPrompts().filter(current => current.id !== item.id)]);
	return item;
}

export function deleteSavedStickerPrompt(id) {
	persistSavedStickerPrompts(loadSavedStickerPrompts().filter(item => item.id !== id));
}

export function listStickerPromptLibrary() {
	const cards = STICKER_PROMPT_CARDS.map(card => ({
		id: card.id,
		kind: 'builtin',
		titleAr: card.titleAr,
		titleEn: card.titleEn,
		hintAr: card.hintAr,
		hintEn: card.hintEn,
		text: card.text,
		prompt: card.prompt || card.text.slice(0, 400),
	}));
	const presets = STICKER_AI_PRESETS.map(item => ({
		id: `preset:${item.id}`,
		kind: 'preset',
		titleAr: item.ar,
		titleEn: item.en,
		hintAr: item.prompt,
		hintEn: item.prompt,
		text: item.prompt,
		prompt: item.prompt,
	}));
	return [...cards, ...presets, ...loadSavedStickerPrompts()];
}

export function findStickerPrompt(id, items = listStickerPromptLibrary()) {
	return items.find(item => item.id === id) || null;
}

export function stickerPromptSelectOptions(items, ar) {
	return [
		...items.map(item => ({
			value: item.id,
			label: ar ? item.titleAr : item.titleEn,
			description: ar ? item.hintAr : item.hintEn,
		})),
		{
			value: NEW_STICKER_PROMPT_ID,
			label: ar ? 'اكتب برومبت جديد' : 'Write new prompt',
		},
		{
			value: SAVE_STICKER_PROMPT_ID,
			label: ar ? 'حفظ البرومبت الحالي' : 'Save this prompt',
		},
	];
}
