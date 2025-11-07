'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Search, Plus, Save, CircleX } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Select({
	options = [],
	value = null,
	onChange = () => { },
	placeholder,
	searchable = true,
	disabled = false,
	clearable = true,
	className = '',
	label,
	cnInputParent,

	allowCustom = false,
	createHint = 'Write a new category…',
}) {
	const t = useTranslations()

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(-1);
	const [createMode, setCreateMode] = useState(false);
	const [createText, setCreateText] = useState('');

	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const listRef = useRef(null);
	const createInputRef = useRef(null);
	const [portalReady, setPortalReady] = useState(false);


	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

	const selectedOption = useMemo(() => options.find(o => String(o.id) === String(value)) || null, [options, value]);


	const buttonLabel = useMemo(() => {
		if (selectedOption) return selectedOption.label;
		if (typeof value === 'string' && value.trim()) return value;
		return placeholder || t("common.select");
	}, [selectedOption, value, placeholder]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!searchable || !q) return options;
		return options.filter(o => String(o.label).toLowerCase().includes(q));
	}, [options, query, searchable]);

	const hasExactMatch = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return false;
		return options.some(o => String(o.label).toLowerCase() === q);
	}, [options, query]);

	const updateCoords = useCallback(() => {
		if (!buttonRef.current) return;
		const rect = buttonRef.current.getBoundingClientRect();
		setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
	}, []);

	const openMenu = useCallback(() => {
		if (disabled) return;
		updateCoords();
		setOpen(true);
		setTimeout(updateCoords, 0);
	}, [disabled, updateCoords]);

	const closeMenu = useCallback(() => {
		setOpen(false);
		setQuery('');
		setActiveIndex(-1);
		setCreateMode(false);
		setCreateText('');
	}, []);


	useEffect(() => setPortalReady(true), []);


	useEffect(() => {
		if (!open) return;
		const handler = () => updateCoords();
		window.addEventListener('resize', handler);
		window.addEventListener('scroll', handler, true);
		const obs = new ResizeObserver(handler);
		if (buttonRef.current) obs.observe(buttonRef.current);
		return () => {
			window.removeEventListener('resize', handler);
			window.removeEventListener('scroll', handler, true);
			obs.disconnect();
		};
	}, [open, updateCoords]);


	useEffect(() => {
		if (!open) return;
		const onDocClick = e => {
			const t = e.target;
			if (buttonRef.current?.contains(t) || listRef.current?.contains(t)) return;
			closeMenu();
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [open, closeMenu]);


	useEffect(() => {
		if (createMode) {
			setTimeout(() => createInputRef.current?.focus(), 0);
		}
	}, [createMode]);


	const onKeyDown = e => {
		if (!open) {
			if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
				e.preventDefault();
				openMenu();
				setActiveIndex(0);
			}
			return;
		}

		if (createMode) {
			if (e.key === 'Escape') {
				e.preventDefault();
				setCreateMode(false);
				setCreateText('');
			}
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			closeMenu();
			buttonRef.current?.focus();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActiveIndex(i => {
				const next = Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1);
				scrollIntoView(next);
				return next;
			});
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActiveIndex(i => {
				const next = Math.max((i < 0 ? filtered.length : i) - 1, 0);
				scrollIntoView(next);
				return next;
			});
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = filtered[activeIndex];
			if (item) {
				onChange(item.id);
				closeMenu();
				buttonRef.current?.focus();
			}
		} else if (e.key === 'Tab') {
			closeMenu();
		}
	};

	const scrollIntoView = index => {
		const list = listRef.current;
		if (!list) return;
		const offset = searchable ? 1 : 0;
		const item = list.children[index + offset];
		if (!item) return;
		const listRect = list.getBoundingClientRect();
		const itemRect = item.getBoundingClientRect();
		if (itemRect.top < listRect.top) {
			list.scrollTop -= listRect.top - itemRect.top;
		} else if (itemRect.bottom > listRect.bottom) {
			list.scrollTop += itemRect.bottom - listRect.bottom;
		}
	};

	const pick = item => {
		onChange(item.id);
		closeMenu();
		buttonRef.current?.focus();
	};

	const clear = e => {
		e.stopPropagation();
		onChange(null);
		setQuery('');
		setActiveIndex(-1);
	};

	const createFromText = text => {
		const t = (text ?? '').trim();
		if (!t) return;
		onChange(t);
		closeMenu();
		buttonRef.current?.focus();
	};

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			{label && <label className='mb-1.5 block text-sm font-medium text-slate-700'>{label}</label>}

			<button type='button' ref={buttonRef} onClick={() => (open ? closeMenu() : openMenu())} onKeyDown={onKeyDown} disabled={disabled} className={[cnInputParent, ' h-[43px] group relative w-full inline-flex items-center justify-between gap-2', 'rounded-lg border bg-white px-2 py-2.5 text-sm', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', 'transition-colors', 'border-slate-300 hover:border-slate-400 focus:border-indigo-500', 'focus:outline-none focus:ring-4 focus:ring-indigo-100'].join(' ')} aria-haspopup='listbox' aria-expanded={open}>
				<span className={`truncate text-left ${selectedOption || (typeof value === 'string' && value.trim()) ? 'text-slate-900' : 'text-gray-500'}`}>{buttonLabel}</span>

				<span className=' flex items-center gap-1'>
					{clearable && (selectedOption || (typeof value === 'string' && value)) && !disabled && <X className=' max-md:hidden h-4 w-4 opacity-60 hover:opacity-100 transition' onClick={clear} />}
					<ChevronDown className='h-4 w-4 text-slate-600' />
				</span>
			</button>

			{portalReady &&
				open &&
				createPortal(
					<div role='listbox' aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined} className='z-[99999999] fixed mt-0' style={{ top: coords.top, left: coords.left, width: coords.width }}>
						<div ref={listRef} className='max-h-[215px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5' onKeyDown={onKeyDown}>

							{searchable && !createMode && (
								<div className='p-2 border-b border-slate-100 sticky top-0 bg-white'>
									<div className='relative'>
										<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
										<input
											className='w-full h-9 pl-10 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white'
											placeholder={t("common.search")}
											value={query}
											onChange={e => {
												setQuery(e.target.value);
												setActiveIndex(0);
											}}
											autoFocus
										/>
									</div>
								</div>
							)}


							{allowCustom && createMode && (
								<div className='p-2 border-b border-slate-100 sticky top-0 bg-white'>
									<div className='flex gap-2'>
										<input
											ref={createInputRef}
											className='flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
											placeholder={createHint}
											value={createText}
											onChange={e => setCreateText(e.target.value)}
											onKeyDown={e => {
												if (e.key === 'Enter') {
													e.preventDefault();
													createFromText(createText);
												}
												if (e.key === 'Escape') {
													e.preventDefault();
													setCreateMode(false);
													setCreateText('');
												}
											}}
										/>
										<button type='button' onClick={() => createFromText(createText)} className='inline-flex items-center gap-1 rounded-lg px-3 text-sm border border-slate-300 hover:border-slate-400 h-9'>
											<Save className='w-4 h-4' /> Save
										</button>
										<button
											type='button'
											onClick={() => {
												setCreateMode(false);
												setCreateText('');
											}}
											className='inline-flex items-center gap-1 rounded-lg px-3 text-sm border border-slate-300 hover:border-slate-400 h-9'>
											<CircleX className='w-4 h-4' /> Cancel
										</button>
									</div>
								</div>
							)}


							{!createMode && (
								<>
									<ul className='py-1'>
										{filtered.length === 0 && <li className='px-3 py-2 text-sm text-slate-400'>{t("common.noResult")}</li>}
										{filtered.map((item, idx) => {
											const isSelected = selectedOption?.id === item.id;
											const isActive = idx === activeIndex;
											return (
												<li id={`opt-${idx}`} key={item.id} role='option' aria-selected={isSelected} className={['mx-1 my-0.5 rounded-lg px-3 py-2 text-sm flex items-center justify-between select-none cursor-pointer', isActive ? 'bg-indigo-50' : 'bg-transparent', isSelected ? 'text-indigo-700' : 'text-slate-700', 'hover:bg-indigo-50'].join(' ')} onMouseEnter={() => setActiveIndex(idx)} onMouseDown={e => e.preventDefault()} onClick={() => pick(item)}>
													<span className='truncate'>{item.label}</span>
													{isSelected && <Check className='h-4 w-4 text-indigo-600' />}
												</li>
											);
										})}
									</ul>


									{allowCustom && query.trim() && !hasExactMatch && (
										<div className='p-2 border-t border-slate-100 sticky bottom-0 bg-white'>
											<button type='button' onClick={() => createFromText(query)} className='w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-sm border border-dashed border-slate-300 hover:border-slate-400'>
												<Plus className='w-4 h-4' />
												Create “{query.trim()}”
											</button>
										</div>
									)}
								</>
							)}


							{!createMode && allowCustom && (
								<div className='p-2 border-t border-slate-100 sticky bottom-0 bg-white'>
									<button
										type='button'
										onClick={() => {
											setCreateMode(true);
											setCreateText('');
										}}
										className='w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-sm border border-slate-300 hover:border-slate-400'>
										<Plus className='w-4 h-4' />
										{createHint}
									</button>
								</div>
							)}
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
