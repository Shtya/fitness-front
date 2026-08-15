'use client';

import { useMemo } from 'react';
import { CheckCircle2, Clock, ExternalLink, KeyRound, Loader2, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { STUDIO } from './studio-theme';

const STUDIO_ROLES = new Set(['topic', 'content', 'image', 'imageFallback']);

function healthTone(health) {
  if (health === 'available') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (health === 'listed') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (health === 'exhausted') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (health === 'not_in_plan') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (health === 'invalid') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function statusTone(status) {
  if (status === 'valid') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (status === 'limited' || status === 'exhausted') return 'text-amber-800 bg-amber-50 border-amber-200';
  if (status === 'invalid' || status === 'error') return 'text-rose-700 bg-rose-50 border-rose-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

export function KeyInspectCard({ report, loading, onRefresh }) {
  const t = useTranslations('aiContentStudio');
  const models = Array.isArray(report?.models) ? report.models : [];
  const studioModels = models.filter((m) => STUDIO_ROLES.has(m.role));
  const extraCount = models.length - studioModels.length;
  const extraOpen = extraCount > 0;
  const usage = report?.usage || {};
  const docs = report?.docs || {};

  const remaining = useMemo(
    () => studioModels.filter((m) => m.health === 'available' || m.health === 'listed'),
    [studioModels],
  );
  const spent = useMemo(
    () => studioModels.filter((m) => m.health === 'exhausted' || m.health === 'not_in_plan'),
    [studioModels],
  );

  if (loading && !report) {
    return (
      <div className="rounded-[18px] border border-[#E5E7EB] bg-white px-4 py-6 text-center text-[12px] text-slate-500" style={{ boxShadow: STUDIO.shadowCard }}>
        <Loader2 size={16} className="mx-auto mb-2 animate-spin text-[#6366F1]" />
        {t('keyInspectLoading')}
      </div>
    );
  }

  if (!report || report.status === 'missing') {
    return (
      <div className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-[12px] text-slate-500">
        {t('keyInspectMissing')}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white" style={{ boxShadow: STUDIO.shadowCard }}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: STUDIO.gradientBr }}>
          <KeyRound size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[14px] font-bold text-[#111827]">{t(`keyInspectProvider.${report.provider}`)}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(report.status)}`}>
              {t(`keyInspectStatus.${report.status}`)}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500">{report.hint || report.fingerprint || t('secretMasked')}</p>
        </div>
        <button
          type="button"
          onClick={() => onRefresh?.()}
          className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {t('keyInspectRefresh')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[#F3F4F6] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('keyInspectPlan')}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-slate-800">
            {report.plan?.id ? t(`keyInspectPlanId.${report.plan.id}`) : report.plan?.label || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('keyInspectExpiry')}</p>
          <p className="mt-0.5 flex items-start gap-1 text-[12px] font-semibold text-slate-800">
            {report.expires?.kind === 'expired' ? <ShieldAlert size={13} className="mt-0.5 text-rose-500" /> : <Clock size={13} className="mt-0.5 text-slate-400" />}
            <span>
              {report.expires?.kind === 'dated' || report.expires?.kind === 'expired'
                ? report.expires.label
                : t(`keyInspectExpiryKind.${report.expires?.kind || 'none'}`)}
            </span>
          </p>
        </div>
      </div>
      {report.provider === 'gemini' ? (
        <p className="px-4 pb-2 text-[11px] leading-snug text-slate-500">{t('keyInspectExpiryHint')}</p>
      ) : null}

      <div className="border-t border-[#F3F4F6] px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('keyInspectModels')}</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            {t('keyInspectRemainingCount', { count: remaining.length })}
          </span>
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            {t('keyInspectSpentCount', { count: spent.length })}
          </span>
        </div>
        <ul className="space-y-1.5">
          {(studioModels.length ? studioModels : models.slice(0, 6)).map((model) => (
            <li key={model.id} className="flex items-start justify-between gap-2 rounded-xl border border-[#F3F4F6] px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-800">{model.label || model.id}</p>
                <p className="text-[10px] text-slate-400">{model.id}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${healthTone(model.health)}`}>
                {t(`keyInspectHealth.${model.health}`)}
              </span>
            </li>
          ))}
        </ul>
        {extraOpen ? (
          <p className="mt-2 text-[11px] text-slate-500">{t('keyInspectExtraModels', { count: extraCount })}</p>
        ) : null}
      </div>

      {usage && report.provider === 'gemini' ? (
        <div className="border-t border-[#F3F4F6] px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('keyInspectUsage')}</p>
          <div className="grid grid-cols-3 gap-2">
            <UsageStat label={t('keyInspectRuns')} value={usage.runs || 0} />
            <UsageStat label={t('keyInspectText')} value={usage.textRequests || 0} />
            <UsageStat label={t('keyInspectImages')} value={usage.imageRequests || 0} />
          </div>
          {usage.tokens ? (
            <p className="mt-2 text-[11px] text-slate-500">{t('keyInspectTokens', { count: usage.tokens })}</p>
          ) : null}
          {usage.lastQuotaError ? (
            <p className="mt-2 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
              {t('keyInspectLastQuota')}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] leading-snug text-slate-500">{t('keyInspectUsageNote')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {docs.rateLimits ? (
              <a href={docs.rateLimits} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4F46E5]">
                {t('keyInspectGoogleLimits')} <ExternalLink size={11} />
              </a>
            ) : null}
            {docs.usage ? (
              <a href={docs.usage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4F46E5]">
                {t('keyInspectGoogleUsage')} <ExternalLink size={11} />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {report.status === 'valid' || report.status === 'limited' ? (
        <div className="flex items-center gap-1.5 border-t border-[#ECFDF5] bg-[#ECFDF5] px-4 py-2 text-[11px] font-semibold text-[#047857]">
          <CheckCircle2 size={13} /> {t('keyInspectSavedOk')}
        </div>
      ) : report.status === 'invalid' ? (
        <div className="flex items-center gap-1.5 border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] font-semibold text-rose-700">
          <ShieldAlert size={13} /> {t('keyInspectInvalid')}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border-t border-[#EEF2FF] bg-[#EEF2FF] px-4 py-2 text-[11px] font-semibold text-[#4338CA]">
          <Sparkles size={13} /> {t('keyInspectChecking')}
        </div>
      )}
    </div>
  );
}

function UsageStat({ label, value }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-2 py-2 text-center">
      <p className="text-[16px] font-black tabular-nums text-[#111827]">{value}</p>
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}
