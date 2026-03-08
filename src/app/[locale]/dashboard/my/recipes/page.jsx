'use client';

import axios from 'axios';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
	Clock, Flame, Eye, Heart, Star, Users, Beef, Wheat,
	Droplets, X, BookOpen, TrendingUp, SlidersHorizontal, ChevronDown,
	ChevronRight, Check, RefreshCw, Lightbulb, PlayCircle, BookMarked,
	Search, Filter,
} from 'lucide-react';

const API_BASE = `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1`;
const PER_PAGE = 6;

/* ══════════════════════════════════════════
	 HELPERS
══════════════════════════════════════════ */
function normalizeImage(url) {
	if (!url) return '';
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return `${process.env.NEXT_PUBLIC_BASE_URL}${url}`;
}

function mapRecipeFromApi(item) {
	return {
		id: item.id,
		title: item.title || '',
		category: item.meal_type || '',
		satiety: item.satiety_index || '',
		calories: item?.nutrition?.calories ?? 0,
		protein: item?.nutrition?.protein_g ?? 0,
		carbs: item?.nutrition?.carbs_g ?? 0,
		fat: item?.nutrition?.fat_g ?? 0,
		ingredients: item.ingredients || [],
		creamIngredients: item.cream_ingredients || [],
		sauceIngredients: item.sauce_ingredients || [],
		directions: item.directions || [],
		tips: Array.isArray(item.tips) ? item.tips.join('\n') : '',
		videoUrl: item.video_url || '',
		imageUrl: normalizeImage(item.image_url),
		createdAt: item.created_at,
		updatedAt: item.updated_at,
	};
}

/* ══════════════════════════════════════════
	 RTL HOOK
══════════════════════════════════════════ */
function useIsRTL() {
	const [isRTL, setIsRTL] = useState(false);
	useEffect(() => {
		const check = () => setIsRTL(document.documentElement.dir === 'rtl');
		check();
		const obs = new MutationObserver(check);
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
		return () => obs.disconnect();
	}, []);
	return isRTL;
}

/* ══════════════════════════════════════════
	 FILTER PORTAL + RENDERERS
══════════════════════════════════════════ */
function FilterPortal({ anchorRef, open, onClose, children }) {
	const [pos, setPos] = useState({ top: 0, left: 0, width: 340 });
	const isRTL = useIsRTL();

	const reposition = useCallback(() => {
		if (!anchorRef.current || !open) return;
		const r = anchorRef.current.getBoundingClientRect();
		const W = 340;
		const vw = window.innerWidth;
		const sy = window.scrollY;
		let left = isRTL ? r.right - W : r.left;
		if (left + W > vw - 8) left = vw - W - 8;
		if (left < 8) left = 8;
		setPos({ top: r.bottom + sy + 10, left, width: W });
	}, [anchorRef, open, isRTL]);

	useEffect(() => {
		if (!open) return;
		reposition();
		window.addEventListener('resize', reposition);
		window.addEventListener('scroll', reposition, true);
		return () => {
			window.removeEventListener('resize', reposition);
			window.removeEventListener('scroll', reposition, true);
		};
	}, [open, reposition]);

	useEffect(() => {
		if (!open) return;
		const h = (e) => {
			if (anchorRef.current?.contains(e.target)) return;
			if (document.getElementById('filter-portal-panel')?.contains(e.target)) return;
			onClose();
		};
		document.addEventListener('mousedown', h);
		return () => document.removeEventListener('mousedown', h);
	}, [open, onClose, anchorRef]);

	if (typeof document === 'undefined') return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="bd"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="fixed inset-0 z-[998] sm:hidden"
						style={{ backdropFilter: 'blur(4px)', background: 'rgba(26,18,8,0.2)' }}
						onClick={onClose}
					/>
					<motion.div
						id="filter-portal-panel"
						key="panel"
						initial={{ opacity: 0, y: 14, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.96 }}
						transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
						style={{
							position: 'absolute',
							top: pos.top,
							left: pos.left,
							width: pos.width,
							zIndex: 999,
							backdropFilter: 'blur(24px)',
							WebkitBackdropFilter: 'blur(24px)',
							boxShadow: '0 32px 100px -12px rgba(26,18,8,0.22), inset 0 0 0 1px rgba(255,255,255,0.7)',
							borderRadius: 24,
							overflow: 'hidden',
							background: 'rgba(255,253,249,0.97)'
						}}
					>
						{children}
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body
	);
}

