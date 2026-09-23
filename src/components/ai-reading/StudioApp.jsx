'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
	BookOpen,
	Dumbbell,
	Flame,
	Import,
	Library,
	Lightbulb,
	MessageSquare,
	MessageSquareQuote,
	Home,
	Sparkles,
} from 'lucide-react';
import ReadingHub from '@/components/ai-reading/ReadingHub';
import AiWorkspace from '@/components/ai-reading/AiWorkspace';
import TopicLibrary from '@/components/ai-reading/TopicLibrary';
import PromptLibrary from '@/components/ai-reading/PromptLibrary';
import ImportPanel from '@/components/ai-reading/ImportPanel';
import DailyReview from '@/components/ai-reading/DailyReview';
import LibraryPanel from '@/components/ai-reading/LibraryPanel';
import GenerateForm from '@/components/ai-reading/GenerateForm';
import { uiFontFamily } from '@/lib/ai-reading/fonts';
import { hydrateAiReadingStore } from '@/lib/ai-reading/storage';

/** One shell width for every tab — no layout jump. */
const SHELL = 'mx-auto w-full max-w-6xl px-4';

const TABS = [
	{ id: 'home', icon: Home, key: 'nav.home' },
	{ id: 'studio', icon: MessageSquare, key: 'nav.studio', hasMenu: true },
	{ id: 'library', icon: Library, key: 'nav.library' },
	{ id: 'import', icon: Import, key: 'nav.import' },
	{ id: 'review', icon: Flame, key: 'nav.review' },
];

const STUDIO_SUB = [
	{ id: 'chat', key: 'studioSub.chat', icon: MessageSquare },
	{ id: 'topics', key: 'studioSub.topics', icon: Lightbulb },
	{ id: 'prompts', key: 'studioSub.prompts', icon: MessageSquareQuote },
	{ id: 'generate', key: 'studioSub.generate', icon: Sparkles },
];

