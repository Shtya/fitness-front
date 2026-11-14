'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AppWindow,
	Check,
	ChevronDown,
	Code2,
	Copy,
	ExternalLink,
	Hash,
	Loader2,
	MapPin,
	Pencil,
	Phone,
	RotateCcw,
	Search,
	ShieldAlert,
	Sparkles,
	Square,
	UserRound,
	Zap,
} from 'lucide-react';
import { phoneIntelApi } from '@/app/[locale]/dashboard/phone-check/phone-intel-api';
import { baseImg } from '@/utils/axios';
import CityAutocomplete from './contact-search/CityAutocomplete';
import TargetIcon from './contact-search/TargetIcon';
import QueryText from './contact-search/QueryText';
import { citySearchTerms, suggestCities } from './contact-search/city-aliases';
import {
	CORE_IDS,
	GROUP_ORDER,
	buildSearchTargets,
	cleanName,
	guessCountryCode,
	hostOf,
	isPubliclyReachable,
	isUsefulContactName,
	normalizePhone,
	openTab,
	phoneFormats,
	openInNewWindow,
	writeHubPayload,
} from './contact-search/targets';

const SELECTION_KEY = 'wa-sf-selected-v4';
const POPUPS_OK_KEY = 'wa-sf-popups-ok';
const DEEP_TIMEOUT_MS = 210_000;
const POLL_MS = 1200;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function absoluteMediaUrl(url) {
	const raw = String(url || '').trim();
	if (!raw) return '';
	if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
	if (raw.startsWith('//')) return `https:${raw}`;
	const origin = String(baseImg || '').trim().replace(/\/$/, '');
	if (!origin) return raw;
	return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function pickPhoneRaw(conversation) {
	const contact = conversation?.contact || {};
	for (const raw of [contact.phoneNumber, contact.e164, contact.waId, conversation?.providerChatId]) {
		if (/@(lid|g\.us)$/i.test(String(raw || ''))) continue; // LIDs / groups are not phone numbers
		const digits = normalizePhone(raw);
		if (digits) return digits;
	}
	return '';
}

function storageGet(key) {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function storageSet(key, value) {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		/* storage unavailable */
	}
}

function newId() {
	try {
		return crypto.randomUUID();
	} catch {
		return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
	}
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

const COPY = {
	en: {
		title: 'Find this person',
		sub: 'Edit the details, pick a city, then search every source in one click.',
		name: 'Name',
		phone: 'Phone',
		extra: 'Extra',
		extraPh: 'Job, company, school… (optional)',
		cityPh: 'Type a city — e.g. Mahalla or المحلة',
		editable: 'Editable — fix the name if WhatsApp has it wrong',
		nameFrom: { saved: 'Saved', whatsapp: 'WhatsApp', chat: 'Chat' },
		searchingAs: 'Searching as',
		reset: 'Reset',
		searchAll: 'Search everywhere',
		sources: (k) => `${k} tab${k === 1 ? '' : 's'}`,
		withDeep: '+ deep phone check',
		newWindow: 'Open all in a new window',
		newWindowSub: (k) => `One window with ${k} search tabs`,
		newWindowTip: 'Opens a separate browser window, then every selected search opens as a tab inside it.',
		deepOnly: 'Deep check',
		stop: 'Stop',
		copyLinks: 'Copy links',
		copied: 'Copied',
		firstTime: 'First time? Allow pop-ups for this site once, so every tab opens in one click.',
		blockedTitle: (k) => `The browser blocked ${k} tab${k === 1 ? '' : 's'}`,
		blockedSteps: [
			'Click the blocked pop-up icon at the right end of the address bar.',
			'Choose “Always allow pop-ups and redirects from this site”, then Done.',
			'Press Search everywhere again — all tabs open at once.',
		],
		openNext: (k) => `Open next (${k} left)`,
		pick: 'Sources',
		core: 'Recommended',
		all: 'All',
		none: 'None',
		groups: { web: 'Web', social: 'Social', phone: 'Phone lookups', image: 'Photo (reverse image)' },
		photoPrivate: 'The photo is on a private address, so reverse-image engines can’t fetch it.',
		noPhone: 'No phone number — the deep check needs one.',
		deeping: 'Deep checking',
		deepDone: 'Deep check finished',
		findings: 'What we found',
		bestMatch: 'Best match',
		useName: 'Search with this name',
		names: 'Other names',
		locations: 'Locations',
		mentions: 'Public mentions',
		links: 'More lookups',
		empty: 'No strong public signals yet. Add a city or job, or open the sources manually.',
		failed: 'Deep search failed',
		timeout: 'Stopped waiting — the check may still finish in the background. Try again shortly.',
		opened: 'Opened',
		include: 'Include in one-click search',
		queries: 'Exact queries',
		queriesHint: 'Every query is tied to the number, or to the name AND the city — never the name alone. The city is never added to number searches.',
	},
	ar: {
		title: 'ابحث عن الشخص',
		sub: 'عدّل البيانات، اختار المدينة، وابحث في كل المصادر بضغطة واحدة.',
		name: 'الاسم',
		phone: 'الرقم',
		extra: 'إضافي',
		extraPh: 'الشغل، الشركة، المدرسة… (اختياري)',
		cityPh: 'اكتب المدينة — مثلاً المحلة أو Mahalla',
		editable: 'تقدر تعدّله — صلّح الاسم لو واتساب كاتبه غلط',
		nameFrom: { saved: 'محفوظ', whatsapp: 'واتساب', chat: 'المحادثة' },
		searchingAs: 'هيدوّر بـ',
		reset: 'رجوع',
		searchAll: 'ابحث في كل مكان',
		sources: (k) => `${k} تبويب`,
		withDeep: '+ فحص عميق للرقم',
		newWindow: 'افتح الكل في نافذة جديدة',
		newWindowSub: (k) => `نافذة واحدة فيها ${k} تبويب بحث`,
		newWindowTip: 'بيفتح نافذة متصفح جديدة، وكل عمليات البحث المختارة بتفتح كتابات جواها.',
		deepOnly: 'فحص عميق',
		stop: 'إيقاف',
		copyLinks: 'نسخ الروابط',
		copied: 'اتنسخ',
		firstTime: 'أول مرة؟ اسمح بالنوافذ المنبثقة للموقع مرة واحدة، وكل التابات هتفتح بضغطة.',
		blockedTitle: (k) => `المتصفح منع ${k} تبويب`,
		blockedSteps: [
			'دوس على أيقونة النوافذ المحظورة آخر شريط العنوان.',
			'اختار «السماح دائمًا بالنوافذ المنبثقة من هذا الموقع» ثم تم.',
			'دوس «ابحث في كل مكان» تاني — كل التابات هتفتح مرة واحدة.',
		],
		openNext: (k) => `افتح التالي (باقي ${k})`,
		pick: 'المصادر',
		core: 'المقترح',
		all: 'الكل',
		none: 'ولا حاجة',
		groups: { web: 'ويب', social: 'سوشيال', phone: 'البحث بالرقم', image: 'الصورة (بحث عكسي)' },
		photoPrivate: 'الصورة على عنوان داخلي، محركات البحث بالصورة مش هتوصلها.',
		noPhone: 'مفيش رقم — الفحص العميق محتاج رقم.',
		deeping: 'جاري الفحص العميق',
		deepDone: 'الفحص العميق خلص',
		findings: 'اللي لقيناه',
		bestMatch: 'أقرب تطابق',
		useName: 'ابحث بالاسم ده',
		names: 'أسماء تانية',
		locations: 'أماكن',
		mentions: 'إشارات عامة',
		links: 'بحث إضافي',
		empty: 'مفيش إشارات قوية لسه. ضيف مدينة أو شغل، أو افتح المصادر يدويًا.',
		failed: 'فشل البحث العميق',
		timeout: 'وقفنا الانتظار — الفحص ممكن يخلص في الخلفية. جرّب تاني بعد شوية.',
		opened: 'اتفتح',
		include: 'ضمّه للبحث بضغطة واحدة',
		queries: 'جمل البحث بالظبط',
		queriesHint: 'كل بحث مربوط بالرقم، أو بالاسم مع المدينة — عمر الاسم ما بيتبحث لوحده. والمدينة مش بتتضاف لبحث الرقم.',
	},
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ContactSocialFinder({ conversation, displayName = '', avatarUrl = '', locale = 'en' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const copy = ar ? COPY.ar : COPY.en;

	// ---- Contact-derived defaults
	const contactPhone = useMemo(() => pickPhoneRaw(conversation), [conversation]);
	const nameOptions = useMemo(() => {
		const contact = conversation?.contact || {};
		const raw = [
			['saved', displayName],
			['saved', contact.name],
			['whatsapp', contact.pushName || contact.notify || contact.verifiedName],
			['chat', conversation?.title],
		];
		const out = [];
		for (const [source, value] of raw) {
			if (!isUsefulContactName(value)) continue;
			const clean = cleanName(value);
			if (out.some((item) => item.value.toLowerCase() === clean.toLowerCase())) continue;
			out.push({ source, value: clean });
		}
		return out;
	}, [conversation, displayName]);
	const contactName = nameOptions[0]?.value || '';
	const resolvedAvatar = useMemo(() => absoluteMediaUrl(avatarUrl), [avatarUrl]);
	const defaultPhone = contactPhone ? `+${contactPhone}` : '';

	// ---- Editable query
	const [nameInput, setNameInput] = useState(contactName);
	const [phoneInput, setPhoneInput] = useState(defaultPhone);
	const [cityValue, setCityValue] = useState({ text: '', city: null });
	const [keywords, setKeywords] = useState('');
	const phoneDigits = useMemo(() => normalizePhone(phoneInput), [phoneInput]);
	const formats = useMemo(() => phoneFormats(phoneDigits), [phoneDigits]);
	const countryCode = useMemo(() => (phoneDigits ? guessCountryCode(phoneDigits) : 'EG'), [phoneDigits]);
	const edited = nameInput !== contactName || phoneInput !== defaultPhone || Boolean(cityValue.text) || Boolean(keywords);

	const targets = useMemo(
		() =>
			buildSearchTargets({
				name: nameInput,
				phoneDigits,
				city: cityValue.city,
				cityText: cityValue.city ? '' : cityValue.text,
				keywords,
				avatarUrl: resolvedAvatar,
			}),
		[nameInput, phoneDigits, cityValue, keywords, resolvedAvatar],
	);
	const photoPrivate = Boolean(resolvedAvatar) && !isPubliclyReachable(resolvedAvatar);

	// ---- Source selection (persisted per browser)
	const [selected, setSelected] = useState(() => new Set(CORE_IDS));
	const [popupsOk, setPopupsOk] = useState(true);
	useEffect(() => {
		try {
			const parsed = JSON.parse(storageGet(SELECTION_KEY) || 'null');
			if (Array.isArray(parsed)) setSelected(new Set(parsed));
		} catch {
			/* ignore */
		}
		setPopupsOk(storageGet(POPUPS_OK_KEY) === '1');
	}, []);
	const updateSelected = useCallback((updater) => {
		setSelected((prev) => {
			const next = updater(new Set(prev));
			storageSet(SELECTION_KEY, JSON.stringify([...next]));
			return next;
		});
	}, []);

	const bulkTargets = useMemo(
		() => targets.filter((target) => selected.has(target.id) && !target.skipInBulk),
		[targets, selected],
	);

	// ---- UI state
	const [opened, setOpened] = useState(() => new Set());
	const [queue, setQueue] = useState([]);
	const [copiedKey, setCopiedKey] = useState('');
	const [sourcesOpen, setSourcesOpen] = useState(false);
	const [queriesOpen, setQueriesOpen] = useState(false);
	const [hubId] = useState(newId);

	// ---- Deep search
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [job, setJob] = useState(null);
	const [result, setResult] = useState(null);
	const runRef = useRef(0);

	// Reset when switching to another contact.
	useEffect(() => {
		runRef.current += 1;
		setNameInput(contactName);
		setPhoneInput(defaultPhone);
		setCityValue({ text: '', city: null });
		setKeywords('');
		setOpened(new Set());
		setQueue([]);
		setBusy(false);
		setError('');
		setJob(null);
		setResult(null);
	}, [conversation?.id, contactName, defaultPhone]);

	useEffect(
		() => () => {
			runRef.current += 1;
		},
		[],
	);

	// Hand-off for the new window (via localStorage, so the number never lands in a URL).
	const hubPayload = useMemo(
		() => ({
			locale: ar ? 'ar' : 'en',
			name: nameInput,
			phoneDigits,
			cityText: cityValue.text,
			cityId: cityValue.city?.id || '',
			keywords,
			avatarUrl: resolvedAvatar,
			selectedIds: [...selected],
		}),
		[ar, nameInput, phoneDigits, cityValue, keywords, resolvedAvatar, selected],
	);
	useEffect(() => {
		writeHubPayload(hubId, hubPayload);
	}, [hubId, hubPayload]);

	const markOpened = useCallback((ids) => {
		if (!ids.length) return;
		setOpened((prev) => {
			const next = new Set(prev);
			ids.forEach((id) => next.add(id));
			return next;
		});
	}, []);

	const copyText = useCallback(async (text, key) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedKey(key);
			window.setTimeout(() => setCopiedKey((current) => (current === key ? '' : current)), 1600);
		} catch {
			/* clipboard blocked */
		}
	}, []);

	const runDeepSearch = useCallback(async () => {
		if (!phoneDigits) {
			setError(copy.noPhone);
			return;
		}
		const runId = ++runRef.current;
		setBusy(true);
		setError('');
		setJob(null);
		setResult(null);
		try {
			const started = await phoneIntelApi.startEnrich({
				phone: phoneDigits,
				countryCode,
				refresh: true,
				nameHint: isUsefulContactName(nameInput) ? cleanName(nameInput) : undefined,
			});
			if (runId !== runRef.current) return;
			setJob(started);
			if (started?.result) setResult(started.result);
			if (!started?.jobId || started.status === 'done') return;

			const startedAt = Date.now();
			let lastStatus = started.status;
			while (Date.now() - startedAt < DEEP_TIMEOUT_MS) {
				await new Promise((resolve) => setTimeout(resolve, POLL_MS));
				if (runId !== runRef.current) return;
				let next;
				try {
					next = await phoneIntelApi.getEnrichJob(started.jobId);
				} catch {
					continue; // transient poll error — keep waiting
				}
				if (runId !== runRef.current) return;
				setJob(next);
				lastStatus = next?.status;
				if (next?.result) setResult(next.result);
				if (lastStatus === 'done') break;
				if (lastStatus === 'failed') {
					setError(next.errorMessage || copy.failed);
					break;
				}
			}
			if (lastStatus === 'running' || lastStatus === 'queued') setError(copy.timeout);
		} catch (err) {
			if (runId !== runRef.current) return;
			setError(err?.response?.data?.message || copy.failed);
		} finally {
			if (runId === runRef.current) setBusy(false);
		}
	}, [phoneDigits, countryCode, nameInput, copy]);

	const stopDeep = () => {
		runRef.current += 1;
		setBusy(false);
	};

	/** One click: start the deep check, then open every selected source in this same gesture. */
	const searchEverywhere = () => {
		if (phoneDigits && !busy) void runDeepSearch();
		const ok = [];
		const blocked = [];
		for (const target of bulkTargets) {
			if (openTab(target.url)) ok.push(target.id);
			else blocked.push(target);
		}
		markOpened(ok);
		setQueue(blocked);
		if (bulkTargets.length > 1) {
			const allOk = blocked.length === 0;
			storageSet(POPUPS_OK_KEY, allOk ? '1' : '0');
			setPopupsOk(allOk);
		}
	};

	/** One click: new browser window → it opens every selected search as a tab inside itself. */
	const openAllInNewWindow = () => {
		if (phoneDigits && !busy) void runDeepSearch();
		writeHubPayload(hubId, { ...hubPayload, autoOpenAt: Date.now() });
		openInNewWindow(`/${ar ? 'ar' : 'en'}/open/search-hub#${hubId}`);
		markOpened(bulkTargets.map((target) => target.id));
		setQueue([]);
	};

	const openOne = (target) => {
		if (openTab(target.url)) {
			markOpened([target.id]);
			setQueue((prev) => prev.filter((item) => item.id !== target.id));
		}
	};

	const openNextQueued = () => {
		const [head, ...rest] = queue;
		if (head && openTab(head.url)) {
			markOpened([head.id]);
			setQueue(rest);
		}
	};

	const copyAllLinks = () => {
		const lines = bulkTargets.map((target) => `${ar ? target.labelAr : target.labelEn}: ${target.url}`);
		void copyText(lines.join('\n'), 'links');
	};

	const resetQuery = () => {
		setNameInput(contactName);
		setPhoneInput(defaultPhone);
		setCityValue({ text: '', city: null });
		setKeywords('');
	};

	const applyLocation = (loc) => {
		const match = suggestCities(String(loc), { limit: 1, countryCode })[0];
		setCityValue(match ? { text: ar ? match.ar[0] : match.en[0], city: match } : { text: String(loc), city: null });
	};

	// ---- Groups for the source picker
	const groups = useMemo(
		() =>
			GROUP_ORDER.map((key) => ({
				key,
				label: copy.groups[key],
				items: targets.filter((target) => target.group === key),
			})).filter((group) => group.items.length || (group.key === 'image' && photoPrivate)),
		[targets, copy, photoPrivate],
	);

	const toggleGroup = (items) => {
		const ids = items.filter((item) => !item.skipInBulk).map((item) => item.id);
		const allOn = ids.every((id) => selected.has(id));
		updateSelected((next) => {
			ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
			return next;
		});
	};

	// ---- Deep results
	const findings = result?.findings || {};
	const names = useMemo(() => {
		const list = [];
		const push = (label) => {
			const value = cleanName(label);
			if (isUsefulContactName(value) && !list.some((item) => item.toLowerCase() === value.toLowerCase())) list.push(value);
		};
		push(result?.identity?.possiblePublicName?.label);
		(Array.isArray(findings.names) ? findings.names : []).forEach((item) => push(item?.label || item));
		(Array.isArray(result?.publicPresence) ? result.publicPresence : []).forEach((hit) => push(hit?.possibleName));
		return list.slice(0, 10);
	}, [result, findings.names]);
	const bestName = names[0] || '';
	const locations = Array.isArray(findings.locations) ? findings.locations.slice(0, 6) : [];
	const presence = (Array.isArray(result?.publicPresence) ? result.publicPresence : [])
		.filter((hit) => (hit?.confidenceScore ?? 1) >= 0.25 && (hit?.sourceUrl || hit?.url))
		.slice(0, 10);
	const extraLinks = Object.entries({
		...(result?.manualSearchLinks && typeof result.manualSearchLinks === 'object' ? result.manualSearchLinks : {}),
		...(result?.externalManualSearch && typeof result.externalManualSearch === 'object' ? result.externalManualSearch : {}),
	})
		.filter(([, url]) => typeof url === 'string' && /^https?:/i.test(url))
		.slice(0, 12);
	const liveTargets = Array.isArray(job?.searchTargets)
		? job.searchTargets
		: Array.isArray(result?.searchTargets)
			? result.searchTargets
			: [];
	const progress = Math.min(100, Math.max(0, Number(job?.progressPercent || 0)));
	const hasFindings = names.length > 0 || locations.length > 0 || presence.length > 0 || extraLinks.length > 0;

	const phoneChips = formats ? [...new Set([formats.local, formats.e164, formats.localSpaced, formats.intlSpaced])] : [];
	const cityTerms = cityValue.city ? citySearchTerms(cityValue.city, 4) : [];
	const altNames = nameOptions.filter((item) => item.value !== cleanName(nameInput));

	if (!contactName && !contactPhone && !resolvedAvatar) return null;

	const canSearch = bulkTargets.length > 0 || Boolean(phoneDigits);

	return (
		<section className="wa-sf" aria-labelledby="wa-sf-title" dir={ar ? 'rtl' : 'ltr'}>
			<header className="wa-sf__head">
				<span className="wa-sf__head-icon" aria-hidden>
					<Search size={15} strokeWidth={2.4} />
				</span>
				<div className="wa-sf__head-text">
					<h4 id="wa-sf-title">{copy.title}</h4>
					<p>{copy.sub}</p>
				</div>
				{edited ? (
					<button type="button" className="wa-sf__reset" onClick={resetQuery}>
						<RotateCcw size={11} aria-hidden />
						{copy.reset}
					</button>
				) : null}
			</header>

			{/* ---------------- Query form */}
			<div className="wa-sf__form">
				<div className="wa-sf__row">
					<label className="wa-sf__field" title={copy.editable}>
						<UserRound size={14} aria-hidden />
						<span className="wa-sf__field-tag">{copy.name}</span>
						<input
							value={nameInput}
							onChange={(event) => setNameInput(event.target.value)}
							placeholder={copy.name}
							autoComplete="off"
							dir="auto"
						/>
						<Pencil size={12} className="wa-sf__field-edit" aria-hidden />
					</label>
					{altNames.length > 0 ? (
						<div className="wa-sf__mini-chips">
							{altNames.map((item) => (
								<button key={`${item.source}-${item.value}`} type="button" onClick={() => setNameInput(item.value)}>
									<em>{copy.nameFrom[item.source]}</em>
									<span dir="auto">{item.value}</span>
								</button>
							))}
						</div>
					) : null}
				</div>

				<div className="wa-sf__row">
					<label className="wa-sf__field">
						<Phone size={14} aria-hidden />
						<span className="wa-sf__field-tag">{copy.phone}</span>
						<input
							value={phoneInput}
							onChange={(event) => setPhoneInput(event.target.value)}
							placeholder="+20 1xx xxx xxxx"
							inputMode="tel"
							dir="ltr"
							autoComplete="off"
						/>
						{formats ? <span className="wa-sf__field-badge">{formats.country}</span> : null}
					</label>
					{phoneChips.length > 0 ? (
						<div className="wa-sf__mini-chips" dir="ltr">
							{phoneChips.map((variant) => (
								<button key={variant} type="button" onClick={() => void copyText(variant, `v:${variant}`)} title="Copy">
									{copiedKey === `v:${variant}` ? <Check size={10} aria-hidden /> : <Hash size={10} aria-hidden />}
									<span>{variant}</span>
								</button>
							))}
						</div>
					) : null}
				</div>

				<div className="wa-sf__row">
					<CityAutocomplete
						value={cityValue}
						onChange={setCityValue}
						countryCode={countryCode}
						ar={ar}
						placeholder={copy.cityPh}
					/>
					{cityTerms.length > 0 ? (
						<div className="wa-sf__mini-chips is-static">
							<em>{copy.searchingAs}</em>
							{cityTerms.map((term) => (
								<span key={term} dir="auto">
									{term}
								</span>
							))}
						</div>
					) : null}
				</div>

				<label className="wa-sf__field">
					<MapPin size={14} aria-hidden style={{ visibility: 'hidden' }} />
					<span className="wa-sf__field-tag">{copy.extra}</span>
					<input
						value={keywords}
						onChange={(event) => setKeywords(event.target.value)}
						placeholder={copy.extraPh}
						autoComplete="off"
						dir="auto"
					/>
				</label>
			</div>

			{/* ---------------- Actions */}
			<div className="wa-sf__cta">
				<button type="button" className="wa-sf__primary" onClick={searchEverywhere} disabled={!canSearch}>
					<Zap size={17} aria-hidden />
					<span className="wa-sf__primary-label">
						<strong>{copy.searchAll}</strong>
						<small>
							{copy.sources(bulkTargets.length)}
							{phoneDigits ? ` ${copy.withDeep}` : ''}
						</small>
					</span>
				</button>

				<button
					type="button"
					className="wa-sf__window"
					onClick={openAllInNewWindow}
					disabled={!bulkTargets.length}
					title={copy.newWindowTip}
				>
					<AppWindow size={16} aria-hidden />
					<span className="wa-sf__primary-label">
						<strong>{copy.newWindow}</strong>
						<small>{copy.newWindowSub(bulkTargets.length)}</small>
					</span>
				</button>

				<div className="wa-sf__secondary">
					{busy ? (
						<button type="button" className="wa-sf__ghost" onClick={stopDeep}>
							<Square size={12} aria-hidden />
							{copy.stop}
						</button>
					) : (
						<button
							type="button"
							className="wa-sf__ghost"
							onClick={() => void runDeepSearch()}
							disabled={!phoneDigits}
							title={!phoneDigits ? copy.noPhone : undefined}
						>
							<Sparkles size={13} aria-hidden />
							{copy.deepOnly}
						</button>
					)}
					<button type="button" className="wa-sf__ghost" onClick={copyAllLinks} disabled={!bulkTargets.length}>
						{copiedKey === 'links' ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
						{copiedKey === 'links' ? copy.copied : copy.copyLinks}
					</button>
				</div>

				{!popupsOk && queue.length === 0 ? <p className="wa-sf__hint">{copy.firstTime}</p> : null}
			</div>

			{queue.length > 0 ? (
				<div className="wa-sf__notice" role="status">
					<ShieldAlert size={16} aria-hidden />
					<div>
						<strong>{copy.blockedTitle(queue.length)}</strong>
						<ol>
							{copy.blockedSteps.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
						<button type="button" className="wa-sf__notice-btn" onClick={openNextQueued}>
							<ExternalLink size={12} aria-hidden />
							{copy.openNext(queue.length)} · {ar ? queue[0].labelAr : queue[0].labelEn}
						</button>
					</div>
				</div>
			) : null}

			{/* ---------------- Deep progress */}
			{busy || liveTargets.length > 0 ? (
				<div className="wa-sf__progress">
					<div className="wa-sf__progress-row">
						<span>
							{busy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Check size={12} aria-hidden />}
							{busy ? copy.deeping : copy.deepDone}
							{job?.currentStep && busy ? <em> · {job.currentStep}</em> : null}
						</span>
						<b>{busy ? `${progress}%` : ''}</b>
					</div>
					{busy ? (
						<div className="wa-sf__bar" aria-hidden>
							<span style={{ width: `${Math.max(progress, 4)}%` }} />
						</div>
					) : null}
					{liveTargets.length > 0 ? (
						<div className="wa-sf__status-list">
							{liveTargets.slice(0, 12).map((target) => (
								<span
									key={target.id || target.labelEn}
									className={`wa-sf__status is-${target.status || 'pending'}`}
									title={target.message || ''}
								>
									<i aria-hidden />
									{(ar && target.labelAr) || target.labelEn || target.id}
								</span>
							))}
						</div>
					) : null}
				</div>
			) : null}

			{error ? <p className="wa-sf__error">{error}</p> : null}

			{/* ---------------- Findings */}
			{hasFindings ? (
				<div className="wa-sf__findings">
					{bestName ? (
						<div className="wa-sf__match">
							<span className="wa-sf__label">{copy.bestMatch}</span>
							<strong dir="auto">{bestName}</strong>
							{bestName !== cleanName(nameInput) ? (
								<button type="button" className="wa-sf__link" onClick={() => setNameInput(bestName)}>
									<Search size={12} aria-hidden />
									{copy.useName}
								</button>
							) : null}
						</div>
					) : null}

					{names.length > 1 ? (
						<div className="wa-sf__block">
							<p className="wa-sf__label">{copy.names}</p>
							<div className="wa-sf__chips">
								{names.slice(1).map((item) => (
									<button key={item} type="button" className="wa-sf__chip" onClick={() => setNameInput(item)} title={copy.useName}>
										<UserRound size={11} aria-hidden />
										<span dir="auto">{item}</span>
									</button>
								))}
							</div>
						</div>
					) : null}

					{locations.length > 0 ? (
						<div className="wa-sf__block">
							<p className="wa-sf__label">{copy.locations}</p>
							<div className="wa-sf__chips">
								{locations.map((loc) => (
									<button key={String(loc)} type="button" className="wa-sf__chip" onClick={() => applyLocation(loc)}>
										<MapPin size={11} aria-hidden />
										<span dir="auto">{String(loc)}</span>
									</button>
								))}
							</div>
						</div>
					) : null}

					{presence.length > 0 ? (
						<div className="wa-sf__block">
							<p className="wa-sf__label">{copy.mentions}</p>
							<ul className="wa-sf__hits">
								{presence.map((hit, index) => {
									const href = hit.sourceUrl || hit.url;
									return (
										<li key={`${href}-${index}`}>
											<a href={href} target="_blank" rel="noopener noreferrer">
												<span className="wa-sf__hit-title" dir="auto">
													{hit.title || hit.possibleName || hostOf(href)}
												</span>
												<span className="wa-sf__hit-host">{hostOf(href)}</span>
												{hit.snippet ? (
													<span className="wa-sf__hit-snippet" dir="auto">
														{hit.snippet}
													</span>
												) : null}
											</a>
										</li>
									);
								})}
							</ul>
						</div>
					) : null}

					{extraLinks.length > 0 ? (
						<div className="wa-sf__block">
							<p className="wa-sf__label">{copy.links}</p>
							<div className="wa-sf__chips">
								{extraLinks.map(([key, url]) => (
									<a key={key} className="wa-sf__chip" href={url} target="_blank" rel="noopener noreferrer">
										<ExternalLink size={11} aria-hidden />
										{key.replace(/[_-]/g, ' ')}
									</a>
								))}
							</div>
						</div>
					) : null}
				</div>
			) : result && !busy ? (
				<p className="wa-sf__empty">{copy.empty}</p>
			) : null}

			{/* ---------------- Sources */}
			<div className="wa-sf__panel">
				<div className="wa-sf__panel-head">
					<button
						type="button"
						className="wa-sf__collapse"
						onClick={() => setSourcesOpen((open) => !open)}
						aria-expanded={sourcesOpen}
					>
						<ChevronDown size={14} className={sourcesOpen ? '' : 'is-closed'} aria-hidden />
						{copy.pick}
						<span className="wa-sf__count">
							{bulkTargets.length}/{targets.filter((target) => !target.skipInBulk).length}
						</span>
					</button>
					<div className="wa-sf__presets">
						<button type="button" onClick={() => updateSelected(() => new Set(CORE_IDS))}>
							{copy.core}
						</button>
						<button type="button" onClick={() => updateSelected(() => new Set(targets.map((target) => target.id)))}>
							{copy.all}
						</button>
						<button type="button" onClick={() => updateSelected(() => new Set())}>
							{copy.none}
						</button>
					</div>
				</div>

				{sourcesOpen
					? groups.map((group) => {
							const bulkable = group.items.filter((item) => !item.skipInBulk);
							const onCount = bulkable.filter((item) => selected.has(item.id)).length;
							return (
								<div key={group.key} className="wa-sf__group">
									<button
										type="button"
										className="wa-sf__group-head"
										onClick={() => toggleGroup(group.items)}
										disabled={!bulkable.length}
									>
										<span>{group.label}</span>
										{bulkable.length ? (
											<span className="wa-sf__count">
												{onCount}/{bulkable.length}
											</span>
										) : null}
									</button>
									{group.key === 'image' && photoPrivate ? <p className="wa-sf__muted">{copy.photoPrivate}</p> : null}
									<div className="wa-sf__grid">
										{group.items.map((item) => {
											const isOn = selected.has(item.id) && !item.skipInBulk;
											const wasOpened = opened.has(item.id);
											const label = ar ? item.labelAr : item.labelEn;
											return (
												<div
													key={item.id}
													className={`wa-sf__tile${isOn ? ' is-on' : ''}${wasOpened ? ' is-opened' : ''}`}
												>
													{item.skipInBulk ? (
														<span className="wa-sf__check is-hidden" aria-hidden />
													) : (
														<button
															type="button"
															role="checkbox"
															aria-checked={isOn}
															aria-label={`${copy.include}: ${label}`}
															className="wa-sf__check"
															onClick={() =>
																updateSelected((next) => {
																	if (next.has(item.id)) next.delete(item.id);
																	else next.add(item.id);
																	return next;
																})
															}
														>
															{isOn ? <Check size={10} strokeWidth={3.5} aria-hidden /> : null}
														</button>
													)}
													<button
														type="button"
														className="wa-sf__tile-open"
														onClick={() => openOne(item)}
														title={item.query ? `${hostOf(item.url)} — ${item.query}` : hostOf(item.url)}
													>
														<TargetIcon id={item.id} />
														<span className="wa-sf__tile-label">{label}</span>
														{wasOpened ? (
															<Check size={12} className="wa-sf__tile-done" aria-label={copy.opened} />
														) : (
															<ExternalLink size={11} className="wa-sf__tile-ext" aria-hidden />
														)}
													</button>
												</div>
											);
										})}
									</div>
								</div>
							);
						})
					: null}
			</div>

			{/* ---------------- Exact queries */}
			<div className="wa-sf__panel">
				<div className="wa-sf__panel-head">
					<button
						type="button"
						className="wa-sf__collapse"
						onClick={() => setQueriesOpen((open) => !open)}
						aria-expanded={queriesOpen}
					>
						<ChevronDown size={14} className={queriesOpen ? '' : 'is-closed'} aria-hidden />
						<Code2 size={13} aria-hidden />
						{copy.queries}
					</button>
				</div>
				{queriesOpen ? (
					<>
						<p className="wa-sf__muted">{copy.queriesHint}</p>
						<ul className="wa-sf__queries">
							{targets
								.filter((target) => target.group !== 'image')
								.map((target) => (
									<li key={target.id}>
										<div className="wa-sf__query-head">
											<TargetIcon id={target.id} size={12} />
											<span>{ar ? target.labelAr : target.labelEn}</span>
											<button
												type="button"
												onClick={() => void copyText(target.query, `q:${target.id}`)}
												aria-label="Copy query"
											>
												{copiedKey === `q:${target.id}` ? <Check size={11} aria-hidden /> : <Copy size={11} aria-hidden />}
											</button>
										</div>
										<QueryText query={target.query} />
									</li>
								))}
						</ul>
					</>
				) : null}
			</div>
		</section>
	);
}
