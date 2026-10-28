/**
 * Inline (ghost-text) completion for the composer.
 *
 * A small word model built from what you send and what is in the open chat: word
 * frequencies plus which word tends to follow which. It finishes the word being typed
 * and, right after a space, offers the next word when one clearly dominates — "إن شاء"
 * → "الله", "thank" → "you". Everything stays in this browser.
 */

const STORAGE_KEY = 'wa-autocomplete-v1';
const HISTORY_LIMIT = 400;
const MIN_PREFIX = 2;

/*
 * Starting vocabulary so the first suggestions are useful before anything is learned.
 * Low weights: anything you actually write soon outranks these.
 */
const SEED_PHRASES = [
	'السلام عليكم ورحمة الله وبركاته',
	'وعليكم السلام ورحمة الله وبركاته',
	'إن شاء الله',
	'الحمد لله',
	'جزاك الله خير',
	'بارك الله فيك',
	'صباح الخير',
	'مساء الخير',
	'تمام كده',
	'حاضر يا فندم',
	'ماشي تمام',
	'شكرا جدا',
	'معلش اتأخرت',
	'النهارده',
	'بكرة إن شاء الله',
	'إزيك عامل إيه',
	'مفيش مشكلة',
	'تحت أمرك',
	'أكيد طبعا',
	'لو سمحت',
	'دلوقتي',
	'المواعيد',
	'الاشتراك',
	'التمرين',
	'البرنامج',
	'الدايت',
	'متابعة',
	'Thank you so much',
	'Thanks a lot',
	'Good morning',
	'Good evening',
	'See you tomorrow',
	'Sounds good',
	'No problem',
	'Let me know',
	'Looking forward to it',
	'Please let me know if you have any questions',
	'appreciate',
	'available',
	'definitely',
	'tomorrow',
	'today',
	'meeting',
	'program',
	'workout',
	'subscription',
	'schedule',
	'perfect',
	'awesome',
	'actually',
	'everything',
];

// One-to-one character folding (length-preserving, so a typed prefix maps onto the
// stored word by index): Arabic alef/yeh/teh-marbuta variants and letter case.
const FOLD = {
	'أ': 'ا',
	'إ': 'ا',
	'آ': 'ا',
	'ٱ': 'ا',
	'ى': 'ي',
	'ة': 'ه',
};

export function foldWord(word) {
	let out = '';
	for (const char of String(word || '')) out += FOLD[char] || char.toLowerCase();
	return out;
}

const WORD_RE = /[\p{L}\p{N}'’_-]+/gu;

export function tokenize(text) {
	return String(text || '').match(WORD_RE) || [];
}

function readHistory() {
	try {
		const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
		const list = raw ? JSON.parse(raw) : [];
		return Array.isArray(list) ? list.filter(item => typeof item === 'string') : [];
	} catch {
		return [];
	}
}

/** Remember a sent message so later suggestions sound like you. */
export function rememberSentText(text) {
	const clean = String(text || '').trim();
	if (clean.length < 2) return;
	try {
		const history = readHistory();
		history.push(clean.slice(0, 600));
		globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)));
	} catch {
		// Storage can be full or blocked; suggestions just learn less.
	}
}

/**
 * Build the model. `sources` is a list of `{ text, weight }`.
 * Unigrams are keyed by folded word; each keeps its most-used spelling.
 */
export function buildCompletionModel(sources = [], { seed = true, history = true } = {}) {
	const words = new Map();
	const next = new Map();
	const add = (text, weight) => {
		const tokens = tokenize(text);
		let prev = null;
		for (const token of tokens) {
			const key = foldWord(token);
			let entry = words.get(key);
			if (!entry) {
				entry = { count: 0, forms: new Map() };
				words.set(key, entry);
			}
			entry.count += weight;
			entry.forms.set(token, (entry.forms.get(token) || 0) + weight);
			if (prev) {
				let followers = next.get(prev);
				if (!followers) {
					followers = new Map();
					next.set(prev, followers);
				}
				followers.set(key, (followers.get(key) || 0) + weight);
			}
			prev = key;
		}
	};
	if (seed) for (const phrase of SEED_PHRASES) add(phrase, 0.6);
	if (history) for (const text of readHistory()) add(text, 3);
	for (const source of sources) add(source?.text, Number(source?.weight) || 1);
	return { words, next };
}

function bestForm(entry) {
	let best = '';
	let bestCount = -1;
	for (const [form, count] of entry.forms) {
		if (count > bestCount) {
			best = form;
			bestCount = count;
		}
	}
	return best;
}

function isUpperFirst(text) {
	const first = String(text).charAt(0);
	return first !== first.toLowerCase() && first === first.toUpperCase();
}

/**
 * The text to show after the caret, or '' for no suggestion.
 * `before` is everything typed before the caret.
 */
export function suggestCompletion(model, before) {
	if (!model || !before) return '';
	const text = String(before);
	const endsWithSpace = /\s$/.test(text);
	const tokens = tokenize(text);
	if (!tokens.length) return '';

	if (endsWithSpace) {
		// Next word: only when the history makes one choice clearly the usual one.
		if (/\n$/.test(text)) return '';
		const prevKey = foldWord(tokens[tokens.length - 1]);
		const followers = model.next.get(prevKey);
		if (!followers) return '';
		let total = 0;
		let bestKey = null;
		let bestCount = 0;
		for (const [key, count] of followers) {
			total += count;
			if (count > bestCount) {
				bestKey = key;
				bestCount = count;
			}
		}
		if (!bestKey || bestCount < 1.2 || bestCount / total < 0.6) return '';
		const entry = model.words.get(bestKey);
		return entry ? bestForm(entry) : '';
	}

	// The partial word must touch the caret (no trailing punctuation).
	const partialMatch = text.match(/[\p{L}\p{N}'’_-]+$/u);
	if (!partialMatch) return '';
	const partial = partialMatch[0];
	if (Array.from(partial).length < MIN_PREFIX) return '';
	const foldedPartial = foldWord(partial);
	const prevKey = tokens.length > 1 ? foldWord(tokens[tokens.length - 2]) : null;
	const followers = prevKey ? model.next.get(prevKey) : null;

	let best = null;
	let bestScore = 0;
	for (const [key, entry] of model.words) {
		if (key.length <= foldedPartial.length || !key.startsWith(foldedPartial)) continue;
		// Context counts most: a word that usually follows the previous one wins.
		const score = entry.count + (followers?.get(key) || 0) * 4;
		if (score > bestScore || (score === bestScore && best && key.length < best.key.length)) {
			best = { key, entry };
			bestScore = score;
		}
	}
	if (!best || bestScore < 0.6) return '';
	const form = bestForm(best.entry);
	let suffix = form.slice(partial.length);
	if (!suffix) return '';
	// Keep the casing the person is typing in.
	if (partial === partial.toUpperCase() && /\p{Lu}/u.test(partial)) suffix = suffix.toUpperCase();
	else if (!isUpperFirst(partial)) suffix = suffix.toLowerCase();
	return suffix;
}
