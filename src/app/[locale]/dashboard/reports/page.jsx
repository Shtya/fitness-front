'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Filter, RefreshCw, ChevronLeft, ChevronRight, Eye, CheckCircle2, XCircle, User2, CalendarDays, HeartPulse, Activity, ClipboardList } from 'lucide-react';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
// ⬇️ change this to the correct import where you saved the provided Modal component
import { Modal } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import Select from '@/components/atoms/Select';

/* ----------------------------- Small UI helpers ----------------------------- */
const Button = ({ children, className = '', onClick, type = 'button', disabled, color = 'primary' }) => {
  const base = 'inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold shadow-sm transition active:scale-[.98]';
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50',
    neutral: 'bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-50',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={[base, styles[color] || styles.primary, className].join(' ')}>
      {children}
    </button>
  );
};

const StatPill = ({ icon: Icon, label, value }) => (
  <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2'>
    <Icon className='w-4 h-4 text-indigo-600' />
    <div className='text-xs text-slate-500'>{label}</div>
    <div className='text-xs font-semibold text-slate-900'>• {value}</div>
  </div>
);

/* --------------------------------- API calls -------------------------------- */
async function fetchReports({ page = 1, limit = 12, userId = '' }) {
  const params = { page, limit };
  if (userId) params.userId = userId;
  const { data } = await api.get('/weekly-reports', { params });
  // shape: { items, total, page, limit, hasMore }
  return data;
}
async function fetchReportById(id) {
  const { data } = await api.get(`/weekly-reports/${id}`);
  return data;
}
async function saveCoachFeedback(id, payload) {
  const { data } = await api.put(`/weekly-reports/${id}/feedback`, payload);
  return data;
}

