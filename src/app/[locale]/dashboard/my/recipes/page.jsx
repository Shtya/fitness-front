'use client';

import axios from 'axios';
import { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import {
	Flame, Beef, Wheat, Droplets, BookMarked, BookOpen,
	Eye, Search, SlidersHorizontal, RefreshCw,
	X, ChevronDown, Lightbulb, PlayCircle,
	Check, ChevronLeft, ChevronRight, TrendingUp,
	Utensils, Layers, Star, ArrowUpDown, Filter,
	Sparkles, Zap, Heart, Award, AlertTriangle,
	Sun, Moon, Apple, Cookie, Salad, Soup, Coffee, ChefHat, Dumbbell,
} from 'lucide-react';
import { TabsPill } from '../workouts/page';
import api from '@/utils/axios';

const API_BASE = `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1`;
const PER_PAGE = 9;

// ─── Utils ────────────────────────────────────────────────────────────────────
const cn = (...c) => c.filter(Boolean).join(' ');
const fmt = v => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(v || 0));

function normalizeImage(url) {
	if (!url) return '';
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return `${process.env.NEXT_PUBLIC_BASE_URL}${url}`;
}

function mapRecipe(item) {
	return {
		id: item.id,
		title: item.title || '',
		satiety: String(item.satiety_index || 'MEDIUM').toUpperCase(),
		category: item.meal_type || '',
		calories: Number(item?.nutrition?.calories ?? 0),
		protein: Number(item?.nutrition?.protein_g ?? 0),
		carbs: Number(item?.nutrition?.carbs_g ?? 0),
		fat: Number(item?.nutrition?.fat_g ?? 0),
		ingredients: item.ingredients || [],
		creamIngredients: item.cream_ingredients || [],
		sauceIngredients: item.sauce_ingredients || [],
		directions: item.directions || [],
		tips: Array.isArray(item.tips) ? item.tips : [],
		videoUrl: item.video_url || '',
		imageUrl: normalizeImage(item.image_url),
		createdAt: item.created_at || '',
	};
}

// ─── Static lookups ───────────────────────────────────────────────────────────
const SAT = {
	LOW: { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', pill: 'bg-emerald-500' },
	MEDIUM: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', pill: 'bg-amber-500' },
	HIGH: { dot: 'bg-rose-400', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', pill: 'bg-rose-500' },
};
const satMeta = v => SAT[v?.toUpperCase()] ?? SAT.MEDIUM;

const MEAL_EMOJI = {
	savory_breakfast: '🍳', breakfast: '🌅', lunch: '☀️',
	dinner: '🌙', snack: '🌿', sweet: '🍰',
	salad: '🥗', soup: '🍲', drink: '🥤',
	dessert: '🍮', default: '🏷️',
};
const mealEmoji = v => MEAL_EMOJI[v] ?? MEAL_EMOJI.default;
const MEAL_ICONS = {
	savory_breakfast: Utensils, breakfast: Sun, lunch: Sun, dinner: Moon,
	snack: Apple, sweet: Cookie, salad: Salad, soup: Soup, drink: Coffee, dessert: Cookie, default: Utensils,
};
function MealGlyph({ type, size = 9 }) {
	const Icon = MEAL_ICONS[type] || MEAL_ICONS.default;
	return <Icon size={size} strokeWidth={2} />;
}
function FavBtn({ on, onClick }) {
	return (
		<button
			type="button"
			onClick={e => { e.stopPropagation(); onClick(); }}
			className={cn(
				'grid h-[30px] w-[30px] place-items-center rounded-2xl border',
				on ? 'border-rose-400/40 bg-rose-500/15 text-rose-500' : 'border-white/20 bg-black/40 text-white',
			)}
		>
			<Heart size={13} fill={on ? '#f43f5e' : 'transparent'} strokeWidth={on ? 2.5 : 2} />
		</button>
	);
}

// ─── Global styles ────────────────────────────────────────────────────────────
function GlobalStyles() {
	useEffect(() => {
		const id = 'rp-styles-v3';
		if (document.getElementById(id)) return;
		const el = document.createElement('style');
		el.id = id;
		el.textContent = `
			@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Sora:wght@300;400;500;600;700;800&display=swap');

			@keyframes rp-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
			.rp-shimmer{
				background:linear-gradient(90deg,var(--color-primary-50) 25%,var(--color-primary-100) 50%,var(--color-primary-50) 75%);
				background-size:200% 100%;
				animation:rp-shimmer 1.6s infinite;
			}
			.rp-no-scroll{scrollbar-width:none;-ms-overflow-style:none}
			.rp-no-scroll::-webkit-scrollbar{display:none}
			.rp-root ::-webkit-scrollbar{width:3px;height:3px}

			/* Tooltip fix - same pattern as MoneyPage */
			.rp-tooltip-wrap{position:relative;display:inline-flex;}
			.rp-tooltip{
				position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
				background:rgba(17,24,39,.92);color:white;font-size:10px;font-weight:600;
				padding:4px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;
				opacity:0;transition:opacity 0.15s;z-index:9999;
			}
			.rp-tooltip::after{
				content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);
				border:4px solid transparent;border-top-color:rgba(17,24,39,.92);
			}
			.rp-tooltip-wrap:hover:not(.rp-tooltip-active) .rp-tooltip{opacity:1;}
			.rp-tooltip-wrap.rp-tooltip-active .rp-tooltip{opacity:0!important;}

			/* Card image hover */
			.rp-card-img{transition:transform 0.5s cubic-bezier(0.16,1,0.3,1);}
			.rp-card:hover .rp-card-img{transform:scale(1.07);}

			/* Range input */
			input[type=range].rp-range::-webkit-slider-thumb{
				-webkit-appearance:none;appearance:none;
				width:16px;height:16px;border-radius:50%;
				background:var(--color-primary-500);cursor:pointer;
				box-shadow:0 2px 6px rgba(99,102,241,.4);border:2px solid white;
			}

			/* Macro bar animation */
			@keyframes rp-bar-in{from{width:0}to{width:var(--w)}}
			.rp-bar{animation:rp-bar-in 0.7s cubic-bezier(0.16,1,0.3,1) forwards;}

			/* Tab active underline */
			@keyframes rp-tab-in{from{width:0;opacity:0}to{width:100%;opacity:1}}
			.rp-tab-line{animation:rp-tab-in 0.25s ease forwards;}
		`;
		document.head.appendChild(el);
	}, []);
	return null;
}

// ─── Stat Pill (header) ───────────────────────────────────────────────────────
function StatPill({ label, value, icon: Icon, delay = 0, sub }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
			transition={{ delay, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
			className="relative overflow-hidden rounded-2xl p-3 sm:p-4"
			style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
		>
			<div className="flex items-start justify-between gap-1 mb-1.5 sm:mb-2">
				<p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.12em] text-white/55 md: leading-tight">{label}</p>
				<Icon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white/35 shrink-0" />
			</div>
			<p className="text-xl sm:text-3xl font-black text-white md: leading-none tabular-nums">{value}</p>
			{sub && <p className="text-[7px] text-white/40 font-semibold mt-0.5">{sub}</p>}
		</motion.div>
	);
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, color = 'default', icon: Icon, small }) {
	const s = {
		default: 'bg-white/10 text-white/70 border-white/15',
		primary: 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] border-[var(--color-primary-200)]',
		emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
		amber: 'bg-amber-50 text-amber-700 border-amber-200',
		rose: 'bg-rose-50 text-rose-700 border-rose-200',
		slate: 'bg-slate-50 text-slate-600 border-slate-200',
	};
	return (
		<span className={cn(
			'inline-flex text-nowrap items-center gap-1 rounded-full font-semibold border',
			small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]',
			s[color]
		)}>
			{Icon && <Icon size={small ? 8 : 9} />}{children}
		</span>
	);
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
	return (
		<div className="overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[5px_5px_8px_rgba(100,116,139,0.28)]">
			<div className="h-[3px] bg-gradient-to-r from-(--color-gradient-from) via-[#8b5cf6] to-(--color-gradient-to)" />
			<div className="rp-shimmer" style={{ height: 112 }} />
			<div className="space-y-2 p-3">
				<div className="h-3 w-3/4 rounded-lg rp-shimmer" />
				<div className="h-9 rounded-2xl rp-shimmer" />
			</div>
		</div>
	);
}

