/* 
- when i drag item and drop it return to his place inside the groups 

- and the save changes button show as floating bar in the bottom when change thing and need to save it 
  - remove this 18 سؤال نشط form under the tabs because it's who in the stats top 
  - and in the button of requried show check box to be more appear i need action here 
  - and add remove button to he can remove any question and replace also the switch with some thing to active or unaction this question 
  - and the add question to the group show it in the top in the left besie teh number of question and the arrow of expand 
  - and also add delte for the gorups for the all not for the created new and also for the all questions 
  */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import qs from 'qs';
import { useTranslations, useLocale } from 'next-intl';
import { Bell, BellOff, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, AlertCircle, Eye, EyeOff, GripVertical, Loader2, MessageSquare, Plus, Save, Send, Settings2, Sparkles, Star, Trash2, Users, X, Hash, Type, AlignLeft, List, ToggleRight, Dumbbell, Utensils, Camera, Ruler, FileText, CalendarClock, MessagesSquare, BellRing, Phone, MessageCircle, FolderPlus, Edit3, RotateCcw, UserCheck, Repeat, Image, Shield, User2, CalendarDays, HeartPulse, Activity, ClipboardList, MessageSquareText, XCircle } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import Select from '@/components/atoms/Select';
import ActionButtons from '@/components/atoms/Actions';
import DataTable, { FilterField } from '@/components/atoms/Datatable';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { useUser } from '@/hooks/useUser';

/* ═══════════════════════════════════════════════════════
   CONFIG API
═══════════════════════════════════════════════════════ */
const getReportConfig = async () => {
  const { data } = await api.get('/coach/report-config');
  return data;
};
const saveReportConfig = async b => {
  const { data } = await api.put('/coach/report-config', b);
  return data;
};
const getClientsStatus = async ({ page = 1, limit = 20, search = '', status = '' } = {}) => {
  const { data } = await api.get('/coach/clients/report-status', { params: { page, limit, search, status } });
  return {
    items: data?.items ?? (Array.isArray(data) ? data : []),
    total: data?.total ?? 0,
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    hasMore: data?.hasMore ?? false,
  };
};
const sendReminder = async ids => {
  const { data } = await api.post('/coach/report-reminder', { clientIds: ids });
  return data;
};

/* ═══════════════════════════════════════════════════════
   REPORTS API
═══════════════════════════════════════════════════════ */
async function fetchReports({ page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC', search = '', filters = {} }) {
  const { data } = await api.get('/weekly-reports', {
    params: { page, limit, sortBy, sortOrder, search, filters },
    paramsSerializer: p => qs.stringify(p, { encode: true, arrayFormat: 'indices', skipNulls: true }),
  });
  return { items: data?.records || [], total: data?.total_records || 0 };
}
async function fetchReportById(id) {
  const { data } = await api.get(`/weekly-reports/${id}`);
  return data;
}
async function saveCoachFeedback(id, payload) {
  const { data } = await api.put(`/weekly-reports/${id}/feedback`, payload);
  return data;
}
async function fetchAdminUnreviewedCount() {
  const { data } = await api.get('/weekly-reports/admin/unreviewed/count');
  return data?.count ?? 0;
}

/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */
const SECTION_ICONS = { diet: Utensils, training: Dumbbell, measurements: Ruler, photos: Camera, custom: FileText };
const FIELD_TYPE_ICONS = { boolean: ToggleRight, text: Type, number: Hash, textarea: AlignLeft, select: List, rating: Star, image: Image };
const FIELD_TYPE_COLORS = {
  boolean: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  text: 'bg-sky-50 text-sky-700 border-sky-200',
  number: 'bg-violet-50 text-violet-700 border-violet-200',
  textarea: 'bg-amber-50 text-amber-700 border-amber-200',
  select: 'bg-pink-50 text-pink-700 border-pink-200',
  rating: 'bg-orange-50 text-orange-700 border-orange-200',
  image: 'bg-teal-50 text-teal-700 border-teal-200',
};
const FIELD_TYPES = ['boolean', 'text', 'number', 'textarea', 'rating', 'image'];
const DAYS_OF_WEEK = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const BUILTIN_SECTIONS = ['diet', 'training', 'measurements', 'photos'];
const PER_PAGE_OPTIONS = [10, 20, 30, 50];

const DEFAULT_INITIAL_MSG = 'مرحباً 👋 حان وقت إرسال تقرير المتابعة الأسبوعي الخاص بك. يرجى ملء التقرير للحفاظ على تقدمك وإطلاعنا على حالتك. 💪';
const DEFAULT_REMINDER_MSG = 'تذكير 🔔 لم نستلم تقرير المتابعة الأسبوعي منك بعد. يرجى إكماله في أقرب وقت للحفاظ على متابعتك مع مدربك. 🏋️';

const DEFAULT_CONFIG = {
  groupOrder: ['diet', 'training', 'measurements', 'photos'],
  sections: {
    diet: { enabled: true, customFields: [], fields: { hungry: { enabled: true, required: false, type: 'boolean' }, mentalComfort: { enabled: true, required: false, type: 'boolean' }, wantSpecific: { enabled: true, required: false, type: 'boolean' }, foodTooMuch: { enabled: true, required: false, type: 'boolean' }, dietDeviation: { enabled: true, required: false, type: 'boolean' } } },
    training: { enabled: true, customFields: [], fields: { intensityOk: { enabled: true, required: false, type: 'boolean' }, daysDeviation: { enabled: true, required: false, type: 'boolean' }, shapeChange: { enabled: true, required: false, type: 'rating' }, fitnessChange: { enabled: true, required: false, type: 'rating' }, sleepEnough: { enabled: true, required: false, type: 'boolean' }, sleepHours: { enabled: true, required: false, type: 'number' }, programNotes: { enabled: true, required: false, type: 'textarea' }, cardioAdherence: { enabled: true, required: true, type: 'boolean' } } },
    measurements: { enabled: true, customFields: [], fields: { weight: { enabled: true, required: false, type: 'number' }, waist: { enabled: true, required: false, type: 'number' }, chest: { enabled: true, required: false, type: 'number' }, hips: { enabled: false, required: false, type: 'number' }, arms: { enabled: false, required: false, type: 'number' }, thighs: { enabled: false, required: false, type: 'number' } } },
    photos: { enabled: true, customFields: [], fields: { front: { enabled: true, required: false, type: 'boolean' }, back: { enabled: true, required: false, type: 'boolean' }, left: { enabled: false, required: false, type: 'boolean' }, right: { enabled: false, required: false, type: 'boolean' } } },
  },
  customGroups: [],
  notifications: { enabled: true, dayOfWeek: 'SU', sendTime: '09:00', reminderAfterDays: 2, maxReminders: 3, reminderMessage: DEFAULT_REMINDER_MSG, initialMessage: DEFAULT_INITIAL_MSG },
};

/* ─── Helpers ─── */
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source || {})) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}
function yn(val, t) {
  if (val === 'yes') return t('reports.yes');
  if (val === 'no') return t('reports.no');
  return val ?? '—';
}

/* ═══════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
═══════════════════════════════════════════════════════ */

/* Semantic status pill (from reports page) */
function Pill({ children, tone = 'primary' }) {
  const tones = {
    primary: { border: 'var(--color-primary-200)', bg: 'var(--color-primary-50)', text: 'var(--color-primary-800)' },
    soft: { border: '#e2e8f0', bg: '#f8fafc', text: '#475569' },
    warn: { border: '#fde68a', bg: '#fffbeb', text: '#92400e' },
    ok: { border: '#bbf7d0', bg: '#f0fdf4', text: '#065f46' },
  };
  const s = tones[tone] || tones.primary;
  return (
    <span className='inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold' style={{ borderColor: s.border, background: s.bg, color: s.text }}>
      {children}
    </span>
  );
}

/* Key-value row for detail card */
function DataRow({ label, value }) {
  return (
    <div className='flex items-center justify-between gap-3 border-b py-2 last:border-b-0' style={{ borderColor: 'var(--color-primary-50)' }}>
      <span className='text-xs font-medium text-slate-500'>{label}</span>
      <span className='text-sm font-semibold text-slate-900'>{value}</span>
    </div>
  );
}

/* Stat badge for table cells */
function StatBadge({ icon: Icon, value, secondary = false }) {
  return (
    <span
      className='inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold'
      style={{
        borderColor: 'var(--color-primary-200)',
        background: secondary ? 'linear-gradient(135deg, white, var(--color-secondary-50))' : 'linear-gradient(135deg, white, var(--color-primary-50))',
        color: 'var(--color-primary-800)',
      }}>
      {Icon && <Icon className='h-3.5 w-3.5 flex-shrink-0' />}
      {value}
    </span>
  );
}

/* IconBox */
function IconBox({ children, active = false, variant = 'primary', size = 'md' }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-11 w-11' };
  let style = {};
  if (variant === 'secondary') style = { background: 'linear-gradient(135deg, var(--color-secondary-100), var(--color-primary-100))', color: 'var(--color-primary-700)' };
  else if (active) style = { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', color: 'white', boxShadow: '0 4px 14px -4px var(--color-primary-500)' };
  else style = { background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))', color: 'var(--color-primary-600)' };
  return (
    <div className={`grid flex-shrink-0 place-items-center rounded-lg ${sizes[size]}`} style={style}>
      {children}
    </div>
  );
}

