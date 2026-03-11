'use client';

import React, {
	useLayoutEffect,
	useEffect,
	useMemo,
	useRef,
	useState,
	useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import api from '@/utils/axios';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
	LayoutDashboard, Users, User as UserIcon, ClipboardList, Apple,
	NotebookPen, MessageSquare, Calculator, FileBarChart, ChefHat,
	ChevronDown, X, Newspaper, ServerCog, AlarmClock,
	Wallet, CreditCard, TrendingUp, User, KanbanSquare, ListTodo,
	CalendarDays, Clock, LogOut, Globe, Palette, Paintbrush, Check,
	PanelLeftClose, PanelLeftOpen,
	ReceiptJapaneseYen,
} from 'lucide-react';
import {
	usePathname as useNextPathname,
	useSearchParams,
	useRouter as useNextRouter
} from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { FaInbox, FaUsers, FaWpforms } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { useValues } from '@/context/GlobalContext';
import { useTheme, COLOR_PALETTES } from '@/app/[locale]/theme';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import MultiLangText from '../atoms/MultiLangText';
import { useRouter as useI18nRouter } from '@/i18n/navigation';

/* ─── Constants ─────────────────────────────────────────────── */
const SIDEBAR_W = 272;
const SIDEBAR_W_COLLAPSED = 68;

/* ─── Motion configs ────────────────────────────────────────── */
const snap = { type: 'spring', stiffness: 500, damping: 36, mass: 0.65 };
const gentle = { type: 'spring', stiffness: 300, damping: 28, mass: 0.9 };
const slide = { type: 'spring', stiffness: 400, damping: 34, mass: 0.8 };

/* ─── Static design tokens ──────────────────────────────────── */
const T = {
	border: '#eef0f4',
	bg: '#ffffff',
	bgSub: '#f8f9fc',
	text: '#0f172a',
	textMuted: '#94a3b8',
	textLight: '#cbd5e1',
};

/* ─── Helpers ───────────────────────────────────────────────── */
function initialsFrom(name, email) {
	const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
	const parts = src.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return src.slice(0, 2).toUpperCase();
}

function isPathActive(pathname, href, searchParams) {
	if (!href) return false;

	const [hrefPath, hrefQuery] = href.split('?');

	if (pathname === hrefPath) {
		if (!hrefQuery) return true;

		const hrefParams = new URLSearchParams(hrefQuery);

		for (const [key, value] of hrefParams.entries()) {
			if (searchParams?.get(key) !== value) return false;
		}

		return true;
	}

	if (pathname?.startsWith(hrefPath + '/')) {
		return !hrefQuery;
	}

	return false;
}

function anyChildActive(pathname, children = [], searchParams) {
	return children.some((c) => isPathActive(pathname, c.href, searchParams));
}

function getDir() {
	if (typeof document === 'undefined') return 'ltr';
	return document.documentElement.getAttribute('dir') || 'ltr';
}

function useLocalStorageState(key, initial) {
	const [val, set] = useState(() => {
		try {
			const v = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
			return v == null ? initial : JSON.parse(v);
		} catch {
			return initial;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(val));
		} catch { }
	}, [key, val]);

	return [val, set];
}

