/**
 * Shared search-target builder for the contact finder (side panel) and the search hub window.
 * Pure functions only — safe to import from any client page.
 */
import { citySearchTerms, isArabic } from './city-aliases';

/* ------------------------------------------------------------------ */
/* Phone                                                               */
/* ------------------------------------------------------------------ */

export function digitsOnly(value) {
	return String(value || '').replace(/\D/g, '');
}

/** Any phone-ish string → international digits (EG local 01x… gets the 20 prefix). */
export function normalizePhone(raw) {
	let digits = digitsOnly(String(raw || '').replace(/@.*$/, '').split(':')[0]);
	if (!digits) return '';
	if (digits.startsWith('00')) digits = digits.slice(2);
	if (/^01[0125]\d{8}$/.test(digits)) digits = `20${digits.slice(1)}`;
	return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

export const COUNTRY_PREFIXES = [
	['966', 'SA'], ['971', 'AE'], ['965', 'KW'], ['974', 'QA'], ['973', 'BH'], ['968', 'OM'],
	['962', 'JO'], ['961', 'LB'], ['964', 'IQ'], ['963', 'SY'], ['970', 'PS'], ['212', 'MA'],
	['213', 'DZ'], ['216', 'TN'], ['218', 'LY'], ['249', 'SD'], ['20', 'EG'], ['44', 'GB'],
	['49', 'DE'], ['33', 'FR'], ['90', 'TR'], ['1', 'US'],
];

export function splitPhone(digits) {
	for (const [prefix, code] of COUNTRY_PREFIXES) {
		if (digits.startsWith(prefix) && digits.length - prefix.length >= 7) {
			return { cc: prefix, country: code, national: digits.slice(prefix.length) };
		}
	}
	return { cc: '', country: 'EG', national: digits };
}

export function guessCountryCode(digits) {
	return splitPhone(digits).country;
}

function group(str, sizes) {
	const parts = [];
	let i = 0;
	for (const size of sizes) {
		if (i >= str.length) break;
		parts.push(str.slice(i, i + size));
		i += size;
	}
	if (i < str.length) parts[parts.length - 1] += str.slice(i);
	return parts.join(' ');
}

/**
 * Every way people actually write the number online.
 * For 201123428116 → 01123428116 · 201123428116 · +201123428116 · 1123428116 ·
 * "0112 342 8116" · "+20 112 342 8116".
 */
export function phoneFormats(digits) {
	if (!digits) return null;
	const { cc, country, national } = splitPhone(digits);
	const nanp = cc === '1';
	const local = nanp ? national : `0${national}`;
	const localSpaced = nanp
		? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
		: group(local, local.length === 11 ? [4, 3, 4] : [3, 3, 4]);
	const intlSpaced = `+${cc} ${group(national, national.length === 10 ? [3, 3, 4] : [2, 3, 4])}`;
	return {
		country,
		cc,
		national,
		local,
		intl: digits,
		e164: `+${digits}`,
		localSpaced,
		intlSpaced,
	};
}

/** Quoted OR group. `full` adds spaced + bare national forms (more recall, more words). */
function phoneOrQuery(f, full) {
	const terms = full
		? [f.local, f.intl, f.localSpaced, f.intlSpaced.replace('+', ''), f.national]
		: [f.local, f.intl, f.localSpaced];
	return [...new Set(terms)].map((term) => `"${term}"`).join(' OR ');
}

/* ------------------------------------------------------------------ */
/* Names & media                                                       */
/* ------------------------------------------------------------------ */

export function cleanName(name) {
	return String(name || '')
		.replace(/\p{Extended_Pictographic}|️|‍/gu, '')
		.replace(/[~*_|•·]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function isUsefulContactName(name) {
	const value = cleanName(name);
	if (value.length < 2) return false;
	if (/^\+?\d[\d\s-]{6,}$/.test(value)) return false;
	if (/^\d+$/.test(value)) return false;
	return true;
}

/** Reverse-image engines must be able to fetch the photo themselves. */
export function isPubliclyReachable(url) {
	try {
		const { protocol, hostname } = new URL(url);
		if (!/^https?:$/.test(protocol)) return false;
		if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i.test(hostname)) return false;
		if (/\.(local|localhost|test)$/i.test(hostname)) return false;
		return true;
	} catch {
		return false;
	}
}

export function hostOf(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

/* ------------------------------------------------------------------ */
/* Targets                                                             */
/* ------------------------------------------------------------------ */

/** Highest-signal sources, picked by default for the one-shot search. */
export const CORE_IDS = [
	'google-phone',
	'google-name-phone',
	'google-name-city',
	'social-phone',
	'facebook-phone-web',
	'facebook-phone',
	'facebook-name-city-web',
	'facebook-name-city',
	'instagram-phone',
	'instagram-name-city',
	'tiktok-phone',
	'truecaller',
	'syncme',
	'wa-mentions',
	'lens',
];

export const GROUP_ORDER = ['web', 'social', 'phone', 'image'];

const enc = (value) => encodeURIComponent(String(value || '').trim());
const googleUrl = (query) => `https://www.google.com/search?q=${enc(query)}`;

/** `op:"a"` or `(op:"a" OR op:"b")` — Google needs the operator repeated on every alternative. */
function anyOf(op, terms) {
	const list = [...new Set(terms.filter(Boolean))].map((term) => `${op}:"${term}"`);
	if (!list.length) return '';
	return list.length === 1 ? list[0] : `(${list.join(' OR ')})`;
}

/** Same for site: filters. */
function sites(domains) {
	return domains.length === 1 ? `site:${domains[0]}` : `(${domains.map((d) => `site:${d}`).join(' OR ')})`;
}

/**
 * Build public search URLs with explicit Google operators.
 *
 * Shape of every Google query:   site:<where>  intitle:"<name>"  intext:"<number / city>"
 *  - site:     limits to the platform (instagram.com, facebook.com …)
 *  - intitle:  profile pages put the person's name in the <title>, so the name goes here on social sites
 *  - intext:   the number (every format) or the city spellings must appear in the page text
 *
 * Precision rules (a name on its own matches thousands of people):
 *  1. Every query is anchored on the NUMBER, or on NAME + CITY/EXTRA together — never the name alone,
 *     and the name is never OR-ed with the number.
 *  2. Number queries never get the city appended (the number is already unique).
 *
 * Each target carries `query` (human readable) so the UI can show exactly what is searched.
 */
export function buildSearchTargets({ name, phoneDigits, city, cityText, keywords, avatarUrl }) {
	const n = isUsefulContactName(name) ? cleanName(name) : '';
	const f = phoneFormats(digitsOnly(phoneDigits));
	const extra = String(keywords || '').trim();

	const cityTerms = city ? citySearchTerms(city, 4) : cityText ? [String(cityText).trim()] : [];
	// For sites without operator support, use the spelling that matches the name's script.
	const cityPlain = city ? (isArabic(n) ? city.ar[0] : city.en[0]) : cityTerms[0] || '';

	const phoneShortTerms = f ? [f.local, f.intl, f.localSpaced] : [];
	const phoneFullTerms = f ? [f.local, f.intl, f.localSpaced, f.intlSpaced.replace('+', ''), f.national] : [];
	const phoneText = anyOf('intext', phoneShortTerms); // (intext:"011…" OR intext:"2011…" OR intext:"0112 …")
	const phoneTextFull = anyOf('intext', phoneFullTerms);
	const cityText_ = anyOf('intext', cityTerms); // (intext:"المحلة الكبرى" OR intext:"Mahalla" …)
	const extraText = extra ? `intext:"${extra}"` : '';
	const ctx = [cityText_, extraText].filter(Boolean).join(' ');
	const ctxPlain = [cityPlain, extra].filter(Boolean).join(' ');

	const nameText = n ? `intext:"${n}"` : '';
	const nameTitle = n ? `intitle:"${n}"` : '';

	const out = [];
	const add = (id, group, labelEn, labelAr, query, url, more = {}) => {
		if (!url || !query) return;
		out.push({ id, group, labelEn, labelAr, query, url, ...more });
	};
	const g = (id, group, labelEn, labelAr, ...parts) => {
		if (parts.some((part) => !part)) return; // every part is required
		const query = parts.join(' ');
		add(id, group, labelEn, labelAr, query, googleUrl(query));
	};

	// ---------------- Web
	if (f) g('google-phone', 'web', 'Google · number, every format', 'جوجل · الرقم بكل صيغه', phoneTextFull);
	if (n && f) g('google-name-phone', 'web', 'Google · name AND number', 'جوجل · الاسم مع الرقم', nameText, phoneText);
	if (n && ctx) g('google-name-city', 'web', 'Google · name AND city', 'جوجل · الاسم مع المدينة', nameText, ctx);
	if (f) g('google-files', 'web', 'Docs & sheets with the number', 'ملفات فيها الرقم',
		'(filetype:pdf OR filetype:xls OR filetype:xlsx OR filetype:doc OR filetype:docx)', phoneText);
	if (n && (ctx || f)) {
		const imgQ = [nameText, ctx || phoneText].join(' ');
		add('google-images', 'web',
			ctx ? 'Google Images · name AND city' : 'Google Images · name AND number',
			ctx ? 'صور جوجل · الاسم مع المدينة' : 'صور جوجل · الاسم مع الرقم', imgQ,
			`https://www.google.com/search?tbm=isch&q=${enc(imgQ)}`);
	}
	if (f) {
		// Bing / Yandex don't understand intext: — plain quoted phrases are their equivalent.
		const plain = phoneOrQuery(f, false);
		add('bing', 'web', 'Bing · number', 'Bing · الرقم', plain, `https://www.bing.com/search?q=${enc(plain)}`);
		add('yandex-web', 'web', 'Yandex · number', 'Yandex · الرقم', plain, `https://yandex.com/search/?text=${enc(plain)}`);
		add('ddg', 'web', 'DuckDuckGo · number', 'DuckDuckGo · الرقم', `"${f.local}"`, `https://duckduckgo.com/?q=${enc(`"${f.local}"`)}`);
	}

	// ---------------- Social: number first, then name (in the profile title) + city
	if (f) {
		g('social-phone', 'social', 'All social sites · number', 'كل السوشيال · الرقم',
			sites(['facebook.com', 'instagram.com', 'tiktok.com', 'x.com', 'linkedin.com', 't.me']), phoneText);
		g('facebook-phone-web', 'social', 'Facebook · number (Google)', 'فيسبوك · الرقم (جوجل)', 'site:facebook.com', phoneText);
		add('facebook-phone', 'social', 'Facebook search · number', 'بحث فيسبوك · الرقم', f.local,
			`https://www.facebook.com/search/top/?q=${enc(f.local)}`);
	}
	if (n && ctx) {
		g('facebook-name-city-web', 'social', 'Facebook · name AND city (Google)', 'فيسبوك · الاسم مع المدينة (جوجل)',
			'site:facebook.com', nameTitle, ctx);
		const fbQ = `${n} ${ctxPlain}`;
		add('facebook-name-city', 'social', 'Facebook people · name + city', 'أشخاص فيسبوك · الاسم + المدينة', fbQ,
			`https://www.facebook.com/search/people/?q=${enc(fbQ)}`);
	}
	if (f) g('instagram-phone', 'social', 'Instagram · number', 'إنستجرام · الرقم', 'site:instagram.com', phoneText);
	if (n && ctx) g('instagram-name-city', 'social', 'Instagram · name AND city', 'إنستجرام · الاسم مع المدينة', 'site:instagram.com', nameTitle, ctx);
	if (f) g('tiktok-phone', 'social', 'TikTok · number', 'تيك توك · الرقم', 'site:tiktok.com', phoneText);
	if (n && ctx) g('tiktok-name-city', 'social', 'TikTok · name AND city', 'تيك توك · الاسم مع المدينة', 'site:tiktok.com', nameTitle, ctx);
	if (f) g('x-phone', 'social', 'X (Twitter) · number', 'إكس · الرقم', sites(['x.com', 'twitter.com']), phoneText);
	if (n && ctx) g('linkedin-name-city', 'social', 'LinkedIn · name AND city', 'لينكدإن · الاسم مع المدينة', 'site:linkedin.com/in', nameTitle, ctx);
	if (f) g('telegram-phone', 'social', 'Telegram · number', 'تيليجرام · الرقم', 'site:t.me', phoneText);

	// No number and no city: one clearly-labelled broad search so the panel is never empty.
	if (!f && n && !ctx) g('google-name-broad', 'web', 'Google · name only (broad)', 'جوجل · الاسم بس (نتايج كتير)', nameText);

	// ---------------- Phone lookups
	if (f) {
		add('truecaller', 'phone', 'Truecaller', 'Truecaller', `${f.country} ${f.national}`,
			`https://www.truecaller.com/search/${f.country.toLowerCase()}/${f.national}`);
		add('syncme', 'phone', 'Sync.me', 'Sync.me', f.e164, `https://sync.me/search/?number=${enc(f.e164)}`);
		g('wa-mentions', 'phone', 'WhatsApp links online', 'روابط واتساب منشورة',
			anyOf('intext', [`wa.me/${f.intl}`, `wa.me/+${f.intl}`, `api.whatsapp.com/send?phone=${f.intl}`]));
		const ads = f.country === 'EG'
			? sites(['dubizzle.com.eg', 'olx.com.eg', 'opensooq.com'])
			: sites(['opensooq.com', 'dubizzle.com', 'haraj.com.sa']);
		g('classifieds', 'phone', 'Ads & classifieds · number', 'إعلانات مبوبة · الرقم', ads, phoneText);
		add('whatsapp', 'phone', 'Open in WhatsApp', 'فتح في واتساب', f.e164, `https://wa.me/${f.intl}`, { skipInBulk: true });
	}

	// ---------------- Photo
	if (avatarUrl && isPubliclyReachable(avatarUrl)) {
		const a = enc(avatarUrl);
		add('lens', 'image', 'Google Lens', 'جوجل لنس', avatarUrl, `https://lens.google.com/uploadbyurl?url=${a}`);
		add('yandex-image', 'image', 'Yandex image', 'Yandex صورة', avatarUrl, `https://yandex.com/images/search?rpt=imageview&url=${a}`);
		add('bing-image', 'image', 'Bing visual', 'Bing صورة', avatarUrl,
			`https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${a}`);
		add('tineye', 'image', 'TinEye', 'TinEye', avatarUrl, `https://tineye.com/search?url=${a}`);
	}

	return out;
}

/* ------------------------------------------------------------------ */
/* Tab opening + hub hand-off                                          */
/* ------------------------------------------------------------------ */

/** Opens a tab; returns false when the browser's pop-up blocker refused it. */
export function openTab(url) {
	if (!url || typeof window === 'undefined') return false;
	const win = window.open(url, '_blank');
	if (!win) return false;
	try {
		win.opener = null;
	} catch {
		/* cross-origin */
	}
	return true;
}

/**
 * Ask the browser for a NEW WINDOW (not a tab).
 * Pages can't create windows directly — window.open() gives a tab, or a tab-less popup.
 * A Shift+click on a link is the browser's own "open in new window" gesture, so we send one
 * from inside the user's real click. If a browser ignores the modifier it falls back to a tab.
 */
export function openInNewWindow(url) {
	if (typeof document === 'undefined') return;
	const link = document.createElement('a');
	link.href = url;
	link.target = '_blank';
	link.rel = 'noopener';
	link.style.display = 'none';
	document.body.appendChild(link);
	link.dispatchEvent(
		new MouseEvent('click', { bubbles: true, cancelable: true, view: window, shiftKey: true }),
	);
	link.remove();
}

export const HUB_PREFIX = 'wa-sf-hub:';

/** Payload is passed through localStorage so the phone never lands in a URL / server log. */
export function writeHubPayload(id, payload) {
	try {
		// Drop stale hand-offs (older than a day).
		const cutoff = Date.now() - 86_400_000;
		for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
			const key = window.localStorage.key(i);
			if (!key?.startsWith(HUB_PREFIX)) continue;
			try {
				const old = JSON.parse(window.localStorage.getItem(key) || '{}');
				if (!old.createdAt || old.createdAt < cutoff) window.localStorage.removeItem(key);
			} catch {
				window.localStorage.removeItem(key);
			}
		}
		window.localStorage.setItem(`${HUB_PREFIX}${id}`, JSON.stringify({ ...payload, createdAt: Date.now() }));
		return true;
	} catch {
		return false;
	}
}

export function readHubPayload(id) {
	try {
		const raw = window.localStorage.getItem(`${HUB_PREFIX}${id}`);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
