'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import {
	BookOpen,
	Sparkles,
	Import,
	Library,
	MessageSquareQuote,
	Flame,
	Dumbbell,
	Home,
	MessageSquare,
	Lightbulb,
	Route,
} from 'lucide-react';
import '@/lib/ai-reading/ai-reading-theme.css';

const NAV = [
	{ href: '/ai-studio', icon: Home, key: 'nav.home', exact: true },
	{ href: '/ai-studio/workspace', icon: MessageSquare, key: 'nav.workspace' },
	{ href: '/ai-studio/topics', icon: Lightbulb, key: 'nav.topics' },
	{ href: '/ai-studio/journeys', icon: Route, key: 'nav.journeys' },
	{ href: '/ai-studio/library', icon: Library, key: 'nav.library' },
	{ href: '/ai-studio/prompts', icon: MessageSquareQuote, key: 'nav.prompts' },
	{ href: '/ai-studio/generate', icon: Sparkles, key: 'nav.generate' },
	{ href: '/ai-studio/import', icon: Import, key: 'nav.import' },
	{ href: '/ai-studio/review', icon: Flame, key: 'nav.review' },
	{ href: '/ai-studio/fitness', icon: Dumbbell, key: 'nav.fitness' },
];

export default function ReadingShell({ children, bare = false, wide = false }) {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const pathname = usePathname();
	const isRTL = locale === 'ar';
	const isWorkspace = pathname.startsWith('/ai-studio/workspace');

	if (bare) {
		return (
			<div className={`ai-reading-root h-full min-h-0 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
				{children}
			</div>
		);
	}

	return (
		<div className={`ai-reading-root flex h-full min-h-0 flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
			<header className="sticky top-0 z-40 shrink-0 border-b bg-white/85 backdrop-blur-md" style={{ borderColor: 'var(--ar-border)' }}>
				<div className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 ${wide || isWorkspace ? 'max-w-[1400px]' : 'max-w-6xl'}`}>
					<Link href="/ai-studio" className="group flex items-center gap-3">
						<span
							className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg"
							style={{ background: 'linear-gradient(145deg, var(--color-gradient-from, var(--color-primary-700)), var(--color-gradient-to, var(--color-primary-500)))' }}
						>
							<BookOpen size={18} />
						</span>
						<div>
							<p className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold tracking-tight" style={{ color: 'var(--ar-heading)' }}>
								{t('brand')}
							</p>
							<p className="text-[11px]" style={{ color: 'var(--ar-muted)' }}>{t('brandSub')}</p>
						</div>
					</Link>
					<nav className="hidden items-center gap-0.5 xl:flex">
						{NAV.map(item => {
							const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									className="relative rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition"
									style={{ color: active ? 'var(--ar-heading)' : 'var(--ar-muted)' }}
								>
									{active && (
										<motion.span
											layoutId="ai-reading-nav"
											className="absolute inset-0 rounded-full bg-white/90 shadow-sm"
											style={{ boxShadow: 'inset 0 0 0 1px var(--ar-ring)' }}
											transition={{ type: 'spring', stiffness: 380, damping: 30 }}
										/>
									)}
									<span className="relative z-10 inline-flex items-center gap-1">
										<Icon size={12} />
										{t(item.key)}
									</span>
								</Link>
							);
						})}
					</nav>
				</div>
				<div className="flex gap-1 overflow-x-auto overscroll-x-contain px-3 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:hidden">
					{NAV.map(item => {
						const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ${
									active ? 'ar-chip-active' : 'ar-chip-idle'
								}`}
							>
								<span className="inline-flex items-center gap-1">
									<Icon size={12} />
									{t(item.key)}
								</span>
							</Link>
						);
					})}
				</div>
			</header>
			<main className={`mx-auto min-h-0 flex-1 overflow-y-auto px-4 py-6 ${wide || isWorkspace ? 'max-w-[1400px]' : 'max-w-6xl py-8'}`}>{children}</main>
		</div>
	);
}
