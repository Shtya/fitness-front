/**
 * Free machine translation for reading (EN ↔ AR).
 * Same pipeline as Nest MetaWhatsAppTranslateService: MyMemory → Google gtx.
 * Server-only — do not import from client components.
 */

const ARABIC_RE = /[\u0600-\u06FF]/;
const MAX_CHARS = 4500;

export function detectDirection(text) {
	const sourceLang = ARABIC_RE.test(String(text || '')) ? 'ar' : 'en';
	return { sourceLang, targetLang: sourceLang === 'ar' ? 'en' : 'ar' };
}

function hardSplit(text, size) {
	const out = [];
	for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
	return out;
}

function chunkText(text, size) {
	const paragraphs = String(text || '').split(/\n{2,}/);
	const chunks = [];
	let buf = '';
	for (const p of paragraphs) {
		const piece = p.trim();
		if (!piece) continue;
		if (!buf) {
			buf = piece;
			continue;
		}
		if (`${buf}\n\n${piece}`.length <= size) {
			buf = `${buf}\n\n${piece}`;
		} else {
			chunks.push(buf);
			buf = piece;
		}
	}
	if (buf) chunks.push(buf);
	return chunks.length ? chunks : [String(text || '').trim()].filter(Boolean);
}

async function fetchJson(url, { timeoutMs = 15000 } = {}) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const res = await fetch(url, { signal: ctrl.signal });
		const data = await res.json().catch(() => ({}));
		return { res, data };
	} finally {
		clearTimeout(timer);
	}
}

async function translateMyMemory(text, sourceLang, targetLang) {
	const url = new URL('https://api.mymemory.translated.net/get');
	url.searchParams.set('q', text);
	url.searchParams.set('langpair', `${sourceLang}|${targetLang}`);
	const { data } = await fetchJson(url.toString());
	const translated = String(data?.responseData?.translatedText || '').trim();
	const status = data?.responseStatus;
	if (!translated || (status && status !== 200)) {
		throw new Error(data?.responseDetails || 'MyMemory empty response');
	}
	if (/MYMEMORY WARNING/i.test(translated)) {
		throw new Error(translated);
	}
	return {
		translatedText: translated,
		sourceLang,
		targetLang,
		provider: 'mymemory',
	};
}

async function translateGoogleGtx(text, sourceLang, targetLang) {
	const url = new URL('https://translate.googleapis.com/translate_a/single');
	url.searchParams.set('client', 'gtx');
	url.searchParams.set('sl', sourceLang);
	url.searchParams.set('tl', targetLang);
	url.searchParams.set('dt', 't');
	url.searchParams.set('q', text);
	const { res, data } = await fetchJson(url.toString());
	if (!res.ok) throw new Error(`Google gtx HTTP ${res.status}`);
	const parts = Array.isArray(data?.[0]) ? data[0] : [];
	const translated = parts
		.map(chunk => (Array.isArray(chunk) ? String(chunk[0] || '') : ''))
		.join('')
		.trim();
	if (!translated) throw new Error('Google gtx empty response');
	return {
		translatedText: translated,
		sourceLang,
		targetLang,
		provider: 'google-gtx',
	};
}

/** Translate a short string (word / paragraph under ~4.5k). */
export async function translateText(text, targetLang) {
	const cleaned = String(text || '').trim();
	if (!cleaned) throw new Error('text is required');
	if (cleaned.length > MAX_CHARS) {
		return translateLong(cleaned, targetLang);
	}

	const detected = detectDirection(cleaned);
	const sourceLang = detected.sourceLang;
	const to = targetLang === 'ar' || targetLang === 'en' ? targetLang : detected.targetLang;
	if (to === sourceLang) {
		return {
			translatedText: cleaned,
			sourceLang,
			targetLang: to,
			provider: 'passthrough',
		};
	}

	try {
		return await translateMyMemory(cleaned, sourceLang, to);
	} catch {
		/* try google */
	}
	return translateGoogleGtx(cleaned, sourceLang, to);
}

/** Chunked free MT for long page bodies. */
export async function translateLong(text, targetLang) {
	const cleaned = String(text || '').trim();
	if (!cleaned) throw new Error('text is required');

	const detected = detectDirection(cleaned);
	const sourceLang = detected.sourceLang;
	const to = targetLang === 'ar' || targetLang === 'en' ? targetLang : detected.targetLang;
	if (to === sourceLang) {
		return {
			translatedText: cleaned,
			sourceLang,
			targetLang: to,
			provider: 'passthrough',
		};
	}

	const chunks = chunkText(cleaned, 4000);
	const translatedParts = [];
	let provider = 'passthrough';
	for (let i = 0; i < chunks.length; i += 1) {
		const part = chunks[i];
		if (part.length <= MAX_CHARS) {
			const result = await translateText(part, to);
			translatedParts.push(result.translatedText);
			provider = result.provider;
		} else {
			for (const sub of hardSplit(part, 4000)) {
				const result = await translateText(sub, to);
				translatedParts.push(result.translatedText);
				provider = result.provider;
			}
		}
		if (i < chunks.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 120));
		}
	}

	return {
		translatedText: translatedParts.join('\n\n').trim(),
		sourceLang,
		targetLang: to,
		provider,
	};
}
