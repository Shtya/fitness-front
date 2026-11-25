'use client';

/**
 * Repeat / revision settings for the mushaf reader: what to revise (this page, quarters picked
 * from a list, the surah, page to page, or ayah to ayah across surahs), how many times each ayah
 * plays, how many rounds of the whole selection, reciter, speed, and what to hide while memorising.
 * Same parchment sheet as the rest of the reader.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, Play, Repeat, Search, X } from 'lucide-react';
import { SURAHS, BUILTIN_RECITERS } from '../../quran-revision/quran-data';
import { HIDE_OPTIONS, PER_AYAH_OPTIONS, ROUND_OPTIONS, SPEED_OPTIONS, totalPlays } from './revise-engine';
import { PAGE_COUNT, clampPage, loadPage } from './mushaf-pages';
import { RUB_STARTS } from './rub-starts';

const SURAH_BY_ID = new Map(SURAHS.map(s => [s.id, s]));
const cx = (...p) => p.filter(Boolean).join(' ');
const toInt = v => Number(String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))) || 0;
const versesOf = s => SURAH_BY_ID.get(s)?.versesCount || 1;
// short, one-line choices
const PER_AYAH = PER_AYAH_OPTIONS.filter(n => n <= 7);
const ROUNDS = ROUND_OPTIONS.filter(n => n > 0);

/** Quarter i (0-based): its first ayah to the ayah before the next quarter. */
function quarterSpan(i) {
	const [fs, fa] = RUB_STARTS[i];
	const next = RUB_STARTS[i + 1];
	let to;
	if (!next) to = { s: 114, a: versesOf(114) };
	else if (next[1] > 1) to = { s: next[0], a: next[1] - 1 };
	else to = { s: next[0] - 1, a: versesOf(next[0] - 1) };
	return { from: { s: fs, a: fa }, to };
}
/** The quarter an ayah is in (0-based). */
function quarterOf(k) {
	if (!k) return 0;
	let idx = 0;
	for (let i = 0; i < RUB_STARTS.length; i += 1) {
		const [rs, ra] = RUB_STARTS[i];
		if (rs < k.s || (rs === k.s && ra <= k.a)) idx = i;
		else break;
	}
	return idx;
}

const L = {
	ar: {
		title: 'التكرار والمراجعة',
		span: 'هتراجع إيه؟',
		page: 'الصفحة دي',
		quarters: 'أرباع',
		surah: 'السورة كلها',
		pages: 'من صفحة لصفحة',
		custom: 'من آية لآية',
		quartersHint: 'اختار الربع اللي تبدأ منه، وبعدين الربع اللي تخلّص عنده',
		quarterN: (n, f) => `الربع ${f(n)}`,
		juzN: (n, f) => `الجزء ${f(n)}`,
		pageN: (n, f) => `ص ${f(n)}`,
		fromPage: 'من صفحة',
		toPage: 'لحد صفحة',
		from: 'من',
		to: 'لحد',
		ayah: 'آية',
		surahPick: 'اختار السورة',
		searchSurah: 'دوّر على سورة…',
		perAyah: 'كل آية تتكرر كام مرة؟',
		rounds: 'المقطع كله يتكرر كام مرة؟',
		other: 'عدد…',
		reciter: 'القارئ',
		speed: 'السرعة',
		hide: 'إخفاء للحفظ',
		hideHint: 'اضغط على الآية المخفية عشان تكشفها',
		hides: { none: 'بدون', first: 'أول كلمة بس', middle: 'نص الآية', end: 'آخر الآية', all: 'الآية كلها' },
		start: 'ابدأ التكرار',
		exit: 'إلغاء التكرار',
		loading: 'بنجهّز الصفحات…',
		pageFail: 'مقدرناش نجيب الصفحات دي — جرّب تاني',
		ayat: (n, f) => `${f(n)} ${n === 1 ? 'آية' : n === 2 ? 'آيتين' : n <= 10 ? 'آيات' : 'آية'}`,
		times: (n, f) => `×${f(n)}`,
		plan: (count, per, rounds, total, f) =>
			`${count} · كل آية ${per === 1 ? 'مرة' : `${f(per)} مرات`} · ${rounds === 1 ? 'المقطع مرة واحدة' : `المقطع كله ${f(rounds)} مرات`}${Number.isFinite(total) ? ` — ${f(total)} تلاوة` : ''}`,
		range: (a, b) => `${a} ← ${b}`,
	},
	en: {
		title: 'Repeat & revise',
		span: 'What to revise',
		page: 'This page',
		quarters: 'Quarters',
		surah: 'Whole surah',
		pages: 'Page to page',
		custom: 'Ayah to ayah',
		quartersHint: 'Pick the quarter to start from, then the one to end at',
		quarterN: (n, f) => `Quarter ${f(n)}`,
		juzN: (n, f) => `Juz ${f(n)}`,
		pageN: (n, f) => `p. ${f(n)}`,
		fromPage: 'From page',
		toPage: 'To page',
		from: 'From',
		to: 'To',
		ayah: 'Ayah',
		surahPick: 'Choose a surah',
		searchSurah: 'Find a surah…',
		perAyah: 'Play each ayah',
		rounds: 'Repeat the whole selection',
		other: 'Other…',
		reciter: 'Reciter',
		speed: 'Speed',
		hide: 'Hide to memorise',
		hideHint: 'Tap a hidden ayah to reveal it',
		hides: { none: 'Nothing', first: 'All but first word', middle: 'Middle', end: 'End', all: 'Whole ayah' },
		start: 'Start repeating',
		exit: 'Stop repeating',
		loading: 'Getting the pages…',
		pageFail: 'Could not load those pages — try again',
		ayat: (n, f) => `${f(n)} ${n === 1 ? 'ayah' : 'ayat'}`,
		times: (n, f) => `×${f(n)}`,
		plan: (count, per, rounds, total, f) => `${count} · each ×${f(per)} · whole selection ×${f(rounds)}${Number.isFinite(total) ? ` — ${f(total)} plays` : ''}`,
		range: (a, b) => `${a} → ${b}`,
	},
};

