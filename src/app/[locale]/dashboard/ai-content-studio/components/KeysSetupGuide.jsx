'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ExternalLink, Eye, EyeOff, Pencil, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  PROVIDER_HELP,
  SETUP_KEY_GUIDES,
  dismissKeysGuide,
  hasPrettyQualityKeys,
  isProviderSecretConfigured,
} from '@/lib/ai-content-studio/studio-ui-meta';

import { STUDIO } from './studio-theme';

const GRADIENT = STUDIO.gradient;
const FOCUS =
  'w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] outline-none transition focus:border-[#6366F1] focus:ring-2 focus:ring-[#E0E7FF]';

function fieldLabel(t, field) {
  if (field?.labelKey) {
    try {
      if (typeof t.has === 'function' && t.has(field.labelKey)) return t(field.labelKey);
      const value = t(field.labelKey);
      if (value && value !== field.labelKey && !/APIKEYFIELD|APITOKENFIELD|BASEURLFIELD/i.test(value)) return value;
    } catch {
      /* fallback */
    }
  }
  return field?.label || 'API Key';
}

function ProviderMark({ id, size = 28 }) {
  const box = {
    width: size,
    height: size,
  };
  const cls = 'flex shrink-0 items-center justify-center rounded-lg text-white';
  if (id === 'gemini') {
    return (
      <span className={cls} style={{ ...box, background: 'linear-gradient(135deg,#4285f4,#9b72cb,#d96570)' }}>
        <Sparkles size={size * 0.48} />
      </span>
    );
  }
  if (id === 'groq') {
    return (
      <span className={`${cls} bg-[#f55036] text-[11px] font-black`} style={box}>
        Gq
      </span>
    );
  }
  if (id === 'huggingface') {
    return (
      <span className={`${cls} bg-[#ffd21e] text-[11px] font-black text-[#111]`} style={box}>
        HF
      </span>
    );
  }
  if (id === 'cloudflare') {
    return (
      <span className={`${cls} bg-[#f6821f] text-[10px] font-black`} style={box}>
        CF
      </span>
    );
  }
  return (
    <span className={`${cls} bg-slate-800 text-[10px] font-bold`} style={box}>
      AI
    </span>
  );
}

