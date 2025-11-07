'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Users, User as UserIcon, Dumbbell, ClipboardList, Apple, NotebookPen, MessageSquare, Calculator, BarChart3, FileText, ServerCog, UtensilsCrossed, ChefHat, ShoppingCart, ChevronDown, ChevronLeft, ChevronRight, X, LineChart, Newspaper, Salad, FileBarChart } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaInbox, FaRegFilePowerpoint, FaUsers, FaWpforms } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

const spring = { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 };

function cn() {
	return Array.from(arguments).filter(Boolean).join(' ');
}

const NAV = [
	// -------------------- CLIENT --------------------
	{
		role: 'client',
		sectionKey: 'sections.mySpace',
		items: [
			{ nameKey: 'dashboard', href: '/dashboard/my', icon: LayoutDashboard },
			{
				nameKey: 'training',
				icon: Dumbbell,
				children: [
					{ nameKey: 'myWorkouts', href: '/dashboard/my/workouts', icon: ClipboardList },
					{ nameKey: 'myProgress', href: '/dashboard/my/progress', icon: LineChart },
				],
			},
			{ nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple },
			{ nameKey: 'myReminders', href: '/dashboard/reminders', icon: Newspaper },
			{ nameKey: 'weeklyStrength', href: '/dashboard/my/report', icon: Newspaper },
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
			{ nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare },

			{ nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon },
		],
	},

	// -------------------- COACH --------------------
	{
		role: 'coach',
		sectionKey: 'sections.mySpace',
		items: [
			{ nameKey: 'dashboard', href: '/dashboard/my', icon: LayoutDashboard },
			{
				nameKey: 'training',
				icon: Dumbbell,
				children: [
					{ nameKey: 'myWorkouts', href: '/dashboard/my/workouts', icon: ClipboardList },
					{ nameKey: 'progress', href: '/dashboard/my/progress', icon: LineChart },
				],
			},
			{
				nameKey: 'nutrition',
				icon: Salad,
				children: [
					{ nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple },
					{ nameKey: 'foodLibrary', href: '/dashboard/nutrition/library-food-list', icon: ChefHat },
					{ nameKey: 'groceryList', href: '/dashboard/nutrition/grocery-list', icon: ShoppingCart },
				],
			},
			{ nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator },
			{ nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon },
		],
	},
	{
		role: 'coach',
		sectionKey: 'sections.clientManagement',
		items: [
			{
				nameKey: 'nutritionManagement',
				icon: UtensilsCrossed,
				children: [
					{ nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat },
					{ nameKey: 'analytics', href: '/dashboard/nutrition/analytics', icon: BarChart3 },
					{ nameKey: 'reports', href: '/dashboard/nutrition/reports', icon: FileBarChart },
				],
			},
			{
				nameKey: 'trainingManagement',
				icon: Dumbbell,
				children: [
					{ nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: NotebookPen },
					{ nameKey: 'allWorkouts', href: '/dashboard/workouts', icon: ClipboardList },
				],
			},
		],
	},

	// -------------------- ADMIN --------------------
	{
		role: 'admin',
		sectionKey: 'sections.overview',
		items: [
			// { nameKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
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
				expand: true,
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

	// -------------------- ADMIN --------------------
	{
		role: 'super_admin',
		sectionKey: 'sections.overview',
		items: [
			{ nameKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
			{ nameKey: 'allUsers', href: '/dashboard/users', icon: Users },
			{ nameKey: 'allExercises', href: '/dashboard/workouts', icon: ClipboardList },
		],
	},
];

/* ----------------------------- helpers ---------------------------------- */
function isPathActive(pathname, href) {
	if (!href) return false;
	return pathname === href || pathname?.startsWith(href + '/') || pathname?.endsWith(href + '/');
}
function anyChildActive(pathname, children = []) {
	return children.some(c => isPathActive(pathname, c.href));
}

/** ----------------------------------------------------------------
 * NavItem (handles both leaf links and collapsible parents)
 ------------------------------------------------------------------*/
function NavItem({ item, pathname, depth = 0, onNavigate, collapsed = false, t }) {
	const Icon = item.icon || LayoutDashboard;
	const hasChildren = Array.isArray(item.children) && item.children.length > 0;

	const label = t(`items.${item.nameKey}`);

	if (collapsed) {
		if (hasChildren) {
			const firstChild = item.children.find(c => c.href);
			if (!firstChild) return null;
			const active = isPathActive(pathname, firstChild.href);
			return (
				<Link href={firstChild.href} onClick={onNavigate} className='block group' title={label} aria-label={label}>
					<div className={cn('relative flex items-center gap-3 rounded-lg px-3 py-1 transition-colors justify-center', active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-700 hover:bg-slate-50 border border-transparent')}>
						<div className={cn('flex flex-none items-center justify-center w-10 h-10 rounded-lg', active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 group-hover:bg-indigo-50')}>
							<Icon className='size-5' />
						</div>
					</div>
				</Link>
			);
		}
		const active = isPathActive(pathname, item.href);
		return (
			<Link href={item.href} onClick={onNavigate} className='block group' title={label} aria-label={label}>
				<div className={cn('relative flex items-center gap-3 rounded-lg px-3 py-1 transition-colors justify-center', active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-700 hover:bg-slate-50 border border-transparent')}>
					<div className={cn('flex !flex-none items-center justify-center w-10 h-10 rounded-lg', active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 group-hover:bg-indigo-50')}>
						<Icon className='size-5' />
					</div>
				</div>
			</Link>
		);
	}

	const initiallyOpen = hasChildren && (item.expand || anyChildActive(pathname, item.children) || isPathActive(pathname, item.href));
	const [open, setOpen] = useState(initiallyOpen);

	useEffect(() => {
		if (!hasChildren) return;
		if (item.expand) {
			setOpen(true);
		} else {
			setOpen(anyChildActive(pathname, item.children) || isPathActive(pathname, item.href));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname]);

	if (!hasChildren) {
		const active = pathname === item.href;
		return (
			<Link href={item.href} onClick={onNavigate} className='block group'>
				<div className={cn('relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors', active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-700 hover:bg-slate-50 border border-transparent')} style={{ paddingLeft: depth ? 8 + depth * 14 : 12 }}>
					<div className={cn('flex flex-none items-center justify-center w-8 h-8 rounded-lg', active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 group-hover:bg-indigo-50')}>
						<Icon className='size-5' />
					</div>
					<div className='flex-1 font-medium truncate'>{label}</div>
				</div>
			</Link>
		);
	}

	return (
		<div className='w-full'>
			<button type='button' onClick={() => setOpen(v => !v)} className={cn('w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors', open ? 'bg-slate-50 text-slate-800' : 'hover:bg-slate-50 text-slate-700')} style={{ paddingLeft: depth ? 8 + depth * 14 : 12 }} aria-expanded={open}>
				<div className='flex flex-none items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-indigo-600'>
					<Icon className='size-5' />
				</div>
				<div className=' rtl:text-right flex-1 font-semibold truncate'>{label}</div>
				<motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={spring} className='text-slate-400'>
					<ChevronDown className='size-4' />
				</motion.span>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div key='submenu' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className='overflow-hidden'>
						<div className='py-1 space-y-1'>
							{item.children.map(child => (
								<NavItem key={child.href || child.nameKey} item={child} pathname={pathname} depth={depth + 1} onNavigate={onNavigate} t={t} />
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/** ----------------------------------------------------------------
 * Section with title (translated)
 ------------------------------------------------------------------*/
function NavSection({ sectionKey, items, pathname, onNavigate, collapsed = false, t }) {
	const sectionLabel = sectionKey ? t(sectionKey) : null;
	return (
		<div className='mb-3'>
			{!collapsed && sectionLabel ? <div className='px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500/80'>{sectionLabel}</div> : null}
			<div className={cn('px-2 space-y-1', collapsed && 'px-1')}>
				{items.map(item => (
					<NavItem key={item.href || item.nameKey} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} t={t} />
				))}
			</div>
		</div>
	);
}

/** ----------------------------------------------------------------
 * Sidebar root
 ------------------------------------------------------------------*/
export default function Sidebar({ open, setOpen, collapsed, setCollapsed }) {
	const pathname = usePathname();
	const user = useUser();
	const role = user?.role ?? null; // fallback
	const t = useTranslations('nav');

	// const sections = useMemo(() => NAV.filter(s => s.role === role), [role]);
	const sections = useMemo(() => {
		if (!role) return SKELETON_SECTIONS;  // هيكل ثابت لا يغيّر نوع التاج
		return NAV.filter(s => s.role === role);
	}, [role]);

	const onNavigate = () => setOpen?.(false);

	return (
		<>
			{/* DESKTOP */}
			<aside className={cn('bg-white border-x border-slate-200/70 hidden lg:flex lg:flex-col shrink-0  transition-[width] duration-300', collapsed ? 'w-[72px]' : 'w-[260px]')}>
				<div className='flex h-screen flex-col'>
					<div className={cn('h-[64px] border-b border-slate-200 flex items-center gap-3', collapsed ? 'justify-center px-2' : 'justify-between px-3')}>
						{/* Example: Show text or logo when expanded */}
						{!collapsed && (
							<div className='flex items-center gap-2'>
								<img src='/logo/logo1.png' alt='Logo' className='w-[60px]  object-contain' />
								<span className='font-semibold text-slate-700'>{t('items.dashboard')}</span>
							</div>
						)}

						{/* Collapse/Expand button */}
						<button onClick={() => setCollapsed(v => !v)} className={cn('inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white active:scale-95 transition h-9 w-9')} title={collapsed ? t('tooltips.expand') : t('tooltips.collapse')} aria-label={collapsed ? t('tooltips.expand') : t('tooltips.collapse')}>
							{collapsed ? <ChevronRight className='w-4 h-4 rtl:scale-x-[-1]' /> : <ChevronLeft className='rtl:scale-x-[-1] w-4 h-4' />}
						</button>
					</div>

					<LayoutGroup id='sidebar-nav'>
						<nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-1' : '')}>
							{sections.map(section => (
								<NavSection key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} t={t} />
							))}
						</nav>
					</LayoutGroup>
				</div>
			</aside>

			{/* MOBILE DRAWER */}
			<AnimatePresence>
				{open && (
					<>
						<motion.div key='overlay' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className='fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden' />
						<motion.aside key='drawer' initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={spring} className='fixed z-50 top-0 left-0 h-dvh w-[300px] bg-white border-r border-slate-200 lg:hidden' aria-label='Mobile Sidebar'>
							{/* header */}
							<div className='h-[72px] px-4 border-b border-slate-200 flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									<div className='size-8 rounded-lg bg-indigo-600 shadow ring-4 ring-indigo-100 grid place-content-center text-white'>
										<LayoutDashboard className='size-4' />
									</div>
									<div className='font-semibold'>{t('brand.coachPortal')}</div>
								</div>
								<button onClick={() => setOpen(false)} className='inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white active:scale-95' aria-label={t('tooltips.closeMenu')} title={t('tooltips.closeMenu')}>
									<X className='w-4 h-4' />
								</button>
							</div>

							{/* nav */}
							<LayoutGroup id='sidebar-nav-mobile'>
								<nav className='w-full h-[calc(100vh-100px)] overflow-y-auto px-2 pt-4 pb-6 space-y-3'>
									{sections.map(section => (
										<NavSection key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} onNavigate={onNavigate} t={t} />
									))}
								</nav>
							</LayoutGroup>
						</motion.aside>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
