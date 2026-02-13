'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useDeferredValue,
} from 'react';
import { useTranslations } from 'use-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiEdit2, FiFileText, FiPlus, FiTrash2, FiX } from 'react-icons/fi';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';
import CheckBox from '@/components/atoms/CheckBox';
import MultiLangText from '@/components/atoms/MultiLangText';

import { Modal } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { Notification } from '@/config/Notification';
import {
  PencilLine,
  Trash2 as LucideTrash2,
  Files,
  Sparkles,
  Layers,
  Link as LinkIcon,
  Zap,
  Check,
  AlertCircle,
  BarChart3,
  Database,
} from 'lucide-react';

// -------- constants --------
const FIELD_TYPE_OPTIONS = [
  { id: 'text', labelKey: 'types.text' },
  { id: 'email', labelKey: 'types.email' },
  { id: 'number', labelKey: 'types.number' },
  { id: 'phone', labelKey: 'types.phone' },
  { id: 'date', labelKey: 'types.date' },
  { id: 'textarea', labelKey: 'types.textarea' },
  { id: 'select', labelKey: 'types.select' },
  { id: 'radio', labelKey: 'types.radio' },
  { id: 'checkbox', labelKey: 'types.checkbox' },
  { id: 'checklist', labelKey: 'types.checklist' },
  { id: 'file', labelKey: 'types.file' },
];

// -------- helpers --------
function genKey12() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

/* ==================== LUXURY THEME COMPONENTS ==================== */

function LuxuryFrame({ children, className = '', glow = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`relative group ${className}`}
    >
      <div
        className="relative rounded-md p-[1px]"
        style={{
          background:
            'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))',
        }}
      >
        <div className="rounded-md border bg-white/90 backdrop-blur-2xl">{children}</div>
      </div>
    </motion.div>
  );
}

function GlassCard({ children, className = '', hover = false }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`rounded-lg border backdrop-blur-xl ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'var(--color-primary-200)',
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      }}
    >
      {children}
    </motion.div>
  );
}

function IconBadge({ children, active = false, size = 'md' }) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <motion.div
      whileHover={{ rotate: 5, scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400 }}
      className={`grid place-items-center rounded-lg ${sizes[size]}`}
      style={{
        background: active
          ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
          : 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
        boxShadow: active ? '0 12px 30px rgba(15, 23, 42, 0.15)' : '0 8px 20px rgba(15, 23, 42, 0.08)',
      }}
    >
      {children}
    </motion.div>
  );
}

function ActionButton({ title, onClick, children, variant = 'ghost', disabled = false }) {
  const variants = {
    ghost: {
      bg: 'white',
      border: 'var(--color-primary-200)',
      color: 'var(--color-primary-700)',
      hoverBg: 'var(--color-primary-50)',
    },
    gradient: {
      bg: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
      border: 'transparent',
      color: 'white',
      hoverBg: 'linear-gradient(135deg, var(--color-gradient-via), var(--color-gradient-to))',
    },
    danger: {
      bg: 'white',
      border: '#fecdd3',
      color: '#e11d48',
      hoverBg: '#fff1f2',
    },
  };

  const style = variants[variant] || variants.ghost;

  return (
    <motion.button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4"
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.color,
        boxShadow:
          variant === 'gradient' ? '0 10px 25px rgba(15, 23, 42, 0.15)' : '0 6px 18px rgba(15, 23, 42, 0.08)',
        ['--tw-ring-color']: 'var(--color-primary-200)',
      }}
    >
      {children}
    </motion.button>
  );
}

function StatusPill({ children, variant = 'primary' }) {
  const variants = {
    primary: {
      border: 'var(--color-primary-200)',
      bg: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
      text: 'var(--color-primary-800)',
    },
    warning: {
      border: '#fde68a',
      bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      text: '#92400e',
    },
    success: {
      border: '#bbf7d0',
      bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      text: '#166534',
    },
  };

  const style = variants[variant] || variants.primary;

  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide"
      style={{
        borderColor: style.border,
        background: style.bg,
        color: style.text,
        boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
      }}
    >
      {children}
    </span>
  );
}

function InputList({
  label,
  value = [],
  onChange,
  placeholder = 'Add option and press Enter',
  className = '',
  disabled = false,
  maxItems,
  commitOnBlur = true,
}) {
  const [items, setItems] = useState(Array.isArray(value) ? value : []);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setItems(Array.isArray(value) ? value : []);
  }, [value]);

  const emit = useCallback(
    (next) => {
      setItems(next);
      onChange?.(next);
    },
    [onChange],
  );

  const commitDraft = useCallback(
    (text) => {
      const raw = (text ?? '').trim();
      if (!raw) return;

      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      let next = [...items];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }

      if (typeof maxItems === 'number') {
        next = next.slice(0, maxItems);
      }

      emit(next);
      setDraft('');
    },
    [items, emit, maxItems],
  );

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft(draft);
    }

    if (e.key === ',') {
      e.preventDefault();
      commitDraft(draft);
    }

    if (e.key === 'Backspace' && draft === '' && items.length > 0) {
      e.preventDefault();
      const next = items.slice(0, -1);
      emit(next);
    }
  };

  const removeAt = (idx) => {
    if (disabled) return;
    const next = items.filter((_, i) => i !== idx);
    emit(next);
  };

  return (
    <div className={className}>
      {label && <div className="text-sm font-bold text-slate-800 mb-2">{label}</div>}

      <div
        className={`rounded-lg border p-3 transition-all ${disabled ? 'opacity-70' : ''}`}
        style={{
          borderColor: disabled ? '#e2e8f0' : 'var(--color-primary-200)',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: disabled ? 'none' : '0 8px 20px rgba(15, 23, 42, 0.08)',
        }}
      >
        <AnimatePresence mode="popLayout">
          <div className="flex flex-wrap gap-2 mb-2">
            {items.map((opt, i) => (
              <motion.span
                key={`${opt}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold"
                style={{
                  borderColor: 'var(--color-primary-300)',
                  background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
                  color: 'var(--color-primary-800)',
                }}
              >
                {opt}
                {!disabled && (
                  <motion.button
                    type="button"
                    onClick={() => removeAt(i)}
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="rounded-full p-0.5 transition-colors"
                    aria-label="remove option"
                    title="remove"
                    style={{ color: 'var(--color-primary-700)' }}
                  >
                    <FiX className="w-3 h-3" />
                  </motion.button>
                )}
              </motion.span>
            ))}
          </div>
        </AnimatePresence>

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (commitOnBlur) commitDraft(draft);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border-0 outline-none text-sm placeholder:text-slate-400 disabled:bg-transparent bg-transparent font-medium"
        />
      </div>
    </div>
  );
}

