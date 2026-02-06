'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'use-intl';
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiTrash2,
  FiSearch,
  FiX,
} from 'react-icons/fi';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';
import CheckBox from '@/components/atoms/CheckBox';
import MultiLangText from '@/components/atoms/MultiLangText';

import { Modal } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { Notification } from '@/config/Notification';
import { PencilLine, Share2, Trash2, Files, Sparkles, Layers, Link as LinkIcon } from 'lucide-react';

// -------- constants (i18n labels تُقرأ من ar.json) --------
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

function ThemeFrame({ children, className = '' }) {
  return (
    <div
      className={`rounded-3xl p-[1px] ${className}`}
      style={{
        background:
          'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))',
      }}
    >
      <div
        className="rounded-3xl border bg-white/85 backdrop-blur-xl"
        style={{
          borderColor: 'var(--color-primary-200)',
          boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04), 0 18px 40px rgba(15, 23, 42, 0.10)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SoftCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border bg-white ${className}`}
      style={{
        borderColor: 'var(--color-primary-200)',
        boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03), 0 10px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      {children}
    </div>
  );
}

function IconBadge({ children, active = false }) {
  return (
    <div
      className="grid place-items-center rounded-2xl"
      style={{
        width: 48,
        height: 48,
        background: active
          ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
          : 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
        boxShadow: active ? '0 14px 26px rgba(15, 23, 42, 0.12)' : '0 10px 18px rgba(15, 23, 42, 0.07)',
      }}
    >
      {children}
    </div>
  );
}

function TinyActionBtn({ title, onClick, children, tone = 'neutral' }) {
  const tones = {
    neutral: {
      border: 'var(--color-primary-200)',
      bg: 'white',
      hoverBg: 'var(--color-primary-50)',
      text: 'var(--color-primary-700)',
      ring: 'var(--color-primary-200)',
    },
    accent: {
      border: 'var(--color-primary-200)',
      bg: 'white',
      hoverBg: 'var(--color-primary-50)',
      text: 'var(--color-primary-700)',
      ring: 'var(--color-primary-200)',
    },
    danger: {
      border: '#fecdd3', // keep danger semantic
      bg: 'white',
      hoverBg: '#fff1f2',
      text: '#e11d48',
      ring: '#fecdd3',
    },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4"
      style={{
        borderColor: t.border,
        backgroundColor: t.bg,
        color: t.text,
        boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
        ['--tw-ring-color']: t.ring,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = t.hoverBg;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = t.bg;
      }}
    >
      {children}
    </button>
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
    next => {
      setItems(next);
      onChange?.(next);
    },
    [onChange],
  );

  const commitDraft = useCallback(
    text => {
      const raw = (text ?? '').trim();
      if (!raw) return;

      const parts = raw
        .split(',')
        .map(s => s.trim())
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

  const handleKeyDown = e => {
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

  const removeAt = idx => {
    if (disabled) return;
    const next = items.filter((_, i) => i !== idx);
    emit(next);
  };

  return (
    <div className={className}>
      {label && <div className="text-sm font-semibold text-slate-800 mb-2">{label}</div>}

      <div
        className={`rounded-2xl border p-3 transition-all ${disabled ? 'opacity-70' : ''}`}
        style={{
          borderColor: disabled ? '#e2e8f0' : 'var(--color-primary-200)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))',
          boxShadow: disabled ? 'none' : '0 10px 24px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((opt, i) => (
            <span
              key={`${opt}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: 'var(--color-primary-200)',
                background:
                  'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                color: 'var(--color-primary-800)',
              }}
            >
              {opt}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="ml-0.5 rounded-full p-0.5 transition-colors"
                  aria-label="remove option"
                  title="remove"
                  style={{ color: 'var(--color-primary-700)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary-100)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>

        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (commitOnBlur) commitDraft(draft);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border-0 outline-none text-sm placeholder:text-slate-400 disabled:bg-transparent bg-transparent"
        />
      </div>
    </div>
  );
}

export default function FormsManagementPage() {
  const t = useTranslations('forms');

  // list state
  const [forms, setForms] = useState([]);
  const [filtered, setFiltered] = useState([]);
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

  // fetch
  const fetchForms = useCallback(async () => {
    try {
      const res = await api.get('/forms');
      const list = (res?.data?.data || res?.data || []).map(form => ({
        ...form,
        fields: (form.fields || []).map(f => ({
          ...f,
          _uid: f._uid ?? f.id ?? crypto.randomUUID(),
        })),
      }));
      setForms(list);
      setFiltered(list);
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

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) setFiltered(forms);
    else setFiltered(forms.filter(f => (f.title || '').toLowerCase().includes(q)));
  }, [query, forms]);

  const resetFormState = () => {
    setFormTitle('');
    setFormFields([]);
    setEditingMap({});
  };

  // -------- NEW FORM (create mode) --------
  const openCreateFormModal = () => {
    setIsEditing(false);
    setSelectedForm(null);
    setFormTitle('');
    setFormFields([
      {
        _uid: crypto.randomUUID(),
        label: 'Demo field',
        key: genKey12(),
        type: 'text',
        placeholder: 'Enter something here',
        required: false,
        options: [],
        order: 0,
      },
    ]);
    setEditingMap({ 0: true });
    setShowFormModal(true);
  };

  // -------- EDIT FORM (edit mode) --------
  const openEditFormModal = (form, isEdit) => {
    if (isEdit && form) {
      setIsEditing(true);
      setSelectedForm(form);
      setFormTitle(form?.title || '');

      const normalized = (form?.fields || []).slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1));

      setFormFields(
        normalized.map(f => ({
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
  };

  // -------- DUPLICATE FORM (clone mode) --------
  const handleDuplicateForm = form => {
    if (!form) return;

    setIsEditing(false);
    setSelectedForm(null);

    const suffix = t('labels.copy_suffix', { default: ' (Copy)' });
    setFormTitle(`${form.title || ''}${suffix}`);

    const cloned = (form.fields || [])
      .slice()
      .sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1))
      .map((f, idx) => ({
        _uid: crypto.randomUUID(),
        label: f.label || '',
        key: genKey12(),
        type: f.type,
        placeholder: f.placeholder || '',
        required: !!f.required,
        options: f.options || [],
        order: idx,
      }));

    setFormFields(cloned);
    setEditingMap({});
    setShowFormModal(true);
  };

  const getShareableLink = formId => `${window.location.origin}/form/${formId}/submit`;

  const copyLink = id => {
    const link = getShareableLink(id);
    navigator.clipboard.writeText(link);
    Notification(t('messages.link_copied'), 'success');
  };

  // -------- CRUD --------
  const [loading, setLoading] = useState(false);

  const createForm = async () => {
    const title = (formTitle || '').trim();
    if (!title) {
      Notification(t('errors.title_required'), 'error');
      return;
    }

    const invalidField = (formFields || []).find(f => !(f.label || '').trim());
    if (invalidField) {
      Notification(t('errors.required'), 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        fields: (formFields || []).map((f, idx) => ({
          label: f.label,
          key: f.key,
          placeholder: f.placeholder || '',
          type: f.type,
          required: !!f.required,
          options: f.options || [],
          order: idx + 1,
        })),
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
  };

  const updateForm = async () => {
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

      const existing = ordered.filter(f => !!f.id);
      const newlyAdded = ordered.filter(f => !f.id);

      await api.patch('/forms', {
        id: selectedForm.id,
        title,
        fields: existing.map(f => ({
          id: f.id,
          label: f.label,
          key: f.key,
          placeholder: f.placeholder || '',
          type: f.type,
          required: !!f.required,
          options: f.options || [],
          order: f.order,
        })),
      });

      if (newlyAdded.length) {
        await api.post(`/forms/${selectedForm.id}/fields`, {
          fields: newlyAdded.map(f => ({
            label: f.label,
            key: f.key,
            placeholder: f.placeholder || '',
            type: f.type,
            required: !!f.required,
            options: f.options || [],
            order: f.order,
          })),
        });
      }

      if (existing.length) {
        await api.patch('/forms/re-order', {
          fields: existing.map(f => ({ id: f.id, order: f.order })),
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
  };

  const deleteForm = async formId => {
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
  };

  // -------- fields manipulation --------
  const toggleEditField = (index, on = undefined) => {
    setEditingMap(m => ({
      ...m,
      [index]: typeof on === 'boolean' ? on : !m[index],
    }));
  };

  const updateFieldProp = (index, prop, val) => {
    setFormFields(prev => prev.map((f, i) => (i === index ? { ...f, [prop]: val } : f)));
  };

  const addInlineField = () => {
    const idx = formFields.length;
    setFormFields(prev => [
      ...prev,
      {
        _uid: crypto.randomUUID(),
        label: '',
        key: genKey12(),
        type: 'text',
        placeholder: '',
        required: false,
        options: [],
        order: idx,
      },
    ]);

    setEditingMap(m => ({ ...m, [idx]: true }));
  };

  const removeField = index => {
    setFormFields(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
    setEditingMap(m => {
      const copy = { ...m };
      delete copy[index];
      const newMap = {};
      Object.keys(copy).forEach(oldIndex => {
        const numIndex = parseInt(oldIndex);
        if (numIndex > index) {
          newMap[numIndex - 1] = copy[oldIndex];
        } else if (numIndex < index) {
          newMap[numIndex] = copy[oldIndex];
        }
      });
      return newMap;
    });
  };

  const moveField = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= formFields.length) return;
    setFormFields(prev => {
      const clone = prev.slice();
      const tmp = clone[index];
      clone[index] = clone[newIndex];
      clone[newIndex] = tmp;
      return clone.map((f, i) => ({ ...f, order: i }));
    });

    setEditingMap(m => {
      const newMap = {};
      Object.keys(m).forEach(key => {
        const numKey = parseInt(key);
        if (numKey === index) {
          newMap[newIndex] = m[key];
        } else if (numKey === newIndex) {
          newMap[index] = m[key];
        } else {
          newMap[numKey] = m[key];
        }
      });
      return newMap;
    });
  };

  // -------- UI Bits --------
  const Pill = ({ children, tone = 'primary' }) => {
    const tones = {
      primary: {
        border: 'var(--color-primary-200)',
        bg: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
        text: 'var(--color-primary-800)',
      },
      soft: {
        border: '#e2e8f0',
        bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        text: '#475569',
      },
      warning: {
        border: '#fde68a',
        bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
        text: '#92400e',
      },
    };

    const s = tones[tone] || tones.primary;

    return (
      <span
        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
        style={{
          borderColor: s.border,
          background: s.bg,
          color: s.text,
          boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
        }}
      >
        {children}
      </span>
    );
  };

  // Field row with local drafts
  const FieldRow = ({ field, index }) => {
    const typeOptions = FIELD_TYPE_OPTIONS.map(opt => ({
      id: opt.id,
      label: t(`types_map.${opt.id}`),
    }));

    const editing = !!editingMap[index];
    const canMoveUp = index > 0;
    const canMoveDown = index < formFields.length - 1;

    const [labelDraft, setLabelDraft] = React.useState(field.label || '');
    const [placeholderDraft, setPlaceholderDraft] = React.useState(field.placeholder || '');

    React.useEffect(() => {
      if (editing) {
        setLabelDraft(field.label || '');
        setPlaceholderDraft(field.placeholder || '');
      }
    }, [editing, field.label, field.placeholder]);

    const commitDrafts = () => {
      if (labelDraft !== field.label) {
        updateFieldProp(index, 'label', labelDraft);
        if (!field.key) updateFieldProp(index, 'key', genKey12());
      }
      if (placeholderDraft !== field.placeholder) {
        updateFieldProp(index, 'placeholder', placeholderDraft);
      }
    };

    return (
      <div
        className="group relative overflow-hidden rounded-3xl border bg-white p-4 transition-all duration-200"
        style={{
          borderColor: editing ? 'var(--color-primary-300)' : 'var(--color-primary-200)',
          boxShadow: editing
            ? '0 1px 0 rgba(15,23,42,0.03), 0 18px 44px rgba(15,23,42,0.12)'
            : '0 1px 0 rgba(15,23,42,0.03), 0 12px 30px rgba(15,23,42,0.07)',
        }}
      >
        {/* Top theme line */}
        <div
          className="absolute left-0 right-0 top-0 h-1"
          style={{
            background: editing
              ? 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))'
              : 'linear-gradient(90deg, var(--color-primary-100), rgba(255,255,255,0))',
            opacity: editing ? 1 : 0.8,
          }}
        />

        {!editing ? (
          <div className="flex items-start justify-between gap-4 pt-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <MultiLangText className="font-extrabold text-slate-900 text-[15px] break-all">
                  {field.label || t('labels.no_label')}
                </MultiLangText>
                <Pill>{t(`types_map.${field.type}`)}</Pill>
                {field.required && <Pill tone="warning">{t('labels.required')}</Pill>}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl  border"
                  style={{
                    borderColor: 'var(--color-primary-200)',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
                    color: 'var(--color-primary-800)',
                  }}
                >
                  {t('labels.key')}: {field.key}
                </span>

                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border font-semibold"
                  style={{
                    borderColor: 'var(--color-primary-200)',
                    background:
                      'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                    color: 'var(--color-primary-800)',
                  }}
                >
                  {t('labels.order')}: {field.order ?? 1}
                </span>
              </div>

              {field.placeholder && (
                <MultiLangText className="text-sm text-slate-600 break-all mt-2">
                  <span className="text-slate-400">{t('labels.placeholder')}:</span> {field.placeholder}
                </MultiLangText>
              )}

              {(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
                field.options &&
                field.options.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {field.options.slice(0, 5).map((opt, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold"
                        style={{
                          borderColor: 'var(--color-primary-200)',
                          background:
                            'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                          color: 'var(--color-primary-800)',
                        }}
                      >
                        {opt}
                      </span>
                    ))}
                    {field.options.length > 5 && (
                      <span className="inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold"
                        style={{
                          borderColor: '#e2e8f0',
                          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                          color: '#475569',
                        }}
                      >
                        +{field.options.length - 5}
                      </span>
                    )}
                  </div>
                )}
            </div>

            <div className="flex items-center gap-2">
              <TinyActionBtn
                title={t('actions.move_up')}
                onClick={() => moveField(index, -1)}
                tone="neutral"
                disabled={!canMoveUp}
              >
                <FiChevronUp className="w-4 h-4" />
              </TinyActionBtn>

              <TinyActionBtn
                title={t('actions.move_down')}
                onClick={() => moveField(index, +1)}
                tone="neutral"
                disabled={!canMoveDown}
              >
                <FiChevronDown className="w-4 h-4" />
              </TinyActionBtn>

              <button
                type="button"
                title={t('actions.edit_field')}
                aria-label={t('actions.edit_field')}
                onClick={() => toggleEditField(index, true)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4"
                style={{
                  borderColor: 'transparent',
                  background:
                    'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                  color: 'white',
                  boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
                  ['--tw-ring-color']: 'var(--color-primary-200)',
                }}
              >
                <FiEdit2 className="w-4 h-4" />
              </button>

              <TinyActionBtn
                title={t('actions.remove_field')}
                onClick={() => removeField(index)}
                tone="danger"
              >
                <FiTrash2 className="w-4 h-4" />
              </TinyActionBtn>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('editor.label')}
                placeholder={t('editor.placeholders.label')}
                value={labelDraft}
                onChange={v => setLabelDraft(v)}
                onBlur={commitDrafts}
              />
              <Input
                label={t('editor.placeholder')}
                placeholder={t('editor.placeholders.placeholder')}
                value={placeholderDraft}
                onChange={v => setPlaceholderDraft(v)}
                onBlur={commitDrafts}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                clearable={false}
                searchable={false}
                label={t('editor.type')}
                value={field.type}
                onChange={v => updateFieldProp(index, 'type', v)}
                options={typeOptions}
              />

              <div className="flex items-end pb-2">
                <CheckBox
                  label={t('editor.required')}
                  initialChecked={!!field.required}
                  onChange={val => updateFieldProp(index, 'required', !!val)}
                />
              </div>
            </div>

            {(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') && (
              <div>
                <InputList
                  label={t('editor.options')}
                  value={field.options || []}
                  onChange={arr => updateFieldProp(index, 'options', arr)}
                  placeholder={t('editor.placeholders.option')}
                />
              </div>
            )}

            <div
              className="flex items-center justify-end gap-2 pt-4"
              style={{ borderTop: '1px solid rgba(226,232,240,0.9)' }}
            >
              <button
                type="button"
                onClick={() => {
                  commitDrafts();
                  toggleEditField(index, false);
                }}
                className="inline-flex items-center justify-center h-11 px-6 rounded-2xl border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4"
                style={{
                  borderColor: 'transparent',
                  background:
                    'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                  color: 'white',
                  boxShadow: '0 14px 30px rgba(15,23,42,0.12)',
                  ['--tw-ring-color']: 'var(--color-primary-200)',
                }}
              >
                {t('actions.done')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen"
       
    >
      <div className="  !px-0">
        <GradientStatsHeader
          onClick={openCreateFormModal}
          btnName={t('header.new')}
          title={t('header.title')}
          desc={t('header.desc')}
        />

        {isLoading ? (
          <div className="min-h-screen">
            <div className="container !px-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                <aside className="lg:col-span-4">
                  <ThemeFrame>
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-20 rounded-2xl border animate-shimmer"
                          style={{
                            borderColor: 'rgba(226,232,240,0.9)',
                            background:
                              'linear-gradient(90deg, rgba(226,232,240,0.65), rgba(226,232,240,1), rgba(226,232,240,0.65))',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      ))}
                    </div>
                  </ThemeFrame>
                </aside>
                <section className="lg:col-span-8">
                  <ThemeFrame>
                    <div className="p-6 space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-28 rounded-2xl border animate-shimmer"
                          style={{
                            borderColor: 'rgba(226,232,240,0.9)',
                            background:
                              'linear-gradient(90deg, rgba(226,232,240,0.65), rgba(226,232,240,1), rgba(226,232,240,0.65))',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      ))}
                    </div>
                  </ThemeFrame>
                </section>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* LEFT: forms list */}
            <aside className="  lg:col-span-4">
              <div className="sticky top-6">
                <ThemeFrame>
                  {/* Header + search */}
                  <div
                    className="p-4 border-b rounded-[20px_20px_0_0] "
                    style={{
                      borderColor: 'var(--color-primary-200)',
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900">{t('header.title')}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{t('header.desc')}</div>
                      </div> 
                    </div>

                    <div className="mt-4 relative">
                      <FiSearch className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('labels.search', { default: 'Search forms...' })}
                        className="w-full h-11 rounded-2xl border pl-10 pr-10 text-sm outline-none transition-all"
                        style={{
                          borderColor: 'var(--color-primary-200)',
                          backgroundColor: 'rgba(255,255,255,0.92)',
                          boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'var(--color-primary-200)';
                        }}
                      />
                      {query?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-all"
                          title={t('actions.clear', { default: 'Clear' })}
                          style={{ color: 'var(--color-primary-700)' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary-100)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  {filtered.length === 0 ? (
                    <div className="p-10 text-center">
                      <div
                        className="mx-auto mb-4 grid place-items-center rounded-3xl"
                        style={{
                          width: 72,
                          height: 72,
                          background:
                            'linear-gradient(135deg, var(--color-primary-100), var(--color-secondary-100))',
                          boxShadow: '0 16px 28px rgba(15,23,42,0.10)',
                        }}
                      >
                        <FiFileText className="h-8 w-8" style={{ color: 'var(--color-primary-700)' }} />
                      </div>
                      <div className="font-extrabold text-slate-900 mb-2 text-lg">{t('empty.title')}</div>
                      <div className="text-slate-600 text-sm">{t('empty.subtitle')}</div>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-310px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
                      <ul className="p-3 space-y-2">
                        {filtered.map(f => {
                          const isActive = selectedForm?.id === f.id;

                          return (
                            <li key={f.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedForm(f)}
                                className="w-full text-left rounded-3xl border p-3.5 transition-all active:scale-[0.995]"
                                style={{
                                  borderColor: isActive ? 'var(--color-primary-300)' : 'rgba(226,232,240,0.9)',
                                  background: isActive
                                    ? 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))'
                                    : 'rgba(255,255,255,0.92)',
                                  boxShadow: isActive
                                    ? '0 1px 0 rgba(15,23,42,0.03), 0 18px 40px rgba(15,23,42,0.12)'
                                    : '0 1px 0 rgba(15,23,42,0.03), 0 10px 24px rgba(15,23,42,0.06)',
                                }}
                                onMouseEnter={e => {
                                  if (!isActive) {
                                    e.currentTarget.style.borderColor = 'var(--color-primary-200)';
                                    e.currentTarget.style.background =
                                      'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isActive) {
                                    e.currentTarget.style.borderColor = 'rgba(226,232,240,0.9)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.92)';
                                  }
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <IconBadge active={isActive}>
                                    <FiFileText className={isActive ? 'text-white' : ''} style={{ color: isActive ? 'white' : 'var(--color-primary-800)' }} />
                                  </IconBadge>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <MultiLangText
                                          className=" ltr:text-left rtl:text-right font-extrabold truncate block"
                                          as="h2"
                                          style={{ color: isActive ? 'var(--color-primary-900)' : '#0f172a' }}
                                        >
                                          {f.title}
                                        </MultiLangText>

                                        <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                                          <Layers className="w-4 h-4" style={{ color: 'var(--color-primary-700)' }} />
                                          <span className="font-semibold">{f.fields?.length ?? 0}</span> {t('labels.fields')}
                                        </p>
                                      </div>
                                    </div>

                                    {/* row actions */}
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                      {f?.adminId != null && (
                                        <TinyActionBtn
                                          title={t('actions.copy_link')}
                                          onClick={e => {
                                            e.stopPropagation();
                                            copyLink(f.id);
                                          }}
                                          tone="accent"
                                        >
                                          <LinkIcon className="h-4 w-4" />
                                        </TinyActionBtn>
                                      )}

                                      <TinyActionBtn
                                        title={t('actions.duplicate', { default: 'Duplicate' })}
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleDuplicateForm(f);
                                        }}
                                        tone="accent"
                                      >
                                        <Files className="h-4 w-4" />
                                      </TinyActionBtn>

                                      {f?.adminId != null && (
                                        <TinyActionBtn
                                          title={t('actions.edit')}
                                          onClick={e => {
                                            e.stopPropagation();
                                            openEditFormModal(f, true);
                                          }}
                                          tone="accent"
                                        >
                                          <PencilLine className="h-4 w-4" />
                                        </TinyActionBtn>
                                      )}

                                      {f?.adminId != null && (
                                        <TinyActionBtn
                                          title={t('actions.delete')}
                                          onClick={e => {
                                            e.stopPropagation();
                                            setDeletingId(f.id);
                                            setShowDeleteModal(true);
                                          }}
                                          tone="danger"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </TinyActionBtn>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </ThemeFrame>
              </div>
            </aside>

            {/* RIGHT: selected form */}
            <section className="lg:col-span-8">
              {!selectedForm ? (
                <ThemeFrame>
                  <div className="min-h-[320px] flex items-center justify-center p-12 text-center">
                    <div>
                      <div
                        className="mx-auto mb-4 grid place-items-center rounded-3xl"
                        style={{
                          width: 88,
                          height: 88,
                          background:
                            'linear-gradient(135deg, var(--color-primary-100), var(--color-secondary-100))',
                          boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
                        }}
                      >
                        <Sparkles className="w-10 h-10" style={{ color: 'var(--color-primary-700)' }} />
                      </div>
                      <div className="text-slate-900 font-extrabold text-xl">{t('empty.select_hint')}</div>
                      <div className="text-slate-600 text-sm mt-1">
                        {t('empty.select_hint_sub', { default: 'Pick a form from the left to view details.' })}
                      </div>
                    </div>
                  </div>
                </ThemeFrame>
              ) : (
                <ThemeFrame>
                  {/* Header */}
                  <div
                    className="rounded-[20px_20px_0_0]  p-6 border-b"
                    style={{
                      borderColor: 'var(--color-primary-200)',
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <IconBadge active>
                        <FiFileText className="h-6 w-6 text-white" />
                      </IconBadge>

                      <div className="min-w-0 flex-1">
                        <MultiLangText
                          className="text-2xl font-extrabold truncate"
                          style={{
                            background:
                              'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {selectedForm.title}
                        </MultiLangText>

                        <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                          <Layers className="w-4 h-4" style={{ color: 'var(--color-primary-700)' }} />
                          <span className="font-semibold">{selectedForm.fields?.length || 0}</span> {t('labels.fields')}
                        </p>
                      </div>

                      {/* quick actions */}
                      <div className="flex items-center gap-2">
                        

                        {selectedForm?.adminId != null && (
                          <button
                            type="button"
                            onClick={() => openEditFormModal(selectedForm, true)}
                            className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4"
                            style={{
                              borderColor: 'transparent',
                              background:
                                'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                              color: 'white',
                              boxShadow: '0 16px 30px rgba(15,23,42,0.12)',
                              ['--tw-ring-color']: 'var(--color-primary-200)',
                            }}
                          >
                            <FiEdit2 className="w-4 h-4" />
                            <span className="font-semibold hidden sm:inline">{t('actions.edit')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="p-6">
                    {selectedForm.fields?.length ? (
                      <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 pr-2">
                        {(selectedForm.fields || [])
                          .slice()
                          .sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1))
                          .map(field => (
                            <SoftCard key={field.id} className="p-5 transition-all">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <MultiLangText className="font-extrabold text-slate-900 text-[15px] break-all">
                                      {field.label}
                                    </MultiLangText>
                                    <Pill>{t(`types_map.${field.type}`)}</Pill>
                                    {field.required && <Pill tone="warning">{t('labels.required')}</Pill>}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                                    <span
                                      className="  inline-flex items-center gap-1 px-2.5 py-1 rounded-xl  border"
                                      style={{
                                        borderColor: 'var(--color-primary-200)',
                                        background:
                                          'linear-gradient(135deg, rgba(255,255,255,0.92), var(--color-primary-50))',
                                        color: 'var(--color-primary-800)',
                                      }}
                                    >
                                      {t('labels.key')}: <span className='font-en' >{field.key}</span>
                                    </span>
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border font-semibold"
                                      style={{
                                        borderColor: 'var(--color-primary-200)',
                                        background:
                                          'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                                        color: 'var(--color-primary-800)',
                                      }}
                                    >
                                      {t('labels.order')}: {field.order ?? 1}
                                    </span>
                                  </div>

                                  {field.placeholder && (
                                     <span className='text-sm text-slate-600 break-all' > <span className="text-slate-400">{t('labels.placeholder')}:</span> {field.placeholder}</span>
                                     
                                  )}

                                  {(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
                                    field.options &&
                                    field.options.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {field.options.map((opt, i) => (
                                          <span
                                            key={i}
                                            className="inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold"
                                            style={{
                                              borderColor: 'var(--color-primary-200)',
                                              background:
                                                'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
                                              color: 'var(--color-primary-800)',
                                            }}
                                          >
                                            {opt}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </SoftCard>
                          ))}
                      </div>
                    ) : (
                      <div
                        className="rounded-3xl border border-dashed p-10 text-center"
                        style={{
                          borderColor: 'rgba(148, 163, 184, 0.7)',
                          background: 'rgba(255,255,255,0.65)',
                          boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
                        }}
                      >
                        <div
                          className="mx-auto mb-4 grid place-items-center rounded-3xl"
                          style={{
                            width: 72,
                            height: 72,
                            background:
                              'linear-gradient(135deg, rgba(226,232,240,0.9), rgba(241,245,249,0.9))',
                          }}
                        >
                          <Layers className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="text-slate-700 font-semibold">{t('empty.no_fields')}</div>
                      </div>
                    )}
                  </div>
                </ThemeFrame>
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
          <div className="flex items-start gap-4 p-4 rounded-2xl border"
            style={{
              borderColor: '#fecdd3',
              background: 'linear-gradient(135deg, #fff1f2, rgba(255,255,255,0.9))',
              boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
            }}
          >
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#ffe4e6' }}>
              <FiTrash2 className="w-5 h-5" style={{ color: '#e11d48' }} />
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">{t('delete.message')}</p>
          </div>

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
        maxW="max-w-5xl"
      >
        <form
          className="space-y-6 pt-4"
          onSubmit={e => {
            e.preventDefault();
            (isEditing ? updateForm : createForm)();
          }}
        >
          {/* Title */}
          <div
            className="p-4 rounded-3xl border"
            style={{
              borderColor: 'var(--color-primary-200)',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.9), var(--color-primary-50))',
              boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
            }}
          >
            <Input
              placeholder={t('editor.placeholders.form_title')}
              value={formTitle}
              onChange={setFormTitle}
              className="max-w-full"
            />
          </div>

          {/* Fields section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" style={{ color: 'var(--color-primary-700)' }} />
                {t('editor.fields')}
              </h3>

              <button
                type="button"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl border transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4"
                onClick={addInlineField}
                style={{
                  borderColor: 'transparent',
                  background:
                    'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                  color: 'white',
                  boxShadow: '0 16px 30px rgba(15,23,42,0.12)',
                  ['--tw-ring-color']: 'var(--color-primary-200)',
                }}
              >
                <FiPlus className="w-4 h-4" />
                <span className="font-semibold">{t('editor.add_field')}</span>
              </button>
            </div>

            {formFields.length ? (
              <div className="space-y-4 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 pr-2">
                {formFields.map((f, idx) => (
                  <FieldRow key={f._uid} field={f} index={idx} />
                ))}
              </div>
            ) : (
              <div
                className="rounded-3xl border border-dashed p-10 text-center"
                style={{
                  borderColor: 'rgba(148, 163, 184, 0.7)',
                  background: 'rgba(255,255,255,0.65)',
                  boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
                }}
              >
                <div
                  className="mx-auto mb-4 grid place-items-center rounded-3xl"
                  style={{
                    width: 72,
                    height: 72,
                    background:
                      'linear-gradient(135deg, rgba(226,232,240,0.9), rgba(241,245,249,0.9))',
                  }}
                >
                  <Layers className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-slate-700 font-semibold">{t('empty.no_fields')}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex justify-end gap-3 pt-4"
            style={{ borderTop: '1px solid rgba(226,232,240,0.9)' }}
          >
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="inline-flex items-center justify-center h-11 px-6 rounded-2xl border bg-white text-slate-700 font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 active:scale-[0.99]"
              style={{
                borderColor: 'rgba(226,232,240,0.9)',
                boxShadow: '0 10px 22px rgba(15,23,42,0.06)',
                ['--tw-ring-color']: 'rgba(148,163,184,0.4)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
            >
              {t('actions.cancel')}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl text-white font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 active:scale-[0.99]"
              style={{
                borderColor: 'transparent',
                background: isEditing
                  ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
                  : 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
                boxShadow: '0 18px 34px rgba(15,23,42,0.14)',
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                ['--tw-ring-color']: 'var(--color-primary-200)',
              }}
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                  />
                </svg>
              ) : (
                <>
                  {isEditing ? <FiEdit2 className="w-5 h-5" /> : <FiPlus className="w-5 h-5" />}
                  <span>{isEditing ? t('edit.cta') : t('create.cta')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