/* ─── NAV ───────────────────────────────────────────────────── */
export const NAV = [
	// ADMIN
{
  role: 'admin',
  sectionKey: 'sections.dashboard',
  items: [
    { nameKey: 'overview', href: '/dashboard', icon: LayoutDashboard },
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.content',
  items: [
    { nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
    { nameKey: 'allRecipes',   href: '/dashboard/recipes',  icon: ReceiptJapaneseYen },
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.programs',
  items: [
    { nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },
    { nameKey: 'mealPlans',    href: '/dashboard/nutrition',      icon: ChefHat },
    { nameKey: 'reports',      href: '/dashboard/reports',        icon: FileBarChart },
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.clients',
  items: [
    { nameKey: 'allUsers', href: '/dashboard/users', icon: Users },
    {
      nameKey: 'clientIntake',
      icon: FaUsers,
      expand: false,
      children: [
        { nameKey: 'manageForms', href: '/dashboard/intake/forms',      icon: FaWpforms },
        { nameKey: 'responses',   href: '/dashboard/intake/responses',  icon: FaInbox },
      ]
    }
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.workspace',
  items: [
    { nameKey: 'todos',    href: '/workspace?tab=tasks',    icon: ListTodo },
    { nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays },
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.communication',
  items: [
    { nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.tools',
  items: [
    { nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.finance',
  items: [
    { nameKey: 'billing', href: '/dashboard/billing', icon: Wallet },
    { nameKey: 'money',   href: '/money',             icon: Wallet },
  ]
},
{
  role: 'admin',
  sectionKey: 'sections.account',
  items: [
    { nameKey: 'profile',         href: '/dashboard/my-account',   icon: User },
    { nameKey: 'systemSettings',  href: '/dashboard/settings',     icon: ServerCog },
  ]
},

// CLIENT
{
  role: 'client',
  sectionKey: 'sections.myWorkspace',
  items: [
    { nameKey: 'myWorkouts',      href: '/dashboard/my/workouts', icon: ClipboardList },
    { nameKey: 'myNutrition',     href: '/dashboard/my/nutrition', icon: Apple },
    { nameKey: 'recipes',         href: '/dashboard/my/recipes',  icon: ChefHat },
    { nameKey: 'weeklyStrength',  href: '/dashboard/my/report',   icon: Newspaper },
    { nameKey: 'myReminders',     href: '/dashboard/reminders',   icon: AlarmClock },
  ]
},
{
  role: 'client',
  sectionKey: 'sections.workspace',
  items: [
    { nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays },
		{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
{ nameKey: 'money', href: '/money', icon: Wallet },
{ nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon },
  ]
},
 

// COACH
{
  role: 'coach',
  sectionKey: 'sections.content',
  items: [
    { nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
  ]
},
{
  role: 'coach',
  sectionKey: 'sections.programs',
  items: [
    { nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },
    { nameKey: 'mealPlans',    href: '/dashboard/nutrition',      icon: ChefHat },
    { nameKey: 'reports',      href: '/dashboard/reports',        icon: FileBarChart },
  ]
},
{
  role: 'coach',
  sectionKey: 'sections.clients',
  items: [
    { nameKey: 'allUsers', href: '/dashboard/users', icon: Users },
    {
      nameKey: 'clientIntake',
      icon: FaUsers,
      expand: false,
      children: [
        { nameKey: 'manageForms', href: '/dashboard/intake/forms',     icon: FaWpforms },
        { nameKey: 'responses',   href: '/dashboard/intake/responses', icon: FaInbox },
      ]
    }
  ]
},
{
  role: 'coach',
  sectionKey: 'sections.workspace',
  items: [
    { nameKey: 'todos',    href: '/workspace?tab=tasks',    icon: ListTodo },
    { nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays },
  ]
},
{
  role: 'coach',
  sectionKey: 'sections.communication',
  items: [
    { nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
  ]
},
{
  role: 'coach',
  sectionKey: 'sections.tools',
  items: [
    { nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
  ]
},
{
  role: 'coach',
  sectionKey: 'sections.account',
  items: [
    { nameKey: 'profile', href: '/dashboard/my-account', icon: User },
  ]
},

// SUPER ADMIN
{
  role: 'super_admin',
  sectionKey: 'sections.dashboard',
  items: [
    { nameKey: 'overview', href: '/dashboard', icon: LayoutDashboard },
  ]
},
{
  role: 'super_admin',
  sectionKey: 'sections.clients',
  items: [
    { nameKey: 'allUsers',    href: '/dashboard/super-admin/users', icon: Users },
    { nameKey: 'allExercises', href: '/dashboard/workouts',         icon: ClipboardList },
    { nameKey: 'feedback',    href: '/dashboard/super-admin/feedback', icon: MessageSquare },
  ]
},
{
  role: 'super_admin',
  sectionKey: 'sections.finance',
  items: [
    {
      nameKey: 'billing',
      icon: Wallet,
      expand: false,
      children: [
        { nameKey: 'analytics',           href: '/dashboard/billing/analytics',            icon: TrendingUp },
        { nameKey: 'withdrawalApprovals', href: '/dashboard/billing/withdrawal-approvals', icon: CreditCard },
        { nameKey: 'allWallets',          href: '/dashboard/billing/all-wallets',          icon: Users },
      ]
    }
  ]
},
{
  role: 'super_admin',
  sectionKey: 'sections.workspace',
  items: [
    { nameKey: 'todos',    href: '/workspace?tab=tasks',    icon: ListTodo },
    { nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays },
  ]
},
{
  role: 'super_admin',
  sectionKey: 'sections.account',
  items: [
    { nameKey: 'systemSettings', href: '/dashboard/settings', icon: ServerCog },
  ]
},
]

/* ─── useUnreadChats ─────────────────────────────────────────── */
export function useUnreadChats(pollMs = 300000) {
	const [total, setTotal] = useState(0);
	const { conversationId } = useValues();

	async function load() {
		try {
			const res = await api.get('/chat/unread');
			setTotal(res?.data?.totalUnread ?? 0);
		} catch { }
	}

	useEffect(() => {
		load();
		const id = setInterval(load, pollMs);
		return () => clearInterval(id);
	}, [pollMs, conversationId]);

	return { totalUnread: total, reloadUnread: load };
}

/* ─── Badge ──────────────────────────────────────────────────── */
function Badge({ value }) {
	return (
		<motion.span
			initial={{ scale: 0, rotate: -12 }}
			animate={{ scale: 1, rotate: 0 }}
			transition={snap}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				minWidth: 18,
				height: 18,
				borderRadius: 99,
				fontSize: 10,
				fontWeight: 900,
				color: '#fff',
				padding: '0 5px',
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 45%, transparent)',
				letterSpacing: '0.01em',
			}}
			aria-label={`${value} unread`}
		>
			{value > 99 ? '99+' : value}
		</motion.span>
	);
}

/* ─── CollapsedTooltip ───────────────────────────────────────── */
export function CollapsedTooltip({ label, anchorRef, offset = 10 }) {
	const [mounted, setMounted] = useState(false);
	const [pos, setPos] = useState(null);
	const tipRef = useRef(null);
	const isRTL = useMemo(() => getDir() === 'rtl', []);

	useEffect(() => setMounted(true), []);

	useLayoutEffect(() => {
		if (!mounted || !anchorRef?.current || !tipRef.current) return;
		const rect = anchorRef.current.getBoundingClientRect();
		const tipRect = tipRef.current.getBoundingClientRect();
		const top = rect.top + rect.height / 2;
		let left = isRTL ? rect.left - tipRect.width - offset : rect.right + offset;
		left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
		setPos({ top, left });
	}, [mounted, anchorRef, label, offset, isRTL]);

	if (!mounted) return null;

	return createPortal(
		<motion.div
			ref={tipRef}
			initial={{ opacity: 0, x: isRTL ? 5 : -5, scale: 0.95 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: isRTL ? 5 : -5, scale: 0.95 }}
			transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
			style={{
				position: 'fixed',
				top: pos?.top ?? -9999,
				left: pos?.left ?? -9999,
				transform: 'translateY(-50%)',
				zIndex: 9999,
				pointerEvents: 'none'
			}}
		>
			<div style={{
				fontSize: 11.5,
				fontWeight: 700,
				padding: '5px 12px',
				borderRadius: 8,
				whiteSpace: 'nowrap',
				color: 'white',
				letterSpacing: '0.025em',
				background: 'linear-gradient(135deg, #0f172a, #1e293b)',
				boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
				position: 'relative',
			}}>
				{label}
				<span style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%) rotate(45deg)',
					[isRTL ? 'right' : 'left']: -3.5,
					width: 7,
					height: 7,
					background: '#0f172a',
					borderRadius: 1,
				}} />
			</div>
		</motion.div>,
		document.body
	);
}

/* ─── PortalFlyout ───────────────────────────────────────────── */
function PortalFlyout({ children, anchorRef, offset = 10 }) {
	const [mounted, setMounted] = useState(false);
	const [pos, setPos] = useState(null);
	const flyRef = useRef(null);
	const isRTL = useMemo(() => getDir() === 'rtl', []);

	useEffect(() => setMounted(true), []);

	useLayoutEffect(() => {
		if (!mounted || !anchorRef?.current) return;

		const place = () => {
			if (!anchorRef.current) return;

			const rect = anchorRef.current.getBoundingClientRect();
			const flyW = flyRef.current?.offsetWidth ?? 240;
			const flyH = flyRef.current?.offsetHeight ?? 160;
			const pad = 8;

			let left = isRTL ? rect.left - flyW - offset : rect.right + offset;
			if (!isRTL && left + flyW > window.innerWidth - pad) left = rect.left - flyW - offset;
			if (isRTL && left < pad) left = rect.right + offset;

			let top = rect.top;
			if (top + flyH > window.innerHeight - pad) top = window.innerHeight - flyH - pad;
			if (top < pad) top = pad;

			setPos({ top, left });
		};

		place();
		const ro = new ResizeObserver(place);
		if (flyRef.current) ro.observe(flyRef.current);
		return () => ro.disconnect();
	}, [mounted, anchorRef, offset, isRTL]);

	if (!mounted) return null;

	const xFrom = isRTL ? 8 : -8;

	return createPortal(
		<motion.div
			ref={flyRef}
			role="menu"
			initial={{ opacity: 0, x: xFrom, scale: 0.96 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: xFrom, scale: 0.96 }}
			transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
			style={{
				position: 'fixed',
				top: pos?.top ?? -9999,
				left: pos?.left ?? -9999,
				zIndex: 9998,
				minWidth: 230,
				borderRadius: 14,
				overflow: 'hidden',
				background: '#fff',
				border: `1.5px solid ${T.border}`,
				boxShadow: '0 16px 48px rgba(15,23,42,0.1), 0 4px 12px rgba(15,23,42,0.06)',
			}}
		>
			{children}
		</motion.div>,
		document.body
	);
}

/* ─── ScrollShadow ───────────────────────────────────────────── */
function ScrollShadow({ children }) {
	const ref = useRef(null);
	const [atTop, setAtTop] = useState(true);
	const [atBottom, setAtBottom] = useState(false);

	const onScroll = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		setAtTop(el.scrollTop <= 0);
		setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		onScroll();
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	}, [onScroll]);

	return (
		<div style={{ position: 'relative', height: '100%' }}>
			<div ref={ref} style={{ height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}>
				{children}
			</div>
			<div style={{
				pointerEvents: 'none',
				position: 'absolute',
				inset: '0 0 auto 0',
				height: 32,
				opacity: atTop ? 0 : 1,
				transition: 'opacity .2s',
				background: 'linear-gradient(to bottom, #fff 20%, transparent)'
			}} />
			<div style={{
				pointerEvents: 'none',
				position: 'absolute',
				inset: 'auto 0 0 0',
				height: 32,
				opacity: atBottom ? 0 : 1,
				transition: 'opacity .2s',
				background: 'linear-gradient(to top, #fff 20%, transparent)'
			}} />
		</div>
	);
}

/* ─── SectionLabel ───────────────────────────────────────────── */
function SectionLabel({ label }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', marginBottom: 2, marginTop: 14 }}>
			<span style={{
				fontSize: 9,
				fontWeight: 800,
				textTransform: 'uppercase',
				letterSpacing: '0.22em',
				color: 'var(--color-primary-400)',
				whiteSpace: 'nowrap',
				flexShrink: 0,
			}}>
				{label}
			</span>
			<div style={{
				flex: 1,
				height: 1,
				background: 'linear-gradient(to right, var(--color-primary-100), transparent)'
			}} />
		</div>
	);
}

/* ─── NavItem ────────────────────────────────────────────────── */
function NavItem({
	item,
	pathname,
	searchParams,
	depth = 0,
	onNavigate,
	collapsed = false,
	t,
	totalUnread
}) {
	const Icon = item.icon || LayoutDashboard;
	const hasChildren = Array.isArray(item.children) && item.children.length > 0;
	const label = t(`items.${item.nameKey}`);
	const [open, setOpen] = useState(false);
	const [hover, setHover] = useState(false);
	const liRef = useRef(null);
	const isRTL = getDir() === 'rtl';

	useEffect(() => {
		if (collapsed) return;

		if (hasChildren) {
			if (item.expand) {
				setOpen(true);
			} else {
				setOpen(
					anyChildActive(pathname, item.children, searchParams) ||
					isPathActive(pathname, item.href, searchParams)
				);
			}
		}
	}, [pathname, searchParams, collapsed, hasChildren, item.expand, item.children, item.href]);

	/* COLLAPSED */
	if (collapsed) {
		const firstChildHref = hasChildren ? item.children.find((c) => c.href)?.href : null;
		const href = hasChildren ? firstChildHref : item.href;
		const active = isPathActive(pathname, href || '', searchParams);

		return (
			<div
				ref={liRef}
				style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
			>
				{href ? (
					<Link href={href} onClick={onNavigate} style={{ display: 'block' }}>
						<motion.div
							whileHover={{ scale: 1.08 }}
							whileTap={{ scale: 0.93 }}
							style={{
								position: 'relative',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: 40,
								height: 40,
								borderRadius: 11,
								transition: 'all .18s',
								...(active ? {
									background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
									boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 38%, transparent)',
									color: '#fff',
								} : { color: 'var(--color-primary-500)' }),
							}}
						>
							{!active && (
								<span style={{
									position: 'absolute',
									inset: 0,
									borderRadius: 11,
									background: 'var(--color-primary-50)',
									opacity: hover ? 1 : 0,
									transition: 'opacity .18s'
								}} />
							)}
							<Icon style={{ position: 'relative', zIndex: 1, width: 16, height: 16 }} strokeWidth={active ? 2.5 : 2} />
						</motion.div>
					</Link>
				) : (
					<motion.div
						whileHover={{ scale: 1.08 }}
						whileTap={{ scale: 0.93 }}
						style={{
							position: 'relative',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: 40,
							height: 40,
							borderRadius: 11,
							cursor: 'pointer',
							color: 'var(--color-primary-500)'
						}}
					>
						<span style={{
							position: 'absolute',
							inset: 0,
							borderRadius: 11,
							background: 'var(--color-primary-50)',
							opacity: hover ? 1 : 0,
							transition: 'opacity .18s'
						}} />
						<Icon style={{ position: 'relative', zIndex: 1, width: 16, height: 16 }} strokeWidth={2} />
					</motion.div>
				)}

				<AnimatePresence>
					{hover && !hasChildren && <CollapsedTooltip label={label} anchorRef={liRef} />}
				</AnimatePresence>

				<AnimatePresence>
					{hover && hasChildren && (
						<PortalFlyout anchorRef={liRef}>
							<div style={{ padding: '10px 0' }}>
								<div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
									<span style={{
										fontSize: 9,
										fontWeight: 800,
										textTransform: 'uppercase',
										letterSpacing: '0.22em',
										color: 'var(--color-primary-400)',
										whiteSpace: 'nowrap'
									}}>
										{label}
									</span>
									<div style={{ flex: 1, height: 1, background: 'var(--color-primary-100)' }} />
								</div>
								<div style={{ padding: '0 6px' }}>
									{item.children.map((child) => {
										const A = child.icon || LayoutDashboard;
										const ca = isPathActive(pathname, child.href, searchParams);

										return (
											<Link
												key={child.href}
												href={child.href}
												onClick={onNavigate}
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: 10,
													borderRadius: 9,
													padding: '8px 10px',
													transition: 'all .15s',
													...(ca ? {
														background: 'linear-gradient(90deg, var(--color-primary-50), transparent)',
														color: 'var(--color-primary-800)',
													} : { color: 'var(--color-primary-600)' })
												}}
											>
												<span style={{
													display: 'grid',
													placeContent: 'center',
													width: 26,
													height: 26,
													borderRadius: 7,
													flexShrink: 0,
													transition: 'all .15s',
													...(ca ? {
														background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
														color: '#fff',
														boxShadow: '0 2px 6px color-mix(in srgb, var(--color-primary-500) 35%, transparent)',
													} : { background: 'var(--color-primary-50)', color: 'var(--color-primary-500)' })
												}}>
													<A style={{ width: 12, height: 12 }} strokeWidth={ca ? 2.5 : 2} />
												</span>
												<span style={{ fontSize: 12.5, fontWeight: ca ? 700 : 500, letterSpacing: '0.01em' }}>
													{t(`items.${child.nameKey}`)}
												</span>
												{ca && (
													<span style={{
														marginLeft: 'auto',
														width: 5,
														height: 5,
														borderRadius: '50%',
														background: 'var(--color-primary-400)'
													}} />
												)}
											</Link>
										);
									})}
								</div>
							</div>
						</PortalFlyout>
					)}
				</AnimatePresence>
			</div>
		);
	}

	/* LEAF */
	if (!hasChildren) {
		const active = isPathActive(pathname, item.href, searchParams);
		const isMessages = item.nameKey === 'messages';

		return (
			<Link href={item.href} onClick={onNavigate} style={{ display: 'block' }}>
				<motion.div
					whileHover={!active ? { x: isRTL ? -2 : 2 } : {}}
					whileTap={{ scale: 0.985 }}
					style={{
						position: 'relative',
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						borderRadius: 11,
						padding: '7px 10px',
						transition: 'all .18s',
						overflow: 'hidden',
						...(active ? {
							background: 'linear-gradient(110deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%)',
							color: 'var(--color-primary-900)',
							boxShadow: 'inset 0 0 0 1.5px var(--color-primary-100)',
						} : { color: 'var(--color-primary-600)' }),
					}}
					aria-current={active ? 'page' : undefined}
				>
					{active && (
						<motion.span
							layoutId="active-rail"
							transition={snap}
							style={{
								position: 'absolute',
								[isRTL ? 'right' : 'left']: 0,
								top: '18%',
								bottom: '18%',
								width: 3,
								borderRadius: 99,
								background: 'linear-gradient(180deg, var(--color-gradient-from), var(--color-gradient-to))',
							}}
						/>
					)}

					{!active && (
						<motion.span
							initial={{ opacity: 0 }}
							whileHover={{ opacity: 1 }}
							style={{
								position: 'absolute',
								inset: 0,
								borderRadius: 11,
								background: 'var(--color-primary-50)'
							}}
						/>
					)}

					<span style={{
						position: 'relative',
						zIndex: 1,
						flexShrink: 0,
						display: 'grid',
						placeContent: 'center',
						width: 30,
						height: 30,
						borderRadius: 9,
						transition: 'all .18s',
						...(active ? {
							background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
							color: '#fff',
							boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 38%, transparent)',
						} : {
							background: T.bgSub,
							color: 'var(--color-primary-500)',
							boxShadow: `inset 0 0 0 1px ${T.border}`
						}),
					}}>
						<Icon style={{ width: 14, height: 14 }} strokeWidth={active ? 2.5 : 2} />
					</span>

					<span style={{
						position: 'relative',
						zIndex: 1,
						flex: 1,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						fontSize: 13,
						fontWeight: active ? 700 : 500,
						letterSpacing: '0.01em'
					}}>
						{label}
					</span>

					{isMessages && totalUnread > 0 && (
						<span style={{ position: 'relative', zIndex: 1 }}>
							<Badge value={totalUnread} />
						</span>
					)}
				</motion.div>
			</Link>
		);
	}

	/* GROUP */
	const groupActive = anyChildActive(pathname, item.children, searchParams);

	return (
		<div style={{ width: '100%' }}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				style={{
					position: 'relative',
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					borderRadius: 11,
					padding: '7px 10px',
					textAlign: isRTL ? 'right' : 'left',
					border: 'none',
					cursor: 'pointer',
					transition: 'all .18s',
					...(open
						? { background: 'var(--color-primary-50)', color: 'var(--color-primary-900)' }
						: { background: 'transparent', color: 'var(--color-primary-600)' }),
				}}
				aria-expanded={open}
			>
				{!open && (
					<motion.span
						initial={{ opacity: 0 }}
						whileHover={{ opacity: 1 }}
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: 11,
							background: 'var(--color-primary-50)',
							pointerEvents: 'none'
						}}
					/>
				)}

				<span style={{
					position: 'relative',
					flexShrink: 0,
					display: 'grid',
					placeContent: 'center',
					width: 30,
					height: 30,
					borderRadius: 9,
					transition: 'all .18s',
					...(open
						? { background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }
						: { background: T.bgSub, color: 'var(--color-primary-500)', boxShadow: `inset 0 0 0 1px ${T.border}` }),
				}}>
					<Icon style={{ width: 14, height: 14 }} strokeWidth={2} />
				</span>

				<span style={{
					position: 'relative',
					flex: 1,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					fontSize: 13,
					fontWeight: 600,
					letterSpacing: '0.01em'
				}}>
					{label}
				</span>

				{!open && groupActive && (
					<span style={{
						width: 6,
						height: 6,
						borderRadius: '50%',
						flexShrink: 0,
						background: 'var(--color-primary-400)'
					}} />
				)}

				<motion.span
					animate={{ rotate: open ? 180 : 0 }}
					transition={snap}
					style={{ color: open ? 'var(--color-primary-500)' : T.textLight, flexShrink: 0 }}
				>
					<ChevronDown style={{ width: 14, height: 14 }} strokeWidth={2.5} />
				</motion.span>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						key="sub"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={gentle}
						style={{ overflow: 'hidden' }}
					>
						<div style={{
							position: 'relative',
							marginTop: 2,
							marginBottom: 2,
							[isRTL ? 'marginRight' : 'marginLeft']: 19,
						}}>
							<div style={{
								position: 'absolute',
								top: 0,
								bottom: 0,
								[isRTL ? 'right' : 'left']: 0,
								width: 1,
								background: 'linear-gradient(to bottom, var(--color-primary-100), transparent)',
							}} />
							<ul style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: 12, margin: 0, listStyle: 'none' }}>
								{item.children.map((child) => (
									<li key={child.href || child.nameKey}>
										<NavItem
											item={child}
											pathname={pathname}
											searchParams={searchParams}
											depth={depth + 1}
											onNavigate={onNavigate}
											t={t}
											totalUnread={totalUnread}
										/>
									</li>
								))}
							</ul>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function NavSection({
	sectionKey,
	items,
	pathname,
	searchParams,
	onNavigate,
	collapsed = false,
	t,
	totalUnread = 0
}) {
	const t_nav = useTranslations('nav');
	const label = t_nav(sectionKey, { defaultValue: '' });

	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			{!collapsed && label && <SectionLabel label={label} />}
			{items.map((item) => (
				<NavItem
					key={item.href || item.nameKey}
					item={item}
					pathname={pathname}
					searchParams={searchParams}
					onNavigate={onNavigate}
					collapsed={collapsed}
					t={t}
					totalUnread={totalUnread}
				/>
			))}
		</div>
	);
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({ user, size = 'md' }) {
	const text = initialsFrom(user?.name, user?.email);
	const isActive = (user?.status || '').toLowerCase() === 'active';
	const dim = size === 'sm' ? { w: 34, h: 34, font: 11 } : { w: 42, h: 42, font: 13 };

	return (
		<div style={{ position: 'relative', flexShrink: 0 }}>
			<div style={{
				display: 'grid',
				placeItems: 'center',
				borderRadius: 8,
				fontWeight: 900,
				color: '#fff',
				position: 'relative',
				overflow: 'hidden',
				width: dim.w,
				height: dim.h,
				fontSize: dim.font,
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				boxShadow: '0 3px 12px color-mix(in srgb, var(--color-primary-500) 38%, transparent)',
			}}>
				<span style={{ position: 'relative', zIndex: 1 }}>{text}</span>
				<motion.div
					style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
					animate={{ x: ['-100%', '200%'] }}
					transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
				>
					<div style={{
						width: '60%',
						height: '100%',
						background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)'
					}} />
				</motion.div>
			</div>
			<span style={{
				position: 'absolute',
				right: size === 'sm' ? -2 : -3,
				bottom: size === 'sm' ? -2 : -3,
				width: size === 'sm' ? 9 : 11,
				height: size === 'sm' ? 9 : 11,
				borderRadius: '50%',
				background: isActive ? '#22c55e' : '#94a3b8',
				boxShadow: '0 0 0 2px white',
			}}>
				{isActive && (
					<motion.span
						style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e' }}
						animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
						transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
					/>
				)}
			</span>
		</div>
	);
}

