'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppWindow, Check, Copy, ExternalLink, MapPin, Minus, Phone, ShieldAlert, UserRound, Zap } from 'lucide-react';
import TargetIcon from '@/app/[locale]/dashboard/whatsapp/contact-search/TargetIcon';
import QueryText from '@/app/[locale]/dashboard/whatsapp/contact-search/QueryText';
import { cityById, citySearchTerms } from '@/app/[locale]/dashboard/whatsapp/contact-search/city-aliases';
import {
	GROUP_ORDER,
	buildSearchTargets,
	hostOf,
	openTab,
	phoneFormats,
	readHubPayload,
	writeHubPayload,
} from '@/app/[locale]/dashboard/whatsapp/contact-search/targets';
import './search-hub.css';

const POPUPS_OK_KEY = 'wa-sf-popups-ok';

const COPY = {
	en: {
		title: 'Search hub',
		missing: 'This search link has expired. Open it again from the contact’s “Find this person” panel.',
		openSelected: (k) => `Open ${k} selected in tabs`,
		selectAll: 'Select all',
		clear: 'Clear',
		selectedCount: (a, b) => `${a} of ${b} selected`,
		groupAll: 'Select all',
		groupNone: 'Unselect all',
		toolbar: 'Selection',
		copyAll: 'Copy all links',
		copied: 'Copied',
		tipTitle: 'Every search opens as a tab in this window',
		tip: 'If this page opened as a tab instead of its own window, drag it out of the tab bar first, then press Open selected.',
		blocked: (k) => `The browser blocked ${k} tab${k === 1 ? '' : 's'}`,
		blockedWhy: 'Browsers allow one new tab per click unless you allow pop-ups for this site. Do this once:',
		blockedSteps: [
			'Click the blocked pop-up icon (window with a red ✕) at the right end of the address bar.',
			'Choose “Always allow pop-ups and redirects from this site”, then Done.',
			'Press “Open selected in tabs” again — every tab opens at once.',
		],
		blockedSettings: 'No icon? Chrome settings:',
		openNext: (k) => `Open next (${k} left)`,
		openedCount: (a, b) => `${a} of ${b} opened`,
		groups: { web: 'Web', social: 'Social', phone: 'Phone lookups', image: 'Photo (reverse image)' },
		open: 'Open',
		include: 'Include in Open selected',
		auto: 'Opening every search…',
	},
	ar: {
		title: 'مركز البحث',
		missing: 'رابط البحث ده انتهى. افتحه تاني من لوحة «ابحث عن الشخص» في بيانات جهة الاتصال.',
		openSelected: (k) => `افتح الـ ${k} المختارين في تابات`,
		selectAll: 'اختار الكل',
		clear: 'إلغاء الاختيار',
		selectedCount: (a, b) => `${a} من ${b} مختارين`,
		groupAll: 'اختار الكل',
		groupNone: 'شيل الكل',
		toolbar: 'الاختيار',
		copyAll: 'نسخ كل الروابط',
		copied: 'اتنسخ',
		tipTitle: 'كل عمليات البحث بتفتح كتابات في النافذة دي',
		tip: 'لو الصفحة دي فتحت كتاب مش كنافذة لوحدها، اسحبها لبره شريط التابات الأول، وبعدين دوس افتح المختارين.',
		blocked: (k) => `المتصفح منع ${k} تبويب`,
		blockedWhy: 'المتصفح بيسمح بتاب واحد بس لكل ضغطة، إلا لو سمحت بالنوافذ المنبثقة للموقع. اعملها مرة واحدة:',
		blockedSteps: [
			'دوس على أيقونة النوافذ المحظورة (نافذة عليها ✕ أحمر) آخر شريط العنوان.',
			'اختار «السماح دائمًا بالنوافذ المنبثقة وإعادة التوجيه من هذا الموقع» ثم تم.',
			'دوس «افتح المختارين في تابات» تاني — كل التابات هتفتح مرة واحدة.',
		],
		blockedSettings: 'مفيش أيقونة؟ من إعدادات Chrome:',
		openNext: (k) => `افتح التالي (باقي ${k})`,
		openedCount: (a, b) => `اتفتح ${a} من ${b}`,
		groups: { web: 'ويب', social: 'سوشيال', phone: 'البحث بالرقم', image: 'الصورة (بحث عكسي)' },
		open: 'افتح',
		include: 'ضمّه للمختارين',
		auto: 'بنفتح كل عمليات البحث…',
	},
};

