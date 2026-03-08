'use client';

import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import {
  TrendingUp, TrendingDown, Wallet, Bell, Plus, X, ChevronDown,
  Calendar, DollarSign, RefreshCw, Users, Shield, Heart,
  PiggyBank, BarChart3, CheckCircle2, Clock, AlertCircle, Layers,
  ArrowUpRight, ArrowDownRight, Receipt, Building2, Landmark,
  Briefcase, Info, Flame, Target, CreditCard, Lock,
  AlignLeft, CalendarDays, Banknote, Hash, SquarePlus,
  SlidersHorizontal, Check, ChevronLeft, ChevronRight, BookOpen,
  Eye, Star, Edit2, Trash2, Tag, FileText, Lightbulb, Link2,
  Repeat, ListChecks, Utensils, BookMarked, Sparkles, Settings,
  Volume2, VolumeX, Menu, Home, ListTodo, Zap, Trophy,
} from 'lucide-react';

/* ══════════════════════════════════════════════════
   CSS — mirrors CalendarPage hero/strip/mobile pattern
══════════════════════════════════════════════════ */
const MONEY_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  :root {
    --color-gradient-from: #4f46e5;
    --color-gradient-via:  #6366f1;
    --color-gradient-to:   #7c3aed;
    --color-primary-50:    #eef2ff;
    --color-primary-100:   #e0e7ff;
    --color-primary-200:   #c7d2fe;
    --color-primary-300:   #a5b4fc;
    --color-primary-400:   #818cf8;
    --color-primary-500:   #6366f1;
    --color-primary-600:   #4f46e5;
    --color-primary-700:   #4338ca;
    --cream: #f5f4f9;
    --paper: #fffdf9;
    --ink:   #17161f;
    --ink-mid: #56536e;
    --ink-lt:  #9b98b3;
    --border:  #e2e0eb;
    --green: #059669; --green-l: #d1fae5; --green-b: #a7f3d0;
    --red:   #dc2626; --red-l:   #fee2e2; --red-b:   #fecaca;
    --amber: #d97706; --amber-l: #fef3c7; --amber-b: #fde68a;
    --blue:  #2563eb; --blue-l:  #dbeafe; --blue-b:  #bfdbfe;
    --pink:  #db2777; --pink-l:  #fce7f3; --pink-b:  #fbcfe8;
    --m-bg:     color-mix(in srgb, var(--color-primary-50) 40%, #f6f6f6);
    --m-surface:#ffffff;
    --m-grad:   linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to));
    --m-ease:   cubic-bezier(.16,1,.3,1);
    --m-shadow: 0 1px 3px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.06);
    --m-accent-lt: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
    --m-accent-gl: color-mix(in srgb, var(--color-primary-500) 22%, transparent);
  }

  .mon-wrap { font-family: 'DM Sans', system-ui, sans-serif; color: var(--ink); }
  .mon-wrap * { box-sizing: border-box; }
  .mon-wrap ::-webkit-scrollbar { width: 4px; height: 4px; }
  .mon-wrap ::-webkit-scrollbar-thumb { background: var(--color-primary-200); border-radius: 4px; }
  .mono { font-family: 'IBM Plex Mono', monospace; }
  .serif { font-family: 'Instrument Serif', Georgia, serif; }

  /* ── Hero ── */
  .mon-hero { position:relative; overflow:hidden; background:var(--m-grad); padding:20px 20px 0; }
  .mon-hero::before { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,rgba(255,255,255,0) 60%,rgba(0,0,0,.06) 100%); pointer-events:none; }
  .mon-hero-noise { position:absolute; inset:0; opacity:.04; pointer-events:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .mon-hero-dots { position:absolute; inset:0; opacity:.055; pointer-events:none; background-image:radial-gradient(circle,rgba(255,255,255,.85) 1px,transparent 1px); background-size:28px 28px; }
  .mon-hero-orb1 { position:absolute; width:380px; height:380px; border-radius:50%; background:rgba(255,255,255,.09); filter:blur(60px); top:-150px; right:-80px; pointer-events:none; }
  .mon-hero-orb2 { position:absolute; width:260px; height:260px; border-radius:50%; background:rgba(255,255,255,.06); filter:blur(60px); bottom:-80px; left:-60px; pointer-events:none; }
  .mon-hero-hl { position:absolute; inset-x:0; top:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.5) 30%,rgba(255,255,255,.5) 70%,transparent); pointer-events:none; }

  /* ── Hero toprow ── */
  .mon-hero-toprow { position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
  .mon-hero-navbtn { width:32px; height:32px; border-radius:10px; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.2); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; backdrop-filter:blur(8px); }
  .mon-hero-navbtn:hover { background:rgba(255,255,255,.26); }
  .mon-hero-title { font-family:'Instrument Serif',Georgia,serif; font-size:20px; font-weight:400; color:#fff; letter-spacing:-.2px; line-height:1; text-shadow:0 1px 12px rgba(0,0,0,.12); }
  .mon-hero-sub { font-size:10px; color:rgba(255,255,255,.6); font-weight:500; margin-top:3px; }
  .mon-hero-btn-glass { height:34px; padding:0 14px; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.22); border-radius:10px; color:#fff; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; backdrop-filter:blur(12px); white-space:nowrap; }
  .mon-hero-btn-glass:hover { background:rgba(255,255,255,.26); }
  .mon-hero-btn-solid { height:34px; padding:0 14px; background:#fff; border:none; border-radius:10px; color:var(--color-primary-700); font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; box-shadow:0 4px 16px rgba(0,0,0,.12); white-space:nowrap; }
  .mon-hero-btn-solid:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,.16); }
  .mon-hero-icon-btn { width:34px; height:34px; border-radius:10px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.2); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; backdrop-filter:blur(8px); position:relative; }
  .mon-hero-icon-btn:hover { background:rgba(255,255,255,.24); }

  /* ── Stat strip ── */
  .mon-stat-strip { position:relative; z-index:10; display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding-bottom:14px; }
  .mon-stat-card { background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.2); border-radius:12px; padding:10px 12px; backdrop-filter:blur(12px); }
  .mon-stat-label { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.6); margin-bottom:4px; }
  .mon-stat-value { font-family:'IBM Plex Mono',monospace; font-size:15px; font-weight:700; color:#fff; letter-spacing:-.5px; line-height:1; }
  .mon-stat-change { font-size:9px; font-weight:600; color:rgba(255,255,255,.65); margin-top:3px; }

  /* ── Tab strip ── */
  .mon-tab-strip { position:relative; z-index:10; display:flex; align-items:center; gap:6px; padding-bottom:14px; overflow-x:auto; scrollbar-width:none; }
  .mon-tab-strip::-webkit-scrollbar { display:none; }
  .mon-tab-chip { display:flex; align-items:center; gap:5px; padding:6px 14px; border-radius:100px; border:1px solid rgba(255,255,255,.22); background:rgba(255,255,255,.12); color:rgba(255,255,255,.8); font-size:11px; font-weight:500; cursor:pointer; white-space:nowrap; transition:all .2s; backdrop-filter:blur(8px); }
  .mon-tab-chip:hover { background:rgba(255,255,255,.22); color:#fff; }
  .mon-tab-chip.active { background:rgba(255,255,255,.96); color:var(--color-primary-700); border-color:transparent; font-weight:700; box-shadow:0 4px 12px rgba(0,0,0,.12); }
  .mon-tab-count { font-size:9px; font-weight:700; opacity:.6; background:rgba(0,0,0,.12); padding:1px 5px; border-radius:100px; }
  .mon-tab-chip.active .mon-tab-count { background:var(--m-accent-lt); opacity:1; color:var(--color-primary-700); }

  /* ── Body ── */
  .mon-body { padding:16px 16px 32px; }

  /* ── Cards ── */
  .mon-card { background:#fff; border:1px solid var(--color-primary-100); border-radius:16px; padding:16px; }
  .mon-card-inner { background:var(--color-primary-50); border:1px solid var(--color-primary-100); border-radius:12px; padding:14px; }

  /* ── Progress ── */
  .mon-prog-wrap { width:100%; height:6px; background:var(--color-primary-50); border-radius:99px; overflow:hidden; }
  .mon-prog-bar { height:100%; border-radius:99px; transition:width .7s var(--m-ease); }

  /* ── Slide panel ── */
  .mon-panel-head { background:var(--m-grad); padding:20px 18px 18px; position:relative; overflow:hidden; }
  .mon-panel-head::before { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,.1) 0%,transparent 100%); pointer-events:none; }
  .mon-panel-head::after { content:''; position:absolute; top:-50px; right:-50px; width:150px; height:150px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.1) 0%,transparent 70%); pointer-events:none; }

  /* ── Input ── */
  .mon-input { width:100%; background:var(--color-primary-50); border:1.5px solid var(--color-primary-100); border-radius:12px; padding:10px 12px; color:var(--ink); font-family:'DM Sans',sans-serif; font-size:13px; outline:none; transition:border-color .2s,box-shadow .2s; }
  .mon-input:focus { border-color:var(--color-primary-400); box-shadow:0 0 0 3px var(--m-accent-lt); }
  .mon-input::placeholder { color:var(--ink-lt); }

  /* ── Zakat stars ── */
  @keyframes zStar { 0%,100%{transform:scale(1) rotate(0)} 50%{transform:scale(1.15) rotate(8deg)} }
  .z-star { animation: zStar 3s ease-in-out infinite; }
  .z-star-2 { animation: zStar 3s ease-in-out infinite .5s; }
  .z-star-3 { animation: zStar 3s ease-in-out infinite 1s; }

  /* ── Responsive ── */
  @media(max-width:640px){
    .mon-hero { padding:14px 14px 0; }
    .mon-stat-strip { grid-template-columns:repeat(2,1fr); }
    .mon-hero-title { font-size:17px; }
  }
  @media(max-width:400px){
    .mon-stat-value { font-size:13px; }
  }
