'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import api from '@/utils/axios';

// your atoms
import NiceButton from '@/components/atoms/Button';
import NiceSelect from '@/components/atoms/Select';
import NiceInputDate from '@/components/atoms/InputDate';

import { RefreshCw, CalendarDays, ChartArea, Scale, Flame, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

/** ---------- utils ---------- */
const fmt = {
  num(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return new Intl.NumberFormat().format(+n);
  },
  sign(n) {
    const v = Number(n || 0);
    if (v > 0) return `+${v}`;
    if (v < 0) return `${v}`;
    return '0';
  },
  date(d) {
    if (!d) return '-';
    try {
      const dd = new Date(d);
      return dd.toLocaleDateString();
    } catch {
      return d;
    }
  },
};

function cx(...c) {
  return c.filter(Boolean).join(' ');
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

async function getJSON(p) {
  const r = await p;
  return r?.data ?? r;
}

/** ---------- tiny UI ---------- */
function Card({ children, className = '' }) {
  return <div className={cx('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
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

function Hint({ text }) {
  return (
    <span className='group relative inline-flex'>
      <Info className='h-4 w-4 text-slate-400' aria-label='help' />
      <span className='pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-md group-hover:block'>{text}</span>
    </span>
  );
}

function KPI({ label, value, sub, icon, hint }) {
  return (
    <Card className='p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-1 text-sm text-slate-500'>
            <span>{label}</span>
            {hint ? <Hint text={hint} /> : null}
          </div>
          <div className='mt-1 text-2xl font-semibold'>{value}</div>
          {sub ? <div className='mt-1 text-xs text-slate-400'>{sub}</div> : null}
        </div>
        {icon ? <div className='rounded-xl bg-slate-50 p-2 text-slate-600'>{icon}</div> : null}
      </div>
    </Card>
  );
}

function Section({ title, actions, children, className = '' }) {
  return (
    <Card className={cx('p-4', className)}>
      <div className='mb-3 flex items-center justify-between gap-4'>
        <h2 className='text-lg font-semibold'>{title}</h2>
        {actions}
      </div>
      {children}
    </Card>
  );
}

function Badge({ children }) {
  return <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700'>{children}</span>;
}

function TrendIcon({ v }) {
  if (v > 0) return <TrendingUp className='h-4 w-4 text-emerald-600' />;
  if (v < 0) return <TrendingDown className='h-4 w-4 text-rose-600' />;
  return <Minus className='h-4 w-4 text-slate-400' />;
}

/** ---------- main ---------- */
export default function ClientProgressPro({ userId: userIdProp, initialExercise }) {
  const user = useUser();
  const userId = userIdProp || user?.id;

  // filters
  const [windowDays, setWindowDays] = useLocalStorage('prs.windowDays', 30);
  const [exerciseWindowDays, setExerciseWindowDays] = useLocalStorage('prs.exerciseWindowDays', 90);
  const [chosenDate, setChosenDate] = useLocalStorage('prs.chosenDate', new Date().toISOString().slice(0, 10));
  const [exerciseName, setExerciseName] = useLocalStorage('prs.exerciseName', initialExercise || '');
  const [cmpFrom, setCmpFrom] = useLocalStorage('prs.cmpFrom', '');
  const [cmpTo, setCmpTo] = useLocalStorage('prs.cmpTo', '');

  // data
  const [progress, setProgress] = useState(null);
  const [dayStats, setDayStats] = useState(null);
  const [deltas, setDeltas] = useState(null);
  const [cmpResult, setCmpResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [series, setSeries] = useState(null); // for compact stats only
  const [topSets, setTopSets] = useState(null);

  // loading
  const [loading, setLoading] = useState(true);
  const [busyFilters, setBusyFilters] = useState(false);
  const [error, setError] = useState(null);

  const suggestedExercises = useMemo(() => {
    if (!progress) return [];
    return (progress?.exercises?.topByAttempts || []).map(x => x.name);
  }, [progress]);

  const exerciseOptions = useMemo(() => suggestedExercises.map(n => ({ id: n, label: n })), [suggestedExercises]);

  // fetchers
  async function fetchProgress(filtered = false) {
    if (!userId) return;
    if (filtered) setBusyFilters(true);
    setError(null);
    try {
      const data = await getJSON(api.get(`/prs/stats/progress?userId=${userId}&windowDays=${windowDays}&exerciseWindowDays=${exerciseWindowDays}`));
      setProgress(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load progress.');
    } finally {
      setLoading(false);
      if (filtered) setBusyFilters(false);
    }
  }

  async function fetchDay() {
    if (!userId || !chosenDate) return;
    try {
      const data = await getJSON(api.get(`/prs/stats/day?userId=${userId}&date=${encodeURIComponent(chosenDate)}`));
      setDayStats(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchExerciseCore(filtered = false) {
    if (!userId || !exerciseName) return;
    if (filtered) setBusyFilters(true);
    try {
      const d = await getJSON(api.get(`/prs/exercise/progress?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}&limit=120`));
      const h = await getJSON(api.get(`/prs/history?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}`));
      const s = await getJSON(api.get(`/prs/stats/e1rm-series?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}&bucket=week&windowDays=${exerciseWindowDays}`));
      const t = await getJSON(api.get(`/prs/stats/top-sets?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}&top=5`));
      setDeltas(d);
      setHistory(h);
      setSeries(s);
      setTopSets(t);
    } catch (e) {
      console.error(e);
    } finally {
      if (filtered) setBusyFilters(false);
    }
  }

  async function runCompare() {
    if (!userId || !exerciseName || !cmpFrom || !cmpTo) return;
    setBusyFilters(true);
    try {
      const data = await getJSON(api.get(`/prs/exercise/compare?userId=${userId}&exerciseName=${encodeURIComponent(exerciseName)}&from=${encodeURIComponent(cmpFrom)}&to=${encodeURIComponent(cmpTo)}`));
      setCmpResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setBusyFilters(false);
    }
  }

  // effects
  useEffect(() => {
    fetchProgress(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    fetchDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, chosenDate]);

  useEffect(() => {
    if (!loading) fetchProgress(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays, exerciseWindowDays]);

  useEffect(() => {
    fetchExerciseCore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, exerciseName, exerciseWindowDays]);

  // compact stats from series (no charts)
  const seriesStats = useMemo(() => {
    if (!series || !series.length) return null;
    const e1rms = series.map(s => s.e1rm || 0);
    const best = Math.max(...e1rms);
    const first = e1rms[0] ?? 0;
    const last = e1rms[e1rms.length - 1] ?? 0;
    const change = last - first;
    const sessions = series.length;
    return { best, first, last, change, sessions };
  }, [series]);

  return (
    <div className='mx-auto min-h-screen max-w-7xl bg-gray-50 p-4 md:p-6 lg:p-8'>
      {/* Fancy header (gradient + grid + blur) */}
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

        <div className='relative p-3 py-2 text-white md:p-5'>
          <div className='flex flex-row items-center justify-between gap-3 '>
            <div>
              <h1 className='text-xl font-semibold md:text-4xl'>Performance Dashboard</h1>
              <p className='mt-1 text-white/85 max-md:hidden'>Clean insights, meaningful stats, and fast filters.</p>
            </div>

            <NiceButton name='Refresh' icon={<RefreshCw className='h-4 w-4' />} onClick={() => fetchProgress(true)} className='!w-auto bg-white text-slate-800 hover:bg-white/90 md:!block' color='ghost' />
          </div>
        </div>

        {busyFilters && (
          <div className='absolute inset-0 z-20 grid place-items-center bg-white/50 backdrop-blur-[2px]'>
            <div className='flex items-center gap-2 text-sm font-medium text-indigo-700'>
              <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent' />
              Updating…
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      {loading ? (
        <div className='mb-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
          <Shimmer className='h-28' />
          <Shimmer className='h-28' />
          <Shimmer className='h-28' />
          <Shimmer className='h-28' />
        </div>
      ) : (
        <div className='mb-6 grid grid-cols-2 gap-3 md:grid-cols-4'>
          <KPI label='Adherence' value={`${fmt.num(progress?.adherence?.pct || 0)}%`} sub={`Streak ${fmt.num(progress?.adherence?.currentStreakDays || 0)} days`} icon={<CalendarDays />} hint='Days trained divided by the selected window.' />
          <KPI label='Sessions' value={fmt.num(progress?.sessions?.count || 0)} sub={progress?.adherence?.lastWorkoutDate ? `Last: ${fmt.date(progress.adherence.lastWorkoutDate)}` : '—'} icon={<ChartArea />} />
          <KPI label='Total Volume' value={fmt.num(progress?.volume?.total || 0)} sub={`Avg/Session ${fmt.num(progress?.volume?.avgPerSession || 0)}`} icon={<Flame />} hint='Sum of (weight × reps) across completed sets.' />
          <KPI
            label={
              <>
                Recent PRs{' '}
                <span className='inline-flex items-center align-middle'>
                  <Hint text='e1RM = Estimated 1-rep max (formula-based estimate of the heaviest weight for one rep).' />
                </span>
              </>
            }
            value={fmt.num(progress?.prs?.count || 0)}
            sub={progress?.prs?.top?.[0]?.exercise ? `${progress.prs.top[0].exercise} • e1RM ${fmt.num(progress.prs.top[0].e1rm)}` : '—'}
            icon={<Scale />}
          />
        </div>
      )}

      {/* Filters row (Select + InputDate everywhere) */}
      <Card className='mb-6 p-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-12'>
          {/* Focus Exercise (dropdown) */}
          <div className='md:col-span-4'>
            <NiceSelect label='Focus Exercise' options={exerciseOptions} value={exerciseName} onChange={v => setExerciseName(v || '')} placeholder={exerciseOptions.length ? 'Select exercise…' : 'No suggestions yet'} clearable allowCustom createHint='Write a new exercise…' />
            {exerciseOptions.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {exerciseOptions.slice(0, 8).map(o => (
                  <button key={o.id} onClick={() => setExerciseName(String(o.id))} className={cx('rounded-full border px-3 py-1 text-xs transition', String(o.id) === exerciseName ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chosen Day */}
          <div className='md:col-span-3'>
            <NiceInputDate
              label='Chosen Day'
              onChange={date => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                setChosenDate(`${y}-${m}-${d}`);
              }}
            />
          </div>

          {/* Compare From (InputDate) */}
          <div className='md:col-span-2'>
            <NiceInputDate
              label='Compare From'
              onChange={date => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                setCmpFrom(`${y}-${m}-${d}`);
              }}
            />
          </div>

          {/* Compare To (InputDate) + button */}
          <div className='md:col-span-3'>
            <div className='flex items-end gap-2'>
              <div className='flex-1'>
                <NiceInputDate
                  label='Compare To'
                  onChange={date => {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setCmpTo(`${y}-${m}-${d}`);
                  }}
                />
              </div>
              <NiceButton name='Compare' onClick={runCompare} loading={busyFilters} className='!w-auto bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:brightness-110' />
            </div>
          </div>
        </div>

        {/* quick windows */}
        <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-12'>
          <div className='md:col-span-4'>
            <NiceSelect label='Window (days)' options={[7, 14, 30, 60, 90].map(d => ({ id: d, label: `${d} days` }))} value={windowDays} onChange={v => setWindowDays(Number(v))} />
          </div>
          <div className='md:col-span-4'>
            <NiceSelect
              label={
                <span className='inline-flex items-center gap-1'>
                  e1RM Window <Hint text='Time window used to compute e1RM summary stats below.' />
                </span>
              }
              options={[30, 60, 90, 180, 365].map(d => ({ id: d, label: `${d} days` }))}
              value={exerciseWindowDays}
              onChange={v => setExerciseWindowDays(Number(v))}
            />
          </div>
        </div>
      </Card>

      {/* global thin loading bar while filtering */}
      {busyFilters && (
        <div className='pointer-events-none fixed left-0 top-0 z-[60] h-1 w-full'>
          <div className='h-1 animate-[pulse_1.2s_ease-in-out_infinite] bg-gradient-to-r from-indigo-600 via-indigo-500/80 to-blue-600' />
        </div>
      )}

      <div className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-3'>
        {/* Chosen Day */}
        <Section title='Chosen Day — Sets & Weights' actions={<Badge>{fmt.date(chosenDate)}</Badge>}>
          {!dayStats ? (
            <Shimmer className='h-48' />
          ) : dayStats?.exercises?.length ? (
            <div className='space-y-4'>
              <div className='grid grid-cols-3 gap-3'>
                <KPI label='Exercises' value={fmt.num(dayStats.totals.exercisesCount)} />
                <KPI label='Sets' value={fmt.num(dayStats.totals.totalSets)} />
                <KPI label='Volume' value={fmt.num(dayStats.totals.totalVolume)} />
              </div>
              <div className='max-h-80 overflow-auto rounded-xl border border-slate-200'>
                <table className='min-w-full text-sm'>
                  <thead className='bg-slate-50 text-slate-600'>
                    <tr>
                      <th className='px-3 py-2 text-left'>Exercise</th>
                      <th className='px-3 py-2 text-left'>
                        Best (kg / reps / e1RM) <Hint text='Best set achieved for this exercise on the selected day.' />
                      </th>
                      <th className='px-3 py-2 text-left'>Sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayStats.exercises.map(ex => (
                      <tr key={ex.exerciseName} className='border-t border-slate-200'>
                        <td className='px-3 py-2 font-medium'>{ex.exerciseName}</td>
                        <td className='px-3 py-2 text-slate-700'>
                          {fmt.num(ex.bestWeight)} / {fmt.num(ex.bestReps)} / {fmt.num(ex.bestE1rm)}
                        </td>
                        <td className='px-3 py-2 text-slate-600'>
                          <div className='flex flex-wrap gap-2'>
                            {ex.sets.map(s => (
                              <span key={s.setNumber} className={cx('rounded-lg border px-2 py-1', s.isPr ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-100')}>
                                #{s.setNumber}: {fmt.num(s.weight)}×{fmt.num(s.reps)} {s.isPr ? '⭐' : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className='text-sm text-slate-500'>Pick a day to see all sets & weights.</div>
          )}
        </Section>

        {/* Deltas (stats only) */}
        <Section title='Session-to-Session Change' actions={<Badge>{exerciseName || 'No exercise selected'}</Badge>}>
          {!exerciseName ? (
            <div className='text-sm text-slate-500'>Choose an exercise to see changes.</div>
          ) : !deltas ? (
            <Shimmer className='h-40' />
          ) : deltas?.sessions?.length ? (
            <div className='space-y-4'>
              <div className='grid grid-cols-3 gap-3'>
                <KPI
                  label='Δ Weight'
                  value={fmt.sign(deltas.lastChange?.delta?.weight || 0)}
                  sub={
                    <span className='inline-flex items-center gap-1'>
                      <TrendIcon v={deltas.lastChange?.delta?.weight || 0} /> since last
                    </span>
                  }
                />
                <KPI
                  label='Δ Reps'
                  value={fmt.sign(deltas.lastChange?.delta?.reps || 0)}
                  sub={
                    <span className='inline-flex items-center gap-1'>
                      <TrendIcon v={deltas.lastChange?.delta?.reps || 0} /> since last
                    </span>
                  }
                />
                <KPI
                  label={
                    <span className='inline-flex items-center gap-1'>
                      Δ e1RM <Hint text='Change in estimated 1-rep max.' />
                    </span>
                  }
                  value={fmt.sign(deltas.lastChange?.delta?.e1rm || 0)}
                  sub={
                    <span className='inline-flex items-center gap-1'>
                      <TrendIcon v={deltas.lastChange?.delta?.e1rm || 0} /> since last
                    </span>
                  }
                />
              </div>

              <div className='max-h-60 overflow-auto rounded-xl border border-slate-200'>
                <table className='min-w-full text-sm'>
                  <thead className='bg-slate-50 text-slate-600'>
                    <tr>
                      <th className='px-3 py-2 text-left'>Date</th>
                      <th className='px-3 py-2 text-left'>Weight</th>
                      <th className='px-3 py-2 text-left'>Δ Weight</th>
                      <th className='px-3 py-2 text-left'>Reps</th>
                      <th className='px-3 py-2 text-left'>Δ Reps</th>
                      <th className='px-3 py-2 text-left'>
                        e1RM <Hint text='Estimated 1-rep max that day.' />
                      </th>
                      <th className='px-3 py-2 text-left'>Δ e1RM</th>
                      <th className='px-3 py-2 text-left'>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deltas.sessions.map(s => (
                      <tr key={s.date} className='border-t border-slate-200'>
                        <td className='px-3 py-2'>{fmt.date(s.date)}</td>
                        <td className='px-3 py-2'>{fmt.num(s.weight)}</td>
                        <td className={cx('px-3 py-2', s.delta?.weight > 0 ? 'text-emerald-600' : s.delta?.weight < 0 ? 'text-rose-600' : 'text-slate-600')}>{fmt.sign(s.delta?.weight || 0)}</td>
                        <td className='px-3 py-2'>{fmt.num(s.reps)}</td>
                        <td className={cx('px-3 py-2', s.delta?.reps > 0 ? 'text-emerald-600' : s.delta?.reps < 0 ? 'text-rose-600' : 'text-slate-600')}>{fmt.sign(s.delta?.reps || 0)}</td>
                        <td className='px-3 py-2'>{fmt.num(s.e1rm)}</td>
                        <td className={cx('px-3 py-2', s.delta?.e1rm > 0 ? 'text-emerald-600' : s.delta?.e1rm < 0 ? 'text-rose-600' : 'text-slate-600')}>{fmt.sign(s.delta?.e1rm || 0)}</td>
                        <td className='px-3 py-2 capitalize'>{s.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className='text-sm text-slate-500'>No deltas yet.</div>
          )}
        </Section>

        {/* Compare */}
        <Section title='Compare — Same Exercise Between Two Dates' actions={<Badge>{exerciseName || 'No exercise selected'}</Badge>}>
          {!cmpResult ? (
            <div className='text-sm text-slate-500'>Pick an exercise and two dates above, then press Compare.</div>
          ) : (
            <div className='space-y-3'>
              <div className='grid grid-cols-3 gap-3'>
                <KPI label='Δ Weight' value={fmt.sign(cmpResult.delta.weight)} />
                <KPI label='Δ Reps' value={fmt.sign(cmpResult.delta.reps)} />
                <KPI label='Δ e1RM' value={fmt.sign(cmpResult.delta.e1rm)} />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <Card className='p-3'>
                  <div className='text-sm text-slate-500'>From ({fmt.date(cmpResult.from.date)})</div>
                  <div className='mt-1 text-sm'>Weight: {fmt.num(cmpResult.from.weight)} kg</div>
                  <div className='text-sm'>Reps: {fmt.num(cmpResult.from.reps)}</div>
                  <div className='text-sm'>
                    e1RM <Hint text='Estimated 1-rep max.' />: {fmt.num(cmpResult.from.e1rm)}
                  </div>
                </Card>
                <Card className='p-3'>
                  <div className='text-sm text-slate-500'>To ({fmt.date(cmpResult.to.date)})</div>
                  <div className='mt-1 text-sm'>Weight: {fmt.num(cmpResult.to.weight)} kg</div>
                  <div className='text-sm'>Reps: {fmt.num(cmpResult.to.reps)}</div>
                  <div className='text-sm'>e1RM: {fmt.num(cmpResult.to.e1rm)}</div>
                </Card>
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Drilldown: compact e1RM stats (no big charts) */}
      {exerciseName && (
        <div className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
          <Section
            title={
              <span className='inline-flex items-center gap-2'>
                {exerciseName} — e1RM Summary
                <Hint text='Condensed view of your e1RM stats over the selected window.' />
              </span>
            }
            actions={<Badge>{exerciseWindowDays}d window</Badge>}>
            {!series ? (
              <Shimmer className='h-28' />
            ) : seriesStats ? (
              <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                <KPI label='Best e1RM' value={fmt.num(seriesStats.best)} />
                <KPI label='First e1RM' value={fmt.num(seriesStats.first)} />
                <KPI
                  label={
                    <span className='inline-flex items-center gap-1'>
                      Last e1RM <Hint text='Most recent e1RM value in the window.' />
                    </span>
                  }
                  value={fmt.num(seriesStats.last)}
                />
                <KPI
                  label='Change'
                  value={fmt.sign(seriesStats.change)}
                  sub={
                    <span className='inline-flex items-center gap-1'>
                      <TrendIcon v={seriesStats.change} /> vs first
                    </span>
                  }
                />
                <KPI label='Points' value={fmt.num(seriesStats.sessions)} sub='data points' />
              </div>
            ) : (
              <div className='text-sm text-slate-500'>No e1RM points yet.</div>
            )}
          </Section>

          <Section title={`${exerciseName} — Top Sets`}>
            {!topSets ? (
              <Shimmer className='h-40' />
            ) : (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <Card className='p-3'>
                  <div className='mb-1 text-sm font-medium'>By Weight</div>
                  <div className='space-y-2 text-sm'>
                    {topSets.byWeight?.length ? (
                      topSets.byWeight.map((r, i) => (
                        <div key={`w-${i}`} className='flex items-center justify-between'>
                          <span>{fmt.date(r.date)}</span>
                          <span>
                            {r.weight}kg × {r.reps}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className='text-slate-500'>—</div>
                    )}
                  </div>
                </Card>
                <Card className='p-3'>
                  <div className='mb-1 text-sm font-medium'>By Reps</div>
                  <div className='space-y-2 text-sm'>
                    {topSets.byReps?.length ? (
                      topSets.byReps.map((r, i) => (
                        <div key={`r-${i}`} className='flex items-center justify-between'>
                          <span>{fmt.date(r.date)}</span>
                          <span>
                            {r.weight}kg × {r.reps}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className='text-slate-500'>—</div>
                    )}
                  </div>
                </Card>
                <Card className='p-3'>
                  <div className='mb-1 text-sm font-medium'>
                    By e1RM <Hint text='Ranking sessions by highest estimated 1-rep max.' />
                  </div>
                  <div className='space-y-2 text-sm'>
                    {topSets.byE1rm?.length ? (
                      topSets.byE1rm.map((r, i) => (
                        <div key={`e-${i}`} className='flex items-center justify-between'>
                          <span>{fmt.date(r.date)}</span>
                          <span>{fmt.num(r.e1rm)}</span>
                        </div>
                      ))
                    ) : (
                      <div className='text-slate-500'>—</div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Recent attempts */}
      {exerciseName && (
        <div className='mt-6'>
          <Section title={`${exerciseName} — Recent Attempts`}>
            {!history ? (
              <Shimmer className='h-48' />
            ) : history?.length ? (
              <div className='max-h-80 overflow-auto rounded-xl border border-slate-200'>
                <table className='min-w-full text-sm'>
                  <thead className='bg-slate-50 text-slate-600'>
                    <tr>
                      <th className='px-3 py-2 text-left'>Date</th>
                      <th className='px-3 py-2 text-left'>Set #</th>
                      <th className='px-3 py-2 text-left'>Weight×Reps</th>
                      <th className='px-3 py-2 text-left'>
                        e1RM <Hint text='Estimated 1-rep max for that set.' />
                      </th>
                      <th className='px-3 py-2 text-left'>PR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={`${h.date}-${i}`} className='border-t border-slate-200'>
                        <td className='px-3 py-2'>{fmt.date(h.date)}</td>
                        <td className='px-3 py-2'>{h.setIndex}</td>
                        <td className='px-3 py-2'>
                          {fmt.num(h.weight)}×{fmt.num(h.reps)}
                        </td>
                        <td className='px-3 py-2'>{fmt.num(h.e1rm)}</td>
                        <td className='px-3 py-2'>{h.isPr ? '⭐' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-sm text-slate-500'>No attempts logged yet.</div>
            )}
          </Section>
        </div>
      )}

      {error ? <div className='mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>{String(error)}</div> : null}
    </div>
  );
}
