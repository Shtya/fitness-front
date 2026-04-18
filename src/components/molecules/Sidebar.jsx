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
	LayoutDashboard, Users, User as UserIcon, Apple,  MessageSquare, Calculator, BarChart3, ChefHat,
	ChevronDown, X,  Bell,
	Wallet, User, ListTodo,
	CalendarDays, LogOut, Globe, Palette, Paintbrush, Check, Languages,
	PanelLeftClose, PanelLeftOpen,
	Receipt, ChevronRight,
	Sparkles, Settings2, Lock, Search,
	BrainCircuit, LayoutGrid, GanttChart,
	FileText, Inbox, Layers, Zap,
	TrendingUp, BookOpen, Target, Coffee,
	ShieldCheck, CreditCard, Activity, Star,
	Hash, Sliders,
} from 'lucide-react';
import {
	useSearchParams,
	useRouter as useNextRouter
} from 'next/navigation';
import { usePathname as useNextPathname } from "@/i18n/navigation";
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
const SIDEBAR_W_COLLAPSED = 72;
const LS_COLLAPSED = 'sidebar:collapsed';
const LS_HIDDEN = 'sidebar:hidden-items';
const LS_PALETTE = 'sidebar:palette';

/* ─── Motion configs ────────────────────────────────────────── */
const snap = { type: 'spring', stiffness: 500, damping: 36, mass: 0.65 };
const gentle = { type: 'spring', stiffness: 300, damping: 28, mass: 0.9 };
const slide = { type: 'spring', stiffness: 400, damping: 34, mass: 0.8 };
const modal = { type: 'spring', stiffness: 420, damping: 38, mass: 0.7 };

/* ─── Sidebar Palettes ───────────────────────────────────────── */
export const SIDEBAR_PALETTES = {
	pearl: {
		nameKey: 'palettes.pearl',
		preview: ['#ffffff', '#f8f9fb', '#e2e8f0'],
		bg: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 50%, #f4f6f8 100%)',
		bgCard: '#ffffff',
		bgHover: 'rgba(255,255,255,0.95)',
		bgActive: '#ffffff',
		border: 'rgba(0,0,0,0.07)',
		borderStrong: 'rgba(0,0,0,0.11)',
		text: '#0f172a',
		textMuted: '#64748b',
		textLight: '#94a3b8',
		textXLight: '#cbd5e1',
		sectionLabel: '#94a3b8',
		iconBg: '#ffffff',
		iconBorder: 'rgba(0,0,0,0.08)',
		shadow: {
			sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
			md: '0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
		},
		headerBg: 'rgba(255,255,255,0.8)',
		footerBg: 'rgba(248,249,251,0.9)',
		texture: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
		textureSize: '20px 20px',
	},
	silver: {
		nameKey: 'palettes.silver',
		preview: ['#f1f5f9', '#e2e8f0', '#cbd5e1'],
		bg: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e8edf3 100%)',
		bgCard: '#ffffff',
		bgHover: 'rgba(255,255,255,0.92)',
		bgActive: '#ffffff',
		border: 'rgba(100,116,139,0.12)',
		borderStrong: 'rgba(100,116,139,0.18)',
		text: '#1e293b',
		textMuted: '#475569',
		textLight: '#94a3b8',
		textXLight: '#cbd5e1',
		sectionLabel: '#94a3b8',
		iconBg: '#ffffff',
		iconBorder: 'rgba(100,116,139,0.12)',
		shadow: {
			sm: '0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
			md: '0 4px 18px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
		},
		headerBg: 'rgba(248,250,252,0.9)',
		footerBg: 'rgba(241,245,249,0.95)',
		texture: 'radial-gradient(circle, rgba(100,116,139,0.06) 1px, transparent 1px)',
		textureSize: '18px 18px',
	},
	ivory: {
		nameKey: 'palettes.ivory',
		preview: ['#fefce8', '#fef9c3', '#fde68a'],
		bg: 'linear-gradient(180deg, #fffef5 0%, #fefce8 50%, #fef3c7 100%)',
		bgCard: '#ffffff',
		bgHover: 'rgba(255,255,255,0.95)',
		bgActive: '#ffffff',
		border: 'rgba(180,130,0,0.1)',
		borderStrong: 'rgba(180,130,0,0.16)',
		text: '#1c1917',
		textMuted: '#78716c',
		textLight: '#a8a29e',
		textXLight: '#d6d3d1',
		sectionLabel: '#a8a29e',
		iconBg: '#fffbeb',
		iconBorder: 'rgba(180,130,0,0.1)',
		shadow: {
			sm: '0 1px 3px rgba(180,130,0,0.07), 0 1px 2px rgba(0,0,0,0.03)',
			md: '0 4px 16px rgba(180,130,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
		},
		headerBg: 'rgba(255,253,235,0.9)',
		footerBg: 'rgba(254,252,232,0.95)',
		texture: 'radial-gradient(circle, rgba(180,130,0,0.05) 1px, transparent 1px)',
		textureSize: '20px 20px',
	},
	slate: {
		nameKey: 'palettes.slate',
		preview: ['#e2e8f0', '#cbd5e1', '#94a3b8'],
		bg: 'linear-gradient(180deg, #f1f5f9 0%, #e8edf4 50%, #dde4ed 100%)',
		bgCard: '#ffffff',
		bgHover: 'rgba(255,255,255,0.88)',
		bgActive: '#ffffff',
		border: 'rgba(71,85,105,0.12)',
		borderStrong: 'rgba(71,85,105,0.18)',
		text: '#0f172a',
		textMuted: '#475569',
		textLight: '#94a3b8',
		textXLight: '#cbd5e1',
		sectionLabel: '#94a3b8',
		iconBg: '#f8fafc',
		iconBorder: 'rgba(71,85,105,0.1)',
		shadow: {
			sm: '0 1px 4px rgba(15,23,42,0.07), 0 1px 2px rgba(15,23,42,0.04)',
			md: '0 4px 18px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.05)',
		},
		headerBg: 'rgba(241,245,249,0.9)',
		footerBg: 'rgba(232,237,244,0.95)',
		texture: 'radial-gradient(circle, rgba(15,23,42,0.05) 1px, transparent 1px)',
		textureSize: '18px 18px',
	},
	frost: {
		nameKey: 'palettes.frost',
		preview: ['#eff6ff', '#dbeafe', '#93c5fd'],
		bg: 'linear-gradient(180deg, #f0f7ff 0%, #e8f1fd 50%, #dde9fb 100%)',
		bgCard: '#ffffff',
		bgHover: 'rgba(255,255,255,0.92)',
		bgActive: '#ffffff',
		border: 'rgba(59,130,246,0.1)',
		borderStrong: 'rgba(59,130,246,0.16)',
		text: '#0c1a3a',
		textMuted: '#3d5a8a',
		textLight: '#7ea8d4',
		textXLight: '#bfcfe6',
		sectionLabel: '#7ea8d4',
		iconBg: '#f0f7ff',
		iconBorder: 'rgba(59,130,246,0.1)',
		shadow: {
			sm: '0 1px 4px rgba(59,130,246,0.08), 0 1px 2px rgba(0,0,0,0.04)',
			md: '0 4px 18px rgba(59,130,246,0.1), 0 1px 4px rgba(0,0,0,0.04)',
		},
		headerBg: 'rgba(240,247,255,0.9)',
		footerBg: 'rgba(232,241,253,0.95)',
		texture: 'radial-gradient(circle, rgba(59,130,246,0.06) 1px, transparent 1px)',
		textureSize: '20px 20px',
	},
	lavender: {
		nameKey: 'palettes.lavender',
		preview: ['#f5f3ff', '#ede9fe', '#c4b5fd'],
		bg: 'linear-gradient(180deg, #f8f6ff 0%, #f2eefd 50%, #ebe5fc 100%)',
		bgCard: '#ffffff',
		bgHover: 'rgba(255,255,255,0.92)',
		bgActive: '#ffffff',
		border: 'rgba(139,92,246,0.1)',
		borderStrong: 'rgba(139,92,246,0.16)',
		text: '#1e0a3c',
		textMuted: '#6d4ea0',
		textLight: '#a78bca',
		textXLight: '#d4c5ed',
		sectionLabel: '#a78bca',
		iconBg: '#f8f6ff',
		iconBorder: 'rgba(139,92,246,0.1)',
		shadow: {
			sm: '0 1px 4px rgba(139,92,246,0.08), 0 1px 2px rgba(0,0,0,0.04)',
			md: '0 4px 18px rgba(139,92,246,0.1), 0 1px 4px rgba(0,0,0,0.04)',
		},
		headerBg: 'rgba(248,246,255,0.9)',
		footerBg: 'rgba(242,238,253,0.95)',
		texture: 'radial-gradient(circle, rgba(139,92,246,0.06) 1px, transparent 1px)',
		textureSize: '20px 20px',
	},
};

/* ─── Design Token Provider ──────────────────────────────────── */
function useSidebarPalette() {
	const [paletteKey, setPaletteKey] = useLocalStorageState(LS_PALETTE, 'pearl');
	const palette = SIDEBAR_PALETTES[paletteKey] || SIDEBAR_PALETTES.pearl;
	return { paletteKey, setPaletteKey, palette };
}