export default function StudioApp({ initialTab = 'home' }) {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [tab, setTab] = useState(initialTab);
	const [studioSub, setStudioSub] = useState('chat');
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let alive = true;
		hydrateAiReadingStore()
			.then(() => {
				if (alive) setReady(true);
			})
			.catch(() => {
				if (alive) setReady(true);
			});
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		const q = searchParams?.get('tab');
		if (q && TABS.some(x => x.id === q)) setTab(q);
		const sub = searchParams?.get('sub');
		if (sub === 'journey') {
			setTab('studio');
			setStudioSub('topics');
		} else if (sub && STUDIO_SUB.some(x => x.id === sub)) {
			setTab('studio');
			setStudioSub(sub);
		}
	}, [searchParams]);

	const goTab = useCallback(
		(id, sub) => {
			setTab(id);
			const nextSub = id === 'studio' ? sub || studioSub || 'chat' : undefined;
			if (nextSub) setStudioSub(nextSub);
			const params = new URLSearchParams();
			if (id !== 'home') params.set('tab', id);
			if (id === 'studio' && nextSub && nextSub !== 'chat') params.set('sub', nextSub);
			const qs = params.toString();
			router.replace(qs ? `/ai-studio?${qs}` : '/ai-studio', { scroll: false });
		},
		[router, studioSub],
	);

	return (
		<div
			className={`ai-reading-root flex h-full min-h-0 flex-col ${locale === 'ar' ? 'rtl' : 'ltr'}`}
			style={{
				background:
					'radial-gradient(1100px 520px at 8% -8%, rgba(45,74,62,0.10), transparent), #f6f1e8',
				fontFamily: uiFontFamily(locale === 'ar' ? 'ar' : 'en'),
			}}
		>
			<header className="z-40 shrink-0 border-b border-[#2d4a3e]/10 bg-[#f6f1e8]/92 backdrop-blur-md">
				<div className={`${SHELL} flex items-center justify-between gap-2 py-2 sm:gap-3 sm:py-3`}>
					<div className="flex min-w-0 items-center gap-2 sm:gap-3">
						<span
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md sm:h-10 sm:w-10 sm:rounded-2xl"
							style={{ background: 'linear-gradient(145deg, #1a2e28, #3d5a4c)' }}
						>
							<BookOpen size={16} />
						</span>
						<div className="min-w-0">
							<p className="truncate font-[family-name:var(--font-space-grotesk)] text-[13px] font-bold text-[#1a2e28] sm:text-sm">
								{t('brand')}
							</p>
							<p className="hidden truncate text-[11px] text-[#5c6b63] sm:block">{t('brandSub')}</p>
						</div>
					</div>
					<Link
						href="/ai-studio/fitness"
						className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/70 p-2 text-[11px] font-semibold text-[#5c6b63] ring-1 ring-[#2d4a3e]/10 hover:text-[#1a2e28] sm:gap-1.5 sm:px-3 sm:py-1.5"
						aria-label={t('nav.fitness')}
						title={t('nav.fitness')}
					>
						<Dumbbell size={13} />
						<span className="hidden sm:inline">{t('nav.fitness')}</span>
					</Link>
				</div>

				<nav
					className={`${SHELL} flex gap-0.5 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1`}
				>
					{TABS.map(item => {
						const Icon = item.icon;
						const active = tab === item.id;
						const onClick = item.hasMenu ? () => goTab('studio', studioSub) : () => goTab(item.id);
						return (
							<button
								key={item.id}
								type="button"
								onClick={onClick}
								className={`relative shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3.5 sm:py-2 sm:text-xs ${
									active ? 'text-[#1a2e28]' : 'text-[#5c6b63] hover:text-[#1a2e28]'
								}`}
							>
								{active && (
									<motion.span
										layoutId="studio-main-tab"
										className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-[#2d4a3e]/10"
										transition={{ type: 'spring', stiffness: 400, damping: 32 }}
									/>
								)}
								<span className="relative z-10 inline-flex items-center gap-1 sm:gap-1.5">
									<Icon size={12} />
									{t(item.key)}
								</span>
							</button>
						);
					})}
				</nav>

				{tab === 'studio' && (
					<div
						className={`${SHELL} flex gap-1 overflow-x-auto overscroll-x-contain pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pb-3`}
					>
						{STUDIO_SUB.map(s => {
							const SubIcon = s.icon;
							const subActive = studioSub === s.id;
							return (
								<button
									key={s.id}
									type="button"
									onClick={() => goTab('studio', s.id)}
									className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-[11px] ${
										subActive
											? 'bg-[#1a2e28] text-[#f6f1e8]'
											: 'bg-white/70 text-[#5c6b63] ring-1 ring-[#2d4a3e]/10 hover:text-[#1a2e28]'
									}`}
								>
									<SubIcon size={11} />
									{t(s.key)}
								</button>
							);
						})}
					</div>
				)}
			</header>

			<main className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className={`${SHELL} py-4 sm:py-6`}>
					{!ready ? (
						<p className="py-16 text-center text-sm text-[#5c6b63]">{t('common.loading')}</p>
					) : (
					<AnimatePresence mode="wait">
						<motion.div
							key={`${tab}-${studioSub}`}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={{ duration: 0.2 }}
						>
							{tab === 'home' && <ReadingHub compact onNavigate={goTab} />}
							{tab === 'studio' && (
								<div>
									{studioSub === 'chat' && <AiWorkspace embedded />}
									{studioSub === 'topics' && <TopicLibrary />}
									{studioSub === 'prompts' && <PromptLibrary />}
									{studioSub === 'generate' && <GenerateForm />}
								</div>
							)}
							{tab === 'library' && <LibraryPanel />}
							{tab === 'import' && <ImportPanel />}
							{tab === 'review' && <DailyReview />}
						</motion.div>
					</AnimatePresence>
					)}
				</div>
			</main>
		</div>
	);
}
