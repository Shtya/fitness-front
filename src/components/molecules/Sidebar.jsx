'use client';

import React, { useLayoutEffect,useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/utils/axios';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Users, User as UserIcon, ClipboardList, Apple, NotebookPen, MessageSquare, Calculator, FileBarChart, ChefHat, ChevronDown, ChevronLeft, ChevronRight, X, Newspaper, ServerCog, AlarmClock, RotateCcw, Wallet, CreditCard, TrendingUp, Sparkles, Zap, Crown, Shield } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaInbox, FaUsers, FaWpforms } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { useValues } from '@/context/GlobalContext';
import FeedbackWidget from './FeedbackWidget'; 
const spring = { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 };
const flyoutSpring = { type: 'spring', stiffness: 550, damping: 35, mass: 0.6 };
const smoothSpring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 };

function cn(...args) {
	return args.filter(Boolean).join(' ');
}

export function cls(...inputs) {
	return inputs.flat(Infinity).filter(Boolean).join(' ');
}

/* ----------------------------- NAV (unchanged) ----------------------------- */
export const NAV = [
	// CLIENT
	{
		role: 'client',
		sectionKey: 'sections.mySpace',
		items: [
			{ nameKey: 'myWorkouts', href: '/dashboard/my/workouts', icon: ClipboardList },
			{ nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple },
			{ nameKey: 'myReminders', href: '/dashboard/reminders', icon: AlarmClock },
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
	{
		role: 'admin',
		items: [
			{ nameKey: 'billing', icon: Wallet, href: '/dashboard/billing' },
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
			{ nameKey: 'feedback', href: '/dashboard/super-admin/feedback', icon: MessageSquare },
			{ nameKey: 'systemSettings', href: '/dashboard/settings', icon: ServerCog },
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

/* ---------------------- Enhanced Collapsed tooltip ---------------------- */


function getDir() {
	if (typeof document === "undefined") return "ltr";
	return document.documentElement.getAttribute("dir") || "ltr";
}

export function CollapsedTooltip({ label, anchorRef, offset = 12, spring }) {
	const [mounted, setMounted] = useState(false);
	const [pos, setPos] = useState(null);
	const tipRef = useRef(null);

	const dir = useMemo(() => getDir(), []);
	const isRTL = dir === "rtl";

	useEffect(() => setMounted(true), []);

	// ✅ استخدم layout effect علشان القياس يبقى أدق قبل الرسم
	useLayoutEffect(() => {
		if (!mounted) return;
		if (!anchorRef?.current) return;
		if (!tipRef.current) return;

		const rect = anchorRef.current.getBoundingClientRect();
		const tipRect = tipRef.current.getBoundingClientRect();

		const top = rect.top + rect.height / 4;

		// RTL: tooltip على الشمال — LTR: tooltip على اليمين
		let left = isRTL ? rect.left - tipRect.width - offset : rect.right + offset;

		// ✅ حافظ عليها داخل الشاشة
		const padding = 8;
		const minLeft = padding;
		const maxLeft = window.innerWidth - tipRect.width - padding;
		left = Math.max(minLeft, Math.min(left, maxLeft));

		setPos({ top, left });
	}, [mounted, anchorRef, label, offset, isRTL]);

	if (!mounted) return null;

	// ✅ اعمل Render حتى لو pos لسه null عشان نقيس tipRect
	const content = (
		<motion.div
			ref={tipRef}
			initial={{ opacity: 0, x: isRTL ? 8 : -8, scale: 0.96 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: isRTL ? 8 : -8, scale: 0.96 }}
			transition={spring}
			style={{
				position: "fixed",
				top: pos?.top ?? -9999,
				left: pos?.left ?? -9999,
				transform: "translateY(-50%)",
				zIndex: 9999,
				pointerEvents: "none",
			}}
		>
			<div className="relative rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-xs font-semibold px-3 py-2 shadow-2xl shadow-slate-900/60 border border-slate-700/50 backdrop-blur-sm">
				{label}

				{/* ✅ السهم على الجهة الصحيحة */}
				<div
					className={[
						"absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900",
						"border-slate-700/50",
						isRTL
							? "-right-1 border-r border-t" // سهم ناحية اليمين (لأن tooltip جاية من الشمال)
							: "-left-1 border-l border-b", // سهم ناحية الشمال
					].join(" ")}
				/>
			</div>
		</motion.div>
	);

	return createPortal(content, document.body);
}

/* ---------------------- Enhanced Flyout ---------------------- */
function Flyout({ children, align = 'start' }) {
	return (
		<motion.div
			role='menu'
			initial={{ opacity: 0, x: -12, scale: 0.96 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: -12, scale: 0.96 }}
			transition={flyoutSpring}
			className={cn(
				'absolute z-50 top-0 ms-[76px] min-w-[260px] rounded-2xl border-2 border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 overflow-hidden',
				align === 'end' && 'origin-top-left'
			)}>
			{children}
		</motion.div>
	);
}

/** ----------------------------------------------------------------
 * Enhanced NavItem (leaf & parent)
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

	const onKeyToggle = e => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setOpen(v => !v);
		}
	};

	/* ------------------------- Enhanced Collapsed mode ------------------------- */
	if (collapsed) {
		const firstChildHref = hasChildren ? item.children.find(c => c.href)?.href : null;
		const href = hasChildren ? firstChildHref : item.href;
		const active = isPathActive(pathname, href || '');

		return (
			<div ref={liRef} className='relative group' onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
				{href ? (
					<Link href={href} onClick={onNavigate} className='block' >
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.98 }}
							className={cn(
								'relative flex items-center justify-center rounded-2xl p-2 transition-all duration-300 border-2',
								active
									? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-400/50 text-white shadow-xl shadow-indigo-500/30'
									: 'border-transparent text-slate-600 hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 hover:border-slate-200'
							)}>
							<div className={cn(
								'grid place-content-center w-11 h-11 rounded-xl transition-all duration-300',
								active
									? 'bg-white/20 backdrop-blur-sm text-white'
									: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 group-hover:from-indigo-100 group-hover:to-indigo-200'
							)}>
								<Icon className='size-5' strokeWidth={active ? 2.5 : 2} />
							</div>

							{active && (
								<motion.span
									layoutId='active-pill'
									className='absolute inset-y-2 ltr:-right-[8px] rtl:-left-[8px] w-1 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500 shadow-lg shadow-indigo-500/50'
									transition={spring}
								/>
							)}

							{/* Animated glow effect on active */}
							{active && (
								<motion.div
									className='absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400/20 to-violet-500/20'
									animate={{ opacity: [0.5, 0.8, 0.5] }}
									transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
								/>
							)}
						</motion.div>
					</Link>
				) : (
					<button type='button' className='w-full'>
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.98 }}
							className='relative flex items-center justify-center rounded-2xl p-2 transition-all duration-300 border-2 border-transparent text-slate-600 hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 hover:border-slate-200'>
							<div className='grid place-content-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700'>
								<Icon className='size-5' strokeWidth={2} />
							</div>
						</motion.div>
					</button>
				)}

				<AnimatePresence>{hover && !hasChildren && <CollapsedTooltip label={label} anchorRef={liRef} />}</AnimatePresence>

				{/* Enhanced Flyout for children */}
				<AnimatePresence>
					{hover && hasChildren && (
						<Flyout>
							<div className='py-3'>
								<div className='px-4 pb-3 flex items-center gap-2'>
									<span className='text-[11px] font-black uppercase tracking-[0.2em] text-slate-500'>{label}</span>
									<div className='flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent' />
								</div>
								<div className='px-2.5 space-y-1'>
									{item.children.map(child => {
										const A = child.icon || LayoutDashboard;
										const activeChild = isPathActive(pathname, child.href);
										return (
											<Link
												key={child.href}
												href={child.href}
												onClick={onNavigate}
												className={cn(
													'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 group',
													activeChild
														? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-900 shadow-sm'
														: 'hover:bg-slate-50 text-slate-700'
												)}>
												<span
													className={cn(
														'grid place-content-center w-9 h-9 rounded-lg transition-all duration-200',
														activeChild
															? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30'
															: 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
													)}>
													<A className='size-4' strokeWidth={activeChild ? 2.5 : 2} />
												</span>
												<span className='text-sm font-semibold truncate flex-1'>{t(`items.${child.nameKey}`)}</span>
												{activeChild && (
													<motion.div
														layoutId='flyout-active'
														className='w-1.5 h-1.5 rounded-full bg-indigo-600'
														transition={spring}
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

	/* ------------------------- Enhanced Expanded mode (no children) ------------------------- */
	if (!hasChildren) {
		const active = isPathActive(pathname, item.href);
		return (
			<Link href={item.href} onClick={onNavigate} className='block group'>
				<motion.div
					whileHover={{ x: active ? 0 : 4 }}
					whileTap={{ scale: 0.98 }}
					className={cn(
						'relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-300 border-2 overflow-visible',
						active
							? 'bg-gradient-to-r from-indigo-50 via-indigo-50/80 to-violet-50/50 border-indigo-200/60 text-indigo-900 shadow-lg shadow-indigo-500/10'
							: 'border-transparent text-slate-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:border-slate-200'
					)}
					style={{ paddingInlineStart: depth ? 12 + depth * 16 : 12 }}
					aria-current={active ? 'page' : undefined}>

					{active && (
						<motion.span
							layoutId='active-rail'
							className='absolute inset-y-2 ltr:-left-[8px] rtl:-right-[8px] w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/50'
							transition={spring}
						/>
					)}

					<div
						className={cn(
							'relative z-10 grid place-content-center w-9 h-9 rounded-xl transition-all duration-300',
							active
								? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 scale-105'
								: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 group-hover:from-indigo-100 group-hover:to-indigo-200 group-hover:scale-105'
						)}>
						<Icon className='size-5' strokeWidth={active ? 2.5 : 2} />
					</div>

					<div className='relative z-10 flex-1 font-semibold truncate text-sm'>
						{label}
					</div>

					{item.nameKey === 'messages' && totalUnread > 0 && (
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							className='relative z-10'>
							<Badge value={totalUnread} />
						</motion.div>
					)}

					{active && (
						<motion.div
							className='absolute right-3 opacity-30'
							animate={{ x: [0, 4, 0] }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
							<ChevronRight className='size-4 text-indigo-600' />
						</motion.div>
					)}
				</motion.div>
			</Link>
		);
	}

	/* ------------------------- Enhanced Expanded mode (with children) ------------------------- */
	return (
		<div className='w-full'>
			<button
				type='button'
				onClick={() => setOpen(v => !v)}
				onKeyDown={onKeyToggle}
				className={cn(
					'w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-300 border-2',
					open
						? 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-900 border-slate-200 shadow-sm'
						: 'text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-200'
				)}
				style={{ paddingInlineStart: depth ? 12 + depth * 16 : 12 }}
				aria-expanded={open}>
				<span className={cn(
					'grid place-content-center w-9 h-9 rounded-xl transition-all duration-300',
					open
						? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700'
						: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700'
				)}>
					<Icon className='size-5' strokeWidth={2} />
				</span>
				<span className='rtl:text-right flex-1 font-bold truncate text-sm'>{label}</span>
				<motion.span
					initial={false}
					animate={{ rotate: open ? 180 : 0 }}
					transition={spring}
					className={cn('transition-colors', open ? 'text-slate-700' : 'text-slate-400')}>
					<ChevronDown className='size-4' />
				</motion.span>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						key='submenu'
						id={`submenu-${item.nameKey || item.href || label}`}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={smoothSpring}
						className='overflow-hidden'>
						<ul
							className={cn(
								'relative ltr:ml-2 rtl:mr-2 pl-5 mt-1.5 space-y-1',
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
											'relative py-0.5',
											isLast && "after:content-[''] after:absolute ltr:after:left-4 rtl:after:right-4 after:bottom-0 after:h-4 after:w-px after:bg-white"
										)}>
										<div
											className={cn(
												'relative',
												"before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:h-px before:w-4 before:bg-slate-200",
												'ltr:before:left-[-1rem] rtl:before:right-[-1rem]'
											)}>
											<NavItem item={child} pathname={pathname} depth={depth + 1} onNavigate={onNavigate} t={t} totalUnread={totalUnread} />
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
 * Enhanced Section with premium styling
 ------------------------------------------------------------------*/
function NavSection({ sectionKey, items, pathname, onNavigate, collapsed = false, t, totalUnread = 0 }) {
	const sectionLabel = sectionKey ? t(sectionKey) : null;
	return (
		<div className='mb-2'>
			{!collapsed && sectionLabel ? (
				<div className='px-3 pb-2 flex items-center gap-2'>
					<span className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500'>{sectionLabel}</span>
					<div className='flex-1 h-px bg-gradient-to-r from-slate-300 via-slate-200 to-transparent' />
				</div>
			) : null}

			<div className={cn('space-y-1.5', collapsed ? 'px-1' : 'px-1.5')}>
				{items.map(item => (
					<NavItem key={item.href || item.nameKey} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} t={t} totalUnread={totalUnread} />
				))}
			</div>
		</div>
	);
}

/** ----------------------------------------------------------------
 * Enhanced Scroll shadows
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
		<div className='relative h-full'>
			<div ref={ref} className='h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400'>
				{children}
			</div>

			{/* Enhanced shadows with gradient */}
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

/** ----------------------------------------------------------------
 * Enhanced Sidebar root with premium design
 ------------------------------------------------------------------*/
export default function Sidebar({ open, setOpen, collapsed: collapsedProp, setCollapsed: setCollapsedProp }) {
	const pathname = usePathname();
	const user = useUser();
	const role = user?.role ?? null;
	const t = useTranslations('nav');
	const { totalUnread } = useUnreadChats();

	const [collapsedLS, setCollapsedLS] = useLocalStorageState('sidebar:collapsed', false);
	const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : collapsedLS;
	const setCollapsed = typeof setCollapsedProp === 'function' ? setCollapsedProp : setCollapsedLS;

	const sections = useMemo(() => {
		if (!role) return null;
		return NAV.filter(s => s.role === role);
	}, [role]);

	const onNavigate = () => setOpen && setOpen(false);

	// Role badge config
	const getRoleConfig = () => {
		switch (role) {
			case 'super_admin':
				return { icon: Crown, label: 'Super Admin', gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 to-orange-50' };
			case 'admin':
				return { icon: Shield, label: 'Admin', gradient: 'from-indigo-500 to-violet-600', bg: 'from-indigo-50 to-violet-50' };
			case 'coach':
				return { icon: Zap, label: 'Coach', gradient: 'from-emerald-500 to-green-600', bg: 'from-emerald-50 to-green-50' };
			case 'client':
				return { icon: Sparkles, label: 'Client', gradient: 'from-blue-500 to-cyan-600', bg: 'from-blue-50 to-cyan-50' };
			default:
				return { icon: UserIcon, label: 'User', gradient: 'from-slate-500 to-slate-600', bg: 'from-slate-50 to-slate-50' };
		}
	};

	const roleConfig = getRoleConfig();
	const RoleIcon = roleConfig.icon;

	return (
		<>
			{/* ENHANCED DESKTOP */}
			<aside
				className={cn(
					'  rtl:border-l ltr:border-r border-slate-200/60 hidden lg:flex lg:flex-col shrink-0 transition-all duration-500 ease-in-out',
					'bg-white/80 backdrop-blur-xl text-slate-900 relative',
					collapsed ? 'w-[84px]' : 'w-[300px]'
				)}>
				{/* Decorative gradient */}
				<div className='absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-violet-50/30 pointer-events-none' />

				<div className='flex h-screen flex-col relative z-10'>
					{/* Enhanced Header */}
					<div className={cn('h-[64px] border-b-1 border-slate-200/60 flex items-center gap-3 bg-white/90 backdrop-blur-xl', 'px-4')}>
						<div className='flex items-center gap-3 flex-1 min-w-0'>
							{/* Premium logo container */}
							<motion.div
								whileHover={{ scale: 1.05, rotate: 5 }}
								whileTap={{ scale: 0.95 }}
								className='relative flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-xl  w-12 h-12 overflow-hidden group'>
								<img src='/logo/logo1.png' alt='Logo' className='w-8 h-8 object-contain relative z-10' />
							</motion.div>

							{!collapsed && (
								<motion.div
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -10 }}
									className='flex flex-col min-w-0'>
									<span className='text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black'>{t('brand.portalTitle')}</span>
									<span className='text-base font-black text-slate-800 truncate bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent'>
										{role === 'super_admin' && t('brand.superAdminPortal')}
										{role === 'admin' && t('brand.adminPortal')}
										{role === 'coach' && t('brand.coachPortal')}
										{role === 'client' && t('brand.clientPortal')}
									</span>
								</motion.div>
							)}
						</div>

						{/* Enhanced collapse button */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setCollapsed(v => !v)}
							className={cn(
								'inline-flex items-center justify-center rounded-xl',
								'border-2 border-slate-200/80 bg-white shadow-sm hover:shadow-md',
								'h-10 w-10 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-violet-50',
								'active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300'
							)} >
							<motion.div
								animate={{ rotate: collapsed ? 0 : 180 }}
								transition={spring}>
								{collapsed ? <ChevronRight className='w-5 h-5 rtl:scale-x-[-1]' strokeWidth={2.5} /> : <ChevronLeft className='rtl:scale-x-[-1] w-5 h-5' strokeWidth={2.5} />}
							</motion.div>
						</motion.button>
					</div>


					{/* Nav with enhanced scroll shadow */}
					<LayoutGroup id='sidebar-nav'>
						<div className='flex-1 py-4 h-[calc(100vh-100px)] overflow-auto'>
							<ScrollShadow>
								<nav className={cn(collapsed ? 'px-2 space-y-2' : 'px-3 space-y-4')}>
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

					{/* Enhanced Footer */}
					<div className='p-4 border-t-2 border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-transparent'>
						<ReloadButton collapsed={collapsed} t={t} />
					</div>
				</div>
			</aside>

			{/* ENHANCED MOBILE DRAWER */}
			<AnimatePresence>
				{open && (
					<>
						<motion.div
							key='overlay'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							onClick={() => setOpen && setOpen(false)}
							className='fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden'
						/>
						<motion.aside
							key='drawer'
							initial={{ x: -320 }}
							animate={{ x: 0 }}
							exit={{ x: -320 }}
							transition={spring}
							className='fixed z-50 top-0 left-0 h-dvh w-[320px] bg-white/95 backdrop-blur-xl text-slate-900 border-r-2 border-slate-200/60 lg:hidden shadow-2xl'
							aria-label='Mobile Sidebar'>
							{/* Decorative gradient */}
							<div className='absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-violet-50/30 pointer-events-none' />

							<div className='relative z-10 h-full flex flex-col'>
								{/* Mobile header */}
								<div className='h-[76px] px-4 border-b-2 border-slate-200/60 flex items-center justify-between bg-white/90 backdrop-blur-xl'>
									<div className='flex items-center gap-3'>
										<motion.div
											whileHover={{ scale: 1.05, rotate: 5 }}
											className='w-12 h-12 rounded-2xl grid place-content-center bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30'>
											<LayoutDashboard className='w-6 h-6' strokeWidth={2.5} />
										</motion.div>

										<div className='flex flex-col'>
											<span className='text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black'>{t('brand.portalTitle')}</span>
											<span className='font-black text-slate-900 text-base'>
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
										onClick={() => setOpen && setOpen(false)}
										className='inline-flex items-center justify-center w-10 h-10 rounded-xl border-2 border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all duration-200'
									>
										<X className='w-5 h-5' strokeWidth={2.5} />
									</motion.button>
								</div>

								{/* Role Badge Mobile */}
								<div className='px-4 pt-4 pb-2'>
									<div className={cn('rounded-2xl p-3 border-2 border-slate-200/60 bg-gradient-to-br', roleConfig.bg)}>
										<div className='flex items-center gap-3'>
											<div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br shadow-lg flex items-center justify-center', roleConfig.gradient)}>
												<RoleIcon className='w-5 h-5 text-white' strokeWidth={2.5} />
											</div>
											<div className='flex-1 min-w-0'>
												<p className='text-xs font-bold text-slate-500 uppercase tracking-wider'>Your Role</p>
												<p className='text-sm font-black text-slate-800 truncate'>{roleConfig.label}</p>
											</div>
										</div>
									</div>
								</div>

								<LayoutGroup id='sidebar-nav-mobile'>
									<div className='flex-1'>
										<ScrollShadow>
											<nav className='w-full px-3 pt-2 pb-6 space-y-4'>
												{sections?.map(section => (
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
											<div className='px-4 mt-auto pb-4'>
												<ReloadButton collapsed={false} t={t} />
											</div>
										</ScrollShadow>
									</div>
								</LayoutGroup>
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>

		</>
	);
}

/** ----------------------------------------------------------------
 * Unread chats hook
 ------------------------------------------------------------------*/
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

/** ----------------------------------------------------------------
 * Enhanced Badge with animation
 ------------------------------------------------------------------*/
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

/** ----------------------------------------------------------------
 * Enhanced Reload button
 ------------------------------------------------------------------*/
function ReloadButton({ collapsed, t }) {
	return (
		<div className='flex flex-col gap-2'>
			<motion.button
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
				onClick={() => window.location.reload()}
				className={
					collapsed
						? 'md:hidden mx-auto flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all duration-300'
						: 'md:hidden flex w-full items-center gap-3 bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-5 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all duration-300'
				}>
				<div className='flex items-center justify-center w-5 h-5'>
					<RotateCcw className='w-5 h-5' strokeWidth={2.5} />
				</div>

				{!collapsed && <span className='text-sm font-bold tracking-wide'>{t('reload-page')}</span>}
			</motion.button>

			<FeedbackWidget collapsed={collapsed} />
		</div>
	);
}