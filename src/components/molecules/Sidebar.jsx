'use client';

import React, { useLayoutEffect, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/utils/axios';
import { clearClientSession } from '@/lib/session-cleanup';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { LayoutDashboard, Users, User as UserIcon, Apple, MessageSquare, MessageCircle, Calculator, BarChart3, ChefHat, ChevronDown, ChevronLeft, X, Bell, Wallet, ListTodo, CalendarDays, LogOut, Globe, Palette, Paintbrush, Check, Languages, ChevronRight, BrainCircuit, GanttChart, FileText, FilePenLine, Inbox, Layers, Layers3, TrendingUp, BookOpen, BookMarked, Target, Coffee, ShieldCheck, CreditCard, Activity, Sliders, AudioLines, ShieldAlert, Radar, GraduationCap, Brain, PanelLeftClose, PanelLeftOpen, Maximize2, ScanLine, Library, ScanSearch, Moon, Sun } from 'lucide-react';
import { useSearchParams, useRouter as useNextRouter } from 'next/navigation';
import { usePathname as useNextPathname } from '@/i18n/navigation';
import { useUser } from '@/hooks/useUser';
import { FaUsers, FaWhatsapp, FaFacebook } from 'react-icons/fa';
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
import { createVisiblePoller } from '@/lib/visible-poll';
import { applyPageAccessToSections } from '@/lib/nav-access';
import { useSidebarChrome } from './SidebarChromeContext';
import {
	readingThemeToSidebarPalette,
	useAiReadingChrome,
} from '@/lib/ai-reading/reading-chrome';
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
const LS_CUSTOM_LABELS = 'sidebar:custom-labels';
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
  pageAccess_super: { id: 'pageAccess_super', nameKey: 'pageAccess', href: '/dashboard/super-admin/page-access', icon: Sliders, descKey: 'descriptions.pageAccess_super', group: 'management', defaultVisible: true, required: false },
  documentEditor_super: { id: 'documentEditor_super', nameKey: 'documentEditor', href: '/dashboard/super-admin/document-editor', icon: FilePenLine, descKey: 'descriptions.documentEditor_super', group: 'management', defaultVisible: true, required: false },
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
  bodyMeasurement: { id: 'bodyMeasurement', nameKey: 'bodyMeasurement', href: '/dashboard/my/profile/body-measurements', icon: ScanLine, descKey: 'descriptions.bodyMeasurement', group: 'workspace', defaultVisible: true, required: false },
  myNutrition: { id: 'myNutrition', nameKey: 'myNutrition', href: '/dashboard/my/nutrition', icon: Apple, descKey: 'descriptions.myNutrition', group: 'workspace', defaultVisible: true, required: false },
  recipes: { id: 'recipes', nameKey: 'recipes', href: '/dashboard/my/recipes', icon: Coffee, descKey: 'descriptions.recipes', group: 'workspace', defaultVisible: true, required: false },
  weeklyStrength: { id: 'weeklyStrength', nameKey: 'weeklyStrength', href: '/dashboard/my/report', icon: TrendingUp, descKey: 'descriptions.weeklyStrength', group: 'workspace', defaultVisible: true, required: false },
  myReminders: { id: 'myReminders', nameKey: 'myReminders', href: '/dashboard/reminders', icon: Bell, descKey: 'descriptions.myReminders', group: 'workspace', defaultVisible: true, required: false },
  todos: { id: 'todos', nameKey: 'todos', href: '/workspace?tab=tasks', icon: ListTodo, descKey: 'descriptions.todos', group: 'workspace', defaultVisible: true, required: false },
  calendar: { id: 'calendar', nameKey: 'calendar', href: '/workspace?tab=calendar', icon: CalendarDays, descKey: 'descriptions.calendar', group: 'workspace', defaultVisible: true, required: false },
  messages: { id: 'messages', nameKey: 'messages', href: '/dashboard/chat', icon: MessageSquare, descKey: 'descriptions.messages', group: 'outreach', defaultVisible: true, required: false },
  whatsapp: { id: 'whatsapp', nameKey: 'whatsapp', href: '/dashboard/whatsapp', icon: FaWhatsapp, descKey: 'descriptions.whatsapp', group: 'outreach', defaultVisible: true, required: false },
  /* Store Admin tools — locked for gym roles until enabled in Page Access */
  transcript: { id: 'transcript', nameKey: 'transcript', href: '/dashboard/transcript', icon: AudioLines, descKey: 'descriptions.transcript', group: 'workspace', defaultVisible: true, required: false, defaultLocked: true },
  calorieCalculator: { id: 'calorieCalculator', nameKey: 'calorieCalculator', href: '/dashboard/calculator', icon: Calculator, descKey: 'descriptions.calorieCalculator', group: 'tools', defaultVisible: true, required: false },
  aiFree: { id: 'aiFree', nameKey: 'aiFree', href: '/dashboard/ai-free', icon: BrainCircuit, descKey: 'descriptions.aiFree', group: 'tools', defaultVisible: true, required: false },
  readingRoom: { id: 'readingRoom', nameKey: 'readingRoom', href: '/ai-studio', icon: Library, descKey: 'descriptions.readingRoom', group: 'tools', defaultVisible: true, required: false },
  learning: { id: 'learning', nameKey: 'learning', href: '/dashboard/learning', icon: GraduationCap, descKey: 'descriptions.learning', group: 'tools', defaultVisible: true, required: false, defaultLocked: true },
  learningManagement: { id: 'learningManagement', nameKey: 'learningManagement', href: '/dashboard/learning/management', icon: Layers3, descKey: 'descriptions.learningManagement', group: 'tools', defaultVisible: true, required: false, defaultLocked: true },
  learningStudy: { id: 'learningStudy', nameKey: 'learningStudy', href: '/dashboard/learning/study', icon: Brain, descKey: 'descriptions.learningStudy', group: 'tools', defaultVisible: true, required: false, defaultLocked: true },
  quranRevision: { id: 'quranRevision', nameKey: 'quranRevision', href: '/dashboard/quran-revision', icon: BookMarked, descKey: 'descriptions.quranRevision', group: 'tools', defaultVisible: true, required: false },
  webTranslator: { id: 'webTranslator', nameKey: 'webTranslator', href: '/dashboard/web-translator', icon: Languages, descKey: 'descriptions.webTranslator', group: 'tools', defaultVisible: true, required: false, defaultLocked: true },
  siteInspector: { id: 'siteInspector', nameKey: 'siteInspector', href: '/dashboard/site-inspector', icon: ScanSearch, descKey: 'descriptions.siteInspector', group: 'tools', defaultVisible: true, required: false, defaultLocked: true },
  phoneCheck: { id: 'phoneCheck', nameKey: 'phoneCheck', href: '/dashboard/phone-check', icon: ShieldAlert, descKey: 'descriptions.phoneCheck', group: 'outreach', defaultVisible: true, required: false, defaultLocked: true },
  fitnessLeads: { id: 'fitnessLeads', nameKey: 'fitnessLeads', href: '/dashboard/fitness-leads', icon: Radar, descKey: 'descriptions.fitnessLeads', group: 'outreach', defaultVisible: true, required: false, defaultLocked: true },
  metaWhatsApp: { id: 'metaWhatsApp', nameKey: 'metaWhatsApp', href: '/dashboard/meta-whatsapp', icon: MessageCircle, descKey: 'descriptions.metaWhatsApp', group: 'outreach', defaultVisible: true, required: false, defaultLocked: true },
  facebookEngagement: { id: 'facebookEngagement', nameKey: 'facebookEngagement', href: '/dashboard/facebook-engagement', icon: FaFacebook, descKey: 'descriptions.facebookEngagement', group: 'outreach', defaultVisible: true, required: false, defaultLocked: true },
  notifications: { id: 'notifications', nameKey: 'notifications', href: '/dashboard/notifications', icon: Bell, descKey: 'descriptions.notifications', group: 'workspace', defaultVisible: true, required: false },
  billing: { id: 'billing', nameKey: 'billing', href: '/dashboard/billing', icon: CreditCard, descKey: 'descriptions.billing', group: 'finance', defaultVisible: true, required: false },
  money: { id: 'money', nameKey: 'money', href: '/money', icon: Wallet, descKey: 'descriptions.money', group: 'finance', defaultVisible: true, required: false, defaultLocked: true },
  profile_admin: { id: 'profile_admin', nameKey: 'profile', href: '/dashboard/my-account', icon: UserIcon, descKey: 'descriptions.profile_admin', group: 'account', defaultVisible: true, required: true },
  branding: { id: 'branding', nameKey: 'branding', href: '/dashboard/settings/branding', icon: Paintbrush, descKey: 'descriptions.branding', group: 'management', defaultVisible: true, required: false },
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
      { ...ITEM_META.facebookEngagement },
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
      { ...ITEM_META.readingRoom },
      { ...ITEM_META.learning, expand: false, children: [{ ...ITEM_META.learningManagement }, { ...ITEM_META.learningStudy }] },
      { ...ITEM_META.quranRevision },
      { ...ITEM_META.webTranslator },
      { ...ITEM_META.siteInspector },
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
    items: [{ ...ITEM_META.myWorkouts }, { ...ITEM_META.bodyMeasurement }, { ...ITEM_META.myNutrition }, { ...ITEM_META.recipes }, { ...ITEM_META.weeklyStrength }, { ...ITEM_META.myReminders }],
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
      { ...ITEM_META.readingRoom },
      { ...ITEM_META.learning, expand: false, children: [{ ...ITEM_META.learningManagement }, { ...ITEM_META.learningStudy }] },
      { ...ITEM_META.quranRevision },
      { ...ITEM_META.webTranslator },
      { ...ITEM_META.siteInspector },
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
      { ...ITEM_META.facebookEngagement },
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
      { ...ITEM_META.readingRoom },
      { ...ITEM_META.learning, expand: false, children: [{ ...ITEM_META.learningManagement }, { ...ITEM_META.learningStudy }] },
      { ...ITEM_META.quranRevision },
      { ...ITEM_META.webTranslator },
      { ...ITEM_META.siteInspector },
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
    items: [{ ...ITEM_META.allUsers_super }, { ...ITEM_META.pageAccess_super }, { ...ITEM_META.documentEditor_super }, { ...ITEM_META.allExercises }, { ...ITEM_META.feedback_super }, { ...ITEM_META.forms_super }],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.outreach',
    items: [
      { ...ITEM_META.whatsapp },
      { ...ITEM_META.metaWhatsApp },
      { ...ITEM_META.facebookEngagement },
      { ...ITEM_META.phoneCheck },
      { ...ITEM_META.fitnessLeads },
    ],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.workspace',
    items: [
      { ...ITEM_META.todos },
      { ...ITEM_META.calendar },
      { ...ITEM_META.transcript },
      { ...ITEM_META.aiFree },
      { ...ITEM_META.readingRoom },
      { ...ITEM_META.learning, expand: false, children: [{ ...ITEM_META.learningManagement }, { ...ITEM_META.learningStudy }] },
      { ...ITEM_META.quranRevision },
      { ...ITEM_META.webTranslator },
      { ...ITEM_META.siteInspector },
    ],
  },
  {
    role: 'super_admin',
    sectionKey: 'sections.finance',
    items: [{ ...ITEM_META.billing }, { ...ITEM_META.money }],
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
        sectionKey: section.sectionKey,
        descKey: item.descKey || null,
        required: !!item.required,
        defaultLocked: !!item.defaultLocked,
        parentId: null,
      });
      for (const child of item.children || []) {
        out.push({
          id: child.id,
          nameKey: child.nameKey,
          href: child.href,
          icon: child.icon || null,
          group: child.group || item.group || section.sectionKey,
          sectionKey: section.sectionKey,
          descKey: child.descKey || null,
          required: !!child.required,
          defaultLocked: !!child.defaultLocked,
          parentId: item.id,
        });
      }
    }
  }
  return out;
}

