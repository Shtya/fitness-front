'use client';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from '../../context/GlobalContext';
import { usePathname } from '../../i18n/navigation';
import ConfigAos from '@/config/Aos';
import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import Providers from '@/context/ReactQuery';
import Link from 'next/link';
import { ThemeProvider } from '@/app/[locale]/theme';
import { TenantThemeProvider } from '@/lib/tenant/TenantThemeProvider';
import { useInitialRoleRedirect } from '@/hooks/useInitialRoleRedirect';
import Header from './Header';
import LastRouteTracker from './LastRouteTracker';
import { useRouter, useParams } from 'next/navigation';
import { LogIn, LogOut, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { IMPERSONATION_EVENT, notifyImpersonationChanged } from '@/lib/impersonation';
import './sidebar-glass.css';

const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });
const QuranMiniPlayer = dynamic(() => import('./QuranMiniPlayer'), { ssr: false });

const LS_KEY = 'sidebar:collapsed';
const LS_OFFSET_KEY = 'sidebar:offset';

// ─────────────────────────────────────────────────────────────────────────────
// ImpersonationBar
// ─────────────────────────────────────────────────────────────────────────────

function ImpersonationBar({ onExit }) {
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

	return (
		<motion.div
			initial={{ y: -40, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			exit={{ y: -40, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 320, damping: 28 }}
			className="fixed top-0 inset-x-0 z-[200000] flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 text-white shadow-lg"
			style={{
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via, var(--color-gradient-from)), var(--color-gradient-to))',
				paddingTop: 'max(0.55rem, env(safe-area-inset-top))',
			}}
			role="status"
			aria-live="polite"
		>
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
					<Shield size={14} />
				</div>
				<div className="min-w-0">
					<p className="text-[10px] font-bold opacity-80 uppercase tracking-widest leading-none mb-0.5">
						Viewing as
					</p>
					<p className="text-sm font-black truncate leading-tight">
						{user.name}
						<span className="font-normal opacity-75 ms-1.5 text-xs hidden sm:inline">({user.email})</span>
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onExit}
				className="shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white text-slate-900 text-xs sm:text-sm font-bold shadow-md hover:bg-white/95 transition-colors"
			>
				<LogOut size={13} />
				<span className="hidden xs:inline sm:inline">Return to Super Admin</span>
				<span className="sm:hidden">Exit</span>
			</button>
		</motion.div>
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
			localStorage.setItem('user',         prev.user);
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
		pathname === '/';
	const isPresentationRoute = pathname.startsWith('/presentation');
	const isOpenRoute = pathname.startsWith('/open');
	const isWhatsAppRoute = pathname.includes('/dashboard/whatsapp');
	const isMetaWhatsAppRoute = pathname.includes('/dashboard/meta-whatsapp');
	const isChatRoute = pathname.includes('/dashboard/chat');
	const isAiFreeRoute = pathname.includes('/dashboard/ai-free');
	const isImmersiveRoute = isWhatsAppRoute || isMetaWhatsAppRoute || isChatRoute || isAiFreeRoute;
	/** Dashboard shell (sidebar/header): lock viewport to one scroll surface */
	const isAppShell = !isAuthRoute;

	const [sidebarOpen, setSidebarOpen]         = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	useEffect(() => { setSidebarOpen(false); }, [pathname]);
	/* Sync body push with drawer width via --sidebar-drawer-w */
	useEffect(() => {
		const root = document.documentElement;
		if (sidebarOpen) root.setAttribute('data-sidebar-open', '1');
		else root.removeAttribute('data-sidebar-open');
		return () => root.removeAttribute('data-sidebar-open');
	}, [sidebarOpen]);

	/* One document lock: app shell / presentation / open mobile drawer */
	useEffect(() => {
		const lock = isAppShell || isPresentationRoute || sidebarOpen;
		const prevHtml = document.documentElement.style.overflow;
		const prevBody = document.body.style.overflow;
		if (lock) {
			document.documentElement.style.overflow = 'hidden';
			document.body.style.overflow = 'hidden';
		} else {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
		}
		return () => {
			document.documentElement.style.overflow = prevHtml;
			document.body.style.overflow = prevBody;
		};
	}, [isAppShell, isPresentationRoute, sidebarOpen]);

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
					<div className={isAppShell || isPresentationRoute ? 'relative h-dvh overflow-hidden' : 'relative min-h-screen'}>
						{/* Background layers */}
						<div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
						<div className="fixed inset-0 -z-10 opacity-[0.015]" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-primary-500) 1px, transparent 0)`, backgroundSize: '32px 32px', }} /> 
						<div className="fixed top-0 right-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl" style={{ background: `radial-gradient(circle, var(--color-primary-200), transparent 70%)` }} /> 
						<div className="fixed bottom-0 left-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl" style={{ background: `radial-gradient(circle, var(--color-secondary-200), transparent 70%)` }} />

						<div className={`flex w-full max-w-[100vw] overflow-hidden ${isAppShell || isPresentationRoute ? 'h-full' : ''}`}>
							{!isAuthRoute && (
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
							*/}
							<div
								className={[
									'relative flex-1 min-w-0',
									isAppShell ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'overflow-x-hidden',
								].filter(Boolean).join(' ')}
								data-dashboard-content
								data-sidebar-offset={focusMode ? 'true' : undefined}
							>
								{!isAuthRoute && (
									<div
										className={[
											'max-[1025px]:block hidden shrink-0',
											isWhatsAppRoute ? 'wa-dashboard-header' : '',
										].filter(Boolean).join(' ')}
									>
										<Header onMenu={() => setSidebarOpen(!sidebarOpen)} />
									</div>
								)}
								{isOpenRoute ? (
									<main className="flex min-h-0 flex-1 flex-col overflow-hidden">
										<div id="body" className="min-h-0 flex-1 overflow-hidden p-0">
											{children}
										</div>
									</main>
								) : (
								<AnimatePresence mode="wait">
									<motion.main
										key={pathname}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
										className={isAppShell ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : undefined}
									>
										{/* Add bottom padding when impersonating so content isn't hidden behind bar */}
										<div
											id="body"
											className={[
												isPresentationRoute ? 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto' : '',
												isAppShell
													? [
														'min-h-0 flex-1 overflow-x-hidden overscroll-y-contain',
														isMetaWhatsAppRoute
															? 'overflow-hidden p-0'
															: isImmersiveRoute
																// Avoid `p-0` + pe/ps conflict (shorthand can wipe end padding).
																// Symmetric inset so LTR/RTL both keep clear edge breathing room.
																? 'overflow-hidden max-[768px]:p-0 min-[769px]:p-4'
																: 'overflow-y-auto p-3 md:p-4',
													].join(' ')
													: pathname !== '/' && !isPresentationRoute
														? 'min-h-screen'
														: '',
												isImpersonating ? 'pt-14' : '',
											].filter(Boolean).join(' ')}
										>
											{children}
										</div>
									</motion.main>
								</AnimatePresence>
								)}
							</div>
						</div>
					</div>

					<ConfigAos />
					<Toaster position="top-center" />

					{/* ── Impersonation Bar (top) ── */}
					<AnimatePresence>
						{isImpersonating && (
							<ImpersonationBar onExit={handleExitImpersonation} />
						)}
					</AnimatePresence>

					{/* Quran audio continues after leaving /quran-revision */}
					{!isOpenRoute ? <QuranMiniPlayer /> : null}
					{!isOpenRoute ? <LastRouteTracker /> : null}
				</ThemeProvider>
				</TenantThemeProvider>
			</Providers>
		</GlobalProvider>
	);
}