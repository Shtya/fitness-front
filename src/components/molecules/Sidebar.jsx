'use client';

import React, { useLayoutEffect, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/utils/axios';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Users, User as UserIcon, Apple, MessageSquare, MessageCircle, Calculator, BarChart3, ChefHat, ChevronDown, ChevronLeft, X, Bell, Wallet, User, ListTodo, CalendarDays, LogOut, Globe, Palette, Paintbrush, Check, Languages, Receipt, ChevronRight, Sparkles, Settings2, Lock, Search, BrainCircuit, LayoutGrid, GanttChart, FileText, Inbox, Layers, Zap, TrendingUp, BookOpen, BookMarked, Target, Coffee, ShieldCheck, CreditCard, Activity, Star, Hash, Sliders, AudioLines, ShieldAlert, Radar, Pencil, GraduationCap, PanelLeftClose, PanelLeftOpen, Mails, Coins } from 'lucide-react';
import { useSearchParams, useRouter as useNextRouter } from 'next/navigation';
import { usePathname as useNextPathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaInbox, FaUsers, FaWpforms, FaWhatsapp } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { useValues } from '@/context/GlobalContext';
import { useTheme, COLOR_PALETTES } from '@/app/[locale]/theme';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import MultiLangText from '../atoms/MultiLangText';
import { useRouter as useI18nRouter } from '@/i18n/navigation';
import {
	WHATSAPP_UNREAD_EVENT,
	META_WHATSAPP_UNREAD_EVENT,
} from '@/lib/outreach-unread';
import { useSidebarChrome } from './SidebarChromeContext';
import './sidebar-glass.css';

/* ─── Constants ─────────────────────────────────────────────── */
const SIDEBAR_W = 272;
const SIDEBAR_W_COLLAPSED = 72;
const SIDEBAR_MARGIN = 16;
const SIDEBAR_MARGIN_BOTTOM = 15;
/** Space reserved on the page edge when sidebar is offset (focus mode) — clears the edge dock */
export const SIDEBAR_OFFSET_PAD_INLINE = 72;
export const SIDEBAR_OFFSET_PAD_TOP = 40;
const EDGE_DOCK_TOP = SIDEBAR_MARGIN + 30;
const SIDEBAR_RADIUS = 22;
const SIDEBAR_FONT_LTR = "var(--font-inter), 'Segoe UI', system-ui, -apple-system, sans-serif";
const LS_COLLAPSED = 'sidebar:collapsed';
const LS_OFFSET = 'sidebar:offset';
const LS_HIDDEN = 'sidebar:hidden-items';
const LS_MARKETPLACE = 'sidebar:marketplace-installed';
const LS_MARKETPLACE_OUTREACH_MIGRATE = 'sidebar:marketplace-outreach-v1';
const LS_MARKETPLACE_OPT_IN_MIGRATE = 'sidebar:marketplace-opt-in-v2';
const LS_CUSTOM_LABELS = 'sidebar:custom-labels';
const LS_PALETTE = 'sidebar:palette';

/** Chat apps that stay installed by default after moving into Marketplace. */
const OUTREACH_DEFAULT_INSTALLED = ['messages', 'whatsapp', 'metaWhatsApp'];

/** Must be added from Marketplace — never shown on the sidebar until installed. */
const OPT_IN_MARKETPLACE_IDS = ['phoneCheck', 'fitnessLeads', 'branding'];

/** Outreach apps live in Marketplace so they can be stored and re-added later. */
const OUTREACH_MARKETPLACE_IDS = [
	'messages',
	'whatsapp',
	'metaWhatsApp',
	'phoneCheck',
	'fitnessLeads',
];

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
    /* Glass defaults — tinted by tenant --color-gradient-* at paint time */
    bg: 'linear-gradient(160deg, color-mix(in srgb, #fff 92%, var(--color-primary-100)) 0%, color-mix(in srgb, #fff 80%, var(--color-primary-50)) 48%, color-mix(in srgb, #fff 88%, var(--color-secondary-100, var(--color-primary-100))) 100%)',
    bgCard: 'color-mix(in srgb, #fff 88%, transparent)',
    bgHover: 'color-mix(in srgb, var(--color-primary-50) 55%, #fff)',
    bgActive: 'linear-gradient(155deg, color-mix(in srgb, var(--color-gradient-from) 22%, #fff), color-mix(in srgb, var(--color-gradient-to) 14%, #fff))',
    border: 'color-mix(in srgb, var(--color-primary-200) 50%, #fff)',
    borderStrong: 'color-mix(in srgb, var(--color-primary-300) 55%, #fff)',
    text: '#0f172a',
    textMuted: '#64748b',
    textLight: '#94a3b8',
    textXLight: '#cbd5e1',
    sectionLabel: 'color-mix(in srgb, var(--color-primary-500) 45%, #94a3b8)',
    iconBg: 'color-mix(in srgb, #fff 90%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--color-primary-200) 45%, #fff)',
    shadow: {
      sm: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
      md: '0 8px 18px -8px color-mix(in srgb, var(--color-primary-500) 28%, transparent), 0 2px 6px rgba(15,23,42,0.06)',
    },
    headerBg: 'transparent',
    footerBg: 'color-mix(in srgb, #fff 48%, transparent)',
    texture: 'radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--color-primary-300) 22%, transparent), transparent 42%)',
    textureSize: 'auto',
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
  todos: { id: 'todos', nameKey: 'todos', href: '/workspace?tab=tasks', icon: ListTodo, descKey: 'descriptions.todos', group: 'workspace', defaultVisible: false, required: false, marketplace: true },
  calendar: { id: 'calendar', nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays, descKey: 'descriptions.calendar', group: 'workspace', defaultVisible: false, required: false, marketplace: true },
  messages: { id: 'messages', nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare, descKey: 'descriptions.messages', group: 'outreach', defaultVisible: false, required: false, marketplace: true },
  whatsapp: { id: 'whatsapp', nameKey: 'whatsapp', href: '/dashboard/whatsapp', icon: FaWhatsapp, descKey: 'descriptions.whatsapp', group: 'outreach', defaultVisible: false, required: false, marketplace: true },
  transcript: { id: 'transcript', nameKey: 'transcript', href: '/dashboard/transcript', icon: AudioLines, descKey: 'descriptions.transcript', group: 'workspace', defaultVisible: false, required: false, marketplace: true },
  calorieCalculator: { id: 'calorieCalculator', nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator, descKey: 'descriptions.calorieCalculator', group: 'tools', defaultVisible: true, required: false },
  aiFree: { id: 'aiFree', nameKey: 'aiFree', href: '/dashboard/ai-free', icon: BrainCircuit, descKey: 'descriptions.aiFree', group: 'tools', defaultVisible: true, required: false },
  aiContentStudio: { id: 'aiContentStudio', nameKey: 'aiContentStudio', href: '/dashboard/ai-content-studio', icon: Sparkles, descKey: 'descriptions.aiContentStudio', group: 'tools', defaultVisible: true, required: false },
  emailMemo: { id: 'emailMemo', nameKey: 'emailMemo', href: '/dashboard/email-memo', icon: Mails, descKey: 'descriptions.emailMemo', group: 'tools', defaultVisible: true, required: false },
  goldIntelligence: { id: 'goldIntelligence', nameKey: 'goldIntelligence', href: '/dashboard/gold-intelligence', icon: Coins, descKey: 'descriptions.goldIntelligence', group: 'tools', defaultVisible: true, required: false },
  learning: { id: 'learning', nameKey: 'learning', href: '/dashboard/learning', icon: GraduationCap, descKey: 'descriptions.learning', group: 'tools', defaultVisible: true, required: false },
  quranRevision: { id: 'quranRevision', nameKey: 'quranRevision', href: '/dashboard/quran-revision', icon: BookMarked, descKey: 'descriptions.quranRevision', group: 'tools', defaultVisible: true, required: false },
  phoneCheck: { id: 'phoneCheck', nameKey: 'phoneCheck', href: '/dashboard/phone-check', icon: ShieldAlert, descKey: 'descriptions.phoneCheck', group: 'outreach', defaultVisible: false, required: false, marketplace: true },
  fitnessLeads: { id: 'fitnessLeads', nameKey: 'fitnessLeads', href: '/dashboard/fitness-leads', icon: Radar, descKey: 'descriptions.fitnessLeads', group: 'outreach', defaultVisible: false, required: false, marketplace: true },
  metaWhatsApp: { id: 'metaWhatsApp', nameKey: 'metaWhatsApp', href: '/dashboard/meta-whatsapp', icon: MessageCircle, descKey: 'descriptions.metaWhatsApp', group: 'outreach', defaultVisible: false, required: false, marketplace: true },
  notifications: { id: 'notifications', nameKey: 'notifications', href: '/dashboard/notifications', icon: Bell, descKey: 'descriptions.notifications', group: 'workspace', defaultVisible: true, required: false },
  billing: { id: 'billing', nameKey: 'billing', href: '/dashboard/billing', icon: CreditCard, descKey: 'descriptions.billing', group: 'finance', defaultVisible: false, required: false, marketplace: true },
  money: { id: 'money', nameKey: 'money', href: '/money', icon: Wallet, descKey: 'descriptions.money', group: 'finance', defaultVisible: false, required: false, marketplace: true },
  profile_admin: { id: 'profile_admin', nameKey: 'profile', href: '/dashboard/my-account', icon: UserIcon, descKey: 'descriptions.profile_admin', group: 'account', defaultVisible: true, required: true },
  branding: { id: 'branding', nameKey: 'branding', href: '/dashboard/settings/branding', icon: Paintbrush, descKey: 'descriptions.branding', group: 'management', defaultVisible: false, required: false, marketplace: true },
  profile_client: { id: 'profile_client', nameKey: 'profile', href: '/dashboard/my/profile', icon: UserIcon, descKey: 'descriptions.profile_client', group: 'account', defaultVisible: true, required: true },
};

