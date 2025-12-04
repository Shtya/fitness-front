'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, User as UserIcon, UserRound, Settings, LogOut, Check, CheckCheck, X, Inbox, Loader2, Search, Filter } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { Link, useRouter } from '@/i18n/navigation';
import io from 'socket.io-client';
import api from '@/utils/axios';
import LanguageToggle from '../atoms/LanguageToggle';
import { useTranslations, useLocale } from 'next-intl';
import MultiLangText from '../atoms/MultiLangText';

/* ----------------------------- helpers ---------------------------------- */
function initialsFrom(name, email) {
	const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
	const parts = src.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return src.slice(0, 2).toUpperCase();
}
function fmtRole(role) {
	if (!role) return 'Guest';
	return role[0].toUpperCase() + role.slice(1);
}

function dayKey(iso) {
	try {
		const d = new Date(iso);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	} catch {
		return 'Unknown';
	}
}
function groupByDay(items = []) {
	const map = new Map();
	items.forEach(n => {
		const key = dayKey(n.created_at || n.createdAt || n.createdAtUtc || n.updated_at || n.date);
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(n);
	});
	return Array.from(map.entries())
		.sort((a, b) => (a[0] < b[0] ? 1 : -1))
		.map(([date, list]) => ({ date, list }));
}

function prettyDayLabel(isoLike, t) {
	const today = new Date();
	const d = new Date(isoLike);
	const tKey = dayKey(today.toISOString());
	const dKey = dayKey(d.toISOString());
	const y = new Date(today.getTime() - 86400000);
	const yKey = dayKey(y.toISOString());
	if (dKey === tKey) return t('notif:common.today');
	if (dKey === yKey) return t('notif:common.yesterday');
	return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function normalizeList(src) {
	if (!src) return [];
	if (Array.isArray(src)) return src;
	if (src && Array.isArray(src.items)) return src.items;
	if (src && Array.isArray(src.data)) return src.data;
	return [];
}

function fmtLocal(iso, locale = 'en-US', tz) {
	try {
		return new Date(iso).toLocaleTimeString(locale, {
			timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
	} catch {
		return '';
	}
}

// --- skeleton row
function RowSkeleton() {
	return (
		<div className='p-4'>
			<div className='flex gap-3'>
				<div className='h-4 w-4 rounded-full bg-slate-200 animate-pulse' />
				<div className='flex-1 space-y-2'>
					<div className='h-3 w-2/3 rounded bg-slate-200 animate-pulse' />
					<div className='h-3 w-5/6 rounded bg-slate-200 animate-pulse' />
					<div className='h-3 w-1/3 rounded bg-slate-200 animate-pulse' />
				</div>
			</div>
		</div>
	);
}

/* ------------------------ Notifications data hook ------------------------ */
export function useLiveNotifications({ pageSize = 15 } = {}) {
	const [items, setItems] = useState([]);
	const [unread, setUnread] = useState(0);
	const [loading, setLoading] = useState(true);
	const socketRef = useRef(null);

	const fetchInitial = useCallback(async () => {
		setLoading(true);
		try {
			const [{ data: listRes }, { data: unreadRes }] = await Promise.all([api.get('/notifications/admin', { params: { page: 1, limit: pageSize } }), api.get('/notifications/unread-count')]);
			const list = normalizeList(listRes?.data ?? listRes);
			setItems(list);
			const count = typeof unreadRes?.count === 'number' ? unreadRes.count : list.reduce((a, n) => (n?.isRead ? a : a + 1), 0);
			setUnread(count);
		} finally {
			setLoading(false);
		}
	}, [pageSize]);

	const connectSocket = useCallback(() => {
		if (socketRef.current) return;
		const baseURL = typeof window !== 'undefined' ? window.location.origin : undefined;
		const socket = io(`${baseURL}/notifications`, {
			transports: ['websocket'],
			withCredentials: false,
		});
		socket.on('notification', n => {
			setItems(prev => [n, ...(Array.isArray(prev) ? prev : normalizeList(prev))].slice(0, pageSize));
			setUnread(c => c + (n?.isRead ? 0 : 1));
		});
		socketRef.current = socket;
	}, [pageSize]);

	useEffect(() => {
		fetchInitial();
		connectSocket();
		return () => {
			try {
				socketRef.current?.disconnect();
			} catch { }
			socketRef.current = null;
		};
	}, [fetchInitial, connectSocket]);

	const markAsRead = useCallback(async id => {
		try {
			await api.patch(`/notifications/${id}/read`);
			setItems(prev => prev.map(x => (x.id === id ? { ...x, isRead: true } : x)));
			setUnread(c => Math.max(0, c - 1));
		} catch { }
	}, []);

	const markAllRead = useCallback(async () => {
		try {
			await api.patch('/notifications/read-all');
			setItems(prev => prev.map(x => ({ ...x, isRead: true })));
			setUnread(0);
		} catch { }
	}, []);

	const loadPage = useCallback(
		async (page = 1) => {
			const { data: listRes } = await api.get('/notifications/admin', { params: { page, limit: pageSize } });
			return normalizeList(listRes?.data ?? listRes);
		},
		[pageSize],
	);

	const refetch = fetchInitial;
	return { items, unread, loading, markAsRead, markAllRead, loadPage, refetch };
}

/* --------------------------- Notifications UI --------------------------- */
export function Notifications({ open, onClose, toggleNotif, notifOpen }) {
	const t = useTranslations(); // use keys with prefixes "notif:*"
	const locale = useLocale();

	const { items: liveItems, unread: liveUnread, loading: liveLoading, markAsRead: liveMarkAsRead, markAllRead: liveMarkAllRead, loadPage, refetch } = useLiveNotifications({ pageSize: 15 });

	const base = useMemo(() => normalizeList(liveItems), [liveItems]);
	const [pages, setPages] = useState([]);
	const list = useMemo(() => base.concat(pages), [base, pages]);

	const [optimistic, setOptimistic] = useState(() => new Set());
	const [tab, setTab] = useState('all');
	const [q, setQ] = useState('');
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);

	useEffect(() => {
		setPages([]);
		setPage(1);
		setHasMore(true);
		setOptimistic(new Set());
	}, [base.length]);

	const items = useMemo(() => list.map(n => ({ ...n, isRead: n.isRead || optimistic.has(n.id) })), [list, optimistic]);

	const filtered = useMemo(() => {
		let arr = items;
		if (tab === 'unread') arr = arr.filter(n => !n.isRead);
		if (q.trim()) {
			const s = q.toLowerCase();
			arr = arr.filter(n => (n.title || '').toLowerCase().includes(s) || (n.message || '').toLowerCase().includes(s) || (n.type || '').toLowerCase().includes(s));
		}
		return arr;
	}, [items, tab, q]);

	const unreadCount = useMemo(() => {
		if (typeof liveUnread === 'number') {
			let delta = 0;
			for (const id of optimistic) if (items.find(x => x.id === id)) delta++;
			return Math.max(0, liveUnread - delta);
		}
		return items.reduce((a, n) => (n.isRead ? a : a + 1), 0);
	}, [items, liveUnread, optimistic]);

	const loading = !!liveLoading;

	const markOne = async id => {
		setOptimistic(prev => new Set(prev).add(id));
		try {
			await liveMarkAsRead?.(id);
		} catch {
			setOptimistic(prev => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	};

	const markAll = async () => {
		setOptimistic(prev => {
			const next = new Set(prev);
			for (const n of filtered) next.add(n.id);
			return next;
		});
		try {
			await liveMarkAllRead?.();
			refetch?.();
		} catch { }
	};

	const loadMore = async () => {
		if (loadingMore || !hasMore) return;
		setLoadingMore(true);
		try {
			const nextPage = page + 1;
			const newList = await loadPage?.(nextPage);
			const normalized = normalizeList(newList || []);
			if (!normalized.length) setHasMore(false);
			else {
				setPages(p => p.concat(normalized));
				setPage(nextPage);
			}
		} finally {
			setLoadingMore(false);
		}
	};

	useEffect(() => {
		if (!open) return;
		const onKey = e => e.key === 'Escape' && onClose?.();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	const grouped = useMemo(() => groupByDay(filtered), [filtered]);

	return (
		<AnimatePresence>
			{/* Trigger */}
			<button className='relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' onClick={toggleNotif} aria-haspopup='dialog' aria-expanded={notifOpen} aria-label={t('notif:actions.open')} title={t('notif:actions.open')}>
				<Bell className='size-5 text-slate-700' />
				{unreadCount > 0 && <span className='absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full px-1.5 text-[11px] grid place-items-center text-white bg-rose-500'>{unreadCount}</span>}
			</button>

			{open && (
				<>
					{/* Backdrop */}
					<motion.div className='fixed inset-0 z-[60]' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

					{/* Panel */}
					<motion.div role='dialog' aria-label={t('notif:title')} className='absolute right-0 top-10 z-[70] w-[420px] max-w-[95vw] rounded-lg border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5 overflow-hidden' initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}>
						{/* Header */}
						<div className='px-3 py-2 border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-white'>
							<div className='flex items-center justify-between gap-2'>
								<div className='flex items-center gap-2 font-semibold text-slate-800'>
									<Bell className='size-4 text-indigo-700' />
									<span>{t('notif:title')}</span>
								</div>
								<div className='flex items-center gap-1'>
									<button onClick={markAll} className='inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50'>
										<CheckCheck className='size-3.5' />
										{t('notif:actions.markAll')}
									</button>
									<button onClick={onClose} className='inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 hover:bg-slate-50' aria-label={t('notif:actions.close')} title={t('notif:actions.close')}>
										<X className='size-4' />
									</button>
								</div>
							</div>

							{/* Tabs + Search */}
							<div className='mt-2 flex items-center gap-2'>
								<div className='flex bg-white border border-slate-200 rounded-lg p-1'>
									{['all', 'unread'].map(key => (
										<button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
											{key === 'all' ? t('notif:tabs.all') : t('notif:tabs.unread')}
										</button>
									))}
								</div>

								<div className='relative flex-1'>
									<Search className='absolute left-2 top-1/2 -translate-y-1/2 size-4 text-slate-400' />
									<input value={q} onChange={e => setQ(e.target.value)} placeholder={t('notif:placeholders.search')} className='w-full pl-8 pr-3 h-9 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-200' />
								</div>
							</div>
						</div>

						{/* Body */}
						<div className='max-h-[65vh] overflow-auto'>
							{loading ? (
								<div className='divide-y divide-slate-100'>
									{Array.from({ length: 5 }).map((_, i) => (
										<RowSkeleton key={i} />
									))}
								</div>
							) : filtered.length === 0 ? (
								<div className='px-8 py-14 text-center text-slate-500'>
									<div className='mx-auto mb-3 grid place-items-center size-12 rounded-full bg-slate-100'>
										<Inbox className='size-6 text-slate-400' />
									</div>
									<div className='font-medium text-slate-700 mb-0.5'>{t('notif:empty.title')}</div>
									<div className='text-xs'>{t('notif:empty.hint')}</div>
								</div>
							) : (
								<div className='px-1 py-1'>
									{grouped.map(group => (
										<div key={group.date} className='px-3'>
											<div className='sticky top-0 z-10 mb-1 bg-white'>
												<div className='flex items-center gap-2 py-2'>
													<div className='h-px flex-1 bg-slate-200' />
													<span className='text-[11px] text-slate-500 px-2'>{prettyDayLabel(group.date, t)}</span>
													<div className='h-px flex-1 bg-slate-200' />
												</div>
											</div>

											<ul className='divide-y divide-slate-100 rounded-lg overflow-hidden border border-slate-100 bg-white'>
												{group.list.map(n => {
													const unread = !n.isRead;
													const time = fmtLocal(n.created_at || n.createdAt || n.date, locale);
													return (
														<li key={n.id} className={`p-3.5 sm:p-4 ${unread ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-slate-50/70'}`}>
															<div className='flex items-start gap-3'>
																<div className='mt-0.5'>
																	<span className={`inline-block size-2 rounded-full ${unread ? 'bg-indigo-600' : 'bg-slate-300'}`} />
																</div>
																<div className='flex-1 min-w-0'>
																	<div className='flex items-center justify-between gap-2'>
																		<div className='text-sm font-medium text-slate-800 truncate'>{n.title || t('notif:common.notification')}</div>
																		<span className='text-[11px] text-slate-400'>{time}</span>
																	</div>
																	{n.message ? <div className='text-xs text-slate-600 mt-1 whitespace-pre-wrap break-words line-clamp-3'>{n.message}</div> : null}
																	<div className='mt-2 flex items-center gap-2'>
																		{unread ? (
																			<button onClick={() => markOne(n.id)} className='text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50'>
																				<Check className='size-3' /> {t('notif:actions.read')}
																			</button>
																		) : (
																			<span className='text-[10px] rounded border border-slate-200 text-slate-500 px-1.5 py-0.5'>{t('notif:common.read')}</span>
																		)}
																		{n.url ? (
																			<a href={n.url} className='text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50'>
																				{t('notif:actions.openLink')}
																			</a>
																		) : null}
																	</div>
																</div>
															</div>
														</li>
													);
												})}
											</ul>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Footer */}
						<div className='px-3 mt-2 py-2 border-t border-slate-100 bg-white text-[11px] text-slate-500 flex items-center justify-between'>
							<div className='inline-flex items-center gap-1'>
								{loading ? <Loader2 className='size-3 animate-spin' /> : null}
								<span>{loading ? t('notif:footer.syncing') : t('notif:footer.shown', { count: filtered.length })}</span>
								<Link href='/dashboard/notifications' className='text-[10px] underline ml-2'>
									{t('notif:actions.showAll')}
								</Link>
							</div>

							<div className='flex items-center gap-2'>
								{hasMore && (
									<button onClick={loadMore} className='gap-2 text-[11px] underline' disabled={loadingMore}>
										{loadingMore ? (
											<>
												<Loader2 className='size-4 animate-spin' /> {t('notif:actions.loading')}
											</>
										) : (
											t('notif:actions.loadMore')
										)}
									</button>
								)}
								<button
									onClick={() => {
										setQ('');
										setTab('all');
										refetch?.();
									}}
									className='text-[11px] underline underline-offset-2 hover:text-slate-700'>
									{t('notif:actions.reset')}
								</button>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

/* -------------------------------- Header --------------------------------- */
export default function Header({ onMenu,  onSettings = () => { } }) {
	const t = useTranslations('header');
	const user = useUser?.();
	const router = useRouter();

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

	const [notifOpen, setNotifOpen] = useState(false);
	const toggleNotif = () => setNotifOpen(o => !o);

	const avatarText = initialsFrom(user?.name, user?.email);
	const role = fmtRole(user?.role);
	const isActive = (user?.status || '').toLowerCase() === 'active';

	return (
		<div className='sticky top-0 z-40 '>
			<div className='absolute inset-0  bg-white border-b border-slate-200/70' />
			<div className='absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent' />

			<div className='relative'>
				<div className='container px-3 sm:px-4'>
					<div className='h-16 grid grid-cols-[auto_1fr_auto] items-center gap-2'>
						{/* left: menu + user */}
						<div className='flex items-center gap-2'>
							<button onClick={onMenu} className='lg:hidden inline-flex items-center justify-center size-11 max-md:size-9 rounded-lg border border-slate-200 bg-white hover:shadow-sm active:scale-95 transition' aria-label={t('actions.openMenu')} title={t('actions.openMenu')}>
								<Menu />
							</button>

							<div className='flex items-center gap-3'>
								<div className='relative'>
									<div className='max-md:size-9 size-11 rounded-lg grid place-content-center font-semibold bg-indigo-600 text-white shadow-sm'>{avatarText}</div>
									<span className={`absolute -right-0 -bottom-0 size-2.5 rounded-full ring-2 ring-white ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isActive ? t('status.online') : t('status.offline')} />
								</div>

								<div className='hidden sm:flex flex-col items-start '>
									<MultiLangText className='text-sm font-medium  text-slate-800 max-w-[180px] truncate'>{user?.name || user?.email || t('common.guest')}</MultiLangText>
									<div className='flex items-center gap-2 '>
										<span className=' rtl:order-[-1] inline-flex items-center gap-1 text-[11px] leading-5 px-1.5 py-0.5 rounded-lg border text-indigo-700 border-indigo-200 bg-indigo-50/70' title={`${t('labels.role')}: ${role}`}>
											<UserIcon className='size-3.5' />
											{t(`roles.${(user?.role || 'guest').toLowerCase()}`)}
										</span>
										<span className='text-[11px] text-slate-500'>{t('labels.lastLogin', { time: "" })} <span className="font-en">{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</span> </span>
									</div>
								</div>
							</div>
						</div>

						<div />



						{/* right cluster */}
						<div className='relative flex items-center gap-2'>
							<LanguageToggle />

							{/* <Notifications toggleNotif={toggleNotif} notifOpen={notifOpen} open={notifOpen} onClose={() => setNotifOpen(false)} /> */}

							<div className='flex items-center gap-1'>
								{/* <button onClick={onProfile} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' aria-label={t('actions.profile')} title={t('actions.profile')}>
									<UserRound className='size-5 text-slate-700' />
								</button> */}
								{/* <button onClick={onSettings} className=' inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' aria-label={t('actions.settings')} title={t('actions.settings')}>
                  <Settings className='size-5 text-slate-700' />
                </button> */}
								<button onClick={handleLogout} className='rtl:scale-x-[-1]  inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 active:scale-95 transition' aria-label={t('actions.signOut')} title={t('actions.signOut')}>
									<LogOut className='size-5 text-rose-600' />
								</button>
							</div>

							{!user && (
								<Link href={'/auth'} onClick={handleLogout} className='ml-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50'>
									<LogOut className='  size-4 rotate-180' />
									{t('actions.signIn')}
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
