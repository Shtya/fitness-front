'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { BellRing, CalendarRange, Eye, Layers, Luggage, Printer, RefreshCw, ShoppingBag, Shirt, WashingMachine, X } from 'lucide-react';
import { OCCASIONS, PALETTE_BY_ID, SEASONS } from '../config/outfit-config.js';
import { gapAnalysis, markWashed, overDuplicated, tripCapsule, weekPlan } from '../engine/planner.js';
import { buildOutfits, outfitItemList, scoreOwnedOutfit } from '../engine/stylist.js';
import { colorName } from '../outfit-ui.js';
import { useOutfit } from '../OutfitContext.jsx';
import { putItems, useKv } from '../wardrobe/db.js';
import { scheduleTomorrow } from '../wardrobe/share.js';
import OutfitCard from '../ui/OutfitCard.jsx';
import { Chips, EmptyState, ItemImage, ScoreRing, Segmented, Swatch } from '../ui/primitives.jsx';

const ymd = date => new Date(date).toISOString().slice(0, 10);

export default function Plan() {
	const t = useTranslations('outfitMatcher');
	const [mode, setMode] = useState('week');
	const { items, setSection } = useOutfit();
	const laundryCount = items.filter(i => i.status === 'laundry').length;
	if (!items.length) {
		return <EmptyState icon={CalendarRange} title={t('plan.emptyTitle')} text={t('plan.emptyText')} action={<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={() => setSection('closet')}><Shirt size={18} aria-hidden="true" /> {t('stylist.goCloset')}</button>} />;
	}
	return (
		<div className="wa-of-stack-lg">
			<div className="wa-of-scroll-x">
				<Segmented
					value={mode}
					onChange={setMode}
					label={t('nav.plan')}
					options={[
						{ id: 'week', label: t('plan.tabs.week'), icon: CalendarRange },
						{ id: 'trip', label: t('plan.tabs.trip'), icon: Luggage },
						{ id: 'build', label: t('plan.tabs.build'), icon: Layers },
						{ id: 'gaps', label: t('plan.tabs.gaps'), icon: ShoppingBag },
						{ id: 'laundry', label: t('plan.tabs.laundry'), icon: WashingMachine, badge: laundryCount || null },
					]}
				/>
			</div>
			{mode === 'week' ? <Week /> : mode === 'trip' ? <Trip /> : mode === 'build' ? <Builder /> : mode === 'gaps' ? <Gaps /> : <Laundry />}
		</div>
	);
}

