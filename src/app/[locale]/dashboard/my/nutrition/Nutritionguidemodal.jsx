'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, Droplets, Wheat, Leaf, Apple, Beef,
  Zap, Info, Scale, ChevronDown, Sparkles,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

/* ─────────────────────────────────────────────────────────────
   SECTION CONFIG
   Each food group keeps its own identity color for readability,
   but the header, nav active states, and accents all use the
   app's --color-primary / --color-secondary CSS variables.
───────────────────────────────────────────────────────────────*/
const SECTIONS = [
  {
    key: 'measurements',
    emoji: '⚖️',
    gradient: 'from-violet-500 to-indigo-600',
    accent: '#7c3aed',
    accentLight: '#ede9fe',
    border: 'border-violet-200',
    text: 'text-violet-700',
    gradientLight: 'from-violet-50 to-indigo-50',
  },
  {
    key: 'dairy',
    emoji: '🥛',
    gradient: 'from-sky-400 to-cyan-600',
    accent: '#0284c7',
    accentLight: '#e0f2fe',
    border: 'border-sky-200',
    text: 'text-sky-700',
    gradientLight: 'from-sky-50 to-cyan-50',
  },
  {
    key: 'grains',
    emoji: '🌾',
    gradient: 'from-amber-400 to-orange-500',
    accent: '#d97706',
    accentLight: '#fef3c7',
    border: 'border-amber-200',
    text: 'text-amber-700',
    gradientLight: 'from-amber-50 to-orange-50',
  },
  {
    key: 'vegetables',
    emoji: '🥦',
    gradient: 'from-emerald-400 to-teal-600',
    accent: '#059669',
    accentLight: '#d1fae5',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    gradientLight: 'from-emerald-50 to-teal-50',
  },
  {
    key: 'fruits',
    emoji: '🍎',
    gradient: 'from-rose-400 to-red-500',
    accent: '#e11d48',
    accentLight: '#ffe4e6',
    border: 'border-rose-200',
    text: 'text-rose-700',
    gradientLight: 'from-rose-50 to-pink-50',
  },
  {
    key: 'proteins',
    emoji: '🥩',
    gradient: 'from-red-500 to-orange-600',
    accent: '#dc2626',
    accentLight: '#fee2e2',
    border: 'border-red-200',
    text: 'text-red-700',
    gradientLight: 'from-red-50 to-orange-50',
  },
  {
    key: 'fats',
    emoji: '🥑',
    gradient: 'from-yellow-400 to-lime-500',
    accent: '#ca8a04',
    accentLight: '#fef9c3',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    gradientLight: 'from-yellow-50 to-lime-50',
  },
  {
    key: 'extras',
    emoji: '🍯',
    gradient: 'from-slate-500 to-stone-600',
    accent: '#475569',
    accentLight: '#f1f5f9',
    border: 'border-slate-200',
    text: 'text-slate-600',
    gradientLight: 'from-slate-50 to-zinc-50',
  },
];

