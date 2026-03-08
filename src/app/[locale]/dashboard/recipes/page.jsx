'use client';

import axios from 'axios';
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
	Flame, Heart, Eye, Plus, Search, Trash2, Edit2,
	Star, Users, Beef, Wheat, Droplets, X, BookOpen, TrendingUp, ChevronDown, ChevronLeft, ChevronRight, Check, Image as ImageIcon, Lightbulb, PlayCircle, BookMarked,
	Camera, Link2, Tag, Utensils, ListChecks, FileText, Soup,
} from 'lucide-react';
import { PageHeader } from '@/components/molecules/PageHeader';

const API_BASE = `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1`;

/* ═══════════════════════════════════════════
   EMPTY FORM
═══════════════════════════════════════════ */
const EMPTY_FORM = {
	id: null,
	title: '',
	satiety: 'medium',
	category: '',
	calories: '',
	protein: '',
	carbs: '',
	fat: '',
	ingredients: [''],
	creamIngredients: [],
	sauceIngredients: [],
	directions: [''],
	tips: '',
	videoUrl: '',
	imageUrl: '',
	imageFile: null,
};

/* ═══════════════════════════════════════════
   FLOATING LABEL PRIMITIVE
═══════════════════════════════════════════ */
const FloatLabel = ({ show, text }) => (
	<AnimatePresence>
		{show && (
			<motion.span
				initial={{ opacity: 0, y: 3 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 3 }}
				transition={{ duration: 0.13 }}
				className="pointer-events-none absolute z-10 px-1 text-[9px] font-bold"
				style={{
					top: -8,
					insetInlineStart: 9,
					color: 'var(--color-primary-600)',
					background: 'linear-gradient(to bottom,var(--color-primary-50) 50%,white 50%)',
					letterSpacing: '0.05em'
				}}
			>
				{text}
			</motion.span>
		)}
	</AnimatePresence>
);

const BASE = 'h-[36px] w-full rounded-xl border bg-white px-3 text-xs font-semibold outline-none transition-all duration-150 placeholder:text-slate-300 focus:ring-2 focus:ring-[color:var(--color-primary-200)] focus:border-[color:var(--color-primary-400)]';
const filled = 'border-[color:var(--color-primary-300)] text-slate-800';
const unfilled = 'border-slate-200 text-slate-700 hover:border-slate-300';

/* ═══════════════════════════════════════════
   MINI FIELD
═══════════════════════════════════════════ */
const MiniField = memo(({ value, placeholder, onChange, type = 'text', iconLeft = null, className = '', cnParent = '' }) => {
	const has = String(value ?? '').trim().length > 0;
	return (
		<div className={`relative w-full ${cnParent}`}>
			<FloatLabel show={has} text={placeholder} />
			{iconLeft && <span className="pointer-events-none absolute z-10 top-1/2 -translate-y-1/2 opacity-40" style={{ insetInlineStart: 10 }}>{iconLeft}</span>}
			<input
				value={value ?? ''}
				type={type}
				placeholder={placeholder}
				onChange={onChange}
				className={[BASE, iconLeft ? 'ps-8' : '', has ? filled : unfilled, className].join(' ')}
			/>
		</div>
	);
});

/* ═══════════════════════════════════════════
   MINI TEXTAREA
═══════════════════════════════════════════ */
const MiniTextArea = memo(({ value, placeholder, onChange, rows = 3 }) => {
	const has = String(value ?? '').trim().length > 0;
	return (
		<div className="relative w-full">
			<FloatLabel show={has} text={placeholder} />
			<textarea
				value={value ?? ''}
				placeholder={placeholder}
				rows={rows}
				onChange={e => onChange?.(e.target.value)}
				className={[
					'w-full rounded-xl border bg-white px-3 py-2.5 text-xs font-semibold leading-relaxed outline-none transition-all duration-150 placeholder:text-slate-300 resize-none focus:ring-2 focus:ring-[color:var(--color-primary-200)] focus:border-[color:var(--color-primary-400)]',
					has ? filled : unfilled
				].join(' ')}
			/>
		</div>
	);
});

/* ═══════════════════════════════════════════
   SEGMENT CONTROL
═══════════════════════════════════════════ */
function SegmentControl({ value, onChange, options, cn, id }) {
	return (
		<div className={`flex ${cn} gap-1 rounded-xl border p-1`} style={{ borderColor: 'var(--color-primary-100)', background: 'var(--color-primary-50)' }}>
			{options.map(opt => {
				const active = value === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						onClick={() => onChange(opt.value)}
						className="relative flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors"
						style={{ color: active ? 'white' : 'var(--color-primary-600)' }}
					>
						{active && (
							<motion.div
								layoutId={`seg-${id}`}
								className="absolute inset-0 rounded-lg"
								style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' }}
								transition={{ type: 'spring', stiffness: 500, damping: 36 }}
							/>
						)}
						<span className="relative z-10">{opt.label}</span>
					</button>
				);
			})}
		</div>
	);
}

