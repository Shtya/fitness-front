'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Archive, BarChart3, Check, Download, Eye, Heart, MoreHorizontal, Plus, Scissors, Search, Shirt, SlidersHorizontal, Trash2, Upload, WashingMachine } from 'lucide-react';
import { ITEM_FITS, ITEM_STATUSES, PATTERNS, SEASONS } from '../config/outfit-config.js';
import { describeColor } from '../engine/color.js';
import { costPerWear, markWashed, markWorn, overDuplicated, wardrobeStats } from '../engine/planner.js';
import { goesBestWith, itemHex, versatility } from '../engine/stylist.js';
import { colorName } from '../outfit-ui.js';
import { useOutfit } from '../OutfitContext.jsx';
import { deleteItem, exportWardrobe, imageUrl, importWardrobe, putItem } from '../wardrobe/db.js';
import { Chips, EmptyState, ItemImage, ScoreRing, Sheet, Swatch } from '../ui/primitives.jsx';
import AddItems from './AddItems.jsx';
import ItemEditor from './ItemEditor.jsx';

const GROUPS = {
	all: null,
	tops: ['top'],
	bottoms: ['bottom'],
	outerwear: ['outerwear', 'onepiece'],
	shoes: ['shoes'],
	extras: ['belt', 'watch', 'bag', 'hat', 'scarf', 'socks', 'accessory'],
};
const PAGE = 48;
const EMPTY_FILTERS = { families: [], formality: [], seasons: [], fits: [], patterns: [], statuses: [], favorites: false, neverWorn: false };

