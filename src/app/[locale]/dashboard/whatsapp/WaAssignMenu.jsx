'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	ArrowLeftRight,
	Check,
	ChevronDown,
	Crown,
	Eye,
	FileText,
	Info,
	Search,
	Settings,
	UserCog,
	UserPlus,
	Users,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
	{ flag: 'canView', en: 'View', ar: 'عرض', Icon: Eye },
	{ flag: 'canUse', en: 'Use', ar: 'استخدام', Icon: FileText },
	{ flag: 'canManage', en: 'Manage', ar: 'إدارة', Icon: Settings },
	{ flag: 'canAssign', en: 'Assign', ar: 'تعيين', Icon: UserPlus },
	{ flag: 'canTransfer', en: 'Transfer', ar: 'نقل', Icon: ArrowLeftRight },
];

const AVATAR_TONES = [
	{ bg: 'bg-sky-100', text: 'text-sky-700' },
	{ bg: 'bg-violet-100', text: 'text-violet-700' },
	{ bg: 'bg-orange-100', text: 'text-orange-700' },
	{ bg: 'bg-emerald-100', text: 'text-emerald-700' },
	{ bg: 'bg-rose-100', text: 'text-rose-700' },
	{ bg: 'bg-indigo-100', text: 'text-indigo-700' },
];

