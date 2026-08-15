'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BellPlus,
  Cloud,
  Coins,
  Play,
  RefreshCw,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { goldApi } from '@/lib/gold-intelligence/gold-api';
import { STUDIO } from '../ai-content-studio/components/studio-theme';

const TABS = ['command', 'history', 'forecast', 'egypt', 'sources', 'models', 'alerts', 'research'];

function GoldLogo({ size = 40 }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center text-white"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: STUDIO.gradientBr,
        boxShadow: STUDIO.shadow3dPrimary,
      }}
    >
      <Coins size={Math.round(size * 0.48)} />
    </span>
  );
}

function StudioButton({ children, onClick, disabled, primary, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-1.5 border px-3.5 text-[12px] font-semibold disabled:opacity-50 ${
        primary ? 'border-transparent text-white' : 'bg-white text-[#111827] hover:bg-slate-50'
      } ${className}`}
      style={
        primary
          ? { background: STUDIO.gradient, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3dPrimary }
          : { borderColor: STUDIO.border, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3d }
      }
    >
      {children}
    </button>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-[20px] bg-white p-4 sm:p-5 ${className}`} style={{ boxShadow: STUDIO.shadowCard }}>
      {children}
    </div>
  );
}

function FreshnessPill({ freshness, t }) {
  const map = {
    LIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DELAYED: 'bg-amber-50 text-amber-800 border-amber-200',
    STALE: 'bg-rose-50 text-rose-700 border-rose-200',
    UNAVAILABLE: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${map[freshness] || map.UNAVAILABLE}`}>
      {t(`freshness.${freshness || 'UNAVAILABLE'}`)}
    </span>
  );
}

function DecisionPill({ code, t }) {
  const tone = String(code || 'WAIT').includes('BUY')
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : code === 'AVOID' || code === 'REDUCE'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[12px] font-black tracking-wide ${tone}`}>
      {t(`decision.${code || 'WAIT'}`)}
    </span>
  );
}

function HealthBar({ label, score, bias }) {
  const value = typeof score === 'number' ? score : null;
  const color = !value ? '#9CA3AF' : value >= 58 ? '#10B981' : value <= 42 ? '#F43F5E' : '#F59E0B';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-500">{label}</span>
        <span className="font-bold text-slate-800">{value == null ? '—' : `${Math.round(value)} · ${bias || ''}`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: color }} />
      </div>
    </div>
  );
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}