/* ═══════════════════════════════════════════
   CATEGORY COMBO
═══════════════════════════════════════════ */
function CategoryCombo({ value, onChange, presets, placeholder }) {
	const [open, setOpen] = useState(false);
	const ref = useRef();

	const preset = presets.find(c => c.value === value);
	const displayVal = preset ? preset.label : value ?? '';
	const has = !!value;

	useEffect(() => {
		const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
		document.addEventListener('mousedown', h);
		return () => document.removeEventListener('mousedown', h);
	}, []);

	return (
		<div ref={ref} className="relative w-full">
			<FloatLabel show={has} text={placeholder} />
			<div
				className={['flex h-[36px] w-full items-center rounded-xl border bg-white ps-3 pe-2 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-[color:var(--color-primary-200)] focus-within:border-[color:var(--color-primary-400)]', has ? 'border-[color:var(--color-primary-300)]' : 'border-slate-200 hover:border-slate-300'].join(' ')}
				onClick={() => setOpen(true)}
			>
				{value && <span className="me-1.5 text-sm select-none">{preset?.emoji ?? '🏷️'}</span>}
				<input
					value={displayVal}
					readOnly
					placeholder={placeholder}
					className="flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-slate-300 text-slate-800 min-w-0 cursor-pointer"
				/>
				<motion.button
					type="button"
					animate={{ rotate: open ? 180 : 0 }}
					transition={{ duration: 0.2 }}
					onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
					className="ms-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg hover:bg-slate-100"
				>
					<ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--color-primary-500)' }} />
				</motion.button>
			</div>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 6, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.97 }}
						transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
						className="absolute inset-x-0 top-full z-[200] mt-1.5 overflow-hidden rounded-2xl border bg-white"
						style={{ borderColor: 'var(--color-primary-100)', boxShadow: '0 16px 48px rgba(201,123,46,0.18),0 2px 8px rgba(0,0,0,0.06)' }}
					>
						<div className="p-1.5">
							{presets.map(c => (
								<button
									key={c.value}
									type="button"
									onClick={() => { onChange(c.value); setOpen(false); }}
									className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
									style={{ color: value === c.value ? 'var(--color-primary-700)' : 'var(--ink-mid)', background: value === c.value ? 'var(--color-primary-50)' : 'transparent' }}
								>
									<span className="text-base w-6 text-center">{c.emoji}</span>
									<span>{c.label}</span>
									{value === c.value && <Check className="ms-auto h-3.5 w-3.5" style={{ color: 'var(--color-primary-500)' }} />}
								</button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ═══════════════════════════════════════════
   NUTRITION TILE
═══════════════════════════════════════════ */
function NutritionTile({ label, value, onChange, color, icon: Icon, unit }) {
	const [focused, setFocused] = useState(false);
	return (
		<div
			className="flex flex-col gap-1.5 rounded-2xl border p-3 transition-all"
			style={{
				borderColor: focused ? color : 'var(--color-primary-100)',
				background: focused ? `${color}0d` : 'white',
				boxShadow: focused ? `0 0 0 3px ${color}18` : 'none'
			}}
		>
			<div className="flex items-center gap-1.5">
				{Icon && <Icon className="h-3 w-3" style={{ color, opacity: 0.75 }} />}
				<span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color }}>{label}</span>
			</div>
			<input
				type="number"
				min={0}
				value={value ?? ''}
				onChange={e => onChange(e.target.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				placeholder="0"
				className="w-full border-none bg-transparent text-2xl font-black outline-none placeholder:text-slate-200"
				style={{ color: 'var(--ink)' }}
			/>
			<span className="text-[9px] font-semibold" style={{ color: 'var(--color-primary-400)' }}>{unit}</span>
		</div>
	);
}

/* ═══════════════════════════════════════════
   SECTION CARD + LABEL
═══════════════════════════════════════════ */
function SCard({ children, className = '' }) {
	return (
		<div className={`rounded-2xl border p-4 ${className}`} style={{ borderColor: 'var(--color-primary-100)', background: 'rgba(253,248,240,0.55)' }}>
			{children}
		</div>
	);
}

function SLabel({ icon: Icon, children, button }) {
	return (
		<div className="mb-3 flex items-center justify-between gap-2">
			<div className='flex items-center gap-2'>
				{Icon && (
					<div className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: 'var(--color-primary-100)' }}>
						<Icon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary-600)' }} />
					</div>
				)}
				<span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--color-primary-600)' }}>{children}</span>
			</div>
			{button}
		</div>
	);
}