/* ─── UserProfileCard ────────────────────────────────────────── */
function UserProfileCard({ user, collapsed, setCollapsed }) {
	const t_r = useTranslations('');

	return (
		<div style={{ padding: '0 10px' }}>
			<div
				className="gap-[10px]"
				style={{
					display: 'flex',
					alignItems: 'center',
					borderRadius: 13,
					transition: 'all .3s',
					flexDirection: collapsed ? 'column' : 'row',
					gap: collapsed ? 7 : 10,
					padding: collapsed ? '8px 4px' : '10px 12px',
					background: collapsed ? 'transparent' : 'white',
					border: collapsed ? 'none' : `1.5px solid ${T.border}`,
					boxShadow: collapsed ? 'none' : '0 2px 8px rgba(15,23,42,0.05)',
				}}
			>
				<Avatar user={user} size={collapsed ? 'sm' : 'md'} />

				{!collapsed && (
					<div style={{ flex: 1, minWidth: 0 }}>
						<MultiLangText style={{
							display: 'block',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							fontSize: 13,
							fontWeight: 700,
							color: T.text,
							lineHeight: 1.3
						}}>
							{user?.name}
						</MultiLangText>
						<p style={{
							fontSize: 9.5,
							marginTop: 3,
							textTransform: 'uppercase',
							fontWeight: 700,
							letterSpacing: '0.18em',
							color: 'var(--color-primary-400)'
						}}>
							{t_r(`myProfile.roles.${user?.role}`)}
						</p>
					</div>
				)}

				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.92 }}
					onClick={() => setCollapsed((v) => !v)}
					style={{
						flexShrink: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: 33,
						height: 33,
						borderRadius: 8,
						border: 'none',
						cursor: 'pointer',
						background: 'var(--color-primary-50)',
						color: 'var(--color-primary-400)',
						boxShadow: `inset 0 0 0 1px var(--color-primary-100)`,
						transition: 'all .18s',
					}}
					title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				>
					<motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={snap}>
						{collapsed
							? <PanelLeftOpen style={{ width: 13, height: 13 }} strokeWidth={2} />
							: <PanelLeftClose style={{ width: 13, height: 13 }} strokeWidth={2} />
						}
					</motion.div>
				</motion.button>
			</div>
		</div>
	);
}

