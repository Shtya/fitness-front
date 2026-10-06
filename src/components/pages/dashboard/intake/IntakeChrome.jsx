'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ListFilter, Search, X } from 'lucide-react';
import { readGmTokens } from '@/utils/gmTokens';
import '@/components/pages/dashboard/users/roster/roster.css';

const POPOVER_WIDTH = 312;
const VIEWPORT_GUTTER = 8;

function usePopoverPosition(open, anchorRef) {
	const [pos, setPos] = useState(null);

	const measure = useCallback(() => {
		const el = anchorRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const isRtl = getComputedStyle(el).direction === 'rtl';
		const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2);
		const preferred = isRtl ? rect.left : rect.right - width;
		const left = Math.min(Math.max(VIEWPORT_GUTTER, preferred), window.innerWidth - width - VIEWPORT_GUTTER);
		setPos({ top: rect.bottom + 8, left, width, tokens: readGmTokens(el) });
	}, [anchorRef]);

	useLayoutEffect(() => {
		if (!open) return undefined;
		measure();
		window.addEventListener('resize', measure);
		window.addEventListener('scroll', measure, true);
		return () => {
			window.removeEventListener('resize', measure);
			window.removeEventListener('scroll', measure, true);
		};
	}, [open, measure]);

	return pos;
}

export function IntakeHero({ icon: Icon, title, subtitle, ctaLabel, onCta, extra }) {
	return (
		<header className='rs-hero'>
			<span className='rs-hero__mark' aria-hidden>
				{Icon ? <Icon strokeWidth={1.7} /> : null}
			</span>
			<div className='rs-hero__text'>
				<h1 className='rs-hero__title'>{title}</h1>
				{subtitle ? <p className='rs-hero__sub'>{subtitle}</p> : null}
			</div>
			{ctaLabel && onCta ? (
				<button type='button' className='rs-cta' onClick={onCta}>
					{ctaLabel}
				</button>
			) : null}
			{extra}
		</header>
	);
}

function ActiveChip({ label, value, onRemove, removeLabel }) {
	return (
		<motion.span
			layout
			className='rs-chip'
			initial={{ opacity: 0, scale: 0.92 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.92 }}
			transition={{ duration: 0.16 }}
		>
			<span className='rs-chip__key'>{label}:</span>
			{value}
			<button type='button' className='rs-chip__x' onClick={onRemove} aria-label={removeLabel}>
				<X className='size-3' strokeWidth={2.4} />
			</button>
		</motion.span>
	);
}

export function IntakeFilterPopover({
	open,
	anchorRef,
	onClose,
	title,
	canReset,
	onReset,
	resetLabel,
	doneLabel,
	children,
}) {
	const panelRef = useRef(null);
	const pos = usePopoverPosition(open, anchorRef);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		if (!open) return undefined;
		const onKey = (e) => {
			if (e.key === 'Escape') {
				onClose();
				anchorRef.current?.focus();
			}
		};
		const onPointer = (e) => {
			if (panelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
			onClose();
		};
		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onPointer);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onPointer);
		};
	}, [open, onClose, anchorRef]);

	useEffect(() => {
		if (open && pos) panelRef.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
	}, [open, pos]);

	if (typeof document === 'undefined') return null;

	return createPortal(
		<AnimatePresence>
			{open && pos && (
				<motion.div
					ref={panelRef}
					role='dialog'
					aria-label={title}
					className='rs-pop'
					style={{ top: pos.top, left: pos.left, width: pos.width, ...pos.tokens }}
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.985 }}
					transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
				>
					<div className='rs-pop__head'>
						<span>{title}</span>
						<button type='button' className='rs-chip__x' onClick={onClose} aria-label={doneLabel}>
							<X className='size-3.5' />
						</button>
					</div>
					{children}
					<div className='rs-pop__foot'>
						<button type='button' className='rs-pop__ghost' onClick={onReset} disabled={!canReset}>
							{resetLabel}
						</button>
						<button type='button' className='rs-pop__done' onClick={onClose}>
							{doneLabel}
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}

