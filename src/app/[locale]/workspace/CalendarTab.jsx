"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ChevronLeft,
	ChevronRight,
	Calendar as CalendarIcon,
	Clock,
	Check,
	Pencil,
	Trash2,
	X,
	Plus,
	Settings,
	Volume2,
	VolumeX,
	Repeat,
	CheckCircle2,
	Circle,
	Target,
	CheckSquare,
	Users,
	Bell,
	DollarSign,
	Phone,
	Music,
	Book,
	Heart,
	Star,
	Mail,
	ShoppingCart,
	Dumbbell,
	Lightbulb,
	Flame,
	ChevronDown,
	LayoutGrid,
	Calendar,
	Sparkles,
	TrendingUp,
	ListTodo,
	Home,
	FileText,
	Menu,
} from "lucide-react";
import { Play, Pause, RotateCcw, Zap, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import api from "@/utils/axios";
import MultiLangText from "@/components/atoms/MultiLangText";

// ─── Global design styles injected once ──────────────────────────────────────
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  :root {
    --cal-bg: #f5f4f0;
    --cal-surface: #ffffff;
    --cal-surface2: #f9f8f5;
    --cal-surface3: #f0efe9;
    --cal-surface4: #e8e6dd;
    --cal-border: rgba(0,0,0,0.07);
    --cal-border2: rgba(0,0,0,0.11);
    --cal-border3: rgba(0,0,0,0.18);
    --cal-text: #1a1916;
    --cal-text2: #6b6860;
    --cal-text3: #b0ada5;
    --cal-accent: var(--color-primary-500);
    --cal-accent2: var(--color-gradient-via);
    --cal-accent-glow: rgba(99,102,241,0.18);
    --cal-radius: 14px;
    --cal-radius-sm: 8px;
    --cal-font-display: 'Instrument Serif', Georgia, serif;
    --cal-font-body: 'DM Sans', system-ui, sans-serif;
    --cal-shadow: 0 1px 3px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.07);
    --cal-gradient: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to));
    --cal-easing: cubic-bezier(.16,1,.3,1);
  }

  .cal-wrap { font-family: var(--cal-font-body); }
  .cal-wrap * { box-sizing: border-box; }

  .cal-wrap ::-webkit-scrollbar { width: 4px; height: 4px; }
  .cal-wrap ::-webkit-scrollbar-thumb { background: var(--cal-surface4); border-radius: 4px; }
  .cal-wrap { scrollbar-width: thin; scrollbar-color: var(--cal-surface4) transparent; }

  .cal-topbar {
    background: var(--cal-surface);
    border-bottom: 1px solid var(--cal-border);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 100;
  }

  .cal-brand {
    font-family: var(--cal-font-display);
    font-size: 20px;
    color: var(--cal-text);
    letter-spacing: -.3px;
    line-height: 1;
    white-space: nowrap;
  }
  .cal-brand em {
    font-style: italic;
    background: var(--cal-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .cal-month-title {
    font-family: var(--cal-font-display);
    font-size: 22px;
    color: var(--cal-text);
    letter-spacing: -.3px;
    line-height: 1;
  }
  .cal-month-title span {
    color: var(--cal-text3);
    font-size: 18px;
    margin-left: 8px;
  }

  .cal-nav-btn {
    width: 34px; height: 34px;
    background: var(--cal-surface2);
    border: 1px solid var(--cal-border2);
    border-radius: var(--cal-radius-sm);
    color: var(--cal-text2);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all .2s;
    flex-shrink: 0;
  }
  .cal-nav-btn:hover {
    background: var(--cal-surface3);
    border-color: var(--cal-border3);
    color: var(--cal-text);
    box-shadow: var(--cal-shadow);
  }

  .cal-btn-ghost {
    height: 34px; padding: 0 14px;
    background: transparent;
    border: 1px solid var(--cal-border2);
    border-radius: var(--cal-radius-sm);
    color: var(--cal-text2);
    font-family: var(--cal-font-body);
    font-size: 13px; font-weight: 500;
    display: flex; align-items: center; gap: 6px;
    cursor: pointer;
    transition: all .2s;
    white-space: nowrap;
  }
  .cal-btn-ghost:hover { background: var(--cal-surface2); color: var(--cal-text); border-color: var(--cal-border3); }

  .cal-btn-primary {
    height: 34px; padding: 0 16px;
    background: var(--cal-gradient);
    border: none;
    border-radius: var(--cal-radius-sm);
    color: #fff;
    font-family: var(--cal-font-body);
    font-size: 13px; font-weight: 600;
    display: flex; align-items: center; gap: 6px;
    cursor: pointer;
    transition: all .2s;
    box-shadow: 0 2px 12px var(--cal-accent-glow);
    white-space: nowrap;
  }
  .cal-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(99,102,241,.3);
  }
  .cal-btn-primary:disabled {
    opacity: .45; transform: none; cursor: not-allowed;
  }

  .cal-btn-icon {
    width: 34px; height: 34px;
    background: var(--cal-surface2);
    border: 1px solid var(--cal-border);
    border-radius: var(--cal-radius-sm);
    color: var(--cal-text2);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all .2s;
  }
  .cal-btn-icon:hover { background: var(--cal-surface3); color: var(--cal-text); border-color: var(--cal-border2); }
  .cal-btn-icon.active { background: rgba(99,102,241,.08); color: var(--cal-accent); border-color: rgba(99,102,241,.2); }

  .cal-type-strip {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 24px;
    background: var(--cal-surface);
    border-bottom: 1px solid var(--cal-border);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .cal-type-strip::-webkit-scrollbar { display: none; }

  .cal-type-chip {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 13px;
    border-radius: 100px;
    border: 1px solid var(--cal-border);
    background: transparent;
    color: var(--cal-text2);
    font-family: var(--cal-font-body);
    font-size: 12px; font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all .2s;
  }
  .cal-type-chip:hover { border-color: var(--cal-border2); color: var(--cal-text); background: var(--cal-surface2); }
  .cal-type-chip.active { font-weight: 600; }

  .cal-type-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .cal-type-count {
    font-size: 10px; font-weight: 700;
    opacity: .6;
    background: rgba(0,0,0,.06);
    padding: 1px 5px;
    border-radius: 100px;
  }

  .cal-body { display: flex; flex: 1; }
  .cal-main { flex: 1; padding: 16px 20px 24px; min-width: 0; }

  .cal-day-headers {
    display: grid; grid-template-columns: repeat(7, 1fr);
    margin-bottom: 3px;
  }
  .cal-day-header {
    text-align: center;
    font-size: 10px; font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--cal-text3);
    padding: 8px 0;
  }
  .cal-day-header.weekend { color: rgba(99,102,241,.4); }

  .cal-grid {
    display: grid; grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--cal-border);
    border-radius: var(--cal-radius);
    overflow: hidden;
    border: 1px solid var(--cal-border);
    box-shadow: var(--cal-shadow);
  }

  .cal-cell {
    background: var(--cal-surface);
    min-height: 110px;
    padding: 8px;
    cursor: pointer;
    transition: background .15s;
    display: flex; flex-direction: column; gap: 3px;
    position: relative;
  }
  .cal-cell:hover { background: var(--cal-surface2); }
  .cal-cell.empty { background: var(--cal-bg); cursor: default; pointer-events: none; }
  .cal-cell.today { background: rgba(99,102,241,.05); }
  .cal-cell.today::after {
    content: '';
    position: absolute; inset: 0;
    border: 1.5px solid rgba(99,102,241,.35);
    border-radius: 0;
    pointer-events: none;
  }
  .cal-cell.selected:not(.today) { background: rgba(99,102,241,.03); }
  .cal-cell.weekend { background: rgba(0,0,0,.02); }
  .cal-cell.weekend:hover { background: var(--cal-surface2); }

  .cal-date-num {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    font-size: 13px; font-weight: 500;
    color: var(--cal-text2);
    transition: all .15s;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .cal-cell:hover .cal-date-num { color: var(--cal-text); }
  .cal-cell.today .cal-date-num {
    background: var(--cal-gradient);
    color: #fff;
    font-weight: 700;
    box-shadow: 0 2px 8px var(--cal-accent-glow);
  }
  .cal-cell.selected:not(.today) .cal-date-num {
    background: var(--cal-surface3);
    color: var(--cal-accent);
    font-weight: 600;
  }

  .cal-event-pill {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 6px;
    border-radius: 5px;
    font-size: 10px; font-weight: 500;
    color: var(--cal-text);
    border: 1px solid transparent;
    cursor: pointer;
    transition: opacity .15s;
    overflow: hidden;
    line-height: 1.3;
  }
  .cal-event-pill.done { opacity: .4; }
  .cal-event-pill-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .cal-event-pill-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-event-pill-check {
    flex-shrink: 0; background: transparent; border: none;
    color: inherit; cursor: pointer; opacity: .5; padding: 0;
    display: flex; align-items: center; transition: opacity .15s;
  }
  .cal-event-pill-check:hover { opacity: 1; }
  .cal-cell-more { font-size: 10px; color: var(--cal-text3); padding: 1px 6px; font-weight: 500; }

  .cal-week-num-cell {
    background: var(--cal-bg);
    min-height: 110px;
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 10px;
    font-size: 10px; font-weight: 700;
    color: var(--cal-text3);
    letter-spacing: .05em;
    border-right: 1px solid var(--cal-border);
  }

  .cal-sidebar {
    width: 340px;
    background: var(--cal-surface);
    border-left: 1px solid var(--cal-border);
    display: flex; flex-direction: column;
    overflow: hidden; flex-shrink: 0;
  }

  .cal-sidebar-header {
    padding: 24px 22px 18px;
    background: var(--cal-surface2);
    border-bottom: 1px solid var(--cal-border);
    position: relative;
    overflow: hidden;
  }
  .cal-sidebar-header::before {
    content: '';
    position: absolute; top: -40px; right: -40px;
    width: 160px; height: 160px;
    background: radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 70%);
    pointer-events: none;
  }

  .cal-sidebar-date-row { display: flex; align-items: flex-end; gap: 14px; margin-bottom: 16px; }
  .cal-sidebar-day-num {
    font-family: var(--cal-font-display);
    font-size: 64px; font-weight: 400;
    line-height: .9; letter-spacing: -3px;
    background: var(--cal-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .cal-sidebar-day-name {
    font-family: var(--cal-font-display);
    font-size: 18px; font-weight: 400;
    color: var(--cal-text); line-height: 1.2; font-style: italic;
  }
  .cal-sidebar-month-year { font-size: 11px; color: var(--cal-text3); font-weight: 500; margin-top: 2px; letter-spacing: .03em; }

  .cal-progress-bar-wrap { background: var(--cal-surface4); border-radius: 100px; height: 3px; overflow: hidden; margin-bottom: 6px; }
  .cal-progress-bar { height: 100%; border-radius: 100px; background: var(--cal-gradient); transition: width .5s var(--cal-easing); }
  .cal-progress-label { font-size: 11px; color: var(--cal-text3); font-weight: 500; }
  .cal-progress-label strong { color: var(--cal-accent); }

  .cal-sidebar-add-btn {
    margin: 14px 20px 0; padding: 10px 16px;
    background: rgba(99,102,241,.06);
    border: 1px dashed rgba(99,102,241,.3);
    border-radius: var(--cal-radius-sm);
    color: var(--cal-accent);
    font-family: var(--cal-font-body);
    font-size: 12px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    cursor: pointer; transition: all .2s; letter-spacing: .02em;
    width: calc(100% - 40px);
  }
  .cal-sidebar-add-btn:hover { background: rgba(99,102,241,.12); border-style: solid; }

  .cal-sidebar-items { flex: 1; overflow-y: auto; padding: 14px 14px 24px; display: flex; flex-direction: column; gap: 8px; }

  .cal-sidebar-item {
    background: var(--cal-surface2);
    border: 1px solid var(--cal-border);
    border-radius: 10px;
    padding: 12px 12px 12px 16px;
    display: flex; align-items: flex-start; gap: 10px;
    transition: all .2s; position: relative; overflow: hidden;
  }
  .cal-sidebar-item:hover { border-color: var(--cal-border2); background: var(--cal-surface3); box-shadow: var(--cal-shadow); }
  .cal-sidebar-item.done { opacity: .45; }
  .cal-sidebar-item-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 2px 2px 0; }
  .cal-sidebar-item-check {
    flex-shrink: 0; background: transparent; border: none;
    color: var(--cal-text3); cursor: pointer; padding: 0;
    display: flex; align-items: center; transition: color .15s; margin-top: 1px;
  }
  .cal-sidebar-item-check:hover { color: #16a34a; }
  .cal-sidebar-item-check.done { color: #16a34a; }
  .cal-sidebar-item-body { flex: 1; min-width: 0; }
  .cal-sidebar-item-title { font-size: 13px; font-weight: 500; color: var(--cal-text); line-height: 1.4; margin-bottom: 5px; }
  .cal-sidebar-item-title.done { text-decoration: line-through; color: var(--cal-text3); }
  .cal-sidebar-item-note { font-size: 11px; color: var(--cal-text3); line-height: 1.5; margin-bottom: 6px; }
  .cal-sidebar-item-meta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .cal-sidebar-item-badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 2px 7px; border-radius: 100px;
    font-size: 10px; font-weight: 600;
    background: var(--cal-surface3); color: var(--cal-text2);
    border: 1px solid var(--cal-border);
  }
  .cal-sidebar-item-actions { display: flex; gap: 2px; opacity: 0; transition: opacity .15s; flex-shrink: 0; }
  .cal-sidebar-item:hover .cal-sidebar-item-actions { opacity: 1; }
  .cal-action-btn {
    width: 26px; height: 26px; background: transparent; border: none;
    border-radius: 6px; color: var(--cal-text3); cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all .15s;
  }
  .cal-action-btn:hover { background: var(--cal-surface4); color: var(--cal-text); }
  .cal-action-btn.danger:hover { background: rgba(239,68,68,.1); color: #ef4444; }

  .cal-sidebar-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 48px 20px; text-align: center; gap: 12px; flex: 1;
  }
  .cal-sidebar-empty-icon {
    width: 52px; height: 52px; background: var(--cal-surface2);
    border: 1px solid var(--cal-border); border-radius: 14px;
    display: flex; align-items: center; justify-content: center; color: var(--cal-text3);
  }
  .cal-sidebar-empty-title { font-size: 14px; font-weight: 500; color: var(--cal-text2); }
  .cal-sidebar-empty-sub { font-size: 12px; line-height: 1.55; color: var(--cal-text3); max-width: 220px; }

  .cal-drawer {
    background: var(--cal-surface);
    border-right: 1px solid var(--cal-border);
    box-shadow: 8px 0 32px rgba(0,0,0,.1);
  }
  .cal-panel {
    background: var(--cal-surface);
    border-left: 1px solid var(--cal-border);
    box-shadow: -8px 0 32px rgba(0,0,0,.1);
  }
  .cal-drawer-header, .cal-panel-header {
    padding: 18px 20px; border-bottom: 1px solid var(--cal-border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .cal-drawer-title {
    font-family: var(--cal-font-display);
    font-size: 18px; font-weight: 400; color: var(--cal-text);
    display: flex; align-items: center; gap: 10px;
  }

  .cal-panel-day-header {
    padding: 24px 22px 18px;
    background: var(--cal-gradient);
    position: relative; overflow: hidden;
  }
  .cal-panel-day-header::before {
    content: '';
    position: absolute; top: -60px; right: -60px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(255,255,255,.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .cal-panel-day-header::after {
    content: '';
    position: absolute; bottom: -40px; left: -20px;
    width: 120px; height: 120px;
    background: radial-gradient(circle, rgba(0,0,0,.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .cal-item-form { background: var(--cal-surface); border-radius: var(--cal-radius); overflow: hidden; }
  .cal-item-form-header {
    padding: 16px 18px 14px; border-bottom: 1px solid var(--cal-border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .cal-item-form-title {
    font-family: var(--cal-font-display);
    font-size: 16px; font-weight: 400; color: var(--cal-text);
    display: flex; align-items: center; gap: 8px;
  }
  .cal-item-form-icon {
    width: 30px; height: 30px; background: var(--cal-gradient);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    color: #fff; box-shadow: 0 2px 8px var(--cal-accent-glow);
  }
  .cal-item-form-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  .cal-item-form-footer { padding: 12px 18px 16px; border-top: 1px solid var(--cal-border); display: flex; gap: 8px; }

  .cal-form-label {
    font-size: 10px; font-weight: 700; letter-spacing: .09em;
    text-transform: uppercase; color: var(--cal-text3);
    display: flex; align-items: center; gap: 4px; margin-bottom: 5px;
  }
  .cal-form-input {
    width: 100%; background: var(--cal-surface2);
    border: 1px solid var(--cal-border2); border-radius: var(--cal-radius-sm);
    padding: 8px 11px; color: var(--cal-text);
    font-family: var(--cal-font-body); font-size: 13px; font-weight: 400;
    outline: none; transition: border-color .2s, box-shadow .2s;
  }
  .cal-form-input:focus {
    border-color: rgba(99,102,241,.4);
    box-shadow: 0 0 0 3px rgba(99,102,241,.07);
  }
  .cal-form-input::placeholder { color: var(--cal-text3); }
  .cal-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .cal-overlay {
    background: rgba(0,0,0,.25);
    backdrop-filter: blur(4px);
    animation: calFadeIn .2s var(--cal-easing);
  }
  @keyframes calFadeIn { from { opacity: 0 } to { opacity: 1 } }

  .cal-commit-wrap {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 12px; background: var(--cal-surface2);
    border: 1px solid var(--cal-border2); border-radius: var(--cal-radius-sm);
    cursor: pointer; transition: all .2s;
  }
  .cal-commit-wrap:hover { border-color: var(--cal-border3); background: var(--cal-surface3); }
  .cal-commit-label {
    font-size: 9px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: var(--cal-text3); display: block; margin-bottom: 1px;
  }
  .cal-commit-time {
    font-size: 13px; font-weight: 700;
    font-variant-numeric: tabular-nums; font-family: monospace;
    background: var(--cal-gradient);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .cal-commit-idle { font-size: 12px; color: var(--cal-text3); font-style: italic; font-family: var(--cal-font-display); }

  .cal-dialog-surface {
    background: var(--cal-surface) !important;
    border: 1px solid var(--cal-border2) !important;
    border-radius: var(--cal-radius) !important;
    color: var(--cal-text) !important;
  }
  .cal-settings-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; background: var(--cal-surface2);
    border: 1px solid var(--cal-border); border-radius: var(--cal-radius-sm);
  }
  .cal-settings-label { font-size: 13px; font-weight: 500; color: var(--cal-text); }
  .cal-settings-desc { font-size: 11px; color: var(--cal-text3); margin-top: 2px; }

  .cal-type-row {
    display: flex; align-items: center; gap: 6px; padding: 7px 10px;
    border-radius: var(--cal-radius-sm); cursor: pointer; transition: background .15s;
    color: var(--cal-text2); font-size: 13px; font-weight: 500;
  }
  .cal-type-row:hover { background: var(--cal-surface3); color: var(--cal-text); }
  .cal-type-row.active { background: rgba(99,102,241,.07); color: var(--cal-text); }
  .cal-type-row-badge {
    margin-left: auto; font-size: 10px; font-weight: 700;
    background: var(--cal-gradient); color: #fff; padding: 1px 7px; border-radius: 100px;
  }

  .cal-color-swatch {
    width: 36px; height: 36px; border-radius: 8px;
    cursor: pointer; transition: all .2s; border: 2px solid transparent;
  }
  .cal-color-swatch.selected { transform: scale(1.1); border-color: rgba(0,0,0,.15); }

  .cal-icon-option {
    padding: 8px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s;
    border: 1px solid var(--cal-border); background: var(--cal-surface2); color: var(--cal-text2);
  }
  .cal-icon-option:hover { border-color: var(--cal-border2); color: var(--cal-text); }
  .cal-icon-option.selected { background: var(--cal-gradient); border-color: transparent; color: #fff; }

  .cal-day-pill {
    padding: 5px 9px; border-radius: 6px;
    font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s;
    border: 1px solid var(--cal-border2); background: var(--cal-surface2); color: var(--cal-text3);
  }
  .cal-day-pill.selected { background: var(--cal-gradient); border-color: transparent; color: #fff; }

  .cal-panel-item { border-radius: 10px; overflow: hidden; border: 1px solid; transition: all .2s; }
  .cal-panel-item.done { opacity: .5; }
  .cal-panel-item-body { padding: 14px; position: relative; }
  .cal-panel-item-stripe { height: 2px; }

  .cal-mobile-menu {
    background: var(--cal-surface);
    border-right: 1px solid var(--cal-border);
    box-shadow: 8px 0 32px rgba(0,0,0,.1);
  }
  .cal-mobile-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: var(--cal-text3); padding: 0 4px; margin-bottom: 6px;
  }

  .cal-progress-ring { flex-shrink: 0; }

  @media (max-width: 1024px) { .cal-sidebar { display: none; } }
  @media (max-width: 640px) {
    .cal-main { padding: 10px; }
    .cal-cell { min-height: 72px !important; padding: 5px !important; }
    .cal-commit-wrap { display: none; }
    .cal-month-title { font-size: 18px; }
  }
`;

// ─── Inject styles once ───────────────────────────────────────────────────────
function DesignStyles() {
	useEffect(() => {
		const id = "cal-design-styles";
		if (!document.getElementById(id)) {
			const el = document.createElement("style");
			el.id = id;
			el.textContent = DESIGN_STYLES;
			document.head.appendChild(el);
		}
		return () => { };
	}, []);
	return null;
}

// ─── Axios helpers ────────────────────────────────────────────────────────────
async function apiGet(endpoint, config) { const res = await api.get(endpoint, config); return res.data; }
async function apiPost(endpoint, data, config) { const res = await api.post(endpoint, data, config); return res.data; }
async function apiPut(endpoint, data, config) { const res = await api.put(endpoint, data, config); return res.data; }
async function apiPatch(endpoint, data, config) { const res = await api.patch(endpoint, data, config); return res.data; }
async function apiDelete(endpoint, config) { const res = await api.delete(endpoint, config); return res.data; }

// ─── Icon mapping ─────────────────────────────────────────────────────────────
const ICON_COMPONENTS = {
	Target, CheckSquare, Users, Bell, DollarSign, Phone, Music,
	Book, Heart, Star, Mail, ShoppingCart, Dumbbell, Lightbulb, Flame, LayoutGrid,
};

// ─── Color options ────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
	{ value: "bg-gradient-to-br from-rose-400 via-pink-400 to-rose-500", text: "text-white", border: "border-rose-300", ring: "ring-rose-500", nameKey: "colors.red", hex: "#f43f5e", bg: "rgba(244,63,94,.14)" },
	{ value: "bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500", text: "text-white", border: "border-blue-300", ring: "ring-blue-500", nameKey: "colors.blue", hex: "#3b82f6", bg: "rgba(59,130,246,.14)" },
	{ value: "bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500", text: "text-white", border: "border-emerald-300", ring: "ring-emerald-500", nameKey: "colors.green", hex: "#10b981", bg: "rgba(16,185,129,.14)" },
	{ value: "theme-gradient-bg", text: "text-white", border: "theme-soft-border", ring: "ring-primary-500", nameKey: "colors.purple", hex: "#6366f1", bg: "rgba(99,102,241,.14)", isTheme: true },
	{ value: "bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500", text: "text-white", border: "border-amber-300", ring: "ring-amber-500", nameKey: "colors.orange", hex: "#f59e0b", bg: "rgba(245,158,11,.14)" },
	{ value: "bg-gradient-to-br from-indigo-400 via-violet-400 to-indigo-500", text: "text-white", border: "border-indigo-300", ring: "ring-indigo-500", nameKey: "colors.indigo", hex: "#8b5cf6", bg: "rgba(139,92,246,.14)" },
];

// Type color accent map (hex) for the new design tokens
const TYPE_HEX = {
	all: { hex: "#818cf8", bg: "rgba(129,140,248,.12)" },
	habit: { hex: "#10b981", bg: "rgba(16,185,129,.12)" },
	task: { hex: "#6366f1", bg: "rgba(99,102,241,.12)" },
	meeting: { hex: "#a855f7", bg: "rgba(168,85,247,.12)" },
	reminder: { hex: "#f59e0b", bg: "rgba(245,158,11,.12)" },
	billing: { hex: "#f43f5e", bg: "rgba(244,63,94,.12)" },
};
const getTypeHex = (type) => TYPE_HEX[type?.id] || TYPE_HEX.task;

// ─── Default event types ──────────────────────────────────────────────────────
const DEFAULT_TYPES = [
	{ id: "all", nameKey: "types.all", color: "bg-gradient-to-br from-gray-100 to-gray-200", textColor: "text-gray-800", border: "border-gray-300", ring: "ring-gray-500", icon: "LayoutGrid", shadow: "shadow-gray-200" },
	{ id: "habit", nameKey: "types.habit", color: "bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500", textColor: "text-white", border: "border-emerald-300", ring: "ring-emerald-500", icon: "Target", shadow: "shadow-emerald-200" },
	{ id: "task", nameKey: "types.task", color: "theme-gradient-bg", textColor: "text-white", border: "theme-soft-border", ring: "ring-primary-500", icon: "CheckSquare", shadow: "shadow-primary-200" },
	{ id: "meeting", nameKey: "types.meeting", color: "bg-gradient-to-br from-purple-400 via-fuchsia-400 to-purple-500", textColor: "text-white", border: "border-purple-300", ring: "ring-purple-500", icon: "Users", shadow: "shadow-purple-200" },
	{ id: "reminder", nameKey: "types.reminder", color: "bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500", textColor: "text-white", border: "border-amber-300", ring: "ring-amber-500", icon: "Bell", shadow: "shadow-amber-200" },
	{ id: "billing", nameKey: "types.billing", color: "bg-gradient-to-br from-rose-400 via-pink-400 to-rose-500", textColor: "text-white", border: "border-rose-300", ring: "ring-rose-500", icon: "DollarSign", shadow: "shadow-rose-200" },
];

// ─── Endpoints ────────────────────────────────────────────────────────────────
const ENDPOINTS = {
	state: "/calendar/state",
	items: "/calendar/items",
	itemById: (id) => `/calendar/items/${id}`,
	types: "/calendar/types",
	typeById: (id) => `/calendar/types/${id}`,
	completions: "/calendar/completions",
	settings: "/calendar/settings",
	sound: "/calendar/sound",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TAB_OPTIONS = [
	{ value: "boards", label: "kanbanBoard", icon: Home },
	{ value: "calendar", label: "calendar", icon: CalendarIcon },
	{ value: "tasks", label: "todos", icon: ListTodo },
];

// ─── Contrast helper ──────────────────────────────────────────────────────────
function getContrastClasses(bgColorClass = "") {
	const darkBgs = ["from-rose", "from-blue", "from-emerald", "from-teal", "from-purple", "from-fuchsia", "from-amber", "from-orange", "from-indigo", "from-violet", "from-pink", "theme-gradient-bg"];
	const isDark = darkBgs.some(s => bgColorClass.includes(s)) || bgColorClass === "theme-gradient-bg";
	if (isDark) return { title: "text-white drop-shadow-sm", note: "text-white/80", badge: "bg-black/20 text-white border border-white/20", icon: "text-white", check: "text-white/90", checkFilled: "text-white", dot: "bg-white/70" };
	return { title: "text-gray-900", note: "text-gray-600", badge: "bg-black/10 text-gray-900 border border-black/10", icon: "text-gray-700", check: "text-gray-500", checkFilled: "text-emerald-600", dot: "bg-gray-600" };
}

// ─── Progress Ring SVG ────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 24 }) {
	const r = size / 2 - 2.5;
	const circ = 2 * Math.PI * r;
	return (
		<svg width={size} height={size} className="cal-progress-ring" style={{ transform: "rotate(-90deg)" }}>
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(99,102,241,.12)" strokeWidth="2.5" />
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#calPg)" strokeWidth="2.5"
				strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
				strokeLinecap="round" style={{ transition: "stroke-dashoffset .5s cubic-bezier(.16,1,.3,1)" }} />
			<defs>
				<linearGradient id="calPg" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="var(--color-gradient-from)" />
					<stop offset="100%" stopColor="var(--color-gradient-to)" />
				</linearGradient>
			</defs>
		</svg>
	);
}

// ─── Item Form Content ────────────────────────────────────────────────────────
function ItemFormContent({ t, isRTL, editingItem, itemForm, setItemForm, handleSaveItem, onClose, dayNames, eventTypes, renderIcon, getTypeLabel }) {
	const [typeOpen, setTypeOpen] = useState(false);
	const [recurrenceOpen, setRecurrenceOpen] = useState(false);
	return (
		<div className="cal-item-form">
			{/* Header */}
			<div className="cal-item-form-header">
				<div className="cal-item-form-title">
					<div className="cal-item-form-icon">
						<Sparkles size={14} />
					</div>
					{editingItem ? t("editItem") : t("addNewItem")}
				</div>
				<button className="cal-btn-icon" onClick={onClose}>
					<X size={14} />
				</button>
			</div>

			{/* Body */}
			<div className="cal-item-form-body">
				{/* Title */}
				<div>
					<label className="cal-form-label"><Pencil size={10} /> {t("title")}</label>
					<input
						className="cal-form-input"
						value={itemForm.title}
						onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
						placeholder={t("enterTitle")}
						autoFocus
					/>
				</div>

				{/* Note */}
				<div>
					<label className="cal-form-label">
						<FileText size={10} /> {t("note")}
						<span style={{ textTransform: "none", color: "var(--cal-text3)", fontWeight: 400, letterSpacing: 0 }}>({t("optional")})</span>
					</label>
					<textarea
						className="cal-form-input"
						value={itemForm.note || ""}
						onChange={(e) => setItemForm(prev => ({ ...prev, note: e.target.value }))}
						placeholder={t("addNote")}
						rows={2}
						style={{ resize: "none" }}
					/>
				</div>

				{/* Type + Recurrence */}
				<div className="cal-form-grid">
					<div>
						<label className="cal-form-label">{t("type")}</label>
						<Select open={typeOpen} onOpenChange={setTypeOpen} value={itemForm.type}
							onValueChange={(v) => { setItemForm(prev => ({ ...prev, type: v })); setTypeOpen(false); }}>
							<SelectTrigger className="cal-form-input" style={{ height: 36 }}><SelectValue /></SelectTrigger>
							<SelectContent className="rounded-xl z-[9999]" style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)" }}>
								{eventTypes.filter(tt => tt.id !== "all").map(type => (
									<SelectItem key={type.id} value={type.id} className="text-sm" style={{ color: "var(--cal-text)" }}>
										<div className="flex items-center gap-2">{renderIcon(type.icon, "h-3.5 w-3.5")}{getTypeLabel(type)}</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<label className="cal-form-label">{t("recurrence")}</label>
						<Select open={recurrenceOpen} onOpenChange={setRecurrenceOpen} value={itemForm.recurrence}
							onValueChange={(v) => {
								setItemForm(prev => ({ ...prev, recurrence: v, recurrenceInterval: ["daily", "weekly", "monthly"].includes(v) ? 1 : prev.recurrenceInterval }));
								setRecurrenceOpen(false);
							}}>
							<SelectTrigger className="cal-form-input" style={{ height: 36 }}><SelectValue /></SelectTrigger>
							<SelectContent className="rounded-xl z-[9999]" style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)" }}>
								{["none", "daily", "weekly", "monthly", "every_x_days", "custom"].map(v => (
									<SelectItem key={v} value={v} className="text-sm" style={{ color: "var(--cal-text)" }}>
										{t(v === "every_x_days" ? "everyXDays" : v)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* X days interval */}
				{itemForm.recurrence === "every_x_days" && (
					<div>
						<label className="cal-form-label">{t("repeatEveryDays")}</label>
						<input type="number" min="1" className="cal-form-input"
							value={itemForm.recurrenceInterval}
							onChange={(e) => setItemForm(prev => ({ ...prev, recurrenceInterval: parseInt(e.target.value, 10) || 1 }))} />
					</div>
				)}

				{/* Date + Time */}
				<div className="cal-form-grid">
					<div>
						<label className="cal-form-label">{t("startDate")}</label>
						<input type="date" className="cal-form-input"
							value={itemForm.startDate}
							onChange={(e) => setItemForm(prev => ({ ...prev, startDate: e.target.value }))} />
					</div>
					<div>
						<label className="cal-form-label">
							{t("startTime")}
							<span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, color: "var(--cal-text3)" }}>opt.</span>
						</label>
						<input type="time" className="cal-form-input"
							value={itemForm.startTime || ""}
							onChange={(e) => setItemForm(prev => ({ ...prev, startTime: e.target.value }))} />
					</div>
				</div>

				{/* Custom days */}
				{itemForm.recurrence === "custom" && (
					<div style={{ background: "var(--cal-surface2)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--cal-border)" }}>
						<label className="cal-form-label" style={{ marginBottom: 8 }}>{t("selectDays")}</label>
						<div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
							{dayNames.map((day, idx) => (
								<button key={idx} type="button"
									className={cn("cal-day-pill", itemForm.recurrenceDays.includes(idx) && "selected")}
									onClick={() => setItemForm(prev => {
										const days = prev.recurrenceDays.includes(idx) ? prev.recurrenceDays.filter(d => d !== idx) : [...prev.recurrenceDays, idx];
										return { ...prev, recurrenceDays: days };
									})}>
									{day.slice(0, 2)}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="cal-item-form-footer">
				<button className="cal-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>{t("cancel")}</button>
				<button className="cal-btn-primary" style={{ flex: 2, justifyContent: "center" }}
					disabled={!itemForm.title || !itemForm.startDate}
					onClick={handleSaveItem}>
					<Check size={14} /> {editingItem ? t("save") : t("add")}
				</button>
			</div>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
	const t = useTranslations("calendar");
	const t_navbar = useTranslations("nav.items");
	const locale = useLocale();
	const isRTL = locale === "ar";
	const router = useRouter();
	const searchParams = useSearchParams();

	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(null);
	const [items, setItems] = useState([]);
	const [eventTypes, setEventTypes] = useState(DEFAULT_TYPES);
	const [selectedType, setSelectedType] = useState("all");
	const [completions, setCompletions] = useState({});
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [showAddTypeDrawer, setShowAddTypeDrawer] = useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [newTypeName, setNewTypeName] = useState("");
	const [newTypeColor, setNewTypeColor] = useState(COLOR_OPTIONS[3].value);
	const [newTypeIcon, setNewTypeIcon] = useState("Target");
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [itemToDelete, setItemToDelete] = useState(null);
	const [showDeleteTypeConfirm, setShowDeleteTypeConfirm] = useState(false);
	const [typeToDelete, setTypeToDelete] = useState(null);
	const [showAddPopover, setShowAddPopover] = useState(false);
	const [editingPopoverId, setEditingPopoverId] = useState(null);
	const [editingPopoverSource, setEditingPopoverSource] = useState(null);
	const [editingItem, setEditingItem] = useState(null);
	const [settings, setSettings] = useState({ showWeekNumbers: false, highlightWeekend: true, weekendDays: [5, 6], startOfWeek: 6, confirmBeforeDelete: true });
	const [itemForm, setItemForm] = useState({ id: "", title: "", note: "", type: "task", startDate: "", startTime: "", recurrence: "none", recurrenceInterval: 1, recurrenceDays: [] });

	const currentTab = searchParams.get("tab") || "calendar";
	const handleTabChange = (tab) => { const p = new URLSearchParams(searchParams); p.set("tab", tab); router.push(`?${p.toString()}`); };

	useEffect(() => { try { localStorage.setItem("calendarItems", JSON.stringify(items)); } catch { } }, [items]);
	useEffect(() => { try { localStorage.setItem("eventTypes", JSON.stringify(eventTypes)); } catch { } }, [eventTypes]);
	useEffect(() => { try { localStorage.setItem("completions", JSON.stringify(completions)); } catch { } }, [completions]);
	useEffect(() => { try { localStorage.setItem("calendarSettings", JSON.stringify(settings)); } catch { } }, [settings]);
	useEffect(() => { try { localStorage.setItem("soundEnabled", JSON.stringify(soundEnabled)); } catch { } }, [soundEnabled]);

	useEffect(() => {
		let mounted = true;
		const loadFromLocal = () => {
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
			} catch { }
		};
		const load = async () => {
			try {
				const state = await apiGet(ENDPOINTS.state);
				if (!mounted) return;
				if (Array.isArray(state?.items)) setItems(state.items);
				if (Array.isArray(state?.eventTypes)) setEventTypes(state.eventTypes);
				if (state?.completions) setCompletions(state.completions);
				if (state?.settings) setSettings(state.settings);
				if (typeof state?.soundEnabled === "boolean") setSoundEnabled(state.soundEnabled);
			} catch {
				try {
					const [ir, tr, cr, sr, dr] = await Promise.allSettled([apiGet(ENDPOINTS.items), apiGet(ENDPOINTS.types), apiGet(ENDPOINTS.completions), apiGet(ENDPOINTS.settings), apiGet(ENDPOINTS.sound)]);
					if (!mounted) return;
					if (ir.status === "fulfilled") setItems(ir.value?.items || ir.value || []);
					if (tr.status === "fulfilled") setEventTypes(tr.value?.eventTypes || tr.value || DEFAULT_TYPES);
					if (cr.status === "fulfilled") setCompletions(cr.value?.completions || cr.value || {});
					if (sr.status === "fulfilled") setSettings(sr.value?.settings || sr.value || settings);
					if (dr.status === "fulfilled" && typeof dr.value?.soundEnabled === "boolean") setSoundEnabled(dr.value.soundEnabled);
					if ([ir, tr, cr, sr, dr].every(r => r.status === "rejected")) loadFromLocal();
				} catch { loadFromLocal(); }
			}
		};
		load();
		return () => { mounted = false; };
	}, []);

	const playSound = () => {
		if (!soundEnabled) return;
		const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuBzvLZiTUIGmm98OScTgwOUKjk8bllHAU2kdny0HssBS16yPLaizsKEl+16+uoVRQKRp/h8r5sIQQrgc/y2Yk1CBppvfDknE4MDlCo5PG5ZRwFN5HZ8tB7LAUtesjy2os7ChJftevrqFUUCkaf4fK+bCEEK4HP8tmJNQgaaL3w5JxODA5QqOTxuWUcBTeR2fLQeywFLXrI8tqLOwoSX7Xr66hVFApGn+HyvmwhBCuBz/LZiTUIGmi98OScTgwOUKjk8bllHAU3kdny0HssBS16yPLaizsKEl+16+uoVRQKRp/h8r5sIQQrgc/y2Yk1CBpovfDknE4MDlCo5PG5ZRwFN5HZ8tB7LAUtesjy2os7ChJftevrqFUUCkaf4fK+bCEEK4HP8tmJNQgaaL3w5JxODA5QqOTxuWUcBTeR2fLQeywFLXrI8tqLOwoSX7Xr66hVFApGn+HyvmwhBCuBz/LZiTUIGmi98OScTgwOUKjk8bllHAU3kdny0HssBS16yPLaizsK");
		audio.play().catch(() => { });
	};

	const monthNames = useMemo(() => [t("january"), t("february"), t("march"), t("april"), t("may"), t("june"), t("july"), t("august"), t("september"), t("october"), t("november"), t("december")], [t]);
	const dayNames = useMemo(() => [t("sunday"), t("monday"), t("tuesday"), t("wednesday"), t("thursday"), t("friday"), t("saturday")], [t]);
	const adjustedDayNames = useMemo(() => { const a = []; for (let i = 0; i < 7; i++) a.push(dayNames[(i + settings.startOfWeek) % 7]); return a; }, [dayNames, settings.startOfWeek]);

	const getWeekNumber = (date) => {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dn = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dn);
		const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil((((+d - +ys) / 86400000) + 1) / 7);
	};

	const getDateString = (date) => date.toISOString().split("T")[0];

	const formatTime = (timeStr) => {
		if (!timeStr) return "";
		const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
		if (m24) { let h = parseInt(m24[1], 10); const min = m24[2]; const ap = h >= 12 ? "PM" : "AM"; h = h % 12; if (!h) h = 12; return `${h}:${min} ${ap}`; }
		const m12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
		if (m12) return `${parseInt(m12[1], 10)}:${m12[2]} ${m12[3].toUpperCase()}`;
		return timeStr;
	};

	const isWeekend = (date) => settings.weekendDays.includes(date.getDay());
	const getCompletionKey = (itemId, date) => `${itemId}_${getDateString(date)}`;
	const isItemCompleted = (itemId, date) => !!completions[getCompletionKey(itemId, date)];

	const renderIcon = (iconName, className = "h-4 w-4") => {
		const IC = (iconName && ICON_COMPONENTS[iconName]) || CalendarIcon;
		return <IC className={className} />;
	};

	const getTypeLabel = (type) => {
		if (!type) return t("types.all");
		if (type.custom) return type.name || "";
		return type.nameKey ? t(type.nameKey) : type.name || "";
	};

	const getItemsForDate = (date) => {
		const dateStr = getDateString(date);
		return items.filter((item) => {
			if (item.recurrence === "none") return item.startDate === dateStr;
			const startDate = new Date(item.startDate);
			if (date < startDate) return false;
			const diff = Math.floor((+date - +startDate) / (1000 * 60 * 60 * 24));
			switch (item.recurrence) {
				case "daily": return diff % (item.recurrenceInterval || 1) === 0;
				case "weekly": return diff % (7 * (item.recurrenceInterval || 1)) === 0;
				case "monthly": return date.getDate() === startDate.getDate() && (date.getMonth() - startDate.getMonth() + 12 * (date.getFullYear() - startDate.getFullYear())) % (item.recurrenceInterval || 1) === 0;
				case "custom": return item.recurrenceDays.includes(date.getDay()) && diff >= 0;
				case "every_x_days": return diff % (item.recurrenceInterval || 1) === 0;
				default: return false;
			}
		});
	};

	const getItemCountByType = (typeId) => typeId === "all" ? items.length : items.filter(i => i.type === typeId).length;

	const getProgressForDate = (date) => {
		const its = getItemsForDate(date);
		if (!its.length) return { completed: 0, total: 0, percentage: 0 };
		const completed = its.filter(it => isItemCompleted(it.id, date)).length;
		return { completed, total: its.length, percentage: Math.round((completed / its.length) * 100) };
	};

	const getItemPopoverKey = (itemId, dateStr) => `${itemId}_${dateStr}`;

	const resetItemForm = () => {
		const today = new Date();
		setItemForm({ id: "", title: "", note: "", type: "task", startDate: today.toISOString().split("T")[0], startTime: "", recurrence: "none", recurrenceInterval: 1, recurrenceDays: [] });
		setEditingItem(null);
		setEditingPopoverId(null);
		setEditingPopoverSource(null);
	};

	const openEditPopover = (item, dateStr, source = "calendar") => {
		setShowAddPopover(false);
		setEditingItem(item);
		setItemForm({ ...item, note: item.note || "", recurrenceDays: item.recurrenceDays || [], recurrenceInterval: item.recurrenceInterval || 1 });
		setEditingPopoverId(getItemPopoverKey(item.id, dateStr));
		setEditingPopoverSource(source);
	};

	const toggleCompletion = async (itemId, date) => {
		const key = getCompletionKey(itemId, date);
		const dateStr = getDateString(date);
		let nextVal = false;
		setCompletions(prev => { nextVal = !prev[key]; return { ...prev, [key]: nextVal }; });
		playSound();
		try { await apiPatch(ENDPOINTS.completions, { key, itemId, date: dateStr, completed: nextVal }); }
		catch { setCompletions(prev => ({ ...prev, [key]: !nextVal })); }
	};

	const handleSaveItem = useCallback(async () => {
		if (!itemForm.title || !itemForm.startDate) return;
		const finalForm = { ...itemForm, recurrenceInterval: ["daily", "weekly", "monthly"].includes(itemForm.recurrence) ? 1 : itemForm.recurrenceInterval, note: itemForm.note || "" };
		if (editingItem) {
			const updated = { ...finalForm, id: editingItem.id };
			setItems(prev => prev.map(it => it.id === editingItem.id ? updated : it));
			try { await apiPut(ENDPOINTS.itemById(editingItem.id), updated); }
			catch { try { const fresh = await apiGet(ENDPOINTS.items); setItems(fresh?.items || fresh || []); } catch { } }
		} else {
			const tempId = `tmp_${Date.now()}`;
			const local = { ...finalForm, id: tempId };
			setItems(prev => [...prev, local]);
			try {
				const created = await apiPost(ENDPOINTS.items, { ...local, note: finalForm.note });
				const sv = created?.item || created;
				if (sv?.id && sv.id !== tempId) setItems(prev => prev.map(it => it.id === tempId ? sv : it));
			} catch { }
		}
		setShowAddPopover(false);
		setEditingPopoverId(null);
		setEditingPopoverSource(null);
		resetItemForm();
		playSound();
	}, [itemForm, editingItem]);

	const handleDeleteItem = (item) => {
		if (settings.confirmBeforeDelete) { setItemToDelete(item); setShowDeleteConfirm(true); }
		else confirmDelete(item);
	};

	const confirmDelete = async (item = itemToDelete) => {
		if (!item) return;
		const prev = items;
		setItems(p => p.filter(i => i.id !== item.id));
		setShowDeleteConfirm(false); setItemToDelete(null); setEditingPopoverId(null); setEditingItem(null);
		playSound();
		try { await apiDelete(ENDPOINTS.itemById(item.id)); }
		catch { setItems(prev); }
	};

	const handleAddType = async () => {
		if (!newTypeName.trim()) return;
		const sc = COLOR_OPTIONS.find(c => c.value === newTypeColor);
		const newType = { id: `custom_${Date.now()}`, name: newTypeName, color: newTypeColor, textColor: sc?.text || "text-white", border: sc?.border || "border-gray-200", ring: sc?.ring || "ring-gray-500", shadow: sc?.shadow || "shadow-gray-200", icon: newTypeIcon, custom: true };
		setEventTypes(prev => [...prev, newType]);
		try {
			const created = await apiPost(ENDPOINTS.types, newType);
			const st = created?.type || created;
			if (st?.id && st.id !== newType.id) setEventTypes(prev => prev.map(tt => tt.id === newType.id ? st : tt));
		} catch { }
		setNewTypeName(""); setNewTypeColor(COLOR_OPTIONS[3].value); setNewTypeIcon("Target"); setShowAddTypeDrawer(false); playSound();
	};

	const handleDeleteType = (typeId) => {
		const type = eventTypes.find(tt => tt.id === typeId);
		if (!type || !type.custom) return;
		setTypeToDelete(type); setShowDeleteTypeConfirm(true);
	};

	const confirmDeleteType = async () => {
		if (!typeToDelete) return;
		const pt = eventTypes; const pi = items;
		setEventTypes(prev => prev.filter(tt => tt.id !== typeToDelete.id));
		setItems(prev => prev.filter(it => it.type !== typeToDelete.id));
		setShowDeleteTypeConfirm(false); setTypeToDelete(null); playSound();
		try { await apiDelete(ENDPOINTS.typeById(typeToDelete.id)); }
		catch { setEventTypes(pt); setItems(pi); }
	};

	useEffect(() => { apiPut(ENDPOINTS.settings, { settings }).catch(() => { }); }, [settings]);
	useEffect(() => { apiPut(ENDPOINTS.sound, { soundEnabled }).catch(() => { }); }, [soundEnabled]);

	const ICON_OPTIONS = useMemo(() => [
		{ value: "Target", label: t("icons.target"), Icon: Target },
		{ value: "CheckSquare", label: t("icons.check"), Icon: CheckSquare },
		{ value: "DollarSign", label: t("icons.money"), Icon: DollarSign },
		{ value: "Bell", label: t("icons.bell"), Icon: Bell },
		{ value: "Star", label: t("icons.star"), Icon: Star },
		{ value: "Book", label: t("icons.book"), Icon: Book },
		{ value: "Phone", label: t("icons.phone"), Icon: Phone },
		{ value: "Music", label: t("icons.music"), Icon: Music },
		{ value: "Heart", label: t("icons.health"), Icon: Heart },
		{ value: "Mail", label: t("icons.email"), Icon: Mail },
		{ value: "ShoppingCart", label: t("icons.shopping"), Icon: ShoppingCart },
		{ value: "Dumbbell", label: t("icons.fitness"), Icon: Dumbbell },
		{ value: "Lightbulb", label: t("icons.ideas"), Icon: Lightbulb },
		{ value: "Flame", label: t("icons.important"), Icon: Flame },
	], [t]);

	const selectedTypeObj = eventTypes.find(tt => tt.id === selectedType);

	// ─── Month View ───────────────────────────────────────────────────────────
	const renderMonthView = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startOffset = (firstDay.getDay() - settings.startOfWeek + 7) % 7;
		const daysInMonth = lastDay.getDate();

		const days = [];
		for (let i = 0; i < startOffset; i++) days.push({ date: null });
		for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i) });
		const tail = (7 - (days.length % 7)) % 7;
		for (let i = 0; i < tail; i++) days.push({ date: null });
		const weeks = [];
		for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

		const cols = settings.showWeekNumbers ? "grid-cols-8" : "grid-cols-7";
		const gridCols = settings.showWeekNumbers ? { gridTemplateColumns: "36px repeat(7, 1fr)" } : {};

		return (
			<div>
				{/* Day headers */}
				<div className="cal-day-headers" style={settings.showWeekNumbers ? { gridTemplateColumns: "36px repeat(7, 1fr)" } : {}}>
					{settings.showWeekNumbers && <div style={{ background: "transparent" }} />}
					{adjustedDayNames.map((day, idx) => {
						const origIdx = (idx + settings.startOfWeek) % 7;
						const isWknd = origIdx === 0 || origIdx === 6;
						return (
							<div key={idx} className={cn("cal-day-header", isWknd && "weekend")}>
								<span className="hidden sm:inline">{day}</span>
								<span className="sm:hidden">{day.slice(0, 1)}</span>
							</div>
						);
					})}
				</div>

				{/* Grid */}
				<div className="cal-grid" style={gridCols}>
					{weeks.map((week, wi) => (
						<>
							{settings.showWeekNumbers && (
								<div key={`wk-${wi}`} className="cal-week-num-cell">{week[0].date && getWeekNumber(week[0].date)}</div>
							)}
							{week.map(({ date }, di) => {
								const key = date ? getDateString(date) : `e-${wi}-${di}`;
								if (!date) return <div key={key} className="cal-cell empty" />;

								const dateStr = getDateString(date);
								const allForDay = getItemsForDate(date);
								const filteredItems = selectedType === "all" ? allForDay : allForDay.filter(it => it.type === selectedType);
								const today = new Date(); today.setHours(0, 0, 0, 0);
								const isToday = dateStr === getDateString(today);
								const isSel = selectedDate && dateStr === getDateString(selectedDate);
								const prog = getProgressForDate(date);
								const isWknd = isWeekend(date);

								return (
									<div key={dateStr}
										className={cn("cal-cell", isToday && "today", isSel && !isToday && "selected", isWknd && settings.highlightWeekend && !isToday && "weekend")}
										onClick={() => { setSelectedDate(date); }}>

										<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
											<div className={cn("cal-date-num")}>{date.getDate()}</div>
											{prog.total > 0 && (
												<div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }} className="hidden sm:flex items-center justify-center">
													<ProgressRing pct={prog.percentage} size={24} />
													<span style={{ position: "absolute", fontSize: 8, fontWeight: 700, color: "var(--cal-text2)" }}>{prog.completed}</span>
												</div>
											)}
										</div>

										<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
											{filteredItems.slice(0, 3).map(item => {
												const type = eventTypes.find(tt => tt.id === item.type);
												const { hex, bg } = getTypeHex(type);
												const done = isItemCompleted(item.id, date);
												const popoverKey = getItemPopoverKey(item.id, dateStr);
												const contrast = getContrastClasses(type?.color || "");

												return (
													<div key={item.id}
														className={cn("cal-event-pill group/item", done && "done")}
														style={{ background: bg, borderColor: `${hex}25` }}
														onClick={e => e.stopPropagation()}>
														<button className="cal-event-pill-check"
															onClick={e => { e.stopPropagation(); toggleCompletion(item.id, date); }}>
															{done
																? <CheckCircle2 size={9} style={{ color: hex }} />
																: <Circle size={9} style={{ color: `${hex}80` }} />
															}
														</button>
														<span className="cal-event-pill-dot" style={{ background: hex }} />
														<MultiLangText className={cn("cal-event-pill-title", done && "line-through")} style={{ color: "var(--cal-text)" }}>
															{item.title}
														</MultiLangText>

														{/* Inline edit/delete on hover */}
														<div style={{ display: "flex", gap: 1, opacity: 0, transition: "opacity .15s" }}
															className="group-hover/item:!opacity-100">
															<Popover
																open={editingPopoverId === popoverKey && editingPopoverSource === "calendar"}
																onOpenChange={(open) => { if (!open && editingPopoverSource === "calendar") { setEditingPopoverId(null); setEditingItem(null); setEditingPopoverSource(null); resetItemForm(); } }}>
																<PopoverTrigger asChild>
																	<button style={{ width: 16, height: 16, background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cal-text2)" }}
																		onClick={e => { e.stopPropagation(); openEditPopover(item, dateStr, "calendar"); }}>
																		<Pencil size={8} />
																	</button>
																</PopoverTrigger>
																<PopoverContent className="p-0 rounded-xl shadow-2xl w-80 sm:w-96" side={isRTL ? "left" : "right"} align="start" sideOffset={8} onOpenAutoFocus={e => e.preventDefault()}>
																	<ItemFormContent t={t} isRTL={isRTL} editingItem={editingItem} itemForm={itemForm} setItemForm={setItemForm} handleSaveItem={handleSaveItem} dayNames={dayNames} eventTypes={eventTypes} renderIcon={renderIcon} getTypeLabel={getTypeLabel}
																		onClose={() => { setEditingPopoverId(null); setEditingItem(null); setEditingPopoverSource(null); resetItemForm(); }} />
																</PopoverContent>
															</Popover>
															<button style={{ width: 16, height: 16, background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}
																onClick={e => { e.stopPropagation(); handleDeleteItem(item); }}>
																<Trash2 size={8} />
															</button>
														</div>
													</div>
												);
											})}
											{filteredItems.length > 3 && (
												<div className="cal-cell-more">+{filteredItems.length - 3} {t("more")}</div>
											)}
										</div>
									</div>
								);
							})}
						</>
					))}
				</div>
			</div>
		);
	};

	// ─── Render ───────────────────────────────────────────────────────────────
	return (
		<div dir={isRTL ? "rtl" : "ltr"} className="cal-wrap !p-0" style={{ minHeight: "100vh", background: "var(--cal-bg)", color: "var(--cal-text)", display: "flex", flexDirection: "column" }}>
			<DesignStyles />

			{/* Overlay for drawers */}
			{(showAddTypeDrawer || showMobileMenu) && (
				<div className="cal-overlay fixed inset-0 z-40" onClick={() => { setShowAddTypeDrawer(false); setShowMobileMenu(false); setEditingPopoverId(null); setEditingItem(null); }} />
			)}

			{/* ─── Top Bar ────────────────────────────────────────────── */}
			<div className="cal-topbar" style={{ padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
				{/* Left */}
				<div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
					 

					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<button className="cal-nav-btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
							{isRTL ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
						</button>
						<div className="cal-month-title" style={{ minWidth: 200, textAlign: "center" }}>
							{monthNames[currentDate.getMonth()]}<span>{currentDate.getFullYear()}</span>
						</div>
						<button className="cal-nav-btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
							{isRTL ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
						</button>
					</div>
				</div>

				{/* Center: Countdown */}
				<div className="hidden md:block" style={{ flexShrink: 0 }}>
					<CountdownTimer />
				</div>

				{/* Right actions */}
				<div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
					{/* Tab selector */}
					<div className="hidden sm:block">
						<Select value={currentTab} onValueChange={handleTabChange}>
							<SelectTrigger className="cal-btn-ghost" style={{ width: 130, border: "1px solid var(--cal-border2)" }}>
								<SelectValue><span style={{ color: "var(--cal-text)", fontSize: 13, fontWeight: 500 }}>{t_navbar(TAB_OPTIONS.find(t => t.value === currentTab)?.label)}</span></SelectValue>
							</SelectTrigger>
							<SelectContent style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)", borderRadius: 10 }}>
								{TAB_OPTIONS.map(tab => (
									<SelectItem key={tab.value} value={tab.value} style={{ color: "var(--cal-text)", fontSize: 13 }}>
										<div style={{ display: "flex", alignItems: "center", gap: 8 }}>{t_navbar(tab.label)}<tab.icon size={13} /></div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Type filter */}
					<div className="hidden sm:block">
						<Popover>
							<PopoverTrigger asChild>
								<button className="cal-btn-ghost">
									{renderIcon(selectedTypeObj?.icon || "LayoutGrid", "h-4 w-4")}
									<span className="hidden lg:inline" style={{ color: "var(--cal-text)", fontSize: 13 }}>{getTypeLabel(selectedTypeObj)}</span>
									<ChevronDown size={13} />
								</button>
							</PopoverTrigger>
							<PopoverContent align="end" style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)", borderRadius: 12, padding: 8, width: 240 }}>
								{eventTypes.map(type => {
									const { hex } = getTypeHex(type);
									return (
										<div key={type.id} className={cn("cal-type-row", selectedType === type.id && "active")}
											onClick={() => setSelectedType(type.id)}>
											<span style={{ width: 7, height: 7, borderRadius: "50%", background: hex, flexShrink: 0 }} />
											{renderIcon(type.icon, "h-3.5 w-3.5")}
											<span style={{ flex: 1 }}>{getTypeLabel(type)}</span>
											<span className="cal-type-row-badge">{getItemCountByType(type.id)}</span>
										</div>
									);
								})}
								<div style={{ borderTop: "1px solid var(--cal-border)", paddingTop: 6, marginTop: 4 }}>
									<div className="cal-type-row" style={{ color: "var(--cal-accent)" }} onClick={() => setShowAddTypeDrawer(true)}>
										<Plus size={14} /> {t("addNewType")}
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</div>

					{/* Add item */}
					<Popover open={showAddPopover} onOpenChange={(o) => { setShowAddPopover(o); if (o) { setEditingItem(null); setEditingPopoverId(null); resetItemForm(); } }}>
						<PopoverTrigger asChild>
							<button className="cal-btn-primary" onClick={() => { setEditingItem(null); setEditingPopoverId(null); resetItemForm(); }}>
								<Plus size={14} /> <span className="hidden sm:inline">{t("add")}</span>
							</button>
						</PopoverTrigger>
						<PopoverContent className="p-0 rounded-xl shadow-2xl w-80 sm:w-96" align="end" sideOffset={6}>
							<ItemFormContent t={t} isRTL={isRTL} editingItem={editingItem} itemForm={itemForm} setItemForm={setItemForm} handleSaveItem={handleSaveItem} dayNames={dayNames} eventTypes={eventTypes} renderIcon={renderIcon} getTypeLabel={getTypeLabel} onClose={() => setShowAddPopover(false)} />
						</PopoverContent>
					</Popover>

					{/* Sound */}
					<button className={cn("cal-btn-icon", soundEnabled && "active")} onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? "Sound on" : "Sound off"}>
						{soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
					</button>

					{/* Settings */}
					<button className="cal-btn-icon hidden sm:flex" onClick={() => setShowSettingsDialog(true)}>
						<Settings size={15} />
					</button>

					{/* Mobile menu */}
					<button className="cal-btn-icon sm:hidden" onClick={() => setShowMobileMenu(true)}>
						<Menu size={15} />
					</button>
				</div>
			</div>

			{/* ─── Type Strip ─────────────────────────────────────────── */}
			<div className="cal-type-strip">
				{eventTypes.map(type => {
					const { hex, bg } = getTypeHex(type);
					const active = selectedType === type.id;
					return (
						<button key={type.id} className={cn("cal-type-chip", active && "active")}
							style={active ? { borderColor: hex, background: bg, color: hex } : {}}
							onClick={() => setSelectedType(type.id)}>
							<span className="cal-type-dot" style={{ background: hex }} />
							{getTypeLabel(type)}
							<span className="cal-type-count">{getItemCountByType(type.id)}</span>
						</button>
					);
				})}
			</div>

			{/* ─── Body ───────────────────────────────────────────────── */}
			<div className="cal-body" style={{ flex: 1 }}>
				{/* Main calendar */}
				<div className="cal-main" style={{ overflowY: "auto" }}>
					{renderMonthView()}
				</div>

				{/* ─── Persistent Sidebar (desktop) ─────────────────── */}
				<div className="cal-sidebar" style={{ display: "flex" }}>
					{selectedDate ? (
						<>
							{/* Sidebar header */}
							<div className="cal-sidebar-header">
								<div className="cal-sidebar-date-row">
									<div className="cal-sidebar-day-num">{selectedDate.getDate()}</div>
									<div>
										<div className="cal-sidebar-day-name">{dayNames[selectedDate.getDay()]}</div>
										<div className="cal-sidebar-month-year">{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}</div>
									</div>
								</div>
								{(() => {
									const prog = getProgressForDate(selectedDate);
									if (!prog.total) return null;
									return (
										<div>
											<div className="cal-progress-bar-wrap">
												<div className="cal-progress-bar" style={{ width: `${prog.percentage}%` }} />
											</div>
											<div className="cal-progress-label">
												<strong>{prog.completed}</strong> of {prog.total} done · {prog.percentage}%
											</div>
										</div>
									);
								})()}
							</div>

							<button className="cal-sidebar-add-btn" onClick={() => { const ds = getDateString(selectedDate); resetItemForm(); setItemForm(prev => ({ ...prev, startDate: ds })); setShowAddPopover(true); }}>
								<Plus size={13} /> {t("addNewItem")}
							</button>

							<div className="cal-sidebar-items">
								{(() => {
									const its = getItemsForDate(selectedDate);
									const filtered = selectedType === "all" ? its : its.filter(it => it.type === selectedType);
									const dateStr = getDateString(selectedDate);

									if (!filtered.length) return (
										<div className="cal-sidebar-empty">
											<div className="cal-sidebar-empty-icon"><CalendarIcon size={22} /></div>
											<div className="cal-sidebar-empty-title">{t("noTasksTitle")}</div>
											<div className="cal-sidebar-empty-sub">{t("noTasksDesc")}</div>
										</div>
									);

									return filtered.map(item => {
										const type = eventTypes.find(tt => tt.id === item.type);
										const { hex, bg } = getTypeHex(type);
										const done = isItemCompleted(item.id, selectedDate);
										const popoverKey = getItemPopoverKey(item.id, dateStr);
										const recLabel = item.recurrence === "none" ? "" : item.recurrence === "every_x_days" ? t("everyXDaysLabel", { count: item.recurrenceInterval }) : t(`recurrenceLabels.${item.recurrence}`);

										return (
											<div key={item.id} className={cn("cal-sidebar-item", done && "done")}>
												<div className="cal-sidebar-item-accent" style={{ background: hex }} />
												<button className={cn("cal-sidebar-item-check", done && "done")} onClick={() => toggleCompletion(item.id, selectedDate)}>
													{done ? <CheckCircle2 size={16} style={{ color: "#4ade80" }} /> : <Circle size={16} />}
												</button>
												<div className="cal-sidebar-item-body">
													<div className={cn("cal-sidebar-item-title", done && "done")}>{item.title}</div>
													{item.note && <div className="cal-sidebar-item-note">{item.note}</div>}
													<div className="cal-sidebar-item-meta">
														<span className="cal-sidebar-item-badge" style={{ borderColor: `${hex}30`, color: hex, background: bg }}>
															{renderIcon(type?.icon, "h-2.5 w-2.5")} {getTypeLabel(type)}
														</span>
														{item.startTime && <span className="cal-sidebar-item-badge"><Clock size={10} /> {formatTime(item.startTime)}</span>}
														{item.recurrence !== "none" && <span className="cal-sidebar-item-badge"><Repeat size={10} /> {recLabel}</span>}
													</div>
												</div>
												<div className="cal-sidebar-item-actions">
													<Popover open={editingPopoverId === popoverKey && editingPopoverSource === "sidebar"}
														onOpenChange={(o) => { if (!o && editingPopoverSource === "sidebar") { setEditingPopoverId(null); setEditingItem(null); setEditingPopoverSource(null); resetItemForm(); } }}>
														<PopoverTrigger asChild>
															<button className="cal-action-btn" onClick={() => openEditPopover(item, dateStr, "sidebar")}><Pencil size={13} /></button>
														</PopoverTrigger>
														<PopoverContent className="p-0 rounded-xl shadow-2xl w-80 sm:w-96" side={isRTL ? "right" : "left"} align="start" sideOffset={8} onOpenAutoFocus={e => e.preventDefault()}>
															<ItemFormContent t={t} isRTL={isRTL} editingItem={editingItem} itemForm={itemForm} setItemForm={setItemForm} handleSaveItem={handleSaveItem} dayNames={dayNames} eventTypes={eventTypes} renderIcon={renderIcon} getTypeLabel={getTypeLabel}
																onClose={() => { setEditingPopoverId(null); setEditingItem(null); setEditingPopoverSource(null); resetItemForm(); }} />
														</PopoverContent>
													</Popover>
													<button className="cal-action-btn danger" onClick={() => handleDeleteItem(item)}><Trash2 size={13} /></button>
												</div>
											</div>
										);
									});
								})()}
							</div>
						</>
					) : (
						<div className="cal-sidebar-empty" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
							<div className="cal-sidebar-empty-icon"><CalendarIcon size={22} /></div>
							<div className="cal-sidebar-empty-title">Select a day</div>
							<div className="cal-sidebar-empty-sub">Click any date to see its items here</div>
						</div>
					)}
				</div>
			</div>


			{/* ─── Mobile Menu ────────────────────────────────────────── */}
			<div className={cn("fixed top-0 bottom-0 z-50 w-72 flex flex-col cal-mobile-menu sm:hidden", isRTL ? "right-0" : "left-0", showMobileMenu ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full")}
				style={{ transition: "transform .3s cubic-bezier(.16,1,.3,1)" }}>
				<div style={{ padding: "16px 18px", borderBottom: "1px solid var(--cal-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div className="cal-brand"><em>Planner</em></div>
					<button className="cal-btn-icon" onClick={() => setShowMobileMenu(false)}><X size={14} /></button>
				</div>
				<div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
					<div style={{ marginBottom: 20 }}>
						<div className="cal-mobile-section-label">Commitment</div>
						<CountdownTimer />
					</div>
					<div style={{ marginBottom: 20 }}>
						<div className="cal-mobile-section-label">Navigate</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
							{TAB_OPTIONS.map(tab => (
								<button key={tab.value} onClick={() => { handleTabChange(tab.value); setShowMobileMenu(false); }}
									style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: currentTab === tab.value ? "var(--cal-gradient)" : "transparent", color: currentTab === tab.value ? "#fff" : "var(--cal-text2)", transition: "all .15s" }}>
									<tab.icon size={14} /> {t_navbar(tab.label)}
								</button>
							))}
						</div>
					</div>
					<div style={{ marginBottom: 20 }}>
						<div className="cal-mobile-section-label">Filter</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
							{eventTypes.map(type => {
								const { hex, bg } = getTypeHex(type);
								const active = selectedType === type.id;
								return (
									<button key={type.id} onClick={() => { setSelectedType(type.id); setShowMobileMenu(false); }}
										style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer", border: "none", background: active ? bg : "transparent", color: active ? hex : "var(--cal-text2)", transition: "all .15s" }}>
										<span style={{ width: 7, height: 7, borderRadius: "50%", background: hex, flexShrink: 0 }} />
										<span style={{ flex: 1, textAlign: "left" }}>{getTypeLabel(type)}</span>
										<span style={{ fontSize: 10, fontWeight: 700, background: "var(--cal-surface3)", color: "var(--cal-text2)", padding: "2px 6px", borderRadius: 100 }}>{getItemCountByType(type.id)}</span>
									</button>
								);
							})}
							<button onClick={() => { setShowAddTypeDrawer(true); setShowMobileMenu(false); }}
								style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "var(--cal-accent)", transition: "all .15s" }}>
								<Plus size={14} /> {t("addNewType")}
							</button>
						</div>
					</div>
					<button onClick={() => { setShowSettingsDialog(true); setShowMobileMenu(false); }}
						style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "var(--cal-text2)", width: "100%" }}>
						<Settings size={14} /> {t("settings")}
					</button>
				</div>
			</div>

			{/* ─── Add Type Drawer ────────────────────────────────────── */}
			<div className={cn("fixed top-0 bottom-0 z-50 w-80 sm:w-96 flex flex-col cal-drawer", isRTL ? "right-0" : "left-0", showAddTypeDrawer ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full")}
				style={{ transition: "transform .3s cubic-bezier(.16,1,.3,1)" }}>
				<div className="cal-drawer-header">
					<div className="cal-drawer-title"><LayoutGrid size={18} /> {t("manageTypes")}</div>
					<button className="cal-btn-icon" onClick={() => setShowAddTypeDrawer(false)}><X size={14} /></button>
				</div>
				<div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
					<div style={{ marginBottom: 16 }}>
						<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--cal-text3)", marginBottom: 8 }}>{t("allTypes")}</div>
						{eventTypes.map(type => {
							const { hex } = getTypeHex(type);
							return (
								<div key={type.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
									<div className={cn("cal-type-row", selectedType === type.id && "active")} style={{ flex: 1 }}
										onClick={() => { setSelectedType(type.id); setShowAddTypeDrawer(false); }}>
										<span style={{ width: 7, height: 7, borderRadius: "50%", background: hex }} />
										{renderIcon(type.icon, "h-3.5 w-3.5")}
										<span style={{ flex: 1 }}>{getTypeLabel(type)}</span>
										<span className="cal-type-row-badge">{getItemCountByType(type.id)}</span>
									</div>
									{type.custom && (
										<button className="cal-action-btn danger" onClick={() => handleDeleteType(type.id)}><Trash2 size={13} /></button>
									)}
								</div>
							);
						})}
					</div>

					<div style={{ paddingTop: 14, borderTop: "1px solid var(--cal-border)" }}>
						<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--cal-text3)", marginBottom: 12 }}>{t("createNewType")}</div>
						<div style={{ background: "var(--cal-surface2)", borderRadius: 10, padding: 14, border: "1px dashed var(--cal-border2)", display: "flex", flexDirection: "column", gap: 12 }}>
							<input className="cal-form-input" placeholder={t("typeName")} value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
							<div>
								<div className="cal-form-label" style={{ marginBottom: 8 }}>{t("selectIcon")}</div>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
									{ICON_OPTIONS.map(opt => (
										<button key={opt.value} type="button" className={cn("cal-icon-option", newTypeIcon === opt.value && "selected")} title={opt.label} onClick={() => setNewTypeIcon(opt.value)}>
											<opt.Icon size={15} />
										</button>
									))}
								</div>
							</div>
							<div>
								<div className="cal-form-label" style={{ marginBottom: 8 }}>{t("selectColor")}</div>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
									{COLOR_OPTIONS.map(c => (
										<button key={c.value} type="button" className={cn("cal-color-swatch", c.value, newTypeColor === c.value && "selected")} title={t(c.nameKey)} onClick={() => setNewTypeColor(c.value)} />
									))}
								</div>
							</div>
							<button className="cal-btn-primary" style={{ width: "100%", justifyContent: "center", height: 38 }} disabled={!newTypeName.trim()} onClick={handleAddType}>
								<Check size={14} /> {t("add")}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* ─── Settings Dialog ─────────────────────────────────────── */}
			<Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
				<DialogContent className="max-w-sm sm:max-w-md rounded-xl" dir={isRTL ? "rtl" : "ltr"}
					style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)", color: "var(--cal-text)" }}>
					<DialogHeader>
						<DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--cal-font-display)", fontSize: 20, fontWeight: 400, color: "var(--cal-text)" }}>
							<Settings size={18} /> {t("settings")}
						</DialogTitle>
					</DialogHeader>
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{[{ key: "showWeekNumbers", label: t("showWeekNumbers"), desc: t("showWeekNumbersDesc") }, { key: "highlightWeekend", label: t("highlightWeekend"), desc: t("highlightWeekendDesc") }, { key: "confirmBeforeDelete", label: t("confirmBeforeDelete"), desc: t("confirmBeforeDeleteDesc") }].map(({ key, label, desc }) => (
							<div key={key} className="cal-settings-row">
								<div>
									<div className="cal-settings-label">{label}</div>
									<div className="cal-settings-desc">{desc}</div>
								</div>
								<Switch checked={settings[key]} onCheckedChange={v => setSettings(prev => ({ ...prev, [key]: v }))} />
							</div>
						))}
						<div className="cal-settings-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
							<div>
								<div className="cal-settings-label">{t("startOfWeek")}</div>
								<div className="cal-settings-desc">{t("startOfWeekDesc")}</div>
							</div>
							<Select value={settings.startOfWeek.toString()} onValueChange={v => setSettings(prev => ({ ...prev, startOfWeek: parseInt(v, 10) }))}>
								<SelectTrigger className="cal-form-input" style={{ height: 36, width: "100%" }}><SelectValue /></SelectTrigger>
								<SelectContent style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)" }}>
									{[["0", t("sunday")], ["1", t("monday")], ["6", t("saturday")]].map(([v, l]) => (
										<SelectItem key={v} value={v} style={{ color: "var(--cal-text)" }}>{l}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<button className="cal-btn-primary" style={{ width: "100%", justifyContent: "center", height: 40 }} onClick={() => setShowSettingsDialog(false)}>
							{t("close")}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ─── Delete Item Confirm ─────────────────────────────────── */}
			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent dir={isRTL ? "rtl" : "ltr"} className="max-w-sm rounded-xl"
					style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)", color: "var(--cal-text)" }}>
					<DialogHeader>
						<DialogTitle style={{ fontFamily: "var(--cal-font-display)", fontSize: 18, fontWeight: 400, color: "var(--cal-text)" }}>{t("confirmDelete")}</DialogTitle>
					</DialogHeader>
					<p style={{ fontSize: 13, color: "var(--cal-text2)", lineHeight: 1.6 }}>
						{t("areYouSureDelete")} "<span style={{ fontWeight: 600, color: "var(--cal-text)" }}>{itemToDelete?.title}</span>"?
					</p>
					<DialogFooter style={{ gap: 8 }}>
						<button className="cal-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowDeleteConfirm(false)}>{t("cancel")}</button>
						<button style={{ flex: 2, height: 36, padding: "0 16px", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontFamily: "var(--cal-font-body)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
							onClick={() => confirmDelete()}>
							<Trash2 size={13} /> {t("delete")}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ─── Delete Type Confirm ─────────────────────────────────── */}
			<Dialog open={showDeleteTypeConfirm} onOpenChange={setShowDeleteTypeConfirm}>
				<DialogContent dir={isRTL ? "rtl" : "ltr"} className="max-w-sm rounded-xl"
					style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)", color: "var(--cal-text)" }}>
					<DialogHeader>
						<DialogTitle style={{ fontFamily: "var(--cal-font-display)", fontSize: 18, fontWeight: 400, color: "var(--cal-text)" }}>{t("confirmDeleteType")}</DialogTitle>
					</DialogHeader>
					<p style={{ fontSize: 13, color: "var(--cal-text2)", lineHeight: 1.6 }}>
						{t("areYouSureDeleteType")} "<span style={{ fontWeight: 600, color: "var(--cal-text)" }}>{typeToDelete?.name}</span>"?
						<span style={{ display: "block", color: "#f87171", fontSize: 11, marginTop: 6 }}>{t("deleteTypeWarning")}</span>
					</p>
					<DialogFooter style={{ gap: 8 }}>
						<button className="cal-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowDeleteTypeConfirm(false)}>{t("cancel")}</button>
						<button style={{ flex: 2, height: 36, padding: "0 16px", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontFamily: "var(--cal-font-body)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
							onClick={() => confirmDeleteType()}>
							<Trash2 size={13} /> {t("delete")}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownTimer() {
	const t = useTranslations("commitment");
	const locale = useLocale();
	const isRTL = locale === "ar";

	const [startTime, setStartTime] = useState(null);
	const [isRunning, setIsRunning] = useState(false);
	const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState("");

	useEffect(() => {
		const saved = localStorage.getItem("commitmentStartTime");
		const savedRun = localStorage.getItem("commitmentIsRunning");
		if (saved) { setStartTime(parseInt(saved, 10)); setIsRunning(savedRun === "true"); }
	}, []);

	useEffect(() => { setSelectedDate(new Date().toISOString().slice(0, 16)); }, []);

	useEffect(() => {
		if (startTime) localStorage.setItem("commitmentStartTime", startTime.toString());
		localStorage.setItem("commitmentIsRunning", isRunning.toString());
	}, [startTime, isRunning]);

	useEffect(() => {
		if (!isRunning || !startTime) return;
		const id = setInterval(() => {
			const diff = Date.now() - startTime;
			setElapsed({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) });
		}, 1000);
		return () => clearInterval(id);
	}, [isRunning, startTime]);

	const handleStartFromNow = () => { setStartTime(Date.now()); setIsRunning(true); setShowDatePicker(false); };
	const handleStartFromDate = () => { if (!selectedDate) return; setStartTime(new Date(selectedDate).getTime()); setIsRunning(true); setShowDatePicker(false); };
	const handleReset = () => { setStartTime(null); setIsRunning(false); setElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0 }); localStorage.removeItem("commitmentStartTime"); localStorage.setItem("commitmentIsRunning", "false"); };

	const fmt = (n) => String(n).padStart(2, "0");
	const getMilestone = () => {
		const total = elapsed.days * 24 * 60 + elapsed.hours * 60 + elapsed.minutes;
		if (total >= 60 * 24 * 30) return { Icon: Trophy, text: t("milestone.month") };
		if (total >= 60 * 24 * 7) return { Icon: Target, text: t("milestone.week") };
		if (total >= 60 * 24) return { Icon: Zap, text: t("milestone.day") };
		return null;
	};
	const milestone = getMilestone();
	const timeStr = startTime ? `${elapsed.days > 0 ? elapsed.days + "d " : ""}${fmt(elapsed.hours)}:${fmt(elapsed.minutes)}:${fmt(elapsed.seconds)}` : null;

	return (
		<div style={{ position: "relative" }} dir={isRTL ? "rtl" : "ltr"}>
			<div className="cal-commit-wrap">
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					{!startTime ? (
						<button onClick={() => setShowDatePicker(true)}
							style={{ width: 28, height: 28, background: "var(--cal-surface3)", border: "1px solid var(--cal-border2)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cal-accent)", flexShrink: 0 }}>
							<Play size={12} />
						</button>
					) : (
						<div style={{ display: "flex", gap: 4 }}>
							<button onClick={isRunning ? () => setIsRunning(false) : () => setIsRunning(true)}
								style={{ width: 28, height: 28, background: "var(--cal-surface3)", border: "1px solid var(--cal-border2)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cal-accent)" }}>
								{isRunning ? <Pause size={11} /> : <Play size={11} />}
							</button>
							<button onClick={handleReset}
								style={{ width: 28, height: 28, background: "var(--cal-surface3)", border: "1px solid var(--cal-border2)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cal-text3)" }}>
								<RotateCcw size={11} />
							</button>
						</div>
					)}
					<div>
						<div className="cal-commit-label">Streak</div>
						{timeStr ? (
							<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
								<div className="cal-commit-time">{timeStr}</div>
								{milestone && <milestone.Icon size={13} style={{ color: "#fbbf24" }} title={milestone.text} />}
							</div>
						) : (
							<div className="cal-commit-idle">{t("startCommitment")}</div>
						)}
					</div>
				</div>
			</div>

			{showDatePicker && createPortal(
				<>
					<div className="cal-overlay fixed inset-0 z-[9999]" onClick={() => setShowDatePicker(false)} />
					<div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10000, width: "min(400px, calc(100vw - 32px))" }}>
						<div style={{ background: "var(--cal-surface)", border: "1px solid var(--cal-border2)", borderRadius: 18, padding: 24, boxShadow: "var(--cal-shadow)" }} dir={isRTL ? "rtl" : "ltr"}>
							<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
								<div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--cal-gradient)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px var(--cal-accent-glow)" }}>
									<Calendar size={20} style={{ color: "#fff" }} />
								</div>
								<div>
									<div style={{ fontFamily: "var(--cal-font-display)", fontSize: 17, color: "var(--cal-text)" }}>{t("dialog.title")}</div>
									<div style={{ fontSize: 11, color: "var(--cal-text3)", marginTop: 2 }}>{t("dialog.subtitle")}</div>
								</div>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
								<button onClick={handleStartFromNow}
									style={{ padding: "14px 16px", background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "all .2s" }}
									onMouseOver={e => e.currentTarget.style.background = "rgba(99,102,241,.15)"}
									onMouseOut={e => e.currentTarget.style.background = "rgba(99,102,241,.08)"}>
									<div style={{ textAlign: "left" }}>
										<div style={{ fontSize: 13, fontWeight: 600, color: "var(--cal-text)", marginBottom: 2 }}>{t("dialog.startNow")}</div>
										<div style={{ fontSize: 11, color: "var(--cal-text3)" }}>{t("dialog.startNowDesc")}</div>
									</div>
									<div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--cal-gradient)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
										<Play size={14} style={{ color: "#fff" }} />
									</div>
								</button>

								<div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
									<div style={{ flex: 1, height: 1, background: "var(--cal-border)" }} />
									<span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--cal-text3)" }}>{t("dialog.or")}</span>
									<div style={{ flex: 1, height: 1, background: "var(--cal-border)" }} />
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
									<div className="cal-form-label">{t("dialog.customDate")}</div>
									<input type="datetime-local" value={selectedDate} max={new Date().toISOString().slice(0, 16)}
										onChange={e => setSelectedDate(e.target.value)} className="cal-form-input" />
									<button onClick={handleStartFromDate} disabled={!selectedDate} className="cal-btn-primary"
										style={{ width: "100%", justifyContent: "center", height: 40 }}>
										<Play size={13} /> {t("dialog.startFromDate")}
									</button>
								</div>
							</div>

							<button onClick={() => setShowDatePicker(false)}
								style={{ width: "100%", padding: "10px 0 2px", marginTop: 12, fontSize: 12, color: "var(--cal-text3)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--cal-font-body)", transition: "color .15s" }}
								onMouseOver={e => e.currentTarget.style.color = "var(--cal-text2)"}
								onMouseOut={e => e.currentTarget.style.color = "var(--cal-text3)"}>
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