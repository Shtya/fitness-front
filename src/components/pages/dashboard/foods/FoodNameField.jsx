'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCheck, Database, Link2, Loader2, Plus, Search, Unlink, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import useDebounced from '@/hooks/useDebounced';
import { readGmTokens } from '@/utils/gmTokens';
import { FIELD_BG, FIELD_ERROR, FIELD_SHELL, MINI_LABEL } from '@/components/atoms/GmFormParts';
import { foodName } from '@/lib/food-nutrition';

const MIN_QUERY = 2;
const MENU_WIDTH = 360;
const fmt = n => (n == null ? '—' : Math.round(Number(n) * 10) / 10);

function useMenuPosition(anchorRef, open) {
	const [pos, setPos] = useState(null);
	const place = useCallback(() => {
		const el = anchorRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const pad = 8;
		const width = Math.min(Math.max(rect.width, MENU_WIDTH), window.innerWidth - pad * 2);
		const rtl = getComputedStyle(el).direction === 'rtl';
		const preferred = rtl ? rect.right - width : rect.left;
		const left = Math.min(Math.max(pad, preferred), window.innerWidth - width - pad);
		const below = window.innerHeight - rect.bottom;
		const maxHeight = Math.max(160, Math.min(340, (below > 240 ? below : rect.top) - 16));
		const top = below > 240 || below >= rect.top ? rect.bottom + 6 : Math.max(pad, rect.top - 6 - maxHeight);
		setPos({ top, left, width, maxHeight, tokens: readGmTokens(el) });
	}, [anchorRef]);

	useEffect(() => {
		if (!open) return undefined;
		place();
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, true);
		return () => {
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place, true);
		};
	}, [open, place]);
	return pos;
}

function FoodOption({ food, active, locale, onPick, onHover, t, id }) {
	const primary = foodName(food, locale);
	const secondary = locale === 'ar' ? food.nameEn : food.nameAr;
	const per = food.baseUnit === 'ml' ? t('form.unit_ml') : t('form.unit_g');
	return (
		<button
			id={id}
			type='button'
			role='option'
			aria-selected={active}
			onMouseDown={e => e.preventDefault()}
			onClick={() => onPick(food)}
			onMouseEnter={onHover}
			className={`flex w-full items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-start transition-colors ${active ? 'bg-[color-mix(in_srgb,var(--color-primary-100)_75%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)]'}`}
		>
			<span className='min-w-0 flex-1'>
				<span className='flex items-center gap-1.5'>
					<span dir='auto' className='truncate text-[13px] font-bold text-(--gm-ink)'>{primary}</span>
					{food.verified ? <BadgeCheck className='size-3.5 shrink-0 text-(--color-primary-500)' aria-label={t('badges.verified')} /> : null}
					{food.scope === 'team' ? <Users className='size-3 shrink-0 text-(--color-secondary-500)' aria-label={t('badges.team')} /> : null}
				</span>
				{secondary ? <span dir='auto' className='block truncate text-[11px] text-(--gm-faint)'>{secondary}</span> : null}
			</span>
			<span className='flex shrink-0 flex-col items-end gap-0.5 font-en tabular-nums' dir='ltr'>
				<span className='text-[12px] font-bold text-(--color-primary-700)'>{fmt(food.kcal)} <span className='font-normal text-(--gm-faint)'>kcal</span></span>
				<span className='text-[10.5px] text-(--gm-muted)'>
					P {fmt(food.protein)} · C {fmt(food.carbs)} · F {fmt(food.fat)}
					<span className='text-(--gm-faint)'> /100{per}</span>
				</span>
			</span>
		</button>
	);
}

/**
 * Item-name input that searches the foods catalog as the coach types. Picking a result links
 * the item (live macros); the last option adds the typed text as a new food.
 */