/* ---------------- Week planner ---------------- */
function Week() {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, scoringProfile, previewOutfit, nameOf, accountId, accountPhone, canSendToMe } = useOutfit();
	const [plans, setPlans] = useKv('plans', {});
	const [occasion, setOccasion] = useState('work');
	const [dragFrom, setDragFrom] = useState(null);
	const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
	const start = useMemo(() => {
		const d = new Date();
		d.setHours(12, 0, 0, 0);
		return d.getTime();
	}, []);
	const days = Array.from({ length: 7 }, (_, i) => ymd(start + i * 86_400_000));
	const hydrate = entry => {
		if (!entry) return null;
		const outfitItems = {};
		for (const id of entry.ids || []) {
			const item = byId.get(id);
			if (item) outfitItems[item.category] = item;
		}
		if (!Object.keys(outfitItems).length) return null;
		const scored = scoreOwnedOutfit(outfitItems, { occasion: entry.occasion || 'casual', profile: scoringProfile });
		return scored ? { id: entry.ids.join('+'), items: outfitItems, ...scored } : null;
	};
	const store = (date, outfit, occ = occasion) => setPlans(prev => ({ ...(prev || {}), [date]: outfit ? { ids: outfitItemList(outfit).map(p => p.id), occasion: occ } : null }));
	const autoFill = () => {
		const keep = {};
		const plan = weekPlan(items, { occasion, profile: scoringProfile }, { days: 7, start, keep });
		setPlans(prev => {
			const next = { ...(prev || {}) };
			for (const day of plan) next[day.date] = day.outfit ? { ids: outfitItemList(day.outfit).map(p => p.id), occasion } : null;
			return next;
		});
		toast.success(t('plan.filled'));
	};
	const swap = (a, b) =>
		setPlans(prev => {
			const next = { ...(prev || {}) };
			[next[a], next[b]] = [next[b] || null, next[a] || null];
			return next;
		});
	const tomorrow = days[1];
	const tomorrowOutfit = hydrate(plans?.[tomorrow]);
	const remind = async () => {
		if (!tomorrowOutfit) return;
		const at = new Date(start + 86_400_000);
		at.setHours(7, 30, 0, 0);
		try {
			const text = `${t('plan.reminderTitle')}\n${outfitItemList(tomorrowOutfit).map(nameOf).join(' + ')}`;
			await scheduleTomorrow({ accountId, phone: accountPhone, text, at });
			toast.success(t('plan.reminderSet'));
		} catch {
			toast.error(t('share.sendFailed'));
		}
	};
	const dayLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

	return (
		<div className="wa-of-stack-lg">
			<section className="wa-of-card wa-of-card-tight">
				<div className="wa-of-row-gap wa-of-wrap wa-of-space">
					<div className="wa-of-grow">
						<p className="wa-of-label">{t('context.occasion')}</p>
						<Chips value={occasion} options={OCCASIONS} onChange={setOccasion} label={t('context.occasion')} render={id => t(`context.occasions.${id}`)} size="sm" />
					</div>
					<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={autoFill}>
						<RefreshCw size={17} aria-hidden="true" /> {t('plan.autoFill')}
					</button>
				</div>
				<p className="wa-of-hint">{t('plan.weekHint')}</p>
				{canSendToMe && tomorrowOutfit ? (
					<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={remind}>
						<BellRing size={16} aria-hidden="true" /> {t('plan.remindTomorrow')}
					</button>
				) : null}
			</section>
			<ol className="wa-of-week">
				{days.map((date, index) => {
					const outfit = hydrate(plans?.[date]);
					return (
						<li
							key={date}
							className="wa-of-day"
							data-drop={dragFrom && dragFrom !== date ? true : undefined}
							onDragOver={event => dragFrom && event.preventDefault()}
							onDrop={event => {
								event.preventDefault();
								if (dragFrom && dragFrom !== date) swap(dragFrom, date);
								setDragFrom(null);
							}}
						>
							<div className="wa-of-day-head">
								<span className="wa-of-day-name">{index === 0 ? t('plan.today') : index === 1 ? t('plan.tomorrow') : dayLabel(date)}</span>
								{outfit ? <ScoreRing score={outfit.score} size="xs" label={t('suggestions.scoreLabel', { score: outfit.score })} /> : null}
							</div>
							{outfit ? (
								<div className="wa-of-day-body" draggable onDragStart={() => setDragFrom(date)} onDragEnd={() => setDragFrom(null)} aria-roledescription={t('plan.draggable')}>
									<div className="wa-of-day-pieces">
										{outfitItemList(outfit).slice(0, 4).map(piece => (
											<ItemImage key={piece.id} item={piece} colorBlind={colorBlind} />
										))}
									</div>
									<p className="wa-of-muted wa-of-clamp">{outfitItemList(outfit).map(nameOf).join(' + ')}</p>
									<div className="wa-of-row-gap">
										<button type="button" className="wa-of-icon-btn" onClick={() => previewOutfit(outfit)} aria-label={t('stylist.preview')}>
											<Eye size={17} aria-hidden="true" />
										</button>
										{index < 6 ? (
											<button type="button" className="wa-of-icon-btn" onClick={() => swap(date, days[index + 1])} aria-label={t('plan.moveNext')} title={t('plan.moveNext')}>
												<span aria-hidden="true">⇅</span>
											</button>
										) : null}
										<button type="button" className="wa-of-icon-btn" onClick={() => store(date, null)} aria-label={t('plan.clearDay')}>
											<X size={17} aria-hidden="true" />
										</button>
									</div>
								</div>
							) : (
								<button type="button" className="wa-of-day-empty" onClick={() => {
									const used = new Set(Object.entries(plans || {}).filter(([d]) => d !== date && days.includes(d)).flatMap(([, v]) => v?.ids || []));
									const pick = buildOutfits(items, { occasion, profile: scoringProfile }, { limit: 40, maxPerTop: 40 }).find(o => !outfitItemList(o).some(p => ['top', 'bottom'].includes(p.category) && used.has(p.id)));
									if (pick) store(date, pick);
									else toast(t('plan.noneLeft'));
								}}>
									{t('plan.addOutfit')}
								</button>
							)}
						</li>
					);
				})}
			</ol>
		</div>
	);
}

