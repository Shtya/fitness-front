/*
 * English courses: each lecture is a "day" — a video, its transcript, the words you picked out,
 * questions to answer and speaking practice. Pure helpers (tested in english-model.test.mjs).
 */

export const COURSE_KINDS = ['general', 'english'];
export const SPEAK_MINUTES = [1, 3, 5, 10];

export const enId = (prefix = 'x') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function emptyDay() {
	return { videoUrl: '', transcript: '', words: [], questions: [], speaking: [] };
}

/** Same shape the server keeps (missing parts filled in). */
export function normalizeDay(raw) {
	const v = raw && typeof raw === 'object' ? raw : {};
	return {
		videoUrl: typeof v.videoUrl === 'string' ? v.videoUrl : '',
		transcript: typeof v.transcript === 'string' ? v.transcript : '',
		words: Array.isArray(v.words) ? v.words.filter(w => w && w.id && w.text) : [],
		questions: Array.isArray(v.questions) ? v.questions.filter(q => q && q.id) : [],
		speaking: Array.isArray(v.speaking) ? v.speaking.filter(s => s && s.id) : [],
	};
}

/** YouTube video id from any common link form (watch, youtu.be, shorts, embed, live); else null. */
export function youtubeId(url) {
	const s = String(url || '').trim();
	if (!s) return null;
	let u;
	try {
		u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
	} catch {
		return null;
	}
	const host = u.hostname.replace(/^www\.|^m\./, '');
	const ok = v => (v && /^[\w-]{11}$/.test(v) ? v : null);
	if (host === 'youtu.be') return ok(u.pathname.split('/')[1]);
	if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
		if (u.pathname === '/watch') return ok(u.searchParams.get('v'));
		const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
		return m ? ok(m[2]) : null;
	}
	return null;
}

/** Start time in seconds from ?t= / &start= (e.g. 90, 1m30s), or 0. */
export function youtubeStart(url) {
	try {
		const u = new URL(String(url || '').trim());
		const t = u.searchParams.get('t') || u.searchParams.get('start') || '';
		if (/^\d+$/.test(t)) return Number(t);
		const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
		return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
	} catch {
		return 0;
	}
}

export const isLink = url => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(String(url || '').trim());

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A word's pattern in running text: case-insensitive, whole words, and for single words the
 * usual endings too (introduce → introduces / introduced / introducing).
 */
function inflected(word) {
	const w = escapeRe(word);
	const forms = [`${w}(?:s|es|d|ed|ing|'s)?`];
	if (/e$/i.test(word) && word.length > 3) forms.push(`${escapeRe(word.slice(0, -1))}(?:ing|ed)`);
	if (/y$/i.test(word) && word.length > 3) forms.push(`${escapeRe(word.slice(0, -1))}(?:ies|ied)`);
	return `(?:${forms.join('|')})`;
}

function wordPattern(text) {
	const t = String(text || '').trim();
	if (!t) return null;
	const parts = t.split(/\s+/);
	// phrases: the first word may change (look forward to → looking forward to)
	if (parts.length > 1) return [inflected(parts[0]), ...parts.slice(1).map(escapeRe)].join('\\s+');
	return inflected(t);
}

/**
 * Splits `text` into plain pieces and pieces that are one of `words` (longest first, so
 * "pick up" wins over "pick"). Returns [{ text, word? }].
 */
export function markWords(text, words) {
	const src = String(text || '');
	const list = (words || []).filter(w => w && String(w.text || '').trim()).sort((a, b) => b.text.length - a.text.length);
	if (!src || !list.length) return src ? [{ text: src }] : [];
	const pats = list.map(w => wordPattern(w.text));
	const re = new RegExp(`(?<![\\p{L}\\p{N}'])(?:${pats.map(p => `(${p})`).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
	const out = [];
	let last = 0;
	for (const m of src.matchAll(re)) {
		const which = m.slice(1).findIndex(g => g !== undefined);
		if (which < 0) continue;
		if (m.index > last) out.push({ text: src.slice(last, m.index) });
		out.push({ text: m[0], word: list[which] });
		last = m.index + m[0].length;
	}
	if (last < src.length) out.push({ text: src.slice(last) });
	return out;
}

/** The sentence of `text` that contains `phrase` (first match), trimmed; '' if not found. */
export function sentenceAround(text, phrase) {
	const src = String(text || '');
	const p = String(phrase || '').trim();
	if (!src || !p) return '';
	const at = src.toLowerCase().indexOf(p.toLowerCase());
	if (at < 0) return '';
	const before = src.slice(0, at);
	const start = Math.max(before.lastIndexOf('.'), before.lastIndexOf('?'), before.lastIndexOf('!'), before.lastIndexOf('\n')) + 1;
	const rest = src.slice(at + p.length);
	const endRel = rest.search(/[.?!\n]/);
	const end = endRel < 0 ? src.length : at + p.length + endRel + 1;
	const out = src.slice(start, end).replace(/\s+/g, ' ').trim();
	return out.length > 300 ? `${out.slice(0, 297)}…` : out;
}

/** A selection is a word or short phrase worth saving (1–6 words, letters, not too long). */
export function isWordSelection(s) {
	const t = String(s || '').trim();
	return t.length >= 2 && t.length <= 60 && /\p{L}/u.test(t) && t.split(/\s+/).length <= 6;
}

/* ───── Markdown transcripts ───── */

/**
 * Inline Markdown → runs: [{ text, b?, i?, code? }]. Handles **bold**, __bold__, *italic*,
 * _italic_, `code`, [text](link) (kept as text) and backslash escapes. Unclosed markers stay text.
 */
export function parseInline(src) {
	const s = String(src || '');
	const out = [];
	const push = (text, f = {}) => {
		if (!text) return;
		const last = out[out.length - 1];
		if (last && Boolean(last.b) === Boolean(f.b) && Boolean(last.i) === Boolean(f.i) && Boolean(last.code) === Boolean(f.code)) last.text += text;
		else out.push({ text, ...f });
	};
	const walk = (str, f) => {
		let i = 0;
		let buf = '';
		while (i < str.length) {
			const ch = str[i];
			if (ch === '\\' && i + 1 < str.length && /[\\`*_[\]#>-]/.test(str[i + 1])) {
				buf += str[i + 1];
				i += 2;
				continue;
			}
			if (ch === '`') {
				const end = str.indexOf('`', i + 1);
				if (end > i) {
					push(buf, f);
					buf = '';
					push(str.slice(i + 1, end), { ...f, code: true });
					i = end + 1;
					continue;
				}
			}
			if (ch === '[') {
				const m = str.slice(i).match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
				if (m) {
					buf += m[1];
					i += m[0].length;
					continue;
				}
			}
			const dbl = str.slice(i, i + 2);
			if (dbl === '**' || dbl === '__') {
				const end = str.indexOf(dbl, i + 2);
				if (end > i + 2) {
					push(buf, f);
					buf = '';
					walk(str.slice(i + 2, end), { ...f, b: true });
					i = end + 2;
					continue;
				}
			}
			// single * or _ : italic (an _ inside a word is just a character)
			if ((ch === '*' || (ch === '_' && !/[\p{L}\p{N}]/u.test(str[i - 1] || ''))) && str[i + 1] && str[i + 1] !== ' ') {
				const end = str.indexOf(ch, i + 1);
				if (end > i + 1 && str[end - 1] !== ' ' && !(ch === '_' && /[\p{L}\p{N}]/u.test(str[end + 1] || ''))) {
					push(buf, f);
					buf = '';
					walk(str.slice(i + 1, end), { ...f, i: true });
					i = end + 1;
					continue;
				}
			}
			buf += ch;
			i += 1;
		}
		push(buf, f);
	};
	walk(s, {});
	return out;
}

