'use client';

import axios from 'axios';
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
	Flame, Plus, Trash2, Edit2,
	Beef, Wheat, Droplets, X, BookOpen,
	Check, Image as ImageIcon, Lightbulb, PlayCircle, BookMarked,
	Camera, Link2, Utensils, ListChecks, FileText, Soup,
	ChevronDown, Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/molecules/PageHeader';

import ActionButtons from '@/components/atoms/Actions';
import DataTable from '@/components/atoms/Datatable';

const API_BASE = `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1`;

/* ─── EMPTY FORM ─────────────────────────────────────────────────────────── */
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

/* ─── FLOATING LABEL ─────────────────────────────────────────────────────── */
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
					letterSpacing: '0.05em',
				}}
			>
				{text}
			</motion.span>
		)}
	</AnimatePresence>
);

const BASE =
	'h-[36px] w-full rounded-lg border bg-white px-3 text-xs font-semibold outline-none transition-all duration-150 placeholder:text-slate-300 focus:ring-2 focus:ring-[color:var(--color-primary-200)] focus:border-[color:var(--color-primary-400)]';
const filled = 'border-[color:var(--color-primary-300)] text-slate-800';
const unfilled = 'border-slate-200 text-slate-700 hover:border-slate-300';

const MiniField = memo(function MiniField({
	value,
	placeholder,
	onChange,
	type = 'text',
	iconLeft = null,
	className = '',
	cnParent = '',
	readOnly = false,
}) {
	const has = String(value ?? '').trim().length > 0;
	return (
		<div className={`relative w-full ${cnParent}`}>
			<FloatLabel show={has} text={placeholder} />
			{iconLeft && (
				<span
					className="pointer-events-none absolute z-10 top-1/2 -translate-y-1/2 opacity-40"
					style={{ insetInlineStart: 10 }}
				>
					{iconLeft}
				</span>
			)}
			<input
				value={value ?? ''}
				type={type}
				placeholder={placeholder}
				onChange={onChange}
				readOnly={readOnly}
				className={[BASE, iconLeft ? 'ps-8' : '', has ? filled : unfilled, className].join(' ')}
			/>
		</div>
	);
});

const MiniTextArea = memo(function MiniTextArea({ value, placeholder, onChange, rows = 3 }) {
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
					'w-full rounded-lg border bg-white px-3 py-2.5 text-xs font-semibold leading-relaxed outline-none transition-all duration-150 placeholder:text-slate-300 resize-none focus:ring-2 focus:ring-[color:var(--color-primary-200)] focus:border-[color:var(--color-primary-400)]',
					has ? filled : unfilled,
				].join(' ')}
			/>
		</div>
	);
});

