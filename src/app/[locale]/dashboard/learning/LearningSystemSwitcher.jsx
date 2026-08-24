'use client';

import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { Brain, Layers3 } from 'lucide-react';

const COPY = {
	en: {
		hub: 'Learning',
		management: 'Management',
		study: 'Study & Knowledge',
	},
	ar: {
		hub: 'التعلم',
		management: 'الإدارة',
		study: 'المذاكرة والمعرفة',
	},
};

export function LearningSystemSwitcher({ active = 'management' }) {
	const locale = useLocale();
	const t = COPY[locale?.startsWith('ar') ? 'ar' : 'en'];

	return (
		<nav
			aria-label="Learning systems"
			className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_1px_0_#eef0f2]"
		>
			<Link
				href="/dashboard/learning"
				className="rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-700"
			>
				{t.hub}
			</Link>
			<span className="text-slate-300" aria-hidden>
				/
			</span>
			<Link
				href="/dashboard/learning/management"
				className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition ${
					active === 'management'
						? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
						: 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
				}`}
			>
				<Layers3 size={14} />
				{t.management}
			</Link>
			<Link
				href="/dashboard/learning/study"
				className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition ${
					active === 'study'
						? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
						: 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
				}`}
			>
				<Brain size={14} />
				{t.study}
			</Link>
		</nav>
	);
}
