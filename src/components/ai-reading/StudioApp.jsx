'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { BookOpen, ChevronLeft, Home, Layers, Library, NotebookPen, Plus, Sparkles } from 'lucide-react';
import NotebookDrawer from '@/components/ai-reading/NotebookDrawer';
import ReadingHub from '@/components/ai-reading/ReadingHub';
import ImportPanel from '@/components/ai-reading/ImportPanel';
import DailyReview from '@/components/ai-reading/DailyReview';
import LibraryPanel from '@/components/ai-reading/LibraryPanel';
import PromptsPanel from '@/components/ai-reading/PromptsPanel';
import ReadingView from '@/components/ai-reading/ReadingView';
import { ReadingNavProvider } from '@/lib/ai-reading/reading-nav';
import { uiFontFamily } from '@/lib/ai-reading/fonts';
import { getBook, hydrateAiReadingStore, listBooks } from '@/lib/ai-reading/storage';
import { collectAllDue } from '@/lib/ai-reading/spaced-review';
import '@/lib/ai-reading/ai-reading-theme.css';
import '@/components/ai-reading/room/reading-room.css';

const TAB_IDS = ['home', 'library', 'import', 'review', 'prompts'];
const SHELL = 'mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8';

/**
 * The reading room: Home · Library · Import · Review · Prompts.
 * `embedded` runs it inside another page (the WhatsApp Reading tab): tabs live in local state
 * instead of the URL, and books open in place instead of navigating away.
 */