/* ─── NAV CONFIG ─────────────────────────────────────────────── */
export const ITEM_META = {
	aiStudio: {
		id: 'aiStudio',
		nameKey: 'aiStudio',
		href: '/ai-studio',
		icon: BrainCircuit,
		descKey: 'descriptions.aiStudio',
		group: 'ai',
		defaultVisible: true,
		required: true,
		highlightVariant: 'premium',
	},
	overview_admin: { id: 'overview_admin', nameKey: 'overview', href: '/dashboard', icon: LayoutDashboard, descKey: 'descriptions.overview_admin', group: 'main', defaultVisible: true, required: true },
	overview_client: { id: 'overview_client', nameKey: 'overview', href: '/dashboard/my/stats', icon: Activity, descKey: 'descriptions.overview_client', group: 'main', defaultVisible: true, required: true },
	overview_superadmin: { id: 'overview_superadmin', nameKey: 'overview', href: '/dashboard', icon: ShieldCheck, descKey: 'descriptions.overview_superadmin', group: 'main', defaultVisible: true, required: true },
	allUsers: { id: 'allUsers', nameKey: 'allUsers', href: '/dashboard/users', icon: Users, descKey: 'descriptions.allUsers', group: 'management', defaultVisible: true, required: false },
	allUsers_super: { id: 'allUsers_super', nameKey: 'allUsers', href: '/dashboard/super-admin/users', icon: Users, descKey: 'descriptions.allUsers_super', group: 'management', defaultVisible: true, required: true },
	clientIntake: { id: 'clientIntake', nameKey: 'clientIntake', icon: FaUsers, descKey: 'descriptions.clientIntake', group: 'management', defaultVisible: true, required: false },
	manageForms: { id: 'manageForms', nameKey: 'manageForms', href: '/dashboard/intake/forms', icon: FileText, descKey: 'descriptions.manageForms', group: 'management', defaultVisible: true, required: false },
	responses: { id: 'responses', nameKey: 'responses', href: '/dashboard/intake/responses', icon: Inbox, descKey: 'descriptions.responses', group: 'management', defaultVisible: true, required: false },
	forms_super: { id: 'forms_super', nameKey: 'forms', href: '/dashboard/super-admin/forms', icon: FileText, descKey: 'descriptions.forms_super', group: 'management', defaultVisible: true, required: false },
	feedback_super: { id: 'feedback_super', nameKey: 'feedback', href: '/dashboard/super-admin/feedback', icon: MessageSquare, descKey: 'descriptions.feedback_super', group: 'management', defaultVisible: true, required: false },
	allExercises: { id: 'allExercises', nameKey: 'allExercises', href: '/dashboard/workouts', icon: Target, descKey: 'descriptions.allExercises', group: 'content', defaultVisible: true, required: false },
	allRecipes: { id: 'allRecipes', nameKey: 'allRecipes', href: '/dashboard/recipes', icon: BookOpen, descKey: 'descriptions.allRecipes', group: 'content', defaultVisible: true, required: false },
	workoutPlans: { id: 'workoutPlans', nameKey: 'workoutPlans', href: '/dashboard/workouts/plans', icon: Layers, descKey: 'descriptions.workoutPlans', group: 'content', defaultVisible: true, required: false },
	mealPlans: { id: 'mealPlans', nameKey: 'mealPlans', href: '/dashboard/nutrition', icon: ChefHat, descKey: 'descriptions.mealPlans', group: 'content', defaultVisible: true, required: false },
	reports: { id: 'reports', nameKey: 'reports', href: '/dashboard/reports', icon: BarChart3, descKey: 'descriptions.reports', group: 'content', defaultVisible: true, required: false },
	myWorkouts: { id: 'myWorkouts', nameKey: 'myWorkouts', href: '/dashboard/my/workouts', icon: Target, descKey: 'descriptions.myWorkouts', group: 'workspace', defaultVisible: true, required: false },
	myNutrition: { id: 'myNutrition', nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple, descKey: 'descriptions.myNutrition', group: 'workspace', defaultVisible: true, required: false },
	recipes: { id: 'recipes', nameKey: 'recipes', href: '/dashboard/my/recipes', icon: Coffee, descKey: 'descriptions.recipes', group: 'workspace', defaultVisible: true, required: false },
	weeklyStrength: { id: 'weeklyStrength', nameKey: 'weeklyStrength', href: '/dashboard/my/report', icon: TrendingUp, descKey: 'descriptions.weeklyStrength', group: 'workspace', defaultVisible: true, required: false },
	myReminders: { id: 'myReminders', nameKey: 'myReminders', href: '/dashboard/reminders', icon: Bell, descKey: 'descriptions.myReminders', group: 'workspace', defaultVisible: true, required: false },
	todos: { id: 'todos', nameKey: 'todos', href: '/workspace?tab=tasks', icon: ListTodo, descKey: 'descriptions.todos', group: 'workspace', defaultVisible: true, required: false },
	calendar: { id: 'calendar', nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays, descKey: 'descriptions.calendar', group: 'workspace', defaultVisible: true, required: false },
	messages: { id: 'messages', nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare, descKey: 'descriptions.messages', group: 'communication', defaultVisible: true, required: false },
	calorieCalculator: { id: 'calorieCalculator', nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator, descKey: 'descriptions.calorieCalculator', group: 'tools', defaultVisible: true, required: false },
	notifications: { id: 'notifications', nameKey: 'notifications', href: '/dashboard/notifications', icon: Bell, descKey: 'descriptions.notifications', group: 'workspace', defaultVisible: true, required: false },
	billing: { id: 'billing', nameKey: 'billing', href: '/dashboard/billing', icon: CreditCard, descKey: 'descriptions.billing', group: 'finance', defaultVisible: true, required: false },
	money: { id: 'money', nameKey: 'money', href: '/money', icon: Wallet, descKey: 'descriptions.money', group: 'finance', defaultVisible: true, required: false },
	profile_admin: { id: 'profile_admin', nameKey: 'profile', href: '/dashboard/my-account', icon: UserIcon, descKey: 'descriptions.profile_admin', group: 'account', defaultVisible: true, required: true },
	profile_client: { id: 'profile_client', nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon, descKey: 'descriptions.profile_client', group: 'account', defaultVisible: true, required: true },
};

export const NAV = [
	{
		role: 'admin', sectionKey: 'sections.main',
		items: [{ ...ITEM_META.overview_admin }]
	},
	{
		role: 'admin', sectionKey: 'sections.management',
		items: [
			{ ...ITEM_META.allUsers },
			{ ...ITEM_META.clientIntake, expand: false, children: [{ ...ITEM_META.manageForms }, { ...ITEM_META.responses }] }
		]
	},
	{
		role: 'admin', sectionKey: 'sections.content',
		items: [{ ...ITEM_META.allExercises }, { ...ITEM_META.allRecipes }, { ...ITEM_META.workoutPlans }, { ...ITEM_META.mealPlans }, { ...ITEM_META.reports }]
	},
	{
		role: 'admin', sectionKey: 'sections.workspace',
		items: [{ ...ITEM_META.todos }, { ...ITEM_META.calendar }, { ...ITEM_META.messages }, { ...ITEM_META.notifications }, { ...ITEM_META.calorieCalculator }]
	},
	{
		role: 'admin', sectionKey: 'sections.finance',
		items: [{ ...ITEM_META.billing }, { ...ITEM_META.money }]
	},
	{
		role: 'admin', sectionKey: 'sections.account',
		items: [{ ...ITEM_META.profile_admin }]
	},
	{
		role: 'client', sectionKey: 'sections.main',
		items: [{ ...ITEM_META.overview_client }]
	},
	{
		role: 'client', sectionKey: 'sections.myWorkspace',
		items: [{ ...ITEM_META.myWorkouts }, { ...ITEM_META.myNutrition }, { ...ITEM_META.recipes }, { ...ITEM_META.weeklyStrength }, { ...ITEM_META.myReminders }]
	},
	{
		role: 'client', sectionKey: 'sections.workspace',
		items: [{ ...ITEM_META.calendar }, { ...ITEM_META.messages }, { ...ITEM_META.calorieCalculator }, { ...ITEM_META.money }, { ...ITEM_META.profile_client }]
	},
	{
		role: 'coach', sectionKey: 'sections.management',
		items: [
			{ ...ITEM_META.allUsers },
			{ ...ITEM_META.clientIntake, expand: false, children: [{ ...ITEM_META.manageForms }, { ...ITEM_META.responses }] }
		]
	},
	{
		role: 'coach', sectionKey: 'sections.content',
		items: [{ ...ITEM_META.allExercises }, { ...ITEM_META.allRecipes }, { ...ITEM_META.workoutPlans }, { ...ITEM_META.mealPlans }, { ...ITEM_META.reports }]
	},
	{
		role: 'coach', sectionKey: 'sections.workspace',
		items: [{ ...ITEM_META.todos }, { ...ITEM_META.calendar }, { ...ITEM_META.messages }, { ...ITEM_META.notifications }, { ...ITEM_META.calorieCalculator }]
	},
	{
		role: 'coach', sectionKey: 'sections.account',
		items: [{ ...ITEM_META.profile_admin }]
	},
	{
		role: 'super_admin', sectionKey: 'sections.main',
		items: [{ ...ITEM_META.overview_superadmin }]
	},
	{
		role: 'super_admin', sectionKey: 'sections.management',
		items: [{ ...ITEM_META.allUsers_super }, { ...ITEM_META.allExercises }, { ...ITEM_META.feedback_super }, { ...ITEM_META.forms_super }]
	},
	{
		role: 'super_admin', sectionKey: 'sections.workspace',
		items: [{ ...ITEM_META.todos }, { ...ITEM_META.calendar }]
	},
	{
		role: 'super_admin', sectionKey: 'sections.finance',
		items: [{ ...ITEM_META.billing }]
	},
];

/* ─── Helpers ───────────────────────────────────────────────── */
function initialsFrom(name, email) {
	const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
	const parts = src.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return src.slice(0, 2).toUpperCase();
}

function isPathActive(pathname, href, searchParams) {
	if (!href || !pathname) return false;
	const [hrefPath, hrefQuery] = href.split('?');
	const normalizedPath = pathname.replace(/\/+$/, '');
	const normalizedHref = hrefPath.replace(/\/+$/, '');
	if (normalizedPath === normalizedHref) {
		if (!hrefQuery) return true;
		const hrefParams = new URLSearchParams(hrefQuery);
		for (const [key, value] of hrefParams.entries()) {
			if (searchParams?.get(key) !== value) return false;
		}
		return true;
	}
	if (normalizedPath.endsWith(normalizedHref + '/')) return !hrefQuery;
	if (normalizedPath.endsWith(normalizedHref)) return !hrefQuery;
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
		} catch { return initial; }
	});
	useEffect(() => {
		try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
	}, [key, val]);
	return [val, set];
}

