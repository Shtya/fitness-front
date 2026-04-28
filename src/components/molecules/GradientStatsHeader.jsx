'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Plus, TrendingUp, Sparkles, ChevronDown,
	ArrowUpRight, ArrowDownRight, SlidersHorizontal,
	RefreshCw, X, Check,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
	 SPRING PRESETS
═══════════════════════════════════════════════════════════════ */
const sp = { type: 'spring', stiffness: 420, damping: 32, mass: 0.75 };
const sm = { type: 'spring', stiffness: 280, damping: 26, mass: 1 };
const en = { type: 'spring', stiffness: 220, damping: 24, mass: 1.1 };

/* ═══════════════════════════════════════════════════════════════
	 INJECTED KEYFRAMES (once per document)
═══════════════════════════════════════════════════════════════ */
const GSH_CSS = `
@keyframes orb-a {
  0%,100% { transform: translate(0,0) scale(1); }
  40%      { transform: translate(30px,18px) scale(1.08); }
  70%      { transform: translate(-18px,28px) scale(.95); }
}
@keyframes orb-b {
  0%,100% { transform: translate(0,0) scale(1); }
  35%     { transform: translate(-22px,-16px) scale(1.05); }
  65%     { transform: translate(14px,22px) scale(.97); }
}
@keyframes dot-grid-drift {
  0%,100% { transform: translate(0,0); }
  50%     { transform: translate(4px,4px); }
}
@keyframes float-icon {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-5px); }
}
@keyframes ring-pulse {
  0%,100% { opacity:.22; transform:scale(1); }
  50%      { opacity:.45; transform:scale(1.06); }
}
/* KPI card hover */
.gsh-kpi:hover {
  background: rgba(255,255,255,.15) !important;
  transform: translateY(-3px);
  box-shadow: 0 12px 36px rgba(0,0,0,.28) !important;
}
.gsh-kpi { transition: background .2s, transform .22s, box-shadow .22s; }
/* Hdr btn hover */
.gsh-btn:hover  { background: rgba(255,255,255,.26) !important; transform: translateY(-1px); }
.gsh-btn:active { transform: scale(.97); }
.gsh-btn        { transition: background .18s, transform .14s; }
/* Tab hover */
.gsh-tab:not(.gsh-tab-active):hover { color: rgba(255,255,255,.95) !important; background: rgba(255,255,255,.08) !important; }
.gsh-tab { transition: color .18s, background .18s; }
`;

function injectStyles() {
	if (typeof document === 'undefined') return;
	if (!document.getElementById('gsh-v2-styles')) {
		const s = document.createElement('style');
		s.id = 'gsh-v2-styles';
		s.innerHTML = GSH_CSS;
		document.head.appendChild(s);
	}
}

/* ═══════════════════════════════════════════════════════════════
	 FILTER PORTAL
═══════════════════════════════════════════════════════════════ */
function FilterPortal({ anchorRef, open, onClose, children }) {
	const [pos, setPos] = useState({ top: 0, left: 0, width: 340 });

	const reposition = useCallback(() => {
		if (!anchorRef.current || !open) return;
		const rect = anchorRef.current.getBoundingClientRect();
		const W = 340, vw = window.innerWidth, scrollY = window.scrollY;
		let left = rect.right - W;
		if (left < 8) left = 8;
		if (left + W > vw - 8) left = vw - W - 8;
		setPos({ top: rect.bottom + scrollY + 10, left, width: W });
	}, [anchorRef, open]);

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
		const h = e => {
			if (anchorRef.current?.contains(e.target)) return;
			if (document.getElementById('gsh-fp-panel')?.contains(e.target)) return;
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
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className='fixed inset-0 z-[998]'
						style={{ backdropFilter: 'blur(4px)', background: 'rgba(10,14,26,0.25)' }}
						onClick={onClose}
					/>
					{/* Panel */}
					<motion.div
						id='gsh-fp-panel'
						initial={{ opacity: 0, y: 14, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.96 }}
						transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
						style={{
							position: 'absolute',
							top: pos.top, left: pos.left, width: pos.width, zIndex: 999,
							borderRadius: 24, overflow: 'hidden',
							background: 'rgba(255,253,249,0.98)',
							border: '1.5px solid var(--color-primary-100, #e0e7ff)',
							boxShadow: '0 32px 100px -12px rgba(15,23,42,0.28), 0 0 0 1px rgba(255,255,255,0.6) inset',
						}}>
						{children}
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body,
	);
}

