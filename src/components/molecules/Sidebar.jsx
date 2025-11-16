'use client';

import api from '@/utils/axios';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
	LayoutDashboard, Users, User as UserIcon, Dumbbell, ClipboardList, Apple, NotebookPen,
	MessageSquare, Calculator, FileBarChart, ChefHat, ChevronDown, ChevronLeft, ChevronRight, X, LineChart, Newspaper, ServerCog,
	AlarmClock
} from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaInbox, FaRegFilePowerpoint, FaUsers, FaWpforms } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

const spring = { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 };
const flyoutSpring = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 };

function cn(...args) {
	return args.filter(Boolean).join(' ');
}
// utils/cls.ts
export function cls(...inputs) {
	return inputs
		.flat(Infinity)        // handle nested arrays
		.filter(Boolean)       // remove falsy values (false, null, undefined, '')
		.join(' ');            // join into a single className string
}

/* ----------------------------- NAV (unchanged) ----------------------------- */
export const NAV = [
	// CLIENT
	{
		role: 'client',
		sectionKey: 'sections.mySpace',
		items: [
			// { nameKey: 'dashboard', href: '/dashboard/my', icon: LayoutDashboard },
			// {
			// 	nameKey: 'training',
			// 	icon: Dumbbell,
			// 	children: [
			// 		{ nameKey: 'myProgress', href: '/dashboard/my/progress', icon: LineChart },
			// 	],
			// },
			{ nameKey: 'myWorkouts', href: '/dashboard/my/workouts', icon: ClipboardList },
			{ nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple },
			{ nameKey: 'myReminders', href: '/dashboard/reminders', icon: AlarmClock  },
			{ nameKey: 'weeklyStrength', href: '/dashboard/my/report', icon: Newspaper },
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
			{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
			{ nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon },
		],
	},
	// COACH
	{
		role: 'coach',
		sectionKey: 'sections.overview',
		items: [
			{ nameKey: 'allUsers', href: '/dashboard/users', icon: Users },
			{ nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
		],
	},
	{
		role: 'coach',
		sectionKey: 'sections.clientManagement',
		items: [
			{ nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },
			{ nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat },
			{ nameKey: 'reports', href: '/dashboard/reports', icon: FileBarChart },
			{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
		],
	},
	// ADMIN
	{
		role: 'admin',
		sectionKey: 'sections.overview',
		items: [
			{ nameKey: 'allUsers', href: '/dashboard/users', icon: Users },
			{ nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.programs',
		items: [
			{ nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },
			{ nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat },
		],
	},
	{
		role: 'admin',
		items: [
			{
				nameKey: 'clientIntake',
				icon: FaUsers,
				expand: false,
				children: [
					{ nameKey: 'manageForms', href: '/dashboard/intake/forms', icon: FaWpforms },
					{ nameKey: 'responses', href: '/dashboard/intake/responses', icon: FaInbox },
				],
			},
		],
	},
	{
		role: 'admin',
		sectionKey: 'sections.operations',
		items: [
			{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
			{ nameKey: 'reports', href: '/dashboard/reports', icon: FileBarChart },
			{ nameKey: 'systemSettings', href: '/dashboard/settings', icon: ServerCog },
		],
	},
	// SUPER ADMIN
	{
		role: 'super_admin',
		sectionKey: 'sections.overview',
		items: [
			{ nameKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
			{ nameKey: 'allUsers', href: '/dashboard/super-admin/users', icon: Users },
			{ nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
		],
	},
];

/* ----------------------------- helpers ---------------------------------- */
function isPathActive(pathname, href) {
	if (!href) return false;
	return pathname === href || pathname?.endsWith(href + '/');
}
function anyChildActive(pathname, children = []) {
	return children.some(c => isPathActive(pathname, c.href));
}

/* --------------------------- tiny utilities --------------------------- */
function useLocalStorageState(key, initialValue) {
	const [value, setValue] = useState(() => {
		try {
			const v = localStorage.getItem(key);
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

/* ---------------------- Collapsed tooltip + flyout ---------------------- */
function CollapsedTooltip({ label }) {
	return (
		<div className="pointer-events-none absolute start-[68px] top-1/2 -translate-y-1/2 z-50">
			<motion.div
				initial={{ opacity: 0, x: 4 }}
				animate={{ opacity: 1, x: 0 }}
				exit={{ opacity: 0, x: 4 }}
				transition={spring}
				className="rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow-lg"
			>
				{label}
			</motion.div>
		</div>
	);
}

function Flyout({ children, align = 'start' }) {
	return (
		<motion.div
			role="menu"
			initial={{ opacity: 0, y: 4, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 4, scale: 0.98 }}
			transition={flyoutSpring}
			className={cn(
				'absolute z-50 top-0 ms-[68px] min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden',
				align === 'end' && 'origin-top-left'
			)}
		>
			{children}
		</motion.div>
	);
}

/** ----------------------------------------------------------------
 * NavItem (leaf & parent)
 ------------------------------------------------------------------*/
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname, collapsed]);

	const onKeyToggle = (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setOpen(v => !v);
		}
	};

	/* ------------------------- Collapsed mode ------------------------- */
	if (collapsed) {
		const firstChildHref = hasChildren ? item.children.find(c => c.href)?.href : null;
		const href = hasChildren ? firstChildHref : item.href;
		const active = isPathActive(pathname, href || '');
		return (
			<div
				ref={liRef}
				className="relative group"
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
			>
				{href ? (
					<Link href={href} onClick={onNavigate} className="block" aria-label={label} title={label}>
						<div
							className={cn(
								'relative flex items-center justify-center rounded-xl p-0 transition-colors border',
								active
									? 'bg-indigo-50 text-indigo-700 border-indigo-100'
									: 'text-slate-700 hover:bg-slate-50 border-transparent'
							)}
						>
							<div className={cn('grid place-content-center w-10 h-10 rounded-lg',
								active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 group-hover:bg-indigo-50'
							)}>
								<Icon className="size-5" />
							</div>

							{/* Active indicator line */}
							{active && (
								<motion.span
									layoutId="active-pill"
									className="absolute inset-y-1 ltr:-right-[6px] rtl:-left-[6px] w-[3px] rounded-full bg-indigo-600"
								/>
							)}
						</div>
					</Link>
				) : (
					<button
						type="button"
						aria-label={label}
						title={label}
						className="w-full"
					>
						<div className="relative flex items-center justify-center rounded-xl p-1.5 transition-colors border text-slate-700 hover:bg-slate-50 border-transparent">
							<div className="grid place-content-center w-10 h-10 rounded-lg bg-slate-100 text-indigo-600 group-hover:bg-indigo-50">
								<Icon className="size-5" />
							</div>
						</div>
					</button>
				)}

				{/* Tooltip when hovering a leaf; Flyout when parent */}
				<AnimatePresence>
					{hover && !hasChildren && <CollapsedTooltip label={label} />}
				</AnimatePresence>

				<AnimatePresence>
					{hover && hasChildren && (
						<Flyout>
							<div className="py-2">
								<div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
								<div className="px-2 space-y-1">
									{item.children.map(child => {
										const A = child.icon || LayoutDashboard;
										const activeChild = isPathActive(pathname, child.href);
										return (
											<Link
												key={child.href}
												href={child.href}
												onClick={onNavigate}
												className={cn(
													'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200',
													activeChild ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
												)}
											>
												<span className={cn('grid place-content-center w-8 h-8 rounded-md',
													activeChild ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600'
												)}>
													<A className="size-4" />
												</span>
												<span className="text-sm font-medium truncate">{t(`items.${child.nameKey}`)}</span>
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

	/* ------------------------- Expanded mode ------------------------- */
	if (!hasChildren) {
		const active = isPathActive(pathname, item.href);
		return (
			<Link href={item.href} onClick={onNavigate} className="block group">
				<div className={cn('relative overflow-visible flex items-center gap-3 rounded-xl px-3 py-2 transition-colors border', active ? 'text-indigo-700 border-indigo-100' : 'text-slate-700 hover:bg-slate-50 border-transparent')} style={{ paddingInlineStart: depth ? 8 + depth * 14 : 12 }} aria-current={active ? 'page' : undefined} >
					{active && (
						<motion.div
							layoutId="active-bg"
							className="absolute inset-0 rounded-xl bg-indigo-50 border border-indigo-100"
							transition={spring}
						/>
					)}
					{active && (
						<motion.span
							layoutId="active-rail"
							className="absolute inset-y-1 ltr:-left-[6px] rtl:-right-[6px] w-[3px] rounded-full bg-indigo-600"
							transition={spring}
						/>
					)}

					<div className={cn('relative z-10 grid place-content-center w-8 h-8 rounded-lg',
						active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 group-hover:bg-indigo-50'
					)}>
						<Icon className="size-5" />
					</div>
					<div className="relative z-10 flex-1 font-medium truncate">{label}</div>

					{item.nameKey === 'messages' && totalUnread > 0 && (
						<div className="relative z-10">
							<Badge value={totalUnread} />
						</div>
					)}
				</div>
			</Link>
		);
	}
 
	return (
		<div className="w-full">
			<button type="button" onClick={() => setOpen(v => !v)} onKeyDown={onKeyToggle} className={cn('w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors border', open ? 'bg-slate-50 text-slate-800 border-slate-200' : 'hover:bg-slate-50 text-slate-700 border-transparent')} style={{ paddingInlineStart: depth ? 8 + depth * 14 : 12 }} aria-expanded={open} >
				<span className="grid place-content-center w-8 h-8 rounded-lg bg-slate-100 text-indigo-600">
					<Icon className="size-5" />
				</span>
				<span className="rtl:text-right flex-1 font-semibold truncate">{label}</span>
				<motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={spring} className="text-slate-400">
					<ChevronDown className="size-4" />
				</motion.span>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						key="submenu"
						id={`submenu-${item.nameKey || item.href || label}`}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={spring}
						className="overflow-hidden"
					>
						{/* Level rail */}
						<ul
							className={cn(
								"relative ltr:ml-1 rtl:mr-1 pl-5",              // indent for children
								"before:content-[''] before:absolute",           // vertical rail
								"ltr:before:left-3 rtl:before:right-3",
								"before:top-0 before:bottom-0 before:w-px before:bg-slate-200/70"
							)}
						>
							{item.children.map((child, idx) => {
								const isLast = idx === item.children.length - 1;
								return (
									<li
										key={child.href || child.nameKey}
										className={cn(
											"relative py-0.5",
											// hide the rail a bit after the last elbow so it doesn't run past the last item
											isLast &&
											"after:content-[''] after:absolute ltr:after:left-3 rtl:after:right-3 after:bottom-0 after:h-3 after:w-px after:bg-white"
										)}
									>
										{/* elbow connector into each child row */}
										<div
											className={cn(
												"relative",
												"before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:h-px before:w-4 before:bg-slate-200/70",
												"ltr:before:left-[-1rem] rtl:before:right-[-1rem]"
											)}
										>
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

/** ----------------------------------------------------------------
 * Section with translated title + subtle divider
 ------------------------------------------------------------------*/
function NavSection({ sectionKey, items, pathname, onNavigate, collapsed = false, t, totalUnread = 0 }) {
	const sectionLabel = sectionKey ? t(sectionKey) : null;
	return (
		<div className="mb-3">
			{!collapsed && sectionLabel ? (
				<div className="sticky top-0 z-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500/80
                  bg-white/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
					{sectionLabel}
				</div>
			) : null}

			<div className={cn('px-2 space-y-1', collapsed && 'px-1')}>
				{items.map(item => (
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
			{!collapsed && <div className="mt-3 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />}
		</div>
	);
}

/** ----------------------------------------------------------------
 * Scroll shadows (top/bottom)
 ------------------------------------------------------------------*/
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
				className="h-full overflow-y-auto"
			>
				{children}
			</div>

			{/* top shadow */}
			<div className={cn(
				'pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white to-transparent transition-opacity',
				atTop ? 'opacity-0' : 'opacity-100'
			)} />
			{/* bottom shadow */}
			<div className={cn(
				'pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent transition-opacity',
				atBottom ? 'opacity-0' : 'opacity-100'
			)} />
		</div>
	);
}

/** ----------------------------------------------------------------
 * Sidebar root
 ------------------------------------------------------------------*/

export default function Sidebar({ open, setOpen, collapsed: collapsedProp, setCollapsed: setCollapsedProp }) {
	const pathname = usePathname();
	const user = useUser();
	const role = user?.role ?? null;
	const t = useTranslations('nav');
	const { totalUnread } = useUnreadChats();


	// fall back to self-managed collapsed state (persisted)
	const [collapsedLS, setCollapsedLS] = useLocalStorageState('sidebar:collapsed', false);
	const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : collapsedLS;
	const setCollapsed = typeof setCollapsedProp === 'function' ? setCollapsedProp : setCollapsedLS;

	const sections = useMemo(() => {
		if (!role) return null;
		return NAV.filter(s => s.role === role);
	}, [role]);

	const onNavigate = () => setOpen?.(false);

	return (
		<>
			{/* DESKTOP */}
			<aside
				className={cn(
					'bg-white border-x border-slate-200/70 hidden lg:flex lg:flex-col shrink-0 transition-[width] duration-300',
					collapsed ? 'w-[72px]' : 'w-[280px]'
				)}
			>
				
				<div className="flex h-screen flex-col">
					{/* Header */}
					<div
						className={cn(
							'h-[64px] border-b border-slate-200 flex items-center gap-3',
							collapsed ? 'justify-center px-2' : 'justify-between px-3'
						)}
					>
						{!collapsed && (
							<div className="flex items-center gap-2">
								<img src="/logo/logo1.png" alt="Logo" className="w-[56px] object-contain" />
								<span className="font-semibold text-slate-700">{t('items.dashboard')}</span>
							</div>
						)}
						<button
							onClick={() => setCollapsed(v => !v)}
							className={cn(
								'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white active:scale-95 transition h-9 w-9 focus:outline-none focus:ring-2 focus:ring-indigo-200'
							)}
							title={collapsed ? t('tooltips.expand') : t('tooltips.collapse')}
							aria-label={collapsed ? t('tooltips.expand') : t('tooltips.collapse')}
						>
							{collapsed ? <ChevronRight className="w-4 h-4 rtl:scale-x-[-1]" /> : <ChevronLeft className="rtl:scale-x-[-1] w-4 h-4" />}
						</button>
					</div>

					{/* Nav with scroll shadows */}
					<LayoutGroup id="sidebar-nav">
						<div className={cn('flex-1 py-3 overflow-auto', collapsed ? 'px-1' : '')}>
							<ScrollShadow>
								<nav className={cn(collapsed ? 'px-1 space-y-2' : 'px-2 space-y-3')}>
									{sections?.map(section => (
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

				</div>
			</aside>

			{/* MOBILE DRAWER */}
			<AnimatePresence>
				{open && (
					<>
						<motion.div
							key="overlay"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setOpen(false)}
							className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
						/>
						<motion.aside
							key="drawer"
							initial={{ x: -320 }}
							animate={{ x: 0 }}
							exit={{ x: -320 }}
							transition={spring}
							className="fixed z-50 top-0 left-0 h-dvh w-[300px] bg-white border-r border-slate-200 lg:hidden"
							aria-label="Mobile Sidebar"
						>
							<div className="h-[72px] px-4 border-b border-slate-200 flex items-center justify-between">


								<div className="flex items-center gap-2">
									{/* Icon container changes color based on role */}
									<div
										className={cls(
											'size-9 rounded-lg grid place-content-center text-white shadow ring-4',
											role === 'super_admin' && 'bg-gradient-to-br from-purple-600 to-indigo-600 ring-purple-100',
											role === 'admin' && 'bg-gradient-to-br from-blue-600 to-sky-600 ring-blue-100',
											role === 'coach' && 'bg-gradient-to-br from-emerald-600 to-green-500 ring-emerald-100',
											role === 'client' && 'bg-gradient-to-br from-orange-500 to-amber-400 ring-amber-100',
										)}
									>
										<LayoutDashboard className="w-4 h-4" />
									</div>

									{/* Title based on role */}
									<div className="flex flex-col">
										<span className="text-sm text-slate-500 leading-tight">
											{t('brand.portalTitle')}
										</span>
										<span className="font-semibold text-slate-800 text-[15px]">
											{role === 'super_admin' && t('brand.superAdminPortal')}
											{role === 'admin' && t('brand.adminPortal')}
											{role === 'coach' && t('brand.coachPortal')}
											{role === 'client' && t('brand.clientPortal')}
										</span>
									</div>
								</div>



								<button
									onClick={() => setOpen(false)}
									className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-200"
									aria-label={t('tooltips.closeMenu')}
									title={t('tooltips.closeMenu')}
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							<LayoutGroup id="sidebar-nav-mobile">
								<div className="h-[calc(100vh-72px)]">
									<ScrollShadow>
										<nav className="w-full px-2 pt-4 pb-6 space-y-3">
											{sections?.map(section => (
												<NavSection
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
						</motion.aside>
					</>
				)}
			</AnimatePresence>
		</>
	);
}





export function useUnreadChats(pollMs = 300000) {
	const [total, setTotal] = useState(0);

	async function load() {
		try {
			const res = await api.get('/chat/conversations');
			const list = Array.isArray(res.data) ? res.data : [];
			const sum = list.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
			setTotal(sum);
		} catch { }
	}

	useEffect(() => {
		load();
		const id = setInterval(load, pollMs);
		return () => clearInterval(id);
	}, [pollMs]);

	return { totalUnread: total, reloadUnread: load };
}


function Badge({ value, className = '' }) {
	const text = value > 99 ? '99+' : String(value);
	return (
		<span
			className={
				'inline-flex min-w-5 h-5 items-center justify-center rounded-full text-[10px] font-semibold ' +
				'bg-red-600 text-white px-1.5 ' + className
			}
			aria-label={`${value} unread`}
		>
			{text}
		</span>
	);
}
 