export default function Closet() {
	const t = useTranslations('outfitMatcher');
	const { items, loaded, locale, colorBlind, nameOf, scoringProfile } = useOutfit();
	const [group, setGroup] = useState('all');
	const [query, setQuery] = useState('');
	const [filters, setFilters] = useState(EMPTY_FILTERS);
	const [filterOpen, setFilterOpen] = useState(false);
	const [statsOpen, setStatsOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [adding, setAdding] = useState(false);
	const [openId, setOpenId] = useState(null);
	const [limit, setLimit] = useState(PAGE);
	const sentinel = useRef(null);
	const importRef = useRef(null);
	const menuRef = useRef(null);

	// The more menu closes on an outside tap or Escape, like the settings menu in the header.
	useEffect(() => {
		if (!menuOpen) return undefined;
		const close = event => {
			if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
		};
		const esc = event => event.key === 'Escape' && setMenuOpen(false);
		document.addEventListener('pointerdown', close);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', close);
			document.removeEventListener('keydown', esc);
		};
	}, [menuOpen]);

	const activeFilterCount = Object.entries(filters).reduce((n, [, v]) => n + (Array.isArray(v) ? v.length : v ? 1 : 0), 0);
	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		return items.filter(item => {
			const cats = GROUPS[group];
			if (cats && !cats.includes(item.category)) return false;
			if (!filters.statuses.length && item.status === 'archived') return false;
			if (filters.statuses.length && !filters.statuses.includes(item.status || 'clean')) return false;
			if (filters.favorites && !item.favorite) return false;
			if (filters.neverWorn && Number(item.timesWorn)) return false;
			if (filters.formality.length && !filters.formality.includes(String(item.formality || 2))) return false;
			if (filters.seasons.length && !(item.seasons || []).some(s => filters.seasons.includes(s))) return false;
			if (filters.fits.length && !filters.fits.includes(item.fit)) return false;
			if (filters.patterns.length && !filters.patterns.includes(item.pattern || 'solid')) return false;
			if (filters.families.length) {
				const family = describeColor(itemHex(item))?.family;
				if (!filters.families.includes(family)) return false;
			}
			if (q) {
				const hay = [nameOf(item), item.brand, item.notes, colorName(itemHex(item), 'en'), colorName(itemHex(item), 'ar'), ...(item.styleTags || [])].join(' ').toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		});
	}, [items, group, query, filters, nameOf]);

	useEffect(() => setLimit(PAGE), [group, query, filters]);
	useEffect(() => {
		const node = sentinel.current;
		if (!node) return undefined;
		const io = new IntersectionObserver(entries => {
			if (entries.some(e => e.isIntersecting)) setLimit(n => n + PAGE);
		}, { rootMargin: '400px' });
		io.observe(node);
		return () => io.disconnect();
	}, [visible.length]);

	const openItem = items.find(item => item.id === openId) || null;
	const counts = useMemo(() => {
		const c = {};
		for (const [id, cats] of Object.entries(GROUPS)) c[id] = items.filter(item => item.status !== 'archived' && (!cats || cats.includes(item.category))).length;
		return c;
	}, [items]);

	const doExport = async () => {
		setMenuOpen(false);
		const pending = toast.loading(t('closet.exporting'));
		try {
			const blob = await exportWardrobe();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `wardrobe-${new Date().toISOString().slice(0, 10)}.zip`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 3000);
			toast.success(t('closet.exported'), { id: pending });
		} catch {
			toast.error(t('closet.exportFailed'), { id: pending });
		}
	};
	const doImport = async file => {
		if (!file) return;
		const pending = toast.loading(t('closet.importing'));
		try {
			const n = await importWardrobe(file);
			toast.success(t('closet.imported', { count: n }), { id: pending });
		} catch {
			toast.error(t('closet.importFailed'), { id: pending });
		}
	};

	return (
		<div className="wa-of-closet">
			<div className="wa-of-toolbar">
				<label className="wa-of-search">
					<Search size={17} aria-hidden="true" />
					<input type="search" value={query} onChange={event => setQuery(event.target.value.slice(0, 60))} placeholder={t('closet.search')} aria-label={t('closet.search')} />
				</label>
				<button type="button" className="wa-of-btn wa-of-btn-icon-text" onClick={() => setFilterOpen(true)} aria-label={t('closet.filters')}>
					<SlidersHorizontal size={17} aria-hidden="true" />
					<span className="wa-of-hide-sm">{t('closet.filters')}</span>
					{activeFilterCount ? <span className="wa-of-count">{activeFilterCount}</span> : null}
				</button>
				<button type="button" className="wa-of-btn wa-of-btn-icon-text" onClick={() => setStatsOpen(true)} aria-label={t('closet.insights')} disabled={!items.length}>
					<BarChart3 size={17} aria-hidden="true" />
					<span className="wa-of-hide-sm">{t('closet.insights')}</span>
				</button>
				<div className="wa-of-menu-wrap" ref={menuRef}>
					<button type="button" className="wa-of-icon-btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)} aria-label={t('closet.more')}>
						<MoreHorizontal size={19} aria-hidden="true" />
					</button>
					{menuOpen ? (
						<div className="wa-of-menu" role="menu">
							<button type="button" role="menuitem" onClick={doExport} disabled={!items.length}>
								<Download size={16} aria-hidden="true" /> {t('closet.export')}
							</button>
							<button type="button" role="menuitem" onClick={() => { setMenuOpen(false); importRef.current?.click(); }}>
								<Upload size={16} aria-hidden="true" /> {t('closet.import')}
							</button>
						</div>
					) : null}
				</div>
				<button type="button" className="wa-of-btn wa-of-btn-primary wa-of-hide-sm-flex" onClick={() => setAdding(true)}>
					<Plus size={18} aria-hidden="true" />
					{t('closet.add')}
				</button>
				<input ref={importRef} type="file" accept=".zip,application/zip" hidden onChange={event => { void doImport(event.target.files?.[0]); event.target.value = ''; }} />
			</div>

			<div className="wa-of-cat-row" role="tablist" aria-label={t('closet.categories')}>
				{Object.keys(GROUPS).map(id => (
					<button key={id} type="button" role="tab" aria-selected={group === id} className="wa-of-cat" data-active={group === id || undefined} onClick={() => setGroup(id)}>
						{t(`closet.groups.${id}`)}
						<span className="wa-of-cat-count">{counts[id]}</span>
					</button>
				))}
			</div>

			{!loaded ? (
				<div className="wa-of-grid" aria-busy="true">
					{Array.from({ length: 8 }, (_, i) => (
						<span key={i} className="wa-of-skeleton" />
					))}
				</div>
			) : !items.length ? (
				<EmptyState
					icon={Shirt}
					title={t('closet.emptyTitle')}
					text={t('closet.emptyText')}
					action={
						<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={() => setAdding(true)}>
							<Plus size={18} aria-hidden="true" />
							{t('closet.addFirst')}
						</button>
					}
				/>
			) : !visible.length ? (
				<EmptyState icon={Search} title={t('closet.noMatches')} action={<button type="button" className="wa-of-btn" onClick={() => { setFilters(EMPTY_FILTERS); setQuery(''); setGroup('all'); }}>{t('closet.clearFilters')}</button>} />
			) : (
				<>
					{items.length < 5 ? <p className="wa-of-note">{t('closet.unlockHint', { count: 5 - items.length })}</p> : null}
					<ul className="wa-of-grid">
						{visible.slice(0, limit).map(item => (
							<li key={item.id}>
								<button type="button" className="wa-of-card-item" onClick={() => setOpenId(item.id)}>
									<ItemImage item={item} colorBlind={colorBlind} />
									{item.status && item.status !== 'clean' ? <span className="wa-of-status-badge" data-status={item.status}>{t(`closet.status.${item.status}`)}</span> : null}
									{item.favorite ? <Heart size={15} className="wa-of-fav" fill="currentColor" aria-label={t('wardrobe.favorite')} /> : null}
									<span className="wa-of-card-item-text">
										<span className="wa-of-card-item-name">{nameOf(item)}</span>
										<span className="wa-of-card-item-meta">
											<Swatch hex={itemHex(item)} size="xs" colorBlind={colorBlind} />
											{colorName(itemHex(item), locale)}
										</span>
									</span>
								</button>
							</li>
						))}
					</ul>
					<span ref={sentinel} aria-hidden="true" />
				</>
			)}

			<button type="button" className="wa-of-fab-add" onClick={() => setAdding(true)} aria-label={t('closet.add')}>
				<Plus size={24} aria-hidden="true" />
			</button>

			<AddItems open={adding} onClose={() => setAdding(false)} />
			<FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} setFilters={setFilters} count={visible.length} />
			{openItem ? <ItemDrawer item={openItem} items={items} onClose={() => setOpenId(null)} onOpen={setOpenId} scoringProfile={scoringProfile} /> : null}
			{statsOpen ? <StatsSheet onClose={() => setStatsOpen(false)} onOpen={id => { setStatsOpen(false); setOpenId(id); }} /> : null}
		</div>
	);
}

