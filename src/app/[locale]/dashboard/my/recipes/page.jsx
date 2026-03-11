'use client';

import axios from 'axios';
import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
	Flame, Beef, Wheat, Droplets, BookMarked, BookOpen,
	Eye, Search, SlidersHorizontal, RefreshCw,
	X, ChevronDown, Lightbulb, PlayCircle,
	Check, ChevronLeft, ChevronRight, TrendingUp,
	Utensils, Layers,
} from 'lucide-react';

const API_BASE = `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1`;
const PER_PAGE = 9;

/* ─────────────────────────────────────────────────────────────────────────────
   DATA HELPERS
───────────────────────────────────────────────────────────────────────────── */
function normalizeImage(url) {
	if (!url) return '';
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return `${process.env.NEXT_PUBLIC_BASE_URL}${url}`;
}

function mapRecipe(item) {
	return {
		id: item.id,
		title: item.title || '',
		/* satiety_index comes as uppercase string: "MEDIUM", "HIGH", "LOW" */
		satiety: String(item.satiety_index || 'MEDIUM').toUpperCase(),
		/* meal_type comes as snake_case: "savory_breakfast", "lunch", … */
		category: item.meal_type || '',
		calories: Number(item?.nutrition?.calories ?? 0),
		protein:  Number(item?.nutrition?.protein_g ?? 0),
		carbs:    Number(item?.nutrition?.carbs_g ?? 0),
		fat:      Number(item?.nutrition?.fat_g ?? 0),
		ingredients:      item.ingredients || [],
		creamIngredients: item.cream_ingredients || [],
		sauceIngredients: item.sauce_ingredients || [],
		directions: item.directions || [],
		/* tips comes as string[] from backend */
		tips:     Array.isArray(item.tips) ? item.tips : [],
		videoUrl: item.video_url || '',
		imageUrl: normalizeImage(item.image_url),
	};
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATIC LOOKUPS
───────────────────────────────────────────────────────────────────────────── */
/* satiety visual meta */
const SAT = {
	LOW:    { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
	MEDIUM: { dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200'   },
	HIGH:   { dot: 'bg-rose-400',    text: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200'    },
};
const satMeta = (v) => SAT[v?.toUpperCase()] ?? SAT.MEDIUM;

/* meal_type → emoji (all known values from backend) */
const MEAL_EMOJI = {
	savory_breakfast: '🍳',
	breakfast:        '🌅',
	lunch:            '☀️',
	dinner:           '🌙',
	snack:            '🌿',
	sweet:            '🍰',
	salad:            '🥗',
	soup:             '🍲',
	drink:            '🥤',
	dessert:          '🍮',
	default:          '🏷️',
};
const mealEmoji = (v) => MEAL_EMOJI[v] ?? MEAL_EMOJI.default;

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL INJECT STYLES  (shimmer + hide-scrollbar; runs once)
───────────────────────────────────────────────────────────────────────────── */
function GlobalStyles() {
	useEffect(() => {
		const id = 'rp-styles-v1';
		if (document.getElementById(id)) return;
		const el = document.createElement('style');
		el.id = id;
		el.textContent = `
			@keyframes rp-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
			.rp-shimmer{
				background:linear-gradient(90deg,var(--color-primary-50) 25%,var(--color-primary-100) 50%,var(--color-primary-50) 75%);
				background-size:200% 100%;
				animation:rp-shimmer 1.6s infinite;
			}
			.rp-no-scroll{scrollbar-width:none;-ms-overflow-style:none}
			.rp-no-scroll::-webkit-scrollbar{display:none}
			/* RTL-safe start/end for Tailwind classes that don't exist in base */
			.rp-ps-8{padding-inline-start:2rem}
			.rp-pe-8{padding-inline-end:2rem}
		`;
		document.head.appendChild(el);
	}, []);
	return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   RECIPE DETAIL MODAL
───────────────────────────────────────────────────────────────────────────── */
function RecipeModal({ recipe, onClose }) {
	const t   = useTranslations('recipesPage');
	const tMt = useTranslations('recipesPage.mealTypes');

	useEffect(() => {
		if (recipe) document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = ''; };
	}, [recipe]);

	if (!recipe) return null;

	const sat   = satMeta(recipe.satiety);
	const total = (recipe.protein + recipe.carbs + recipe.fat) || 1;
	/* translate meal_type key if it exists, else show raw */
	const catKey  = `mealTypes.${recipe.category}`;
	let   catLabel = mealEmoji(recipe.category) + ' ' + recipe.category;
	try   { catLabel = mealEmoji(recipe.category) + ' ' + tMt(recipe.category); } catch { /* keep raw */ }

	return (
		<AnimatePresence>
			{recipe && (
				<>
					{/* backdrop */}
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[80]"
						style={{ background: 'rgba(8,6,22,0.82)', backdropFilter: 'blur(12px)' }}
						onClick={onClose}
					/>

					{/* sheet — slides up from bottom on mobile, centered dialog on sm+ */}
					<motion.div
						initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 320, damping: 38 }}
						className="fixed inset-x-0 bottom-0 top-[5%] z-[81] flex flex-col bg-white
						           rounded-t-3xl overflow-hidden
						           sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2
						           sm:top-[4%] sm:bottom-[3%] sm:w-[min(660px,94vw)]
						           sm:rounded-3xl"
						style={{ boxShadow: '0 -20px 80px rgba(99,102,241,0.2), 0 40px 120px rgba(0,0,0,0.4)' }}
					>
						{/* drag pill – mobile only */}
						<div className="sm:hidden absolute top-2 inset-x-0 flex justify-center z-10">
							<div className="h-1 w-10 rounded-full bg-white/60" />
						</div>

						{/* hero image */}
						<div
							className="relative h-40 sm:h-52 shrink-0 overflow-hidden"
							style={{ background: 'linear-gradient(135deg,var(--color-primary-100),var(--color-primary-50))' }}
						>
							{recipe.imageUrl
								? <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
								: <div className="absolute inset-0 flex items-center justify-center">
										<BookMarked className="h-12 w-12 opacity-10" style={{ color: 'var(--color-primary-400)' }} />
									</div>
							}
							<div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-transparent" />

							{/* pills row */}
							<div className="absolute top-4 sm:top-3 start-3 flex items-center gap-1.5 flex-wrap">
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/40 text-white backdrop-blur-sm">
									{catLabel}
								</span>
								<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-sm ${sat.bg} ${sat.text} ${sat.border}`}>
									<span className={`w-1.5 h-1.5 rounded-full ${sat.dot}`} />
									{t(`satiety.${recipe.satiety.toLowerCase()}`)}
								</span>
							</div>

							{/* close */}
							<button
								onClick={onClose}
								className="absolute top-3 end-3 w-8 h-8 rounded-xl flex items-center justify-center bg-black/35 text-white hover:bg-black/55 transition-colors"
							>
								<X className="h-3.5 w-3.5" />
							</button>

							{/* title */}
							<div className="absolute bottom-3 start-4 end-4">
								<h2 className="text-base sm:text-xl font-black text-white leading-tight">{recipe.title}</h2>
							</div>
						</div>

						{/* scrollable body */}
						<div
							className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
							style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-200) transparent' }}
						>
							{/* ── nutrition card ── */}
							<div className="rounded-2xl border p-3.5" style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }}>
								<p className="text-[8px] font-black uppercase tracking-[0.16em] mb-2.5" style={{ color: 'var(--color-primary-500)' }}>
									{t('card.nutrition')}
								</p>
								<div className="flex items-end justify-between flex-wrap gap-2">
									<div>
										<p className="text-3xl sm:text-4xl font-black leading-none tabular-nums" style={{ color: 'var(--color-primary-700)' }}>
											{recipe.calories}
										</p>
										<p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">
											{t('card.calories')}
										</p>
									</div>
									<div className="flex gap-4 sm:gap-5">
										{[
											[t('card.protein'), recipe.protein, '#3b82f6'],
											[t('card.carbs'),   recipe.carbs,   '#f59e0b'],
											[t('card.fat'),     recipe.fat,     '#ec4899'],
										].map(([l, v, c]) => (
											<div key={String(l)} className="text-center">
												<p className="text-base sm:text-lg font-black tabular-nums" style={{ color: '#1e293b' }}>{v}g</p>
												<div className="w-5 h-1 rounded-full mx-auto my-1" style={{ background: String(c) }} />
												<p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">{l}</p>
											</div>
										))}
									</div>
								</div>
								{/* macro bar */}
								<div className="mt-3 flex h-1.5 overflow-hidden rounded-full gap-0.5">
									{[[recipe.carbs,'#f59e0b'],[recipe.protein,'#3b82f6'],[recipe.fat,'#ec4899']].map(([v,c],i)=>(
										<div key={i} className="rounded-full h-full transition-all duration-700"
											style={{ width:`${((Number(v))/total)*100}%`, background:String(c) }} />
									))}
								</div>
							</div>

							{/* ── two-col: ingredients + steps ── */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* left: ingredients */}
								<div className="space-y-3">
									{recipe.ingredients?.length > 0 && (
										<div>
											<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-primary-600)' }}>
												{t('card.ingredients')}
											</p>
											<ul className="space-y-1.5">
												{recipe.ingredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-600">
														<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-primary-400)' }} />
														{ing}
													</li>
												))}
											</ul>
										</div>
									)}
									{recipe.creamIngredients?.length > 0 && (
										<div>
											<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-1.5 text-slate-400">{t('card.creamIngredients')}</p>
											<ul className="space-y-1">
												{recipe.creamIngredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-[10px] sm:text-xs text-slate-500">
														<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />{ing}
													</li>
												))}
											</ul>
										</div>
									)}
									{recipe.sauceIngredients?.length > 0 && (
										<div>
											<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-1.5 text-slate-400">{t('card.sauceIngredients')}</p>
											<ul className="space-y-1">
												{recipe.sauceIngredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-[10px] sm:text-xs text-slate-500">
														<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />{ing}
													</li>
												))}
											</ul>
										</div>
									)}
								</div>

								{/* right: directions */}
								{recipe.directions?.length > 0 && (
									<div>
										<p className="text-[8px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-primary-600)' }}>
											{t('card.directions')}
										</p>
										<ol className="space-y-2">
											{recipe.directions.map((step, i) => (
												<li key={i} className="flex gap-2 text-[11px] sm:text-xs text-slate-600">
													<span
														className="flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-lg text-[7px] sm:text-[9px] font-black text-white mt-0.5"
														style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' }}
													>{i+1}</span>
													{step}
												</li>
											))}
										</ol>
									</div>
								)}
							</div>

							{/* tips */}
							{recipe.tips?.length > 0 && (
								<div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3">
									<Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
									<ul className="space-y-1">
										{recipe.tips.map((tip, i) => (
											<li key={i} className="text-[10px] sm:text-xs text-amber-800 font-medium leading-relaxed">{tip}</li>
										))}
									</ul>
								</div>
							)}

							{/* video */}
							{recipe.videoUrl && (
								<a
									href={recipe.videoUrl} target="_blank" rel="noreferrer"
									className="flex items-center gap-2 rounded-xl border p-3 text-[11px] sm:text-sm font-bold transition-all hover:bg-slate-50 active:scale-[0.98]"
									style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-700)' }}
								>
									<PlayCircle className="h-4 w-4 shrink-0" />
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

/* ─────────────────────────────────────────────────────────────────────────────
   RECIPE CARD
───────────────────────────────────────────────────────────────────────────── */
const RecipeCard = memo(function RecipeCard({ recipe, idx, onOpen }) {
	const t   = useTranslations('recipesPage');
	const tMt = useTranslations('recipesPage.mealTypes');

	const sat = satMeta(recipe.satiety);
	let catLabel = recipe.category;
	try { catLabel = tMt(recipe.category); } catch { /* keep raw */ }

	return (
		<motion.article
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.96 }}
			transition={{ delay: Math.min(idx * 0.03, 0.22), duration: 0.3, ease: [0.16,1,0.3,1] }}
			layout
			onClick={() => onOpen(recipe)}
			className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white cursor-pointer
			           transition-all duration-300 active:scale-[0.97]"
			style={{ borderColor: 'var(--color-primary-100)', boxShadow: '0 1px 5px rgba(0,0,0,0.04)' }}
			whileHover={{ y: -3, boxShadow: '0 12px 36px color-mix(in oklab,var(--color-primary-500) 13%,transparent)' }}
		>
			{/* top gradient stripe */}
			<div className="h-[3px] shrink-0" style={{ background: 'linear-gradient(90deg,var(--color-gradient-from),var(--color-gradient-via),var(--color-gradient-to))' }} />

			{/* image */}
			<div
				className="relative overflow-hidden"
				style={{ height: 108, background: 'linear-gradient(135deg,var(--color-primary-50),var(--color-primary-100))' }}
			>
				{recipe.imageUrl
					? <img
							src={recipe.imageUrl} alt={recipe.title} loading="lazy"
							className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
					: <div className="absolute inset-0 flex items-center justify-center">
							<BookMarked className="h-7 w-7 opacity-10" style={{ color: 'var(--color-primary-400)' }} />
						</div>
				}
				{/* category badge */}
				<span
					className="absolute bottom-1.5 start-1.5 inline-flex items-center gap-0.5
					           px-1.5 py-0.5 rounded-full text-[8px] font-bold
					           bg-black/45 text-white backdrop-blur-sm"
				>
					{mealEmoji(recipe.category)} {catLabel}
				</span>
			</div>

			{/* body */}
			<div className="flex flex-1 flex-col p-2 sm:p-2.5 gap-1.5">
				{/* title */}
				<h3 className="text-[10px] sm:text-[11px] font-black leading-snug text-slate-800 line-clamp-2">
					{recipe.title}
				</h3>

				{/* satiety row */}
				<div className="flex items-center gap-1">
					<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sat.dot}`} />
					<span className="text-[8px] sm:text-[9px] font-semibold text-slate-400">
						{t(`satiety.${recipe.satiety.toLowerCase()}`)}
					</span>
				</div>

				{/* nutrition strip */}
				<div
					className="rounded-xl border p-2 mt-auto"
					style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }}
				>
					<div className="flex items-center justify-between">
						{/* calories */}
						<div className="flex items-center gap-0.5">
							<Flame className="h-2.5 w-2.5 shrink-0" style={{ color: 'var(--color-primary-500)' }} />
							<span className="text-sm font-black tabular-nums leading-none" style={{ color: 'var(--color-primary-700)' }}>
								{recipe.calories}
							</span>
							<span className="text-[7px] text-slate-400 font-medium ms-0.5">kcal</span>
						</div>
						{/* macros */}
						<div className="flex items-center gap-1.5">
							{[
								[recipe.protein, '#3b82f6', Beef],
								[recipe.carbs,   '#f59e0b', Wheat],
								[recipe.fat,     '#ec4899', Droplets],
							].map(([v,c,I], i) => (
								<div key={i} className="flex items-center gap-0.5">
									<I className="h-2 w-2" style={{ color: String(c) }} />
									<span className="text-[8px] sm:text-[9px] font-bold tabular-nums" style={{ color: '#475569' }}>
										{v}g
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* hover CTA — desktop only */}
			<div className="hidden sm:block absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 px-2.5 pb-2.5 pt-4"
				style={{ background: 'linear-gradient(to top, white 70%, transparent)' }}>
				<div className="w-full py-1.5 rounded-xl text-center text-[9px] font-black text-white"
					style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' }}>
					{t('card.viewFull')} →
				</div>
			</div>
		</motion.article>
	);
});

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURED BANNER  (first card when on "all" tab, no filters)
───────────────────────────────────────────────────────────────────────────── */
const FeaturedBanner = memo(function FeaturedBanner({ recipe, onOpen }) {
	const t   = useTranslations('recipesPage');
	const tMt = useTranslations('recipesPage.mealTypes');

	const sat = satMeta(recipe.satiety);
	let catLabel = recipe.category;
	try { catLabel = tMt(recipe.category); } catch { /* keep raw */ }

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
			onClick={() => onOpen(recipe)}
			className="relative mb-4 cursor-pointer overflow-hidden rounded-2xl border
			           transition-all duration-300 active:scale-[0.99]"
			style={{ borderColor: 'var(--color-primary-100)', boxShadow: '0 4px 20px color-mix(in oklab,var(--color-primary-500) 10%,transparent)' }}
			whileHover={{ y: -2, boxShadow: '0 14px 44px color-mix(in oklab,var(--color-primary-500) 18%,transparent)' }}
		>
			{/* gradient stripe */}
			<div className="h-[3px]" style={{ background: 'linear-gradient(90deg,var(--color-gradient-from),var(--color-gradient-via),var(--color-gradient-to))' }} />

			<div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] bg-white">
				{/* image side */}
				<div
					className="relative overflow-hidden"
					style={{ minHeight: 140, background: 'linear-gradient(135deg,var(--color-primary-50),var(--color-primary-100))' }}
				>
					{recipe.imageUrl
						? <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover sm:h-52 transition-transform duration-700 hover:scale-105" />
						: <div className="absolute inset-0 flex items-center justify-center">
								<BookMarked className="h-14 w-14 opacity-10" style={{ color: 'var(--color-primary-400)' }} />
							</div>
					}
					{/* right-fade on desktop */}
					<div className="hidden sm:block absolute inset-0"
						style={{ background: 'linear-gradient(to right,transparent 55%,white)' }} />
					{/* bottom-fade on mobile */}
					<div className="sm:hidden absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
					{/* mobile title */}
					<div className="sm:hidden absolute bottom-3 start-3 end-3">
						<h2 className="text-sm font-black text-white leading-tight line-clamp-2">{recipe.title}</h2>
					</div>
				</div>

				{/* content side */}
				<div className="flex flex-col justify-center gap-2 sm:gap-2.5 p-3 sm:p-5">
					{/* badges */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
							style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
							⭐ {t('featured')}
						</span>
						<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${sat.bg} ${sat.text} ${sat.border}`}>
							<span className={`w-1.5 h-1.5 rounded-full ${sat.dot}`} />
							{t(`satiety.${recipe.satiety.toLowerCase()}`)}
						</span>
					</div>

					{/* title – desktop only */}
					<h2 className="hidden sm:block text-base sm:text-lg font-black leading-tight text-slate-800">
						{recipe.title}
					</h2>

					{/* category */}
					<span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold"
						style={{ background: 'rgba(0,0,0,0.06)', color: '#475569' }}>
						{mealEmoji(recipe.category)} {catLabel}
					</span>

					{/* macros row */}
					<div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
						{[
							[recipe.calories, 'kcal', Flame,    'var(--color-primary-500)'],
							[recipe.protein+'g', t('card.protein'), Beef,  '#3b82f6'],
							[recipe.carbs+'g',   t('card.carbs'),   Wheat, '#f59e0b'],
						].map(([v,l,I,c]) => (
							<div key={String(l)} className="flex items-center gap-1">
								<I className="h-3 w-3" style={{ color: String(c) }} />
								<span className="text-[10px] sm:text-xs font-bold text-slate-700">{v}</span>
								<span className="text-[8px] text-slate-400">{l}</span>
							</div>
						))}
					</div>

					{/* CTA */}
					<div
						className="w-fit px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black text-white"
						style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', boxShadow: '0 4px 14px color-mix(in oklab,var(--color-primary-500) 35%,transparent)' }}
					>
						{t('card.viewFull')} →
					</div>
				</div>
			</div>
		</motion.div>
	);
});

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON GRID CARD
───────────────────────────────────────────────────────────────────────────── */
function SkeletonCard() {
	return (
		<div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-primary-100)' }}>
			<div className="h-[3px]" style={{ background: 'var(--color-primary-100)' }} />
			<div className="rp-shimmer" style={{ height: 108 }} />
			<div className="p-2 sm:p-2.5 space-y-1.5">
				<div className="h-3 rounded-lg rp-shimmer" style={{ width: '70%' }} />
				<div className="h-2.5 rounded-lg rp-shimmer" style={{ width: '38%' }} />
				<div className="h-8 rounded-xl rp-shimmer" />
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function RecipesPage() {
	const t   = useTranslations('recipesPage');
	const tMt = useTranslations('recipesPage.mealTypes');

	/* ── data state ── */
	const [recipes,    setRecipes]    = useState([]);
	const [stats,      setStats]      = useState(null);   // from /recipes/stats
	const [filterMeta, setFilterMeta] = useState(null);   // from /recipes/filters/meta
	const [loading,    setLoading]    = useState(true);
	const [total,      setTotal]      = useState(0);

	/* ── filter state ── */
	const [page,       setPage]       = useState(1);
	const [activeTab,  setActiveTab]  = useState('all'); // 'all' | meal_type value
	const [search,     setSearch]     = useState('');
	const [satFilter,  setSatFilter]  = useState('');   // '' | 'LOW' | 'MEDIUM' | 'HIGH'
	const [filterOpen, setFilterOpen] = useState(false);
	const [selected,   setSelected]   = useState(null);

	/* ── bootstrap: fetch stats + filter meta once ── */
	useEffect(() => {
		Promise.allSettled([
			axios.get(`${API_BASE}/recipes/stats`),
			axios.get(`${API_BASE}/recipes/filters/meta`),
		]).then(([statsRes, metaRes]) => {
			if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
			if (metaRes.status  === 'fulfilled') setFilterMeta(metaRes.value.data);
		});
	}, []);

	/* ── dynamic tabs: from filter meta meal_type array ── */
	const mealTypeTabs = useMemo(() => {
		const types = filterMeta?.filters?.meal_type ?? [];
		return [
			{ id: 'all', emoji: '🍽️', label: t('tabs.all') },
			...types.map(mt => {
				let label = mt;
				try { label = tMt(mt); } catch { /* keep raw */ }
				return { id: mt, emoji: mealEmoji(mt), label };
			}),
		];
	}, [filterMeta, t, tMt]);

	/* ── satiety filter options: from filter meta ── */
	const satietyOpts = useMemo(() => {
		const vals = filterMeta?.filters?.satiety_index ?? ['LOW', 'MEDIUM', 'HIGH'];
		return vals.map(v => ({
			value: v.toUpperCase(),
			label: t(`satiety.${v.toLowerCase()}`),
			meta:  satMeta(v),
		}));
	}, [filterMeta, t]);

	/* ── fetch recipes when filters change ── */
	const fetchRecipes = useCallback(async () => {
		try {
			setLoading(true);
			const params = { page, limit: PER_PAGE, is_active: true };
			if (search.trim())       params.search        = search.trim();
			if (activeTab !== 'all') params.meal_type     = activeTab;
			if (satFilter)           params.satiety_index = satFilter;
			const res = await axios.get(`${API_BASE}/recipes`, { params });
			setRecipes((res?.data?.items ?? []).map(mapRecipe));
			setTotal(res?.data?.total ?? 0);
		} catch (e) {
			console.error(e);
			setRecipes([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [page, search, activeTab, satFilter]);

	useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

	/* ── derived ── */
	const totalPages     = Math.ceil(total / PER_PAGE);
	const showFeatured   = page === 1 && !search && activeTab === 'all' && !satFilter && recipes.length > 0;
	const featuredRecipe = showFeatured ? recipes[0] : null;
	const gridRecipes    = showFeatured ? recipes.slice(1) : recipes;
	const hasFilter      = !!satFilter;

	/* stat values — prefer /stats endpoint, fall back to live count */
	const statTotal  = stats?.summary?.total_recipes ?? total;
	const statAvgCal = Math.round(stats?.summary?.avg_calories ?? 0);

	/* breakdown counts for tab badges — from stats.breakdowns.meal_types */
	const mealCountMap = useMemo(() => {
		const map = {};
		(stats?.breakdowns?.meal_types ?? []).forEach(r => { map[r.value] = r.count; });
		return map;
	}, [stats]);

	/* ── handlers ── */
	const handleTab    = v  => { setActiveTab(v); setPage(1); setSatFilter(''); setFilterOpen(false); };
	const handleSat    = v  => { setSatFilter(satFilter === v ? '' : v); setPage(1); };
	const handleSearch = v  => { setSearch(v); setPage(1); };

	/* ── pagination window (max 7 buttons) ── */
	const pageButtons = useMemo(() => {
		if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
		const start = Math.max(1, Math.min(page - 3, totalPages - 6));
		return Array.from({ length: 7 }, (_, i) => start + i);
	}, [page, totalPages]);

	return (
		<>
			<GlobalStyles />

			<div className="min-h-screen flex flex-col" style={{ background: 'var(--color-primary-50)' }}>

				{/* ══════════════════════════════════════════════════════════
				    IMMERSIVE HEADER  — same pattern as MoneyPage
				══════════════════════════════════════════════════════════ */}
				<div
					className="relative overflow-hidden"
					style={{ background: 'linear-gradient(150deg,var(--color-primary-800) 0%,var(--color-primary-700) 28%,var(--color-gradient-via) 62%,var(--color-secondary-600) 100%)' }}
				>
					{/* noise overlay */}
					<div className="absolute inset-0 opacity-[0.055] pointer-events-none mix-blend-overlay"
						style={{ backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
					{/* glow blobs */}
					<div className="absolute w-72 h-72 rounded-full blur-[60px] -top-36 -start-20 pointer-events-none bg-white/[0.07]" />
					<div className="absolute w-56 h-56 rounded-full blur-[50px] -bottom-20 -end-12 pointer-events-none bg-white/[0.05]" />
					{/* top/bottom edge fades */}
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
					<div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
					{/* decorative rings */}
					<div className="absolute -top-8 -end-8 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
					<div className="absolute -top-3 -end-3 w-20 h-20 rounded-full border border-white/[0.07] pointer-events-none" />

					<div className="relative z-10 px-3 sm:px-6 pt-4 sm:pt-5 pb-0">

						{/* ── title row ── */}
						<div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
							<div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
								<motion.div
									whileHover={{ scale: 1.06, rotate: 4 }}
									transition={{ type: 'spring', stiffness: 380, damping: 20 }}
									className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl grid place-items-center shrink-0"
									style={{ background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(16px)', boxShadow: '0 6px 24px -4px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.35)' }}
								>
									<BookMarked className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
								</motion.div>
								<div className="min-w-0">
									<h1 className="text-base sm:text-2xl font-black text-white leading-tight tracking-tight truncate">
										{t('page.title')}
									</h1>
									<p className="text-[9px] sm:text-xs text-white/55 mt-0.5 font-medium">
										{t('page.desc')}
									</p>
								</div>
							</div>
						</div>

						{/* ── STAT PILLS (3-col, matching MoneyPage pattern) ── */}
						<div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-4 sm:mb-5">
							{[
								{ label: t('stats.totalRecipes'), value: statTotal,      icon: BookOpen   },
								{ label: t('stats.shownOnPage'),  value: recipes.length, icon: Eye        },
								{ label: t('stats.avgCalories'),  value: statAvgCal,     icon: Flame      },
							].map((s, i) => (
								<motion.div
									key={s.label}
									initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.05 + i * 0.06, duration: 0.38, ease: [0.16,1,0.3,1] }}
									className="relative overflow-hidden rounded-xl sm:rounded-2xl p-2 sm:p-4"
									style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
								>
									<div className="flex items-start justify-between gap-1 mb-1 sm:mb-2">
										<p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] text-white/55 leading-tight">
											{s.label}
										</p>
										<s.icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-white/35 shrink-0" />
									</div>
									<p className="text-base sm:text-2xl font-black text-white leading-none tabular-nums">
										{s.value}
									</p>
								</motion.div>
							))}
						</div>

						{/* ── MEAL-TYPE TABS (dynamic from /filters/meta) ── */}
						<div className="rp-no-scroll flex items-center gap-0.5 sm:gap-1 pb-4 overflow-x-auto">
							{mealTypeTabs.map(({ id, emoji, label }, i) => {
								const on    = activeTab === id;
								const count = id === 'all' ? null : mealCountMap[id];
								return (
									<motion.button
										key={id}
										initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.08 + i * 0.035 }}
										onClick={() => handleTab(id)}
										whileTap={{ scale: 0.97 }}
										className="relative shrink-0 flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2
										           rounded-t-xl border-none cursor-pointer whitespace-nowrap
										           transition-colors duration-200"
										style={{ color: on ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.68)', background: 'none', fontSize: 11, fontWeight: 700 }}
									>
										{on && (
											<motion.div
												layoutId="rp-tab-bg"
												className="absolute inset-0 rounded-t-xl"
												style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}
												transition={{ type: 'spring', stiffness: 480, damping: 40 }}
											/>
										)}
										<span className="relative z-10 flex items-center gap-1">
											<span style={{ fontSize: 12 }}>{emoji}</span>
											<span className="hidden xs:inline">{label}</span>
											{count != null && (
												<span
													className="text-[8px] font-black px-1 py-0.5 rounded-full"
													style={{ background: on ? 'var(--color-primary-100)' : 'rgba(255,255,255,0.15)', color: on ? 'var(--color-primary-600)' : 'rgba(255,255,255,0.7)' }}
												>
													{count}
												</span>
											)}
										</span>
									</motion.button>
								);
							})}
						</div>
					</div>
				</div>

				{/* ══════════════════════════════════════════════════════════
				    CONTENT WHITE CARD
				══════════════════════════════════════════════════════════ */}
				<div
					className="flex-1 px-3 sm:px-6 pt-3.5 sm:pt-5 pb-24"
					style={{
						background: 'white',
						borderLeft:   '1.5px solid var(--color-primary-100)',
						borderRight:  '1.5px solid var(--color-primary-100)',
						borderBottom: '1.5px solid var(--color-primary-100)',
						boxShadow: '0 12px 40px color-mix(in oklab,var(--color-primary-500) 7%,transparent)',
					}}
				>
					{/* ── search + filter row ── */}
					<div className="flex items-center gap-2 mb-3 sm:mb-4">
						{/* search input */}
						<div className="relative flex-1 min-w-0">
							<Search
								className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
								style={{ insetInlineStart: '0.625rem' }}
							/>
							<input
								value={search}
								onChange={e => handleSearch(e.target.value)}
								placeholder={t('search.placeholder')}
								className="w-full h-9 sm:h-10 rounded-xl border font-semibold
								           placeholder:text-slate-300 outline-none transition-all"
								style={{
									paddingInlineStart: '2rem', paddingInlineEnd: search ? '2rem' : '0.75rem',
									borderColor: 'var(--color-primary-100)',
									background: 'var(--color-primary-50)',
									color: '#1e293b', fontSize: 14,
								}}
								onFocus={e=>{e.target.style.borderColor='var(--color-primary-300)';e.target.style.boxShadow='0 0 0 3px color-mix(in oklab,var(--color-primary-400) 14%,transparent)';}}
								onBlur={e=>{e.target.style.borderColor='var(--color-primary-100)';e.target.style.boxShadow='none';}}
							/>
							{search && (
								<button
									onClick={() => handleSearch('')}
									className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
									style={{ insetInlineEnd: '0.5rem' }}
								>
									<X className="h-3 w-3" />
								</button>
							)}
						</div>

						{/* satiety filter toggle */}
						<motion.button
							whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
							onClick={() => setFilterOpen(o => !o)}
							className="relative h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all duration-200"
							style={filterOpen || hasFilter
								? { background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', borderColor: 'transparent', color: 'white', boxShadow: '0 4px 14px color-mix(in oklab,var(--color-primary-500) 35%,transparent)', fontSize: 11, fontWeight: 700 }
								: { background: 'white', borderColor: 'var(--color-primary-100)', color: '#475569', fontSize: 11, fontWeight: 700 }
							}
						>
							<SlidersHorizontal className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">{t('table.filters')}</span>
							{/* active dot */}
							{hasFilter && !filterOpen && (
								<span
									className="absolute -top-1 -end-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white ring-2 ring-white"
									style={{ background: 'var(--color-secondary-500)' }}
								>✦</span>
							)}
							<motion.span animate={{ rotate: filterOpen ? 180 : 0 }} transition={{ duration: 0.18 }} className="flex">
								<ChevronDown className="h-3 w-3" />
							</motion.span>
						</motion.button>

						{/* total count */}
						<span className="text-[9px] sm:text-[11px] font-semibold text-slate-400 shrink-0 tabular-nums">
							{total}
						</span>
					</div>

					{/* ── satiety filter panel ── */}
					<AnimatePresence>
						{filterOpen && (
							<motion.div
								initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }}
								className="overflow-hidden mb-3 sm:mb-4"
							>
								<div
									className="rounded-2xl border p-3"
									style={{ borderColor: 'var(--color-primary-100)', background: 'color-mix(in oklab,var(--color-primary-50) 60%,white)' }}
								>
									<div className="flex items-center justify-between mb-2">
										<p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.14em]"
											style={{ color: 'var(--color-primary-500)' }}>
											{t('satiety.label')}
										</p>
										{satFilter && (
											<button
												onClick={() => { setSatFilter(''); setPage(1); }}
												className="flex items-center gap-1 text-[9px] font-bold text-rose-500 hover:text-rose-600"
											>
												<RefreshCw className="h-2.5 w-2.5" /> {t('table.reset')}
											</button>
										)}
									</div>
									<div className="flex gap-1.5 flex-wrap">
										{satietyOpts.map(opt => (
											<button
												key={opt.value}
												onClick={() => handleSat(opt.value)}
												className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold transition-all duration-200"
												style={satFilter === opt.value
													? { background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', borderColor: 'transparent', color: 'white', boxShadow: '0 4px 10px color-mix(in oklab,var(--color-primary-500) 28%,transparent)' }
													: { background: 'white', borderColor: 'var(--color-primary-100)', color: '#475569' }
												}
											>
												<span className={`w-2 h-2 rounded-full ${opt.meta.dot}`} />
												{opt.label}
											</button>
										))}
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* active filter breadcrumb */}
					{(activeTab !== 'all' || satFilter) && (
						<div className="rp-no-scroll flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-0.5">
							<span className="text-[8px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
								{t('table.filters')}:
							</span>
							{activeTab !== 'all' && (
								<button
									onClick={() => handleTab('all')}
									className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold transition-all"
									style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', borderColor: 'transparent', color: 'white' }}
								>
									{mealEmoji(activeTab)} {(() => { try { return tMt(activeTab); } catch { return activeTab; } })()}
									<X className="h-2.5 w-2.5 opacity-70" />
								</button>
							)}
							{satFilter && (
								<button
									onClick={() => { setSatFilter(''); setPage(1); }}
									className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold transition-all"
									style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', borderColor: 'transparent', color: 'white' }}
								>
									{(() => { try { return t(`satiety.${satFilter.toLowerCase()}`); } catch { return satFilter; } })()}
									<X className="h-2.5 w-2.5 opacity-70" />
								</button>
							)}
						</div>
					)}

					{/* ── main grid area ── */}
					<AnimatePresence mode="wait">
						{loading ? (
							/* skeletons */
							<motion.div
								key="skel"
								initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
								className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5"
							>
								{Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
							</motion.div>

						) : recipes.length === 0 ? (
							/* empty state */
							<motion.div
								key="empty"
								initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
								className="flex flex-col items-center justify-center py-20 gap-4"
							>
								<div className="relative">
									<div className="absolute inset-0 blur-2xl scale-[2.5] rounded-full"
										style={{ background: 'color-mix(in oklab,var(--color-primary-200) 35%,transparent)' }} />
									<motion.div
										animate={{ rotate: [0, -4, 4, 0] }}
										transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
										className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
										style={{ background: 'var(--color-primary-50)', border: '1.5px solid var(--color-primary-100)' }}
									>
										<BookMarked className="h-5 w-5" style={{ color: 'var(--color-primary-300)' }} />
									</motion.div>
								</div>
								<div className="text-center space-y-1">
									<p className="text-xs sm:text-sm font-black text-slate-600">{t('table.emptyTitle')}</p>
									<p className="text-[10px] sm:text-xs text-slate-400">{t('table.emptySubtitle')}</p>
								</div>
								{/* clear filters CTA */}
								{(activeTab !== 'all' || satFilter || search) && (
									<button
										onClick={() => { handleTab('all'); setSatFilter(''); handleSearch(''); }}
										className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white"
										style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' }}
									>
										<RefreshCw className="h-3 w-3" /> {t('table.reset')}
									</button>
								)}
							</motion.div>

						) : (
							/* recipes */
							<motion.div
								key={`${activeTab}-${search}-${satFilter}-${page}`}
								initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
								transition={{ duration: 0.16 }}
							>
								{/* featured banner */}
								{featuredRecipe && <FeaturedBanner recipe={featuredRecipe} onOpen={setSelected} />}

								{/* grid */}
								{gridRecipes.length > 0 && (
									<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5">
										{gridRecipes.map((r, i) => (
											<RecipeCard key={r.id} recipe={r} idx={i} onOpen={setSelected} />
										))}
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>

					{/* ── pagination ── */}
					{totalPages > 1 && !loading && (
						<div className="flex items-center justify-center gap-1 sm:gap-1.5 pt-6 flex-wrap">
							<button
								disabled={page === 1} onClick={() => setPage(p => p - 1)}
								className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center
								           text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white
								           hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-200)]"
								style={{ borderColor: '#e2e8f0', color: '#64748b' }}
							>
								<ChevronRight className="h-3 w-3" />
							</button>

							{pageButtons.map(p => (
								<button
									key={p} onClick={() => setPage(p)}
									className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border text-[10px] sm:text-xs font-bold transition-all"
									style={p === page
										? { background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', borderColor: 'transparent', color: 'white', boxShadow: '0 4px 10px color-mix(in oklab,var(--color-primary-500) 40%,transparent)' }
										: { background: 'white', borderColor: '#e2e8f0', color: '#475569' }
									}
								>{p}</button>
							))}

							<button
								disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
								className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center
								           text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white
								           hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-200)]"
								style={{ borderColor: '#e2e8f0', color: '#64748b' }}
							>
								<ChevronLeft className="h-3 w-3" />
							</button>
						</div>
					)}
				</div>
			</div>

			{/* detail modal */}
			<RecipeModal recipe={selected} onClose={() => setSelected(null)} />
		</>
	);
}