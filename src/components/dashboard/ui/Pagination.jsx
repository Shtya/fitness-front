'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	MoreHorizontal,
	ChevronDown,
} from 'lucide-react';

/**
 * Enhanced PrettyPagination
 * - Beautiful gradient accents and smooth animations
 * - Floating design with depth and shadow layers
 * - Micro-interactions and haptic-style feedback
 * - Theme-aware with CSS variables
 * - Mobile-responsive with smart breakpoints
 */
export function PrettyPagination({
	page,
	totalPages,
	onPageChange,
	className = '',
	showEdges = true,
	maxButtons = 7,
	compactUntil = 480,
	pageSize,
	onPageSizeChange,
	pageSizeOptions = [10, 20, 50, 100],
}) {
	if (!totalPages || totalPages <= 1) return null;

	const [isCompact, setIsCompact] = useState(false);
	const [hoveredButton, setHoveredButton] = useState(null);

	useEffect(() => {
		const update = () => setIsCompact(window.innerWidth <= compactUntil);
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, [compactUntil]);

	const clamp = (p) => Math.max(1, Math.min(totalPages, p));
	const go = (p) => onPageChange?.(clamp(p));

	// Smart page number generation
	const items = useMemo(() => {
		if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

		const count = Math.max(3, maxButtons);
		const set = new Set([1, totalPages, page]);

		if (page - 1 >= 1) set.add(page - 1);
		if (page + 1 <= totalPages) set.add(page + 1);

		while (set.size < Math.min(count, 7)) {
			const min = Math.min(...set);
			const max = Math.max(...set);
			if (min > 2) set.add(min - 1);
			else if (max < totalPages - 1) set.add(max + 1);
			else break;
		}

		const sorted = [...set].sort((a, b) => a - b);
		const out = [];

		for (let i = 0; i < sorted.length; i++) {
			const p = sorted[i];
			const prev = sorted[i - 1];
			if (i > 0 && p - prev > 1) out.push('…');
			out.push(p);
		}

		const numericCount = out.filter((x) => x !== '…').length;
		if (totalPages >= 3 && numericCount < 3) return [1, 2, 3, '…', totalPages];

		return out;
	}, [page, totalPages, maxButtons]);

	return (
		<nav
			className={`flex flex-wrap items-center justify-center gap-4 ${className}`}
			role="navigation"
			aria-label="Pagination">
			{/* Main pagination container with floating design */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="relative inline-flex items-center gap-2 rounded-lg p-2 border-2 bg-white/95 backdrop-blur-xl shadow-2xl"
				style={{
					borderColor: 'var(--color-primary-200)',
					boxShadow: '0 20px 60px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px var(--color-primary-100)',
				}}>
				{/* Floating particles background */}
				<div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
					<motion.div
						className="absolute w-32 h-32 rounded-full blur-3xl opacity-20"
						style={{
							background: 'var(--color-gradient-from)',
							top: '-20%',
							left: '10%',
						}}
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.2, 0.3, 0.2],
						}}
						transition={{
							duration: 4,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
					/>
					<motion.div
						className="absolute w-32 h-32 rounded-full blur-3xl opacity-20"
						style={{
							background: 'var(--color-gradient-to)',
							bottom: '-20%',
							right: '10%',
						}}
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.2, 0.3, 0.2],
						}}
						transition={{
							duration: 4,
							repeat: Infinity,
							ease: 'easeInOut',
							delay: 2,
						}}
					/>
				</div>

				{/* Page size selector */}
				{typeof pageSize === 'number' && onPageSizeChange && !isCompact && (
					<div className="relative z-10">
						<PageSizeSelect value={pageSize} onChange={onPageSizeChange} options={pageSizeOptions} />
					</div>
				)}

				{/* Separator */}
				{typeof pageSize === 'number' && onPageSizeChange && !isCompact && (
					<div
						className="h-8 w-px"
						style={{
							background: 'linear-gradient(180deg, transparent, var(--color-primary-200), transparent)',
						}}
					/>
				)}

				{/* Navigation buttons */}
				<div className="relative z-10 flex items-center gap-1.5">
					{/* First page */}
					{showEdges && !isCompact && (
						<NavButton
							onClick={() => go(1)}
							disabled={page <= 1}
							icon={ChevronsLeft}
							label="First page"
							isHovered={hoveredButton === 'first'}
							onHover={() => setHoveredButton('first')}
							onLeave={() => setHoveredButton(null)}
						/>
					)}

					{/* Previous page */}
					<NavButton
						onClick={() => go(page - 1)}
						disabled={page <= 1}
						icon={ChevronLeft}
						label="Previous page"
						isHovered={hoveredButton === 'prev'}
						onHover={() => setHoveredButton('prev')}
						onLeave={() => setHoveredButton(null)}
					/>

					{/* Page numbers or compact display */}
					{isCompact ? (
						<motion.div
							whileHover={{ scale: 1.02 }}
							className="mx-1 min-w-[120px] px-4 h-10 rounded-lg border-2 inline-flex items-center justify-center text-sm font-semibold relative overflow-hidden"
							style={{
								borderColor: 'var(--color-primary-200)',
								backgroundColor: 'white',
								boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
							}}>
							{/* Subtle gradient overlay */}
							<div
								className="absolute inset-0 opacity-[0.03]"
								style={{
									background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
								}}
							/>

							<span className="relative z-10 font-bold" style={{ color: 'var(--color-primary-700)' }}>
								{page}
							</span>
							<span className="relative z-10 mx-2 text-slate-300 font-bold">/</span>
							<span className="relative z-10 font-semibold text-slate-600">{totalPages}</span>
						</motion.div>
					) : (
						<div className="flex items-center gap-1.5">
							<AnimatePresence mode="popLayout">
								{items.map((it, idx) => {
									if (it === '…') {
										return (
											<motion.div
												key={`ellipsis-${idx}`}
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.8 }}
												className="inline-flex items-center justify-center h-10 min-w-10 rounded-lg"
												style={{ color: 'var(--color-primary-400)' }}>
												<MoreHorizontal size={18} strokeWidth={2.5} />
											</motion.div>
										);
									}

									const p = it;
									const active = p === page;

									return (
										<motion.button
											key={p}
											layoutId={active ? 'active-page' : undefined}
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.8 }}
											whileHover={!active ? { scale: 1.05, y: -2 } : {}}
											whileTap={{ scale: 0.95 }}
											type="button"
											onClick={() => go(p)}
											aria-current={active ? 'page' : undefined}
											className="relative h-10 min-w-10 px-3 rounded-lg text-sm font-bold transition-all duration-200 overflow-hidden"
											style={
												active
													? {
															background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
															color: 'white',
															boxShadow: '0 8px 24px -8px var(--color-primary-500), 0 0 0 1px var(--color-primary-300)',
													  }
													: {
															backgroundColor: 'white',
															color: '#475569',
															border: '2px solid var(--color-primary-100)',
															boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
													  }
											}
											onMouseEnter={(e) => {
												if (!active) {
													e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
													e.currentTarget.style.borderColor = 'var(--color-primary-300)';
												}
											}}
											onMouseLeave={(e) => {
												if (!active) {
													e.currentTarget.style.backgroundColor = 'white';
													e.currentTarget.style.borderColor = 'var(--color-primary-100)';
												}
											}}
											title={`Page ${p}`}>
											{/* Active page shimmer effect */}
											{active && (
												<motion.div
													className="absolute inset-0"
													animate={{
														backgroundPosition: ['-200% 0', '200% 0'],
													}}
													transition={{
														duration: 3,
														repeat: Infinity,
														ease: 'linear',
													}}
													style={{
														background:
															'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
														backgroundSize: '200% 100%',
													}}
												/>
											)}

											<span className="relative z-10">{p}</span>

											{/* Active indicator dot */}
											{active && (
												<motion.div
													layoutId="active-indicator"
													className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"
													transition={{ type: 'spring', stiffness: 500, damping: 30 }}
												/>
											)}
										</motion.button>
									);
								})}
							</AnimatePresence>
						</div>
					)}

					{/* Next page */}
					<NavButton
						onClick={() => go(page + 1)}
						disabled={page >= totalPages}
						icon={ChevronRight}
						label="Next page"
						isHovered={hoveredButton === 'next'}
						onHover={() => setHoveredButton('next')}
						onLeave={() => setHoveredButton(null)}
					/>

					{/* Last page */}
					{showEdges && !isCompact && (
						<NavButton
							onClick={() => go(totalPages)}
							disabled={page >= totalPages}
							icon={ChevronsRight}
							label="Last page"
							isHovered={hoveredButton === 'last'}
							onHover={() => setHoveredButton('last')}
							onLeave={() => setHoveredButton(null)}
						/>
					)}
				</div>
			</motion.div> 
		</nav>
	);
}

