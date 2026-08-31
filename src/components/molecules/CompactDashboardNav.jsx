'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname as useI18nPathname, Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useTenantTheme } from '@/lib/tenant/TenantThemeProvider';
import { clearClientSession } from '@/lib/session-cleanup';
import { getNavPagesForRole } from './Sidebar';
import LanguageToggle from '../atoms/LanguageToggle';
import './header-glass.css';

function isPathActive(pathname, href, searchParams) {
	if (!href || !pathname) return false;
	const [hrefPath, hrefQuery] = href.split('?');
	const normalizedPath = pathname.replace(/\/+$/, '') || '/';
	const normalizedHref = hrefPath.replace(/\/+$/, '') || '/';
	if (normalizedPath === normalizedHref) {
		if (!hrefQuery) return true;
		const hrefParams = new URLSearchParams(hrefQuery);
		for (const [key, value] of hrefParams.entries()) {
			if (searchParams?.get(key) !== value) return false;
		}
		return true;
	}
	if (normalizedHref !== '/' && normalizedPath.startsWith(`${normalizedHref}/`)) return true;
	return false;
}

function initialsFrom(name, email) {
	const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
	const parts = src.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return src.slice(0, 2).toUpperCase();
}

/**
 * Top navigation for accounts locked to fewer than 5 pages.
 * Uses the same white card language as Header.
 */
export default function CompactDashboardNav() {
	const user = useUser();
	const tNav = useTranslations('nav');
	const tHeader = useTranslations('header');
	const tProfile = useTranslations('');
	const pathname = useI18nPathname();
	const searchParams = useSearchParams();
	const router = useRouter();
	const tenant = useTenantTheme();
	const [logoutOpen, setLogoutOpen] = useState(false);
	const logoutBtnRef = useRef(null);
	const logoutPanelRef = useRef(null);
	const [logoutPos, setLogoutPos] = useState(null);

	const allowedPages = user?.allowedPages;
	const role = user?.role;

	const items = useMemo(() => {
		if (!role || !Array.isArray(allowedPages) || !allowedPages.length) return [];
		const allow = new Set(allowedPages);
		const pages = getNavPagesForRole(role);
		const byId = new Map(pages.map((p) => [p.id, p]));
		return allowedPages
			.map((id) => byId.get(id))
			.filter((p) => p && p.href)
			.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
	}, [role, allowedPages]);

	const placeLogout = useCallback(() => {
		const btn = logoutBtnRef.current;
		if (!btn || typeof window === 'undefined') return null;
		const r = btn.getBoundingClientRect();
		const vw = window.innerWidth;
		const width = Math.min(300, vw - 16);
		let left = r.left + r.width / 2 - width / 2;
		left = Math.max(8, Math.min(left, vw - width - 8));
		return { top: r.bottom + 8, left, width };
	}, []);

	useEffect(() => {
		if (!logoutOpen) return;
		const sync = () => setLogoutPos(placeLogout());
		sync();
		const onDown = (e) => {
			if (logoutBtnRef.current?.contains(e.target)) return;
			if (logoutPanelRef.current?.contains(e.target)) return;
			setLogoutOpen(false);
		};
		window.addEventListener('resize', sync);
		document.addEventListener('mousedown', onDown);
		return () => {
			window.removeEventListener('resize', sync);
			document.removeEventListener('mousedown', onDown);
		};
	}, [logoutOpen, placeLogout]);

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			await clearClientSession();
		} catch {
			/* ignore */
		} finally {
			router.push('/auth');
		}
	};

	const logoSrc = tenant?.assets?.logo;
	const appName = tenant?.appName || 'So7baFit';
	const avatar = initialsFrom(user?.name, user?.email);
	const displayName = (user?.name && user.name.trim()) || user?.email?.split('@')[0] || appName;
	const roleLabel = user?.role ? tProfile(`myProfile.roles.${user.role}`) : '';

	return (
		<header className="dash-header compact-dash-nav shrink-0">
			<div className="dash-header-bar compact-dash-nav__bar">
				<div className="compact-dash-nav__cluster">
					<span className="compact-dash-nav__media">
						{logoSrc ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={logoSrc} alt={appName} className="compact-dash-nav__logo" />
						) : (
							<span className="compact-dash-nav__avatar" aria-hidden>
								{avatar}
							</span>
						)}
					</span>
					<div className="compact-dash-nav__identity">
						<p className="compact-dash-nav__name truncate">{displayName}</p>
						{roleLabel ? <p className="compact-dash-nav__role truncate">{roleLabel}</p> : null}
					</div>
				</div>

				<nav className="compact-dash-nav__items" aria-label="Pages">
					{items.map((item) => {
						const active = isPathActive(pathname, item.href, searchParams);
						const label = tNav(`items.${item.nameKey}`);
						return (
							<Link
								key={item.id}
								href={item.href}
								aria-current={active ? 'page' : undefined}
								className={`compact-dash-nav__link ${active ? 'is-active' : ''}`}
							>
								{label}
							</Link>
						);
					})}
				</nav>

				<div className="compact-dash-nav__actions">
					<div className="compact-dash-nav__lang">
						<LanguageToggle collapsed cn="compact-dash-nav__lang-btn" />
					</div>
					<button
						ref={logoutBtnRef}
						type="button"
						onClick={() => setLogoutOpen(true)}
						className="dash-header-btn is-danger-solid compact-dash-nav__logout"
						aria-label={tHeader('actions.signOut')}
					>
						<LogOut size={15} className="rtl:scale-x-[-1]" strokeWidth={2.4} />
					</button>
				</div>
			</div>

			{typeof document !== 'undefined' &&
				createPortal(
					<AnimatePresence>
						{logoutOpen && logoutPos ? (
							<motion.div
								key="compact-logout"
								ref={logoutPanelRef}
								initial={{ opacity: 0, y: -6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								className="fixed z-[130000] overflow-hidden rounded-2xl border bg-white p-3 shadow-2xl"
								style={{
									top: logoutPos.top,
									left: logoutPos.left,
									width: logoutPos.width,
									borderColor: 'color-mix(in srgb, var(--tenant-danger, #ef4444) 22%, #e2e8f0)',
								}}
							>
								<div className="mb-3 flex items-start gap-2.5">
									<span
										className="mt-0.5 grid h-8 w-8 place-items-center rounded-xl text-white"
										style={{
											background:
												'linear-gradient(135deg, color-mix(in srgb, var(--tenant-danger, #ef4444) 85%, #fff), var(--tenant-danger, #ef4444))',
										}}
									>
										<AlertCircle size={15} />
									</span>
									<div>
										<p className="text-sm font-bold text-slate-900">
											{tHeader('logout.confirmTitle')}
										</p>
										<p className="mt-0.5 text-xs text-slate-500">{tHeader('logout.confirmMessage')}</p>
									</div>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setLogoutOpen(false)}
										className="h-9 flex-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
									>
										{tHeader('logout.cancel')}
									</button>
									<button
										type="button"
										onClick={handleLogout}
										className="h-9 flex-1 rounded-xl text-xs font-bold text-white"
										style={{
											background:
												'linear-gradient(135deg, color-mix(in srgb, var(--tenant-danger, #ef4444) 85%, #fff), var(--tenant-danger, #ef4444))',
										}}
									>
										{tHeader('logout.confirm')}
									</button>
								</div>
							</motion.div>
						) : null}
					</AnimatePresence>,
					document.body,
				)}
		</header>
	);
}