export default function FoodNameField({ label, value, onChange, onBlur, error, linked, onPick, onCreate, onUnlink, className = '' }) {
	const t = useTranslations('foods');
	const locale = useLocale();
	const listId = useId();
	const shellRef = useRef(null);
	const [focused, setFocused] = useState(false);
	const [typed, setTyped] = useState(false);
	const [active, setActive] = useState(0);
	const [state, setState] = useState({ q: '', items: [], loading: false, error: false });

	const text = String(value ?? '').trim();
	const q = useDebounced(text, 250);
	const open = focused && typed && text.length >= MIN_QUERY;
	const pos = useMenuPosition(shellRef, open);

	useEffect(() => {
		if (!open || q.length < MIN_QUERY) return undefined;
		const ctrl = new AbortController();
		setState(s => ({ ...s, loading: true, error: false }));
		api.get('/foods/search', { params: { q, limit: 10 }, signal: ctrl.signal })
			.then(res => {
				setState({ q, items: res?.data?.items || [], loading: false, error: false });
				setActive(0);
			})
			.catch(e => {
				if (e?.name === 'CanceledError') return;
				setState({ q, items: [], loading: false, error: true });
			});
		return () => ctrl.abort();
	}, [q, open]);

	const items = state.items;
	const optionCount = items.length + 1;
	const pending = state.loading || q !== text;

	const pick = food => {
		setTyped(false);
		onPick(food);
	};
	const create = () => {
		setTyped(false);
		onCreate(text);
	};

	const onKeyDown = e => {
		if (!open) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActive(i => (i + 1) % optionCount);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActive(i => (i - 1 + optionCount) % optionCount);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (pending) return;
			if (active < items.length) pick(items[active]);
			else create();
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			setTyped(false);
		}
	};

	const firstSimilar = items.findIndex(f => f.match === 'similar');

	return (
		<div ref={shellRef} className={`relative flex h-9 min-w-0 items-center gap-1 px-2.5 ${FIELD_SHELL} ${error ? FIELD_ERROR : ''} ${className}`} style={FIELD_BG}>
			<span className={`${MINI_LABEL} ${error ? 'text-rose-500!' : ''}`}>{label}</span>
			{linked ? (
				<Link2 className='size-3.5 shrink-0 text-(--color-primary-500)' aria-label={t('picker.linked')} />
			) : (
				<Search className='size-3.5 shrink-0 text-(--gm-faint)' aria-hidden />
			)}
			<input
				dir='auto'
				role='combobox'
				aria-label={label}
				aria-expanded={open}
				aria-controls={listId}
				aria-autocomplete='list'
				aria-activedescendant={open ? `${listId}-${active}` : undefined}
				aria-invalid={error || undefined}
				value={value ?? ''}
				placeholder={t('picker.placeholder')}
				onChange={e => {
					setTyped(true);
					onChange(e.target.value);
				}}
				onFocus={() => setFocused(true)}
				onBlur={() => {
					setFocused(false);
					setTyped(false);
					onBlur?.();
				}}
				onKeyDown={onKeyDown}
				className='w-full min-w-0 bg-transparent text-start text-[12.5px] text-(--gm-ink) outline-none placeholder:text-(--gm-faint)'
			/>
			{linked && onUnlink ? (
				<button
					type='button'
					onClick={onUnlink}
					title={t('picker.unlink')}
					aria-label={t('picker.unlink')}
					className='grid size-6 shrink-0 place-items-center rounded-[7px] text-(--gm-faint) transition-colors hover:text-(--gm-danger)'
				>
					<Unlink className='size-3.5' />
				</button>
			) : null}

			{open && pos && typeof document !== 'undefined'
				? createPortal(
					<div
						id={listId}
						role='listbox'
						aria-label={t('picker.results')}
						className='overflow-y-auto rounded-[12px] border p-1.5'
						style={{
							...pos.tokens,
							position: 'fixed',
							top: pos.top,
							left: pos.left,
							width: pos.width,
							maxHeight: pos.maxHeight,
							zIndex: 1200000,
							background: 'var(--gm-paper, #fff)',
							borderColor: 'var(--gm-line, rgba(105,153,216,0.22))',
							boxShadow: 'var(--gm-shadow-3, 0 16px 40px rgba(28,77,137,0.14))',
						}}
						onMouseDown={e => e.preventDefault()}
					>
						{pending && !items.length ? (
							<p className='flex items-center gap-2 px-2.5 py-2 text-[12px] text-(--gm-muted)'>
								<Loader2 className='size-3.5 animate-spin' />
								{t('picker.searching')}
							</p>
						) : state.error ? (
							<p className='px-2.5 py-2 text-[12px] text-(--gm-danger)'>{t('picker.error')}</p>
						) : !items.length ? (
							<p className='px-2.5 py-2 text-[12px] text-(--gm-muted)'>{t('picker.no_results')}</p>
						) : null}

						{items.map((food, i) => (
							<div key={food.id}>
								{i === firstSimilar && (
									<p className='px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wide text-(--gm-faint)'>{t('picker.similar')}</p>
								)}
								<FoodOption
									id={`${listId}-${i}`}
									food={food}
									active={active === i}
									locale={locale}
									onPick={pick}
									onHover={() => setActive(i)}
									t={t}
								/>
							</div>
						))}

						<button
							id={`${listId}-${items.length}`}
							type='button'
							role='option'
							aria-selected={active === items.length}
							onMouseDown={e => e.preventDefault()}
							onClick={create}
							onMouseEnter={() => setActive(items.length)}
							className={`mt-1 flex w-full items-center gap-2 rounded-[10px] border-t px-2.5 py-2 text-start text-[12.5px] font-semibold text-(--color-primary-700) transition-colors ${active === items.length ? 'bg-[color-mix(in_srgb,var(--color-primary-100)_75%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)]'}`}
							style={{ borderColor: 'var(--gm-line)' }}
						>
							<span className='grid size-6 shrink-0 place-items-center rounded-[7px] text-white' style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}>
								<Plus className='size-3.5' />
							</span>
							<span className='min-w-0 flex-1 truncate'>{t('picker.add_new', { name: text })}</span>
							<Database className='size-3.5 shrink-0 opacity-60' />
						</button>
					</div>,
					document.body,
				)
				: null}
		</div>
	);
}