export const NAV = [
  {
    role: 'admin',
    sectionKey: 'sections.main',
    items: [{ ...ITEM_META.overview_admin }],
  },
  {
    role: 'admin',
    sectionKey: 'sections.management',
    items: [{ ...ITEM_META.allUsers }, { ...ITEM_META.branding }, { ...ITEM_META.clientIntake, expand: false, children: [{ ...ITEM_META.manageForms }, { ...ITEM_META.responses }] }],
  },
  {
    role: 'admin',
    sectionKey: 'sections.content',
    items: [{ ...ITEM_META.allExercises }, { ...ITEM_META.allRecipes }, { ...ITEM_META.workoutPlans }, { ...ITEM_META.mealPlans }, { ...ITEM_META.reports }],
  },
  {
    role: 'admin',
    sectionKey: 'sections.outreach',
    items: [
      { ...ITEM_META.messages },
      { ...ITEM_META.whatsapp },
      { ...ITEM_META.metaWhatsApp },
      { ...ITEM_META.phoneCheck },
      { ...ITEM_META.fitnessLeads },
    ],
  },
  {
    role: 'admin',
    sectionKey: 'sections.workspace',
    items: [
      { ...ITEM_META.todos },
      { ...ITEM_META.calendar },
      { ...ITEM_META.transcript },
      { ...ITEM_META.notifications },
      { ...ITEM_META.calorieCalculator },
      { ...ITEM_META.aiFree },
      { ...ITEM_META.aiContentStudio },
      { ...ITEM_META.emailMemo },
      { ...ITEM_META.goldIntelligence },
      { ...ITEM_META.learning },
      { ...ITEM_META.quranRevision },
    ],
  },
  {
    role: 'admin',
    sectionKey: 'sections.finance',
    items: [{ ...ITEM_META.billing }, { ...ITEM_META.money }],
  },
  {
    role: 'admin',
    sectionKey: 'sections.account',
    items: [{ ...ITEM_META.profile_admin }],
  },
  {
    role: 'client',
    sectionKey: 'sections.main',
    items: [{ ...ITEM_META.overview_client }],
  },
  {
    role: 'client',
    sectionKey: 'sections.myWorkspace',
    items: [{ ...ITEM_META.myWorkouts }, { ...ITEM_META.myNutrition }, { ...ITEM_META.recipes }, { ...ITEM_META.weeklyStrength }, { ...ITEM_META.myReminders }],
  },
  {
    role: 'client',
    sectionKey: 'sections.outreach',
    items: [{ ...ITEM_META.messages }, { ...ITEM_META.phoneCheck }],
  },
  {
    role: 'client',
    sectionKey: 'sections.workspace',
    items: [
      { ...ITEM_META.calendar },
      { ...ITEM_META.transcript },
      { ...ITEM_META.calorieCalculator },
      { ...ITEM_META.aiFree },
      { ...ITEM_META.aiContentStudio },
      { ...ITEM_META.emailMemo },
      { ...ITEM_META.goldIntelligence },
      { ...ITEM_META.learning },
      { ...ITEM_META.quranRevision },
      { ...ITEM_META.money },
      { ...ITEM_META.profile_client },
    ],
  },
  {
    role: 'coach',
    sectionKey: 'sections.management',
    items: [{ ...ITEM_META.allUsers }, { ...ITEM_META.clientIntake, expand: false, children: [{ ...ITEM_META.manageForms }, { ...ITEM_META.responses }] }],
  },
  {
    role: 'coach',
    sectionKey: 'sections.content',
    items: [{ ...ITEM_META.allExercises }, { ...ITEM_META.allRecipes }, { ...ITEM_META.workoutPlans }, { ...ITEM_META.mealPlans }, { ...ITEM_META.reports }],
  },
  {
    role: 'coach',
    sectionKey: 'sections.outreach',
    items: [
      { ...ITEM_META.messages },
      { ...ITEM_META.whatsapp },
      { ...ITEM_META.metaWhatsApp },
      { ...ITEM_META.phoneCheck },
      { ...ITEM_META.fitnessLeads },
    ],
  },
  {
    role: 'coach',
    sectionKey: 'sections.workspace',
    items: [
      { ...ITEM_META.todos },
      { ...ITEM_META.calendar },
      { ...ITEM_META.transcript },
      { ...ITEM_META.notifications },
      { ...ITEM_META.calorieCalculator },
      { ...ITEM_META.aiFree },
      { ...ITEM_META.aiContentStudio },
      { ...ITEM_META.emailMemo },
      { ...ITEM_META.goldIntelligence },
      { ...ITEM_META.learning },
      { ...ITEM_META.quranRevision },
    ],
  },
  {
    role: 'coach',
    sectionKey: 'sections.account',
    items: [{ ...ITEM_META.profile_admin }],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.main',
    items: [{ ...ITEM_META.overview_superadmin }],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.management',
    items: [{ ...ITEM_META.allUsers_super }, { ...ITEM_META.allExercises }, { ...ITEM_META.feedback_super }, { ...ITEM_META.forms_super }],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.outreach',
    items: [
      { ...ITEM_META.whatsapp },
      { ...ITEM_META.metaWhatsApp },
      { ...ITEM_META.phoneCheck },
      { ...ITEM_META.fitnessLeads },
    ],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.workspace',
    items: [{ ...ITEM_META.todos }, { ...ITEM_META.calendar }, { ...ITEM_META.transcript }, { ...ITEM_META.aiFree }, { ...ITEM_META.aiContentStudio }, { ...ITEM_META.emailMemo }, { ...ITEM_META.goldIntelligence }, { ...ITEM_META.learning }, { ...ITEM_META.quranRevision }],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.finance',
    items: [{ ...ITEM_META.billing }],
  },
];

/** Flatten role nav into selectable page rows (parents + children). */
export function getNavPagesForRole(role) {
  const r = String(role || '').toLowerCase();
  const sections = NAV.filter(s => s.role === r);
  const out = [];
  for (const section of sections) {
    for (const item of section.items || []) {
      out.push({
        id: item.id,
        nameKey: item.nameKey,
        href: item.href,
        icon: item.icon || null,
        group: item.group || section.sectionKey,
        required: !!item.required,
        marketplace: !!item.marketplace,
        parentId: null,
      });
      for (const child of item.children || []) {
        out.push({
          id: child.id,
          nameKey: child.nameKey,
          href: child.href,
          icon: child.icon || null,
          group: child.group || item.group || section.sectionKey,
          required: !!child.required,
          marketplace: !!child.marketplace,
          parentId: item.id,
        });
      }
    }
  }
  return out;
}

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
  return children.some(c => isPathActive(pathname, c.href, searchParams));
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
    } catch {}
  }, [key, val]);
  return [val, set];
}

function useHiddenItems() {
  const [hidden, setHidden] = useLocalStorageState(LS_HIDDEN, []);
  const isHidden = useCallback(id => hidden.includes(id), [hidden]);
  const toggle = useCallback(
    id => {
      setHidden(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    },
    [setHidden],
  );
  const resetAll = useCallback(() => setHidden([]), [setHidden]);
  return { hidden, isHidden, toggle, resetAll };
}

function useMarketplaceItems() {
  const [installed, setInstalled] = useLocalStorageState(LS_MARKETPLACE, []);

  // One-time: keep previously always-visible chat apps installed, but leave
  // Phone Check / Lead Scout / Branding as marketplace opt-in only.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem(LS_MARKETPLACE_OUTREACH_MIGRATE) !== '1') {
        setInstalled(prev => {
          const next = new Set(Array.isArray(prev) ? prev : []);
          for (const id of OUTREACH_DEFAULT_INSTALLED) next.add(id);
          for (const id of OPT_IN_MARKETPLACE_IDS) next.delete(id);
          return [...next];
        });
        localStorage.setItem(LS_MARKETPLACE_OUTREACH_MIGRATE, '1');
      }
      if (localStorage.getItem(LS_MARKETPLACE_OPT_IN_MIGRATE) !== '1') {
        // Undo v1 auto-install for opt-in apps so they hide until added from Marketplace.
        setInstalled(prev =>
          (Array.isArray(prev) ? prev : []).filter(id => !OPT_IN_MARKETPLACE_IDS.includes(id)),
        );
        localStorage.setItem(LS_MARKETPLACE_OPT_IN_MIGRATE, '1');
      }
    } catch {
      /* ignore */
    }
  }, [setInstalled]);

  const isInstalled = useCallback(id => installed.includes(id), [installed]);
  const toggle = useCallback(
    id => {
      setInstalled(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    },
    [setInstalled],
  );
  return { installed, isInstalled, toggle };
}

function useCustomLabels() {
  const [labels, setLabels] = useLocalStorageState(LS_CUSTOM_LABELS, {});
  const getLabel = useCallback(
    (item, t) => {
      const custom = labels?.[item?.id];
      if (custom && String(custom).trim()) return String(custom).trim();
      return t(`items.${item.nameKey}`);
    },
    [labels],
  );
  const setLabel = useCallback(
    (id, value) => {
      setLabels(prev => {
        const next = { ...(prev || {}) };
        const trimmed = String(value || '').trim();
        if (!trimmed) delete next[id];
        else next[id] = trimmed.slice(0, 48);
        return next;
      });
    },
    [setLabels],
  );
  const resetLabels = useCallback(() => setLabels({}), [setLabels]);
  return { labels, getLabel, setLabel, resetLabels };
}

export function useUnreadChats(pollMs = 300000) {
  const [total, setTotal] = useState(0);
  const { conversationId } = useValues();
  async function load() {
    try {
      const res = await api.get('/chat/unread');
      setTotal(res?.data?.totalUnread ?? 0);
    } catch {}
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
    } catch {}
  }
  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);
  return { unreadNotifications: count, reloadUnreadNotifications: load };
}

