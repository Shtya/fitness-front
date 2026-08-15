'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { StudioErrorCard } from './StudioErrorCard';

export function getNodeOutput(nodeId, execution, tests = {}) {
  if (!execution && !tests) return null;
  const err = execution?.errors?.find((e) => e.module === nodeId);

  if (nodeId === 'topic') {
    const text = execution?.topic || tests?.topic?.result;
    if (err && !text) return { type: 'error', error: err };
    if (text) {
      return {
        type: 'text',
        text,
        provider: execution?.providers?.topic || tests?.topic?.provider,
        model: execution?.models?.topic || tests?.topic?.model,
        error: err,
      };
    }
  }
  if (nodeId === 'content') {
    const text = execution?.content || tests?.content?.result;
    if (err && !text) return { type: 'error', error: err };
    if (text) {
      return {
        type: 'text',
        text,
        provider: execution?.providers?.content || tests?.content?.provider,
        model: execution?.models?.content || tests?.content?.model,
        error: err,
      };
    }
  }
  if (nodeId === 'image') {
    const url = execution?.imageUrl || tests?.image?.result || tests?.comfyui?.result;
    if (err && !url) return { type: 'error', error: err };
    if (url) {
      return {
        type: 'image',
        url,
        provider:
          execution?.providers?.image || tests?.image?.provider || tests?.comfyui?.provider,
        model: execution?.models?.image || tests?.image?.model || tests?.comfyui?.model,
        error: err,
      };
    }
  }
  if (nodeId === 'design') {
    const url = execution?.finalImageUrl || execution?.imageUrl;
    if (err && !url) return { type: 'error', error: err };
    if (url) {
      return {
        type: 'image',
        url,
        headline: execution?.headline,
        provider: execution?.providers?.image,
        model: execution?.models?.image,
        error: err,
      };
    }
  }
  if (nodeId === 'facebook') {
    if (execution?.facebookStatus === 'published') {
      return { type: 'publish', status: 'published', id: execution.facebookPostId };
    }
    if (err || execution?.facebookStatus === 'failed') {
      return { type: 'error', error: err || { module: 'facebook', message: 'Facebook publish failed' } };
    }
  }
  if (nodeId === 'instagram') {
    if (execution?.instagramStatus === 'published') {
      return { type: 'publish', status: 'published', id: execution.instagramMediaId };
    }
    if (err || execution?.instagramStatus === 'failed') {
      return { type: 'error', error: err || { module: 'instagram', message: 'Instagram publish failed' } };
    }
  }
  if (nodeId === 'schedule' && execution?.trigger) {
    return { type: 'meta', text: execution.trigger };
  }
  return null;
}

export function NodeResultModal({ open, onClose, nodeLabel, output, logs }) {
  const t = useTranslations('aiContentStudio');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const copyText = async () => {
    const text = output?.text || output?.error?.message || '';
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t('copied'));
    setTimeout(() => setCopied(false), 1200);
  };

  const downloadImage = () => {
    if (!output?.url) return;
    const a = document.createElement('a');
    a.href = output.url;
    a.download = `so7ba-${nodeLabel?.toLowerCase() || 'image'}-${Date.now()}.png`;
    a.click();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />
      <div
        className="relative z-10 flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--color-primary-200)_40%,white)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-500)]">{t('nodeOutput')}</p>
            <h3 className="text-base font-bold text-slate-900">{nodeLabel}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {output?.type === 'text' && (
              <button type="button" onClick={copyText} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t('copied') : t('copy')}
              </button>
            )}
            {output?.type === 'image' && (
              <button
                type="button"
                onClick={downloadImage}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
              >
                <Download size={13} /> {t('download')}
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {output?.type === 'error' && (
            <StudioErrorCard error={output.error} />
          )}

          {output?.type === 'text' && (
            <div className="space-y-2">
              {(output.provider || output.model) && (
                <p className="text-xs text-slate-500">
                  {output.provider}
                  {output.model ? ` · ${output.model}` : ''}
                </p>
              )}
              <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-800" dir="auto">
                {output.text}
              </pre>
            </div>
          )}

          {output?.type === 'image' && (
            <div className="space-y-2">
              {(output.provider || output.model) && (
                <p className="text-xs text-slate-500">
                  {output.provider}
                  {output.model ? ` · ${output.model}` : ''}
                </p>
              )}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={output.url} alt={nodeLabel} className="mx-auto max-h-[55vh] w-auto" />
                {output.headline && (
                  <p className="border-t border-white/10 px-4 py-3 text-center text-sm text-white/90" dir="auto">
                    {output.headline}
                  </p>
                )}
              </div>
            </div>
          )}

          {output?.type === 'publish' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              {t('publishedOk')}
              {output.id && <div className="mt-1 font-mono text-xs opacity-80">ID: {output.id}</div>}
            </div>
          )}

          {output?.type === 'meta' && (
            <p className="text-sm text-slate-600">
              {t('triggerLabel')}: {output.text}
            </p>
          )}

          {logs?.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('logs')}</p>
              <div className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
                {logs.map((l, i) => (
                  <div key={i} className={l.level === 'error' ? 'text-rose-600' : l.level === 'warn' ? 'text-amber-700' : ''}>
                    {l.message || `${l.module || ''} ${l.provider || ''} ${l.responseTimeMs ? `${l.responseTimeMs}ms` : ''}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useNodeLogs(execution, nodeId) {
  return useMemo(() => {
    if (!execution?.logs) return [];
    return execution.logs.filter((l) => !l.module || l.module === nodeId || String(l.message || '').includes(nodeId));
  }, [execution, nodeId]);
}

export function RunningPulse() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary-400)] opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-primary-500)]" />
    </span>
  );
}

export function NodeBusyOverlay({ show }) {
  const t = useTranslations('aiContentStudio');
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[22px] bg-white/55 backdrop-blur-[1px]">
      <div
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
      >
        <Loader2 size={13} className="animate-spin" /> {t('runningOverlay')}
      </div>
    </div>
  );
}