export function reviseLabels(ar) {
	return ar ? L.ar : L.en;
}

/** One of the preset counts, or your own number — all on one line. */
function CountChips({ options, value, onPick, label, otherLabel, max = 99 }) {
	const custom = !options.includes(value);
	const [draft, setDraft] = useState(custom ? String(value) : '');
	useEffect(() => {
		if (!options.includes(value)) setDraft(String(value));
	}, [value, options]);
	return (
		<div className="rv-chips is-line">
			{options.map(o => (
				<button key={String(o)} type="button" className={cx('rv-chip', value === o && 'is-on')} onClick={() => onPick(o)}>
					{label(o)}
				</button>
			))}
			<label className={cx('rv-chip rv-chip-num', custom && 'is-on')}>
				<input
					inputMode="numeric"
					placeholder={otherLabel}
					value={draft}
					onChange={e => setDraft(e.target.value)}
					onBlur={() => {
						const n = Math.min(max, toInt(draft));
						if (n > 0) onPick(n);
						else setDraft(custom ? String(value) : '');
					}}
					onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
					aria-label={otherLabel}
				/>
			</label>
		</div>
	);
}

/**
 * A dropdown that matches the sheet: the choice in a soft field, the options in a list that
 * opens under it (with a search box for long lists).
 */
function Dropdown({ value, options, onChange, label, searchLabel }) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');
	const [pos, setPos] = useState(null); // where the floating list sits (fixed, over the sheet)
	const wrap = useRef(null);
	const btn = useRef(null);
	const pop = useRef(null);
	const list = useRef(null);
	const current = options.find(o => o.value === value);
	useEffect(() => {
		if (!open) return undefined;
		// under the field, or above it when there is no room below; follows the sheet as it scrolls
		const place = () => {
			const r = btn.current?.getBoundingClientRect();
			if (!r) return;
			const below = window.innerHeight - r.bottom;
			const up = below < 300 && r.top > below;
			setPos({ left: r.left, width: r.width, top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined, maxH: Math.max(160, Math.min(320, (up ? r.top : below) - 16)) });
		};
		place();
		const away = e => !wrap.current?.contains(e.target) && !pop.current?.contains(e.target) && setOpen(false);
		const onScroll = e => !pop.current?.contains(e.target) && place();
		document.addEventListener('pointerdown', away);
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', place);
		return () => {
			document.removeEventListener('pointerdown', away);
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', place);
		};
	}, [open]);
	// the chosen one in view, once the list is placed
	useEffect(() => {
		if (open && pos) list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, Boolean(pos)]);
	const host = typeof document !== 'undefined' ? wrap.current?.closest('.mr-sheet-wrap') || document.body : null;
	const shown = q.trim() ? options.filter(o => `${o.label} ${o.sub || ''} ${o.search || ''}`.toLowerCase().includes(q.trim().toLowerCase())) : options;
	return (
		<div className={cx('rv-dd', open && 'is-open')} ref={wrap}>
			<button ref={btn} type="button" className="rv-dd-btn" onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label={label}>
				{current?.badge != null ? <span className="rv-dd-badge">{current.badge}</span> : null}
				<span className="rv-dd-val">{current?.label || label}</span>
				<ChevronDown size={18} className="rv-dd-chev" aria-hidden="true" />
			</button>
			{open && pos && host
				? createPortal(
				<div
					ref={pop}
					className="rv-dd-pop"
					dir={wrap.current?.closest('[dir]')?.getAttribute('dir') || undefined}
					style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, '--dd-max': `${pos.maxH}px` }}
				>
					{searchLabel ? (
						<label className="rv-dd-search">
							<Search size={15} aria-hidden="true" />
							<input value={q} onChange={e => setQ(e.target.value)} placeholder={searchLabel} autoFocus />
						</label>
					) : null}
					<ul className="rv-dd-list" role="listbox" ref={list}>
						{shown.map(o => (
							<li key={o.value}>
								<button
									type="button"
									role="option"
									aria-selected={o.value === value}
									className={cx(o.value === value && 'is-on')}
									onClick={() => {
										onChange(o.value);
										setOpen(false);
										setQ('');
									}}
								>
									{o.badge != null ? <span className="rv-dd-badge">{o.badge}</span> : null}
									<span className="rv-dd-text">
										{o.label}
										{o.sub ? <small>{o.sub}</small> : null}
									</span>
									{o.value === value ? <Check size={16} aria-hidden="true" /> : null}
								</button>
							</li>
						))}
					</ul>
				</div>,
					host,
				)
				: null}
		</div>
	);
}