function SegmentControl({ value, onChange, options, cn: cls, id }) {
	return (
		<div
			className={`flex ${cls} gap-1 rounded-lg border p-1`}
			style={{ borderColor: 'var(--color-primary-100)', background: 'var(--color-primary-50)' }}
		>
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

function CategoryCombo({ value, onChange, presets, placeholder }) {
	const [open, setOpen] = useState(false);
	const ref = useRef();
	const preset = presets.find(c => c.value === value);
	const displayVal = preset ? preset.label : value ?? '';
	const has = !!value;

	useEffect(() => {
		const h = e => {
			if (!ref.current?.contains(e.target)) setOpen(false);
		};
		document.addEventListener('mousedown', h);
		return () => document.removeEventListener('mousedown', h);
	}, []);

	return (
		<div ref={ref} className="relative w-full">
			<FloatLabel show={has} text={placeholder} />
			<div
				className={[
					'flex h-[36px] w-full items-center rounded-lg border bg-white ps-3 pe-2 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-[color:var(--color-primary-200)] focus-within:border-[color:var(--color-primary-400)]',
					has ? 'border-[color:var(--color-primary-300)]' : 'border-slate-200 hover:border-slate-300',
				].join(' ')}
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
					onClick={e => {
						e.stopPropagation();
						setOpen(o => !o);
					}}
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
						className="absolute inset-x-0 top-full z-[200] mt-1.5 overflow-hidden rounded-lg border bg-white"
						style={{
							borderColor: 'var(--color-primary-100)',
							boxShadow: '0 16px 48px rgba(201,123,46,0.18),0 2px 8px rgba(0,0,0,0.06)',
						}}
					>
						<div className="p-1.5">
							{presets.map(c => (
								<button
									key={c.value}
									type="button"
									onClick={() => {
										onChange(c.value);
										setOpen(false);
									}}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
									style={{
										color: value === c.value ? 'var(--color-primary-700)' : 'var(--ink-mid)',
										background: value === c.value ? 'var(--color-primary-50)' : 'transparent',
									}}
								>
									<span className="text-base w-6 text-center">{c.emoji}</span>
									<span>{c.label}</span>
									{value === c.value && (
										<Check className="ms-auto h-3.5 w-3.5" style={{ color: 'var(--color-primary-500)' }} />
									)}
								</button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function NutritionTile({ label, value, onChange, color, icon: Icon, unit }) {
	const [focused, setFocused] = useState(false);

	return (
		<div
			className="flex flex-col gap-1.5 rounded-lg border p-3 transition-all"
			style={{
				borderColor: focused ? color : 'var(--color-primary-100)',
				background: focused ? `${color}0d` : 'white',
				boxShadow: focused ? `0 0 0 3px ${color}18` : 'none',
			}}
		>
			<div className="flex items-center gap-1.5">
				{Icon && <Icon className="h-3 w-3" style={{ color, opacity: 0.75 }} />}
				<span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color }}>
					{label}
				</span>
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

			<span className="text-[9px] font-semibold" style={{ color: 'var(--color-primary-400)' }}>
				{unit}
			</span>
		</div>
	);
}

function SCard({ children, className = '' }) {
	return (
		<div
			className={`rounded-lg border p-4 ${className}`}
			style={{ borderColor: 'var(--color-primary-100)', background: 'rgba(253,248,240,0.55)' }}
		>
			{children}
		</div>
	);
}

function SLabel({ icon: Icon, children, button }) {
	return (
		<div className="mb-3 flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				{Icon && (
					<div className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: 'var(--color-primary-100)' }}>
						<Icon className="h-3.5 w-3.5" style={{ color: 'var(--color-primary-600)' }} />
					</div>
				)}
				<span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--color-primary-600)' }}>
					{children}
				</span>
			</div>
			{button}
		</div>
	);
}