/* ─────────────────────────────────────────────────────────────
   SECTION CARD
───────────────────────────────────────────────────────────────*/
function SectionCard({ section, data, isOpen, onToggle, index }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border ${section.border} overflow-hidden bg-white transition-all duration-300`}
      style={isOpen ? { boxShadow: `0 8px 30px ${section.accent}22` } : { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* ── Header button ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-1"
      >
        <div className={`flex items-center gap-3.5 p-4 transition-all duration-200 ${isOpen ? `bg-gradient-to-r ${section.gradientLight}` : 'hover:bg-slate-50/80'}`}>
          {/* Emoji icon */}
          <div
            className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center flex-shrink-0`}
            style={{ boxShadow: `0 4px 14px ${section.accent}40` }}
          >
            <span className="text-xl leading-none">{section.emoji}</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-black text-[13px] leading-tight ${isOpen ? section.text : 'text-slate-800'}`}>
              {data.title}
            </p>
            {data.subtitle && (
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-tight truncate">
                {data.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {data.badge && (
              <span
                className="hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black border"
                style={{
                  background: section.accentLight,
                  color: section.accent,
                  borderColor: section.accent + '40',
                }}
              >
                {data.badge}
              </span>
            )}
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.22 }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                isOpen
                  ? `bg-gradient-to-br ${section.gradient} text-white shadow-sm`
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
            </motion.div>
          </div>
        </div>

        {/* Accent bar at bottom of header when open */}
        {isOpen && (
          <div className={`h-0.5 bg-gradient-to-r ${section.gradient}`} />
        )}
      </button>

      {/* ── Body ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-3 space-y-4">

              {/* Note */}
              {data.note && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="flex gap-2.5 rounded-xl p-3.5"
                  style={{ background: section.accentLight }}
                >
                  <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: section.accent }} />
                  <p className="text-[12px] font-medium leading-relaxed" style={{ color: section.accent }}>
                    {data.note}
                  </p>
                </motion.div>
              )}

              {/* Calorie tiers */}
              {data.caloriesInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07 }}
                  className="grid grid-cols-3 gap-2"
                >
                  {data.caloriesInfo.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 text-center relative overflow-hidden border"
                      style={{
                        borderColor: section.accent + '30',
                        background: `linear-gradient(135deg, ${section.accentLight}, white)`,
                      }}
                    >
                      <div
                        className="absolute -top-3 -end-3 w-10 h-10 rounded-full opacity-10"
                        style={{ background: section.accent }}
                      />
                      <p className="text-[15px] font-black leading-none tabular-nums" style={{ color: section.accent }}>
                        {c.value}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-tight">{c.label}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Items grid */}
              {data.items && data.items.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.09 }}>
                  {data.itemsTitle && (
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="h-px flex-1"
                        style={{ background: `linear-gradient(to right, ${section.accent}40, transparent)` }}
                      />
                      <p
                        className="text-[9px] font-black uppercase tracking-[0.18em]"
                        style={{ color: section.accent }}
                      >
                        {data.itemsTitle}
                      </p>
                      <div
                        className="h-px flex-1"
                        style={{ background: `linear-gradient(to left, ${section.accent}40, transparent)` }}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {data.items.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 + i * 0.012 }}
                        className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 border cursor-default transition-all duration-150"
                        style={{ borderColor: section.accent + '25', background: 'white' }}
                        onMouseEnter={e => { e.currentTarget.style.background = section.accentLight; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                      >
                        <div
                          className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 text-sm leading-none"
                          style={{ background: section.accentLight }}
                        >
                          {section.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] font-black text-slate-800 leading-tight">{item.amount}</span>
                          {item.name && item.name !== '—' && item.name !== '— ' && (
                            <span className="text-[11px] text-slate-500 font-medium"> · {item.name}</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Protein sub-groups */}
              {data.subGroups && (
                <div className="space-y-3">
                  {data.subGroups.map((group, gi) => (
                    <motion.div
                      key={gi}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + gi * 0.06 }}
                      className="rounded-2xl border overflow-hidden"
                      style={{ borderColor: section.accent + '30' }}
                    >
                      <div
                        className="px-4 py-3 flex items-start justify-between gap-3"
                        style={{ background: `linear-gradient(135deg, ${section.accentLight}, white)` }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="h-2 w-2 rounded-full" style={{ background: section.accent }} />
                            <p
                              className="text-[12px] font-black uppercase tracking-wide"
                              style={{ color: section.accent }}
                            >
                              {group.title}
                            </p>
                          </div>
                          {group.note && (
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{group.note}</p>
                          )}
                        </div>
                        {group.badge && (
                          <span
                            className="flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black border whitespace-nowrap"
                            style={{
                              background: section.accentLight,
                              color: section.accent,
                              borderColor: section.accent + '40',
                            }}
                          >
                            {group.badge}
                          </span>
                        )}
                      </div>
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-white">
                        {group.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                              style={{ background: section.accent }}
                            />
                            {item}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Measurement table */}
              {data.table && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: section.accent + '30' }}
                >
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: `linear-gradient(135deg, ${section.accentLight}, white)` }}>
                        {data.table.headers.map((h, i) => (
                          <th
                            key={i}
                            className="px-4 py-3 text-start font-black text-[10px] uppercase tracking-[0.12em] border-b"
                            style={{ color: section.accent, borderColor: section.accent + '20' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.table.rows.map((row, i) => (
                        <tr
                          key={i}
                          style={{ background: i % 2 === 0 ? 'white' : section.accentLight + '66' }}
                        >
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className="px-4 py-2.5 font-semibold border-t text-slate-700"
                              style={{ borderColor: section.accent + '12', fontSize: '11px' }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TRIGGER BUTTON
   Matches the existing Notes button style exactly
───────────────────────────────────────────────────────────────*/
export function NutritionGuideButton({ onClick }) {
  const t = useTranslations('my-nutrition');
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.14] backdrop-blur-sm border border-white/20 text-white text-[10px] sm:text-xs font-bold transition-all hover:bg-white/[0.22]"
    >
      <BookOpen className=" max-sm:hidden h-3 w-3 sm:h-3.5 sm:w-3.5" />
      <span className=" ">{t('guide.buttonLabel')}</span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN MODAL
───────────────────────────────────────────────────────────────*/
export default function NutritionGuideModal({ open, onClose }) {
  const t = useTranslations('my-nutrition');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [openSection, setOpenSection] = useState('measurements');
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);

  const guide = t.raw('guide');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleKey]);

  const scrollToSection = useCallback((key) => {
    setOpenSection(key);
    setTimeout(() => {
      const el = scrollRef.current?.querySelector(`[data-section="${key}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[6px]"
            onClick={onClose}
          />

          {/* ── Sheet ── */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 370, damping: 44 }}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="fixed inset-x-0 bottom-0 top-[2%] z-[91] flex flex-col rounded-t-3xl overflow-hidden sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(700px,95vw)] sm:rounded-3xl sm:top-[2%] sm:bottom-[2%]"
            style={{
              background: '#f8fafc',
              boxShadow: '0 -40px 100px rgba(0,0,0,0.4)',
            }}
          >
            {/* Drag pill — mobile only */}
            <div className="sm:hidden flex justify-center pt-3 flex-shrink-0">
              <div className="h-1 w-12 rounded-full bg-slate-300" />
            </div>

            {/* ─────────────────────────────────────────
                HERO HEADER — uses app theme vars
            ───────────────────────────────────────── */}
            <div
              className="flex-shrink-0 relative overflow-hidden px-5 pt-4 pb-5"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 50%, var(--color-secondary-600) 100%)',
              }}
            >
              {/* Decorative blobs — use theme colors */}
              <div
                className="absolute -top-12 -start-12 w-52 h-52 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--color-primary-400), transparent)' }}
              />
              <div
                className="absolute -bottom-8 -end-8 w-40 h-40 rounded-full opacity-15 blur-2xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--color-secondary-400), transparent)' }}
              />
              <div
                className="absolute top-4 end-20 w-28 h-28 rounded-full opacity-10 blur-xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--color-primary-300), transparent)' }}
              />
              {/* Noise */}
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
              />
              {/* Top shimmer line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              {/* Decorative rings */}
              <div className="absolute -top-8 -end-8 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute -top-3 -end-3 w-20 h-20 rounded-full border border-white/[0.07] pointer-events-none" />

              {/* Title row */}
              <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 280, delay: 0.08 }}
                    className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/[0.16] backdrop-blur-[16px]"
                    style={{
                      boxShadow: '0 6px 24px -4px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
                    }}
                  >
                    <BookOpen className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <motion.h2
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.13 }}
                      className="text-[17px] font-black text-white leading-tight tracking-tight"
                    >
                      {guide?.title}
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.18 }}
                      className="text-[11px] mt-0.5 font-medium text-white/50"
                    >
                      {guide?.subtitle}
                    </motion.p>
                  </div>
                </div>

                {/* Close button */}
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  className="h-8 w-8 flex items-center justify-center rounded-xl flex-shrink-0 mt-0.5 bg-white/[0.14] text-white/65 hover:bg-white/[0.22] transition-colors"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Stats mini-grid — themed */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="relative z-10 grid grid-cols-4 gap-2"
              >
                {[
                  { emoji: '🗂️', label: isRTL ? 'مجموعات' : 'Groups', value: '8' },
                  { emoji: '🔄', label: isRTL ? 'قوائم تبادل' : 'Exchanges', value: isRTL ? 'كاملة' : 'Full' },
                  { emoji: '⚡', label: isRTL ? 'سعرات' : 'Calories', value: isRTL ? 'لكل حصة' : '/serving' },
                  { emoji: '📐', label: isRTL ? 'مقاييس' : 'Measures', value: isRTL ? 'مرجع' : 'Ref' },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 + i * 0.04 }}
                    className="rounded-xl py-2 px-1 text-center bg-white/[0.10]"
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    <div className="text-[16px] leading-none mb-1">{s.emoji}</div>
                    <div className="text-[11px] font-black text-white leading-none">{s.value}</div>
                    <div className="text-[8px] font-semibold mt-1 leading-tight text-white/40">{s.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* ─────────────────────────────────────────
                QUICK NAV — active pill uses theme primary
            ───────────────────────────────────────── */}
            <div
              className="flex-shrink-0 bg-white border-b border-slate-100"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            >
              <div className="overflow-x-auto px-4 py-2.5" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-1.5 min-w-max">
                  {SECTIONS.map((s) => {
                    const sData = guide?.sections?.[s.key];
                    const label = sData?.shortTitle || sData?.title || s.key;
                    const isActive = openSection === s.key;
                    return (
                      <motion.button
                        key={s.key}
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => scrollToSection(s.key)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all duration-200 border whitespace-nowrap focus-visible:outline-none"
                        style={
                          isActive
                            ? {
                                background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))',
                                color: 'white',
                                borderColor: 'transparent',
                                boxShadow: '0 3px 10px var(--color-primary-400, rgba(99,102,241,.4))',
                              }
                            : {
                                background: 'var(--color-primary-50)',
                                color: 'var(--color-primary-700)',
                                borderColor: 'var(--color-primary-200)',
                              }
                        }
                      >
                        <span className="text-sm leading-none">{s.emoji}</span>
                        <span>{label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────
                SCROLLABLE BODY
            ───────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2.5"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--color-primary-200) transparent',
                background: '#f1f5f9',
              }}
            >
              {SECTIONS.map((section, index) => {
                const sData = guide?.sections?.[section.key];
                if (!sData) return null;
                return (
                  <div key={section.key} data-section={section.key}>
                    <SectionCard
                      section={section}
                      data={sData}
                      isOpen={openSection === section.key}
                      onToggle={() =>
                        setOpenSection(openSection === section.key ? null : section.key)
                      }
                      index={index}
                    />
                  </div>
                );
              })}

              {/* Disclaimer — themed amber stays as-is, it's informational */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.38 }}
                className="rounded-2xl border border-amber-200 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}
              >
                <div className="flex gap-3 p-4">
                  <div className="h-8 w-8 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-200">
                    <Info className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-800 mb-1 uppercase tracking-widest">
                      {isRTL ? 'تنبيه مهم' : 'Important Note'}
                    </p>
                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                      {guide?.disclaimer}
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="h-6" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}