/** Surah + ayah (one end of an "ayah to ayah" range). */
function AyahPick({ label, value, onPick, surahOptions, t }) {
	const s = value?.s || 1;
	const n = versesOf(s);
	return (
		<div className="rv-end">
			<span className="rv-end-label">{label}</span>
			<Dropdown value={s} options={surahOptions} onChange={v => onPick({ s: v, a: 1 })} label={t.surahPick} searchLabel={t.searchSurah} />
			<label className="rv-num">
				<span>{t.ayah}</span>
				<input inputMode="numeric" value={value?.a || 1} onFocus={e => e.target.select()} onChange={e => onPick({ s, a: Math.min(n, Math.max(1, toInt(e.target.value) || 1)) })} />
			</label>
		</div>
	);
}

/** All 240 quarters by juz: tap where to start, then where to end. */
function QuarterList({ sel, onSel, ar, fmt, t }) {
	const box = useRef(null);
	useEffect(() => {
		const el = box.current?.querySelector('.is-on');
		if (el && box.current) box.current.scrollTop = el.offsetTop - box.current.clientHeight / 2 + el.clientHeight / 2;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const [a, b] = sel;
	const lo = Math.min(a, b);
	const hi = Math.max(a, b);
	const tap = i => {
		// a single quarter picked: the next tap sets the end; otherwise start again from here
		if (a === b && !sel.fresh) onSel([a, i]);
		else onSel([i, i]);
	};
	return (
		<div className="rv-quarters" ref={box}>
			{RUB_STARTS.map(([s, ay, pg, words], i) => (
				<div key={i}>
					{i % 8 === 0 ? <p className="rv-q-juz">{t.juzN(i / 8 + 1, fmt)}</p> : null}
					<button type="button" className={cx('rv-q', i >= lo && i <= hi && 'is-on', (i === lo || i === hi) && 'is-edge')} onClick={() => tap(i)}>
						<span className="rv-q-n">{fmt(i + 1)}</span>
						<span className="rv-q-text">
							<b>{words}</b>
							<small>
								{ar ? SURAH_BY_ID.get(s)?.nameAr : SURAH_BY_ID.get(s)?.nameEn} {fmt(ay)} · {t.pageN(pg, fmt)}
							</small>
						</span>
						{i >= lo && i <= hi ? <Check size={16} className="rv-q-check" aria-hidden="true" /> : null}
					</button>
				</div>
			))}
		</div>
	);
}

export default function ReviseSheet({ ar, fmt, cfg, spans, count, page = 1, reciterId, onReciter, onChange, onStart, onExitRevise, onClose }) {
	const t = ar ? L.ar : L.en;
	const same = (x, y) => x && y && x.from?.s === y.from?.s && x.from?.a === y.from?.a && x.to?.s === y.to?.s && x.to?.a === y.to?.a;
	const current = { from: cfg.from, to: cfg.to };
	const detect = () => (same(current, spans.page) ? 'page' : same(current, spans.surah) ? 'surah' : 'custom');
	const [mode, setMode] = useState(detect);
	// the range can arrive just after the sheet opens: follow it until you pick something yourself
	const [picked, setPicked] = useState(false);
	useEffect(() => {
		if (!picked) setMode(detect());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cfg.from?.s, cfg.from?.a, cfg.to?.s, cfg.to?.a, spans]);
	// "until I stop" is no longer offered: an old setting becomes once
	useEffect(() => {
		if (!cfg.rounds) onChange({ ...cfg, rounds: 1 });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const [pages, setPages] = useState({ from: page, to: Math.min(PAGE_COUNT, page + 1) });
	const [pagesState, setPagesState] = useState(null); // null | 'busy' | 'error'
	const [quarters, setQuarters] = useState(() => {
		const q = quarterOf(cfg.from || spans.page?.from);
		return Object.assign([q, q], { fresh: true });
	});
	const name = k => (k ? `${ar ? SURAH_BY_ID.get(k.s)?.nameAr : SURAH_BY_ID.get(k.s)?.nameEn} ${fmt(k.a)}` : '');
	const surahOptions = useMemo(() => SURAHS.map(s => ({ value: s.id, badge: fmt(s.id), label: ar ? s.nameAr : s.nameEn, sub: `${fmt(s.versesCount)} ${ar ? 'آية' : 'ayat'}`, search: `${s.nameAr} ${s.nameEn} ${s.id}` })), [ar, fmt]);
	const reciterOptions = useMemo(() => BUILTIN_RECITERS.map(r => ({ value: r.id, label: ar ? r.nameAr : r.nameEn })), [ar]);

	const setSpan = span => span && onChange({ ...cfg, from: span.from, to: span.to });
	const applyQuarters = sel => {
		setQuarters(sel);
		const lo = Math.min(sel[0], sel[1]);
		const hi = Math.max(sel[0], sel[1]);
		onChange({ ...cfg, from: quarterSpan(lo).from, to: quarterSpan(hi).to });
	};
	const pick = id => {
		setPicked(true);
		setMode(id);
		if (id === 'pages') void applyPages(pages);
		else if (id === 'quarters') applyQuarters(quarters);
		else if (id === 'custom') onChange({ ...cfg, from: cfg.from || spans.page?.from, to: cfg.to || spans.page?.to });
		else setSpan(spans[id]);
	};
	// "page to page": the first ayah of the first page and the last ayah of the last page
	const applyPages = async next => {
		const a = clampPage(Math.min(next.from, next.to));
		const b = clampPage(Math.max(next.from, next.to));
		setPages({ from: a, to: b });
		setPagesState('busy');
		try {
			const [pa, pb] = await Promise.all([loadPage(a), loadPage(b)]);
			const [fs, fa] = pa.keys[0].split(':').map(Number);
			const [ts, ta] = pb.keys[pb.keys.length - 1].split(':').map(Number);
			onChange({ ...cfg, from: { s: fs, a: fa }, to: { s: ts, a: ta } });
			setPagesState(null);
		} catch {
			setPagesState('error');
		}
	};

	const total = totalPlays(count, cfg.perAyah, cfg.rounds || 1);
	const spanChips = [
		['page', t.page],
		['quarters', t.quarters],
		['surah', t.surah],
		['pages', t.pages],
		['custom', t.custom],
	];

	return (
		<div className="mr-sheet-wrap" dir={ar ? 'rtl' : 'ltr'}>
			<button type="button" className="mr-sheet-scrim" aria-label="close" onClick={onClose} />
			<section className="mr-sheet rv-sheet" role="dialog" aria-modal="true" aria-label={t.title}>
				<header className="mr-sheet-head">
					<span className="mr-grabber" aria-hidden="true" />
					<h2 className="mr-sheet-title">{t.title}</h2>
					{onExitRevise ? (
						<button type="button" className="rv-clear" onClick={onExitRevise}>
							{t.exit}
						</button>
					) : null}
					<button type="button" className="mr-ic" onClick={onClose} aria-label="close">
						<X size={20} />
					</button>
				</header>
				<div className="mr-sheet-list rv-body">
					<section className="rv-group">
						<div className="rv-label">
							<b>{t.span}</b>
						</div>
						<div className="rv-chips">
							{spanChips.map(([id, label]) =>
								id === 'page' || id === 'surah' ? (
									spans[id] ? (
										<button key={id} type="button" className={cx('rv-chip', mode === id && 'is-on')} onClick={() => pick(id)}>
											{label}
										</button>
									) : null
								) : (
									<button key={id} type="button" className={cx('rv-chip', mode === id && 'is-on')} onClick={() => pick(id)}>
										{label}
									</button>
								),
							)}
						</div>
						{mode === 'quarters' ? (
							<>
								<p className="rv-hint">{t.quartersHint}</p>
								<QuarterList sel={quarters} onSel={applyQuarters} ar={ar} fmt={fmt} t={t} />
							</>
						) : null}
						{mode === 'pages' ? (
							<div className="rv-custom">
								<label className="rv-num">
									<span>{t.fromPage}</span>
									<input inputMode="numeric" value={pages.from} onFocus={e => e.target.select()} onChange={e => setPages(p => ({ ...p, from: toInt(e.target.value) || '' }))} onBlur={() => void applyPages(pages)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
								</label>
								<label className="rv-num">
									<span>{t.toPage}</span>
									<input inputMode="numeric" value={pages.to} onFocus={e => e.target.select()} onChange={e => setPages(p => ({ ...p, to: toInt(e.target.value) || '' }))} onBlur={() => void applyPages(pages)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
								</label>
							</div>
						) : null}
						{mode === 'custom' ? (
							<div className="rv-ends">
								<AyahPick label={t.from} value={cfg.from} onPick={from => onChange({ ...cfg, from })} surahOptions={surahOptions} t={t} />
								<AyahPick label={t.to} value={cfg.to} onPick={to => onChange({ ...cfg, to })} surahOptions={surahOptions} t={t} />
							</div>
						) : null}
						{/* what you picked, in words */}
						<div className="rv-plan" role="status">
							<Repeat size={16} aria-hidden="true" />
							<span>
								{pagesState === 'busy' ? (
									<>
										<Loader2 size={13} className="rv-spin" aria-hidden="true" /> {t.loading}
									</>
								) : pagesState === 'error' ? (
									t.pageFail
								) : (
									<>
										<b>{t.range(name(cfg.from), name(cfg.to))}</b>
										<small>{t.plan(t.ayat(count, fmt), cfg.perAyah, cfg.rounds || 1, total, fmt)}</small>
									</>
								)}
							</span>
						</div>
					</section>

					<section className="rv-group">
						<div className="rv-label">
							<b>{t.perAyah}</b>
						</div>
						<CountChips options={PER_AYAH} value={cfg.perAyah} onPick={o => onChange({ ...cfg, perAyah: o })} label={o => t.times(o, fmt)} otherLabel={t.other} />
					</section>

					<section className="rv-group">
						<div className="rv-label">
							<b>{t.rounds}</b>
						</div>
						<CountChips options={ROUNDS} value={cfg.rounds || 1} onPick={o => onChange({ ...cfg, rounds: o })} label={o => t.times(o, fmt)} otherLabel={t.other} />
					</section>

					<section className="rv-group">
						<div className="rv-label">
							<b>{t.hide}</b>
							<span>{t.hideHint}</span>
						</div>
						<div className="rv-chips">
							{HIDE_OPTIONS.map(o => (
								<button key={o} type="button" className={cx('rv-chip', cfg.hide === o && 'is-on')} onClick={() => onChange({ ...cfg, hide: o })}>
									{t.hides[o]}
								</button>
							))}
						</div>
					</section>

					<section className="rv-group rv-row">
						<div className="rv-field">
							<span>{t.reciter}</span>
							<Dropdown value={reciterId} options={reciterOptions} onChange={onReciter} label={t.reciter} />
						</div>
						<div className="rv-field">
							<span>{t.speed}</span>
							<div className="rv-chips is-line">
								{SPEED_OPTIONS.map(o => (
									<button key={o} type="button" className={cx('rv-chip', cfg.speed === o && 'is-on')} onClick={() => onChange({ ...cfg, speed: o })}>
										{o}×
									</button>
								))}
							</div>
						</div>
					</section>
				</div>
				<footer className="rv-foot">
					<button type="button" className="rv-start" onClick={onStart} disabled={!count || pagesState === 'busy'}>
						<Play size={17} />
						{t.start}
					</button>
				</footer>
			</section>
		</div>
	);
}
