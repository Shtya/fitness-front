'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, KeyRound, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PROVIDER_FIT, PROVIDER_HELP, providerNeedsApiKey } from '@/lib/ai-content-studio/studio-ui-meta';

function scoreFor(moduleKey, providerId) {
  const table = PROVIDER_FIT[moduleKey] || PROVIDER_FIT.content;
  return table?.[providerId] || { score: 50, reason: '' };
}

export function ProviderSelect({
  value,
  onChange,
  options = [],
  moduleKey = 'content',
  onHelp,
  placeholder,
}) {
  const t = useTranslations('aiContentStudio');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const ranked = useMemo(() => {
    return [...options]
      .map((p) => ({ ...p, fit: scoreFor(moduleKey, p.id) }))
      .sort((a, b) => (b.fit.score || 0) - (a.fit.score || 0));
  }, [options, moduleKey]);

  const selected = ranked.find((p) => p.id === value) || options.find((p) => p.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-primary-200)_55%,transparent)] bg-white px-2.5 text-start text-[12px] shadow-sm hover:border-[color-mix(in_srgb,var(--color-primary-300)_70%,transparent)]"
      >
        <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">
          {selected?.name || placeholder || t('selectPlaceholder')}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[90] mt-1 max-h-[240px] w-full overflow-auto rounded-xl border border-[color-mix(in_srgb,var(--color-primary-200)_50%,transparent)] bg-white py-1 shadow-xl">
          {ranked.map((p, index) => {
            const active = p.id === value;
            const showKey = providerNeedsApiKey(p);
            return (
              <div key={p.id} className={`flex items-center gap-0.5 px-0.5 ${active ? 'bg-[color-mix(in_srgb,var(--color-primary-50)_85%,white)]' : 'hover:bg-slate-50'}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange?.(p.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-start"
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {active ? <Check size={12} className="text-[var(--color-primary-600)]" /> : null}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[12px] ${active ? 'font-semibold text-[var(--color-primary-800)]' : 'text-slate-800'}`}>
                    {p.name}
                  </span>
                  {index === 0 ? <Star size={10} className="shrink-0 text-amber-500" fill="currentColor" /> : null}
                </button>
                {showKey ? (
                  <button
                    type="button"
                    title={t('keyHelp')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onHelp?.(p.id, PROVIDER_HELP[p.id] || { name: p.name, helpSteps: [] });
                      setOpen(false);
                    }}
                    className="me-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[var(--color-primary-700)]"
                  >
                    <KeyRound size={12} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
