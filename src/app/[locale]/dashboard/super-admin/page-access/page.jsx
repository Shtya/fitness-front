'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { AlertCircle, RefreshCw, RotateCcw, Save, Search, Sliders } from 'lucide-react';
import api from '@/utils/axios';
import { getAllNavPages } from '@/components/molecules/Sidebar';
import { navText } from '@/components/page-access/UserPageAccessEditor';
import { DEFAULT_LOCKED_PAGE_IDS, MANAGED_PAGE_ROLES } from '@/lib/nav-access';
import '@/components/pages/dashboard/users/roster/roster.css';

const ROLES_QUERY_KEY = ['page-access', 'roles'];
const ROLES = MANAGED_PAGE_ROLES;
const GROUP_ORDER = ['main', 'management', 'content', 'workspace', 'outreach', 'tools', 'finance', 'account'];

/** Home and account pages a role cannot lose, or this screen would lock itself out. */
const ALWAYS_ON = {
	super_admin: new Set(['overview_superadmin', 'allUsers_super', 'pageAccess_super']),
	admin: new Set(['overview_admin', 'profile_admin']),
	coach: new Set(['profile_admin']),
	client: new Set(['overview_client', 'profile_client']),
};

function baselineShown(role, page) {
	if (ALWAYS_ON[role]?.has(page.id)) return true;
	if (!page.builtInRoles?.includes(role)) return false;
	if (role === 'super_admin') return true;
	if (page.defaultLocked || DEFAULT_LOCKED_PAGE_IDS.includes(page.id)) return false;
	return true;
}

function savedShown(role, page, savedRoles) {
	if (ALWAYS_ON[role]?.has(page.id)) return true;
	const mode = savedRoles?.[role]?.[page.id];
	if (mode === 'locked' || mode === 'optional') return false;
	if (mode === 'default') return true;
	return baselineShown(role, page);
}

function modesForRole(role, pages, shownOf) {
	const modes = {};
	for (const page of pages) {
		if (ALWAYS_ON[role]?.has(page.id)) continue;
		const shown = shownOf(role, page);
		if (shown !== baselineShown(role, page)) modes[page.id] = shown ? 'default' : 'locked';
	}
	return modes;
}

