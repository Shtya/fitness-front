'use client';

import { CheckCircle2, Circle, Loader2, XCircle, MinusCircle, Sparkles, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { deriveLiveProgress } from '@/lib/ai-content-studio/studio-live-progress';
import { prettyStudioError } from '@/lib/ai-content-studio/studio-error-map';
import { STUDIO } from './studio-theme';

const ITEM_H = 44;
const VIEW_H = 92;
const PEEK = (VIEW_H - ITEM_H) / 2;

function StepIcon({ status, compact }) {
  const size = compact ? 11 : 13;
  if (status === 'active') return <Loader2 size={size} className="animate-spin text-[#4F46E5]" />;
  if (status === 'done') return <CheckCircle2 size={size} className="text-emerald-500" />;
  if (status === 'error') return <XCircle size={size} className="text-rose-500" />;
  if (status === 'skipped') return <MinusCircle size={size} className="text-slate-300" />;
  return <Circle size={size} className="text-slate-300" />;
}

function focusIndex(steps, finished) {
  if (!steps.length) return 0;
  const err = steps.findIndex((s) => s.status === 'error');
  if (err >= 0) return err;
  const active = steps.findIndex((s) => s.status === 'active');
  if (active >= 0) return active;
  if (finished) return steps.length - 1;
  const lastDone = [...steps].map((s, i) => (s.status === 'done' || s.status === 'skipped' ? i : -1)).filter((i) => i >= 0);
  return lastDone.length ? Math.min(lastDone[lastDone.length - 1] + 1, steps.length - 1) : 0;
}

/** Compact sliding progress popup — previous/next steps peek above and below. */
export function RunProgressDock({ open, execution, running, onClose }) {
  const t = useTranslations('aiContentStudio');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const live = running || execution?.status === 'RUNNING';
  const finished = execution?.status === 'COMPLETED' || execution?.status === 'FAILED';
  const progress = deriveLiveProgress(execution, running);

  if (!open && !live) return null;

  const percent = progress.percent || (live ? 4 : 0);
  const steps = progress.steps || [];
  const index = focusIndex(steps, finished);
  const failErr = (execution?.errors || [])[0];
  const prettyFail = finished && execution?.status === 'FAILED' && failErr ? prettyStudioError(failErr, t) : null;

  return (
    <div className="pointer-events-none fixed bottom-5 end-4 z-[90] w-[min(248px,calc(100vw-1.5rem))]">
      <div
        className="pointer-events-auto overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white/95 backdrop-blur-xl"
        style={{ boxShadow: '0 14px 40px -18px rgba(15,23,42,0.42), 0 1px 0 rgba(255,255,255,0.8) inset' }}
      >
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] text-white"
            style={{ background: STUDIO.gradientBr, boxShadow: '0 4px 10px -6px #6366F1' }}
          >
            {live ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          </span>
          <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#111827]">{t('progressTitle')}</p>
          <span className="text-[10px] font-black tabular-nums text-[#4F46E5]">{percent}%</span>
          {onClose && finished ? (
            <button type="button" onClick={onClose} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-50" aria-label="Close">
              <X size={12} />
            </button>
          ) : null}
        </div>

        <div className="h-[2px] w-full bg-slate-100">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%`, background: STUDIO.gradient }}
          />
        </div>

        <div
          className="relative"
          style={{
            height: VIEW_H,
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-2 rounded-[12px]"
            style={{
              top: PEEK,
              height: ITEM_H,
              background: 'linear-gradient(90deg, rgba(99,102,241,0.10), rgba(59,130,246,0.08))',
              boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.16)',
            }}
          />
          <div
            className="relative"
            style={{
              transform: `translateY(${PEEK - index * ITEM_H}px)`,
              transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {steps.map((step, i) => {
              const err = (execution?.errors || []).find((item) => item?.module === step.id);
              const pretty = err && step.status === 'error' ? prettyStudioError(err, t) : null;
              const label = isAr ? step.labelAr || step.label : step.label || step.labelAr;
              const detail = pretty
                ? pretty.title
                : prettyFail && step.status === 'error'
                  ? prettyFail.title
                  : isAr
                    ? step.detailAr || step.detail
                    : step.detail || step.detailAr;
              const focused = i === index;
              const dist = Math.abs(i - index);
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2 px-3"
                  style={{
                    height: ITEM_H,
                    opacity: focused ? 1 : dist === 1 ? 0.42 : 0.18,
                    transform: `scale(${focused ? 1 : 0.92})`,
                    transformOrigin: isAr ? 'right center' : 'left center',
                    transition: 'opacity 320ms ease, transform 320ms ease',
                  }}
                >
                  <span className="shrink-0">
                    <StepIcon status={step.status} compact={!focused} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate leading-none ${
                        focused
                          ? step.status === 'error'
                            ? 'text-[12px] font-bold text-rose-700'
                            : 'text-[12px] font-bold text-[#312E81]'
                          : 'text-[11px] font-semibold text-slate-500'
                      }`}
                    >
                      {label}
                    </p>
                    {focused && detail ? (
                      <p className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-slate-500" dir="auto">
                        {detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