/* ─── Locale helpers ─────────────────────────────────────────── */
function setDocumentLangDir(locale) {
	if (typeof document === 'undefined') return;
	document.documentElement.lang = locale;
	document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

function setLocaleCookie(locale) {
	if (typeof document === 'undefined') return;
	document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function showGlobalLoader(ms = 1100) {
	if (typeof document === 'undefined') return;
	const el = document.getElementById('lang-switch-loader');
	if (el) el.remove();

	const root = document.createElement('div');
	root.id = 'lang-switch-loader';
	root.className = 'fixed inset-0 z-[9999] grid place-items-center backdrop-blur-sm bg-black/40';
	root.innerHTML = `<div class="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>`;
	document.body.appendChild(root);

	setTimeout(() => root.remove(), ms);
}

function swapLocaleInPath(pathname, nextLocale) {
	const safePath = pathname || '/';
	const segs = safePath.split('/').filter(Boolean);

	if (segs.length > 0 && (segs[0] === 'en' || segs[0] === 'ar')) {
		segs[0] = nextLocale;
		return '/' + segs.join('/');
	}

	return '/' + [nextLocale, ...segs].join('/');
}

/* ─── SidebarLanguageToggle ──────────────────────────────────── */
function SidebarLanguageToggle({ collapsed }) {
	const locale = useLocale();
	const router = useNextRouter();
	const pathname = useNextPathname();
	const search = useSearchParams();
	const [pending, start] = useTransition();
	const isEN = locale === 'en';
	const nextLocale = isEN ? 'ar' : 'en';

	const nextHref = useMemo(() => {
		const base = swapLocaleInPath(pathname || '/', nextLocale);
		const qs = search?.toString();
		return qs ? `${base}?${qs}` : base;
	}, [pathname, search, nextLocale]);

	function toggle() {
		start(() => {
			showGlobalLoader();
			setLocaleCookie(nextLocale);
			setDocumentLangDir(nextLocale);
			router.replace(nextHref);
			router.refresh();
		});
	}

	if (collapsed) {
		return (
			<motion.button
				type="button"
				onClick={toggle}
				whileHover={{ scale: 1.07 }}
				whileTap={{ scale: 0.95 }}
				title={isEN ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
				style={{
					position: 'relative',
					width: 40,
					height: 40,
					borderRadius: 11,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'pointer',
					border: `1px solid ${T.border}`,
					background: T.bgSub,
					color: 'var(--color-primary-500)',
					overflow: 'hidden',
					transition: 'all .18s',
				}}
			>
				<Globe style={{ position: 'relative', zIndex: 1, width: 15, height: 15 }} strokeWidth={2} />
				<span style={{
					position: 'absolute',
					bottom: 5,
					left: '50%',
					transform: 'translateX(-50%)',
					fontSize: 8,
					fontWeight: 900,
					letterSpacing: '0.06em',
					color: 'var(--color-primary-400)',
					zIndex: 1
				}}>
					{locale.toUpperCase()}
				</span>
				{pending && (
					<motion.span
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						style={{
							position: 'absolute',
							inset: 0,
							zIndex: 20,
							background: T.bgSub,
							display: 'grid',
							placeItems: 'center',
							borderRadius: 11
						}}
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							style={{
								width: 14,
								height: 14,
								border: `2px solid ${T.border}`,
								borderTopColor: 'var(--color-primary-500)',
								borderRadius: '50%'
							}}
						/>
					</motion.span>
				)}
			</motion.button>
		);
	}

	return (
		<motion.button
			type="button"
			onClick={toggle}
			whileHover={{ scale: 1.005 }}
			whileTap={{ scale: 0.995 }}
			style={{
				position: 'relative',
				width: '100%',
				height: 36,
				borderRadius: 11,
				display: 'flex',
				alignItems: 'center',
				overflow: 'hidden',
				cursor: 'pointer',
				border: `1px solid ${T.border}`,
				background: T.bgSub,
				transition: 'all .18s',
			}}
		>
			<motion.span
				animate={{ left: isEN ? 'calc(50% + 2px)' : '3px', right: isEN ? '3px' : 'calc(50% + 2px)' }}
				transition={snap}
				style={{
					position: 'absolute',
					top: 3,
					bottom: 3,
					borderRadius: 8,
					background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
					boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 35%, transparent)',
				}}
			/>

			<motion.div
				animate={{ opacity: isEN ? 0.5 : 1 }}
				transition={{ duration: .2 }}
				style={{
					position: 'relative',
					zIndex: 1,
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 5
				}}
			>
				<Globe style={{ width: 12, height: 12, color: isEN ? '#fff' : 'var(--color-primary-500)' }} strokeWidth={2.5} />
				<span style={{
					fontSize: 11,
					fontWeight: 800,
					letterSpacing: '0.03em',
					color: isEN ? '#fff' : 'var(--color-primary-500)'
				}}>
					العربية
				</span>
			</motion.div>

			<span style={{ position: 'relative', zIndex: 1, width: 1, height: 16, background: T.border, flexShrink: 0 }} />

			<motion.div
				animate={{ opacity: !isEN ? 0.5 : 1 }}
				transition={{ duration: .2 }}
				style={{
					position: 'relative',
					zIndex: 1,
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 5
				}}
			>
				<Globe style={{ width: 12, height: 12, color: !isEN ? '#fff' : 'var(--color-primary-500)' }} strokeWidth={2.5} />
				<span style={{
					fontSize: 11,
					fontWeight: 800,
					letterSpacing: '0.03em',
					color: !isEN ? '#fff' : 'var(--color-primary-500)'
				}}>
					English
				</span>
			</motion.div>

			<AnimatePresence>
				{pending && (
					<motion.span
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						style={{
							position: 'absolute',
							inset: 0,
							zIndex: 20,
							background: 'rgba(255,255,255,.85)',
							borderRadius: 11,
							display: 'grid',
							placeItems: 'center'
						}}
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							style={{
								width: 14,
								height: 14,
								border: `2px solid ${T.border}`,
								borderTopColor: 'var(--color-primary-500)',
								borderRadius: '50%'
							}}
						/>
					</motion.span>
				)}
			</AnimatePresence>
		</motion.button>
	);
}

/* ─── SidebarThemeSwitcher ───────────────────────────────────── */
function SidebarThemeSwitcher({ collapsed }) {
	const { theme: currentTheme, setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const triggerRef = useRef(null);
	const panelRef = useRef(null);
	const [panelPos, setPanelPos] = useState(null);
	const isRTL = useMemo(() => getDir() === 'rtl', []);
	const themeEntries = useMemo(() => Object.entries(COLOR_PALETTES), []);
	const currentPalette = COLOR_PALETTES[currentTheme];

	useEffect(() => {
		if (!open) return;

		const fn = (e) => {
			if (panelRef.current?.contains(e.target)) return;
			if (triggerRef.current?.contains(e.target)) return;
			setOpen(false);
		};

		document.addEventListener('mousedown', fn);
		return () => document.removeEventListener('mousedown', fn);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const fn = (e) => { if (e.key === 'Escape') setOpen(false); };
		document.addEventListener('keydown', fn);
		return () => document.removeEventListener('keydown', fn);
	}, [open]);

	useLayoutEffect(() => {
		if (!open || !triggerRef.current) return;

		const place = () => {
			const rect = triggerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const panelW = 320;
			const pad = 8;
			let left = isRTL ? rect.left - panelW - pad : rect.right + pad;

			if (!isRTL && left + panelW > window.innerWidth - pad) left = rect.left - panelW - pad;
			if (isRTL && left < pad) left = rect.right + pad;

			const approxH = 460;
			let bottom = window.innerHeight - rect.bottom;

			if (rect.bottom - approxH < pad) bottom = window.innerHeight - rect.top - approxH;
			setPanelPos({ left, bottom: Math.max(pad, bottom) });
		};

		place();
	}, [open, isRTL]);

	const xFrom = isRTL ? 8 : -8;

	return (
		<div style={{
			position: 'relative',
			display: collapsed ? 'flex' : 'block',
			justifyContent: collapsed ? 'center' : undefined
		}}>
			<motion.button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen((v) => !v)}
				whileHover={{ scale: collapsed ? 1.07 : 1.005 }}
				whileTap={{ scale: collapsed ? 0.95 : 0.995 }}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					cursor: 'pointer',
					border: 'none',
					transition: 'all .18s',
					...(collapsed
						? { width: 40, height: 40, borderRadius: 11, justifyContent: 'center' }
						: { width: '100%', height: 36, borderRadius: 11, padding: '0 10px' }),
					...(open ? {
						background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
						color: '#fff',
						boxShadow: '0 3px 12px color-mix(in srgb, var(--color-primary-500) 35%, transparent)',
					} : {
						background: T.bgSub,
						color: 'var(--color-primary-600)',
						boxShadow: `inset 0 0 0 1px ${T.border}`,
					}),
				}}
			>
				<Palette style={{ width: 14, height: 14, flexShrink: 0 }} strokeWidth={2} />

				{!collapsed && (
					<>
						<span style={{ fontSize: 12, fontWeight: 700, flex: 1, letterSpacing: '0.02em' }}>Theme</span>
						<div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
							{currentPalette && [currentPalette.primary[500], currentPalette.secondary[500], currentPalette.primary[300]].map((c, i) => (
								<span key={i} style={{
									width: 8,
									height: 8,
									borderRadius: 3,
									background: c,
									boxShadow: '0 0 0 1px rgba(255,255,255,.4)'
								}} />
							))}
						</div>
						<motion.span animate={{ rotate: open ? 180 : 0 }} transition={snap}>
							<ChevronDown style={{ width: 13, height: 13, flexShrink: 0 }} strokeWidth={2.5} />
						</motion.span>
					</>
				)}
			</motion.button>

			{open && typeof window !== 'undefined' && createPortal(
				<ThemePanel
					ref={panelRef}
					themeEntries={themeEntries}
					currentTheme={currentTheme}
					currentPalette={currentPalette}
					onSelect={(key) => {
						setTheme(key);
						setTimeout(() => setOpen(false), 250);
					}}
					pos={panelPos}
					xFrom={xFrom}
				/>,
				document.body
			)}
		</div>
	);
}

