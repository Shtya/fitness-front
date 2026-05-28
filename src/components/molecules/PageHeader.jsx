'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Filter, X, ChevronDown, SlidersHorizontal, Check,
	RefreshCw, Sparkles, ChevronRight,
} from 'lucide-react';

const cx = (...c) => c.filter(Boolean).join(' ');

/* ─── RTL detection ─────────────────────────────────────── */
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

/* ─── Portal filter panel ───────────────────────────────── */
function FilterPortal({ anchorRef, open, onClose, children }) {
	const [pos, setPos] = useState({ top: 0, left: 0, width: 340 });
	const isRTL = useIsRTL();

	const reposition = useCallback(() => {
		if (!anchorRef.current || !open) return;
		const rect = anchorRef.current.getBoundingClientRect();
		const PANEL_W = 340;
		const vw = window.innerWidth;
		const scrollY = window.scrollY;
		let left = isRTL ? rect.right - PANEL_W : rect.left;
		if (left + PANEL_W > vw - 8) left = vw - PANEL_W - 8;
		if (left < 8) left = 8;
		setPos({ top: rect.bottom + scrollY + 10, left, width: PANEL_W });
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
		const handler = (e) => {
			if (anchorRef.current?.contains(e.target)) return;
			const panel = document.getElementById('filter-portal-panel');
			if (panel?.contains(e.target)) return;
			onClose();
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open, onClose, anchorRef]);

	if (typeof document === 'undefined') return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="fixed inset-0 z-[998]  "
						style={{ backdropFilter: 'blur(4px)', background: 'rgba(10,14,26,0.25)' }}
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
							boxShadow: '0 32px 100px -12px rgba(15,23,42,0.28), 0 0 0 1px rgba(255,255,255,0.6) inset, 0 1px 0 rgba(255,255,255,0.9) inset',
							borderRadius: '24px',
							overflow: 'hidden',
						}}
						className=" rtl:ml-[50px] ltr:mr-[50px] overflow-hidden rounded-lg border border-white/60 bg-white/95"

					>
						{children}
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body
	);
}

