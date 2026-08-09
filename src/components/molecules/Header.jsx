'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, LogOut, AlertCircle, Bell, CheckCheck } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from '@/i18n/navigation';
import LanguageToggle from '../atoms/LanguageToggle';
import { useTranslations } from 'next-intl';
import api from '@/utils/axios';
import './header-glass.css';

function initialsFrom(name, email) {
	const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
	const parts = src.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return src.slice(0, 2).toUpperCase();
}

function SkeletonBox({ width, height, className = '', style = {} }) {
	return (
		<div
			className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
			style={{ width, height, ...style }}
		/>
	);
}

function HeaderSkeleton({ onMenu }) {
	return (
		<header className="dash-header">
			<div className="dash-header-bar">
				<div className="dash-header-side">
					<button
						type="button"
						onClick={onMenu}
						className="dash-header-btn lg:hidden"
						aria-label="Menu"
					>
						<Menu className="w-[18px] h-[18px]" strokeWidth={2.5} />
					</button>
					<SkeletonBox width={38} height={38} style={{ borderRadius: 12 }} />
					<div className="dash-header-meta gap-1.5">
						<SkeletonBox width={110} height={12} style={{ borderRadius: 4 }} />
						<SkeletonBox width={64} height={9} style={{ borderRadius: 4 }} />
					</div>
				</div>
				<div className="dash-header-spacer" />
				<div className="dash-header-side is-end">
					<SkeletonBox width={38} height={38} style={{ borderRadius: 12 }} />
					<SkeletonBox width={42} height={38} style={{ borderRadius: 12 }} />
					<SkeletonBox width={38} height={38} style={{ borderRadius: 12 }} />
				</div>
			</div>
		</header>
	);
}