/* ─── ThemePanel ─────────────────────────────────────────────── */
const ThemePanel = React.forwardRef(function ThemePanel(
	{ themeEntries, currentTheme, currentPalette, onSelect, pos, xFrom },
	ref
) {
	return (
		<AnimatePresence>
			<motion.div
				ref={ref}
				initial={{ opacity: 0, x: xFrom, scale: 0.96 }}
				animate={{ opacity: 1, x: 0, scale: 1 }}
				exit={{ opacity: 0, x: xFrom, scale: 0.96 }}
				transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
				className='rtl:right-[10px] ltr:left-[10px]'
				style={{
					position: 'fixed',
					bottom: pos?.bottom ?? 16,
					// left: pos?.left ?? 300,
					zIndex: 9999,
					width: 320,
					borderRadius: 16,
					overflow: 'hidden',
					background: '#fff',
					border: `1.5px solid ${T.border}`,
					boxShadow: '0 24px 64px rgba(15,23,42,0.1), 0 6px 20px rgba(15,23,42,0.06)',
				}}
			>
				<div style={{
					padding: '14px 16px 12px',
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					borderBottom: `1px solid ${T.bgSub}`
				}}>
					<div style={{
						width: 34,
						height: 34,
						borderRadius: 10,
						display: 'grid',
						placeContent: 'center',
						color: '#fff',
						flexShrink: 0,
						background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
						boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 35%, transparent)'
					}}>
						<Paintbrush style={{ width: 15, height: 15 }} strokeWidth={2.5} />
					</div>
					<div>
						<p style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: '0.01em' }}>Color Theme</p>
						<p style={{
							fontSize: 9.5,
							fontWeight: 700,
							textTransform: 'uppercase',
							letterSpacing: '0.18em',
							color: T.textMuted,
							marginTop: 2
						}}>
							{themeEntries.length} palettes available
						</p>
					</div>
				</div>

				<div style={{ padding: 12, maxHeight: 370, overflowY: 'auto', scrollbarWidth: 'thin' }}>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
						{themeEntries.map(([key, palette], idx) => {
							const isActive = currentTheme === key;

							return (
								<motion.button
									key={key}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: idx * 0.022 }}
									whileHover={{ scale: 1.03, y: -1 }}
									whileTap={{ scale: 0.97 }}
									onClick={() => onSelect(key)}
									style={{
										position: 'relative',
										borderRadius: 11,
										overflow: 'hidden',
										textAlign: 'left',
										cursor: 'pointer',
										border: isActive ? `2px solid ${palette.primary[400]}` : `1.5px solid #f1f5f9`,
										background: isActive ? palette.primary[50] : '#fafafa',
										boxShadow: isActive
											? `0 4px 16px color-mix(in srgb, ${palette.primary[400]} 22%, transparent)`
											: '0 1px 4px rgba(0,0,0,0.04)',
									}}
								>
									<div style={{
										height: 42,
										position: 'relative',
										overflow: 'hidden',
										background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})`
									}}>
										<motion.div
											animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
											transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
											style={{
												position: 'absolute',
												inset: 0,
												background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.3) 50%, transparent 100%)',
												backgroundSize: '200% 100%'
											}}
										/>

										{isActive && (
											<motion.div
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												transition={snap}
												style={{
													position: 'absolute',
													top: 6,
													right: 6,
													width: 20,
													height: 20,
													borderRadius: '50%',
													background: 'white',
													display: 'grid',
													placeContent: 'center',
													boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
												}}
											>
												<Check style={{ width: 11, height: 11, color: palette.primary[500] }} strokeWidth={3} />
											</motion.div>
										)}
									</div>

									<div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 9px' }}>
										{[palette.primary[500], palette.secondary[500], palette.primary[300]].map((c, i) => (
											<span key={i} style={{
												width: 13,
												height: 13,
												borderRadius: 4,
												background: c,
												boxShadow: '0 0 0 1px rgba(0,0,0,.06)'
											}} />
										))}
										{isActive && (
											<span style={{
												marginLeft: 'auto',
												fontSize: 9,
												fontWeight: 900,
												textTransform: 'uppercase',
												letterSpacing: '0.1em',
												color: palette.primary[500]
											}}>
												Active
											</span>
										)}
									</div>
								</motion.button>
							);
						})}
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
});

/* ─── Divider ────────────────────────────────────────────────── */
function Divider() {
	return <div style={{ margin: '4px 12px', height: 1, background: T.border }} />;
}

/* ─── SidebarFooter ──────────────────────────────────────────── */
function SidebarFooter({ collapsed, onLogout, logoutLabel }) {
	const isRTL = getDir() === 'rtl';

	return (
		<div style={{ flexShrink: 0, borderTop: `1px solid ${T.border}`, background: T.bgSub }}>
			<div style={{
				padding: collapsed ? '10px 8px 6px' : '10px 10px 6px',
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				alignItems: collapsed ? 'center' : 'stretch',
			}}>
				<SidebarLanguageToggle collapsed={collapsed} />
				<SidebarThemeSwitcher collapsed={collapsed} />
			</div>

			<div style={{
				padding: collapsed ? '0 8px 10px' : '0 10px 10px',
				display: 'flex',
				justifyContent: collapsed ? 'center' : 'stretch'
			}}>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.97 }}
					onClick={onLogout}
					style={{
						position: 'relative',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8,
						borderRadius: 11,
						fontWeight: 600,
						fontSize: 13,
						overflow: 'hidden',
						cursor: 'pointer',
						border: 'none',
						color: 'white',
						letterSpacing: '0.02em',
						...(collapsed ? { width: 40, height: 40 } : { width: '100%', height: 36, padding: '0 14px' }),
						background: 'linear-gradient(135deg, #ef4444, #dc2626)',
						boxShadow: '0 3px 10px rgba(239,68,68,0.28)',
					}}
					onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.4)'}
					onMouseLeave={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(239,68,68,0.28)'}
				>
					<motion.div
						style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
						animate={{ backgroundPosition: ['-200% -200%', '300% 300%'] }}
						transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
					>
						<div style={{
							width: '100%',
							height: '100%',
							background: 'linear-gradient(45deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
							backgroundSize: '300% 300%'
						}} />
					</motion.div>

					<LogOut
						style={{
							position: 'relative',
							zIndex: 1,
							width: 15,
							height: 15,
							transform: isRTL ? 'scaleX(-1)' : 'none',
							flexShrink: 0
						}}
						strokeWidth={2}
					/>

					{!collapsed && <span style={{ position: 'relative', zIndex: 1 }}>{logoutLabel}</span>}
				</motion.button>
			</div>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════
	 MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({
	open,
	setOpen,
	collapsed: collapsedProp,
	setCollapsed: setCollapsedProp
}) {
	const pathname = useNextPathname();
	const searchParams = useSearchParams();
	const router = useI18nRouter();
	const user = useUser();
	const role = user?.role ?? null;
	const t = useTranslations('nav');
	const t_header = useTranslations('header');
	const { totalUnread } = useUnreadChats();

	const [collapsedLS, setCollapsedLS] = useLocalStorageState('sidebar:collapsed', false);
	const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : collapsedLS;
	const setCollapsed = typeof setCollapsedProp === 'function' ? setCollapsedProp : setCollapsedLS;

	const sections = useMemo(() => {
		if (!role) return null;
		return NAV.filter((s) => s.role === role);
	}, [role]);

	const onNavigate = () => setOpen && setOpen(false);
	const logoutLabel = t_header('actions.signOut');

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			['user', 'accessToken', 'refreshToken'].forEach(k => localStorage.removeItem(k));
		} catch (err) {
			console.error('Logout failed:', err);
		} finally {
			router.push('/auth');
		}
	};

	/* ── DESKTOP ── */
	const DesktopSidebar = (
		<aside
			className="hidden lg:flex flex-col shrink-0 rtl:border-l ltr:border-r"
			style={{
				width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
				height: '100vh',
				position: 'relative',
				zIndex: 1000,
				overflow: 'hidden',
				background: T.bg,
				borderColor: T.border,
				boxShadow: '2px 0 16px rgba(15,23,42,0.04)',
				transition: 'width .3s cubic-bezier(0.22,1,0.36,1)',
			}}
		>
			<div style={{
				position: 'absolute',
				inset: 0,
				pointerEvents: 'none',
				zIndex: 0,
				backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
				backgroundSize: '24px 24px',
				opacity: 0.3,
			}} />

			<div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
				<div style={{ flexShrink: 0, marginTop: 10 }}>
					<UserProfileCard user={user} collapsed={collapsed} setCollapsed={setCollapsed} />
				</div>

				<Divider />

				<LayoutGroup id="sidebar-desktop">
					<div style={{ flex: 1, overflow: 'hidden', padding: '4px 0' }}>
						<ScrollShadow>
							<nav style={{
								padding: '2px 8px',
								display: 'flex',
								flexDirection: 'column',
								gap: collapsed ? 0 : 4
							}}>
								{sections?.map((section) => (
									<NavSection
										key={section.sectionKey || section.items[0]?.nameKey}
										sectionKey={section.sectionKey}
										items={section.items}
										pathname={pathname}
										searchParams={searchParams}
										onNavigate={onNavigate}
										collapsed={collapsed}
										t={t}
										totalUnread={totalUnread}
									/>
								))}
							</nav>
						</ScrollShadow>
					</div>
				</LayoutGroup>

				<SidebarFooter collapsed={collapsed} onLogout={handleLogout} logoutLabel={logoutLabel} />
			</div>
		</aside>
	);

	/* ── MOBILE DRAWER ── */
	const MobileDrawer = (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="overlay"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={() => setOpen && setOpen(false)}
						className="fixed inset-0 z-40 lg:hidden"
						style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(5px)' }}
					/>

					<motion.aside
						key="drawer"
						initial={{ x: -300 }}
						animate={{ x: 0 }}
						exit={{ x: -300 }}
						transition={slide}
						className="fixed z-50 top-0 left-0 h-dvh flex flex-col lg:hidden"
						style={{
							width: 280,
							background: T.bg,
							borderRight: `1px solid ${T.border}`,
							boxShadow: '16px 0 48px rgba(15,23,42,0.1)'
						}}
					>
						<div style={{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							height: 3,
							zIndex: 2,
							background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to), transparent)',
							opacity: 0.7
						}} />

						<div style={{
							flexShrink: 0,
							height: 58,
							padding: '0 14px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							borderBottom: `1px solid ${T.border}`
						}}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
								<Link
									href="/"
									style={{
										width: 32,
										height: 32,
										borderRadius: 9,
										display: 'grid',
										placeContent: 'center',
										color: '#fff',
										background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
										boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 35%, transparent)'
									}}
								>
									<LayoutDashboard style={{ width: 15, height: 15 }} strokeWidth={2.5} />
								</Link>

								<span style={{ fontSize: 12.5, fontWeight: 800, color: T.text, letterSpacing: '0.01em' }}>
									{role === 'super_admin' && t('brand.superAdminPortal')}
									{role === 'admin' && t('brand.adminPortal')}
									{role === 'coach' && t('brand.coachPortal')}
									{role === 'client' && t('brand.clientPortal')}
								</span>
							</div>

							<motion.button
								whileHover={{ scale: 1.09 }}
								whileTap={{ scale: 0.93 }}
								onClick={() => setOpen(false)}
								style={{
									width: 28,
									height: 28,
									borderRadius: 8,
									border: `1px solid ${T.border}`,
									background: T.bgSub,
									color: T.textMuted,
									display: 'grid',
									placeContent: 'center',
									cursor: 'pointer'
								}}
							>
								<X style={{ width: 14, height: 14 }} strokeWidth={2.5} />
							</motion.button>
						</div>

						<LayoutGroup id="sidebar-mobile">
							<div style={{ flex: 1, overflow: 'hidden' }}>
								<ScrollShadow>
									<nav style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
										{sections?.map((section) => (
											<NavSection
												key={section.sectionKey || section.items[0]?.nameKey}
												sectionKey={section.sectionKey}
												items={section.items}
												pathname={pathname}
												searchParams={searchParams}
												onNavigate={onNavigate}
												t={t}
												totalUnread={totalUnread}
											/>
										))}
									</nav>
								</ScrollShadow>
							</div>
						</LayoutGroup>

						<SidebarFooter collapsed={false} onLogout={handleLogout} logoutLabel={logoutLabel} />
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);

	return <div style={{boxShadow:"rgba(50,50,93,.14) 0px 20px 60px -12px, rgba(0,0,0,.14) 0px 14px 36px -24px"}} >{DesktopSidebar}{MobileDrawer}</div>;
}