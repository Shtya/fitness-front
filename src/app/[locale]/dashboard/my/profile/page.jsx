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
	Star,
	ChevronRight,
	Activity,
} from 'lucide-react';

import api from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import InputDate from '@/components/atoms/InputDate';
import Input from '@/components/atoms/Input';
import { useTranslations } from 'next-intl';
import Select from '@/components/atoms/Select';
import Img from '@/components/atoms/Img';
import { useTheme } from '@/app/[locale]/theme';

/* =========================================================================
	 DESIGN TOKENS
	 ========================================================================= */
const card = 'group relative overflow-hidden rounded-lg sm:rounded-lg border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.10)] transition-all duration-300';
const sectionTitle = 'text-base sm:text-lg font-black text-slate-900 tracking-tight';

const fadeUp = {
	initial: { opacity: 0, y: 18 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -12 },
	transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
};

const staggerContainer = { animate: { transition: { staggerChildren: 0.06 } } };
const staggerItem = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } };

/* =========================================================================
	 UTILITIES
	 ========================================================================= */
const toISODate = (d) => {
	if (!d) return '';
	const dt = d instanceof Date ? d : new Date(d);
	return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const daysLeft = (end) => {
	if (!end) return null;
	const diff = Math.ceil((new Date(end + 'T23:59:59').getTime() - Date.now()) / 86400000);
	return diff;
};

/* =========================================================================
	 SKELETON
	 ========================================================================= */
function SkeletonPulse({ className = '' }) {
	return <div className={`rounded-lg bg-slate-100 animate-pulse ${className}`} />;
}

function LoadingSkeleton() {
	return (
		<div className="space-y-4 w-[calc(100%+14px)] rtl:mr-[-7px] ltr:ml-[-7px] mt-[-7px] ">
			{/* header skeleton */}
			<div className="rounded-lg sm:rounded-lg overflow-hidden bg-gradient-to-br from-[var(--color-primary-800)] to-[var(--color-secondary-600)] p-5 sm:p-7">
				<div className="flex items-center gap-4 mb-6">
					<SkeletonPulse className="h-14 w-14 rounded-lg bg-white/20" />
					<div className="flex-1 space-y-2">
						<SkeletonPulse className="h-5 w-48 bg-white/20" />
						<SkeletonPulse className="h-3 w-32 bg-white/15" />
					</div>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{[0, 1, 2, 3].map(i => <SkeletonPulse key={i} className="h-16 bg-white/15 rounded-lg" />)}
				</div>
			</div>
			{/* tabs skeleton */}
			<SkeletonPulse className="h-14 rounded-lg" />
			{/* cards skeleton */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{[0, 1, 2].map(i => <SkeletonPulse key={i} className="h-48 rounded-lg" />)}
			</div>
		</div>
	);
}

/* =========================================================================
	 HEADER STAT PILL (same pattern as nutrition page)
	 ========================================================================= */
function HeaderStatPill({ label, value, icon: Icon, delay = 0 }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
			className="relative overflow-hidden rounded-lg sm:rounded-lg p-2 sm:p-4 bg-white/[0.13] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
		>
			<div className="flex items-start justify-between gap-1 mb-1 sm:mb-2">
				<p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] text-white/55 md: leading-tight">
					{label}
				</p>
				{Icon && <Icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-white/35 shrink-0" />}
			</div>
			<p className="!text-xs sm:text-2xl font-black text-white md: leading-none tabular-nums">
				{value ?? 0}
			</p>
		</motion.div>
	);
}

/* =========================================================================
	 BUTTON
	 ========================================================================= */
function Btn({ children, onClick, disabled, className = '', size = 'md', variant = 'primary', type = 'button', icon: Icon }) {
	const sizes = { sm: 'h-9 px-4 text-xs', md: 'h-11 px-5 text-sm', lg: 'h-13 px-8 text-base' };
	const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]';

	const variants = {
		primary: 'bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white shadow-md hover:shadow-lg hover:brightness-105',
		outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
		ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
		success: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md hover:brightness-105',
		danger: 'bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-md hover:brightness-105',
	};

	return (
		<button type={type} onClick={onClick} disabled={disabled}
			className={`${base} ${sizes[size]} ${variants[variant] ?? variants.primary} ${className}`}>
			{Icon && <Icon className="h-4 w-4" />}
			{children}
		</button>
	);
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
	return (
		<div className="flex items-center justify-between mb-5 sm:mb-6">
			<div className="flex items-center gap-3.5">
				{/* Icon badge with glow */}
				<div className="relative flex-none">
					<div className="h-11 w-11 flex items-center justify-center rounded-2xl text-white shadow-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)]"
						style={{ boxShadow: '0 4px 14px -2px var(--color-primary-400)' }}>
						<Icon className="h-5 w-5" />
					</div>
					{/* subtle corner glow dot */}
					<div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-primary-400)] opacity-60 blur-[2px]" />
				</div>

				<div>
					<h3 className="text-sm sm:text-base font-black text-slate-900 md: leading-tight">{title}</h3>
					{subtitle && (
						<p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>
					)}
				</div>
			</div>

			{action && (
				<div className="flex-none">{action}</div>
			)}
		</div>
	);
}

/* =========================================================================
	 BEFORE / AFTER COMPARE
	 ========================================================================= */