function useHiddenItems() {
	const [hidden, setHidden] = useLocalStorageState(LS_HIDDEN, []);
	const isHidden = useCallback((id) => hidden.includes(id), [hidden]);
	const toggle = useCallback((id) => {
		setHidden(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
	}, [setHidden]);
	const resetAll = useCallback(() => setHidden([]), [setHidden]);
	return { hidden, isHidden, toggle, resetAll };
}

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

export function useUnreadNotifications(pollMs = 120000) {
	const [count, setCount] = useState(0);
	async function load() {
		try {
			const res = await api.get('/notifications/unread-count');
			setCount(Number(res?.data?.count || 0));
		} catch { }
	}
	useEffect(() => {
		load();
		const id = setInterval(load, pollMs);
		return () => clearInterval(id);
	}, [pollMs]);
	return { unreadNotifications: count, reloadUnreadNotifications: load };
}

/* ─── Badge ──────────────────────────────────────────────────── */
function Badge({ value, small }) {
	return (
		<motion.span
			initial={{ scale: 0 }}
			animate={{ scale: 1 }}
			transition={snap}
			style={{
				display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
				minWidth: small ? 16 : 18, height: small ? 16 : 18,
				borderRadius: 99, fontSize: small ? 9 : 10, fontWeight: 800,
				color: '#fff', padding: '0 4px',
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				boxShadow: '0 2px 6px color-mix(in srgb, var(--color-primary-500) 40%, transparent)',
				letterSpacing: '0.02em',
			}}
		>
			{value > 99 ? '99+' : value}
		</motion.span>
	);
}

/* ─── CollapsedTooltip ───────────────────────────────────────── */
export function CollapsedTooltip({ label, anchorRef, offset = 12 }) {
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
			initial={{ opacity: 0, x: isRTL ? 6 : -6, scale: 0.93 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: isRTL ? 6 : -6, scale: 0.93 }}
			transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
			style={{
				position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999,
				transform: 'translateY(-50%)', zIndex: 9999, pointerEvents: 'none',
			}}
		>
			<div style={{
				fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 9,
				whiteSpace: 'nowrap', color: 'white', letterSpacing: '0.015em',
				background: '#0f172a',
				boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
				position: 'relative',
			}}>
				{label}
				<span style={{
					position: 'absolute', top: '50%',
					transform: 'translateY(-50%) rotate(45deg)',
					[isRTL ? 'right' : 'left']: -3.5,
					width: 7, height: 7, background: '#0f172a', borderRadius: 2,
				}} />
			</div>
		</motion.div>,
		document.body
	);
}

/* ─── PortalFlyout ───────────────────────────────────────────── */
function PortalFlyout({ children, anchorRef, offset = 12 }) {
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
			ref={flyRef} role="menu"
			initial={{ opacity: 0, x: xFrom, scale: 0.96 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: xFrom, scale: 0.96 }}
			transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
			style={{
				position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999,
				zIndex: 9998, minWidth: 226, borderRadius: 14, overflow: 'hidden',
				background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)',
				boxShadow: '0 24px 64px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)',
			}}
		>
			{children}
		</motion.div>,
		document.body
	);
}

