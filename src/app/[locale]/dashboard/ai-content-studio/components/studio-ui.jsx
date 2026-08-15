'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { COST_BADGE } from '@/lib/ai-content-studio/studio-ui-meta';
import { CustomSelect } from './CustomSelect';
import { StudioErrorCard } from './StudioErrorCard';

export function CostBadge({ tier }) {
  const meta = COST_BADGE[tier] || COST_BADGE.UNKNOWN;
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[meta.tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
    </span>
  );
}

export function InfoTip({ text, className = '' }) {
  if (!text) return null;
  return (
    <span className={`group relative z-20 inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-[#6366F1]"
        aria-label={text}
      >
        <Info size={13} strokeWidth={2.2} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute start-0 top-[calc(100%+6px)] z-[80] w-56 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-start text-[11px] font-medium leading-snug text-slate-600 opacity-0 shadow-[0_12px_28px_-12px_rgba(15,23,42,0.35)] transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function FieldLabel({ children, hint, info }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</label>
      <InfoTip text={info} />
      {hint ? <span className="ms-auto">{hint}</span> : null}
    </div>
  );
}

const focusRing =
  'outline-none transition focus:border-[color-mix(in_srgb,var(--color-primary-300)_80%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary-400)_25%,transparent)]';

export function TextInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ${focusRing} ${className}`}
      {...props}
    />
  );
}

export function TextArea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full min-h-[120px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ${focusRing} ${className}`}
      {...props}
    />
  );
}

export function SelectBox({ value, onChange, options, className = '', placeholder }) {
  const t = useTranslations('aiContentStudio');
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder || t('selectPlaceholder')}
      triggerClassName={className}
    />
  );
}

export function TestResultPanel({ result, loading }) {
  const t = useTranslations('aiContentStudio');
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {t('running')}
      </div>
    );
  }
  if (!result) return null;
  const waitingLogin = result.loggedIn === false;
  const success = !waitingLogin && (result.ok === true || (Boolean(result.result) && result.ok !== false));
  if (!success && !waitingLogin) {
    return (
      <div className="space-y-2">
        <StudioErrorCard error={result} />
        {typeof result.result === 'string' && result.result.startsWith('data:image') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.result} alt="" className="mt-2 max-h-64 rounded-lg border border-black/5" />
        ) : null}
      </div>
    );
  }
  return (
    <div
      className={`rounded-xl border px-3 py-3 text-sm ${
        waitingLogin
          ? 'border-amber-200 bg-amber-50/70 text-amber-950'
          : success
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
            : 'border-rose-200 bg-rose-50/70 text-rose-950'
      }`}
    >
      <div className="mb-2 flex flex-wrap gap-2 text-xs font-medium">
        <span>{waitingLogin ? t('fbWindowOpening') : success ? t('status.ready') : t('failed')}</span>
        {result.provider && (
          <span>
            {t('providerLabel')}: {result.provider}
          </span>
        )}
        {result.model && (
          <span>
            {t('model')}: {result.model}
          </span>
        )}
        {result.responseTimeMs != null && <span>{result.responseTimeMs} ms</span>}
        {result.status != null && <span>HTTP {result.status}</span>}
        {result.code && <span>Code: {result.code}</span>}
      </div>
      {result.usage && (
        <div className="mb-2 text-xs opacity-80">Tokens: {result.usage.totalTokens ?? '—'}</div>
      )}
      {result.message && <p className="mb-2 whitespace-pre-wrap">{result.message}</p>}
      {result.suggestedAction && <p className="mb-2 text-xs font-medium">{result.suggestedAction}</p>}
      {typeof result.result === 'string' && result.result.startsWith('data:image') && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={result.result} alt="" className="mt-2 max-h-64 rounded-lg border border-black/5" />
      )}
      {typeof result.result === 'string' && !result.result.startsWith('data:image') && (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-[13px] leading-relaxed" dir="auto">
          {result.result}
        </pre>
      )}
    </div>
  );
}