`;

function MoneyStyles() {
  useEffect(() => {
    const id = 'money-ds-v1';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = MONEY_CSS;
      document.head.appendChild(el);
    }
  }, []);
  return null;
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const N = v => new Intl.NumberFormat('ar-EG').format(Math.round(v || 0));
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const today = new Date().toISOString().split('T')[0];

const getMonthKey = (dateStr) => {
  if (!dateStr) return null;
  const [y, m] = dateStr.split('-');
  return `${y}-${m}`;
};

const fmtD = d => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${parseInt(day,10)} ${MONTHS_AR[parseInt(m,10)-1]} ${y}`;
};

const monthLabel = mk => {
  if (!mk) return '';
  const [y, m] = mk.split('-');
  return `${MONTHS_AR[parseInt(m,10)-1]} ${y}`;
};

// Build month list from entries + HIST seed
const HIST_SEED = {
  '2024-01': { income: 18500, expenses: 6900 },
  '2024-02': { income: 19200, expenses: 7400 },
  '2024-03': { income: 22000, expenses: 7750 },
};

const INIT_INC = [
  { id: 1, source: 'شركة الأمل للتقنية', amount: 18000, date: '2024-03-01', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 1 },
  { id: 2, source: 'مشروع فريلانس', amount: 3000, date: '2024-03-10', recurring: false },
  { id: 3, source: 'مكافأة أداء', amount: 1000, date: '2024-03-15', recurring: false },
];
const INIT_EXP = [
  { id: 1, desc: 'سوبرماركت كارفور', amount: 2200, date: '2024-03-05', recurring: false },
  { id: 2, desc: 'أوبر — مواصلات', amount: 800, date: '2024-03-06', recurring: false },
  { id: 3, desc: 'فاتورة الكهرباء والنت', amount: 950, date: '2024-03-07', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 1 },
  { id: 4, desc: 'صيدلية — دواء', amount: 400, date: '2024-03-12', recurring: false },
  { id: 5, desc: 'سينما مع العيلة', amount: 600, date: '2024-03-14', recurring: false },
  { id: 6, desc: 'ملابس عرب مول', amount: 1800, date: '2024-03-18', recurring: false },
];
const INIT_COMMIT = [
  { id: 1, name: 'إيجار الشقة', amount: 3500, dueDate: '2024-04-01', status: 'paid', type: 'التزام', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 1 },
  { id: 2, name: 'Netflix', amount: 89, dueDate: '2024-04-05', status: 'pending', type: 'اشتراك', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 1 },
  { id: 3, name: 'انترنت منزلي', amount: 350, dueDate: '2024-04-01', status: 'paid', type: 'اشتراك', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 1 },
  { id: 4, name: 'قسط موبايل', amount: 450, dueDate: '2024-04-10', status: 'pending', type: 'التزام', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 3 },
  { id: 5, name: 'جمعية الشغل', amount: 2000, dueDate: '2024-04-01', status: 'paid', type: 'جمعية', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 1, jamiaStart: '2024-01', jamiaEnd: '2024-10', jamiaMyMonth: '2024-05' },
  { id: 6, name: 'Spotify', amount: 45, dueDate: '2024-04-08', status: 'pending', type: 'اشتراك', recurring: true, recurrenceType: 'monthly', recurrenceEvery: 1 },
];
const INIT_ZLOG = [
  { id: 1, amount: 200, desc: 'صدقة لمريض', date: '2024-03-05' },
  { id: 2, amount: 120, desc: 'إفطار صائم', date: '2024-03-15' },
  { id: 3, amount: 500, desc: 'زكاة المال', date: '2024-03-01' },
];
const NOTIFS = [
  { id: 1, text: 'Netflix بتتجدد بعد 3 أيام', type: 'warn', time: 'منذ ساعة' },
  { id: 2, text: 'تم استلام المرتب — 18,000 ج', type: 'ok', time: 'منذ يومين' },
  { id: 3, text: 'تجاوزت 80% ميزانية المشتريات', type: 'alert', time: 'منذ 3 أيام' },
];

