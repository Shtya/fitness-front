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
	UserX,
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
	{ bg: 'bg-[#dfe5e7] dark:bg-[#2a3942]', text: 'text-[#54656f] dark:text-[#aebac1]' },
	{ bg: 'bg-[#d9f4ec] dark:bg-[#0a332c]', text: 'text-[#007a5e] dark:text-[#21c063]' },
	{ bg: 'bg-[#dbeefa] dark:bg-[#0f2f40]', text: 'text-[#027eb5] dark:text-[#53bdeb]' },
	{ bg: 'bg-[#f3e6fa] dark:bg-[#33213d]', text: 'text-[#8c3fb3] dark:text-[#d39ef0]' },
	{ bg: 'bg-[#fdecdc] dark:bg-[#3d2a17]', text: 'text-[#b5560b] dark:text-[#f5b544]' },
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
		<div
			className={cn('wa-ui-perms', className)}
			role="group"
			aria-label={ar ? `صلاحيات ${person.name || ''}` : `Permissions for ${person.name || ''}`}
		>
			{PERMISSIONS.map(item => {
				const checked = Boolean(person[item.flag]);
				const Icon = item.Icon;
				return (
					<label
						key={item.flag}
						className={cn('wa-ui-perm', checked && 'is-on')}
						onClick={event => event.stopPropagation()}
						onPointerDown={event => event.stopPropagation()}
					>
						<input
							type="checkbox"
							className="sr-only"
							checked={checked}
							onChange={event => {
								event.stopPropagation();
								onToggle?.(person.id, item.flag, event.target.checked);
							}}
						/>
						{checked ? (
							<Check size={12} strokeWidth={2.6} className="wa-ui-perm__icon" aria-hidden="true" />
						) : (
							<Icon size={12} strokeWidth={2} className="wa-ui-perm__icon" aria-hidden="true" />
						)}
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
			// Phones get a bottom sheet, the way WhatsApp presents pickers there.
			if (viewportW <= 560) {
				setPosition({ sheet: true, maxHeight: Math.round(viewportH * 0.86) });
				return;
			}
			const width = Math.min(480, Math.max(320, viewportW - margin * 2));
			const spaceBelow = Math.max(0, viewportH - rect.bottom - margin - gap);
			const spaceAbove = Math.max(0, rect.top - margin - gap);
			const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
			const available = Math.max(200, openUp ? spaceAbove : spaceBelow);
			const maxHeight = Math.min(600, available);
			const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
			let left = ar ? rect.left : rect.right - width;
			left = Math.max(margin, Math.min(left, viewportW - width - margin));
			setPosition({ sheet: false, top, left, width, maxHeight, openUp });
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
			if (event.key !== 'Escape') return;
			event.stopPropagation();
			setOpen(false);
			buttonRef.current?.focus();
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

	const closeMenu = () => {
		setOpen(false);
		buttonRef.current?.focus();
	};
	const assignableCount = staff.filter(person => person.assignable).length;

	return (
		<div ref={rootRef} className={cn('relative', className)}>
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label={`${ariaLabel}: ${triggerLabel}`}
				onClick={() => {
					setQuery('');
					setOpen(current => !current);
				}}
				className={cn(
					'wa-custom-select-trigger flex h-8 w-auto items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-[#111b21] outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00a884]/50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
					buttonClassName,
				)}
			>
				<span className="flex min-w-0 items-center gap-1.5">
					{selected ? (
						<StaffAvatar name={selected.name} src={selected.avatarUrl} size="h-5 w-5 text-[9px]" />
					) : (
						<UserCog size={15} strokeWidth={1.9} className="shrink-0 text-[#54656f]" aria-hidden="true" />
					)}
					<span className="min-w-0 truncate">{triggerLabel}</span>
				</span>
				<ChevronDown
					size={14}
					strokeWidth={2}
					aria-hidden="true"
					className={cn('shrink-0 text-[#54656f] transition-transform', open ? 'rotate-180' : '')}
				/>
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<>
						<div
							aria-hidden="true"
							className={cn('fixed inset-0', position.sheet && 'wa-ui-scrim')}
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
							aria-modal={position.sheet ? 'true' : undefined}
							aria-labelledby="wa-assign-title"
							aria-describedby="wa-assign-subtitle"
							dir={ar ? 'rtl' : 'ltr'}
							onPointerDown={event => event.stopPropagation()}
							className={cn('wa-ui-assign', position.sheet ? 'is-sheet' : 'is-popover')}
							style={
								position.sheet
									? { zIndex: 100051, maxHeight: position.maxHeight }
									: {
											zIndex: 100051,
											top: position.top,
											left: position.left,
											width: position.width,
											maxHeight: position.maxHeight,
										}
							}
						>
							{position.sheet ? <span className="wa-ui-assign__grabber" aria-hidden="true" /> : null}
							<div className="wa-ui-modal__header">
								<div className="wa-ui-modal__heading">
									<h2 id="wa-assign-title" className="wa-ui-modal__title">
										{ar ? 'تعيين المحادثة' : 'Assign chat'}
									</h2>
									<p id="wa-assign-subtitle" className="wa-ui-modal__subtitle">
										{canManageAccess
											? ar
												? 'اختر موظفًا، أو عدّل صلاحيات العرض والاستخدام.'
												: 'Pick a teammate, or adjust their View + Use access.'
											: ar
												? 'اختر الموظف المسؤول عن هذه المحادثة.'
												: 'Choose who handles this conversation.'}
									</p>
								</div>
								<button
									type="button"
									aria-label={ar ? 'إغلاق' : 'Close'}
									title={ar ? 'إغلاق' : 'Close'}
									onClick={closeMenu}
									className="wa-ui-icon-btn"
								>
									<X size={18} strokeWidth={2} />
								</button>
							</div>
							<div className="wa-ui-assign__search">
								<label className="wa-ui-search">
									<Search size={16} strokeWidth={2} aria-hidden="true" />
									<input
										ref={searchRef}
										type="search"
										value={query}
										onChange={event => setQuery(event.target.value)}
										className="wa-ui-input"
										placeholder={ar ? 'ابحث بالاسم أو البريد' : 'Search name or email'}
										aria-label={ar ? 'ابحث عن موظف' : 'Search staff'}
									/>
								</label>
							</div>
							<div ref={listRef} className="wa-ui-assign__list wa-ui-scroll">
								<button
									type="button"
									aria-pressed={unassigned}
									onClick={() => {
										onAssign?.('');
										closeMenu();
									}}
									className={cn('wa-ui-assign__row is-standalone', unassigned && 'is-selected')}
								>
									<span className="wa-ui-assign__avatar" aria-hidden="true">
										<UserX size={18} strokeWidth={1.9} />
									</span>
									<span className="wa-ui-assign__copy">
										<span className="wa-ui-assign__name">{unassignLabel}</span>
										<span className="wa-ui-assign__sub">
											{ar ? 'لا أحد مسؤول عن المحادثة' : 'No one owns this chat'}
										</span>
									</span>
									<span className="wa-ui-assign__check" aria-hidden="true">
										{unassigned ? <Check size={14} strokeWidth={2.8} /> : null}
									</span>
								</button>
								<p className="wa-ui-menu__section wa-ui-assign__section">
									<span>{ar ? 'الفريق' : 'Team'}</span>
									{!loading && staff.length ? (
										<span className="wa-ui-assign__count">
											{ar
												? `${assignableCount} من ${staff.length} قابل للتعيين`
												: `${assignableCount} of ${staff.length} can be assigned`}
										</span>
									) : null}
								</p>
								{loading ? (
									<div aria-busy="true" aria-label={ar ? 'جارٍ التحميل' : 'Loading'}>
										{[0, 1, 2, 3].map(item => (
											<div key={item} className="wa-ui-assign__skeleton">
												<span />
												<span />
											</div>
										))}
									</div>
								) : visibleStaff.length === 0 ? (
									<div className="wa-ui-assign__empty">
										<Users size={22} strokeWidth={1.6} aria-hidden="true" />
										<p>
											{needle
												? ar
													? 'لا يوجد موظفون مطابقون للبحث.'
													: 'No teammates match this search.'
												: ar
													? 'لا يوجد موظفون في نطاق حسابك. تأكد أن الموظفين مربوطين بنفس الأدمن/المؤسسة.'
													: 'No staff in your account scope. Make sure staff are linked to the same admin/org.'}
										</p>
									</div>
								) : (
									visibleStaff.map(person => {
										const assigned = String(person.id) === String(value);
										const expanded = expandedId === person.id;
										const showChips = canManageAccess && !person.isOwner;
										const chipsId = `wa-assign-perms-${person.id}`;
										return (
											<div
												key={person.id}
												className={cn('wa-ui-assign__person', assigned && 'is-selected')}
											>
												<div className="wa-ui-assign__person-head">
													<button
														type="button"
														aria-pressed={assigned}
														onClick={() => {
															onAssign?.(person.id);
															closeMenu();
														}}
														className="wa-ui-assign__row"
													>
														<StaffAvatar
															name={person.name}
															src={person.avatarUrl}
															size="h-10 w-10 text-[13px]"
														/>
														<span className="wa-ui-assign__copy">
															<span className="wa-ui-assign__name">
																<span className="truncate">{person.name}</span>
																{person.isOwner ? (
																	<span className="wa-ui-badge wa-ui-badge--accent">
																		<Crown size={10} strokeWidth={2.2} aria-hidden="true" />
																		{ar ? 'المالك' : 'Owner'}
																	</span>
																) : null}
															</span>
															<span
																className={cn(
																	'wa-ui-assign__sub',
																	!person.assignable && 'is-warning',
																)}
															>
																{person.assignable
																	? person.email || (ar ? 'قابل للتعيين' : 'Can be assigned')
																	: ar
																		? 'يحتاج عرض + استخدام للتعيين'
																		: 'Needs View + Use to be assigned'}
															</span>
														</span>
														<span className="wa-ui-assign__check" aria-hidden="true">
															{assigned ? <Check size={14} strokeWidth={2.8} /> : null}
														</span>
													</button>
													{showChips ? (
														<button
															type="button"
															aria-expanded={expanded}
															aria-controls={chipsId}
															aria-label={
																ar
																	? `صلاحيات ${person.name}`
																	: `Permissions for ${person.name}`
															}
															title={ar ? 'الصلاحيات' : 'Permissions'}
															onClick={() =>
																setExpandedId(current => (current === person.id ? null : person.id))
															}
															className={cn('wa-ui-icon-btn wa-ui-icon-btn--sm', expanded && 'is-on')}
														>
															<Settings size={15} strokeWidth={1.9} />
														</button>
													) : null}
												</div>
												{showChips && expanded ? (
													<div id={chipsId} className="wa-ui-assign__perms">
														<StaffPermissionChips
															person={person}
															onToggle={onTogglePermission}
															locale={locale}
														/>
													</div>
												) : null}
											</div>
										);
									})
								)}
							</div>
							<div className="wa-ui-modal__footer">
								<p className="wa-ui-modal__footer-note">
									<Info size={14} strokeWidth={2} aria-hidden="true" />
									<span>
										{canManageAccess
											? ar
												? 'تُحفظ الصلاحيات فور تغييرها. العرض والاستخدام مطلوبان للتعيين.'
												: 'Access changes save instantly. View + Use are required to assign.'
											: ar
												? 'العرض والاستخدام مطلوبان للتعيين.'
												: 'View + Use are required to assign.'}
									</span>
								</p>
								<button
									type="button"
									onClick={closeMenu}
									className="wa-ui-btn wa-ui-btn--primary wa-ui-btn--sm"
								>
									{ar ? 'تم' : 'Done'}
								</button>
							</div>
						</div>
					</>,
					document.body,
				)}
		</div>
	);
}
