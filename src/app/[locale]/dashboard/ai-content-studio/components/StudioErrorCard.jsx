'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { prettyStudioError, remainingRetrySeconds } from '@/lib/ai-content-studio/studio-error-map';

function useRetryCountdown(error) {
  const [left, setLeft] = useState(() => remainingRetrySeconds(error));
  useEffect(() => {
    setLeft(remainingRetrySeconds(error));
    const id = setInterval(() => setLeft(remainingRetrySeconds(error)), 400);
    return () => clearInterval(id);
  }, [error?.at, error?.retryAfterSeconds, error?.message, error?.kind]);
  return left;
}

export function StudioErrorCard({ error, onRetry, retrying, compact = false }) {
  const t = useTranslations('aiContentStudio');
  const pretty = prettyStudioError(error, t);
  const left = useRetryCountdown(error);
  const waiting =
    (pretty.kind === 'IMAGE_QUOTA_WAIT' || pretty.kind === 'TEXT_QUOTA') && left > 0;
  const retryLabel = waiting ? t('clientErrors.retryIn', { seconds: left }) : t('retry');

  return (
    <div
      className={`overflow-hidden border border-rose-200 bg-white text-slate-800 ${
        compact ? 'rounded-2xl' : 'rounded-[18px]'
      }`}
      style={{ boxShadow: '0 10px 24px -16px rgba(225, 29, 72, 0.35)' }}
    >
      <div className={`flex gap-3 ${compact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`}>
        <span
          className={`mt-0.5 flex shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ${
            compact ? 'h-8 w-8' : 'h-10 w-10'
          }`}
        >
          {waiting ? <Clock size={compact ? 15 : 18} /> : <AlertTriangle size={compact ? 15 : 18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-bold leading-snug text-rose-900 ${compact ? 'text-[13px]' : 'text-[14px]'}`}>
            {pretty.title}
          </p>
          <p className={`mt-1 leading-relaxed text-slate-600 ${compact ? 'text-[12px]' : 'text-[13px]'}`} dir="auto">
            {pretty.body}
          </p>
          {pretty.action ? (
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500" dir="auto">
              {pretty.action}
            </p>
          ) : null}
          {waiting ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rose-100">
              <div
                className="h-full rounded-full bg-rose-400 transition-all duration-500"
                style={{
                  width: `${Math.max(6, 100 - (left / Math.max(pretty.seconds, 1)) * 100)}%`,
                }}
              />
            </div>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              disabled={retrying || waiting}
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