function pct(n) {
  if (n === null || n === undefined) return '—';
  const v = Number(n);
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export default function GoldIntelligenceStudio() {
  const t = useTranslations('goldIntelligence');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const [tab, setTab] = useState('command');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [question, setQuestion] = useState('');
  const [research, setResearch] = useState(null);
  const [alertType, setAlertType] = useState('price_above');
  const [alertThreshold, setAlertThreshold] = useState('');

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const [{ data: intel }, settingsRes, alertsRes] = await Promise.all([
        goldApi.intelligence(refresh),
        goldApi.settings().catch(() => ({ data: null })),
        goldApi.alerts().catch(() => ({ data: [] })),
      ]);
      setData(intel);
      setSettings(settingsRes.data);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(false);
  }, [load]);

  const generate = async () => {
    setRunning(true);
    try {
      await goldApi.ingest();
      await load(true);
      toast.success(t('generated'));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || t('generateError'));
    } finally {
      setRunning(false);
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const { data: saved } = await goldApi.saveSettings({
        capitalUsd: Number(form.get('capitalUsd') || 0),
        holdingPeriod: String(form.get('holdingPeriod') || ''),
        riskTolerance: String(form.get('riskTolerance') || 'medium'),
        local21kEgp: form.get('local21kEgp') ? Number(form.get('local21kEgp')) : null,
        local24kEgp: form.get('local24kEgp') ? Number(form.get('local24kEgp')) : null,
        local18kEgp: form.get('local18kEgp') ? Number(form.get('local18kEgp')) : null,
      });
      setSettings(saved);
      toast.success(t('saved'));
      load(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  };

  const addAlert = async () => {
    try {
      await goldApi.createAlert({
        alertType,
        threshold: alertThreshold ? Number(alertThreshold) : undefined,
      });
      const { data: rows } = await goldApi.alerts();
      setAlerts(Array.isArray(rows) ? rows : []);
      toast.success(t('alertSaved'));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    try {
      const { data: res } = await goldApi.research({ question, useLlm: true });
      setResearch(res);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  };

  const price = data?.price;
  const forecast = data?.forecast;
  const decision = data?.decision;
  const chartData = useMemo(
    () =>
      (data?.history || []).map((row) => ({
        t: String(row.t || '').slice(0, 10),
        c: row.c,
      })),
    [data],
  );

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute left-[8%] top-[-80px] h-[380px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, rgba(59,130,246,0.08) 45%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute right-[6%] top-[18%] h-[320px] w-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.14) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute left-0 top-8 h-80 w-72 opacity-[0.32]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.7) 1px, transparent 0)',
          backgroundSize: '18px 18px',
          maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
          WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
        }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.2]" aria-hidden>
        <path d="M-80 70 C 160 -10, 280 190, 560 70 S 980 -40, 1400 90" fill="none" stroke="#C4B5FD" strokeWidth="1.5" />
        <path d="M-40 200 C 220 120, 400 300, 720 160 S 1140 80, 1500 210" fill="none" stroke="#FDE68A" strokeWidth="1.3" />
      </svg>

      <header
        className="relative z-20 mx-5 mt-5 flex min-h-[72px] shrink-0 flex-wrap items-center gap-2 rounded-[20px] bg-white px-5 py-2.5 sm:mx-7 sm:px-6"
        style={{ boxShadow: STUDIO.shadow }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <GoldLogo size={40} />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight text-[#111827]">{t('title')}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] leading-none text-[#6B7280]">
              <Cloud size={11} className="text-[#6366F1]" />
              <span>{t('subtitle')}</span>
              {price ? <FreshnessPill freshness={price.freshness} t={t} /> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StudioButton onClick={() => setTab('egypt')}>
            <Settings size={13} /> {t('tabs.egypt')}
          </StudioButton>
          <StudioButton primary onClick={generate} disabled={running || loading}>
            <Play size={11} fill="currentColor" /> {running ? t('generating') : t('generate')}
          </StudioButton>
          <StudioButton onClick={() => load(false)} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('refresh')}
          </StudioButton>
        </div>
      </header>

      <div className="relative z-10 mx-5 mt-3 flex shrink-0 gap-1 overflow-auto sm:mx-7">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              tab === id ? 'border-transparent text-white' : 'border-[#E5E7EB] bg-white text-[#374151]'
            }`}
            style={
              tab === id
                ? { background: STUDIO.gradient, boxShadow: STUDIO.shadow3dPrimary }
                : { boxShadow: STUDIO.shadow3d }
            }
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
        {data?.demo ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-900">
            {t('demoBanner')}
          </div>
        ) : null}
        {loading && !data ? (
          <div className="flex h-[50vh] items-center justify-center text-slate-500">{t('loading')}</div>
        ) : null}

        {tab === 'command' && data ? (
          <div className="grid gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-8">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('liveGold')}</div>
                  <div className="mt-1 flex items-end gap-3">
                    <div className="text-[34px] font-black leading-none text-[#111827]">
                      {price?.xauUsd ? `$${fmt(price.xauUsd, 2)}` : '—'}
                    </div>
                    <div className={`pb-1 text-sm font-bold ${Number(price?.change?.d1) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {pct(price?.change?.d1)}
                    </div>
                  </div>
                  <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-slate-500">{price?.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    <span>USD/EGP {fmt(data.macro?.usdEgp?.value, 3)}</span>
                    <span>21K {data.egypt ? `${fmt(data.egypt.k21, 1)} EGP/g` : '—'}</span>
                    <span>{t('source')}: {price?.source || '—'}</span>
                  </div>
                </div>
                <div className="text-end">
                  <DecisionPill code={decision?.code} t={t} />
                  <div className="mt-2 text-[11px] text-slate-500">{t('notAdvice')}</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['UP', forecast?.ensembleProbabilityUp],
                  ['DOWN', forecast?.ensembleProbabilityDown],
                  ['NEUTRAL', forecast?.ensembleProbabilityNeutral],
                  ['CONF', forecast?.confidence],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="text-[10px] font-bold tracking-wide text-slate-400">{t(`prob.${k}`)}</div>
                    <div className="text-xl font-black text-slate-900">{v == null ? '—' : k === 'CONF' ? `${v}/100` : `${v}%`}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="xl:col-span-4">
              <div className="mb-3 text-[12px] font-bold text-slate-800">{t('marketHealth')}</div>
              <div className="space-y-3">
                {(decision?.components || []).map((c) => (
                  <HealthBar key={c.key} label={c.label} score={c.available ? c.score : null} bias={c.available ? '' : t('unavailable')} />
                ))}
              </div>
              {decision?.conflict ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {t('conflict')}
                </div>
              ) : null}
            </Card>

            <Card className="xl:col-span-7">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[12px] font-bold text-slate-800">{t('forecasts')}</div>
                <span className="text-[11px] text-slate-400">{data.modelVersion}</span>
              </div>
              <div className="grid gap-2 md:grid-cols-5">
                {(forecast?.horizons || []).map((h) => (
                  <div key={h.timeHorizon} className="rounded-2xl border border-slate-100 p-3">
                    <div className="text-[10px] font-black text-slate-400">{h.timeHorizon}</div>
                    {h.available ? (
                      <>
                        <div className="mt-1 text-sm font-black">{h.direction}</div>
                        <div className="text-[12px] text-slate-600">↑ {h.probabilityUp}% · ↓ {h.probabilityDown}%</div>
                        <div className="text-[11px] text-slate-400">{h.expectedRange ? `${h.expectedRange.from}% → ${h.expectedRange.to}%` : '—'}</div>
                      </>
                    ) : (
                      <p className="mt-2 text-[11px] leading-snug text-slate-500">{h.limitation}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">{forecast?.expectedValueMath}</p>
            </Card>

            <Card className="xl:col-span-5">
              <div className="mb-2 text-[12px] font-bold text-slate-800">{t('why')}</div>
              <p className="text-[13px] leading-relaxed text-slate-700">{isRtl ? data.why?.ar : data.why?.en}</p>
              <div className="mt-3 text-[12px] font-bold text-slate-800">{t('couldFall')}</div>
              <ul className="mt-1 list-disc space-y-1 ps-4 text-[12px] text-slate-600">
                {(data.risks?.bearishCatalysts || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>

            <Card className="xl:col-span-12">
              <div className="mb-3 text-[12px] font-bold text-slate-800">{t('levels')}</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3 text-[12px]">
                  <div className="text-slate-400">{t('support')}</div>
                  <div className="text-lg font-black">${fmt(data.technical?.nearestSupport?.price, 0)}</div>
                  <div>{t('strength')} {fmt(data.technical?.nearestSupport?.strength, 0)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-[12px]">
                  <div className="text-slate-400">{t('resistance')}</div>
                  <div className="text-lg font-black">${fmt(data.technical?.nearestResistance?.price, 0)}</div>
                  <div>{t('strength')} {fmt(data.technical?.nearestResistance?.strength, 0)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-[12px]">
                  <div className="text-slate-400">{t('entry')}</div>
                  <div className="font-bold">
                    {data.decision?.entry?.preferred
                      ? `$${fmt(data.decision.entry.preferred[0], 0)}–$${fmt(data.decision.entry.preferred[1], 0)}`
                      : '—'}
                  </div>
                  <div className="text-slate-500">{decision?.reasonAr && isRtl ? decision.reasonAr : decision?.reason}</div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {tab === 'history' && data ? (
          <Card>
            <div className="mb-3 text-[12px] font-bold">{t('historyTitle')}</div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="c" stroke="#4F46E5" fill="url(#goldFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {t('historyNote')} · {data.technical?.closeOnly ? t('closeOnly') : t('ohlc')}
            </p>
          </Card>
        ) : null}

        {tab === 'forecast' && data ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="text-[12px] font-bold">{t('scenarios')}</div>
              {['h24', 'd7'].map((key) => (
                <div key={key} className="mt-3 rounded-2xl border border-slate-100 p-3 text-[12px]">
                  <div className="font-black text-slate-400">{key === 'h24' ? '24H' : '7D'}</div>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {['bear', 'base', 'bull'].map((k) => (
                      <div key={k}>
                        <div className="text-slate-400">{t(`case.${k}`)}</div>
                        <div className="font-black">${fmt(data.scenarios?.[key]?.[k], 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <div className="text-[12px] font-bold">{t('similar')}</div>
              <p className="mt-2 text-[13px] text-slate-700">{data.forecast?.similar?.note}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div>n={data.forecast?.similar?.sampleSize}</div>
                <div>↑ {fmt((data.forecast?.similar?.probabilityUp || 0) * 100, 0)}%</div>
                <div>{t('avg')} {fmt(data.forecast?.similar?.averageReturn, 2)}%</div>
                <div>{t('worst')} {fmt(data.forecast?.similar?.worst, 2)}%</div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">{data.forecast?.ml?.note}</p>
            </Card>
          </div>
        ) : null}

        {tab === 'egypt' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="text-[12px] font-bold">{t('egyptTitle')}</div>
              <p className="mt-1 text-[12px] text-slate-500">{data?.egypt?.formula}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                {['k24', 'k21', 'k18', 'k14'].map((k) => (
                  <div key={k} className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-slate-400">{k.toUpperCase()}</div>
                    <div className="text-lg font-black">{data?.egypt ? `${fmt(data.egypt[k], 1)} EGP/g` : '—'}</div>
                    <div className="text-slate-500">{t('premium')} {fmt(data?.egypt?.premium?.[k], 2)}%</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <form onSubmit={saveSettings} className="space-y-3">
                <div className="text-[12px] font-bold">{t('personal')}</div>
                {[
                  ['capitalUsd', settings?.capitalUsd],
                  ['holdingPeriod', settings?.holdingPeriod],
                  ['local21kEgp', settings?.local21kEgp],
                  ['local24kEgp', settings?.local24kEgp],
                  ['local18kEgp', settings?.local18kEgp],
                ].map(([name, value]) => (
                  <label key={name} className="block text-[11px] font-semibold text-slate-500">
                    {t(`fields.${name}`)}
                    <input
                      name={name}
                      defaultValue={value ?? ''}
                      className="mt-1 w-full rounded-[14px] border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#E0E7FF]"
                    />
                  </label>
                ))}
                <label className="block text-[11px] font-semibold text-slate-500">
                  {t('fields.riskTolerance')}
                  <select
                    name="riskTolerance"
                    defaultValue={settings?.riskTolerance || 'medium'}
                    className="mt-1 w-full rounded-[14px] border border-[#E5E7EB] px-3 py-2 text-sm"
                  >
                    <option value="low">{t('risk.low')}</option>
                    <option value="medium">{t('risk.medium')}</option>
                    <option value="high">{t('risk.high')}</option>
                  </select>
                </label>
                <StudioButton primary type="submit">{t('save')}</StudioButton>
                <p className="text-[11px] text-slate-500">{data?.personal?.note || t('notAdvice')}</p>
              </form>
            </Card>
          </div>
        )}

        {tab === 'sources' && data ? (
          <Card>
            <div className="mb-3 text-[12px] font-bold">{t('sourcesTitle')}</div>
            <div className="overflow-auto">
              <table className="min-w-full text-start text-[12px]">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-2">{t('table.name')}</th>
                    <th className="p-2">{t('table.status')}</th>
                    <th className="p-2">{t('table.cadence')}</th>
                    <th className="p-2">{t('table.updated')}</th>
                    <th className="p-2">{t('table.quality')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data_quality?.sources || []).map((s) => (
                    <tr key={s.sourceName} className="border-t border-slate-100">
                      <td className="p-2 font-semibold">
                        {s.sourceName}
                        <div className="font-normal text-slate-400">{isRtl ? s.notesAr : s.notes}</div>
                      </td>
                      <td className="p-2">{s.status}</td>
                      <td className="p-2">{s.cadence}</td>
                      <td className="p-2">{s.lastDataTimestamp ? new Date(s.lastDataTimestamp).toLocaleString() : '—'}</td>
                      <td className="p-2">{fmt(s.dataQualityScore, 0)} {s.lastError ? `· ${s.lastError}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {tab === 'models' && data ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="text-[12px] font-bold">{t('modelHealth')}</div>
              <p className="mt-2 text-[13px] text-slate-600">{data.performance?.note}</p>
              <pre className="mt-3 overflow-auto rounded-2xl bg-slate-50 p-3 text-[11px]">{JSON.stringify(data.performance, null, 2)}</pre>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-[12px] font-bold">
                <ShieldAlert size={14} /> {t('limitations')}
              </div>
              <ul className="mt-2 list-disc space-y-1 ps-4 text-[12px] text-slate-600">
                {(data.data_quality?.limitations || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {(data.phase?.blockedWithoutLicense || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null}

        {tab === 'alerts' ? (
          <Card>
            <div className="mb-3 text-[12px] font-bold">{t('alertsTitle')}</div>
            <div className="mb-4 flex flex-wrap gap-2">
              <select value={alertType} onChange={(e) => setAlertType(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
                <option value="price_above">price_above</option>
                <option value="price_below">price_below</option>
                <option value="prob_up">prob_up</option>
                <option value="shock">shock</option>
              </select>
              <input value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)} placeholder="threshold" className="rounded-xl border px-3 py-2 text-sm" />
              <StudioButton primary onClick={addAlert}><BellPlus size={13} /> {t('addAlert')}</StudioButton>
            </div>
            <div className="space-y-2 text-[12px]">
              {alerts.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-100 p-3">
                  {a.alertType} {a.threshold ?? ''} · {a.lastMessage || t('neverFired')}
                </div>
              ))}
              {!alerts.length ? <div className="text-slate-400">{t('noAlerts')}</div> : null}
            </div>
          </Card>
        ) : null}

        {tab === 'research' ? (
          <Card>
            <div className="text-[12px] font-bold">{t('researchTitle')}</div>
            <p className="mt-1 text-[12px] text-slate-500">{t('researchHint')}</p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-[#6366F1]"
              placeholder={t('researchPlaceholder')}
            />
            <div className="mt-2">
              <StudioButton primary onClick={ask}>{t('ask')}</StudioButton>
            </div>
            {research ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700">
                <div className="mb-2 text-[11px] font-bold uppercase text-slate-400">{research.mode}</div>
                {research.answer}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