export default function StudioApp({ initialTab = 'home', embedded = false, onExit }) {
	const locale = useLocale();
	const ar = locale === 'ar';
	const L = (a, e) => (ar ? a : e);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [tab, setTab] = useState(TAB_IDS.includes(initialTab) ? initialTab : 'home');
	const [ready, setReady] = useState(false);
	const [notebookOpen, setNotebookOpen] = useState(false);
	const [openBook, setOpenBook] = useState(null);
	const [due, setDue] = useState(0);

	useEffect(() => {
		if (embedded) return undefined;
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, [embedded]);

	useEffect(() => {
		let alive = true;
		const finish = () => alive && setReady(true);
		hydrateAiReadingStore().then(finish, finish);
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		if (!ready) return undefined;
		const count = () => setDue(collectAllDue(listBooks()).length);
		count();
		window.addEventListener('ai-reading:changed', count);
		return () => window.removeEventListener('ai-reading:changed', count);
	}, [ready, tab]);

	useEffect(() => {
		if (embedded) return;
		const q = searchParams?.get('tab');
		// Old links (?tab=studio&sub=…) land on Home now that Studio is gone.
		if (q) setTab(TAB_IDS.includes(q) ? q : 'home');
	}, [embedded, searchParams]);

	const goTab = useCallback(
		id => {
			const next = TAB_IDS.includes(id) ? id : 'home';
			setTab(next);
			if (embedded) return;
			router.replace(next === 'home' ? '/ai-studio' : `/ai-studio?tab=${next}`, { scroll: false });
		},
		[embedded, router],
	);

	const openBookInPlace = useCallback(id => {
		const book = getBook(id);
		if (book) setOpenBook(book);
	}, []);

	const font = uiFontFamily(ar ? 'ar' : 'en');

	if (embedded && openBook) {
		return (
			<div className="ai-reading-root flex h-full min-h-0 flex-1 flex-col" style={{ fontFamily: font }}>
				<ReadingView key={openBook.id} book={openBook} onBack={() => setOpenBook(null)} />
			</div>
		);
	}

	const NAV = [
		{ id: 'home', Icon: Home, label: L('الرئيسية', 'Home') },
		{ id: 'library', Icon: Library, label: L('مكتبتي', 'Library') },
		{ id: 'import', Icon: Plus, label: L('إضافة', 'Add') },
		{ id: 'review', Icon: Layers, label: L('مراجعة', 'Review'), badge: due },
		{ id: 'prompts', Icon: Sparkles, label: L('Prompts', 'Prompts') },
	];

	const room = (
		<div
			className="ai-reading-root rr flex h-full min-h-0 flex-1 flex-col"
			dir={ar ? 'rtl' : 'ltr'}
			style={{ fontFamily: font, minHeight: embedded ? undefined : '100dvh' }}
		>
			<header className="z-30 shrink-0 border-b backdrop-blur-md" style={{ borderColor: 'var(--rr-line)', background: 'color-mix(in srgb, var(--rr-bg) 88%, transparent)' }}>
				<div className={`${SHELL} flex flex-wrap items-center gap-x-6 gap-y-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:flex-nowrap sm:py-3.5`}>
					<div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
						{onExit ? (
							/* Phones only: the WhatsApp tab bar is hidden in the room, this is the way out. */
							<button type="button" onClick={onExit} className="rr-icon-btn -ms-2 shrink-0 min-[769px]:hidden" aria-label={L('رجوع', 'Back')}>
								<ChevronLeft size={22} style={ar ? { transform: 'scaleX(-1)' } : undefined} />
							</button>
						) : null}
						<span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--rr-ink)', color: 'var(--rr-bg)' }}>
							<BookOpen size={17} strokeWidth={2} />
						</span>
						<span className="rr-serif truncate text-[18px] font-medium">{L('غرفة القراءة', 'Reading Room')}</span>
					</div>
					<div className="order-last w-full sm:order-none sm:flex sm:w-auto sm:flex-1 sm:justify-center">
						<nav className="rr-tabs flex w-full sm:inline-flex sm:w-auto" aria-label={L('أقسام غرفة القراءة', 'Reading room sections')}>
							{NAV.map(({ id, Icon, label, badge }) => {
								const active = tab === id;
								return (
									<button
										key={id}
										type="button"
										onClick={() => goTab(id)}
										aria-current={active ? 'page' : undefined}
										className="rr-tab flex-1 justify-center px-2.5 sm:flex-none sm:px-4"
									>
										{active && <motion.span layoutId={embedded ? 'rr-pill-embedded' : 'rr-pill'} className="rr-tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
										<Icon size={15} strokeWidth={2} className="hidden min-[400px]:block" />
										<span>{label}</span>
										{badge ? <span className="rr-tab-badge">{badge > 99 ? '99+' : badge}</span> : null}
									</button>
								);
							})}
						</nav>
					</div>
					<button type="button" onClick={() => setNotebookOpen(true)} className="rr-btn rr-btn-ghost rr-btn-sm shrink-0" aria-label={L('النوت بوك', 'Notebook')}>
						<NotebookPen size={16} />
						<span className="hidden md:inline">{L('النوت بوك', 'Notebook')}</span>
					</button>
				</div>
			</header>

			<main className="rr-main min-h-0 flex-1 overflow-y-auto overscroll-contain">
				<div className={`${SHELL} pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] pt-8 sm:pb-12 sm:pt-12`}>
					{!ready ? (
						<div className="space-y-6" aria-busy="true" aria-label={L('جاري التحميل', 'Loading')}>
							<div className="h-10 w-2/3 max-w-sm animate-pulse rounded-xl" style={{ background: 'var(--rr-sunken)' }} />
							<div className="h-48 animate-pulse rounded-2xl" style={{ background: 'var(--rr-sunken)' }} />
						</div>
					) : (
						<div key={tab} className="rr-enter">
							{tab === 'home' && <ReadingHub onNavigate={goTab} />}
							{tab === 'library' && <LibraryPanel />}
							{tab === 'import' && <ImportPanel />}
							{tab === 'review' && <DailyReview />}
							{tab === 'prompts' && <PromptsPanel />}
						</div>
					)}
				</div>
			</main>
			<NotebookDrawer open={notebookOpen} onClose={() => setNotebookOpen(false)} isRTL={ar} fontFamily={font} />
		</div>
	);

	return (
		<ReadingNavProvider openBook={embedded ? openBookInPlace : undefined} goTab={goTab}>
			{room}
		</ReadingNavProvider>
	);
}