// ============================================================================
// NAV BUTTON COMPONENT
// ============================================================================

function NavButton({ onClick, disabled, icon: Icon, label, isHovered, onHover, onLeave }) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			disabled={disabled}
			whileHover={!disabled ? { scale: 1.08, y: -2 } : {}}
			whileTap={!disabled ? { scale: 0.92 } : {}}
			onMouseEnter={onHover}
			onMouseLeave={onLeave}
			className="relative h-10 w-10 rounded-lg inline-flex items-center justify-center transition-all duration-200 overflow-hidden disabled:cursor-not-allowed group"
			style={
				disabled
					? {
							backgroundColor: '#f8fafc',
							border: '2px solid #e2e8f0',
							color: '#cbd5e1',
					  }
					: {
							backgroundColor: 'white',
							border: '2px solid var(--color-primary-100)',
							color: 'var(--color-primary-600)',
							boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
					  }
			}  
			aria-label={label}
			title={label}>
			{/* Hover gradient effect */}
			{!disabled && (
				<motion.div
					className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-200"
					style={{
						background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					}}
				/>
			)}

			<Icon size={18} strokeWidth={2.5} className="relative z-10 rtl:rotate-[180deg]" />
		</motion.button>
	);
}

// ============================================================================
// PAGE SIZE SELECT
// ============================================================================