/** Every real page in the product, with the roles that include it in the built-in menu. */
export function getAllNavPages() {
  const roles = ['super_admin', 'admin', 'coach', 'client'];
  const byId = new Map();
  for (const role of roles) {
    for (const page of getNavPagesForRole(role)) {
      if (!page.href) continue;
      const current = byId.get(page.id);
      if (!current) {
        byId.set(page.id, { ...page, builtInRoles: [role] });
      } else if (!current.builtInRoles.includes(role)) {
        current.builtInRoles.push(role);
      }
    }
  }
  return [...byId.values()];
}

function withGrantedPages(role, sections, pageAccess) {
  const present = new Set();
  for (const section of sections) {
    for (const item of section.items || []) {
      present.add(item.id);
      for (const child of item.children || []) present.add(child.id);
    }
  }
  const want = new Set([
    ...Object.entries(pageAccess?.roleModes || {}).filter(([, mode]) => mode === 'default').map(([id]) => id),
    ...(pageAccess?.extraPages || []),
  ]);
  const extras = [];
  for (const id of want) {
    if (present.has(id) || !ITEM_META[id]?.href) continue;
    extras.push({ ...ITEM_META[id] });
  }
  if (!extras.length) return sections;
  return [...sections, { role, sectionKey: 'sections.granted', items: extras }];
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

/** Badge polling: paused on hidden tabs; focus/change events are debounced + single-flight. */
function useVisibleBadgePoll(load, pollMs, changeEvent) {
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const poller = createVisiblePoller({
      load: () => loadRef.current(),
      intervalMs: pollMs,
      debounceMs: 1000,
    });
    poller.start();
    const onChanged = () => poller.request();
    window.addEventListener('focus', onChanged);
    if (changeEvent) window.addEventListener(changeEvent, onChanged);
    return () => {
      poller.stop();
      window.removeEventListener('focus', onChanged);
      if (changeEvent) window.removeEventListener(changeEvent, onChanged);
    };
  }, [pollMs, changeEvent]);
}

