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
		<div
			className={`ai-reading-root min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}
			style={{
				background:
					'radial-gradient(1200px 600px at 10% -10%, rgba(45,74,62,0.12), transparent), radial-gradient(900px 500px at 100% 0%, rgba(180,120,60,0.08), transparent), #f6f1e8',
			}}
		>
			<header className="sticky top-0 z-40 border-b border-[#2d4a3e]/12 bg-[#f6f1e8]/90 backdrop-blur-md">
				<div className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 ${wide || isWorkspace ? 'max-w-[1400px]' : 'max-w-6xl'}`}>
					<Link href="/ai-studio" className="group flex items-center gap-3">
						<span
							className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg"
							style={{ background: 'linear-gradient(145deg, #1a2e28, #3d5a4c)' }}
						>
							<BookOpen size={18} />
						</span>
						<div>
							<p className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold tracking-tight text-[#1a2e28]">
								{t('brand')}
							</p>
							<p className="text-[11px] text-[#5c6b63]">{t('brandSub')}</p>
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
									className={`relative rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
										active ? 'text-[#1a2e28]' : 'text-[#5c6b63] hover:text-[#1a2e28]'
									}`}
								>
									{active && (
										<motion.span
											layoutId="ai-reading-nav"
											className="absolute inset-0 rounded-full bg-white/80 shadow-sm ring-1 ring-[#2d4a3e]/10"
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
									active ? 'bg-[#1a2e28] text-[#f6f1e8]' : 'bg-white/60 text-[#5c6b63]'
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
			<main className={`mx-auto px-4 py-6 ${wide || isWorkspace ? 'max-w-[1400px]' : 'max-w-6xl py-8'}`}>{children}</main>
		</div>
	);
}
