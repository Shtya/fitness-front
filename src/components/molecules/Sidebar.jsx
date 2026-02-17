'use client';

import React, { useLayoutEffect, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/utils/axios';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup, useAnimationControls } from 'framer-motion';
import {
	LayoutDashboard,
	Users,
	User as UserIcon,
	ClipboardList,
	Apple,
	NotebookPen,
	MessageSquare,
	Calculator,
	FileBarChart,
	ChefHat,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	X,
	Newspaper,
	ServerCog,
	AlarmClock,
	Wallet,
	CreditCard,
	TrendingUp,
	User,
	KanbanSquare,
	ListTodo,
	CalendarDays,
	Clock,
	Maximize2,
	Minimize2,
	LogOut,
	Icon,
	Menu,
	Sparkles,
} from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaInbox, FaUsers, FaWpforms } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { useValues } from '@/context/GlobalContext';
import ThemeSwitcher from './ThemeSwitcher';
import { cn } from '@/utils/cn';
import LanguageToggle from '../atoms/LanguageToggle';
import { useRouter } from '@/i18n/navigation';
import MultiLangText from '../atoms/MultiLangText';

const spring = { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 };
const flyoutSpring = { type: 'spring', stiffness: 550, damping: 35, mass: 0.6 };
const smoothSpring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 };

function initialsFrom(name, email) {
	const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
	const parts = src.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return src.slice(0, 2).toUpperCase();
}

function isPathActive(pathname, href) {
	if (!href) return false;
	return pathname === href || pathname?.endsWith(href + '/');
}

function anyChildActive(pathname, children = []) {
	return children.some((c) => isPathActive(pathname, c.href));
}