export function useUnreadNotifications(pollMs = 120000) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setCount(Number(res?.data?.count || 0));
    } catch {}
  }, []);
  useVisibleBadgePoll(load, pollMs);
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
  useVisibleBadgePoll(load, pollMs, WHATSAPP_UNREAD_EVENT);
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
  useVisibleBadgePoll(load, pollMs, META_WHATSAPP_UNREAD_EVENT);
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
      role='tooltip'
      className={`sb-tip${isRTL ? ' is-rtl' : ''}`}
      initial={{ opacity: 0, x: isRTL ? 4 : -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 4 : -4 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      {label}
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
      let top = rect.top - 6;
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
  const xFrom = isRTL ? 6 : -6;
  return createPortal(
    <motion.div
      ref={flyRef}
      role='menu'
      className='sb-fly'
      initial={{ opacity: 0, x: xFrom, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: xFrom, scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      {children}
    </motion.div>,
    document.body,
  );
}

/* ─── ScrollShadow ───────────────────────────────────────────── */
/** Fades the nav edges with a mask so it works on any sidebar surface (light, dark, reading themes). */
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
        className={`sidebar-scroll-viewport sb-fade${atTop ? '' : ' has-top'}${atBottom ? '' : ' has-bottom'}`}
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
    </div>
  );
}

/* ─── SectionLabel ───────────────────────────────────────────── */
function SectionLabel({ label }) {
  return (
    <div className='sb-section' role='presentation'>
      <span className='sb-section__text'>{label}</span>
      <span className='sb-section__rule' aria-hidden />
    </div>
  );
}

/* ─── NavItem ────────────────────────────────────────────────── */
function NavBadge({ value, small }) {
  if (!(value > 0)) return null;
  return (
    <span className={small ? 'sb-tile__badge' : 'sb-row__badge'}>
      <Badge value={value} small={small} />
    </span>
  );
}

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
  const childLabel = child => (typeof getLabel === 'function' ? getLabel(child, t) : t(`items.${child.nameKey}`));
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const liRef = useRef(null);
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
    const active = hasChildren ? anyChildActive(pathname, item.children, searchParams) : isPathActive(pathname, href || '', searchParams);
    const tileClass = `sb-tile${active ? ' is-active' : ''}`;
    const tileBody = (
      <>
        <Icon className='sb-tile__icon' strokeWidth={active ? 2.2 : 1.9} aria-hidden />
        <NavBadge value={itemBadge} small />
      </>
    );
    return (
      <div
        ref={liRef}
        className='sb-tile-cell'
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}>
        {href ? (
          <Link href={href} onClick={onNavigate} className={tileClass} aria-label={label} aria-current={active ? 'page' : undefined}>
            {tileBody}
          </Link>
        ) : (
          <button type='button' className={tileClass} aria-label={label} aria-haspopup='menu'>
            {tileBody}
          </button>
        )}
        <AnimatePresence>{hover && !hasChildren && <CollapsedTooltip label={label} anchorRef={liRef} />}</AnimatePresence>
        <AnimatePresence>
          {hover && hasChildren && (
            <PortalFlyout anchorRef={liRef}>
              <p className='sb-fly__title'>{label}</p>
              <div className='sb-fly__list'>
                {item.children.map(child => {
                  const ChildIcon = child.icon || LayoutDashboard;
                  const childActive = isPathActive(pathname, child.href, searchParams);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      role='menuitem'
                      className={`sb-fly__item${childActive ? ' is-active' : ''}`}
                      aria-current={childActive ? 'page' : undefined}>
                      <span className='sb-fly__chip' aria-hidden>
                        <ChildIcon strokeWidth={childActive ? 2.3 : 2} />
                      </span>
                      <span className='sb-fly__label'>{childLabel(child)}</span>
                    </Link>
                  );
                })}
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
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`sb-row${active ? ' is-active' : ''}${depth > 0 ? ' is-sub' : ''}`}
        aria-current={active ? 'page' : undefined}>
        {active && <motion.span layoutId='active-rail' transition={snap} className='sb-row__rail' aria-hidden />}
        <span className='sb-row__chip' aria-hidden>
          <Icon strokeWidth={active ? 2.2 : 1.9} />
        </span>
        <span className='sb-row__label'>{label}</span>
        <NavBadge value={itemBadge} />
      </Link>
    );
  }

  /* ── Group item ── */
  const groupActive = anyChildActive(pathname, item.children, searchParams);
  return (
    <div className='sb-group'>
      <button
        type='button'
        onClick={() => setOpen(v => !v)}
        className={`sb-row is-group${open ? ' is-open' : ''}${groupActive ? ' has-active' : ''}`}
        aria-expanded={open}>
        <span className='sb-row__chip' aria-hidden>
          <Icon strokeWidth={1.9} />
        </span>
        <span className='sb-row__label'>{label}</span>
        {!open && groupActive && <span className='sb-row__dot' aria-hidden />}
        <ChevronRight className='sb-row__chev rtl:scale-x-[-1]' strokeWidth={2.4} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key='sub' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={gentle} style={{ overflow: 'hidden' }}>
            <ul className='sb-sub'>
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
  P,
  first = false,
  getLabel,
}) {
  const t_nav = useTranslations('nav');
  const label = t_nav(sectionKey, { defaultValue: '' });

  if (!items?.length) return null;
  return (
    <div className={`sb-nav-section${collapsed ? ' is-collapsed' : ''}${first ? ' is-first' : ''}`}>
      {!collapsed && label && !first && <SectionLabel label={label} />}
      {collapsed && !first && <span className='sb-section-tick' aria-hidden />}
      {items.map(item => (
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
  return (
    <span className={`sb-avatar is-${size}`}>
      <span className='sb-avatar__face'>{text}</span>
      <span className={`sb-avatar__status${isActive ? ' is-on' : ''}`} aria-hidden />
    </span>
  );
}

/* ─── SidebarHeader ──────────────────────────────────────────── */
function HeaderControls({ collapsed, onToggleCollapse, onHide, copy }) {
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const collapseLabel = collapsed ? copy.expand : copy.collapse;
  return (
    <div className={`sb-head__controls${collapsed ? ' is-stacked' : ''}`}>
      <button type='button' className='sb-head__btn' onClick={onToggleCollapse} aria-label={collapseLabel} data-tip={collapseLabel}>
        <CollapseIcon className='rtl:scale-x-[-1]' strokeWidth={2} aria-hidden />
      </button>
      {!collapsed && (
        <button type='button' className='sb-head__btn' onClick={onHide} aria-label={copy.hide} data-tip={copy.hide}>
          <Maximize2 strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}

function SidebarHeader({ user, collapsed, controls }) {
  const t_r = useTranslations('');
  return (
    <div className={`sb-head${collapsed ? ' is-collapsed' : ''}`}>
      <Avatar user={user} size={collapsed ? 'sm' : 'md'} />
      {!collapsed && (
        <div className='sb-head__text'>
          <MultiLangText className='sb-head__name'>{user?.name}</MultiLangText>
          {user?.role ? <p className='sb-head__role'>{t_r(`myProfile.roles.${user.role}`)}</p> : null}
        </div>
      )}
      {controls ? <HeaderControls collapsed={collapsed} {...controls} /> : null}
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

/* ─── SidebarModeToggle (light / dark) ───────────────────────── */
function SidebarModeToggle({ collapsed, P }) {
  const { mode, setMode } = useTheme();
  const tTheme = useTranslations('themeSwitcher');
  const isDark = mode === 'dark';
  const next = isDark ? 'light' : 'dark';
  const label = isDark ? (tTheme('mode.light') || 'Light') : (tTheme('mode.dark') || 'Dark');
  const tip = isDark ? (tTheme('mode.switchToLight') || 'Switch to light mode') : (tTheme('mode.switchToDark') || 'Switch to dark mode');
  const btnBase = {
    border: `1px solid ${P?.border || 'rgba(0,0,0,0.07)'}`,
    background: P?.bgCard || '#ffffff',
    boxShadow: P?.shadow?.sm || '0 1px 3px rgba(0,0,0,0.06)',
  };

  return (
    <motion.button
      type='button'
      onClick={() => setMode(next)}
      whileHover={{ scale: collapsed ? 1.06 : 1.005, y: -1 }}
      whileTap={{ scale: collapsed ? 0.95 : 0.995 }}
      title={tip}
      aria-label={tip}
      aria-pressed={isDark}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        transition: 'all .18s',
        ...(collapsed
          ? { width: 40, height: 40, borderRadius: 12, justifyContent: 'center' }
          : { width: '100%', height: 44, borderRadius: 12, padding: '0 10px' }),
        ...btnBase,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          display: 'grid',
          placeContent: 'center',
          width: collapsed ? 'auto' : 26,
          height: collapsed ? 'auto' : 26,
          borderRadius: 8,
          background: isDark
            ? 'color-mix(in srgb, #818cf8 22%, transparent)'
            : 'color-mix(in srgb, var(--color-primary-500) 12%, transparent)',
          color: isDark ? '#a5b4fc' : 'var(--color-primary-600)',
        }}
      >
        {isDark
          ? <Moon style={{ width: collapsed ? 15 : 13, height: collapsed ? 15 : 13 }} strokeWidth={2.2} />
          : <Sun style={{ width: collapsed ? 15 : 13, height: collapsed ? 15 : 13 }} strokeWidth={2.2} />}
      </span>
      {!collapsed && (
        <>
          <span className='rtl:text-right ltr:text-left' style={{ fontSize: 12.5, fontWeight: 650, flex: 1, letterSpacing: '-0.005em', color: P?.text || '#334155' }}>
            {label}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: P?.textXLight || '#94a3b8',
            }}
          >
            {isDark ? 'DARK' : 'LIGHT'}
          </span>
        </>
      )}
    </motion.button>
  );
}

/* ─── SidebarThemeSwitcher ───────────────────────────────────── */
function SidebarThemeSwitcher({ collapsed, P }) {
  const { theme: currentTheme, setTheme, mode, setMode } = useTheme();
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
      const panelW = Math.min(THEME_PANEL_W, vw - pad * 2);
      const approxH = Math.min(540, vh * 0.78);

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
            mode={mode}
            onMode={setMode}
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
const THEME_PANEL_W = 344;

function paletteVars(palette) {
  return {
    '--tp-50': palette.primary[50],
    '--tp-100': palette.primary[100],
    '--tp-200': palette.primary[200],
    '--tp-300': palette.primary[300],
    '--tp-400': palette.primary[400],
    '--tp-500': palette.primary[500],
    '--tp-600': palette.primary[600],
    '--tp-700': palette.primary[700],
    '--tp-s400': palette.secondary[400],
    '--tp-s500': palette.secondary[500],
    '--tp-from': palette.gradient.from,
    '--tp-to': palette.gradient.to,
  };
}

/** Miniature dashboard drawn in the palette's own colours so each option previews the real result. */
function ThemePreview() {
  return (
    <span className='tp-preview' aria-hidden>
      <span className='tp-preview__rail'>
        <span className='tp-preview__logo' />
        <span className='tp-preview__nav is-on' />
        <span className='tp-preview__nav' />
        <span className='tp-preview__nav' />
      </span>
      <span className='tp-preview__main'>
        <span className='tp-preview__top'>
          <span className='tp-preview__title' />
          <span className='tp-preview__cta' />
        </span>
        <span className='tp-preview__card'>
          <span className='tp-preview__bars'>
            <span style={{ height: '45%' }} />
            <span style={{ height: '70%' }} />
            <span style={{ height: '55%' }} />
            <span style={{ height: '90%' }} />
            <span style={{ height: '62%' }} />
          </span>
          <span className='tp-preview__ring' />
        </span>
      </span>
    </span>
  );
}

const ThemePanel = React.forwardRef(function ThemePanel({ themeEntries, currentTheme, currentPalette, mode, onMode, onSelect, pos, tTheme }, ref) {
  const isDark = mode === 'dark';
  const reduceMotion = useReducedMotion();
  const paletteName = (key, palette) => (tTheme?.has?.(`palettes.${key}`) ? tTheme(`palettes.${key}`) : palette.name);

  const onGridKeyDown = e => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 };
    if (!(e.key in keys)) return;
    const cards = [...e.currentTarget.querySelectorAll('[role="radio"]')];
    const at = cards.indexOf(document.activeElement);
    if (at < 0) return;
    e.preventDefault();
    const rtlFlip = getDir() === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? -1 : 1;
    const next = Math.min(cards.length - 1, Math.max(0, at + keys[e.key] * rtlFlip));
    cards[next]?.focus();
  };

  return (
    <motion.div
      ref={ref}
      role='dialog'
      aria-label={tTheme?.('title') || 'Choose Theme'}
      className={`tp${isDark ? ' is-dark' : ''}`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        left: pos?.left ?? 8,
        bottom: pos?.bottom ?? 16,
        width: pos?.width ?? THEME_PANEL_W,
        maxHeight: pos?.maxHeight,
      }}>
      <div className='tp-head'>
        <div className='tp-head__text'>
          <p className='tp-head__title'>{tTheme?.('title') || 'Choose Theme'}</p>
          <p className='tp-head__sub'>{tTheme?.('subtitle')}</p>
        </div>
        {currentPalette && (
          <span className='tp-current' style={paletteVars(currentPalette)}>
            <span className='tp-current__dot' aria-hidden />
            {paletteName(currentTheme, currentPalette)}
          </span>
        )}
      </div>

      <div className='tp-mode' role='radiogroup' aria-label={tTheme?.('mode.label') || 'Appearance'}>
        {[
          { id: 'light', Icon: Sun, label: tTheme?.('mode.light') || 'Light' },
          { id: 'dark', Icon: Moon, label: tTheme?.('mode.dark') || 'Dark' },
        ].map(({ id, Icon, label }) => {
          const on = mode === id;
          return (
            <button key={id} type='button' role='radio' aria-checked={on} className={`tp-mode__btn${on ? ' is-on' : ''}`} onClick={() => onMode?.(id)}>
              {on && <motion.span layoutId='tp-mode-pill' className='tp-mode__pill' transition={snap} />}
              <Icon className='tp-mode__icon' strokeWidth={2.1} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      <div className='tp-scroll'>
        <div className='tp-grid' role='radiogroup' aria-label={tTheme?.('ariaLabel') || 'Theme color picker'} onKeyDown={onGridKeyDown}>
          {themeEntries.map(([key, palette], idx) => {
            const isActive = currentTheme === key;
            return (
              <motion.button
                key={key}
                type='button'
                role='radio'
                aria-checked={isActive}
                tabIndex={isActive || (!currentPalette && idx === 0) ? 0 : -1}
                className={`tp-card${isActive ? ' is-active' : ''}`}
                style={paletteVars(palette)}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.03 + idx * 0.025, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => onSelect(key)}>
                <ThemePreview />
                <span className='tp-card__meta'>
                  <span className='tp-card__name'>{paletteName(key, palette)}</span>
                  <span className='tp-card__swatches' aria-hidden>
                    <span style={{ background: palette.primary[500] }} />
                    <span style={{ background: palette.secondary[500] }} />
                    <span style={{ background: palette.primary[200] }} />
                  </span>
                </span>
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      className='tp-card__check'
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={snap}
                      aria-hidden>
                      <Check strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {tTheme?.('footer') ? <p className='tp-foot'>{tTheme('footer')}</p> : null}
    </motion.div>
  );
});

/* ─── SidebarFooter (control dock + popovers) ────────────────── */
const DOCK_COPY = {
  en: {
    language: 'Language',
    appearance: 'Appearance',
    theme: 'Theme',
    signOutQ: 'Sign out?',
    signOutDesc: "You'll need to sign in again to continue.",
    cancel: 'Cancel',
    arabicSub: 'Arabic · RTL',
    englishSub: 'English · LTR',
    light: 'Light',
    dark: 'Dark',
  },
  ar: {
    language: 'اللغة',
    appearance: 'المظهر',
    theme: 'الثيم',
    signOutQ: 'تسجيل الخروج؟',
    signOutDesc: 'هتحتاج تسجّل الدخول تاني عشان تكمل.',
    cancel: 'إلغاء',
    arabicSub: 'العربية · من اليمين',
    englishSub: 'English · من اليسار',
    light: 'فاتح',
    dark: 'داكن',
  },
};

const POP_W = 240;

function useDockPopover(open, triggerRef, collapsed, isRTL) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const place = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 10;
      const width = Math.min(POP_W, vw - pad * 2);
      if (collapsed) {
        let left = isRTL ? rect.left - width - 12 : rect.right + 12;
        left = Math.max(pad, Math.min(left, vw - width - pad));
        const bottom = Math.max(pad, vh - rect.bottom - 6);
        setPos({ left, bottom, width, side: true, caret: Math.max(14, vh - bottom - rect.top - rect.height / 2) });
        return;
      }
      const center = rect.left + rect.width / 2;
      let left = center - width / 2;
      left = Math.max(pad, Math.min(left, vw - width - pad));
      const bottom = vh - rect.top + 12;
      const caret = Math.max(16, Math.min(width - 16, center - left));
      setPos({ left, bottom, width, side: false, caret });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, triggerRef, collapsed, isRTL]);
  return pos;
}

function DockButton({ btnRef, active, danger, label, onClick, children }) {
  return (
    <button
      ref={btnRef}
      type='button'
      aria-label={label}
      aria-expanded={!!active}
      data-tip={active ? undefined : label}
      onClick={onClick}
      className={`sb-dock-btn${active ? ' is-active' : ''}${danger ? ' is-danger' : ''}`}
    >
      {children}
    </button>
  );
}

function DockPopover({ open, pos, menuRef, triggerRef, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onDown = e => {
      if (menuRef.current?.contains(e.target) || triggerRef?.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, menuRef, triggerRef, onClose]);

  if (!open || !pos || typeof window === 'undefined') return null;

  const caretStyle = pos.side
    ? { bottom: pos.caret - 6, [getDir() === 'rtl' ? 'right' : 'left']: -6 }
    : { left: pos.caret - 6, bottom: -6 };

  return createPortal(
    <motion.div
      ref={menuRef}
      role='dialog'
      aria-label={title}
      className={`sb-pop${pos.side ? ' is-side' : ''}`}
      initial={{ opacity: 0, y: pos.side ? 0 : 6, x: pos.side ? -4 : 0, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }}
      style={{
        left: pos.left,
        bottom: pos.bottom,
        width: pos.width,
        transformOrigin: pos.side ? 'left bottom' : `${pos.caret}px 100%`,
      }}
    >
      <span className='sb-pop-caret' style={caretStyle} aria-hidden />
      {title ? <div className='sb-pop-title'>{title}</div> : null}
      {children}
    </motion.div>,
    document.body,
  );
}

function PopOption({ active, onClick, lead, label, sub, busy }) {
  return (
    <button type='button' onClick={onClick} className={`sb-pop-opt${active ? ' is-active' : ''}`} aria-pressed={!!active}>
      <span className='sb-pop-lead'>{lead}</span>
      <span className='sb-pop-text'>
        <span className='sb-pop-label'>{label}</span>
        {sub ? <span className='sb-pop-sub'>{sub}</span> : null}
      </span>
      <span className='sb-pop-check' aria-hidden>
        {busy ? <span className='sb-pop-spin' /> : active ? <Check style={{ width: 14, height: 14 }} strokeWidth={2.6} /> : null}
      </span>
    </button>
  );
}

function SidebarFooter({ collapsed, onLogout, logoutLabel, P, mobileCompact = false }) {
  const locale = useLocale();
  const tTheme = useTranslations('themeSwitcher');
  const { mode, setMode, theme: currentTheme, setTheme } = useTheme();
  const router = useNextRouter();
  const pathname = useNextPathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const [pendingLocale, setPendingLocale] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);
  const langRef = useRef(null);
  const modeRef = useRef(null);
  const themeRef = useRef(null);
  const logoutRef = useRef(null);
  const menuRef = useRef(null);
  const themePanelRef = useRef(null);
  const isDark = mode === 'dark';
  const isRTL = getDir() === 'rtl';
  const copy = DOCK_COPY[String(locale).startsWith('ar') ? 'ar' : 'en'];
  const themeEntries = useMemo(() => Object.entries(COLOR_PALETTES), []);
  const currentPalette = COLOR_PALETTES[currentTheme];
  const vertical = collapsed && !mobileCompact;

  const dockTriggerRef = openPanel === 'mode' ? modeRef : openPanel === 'logout' ? logoutRef : langRef;
  const dockPos = useDockPopover(openPanel === 'lang' || openPanel === 'mode' || openPanel === 'logout', dockTriggerRef, vertical, isRTL);
  const [themePos, setThemePos] = useState(null);
  const close = useCallback(() => setOpenPanel(null), []);

  useLayoutEffect(() => {
    if (openPanel !== 'theme' || !themeRef.current) {
      setThemePos(null);
      return;
    }
    const place = () => {
      const rect = themeRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;
      const panelW = Math.min(THEME_PANEL_W, vw - pad * 2);
      const approxH = Math.min(540, vh * 0.78);
      let left = vertical ? (isRTL ? rect.left - panelW - 12 : rect.right + 12) : rect.left + rect.width / 2 - panelW / 2;
      left = Math.max(pad, Math.min(left, vw - panelW - pad));
      let bottom = vertical ? vh - rect.bottom : vh - rect.top + 12;
      if (bottom + approxH > vh - pad) bottom = Math.max(pad, vh - approxH - pad);
      setThemePos({ left, bottom, width: panelW, maxHeight: approxH });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [openPanel, vertical, isRTL]);

  useEffect(() => {
    if (openPanel !== 'theme') return;
    const onDown = e => {
      if (themePanelRef.current?.contains(e.target) || themeRef.current?.contains(e.target)) return;
      setOpenPanel(null);
    };
    const onKey = e => {
      if (e.key === 'Escape') setOpenPanel(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openPanel]);

  const switchLocale = nextLocale => {
    if (nextLocale === locale) {
      close();
      return;
    }
    setPendingLocale(nextLocale);
    start(() => {
      showGlobalLoader();
      setLocaleCookie(nextLocale);
      setDocumentLangDir(nextLocale);
      const base = swapLocaleInPath(pathname || '/', nextLocale);
      const qs = search?.toString();
      router.replace(qs ? `${base}?${qs}` : base);
      router.refresh();
      close();
    });
  };

  const toggle = id => setOpenPanel(v => (v === id ? null : id));
  const iconSize = 16;

  return (
    <div data-sidebar-footer className='sidebar-glass-footer sb-dock-wrap' style={{ flexShrink: 0, padding: vertical ? '10px 0 12px' : '10px 12px 12px' }}>
      <div className={`sb-dock${vertical ? ' is-vertical' : ''}`} role='toolbar' aria-label='Preferences'>
        <DockButton btnRef={langRef} active={openPanel === 'lang'} label={copy.language} onClick={() => toggle('lang')}>
          <Globe style={{ width: iconSize, height: iconSize }} strokeWidth={2} />
          {!vertical ? <span className='sb-dock-tag'>{String(locale).slice(0, 2).toUpperCase()}</span> : null}
        </DockButton>
        <DockButton btnRef={modeRef} active={openPanel === 'mode'} label={copy.appearance} onClick={() => toggle('mode')}>
          {isDark ? <Moon style={{ width: iconSize, height: iconSize }} strokeWidth={2} /> : <Sun style={{ width: iconSize, height: iconSize }} strokeWidth={2} />}
        </DockButton>
        <DockButton btnRef={themeRef} active={openPanel === 'theme'} label={copy.theme} onClick={() => toggle('theme')}>
          <span className='sb-dock-swatch' aria-hidden>
            <span style={{ background: currentPalette?.primary?.[500] || 'var(--color-primary-500)' }} />
            <span style={{ background: currentPalette?.secondary?.[500] || 'var(--color-secondary-500, var(--color-primary-300))' }} />
          </span>
        </DockButton>
        <span className='sb-dock-sep' aria-hidden />
        <DockButton btnRef={logoutRef} active={openPanel === 'logout'} danger label={logoutLabel} onClick={() => toggle('logout')}>
          <LogOut style={{ width: iconSize, height: iconSize, transform: isRTL ? 'scaleX(-1)' : 'none' }} strokeWidth={2} />
        </DockButton>
      </div>

      <DockPopover open={openPanel === 'lang'} pos={dockPos} menuRef={menuRef} triggerRef={langRef} onClose={close} title={copy.language}>
        <PopOption
          active={locale === 'ar'}
          busy={pending && pendingLocale === 'ar'}
          onClick={() => switchLocale('ar')}
          lead={<span className='sb-pop-code'>AR</span>}
          label='العربية'
          sub={copy.arabicSub}
        />
        <PopOption
          active={locale === 'en'}
          busy={pending && pendingLocale === 'en'}
          onClick={() => switchLocale('en')}
          lead={<span className='sb-pop-code'>EN</span>}
          label='English'
          sub={copy.englishSub}
        />
      </DockPopover>

      <DockPopover open={openPanel === 'mode'} pos={dockPos} menuRef={menuRef} triggerRef={modeRef} onClose={close} title={copy.appearance}>
        <div className='sb-mode-grid'>
          {[
            { id: 'light', label: tTheme('mode.light') || copy.light, Icon: Sun },
            { id: 'dark', label: tTheme('mode.dark') || copy.dark, Icon: Moon },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type='button'
              aria-pressed={mode === id}
              className={`sb-mode-tile is-${id}${mode === id ? ' is-active' : ''}`}
              onClick={() => {
                setMode(id);
                close();
              }}
            >
              <span className='sb-mode-preview' aria-hidden>
                <span className='sb-mode-bar' />
                <span className='sb-mode-line' />
                <span className='sb-mode-line is-short' />
              </span>
              <span className='sb-mode-label'>
                <Icon style={{ width: 13, height: 13 }} strokeWidth={2.2} />
                {label}
                {mode === id ? <Check className='sb-mode-check' style={{ width: 13, height: 13 }} strokeWidth={2.6} /> : null}
              </span>
            </button>
          ))}
        </div>
      </DockPopover>

      <DockPopover open={openPanel === 'logout'} pos={dockPos} menuRef={menuRef} triggerRef={logoutRef} onClose={close}>
        <div className='sb-confirm'>
          <span className='sb-confirm-icon' aria-hidden>
            <LogOut style={{ width: 16, height: 16, transform: isRTL ? 'scaleX(-1)' : 'none' }} strokeWidth={2.2} />
          </span>
          <div className='sb-confirm-title'>{copy.signOutQ}</div>
          <p className='sb-confirm-desc'>{copy.signOutDesc}</p>
          <div className='sb-confirm-actions'>
            <button type='button' className='sb-btn-ghost' onClick={close} autoFocus>
              {copy.cancel}
            </button>
            <button
              type='button'
              className='sb-btn-danger'
              onClick={() => {
                close();
                onLogout?.();
              }}
            >
              {logoutLabel}
            </button>
          </div>
        </div>
      </DockPopover>

      {openPanel === 'theme' &&
        themePos &&
        typeof window !== 'undefined' &&
        createPortal(
          <ThemePanel
            ref={themePanelRef}
            themeEntries={themeEntries}
            currentTheme={currentTheme}
            currentPalette={currentPalette}
            mode={mode}
            onMode={setMode}
            onSelect={key => {
              setTheme(key);
              setTimeout(close, 220);
            }}
            pos={themePos}
            xFrom={isRTL ? 8 : -8}
            tTheme={tTheme}
          />,
          document.body,
        )}
    </div>
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

  const { getLabel } = useCustomLabels();
  const { palette: basePalette } = useSidebarPalette();
  const readingChrome = useAiReadingChrome();
  const P = useMemo(() => {
    if (!readingChrome?.theme) return basePalette;
    return {
      ...basePalette,
      ...readingThemeToSidebarPalette(readingChrome.theme, readingChrome.themeId),
    };
  }, [basePalette, readingChrome]);
  const locale = useLocale();
  const isRTL = getDir() === 'rtl';

  const allowedPages = user?.allowedPages;
  const pageAccess = user?.pageAccess;
  const sections = useMemo(() => {
    if (!role) return null;
    const base = withGrantedPages(role, NAV.filter(s => s.role === role), pageAccess);
    return applyPageAccessToSections(base, { role, allowedPages, pageAccess });
  }, [role, allowedPages, pageAccess]);

  const onNavigate = () => setOpen && setOpen(false);
  const logoutLabel = t_header('actions.signOut');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await clearClientSession();
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
  const edgeCopy = EDGE_COPY[locale?.startsWith('ar') ? 'ar' : 'en'];
  const headerControls = hideEdgeDock
    ? null
    : {
        copy: edgeCopy,
        onToggleCollapse: () => setCollapsed(v => !v),
        onHide: () => setFocusMode(true),
      };
  const DesktopSidebar = (
    <>
      {!hideEdgeDock && focusMode ? (
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
      className={`sidebar-shell sidebar-glass hidden lg:flex flex-col shrink-0 ${focusMode ? '' : 'ltr:ml-[var(--app-gutter)] rtl:mr-[var(--app-gutter)]'}`}
      style={{
        width: focusMode ? 0 : collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
        height: 'calc(100vh - var(--app-gutter) * 2)',
        marginTop: focusMode ? 0 : 'var(--app-gutter)',
        marginBottom: focusMode ? 0 : 'var(--app-gutter)',
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
        <SidebarHeader user={user} collapsed={collapsed} controls={headerControls} />

        <LayoutGroup id='sidebar-desktop'>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ScrollShadow P={P}>
              <nav style={{ padding: collapsed ? '4px 10px' : '4px 10px 10px', display: 'flex', flexDirection: 'column' }}>
                {sections?.map((section, idx) => (
                  <NavSection key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} collapsed={collapsed} t={t} totalUnread={totalUnread} unreadNotifications={unreadNotifications} unreadWhatsApp={unreadWhatsApp} unreadMetaWhatsApp={unreadMetaWhatsApp} P={P} first={idx === 0} getLabel={getLabel} />
                ))}
              </nav>
            </ScrollShadow>
          </div>
        </LayoutGroup>

        <SidebarFooter collapsed={collapsed} onLogout={handleLogout} logoutLabel={logoutLabel} P={P} />
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
                      <NavSection key={section.sectionKey || section.items[0]?.nameKey} sectionKey={section.sectionKey} items={section.items} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} t={t} totalUnread={totalUnread} unreadNotifications={unreadNotifications} unreadWhatsApp={unreadWhatsApp} unreadMetaWhatsApp={unreadMetaWhatsApp} P={P} first={idx === 0} getLabel={getLabel} />
                    ))}
                  </nav>
                </ScrollShadow>
              </div>
            </LayoutGroup>

            <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <SidebarFooter collapsed={collapsed} onLogout={handleLogout} logoutLabel={logoutLabel} P={P} mobileCompact />
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