/* ═══════════════════════════════════════════
   LIST EDITOR
═══════════════════════════════════════════ */
function ListEditor({ label, icon: Icon, items, placeholder, onChange, onAdd, onRemove, numbered = false }) {
	return (
		<SCard>
			<SLabel
				icon={Icon}
				button={
					<button
						onClick={onAdd}
						className="flex w-fit px-2 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-2 text-xs font-bold transition-all hover:border-solid hover:bg-[color:var(--color-primary-50)]"
						style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-600)' }}
					>
						<Plus className="h-3.5 w-3.5" />
					</button>
				}
			>
				{label}
			</SLabel>

			<div className="space-y-2">
				<AnimatePresence initial={false}>
					{(items || []).map((item, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, x: -8 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -8 }}
							transition={{ duration: 0.16 }}
							className="flex items-center gap-2"
						>
							{numbered ? (
								<span
									className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[9px] font-black text-white"
									style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' }}
								>
									{i + 1}
								</span>
							) : (
								<span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-primary-400)' }} />
							)}
							<MiniField value={item} placeholder={placeholder} onChange={e => onChange(i, e.target.value)} className="flex-1" />
							<button
								onClick={() => onRemove(i)}
								className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition-all hover:bg-rose-50"
								style={{ borderColor: '#fecaca', color: '#ef4444' }}
							>
								<X className="h-3 w-3" />
							</button>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</SCard>
	);
}