export default function PageAccessPage() {
	const t = useTranslations('pageAccess');
	const tNav = useTranslations('nav');
	const queryClient = useQueryClient();
	const [search, setSearch] = useState('');
	const [edits, setEdits] = useState({});

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const { data: savedRoles, isLoading, isError, refetch, isFetching } = useQuery({
		queryKey: ROLES_QUERY_KEY,
		queryFn: async () => (await api.get('/page-access/roles')).data?.roles || {},
	});

	const pages = useMemo(() => getAllNavPages(), []);
	const isDirty = Object.values(edits).some((roleEdits) => Object.keys(roleEdits || {}).length > 0);

	const shownOf = (role, page) => {
		if (ALWAYS_ON[role]?.has(page.id)) return true;
		if (edits[role] && Object.prototype.hasOwnProperty.call(edits[role], page.id)) return edits[role][page.id];
		return savedShown(role, page, savedRoles);
	};

	const toggle = (role, page) => {
		if (ALWAYS_ON[role]?.has(page.id)) return;
		const nextValue = !shownOf(role, page);
		setEdits((prev) => {
			const roleEdits = { ...(prev[role] || {}) };
			if (nextValue === savedShown(role, page, savedRoles)) delete roleEdits[page.id];
			else roleEdits[page.id] = nextValue;
			return { ...prev, [role]: roleEdits };
		});
	};

	const discard = () => setEdits({});

	const resetToDefaults = () => {
		const next = {};
		for (const role of ROLES) {
			next[role] = {};
			for (const page of pages) {
				if (ALWAYS_ON[role]?.has(page.id)) continue;
				const base = baselineShown(role, page);
				if (base !== savedShown(role, page, savedRoles)) next[role][page.id] = base;
			}
		}
		setEdits(next);
	};

	const saveMutation = useMutation({
		mutationFn: async () => {
			const results = await Promise.all(ROLES.map(async (role) => {
				const modes = modesForRole(role, pages, shownOf);
				const res = await api.put(`/page-access/roles/${role}`, { modes });
				return res.data;
			}));
			return results;
		},
		onSuccess: (results) => {
			queryClient.setQueryData(ROLES_QUERY_KEY, (prev) => {
				const next = { ...(prev || {}) };
				for (const res of results) next[res.role] = res.modes;
				return next;
			});
			setEdits({});
			toast.success(t('savedAll'));
		},
		onError: (error) => toast.error(error?.response?.data?.message || t('saveFailed')),
	});

	const sections = useMemo(() => {
		const q = search.trim().toLowerCase();
		const map = new Map();
		for (const page of pages) {
			const label = navText(tNav, `items.${page.nameKey}`);
			const href = page.href || '';
			if (q && !label.toLowerCase().includes(q) && !page.id.toLowerCase().includes(q) && !href.toLowerCase().includes(q)) continue;
			const key = page.group || 'workspace';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(page);
		}
		return [...map.entries()].sort((a, b) => {
			const ai = GROUP_ORDER.indexOf(a[0]);
			const bi = GROUP_ORDER.indexOf(b[0]);
			return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		});
	}, [pages, search, tNav]);

	const roleCounts = Object.fromEntries(ROLES.map((role) => [
		role,
		pages.filter((page) => shownOf(role, page)).length,
	]));

	return (
		<div className="gm-surface rs-scope app-stack pb-24">
			<header className="rs-hero">
				<span className="rs-hero__mark" aria-hidden>
					<Sliders strokeWidth={1.7} />
				</span>
				<div className="rs-hero__text">
					<h1 className="rs-hero__title">{t('title')}</h1>
					<p className="rs-hero__sub">{t('subtitle')}</p>
				</div>
				<button type="button" onClick={resetToDefaults} disabled={isLoading || isError} className="rs-btn" style={{ width: 'auto' }}>
					<RotateCcw className="size-4" />
					{t('resetDefaults')}
				</button>
			</header>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{ROLES.map((role) => (
					<div key={role} className="rounded-[20px] border border-[var(--gm-line)] bg-[var(--gm-paper)] px-4 py-3 shadow-[var(--gm-shadow-3d)]">
						<p className="text-[12px] font-semibold text-[var(--gm-muted)]">{t(`roles.${role}`)}</p>
						<p className="mt-1 text-[28px] font-bold leading-none tabular-nums text-[var(--gm-ink)]">{isLoading ? '—' : roleCounts[role]}</p>
						<p className="mt-1 text-[11px] text-[var(--gm-faint)]">{t('visibleCount', { total: pages.length })}</p>
					</div>
				))}
			</div>

			<div className="overflow-hidden rounded-[20px] border border-[var(--gm-line)] bg-[var(--gm-paper)] shadow-[var(--gm-shadow-3d)]">
				<div className="border-b border-[var(--gm-line)] p-3">
					<div className="relative">
						<Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[var(--gm-faint)]" />
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t('searchPlaceholder')}
							className="h-10 w-full rounded-xl border border-[var(--gm-line)] bg-[color-mix(in_srgb,var(--gm-muted)_6%,var(--gm-paper))] ps-9 pe-3 text-sm text-[var(--gm-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary-500)_35%,transparent)]"
						/>
					</div>
				</div>

				{isError ? (
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gm-line)] px-4 py-3">
						<p className="flex items-center gap-2 text-sm text-[var(--gm-ink-soft)]">
							<AlertCircle className="size-4 shrink-0 text-[var(--gm-danger)]" />
							{t('loadFailed')}
						</p>
						<button type="button" onClick={() => refetch()} className="rs-btn" style={{ width: 'auto' }}>
							<RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
							{t('retry')}
						</button>
					</div>
				) : null}

				{isLoading ? (
					<div className="space-y-2 p-4" aria-busy="true">
						{Array.from({ length: 6 }, (_, i) => (
							<div key={i} className="h-12 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--gm-muted)_12%,transparent)]" />
						))}
					</div>
				) : sections.length === 0 ? (
					<p className="px-4 py-14 text-center text-sm text-[var(--gm-muted)]">{t('noResults')}</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[720px] border-collapse text-sm">
							<thead>
								<tr className="border-b border-[var(--gm-line)] text-[12px] text-[var(--gm-muted)]">
									<th className="px-4 py-3 text-start font-semibold">{t('pageColumn')}</th>
									{ROLES.map((role) => (
										<th key={role} className="w-[108px] px-2 py-3 text-center font-semibold">{t(`roles.${role}`)}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{sections.map(([group, groupPages]) => (
									<SectionRows
										key={group}
										title={navText(tNav, `groups.${group}`) || navText(tNav, `sections.${group}`)}
										pages={groupPages}
										roles={ROLES}
										t={t}
										tNav={tNav}
										shownOf={shownOf}
										onToggle={toggle}
									/>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--gm-line)] bg-[color-mix(in_srgb,var(--gm-paper)_92%,transparent)] px-4 py-3 backdrop-blur">
				<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
					{isDirty ? <span className="me-auto text-[12px] font-medium text-[var(--gm-warn)]">{t('unsaved')}</span> : null}
					<button type="button" onClick={discard} disabled={!isDirty || saveMutation.isPending} className="rs-btn" style={{ width: 'auto' }}>
						{t('discard')}
					</button>
					<button type="button" onClick={() => saveMutation.mutate()} disabled={!isDirty || isLoading || isError || saveMutation.isPending} className="rs-cta" style={{ width: 'auto' }}>
						<Save className="size-4" />
						{t('save')}
					</button>
				</div>
			</div>
		</div>
	);
}

function SectionRows({ title, pages, roles, t, tNav, shownOf, onToggle }) {
	return (
		<>
			<tr className="bg-[color-mix(in_srgb,var(--gm-muted)_6%,var(--gm-paper))]">
				<td colSpan={roles.length + 1} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--gm-faint)]">
					{title}
				</td>
			</tr>
			{pages.map((page) => {
				const Icon = page.icon;
				const label = navText(tNav, `items.${page.nameKey}`);
				return (
					<tr key={page.id} className="border-b border-[var(--gm-line)] last:border-b-0">
						<td className="px-4 py-3">
							<div className="flex items-center gap-3">
								{Icon ? (
									<span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--gm-line)] text-[var(--color-primary-600)]">
										<Icon className="size-4" />
									</span>
								) : null}
								<div className="min-w-0">
									<p className="truncate font-semibold text-[var(--gm-ink)]">{label}</p>
									<p className="truncate text-[11px] text-[var(--gm-faint)]" dir="ltr">{page.href}</p>
								</div>
							</div>
						</td>
						{roles.map((role) => {
							const forced = ALWAYS_ON[role]?.has(page.id);
							const checked = shownOf(role, page);
							return (
								<td key={role} className="px-2 py-3 text-center">
									<input
										type="checkbox"
										checked={checked}
										disabled={forced}
										aria-label={t('toggleRole', { page: label, role: t(`roles.${role}`) })}
										title={forced ? t('alwaysShown') : t('toggleRole', { page: label, role: t(`roles.${role}`) })}
										onChange={() => onToggle(role, page)}
										className="size-4 accent-[var(--color-primary-600)] disabled:opacity-50"
									/>
								</td>
							);
						})}
					</tr>
				);
			})}
		</>
	);
}
