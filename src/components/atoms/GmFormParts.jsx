'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, X } from 'lucide-react';

export const NUMBER_INPUT = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
export const FIELD_SHELL = 'rounded-[11px] border border-(--gm-line) transition-colors focus-within:border-(--color-primary-500) focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent)]';
export const FIELD_BG = { background: 'color-mix(in srgb, var(--gm-paper) 62%, transparent)' };
export const FLOAT_LABEL = 'pointer-events-none absolute start-3 top-0 z-1 -translate-y-1/2 rounded-md bg-(--gm-paper) px-1 text-[11px] font-medium gm-muted';
export const MINI_LABEL = `${FLOAT_LABEL} start-2! max-w-[calc(100%-1rem)] truncate text-[10px]!`;
export const FIELD_ERROR = 'border-rose-300!';

export function MiniField({ label, value, onChange, onBlur, inputMode, type = 'text', suffix, className = '', numeric = false, error = false }) {
	return (
		<label className={`relative flex h-9 min-w-0 items-center px-2.5 ${FIELD_SHELL} ${error ? FIELD_ERROR : ''} ${className}`} style={FIELD_BG}>
			<span className={`${MINI_LABEL} ${error ? 'text-rose-500!' : ''}`}>{label}</span>
			<input
				type={type}
				inputMode={inputMode}
				dir={numeric ? 'ltr' : 'auto'}
				value={value ?? ''}
				aria-invalid={error || undefined}
				onChange={e => onChange(e.target.value)}
				onBlur={onBlur}
				className={`w-full min-w-0 bg-transparent text-[12.5px] font-semibold text-(--gm-ink) outline-none placeholder:text-(--gm-faint) ${numeric ? `font-en tabular-nums ${NUMBER_INPUT}` : 'text-start font-normal!'}`}
			/>
			{suffix ? <span className='ms-1 shrink-0 text-[10.5px] font-semibold gm-faint'>{suffix}</span> : null}
		</label>
	);
}

const GRADIENT_BG = 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))';

export function GmSwitch({ checked, onChange, label, hideLabel = false, disabled = false }) {
	return (
		<button
			type='button'
			role='switch'
			aria-checked={checked}
			aria-label={hideLabel ? label : undefined}
			title={hideLabel ? label : undefined}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-1.5 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary-400)_50%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'text-(--color-primary-700)' : 'gm-muted'}`}
		>
			<span
				className='relative h-[20px] w-9 shrink-0 rounded-full transition-colors'
				style={{ background: checked ? GRADIENT_BG : 'color-mix(in srgb, var(--color-primary-200) 60%, transparent)' }}
			>
				<span className={`absolute top-[3px] size-[14px] rounded-full bg-white shadow-sm transition-all ${checked ? 'start-[19px]' : 'start-[3px]'}`} />
			</span>
			{!hideLabel && label}
		</button>
	);
}

export function GmCheck({ checked, onChange, label, disabled = false }) {
	return (
		<button
			type='button'
			role='checkbox'
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-1.5 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary-400)_50%,transparent)] disabled:cursor-not-allowed disabled:opacity-45 ${checked ? 'text-(--color-primary-700)' : 'gm-muted hover:text-(--gm-ink-soft)'}`}
		>
			<span
				className={`grid size-[18px] shrink-0 place-items-center rounded-[6px] border transition-colors ${checked ? 'border-transparent text-white' : 'border-[color-mix(in_srgb,var(--color-primary-400)_45%,var(--gm-line))] bg-(--gm-paper) group-hover:border-(--color-primary-400)'}`}
				style={checked ? { background: GRADIENT_BG } : undefined}
			>
				{checked && <Check className='size-3' strokeWidth={3} />}
			</span>
			{label}
		</button>
	);
}

export function useObjectUrl(file) {
	const [url, setUrl] = useState('');
	useEffect(() => {
		if (!file) { setUrl(''); return undefined; }
		const next = URL.createObjectURL(file);
		setUrl(next);
		return () => URL.revokeObjectURL(next);
	}, [file]);
	return url;
}

export function GmSection({ icon: Icon, title, action, className = '', children }) {
	return (
		<section className={`rounded-2xl border p-3.5 sm:p-4 ${className}`} style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 48%, transparent)' }}>
			<div className='mb-3.5 flex items-center justify-between gap-2'>
				<p className='flex min-w-0 items-center gap-2 text-[12.5px] font-bold gm-ink'>
					<span className='gm-plan__icon size-7! rounded-[9px]!'><Icon className='size-3.5' /></span>
					<span className='truncate'>{title}</span>
				</p>
				{action}
			</div>
			{children}
		</section>
	);
}