/* ─── ScrollShadow ───────────────────────────────────────────── */
function ScrollShadow({ children, P }) {
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
	const fadeColor = P?.bg?.includes('#f') ? '#f8f9fb' : 'rgba(248,249,251,0)';
	return (
		<div style={{ position: 'relative', height: '100%' }}>
			<div ref={ref} style={{ height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}>{children}</div>
			<div style={{ pointerEvents: 'none', position: 'absolute', inset: '0 0 auto 0', height: 44, opacity: atTop ? 0 : 1, transition: 'opacity .25s', background: `linear-gradient(to bottom, ${P?.headerBg || '#fff'}, transparent)` }} />
			<div style={{ pointerEvents: 'none', position: 'absolute', inset: 'auto 0 0 0', height: 44, opacity: atBottom ? 0 : 1, transition: 'opacity .25s', background: `linear-gradient(to top, ${P?.footerBg || '#f8f9fb'}, transparent)` }} />
		</div>
	);
}

/* ─── SectionLabel ───────────────────────────────────────────── */
function SectionLabel({ label, P }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px', marginBottom: 4, marginTop: 20 }}>
			<span style={{
				fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
				letterSpacing: '0.22em', color: P?.sectionLabel || '#94a3b8',
				whiteSpace: 'nowrap', flexShrink: 0,
			}}>
				{label}
			</span>
			<div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${P?.border || 'rgba(0,0,0,0.07)'}, transparent)` }} />
		</div>
	);
}

/* ─── AI Studio Item ─────────────────────────────────────────── */
function AIStudioItem({ collapsed, pathname, searchParams, onNavigate, P }) {
	const [hover, setHover] = useState(false);
	const liRef = useRef(null);
	const active = isPathActive(pathname, '/ai-studio', searchParams);
	const t = useTranslations('nav');

	if (collapsed) {
		return (
			<div
				ref={liRef}
				style={{ display: 'flex', justifyContent: 'center', padding: '2px 0', marginBottom: 10 }}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
			>
				<Link href="/ai-studio" onClick={onNavigate}>
					<motion.div
						whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
						style={{
							position: 'relative', width: 42, height: 42, borderRadius: 13,
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
							boxShadow: hover
								? '0 8px 24px color-mix(in srgb, var(--color-primary-500) 48%, transparent)'
								: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
							color: '#fff', overflow: 'hidden', transition: 'box-shadow .2s',
						}}
					>
						<BrainCircuit style={{ width: 17, height: 17, position: 'relative', zIndex: 1 }} strokeWidth={2} />
						<motion.div
							style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
							animate={{ x: ['-100%', '200%'] }}
							transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
						>
							<div style={{ width: '60%', height: '100%', background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)' }} />
						</motion.div>
					</motion.div>
				</Link>
				<AnimatePresence>
					{hover && <CollapsedTooltip label={t('aiStudioCard.tooltip')} anchorRef={liRef} />}
				</AnimatePresence>
			</div>
		);
	}

	return (
		<Link href="/ai-studio" onClick={onNavigate} style={{ display: 'block'  }}>
			<motion.div
				whileTap={{ scale: 0.985 }}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				style={{
					position: 'relative', display: 'flex', alignItems: 'center',
					gap: 11, borderRadius: 14, padding: '11px 13px',
					overflow: 'hidden', cursor: 'pointer',
					background: active
						? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
						: hover
							? 'linear-gradient(135deg, color-mix(in srgb, var(--color-gradient-from) 94%, white), color-mix(in srgb, var(--color-gradient-to) 94%, white))'
							: 'linear-gradient(135deg, color-mix(in srgb, var(--color-gradient-from) 10%, white), color-mix(in srgb, var(--color-gradient-to) 10%, white))',
					border: `1.5px solid color-mix(in srgb, var(--color-primary-400) ${active ? '0%' : '18%'}, transparent)`,
					boxShadow: active
						? '0 8px 28px color-mix(in srgb, var(--color-primary-500) 38%, transparent)'
						: hover
							? '0 6px 22px color-mix(in srgb, var(--color-primary-500) 20%, transparent)'
							: '0 2px 10px color-mix(in srgb, var(--color-primary-500) 10%, transparent)',
					transition: 'all .22s ease',
				}}
			>
				{/* Background orbs */}
				<div style={{
					position: 'absolute', top: -14, right: -10, width: 60, height: 60, borderRadius: '50%',
					background: active ? 'rgba(255,255,255,0.09)' : 'color-mix(in srgb, var(--color-primary-400) 9%, transparent)',
					filter: 'blur(14px)', pointerEvents: 'none',
				}} />
				<div style={{
					position: 'absolute', bottom: -10, left: 24, width: 44, height: 44, borderRadius: '50%',
					background: active ? 'rgba(255,255,255,0.05)' : 'color-mix(in srgb, var(--color-primary-300) 7%, transparent)',
					filter: 'blur(12px)', pointerEvents: 'none',
				}} />
				{/* Icon */}
				<div style={{
					position: 'relative', zIndex: 1, flexShrink: 0,
					display: 'grid', placeContent: 'center',
					width: 34, height: 34, borderRadius: 10,
					background: active ? 'rgba(255,255,255,0.22)' : 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
					color: '#fff',
					boxShadow: active ? 'none' : '0 3px 10px color-mix(in srgb, var(--color-primary-500) 35%, transparent)',
				}}>
					<BrainCircuit style={{ width: 15, height: 15 }} strokeWidth={2} />
					{/* Shimmer */}
					<motion.div
						style={{ position: 'absolute', inset: 0, borderRadius: 10, pointerEvents: 'none', overflow: 'hidden' }}
						animate={{ x: ['-100%', '200%'] }}
						transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', repeatDelay: 2.5 }}
					>
						<div style={{ width: '70%', height: '100%', background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)' }} />
					</motion.div>
				</div>
				{/* Label */}
				<div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						<span style={{
							fontSize: 12.5, fontWeight: 700,
							color:  active || hover ? '#fff' : 'var(--color-primary-700)',
							letterSpacing: '-0.01em',
						}}>
							{t('aiStudioCard.title')}
						</span>
					</div>
					<p style={{
						fontSize: 10.5, fontWeight: 400, marginTop: 1.5,
						color: active || hover ? 'rgba(255,255,255,0.72)' : 'var(--color-primary-500)',
						letterSpacing: '0.01em',
					}}>
						{t('aiStudioCard.subtitle')}
					</p>
				</div>
				{/* Animated sparkle */}
				<motion.div
					animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 0.95, 1] }}
					transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
					style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}
				>
					<Sparkles
						style={{ width: 14, height: 14, color: active || hover ? 'rgba(255,255,255,0.8)' : 'var(--color-primary-400)' }}
						strokeWidth={2}
					/>
				</motion.div>
			</motion.div>
		</Link>
	);
}

/* ─── NavItem ────────────────────────────────────────────────── */
function NavItem({ item, pathname, searchParams, depth = 0, onNavigate, collapsed = false, t, totalUnread, unreadNotifications = 0, P }) {
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
			setOpen(item.expand ? true : anyChildActive(pathname, item.children, searchParams) || isPathActive(pathname, item.href, searchParams));
		}
	}, [pathname, searchParams, collapsed, hasChildren, item.expand, item.children, item.href]);

	/* ── Collapsed mode ── */
	if (collapsed) {
		const firstChildHref = hasChildren ? item.children.find(c => c.href)?.href : null;
		const href = hasChildren ? firstChildHref : item.href;
		const active = isPathActive(pathname, href || '', searchParams);
		return (
			<div
				ref={liRef}
				style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '2px 0' }}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
			>
				{href ? (
					<Link href={href} onClick={onNavigate}>
						<motion.div
							whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
							style={{
								position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
								width: 42, height: 42, borderRadius: 12, transition: 'all .18s',
								...(active ? {
									background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
									boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 32%, transparent)',
									color: '#fff',
								} : {
									background: hover ? P?.bgHover || '#fff' : 'transparent',
									boxShadow: hover ? P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)' : 'none',
									color: hover ? 'var(--color-primary-600)' : P?.textMuted || '#64748b',
								}),
							}}
						>
							<Icon style={{ width: 16, height: 16 }} strokeWidth={active ? 2.5 : 2} />
						</motion.div>
					</Link>
				) : (
					<motion.div
						whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
						style={{
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							width: 42, height: 42, borderRadius: 12, cursor: 'pointer', transition: 'all .18s',
							background: hover ? P?.bgHover || '#fff' : 'transparent',
							boxShadow: hover ? P?.shadow?.sm : 'none',
							color: hover ? 'var(--color-primary-600)' : P?.textMuted || '#64748b',
						}}
					>
						<Icon style={{ width: 16, height: 16 }} strokeWidth={2} />
					</motion.div>
				)}
				<AnimatePresence>
					{hover && !hasChildren && <CollapsedTooltip label={label} anchorRef={liRef} />}
				</AnimatePresence>
				<AnimatePresence>
					{hover && hasChildren && (
						<PortalFlyout anchorRef={liRef}>
							<div style={{ padding: '8px 0' }}>
								<div style={{ padding: '7px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 4 }}>
									<span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#94a3b8' }}>{label}</span>
								</div>
								<div style={{ padding: '4px 6px' }}>
									{item.children.map(child => {
										const A = child.icon || LayoutDashboard;
										const ca = isPathActive(pathname, child.href, searchParams);
										return (
											<Link key={child.href} href={child.href} onClick={onNavigate} style={{
												display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10,
												padding: '8px 10px', transition: 'all .15s',
												...(ca ? { background: 'color-mix(in srgb, var(--color-primary-500) 7%, transparent)', color: 'var(--color-primary-700)' } : { color: '#64748b' })
											}}>
												<span style={{
													display: 'grid', placeContent: 'center', width: 28, height: 28, borderRadius: 8, flexShrink: 0,
													...(ca ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', color: '#fff', boxShadow: '0 3px 8px color-mix(in srgb, var(--color-primary-500) 28%, transparent)' } : { background: '#f8f9fb', color: '#94a3b8', border: '1px solid rgba(0,0,0,0.07)' })
												}}>
													<A style={{ width: 12, height: 12 }} strokeWidth={ca ? 2.5 : 2} />
												</span>
												<span style={{ fontSize: 13, fontWeight: ca ? 600 : 500 }}>{t(`items.${child.nameKey}`)}</span>
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

	/* ── Leaf item ── */
	if (!hasChildren) {
		const active = isPathActive(pathname, item.href, searchParams);
		const isMessages = item.nameKey === 'messages';
		const isNotifications = item.nameKey === 'notifications';
		return (
			<Link href={item.href} onClick={onNavigate} style={{ display: 'block' }}>
				<motion.div
					whileTap={{ scale: 0.986 }}
					onMouseEnter={() => setHover(true)}
					onMouseLeave={() => setHover(false)}
					style={{
						position: 'relative', display: 'flex', alignItems: 'center',
						gap: 10, borderRadius: 12, padding: '7px 10px', marginBottom: 1,
						transition: 'all .18s', cursor: 'pointer', overflow: 'hidden',
						...(active ? {
							background: P?.bgActive || '#ffffff',
							boxShadow: P?.shadow?.md || '0 4px 16px rgba(0,0,0,0.07)',
							color: 'var(--color-primary-800)',
						} : {
							background: hover ? P?.bgHover || 'rgba(255,255,255,0.9)' : 'transparent',
							boxShadow: hover ? P?.shadow?.sm : 'none',
							color: P?.textMuted || '#64748b',
						}),
					}}
					aria-current={active ? 'page' : undefined}
				>
					{/* Active rail */}
					{active && (
						<motion.span
							layoutId="active-rail"
							transition={snap}
							style={{
								position: 'absolute', [isRTL ? 'right' : 'left']: 0,
								top: '18%', bottom: '18%', width: 3, borderRadius: 99,
								background: 'linear-gradient(180deg, var(--color-gradient-from), var(--color-gradient-to))',
							}}
						/>
					)}
					{/* Icon */}
					<span style={{
						position: 'relative', zIndex: 1, flexShrink: 0,
						display: 'grid', placeContent: 'center',
						width: 30, height: 30, borderRadius: 9, transition: 'all .18s',
						...(active ? {
							background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
							color: '#fff',
							boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 32%, transparent)',
						} : {
							background: P?.iconBg || '#ffffff',
							color: hover ? 'var(--color-primary-500)' : P?.textLight || '#94a3b8',
							border: `1px solid ${P?.iconBorder || 'rgba(0,0,0,0.07)'}`,
							boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
						}),
					}}>
						<Icon style={{ width: 13, height: 13 }} strokeWidth={active ? 2.5 : 2} />
					</span>
					{/* Label */}
					<span style={{
						position: 'relative', zIndex: 1, flex: 1,
						overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
						fontSize: 13, fontWeight: active ? 650 : 460, letterSpacing: '0.005em',
						color: active ? 'var(--color-primary-800)' : hover ? P?.text || '#0f172a' : P?.textMuted || '#64748b',
						transition: 'color .18s',
					}}>
						{label}
					</span>
					{isMessages && totalUnread > 0 && (
						<span style={{ position: 'relative', zIndex: 1 }}>
							<Badge value={totalUnread} />
						</span>
					)}
					{isNotifications && unreadNotifications > 0 && (
						<span style={{ position: 'relative', zIndex: 1 }}>
							<Badge value={unreadNotifications} />
						</span>
					)}
				</motion.div>
			</Link>
		);
	}

	/* ── Group item ── */
	const groupActive = anyChildActive(pathname, item.children, searchParams);
	return (
		<div style={{ width: '100%', marginBottom: 1 }}>
			<motion.button
				type="button"
				onClick={() => setOpen(v => !v)}
				whileTap={{ scale: 0.986 }}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				style={{
					position: 'relative', width: '100%', display: 'flex', alignItems: 'center',
					gap: 10, borderRadius: 12, padding: '7px 10px',
					textAlign: isRTL ? 'right' : 'left', border: 'none', cursor: 'pointer', transition: 'all .18s',
					background: open
						? P?.bgActive || '#ffffff'
						: hover ? P?.bgHover || 'rgba(255,255,255,0.9)' : 'transparent',
					boxShadow: open ? P?.shadow?.md : hover ? P?.shadow?.sm : 'none',
					color: open ? 'var(--color-primary-700)' : P?.textMuted || '#64748b',
				}}
				aria-expanded={open}
			>
				<span style={{
					flexShrink: 0, display: 'grid', placeContent: 'center',
					width: 30, height: 30, borderRadius: 9, transition: 'all .18s',
					...(open ? {
						background: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)',
						color: 'var(--color-primary-600)',
						border: '1px solid color-mix(in srgb, var(--color-primary-400) 18%, transparent)',
					} : {
						background: P?.iconBg || '#ffffff',
						color: hover ? 'var(--color-primary-500)' : P?.textLight || '#94a3b8',
						border: `1px solid ${P?.iconBorder || 'rgba(0,0,0,0.07)'}`,
						boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
					}),
				}}>
					<Icon style={{ width: 13, height: 13 }} strokeWidth={2} />
				</span>
				<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: open ? 650 : 460, letterSpacing: '0.005em' }}>
					{label}
				</span>
				{!open && groupActive && (
					<span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: 'var(--color-primary-400)' }} />
				)}
				<motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} style={{ color: open ? 'var(--color-primary-500)' : P?.textXLight || '#cbd5e1', flexShrink: 0 }}>
					<ChevronRight className='rtl:scale-x-[-1]' style={{ width: 12, height: 12 }} strokeWidth={2.5} />
				</motion.span>
			</motion.button>
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
							position: 'relative', marginTop: 3, marginBottom: 3,
							[isRTL ? 'marginRight' : 'marginLeft']: 16,
						}}>
							<div style={{
								position: 'absolute', top: 4, bottom: 4,
								[isRTL ? 'right' : 'left']: 15,
								width: 1.5, borderRadius: 2,
								background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-primary-300) 60%, transparent), transparent)',
							}} />
							<ul style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: 14, margin: 0, listStyle: 'none' }}>
								{item.children.map(child => (
									<li key={child.href || child.nameKey}>
										<NavItem item={child} pathname={pathname} searchParams={searchParams} depth={depth + 1} onNavigate={onNavigate} t={t} totalUnread={totalUnread} P={P} />
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

function NavSection({ sectionKey, items, pathname, searchParams, onNavigate, collapsed = false, t, totalUnread = 0, unreadNotifications = 0, isHidden, P }) {
	const t_nav = useTranslations('nav');
	const label = t_nav(sectionKey, { defaultValue: '' });
	const visibleItems = items.filter(item => !isHidden(item.id));
	if (!visibleItems.length) return null;
	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			{!collapsed && label && <SectionLabel label={label} P={P} />}
			{collapsed && <div style={{ height: 6 }} />}
			{visibleItems.map(item => (
				<NavItem key={item.id || item.href || item.nameKey} item={item} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} collapsed={collapsed} t={t} totalUnread={totalUnread} unreadNotifications={unreadNotifications} P={P} />
			))}
		</div>
	);
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({ user, size = 'md' }) {
	const text = initialsFrom(user?.name, user?.email);
	const isActive = (user?.status || '').toLowerCase() === 'active';
	const dim = size === 'sm' ? { w: 36, h: 36, font: 11, radius: 10 } : { w: 40, h: 40, font: 13, radius: 11 };
	return (
		<div style={{ position: 'relative', flexShrink: 0 }}>
			<div style={{
				display: 'grid', placeItems: 'center', borderRadius: dim.radius,
				fontWeight: 800, color: '#fff', position: 'relative', overflow: 'hidden',
				width: dim.w, height: dim.h, fontSize: dim.font,
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 32%, transparent)',
				letterSpacing: '0.03em',
			}}>
				<span style={{ position: 'relative', zIndex: 1 }}>{text}</span>
				<motion.div
					style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
					animate={{ x: ['-100%', '200%'] }}
					transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
				>
					<div style={{ width: '60%', height: '100%', background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)' }} />
				</motion.div>
			</div>
			<span style={{
				position: 'absolute', right: -2, bottom: -2,
				width: 10, height: 10, borderRadius: '50%',
				background: isActive ? '#22c55e' : '#94a3b8',
				boxShadow: '0 0 0 2.5px #f8f9fb',
			}}>
				{isActive && (
					<motion.span
						style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e' }}
						animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
						transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
					/>
				)}
			</span>
		</div>
	);
}

/* ─── SidebarHeader ──────────────────────────────────────────── */
function SidebarHeader({ user, collapsed, setCollapsed, P }) {
	const t_r = useTranslations('');
	return (
		<div style={{
			padding: collapsed ? '14px 10px 12px' : '16px 14px 13px',
			borderBottom: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
			flexShrink: 0,
			background: P?.headerBg || 'rgba(255,255,255,0.8)',
			backdropFilter: 'blur(12px)',
		}}>
			{collapsed ? (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
					<Avatar user={user} size="sm" />
					<motion.button
						whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
						onClick={() => setCollapsed(v => !v)}
						style={{
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							width: 32, height: 32, borderRadius: 9,
							border: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
							background: P?.bgCard || '#fff',
							color: P?.textMuted || '#64748b', cursor: 'pointer',
							boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
						}}
					>
						<PanelLeftOpen style={{ width: 13, height: 13 }} strokeWidth={2} />
					</motion.button>
				</div>
			) : (
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<Avatar user={user} size="md" />
					<div style={{ flex: 1, minWidth: 0 }}>
						<MultiLangText style={{
							display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
							fontSize: 13.5, fontWeight: 700, color: P?.text || '#0f172a', lineHeight: 1.3, letterSpacing: '-0.01em',
						}}>
							{user?.name}
						</MultiLangText>
						<p style={{ fontSize: 10, marginTop: 3, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-primary-400)' }}>
							{t_r(`myProfile.roles.${user?.role}`)}
						</p>
					</div>
					<motion.button
						whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
						onClick={() => setCollapsed(v => !v)}
						style={{
							flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
							width: 30, height: 30, borderRadius: 9,
							border: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
							background: P?.bgCard || '#fff',
							color: P?.textMuted || '#64748b', cursor: 'pointer',
							boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
						}}
					>
						<PanelLeftClose style={{ width: 13, height: 13 }} strokeWidth={2} />
					</motion.button>
				</div>
			)}
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
	if (segs.length > 0 && (segs[0] === 'en' || segs[0] === 'ar')) { segs[0] = nextLocale; return '/' + segs.join('/'); }
	return '/' + [nextLocale, ...segs].join('/');
}

/* ─── SidebarLanguageToggle ──────────────────────────────────── */
function SidebarLanguageToggle({ collapsed, P }) {
	const locale = useLocale();
	const tTheme = useTranslations('themeSwitcher');
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

	const btnBase = {
		border: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
		background: P?.bgCard || '#ffffff',
		boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
	};

	if (collapsed) {
		return (
			<motion.button
				type="button"
				onClick={toggle}
				whileHover={{ scale: 1.06 }}
				whileTap={{ scale: 0.95 }}
				title={isEN ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
				style={{
					width: 42,
					height: 32,
					borderRadius: 9,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'pointer',
					...btnBase,
					flexDirection: 'column',
					gap: 1,
					position: 'relative',
					overflow: 'hidden',
				}}
			>
				<Globe
					style={{ width: 12, height: 12, color: P?.textMuted || '#64748b' }}
					strokeWidth={2}
				/>
				<span
					style={{
						fontSize: 7,
						fontWeight: 800,
						letterSpacing: '0.08em',
						color: 'var(--color-primary-500)',
					}}
				>
					{locale.toUpperCase()}
				</span>

				{pending && (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: P?.bgCard || '#fff',
							display: 'grid',
							placeItems: 'center',
							borderRadius: 9,
						}}
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							style={{
								width: 12,
								height: 12,
								border: `2px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
								borderTopColor: 'var(--color-primary-500)',
								borderRadius: '50%',
							}}
						/>
					</div>
				)}
			</motion.button>
		);
	}

	const options = [
		{ lang: 'ar', label: 'العربية' },
		{ lang: 'en', label: 'English' },
	];

	return (
		<motion.button
			type="button"
			onClick={toggle}
			whileHover={{ scale: 1.005 }}
			whileTap={{ scale: 0.995 }}
			dir='ltr'
			style={{
				position: 'relative',
				width: '100%',
				height: 36,
				borderRadius: 10,
				display: 'flex',
				alignItems: 'center',
				overflow: 'hidden',
				cursor: 'pointer',
				...btnBase,
			}}
		>
			<motion.span
				animate={{ x: isEN ? '100%' : '0%' }}
				transition={snap}
				style={{
					position: 'absolute',
					top: 3,
					left: 3,
					width: 'calc(50% - 3px)',
					height: 'calc(100% - 6px)',
					borderRadius: 8,
					background:
						'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
					boxShadow:
						'0 2px 6px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
					zIndex: 0,
				}}
			/>

			{options.map(({ lang, label }) => {
				const isActive = locale === lang;

				return (
					<div
						key={lang}
						style={{
							position: 'relative',
							zIndex: 1,
							flex: 1,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 4,
						}}
					>
						<Globe
							style={{
								width: 10,
								height: 10,
								color: isActive ? '#fff' : (P?.textMuted || 'var(--color-primary-500)'),
							}}
							strokeWidth={2.5}
						/>
						<span
							style={{
								fontSize: 10.5,
								fontWeight: 700,
								color: isActive ? '#fff' : (P?.textMuted || 'var(--color-primary-500)'),
								letterSpacing: '0.01em',
							}}
						>
							{label}
						</span>
					</div>
				);
			})}

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
							background: `${P?.bgCard || '#fff'}cc`,
							borderRadius: 9,
							display: 'grid',
							placeItems: 'center',
						}}
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							style={{
								width: 13,
								height: 13,
								border: `2px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
								borderTopColor: 'var(--color-primary-500)',
								borderRadius: '50%',
							}}
						/>
					</motion.span>
				)}
			</AnimatePresence>
		</motion.button>
	);
}

/* ─── SidebarThemeSwitcher ───────────────────────────────────── */
function SidebarThemeSwitcher({ collapsed, P }) {
	const { theme: currentTheme, setTheme } = useTheme();
	const tTheme = useTranslations('themeSwitcher');
	const [open, setOpen] = useState(false);
	const triggerRef = useRef(null);
	const panelRef = useRef(null);
	const [panelPos, setPanelPos] = useState(null);
	const isRTL = useMemo(() => getDir() === 'rtl', []);
	const themeEntries = useMemo(() => Object.entries(COLOR_PALETTES), []);
	const currentPalette = COLOR_PALETTES[currentTheme];

	useEffect(() => {
		if (!open) return;
		const fn = e => { if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return; setOpen(false); };
		document.addEventListener('mousedown', fn);
		return () => document.removeEventListener('mousedown', fn);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const fn = e => { if (e.key === 'Escape') setOpen(false); };
		document.addEventListener('keydown', fn);
		return () => document.removeEventListener('keydown', fn);
	}, [open]);

	useLayoutEffect(() => {
		if (!open || !triggerRef.current) return;
		const rect = triggerRef.current.getBoundingClientRect();
		const panelW = 316; const pad = 8;
		let left = isRTL ? rect.left - panelW - pad : rect.right + pad;
		if (!isRTL && left + panelW > window.innerWidth - pad) left = rect.left - panelW - pad;
		if (isRTL && left < pad) left = rect.right + pad;
		const approxH = 460;
		let bottom = window.innerHeight - rect.bottom;
		if (rect.bottom - approxH < pad) bottom = window.innerHeight - rect.top - approxH;
		setPanelPos({ left, bottom: Math.max(pad, bottom) });
	}, [open, isRTL]);

	const xFrom = isRTL ? 8 : -8;
	const btnBase = {
		border: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
		background: P?.bgCard || '#ffffff',
		boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
	};

	return (
		<div style={{ position: 'relative', display: collapsed ? 'flex' : 'block', justifyContent: collapsed ? 'center' : undefined }}>
			<motion.button
				ref={triggerRef} type="button" onClick={() => setOpen(v => !v)}
				whileHover={{ scale: collapsed ? 1.06 : 1.005 }} whileTap={{ scale: collapsed ? 0.95 : 0.995 }}
				style={{
					display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all .18s',
					...(collapsed ? { width: 42, height: 32, borderRadius: 9, justifyContent: 'center' } : { width: '100%', height: 32, borderRadius: 9, padding: '0 10px' }),
					...(open ? {
						background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
						color: '#fff', border: '1px solid transparent',
						boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary-500) 28%, transparent)',
					} : { ...btnBase, color: P?.textMuted || '#64748b' }),
				}}
			>
				<Palette style={{ width: 12, height: 12, flexShrink: 0 }} strokeWidth={2} />
				{!collapsed && (
					<>
						<span className='rtl:text-right ltr:text-left' style={{ fontSize: 11.5, fontWeight: 600, flex: 1, color: open ? '#fff' : P?.textMuted || '#64748b' }}>{tTheme('trigger')}</span>
						<div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
							{currentPalette && [currentPalette.primary[500], currentPalette.secondary[500], currentPalette.primary[300]].map((c, i) => (
								<span key={i} style={{ width: 7, height: 7, borderRadius: 3, background: open ? 'rgba(255,255,255,0.6)' : c }} />
							))}
						</div>
						<motion.span animate={{ rotate: open ? 180 : 0 }} transition={snap}>
							<ChevronDown style={{ width: 11, height: 11, flexShrink: 0, color: open ? '#fff' : P?.textXLight || '#cbd5e1' }} strokeWidth={2.5} />
						</motion.span>
					</>
				)}
			</motion.button>
			{open && typeof window !== 'undefined' && createPortal(
				<ThemePanel ref={panelRef} themeEntries={themeEntries} currentTheme={currentTheme} currentPalette={currentPalette}
					onSelect={key => { setTheme(key); setTimeout(() => setOpen(false), 250); }}
					pos={panelPos} xFrom={xFrom} tTheme={tTheme}
				/>,
				document.body
			)}
		</div>
	);
}

/* ─── ThemePanel ─────────────────────────────────────────────── */
const ThemePanel = React.forwardRef(function ThemePanel({ themeEntries, currentTheme, currentPalette, onSelect, pos, xFrom, tTheme }, ref) {
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
					position: 'fixed', bottom: pos?.bottom ?? 16, zIndex: 9999, width: 316,
					borderRadius: 18, overflow: 'hidden', background: '#fff',
					border: '1px solid rgba(0,0,0,0.07)',
					boxShadow: '0 24px 64px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)',
				}}
			>
				<div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
					<div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeContent: 'center', color: '#fff', flexShrink: 0, background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 30%, transparent)' }}>
						<Paintbrush style={{ width: 14, height: 14 }} strokeWidth={2.5} />
					</div>
					<div>
						<p style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>{tTheme?.('title') || 'Color Theme'}</p>
						<p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{tTheme?.('subtitle') || `${themeEntries.length} palettes available`}</p>
					</div>
				</div>
				<div style={{ padding: 10, maxHeight: 380, overflowY: 'auto', scrollbarWidth: 'thin' }}>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
						{themeEntries.map(([key, palette], idx) => {
							const isActive = currentTheme === key;
							return (
								<motion.button
									key={key}
									initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
									whileHover={{ scale: 1.025, y: -1 }} whileTap={{ scale: 0.975 }}
									onClick={() => onSelect(key)}
									style={{
										position: 'relative', borderRadius: 12, overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
										border: isActive ? `2px solid ${palette.primary[400]}` : '1.5px solid rgba(0,0,0,0.07)',
										background: isActive ? palette.primary[50] : '#fafafa',
										boxShadow: isActive ? `0 4px 16px color-mix(in srgb, ${palette.primary[400]} 18%, transparent)` : '0 1px 3px rgba(0,0,0,0.06)',
									}}
								>
									<div style={{ height: 38, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})` }}>
										{isActive && (
											<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={snap}
												style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'white', display: 'grid', placeContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
												<Check style={{ width: 10, height: 10, color: palette.primary[500] }} strokeWidth={3} />
											</motion.div>
										)}
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 9px' }}>
										{[palette.primary[500], palette.secondary[500], palette.primary[300]].map((c, i) => (
											<span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: c }} />
										))}
										{isActive && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: palette.primary[500] }}>Active</span>}
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

