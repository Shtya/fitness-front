'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import {
	User as UserIcon,
	Dumbbell,
	Scale,
	Ruler,
	Camera,
	Image as ImageIcon,
	Upload,
	Clock,
	ChevronsLeft,
	ChevronsRight,
	X,
	ImagePlus,
	Trash2,
	Edit3,
	Save,
	Flame,
	User2,
	Apple,
	Lightbulb,
	TrendingUp,
	Calendar,
	Trophy,
	Target,
	Zap,
	Heart,
	Award,
	Plus,
	Info,
} from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import InputDate from '@/components/atoms/InputDate';
import Input from '@/components/atoms/Input';
import { useTranslations } from 'next-intl';
import Select from '@/components/atoms/Select';
import Img from '@/components/atoms/Img';

import { useTheme } from '@/app/[locale]/theme';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';

// ============================================================================
// THEME HELPERS (uses your CSS vars set by ThemeProvider)
// ============================================================================

const themeGradientStyle = {
	background: `linear-gradient(135deg, var(--color-gradient-from) 0%, var(--color-gradient-via) 50%, var(--color-gradient-to) 100%)`,
};

const themeGradientHover = 'hover:brightness-95 active:brightness-90';

const themeRingClass = 'focus:outline-none focus:ring-4';
const themeRingStyle = { boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-primary-500) 18%, transparent)' };

const themePrimaryText = { color: 'var(--color-primary-600)' };
const themePrimaryBg = { backgroundColor: 'var(--color-primary-500)' };

// ============================================================================
// DESIGN SYSTEM & UTILITIES
// ============================================================================

const card =
	'group relative overflow-hidden rounded-lg border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-all duration-300';
const sectionTitle = 'text-lg font-bold text-slate-900 tracking-tight';

const fadeUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
	transition: { duration: 0.3, ease: 'easeOut' },
};

const staggerContainer = {
	animate: {
		transition: { staggerChildren: 0.05 },
	},
};

const staggerItem = {
	initial: { opacity: 0, y: 10 },
	animate: { opacity: 1, y: 0 },
};