/* ═══════════════════════════════════════════════════════════════
	 FILTER PANEL CONTENT
═══════════════════════════════════════════════════════════════ */
function FilterToggle({ group, value, onChange }) {
	return (
		<div>
			<p className='mb-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400'>{group.label}</p>
			<div className='flex flex-wrap gap-2'>
				{group.options.map(opt => {
					const active = value === opt.value;
					return (
						<button
							key={opt.value}
							onClick={() => onChange(active ? '' : opt.value)}
							className='relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95 focus:outline-none'
							style={active
								? { background: 'linear-gradient(135deg,var(--color-gradient-from,#4f46e5),var(--color-gradient-to,#7c3aed))', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 16px -2px rgba(99,102,241,0.4)' }
								: { borderColor: '#f1f5f9', background: '#f8fafc', color: '#64748b' }}>
							{opt.icon && <span className='text-sm'>{opt.icon}</span>}
							{opt.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function FilterPanelContent({ filters, filterValues, onFilterChange, onFilterReset, onClose, activeFilterCount }) {
	return (
		<>
			{/* Header */}
			<div className='flex items-center justify-between border-b px-5 py-4' style={{ borderColor: 'var(--color-primary-100,#e0e7ff)' }}>
				<div className='flex items-center gap-3'>
					<div className='grid h-8 w-8 place-items-center rounded-lg shadow-sm'
						style={{ background: 'linear-gradient(135deg,var(--color-gradient-from,#4f46e5),var(--color-gradient-to,#7c3aed))' }}>
						<SlidersHorizontal className='h-3.5 w-3.5 text-white' />
					</div>
					<span className='text-sm font-black tracking-tight text-slate-800'>Filter Options</span>
					<AnimatePresence>
						{activeFilterCount > 0 && (
							<motion.span key='badge' initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
								className='rounded-lg px-2 py-0.5 text-[9px] font-black'
								style={{ background: 'var(--color-primary-100,#e0e7ff)', color: 'var(--color-primary-700,#4338ca)' }}>
								{activeFilterCount} active
							</motion.span>
						)}
					</AnimatePresence>
				</div>
				<div className='flex items-center gap-1'>
					<AnimatePresence>
						{activeFilterCount > 0 && (
							<motion.button key='reset'
								initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
								onClick={onFilterReset}
								className='inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-rose-500 transition-all hover:bg-rose-50'>
								<RefreshCw className='h-3 w-3' /> Clear all
							</motion.button>
						)}
					</AnimatePresence>
					<button onClick={onClose} className='grid h-7 w-7 place-items-center rounded-lg text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-600'>
						<X className='h-3.5 w-3.5' />
					</button>
				</div>
			</div>

			{/* Filter groups */}
			<div className='max-h-[min(440px,60vh)] space-y-4 overflow-y-auto px-5 py-4'>
				{filters.map(group => (
					<FilterToggle key={group.key} group={group} value={filterValues[group.key] ?? ''} onChange={v => onFilterChange(group.key, v)} />
				))}
			</div>

			{/* Apply */}
			<div className='border-t px-5 py-4' style={{ borderColor: 'var(--color-primary-100,#e0e7ff)' }}>
				<button onClick={onClose}
					className='relative w-full overflow-hidden rounded-lg py-3 text-sm font-black text-white shadow-lg transition-all hover:opacity-95'
					style={{ background: 'linear-gradient(135deg,var(--color-gradient-from,#4f46e5),var(--color-gradient-to,#7c3aed))' }}>
					<span className='flex items-center justify-center gap-2'>
						<Check className='h-4 w-4' strokeWidth={3} /> Apply Filters
					</span>
				</button>
			</div>
		</>
	);
}

/* ═══════════════════════════════════════════════════════════════
	 KPI SKELETON
═══════════════════════════════════════════════════════════════ */
function KpiSkeleton({ count = 4 }) {
	return Array.from({ length: count }).map((_, i) => (
		<div key={i} className='flex items-center gap-3.5 rounded-lg border border-white/10 bg-white/[0.07] p-[17px]'>
			<div className='h-[42px] w-[42px] shrink-0 rounded-lg bg-white/[0.14] animate-pulse' />
			<div className='flex-1 space-y-2'>
				<div className='h-2 w-[52%] rounded-full bg-white/[0.14] animate-pulse' />
				<div className='h-4 w-[36%] rounded-full bg-white/20 animate-pulse' />
			</div>
		</div>
	));
}

/* ═══════════════════════════════════════════════════════════════
	 KPI CARD  (exported — usable standalone)
═══════════════════════════════════════════════════════════════ */
export function KpiCard({ icon: Icon, label, value, trend, trendValue, sub, loading }) {
	if (loading) return <KpiSkeleton count={1} />;

	const up = trend === 'up';

	return (
		<div className='gsh-kpi relative cursor-default overflow-hidden rounded-lg border border-white/[0.12] bg-white/[0.09] p-[17px] shadow-[0_4px_20px_rgba(0,0,0,.18)] backdrop-blur-xl'>

			{/* Top accent stripe */}
			<div className='absolute left-0 right-0 top-0 h-[3px] rounded-t-2xl'
				style={{
					background: up
						? 'linear-gradient(90deg,rgba(165,180,252,.9),rgba(129,140,248,1))'
						: 'linear-gradient(90deg,rgba(192,132,252,.9),rgba(168,85,247,1))'
				}} />

			{/* Corner glow */}
			<div className='pointer-events-none absolute inset-0 rounded-lg'
				style={{
					background: up
						? 'linear-gradient(135deg,rgba(165,180,252,.08) 0%,transparent 55%)'
						: 'linear-gradient(135deg,rgba(192,132,252,.08) 0%,transparent 55%)'
				}} />

			{/* Left accent bar */}
			<div className='absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-40'
				style={{ background: 'rgba(255,255,255,0.6)' }} />

			<div className='flex items-center gap-3.5'>
				{Icon && (
					<div className='grid h-11 w-11 shrink-0 place-content-center rounded-lg border border-white/20 bg-white/[0.13] shadow-[0_2px_10px_rgba(0,0,0,.2)]'>
						<Icon className='h-[19px] w-[19px] text-white' strokeWidth={2.2} />
					</div>
				)}

				<div className='min-w-0 flex-1'>
					<p className='mb-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-white/[0.5]'>{label}</p>

					<div className='flex items-baseline gap-2'>
						<span className='text-[22px] font-black leading-none tracking-tight text-white'>{value}</span>

						{trend && trendValue && (
							<span className='inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide'
								style={{
									background: up ? 'rgba(165,180,252,.15)' : 'rgba(192,132,252,.15)',
									border: up ? '1px solid rgba(165,180,252,.3)' : '1px solid rgba(192,132,252,.3)',
									color: up ? 'rgba(199,210,254,.95)' : 'rgba(216,180,254,.95)',
								}}>
								{up
									? <ArrowUpRight className='h-2.5 w-2.5' strokeWidth={2.8} />
									: <ArrowDownRight className='h-2.5 w-2.5' strokeWidth={2.8} />}
								{trendValue}
							</span>
						)}
					</div>

					{sub && <p className='mt-1.5 text-[10px] font-medium text-white/50'>{sub}</p>}
				</div>
			</div>

			{/* Bottom edge line */}
			<div className='absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent' />
		</div>
	);
}

export function GradientStatsHeader({ 
	title, desc, icon: Icon, className = '', innerCn = '', 
	stats = [], children, loadingStats, hiddenStats, statsCollapsible = false,
 	tabs = [], activeTab, onTabChange,
 	filters = [], filterValues = {}, onFilterChange, onFilterReset,
 	actions, btnName, onClick, someThing,
}) {
	injectStyles();

	const [statsOpen, setStatsOpen] = useState(true);
	const [filterOpen, setFilterOpen] = useState(false);
	const filterBtnRef = useRef(null);

	const activeFilterCount = Object.values(filterValues).filter(
		v => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
	).length;

	/* Merge children into stats grid if passed old-style */
	const hasStats = stats.length > 0 || !!children;

	return (
		<motion.div
			initial={{ opacity: 0, y: 28, scale: 0.972 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={en}
			className={`relative overflow-hidden ${tabs.length > 0 ? 'rounded-[14px_14px_0_0]' : 'rounded-lg'} border border-white/[0.16] ${className}`}>

			{/* ══════════════════════════════════════
          BACKGROUND STACK
      ══════════════════════════════════════ */}
			<div className='absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none'>
				{/* 1. Base deep gradient */}
				<div className='absolute inset-0'
					style={{ background: 'linear-gradient(145deg, var(--color-gradient-from,#4f46e5) 0%, var(--color-gradient-via,#6366f1) 50%, var(--color-gradient-to,#7c3aed) 100%)' }} />

				{/* 2. Depth overlay */}
				<div className='absolute inset-0 bg-gradient-to-b from-black/[0.04] to-black/[0.26]' />

				{/* 3. Orb A — top-left */}
				<div className='absolute -top-[150px] -left-[110px] h-[480px] w-[480px] rounded-full opacity-[0.28]'
					style={{ background: 'radial-gradient(circle, var(--color-primary-300,#a5b4fc) 0%, transparent 68%)', animation: 'orb-a 11s ease-in-out infinite' }} />

				{/* 4. Orb B — bottom-right */}
				<div className='absolute -bottom-[130px] -right-[90px] h-[420px] w-[420px] rounded-full opacity-20'
					style={{ background: 'radial-gradient(circle, var(--color-primary-400,#818cf8) 0%, transparent 65%)', animation: 'orb-b 14s ease-in-out infinite' }} />

				{/* 5. Dot grid */}
				<div className='absolute inset-0 opacity-[0.055]'
					style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '28px 28px', animation: 'dot-grid-drift 8s ease-in-out infinite' }} />

				{/* 6. Noise texture */}
				<div className='absolute inset-0 opacity-[0.03]'
					style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

				{/* 7. Decorative rings SVG */}
				<svg className='absolute -right-16 top-0 h-full w-auto opacity-[0.04]' viewBox='0 0 200 300' fill='none' aria-hidden='true'>
					<circle cx='200' cy='150' r='140' stroke='white' strokeWidth='40' />
					<circle cx='200' cy='150' r='80' stroke='white' strokeWidth='20' />
				</svg>

				{/* 8. Top highlight edge */}
				<div className='absolute top-0 left-[4%] right-[4%] h-px bg-gradient-to-r from-transparent via-white/55 to-transparent' />

				{/* 9. Bottom edge line */}
				<div className='absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent' />
			</div>

			{/* ══════════════════════════════════════
          CONTENT
      ══════════════════════════════════════ */}
			<div className='relative z-10 px-6 pt-7 sm:px-8 lg:px-10'>

				{/* ── Top row: icon + title | actions ── */}
				<div className={`flex max-md:flex-col flex-wrap items-start justify-between gap-5 ${innerCn}`}>

					{/* Left — icon + title/desc */}
					<div className='flex  flex-1 items-center gap-5'>
						{Icon && (
							<motion.div
								whileHover={{ scale: 1.08, rotate: 6 }}
								transition={sp}
								className=' max-md:!w-[40px] max-md:!h-[40px] relative grid shrink-0 place-content-center rounded-lg border border-white/[0.26] bg-white/[0.16] backdrop-blur-xl shadow-[0_6px_28px_rgba(0,0,0,.28),0_1px_0_rgba(255,255,255,.2)_inset]'
								style={{ width: 64, height: 64, animation: 'float-icon 4.2s ease-in-out infinite' }}>
								{/* Pulsing ring */}
								<div className='absolute -inset-2 rounded-[22px] border border-white/20'
									style={{ animation: 'ring-pulse 3.2s ease-in-out infinite' }} />
								<Icon className='relative z-10 h-7 w-7 text-white' strokeWidth={2.2}
									style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
							</motion.div>
						)}

						<div className='min-w-0 flex-1'>
							<motion.h1
								initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07, ...sm }}
								className='mb-1.5 flex items-center gap-2.5 max-md:text-base text-[clamp(1.5rem,3vw,2.2rem)] font-black leading-tight tracking-tight text-white'
								style={{ textShadow: '0 1px 12px rgba(0,0,0,0.12)' }}>
								{title}
								<motion.span
									animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.2, 1] }}
									transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
									className='inline-flex'>
									<Sparkles className='h-5 w-5 text-amber-200' />
								</motion.span>
							</motion.h1>

							{desc && (
								<motion.p
									initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14, ...sm }}
									className='max-w-[520px] text-[13px] leading-relaxed text-white/60'>
									{desc}
								</motion.p>
							)}
						</div>
					</div>

					{/* Right — actions + filter btn + CTA */}
					<div className='flex flex-wrap items-center gap-2.5'>
						{someThing}
						{actions}
 
						{filters.length > 0 && (
							<div ref={filterBtnRef} className='relative'>
								<motion.button
									whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
									onClick={() => setFilterOpen(o => !o)}
									className='relative inline-flex h-10 items-center gap-2 overflow-hidden px-4 text-sm font-bold transition-all duration-200'
									style={{
										borderRadius: 14,
										background: filterOpen ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.16)',
										backdropFilter: 'blur(16px)',
										color: filterOpen ? 'var(--color-primary-700,#4338ca)' : 'white',
										boxShadow: filterOpen
											? '0 4px 24px -4px rgba(0,0,0,0.18)'
											: '0 2px 8px -2px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.2) inset',
									}}>
									<SlidersHorizontal className='h-4 w-4' />
									<span>Filters</span>
									<AnimatePresence>
										{activeFilterCount > 0 && (
											<motion.span key='cnt' initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
												className='absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-black text-white shadow-md'
												style={{ background: 'linear-gradient(135deg,var(--color-gradient-from,#4f46e5),var(--color-gradient-to,#7c3aed))' }}>
												{activeFilterCount}
											</motion.span>
										)}
									</AnimatePresence>
									<motion.span animate={{ rotate: filterOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
										<ChevronDown className='h-3.5 w-3.5 opacity-70' />
									</motion.span>
								</motion.button>

								<FilterPortal anchorRef={filterBtnRef} open={filterOpen} onClose={() => setFilterOpen(false)}>
									<FilterPanelContent
										filters={filters}
										filterValues={filterValues}
										onFilterChange={onFilterChange}
										onFilterReset={onFilterReset}
										onClose={() => setFilterOpen(false)}
										activeFilterCount={activeFilterCount}
									/>
								</FilterPortal>
							</div>
						)}

						{/* CTA button */}
						{btnName && (
							<motion.button
								whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
								onClick={onClick}
								className='gsh-btn relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-[14px] border border-white/[0.24] bg-white/[0.14] px-5 text-[13px] font-bold tracking-wide text-white backdrop-blur-xl shadow-[0_2px_14px_rgba(0,0,0,.22),0_1px_0_rgba(255,255,255,.16)_inset] whitespace-nowrap'>
								<Plus className='h-[15px] w-[15px]' strokeWidth={2.8} />
								{btnName}
							</motion.button>
						)}
					</div>
				</div>

				{/* ── Stats grid ── */}
				{hasStats && (
					<div className='mt-7'>

						{/* Collapsible toggle */}
						{statsCollapsible && (
							<motion.button
								whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
								onClick={() => setStatsOpen(v => !v)}
								className='mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/10 px-3.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[.08em] text-white/80 backdrop-blur-md'>
								<TrendingUp className='h-3 w-3' />
								{statsOpen ? 'Hide' : 'Show'} Stats
								<motion.span animate={{ rotate: statsOpen ? 180 : 0 }} transition={sp} className='flex'>
									<ChevronDown className='h-3 w-3' />
								</motion.span>
							</motion.button>
						)}

						<AnimatePresence>
							{(!statsCollapsible || statsOpen) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={sm}
									className='overflow-hidden'>

									{/* Old-style children */}
									{children && !stats.length && (
										<div className={['grid gap-3', ' sm:grid-cols-3 lg:grid-cols-4', hiddenStats ? 'max-md:hidden' : ''].join(' ')}>
											{loadingStats ? <KpiSkeleton /> : children}
										</div>
									)}


									{stats.length > 0 && (
										<div
											className={[
												'grid gap-3',
												'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
												hiddenStats ? 'max-md:hidden' : '',
											].join(' ')}
										>
											{loadingStats
												? <KpiSkeleton count={stats.length} />
												: stats.map((s, i) => {
													const SIcon = s.icon;
													return (
														<motion.div
															key={s.label ?? i}
															initial={{ opacity: 0, y: 16 }}
															animate={{ opacity: 1, y: 0 }}
															transition={{
																delay: 0.1 + i * 0.07,
																duration: 0.45,
																ease: [0.16, 1, 0.3, 1],
															}}
															whileHover={{ y: -3 }}
															className='group relative cursor-default overflow-hidden'
															style={{
																borderRadius: 18,
																background: 'rgba(255,255,255,0.13)',
																backdropFilter: 'blur(12px)',
																WebkitBackdropFilter: 'blur(12px)',
																boxShadow: '0 2px 12px -2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
																transition: 'box-shadow 0.2s ease, transform 0.2s ease',
															}}
														>
															{/* Hover shimmer */}
															<div
																className='absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100'
																style={{
																	background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
																	borderRadius: 18,
																}}
															/>

															{/* Left accent bar */}
															<div
																className='absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-40 transition-opacity group-hover:opacity-70'
																style={{ background: 'rgba(255,255,255,0.6)' }}
															/>

															<div className='relative px-4 py-4'>
																<div className='flex items-start justify-between gap-2'>
																	<p
																		className='text-[9px] font-black uppercase leading-tight tracking-[0.14em]'
																		style={{ color: 'rgba(255,255,255,0.6)' }}
																	>
																		{s.label}
																	</p>

																	{SIcon && (
																		<SIcon
																			className='h-4 w-4 shrink-0 transition-all duration-200 group-hover:scale-110'
																			style={{ color: 'rgba(255,255,255,0.45)' }}
																		/>
																	)}
																</div>

																<p className='mt-2.5 text-2xl font-black leading-none tracking-tight text-white'>
																	{s.value}
																</p>

																{s.sub && (
																	<p
																		className='mt-1.5 text-[10px] font-medium'
																		style={{ color: 'rgba(255,255,255,0.5)' }}
																	>
																		{s.sub}
																	</p>
																)}

																{s.change !== undefined && (
																	<span
																		className='mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white'
																		style={{
																			background: s.change >= 0
																				? 'rgba(5,150,105,0.22)'
																				: 'rgba(220,38,38,0.22)',
																		}}
																	>
																		{s.change >= 0
																			? <ArrowUpRight className='h-3 w-3' />
																			: <ArrowDownRight className='h-3 w-3' />}
																		{Math.abs(s.change)}%
																	</span>
																)}
															</div>
														</motion.div>
													);
												})
											}
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}




				{tabs.length > 0 ? (
					<div className='mt-7 flex gap-1 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
						{tabs.map((tab, i) => {
							const TIcon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<motion.button
									key={tab.id}
									initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.14 + i * 0.05 }}
									onClick={() => onTabChange?.(tab.id)}
									whileTap={{ scale: 0.97 }}
									className={`gsh-tab ${isActive ? 'gsh-tab-active' : ''} relative flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-bold select-none focus:outline-none`}
									style={{
										borderRadius: '14px 14px 0 0',
										color: isActive ? 'var(--color-primary-700,#4338ca)' : 'rgba(255,255,255,0.72)',
										transition: 'color 0.2s',
									}}>
									{isActive && (
										<motion.div
											layoutId='gsh-tab-bg'
											className='absolute inset-0'
											style={{ borderRadius: '14px 14px 0 0', background: 'rgba(255,255,255,1)', boxShadow: '0 -2px 12px -2px rgba(0,0,0,0.08)' }}
											transition={{ type: 'spring', stiffness: 480, damping: 40 }}
										/>
									)}
									<span className='relative z-10 flex items-center gap-2'>
										{TIcon && (
											<TIcon className='h-4 w-4' strokeWidth={2.5}
												style={{ color: isActive ? 'var(--color-primary-600,#4f46e5)' : 'inherit' }} />
										)}
										<span>{tab.label}</span>
										<AnimatePresence>
											{isActive && tab.count !== undefined && (
												<motion.span
													key='chip' initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
													className='rounded-lg px-2 py-0.5 text-[9px] font-black'
													style={{ background: 'color-mix(in srgb,var(--color-primary-100,#e0e7ff) 70%,white)', color: 'var(--color-primary-700,#4338ca)' }}>
													{tab.count}
												</motion.span>
											)}
										</AnimatePresence>
									</span>
								</motion.button>
							);
						})}
					</div>
				) : (
					/* Bottom padding when no tabs */
					<div className='pb-7' />
				)}
			</div>
		</motion.div>
	);
}