'use client';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from '../../context/GlobalContext';
import { usePathname } from '../../i18n/navigation';
import ConfigAos from '@/config/Aos';
import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useUser } from '@/hooks/useUser';
import { usePageAccessSync } from '@/hooks/usePageAccessSync';
import { useTranslations } from 'next-intl';
import Providers from '@/context/ReactQuery';
import Link from 'next/link';
import { ThemeProvider } from '@/app/[locale]/theme';
import { TenantThemeProvider } from '@/lib/tenant/TenantThemeProvider';
import { useInitialRoleRedirect } from '@/hooks/useInitialRoleRedirect';
import Header from './Header';
import LastRouteTracker from './LastRouteTracker';
import LastRouteRestorer from './LastRouteRestorer';
import { useRouter, useParams } from 'next/navigation';
import { ChevronDown, ChevronUp, LogIn, LogOut, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { IMPERSONATION_EVENT, notifyImpersonationChanged } from '@/lib/impersonation';
import { setStoredUser } from '@/app/role-access';
import { initDashboardBackground } from '@/lib/dashboard-background';
import { SidebarChromeProvider } from './SidebarChromeContext';
import ClientFloatingBar from './ClientFloatingBar';
import './sidebar-glass.css';

const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });
const QuranMiniPlayer = dynamic(() => import('./QuranMiniPlayer'), { ssr: false });

const LS_KEY = 'sidebar:collapsed';
const LS_OFFSET_KEY = 'sidebar:offset';

// ─────────────────────────────────────────────────────────────────────────────
// ImpersonationBar
// ─────────────────────────────────────────────────────────────────────────────

const IMPERSONATION_COLLAPSED_KEY = 'impersonation-bar:collapsed';

function useImpersonationCollapsed() {
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		try {
			setCollapsed(localStorage.getItem(IMPERSONATION_COLLAPSED_KEY) === '1');
		} catch {}
	}, []);

	const update = useCallback(next => {
		setCollapsed(next);
		try {
			localStorage.setItem(IMPERSONATION_COLLAPSED_KEY, next ? '1' : '0');
		} catch {}
	}, []);

	return [collapsed, update];
}