/* ─── Toggle ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
	return (
		<motion.button
			type="button" onClick={onChange} whileTap={{ scale: 0.93 }}
			style={{
				position: 'relative', width: 36, height: 20, borderRadius: 99, border: 'none',
				cursor: 'pointer', flexShrink: 0,
				background: checked ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' : '#e2e8f0',
				boxShadow: checked ? '0 2px 8px color-mix(in srgb, var(--color-primary-500) 30%, transparent)' : 'none',
				transition: 'background .2s, box-shadow .2s',
			}}
		>
			<motion.span
				animate={{ x: checked ? 18 : 2 }}
				transition={snap}
				style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
			/>
		</motion.button>
	);
}

/* ─── Palette Picker ─────────────────────────────────────────── */
function PalettePicker({ paletteKey, setPaletteKey, t }) {
	const entries = Object.entries(SIDEBAR_PALETTES);
	return (
		<div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
				<div style={{
					width: 22, height: 22, borderRadius: 7,
					background: 'color-mix(in srgb, var(--color-primary-500) 12%, transparent)',
					display: 'grid', placeContent: 'center',
				}}>
					<Sliders style={{ width: 11, height: 11, color: 'var(--color-primary-600)' }} strokeWidth={2} />
				</div>
				<span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b' }}>
					{t('customize.appearanceTitle')}
				</span>
				<div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
			</div>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
				{entries.map(([key, pal]) => {
					const isActive = paletteKey === key;
					return (
						<motion.button
							key={key}
							whileHover={{ scale: 1.04, y: -1 }}
							whileTap={{ scale: 0.97 }}
							onClick={() => setPaletteKey(key)}
							style={{
								position: 'relative', borderRadius: 11, overflow: 'hidden',
								cursor: 'pointer', textAlign: 'center', padding: 0,
								border: isActive ? '2px solid var(--color-primary-400)' : '1.5px solid rgba(0,0,0,0.07)',
								background: isActive ? 'color-mix(in srgb, var(--color-primary-500) 5%, white)' : '#fafafa',
								boxShadow: isActive ? '0 4px 14px color-mix(in srgb, var(--color-primary-400) 18%, transparent)' : '0 1px 3px rgba(0,0,0,0.06)',
								transition: 'border-color .18s, box-shadow .18s',
							}}
						>
							{/* Preview strips */}
							<div style={{ height: 28, display: 'flex', overflow: 'hidden', borderRadius: '9px 9px 0 0' }}>
								{pal.preview.map((c, i) => (
									<div key={i} style={{ flex: 1, background: c }} />
								))}
							</div>
							{/* Check */}
							{isActive && (
								<motion.div
									initial={{ scale: 0 }} animate={{ scale: 1 }} transition={snap}
									style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary-500)', display: 'grid', placeContent: 'center' }}
								>
									<Check style={{ width: 8, height: 8, color: '#fff' }} strokeWidth={3} />
								</motion.div>
							)}
							<div style={{ padding: '5px 6px 6px' }}>
								<p style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', letterSpacing: '0.02em', lineHeight: 1.3, margin: 0 }}>
									{t(pal.nameKey)}
								</p>
							</div>
						</motion.button>
					);
				})}
			</div>
		</div>
	);
}