/**
 * Block Markdown → [{ type: 'h1'|'h2'|'h3'|'p'|'quote'|'ul'|'ol'|'hr'|'code', text?, items? }].
 * Consecutive lines join into one paragraph; a blank line ends it. Speaker lines such as
 * "**Jessica:** Hello" stay separate paragraphs because each starts a new line in a dialogue.
 */
export function parseMarkdown(src) {
	const lines = String(src || '')
		.replace(/\r\n?/g, '\n')
		.split('\n');
	const blocks = [];
	let para = null;
	let list = null;
	let code = null;
	const endPara = () => {
		if (para) blocks.push(para);
		para = null;
	};
	const endList = () => {
		if (list) blocks.push(list);
		list = null;
	};
	for (const raw of lines) {
		if (code) {
			if (/^\s*```/.test(raw)) {
				blocks.push(code);
				code = null;
			} else code.text += (code.text ? '\n' : '') + raw;
			continue;
		}
		const line = raw.trim();
		if (/^```/.test(line)) {
			endPara();
			endList();
			code = { type: 'code', text: '' };
			continue;
		}
		if (!line) {
			endPara();
			endList();
			continue;
		}
		let m;
		if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
			endPara();
			endList();
			blocks.push({ type: `h${Math.min(3, m[1].length)}`, text: m[2].replace(/\s+#+\s*$/, '') });
			continue;
		}
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.replace(/\s/g, ''))) {
			endPara();
			endList();
			blocks.push({ type: 'hr' });
			continue;
		}
		if ((m = line.match(/^>\s?(.*)$/))) {
			endList();
			if (para?.type === 'quote') para.text += ` ${m[1]}`;
			else {
				endPara();
				para = { type: 'quote', text: m[1] };
			}
			continue;
		}
		if ((m = line.match(/^([-*+]|\d+[.)])\s+(.*)$/))) {
			endPara();
			const type = /\d/.test(m[1]) ? 'ol' : 'ul';
			if (!list || list.type !== type) {
				endList();
				list = { type, items: [] };
			}
			list.items.push(m[2]);
			continue;
		}
		endList();
		// a new speaker line ("**Name:**" or "Name:") starts its own paragraph
		const speaker = /^(\*\*|__)?[\p{L}][\p{L} .'-]{0,30}:(\*\*|__)?\s/u.test(line) || /^\*\*[^*]{1,30}:\*\*/.test(line);
		if (para && para.type === 'p' && !speaker) para.text += ` ${line}`;
		else {
			endPara();
			para = { type: 'p', text: line };
		}
	}
	if (code) blocks.push(code);
	endPara();
	endList();
	return blocks;
}

/** Plain text of a Markdown transcript (for the AI and for example sentences). */
export const markdownText = src =>
	parseMarkdown(src)
		.map(b => (b.items ? b.items.map(it => parseInline(it).map(r => r.text).join('')).join('\n') : b.text != null ? (b.type === 'code' ? b.text : parseInline(b.text).map(r => r.text).join('')) : ''))
		.filter(Boolean)
		.join('\n');

/** The transcript in paragraphs (blank lines or single newlines). */
export const paragraphs = text =>
	String(text || '')
		.split(/\n+/)
		.map(p => p.trim())
		.filter(Boolean);

export const totalSpokenSeconds = day => (day?.speaking || []).reduce((n, s) => n + (Number(s.seconds) || 0), 0);

export function clock(sec) {
	const s = Math.max(0, Math.round(sec || 0));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