export function useUnreadWhatsApp(pollMs = 120000) {
  const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/unread', { skipAuthRedirect: true });
      const next = Number(res?.data?.totalUnread || 0);
      setTotal(prev => (prev === next ? prev : next));
    } catch {
      /* keep last known count — badge polls must never force logout/re-render storms */
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    const onChanged = () => load();
    if (typeof window !== 'undefined') {
      window.addEventListener(WHATSAPP_UNREAD_EVENT, onChanged);
      window.addEventListener('focus', onChanged);
    }
    return () => {
      clearInterval(id);
      if (typeof window !== 'undefined') {
        window.removeEventListener(WHATSAPP_UNREAD_EVENT, onChanged);
        window.removeEventListener('focus', onChanged);
      }
    };
  }, [pollMs, load]);
  return { unreadWhatsApp: total, reloadUnreadWhatsApp: load };
}

export function useUnreadMetaWhatsApp(pollMs = 120000) {
  const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    try {
      const res = await api.get('/meta-whatsapp/conversations/counts', {
        skipAuthRedirect: true,
      });
      const data = res?.data || {};
      const messages = Number(data.unreadMessages);
      const next =
        Number.isFinite(messages) && messages > 0 ? messages : Number(data.unread || 0) || 0;
      setTotal(prev => (prev === next ? prev : next));
    } catch {
      /* keep last known count */
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    const onChanged = () => load();
    if (typeof window !== 'undefined') {
      window.addEventListener(META_WHATSAPP_UNREAD_EVENT, onChanged);
      window.addEventListener('focus', onChanged);
    }
    return () => {
      clearInterval(id);
      if (typeof window !== 'undefined') {
        window.removeEventListener(META_WHATSAPP_UNREAD_EVENT, onChanged);
        window.removeEventListener('focus', onChanged);
      }
    };
  }, [pollMs, load]);
  return { unreadMetaWhatsApp: total, reloadUnreadMetaWhatsApp: load };
}

