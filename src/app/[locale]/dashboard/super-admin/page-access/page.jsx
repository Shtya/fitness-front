'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { AlertCircle, LayoutGrid, RefreshCw, RotateCcw, Save, Search, Sliders } from 'lucide-react';
import api from '@/utils/axios';
import { getNavPagesForRole } from '@/components/molecules/Sidebar';
import { ModeSegment, PAGE_MODE_UI, PageModeBadge, navText } from '@/components/page-access/UserPageAccessEditor';
import { MANAGED_PAGE_ROLES, PAGE_MODES, codePageMode } from '@/lib/nav-access';

const ROLES_QUERY_KEY = ['page-access', 'roles'];

/** Sub-pages have no Marketplace entry of their own: shown or locked only. */
function allowedModes(page) {
	return page.parentId ? ['default', 'locked'] : PAGE_MODES;
}

function fitMode(page, mode) {
	return allowedModes(page).includes(mode) ? mode : 'default';
}

function defaultMode(page) {
	return fitMode(page, codePageMode(page));
}

export default function PageAccessPage() {
	const t = useTranslations('pageAccess');
	const tNav = useTranslations('nav');
	const queryClient = useQueryClient();
	const [role, setRole] = useState(MANAGED_PAGE_ROLES[0]);
	const [search, setSearch] = useState('');
	const [edits, setEdits] = useState({});

	const { data: savedRoles, isLoading, isError, refetch, isFetching } = useQuery({
		queryKey: ROLES_QUERY_KEY,
		queryFn: async () => (await api.get('/page-access/roles')).data?.roles || {},
	});

	const pages = useMemo(() => getNavPagesForRole(role), [role]);
	const roleEdits = edits[role] || {};
	const isDirty = (r) => Object.keys(edits[r] || {}).length > 0;

	const savedMode = (page) => (page.required ? 'default' : fitMode(page, savedRoles?.[role]?.[page.id] ?? codePageMode(page)));
	const modeOf = (page) => roleEdits[page.id] ?? savedMode(page);
	const parentLocked = (page) => {
		if (!page.parentId) return false;
		const parent = pages.find((p) => p.id === page.parentId);
		return !!parent && modeOf(parent) === 'locked';
	};

	const setMode = (page, mode) => {
		setEdits((prev) => {
			const next = { ...(prev[role] || {}) };
			if (mode === savedMode(page)) delete next[page.id];
			else next[page.id] = mode;
			return { ...prev, [role]: next };
		});
	};

	const resetToDefaults = () => {
		const next = {};
		for (const page of pages) {
			if (!page.required && defaultMode(page) !== savedMode(page)) next[page.id] = defaultMode(page);
		}
		setEdits((prev) => ({ ...prev, [role]: next }));
	};

	const discard = () => setEdits((prev) => ({ ...prev, [role]: {} }));

	const saveMutation = useMutation({
		mutationFn: async ({ targetRole, modes }) => (await api.put(`/page-access/roles/${targetRole}`, { modes })).data,
		onSuccess: (res) => {
			queryClient.setQueryData(ROLES_QUERY_KEY, (prev) => ({ ...(prev || {}), [res.role]: res.modes }));
			setEdits((prev) => ({ ...prev, [res.role]: {} }));
			toast.success(t('saved', { role: t(`roles.${res.role}`) }));
		},
		onError: (error) => toast.error(error?.response?.data?.message || t('saveFailed')),
	});

	const save = () => {
		const modes = {};
		for (const page of pages) {
			const mode = modeOf(page);
			if (!page.required && mode !== defaultMode(page)) modes[page.id] = mode;
		}
		saveMutation.mutate({ targetRole: role, modes });
	};

	const counts = PAGE_MODES.reduce((acc, mode) => ({ ...acc, [mode]: pages.filter((p) => modeOf(p) === mode).length }), {});

	const sections = useMemo(() => {
		const q = search.trim().toLowerCase();
		const map = new Map();
		for (const page of pages) {
			const label = navText(tNav, `items.${page.nameKey}`);
			if (q && !label.toLowerCase().includes(q) && !page.id.toLowerCase().includes(q)) continue;
			const key = page.sectionKey || 'sections.main';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(page);
		}
		return [...map.entries()];
	}, [pages, search, tNav]);

	const modeOptions = (page) =>
		allowedModes(page).map((mode) => ({
			value: mode,
			label: t(`modes.${mode}`),
			icon: PAGE_MODE_UI[mode].icon,
			active: PAGE_MODE_UI[mode].active,
		}));

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] p-4 md:p-6 pb-28">
			<div className="mx-auto max-w-5xl space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3 min-w-0">
						<span
							className="w-11 h-11 rounded-xl grid place-items-center text-white shadow-lg shrink-0"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<Sliders size={20} />
						</span>
						<div className="min-w-0">
							<h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100">{t('title')}</h1>
							<p className="mt-0.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{t('subtitle')}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={resetToDefaults}
						disabled={isLoading || isError}
						className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 shrink-0"
					>
						<RotateCcw size={13} />
						{t('resetDefaults')}
					</button>
				</header>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{PAGE_MODES.map((mode) => (
						<div key={mode} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<PageModeBadge mode={mode} label={t(`modes.${mode}`)} />
								<span className="text-lg font-black tabular-nums text-slate-900 dark:text-slate-100">{isLoading ? '—' : counts[mode]}</span>
							</div>
							<p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{t(`modeHints.${mode}`)}</p>
						</div>
					))}
				</div>

				<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden">
					<div className="flex flex-col gap-2.5 p-3 border-b border-slate-100 dark:border-slate-800 sm:flex-row sm:items-center">
						<div role="tablist" aria-label={t('title')} className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
							{MANAGED_PAGE_ROLES.map((r) => (
								<button
									key={r}
									type="button"
									role="tab"
									aria-selected={r === role}
									onClick={() => setRole(r)}
									className={`relative h-8 px-4 rounded-md text-xs font-bold transition-colors ${
										r === role
											? 'bg-white dark:bg-slate-900 text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] shadow-sm'
											: 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
									}`}
								>
									{t(`roles.${r}`)}
									{isDirty(r) && <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-amber-500" aria-label={t('unsaved')} />}
								</button>
							))}
						</div>
						<div className="relative flex-1">
							<Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder={t('searchPlaceholder')}
								className="w-full h-9 ps-9 pe-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]"
							/>
						</div>
					</div>

					{isLoading ? (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-busy="true">
							{Array.from({ length: 6 }, (_, i) => (
								<li key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
									<span className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
									<span className="flex-1 space-y-1.5">
										<span className="block h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
										<span className="block h-2.5 w-64 max-w-full rounded bg-slate-100 dark:bg-slate-800/70" />
									</span>
									<span className="h-8 w-44 rounded-lg bg-slate-100 dark:bg-slate-800" />
								</li>
							))}
						</ul>
					) : isError ? (
						<div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
							<AlertCircle size={28} className="text-rose-500" />
							<p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('loadFailed')}</p>
							<button
								type="button"
								onClick={() => refetch()}
								className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
							>
								<RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
								{t('retry')}
							</button>
						</div>
					) : !sections.length ? (
						<div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
							<LayoutGrid size={26} className="text-slate-300" />
							<p className="text-sm text-slate-500">{pages.length ? t('noResults') : t('noPages')}</p>
						</div>
					) : (
						sections.map(([sectionKey, items]) => (
							<section key={sectionKey} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
								<h2 className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
									{navText(tNav, sectionKey)}
								</h2>
								<ul className="divide-y divide-slate-100 dark:divide-slate-800">
									{items.map((page) => {
										const Icon = page.icon || LayoutGrid;
										const mode = modeOf(page);
										const lockedByParent = parentLocked(page);
										const label = navText(tNav, `items.${page.nameKey}`);
										const description = page.descKey && tNav.has(page.descKey) ? tNav(page.descKey) : '';
										return (
											<li
												key={page.id}
												className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 ${page.parentId ? 'sm:ps-12' : ''} ${
													mode === 'locked' || lockedByParent ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
												}`}
											>
												<div className="flex items-center gap-3 min-w-0 flex-1">
													<span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 border ${PAGE_MODE_UI[lockedByParent ? 'locked' : mode].badge}`}>
														<Icon size={15} />
													</span>
													<div className="min-w-0">
														<p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
															<span className="truncate">{label}</span>
															{roleEdits[page.id] && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-label={t('unsaved')} />}
															{!page.required && mode !== defaultMode(page) && (
																<span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-950)]/40 dark:text-[var(--color-primary-300)]">
																	{t('custom')}
																</span>
															)}
														</p>
														<p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
															{lockedByParent ? t('lockedWithParent') : description || page.href}
														</p>
													</div>
												</div>
												{page.required ? (
													<span className="self-start sm:self-auto text-[11px] font-bold text-slate-400 shrink-0">{t('alwaysShown')}</span>
												) : (
													<ModeSegment
														ariaLabel={label}
														options={modeOptions(page)}
														value={mode}
														onChange={(value) => setMode(page, value)}
														disabled={lockedByParent || saveMutation.isPending}
													/>
												)}
											</li>
										);
									})}
								</ul>
							</section>
						))
					)}
				</div>
			</div>

			{isDirty(role) && (
				<div className="fixed inset-x-0 bottom-4 z-40 px-4">
					<div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-3 shadow-2xl">
						<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
						<p className="flex-1 min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
							{t('unsaved')} — {t(`roles.${role}`)}
						</p>
						<button
							type="button"
							onClick={discard}
							disabled={saveMutation.isPending}
							className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50"
						>
							{t('discard')}
						</button>
						<button
							type="button"
							onClick={save}
							disabled={saveMutation.isPending}
							className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-white text-xs font-bold shadow-lg disabled:opacity-60"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							{saveMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
							{t('save')}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
