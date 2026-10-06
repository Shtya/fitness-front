"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import "@/components/pages/dashboard/users/roster/roster.css";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarDays, Clock,
  Check, Pencil, Trash2, X, Plus, Settings,
  Repeat, CheckCircle2, Circle, Target, CheckSquare, Users, Bell,
  DollarSign, Phone, Music, Book, Heart, Star, Mail, ShoppingCart,
  Dumbbell, Lightbulb, Flame, LayoutGrid, Calendar,
  Sparkles, ListTodo, Home, FileText,
} from "lucide-react";
import { Play, Pause, RotateCcw, Zap, Trophy } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import api from "@/utils/axios";
import MultiLangText from "@/components/atoms/MultiLangText";

// ─── Styles ──────────────────────────────────────────────────────────────────
const DESIGN_STYLES = `
  :root {
    --cal-bg:        transparent;
    --cal-surface:   var(--gm-paper, #fff);
    --cal-surface2:  color-mix(in srgb, var(--gm-ink, #0f172a) 4%, var(--gm-paper, #fff));
    --cal-surface3:  color-mix(in srgb, var(--color-primary-500) 8%, var(--gm-paper, #fff));
    --cal-surface4:  color-mix(in srgb, var(--gm-ink, #0f172a) 10%, var(--gm-paper, #fff));
    --cal-border:    var(--gm-line, rgba(15,23,42,.08));
    --cal-border2:   var(--gm-line, rgba(15,23,42,.12));
    --cal-border3:   color-mix(in srgb, var(--gm-ink, #0f172a) 18%, transparent);
    --cal-text:      var(--gm-ink, #0f172a);
    --cal-text2:     var(--gm-ink-soft, #334155);
    --cal-text3:     var(--gm-muted, #64748b);
    --cal-accent:    var(--color-primary-600);
    --cal-accent-lt: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
    --cal-accent-gl: color-mix(in srgb, var(--color-primary-500) 28%, transparent);
    --cal-radius:    16px;
    --cal-radius-sm: 12px;
    --cal-font-d:    var(--gm-display, inherit);
    --cal-font-b:    var(--gm-font, system-ui, sans-serif);
    --cal-shadow:    0 1px 2px rgba(15,23,42,.05), 0 12px 28px -18px rgba(15,23,42,.22);
    --cal-grad:      linear-gradient(180deg, var(--color-primary-500), var(--color-primary-600));
    --cal-ease:      cubic-bezier(.16,1,.3,1);
  }
  .cal-wrap { font-family: var(--cal-font-b); color: var(--cal-text); }
  .cal-wrap * { box-sizing: border-box; }
  .cal-wrap ::-webkit-scrollbar { width:4px; height:4px; }
  .cal-wrap ::-webkit-scrollbar-thumb { background:var(--cal-surface4); border-radius:4px; }
  .cal-wrap { scrollbar-width:thin; scrollbar-color:var(--cal-surface4) transparent; }

  /* ── All inputs / selects / textareas: 16px to prevent iOS zoom ── */
  .cal-input,
  .cal-input[type="text"],
  .cal-input[type="date"],
  .cal-input[type="time"],
  .cal-input[type="number"],
  .cal-input[type="datetime-local"],
  .cal-wrap textarea.cal-input,
  .cal-wrap select.cal-input,
  [data-cal-input] {
    font-size: 16px !important;
  }

  .cal-hero { position:relative; padding:8px 8px 0; background:transparent; }
  .cal-hero-noise, .cal-hero-dots, .cal-hero-orb1, .cal-hero-orb2, .cal-hero-hl, .cal-hero::before { display:none; }
  .cal-hero-toprow { position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
  .cal-hero-nav { display:flex; align-items:center; gap:8px; }
  .cal-hero-navbtn, .cal-hero-icon-btn, .cal-commit-btn { width:40px; height:40px; border-radius:12px; background:var(--gm-paper); border:1px solid var(--gm-line); color:var(--gm-ink-soft); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:border-color .15s ease, background-color .15s ease; }
  .cal-hero-navbtn:hover, .cal-hero-icon-btn:hover, .cal-commit-btn:hover { border-color:color-mix(in srgb, var(--color-primary-500) 35%, var(--gm-line)); }
  .cal-hero-icon-btn.active { color:var(--color-primary-700); border-color:color-mix(in srgb, var(--color-primary-500) 45%, transparent); background:color-mix(in srgb, var(--color-primary-500) 8%, var(--gm-paper)); }
  .cal-hero-month { font-family:var(--cal-font-d); font-size:clamp(20px, 2.2vw, 28px); font-weight:700; color:var(--gm-ink); letter-spacing:-.03em; line-height:1.1; }
  .cal-hero-month span { color:var(--gm-muted); font-size:.72em; margin-inline-start:8px; font-weight:600; }
  .cal-hero-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .cal-hero-btn-glass { height:40px; padding:0 14px; background:var(--gm-paper); border:1px solid var(--gm-line); border-radius:12px; color:var(--gm-ink-soft); font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:border-color .15s ease; white-space:nowrap; }
  .cal-hero-btn-glass:hover { border-color:color-mix(in srgb, var(--color-primary-500) 35%, var(--gm-line)); }
  .cal-hero-btn-solid { height:40px; padding:0 16px; background:linear-gradient(180deg, var(--color-primary-500), var(--color-primary-600)); border:1px solid color-mix(in srgb, var(--color-primary-700) 40%, transparent); border-radius:12px; color:#fff; font-size:13px; font-weight:650; display:flex; align-items:center; gap:6px; cursor:pointer; transition:transform .15s ease; box-shadow:inset 0 1px 0 rgba(255,255,255,.25); white-space:nowrap; }
  .cal-hero-btn-solid:hover { transform:translateY(-1px); }
  .cal-hero-btn-solid:active { transform:translateY(0); }
  .cal-commit-wrap { display:flex; align-items:center; gap:10px; padding:6px 10px; background:var(--gm-paper); border:1px solid var(--gm-line); border-radius:14px; }
  .cal-commit-label { font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--gm-muted); display:block; margin-bottom:1px; }
  .cal-commit-time { font-size:13px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--gm-ink); }
  .cal-commit-idle { font-size:12px; color:var(--gm-muted); }
  .cal-commit-btn { width:28px; height:28px; border-radius:8px; }
  .cal-type-strip { position:relative; z-index:10; display:flex; align-items:center; gap:8px; padding-bottom:14px; overflow-x:auto; scrollbar-width:none; }
  .cal-type-strip::-webkit-scrollbar { display:none; }
  .cal-type-chip { display:flex; align-items:center; gap:6px; height:32px; padding:0 12px; border-radius:999px; border:1px solid var(--gm-line); background:color-mix(in srgb, var(--gm-muted) 8%, var(--gm-paper)); color:var(--gm-ink-soft); font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; transition:border-color .15s ease, background-color .15s ease, color .15s ease; }
  .cal-type-chip:hover { border-color:color-mix(in srgb, var(--color-primary-500) 30%, var(--gm-line)); }
  .cal-type-chip.active { background:color-mix(in srgb, var(--color-primary-500) 10%, var(--gm-paper)); color:var(--color-primary-700); border-color:color-mix(in srgb, var(--color-primary-500) 40%, transparent); }
  .cal-type-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .cal-type-count { font-size:10px; font-weight:700; min-width:16px; text-align:center; background:color-mix(in srgb, var(--gm-ink) 8%, transparent); padding:1px 5px; border-radius:999px; }
  .cal-type-chip.active .cal-type-count { background:var(--color-primary-600); color:#fff; opacity:1; }

  /* ── Body layout ── */
  .cal-body { display:flex; flex:1; }
  .cal-main { flex:1; padding:16px 20px 24px; min-width:0; }

  /* ── Desktop day headers ── */
  .cal-day-headers { display:grid; grid-template-columns:repeat(7,1fr); margin-bottom:4px; }
  .cal-day-header { text-align:center; font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--cal-text3); padding:8px 0; }
  .cal-day-header.weekend { color:var(--cal-accent); opacity:.6; }

  /* ── Desktop grid ── */
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; background:var(--cal-border); border-radius:var(--cal-radius); overflow:hidden; border:1px solid var(--cal-border); box-shadow:var(--cal-shadow); }
  .cal-cell { background:var(--cal-surface); min-height:110px; padding:8px; cursor:pointer; transition:background .15s; display:flex; flex-direction:column; gap:3px; position:relative; }
  .cal-cell:hover { background:var(--cal-surface2); }
  .cal-cell.empty { background:var(--cal-bg); cursor:default; pointer-events:none; }
  .cal-cell.today { background:var(--cal-accent-lt); }
  .cal-cell.today::after { content:''; position:absolute; inset:0; border:1.5px solid var(--cal-accent-gl); pointer-events:none; }
  .cal-cell.selected:not(.today) { background:var(--cal-surface2); }
  .cal-cell.weekend { background:rgba(0,0,0,.01); }
  .cal-cell.weekend:hover { background:var(--cal-surface2); }
  .cal-date-num { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:8px; font-size:13px; font-weight:500; color:var(--cal-text2); transition:all .15s; font-variant-numeric:tabular-nums; flex-shrink:0; }
  .cal-cell:hover .cal-date-num { color:var(--cal-text); }
  .cal-cell.today .cal-date-num { background:var(--cal-grad); color:#fff; font-weight:700; box-shadow:0 2px 8px var(--cal-accent-gl); }
  .cal-cell.selected:not(.today) .cal-date-num { background:var(--cal-surface3); color:var(--cal-accent); font-weight:600; }
  .cal-event-pill { display:flex; align-items:center; gap:4px; padding:3px 6px; border-radius:5px; font-size:10px; font-weight:500; color:var(--cal-text); border:1px solid transparent; cursor:pointer; transition:opacity .15s; overflow:hidden; line-height:1.3; }
  .cal-event-pill.done { opacity:.4; }
  .cal-event-pill-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
  .cal-event-pill-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cal-event-pill-check { flex-shrink:0; background:transparent; border:none; color:inherit; cursor:pointer; opacity:.5; padding:0; display:flex; align-items:center; transition:opacity .15s; }
  .cal-event-pill-check:hover { opacity:1; }
  .cal-cell-more { font-size:10px; color:var(--cal-text3); padding:1px 6px; font-weight:500; }
  .cal-week-num-cell { background:var(--cal-bg); min-height:110px; display:flex; align-items:flex-start; justify-content:center; padding-top:10px; font-size:10px; font-weight:700; color:var(--cal-text3); letter-spacing:.05em; border-right:1px solid var(--cal-border); }

  /* ══════════════════════════════════════════════
     MOBILE COMPACT CALENDAR
  ══════════════════════════════════════════════ */
  .cal-mob-wrap { padding:10px 10px 0; background:var(--cal-bg); }
  .cal-mob-dh { display:grid; grid-template-columns:repeat(7,1fr); margin-bottom:4px; }
  .cal-mob-dh-cell { text-align:center; font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--cal-text3); padding:4px 0; }
  .cal-mob-dh-cell.wknd { color:var(--cal-accent); opacity:.7; }
  .cal-mob-week { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:2px; }
  .cal-mob-cell { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:10px; cursor:pointer; transition:all .15s; position:relative; -webkit-tap-highlight-color:transparent; }
  .cal-mob-cell.empty { pointer-events:none; }
  .cal-mob-cell:active { transform:scale(.88); }
  .cal-mob-num { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:13px; font-weight:500; color:var(--cal-text2); font-variant-numeric:tabular-nums; transition:all .15s; }
  .cal-mob-cell.today .cal-mob-num { background:var(--cal-grad); color:#fff; font-weight:700; box-shadow:0 2px 8px var(--cal-accent-gl); }
  .cal-mob-cell.sel:not(.today) .cal-mob-num { background:var(--cal-accent); color:#fff; font-weight:700; box-shadow:0 2px 10px var(--cal-accent-gl); }
  .cal-mob-cell.wknd:not(.today):not(.sel) .cal-mob-num { color:var(--cal-accent); opacity:.8; }
  .cal-mob-dots { display:flex; align-items:center; justify-content:center; gap:2px; margin-top:2px; height:5px; }
  .cal-mob-dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; }

  /* ── Sidebar ── */
  .cal-sidebar { width:340px; background:var(--cal-surface);  display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; }
  .cal-sidebar { border-inline-start:1px solid var(--gm-line); }
  .cal-sidebar-head { padding:18px 18px 14px; background:var(--gm-paper); border-bottom:1px solid var(--gm-line); }
  .cal-sidebar-date-row { position:relative; z-index:1; display:flex; align-items:flex-end; gap:14px; margin-bottom:14px; }
  .cal-sidebar-day-num { font-family:var(--cal-font-d); font-size:56px; font-weight:700; line-height:.9; letter-spacing:-.04em; color:var(--gm-ink); }
  .cal-sidebar-day-name { font-family:var(--cal-font-d); font-size:18px; font-weight:700; color:var(--gm-ink); line-height:1.2; }
  .cal-sidebar-my { font-size:12px; color:var(--gm-muted); font-weight:600; margin-top:2px; }
  .cal-prog-wrap { position:relative; z-index:1; background:color-mix(in srgb, var(--gm-ink) 10%, transparent); border-radius:100px; height:4px; overflow:hidden; margin-bottom:6px; }
  .cal-prog-bar { height:100%; border-radius:100px; background:linear-gradient(90deg, var(--color-primary-500), var(--color-primary-600)); transition:width .5s var(--cal-ease); }
  .cal-prog-lbl { position:relative; z-index:1; font-size:12px; color:var(--gm-muted); font-weight:600; }
  .cal-prog-lbl strong { color:var(--gm-ink); }
  .cal-sidebar-add { margin:14px 16px 0; padding:10px 14px; background:var(--cal-accent-lt); border:1px dashed var(--cal-accent-gl); border-radius:10px; color:var(--cal-accent); font-family:var(--cal-font-b); font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; transition:all .2s; width:calc(100% - 32px); }
  .cal-sidebar-add:hover { background:color-mix(in srgb,var(--color-primary-500,#6366f1) 20%,transparent); border-style:solid; }
  .cal-sidebar-items { flex:1; overflow-y:auto; padding:12px 12px 24px; display:flex; flex-direction:column; gap:8px; }
  .cal-item-card { background:var(--cal-surface2); border:1px solid var(--cal-border); border-radius:12px; padding:12px 12px 12px 15px; display:flex; align-items:flex-start; gap:10px; transition:all .2s; position:relative; overflow:hidden; }
  .cal-item-card:hover { border-color:var(--cal-border2); background:var(--cal-surface3); box-shadow:var(--cal-shadow); }
  .cal-item-card.done { opacity:.45; }
  .cal-item-accent { position:absolute; inset-inline-start:0; top:0; bottom:0; width:3px; }
  .cal-item-check { flex-shrink:0; background:transparent; border:none; color:var(--cal-text3); cursor:pointer; padding:0; display:flex; align-items:center; transition:color .15s; margin-top:1px; }
  .cal-item-check:hover { color:#16a34a; }
  .cal-item-check.done { color:#16a34a; }

  /* ── Mobile item check — bigger tap target ── */
  .cal-item-check-mob {
    flex-shrink:0; background:transparent; border:none;
    color:var(--cal-text3); cursor:pointer;
    padding:6px; margin:-6px;          /* bigger hit area */
    display:flex; align-items:center; justify-content:center;
    transition:color .15s; margin-top:-3px;
    -webkit-tap-highlight-color:transparent;
    min-width:44px; min-height:44px;  /* iOS 44×44 touch target */
  }
  .cal-item-check-mob:active { transform:scale(.88); }
  .cal-item-check-mob.done { color:#16a34a; }

  .cal-item-body { flex:1; min-width:0; }
  .cal-item-title { font-size:13px; font-weight:500; color:var(--cal-text); line-height:1.4; margin-bottom:5px; }
  .cal-item-title.done { text-decoration:line-through; color:var(--cal-text3); }
  .cal-item-note { font-size:11px; color:var(--cal-text3); line-height:1.5; margin-bottom:6px; }
  .cal-item-meta { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
  .cal-item-badge { display:inline-flex; align-items:center; gap:3px; padding:2px 7px; border-radius:100px; font-size:10px; font-weight:600; background:var(--cal-surface3); color:var(--cal-text2); border:1px solid var(--cal-border); }
  .cal-item-actions { display:flex; gap:2px; opacity:0; transition:opacity .15s; flex-shrink:0; }
  .cal-item-card:hover .cal-item-actions { opacity:1; }
  /* On mobile always show actions */
  @media (max-width:640px) {
    .cal-item-actions { opacity:1 !important; }
  }
  .cal-action-btn { width:26px; height:26px; background:transparent; border:none; border-radius:6px; color:var(--cal-text3); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .cal-action-btn:hover { background:var(--cal-surface4); color:var(--cal-text); }
  .cal-action-btn.danger:hover { background:rgba(239,68,68,.1); color:#ef4444; }
  .cal-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; gap:10px; flex:1; }
  .cal-empty-icon { width:48px; height:48px; background:var(--cal-surface2); border:1px solid var(--cal-border); border-radius:14px; display:flex; align-items:center; justify-content:center; color:var(--cal-text3); }
  .cal-empty-title { font-size:14px; font-weight:500; color:var(--cal-text2); }
  .cal-empty-sub { font-size:12px; line-height:1.55; color:var(--cal-text3); max-width:220px; }

  /* ── Drawers ── */
  .cal-drawer { background:var(--cal-surface); border-right:1px solid var(--cal-border); box-shadow:8px 0 32px rgba(0,0,0,.1); }
  .cal-drawer-head { padding:18px 20px; border-bottom:1px solid var(--cal-border); display:flex; align-items:center; justify-content:space-between; }
  .cal-drawer-title { font-family:var(--cal-font-d); font-size:18px; font-weight:400; color:var(--cal-text); display:flex; align-items:center; gap:10px; }
  .cal-section-lbl { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--cal-text3); padding:0 4px; margin-bottom:6px; }

  /* ── Item form ── */
  .cal-form-wrap { background:var(--cal-surface); border-radius:var(--cal-radius); overflow:hidden; }
  .cal-form-head { padding:16px 18px 14px; border-bottom:1px solid var(--cal-border); display:flex; align-items:center; justify-content:space-between; }
  .cal-form-htitle { font-family:var(--cal-font-d); font-size:16px; font-weight:400; color:var(--cal-text); display:flex; align-items:center; gap:8px; }
  .cal-form-icon { width:30px; height:30px; background:var(--cal-grad); border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 8px var(--cal-accent-gl); }
  .cal-form-body { padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
  .cal-form-footer { padding:12px 18px 16px; border-top:1px solid var(--cal-border); display:flex; gap:8px; }
  .cal-label { font-size:10px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--cal-text3); display:flex; align-items:center; gap:4px; margin-bottom:5px; }
  .cal-input {
    width:100%;
    background:var(--cal-surface2);
    border:1px solid var(--cal-border2);
    border-radius:var(--cal-radius-sm);
    padding:8px 11px;
    color:var(--cal-text);
    font-family:var(--cal-font-b);
    font-size:16px;  /* Always 16px to prevent iOS zoom */
    outline:none;
    transition:border-color .2s,box-shadow .2s;
  }
  .cal-input:focus { border-color:var(--cal-accent-gl); box-shadow:0 0 0 3px color-mix(in srgb,var(--color-primary-500,#6366f1) 8%,transparent); }
  .cal-input::placeholder { color:var(--cal-text3); }
  .cal-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .cal-btn-ghost { height:34px; padding:0 14px; background:transparent; border:1px solid var(--cal-border2); border-radius:10px; color:var(--cal-text2); font-family:var(--cal-font-b); font-size:13px; font-weight:500; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; }
  .cal-btn-ghost:hover { background:var(--cal-surface2); color:var(--cal-text); border-color:var(--cal-border3); }
  .cal-btn-primary { height:34px; padding:0 16px; background:var(--cal-grad); border:none; border-radius:10px; color:#fff; font-family:var(--cal-font-b); font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; box-shadow:0 2px 12px var(--cal-accent-gl); }
  .cal-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 20px var(--cal-accent-gl); }
  .cal-btn-primary:disabled { opacity:.45; transform:none; cursor:not-allowed; }
  .cal-btn-icon { width:34px; height:34px; background:var(--cal-surface2); border:1px solid var(--cal-border); border-radius:10px; color:var(--cal-text2); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; }
  .cal-btn-icon:hover { background:var(--cal-surface3); color:var(--cal-text); border-color:var(--cal-border2); }
  .cal-btn-icon.active { background:var(--cal-accent-lt); color:var(--cal-accent); border-color:var(--cal-accent-gl); }
  .cal-day-pill { padding:5px 9px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; border:1px solid var(--cal-border2); background:var(--cal-surface2); color:var(--cal-text3); }
  .cal-day-pill.sel { background:var(--cal-grad); border-color:transparent; color:#fff; }
  .cal-type-row { display:flex; align-items:center; gap:6px; padding:7px 10px; border-radius:10px; cursor:pointer; transition:background .15s; color:var(--cal-text2); font-size:13px; font-weight:500; }
  .cal-type-row:hover { background:var(--cal-surface3); color:var(--cal-text); }
  .cal-type-row.active { background:var(--cal-accent-lt); color:var(--cal-text); }
  .cal-type-row-badge { margin-left:auto; font-size:10px; font-weight:700; background:var(--cal-grad); color:#fff; padding:1px 7px; border-radius:100px; }
  .cal-color-swatch { width:36px; height:36px; border-radius:8px; cursor:pointer; transition:all .2s; border:2px solid transparent; }
  .cal-color-swatch.sel { transform:scale(1.1); border-color:rgba(0,0,0,.15); }
  .cal-icon-opt { padding:8px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; border:1px solid var(--cal-border); background:var(--cal-surface2); color:var(--cal-text2); }
  .cal-icon-opt:hover { border-color:var(--cal-border2); color:var(--cal-text); }
  .cal-icon-opt.sel { background:var(--cal-grad); border-color:transparent; color:#fff; }
  .cal-settings-row { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--cal-surface2); border:1px solid var(--cal-border); border-radius:10px; }
  .cal-settings-lbl { font-size:13px; font-weight:500; color:var(--cal-text); }
  .cal-settings-desc { font-size:11px; color:var(--cal-text3); margin-top:2px; }
  .cal-overlay { background:rgba(0,0,0,.35); backdrop-filter:blur(6px); }
  .cal-prog-ring { flex-shrink:0; }

  /* ── Desktop slide panel for add/edit ── */
  .cal-desk-panel-overlay { position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.25); backdrop-filter:blur(4px); }
  .cal-desk-panel {
    position:fixed; top:0; bottom:0; inset-inline-end:0; z-index:61;
    width: min(480px, 44vw);
    background:var(--gm-paper);
    border-inline-start:1px solid var(--gm-line);
    box-shadow:-12px 0 48px rgba(15,23,42,.12);
    display:flex; flex-direction:column;
    overflow:hidden;
  }
  .cal-desk-panel[dir="rtl"] { box-shadow:12px 0 48px rgba(15,23,42,.12); }
  .cal-desk-panel-head {
    padding:18px 20px 14px;
    border-bottom:1px solid var(--gm-line);
    display:flex; align-items:center; justify-content:space-between;
    background:var(--gm-paper);
  }
  .cal-desk-panel-htitle { font-family:var(--cal-font-d); font-size:18px; font-weight:700; color:var(--gm-ink); display:flex; align-items:center; gap:10px; }
  .cal-desk-panel-icon { width:32px; height:32px; background:linear-gradient(150deg, var(--color-gradient-from), var(--color-gradient-to)); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; }
  .cal-desk-panel-close { width:34px; height:34px; background:transparent; border:1px solid var(--gm-line); border-radius:10px; color:var(--gm-ink-soft); display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .cal-desk-panel-close:hover { background:color-mix(in srgb, var(--gm-ink) 6%, transparent); }
  .cal-type-row-badge { margin-inline-start:auto; margin-left:0; }
  html.dark .cal-desk-panel { box-shadow:-12px 0 48px rgba(0,0,0,.45); }
  .cal-desk-panel-body { flex:1; overflow-y:auto; }

  /* ── Responsive ── */
  @media (max-width:1024px) { .cal-sidebar { display:none !important; } }

  @media (min-width:641px) {
    .cal-mob-wrap { display:none !important; }
    .cal-main { display:block; }
  }
  @media (max-width:640px) {
    .cal-main { display:none !important; }
    .cal-mob-wrap { display:block; }
    .cal-hero { padding:14px 16px 0; }
    .cal-hero-month { font-size:17px; }
    .cal-hero-month span { font-size:15px; }
    /* Mobile: bigger action buttons on item cards */
    .cal-action-btn { width:32px; height:32px; }
  }
`;