function FilterSheet({ open, onClose, filters, setFilters, count }) {
	const t = useTranslations('outfitMatcher');
	const set = key => value => setFilters(prev => ({ ...prev, [key]: value }));
	return (
		<Sheet open={open} onClose={onClose} title={t('closet.filters')}
			footer={
				<div className="wa-of-row-gap wa-of-end">
					<button type="button" className="wa-of-btn wa-of-btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
						{t('closet.clearFilters')}
					</button>
					<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={onClose}>
						{t('closet.showCount', { count })}
					</button>
				</div>
			}
		>
			<div className="wa-of-stack">
				<p className="wa-of-label">{t('closet.filter.status')}</p>
				<Chips multiple size="sm" value={filters.statuses} options={ITEM_STATUSES} onChange={set('statuses')} label={t('closet.filter.status')} render={id => t(`closet.status.${id}`)} />
				<div className="wa-of-row-gap wa-of-wrap">
					<label className="wa-of-toggle"><input type="checkbox" checked={filters.favorites} onChange={e => set('favorites')(e.target.checked)} /><span className="wa-of-toggle-title">{t('closet.filter.favorites')}</span></label>
					<label className="wa-of-toggle"><input type="checkbox" checked={filters.neverWorn} onChange={e => set('neverWorn')(e.target.checked)} /><span className="wa-of-toggle-title">{t('closet.filter.neverWorn')}</span></label>
				</div>
				<p className="wa-of-label">{t('closet.filter.family')}</p>
				<Chips multiple size="sm" value={filters.families} options={['neutral', 'warm', 'cool', 'earth']} onChange={set('families')} label={t('closet.filter.family')} render={id => t(`families.${id}`)} />
				<p className="wa-of-label">{t('wardrobe.formality')}</p>
				<Chips multiple size="sm" value={filters.formality} options={['1', '2', '3', '4', '5']} onChange={set('formality')} label={t('wardrobe.formality')} render={id => t(`wardrobe.formality5.${id}`)} />
				<p className="wa-of-label">{t('wardrobe.seasons')}</p>
				<Chips multiple size="sm" value={filters.seasons} options={SEASONS} onChange={set('seasons')} label={t('wardrobe.seasons')} render={id => t(`wardrobe.seasonNames.${id}`)} />
				<p className="wa-of-label">{t('wardrobe.fit')}</p>
				<Chips multiple size="sm" value={filters.fits} options={ITEM_FITS} onChange={set('fits')} label={t('wardrobe.fit')} render={id => t(`wardrobe.fits.${id}`)} />
				<p className="wa-of-label">{t('wardrobe.pattern')}</p>
				<Chips multiple size="sm" value={filters.patterns} options={PATTERNS} onChange={set('patterns')} label={t('wardrobe.pattern')} render={id => t(`wardrobe.patterns.${id}`)} />
			</div>
		</Sheet>
	);
}

