'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
	ChevronDown, Dumbbell, ListFilter, Search, User, UserCog, Users, X, CircleSlash, Layers,
} from 'lucide-react';
import { readGmTokens } from '@/utils/gmTokens';

const POPOVER_WIDTH = 312;
const VIEWPORT_GUTTER = 8;

const ROLE_ICONS = { All: Users, Coach: UserCog, Client: User };
const PLAN_ICONS = { All: Layers, 'With plan': Dumbbell, 'No plan': CircleSlash };

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

function OptionGroup({ label, name, options, icons, value, onChange }) {
	return (
		<div className='rs-pop__section' role='radiogroup' aria-label={label}>
			<p className='rs-pop__label'>{label}</p>
			{options.map((opt) => {
				const Icon = icons[opt.id] || Layers;
				const on = value === opt.id;
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
						<span className='rs-opt__icon' aria-hidden>
							<Icon className='size-3.5' strokeWidth={2} />
						</span>
						{opt.name}
						<span className='rs-opt__radio' aria-hidden />
					</button>
				);
			})}
		</div>
	);
}

function FilterPopover({ open, anchorRef, onClose, children, onReset, canReset }) {
	const t = useTranslations('users');
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
					aria-label={t('roster.filterTitle')}
					className='rs-pop'
					style={{ top: pos.top, left: pos.left, width: pos.width, ...pos.tokens }}
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.985 }}
					transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
				>
					<div className='rs-pop__head'>
						<span>{t('roster.filterTitle')}</span>
						<button type='button' className='rs-chip__x' onClick={onClose} aria-label={t('common.cancel')}>
							<X className='size-3.5' />
						</button>
					</div>
					{children}
					<div className='rs-pop__foot'>
						<button type='button' className='rs-pop__ghost' onClick={onReset} disabled={!canReset}>
							{t('roster.reset')}
						</button>
						<button type='button' className='rs-pop__done' onClick={onClose}>
							{t('roster.done')}
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
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

/**
 * Search, role switch, filter popover and active-filter chips for the users table.
 * All state is owned by the page; this component only renders and reports intent.
 */
export default function RosterToolbar({
	search,
	onSearch,
	searching,
	role,
	onRole,
	plan,
	onPlan,
	onClearAll,
	total,
	roleOptions,
	planOptions,
}) {
	const t = useTranslations('users');
	const [open, setOpen] = useState(false);
	const anchorRef = useRef(null);
	const inputRef = useRef(null);
	const close = useCallback(() => setOpen(false), []);

	const filterCount = (role !== 'All' ? 1 : 0) + (plan !== 'All' ? 1 : 0);
	const query = search.trim();
	const hasActive = filterCount > 0 || query.length > 0;
	const optionName = (options, id) => options.find((o) => o.id === id)?.name ?? id;

	const chips = [
		query && { key: 'q', label: t('roster.searchLabel'), value: `“${query}”`, onRemove: () => onSearch('') },
		role !== 'All' && { key: 'role', label: t('filters.role'), value: optionName(roleOptions, role), onRemove: () => onRole('All') },
		plan !== 'All' && { key: 'plan', label: t('filters.plan'), value: optionName(planOptions, plan), onRemove: () => onPlan('All') },
	].filter(Boolean);

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
						placeholder={t('placeholders.search')}
						aria-label={t('placeholders.search')}
						onChange={(e) => onSearch(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Escape' && search) {
								e.preventDefault();
								onSearch('');
							}
						}}
					/>
					<span className='rs-search__end'>
						{searching && <span className='rs-search__spin' role='status' aria-label={t('roster.searching')} />}
						{search && (
							<button
								type='button'
								className='rs-search__clear'
								aria-label={t('common.clearFilters')}
								onClick={() => {
									onSearch('');
									inputRef.current?.focus();
								}}
							>
								<X className='size-3.5' strokeWidth={2.2} />
							</button>
						)}
					</span>
				</label>

				<div className='rs-seg' role='radiogroup' aria-label={t('filters.role')}>
					{roleOptions.map((opt) => {
						const on = role === opt.id;
						const Icon = ROLE_ICONS[opt.id] || Users;
						return (
							<button
								key={opt.id}
								type='button'
								role='radio'
								aria-checked={on}
								className={`rs-seg__btn${on ? ' is-on' : ''}`}
								onClick={() => onRole(opt.id)}
							>
								{on && (
									<motion.span
										layoutId='rs-role-pill'
										className='rs-seg__pill'
										transition={{ type: 'spring', stiffness: 520, damping: 38 }}
									/>
								)}
								<Icon className='size-3.5' strokeWidth={2} aria-hidden />
								<span>{opt.short ?? opt.name}</span>
							</button>
						);
					})}
				</div>

				<button
					ref={anchorRef}
					type='button'
					className={`rs-btn${open || filterCount > 0 ? ' is-on' : ''}`}
					aria-haspopup='dialog'
					aria-expanded={open}
					onClick={() => setOpen((v) => !v)}
				>
					<ListFilter className='size-4' strokeWidth={2} aria-hidden />
					<span>{t('common.filters')}</span>
					{filterCount > 0 && <span className='rs-btn__count'>{filterCount}</span>}
					<ChevronDown className='rs-btn__chev size-3.5' strokeWidth={2.2} aria-hidden />
				</button>

				<p className='rs-result' aria-live='polite'>
					{t.rich('roster.resultCount', {
						count: total,
						strong: (chunks) => <strong>{chunks}</strong>,
					})}
				</p>
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
						<span className='rs-chips__label'>{t('roster.activeFilters')}</span>
						<AnimatePresence mode='popLayout'>
							{chips.map((chip) => (
								<ActiveChip
									key={chip.key}
									label={chip.label}
									value={chip.value}
									onRemove={chip.onRemove}
									removeLabel={`${t('common.clearFilters')} ${chip.label}`}
								/>
							))}
						</AnimatePresence>
						<button type='button' className='rs-chips__clear' onClick={onClearAll}>
							{t('roster.clearAll')}
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			<FilterPopover
				open={open}
				anchorRef={anchorRef}
				onClose={close}
				canReset={filterCount > 0}
				onReset={() => {
					onRole('All');
					onPlan('All');
				}}
			>
				<OptionGroup
					label={t('filters.role')}
					name='roster-role'
					options={roleOptions}
					icons={ROLE_ICONS}
					value={role}
					onChange={onRole}
				/>
				<OptionGroup
					label={t('filters.plan')}
					name='roster-plan'
					options={planOptions}
					icons={PLAN_ICONS}
					value={plan}
					onChange={onPlan}
				/>
			</FilterPopover>
		</div>
	);
}