/* ─── Group metadata ─────────────────────────────────────────── */
const GROUP_CONFIG = {
	ai: { icon: BrainCircuit, color: 'var(--color-primary-500)' },
	main: { icon: LayoutDashboard, color: '#10b981' },
	management: { icon: Users, color: '#6366f1' },
	content: { icon: BookOpen, color: '#f59e0b' },
	workspace: { icon: GanttChart, color: '#3b82f6' },
	communication: { icon: MessageSquare, color: '#8b5cf6' },
	tools: { icon: Calculator, color: '#14b8a6' },
	finance: { icon: Wallet, color: '#22c55e' },
	account: { icon: UserIcon, color: '#64748b' },
};

/* ─── CustomizeSidebarModal ──────────────────────────────────── */
function CustomizeSidebarModal({ open, onClose, sections, isHidden, toggleHidden, resetAll, paletteKey, setPaletteKey, t }) {
	const [search, setSearch] = useState('');
	const searchRef = useRef(null);

	const allItems = useMemo(() => {
		const seen = new Set();
		const result = [];
		sections?.forEach(section => {
			section.items.forEach(item => {
				if (!seen.has(item.id)) {
					seen.add(item.id);
					result.push(item);
					if (item.children) {
						item.children.forEach(child => {
							if (!seen.has(child.id)) { seen.add(child.id); result.push(child); }
						});
					}
				}
			});
		});
		return result;
	}, [sections]);

	const filtered = useMemo(() => {
		if (!search.trim()) return allItems;
		const q = search.toLowerCase();
		return allItems.filter(item => {
			const label = item.nameKey?.toLowerCase() || '';
			const desc = (item.descKey || '').toLowerCase();
			return label.includes(q) || desc.includes(q);
		});
	}, [allItems, search]);

	const grouped = useMemo(() => {
		const groups = {};
		filtered.forEach(item => {
			const g = item.group || 'main';
			if (!groups[g]) groups[g] = [];
			groups[g].push(item);
		});
		return groups;
	}, [filtered]);

	useEffect(() => {
		if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 80);
	}, [open]);
	useEffect(() => {
		if (!open) return;
		const fn = e => { if (e.key === 'Escape') onClose(); };
		document.addEventListener('keydown', fn);
		return () => document.removeEventListener('keydown', fn);
	}, [open, onClose]);

	const hiddenCount = allItems.filter(item => isHidden(item.id) && !item.required).length;
	const visibleCount = allItems.filter(i => !isHidden(i.id)).length;

	if (!open) return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="backdrop"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						transition={{ duration: 0.22 }}
						onClick={onClose}
						style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)' }}
					/>
					<motion.div
						key="modal"
						initial={{ opacity: 0, scale: 0.94, y: 18 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.94, y: 18 }}
						transition={modal}
						className='customize_sidebar'
						style={{
							position: 'fixed', top: '50%', left: '50%',
							transform: 'translate(-50%,-50%)',
							zIndex: 10001,
							width: 'min(580px, calc(100vw - 32px))',
							maxHeight: 'calc(100vh - 64px)',
							borderRadius: 22, overflow: 'hidden',
							background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)',
							boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.07)',
							display: 'flex', flexDirection: 'column',
						}}
					>
						{/* Modal Header */}
						<div style={{
							padding: '22px 24px 16px',
							borderBottom: '1px solid rgba(0,0,0,0.06)',
							flexShrink: 0,
							background: 'linear-gradient(to bottom, #f8fafd, #ffffff)',
						}}>
							<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
									<div style={{
										width: 42, height: 42, borderRadius: 12,
										display: 'grid', placeContent: 'center', color: '#fff', flexShrink: 0,
										background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
										boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
									}}>
										<LayoutGrid style={{ width: 18, height: 18 }} strokeWidth={2.5} />
									</div>
									<div>
										<h2 style={{ fontSize: 16.5, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.3 }}>
											{t('customize.title')}
										</h2>
										<p style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
											{t('customize.subtitle')}
											{hiddenCount > 0 && (
												<span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', color: '#dc2626', fontWeight: 700, fontSize: 10.5 }}>
													{hiddenCount} {t('customize.hiddenBadge')}
												</span>
											)}
										</p>
									</div>
								</div>
								<motion.button
									whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
									onClick={onClose}
									style={{
										width: 32, height: 32, borderRadius: 9,
										border: '1px solid rgba(0,0,0,0.07)', background: '#fff',
										color: '#64748b', display: 'grid', placeContent: 'center',
										cursor: 'pointer', flexShrink: 0,
										boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
									}}
								>
									<X style={{ width: 14, height: 14 }} strokeWidth={2.5} />
								</motion.button>
							</div>
							{/* Search */}
							<div style={{
								display: 'flex', alignItems: 'center', gap: 9,
								padding: '9px 13px', borderRadius: 12,
								background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.07)',
							}}>
								<Search style={{ width: 13, height: 13, color: '#94a3b8', flexShrink: 0 }} strokeWidth={2} />
								<input
									ref={searchRef}
									value={search}
									onChange={e => setSearch(e.target.value)}
									placeholder={t('customize.searchPlaceholder')}
									style={{
										flex: 1, border: 'none', outline: 'none', background: 'transparent',
										fontSize: 13, color: '#0f172a', fontFamily: 'inherit',
										'::placeholder': { color: '#94a3b8' },
									}}
								/>
								{search && (
									<motion.button
										initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}
										onClick={() => setSearch('')}
										style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'grid', placeContent: 'center', padding: 0 }}
									>
										<X style={{ width: 11, height: 11 }} strokeWidth={2.5} />
									</motion.button>
								)}
							</div>
						</div>

						{/* Modal Body */}
						<div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>
							{/* Palette Picker — always visible when not searching */}
							{!search.trim() && (
								<div style={{ marginBottom: 24 }}>
									<PalettePicker paletteKey={paletteKey} setPaletteKey={setPaletteKey} t={t} />
								</div>
							)}

							{/* Items section header */}
							{!search.trim() && (
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
									<div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(99,102,241,0.1)', display: 'grid', placeContent: 'center' }}>
										<LayoutGrid style={{ width: 11, height: 11, color: '#6366f1' }} strokeWidth={2} />
									</div>
									<span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b' }}>
										{t('customize.navItemsTitle')}
									</span>
									<div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
								</div>
							)}

							{Object.entries(grouped).length === 0 ? (
								<div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
									<Search style={{ width: 28, height: 28, margin: '0 auto 10px', opacity: 0.3 }} strokeWidth={1.5} />
									<p style={{ fontSize: 13, fontWeight: 500 }}>{t('customize.noResults')}</p>
								</div>
							) : (
								Object.entries(grouped).map(([groupKey, items]) => {
									const gcfg = GROUP_CONFIG[groupKey] || { icon: LayoutDashboard, color: '#64748b' };
									const GIcon = gcfg.icon;
									const groupLabelKey = `groups.${groupKey}`;
									return (
										<div key={groupKey} style={{ marginBottom: 22 }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
												<div style={{
													width: 22, height: 22, borderRadius: 7,
													background: `${gcfg.color}18`,
													display: 'grid', placeContent: 'center',
												}}>
													<GIcon style={{ width: 11, height: 11, color: gcfg.color }} strokeWidth={2} />
												</div>
												<span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#94a3b8' }}>
													{t(groupLabelKey)}
												</span>
												<div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
											</div>
											<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
												{items.map((item, idx) => {
													const Icon = item.icon || LayoutDashboard;
													const hidden = isHidden(item.id);
													return (
														<motion.div
															key={item.id}
															initial={{ opacity: 0, y: 4 }}
															animate={{ opacity: 1, y: 0 }}
															transition={{ delay: idx * 0.025 }}
															style={{
																display: 'flex', alignItems: 'center', gap: 12,
																padding: '11px 13px', borderRadius: 13,
																background: hidden ? '#fafafa' : '#f8fafd',
																border: `1px solid ${hidden ? 'rgba(0,0,0,0.06)' : 'color-mix(in srgb, var(--color-primary-300) 18%, transparent)'}`,
																opacity: hidden ? 0.55 : 1,
																transition: 'all .2s',
															}}
														>
															<div style={{
																width: 34, height: 34, borderRadius: 10,
																display: 'grid', placeContent: 'center', flexShrink: 0,
																background: hidden
																	? '#f1f5f9'
																	: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
																color: hidden ? '#94a3b8' : '#fff',
																boxShadow: hidden ? 'none' : '0 2px 8px color-mix(in srgb, var(--color-primary-500) 28%, transparent)',
																transition: 'all .2s',
															}}>
																<Icon style={{ width: 14, height: 14 }} strokeWidth={2} />
															</div>
															<div style={{ flex: 1, minWidth: 0 }}>
																<div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
																	<span style={{ fontSize: 13.5, fontWeight: 650, color: '#0f172a', letterSpacing: '-0.01em' }}>
																		{t(`items.${item.nameKey}`)}
																	</span>
																	{item.required && (
																		<span style={{
																			display: 'inline-flex', alignItems: 'center', gap: 3,
																			fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
																			padding: '2px 7px', borderRadius: 5,
																			background: 'rgba(100,116,139,0.1)', color: '#64748b',
																		}}>
																			<Lock style={{ width: 8, height: 8 }} strokeWidth={2.5} />
																			{t('customize.requiredLabel')}
																		</span>
																	)}
																	{item.highlightVariant === 'premium' && (
																		<span style={{
																			display: 'inline-flex', alignItems: 'center', gap: 3,
																			fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
																			padding: '2px 7px', borderRadius: 5,
																			background: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)',
																			color: 'var(--color-primary-600)',
																		}}>
																			<Sparkles style={{ width: 8, height: 8 }} strokeWidth={2.5} />
																			{t('customize.premiumLabel')}
																		</span>
																	)}
																</div>
																{item.descKey && (
																	<p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2.5, lineHeight: 1.45 }}>
																		{t(item.descKey)}
																	</p>
																)}
															</div>
															{item.required ? (
																<div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
																	<Lock style={{ width: 11, height: 11 }} strokeWidth={2} />
																</div>
															) : (
																<Toggle checked={!hidden} onChange={() => toggleHidden(item.id)} />
															)}
														</motion.div>
													);
												})}
											</div>
										</div>
									);
								})
							)}
						</div>

						{/* Modal Footer */}
						<div style={{
							padding: '13px 22px', borderTop: '1px solid rgba(0,0,0,0.06)',
							background: '#fafbfd', flexShrink: 0,
							display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
						}}>
							<span style={{ fontSize: 12, color: '#64748b' }}>
								{visibleCount} {t('customize.ofLabel')} {allItems.length} {t('customize.visibleLabel')}
							</span>
							<div style={{ display: 'flex', gap: 8 }}>
								<motion.button
									whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
									onClick={resetAll}
									style={{
										padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
										border: '1px solid rgba(0,0,0,0.07)', background: '#fff', color: '#64748b', cursor: 'pointer',
										boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
									}}
								>
									{t('customize.resetButton')}
								</motion.button>
								<motion.button
									whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
									onClick={onClose}
									style={{
										padding: '7px 20px', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
										border: 'none', cursor: 'pointer', color: '#fff',
										background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
										boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
									}}
								>
									{t('customize.doneButton')}
								</motion.button>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body
	);
}

