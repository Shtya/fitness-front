'use client';

import '@/components/projectmind/projectmind.css';
import { useTranslations } from 'next-intl';
import { BookOpen, BrainCircuit, CalendarDays, FileText, FolderGit2, LayoutDashboard, Settings, ShieldAlert, Target } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { ProjectMindProvider, useProjectMind } from '@/components/projectmind/ProjectMindContext';
import { StatusPill } from '@/components/projectmind/ui';
import { cn } from '@/lib/utils';

const TABS = [
	['', LayoutDashboard, 'dashboard'],
	['projects', FolderGit2, 'projects'],
	['explorer', FileText, 'explorer'],
	['docs', BookOpen, 'docs'],
	['chat', BrainCircuit, 'chat'],
	['meetings', CalendarDays, 'meetings'],
	['simulator', Target, 'simulator'],
	['gaps', ShieldAlert, 'gaps'],
	['settings', Settings, 'settings'],
];

function Bar() {
	const t = useTranslations('projectmind.nav');
	const pathname = usePathname();
	const { projects, project, setProjectId } = useProjectMind();
	return (
		<div className="pm-no-print mb-4 space-y-3">
			<div className="flex flex-wrap items-center gap-3">
				<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">ProjectMind</span>
				{projects.length > 0 ? (
					<>
						<label htmlFor="pm-project" className="sr-only">{t('project')}</label>
						<select id="pm-project" value={project?.id || ''} onChange={(e) => setProjectId(e.target.value)} className="h-8 max-w-[16rem] truncate rounded-md border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700">
							{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
						</select>
						{project ? <StatusPill status={project.status} /> : null}
					</>
				) : null}
			</div>
			<nav aria-label="ProjectMind" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
				{TABS.map(([seg, Icon, key]) => {
					const href = `/dashboard/projectmind${seg ? `/${seg}` : ''}`;
					const active = seg ? pathname.startsWith(href) : pathname === href || pathname.endsWith('/dashboard/projectmind');
					return (
						<Link key={key} href={href} aria-current={active ? 'page' : undefined} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800', active ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-800)] dark:bg-slate-800 dark:text-[var(--color-primary-300)]' : 'text-slate-600 dark:text-slate-300')}>
							<Icon className="size-4" aria-hidden /> {t(key)}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}

export default function ProjectMindLayout({ children }) {
	return (
		<ProjectMindProvider>
			<div className="pm-root mx-auto w-full max-w-[1500px] p-3 sm:p-5">
				<Bar />
				{children}
			</div>
		</ProjectMindProvider>
	);
}
