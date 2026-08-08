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
import { useRouter, useParams } from 'next/navigation';
import { LogIn, LogOut, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import './sidebar-glass.css';

const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });

const LS_KEY = 'sidebar:collapsed';

// ─────────────────────────────────────────────────────────────────────────────
// ImpersonationBar
// ─────────────────────────────────────────────────────────────────────────────
function ImpersonationBar({ onExit }) {
	const [user, setUser] = useState(null);

	useEffect(() => {
		try {
			setUser(JSON.parse(localStorage.getItem('impersonated_user') || 'null'));
		} catch {}
	}, []);

	if (!user) return null;

	return (
		<motion.div
			initial={{ y: 100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			exit={{ y: 100, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 300, damping: 30 }}
			className="fixed bottom-0 inset-x-0 z-[999] flex items-center justify-between gap-4 px-5 py-3 text-white shadow-2xl"
			style={{
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via, var(--color-gradient-from)), var(--color-gradient-to))',
			}}
		>
			{/* Left — info */}
			<div className="flex items-center gap-3 min-w-0">
				<div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
					<Shield size={14} />
				</div>
				<div className="min-w-0">
					<p className="text-[10px] font-semibold opacity-75 uppercase tracking-widest md: leading-none mb-0.5">
						Impersonating
					</p>
					<p className="text-sm font-black truncate md: leading-none">
						{user.name}
						<span className="font-normal opacity-70 ml-2 text-xs">({user.email})</span>
					</p>
				</div>
			</div>

			{/* Right — exit */}
			<motion.button
				whileHover={{ scale: 1.04 }}
				whileTap={{ scale: 0.96 }}
				onClick={onExit}
				className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold border border-white/30 transition-all backdrop-blur-sm"
			>
				<LogOut size={13} />
				Return to Super Admin
			</motion.button>
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

	// Detect impersonation session on mount + storage changes
	useEffect(() => {
		const check = () => setIsImpersonating(!!localStorage.getItem('super_admin_prev_session'));
		check();
		window.addEventListener('storage', check);
		return () => window.removeEventListener('storage', check);
	}, []);

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
		pathname === '/';
	const isPresentationRoute = pathname.startsWith('/presentation');
	const isWhatsAppRoute = pathname.includes('/dashboard/whatsapp');
	const isMetaWhatsAppRoute = pathname.includes('/dashboard/meta-whatsapp');
	const isChatRoute = pathname.includes('/dashboard/chat');
	const isAiFreeRoute = pathname.includes('/dashboard/ai-free');
	const isImmersiveRoute = isWhatsAppRoute || isMetaWhatsAppRoute || isChatRoute || isAiFreeRoute;
	/** Dashboard shell (sidebar/header): lock viewport to one scroll surface */
	const isAppShell = !isAuthRoute;

	const [sidebarOpen, setSidebarOpen]         = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	/** Mobile top header: hide on scroll down, reveal on scroll up */
	const [headerCollapsed, setHeaderCollapsed] = useState(false);

	useEffect(() => { setSidebarOpen(false); }, [pathname]);
	useEffect(() => { setHeaderCollapsed(false); }, [pathname]);
	useEffect(() => {
		if (sidebarOpen) setHeaderCollapsed(false);
	}, [sidebarOpen]);
	/* Sync body push with drawer width via --sidebar-drawer-w */
	useEffect(() => {
		const root = document.documentElement;
		if (sidebarOpen) root.setAttribute('data-sidebar-open', '1');
		else root.removeAttribute('data-sidebar-open');
		return () => root.removeAttribute('data-sidebar-open');
	}, [sidebarOpen]);

	useEffect(() => {
		if (!isAppShell) return undefined;
		let lastY = 0;
		let lastTarget = null;
		const THRESH = 10;

		const onScroll = (e) => {
			const t = e.target;
			if (!(t instanceof Element)) return;
			/* Ignore nested menus / dialogs / the sidebar itself */
			if (t.closest?.('.sidebar-shell, [role="dialog"], .qr-drawer, .qr-tw-modal')) return;

			const y = t.scrollTop || 0;
			if (lastTarget !== t) {
				lastTarget = t;
				lastY = y;
				return;
			}
			const dy = y - lastY;
			if (y <= 16) {
				setHeaderCollapsed(false);
				lastY = y;
				return;
			}
			if (Math.abs(dy) < THRESH) return;
			if (dy > 0) setHeaderCollapsed(true);
			else setHeaderCollapsed(false);
			lastY = y;
		};

		document.addEventListener('scroll', onScroll, true);
		return () => document.removeEventListener('scroll', onScroll, true);
	}, [isAppShell]);

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
									className={`duration-300 ${sidebarOpen ? 'relative z-[120000]' : 'relative z-[100]'}`}
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
							>
								{!isAuthRoute && (
									<div
										className={[
											'max-[1025px]:block hidden shrink-0',
											'transition-[max-height,opacity,transform] duration-300 ease-out will-change-[max-height,opacity]',
											headerCollapsed
												? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none overflow-hidden'
												: 'max-h-[5.5rem] opacity-100 translate-y-0 overflow-visible',
											isWhatsAppRoute ? 'wa-dashboard-header' : '',
										].filter(Boolean).join(' ')}
										aria-hidden={headerCollapsed || undefined}
									>
										<Header onMenu={() => setSidebarOpen(!sidebarOpen)} />
									</div>
								)}
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
																? 'overflow-hidden p-0 lg:py-4 lg:pe-4 lg:ps-2'
																: 'overflow-y-auto p-3 md:p-4',
													].join(' ')
													: pathname !== '/' && !isPresentationRoute
														? 'min-h-screen'
														: '',
												isImpersonating ? 'pb-8' : '',
											].filter(Boolean).join(' ')}
										>
											{children}
										</div>
									</motion.main>
								</AnimatePresence>
							</div>
						</div>
					</div>

					<ConfigAos />
					<Toaster position="top-center" />

					{/* ── Impersonation Bar ── */}
					<AnimatePresence>
						{isImpersonating && (
							<ImpersonationBar onExit={handleExitImpersonation} />
						)}
					</AnimatePresence>
				</ThemeProvider>
				</TenantThemeProvider>
			</Providers>
		</GlobalProvider>
	);
}