function ListEditor({ label, icon: Icon, items, placeholder, onChange, onAdd, onRemove, numbered = false }) {
	return (
		<SCard>
			<SLabel
				icon={Icon}
				button={
					<button
						onClick={onAdd}
						className="flex w-fit px-2 items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-2 text-xs font-bold transition-all hover:border-solid hover:bg-[color:var(--color-primary-50)]"
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

							<MiniField
								value={item}
								placeholder={placeholder}
								onChange={e => onChange(i, e.target.value)}
								className="flex-1"
							/>

							<button
								onClick={() => onRemove(i)}
								className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-all hover:bg-rose-50"
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

/* ─── SLIDE PANEL ────────────────────────────────────────────────────────── */
function SlidePanel({ open, onClose, onSave, initial, loading, categoryPresets = [] }) {
	const t = useTranslations('recipeLibrary.slidePanel');
	const tCat = useTranslations('recipeLibrary.categories');
	const tS = useTranslations('recipeLibrary.slidePanel.satietyOptions');

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
		set('imageFile', f);
		set('imageUrl', URL.createObjectURL(f));
	};

	const fallbackPresets = [
		{ value: 'breakfast', label: tCat('breakfast'), emoji: '🌅' },
		{ value: 'lunch', label: tCat('lunch'), emoji: '☀️' },
		{ value: 'dinner', label: tCat('dinner'), emoji: '🌙' },
		{ value: 'snack', label: tCat('snack'), emoji: '🌿' },
	];

	const CATEGORY_PRESETS = categoryPresets.length ? categoryPresets : fallbackPresets;

	const SATIETY_OPTS = [
		{ value: 'low', label: tS('low') },
		{ value: 'medium', label: tS('medium') },
		{ value: 'high', label: tS('high') },
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
						<div
							className="relative flex shrink-0 items-center justify-between border-b px-5 py-4"
							style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}
						>
							<div
								className="absolute inset-x-0 top-0 h-0.5"
								style={{ background: 'linear-gradient(90deg,var(--color-gradient-from),var(--color-gradient-to))' }}
							/>
							<div className="flex items-center gap-3">
								<div
									className="grid h-10 w-10 place-items-center rounded-lg"
									style={{
										background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))',
										boxShadow: '0 4px 14px rgba(201,123,46,0.35)',
									}}
								>
									<BookOpen className="h-5 w-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-black" style={{ color: 'var(--ink)' }}>
										{initial ? t('editTitle') : t('addTitle')}
									</p>
									<p className="text-[10px] font-semibold" style={{ color: 'var(--color-primary-500)' }}>
										{t('fromCookbook')}
									</p>
								</div>
							</div>

							<button
								onClick={onClose}
								className="grid h-8 w-8 place-items-center rounded-lg border transition-all hover:bg-slate-100"
								style={{ borderColor: 'var(--color-primary-200)', color: 'var(--ink-lt)' }}
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto space-y-4 p-5">
							<div
								onClick={() => fileRef.current?.click()}
								className="relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-all hover:border-[color:var(--color-primary-400)]"
								style={{
									height: 156,
									borderColor: 'var(--color-primary-200)',
									background: form.imageUrl ? 'transparent' : 'white',
								}}
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
										<div className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: 'var(--color-primary-100)' }}>
											<ImageIcon className="h-6 w-6" style={{ color: 'var(--color-primary-400)' }} />
										</div>
										<p className="text-xs font-bold" style={{ color: 'var(--color-primary-600)' }}>
											{t('uploadPhoto')}
										</p>
										<p className="text-[10px]" style={{ color: 'var(--color-primary-400)' }}>
											{t('photoFormats')}
										</p>
									</div>
								)}
								<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
							</div>

							<SCard>
								<SLabel icon={FileText}>{t('sections.info')}</SLabel>
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-2">
										<MiniField
											value={form.title}
											placeholder={t('fields.recipeName')}
											onChange={e => set('title', e.target.value)}
										/>
										<CategoryCombo
											value={form.category}
											onChange={v => set('category', v)}
											presets={CATEGORY_PRESETS}
											placeholder={t('fields.category')}
										/>
									</div>

									<div className="flex items-center gap-2 w-full">
										<p className="mb-1.5 text-[10px] font-bold" style={{ color: 'var(--color-primary-600)' }}>
											{t('fields.satiety')}
										</p>
										<SegmentControl
											cn="!max-w-[300px] rtl:mr-auto w-full"
											value={form.satiety}
											onChange={v => set('satiety', v)}
											options={SATIETY_OPTS}
											id="sat"
										/>
									</div>
								</div>
							</SCard>

							<SCard>
								<SLabel icon={Flame}>{t('sections.nutrition')}</SLabel>
								<div className="grid grid-cols-4 gap-2">
									<NutritionTile
										label={t('fields.calories')}
										value={form.calories}
										onChange={v => set('calories', v)}
										color="var(--color-primary-500)"
										icon={Flame}
										unit={t('fields.kcal')}
									/>
									<NutritionTile
										label={t('fields.protein')}
										value={form.protein}
										onChange={v => set('protein', v)}
										color="#3b82f6"
										icon={Beef}
										unit={t('fields.grams')}
									/>
									<NutritionTile
										label={t('fields.carbs')}
										value={form.carbs}
										onChange={v => set('carbs', v)}
										color="#f59e0b"
										icon={Wheat}
										unit={t('fields.grams')}
									/>
									<NutritionTile
										label={t('fields.fat')}
										value={form.fat}
										onChange={v => set('fat', v)}
										color="#ec4899"
										icon={Droplets}
										unit={t('fields.grams')}
									/>
								</div>

								{(form.protein || form.carbs || form.fat) && (
									<div className="mt-4 space-y-1.5">
										<p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-primary-500)' }}>
											{t('macroPreview')}
										</p>
										<div className="flex h-2.5 overflow-hidden rounded-full gap-0.5">
											{[
												[(+form.protein || 0), '#3b82f6'],
												[(+form.carbs || 0), '#f59e0b'],
												[(+form.fat || 0), '#ec4899'],
											].map(([v, c], i) => (
												<motion.div
													key={i}
													className="rounded-full"
													style={{ background: c }}
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
								<MiniTextArea
									value={form.tips}
									placeholder={t('fields.tipsPlaceholder')}
									onChange={v => set('tips', v)}
									rows={2}
								/>
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

						<div
							className="shrink-0 border-t px-5 py-4"
							style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}
						>
							<div className="flex gap-2.5">
								<button
									onClick={onClose}
									className="flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-bold transition-all hover:bg-slate-50"
									style={{ borderColor: 'var(--color-primary-200)', color: 'var(--ink-mid)' }}
								>
									{t('cancel')}
								</button>

								<motion.button
									whileHover={{ scale: 1.01 }}
									whileTap={{ scale: 0.98 }}
									onClick={() => form.title?.trim() && onSave?.(form)}
									disabled={!isValid || loading}
									className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-lg text-sm font-black text-white transition-all disabled:opacity-40"
									style={{
										background: isValid ? 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' : '#cbd5e1',
										boxShadow: isValid ? '0 6px 20px rgba(201,123,46,0.38)' : 'none',
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

/* ─── NUTRITION BADGE ────────────────────────────────────────────────────── */
function NutritionBadge({ calories, protein, carbs, fat }) {
	return (
		<div className="flex items-center gap-2">
			<span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-100 text-[11px] font-bold text-orange-600">
				<Flame size={10} />
				{calories}
			</span>
			<span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-600">
				<Beef size={10} />
				{protein}g
			</span>
			<span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-600">
				<Wheat size={10} />
				{carbs}g
			</span>
			<span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-50 border border-pink-100 text-[11px] font-bold text-pink-600">
				<Droplets size={10} />
				{fat}g
			</span>
		</div>
	);
}

/* ─── CATEGORY BADGE ─────────────────────────────────────────────────────── */
const CAT_STYLES = {
	breakfast: 'bg-yellow-50 text-yellow-700 border-yellow-200',
	lunch: 'bg-sky-50 text-sky-700 border-sky-200',
	dinner: 'bg-indigo-50 text-indigo-700 border-indigo-200',
	snack: 'bg-emerald-50 text-emerald-700 border-emerald-200',
	savory_breakfast: 'bg-orange-50 text-orange-700 border-orange-200',
	sweet: 'bg-pink-50 text-pink-700 border-pink-200',
	salad: 'bg-green-50 text-green-700 border-green-200',
	soup: 'bg-amber-50 text-amber-700 border-amber-200',
	drink: 'bg-cyan-50 text-cyan-700 border-cyan-200',
	dessert: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
};

const CAT_EMOJI = {
	breakfast: '🌅',
	lunch: '☀️',
	dinner: '🌙',
	snack: '🌿',
	savory_breakfast: '🍳',
	sweet: '🍰',
	salad: '🥗',
	soup: '🍲',
	drink: '🥤',
	dessert: '🍮',
};

function CategoryBadge({ category, label }) {
	const style = CAT_STYLES[category] ?? 'bg-slate-50 text-slate-600 border-slate-200';
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${style}`}>
			<span>{CAT_EMOJI[category] ?? '🏷️'}</span>
			{label || category}
		</span>
	);
}

/* ─── SATIETY BADGE ──────────────────────────────────────────────────────── */
const SAT_DOT = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };

function SatietyBadge({ satiety, label }) {
	return (
		<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
			<span className="w-2 h-2 rounded-full" style={{ background: SAT_DOT[satiety] ?? '#94a3b8' }} />
			{label || satiety}
		</span>
	);
}

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function splitTipsText(value) {
	if (!value) return [];
	return value
		.split('\n')
		.map(v => v.trim())
		.filter(Boolean);
}

function normalizeImage(url) {
	if (!url) return '';
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return `${process.env.NEXT_PUBLIC_BASE_URL}${url}`;
}

function mapRecipeFromApi(item) {
	return {
		id: item.id,
		title: item.title || '',
		satiety: String(item.satiety_index || 'medium').toLowerCase(),
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
		imageUrl: normalizeImage(item.image_url),
		imageFile: null,
	};
}

function buildRecipeFormData(form) {
	const fd = new FormData();

	fd.append('title', form.title || '');
	fd.append('satiety_index', form.satiety || 'medium');
	fd.append('meal_type', form.category || '');
	fd.append('video_url', form.videoUrl || '');

	fd.append(
		'nutrition',
		JSON.stringify({
			calories: Number(form.calories || 0),
			carbs_g: Number(form.carbs || 0),
			protein_g: Number(form.protein || 0),
			fat_g: Number(form.fat || 0),
		}),
	);

	fd.append('ingredients', JSON.stringify((form.ingredients || []).map(v => v.trim()).filter(Boolean)));
	fd.append('cream_ingredients', JSON.stringify((form.creamIngredients || []).map(v => v.trim()).filter(Boolean)));
	fd.append('sauce_ingredients', JSON.stringify((form.sauceIngredients || []).map(v => v.trim()).filter(Boolean)));
	fd.append('directions', JSON.stringify((form.directions || []).map(v => v.trim()).filter(Boolean)));
	fd.append('tips', JSON.stringify(splitTipsText(form.tips)));

	if (form.imageFile) fd.append('image', form.imageFile);

	return fd;
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */
export default function RecipesPage() {
	const t = useTranslations('recipeLibrary');
	const ts = useTranslations('recipeLibrary.stats');
	const tCat = useTranslations('recipeLibrary.categories');
	const tSrch = useTranslations('recipeLibrary.search');

	const [recipes, setRecipes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState('all');
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [slideOpen, setSlideOpen] = useState(false);
	const [editRecipe, setEditRecipe] = useState(null);
	const [statsData, setStatsData] = useState(null);
	const [filterMeta, setFilterMeta] = useState(null);

	const PER_PAGE = 12;

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 400);

		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		const getMeta = async () => {
			try {
				const res = await axios.get(`${API_BASE}/recipes/filters/meta`);
				setFilterMeta(res?.data || null);
			} catch (e) {
				console.error(e);
			}
		};

		getMeta();
	}, []);

	const mealTypes = filterMeta?.filters?.meal_type || [];

	const categoryPresets = useMemo(() => {
		return mealTypes.map(type => ({
			value: type,
			label: tCat(type),
			emoji: CAT_EMOJI[type] ?? '🏷️',
		}));
	}, [mealTypes, tCat]);

	const TABS = useMemo(() => {
		return [
			{ id: 'all', label: t('tabs.all'), icon: BookOpen },
			...mealTypes.map(type => ({
				id: type,
				label: tCat(type),
				icon: BookOpen,
			})),
		];
	}, [mealTypes, t, tCat]);

	const fetchRecipes = useCallback(async () => {
		try {
			setLoading(true);

			const params = {
				page,
				limit: PER_PAGE,
			};

			if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
			if (activeTab !== 'all') params.meal_type = activeTab;

			const [recipesRes, statsRes] = await Promise.all([
				axios.get(`${API_BASE}/recipes`, { params }),
				axios.get(`${API_BASE}/recipes/stats`, { params }),
			]);

			setRecipes((recipesRes?.data?.items || []).map(mapRecipeFromApi));
			setTotal(recipesRes?.data?.total || 0);
			setStatsData(statsRes?.data || null);
		} catch (e) {
			console.error(e);
			setRecipes([]);
			setTotal(0);
			setStatsData(null);
		} finally {
			setLoading(false);
		}
	}, [page, debouncedSearch, activeTab]);

	useEffect(() => {
		fetchRecipes();
	}, [fetchRecipes]);

	const stats = useMemo(() => {
		const summary = statsData?.summary || {};

		return [
			{
				label: ts('totalRecipes'),
				value: Number(summary.total_recipes || 0),
				icon: BookOpen,
			},
			{
				label: ts('shownOnPage'),
				value: recipes.length,
				icon: Eye,
			},
			{
				label: ts('avgCalories'),
				value: Math.round(Number(summary.avg_calories || 0)),
				icon: Flame,
			},
		];
	}, [statsData, recipes, ts]);

	const handleDelete = async id => {
		try {
			await axios.delete(`${API_BASE}/recipes/${id}`);

			if (recipes.length === 1 && page > 1) {
				setPage(p => p - 1);
			} else {
				fetchRecipes();
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleSave = async form => {
		try {
			setSaving(true);

			const payload = buildRecipeFormData(form);
			const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };

			if (editRecipe?.id) {
				await axios.put(`${API_BASE}/recipes/${editRecipe.id}`, payload, cfg);
			} else {
				await axios.post(`${API_BASE}/recipes`, payload, cfg);
			}

			setSlideOpen(false);
			setEditRecipe(null);
			setPage(1);
			await fetchRecipes();
		} catch (e) {
			console.error(e);
		} finally {
			setSaving(false);
		}
	};

	const columns = useMemo(
		() => [
			{
				key: 'imageUrl',
				header: '',
				type: 'img',
				headClassName: 'w-14',
			},
			{
				key: 'title',
				header: t('table.name'),
				cell: row => (
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-bold text-slate-800 leading-tight">{row.title}</span>
						{row.videoUrl && (
							<a
								href={row.videoUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-[10px] text-violet-500 hover:text-violet-700 font-semibold w-fit"
							>
								<PlayCircle size={10} />
								video
							</a>
						)}
					</div>
				),
			},
			{
				key: 'category',
				header: t('table.category'),
				cell: row => (
					<CategoryBadge
						category={row.category}
						label={row.category ? tCat(row.category) : '-'}
					/>
				),
			},
			{
				key: 'satiety',
				header: t('table.satiety'),
				cell: row => (
					<SatietyBadge
						satiety={row.satiety}
						label={t(`satiety.${String(row.satiety).toLowerCase()}`)}
					/>
				),
			},
			{
				key: 'nutrition',
				header: t('table.nutrition'),
				cell: row => (
					<NutritionBadge
						calories={row.calories}
						protein={row.protein}
						carbs={row.carbs}
						fat={row.fat}
					/>
				),
			},
			{
				key: 'ingredients',
				header: t('table.ingredients'),
				cell: row => (
					<span className="text-xs text-slate-500 font-medium">
						{row.ingredients?.length ?? 0} {t('table.items')}
					</span>
				),
			},
			{
				key: 'actions',
				header: '',
				cell: row => (
					<ActionButtons
						row={row}
						gap="gap-1"
						actions={[
							{
								icon: <Edit2 size={14} />,
								tooltip: t('table.edit'),
								variant: 'blue',
								size: 'sm',
								onClick: r => {
									setEditRecipe(r);
									setSlideOpen(true);
								},
							},
							{
								icon: <Trash2 size={14} />,
								tooltip: t('table.delete'),
								variant: 'red',
								size: 'sm',
								confirm: { message: t('table.confirmDelete'), enabled: true },
								onClick: r => handleDelete(r.id),
							},
						]}
					/>
				),
			},
		],
		[t, tCat],
	);

	const pagination = {
		current_page: page,
		per_page: PER_PAGE,
		total_records: total,
	};

	return (
		<>
			<div className="min-h-screen pb-8">
				<PageHeader
					title={t('page.title')}
					desc={t('page.desc')}
					icon={BookMarked}
					stats={stats}
					tabs={TABS}
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
							onClick={() => {
								setEditRecipe(null);
								setSlideOpen(true);
							}}
							className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black text-white"
							style={{
								background: 'rgba(255,255,255,0.22)',
								backdropFilter: 'blur(16px)',
								boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3),0 4px 16px rgba(0,0,0,0.1)',
							}}
						>
							<Plus className="h-4 w-4" />
							{t('addButton')}
						</motion.button>
					}
				/>

				<div className="pt-10">
					<DataTable
						searchValue={search}
						onSearchChange={v => {
							setSearch(v);
							setPage(1);
						}}
						onSearch={fetchRecipes}
						columns={columns}
						data={recipes}
						isLoading={loading}
						rowKey={row => row.id}
						labels={{
							searchPlaceholder: tSrch('placeholder'),
							filter: t('table.filters'),
							apply: t('table.apply'),
							emptyTitle: t('table.emptyTitle'),
							emptySubtitle: t('table.emptySubtitle'),
						}}
						actions={[
							{
								key: 'add',
								label: t('addButton'),
								icon: <Plus size={14} />,
								color: 'primary',
								onClick: () => {
									setEditRecipe(null);
									setSlideOpen(true);
								},
							},
						]}
						pagination={pagination}
						onPageChange={({ page: p }) => setPage(p)}
						perPageOptions={[6, 12, 24, 48]}
						hoverable
						compact={false}
					/>
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
				categoryPresets={categoryPresets}
			/>
		</>
	);
}