function PageSizeSelect({ value, onChange, options }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="relative">
			<motion.button
				type="button"
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
				onClick={() => setIsOpen(!isOpen)}
				className="h-10 rounded-lg px-4 inline-flex items-center gap-3 border-2 transition-all duration-200 relative overflow-hidden group"
				style={{
					borderColor: 'var(--color-primary-100)',
					backgroundColor: 'white',
					boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
					e.currentTarget.style.borderColor = 'var(--color-primary-300)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = 'white';
					e.currentTarget.style.borderColor = 'var(--color-primary-100)';
				}}>
				{/* Hover gradient effect */}
				<motion.div
					className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-200"
					style={{
						background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					}}
				/>

				<span className="relative z-10 text-xs font-bold uppercase tracking-wider text-slate-500">Rows</span>

				<div className="relative z-10 flex items-center gap-2">
					<span className="text-sm font-black" style={{ color: 'var(--color-primary-700)' }}>
						{value}
					</span>

					<motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
						<ChevronDown size={16} strokeWidth={2.5} style={{ color: 'var(--color-primary-500)' }} />
					</motion.div>
				</div>
			</motion.button>

			{/* Dropdown */}
			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop */}
						<div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

						{/* Menu */}
						<motion.div
							initial={{ opacity: 0, y: -10, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -10, scale: 0.95 }}
							transition={{ type: 'spring', stiffness: 500, damping: 30 }}
							className="absolute top-full mt-2 left-0 min-w-[140px] rounded-lg border-2 bg-white/98 backdrop-blur-xl shadow-2xl p-2 z-50"
							style={{
								borderColor: 'var(--color-primary-200)',
								boxShadow: '0 20px 60px -15px rgba(15, 23, 42, 0.25)',
							}}>
							{/* Floating particles background */}
							<div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
								<motion.div
									className="absolute w-20 h-20 rounded-full blur-2xl opacity-20"
									style={{
										background: 'var(--color-gradient-from)',
										top: '-10%',
										left: '10%',
									}}
									animate={{
										scale: [1, 1.2, 1],
										opacity: [0.2, 0.3, 0.2],
									}}
									transition={{
										duration: 3,
										repeat: Infinity,
										ease: 'easeInOut',
									}}
								/>
							</div>

							<div className="relative z-10 space-y-1">
								{options.map((opt) => {
									const isSelected = opt === value;
									return (
										<motion.button
											key={opt}
											whileHover={{ x: 4 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => {
												onChange?.(opt);
												setIsOpen(false);
											}}
											className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-between overflow-hidden relative group"
											style={
												isSelected
													? {
															background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
															color: 'white',
															boxShadow: '0 4px 12px -4px var(--color-primary-500)',
													  }
													: {
															color: '#475569',
													  }
											}
											onMouseEnter={(e) => {
												if (!isSelected) {
													e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
												}
											}}
											onMouseLeave={(e) => {
												if (!isSelected) {
													e.currentTarget.style.backgroundColor = 'transparent';
												}
											}}>
											{/* Shimmer effect for selected */}
											{isSelected && (
												<motion.div
													className="absolute inset-0"
													animate={{
														backgroundPosition: ['-200% 0', '200% 0'],
													}}
													transition={{
														duration: 3,
														repeat: Infinity,
														ease: 'linear',
													}}
													style={{
														background:
															'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
														backgroundSize: '200% 100%',
													}}
												/>
											)}

											<span className="relative z-10">{opt} rows</span>

											{isSelected && (
												<motion.div
													initial={{ scale: 0, rotate: -180 }}
													animate={{ scale: 1, rotate: 0 }}
													transition={{ type: 'spring', stiffness: 500, damping: 25 }}
													className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center relative z-10">
													<div className="w-1.5 h-1.5 rounded-full bg-white" />
												</motion.div>
											)}
										</motion.button>
									);
								})}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}