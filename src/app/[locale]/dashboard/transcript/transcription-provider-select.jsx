'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { Check, ChevronDown, ExternalLink, KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useUser } from '@/hooks/useUser';
import {
	CLOUD_TRANSCRIPTION_PROVIDER_IDS,
	fetchAllTranscriptionCredentialStatuses,
	saveTranscriptionCredential,
	TRANSCRIPTION_PROVIDERS,
} from './transcription-client';

const DEFAULT_MENU_Z = 100050;

const labels = {
	en: {
		keyAdded: 'Key added',
		noKey: 'No key',
		localService: 'Local',
		editKey: 'Edit API key',
		addKey: 'Add API key',
		keyConfigured: 'Saved key ending in',
		keyPlaceholder: 'Paste API key',
		keyPlaceholderUpdate: 'Paste a new key to replace',
		save: 'Save',
		getKey: 'Get API Key',
		keySaved: 'API key saved',
		saveFailed: 'Could not save API key',
		adminOnly: 'Only admins can save API keys',
	},
	ar: {
		keyAdded: 'تمت الإضافة',
		noKey: 'لا يوجد مفتاح',
		localService: 'محلي',
		editKey: 'تعديل مفتاح API',
		addKey: 'إضافة مفتاح API',
		keyConfigured: 'المفتاح المحفوظ ينتهي بـ',
		keyPlaceholder: 'ألصق مفتاح API',
		keyPlaceholderUpdate: 'ألصق مفتاحًا جديدًا للاستبدال',
		save: 'حفظ',
		getKey: 'الحصول على المفتاح',
		keySaved: 'تم حفظ مفتاح API',
		saveFailed: 'تعذر حفظ مفتاح API',
		adminOnly: 'الحفظ متاح للمسؤولين فقط',
	},
};

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function providerMeta(providerId) {
	return TRANSCRIPTION_PROVIDERS.find(item => item.id === providerId) || null;
}

function KeyStatusBadge({ configured, isLocal, compact, t }) {
	if (isLocal) {
		return (
			<span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
				{t.localService}
			</span>
		);
	}
	if (configured) {
		return (
			<span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
				{t.keyAdded}
			</span>
		);
	}
	return (
		<span
			className={`shrink-0 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 ${
				compact ? 'text-[9px]' : 'text-[10px]'
			}`}
		>
			{t.noKey}
		</span>
	);
}