/* Ghost button */
function GhostBtn({ children, onClick, disabled }) {
  return (
    <button type='button' onClick={onClick} disabled={disabled} className='inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-60 focus:outline-none hover:bg-[color:var(--color-primary-50)]' style={{ borderColor: 'var(--color-primary-200)', background: 'white', color: 'var(--color-primary-700)' }}>
      {children}
    </button>
  );
}

/* Gradient button */
function GradientBtn({ children, onClick, disabled }) {
  return (
    <button type='button' onClick={onClick} disabled={disabled} className='inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 hover:opacity-90 active:scale-[.97]' style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))', boxShadow: '0 4px 14px -4px var(--color-primary-500)' }}>
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   CONFIG UI — Portal Type Dropdown
═══════════════════════════════════════════════════════ */
function FieldTypeDropdown({ anchorRef, open, onClose, value, onChange, t }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const dropRef = useRef(null);

  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const estHeight = FIELD_TYPES.length * 36 + 12;
    const top = window.innerHeight - rect.bottom > estHeight ? rect.bottom + 4 : rect.top - estHeight - 4;
    setPos({ top, left: Math.min(rect.left, window.innerWidth - 172) });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handle = e => {
      if (anchorRef?.current?.contains(e.target)) return;
      if (dropRef?.current?.contains(e.target)) return;
      onClose();
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handle);
    };
  }, [open, anchorRef, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={dropRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999, minWidth: 168 }} className='bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 overflow-hidden' onMouseDown={e => e.stopPropagation()}>
      {FIELD_TYPES.map(ft => {
        const FIcon = FIELD_TYPE_ICONS[ft];
        const active = value === ft;
        return (
          <button
            key={ft}
            type='button'
            onClick={() => {
              onChange(ft);
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${active ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'text-slate-700 hover:bg-slate-50'}`}>
            <span className={`w-5 h-5 rounded-md flex items-center justify-center border ${FIELD_TYPE_COLORS[ft]}`}>
              <FIcon size={10} />
            </span>
            {t(`coachConfig.fieldTypes.${ft}`)}
            {active && <Check size={10} className='ms-auto text-[var(--color-primary-600)]' />}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

function FieldTypeChip({ type, onChange, t }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const Icon = FIELD_TYPE_ICONS[type] || ToggleRight;
  return (
    <>
      <button ref={btnRef} type='button' onClick={() => setOpen(o => !o)} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold border transition-all hover:opacity-90 ${FIELD_TYPE_COLORS[type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        <Icon size={10} />
        {t(`coachConfig.fieldTypes.${type}`)}
        <ChevronDown size={9} />
      </button>
      <FieldTypeDropdown anchorRef={btnRef} open={open} onClose={() => setOpen(false)} value={type} onChange={onChange} t={t} />
    </>
  );
}

function RequiredCheck({ checked, onChange, t }) {
  return (
    <button type='button' onClick={() => onChange(!checked)} className='flex items-center gap-1.5 group cursor-pointer select-none'>
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150 ${checked ? 'bg-[var(--color-primary-600)] border-[var(--color-primary-600)] shadow-sm' : 'bg-white border-slate-300 group-hover:border-[var(--color-primary-400)]'}`}>{checked && <Check size={9} className='text-white' strokeWidth={3} />}</div>
      <span className={`text-[11px] font-semibold transition-colors ${checked ? 'text-[var(--color-primary-700)]' : 'text-slate-500 group-hover:text-slate-700'}`}>{t('coachConfig.fields.required')}</span>
    </button>
  );
}

function ActiveToggle({ enabled, onChange, t }) {
  return (
    <button type='button' onClick={() => onChange(!enabled)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
      {enabled ? (
        <>
          <Check size={10} strokeWidth={3} />
          {t('coachConfig.fields.active')}
        </>
      ) : (
        <>
          <X size={10} />
          {t('coachConfig.fields.inactive')}
        </>
      )}
    </button>
  );
}

/* ─── Sortable Field Row ─── */
function SortableFieldRow({ id, isBuiltin, fieldKey, fieldConfig, label, customField, onFieldChange, onDelete, t }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 20 : 'auto' };
  const enabled = isBuiltin ? (fieldConfig?.enabled ?? true) : (customField?.enabled ?? true);
  const required = isBuiltin ? (fieldConfig?.required ?? false) : (customField?.required ?? false);
  const type = isBuiltin ? (fieldConfig?.type ?? 'boolean') : (customField?.type ?? 'text');
  const patch = useCallback(
    p => {
      if (isBuiltin) onFieldChange(fieldKey, p);
      else onFieldChange({ ...customField, ...p });
    },
    [isBuiltin, fieldKey, customField, onFieldChange],
  );
  const [expandCustom, setExpandCustom] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl border transition-all duration-150 overflow-hidden ${!isBuiltin ? 'border-dashed border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/20' : 'border-slate-100 bg-white hover:border-slate-200'} ${enabled ? '' : 'opacity-60'}`}>
      <div className='flex items-center gap-2 px-3 py-2.5'>
        <button type='button' className='cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 shrink-0 touch-none' {...attributes} {...listeners}>
          <GripVertical size={14} />
        </button>
        <div className='flex-1 min-w-0'>{!isBuiltin && expandCustom ? <input value={customField?.label || ''} onChange={e => patch({ label: e.target.value })} placeholder={t('coachConfig.fields.questionPlaceholder')} className='w-full text-sm font-medium text-slate-700 bg-transparent border-b border-[var(--color-primary-300)] focus:outline-none pb-0.5' /> : <span className={`text-sm font-medium truncate block ${enabled ? 'text-slate-700' : 'text-slate-400'}`}>{isBuiltin ? label : customField?.label || <em className='text-slate-400 text-xs not-italic'>{t('coachConfig.fields.noQuestionText')}</em>}</span>}</div>
        <div className='flex items-center gap-2 shrink-0 flex-wrap justify-end'>
          <FieldTypeChip type={type} onChange={v => patch(isBuiltin ? { enabled, required, type: v } : { type: v })} t={t} />
          <ActiveToggle enabled={enabled} onChange={v => patch(isBuiltin ? { enabled: v, required: v ? required : false, type } : { enabled: v })} t={t} />
          <RequiredCheck checked={required} onChange={v => patch(isBuiltin ? { enabled, required: v, type } : { required: v })} t={t} />
          {!isBuiltin && (
            <button type='button' onClick={() => setExpandCustom(o => !o)} className='w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors'>
              <Edit3 size={11} />
            </button>
          )}
          <button type='button' onClick={onDelete} className='w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 transition-colors'>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {!isBuiltin && expandCustom && (
        <div className='border-t border-[var(--color-primary-100)] p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-white/70'>
          <div className='space-y-1'>
            <label className='text-[10px] font-semibold text-slate-500 uppercase tracking-wide'>{t('coachConfig.fields.helperText')}</label>
            <input value={customField?.placeholder || ''} onChange={e => patch({ placeholder: e.target.value })} placeholder={t('coachConfig.fields.helperPlaceholder')} className='w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]/40' />
          </div>
          {customField?.type === 'select' && (
            <div className='space-y-1 md:col-span-2'>
              <label className='text-[10px] font-semibold text-slate-500 uppercase tracking-wide'>{t('coachConfig.fields.options')}</label>
              <input
                value={(customField.options || []).join(', ')}
                onChange={e =>
                  patch({
                    options: e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={t('coachConfig.fields.optionsPlaceholder')}
                className='w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]/40'
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sortable Group Card ─── */
function SortableGroupCard({ id, groupKey, groupData, fieldDefs, onToggleEnabled, onBuiltinFieldChange, onCustomFieldChange, onAddField, onDeleteBuiltinField, onDeleteCustomField, onDeleteGroup, onRenameGroup, t }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const outerStyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto', opacity: isDragging ? 0.55 : 1 };

  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(groupData?.label || '');
  const Icon = SECTION_ICONS[groupKey] || FileText;

  const fieldSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const builtinItems = (fieldDefs || []).map(f => ({ sortId: `b_${groupKey}_${f.key}`, isBuiltin: true, fieldKey: f.key, label: f.label, fieldConfig: groupData?.fields?.[f.key] }));
  const customItems = (groupData?.customFields || []).map(cf => ({ sortId: `c_${groupKey}_${cf.id}`, isBuiltin: false, fieldKey: cf.id, customField: cf }));
  const allItems = [...builtinItems, ...customItems];
  const sortIds = allItems.map(f => f.sortId);
  const activeCount = allItems.filter(f => (f.isBuiltin ? (f.fieldConfig?.enabled ?? true) : (f.customField?.enabled ?? true))).length;

  const handleFieldDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = sortIds.indexOf(active.id);
    const newIdx = sortIds.indexOf(over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(allItems, oldIdx, newIdx);
    onBuiltinFieldChange('__reorder__', { newCustom: reordered.filter(f => !f.isBuiltin).map(f => f.customField) });
  };

  const handleRename = () => {
    if (nameVal.trim()) onRenameGroup(nameVal.trim());
    setRenaming(false);
  };

  return (
    <div ref={setNodeRef} style={outerStyle} className='rounded-2xl bg-white border border-[var(--color-primary-100)] shadow-sm overflow-visible'>
      <div className='px-4 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-primary-50)] to-white border-b border-[var(--color-primary-100)] flex items-center gap-2.5'>
        <button type='button' {...attributes} {...listeners} className='cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 touch-none'>
          <GripVertical size={16} />
        </button>
        <div className='w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] shadow-sm shrink-0'>
          <Icon size={14} className='text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          {renaming ? (
            <div className='flex items-center gap-1.5'>
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setRenaming(false);
                }}
                className='flex-1 text-sm font-bold text-slate-800 border-b border-[var(--color-primary-400)] focus:outline-none bg-transparent'
              />
              <button onClick={handleRename} className='w-5 h-5 rounded bg-[var(--color-primary-600)] flex items-center justify-center shrink-0'>
                <Check size={10} className='text-white' />
              </button>
              <button onClick={() => setRenaming(false)} className='w-5 h-5 rounded bg-slate-100 flex items-center justify-center shrink-0'>
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className='flex items-center gap-1.5'>
              <span className='text-sm font-bold text-slate-800 truncate'>{groupData?.label || t('coachConfig.groups.untitled')}</span>
              <button
                onClick={() => {
                  setNameVal(groupData?.label || '');
                  setRenaming(true);
                }}
                className='text-slate-300 hover:text-[var(--color-primary-500)] transition-colors'>
                <Edit3 size={11} />
              </button>
            </div>
          )}
          <span className='text-[11px] text-slate-400'>
            {activeCount}/{allItems.length} {t('coachConfig.groups.activeQuestionsSuffix')}
          </span>
        </div>
        <div className='flex items-center gap-1.5 shrink-0'>
          <button type='button' onClick={onAddField} className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-[var(--color-primary-300)] text-[var(--color-primary-600)] text-[11px] font-semibold hover:bg-[var(--color-primary-50)] transition-colors whitespace-nowrap'>
            <Plus size={11} /> {t('coachConfig.groups.addField')}
          </button>
          <ActiveToggle enabled={groupData?.enabled ?? true} onChange={onToggleEnabled} t={t} />
          <button type='button' onClick={onDeleteGroup} className='w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 transition-colors'>
            <Trash2 size={13} />
          </button>
          <button type='button' onClick={() => setOpen(o => !o)} className='w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors'>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {open && (
        <div className='p-3 space-y-2'>
          {!(groupData?.enabled ?? true) ? (
            <div className='flex flex-col items-center py-8 gap-2 text-slate-400'>
              <EyeOff size={22} className='opacity-40' />
              <p className='text-xs'>{t('coachConfig.groups.disabledMessage')}</p>
              <button type='button' onClick={() => onToggleEnabled(true)} className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50'>
                <Eye size={12} /> {t('coachConfig.groups.enableGroup')}
              </button>
            </div>
          ) : allItems.length === 0 ? (
            <button type='button' onClick={onAddField} className='w-full flex flex-col items-center justify-center gap-1.5 py-8 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[var(--color-primary-200)] hover:text-[var(--color-primary-500)] transition-colors'>
              <Plus size={18} />
              <span className='text-xs font-medium'>{t('coachConfig.groups.addFirstField')}</span>
            </button>
          ) : (
            <DndContext sensors={fieldSensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
              <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
                {allItems.map(item => (
                  <SortableFieldRow key={item.sortId} id={item.sortId} isBuiltin={item.isBuiltin} fieldKey={item.fieldKey} fieldConfig={item.fieldConfig} label={item.label} customField={item.customField} onFieldChange={item.isBuiltin ? (fKey, p) => onBuiltinFieldChange(fKey, p) : p => onCustomFieldChange(item.customField.id, p)} onDelete={() => (item.isBuiltin ? onDeleteBuiltinField(item.fieldKey) : onDeleteCustomField(item.customField.id))} t={t} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Client Row ─── */
function ClientRow({ client, selected, onToggle, onSendReminder, t, locale }) {
  const statusColor = client.status === 'submitted' ? 'green' : client.status === 'late' ? 'red' : 'amber';
  const initials = (client.name || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  const openWA = () => {
    const p = String(client.phone || '').replace(/\D/g, '');
    if (!p) return alert(t('coachConfig.clients.noPhone'));
    window.open(`https://wa.me/${p}`, '_blank');
  };
  const sendRptWA = () => {
    const p = String(client.phone || '').replace(/\D/g, '');
    if (!p) return alert(t('coachConfig.clients.noPhone'));
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(t('coachConfig.notif.defaultInitialMessage'))}`, '_blank');
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${selected ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-200)] shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
      <input type='checkbox' checked={selected} onChange={onToggle} className='w-4 h-4 rounded accent-[var(--color-primary-600)] cursor-pointer shrink-0' />
      <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center text-white text-xs font-black shrink-0'>{initials}</div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='text-sm font-semibold text-slate-800'>{client.name}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${statusColor === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : statusColor === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {statusColor !== 'green' && <span className='w-1.5 h-1.5 rounded-full bg-current animate-pulse' />}
            {client.status === 'submitted' ? t('coachConfig.clients.statusSubmitted') : client.status === 'late' ? t('coachConfig.clients.statusLate') : t('coachConfig.clients.statusPending')}
          </span>
        </div>
        <div className='flex items-center gap-3 mt-0.5'>
          <span className='text-xs text-slate-400 truncate'>{client.email}</span>
          {client.lastReportAt && <span className='text-xs text-slate-400 hidden sm:inline'>{t('coachConfig.clients.lastReportPrefix')}{new Date(client.lastReportAt).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US')}</span>}
        </div>
      </div>
      <div className='flex items-center gap-1.5 shrink-0 flex-wrap justify-end'>
        {client.status !== 'submitted' && (
          <>
            <button onClick={sendRptWA} title={t('coachConfig.clients.requestReport')} className='flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all'>
              <MessageCircle size={12} />
              <span className='hidden md:inline'>{t('coachConfig.clients.requestReport')}</span>
            </button>
            <button onClick={() => onSendReminder([client.id])} title={t('coachConfig.clients.sendReminder')} className='flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-all'>
              <BellRing size={12} />
              <span className='hidden md:inline'>{t('coachConfig.clients.reminder')}</span>
            </button>
          </>
        )}
        <button onClick={openWA} title={t('coachConfig.clients.whatsapp')} className='w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-all'>
          <MessageCircle size={13} />
        </button>
        {client.phone && (
          <button onClick={() => window.open(`tel:${client.phone}`, '_self')} title={t('coachConfig.clients.call')} className='w-8 h-8 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center hover:bg-sky-100 transition-all'>
            <Phone size={13} />
          </button>
        )}
        <button onClick={() => window.open(`/dashboard/chat?userId=${client.id}`, '_blank')} title={t('coachConfig.clients.chat')} className='w-8 h-8 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center hover:bg-violet-100 transition-all'>
          <MessageSquare size={13} />
        </button>
        <button onClick={() => window.open(`/dashboard/users/${client.id}`, '_blank')} title={t('coachConfig.clients.profile')} className='w-8 h-8 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-all'>
          <Eye size={13} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   REPORT DETAIL MODAL
═══════════════════════════════════════════════════════ */
function ReportDetailModal({ open, onClose, active, detailLoading, saving, saveErr, savedOk, feedbackDraft, setFeedbackDraft, onSaveFeedback, t }) {
  return (
    <Modal open={open} onClose={onClose} title={t('reports.detail.title')} maxW='max-w-5xl' maxH='max-h-[100vh]' maxHBody='max-h-[60vh]'>
      {detailLoading ? (
        <div className='flex h-52 flex-col items-center justify-center gap-2'>
          <Loader2 className='h-6 w-6 animate-spin' style={{ color: 'var(--color-primary-500)' }} />
          <p className='text-sm text-slate-400'>{t('reports.detail.loading')}</p>
        </div>
      ) : !active ? (
        <p className='text-sm text-slate-500'>{t('reports.empty')}</p>
      ) : (
        <div className='space-y-4 pt-1'>
          {/* Athlete summary */}
          <div className='relative overflow-hidden rounded-lg border bg-white p-4' style={{ borderColor: 'var(--color-primary-100)' }}>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <IconBox active size='md'>
                  <User2 className='h-5 w-5' />
                </IconBox>
                <div>
                  <p className='text-sm font-bold text-slate-900'>{active?.user?.name || active?.user?.email}</p>
                  <div className='mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400'>
                    <span className='inline-flex items-center gap-1'>
                      <CalendarDays className='h-3 w-3' />
                      {t('reports.columns.weekOf')}: {active?.weekOf}
                    </span>
                    <span className='hidden sm:inline'>·</span>
                    <span>{active?.created_at ? new Date(active.created_at).toLocaleString() : '—'}</span>
                  </div>
                </div>
              </div>
              {active?.reviewedAt ? (
                <Pill tone='ok'>
                  <CheckCircle2 className='h-3 w-3' />
                  {t('reports.reviewed')}
                </Pill>
              ) : (
                <Pill tone='warn'>
                  <XCircle className='h-3 w-3' />
                  {t('reports.awaitingReview')}
                </Pill>
              )}
            </div>
          </div>

          {/* Progress photos */}
          <div className='relative overflow-hidden rounded-lg border bg-white p-4' style={{ borderColor: 'var(--color-primary-100)' }}>
            <div className='mb-3 flex items-center justify-between gap-2'>
              <p className='text-sm font-bold text-slate-900'>{t('reports.detail.photos')}</p>
              <Pill tone='soft'>
                {t('reports.columns.weekOf')}: {active?.weekOf || '—'}
              </Pill>
            </div>
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
              {['front', 'back', 'left', 'right'].map(side => {
                const url = active?.photos?.[side]?.url;
                return (
                  <div key={side} className='overflow-hidden rounded-lg border transition-colors hover:border-[color:var(--color-primary-200)]' style={{ borderColor: 'var(--color-primary-100)', background: 'var(--color-primary-50)' }}>
                    <div className='border-b border-[color:var(--color-primary-100)] bg-white px-3 py-1.5'>
                      <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>{t(`reports.detail.section.photos.${side}`)}</p>
                    </div>
                    {url ? <Img src={url} alt={side} className='h-40 w-full object-contain bg-white' /> : <div className='flex h-40 items-center justify-center bg-white text-xs text-slate-300'>{t('reports.detail.noPhoto')}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Measurements */}
          <div className='relative overflow-hidden rounded-lg border bg-white p-4' style={{ borderColor: 'var(--color-primary-100)' }}>
            <div className='mb-3 flex items-center justify-between gap-2'>
              <p className='text-sm font-bold text-slate-900'>{t('reports.detail.measurements')}</p>
              <Pill tone='primary'>{active?.measurements?.date || '—'}</Pill>
            </div>
            <div className='overflow-auto rounded-lg border border-[color:var(--color-primary-100)]'>
              <table className='min-w-[600px] w-full text-sm'>
                <thead>
                  <tr style={{ background: 'var(--color-primary-50)' }}>
                    {['date', 'weight', 'waist', 'chest', 'hips', 'arms', 'thighs'].map(k => (
                      <th key={k} className='px-3 py-2.5 text-start text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap'>
                        {t(`reports.detail.section.measurements.${k}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className='border-t border-[color:var(--color-primary-50)]'>
                    {[active?.measurements?.date, active?.measurements?.weight, active?.measurements?.waist, active?.measurements?.chest, active?.measurements?.hips, active?.measurements?.arms, active?.measurements?.thighs].map((v, i) => (
                      <td key={i} className='px-3 py-2.5 text-sm font-medium text-slate-800'>
                        {v ?? '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Training & Diet */}
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='relative overflow-hidden rounded-lg border bg-white p-4' style={{ borderColor: 'var(--color-primary-100)' }}>
              <p className='mb-3 text-sm font-bold text-slate-900'>{t('reports.detail.training')}</p>
              <DataRow label={t('reports.detail.section.training.cardioAdherence')} value={`${active?.training?.cardioAdherence ?? '—'} / 5`} />
              <DataRow label={t('reports.detail.section.training.intensityOk')} value={yn(active?.training?.intensityOk, t)} />
              <DataRow label={t('reports.detail.section.training.shape')} value={yn(active?.training?.shapeChange, t)} />
              <DataRow label={t('reports.detail.section.training.fitness')} value={yn(active?.training?.fitnessChange, t)} />
              <DataRow label={t('reports.detail.section.training.sleepEnough')} value={yn(active?.training?.sleep?.enough, t)} />
              <DataRow label={t('reports.detail.section.training.sleepHours')} value={active?.training?.sleep?.hours || '—'} />
              {active?.training?.programNotes && (
                <div className='mt-3'>
                  <p className='mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400'>{t('reports.detail.section.training.notes.title')}</p>
                  <div className='rounded-lg border p-3 text-sm whitespace-pre-wrap text-slate-800' style={{ borderColor: 'var(--color-primary-100)', background: 'var(--color-primary-50)' }}>
                    {active.training.programNotes}
                  </div>
                </div>
              )}
              {(active?.training?.daysDeviation?.count || active?.training?.daysDeviation?.reason) && (
                <div className='mt-3'>
                  <p className='mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400'>{t('reports.detail.section.training.daysDeviation')}</p>
                  <DataRow label={t('reports.detail.section.training.deviation.count')} value={active?.training?.daysDeviation?.count || '—'} />
                  <DataRow label={t('reports.detail.section.training.deviation.reason')} value={active?.training?.daysDeviation?.reason || '—'} />
                </div>
              )}
            </div>

            <div className='relative overflow-hidden rounded-lg border bg-white p-4' style={{ borderColor: 'var(--color-primary-100)' }}>
              <p className='mb-3 text-sm font-bold text-slate-900'>{t('reports.detail.diet')}</p>
              <DataRow label={t('reports.detail.section.diet.hungry')} value={yn(active?.diet?.hungry, t)} />
              <DataRow label={t('reports.detail.section.diet.comfort')} value={yn(active?.diet?.mentalComfort, t)} />
              <DataRow label={t('reports.detail.section.diet.tooMuch')} value={yn(active?.diet?.foodTooMuch, t)} />
              <DataRow label={t('reports.detail.section.diet.wantSpecific')} value={active?.diet?.wantSpecific || '—'} />
              {(active?.diet?.dietDeviation?.times || active?.diet?.dietDeviation?.details) && (
                <div className='mt-3'>
                  <p className='mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400'>{t('reports.detail.section.diet.deviation.title')}</p>
                  <DataRow label={t('reports.detail.section.diet.deviation.times')} value={active?.diet?.dietDeviation?.times || '—'} />
                  <DataRow label={t('reports.detail.section.diet.deviation.details')} value={active?.diet?.dietDeviation?.details || '—'} />
                </div>
              )}
            </div>
          </div>

          {/* Coach Feedback */}
          <div className='relative overflow-hidden rounded-lg border bg-white p-4' style={{ borderColor: 'var(--color-primary-100)' }}>
            <div className='mb-3 flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2.5'>
                <IconBox variant='secondary' size='sm'>
                  <MessageSquareText className='h-4 w-4' />
                </IconBox>
                <p className='text-sm font-bold text-slate-900'>{t('reports.detail.feedback')}</p>
              </div>
              {savedOk && (
                <Pill tone='ok'>
                  <CheckCircle2 className='h-3 w-3' />
                  {t('reports.messages.saved')}
                </Pill>
              )}
            </div>
            <textarea className='min-h-[120px] w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)]' style={{ borderColor: 'var(--color-primary-200)' }} placeholder={t('reports.detail.feedbackPh')} value={feedbackDraft} onChange={e => setFeedbackDraft(e.target.value)} />
            {saveErr && <p className='mt-2 text-sm text-rose-600'>{saveErr}</p>}
            <div className='mt-3 flex items-center justify-end gap-2'>
              <GhostBtn onClick={onClose}>{t('reports.close', { default: 'Close' })}</GhostBtn>
              <GradientBtn disabled={saving} onClick={() => onSaveFeedback({ feedback: feedbackDraft || '' })}>
                {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle2 className='h-4 w-4' />}
                {t('reports.reviewed')}
              </GradientBtn>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function CoachReportConfigPage() {
  const t = useTranslations('reportConfig');
  const locale = useLocale();
  const user = useUser();

  /* ── Config state ── */
  const [config, setConfig] = useState(deepMerge(DEFAULT_CONFIG, {}));
  const [savedConfig, setSavedConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  /* ── Clients state ── */
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchDb, setClientSearchDb] = useState('');
  const [cliPage, setCliPage] = useState(1);
  const [cliLimit, setCliLimit] = useState(10);
  const [cliTotal, setCliTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sendingRem, setSendingRem] = useState(false);
  const [reminderOk, setReminderOk] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  /* ── Reports state ── */
  const [reports, setReports] = useState([]);
  const [rptTotal, setRptTotal] = useState(0);
  const [rptLoading, setRptLoading] = useState(false);
  const [rptErr, setRptErr] = useState('');
  const [rptPage, setRptPage] = useState(1);
  const [rptLimit, setRptLimit] = useState(10);
  const [rptSortBy, setRptSortBy] = useState('created_at');
  const [rptSortOrder, setRptSortOrder] = useState('DESC');
  const [rptSearch, setRptSearch] = useState('');
  const [rptSearchDb, setRptSearchDb] = useState('');
  const [rptReviewed, setRptReviewed] = useState('');
  const [rptUserId, setRptUserId] = useState('');
  const [usersOptions, setUsersOptions] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [unreviewedCount, setUnreviewed] = useState(0);

  /* ── Report detail ── */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbSaveErr, setFbSaveErr] = useState('');
  const [fbSavedOk, setFbSavedOk] = useState(false);

  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState('fields');

  const isDirty = useMemo(() => {
    if (!savedConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  const groupElRefs = useRef({});
  const groupSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  /* ── Boot: load config ── */
  useEffect(() => {
    (async () => {
      try {
        setConfigLoading(true);
        const cfg = await getReportConfig();
        const merged = cfg ? deepMerge(DEFAULT_CONFIG, cfg) : deepMerge(DEFAULT_CONFIG, {});
        setConfig(merged);
        setSavedConfig(JSON.parse(JSON.stringify(merged)));
      } catch {
      } finally {
        setConfigLoading(false);
      }
    })();
  }, []);

  /* ── Debounce clients search ── */
  useEffect(() => {
    const id = setTimeout(() => setClientSearchDb(clientSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [clientSearch]);

  /* ── Load clients ── */
  const loadClients = useCallback(async () => {
    if (activeTab !== 'clients') return;
    try {
      setClientsLoading(true);
      const res = await getClientsStatus({ page: cliPage, limit: cliLimit, search: clientSearchDb, status: statusFilter });
      setClients(res.items);
      setCliTotal(res.total);
    } catch {
    } finally {
      setClientsLoading(false);
    }
  }, [activeTab, cliPage, cliLimit, clientSearchDb, statusFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  /* ── Load users options for reports filter ── */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        setUsersLoading(true);
        const route = user.role === 'admin' ? `/auth/admin/${user.id}/clients` : `/auth/coach/${user.id}/clients`;
        const { data } = await api.get(route, { params: { page: 1, limit: 200, search: '' } });
        setUsersOptions((data?.items || []).map(i => ({ id: i.id, label: i.name || i.email })));
      } catch {
        setUsersOptions([]);
      } finally {
        setUsersLoading(false);
      }
    })();
  }, [user?.id, user?.role]);

  /* ── Debounce reports search ── */
  useEffect(() => {
    const id = setTimeout(() => setRptSearchDb(rptSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [rptSearch]);

  /* ── Load reports ── */
  const rptFilters = useMemo(() => {
    const f = {};
    if (user?.role === 'admin') f.adminId = user.id;
    else if (user?.role === 'coach') f.coachId = user.id;
    if (rptUserId) f.userId = rptUserId;
    if (rptReviewed === 'false') f.isRead = false;
    else if (rptReviewed === 'true') f.isRead = true;
    return f;
  }, [user?.id, user?.role, rptUserId, rptReviewed]);

  const loadReports = useCallback(async () => {
    if (!user?.id) return;
    try {
      setRptErr('');
      setRptLoading(true);
      const res = await fetchReports({ page: rptPage, limit: rptLimit, sortBy: rptSortBy, sortOrder: rptSortOrder, search: rptSearchDb, filters: rptFilters });
      setReports(res.items);
      setRptTotal(res.total);
    } catch {
      setRptErr(t('reports.errors.load'));
    } finally {
      setRptLoading(false);
    }
  }, [user?.id, rptPage, rptLimit, rptSortBy, rptSortOrder, rptSearchDb, rptFilters, t]);

  useEffect(() => {
    if (activeTab === 'reports') loadReports();
  }, [activeTab, loadReports]);
  useEffect(() => {
    setRptPage(1);
  }, [rptReviewed, rptSortBy, rptSortOrder, rptLimit, rptUserId]);

  useEffect(() => {
    if (!user?.id || user?.role !== 'admin') return;
    fetchAdminUnreviewedCount()
      .then(setUnreviewed)
      .catch(() => {});
  }, [user?.id, user?.role]);

  /* ── Open report detail ── */
  const openDetail = async id => {
    try {
      setActiveId(id);
      setDetailLoading(true);
      setDetailOpen(true);
      const data = await fetchReportById(id);
      setActiveReport(data || null);
      setFeedbackDraft(data?.coachFeedback || '');
    } catch {
      setActiveReport(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setActiveId(null);
    setActiveReport(null);
    setFeedbackDraft('');
    setFbSaveErr('');
    setFbSavedOk(false);
  };

  const handleSaveFeedback = async (opts = {}) => {
    if (!activeId) return;
    try {
      setFbSaving(true);
      setFbSaveErr('');
      const payload = { coachFeedback: typeof opts.feedback === 'string' ? opts.feedback : feedbackDraft };
      const saved = await saveCoachFeedback(activeId, payload);
      setActiveReport(saved);
      setFbSavedOk(true);
      setTimeout(() => setFbSavedOk(false), 1600);
      loadReports();
      if (user?.role === 'admin')
        fetchAdminUnreviewedCount()
          .then(setUnreviewed)
          .catch(() => {});
    } catch {
      setFbSaveErr(t('reports.errors.save'));
    } finally {
      setFbSaving(false);
    }
  };

  /* ── Field labels ── */
  const SECTION_FIELDS = useMemo(
    () => ({
      diet: [
        { key: 'hungry', label: t('weekly.diet.hungry') },
        { key: 'mentalComfort', label: t('weekly.diet.comfort') },
        { key: 'foodTooMuch', label: t('weekly.diet.tooMuch') },
        { key: 'dietDeviation', label: t('weekly.diet.deviation.title') },
        { key: 'wantSpecific', label: t('weekly.diet.wantSpecific.title') },
      ],
      training: [
        { key: 'cardioAdherence', label: t('weekly.cardioAdherence') },
        { key: 'intensityOk', label: t('weekly.training.intensityOk') },
        { key: 'daysDeviation', label: t('weekly.training.daysDeviation') },
        { key: 'shapeChange', label: t('weekly.training.shape') },
        { key: 'fitnessChange', label: t('weekly.training.fitness') },
        { key: 'sleepEnough', label: t('weekly.training.sleepEnough') },
        { key: 'sleepHours', label: t('weekly.training.sleepHours') },
        { key: 'programNotes', label: t('weekly.training.notes.title') },
      ],
      measurements: [
        { key: 'weight', label: t('weekly.measurements.weight') },
        { key: 'waist', label: t('weekly.measurements.waist') },
        { key: 'chest', label: t('weekly.measurements.chest') },
        { key: 'hips', label: t('weekly.measurements.hips') },
        { key: 'arms', label: t('weekly.measurements.arms') },
        { key: 'thighs', label: t('weekly.measurements.thighs') },
      ],
      photos: [
        { key: 'front', label: t('weekly.photos.front') },
        { key: 'back', label: t('weekly.photos.back') },
        { key: 'left', label: t('weekly.photos.left') },
        { key: 'right', label: t('weekly.photos.right') },
      ],
    }),
    [t],
  );

  /* ── Derived ── */
  const totalActive = useMemo(() => {
    let n = 0;
    Object.values(config.sections || {}).forEach(sec => {
      if (!sec.enabled) return;
      Object.values(sec.fields || {}).forEach(f => {
        if (f.enabled) n++;
      });
      (sec.customFields || []).forEach(f => {
        if (f.enabled !== false) n++;
      });
    });
    (config.customGroups || []).forEach(g => {
      if (g.enabled)
        (g.fields || []).forEach(f => {
          if (f.enabled !== false) n++;
        });
    });
    return n;
  }, [config]);

  const groupOrder = useMemo(() => {
    const base = config.groupOrder || BUILTIN_SECTIONS;
    const custIds = (config.customGroups || []).map(g => g.id);
    const inBase = new Set(base);
    return [...base, ...custIds.filter(id => !inBase.has(id))];
  }, [config.groupOrder, config.customGroups]);

  const cliStats = useMemo(
    () => ({
      total: cliTotal,
      submitted: clients.filter(c => c.status === 'submitted').length,
      pending: clients.filter(c => c.status === 'pending').length,
      late: clients.filter(c => c.status === 'late').length,
    }),
    [clients, cliTotal],
  );

  const rptReviewedCount = useMemo(() => reports.filter(r => !!r?.reviewedAt).length, [reports]);

  /* ── Config mutations ── */
  const setSectionEnabled = useCallback((sk, v) => setConfig(c => ({ ...c, sections: { ...c.sections, [sk]: { ...c.sections[sk], enabled: v } } })), []);
  const setBuiltinField = useCallback((sk, fk, patch) => {
    if (patch?.__reorder__) {
      setConfig(c => ({ ...c, sections: { ...c.sections, [sk]: { ...c.sections[sk], customFields: patch.newCustom } } }));
      return;
    }
    setConfig(c => ({ ...c, sections: { ...c.sections, [sk]: { ...c.sections[sk], fields: { ...c.sections[sk].fields, [fk]: { ...(c.sections[sk].fields[fk] || {}), ...patch } } } } }));
  }, []);
  const setCustomField = useCallback((sk, fId, p) => setConfig(c => ({ ...c, sections: { ...c.sections, [sk]: { ...c.sections[sk], customFields: (c.sections[sk].customFields || []).map(f => (f.id === fId ? { ...f, ...p } : f)) } } })), []);
  const deleteBuiltinField = useCallback(
    (sk, fk) =>
      setConfig(c => {
        const flds = { ...c.sections[sk].fields };
        delete flds[fk];
        return { ...c, sections: { ...c.sections, [sk]: { ...c.sections[sk], fields: flds } } };
      }),
    [],
  );
  const deleteCustomFieldSec = useCallback((sk, fId) => setConfig(c => ({ ...c, sections: { ...c.sections, [sk]: { ...c.sections[sk], customFields: (c.sections[sk].customFields || []).filter(f => f.id !== fId) } } })), []);
  const addCustomFieldToSec = useCallback(sk => {
    const nf = { id: `cf_${Date.now()}`, label: '', type: 'text', required: false, enabled: true, placeholder: '', options: [] };
    setConfig(c => ({ ...c, sections: { ...c.sections, [sk]: { ...c.sections[sk], customFields: [...(c.sections[sk].customFields || []), nf] } } }));
  }, []);
  const addCustomGroup = useCallback(() => {
    const id = `grp_${Date.now()}`;
    setConfig(c => ({ ...c, customGroups: [...(c.customGroups || []), { id, label: t('coachConfig.groups.newGroupDefaultLabel'), enabled: true, fields: [] }], groupOrder: [...(c.groupOrder || BUILTIN_SECTIONS), id] }));
    setTimeout(() => groupElRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 160);
  }, [t]);
  const deleteGroup = useCallback(id => {
    if (BUILTIN_SECTIONS.includes(id)) {
      setConfig(c => ({ ...c, groupOrder: (c.groupOrder || BUILTIN_SECTIONS).filter(k => k !== id) }));
    } else {
      setConfig(c => ({ ...c, customGroups: (c.customGroups || []).filter(g => g.id !== id), groupOrder: (c.groupOrder || []).filter(k => k !== id) }));
    }
  }, []);
  const renameGroup = useCallback((id, label) => {
    if (BUILTIN_SECTIONS.includes(id)) setConfig(c => ({ ...c, sections: { ...c.sections, [id]: { ...c.sections[id], label } } }));
    else setConfig(c => ({ ...c, customGroups: (c.customGroups || []).map(g => (g.id === id ? { ...g, label } : g)) }));
  }, []);
  const setCustomGroupField = useCallback((gId, fId, p) => setConfig(c => ({ ...c, customGroups: (c.customGroups || []).map(g => (g.id === gId ? { ...g, fields: (g.fields || []).map(f => (f.id === fId ? { ...f, ...p } : f)) } : g)) })), []);
  const deleteCustomGrpField = useCallback((gId, fId) => setConfig(c => ({ ...c, customGroups: (c.customGroups || []).map(g => (g.id === gId ? { ...g, fields: (g.fields || []).filter(f => f.id !== fId) } : g)) })), []);
  const addCustomGrpField = useCallback(gId => {
    const nf = { id: `cf_${Date.now()}`, label: '', type: 'text', required: false, enabled: true, placeholder: '', options: [] };
    setConfig(c => ({ ...c, customGroups: (c.customGroups || []).map(g => (g.id === gId ? { ...g, fields: [...(g.fields || []), nf] } : g)) }));
  }, []);
  const setNotif = useCallback(p => setConfig(c => ({ ...c, notifications: { ...c.notifications, ...p } })), []);

  const handleGroupDragEnd = useCallback(
    ({ active, over }) => {
      if (!over || active.id === over.id) return;
      const oi = groupOrder.indexOf(active.id),
        ni = groupOrder.indexOf(over.id);
      if (oi < 0 || ni < 0) return;
      setConfig(c => ({ ...c, groupOrder: arrayMove(groupOrder, oi, ni) }));
    },
    [groupOrder],
  );

  const handleSave = async () => {
    setSaveErr('');
    setSaveOk(false);
    try {
      setSaving(true);
      await saveReportConfig(config);
      setSavedConfig(JSON.parse(JSON.stringify(config)));
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) {
      setSaveErr(e?.message || t('coachConfig.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendReminder = async ids => {
    if (!ids?.length) return;
    try {
      setSendingRem(true);
      await sendReminder(ids);
      setReminderOk(true);
      setSelectedIds([]);
      setTimeout(() => setReminderOk(false), 3000);
    } catch {
    } finally {
      setSendingRem(false);
    }
  };

  const getGroupData = useCallback(
    id => {
      if (BUILTIN_SECTIONS.includes(id)) {
        const sec = config.sections[id] || {};
        return { ...sec, label: sec.label || t(`weekly.${id === 'measurements' ? 'measurements' : id}.title`) };
      }
      return (config.customGroups || []).find(g => g.id === id);
    },
    [config, t],
  );

  /* ── Report table columns ── */
  const reportColumns = useMemo(
    () => [
      {
        header: t('reports.columns.athlete'),
        accessor: '__user',
        cell: row => (
          <div className='flex min-w-[200px] items-center gap-3'>
            <IconBox size='md'>
              <User2 className='h-4.5 w-4.5' />
            </IconBox>
            <p dir='auto' className='max-w-[280px] truncate text-sm font-semibold text-slate-900'>
              {row?.user?.name || row?.user?.email || t('reports.athlete')}
            </p>
          </div>
        ),
      },
      {
        header: t('reports.createdAt'),
        accessor: '__week',
        cell: row => (
          <span className='inline-flex items-center gap-1 text-[11px] text-slate-500'>
            <CalendarDays className='h-3 w-3' />
            {row?.weekOf || '—'}
          </span>
        ),
      },
      {
        header: t('reports.statusReview'),
        accessor: '__status',
        cell: row =>
          row?.reviewedAt ? (
            <Pill tone='ok'>
              <CheckCircle2 className='h-3 w-3' />
              {t('reports.reviewed')}
            </Pill>
          ) : (
            <Pill tone='warn'>
              <XCircle className='h-3 w-3' />
              {t('reports.awaitingReview')}
            </Pill>
          ),
      },
      {
        header: t('reports.card.weight'),
        accessor: '__weight',
        cell: row => {
          const w = row?.measurements?.weight;
          return <StatBadge icon={HeartPulse} value={w != null ? `${w} ${t('reports.card.kg')}` : '—'} />;
        },
      },
      {
        header: t('reports.card.cardio'),
        accessor: '__cardio',
        cell: row => {
          const c = row?.training?.cardioAdherence;
          return <StatBadge icon={Activity} value={c != null ? `${c} / 5` : '—'} secondary />;
        },
      },
      {
        header: t('reports.view'),
        accessor: '__actions',
        cell: row => <ActionButtons row={row} gap='gap-1' actions={[{ icon: <Eye className='h-3.5 w-3.5' />, tooltip: t('reports.view'), variant: 'blue', size: 'md', hidden: !row?.id, onClick: r => openDetail(r.id) }]} />,
      },
    ],
    [t],
  );

  /* ── Client table columns ── */
  const clientColumns = useMemo(
    () => [
      {
        header: t('coachConfig.clients.name', { default: 'Client' }),
        accessor: '__client',
        cell: row => {
          const initials = (row.name || '?')
            .split(' ')
            .slice(0, 2)
            .map(w => w[0])
            .join('')
            .toUpperCase();
          return (
            <div className='flex items-center gap-3 min-w-[180px]'>
              <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center text-white text-xs font-black shrink-0'>{initials}</div>
              <div>
                <p className='text-sm font-semibold text-slate-900'>{row.name}</p>
                <p className='text-xs text-slate-400 truncate max-w-[180px]'>{row.email}</p>
              </div>
            </div>
          );
        },
      },
      // add cols for the status
      {
        header: t('coachConfig.clients.status', { default: 'Status' }),
        accessor: '__status',
        cell: row => {
          const statusColor = row.status === 'submitted' ? 'emerald' : row.status === 'late' ? 'rose' : 'amber';

          return (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border shrink-0 ${statusColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : statusColor === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {row.status !== 'submitted' && <span className='w-1.5 h-1.5 rounded-full bg-current animate-pulse' />}
              {row.status === 'submitted' ? t('coachConfig.clients.statusSubmitted', { default: 'Submitted' }) : row.status === 'late' ? t('coachConfig.clients.statusLate', { default: 'Late' }) : t('coachConfig.clients.statusPending', { default: 'Pending' })}
            </span>
          );
        },
      },
      {
        header: t('coachConfig.clients.lastReport', { default: 'Last Report' }),
        accessor: '__lastReport',
        cell: row => <span className='text-xs text-slate-500'>{row.lastReportAt ? new Date(row.lastReportAt).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US') : '—'}</span>,
      },
      {
        header: t('reports.view', { default: 'Actions' }),
        accessor: '__cliActions',
        cell: row => (
          <div className='flex items-center gap-1.5'>
            {row.status !== 'submitted' && (
              <button onClick={() => handleSendReminder([row.id])} title={t('coachConfig.clients.reminder')} className='flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-all'>
                <BellRing className='h-3 w-3' />
              </button>
            )}
            {row.phone && (
              <button
                onClick={() => {
                  const p = String(row.phone || '').replace(/\D/g, '');
                  if (p) window.open(`https://wa.me/${p}`, '_blank');
                }}
                title={t('coachConfig.clients.whatsapp')}
                className='w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-all'>
                <MessageCircle className='h-3 w-3' />
              </button>
            )}
            <button onClick={() => window.open(`/dashboard/users/${row.id}`, '_blank')} title={t('coachConfig.clients.profile')} className='w-7 h-7 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-all'>
              <Eye className='h-3 w-3' />
            </button>
          </div>
        ),
      },
    ],
    [t, handleSendReminder, locale],
  );

  const cliTableFilters = (
    <FilterField label={t('coachConfig.clients.status', { default: 'Status' })}>
      <Select
        searchable={false}
        clearable={false}
        value={statusFilter}
        onChange={v => {
          setStatusFilter(v);
          setCliPage(1);
        }}
        options={[
          { id: '', label: t('coachConfig.clients.statusAll', { default: 'All' }) },
          { id: 'submitted', label: t('coachConfig.clients.statusSubmitted', { default: 'Submitted' }) },
          { id: 'pending', label: t('coachConfig.clients.statusPending', { default: 'Pending' }) },
          { id: 'late', label: t('coachConfig.clients.statusLate', { default: 'Late' }) },
        ]}
      />
    </FilterField>
  );

  const cliHasFilters = !!clientSearchDb || !!statusFilter;

  /* ── Report table filters ── */
  const rptHasFilters = !!rptSearchDb || rptReviewed !== '' || rptSortBy !== 'created_at' || rptSortOrder !== 'DESC' || !!rptUserId;

  const reportTableFilters = (
    <>
      <FilterField label={t('reports.filters.user', { default: 'User' })}>
        <Select
          searchable
          clearable
          placeholder={t('reports.filters.userPlaceholder', { default: 'Select user' })}
          value={rptUserId}
          onChange={v => {
            setRptUserId(v || '');
            setRptPage(1);
          }}
          options={[{ id: '', label: t('reports.filters.allUsers', { default: 'All users' }) }, ...usersOptions]}
          loading={usersLoading}
        />
      </FilterField>
      <FilterField label={t('reports.filters.reviewed.label')}>
        <Select
          searchable={false}
          clearable={false}
          value={rptReviewed}
          onChange={v => {
            setRptReviewed(v);
            setRptPage(1);
          }}
          options={[
            { id: '', label: t('reports.filters.reviewed.any') },
            { id: 'true', label: t('reports.filters.reviewed.yes') },
            { id: 'false', label: t('reports.filters.reviewed.no') },
          ]}
        />
      </FilterField>
      <FilterField label={t('reports.filters.sortBy')}>
        <Select
          searchable={false}
          clearable={false}
          value={rptSortBy}
          onChange={v => {
            setRptSortBy(v);
            setRptPage(1);
          }}
          options={[
            { id: 'created_at', label: t('reports.sort.fields.created_at') },
            { id: 'updated_at', label: t('reports.sort.fields.updated_at') },
          ]}
        />
      </FilterField>
      <FilterField label={t('reports.filters.sortOrder')}>
        <Select
          searchable={false}
          clearable={false}
          value={rptSortOrder}
          onChange={v => {
            setRptSortOrder(v);
            setRptPage(1);
          }}
          options={[
            { id: 'DESC', label: t('reports.sort.orders.desc') },
            { id: 'ASC', label: t('reports.sort.orders.asc') },
          ]}
        />
      </FilterField>
    </>
  );

  const TABS = [
    { id: 'fields', label: t('coachConfig.tabs.fields'), icon: Settings2 },
    { id: 'notifications', label: t('coachConfig.tabs.notifications'), icon: BellRing },
    { id: 'reports', label: t('reports.title'), icon: FileText, badge: unreviewedCount > 0 ? unreviewedCount : null },
    { id: 'clients', label: t('coachConfig.tabs.clients'), icon: Users },
  ];

  if (configLoading) {
    return (
      <main className='flex flex-col items-center justify-center gap-4 min-h-[60vh]'>
        <div className='w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center shadow-lg'>
          <Loader2 className='w-7 h-7 text-white animate-spin' />
        </div>
        <p className='text-slate-500 text-sm'>{t('coachConfig.loading')}</p>
      </main>
    );
  }

  return (
    <div className='relative min-h-screen pb-32 space-y-5'>
      <GradientStatsHeader tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} icon={FolderPlus} onClick={addCustomGroup} btnName={activeTab === 'fields' && t('coachConfig.groups.addGroup')} title={t('coachConfig.title')} desc={t('coachConfig.subtitle')} loadingStats={configLoading}>
        {activeTab === 'clients' && (
          <>
            <StatCard icon={Users} title={t('coachConfig.clients.total')} value={cliStats.total} />
            <StatCard icon={CheckCircle2} title={t('coachConfig.clients.submitted')} value={cliStats.submitted} />
            <StatCard icon={Clock} title={t('coachConfig.clients.pending')} value={cliStats.pending} />
            <StatCard icon={AlertCircle} title={t('coachConfig.clients.late')} value={cliStats.late} />
          </>
        )}
        {activeTab === 'reports' && (
          <>
            <StatCard icon={FileText} title={t('reports.labels.total', { default: 'Total' })} value={rptTotal} />
            <StatCard icon={CheckCircle2} title={t('reports.reviewed')} value={rptReviewedCount} />
            <StatCard icon={XCircle} title={t('reports.awaitingReview')} value={rptTotal - rptReviewedCount} />
          </>
        )}
        {(activeTab === 'fields' || activeTab === 'notifications') && (
          <>
            <StatCard icon={Settings2} title={t('coachConfig.activeBadge', { count: '' }).replace('{count}', '').trim()} value={totalActive} />
            <StatCard icon={FileText} title={t('reports.labels.total', { default: 'Reports' })} value={rptTotal || 0} />
            <StatCard icon={CheckCircle2} title={t('reports.reviewed')} value={rptReviewedCount} />
            <StatCard icon={XCircle} title={t('reports.awaitingReview')} value={unreviewedCount} />
          </>
        )}
      </GradientStatsHeader>

      {/* ══ FIELDS TAB ══ */}
      {activeTab === 'fields' && (
        <div className='space-y-4'>
          <DndContext sensors={groupSensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
            <SortableContext items={groupOrder} strategy={verticalListSortingStrategy}>
              {groupOrder.map(id => {
                const gData = getGroupData(id);
                if (!gData) return null;
                const isBuiltin = BUILTIN_SECTIONS.includes(id);
                return (
                  <div
                    key={id}
                    ref={el => {
                      groupElRefs.current[id] = el;
                    }}>
                    <SortableGroupCard
                      id={id}
                      groupKey={id}
                      groupData={gData}
                      fieldDefs={isBuiltin ? SECTION_FIELDS[id] || [] : []}
                      onToggleEnabled={v => {
                        if (isBuiltin) setSectionEnabled(id, v);
                        else setConfig(c => ({ ...c, customGroups: c.customGroups.map(g => (g.id === id ? { ...g, enabled: v } : g)) }));
                      }}
                      onBuiltinFieldChange={(fk, p) => setBuiltinField(id, fk, p)}
                      onCustomFieldChange={(fId, p) => {
                        if (isBuiltin) setCustomField(id, fId, p);
                        else setCustomGroupField(id, fId, p);
                      }}
                      onAddField={() => {
                        if (isBuiltin) addCustomFieldToSec(id);
                        else addCustomGrpField(id);
                      }}
                      onDeleteBuiltinField={fk => deleteBuiltinField(id, fk)}
                      onDeleteCustomField={fId => {
                        if (isBuiltin) deleteCustomFieldSec(id, fId);
                        else deleteCustomGrpField(id, fId);
                      }}
                      onDeleteGroup={() => deleteGroup(id)}
                      onRenameGroup={label => renameGroup(id, label)}
                      t={t}
                    />
                  </div>
                );
              })}
            </SortableContext>
          </DndContext>

          {groupOrder.length === 0 && (
            <button type='button' onClick={addCustomGroup} className='w-full flex flex-col items-center py-14 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[var(--color-primary-200)] hover:text-[var(--color-primary-500)] transition-colors gap-2'>
              <FolderPlus size={28} />
              <span className='text-sm font-medium'>{t('coachConfig.groups.addGroup')}</span>
            </button>
          )}
        </div>
      )}

      {/* ══ NOTIFICATIONS TAB ══ */}
      {activeTab === 'notifications' && (
        <div className='rounded-2xl bg-white border border-[var(--color-primary-100)] shadow-sm overflow-hidden'>
          <div className='px-5 py-4 border-b border-[var(--color-primary-100)] bg-gradient-to-r from-[var(--color-primary-50)] to-white flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center shadow-sm'>
                <Bell size={16} className='text-white' />
              </div>
              <div>
                <h2 className='font-bold text-slate-800 text-sm'>{t('coachConfig.notif.title')}</h2>
                <p className='text-xs text-slate-400'>{t('coachConfig.notif.subtitle')}</p>
              </div>
            </div>
            <ActiveToggle enabled={config.notifications?.enabled ?? true} onChange={v => setNotif({ enabled: v })} t={t} />
          </div>

          {!config.notifications?.enabled ? (
            <div className='flex flex-col items-center py-12 gap-2 text-slate-400 p-5'>
              <BellOff size={28} className='opacity-40' />
              <p className='text-sm text-center'>{t('coachConfig.notif.disabled')}</p>
            </div>
          ) : (
            <div className='p-5 space-y-5'>
              <div className='p-4 rounded-xl bg-[var(--color-primary-50)]/50 border border-[var(--color-primary-100)] space-y-5'>
                <div className='flex items-center gap-2'>
                  <CalendarClock size={15} className='text-[var(--color-primary-600)]' />
                  <span className='text-sm font-bold text-slate-800'>{t('coachConfig.notif.schedule')}</span>
                </div>
                <div className='space-y-2'>
                  <label className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('coachConfig.notif.dayOfWeek')}</label>
                  <div className='flex flex-wrap gap-2'>
                    {DAYS_OF_WEEK.map(d => {
                      const active = config.notifications?.dayOfWeek === d;
                      return (
                        <button key={d} type='button' onClick={() => setNotif({ dayOfWeek: d })} className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${active ? 'bg-[var(--color-primary-600)] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-[var(--color-primary-300)]'}`}>
                          {t(`coachConfig.days.${d}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('coachConfig.notif.sendTime')}</label>
                  <input type='time' value={config.notifications?.sendTime ?? '09:00'} onChange={e => setNotif({ sendTime: e.target.value })} className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]/40 w-full sm:w-36' />
                </div>
                <div className='border-t border-[var(--color-primary-100)] pt-4 space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Repeat size={13} className='text-amber-500' />
                    <span className='text-xs font-bold text-slate-700'>{t('coachConfig.notif.reminders')}</span>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    {[
                      { key: 'reminderAfterDays', label: t('coachConfig.notif.reminderAfterDays'), unit: t('coachConfig.notif.daysAfterRequest'), min: 1, max: 7, def: 2 },
                      { key: 'maxReminders', label: t('coachConfig.notif.maxReminders'), unit: t('coachConfig.notif.times'), min: 1, max: 10, def: 3 },
                    ].map(f => (
                      <div key={f.key} className='space-y-1.5'>
                        <label className='text-xs font-medium text-slate-500'>{f.label}</label>
                        <div className='flex items-center gap-2'>
                          <input type='number' min={f.min} max={f.max} value={config.notifications?.[f.key] ?? f.def} onChange={e => setNotif({ [f.key]: Number(e.target.value) || f.def })} className='w-20 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]/40' />
                          <span className='text-xs text-slate-400'>{f.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className='p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4'>
                <div className='flex items-center gap-2'>
                  <MessagesSquare size={15} className='text-slate-600' />
                  <span className='text-sm font-bold text-slate-800'>{t('coachConfig.notif.messages')}</span>
                </div>
                {[
                  { key: 'initialMessage', label: t('coachConfig.notif.initialMessage'), ph: t('coachConfig.notif.initialMessagePh'), def: t('coachConfig.notif.defaultInitialMessage') },
                  { key: 'reminderMessage', label: t('coachConfig.notif.reminderMessage'), ph: t('coachConfig.notif.reminderMessagePh'), def: t('coachConfig.notif.defaultReminderMessage') },
                ].map(msg => (
                  <div key={msg.key} className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>{msg.label}</label>
                      <button type='button' onClick={() => setNotif({ [msg.key]: msg.def })} className='text-[11px] text-[var(--color-primary-600)] hover:underline flex items-center gap-1'>
                        <RotateCcw size={9} /> {t('coachConfig.notif.useDefault')}
                      </button>
                    </div>
                    <textarea rows={3} value={config.notifications?.[msg.key] ?? msg.def} onChange={e => setNotif({ [msg.key]: e.target.value })} placeholder={msg.ph} className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]/40 focus:border-[var(--color-primary-400)]' />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ REPORTS TAB ══ */}
      {activeTab === 'reports' && (
        <div className='space-y-4'>
          <DataTable
            columns={reportColumns}
            data={reports}
            isLoading={rptLoading}
            rowKey={row => row.id}
            searchValue={rptSearch}
            onSearchChange={v => {
              setRptSearch(v);
              setRptPage(1);
            }}
            onSearch={() => {
              setRptPage(1);
              loadReports();
            }}
            filters={reportTableFilters}
            hasActiveFilters={rptHasFilters}
            onApplyFilters={() => {
              setRptPage(1);
              loadReports();
            }}
            labels={{
              searchPlaceholder: t('reports.searchPlaceholder', { default: 'Search reports...' }),
              filter: t('reports.filters.title', { default: 'Filters' }),
              apply: t('reports.filters.apply', { default: 'Apply' }),
              emptyTitle: rptErr || t('reports.empty'),
              emptySubtitle: t('reports.subtitle'),
              preview: t('reports.detail.title'),
            }}
            pagination={{ current_page: rptPage, per_page: rptLimit, total_records: rptTotal }}
            onPageChange={({ page: np, per_page }) => {
              setRptPage(np);
              if (per_page !== rptLimit) setRptLimit(per_page);
            }}
            perPageOptions={PER_PAGE_OPTIONS}
            striped
            hoverable
            className='w-full'
          />
        </div>
      )}

      {/* ══ CLIENTS TAB ══ */}
      {activeTab === 'clients' && (
        <div className='space-y-4'>
          {reminderOk && (
            <div className='flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium'>
              <CheckCircle2 size={15} className='text-emerald-600' /> {t('coachConfig.clients.reminderSent')}
            </div>
          )}
          {selectedIds.length > 0 && (
            <div className='flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-200'>
              <span className='text-sm font-semibold text-amber-800'>{t('coachConfig.clients.sendToSelected', { count: selectedIds.length })}</span>
              <button type='button' onClick={() => handleSendReminder(selectedIds)} disabled={sendingRem} className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-50'>
                {sendingRem ? <Loader2 size={12} className='animate-spin' /> : <Send size={12} />}
                {t('coachConfig.clients.sendReminder', { default: 'Send Reminder' })}
              </button>
            </div>
          )}
          <DataTable
            columns={clientColumns}
            data={clients}
            isLoading={clientsLoading}
            rowKey={row => row.id}
            searchValue={clientSearch}
            onSearchChange={v => {
              setClientSearch(v);
              setCliPage(1);
            }}
            onSearch={() => {
              setCliPage(1);
              loadClients();
            }}
            filters={cliTableFilters}
            hasActiveFilters={cliHasFilters}
            onApplyFilters={() => {
              setCliPage(1);
              loadClients();
            }}
            labels={{
              searchPlaceholder: t('coachConfig.clients.search'),
              filter: t('reports.filters.title', { default: 'Filters' }),
              apply: t('reports.filters.apply', { default: 'Apply' }),
              emptyTitle: t('coachConfig.clients.empty'),
              emptySubtitle: t('coachConfig.clients.subtitle'),
            }}
            pagination={{ current_page: cliPage, per_page: cliLimit, total_records: cliTotal }}
            onPageChange={({ page: np, per_page }) => {
              setCliPage(np);
              if (per_page !== cliLimit) setCliLimit(per_page);
            }}
            perPageOptions={PER_PAGE_OPTIONS}
            striped
            hoverable
            className='w-full'
          />
        </div>
      )}

      {/* ══ REPORT DETAIL MODAL ══ */}
      <ReportDetailModal open={detailOpen} onClose={closeDetail} active={activeReport} detailLoading={detailLoading} saving={fbSaving} saveErr={fbSaveErr} savedOk={fbSavedOk} feedbackDraft={feedbackDraft} setFeedbackDraft={setFeedbackDraft} onSaveFeedback={handleSaveFeedback} t={t} />

      {/* ══ FLOATING SAVE BAR (fields/notifications only) ══ */}
      {isDirty && (activeTab === 'fields' || activeTab === 'notifications') && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl shadow-black/40 backdrop-blur-sm border border-white/10' style={{ minWidth: 320, animation: 'cfgSlideUp .22s cubic-bezier(.34,1.56,.64,1) both' }}>
          <div className='flex-1'>
            <p className='text-sm font-bold'>{t('coachConfig.unsavedChanges')}</p>
            {saveErr && <p className='text-xs text-rose-400 mt-0.5'>{saveErr}</p>}
            {saveOk && <p className='text-xs text-emerald-400 mt-0.5'>{t('coachConfig.savedSuccess')}</p>}
          </div>
          <button type='button' onClick={handleSave} disabled={saving} className='flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] text-white text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-50 active:scale-[.97] transition-all'>
            {saving ? <Loader2 size={15} className='animate-spin' /> : <Save size={15} />}
            {t('coachConfig.save')}
          </button>
        </div>
      )}

      <style>{`
        @keyframes cfgSlideUp {
          from { opacity:0; transform:translate(-50%,18px) scale(.96); }
          to   { opacity:1; transform:translate(-50%,0) scale(1); }
        }
      `}</style>
    </div>
  );
}