// ─── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({ protein, carbs, fat, calories = 0, t, compact = false }) {
	const items = [
		{ key: 'cal', value: Number(calories) || 0, unit: '', label: t ? t('kcal') : 'kcal', color: '#f97316', Icon: Flame },
		{ key: 'p', value: Number(protein) || 0, unit: 'g', label: t ? t('card.protein') : 'P', color: '#3b82f6', Icon: Dumbbell },
		{ key: 'c', value: Number(carbs) || 0, unit: 'g', label: t ? t('card.carbs') : 'C', color: '#f59e0b', Icon: Zap },
		{ key: 'f', value: Number(fat) || 0, unit: 'g', label: t ? t('card.fat') : 'F', color: '#ec4899', Icon: Droplets },
	];
	const gramMax = Math.max(Number(protein) || 0, Number(carbs) || 0, Number(fat) || 0, 1);
	return (
		<div className={cn('flex', compact ? 'gap-1' : 'gap-1.5')}>
			{items.map(item => {
				const scaleMax = item.key === 'cal' ? 600 : gramMax;
				const pct = Math.max(6, Math.min(100, Math.round((item.value / scaleMax) * 100)));
				const Icon = item.Icon;
				return (
					<div key={item.key} className="min-w-0 flex-1">
						<div className={cn('text-center font-black leading-none', compact ? 'text-[10px]' : 'text-[11px]')} style={{ color: item.color }}>
							{item.value}{item.unit}
						</div>
						<div className={cn('mt-1 overflow-hidden rounded-full', compact ? 'h-[5px]' : 'h-1.5')} style={{ background: `${item.color}1A` }}>
							<div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
						</div>
						<div className="mt-1 flex items-center justify-center gap-0.5">
							<Icon size={compact ? 8 : 9} style={{ color: item.color }} strokeWidth={2.4} />
							<span className={cn('truncate font-bold uppercase text-slate-400', compact ? 'text-[7px]' : 'text-[8px]')}>{item.label}</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────
const RecipeCard = memo(function RecipeCard({ recipe, onOpen, t, tMt, favorite, onToggleFav }) {
	const sat = satMeta(recipe.satiety);
	let catLabel = recipe.category;
	try { catLabel = tMt(recipe.category); } catch { /* keep raw */ }

	return (
		<button
			type="button"
			onClick={() => onOpen(recipe)}
			className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] text-start shadow-[5px_5px_8px_rgba(100,116,139,0.38)]"
		>
			<div className="h-[3px] shrink-0 bg-gradient-to-r from-(--color-gradient-from) via-[#8b5cf6] to-(--color-gradient-to)" />
			<div className="relative h-28 overflow-hidden bg-slate-200">
				{recipe.imageUrl
					? <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
					: <div className="absolute inset-0 grid place-items-center"><BookOpen size={32} className="text-slate-300" strokeWidth={1.2} /></div>}
				<div className="absolute inset-0 bg-black/35" />
				<span className="absolute bottom-2 start-2 inline-flex max-w-[70%] items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[8px] font-bold text-white">
					<MealGlyph type={recipe.category} />
					<span className="truncate">{catLabel}</span>
				</span>
				<span className={cn('absolute top-2 end-2 inline-flex max-w-[58%] items-center gap-1 truncate rounded-full border px-1.5 py-0.5 text-[7px] font-bold whitespace-nowrap', sat.bg, sat.text, sat.border)}>
					<span className={cn('h-[5px] w-[5px] rounded-full', sat.dot)} />
					{t(`satiety.${recipe.satiety.toLowerCase()}`)}
				</span>
				{onToggleFav ? (
					<span className="absolute top-2 start-2">
						<FavBtn on={favorite} onClick={() => onToggleFav(recipe.id)} />
					</span>
				) : null}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-3">
				<h3 className="line-clamp-2 text-[11px] font-black leading-[15px] text-slate-800">{recipe.title}</h3>
				<div className="rounded-2xl border border-white/80 bg-[#eef2f9] p-2 shadow-[3px_3px_6px_rgba(100,116,139,0.22)]">
					<MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} calories={recipe.calories} t={t} compact />
				</div>
			</div>
		</button>
	);
});

// ─── Featured Banner ──────────────────────────────────────────────────────────
const FeaturedBanner = memo(function FeaturedBanner({ recipe, onOpen, t, favorite, onToggleFav }) {
	const sat = satMeta(recipe.satiety);
	return (
		<button
			type="button"
			onClick={() => onOpen(recipe)}
			className="mb-4 w-full overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] text-start shadow-[5px_6px_10px_rgba(100,116,139,0.4)]"
		>
			<div className="h-[3px] bg-gradient-to-r from-(--color-gradient-from) via-[#8b5cf6] to-(--color-gradient-to)" />
			<div className="relative h-44 overflow-hidden bg-slate-100">
				{recipe.imageUrl
					? <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
					: <div className="absolute inset-0 grid place-items-center"><BookOpen size={48} className="text-slate-300" strokeWidth={1.2} /></div>}
				<div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
				<div className="absolute start-3.5 top-3 flex flex-wrap items-center gap-1.5">
					<span className="inline-flex items-center gap-1 rounded-full border border-(--color-primary-500)/20 bg-white/90 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-(--color-primary-700)">
						<Star size={9} className="fill-(--color-primary-500) text-(--color-primary-500)" />
						{t('featured')}
					</span>
					<span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-1 text-[7px] font-bold', sat.bg, sat.text, sat.border)}>
						<span className={cn('h-[5px] w-[5px] rounded-full', sat.dot)} />
						{t(`satiety.${recipe.satiety.toLowerCase()}`)}
					</span>
				</div>
				{onToggleFav ? (
					<span className="absolute end-3 top-2.5">
						<FavBtn on={favorite} onClick={() => onToggleFav(recipe.id)} />
					</span>
				) : null}
				<h2 className="absolute inset-x-3.5 bottom-3 line-clamp-2 text-[17px] font-black leading-snug text-white">{recipe.title}</h2>
			</div>
			<div className="flex flex-col gap-3 p-4">
				<MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} calories={recipe.calories} t={t} />
				<span className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-(--color-gradient-from) to-(--color-gradient-to) py-2.5 text-xs font-bold text-white">
					<ChefHat size={13} strokeWidth={2.5} />
					{t('card.viewFull')}
					<ChevronRight size={13} className="text-white/70 rtl:rotate-180" />
				</span>
			</div>
		</button>
	);
});

// ─── Recipe Detail Modal ──────────────────────────────────────────────────────
function RecipeModal({ recipe, onClose, t, tMt }) {
	useEffect(() => {
		if (recipe) document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = ''; };
	}, [recipe]);

	if (!recipe) return null;

	const sat = satMeta(recipe.satiety);
	const total = (recipe.protein + recipe.carbs + recipe.fat) || 1;
	let catLabel = recipe.category;
	try { catLabel = mealEmoji(recipe.category) + ' ' + tMt(recipe.category); } catch { catLabel = mealEmoji(recipe.category) + ' ' + recipe.category; }

	return (
		<AnimatePresence>
			{recipe && (
				<>
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md"
						onClick={onClose}
					/>
					<motion.div
						initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 320, damping: 38 }}
						className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex h-[91dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-[#f8fafc]"
						style={{ boxShadow: '0 -8px 24px rgba(100,116,139,0.35)' }}
					>
						{/* drag pill */}
						<div className="absolute top-2 inset-x-0 z-10 flex justify-center">
							<div className="h-1 w-10 rounded-full bg-[var(--color-primary-200)]" />
						</div>

						{/* hero */}
						<div className="relative h-fit shrink-0 overflow-hidden bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-50)]">
							{recipe.imageUrl
								? <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-contain" />
								: <div className="absolute inset-0 flex items-center justify-center">
									<BookMarked className="h-14 w-14 opacity-10 text-[var(--color-primary-400)]" />
								</div>
							}
							<div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-transparent" />

							<div className="absolute top-4 start-4 flex items-center gap-2 flex-wrap">
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/40 text-white backdrop-blur-sm">{catLabel}</span>
								<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-sm', sat.bg, sat.text, sat.border)}>
									<span className={cn('w-1.5 h-1.5 rounded-full', sat.dot)} />
									{t(`satiety.${recipe.satiety.toLowerCase()}`)}
								</span>
							</div>

							<button onClick={onClose}
								className="absolute top-3 end-3 w-8 h-8 rounded-xl flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors border-none cursor-pointer">
								<X className="h-3.5 w-3.5" />
							</button>

							<div className="absolute bottom-3 start-4 end-14">
								<h2 className="rp-serif text-lg sm:text-2xl font-black text-white md: leading-tight">{recipe.title}</h2>
							</div>
						</div>

						{/* body */}
						<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-200) transparent' }}>

							{/* Nutrition card */}
							<div className="rounded-2xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-4">
								<p className="text-[8px] font-black uppercase tracking-[0.16em] mb-3 text-[var(--color-primary-500)]">{t('card.nutrition')}</p>
								<div className="flex items-end justify-between flex-wrap gap-3">
									<div>
										<p className="rp-serif text-4xl sm:text-5xl font-black md: leading-none tabular-nums text-[var(--color-primary-700)]">{recipe.calories}</p>
										<p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-1">{t('card.calories')}</p>
									</div>
									<div className="flex gap-5 sm:gap-6">
										{[
											[t('card.protein'), recipe.protein, '#3b82f6'],
											[t('card.carbs'), recipe.carbs, '#f59e0b'],
											[t('card.fat'), recipe.fat, '#ec4899'],
										].map(([l, v, c]) => (
											<div key={String(l)} className="text-center">
												<p className="text-lg sm:text-xl font-black tabular-nums text-slate-800">{v}g</p>
												<div className="w-6 h-1.5 rounded-full mx-auto my-1.5" style={{ background: String(c) }} />
												<p className="text-[8px] font-bold text-slate-400 uppercase">{l}</p>
											</div>
										))}
									</div>
								</div>
								<div className="mt-3.5">
									<MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} calories={recipe.calories} t={t} />
								</div>
							</div>

							{/* Ingredients + Steps */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-4">
									{recipe.ingredients?.length > 0 && (
										<div>
											<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-2.5 text-[var(--color-primary-600)]">{t('card.ingredients')}</p>
											<ul className="space-y-2">
												{recipe.ingredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-xs text-slate-600">
														<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary-400)]" />
														{ing}
													</li>
												))}
											</ul>
										</div>
									)}
									{recipe.creamIngredients?.length > 0 && (
										<div>
											<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-2 text-slate-400">{t('card.creamIngredients')}</p>
											<ul className="space-y-1.5">
												{recipe.creamIngredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-[11px] text-slate-500">
														<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />{ing}
													</li>
												))}
											</ul>
										</div>
									)}
									{recipe.sauceIngredients?.length > 0 && (
										<div>
											<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-2 text-slate-400">{t('card.sauceIngredients')}</p>
											<ul className="space-y-1.5">
												{recipe.sauceIngredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-[11px] text-slate-500">
														<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />{ing}
													</li>
												))}
											</ul>
										</div>
									)}
								</div>

								{recipe.directions?.length > 0 && (
									<div>
										<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-2.5 text-[var(--color-primary-600)]">{t('card.directions')}</p>
										<ol className="space-y-2.5">
											{recipe.directions.map((step, i) => (
												<li key={i} className="flex gap-2.5 text-xs text-slate-600">
													<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[8px] font-black text-white mt-0.5 bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">{i + 1}</span>
													{step}
												</li>
											))}
										</ol>
									</div>
								)}
							</div>

							{/* Tips */}
							{recipe.tips?.length > 0 && (
								<div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
									<Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
									<ul className="space-y-1.5">
										{recipe.tips.map((tip, i) => (
											<li key={i} className="text-[11px] sm:text-xs text-amber-800 font-medium md: leading-relaxed">{tip}</li>
										))}
									</ul>
								</div>
							)}

							{/* Video */}
							{recipe.videoUrl && (
								<a href={recipe.videoUrl} target="_blank" rel="noreferrer"
									className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-4 text-sm font-bold transition-all hover:bg-[var(--color-primary-100)] active:scale-[0.98] text-[var(--color-primary-700)] no-underline">
									<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center text-white flex-shrink-0">
										<PlayCircle className="h-4 w-4" />
									</div>
									{t('card.watchVideo')}
								</a>
							)}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