export function IntakeOptionGroup({ label, name, options, value, onChange }) {
	return (
		<div className='rs-pop__section' role='radiogroup' aria-label={label}>
			<p className='rs-pop__label'>{label}</p>
			{options.map((opt) => {
				const Icon = opt.icon;
				const on = String(value) === String(opt.id);
				return (
					<button
						key={opt.id}
						type='button'
						role='radio'
						aria-checked={on}
						name={name}
						className={`rs-opt${on ? ' is-on' : ''}`}
						onClick={() => onChange(opt.id)}
					>
						{Icon ? (
							<span className='rs-opt__icon' aria-hidden>
								<Icon className='size-3.5' strokeWidth={2} />
							</span>
						) : null}
						<span className='min-w-0 truncate'>{opt.name}</span>
						<span className='rs-opt__radio' aria-hidden />
					</button>
				);
			})}
		</div>
	);
}

export function IntakeToolbar({
	search,
	onSearch,
	searching = false,
	searchPlaceholder,
	searchLabel,
	clearSearchLabel,
	segments = [],
	segment,
	onSegment,
	segmentLabel,
	layoutId = 'intake-seg-pill',
	filterLabel,
	filterCount = 0,
	filterOpen = false,
	onFilterToggle,
	filterAnchorRef,
	actions,
	result,
	chips = [],
	onClearAll,
	clearAllLabel,
	activeFiltersLabel,
	children,
}) {
	const inputRef = useRef(null);
	const query = String(search || '').trim();
	const hasActive = chips.length > 0;

	return (
		<div className='rs-scope'>
			<div className='rs-toolbar'>
				<label className='rs-search'>
					<span className='rs-search__icon' aria-hidden>
						<Search className='size-4' strokeWidth={2} />
					</span>
					<input
						ref={inputRef}
						type='search'
						className='rs-search__input'
						value={search}
						placeholder={searchPlaceholder}
						aria-label={searchLabel || searchPlaceholder}
						onChange={(e) => onSearch(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Escape' && search) {
								e.preventDefault();
								onSearch('');
							}
						}}
					/>
					<span className='rs-search__end'>
						{searching && <span className='rs-search__spin' role='status' aria-label={searchLabel} />}
						{search ? (
							<button
								type='button'
								className='rs-search__clear'
								aria-label={clearSearchLabel}
								onClick={() => {
									onSearch('');
									inputRef.current?.focus();
								}}
							>
								<X className='size-3.5' strokeWidth={2.2} />
							</button>
						) : null}
					</span>
				</label>

				{segments.length > 0 && (
					<div className='rs-seg' role='radiogroup' aria-label={segmentLabel}>
						{segments.map((opt) => {
							const on = segment === opt.id;
							const Icon = opt.icon;
							return (
								<button
									key={opt.id}
									type='button'
									role='radio'
									aria-checked={on}
									className={`rs-seg__btn${on ? ' is-on' : ''}`}
									onClick={() => onSegment(opt.id)}
								>
									{on && (
										<motion.span
											layoutId={layoutId}
											className='rs-seg__pill'
											transition={{ type: 'spring', stiffness: 520, damping: 38 }}
										/>
									)}
									{Icon ? <Icon className='size-3.5' strokeWidth={2} aria-hidden /> : null}
									<span>{opt.short ?? opt.name}</span>
								</button>
							);
						})}
					</div>
				)}

				{onFilterToggle ? (
					<button
						ref={filterAnchorRef}
						type='button'
						className={`rs-btn${filterOpen || filterCount > 0 ? ' is-on' : ''}`}
						aria-haspopup='dialog'
						aria-expanded={filterOpen}
						onClick={onFilterToggle}
					>
						<ListFilter className='size-4' strokeWidth={2} aria-hidden />
						<span>{filterLabel}</span>
						{filterCount > 0 && <span className='rs-btn__count'>{filterCount}</span>}
						<ChevronDown className='rs-btn__chev size-3.5' strokeWidth={2.2} aria-hidden />
					</button>
				) : null}

				{actions}

				{result ? (
					<p className='rs-result' aria-live='polite'>
						{result}
					</p>
				) : null}
			</div>

			<AnimatePresence initial={false}>
				{hasActive && (
					<motion.div
						key='chips'
						className='rs-chips'
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
					>
						<span className='rs-chips__label'>{activeFiltersLabel}</span>
						<AnimatePresence mode='popLayout'>
							{chips.map((chip) => (
								<ActiveChip
									key={chip.key}
									label={chip.label}
									value={chip.value}
									onRemove={chip.onRemove}
									removeLabel={`${clearAllLabel} ${chip.label}`}
								/>
							))}
						</AnimatePresence>
						<button type='button' className='rs-chips__clear' onClick={onClearAll}>
							{clearAllLabel}
						</button>
					</motion.div>
				)}
			</AnimatePresence>
			{children}
		</div>
	);
}