function ItemDrawer({ item, items, onClose, onOpen, scoringProfile }) {
	const t = useTranslations('outfitMatcher');
	const { locale, colorBlind, nameOf, previewOutfit } = useOutfit();
	const [draft, setDraft] = useState(item);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [photo, setPhoto] = useState(null);
	useEffect(() => setDraft(item), [item]);
	useEffect(() => {
		let alive = true;
		imageUrl(item.id, 'medium').then(url => alive && setPhoto(url));
		return () => {
			alive = false;
		};
	}, [item.id]);
	const partners = useMemo(() => goesBestWith(item, items, { occasion: 'casual', weather: 'mild', profile: scoringProfile }), [item, items, scoringProfile]);
	const dirty = JSON.stringify(draft) !== JSON.stringify(item);
	const save = async patch => {
		await putItem({ ...draft, ...patch });
		if (!patch) toast.success(t('closet.saved'));
	};
	const cpw = costPerWear(item);

	return (
		<Sheet open onClose={onClose} title={nameOf(item)} size="side"
			footer={
				<div className="wa-of-row-gap wa-of-wrap wa-of-end">
					{dirty ? (
						<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={() => save()}>
							<Check size={17} aria-hidden="true" /> {t('common.save')}
						</button>
					) : (
						<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={async () => { await putItem(markWorn(item)); toast.success(t('stylist.wornToast')); }}>
							<Check size={17} aria-hidden="true" /> {t('closet.wearIt')}
						</button>
					)}
				</div>
			}
		>
			<div className="wa-of-drawer">
				<div className="wa-of-drawer-photo">{photo ? <img src={photo} alt="" /> : <ItemImage item={item} colorBlind={colorBlind} />}</div>
				<dl className="wa-of-facts wa-of-facts-grid">
					<div><dt>{t('closet.timesWorn')}</dt><dd>{item.timesWorn || 0}</dd></div>
					<div><dt>{t('closet.lastWorn')}</dt><dd>{item.lastWorn ? new Date(item.lastWorn).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' }) : '—'}</dd></div>
					<div><dt>{t('closet.costPerWear')}</dt><dd>{cpw != null ? cpw.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—'}</dd></div>
					<div><dt>{t('closet.statusLabel')}</dt><dd>{t(`closet.status.${item.status || 'clean'}`)}</dd></div>
				</dl>
				<div className="wa-of-row-gap wa-of-wrap">
					{item.status === 'laundry' ? (
						<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => putItem(markWashed(item))}>
							<WashingMachine size={16} aria-hidden="true" /> {t('laundry.markWashed')}
						</button>
					) : (
						<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => putItem({ ...item, status: 'laundry' })}>
							<WashingMachine size={16} aria-hidden="true" /> {t('closet.toLaundry')}
						</button>
					)}
					<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => putItem({ ...item, status: item.status === 'tailor' ? 'clean' : 'tailor' })}>
						<Scissors size={16} aria-hidden="true" /> {item.status === 'tailor' ? t('closet.backFromTailor') : t('closet.toTailor')}
					</button>
					<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => putItem({ ...item, status: item.status === 'archived' ? 'clean' : 'archived' })}>
						<Archive size={16} aria-hidden="true" /> {item.status === 'archived' ? t('closet.unarchive') : t('closet.archive')}
					</button>
					{confirmDelete ? (
						<button type="button" className="wa-of-btn wa-of-btn-sm wa-of-btn-danger" onClick={async () => { await deleteItem(item.id); toast.success(t('closet.deleted')); onClose(); }}>
							<Trash2 size={16} aria-hidden="true" /> {t('closet.confirmDelete')}
						</button>
					) : (
						<button type="button" className="wa-of-btn wa-of-btn-sm wa-of-btn-ghost" onClick={() => setConfirmDelete(true)}>
							<Trash2 size={16} aria-hidden="true" /> {t('common.delete')}
						</button>
					)}
				</div>

				<section>
					<h3 className="wa-of-subtitle">{t('closet.goesWith')}</h3>
					{!partners.length ? (
						<p className="wa-of-muted">{t('closet.goesWithEmpty')}</p>
					) : (
						<ul className="wa-of-partners">
							{partners.map(({ item: other, score }) => (
								<li key={other.id}>
									<button type="button" className="wa-of-partner" onClick={() => onOpen(other.id)}>
										<ItemImage item={other} colorBlind={colorBlind} />
										<span className="wa-of-partner-name">{nameOf(other)}</span>
										<ScoreRing score={score} size="xs" label={t('suggestions.scoreLabel', { score })} />
									</button>
								</li>
							))}
						</ul>
					)}
					{partners.length ? (
						<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => {
							const best = { items: { [item.category]: item, [partners[0].item.category]: partners[0].item }, score: partners[0].score };
							previewOutfit(best);
							onClose();
						}}>
							<Eye size={16} aria-hidden="true" /> {t('stylist.preview')}
						</button>
					) : null}
				</section>

				<section>
					<h3 className="wa-of-subtitle">{t('closet.details')}</h3>
					<ItemEditor item={draft} onChange={setDraft} locale={locale} colorBlind={colorBlind} />
				</section>
			</div>
		</Sheet>
	);
}

