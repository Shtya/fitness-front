'use client';

import { BookOpen, Brain, ChevronRight, Layers3 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import './learning-landing.css';

const COPY = {
	en: {
		title: 'Learning',
		subtitle: 'Two systems. One knowledge base. Clear jobs for each.',
		managementTitle: 'Learning Management',
		managementGoal: 'Build & Manage What I Want To Learn',
		managementDesc:
			'Create courses, import JSON, organize modules, topics, tags, difficulty, and progress structure.',
		managementCta: 'Open management',
		studyTitle: 'Study & Knowledge',
		studyGoal: 'Study, note, prompt, and review what I learn',
		studyDesc:
			'Pick topics to study, write markdown notes, save AI prompts, track daily new/review, and keep your personal knowledge base.',
		studyCta: 'Start studying',
		shared: 'Both pages share the same courses and topics.',
	},
	ar: {
		title: 'التعلم',
		subtitle: 'نظامان منفصلان. قاعدة معرفة واحدة. لكل صفحة وظيفة واضحة.',
		managementTitle: 'إدارة التعلم',
		managementGoal: 'ابنِ ونظّم ما تريد أن تتعلمه',
		managementDesc:
			'أنشئ الكورسات، استورد JSON، نظّم الموديولات والموضوعات والوسوم والمستوى وهيكل التقدّم.',
		managementCta: 'افتح الإدارة',
		studyTitle: 'المذاكرة والمعرفة',
		studyGoal: 'ذاكر، دوّن، استخدم الـPrompts، وراجع ما تعلمته',
		studyDesc:
			'اختر موضوعًا للمذاكرة، اكتب ملاحظات Markdown، احفظ AI Prompts، تابع الجديد والمراجعة يوميًا، وابنِ قاعدة معرفتك.',
		studyCta: 'ابدأ المذاكرة',
		shared: 'الصفحتان تشتركان في نفس الكورسات والموضوعات.',
	},
};

export default function LearningHub() {
	const locale = useLocale();
	const t = COPY[locale?.startsWith('ar') ? 'ar' : 'en'];

	return (
		<div className="learning-landing space-y-6 pb-6">
			<div className="learning-landing__page">
				<header className="mb-2">
					<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
						Dashboard · Learning
					</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{t.title}</h1>
					<p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{t.subtitle}</p>
				</header>

				<div className="mt-6 grid gap-4 lg:grid-cols-2">
					<Link
						href="/dashboard/learning/management"
						className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_32px_rgba(79,70,229,0.12)]"
					>
						<div className="flex items-start justify-between gap-3">
							<span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
								<Layers3 size={22} />
							</span>
							<span className="grid size-8 place-items-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
								<ChevronRight size={16} />
							</span>
						</div>
						<h2 className="mt-5 text-xl font-black text-slate-900">{t.managementTitle}</h2>
						<p className="mt-1 text-sm font-bold text-indigo-600">{t.managementGoal}</p>
						<p className="mt-3 text-sm leading-6 text-slate-500">{t.managementDesc}</p>
						<span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-800">
							{t.managementCta}
							<ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
						</span>
					</Link>

					<Link
						href="/dashboard/learning/study"
						className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_32px_rgba(16,185,129,0.12)]"
					>
						<div className="flex items-start justify-between gap-3">
							<span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
								<Brain size={22} />
							</span>
							<span className="grid size-8 place-items-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
								<ChevronRight size={16} />
							</span>
						</div>
						<h2 className="mt-5 text-xl font-black text-slate-900">{t.studyTitle}</h2>
						<p className="mt-1 text-sm font-bold text-emerald-600">{t.studyGoal}</p>
						<p className="mt-3 text-sm leading-6 text-slate-500">{t.studyDesc}</p>
						<span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-800">
							{t.studyCta}
							<ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
						</span>
					</Link>
				</div>

				<p className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-400">
					<BookOpen size={14} />
					{t.shared}
				</p>
			</div>
		</div>
	);
}
