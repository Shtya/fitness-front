'use client';

/**
 * Settings for the mushaf reader's revision mode: what to revise (page / quarter / surah /
 * ayah to ayah), repeats per ayah, rounds of the whole span, reciter, speed, and what to hide
 * while memorising. Same parchment sheet as the rest of the reader.
 */

import { Play, X } from 'lucide-react';
import { SURAHS, BUILTIN_RECITERS } from '../../quran-revision/quran-data';
import { HIDE_OPTIONS, PER_AYAH_OPTIONS, ROUND_OPTIONS, SPEED_OPTIONS } from './revise-engine';

const SURAH_BY_ID = new Map(SURAHS.map(s => [s.id, s]));
const cx = (...p) => p.filter(Boolean).join(' ');

const L = {
	ar: {
		title: 'إعدادات المراجعة',
		span: 'هتراجع إيه؟',
		page: 'الصفحة دي',
		quarter: 'الربع ده',
		surah: 'السورة كلها',
		custom: 'من آية لآية',
		from: 'من آية',
		to: 'إلى آية',
		perAyah: 'تكرار كل آية',
		rounds: 'تكرار الجزء كله',
		endless: 'لحد ما أوقف',
		reciter: 'القارئ',
		speed: 'السرعة',
		hide: 'إخفاء للحفظ',
		hideHint: 'اضغط على الآية المخفية عشان تكشفها',
		hides: { none: 'بدون', first: 'أول كلمة بس', middle: 'نص الآية', end: 'آخر الآية', all: 'الآية كلها' },
		start: 'ابدأ المراجعة',
		summary: (n, f) => `${f(n)} ${n === 1 ? 'آية' : n === 2 ? 'آيتين' : n <= 10 ? 'آيات' : 'آية'}`,
		quarterN: (n, f) => `الربع ${f(n)}`,
		times: (n, f) => `×${f(n)}`,
	},
	en: {
		title: 'Revision settings',
		span: 'What to revise',
		page: 'This page',
		quarter: 'This quarter',
		surah: 'Whole surah',
		custom: 'Ayah to ayah',
		from: 'From ayah',
		to: 'To ayah',
		perAyah: 'Repeat each ayah',
		rounds: 'Repeat the whole part',
		endless: 'Until I stop',
		reciter: 'Reciter',
		speed: 'Speed',
		hide: 'Hide to memorise',
		hideHint: 'Tap a hidden ayah to reveal it',
		hides: { none: 'Nothing', first: 'All but first word', middle: 'Middle', end: 'End', all: 'Whole ayah' },
		start: 'Start revising',
		summary: (n, f) => `${f(n)} ${n === 1 ? 'ayah' : 'ayat'}`,
		quarterN: (n, f) => `Quarter ${f(n)}`,
		times: (n, f) => `×${f(n)}`,
	},
};

export function reviseLabels(ar) {
	return ar ? L.ar : L.en;
}