/* ==================== MEMOIZED FIELD ROW (performance) ==================== */

const FieldRow = React.memo(
  function FieldRow({
    field,
    index,
    isNew,
    editing,
    t,
    typeOptions,
    formFieldsLength,
    newFieldRef,
    updateFieldProp,
    toggleEditField,
    moveField,
    removeField,
  }) {
    const canMoveUp = index > 0;
    const canMoveDown = index < formFieldsLength - 1;

    const [labelDraft, setLabelDraft] = React.useState(field.label || '');

    React.useEffect(() => {
      if (editing) setLabelDraft(field.label || '');
    }, [editing, field.label]);

    const commitDrafts = useCallback(() => {
      const nextLabel = (labelDraft ?? '').toString();
      if (nextLabel !== field.label) {
        updateFieldProp(index, 'label', nextLabel);
        // IMPORTANT: placeholder is hidden in UI, but stored/sent in background = label
        updateFieldProp(index, 'placeholder', nextLabel);
        if (!field.key) updateFieldProp(index, 'key', genKey12());
      }
    }, [labelDraft, field.label, field.key, index, updateFieldProp]);

    return (
      <motion.div
        ref={isNew ? newFieldRef : null}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="group relative overflow-hidden rounded-md border bg-white transition-all duration-300"
        style={{
          borderColor: editing ? 'var(--color-primary-400)' : 'var(--color-primary-200)',
          boxShadow: editing
            ? '0 20px 50px rgba(15,23,42,0.15), 0 2px 8px rgba(15,23,42,0.06)'
            : '0 10px 30px rgba(15,23,42,0.08)',
        }}
      >
        <motion.div
          className="absolute left-0 right-0 top-0 h-1"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            background: editing
              ? 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))'
              : 'linear-gradient(90deg, var(--color-primary-200), rgba(255,255,255,0))',
            transformOrigin: 'left',
          }}
        />

        <div className="p-5">
          {!editing ? (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <MultiLangText className="font-black text-slate-900 text-base">
                    {field.label || t('labels.no_label')}
                  </MultiLangText>
                  <StatusPill variant="primary">{t(`types_map.${field.type}`)}</StatusPill>
                  {field.required && <StatusPill variant="warning">{t('labels.required')}</StatusPill>}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-semibold"
                    style={{
                      borderColor: 'var(--color-primary-200)',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
                      color: 'var(--color-primary-800)',
                    }}
                  >
                    <Database className="w-3 h-3" />
                    {field.key}
                  </span>

                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold"
                    style={{
                      borderColor: 'var(--color-primary-300)',
                      background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
                      color: 'var(--color-primary-800)',
                    }}
                  >
                    <BarChart3 className="w-3 h-3" />
                    {t('labels.order')}: {field.order ?? 1}
                  </span>
                </div>

                {(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
                  field.options &&
                  field.options.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {field.options.slice(0, 5).map((opt, i) => (
                        <motion.span
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold"
                          style={{
                            borderColor: 'var(--color-primary-300)',
                            background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
                            color: 'var(--color-primary-800)',
                          }}
                        >
                          {opt}
                        </motion.span>
                      ))}
                      {field.options.length > 5 && <StatusPill variant="primary">+{field.options.length - 5}</StatusPill>}
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <ActionButton
                  title={t('actions.move_up')}
                  onClick={() => moveField(index, -1)}
                  variant="ghost"
                  disabled={!canMoveUp}
                >
                  <FiChevronUp className="w-4 h-4" />
                </ActionButton>

                <ActionButton
                  title={t('actions.move_down')}
                  onClick={() => moveField(index, +1)}
                  variant="ghost"
                  disabled={!canMoveDown}
                >
                  <FiChevronDown className="w-4 h-4" />
                </ActionButton>

                <ActionButton title={t('actions.edit_field')} onClick={() => toggleEditField(index, true)} variant="gradient">
                  <FiEdit2 className="w-4 h-4" />
                </ActionButton>

                <ActionButton title={t('actions.remove_field')} onClick={() => removeField(index)} variant="danger">
                  <FiTrash2 className="w-4 h-4" />
                </ActionButton>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="lg:col-span-1">
                  <Input
                    label={t('editor.label')}
                    placeholder={t('editor.placeholders.label')}
                    value={labelDraft}
                    onChange={(v) => setLabelDraft(v)}
                    onBlur={commitDrafts}
                  />
                </div>

                {/* ✅ PLACEHOLDER INPUT REMOVED (hidden) */}

                <div className="lg:col-span-1">
                  <Select
                    clearable={false}
                    searchable={false}
                    label={t('editor.type')}
                    value={field.type}
                    onChange={(v) => updateFieldProp(index, 'type', v)}
                    options={typeOptions}
                  />
                </div>

                <div className="flex items-end pb-2">
                  <CheckBox
                    label={t('editor.required')}
                    initialChecked={!!field.required}
                    onChange={(val) => updateFieldProp(index, 'required', !!val)}
                  />
                </div>
              </div>

              {(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') && (
                <InputList
                  label={t('editor.options')}
                  value={field.options || []}
                  onChange={(arr) => updateFieldProp(index, 'options', arr)}
                  placeholder={t('editor.placeholders.option')}
                />
              )}

              <div className="flex items-center justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--color-primary-200)' }}>
                <motion.button
                  type="button"
                  onClick={() => {
                    commitDrafts();
                    toggleEditField(index, false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-lg text-white font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                    boxShadow: '0 12px 30px rgba(15,23,42,0.15)',
                  }}
                >
                  <Check className="w-4 h-4" />
                  {t('actions.done')}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  },
  (prev, next) => {
    // re-render only if row data or editing state changed
    return prev.field === next.field && prev.editing === next.editing && prev.index === next.index && prev.formFieldsLength === next.formFieldsLength;
  },
);

export default function FormsManagementPage() {
  const t = useTranslations('forms');

  // list state
  const [forms, setForms] = useState([]);
  const [query, setQuery] = useState('');

  const [selectedForm, setSelectedForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // form modal
  const [showFormModal, setShowFormModal] = useState(false);

  // delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // form states
  const [formTitle, setFormTitle] = useState('');
  const [formFields, setFormFields] = useState([]);

  // inline field editing state (index -> true/false)
  const [editingMap, setEditingMap] = useState({});

  // edit vs create
  const [isEditing, setIsEditing] = useState(false);

  // Refs for scroll functionality
  const fieldsContainerRef = useRef(null);
  const newFieldRef = useRef(null);

  // PERFORMANCE: memoize type options once per locale/t
  const typeOptions = useMemo(() => {
    return FIELD_TYPE_OPTIONS.map((opt) => ({
      id: opt.id,
      label: t(`types_map.${opt.id}`),
    }));
  }, [t]);

  // fetch
  const fetchForms = useCallback(async () => {
    try {
      const res = await api.get('/forms');
      const list = (res?.data?.data || res?.data || []).map((form) => ({
        ...form,
        fields: (form.fields || []).map((f) => ({
          ...f,
          _uid: f._uid ?? f.id ?? crypto.randomUUID(),
        })),
      }));
      setForms(list);
      if (list.length && !selectedForm) setSelectedForm(list[0]);
    } catch (e) {
      Notification(t('messages.load_failed'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedForm, t]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // PERFORMANCE: useDeferredValue + useMemo instead of filtered state/effect
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => {
    const q = (deferredQuery || '').trim().toLowerCase();
    if (!q) return forms;
    return forms.filter((f) => (f.title || '').toLowerCase().includes(q));
  }, [forms, deferredQuery]);

  const resetFormState = useCallback(() => {
    setFormTitle('');
    setFormFields([]);
    setEditingMap({});
  }, []);

  // Scroll to new field functionality
  const scrollToNewField = useCallback(() => {
    if (newFieldRef.current && fieldsContainerRef.current) {
      setTimeout(() => {
        newFieldRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });

        if (newFieldRef.current) {
          newFieldRef.current.style.animation = 'field-highlight 1.5s ease-out';
        }
      }, 100);
    }
  }, []);

  // -------- NEW FORM (create mode) --------
  const openCreateFormModal = useCallback(() => {
    setIsEditing(false);
    setSelectedForm(null);
    setFormTitle('');
    setFormFields([
      {
        _uid: crypto.randomUUID(),
        label: 'Demo field',
        key: genKey12(),
        type: 'text',
        placeholder: 'Demo field', // hidden in UI but stored/sent
        required: false,
        options: [],
        order: 0,
      },
    ]);
    setEditingMap({ 0: true });
    setShowFormModal(true);
  }, []);

  // -------- EDIT FORM (edit mode) --------
  const openEditFormModal = useCallback(
    (form, isEdit) => {
      if (isEdit && form) {
        setIsEditing(true);
        setSelectedForm(form);
        setFormTitle(form?.title || '');

        const normalized = (form?.fields || []).slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1));

        setFormFields(
          normalized.map((f) => ({
            ...f,
            _uid: f._uid ?? f.id ?? crypto.randomUUID(),
          })),
        );
        setEditingMap({});
      } else {
        openCreateFormModal();
        return;
      }

      setShowFormModal(true);
    },
    [openCreateFormModal],
  );

  // -------- DUPLICATE FORM (clone mode) --------
  const handleDuplicateForm = useCallback(
    (form) => {
      if (!form) return;

      setIsEditing(false);
      setSelectedForm(null);

      const suffix = t('labels.copy_suffix', { default: ' (Copy)' });
      setFormTitle(`${form.title || ''}${suffix}`);

      const cloned = (form.fields || [])
        .slice()
        .sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1))
        .map((f, idx) => {
          const label = f.label || '';
          return {
            _uid: crypto.randomUUID(),
            label,
            key: genKey12(),
            type: f.type,
            placeholder: label, // hidden in UI, stored/sent
            required: !!f.required,
            options: f.options || [],
            order: idx,
          };
        });

      setFormFields(cloned);
      setEditingMap({});
      setShowFormModal(true);
    },
    [t],
  );

  const getShareableLink = useCallback((formId) => `${window.location.origin}/form/${formId}/submit`, []);

  const copyLink = useCallback(
    (id) => {
      const link = getShareableLink(id);
      navigator.clipboard.writeText(link);
      Notification(t('messages.link_copied'), 'success');
    },
    [getShareableLink, t],
  );

  // -------- CRUD --------
  const [loading, setLoading] = useState(false);

  const createForm = useCallback(async () => {
    const title = (formTitle || '').trim();
    if (!title) {
      Notification(t('errors.title_required'), 'error');
      return;
    }

    const invalidField = (formFields || []).find((f) => !(f.label || '').trim());
    if (invalidField) {
      Notification(t('errors.required'), 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        fields: (formFields || []).map((f, idx) => {
          const label = (f.label || '').trim();
          return {
            label,
            key: f.key,
            // IMPORTANT: placeholder is sent in background = label
            placeholder: label,
            type: f.type,
            required: !!f.required,
            options: f.options || [],
            order: idx + 1,
          };
        }),
      };
      await api.post('/forms', payload);
      Notification(t('messages.created'), 'success');
      setShowFormModal(false);
      resetFormState();
      fetchForms();
    } catch (e) {
      const msg = e?.response?.data?.message;
      Notification(Array.isArray(msg) ? msg.join(', ') : t('errors.create_failed'), 'error');
    }
    setLoading(false);
  }, [fetchForms, formFields, formTitle, resetFormState, t]);

  const updateForm = useCallback(async () => {
    if (!selectedForm?.id) return;
    const title = (formTitle || '').trim();
    if (!title) {
      Notification(t('errors.title_required'), 'error');
      return;
    }

    setLoading(true);

    try {
      const ordered = formFields.map((f, idx) => ({ ...f, order: idx }));
      setFormFields(ordered);

      const existing = ordered.filter((f) => !!f.id);
      const newlyAdded = ordered.filter((f) => !f.id);

      await api.patch('/forms', {
        id: selectedForm.id,
        title,
        fields: existing.map((f) => {
          const label = (f.label || '').trim();
          return {
            id: f.id,
            label,
            key: f.key,
            // IMPORTANT: placeholder is sent in background = label
            placeholder: label,
            type: f.type,
            required: !!f.required,
            options: f.options || [],
            order: f.order,
          };
        }),
      });

      if (newlyAdded.length) {
        await api.post(`/forms/${selectedForm.id}/fields`, {
          fields: newlyAdded.map((f) => {
            const label = (f.label || '').trim();
            return {
              label,
              key: f.key,
              // IMPORTANT: placeholder is sent in background = label
              placeholder: label,
              type: f.type,
              required: !!f.required,
              options: f.options || [],
              order: f.order,
            };
          }),
        });
      }

      if (existing.length) {
        await api.patch('/forms/re-order', {
          fields: existing.map((f) => ({ id: f.id, order: f.order })),
        });
      }

      Notification(t('messages.updated'), 'success');
      setShowFormModal(false);
      resetFormState();
      fetchForms();
    } catch (e) {
      const msg = e?.response?.data?.message;
      Notification(Array.isArray(msg) ? msg.join(', ') : t('errors.update_failed'), 'error');
    }

    setLoading(false);
  }, [fetchForms, formFields, formTitle, resetFormState, selectedForm?.id, t]);

  const deleteForm = useCallback(
    async (formId) => {
      try {
        setIsDeleting(true);
        await api.delete(`/forms/${formId}`);
        Notification(t('messages.deleted'), 'success');
        if (selectedForm?.id === formId) setSelectedForm(null);
        await fetchForms();
      } catch (e) {
        Notification(t('errors.delete_failed'), 'error');
      } finally {
        setIsDeleting(false);
        setShowDeleteModal(false);
        setDeletingId(null);
      }
    },
    [fetchForms, selectedForm?.id, t],
  );

  // -------- fields manipulation --------
  const toggleEditField = useCallback((index, on = undefined) => {
    setEditingMap((m) => ({
      ...m,
      [index]: typeof on === 'boolean' ? on : !m[index],
    }));
  }, []);

  const updateFieldProp = useCallback((index, prop, val) => {
    setFormFields((prev) => prev.map((f, i) => (i === index ? { ...f, [prop]: val } : f)));
  }, []);

  const addInlineField = useCallback(() => {
    setFormFields((prev) => {
      const idx = prev.length;
      const next = [
        ...prev,
        {
          _uid: crypto.randomUUID(),
          label: '',
          key: genKey12(),
          type: 'text',
          placeholder: '', // will be set to label automatically when label changes
          required: false,
          options: [],
          order: idx,
        },
      ];
      return next;
    });

    setEditingMap((m) => {
      const idx = formFields.length; // current length before state update
      return { ...m, [idx]: true };
    });

    setTimeout(scrollToNewField, 100);
  }, [formFields.length, scrollToNewField]);

  const removeField = useCallback((index) => {
    setFormFields((prev) => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
    setEditingMap((m) => {
      const copy = { ...m };
      delete copy[index];
      const newMap = {};
      Object.keys(copy).forEach((oldIndex) => {
        const numIndex = parseInt(oldIndex, 10);
        if (numIndex > index) newMap[numIndex - 1] = copy[oldIndex];
        else if (numIndex < index) newMap[numIndex] = copy[oldIndex];
      });
      return newMap;
    });
  }, []);

  const moveField = useCallback((index, dir) => {
    setFormFields((prev) => {
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const clone = prev.slice();
      const tmp = clone[index];
      clone[index] = clone[newIndex];
      clone[newIndex] = tmp;
      return clone.map((f, i) => ({ ...f, order: i }));
    });

    setEditingMap((m) => {
      const newIndex = index + dir;
      const newMap = {};
      Object.keys(m).forEach((k) => {
        const numKey = parseInt(k, 10);
        if (numKey === index) newMap[newIndex] = m[k];
        else if (numKey === newIndex) newMap[index] = m[k];
        else newMap[numKey] = m[k];
      });
      return newMap;
    });
  }, []);

  // PERFORMANCE: memoize sorted selected form fields
  const selectedFormSortedFields = useMemo(() => {
    const fields = selectedForm?.fields || [];
    return fields.slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1));
  }, [selectedForm?.fields]);

  return (
    <div
      className="min-h-screen pb-12"
      style={{
        background:
          'radial-gradient(1200px 600px at 15% 12%, var(--color-primary-50), transparent 60%),' +
          'radial-gradient(900px 500px at 85% 18%, var(--color-secondary-50), transparent 60%),' +
          'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.08, 0.12, 0.08],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full"
          style={{
            background: `radial-gradient(circle, var(--color-primary-300), transparent 70%)`,
          }}
        />
      </div>

      <div className="relative">
        <GradientStatsHeader
          onClick={openCreateFormModal}
          btnName={t('header.new')}
          title={t('header.title')}
          desc={t('header.desc')}
          icon={Sparkles}
        />

        {isLoading ? (
          <div className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <aside className="lg:col-span-4">
                <LuxuryFrame>
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="h-24 rounded-lg animate-pulse"
                        style={{
                          background: 'linear-gradient(90deg, #e2e8f0, #f1f5f9, #e2e8f0)',
                          backgroundSize: '200% 100%',
                        }}
                      />
                    ))}
                  </div>
                </LuxuryFrame>
              </aside>
              <section className="lg:col-span-8">
                <LuxuryFrame>
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="h-32 rounded-lg animate-pulse"
                        style={{
                          background: 'linear-gradient(90deg, #e2e8f0, #f1f5f9, #e2e8f0)',
                          backgroundSize: '200% 100%',
                        }}
                      />
                    ))}
                  </div>
                </LuxuryFrame>
              </section>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
            {/* LEFT: forms list */}
            <aside className="lg:col-span-4">
              <div className="sticky top-6">
                <LuxuryFrame glow>
                  <div
                    className="p-5 border-b rounded-[8px_8px_0_0]"
                    style={{
                      borderColor: 'var(--color-primary-200)',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <IconBadge active size="md">
                          <Database className="w-6 h-6 text-white" />
                        </IconBadge>
                        <div>
                          <div className="text-xl font-black text-slate-900">{t('header.title')}</div>
                          <div className="text-sm text-slate-500 font-medium">{forms.length} Forms</div>
                        </div>
                      </div>
                    </div>

                    {/* Search (if you have input for it; kept query state) */}
                    {/* If you already have a search input elsewhere, keep that. */}
                    {/* Example:
                    <Input placeholder={t('search')} value={query} onChange={setQuery} />
                    */}
                  </div>

                  {filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 text-center">
                      <IconBadge size="lg">
                        <FiFileText className="w-8 h-8" style={{ color: 'var(--color-primary-700)' }} />
                      </IconBadge>
                      <div className="mt-4 font-black text-slate-900 text-lg">{t('empty.title')}</div>
                      <div className="text-slate-600 text-sm mt-1">{t('empty.subtitle')}</div>
                    </motion.div>
                  ) : (
                    <div className="max-h-[calc(100vh-310px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
                      <ul className="p-3 space-y-2">
                        <AnimatePresence mode="popLayout">
                          {filtered.map((f, index) => {
                            const isActive = selectedForm?.id === f.id;

                            return (
                              <motion.li
                                key={f.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <motion.button
                                  type="button"
                                  onClick={() => setSelectedForm(f)}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                                  className="w-full text-left rounded-md border p-4 transition-all"
                                  style={{
                                    borderColor: isActive ? 'var(--color-primary-400)' : 'var(--color-primary-200)',
                                    background: isActive
                                      ? 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.95))'
                                      : 'rgba(255,255,255,0.9)',
                                    boxShadow: isActive ? '0 12px 35px rgba(15,23,42,0.12)' : '0 6px 20px rgba(15,23,42,0.06)',
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <IconBadge active={isActive} size="sm">
                                      <FiFileText
                                        className="w-4 h-4"
                                        style={{ color: isActive ? 'white' : 'var(--color-primary-800)' }}
                                      />
                                    </IconBadge>

                                    <div className="min-w-0 flex-1">
                                      <MultiLangText
                                        className=" rtl:text-right font-black text-base truncate block mb-2"
                                        style={{ color: isActive ? 'var(--color-primary-900)' : '#0f172a' }}
                                      >
                                        {f.title}
                                      </MultiLangText>

                                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                                        <Layers className="w-4 h-4" style={{ color: 'var(--color-primary-600)' }} />
                                        <span className="font-bold">{f.fields?.length ?? 0}</span>
                                        <span>{t('labels.fields')}</span>
                                      </div>

                                      <div className="flex gap-1.5 flex-wrap">
                                        {f?.adminId != null && (
                                          <ActionButton
                                            title={t('actions.copy_link')}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyLink(f.id);
                                            }}
                                            variant="ghost"
                                          >
                                            <LinkIcon className="w-3.5 h-3.5" />
                                          </ActionButton>
                                        )}

                                        <ActionButton
                                          title={t('actions.duplicate')}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDuplicateForm(f);
                                          }}
                                          variant="ghost"
                                        >
                                          <Files className="w-3.5 h-3.5" />
                                        </ActionButton>

                                        {f?.adminId != null && (
                                          <ActionButton
                                            title={t('actions.edit')}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditFormModal(f, true);
                                            }}
                                            variant="gradient"
                                          >
                                            <PencilLine className="w-3.5 h-3.5" />
                                          </ActionButton>
                                        )}

                                        {f?.adminId != null && (
                                          <ActionButton
                                            title={t('actions.delete')}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeletingId(f.id);
                                              setShowDeleteModal(true);
                                            }}
                                            variant="danger"
                                          >
                                            <LucideTrash2 className="w-3.5 h-3.5" />
                                          </ActionButton>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.button>
                              </motion.li>
                            );
                          })}
                        </AnimatePresence>
                      </ul>
                    </div>
                  )}
                </LuxuryFrame>
              </div>
            </aside>

            {/* RIGHT: selected form */}
            <section className="lg:col-span-8">
              {!selectedForm ? (
                <LuxuryFrame>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="min-h-[400px] flex items-center justify-center p-12 text-center">
                    <div>
                      <motion.div animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                        <IconBadge size="lg">
                          <Sparkles className="w-10 h-10" style={{ color: 'var(--color-primary-700)' }} />
                        </IconBadge>
                      </motion.div>
                      <div className="mt-6 text-2xl font-black text-slate-900">{t('empty.select_hint')}</div>
                      <div className="text-slate-600 mt-2">{t('empty.select_hint_sub', { default: 'Pick a form from the left to view details.' })}</div>
                    </div>
                  </motion.div>
                </LuxuryFrame>
              ) : (
                <LuxuryFrame glow>
                  <div
                    className="rounded-[8px_8px_0_0] p-6 border-b"
                    style={{
                      borderColor: 'var(--color-primary-200)',
                      background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.95))',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <IconBadge active size="md">
                          <FiFileText className="w-6 h-6 text-white" />
                        </IconBadge>

                        <div className="min-w-0 flex-1">
                          <div
                            className=" rtl:text-right w-fit text-2xl font-black mb-2 truncate"
                            style={{
                              background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                              WebkitBackgroundClip: 'text',
                              backgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {selectedForm.title}
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Layers className="w-4 h-4" style={{ color: 'var(--color-primary-700)' }} />
                            <span className="font-bold text-slate-900">{selectedForm.fields?.length || 0}</span>
                            <span className="text-slate-600">{t('labels.fields')}</span>
                          </div>
                        </div>
                      </div>

                      {selectedForm?.adminId != null && (
                        <motion.button
                          type="button"
                          onClick={() => openEditFormModal(selectedForm, true)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-2 h-11 px-5 rounded-lg text-white font-bold"
                          style={{
                            background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                            boxShadow: '0 12px 30px rgba(15,23,42,0.15)',
                          }}
                        >
                          <FiEdit2 className="w-4 h-4" />
                          <span className="hidden sm:inline">{t('actions.edit')}</span>
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {selectedFormSortedFields.length ? (
                      <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 pr-2">
                        <AnimatePresence mode="popLayout">
                          {selectedFormSortedFields.map((field) => (
                            <GlassCard key={field.id} hover className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-3">
                                    <MultiLangText className="font-black text-slate-900 text-base">{field.label}</MultiLangText>
                                    <StatusPill variant="primary">{t(`types_map.${field.type}`)}</StatusPill>
                                    {field.required && <StatusPill variant="warning">{t('labels.required')}</StatusPill>}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                                    <span
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-semibold"
                                      style={{
                                        borderColor: 'var(--color-primary-200)',
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
                                        color: 'var(--color-primary-800)',
                                      }}
                                    >
                                      {t('labels.key')}: <span className="font-en">{field.key}</span>
                                    </span>
                                    <span
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold"
                                      style={{
                                        borderColor: 'var(--color-primary-300)',
                                        background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
                                        color: 'var(--color-primary-800)',
                                      }}
                                    >
                                      {t('labels.order')}: {field.order ?? 1}
                                    </span>
                                  </div>

                                  {/* ✅ Placeholder display removed */}

                                  {(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
                                    field.options &&
                                    field.options.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {field.options.map((opt, i) => (
                                          <StatusPill key={i} variant="primary">
                                            {opt}
                                          </StatusPill>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </GlassCard>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-md border border-dashed p-12 text-center"
                        style={{
                          borderColor: 'var(--color-primary-300)',
                          background: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        <IconBadge size="lg">
                          <Layers className="w-8 h-8 text-slate-400" />
                        </IconBadge>
                        <div className="mt-4 text-slate-700 font-bold text-lg">{t('empty.no_fields')}</div>
                      </motion.div>
                    )}
                  </div>
                </LuxuryFrame>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeletingId(null);
          }
        }}
        title={t('delete.title')}
        maxW="max-w-md"
      >
        <div className="space-y-6 pt-2">
          <GlassCard className="p-5">
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, #ffe4e6, #fecdd3)',
                  boxShadow: '0 6px 18px rgba(225, 29, 72, 0.2)',
                }}
              >
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <p className="text-slate-700 leading-relaxed">{t('delete.message')}</p>
            </div>
          </GlassCard>

          <div className="flex justify-end gap-3">
            <Button
              name={t('actions.cancel')}
              className="!w-fit"
              onClick={() => {
                if (!isDeleting) {
                  setShowDeleteModal(false);
                  setDeletingId(null);
                }
              }}
            />
            <Button
              name={isDeleting ? t('actions.deleting') : t('delete.confirm')}
              className="!w-fit"
              color="danger"
              onClick={() => deletingId && deleteForm(deletingId)}
              disabled={isDeleting}
            />
          </div>
        </div>
      </Modal>

      {/* Create/Edit Form Modal */}
      <Modal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={isEditing ? t('edit.title') : t('create.title')}
        maxW="max-w-6xl"
      >
        <form
          className="space-y-6 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            (isEditing ? updateForm : createForm)();
          }}
        >
          <GlassCard className="p-5">
            <Input placeholder={t('editor.placeholders.form_title')} value={formTitle} onChange={setFormTitle} className="max-w-full" />
          </GlassCard>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900 text-xl flex items-center gap-2">
                <Layers className="w-6 h-6" style={{ color: 'var(--color-primary-700)' }} />
                {t('editor.fields')}
              </h3>

              <motion.button
                type="button"
                onClick={addInlineField}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-white font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                  boxShadow: '0 12px 30px rgba(15,23,42,0.15)',
                }}
              >
                <FiPlus className="w-4 h-4" />
                <span>{t('editor.add_field')}</span>
              </motion.button>
            </div>

            {formFields.length ? (
              <div ref={fieldsContainerRef} className="space-y-4 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 pr-2">
                <AnimatePresence mode="popLayout">
                  {formFields.map((f, idx) => (
                    <FieldRow
                      key={f._uid}
                      field={f}
                      index={idx}
                      isNew={idx === formFields.length - 1 && !!editingMap[idx]}
                      editing={!!editingMap[idx]}
                      t={t}
                      typeOptions={typeOptions}
                      formFieldsLength={formFields.length}
                      newFieldRef={newFieldRef}
                      updateFieldProp={updateFieldProp}
                      toggleEditField={toggleEditField}
                      moveField={moveField}
                      removeField={removeField}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-md border border-dashed p-12 text-center"
                style={{
                  borderColor: 'var(--color-primary-300)',
                  background: 'rgba(255,255,255,0.7)',
                }}
              >
                <IconBadge size="lg">
                  <Layers className="w-8 h-8 text-slate-400" />
                </IconBadge>
                <div className="mt-4 text-slate-700 font-bold text-lg">{t('empty.no_fields')}</div>
              </motion.div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '2px solid var(--color-primary-200)' }}>
            <motion.button
              type="button"
              onClick={() => setShowFormModal(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center h-11 px-6 rounded-lg border bg-white text-slate-700 font-bold"
              style={{
                borderColor: 'var(--color-primary-200)',
                boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
              }}
            >
              {t('actions.cancel')}
            </motion.button>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg text-white font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                boxShadow: '0 12px 30px rgba(15,23,42,0.15)',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Zap className="w-5 h-5" />
                </motion.div>
              ) : (
                <>
                  {isEditing ? <FiEdit2 className="w-5 h-5" /> : <FiPlus className="w-5 h-5" />}
                  <span>{isEditing ? t('edit.cta') : t('create.cta')}</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </Modal>

      <style jsx global>{`
        @keyframes field-highlight {
          0%,
          100% {
            background-color: transparent;
          }
          50% {
            background-color: var(--color-primary-100);
          }
        }
      `}</style>
    </div>
  );
}