/* ---------------------------------- Page ---------------------------------- */
export default function CoachReportsPage() {
  const t = useTranslations();

  // pagination & filters
  const [page, setPage] = useState(1);
  const limit = 12;
  const [athleteFilter, setAthleteFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // data
  const [reports, setReports] = useState([]); // list
  const [total, setTotal] = useState(0);

  // unique athletes for filter (built from page results or later you can load a dedicated list)
  const athleteOptions = useMemo(() => {
    const map = new Map();
    reports.forEach(r => {
      const u = r?.user;
      if (u?.id && !map.has(u.id)) map.set(u.id, { id: u.id, name: u.name || u.email || u.id });
    });
    return [{ id: '', name: t('coachReports.allAthletes') }, ...Array.from(map.values())];
  }, [reports, t]);

  // modal / detail
  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [savedOk, setSavedOk] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    try {
      setErr('');
      setLoading(true);
      const res = await fetchReports({ page, limit, userId: athleteFilter });
      setReports(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      setErr(t('coachReports.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, athleteFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => load();

  const openDetail = async id => {
    try {
      setActiveId(id);
      setDetailLoading(true);
      setOpen(true);
      const data = await fetchReportById(id);
      setActive(data || null);
      setFeedbackDraft(data?.coachFeedback || '');
    } catch (e) {
      setActive(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setOpen(false);
    setActiveId(null);
    setActive(null);
    setFeedbackDraft('');
    setSaveErr('');
    setSavedOk(false);
  };

  const handleSaveFeedback = async (opts = {}) => {
    if (!activeId) return;
    try {
      setSaving(true);
      setSaveErr('');
      const payload = {
        coachFeedback: typeof opts.feedback === 'string' ? opts.feedback : feedbackDraft,
        isRead: typeof opts.isRead === 'boolean' ? opts.isRead : active?.isRead || false,
      };
      if (!payload.coachFeedback?.trim() && opts?.forceRequire) {
        setSaveErr(t('coachReports.errors.feedbackEmpty'));
        setSaving(false);
        return;
      }
      const saved = await saveCoachFeedback(activeId, payload);
      setActive(saved);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
      // refresh list to reflect reviewed state
      refresh();
    } catch (e) {
      setSaveErr(t('coachReports.errors.save'));
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- Cards / list UI ---------------------------- */
  const Card = ({ r }) => {
    const u = r?.user || {};
    const m = r?.measurements || {};
    const tr = r?.training || {};
    const statusReviewed = !!r?.reviewedAt;

    const weightTxt = m?.weight != null ? `${m.weight}` : '—';
    const cardioTxt = tr?.cardioAdherence != null ? `${tr.cardioAdherence}` : '—';

    return (
      <div className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow transition'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <div className='h-9 w-9 grid place-content-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100'>
              <User2 className='w-4 h-4' />
            </div>
            <div>
              <div className='text-sm font-semibold text-slate-900'>{u?.name || u?.email || t('coachReports.athlete')}</div>
              <div className='text-xs text-slate-500 flex items-center gap-1'>
                <CalendarDays className='w-3.5 h-3.5' />
                <span>
                  {t('coachReports.columns.weekOf')}: {r?.weekOf}
                </span>
              </div>
            </div>
          </div>
          <div className='text-xs'>
            {statusReviewed ? (
              <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200'>
                <CheckCircle2 className='w-3.5 h-3.5' />
                {t('coachReports.reviewed')}
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-200'>
                <XCircle className='w-3.5 h-3.5' />
                {t('coachReports.awaitingReview')}
              </span>
            )}
          </div>
        </div>

        <div className='mt-3 grid grid-cols-2 gap-2'>
          <StatPill icon={HeartPulse} label={t('coachReports.card.summary').split('•')[0].replace('{weight}', '') || 'Weight'} value={`${weightTxt} كجم`} />
          <StatPill icon={Activity} label={t('coachReports.card.summary').split('•')[1]?.split('/')[0].replace('{cardio}', '')} value={`${cardioTxt} / 5`} />
        </div>

        <div className='mt-3 flex items-center justify-between'>
          <div className='text-[11px] text-slate-500'>{t('coachReports.total', { count: total })}</div>
          <Button onClick={() => openDetail(r.id)} className='!px-3 !py-1.5'>
            <Eye className='w-4 h-4 mr-1' />
            {t('coachReports.view')}
          </Button>
        </div>
      </div>
    );
  };

  /* --------------------------------- Render --------------------------------- */
  return (
    <div className='mx-auto max-w-6xl px-3 sm:px-5 py-5 space-y-5'>
      <GradientStatsHeader
        className='rounded-2xl'
        title={t('coachReports.title')}
        desc={t('coachReports.subtitle')}
        btnName={t('coachReports.buttons.refresh')}
        onClick={refresh}
        hiddenStats={true} // set to false if you pass KPI children
        loadingStats={false} // or your loading state if you show KPIs
      >
        {/* 
      Optional KPI cards go here later, e.g.:
      <StatCard icon={...} title={t('coachReports.kpis.totalReports')} value={stats.total} />
    */}
      </GradientStatsHeader>

      {/* Filters */}
      <div className='mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col md:flex-row md:items-end gap-2'>
          <Select
            label={t('coachReports.athlete')}
            onChange={e => {
              setAthleteFilter(e.target.value);
              setPage(1);
            }}
            options={athleteOptions.map(opt => {
              return { id: opt.id, label: opt.name };
            })}
            value={athleteFilter}
          />

          <div className='flex gap-2'>
            <Button color='neutral' onClick={refresh}>
              <RefreshCw className='w-4 h-4 mr-1' />
              {t('coachReports.buttons.refresh')}
            </Button>

            <Button
              color='ghost'
              onClick={() => {
                setAthleteFilter('');
                setPage(1);
              }}>
              <Filter className='w-4 h-4 mr-1' />
              {t('coachReports.clearFilters')}
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className='rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm'>
        {loading ? (
          <div className='h-40 grid place-content-center text-slate-600'>
            <Loader2 className='w-5 h-5 animate-spin mx-auto mb-2' />
            <div className='text-sm'>{t('coachReports.loading')}</div>
          </div>
        ) : err ? (
          <div className='h-40 grid place-content-center text-rose-700 text-sm'>{err}</div>
        ) : reports.length === 0 ? (
          <div className='h-40 grid place-content-center text-slate-600 text-sm'>{t('coachReports.empty')}</div>
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
              {reports.map(r => (
                <Card key={r.id} r={r} />
              ))}
            </div>

            {/* Pagination */}
            <div className='mt-4 flex items-center justify-between'>
              <div className='text-xs text-slate-500'>{t('coachReports.pageOf', { page, pages: totalPages })}</div>
              <div className='flex items-center gap-2'>
                <Button color='neutral' disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronRight className='w-4 h-4 ltr:hidden' />
                  <ChevronLeft className='w-4 h-4 rtl:hidden' />
                  {t('coachReports.prev')}
                </Button>
                <Button color='neutral' disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  {t('coachReports.next')}
                  <ChevronLeft className='w-4 h-4 ltr:hidden' />
                  <ChevronRight className='w-4 h-4 rtl:hidden' />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={open} onClose={closeDetail} title={t('coachReports.detail.title')} maxW='max-w-5xl' maxH='max-h-[86vh]' maxHBody='max-h-[70vh]'>
        {detailLoading ? (
          <div className='h-48 grid place-content-center text-slate-600'>
            <Loader2 className='w-5 h-5 animate-spin mx-auto mb-2' />
            <div className='text-sm'>{t('coachReports.detail.loading')}</div>
          </div>
        ) : !active ? (
          <div className='text-sm text-slate-600'>{t('coachReports.empty')}</div>
        ) : (
          <div className='space-y-4'>
            {/* Header info */}
            <div className='rounded-xl border border-slate-200 bg-white p-3'>
              <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
                <div className='flex items-center gap-3'>
                  <div className='h-10 w-10 grid place-content-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100'>
                    <User2 className='w-5 h-5' />
                  </div>
                  <div>
                    <div className='text-sm font-semibold text-slate-900'>{active?.user?.name || active?.user?.email}</div>
                    <div className='text-xs text-slate-500 flex items-center gap-1'>
                      <CalendarDays className='w-3.5 h-3.5' />
                      <span>
                        {t('coachReports.columns.weekOf')}: {active?.weekOf}
                      </span>
                    </div>
                  </div>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  {active?.reviewedAt ? (
                    <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200 text-xs'>
                      <CheckCircle2 className='w-3.5 h-3.5' />
                      {t('coachReports.reviewed')}
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-200 text-xs'>
                      <XCircle className='w-3.5 h-3.5' />
                      {t('coachReports.awaitingReview')}
                    </span>
                  )}
                  {active?.reviewedBy && (
                    <span className='text-xs text-slate-600'>
                      {t('coachReports.detail.reviewedBy')}: {t('coachReports.detail.you')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className='rounded-xl border border-slate-200 bg-white p-3'>
              <div className='font-semibold text-slate-900 text-sm mb-2'>{t('coachReports.detail.photos')}</div>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                {['front', 'back', 'left', 'right'].map(side => {
                  const url = active?.photos?.[side]?.url;
                  return (
                    <div key={side} className='rounded-lg border border-slate-200 bg-slate-50 p-2'>
                      <div className='text-[11px] text-slate-600 mb-1'>{t(`coachReports.detail.section.photos.${side}`)}</div>
                      {url ? <Img src={url} alt={side} className='h-40 w-full object-contain rounded-md bg-white' /> : <div className='h-40 grid place-content-center rounded-md bg-white text-slate-400 text-xs border border-slate-200'>{t('coachReports.detail.noPhoto')}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Measurements */}
            <div className='rounded-xl border border-slate-200 bg-white p-3'>
              <div className='font-semibold text-slate-900 text-sm mb-2'>{t('coachReports.detail.measurements')}</div>
              <div className='overflow-auto'>
                <table className='min-w-[520px] w-full text-sm'>
                  <thead className='text-xs text-slate-500'>
                    <tr>
                      <th className='text-start py-2'>{t('coachReports.detail.section.measurements.date')}</th>
                      <th className='text-start py-2'>{t('coachReports.detail.section.measurements.weight')}</th>
                      <th className='text-start py-2'>{t('coachReports.detail.section.measurements.waist')}</th>
                      <th className='text-start py-2'>{t('coachReports.detail.section.measurements.chest')}</th>
                      <th className='text-start py-2'>{t('coachReports.detail.section.measurements.hips')}</th>
                      <th className='text-start py-2'>{t('coachReports.detail.section.measurements.arms')}</th>
                      <th className='text-start py-2'>{t('coachReports.detail.section.measurements.thighs')}</th>
                    </tr>
                  </thead>
                  <tbody className='text-slate-800'>
                    <tr className='border-t border-slate-100'>
                      <td className='py-2'>{active?.measurements?.date || '—'}</td>
                      <td className='py-2'>{active?.measurements?.weight ?? '—'}</td>
                      <td className='py-2'>{active?.measurements?.waist ?? '—'}</td>
                      <td className='py-2'>{active?.measurements?.chest ?? '—'}</td>
                      <td className='py-2'>{active?.measurements?.hips ?? '—'}</td>
                      <td className='py-2'>{active?.measurements?.arms ?? '—'}</td>
                      <td className='py-2'>{active?.measurements?.thighs ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Training & Diet */}
            <div className='grid md:grid-cols-2 gap-3'>
              {/* Training */}
              <div className='rounded-xl border border-slate-200 bg-white p-3'>
                <div className='font-semibold text-slate-900 text-sm mb-2'>{t('coachReports.detail.training')}</div>
                <div className='space-y-1.5 text-sm'>
                  <Row label={t('coachReports.detail.section.training.cardioAdherence')} value={(active?.training?.cardioAdherence ?? '—') + ' / 5'} />
                  <Row label={t('coachReports.detail.section.training.intensityOk')} value={yn(active?.training?.intensityOk)} />
                  <Row label={t('coachReports.detail.section.training.shape')} value={yn(active?.training?.shapeChange)} />
                  <Row label={t('coachReports.detail.section.training.fitness')} value={yn(active?.training?.fitnessChange)} />
                  <Row label={t('coachReports.detail.section.training.sleepEnough')} value={yn(active?.training?.sleep?.enough)} />
                  <Row label={t('coachReports.detail.section.training.sleepHours')} value={active?.training?.sleep?.hours || '—'} />
                  <div className='pt-2'>
                    <div className='text-xs text-slate-500 mb-1'>{t('coachReports.detail.section.training.notes.title')}</div>
                    <div className='rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-800 text-sm whitespace-pre-wrap'>{active?.training?.programNotes || '—'}</div>
                  </div>
                  <div className='pt-2'>
                    <div className='text-xs text-slate-500 mb-1'>{t('coachReports.detail.section.training.daysDeviation')}</div>
                    <Row label={t('coachReports.detail.section.training.deviation.count')} value={active?.training?.daysDeviation?.count || '—'} />
                    <Row label={t('coachReports.detail.section.training.deviation.reason')} value={active?.training?.daysDeviation?.reason || '—'} />
                  </div>
                </div>
              </div>
              {/* Diet */}
              <div className='rounded-xl border border-slate-200 bg-white p-3'>
                <div className='font-semibold text-slate-900 text-sm mb-2'>{t('coachReports.detail.diet')}</div>
                <div className='space-y-1.5 text-sm'>
                  <Row label={t('coachReports.detail.section.diet.hungry')} value={yn(active?.diet?.hungry)} />
                  <Row label={t('coachReports.detail.section.diet.comfort')} value={yn(active?.diet?.mentalComfort)} />
                  <Row label={t('coachReports.detail.section.diet.tooMuch')} value={yn(active?.diet?.foodTooMuch)} />
                  <Row label={t('coachReports.detail.section.diet.wantSpecific')} value={active?.diet?.wantSpecific || '—'} />
                  <div className='pt-2'>
                    <div className='text-xs text-slate-500 mb-1'>{t('coachReports.detail.section.diet.deviation.title')}</div>
                    <Row label={t('coachReports.detail.section.diet.deviation.times')} value={active?.diet?.dietDeviation?.times || '—'} />
                    <Row label={t('coachReports.detail.section.diet.deviation.details')} value={active?.diet?.dietDeviation?.details || '—'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback editor */}
            <div className='rounded-xl border border-slate-200 bg-white p-3'>
              <div className='font-semibold text-slate-900 text-sm mb-2'>{t('coachReports.detail.feedback')}</div>

              <textarea className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[100px]' placeholder={t('coachReports.detail.feedbackPh')} value={feedbackDraft} onChange={e => setFeedbackDraft(e.target.value)} />

              {/* status row */}
              <div className='mt-2 flex items-center justify-between'>
                <div className='text-xs text-slate-500'>{active?.reviewedAt ? `${t('coachReports.detail.reviewedAt')}: ${new Date(active.reviewedAt).toLocaleString()}` : t('coachReports.awaitingReview')}</div>
                <div className='flex items-center gap-2'>
                  <Button color='success' disabled={saving} onClick={() => handleSaveFeedback({ forceRequire: true })}>
                    {saving ? <Loader2 className='w-4 h-4 animate-spin mr-1' /> : <ClipboardList className='w-4 h-4 mr-1' />}
                    {t('coachReports.detail.saveFeedback')}
                  </Button>
                  {/* Mark reviewed (even with empty feedback) */}
                  <Button color='neutral' disabled={saving} onClick={() => handleSaveFeedback({ isRead: true, feedback: feedbackDraft || '' })}>
                    <CheckCircle2 className='w-4 h-4 mr-1' />
                    {t('coachReports.reviewed')}
                  </Button>
                </div>
              </div>

              {saveErr ? <div className='mt-2 text-xs text-rose-700'>{saveErr}</div> : null}
              {savedOk ? (
                <div className='mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700'>
                  <CheckCircle2 className='w-4 h-4' />
                  {t('coachReports.messages.saved')}
                </div>
              ) : null}
            </div>

            <div className='flex items-center justify-end'>
              <Button color='neutral' onClick={closeDetail}>
                {t('coachReports.detail.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* -------------------------------- Subparts -------------------------------- */
function Row({ label, value }) {
  return (
    <div className='flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='text-sm font-medium text-slate-900'>{value}</div>
    </div>
  );
}

function yn(val) {
  if (val === 'yes') return 'نعم';
  if (val === 'no') return 'لا';
  return val ?? '—';
}
