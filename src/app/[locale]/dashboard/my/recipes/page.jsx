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
} from 'lucide-react';
import { TabsPill } from '../workouts/page';

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
				<p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.12em] text-white/55 leading-tight">{label}</p>
				<Icon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white/35 shrink-0" />
			</div>
			<p className="text-xl sm:text-3xl font-black text-white leading-none tabular-nums">{value}</p>
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
		<div className="rounded-2xl border overflow-hidden border-[var(--color-primary-100)]">
			<div className="h-[3px] bg-[var(--color-primary-100)]" />
			<div className="rp-shimmer" style={{ height: 120 }} />
			<div className="p-3 space-y-2">
				<div className="h-3 rounded-lg rp-shimmer w-3/4" />
				<div className="h-2.5 rounded-lg rp-shimmer w-2/5" />
				<div className="h-9 rounded-xl rp-shimmer" />
			</div>
		</div>
	);
}

// ─── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({ protein, carbs, fat }) {
	const total = (protein + carbs + fat) || 1;
	const bars = [
		{ v: carbs, c: '#f59e0b', label: 'C' },
		{ v: protein, c: '#3b82f6', label: 'P' },
		{ v: fat, c: '#ec4899', label: 'F' },
	];
	return (
		<div className="flex h-1.5 overflow-hidden rounded-full gap-px">
			{bars.map(({ v, c, label }) => (
				<div key={label} className="h-full rounded-full transition-all duration-700"
					style={{ width: `${((v) / total) * 100}%`, background: c }} />
			))}
		</div>
	);
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────
const RecipeCard = memo(function RecipeCard({ recipe, idx, onOpen, t, tMt }) {
	const sat = satMeta(recipe.satiety);
	let catLabel = recipe.category;
	try { catLabel = tMt(recipe.category); } catch { /* keep raw */ }

	return (
		<motion.article
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.96 }}
			transition={{ delay: Math.min(idx * 0.04, 0.24), duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
			layout
			onClick={() => onOpen(recipe)}
			className="rp-card group relative flex flex-col overflow-hidden rounded-2xl border bg-white cursor-pointer transition-shadow duration-300 active:scale-[0.97] border-[var(--color-primary-100)]"
			style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
			whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(99,102,241,0.14)' }}
		>
			{/* gradient stripe */}
			<div className="h-[3px] shrink-0 bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]" />

			{/* image */}
			<div className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)]" style={{ height: 120 }}>
				{recipe.imageUrl
					? <img src={recipe.imageUrl} alt={recipe.title} loading="lazy"
						className="rp-card-img w-full h-full object-cover" />
					: <div className="absolute inset-0 flex items-center justify-center">
						<BookMarked className="h-8 w-8 opacity-10 text-[var(--color-primary-400)]" />
					</div>
				}
				<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

				{/* category badge */}
				<span className="absolute bottom-2 start-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/50 text-white backdrop-blur-sm">
					{mealEmoji(recipe.category)} {catLabel}
				</span>

				{/* satiety dot */}
				<span className="absolute top-2 end-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-bold backdrop-blur-sm border bg-white/90"
					style={{ color: sat.text?.replace('text-', '') }}>
					<span className={cn('w-1.5 h-1.5 rounded-full', sat.dot)} />
					<span className={sat.text}>{t(`satiety.${recipe.satiety.toLowerCase()}`)}</span>
				</span>
			</div>

			{/* body */}
			<div className="flex flex-1 flex-col p-2.5 sm:p-3 gap-2">
				<h3 className="text-[10.5px] sm:text-[11.5px] font-black leading-snug text-slate-800 line-clamp-2">
					{recipe.title}
				</h3>

				{/* nutrition strip */}
				<div className="rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-2 mt-auto">
					<div className="flex items-center justify-between mb-1.5">
						<div className="flex items-center gap-1">
							<Flame className="h-3 w-3 text-[var(--color-primary-500)]" />
							<span className="text-sm font-black tabular-nums text-[var(--color-primary-700)]">{recipe.calories}</span>
							<span className="text-[7px] text-slate-400 font-medium">kcal</span>
						</div>
						<div className="flex items-center gap-2">
							{[
								[recipe.protein, '#3b82f6', Beef],
								[recipe.carbs, '#f59e0b', Wheat],
								[recipe.fat, '#ec4899', Droplets],
							].map(([v, c, I], i) => (
								<div key={i} className="flex items-center gap-0.5">
									<I className="h-2 w-2" style={{ color: String(c) }} />
									<span className="text-[8px] sm:text-[9px] font-bold tabular-nums text-slate-600">{v}g</span>
								</div>
							))}
						</div>
					</div>
					<MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
				</div>
			</div>

			{/* hover CTA */}
			<div className="hidden sm:flex absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 px-3 pb-3 pt-6"
				style={{ background: 'linear-gradient(to top, white 65%, transparent)' }}>
				<div className="w-full py-1.5 flex items-center gap-1 rounded-xl text-center text-[9px] font-black text-white bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">
					{t('card.viewFull')} <ChevronLeft size={12} />
				</div>
			</div>
		</motion.article>
	);
});

