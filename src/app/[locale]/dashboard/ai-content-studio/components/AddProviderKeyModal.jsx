'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PROVIDER_HELP, keyFieldsForProvider } from '@/lib/ai-content-studio/studio-ui-meta';
import { TextInput } from './studio-ui';

export function AddProviderKeyModal({ open, providerId, option, onClose, onSave }) {
  const t = useTranslations('aiContentStudio');
  const [draft, setDraft] = useState({});
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);

  if (!open || !providerId || typeof document === 'undefined') return null;

  const help = PROVIDER_HELP[providerId] || { name: option?.name || providerId, helpSteps: [] };
  const fields = keyFieldsForProvider(providerId, option);
  let stepList = help.helpSteps || [];
  try {
    const steps = t.raw(`keysGuideSteps.${providerId}`);
    if (Array.isArray(steps) && steps.length) stepList = steps;
  } catch {
    /* keep helpSteps */
  }

  const canSave = fields.some((f) => String(draft[f.key] || '').trim());

  const handleSave = async () => {
    const payload = {};
    for (const [k, v] of Object.entries(draft)) {
      if (String(v || '').trim()) payload[k] = String(v).trim();
    }
    if (!Object.keys(payload).length) return;
    setSaving(true);
    try {
      await onSave?.(providerId, payload);
      setDraft({});
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--color-primary-200)_55%,transparent)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
          >
            <KeyRound size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900">{t('addKeyTitle', { name: help.name || providerId })}</h3>
            <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{t('addKeySubtitle')}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400" aria-label={t('closePanel')}>
            ✕
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {help.freeTierNote ? <p className="text-[12px] leading-relaxed text-slate-600">{help.freeTierNote}</p> : null}
          {stepList.length ? (
            <ol className="list-decimal space-y-1 ps-4 text-[12px] leading-snug text-slate-700">
              {stepList.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : null}
          {help.getKeyUrl ? (
            <a
              href={help.getKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-primary-700)]"
            >
              {t('keysGuideOpenHow')} <ExternalLink size={12} />
            </a>
          ) : null}

          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {field.label || (field.labelKey && t.has?.(field.labelKey) ? t(field.labelKey) : 'API Key')}
              </p>
              <div className="relative">
                <TextInput
                  className="!rounded-lg !py-2 pe-9 text-xs"
                  type={field.secret && !show[field.key] ? 'password' : 'text'}
                  value={draft[field.key] || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || t('secretPlaceholder')}
                  autoComplete="off"
                />
                {field.secret ? (
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400"
                    onClick={() => setShow((s) => ({ ...s, [field.key]: !s[field.key] }))}
                  >
                    {show[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t('addKeyLater')}
          </button>
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={handleSave}
            className="flex-1 rounded-xl py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
          >
            {saving ? t('autoSaving') : t('saveSecret')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
