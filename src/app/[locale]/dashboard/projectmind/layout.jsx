'use client';

import '@/components/projectmind/projectmind.css';
import { useTranslations } from 'next-intl';
import { BookOpen, BrainCircuit, CalendarDays, ChevronsUpDown, FileCode2, FolderGit2, GitBranch, LayoutDashboard, Settings, ShieldAlert, Target } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { ProjectMindProvider, useProjectMind } from '@/components/projectmind/ProjectMindContext';
import { StatusDot } from '@/components/projectmind/ui';
import { cn } from '@/lib/utils';

/** Grouped so the bar reads as: look around · work with the code · prepare for people. */
const GROUPS = [
	[['', LayoutDashboard, 'dashboard'], ['chat', BrainCircuit, 'chat'], ['explorer', FileCode2, 'explorer'], ['docs', BookOpen, 'docs']],
	[['meetings', CalendarDays, 'meetings'], ['simulator', Target, 'simulator'], ['gaps', ShieldAlert, 'gaps']],
	[['projects', FolderGit2, 'projects'], ['settings', Settings, 'settings']],
];

function NavLink({ seg, Icon, k, pathname, t }) {
	const href = `/dashboard/projectmind${seg ? `/${seg}` : ''}`;
	const active = seg ? pathname.includes(`/dashboard/projectmind/${seg}`) : /\/dashboard\/projectmind\/?$/.test(pathname);
	return (
		<Link
			href={href}
			aria-current={active ? 'page' : undefined}
			title={t(k)}
			className={cn(
				'group relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] 2xl:px-3',
				active ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
			)}
		>
			<Icon className="size-4 shrink-0" aria-hidden />
			<span className="whitespace-nowrap">{t(k)}</span>
		</Link>
	);
}

function ProjectSwitcher() {
	const t = useTranslations('projectmind.nav');
	const { projects, project, setProjectId } = useProjectMind();
	if (!projects.length) return null;
	return (
		<label className="relative inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 py-1.5 ps-3 pe-8 text-sm shadow-sm backdrop-blur focus-within:ring-2 focus-within:ring-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-900/80">
			<span className="sr-only">{t('project')}</span>
			<StatusDot status={project?.status} />
			<select value={project?.id || ''} onChange={(e) => setProjectId(e.target.value)} className="min-w-0 max-w-[11rem] cursor-pointer appearance-none truncate bg-transparent font-semibold text-slate-900 outline-none sm:max-w-[16rem] dark:text-slate-50">
				{projects.map((p) => (
					<option key={p.id} value={p.id}>
						{p.name}
						{p.status !== 'ready' ? ` · ${p.status}` : ''}
					</option>
				))}
			</select>
			<ChevronsUpDown className="pointer-events-none absolute end-2.5 size-3.5 text-slate-400" aria-hidden />
		</label>
	);
}

function Bar() {
	const t = useTranslations('projectmind.nav');
	const pathname = usePathname();
	return (
		<header className="pm-no-print sticky top-0 z-30 -mx-3 mb-5 border-b border-slate-200/70 bg-white/75 px-3 py-2.5 backdrop-blur-xl sm:-mx-5 sm:px-5 dark:border-slate-800 dark:bg-slate-950/70">
			<div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2">
				<div className="flex items-center gap-2.5">
					<span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900" aria-hidden>
						<GitBranch className="size-4" />
					</span>
					<ProjectSwitcher />
				</div>
				<nav aria-label="ProjectMind" className="pm-scroll -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
					{GROUPS.map((g, gi) => (
						<div key={gi} className={cn('flex shrink-0 items-center gap-0.5', gi > 0 && 'ms-1.5 border-s border-slate-200 ps-2 dark:border-slate-700')}>
							{g.map(([seg, Icon, k]) => (
								<NavLink key={k} seg={seg} Icon={Icon} k={k} pathname={pathname} t={t} />
							))}
						</div>
					))}
				</nav>
			</div>
		</header>
	);
}

export default function ProjectMindLayout({ children }) {
	return (
		<ProjectMindProvider>
			<div className="pm-root mx-auto w-full max-w-[1500px] px-3 pb-8 sm:px-5">
				<Bar />
				{children}
			</div>
		</ProjectMindProvider>
	);
}
