'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, UserCircle2, Users } from 'lucide-react';

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function scrollNodeByDelta(node, deltaY) {
	if (!node) return false;
	const maxScroll = node.scrollHeight - node.clientHeight;
	if (maxScroll <= 0) return false;
	const next = clamp(node.scrollTop + deltaY, 0, maxScroll);
	if (next === node.scrollTop) return false;
	node.scrollTop = next;
	return true;
}

const PERMISSIONS = [
	{ flag: 'canView', en: 'View', ar: 'عرض' },
	{ flag: 'canUse', en: 'Use', ar: 'استخدام' },
	{ flag: 'canManage', en: 'Manage', ar: 'إدارة' },
	{ flag: 'canAssign', en: 'Assign', ar: 'تعيين' },
	{ flag: 'canTransfer', en: 'Transfer', ar: 'نقل' },
];

export function StaffPermissionChips({ person, onToggle, locale = 'en', className = '' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	return (
		<div className={`flex flex-wrap gap-1 ${className}`}>
			{PERMISSIONS.map(item => (
				<label
					key={item.flag}
					className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
					onClick={event => event.stopPropagation()}
					onPointerDown={event => event.stopPropagation()}
				>
					<input
						type="checkbox"
						className="h-3 w-3 rounded border-slate-300 text-emerald-600"
						checked={Boolean(person[item.flag])}
						onChange={event => {
							event.stopPropagation();
							onToggle?.(person.id, item.flag, event.target.checked);
						}}
					/>
					{ar ? item.ar : item.en}
				</label>
			))}
		</div>
	);
}

function initials(name) {
	const text = String(name || '').trim();
	if (!text) return '?';
	const parts = text.split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export function WaAssignMenu({
	value = '',
	staff = [],
	onAssign,
	onTogglePermission,
	canManageAccess = false,
	locale = 'en',
	unassignLabel = 'Unassigned',
	ariaLabel = 'Assign',
	disabled = false,
	className = '',
	buttonClassName = '',
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const touchYRef = useRef(null);
	const selected = staff.find(item => String(item.id) === String(value));
	const triggerLabel = selected?.name || unassignLabel;
	const needle = query.trim().toLowerCase();
	const visibleStaff = needle
		? staff.filter(person =>
				[person.name, person.email, person.role]
					.filter(Boolean)
					.some(part => String(part).toLowerCase().includes(needle)),
			)
		: staff;

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const gap = 6;
			const margin = 8;
			const viewportH = window.innerHeight || 720;
			const viewportW = window.innerWidth || 1280;
			const width = Math.min(420, viewportW - margin * 2);
			const spaceBelow = Math.max(0, viewportH - rect.bottom - margin - gap);
			const spaceAbove = Math.max(0, rect.top - margin - gap);
			const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
			const available = Math.max(160, openUp ? spaceAbove : spaceBelow);
			const maxHeight = Math.min(440, available);
			const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
			let left = rect.right - width;
			left = Math.max(margin, Math.min(left, viewportW - width - margin));
			setPosition({ top, left, width, maxHeight, openUp });
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (
				!rootRef.current?.contains(event.target) &&
				!menuRef.current?.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const closeOnEscape = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		const onWheelCapture = event => {
			const menu = menuRef.current;
			if (!menu || !menu.contains(event.target)) return;
			if (scrollNodeByDelta(menu, event.deltaY)) event.preventDefault();
			event.stopPropagation();
		};
		const onTouchStartCapture = event => {
			const menu = menuRef.current;
			if (!menu || !menu.contains(event.target)) return;
			touchYRef.current = event.touches[0]?.clientY ?? null;
		};
		const onTouchMoveCapture = event => {
			const menu = menuRef.current;
			if (!menu || !menu.contains(event.target) || touchYRef.current == null) return;
			const y = event.touches[0]?.clientY;
			if (y == null) return;
			const deltaY = touchYRef.current - y;
			touchYRef.current = y;
			if (scrollNodeByDelta(menu, deltaY)) event.preventDefault();
			event.stopPropagation();
		};
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		document.addEventListener('wheel', onWheelCapture, { capture: true, passive: false });
		document.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: true });
		document.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: false });
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			document.removeEventListener('wheel', onWheelCapture, true);
			document.removeEventListener('touchstart', onTouchStartCapture, true);
			document.removeEventListener('touchmove', onTouchMoveCapture, true);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open, staff.length]);

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => {
					setQuery('');
					setOpen(current => !current);
				}}
				className={`wa-custom-select-trigger flex w-auto items-center justify-between gap-2 border border-slate-200 bg-white px-3 font-semibold text-[#111b21] shadow-[0_1px_0_#eef0f2] outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 h-8 rounded-lg text-[11px] ${
					open ? 'border-slate-300 ring-2 ring-slate-900/5 dark:ring-white/10' : ''
				} ${buttonClassName}`}
			>
				<span className="flex min-w-0 items-center gap-2">
					<span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800">
						{selected ? <Users size={14} /> : <UserCircle2 size={14} />}
					</span>
					<span className="min-w-0 truncate">{triggerLabel}</span>
				</span>
				<span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800">
					<ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
				</span>
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<>
						<div
							aria-hidden="true"
							className="fixed inset-0"
							style={{ zIndex: 100050 }}
							onPointerDown={event => {
								event.preventDefault();
								event.stopPropagation();
								setOpen(false);
							}}
						/>
						<div
							ref={menuRef}
							role="listbox"
							aria-label={ariaLabel}
							onPointerDown={event => event.stopPropagation()}
							className="fixed overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900"
							style={{
								zIndex: 100051,
								top: position.top,
								left: position.left,
								width: position.width,
								maxHeight: position.maxHeight,
							}}
						>
							{canManageAccess ? (
								<p className="px-2 pb-1.5 pt-1 text-[10px] leading-snug text-slate-400">
									{ar
										? 'عرض + استخدام مطلوبان للتعيين. غيّر الصلاحيات من المربعات.'
										: 'View + Use are required to assign. Use the checkboxes to change permissions.'}
								</p>
							) : null}
							{staff.length > 6 ? (
								<input
									type="search"
									value={query}
									onChange={event => setQuery(event.target.value)}
									placeholder={ar ? 'بحث عن موظف' : 'Search staff'}
									className="mb-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] outline-none dark:border-slate-700 dark:bg-slate-800"
									onPointerDown={event => event.stopPropagation()}
								/>
							) : null}
							<button
								type="button"
								onClick={() => {
									onAssign?.('');
									setOpen(false);
								}}
								className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-start text-[13px] ${
									!value ? 'bg-emerald-50 font-semibold text-emerald-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
								}`}
							>
								<UserCircle2 size={16} className="shrink-0 text-slate-400" />
								<span className="min-w-0 flex-1 truncate">{unassignLabel}</span>
								{!value ? <Check size={16} className="text-emerald-600" /> : null}
							</button>
							{visibleStaff.map(person => {
								const assigned = String(person.id) === String(value);
								return (
									<div
										key={person.id}
										className={`rounded-xl px-2 py-2 ${
											assigned ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''
										}`}
									>
										<button
											type="button"
											onClick={() => {
												onAssign?.(person.id);
												setOpen(false);
											}}
											className="flex w-full items-center gap-2 text-start"
										>
											<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
												{initials(person.name)}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-[13px] font-semibold text-[#111b21] dark:text-white">
													{person.name}
												</span>
												<span className="block truncate text-[11px] text-slate-400">
													{person.assignable
														? person.email || (ar ? 'قابل للتعيين' : 'Assignable')
														: ar
															? 'فعّل عرض واستخدام للتعيين'
															: 'Enable View + Use to assign'}
												</span>
											</span>
											{assigned ? <Check size={16} className="text-emerald-600" /> : null}
										</button>
										{canManageAccess && !person.isOwner ? (
											<StaffPermissionChips
												person={person}
												onToggle={onTogglePermission}
												locale={locale}
												className="mt-2 ps-10"
											/>
										) : person.isOwner ? (
											<p className="ps-10 pt-1 text-[10px] font-semibold text-slate-400">
												{ar ? 'مالك الحساب' : 'Account owner'}
											</p>
										) : null}
									</div>
								);
							})}
							{visibleStaff.length === 0 ? (
								<p className="px-3 py-4 text-center text-sm text-slate-400">
									{ar
										? 'لا يوجد موظفون في نطاق حسابك. تأكد أن الموظفين مربوطين بنفس الأدمن/المؤسسة.'
										: 'No staff in your account scope. Make sure staff are linked to the same admin/org.'}
								</p>
							) : null}
						</div>
					</>,
					document.body,
				)}
		</div>
	);
}