/* ─── Badge ──────────────────────────────────────────────────── */
function Badge({ value, small }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={snap}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: small ? 16 : 18,
        height: small ? 16 : 18,
        borderRadius: 99,
        fontSize: small ? 9 : 10,
        fontWeight: 800,
        color: '#fff',
        padding: '0 4px',
        background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
        boxShadow: '0 2px 6px color-mix(in srgb, var(--color-primary-500) 40%, transparent)',
        letterSpacing: '0.02em',
      }}>
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
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        transform: 'translateY(-50%)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          padding: '6px 12px',
          borderRadius: 9,
          whiteSpace: 'nowrap',
          color: 'white',
          letterSpacing: '0.015em',
          background: '#0f172a',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
          position: 'relative',
        }}>
        {label}
        <span
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            [isRTL ? 'right' : 'left']: -3.5,
            width: 7,
            height: 7,
            background: '#0f172a',
            borderRadius: 2,
          }}
        />
      </div>
    </motion.div>,
    document.body,
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
      ref={flyRef}
      role='menu'
      initial={{ opacity: 0, x: xFrom, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: xFrom, scale: 0.96 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 9998,
        minWidth: 226,
        borderRadius: 14,
        overflow: 'hidden',
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)',
      }}>
      {children}
    </motion.div>,
    document.body,
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
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
    // Do not depend on `children` — a new element every parent render would
    // re-bind observers and can contribute to update-depth crashes.
  }, [onScroll]);
  return (
    <div className='sidebar-scroll-root' style={{ position: 'relative', height: '100%', minHeight: 0, flex: '1 1 auto' }}>
      <div
        ref={ref}
        className='sidebar-scroll-viewport'
        style={{
          height: '100%',
          minHeight: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>
      <div style={{ pointerEvents: 'none', position: 'absolute', inset: '0 0 auto 0', height: 44, opacity: atTop ? 0 : 1, transition: 'opacity .25s', background: `linear-gradient(to bottom, ${P?.headerBg || '#fff'}, transparent)` }} />
      <div style={{ pointerEvents: 'none', position: 'absolute', inset: 'auto 0 0 0', height: 44, opacity: atBottom ? 0 : 1, transition: 'opacity .25s', background: `linear-gradient(to top, ${P?.footerBg || '#f8f9fb'}, transparent)` }} />
    </div>
  );
}

/* ─── SectionLabel ───────────────────────────────────────────── */
function SectionLabel({ label, P }) {
  return (
    <div className='sidebar-section-label' style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 3px', marginBottom: 6, marginTop: 14 }}>
      <span
        className='sidebar-section-label'
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: P?.sectionLabel || '#94a3b8',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${P?.border || 'rgba(0,0,0,0.07)'}, transparent)` }} />
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
  totalUnread,
  unreadNotifications = 0,
  unreadWhatsApp = 0,
  unreadMetaWhatsApp = 0,
  P,
  getLabel,
}) {
  const Icon = item.icon || LayoutDashboard;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const label = typeof getLabel === 'function' ? getLabel(item, t) : t(`items.${item.nameKey}`);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const liRef = useRef(null);
  const isRTL = getDir() === 'rtl';
  const isMessages = item.nameKey === 'messages';
  const isNotifications = item.nameKey === 'notifications';
  const isWhatsApp = item.nameKey === 'whatsapp' || item.id === 'whatsapp';
  const isMetaWhatsApp = item.nameKey === 'metaWhatsApp' || item.id === 'metaWhatsApp';
  const itemBadge =
    (isMessages && totalUnread > 0 && totalUnread) ||
    (isNotifications && unreadNotifications > 0 && unreadNotifications) ||
    (isWhatsApp && unreadWhatsApp > 0 && unreadWhatsApp) ||
    (isMetaWhatsApp && unreadMetaWhatsApp > 0 && unreadMetaWhatsApp) ||
    0;

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
      <div ref={liRef} style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '2px 0' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {href ? (
          <Link href={href} onClick={onNavigate}>
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: 13,
                transition: 'all .18s',
                ...(active
                  ? {
                      background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                      boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 32%, transparent)',
                      color: '#fff',
                    }
                  : hover
                  ? {
                      background: 'color-mix(in srgb, var(--color-primary-500) 16%, transparent)',
                      boxShadow: '0 4px 10px color-mix(in srgb, var(--color-primary-500) 16%, transparent)',
                      color: 'var(--color-primary-600)',
                    }
                  : {
                      background: 'color-mix(in srgb, var(--color-primary-500) 8%, transparent)',
                      boxShadow: 'none',
                      color: 'color-mix(in srgb, var(--color-primary-500) 60%, ' + (P?.textLight || '#94a3b8') + ')',
                    }),
              }}>
              <Icon style={{ width: 18, height: 18 }} strokeWidth={active ? 2.3 : 1.9} />
              {itemBadge > 0 && (
                <span style={{ position: 'absolute', top: -3, [isRTL ? 'left' : 'right']: -3, zIndex: 2 }}>
                  <Badge value={itemBadge} small />
                </span>
              )}
            </motion.div>
          </Link>
        ) : (
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 13,
              cursor: 'pointer',
              transition: 'all .18s',
              background: hover ? 'color-mix(in srgb, var(--color-primary-500) 16%, transparent)' : 'color-mix(in srgb, var(--color-primary-500) 8%, transparent)',
              boxShadow: hover ? '0 4px 10px color-mix(in srgb, var(--color-primary-500) 16%, transparent)' : 'none',
              color: hover ? 'var(--color-primary-600)' : 'color-mix(in srgb, var(--color-primary-500) 60%, ' + (P?.textLight || '#94a3b8') + ')',
            }}>
            <Icon style={{ width: 18, height: 18 }} strokeWidth={1.9} />
            {itemBadge > 0 && (
              <span style={{ position: 'absolute', top: -3, [isRTL ? 'left' : 'right']: -3, zIndex: 2 }}>
                <Badge value={itemBadge} small />
              </span>
            )}
          </motion.div>
        )}
        <AnimatePresence>{hover && !hasChildren && <CollapsedTooltip label={label} anchorRef={liRef} />}</AnimatePresence>
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
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          borderRadius: 10,
                          padding: '8px 10px',
                          transition: 'all .15s',
                          ...(ca ? { background: 'color-mix(in srgb, var(--color-primary-500) 7%, transparent)', color: 'var(--color-primary-700)' } : { color: '#64748b' }),
                        }}>
                        <span
                          style={{
                            display: 'grid',
                            placeContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            flexShrink: 0,
                            ...(ca ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', color: '#fff', boxShadow: '0 3px 8px color-mix(in srgb, var(--color-primary-500) 28%, transparent)' } : { background: '#f8f9fb', color: '#94a3b8', border: '1px solid rgba(0,0,0,0.07)' }),
                          }}>
                          <A style={{ width: 12, height: 12 }} strokeWidth={ca ? 2.5 : 2} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: ca ? 600 : 500 }}>{typeof getLabel === 'function' ? getLabel(child, t) : t(`items.${child.nameKey}`)}</span>
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
    return (
      <Link href={item.href} onClick={onNavigate} style={{ display: 'block' }}>
        <motion.div
          whileHover={{ x: isRTL ? -2 : 2 }}
          whileTap={{ scale: 0.986 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            borderRadius: 12,
            padding: '8px 10px',
            marginBottom: 2,
            transition: 'background .18s, box-shadow .18s, border-color .18s',
            cursor: 'pointer',
            overflow: 'hidden',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: !active && hover ? 'color-mix(in srgb, var(--color-primary-400) 14%, transparent)' : 'transparent',
            ...(active
              ? {
                  background: P?.bgActive || '#ffffff',
                  boxShadow: P?.shadow?.md || '0 4px 16px rgba(0,0,0,0.07)',
                  color: 'var(--color-primary-800)',
                }
              : hover
              ? {
                  background: `color-mix(in srgb, var(--color-primary-500) 5%, ${P?.bgCard || '#fff'})`,
                  boxShadow: P?.shadow?.sm,
                  color: P?.textMuted || '#64748b',
                }
              : {
                  background: 'transparent',
                  boxShadow: 'none',
                  color: P?.textMuted || '#64748b',
                }),
          }}
          aria-current={active ? 'page' : undefined}>
          {/* Active rail */}
          {active && (
            <motion.span
              layoutId='active-rail'
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
          {/* Icon */}
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              flexShrink: 0,
              display: 'grid',
              placeContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 11,
              transition: 'all .2s cubic-bezier(.34,1.56,.64,1)',
              transform: hover && !active ? 'scale(1.08)' : 'scale(1)',
              ...(active
                ? {
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    color: '#fff',
                    boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary-500) 38%, transparent)',
                  }
                : hover
                ? {
                    background: 'color-mix(in srgb, var(--color-primary-500) 16%, transparent)',
                    color: 'var(--color-primary-600)',
                    boxShadow: '0 4px 10px color-mix(in srgb, var(--color-primary-500) 16%, transparent)',
                  }
                : {
                    background: 'color-mix(in srgb, var(--color-primary-500) 8%, transparent)',
                    color: 'color-mix(in srgb, var(--color-primary-500) 60%, ' + (P?.textLight || '#94a3b8') + ')',
                  }),
            }}>
            <Icon style={{ width: 16.5, height: 16.5 }} strokeWidth={active ? 2.3 : 1.9} />
          </span>
          {/* Label */}
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 13.5,
              fontWeight: active ? 700 : hover ? 600 : 530,
              letterSpacing: '-0.006em',
              color: active ? 'var(--color-primary-800)' : hover ? P?.text || '#0f172a' : P?.textMuted || '#64748b',
              transition: 'color .18s, font-weight .18s',
            }}>
            {label}
          </span>
          {itemBadge > 0 && (
            <span style={{ position: 'relative', zIndex: 1 }}>
              <Badge value={itemBadge} />
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
        type='button'
        onClick={() => setOpen(v => !v)}
        whileHover={{ x: isRTL ? -2 : 2 }}
        whileTap={{ scale: 0.986 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          borderRadius: 12,
          padding: '8px 10px',
          textAlign: isRTL ? 'right' : 'left',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: !open && hover ? 'color-mix(in srgb, var(--color-primary-400) 14%, transparent)' : 'transparent',
          cursor: 'pointer',
          transition: 'background .18s, box-shadow .18s, border-color .18s',
          background: open ? P?.bgActive || '#ffffff' : hover ? `color-mix(in srgb, var(--color-primary-500) 5%, ${P?.bgCard || '#fff'})` : 'transparent',
          boxShadow: open ? P?.shadow?.md : hover ? P?.shadow?.sm : 'none',
          color: open ? 'var(--color-primary-700)' : P?.textMuted || '#64748b',
        }}
        aria-expanded={open}>
        <span
          style={{
            flexShrink: 0,
            display: 'grid',
            placeContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 11,
            transition: 'all .2s cubic-bezier(.34,1.56,.64,1)',
            transform: hover && !open ? 'scale(1.08)' : 'scale(1)',
            ...(open
              ? {
                  background: 'color-mix(in srgb, var(--color-primary-500) 14%, transparent)',
                  color: 'var(--color-primary-600)',
                }
              : hover
              ? {
                  background: 'color-mix(in srgb, var(--color-primary-500) 16%, transparent)',
                  color: 'var(--color-primary-600)',
                  boxShadow: '0 4px 10px color-mix(in srgb, var(--color-primary-500) 16%, transparent)',
                }
              : {
                  background: 'color-mix(in srgb, var(--color-primary-500) 8%, transparent)',
                  color: 'color-mix(in srgb, var(--color-primary-500) 60%, ' + (P?.textLight || '#94a3b8') + ')',
                }),
          }}>
          <Icon style={{ width: 16.5, height: 16.5 }} strokeWidth={1.9} />
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5, fontWeight: open ? 700 : hover ? 600 : 530, letterSpacing: '-0.006em' }}>{label}</span>
        {!open && groupActive && <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: 'var(--color-primary-400)' }} />}
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} style={{ color: open ? 'var(--color-primary-500)' : P?.textXLight || '#cbd5e1', flexShrink: 0 }}>
          <ChevronRight className='rtl:scale-x-[-1]' style={{ width: 12, height: 12 }} strokeWidth={2.5} />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key='sub' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={gentle} style={{ overflow: 'hidden' }}>
            <div
              style={{
                position: 'relative',
                marginTop: 3,
                marginBottom: 3,
                [isRTL ? 'marginRight' : 'marginLeft']: 16,
              }}>
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  bottom: 4,
                  [isRTL ? 'right' : 'left']: 15,
                  width: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-primary-300) 60%, transparent), transparent)',
                }}
              />
              <ul style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: 14, margin: 0, listStyle: 'none' }}>
                {item.children.map(child => (
                  <li key={child.href || child.nameKey}>
                    <NavItem
                      item={child}
                      pathname={pathname}
                      searchParams={searchParams}
                      depth={depth + 1}
                      onNavigate={onNavigate}
                      t={t}
                      totalUnread={totalUnread}
                      unreadNotifications={unreadNotifications}
                      unreadWhatsApp={unreadWhatsApp}
                      unreadMetaWhatsApp={unreadMetaWhatsApp}
                      P={P}
                      getLabel={getLabel}
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
  totalUnread = 0,
  unreadNotifications = 0,
  unreadWhatsApp = 0,
  unreadMetaWhatsApp = 0,
  isHidden,
  isInstalled,
  allowedPages,
  P,
  first = false,
  getLabel,
}) {
  const t_nav = useTranslations('nav');
  const label = t_nav(sectionKey, { defaultValue: '' });
  const restricted = Array.isArray(allowedPages) && allowedPages.length > 0;
  const allowSet = restricted ? new Set(allowedPages) : null;

  const visibleItems = items
    .map(item => {
      if (!restricted) return item;
      const selfOk = allowSet.has(item.id);
      const kids = (item.children || []).filter(c => allowSet.has(c.id));
      if (!selfOk && !kids.length) return null;
      if (item.children) {
        // Parent selected alone → keep all children; else only allowed children
        return { ...item, children: selfOk && !kids.length ? item.children : kids.length ? kids : item.children };
      }
      return item;
    })
    .filter(Boolean)
    .filter(item => {
      if (restricted) return true; // admin allowlist wins over local hide / marketplace
      return (item.required || !isHidden(item.id)) && (!item.marketplace || isInstalled?.(item.id));
    });

  if (!visibleItems.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {!collapsed && label && !first && <SectionLabel label={label} P={P} />}
      {!collapsed && first && <div style={{ height: 4 }} />}
      {collapsed && <div style={{ height: first ? 2 : 6 }} />}
      {visibleItems.map(item => (
        <NavItem
          key={item.id || item.href || item.nameKey}
          item={item}
          pathname={pathname}
          searchParams={searchParams}
          onNavigate={onNavigate}
          collapsed={collapsed}
          t={t}
          totalUnread={totalUnread}
          unreadNotifications={unreadNotifications}
          unreadWhatsApp={unreadWhatsApp}
          unreadMetaWhatsApp={unreadMetaWhatsApp}
          P={P}
          getLabel={getLabel}
        />
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
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          borderRadius: dim.radius,
          fontWeight: 800,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          width: dim.w,
          height: dim.h,
          fontSize: dim.font,
          background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
          boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 32%, transparent)',
          letterSpacing: '0.03em',
        }}>
        <span style={{ position: 'relative', zIndex: 1 }}>{text}</span>
        <motion.div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}>
          <div style={{ width: '60%', height: '100%', background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)' }} />
        </motion.div>
      </div>
      <span
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: isActive ? '#22c55e' : '#94a3b8',
          boxShadow: '0 0 0 2.5px #f8f9fb',
        }}>
        {isActive && <motion.span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e' }} animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />}
      </span>
    </div>
  );
}

/* ─── SidebarHeader ──────────────────────────────────────────── */
function SidebarHeader({ user, collapsed, P }) {
  const t_r = useTranslations('');
  return (
    <div
      style={{
        padding: collapsed ? '14px 10px 12px' : '16px 14px 13px',
        borderBottom: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
        flexShrink: 0,
        background: P?.headerBg || 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
      }}>
      {collapsed ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Avatar user={user} size='sm' />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={user} size='md' />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MultiLangText
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 13.5,
                fontWeight: 700,
                color: P?.text || '#0f172a',
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}>
              {user?.name}
            </MultiLangText>
            {user?.role ? (
              <p style={{ fontSize: 10, marginTop: 3, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-primary-400)' }}>
                {t_r(`myProfile.roles.${user.role}`)}
              </p>
            ) : null}
          </div>
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
  if (segs.length > 0 && (segs[0] === 'en' || segs[0] === 'ar')) {
    segs[0] = nextLocale;
    return '/' + segs.join('/');
  }
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
        type='button'
        onClick={toggle}
        whileHover={{ scale: 1.06, y: -1 }}
        whileTap={{ scale: 0.95 }}
        title={isEN ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          ...btnBase,
          flexDirection: 'column',
          gap: 2,
          position: 'relative',
          overflow: 'hidden',
        }}>
        <Globe style={{ width: 14, height: 14, color: 'var(--color-primary-500)' }} strokeWidth={2.2} />
        <span
          style={{
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: P?.textMuted || '#64748b',
          }}>
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
              borderRadius: 12,
            }}>
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
      type='button'
      onClick={toggle}
      whileHover={{ scale: 1.005, y: -1 }}
      whileTap={{ scale: 0.995 }}
      dir='ltr'
      style={{
        position: 'relative',
        width: '100%',
        height: 44,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow .18s',
        ...btnBase,
      }}>
      <motion.span
        animate={{ x: isEN ? '100%' : '0%' }}
        transition={snap}
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: 'calc(50% - 4px)',
          height: 'calc(100% - 8px)',
          borderRadius: 9,
          background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
          boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary-500) 34%, transparent)',
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
              gap: 5,
            }}>
            <Globe
              style={{
                width: 11,
                height: 11,
                color: isActive ? '#fff' : P?.textMuted || 'var(--color-primary-500)',
              }}
              strokeWidth={2.5}
            />
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: isActive ? '#fff' : P?.textMuted || 'var(--color-primary-500)',
                letterSpacing: '0.005em',
              }}>
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
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
            }}>
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
    const fn = e => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fn = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;
      const narrow = vw < 1025;
      const panelW = Math.min(316, vw - pad * 2);
      const approxH = Math.min(460, vh * 0.72);

      let left;
      if (narrow) {
        /* Keep fully on-screen above the drawer (not beside it) */
        left = Math.max(pad, Math.min((vw - panelW) / 2, vw - panelW - pad));
      } else {
        left = isRTL ? rect.left - panelW - pad : rect.right + pad;
        if (!isRTL && left + panelW > vw - pad) left = rect.left - panelW - pad;
        if (isRTL && left < pad) left = rect.right + pad;
        left = Math.max(pad, Math.min(left, vw - panelW - pad));
      }

      /* Prefer sitting just above the Theme button */
      let bottom = vh - rect.top + 6;
      if (bottom + approxH > vh - pad) {
        bottom = Math.max(pad, vh - approxH - pad);
      }
      setPanelPos({ left, bottom, width: panelW, maxHeight: approxH });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
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
        ref={triggerRef}
        type='button'
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: collapsed ? 1.06 : 1.005, y: -1 }}
        whileTap={{ scale: collapsed ? 0.95 : 0.995 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          transition: 'all .18s',
          ...(collapsed ? { width: 40, height: 40, borderRadius: 12, justifyContent: 'center' } : { width: '100%', height: 44, borderRadius: 12, padding: '0 10px' }),
          ...(open
            ? {
                background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                color: '#fff',
                border: '1px solid transparent',
                boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
              }
            : { ...btnBase }),
        }}>
        <span
          style={{
            flexShrink: 0,
            display: 'grid',
            placeContent: 'center',
            width: collapsed ? 'auto' : 26,
            height: collapsed ? 'auto' : 26,
            borderRadius: 8,
            background: open ? 'rgba(255,255,255,0.2)' : 'color-mix(in srgb, var(--color-primary-500) 12%, transparent)',
            color: open ? '#fff' : 'var(--color-primary-600)',
          }}>
          <Palette style={{ width: collapsed ? 15 : 13, height: collapsed ? 15 : 13 }} strokeWidth={2.2} />
        </span>
        {!collapsed && (
          <>
            <span className='rtl:text-right ltr:text-left' style={{ fontSize: 12.5, fontWeight: 650, flex: 1, letterSpacing: '-0.005em', color: open ? '#fff' : P?.text || '#334155' }}>
              {tTheme('trigger')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3.5, flexShrink: 0 }}>{currentPalette && [currentPalette.primary[500], currentPalette.secondary[500], currentPalette.primary[300]].map((c, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 3, background: open ? 'rgba(255,255,255,0.6)' : c }} />)}</div>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={snap}>
              <ChevronDown style={{ width: 12, height: 12, flexShrink: 0, color: open ? '#fff' : P?.textXLight || '#cbd5e1' }} strokeWidth={2.5} />
            </motion.span>
          </>
        )}
      </motion.button>
      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <ThemePanel
            ref={panelRef}
            themeEntries={themeEntries}
            currentTheme={currentTheme}
            currentPalette={currentPalette}
            onSelect={key => {
              setTheme(key);
              setTimeout(() => setOpen(false), 250);
            }}
            pos={panelPos}
            xFrom={xFrom}
            tTheme={tTheme}
          />,
          document.body,
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
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          left: pos?.left ?? 8,
          bottom: pos?.bottom ?? 16,
          zIndex: 130000,
          width: pos?.width ?? Math.min(316, typeof window !== 'undefined' ? window.innerWidth - 16 : 316),
          maxWidth: 'calc(100vw - 16px)',
          borderRadius: 18,
          overflow: 'hidden',
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08)',
        }}>
        <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeContent: 'center', color: '#fff', flexShrink: 0, background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 30%, transparent)' }}>
            <Paintbrush style={{ width: 14, height: 14 }} strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>{tTheme?.('title') || 'Color Theme'}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{tTheme?.('subtitle') || `${themeEntries.length} palettes available`}</p>
          </div>
        </div>
        <div style={{ padding: 10, maxHeight: pos?.maxHeight ?? 380, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {themeEntries.map(([key, palette], idx) => {
              const isActive = currentTheme === key;
              return (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  whileHover={{ scale: 1.025, y: -1 }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => onSelect(key)}
                  style={{
                    position: 'relative',
                    borderRadius: 12,
                    overflow: 'hidden',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: isActive ? `2px solid ${palette.primary[400]}` : '1.5px solid rgba(0,0,0,0.07)',
                    background: isActive ? palette.primary[50] : '#fafafa',
                    boxShadow: isActive ? `0 4px 16px color-mix(in srgb, ${palette.primary[400]} 18%, transparent)` : '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                  <div style={{ height: 38, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})` }}>
                    {isActive && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={snap} style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'white', display: 'grid', placeContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
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
      type='button'
      dir='ltr'
      onClick={onChange}
      whileTap={{ scale: 0.93 }}
      style={{
        position: 'relative',
        width: 36,
        height: 20,
        borderRadius: 99,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        background: checked ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' : '#e2e8f0',
        boxShadow: checked ? '0 2px 8px color-mix(in srgb, var(--color-primary-500) 30%, transparent)' : 'none',
        transition: 'background .2s, box-shadow .2s',
      }}>
      <motion.span animate={{ x: checked ? 18 : 2 }} transition={snap} style={{ position: 'absolute', top: 2, left: 0, width: 16, height: 16, borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} />
    </motion.button>
  );
}

