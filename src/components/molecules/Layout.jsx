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
import { useInitialRoleRedirect } from '@/hooks/useInitialRoleRedirect';
import Header from './Header';
import { useRouter, useParams } from 'next/navigation';
import { LogIn, LogOut, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

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
				<div className="p-1.5 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
					<Shield size={14} />
				</div>
				<div className="min-w-0">
					<p className="text-[10px] font-semibold opacity-75 uppercase tracking-widest leading-none mb-0.5">
						Impersonating
					</p>
					<p className="text-sm font-black truncate leading-none">
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
				className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-bold border border-white/30 transition-all backdrop-blur-sm"
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

	useInitialRoleRedirect();
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
		pathname.includes('/dashboard/builder/preview')
	);
	const blockFormOnMobile = !isFormRoute && isMobile && isAdminOrCoach;

	const isAuthRoute =
		pathname.includes('dashboard/templates') ||
		pathname.startsWith('/workouts/plans') ||
		pathname.startsWith('/auth') ||
		pathname.startsWith('/form') ||
		pathname.startsWith('/thank-you') ||
		pathname.startsWith('/site') ||
		pathname === '/';

	const [sidebarOpen, setSidebarOpen]         = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	useEffect(() => { setSidebarOpen(false); }, [pathname]);

	useEffect(() => {
		if (sidebarOpen) document.body.style.overflow = 'hidden';
		else document.body.style.overflow = '';
		return () => (document.body.style.overflow = '');
	}, [sidebarOpen]);

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
	if (blockFormOnMobile) {
		return (
			<GlobalProvider>
				<ThemeProvider>
					<motion.div
						className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						{/* Animated background */}
						<div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
						<div
							className="absolute inset-0 opacity-[0.03]"
							style={{
								backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-primary-400) 1px, transparent 0)`,
								backgroundSize: '40px 40px',
							}}
						/>

						<div
							className="max-w-md w-full rounded-lg border-2 p-8 shadow-2xl bg-white/80 backdrop-blur-xl relative z-10"
							style={{ borderColor: 'var(--color-primary-200)' }}
						>
							<div className="text-center">
								<div
									className="w-20 h-20 mx-auto mb-6 rounded-lg grid place-items-center text-white shadow-xl"
									style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
								>
									<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
								</div>
								<h1 className="text-2xl font-black mb-3" style={{ color: 'var(--color-primary-900)' }}>
									{t('desktop_required_title')}
								</h1>
								<p className="text-slate-600 mb-6 text-sm leading-relaxed">
									{t('desktop_required_message')}
								</p>
								<Link
									className="inline-flex items-center justify-center h-12 px-6 rounded-lg font-bold text-white shadow-lg transition-all hover:shadow-xl"
									href={'/auth'}
									style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
								>
									{t('reload_button')}
								</Link>
							</div>
						</div>
					</motion.div>
					<ConfigAos />
					<Toaster position="top-center" />
				</ThemeProvider>
			</GlobalProvider>
		);
	}

	// ── Main layout ─────────────────────────────────────────────────────────
	return (
		<GlobalProvider>
			<Providers>
				<ThemeProvider>
					<div className="relative min-h-screen">
						{/* Background layers */}
						<div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
						<div
							className="fixed inset-0 -z-10 opacity-[0.015]"
							style={{
								backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-primary-500) 1px, transparent 0)`,
								backgroundSize: '32px 32px',
							}}
						/>
						<div
							className="fixed top-0 right-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl"
							style={{ background: `radial-gradient(circle, var(--color-primary-200), transparent 70%)` }}
						/>
						<div
							className="fixed bottom-0 left-0 w-[600px] h-[600px] -z-10 opacity-20 blur-3xl"
							style={{ background: `radial-gradient(circle, var(--color-secondary-200), transparent 70%)` }}
						/>

						<div className="flex min-h-screen w-screen overflow-hidden">
							{!isAuthRoute && (
								<div
									className={`z-[100] duration-300 ${
										focusMode
											? `flex-none w-[0px] ${!sidebarOpen ? 'rtl:translate-x-[300px] ltr:translate-x-[-300px]' : 'rtl:translate-x-[84px] ltr:translate-x-[-84px]'}`
											: ''
									}`}
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

							<div className="relative flex-1 min-w-0 overflow-x-hidden h-screen">
								<AnimatePresence mode="wait">
									<div className="max-[1025px]:block hidden">
										<Header onMenu={() => setSidebarOpen(!sidebarOpen)} />
									</div>
									<motion.main
										key={pathname}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
										className="h-screen"
									>
										{/* Add bottom padding when impersonating so content isn't hidden behind bar */}
										<div
											id="body"
											className={`${!isAuthRoute && `h-screen overflow-auto p-3 md:p-6`} ${isImpersonating ? 'pb-16' : ''}`}
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
			</Providers>
		</GlobalProvider>
	);
}