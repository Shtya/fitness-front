/* 
  TodoTab — updated to match calendarTab UI pattern
  - Hero section with gradient (same as calendarTab)
  - Desktop: slide panel (right) for Add/Edit
  - Mobile: bottom sheet for Add/Edit
  - Larger mobile checkbox touch targets
  - All inputs 16px font size
  - Tab selector hidden (navigation handled externally)
  - Consistent design tokens & components with calendarTab
*/
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Folder, Calendar, Clock, Star, StarOff, Trash2,
  CheckCircle, Circle, Repeat, Flag, Inbox, Sun, Zap, ListTodo,
  GripVertical, FolderPlus, FileText, Menu, Volume2, VolumeX,
  Settings, TrendingUp, ChevronDown, Filter, Check, Eye, Image,
  Paperclip, Download, ArrowUp, ArrowDown, ChevronsUpDown, MoveRight,
  Sparkles, Pencil,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import api from '@/utils/axios';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isArabic } from '@/utils/isArabic';
import MultiLangText from '@/components/atoms/MultiLangText';

// ─── Design tokens (mirrors calendarTab) ─────────────────────────────────────
const TODO_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .todo-wrap { font-family:'DM Sans',system-ui,sans-serif; color:var(--cal-text,#1a1916); }
  .todo-wrap * { box-sizing:border-box; }
  .todo-wrap ::-webkit-scrollbar { width:4px; height:4px; }
  .todo-wrap ::-webkit-scrollbar-thumb { background:var(--cal-surface4,#e0e0e0); border-radius:4px; }

  /* ── All inputs 16px to prevent iOS zoom ── */
  .todo-input,
  .todo-input[type="text"],
  .todo-input[type="date"],
  .todo-input[type="time"],
  .todo-input[type="number"],
  .todo-wrap input,
  .todo-wrap textarea,
  .todo-wrap select {
    font-size: 16px !important;
  }

  /* ── Hero (same as cal-hero) ── */
  .todo-hero { position:relative; overflow:hidden; background:var(--cal-grad,linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)); padding:20px 24px 0; }
  .todo-hero::before { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,rgba(255,255,255,0) 60%,rgba(0,0,0,.06) 100%); pointer-events:none; }
  .todo-hero-noise { position:absolute; inset:0; opacity:.04; pointer-events:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .todo-hero-dots { position:absolute; inset:0; opacity:.055; pointer-events:none; background-image:radial-gradient(circle,rgba(255,255,255,.85) 1px,transparent 1px); background-size:28px 28px; }
  .todo-hero-orb1 { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(255,255,255,.09); filter:blur(60px); top:-160px; left:-100px; pointer-events:none; }
  .todo-hero-orb2 { position:absolute; width:300px; height:300px; border-radius:50%; background:rgba(255,255,255,.06); filter:blur(60px); bottom:-80px; right:-60px; pointer-events:none; }
  .todo-hero-hl { position:absolute; inset-x:0; top:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.5) 30%,rgba(255,255,255,.5) 70%,transparent); pointer-events:none; }

  .todo-hero-toprow { position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
  .todo-hero-title { font-family:'Instrument Serif',Georgia,serif; font-size:22px; font-weight:400; color:#fff; letter-spacing:-.3px; line-height:1; text-shadow:0 1px 12px rgba(0,0,0,.12); white-space:nowrap; }

  .todo-hero-actions { display:flex; align-items:center; gap:6px; }
  .todo-hero-btn-solid { height:34px; padding:0 14px; background:#fff; border:none; border-radius:10px; color:var(--color-primary-700,#4338ca); font-family:'DM Sans',system-ui,sans-serif; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; box-shadow:0 4px 16px rgba(0,0,0,.12); white-space:nowrap; }
  .todo-hero-btn-solid:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,.16); }
  .todo-hero-btn-glass { height:34px; padding:0 14px; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.22); border-radius:10px; color:#fff; font-family:'DM Sans',system-ui,sans-serif; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; backdrop-filter:blur(12px); white-space:nowrap; }
  .todo-hero-btn-glass:hover { background:rgba(255,255,255,.26); }
  .todo-hero-icon-btn { width:34px; height:34px; border-radius:10px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.2); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; backdrop-filter:blur(8px); }
  .todo-hero-icon-btn:hover { background:rgba(255,255,255,.24); }
  .todo-hero-icon-btn.active { background:rgba(255,255,255,.28); border-color:rgba(255,255,255,.4); }

  /* ── Folder strip (mirrors type strip) ── */
  .todo-folder-strip { position:relative; z-index:10; display:flex; align-items:center; gap:6px; padding-bottom:16px; overflow-x:auto; scrollbar-width:none; }
  .todo-folder-strip::-webkit-scrollbar { display:none; }
  .todo-folder-chip { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:100px; border:1px solid rgba(255,255,255,.22); background:rgba(255,255,255,.12); color:rgba(255,255,255,.8); font-family:'DM Sans',system-ui,sans-serif; font-size:11px; font-weight:500; cursor:pointer; white-space:nowrap; transition:all .2s; backdrop-filter:blur(8px); }
  .todo-folder-chip:hover { background:rgba(255,255,255,.22); color:#fff; }
  .todo-folder-chip.active { background:rgba(255,255,255,.98); color:var(--color-primary-700,#4338ca); border-color:transparent; font-weight:700; box-shadow:0 4px 12px rgba(0,0,0,.12); }
  .todo-folder-count { font-size:9px; font-weight:700; opacity:.6; background:rgba(0,0,0,.12); padding:1px 5px; border-radius:100px; }
  .todo-folder-chip.active .todo-folder-count { background:var(--cal-accent-lt,rgba(99,102,241,.14)); opacity:1; color:var(--color-primary-700,#4338ca); }

  /* ── Body / Sidebar ── */
  .todo-body { display:flex; flex:1; }
  .todo-main { flex:1; padding:0; min-width:0; overflow-y:auto; }

  .todo-sidebar { width:260px; background:var(--cal-surface,#fff); border-right:1px solid var(--cal-border,rgba(0,0,0,.06)); display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; transition:width .3s; }
  .todo-sidebar.collapsed { width:72px; }

  /* ── Task card ── */
  .todo-card { background:var(--cal-surface,#fff); border-bottom:1px solid var(--cal-border,rgba(0,0,0,.06)); padding:14px 20px; display:flex; align-items:flex-start; gap:12px; transition:background .15s; position:relative; cursor:pointer; }
  .todo-card:hover { background:var(--cal-surface2,#f8f8f8); }
  .todo-card.done { opacity:.55; }
  .todo-card-accent { position:absolute; left:0; top:0; bottom:0; width:3px; border-radius:0 2px 2px 0; }

  /* ── Mobile check — big tap target ── */
  .todo-check-mob { flex-shrink:0; background:transparent; border:none; color:var(--cal-text3,#b0ada5); cursor:pointer; padding:8px; margin:-8px; display:flex; align-items:center; justify-content:center; transition:color .15s; -webkit-tap-highlight-color:transparent; min-width:44px; min-height:44px; }
  .todo-check-mob:active { transform:scale(.88); }
  .todo-check-mob.done { color:#4ade80; }

  /* ── Quick-add bar ── */
  .todo-quickadd { margin:16px 20px; padding:10px 14px; background:var(--cal-accent-lt,rgba(99,102,241,.12)); border:1px dashed var(--cal-accent-gl,rgba(99,102,241,.22)); border-radius:12px; display:flex; align-items:center; gap:10px; }
  .todo-quickadd input { flex:1; background:transparent; border:none; outline:none; font-family:'DM Sans',system-ui,sans-serif; font-size:16px; color:var(--cal-text,#1a1916); }
  .todo-quickadd input::placeholder { color:var(--cal-text3,#b0ada5); }

  /* ── Desktop slide panel ── */
  .todo-desk-panel-overlay { position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.25); backdrop-filter:blur(4px); }
  .todo-desk-panel { position:fixed; top:0; bottom:0; right:0; z-index:61; width:min(520px,46vw); background:var(--cal-surface,#fff); border-left:1px solid var(--cal-border2,rgba(0,0,0,.10)); box-shadow:-12px 0 48px rgba(0,0,0,.12); display:flex; flex-direction:column; overflow:hidden; }
  .todo-desk-panel[dir="rtl"] { right:auto; left:0; border-left:none; border-right:1px solid var(--cal-border2,rgba(0,0,0,.10)); box-shadow:12px 0 48px rgba(0,0,0,.12); }
  .todo-desk-panel-head { padding:20px 22px 16px; border-bottom:1px solid var(--cal-border,rgba(0,0,0,.06)); display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg,var(--color-gradient-from,#6366f1),var(--color-gradient-to,#a855f7)); position:relative; overflow:hidden; }
  .todo-desk-panel-head::before { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,transparent 100%); pointer-events:none; }
  .todo-desk-panel-htitle { font-family:'Instrument Serif',Georgia,serif; font-size:18px; font-weight:400; color:#fff; display:flex; align-items:center; gap:10px; position:relative; z-index:1; }
  .todo-desk-panel-icon { width:32px; height:32px; background:rgba(255,255,255,.22); border:1px solid rgba(255,255,255,.3); border-radius:9px; display:flex; align-items:center; justify-content:center; color:#fff; }
  .todo-desk-panel-close { position:relative; z-index:1; width:34px; height:34px; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.2); border-radius:10px; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; }
  .todo-desk-panel-close:hover { background:rgba(255,255,255,.28); }
  .todo-desk-panel-body { flex:1; overflow-y:auto; }

  /* ── Form inside panel ── */
  .todo-form-body { padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
  .todo-form-footer { padding:14px 20px 18px; border-top:1px solid var(--cal-border,rgba(0,0,0,.06)); display:flex; gap:8px; }
  .todo-label { font-size:10px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--cal-text3,#b0ada5); display:flex; align-items:center; gap:4px; margin-bottom:5px; }
  .todo-input { width:100%; background:var(--cal-surface2,#f8f8f8); border:1px solid rgba(0,0,0,.10); border-radius:10px; padding:9px 12px; color:var(--cal-text,#1a1916); font-family:'DM Sans',system-ui,sans-serif; font-size:16px; outline:none; transition:border-color .2s,box-shadow .2s; }
  .todo-input:focus { border-color:rgba(99,102,241,.4); box-shadow:0 0 0 3px rgba(99,102,241,.08); }
  .todo-input::placeholder { color:var(--cal-text3,#b0ada5); }
  .todo-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .todo-btn-ghost { height:36px; padding:0 14px; background:transparent; border:1px solid rgba(0,0,0,.10); border-radius:10px; color:var(--cal-text2,#6b6860); font-family:'DM Sans',system-ui,sans-serif; font-size:13px; font-weight:500; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; }
  .todo-btn-ghost:hover { background:var(--cal-surface2,#f8f8f8); }
  .todo-btn-primary { height:36px; padding:0 16px; background:linear-gradient(135deg,var(--color-gradient-from,#6366f1),var(--color-gradient-to,#a855f7)); border:none; border-radius:10px; color:#fff; font-family:'DM Sans',system-ui,sans-serif; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; box-shadow:0 2px 12px rgba(99,102,241,.25); }
  .todo-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(99,102,241,.35); }
  .todo-btn-primary:disabled { opacity:.45; transform:none; cursor:not-allowed; }

  /* ── Section label ── */
  .todo-section-lbl { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--cal-text3,#b0ada5); padding:12px 20px 4px; }

  /* ── Responsive ── */
  @media (max-width:1024px) { .todo-sidebar { display:none !important; } }
  @media (max-width:640px) {
    .todo-hero { padding:14px 16px 0; }
    .todo-hero-title { font-size:17px; }
    .todo-card { padding:12px 14px; }
    .todo-desk-panel { display:none !important; }
  }
  @media (min-width:641px) {
    .todo-mob-only { display:none !important; }
  }

  /* checkbox animations */
  @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  @keyframes check-bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
`;

function TodoStyles() {
  useEffect(() => {
    const id = 'todo-ds-v2';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = TODO_STYLES;
      document.head.appendChild(el);
    }
  }, []);
  return null;
}

// ─── Hook: detect mobile ──────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const h = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return isMobile;
}

// ─── Desktop Side Panel ───────────────────────────────────────────────────────
function DesktopSidePanel({ open, onClose, title, children, isRTL }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="td-overlay" className="todo-desk-panel-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} onClick={onClose} />
          <motion.div key="td-panel" className="todo-desk-panel"
            dir={isRTL ? 'rtl' : 'ltr'}
            initial={{ x: isRTL ? '-100%' : '100%' }}
            animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <div className="todo-desk-panel-head">
              <div className="todo-desk-panel-htitle">
                <div className="todo-desk-panel-icon"><Sparkles size={15} /></div>
                {title}
              </div>
              <button className="todo-desk-panel-close" onClick={onClose}><X size={15} /></button>
            </div>
            <div className="todo-desk-panel-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Mobile Bottom Sheet ──────────────────────────────────────────────────────
function SlidePanel({ open, onClose, children, title }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="mob-backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }} onClick={onClose} />
          <motion.div key="mob-panel"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[var(--cal-surface,#fff)] rounded-t-3xl shadow-2xl max-h-[92vh] overflow-hidden"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100 flex-shrink-0">
                <span className="text-[17px] font-normal text-gray-900" style={{ fontFamily: "'Instrument Serif',serif" }}>{title}</span>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <X size={15} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── localStorage helpers ────────────────────────────────────────────────────
const LS_ORDER_KEY = 'todo_task_order_v1';
function safeParseJSON(str, fallback) { try { return JSON.parse(str); } catch { return fallback; } }
function loadOrderMap() { if (typeof window === 'undefined') return {}; const raw = window.localStorage.getItem(LS_ORDER_KEY); return raw ? safeParseJSON(raw, {}) : {}; }
function saveOrderMap(map) { if (typeof window === 'undefined') return; window.localStorage.setItem(LS_ORDER_KEY, JSON.stringify(map)); }
function getFolderScopeId(sel) { if (sel === 'today' || sel === 'starred') return 'inbox'; return sel || 'inbox'; }
function applyOrderToTasks(allTasks, folderId, orderIds) {
  if (!Array.isArray(orderIds) || !orderIds.length) return allTasks;
  const folderTasks = allTasks.filter(t => t.folderId === folderId);
  const otherTasks = allTasks.filter(t => t.folderId !== folderId);
  const byId = new Map(folderTasks.map(t => [t.id, t]));
  const ordered = [];
  for (const id of orderIds) { const task = byId.get(id); if (task) ordered.push(task); }
  for (const t of folderTasks) { if (!orderIds.includes(t.id)) ordered.push(t); }
  return [...ordered, ...otherTasks];
}
function computeFolderOrder(allTasks, folderId) { return allTasks.filter(t => t.folderId === folderId).map(t => t.id); }

// ─── Sound ───────────────────────────────────────────────────────────────────
const playSound = (type, soundEnabled) => {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'check') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.frequency.setValueAtTime(783.99, ctx.currentTime);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
};

// ─── Constants ───────────────────────────────────────────────────────────────
const priorityLevels = [
  { id: 'none', label: 'none', color: 'var(--color-primary-300,#a5b4fc)', icon: Circle },
  { id: 'low', label: 'low', color: 'var(--color-primary-500,#6366f1)', icon: Flag },
  { id: 'medium', label: 'medium', color: '#f59e0b', icon: Flag },
  { id: 'high', label: 'high', color: '#ef4444', icon: Flag },
  { id: 'urgent', label: 'urgent', color: '#dc2626', icon: Zap },
];

const repeatOptions = [
  { id: 'none', label: 'none' }, { id: 'daily', label: 'daily' },
  { id: 'every-2-days', label: 'every2days' }, { id: 'every-3-days', label: 'every3days' },
  { id: 'weekly', label: 'weekly' }, { id: 'bi-weekly', label: 'biweekly' },
  { id: 'monthly', label: 'monthly' }, { id: 'custom', label: 'custom' },
];

const statusOptions = [
  { id: 'todo', label: 'todo', color: 'var(--color-primary-600,#4f46e5)' },
  { id: 'in-progress', label: 'inProgress', color: '#f59e0b' },
  { id: 'completed', label: 'completed', color: '#10b981' },
  { id: 'cancelled', label: 'cancelled', color: '#ef4444' },
];

const PRIORITY_HEX = {
  none: 'var(--color-primary-300,#a5b4fc)',
  low: 'var(--color-primary-500,#6366f1)',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#dc2626',
};

// ─── Normalizers ─────────────────────────────────────────────────────────────
const normalizeFolder = (f) => ({
  id: String(f.id ?? f._id ?? f.uuid ?? f.folderId ?? ''),
  uuid: f.uuid ?? f.id ?? f._id ?? null,
  name: f.name ?? '',
  color: f.color ?? 'var(--color-primary-600,#4f46e5)',
  icon: Folder,
  isSystem: !!f.isSystem,
});

const normalizeSubtask = (st) => ({
  id: String(st.id ?? st._id ?? st.uuid ?? ''),
  title: st.title ?? '',
  completed: !!st.completed,
  orderIndex: typeof st.orderIndex === 'number' ? st.orderIndex : 0,
});

const normalizeTask = (t) => ({
  id: String(t.id ?? t._id ?? t.uuid ?? ''),
  title: t.title ?? '',
  folderId: t.folderId == null ? 'inbox' : String(t.folderId ?? t.folder_id ?? 'inbox'),
  completed: !!t.completed,
  status: t.status ?? (t.completed ? 'completed' : 'todo'),
  priority: t.priority ?? 'none',
  dueDate: t.dueDate ?? t.due_date ?? null,
  dueTime: t.dueTime ?? t.due_time ?? null,
  repeat: t.repeat ?? 'none',
  customRepeatDays: t.customRepeatDays ?? null,
  tags: Array.isArray(t.tags) ? t.tags : [],
  isStarred: !!(t.isStarred ?? t.starred),
  notes: t.notes ?? '',
  attachments: Array.isArray(t.attachments) ? t.attachments : [],
  subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(normalizeSubtask) : [],
  createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
  updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
});

async function uploadFilesToAssets(files) {
  return files.map(file => ({ name: file.name, url: URL.createObjectURL(file), type: file.type }));
}

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Custom Checkbox ──────────────────────────────────────────────────────────
function CustomCheckbox({ checked, onCheckedChange, size = 'md' }) {
  const sz = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <button onClick={() => onCheckedChange(!checked)}
      className={cn('relative rounded-lg border-2 transition-all duration-300 flex items-center justify-center flex-shrink-0',
        sz,
        checked
          ? 'border-transparent shadow-md'
          : 'border-gray-300 bg-white hover:border-[var(--color-primary-400,#818cf8)]'
      )}
      style={checked ? { background: 'linear-gradient(135deg,var(--color-gradient-from,#6366f1),var(--color-gradient-to,#a855f7))' } : {}}>
      {checked && <Check className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} style={{ color: '#fff', animation: 'check-bounce .4s ease-out' }} />}
    </button>
  );
}

// ─── SortableSubtaskItem ──────────────────────────────────────────────────────
function SortableSubtaskItem({ subtask, onToggle, onDelete, onEdit, isRTL, editingSubtaskId, editSubtaskTitle, setEditSubtaskTitle, onSaveEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isEditing = editingSubtaskId === subtask.id;

  return (
    <div ref={setNodeRef} style={style} className="group/subtask flex items-center gap-2">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 opacity-40 group-hover/subtask:opacity-100 transition-opacity">
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>
      <CustomCheckbox checked={subtask.completed} onCheckedChange={onToggle} size="sm" />
      {isEditing ? (
        <input type="text" value={editSubtaskTitle} onChange={(e) => setEditSubtaskTitle(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') onSaveEdit(); }}
          className="flex-1 text-sm bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-gray-700"
          style={{ fontSize: '16px' }} autoFocus />
      ) : (
        <span onClick={onEdit}
          className={cn('text-sm flex-1 cursor-pointer rounded px-1 py-0.5 hover:bg-black/5 transition-colors',
            subtask.completed ? 'line-through text-gray-400' : 'text-gray-700')}>
          {subtask.title}
        </span>
      )}
      <button onClick={onDelete}
        className="opacity-0 group-hover/subtask:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-red-50">
        <X className="w-3 h-3 text-red-500" />
      </button>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function SortableTaskItem({ task, onToggle, onSelect, onQuickDelete, onAddSubtask, onToggleStar, onToggleSubtask, onDeleteSubtask, onUpdateTask, onReorderSubtasks, onMoveToFolder, folders, t, isMobile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [activeSubtaskId, setActiveSubtaskId] = useState(null);
  const subtaskInputRef = useRef(null);
  const moveMenuRef = useRef(null);

  useEffect(() => { setEditTitle(task.title); }, [task.title]);

  useEffect(() => {
    const handler = (e) => { if (moveMenuRef.current && !moveMenuRef.current.contains(e.target)) setShowMoveMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const priorityHex = PRIORITY_HEX[task.priority] || 'var(--color-primary-300,#a5b4fc)';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      onAddSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setTimeout(() => subtaskInputRef.current?.focus(), 50);
    }
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== task.title) onUpdateTask(task.id, { title: editTitle.trim() });
    setEditingTitle(false);
  };

  const handleSubtaskDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = task.subtasks.findIndex(st => st.id === active.id);
    const newIdx = task.subtasks.findIndex(st => st.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorderSubtasks(task.id, arrayMove(task.subtasks, oldIdx, newIdx));
  };

  const handleEditSubtask = (id) => {
    const st = task.subtasks.find(s => s.id === id);
    if (st) { setEditingSubtaskId(id); setEditSubtaskTitle(st.title); }
  };

  const handleSaveSubtaskEdit = () => {
    if (editSubtaskTitle.trim() && editingSubtaskId) {
      const updated = task.subtasks.map(st => st.id === editingSubtaskId ? { ...st, title: editSubtaskTitle.trim() } : st);
      onUpdateTask(task.id, { subtasks: updated });
    }
    setEditingSubtaskId(null); setEditSubtaskTitle('');
  };

  const movableFolders = folders.filter(f => {
    if (f.id === (task.folderId === 'inbox' ? 'inbox' : task.folderId)) return false;
    if (f.id === 'today' || f.id === 'starred') return false;
    return true;
  });

  return (
    <div ref={setNodeRef} style={style}
      className={cn('todo-card group/task', task.completed && 'done')}>
      <div className="todo-card-accent" style={{ background: priorityHex }} />

      {/* Drag handle */}
      <div {...attributes} {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover/task:opacity-100 transition-opacity mt-0.5">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Checkbox — bigger on mobile */}
      {isMobile ? (
        <button
          className={cn('todo-check-mob', task.completed && 'done')}
          onClick={() => onToggle(task.id)}>
          {task.completed
            ? <CheckCircle size={24} style={{ color: '#4ade80' }} />
            : <Circle size={24} />}
        </button>
      ) : (
        <div className="mt-0.5">
          <CustomCheckbox checked={task.completed} onCheckedChange={() => onToggle(task.id)} />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-w-0" onClick={(e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        onSelect(task);
      }}>
        {/* Title */}
        {editingTitle ? (
          <input type="text" value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
            className="w-full font-semibold bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-gray-900"
            style={{ fontSize: '16px' }} autoFocus />
        ) : (
          <MultiLangText
            onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
            className={cn('font-semibold text-sm leading-snug cursor-pointer hover:text-[var(--color-primary-600,#4f46e5)] transition-colors',
              task.completed ? 'line-through text-gray-400' : 'text-gray-900')}>
            {task.title}
          </MultiLangText>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          {task.dueTime && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
              <Clock className="w-3 h-3" />{formatTime12h(task.dueTime)}
            </span>
          )}
          {task.dueDate && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
              <Calendar className="w-3 h-3" />{task.dueDate}
            </span>
          )}
          {task.priority !== 'none' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${priorityHex}18`, color: priorityHex }}>
              <Flag className="w-2.5 h-2.5" />
              {t(`priorities.${task.priority}`)}
            </span>
          )}
          {task.repeat !== 'none' && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
              <Repeat className="w-3 h-3" />{t(`repeat.${repeatOptions.find(r => r.id === task.repeat)?.label || 'none'}`)}
            </span>
          )}
        </div>

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-3 pl-1">
            <DndContext sensors={sensors} collisionDetection={closestCorners}
              onDragStart={(e) => setActiveSubtaskId(e.active.id)}
              onDragEnd={(e) => { handleSubtaskDragEnd(e); setActiveSubtaskId(null); }}>
              <SortableContext items={task.subtasks.map(st => st.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {task.subtasks.map(st => (
                    <SortableSubtaskItem key={st.id} subtask={st}
                      onToggle={() => onToggleSubtask(task.id, st.id)}
                      onDelete={() => onDeleteSubtask(task.id, st.id)}
                      onEdit={() => handleEditSubtask(st.id)}
                      isRTL={false}
                      editingSubtaskId={editingSubtaskId}
                      editSubtaskTitle={editSubtaskTitle}
                      setEditSubtaskTitle={setEditSubtaskTitle}
                      onSaveEdit={handleSaveSubtaskEdit} />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeSubtaskId
                  ? <div className="bg-white border-2 border-[var(--color-primary-500,#6366f1)] shadow-xl p-2 rounded text-sm font-medium">
                    {task.subtasks.find(st => st.id === activeSubtaskId)?.title}
                  </div>
                  : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* Subtask input */}
        {!task.completed && showSubtaskInput && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input ref={subtaskInputRef} type="text" value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder={t('subtaskPlaceholder')}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-primary-400,#818cf8)]"
                style={{ fontSize: '16px' }} autoFocus />
              <button type="submit"
                className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,var(--color-gradient-from,#6366f1),var(--color-gradient-to,#a855f7))' }}>
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setShowSubtaskInput(false)}
                className="px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={cn('flex items-center gap-1 flex-shrink-0', isMobile ? 'opacity-100' : 'opacity-0 group-hover/task:opacity-100 transition-opacity')}>
        {/* Move */}
        <div className="relative" ref={moveMenuRef}>
          <button onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <MoveRight className="w-3.5 h-3.5" />
          </button>
          {showMoveMenu && (
            <div className="absolute z-50 top-full mt-1 ltr:right-0 rtl:left-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
              <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('moveTo')}</div>
              {movableFolders.map(folder => (
                <button key={folder.id}
                  onClick={() => { onMoveToFolder(task.id, folder.id); setShowMoveMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left transition-colors">
                  <folder.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: folder.color }} />
                  <span className="text-sm font-medium text-gray-700 truncate">{folder.name}</span>
                </button>
              ))}
              {movableFolders.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">{t('noOtherFolders')}</div>}
            </div>
          )}
        </div>

        {/* Star */}
        <button onClick={() => onToggleStar(task.id)}
          className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
            task.isStarred ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50')}>
          <Star className={cn('w-3.5 h-3.5', task.isStarred && 'fill-amber-500')} />
        </button>

        {/* Add subtask */}
        {!task.completed && (
          <button onClick={() => setShowSubtaskInput(!showSubtaskInput)}
            className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
              showSubtaskInput ? 'text-emerald-500 bg-emerald-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50')}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Edit */}
        <button onClick={() => onSelect(task)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[var(--color-primary-500,#6366f1)] hover:bg-[var(--color-primary-50,#eef2ff)] transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button onClick={() => onQuickDelete(task.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Task Form Content ────────────────────────────────────────────────────────
function TaskFormContent({ t, editingTask, taskForm, setTaskForm, handleSave, onClose, locale }) {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);

  return (
    <div>
      <div className="todo-form-body">
        {/* Title */}
        <div>
          <label className="todo-label"><Pencil size={10} /> {t('title')}</label>
          <input className="todo-input" value={taskForm.title}
            onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))}
            placeholder={t('addTaskPlaceholder')} autoFocus />
        </div>

        {/* Notes */}
        <div>
          <label className="todo-label">
            <FileText size={10} /> {t('notes')}
            <span className="normal-case font-normal tracking-normal text-gray-400">({t('optional')})</span>
          </label>
          <textarea className="todo-input" value={taskForm.notes || ''}
            onChange={(e) => setTaskForm(p => ({ ...p, notes: e.target.value }))}
            placeholder={t('notesPlaceholder')} rows={2} style={{ resize: 'none' }} />
        </div>

        {/* Status + Priority */}
        <div className="todo-form-grid">
          <div>
            <label className="todo-label">{t('status')}</label>
            <Select open={statusOpen} onOpenChange={setStatusOpen} value={taskForm.status}
              onValueChange={(v) => { setTaskForm(p => ({ ...p, status: v })); setStatusOpen(false); }}>
              <SelectTrigger className="todo-input" style={{ height: 44, fontSize: 16 }}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl z-[9999]" style={{ background: 'var(--cal-surface,#fff)' }}>
                {statusOptions.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {t(`status.${s.label}`)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="todo-label">{t('priority')}</label>
            <Select open={priorityOpen} onOpenChange={setPriorityOpen} value={taskForm.priority}
              onValueChange={(v) => { setTaskForm(p => ({ ...p, priority: v })); setPriorityOpen(false); }}>
              <SelectTrigger className="todo-input" style={{ height: 44, fontSize: 16 }}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl z-[9999]" style={{ background: 'var(--cal-surface,#fff)' }}>
                {priorityLevels.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      {t(`priorities.${p.label}`)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Due date + time */}
        <div className="todo-form-grid">
          <div>
            <label className="todo-label"><Calendar size={10} /> {t('dueDate')}</label>
            <Flatpickr value={taskForm.dueDate || ''}
              onChange={([d]) => setTaskForm(p => ({ ...p, dueDate: d ? d.toISOString().split('T')[0] : null }))}
              options={{ dateFormat: 'Y-m-d', locale }}
              className="todo-input" placeholder={t('selectDate')} />
          </div>
          <div>
            <label className="todo-label">
              <Clock size={10} /> {t('time')}
              <span className="normal-case font-normal tracking-normal text-gray-400">({t('optional')})</span>
            </label>
            <Flatpickr value={taskForm.dueTime || ''}
              onChange={([d]) => {
                if (d) {
                  const hh = String(d.getHours()).padStart(2, '0');
                  const mm = String(d.getMinutes()).padStart(2, '0');
                  setTaskForm(p => ({ ...p, dueTime: `${hh}:${mm}` }));
                }
              }}
              options={{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }}
              className="todo-input" placeholder={t('selectTime')} />
          </div>
        </div>

        {/* Repeat */}
        <div>
          <label className="todo-label"><Repeat size={10} /> {t('repeat')}</label>
          <Select open={repeatOpen} onOpenChange={setRepeatOpen} value={taskForm.repeat}
            onValueChange={(v) => { setTaskForm(p => ({ ...p, repeat: v })); setRepeatOpen(false); }}>
            <SelectTrigger className="todo-input" style={{ height: 44, fontSize: 16 }}><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl z-[9999]" style={{ background: 'var(--cal-surface,#fff)' }}>
              {repeatOptions.map(r => (
                <SelectItem key={r.id} value={r.id} className="text-sm">{t(`repeat.${r.label}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="todo-form-footer">
        <button className="todo-btn-ghost flex-1 justify-center" onClick={onClose}>{t('cancel')}</button>
        <button className="todo-btn-primary justify-center" style={{ flex: 2 }}
          disabled={!taskForm.title} onClick={handleSave}>
          <Check size={14} /> {editingTask ? t('save') : t('add')}
        </button>
      </div>
    </div>
  );
}

// ─── Task Panel (desktop = slide panel, mobile = bottom sheet) ────────────────
function TaskPanel({ open, onClose, t, isRTL, editingTask, taskForm, setTaskForm, handleSave, isMobileView, locale }) {
  const title = editingTask ? t('editTask') : t('addTask');
  const titleNode = (
    <div className="flex items-center gap-2">
      <div className="todo-desk-panel-icon"><Sparkles size={14} /></div>
      <span>{title}</span>
    </div>
  );

  if (isMobileView) {
    return (
      <SlidePanel open={open} onClose={onClose} title={titleNode}>
        <TaskFormContent t={t} editingTask={editingTask} taskForm={taskForm}
          setTaskForm={setTaskForm} handleSave={handleSave} onClose={onClose} locale={locale} />
      </SlidePanel>
    );
  }
  return (
    <DesktopSidePanel open={open} onClose={onClose} title={title} isRTL={isRTL}>
      <TaskFormContent t={t} editingTask={editingTask} taskForm={taskForm}
        setTaskForm={setTaskForm} handleSave={handleSave} onClose={onClose} locale={locale} />
    </DesktopSidePanel>
  );
}

// ─── Quick add bar ────────────────────────────────────────────────────────────
function QuickAddBar({ onAdd, t }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const submit = async () => {
    if (!value.trim()) return;
    await onAdd(value.trim());
    setValue('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="todo-quickadd mx-5 my-4">
      <Plus className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary-500,#6366f1)' }} />
      <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder={t('addTaskPlaceholder')} />
      {value.trim() && (
        <button onClick={submit}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white"
          style={{ background: 'linear-gradient(135deg,var(--color-gradient-from,#6366f1),var(--color-gradient-to,#a855f7))' }}>
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TodoTab() {
  const t = useTranslations('todo');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const isMobile = useIsMobile();

  const [settings, setSettings] = useState({ soundEnabled: true, showCompleted: true, addTaskPosition: 'top' });
  const [folders, setFolders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('manual');
  const [activeId, setActiveId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('var(--color-primary-600,#4f46e5)');

  // Task panel (add/edit)
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', notes: '', status: 'todo', priority: 'none', dueDate: null, dueTime: null, repeat: 'none' });

  // Detail sidebar
  const [showDetailSidebar, setShowDetailSidebar] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const orderMapRef = useRef({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    orderMapRef.current = loadOrderMap();
    const load = async () => {
      setLoading(true);
      try {
        const [foldersRes, tasksRes] = await Promise.all([api.get('/todo/folders'), api.get('/todos')]);
        const foldersArr = Array.isArray(foldersRes) ? foldersRes : foldersRes?.data || [];
        const tasksArr = Array.isArray(tasksRes) ? tasksRes : tasksRes?.data || [];
        const normalizedFolders = foldersArr.map(normalizeFolder);
        let normalizedTasks = tasksArr.map(normalizeTask);
        const system = [
          { id: 'inbox', name: 'inbox', color: 'var(--color-primary-600,#4f46e5)', icon: Inbox, isSystem: true },
          { id: 'today', name: 'today', color: '#f59e0b', icon: Sun, isSystem: true },
          { id: 'starred', name: 'starred', color: '#eab308', icon: Star, isSystem: true },
        ];
        const mergedFolders = [...system, ...normalizedFolders.filter(f => !['inbox', 'today', 'starred'].includes(f.id)).map(f => ({ ...f, icon: Folder, isSystem: false }))];
        const map = orderMapRef.current || {};
        for (const fid of Object.keys(map)) normalizedTasks = applyOrderToTasks(normalizedTasks, fid, map[fid]);
        if (!mounted) return;
        setFolders(mergedFolders); setTasks(normalizedTasks);
      } catch (e) {
        if (!mounted) return;
        setFolders([
          { id: 'inbox', name: 'inbox', color: 'var(--color-primary-600,#4f46e5)', icon: Inbox, isSystem: true },
          { id: 'today', name: 'today', color: '#f59e0b', icon: Sun, isSystem: true },
          { id: 'starred', name: 'starred', color: '#eab308', icon: Star, isSystem: true },
        ]);
        setTasks([]);
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ── Panel helpers ─────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setTaskForm({ title: '', notes: '', status: 'todo', priority: 'none', dueDate: null, dueTime: null, repeat: 'none' });
    setEditingTask(null);
  }, []);

  const openAddPanel = () => { resetForm(); setShowTaskPanel(true); };

  const openEditPanel = (task) => {
    setEditingTask(task);
    setTaskForm({ title: task.title, notes: task.notes || '', status: task.status || 'todo', priority: task.priority || 'none', dueDate: task.dueDate || null, dueTime: task.dueTime || null, repeat: task.repeat || 'none' });
    setShowTaskPanel(true);
  };

  const closeTaskPanel = () => { setShowTaskPanel(false); setTimeout(resetForm, 350); };

  const handleSaveTask = useCallback(async () => {
    if (!taskForm.title.trim()) return;
    if (editingTask) {
      const merged = { ...editingTask, ...taskForm, updatedAt: new Date() };
      setTasks(p => p.map(t => t.id === editingTask.id ? merged : t));
      if (selectedTask?.id === editingTask.id) setSelectedTask(merged);
      try {
        if (!String(editingTask.id).startsWith('tmp-')) {
          const res = await api.patch(`/todos/${editingTask.id}`, { ...merged, createdAt: merged.createdAt instanceof Date ? merged.createdAt.toISOString() : merged.createdAt, updatedAt: new Date().toISOString() });
          const saved = normalizeTask(res?.data ?? res);
          setTasks(p => p.map(t => t.id === editingTask.id ? saved : t));
        }
      } catch {}
    } else {
      const folderId = selectedFolder === 'today' || selectedFolder === 'starred' ? 'inbox' : selectedFolder;
      let folderUUID = folderId;
      const foundF = folders.find(f => f.id === folderId);
      if (foundF?.uuid) folderUUID = foundF.uuid;
      const payload = { ...taskForm, folderId: folderUUID, completed: false, isStarred: selectedFolder === 'starred', dueDate: selectedFolder === 'today' ? new Date().toISOString().split('T')[0] : taskForm.dueDate, tags: [], attachments: [], subtasks: [] };
      const tempId = `tmp-${Date.now()}`;
      const optimistic = { id: tempId, ...payload, folderId, createdAt: new Date(), updatedAt: new Date() };
      setTasks(p => {
        const next = settings.addTaskPosition === 'top' ? [optimistic, ...p] : [...p, optimistic];
        const cur = orderMapRef.current || {};
        const folderOrder = (cur[folderId] || []).filter(id => id !== tempId);
        cur[folderId] = settings.addTaskPosition === 'top' ? [tempId, ...folderOrder] : [...folderOrder, tempId];
        orderMapRef.current = cur; saveOrderMap(cur);
        return next;
      });
      try {
        const res = await api.post('/todos', payload);
        const created = normalizeTask(res?.data ?? res);
        setTasks(p => p.map(t => t.id === tempId ? created : t));
        const cur = orderMapRef.current || {};
        if (Array.isArray(cur[folderId])) { cur[folderId] = cur[folderId].map(id => id === tempId ? created.id : id); orderMapRef.current = cur; saveOrderMap(cur); }
      } catch { setTasks(p => p.filter(t => t.id !== tempId)); }
    }
    closeTaskPanel();
    playSound('check', settings.soundEnabled);
  }, [taskForm, editingTask, selectedFolder, folders, settings]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAddTaskQuick = async (title) => {
    const folderId = selectedFolder === 'today' || selectedFolder === 'starred' ? 'inbox' : selectedFolder;
    let folderUUID = folderId;
    const foundF = folders.find(f => f.id === folderId);
    if (foundF?.uuid) folderUUID = foundF.uuid;
    const payload = { title, folderId: folderUUID, completed: false, status: 'todo', priority: 'none', dueDate: selectedFolder === 'today' ? new Date().toISOString().split('T')[0] : null, dueTime: null, repeat: 'none', tags: [], isStarred: selectedFolder === 'starred', notes: '', attachments: [] };
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, ...payload, folderId, subtasks: [], createdAt: new Date(), updatedAt: new Date() };
    setTasks(p => {
      const next = settings.addTaskPosition === 'top' ? [optimistic, ...p] : [...p, optimistic];
      const cur = orderMapRef.current || {}; const fo = (cur[folderId] || []).filter(id => id !== tempId);
      cur[folderId] = settings.addTaskPosition === 'top' ? [tempId, ...fo] : [...fo, tempId];
      orderMapRef.current = cur; saveOrderMap(cur); return next;
    });
    try {
      const res = await api.post('/todos', payload);
      const created = normalizeTask(res?.data ?? res);
      setTasks(p => p.map(t => t.id === tempId ? created : t));
      const cur = orderMapRef.current || {};
      if (Array.isArray(cur[folderId])) { cur[folderId] = cur[folderId].map(id => id === tempId ? created.id : id); orderMapRef.current = cur; saveOrderMap(cur); }
    } catch { setTasks(p => p.filter(t => t.id !== tempId)); }
  };

  const handleToggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    playSound(task.completed ? 'uncheck' : 'check', settings.soundEnabled);
    const willComplete = !task.completed;
    const updates = { completed: willComplete, status: willComplete ? 'completed' : 'todo', updatedAt: new Date() };
    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, ...updates } : t);
      if (willComplete) {
        const fid = task.folderId || 'inbox';
        const folderTasks = updated.filter(t => t.folderId === fid);
        const others = updated.filter(t => t.folderId !== fid);
        const reordered = [...folderTasks.filter(t => !t.completed), ...folderTasks.filter(t => t.completed)];
        const cur = orderMapRef.current || {}; cur[fid] = reordered.map(t => t.id); orderMapRef.current = cur; saveOrderMap(cur);
        return [...reordered, ...others];
      }
      return updated;
    });
    if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, ...updates }));
    try { if (!String(taskId).startsWith('tmp-')) await api.patch(`/todos/${taskId}`, { ...task, ...updates, updatedAt: new Date().toISOString(), createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt }); }
    catch { setTasks(p => p.map(t => t.id === taskId ? task : t)); }
  };

  const handleUpdateTask = async (taskId, updates) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    const merged = { ...task, ...updates, updatedAt: new Date() };
    setTasks(p => p.map(t => t.id === taskId ? merged : t));
    if (selectedTask?.id === taskId) setSelectedTask(merged);
    try {
      if (!String(taskId).startsWith('tmp-')) {
        const res = await api.patch(`/todos/${taskId}`, { ...merged, createdAt: merged.createdAt instanceof Date ? merged.createdAt.toISOString() : merged.createdAt, updatedAt: new Date().toISOString() });
        const saved = normalizeTask(res?.data ?? res);
        setTasks(p => p.map(t => t.id === taskId ? saved : t));
        if (selectedTask?.id === taskId) setSelectedTask(saved);
      }
    } catch { setTasks(p => p.map(t => t.id === taskId ? task : t)); }
  };

  const handleDeleteTask = async (taskId) => {
    const prev = tasks; const task = tasks.find(t => t.id === taskId);
    if (task) { const cur = orderMapRef.current || {}; const fid = task.folderId || 'inbox'; if (Array.isArray(cur[fid])) { cur[fid] = cur[fid].filter(id => id !== taskId); orderMapRef.current = cur; saveOrderMap(cur); } }
    setTasks(p => p.filter(t => t.id !== taskId));
    if (selectedTask?.id === taskId) { setSelectedTask(null); setShowDetailSidebar(false); }
    try { if (!String(taskId).startsWith('tmp-')) await api.delete(`/todos/${taskId}`); }
    catch { setTasks(prev); }
  };

  const handleMoveToFolder = async (taskId, targetFolderId) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    let targetUUID = targetFolderId;
    if (targetFolderId !== 'inbox' && !/^[0-9a-fA-F-]{36}$/.test(targetFolderId)) { const f = folders.find(f => f.id === targetFolderId); if (f?.uuid) targetUUID = f.uuid; }
    const prevFid = task.folderId || 'inbox';
    const cur = orderMapRef.current || {};
    if (Array.isArray(cur[prevFid])) cur[prevFid] = cur[prevFid].filter(id => id !== taskId);
    if (!Array.isArray(cur[targetFolderId])) cur[targetFolderId] = [];
    cur[targetFolderId].push(taskId);
    orderMapRef.current = cur; saveOrderMap(cur);
    const merged = { ...task, folderId: targetFolderId, updatedAt: new Date() };
    setTasks(p => p.map(t => t.id === taskId ? merged : t));
    if (selectedTask?.id === taskId) setSelectedTask(merged);
    try { if (!String(taskId).startsWith('tmp-')) await api.patch(`/todos/${taskId}`, { ...merged, folderId: targetUUID === 'inbox' ? null : targetUUID, createdAt: merged.createdAt instanceof Date ? merged.createdAt.toISOString() : merged.createdAt, updatedAt: new Date().toISOString() }); }
    catch { setTasks(p => p.map(t => t.id === taskId ? task : t)); }
  };

  const handleAddSubtask = async (taskId, title) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    const tmpId = `tmpst-${Date.now()}`;
    const optimistic = { id: tmpId, title, completed: false, orderIndex: task.subtasks?.length || 0 };
    setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), optimistic] } : t));
    if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, subtasks: [...(p.subtasks || []), optimistic] }));
    try {
      if (!String(taskId).startsWith('tmp-')) {
        const res = await api.post(`/tasks/${taskId}/subtasks`, { title, completed: false });
        const created = normalizeSubtask(res?.data ?? res);
        setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === tmpId ? created : st) } : t));
        if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, subtasks: (p.subtasks || []).map(st => st.id === tmpId ? created : st) }));
      }
    } catch {
      setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== tmpId) } : t));
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    const st = task.subtasks?.find(x => x.id === subtaskId); if (!st) return;
    playSound(st.completed ? 'uncheck' : 'check', settings.soundEnabled);
    setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map(x => x.id === subtaskId ? { ...x, completed: !x.completed } : x) } : t));
    if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, subtasks: (p.subtasks || []).map(x => x.id === subtaskId ? { ...x, completed: !x.completed } : x) }));
    try { if (!String(subtaskId).startsWith('tmpst-')) await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`); }
    catch { setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map(x => x.id === subtaskId ? st : x) } : t)); }
  };

  const handleDeleteSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    const prev = task.subtasks || [];
    setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) } : t));
    if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, subtasks: (p.subtasks || []).filter(st => st.id !== subtaskId) }));
    try { if (!String(subtaskId).startsWith('tmpst-')) await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`); }
    catch { setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: prev } : t)); }
  };

  const handleReorderSubtasks = async (taskId, reordered) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    setTasks(p => p.map(t => t.id === taskId ? { ...t, subtasks: reordered } : t));
    if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, subtasks: reordered }));
    try {
      const real = reordered.filter(st => !String(st.id).startsWith('tmpst-'));
      await api.post('/tasks/subtasks/reorder', { taskId, items: real.map((st, i) => ({ id: st.id, orderIndex: i })) });
    } catch { setTasks(p => p.map(t => t.id === taskId ? task : t)); }
  };

  const handleToggleStar = (taskId) => {
    const task = tasks.find(t => t.id === taskId); if (!task) return;
    handleUpdateTask(taskId, { isStarred: !task.isStarred });
  };

  const handleUncheckAll = () => {
    const visible = getFilteredTasks();
    const allDone = visible.every(t => t.completed);
    visible.filter(t => allDone ? true : t.completed).forEach(task => handleUpdateTask(task.id, { completed: false, status: 'todo' }));
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    const payload = { name: newFolderName.trim(), color: newFolderColor, isSystem: false };
    const tempId = `tmpf-${Date.now()}`;
    const optimistic = { id: tempId, name: payload.name, color: payload.color, icon: Folder, isSystem: false };
    setFolders(p => [...p, optimistic]); setNewFolderName(''); setNewFolderColor('var(--color-primary-600,#4f46e5)'); setShowAddFolder(false); setSelectedFolder(tempId);
    try {
      const res = await api.post('/todo-folders', payload);
      const created = normalizeFolder(res?.data ?? res); created.icon = Folder; created.isSystem = false;
      setFolders(p => p.map(f => f.id === tempId ? created : f)); setSelectedFolder(created.id);
    } catch { setFolders(p => p.filter(f => f.id !== tempId)); setSelectedFolder('inbox'); }
  };

  const handleDeleteFolder = async (folderId) => {
    const prevFolders = folders; const prevTasks = tasks;
    const cur = orderMapRef.current || {}; if (cur[folderId]) { delete cur[folderId]; orderMapRef.current = cur; saveOrderMap(cur); }
    setTasks(p => p.map(t => t.folderId === folderId ? { ...t, folderId: 'inbox' } : t));
    setFolders(p => p.filter(f => f.id !== folderId)); setSelectedFolder('inbox');
    setShowDeleteFolderConfirm(false); setFolderToDelete(null);
    try { if (!String(folderId).startsWith('tmpf-')) await api.delete(`/todo-folders/${folderId}`); }
    catch { setFolders(prevFolders); setTasks(prevTasks); }
  };

  // ── DnD ──────────────────────────────────────────────────────────────────
  const handleDragStart = (e) => setActiveId(e.active.id);
  const handleDragEnd = (event) => {
    const { active, over } = event; setActiveId(null);
    if (!over || active.id === over.id || sortBy !== 'manual') return;
    const scopeFid = getFolderScopeId(selectedFolder);
    setTasks(prev => {
      const visible = getFilteredTasks(prev);
      const oi = visible.findIndex(t => t.id === active.id);
      const ni = visible.findIndex(t => t.id === over.id);
      if (oi === -1 || ni === -1) return prev;
      const moved = arrayMove(visible, oi, ni);
      const ids = new Set(moved.map(t => t.id));
      const rest = prev.filter(t => !ids.has(t.id));
      const next = [...moved, ...rest];
      const cur = orderMapRef.current || {}; cur[scopeFid] = computeFolderOrder(next, scopeFid); orderMapRef.current = cur; saveOrderMap(cur);
      return next;
    });
  };

  // ── Filtered tasks ────────────────────────────────────────────────────────
  const getFilteredTasks = (inputTasks = tasks) => {
    let filtered = [...inputTasks];
    if (selectedFolder === 'today') { const today = new Date().toISOString().split('T')[0]; filtered = filtered.filter(t => t.dueDate === today || t.repeat === 'daily'); }
    else if (selectedFolder === 'starred') { filtered = filtered.filter(t => t.isStarred); }
    else if (selectedFolder !== 'inbox') { filtered = filtered.filter(t => t.folderId === selectedFolder); }
    if (!settings.showCompleted) filtered = filtered.filter(t => !t.completed);
    if (filterPriority && filterPriority !== 'all') filtered = filtered.filter(t => t.priority === filterPriority);
    if (sortBy === 'dueDate') filtered.sort((a, b) => { if (!a.dueDate) return 1; if (!b.dueDate) return -1; return new Date(a.dueDate) - new Date(b.dueDate); });
    else if (sortBy === 'priority') { const o = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }; filtered.sort((a, b) => o[a.priority] - o[b.priority]); }
    else if (sortBy === 'alphabetical') filtered.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'time') filtered.sort((a, b) => { if (!a.dueTime) return 1; if (!b.dueTime) return -1; return a.dueTime.localeCompare(b.dueTime); });
    return filtered;
  };

  const filteredTasks = getFilteredTasks();
  const currentFolder = folders.find(f => f.id === selectedFolder);
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const completedCount = filteredTasks.filter(t => t.completed).length;
  const allDone = filteredTasks.length > 0 && filteredTasks.every(t => t.completed);

  const getFolderCount = (fid) => {
    if (fid === 'today') { const today = new Date().toISOString().split('T')[0]; return tasks.filter(t => (t.dueDate === today || t.repeat === 'daily') && (!t.completed || settings.showCompleted)).length; }
    if (fid === 'starred') return tasks.filter(t => t.isStarred && (!t.completed || settings.showCompleted)).length;
    if (fid === 'inbox') return tasks.filter(t => t.folderId === 'inbox' && (!t.completed || settings.showCompleted)).length;
    return tasks.filter(t => t.folderId === fid && (!t.completed || settings.showCompleted)).length;
  };

  const getFolderLabel = (folder) => {
    if (!folder) return '';
    try { const key = `folders.${folder.name}`; const val = t(key); if (val !== key) return val; } catch {}
    return folder.name;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="todo-wrap w-[calc(100%+30px)] ltr:ml-[-15px] rtl:mr-[-15px] mt-[-15px] min-h-screen flex flex-col">
      <TodoStyles />

      {/* ═══ HERO ════════════════════════════════════════ */}
      <div className="todo-hero">
        <div className="todo-hero-orb1" /><div className="todo-hero-orb2" />
        <div className="todo-hero-noise" /><div className="todo-hero-dots" /><div className="todo-hero-hl" />

        <div className="todo-hero-toprow">
          {/* Title + folder label */}
          <div className="flex items-center gap-3">
            <div className="todo-hero-title">
              {currentFolder ? getFolderLabel(currentFolder) : t('todos')}
            </div>
            {filteredTasks.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,.18)', color: 'rgba(255,255,255,.85)' }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>{filteredTasks.filter(t => !t.completed).length}</span>
                <span>/{filteredTasks.length}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="todo-hero-actions">
            {/* Filter */}
            <div className="hidden sm:block relative">
              <FilterPopover value={filterPriority} onChange={setFilterPriority} t={t} />
            </div>

            {/* Sort */}
            <div className="hidden sm:block relative">
              <SortPopover value={sortBy} onChange={setSortBy} t={t} />
            </div>

            {/* Uncheck all */}
            {completedCount > 0 && (
              <button className="todo-hero-btn-glass hidden sm:flex" onClick={handleUncheckAll}>
                <ChevronsUpDown size={13} />
                <span>{allDone ? t('recheckAll') : t('uncheckAll')}</span>
              </button>
            )}

            {/* Add */}
            <button className="todo-hero-btn-solid" onClick={openAddPanel}>
              <Plus size={14} /><span className="hidden sm:inline">{t('add')}</span>
            </button>

            {/* Sound */}
            <button className={cn('todo-hero-icon-btn', settings.soundEnabled && 'active')}
              onClick={() => setSettings(p => ({ ...p, soundEnabled: !p.soundEnabled }))}>
              {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            {/* Settings */}
            <button className="todo-hero-icon-btn hidden sm:flex" onClick={() => setShowSettings(true)}>
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Folder strip */}
        <div className="todo-folder-strip">
          {folders.map(folder => {
            const active = selectedFolder === folder.id;
            const count = getFolderCount(folder.id);
            return (
              <button key={folder.id}
                className={cn('todo-folder-chip', active && 'active')}
                onClick={() => setSelectedFolder(folder.id)}>
                <folder.icon size={11} />
                {getFolderLabel(folder)}
                <span className="todo-folder-count">{count}</span>
              </button>
            );
          })}
          {/* Add folder chip */}
          <button className="todo-folder-chip" onClick={() => setShowAddFolder(true)}>
            <FolderPlus size={11} />{t('addFolder')}
          </button>
        </div>
      </div>

      {/* ═══ BODY ════════════════════════════════════════ */}
      <div className="todo-body flex-1 bg-gray-50">
        <div className="todo-main">
          {/* Quick add bar */}
          <QuickAddBar onAdd={handleAddTaskQuick} t={t} />

          {/* Task list */}
          <div className="mx-5 mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-gray-500 text-sm font-medium">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-[var(--color-primary-500,#6366f1)] rounded-full animate-spin mx-auto mb-3" />
                {t('loading')}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,var(--color-primary-50,#eef2ff),var(--color-secondary-50,#f5f3ff))' }}>
                  <ListTodo className="w-7 h-7" style={{ color: 'var(--color-primary-500,#6366f1)' }} />
                </div>
                <p className="text-gray-900 font-semibold text-sm">{t('noTasks')}</p>
                <p className="text-gray-500 text-xs mt-1">{t('addFirstTask')}</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCorners}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {filteredTasks.map(task => (
                    <SortableTaskItem key={task.id} task={task}
                      onToggle={handleToggleTask}
                      onSelect={(task) => {
                        if (isMobile) openEditPanel(task);
                        else { setSelectedTask(task); setShowDetailSidebar(true); }
                      }}
                      onQuickDelete={handleDeleteTask}
                      onAddSubtask={handleAddSubtask}
                      onToggleStar={handleToggleStar}
                      onToggleSubtask={handleToggleSubtask}
                      onDeleteSubtask={handleDeleteSubtask}
                      onUpdateTask={handleUpdateTask}
                      onReorderSubtasks={handleReorderSubtasks}
                      onMoveToFolder={handleMoveToFolder}
                      folders={folders} t={t} isMobile={isMobile} />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeTask ? (
                    <div className="bg-white border-2 shadow-2xl p-4 rounded-xl opacity-90 rotate-1"
                      style={{ borderColor: 'var(--color-primary-400,#818cf8)' }}>
                      <p className="font-semibold text-gray-900 text-sm">{activeTask.title}</p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TASK PANEL (add/edit) ══════════════════════ */}
      <TaskPanel
        open={showTaskPanel} onClose={closeTaskPanel}
        t={t} isRTL={isRTL}
        editingTask={editingTask}
        taskForm={taskForm} setTaskForm={setTaskForm}
        handleSave={handleSaveTask}
        isMobileView={isMobile}
        locale={locale}
      />

      {/* ═══ DETAIL SIDEBAR (desktop) ═══════════════════ */}
      {showDetailSidebar && selectedTask && !isMobile && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowDetailSidebar(false)} />
          <TaskDetailSidebar
            task={selectedTask}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onClose={() => setShowDetailSidebar(false)}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onEdit={() => { setShowDetailSidebar(false); openEditPanel(selectedTask); }}
            isRTL={isRTL} t={t} locale={locale}
          />
        </>
      )}

      {/* ═══ ADD FOLDER DIALOG ══════════════════════════ */}
      <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
        <DialogContent className="max-w-sm rounded-2xl" style={{ background: 'var(--cal-surface,#fff)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <FolderPlus size={18} style={{ color: 'var(--color-primary-500,#6366f1)' }} />
              {t('addFolder')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="todo-label">{t('folderName')}</label>
              <input className="todo-input" value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                placeholder={t('folderNamePlaceholder')} autoFocus />
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={newFolderColor.startsWith('#') ? newFolderColor : '#6366f1'}
                onChange={(e) => setNewFolderColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200" />
              <span className="text-sm text-gray-600">{t('pickColor')}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button className="todo-btn-ghost flex-1 justify-center" onClick={() => setShowAddFolder(false)}>{t('cancel')}</button>
            <button className="todo-btn-primary flex-1 justify-center" disabled={!newFolderName.trim()} onClick={handleAddFolder}>
              <Check size={14} />{t('add')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE FOLDER ══════════════════════════════ */}
      <Dialog open={showDeleteFolderConfirm} onOpenChange={() => { setShowDeleteFolderConfirm(false); setFolderToDelete(null); }}>
        <DialogContent className="max-w-sm rounded-2xl" style={{ background: 'var(--cal-surface,#fff)' }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('deleteFolder')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">{t('deleteFolderDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <button className="todo-btn-ghost flex-1 justify-center" onClick={() => { setShowDeleteFolderConfirm(false); setFolderToDelete(null); }}>{t('cancel')}</button>
            <button className="flex-1 h-9 px-4 bg-red-500 border-none rounded-xl text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              onClick={() => handleDeleteFolder(folderToDelete)}>
              <Trash2 size={13} />{t('confirm')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ SETTINGS DIALOG ════════════════════════════ */}
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onUpdateSettings={setSettings} t={t} />
    </div>
  );
}

// ─── Filter Popover ───────────────────────────────────────────────────────────
function FilterPopover({ value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = value === 'all' ? { label: 'all' } : priorityLevels.find(p => p.id === value);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-white text-xs font-semibold"
        style={{ background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.22)' }}>
        <Filter size={12} />
        <span className="hidden lg:inline">{t(`priorities.${selected?.label}`)}</span>
        <ChevronDown size={10} className="opacity-70" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 ltr:right-0 rtl:left-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
          <button onClick={() => { onChange('all'); setOpen(false); }}
            className="w-full px-3 py-2.5 hover:bg-gray-50 text-left text-sm font-medium text-gray-700">
            {t('priorities.all')}
          </button>
          {priorityLevels.slice(1).map(p => (
            <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
              className="w-full px-3 py-2.5 hover:bg-gray-50 text-left flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span className="text-sm font-medium text-gray-700">{t(`priorities.${p.label}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sort Popover ─────────────────────────────────────────────────────────────
function SortPopover({ value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const sortOptions = [
    { id: 'manual', label: 'manual' }, { id: 'dueDate', label: 'dueDate' },
    { id: 'time', label: 'time' }, { id: 'priority', label: 'priority' },
    { id: 'alphabetical', label: 'alphabetical' },
  ];
  const selected = sortOptions.find(s => s.id === value) || sortOptions[0];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-white text-xs font-semibold"
        style={{ background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.22)' }}>
        <TrendingUp size={12} />
        <span className="hidden lg:inline">{t(`sort.${selected.label}`)}</span>
        <ChevronDown size={10} className="opacity-70" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 ltr:right-0 rtl:left-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
          {sortOptions.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
              className={cn('w-full px-3 py-2.5 hover:bg-gray-50 text-left text-sm font-medium text-gray-700', value === opt.id && 'bg-[var(--color-primary-50,#eef2ff)] text-[var(--color-primary-700,#4338ca)]')}>
              {t(`sort.${opt.label}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Detail Sidebar (desktop) ────────────────────────────────────────────
function TaskDetailSidebar({ task, onUpdate, onDelete, onClose, onToggleSubtask, onDeleteSubtask, onEdit, isRTL, t, locale }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const fileInputRef = useRef(null);

  useEffect(() => setTitle(task.title), [task.title]);

  const handleSaveTitle = () => {
    if (title.trim() && title !== task.title) onUpdate(task.id, { title: title.trim() });
    setEditingTitle(false);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newAtts = await uploadFilesToAssets(files);
    onUpdate(task.id, { attachments: [...(task.attachments || []), ...newAtts] });
  };

  return (
    <div className={cn(
      'fixed top-0 h-screen w-[440px] bg-white z-50 overflow-y-auto shadow-2xl',
      isRTL ? 'left-0 border-r border-gray-100' : 'right-0 border-l border-gray-100'
    )} style={{ animation: isRTL ? 'slide-in-left .3s ease-out' : 'slide-in-right .3s ease-out' }}>
      {/* Head */}
      <div className="sticky top-0 z-10 px-5 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(135deg,var(--color-primary-50,#eef2ff),#fff)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('taskDetails')}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-primary-50,#eef2ff)] transition-colors"
              title={t('edit')}>
              <Pencil className="w-4 h-4" style={{ color: 'var(--color-primary-500,#6366f1)' }} />
            </button>
            <button onClick={() => onUpdate(task.id, { isStarred: !task.isStarred })}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors">
              <Star className={cn('w-4 h-4', task.isStarred ? 'fill-amber-500 text-amber-500' : 'text-gray-400')} />
            </button>
            <button onClick={() => onDelete(task.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        {editingTitle ? (
          <input type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            className="w-full text-lg font-bold bg-transparent border-none outline-none text-gray-900"
            style={{ fontSize: '18px' }} autoFocus />
        ) : (
          <h3 onClick={() => setEditingTitle(true)}
            className="text-lg font-bold text-gray-900 cursor-pointer hover:text-[var(--color-primary-600,#4f46e5)] transition-colors leading-snug">
            {task.title}
          </h3>
        )}
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
          <StatusBadge task={task} onUpdate={onUpdate} t={t} />
          <PriorityBadge task={task} onUpdate={onUpdate} t={t} />
          <RepeatBadge task={task} onUpdate={onUpdate} t={t} />
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Attachments */}
        <div>
          <label className="todo-label">
            <Paperclip size={10} />{t('attachments')}
            <button onClick={() => fileInputRef.current?.click()}
              className="ml-auto normal-case font-semibold text-[var(--color-primary-600,#4f46e5)] tracking-normal flex items-center gap-1">
              <Plus size={10} />{t('add')}
            </button>
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
          {task.attachments?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {task.attachments.map((att, i) => (
                <div key={i} className="relative group/att rounded-lg overflow-hidden border border-gray-200">
                  <img src={att.url} alt={att.name} className="w-full h-20 object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <a href={att.url} download={att.name} className="w-6 h-6 bg-white/90 rounded flex items-center justify-center">
                      <Download className="w-3 h-3 text-gray-700" />
                    </a>
                    <button onClick={() => onUpdate(task.id, { attachments: task.attachments.filter((_, j) => j !== i) })}
                      className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date / time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="todo-label"><Calendar size={10} />{t('dueDate')}</label>
            <Flatpickr value={task.dueDate || ''}
              onChange={([d]) => onUpdate(task.id, { dueDate: d ? d.toISOString().split('T')[0] : null })}
              options={{ dateFormat: 'Y-m-d', locale }}
              className="todo-input" placeholder={t('selectDate')} />
          </div>
          <div>
            <label className="todo-label"><Clock size={10} />{t('time')}</label>
            <Flatpickr value={task.dueTime || ''}
              onChange={([d]) => { if (d) { const hh = String(d.getHours()).padStart(2, '0'); const mm = String(d.getMinutes()).padStart(2, '0'); onUpdate(task.id, { dueTime: `${hh}:${mm}` }); } }}
              options={{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }}
              className="todo-input" placeholder={t('selectTime')} />
          </div>
        </div>

        {/* Subtasks */}
        <TaskSubtasksSection task={task} onUpdate={onUpdate} onToggleSubtask={onToggleSubtask} onDeleteSubtask={onDeleteSubtask} t={t} />

        {/* Notes */}
        <div>
          <label className="todo-label"><FileText size={10} />{t('notes')}</label>
          <textarea value={task.notes || ''}
            onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
            placeholder={t('notesPlaceholder')} rows={4}
            className="todo-input" style={{ resize: 'vertical', fontSize: '16px' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ task, onUpdate, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const status = statusOptions.find(s => s.id === task.status) || statusOptions[0];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
        style={{ background: status.color }}>
        <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
        {t(`status.${status.label}`)}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[150px]">
          {statusOptions.map(s => (
            <button key={s.id} onClick={() => { onUpdate(task.id, { status: s.id }); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-sm font-medium text-gray-700">{t(`status.${s.label}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ task, onUpdate, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const priority = priorityLevels.find(p => p.id === task.priority);
  if (!priority || task.priority === 'none') return null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
        style={{ background: priority.color }}>
        <Flag size={10} />{t(`priorities.${priority.label}`)}<ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[150px]">
          {priorityLevels.slice(1).map(p => (
            <button key={p.id} onClick={() => { onUpdate(task.id, { priority: p.id }); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-sm font-medium text-gray-700">{t(`priorities.${p.label}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RepeatBadge({ task, onUpdate, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const repeat = repeatOptions.find(r => r.id === task.repeat);
  if (!repeat || task.repeat === 'none') return null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500 text-xs font-bold text-white">
        <Repeat size={10} />{t(`repeat.${repeat.label}`)}<ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[150px]">
          {repeatOptions.map(r => (
            <button key={r.id} onClick={() => { onUpdate(task.id, { repeat: r.id }); setOpen(false); }}
              className="w-full px-3 py-2 hover:bg-gray-50 text-left text-sm font-medium text-gray-700">
              {t(`repeat.${r.label}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subtasks Section ─────────────────────────────────────────────────────────
function TaskSubtasksSection({ task, onUpdate, onToggleSubtask, onDeleteSubtask, t }) {
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (newTitle.trim()) {
      try {
        await api.post(`/tasks/${task.id}/subtasks`, { title: newTitle.trim(), completed: false });
        const refreshed = await api.get(`/todos/${task.id}`);
        onUpdate(task.id, normalizeTask(refreshed?.data ?? refreshed));
      } catch {}
      setNewTitle(''); setShowInput(false);
    }
  };

  return (
    <div>
      <label className="todo-label">
        <CheckCircle size={10} />{t('subtasks')}
        <button onClick={() => setShowInput(true)}
          className="ml-auto normal-case font-semibold tracking-normal flex items-center gap-1"
          style={{ color: 'var(--color-primary-600,#4f46e5)' }}>
          <Plus size={10} />{t('add')}
        </button>
      </label>
      <div className="space-y-1.5 mb-2 mt-1">
        {task.subtasks?.map(st => (
          <div key={st.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group/st transition-colors">
            <CustomCheckbox checked={st.completed} onCheckedChange={() => onToggleSubtask(task.id, st.id)} size="sm" />
            <span className={cn('text-sm flex-1 font-medium', st.completed ? 'line-through text-gray-400' : 'text-gray-700')}>{st.title}</span>
            <button onClick={() => onDeleteSubtask(task.id, st.id)}
              className="opacity-0 group-hover/st:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-red-50">
              <X className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ))}
      </div>
      {showInput && (
        <form onSubmit={handleAdd} className="flex gap-2 mt-1">
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('subtaskPlaceholder')}
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-primary-400,#818cf8)]"
            style={{ fontSize: '16px' }} autoFocus />
          <button type="submit"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg,var(--color-gradient-from,#6366f1),var(--color-gradient-to,#a855f7))' }}>
            <Check className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setShowInput(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Settings Dialog ──────────────────────────────────────────────────────────
function SettingsDialog({ open, onClose, settings, onUpdateSettings, t }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl" style={{ background: 'var(--cal-surface,#fff)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Settings size={18} style={{ color: 'var(--color-primary-500,#6366f1)' }} /> {t('settings')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {[
            { key: 'soundEnabled', label: t('soundEffects'), desc: t('soundEffectsDesc'), icon: Volume2 },
            { key: 'showCompleted', label: t('showCompleted'), desc: t('showCompletedDesc'), icon: Eye },
          ].map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <Icon size={15} className="text-gray-500" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
              <Switch checked={settings[key]} onCheckedChange={(v) => onUpdateSettings({ ...settings, [key]: v })} />
            </div>
          ))}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-sm font-semibold text-gray-800 mb-2">{t('addTaskPosition')}</div>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'top', label: t('addToTop'), Icon: ArrowUp }, { id: 'bottom', label: t('addToBottom'), Icon: ArrowDown }].map(({ id, label, Icon }) => (
                <button key={id}
                  onClick={() => onUpdateSettings({ ...settings, addTaskPosition: id })}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                    settings.addTaskPosition === id
                      ? 'border-[var(--color-primary-400,#818cf8)] text-[var(--color-primary-700,#4338ca)]'
                      : 'border-gray-200 text-gray-600 hover:bg-white'
                  )}
                  style={settings.addTaskPosition === id ? { background: 'var(--color-primary-50,#eef2ff)' } : {}}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button className="todo-btn-primary w-full justify-center" onClick={onClose}>
            <Check size={14} />{t('done')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}