/* ═══════════════════════════════════════════
   SLIDE PANEL
═══════════════════════════════════════════ */
function SlidePanel({ open, onClose, onSave, initial, loading }) {
	const t = useTranslations('recipesPage.slidePanel');
	const tCat = useTranslations('recipesPage.categories');
	const tS = useTranslations('recipesPage.slidePanel.satietyOptions');

	const [form, setForm] = useState(EMPTY_FORM);
	const fileRef = useRef();

	useEffect(() => {
		setForm(initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM);
	}, [initial, open]);

	const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);
	const addList = k => set(k, [...(form[k] || []), '']);
	const updList = (k, i, v) => {
		const a = [...(form[k] || [])];
		a[i] = v;
		set(k, a);
	};
	const remList = (k, i) => set(k, (form[k] || []).filter((_, x) => x !== i));

	const handleImg = e => {
		const f = e.target.files?.[0];
		if (!f) return;
		const preview = URL.createObjectURL(f);
		set('imageFile', f);
		set('imageUrl', preview);
	};

	const handleSave = () => {
		if (!form.title?.trim()) return;
		onSave?.(form);
	};

	const CATEGORY_PRESETS = [
		{ value: 'breakfast', label: tCat('breakfast'), emoji: '🌅' },
		{ value: 'lunch', label: tCat('lunch'), emoji: '☀️' },
		{ value: 'dinner', label: tCat('dinner'), emoji: '🌙' },
		{ value: 'snack', label: tCat('snack'), emoji: '🌿' },
	];

	const SATIETY_OPTS = [
		{ value: 'low', label: tS('low') },
		{ value: 'medium', label: tS('medium') },
		{ value: 'high', label: tS('high') }
	];

	const total = ((+form.protein) || 0) + ((+form.carbs) || 0) + ((+form.fat) || 0) || 1;
	const isValid = !!form.title?.trim();

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.22 }}
						className="fixed inset-0 z-[1000]"
						style={{ background: 'rgba(26,18,8,0.52)', backdropFilter: 'blur(6px)' }}
						onClick={onClose}
					/>

					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 34, mass: 1.05 }}
						className="fixed inset-y-0 rtl:start-0 ltr:end-0 z-[1000] flex w-full flex-col sm:max-w-[490px]"
						style={{ background: 'var(--color-primary-50)', boxShadow: '-32px 0 100px -8px rgba(26,18,8,0.26)' }}
					>
						<div className="relative flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}>
							<div className="absolute inset-x-0 top-0 h-0.5" style={{ background: 'linear-gradient(90deg,var(--color-gradient-from),var(--color-gradient-to))' }} />
							<div className="flex items-center gap-3">
								<div
									className="grid h-10 w-10 place-items-center rounded-2xl"
									style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', boxShadow: '0 4px 14px rgba(201,123,46,0.35)' }}
								>
									<BookOpen className="h-5 w-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-black" style={{ color: 'var(--ink)' }}>{initial ? t('editTitle') : t('addTitle')}</p>
									<p className="text-[10px] font-semibold" style={{ color: 'var(--color-primary-500)' }}>{t('fromCookbook')}</p>
								</div>
							</div>
							<button
								onClick={onClose}
								className="grid h-8 w-8 place-items-center rounded-xl border transition-all hover:bg-slate-100"
								style={{ borderColor: 'var(--color-primary-200)', color: 'var(--ink-lt)' }}
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto space-y-4 p-5">
							<div
								onClick={() => fileRef.current?.click()}
								className="relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all hover:border-[color:var(--color-primary-400)]"
								style={{ height: 156, borderColor: 'var(--color-primary-200)', background: form.imageUrl ? 'transparent' : 'white' }}
							>
								{form.imageUrl ? (
									<>
										<img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
										<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 opacity-0 hover:opacity-100 transition-opacity">
											<Camera className="h-6 w-6 text-white" />
											<span className="text-xs font-bold text-white">{t('changePhoto')}</span>
										</div>
									</>
								) : (
									<div className="flex flex-col items-center gap-2.5">
										<div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: 'var(--color-primary-100)' }}>
											<ImageIcon className="h-6 w-6" style={{ color: 'var(--color-primary-400)' }} />
										</div>
										<p className="text-xs font-bold" style={{ color: 'var(--color-primary-600)' }}>{t('uploadPhoto')}</p>
										<p className="text-[10px]" style={{ color: 'var(--color-primary-400)' }}>{t('photoFormats')}</p>
									</div>
								)}
								<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
							</div>

							<SCard>
								<SLabel icon={FileText}>{t('sections.info')}</SLabel>
								<div className="space-y-3">
									<div className='grid grid-cols-2 gap-2'>
										<MiniField value={form.title} placeholder={t('fields.recipeName')} onChange={e => set('title', e.target.value)} />
										<CategoryCombo
											value={form.category}
											onChange={v => set('category', v)}
											presets={CATEGORY_PRESETS}
											placeholder={t('fields.category')}
										/>
									</div>

									<div className='flex items-center gap-2 w-full'>
										<p className="mb-1.5 text-[10px] font-bold" style={{ color: 'var(--color-primary-600)' }}>{t('fields.satiety')}</p>
										<SegmentControl cn={"!max-w-[300px] rtl:mr-auto w-full"} value={form.satiety} onChange={v => set('satiety', v)} options={SATIETY_OPTS} id="sat" />
									</div>
								</div>
							</SCard>

							<SCard>
								<SLabel icon={Flame}>{t('sections.nutrition')}</SLabel>
								<div className="grid grid-cols-4 gap-2">
									<NutritionTile label={t('fields.calories')} value={form.calories} onChange={v => set('calories', v)} color="var(--color-primary-500)" icon={Flame} unit={t('fields.kcal')} />
									<NutritionTile label={t('fields.protein')} value={form.protein} onChange={v => set('protein', v)} color="#3b82f6" icon={Beef} unit={t('fields.grams')} />
									<NutritionTile label={t('fields.carbs')} value={form.carbs} onChange={v => set('carbs', v)} color="#f59e0b" icon={Wheat} unit={t('fields.grams')} />
									<NutritionTile label={t('fields.fat')} value={form.fat} onChange={v => set('fat', v)} color="#ec4899" icon={Droplets} unit={t('fields.grams')} />
								</div>

								{(form.protein || form.carbs || form.fat) && (
									<div className="mt-4 space-y-1.5">
										<p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-primary-500)' }}>{t('macroPreview')}</p>
										<div className="flex h-2.5 overflow-hidden rounded-full gap-0.5">
											{[
												[(+form.protein || 0), '#3b82f6'],
												[(+form.carbs || 0), '#f59e0b'],
												[(+form.fat || 0), '#ec4899']
											].map(([v, c], i) => (
												<motion.div
													key={i}
													className="rounded-full"
													style={{ width: `${(v / total) * 100}%`, background: c }}
													initial={{ width: 0 }}
													animate={{ width: `${(v / total) * 100}%` }}
													transition={{ duration: 0.35, delay: i * 0.08 }}
												/>
											))}
										</div>
									</div>
								)}
							</SCard>

							<ListEditor
								label={t('sections.ingredients')}
								icon={Utensils}
								items={form.ingredients}
								placeholder={t('fields.ingredientPlaceholder')}
								onChange={(i, v) => updList('ingredients', i, v)}
								onAdd={() => addList('ingredients')}
								onRemove={i => remList('ingredients', i)}
							/>

							<ListEditor
								label={t('sections.creamIngredients')}
								icon={Soup}
								items={form.creamIngredients}
								placeholder={t('fields.ingredientPlaceholder')}
								onChange={(i, v) => updList('creamIngredients', i, v)}
								onAdd={() => addList('creamIngredients')}
								onRemove={i => remList('creamIngredients', i)}
							/>

							<ListEditor
								label={t('sections.sauceIngredients')}
								icon={Soup}
								items={form.sauceIngredients}
								placeholder={t('fields.ingredientPlaceholder')}
								onChange={(i, v) => updList('sauceIngredients', i, v)}
								onAdd={() => addList('sauceIngredients')}
								onRemove={i => remList('sauceIngredients', i)}
							/>

							<ListEditor
								label={t('sections.directions')}
								icon={ListChecks}
								items={form.directions}
								placeholder={t('fields.stepPlaceholder')}
								onChange={(i, v) => updList('directions', i, v)}
								onAdd={() => addList('directions')}
								onRemove={i => remList('directions', i)}
								numbered
							/>

							<SCard>
								<SLabel icon={Lightbulb}>{t('sections.tips')}</SLabel>
								<MiniTextArea value={form.tips} placeholder={t('fields.tipsPlaceholder')} onChange={v => set('tips', v)} rows={2} />
							</SCard>

							<SCard>
								<SLabel icon={Link2}>{t('sections.video')}</SLabel>
								<MiniField
									value={form.videoUrl}
									placeholder={t('fields.videoPlaceholder')}
									onChange={e => set('videoUrl', e.target.value)}
									iconLeft={<Link2 className="h-3.5 w-3.5 text-slate-400" />}
								/>
							</SCard>

							<div className="h-2" />
						</div>

						<div className="shrink-0 border-t px-5 py-4" style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}>
							<div className="flex gap-2.5">
								<button
									onClick={onClose}
									className="flex h-11 flex-1 items-center justify-center rounded-2xl border text-sm font-bold transition-all hover:bg-slate-50"
									style={{ borderColor: 'var(--color-primary-200)', color: 'var(--ink-mid)' }}
								>
									{t('cancel')}
								</button>
								<motion.button
									whileHover={{ scale: 1.01 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleSave}
									disabled={!isValid || loading}
									className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-40"
									style={{
										background: isValid ? 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' : '#cbd5e1',
										boxShadow: isValid ? '0 6px 20px rgba(201,123,46,0.38)' : 'none'
									}}
								>
									<Check className="h-4 w-4" strokeWidth={3} />
									{loading ? t('saving') : initial ? t('save') : t('add')}
								</motion.button>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

/* ═══════════════════════════════════════════
   RECIPE CARD
═══════════════════════════════════════════ */
function RecipeCard({ recipe, idx, onDelete, onEdit }) {
	const t = useTranslations('recipesPage.card');
	const tCat = useTranslations('recipesPage.categories');

	const [expanded, setExpanded] = useState(false);
	const [hovered, setHovered] = useState(false);

	const total = (recipe.protein || 0) + (recipe.carbs || 0) + (recipe.fat || 0) || 1;

	return (
		<motion.div
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.96 }}
			transition={{ delay: idx * 0.05, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
			layout
			onHoverStart={() => setHovered(true)}
			onHoverEnd={() => setHovered(false)}
			className="relative flex flex-col overflow-hidden rounded-2xl border bg-white"
			style={{
				borderColor: 'var(--color-primary-100)',
				boxShadow: hovered ? '0 16px 48px rgba(201,123,46,0.16),0 4px 12px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.04)',
				transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
				transition: 'box-shadow 0.3s,transform 0.3s',
			}}
		>
			<div className="h-0.5" style={{ background: 'linear-gradient(90deg,var(--color-gradient-from),var(--color-gradient-to))' }} />

			<div
				className="relative overflow-hidden"
				style={{ height: 168, background: 'linear-gradient(135deg,var(--color-primary-50),var(--color-primary-100))' }}
			>
				{recipe.imageUrl ? (
					<img
						src={recipe.imageUrl}
						alt={recipe.title}
						className="h-full w-full object-cover"
						style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.5s' }}
					/>
				) : (
					<div className="flex h-full items-center justify-center opacity-20">
						<BookMarked className="h-10 w-10" style={{ color: 'var(--color-primary-500)' }} />
					</div>
				)}
				<div className="absolute bottom-2.5 start-2.5">
					<span
						className="inline-flex items-center rounded-xl px-2.5 py-1 text-[10px] font-black uppercase text-white"
						style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
					>
						{tCat(recipe.category) || recipe.category}
					</span>
				</div>
			</div>

			<div className="flex flex-1 flex-col p-4">
				<div className="mb-2 flex items-start gap-2">
					<h3 className="flex-1 text-sm font-black leading-snug" style={{ color: 'var(--ink)' }}>{recipe.title}</h3>
				</div>

				<div className="mb-3 flex flex-wrap gap-1.5">
					{recipe.satiety && (
						<span
							className="rounded-lg px-2 py-0.5 text-[10px] font-black"
							style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}
						>
							{t('satiety')}: {recipe.satiety}
						</span>
					)}
				</div>

				<div className="mb-3 rounded-xl border p-3" style={{ background: 'var(--cream)', borderColor: 'var(--border)' }}>
					<p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--color-primary-600)' }}>
						{t('nutrition')}
					</p>
					<div className="flex items-end justify-between">
						<div>
							<p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-lt)' }}>{t('calories')}</p>
							<p className="text-2xl font-black leading-none" style={{ color: 'var(--color-primary-700)' }}>{recipe.calories}</p>
						</div>
						<div className="flex gap-3">
							{[[t('carbs'), recipe.carbs, '#f59e0b'], [t('protein'), recipe.protein, '#3b82f6'], [t('fat'), recipe.fat, '#ec4899']].map(([label, val, color]) => (
								<div key={label} className="text-center">
									<p className="text-sm font-black" style={{ color: 'var(--ink)' }}>{val}g</p>
									<div className="mx-auto my-1 h-1 w-5 rounded-full" style={{ background: color }} />
									<p className="text-[9px] font-bold" style={{ color: 'var(--ink-lt)' }}>{label}</p>
								</div>
							))}
						</div>
					</div>
					<div className="mt-2 flex h-1.5 overflow-hidden rounded-full gap-0.5">
						{[[recipe.carbs, '#f59e0b'], [recipe.protein, '#3b82f6'], [recipe.fat, '#ec4899']].map(([v, c], i) => (
							<div key={i} className="rounded-full" style={{ width: `${(v / total) * 100}%`, background: c }} />
						))}
					</div>
				</div>

				<AnimatePresence initial={false}>
					{expanded && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
							className="overflow-hidden"
						>
							<div className="mb-3 space-y-4 pt-1">
								<div>
									<p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-primary-600)' }}>{t('ingredients')}</p>
									<ul className="space-y-1">
										{recipe.ingredients?.map((ing, i) => (
											<li key={i} className="flex items-start gap-2 text-xs font-medium" style={{ color: 'var(--ink-mid)' }}>
												<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-primary-400)' }} />
												{ing}
											</li>
										))}
									</ul>

									{recipe.creamIngredients?.length > 0 && (
										<>
											<p className="mt-3 mb-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ink-lt)' }}>{t('creamIngredients')}</p>
											<ul className="space-y-1">
												{recipe.creamIngredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-xs font-medium" style={{ color: 'var(--ink-lt)' }}>
														<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
														{ing}
													</li>
												))}
											</ul>
										</>
									)}

									{recipe.sauceIngredients?.length > 0 && (
										<>
											<p className="mt-3 mb-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ink-lt)' }}>{t('sauceIngredients')}</p>
											<ul className="space-y-1">
												{recipe.sauceIngredients.map((ing, i) => (
													<li key={i} className="flex items-start gap-2 text-xs font-medium" style={{ color: 'var(--ink-lt)' }}>
														<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
														{ing}
													</li>
												))}
											</ul>
										</>
									)}
								</div>

								<div>
									<p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-primary-600)' }}>{t('directions')}</p>
									<ol className="space-y-1.5">
										{recipe.directions?.map((step, i) => (
											<li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--ink-mid)' }}>
												<span className="shrink-0 font-black" style={{ color: 'var(--color-primary-500)' }}>{i + 1}.</span>
												{step}
											</li>
										))}
									</ol>
								</div>

								{recipe.tips && (
									<div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
										<Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
										<p className="text-xs font-medium text-amber-800">{recipe.tips}</p>
									</div>
								)}

								{recipe.videoUrl && (
									<a
										href={recipe.videoUrl}
										target="_blank"
										rel="noreferrer"
										className="flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-colors hover:bg-slate-50"
										style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-700)' }}
									>
										<PlayCircle className="h-4 w-4" />
										{t('watchVideo')}
									</a>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<button
					onClick={() => setExpanded(e => !e)}
					className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-bold transition-all"
					style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-600)', background: expanded ? 'var(--color-primary-50)' : 'white' }}
				>
					{expanded ? t('hideFull') : t('viewFull')}
					<motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
						<ChevronDown className="h-3.5 w-3.5" />
					</motion.span>
				</button>

				<div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-primary-100)' }}>
					<div className="flex gap-1.5">
						<button
							onClick={() => onEdit(recipe)}
							className="inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-bold transition-all hover:-translate-y-0.5"
							style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-700)', background: 'var(--color-primary-50)' }}
						>
							<Edit2 className="h-3.5 w-3.5" />
							{t('edit')}
						</button>
						<button
							onClick={() => onDelete(recipe.id)}
							className="inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-bold transition-all hover:-translate-y-0.5"
							style={{ borderColor: '#fecaca', color: '#dc2626', background: '#fff1f2' }}
						>
							<Trash2 className="h-3.5 w-3.5" />
							{t('delete')}
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