/* ─── Palette Picker ─────────────────────────────────────────── */
function PalettePicker({ paletteKey, setPaletteKey, t }) {
  const entries = Object.entries(SIDEBAR_PALETTES);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            background: 'color-mix(in srgb, var(--color-primary-500) 12%, transparent)',
            display: 'grid',
            placeContent: 'center',
          }}>
          <Sliders style={{ width: 11, height: 11, color: 'var(--color-primary-600)' }} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b' }}>{t('customize.appearanceTitle')}</span>
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
                position: 'relative',
                borderRadius: 11,
                overflow: 'hidden',
                cursor: 'pointer',
                textAlign: 'center',
                padding: 0,
                border: isActive ? '2px solid var(--color-primary-400)' : '1.5px solid rgba(0,0,0,0.07)',
                background: isActive ? 'color-mix(in srgb, var(--color-primary-500) 5%, white)' : '#fafafa',
                boxShadow: isActive ? '0 4px 14px color-mix(in srgb, var(--color-primary-400) 18%, transparent)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'border-color .18s, box-shadow .18s',
              }}>
              {/* Preview strips */}
              <div style={{ height: 28, display: 'flex', overflow: 'hidden', borderRadius: '9px 9px 0 0' }}>
                {pal.preview.map((c, i) => (
                  <div key={i} style={{ flex: 1, background: c }} />
                ))}
              </div>
              {/* Check */}
              {isActive && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={snap} style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary-500)', display: 'grid', placeContent: 'center' }}>
                  <Check style={{ width: 8, height: 8, color: '#fff' }} strokeWidth={3} />
                </motion.div>
              )}
              <div style={{ padding: '5px 6px 6px' }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', letterSpacing: '0.02em', lineHeight: 1.3, margin: 0 }}>{t(pal.nameKey)}</p>
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
  outreach: { icon: Radar, color: '#ea580c' },
  tools: { icon: Calculator, color: '#14b8a6' },
  finance: { icon: Wallet, color: '#22c55e' },
  account: { icon: UserIcon, color: '#64748b' },
};