/* ─── Filter group renderers ─────────────────────────────── */
function FilterToggle({ group, value, onChange }) {
	return (
		<div>
			<p className="mb-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
				{group.label}
			</p>
			<div className="flex flex-wrap gap-2">
				{group.options.map((opt) => {
					const isActive = value === opt.value;
					return (
						<button
							key={opt.value}
							onClick={() => onChange(isActive ? '' : opt.value)}
							className={cx(
								'relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border px-3.5 py-2 text-xs font-bold transition-all duration-200',
								'active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
								isActive
									? 'border-transparent text-white shadow-lg'
									: 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700 hover:shadow-sm'
							)}
							style={isActive ? {
								background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
								boxShadow: '0 4px 16px -2px color-mix(in srgb, var(--color-gradient-to) 40%, transparent)',
							} : {}}
						>
							<span className="relative z-10 flex items-center gap-1.5">
								{opt.icon && <span className="text-sm">{opt.icon}</span>}
								{opt.label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function FilterMulti({ group, value, onChange }) {
	const selected = Array.isArray(value) ? value : [];
	const toggle = (v) => {
		const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
		onChange(next);
	};
	return (
		<div>
			<p className="mb-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
				{group.label}
			</p>
			<div className="space-y-1">
				{group.options.map((opt) => {
					const isChecked = selected.includes(opt.value);
					return (
						<button
							key={opt.value}
							onClick={() => toggle(opt.value)}
							className={cx(
								'flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-all duration-150',
								'focus:outline-none',
								isChecked
									? 'bg-slate-50 text-slate-800'
									: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
							)}
						>
							<span className="flex items-center gap-2.5">
								{opt.icon && <span className="text-sm">{opt.icon}</span>}
								{opt.label}
							</span>
							<motion.span
								animate={isChecked ? { scale: 1 } : { scale: 0.85 }}
								className={cx(
									'grid h-5 w-5 place-items-center rounded-lg border-2 transition-all duration-200',
									isChecked ? 'border-transparent shadow-sm' : 'border-slate-200 bg-white'
								)}
								style={isChecked ? {
									background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
								} : {}}
							>
								<AnimatePresence>
									{isChecked && (
										<motion.span
											key="check"
											initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
											animate={{ opacity: 1, scale: 1, rotate: 0 }}
											exit={{ opacity: 0, scale: 0.4 }}
											transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
										>
											<Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
										</motion.span>
									)}
								</AnimatePresence>
							</motion.span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function FilterSelect({ group, value, onChange }) {
	return (
		<div>
			<p className="mb-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
				{group.label}
			</p>
			<div className="relative">
				<select
					value={value || ''}
					onChange={e => onChange(e.target.value)}
					className="h-10 w-full appearance-none rounded-lg border border-slate-100 bg-slate-50 px-4 pe-9 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
					style={{ focusRingColor: 'var(--color-primary-300)' }}
				>
					<option value="">الكل</option>
					{group.options.map(opt => (
						<option key={opt.value} value={opt.value}>{opt.label}</option>
					))}
				</select>
				<ChevronDown className="pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:right-3 rtl:left-3 h-3.5 w-3.5 text-slate-400" />
			</div>
		</div>
	);
}

function FilterRange({ group, value, onChange }) {
	const [min, max] = value || [group.min, group.max];
	return (
		<div>
			<div className="mb-3 flex items-center justify-between">
				<p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
				<span className="rounded-lg px-2.5 py-1 text-[10px] font-black"
					style={{ background: 'color-mix(in srgb, var(--color-primary-100) 60%, white)', color: 'var(--color-primary-700)' }}>
					{min} – {max} {group.unit || ''}
				</span>
			</div>
			<div className="flex gap-2.5">
				{[['min', min, group.min, max], ['max', max, min, group.max]].map(([id, val, lo, hi]) => (
					<input key={id} type="range" min={lo} max={hi} value={val}
						onChange={e => onChange(id === 'min' ? [+e.target.value, max] : [min, +e.target.value])}
						className="flex-1 accent-[color:var(--color-primary-500)]" />
				))}
			</div>
		</div>
	);
}

/* ─── Collapsible section ────────────────────────────────── */
function CollapsibleSection({ title, children, defaultOpen = true }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="border-b border-slate-100/80 pb-4 last:border-0 last:pb-0">
			<button
				onClick={() => setOpen(o => !o)}
				className="flex w-full items-center justify-between py-1.5 text-left focus:outline-none group"
			>
				<span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 group-hover:text-slate-500 transition-colors">{title}</span>
				<motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
					<ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
				</motion.span>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
						className="overflow-hidden"
					>
						<div className="pt-3">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ─── Main Filter Panel content ─────────────────────────── */
function FilterPanelContent({ filters, filterValues, onFilterChange, onFilterReset, onClose, activeFilterCount }) {
	return (
		<>
			{/* Panel header */}
			<div className="relative flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<div className="flex items-center gap-3">
					<div
						className="grid h-8 w-8 place-items-center rounded-lg shadow-sm"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
						<SlidersHorizontal className="h-3.5 w-3.5 text-white" />
					</div>
					<div className="flex items-baseline gap-2">
						<span className="text-sm font-black tracking-tight text-slate-900">خيارات التصفية</span>
						<AnimatePresence>
							{activeFilterCount > 0 && (
								<motion.span
									key="badge"
									initial={{ scale: 0, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0, opacity: 0 }}
									className="rounded-lg px-2 py-0.5 text-[9px] font-black"
									style={{ background: 'color-mix(in srgb, var(--color-primary-100) 70%, white)', color: 'var(--color-primary-700)' }}
								>
									{activeFilterCount} نشط
								</motion.span>
							)}
						</AnimatePresence>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<AnimatePresence>
						{activeFilterCount > 0 && (
							<motion.button
								key="reset"
								initial={{ opacity: 0, x: 8 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 8 }}
								onClick={onFilterReset}
								className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-600"
							>
								<RefreshCw className="h-3 w-3" />
								مسح الكل
							</motion.button>
						)}
					</AnimatePresence>
					<button
						onClick={onClose}
						className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-600"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{/* Scrollable filter body */}
			<div
				className="max-h-[min(440px,60vh)] space-y-4 overflow-y-auto overscroll-contain px-5 py-4"
				style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary-200) transparent' }}
			>
				{filters.map((group) => (
					<CollapsibleSection key={group.key} title={group.label}>
						{group.type === 'toggle' && (
							<FilterToggle group={group} value={filterValues[group.key]} onChange={v => onFilterChange(group.key, v)} />
						)}
						{group.type === 'multi' && (
							<FilterMulti group={group} value={filterValues[group.key]} onChange={v => onFilterChange(group.key, v)} />
						)}
						{group.type === 'select' && (
							<FilterSelect group={group} value={filterValues[group.key]} onChange={v => onFilterChange(group.key, v)} />
						)}
						{group.type === 'range' && (
							<FilterRange group={group} value={filterValues[group.key]} onChange={v => onFilterChange(group.key, v)} />
						)}
					</CollapsibleSection>
				))}
			</div>

			{/* Footer */}
			<div className="border-t border-slate-100 px-5 py-4">
				<button
					onClick={onClose}
					className="relative w-full overflow-hidden rounded-lg py-3 text-sm font-black text-white shadow-lg transition-all hover:opacity-95 hover:shadow-xl active:scale-[.98] focus:outline-none"
					style={{
						background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
						boxShadow: '0 8px 24px -4px color-mix(in srgb, var(--color-gradient-to) 45%, transparent)',
					}}
				>
					<motion.div
						className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
						initial={{ x: '-100%' }}
						whileHover={{ x: '100%' }}
						transition={{ duration: 0.5 }}
					/>
					<span className="relative flex items-center justify-center gap-2">
						<Check className="h-4 w-4" strokeWidth={3} />
						تطبيق الفلتر
						{activeFilterCount > 0 && (
							<span className="rounded-lg bg-white/25 px-2 py-0.5 text-[10px] font-black">
								{activeFilterCount}
							</span>
						)}
					</span>
				</button>
			</div>
		</>
	);
}

/* ═══════════════════════════════════════════════════════════
	 PAGE HEADER
═══════════════════════════════════════════════════════════ */
export function PageHeader({
	title,
	desc,
	icon: Icon,
	stats = [],
	tabs = [],
	activeTab,
	onTabChange,
	filters = [],
	filterValues = {},
	onFilterChange,
	onFilterReset,
	actions,
	children,
}) {
	const [filterOpen, setFilterOpen] = useState(false);
	const filterBtnRef = useRef(null);

	const activeFilterCount = Object.values(filterValues).filter(v =>
		v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
	).length;

	return (
		<div className="relative overflow-hidden rounded-[10px_10px_0_0]" >

			{/* ── Base gradient ── */}
			<div
				className="absolute inset-0"
				style={{
					background: 'linear-gradient(145deg, var(--color-gradient-from) 0%, var(--color-gradient-via, var(--color-gradient-from)) 50%, var(--color-gradient-to) 100%)',
				}}
			/>

			{/* ── Frosted glass sheen ── */}
			<div
				className="absolute inset-0"
				style={{
					background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.0) 60%, rgba(0,0,0,0.08) 100%)',
				}}
			/>

			{/* ── Noise texture for depth ── */}
			<div
				className="absolute inset-0 opacity-[0.035]"
				style={{
					backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
				}}
			/>

			{/* ── Ambient orbs ── */}
			<div
				className="absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
				style={{ background: 'rgba(255,255,255,0.09)' }}
			/>
			<div
				className="absolute -bottom-20 -right-24 h-80 w-80 rounded-full blur-3xl"
				style={{ background: 'rgba(255,255,255,0.06)' }}
			/>

			{/* ── Refined dot pattern ── */}
			<div
				className="absolute inset-0 opacity-[0.055]"
				style={{
					backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)',
					backgroundSize: '28px 28px',
				}}
			/>

			{/* ── Hairline top highlight ── */}
			<div
				className="absolute inset-x-0 top-0 h-px"
				style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent)' }}
			/>

			{/* ── Decorative arc (subtle geometric accent) ── */}
			<svg
				className="absolute -right-16 top-0 h-full w-auto opacity-[0.04]"
				viewBox="0 0 200 300"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<circle cx="200" cy="150" r="140" stroke="white" strokeWidth="40" />
				<circle cx="200" cy="150" r="80" stroke="white" strokeWidth="20" />
			</svg>

			{/* ── Content ── */}
			<div className="relative z-10 px-6 pt-7 sm:px-8 lg:px-10">

				{/* Top row */}
				<div className="flex flex-wrap items-start justify-between gap-5">

					{/* Left — icon + title */}
					<div className="flex min-w-0 items-center gap-5">
						{Icon && (
							<motion.div
								whileHover={{ scale: 1.06, rotate: 4 }}
								transition={{ type: 'spring', stiffness: 380, damping: 20 }}
								className="relative grid shrink-0 place-items-center overflow-hidden"
								style={{
									width: 60,
									height: 60,
									borderRadius: 20,
									background: 'rgba(255,255,255,0.16)',
									backdropFilter: 'blur(16px)',
									WebkitBackdropFilter: 'blur(16px)',
									boxShadow: '0 8px 32px -4px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.08)',
								}}
							>
								<Icon className="relative z-10 h-7 w-7 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
								{/* Shimmer */}
								<motion.div
									className="absolute inset-0"
									style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)' }}
									initial={{ x: '-120%' }}
									whileHover={{ x: '120%' }}
									transition={{ duration: 0.5 }}
								/>
							</motion.div>
						)}

						<div className="min-w-0">
							<motion.h1
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
								className="text-2xl font-black md: leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.25rem]"
								style={{ textShadow: '0 1px 12px rgba(0,0,0,0.12)' }}
							>
								{title}
							</motion.h1>
							{desc && (
								<motion.p
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, delay: 0.09 }}
									className="mt-1.5 max-w-md text-sm font-medium md: leading-relaxed"
									style={{ color: 'rgba(255,255,255,0.68)' }}
								>
									{desc}
								</motion.p>
							)}
						</div>
					</div>

					{/* Right — actions + filter */}
					<div className="flex flex-wrap items-center gap-2.5">
						{actions}

						{filters.length > 0 && (
							<div ref={filterBtnRef} className="relative">
								<motion.button
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									onClick={() => setFilterOpen(o => !o)}
									className="relative inline-flex h-10 items-center gap-2 overflow-hidden px-4 text-sm font-bold transition-all duration-200"
									style={{
										borderRadius: 14,
										background: filterOpen ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.16)',
										backdropFilter: 'blur(16px)',
										WebkitBackdropFilter: 'blur(16px)',
										color: filterOpen ? 'var(--color-primary-700)' : 'white',
										boxShadow: filterOpen
											? '0 4px 24px -4px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.8)'
											: '0 2px 8px -2px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.2) inset',
									}}
								>
									<SlidersHorizontal className="h-4 w-4" />
									<span>فلترة</span>

									<AnimatePresence>
										{activeFilterCount > 0 && (
											<motion.span
												key="cnt"
												initial={{ scale: 0, opacity: 0 }}
												animate={{ scale: 1, opacity: 1 }}
												exit={{ scale: 0, opacity: 0 }}
												className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-black text-white shadow-md"
												style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
											>
												{activeFilterCount}
											</motion.span>
										)}
									</AnimatePresence>

									<motion.span animate={{ rotate: filterOpen ? 180 : 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
										<ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
					</div>
				</div>

				{/* ── Stat cards ── */}
				{(stats.length > 0 || children) && (
					<div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{stats.map((s, i) => {
							const SIcon = s.icon;
							return (
								<motion.div
									key={s.label}
									initial={{ opacity: 0, y: 16 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
									whileHover={{ y: -3 }}
									className="group relative overflow-hidden cursor-default"
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
										className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
										style={{
											background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
											borderRadius: 18,
										}}
									/>

									{/* Left accent bar */}
									<div
										className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
										style={{ background: 'rgba(255,255,255,0.6)' }}
									/>

									<div className="relative px-4 py-4">
										<div className="flex items-start justify-between gap-2">
											<p className="text-[9px] font-black uppercase tracking-[0.14em] md: leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
												{s.label}
											</p>
											{SIcon && (
												<SIcon
													className="h-4 w-4 shrink-0 transition-all duration-200 group-hover:scale-110"
													style={{ color: 'rgba(255,255,255,0.45)' }}
												/>
											)}
										</div>
										<p className="mt-2.5 text-2xl font-black md: leading-none tracking-tight text-white">
											{s.value}
										</p>
										{s.sub && (
											<p className="mt-1.5 text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
												{s.sub}
											</p>
										)}
									</div>
								</motion.div>
							);
						})}
						{children}
					</div>
				)}

				{/* ── Tab bar ── */}
				{tabs.length > 0 && (
					<div
						className="mt-7 flex gap-1 overflow-x-auto"
						style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
					>
						{tabs.map((tab, i) => {
							const TIcon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<motion.button
									key={tab.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.14 + i * 0.05 }}
									onClick={() => onTabChange?.(tab.id)}
									whileTap={{ scale: 0.97 }}
									className="relative flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-bold select-none focus:outline-none"
									style={{
										borderRadius: '14px 14px 0 0',
										color: isActive ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.72)',
										transition: 'color 0.2s',
									}}
								>
									{/* Active tab background */}
									{isActive && (
										<motion.div
											layoutId="tab-bg"
											className="absolute inset-0"
											style={{
												borderRadius: '14px 14px 0 0',
												background: 'rgba(255,255,255,1)',
												boxShadow: '0 -2px 12px -2px rgba(0,0,0,0.08)',
											}}
											transition={{ type: 'spring', stiffness: 480, damping: 40 }}
										/>
									)}

									{/* Hover effect for inactive */}
									{!isActive && (
										<div
											className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
											style={{ borderRadius: '14px 14px 0 0', background: 'rgba(255,255,255,0.1)' }}
										/>
									)}

									<span className="relative z-10 flex items-center gap-2">
										{TIcon && (
											<TIcon
												className="h-4 w-4 transition-colors"
												style={{ color: isActive ? 'var(--color-primary-600)' : 'inherit' }}
												strokeWidth={2.5}
											/>
										)}
										<span>{tab.label}</span>

										<AnimatePresence>
											{isActive && tab.count !== undefined && (
												<motion.span
													key="chip"
													initial={{ scale: 0, opacity: 0 }}
													animate={{ scale: 1, opacity: 1 }}
													exit={{ scale: 0, opacity: 0 }}
													className="rounded-lg px-2 py-0.5 text-[9px] font-black"
													style={{
														background: 'color-mix(in srgb, var(--color-primary-100) 70%, white)',
														color: 'var(--color-primary-700)',
													}}
												>
													{tab.count}
												</motion.span>
											)}
										</AnimatePresence>
									</span>
								</motion.button>
							);
						})}
					</div>
				)}

				{tabs.length === 0 && <div className="pb-7" />}
			</div>
		</div>
	);
}