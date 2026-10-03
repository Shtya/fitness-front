'use client';

import { useEffect, useState } from 'react';
import { Activity, LayoutDashboard, Megaphone, MessageSquareText, Moon, Plus, Sun, Users } from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import { Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFbT } from './fb-i18n';
import { FbPortalContext, ghostButtonClass } from './fb-ui';

export const FB_BASE = '/dashboard/facebook-engagement';
const THEME_KEY = 'fb-engagement:theme';

const TABS = [
	{ href: FB_BASE, labelKey: 'navOverview', icon: LayoutDashboard, exact: true },
	{ href: `${FB_BASE}/campaigns`, labelKey: 'navCampaigns', icon: Megaphone },
	{ href: `${FB_BASE}/comments`, labelKey: 'navComments', icon: MessageSquareText },
	{ href: `${FB_BASE}/accounts`, labelKey: 'navAccounts', icon: Users },
	{ href: `${FB_BASE}/activity`, labelKey: 'navActivity', icon: Activity },
];

function useScopedTheme() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved === 'dark' || saved === 'light') {
			setDark(saved === 'dark');
			return undefined;
		}
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		setDark(media.matches);
		const onChange = (event) => setDark(event.matches);
		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	}, []);

	const toggle = () =>
		setDark((current) => {
			localStorage.setItem(THEME_KEY, current ? 'light' : 'dark');
			return !current;
		});

	return { dark, toggle };
}

export default function FbShell({ children }) {
	const t = useFbT();
	const pathname = usePathname();
	const { dark, toggle } = useScopedTheme();
	const [portalContainer, setPortalContainer] = useState(null);

	const isActive = (tab) => (tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`));
	const onWizard = pathname === `${FB_BASE}/campaigns/new`;

	return (
		<div className={cn('h-full min-h-0 overflow-hidden rounded-2xl', dark && 'dark')}>
			<div
				ref={setPortalContainer}
				className="h-full min-h-0 overflow-auto rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
			>
				<FbPortalContext.Provider value={portalContainer}>
					<header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
						<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
							<div className="flex min-w-0 items-center gap-3">
								<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1877F2] text-white shadow-sm">
									<FaFacebook className="size-5" aria-hidden />
								</span>
								<div className="min-w-0">
									<h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
										{t('appTitle')}
									</h1>
									<p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{t('appSubtitle')}</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Button
									size="icon"
									variant="ghost"
									className={ghostButtonClass}
									onClick={toggle}
									aria-label={dark ? t('lightMode') : t('darkMode')}
									title={dark ? t('lightMode') : t('darkMode')}
								>
									{dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
								</Button>
								{!onWizard && (
									<Button asChild>
										<Link href={`${FB_BASE}/campaigns/new`}>
											<Plus aria-hidden />
											{t('newCampaign')}
										</Link>
									</Button>
								)}
							</div>
						</div>
						<nav
							className="mx-auto mt-3 flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 [scrollbar-width:none]"
							aria-label={t('appTitle')}
						>
							{TABS.map((tab) => {
								const active = isActive(tab);
								const Icon = tab.icon;
								return (
									<Link
										key={tab.href}
										href={tab.href}
										aria-current={active ? 'page' : undefined}
										className={cn(
											'relative inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 pb-3 pt-2 text-[13px] font-medium transition-colors',
											active
												? 'text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]'
												: 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
										)}
									>
										<Icon className="size-4" aria-hidden />
										{t(tab.labelKey)}
										{active && (
											<span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-primary-600)] dark:bg-[var(--color-primary-400)]" />
										)}
									</Link>
								);
							})}
						</nav>
					</header>
					<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
				</FbPortalContext.Provider>
			</div>
		</div>
	);
}