/* ---------------- Trip packer ---------------- */
function Trip() {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, scoringProfile, nameOf, previewOutfit } = useOutfit();
	const [days, setDays] = useState(4);
	const [weather, setWeather] = useState('mild');
	const [occasions, setOccasions] = useState(['casual']);
	const [packed, setPacked] = useState(() => new Set());
	const capsule = useMemo(() => tripCapsule(items, { weather, profile: scoringProfile }, { days, occasions: occasions.length ? occasions : ['casual'] }), [items, weather, days, occasions, scoringProfile]);
	return (
		<div className="wa-of-stack-lg">
			<section className="wa-of-card wa-of-card-tight wa-of-no-print">
				<label className="wa-of-field">
					<span className="wa-of-slider-head">
						<span className="wa-of-label">{t('plan.days')}</span>
						<span className="wa-of-slider-value">{days}</span>
					</span>
					<input className="wa-of-range" type="range" min={1} max={14} value={days} onChange={event => setDays(Number(event.target.value))} />
				</label>
				<p className="wa-of-label">{t('context.weather')}</p>
				<Chips value={weather} options={SEASONS} onChange={setWeather} label={t('context.weather')} render={id => t(`wardrobe.seasonNames.${id}`)} size="sm" />
				<p className="wa-of-label">{t('plan.occasions')}</p>
				<Chips multiple value={occasions} options={OCCASIONS} onChange={setOccasions} label={t('plan.occasions')} render={id => t(`context.occasions.${id}`)} size="sm" />
			</section>
			{!capsule.pieces.length ? (
				<EmptyState icon={Luggage} title={t('plan.tripEmpty')} />
			) : (
				<>
					<section className="wa-of-card">
						<div className="wa-of-card-head">
							<h2 className="wa-of-card-title">{t('plan.packList', { count: capsule.pieces.length })}</h2>
							<button type="button" className="wa-of-btn wa-of-btn-sm wa-of-no-print" onClick={() => window.print()}>
								<Printer size={16} aria-hidden="true" /> {t('plan.print')}
							</button>
						</div>
						<p className="wa-of-muted">{t('plan.capsuleSummary', { pieces: capsule.pieces.length, outfits: capsule.outfits.length })}</p>
						<ul className="wa-of-checklist">
							{capsule.pieces.map(piece => (
								<li key={piece.id}>
									<label>
										<input type="checkbox" checked={packed.has(piece.id)} onChange={() => setPacked(prev => { const next = new Set(prev); next.has(piece.id) ? next.delete(piece.id) : next.add(piece.id); return next; })} />
										<ItemImage item={piece} colorBlind={colorBlind} />
										<span>{nameOf(piece)}</span>
									</label>
								</li>
							))}
						</ul>
					</section>
					<div className="wa-of-cards wa-of-no-print">
						{capsule.outfits.slice(0, days).map((outfit, i) => (
							<OutfitCard key={outfit.id} compact rank={i + 1} outfit={outfit} locale={locale} colorBlind={colorBlind} onPreview={previewOutfit} />
						))}
					</div>
				</>
			)}
		</div>
	);
}