export default function Header({ onMenu }) {
	const t = useTranslations('header');
	const t_myProfile = useTranslations('');
	const user = useUser?.();
	const router = useRouter();
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const [notifOpen, setNotifOpen] = useState(false);
	const [notifItems, setNotifItems] = useState([]);
	const [notifUnread, setNotifUnread] = useState(0);
	const logoutRef = useRef(null);
	const logoutBtnRef = useRef(null);
	const notifRef = useRef(null);
	const notifBtnRef = useRef(null);
	const notifPanelRef = useRef(null);
	const logoutPanelRef = useRef(null);
	const [notifPos, setNotifPos] = useState(null);
	const [logoutPos, setLogoutPos] = useState(null);

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			localStorage.removeItem('user');
			localStorage.removeItem('accessToken');
			localStorage.removeItem('refreshToken');
		} catch (err) {
			console.error('Logout failed:', err);
		} finally {
			router.push('/auth');
		}
	};

	/** Keep popovers fully inside the viewport (esp. phone + RTL). */
	const placeFromBtn = useCallback((btn, preferredWidth) => {
		if (!btn || typeof window === 'undefined') return null;
		const vv = window.visualViewport;
		const vw = Math.round(vv?.width || document.documentElement.clientWidth || window.innerWidth);
		const vh = Math.round(vv?.height || window.innerHeight);
		const ox = vv?.offsetLeft || 0;
		const oy = vv?.offsetTop || 0;
		const pad = 8;
		const r = btn.getBoundingClientRect();
		const narrow = vw < 640;

		// Phones: edge-to-edge sheet so RTL never clips the title
		const width = narrow
			? Math.max(240, vw - pad * 2)
			: Math.min(preferredWidth, vw - pad * 2);

		const spaceBelow = vh - (r.bottom - oy) - pad;
		const spaceAbove = (r.top - oy) - pad;
		const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
		const maxHeight = Math.max(160, Math.min(narrow ? 420 : 360, preferBelow ? spaceBelow : spaceAbove));
		const top = preferBelow
			? Math.min(r.bottom + 6, oy + vh - Math.min(maxHeight, 180) - pad)
			: Math.max(oy + pad, r.top - maxHeight - 6);

		let left;
		if (narrow) {
			left = ox + pad;
		} else {
			left = r.left + r.width / 2 - width / 2;
			left = Math.max(ox + pad, Math.min(left, ox + vw - width - pad));
		}

		return { top, left, width, maxHeight };
	}, []);

	useEffect(() => {
		if (!showLogoutConfirm) return;
		const sync = () => setLogoutPos(placeFromBtn(logoutBtnRef.current, 300));
		sync();
		const handler = (e) => {
			const inBtn = logoutRef.current?.contains(e.target);
			const inPanel = logoutPanelRef.current?.contains(e.target);
			if (!inBtn && !inPanel) setShowLogoutConfirm(false);
		};
		window.addEventListener('resize', sync);
		window.addEventListener('scroll', sync, true);
		document.addEventListener('mousedown', handler);
		return () => {
			window.removeEventListener('resize', sync);
			window.removeEventListener('scroll', sync, true);
			document.removeEventListener('mousedown', handler);
		};
	}, [showLogoutConfirm, placeFromBtn]);

	useEffect(() => {
		const load = async () => {
			try {
				const [{ data: listRes }, { data: unreadRes }] = await Promise.all([
					api.get('/notifications', { params: { page: 1, limit: 6 } }),
					api.get('/notifications/unread-count'),
				]);
				const list = Array.isArray(listRes?.items) ? listRes.items : Array.isArray(listRes) ? listRes : [];
				setNotifItems(list);
				setNotifUnread(Number(unreadRes?.count || 0));
			} catch { /* ignore */ }
		};
		load();
	}, []);

	useEffect(() => {
		if (!notifOpen) return;
		const sync = () => setNotifPos(placeFromBtn(notifBtnRef.current, 340));
		sync();
		const handler = (e) => {
			const inBtn = notifRef.current?.contains(e.target);
			const inPanel = notifPanelRef.current?.contains(e.target);
			if (!inBtn && !inPanel) setNotifOpen(false);
		};
		window.addEventListener('resize', sync);
		window.addEventListener('scroll', sync, true);
		document.addEventListener('mousedown', handler);
		return () => {
			window.removeEventListener('resize', sync);
			window.removeEventListener('scroll', sync, true);
			document.removeEventListener('mousedown', handler);
		};
	}, [notifOpen, placeFromBtn]);

	const markAllRead = async () => {
		try {
			await api.patch('/notifications/read-all');
			setNotifItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
			setNotifUnread(0);
		} catch { /* ignore */ }
	};

	if (!user) return <HeaderSkeleton onMenu={onMenu} />;

	const avatarText = initialsFrom(user?.name, user?.email);
	const isActive = (user?.status || '').toLowerCase() === 'active';

	return (
		<header className="dash-header">
			<div className="dash-header-bar">
				<div className="dash-header-side">
					<button
						type="button"
						onClick={onMenu}
						className="dash-header-btn lg:hidden"
						aria-label={t('actions.openMenu')}
					>
						<Menu className="w-[18px] h-[18px]" strokeWidth={2.5} />
					</button>

					<div className="dash-header-avatar" aria-hidden>
						{avatarText}
						<span className={isActive ? 'dash-header-status' : 'dash-header-status is-off'} />
					</div>

					<div className="dash-header-meta">
						<span className="dash-header-name">{user?.name || user?.email}</span>
						{user?.role ? (
							<span className="dash-header-role">
								{t_myProfile(`myProfile.roles.${user.role}`)}
							</span>
						) : null}
					</div>
				</div>

				<div className="dash-header-spacer" />
				<div className="dash-header-divider" aria-hidden />

				<div className="dash-header-side is-end">
					<div className="relative dash-header-bell" ref={notifRef}>
						<button
							ref={notifBtnRef}
							type="button"
							onClick={() => setNotifOpen((v) => !v)}
							className="dash-header-btn"
							aria-label="Notifications"
						>
							<Bell className="w-4 h-4" strokeWidth={2.4} />
						</button>
						{notifUnread > 0 ? (
							<span className="dash-header-badge">
								{notifUnread > 99 ? '99+' : notifUnread}
							</span>
						) : null}
					</div>

					{/* Signature glass gem — language, themed by tenant colors */}
					<div className="dash-header-lang">
						<LanguageToggle collapsed cn="!h-[2.45rem]" />
					</div>

					<div className="relative" ref={logoutRef}>
						<button
							ref={logoutBtnRef}
							type="button"
							onClick={() => setShowLogoutConfirm(true)}
							className="dash-header-btn is-danger-solid"
							aria-label={t('actions.signOut')}
						>
							<LogOut className="w-4 h-4 rtl:scale-x-[-1]" strokeWidth={2.5} />
						</button>
					</div>
				</div>
			</div>

			{typeof document !== 'undefined' && createPortal(
				<AnimatePresence>
					{notifOpen && notifPos ? (
						<motion.div
							key="notif-panel"
							ref={notifPanelRef}
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							className="dash-notif-panel fixed"
							dir={typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'}
							style={{
								top: notifPos.top,
								left: notifPos.left,
								width: notifPos.width,
								maxHeight: notifPos.maxHeight,
								zIndex: 130000,
								borderRadius: '0.9rem',
							}}
						>
							<div className="dash-notif-head">
								<span className="dash-notif-title">Notifications</span>
								<button
									type="button"
									onClick={markAllRead}
									className="dash-notif-mark text-xs inline-flex items-center gap-1 font-semibold"
									style={{ color: 'var(--color-primary-600)' }}
								>
									<CheckCheck className="w-3.5 h-3.5" /> Mark all
								</button>
							</div>
							<div
								className="overflow-y-auto overscroll-contain divide-y divide-slate-100 min-h-0"
								style={{ maxHeight: `calc(${notifPos.maxHeight}px - 6.5rem)` }}
							>
								{notifItems.length ? notifItems.map((n) => (
									<div
										key={n.id}
										className="px-3 py-2.5"
										style={n.isRead ? undefined : {
											background: 'color-mix(in srgb, var(--color-primary-50) 55%, #fff)',
										}}
									>
										<div className="text-xs font-semibold text-slate-800 line-clamp-1">{n.title || 'Notification'}</div>
										<div className="text-[11px] text-slate-500 line-clamp-2">{n.message || ''}</div>
									</div>
								)) : (
									<div className="px-3 py-5 text-xs text-slate-500 text-center">No notifications</div>
								)}
							</div>
							<div className="px-3 py-2 border-t border-slate-100 shrink-0">
								<button
									type="button"
									onClick={() => { setNotifOpen(false); router.push('/dashboard/notifications'); }}
									className="w-full h-8 text-xs font-semibold"
									style={{
										borderRadius: 'var(--tenant-radius-button, 12px)',
										color: 'var(--color-primary-700)',
										background: 'var(--color-primary-50)',
									}}
								>
									Show more
								</button>
							</div>
						</motion.div>
					) : null}

					{showLogoutConfirm && logoutPos ? (
						<motion.div
							key="logout-panel"
							ref={logoutPanelRef}
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							className="fixed overflow-hidden bg-white"
							style={{
								top: logoutPos.top,
								left: logoutPos.left,
								width: logoutPos.width,
								zIndex: 130000,
								borderRadius: 'var(--tenant-radius-card, 14px)',
								border: '1px solid color-mix(in srgb, var(--tenant-danger, #ef4444) 22%, #e2e8f0)',
								boxShadow: '0 8px 28px rgba(15, 23, 42, 0.12)',
							}}
						>
							<div className="p-5">
								<div className="flex items-start gap-3 mb-4">
									<div
										className="w-11 h-11 grid place-items-center text-white flex-shrink-0"
										style={{
											borderRadius: 'var(--tenant-radius-button, 12px)',
											background: 'linear-gradient(135deg, color-mix(in srgb, var(--tenant-danger, #ef4444) 85%, #fff), var(--tenant-danger, #ef4444))',
										}}
									>
										<AlertCircle className="w-5 h-5" strokeWidth={2.5} />
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-sm font-bold text-slate-900 mb-1">
											{t('logout.confirmTitle') || 'تسجيل الخروج؟'}
										</h3>
										<p className="text-xs text-slate-600 leading-relaxed">
											{t('logout.confirmMessage') || 'هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟'}
										</p>
									</div>
								</div>

								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setShowLogoutConfirm(false)}
										className="flex-1 h-10 font-semibold text-sm transition-all"
										style={{
											borderRadius: 'var(--tenant-radius-button, 12px)',
											border: '1px solid var(--color-primary-200)',
											color: 'var(--color-primary-700)',
											background: 'var(--color-primary-50)',
										}}
									>
										{t('logout.cancel') || 'إلغاء'}
									</button>
									<button
										type="button"
										onClick={handleLogout}
										className="flex-1 h-10 font-semibold text-sm text-white"
										style={{
											borderRadius: 'var(--tenant-radius-button, 12px)',
											background: 'linear-gradient(135deg, color-mix(in srgb, var(--tenant-danger, #ef4444) 85%, #fff), var(--tenant-danger, #ef4444))',
											boxShadow: '0 4px 12px -2px color-mix(in srgb, var(--tenant-danger, #ef4444) 45%, transparent)',
										}}
									>
										{t('logout.confirm') || 'تأكيد'}
									</button>
								</div>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>,
				document.body,
			)}
		</header>
	);
}