function initials(name) {
	const text = String(name || '').trim();
	if (!text) return '?';
	const parts = text.split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function avatarTone(name) {
	const text = String(name || '');
	let hash = 0;
	for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
	return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function StaffAvatar({ name, src, size = 'h-10 w-10 text-[12px]' }) {
	const tone = avatarTone(name);
	if (src) {
		return (
			<img
				src={src}
				alt=""
				className={cn('shrink-0 rounded-full object-cover', size)}
			/>
		);
	}
	return (
		<span
			className={cn(
				'grid shrink-0 place-items-center rounded-full font-bold',
				size,
				tone.bg,
				tone.text,
			)}
		>
			{initials(name)}
		</span>
	);
}

export function StaffPermissionChips({ person, onToggle, locale = 'en', className = '' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	return (
		<div className={cn('flex flex-wrap gap-1.5', className)}>
			{PERMISSIONS.map(item => {
				const checked = Boolean(person[item.flag]);
				const Icon = item.Icon;
				return (
					<label
						key={item.flag}
						className={cn(
							'inline-flex cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition-colors',
							checked
								? 'border-emerald-200 bg-emerald-50 text-emerald-800'
								: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
						)}
						onClick={event => event.stopPropagation()}
						onPointerDown={event => event.stopPropagation()}
					>
						<input
							type="checkbox"
							className="h-3 w-3 rounded border-slate-300 text-emerald-600 accent-emerald-600"
							checked={checked}
							onChange={event => {
								event.stopPropagation();
								onToggle?.(person.id, item.flag, event.target.checked);
							}}
						/>
						<Icon size={12} strokeWidth={2.1} className="shrink-0" />
						{ar ? item.ar : item.en}
					</label>
				);
			})}
		</div>
	);
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
	loading = false,
	className = '',
	buttonClassName = '',
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [position, setPosition] = useState(null);
	const [expandedId, setExpandedId] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const listRef = useRef(null);
	const searchRef = useRef(null);
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
	const unassigned = !value;

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const gap = 8;
			const margin = 8;
			const viewportH = window.innerHeight || 720;
			const viewportW = window.innerWidth || 1280;
			const width = Math.min(560, Math.max(320, viewportW - margin * 2));
			const spaceBelow = Math.max(0, viewportH - rect.bottom - margin - gap);
			const spaceAbove = Math.max(0, rect.top - margin - gap);
			const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
			const available = Math.max(200, openUp ? spaceAbove : spaceBelow);
			const maxHeight = Math.min(640, available);
			const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
			let left = ar ? rect.left : rect.right - width;
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
			const list = listRef.current;
			if (!list || !menuRef.current?.contains(event.target)) return;
			if (scrollNodeByDelta(list, event.deltaY)) event.preventDefault();
			event.stopPropagation();
		};
		const onTouchStartCapture = event => {
			const list = listRef.current;
			if (!list || !menuRef.current?.contains(event.target)) return;
			touchYRef.current = event.touches[0]?.clientY ?? null;
		};
		const onTouchMoveCapture = event => {
			const list = listRef.current;
			if (!list || !menuRef.current?.contains(event.target) || touchYRef.current == null) {
				return;
			}
			const y = event.touches[0]?.clientY;
			if (y == null) return;
			const deltaY = touchYRef.current - y;
			touchYRef.current = y;
			if (scrollNodeByDelta(list, deltaY)) event.preventDefault();
			event.stopPropagation();
		};
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		document.addEventListener('wheel', onWheelCapture, { capture: true, passive: false });
		document.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: true });
		document.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: false });
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 40);
		return () => {
			window.clearTimeout(focusTimer);
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			document.removeEventListener('wheel', onWheelCapture, true);
			document.removeEventListener('touchstart', onTouchStartCapture, true);
			document.removeEventListener('touchmove', onTouchMoveCapture, true);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open, staff.length, ar]);

	const closeMenu = () => setOpen(false);

	return (
		<div ref={rootRef} className={cn('relative', className)}>
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
				className={cn(
					'wa-custom-select-trigger flex h-8 w-auto items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-[#111b21] shadow-[0_1px_0_#eef0f2] outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
					open ? 'border-slate-300 ring-2 ring-slate-900/5 dark:ring-white/10' : '',
					buttonClassName,
				)}
			>
				<span className="flex min-w-0 items-center gap-2">
					<span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800">
						{selected ? <Users size={14} /> : <UserCog size={14} />}
					</span>
					<span className="min-w-0 truncate">{triggerLabel}</span>
				</span>
				<span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800">
					<ChevronDown size={12} className={cn('transition-transform', open ? 'rotate-180' : '')} />
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
								closeMenu();
							}}
						/>
						<div
							ref={menuRef}
							role="dialog"
							aria-label={ariaLabel}
							onPointerDown={event => event.stopPropagation()}
							className="fixed flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900"
							style={{
								zIndex: 100051,
								top: position.top,
								left: position.left,
								width: position.width,
								maxHeight: position.maxHeight,
							}}
						>
							<div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4">
								<div className="flex min-w-0 items-start gap-3">
									<span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
										<UserCog size={18} strokeWidth={2} />
									</span>
									<div className="min-w-0">
										<p className="text-[16px] font-bold leading-5 text-[#111b21] dark:text-white">
											{ar ? 'صلاحيات العرض والاستخدام' : 'View + Use permissions'}
										</p>
										<p className="mt-1 text-[12.5px] leading-4 text-slate-500">
											{ar
												? 'اختر الموظفين وحدد صلاحياتهم.'
												: 'Select staff members and set their permissions.'}
										</p>
									</div>
								</div>
								<button
									type="button"
									aria-label={ar ? 'إغلاق' : 'Close'}
									onClick={closeMenu}
									className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
								>
									<X size={18} />
								</button>
							</div>
							<div className="shrink-0 px-4 pb-3">
								<label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-50 dark:border-slate-700 dark:bg-slate-900">
									<Search size={16} className="shrink-0" />
									<input
										ref={searchRef}
										type="search"
										value={query}
										onChange={event => setQuery(event.target.value)}
										placeholder={ar ? 'ابحث عن الموظفين…' : 'Search staff members...'}
										className="min-w-0 flex-1 bg-transparent text-[13px] text-[#111b21] outline-none placeholder:text-slate-400 dark:text-slate-100"
									/>
								</label>
							</div>
							<div
								ref={listRef}
								className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2"
							>
								<button
									type="button"
									onClick={() => {
										onAssign?.('');
										closeMenu();
									}}
									className={cn(
										'mb-3 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors',
										unassigned
											? 'border-emerald-200 bg-emerald-50'
											: 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
									)}
								>
									<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
										<UserPlus size={18} strokeWidth={2.1} />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-[13.5px] font-bold text-[#111b21] dark:text-white">
											{unassignLabel}
										</span>
										<span className="block text-[12px] text-slate-500">
											{ar ? 'غير معيّنة لأي شخص' : 'Not assigned to anyone'}
										</span>
									</span>
									<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
										{ar ? 'افتراضي' : 'Default'}
									</span>
									{unassigned ? (
										<span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white">
											<Check size={14} strokeWidth={2.6} />
										</span>
									) : null}
								</button>
								<p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
									{ar ? 'الموظفون' : 'Staff members'}
								</p>
								{loading ? (
									<div className="space-y-2">
										{[0, 1, 2, 3].map(item => (
											<div
												key={item}
												className="h-18 animate-pulse rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60"
											/>
										))}
									</div>
								) : visibleStaff.length === 0 ? (
									<p className="px-3 py-8 text-center text-sm text-slate-400">
										{needle
											? ar
												? 'لا يوجد موظفون مطابقون للبحث.'
												: 'No staff members match this search.'
											: ar
												? 'لا يوجد موظفون في نطاق حسابك. تأكد أن الموظفين مربوطين بنفس الأدمن/المؤسسة.'
												: 'No staff in your account scope. Make sure staff are linked to the same admin/org.'}
									</p>
								) : (
									<div className="space-y-2">
										{visibleStaff.map(person => {
											const assigned = String(person.id) === String(value);
											const expanded = expandedId === person.id;
											const showChips = canManageAccess && !person.isOwner;
											return (
												<div
													key={person.id}
													className={cn(
														'rounded-xl border px-3 py-2.5 transition-colors',
														assigned
															? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30'
															: 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900',
													)}
												>
													<div className="flex items-start gap-3">
														<button
															type="button"
															onClick={() => {
																onAssign?.(person.id);
																closeMenu();
															}}
															className="flex min-w-0 flex-1 items-start gap-3 text-start"
														>
															<StaffAvatar name={person.name} src={person.avatarUrl} />
															<span className="min-w-0 flex-1">
																<span className="flex min-w-0 flex-wrap items-center gap-1.5">
																	<span className="truncate text-[13.5px] font-bold text-[#111b21] dark:text-white">
																		{person.name}
																	</span>
																	{person.isOwner ? (
																		<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
																			<Crown size={10} />
																			{ar ? 'مالك الحساب' : 'Account owner'}
																		</span>
																	) : null}
																</span>
																<span className="mt-0.5 block truncate text-[12px] text-slate-500">
																	{person.assignable
																		? person.email || (ar ? 'قابل للتعيين' : 'Assignable')
																		: ar
																			? 'فعّل عرض واستخدام للتعيين'
																			: 'Enable View + Use to assign'}
																</span>
															</span>
														</button>
														{assigned ? (
															<span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
																<Check size={14} strokeWidth={2.6} />
															</span>
														) : null}
														{showChips ? (
															<button
																type="button"
																aria-expanded={expanded}
																aria-label={ar ? 'إظهار الصلاحيات' : 'Show permissions'}
																onClick={() =>
																	setExpandedId(current => (current === person.id ? null : person.id))
																}
																className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
															>
																<ChevronDown
																	size={16}
																	className={cn(
																		'transition-transform',
																		expanded ? 'rotate-180' : '',
																	)}
																/>
															</button>
														) : null}
													</div>
													{showChips ? (
														<StaffPermissionChips
															person={person}
															onToggle={onTogglePermission}
															locale={locale}
															className={cn('mt-2.5', expanded ? '' : 'max-[480px]:hidden')}
														/>
													) : null}
												</div>
											);
										})}
									</div>
								)}
							</div>
							<div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
								<p className="flex items-center gap-1.5 text-[12px] text-slate-500">
									<Info size={14} className="shrink-0" />
									{ar ? 'العرض والاستخدام مطلوبان للتعيين.' : 'View and Use are required to assign.'}
								</p>
								<div className="flex items-center justify-end gap-2">
									<button
										type="button"
										onClick={closeMenu}
										className="h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-[#111b21] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
									>
										{ar ? 'إلغاء' : 'Cancel'}
									</button>
									<button
										type="button"
										onClick={closeMenu}
										className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-[13px] font-semibold text-white hover:bg-emerald-800"
									>
										<Check size={15} strokeWidth={2.4} />
										{ar ? 'حفظ التغييرات' : 'Save changes'}
									</button>
								</div>
							</div>
						</div>
					</>,
					document.body,
				)}
		</div>
	);
}