/* ─── CustomizeSidebarModal ──────────────────────────────────── */
function CustomizeSidebarModal({ open, onClose, sections, isHidden, toggleHidden, resetAll, isInstalled, toggleInstalled, paletteKey, setPaletteKey, t, getLabel, setLabel, labels, resetLabels }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('nav');
  const [renamingId, setRenamingId] = useState(null);
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
              if (!seen.has(child.id)) {
                seen.add(child.id);
                result.push(child);
              }
            });
          }
        }
      });
    });
    return result;
  }, [sections]);

  const navItems = useMemo(() => allItems.filter(i => !i.marketplace), [allItems]);
  const marketplaceItems = useMemo(() => {
    const items = allItems.filter(i => i.marketplace);
    const rank = id => {
      const optIn = OPT_IN_MARKETPLACE_IDS.indexOf(id);
      if (optIn >= 0) return optIn;
      const outreach = OUTREACH_MARKETPLACE_IDS.indexOf(id);
      if (outreach >= 0) return 10 + outreach;
      return 100 + items.findIndex(item => item.id === id);
    };
    return [...items].sort((a, b) => rank(a.id) - rank(b.id));
  }, [allItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return navItems;
    const q = search.toLowerCase();
    return navItems.filter(item => {
      const label = item.nameKey?.toLowerCase() || '';
      const desc = (item.descKey || '').toLowerCase();
      return label.includes(q) || desc.includes(q);
    });
  }, [navItems, search]);

  const filteredMarketplace = useMemo(() => {
    if (!search.trim()) return marketplaceItems;
    const q = search.toLowerCase();
    return marketplaceItems.filter(item => {
      const defaultName = t(`items.${item.nameKey}`).toLowerCase();
      const custom = String(labels?.[item.id] || '').toLowerCase();
      const desc = (item.descKey || '').toLowerCase();
      return (
        defaultName.includes(q) ||
        custom.includes(q) ||
        item.nameKey?.toLowerCase().includes(q) ||
        desc.includes(q)
      );
    });
  }, [marketplaceItems, search, t, labels]);

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
    const fn = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open, onClose]);

  const hiddenCount = navItems.filter(item => isHidden(item.id) && !item.required).length;
  const visibleCount = navItems.filter(i => !isHidden(i.id)).length;
  const installedCount = marketplaceItems.filter(i => isInstalled?.(i.id)).length;
  const marketplaceNewCount = marketplaceItems.length - installedCount;

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key='backdrop' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)' }} />
          <motion.div
            key='modal'
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={modal}
            className='customize_sidebar'
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              zIndex: 10001,
              width: 'min(580px, calc(100vw - 32px))',
              maxHeight: 'calc(100vh - 64px)',
              borderRadius: 22,
              overflow: 'hidden',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.07)',
              display: 'flex',
              flexDirection: 'column',
            }}>
            {/* Modal Header */}
            <div
              style={{
                padding: '22px 24px 16px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                flexShrink: 0,
                background: 'linear-gradient(to bottom, #f8fafd, #ffffff)',
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      display: 'grid',
                      placeContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                      boxShadow: '0 4px 14px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
                    }}>
                    <LayoutGrid style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16.5, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.3 }}>{t('customize.title')}</h2>
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
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    border: '1px solid rgba(0,0,0,0.07)',
                    background: '#fff',
                    color: '#64748b',
                    display: 'grid',
                    placeContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                  <X style={{ width: 14, height: 14 }} strokeWidth={2.5} />
                </motion.button>
              </div>
              {/* Search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 13px',
                  borderRadius: 12,
                  background: '#f8f9fb',
                  border: '1px solid rgba(0,0,0,0.07)',
                }}>
                <Search style={{ width: 13, height: 13, color: '#94a3b8', flexShrink: 0 }} strokeWidth={2} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('customize.searchPlaceholder')}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    '::placeholder': { color: '#94a3b8' },
                  }}
                />
                {search && (
                  <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }} onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'grid', placeContent: 'center', padding: 0 }}>
                    <X style={{ width: 11, height: 11 }} strokeWidth={2.5} />
                  </motion.button>
                )}
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {[
                  { key: 'nav', label: t('customize.tabs.navigation'), icon: LayoutGrid, badge: 0 },
                  { key: 'market', label: t('customize.tabs.marketplace'), icon: Sparkles, badge: marketplaceNewCount },
                ].map(tabItem => {
                  const TabIcon = tabItem.icon;
                  const isActive = tab === tabItem.key;
                  return (
                    <button
                      key={tabItem.key}
                      type='button'
                      onClick={() => setTab(tabItem.key)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 13px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isActive ? '1px solid transparent' : '1px solid rgba(0,0,0,0.07)',
                        background: isActive ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' : '#fff',
                        color: isActive ? '#fff' : '#64748b',
                        boxShadow: isActive ? '0 4px 12px color-mix(in srgb, var(--color-primary-500) 28%, transparent)' : '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all .18s',
                      }}>
                      <TabIcon style={{ width: 12.5, height: 12.5 }} strokeWidth={2.2} />
                      {tabItem.label}
                      {tabItem.badge > 0 && (
                        <span
                          style={{
                            display: 'grid',
                            placeContent: 'center',
                            minWidth: 16,
                            height: 16,
                            padding: '0 4px',
                            borderRadius: 99,
                            fontSize: 9,
                            fontWeight: 800,
                            background: isActive ? 'rgba(255,255,255,0.28)' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                            color: '#fff',
                          }}>
                          {tabItem.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>
              {tab === 'nav' ? (
              <>
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
                  <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b' }}>{t('customize.navItemsTitle')}</span>
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
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 7,
                            background: `${gcfg.color}18`,
                            display: 'grid',
                            placeContent: 'center',
                          }}>
                          <GIcon style={{ width: 11, height: 11, color: gcfg.color }} strokeWidth={2} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#94a3b8' }}>{t(groupLabelKey)}</span>
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '11px 13px',
                                borderRadius: 13,
                                background: hidden ? '#fafafa' : '#f8fafd',
                                border: `1px solid ${hidden ? 'rgba(0,0,0,0.06)' : 'color-mix(in srgb, var(--color-primary-300) 18%, transparent)'}`,
                                opacity: hidden ? 0.55 : 1,
                                transition: 'all .2s',
                              }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  display: 'grid',
                                  placeContent: 'center',
                                  flexShrink: 0,
                                  background: hidden ? '#f1f5f9' : 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                                  color: hidden ? '#94a3b8' : '#fff',
                                  boxShadow: hidden ? 'none' : '0 2px 8px color-mix(in srgb, var(--color-primary-500) 28%, transparent)',
                                  transition: 'all .2s',
                                }}>
                                <Icon style={{ width: 14, height: 14 }} strokeWidth={2} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13.5, fontWeight: 650, color: '#0f172a', letterSpacing: '-0.01em' }}>{t(`items.${item.nameKey}`)}</span>
                                  {item.required && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        padding: '2px 7px',
                                        borderRadius: 5,
                                        background: 'rgba(100,116,139,0.1)',
                                        color: '#64748b',
                                      }}>
                                      <Lock style={{ width: 8, height: 8 }} strokeWidth={2.5} />
                                      {t('customize.requiredLabel')}
                                    </span>
                                  )}
                                  {item.highlightVariant === 'premium' && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        padding: '2px 7px',
                                        borderRadius: 5,
                                        background: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)',
                                        color: 'var(--color-primary-600)',
                                      }}>
                                      <Sparkles style={{ width: 8, height: 8 }} strokeWidth={2.5} />
                                      {t('customize.premiumLabel')}
                                    </span>
                                  )}
                                </div>
                                {item.descKey && <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2.5, lineHeight: 1.45 }}>{t(item.descKey)}</p>}
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
              </>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.55 }}>{t('customize.marketplace.subtitle')}</p>
                  </div>
                  {filteredMarketplace.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                      {marketplaceItems.length === 0 ? (
                        <>
                          <Sparkles style={{ width: 28, height: 28, margin: '0 auto 10px', opacity: 0.3 }} strokeWidth={1.5} />
                          <p style={{ fontSize: 13, fontWeight: 500 }}>{t('customize.marketplace.emptyTitle')}</p>
                        </>
                      ) : (
                        <>
                          <Search style={{ width: 28, height: 28, margin: '0 auto 10px', opacity: 0.3 }} strokeWidth={1.5} />
                          <p style={{ fontSize: 13, fontWeight: 500 }}>{t('customize.noResults')}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {filteredMarketplace.map((item, idx) => {
                        const Icon = item.icon || LayoutDashboard;
                        const installed = isInstalled?.(item.id);
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                              padding: 14,
                              borderRadius: 16,
                              background: installed ? 'color-mix(in srgb, var(--color-primary-500) 5%, white)' : '#f8fafd',
                              border: `1.5px solid ${installed ? 'color-mix(in srgb, var(--color-primary-400) 30%, transparent)' : 'rgba(0,0,0,0.06)'}`,
                              transition: 'all .2s',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 11,
                                  display: 'grid',
                                  placeContent: 'center',
                                  background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                                  color: '#fff',
                                  boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
                                }}>
                                <Icon style={{ width: 16, height: 16 }} strokeWidth={2} />
                              </div>
                              {installed && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 9,
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    color: '#16a34a',
                                    background: 'rgba(34,197,94,0.1)',
                                    padding: '3px 7px',
                                    borderRadius: 99,
                                  }}>
                                  <Check style={{ width: 9, height: 9 }} strokeWidth={3} />
                                  {t('customize.marketplace.addedBadge')}
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              {renamingId === item.id ? (
                                <input
                                  autoFocus
                                  defaultValue={labels?.[item.id] || t(`items.${item.nameKey}`)}
                                  maxLength={48}
                                  onBlur={e => {
                                    setLabel?.(item.id, e.target.value);
                                    setRenamingId(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      setLabel?.(item.id, e.currentTarget.value);
                                      setRenamingId(null);
                                    }
                                    if (e.key === 'Escape') setRenamingId(null);
                                  }}
                                  placeholder={t('customize.marketplace.renamePlaceholder')}
                                  style={{
                                    width: '100%',
                                    marginBottom: 6,
                                    padding: '7px 9px',
                                    borderRadius: 8,
                                    border: '1.5px solid color-mix(in srgb, var(--color-primary-400) 45%, transparent)',
                                    fontSize: 13,
                                    fontWeight: 650,
                                    color: '#0f172a',
                                    outline: 'none',
                                    background: '#fff',
                                  }}
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', margin: 0, flex: 1, minWidth: 0 }}>
                                    {typeof getLabel === 'function' ? getLabel(item, t) : t(`items.${item.nameKey}`)}
                                  </p>
                                  <button
                                    type="button"
                                    title={t('customize.marketplace.renameButton')}
                                    onClick={() => setRenamingId(item.id)}
                                    style={{
                                      border: 'none',
                                      background: 'rgba(0,0,0,0.04)',
                                      borderRadius: 7,
                                      width: 26,
                                      height: 26,
                                      display: 'grid',
                                      placeContent: 'center',
                                      cursor: 'pointer',
                                      color: '#64748b',
                                      flexShrink: 0,
                                    }}>
                                    <Pencil style={{ width: 12, height: 12 }} strokeWidth={2.2} />
                                  </button>
                                </div>
                              )}
                              {item.descKey && <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.45 }}>{t(item.descKey)}</p>}
                              {(OUTREACH_MARKETPLACE_IDS.includes(item.id) ||
                                OPT_IN_MARKETPLACE_IDS.includes(item.id)) && (
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#ea580c', marginTop: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                  {OPT_IN_MARKETPLACE_IDS.includes(item.id)
                                    ? t('customize.marketplace.optInBadge')
                                    : t('groups.outreach')}
                                </p>
                              )}
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => toggleInstalled?.(item.id)}
                              style={{
                                marginTop: 'auto',
                                height: 34,
                                borderRadius: 9,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                ...(installed
                                  ? { background: 'rgba(0,0,0,0.05)', color: '#64748b' }
                                  : {
                                      background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                                      color: '#fff',
                                      boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 28%, transparent)',
                                    }),
                              }}>
                              {installed ? (
                                <>
                                  <X style={{ width: 11, height: 11 }} strokeWidth={2.5} />
                                  {t('customize.marketplace.removeButton')}
                                </>
                              ) : (
                                <>+ {t('customize.marketplace.addButton')}</>
                              )}
                            </motion.button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '13px 22px',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                background: '#fafbfd',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {tab === 'nav'
                  ? `${visibleCount} ${t('customize.ofLabel')} ${navItems.length} ${t('customize.visibleLabel')}`
                  : `${installedCount} ${t('customize.ofLabel')} ${marketplaceItems.length} ${t('customize.marketplace.installedLabel')}`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {tab === 'nav' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={resetAll}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 9,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid rgba(0,0,0,0.07)',
                    background: '#fff',
                    color: '#64748b',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                  {t('customize.resetButton')}
                </motion.button>
                )}
                {tab === 'market' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => resetLabels?.()}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 9,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid rgba(0,0,0,0.07)',
                    background: '#fff',
                    color: '#64748b',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                  {t('customize.marketplace.resetNamesButton')}
                </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{
                    padding: '7px 20px',
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    color: '#fff',
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    boxShadow: '0 3px 10px color-mix(in srgb, var(--color-primary-500) 30%, transparent)',
                  }}>
                  {t('customize.doneButton')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ─── SidebarFooter ──────────────────────────────────────────── */
function SidebarFooter({ collapsed, onLogout, logoutLabel, sections, isHidden, toggleHidden, resetAll, isInstalled, toggleInstalled, paletteKey, setPaletteKey, t, P, getLabel, setLabel, labels, resetLabels, mobileCompact = false }) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const isRTL = getDir() === 'rtl';
  const btnBase = {
    border: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
    background: P?.bgCard || '#ffffff',
    boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
  };
  const marketplaceAvailable = useMemo(() => {
    const seen = new Set();
    let count = 0;
    sections?.forEach(section =>
      section.items.forEach(item => {
        if (item.marketplace && !seen.has(item.id)) {
          seen.add(item.id);
          if (!isInstalled?.(item.id)) count++;
        }
      }),
    );
    return count;
  }, [sections, isInstalled]);

  const customizeBtn = (
    <motion.button
      whileHover={{ scale: collapsed ? 1.08 : 1.02, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => setCustomizeOpen(true)}
      title={t('customize.triggerLabel')}
      onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, var(--color-primary-500) 8%, ${P?.bgCard || '#fff'})`)}
      onMouseLeave={e => (e.currentTarget.style.background = P?.bgCard || '#ffffff')}
      style={{
        display: 'flex',
        flexDirection: collapsed ? 'row' : mobileCompact ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: mobileCompact ? 'flex-start' : 'center',
        gap: collapsed ? 0 : mobileCompact ? 10 : 7,
        cursor: 'pointer',
        overflow: 'visible',
        transition: 'background .18s, box-shadow .18s',
        width: collapsed ? 40 : mobileCompact ? '100%' : undefined,
        ...(collapsed
          ? { height: 40, borderRadius: 12 }
          : mobileCompact
            ? { height: 44, borderRadius: 12, padding: '0 10px' }
            : { minHeight: 76, borderRadius: 14, padding: '12px 8px' }),
        ...btnBase,
      }}>
      <span
        style={{
          position: 'relative',
          flexShrink: 0,
          display: 'grid',
          placeContent: 'center',
          width: collapsed ? 'auto' : mobileCompact ? 26 : 28,
          height: collapsed ? 'auto' : mobileCompact ? 26 : 28,
          borderRadius: mobileCompact ? 8 : 9,
          background: 'color-mix(in srgb, var(--color-primary-500) 12%, transparent)',
          color: 'var(--color-primary-600)',
        }}>
        <Settings2 style={{ width: collapsed ? 15 : mobileCompact ? 13 : 14.5, height: collapsed ? 15 : mobileCompact ? 13 : 14.5 }} strokeWidth={2.2} />
        {marketplaceAvailable > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: -3,
              [isRTL ? 'left' : 'right']: -3,
              minWidth: 14,
              height: 14,
              padding: '0 3px',
              borderRadius: 99,
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#fff',
              fontSize: 8.5,
              fontWeight: 800,
              display: 'grid',
              placeContent: 'center',
              boxShadow: '0 2px 6px rgba(234,88,12,0.4)',
            }}>
            {marketplaceAvailable}
          </motion.span>
        )}
      </span>
      {!collapsed && (
        <span
          style={{
            fontSize: mobileCompact ? 12.5 : 10.5,
            fontWeight: 650,
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            color: P?.text || '#334155',
            whiteSpace: 'normal',
            overflow: 'visible',
            wordBreak: 'break-word',
            textAlign: mobileCompact ? 'start' : 'center',
            flex: mobileCompact ? 1 : undefined,
            maxWidth: '100%',
          }}>
          {t('customize.triggerLabel')}
        </span>
      )}
    </motion.button>
  );

  return (
    <>
      <div
        data-sidebar-footer
        className='sidebar-glass-footer'
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
          background: P?.footerBg || 'rgba(248,249,251,0.9)',
          backdropFilter: 'blur(12px)',
          padding: mobileCompact ? '10px 10px 12px' : '12px 12px 14px',
        }}>
        {mobileCompact ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
            <SidebarThemeSwitcher collapsed={collapsed} P={P} />
            {customizeBtn}
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                alignItems: collapsed ? 'center' : 'stretch',
                marginBottom: 12,
              }}>
              <SidebarLanguageToggle collapsed={collapsed} P={P} />
              <SidebarThemeSwitcher collapsed={collapsed} P={P} />
            </div>

            <div style={{ height: 1, background: P?.border || 'rgba(0,0,0,0.07)', margin: collapsed ? '0 auto 10px' : '0 2px 10px', width: collapsed ? 32 : 'auto' }} />

            <div
              style={{
                display: collapsed ? 'flex' : 'grid',
                flexDirection: collapsed ? 'column' : undefined,
                gridTemplateColumns: collapsed ? undefined : '1fr 1fr',
                gap: 8,
                alignItems: collapsed ? 'center' : 'stretch',
              }}>
              {customizeBtn}
              <motion.button
                whileHover={{ scale: collapsed ? 1.08 : 1.02, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={onLogout}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                style={{
                  display: 'flex',
                  flexDirection: collapsed ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: collapsed ? 0 : 7,
                  fontWeight: 700,
                  letterSpacing: '-0.005em',
                  cursor: 'pointer',
                  overflow: 'visible',
                  border: '1px solid rgba(239,68,68,0.16)',
                  background: 'rgba(239,68,68,0.06)',
                  color: '#dc2626',
                  transition: 'background .18s, box-shadow .18s',
                  ...(collapsed ? { width: 40, height: 40, borderRadius: 12 } : { minHeight: 76, borderRadius: 14, padding: '12px 8px' }),
                }}>
                <span
                  style={{
                    flexShrink: 0,
                    display: 'grid',
                    placeContent: 'center',
                    width: collapsed ? 'auto' : 28,
                    height: collapsed ? 'auto' : 28,
                    borderRadius: 9,
                    background: collapsed ? 'transparent' : 'rgba(239,68,68,0.12)',
                  }}>
                  <LogOut style={{ width: collapsed ? 15 : 14.5, height: collapsed ? 15 : 14.5, transform: isRTL ? 'scaleX(-1)' : 'none' }} strokeWidth={2.2} />
                </span>
                {!collapsed && (
                  <span style={{ fontSize: 10.5, lineHeight: 1.3, whiteSpace: 'normal', overflow: 'visible', wordBreak: 'break-word', textAlign: 'center', maxWidth: '100%' }}>{logoutLabel}</span>
                )}
              </motion.button>
            </div>
          </>
        )}
      </div>

      <CustomizeSidebarModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} sections={sections} isHidden={isHidden} toggleHidden={toggleHidden} resetAll={resetAll} isInstalled={isInstalled} toggleInstalled={toggleInstalled} paletteKey={paletteKey} setPaletteKey={setPaletteKey} t={t} getLabel={getLabel} setLabel={setLabel} labels={labels} resetLabels={resetLabels} />
    </>
  );
}

const EDGE_COPY = {
  en: {
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    hide: 'Hide sidebar for full width',
    show: 'Show sidebar',
  },
  ar: {
    collapse: 'طي الشريط الجانبي',
    expand: 'توسيع الشريط الجانبي',
    hide: 'إخفاء الشريط لمساحة أكبر',
    show: 'إظهار الشريط الجانبي',
  },
};

function blurControl(event) {
  event.currentTarget.blur();
}

function SidebarEdgeControls({ collapsed, focusMode, setCollapsed, setFocusMode, edgeInset, isRTL, locale }) {
  const edge = EDGE_COPY[locale?.startsWith('ar') ? 'ar' : 'en'];
  const collapseLabel = focusMode
    ? edge.show
    : collapsed
      ? edge.expand
      : edge.collapse;
  const offsetLabel = focusMode ? edge.show : edge.hide;

  const handleCollapseClick = event => {
    if (focusMode) {
      setFocusMode(false);
      if (collapsed) setCollapsed(false);
      else setCollapsed(true);
    } else {
      setCollapsed(v => !v);
    }
    blurControl(event);
  };

  return (
    <div
      className={`sidebar-edge-dock hidden lg:flex ${focusMode ? 'is-offset is-restore-only' : ''}`}
      style={{
        position: 'fixed',
        top: focusMode ? 5 : EDGE_DOCK_TOP,
        [isRTL ? 'right' : 'left']: focusMode ? 5 : edgeInset,
        zIndex: 1001,
        transition: `${isRTL ? 'right' : 'left'} .28s cubic-bezier(0.22,1,0.36,1), top .28s cubic-bezier(0.22,1,0.36,1)`,
      }}
    >
      {!focusMode ? (
        <>
          <motion.button
            type="button"
            className="sidebar-edge-btn"
            onClick={handleCollapseClick}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            aria-label={collapseLabel}
            title={collapseLabel}
          >
            {collapsed ? (
              <ChevronRight className="rtl:scale-x-[-1]" style={{ width: 14, height: 14 }} strokeWidth={2.5} />
            ) : (
              <ChevronLeft className="rtl:scale-x-[-1]" style={{ width: 14, height: 14 }} strokeWidth={2.5} />
            )}
          </motion.button>
          <span className="sidebar-edge-divider" aria-hidden="true" />
        </>
      ) : null}

      <motion.button
        type="button"
        className={`sidebar-edge-btn ${focusMode ? 'is-active' : ''}`}
        onClick={event => {
          setFocusMode(v => !v);
          blurControl(event);
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        aria-label={offsetLabel}
        title={offsetLabel}
        aria-pressed={focusMode}
      >
        {focusMode ? (
          <PanelLeftOpen className="rtl:scale-x-[-1]" style={{ width: 14, height: 14 }} strokeWidth={2.5} />
        ) : (
          <PanelLeftClose className="rtl:scale-x-[-1]" style={{ width: 14, height: 14 }} strokeWidth={2.5} />
        )}
      </motion.button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({ open, setOpen, collapsed: collapsedProp, setCollapsed: setCollapsedProp, focusMode: focusModeProp, setFocusMode: setFocusModeProp }) {
  const pathname = useNextPathname();
  const searchParams = useSearchParams();
  const router = useI18nRouter();
  const user = useUser();
  const role = user?.role ?? null;
  const allowedPages = user?.allowedPages ?? null;
  const t = useTranslations('nav');
  const t_header = useTranslations('header');
  const { totalUnread } = useUnreadChats();
  const { unreadNotifications } = useUnreadNotifications();
  const { unreadWhatsApp } = useUnreadWhatsApp();
  const { unreadMetaWhatsApp } = useUnreadMetaWhatsApp();

  const [collapsedLS, setCollapsedLS] = useLocalStorageState(LS_COLLAPSED, false);
  const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : collapsedLS;
  const setCollapsed = typeof setCollapsedProp === 'function' ? setCollapsedProp : setCollapsedLS;

  const [focusModeLS, setFocusModeLS] = useLocalStorageState(LS_OFFSET, false);
  const focusMode = typeof focusModeProp === 'boolean' ? focusModeProp : focusModeLS;
  const setFocusMode = typeof setFocusModeProp === 'function' ? setFocusModeProp : setFocusModeLS;

  const { isHidden, toggle: toggleHidden, resetAll } = useHiddenItems();
  const { isInstalled, toggle: toggleInstalled } = useMarketplaceItems();
  const { labels, getLabel, setLabel, resetLabels } = useCustomLabels();
  const { paletteKey, setPaletteKey, palette: P } = useSidebarPalette();
  const locale = useLocale();
  const isRTL = getDir() === 'rtl';

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
  const sidebarEdge = SIDEBAR_MARGIN + (collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W);
  // ~40px dock — sit on the sidebar edge, slightly inset (not floating outside)
  const edgeInset = focusMode ? 10 : sidebarEdge - 30;
  const { hideEdgeDock } = useSidebarChrome();
  const DesktopSidebar = (
    <>
      {!hideEdgeDock ? (
        <SidebarEdgeControls
          collapsed={collapsed}
          focusMode={focusMode}
          setCollapsed={setCollapsed}
          setFocusMode={setFocusMode}
          edgeInset={edgeInset}
          isRTL={isRTL}
          locale={locale}
        />
      ) : null}
      <aside
      className={`sidebar-shell sidebar-glass hidden lg:flex flex-col shrink-0 ${focusMode ? '' : 'ltr:ml-4 rtl:mr-4 ltr:mr-6 rtl:ml-6'}`}
      style={{
        width: focusMode ? 0 : collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
        height: `calc(100vh - ${SIDEBAR_MARGIN + SIDEBAR_MARGIN_BOTTOM}px)`,
        marginTop: focusMode ? 0 : SIDEBAR_MARGIN,
        marginBottom: focusMode ? 0 : SIDEBAR_MARGIN_BOTTOM,
        marginLeft: focusMode ? 0 : undefined,
        marginRight: focusMode ? 0 : undefined,
        position: 'relative',
        zIndex: 1000,
        overflow: 'hidden',
        borderRadius: 'var(--tenant-radius-card, 16px)',
        background: P.bg,
        opacity: focusMode ? 0 : 1,
        pointerEvents: focusMode ? 'none' : 'auto',
        transform: focusMode ? `translateX(${isRTL ? '120%' : '-120%'})` : 'translateX(0)',
        transition: 'width .28s cubic-bezier(0.22,1,0.36,1), opacity .22s ease, transform .28s cubic-bezier(0.22,1,0.36,1), margin .28s cubic-bezier(0.22,1,0.36,1)',
        fontFamily: isRTL ? undefined : SIDEBAR_FONT_LTR,
      }}>
      {/* Ambient glass wash */}
      <div
        className='sidebar-glass-texture'
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: P.texture,
          backgroundSize: P.textureSize,
          opacity: 1,
        }}
      />
      {/* Top accent bar */}
      <div
        className='sidebar-glass-accent'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 2,
          background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to), var(--color-gradient-from))',
          backgroundSize: '200% 100%',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <SidebarHeader user={user} collapsed={collapsed} P={P} />

        <LayoutGroup id='sidebar-desktop'>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ScrollShadow P={P}>
              <nav style={{ padding: collapsed ? '4px 10px' : '4px 10px 10px', display: 'flex', flexDirection: 'column' }}>
                {sections?.map((section, idx) => (
                  <NavSection key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} collapsed={collapsed} t={t} totalUnread={totalUnread} unreadNotifications={unreadNotifications} unreadWhatsApp={unreadWhatsApp} unreadMetaWhatsApp={unreadMetaWhatsApp} isHidden={isHidden} isInstalled={isInstalled} allowedPages={allowedPages} P={P} first={idx === 0} getLabel={getLabel} />
                ))}
              </nav>
            </ScrollShadow>
          </div>
        </LayoutGroup>

        <SidebarFooter collapsed={collapsed} onLogout={handleLogout} logoutLabel={logoutLabel} sections={sections} isHidden={isHidden} toggleHidden={toggleHidden} resetAll={resetAll} isInstalled={isInstalled} toggleInstalled={toggleInstalled} paletteKey={paletteKey} setPaletteKey={setPaletteKey} t={t} P={P} getLabel={getLabel} setLabel={setLabel} labels={labels} resetLabels={resetLabels} />
      </div>
      </aside>
    </>
  );

  /* ── Mobile floating drawer (overlays page; no body push) ── */
  const drawerW = (() => {
    if (typeof window === 'undefined') return 288;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-drawer-w').trim();
    if (raw) {
      const probe = document.createElement('div');
      probe.style.cssText = `position:absolute;visibility:hidden;width:${raw}`;
      document.body.appendChild(probe);
      const w = probe.getBoundingClientRect().width;
      probe.remove();
      if (w > 0) return Math.round(w);
    }
    return Math.min(288, Math.round(window.innerWidth - 22));
  })();
  const drawerOffset = isRTL ? drawerW + 24 : -(drawerW + 24);
  const drawerMotion = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };
  const MobileDrawer = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key='overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setOpen && setOpen(false)}
            className='sidebar-glass-overlay fixed inset-0 z-[110000] lg:hidden'
          />
          <motion.aside
            key='drawer'
            initial={{ x: drawerOffset, opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: drawerOffset, opacity: 0.96 }}
            transition={drawerMotion}
            className='sidebar-shell sidebar-glass is-mobile-drawer fixed z-[110001] flex flex-col lg:hidden'
            style={{
              background: P.bg,
              fontFamily: isRTL ? undefined : SIDEBAR_FONT_LTR,
            }}>
            <div
              className='sidebar-glass-texture'
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                backgroundImage: P.texture,
                backgroundSize: P.textureSize,
              }}
            />
            <div
              className='sidebar-glass-accent'
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                zIndex: 2,
                background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))',
              }}
            />

            <div className='sidebar-glass-header'>
              <div className='sidebar-glass-title'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo/logo1.png"
                  alt="So7baFit"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {role === 'super_admin' && t('brand.superAdminPortal')}
                  {role === 'admin' && t('brand.adminPortal')}
                  {role === 'coach' && t('brand.coachPortal')}
                  {role === 'client' && t('brand.clientPortal')}
                </span>
              </div>
              <button
                type='button'
                className='sidebar-glass-close'
                onClick={() => setOpen(false)}
                aria-label='Close menu'
              >
                <X style={{ width: 14, height: 14 }} strokeWidth={2.5} />
              </button>
            </div>

            <LayoutGroup id='sidebar-mobile'>
              <div
                className='sidebar-mobile-nav'
                style={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ScrollShadow P={P}>
                  <nav style={{ padding: '4px 10px 10px', display: 'flex', flexDirection: 'column' }}>
                    {sections?.map((section, idx) => (
                      <NavSection key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} t={t} totalUnread={totalUnread} unreadNotifications={unreadNotifications} unreadWhatsApp={unreadWhatsApp} unreadMetaWhatsApp={unreadMetaWhatsApp} isHidden={isHidden} isInstalled={isInstalled} allowedPages={allowedPages} P={P} first={idx === 0} getLabel={getLabel} />
                    ))}
                  </nav>
                </ScrollShadow>
              </div>
            </LayoutGroup>

            <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <SidebarFooter
                collapsed={false}
                mobileCompact
                onLogout={handleLogout}
                logoutLabel={logoutLabel}
                sections={sections}
                isHidden={isHidden}
                toggleHidden={toggleHidden}
                resetAll={resetAll}
                isInstalled={isInstalled}
                toggleInstalled={toggleInstalled}
                paletteKey={paletteKey}
                setPaletteKey={setPaletteKey}
                t={t}
                P={P}
                getLabel={getLabel}
                setLabel={setLabel}
                labels={labels}
                resetLabels={resetLabels}
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