export default function ReviseSheet({ ar, fmt, cfg, spans, count, reciterId, onReciter, onChange, onStart, onClose }) {
	const t = ar ? L.ar : L.en;
	const same = (x, y) => x && y && x.from?.s === y.from?.s && x.from?.a === y.from?.a && x.to?.s === y.to?.s && x.to?.a === y.to?.a;
	const current = { from: cfg.from, to: cfg.to };
	const which = same(current, spans.page) ? 'page' : same(current, spans.quarter) ? 'quarter' : same(current, spans.surah) ? 'surah' : 'custom';
	const setSpan = span => onChange({ ...cfg, from: span.from, to: span.to });
	const surahId = cfg.from?.s || spans.surah?.from.s || 1;
	const verses = SURAH_BY_ID.get(surahId)?.versesCount || 1;
	const clampA = v => Math.min(verses, Math.max(1, Number(String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))) || 1));
	const chips = (options, value, key, label) => (
		<div className="rv-chips">
			{options.map(o => (
				<button key={String(o)} type="button" className={cx('rv-chip', value === o && 'is-on')} onClick={() => onChange({ ...cfg, [key]: o })}>
					{label(o)}
				</button>
			))}
		</div>
	);
	return (
		<div className="mr-sheet-wrap" dir={ar ? 'rtl' : 'ltr'}>
			<button type="button" className="mr-sheet-scrim" aria-label="close" onClick={onClose} />
			<section className="mr-sheet rv-sheet" role="dialog" aria-modal="true" aria-label={t.title}>
				<header className="mr-sheet-head">
					<span className="mr-grabber" aria-hidden="true" />
					<h2 className="mr-sheet-title">{t.title}</h2>
					<button type="button" className="mr-ic" onClick={onClose} aria-label="close">
						<X size={20} />
					</button>
				</header>
				<div className="mr-sheet-list rv-body">
					<section className="rv-group">
						<div className="rv-label">
							<b>{t.span}</b>
							<span>{t.summary(count, fmt)}</span>
						</div>
						<div className="rv-chips">
							{[
								['page', t.page, spans.page],
								['quarter', spans.quarter ? `${t.quarter} (${t.quarterN(spans.quarter.quarter, fmt)})` : t.quarter, spans.quarter],
								['surah', t.surah, spans.surah],
							].map(([id, label, span]) =>
								span ? (
									<button key={id} type="button" className={cx('rv-chip', which === id && 'is-on')} onClick={() => setSpan(span)}>
										{label}
									</button>
								) : null,
							)}
							<button type="button" className={cx('rv-chip', which === 'custom' && 'is-on')} onClick={() => setSpan({ from: { s: surahId, a: cfg.from?.a || 1 }, to: { s: surahId, a: Math.min(verses, (cfg.from?.a || 1) + 9) } })}>
								{t.custom}
							</button>
						</div>
						{which === 'custom' ? (
							<div className="rv-custom">
								<select
									className="rv-input rv-surah"
									value={surahId}
									onChange={e => {
										const s = Number(e.target.value);
										const n = SURAH_BY_ID.get(s)?.versesCount || 1;
										onChange({ ...cfg, from: { s, a: 1 }, to: { s, a: Math.min(n, 10) } });
									}}
								>
									{SURAHS.map(s => (
										<option key={s.id} value={s.id}>
											{fmt(s.id)}. {ar ? s.nameAr : s.nameEn}
										</option>
									))}
								</select>
								<label className="rv-num">
									<span>{t.from}</span>
									<input inputMode="numeric" value={cfg.from?.a || 1} onFocus={e => e.target.select()} onChange={e => onChange({ ...cfg, from: { s: surahId, a: clampA(e.target.value) } })} />
								</label>
								<label className="rv-num">
									<span>{t.to}</span>
									<input inputMode="numeric" value={cfg.to?.s === surahId ? cfg.to.a : verses} onFocus={e => e.target.select()} onChange={e => onChange({ ...cfg, to: { s: surahId, a: clampA(e.target.value) } })} />
								</label>
							</div>
						) : null}
					</section>

					<section className="rv-group">
						<div className="rv-label">
							<b>{t.perAyah}</b>
						</div>
						{chips(PER_AYAH_OPTIONS, cfg.perAyah, 'perAyah', o => t.times(o, fmt))}
					</section>

					<section className="rv-group">
						<div className="rv-label">
							<b>{t.rounds}</b>
						</div>
						{chips(ROUND_OPTIONS, cfg.rounds, 'rounds', o => (o === 0 ? t.endless : t.times(o, fmt)))}
					</section>

					<section className="rv-group">
						<div className="rv-label">
							<b>{t.hide}</b>
							<span>{t.hideHint}</span>
						</div>
						{chips(HIDE_OPTIONS, cfg.hide, 'hide', o => t.hides[o])}
					</section>

					<section className="rv-group rv-row">
						<label className="rv-field">
							<span>{t.reciter}</span>
							<select className="rv-input" value={reciterId} onChange={e => onReciter(e.target.value)}>
								{BUILTIN_RECITERS.map(r => (
									<option key={r.id} value={r.id}>
										{ar ? r.nameAr : r.nameEn}
									</option>
								))}
							</select>
						</label>
						<div className="rv-field">
							<span>{t.speed}</span>
							{chips(SPEED_OPTIONS, cfg.speed, 'speed', o => `${o}×`)}
						</div>
					</section>
				</div>
				<footer className="rv-foot">
					<button type="button" className="rv-start" onClick={onStart}>
						<Play size={19} />
						{t.start}
					</button>
				</footer>
			</section>
		</div>
	);
}