/* ---------------- Mix & match builder ---------------- */
const BUILD_SLOTS = ['outerwear', 'top', 'bottom', 'shoes', 'belt', 'watch'];
function Builder() {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, nameOf, scoringProfile, previewOutfit, explain } = useOutfit();
	const [chosen, setChosen] = useState({});
	const [slot, setSlot] = useState('top');
	const [occasion, setOccasion] = useState('casual');
	const outfitItems = Object.fromEntries(Object.entries(chosen).map(([k, id]) => [k, items.find(i => i.id === id)]).filter(([, v]) => v));
	const scored = outfitItems.top && outfitItems.bottom ? scoreOwnedOutfit(outfitItems, { occasion, profile: scoringProfile }) : null;
	const outfit = scored ? { id: 'builder', items: outfitItems, ...scored } : null;
	const options = items.filter(i => i.status !== 'archived' && i.category === slot);
	const assign = (cat, id) => setChosen(prev => ({ ...prev, [cat]: id }));
	return (
		<div className="wa-of-builder">
			<div className="wa-of-silhouette" aria-label={t('plan.buildTitle')}>
				{BUILD_SLOTS.map(cat => {
					const item = outfitItems[cat];
					return (
						<button
							key={cat}
							type="button"
							className="wa-of-drop"
							data-slot={cat}
							data-active={slot === cat || undefined}
							onClick={() => setSlot(cat)}
							onDragOver={event => event.preventDefault()}
							onDrop={event => {
								event.preventDefault();
								const id = event.dataTransfer.getData('text/plain');
								const dropped = items.find(i => i.id === id);
								if (dropped && dropped.category === cat) assign(cat, id);
							}}
						>
							{item ? <ItemImage item={item} colorBlind={colorBlind} /> : <span className="wa-of-drop-label">{t(`wardrobe.categories.${cat}`)}</span>}
							{item ? <span className="wa-of-drop-name">{nameOf(item)}</span> : null}
						</button>
					);
				})}
			</div>
			<div className="wa-of-stack">
				<div className="wa-of-card wa-of-card-tight" aria-live="polite">
					{outfit ? (
						<div className="wa-of-row-gap">
							<ScoreRing score={outfit.score} label={t('suggestions.scoreLabel', { score: outfit.score })} />
							<div className="wa-of-grow">
								{outfit.why.slice(0, 2).map(e => <p key={e.key} className="wa-of-small">✓ {explain(e)}</p>)}
								{outfit.watchOut.slice(0, 2).map(e => <p key={e.key} className="wa-of-small wa-of-warn-text">! {explain(e)}</p>)}
							</div>
							<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => previewOutfit(outfit)}>
								<Eye size={16} aria-hidden="true" /> {t('stylist.preview')}
							</button>
						</div>
					) : (
						<p className="wa-of-muted">{t('plan.buildHint')}</p>
					)}
					<Chips value={occasion} options={OCCASIONS} onChange={setOccasion} label={t('context.occasion')} render={id => t(`context.occasions.${id}`)} size="sm" />
				</div>
				<p className="wa-of-label">{t('plan.pickFor', { slot: t(`wardrobe.categories.${slot}`) })}</p>
				{!options.length ? (
					<p className="wa-of-muted">{t('plan.noneOfType')}</p>
				) : (
					<div className="wa-of-pick-grid">
						{chosen[slot] ? (
							<button type="button" className="wa-of-pick-item wa-of-pick-none" onClick={() => setChosen(prev => { const n = { ...prev }; delete n[slot]; return n; })}>
								<X size={20} aria-hidden="true" />
								<span>{t('common.none')}</span>
							</button>
						) : null}
						{options.map(item => (
							<button key={item.id} type="button" draggable onDragStart={event => event.dataTransfer.setData('text/plain', item.id)} className="wa-of-pick-item" data-active={chosen[slot] === item.id || undefined} onClick={() => assign(slot, item.id)}>
								<ItemImage item={item} colorBlind={colorBlind} />
								<span>{nameOf(item)}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

/* ---------------- Gaps ---------------- */
function Gaps() {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, scoringProfile, nameOf } = useOutfit();
	const gaps = useMemo(() => gapAnalysis(items, { occasion: 'casual', weather: 'mild', profile: scoringProfile }), [items, scoringProfile]);
	const dupes = useMemo(() => overDuplicated(items), [items]);
	return (
		<div className="wa-of-stack-lg">
			<section className="wa-of-card">
				<h2 className="wa-of-card-title">{t('plan.buyNext')}</h2>
				<p className="wa-of-hint">{t('plan.buyNextHint')}</p>
				{!gaps.length ? (
					<p className="wa-of-muted">{t('plan.noGaps')}</p>
				) : (
					<ol className="wa-of-gaps">
						{gaps.map(gap => {
							const hex = PALETTE_BY_ID[gap.color]?.hex;
							return (
								<li key={`${gap.subcategory}-${gap.color}`}>
									<Swatch hex={hex} size="lg" colorBlind={colorBlind} />
									<div className="wa-of-grow">
										<p className="wa-of-subtitle">
											{t(`wardrobe.sub.${gap.subcategory}`)} · {colorName(gap.color, locale)} · {t(`wardrobe.fits.${gap.fit}`)}
										</p>
										<p className="wa-of-muted">{t('plan.unlocks', { outfits: gap.newOutfits, pieces: gap.partners })}</p>
									</div>
								</li>
							);
						})}
					</ol>
				)}
			</section>
			{dupes.length ? (
				<section className="wa-of-card">
					<h2 className="wa-of-card-title">{t('closet.duplicates')}</h2>
					{dupes.map(list => (
						<p key={list[0].id} className="wa-of-alert">{t('closet.duplicateGroup', { count: list.length, name: nameOf(list[0]) })}</p>
					))}
				</section>
			) : null}
		</div>
	);
}

/* ---------------- Laundry ---------------- */
function Laundry() {
	const t = useTranslations('outfitMatcher');
	const { items, colorBlind, nameOf } = useOutfit();
	const pile = items.filter(i => i.status === 'laundry');
	if (!pile.length) return <EmptyState icon={WashingMachine} title={t('laundry.emptyTitle')} text={t('laundry.emptyText')} />;
	return (
		<section className="wa-of-card">
			<div className="wa-of-card-head">
				<h2 className="wa-of-card-title">{t('laundry.title', { count: pile.length })}</h2>
				<button type="button" className="wa-of-btn wa-of-btn-primary wa-of-btn-sm" onClick={async () => { await putItems(pile.map(markWashed)); toast.success(t('laundry.allWashed')); }}>
					<WashingMachine size={16} aria-hidden="true" /> {t('laundry.washAll')}
				</button>
			</div>
			<p className="wa-of-hint">{t('laundry.hint')}</p>
			<ul className="wa-of-pick-grid">
				{pile.map(item => (
					<li key={item.id} className="wa-of-pick-item">
						<ItemImage item={item} colorBlind={colorBlind} />
						<span>{nameOf(item)}</span>
						<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => putItems([markWashed(item)])}>
							{t('laundry.markWashed')}
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