function FToggle({ group, value, onChange }) {
	return (
		<div>
			<p style={{ marginBottom: 10, fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-lt)' }}>
				{group.label}
			</p>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
				{group.options.map(opt => {
					const on = value === opt.value;
					return (
						<button
							key={opt.value}
							onClick={() => onChange(on ? '' : opt.value)}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 6,
								padding: '7px 14px',
								borderRadius: 99,
								border: '1.5px solid',
								fontSize: '0.75rem',
								fontWeight: 700,
								cursor: 'pointer',
								transition: 'all 0.18s',
								borderColor: on ? 'transparent' : 'var(--color-primary-150)',
								background: on ? 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' : 'var(--color-primary-50)',
								color: on ? '#fff' : 'var(--ink-mid)',
								boxShadow: on ? '0 4px 14px rgba(201,123,46,0.3)' : 'none'
							}}
						>
							{opt.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function Collapsible({ title, children, open: defaultOpen = true }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div style={{ borderBottom: '1px solid var(--color-primary-100)', paddingBottom: 16 }}>
			<button
				onClick={() => setOpen(o => !o)}
				style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer' }}
			>
				<span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-lt)' }}>
					{title}
				</span>
				<motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }}>
					<ChevronRight style={{ width: 14, height: 14, color: 'var(--color-primary-300)' }} />
				</motion.span>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
						style={{ overflow: 'hidden' }}
					>
						<div style={{ paddingTop: 12 }}>{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function FilterPanel({ filters, filterValues, onFilterChange, onFilterReset, onClose, activeFilterCount, t }) {
	return (
		<>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-primary-100)', background: 'linear-gradient(135deg,var(--color-primary-50),var(--paper))' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<div style={{ width: 32, height: 32, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' }}>
						<SlidersHorizontal style={{ width: 14, height: 14, color: 'white' }} />
					</div>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
						<span style={{ fontSize: '0.875rem', fontWeight: 900, color: 'var(--ink)' }}>{t('title')}</span>
						<AnimatePresence>
							{activeFilterCount > 0 && (
								<motion.span
									key="b"
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									exit={{ scale: 0 }}
									style={{ fontSize: '0.6rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}
								>
									{activeFilterCount} {t('active')}
								</motion.span>
							)}
						</AnimatePresence>
					</div>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					<AnimatePresence>
						{activeFilterCount > 0 && (
							<motion.button
								key="r"
								initial={{ opacity: 0, x: 8 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 8 }}
								onClick={onFilterReset}
								style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}
							>
								<RefreshCw style={{ width: 11, height: 11 }} /> {t('clear')}
							</motion.button>
						)}
					</AnimatePresence>

					<button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-lt)' }}>
						<X style={{ width: 14, height: 14 }} />
					</button>
				</div>
			</div>

			<div style={{ maxHeight: 'min(440px,60vh)', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16, scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-200) transparent' }}>
				{filters.map(g => (
					<Collapsible key={g.key} title={g.label}>
						<FToggle group={g} value={filterValues[g.key]} onChange={v => onFilterChange(g.key, v)} />
					</Collapsible>
				))}
			</div>

			<div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-primary-100)', background: 'linear-gradient(135deg,var(--paper),var(--color-primary-50))' }}>
				<button
					onClick={onClose}
					style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 16, padding: '11px', fontSize: '0.875rem', fontWeight: 900, color: 'white', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', boxShadow: '0 6px 20px rgba(201,123,46,0.38)' }}
				>
					<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
						<Check style={{ width: 15, height: 15, strokeWidth: 3 }} />
						{t('apply')}
						{activeFilterCount > 0 && (
							<span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 8px', borderRadius: 99, fontSize: '0.65rem' }}>
								{activeFilterCount}
							</span>
						)}
					</span>
				</button>
			</div>
		</>
	);
}

/* ══════════════════════════════════════════
	 PAGE HEADER
══════════════════════════════════════════ */
function PageHeader({ title, desc, icon: Icon, stats = [], tabs = [], activeTab, onTabChange, filters = [], filterValues = {}, onFilterChange, onFilterReset, tFilters }) {
	const [filterOpen, setFilterOpen] = useState(false);
	const filterBtnRef = useRef(null);
	const activeFilterCount = Object.values(filterValues).filter(v => v !== '' && v !== null && v !== undefined).length;

	return (
		<div style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px 24px 0 0' }}>
			<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,var(--color-gradient-from) 0%,var(--color-gradient-via) 50%,var(--color-gradient-to) 100%)' }} />
			<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0) 60%,rgba(0,0,0,0.08) 100%)' }} />
			<div style={{ position: 'absolute', top: -128, left: -128, width: 384, height: 384, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', filter: 'blur(48px)' }} />
			<div style={{ position: 'absolute', bottom: -80, right: -96, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(40px)' }} />

			<div style={{ position: 'relative', zIndex: 1, padding: '28px 32px 0' }}>
				<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
						{Icon && (
							<motion.div
								whileHover={{ scale: 1.06, rotate: 4 }}
								transition={{ type: 'spring', stiffness: 380, damping: 20 }}
								style={{ position: 'relative', width: 60, height: 60, borderRadius: 20, background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 8px 32px -4px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.35)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}
							>
								<Icon style={{ width: 28, height: 28, color: 'white' }} />
							</motion.div>
						)}

						<div style={{ minWidth: 0 }}>
							<motion.h1
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
								className="serif"
								style={{ fontSize: 'clamp(1.6rem,3vw,2.25rem)', fontWeight: 900, lineHeight: 1.15, color: 'white', margin: 0 }}
							>
								{title}
							</motion.h1>
							{desc && (
								<motion.p
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, delay: 0.09 }}
									style={{ marginTop: 6, fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.6, color: 'rgba(255,255,255,0.68)', maxWidth: 440 }}
								>
									{desc}
								</motion.p>
							)}
						</div>
					</div>

					{filters.length > 0 && (
						<div ref={filterBtnRef} style={{ position: 'relative' }}>
							<motion.button
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								onClick={() => setFilterOpen(o => !o)}
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: 8,
									height: 40,
									padding: '0 16px',
									borderRadius: 14,
									border: 'none',
									cursor: 'pointer',
									fontSize: '0.875rem',
									fontWeight: 700,
									transition: 'all 0.2s',
									background: filterOpen ? 'rgba(255,253,249,0.98)' : 'rgba(255,255,255,0.16)',
									backdropFilter: 'blur(16px)',
									WebkitBackdropFilter: 'blur(16px)',
									color: filterOpen ? 'var(--color-primary-700)' : 'white',
									boxShadow: filterOpen ? '0 4px 24px rgba(0,0,0,0.18),0 0 0 1px rgba(255,255,255,0.8)' : 'inset 0 0 0 1px rgba(255,255,255,0.2)'
								}}
							>
								<SlidersHorizontal style={{ width: 16, height: 16 }} />
								{tFilters('button')}
								<AnimatePresence>
									{activeFilterCount > 0 && (
										<motion.span
											key="cnt"
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											exit={{ scale: 0 }}
											style={{ position: 'absolute', top: -7, right: -7, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', color: 'white', fontSize: '0.58rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
										>
											{activeFilterCount}
										</motion.span>
									)}
								</AnimatePresence>
								<motion.span animate={{ rotate: filterOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
									<ChevronDown style={{ width: 14, height: 14, opacity: 0.7 }} />
								</motion.span>
							</motion.button>

							<FilterPortal anchorRef={filterBtnRef} open={filterOpen} onClose={() => setFilterOpen(false)}>
								<FilterPanel
									filters={filters}
									filterValues={filterValues}
									onFilterChange={onFilterChange}
									onFilterReset={onFilterReset}
									onClose={() => setFilterOpen(false)}
									activeFilterCount={activeFilterCount}
									t={tFilters}
								/>
							</FilterPortal>
						</div>
					)}
				</div>

				{stats.length > 0 && (
					<div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
						{stats.map((s, i) => {
							const SI = s.icon;
							return (
								<motion.div
									key={s.label}
									initial={{ opacity: 0, y: 16 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
									style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
								>
									<div style={{ padding: '14px 16px' }}>
										<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
											<p style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3, margin: 0 }}>{s.label}</p>
											{SI && <SI style={{ width: 16, height: 16, flexShrink: 0, color: 'rgba(255,255,255,0.45)' }} />}
										</div>
										<p style={{ marginTop: 10, fontSize: '1.5rem', fontWeight: 900, lineHeight: 1, color: 'white', margin: '10px 0 0' }}>{s.value}</p>
										{s.sub && <p style={{ marginTop: 6, fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{s.sub}</p>}
									</div>
								</motion.div>
							);
						})}
					</div>
				)}

				{tabs.length > 0 && (
					<div style={{ marginTop: 28, display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
						{tabs.map((tab, i) => {
							const TI = tab.icon;
							const active = activeTab === tab.id;
							return (
								<motion.button
									key={tab.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.14 + i * 0.05 }}
									onClick={() => onTabChange?.(tab.id)}
									whileTap={{ scale: 0.97 }}
									style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '10px 20px', borderRadius: '14px 14px 0 0', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, background: 'none', color: active ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.72)', transition: 'color 0.2s' }}
								>
									{active && <motion.div layoutId="tab-bg-client-recipes" style={{ position: 'absolute', inset: 0, borderRadius: '14px 14px 0 0', background: 'rgba(255,253,249,1)', boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }} transition={{ type: 'spring', stiffness: 480, damping: 40 }} />}
									<span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
										{TI && <TI style={{ width: 16, height: 16, color: active ? 'var(--color-primary-600)' : 'inherit', strokeWidth: 2.5 }} />}
										{tab.label}
									</span>
								</motion.button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════
	 RECIPE CARD
══════════════════════════════════════════ */
function RecipeCard({ recipe, idx, onOpen, tCard, tCategories }) {
	const [hov, setHov] = useState(false);

	return (
		<motion.article
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
			layout
			onHoverStart={() => setHov(true)}
			onHoverEnd={() => setHov(false)}
			onClick={() => onOpen(recipe)}
			style={{
				cursor: 'pointer',
				borderRadius: 22,
				overflow: 'hidden',
				background: 'var(--paper)',
				border: '1.5px solid var(--border)',
				boxShadow: hov ? '0 20px 60px -8px rgba(201,123,46,0.2),0 4px 16px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.05)',
				transform: hov ? 'translateY(-6px)' : 'translateY(0)',
				transition: 'box-shadow 0.3s,transform 0.3s',
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			<div style={{ height: 3, background: 'linear-gradient(90deg,var(--color-gradient-from),var(--color-gradient-to))' }} />

			<div style={{ position: 'relative', height: 188, overflow: 'hidden', background: 'linear-gradient(135deg,var(--color-primary-50),var(--color-primary-100))' }}>
				{recipe.imageUrl ? (
					<img src={recipe.imageUrl} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.5s' }} />
				) : (
					<div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
						<BookMarked style={{ width: 54, height: 54, opacity: 0.18, color: 'var(--color-primary-400)' }} />
					</div>
				)}

				<div style={{ position: 'absolute', bottom: 11, right: 11, padding: '4px 9px', borderRadius: 99, background: 'rgba(26,18,8,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
					{tCategories(recipe.category) || recipe.category}
				</div>
			</div>

			<div style={{ padding: '15px 17px', flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
				<div>
					<h3 className="serif" style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--ink)', margin: 0 }}>
						{recipe.title}
					</h3>
				</div>

				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
					<span style={{ padding: '3px 9px', borderRadius: 99, fontSize: '0.67rem', fontWeight: 600, background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
						{tCard('satiety')}: {recipe.satiety}
					</span>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', borderRadius: 13, background: 'var(--cream)', border: '1px solid var(--border)' }}>
					<div>
						<p className="serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary-700)', lineHeight: 1, margin: 0 }}>{recipe.calories}</p>
						<p style={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-lt)', marginTop: 2 }}>
							{kcalLabel(tCard)}
						</p>
					</div>

					<div style={{ width: 1, height: 26, background: 'var(--border)' }} />

					{[
						['P', recipe.protein, '#3b82f6'],
						['C', recipe.carbs, '#f59e0b'],
						['F', recipe.fat, '#ec4899']
					].map(([l, v, c]) => (
						<div key={l} style={{ textAlign: 'center' }}>
							<p style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1, margin: 0 }}>{v}g</p>
							<div style={{ width: 18, height: 3, borderRadius: 99, background: c, margin: '4px auto 2px' }} />
							<p style={{ fontSize: '0.56rem', fontWeight: 700, color: 'var(--ink-lt)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</p>
						</div>
					))}
				</div>
			</div>

			<AnimatePresence>
				{hov && (
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 6 }}
						transition={{ duration: 0.16 }}
						style={{ padding: '0 17px 15px' }}
					>
						<div style={{ width: '100%', padding: '9px', borderRadius: 13, textAlign: 'center', background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', color: '#fff', fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(201,123,46,0.38)' }}>
							{tCard('viewFull')}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.article>
	);
}

function kcalLabel(tCard) {
	return tCard('kcal');
}

/* ══════════════════════════════════════════
	 FEATURED BANNER
══════════════════════════════════════════ */
function FeaturedCard({ recipe, onOpen, tFeatured, tCard }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
			onClick={() => onOpen(recipe)}
			whileHover={{ y: -3, boxShadow: '0 16px 48px rgba(201,123,46,0.18)' }}
			style={{ marginBottom: 26, borderRadius: 22, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--paper)', border: '1.5px solid var(--border)', cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,123,46,0.1)', transition: 'box-shadow 0.3s' }}
		>
			<div style={{ position: 'relative', minHeight: 250, background: 'linear-gradient(135deg,var(--color-primary-50),var(--color-primary-100))' }}>
				{recipe.imageUrl ? (
					<img src={recipe.imageUrl} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
				) : (
					<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<BookMarked style={{ width: 72, height: 72, opacity: 0.16, color: 'var(--color-primary-400)' }} />
					</div>
				)}
				<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,transparent 55%,var(--paper))' }} />
			</div>

			<div style={{ padding: '28px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 13 }}>
				<div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 99, background: 'var(--color-primary-50)', width: 'fit-content' }}>
					<span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-primary-600)' }}>
						{tFeatured('badge')}
					</span>
				</div>

				<div>
					<h2 className="serif" style={{ fontSize: 'clamp(1.3rem,2.5vw,1.9rem)', fontWeight: 900, lineHeight: 1.15, color: 'var(--ink)', margin: 0 }}>
						{recipe.title}
					</h2>
				</div>

				<div style={{ display: 'flex', gap: 14 }}>
					{[
						['⚡', `${recipe.calories} ${tCard('kcal')}`],
						['🥚', `${recipe.protein}g ${tCard('protein')}`],
						['🍞', `${recipe.carbs}g ${tCard('carbs')}`]
					].map(([icon, val]) => (
						<span key={val} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-mid)' }}>{icon} {val}</span>
					))}
				</div>

				<motion.div
					whileHover={{ scale: 1.03 }}
					style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 12, background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', color: '#fff', fontSize: '0.82rem', fontWeight: 700, width: 'fit-content', boxShadow: '0 4px 14px rgba(201,123,46,0.38)' }}
				>
					{tFeatured('cta')}
				</motion.div>
			</div>
		</motion.div>
	);
}

/* ══════════════════════════════════════════
	 RECIPE MODAL
══════════════════════════════════════════ */
function RecipeModal({ recipe, onClose, tModal, tCard }) {
	useEffect(() => {
		if (recipe) document.body.style.overflow = 'hidden';
		else document.body.style.overflow = '';
		return () => { document.body.style.overflow = ''; };
	}, [recipe]);

	return (
		<AnimatePresence>
			{recipe && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(26,18,8,0.75)', backdropFilter: 'blur(8px)' }}
					/>

					<motion.div
						initial={{ opacity: 0, scale: 0.94, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 16 }}
						transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
						style={{ position: 'fixed', inset: '4% 5%', zIndex: 51, borderRadius: 26, background: 'var(--paper)', overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', maxWidth: 780, margin: 'auto' }}
					>
						<div style={{ position: 'relative', height: 210, background: 'linear-gradient(135deg,var(--color-primary-50),var(--color-primary-100))', flexShrink: 0 }}>
							{recipe.imageUrl ? (
								<img src={recipe.imageUrl} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
							) : (
								<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
									<BookMarked style={{ width: 84, height: 84, opacity: 0.18, color: 'var(--color-primary-400)' }} />
								</div>
							)}
							<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(26,18,8,0.72) 0%,transparent 55%)' }} />

							<div style={{ position: 'absolute', bottom: 18, left: 26, right: 54 }}>
								<p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-primary-300)', marginBottom: 5 }}>
									{recipe.category}
								</p>
								<h2 className="serif" style={{ fontSize: 'clamp(1.3rem,3.5vw,1.9rem)', fontWeight: 900, color: '#fffdf9', lineHeight: 1.1, margin: 0 }}>
									{recipe.title}
								</h2>
							</div>

							<button
								onClick={onClose}
								style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
							>
								<X style={{ width: 15, height: 15 }} />
							</button>
						</div>

						<div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px 30px', scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-200) transparent' }}>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
								<div style={{ padding: '5px 11px', borderRadius: 99, background: 'var(--color-primary-50)', fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
									{tCard('satiety')}: {recipe.satiety}
								</div>
							</div>

							<div style={{ marginBottom: 20, padding: '15px 18px', borderRadius: 17, background: 'var(--cream)', border: '1.5px solid var(--border)' }}>
								<p style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-primary-600)', marginBottom: 10 }}>
									{tModal('nutritionTitle')}
								</p>

								<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
									<div>
										<p className="serif" style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: 'var(--ink)', margin: 0 }}>{recipe.calories}</p>
										<p style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-lt)' }}>{tCard('calories')}</p>
									</div>

									<div style={{ display: 'flex', gap: 18 }}>
										{[
											[tCard('protein'), recipe.protein, '#3b82f6'],
											[tCard('carbs'), recipe.carbs, '#f59e0b'],
											[tCard('fat'), recipe.fat, '#ec4899']
										].map(([l, v, c]) => (
											<div key={l} style={{ textAlign: 'center' }}>
												<p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1, margin: 0 }}>{v}g</p>
												<div style={{ width: 30, height: 4, borderRadius: 99, background: c, margin: '5px auto 3px' }} />
												<p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-lt)' }}>{l}</p>
											</div>
										))}
									</div>
								</div>
							</div>

							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
								<div>
									<MSection>{tModal('ingredients')}</MSection>
									<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
										{recipe.ingredients?.map((ing, i) => (
											<li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.81rem', fontWeight: 500, color: 'var(--ink-mid)', lineHeight: 1.4 }}>
												<span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary-400)', flexShrink: 0, marginTop: 6 }} />
												{ing}
											</li>
										))}
									</ul>

									{recipe.creamIngredients?.length > 0 && (
										<>
											<p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-lt)', margin: '12px 0 8px' }}>
												{tModal('creamIngredients')}
											</p>
											<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
												{recipe.creamIngredients.map((ing, i) => (
													<li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', fontWeight: 500, color: 'var(--ink-lt)' }}>
														<span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border)', flexShrink: 0, marginTop: 6 }} />
														{ing}
													</li>
												))}
											</ul>
										</>
									)}

									{recipe.sauceIngredients?.length > 0 && (
										<>
											<p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-lt)', margin: '12px 0 8px' }}>
												{tModal('sauceIngredients')}
											</p>
											<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
												{recipe.sauceIngredients.map((ing, i) => (
													<li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', fontWeight: 500, color: 'var(--ink-lt)' }}>
														<span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border)', flexShrink: 0, marginTop: 6 }} />
														{ing}
													</li>
												))}
											</ul>
										</>
									)}
								</div>

								<div>
									<MSection>{tModal('directions')}</MSection>
									<ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
										{recipe.directions?.map((step, i) => (
											<li key={i} style={{ display: 'flex', gap: 9 }}>
												<span className="serif" style={{ width: 21, height: 21, borderRadius: '50%', background: 'var(--color-primary-500)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
													{i + 1}
												</span>
												<p style={{ fontSize: '0.8rem', lineHeight: 1.55, color: 'var(--ink-mid)', fontWeight: 500, margin: 0 }}>{step}</p>
											</li>
										))}
									</ol>
								</div>
							</div>

							{recipe.tips && (
								<div style={{ marginTop: 16, display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 13, background: '#fffbeb', border: '1px solid #fde68a' }}>
									<Lightbulb style={{ width: 15, height: 15, flexShrink: 0, color: '#d97706', marginTop: 2 }} />
									<p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#78350f', lineHeight: 1.55, margin: 0 }}>
										<strong>{tModal('chefTip')}:</strong> {recipe.tips}
									</p>
								</div>
							)}

							{recipe.videoUrl && (
								<a
									href={recipe.videoUrl}
									target="_blank"
									rel="noreferrer"
									style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', color: 'var(--color-primary-700)', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}
								>
									<PlayCircle style={{ width: 16, height: 16 }} />
									{tModal('watchVideo')}
								</a>
							)}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

function MSection({ children }) {
	return (
		<p style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-primary-600)', marginBottom: 10, paddingBottom: 7, borderBottom: '1.5px solid var(--border)' }}>
			{children}
		</p>
	);
}

/* ══════════════════════════════════════════
	 PAGINATION
══════════════════════════════════════════ */
function Pagination({ page, total, perPage, onChange }) {
	const pages = Math.ceil(total / perPage);
	if (pages <= 1) return null;

	return (
		<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, paddingTop: 36 }}>
			<button disabled={page === 1} onClick={() => onChange(page - 1)} style={{ width: 36, height: 36, borderRadius: 11, border: '1.5px solid var(--border)', background: 'var(--paper)', fontSize: '1rem', fontWeight: 700, color: page === 1 ? 'var(--border)' : 'var(--ink-mid)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>←</button>
			{Array.from({ length: pages }, (_, i) => i + 1).map(p => (
				<button key={p} onClick={() => onChange(p)} style={{ width: 36, height: 36, borderRadius: 11, border: '1.5px solid', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', borderColor: p === page ? 'var(--color-primary-500)' : 'var(--border)', background: p === page ? 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' : 'var(--paper)', color: p === page ? '#fff' : 'var(--ink-mid)', boxShadow: p === page ? '0 4px 12px rgba(201,123,46,0.35)' : 'none' }}>{p}</button>
			))}
			<button disabled={page === pages} onClick={() => onChange(page + 1)} style={{ width: 36, height: 36, borderRadius: 11, border: '1.5px solid var(--border)', background: 'var(--paper)', fontSize: '1rem', fontWeight: 700, color: page === pages ? 'var(--border)' : 'var(--ink-mid)', cursor: page === pages ? 'not-allowed' : 'pointer' }}>→</button>
		</div>
	);
}

/* ══════════════════════════════════════════
	 MAIN PAGE
══════════════════════════════════════════ */
export default function RecipeLibrary() {
	const t = useTranslations('recipeLibrary');
	const tCats = useTranslations('recipeLibrary.categories');
	const tFilters = useTranslations('recipeLibrary.filters');
	const tCard = useTranslations('recipeLibrary.card');
	const tModal = useTranslations('recipeLibrary.modal');
	const tFeatured = useTranslations('recipeLibrary.featured');
	const tSearch = useTranslations('recipeLibrary.search');
	const tEmpty = useTranslations('recipeLibrary.empty');

	const [recipes, setRecipes] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('all');
	const [search, setSearch] = useState('');
	const [filterValues, setFilterValues] = useState({
		category: '',
		satiety_index: '',
	});
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState(null);

	const FILTER_CONFIG = [
		{
			key: 'category',
			label: tFilters('category'),
			type: 'toggle',
			options: [
				{ value: 'breakfast', label: tCats('breakfast') },
				{ value: 'lunch', label: tCats('lunch') },
				{ value: 'dinner', label: tCats('dinner') },
				{ value: 'snack', label: tCats('snack') },
			]
		},
		{
			key: 'satiety_index',
			label: tFilters('satiety'),
			type: 'toggle',
			options: [
				{ value: 'low', label: tFilters('satietyLow') },
				{ value: 'medium', label: tFilters('satietyMedium') },
				{ value: 'high', label: tFilters('satietyHigh') },
			]
		}
	];

	const TABS = [
		{ id: 'all', label: t('tabs.all'), icon: BookOpen },
		{ id: 'breakfast', label: tCats('breakfast'), icon: BookOpen },
		{ id: 'lunch', label: tCats('lunch'), icon: BookOpen },
		{ id: 'dinner', label: tCats('dinner'), icon: BookOpen },
		{ id: 'snack', label: tCats('snack'), icon: BookOpen },
	];

	const fetchRecipes = useCallback(async () => {
		try {
			setLoading(true);

			const params = {
				page,
				limit: PER_PAGE,
			};

			if (search.trim()) params.search = search.trim();

			const mealType = activeTab !== 'all' ? activeTab : filterValues.category;
			if (mealType) params.meal_type = mealType;

			if (filterValues.satiety_index) params.satiety_index = filterValues.satiety_index;

			const res = await axios.get(`${API_BASE}/recipes`, { params });
			const items = res?.data?.items || [];

			setRecipes(items.map(mapRecipeFromApi));
			setTotal(res?.data?.total || 0);
		} catch (error) {
			console.error('Failed to fetch recipes:', error);
			setRecipes([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [page, search, activeTab, filterValues.category, filterValues.satiety_index]);

	useEffect(() => {
		fetchRecipes();
	}, [fetchRecipes]);

	const showFeatured = page === 1 && !search && activeTab === 'all' && !filterValues.category && !filterValues.satiety_index && recipes.length > 0;
	const featuredRecipe = showFeatured ? recipes[0] : null;
	const gridRecipes = showFeatured ? recipes.slice(1) : recipes;

	const stats = useMemo(() => [
		{ label: t('stats.totalRecipes'), value: total, icon: BookOpen },
		{ label: t('stats.shownNow'), value: recipes.length, icon: Eye },
		{
			label: t('stats.avgCalories'),
			value: recipes.length ? Math.round(recipes.reduce((s, r) => s + Number(r.calories || 0), 0) / recipes.length) : 0,
			icon: Flame,
			sub: t('stats.perRecipe')
		},
	], [recipes, total, t]);

	const tabsWithCount = TABS.map(tab => ({ ...tab }));

	const handleFilter = (k, v) => {
		setFilterValues(fv => ({ ...fv, [k]: v }));
		setPage(1);
	};

	const handleReset = () => setFilterValues({ category: '', satiety_index: '' });

	const activeFC = Object.values(filterValues).filter(v => v !== '' && v !== null && v !== undefined).length;

	return (
		<>
			<div>
				<div>
					<PageHeader
						title={t('page.title')}
						desc={t('page.desc')}
						icon={BookMarked}
						stats={stats}
						tabs={tabsWithCount}
						activeTab={activeTab}
						onTabChange={tab => {
							setActiveTab(tab);
							setPage(1);
						}}
						filters={FILTER_CONFIG}
						filterValues={filterValues}
						onFilterChange={handleFilter}
						onFilterReset={handleReset}
						tFilters={tFilters}
					/>

					<div style={{ background: 'var(--paper)', borderRadius: '0 0 24px 24px', border: '1.5px solid var(--border)', borderTop: 'none', padding: '24px 28px 36px', boxShadow: '0 12px 40px rgba(201,123,46,0.08)' }}>
						<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26 }}>
							<div style={{ position: 'relative', maxWidth: 360, flex: 1 }}>
								<Search style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--ink-lt)', pointerEvents: 'none' }} />
								<input
									value={search}
									onChange={e => {
										setSearch(e.target.value);
										setPage(1);
									}}
									placeholder={tSearch('placeholder')}
									style={{ width: '100%', height: 42, paddingLeft: 40, paddingRight: search ? 36 : 14, borderRadius: 13, border: '1.5px solid var(--border)', background: 'var(--cream)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
								/>
								{search && (
									<button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-lt)', padding: 4 }}>
										<X style={{ width: 13, height: 13 }} />
									</button>
								)}
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
								{activeFC > 0 && (
									<button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 11, border: '1px solid #fecaca', background: '#fff1f2', color: '#dc2626', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
										<X style={{ width: 12, height: 12 }} /> {tFilters('clearInline')} ({activeFC})
									</button>
								)}

								<span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-lt)', whiteSpace: 'nowrap' }}>
									{total} {total === 1 ? tSearch('result') : tSearch('results')}
								</span>
							</div>
						</div>

						{loading ? (
							<motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '64px 24px' }}>
								<p className="serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink-mid)', marginBottom: 6 }}>{t('loading')}</p>
							</motion.div>
						) : (
							<>
								{featuredRecipe && <FeaturedCard recipe={featuredRecipe} onOpen={setSelected} tFeatured={tFeatured} tCard={tCard} />}

								<AnimatePresence mode="wait">
									{gridRecipes.length === 0 ? (
										<motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '64px 24px' }}>
											<BookMarked style={{ width: 64, height: 64, opacity: 0.12, color: 'var(--ink)', display: 'block', margin: '0 auto 14px' }} />
											<p className="serif" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ink-mid)', marginBottom: 6 }}>{tEmpty('title')}</p>
											<p style={{ color: 'var(--ink-lt)', fontSize: '0.875rem' }}>{tEmpty('desc')}</p>
										</motion.div>
									) : (
										<motion.div key={activeTab + search + JSON.stringify(filterValues) + page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(285px,1fr))', gap: 20 }}>
											{gridRecipes.map((recipe, i) => (
												<RecipeCard key={recipe.id} recipe={recipe} idx={i} onOpen={setSelected} tCard={tCard} tCategories={tCats} />
											))}
										</motion.div>
									)}
								</AnimatePresence>

								<Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
							</>
						)}
					</div>
				</div>

				<div style={{ textAlign: 'center', padding: '36px 24px 48px' }}>
					<p className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--ink-lt)', opacity: 0.65 }}>
						{t('footerQuote')}
					</p>
				</div>
			</div>

			<RecipeModal recipe={selected} onClose={() => setSelected(null)} tModal={tModal} tCard={tCard} />
		</>
	);
}