/* ═══════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════ */
function Pagination({ page, total, perPage, onChange }) {
	const pages = Math.ceil(total / perPage);
	if (pages <= 1) return null;

	return (
		<div className="flex items-center justify-center gap-2 pt-8">
			<button
				disabled={page === 1}
				onClick={() => onChange(page - 1)}
				className="grid h-9 w-9 place-items-center rounded-xl border font-bold transition-all disabled:opacity-30"
				style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-600)' }}
			>
				<ChevronRight className="h-4 w-4" />
			</button>

			{Array.from({ length: pages }, (_, i) => i + 1).map(p => (
				<button
					key={p}
					onClick={() => onChange(p)}
					className="grid h-9 w-9 place-items-center rounded-xl border text-sm font-black transition-all"
					style={p === page
						? { background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 14px rgba(201,123,46,0.38)' }
						: { borderColor: 'var(--color-primary-100)', color: 'var(--color-primary-600)', background: 'white' }}
				>
					{p}
				</button>
			))}

			<button
				disabled={page === pages}
				onClick={() => onChange(page + 1)}
				className="grid h-9 w-9 place-items-center rounded-xl border font-bold transition-all disabled:opacity-30"
				style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-600)' }}
			>
				<ChevronLeft className="h-4 w-4" />
			</button>
		</div>
	);
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function splitTipsText(value) {
	if (!value) return [];
	return value
		.split('\n')
		.map(v => v.trim())
		.filter(Boolean);
}

