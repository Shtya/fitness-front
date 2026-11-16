'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronRight, HeartHandshake, ListFilter, Pin, Settings, Star, Flag, Radio } from 'lucide-react';
import { Avatar } from './WaAvatar';

export function statusMeta(status, t, account) {
	if (status === 'connected') return { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: t.online };
	if (status === 'qr_pending') {
		return {
			dot: 'bg-amber-500',
			text: 'text-amber-600',
			bg: 'bg-amber-50 dark:bg-amber-950/30',
			label: t.qrPending,
			hint: t.scanQrHint,
		};
	}
	if (status === 'connecting') {
		const restoring = Boolean(account?.lastConnectedAt);
		return {
			dot: 'bg-amber-500',
			text: 'text-amber-600',
			bg: 'bg-amber-50 dark:bg-amber-950/30',
			label: restoring ? t.restoring || t.connecting : t.connecting,
			hint: restoring ? t.sessionLinkedHint : t.syncingPhone,
		};
	}
	if (status === 'error') return { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', label: t.errorStatus };
	return { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: t.offline };
}

/** Icons for the desktop filter pills ("All" and "Unread" carry a count instead). */
const FILTER_PILL_ICONS = { favorites: Star, keep_in_touch: HeartHandshake, channels: Radio, important: Flag };

export function ConversationFilterDropdown({ value, onChange, labels, variant = 'dropdown', counts = {} }) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const options = [
		{ value: 'all', label: labels.all },
		{ value: 'unread', label: labels.unread },
		{ value: 'favorites', label: labels.favorites },
		...(labels.keepInTouch ? [{ value: 'keep_in_touch', label: labels.keepInTouch }] : []),
		...(labels.channels ? [{ value: 'channels', label: labels.channels }] : []),
		{ value: 'important', label: labels.important },
	];
	const selected = options.find(option => option.value === value) || options[0];

	useEffect(() => {
		if (!open || variant === 'pills') return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPosition({
				top: rect.bottom + 6,
				left: rect.left,
				width: Math.max(rect.width, 180),
			});
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
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open, variant]);

	if (variant === 'pills') {
		return (
			<div
				className="wa-desktop-filter-pills flex gap-1 overflow-x-auto px-1 pb-1"
				role="listbox"
				aria-label="Conversation type"
			>
				{options.map(option => {
					const active = option.value === value;
					return (
						<button
							key={option.value}
							type="button"
							role="option"
							aria-selected={active}
							onClick={() => onChange(option.value)}
							className={`wa-filter-pill is-${option.value} rounded-[18px] border-0 px-3 py-1.5 text-[10px] font-semibold transition-colors ${
								active ? 'is-active' : ''
							}`}
						>
							{FILTER_PILL_ICONS[option.value] ? (() => {
								const PillIcon = FILTER_PILL_ICONS[option.value];
								return <PillIcon size={14} strokeWidth={2.2} className="wa-filter-pill__icon" aria-hidden="true" />;
							})() : null}
							<span>{option.label}</span>
							{counts[option.value] > 0 ? (
								<span className="wa-filter-pill__count">{counts[option.value] > 99 ? '99+' : counts[option.value]}</span>
							) : null}
						</button>
					);
				})}
			</div>
		);
	}

	return (
		<div ref={rootRef} className="wa-desktop-filter relative shrink-0">
			<button
				ref={buttonRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={selected.label}
				title={selected.label}
				onClick={() => setOpen(current => !current)}
				className={`wa-btn-3d rounded-full p-0 text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
					open || value !== 'all' ? 'is-active' : ''
				}`}
			>
				<ListFilter size={16} />
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="listbox"
						aria-label="Conversation type"
						className="fixed z-500 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
						style={position}
					>
						{options.map(option => (
							<button
								key={option.value}
								type="button"
								role="option"
								aria-selected={option.value === value}
								onClick={() => {
									onChange(option.value);
									setOpen(false);
								}}
								className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-xs font-bold transition-colors ${option.value === value
									? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-slate-800'
									: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
									}`}
							>
								<span>{option.label}</span>
								{option.value === value && <Check size={13} />}
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}

export function AccountSwitcherDropdown({
	accounts = [],
	value,
	onChange,
	labels,
	statusLabels,
	locale = 'en',
	onManage,
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const selected = accounts.find(account => account.id === value) || accounts[0] || null;
	const selectedStatus = selected ? statusMeta(selected.status, statusLabels, selected) : null;

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = Math.max(rect.width, 300);
			const left = Math.min(
				Math.max(8, rect.left),
				Math.max(8, window.innerWidth - width - 8),
			);
			setPosition({
				top: rect.bottom + 8,
				left,
				width,
			});
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
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open]);

	if (!accounts.length) return null;

	const toneOf = status =>
		status === 'connected'
			? 'ok'
			: ['connecting', 'qr_pending'].includes(status)
				? 'wait'
				: status === 'error'
					? 'err'
					: 'off';
	const ar = locale === 'ar';

	return (
		<div ref={rootRef} className="wa-asw relative min-w-[220px] max-w-[300px]">
			<button
				ref={buttonRef}
				type="button"
				aria-label={labels.accounts}
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen(current => !current)}
				className={`wa-asw__trigger is-${toneOf(selected?.status)}${open ? ' is-open' : ''}`}
			>
				<span className="wa-asw__avatar">
					<Avatar label={selected?.label || '?'} size={8} />
					<span className="wa-asw__dot" aria-hidden="true" />
				</span>
				<span className="wa-asw__copy">
					<span className="wa-asw__name">{selected?.label || labels.accounts}</span>
					{selectedStatus ? <span className="wa-asw__status">{selectedStatus.label}</span> : null}
				</span>
				<ChevronDown size={16} className="wa-asw__chev" aria-hidden="true" />
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="listbox"
						aria-label={labels.accounts}
						className="wa-asw-menu"
						style={position}
					>
						<div className="wa-asw-menu__head">
							<span>{ar ? 'تبديل الحساب' : 'Switch account'}</span>
							<span className="wa-asw-menu__count">{accounts.length}</span>
						</div>
						<div className="wa-asw-menu__list wa-ui-scroll nice-scroll">
							{accounts.map(account => {
								const meta = statusMeta(account.status, statusLabels, account);
								const tone = toneOf(account.status);
								const active = account.id === value;
								return (
									<button
										key={account.id}
										type="button"
										role="option"
										aria-selected={active}
										onClick={() => {
											onChange(account.id);
											setOpen(false);
										}}
										className={`wa-asw-row is-${tone}${active ? ' is-active' : ''}`}
										title={meta.hint || meta.label}
									>
										<span className="wa-asw__avatar">
											<Avatar label={account.label} size={10} />
											<span className="wa-asw__dot" aria-hidden="true" />
										</span>
										<span className="wa-asw-row__copy">
											<span className="wa-asw-row__name">{account.label}</span>
											<span className="wa-asw-row__sub">
												<span className={`wa-asw-row__state is-${tone}`}>{meta.label}</span>
												<span className="wa-asw-row__sep" aria-hidden="true" />
												<span dir={account.phoneNumber ? 'ltr' : undefined}>
													{account.phoneNumber
														? `+${String(account.phoneNumber).replace(/^\+/, '')}`
														: account.providerName}
												</span>
											</span>
										</span>
										<span className="wa-asw-row__check" aria-hidden="true">
											{active ? <Check size={14} strokeWidth={2.8} /> : null}
										</span>
									</button>
								);
							})}
						</div>
						{onManage ? (
							<button
								type="button"
								className="wa-asw-menu__manage"
								onClick={() => {
									setOpen(false);
									onManage();
								}}
							>
								<Settings size={15} strokeWidth={2} />
								{ar ? 'إدارة الحسابات' : 'Manage accounts'}
								<ChevronRight size={15} className="wa-asw-menu__manage-chev rtl:rotate-180" />
							</button>
						) : null}
					</div>,
					document.body,
				)}
		</div>
	);
}

function OnlineContactsBar({
	contacts = [],
	pinnedId,
	selectedId,
	onSelect,
	onTogglePin,
	labels,
}) {
	const ordered = useMemo(() => {
		const list = Array.isArray(contacts) ? [...contacts] : [];
		return list.sort((a, b) => {
			if (pinnedId) {
				if (a.conversationId === pinnedId) return -1;
				if (b.conversationId === pinnedId) return 1;
			}
			if (Boolean(a.online) !== Boolean(b.online)) return a.online ? -1 : 1;
			return (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0);
		});
	}, [contacts, pinnedId]);

	const visible = useMemo(() => {
		// Only real online / typing contacts, plus a pinned contact if offline.
		const online = ordered.filter(
			item => item.online || item.typing || item.recording,
		);
		const pinnedOffline = ordered.filter(
			item =>
				pinnedId &&
				item.conversationId === pinnedId &&
				!item.online &&
				!item.typing &&
				!item.recording,
		);
		return [...online, ...pinnedOffline];
	}, [ordered, pinnedId]);

	if (!visible.length) return null;

	return (
		<div className="wa-presence-bar" role="toolbar" aria-label={labels.connectedNumbers}>
			<div className="wa-presence-bar__scroll nice-scroll">
				{visible.map(contact => {
					const pinned = contact.conversationId === pinnedId;
					const active = contact.conversationId === selectedId;
					const online = Boolean(
						contact.online || contact.typing || contact.recording,
					);
					const label =
						String(contact.name || contact.phoneNumber || labels.online).trim() ||
						labels.online;
					const avatarSrc = String(contact.avatarUrl || '').trim();
					return (
						<div
							key={contact.conversationId}
							className={`wa-presence-chip${online ? ' is-online' : ' is-offline'}${
								pinned ? ' is-pinned' : ''
							}${active ? ' is-active' : ''}`}
							title={label}
						>
							<button
								type="button"
								className="wa-presence-chip__main"
								onClick={() => onSelect?.(contact.conversationId)}
								title={label}
								aria-label={label}
								aria-pressed={active}
							>
								<span className="wa-presence-chip__avatar-wrap">
									<Avatar
										label={label}
										size={10}
										src={avatarSrc}
										priority={Boolean(avatarSrc)}
										className="wa-presence-chip__avatar !ring-0"
									/>
									{online ? (
										<span
											className="wa-presence-chip__dot is-online"
											aria-hidden="true"
										/>
									) : null}
								</span>
								<span className="wa-presence-chip__meta">
									<span className="wa-presence-chip__name">{label}</span>
								</span>
							</button>
							<button
								type="button"
								className="wa-presence-chip__pin"
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									onTogglePin?.(contact.conversationId);
								}}
								aria-label={pinned ? labels.unpinNumber : labels.pinNumber}
								title={pinned ? labels.unpinNumber : labels.pinNumber}
								aria-pressed={pinned}
							>
								<Pin
									size={12}
									strokeWidth={2.6}
									className={pinned ? 'fill-current' : undefined}
									aria-hidden="true"
								/>
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