function ProviderKeyPopover({
	open,
	onOpenChange,
	providerId,
	credential,
	draftKey,
	onDraftChange,
	onSave,
	saving,
	canManageKeys,
	t,
	locale,
}) {
	const meta = providerMeta(providerId);
	if (!meta?.keyUrl) return null;
	const configured = Boolean(credential?.configured);

	return (
		<PopoverContent
			align={locale === 'ar' ? 'end' : 'start'}
			side="bottom"
			sideOffset={8}
			className="z-[100060] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
			onOpenAutoFocus={event => event.preventDefault()}
			onPointerDown={event => event.stopPropagation()}
			onMouseDown={event => event.stopPropagation()}
		>
			<div className="space-y-2.5">
				<div>
					<p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{meta.name}</p>
					<p className="mt-0.5 text-[11px] text-slate-500">
						{configured
							? `${t.keyConfigured} ••••${credential?.lastFour || '····'}`
							: t.addKey}
					</p>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
					<div className="relative min-w-0 flex-1">
						<input
							type="password"
							value={draftKey}
							onChange={event => onDraftChange(event.target.value)}
							placeholder={configured ? t.keyPlaceholderUpdate : t.keyPlaceholder}
							autoComplete="new-password"
							maxLength={512}
							disabled={!canManageKeys || saving}
							className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-[4.25rem] ps-3 text-[12px] font-medium text-slate-800 outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
							onKeyDown={event => {
								if (event.key === 'Enter' && canManageKeys && draftKey.trim() && !saving) {
									event.preventDefault();
									onSave();
								}
							}}
						/>
						<button
							type="button"
							onClick={onSave}
							disabled={!canManageKeys || !draftKey.trim() || saving}
							className="absolute end-1 top-1/2 inline-flex h-8 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-600 px-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{saving ? <Loader2 className="size-3.5 animate-spin" /> : t.save}
						</button>
					</div>
					<a
						href={meta.keyUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
					>
						<ExternalLink className="size-3.5" />
						{t.getKey}
					</a>
				</div>

				{!canManageKeys ? (
					<p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">{t.adminOnly}</p>
				) : null}
			</div>
		</PopoverContent>
	);
}

export default function TranscriptionProviderSelect({
	value,
	onChange,
	disabled = false,
	ariaLabel,
	className = '',
	buttonClassName = '',
	size = 'md',
	menuZIndex = DEFAULT_MENU_Z,
}) {
	const locale = useLocale();
	const t = labels[locale] || labels.en;
	const user = useUser();
	const canManageKeys = user && ['admin', 'super_admin'].includes(user?.role);

	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const [credentials, setCredentials] = useState({});
	const [credentialsLoading, setCredentialsLoading] = useState(false);
	const [keyPopoverProvider, setKeyPopoverProvider] = useState(null);
	const [draftKeys, setDraftKeys] = useState({});
	const [savingProvider, setSavingProvider] = useState(null);

	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const touchYRef = useRef(null);

	const compact = size === 'sm';
	const selected = TRANSCRIPTION_PROVIDERS.find(item => item.id === value) || TRANSCRIPTION_PROVIDERS[0];
	const keyPopoverOpen = Boolean(keyPopoverProvider);

	const loadCredentials = useCallback(async () => {
		setCredentialsLoading(true);
		try {
			const next = await fetchAllTranscriptionCredentialStatuses();
			setCredentials(next);
		} catch {
			setCredentials({});
		} finally {
			setCredentialsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCredentials();
	}, [loadCredentials]);

	const setDraftForProvider = useCallback((providerId, nextValue) => {
		setDraftKeys(current => ({ ...current, [providerId]: nextValue }));
	}, []);

	const saveKey = useCallback(
		async providerId => {
			if (!canManageKeys) {
				toast.error(t.adminOnly);
				return;
			}
			const apiKey = String(draftKeys[providerId] || '').trim();
			if (!apiKey) return;
			setSavingProvider(providerId);
			try {
				const status = await saveTranscriptionCredential(providerId, apiKey);
				setCredentials(current => ({ ...current, [providerId]: status }));
				setDraftForProvider(providerId, '');
				toast.success(`${providerMeta(providerId)?.name || providerId}: ${t.keySaved}`);
			} catch (error) {
				toast.error(error?.response?.data?.message || t.saveFailed);
			} finally {
				setSavingProvider(null);
			}
		},
		[canManageKeys, draftKeys, setDraftForProvider, t.adminOnly, t.keySaved, t.saveFailed],
	);

	const pickProvider = useCallback(
		(nextProvider, { openKeyPopover = false } = {}) => {
			if (!TRANSCRIPTION_PROVIDERS.some(item => item.id === nextProvider)) return;
			onChange?.(nextProvider);
			setOpen(false);
			const isCloud = CLOUD_TRANSCRIPTION_PROVIDER_IDS.includes(nextProvider);
			const configured = Boolean(credentials[nextProvider]?.configured);
			if (isCloud && (openKeyPopover || !configured)) {
				setKeyPopoverProvider(nextProvider);
			}
		},
		[credentials, onChange],
	);

	const openKeyEditor = useCallback(
		(event, providerId) => {
			event.preventDefault();
			event.stopPropagation();
			if (TRANSCRIPTION_PROVIDERS.some(item => item.id === providerId)) {
				onChange?.(providerId);
			}
			setOpen(false);
			setKeyPopoverProvider(providerId);
		},
		[onChange],
	);

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const gap = 6;
			const margin = 8;
			const viewportH = window.innerHeight || 720;
			const viewportW = window.innerWidth || 1280;
			const minW = 300;
			const width = Math.min(Math.max(rect.width, minW), viewportW - margin * 2);
			const spaceBelow = Math.max(0, viewportH - rect.bottom - margin - gap);
			const spaceAbove = Math.max(0, rect.top - margin - gap);
			const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
			const available = Math.max(160, openUp ? spaceAbove : spaceBelow);
			const maxHeight = Math.min(420, available);
			const top = openUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap;
			let left = rect.left;
			left = Math.max(margin, Math.min(left, viewportW - width - margin));
			setPosition({ top, left, width, maxHeight, openUp });
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (
				!rootRef.current?.contains(event.target) &&
				!menuRef.current?.contains(event.target) &&
				!event.target?.closest?.('[data-slot="popover-content"]')
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
			const maxScroll = menu.scrollHeight - menu.clientHeight;
			if (maxScroll <= 0) return;
			const next = clamp(menu.scrollTop + event.deltaY, 0, maxScroll);
			if (next !== menu.scrollTop) {
				menu.scrollTop = next;
				event.preventDefault();
			}
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
			const maxScroll = menu.scrollHeight - menu.clientHeight;
			if (maxScroll <= 0) return;
			const next = clamp(menu.scrollTop + deltaY, 0, maxScroll);
			if (next !== menu.scrollTop) {
				menu.scrollTop = next;
				event.preventDefault();
			}
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
	}, [open]);

	const selectedCredential = credentials[value];
	const selectedConfigured = Boolean(selectedCredential?.configured);
	const triggerKeyBadge = useMemo(() => {
		if (value === 'local') return null;
		return (
			<KeyStatusBadge
				configured={selectedConfigured}
				isLocal={false}
				compact
				t={t}
			/>
		);
	}, [selectedConfigured, t, value]);

	return (
		<Popover
			open={keyPopoverOpen}
			onOpenChange={nextOpen => {
				if (!nextOpen) setKeyPopoverProvider(null);
			}}
		>
			<div ref={rootRef} className={`relative ${className}`}>
				<PopoverAnchor asChild>
					<button
						ref={buttonRef}
						type="button"
						disabled={disabled}
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-label={ariaLabel}
						onClick={() => setOpen(current => !current)}
						className={`wa-custom-select-trigger flex w-full items-center justify-between gap-2 border border-slate-200 bg-white px-3 font-semibold text-[#111b21] shadow-[0_1px_0_#eef0f2] outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none dark:hover:border-slate-600 dark:hover:bg-slate-800 ${
							compact ? 'h-8 rounded-lg text-[11px]' : 'h-10 rounded-xl text-[13px]'
						} ${open ? 'border-slate-300 ring-2 ring-slate-900/5 dark:ring-white/10' : ''} ${buttonClassName}`}
					>
						<span className="flex min-w-0 flex-1 items-center gap-2">
							<span className="min-w-0 truncate">
								{selected ? `${selected.name} · ${selected.score}%` : ''}
							</span>
							{triggerKeyBadge}
						</span>
						<span
							className={`grid shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500 transition-colors dark:bg-slate-800 dark:text-slate-300 ${
								compact ? 'h-5 w-5' : 'h-6 w-6'
							} ${open ? 'bg-slate-200 text-slate-700 dark:bg-slate-700' : ''}`}
						>
							<ChevronDown
								size={compact ? 12 : 14}
								className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
							/>
						</span>
					</button>
				</PopoverAnchor>

				{keyPopoverProvider ? (
					<ProviderKeyPopover
						open={keyPopoverOpen}
						onOpenChange={nextOpen => {
							if (!nextOpen) setKeyPopoverProvider(null);
						}}
						providerId={keyPopoverProvider}
						credential={credentials[keyPopoverProvider]}
						draftKey={draftKeys[keyPopoverProvider] || ''}
						onDraftChange={next => setDraftForProvider(keyPopoverProvider, next)}
						onSave={() => saveKey(keyPopoverProvider)}
						saving={savingProvider === keyPopoverProvider}
						canManageKeys={canManageKeys}
						t={t}
						locale={locale}
					/>
				) : null}

				{open &&
					position &&
					typeof document !== 'undefined' &&
					createPortal(
						<>
							<div
								aria-hidden="true"
								data-wa-select-menu="true"
								className="fixed inset-0"
								style={{ zIndex: menuZIndex, pointerEvents: 'auto' }}
								onPointerDown={event => {
									event.preventDefault();
									event.stopPropagation();
									setOpen(false);
								}}
							/>
							<div
								ref={menuRef}
								role="listbox"
								data-wa-select-menu="true"
								aria-label={ariaLabel}
								onPointerDown={event => event.stopPropagation()}
								className={`wa-custom-select-menu fixed overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.16),0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_48px_rgba(0,0,0,0.45)] dark:ring-white/[0.04] ${
									position.openUp ? 'wa-custom-select-menu--up' : 'wa-custom-select-menu--down'
								}`}
								style={{
									top: position.top,
									left: position.left,
									width: position.width,
									maxHeight: position.maxHeight,
									zIndex: menuZIndex + 1,
									pointerEvents: 'auto',
									WebkitOverflowScrolling: 'touch',
								}}
							>
								{credentialsLoading ? (
									<div className="flex items-center justify-center gap-2 px-3 py-4 text-[12px] text-slate-500">
										<Loader2 className="size-4 animate-spin" />
									</div>
								) : null}
								{TRANSCRIPTION_PROVIDERS.map(item => {
									const isSelected = item.id === value;
									const isLocal = item.id === 'local';
									const isCloud = CLOUD_TRANSCRIPTION_PROVIDER_IDS.includes(item.id);
									const configured = Boolean(credentials[item.id]?.configured);
									return (
										<div
											key={item.id}
											className={`flex items-center gap-1 rounded-xl transition-all duration-150 ${
												isSelected
													? 'bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)] dark:bg-emerald-950/40 dark:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.28)]'
													: 'hover:bg-slate-100 dark:hover:bg-slate-800'
											}`}
										>
											<button
												type="button"
												role="option"
												aria-selected={isSelected}
												onPointerDown={event => {
													event.preventDefault();
													event.stopPropagation();
													pickProvider(item.id, { openKeyPopover: isCloud && !configured });
												}}
												onClick={event => {
													event.preventDefault();
													event.stopPropagation();
													pickProvider(item.id, { openKeyPopover: isCloud && !configured });
												}}
												className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-start ${
													isSelected
														? 'text-emerald-800 dark:text-emerald-200'
														: 'text-slate-700 dark:text-slate-200'
												}`}
											>
												<span className="min-w-0 flex-1">
													<span
														className={`block truncate leading-5 ${
															isSelected ? 'text-[13px] font-semibold' : 'text-[13px] font-medium'
														}`}
													>
														{item.name} · {item.score}%
													</span>
												</span>
												<KeyStatusBadge
													configured={configured}
													isLocal={isLocal}
													t={t}
												/>
												<span
													className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors ${
														isSelected
															? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
															: 'bg-transparent text-transparent'
													}`}
												>
													{isSelected ? <Check size={12} strokeWidth={3} /> : null}
												</span>
											</button>
											{isCloud && item.keyUrl ? (
												<button
													type="button"
													title={configured ? t.editKey : t.addKey}
													aria-label={configured ? t.editKey : t.addKey}
													onPointerDown={event => openKeyEditor(event, item.id)}
													onClick={event => openKeyEditor(event, item.id)}
													className="me-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-700 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
												>
													<KeyRound className="size-3.5" />
												</button>
											) : null}
										</div>
									);
								})}
							</div>
						</>,
						document.body,
					)}
			</div>
		</Popover>
	);
}