function mapRecipeFromApi(item) {
	return {
		id: item.id,
		title: item.title || '',
		satiety: item.satiety_index || 'medium',
		category: item.meal_type || '',
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
		imageUrl: item.image_url ? `${process.env.NEXT_PUBLIC_BASE_URL}${item.image_url}` : '',
		imageFile: null,
		createdAt: item.created_at,
		updatedAt: item.updated_at,
	};
}

function buildRecipeFormData(form) {
	const fd = new FormData();

	fd.append('title', form.title || '');
	fd.append('satiety_index', form.satiety || 'medium');
	fd.append('meal_type', form.category || '');
	fd.append('video_url', form.videoUrl || '');
	fd.append('nutrition', JSON.stringify({
		calories: Number(form.calories || 0),
		carbs_g: Number(form.carbs || 0),
		protein_g: Number(form.protein || 0),
		fat_g: Number(form.fat || 0),
	}));
	fd.append('ingredients', JSON.stringify((form.ingredients || []).map(v => v.trim()).filter(Boolean)));
	fd.append('cream_ingredients', JSON.stringify((form.creamIngredients || []).map(v => v.trim()).filter(Boolean)));
	fd.append('sauce_ingredients', JSON.stringify((form.sauceIngredients || []).map(v => v.trim()).filter(Boolean)));
	fd.append('directions', JSON.stringify((form.directions || []).map(v => v.trim()).filter(Boolean)));
	fd.append('tips', JSON.stringify(splitTipsText(form.tips)));

	if (form.imageFile) {
		fd.append('image', form.imageFile);
	}

	return fd;
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function RecipesPage() {
	const t = useTranslations('recipesPage');
	const ts = useTranslations('recipesPage.stats');
	const tF = useTranslations('recipesPage.filters');
	const tCat = useTranslations('recipesPage.categories');
	const tSrch = useTranslations('recipesPage.search');
	const tEmt = useTranslations('recipesPage.empty');

	const [recipes, setRecipes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [slideOpen, setSlideOpen] = useState(false);
	const [editRecipe, setEditRecipe] = useState(null);

	const PER_PAGE = 6;

	const TABS = [
		{ id: 'all', label: t('tabs.all'), icon: BookOpen },
		{ id: 'breakfast', label: tCat('breakfast'), icon: BookOpen },
		{ id: 'lunch', label: tCat('lunch'), icon: BookOpen },
		{ id: 'dinner', label: tCat('dinner'), icon: BookOpen },
		{ id: 'snack', label: tCat('snack'), icon: BookOpen },
	];

	const fetchRecipes = useCallback(async () => {
		try {
			setLoading(true);

			const params = {
				page,
				limit: PER_PAGE,
			};

			if (searchQuery.trim()) params.search = searchQuery.trim();
			if (activeTab !== 'all') params.meal_type = activeTab;

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
	}, [page, searchQuery, activeTab]);

	useEffect(() => {
		fetchRecipes();
	}, [fetchRecipes]);

	const stats = useMemo(() => [
		{ label: ts('totalRecipes'), value: total, icon: BookOpen },
		{ label: ts('shownOnPage'), value: recipes.length, icon: Eye },
		{ label: ts('avgCalories'), value: recipes.length ? Math.round(recipes.reduce((s, r) => s + (Number(r.calories) || 0), 0) / recipes.length) : 0, icon: Flame },
	], [recipes, total, ts]);

	const tabsWithCount = TABS.map(tab => ({
		...tab,
		count: undefined,
	}));

	const handleDelete = async id => {
		try {
			await axios.delete(`${API_BASE}/recipes/${id}`);
			if (recipes.length === 1 && page > 1) {
				setPage(prev => prev - 1);
			} else {
				fetchRecipes();
			}
		} catch (error) {
			console.error('Failed to delete recipe:', error);
		}
	};

	const handleEdit = recipe => {
		setEditRecipe(recipe);
		setSlideOpen(true);
	};

	const handleAdd = () => {
		setEditRecipe(null);
		setSlideOpen(true);
	};

	const handleSave = async form => {
		try {
			setSaving(true);
			const payload = buildRecipeFormData(form);

			if (editRecipe?.id) {
				await axios.put(`${API_BASE}/recipes/${editRecipe.id}`, payload, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});
			} else {
				await axios.post(`${API_BASE}/recipes`, payload, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});
			}

			setSlideOpen(false);
			setEditRecipe(null);
			setPage(1);
			await fetchRecipes();
		} catch (error) {
			console.error('Failed to save recipe:', error);
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<div className="min-h-screen pb-16" style={{ background: 'var(--cream)', fontFamily: "'Cairo', system-ui, sans-serif" }}>
				<PageHeader
					title={t('page.title')}
					desc={t('page.desc')}
					icon={BookMarked}
					stats={stats}
					tabs={tabsWithCount}
					activeTab={activeTab}
					onTabChange={id => {
						setActiveTab(id);
						setPage(1);
					}}
					filters={[]}
					filterValues={{}}
					onFilterChange={() => {}}
					onFilterReset={() => {}}
					actions={
						<motion.button
							whileHover={{ scale: 1.04 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAdd}
							className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black text-white"
							style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3),0 4px 16px rgba(0,0,0,0.1)' }}
						>
							<Plus className="h-4 w-4" />
							{t('addButton')}
						</motion.button>
					}
				/>

				<div
					className="border-x border-b bg-white px-5 pb-10 pt-5 sm:px-6 lg:px-8"
					style={{ borderColor: 'var(--color-primary-100)', borderRadius: '0 0 24px 24px', boxShadow: '0 12px 40px rgba(201,123,46,0.07)' }}
				>
					<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
						<div className="relative w-full max-w-sm">
							<Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" style={{ insetInlineStart: 12, color: 'var(--ink)' }} />
							<input
								value={searchQuery}
								onChange={e => {
									setSearchQuery(e.target.value);
									setPage(1);
								}}
								placeholder={tSrch('placeholder')}
								className="h-10 w-full rounded-xl border ps-9 pe-9 text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all"
								style={{ borderColor: 'var(--color-primary-200)', color: 'var(--ink)', background: 'var(--paper)' }}
							/>
							{searchQuery && (
								<button
									onClick={() => {
										setSearchQuery('');
										setPage(1);
									}}
									className="absolute top-1/2 -translate-y-1/2"
									style={{ insetInlineEnd: 12, color: 'var(--ink-lt)' }}
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</div>

						<div className="flex items-center gap-3">
							<span className="text-sm font-bold" style={{ color: 'var(--ink-lt)' }}>
								{total} {total === 1 ? tSrch('results') : tSrch('results_plural')}
							</span>
						</div>
					</div>

					<AnimatePresence mode="wait">
						{loading ? (
							<motion.div
								key="loading"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="flex flex-col items-center justify-center py-24"
							>
								<p className="text-sm font-bold" style={{ color: 'var(--ink-lt)' }}>{t('loading')}</p>
							</motion.div>
						) : recipes.length === 0 ? (
							<motion.div
								key="empty"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="flex flex-col items-center justify-center py-24"
							>
								<div
									className="mb-5 grid h-20 w-20 place-items-center rounded-3xl"
									style={{ background: 'linear-gradient(135deg,var(--color-primary-100),var(--color-primary-50))' }}
								>
									<BookOpen className="h-9 w-9" style={{ color: 'var(--color-primary-300)' }} />
								</div>
								<p className="text-lg font-black" style={{ color: 'var(--ink-mid)' }}>{tEmt('title')}</p>
								<p className="mt-1 text-sm" style={{ color: 'var(--ink-lt)' }}>{tEmt('desc')}</p>
								<motion.button
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									onClick={handleAdd}
									className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white"
									style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', boxShadow: '0 6px 20px rgba(201,123,46,0.35)' }}
								>
									<Plus className="h-4 w-4" />
									{tEmt('addFirst')}
								</motion.button>
							</motion.div>
						) : (
							<motion.div
								key={activeTab + searchQuery + page}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.18 }}
								className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
							>
								{recipes.map((recipe, i) => (
									<RecipeCard
										key={recipe.id}
										recipe={recipe}
										idx={i}
										onDelete={handleDelete}
										onEdit={handleEdit}
									/>
								))}
							</motion.div>
						)}
					</AnimatePresence>

					<Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
				</div>
			</div>

			<SlidePanel
				open={slideOpen}
				onClose={() => {
					setSlideOpen(false);
					setEditRecipe(null);
				}}
				onSave={handleSave}
				initial={editRecipe}
				loading={saving}
			/>
		</>
	);
}