export function GmTextarea({ label, value, onChange, rows = 3, error, placeholder }) {
	return (
		<div>
			<div className={`relative ${FIELD_SHELL} ${error ? 'border-rose-300!' : ''}`} style={FIELD_BG}>
				<span className={FLOAT_LABEL}>{label}</span>
				<textarea
					rows={rows}
					value={value ?? ''}
					placeholder={placeholder}
					onChange={e => onChange(e.target.value)}
					className='block min-h-[84px] w-full resize-y bg-transparent px-3 pb-2.5 pt-3.5 text-[13px] leading-relaxed text-(--gm-ink) outline-none placeholder:text-(--gm-faint)'
				/>
			</div>
			{error ? <p className='mt-1 text-xs text-rose-500'>{error}</p> : null}
		</div>
	);
}

/* ─────────────────────────── List editor ─────────────────────────── */
let listSeq = 0;
export const makeListRow = (value = '') => ({ id: ++listSeq, value });
export const toListRows = (list, keepOne = false) => {
	const rows = (Array.isArray(list) ? list : []).filter(v => v != null && String(v).trim()).map(v => makeListRow(String(v)));
	return rows.length || !keepOne ? rows : [makeListRow()];
};
export const fromListRows = rows => rows.map(r => r.value.trim()).filter(Boolean);

export const GmListEditor = memo(function GmListEditor({ field, rows, onField, icon, title, placeholder, numbered, labels }) {
	const inputs = useRef(new Map());
	const focusId = useRef(null);

	useEffect(() => {
		if (focusId.current == null) return;
		inputs.current.get(focusId.current)?.focus();
		focusId.current = null;
	}, [rows]);

	const add = useCallback(afterIndex => {
		const next = makeListRow();
		focusId.current = next.id;
		onField(field, prev => {
			const copy = [...prev];
			copy.splice(afterIndex == null ? copy.length : afterIndex + 1, 0, next);
			return copy;
		});
	}, [field, onField]);

	const update = (id, value) => onField(field, prev => prev.map(r => (r.id === id ? { ...r, value } : r)));
	const remove = id => onField(field, prev => prev.filter(r => r.id !== id));

	const onKeyDown = (e, r, i) => {
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
			e.preventDefault();
			add(i);
		} else if (e.key === 'Backspace' && !r.value && rows.length > 1) {
			e.preventDefault();
			focusId.current = (rows[i - 1] || rows[i + 1])?.id ?? null;
			remove(r.id);
		}
	};

	const filled = rows.filter(r => r.value.trim()).length;

	return (
		<GmSection
			icon={icon}
			title={(
				<span className='inline-flex items-center gap-2'>
					{title}
					{filled > 0 && <span className='gm-plan__chip font-en tabular-nums'>{filled}</span>}
				</span>
			)}
			action={(
				<button type='button' onClick={() => add()} className='gm-btn-ghost gm-btn-compact inline-flex shrink-0 items-center gap-1'>
					<Plus className='size-3.5' />
					{labels.add}
				</button>
			)}
		>
			{rows.length ? (
				<ul className='space-y-2'>
					<AnimatePresence initial={false}>
						{rows.map((r, i) => (
							<motion.li
								key={r.id}
								layout='position'
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, transition: { duration: 0.12 } }}
								transition={{ duration: 0.16 }}
								className='flex items-center gap-2'
							>
								{numbered ? (
									<span
										className='grid size-6 shrink-0 place-items-center rounded-xl font-en text-[11px] font-bold text-white tabular-nums'
										style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
									>
										{i + 1}
									</span>
								) : (
									<span className='mx-2 size-1.5 shrink-0 rounded-full bg-(--color-primary-400)' />
								)}
								<div className={`flex h-10 min-w-0 flex-1 items-center px-3 ${FIELD_SHELL}`} style={FIELD_BG}>
									<input
										ref={el => (el ? inputs.current.set(r.id, el) : inputs.current.delete(r.id))}
										dir='auto'
										value={r.value}
										placeholder={placeholder}
										aria-label={`${typeof title === 'string' ? title : ''} ${i + 1}`}
										onChange={e => update(r.id, e.target.value)}
										onKeyDown={e => onKeyDown(e, r, i)}
										className='w-full bg-transparent text-start text-[13px] text-(--gm-ink) outline-none placeholder:text-(--gm-faint)'
									/>
								</div>
								<button
									type='button'
									onClick={() => remove(r.id)}
									aria-label={labels.remove}
									title={labels.remove}
									className='grid size-10 shrink-0 place-items-center rounded-[11px] border border-(--gm-line) gm-muted transition-colors hover:border-[color-mix(in_srgb,var(--gm-danger)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--gm-danger)_10%,transparent)] hover:text-(--gm-danger)'
								>
									<X className='size-4' />
								</button>
							</motion.li>
						))}
					</AnimatePresence>
				</ul>
			) : (
				<button
					type='button'
					onClick={() => add()}
					className='flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-(--gm-line) py-3.5 text-[12.5px] font-medium gm-muted transition-colors hover:border-(--color-primary-300) hover:text-(--color-primary-600)'
				>
					<Plus className='size-4' />
					{labels.empty}
				</button>
			)}
		</GmSection>
	);
});