export default function SearchHubPage() {
	const params = useParams();
	const ar = params?.locale === 'ar';
	const copy = ar ? COPY.ar : COPY.en;

	const [hubId, setHubId] = useState('');
	const [payload, setPayload] = useState(undefined);
	const [selected, setSelected] = useState(() => new Set());
	const [opened, setOpened] = useState(() => new Set());
	/** Searches the pop-up blocker refused — opened one per click by "Open next". */
	const [pending, setPending] = useState([]);
	const blocked = pending.length;
	const openNext = () => {
		const [head, ...rest] = pending;
		if (head && openTab(head.url)) {
			setOpened((prev) => new Set([...prev, head.id]));
			setPending(rest);
		}
	};
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		const load = () => {
			const id = window.location.hash.replace(/^#/, '');
			const data = id ? readHubPayload(id) : null;
			setHubId(id);
			setPayload(data);
			setSelected(new Set(data?.selectedIds || []));
			setOpened(new Set());
			setPending([]);
		};
		load();
		window.addEventListener('hashchange', load);
		return () => window.removeEventListener('hashchange', load);
	}, []);

	const city = payload?.cityId ? cityById(payload.cityId) : null;
	const targets = useMemo(
		() =>
			payload
				? buildSearchTargets({
						name: payload.name,
						phoneDigits: payload.phoneDigits,
						city,
						cityText: city ? '' : payload.cityText,
						keywords: payload.keywords,
						avatarUrl: payload.avatarUrl,
					})
				: [],
		[payload, city],
	);
	const bulk = useMemo(() => targets.filter((t) => selected.has(t.id) && !t.skipInBulk), [targets, selected]);
	const formats = useMemo(() => phoneFormats(payload?.phoneDigits || ''), [payload]);

	useEffect(() => {
		if (payload?.name || formats) {
			document.title = `${copy.title} · ${payload?.name || formats?.e164 || ''}`;
		}
	}, [payload, formats, copy.title]);

	/** Opens every selected search as a tab in THIS window. Stops at the first block (the rest would be blocked too). */
	const openAll = useCallback(() => {
		const ok = [];
		let rest = [];
		for (let i = 0; i < bulk.length; i += 1) {
			if (openTab(bulk[i].url)) {
				ok.push(bulk[i].id);
			} else {
				rest = bulk.slice(i);
				break;
			}
		}
		const fails = rest.length;
		setOpened((prev) => new Set([...prev, ...ok]));
		setPending(rest);
		try {
			if (bulk.length > 1) window.localStorage.setItem(POPUPS_OK_KEY, fails ? '0' : '1');
		} catch {
			/* ignore */
		}
	}, [bulk]);

	// Arrived from "Open all in a new window": open every tab right away (once per click).
	const autoDone = useRef(false);
	useEffect(() => {
		if (autoDone.current || !hubId || !payload || !bulk.length) return;
		const fresh = payload.autoOpenAt && Date.now() - payload.autoOpenAt < 60_000;
		if (!fresh) return;
		autoDone.current = true;
		writeHubPayload(hubId, { ...payload, autoOpenAt: 0 }); // a reload must not reopen everything
		openAll();
	}, [hubId, payload, bulk.length, openAll]);

	const copyAll = async () => {
		try {
			await navigator.clipboard.writeText(bulk.map((t) => `${ar ? t.labelAr : t.labelEn}: ${t.url}`).join('\n'));
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			/* ignore */
		}
	};

	const toggle = (id) =>
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	/** Select or clear a set of ids in one go (whole page or one group). */
	const setMany = (ids, on) =>
		setSelected((prev) => {
			const next = new Set(prev);
			ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
			return next;
		});

	const selectable = targets.filter((t) => !t.skipInBulk);
	const allIds = selectable.map((t) => t.id);
	const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));
	const someOn = allIds.some((id) => selected.has(id));

	if (payload === undefined) return <main className="sh" dir={ar ? 'rtl' : 'ltr'} />;

	if (!payload) {
		return (
			<main className="sh" dir={ar ? 'rtl' : 'ltr'}>
				<div className="sh__wrap">
					<p className="sh__missing">{copy.missing}</p>
				</div>
			</main>
		);
	}

	const cityTerms = city ? citySearchTerms(city, 4) : payload.cityText ? [payload.cityText] : [];
	const openedInBulk = bulk.filter((t) => opened.has(t.id)).length;

	return (
		<main className="sh" dir={ar ? 'rtl' : 'ltr'}>
			<div className="sh__wrap">
				<header className="sh__head">
					<div className="sh__brand">
						<span aria-hidden>
							<AppWindow size={16} />
						</span>
						{copy.title}
					</div>
					<div className="sh__person">
						{payload.name ? (
							<span dir="auto">
								<UserRound size={14} aria-hidden />
								{payload.name}
							</span>
						) : null}
						{formats ? (
							<span dir="ltr">
								<Phone size={14} aria-hidden />
								{formats.intlSpaced}
							</span>
						) : null}
						{cityTerms.length ? (
							<span dir="auto">
								<MapPin size={14} aria-hidden />
								{cityTerms.join(' · ')}
							</span>
						) : null}
					</div>
				</header>

				<section className="sh__toolbar" aria-label={copy.toolbar}>
					<div className="sh__select">
						<button
							type="button"
							role="checkbox"
							aria-checked={allOn ? 'true' : someOn ? 'mixed' : 'false'}
							className={`sh__selectall${allOn ? ' is-on' : someOn ? ' is-mixed' : ''}`}
							onClick={() => setMany(allIds, !allOn)}
						>
							<span className="sh__check" aria-hidden>
								{allOn ? <Check size={11} strokeWidth={3.5} /> : someOn ? <Minus size={11} strokeWidth={3.5} /> : null}
							</span>
							{copy.selectAll}
						</button>
						<button type="button" className="sh__link" onClick={() => setMany(allIds, false)} disabled={!someOn}>
							{copy.clear}
						</button>
						<span className="sh__count">{copy.selectedCount(bulk.length, allIds.length)}</span>
					</div>
					<div className="sh__buttons">
						<button type="button" className="sh__ghost" onClick={copyAll} disabled={!bulk.length}>
							{copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
							{copied ? copy.copied : copy.copyAll}
						</button>
						<button type="button" className="sh__primary" onClick={openAll} disabled={!bulk.length}>
							<Zap size={18} aria-hidden />
							{copy.openSelected(bulk.length)}
						</button>
					</div>
					{openedInBulk ? <span className="sh__count">{copy.openedCount(openedInBulk, bulk.length)}</span> : null}
				</section>

				{blocked > 0 ? (
					<div className="sh__notice is-warn" role="status">
						<ShieldAlert size={18} aria-hidden />
						<div>
							<strong>{copy.blocked(blocked)}</strong>
							<p>{copy.blockedWhy}</p>
							<ol>
								{copy.blockedSteps.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ol>
							<p className="sh__muted">
								{copy.blockedSettings} <code dir="ltr">chrome://settings/content/popups</code> →{' '}
								<code dir="ltr">{typeof window !== 'undefined' ? window.location.origin : ''}</code>
							</p>
							<button type="button" className="sh__next" onClick={openNext}>
								<ExternalLink size={14} aria-hidden />
								{copy.openNext(blocked)} · {ar ? pending[0]?.labelAr : pending[0]?.labelEn}
							</button>
						</div>
					</div>
				) : (
					<div className="sh__notice">
						<AppWindow size={18} aria-hidden />
						<div>
							<strong>{copy.tipTitle}</strong>
							<p>{copy.tip}</p>
						</div>
					</div>
				)}

				{GROUP_ORDER.map((key) => {
					const items = targets.filter((t) => t.group === key);
					if (!items.length) return null;
					const groupIds = items.filter((t) => !t.skipInBulk).map((t) => t.id);
					const groupOn = groupIds.filter((id) => selected.has(id)).length;
					const groupAll = groupIds.length > 0 && groupOn === groupIds.length;
					return (
						<section key={key} className="sh__group">
							<div className="sh__group-head">
								<h2>
									{copy.groups[key]}
									<span>{groupOn}/{groupIds.length}</span>
								</h2>
								{groupIds.length ? (
									<button type="button" className="sh__link" onClick={() => setMany(groupIds, !groupAll)}>
										{groupAll ? copy.groupNone : copy.groupAll}
									</button>
								) : null}
							</div>
							<ul>
								{items.map((target) => {
									const isOn = selected.has(target.id) && !target.skipInBulk;
									const wasOpened = opened.has(target.id);
									return (
										<li
											key={target.id}
											className={`${isOn ? 'is-on' : ''} ${wasOpened ? 'is-opened' : ''} ${target.skipInBulk ? '' : 'is-selectable'}`}
											onClick={(event) => {
												// The whole row toggles selection; links and the checkbox handle themselves.
												if (target.skipInBulk || event.target.closest('a, button')) return;
												toggle(target.id);
											}}
										>
											{target.skipInBulk ? (
												<span className="sh__check is-hidden" aria-hidden />
											) : (
												<button
													type="button"
													role="checkbox"
													aria-checked={isOn}
													aria-label={`${copy.include}: ${target.labelEn}`}
													className="sh__check"
													onClick={() => toggle(target.id)}
												>
													{isOn ? <Check size={11} strokeWidth={3.5} aria-hidden /> : null}
												</button>
											)}
											<TargetIcon id={target.id} size={16} />
											<div className="sh__item">
												<span className="sh__item-title">
													{ar ? target.labelAr : target.labelEn}
													<em>{hostOf(target.url)}</em>
												</span>
												{target.group !== 'image' ? <QueryText query={target.query} /> : null}
											</div>
											<a
												className="sh__open"
												href={target.url}
												target="_blank"
												rel="noopener noreferrer"
												onClick={() => setOpened((prev) => new Set([...prev, target.id]))}
											>
												{wasOpened ? <Check size={13} aria-hidden /> : <ExternalLink size={13} aria-hidden />}
												{copy.open}
											</a>
										</li>
									);
								})}
							</ul>
						</section>
					);
				})}
			</div>
		</main>
	);
}