function useLocalStorageState(key, initialValue) {
	const [value, setValue] = useState(() => {
		try {
			const v = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
			return v == null ? initialValue : JSON.parse(v);
		} catch {
			return initialValue;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch { }
	}, [key, value]);

	return [value, setValue];
}

function getDir() {
	if (typeof document === 'undefined') return 'ltr';
	return document.documentElement.getAttribute('dir') || 'ltr';
}

export const NAV = [
	// CLIENT
	{
		role: 'client',
		sectionKey: 'sections.dashboard',
		items: [
			{ nameKey: 'overview', href: '/dashboard', icon: LayoutDashboard },
		],
	},
	{
		role: 'client',
		sectionKey: 'sections.myWorkspace',
		items: [
			{ nameKey: 'myWorkouts', href: '/dashboard/my/workouts', icon: ClipboardList }, //
			{ nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple }, //
			{ nameKey: 'myReminders', href: '/dashboard/reminders', icon: AlarmClock }, //
			{ nameKey: 'weeklyStrength', href: '/dashboard/my/report', icon: Newspaper }, //
		],
	},
	{
		role: 'client',
		sectionKey: 'sections.tools',
		items: [
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },  //
			{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare }, //
		],
	},
	{
		role: 'client',
		sectionKey: 'sections.account',
		items: [
			{ nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon }, //
		],
	},

	// COACH
	{
		role: 'coach',
		sectionKey: 'sections.timeManagement',
		items: [
			{
				nameKey: 'timeManagement',
				icon: Clock,
				expand: false,
				children: [
					{ nameKey: 'kanbanBoard', href: '/workspace?tab=boards', icon: KanbanSquare },
					{ nameKey: 'todos', href: '/workspace?tab=tasks', icon: ListTodo },
					{ nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays },
				],
			},
		],
	},
	{
		role: 'coach',
		sectionKey: 'sections.clients',
		items: [
			{ nameKey: 'allUsers', href: '/dashboard/users', icon: Users },//
			{ nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },//
		],
	},
	{
		role: 'coach',
		sectionKey: 'sections.programs',
		items: [
			{ nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },//
			{ nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat },//
			{ nameKey: 'reports', href: '/dashboard/reports', icon: FileBarChart },//
		],
	},
	{
		role: 'coach',
		sectionKey: 'sections.clientIntake',
		items: [
			{
				nameKey: 'clientIntake',
				icon: FaUsers,
				expand: false,
				children: [
					{ nameKey: 'manageForms', href: '/dashboard/intake/forms', icon: FaWpforms },//
					{ nameKey: 'responses', href: '/dashboard/intake/responses', icon: FaInbox },//
				],
			},
		],
	},
	{
		role: 'coach',
		sectionKey: 'sections.tools',
		items: [
			{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },//
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },//
		],
	},
	{
		role: 'coach',
		sectionKey: 'sections.account',
		items: [
			{ nameKey: 'profile', icon: User, href: '/dashboard/my-account' }, //
		],
	},

	// ADMIN
	{
		role: 'admin',
		sectionKey: 'sections.timeManagement',
		items: [
			{
				nameKey: 'timeManagement',
				icon: Clock,
				expand: false,
				children: [
					{ nameKey: 'kanbanBoard', href: '/workspace?tab=boards', icon: KanbanSquare },
					{ nameKey: 'todos', href: '/workspace?tab=tasks', icon: ListTodo },
					{ nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays },
				],
			},
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.management',
		items: [
			{ nameKey: 'allUsers', href: '/dashboard/users', icon: Users }, //
			{ nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList }, //
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.programs',
		items: [
			{ nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen }, //
			{ nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat }, //
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.clientIntake',
		items: [
			{
				nameKey: 'clientIntake',
				icon: FaUsers,
				expand: false,
				children: [
					{ nameKey: 'manageForms', href: '/dashboard/intake/forms', icon: FaWpforms }, //
					{ nameKey: 'responses', href: '/dashboard/intake/responses', icon: FaInbox }, //
				],
			},
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.tools',
		items: [
			{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare }, //
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator }, //
			{ nameKey: 'reports', href: '/dashboard/reports', icon: FileBarChart }, //
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.system',
		items: [
			{ nameKey: 'systemSettings', href: '/dashboard/settings', icon: ServerCog }, //
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.account',
		items: [
			{ nameKey: 'billing', icon: Wallet, href: '/dashboard/billing' },  //
			{ nameKey: 'profile', icon: User, href: '/dashboard/my-account' },  //
		],
	},

	// SUPER ADMIN
	{
		role: 'super_admin',
		sectionKey: 'sections.dashboard',
		items: [
			{ nameKey: 'overview', href: '/dashboard', icon: LayoutDashboard },
		],
	},
	{
		role: 'super_admin',
		sectionKey: 'sections.management',
		items: [
			{ nameKey: 'allUsers', href: '/dashboard/super-admin/users', icon: Users },
			{ nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
			{ nameKey: 'feedback', href: '/dashboard/super-admin/feedback', icon: MessageSquare },
		],
	},
	{
		role: 'super_admin',
		sectionKey: 'sections.billing',
		items: [
			{
				nameKey: 'billing',
				icon: Wallet,
				expand: false,
				children: [
					{ nameKey: 'analytics', href: '/dashboard/billing/analytics', icon: TrendingUp },
					{ nameKey: 'withdrawalApprovals', href: '/dashboard/billing/withdrawal-approvals', icon: CreditCard },
					{ nameKey: 'allWallets', href: '/dashboard/billing/all-wallets', icon: Users },
				],
			},
		],
	},
	{
		role: 'super_admin',
		sectionKey: 'sections.timeManagement',
		items: [
			{
				nameKey: 'timeManagement',
				icon: Clock,
				expand: false,
				children: [
					{ nameKey: 'kanbanBoard', href: '/workspace?tab=boards', icon: KanbanSquare },
					{ nameKey: 'todos', href: '/workspace?tab=tasks', icon: ListTodo },
					{ nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays },
				],
			},
		],
	},
	{
		role: 'super_admin',
		sectionKey: 'sections.system',
		items: [
			{ nameKey: 'systemSettings', href: '/dashboard/settings', icon: ServerCog },
		],
	},
];

export function useUnreadChats(pollMs = 300000) {
	const [total, setTotal] = useState(0);
	const { conversationId } = useValues();

	async function load() {
		try {
			const unread = await api.get('/chat/unread');
			setTotal(unread?.data?.totalUnread);
		} catch { }
	}

	useEffect(() => {
		load();
		const id = setInterval(load, pollMs);
		return () => clearInterval(id);
	}, [pollMs, conversationId]);

	return { totalUnread: total, reloadUnread: load };
}

function Badge({ value, className = '' }) {
	const text = value > 99 ? '99+' : String(value);
	return (
		<motion.span
			initial={{ scale: 0 }}
			animate={{ scale: 1 }}
			className={cn(
				'inline-flex min-w-6 h-6 items-center justify-center rounded-full text-[11px] font-black',
				'bg-gradient-to-br from-red-500 to-rose-600 text-white px-2 shadow-lg shadow-red-500/40',
				className
			)}
			aria-label={`${value} unread`}>
			{text}
		</motion.span>
	);
}

export function CollapsedTooltip({ label, anchorRef, offset = 12 }) {
	const [mounted, setMounted] = useState(false);
	const [pos, setPos] = useState(null);
	const tipRef = useRef(null);

	const dir = useMemo(() => getDir(), []);
	const isRTL = dir === 'rtl';

	useEffect(() => setMounted(true), []);

	useLayoutEffect(() => {
		if (!mounted || !anchorRef?.current || !tipRef.current) return;

		const rect = anchorRef.current.getBoundingClientRect();
		const tipRect = tipRef.current.getBoundingClientRect();
		const top = rect.top + rect.height / 4;
		let left = isRTL ? rect.left - tipRect.width - offset : rect.right + offset;

		const padding = 8;
		const minLeft = padding;
		const maxLeft = window.innerWidth - tipRect.width - padding;
		left = Math.max(minLeft, Math.min(left, maxLeft));

		setPos({ top, left });
	}, [mounted, anchorRef, label, offset, isRTL]);

	if (!mounted) return null;

	const content = (
		<motion.div
			ref={tipRef}
			initial={{ opacity: 0, x: isRTL ? 8 : -8, scale: 0.96 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: isRTL ? 8 : -8, scale: 0.96 }}
			transition={spring}
			style={{
				position: 'fixed',
				top: pos?.top ?? -9999,
				left: pos?.left ?? -9999,
				transform: 'translateY(-50%)',
				zIndex: 9999,
				pointerEvents: 'none',
			}}>
			<div className="relative rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white text-xs font-semibold px-3 py-2 shadow-2xl shadow-slate-900/60 border border-slate-700/50 backdrop-blur-sm">
				{label}
				<div
					className={cn(
						'absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900',
						'border-slate-700/50',
						isRTL ? '-right-1 border-r border-t' : '-left-1 border-l border-b'
					)}
				/>
			</div>
		</motion.div>
	);

	return createPortal(content, document.body);
}

function Flyout({ children, align = 'start' }) {
	return (
		<motion.div
			role="menu"
			initial={{ opacity: 0, x: -12, scale: 0.96 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: -12, scale: 0.96 }}
			transition={flyoutSpring}
			className={cn(
				'absolute z-50 top-0 ms-[76px] min-w-[280px] rounded-lg border-2 overflow-hidden',
				'bg-white/98 backdrop-blur-xl shadow-2xl',
				'border-slate-200/80',
				align === 'end' && 'origin-top-left'
			)}>
			{children}
		</motion.div>
	);
}

function ScrollShadow({ children }) {
	const ref = useRef(null);
	const [atTop, setAtTop] = useState(true);
	const [atBottom, setAtBottom] = useState(false);

	const onScroll = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const { scrollTop, scrollHeight, clientHeight } = el;
		setAtTop(scrollTop <= 0);
		setAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		onScroll();
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	}, [onScroll]);

	return (
		<div className="relative h-full">
			<div
				ref={ref}
				className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
				{children}
			</div>

			<div
				className={cn(
					'pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent transition-opacity duration-300',
					atTop ? 'opacity-0' : 'opacity-100'
				)}
			/>
			<div
				className={cn(
					'pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent transition-opacity duration-300',
					atBottom ? 'opacity-0' : 'opacity-100'
				)}
			/>
		</div>
	);
}

function NavItem({ item, pathname, depth = 0, onNavigate, collapsed = false, t, totalUnread }) {
	const Icon = item.icon || LayoutDashboard;
	const hasChildren = Array.isArray(item.children) && item.children.length > 0;
	const label = t(`items.${item.nameKey}`);
	const [open, setOpen] = useState(false);
	const [hover, setHover] = useState(false);
	const liRef = useRef(null);

	useEffect(() => {
		if (collapsed) return;
		if (hasChildren) {
			if (item.expand) setOpen(true);
			else setOpen(anyChildActive(pathname, item.children) || isPathActive(pathname, item.href));
		}
	}, [pathname, collapsed, hasChildren, item.expand, item.children, item.href]);

	const onKeyToggle = (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setOpen((v) => !v);
		}
	};

	if (collapsed) {
		const firstChildHref = hasChildren ? item.children.find((c) => c.href)?.href : null;
		const href = hasChildren ? firstChildHref : item.href;
		const active = isPathActive(pathname, href || '');

		return (
			<div
				ref={liRef}
				className="relative group"
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}>
				{href ? (
					<Link href={href} onClick={onNavigate} className="block">
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.98 }}
							className={cn(
								'relative py-1 flex items-center justify-center rounded-lg transition-all duration-300 border-1',
								active
									? 'border-[var(--color-primary-400)] shadow-xl text-white'
									: 'border-transparent text-slate-600 hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 hover:border-slate-200'
							)}
							style={
								active
									? {
										background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
										boxShadow: `0 10px 30px -10px var(--color-primary-500)`,
									}
									: {}
							}>
							<div
								className={cn(
									'grid place-content-center flex-none !w-11 h-11 rounded-lg transition-all duration-300',
									active ? '' : 'text-[var(--color-primary-700)]'
								)}
								style={!active ? { backgroundColor: `var(--color-primary-50)` } : {}}>
								<Icon className={`${active ? "size-6" : ""}`} strokeWidth={active ? 2.5 : 2} />
							</div>

							{active && (
								<motion.span
									layoutId="active-pill"
									className="absolute inset-y-2 ltr:-right-[8px] rtl:-left-[8px] w-1 rounded-full shadow-lg"
									transition={spring}
									style={{
										background: `linear-gradient(180deg, var(--color-primary-400), var(--color-secondary-500))`,
										boxShadow: `0 0 20px var(--color-primary-500)`,
									}}
								/>
							)}
						</motion.div>
					</Link>
				) : (
					<button type="button" className="w-full">
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.98 }}
							className="relative flex items-center justify-center rounded-lg p-2.5 transition-all duration-300 border-2 border-transparent text-slate-600 hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 hover:border-slate-200">
							<div
								className="grid place-content-center w-10 h-10 rounded-lg text-[var(--color-primary-700)]"
								style={{ backgroundColor: `var(--color-primary-50)` }}>
								<Icon className="size-5" strokeWidth={2} />
							</div>
						</motion.div>
					</button>
				)}

				<AnimatePresence>{hover && !hasChildren && <CollapsedTooltip label={label} anchorRef={liRef} />}</AnimatePresence>

				<AnimatePresence>
					{hover && hasChildren && (
						<Flyout>
							<div className="py-3">
								<div className="px-4 pb-3 flex items-center gap-2">
									<span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
									<div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
								</div>
								<div className="px-2.5 space-y-1">
									{item.children.map((child) => {
										const A = child.icon || LayoutDashboard;
										const activeChild = isPathActive(pathname, child.href);
										return (
											<Link
												key={child.href}
												href={child.href}
												onClick={onNavigate}
												className={cn(
													'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 group',
													activeChild
														? 'shadow-sm text-[var(--color-primary-900)]'
														: 'hover:bg-slate-50 text-slate-700'
												)}
												style={
													activeChild
														? {
															background: `linear-gradient(90deg, var(--color-primary-50), var(--color-secondary-50))`,
															'--tw-ring-color': `var(--color-primary-200)`,
														}
														: {}
												}>
												<span
													className={cn(
														'grid place-content-center w-9 h-9 rounded-lg transition-all duration-200',
														activeChild
															? 'text-white shadow-md'
															: 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
													)}
													style={
														activeChild
															? {
																background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
																boxShadow: `0 4px 12px -2px var(--color-primary-500)`,
															}
															: {}
													}>
													<A className="size-4" strokeWidth={activeChild ? 2.5 : 2} />
												</span>
												<span className="text-sm font-semibold truncate flex-1">{t(`items.${child.nameKey}`)}</span>
												{activeChild && (
													<motion.div
														layoutId="flyout-active"
														className="w-1.5 h-1.5 rounded-full"
														transition={spring}
														style={{ backgroundColor: `var(--color-primary-600)` }}
													/>
												)}
											</Link>
										);
									})}
								</div>
							</div>
						</Flyout>
					)}
				</AnimatePresence>
			</div>
		);
	}

	if (!hasChildren) {
		const active = isPathActive(pathname, item.href);
		return (
			<Link href={item.href} onClick={onNavigate} className="block group">
				<motion.div
					whileHover={{ x: active ? 0 : 4 }}
					whileTap={{ scale: 0.98 }}
					className={cn(
						'relative flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-300 border-2 overflow-visible',
						active
							? 'border-[var(--color-primary-200)] text-[var(--color-primary-900)] shadow-lg'
							: 'border-transparent text-slate-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:border-slate-200'
					)}
					style={
						active
							? {
								background: `linear-gradient(90deg, var(--color-primary-50), var(--color-primary-50), var(--color-secondary-50))`,
							}
							: {}
					}
					aria-current={active ? 'page' : undefined}>
					{active && (
						<motion.span
							layoutId="active-rail"
							className="absolute inset-y-2 ltr:-left-[8px] rtl:-right-[8px] w-1 rounded-full shadow-lg"
							transition={spring}
							style={{
								background: `linear-gradient(180deg, var(--color-primary-500), var(--color-secondary-600))`,
								boxShadow: `0 0 20px var(--color-primary-500)`,
							}}
						/>
					)}

					<div
						className={cn(
							'relative z-10 grid place-content-center w-9 h-9 rounded-lg transition-all duration-300',
							active ? 'text-white shadow-md scale-105' : 'text-[var(--color-primary-700)] group-hover:scale-105'
						)}
						style={
							active
								? {
									background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
									boxShadow: `0 4px 12px -2px var(--color-primary-500)`,
								}
								: {
									backgroundColor: `var(--color-primary-50)`,
								}
						}>
						<Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
					</div>

					<div className="relative z-10 flex-1 font-semibold truncate text-sm">{label}</div>

					{item.nameKey === 'messages' && totalUnread > 0 && (
						<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative z-10">
							<Badge value={totalUnread} />
						</motion.div>
					)}

					{active && (
						<motion.div
							className="absolute right-3 opacity-30"
							animate={{ x: [0, 4, 0] }}
							transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
							style={{ color: `var(--color-primary-600)` }}>
							<ChevronRight className="size-4" />
						</motion.div>
					)}
				</motion.div>
			</Link>
		);
	}

	return (
		<div className="w-full">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				onKeyDown={onKeyToggle}
				className={cn(
					'w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-300 border-2',
					open
						? 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-900 border-slate-200 shadow-sm'
						: 'text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-200'
				)}
				aria-expanded={open}>
				<span
					className={cn(
						'grid place-content-center w-9 h-9 rounded-lg transition-all duration-300',
						open ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700' : 'text-[var(--color-primary-700)]'
					)}
					style={!open ? { backgroundColor: `var(--color-primary-50)` } : {}}>
					<Icon className="size-5" strokeWidth={2} />
				</span>
				<span className="rtl:text-right flex-1 font-bold truncate text-sm">{label}</span>
				<motion.span
					initial={false}
					animate={{ rotate: open ? 180 : 0 }}
					transition={spring}
					className={cn('transition-colors', open ? 'text-slate-700' : 'text-slate-400')}>
					<ChevronDown className="size-4" />
				</motion.span>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						key="submenu"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={smoothSpring}
						className="overflow-hidden">
						<ul
							className={cn(
								'relative ltr:ml-2 rtl:mr-2 pl-5 mt-1',
								"before:content-[''] before:absolute",
								'ltr:before:left-4 rtl:before:right-4',
								'before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-slate-300 before:via-slate-200 before:to-transparent'
							)}>
							{item.children.map((child, idx) => {
								const isLast = idx === item.children.length - 1;
								return (
									<li
										key={child.href || child.nameKey}
										className={cn(
											'relative',
											isLast &&
											"after:content-[''] after:absolute ltr:after:left-4 rtl:after:right-4 after:bottom-0 after:h-4 after:w-px after:bg-white"
										)}>
										<div
											className={cn(
												'relative',
												"before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:h-px before:w-4 before:bg-slate-200",
												'ltr:before:left-[-1rem] rtl:before:right-[-1rem]'
											)}>
											<NavItem
												item={child}
												pathname={pathname}
												depth={depth + 1}
												onNavigate={onNavigate}
												t={t}
												totalUnread={totalUnread}
											/>
										</div>
									</li>
								);
							})}
						</ul>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function NavSection({ sectionKey, items, pathname, onNavigate, collapsed = false, t, totalUnread = 0 }) {
	return (
		<div className={cn('space-y-1', collapsed ? 'px-1' : 'px-1.5')}>
			{items.map((item) => (
				<NavItem
					key={item.href || item.nameKey}
					item={item}
					pathname={pathname}
					onNavigate={onNavigate}
					collapsed={collapsed}
					t={t}
					totalUnread={totalUnread}
				/>
			))}
		</div>
	);
}

function UserProfileCard({ user, collapsed, setCollapsed }) {
	const t_myProfile = useTranslations('');
	const avatarText = initialsFrom(user?.name, user?.email);
	const isActive = (user?.status || '').toLowerCase() === 'active';

	// if (collapsed) {
	// 	return (
	// 		<div className="px-2 pb-3">
	// 			<motion.div
	// 				whileHover={{ scale: 1.05 }}
	// 				className="relative"
	// 			>
	// 				<div
	// 					className="w-11 h-11 rounded-lg grid place-items-center text-white text-xs font-black shadow-lg relative overflow-hidden mx-auto"
	// 					style={{
	// 						background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
	// 						boxShadow: `0 4px 16px -4px var(--color-primary-500)`,
	// 					}}
	// 				>
	// 					{avatarText}
	// 					<motion.div
	// 						className="absolute inset-0"
	// 						animate={{
	// 							backgroundPosition: ['-100% -100%', '200% 200%'],
	// 						}}
	// 						transition={{
	// 							duration: 3,
	// 							repeat: Infinity,
	// 							ease: 'linear',
	// 						}}
	// 						style={{
	// 							background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
	// 							backgroundSize: '200% 200%',
	// 						}}
	// 					/>
	// 				</div>
	// 				<motion.span
	// 					initial={{ scale: 0 }}
	// 					animate={{ scale: 1 }}
	// 					className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full ring-2 ring-white"
	// 					style={{ background: isActive ? '#10b981' : '#94a3b8' }}
	// 				>
	// 					{isActive && (
	// 						<motion.span
	// 							className="absolute inset-0 rounded-full"
	// 							animate={{
	// 								scale: [1, 1.5, 1],
	// 								opacity: [0.7, 0, 0.7],
	// 							}}
	// 							transition={{
	// 								duration: 2,
	// 								repeat: Infinity,
	// 								ease: 'easeInOut',
	// 							}}
	// 							style={{ background: '#10b981' }}
	// 						/>
	// 					)}
	// 				</motion.span>
	// 			</motion.div>
	// 		</div>
	// 	);
	// }

	return (
		<div className="px-3 pb-3">
			<div
				className={`${!collapsed && "p-4 "} relative rounded-lg border-2 overflow-hidden`}
				style={{
					borderColor: 'var(--color-primary-200)',
					background: `linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))`,
				}}
			>
				<div className="flex items-center gap-3">
					{!collapsed && <div className="relative flex-shrink-0">
						<div
							className="w-12 h-12 rounded-lg grid place-items-center text-white text-sm font-black shadow-lg relative overflow-hidden"
							style={{
								background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
								boxShadow: `0 4px 16px -4px var(--color-primary-500)`,
							}}
						>
							{avatarText}
							<motion.div
								className="absolute inset-0"
								animate={{
									backgroundPosition: ['-100% -100%', '200% 200%'],
								}}
								transition={{
									duration: 3,
									repeat: Infinity,
									ease: 'linear',
								}}
								style={{
									background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
									backgroundSize: '200% 200%',
								}}
							/>
						</div>
						<motion.span
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							className="absolute -right-1 -bottom-1 w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-md"
							style={{ background: isActive ? '#10b981' : '#94a3b8' }}
						>
							{isActive && (
								<motion.span
									className="absolute inset-0 rounded-full"
									animate={{
										scale: [1, 1.5, 1],
										opacity: [0.7, 0, 0.7],
									}}
									transition={{
										duration: 2,
										repeat: Infinity,
										ease: 'easeInOut',
									}}
									style={{ background: '#10b981' }}
								/>
							)}
						</motion.span>
					</div>}

					{!collapsed && <div className="flex-1 min-w-0">
						<MultiLangText className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--color-primary-900)' }} >{user?.name}</MultiLangText>
						<p className="text-[10px] font-semibold leading-tight uppercase tracking-wide truncate" style={{ color: 'var(--color-primary-500)' }} >
							{t_myProfile(`myProfile.roles.${user?.role}`)}
						</p>
					</div>}

					<div className={`${collapsed && " w-full justify-center"} flex items-center gap-2  `}>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setCollapsed((v) => !v)}
							className="inline-flex items-center justify-center rounded-lg border-2 bg-white shadow-sm hover:shadow-md h-10 w-10 transition-all duration-200"
							style={{
								borderColor: 'var(--color-primary-300)',
								color: 'var(--color-primary-600)',
							}}
							title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
						>
							<motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={spring}>
								{collapsed ? (
									<ChevronRight className="w-5 h-5 rtl:scale-x-[-1]" strokeWidth={2.5} />
								) : (
									<ChevronLeft className="w-5 h-5 ltr:scale-x-[-1]" strokeWidth={2.5} />
								)}
							</motion.div>
						</motion.button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Sidebar({ open, setOpen, collapsed: collapsedProp, setCollapsed: setCollapsedProp, focusMode, setFocusMode }) {
	const pathname = usePathname();
	const router = useRouter();
	const user = useUser();
	const role = user?.role ?? null;
	const t = useTranslations('nav');
	const t_header = useTranslations('header');
	const { totalUnread } = useUnreadChats();

	const [collapsedLS, setCollapsedLS] = useLocalStorageState('sidebar:collapsed', false);
	const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : collapsedLS;
	const setCollapsed = typeof setCollapsedProp === 'function' ? setCollapsedProp : setCollapsedLS;
	const [showLogout, setShowLogout] = useState(false);

	const sections = useMemo(() => {
		if (!role) return null;
		return NAV.filter((s) => s.role === role);
	}, [role]);

	const onNavigate = () => setOpen && setOpen(false);

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


	const controls = useAnimationControls();

	const stretchSpring = {
		type: 'spring',
		stiffness: 200,
		damping: 15,
		mass: 0.8
	};

	const handleClick = () => {
		controls.start({
			scaleX: [1, 0.85, 1.15, 1],
			scaleY: [1, 1.2, 0.9, 1],
			transition: { duration: 0.4, ease: "easeOut" }
		});
		setOpen((v) => !v);
	};
	return (
		<>
			{/* DESKTOP SIDEBAR */}
			<aside
				className={cn(
					'rtl:border-l z-[1000] ltr:border-r hidden lg:flex lg:flex-col shrink-0 transition-all duration-500 ease-in-out',
					'bg-white/80 backdrop-blur-xl text-slate-900 relative',
					collapsed ? 'w-[84px]' : 'w-[300px]'
				)}
				style={{
					backdropFilter: 'saturate(180%) blur(20px)',
					WebkitBackdropFilter: 'saturate(180%) blur(20px)',
					borderColor: 'var(--color-primary-200)',
				}}>
				<div
					className="absolute inset-0 pointer-events-none opacity-[0.15]"
					style={{
						background: `linear-gradient(135deg, var(--color-primary-50), transparent, var(--color-secondary-50))`,
					}}
				/>

				<div className="flex h-screen flex-col relative z-10">

					{/* User Profile Card */}
					<div className="pt-4">
						<UserProfileCard setCollapsed={setCollapsed} user={user} collapsed={collapsed} />
					</div>

					{/* Navigation */}
					<LayoutGroup id="sidebar-nav">
						<div className="flex-1 py-2 overflow-auto">
							<ScrollShadow>
								<nav className={cn(collapsed ? 'px-2 space-y-2' : 'px-3 space-y-4')}>
									{sections?.map((section) => (
										<NavSection
											key={section.sectionKey || section.items[0]?.nameKey}
											sectionKey={section.sectionKey}
											items={section.items}
											pathname={pathname}
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

					{/* Footer - Actions */}
					<div className="border-t bg-gradient-to-br from-slate-50/30 to-transparent" style={{ borderColor: 'var(--color-primary-200)', }}>
						<div className={cn("px-3", collapsed && "flex-col")} >
							<div className={cn(" mb-3 mt-3 flex-1", collapsed && "w-full")}>
								<LanguageToggle collapsed={collapsed} />
							</div>
							<div className={cn("flex-1", collapsed && "w-full")}>
								<ThemeSwitcher collapsed={collapsed} />
							</div>
						</div>

						{/* Logout Button */}
						<div className="p-3">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleLogout}
								className={cn(
									"w-full h-11 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 relative overflow-hidden group",
									collapsed && "!h-11"
								)}
								style={{
									background: 'linear-gradient(135deg, #ef4444, #dc2626)',
									boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.5)',
								}}
							>
								<LogOut className={cn(" rtl:scale-x-[-1]", collapsed ? "w-5 h-5" : "w-5 h-5")} strokeWidth={2.5} />
								{!collapsed && <span>{t_header('actions.signOut')}</span>}
								<motion.div
									className="absolute inset-0 opacity-0 group-hover:opacity-100"
									animate={{
										backgroundPosition: ['-100% -100%', '200% 200%'],
									}}
									transition={{
										duration: 1.5,
										repeat: Infinity,
										ease: 'linear',
									}}
									style={{
										background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
										backgroundSize: '200% 200%',
									}}
								/>
							</motion.button>
						</div>
					</div>
				</div>

			</aside>

			 

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
							className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden"
						/>
						<motion.aside
							key="drawer"
							initial={{ x: -320 }}
							animate={{ x: 0 }}
							exit={{ x: -320 }}
							transition={spring}
							className="fixed z-50 top-0 left-0 h-dvh w-[320px] bg-white/95 backdrop-blur-xl text-slate-900 border-r-2 lg:hidden shadow-2xl"
							style={{
								backdropFilter: 'saturate(180%) blur(20px)',
								WebkitBackdropFilter: 'saturate(180%) blur(20px)',
								borderColor: 'var(--color-primary-200)',
							}}>
							<div
								className="absolute inset-0 pointer-events-none opacity-[0.15]"
								style={{
									background: `linear-gradient(135deg, var(--color-primary-50), transparent, var(--color-secondary-50))`,
								}}
							/>

							<div className="relative z-10 h-full flex flex-col">
								{/* Mobile Header */}
								<div
									className="h-20 px-4 border-b-2 flex items-center justify-between bg-white/90"
									style={{
										backdropFilter: 'saturate(180%) blur(20px)',
										WebkitBackdropFilter: 'saturate(180%) blur(20px)',
										borderColor: 'var(--color-primary-200)',
									}}>
									<div className="flex items-center gap-3">
										<motion.div
											whileHover={{ scale: 1.05, rotate: 5 }}
											className="w-11 h-11 rounded-lg grid place-content-center text-white shadow-lg"
											style={{
												background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
												boxShadow: `0 4px 16px -4px var(--color-primary-500)`,
											}}>
											<LayoutDashboard className="w-5 h-5" strokeWidth={2.5} />
										</motion.div>

										<div className="flex flex-col">
											<span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black">
												{t('brand.portalTitle')}
											</span>
											<span className="font-black text-slate-900 text-sm">
												{role === 'super_admin' && t('brand.superAdminPortal')}
												{role === 'admin' && t('brand.adminPortal')}
												{role === 'coach' && t('brand.coachPortal')}
												{role === 'client' && t('brand.clientPortal')}
											</span>
										</div>
									</div>

									<motion.button
										whileHover={{ scale: 1.05, rotate: 90 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => setOpen(false)}
										className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
										style={{
											borderColor: 'var(--color-primary-200)',
										}}>
										<X className="w-4 h-4" strokeWidth={2.5} />
									</motion.button>
								</div>
 

								{/* Mobile Navigation */}
								<LayoutGroup id="sidebar-nav-mobile">
									<div className="flex-1 overflow-hidden">
										<ScrollShadow>
											<nav className="w-full px-3 pt-2 pb-6">
												{sections?.map((section) => (
													<NavSection
														totalUnread={totalUnread}
														key={section.sectionKey || section.items[0]?.nameKey}
														sectionKey={section.sectionKey}
														items={section.items}
														pathname={pathname}
														onNavigate={onNavigate}
														t={t}
													/>
												))}
											</nav>
										</ScrollShadow>
									</div>
								</LayoutGroup>

								{/* Mobile Footer */}
								<div
									className="border-t-2 bg-gradient-to-br from-slate-50/50 to-transparent"
									style={{
										borderColor: 'var(--color-primary-200)',
									}}>
									{/* Language & Theme */}
									<div className="flex items-center gap-2 px-4 py-2 "
										style={{
											borderColor: 'var(--color-primary-200)',
										}}>
										 
										<div className="flex-1">
											<ThemeSwitcher collapsed={false} />
										</div>
									</div>

									{/* Logout */}
									<div className="px-4 pb-2">
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => setShowLogout(true)}
											className="w-full h-12 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 relative overflow-hidden group"
											style={{
												background: 'linear-gradient(135deg, #ef4444, #dc2626)',
												boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.5)',
											}}
										>
											<LogOut className="w-5 h-5  rtl:scale-x-[-1]" strokeWidth={2.5} />
											<span>{t_header('actions.signOut')}</span>
											<motion.div
												className="absolute inset-0 opacity-0 group-hover:opacity-100"
												animate={{
													backgroundPosition: ['-100% -100%', '200% 200%'],
												}}
												transition={{
													duration: 1.5,
													repeat: Infinity,
													ease: 'linear',
												}}
												style={{
													background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
													backgroundSize: '200% 200%',
												}}
											/>
										</motion.button>
									</div>
								</div>
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>
		</>
	);
}