function ProviderDropdown({ guides, selectedId, onChange, secretsMeta }) {
  const t = useTranslations('aiContentStudio');
  const [open, setOpen] = useState(false);
  const selected = guides.find((g) => g.id === selectedId) || guides[0];
  const help = PROVIDER_HELP[selected?.id] || { name: selected?.id };

  return (
    <div className="relative">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{t('keysGuideChooseAi')}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-[14px] border border-[#e4e4e7] bg-white px-3 py-2.5 text-start shadow-sm focus:border-[#a65dfc] focus:outline-none focus:ring-2 focus:ring-[#ddd6fe]"
      >
        <ProviderMark id={selected.id} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-[#1a1a1a]">{help.name}</span>
          <span className="block text-[11px] text-[#71717a]">
            {isProviderSecretConfigured(secretsMeta, selected.id)
              ? t('keysGuideSaved')
              : selected.recommended
                ? t('keysGuideRecommended')
                : t('keysGuideOptional')}
          </span>
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute z-[130] mt-1.5 w-full overflow-hidden rounded-[16px] border border-[#e4e4e7] bg-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)]">
          {guides.map((guide) => {
            const itemHelp = PROVIDER_HELP[guide.id] || { name: guide.id };
            const on = selectedId === guide.id;
            const saved = isProviderSecretConfigured(secretsMeta, guide.id);
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => {
                  onChange(guide.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-slate-50 ${on ? 'bg-[#f5f3ff]' : ''}`}
              >
                <ProviderMark id={guide.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[#1a1a1a]">{itemHelp.name}</span>
                  <span className="block text-[10px] font-semibold text-[#71717a]">
                    {saved ? t('keysGuideSaved') : guide.recommended ? t('keysGuideRecommended') : t('keysGuideOptional')}
                  </span>
                </span>
                {on ? <Check size={14} className="text-[#7c5cff]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function GuideKeyForm({ guide, secretsMeta, draft, setDraft, onSave, saving }) {
  const t = useTranslations('aiContentStudio');
  const [show, setShow] = useState({});
  const [editing, setEditing] = useState(false);
  const help = PROVIDER_HELP[guide.id] || { name: guide.id, helpSteps: [] };
  const configured = isProviderSecretConfigured(secretsMeta, guide.id);
  let stepList = help.helpSteps || [];
  try {
    const steps = t.raw(`keysGuideSteps.${guide.id}`);
    if (Array.isArray(steps) && steps.length) stepList = steps;
  } catch {
    /* keep English helpSteps */
  }
  const hasDraft = guide.fields.some((f) => String(draft?.[f.key] || '').trim());
  const showInputs = !configured || editing || hasDraft;

  useEffect(() => {
    setEditing(false);
  }, [guide.id]);

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-[#71717a]">{help.freeTierNote}</p>
      {help.getKeyUrl ? (
        <a
          href={help.getKeyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1]"
        >
          {t('keysGuideOpenHow')} <ExternalLink size={12} />
        </a>
      ) : null}

      {guide.fields.map((field) => {
        const fieldConfigured = isProviderSecretConfigured(secretsMeta, guide.id, field.key);
        const value = draft?.[field.key] || '';
        return (
          <div key={field.key} className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{fieldLabel(t, field)}</p>
            {fieldConfigured && !showInputs ? (
              <div className="flex gap-2">
                <p className="min-w-0 flex-1 truncate rounded-[14px] border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5 font-mono text-[12px] text-emerald-800">
                  {secretsMeta?.[guide.id]?.fields?.[field.key]?.hint || t('secretMasked')}
                </p>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-[14px] border border-[#e4e4e7] bg-white px-3 text-[12px] font-semibold text-[#1a1a1a] hover:bg-slate-50"
                >
                  <Pencil size={12} /> {t('keysGuideEdit')}
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className={`${FOCUS} pe-10`}
                  type={field.secret && !show[field.key] ? 'password' : 'text'}
                  value={value}
                  onChange={(e) => setDraft({ ...(draft || {}), [field.key]: e.target.value })}
                  placeholder={field.placeholder || t('secretPlaceholder')}
                  autoComplete="off"
                />
                {field.secret ? (
                  <button
                    type="button"
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
                    onClick={() => setShow((s) => ({ ...s, [field.key]: !s[field.key] }))}
                  >
                    {show[field.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      {configured && !showInputs ? (
        <p className="text-[11px] text-[#71717a]">{t('keysGuideKeySavedHint')}</p>
      ) : (
        <div className="flex gap-2">
          {configured && showInputs ? (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft({});
              }}
              className="flex-1 rounded-full border border-[#e4e4e7] bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t('addKeyLater')}
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving || !hasDraft}
            onClick={() => onSave(guide.id, draft || {})}
            className="inline-flex flex-1 items-center justify-center rounded-full py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: GRADIENT, boxShadow: '0 10px 22px -12px #7c5cff' }}
          >
            {saving ? t('autoSaving') : t('saveSecret')}
          </button>
        </div>
      )}

      {stepList.length ? (
        <ol className="list-decimal space-y-1 ps-4 text-[11px] leading-snug text-[#71717a]">
          {stepList.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function KeysSetupGuide({ open, onClose, secretsMeta, saveSecret, onContinueWithKeys, onSkipDefaults }) {
  const t = useTranslations('aiContentStudio');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const pretty = hasPrettyQualityKeys(secretsMeta);
  const guides = SETUP_KEY_GUIDES;
  const [selectedId, setSelectedId] = useState(() => {
    const saved = guides.find((g) => isProviderSecretConfigured(secretsMeta, g.id));
    return saved?.id || guides.find((g) => g.recommended)?.id || 'gemini';
  });

  useEffect(() => {
    if (!open) return;
    const saved = guides.find((g) => isProviderSecretConfigured(secretsMeta, g.id));
    if (saved && !isProviderSecretConfigured(secretsMeta, selectedId)) {
      setSelectedId(saved.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, secretsMeta]);

  const selected = useMemo(() => guides.find((g) => g.id === selectedId) || guides[0], [guides, selectedId]);
  const selectedHelp = PROVIDER_HELP[selected?.id] || {};

  if (!open || typeof document === 'undefined') return null;

  const dismiss = (withKeys) => {
    dismissKeysGuide();
    if (withKeys) onContinueWithKeys?.(selectedId);
    else onSkipDefaults?.();
    onClose?.();
  };

  const handleSave = async (providerId, fields) => {
    const payload = {};
    for (const [k, v] of Object.entries(fields || {})) {
      if (String(v || '').trim()) payload[k] = String(v).trim();
    }
    if (!Object.keys(payload).length) return;
    setSavingId(providerId);
    try {
      await saveSecret(providerId, payload);
      setDrafts((p) => ({ ...p, [providerId]: {} }));
      setSelectedId(providerId);
    } finally {
      setSavingId(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0f172a]/35 p-3 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss(false);
      }}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[24px] border border-[#e4e4e7] bg-white shadow-[0_28px_80px_-28px_rgba(15,23,42,0.45)]"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ background: GRADIENT, boxShadow: '0 10px 22px -12px #7c5cff' }}
            >
              <Sparkles size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-bold text-[#1a1a1a]">{t('keysGuideTitle')}</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    pretty ? 'bg-[#dcfce7] text-[#166534]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pretty ? <Sparkles size={10} className="text-[#22c55e]" /> : null}
                  {pretty ? t('prettyModeOn') : t('prettyModeOff')}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#71717a]">{t('keysGuideSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e4e4e7] bg-white text-slate-500 hover:bg-slate-50"
              aria-label={t('closePanel')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 pb-2">
          <ProviderDropdown
            guides={guides}
            selectedId={selectedId}
            onChange={setSelectedId}
            secretsMeta={secretsMeta}
          />
          {selected ? (
            <GuideKeyForm
              key={selected.id}
              guide={selected}
              secretsMeta={secretsMeta}
              draft={drafts[selected.id]}
              setDraft={(next) => setDrafts((p) => ({ ...p, [selected.id]: next }))}
              onSave={handleSave}
              saving={savingId === selected.id}
            />
          ) : null}
        </div>

        <div className="shrink-0 space-y-2 px-5 py-4">
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white"
            style={{ background: GRADIENT, boxShadow: '0 10px 22px -12px #7c5cff' }}
          >
            <Sparkles size={15} /> {t('keysGuideStartWith', { name: selectedHelp.name || selectedId })}
          </button>
          <button
            type="button"
            onClick={() => dismiss(false)}
            className="inline-flex w-full items-center justify-center rounded-full border border-[#e4e4e7] bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t('keysGuideSkip')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