/* ═══════════════════════════════════════════
   SLIDE PANEL (bottom sheet for mobile, side for desktop)
═══════════════════════════════════════════ */
function SlidePanel({ open, onClose, children, title }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            key="panel"
            className="fixed bottom-0 left-0 right-0 z-[1001] flex flex-col bg-white rounded-t-3xl shadow-2xl max-h-[93vh] sm:max-h-none sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:w-[490px] sm:rounded-none sm:rounded-l-3xl overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{ '--tw-shadow': '0 -20px 80px rgba(0,0,0,.18)' }}
          >
            {/* Drag handle mobile */}
            <div className="flex sm:hidden justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            {/* Header */}
            <div className="mon-panel-head flex-shrink-0">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                    <SquarePlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-[15px]" style={{ fontFamily: "'Instrument Serif', serif" }}>{title}</div>
                    <div className="text-white/60 text-[10px] font-medium mt-0.5">سجّل عمليتك المالية</div>
                  </div>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ═══════════════════════════════════════════
   FORM ATOMS
═══════════════════════════════════════════ */
function MonInput({ value, onChange, placeholder, type = 'text', icon: Icon }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-[var(--color-primary-400)] pointer-events-none" />}
      <input
        value={value ?? ''} type={type} placeholder={placeholder} onChange={onChange}
        className="mon-input"
        style={{ paddingInlineStart: Icon ? 36 : 12 }}
      />
    </div>
  );
}

function MonSelect({ value, onChange, options, icon: Icon }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-[var(--color-primary-400)] pointer-events-none" />}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mon-input appearance-none cursor-pointer"
        style={{ paddingInlineStart: Icon ? 36 : 12 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-[var(--ink-lt)] pointer-events-none" />
    </div>
  );
}

function SLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && (
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-100)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary-600)' }} />
        </div>
      )}
      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--color-primary-600)' }}>{children}</span>
    </div>
  );
}

function SCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}
      style={{ borderColor: 'var(--color-primary-100)', background: 'rgba(238,242,255,0.35)' }}>
      {children}
    </div>
  );
}

