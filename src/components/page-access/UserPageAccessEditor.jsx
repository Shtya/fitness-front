'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Eye, LayoutGrid, Lock, LogIn, RefreshCw, RotateCcw, Store } from 'lucide-react';
import api from '@/utils/axios';
import { getNavPagesForRole } from '@/components/molecules/Sidebar';
import { resolvePageMode, resolvePostLoginPath } from '@/lib/nav-access';

export const PAGE_MODE_UI = {
	default: {
		icon: Eye,
		badge: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/50',
		active: 'bg-emerald-500 text-white shadow-sm',
	},
	optional: {
		icon: Store,
		badge: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-900/50',
		active: 'bg-indigo-500 text-white shadow-sm',
	},
	locked: {
		icon: Lock,
		badge: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-900/50',
		active: 'bg-rose-500 text-white shadow-sm',
	},
};

export function navText(tNav, key) {
	return key && tNav.has(key) ? tNav(key) : key || '';
}

export function PageModeBadge({ mode, label }) {
	const ui = PAGE_MODE_UI[mode] || PAGE_MODE_UI.default;
	const Icon = ui.icon;
	return (
		<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${ui.badge}`}>
			<Icon size={10} />
			{label}
		</span>
	);
}

/** Accessible segmented radio control. options: [{ value, label, icon, active }] */
export function ModeSegment({ options, value, onChange, disabled = false, ariaLabel }) {
	return (
		<div
			role="radiogroup"
			aria-label={ariaLabel}
			className={`inline-flex shrink-0 items-center gap-0.5 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 ${disabled ? 'opacity-50' : ''}`}
		>
			{options.map((opt) => {
				const selected = opt.value === value;
				const Icon = opt.icon;
				return (
					<button
						key={opt.value}
						type="button"
						role="radio"
						aria-checked={selected}
						disabled={disabled}
						onClick={() => onChange(opt.value)}
						className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-bold transition-colors disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] ${
							selected ? opt.active : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
						}`}
					>
						{Icon ? <Icon size={11} /> : null}
						<span className="hidden sm:inline">{opt.label}</span>
					</button>
				);
			})}
		</div>
	);
}

function overridesFromAccess(access) {
	const out = {};
	for (const id of access?.extraPages || []) out[id] = 'show';
	for (const id of access?.lockedPages || []) out[id] = 'lock';
	return out;
}

/** Old allowlist → overrides: allowed pages are pinned visible, the rest locked. */
function overridesFromLegacy(pages, allowedPages, roleModes) {
	const allow = new Set(allowedPages);
	const out = {};
	for (const page of pages) {
		if (page.required) continue;
		const allowed =
			allow.has(page.id) ||
			(page.parentId && allow.has(page.parentId)) ||
			pages.some((child) => child.parentId === page.id && allow.has(child.id));
		if (!allowed) out[page.id] = 'lock';
		else if (resolvePageMode(page, { roleModes }) !== 'default') out[page.id] = 'show';
	}
	return out;
}

/** Loads + edits one user's page overrides (super admin). */
export function useUserPageAccess(userId, role) {
	const pages = useMemo(() => getNavPagesForRole(role), [role]);
	const [status, setStatus] = useState('loading');
	const [roleModes, setRoleModes] = useState({});
	const [overrides, setOverrides] = useState({});
	const [landingPageId, setLandingPageId] = useState('');
	const [legacyConverted, setLegacyConverted] = useState(false);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		if (!userId) return;
		setStatus('loading');
		try {
			const { data } = await api.get(`/page-access/users/${userId}`);
			const modes = data?.pageAccess?.roleModes || {};
			const legacy = Array.isArray(data?.allowedPages) && data.allowedPages.length > 0;
			setRoleModes(modes);
			setOverrides(legacy ? overridesFromLegacy(pages, data.allowedPages, modes) : overridesFromAccess(data?.pageAccess));
			setLegacyConverted(legacy);
			setLandingPageId(data?.loginLandingPage || '');
			setStatus('ready');
		} catch (error) {
			console.warn('Failed to load user page access', error?.response?.status);
			setStatus('error');
		}
	}, [userId, pages]);

	useEffect(() => {
		load();
	}, [load]);

	const access = useMemo(() => {
		const extraPages = [];
		const lockedPages = [];
		for (const [id, value] of Object.entries(overrides)) (value === 'show' ? extraPages : lockedPages).push(id);
		return { roleModes, extraPages, lockedPages };
	}, [roleModes, overrides]);

	const lockedIds = useMemo(
		() => pages.filter((page) => resolvePageMode(page, access) === 'locked').map((page) => page.id),
		[pages, access],
	);
	const landingChoices = useMemo(
		() => pages.filter((page) => page.href && !lockedIds.includes(page.id)),
		[pages, lockedIds],
	);
	const effectiveLanding = landingChoices.some((page) => page.id === landingPageId) ? landingPageId : '';

	const setOverride = useCallback((id, value) => {
		setOverrides((prev) => {
			const next = { ...prev };
			if (value) next[id] = value;
			else delete next[id];
			return next;
		});
	}, []);

	const save = useCallback(async () => {
		setSaving(true);
		try {
			const { data } = await api.put(`/page-access/users/${userId}`, {
				extraPages: access.extraPages,
				lockedPages: access.lockedPages,
				loginLandingPage: effectiveLanding || null,
			});
			setLegacyConverted(false);
			return data;
		} finally {
			setSaving(false);
		}
	}, [userId, access, effectiveLanding]);

	return {
		role,
		pages,
		status,
		reload: load,
		access,
		overrides,
		setOverride,
		resetOverrides: () => setOverrides({}),
		landingPageId: effectiveLanding,
		setLandingPageId,
		landingChoices,
		lockedIds,
		legacyConverted,
		saving,
		save,
	};
}