function ImpersonationBar({ onExit, collapsed, onCollapsedChange: toggleCollapsed }) {
	const [user, setUser] = useState(null);

	useEffect(() => {
		const read = () => {
			try {
				setUser(JSON.parse(localStorage.getItem('impersonated_user') || 'null'));
			} catch {
				setUser(null);
			}
		};
		read();
		window.addEventListener(IMPERSONATION_EVENT, read);
		window.addEventListener('storage', read);
		return () => {
			window.removeEventListener(IMPERSONATION_EVENT, read);
			window.removeEventListener('storage', read);
		};
	}, []);

	if (!user) return null;

	const gradient =
		'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via, var(--color-gradient-from)), var(--color-gradient-to))';

	return (
		<div
			className="pointer-events-none fixed inset-x-0 top-0 z-[200000] flex justify-center"
			role="status"
			aria-live="polite"
		>
			<AnimatePresence mode="wait" initial={false}>
				{collapsed ? (
					<motion.button
						key="tab"
						type="button"
						onClick={() => toggleCollapsed(false)}
						initial={{ y: -24, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -24, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 380, damping: 30 }}
						className="pointer-events-auto inline-flex items-center gap-1.5 rounded-b-xl px-3 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] text-white opacity-80 shadow-md transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
						style={{ background: gradient }}
						title={`Viewing as ${user.name}`}
						aria-label={`Viewing as ${user.name}. Show impersonation bar`}
					>
						<Shield size={12} />
						<ChevronDown size={14} />
					</motion.button>
				) : (
					<motion.div
						key="pill"
						initial={{ y: -40, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -40, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 320, damping: 28 }}
						className="pointer-events-auto mx-2 mt-[max(0.5rem,env(safe-area-inset-top))] flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-2xl py-1.5 pe-1.5 ps-2 text-white shadow-lg ring-1 ring-white/20"
						style={{ background: gradient }}
					>
						<div className="shrink-0 rounded-lg bg-white/20 p-1.5">
							<Shield size={13} />
						</div>
						<div className="min-w-0">
							<p className="mb-0.5 text-[9px] font-bold uppercase leading-none tracking-widest opacity-80">
								Viewing as
							</p>
							<p className="max-w-[40vw] truncate text-xs font-black leading-tight sm:max-w-88">
								{user.name}
								<span className="ms-1.5 hidden font-normal opacity-75 md:inline">({user.email})</span>
							</p>
						</div>
						<button
							type="button"
							onClick={onExit}
							className="ms-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-colors hover:bg-white/95"
						>
							<LogOut size={12} />
							<span className="hidden sm:inline">Return to Super Admin</span>
							<span className="sm:hidden">Exit</span>
						</button>
						<button
							type="button"
							onClick={() => toggleCollapsed(true)}
							className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
							title="Hide"
							aria-label="Hide impersonation bar"
						>
							<ChevronUp size={15} />
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────
export default function Layout({ children }) {
	const [focusMode, setFocusMode] = useState(false);

	const pathname = usePathname();
	const router   = useRouter();
	const params   = useParams();
	const locale   = params?.locale || 'en';

	// useInitialRoleRedirect();
	const t = useTranslations('mobile');
	const [role, setRole]       = useState('user');
	const [isMobile, setIsMobile] = useState(false);
	const [isImpersonating, setIsImpersonating] = useState(false);
	const [impersonationCollapsed, setImpersonationCollapsed] = useImpersonationCollapsed();

	// Detect impersonation (same-tab nav won't fire `storage` — listen to custom event + route)
	useEffect(() => {
		const check = () => setIsImpersonating(!!localStorage.getItem('super_admin_prev_session'));
		check();
		window.addEventListener('storage', check);
		window.addEventListener(IMPERSONATION_EVENT, check);
		return () => {
			window.removeEventListener('storage', check);
			window.removeEventListener(IMPERSONATION_EVENT, check);
		};
	}, [pathname]);

	// ── Exit impersonation ──────────────────────────────────────────────────
	const handleExitImpersonation = useCallback(async () => {
		const raw = localStorage.getItem('super_admin_prev_session');
		if (!raw) return;
		try {
			const prev = JSON.parse(raw);
			localStorage.setItem('accessToken',  prev.accessToken);
			localStorage.setItem('refreshToken', prev.refreshToken);
			setStoredUser(typeof prev.user === 'string' ? JSON.parse(prev.user) : prev.user);
			localStorage.removeItem('impersonated_user');
			localStorage.removeItem('super_admin_prev_session');
			notifyImpersonationChanged();

			await fetch('/api/auth/login', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({
					accessToken:  prev.accessToken,
					refreshToken: prev.refreshToken,
					user:         JSON.parse(prev.user),
				}),
			});

			toast.success('Returned to super admin');
			setIsImpersonating(false);
			router.push(`/${locale}/dashboard/super-admin/users`);
			router.refresh?.();
		} catch {
			toast.error('Failed to restore session');
		}
	}, [router, locale]);

	useEffect(() => {
		const update = () => setIsMobile(window.innerWidth < 1168);
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);

	useEffect(() => {
		if (
			process.env.NODE_ENV !== 'development' ||
			!('serviceWorker' in navigator)
		) {
			return;
		}

		// Never let a production Workbox worker control the Next.js dev server.
		const wasControlled = Boolean(navigator.serviceWorker.controller);
		void navigator.serviceWorker
			.getRegistrations()
			.then(registrations =>
				Promise.all(registrations.map(registration => registration.unregister())),
			)
			.then(() => {
				const cleanupKey = 'pwa:development-worker-cleaned';
				if (wasControlled && !window.sessionStorage.getItem(cleanupKey)) {
					window.sessionStorage.setItem(cleanupKey, '1');
					window.location.reload();
				}
			})
			.catch(() => undefined);

		if ('caches' in window) {
			void caches
				.keys()
				.then(keys =>
					Promise.all(
						keys
							.filter(key => key.startsWith('workbox-') || key.includes('next-pwa'))
							.map(key => caches.delete(key)),
					),
				)
				.catch(() => undefined);
		}
	}, []);

	const user = useUser();
	usePageAccessSync(user?.id);
	const userReady = user !== undefined;
	const userId = user?.id;
	useEffect(() => {
		if (!userReady) return;
		void initDashboardBackground(userId);
	}, [userReady, userId]);
	useEffect(() => {
		if (user) {
			try { setRole(user?.role); } catch {}
		}
	}, [user]);

	const isAdminOrCoach = role === 'admin' || role === 'coach';
	const isFormRoute = (
		pathname.startsWith('/auth') ||
		pathname.startsWith('/thank-you') ||
		pathname.startsWith('/form') ||
		pathname.startsWith('/open') ||
		pathname === '/' ||
		pathname === '/money' ||
		pathname.startsWith('/workspace') ||
		pathname.includes('/dashboard/builder/preview')
	);
	const blockFormOnMobile = !isFormRoute && isMobile && isAdminOrCoach;

	const isAuthRoute =
		pathname.includes('dashboard/templates') ||
		pathname.startsWith('/workouts/plans') ||
		pathname.startsWith('/auth') ||
		pathname.startsWith('/form') ||
		pathname.startsWith('/clients') ||
		pathname.startsWith('/presentation') ||
		pathname.startsWith('/thank-you') ||
		pathname.startsWith('/site') ||
		pathname.startsWith('/open') ||
		pathname.startsWith('/particle-playground') ||
		pathname === '/';
	const userPending = user === undefined;
	const isClientShell = user?.role === 'client' && !isAuthRoute;
	const showStaffChrome = !isAuthRoute && !isClientShell && !userPending;
	const isPresentationRoute = pathname.startsWith('/presentation');
	/** Login / discover / open / particle studio: full-bleed viewport, no dashboard chrome */
	const isBareViewport =
		pathname.startsWith('/auth') ||
		pathname.startsWith('/open') ||
		pathname.startsWith('/particle-playground') ||
		pathname.startsWith('/d/');
	const isWhatsAppRoute = pathname.includes('/dashboard/whatsapp');
	const isMetaWhatsAppRoute = pathname.includes('/dashboard/meta-whatsapp');
	const isChatRoute = pathname.includes('/dashboard/chat');
	const isAiFreeRoute = pathname.includes('/dashboard/ai-free');
	const isAiContentStudioRoute = pathname.includes('/dashboard/ai-content-studio');
	const isGoldIntelligenceRoute = pathname.includes('/dashboard/gold-intelligence');
	const isAiStudioRoute = pathname.startsWith('/ai-studio');
	const isImmersiveRoute =
		isWhatsAppRoute ||
		isMetaWhatsAppRoute ||
		isChatRoute ||
		isAiFreeRoute ||
		isAiContentStudioRoute ||
		isGoldIntelligenceRoute ||
		isAiStudioRoute;
	/** Dashboard shell (sidebar/header): lock viewport to one scroll surface */
	const isAppShell = !isAuthRoute;

	const [sidebarOpen, setSidebarOpen]         = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	useEffect(() => { setSidebarOpen(false); }, [pathname]);
	/* Track mobile drawer open state (overlay mode — page does not slide) */
	useEffect(() => {
		const root = document.documentElement;
		if (sidebarOpen) root.setAttribute('data-sidebar-open', '1');
		else root.removeAttribute('data-sidebar-open');
		return () => root.removeAttribute('data-sidebar-open');
	}, [sidebarOpen]);

	/* One document lock: app shell / bare auth / presentation / open drawer */
	useEffect(() => {
		const lock = isAppShell || isBareViewport || isPresentationRoute || sidebarOpen;
		const prevHtml = document.documentElement.style.overflow;
		const prevBody = document.body.style.overflow;
		if (lock) {
			/* Lock scroll on the documentElement only — body overflow:hidden
			   clips position:fixed portals (Quran dock) on iOS Safari/PWA. */
			document.documentElement.style.overflow = 'hidden';
			document.body.style.overflow = '';
		} else {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
		}
		return () => {
			document.documentElement.style.overflow = prevHtml;
			document.body.style.overflow = prevBody;
		};
	}, [isAppShell, isBareViewport, isPresentationRoute, sidebarOpen]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (raw === '1') setSidebarCollapsed(true);
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(LS_KEY, sidebarCollapsed ? '1' : '0');
		} catch {}
	}, [sidebarCollapsed]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(LS_OFFSET_KEY);
			if (raw == null) return;
			setFocusMode(JSON.parse(raw) === true);
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(LS_OFFSET_KEY, JSON.stringify(!!focusMode));
		} catch {}
	}, [focusMode]);

	/* WhatsApp is a dedicated full-bleed surface: hide app sidebar by default. */
	useEffect(() => {
		if (!isWhatsAppRoute) return;
		setFocusMode(true);
	}, [isWhatsAppRoute]);

	const sidebarChromeValue = {
		focusMode,
		setFocusMode,
		hideEdgeDock: isWhatsAppRoute,
		openSidebar: () => setSidebarOpen(true),
	};

	// ── Mobile block screen ─────────────────────────────────────────────────
	// if (blockFormOnMobile) {
	// 	return (
	// 		<GlobalProvider>
	// 			<ThemeProvider>
	// 				<motion.div
	// 					className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
	// 					initial={{ opacity: 0 }}
	// 					animate={{ opacity: 1 }}
	// 					exit={{ opacity: 0 }}
	// 				>
	// 					{/* Animated background */}
	// 					<div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
	// 					<div
	// 						className="absolute inset-0 opacity-[0.03]"
	// 						style={{
	// 							backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-primary-400) 1px, transparent 0)`,
	// 							backgroundSize: '40px 40px',
	// 						}}
	// 					/>

	// 					<div
	// 						className="max-w-md w-full rounded-lg border-2 p-8 shadow-2xl bg-white/80 backdrop-blur-xl relative z-10"
	// 						style={{ borderColor: 'var(--color-primary-200)' }}
	// 					>
	// 						<div className="text-center">
	// 							<div
	// 								className="w-20 h-20 mx-auto mb-6 rounded-lg grid place-items-center text-white shadow-xl"
	// 								style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
	// 							>
	// 								<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	// 									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
	// 								</svg>
	// 							</div>
	// 							<h1 className="text-2xl font-black mb-3" style={{ color: 'var(--color-primary-900)' }}>
	// 								{t('desktop_required_title')}
	// 							</h1>
	// 							<p className="text-slate-600 mb-6 text-sm md: leading-relaxed">
	// 								{t('desktop_required_message')}
	// 							</p>
	// 							<Link
	// 								className="inline-flex items-center justify-center h-12 px-6 rounded-lg font-bold text-white shadow-lg transition-all hover:shadow-xl"
	// 								href={'/auth'}
	// 								style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
	// 							>
	// 								{t('reload_button')}
	// 							</Link>
	// 						</div>
	// 					</div>
	// 				</motion.div>
	// 				<ConfigAos />
	// 				<Toaster position="top-center" />
	// 			</ThemeProvider>
	// 		</GlobalProvider>
	// 	);
	// }

	// ── Main layout ─────────────────────────────────────────────────────────
 
	return (
		<GlobalProvider>
			<Providers>
				<TenantThemeProvider>
				<ThemeProvider>
				<SidebarChromeProvider value={sidebarChromeValue}>
					{isBareViewport ? (
					<div className="relative h-dvh w-full overflow-hidden bg-transparent">
						{children}
					</div>
					) : (
					<div className={`${isAppShell || isPresentationRoute ? 'relative h-dvh overflow-hidden' : 'relative min-h-screen'} ${isAppShell ? 'dashboard-icy' : ''}`}>
						{isAppShell ? null : (
							<>
								<div className="ai-shell-bg fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
								<div className="fixed inset-0 -z-10 opacity-[0.015]" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-primary-500) 1px, transparent 0)`, backgroundSize: '32px 32px', }} />
								<div className="fixed top-0 right-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl" style={{ background: `radial-gradient(circle, var(--color-primary-200), transparent 70%)` }} />
								<div className="fixed bottom-0 left-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl" style={{ background: `radial-gradient(circle, var(--color-secondary-200), transparent 70%)` }} />
							</>
						)}

						<div className={`flex w-full max-w-[100vw] overflow-hidden ${isAppShell || isPresentationRoute ? 'h-full' : ''}`}>
							{showStaffChrome && (
								<div
									className={`duration-300 ${sidebarOpen ? 'relative z-[120000]' : 'relative z-[100]'} ${focusMode ? 'w-0 overflow-visible' : ''}`}
								>
									<Sidebar
										open={sidebarOpen}
										setOpen={setSidebarOpen}
										collapsed={sidebarCollapsed}
										setCollapsed={setSidebarCollapsed}
										focusMode={focusMode}
										setFocusMode={setFocusMode}
									/>
								</div>
							)}

							{/*
							  Mobile had two scrolls: sticky Header outside #body + #body h-screen/overflow-auto.
							  App shell is now one column: header (fixed height) + single scrollable #body.
							  Desktop: sidebar only. Mobile (≤1025px): top Header + drawer sidebar.
							*/}
							<div
								className={[
									'relative flex-1 min-w-0',
									isAppShell ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'overflow-x-hidden',
								].filter(Boolean).join(' ')}
								data-dashboard-content
								// Only routes with the dashboard chrome reserve room for the edge dock; the
								// landing page and auth/form routes are full-bleed.
								data-sidebar-offset={focusMode && !isWhatsAppRoute && !isAuthRoute ? 'true' : undefined}
								data-ai-studio={isAiStudioRoute ? 'true' : undefined}
							>
								{isImpersonating && !impersonationCollapsed ? (
									<div aria-hidden className="h-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))] shrink-0" />
								) : null}
								{showStaffChrome && (
									<div
										className={[
											'max-[1025px]:block hidden shrink-0',
											isWhatsAppRoute ? 'wa-dashboard-header' : '',
										].filter(Boolean).join(' ')}
									>
										<Header onMenu={() => setSidebarOpen(!sidebarOpen)} />
									</div>
								)}
								{/*
								  Never start/exit at opacity 0 — iOS standalone PWAs can stick on a
								  blank white #body while the header (outside this tree) still paints.
								*/}
								<AnimatePresence initial={false}>
									<motion.main
										key={pathname}
										initial={{ opacity: 1, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 1, y: -4 }}
										transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
										className={isAppShell ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : undefined}
									>
										<div
											id="body"
											className={[
												isPresentationRoute ? 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto' : '',
												isAppShell
													? [
														'min-h-0 flex-1 overflow-x-hidden overscroll-y-contain overscroll-x-none',
														isWhatsAppRoute || isMetaWhatsAppRoute || isAiStudioRoute
															? 'overflow-hidden p-0'
															: isChatRoute
																? 'flex flex-col overflow-hidden max-[768px]:p-0 min-[769px]:p-4'
																: isImmersiveRoute
																// Avoid `p-0` + pe/ps conflict (shorthand can wipe end padding).
																// Symmetric inset so LTR/RTL both keep clear edge breathing room.
																? 'overflow-hidden max-[768px]:p-0 min-[769px]:p-4'
																: 'overflow-y-auto p-[var(--app-gutter)]',
													].join(' ')
													: pathname !== '/' && !isPresentationRoute
														? 'min-h-screen'
														: '',
												isClientShell && !isChatRoute ? 'pb-[var(--client-dock)]' : '',
											].filter(Boolean).join(' ')}
										>
											{children}
										</div>
									</motion.main>
								</AnimatePresence>
							</div>
						</div>
					</div>
					)}

					<ConfigAos />
					<Toaster position="top-center" />

					{/* Fixed portals (Quran dock, etc.) — outside overflow:hidden shell */}
					<div id="so7ba-portal-root" />

					{/* ── Impersonation Bar (top) ── */}
					<AnimatePresence>
						{isImpersonating && (
							<ImpersonationBar
								onExit={handleExitImpersonation}
								collapsed={impersonationCollapsed}
								onCollapsedChange={setImpersonationCollapsed}
							/>
						)}
					</AnimatePresence>

					{/* Quran audio continues after leaving /quran-revision */}
					{isClientShell ? <ClientFloatingBar user={user} /> : null}
					{!isBareViewport ? <QuranMiniPlayer /> : null}
					{!isBareViewport ? <LastRouteTracker /> : null}
					{!isBareViewport ? <LastRouteRestorer /> : null}
				</SidebarChromeProvider>
				</ThemeProvider>
				</TenantThemeProvider>
			</Providers>
		</GlobalProvider>
	);
}