/* ─── SidebarFooter ──────────────────────────────────────────── */
function SidebarFooter({ collapsed, onLogout, logoutLabel, sections, isHidden, toggleHidden, resetAll, paletteKey, setPaletteKey, t, P }) {
	const [customizeOpen, setCustomizeOpen] = useState(false);
	const isRTL = getDir() === 'rtl';
	const btnBase = {
		border: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
		background: P?.bgCard || '#ffffff',
		boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
	};

	return (
		<>
			<div style={{
				flexShrink: 0,
				borderTop: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
				background: P?.footerBg || 'rgba(248,249,251,0.9)',
				backdropFilter: 'blur(12px)',
				padding: '10px 12px 12px',
			}}>
				<div style={{
					display: 'flex', flexDirection: 'column', gap: 5,
					alignItems: collapsed ? 'center' : 'stretch',
					marginBottom: 8,
				}}>
					<SidebarLanguageToggle collapsed={collapsed} P={P} />
					<SidebarThemeSwitcher collapsed={collapsed} P={P} />

					{/* Customize Sidebar */}
					<div style={{ display: collapsed ? 'flex' : 'block', justifyContent: collapsed ? 'center' : undefined }}>
						<motion.button
							whileHover={{ scale: collapsed ? 1.06 : 1.005 }}
							whileTap={{ scale: collapsed ? 0.95 : 0.995 }}
							onClick={() => setCustomizeOpen(true)}
							title={t('customize.triggerLabel')}
							style={{
								display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
								transition: 'all .18s',
								...(collapsed ? { width: 42, height: 32, borderRadius: 9, justifyContent: 'center' } : { width: '100%', height: 32, borderRadius: 9, padding: '0 10px' }),
								...btnBase,
								color: P?.textMuted || '#64748b',
							}}
						>
							<Settings2 style={{ width: 12, height: 12, flexShrink: 0 }} strokeWidth={2} />
							{!collapsed && (
								<span className='w-ful rtl:text-right ltr:text-left' style={{ fontSize: 11.5, fontWeight: 600, flex: 1,   color: P?.textMuted || '#64748b' }}>
									{t('customize.triggerLabel')}
								</span>
							)}
						</motion.button>
					</div>
				</div>

				{/* Logout */}
				<motion.button
					whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
					onClick={onLogout}
					onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.13)'}
					onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
					style={{
						display: 'flex', alignItems: 'center',
						justifyContent: collapsed ? 'center' : 'flex-start',
						gap: 8, borderRadius: 9, fontWeight: 600, fontSize: 12,
						cursor: 'pointer', border: '1px solid rgba(239,68,68,0.18)',
						width: collapsed ? 42 : '100%', height: 32,
						padding: collapsed ? 0 : '0 12px',
						background: 'rgba(239,68,68,0.07)', color: '#dc2626',
						marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0,
						transition: 'background .18s',
					}}
				>
					<LogOut style={{ width: 12, height: 12, transform: isRTL ? 'scaleX(-1)' : 'none', flexShrink: 0 }} strokeWidth={2} />
					{!collapsed && <span>{logoutLabel}</span>}
				</motion.button>
			</div>

			<CustomizeSidebarModal
				open={customizeOpen}
				onClose={() => setCustomizeOpen(false)}
				sections={sections}
				isHidden={isHidden}
				toggleHidden={toggleHidden}
				resetAll={resetAll}
				paletteKey={paletteKey}
				setPaletteKey={setPaletteKey}
				t={t}
			/>
		</>
	);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({ open, setOpen, collapsed: collapsedProp, setCollapsed: setCollapsedProp }) {
	const pathname = useNextPathname();
	const searchParams = useSearchParams();
	const router = useI18nRouter();
	const user = useUser();
	const role = user?.role ?? null;
	const t = useTranslations('nav');
	const t_header = useTranslations('header');
	const { totalUnread } = useUnreadChats();
	const { unreadNotifications } = useUnreadNotifications();

	const [collapsedLS, setCollapsedLS] = useLocalStorageState(LS_COLLAPSED, false);
	const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : collapsedLS;
	const setCollapsed = typeof setCollapsedProp === 'function' ? setCollapsedProp : setCollapsedLS;

	const { isHidden, toggle: toggleHidden, resetAll } = useHiddenItems();
	const { paletteKey, setPaletteKey, palette: P } = useSidebarPalette();

	const sections = useMemo(() => {
		if (!role) return null;
		return NAV.filter(s => s.role === role);
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

	/* ── Desktop Sidebar ── */
	const DesktopSidebar = (
		<aside
			className="hidden lg:flex flex-col shrink-0 rtl:border-l ltr:border-r"
			style={{
				width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
				height: '100vh',
				position: 'relative',
				zIndex: 1000,
				overflow: 'hidden',
				background: P.bg,
				borderColor: P.border,
				boxShadow: '1px 0 0 0 rgba(0,0,0,0.05), 6px 0 28px rgba(15,23,42,0.04)',
				transition: 'width .28s cubic-bezier(0.22,1,0.36,1)',
			}}
		>
			{/* Texture */}
			<div style={{
				position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
				backgroundImage: P.texture,
				backgroundSize: P.textureSize,
				opacity: 1,
			}} />
			{/* Top accent bar */}
			<div style={{
				position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 2,
				background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to), var(--color-gradient-from))',
				backgroundSize: '200% 100%',
			}} />

			<div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
				<SidebarHeader user={user} collapsed={collapsed} setCollapsed={setCollapsed} P={P} />

				<LayoutGroup id="sidebar-desktop">
					<div style={{ flex: 1, overflow: 'hidden' }}>
						<ScrollShadow P={P}>
							<nav style={{ padding: collapsed ? '8px 10px' : '8px 10px 10px', display: 'flex', flexDirection: 'column' }}>
								{role === 'admin' && (
									<AIStudioItem collapsed={collapsed} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} P={P} />
								)}
								 
 								{sections?.map(section => (
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
										unreadNotifications={unreadNotifications}
										isHidden={isHidden}
										P={P}
									/>
								))}
							</nav>
						</ScrollShadow>
					</div>
				</LayoutGroup>

				<SidebarFooter
					collapsed={collapsed}
					onLogout={handleLogout}
					logoutLabel={logoutLabel}
					sections={sections}
					isHidden={isHidden}
					toggleHidden={toggleHidden}
					resetAll={resetAll}
					paletteKey={paletteKey}
					setPaletteKey={setPaletteKey}
					t={t}
					P={P}
				/>
			</div>
		</aside>
	);

	/* ── Mobile Drawer ── */
	const MobileDrawer = (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="overlay"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						transition={{ duration: 0.22 }}
						onClick={() => setOpen && setOpen(false)}
						className="fixed inset-0 z-40 lg:hidden"
						style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)' }}
					/>
					<motion.aside
						key="drawer"
						initial={{ x: -290 }} animate={{ x: 0 }} exit={{ x: -290 }}
						transition={slide}
						className="fixed z-50 top-0 left-0 h-dvh flex flex-col lg:hidden"
						style={{
							width: 278,
							background: P.bg,
							borderRight: `1px solid ${P.border}`,
							boxShadow: '20px 0 60px rgba(15,23,42,0.12)',
						}}
					>
						{/* Texture */}
						<div style={{
							position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
							backgroundImage: P.texture,
							backgroundSize: P.textureSize,
						}} />
						{/* Top accent */}
						<div style={{
							position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 2,
							background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))',
						}} />
						{/* Mobile header */}
						<div style={{
							position: 'relative', zIndex: 1, flexShrink: 0, height: 58, padding: '0 14px',
							display: 'flex', alignItems: 'center', justifyContent: 'space-between',
							borderBottom: `1px solid ${P.border}`, background: P.headerBg,
							backdropFilter: 'blur(12px)',
						}}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
								<div style={{
									width: 30, height: 30, borderRadius: 9, display: 'grid', placeContent: 'center',
									color: '#fff', background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
									boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
								}}>
									<LayoutDashboard style={{ width: 13, height: 13 }} strokeWidth={2.5} />
								</div>
								<span style={{ fontSize: 12.5, fontWeight: 700, color: P.text, letterSpacing: '-0.01em' }}>
									{role === 'super_admin' && t('brand.superAdminPortal')}
									{role === 'admin' && t('brand.adminPortal')}
									{role === 'coach' && t('brand.coachPortal')}
									{role === 'client' && t('brand.clientPortal')}
								</span>
							</div>
							<motion.button
								whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
								onClick={() => setOpen(false)}
								style={{
									width: 30, height: 30, borderRadius: 9, border: `1px solid ${P.border}`,
									background: P.bgCard, color: P.textMuted, display: 'grid', placeContent: 'center',
									cursor: 'pointer', boxShadow: P.shadow?.sm,
								}}
							>
								<X style={{ width: 13, height: 13 }} strokeWidth={2.5} />
							</motion.button>
						</div>

						<LayoutGroup id="sidebar-mobile">
							<div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
								<ScrollShadow P={P}>
									<nav style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column' }}>
										{role === 'admin' && (
											<AIStudioItem collapsed={false} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} P={P} />
										)}
										<div style={{ height: 1, background: `linear-gradient(to right, transparent, ${P.border}, transparent)`, margin: '2px 4px 6px' }} />
										{sections?.map(section => (
											<NavSection
												key={section.sectionKey || section.items[0]?.nameKey}
												sectionKey={section.sectionKey}
												items={section.items}
												pathname={pathname}
												searchParams={searchParams}
												onNavigate={onNavigate}
												t={t}
												totalUnread={totalUnread}
												unreadNotifications={unreadNotifications}
												isHidden={isHidden}
												P={P}
											/>
										))}
									</nav>
								</ScrollShadow>
							</div>
						</LayoutGroup>

						<div style={{ position: 'relative', zIndex: 1 }}>
							<SidebarFooter
								collapsed={false}
								onLogout={handleLogout}
								logoutLabel={logoutLabel}
								sections={sections}
								isHidden={isHidden}
								toggleHidden={toggleHidden}
								resetAll={resetAll}
								paletteKey={paletteKey}
								setPaletteKey={setPaletteKey}
								t={t}
								P={P}
							/>
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);

	return (
		<div>
			{DesktopSidebar}
			{MobileDrawer}
		</div>
	);
}