/** Per-user override list + landing page select. `editor` comes from useUserPageAccess. */
export function UserPageAccessFields({ editor, compact = false }) {
	const t = useTranslations('pageAccess');
	const tNav = useTranslations('nav');
	const { pages, status, access, overrides, setOverride, resetOverrides, legacyConverted, role } = editor;

	const sections = useMemo(() => {
		const map = new Map();
		for (const page of pages) {
			const key = page.sectionKey || 'sections.main';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(page);
		}
		return [...map.entries()];
	}, [pages]);

	if (status === 'loading') {
		return (
			<div role="status" aria-busy="true" className="flex items-center justify-center py-10 text-slate-400">
				<RefreshCw size={16} className="animate-spin" />
			</div>
		);
	}

	if (status === 'error') {
		return (
			<div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-6 text-center">
				<p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{t('loadFailed')}</p>
				<button
					type="button"
					onClick={editor.reload}
					className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-white/60"
				>
					<RefreshCw size={12} />
					{t('retry')}
				</button>
			</div>
		);
	}

	const overrideOptions = [
		{ value: '', label: t('user.inherit'), icon: RotateCcw, active: 'bg-slate-700 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900' },
		{ value: 'show', label: t('user.show'), icon: Eye, active: PAGE_MODE_UI.default.active },
		{ value: 'lock', label: t('user.lock'), icon: Lock, active: PAGE_MODE_UI.locked.active },
	];
	const overrideCount = Object.keys(overrides).length;

	return (
		<div className="space-y-3">
			{legacyConverted && (
				<div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
					<AlertTriangle size={13} className="mt-0.5 shrink-0" />
					{t('user.legacyNote')}
				</div>
			)}

			<div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
				<div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
					<LayoutGrid size={14} className="text-[var(--color-primary-500)] shrink-0" />
					<p className="min-w-0 flex-1 text-[11px] text-slate-500 truncate">
						{t('user.subtitle', { role: t(`roles.${role}`) })}
					</p>
					{overrideCount > 0 && (
						<button
							type="button"
							onClick={resetOverrides}
							className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
						>
							<RotateCcw size={10} />
							{t('user.roleDefault')}
						</button>
					)}
				</div>

				<div className={`overflow-y-auto ${compact ? 'max-h-60' : 'max-h-[46vh]'}`}>
					{sections.map(([sectionKey, items]) => (
						<div key={sectionKey} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
							<div className="sticky top-0 z-[1] px-3 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm">
								<p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{navText(tNav, sectionKey)}</p>
							</div>
							<ul className="divide-y divide-slate-100 dark:divide-slate-800">
								{items.map((page) => {
									const Icon = page.icon || LayoutGrid;
									const roleMode = resolvePageMode(page, { roleModes: access.roleModes });
									const effective = resolvePageMode(page, access);
									const parentLocked = !!page.parentId && resolvePageMode({ id: page.parentId }, access) === 'locked';
									return (
										<li
											key={page.id}
											className={`flex items-center gap-2.5 px-3 py-2 ${page.parentId ? 'ps-8' : ''} ${effective === 'locked' ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}`}
										>
											<span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${effective === 'locked' ? 'text-rose-400 bg-rose-100/70 dark:bg-rose-950/40' : 'text-[var(--color-primary-600)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]/30'}`}>
												<Icon size={14} />
											</span>
											<span className="min-w-0 flex-1">
												<span className={`block text-xs font-semibold truncate ${effective === 'locked' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
													{navText(tNav, `items.${page.nameKey}`)}
												</span>
												<span className="mt-0.5 flex flex-wrap items-center gap-1">
													<PageModeBadge mode={roleMode} label={t('user.roleMode', { mode: t(`modes.${roleMode}`) })} />
													{parentLocked && <span className="text-[10px] text-slate-400">{t('lockedWithParent')}</span>}
												</span>
											</span>
											{page.required ? (
												<span className="text-[10px] font-bold text-slate-400 shrink-0">{t('alwaysShown')}</span>
											) : (
												<ModeSegment
													ariaLabel={navText(tNav, `items.${page.nameKey}`)}
													options={overrideOptions}
													value={overrides[page.id] || ''}
													onChange={(value) => setOverride(page.id, value)}
													disabled={parentLocked}
												/>
											)}
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</div>
			</div>

			<div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
				<div className="flex items-start gap-2.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
					<span
						className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
						<LogIn size={14} />
					</span>
					<div className="min-w-0">
						<p className="text-xs font-bold text-slate-800 dark:text-slate-100">{t('user.landingTitle')}</p>
						<p className="text-[10px] text-slate-500">{t('user.landingHint')}</p>
					</div>
				</div>
				<div className="p-3">
					<select
						value={editor.landingPageId}
						onChange={(e) => editor.setLandingPageId(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
					>
						<option value="">
							{t('user.landingDefault', { path: resolvePostLoginPath({ role, pageAccess: { locked: editor.lockedIds } }) })}
						</option>
						{editor.landingChoices.map((page) => (
							<option key={page.id} value={page.id}>
								{navText(tNav, `items.${page.nameKey}`)} — {page.href}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}
