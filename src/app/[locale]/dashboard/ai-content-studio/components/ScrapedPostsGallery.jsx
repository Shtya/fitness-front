'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Facebook, Instagram, Newspaper, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

const FILTERS = ['all', 'facebook', 'instagram', 'google', 'news'];

function platformOf(hit) {
  const raw = String(hit?.platform || hit?.source || '').toLowerCase();
  if (raw === 'facebook' || /facebook\.com|fb\.com/i.test(hit?.url || '')) return 'facebook';
  if (raw === 'instagram' || /instagram\.com/i.test(hit?.url || '')) return 'instagram';
  if (raw === 'news') return 'news';
  if (raw === 'google') return 'google';
  return 'web';
}

function PlatformIcon({ platform, size = 13 }) {
  if (platform === 'facebook') return <Facebook size={size} />;
  if (platform === 'instagram') return <Instagram size={size} />;
  if (platform === 'news') return <Newspaper size={size} />;
  return <Search size={size} />;
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '•';
}

function ScrapedPostCard({ hit }) {
  const t = useTranslations('aiContentStudio');
  const platform = platformOf(hit);
  const author = hit.author || hit.title || t('scrapedUnknownAuthor');
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
            platform === 'facebook'
              ? 'bg-[#1877F2]'
              : platform === 'instagram'
                ? 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]'
                : platform === 'news'
                  ? 'bg-rose-600'
                  : 'bg-slate-600'
          }`}
        >
          {initials(author)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-900">{author}</p>
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <PlatformIcon platform={platform} size={11} />
            {t(`researchSources.${platform === 'web' ? 'google' : platform}`)}
          </p>
        </div>
      </header>

      {hit.imageUrl && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hit.imageUrl}
          alt=""
          className="max-h-48 w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className={`flex h-24 items-center justify-center px-4 text-center text-[12px] font-semibold ${
            platform === 'facebook'
              ? 'bg-[#e7f0fd] text-[#1877F2]'
              : platform === 'instagram'
                ? 'bg-[#fde8f3] text-[#c13584]'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {hit.title}
        </div>
      )}

      <div className="space-y-2 px-3 py-2.5">
        {hit.title && hit.author && hit.title !== hit.author ? (
          <p className="text-[13px] font-semibold leading-snug text-slate-900" dir="auto">
            {hit.title}
          </p>
        ) : null}
        {hit.snippet ? (
          <p className="line-clamp-4 text-[12px] leading-relaxed text-slate-600" dir="auto">
            {hit.snippet}
          </p>
        ) : null}
        {hit.url ? (
          <a
            href={hit.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary-600)]"
          >
            {t('scrapedOpenPost')} <ExternalLink size={11} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function ScrapedPostsGallery({ hits, message, compact = false }) {
  const t = useTranslations('aiContentStudio');
  const [filter, setFilter] = useState('all');
  const list = Array.isArray(hits) ? hits : [];

  const counts = useMemo(() => {
    const out = { all: list.length, facebook: 0, instagram: 0, google: 0, news: 0 };
    for (const hit of list) {
      const p = platformOf(hit);
      if (out[p] != null) out[p] += 1;
      else if (p === 'web') out.google += 1;
    }
    return out;
  }, [list]);

  const visible = useMemo(() => {
    if (filter === 'all') return list;
    return list.filter((hit) => {
      const p = platformOf(hit);
      if (filter === 'google') return p === 'google' || p === 'web';
      return p === filter;
    });
  }, [list, filter]);

  if (!list.length && !message) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('scrapedPostsTitle')}</p>
          {message ? <p className="mt-0.5 text-[11px] text-slate-600">{message}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {list.length} {t('scrapedPostsCount')}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((id) =>
          counts[id] || id === 'all' ? (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                filter === id
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {id === 'all' ? t('scrapedFilterAll') : t(`researchSources.${id}`)}
              {id !== 'all' ? ` ${counts[id]}` : ''}
            </button>
          ) : null,
        )}
      </div>

      {visible.length ? (
        <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {visible.map((hit, i) => (
            <ScrapedPostCard key={`${hit.url || hit.title}-${i}`} hit={hit} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[12px] text-slate-500">{t('scrapedEmptyFilter')}</p>
      )}
    </div>
  );
}