function DesignStyles() {
  useEffect(() => {
    document.getElementById("cal-ds-v5")?.remove();
    const id = "cal-ds-v6";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = DESIGN_STYLES;
    document.documentElement.dataset.gmUsers = "1";
    return () => { delete document.documentElement.dataset.gmUsers; };
  }, []);
  return null;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const apiGet    = async (ep, cfg) => (await api.get(ep, cfg)).data;
const apiPost   = async (ep, d, cfg) => (await api.post(ep, d, cfg)).data;
const apiPut    = async (ep, d, cfg) => (await api.put(ep, d, cfg)).data;
const apiPatch  = async (ep, d, cfg) => (await api.patch(ep, d, cfg)).data;
const apiDelete = async (ep, cfg) => (await api.delete(ep, cfg)).data;

// ─── Constants ────────────────────────────────────────────────────────────────
const ICON_COMPONENTS = {
  Target, CheckSquare, Users, Bell, DollarSign, Phone, Music,
  Book, Heart, Star, Mail, ShoppingCart, Dumbbell, Lightbulb, Flame, LayoutGrid,
};

const COLOR_OPTIONS = [
  { value:"bg-gradient-to-br from-rose-400 via-pink-400 to-rose-500",    text:"text-white", border:"border-rose-300",    ring:"ring-rose-500",    nameKey:"colors.red",    hex:"#f43f5e", bg:"rgba(244,63,94,.14)"  },
  { value:"bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500",    text:"text-white", border:"border-blue-300",    ring:"ring-blue-500",    nameKey:"colors.blue",   hex:"#3b82f6", bg:"rgba(59,130,246,.14)" },
  { value:"bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500", text:"text-white", border:"border-emerald-300", ring:"ring-emerald-500", nameKey:"colors.green",  hex:"#10b981", bg:"rgba(16,185,129,.14)" },
  { value:"theme-gradient-bg", text:"text-white", border:"theme-soft-border", ring:"ring-primary-500", nameKey:"colors.purple", hex:"#6366f1", bg:"rgba(99,102,241,.14)", isTheme:true },
  { value:"bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500",text:"text-white", border:"border-amber-300",   ring:"ring-amber-500",   nameKey:"colors.orange", hex:"#f59e0b", bg:"rgba(245,158,11,.14)" },
  { value:"bg-gradient-to-br from-indigo-400 via-violet-400 to-indigo-500",text:"text-white",border:"border-indigo-300", ring:"ring-indigo-500",  nameKey:"colors.indigo", hex:"#8b5cf6", bg:"rgba(139,92,246,.14)" },
];

const TYPE_HEX_MAP = {
  all:      { hex:"var(--color-primary-400,#818cf8)", bg:"rgba(129,140,248,.12)" },
  habit:    { hex:"#10b981", bg:"rgba(16,185,129,.12)"  },
  task:     { hex:"var(--color-primary-500,#6366f1)", bg:"rgba(99,102,241,.12)" },
  meeting:  { hex:"#a855f7", bg:"rgba(168,85,247,.12)"  },
  reminder: { hex:"#f59e0b", bg:"rgba(245,158,11,.12)"  },
  billing:  { hex:"#f43f5e", bg:"rgba(244,63,94,.12)"   },
};
const resolveTypeHex = (type) => TYPE_HEX_MAP[type?.id] || TYPE_HEX_MAP.task;

const DEFAULT_TYPES = [
  { id:"all",      nameKey:"types.all",      color:"bg-gradient-to-br from-gray-100 to-gray-200", textColor:"text-gray-800", border:"border-gray-300",    ring:"ring-gray-500",    icon:"LayoutGrid" },
  { id:"habit",    nameKey:"types.habit",    color:"bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500", textColor:"text-white", border:"border-emerald-300", ring:"ring-emerald-500", icon:"Target"     },
  { id:"task",     nameKey:"types.task",     color:"theme-gradient-bg",                           textColor:"text-white", border:"theme-soft-border",   ring:"ring-primary-500", icon:"CheckSquare" },
  { id:"meeting",  nameKey:"types.meeting",  color:"bg-gradient-to-br from-purple-400 via-fuchsia-400 to-purple-500", textColor:"text-white", border:"border-purple-300", ring:"ring-purple-500", icon:"Users"      },
  { id:"reminder", nameKey:"types.reminder", color:"bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500", textColor:"text-white", border:"border-amber-300", ring:"ring-amber-500", icon:"Bell"       },
  { id:"billing",  nameKey:"types.billing",  color:"bg-gradient-to-br from-rose-400 via-pink-400 to-rose-500", textColor:"text-white", border:"border-rose-300", ring:"ring-rose-500", icon:"DollarSign" },
];

const ENDPOINTS = {
  state:      "/calendar/state",
  items:      "/calendar/items",
  itemById:   (id) => `/calendar/items/${id}`,
  types:      "/calendar/types",
  typeById:   (id) => `/calendar/types/${id}`,
  completions:"/calendar/completions",
  settings:   "/calendar/settings",
  sound:      "/calendar/sound",
};

// TAB_OPTIONS kept for settings dialog and internal use but NOT rendered as a select in hero
const TAB_OPTIONS = [
  { value:"boards",   label:"kanbanBoard", icon:Home        },
  { value:"calendar", label:"calendar",    icon:CalendarIcon },
  { value:"tasks",    label:"todos",       icon:ListTodo     },
];

// ─── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 24 }) {
  const r = size / 2 - 2.5, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="cal-prog-ring" style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(99,102,241,.12)" strokeWidth="2.5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#cpg)" strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset .5s cubic-bezier(.16,1,.3,1)" }}/>
      <defs>
        <linearGradient id="cpg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="var(--color-gradient-from,#6366f1)"/>
          <stop offset="100%" stopColor="var(--color-gradient-to,#a855f7)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Desktop Side Panel (slide in from right/left) ────────────────────────────
function DesktopSidePanel({ open, onClose, title, children, isRTL }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="desk-overlay"
            className="cal-desk-panel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="desk-panel"
            className="cal-desk-panel"
            dir={isRTL ? "rtl" : "ltr"}
            initial={{ x: isRTL ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? "-100%" : "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cal-desk-panel-head">
              <div className="cal-desk-panel-htitle">
                <div className="cal-desk-panel-icon"><Sparkles size={15}/></div>
                {title}
              </div>
              <button className="cal-desk-panel-close" onClick={onClose}>
                <X size={15}/>
              </button>
            </div>
            <div className="cal-desk-panel-body">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Mobile Slide Panel (bottom sheet) ────────────────────────────────────────
function SlidePanel({ open, onClose, children, title, className }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            key="panel"
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 flex flex-col",
              "bg-[var(--cal-surface)] rounded-t-3xl shadow-2xl",
              "max-h-[92vh] overflow-hidden",
              className
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--cal-border3)]" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-[var(--cal-border)] flex-shrink-0">
                <span className="font-[var(--cal-font-d)] text-[17px] font-normal text-[var(--cal-text)]">{title}</span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--cal-surface3)] text-[var(--cal-text2)] hover:bg-[var(--cal-surface4)] transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Shared Item Card ─────────────────────────────────────────────────────────
function ItemCard({ item, date, dateStr, eventTypes, completions, onToggle, onEdit,
  onDelete, getTypeLabel, renderIcon, formatTime, t, dayNames, isRTL, source }) {

  const isMobile = source === "mobile";
  const type   = eventTypes.find(tt => tt.id === item.type);
  const { hex, bg } = resolveTypeHex(type);
  const done   = !!completions[`${item.id}_${dateStr}`];
  const recLabel = item.recurrence === "none" ? "" :
    item.recurrence === "every_x_days"
      ? t("everyXDaysLabel", { count: item.recurrenceInterval })
      : t(`recurrenceLabels.${item.recurrence}`);

  if (isMobile) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-white/80 bg-[#eef2f9] px-4 py-3 shadow-[5px_5px_8px_rgba(100,116,139,0.36)]"
        style={{ opacity: done ? 0.78 : 1 }}
      >
        <span className="absolute inset-y-2.5 start-0 w-[3px] rounded-full" style={{ background: hex }} />
        <div className="flex items-center gap-3 ps-2">
          <button
            type="button"
            onClick={() => onToggle(item.id, date)}
            className={cn(
              "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border border-white/80 shadow-[3px_3px_6px_rgba(100,116,139,0.28)]",
              done ? "bg-[#ecfdf5]" : "bg-[#eef2f9]",
            )}
          >
            {done ? <CheckCircle2 size={18} className="text-[#22c55e]" strokeWidth={2.5} /> : <Circle size={18} className="text-slate-400" strokeWidth={1.8} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className={cn("truncate text-sm font-bold text-slate-800", done && "text-slate-400 line-through")}>{item.title}</div>
            {item.note ? <div className="mt-0.5 truncate text-[11px] text-slate-400">{item.note}</div> : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-400/30 px-2.5 py-1 text-[10px] font-bold" style={{ color: hex, background: `${hex}18` }}>
                {renderIcon(type?.icon, "h-2.5 w-2.5")} {getTypeLabel(type)}
              </span>
              {item.startTime ? (
                <span className="inline-flex items-center gap-1 rounded-2xl border border-white/80 bg-[#eef2f9] px-2 py-1 text-[10px] font-bold text-slate-500 shadow-[2px_2px_4px_rgba(100,116,139,0.25)]">
                  <Clock size={9} /> {formatTime(item.startTime)}
                </span>
              ) : null}
              {item.recurrence !== "none" && recLabel ? (
                <span className="inline-flex items-center gap-1 rounded-2xl border border-white/80 bg-[#eef2f9] px-2 py-1 text-[10px] font-medium text-slate-500 shadow-[2px_2px_4px_rgba(100,116,139,0.25)]">
                  <Repeat size={9} /> {recLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => onEdit(item, dateStr, source)} className="flex h-[34px] w-[34px] items-center justify-center rounded-xl border border-white/80 bg-[#eef2f9] text-(--color-primary-500) shadow-[3px_3px_6px_rgba(100,116,139,0.28)]">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={() => onDelete(item)} className="flex h-[34px] w-[34px] items-center justify-center rounded-xl border border-red-200 bg-[#fef2f2] text-red-500 shadow-[3px_3px_6px_rgba(100,116,139,0.22)]">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("cal-item-card", done && "done")}>
      <div className="cal-item-accent" style={{ background: hex }}/>

      {/* Check button — bigger on mobile */}
      <button
        className={cn("cal-item-check", done && "done")}
        onClick={() => onToggle(item.id, date)}
      >
        {done
          ? <CheckCircle2 size={16} style={{ color:"#4ade80" }}/>
          : <Circle size={16}/>
        }
      </button>

      <div className=" cal-item-body">
        <div className={cn("cal-item-title", done && "done")}>{item.title}</div>
        {item.note && <div className="cal-item-note">{item.note}</div>}
        <div className="cal-item-meta">
          <span className="cal-item-badge" style={{ borderColor:`${hex}30`, color:hex, background:bg }}>
            {renderIcon(type?.icon,"h-2.5 w-2.5")} {getTypeLabel(type)}
          </span>
          {item.startTime && <span className="cal-item-badge"><Clock size={10}/> {formatTime(item.startTime)}</span>}
          {item.recurrence !== "none" && <span className="cal-item-badge"><Repeat size={10}/> {recLabel}</span>}
        </div>
      </div>
      <div className="cal-item-actions">
        <button className="cal-action-btn" onClick={() => onEdit(item, dateStr, source)}>
          <Pencil size={isMobile ? 15 : 13}/>
        </button>
        <button className="cal-action-btn danger" onClick={() => onDelete(item)}>
          <Trash2 size={isMobile ? 15 : 13}/>
        </button>
      </div>
    </div>
  );
}

// ─── Item Form Content ────────────────────────────────────────────────────────
function ItemFormContent({ t, isRTL, editingItem, itemForm, setItemForm, handleSaveItem,
  onClose, dayNames, eventTypes, renderIcon, getTypeLabel }) {
  const [typeOpen, setTypeOpen]             = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);

  return (
    <div className="cal-form-wrap">
      <div className="cal-form-body">
        {/* Title */}
        <div>
          <label className="cal-label"><Pencil size={10}/> {t("title")}</label>
          <input className="cal-input" value={itemForm.title}
            onChange={e => setItemForm(p => ({ ...p, title:e.target.value }))}
            placeholder={t("enterTitle")} autoFocus/>
        </div>

        {/* Note */}
        <div>
          <label className="cal-label">
            <FileText size={10}/> {t("note")}
            <span className="normal-case text-[var(--cal-text3)] font-normal tracking-normal">({t("optional")})</span>
          </label>
          <textarea className="cal-input" value={itemForm.note||""}
            onChange={e => setItemForm(p => ({ ...p, note:e.target.value }))}
            placeholder={t("addNote")} rows={2} style={{ resize:"none" }}/>
        </div>

        {/* Type + recurrence */}
        <div className="cal-form-grid">
          <div>
            <label className="cal-label">{t("type")}</label>
            <Select open={typeOpen} onOpenChange={setTypeOpen} value={itemForm.type}
              onValueChange={v => { setItemForm(p => ({ ...p, type:v })); setTypeOpen(false); }}>
              <SelectTrigger className="cal-input" style={{ height:44, fontSize:16 }}><SelectValue/></SelectTrigger>
              <SelectContent className="rounded-lg z-[9999]" style={{ background:"var(--cal-surface)", border:"1px solid var(--cal-border2)" }}>
                {eventTypes.filter(tt => tt.id !== "all").map(type => (
                  <SelectItem key={type.id} value={type.id} className="text-sm" style={{ color:"var(--cal-text)" }}>
                    <div className="flex items-center gap-2">{renderIcon(type.icon,"h-3.5 w-3.5")}{getTypeLabel(type)}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="cal-label">{t("recurrence")}</label>
            <Select open={recurrenceOpen} onOpenChange={setRecurrenceOpen} value={itemForm.recurrence}
              onValueChange={v => { setItemForm(p => ({ ...p, recurrence:v, recurrenceInterval:["daily","weekly","monthly"].includes(v)?1:p.recurrenceInterval })); setRecurrenceOpen(false); }}>
              <SelectTrigger className="cal-input" style={{ height:44, fontSize:16 }}><SelectValue/></SelectTrigger>
              <SelectContent className="rounded-lg z-[9999]" style={{ background:"var(--cal-surface)", border:"1px solid var(--cal-border2)" }}>
                {["none","daily","weekly","monthly","every_x_days","custom"].map(v => (
                  <SelectItem key={v} value={v} className="text-sm" style={{ color:"var(--cal-text)" }}>
                    {t(v === "every_x_days" ? "everyXDays" : v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {itemForm.recurrence === "every_x_days" && (
          <div>
            <label className="cal-label">{t("repeatEveryDays")}</label>
            <input type="number" min="1" className="cal-input" value={itemForm.recurrenceInterval}
              onChange={e => setItemForm(p => ({ ...p, recurrenceInterval:parseInt(e.target.value,10)||1 }))}/>
          </div>
        )}

        {/* Date + time */}
        <div className="cal-form-grid">
          <div>
            <label className="cal-label">{t("startDate")}</label>
            <input type="date" className="cal-input" value={itemForm.startDate}
              onChange={e => setItemForm(p => ({ ...p, startDate:e.target.value }))}/>
          </div>
          <div>
            <label className="cal-label">
              {t("startTime")} <span className="normal-case font-normal tracking-normal text-[var(--cal-text3)]">{t("optional")}</span>
            </label>
            <input type="time" className="cal-input" value={itemForm.startTime||""}
              onChange={e => setItemForm(p => ({ ...p, startTime:e.target.value }))}/>
          </div>
        </div>

        {itemForm.recurrence === "custom" && (
          <div className="bg-[var(--cal-surface2)] rounded-[10px] p-3 border border-[var(--cal-border)]">
            <label className="cal-label mb-2">{t("selectDays")}</label>
            <div className="flex gap-1 flex-wrap">
              {dayNames.map((day, idx) => (
                <button key={idx} type="button"
                  className={cn("cal-day-pill", itemForm.recurrenceDays.includes(idx) && "sel")}
                  onClick={() => setItemForm(p => {
                    const days = p.recurrenceDays.includes(idx) ? p.recurrenceDays.filter(d => d!==idx) : [...p.recurrenceDays, idx];
                    return { ...p, recurrenceDays:days };
                  })}>{day}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="cal-form-footer">
        <button className="cal-btn-ghost flex-1 justify-center" onClick={onClose}>{t("cancel")}</button>
        <button className="cal-btn-primary justify-center" style={{ flex:2 }}
          disabled={!itemForm.title||!itemForm.startDate} onClick={handleSaveItem}>
          <Check size={14}/> {editingItem ? t("save") : t("add")}
        </button>
      </div>
    </div>
  );
}

// ─── Mobile Day Panel (bottom sheet) ─────────────────────────────────────────
function MobileDayPanel({ selectedDate, completions, eventTypes, selectedType,
  onToggle, onEdit, onDelete, onAdd, getItemsForDate,
  getTypeLabel, renderIcon, formatTime, t, dayNames, monthNames, onClose }) {

  if (!selectedDate) return null;
  const dateStr  = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,"0")}-${String(selectedDate.getDate()).padStart(2,"0")}`;
  const all      = getItemsForDate(selectedDate);
  const filtered = selectedType === "all" ? all : all.filter(i => i.type === selectedType);
  const doneCount = filtered.filter(i => completions[`${i.id}_${dateStr}`]).length;
  const total = filtered.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const now = new Date();
  const todayMatch = selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth() && selectedDate.getDate() === now.getDate();

  return (
    <SlidePanel open={!!selectedDate} onClose={onClose} className="bg-card">
      <div className="mx-4 mt-2 mb-3 overflow-hidden rounded-2xl border border-white/35 bg-gradient-to-br from-(--color-primary-800) via-(--color-primary-700) to-(--color-secondary-600) p-4 text-white shadow-[4px_8px_14px_rgba(15,48,120,0.42)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {todayMatch && (
              <div className="mb-1.5 inline-flex items-center gap-1 rounded-2xl border border-white/30 bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                <Sparkles size={9} /> {t("today")}
              </div>
            )}
            <div className="text-[11px] text-white/60">{dayNames[selectedDate.getDay()]}</div>
            <div className="text-[22px] font-black tracking-tight">
              {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </div>
          </div>
          <div className="min-w-[68px] rounded-2xl border border-white/30 bg-white/15 px-3 py-2.5 text-center">
            <div className="text-2xl font-black leading-7">{doneCount}/{total}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/55">{t("completed")}</div>
          </div>
        </div>
        {total > 0 && (
          <div className="mt-3 h-[5px] overflow-hidden rounded-full border border-white/10 bg-white/15">
            <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => onAdd(dateStr)}
          className="flex h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/80 bg-[#eef2f9] text-[13px] font-bold text-(--color-primary-700) shadow-[5px_5px_8px_rgba(100,116,139,0.36)]"
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-(--color-primary-400)/30 bg-(--color-primary-500)/10">
            <Plus size={14} />
          </span>
          {t("addToThisDay")}
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-1">
        {!filtered.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/80 bg-[#eef2f9] shadow-[5px_5px_8px_rgba(100,116,139,0.36)]">
              <CalendarDays size={28} className="text-(--color-primary-400)" strokeWidth={1.5} />
            </div>
            <div className="text-sm font-bold text-slate-700">{t("noTasksTitle")}</div>
            <div className="mt-1 text-xs text-slate-400">{t("noTasksSubtitle")}</div>
          </div>
        ) : filtered.map(item => (
          <ItemCard key={item.id} item={item} date={selectedDate} dateStr={dateStr}
            eventTypes={eventTypes} completions={completions}
            onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
            getTypeLabel={getTypeLabel} renderIcon={renderIcon} formatTime={formatTime}
            t={t} dayNames={dayNames} isRTL={isRTL} source="mobile"/>
        ))}
      </div>
    </SlidePanel>
  );
}

// ─── Item Panel (desktop = side panel, mobile = bottom sheet) ─────────────────
function ItemPanel({ open, onClose, t, isRTL, editingItem, itemForm, setItemForm,
  handleSaveItem, dayNames, eventTypes, renderIcon, getTypeLabel, isMobileView }) {

  const panelTitle = editingItem ? t("editItem") : t("addNewItem");

  if (isMobileView) {
    return (
      <SlidePanel
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <div className="cal-form-icon"><Sparkles size={14}/></div>
            <span>{panelTitle}</span>
          </div>
        }
      >
        <ItemFormContent
          t={t} isRTL={isRTL} editingItem={editingItem}
          itemForm={itemForm} setItemForm={setItemForm}
          handleSaveItem={handleSaveItem}
          dayNames={dayNames} eventTypes={eventTypes}
          renderIcon={renderIcon} getTypeLabel={getTypeLabel}
          onClose={onClose}
        />
      </SlidePanel>
    );
  }

  return (
    <DesktopSidePanel
      open={open}
      onClose={onClose}
      title={panelTitle}
      isRTL={isRTL}
    >
      <ItemFormContent
        t={t} isRTL={isRTL} editingItem={editingItem}
        itemForm={itemForm} setItemForm={setItemForm}
        handleSaveItem={handleSaveItem}
        dayNames={dayNames} eventTypes={eventTypes}
        renderIcon={renderIcon} getTypeLabel={getTypeLabel}
        onClose={onClose}
      />
    </DesktopSidePanel>
  );
}

// ─── Hook: detect mobile ──────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const h = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return isMobile;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const t        = useTranslations("calendar");
  const tNav     = useTranslations("nav.items");
  const tCommit  = useTranslations("commitment");
  const locale   = useLocale();
  const isRTL    = locale === "ar";
  const router   = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // State
  const [currentDate,           setCurrentDate]          = useState(new Date());
  const [selectedDate,          setSelectedDate]         = useState(null);
  const [items,                 setItems]                = useState([]);
  const [eventTypes,            setEventTypes]           = useState(DEFAULT_TYPES);
  const [selectedType,          setSelectedType]         = useState("all");
  const [completions,           setCompletions]          = useState({});
  const [soundEnabled,          setSoundEnabled]         = useState(true);
  const [showAddTypeDrawer,     setShowAddTypeDrawer]    = useState(false);
  const [newTypeName,           setNewTypeName]          = useState("");
  const [newTypeColor,          setNewTypeColor]         = useState(COLOR_OPTIONS[3].value);
  const [newTypeIcon,           setNewTypeIcon]          = useState("Target");
  const [showSettingsDialog,    setShowSettingsDialog]   = useState(false);
  const [showDeleteConfirm,     setShowDeleteConfirm]    = useState(false);
  const [itemToDelete,          setItemToDelete]         = useState(null);
  const [showDeleteTypeConfirm, setShowDeleteTypeConfirm]= useState(false);
  const [typeToDelete,          setTypeToDelete]         = useState(null);
  const [showItemPanel,         setShowItemPanel]        = useState(false);
  const [editingItem,           setEditingItem]          = useState(null);
  const [showDayPanel,          setShowDayPanel]         = useState(false);
  const [settings,              setSettings]             = useState({
    showWeekNumbers:false, highlightWeekend:true,
    weekendDays:[5,6], startOfWeek:6, confirmBeforeDelete:true,
  });
  const [itemForm, setItemForm] = useState({
    id:"", title:"", note:"", type:"task",
    startDate:"", startTime:"", recurrence:"none",
    recurrenceInterval:1, recurrenceDays:[],
  });

  const currentTab      = searchParams.get("tab") || "calendar";
  const handleTabChange = (tab) => { const p = new URLSearchParams(searchParams); p.set("tab", tab); router.push(`?${p.toString()}`); };

  // Persist
  useEffect(() => { try { localStorage.setItem("calendarItems",    JSON.stringify(items));       } catch{} }, [items]);
  useEffect(() => { try { localStorage.setItem("eventTypes",       JSON.stringify(eventTypes));  } catch{} }, [eventTypes]);
  useEffect(() => { try { localStorage.setItem("completions",      JSON.stringify(completions)); } catch{} }, [completions]);
  useEffect(() => { try { localStorage.setItem("calendarSettings", JSON.stringify(settings));    } catch{} }, [settings]);
  useEffect(() => { try { localStorage.setItem("soundEnabled",     JSON.stringify(soundEnabled));} catch{} }, [soundEnabled]);

  useEffect(() => {
    let mounted = true;
    const loadLocal = () => {
      try {
        const si = localStorage.getItem("calendarItems");
        const st = localStorage.getItem("eventTypes");
        const sc = localStorage.getItem("completions");
        const ss = localStorage.getItem("calendarSettings");
        const sd = localStorage.getItem("soundEnabled");
        if (!mounted) return;
        if (si) setItems(JSON.parse(si));
        if (st) setEventTypes(JSON.parse(st));
        if (sc) setCompletions(JSON.parse(sc));
        if (ss) setSettings(JSON.parse(ss));
        if (sd) setSoundEnabled(JSON.parse(sd));
      } catch {}
    };
    const load = async () => {
      try {
        const state = await apiGet(ENDPOINTS.state);
        if (!mounted) return;
        if (Array.isArray(state?.items))              setItems(state.items);
        if (Array.isArray(state?.eventTypes))         setEventTypes(state.eventTypes);
        if (state?.completions) {
          setCompletions(state.completions);
        } else {
          const sc = localStorage.getItem("completions");
          if (sc) setCompletions(JSON.parse(sc));
        }
        if (state?.settings) {
          setSettings(state.settings);
        } else {
          const ss = localStorage.getItem("calendarSettings");
          if (ss) setSettings(JSON.parse(ss));
        }
        if (typeof state?.soundEnabled === "boolean") {
          setSoundEnabled(state.soundEnabled);
        } else {
          const sd = localStorage.getItem("soundEnabled");
          if (sd) setSoundEnabled(JSON.parse(sd));
        }
      } catch {
        try {
          const [ir,tr,cr,sr,dr] = await Promise.allSettled([
            apiGet(ENDPOINTS.items), apiGet(ENDPOINTS.types),
            apiGet(ENDPOINTS.completions), apiGet(ENDPOINTS.settings), apiGet(ENDPOINTS.sound),
          ]);
          if (!mounted) return;
          if (ir.status==="fulfilled") setItems(ir.value?.items||ir.value||[]);
          if (tr.status==="fulfilled") setEventTypes(tr.value?.eventTypes||tr.value||DEFAULT_TYPES);
          if (cr.status==="fulfilled") {
            setCompletions(cr.value?.completions||cr.value||{});
          } else {
            const sc = localStorage.getItem("completions");
            if (sc) setCompletions(JSON.parse(sc));
          }
          if (sr.status==="fulfilled") {
            setSettings(sr.value?.settings||sr.value||settings);
          } else {
            const ss = localStorage.getItem("calendarSettings");
            if (ss) setSettings(JSON.parse(ss));
          }
          if (dr.status==="fulfilled" && typeof dr.value?.soundEnabled==="boolean") {
            setSoundEnabled(dr.value.soundEnabled);
          } else {
            const sd = localStorage.getItem("soundEnabled");
            if (sd) setSoundEnabled(JSON.parse(sd));
          }
          if ([ir,tr,cr,sr,dr].every(r => r.status==="rejected")) loadLocal();
        } catch { loadLocal(); }
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const playSound = () => {
    if (!soundEnabled) return;
    try { 
      const audio = new Audio("/sounds/check2.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch{}
  };

  const monthNames = useMemo(() => [
    t("january"),t("february"),t("march"),t("april"),t("may"),t("june"),
    t("july"),t("august"),t("september"),t("october"),t("november"),t("december"),
  ], [t]);
  const dayNames = useMemo(() => [
    t("sunday"),t("monday"),t("tuesday"),t("wednesday"),t("thursday"),t("friday"),t("saturday"),
  ], [t]);
  const adjustedDayNames = useMemo(() => {
    return Array.from({length:7}, (_,i) => dayNames[(i+settings.startOfWeek)%7]);
  }, [dayNames, settings.startOfWeek]);
  const shortDayByIndex = useMemo(() => ([
    t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat"),
  ]), [t]);

  const getDateString  = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr       = useMemo(() => getDateString(new Date()), []);
  const formatTime     = (s) => {
    if (!s) return "";
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m) { let h=parseInt(m[1],10); const min=m[2]; const ap=h>=12?t("pm"):t("am"); h=h%12||12; return `${h}:${min} ${ap}`; }
    return s;
  };
  const isWeekend        = (d) => settings.weekendDays.includes(d.getDay());
  const getCompletionKey = (id, d) => `${id}_${getDateString(d)}`;
  const renderIcon       = (n, cls="h-4 w-4") => { const IC=(n&&ICON_COMPONENTS[n])||CalendarIcon; return <IC className={cls}/>; };
  const getTypeLabel     = (type) => { if (!type) return t("types.all"); if (type.custom) return type.name||""; return type.nameKey?t(type.nameKey):type.name||""; };

  const getItemsForDate = (date) => {
    const ds = getDateString(date);
    return items.filter(item => {
      if (item.recurrence==="none") return item.startDate===ds;
      const sdParts = item.startDate.split('-');
      const sd = new Date(parseInt(sdParts[0]), parseInt(sdParts[1])-1, parseInt(sdParts[2]));
      if (date.getFullYear()===sd.getFullYear() && date.getMonth()===sd.getMonth() && date.getDate()<sd.getDate()) return false;
      const diff = Math.floor((+date-+sd)/86400000);
      switch (item.recurrence) {
        case "daily":       return diff%(item.recurrenceInterval||1)===0;
        case "weekly":      return diff%(7*(item.recurrenceInterval||1))===0;
        case "monthly":     return date.getDate()===sd.getDate() && (date.getMonth()-sd.getMonth()+12*(date.getFullYear()-sd.getFullYear()))%(item.recurrenceInterval||1)===0;
        case "custom":      return item.recurrenceDays.includes(date.getDay()) && diff>=0;
        case "every_x_days":return diff%(item.recurrenceInterval||1)===0;
        default:            return false;
      }
    });
  };
  const getItemCountByType = (typeId) => typeId==="all" ? items.length : items.filter(i=>i.type===typeId).length;

  const resetItemForm = useCallback(() => {
    setItemForm({ id:"", title:"", note:"", type:"task", startDate:getDateString(new Date()), startTime:"", recurrence:"none", recurrenceInterval:1, recurrenceDays:[] });
    setEditingItem(null);
  }, []);

  const openAddPanel = (dateStr) => {
    resetItemForm();
    if (dateStr) setItemForm(p => ({ ...p, startDate: dateStr }));
    setShowItemPanel(true);
  };

  const openEditPanel = (item, dateStr, source) => {
    setEditingItem(item);
    setItemForm({ ...item, note:item.note||"", recurrenceDays:item.recurrenceDays||[], recurrenceInterval:item.recurrenceInterval||1 });
    setShowItemPanel(true);
  };

  const closeItemPanel = () => {
    setShowItemPanel(false);
    setTimeout(resetItemForm, 350);
  };

  const toggleCompletion = async (itemId, date) => {
    const key=getCompletionKey(itemId,date), ds=getDateString(date);
    let next=false;
    setCompletions(p=>{next=!p[key]; return {...p,[key]:next};});
    playSound();
    try { await apiPatch(ENDPOINTS.completions,{key,itemId,date:ds,completed:next}); }
    catch { setCompletions(p=>({...p,[key]:!next})); }
  };

  const handleSaveItem = useCallback(async () => {
    if (!itemForm.title||!itemForm.startDate) return;
    const final = {...itemForm, recurrenceInterval:["daily","weekly","monthly"].includes(itemForm.recurrence)?1:itemForm.recurrenceInterval, note:itemForm.note||""};
    if (editingItem) {
      const updated={...final,id:editingItem.id};
      setItems(p=>p.map(i=>i.id===editingItem.id?updated:i));
      try { await apiPut(ENDPOINTS.itemById(editingItem.id),updated); }
      catch { try{const f=await apiGet(ENDPOINTS.items); setItems(f?.items||f||[]);}catch{} }
    } else {
      const tmp=`tmp_${Date.now()}`, local={...final,id:tmp};
      setItems(p=>[...p,local]);
      try { const c=await apiPost(ENDPOINTS.items,{...local}); const sv=c?.item||c; if(sv?.id&&sv.id!==tmp) setItems(p=>p.map(i=>i.id===tmp?sv:i)); } catch{}
    }
    closeItemPanel();
    playSound();
  }, [itemForm, editingItem]);

  const handleDeleteItem = (item) => {
    if (settings.confirmBeforeDelete){setItemToDelete(item);setShowDeleteConfirm(true);}
    else confirmDelete(item);
  };
  const confirmDelete = async (item=itemToDelete) => {
    if (!item) return;
    const prev=items;
    setItems(p=>p.filter(i=>i.id!==item.id));
    setShowDeleteConfirm(false); setItemToDelete(null);
    playSound();
    try{await apiDelete(ENDPOINTS.itemById(item.id));}catch{setItems(prev);}
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    const sc=COLOR_OPTIONS.find(c=>c.value===newTypeColor);
    const nt={id:`custom_${Date.now()}`,name:newTypeName,color:newTypeColor,textColor:sc?.text||"text-white",border:sc?.border||"border-gray-200",ring:sc?.ring||"ring-gray-500",icon:newTypeIcon,custom:true};
    setEventTypes(p=>[...p,nt]);
    try{const c=await apiPost(ENDPOINTS.types,nt);const st=c?.type||c;if(st?.id&&st.id!==nt.id)setEventTypes(p=>p.map(tt=>tt.id===nt.id?st:tt));}catch{}
    setNewTypeName(""); setNewTypeColor(COLOR_OPTIONS[3].value); setNewTypeIcon("Target"); setShowAddTypeDrawer(false); playSound();
  };
  const handleDeleteType = (typeId) => {
    const type=eventTypes.find(tt=>tt.id===typeId);
    if (!type||!type.custom) return;
    setTypeToDelete(type); setShowDeleteTypeConfirm(true);
  };
  const confirmDeleteType = async () => {
    if (!typeToDelete) return;
    const pt=eventTypes,pi=items;
    setEventTypes(p=>p.filter(tt=>tt.id!==typeToDelete.id));
    setItems(p=>p.filter(i=>i.type!==typeToDelete.id));
    setShowDeleteTypeConfirm(false); setTypeToDelete(null); playSound();
    try{await apiDelete(ENDPOINTS.typeById(typeToDelete.id));}catch{setEventTypes(pt);setItems(pi);}
  };

  useEffect(() => { apiPut(ENDPOINTS.settings,{settings}).catch(()=>{}); }, [settings]);
  useEffect(() => { apiPut(ENDPOINTS.sound,{soundEnabled}).catch(()=>{}); }, [soundEnabled]);

  const ICON_OPTIONS = useMemo(() => [
    {value:"Target",      label:t("icons.target"),   Icon:Target     },
    {value:"CheckSquare", label:t("icons.check"),    Icon:CheckSquare},
    {value:"DollarSign",  label:t("icons.money"),    Icon:DollarSign },
    {value:"Bell",        label:t("icons.bell"),     Icon:Bell       },
    {value:"Star",        label:t("icons.star"),     Icon:Star       },
    {value:"Book",        label:t("icons.book"),     Icon:Book       },
    {value:"Phone",       label:t("icons.phone"),    Icon:Phone      },
    {value:"Music",       label:t("icons.music"),    Icon:Music      },
    {value:"Heart",       label:t("icons.health"),   Icon:Heart      },
    {value:"Mail",        label:t("icons.email"),    Icon:Mail       },
    {value:"ShoppingCart",label:t("icons.shopping"), Icon:ShoppingCart},
    {value:"Dumbbell",    label:t("icons.fitness"),  Icon:Dumbbell   },
    {value:"Lightbulb",   label:t("icons.ideas"),    Icon:Lightbulb  },
    {value:"Flame",       label:t("icons.important"),Icon:Flame      },
  ], [t]);

  // ── Build month data ──────────────────────────────────────────────────────
  const weeks = useMemo(() => {
    const y=currentDate.getFullYear(), m=currentDate.getMonth();
    const first=new Date(y,m,1), last=new Date(y,m+1,0);
    const offset=(first.getDay()-settings.startOfWeek+7)%7;
    const days=[];
    for(let i=0;i<offset;i++) days.push(null);
    for(let i=1;i<=last.getDate();i++) days.push(new Date(y,m,i));
    const tail=(7-(days.length%7))%7;
    for(let i=0;i<tail;i++) days.push(null);
    const ws=[];
    for(let i=0;i<days.length;i+=7) ws.push(days.slice(i,i+7));
    return ws;
  }, [currentDate, settings.startOfWeek]);

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="cal-wrap mx-auto flex min-h-0 w-full max-w-[440px] flex-1 flex-col">
      <DesignStyles/>

      {showAddTypeDrawer && (
        <div className="cal-overlay fixed inset-0 z-40" onClick={()=>setShowAddTypeDrawer(false)}/>
      )}

      <div className="m-[5px] rounded-3xl shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]">
        <div
          className="relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)]"
          style={{ background: 'linear-gradient(135deg, var(--color-primary-900), var(--color-primary-800), var(--color-primary-700), var(--color-secondary-700))' }}
        >
          <div className="pointer-events-none absolute -top-[100px] -start-12 h-[200px] w-[200px] rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-12 -end-8 h-[140px] w-[140px] rounded-full bg-white/[0.04]" />
          <div className="relative flex items-center justify-between gap-2 px-5 pt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={()=>setCurrentDate(new Date(currentDate.getFullYear(),currentDate.getMonth()-1,1))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-e-[rgba(15,48,120,0.25)] border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white shadow-[2px_3px_6px_rgba(15,23,42,0.35)]"
              >
                {isRTL ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
              </button>
              <div>
                <div className="mb-[-12px] flex items-center gap-[5px] text-[10px] font-medium uppercase tracking-[1px] text-white/55">
                  <CalendarIcon size={10} />
                  {currentDate.getFullYear()}
                </div>
                <div className="text-2xl font-black tracking-[-0.5px] text-white">{monthNames[currentDate.getMonth()]}</div>
              </div>
              <button
                type="button"
                onClick={()=>setCurrentDate(new Date(currentDate.getFullYear(),currentDate.getMonth()+1,1))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-e-[rgba(15,48,120,0.25)] border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white shadow-[2px_3px_6px_rgba(15,23,42,0.35)]"
              >
                {isRTL ? <ChevronLeft size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={()=>setShowSettingsDialog(true)}
                title={t("settings")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-e-[rgba(15,48,120,0.25)] border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white shadow-[2px_3px_6px_rgba(15,23,42,0.35)]"
              >
                <Settings size={15} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => openAddPanel(selectedDate ? getDateString(selectedDate) : getDateString(new Date()))}
                className="flex h-9 items-center gap-1.5 rounded-2xl border-[1.2px] border-t-white border-s-white/95 border-e-[rgba(15,48,120,0.12)] border-b-[rgba(15,48,120,0.16)] bg-white px-3 text-xs font-bold text-(--color-primary-700) shadow-[2px_3px_6px_rgba(15,48,120,0.28)]"
              >
                <Plus size={14} strokeWidth={2.5} />
                {t("add")}
              </button>
            </div>
          </div>
          <div className="flex gap-1 px-4 pb-3 pt-4">
            {eventTypes.map(type => {
              const active = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-2xl border-[1.2px] px-1.5 py-1.5 text-center text-[9px] font-bold",
                    active
                      ? "border-white/90 bg-white text-(--color-primary-700) shadow-[2px_4px_7px_color-mix(in_srgb,var(--color-primary-900)_40%,transparent)]"
                      : "border-white/30 bg-white/10 text-white/65",
                  )}
                >
                  {getTypeLabel(type)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative mx-3 mt-3 overflow-hidden rounded-[26px] border border-white/85 bg-[#eef2f9] px-3 pb-3 pt-4 shadow-[5px_6px_10px_rgba(100,116,139,0.4)]">
        <div className="pointer-events-none absolute inset-x-4 top-0 h-[1.5px] rounded-full bg-white/95" />
        {(() => {
          let eventDays = 0;
          let totalEvents = 0;
          weeks.forEach(week => {
            week.forEach(date => {
              if (!date) return;
              const dayItems = getItemsForDate(date);
              const filtered = selectedType === "all" ? dayItems : dayItems.filter(i => i.type === selectedType);
              if (filtered.length) {
                eventDays += 1;
                totalEvents += filtered.length;
              }
            });
          });
          return (
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#e4eaf4] px-2 py-2 shadow-[inset_2px_2px_4px_rgba(100,116,139,0.28)]">
              <div className="flex items-center gap-2">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-(--color-primary-500)/10 text-(--color-primary-600)">
                  <CalendarDays size={14} strokeWidth={2.2} />
                </span>
                <span>
                  <span className="block text-xs font-bold text-slate-800">{totalEvents} {t("events")}</span>
                  <span className="block text-[10px] font-medium text-slate-400">{eventDays} {t("activeDays")}</span>
                </span>
              </div>
              <span className="rounded-full border border-(--color-primary-400)/30 bg-(--color-primary-500)/10 px-2.5 py-1 text-[10px] font-bold text-(--color-primary-700)">
                {t("monthView")}
              </span>
            </div>
          );
        })()}

        <div className="mb-2 grid grid-cols-7 rounded-2xl bg-white/55 py-2">
          {adjustedDayNames.map((day, idx) => {
            const orig = (idx + settings.startOfWeek) % 7;
            const weekend = orig === 5 || orig === 6;
            return (
              <div key={day + idx} className={cn("text-center text-[10px] font-bold tracking-wide", weekend ? "text-(--color-primary-400)" : "text-slate-400")}>
                {shortDayByIndex[orig] || day.slice(0, 3)}
              </div>
            );
          })}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className={cn("mb-1 grid grid-cols-7 rounded-2xl py-0.5", wi % 2 === 1 && "bg-white/30")}>
            {week.map((date, di) => {
              if (!date) return <div key={`e-${wi}-${di}`} />;
              const ds = getDateString(date);
              const all = getItemsForDate(date);
              const fil = selectedType === "all" ? all : all.filter(i => i.type === selectedType);
              const isToday = ds === todayStr;
              const isSel = selectedDate && ds === getDateString(selectedDate) && !isToday;
              const count = fil.length;
              const hasDots = count > 0;
              const weekend = date.getDay() === 5 || date.getDay() === 6;
              const extra = Math.max(0, count - 3);
              return (
                <button
                  key={ds}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setShowDayPanel(true);
                  }}
                  className="flex items-center justify-center py-0.5"
                >
                  <span
                    className={cn(
                      "relative flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full text-[13px] font-bold",
                      isToday && "border-[1.4px] border-white/55 bg-gradient-to-br from-(--color-primary-400) via-(--color-primary-600) to-(--color-primary-800) text-white shadow-[2px_4px_7px_color-mix(in_srgb,var(--color-primary-700)_40%,transparent)]",
                      isSel && "border-[1.4px] border-slate-400/45 bg-[#eef2f9] text-slate-700 shadow-[2px_4px_7px_rgba(100,116,139,0.25)]",
                      !isToday && !isSel && hasDots && "border border-slate-400/20 bg-white/90 text-slate-700",
                      !isToday && !isSel && !hasDots && weekend && "border border-slate-300/20 bg-slate-400/10 text-slate-400",
                      !isToday && !isSel && !hasDots && !weekend && "border border-slate-300/15 bg-white/35 text-slate-700",
                      hasDots && !isToday && "text-[13px]",
                    )}
                  >
                    <span className={cn(hasDots && "mb-1.5")}>{date.getDate()}</span>
                    {hasDots && (
                      <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-[2px]">
                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                          <span key={i} className={cn("h-[5px] w-[5px] rounded-full", isToday ? "bg-white" : "border border-white/50 bg-slate-900")} />
                        ))}
                        {extra > 0 && (
                          <span className={cn("flex h-2.5 min-w-2.5 items-center justify-center rounded-full text-[7px] font-extrabold leading-none", isToday ? "bg-white text-(--color-primary-700)" : "bg-slate-900 text-white")}>+</span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="mt-2 flex items-center justify-center gap-4 border-t border-slate-400/20 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <span className="h-3 w-3 rounded-full border border-white/70 bg-(--color-primary-600)" />
            {t("today")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <span className="h-3 w-3 rounded-full border-[1.5px] border-(--color-primary-400) bg-(--color-primary-500)/15" />
            {t("selected")}
          </span>
        </div>
      </div>

      <div className="flex justify-center px-5 py-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-[#eef2f9] px-4 py-3 shadow-[4px_4px_8px_rgba(100,116,139,0.34)]">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-xl border border-(--color-primary-400)/30 bg-(--color-primary-500)/10 text-(--color-primary-600)">
            <CalendarDays size={15} strokeWidth={2.2} />
          </span>
          <span className="text-xs font-medium text-slate-500">{t("tapToSelect")}</span>
        </div>
      </div>

      {/* ═══ MOBILE DAY SLIDE PANEL ═════════════════════════════ */}
      <MobileDayPanel
        selectedDate={showDayPanel ? selectedDate : null}
        items={items} completions={completions}
        eventTypes={eventTypes} selectedType={selectedType}
        onToggle={toggleCompletion}
        onEdit={(item, dateStr) => { openEditPanel(item, dateStr, "mobile"); }}
        onDelete={handleDeleteItem}
        onAdd={(ds) => { openAddPanel(ds); }}
        getItemsForDate={getItemsForDate}
        getTypeLabel={getTypeLabel} renderIcon={renderIcon} formatTime={formatTime}
        t={t} dayNames={dayNames} monthNames={monthNames} isRTL={isRTL}
        onClose={() => {
          setShowDayPanel(false);
          setTimeout(() => setSelectedDate(null), 350);
        }}
      />

      {/* ═══ ITEM PANEL — desktop side panel / mobile bottom sheet ══ */}
      <ItemPanel
        open={showItemPanel}
        onClose={closeItemPanel}
        t={t} isRTL={isRTL}
        editingItem={editingItem}
        itemForm={itemForm} setItemForm={setItemForm}
        handleSaveItem={handleSaveItem}
        dayNames={dayNames} eventTypes={eventTypes}
        renderIcon={renderIcon} getTypeLabel={getTypeLabel}
        isMobileView={isMobile}
      />

      {/* ═══ ADD TYPE DRAWER ════════════════════════════════════ */}
      <div className={cn(
        "fixed top-0 bottom-0 z-50 w-80 sm:w-96 flex flex-col cal-drawer",
        isRTL?"right-0":"left-0",
        showAddTypeDrawer?"translate-x-0":isRTL?"translate-x-full":"-translate-x-full",
        "transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
      )}>
        <div className="cal-drawer-head">
          <div className="cal-drawer-title"><LayoutGrid size={18}/> {t("manageTypes")}</div>
          <button className="cal-btn-icon" onClick={()=>setShowAddTypeDrawer(false)}><X size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3.5">
          <div className="mb-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--cal-text3)] mb-2">{t("allTypes")}</div>
            {eventTypes.map(type=>{
              const {hex}=resolveTypeHex(type);
              return (
                <div key={type.id} className="flex items-center gap-1">
                  <div className={cn("cal-type-row flex-1",selectedType===type.id&&"active")}
                    onClick={()=>{setSelectedType(type.id);setShowAddTypeDrawer(false);}}>
                    <span className="w-[7px] h-[7px] rounded-full" style={{background:hex}}/>
                    {renderIcon(type.icon,"h-3.5 w-3.5")}
                    <span className="flex-1">{getTypeLabel(type)}</span>
                    <span className="cal-type-row-badge">{getItemCountByType(type.id)}</span>
                  </div>
                  {type.custom&&<button className="cal-action-btn danger" onClick={()=>handleDeleteType(type.id)}><Trash2 size={13}/></button>}
                </div>
              );
            })}
          </div>
          <div className="pt-3.5 border-t border-[var(--cal-border)]">
            <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--cal-text3)] mb-3">{t("createNewType")}</div>
            <div className="bg-[var(--cal-surface2)] rounded-lg p-3.5 border border-dashed border-[var(--cal-border2)] flex flex-col gap-3">
              <input className="cal-input" placeholder={t("typeName")} value={newTypeName} onChange={e=>setNewTypeName(e.target.value)}/>
              <div>
                <div className="cal-label mb-2">{t("selectIcon")}</div>
                <div className="grid grid-cols-7 gap-1.5">
                  {ICON_OPTIONS.map(opt=>(
                    <button key={opt.value} type="button"
                      className={cn("cal-icon-opt",newTypeIcon===opt.value&&"sel")}
                      title={opt.label} onClick={()=>setNewTypeIcon(opt.value)}>
                      <opt.Icon size={15}/>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="cal-label mb-2">{t("selectColor")}</div>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_OPTIONS.map(c=>(
                    <button key={c.value} type="button"
                      className={cn("cal-color-swatch",c.value,newTypeColor===c.value&&"sel")}
                      title={t(c.nameKey)} onClick={()=>setNewTypeColor(c.value)}/>
                  ))}
                </div>
              </div>
              <button className="cal-btn-primary w-full justify-center h-[38px]"
                disabled={!newTypeName.trim()} onClick={handleAddType}>
                <Check size={14}/> {t("add")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SETTINGS DIALOG ════════════════════════════════════ */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-sm sm:max-w-md rounded-lg bg-[var(--cal-surface)] border border-[var(--cal-border2)] text-[var(--cal-text)]" dir={isRTL?"rtl":"ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-[var(--cal-font-d)] text-xl font-normal text-[var(--cal-text)]">
              <Settings size={18}/> {t("settings")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="cal-settings-row">
              <div>
                <div className="cal-settings-lbl">{soundEnabled ? t("soundOn") : t("soundOff")}</div>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            <div className="rounded-2xl border border-white/80 bg-[#eef2f9] px-3 py-2">
              <CountdownTimer t={tCommit} isRTL={isRTL} />
            </div>
            {[
              {key:"showWeekNumbers",    label:t("showWeekNumbers"),     desc:t("showWeekNumbersDesc")    },
              {key:"highlightWeekend",   label:t("highlightWeekend"),    desc:t("highlightWeekendDesc")   },
              {key:"confirmBeforeDelete",label:t("confirmBeforeDelete"), desc:t("confirmBeforeDeleteDesc")},
            ].map(({key,label,desc})=>(
              <div key={key} className="cal-settings-row">
                <div><div className="cal-settings-lbl">{label}</div><div className="cal-settings-desc">{desc}</div></div>
                <Switch checked={settings[key]} onCheckedChange={v=>setSettings(p=>({...p,[key]:v}))}/>
              </div>
            ))}
            <div className="cal-settings-row flex-col items-start gap-2.5">
              <div><div className="cal-settings-lbl">{t("startOfWeek")}</div><div className="cal-settings-desc">{t("startOfWeekDesc")}</div></div>
              <Select value={settings.startOfWeek.toString()} onValueChange={v=>setSettings(p=>({...p,startOfWeek:parseInt(v,10)}))}>
                <SelectTrigger className="cal-input h-9 w-full" style={{fontSize:16}}><SelectValue/></SelectTrigger>
                <SelectContent className="bg-[var(--cal-surface)] border border-[var(--cal-border2)]">
                  {[["0",t("sunday")],["1",t("monday")],["6",t("saturday")]].map(([v,l])=>(
                    <SelectItem key={v} value={v} className="text-[var(--cal-text)]">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button className="cal-btn-primary w-full justify-center h-10"
              onClick={()=>setShowSettingsDialog(false)}>{t("close")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE ITEM ═════════════════════════════════════════ */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent dir={isRTL?"rtl":"ltr"} className="max-w-sm rounded-lg bg-[var(--cal-surface)] border border-[var(--cal-border2)] text-[var(--cal-text)]">
          <DialogHeader>
            <DialogTitle className="font-[var(--cal-font-d)] text-lg font-normal">{t("confirmDelete")}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[var(--cal-text2)] md: leading-relaxed">
            {t("areYouSureDelete")} "<span className="font-semibold text-[var(--cal-text)]">{itemToDelete?.title}</span>"?
          </p>
          <DialogFooter className="flex items-center justify-between w-full flex-row gap-2">
            <button className="cal-btn-ghost flex-1 justify-center" onClick={()=>setShowDeleteConfirm(false)}>{t("cancel")}</button>
            <button className=" h-9 flex-1 px-4 bg-red-500 border-none rounded-lg text-white font-[var(--cal-font-b)] text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              onClick={()=>confirmDelete()}>
              <Trash2 size={13}/> {t("delete")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE TYPE ═════════════════════════════════════════ */}
      <Dialog open={showDeleteTypeConfirm} onOpenChange={setShowDeleteTypeConfirm}>
        <DialogContent dir={isRTL?"rtl":"ltr"} className="max-w-sm rounded-lg bg-[var(--cal-surface)] border border-[var(--cal-border2)] text-[var(--cal-text)]">
          <DialogHeader>
            <DialogTitle className="font-[var(--cal-font-d)] text-lg font-normal">{t("confirmDeleteType")}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[var(--cal-text2)] md: leading-relaxed">
            {t("areYouSureDeleteType")} "<span className="font-semibold">{typeToDelete?.name}</span>"?
            <span className="block text-red-400 text-[11px] mt-1.5">{t("deleteTypeWarning")}</span>
          </p>
          <DialogFooter className="gap-2">
            <button className="cal-btn-ghost flex-1 justify-center" onClick={()=>setShowDeleteTypeConfirm(false)}>{t("cancel")}</button>
            <button className="flex-[2] h-9 px-4 bg-red-500 border-none rounded-lg text-white font-[var(--cal-font-b)] text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              onClick={()=>confirmDeleteType()}>
              <Trash2 size={13}/> {t("delete")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownTimer({ t, isRTL }) {
  const [startTime,  setStartTime]  = useState(null);
  const [isRunning,  setIsRunning]  = useState(false);
  const [elapsed,    setElapsed]    = useState({days:0,hours:0,minutes:0,seconds:0});
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState("");

  useEffect(()=>{
    const s=localStorage.getItem("commitmentStartTime"), r=localStorage.getItem("commitmentIsRunning");
    if (s){setStartTime(parseInt(s,10));setIsRunning(r==="true");}
  },[]);
  useEffect(()=>{setPickerDate(new Date().toISOString().slice(0,16));},[]);
  useEffect(()=>{
    if (startTime) localStorage.setItem("commitmentStartTime",startTime.toString());
    localStorage.setItem("commitmentIsRunning",isRunning.toString());
  },[startTime,isRunning]);
  useEffect(()=>{
    if (!isRunning||!startTime) return;
    const id=setInterval(()=>{
      const d=Date.now()-startTime;
      setElapsed({days:Math.floor(d/86400000),hours:Math.floor((d%86400000)/3600000),minutes:Math.floor((d%3600000)/60000),seconds:Math.floor((d%60000)/1000)});
    },1000);
    return ()=>clearInterval(id);
  },[isRunning,startTime]);

  const startNow  = ()=>{setStartTime(Date.now());setIsRunning(true);setShowPicker(false);};
  const startFrom = ()=>{if(!pickerDate)return;setStartTime(new Date(pickerDate).getTime());setIsRunning(true);setShowPicker(false);};
  const reset     = ()=>{setStartTime(null);setIsRunning(false);setElapsed({days:0,hours:0,minutes:0,seconds:0});localStorage.removeItem("commitmentStartTime");localStorage.setItem("commitmentIsRunning","false");};
  const fmt       = n=>String(n).padStart(2,"0");
  const milestone = (()=>{
    const tot=elapsed.days*24*60+elapsed.hours*60+elapsed.minutes;
    if (tot>=60*24*30) return {Icon:Trophy,text:t("milestone.month")};
    if (tot>=60*24*7)  return {Icon:Target,text:t("milestone.week")};
    if (tot>=60*24)    return {Icon:Zap,   text:t("milestone.day")};
    return null;
  })();
  const timeStr = startTime
    ? `${elapsed.days>0?elapsed.days+"d ":""}${fmt(elapsed.hours)}:${fmt(elapsed.minutes)}:${fmt(elapsed.seconds)}`
    : null;

  return (
    <div className="relative" dir={isRTL?"rtl":"ltr"}>
      <div className="cal-commit-wrap">
        <div className="flex items-center gap-2">
          {!startTime ? (
            <button onClick={()=>setShowPicker(true)}
              className="cal-commit-btn shrink-0">
              <Play size={12}/>
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={isRunning?()=>setIsRunning(false):()=>setIsRunning(true)}
                className="cal-commit-btn">
                {isRunning?<Pause size={11}/>:<Play size={11}/>}
              </button>
              <button onClick={reset}
                className="cal-commit-btn">
                <RotateCcw size={11}/>
              </button>
            </div>
          )}
          <div>
            <div className="cal-commit-label">{t("streak")}</div>
            {timeStr ? (
              <div className="flex items-center gap-1.5">
                <div className="cal-commit-time">{timeStr}</div>
                {milestone&&<milestone.Icon size={13} className="text-amber-400" title={milestone.text}/>}
              </div>
            ) : (
              <div className="cal-commit-idle">{t("startCommitment")}</div>
            )}
          </div>
        </div>
      </div>

      {showPicker && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-[8px]" onClick={()=>setShowPicker(false)}/>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[min(400px,calc(100vw-32px))]">
            <div className="bg-[var(--cal-surface)] border border-[var(--cal-border2)] rounded-[20px] p-6 shadow-[0_32px_80px_rgba(0,0,0,.2)]" dir={isRTL?"rtl":"ltr"}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-[13px] bg-[var(--cal-grad)] flex items-center justify-center shadow-[0_4px_12px_var(--cal-accent-gl)]"
                  style={{background:"var(--cal-grad)"}}>
                  <Calendar size={20} className="text-white"/>
                </div>
                <div>
                  <div className="font-[var(--cal-font-d)] text-[17px] text-[var(--cal-text)]">{t("dialog.title")}</div>
                  <div className="text-[11px] text-[var(--cal-text3)] mt-0.5">{t("dialog.subtitle")}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={startNow}
                  className="p-3.5 bg-[var(--cal-accent-lt)] border border-[var(--cal-accent-gl)] rounded-lg cursor-pointer flex items-center justify-between gap-3 transition-all duration-200 hover:bg-[var(--cal-accent-gl)]">
                  <div className="text-left">
                    <div className="text-[13px] font-semibold text-[var(--cal-text)] mb-0.5">{t("dialog.startNow")}</div>
                    <div className="text-[11px] text-[var(--cal-text3)]">{t("dialog.startNowDesc")}</div>
                  </div>
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_var(--cal-accent-gl)]"
                    style={{background:"var(--cal-grad)"}}>
                    <Play size={14} className="text-white"/>
                  </div>
                </button>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[var(--cal-border)]"/>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--cal-text3)]">{t("dialog.or")}</span>
                  <div className="flex-1 h-px bg-[var(--cal-border)]"/>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="cal-label">{t("dialog.customDate")}</div>
                  <input type="datetime-local" value={pickerDate} max={new Date().toISOString().slice(0,16)}
                    onChange={e=>setPickerDate(e.target.value)} className="cal-input"/>
                  <button onClick={startFrom} disabled={!pickerDate} className="cal-btn-primary w-full justify-center h-10">
                    <Play size={13}/> {t("dialog.startFromDate")}
                  </button>
                </div>
              </div>
              <button onClick={()=>setShowPicker(false)}
                className="w-full pt-3 pb-0.5 mt-3 text-[12px] text-[var(--cal-text3)] bg-transparent border-none cursor-pointer font-[var(--cal-font-b)]">
                {t("dialog.cancel")}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}