// ─── Featured Banner ──────────────────────────────────────────────────────────
const FeaturedBanner = memo(function FeaturedBanner({ recipe, onOpen, t, tMt }) {
	const sat = satMeta(recipe.satiety);
	let catLabel = recipe.category;
	try { catLabel = tMt(recipe.category); } catch { /* keep raw */ }

	return (
		<motion.div
			initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
			onClick={() => onOpen(recipe)}
			className="relative mb-5 cursor-pointer overflow-hidden rounded-2xl border border-[var(--color-primary-100)] active:scale-[0.99] transition-shadow duration-300"
			style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.1)' }}
			whileHover={{ y: -2, boxShadow: '0 16px 48px rgba(99,102,241,0.18)' }}
		>
			<div className="h-[3px] bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]" />

			<div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr] bg-white">
				{/* image */}
				<div className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)]" style={{ minHeight: 160 }}>
					{recipe.imageUrl
						? <img src={recipe.imageUrl} alt={recipe.title}
							className="w-full h-full object-cover sm:h-56 transition-transform duration-700 hover:scale-105" />
						: <div className="absolute inset-0 flex items-center justify-center">
							<BookMarked className="h-14 w-14 opacity-10 text-[var(--color-primary-400)]" />
						</div>
					}
					<div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/80" />
					<div className="sm:hidden absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
					<div className="sm:hidden absolute bottom-3 start-3 end-3">
						<h2 className="text-sm font-black text-white leading-tight line-clamp-2">{recipe.title}</h2>
					</div>
				</div>

				{/* content */}
				<div className="flex flex-col justify-center gap-3 p-4 sm:p-5">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-[var(--color-primary-50)] text-[var(--color-primary-600)] border border-[var(--color-primary-200)]">
							<Star size={8} /> {t('featured')}
						</span>
						<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold border', sat.bg, sat.text, sat.border)}>
							<span className={cn('w-1.5 h-1.5 rounded-full', sat.dot)} />
							{t(`satiety.${recipe.satiety.toLowerCase()}`)}
						</span>
					</div>

					<h2 className="hidden sm:block rp-serif text-xl sm:text-2xl font-black leading-tight text-slate-800">
						{recipe.title}
					</h2>

					<span className="inline-flex w-fit items-center gap-1 px-2 py-1 rounded-full text-[8px] font-bold bg-slate-50 text-slate-500 border border-slate-100">
						{mealEmoji(recipe.category)} {catLabel}
					</span>

					{/* macros row */}
					<div className="flex items-center gap-3 flex-wrap">
						{[
							[recipe.calories, 'kcal', Flame, 'var(--color-primary-500)'],
							[recipe.protein + 'g', t('card.protein'), Beef, '#3b82f6'],
							[recipe.carbs + 'g', t('card.carbs'), Wheat, '#f59e0b'],
							[recipe.fat + 'g', t('card.fat'), Droplets, '#ec4899'],
						].map(([v, l, I, c]) => (
							<div key={String(l)} className="flex items-center gap-1">
								<I className="h-3 w-3" style={{ color: String(c) }} />
								<span className="text-[11px] font-bold text-slate-700">{v}</span>
								<span className="text-[8px] text-slate-400">{l}</span>
							</div>
						))}
					</div>

					{/* macro bar */}
					<MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />

					<div className="w-fit px-4 py-2 rounded-xl flex items-center gap-1 text-[10px] font-black text-white bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] shadow-lg shadow-[var(--color-primary-200)]">
						{t('card.viewFull')} <ChevronLeft size={12} />
					</div>
				</div>
			</div>
		</motion.div>
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
						className="fixed inset-x-0 bottom-0 top-[4%] z-[81] flex flex-col bg-white rounded-t-3xl overflow-hidden sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-[3%] sm:bottom-[3%] sm:w-[min(680px,94vw)] sm:rounded-3xl"
						style={{ boxShadow: '0 -24px 80px rgba(99,102,241,0.22), 0 40px 120px rgba(0,0,0,0.4)' }}
					>
						{/* drag pill */}
						<div className="sm:hidden absolute top-2 inset-x-0 flex justify-center z-10">
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
								<h2 className="rp-serif text-lg sm:text-2xl font-black text-white leading-tight">{recipe.title}</h2>
							</div>
						</div>

						{/* body */}
						<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-200) transparent' }}>

							{/* Nutrition card */}
							<div className="rounded-2xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-4">
								<p className="text-[8px] font-black uppercase tracking-[0.16em] mb-3 text-[var(--color-primary-500)]">{t('card.nutrition')}</p>
								<div className="flex items-end justify-between flex-wrap gap-3">
									<div>
										<p className="rp-serif text-4xl sm:text-5xl font-black leading-none tabular-nums text-[var(--color-primary-700)]">{recipe.calories}</p>
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
									<MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
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
											<li key={i} className="text-[11px] sm:text-xs text-amber-800 font-medium leading-relaxed">{tip}</li>
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
			<div className="rounded-2xl border border-[var(--color-primary-100)] bg-gradient-to-br from-[var(--color-primary-50)] to-white p-4 space-y-4">
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
	<button key={opt.key} onClick={() => onTabChange(opt.key)}
								className={cn(
									'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold transition-all duration-200 cursor-pointer',
									activeTab === opt.key
										? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] border-transparent text-white shadow-md shadow-[var(--color-primary-200)]'
										: 'bg-white border-[var(--color-primary-100)] text-slate-600 hover:border-[var(--color-primary-300)]'
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
							<button key={opt.value} onClick={() => onSatChange(opt.value)}
								className={cn(
									'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold transition-all duration-200 cursor-pointer',
									satFilter === opt.value
										? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] border-transparent text-white shadow-md shadow-[var(--color-primary-200)]'
										: 'bg-white border-[var(--color-primary-100)] text-slate-600 hover:border-[var(--color-primary-300)]'
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
							<button key={opt.v} onClick={() => onSortChange(opt.v)}
								className={cn(
									'px-3 py-1 rounded-full border text-[9px] font-bold transition-all duration-200 cursor-pointer',
									sortBy === opt.v
										? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] border-transparent text-white shadow-md shadow-[var(--color-primary-200)]'
										: 'bg-white border-[var(--color-primary-100)] text-slate-600 hover:border-[var(--color-primary-300)]'
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
			<div className="relative">
				<div className="absolute inset-0 blur-3xl scale-[3] rounded-full bg-[var(--color-primary-100)]/50" />
				<motion.div
					animate={{ rotate: [0, -5, 5, 0] }}
					transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
					className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--color-primary-50)] border border-[var(--color-primary-100)]"
				>
					<BookMarked className="h-6 w-6 text-[var(--color-primary-300)]" />
				</motion.div>
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
		<div className="flex items-center justify-center gap-1.5 pt-8 flex-wrap">
			<button disabled={page === 1} onClick={() => onPage(p => p - 1)}
				className="w-8 h-8 rounded-xl border border-[var(--color-primary-100)] flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-300)] text-slate-600 cursor-pointer">
				<ChevronLeft className=" rtl:scale-x-[-1] h-3.5 w-3.5" />
			</button>
			{pageButtons.map(p => (
				<button key={p} onClick={() => onPage(p)}
					className={cn(
						'w-8 h-8 rounded-xl border text-[11px] font-black transition-all cursor-pointer',
						p === page
							? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] border-transparent text-white shadow-md shadow-[var(--color-primary-200)]'
							: 'bg-white border-[var(--color-primary-100)] text-slate-600 hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-300)]'
					)}>
					{p}
				</button>
			))}
			<button disabled={page === totalPages} onClick={() => onPage(p => p + 1)}
				className="w-8 h-8 rounded-xl border border-[var(--color-primary-100)] flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-300)] text-slate-600 cursor-pointer">
				<ChevronRight className=" rtl:scale-x-[-1] h-3.5 w-3.5" />
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
			<div className="rp-root w-[calc(100%+14px)] rtl:mr-[-7px] ltr:ml-[-7px] mt-[-7px] min-h-screen flex flex-col bg-[var(--color-primary-50)]">

				{/* ── Header ── */}
				<div className="relative overflow-hidden rounded-md"
					style={{ background: 'linear-gradient(150deg,var(--color-primary-800) 0%,var(--color-primary-700) 28%,var(--color-gradient-via) 62%,var(--color-secondary-600) 100%)' }}>

					{/* Overlays */}
					<div className="absolute inset-0 opacity-[0.055] pointer-events-none mix-blend-overlay"
						style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
					<div className="absolute w-80 h-80 rounded-full bg-white/[0.07] blur-[60px] -top-40 -start-24 pointer-events-none" />
					<div className="absolute w-64 h-64 rounded-full bg-white/[0.05] blur-[55px] -bottom-24 -end-16 pointer-events-none" />
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
					<div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
					<div className="absolute -top-10 -end-10 w-44 h-44 rounded-full border border-white/10 pointer-events-none" />
					<div className="absolute -top-4 -end-4 w-28 h-28 rounded-full border border-white/8 pointer-events-none" />

					<div className="relative z-10 px-4 sm:px-5 pt-5 pb-0">

						{/* Title row */}
						<div className="flex items-center justify-between gap-3 mb-5">
							<div className="flex items-center gap-3 min-w-0">
								<motion.div
									whileHover={{ scale: 1.06, rotate: 4 }}
									transition={{ type: 'spring', stiffness: 380, damping: 20 }}
									className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl grid place-items-center shrink-0"
									style={{ background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(16px)', boxShadow: '0 6px 24px -4px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.35)' }}
								>
									<Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
								</motion.div>
								<div className="min-w-0">
									<h1 className="rp-serif text-xl sm:text-2xl text-white leading-tight tracking-tight truncate">{t('page.title')}</h1>
									<p className="text-[10px] sm:text-xs text-white/50 mt-0.5 font-medium">{t('page.desc')}</p>
								</div>
							</div>
						</div>

						{/* Stats */}
						<div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
							<StatPill label={t('stats.totalRecipes')} value={
								<div className='flex items-end gap-1'>
									{statTotal} <span className=' !font-[400] text-[10px] ' >{t("recipe")}</span>
								</div>
							} icon={BookOpen} delay={0.05} />
							<StatPill label={t('stats.avgCalories')} value={
								<div className='flex items-end gap-1'>
									{fmt(statAvgCal)} <span className=' rtl:order-[-1] text-[10px] ' >kcal</span>
								</div>
							} icon={Flame} delay={0.11} />
							<StatPill label={t('stats.avgProtein')} value={
								<div className='flex items-end gap-1'>
									{statAvgPro} <span className=' rtl:order-[-1] text-[10px] ' >g</span>
								</div>
							} icon={Beef} delay={0.17} />
						</div>


					</div>
				</div>

				{/* ── Content ── */}
				<div className="flex-1 px-2 pt-4 sm:pt-5 "
					style={{ boxShadow: '0 14px 44px rgba(99,102,241,0.06)' }}>

					{/* Search + Filter row */}
					<div className="flex items-center gap-2 mb-3.5">
						{/* Search */}
						<div className="relative flex-1 min-w-0">
							<Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
								style={{ insetInlineStart: '0.75rem' }} />
							<input
								value={search}
								onChange={e => handleSearch(e.target.value)}
								placeholder={t('search.placeholder')}
								className=" text-base w-full h-10 rounded-2xl border border-[var(--color-primary-100)] bg-white font-semibold placeholder-slate-300 outline-none transition-all text-slate-800"
								style={{ paddingInlineStart: '2.25rem', paddingInlineEnd: search ? '2.25rem' : '0.75rem' }}
								onFocus={e => { e.target.style.borderColor = 'var(--color-primary-300)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
								onBlur={e => { e.target.style.borderColor = 'var(--color-primary-100)'; e.target.style.boxShadow = 'none'; }}
							/>
							{search && (
								<button onClick={() => handleSearch('')}
									className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
									style={{ insetInlineEnd: '0.625rem' }}>
									<X className="h-3 w-3" />
								</button>
							)}
						</div>

						{/* Filter toggle */}
						<motion.button
							whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
							onClick={() => setFilterOpen(o => !o)}
							className={cn(
								'relative h-10 px-3 rounded-2xl border flex items-center gap-1.5 shrink-0 transition-all duration-200 cursor-pointer text-[11px] font-bold',
								filterOpen || hasFilter
									? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] border-transparent text-white shadow-lg shadow-[var(--color-primary-200)]'
									: 'bg-white border-[var(--color-primary-100)] text-slate-600 hover:border-[var(--color-primary-300)]'
							)}>
							<SlidersHorizontal className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">{t('table.filters')}</span>
							{hasFilter && !filterOpen && (
								<span className="absolute -top-1 -end-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white ring-2 ring-white bg-[var(--color-secondary-500)]">✦</span>
							)}
							<motion.span animate={{ rotate: filterOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
								<ChevronDown className="h-3 w-3" />
							</motion.span>
						</motion.button>


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
								className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
								{Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
							</motion.div>
						) : recipes.length === 0 ? (
							<EmptyState key="empty" onReset={handleFullReset} hasFilter={hasActiveFilter} t={t} />
						) : (
							<motion.div key={`${activeTab}-${search}-${satFilter}-${page}-${sortBy}`}
								initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
								transition={{ duration: 0.18 }}>

								{featuredRecipe && <FeaturedBanner recipe={featuredRecipe} onOpen={setSelected} t={t} tMt={tMt} />}

								{gridRecipes.length > 0 && (
									<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
										{gridRecipes.map((r, i) => (
											<RecipeCard key={r.id} recipe={r} idx={i} onOpen={setSelected} t={t} tMt={tMt} />
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