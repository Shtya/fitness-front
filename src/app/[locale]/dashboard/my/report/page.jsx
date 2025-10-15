'use client';

import React, { useEffect, useMemo, useState } from 'react';
import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';

import NiceButton from '@/components/atoms/Button';
import NiceInput from '@/components/atoms/Input';
import NiceSelect from '@/components/atoms/Select';
import NiceInputDate from '@/components/atoms/InputDate';
import CheckBox from '@/components/atoms/CheckBox';

import { Mail, Clock, CalendarDays, Info, RefreshCw, Sparkles } from 'lucide-react';

/* ----------------- helpers ----------------- */
const fmt = {
  num(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return new Intl.NumberFormat().format(+n);
  },
  dateISO(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  },
  dateHuman(d) {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d || '-';
    }
  },
};

function cx(...c) {
  return c.filter(Boolean).join(' ');
}

function Shimmer({ className = '' }) {
  return (
    <div className={cx('relative overflow-hidden rounded-xl bg-slate-100', className)}>
      <div className='absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent' />
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

function Card({ children, className = '' }) {
  return <div className={cx('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

function Hint({ text }) {
  // small "تعجب" hover tip
  return (
    <span className='group relative inline-flex items-center'>
      <span className='ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white'>!</span>
      <span className='pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-md group-hover:block'>{text}</span>
    </span>
  );
}

/* ----------------- page ----------------- */
export default function WeeklyExerciseReport({ userId: userIdProp }) {
  const user = useUser();
  const userId = userIdProp || user?.id;

  // form state
  const [exerciseName, setExerciseName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [sendDay, setSendDay] = useState('monday'); // weekly day
  const [sendTime, setSendTime] = useState('09:00'); // HH:mm
  const [startDate, setStartDate] = useState(fmt.dateISO(new Date())); // first send date (optional)
  const [includeTopSets, setIncludeTopSets] = useState(true);
  const [includeDeltas, setIncludeDeltas] = useState(true);
  const [includeE1rm, setIncludeE1rm] = useState(true);

  // data
  const [progress, setProgress] = useState(null);
  const [series, setSeries] = useState(null);
  const [topSets, setTopSets] = useState(null);
  const [deltas, setDeltas] = useState(null);

  // loading / result
  const [loading, setLoading] = useState(true);
  const [prefilling, setPrefilling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // suggestions
  const exerciseOptions = useMemo(() => {
    const arr = progress?.exercises?.topByAttempts || [];
    return arr.map(x => ({ id: x.name, label: x.name }));
  }, [progress]);

  // bootstrap: load last 30d summary to propose defaults
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!userId) return;
      setLoading(true);
      try {
        const data = await api.get(`/prs/stats/progress?userId=${userId}&windowDays=30&exerciseWindowDays=90`);
        const prog = data?.data ?? data;
        if (!mounted) return;
        setProgress(prog);

        // preselect the most-attempted exercise, default email, and subject
        const firstEx = prog?.exercises?.topByAttempts?.[0]?.name || '';
        setExerciseName(firstEx);
        setRecipient(user?.email || '');
        setSubject(firstEx ? `Weekly Performance — ${firstEx}` : 'Weekly Performance');
      } catch (e) {
        console.error(e);
        if (mounted) setErr('Failed to load defaults.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [userId]);

  // when exercise changes, prefill detail blocks
  useEffect(() => {
    let mounted = true;
    async function prefill() {
      if (!userId || !exerciseName) return;
      setPrefilling(true);
      try {
        const [s, t, d] = await Promise.all([api.get(`/prs/stats/e1rm-series?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}&bucket=week&windowDays=90`), api.get(`/prs/stats/top-sets?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}&top=5`), api.get(`/prs/exercise/progress?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}&limit=60`)]);

        if (!mounted) return;

        setSeries(s?.data ?? s);
        setTopSets(t?.data ?? t);
        setDeltas(d?.data ?? d);

        // default notes if empty
        if (!notes) {
          const best = (s?.data ?? s)?.reduce((m, p) => (p.e1rm > m ? p.e1rm : m), 0) || 0;
          setNotes(best ? `Great work! Best recent e1RM recorded at ${fmt.num(best)}. Keep steady progress and prioritize recovery.` : 'Weekly summary attached. Keep logging sessions to unlock richer insights.');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setPrefilling(false);
      }
    }
    prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseName, userId]);

  // derived compact stats
  const e1rmStats = useMemo(() => {
    if (!series || !series.length) return null;
    const vals = series.map(s => s.e1rm || 0);
    const first = vals[0];
    const last = vals[vals.length - 1];
    const best = Math.max(...vals);
    return { first, last, best, change: last - first, points: vals.length };
  }, [series]);

  const deltaLast = deltas?.lastChange?.delta || { weight: 0, reps: 0, e1rm: 0 };

  // preview body
  const previewBody = useMemo(() => {
    const lines = [];
    lines.push(`Exercise: ${exerciseName || '-'}`);
    if (includeE1rm && e1rmStats) {
      lines.push(`e1RM — Best: ${fmt.num(e1rmStats.best)}, Last: ${fmt.num(e1rmStats.last)}, Change: ${e1rmStats.change > 0 ? '+' : ''}${fmt.num(e1rmStats.change)}`);
    }
    if (includeDeltas) {
      lines.push(`Session-to-Session — ΔWeight: ${deltaLast.weight > 0 ? '+' : ''}${fmt.num(deltaLast.weight)}, ΔReps: ${deltaLast.reps > 0 ? '+' : ''}${fmt.num(deltaLast.reps)}, Δe1RM: ${deltaLast.e1rm > 0 ? '+' : ''}${fmt.num(deltaLast.e1rm)}`);
    }
    if (includeTopSets && topSets) {
      const bestW = topSets?.byWeight?.[0];
      const bestR = topSets?.byReps?.[0];
      const bestE = topSets?.byE1rm?.[0];
      if (bestW) lines.push(`Top Weight: ${bestW.weight}kg × ${bestW.reps} (${fmt.dateHuman(bestW.date)})`);
      if (bestR) lines.push(`Top Reps: ${bestR.weight}kg × ${bestR.reps} (${fmt.dateHuman(bestR.date)})`);
      if (bestE) lines.push(`Top e1RM: ${fmt.num(bestE.e1rm)} (${fmt.dateHuman(bestE.date)})`);
    }
    if (notes) lines.push('');
    if (notes) lines.push(`Coach Notes: ${notes}`);
    return lines.join('\n');
  }, [exerciseName, includeE1rm, e1rmStats, includeDeltas, deltaLast, includeTopSets, topSets, notes]);

  /* ----------------- actions ----------------- */
  async function sendTestNow() {
    if (!recipient || !exerciseName) {
      setErr('Please fill recipient and choose an exercise.');
      return;
    }
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      // Tailor this to your backend. Example payload:
      const payload = {
        userId,
        to: recipient,
        cc,
        subject: subject || `Weekly Performance — ${exerciseName}`,
        body: previewBody,
        exerciseName,
      };
      await api.post('/prs/reports/send-test', payload);
      setMsg('Test report sent!');
    } catch (e) {
      console.error(e);
      setErr('Could not send the test report.');
    } finally {
      setBusy(false);
    }
  }

  async function scheduleWeekly() {
    if (!recipient || !exerciseName) {
      setErr('Please fill recipient and choose an exercise.');
      return;
    }
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      // Example weekly schedule payload (adjust to your Nest route/cron):
      const payload = {
        userId,
        to: recipient,
        cc,
        subject: subject || `Weekly Performance — ${exerciseName}`,
        template: 'weekly-exercise',
        exerciseName,
        include: { e1rm: includeE1rm, deltas: includeDeltas, topSets: includeTopSets },
        notes,
        schedule: {
          // your backend can map day/time to cron like "0 9 * * 1" (Monday at 09:00)
          dayOfWeek: sendDay, // monday|tuesday|...|sunday
          time: sendTime, // "HH:mm"
          startDate, // ISO date of first trigger if you want
        },
      };
      await api.post('/prs/reports/weekly', payload);
      setMsg('Weekly report scheduled!');
    } catch (e) {
      console.error(e);
      setErr('Could not schedule the weekly report.');
    } finally {
      setBusy(false);
    }
  }

  /* ----------------- render ----------------- */
  return (
    <div className='mx-auto max-w-5xl p-4 md:p-8'>
      {/* Header with your gradient + blur */}
      <div className='relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'>
        <div className='absolute inset-0'>
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
          <div
            className='absolute inset-0 opacity-15'
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              backgroundPosition: '-1px -1px',
            }}
          />
          <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
          <div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
        </div>

        <div className='relative p-4 text-white md:p-6'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <h1 className='text-xl font-semibold md:text-3xl'>Weekly Exercise Report</h1>
              <p className='mt-1 text-white/85'>Choose an exercise, review auto-filled stats, and send or schedule.</p>
            </div>
            <NiceButton
              name='Refresh defaults'
              icon={<RefreshCw className='h-4 w-4' />}
              onClick={() => {
                if (userId) {
                  setMsg(null);
                  setErr(null);
                  // re-run bootstrap
                  (async () => {
                    setLoading(true);
                    try {
                      const data = await api.get(`/prs/stats/progress?userId=${userId}&windowDays=30&exerciseWindowDays=90`);
                      const prog = data?.data ?? data;
                      setProgress(prog);
                      const firstEx = prog?.exercises?.topByAttempts?.[0]?.name || '';
                      setExerciseName(firstEx);
                      setSubject(firstEx ? `Weekly Performance — ${firstEx}` : 'Weekly Performance');
                    } catch (e) {
                      console.error(e);
                      setErr('Failed to refresh defaults.');
                    } finally {
                      setLoading(false);
                    }
                  })();
                }
              }}
              className='!w-auto bg-white text-slate-800 hover:bg-white/90'
              color='ghost'
            />
          </div>
        </div>
      </div>

      {/* form + preview */}
      <div className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
        {/* Left: form */}
        <Card className='p-4'>
          <div className='mb-4'>
            <label className='mb-1 block text-sm font-medium text-slate-700'>Focus Exercise</label>
            {loading ? <Shimmer className='h-11' /> : <NiceSelect options={exerciseOptions} value={exerciseName} onChange={v => setExerciseName(v || '')} placeholder={exerciseOptions.length ? 'Select exercise…' : 'No suggestions yet'} clearable allowCustom createHint='Write a new exercise…' />}
            <div className='mt-1 text-xs text-slate-500'>
              Tip: uncommon terms like <b>e1RM</b>
              <Hint text='Estimated 1-rep max: a formula-based estimate of the heaviest weight you could lift for a single rep.' /> will include a small help tooltip in the email too.
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <NiceInput
              label={
                <span className='inline-flex items-center gap-1'>
                  To (email) <Mail className='h-4 w-4' />
                </span>
              }
              placeholder='recipient@email.com'
              value={recipient}
              onChange={setRecipient}
            />
            <NiceInput label='CC (optional)' placeholder='cc@email.com' value={cc} onChange={setCc} />
          </div>

          <div className='mt-3'>
            <NiceInput label='Subject' placeholder='Weekly Performance — Bench Press' value={subject} onChange={setSubject} />
          </div>

          <div className='mt-3'>
            <label className='mb-1 block text-sm font-medium text-slate-700'>Coach Notes (optional)</label>
            <textarea className='h-28 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100' placeholder='Personal message for the athlete…' value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
            <div>
              <label className='mb-1 block text-sm font-medium text-slate-700'>Send Day</label>
              <select className='h-[43px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100' value={sendDay} onChange={e => setSendDay(e.target.value)}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => (
                  <option key={d} value={d}>
                    {d[0].toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className='mb-1 block text-sm font-medium text-slate-700'>
                Send Time <Clock className='ml-1 inline-block h-4 w-4 align-middle' />
              </label>
              <input type='time' value={sendTime} onChange={e => setSendTime(e.target.value)} className='h-[43px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100' />
            </div>
            <div>
              <NiceInputDate
                label={
                  <span className='inline-flex items-center gap-1'>
                    First Send <CalendarDays className='h-4 w-4' />
                  </span>
                }
                onChange={date => setStartDate(fmt.dateISO(date))}
              />
              <div className='mt-1 text-[11px] text-slate-500'>Defaults to today if empty.</div>
            </div>
          </div>

          <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
            <CheckBox label='Include e1RM' initialChecked={includeE1rm} onChange={setIncludeE1rm} />
            <CheckBox label='Include Deltas' initialChecked={includeDeltas} onChange={setIncludeDeltas} />
            <CheckBox label='Include Top sets' initialChecked={includeTopSets} onChange={setIncludeTopSets} />
          </div>

          <div className='mt-6 flex flex-wrap items-center gap-2'>
            <NiceButton name='Send Test Now' icon={<Sparkles className='h-4 w-4' />} onClick={sendTestNow} loading={busy} className='!w-auto bg-indigo-600 hover:bg-indigo-700' color='primary' />
            <NiceButton name='Schedule Weekly' onClick={scheduleWeekly} loading={busy} className='!w-auto bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:brightness-110' />
          </div>

          {err && <div className='mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700'>{err}</div>}
          {msg && <div className='mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700'>{msg}</div>}
        </Card>

        {/* Right: live preview */}
        <Card className='p-0'>
          <div className='rounded-t-2xl border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600'>Email Preview (plain)</div>
          <div className='p-4'>
            {loading || prefilling ? (
              <div className='space-y-3'>
                <Shimmer className='h-6' />
                <Shimmer className='h-6' />
                <Shimmer className='h-40' />
              </div>
            ) : (
              <>
                <div className='mb-3 text-sm text-slate-600'>
                  <div>
                    <b>To:</b> {recipient || '—'}
                  </div>
                  <div>
                    <b>CC:</b> {cc || '—'}
                  </div>
                  <div>
                    <b>Subject:</b> {subject || `Weekly Performance — ${exerciseName || '—'}`}
                  </div>
                  <div className='mt-2 text-[11px] text-slate-500'>
                    Will send every <b>{sendDay}</b> at <b>{sendTime}</b> starting {fmt.dateHuman(startDate)}.
                  </div>
                </div>

                <div className='rounded-xl border border-slate-200 bg-white p-4'>
                  <div className='text-[13px] leading-6 whitespace-pre-wrap'>{previewBody}</div>

                  {/* compact KPI strip (no graphs) */}
                  <div className='mt-4 grid grid-cols-2 gap-3'>
                    <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm'>
                      <div className='text-slate-500'>Exercise</div>
                      <div className='font-medium'>{exerciseName || '—'}</div>
                    </div>
                    <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm'>
                      <div className='text-slate-500'>
                        e1RM
                        <Hint text='Estimated 1-rep max; a calculated estimate.' />
                      </div>
                      <div className='font-medium'>{e1rmStats ? `Best ${fmt.num(e1rmStats.best)} • Last ${fmt.num(e1rmStats.last)}` : '—'}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* page footnote */}
      <div className='mt-6 text-center text-xs text-slate-500'>
        All borders use <code>border-slate-200</code>. No charts — the report uses concise stats for clarity.
      </div>
    </div>
  );
}