// Utility functions
const toISODate = (d) => {
	if (!d) return '';
	const dt = d instanceof Date ? d : new Date(d);
	const yyyy = dt.getFullYear();
	const mm = String(dt.getMonth() + 1).padStart(2, '0');
	const dd = String(dt.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
};

const daysLeft = (end) => {
	if (!end) return null;
	const endDt = new Date(end + 'T23:59:59');
	const diff = Math.ceil((endDt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
	return diff;
};

// ============================================================================
// LOADING SKELETONS
// ============================================================================

const shimmer =
	'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';
const skeletonBase = 'bg-slate-200/50 rounded-lg';
const ShimmerStyle = () => <style>{`@keyframes shimmer{100%{transform:translateX(100%);}}`}</style>;

function HeaderSkeleton() {
	return (
		<div className='rounded-lg border border-slate-200/60 overflow-hidden shadow-lg'>
			<div className='p-8' style={themeGradientStyle}>
				<div className='flex items-center gap-6'>
					<div className={`${skeletonBase} ${shimmer} h-24 w-24 rounded-lg`} />
					<div className='flex-1 space-y-3'>
						<div className={`${skeletonBase} ${shimmer} h-8 w-64`} />
						<div className={`${skeletonBase} ${shimmer} h-5 w-96`} />
					</div>
				</div>
			</div>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className='space-y-6'>
			<ShimmerStyle />
			<HeaderSkeleton />
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{[1, 2, 3].map((i) => (
					<div key={i} className={`${card} p-6 space-y-4`}>
						<div className={`${skeletonBase} ${shimmer} h-6 w-32`} />
						<div className='space-y-3'>
							<div className={`${skeletonBase} ${shimmer} h-20 w-full`} />
							<div className={`${skeletonBase} ${shimmer} h-20 w-full`} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================================
// BUTTON COMPONENT (theme-aware)
// ============================================================================

function Btn({
	children,
	onClick,
	disabled,
	className = '',
	size = 'md',
	variant = 'primary',
	type = 'button',
	icon: Icon,
}) {
	const sizes = {
		sm: 'h-9 px-4 text-xs',
		md: 'h-11 px-6 text-sm',
		lg: 'h-13 px-8 text-base',
	};

	const base =
		'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none';

	if (variant === 'primary') {
		return (
			<button
				type={type}
				onClick={onClick}
				disabled={disabled}
				className={[
					base,
					themeRingClass,
					sizes[size],
					'text-white shadow-lg',
					themeGradientHover,
					className,
				].join(' ')}
				style={{
					...themeGradientStyle,
					...themeRingStyle,
					boxShadow:
						'0 10px 25px rgba(0,0,0,0.10), 0 12px 30px color-mix(in srgb, var(--color-primary-500) 28%, transparent)',
				}}
			>
				{Icon && <Icon className='h-4 w-4' />}
				{children}
			</button>
		);
	}

	const variants = {
		outline: 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300',
		ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
		success:
			'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/30',
		danger:
			'bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/30',
	};

	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			className={[base, themeRingClass, sizes[size], variants[variant], className].join(' ')}
			style={variant === 'outline' || variant === 'ghost' ? themeRingStyle : undefined}
		>
			{Icon && <Icon className='h-4 w-4' />}
			{children}
		</button>
	);
}

// ============================================================================
// BEFORE/AFTER COMPARISON COMPONENT
// ============================================================================

function BeforeAfter({ before, after, name, t }) {
	const [pos, setPos] = useState(50);

	return (
		<div className='relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-2xl'>
			{before ? (
				<Img src={before} alt={`${name} ${t('labels.before')}`} className='absolute inset-0 w-full h-full object-cover' />
			) : (
				<div className='absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center'>
					<ImageIcon className='h-16 w-16 text-slate-500/50' />
				</div>
			)}

			<div className='absolute inset-0' style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
				{after ? (
					<Img src={after} alt={`${name} ${t('labels.after')}`} className='w-full h-full object-cover' />
				) : (
					<div className='w-full h-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center'>
						<ImageIcon className='h-16 w-16 text-slate-600/50' />
					</div>
				)}
			</div>

			<div className='absolute inset-y-0 pointer-events-none' style={{ left: `${pos}%` }}>
				<div className='h-full w-1 bg-white shadow-2xl' />
				<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
					<div
						className='flex items-center justify-center h-12 w-12 rounded-full bg-white shadow-2xl border-4'
						style={{ borderColor: 'var(--color-primary-600)' }}
					>
						<ChevronsLeft className='h-5 w-5 -mr-2' style={themePrimaryText} />
						<ChevronsRight className='h-5 w-5 -ml-2' style={themePrimaryText} />
					</div>
				</div>
			</div>

			<input
				type='range'
				value={pos}
				min={0}
				max={100}
				onChange={(e) => setPos(Number(e.target.value))}
				className='absolute inset-0 opacity-0 cursor-ew-resize w-full h-full'
				aria-label={t('labels.compareSlider')}
			/>

			<div className='absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold'>
				{t('labels.before')}
			</div>
			<div className='absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold'>
				{t('labels.after')}
			</div>
		</div>
	);
}

// ============================================================================
// WEIGHT TREND CHART (theme-aware gradient)
// ============================================================================

function WeightTrendChart({ data = [], t }) {
	if (!data.length) {
		return (
			<div className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-12'>
				<div className='flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-lg ring-1 ring-slate-200/50'>
					<Scale className='h-8 w-8 text-slate-400' />
				</div>
				<p className='mt-4 text-base font-semibold text-slate-700'>{t('messages.noMeasurements')}</p>
				<p className='mt-1 text-sm text-slate-500'>{t('messages.noMeasurementsHint')}</p>
			</div>
		);
	}

	const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	const weights = sorted.map((m) => Number(m.weight || 0));
	const minW = Math.min(...weights);
	const maxW = Math.max(...weights);
	const range = maxW - minW || 1;

	const points = sorted.map((m, idx) => {
		const x = sorted.length === 1 ? 50 : (idx / (sorted.length - 1)) * 100;
		const normalized = (Number(m.weight || 0) - minW) / range;
		const y = 68 - normalized * 36;
		return { x, y };
	});

	const path = points.map((p) => `${p.x},${p.y}`).join(' ');
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	const delta = last.weight != null && first.weight != null ? (last.weight - first.weight).toFixed(1) : '0.0';
	const deltaColor =
		parseFloat(delta) < 0 ? 'text-emerald-600' : parseFloat(delta) > 0 ? 'text-rose-600' : 'text-slate-600';
	const deltaIcon = parseFloat(delta) < 0 ? '↓' : parseFloat(delta) > 0 ? '↑' : '→';

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<div className='flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg' style={themeGradientStyle}>
						<TrendingUp className='h-5 w-5' />
					</div>
					<div>
						<h3 className='text-base font-bold text-slate-900'>{t('labels.direction')}</h3>
						<p className='text-xs text-slate-500'>{t('messages.weightProgressionOverTime')}</p>
					</div>
				</div>
			</div>

			<div className='flex flex-wrap gap-2'>
				<div className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 ring-1 ring-slate-200'>
					<span className='text-xs font-medium text-slate-600'>{t('labels.start')}</span>
					<span className='text-sm font-bold text-slate-900'>
						{first.weight ?? '-'} {t('units.kg')}
					</span>
				</div>

				<div className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 ring-1 ring-slate-200'>
					<span className='text-xs font-medium text-slate-600'>{t('labels.current')}</span>
					<span className='text-sm font-bold text-slate-900'>
						{last.weight ?? '-'} {t('units.kg')}
					</span>
				</div>

				<div
					className={`flex items-center gap-2 rounded-lg px-4 py-2 ring-1 ${deltaColor}`}
					style={{
						background:
							'linear-gradient(90deg, color-mix(in srgb, var(--color-primary-50) 90%, white), color-mix(in srgb, var(--color-secondary-50) 90%, white))',
						borderColor: 'color-mix(in srgb, var(--color-primary-200) 65%, #e2e8f0)',
					}}
				>
					<span className='text-xs font-medium'>{t('labels.change')}</span>
					<span className='text-sm font-bold'>
						{deltaIcon} {Math.abs(parseFloat(delta))} {t('units.kg')}
					</span>
				</div>
			</div>

			<div className='relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 ring-1 ring-slate-200'>
				<svg viewBox='0 0 100 80' className='w-full h-48'>
					<defs>
						<linearGradient id='weightLine' x1='0' y1='0' x2='1' y2='0'>
							<stop offset='0%' stopColor='var(--color-gradient-from)' />
							<stop offset='50%' stopColor='var(--color-gradient-via)' />
							<stop offset='100%' stopColor='var(--color-gradient-to)' />
						</linearGradient>

						<linearGradient id='weightFill' x1='0' y1='0' x2='0' y2='1'>
							<stop offset='0%' stopColor='var(--color-primary-500)' stopOpacity='0.28' />
							<stop offset='100%' stopColor='var(--color-primary-500)' stopOpacity='0.05' />
						</linearGradient>
					</defs>

					{[0, 1, 2, 3].map((i) => (
						<line
							key={i}
							x1='0'
							x2='100'
							y1={22 + i * 14}
							y2={22 + i * 14}
							stroke='#cbd5e1'
							strokeOpacity='0.4'
							strokeWidth='0.5'
							strokeDasharray='2,2'
						/>
					))}

					{points.length > 1 && (
						<path
							d={`M ${points[0].x},${points[0].y} ${path} L ${points[points.length - 1].x},74 L ${points[0].x},74 Z`}
							fill='url(#weightFill)'
						/>
					)}

					<polyline
						fill='none'
						stroke='url(#weightLine)'
						strokeWidth='2.5'
						strokeLinejoin='round'
						strokeLinecap='round'
						points={path}
					/>

					{points.map((p, i) => (
						<g key={i}>
							<circle cx={p.x} cy={p.y} r='2.5' fill='#ffffff' stroke='var(--color-primary-500)' strokeWidth='2' />
							{i === 0 || i === points.length - 1 ? (
								<circle cx={p.x} cy={p.y} r='4' fill='var(--color-primary-500)' opacity='0.25' />
							) : null}
						</g>
					))}
				</svg>
			</div>

			<div className='flex gap-2 overflow-x-auto pb-2'>
				{sorted.slice(-5).map((m) => (
					<div
						key={m.id || m.date}
						className='flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 whitespace-nowrap'
					>
						<Calendar className='h-3 w-3 text-slate-400' />
						<span className='text-xs text-slate-600'>{String(m.date || '').slice(5)}</span>
						<span className='text-sm font-bold text-slate-900'>{m.weight ?? '-'}</span>
						<span className='text-xs text-slate-400'>{t('units.kg')}</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================================
// NUTRITION GOALS CARD
// ============================================================================

function NutritionGoalsCard({ user, t }) {
	const goals = [
		{
			label: t('profile.calories'),
			value: user?.caloriesTarget || '--',
			unit: t('units.kcal'),
			icon: Flame,
			color: 'from-orange-500 to-red-500',
			bg: 'from-orange-50 to-red-50',
		},
		{
			label: t('profile.protein'),
			value: user?.proteinPerDay || '--',
			unit: t('units.g'),
			icon: Dumbbell,
			color: 'from-blue-500 to-indigo-500',
			bg: 'from-blue-50 to-indigo-50',
		},
		{
			label: t('profile.carbs'),
			value: user?.carbsPerDay || '--',
			unit: t('units.g'),
			icon: Zap,
			color: 'from-emerald-500 to-teal-500',
			bg: 'from-emerald-50 to-teal-50',
		},
		{
			label: t('profile.fats'),
			value: user?.fatsPerDay || '--',
			unit: t('units.g'),
			icon: Heart,
			color: 'from-amber-500 to-yellow-500',
			bg: 'from-amber-50 to-yellow-50',
		},
	];

	return (
		<motion.div {...fadeUp} className={card + ' p-6'}>
			<div className='flex items-center justify-between mb-6'>
				<div className='flex items-center gap-3'>
					<div className='flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg' style={themeGradientStyle}>
						<Target className='h-5 w-5' />
					</div>
					<div>
						<h3 className={sectionTitle}>{t('profile.nutritionTargets')}</h3>
						<p className='text-xs text-slate-500'>{t('messages.dailyMacroGoals')}</p>
					</div>
				</div>
			</div>

			<div className='grid grid-cols-2 gap-4'>
				{goals.map((goal, idx) => (
					<motion.div
						key={idx}
						variants={staggerItem}
						className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${goal.bg} p-4 ring-1 ring-slate-200/50`}
					>
						<div className={`absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-gradient-to-br ${goal.color} opacity-10`} />

						<div className='relative'>
							<div className='flex items-center gap-2 mb-3'>
								<div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${goal.color} text-white shadow-lg`}>
									<goal.icon className='h-4 w-4' />
								</div>
								<span className='text-xs font-semibold text-slate-600'>{goal.label}</span>
							</div>

							<div className='flex items-baseline gap-2'>
								<span className='text-3xl font-bold text-slate-900'>{goal.value}</span>
								<span className='text-sm font-medium text-slate-500'>{goal.unit}</span>
							</div>
						</div>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}

// ============================================================================
// MEASUREMENTS TABLE
// ============================================================================

function MeasurementsTable({
	measurements,
	onEdit,
	onDelete,
	editRowId,
	editRow,
	setEditRow,
	onSave,
	onCancel,
	saving,
	t,
}) {
	if (!measurements.length) {
		return (
			<div className='flex flex-col items-center justify-center py-12 px-6 rounded-lg border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50'>
				<div className='flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-lg ring-1 ring-slate-200/50'>
					<Ruler className='h-8 w-8 text-slate-400' />
				</div>
				<p className='mt-4 text-base font-semibold text-slate-700'>{t('messages.noMeasurements')}</p>
				<p className='mt-1 text-sm text-slate-500'>{t('messages.startTracking')}</p>
			</div>
		);
	}

	return (
		<div className='overflow-hidden rounded-lg border border-slate-200'>
			<div className='overflow-x-auto'>
				<table className='w-full'>
					<thead>
						<tr className='bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200'>
							<th className='px-4 py-3 rtl:text-right ltr:text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>{t('table.date')}</th>
							<th className='px-4 py-3 rtl:text-right ltr:text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>{t('table.weight')}</th>
							<th className='px-4 py-3 rtl:text-right ltr:text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>{t('table.waist')}</th>
							<th className='px-4 py-3 rtl:text-right ltr:text-left text-xs font-semibold text-slate-600 uppercase tracking-wider'>{t('table.chest')}</th>
							<th className='px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider'>{t('table.actions')}</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-slate-100'>
						{measurements
							.slice()
							.reverse()
							.map((m, idx) => {
								const isEditing = editRowId === m.id;
								return (
									<tr key={m.id || idx} className='hover:bg-slate-50/50 transition-colors'>
										<td className='px-4 py-3'>
											{isEditing ? (
												<input
													type='date'
													className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none'
													style={{
														borderColor: 'color-mix(in srgb, var(--color-primary-300) 55%, #e2e8f0)',
														boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 14%, transparent)',
													}}
													value={editRow.date}
													onChange={(e) => setEditRow((s) => ({ ...s, date: e.target.value }))}
												/>
											) : (
												<span className='text-sm font-medium text-slate-900'>{m.date}</span>
											)}
										</td>
										<td className='px-4 py-3'>
											{isEditing ? (
												<input
													type='number'
													className='w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none'
													style={{
														borderColor: 'color-mix(in srgb, var(--color-primary-300) 55%, #e2e8f0)',
														boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 14%, transparent)',
													}}
													value={editRow.weight}
													onChange={(e) => setEditRow((s) => ({ ...s, weight: e.target.value }))}
												/>
											) : (
												<span className='text-sm font-semibold text-slate-900'>
													{m.weight ?? '-'} {t('units.kg')}
												</span>
											)}
										</td>
										<td className='px-4 py-3'>
											{isEditing ? (
												<input
													type='number'
													className='w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none'
													style={{
														borderColor: 'color-mix(in srgb, var(--color-primary-300) 55%, #e2e8f0)',
														boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 14%, transparent)',
													}}
													value={editRow.waist}
													onChange={(e) => setEditRow((s) => ({ ...s, waist: e.target.value }))}
												/>
											) : (
												<span className='text-sm text-slate-600'>
													{m.waist ?? '-'} {t('units.cm')}
												</span>
											)}
										</td>
										<td className='px-4 py-3'>
											{isEditing ? (
												<input
													type='number'
													className='w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none'
													style={{
														borderColor: 'color-mix(in srgb, var(--color-primary-300) 55%, #e2e8f0)',
														boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 14%, transparent)',
													}}
													value={editRow.chest}
													onChange={(e) => setEditRow((s) => ({ ...s, chest: e.target.value }))}
												/>
											) : (
												<span className='text-sm text-slate-600'>
													{m.chest ?? '-'} {t('units.cm')}
												</span>
											)}
										</td>
										<td className='px-4 py-3'>
											{!isEditing ? (
												<div className='flex items-center justify-center gap-2'>
													<button
														onClick={() => onEdit(m)}
														className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors'
														title={t('actions.edit')}
													>
														<Edit3 className='h-4 w-4 text-slate-600' />
													</button>
													<button
														onClick={() => onDelete(m.id)}
														className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors'
														title={t('actions.delete')}
													>
														<Trash2 className='h-4 w-4' />
													</button>
												</div>
											) : (
												<div className='flex items-center justify-center gap-2'>
													<button
														onClick={onSave}
														disabled={saving}
														className='inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-all shadow-lg hover:brightness-95 disabled:opacity-60'
														style={themeGradientStyle}
														title={t('actions.save')}
													>
														<Save className='h-4 w-4' />
													</button>
													<button
														onClick={onCancel}
														className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors'
														title={t('actions.cancel')}
													>
														<X className='h-4 w-4' />
													</button>
												</div>
											)}
										</td>
									</tr>
								);
							})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// ============================================================================
// API FUNCTIONS (keeping original logic)
// ============================================================================

async function fetchMe() {
	try {
		const { data } = await api.get('/auth/me');
		return data;
	} catch {
		return {
			id: '633c7739-31bb-4b41-bf1d-dd994d557694',
			name: 'ahmed083@gmail.com',
			email: 'ahmed083@gmail.com',
			phone: '+201551495772',
			membership: 'Premium',
			gender: 'male',
			subscriptionEnd: '2026-04-15',
			caloriesTarget: 2500,
			proteinPerDay: 180,
			carbsPerDay: 250,
			fatsPerDay: 70,
		};
	}
}

async function fetchPlanName(type, id) {
	if (!id) return null;
	const url = type === 'exercise' ? `/plans/${id}` : `/nutrition/meal-plans/${id}`;
	try {
		const { data } = await api.get(url);
		return data?.name || null;
	} catch {
		return null;
	}
}

async function fetchCoach(id) {
	if (!id) return null;
	try {
		const { data } = await api.get(`/auth/profile/${id}`);
		return data;
	} catch {
		return null;
	}
}

async function getMeasurements(days = 120) {
	const { data } = await api.get(`/profile/measurements`, { params: { days } });
	return Array.isArray(data) ? data : [];
}

async function postMeasurement(payload) {
	const { data } = await api.post(`/profile/measurements`, payload);
	return data;
}

async function putMeasurement(id, payload) {
	const { data } = await api.put(`/profile/measurements/${id}`, payload);
	return data;
}

async function deleteMeasurement(id) {
	const { data } = await api.delete(`/profile/measurements/${id}`);
	return data;
}

async function getPhotosTimeline(months = 12) {
	const { data } = await api.get(`/profile/photos/timeline`, { params: { months } });
	return Array.isArray(data.records) ? data.records : [];
}

async function deletePhotoSet(photoId) {
	const { data } = await api.delete(`/profile/photos/${photoId}`);
	return data;
}

function createImage(url) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener('load', () => resolve(image));
		image.addEventListener('error', (error) => reject(error));
		image.setAttribute('crossOrigin', 'anonymous');
		image.src = url;
	});
}

async function getCroppedImg(imageSrc, pixelCrop) {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('No 2d context');

	const maxSide = Math.max(pixelCrop.width, pixelCrop.height);
	canvas.width = maxSide;
	canvas.height = maxSide;

	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		canvas.width,
		canvas.height,
	);

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
	});
}

function blobToFile(blob, filename) {
	return new File([blob], filename, { type: blob.type });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProfileOverviewPage() {
	const t = useTranslations('myProfile');
	useTheme();

	const [tab, setTab] = useState('overview');
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [measurements, setMeasurements] = useState([]);
	const [photoMonths, setPhotoMonths] = useState([]);

	// Modals
	const [editOpen, setEditOpen] = useState(false);
	const [photoPreview, setPhotoPreview] = useState(null);
	const [tipsOpen, setTipsOpen] = useState(false);
	const [compareAllOpen, setCompareAllOpen] = useState(false);
	const [compareAllIndex, setCompareAllIndex] = useState(0);
	const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState(null);
	const [confirmDeleteMeasurementId, setConfirmDeleteMeasurementId] = useState(null);
	const [cropOpen, setCropOpen] = useState(false);

	// Forms
	const [editForm, setEditForm] = useState({});
	const [savingProfile, setSavingProfile] = useState(false);

	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm({
		defaultValues: { date: new Date(), weight: '', waist: '', chest: '' },
	});
	const [savingMeasure, setSavingMeasure] = useState(false);

	const [editRowId, setEditRowId] = useState(null);
	const [editRow, setEditRow] = useState({ date: '', weight: '', waist: '', chest: '' });
	const [savingEditRow, setSavingEditRow] = useState(false);

	// Photo upload
	const [showUploadBlock, setShowUploadBlock] = useState(false);
	const [pFront, setPFront] = useState(null);
	const [pBack, setPBack] = useState(null);
	const [pLeft, setPLeft] = useState(null);
	const [pRight, setPRight] = useState(null);
	const [pWeight, setPWeight] = useState('');
	const [pNote, setPNote] = useState('');
	const [pDate, setPDate] = useState(new Date());
	const [savingPhotos, setSavingPhotos] = useState(false);

	// Compare
	const [compare, setCompare] = useState({ side: 'front', beforeId: null, afterId: null });

	// Crop
	const [cropImageSrc, setCropImageSrc] = useState(null);
	const [cropSide, setCropSide] = useState(null);
	const [cropAreaPixels, setCropAreaPixels] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);

	const scrollerRef = useRef(null);

	// Load data
	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const me = await fetchMe();
				const computedName = me?.name && String(me.name).includes('@') ? me.email?.split('@')[0] : me?.name;

				const [exName, mpName, coach] = await Promise.all([
					fetchPlanName('exercise', me?.activeExercisePlanId),
					fetchPlanName('meal', me?.activeMealPlanId),
					fetchCoach(me?.coachId),
				]);

				setUser({
					...me,
					name: computedName || me?.email || t('profile.user'),
					activeExercisePlan: exName ? { name: exName } : null,
					activeMealPlan: mpName ? { name: mpName } : null,
					coach: coach ? { id: coach.id, name: coach.name || coach.email } : null,
				});

				const [mRes, pRes] = await Promise.allSettled([getMeasurements(120), getPhotosTimeline(12)]);

				if (mRes.status === 'fulfilled') {
					setMeasurements(
						(mRes.value || []).map((m) => ({
							id: m.id,
							date: m.date?.slice(0, 10) ?? m.date,
							weight: m.weight,
							waist: m.waist,
							chest: m.chest,
						})),
					);
				}

				if (pRes.status === 'fulfilled') {
					setPhotoMonths(Array.isArray(pRes.value) ? pRes.value : []);
				}
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		})();
	}, [t]);

	const tabs = [
		{ key: 'overview', label: t('tabs.overview'), icon: Trophy },
		{ key: 'body', label: t('tabs.body'), icon: Ruler },
		{ key: 'photos', label: t('tabs.photos'), icon: Camera },
	];

	// Handlers
	const openEditProfile = () => {
		setEditForm({
			name: user?.name || '',
			phone: user?.phone || '',
			caloriesTarget: user?.caloriesTarget || '',
			proteinPerDay: user?.proteinPerDay || '',
			carbsPerDay: user?.carbsPerDay || '',
			fatsPerDay: user?.fatsPerDay || '',
		});
		setEditOpen(true);
	};

	const handleSaveProfile = async () => {
		setSavingProfile(true);
		try {
			const payload = {};
			Object.entries(editForm).forEach(([key, val]) => {
				if (val !== '')
					payload[key] = ['caloriesTarget', 'proteinPerDay', 'carbsPerDay', 'fatsPerDay'].includes(key)
						? Number(val)
						: val;
			});
			const { data } = await api.put(`/auth/profile/${user.id}`, payload);
			setUser((prev) => ({ ...prev, ...(data || payload) }));
			setEditOpen(false);
		} catch (e) {
			console.error(e);
		} finally {
			setSavingProfile(false);
		}
	};

	async function addMeasurement(form) {
		setSavingMeasure(true);
		try {
			const payload = {
				date: toISODate(form.date),
				weight: form.weight ? Number(form.weight) : undefined,
				waist: form.waist ? Number(form.waist) : undefined,
				chest: form.chest ? Number(form.chest) : undefined,
			};
			const created = await postMeasurement(payload);
			const row = { id: created?.id || `local-${Date.now()}`, ...payload };
			setMeasurements((prev) => [...prev, row]);
			reset({ date: new Date(), weight: '', waist: '', chest: '' });
		} finally {
			setSavingMeasure(false);
		}
	}

	function startEditRow(m) {
		setEditRowId(m.id);
		setEditRow({ date: m.date || '', weight: m.weight ?? '', waist: m.waist ?? '', chest: m.chest ?? '' });
	}

	async function saveEditRow() {
		if (!editRowId) return;
		setSavingEditRow(true);
		try {
			const payload = {
				date: editRow.date,
				weight: editRow.weight ? Number(editRow.weight) : undefined,
				waist: editRow.waist ? Number(editRow.waist) : undefined,
				chest: editRow.chest ? Number(editRow.chest) : undefined,
			};
			await putMeasurement(editRowId, payload);
			setMeasurements((prev) => prev.map((m) => (m.id === editRowId ? { ...m, ...payload } : m)));
			setEditRowId(null);
		} finally {
			setSavingEditRow(false);
		}
	}

	async function confirmDeleteMeasurement() {
		if (!confirmDeleteMeasurementId) return;
		await deleteMeasurement(confirmDeleteMeasurementId);
		setMeasurements((prev) => prev.filter((m) => m.id !== confirmDeleteMeasurementId));
		setConfirmDeleteMeasurementId(null);
	}

	function onPickSideFile(side, file) {
		if (!file) return;
		const src = URL.createObjectURL(file);
		setCropSide(side);
		setCropImageSrc(src);
		setZoom(1);
		setCrop({ x: 0, y: 0 });
		setCropOpen(true);
	}

	async function applyCrop() {
		if (!cropImageSrc || !cropAreaPixels || !cropSide) return;
		const blob = await getCroppedImg(cropImageSrc, cropAreaPixels);
		const croppedFile = blobToFile(blob, `${cropSide}-${Date.now()}.jpg`);
		if (cropSide === 'front') setPFront(croppedFile);
		if (cropSide === 'back') setPBack(croppedFile);
		if (cropSide === 'left') setPLeft(croppedFile);
		if (cropSide === 'right') setPRight(croppedFile);
		setCropOpen(false);
		URL.revokeObjectURL(cropImageSrc);
		setCropImageSrc(null);
	}

	const savePhotoSet = async () => {
		if (!pFront && !pBack && !pLeft && !pRight) return;
		setSavingPhotos(true);
		try {
			const formData = new FormData();
			if (pFront) formData.append('front', pFront);
			if (pBack) formData.append('back', pBack);
			if (pLeft) formData.append('left', pLeft);
			if (pRight) formData.append('right', pRight);

			const photoData = {
				takenAt: toISODate(pDate),
				weight: pWeight ? Number(pWeight) : null,
				note: pNote || '',
			};
			formData.append('data', JSON.stringify(photoData));

			const { data: newPhoto } = await api.post('/profile/photos', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			setPhotoMonths((prev) => [
				{
					id: newPhoto.id,
					takenAt: newPhoto.takenAt,
					weight: newPhoto.weight,
					note: newPhoto.note,
					sides: newPhoto.sides,
				},
				...prev,
			]);

			setPFront(null);
			setPBack(null);
			setPLeft(null);
			setPRight(null);
			setPWeight('');
			setPNote('');
			setShowUploadBlock(false);
		} finally {
			setSavingPhotos(false);
		}
	};

	async function confirmDeletePhotoSet() {
		if (!confirmDeletePhotoId) return;
		await deletePhotoSet(confirmDeletePhotoId);
		setPhotoMonths((prev) => prev.filter((p) => p.id !== confirmDeletePhotoId));
		setConfirmDeletePhotoId(null);
	}

	const sideOptions = useMemo(
		() => [
			{ id: 'all', label: t('sides.all') },
			{ id: 'front', label: t('sides.front') },
			{ id: 'back', label: t('sides.back') },
			{ id: 'left', label: t('sides.left') },
			{ id: 'right', label: t('sides.right') },
		],
		[t],
	);

	const photoSetOptions = useMemo(
		() => photoMonths.map((p) => ({ id: String(p.id), label: `${p.takenAt} (${p.weight ?? '-'} ${t('units.kg')})` })),
		[photoMonths, t],
	);

	const findPhotoById = (id) => photoMonths.find((p) => p.id === id);
	const leftSrc = () => (compare.beforeId ? findPhotoById(compare.beforeId)?.sides?.[compare.side] : '');
	const rightSrc = () => (compare.afterId ? findPhotoById(compare.afterId)?.sides?.[compare.side] : '');

	const allSides = ['front', 'back', 'left', 'right'];
	const openAllCompare = () => {
		if (!compare.beforeId || !compare.afterId) return;
		setCompareAllIndex(0);
		setCompareAllOpen(true);
	};

	if (loading) return <LoadingSkeleton />;

	const leftDaysVal = daysLeft(user?.subscriptionEnd);
	const leftDaysLabel =
		leftDaysVal == null
			? t('profile.noEndDate')
			: leftDaysVal <= 0
				? t('profile.expired')
				: `${leftDaysVal} ${t('profile.daysLeft')}`;

	return (
		<div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50  '>
			<div className=' space-y-6'>
				<GradientStatsHeader
					title={user?.name || t('profile.user')}
					desc={user?.email}
					icon={UserIcon}
					btnName={t('actions.edit')}
					onClick={openEditProfile}
					statsCollapsible={false}
					className=''
					someThing={
						<div
							className='flex items-center gap-2 rounded-lg px-4 py-2 text-white shadow-lg border-2 border-white/20 bg-white/10 backdrop-blur-sm'
							title={String(user?.subscriptionEnd || '')}
						>
							<Clock className='h-4 w-4' />
							<span className='text-sm font-semibold'>{leftDaysLabel}</span>
						</div>
					}
				>
					<StatCard resPhone icon={Award} title={t('stats.membership')} value={user?.membership || t('profile.basic')} />
					<StatCard resPhone icon={User2} title={t('stats.coach')} value={user?.coach?.name || t('profile.noCoach')} />
					<StatCard resPhone icon={Dumbbell} title={t('stats.exercisePlan')} value={user?.activeExercisePlan?.name || t('profile.none')} />
					<StatCard resPhone icon={Apple} title={t('stats.mealPlan')} value={user?.activeMealPlan?.name || t('profile.none')} />
				</GradientStatsHeader>

				<div className='flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm'>
					{tabs.map((tb) => {
						const active = tab === tb.key;
						return (
							<button
								key={tb.key}
								onClick={() => setTab(tb.key)}
								className={[
									'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200',
									active ? 'text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50',
								].join(' ')}
								style={active ? themeGradientStyle : undefined}
							>
								<tb.icon className='h-4 w-4' />
								{tb.label}
							</button>
						);
					})}
				</div>

				<AnimatePresence mode='wait'>
					{tab === 'overview' && (
						<motion.div
							key='overview'
							variants={staggerContainer}
							initial='initial'
							animate='animate'
							className='grid grid-cols-1 lg:grid-cols-3 gap-6'
						>
							<NutritionGoalsCard user={user} t={t} />

							<motion.div variants={staggerItem} className={card + ' lg:col-span-2 p-6'}>
								<WeightTrendChart data={measurements} t={t} />
							</motion.div>

							<motion.div variants={staggerItem} className={card + ' lg:col-span-3 p-6'}>
								<div className='flex items-center justify-between mb-6'>
									<div className='flex items-center gap-3'>
										<div className='flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg' style={themeGradientStyle}>
											<ImageIcon className='h-5 w-5' />
										</div>
										<div>
											<h3 className={sectionTitle}>{t('sections.compare')}</h3>
											<p className='text-xs text-slate-500'>{t('messages.compareHint')}</p>
										</div>
									</div>
								</div>

								<div className='grid md:grid-cols-4 gap-4 mb-6'>
									<Select
										searchable={false}
										options={sideOptions}
										value={compare.side}
										onChange={(val) => setCompare((s) => ({ ...s, side: String(val) }))}
										placeholder={t('labels.side')}
									/>
									<Select
										searchable={false}
										options={photoSetOptions}
										value={compare.beforeId || ''}
										onChange={(val) => setCompare((s) => ({ ...s, beforeId: String(val) }))}
										placeholder={t('labels.before')}
										clearable
									/>
									<Select
										searchable={false}
										options={photoSetOptions}
										value={compare.afterId || ''}
										onChange={(val) => setCompare((s) => ({ ...s, afterId: String(val) }))}
										placeholder={t('labels.after')}
										clearable
									/>
									<Btn
										variant='primary'
										disabled={!compare.beforeId || !compare.afterId}
										onClick={() => (compare.side === 'all' ? openAllCompare() : setPhotoPreview({ before: leftSrc(), after: rightSrc() }))}
									>
										{t('actions.preview')}
									</Btn>
								</div>

								{compare.beforeId && compare.afterId && compare.side !== 'all' ? (
									<BeforeAfter before={leftSrc()} after={rightSrc()} name='progress' t={t} />
								) : (
									<div className='flex flex-col items-center justify-center py-16 rounded-lg border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50'>
										<ImageIcon className='h-12 w-12 text-slate-300 mb-3' />
										<p className='text-sm font-medium text-slate-600'>{t('messages.chooseTwoSets')}</p>
									</div>
								)}
							</motion.div>
						</motion.div>
					)}

					{tab === 'body' && (
						<motion.div key='body' {...fadeUp} className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
							<div className={card + ' p-6'}>
								<div className='flex items-center gap-3 mb-6'>
									<div className='flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg' style={themeGradientStyle}>
										<Plus className='h-5 w-5' />
									</div>
									<div>
										<h3 className={sectionTitle}>{t('forms.addMeasurement')}</h3>
										<p className='text-xs text-slate-500'>{t('messages.trackYourMeasurements')}</p>
									</div>
								</div>

								<form onSubmit={handleSubmit(addMeasurement)} className='space-y-4'>
									<div className='grid grid-cols-2 gap-4'>
										<Controller
											name='date'
											control={control}
											render={({ field }) => (
												<InputDate placeholder={t('forms.date')} value={field.value} onChange={field.onChange} />
											)}
										/>
										<Controller
											name='weight'
											control={control}
											rules={{ required: t('errors.required') }}
											render={({ field }) => <Input placeholder={t('forms.weightKg')} {...field} error={errors.weight?.message} />}
										/>
										<Controller name='waist' control={control} render={({ field }) => <Input placeholder={t('forms.waistCm')} {...field} />} />
										<Controller name='chest' control={control} render={({ field }) => <Input placeholder={t('forms.chestCm')} {...field} />} />
									</div>

									<Btn type='submit' variant='primary' disabled={savingMeasure} className='w-full' icon={Plus}>
										{savingMeasure ? t('actions.saving') : t('actions.save')}
									</Btn>
								</form>
							</div>

							<div className={card + ' p-6 lg:col-span-2'}>
								<div className='flex items-center gap-3 mb-6'>
									<div className='flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg' style={themeGradientStyle}>
										<Ruler className='h-5 w-5' />
									</div>
									<div>
										<h3 className={sectionTitle}>{t('sections.measurements')}</h3>
										<p className='text-xs text-slate-500'>{t('messages.measurementHistory')}</p>
									</div>
								</div>

								<MeasurementsTable
									measurements={measurements}
									onEdit={startEditRow}
									onDelete={(id) => setConfirmDeleteMeasurementId(id)}
									editRowId={editRowId}
									editRow={editRow}
									setEditRow={setEditRow}
									onSave={saveEditRow}
									onCancel={() => setEditRowId(null)}
									saving={savingEditRow}
									t={t}
								/>
							</div>
						</motion.div>
					)}

					{tab === 'photos' && (
						<motion.div key='photos' {...fadeUp} className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
							<div className={card + ' p-6'}>
								<div className='flex items-center justify-between mb-6'>
									<div className='flex items-center gap-3'>
										<div className='flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg' style={themeGradientStyle}>
											<Camera className='h-5 w-5' />
										</div>
										<div>
											<h3 className={sectionTitle}>{t('sections.uploadBodyPhotos')}</h3>
											<p className='text-xs text-slate-500'>{t('messages.uploadProgressPhotos')}</p>
										</div>
									</div>
									<button
										onClick={() => setTipsOpen(true)}
										className='flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors'
										aria-label={t('actions.openTips')}
									>
										<Info className='h-4 w-4 text-slate-600' />
									</button>
								</div>

								<Btn variant='outline' className='w-full mb-4' icon={Upload} onClick={() => setShowUploadBlock((s) => !s)}>
									{showUploadBlock ? t('actions.hideUpload') : t('actions.addBodyPhotos')}
								</Btn>

								<AnimatePresence>
									{showUploadBlock && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											className='space-y-4'
										>
											<div className='grid grid-cols-2 gap-3'>
												{[
													{ key: 'front', label: t('sides.front'), file: pFront, setter: setPFront },
													{ key: 'back', label: t('sides.back'), file: pBack, setter: setPBack },
													{ key: 'left', label: t('sides.left'), file: pLeft, setter: setPLeft },
													{ key: 'right', label: t('sides.right'), file: pRight, setter: setPRight },
												].map(({ key, label, file, setter }) => (
													<div
														key={key}
														className='relative rounded-lg border-2 border-dashed bg-slate-50 aspect-square overflow-hidden transition-colors'
														style={{ borderColor: 'color-mix(in srgb, var(--color-primary-300) 55%, #e2e8f0)' }}
													>
														{!file ? (
															<label className='absolute inset-0 cursor-pointer flex flex-col items-center justify-center hover:bg-slate-100 transition-colors'>
																<ImagePlus className='h-8 w-8 text-slate-400 mb-2' />
																<span className='text-sm font-medium text-slate-600'>{label}</span>
																<input
																	type='file'
																	accept='image/*'
																	className='hidden'
																	onChange={(e) => onPickSideFile(key, e.target.files?.[0])}
																/>
															</label>
														) : (
															<>
																<img src={URL.createObjectURL(file)} alt={label} className='absolute inset-0 w-full h-full object-cover' />
																<button
																	onClick={() => setter(null)}
																	className='absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors'
																	aria-label={t('actions.remove')}
																>
																	<X className='h-4 w-4' />
																</button>
															</>
														)}
													</div>
												))}
											</div>

											<div className='space-y-3'>
												<InputDate placeholder={t('forms.date')} value={pDate} onChange={setPDate} />
												<Input placeholder={t('forms.weightOptional')} value={pWeight} onChange={setPWeight} />
												<Input placeholder={t('forms.noteOptional')} value={pNote} onChange={setPNote} />
											</div>

											<Btn
												variant='primary'
												className='w-full'
												disabled={savingPhotos || (!pFront && !pBack && !pLeft && !pRight)}
												icon={Save}
												onClick={savePhotoSet}
											>
												{savingPhotos ? t('actions.saving') : t('actions.saveSet')}
											</Btn>
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							<div className={card + ' lg:col-span-2 p-6'}>
								<div className='flex items-center justify-between mb-6'>
									<div className='flex items-center gap-3'>
										<div className='flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg' style={themeGradientStyle}>
											<ImageIcon className='h-5 w-5' />
										</div>
										<div>
											<h3 className={sectionTitle}>{t('sections.timeline')}</h3>
											<p className='text-xs text-slate-500'>{t('messages.photoHistory')}</p>
										</div>
									</div>
									<div className='flex gap-2'>
										<button
											onClick={() => scrollerRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
											className='flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors'
											aria-label={t('actions.scrollLeft')}
										>
											<ChevronsLeft className='h-4 w-4' />
										</button>
										<button
											onClick={() => scrollerRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
											className='flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors'
											aria-label={t('actions.scrollRight')}
										>
											<ChevronsRight className='h-4 w-4' />
										</button>
									</div>
								</div>

								{!photoMonths.length ? (
									<div className='flex flex-col items-center justify-center py-16 rounded-lg border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50'>
										<ImagePlus className='h-12 w-12 text-slate-300 mb-3' />
										<p className='text-sm font-medium text-slate-600 mb-4'>{t('messages.noTimeline')}</p>
										<Btn variant='primary' icon={Upload} onClick={() => setShowUploadBlock(true)}>
											{t('actions.addBodyPhotos')}
										</Btn>
									</div>
								) : (
									<div ref={scrollerRef} className='flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory'>
										{photoMonths.map((entry) => (
											<div
												key={entry.id}
												className='min-w-[320px] snap-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-lg transition-shadow'
											>
												<div className='flex items-center justify-between mb-3'>
													<div>
														<p className='text-sm font-bold text-slate-900'>{entry.takenAt}</p>
														<p className='text-xs text-slate-500'>{entry.note}</p>
													</div>
													<div className='flex items-center gap-2'>
														<span className='text-sm font-semibold text-slate-900'>
															{entry.weight ?? '-'} {t('units.kg')}
														</span>
														<button
															onClick={() => setConfirmDeletePhotoId(entry.id)}
															className='flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors'
															aria-label={t('actions.delete')}
														>
															<Trash2 className='h-4 w-4' />
														</button>
													</div>
												</div>

												<div className='grid grid-cols-2 gap-2'>
													{['front', 'back', 'left', 'right'].map((side) => (
														<button
															key={side}
															onClick={() =>
																setPhotoPreview({
																	src: entry.sides?.[side],
																	label: `${entry.takenAt} — ${t(`sides.${side}`)}`,
																})
															}
															className='overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-all'
															style={{ boxShadow: '0 0 0 0px transparent' }}
															onMouseEnter={(e) => {
																e.currentTarget.style.boxShadow =
																	'0 0 0 2px color-mix(in srgb, var(--color-primary-500) 80%, transparent)';
															}}
															onMouseLeave={(e) => {
																e.currentTarget.style.boxShadow = '0 0 0 0px transparent';
															}}
															aria-label={t('actions.preview')}
														>
															<Img src={entry.sides?.[side]} className='aspect-square w-full object-cover' alt={t(`sides.${side}`)} />
														</button>
													))}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} title={photoPreview?.label} maxW='max-w-4xl'>
					{photoPreview?.src ? (
						<div className='rounded-lg overflow-hidden'>
							<Img src={photoPreview.src} alt={photoPreview.label} className='w-full' />
						</div>
					) : photoPreview?.before && photoPreview?.after ? (
						<BeforeAfter before={photoPreview.before} after={photoPreview.after} name='preview' t={t} />
					) : null}
				</Modal>

				<Modal open={compareAllOpen} onClose={() => setCompareAllOpen(false)} title={t('labels.beforeAfter')} maxW='max-w-4xl'>
					<div className='flex items-center justify-between mb-4'>
						<span className='text-lg font-bold capitalize'>{t(`sides.${allSides[compareAllIndex]}`)}</span>
						<div className='flex gap-2'>
							<Btn variant='outline' size='sm' onClick={() => setCompareAllIndex((i) => (i + 3) % 4)}>
								<ChevronsLeft className='h-4 w-4' />
							</Btn>
							<Btn variant='outline' size='sm' onClick={() => setCompareAllIndex((i) => (i + 1) % 4)}>
								<ChevronsRight className='h-4 w-4' />
							</Btn>
						</div>
					</div>
					<BeforeAfter
						before={findPhotoById(compare.beforeId)?.sides?.[allSides[compareAllIndex]] || ''}
						after={findPhotoById(compare.afterId)?.sides?.[allSides[compareAllIndex]] || ''}
						name='all-sides'
						t={t}
					/>
				</Modal>

				<Modal open={tipsOpen} onClose={() => setTipsOpen(false)} title={t('modals.photographyTipsTitle')} maxW='max-w-2xl'>
					<div className='space-y-4'>
						{['lighting', 'distance', 'angles', 'cameraHeight', 'timer', 'clothes', 'background', 'frequency'].map((key) => (
							<div key={key} className='flex gap-4 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200'>
								<div className='flex h-8 w-8 items-center justify-center rounded-lg text-white flex-shrink-0' style={themePrimaryBg}>
									<Lightbulb className='h-4 w-4' />
								</div>
								<p className='text-sm text-slate-700'>{t(`tips.${key}`)}</p>
							</div>
						))}
					</div>
				</Modal>

				<Modal open={!!confirmDeletePhotoId} onClose={() => setConfirmDeletePhotoId(null)} title={t('modals.confirmDeleteTitle')} maxW='max-w-md'>
					<p className='text-slate-700 mb-6'>{t('messages.deletePhotoConfirm')}</p>
					<div className='flex gap-3'>
						<Btn variant='danger' onClick={confirmDeletePhotoSet} className='flex-1'>
							{t('actions.delete')}
						</Btn>
						<Btn variant='outline' onClick={() => setConfirmDeletePhotoId(null)} className='flex-1'>
							{t('actions.cancel')}
						</Btn>
					</div>
				</Modal>

				<Modal
					open={!!confirmDeleteMeasurementId}
					onClose={() => setConfirmDeleteMeasurementId(null)}
					title={t('modals.confirmDeleteTitle')}
					maxW='max-w-md'
				>
					<p className='text-slate-700 mb-6'>{t('messages.deleteMeasurementConfirm')}</p>
					<div className='flex gap-3'>
						<Btn variant='danger' onClick={confirmDeleteMeasurement} className='flex-1'>
							{t('actions.delete')}
						</Btn>
						<Btn variant='outline' onClick={() => setConfirmDeleteMeasurementId(null)} className='flex-1'>
							{t('actions.cancel')}
						</Btn>
					</div>
				</Modal>

				<Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('modals.editProfileTitle')} maxW='max-w-2xl'>
					<div className='space-y-4'>
						<div className='grid grid-cols-2 gap-4'>
							<Input placeholder={t('profile.name')} value={editForm.name || ''} onChange={(val) => setEditForm((f) => ({ ...f, name: val }))} />
							<Input placeholder={t('profile.phone')} value={editForm.phone || ''} onChange={(val) => setEditForm((f) => ({ ...f, phone: val }))} />
							<Input placeholder={t('profile.caloriesTarget')} type='number' value={editForm.caloriesTarget || ''} onChange={(val) => setEditForm((f) => ({ ...f, caloriesTarget: val }))} />
							<Input placeholder={t('profile.proteinPerDay')} type='number' value={editForm.proteinPerDay || ''} onChange={(val) => setEditForm((f) => ({ ...f, proteinPerDay: val }))} />
							<Input placeholder={t('profile.carbsPerDay')} type='number' value={editForm.carbsPerDay || ''} onChange={(val) => setEditForm((f) => ({ ...f, carbsPerDay: val }))} />
							<Input placeholder={t('profile.fatsPerDay')} type='number' value={editForm.fatsPerDay || ''} onChange={(val) => setEditForm((f) => ({ ...f, fatsPerDay: val }))} />
						</div>

						<Btn variant='primary' onClick={handleSaveProfile} disabled={savingProfile} className='w-full' icon={Save}>
							{savingProfile ? t('actions.saving') : t('actions.save')}
						</Btn>
					</div>
				</Modal>

				<Modal open={cropOpen} onClose={() => setCropOpen(false)} title={t('modals.cropImageTitle')} maxW='max-w-3xl'>
					{cropImageSrc && (
						<div className='space-y-4'>
							<div className='relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden'>
								<Cropper
									image={cropImageSrc}
									crop={crop}
									zoom={zoom}
									aspect={1}
									onCropChange={setCrop}
									onZoomChange={setZoom}
									onCropComplete={(_, areaPixels) => setCropAreaPixels(areaPixels)}
									cropShape='rect'
									objectFit='contain'
								/>
							</div>
							<div className='flex items-center gap-4'>
								<label className='text-sm font-medium text-slate-700'>{t('labels.zoom')}</label>
								<input
									type='range'
									min={1}
									max={3}
									step={0.05}
									value={zoom}
									onChange={(e) => setZoom(Number(e.target.value))}
									className='flex-1'
									aria-label={t('labels.zoom')}
								/>
							</div>
							<div className='flex gap-3'>
								<Btn variant='primary' onClick={applyCrop} className='flex-1'>
									{t('actions.apply')}
								</Btn>
								<Btn variant='outline' onClick={() => setCropOpen(false)} className='flex-1'>
									{t('actions.cancel')}
								</Btn>
							</div>
						</div>
					)}
				</Modal>
			</div>
		</div>
	);
}