function Prog({ pct, color = 'var(--color-primary-500)', colorEnd }) {
  const bg = colorEnd ? `linear-gradient(90deg,${color},${colorEnd})` : color;
  return (
    <div className="mon-prog-wrap">
      <motion.div className="mon-prog-bar" style={{ background: bg }}
        initial={{ width: 0 }} animate={{ width: `${Math.min(pct || 0, 100)}%` }}
        transition={{ duration: 0.8, ease: [0.34, 1.2, 0.64, 1] }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD TRANSACTION FORM
═══════════════════════════════════════════ */
const TXN_TYPES = [
  { value: 'income', label: 'دخل', icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-l)', bo: 'var(--green-b)' },
  { value: 'expense', label: 'مصروف', icon: TrendingDown, color: 'var(--red)', bg: 'var(--red-l)', bo: 'var(--red-b)' },
  { value: 'commitment', label: 'التزام', icon: Lock, color: 'var(--blue)', bg: 'var(--blue-l)', bo: 'var(--blue-b)' },
  { value: 'zakat', label: 'زكاة / صدقة', icon: Heart, color: 'var(--pink)', bg: 'var(--pink-l)', bo: 'var(--pink-b)' },
];

const COMMIT_TYPES = [
  { value: 'التزام', label: 'التزام ثابت', Icon: Lock, c: 'var(--blue)', bg: 'var(--blue-l)', bo: 'var(--blue-b)' },
  { value: 'اشتراك', label: 'اشتراك', Icon: RefreshCw, c: '#7c3aed', bg: '#f3e8ff', bo: '#e9d5ff' },
  { value: 'جمعية', label: 'جمعية', Icon: Users, c: 'var(--color-primary-600)', bg: 'var(--color-primary-100)', bo: 'var(--color-primary-200)' },
];

const RECURRENCE_TYPES = [
  { value: 'monthly', label: 'شهرياً' },
  { value: 'weekly', label: 'أسبوعياً' },
  { value: 'custom_months', label: 'كل عدد شهور' },
];

const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(2024, i, 1);
  const y = d.getFullYear(), m = d.getMonth();
  const key = `${y}-${String(m + 1).padStart(2, '0')}`;
  return { value: key, label: `${MONTHS_AR[m]} ${y}` };
});

const EMPTY_FORM = {
  type: 'income', source: '', desc: '', amount: '', date: today, zakatDesc: '',
  recurring: false, recurrenceType: 'monthly', recurrenceEvery: 1,
  commitType: 'التزام', jamiaStart: '', jamiaEnd: '', jamiaMyMonth: '',
};

function AddTransactionPanel({ open, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  useEffect(() => { if (open) setForm(EMPTY_FORM); }, [open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isValid = !!form.amount && (form.source || form.desc || form.zakatDesc);
  const curType = TXN_TYPES.find(t => t.value === form.type);

  const handleSave = () => { if (!isValid) return; onSave?.(form); };

  return (
    <SlidePanel open={open} onClose={onClose} title="إضافة عملية جديدة">
      <div className="flex-1 space-y-4 p-4 overflow-y-auto">

        {/* Type selector */}
        <SCard>
          <SLabel icon={Layers}>نوع العملية</SLabel>
          <div className="grid grid-cols-2 gap-2">
            {TXN_TYPES.map(t => {
              const on = form.type === t.value;
              return (
                <button key={t.value} type="button" onClick={() => set('type', t.value)}
                  className="flex items-center gap-2.5 rounded-2xl border p-3 text-xs font-bold transition-all"
                  style={{ borderColor: on ? t.color : 'var(--color-primary-100)', background: on ? t.bg : 'white', color: on ? t.color : 'var(--ink-lt)', boxShadow: on ? `0 4px 14px ${t.color}30` : 'none' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: on ? t.color : 'var(--color-primary-100)' }}>
                    <t.icon className="w-4 h-4" style={{ color: on ? 'white' : 'var(--color-primary-400)' }} />
                  </div>
                  {t.label}
                  {on && <Check className="ms-auto w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </SCard>

        {/* Commitment sub-type */}
        {form.type === 'commitment' && (
          <SCard>
            <SLabel icon={Lock}>نوع الالتزام</SLabel>
            <div className="grid grid-cols-3 gap-2">
              {COMMIT_TYPES.map(t => {
                const on = form.commitType === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => set('commitType', t.value)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-[11px] font-bold transition-all"
                    style={{ borderColor: on ? t.c : 'var(--color-primary-100)', background: on ? t.bg : 'white', color: on ? t.c : 'var(--ink-lt)' }}>
                    <t.Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </SCard>
        )}

        {/* Basic details */}
        <SCard>
          <SLabel icon={FileText}>التفاصيل</SLabel>
          <div className="space-y-3">
            {form.type === 'income' && (
              <MonInput value={form.source} placeholder="اسم الجهة / الشركة" onChange={e => set('source', e.target.value)} icon={Building2} />
            )}
            {(form.type === 'expense' || form.type === 'commitment') && (
              <MonInput value={form.desc} placeholder="وصف العملية" onChange={e => set('desc', e.target.value)} icon={AlignLeft} />
            )}
            {form.type === 'zakat' && (
              <MonInput value={form.zakatDesc} placeholder="مستفيد الزكاة / الصدقة" onChange={e => set('zakatDesc', e.target.value)} icon={Heart} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <MonInput value={form.amount} placeholder="المبلغ (جنيه)" type="number" onChange={e => set('amount', e.target.value)} icon={DollarSign} />
              <MonInput value={form.date} placeholder="التاريخ" type="date" onChange={e => set('date', e.target.value)} icon={CalendarDays} />
            </div>
          </div>
        </SCard>

        {/* Recurrence — income & expense & commitment */}
        {form.type !== 'zakat' && (
          <SCard>
            <SLabel icon={Repeat}>التكرار</SLabel>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink-mid)' }}>هل تتكرر هذه العملية؟</span>
              <button type="button" onClick={() => set('recurring', !form.recurring)}
                className="relative h-6 w-11 rounded-full border-2 transition-all flex-shrink-0"
                style={{ background: form.recurring ? 'var(--color-primary-500)' : '#e2e8f0', borderColor: form.recurring ? 'var(--color-primary-500)' : '#e2e8f0' }}>
                <motion.div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
                  animate={{ x: form.recurring ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </button>
            </div>
            {form.recurring && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
                <MonSelect value={form.recurrenceType} onChange={v => set('recurrenceType', v)} icon={RefreshCw}
                  options={RECURRENCE_TYPES} />
                {form.recurrenceType === 'custom_months' && (
                  <MonInput value={form.recurrenceEvery} placeholder="كل كم شهر؟" type="number" onChange={e => set('recurrenceEvery', e.target.value)} icon={Hash} />
                )}
              </motion.div>
            )}
          </SCard>
        )}

        {/* Jamia details */}
        {form.type === 'commitment' && form.commitType === 'جمعية' && (
          <SCard>
            <SLabel icon={Users}>تفاصيل الجمعية</SLabel>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <MonSelect value={form.jamiaStart} onChange={v => set('jamiaStart', v)} icon={CalendarDays}
                  options={[{ value: '', label: 'شهر البداية' }, ...MONTH_OPTIONS]} />
                <MonSelect value={form.jamiaEnd} onChange={v => set('jamiaEnd', v)} icon={CalendarDays}
                  options={[{ value: '', label: 'شهر النهاية' }, ...MONTH_OPTIONS]} />
              </div>
              <MonSelect value={form.jamiaMyMonth} onChange={v => set('jamiaMyMonth', v)} icon={Star}
                options={[{ value: '', label: 'شهر استلامي للمبلغ' }, ...MONTH_OPTIONS]} />
            </div>
          </SCard>
        )}

        <div className="h-4" />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t px-4 py-4 bg-white" style={{ borderColor: 'var(--color-primary-100)' }}>
        <div className="flex gap-2.5">
          <button onClick={onClose}
            className="flex-1 h-12 rounded-2xl border text-sm font-bold transition-all hover:bg-gray-50 flex items-center justify-center"
            style={{ borderColor: 'var(--color-primary-200)', color: 'var(--ink-mid)' }}>
            إلغاء
          </button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={!isValid}
            className="flex-[2] h-12 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: isValid ? 'var(--m-grad)' : '#cbd5e1', boxShadow: isValid ? '0 6px 20px rgba(99,102,241,0.38)' : 'none' }}>
            <Check className="w-4 h-4" strokeWidth={3} />
            حفظ العملية
          </motion.button>
        </div>
      </div>
    </SlidePanel>
  );
}

/* ═══════════════════════════════════════════
   NOTIFICATION PANEL
═══════════════════════════════════════════ */
function NotifPanel({ open, onClose }) {
  const cfg = {
    warn: { c: 'var(--amber)', bg: 'var(--amber-l)', bo: 'var(--amber-b)', Icon: AlertCircle },
    ok: { c: 'var(--green)', bg: 'var(--green-l)', bo: 'var(--green-b)', Icon: CheckCircle2 },
    alert: { c: 'var(--red)', bg: 'var(--red-l)', bo: 'var(--red-b)', Icon: AlertCircle },
  };
  return (
    <SlidePanel open={open} onClose={onClose} title="التنبيهات">
      <div className="p-4 space-y-3">
        {NOTIFS.map((n, i) => {
          const c = cfg[n.type];
          return (
            <motion.div key={n.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-start gap-3 rounded-2xl border p-4"
              style={{ background: c.bg, borderColor: c.bo }}>
              <c.Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: c.c }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{n.text}</p>
                <p className="mt-1 text-[10px] font-medium mono" style={{ color: 'var(--ink-lt)' }}>{n.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </SlidePanel>
  );
}

/* ═══════════════════════════════════════════
   MONTH CALC TAB
═══════════════════════════════════════════ */
function useMonthlyData(incData, expData, commits) {
  return useMemo(() => {
    const map = {};

    // Seed historical data
    Object.entries(HIST_SEED).forEach(([mk, d]) => {
      if (!map[mk]) map[mk] = { income: 0, expenses: 0, commitments: 0 };
      // Only seed if no actual data
    });

    // Process incomes
    incData.forEach(item => {
      const mk = getMonthKey(item.date);
      if (!mk) return;
      if (!map[mk]) map[mk] = { income: 0, expenses: 0, commitments: 0 };
      map[mk].income += item.amount;

      // Recurring: project forward 6 months
      if (item.recurring) {
        for (let i = 1; i <= 6; i++) {
          const d = new Date(item.date);
          if (item.recurrenceType === 'monthly') d.setMonth(d.getMonth() + i);
          else if (item.recurrenceType === 'weekly') d.setDate(d.getDate() + 7 * i);
          else if (item.recurrenceType === 'custom_months') d.setMonth(d.getMonth() + (item.recurrenceEvery || 1) * i);
          const fmk = getMonthKey(d.toISOString().split('T')[0]);
          if (!map[fmk]) map[fmk] = { income: 0, expenses: 0, commitments: 0 };
          map[fmk].income += item.amount;
        }
      }
    });

    // Process expenses
    expData.forEach(item => {
      const mk = getMonthKey(item.date);
      if (!mk) return;
      if (!map[mk]) map[mk] = { income: 0, expenses: 0, commitments: 0 };
      map[mk].expenses += item.amount;

      if (item.recurring) {
        for (let i = 1; i <= 6; i++) {
          const d = new Date(item.date);
          if (item.recurrenceType === 'monthly') d.setMonth(d.getMonth() + i);
          else if (item.recurrenceType === 'weekly') d.setDate(d.getDate() + 7 * i);
          else if (item.recurrenceType === 'custom_months') d.setMonth(d.getMonth() + (item.recurrenceEvery || 1) * i);
          const fmk = getMonthKey(d.toISOString().split('T')[0]);
          if (!map[fmk]) map[fmk] = { income: 0, expenses: 0, commitments: 0 };
          map[fmk].expenses += item.amount;
        }
      }
    });

    // Seed HIST where no actual income data
    Object.entries(HIST_SEED).forEach(([mk, d]) => {
      if (!map[mk]) map[mk] = { income: 0, expenses: 0, commitments: 0 };
      if (map[mk].income === 0) map[mk].income = d.income;
      if (map[mk].expenses === 0) map[mk].expenses = d.expenses;
    });

    // Commitments
    commits.forEach(item => {
      const mk = getMonthKey(item.dueDate);
      if (!mk) return;
      if (!map[mk]) map[mk] = { income: 0, expenses: 0, commitments: 0 };
      map[mk].commitments += item.amount;
    });

    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([mk, d]) => ({
      mk, label: monthLabel(mk),
      income: d.income, expenses: d.expenses, commitments: d.commitments,
      remaining: d.income - d.expenses - d.commitments,
      net: d.income - d.expenses,
    }));
  }, [incData, expData, commits]);
}

function MonthsTab({ incData, expData, commits }) {
  const months = useMonthlyData(incData, expData, commits);
  const [selMk, setSelMk] = useState(() => getMonthKey(today) || months[0]?.mk);
  const selData = months.find(m => m.mk === selMk) || months[0];
  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expenses)));

  if (!selData) return null;

  const summaryCards = [
    { label: 'الدخل', value: N(selData.income), color: 'var(--green)', bg: 'var(--green-l)', bo: 'var(--green-b)', icon: TrendingUp },
    { label: 'المصروفات', value: N(selData.expenses), color: 'var(--red)', bg: 'var(--red-l)', bo: 'var(--red-b)', icon: TrendingDown },
    { label: 'الالتزامات', value: N(selData.commitments), color: 'var(--blue)', bg: 'var(--blue-l)', bo: 'var(--blue-b)', icon: Lock },
    { label: 'المتبقي', value: (selData.remaining >= 0 ? '+' : '') + N(selData.remaining), color: selData.remaining >= 0 ? 'var(--green)' : 'var(--red)', bg: selData.remaining >= 0 ? 'var(--green-l)' : 'var(--red-l)', bo: selData.remaining >= 0 ? 'var(--green-b)' : 'var(--red-b)', icon: Wallet },
  ];

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {months.map(m => {
          const on = m.mk === selMk;
          return (
            <motion.button key={m.mk} whileTap={{ scale: 0.96 }} onClick={() => setSelMk(m.mk)}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: on ? 'var(--m-grad)' : 'white', color: on ? 'white' : 'var(--ink-mid)', border: `1.5px solid ${on ? 'transparent' : 'var(--color-primary-100)'}`, boxShadow: on ? '0 4px 14px rgba(99,102,241,0.3)' : 'var(--m-shadow)' }}>
              {m.label}
            </motion.button>
          );
        })}
      </div>

      {/* Summary grid */}
      <AnimatePresence mode="wait">
        <motion.div key={selMk} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="grid grid-cols-2 gap-3">
          {summaryCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border p-4" style={{ background: s.bg, borderColor: s.bo }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: s.color }}>
                  <s.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
              </div>
              <p className="mono text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] mt-1" style={{ color: s.color, opacity: .7 }}>جنيه</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Progress bar: expenses vs income */}
      <div className="mon-card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-primary-500)' }} />
          <span className="text-sm font-black" style={{ color: 'var(--ink)' }}>نسبة الإنفاق</span>
          <span className="ms-auto mono text-xs font-bold" style={{ color: selData.expenses / selData.income > 0.8 ? 'var(--red)' : 'var(--green)' }}>
            {selData.income > 0 ? Math.round((selData.expenses / selData.income) * 100) : 0}%
          </span>
        </div>
        <Prog pct={selData.income > 0 ? (selData.expenses / selData.income) * 100 : 0}
          color={selData.expenses / selData.income > 0.8 ? 'var(--red)' : 'var(--color-primary-500)'}
          colorEnd={selData.expenses / selData.income > 0.8 ? '#f87171' : 'var(--color-gradient-to)'} />
        <div className="flex justify-between mt-2 text-[10px] font-semibold" style={{ color: 'var(--ink-lt)' }}>
          <span>صفر</span>
          <span>{N(selData.income)} ج</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="mon-card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-primary-500)' }} />
          <span className="text-sm font-black" style={{ color: 'var(--ink)' }}>مقارنة الشهور</span>
        </div>
        <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ height: 100 }}>
          {months.map(m => {
            const on = m.mk === selMk;
            const hI = maxVal > 0 ? Math.round((m.income / maxVal) * 78) : 0;
            const hE = maxVal > 0 ? Math.round((m.expenses / maxVal) * 78) : 0;
            return (
              <div key={m.mk} onClick={() => setSelMk(m.mk)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer"
                style={{ width: 28, height: 100 }}>
                <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
                  <motion.div animate={{ height: hI }} transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
                    className="flex-1 rounded-t-md" style={{ background: on ? 'var(--green)' : 'var(--green-l)' }} />
                  <motion.div animate={{ height: hE }} transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
                    className="flex-1 rounded-t-md" style={{ background: on ? 'var(--red)' : 'var(--red-l)' }} />
                </div>
                <span className="mono text-[7px] font-semibold text-center leading-none"
                  style={{ color: on ? 'var(--color-primary-600)' : 'var(--ink-lt)' }}>
                  {m.label.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          {[{ bg: 'var(--green)', l: 'الدخل' }, { bg: 'var(--red)', l: 'المصروف' }].map((lg, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-lt)' }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: lg.bg }} />
              {lg.l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INCOME TAB
═══════════════════════════════════════════ */
const RECURRENCE_LABEL = { monthly: 'شهرياً', weekly: 'أسبوعياً', custom_months: 'دورياً' };

function IncomeTab({ data }) {
  const total = data.reduce((s, i) => s + i.amount, 0);
  return (
    <div className="space-y-3">
      <div className="mon-card flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--green-l)', border: '1.5px solid var(--green-b)' }}>
          <TrendingUp className="w-6 h-6" style={{ color: 'var(--green)' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-lt)' }}>إجمالي الدخل</p>
          <p className="mono text-2xl font-bold" style={{ color: 'var(--green)', letterSpacing: '-1px' }}>
            {N(total)} <span className="text-sm font-normal" style={{ color: 'var(--ink-lt)' }}>جنيه</span>
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="mon-card flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--green-l)', border: '1.5px solid var(--green-b)' }}>
                <Briefcase className="w-5 h-5" style={{ color: 'var(--green)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate" style={{ color: 'var(--ink)' }}>{item.source}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.recurring && (
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}>
                      <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_LABEL[item.recurrenceType] || 'متكرر'}
                    </span>
                  )}
                  <span className="mono text-[10px]" style={{ color: 'var(--ink-lt)' }}>{fmtD(item.date)}</span>
                </div>
              </div>
            </div>
            <span className="mono text-base font-bold flex-shrink-0 ms-2" style={{ color: 'var(--green)' }}>+{N(item.amount)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EXPENSES TAB
═══════════════════════════════════════════ */
function ExpensesTab({ data }) {
  const total = data.reduce((s, e) => s + e.amount, 0);
  return (
    <div className="space-y-3">
      <div className="mon-card flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--red-l)', border: '1.5px solid var(--red-b)' }}>
          <TrendingDown className="w-6 h-6" style={{ color: 'var(--red)' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-lt)' }}>إجمالي المصروفات</p>
          <p className="mono text-2xl font-bold" style={{ color: 'var(--red)', letterSpacing: '-1px' }}>
            {N(total)} <span className="text-sm font-normal" style={{ color: 'var(--ink-lt)' }}>جنيه</span>
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="mon-card flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--red-l)', border: '1.5px solid var(--red-b)' }}>
                <Receipt className="w-5 h-5" style={{ color: 'var(--red)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate" style={{ color: 'var(--ink)' }}>{item.desc}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.recurring && (
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: 'var(--red-l)', color: 'var(--red)' }}>
                      <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_LABEL[item.recurrenceType] || 'متكرر'}
                    </span>
                  )}
                  <span className="mono text-[10px]" style={{ color: 'var(--ink-lt)' }}>{fmtD(item.date)}</span>
                </div>
              </div>
            </div>
            <span className="mono text-base font-bold flex-shrink-0 ms-2" style={{ color: 'var(--red)' }}>−{N(item.amount)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMMITMENTS TAB
═══════════════════════════════════════════ */
const CTYPES_MAP = {
  'التزام': { Icon: Lock, c: 'var(--blue)', bg: 'var(--blue-l)', bo: 'var(--blue-b)' },
  'اشتراك': { Icon: RefreshCw, c: '#7c3aed', bg: '#f3e8ff', bo: '#e9d5ff' },
  'جمعية': { Icon: Users, c: 'var(--color-primary-600)', bg: 'var(--color-primary-100)', bo: 'var(--color-primary-200)' },
};

function CommitmentsTab({ data, onUpdate }) {
  const [filter, setFilter] = useState('الكل');
  const filters = ['الكل', ...Object.keys(CTYPES_MAP)];
  const filtered = filter === 'الكل' ? data : data.filter(d => d.type === filter);
  const pend = data.filter(d => d.status !== 'paid').reduce((s, d) => s + d.amount, 0);
  const paid = data.filter(d => d.status === 'paid').reduce((s, d) => s + d.amount, 0);
  const toggle = id => onUpdate(data.map(d => d.id === id ? { ...d, status: d.status === 'paid' ? 'pending' : 'paid' } : d));
  const tc = t => CTYPES_MAP[t] || CTYPES_MAP['التزام'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { l: 'مستحق', v: N(pend), c: 'var(--amber)', bg: 'var(--amber-l)', bo: 'var(--amber-b)', icon: Clock },
          { l: 'مدفوع', v: N(paid), c: 'var(--green)', bg: 'var(--green-l)', bo: 'var(--green-b)', icon: CheckCircle2 },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border p-4" style={{ background: s.bg, borderColor: s.bo }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.c }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.c }}>{s.l}</span>
            </div>
            <p className="mono text-xl font-bold" style={{ color: s.c }}>{s.v} <span className="text-xs font-normal">ج</span></p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {filters.map(f => {
          const on = f === filter;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: on ? 'var(--m-grad)' : 'white', color: on ? 'white' : 'var(--ink-mid)', border: `1.5px solid ${on ? 'transparent' : 'var(--color-primary-100)'}`, boxShadow: on ? '0 3px 10px rgba(99,102,241,0.25)' : 'none' }}>
              {f}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((item, idx) => {
          const t = tc(item.type);
          const isPaid = item.status === 'paid';
          const isJ = item.type === 'جمعية';

          // Jamia progress
          let jamiaProgress = 0, jamiaLabel = '';
          if (isJ && item.jamiaStart && item.jamiaEnd) {
            const startDate = new Date(item.jamiaStart + '-01');
            const endDate = new Date(item.jamiaEnd + '-01');
            const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
            const now = new Date();
            const elapsed = Math.max(0, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()));
            jamiaProgress = totalMonths > 0 ? Math.min(Math.round((elapsed / totalMonths) * 100), 100) : 0;
            jamiaLabel = `${monthLabel(item.jamiaStart)} ← ${monthLabel(item.jamiaEnd)}`;
          }

          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="mon-card hover:shadow-md transition-shadow" style={{ opacity: isPaid ? 0.82 : 1 }}>
              <div className="flex items-start gap-3">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: t.c, minHeight: 40 }} />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.bg, border: `1.5px solid ${t.bo}` }}>
                  <t.Icon className="w-5 h-5" style={{ color: t.c }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-sm font-black truncate" style={{ color: isPaid ? 'var(--ink-lt)' : 'var(--ink)', textDecoration: isPaid ? 'line-through' : 'none' }}>{item.name}</span>
                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: t.bg, color: t.c, border: `1px solid ${t.bo}` }}>{item.type}</span>
                    </div>
                    <span className="mono text-base font-bold flex-shrink-0" style={{ color: t.c }}>{N(item.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="mono text-[10px] flex items-center gap-1" style={{ color: 'var(--ink-lt)' }}>
                      <CalendarDays className="w-2.5 h-2.5" />{fmtD(item.dueDate)}
                    </span>
                    {item.recurring && (
                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}>
                        <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_LABEL[item.recurrenceType] || 'متكرر'}
                      </span>
                    )}
                    <button onClick={() => toggle(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ms-auto"
                      style={{ background: isPaid ? 'var(--green-l)' : 'var(--amber-l)', color: isPaid ? 'var(--green)' : 'var(--amber)', border: `1px solid ${isPaid ? 'var(--green-b)' : 'var(--amber-b)'}` }}>
                      {isPaid ? <><CheckCircle2 className="w-2.5 h-2.5" />مدفوع</> : <><Clock className="w-2.5 h-2.5" />مستحق</>}
                    </button>
                  </div>

                  {isJ && item.jamiaStart && item.jamiaEnd && (
                    <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)' }}>
                      <div className="flex justify-between text-[10px] mb-2" style={{ color: 'var(--ink-lt)' }}>
                        <span>{jamiaLabel}</span>
                        <span className="mono font-bold" style={{ color: 'var(--color-primary-600)' }}>{jamiaProgress}%</span>
                      </div>
                      <Prog pct={jamiaProgress} color="var(--color-primary-500)" colorEnd="var(--color-gradient-to)" />
                      {item.jamiaMyMonth && (
                        <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-primary-600)' }}>
                          <Star className="w-3 h-3" /> استلامي: {monthLabel(item.jamiaMyMonth)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ZAKAT TAB — Enhanced
═══════════════════════════════════════════ */
function ZakatTab({ inc, exp, log, onLog }) {
  const [mode, setMode] = useState('net');
  const [custom, setCustom] = useState('');
  const [pct, setPct] = useState(2.5);
  const [info, setInfo] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmt, setNewAmt] = useState('');
  const [newDate, setNewDate] = useState(today);
  const [showAdd, setShowAdd] = useState(false);

  const base = mode === 'net' ? Math.max(inc - exp, 0) : mode === 'total' ? inc : Number(custom) || 0;
  const due = Math.round((base * pct) / 100);
  const paid = log.reduce((s, l) => s + l.amount, 0);
  const rem = Math.max(due - paid, 0);
  const progress = due > 0 ? Math.min(Math.round((paid / due) * 100), 100) : 0;

  const handleAdd = () => {
    if (!newDesc || !newAmt) return;
    onLog(l => [...l, { id: Date.now(), desc: newDesc, amount: Number(newAmt), date: newDate }]);
    setNewDesc(''); setNewAmt(''); setNewDate(today); setShowAdd(false);
  };

  const Nisab = 85 * 55.5; // approx gold nisab in EGP rough estimate
  const meetsNisab = base >= Nisab;

  return (
    <div className="space-y-4">
      {/* Zakat hero card */}
      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)', boxShadow: '0 8px 32px rgba(217,119,6,0.3)' }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-base" style={{ fontFamily: "'Instrument Serif', serif" }}>حساب الزكاة</p>
                <p className="text-white/70 text-[10px] font-medium">ركن الإسلام الثالث</p>
              </div>
            </div>
            <button onClick={() => setInfo(!info)}
              className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors">
              <Info className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {info && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4">
                <div className="bg-white/20 border border-white/30 rounded-2xl p-3 text-xs text-white/90 leading-relaxed backdrop-blur-sm">
                  💡 زكاة المال 2.5% على المال الذي بلغ النصاب وحال عليه الحول. نصاب الذهب ≈ 85 جم من الذهب.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nisab indicator */}
          <div className="bg-white/15 border border-white/25 rounded-2xl p-3 mb-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${meetsNisab ? 'bg-white/25' : 'bg-red-500/30'}`}>
              {meetsNisab ? <CheckCircle2 className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="text-white text-xs font-bold">{meetsNisab ? 'بلغ النصاب ✓' : 'لم يبلغ النصاب بعد'}</p>
              <p className="text-white/65 text-[10px]">الأساس: {N(base)} ج</p>
            </div>
          </div>

          {/* Big numbers */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: 'المطلوب', v: N(due), icon: '🕌' },
              { l: 'مدفوع', v: N(paid), icon: '✅' },
              { l: 'متبقي', v: N(rem), icon: rem > 0 ? '⏳' : '🎉' },
            ].map((s, i) => (
              <div key={i} className="bg-white/15 border border-white/25 rounded-2xl p-3 text-center backdrop-blur-sm">
                <div className="text-lg mb-1">{s.icon}</div>
                <p className="text-white/70 text-[9px] font-bold uppercase tracking-wider mb-1">{s.l}</p>
                <p className="mono text-white text-sm font-bold">{s.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-5">
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <motion.div className="h-full rounded-full bg-white"
              initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.34, 1.2, 0.64, 1] }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-white/70 text-[10px] font-semibold">0%</span>
            <span className="text-white font-bold text-[11px]">{progress}% تم إخراجه</span>
            <span className="text-white/70 text-[10px] font-semibold">100%</span>
          </div>
        </div>
      </div>

      {/* Calculation basis */}
      <div className="mon-card">
        <SLabel icon={BarChart3}>أساس الحساب</SLabel>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { k: 'net', l: 'الصافي', v: N(Math.max(inc - exp, 0)) },
            { k: 'total', l: 'الإجمالي', v: N(inc) },
            { k: 'custom', l: 'مخصص', v: custom ? N(Number(custom)) : '—' },
          ].map(o => {
            const on = mode === o.k;
            return (
              <button key={o.k} onClick={() => setMode(o.k)}
                className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all"
                style={{ borderColor: on ? 'var(--amber)' : 'var(--color-primary-100)', background: on ? 'var(--amber-l)' : 'white' }}>
                <span className="text-xs font-bold" style={{ color: on ? 'var(--amber)' : 'var(--ink-mid)' }}>{o.l}</span>
                <span className="mono text-sm font-bold" style={{ color: on ? 'var(--amber)' : 'var(--ink-lt)' }}>{o.v}</span>
              </button>
            );
          })}
        </div>
        {mode === 'custom' && (
          <div className="mb-4">
            <MonInput value={custom} placeholder="أدخل المبلغ المخصص" type="number" onChange={e => setCustom(e.target.value)} icon={DollarSign} />
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-mid)' }}>نسبة الزكاة: <span className="mono font-bold" style={{ color: 'var(--amber)' }}>{pct}%</span></span>
          </div>
          <input type="range" min={2} max={10} step={0.5} value={pct} onChange={e => setPct(Number(e.target.value))}
            className="w-full h-2 rounded-full outline-none cursor-pointer"
            style={{ background: `linear-gradient(to right,var(--amber) 0%,var(--amber) ${((pct - 2) / 8) * 100}%,var(--amber-l) ${((pct - 2) / 8) * 100}%,var(--amber-l) 100%)`, accentColor: 'var(--amber)' }} />
          <div className="flex justify-between mt-1 text-[9px]" style={{ color: 'var(--ink-lt)' }}>
            <span>2%</span><span>10%</span>
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="mon-card">
        <div className="flex items-center justify-between mb-4">
          <SLabel icon={Heart}>سجل الصدقات والزكاة</SLabel>
          <button onClick={() => setShowAdd(!showAdd)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: showAdd ? 'var(--pink-l)' : 'var(--color-primary-100)', color: showAdd ? 'var(--pink)' : 'var(--color-primary-600)' }}>
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4">
              <div className="space-y-2 p-3 rounded-2xl" style={{ background: 'var(--pink-l)', border: '1px solid var(--pink-b)' }}>
                <MonInput value={newDesc} placeholder="وصف الصدقة / الزكاة" onChange={e => setNewDesc(e.target.value)} icon={Heart} />
                <div className="grid grid-cols-2 gap-2">
                  <MonInput value={newAmt} placeholder="المبلغ" type="number" onChange={e => setNewAmt(e.target.value)} icon={DollarSign} />
                  <MonInput value={newDate} placeholder="التاريخ" type="date" onChange={e => setNewDate(e.target.value)} icon={CalendarDays} />
                </div>
                <button onClick={handleAdd}
                  className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: 'var(--pink)' }}>
                  <Plus className="w-4 h-4" />إضافة
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {log.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between rounded-2xl border p-3"
              style={{ background: 'var(--pink-l)', borderColor: 'var(--pink-b)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--pink)' }}>
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{item.desc}</p>
                  <p className="mono text-[10px] mt-0.5" style={{ color: 'var(--ink-lt)' }}>{fmtD(item.date)}</p>
                </div>
              </div>
              <span className="mono font-bold text-sm" style={{ color: 'var(--pink)' }}>{N(item.amount)}</span>
            </motion.div>
          ))}
          {log.length === 0 && (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--ink-lt)' }}>لا يوجد سجل حتى الآن</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
const TABS = [
  { id: 'months', label: 'الشهور', icon: CalendarDays },
  { id: 'income', label: 'الدخل', icon: TrendingUp },
  { id: 'expenses', label: 'المصروفات', icon: TrendingDown },
  { id: 'commits', label: 'الالتزامات', icon: Layers },
  { id: 'zakat', label: 'الزكاة', icon: Landmark },
];

export default function MoneyPage() {
  const [tab, setTab] = useState('months');
  const [notifOpen, setNotifOpen] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);
  const [incData, setIncData] = useState(INIT_INC);
  const [expData, setExpData] = useState(INIT_EXP);
  const [commits, setCommits] = useState(INIT_COMMIT);
  const [zlog, setZlog] = useState(INIT_ZLOG);

  const totalInc = incData.reduce((s, i) => s + i.amount, 0);
  const totalExp = expData.reduce((s, e) => s + e.amount, 0);
  const net = totalInc - totalExp;
  const bal = 14250 + net;

  const tabsWithCount = TABS.map(t => ({
    ...t,
    count: t.id === 'income' ? incData.length : t.id === 'expenses' ? expData.length : t.id === 'commits' ? commits.length : t.id === 'zakat' ? zlog.length : undefined,
  }));

  const handleSave = form => {
    if (form.type === 'income') {
      setIncData(d => [...d, { id: Date.now(), source: form.source, amount: Number(form.amount), date: form.date, recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: Number(form.recurrenceEvery) || 1 }]);
      setTab('income');
    } else if (form.type === 'expense') {
      setExpData(d => [...d, { id: Date.now(), desc: form.desc, amount: Number(form.amount), date: form.date, recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: Number(form.recurrenceEvery) || 1 }]);
      setTab('expenses');
    } else if (form.type === 'commitment') {
      const base = { id: Date.now(), name: form.desc, amount: Number(form.amount), dueDate: form.date, status: 'pending', type: form.commitType, recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: Number(form.recurrenceEvery) || 1 };
      const ext = form.commitType === 'جمعية' ? { jamiaStart: form.jamiaStart, jamiaEnd: form.jamiaEnd, jamiaMyMonth: form.jamiaMyMonth } : {};
      setCommits(d => [...d, { ...base, ...ext }]);
      setTab('commits');
    } else if (form.type === 'zakat') {
      setZlog(d => [...d, { id: Date.now(), desc: form.zakatDesc, amount: Number(form.amount), date: form.date }]);
      setTab('zakat');
    }
    setSlideOpen(false);
  };

  const statCards = [
    { label: 'الرصيد', value: N(bal), sub: 'جنيه', color: '#fff' },
    { label: 'الدخل', value: N(totalInc), sub: '+', color: '#a7f3d0' },
    { label: 'المصروفات', value: N(totalExp), sub: '−', color: '#fecaca' },
    { label: 'الصافي', value: (net >= 0 ? '+' : '') + N(net), sub: 'ج', color: net >= 0 ? '#a7f3d0' : '#fecaca' },
  ];

  return (
    <>
      <MoneyStyles />
      <div className="mon-wrap min-h-screen pb-24" style={{ background: 'var(--m-bg)', direction: 'rtl' }}>

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <div className="mon-hero">
          <div className="mon-hero-orb1" /><div className="mon-hero-orb2" />
          <div className="mon-hero-noise" /><div className="mon-hero-dots" /><div className="mon-hero-hl" />

          {/* Top row */}
          <div className="mon-hero-toprow">
            <div>
              <div className="mon-hero-title serif">ملخص فلوسي</div>
              <div className="mon-hero-sub">تتبع دخلك ومصاريفك والتزاماتك</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="mon-hero-icon-btn" onClick={() => setNotifOpen(true)}>
                <Bell size={14} />
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-black text-white flex items-center justify-center"
                  style={{ background: 'var(--red)', border: '2px solid rgba(99,102,241,.7)' }}>3</span>
              </button>
              <button className="mon-hero-btn-solid" onClick={() => setSlideOpen(true)}>
                <Plus size={14} /> إضافة
              </button>
            </div>
          </div>

          {/* Stat strip */}
          <div className="mon-stat-strip">
            {statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="mon-stat-card">
                <div className="mon-stat-label">{s.label}</div>
                <div className="mon-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="mon-stat-change">{s.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Tab strip */}
          <div className="mon-tab-strip">
            {tabsWithCount.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} className={`mon-tab-chip ${active ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  <t.icon size={12} />
                  {t.label}
                  {t.count !== undefined && <span className="mon-tab-count">{t.count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ BODY ═══════════════════════════════════════════════ */}
        <div className="mon-body">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {tab === 'months' && <MonthsTab incData={incData} expData={expData} commits={commits} />}
              {tab === 'income' && <IncomeTab data={incData} />}
              {tab === 'expenses' && <ExpensesTab data={expData} />}
              {tab === 'commits' && <CommitmentsTab data={commits} onUpdate={setCommits} />}
              {tab === 'zakat' && <ZakatTab inc={totalInc} exp={totalExp} log={zlog} onLog={setZlog} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Panels */}
      <AddTransactionPanel open={slideOpen} onClose={() => setSlideOpen(false)} onSave={handleSave} />
      <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}