function StatsSheet({ onClose, onOpen }) {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, nameOf, scoringProfile } = useOutfit();
	const stats = useMemo(() => wardrobeStats(items), [items]);
	const vers = useMemo(() => versatility(items, { occasion: 'casual', weather: 'mild', profile: scoringProfile }), [items, scoringProfile]);
	const dupes = useMemo(() => overDuplicated(items), [items]);
	const ranked = items.filter(i => i.status !== 'archived' && ['top', 'bottom', 'outerwear', 'shoes', 'onepiece'].includes(i.category)).map(i => ({ item: i, n: vers.get(i.id) || 0 })).sort((a, b) => b.n - a.n);
	const maxColor = Math.max(1, ...stats.colors.map(c => c.count));
	const maxCat = Math.max(1, ...Object.values(stats.byCategory));
	return (
		<Sheet open onClose={onClose} title={t('closet.insights')} size="lg">
			<div className="wa-of-stats">
				<div className="wa-of-kpis">
					<div><span className="wa-of-kpi">{stats.total}</span><span className="wa-of-muted">{t('closet.kpi.pieces')}</span></div>
					<div><span className="wa-of-kpi">{stats.neverWorn}</span><span className="wa-of-muted">{t('closet.kpi.neverWorn')}</span></div>
					<div><span className="wa-of-kpi">{stats.laundry}</span><span className="wa-of-muted">{t('closet.kpi.laundry')}</span></div>
				</div>
				<section>
					<h3 className="wa-of-subtitle">{t('closet.byCategory')}</h3>
					<ul className="wa-of-bars">
						{Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
							<li key={cat}>
								<span className="wa-of-bar-label">{t(`wardrobe.categories.${cat}`)}</span>
								<span className="wa-of-bar-track"><span className="wa-of-bar-fill" style={{ inlineSize: `${(n / maxCat) * 100}%` }} /></span>
								<span className="wa-of-bar-value">{n}</span>
							</li>
						))}
					</ul>
				</section>
				<section>
					<h3 className="wa-of-subtitle">{t('closet.byColor')}</h3>
					<ul className="wa-of-bars">
						{stats.colors.slice(0, 10).map(c => (
							<li key={c.id}>
								<span className="wa-of-bar-label"><Swatch hex={c.hex} size="xs" colorBlind={colorBlind} /> {colorName(c.id, locale)}</span>
								<span className="wa-of-bar-track"><span className="wa-of-bar-fill wa-of-bar-color" style={{ inlineSize: `${(c.count / maxColor) * 100}%`, '--swatch': c.hex }} /></span>
								<span className="wa-of-bar-value">{c.count}</span>
							</li>
						))}
					</ul>
				</section>
				<section>
					<h3 className="wa-of-subtitle">{t('closet.versatility')}</h3>
					<p className="wa-of-hint">{t('closet.versatilityHint')}</p>
					<ol className="wa-of-rank">
						{ranked.slice(0, 5).map(({ item, n }) => (
							<li key={item.id}><button type="button" className="wa-of-link" onClick={() => onOpen(item.id)}>{nameOf(item)}</button><span className="wa-of-badge">{t('closet.outfitsCount', { count: n })}</span></li>
						))}
					</ol>
					{ranked.length > 5 ? (
						<>
							<p className="wa-of-label">{t('closet.leastVersatile')}</p>
							<ol className="wa-of-rank">
								{ranked.slice(-3).reverse().map(({ item, n }) => (
									<li key={item.id}><button type="button" className="wa-of-link" onClick={() => onOpen(item.id)}>{nameOf(item)}</button><span className="wa-of-badge">{t('closet.outfitsCount', { count: n })}</span></li>
								))}
							</ol>
						</>
					) : null}
				</section>
				<section>
					<h3 className="wa-of-subtitle">{t('closet.mostWorn')}</h3>
					<ol className="wa-of-rank">
						{stats.mostWorn.map(item => (
							<li key={item.id}><button type="button" className="wa-of-link" onClick={() => onOpen(item.id)}>{nameOf(item)}</button><span className="wa-of-badge">{t('closet.wears', { count: item.timesWorn || 0 })}</span></li>
						))}
					</ol>
				</section>
				{dupes.length ? (
					<section>
						<h3 className="wa-of-subtitle">{t('closet.duplicates')}</h3>
						{dupes.map(list => (
							<p key={list[0].id} className="wa-of-alert">{t('closet.duplicateGroup', { count: list.length, name: nameOf(list[0]) })}</p>
						))}
					</section>
				) : null}
			</div>
		</Sheet>
	);
}