// ─── Nutrition Range Slider ───────────────────────────────────────────────────
function RangeFilter({ label, min, max, value, onChange, color = '#6366f1' }) {
	return (
		<div>
			<div className="flex items-center justify-between mb-1.5">
				<span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary-400)]">{label}</span>
				<span className="text-[9px] font-bold text-slate-500">≤ {value}</span>
			</div>
			<input dir='ltr'
				type="range" className="rp-range w-full h-2 rounded-full appearance-none cursor-pointer"
				min={min} max={max} value={value}
				onChange={e => onChange(Number(e.target.value))}
				style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)` }}
			/>
			<div className="flex justify-between mt-1">
				<span className="text-[8px] text-slate-400">{min}</span>
				<span className="text-[8px] text-slate-400">{max}</span>
			</div>
		</div>
	);
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({
	open,
	activeTab,
	onTabChange,
	mealTypeTabs,
	satFilter,
	onSatChange,
	satietyOpts,
	nutritionRanges,
	caloriesMax,
	onCaloriesChange,
	sortBy,
	onSortChange,
	onReset,
	hasAny,
	t,
}) {
	if (!open) return null;

	const sortOpts = [
		{ v: 'created_at', l: t('sort.newest') },
		{ v: 'calories', l: t('sort.calories') },
		{ v: 'protein', l: t('sort.protein') },
		{ v: 'carbs', l: t('sort.carbs') },
		{ v: 'fat', l: t('sort.fat') },
		{ v: 'title', l: t('sort.title') },
	];

	return (
		<motion.div
			initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
			exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
			className="overflow-hidden mb-4"
		>
			<div className="space-y-4 rounded-3xl border border-white/85 bg-[#eef2f9] p-4 shadow-[4px_5px_8px_rgba(100,116,139,0.32)]">
				<div className="flex items-center justify-between">
					<span className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--color-primary-500)]">{t('filter.title')}</span>
					{hasAny && (
						<button onClick={onReset} className="flex items-center gap-1 text-[9px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer border-none bg-transparent">
							<RefreshCw className="h-2.5 w-2.5" /> {t('table.reset')}
						</button>
					)}
				</div>

				{/* Meal Type */}
				<div>
					<p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">
						{t('filter.mealType')}
					</p>
					<div className="flex gap-1.5 flex-wrap">

						{mealTypeTabs.map(opt => (
							<button key={opt.key} type="button" onClick={() => onTabChange(opt.key)}
								className={cn(
									'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold',
									activeTab === opt.key
										? 'border border-t-white/35 border-b-[rgba(15,48,120,0.3)] bg-(--color-primary-600) text-white shadow-[2px_3px_5px_color-mix(in_srgb,var(--color-primary-800)_35%,transparent)]'
										: 'border border-white/85 bg-[#eef2f9] text-slate-600 shadow-[3px_3px_6px_rgba(100,116,139,0.22)]',
								)}>
								{/* <span className={cn('w-2 h-2 rounded-full', opt.meta.dot)} /> */}
								{opt.label}
								{activeTab === opt.key && <Check className="h-2.5 w-2.5" />}
							</button>
						))}
					</div> 
				</div>

				{/* Satiety */}
				<div>
					<p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('satiety.label')}</p>
					<div className="flex gap-1.5 flex-wrap">
						{satietyOpts.map(opt => (
							<button key={opt.value} type="button" onClick={() => onSatChange(opt.value)}
								className={cn(
									'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold',
									satFilter === opt.value
										? 'border border-t-white/35 border-b-[rgba(15,48,120,0.3)] bg-(--color-primary-600) text-white shadow-[2px_3px_5px_color-mix(in_srgb,var(--color-primary-800)_35%,transparent)]'
										: 'border border-white/85 bg-[#eef2f9] text-slate-600 shadow-[3px_3px_6px_rgba(100,116,139,0.22)]',
								)}>
								<span className={cn('w-2 h-2 rounded-full', opt.meta.dot)} />
								{opt.label}
								{satFilter === opt.value && <Check className="h-2.5 w-2.5" />}
							</button>
						))}
					</div>
				</div>

				{/* Calories range */}
				{nutritionRanges?.calories && (
					<RangeFilter
						label={t('filter.maxCalories')}
						min={nutritionRanges.calories.min}
						max={nutritionRanges.calories.max}
						value={caloriesMax}
						onChange={onCaloriesChange}
						color="var(--color-primary-500)"
					/>
				)}

				{/* Sort */}
				<div>
					<p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('sort.label')}</p>
					<div className="flex gap-1.5 flex-wrap">
						{sortOpts.map(opt => (
							<button key={opt.v} type="button" onClick={() => onSortChange(opt.v)}
								className={cn(
									'cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-bold',
									sortBy === opt.v
										? 'border border-t-white/35 border-b-[rgba(15,48,120,0.3)] bg-(--color-primary-600) text-white shadow-[2px_3px_5px_color-mix(in_srgb,var(--color-primary-800)_35%,transparent)]'
										: 'border border-white/85 bg-[#eef2f9] text-slate-600 shadow-[3px_3px_6px_rgba(100,116,139,0.22)]',
								)}>
								{opt.l}
							</button>
						))}
					</div>
				</div>
			</div>
		</motion.div>
	);
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onReset, hasFilter, t }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
			className="flex flex-col items-center justify-center py-24 gap-5"
		>
			<div className="grid h-20 w-20 place-items-center rounded-full border border-white/85 bg-[#eef2f9] shadow-[5px_5px_8px_rgba(100,116,139,0.32)]">
				<BookOpen className="h-8 w-8 text-(--color-primary-300)" strokeWidth={1.3} />
			</div>
			<div className="text-center space-y-1.5">
				<p className="text-sm font-black text-slate-600">{t('table.emptyTitle')}</p>
				<p className="text-xs text-slate-400">{t('table.emptySubtitle')}</p>
			</div>
			{hasFilter && (
				<button onClick={onReset}
					className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] shadow-lg shadow-[var(--color-primary-200)] border-none cursor-pointer">
					<RefreshCw className="h-3.5 w-3.5" /> {t('table.reset')}
				</button>
			)}
		</motion.div>
	);
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPage }) {
	const pageButtons = useMemo(() => {
		if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
		const start = Math.max(1, Math.min(page - 3, totalPages - 6));
		return Array.from({ length: Math.min(7, totalPages) }, (_, i) => start + i);
	}, [page, totalPages]);

	return (
		<div className="flex flex-wrap items-center justify-center gap-1.5 py-4">
			<button type="button" disabled={page === 1} onClick={() => onPage(p => p - 1)}
				className="grid h-8 w-8 cursor-pointer place-items-center rounded-2xl border border-white/85 bg-[#eef2f9] text-slate-500 shadow-[3px_3px_6px_rgba(100,116,139,0.22)] disabled:cursor-not-allowed disabled:opacity-35">
				<ChevronLeft className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
			</button>
			{pageButtons.map(p => (
				<button key={p} type="button" onClick={() => onPage(p)}
					className={cn(
						'grid h-8 w-8 cursor-pointer place-items-center rounded-2xl text-[11px] font-black',
						p === page
							? 'border border-t-white/35 border-b-[rgba(15,48,120,0.3)] bg-(--color-primary-600) text-white shadow-[2px_3px_5px_color-mix(in_srgb,var(--color-primary-800)_40%,transparent)]'
							: 'border border-white/85 bg-[#eef2f9] text-slate-500 shadow-[3px_3px_6px_rgba(100,116,139,0.22)]',
					)}>
					{p}
				</button>
			))}
			<button type="button" disabled={page === totalPages} onClick={() => onPage(p => p + 1)}
				className="grid h-8 w-8 cursor-pointer place-items-center rounded-2xl border border-white/85 bg-[#eef2f9] text-slate-500 shadow-[3px_3px_6px_rgba(100,116,139,0.22)] disabled:cursor-not-allowed disabled:opacity-35">
				<ChevronRight className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
			</button>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function RecipesPage() {
	const t = useTranslations('recipesPage');
	const tMt = useTranslations('recipesPage.mealTypes');
	const locale = useLocale();

	// data
	const [recipes, setRecipes] = useState([]);
	const [stats, setStats] = useState(null);
	const [filterMeta, setFilterMeta] = useState(null);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);

	// filters
	const [page, setPage] = useState(1);
	const [activeTab, setActiveTab] = useState("all");
	const [search, setSearch] = useState('');
	const [satFilter, setSatFilter] = useState('');
	const [caloriesMax, setCaloriesMax] = useState(null);
	const [sortBy, setSortBy] = useState('created_at');
	const [filterOpen, setFilterOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [favorites, setFavorites] = useState(() => new Set());

	useEffect(() => {
		const pane = document.querySelector('[data-dashboard-content]');
		if (!pane) return undefined;
		pane.dataset.plainPage = '1';
		return () => { delete pane.dataset.plainPage; };
	}, []);

	useEffect(() => {
		api.get('/recipes/user/favorites', { params: { page: 1, limit: 200 } })
			.then(res => {
				const items = res?.data?.items || [];
				setFavorites(new Set(items.map(item => item.id).filter(Boolean)));
			})
			.catch(() => {});
	}, []);

	const toggleFav = useCallback(async id => {
		const on = favorites.has(id);
		setFavorites(prev => {
			const next = new Set(prev);
			if (on) next.delete(id);
			else next.add(id);
			return next;
		});
		try {
			if (on) await api.delete(`/recipes/${id}/favorite`);
			else await api.post(`/recipes/${id}/favorite`);
		} catch {
			setFavorites(prev => {
				const next = new Set(prev);
				if (on) next.add(id);
				else next.delete(id);
				return next;
			});
		}
	}, [favorites]);

	// bootstrap
	useEffect(() => {
		Promise.allSettled([
			axios.get(`${API_BASE}/recipes/stats`),
			axios.get(`${API_BASE}/recipes/filters/meta`),
		]).then(([statsRes, metaRes]) => {
			if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
			if (metaRes.status === 'fulfilled') {
				setFilterMeta(metaRes.value.data);
				// init calories max to meta max
				const calMax = metaRes.value.data?.filters?.nutrition_ranges?.calories?.max;
				if (calMax) setCaloriesMax(calMax);
			}
		});
	}, []);

	// tabs from meta
	const mealTypeTabs = useMemo(() => {
		const types = filterMeta?.filters?.meal_type ?? [];

		return [
			{ key: 'all', label: t('tabs.all') },
			...types.map(mt => {
				let label = mt;
				try {
					label = tMt(mt);
				} catch { }

				return {
					key: mt,
					label,
				};
			}),
		];
	}, [filterMeta, t, tMt]);

	const satietyOpts = useMemo(() => {
		const vals = filterMeta?.filters?.satiety_index ?? ['LOW', 'MEDIUM', 'HIGH'];
		return vals.map(v => ({
			value: v.toUpperCase(),
			label: t(`satiety.${v.toLowerCase()}`),
			meta: satMeta(v),
		}));
	}, [filterMeta, t]);

	const nutritionRanges = filterMeta?.filters?.nutrition_ranges ?? null;
	const calMax = nutritionRanges?.calories?.max ?? 600;

	// fetch
	const fetchRecipes = useCallback(async () => {
		try {
			setLoading(true);
			const params = { page, limit: PER_PAGE, is_active: true, sort_by: sortBy };
			if (search.trim()) params.search = search.trim();
			if (activeTab !== 'all') params.meal_type = activeTab;
			if (satFilter) params.satiety_index = satFilter;
			if (caloriesMax && caloriesMax < calMax) params.max_calories = caloriesMax;
			const res = await axios.get(`${API_BASE}/recipes`, { params });
			setRecipes((res?.data?.items ?? []).map(mapRecipe));
			setTotal(res?.data?.total ?? 0);
		} catch (e) {
			console.error(e);
			setRecipes([]); setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [page, search, activeTab, satFilter, caloriesMax, sortBy, calMax]);

	useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

	// derived
	const totalPages = Math.ceil(total / PER_PAGE);
	const showFeatured = page === 1 && !search && activeTab === 'all' && !satFilter && recipes.length > 0;
	const featuredRecipe = showFeatured ? recipes[0] : null;
	const gridRecipes = showFeatured ? recipes.slice(1) : recipes;

const hasFilter = !!(
	activeTab !== 'all' ||
	satFilter ||
	(caloriesMax && caloriesMax < calMax) ||
	sortBy !== 'created_at'
);	const hasActiveFilter = hasFilter || activeTab !== 'all' || !!search;

	const statTotal = stats?.summary?.total_recipes ?? total;
	const statAvgCal = Math.round(stats?.summary?.avg_calories ?? 0);
	const statAvgPro = Math.round(stats?.summary?.avg_protein ?? 0);

	const mealCountMap = useMemo(() => {
		const map = {};
		(stats?.breakdowns?.meal_types ?? []).forEach(r => { map[r.value] = r.count; });
		return map;
	}, [stats]);

	// handlers

	const handleTab = key => {
	setActiveTab(key);
	setPage(1);
};
	const handleSat = v => { setSatFilter(satFilter === v ? '' : v); setPage(1); };
	const handleSearch = v => { setSearch(v); setPage(1); };
	const handleReset = () => {
		setActiveTab('all');
		setSatFilter('');
		setPage(1);
		setSortBy('created_at');
		if (nutritionRanges?.calories?.max) setCaloriesMax(nutritionRanges.calories.max);
	};
	const handleFullReset = () => { handleReset(); handleTab('all'); handleSearch(''); };

	return (
		<>
			<GlobalStyles />
			<div data-plain-page="1" className="report-phone mx-auto w-full max-w-[440px] bg-white pt-1 dark:bg-[#0b1220]">

				<div className="m-[5px] rounded-3xl shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]">
					<div
						className="relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)]"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), #1a3fbf)' }}
					>
						<div className="pointer-events-none absolute -top-24 -start-16 h-[280px] w-[280px] rounded-full bg-white/5" />
						<div className="pointer-events-none absolute -bottom-16 -end-12 h-[200px] w-[200px] rounded-full bg-white/[0.04]" />
						<div className="relative flex items-center gap-3 p-4">
							<div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-e-[rgba(15,48,120,0.25)] border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white">
								<BookOpen size={20} strokeWidth={1.8} />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="truncate text-xl font-black leading-6 tracking-[-0.3px] text-white">{t('page.title')}</h1>
								<p className="mt-0.5 truncate text-[10px] font-medium text-white/50">{t('page.desc')}</p>
							</div>
							{favorites.size > 0 && (
								<div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-rose-500/20 text-rose-500">
									<Heart size={18} fill="#f43f5e" />
									<span className="absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">{favorites.size}</span>
								</div>
							)}
						</div>
						<div className="px-4 pb-3">
							<div className="mb-2 h-px bg-white/20" />
							<div className="flex gap-1.5">
								{[
									[t('stats.totalRecipes'), statTotal, BookOpen],
									[t('stats.avgCalories'), fmt(statAvgCal), Flame],
									[t('stats.avgProtein'), statAvgPro, Dumbbell],
								].map(([label, value, Icon]) => (
									<div key={label} className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-2.5 py-2 text-white shadow-[2px_3px_5px_rgba(15,48,120,0.28)]">
										<span className="grid h-7 w-7 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15">
											<Icon size={13} strokeWidth={2} />
										</span>
										<span className="min-w-0">
											<span className="block truncate text-[15px] font-black leading-[18px]">{value}</span>
											<span className="block truncate text-[9px] font-bold text-white/65">{label}</span>
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				<div className="px-3 pt-4">

					{/* Search + Filter row */}
					<div className="flex items-center gap-2 mb-3.5">
						{/* Search */}
						<div className="relative min-w-0 flex-1 rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[4px_4px_8px_rgba(100,116,139,0.28)]">
							<Search className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" style={{ insetInlineStart: '0.75rem' }} />
							<input
								value={search}
								onChange={e => handleSearch(e.target.value)}
								placeholder={t('search.placeholder')}
								className="h-11 w-full bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
								style={{ paddingInlineStart: '2.4rem', paddingInlineEnd: search ? '2.25rem' : '0.85rem' }}
							/>
							{search && (
								<button type="button" onClick={() => handleSearch('')}
									className="absolute top-1/2 -translate-y-1/2 border-none bg-transparent text-slate-400"
									style={{ insetInlineEnd: '0.75rem' }}>
									<X className="h-3 w-3" />
								</button>
							)}
						</div>
						<button
							type="button"
							onClick={() => setFilterOpen(o => !o)}
							className={cn(
								'flex h-11 shrink-0 items-center gap-1.5 rounded-3xl px-3.5 text-[11px] font-bold',
								filterOpen || hasFilter
									? 'border border-white/30 bg-(--color-primary-600) text-white shadow-[3px_4px_6px_color-mix(in_srgb,var(--color-primary-800)_40%,transparent)]'
									: 'border border-white/85 bg-[#eef2f9] text-slate-500 shadow-[4px_4px_8px_rgba(100,116,139,0.28)]',
							)}>
							<SlidersHorizontal className="h-3.5 w-3.5" />
							{t('table.filters')}
						</button>


					</div>

					{/* Filter panel */}
					<AnimatePresence>
						{filterOpen && (
							<FilterPanel
								open={filterOpen}
								activeTab={activeTab}
								onTabChange={handleTab}
								mealTypeTabs={mealTypeTabs}
								satFilter={satFilter}
								onSatChange={handleSat}
								satietyOpts={satietyOpts}
								nutritionRanges={nutritionRanges}
								caloriesMax={caloriesMax ?? calMax}
								onCaloriesChange={v => { setCaloriesMax(v); setPage(1); }}
								sortBy={sortBy}
								onSortChange={v => { setSortBy(v); setPage(1); }}
								onReset={handleReset}
								hasAny={hasFilter}
								t={t}
							/>
						)}
					</AnimatePresence>

					{/* Active filter breadcrumbs */}
					{(activeTab !== 'all' || satFilter || search) && (
						<div className="rp-no-scroll flex items-center gap-1.5 mb-3.5 overflow-x-auto pb-0.5">
							<span className="text-[8px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">{t('table.filters')}:</span>
							{activeTab !== 'all' && (
								<button onClick={() => handleTab('all')}
									className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold cursor-pointer border-none bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white">
									{mealEmoji(activeTab)} {(() => { try { return tMt(activeTab); } catch { return activeTab; } })()}
									<X className="h-2.5 w-2.5 opacity-70" />
								</button>
							)}
							{satFilter && (
								<button onClick={() => { setSatFilter(''); setPage(1); }}
									className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold cursor-pointer border-none bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white">
									{(() => { try { return t(`satiety.${satFilter.toLowerCase()}`); } catch { return satFilter; } })()}
									<X className="h-2.5 w-2.5 opacity-70" />
								</button>
							)}
							{search && (
								<button onClick={() => handleSearch('')}
									className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold cursor-pointer border-none bg-slate-100 text-slate-600">
									"{search}"
									<X className="h-2.5 w-2.5 opacity-70" />
								</button>
							)}
						</div>
					)}

					{/* Main grid */}
					<AnimatePresence mode="wait">
						{loading ? (
							<motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
								className="grid grid-cols-2 gap-2.5">
								{Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
							</motion.div>
						) : recipes.length === 0 ? (
							<EmptyState key="empty" onReset={handleFullReset} hasFilter={hasActiveFilter} t={t} />
						) : (
							<motion.div key={`${activeTab}-${search}-${satFilter}-${page}-${sortBy}`}
								initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
								transition={{ duration: 0.18 }}>

								{featuredRecipe && <FeaturedBanner recipe={featuredRecipe} onOpen={setSelected} t={t} favorite={favorites.has(featuredRecipe.id)} onToggleFav={toggleFav} />}

								{gridRecipes.length > 0 && (
									<div className="grid grid-cols-2 gap-2.5">
										{gridRecipes.map(r => (
											<RecipeCard key={r.id} recipe={r} onOpen={setSelected} t={t} tMt={tMt} favorite={favorites.has(r.id)} onToggleFav={toggleFav} />
										))}
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>

					{totalPages > 1 && !loading && (
						<Pagination page={page} totalPages={totalPages} onPage={setPage} />
					)}
				</div>
			</div>

			<RecipeModal recipe={selected} onClose={() => setSelected(null)} t={t} tMt={tMt} />
		</>
	);
}