function BeforeAfter({ before, after, name, t }) {
	const [pos, setPos] = useState(50);
	return (
		<div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-lg">
			{before
				? <Img src={before} alt={`${name} ${t('labels.before')}`} className="absolute inset-0 w-full h-full object-cover" />
				: <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center"><ImageIcon className="h-16 w-16 text-slate-400/50" /></div>
			}
			<div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
				{after
					? <Img src={after} alt={`${name} ${t('labels.after')}`} className="w-full h-full object-cover" />
					: <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center"><ImageIcon className="h-16 w-16 text-slate-500/50" /></div>
				}
			</div>
			<div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%` }}>
				<div className="h-full w-0.5 bg-white shadow-2xl" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					<div className="flex items-center justify-center h-11 w-11 rounded-full bg-white shadow-2xl border-[3px] border-[var(--color-primary-500)]">
						<ChevronsLeft className=" rtl:scale-x-[-1] h-4 w-4 -mr-1.5 text-[var(--color-primary-600)]" />
						<ChevronsRight className=" rtl:scale-x-[-1] h-4 w-4 -ml-1.5 text-[var(--color-primary-600)]" />
					</div>
				</div>
			</div>
			<input type="range" value={pos} min={0} max={100} onChange={e => setPos(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full" />
			<span className="absolute top-3 start-3 bg-black/65 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold">{t('labels.before')}</span>
			<span className="absolute top-3 end-3 bg-black/65 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold">{t('labels.after')}</span>
		</div>
	);
}

/* =========================================================================
	 WEIGHT TREND CHART
	 ========================================================================= */
function WeightTrendChart({ data = [], t }) {
	const [hoveredIdx, setHoveredIdx] = useState(null);
	const [animated, setAnimated] = useState(false);

	useEffect(() => {
		const id = setTimeout(() => setAnimated(true), 120);
		return () => clearTimeout(id);
	}, []);

	/* ── empty state ── */
	if (!data.length) return (
		<div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-14">
			<motion.div
				animate={{ y: [0, -5, 0] }}
				transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
				className="flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-slate-200"
			>
				<Scale className="h-7 w-7 text-slate-300" />
			</motion.div>
			<p className="mt-4 text-sm font-black text-slate-600">{t('messages.noMeasurements')}</p>
			<p className="mt-1 text-xs text-slate-400">{t('messages.noMeasurementsHint')}</p>
		</div>
	);

	/* ── data prep ── */
	const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
	const weights = sorted.map(m => Number(m.weight || 0));
	const minW = Math.min(...weights);
	const maxW = Math.max(...weights);
	const range = maxW - minW || 1;

	/* SVG viewport */
	const VW = 300;
	const VH = 120;
	const PAD_X = 12;
	const PAD_TOP = 14;
	const PAD_BOT = 18;

	const points = sorted.map((m, idx) => ({
		x: sorted.length === 1
			? VW / 2
			: PAD_X + (idx / (sorted.length - 1)) * (VW - PAD_X * 2),
		y: PAD_TOP + (1 - (Number(m.weight || 0) - minW) / range) * (VH - PAD_TOP - PAD_BOT),
		weight: m.weight,
		date: m.date,
		raw: m,
	}));

	const polyPts = points.map(p => `${p.x},${p.y}`).join(' ');
	const fillPath = points.length > 1
		? `M ${points[0].x},${points[0].y} ${polyPts} L ${points[points.length - 1].x},${VH - PAD_BOT + 4} L ${points[0].x},${VH - PAD_BOT + 4} Z`
		: '';

	/* path length for draw animation — approximate */
	const pathLen = points.reduce((acc, p, i) => {
		if (i === 0) return 0;
		const prev = points[i - 1];
		return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
	}, 0) || 1;

	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	const delta = last.weight != null && first.weight != null
		? (last.weight - first.weight).toFixed(1)
		: '0.0';
	const isLoss = parseFloat(delta) < 0;
	const isGain = parseFloat(delta) > 0;

	/* y-axis labels */
	const yLabels = [0, 1, 2, 3].map(i => ({
		y: PAD_TOP + (i / 3) * (VH - PAD_TOP - PAD_BOT),
		val: (maxW - (i / 3) * range).toFixed(1),
	}));

	const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

	return (
		<div className="space-y-4">
			<SectionHeader
				icon={TrendingUp}
				title={t('labels.direction')}
				subtitle={t('messages.weightProgressionOverTime')}
			/>

			{/* ── stat cards row ── */}
			<div className="grid grid-cols-3 gap-2">
				{[
					{
						label: t('labels.start'),
						val: first.weight ?? '-',
						unit: t('units.kg'),
						icon: Calendar,
						color: 'text-slate-700',
						bg: 'bg-slate-50',
						border: 'border-slate-200',
						iconColor: 'text-slate-400',
					},
					{
						label: t('labels.current'),
						val: last.weight ?? '-',
						unit: t('units.kg'),
						icon: Scale,
						color: 'text-[var(--color-primary-700)]',
						bg: 'bg-[var(--color-primary-50)]',
						border: 'border-[var(--color-primary-200)]',
						iconColor: 'text-[var(--color-primary-400)]',
					},
					{
						label: t('labels.change'),
						val: `${isLoss ? '↓' : isGain ? '↑' : '→'} ${Math.abs(parseFloat(delta))}`,
						unit: t('units.kg'),
						icon: TrendingUp,
						color: isLoss ? 'text-emerald-700' : isGain ? 'text-rose-700' : 'text-slate-700',
						bg: isLoss ? 'bg-emerald-50' : isGain ? 'bg-rose-50' : 'bg-slate-50',
						border: isLoss ? 'border-emerald-200' : isGain ? 'border-rose-200' : 'border-slate-200',
						iconColor: isLoss ? 'text-emerald-400' : isGain ? 'text-rose-400' : 'text-slate-400',
					},
				].map((s, i) => (
					<motion.div
						key={i}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.06 + i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
						className={`flex flex-col gap-1.5 rounded-lg border px-3 py-3 ${s.bg} ${s.border}`}
					>
						<div className="flex items-center justify-between">
							<span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">
								{s.label}
							</span>
							<s.icon className={`h-3 w-3 ${s.iconColor}`} />
						</div>
						<div className="flex items-baseline gap-1">
							<span className={`text-lg sm:text-xl font-black tabular-nums md: leading-none ${s.color}`}>
								{s.val}
							</span>
							<span className={`text-[9px] font-bold ${s.color} opacity-70`}>{s.unit}</span>
						</div>
					</motion.div>
				))}
			</div>

			{/* ── SVG chart ── */}
			<div className="relative overflow-hidden rounded-lg sm:rounded-lg border border-slate-100 bg-gradient-to-br from-white to-slate-50 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">

				{/* top gradient stripe */}
				<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]" />

				<div className="p-3 sm:p-4 pt-4">
					<svg
						viewBox={`0 0 ${VW} ${VH}`}
						className="w-full"
						style={{ height: 'clamp(120px, 22vw, 180px)' }}
						onMouseLeave={() => setHoveredIdx(null)}
					>
						<defs>
							<linearGradient id="wtLine" x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor="var(--color-gradient-from)" />
								<stop offset="50%" stopColor="var(--color-gradient-via)" />
								<stop offset="100%" stopColor="var(--color-gradient-to)" />
							</linearGradient>
							<linearGradient id="wtFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity="0.18" />
								<stop offset="85%" stopColor="var(--color-primary-500)" stopOpacity="0.03" />
								<stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity="0" />
							</linearGradient>
							<filter id="dotGlow">
								<feGaussianBlur stdDeviation="1.5" result="blur" />
								<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
							</filter>
						</defs>

						{/* horizontal grid lines */}
						{yLabels.map((yl, i) => (
							<g key={i}>
								<line
									x1={PAD_X} x2={VW - PAD_X}
									y1={yl.y} y2={yl.y}
									stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3"
								/>
								<text
									x={PAD_X - 2} y={yl.y + 1}
									textAnchor="end" fontSize="5.5" fill="#94a3b8" fontWeight="600"
								>
									{yl.val}
								</text>
							</g>
						))}

						{/* x-axis baseline */}
						<line
							x1={PAD_X} x2={VW - PAD_X}
							y1={VH - PAD_BOT + 4} y2={VH - PAD_BOT + 4}
							stroke="#e2e8f0" strokeWidth="0.6"
						/>

						{/* x-axis date labels */}
						{points.filter((_, i) => i === 0 || i === points.length - 1 || (points.length <= 6)).map((p, i) => (
							<text
								key={i}
								x={p.x} y={VH - 2}
								textAnchor="middle" fontSize="5" fill="#94a3b8" fontWeight="600"
							>
								{String(p.date || '').slice(5)}
							</text>
						))}

						{/* fill area */}
						{fillPath && (
							<motion.path
								d={fillPath}
								fill="url(#wtFill)"
								initial={{ opacity: 0 }}
								animate={{ opacity: animated ? 1 : 0 }}
								transition={{ duration: 0.6, delay: 0.3 }}
							/>
						)}

						{/* line — animated draw */}
						{points.length > 1 && (
							<motion.polyline
								fill="none"
								stroke="url(#wtLine)"
								strokeWidth="2.5"
								strokeLinejoin="round"
								strokeLinecap="round"
								points={polyPts}
								initial={{ pathLength: 0, opacity: 0 }}
								animate={{ pathLength: animated ? 1 : 0, opacity: 1 }}
								transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
							/>
						)}

						{/* hover vertical line */}
						{hovered && (
							<motion.line
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								x1={hovered.x} x2={hovered.x}
								y1={PAD_TOP - 4} y2={VH - PAD_BOT + 4}
								stroke="var(--color-primary-300)" strokeWidth="1"
								strokeDasharray="3,2"
							/>
						)}

						{/* data point dots */}
						{points.map((p, i) => {
							const isHov = hoveredIdx === i;
							const isEnd = i === 0 || i === points.length - 1;
							return (
								<g key={i}>
									{/* hit area */}
									<circle
										cx={p.x} cy={p.y} r="8"
										fill="transparent"
										className="cursor-pointer"
										onMouseEnter={() => setHoveredIdx(i)}
										onTouchStart={() => setHoveredIdx(i)}
									/>
									{/* outer glow */}
									{(isHov || isEnd) && (
										<motion.circle
											cx={p.x} cy={p.y}
											initial={{ r: 0, opacity: 0 }}
											animate={{ r: isHov ? 7 : 5, opacity: isHov ? 0.22 : 0.12 }}
											transition={{ duration: 0.2 }}
											fill="var(--color-primary-500)"
										/>
									)}
									{/* main dot */}
									<motion.circle
										cx={p.x} cy={p.y}
										initial={{ r: 0 }}
										animate={{ r: isHov ? 4 : isEnd ? 3.5 : 2.5 }}
										transition={{ duration: 0.18 }}
										fill={isHov ? 'var(--color-primary-600)' : '#fff'}
										stroke="var(--color-primary-500)"
										strokeWidth={isHov ? 0 : 2}
										filter={isHov ? 'url(#dotGlow)' : undefined}
									/>
								</g>
							);
						})}

						{/* tooltip */}
						{hovered && (() => {
							const tx = Math.min(Math.max(hovered.x, 28), VW - 28);
							const ty = hovered.y - 16;
							return (
								<motion.g
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.15 }}
								>
									<rect
										x={tx - 22} y={ty - 12}
										width="44" height="14"
										rx="4"
										fill="var(--color-primary-700)"
									/>
									<text
										x={tx} y={ty - 2}
										textAnchor="middle" fontSize="6.5" fill="white" fontWeight="800"
									>
										{hovered.weight} {t('units.kg')}
									</text>
									{/* caret */}
									<polygon
										points={`${tx - 3},${ty + 2} ${tx + 3},${ty + 2} ${tx},${ty + 6}`}
										fill="var(--color-primary-700)"
									/>
								</motion.g>
							);
						})()}
					</svg>
				</div>

				{/* bottom fade */}
				<div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/60 to-transparent pointer-events-none" />
			</div>

			{/* ── scrollable data chips ── */}
			<div className="flex gap-2 overflow-x-auto py-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{sorted.map((m, i) => {
					const isFirst = i === 0;
					const isPrev = i > 0;
					const diff = isPrev
						? (Number(m.weight) - Number(sorted[i - 1].weight)).toFixed(1)
						: null;
					const diffNum = parseFloat(diff);
					const isActive = hoveredIdx === i;

					return (
						<motion.div
							key={m.id || m.date}
							onMouseEnter={() => setHoveredIdx(i)}
							onMouseLeave={() => setHoveredIdx(null)}
							animate={isActive ? { y: -2, scale: 1.04 } : { y: 0, scale: 1 }}
							transition={{ duration: 0.15 }}
							className={[
								'flex flex-col items-center shrink-0 rounded-lg border px-3 py-2.5 cursor-default transition-all duration-200 min-w-[60px]',
								isActive
									? 'bg-[var(--color-primary-50)] border-[var(--color-primary-300)] shadow-md'
									: 'bg-white border-slate-200 ',
							].join(' ')}
						>
							<span className="text-[9px] text-slate-400 font-semibold">
								{String(m.date || '').slice(5)}
							</span>
							<span className={`text-sm font-black md: leading-tight mt-0.5 ${isActive ? 'text-[var(--color-primary-700)]' : 'text-slate-800'}`}>
								{m.weight ?? '-'}
							</span>
							<span className="text-[8px] flex gap-1 text-slate-400">
								{t('units.kg')}
								{diff !== null && (
									<span className={[
										'text-[8px] font-black mt-0.5 md: leading-none',
										diffNum < 0 ? 'text-emerald-500' : diffNum > 0 ? 'text-rose-500' : 'text-slate-400',
									].join(' ')}>
										{diffNum > 0 ? '+' : ''}{diff}
									</span>
								)}
							</span>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}


function NutritionGoalsCard({ user, t }) {
	const goals = [
		{
			label: t('profile.calories'),
			value: user?.caloriesTarget || 0,
			unit: t('units.kcal'),
			icon: Flame,
			gradient: 'from-orange-500 to-red-400',
			softBg: 'from-orange-50 to-red-50',
			border: 'border-orange-100',
			ring: '#f97316',
			ringLight: '#fed7aa',
			textColor: 'text-orange-600',
			bgColor: 'bg-orange-500',
			hint: 85, // % of ring to fill as "example consumed"
		},
		{
			label: t('profile.protein'),
			value: user?.proteinPerDay || 0,
			unit: t('units.g'),
			icon: Dumbbell,
			gradient: 'from-blue-500 to-indigo-500',
			softBg: 'from-blue-50 to-indigo-50',
			border: 'border-blue-100',
			ring: '#3b82f6',
			ringLight: '#bfdbfe',
			textColor: 'text-blue-600',
			bgColor: 'bg-blue-500',
			hint: 62,
		},
		{
			label: t('profile.carbs'),
			value: user?.carbsPerDay || 0,
			unit: t('units.g'),
			icon: Zap,
			gradient: 'from-emerald-500 to-teal-400',
			softBg: 'from-emerald-50 to-teal-50',
			border: 'border-emerald-100',
			ring: '#10b981',
			ringLight: '#a7f3d0',
			textColor: 'text-emerald-600',
			bgColor: 'bg-emerald-500',
			hint: 74,
		},
		{
			label: t('profile.fats'),
			value: user?.fatsPerDay || 0,
			unit: t('units.g'),
			icon: Heart,
			gradient: 'from-amber-500 to-yellow-400',
			softBg: 'from-amber-50 to-yellow-50',
			border: 'border-amber-100',
			ring: '#f59e0b',
			ringLight: '#fde68a',
			textColor: 'text-amber-600',
			bgColor: 'bg-amber-500',
			hint: 50,
		},
	];

	/* SVG ring helper */
	const R = 28;
	const CIRC = 2 * Math.PI * R;
	const ringDash = (pct) => (pct / 100) * CIRC;

	return (
		<motion.div {...fadeUp} className={card + ' p-5 sm:p-6 overflow-hidden'}>

			{/* subtle radial glow behind everything */}
			<div className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden">
				<div className="absolute -top-8 -start-8 w-40 h-40 rounded-full bg-[var(--color-primary-100)] opacity-30 blur-3xl" />
			</div>

			<SectionHeader
				icon={Target}
				title={t('profile.nutritionTargets')}
				subtitle={t('messages.dailyMacroGoals')}
			/>

			{/* 2-col grid */}
			<div className="grid grid-cols-2 gap-3 relative">
				{goals.map((goal, idx) => (
					<motion.div
						key={idx}
						variants={staggerItem}
						whileHover={{ y: -2, scale: 1.015 }}
						transition={{ type: 'spring', stiffness: 340, damping: 22 }}
						className={[
							'relative overflow-hidden rounded-lg sm:rounded-lg border p-3.5 sm:p-4',
							`bg-gradient-to-br ${goal.softBg} ${goal.border}`,
							'shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]',
							'transition-shadow duration-300',
						].join(' ')}
					>
						{/* decorative large circle — top-end */}
						<div
							className={`absolute -top-5 -end-5 h-24 w-24 rounded-full bg-gradient-to-br ${goal.gradient} opacity-[0.09]`}
						/>
						{/* second smaller circle — bottom-start */}
						<div
							className={`absolute -bottom-3 -start-3 h-14 w-14 rounded-full bg-gradient-to-br ${goal.gradient} opacity-[0.06]`}
						/>

						<div className="relative flex items-start justify-between gap-2">
							{/* Left: icon + text */}
							<div className="flex-1 min-w-0">
								{/* icon badge */}
								<div
									className={[
										'inline-flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-lg mb-2.5',
										`bg-gradient-to-br ${goal.gradient}`,
									].join(' ')}
									style={{
										boxShadow: `0 4px 12px -2px ${goal.ring}55`,
									}}
								>
									<goal.icon className="h-4 w-4" />
								</div>

								{/* value + unit */}
								<div className="flex items-baseline gap-1 flex-wrap">
									<motion.span
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.1 + idx * 0.06, duration: 0.4 }}
										className="text-[22px] sm:text-3xl font-black text-slate-900 md: leading-none tabular-nums"
									>
										{goal.value || '--'}
									</motion.span>
									<span className={`text-[10px] sm:text-xs font-bold ${goal.textColor}`}>
										{goal.unit}
									</span>
								</div>

								{/* label */}
								<p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-1 truncate">
									{goal.label}
								</p>
							</div>

							{/* Right: SVG ring */}
							<div className="flex-none">
								<svg
									width="64"
									height="64"
									viewBox="0 0 64 64"
									className="-me-1 -mt-1"
								>
									{/* track */}
									<circle
										cx="32" cy="32" r={R}
										fill="none"
										stroke={goal.ringLight}
										strokeWidth="5"
										strokeLinecap="round"
									/>
									{/* progress arc */}
									<motion.circle
										cx="32" cy="32" r={R}
										fill="none"
										stroke={goal.ring}
										strokeWidth="5"
										strokeLinecap="round"
										strokeDasharray={CIRC}
										initial={{ strokeDashoffset: CIRC }}
										animate={{ strokeDashoffset: CIRC - ringDash(goal.hint) }}
										transition={{ duration: 1.1, delay: 0.15 + idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
										transform="rotate(-90 32 32)"
									/>
									{/* center pct text */}
									<text
										x="32" y="36"
										textAnchor="middle"
										fontSize="11"
										fontWeight="800"
										fill={goal.ring}
										fontFamily="inherit"
									>
										{goal.hint}%
									</text>
								</svg>
							</div>
						</div>

					</motion.div>
				))}
			</div>

		</motion.div>
	);
}

/* =========================================================================
	 MEASUREMENTS TABLE
	 ========================================================================= */
function MeasurementsTable({ measurements, onEdit, onDelete, editRowId, editRow, setEditRow, onSave, onCancel, saving, t }) {
	if (!measurements.length) return (
		<div className="flex flex-col items-center justify-center py-12 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
			<div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-slate-200">
				<Ruler className="h-7 w-7 text-slate-400" />
			</div>
			<p className="mt-4 text-sm font-bold text-slate-700">{t('messages.noMeasurements')}</p>
			<p className="mt-1 text-xs text-slate-500">{t('messages.startTracking')}</p>
		</div>
	);

	const inlineInput = (val, onChange, w = 'w-24') => (
		<input type="number"
			className={`${w} h-9 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]`}
			value={val} onChange={e => onChange(e.target.value)}
		/>
	);

	return (
		<div className="overflow-hidden rounded-lg border border-slate-100 shadow-sm">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-100">
							{[t('table.date'), t('table.weight'), t('table.waist'), t('table.chest'), t('table.actions')].map((h, i) => (
								<th key={i} className={`px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider ${i === 4 ? 'text-center' : 'rtl:text-right ltr:text-left'}`}>{h}</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-50">
						{[...measurements].reverse().map((m, idx) => {
							const isEditing = editRowId === m.id;
							return (
								<tr key={m.id || idx} className="hover:bg-slate-50/70 transition-colors group">
									<td className="px-4 py-3">
										{isEditing
											? <input type="date" className="h-9 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]" value={editRow.date} onChange={e => setEditRow(s => ({ ...s, date: e.target.value }))} />
											: <span className="text-sm font-semibold text-slate-800">{m.date}</span>
										}
									</td>
									<td className="px-4 py-3">
										{isEditing ? inlineInput(editRow.weight, v => setEditRow(s => ({ ...s, weight: v })))
											: <span className="text-sm font-black text-slate-900">{m.weight ?? '-'} <span className="text-xs font-medium text-slate-400">{t('units.kg')}</span></span>}
									</td>
									<td className="px-4 py-3">
										{isEditing ? inlineInput(editRow.waist, v => setEditRow(s => ({ ...s, waist: v })))
											: <span className="text-sm text-slate-600">{m.waist ?? '-'} <span className="text-xs text-slate-400">{t('units.cm')}</span></span>}
									</td>
									<td className="px-4 py-3">
										{isEditing ? inlineInput(editRow.chest, v => setEditRow(s => ({ ...s, chest: v })))
											: <span className="text-sm text-slate-600">{m.chest ?? '-'} <span className="text-xs text-slate-400">{t('units.cm')}</span></span>}
									</td>
									<td className="px-4 py-3">
										{!isEditing ? (
											<div className="flex items-center justify-center gap-1.5">
												<button onClick={() => onEdit(m)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-200)] transition-all text-slate-500 hover:text-[var(--color-primary-600)]" title={t('actions.edit')}>
													<Edit3 className="h-3.5 w-3.5" />
												</button>
												<button onClick={() => onDelete(m.id)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-rose-100 bg-white hover:bg-rose-50 text-rose-400 hover:text-rose-600 hover:border-rose-200 transition-all" title={t('actions.delete')}>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</div>
										) : (
											<div className="flex items-center justify-center gap-1.5">
												<button onClick={onSave} disabled={saving} className="h-8 w-8 flex items-center justify-center rounded-lg text-white shadow-md bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-primary-500)] hover:brightness-105 disabled:opacity-50 transition-all" title={t('actions.save')}>
													<Save className="h-3.5 w-3.5" />
												</button>
												<button onClick={onCancel} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-all text-slate-500" title={t('actions.cancel')}>
													<X className="h-3.5 w-3.5" />
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

/* =========================================================================
	 API HELPERS (unchanged logic)
	 ========================================================================= */
async function fetchMe() {
	try { const { data } = await api.get('/auth/me'); return data; } catch { return null; }
}
async function fetchPlanName(type, id) {
	if (!id) return null;
	try { const { data } = await api.get(type === 'exercise' ? `/plans/${id}` : `/nutrition/meal-plans/${id}`); return data?.name || null; } catch { return null; }
}
async function fetchCoach(id) {
	if (!id) return null;
	try { const { data } = await api.get(`/auth/profile/${id}`); return data; } catch { return null; }
}
async function getMeasurements(days = 120) { const { data } = await api.get('/profile/measurements', { params: { days } }); return Array.isArray(data) ? data : []; }
async function postMeasurement(payload) { const { data } = await api.post('/profile/measurements', payload); return data; }
async function putMeasurement(id, payload) { const { data } = await api.put(`/profile/measurements/${id}`, payload); return data; }
async function deleteMeasurement(id) { return api.delete(`/profile/measurements/${id}`); }
async function getPhotosTimeline(months = 12) { const { data } = await api.get('/profile/photos/timeline', { params: { months } }); return Array.isArray(data.records) ? data.records : []; }
async function deletePhotoSet(photoId) { return api.delete(`/profile/photos/${photoId}`); }

function createImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image(); img.setAttribute('crossOrigin', 'anonymous');
		img.addEventListener('load', () => resolve(img));
		img.addEventListener('error', reject);
		img.src = url;
	});
}
async function getCroppedImg(imageSrc, pixelCrop) {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const side = Math.max(pixelCrop.width, pixelCrop.height);
	canvas.width = side; canvas.height = side;
	ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, side, side);
	return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}
const blobToFile = (blob, name) => new File([blob], name, { type: blob.type });

/* =========================================================================
	 MAIN COMPONENT
	 ========================================================================= */
export default function ProfileOverviewPage() {
	const t = useTranslations('myProfile');
	useTheme();

	const [tab, setTab] = useState('overview');
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [measurements, setMeasurements] = useState([]);
	const [photoMonths, setPhotoMonths] = useState([]);

	const [editOpen, setEditOpen] = useState(false);
	const [photoPreview, setPhotoPreview] = useState(null);
	const [tipsOpen, setTipsOpen] = useState(false);
	const [compareAllOpen, setCompareAllOpen] = useState(false);
	const [compareAllIndex, setCompareAllIndex] = useState(0);
	const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState(null);
	const [confirmDeleteMeasurementId, setConfirmDeleteMeasurementId] = useState(null);
	const [cropOpen, setCropOpen] = useState(false);

	const [editForm, setEditForm] = useState({});
	const [savingProfile, setSavingProfile] = useState(false);

	const { control, handleSubmit, formState: { errors }, reset } = useForm({ defaultValues: { date: new Date(), weight: '', waist: '', chest: '' } });
	const [savingMeasure, setSavingMeasure] = useState(false);
	const [editRowId, setEditRowId] = useState(null);
	const [editRow, setEditRow] = useState({ date: '', weight: '', waist: '', chest: '' });
	const [savingEditRow, setSavingEditRow] = useState(false);

	const [showUploadBlock, setShowUploadBlock] = useState(false);
	const [pFront, setPFront] = useState(null);
	const [pBack, setPBack] = useState(null);
	const [pLeft, setPLeft] = useState(null);
	const [pRight, setPRight] = useState(null);
	const [pWeight, setPWeight] = useState('');
	const [pNote, setPNote] = useState('');
	const [pDate, setPDate] = useState(new Date());
	const [savingPhotos, setSavingPhotos] = useState(false);

	const [compare, setCompare] = useState({ side: 'front', beforeId: null, afterId: null });
	const [cropImageSrc, setCropImageSrc] = useState(null);
	const [cropSide, setCropSide] = useState(null);
	const [cropAreaPixels, setCropAreaPixels] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);

	const scrollerRef = useRef(null);

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const me = await fetchMe();
				if (!me) { setLoading(false); return; }
				const computedName = me?.name && String(me.name).includes('@') ? me.email?.split('@')[0] : me?.name;
				const [exName, mpName, coach] = await Promise.all([
					fetchPlanName('exercise', me?.activeExercisePlanId),
					fetchPlanName('meal', me?.activeMealPlanId),
					fetchCoach(me?.coachId),
				]);
				setUser({ ...me, name: computedName || me?.email || t('profile.user'), activeExercisePlan: exName ? { name: exName } : null, activeMealPlan: mpName ? { name: mpName } : null, coach: coach ? { id: coach.id, name: coach.name || coach.email } : null });
				const [mRes, pRes] = await Promise.allSettled([getMeasurements(120), getPhotosTimeline(12)]);
				if (mRes.status === 'fulfilled') setMeasurements((mRes.value || []).map(m => ({ id: m.id, date: m.date?.slice(0, 10) ?? m.date, weight: m.weight, waist: m.waist, chest: m.chest })));
				if (pRes.status === 'fulfilled') setPhotoMonths(Array.isArray(pRes.value) ? pRes.value : []);
			} catch (e) { console.error(e); }
			finally { setLoading(false); }
		})();
	}, [t]);

	const tabs = [
		{ key: 'overview', label: t('tabs.overview'), icon: Trophy },
		{ key: 'body', label: t('tabs.body'), icon: Ruler },
		{ key: 'photos', label: t('tabs.photos'), icon: Camera },
	];

	const openEditProfile = () => {
		setEditForm({ name: user?.name || '', phone: user?.phone || '', caloriesTarget: user?.caloriesTarget || '', proteinPerDay: user?.proteinPerDay || '', carbsPerDay: user?.carbsPerDay || '', fatsPerDay: user?.fatsPerDay || '' });
		setEditOpen(true);
	};

	const handleSaveProfile = async () => {
		setSavingProfile(true);
		try {
			const payload = {};
			Object.entries(editForm).forEach(([key, val]) => { if (val !== '') payload[key] = ['caloriesTarget', 'proteinPerDay', 'carbsPerDay', 'fatsPerDay'].includes(key) ? Number(val) : val; });
			const { data } = await api.put(`/auth/profile/${user.id}`, payload);
			setUser(prev => ({ ...prev, ...(data || payload) }));
			setEditOpen(false);
		} catch (e) { console.error(e); }
		finally { setSavingProfile(false); }
	};

	async function addMeasurement(form) {
		setSavingMeasure(true);
		try {
			const payload = { date: toISODate(form.date), weight: form.weight ? Number(form.weight) : undefined, waist: form.waist ? Number(form.waist) : undefined, chest: form.chest ? Number(form.chest) : undefined };
			const created = await postMeasurement(payload);
			setMeasurements(prev => [...prev, { id: created?.id || `local-${Date.now()}`, ...payload }]);
			reset({ date: new Date(), weight: '', waist: '', chest: '' });
		} finally { setSavingMeasure(false); }
	}

	function startEditRow(m) { setEditRowId(m.id); setEditRow({ date: m.date || '', weight: m.weight ?? '', waist: m.waist ?? '', chest: m.chest ?? '' }); }

	async function saveEditRow() {
		if (!editRowId) return;
		setSavingEditRow(true);
		try {
			const payload = { date: editRow.date, weight: editRow.weight ? Number(editRow.weight) : undefined, waist: editRow.waist ? Number(editRow.waist) : undefined, chest: editRow.chest ? Number(editRow.chest) : undefined };
			await putMeasurement(editRowId, payload);
			setMeasurements(prev => prev.map(m => m.id === editRowId ? { ...m, ...payload } : m));
			setEditRowId(null);
		} finally { setSavingEditRow(false); }
	}

	async function confirmDeleteMeasurement() {
		if (!confirmDeleteMeasurementId) return;
		await deleteMeasurement(confirmDeleteMeasurementId);
		setMeasurements(prev => prev.filter(m => m.id !== confirmDeleteMeasurementId));
		setConfirmDeleteMeasurementId(null);
	}

	function onPickSideFile(side, file) {
		if (!file) return;
		setCropSide(side); setCropImageSrc(URL.createObjectURL(file)); setZoom(1); setCrop({ x: 0, y: 0 }); setCropOpen(true);
	}

	async function applyCrop() {
		if (!cropImageSrc || !cropAreaPixels || !cropSide) return;
		const blob = await getCroppedImg(cropImageSrc, cropAreaPixels);
		const f = blobToFile(blob, `${cropSide}-${Date.now()}.jpg`);
		({ front: setPFront, back: setPBack, left: setPLeft, right: setPRight })[cropSide]?.(f);
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
			formData.append('data', JSON.stringify({ takenAt: toISODate(pDate), weight: pWeight ? Number(pWeight) : null, note: pNote || '' }));
			const { data: newPhoto } = await api.post('/profile/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
			setPhotoMonths(prev => [{ id: newPhoto.id, takenAt: newPhoto.takenAt, weight: newPhoto.weight, note: newPhoto.note, sides: newPhoto.sides }, ...prev]);
			setPFront(null); setPBack(null); setPLeft(null); setPRight(null); setPWeight(''); setPNote(''); setShowUploadBlock(false);
		} finally { setSavingPhotos(false); }
	};

	async function confirmDeletePhotoSet() {
		if (!confirmDeletePhotoId) return;
		await deletePhotoSet(confirmDeletePhotoId);
		setPhotoMonths(prev => prev.filter(p => p.id !== confirmDeletePhotoId));
		setConfirmDeletePhotoId(null);
	}

	const sideOptions = useMemo(() => [
		{ id: 'all', label: t('sides.all') },
		{ id: 'front', label: t('sides.front') },
		{ id: 'back', label: t('sides.back') },
		{ id: 'left', label: t('sides.left') },
		{ id: 'right', label: t('sides.right') },
	], [t]);

	const photoSetOptions = useMemo(() => photoMonths.map(p => ({ id: String(p.id), label: `${p.takenAt} (${p.weight ?? '-'} ${t('units.kg')})` })), [photoMonths, t]);
	const findPhotoById = id => photoMonths.find(p => p.id === id);
	const leftSrc = () => compare.beforeId ? findPhotoById(compare.beforeId)?.sides?.[compare.side] : '';
	const rightSrc = () => compare.afterId ? findPhotoById(compare.afterId)?.sides?.[compare.side] : '';
	const allSides = ['front', 'back', 'left', 'right'];
	const openAllCompare = () => { if (!compare.beforeId || !compare.afterId) return; setCompareAllIndex(0); setCompareAllOpen(true); };

	if (loading) return <LoadingSkeleton />;

	const leftDaysVal = daysLeft(user?.subscriptionEnd);
	const leftDaysLabel = leftDaysVal == null ? t('profile.noEndDate') : leftDaysVal <= 0 ? t('profile.expired') : `${leftDaysVal} ${t('profile.daysLeft')}`;
	const isExpiringSoon = leftDaysVal != null && leftDaysVal > 0 && leftDaysVal <= 7;

	return (
		<div className="min-h-screen w-[calc(100%+14px)] rtl:mr-[-7px] ltr:ml-[-7px] mt-[-7px]">

			<div className="relative overflow-hidden rounded-lg sm:rounded-lg bg-gradient-to-br from-[var(--color-primary-800)] via-[var(--color-primary-700)] to-[var(--color-secondary-600)]  ">

				<div className="absolute inset-0 opacity-[0.055] pointer-events-none mix-blend-overlay"
					style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

				{/* glow orbs */}
				<div className="absolute w-80 h-80 rounded-full blur-[80px] -top-40 -start-20 pointer-events-none bg-white/[0.07]" />
				<div className="absolute w-56 h-56 rounded-full blur-[60px] -bottom-24 -end-12 pointer-events-none bg-white/[0.06]" />
				<div className="absolute w-40 h-40 rounded-full blur-[48px] top-1/2 start-1/3 pointer-events-none bg-[var(--color-secondary-400)]/[0.13]" />

				{/* decorative rings */}
				<div className="absolute -top-6 -end-6 w-28 h-28 rounded-full border border-white/[0.12] pointer-events-none" />
				<div className="absolute -top-2 -end-2 w-16 h-16 rounded-full border border-white/[0.08] pointer-events-none" />
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

				<div className="relative z-10 p-4 sm:p-6 pb-3 sm:pb-4">

					{/* ── Identity row ── */}
					<div className="flex items-start justify-between gap-3 mb-5">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							{/* Avatar */}
							<motion.div
								whileHover={{ scale: 1.06, rotate: 3 }}
								transition={{ type: 'spring', stiffness: 380, damping: 20 }}
								className="relative flex-none w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white/[0.18] backdrop-blur-[16px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.38)] flex items-center justify-center"
							>
								<UserIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
								{/* online dot */}
								<span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[var(--color-primary-700)] shadow-sm" />
							</motion.div>

							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<h1 className="text-lg sm:text-2xl font-black text-white md: leading-tight truncate">
										{user?.name || t('profile.user')}
									</h1>
								</div>
								<p className="text-[10px] sm:text-xs text-white/55 mt-0.5 font-medium truncate">{user?.email}</p>
							</div>
						</div>

						{/* Right actions */}
						<div className="flex items-center gap-2 shrink-0">
							{/* Subscription badge */}
							<motion.div
								className={[
									'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border backdrop-blur-sm',
									isExpiringSoon
										? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
										: 'bg-white/[0.14] border-white/[0.22] text-white',
								].join(' ')}
								animate={isExpiringSoon ? { scale: [1, 1.03, 1] } : {}}
								transition={{ repeat: Infinity, duration: 2 }}
								title={String(user?.subscriptionEnd || '')}
							>
								<Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
								<span className="hidden sm:inline">{leftDaysLabel}</span>
								<span className="sm:hidden">{leftDaysVal ?? '—'}</span>
							</motion.div>

							{/* Edit button */}
							<motion.button
								whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
								onClick={openEditProfile}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.16] backdrop-blur-sm border border-white/[0.22] text-white text-[10px] sm:text-xs font-bold hover:bg-white/[0.24] transition-all shadow-sm"
							>
								<Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
								<span className="hidden sm:inline">{t('actions.edit')}</span>
							</motion.button>
						</div>
					</div>

					{/* ── Stats 4-col ── */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
						<HeaderStatPill label={t('stats.membership')} value={user?.membership || t('profile.basic')} icon={Award} delay={0.05} accent />
						<HeaderStatPill label={t('stats.coach')} value={user?.coach?.name || t('profile.noCoach')} icon={User2} delay={0.11} />
						<HeaderStatPill label={t('stats.exercisePlan')} value={user?.activeExercisePlan?.name || t('profile.none')} icon={Dumbbell} delay={0.17} accent />
						<HeaderStatPill label={t('stats.mealPlan')} value={user?.activeMealPlan?.name || t('profile.none')} icon={Apple} delay={0.23} />
					</div>

					{/* ── Tabs ── */}
					<div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 -mb-1">
						{tabs.map(({ key, label, icon: Icon }, i) => {
							const on = tab === key;
							return (
								<motion.button
									key={key}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.06 + i * 0.05 }}
									onClick={() => setTab(key)}
									whileTap={{ scale: 0.96 }}
									className="relative shrink-0 flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-lg cursor-pointer whitespace-nowrap font-bold transition-all duration-200 border-none bg-transparent text-[11px] sm:text-xs"
									style={{ color: on ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.65)' }}
								>
									{on && (
										<motion.div
											layoutId="profile-tab-bg"
											className="absolute inset-0 rounded-lg sm:rounded-lg bg-white shadow-lg"
											transition={{ type: 'spring', stiffness: 500, damping: 42 }}
										/>
									)}
									<span className="relative z-10 flex items-center gap-1.5">
										<Icon className={`h-3.5 w-3.5 ${on ? 'text-[var(--color-primary-600)]' : ''}`} />
										{label}
									</span>
								</motion.button>
							);
						})}
					</div>
				</div>
			</div>

			{/* ═══════════════════════ CONTENT ═══════════════════════ */}
			<div className=" pt-4 pb-24">
				<AnimatePresence mode="wait">

					{/* ── OVERVIEW TAB ── */}
					{tab === 'overview' && (
						<motion.div key="overview" variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-3 gap-4">

							<NutritionGoalsCard user={user} t={t} />

							<motion.div variants={staggerItem} className={card + ' lg:col-span-2 p-5 sm:p-6'}>
								<WeightTrendChart data={measurements} t={t} />
							</motion.div>

							{/* Compare card */}
							<motion.div
								variants={staggerItem}
								className={card + ' lg:col-span-3 p-5 sm:p-6 overflow-hidden'}
							>
								{/* Ambient glow */}
								<div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[var(--color-primary-100)] opacity-20 blur-3xl pointer-events-none" />

								<SectionHeader
									icon={ImageIcon}
									title={t('sections.compare')}
									subtitle={t('messages.compareHint')}
								/>

								{/* Controls row */}
								<div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
									<Select
										searchable={false}
										options={sideOptions}
										value={compare.side}
										onChange={val => setCompare(s => ({ ...s, side: String(val) }))}
										placeholder={t('labels.side')}
									/>
									<Select
										searchable={false}
										options={photoSetOptions}
										value={compare.beforeId || ''}
										onChange={val => setCompare(s => ({ ...s, beforeId: String(val) }))}
										placeholder={t('labels.before')}
										clearable
									/>
									<Select
										searchable={false}
										options={photoSetOptions}
										value={compare.afterId || ''}
										onChange={val => setCompare(s => ({ ...s, afterId: String(val) }))}
										placeholder={t('labels.after')}
										clearable
									/>
									<Btn
										variant="primary"
										disabled={!compare.beforeId || !compare.afterId}
										onClick={() =>
											compare.side === 'all'
												? openAllCompare()
												: setPhotoPreview({ before: leftSrc(), after: rightSrc() })
										}
									>
										{t('actions.preview')}
									</Btn>
								</div>

								{/* Preview area */}
								{compare.beforeId && compare.afterId && compare.side !== 'all' ? (
									<motion.div
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
										className="rounded-2xl overflow-hidden ring-1 ring-slate-100 shadow-sm"
									>
										<BeforeAfter before={leftSrc()} after={rightSrc()} name="progress" t={t} />
									</motion.div>
								) : (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ duration: 0.3 }}
										className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 relative overflow-hidden"
									>
										{/* decorative circles */}
										<div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[var(--color-primary-100)] opacity-20 blur-2xl pointer-events-none" />
										<div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-[var(--color-primary-100)] opacity-15 blur-xl pointer-events-none" />

										<motion.div
											animate={{ y: [0, -4, 0] }}
											transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
											className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200 mb-4"
										>
											<ImageIcon className="h-7 w-7 text-slate-300" />
										</motion.div>

										<p className="text-sm font-black text-slate-600">{t('messages.chooseTwoSets')}</p>
										<p className="text-xs text-slate-400 mt-1 font-medium">{t('messages.compareHint')}</p>
									</motion.div>
								)}
							</motion.div>
						</motion.div>
					)}

					{/* ── BODY TAB ── */}
					{tab === 'body' && (
						<motion.div key="body" {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">

							{/* add measurement form */}
							<div className={card + ' p-5 sm:p-6'}>
								<SectionHeader icon={Plus} title={t('forms.addMeasurement')} subtitle={t('messages.trackYourMeasurements')} />
								<form onSubmit={handleSubmit(addMeasurement)} className="space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<Controller name="date" control={control} render={({ field }) => (
											<InputDate placeholder={t('forms.date')} value={field.value} onChange={field.onChange} />
										)} />
										<Controller name="weight" control={control} rules={{ required: t('errors.required') }} render={({ field }) => (
											<Input placeholder={t('forms.weightKg')} {...field} error={errors.weight?.message} />
										)} />
										<Controller name="waist" control={control} render={({ field }) => <Input placeholder={t('forms.waistCm')} {...field} />} />
										<Controller name="chest" control={control} render={({ field }) => <Input placeholder={t('forms.chestCm')} {...field} />} />
									</div>
									<Btn type="submit" variant="primary" disabled={savingMeasure} className="w-full" icon={Plus}>
										{savingMeasure ? t('actions.saving') : t('actions.save')}
									</Btn>
								</form>
							</div>

							{/* measurements table — spans 2 cols */}
							<div className={card + ' p-5 sm:p-6 lg:col-span-2'}>
								<SectionHeader icon={Ruler} title={t('sections.measurements')} subtitle={t('messages.measurementHistory')} />
								<MeasurementsTable
									measurements={measurements}
									onEdit={startEditRow}
									onDelete={id => setConfirmDeleteMeasurementId(id)}
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

					{/* ── PHOTOS TAB ── */}
					{tab === 'photos' && (
						<motion.div key="photos" {...fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

							{/* upload panel */}
							<div className={card + ' p-5 sm:p-6'}>
								<SectionHeader
									icon={Camera}
									title={t('sections.uploadBodyPhotos')}
									subtitle={t('messages.uploadProgressPhotos')}
									action={
										<button onClick={() => setTipsOpen(true)}
											className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500">
											<Info className="h-4 w-4" />
										</button>
									}
								/>

								<Btn variant="outline" className="w-full mb-4" icon={Upload} onClick={() => setShowUploadBlock(s => !s)}>
									{showUploadBlock ? t('actions.hideUpload') : t('actions.addBodyPhotos')}
								</Btn>

								<AnimatePresence>
									{showUploadBlock && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											className="space-y-4 overflow-hidden"
										>
											{/* photo grid */}
											<div className="grid grid-cols-2 gap-2.5">
												{[
													{ key: 'front', label: t('sides.front'), file: pFront, setter: setPFront },
													{ key: 'back', label: t('sides.back'), file: pBack, setter: setPBack },
													{ key: 'left', label: t('sides.left'), file: pLeft, setter: setPLeft },
													{ key: 'right', label: t('sides.right'), file: pRight, setter: setPRight },
												].map(({ key, label, file, setter }) => (
													<div key={key}
														className="relative rounded-lg border-2 border-dashed border-[var(--color-primary-200)] bg-[var(--color-primary-50)] aspect-square overflow-hidden transition-all hover:border-[var(--color-primary-400)]">
														{!file ? (
															<label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center gap-1.5 hover:bg-[var(--color-primary-100)]/50 transition-colors">
																<div className="h-9 w-9 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-100">
																	<ImagePlus className="h-4 w-4 text-[var(--color-primary-500)]" />
																</div>
																<span className="text-[11px] font-bold text-[var(--color-primary-600)]">{label}</span>
																<input type="file" accept="image/*" className="hidden" onChange={e => onPickSideFile(key, e.target.files?.[0])} />
															</label>
														) : (
															<>
																<img src={URL.createObjectURL(file)} alt={label} className="absolute inset-0 w-full h-full object-cover" />
																<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
																<span className="absolute bottom-2 start-2 text-[10px] font-bold text-white">{label}</span>
																<button onClick={() => setter(null)}
																	className="absolute top-2 end-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
																	<X className="h-3.5 w-3.5" />
																</button>
															</>
														)}
													</div>
												))}
											</div>

											<div className="space-y-2.5">
												<InputDate placeholder={t('forms.date')} value={pDate} onChange={setPDate} />
												<Input placeholder={t('forms.weightOptional')} value={pWeight} onChange={setPWeight} />
												<Input placeholder={t('forms.noteOptional')} value={pNote} onChange={setPNote} />
											</div>

											<Btn variant="primary" className="w-full" disabled={savingPhotos || (!pFront && !pBack && !pLeft && !pRight)} icon={Save} onClick={savePhotoSet}>
												{savingPhotos ? t('actions.saving') : t('actions.saveSet')}
											</Btn>
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* timeline */}
							<div className={card + ' lg:col-span-2 p-5 sm:p-6'}>
								<SectionHeader
									icon={ImageIcon}
									title={t('sections.timeline')}
									subtitle={t('messages.photoHistory')}
									action={
										<div className="flex gap-1.5">
											{[
												{ fn: () => scrollerRef.current?.scrollBy({ left: -320, behavior: 'smooth' }), icon: ChevronsLeft, label: t('actions.scrollLeft') },
												{ fn: () => scrollerRef.current?.scrollBy({ left: 320, behavior: 'smooth' }), icon: ChevronsRight, label: t('actions.scrollRight') },
											].map(({ fn, icon: I, label }) => (
												<button key={label} onClick={fn} aria-label={label}
													className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
													<I className="rtl:scale-x-[-1] h-4 w-4" />
												</button>
											))}
										</div>
									}
								/>

								{!photoMonths.length ? (
									<div className="flex flex-col items-center justify-center py-14 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
										<ImagePlus className="h-11 w-11 text-slate-300 mb-3" />
										<p className="text-sm font-semibold text-slate-500 mb-4">{t('messages.noTimeline')}</p>
										<Btn variant="primary" icon={Upload} onClick={() => setShowUploadBlock(true)}>{t('actions.addBodyPhotos')}</Btn>
									</div>
								) : (
									<div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:thin]">
										{photoMonths.map(entry => (
											<div key={entry.id}
												className="min-w-[300px] snap-start rounded-lg border border-slate-100 bg-white p-4 shadow-sm hover:shadow-lg transition-all duration-300">
												{/* entry header */}
												<div className="flex items-center justify-between mb-3">
													<div>
														<p className="text-sm font-black text-slate-900">{entry.takenAt}</p>
														{entry.note && <p className="text-xs text-slate-400 truncate max-w-[160px]">{entry.note}</p>}
													</div>
													<div className="flex items-center gap-2">
														<div className="flex items-center gap-1 bg-[var(--color-primary-50)] rounded-lg px-2.5 py-1.5 border border-[var(--color-primary-100)]">
															<Scale className="h-3 w-3 text-[var(--color-primary-500)]" />
															<span className="text-xs font-black text-[var(--color-primary-700)]">{entry.weight ?? '-'}</span>
															<span className="text-[9px] text-[var(--color-primary-500)]">{t('units.kg')}</span>
														</div>
														<button onClick={() => setConfirmDeletePhotoId(entry.id)}
															className="h-7 w-7 flex items-center justify-center rounded-lg border border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all">
															<Trash2 className="h-3.5 w-3.5" />
														</button>
													</div>
												</div>
												{/* photo grid */}
												<div className="grid grid-cols-2 gap-1.5">
													{['front', 'back', 'left', 'right'].map(side => (
														<button key={side}
															onClick={() => setPhotoPreview({ src: entry.sides?.[side], label: `${entry.takenAt} — ${t(`sides.${side}`)}` })}
															className="group relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 aspect-square transition-all hover:border-[var(--color-primary-300)] hover:shadow-md"
														>
															<Img src={entry.sides?.[side]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={t(`sides.${side}`)} />
															<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
															<span className="absolute bottom-1 start-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{t(`sides.${side}`)}</span>
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
			</div>

			{/* ═══════════════════════ MODALS ═══════════════════════ */}
			<Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} title={photoPreview?.label} maxW="max-w-4xl">
				{photoPreview?.src
					? <div className="rounded-lg overflow-hidden"><Img src={photoPreview.src} alt={photoPreview.label} className="w-full" /></div>
					: photoPreview?.before && photoPreview?.after
						? <BeforeAfter before={photoPreview.before} after={photoPreview.after} name="preview" t={t} />
						: null
				}
			</Modal>

			<Modal open={compareAllOpen} onClose={() => setCompareAllOpen(false)} title={t('labels.beforeAfter')} maxW="max-w-4xl">
				<div className="flex items-center justify-between mb-4">
					<span className="text-lg font-black capitalize">{t(`sides.${allSides[compareAllIndex]}`)}</span>
					<div className="flex gap-2">
						<Btn variant="outline" size="sm" onClick={() => setCompareAllIndex(i => (i + 3) % 4)}><ChevronsLeft className=" rtl:scale-x-[-1] h-4 w-4" /></Btn>
						<Btn variant="outline" size="sm" onClick={() => setCompareAllIndex(i => (i + 1) % 4)}><ChevronsRight className=" rtl:scale-x-[-1] h-4 w-4" /></Btn>
					</div>
				</div>
				<BeforeAfter
					before={findPhotoById(compare.beforeId)?.sides?.[allSides[compareAllIndex]] || ''}
					after={findPhotoById(compare.afterId)?.sides?.[allSides[compareAllIndex]] || ''}
					name="all-sides" t={t}
				/>
			</Modal>

			<Modal open={tipsOpen} onClose={() => setTipsOpen(false)} title={t('modals.photographyTipsTitle')} maxW="max-w-2xl">
				<div className="space-y-3">
					{['lighting', 'distance', 'angles', 'cameraHeight', 'timer', 'clothes', 'background', 'frequency'].map(key => (
						<div key={key} className="flex gap-3 p-3.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] border border-[var(--color-primary-100)]">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-400)] text-white shrink-0 shadow-sm">
								<Lightbulb className="h-4 w-4" />
							</div>
							<p className="text-sm text-slate-700 md: leading-relaxed">{t(`tips.${key}`)}</p>
						</div>
					))}
				</div>
			</Modal>

			<Modal open={!!confirmDeletePhotoId} onClose={() => setConfirmDeletePhotoId(null)} title={t('modals.confirmDeleteTitle')} maxW="max-w-md">
				<p className="text-sm text-slate-600 mb-6 md: leading-relaxed">{t('messages.deletePhotoConfirm')}</p>
				<div className="flex gap-3">
					<Btn variant="danger" onClick={confirmDeletePhotoSet} className="flex-1">{t('actions.delete')}</Btn>
					<Btn variant="outline" onClick={() => setConfirmDeletePhotoId(null)} className="flex-1">{t('actions.cancel')}</Btn>
				</div>
			</Modal>

			<Modal open={!!confirmDeleteMeasurementId} onClose={() => setConfirmDeleteMeasurementId(null)} title={t('modals.confirmDeleteTitle')} maxW="max-w-md">
				<p className="text-sm text-slate-600 mb-6 md: leading-relaxed">{t('messages.deleteMeasurementConfirm')}</p>
				<div className="flex gap-3">
					<Btn variant="danger" onClick={confirmDeleteMeasurement} className="flex-1">{t('actions.delete')}</Btn>
					<Btn variant="outline" onClick={() => setConfirmDeleteMeasurementId(null)} className="flex-1">{t('actions.cancel')}</Btn>
				</div>
			</Modal>

			<Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('modals.editProfileTitle')} maxW="max-w-2xl">
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Input placeholder={t('profile.name')} value={editForm.name || ''} onChange={val => setEditForm(f => ({ ...f, name: val }))} />
						<Input placeholder={t('profile.phone')} value={editForm.phone || ''} onChange={val => setEditForm(f => ({ ...f, phone: val }))} />
					</div>
					<div className="rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] p-4">
						<p className="text-xs font-black text-[var(--color-primary-600)] uppercase tracking-wider mb-3">{t('profile.nutritionTargets')}</p>
						<div className="grid grid-cols-2 gap-3">
							<Input placeholder={t('profile.caloriesTarget')} type="number" value={editForm.caloriesTarget || ''} onChange={val => setEditForm(f => ({ ...f, caloriesTarget: val }))} />
							<Input placeholder={t('profile.proteinPerDay')} type="number" value={editForm.proteinPerDay || ''} onChange={val => setEditForm(f => ({ ...f, proteinPerDay: val }))} />
							<Input placeholder={t('profile.carbsPerDay')} type="number" value={editForm.carbsPerDay || ''} onChange={val => setEditForm(f => ({ ...f, carbsPerDay: val }))} />
							<Input placeholder={t('profile.fatsPerDay')} type="number" value={editForm.fatsPerDay || ''} onChange={val => setEditForm(f => ({ ...f, fatsPerDay: val }))} />
						</div>
					</div>
					<Btn variant="primary" onClick={handleSaveProfile} disabled={savingProfile} className="w-full" icon={Save}>
						{savingProfile ? t('actions.saving') : t('actions.save')}
					</Btn>
				</div>
			</Modal>

			<Modal open={cropOpen} onClose={() => setCropOpen(false)} title={t('modals.cropImageTitle')} maxW="max-w-3xl">
				{cropImageSrc && (
					<div className="space-y-4">
						<div className="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden">
							<Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, p) => setCropAreaPixels(p)} cropShape="rect" objectFit="contain" />
						</div>
						<div className="flex items-center gap-4 px-1">
							<span className="text-xs font-semibold text-slate-600 shrink-0">{t('labels.zoom')}</span>
							<input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--color-primary-500)]" />
							<span className="text-xs font-bold text-slate-800 shrink-0 w-8">{zoom.toFixed(1)}×</span>
						</div>
						<div className="flex gap-3">
							<Btn variant="primary" onClick={applyCrop} className="flex-1">{t('actions.apply')}</Btn>
							<Btn variant="outline" onClick={() => setCropOpen(false)} className="flex-1">{t('actions.cancel')}</Btn>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}