'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Bell,
  Dumbbell,
  Utensils,
  Scale,
  Ruler,
  Camera,
  Image as ImageIcon,
  Upload,
  ArrowUpRight,
  Clock,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Trophy,
} from 'lucide-react';

// Re‑use your existing atoms/molecules
import api from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';

/* ============================ Helpers & tiny UI ============================ */
const card = 'rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-4 md:p-5';
const sectionTitle = 'text-base md:text-lg font-semibold text-slate-900';
const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

function SparkBar({ value = 0 }) {
  return (
    <div className='h-2 w-full overflow-hidden rounded-full bg-slate-100'>
      <div
        className='h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500/90 to-blue-600 transition-[width] duration-500'
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function BeforeAfter({ before, after, name }) {
  const [pos, setPos] = useState(50);
  return (
    <div className='relative aspect-[4/3] w-full rounded-xl overflow-hidden select-none bg-slate-200 border border-slate-200'>
      {before ? (
        <img src={before} alt={`${name} before`} className='absolute inset-0 w-full h-full object-cover' />
      ) : (
        <div className='absolute inset-0 bg-slate-300' />
      )}
      <div className='absolute inset-0' style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {after ? (
          <img src={after} alt={`${name} after`} className='w-full h-full object-cover' />
        ) : (
          <div className='w-full h-full bg-slate-400' />
        )}
      </div>
      <div className='absolute inset-y-0' style={{ left: `${pos}%` }}>
        <div className='h-full w-[2px] bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]' />
        <div className='absolute -top-4 -translate-x-1/2 left-0 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full'>Slide</div>
      </div>
      <input
        type='range'
        value={pos}
        min={0}
        max={100}
        onChange={e => setPos(Number(e.target.value))}
        className='absolute inset-0 opacity-0 cursor-ew-resize'
        aria-label='Compare before and after'
      />
    </div>
  );
}

/* ============================ Page ============================ */
export default function ProfileOverviewRedesign() {
  const [tab, setTab] = useState('overview');

  // ---------- Fake data (instant UI) ----------
  const [user, setUser] = useState({
    id: 'u-1',
    name: 'John Carter',
    email: 'john@example.com',
    phone: '+20 100 000 0000',
    role: 'client',
    status: 'active',
    membership: 'Gold',
    coach: { id: 'c-2', name: 'Coach Kareem' },
    subscriptionStart: '2025-08-01',
    subscriptionEnd: '2026-02-01',
    points: 120,
    activeExercisePlan: { id: 'ex-42', name: 'PPL — Hypertrophy' },
    activeMealPlan: { id: 'mp-7', name: 'Lean Bulk 2700 kcal' },
  });

  const [weights, setWeights] = useState([
    { date: '2025-08-01', weight: 83.5 },
    { date: '2025-08-15', weight: 82.9 },
    { date: '2025-09-01', weight: 82.3 },
    { date: '2025-09-15', weight: 81.8 },
    { date: '2025-10-01', weight: 81.4 },
    { date: '2025-10-15', weight: 80.9 },
    { date: '2025-10-17', weight: 80.6 },
  ]);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Intake Form submitted', date: '2025-10-12 08:32', unread: true },
    { id: 2, title: 'Subscription reminder', date: '2025-10-05 11:03', unread: false },
    { id: 3, title: 'Coach left a note on Week 3', date: '2025-10-03 09:15', unread: false },
  ]);

  // Dummy Unsplash placeholders (safe to test)
  const [photoMonths, setPhotoMonths] = useState([
    {
      id: 'bp-1',
      month: 'Aug 2025',
      weight: 83.5,
      note: 'Start phase',
      sides: {
        front: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=1200&auto=format&fit=crop',
        back: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop',
        left: 'https://images.unsplash.com/photo-1554344728-77cf90d9ed26?q=80&w=1200&auto=format&fit=crop',
        right: 'https://images.unsplash.com/photo-1554344728-77cf90d9ed26?q=80&w=1200&auto=format&fit=crop',
      },
    },
    {
      id: 'bp-2',
      month: 'Sep 2025',
      weight: 82.3,
      note: 'Consistency',
      sides: {
        front: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop',
        back: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop',
        left: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop',
        right: 'https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?q=80&w=1200&auto=format&fit=crop',
      },
    },
    {
      id: 'bp-3',
      month: 'Oct 2025',
      weight: 80.6,
      note: 'Cut phase',
      sides: {
        front: 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?q=80&w=1200&auto=format&fit=crop',
        back: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop',
        left: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop',
        right: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop',
      },
    },
  ]);

  const [recentPRs, setRecentPRs] = useState([
    { lift: 'Bench Press', e1rm: 108, date: '2025-10-10' },
    { lift: 'Deadlift', e1rm: 185, date: '2025-09-28' },
    { lift: 'Squat', e1rm: 150, date: '2025-10-02' },
    { lift: 'Overhead Press', e1rm: 72, date: '2025-09-22' },
    { lift: 'Barbell Row', e1rm: 105, date: '2025-10-09' },
  ]);

  // ---------- UI state ----------
  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const scrollerRef = useRef(null);

  // Measurements form (cm/kg only, date required)
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mWeight, setMWeight] = useState('');
  const [mWaist, setMWaist] = useState('');
  const [mChest, setMChest] = useState('');
  const [mHips, setMHips] = useState('');
  const [savingMeasure, setSavingMeasure] = useState(false);

  // Photo upload form
  const [pFront, setPFront] = useState(null);
  const [pBack, setPBack] = useState(null);
  const [pLeft, setPLeft] = useState(null);
  const [pRight, setPRight] = useState(null);
  const [pWeight, setPWeight] = useState('');
  const [pNote, setPNote] = useState('');
  const [pDate, setPDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pTime, setPTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [savingPhotos, setSavingPhotos] = useState(false);

  // Compare state
  const [compare, setCompare] = useState({ side: 'front', beforeId: 'bp-1', afterId: 'bp-3' });

  // If you want to hydrate from backend later, just uncomment
  useEffect(() => {
    // (async () => {
    //   const u = await api.get('/users/me'); setUser(u.data);
    //   const w = await api.get('/metrics/weights?days=120'); setWeights(w.data);
    //   const n = await api.get('/notifications'); setNotifications(n.data);
    //   const ph = await api.get('/photos/timeline'); setPhotoMonths(ph.data);
    //   const prs = await api.get('/exercise/prs'); setRecentPRs(prs.data);
    // })();
  }, []);

  const weightDelta = useMemo(() => {
    if (!weights.length) return '0.0';
    const first = weights[0].weight;
    const last = weights[weights.length - 1].weight;
    return (last - first).toFixed(1);
  }, [weights]);

  const lastWeight = weights[weights.length - 1]?.weight ?? '-';

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'body', label: 'Body & Metrics' },
    { key: 'photos', label: 'Photos Timeline' },
  ];

  /* ============================ Actions ============================ */
  const saveMeasurement = async () => {
    if (!mDate) return;
    setSavingMeasure(true);
    try {
      const payload = {
        date: mDate,
        weight: mWeight ? Number(mWeight) : undefined,
        waist: mWaist ? Number(mWaist) : undefined,
        chest: mChest ? Number(mChest) : undefined,
        hips: mHips ? Number(mHips) : undefined,
      };
      // await api.post('/metrics/measurements', payload);
      // Optimistic UI for demo
      if (payload.weight) setWeights(prev => [...prev, { date: payload.date, weight: payload.weight }]);
      setMWeight('');
      setMWaist('');
      setMChest('');
      setMHips('');
    } finally {
      setSavingMeasure(false);
    }
  };

  const savePhotoSet = async () => {
    if (!pFront && !pBack && !pLeft && !pRight) return;
    setSavingPhotos(true);
    try {
      // const fd = new FormData();
      // if (pFront) fd.append('front', pFront); // ...same for others
      // fd.append('takenAt', `${pDate}T${pTime || '12:00'}:00`);
      // if (pWeight) fd.append('weight', pWeight);
      // if (pNote) fd.append('note', pNote);
      // await api.post('/photos/upload-set', fd);

      const url = f => (f ? URL.createObjectURL(f) : undefined);
      const newEntry = {
        id: `bp-${Date.now()}`,
        month: new Date(pDate).toLocaleString('default', { month: 'short', year: 'numeric' }),
        weight: pWeight ? Number(pWeight) : null,
        note: pNote || '',
        sides: {
          front: url(pFront) || photoMonths[0]?.sides?.front,
          back: url(pBack) || photoMonths[0]?.sides?.back,
          left: url(pLeft) || photoMonths[0]?.sides?.left,
          right: url(pRight) || photoMonths[0]?.sides?.right,
        },
      };
      setPhotoMonths(prev => [newEntry, ...prev]);

      // reset form
      setPFront(null);
      setPBack(null);
      setPLeft(null);
      setPRight(null);
      setPWeight('');
      setPNote('');
      setUploadOpen(false);
    } finally {
      setSavingPhotos(false);
    }
  };

  const findPhotoById = id => photoMonths.find(p => p.id === id);
  const leftSrc = () => findPhotoById(compare.beforeId)?.sides?.[compare.side] || '';
  const rightSrc = () => findPhotoById(compare.afterId)?.sides?.[compare.side] || '';

  /* ============================ Render ============================ */
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='rounded-lg border border-slate-200 overflow-hidden shadow-sm'>
        <div className='bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white'>
          <div className='p-6 md:p-8'>
            <div className='flex items-center gap-4'>
              <div className='h-14 w-14 rounded-2xl bg-white/15 grid place-items-center ring-1 ring-white/20'>
                <UserIcon className='h-7 w-7 text-white' />
              </div>
              <div>
                <div className='text-xl md:text-2xl font-semibold'>{user?.name}</div>
                <div className='text-white/90 text-sm'>{user?.email} · {user?.phone}</div>
              </div>
              <span className='ml-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/25'>
                <Sparkles className='h-4 w-4' /> {user?.membership} Member
              </span>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-5'>
              <StatCard icon={Dumbbell} title='Workout Plan' value={user?.activeExercisePlan?.name || '-'} />
              <StatCard icon={Utensils} title='Meal Plan' value={user?.activeMealPlan?.name || '-'} />
              <StatCard icon={Clock} title='Subscription' value={`${user?.subscriptionStart} → ${user?.subscriptionEnd}`} />
              <StatCard icon={Trophy} title='Latest Weight' value={lastWeight} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabsPill id='profile-tabs' tabs={[...tabs]} active={tab} onChange={setTab} className='!bg-white' />

      <AnimatePresence mode='wait'>
        {/* ============================ OVERVIEW ============================ */}
        {tab === 'overview' && (
          <motion.div key='overview' {...fade} className='grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6'>
            {/* Identity */}
            <div className={card}>
              <div className='flex items-start gap-4'>
                <div className='h-14 w-14 rounded-2xl bg-slate-100 grid place-items-center border border-slate-200'>
                  <UserIcon className='h-7 w-7 text-slate-700' />
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <h2 className='text-lg font-semibold text-slate-900 truncate'>{user?.name}</h2>
                    <span className='inline-flex items-center gap-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] px-2 py-1 border border-indigo-200'>{user?.role}</span>
                  </div>
                  <div className='mt-1 text-sm text-slate-600'>{user?.email}</div>
                  <div className='mt-1 text-sm text-slate-600'>Phone: <span className='font-medium'>{user?.phone}</span></div>
                  <div className='mt-1 text-sm text-slate-600'>Coach: <span className='font-medium'>{user?.coach?.name || '-'}</span></div>
                </div>
              </div>
              <div className='mt-4 flex flex-wrap items-center gap-2'>
                <Button name='Edit Profile' className='!w-fit' />
                <Button name='Switch Plan' color='primary' className='!w-fit' />
                <Button name='Add Body Photos' color='primary' className='!w-fit' onClick={() => setUploadOpen(true)} />
              </div>
            </div>

            {/* Weight summary */}
            <div className={card}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <Scale className='h-4 w-4 text-slate-500' />
                  <div className={sectionTitle}>Weight Trend</div>
                </div>
                <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm'>
                  <ArrowUpRight className='h-4 w-4 text-slate-500' />
                  <span className='text-xs text-slate-500'>Delta (kg)</span>
                  <span className='text-sm font-semibold'>{weightDelta}</span>
                </div>
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {weights.map((p, i) => (
                  <div key={p.date} className='rounded-xl border border-slate-200 p-3'>
                    <div className='flex items-center justify-between text-xs text-slate-600'>
                      <span>{p.date}</span>
                      <span className='font-semibold text-slate-900'>{p.weight}</span>
                    </div>
                    <div className='mt-2'>
                      <SparkBar value={30 + i * 8} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Bell className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Notifications</div>
              </div>
              <div className='divide-y divide-slate-100'>
                {notifications.map(n => (
                  <div key={n.id} className='py-2 flex items-center justify-between'>
                    <div>
                      <div className='text-sm font-medium text-slate-900'>{n.title}</div>
                      <div className='text-xs text-slate-500'>{n.date}</div>
                    </div>
                    {n.unread && (
                      <span className='inline-flex items-center rounded-lg bg-emerald-50 text-emerald-700 text-[11px] px-2 py-1 border border-emerald-200'>New</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Compare Before/After */}
            <div className={`xl:col-span-3 ${card}`}>
              <div className='flex items-center gap-2 mb-3'>
                <ImageIcon className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Compare Progress</div>
              </div>

              <div className='grid md:grid-cols-4 gap-3'>
                <div className='space-y-2'>
                  <label className='text-xs text-slate-600'>Side</label>
                  <select
                    className='h-10 w-full rounded-lg border border-slate-200 px-3'
                    value={compare.side}
                    onChange={e => setCompare(s => ({ ...s, side: e.target.value }))}
                  >
                    <option value='front'>Front</option>
                    <option value='back'>Back</option>
                    <option value='left'>Left</option>
                    <option value='right'>Right</option>
                  </select>
                </div>
                <div className='space-y-2'>
                  <label className='text-xs text-slate-600'>Before</label>
                  <select
                    className='h-10 w-full rounded-lg border border-slate-200 px-3'
                    value={compare.beforeId}
                    onChange={e => setCompare(s => ({ ...s, beforeId: e.target.value }))}
                  >
                    {photoMonths.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.month} ({p.weight ?? '-'} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div className='space-y-2'>
                  <label className='text-xs text-slate-600'>After</label>
                  <select
                    className='h-10 w-full rounded-lg border border-slate-200 px-3'
                    value={compare.afterId}
                    onChange={e => setCompare(s => ({ ...s, afterId: e.target.value }))}
                  >
                    {photoMonths.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.month} ({p.weight ?? '-'} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div className='flex items-end'>
                  <Button
                    name='Preview'
                    color='primary'
                    className='!w-full'
                    disabled={!compare.beforeId || !compare.afterId}
                    onClick={() => setPhotoPreview({
                      src: null,
                      label: `Before/After — ${compare.side}`,
                      before: leftSrc(),
                      after: rightSrc(),
                    })}
                  />
                </div>
              </div>

              <div className='mt-4'>
                {compare.beforeId && compare.afterId ? (
                  <BeforeAfter before={leftSrc()} after={rightSrc()} name='progress' />
                ) : (
                  <div className='text-sm text-slate-500'>Choose two sets to preview.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================ BODY & METRICS ============================ */}
        {tab === 'body' && (
          <motion.div key='body' {...fade} className='grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6'>
            {/* Metrics snapshot */}
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Ruler className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Body metrics</div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm'>
                  <div className='text-xs text-slate-500'>Latest Weight</div>
                  <div className='mt-1 text-sm font-semibold'>{lastWeight} kg</div>
                </div>
                <div className='rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm'>
                  <div className='text-xs text-slate-500'>Last entry</div>
                  <div className='mt-1 text-sm font-semibold'>{weights[weights.length - 1]?.date || '-'}</div>
                </div>
              </div>

              <div className='mt-4'>
                <div className='text-sm font-medium mb-2'>Add measurement (kg / cm)</div>
                <div className='grid grid-cols-2 gap-2'>
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Weight (kg)' value={mWeight} onChange={e => setMWeight(e.target.value)} />
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Waist (cm)' value={mWaist} onChange={e => setMWaist(e.target.value)} />
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Chest (cm)' value={mChest} onChange={e => setMChest(e.target.value)} />
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Hips (cm)' value={mHips} onChange={e => setMHips(e.target.value)} />
                  <input type='date' className='h-10 rounded-lg border border-slate-200 px-3 col-span-2' value={mDate} onChange={e => setMDate(e.target.value)} />
                </div>
                <div className='mt-2 flex items-center gap-2'>
                  <Button name={savingMeasure ? 'Saving…' : 'Save'} color='primary' className='!w-fit' disabled={savingMeasure} onClick={saveMeasurement} />
                  <Button
                    name='Reset'
                    className='!w-fit'
                    onClick={() => {
                      setMWeight('');
                      setMWaist('');
                      setMChest('');
                      setMHips('');
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Weight table */}
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Scale className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Recent weights</div>
              </div>
              <table className='w-full text-sm'>
                <thead className='text-slate-500'>
                  <tr>
                    <th className='text-left font-normal pb-2'>Date</th>
                    <th className='text-right font-normal pb-2'>Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {weights
                    .slice()
                    .reverse()
                    .map(p => (
                      <tr key={p.date} className='border-t border-slate-100'>
                        <td className='py-2'>{p.date}</td>
                        <td className='py-2 text-right font-medium'>{p.weight}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* PR Highlights */}
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Trophy className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Recent PRs (E1RM)</div>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {recentPRs.map(p => (
                  <div key={p.lift} className='rounded-xl border border-slate-200 p-3 hover:shadow-sm transition'>
                    <div className='text-sm font-medium'>{p.lift}</div>
                    <div className='text-xs text-slate-500'>Last PR: {p.date}</div>
                    <div className='mt-1 text-lg font-semibold'>{p.e1rm} kg</div>
                    <div className='mt-2'>
                      <SparkBar value={Math.min(100, (p.e1rm / 200) * 100)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================ PHOTOS TIMELINE ============================ */}
        {tab === 'photos' && (
          <motion.div key='photos' {...fade} className='grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6'>
            {/* Upload */}
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Camera className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Upload body photos</div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                {[
                  { label: 'Front', setter: setPFront },
                  { label: 'Back', setter: setPBack },
                  { label: 'Left', setter: setPLeft },
                  { label: 'Right', setter: setPRight },
                ].map(({ label, setter }) => (
                  <label
                    key={label}
                    className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 aspect-[4/3] cursor-pointer hover:bg-slate-100 transition'
                  >
                    <Upload className='h-6 w-6 text-slate-500' />
                    <div className='mt-2 text-sm font-medium'>{label}</div>
                    <input type='file' accept='image/*' className='hidden' onChange={e => setter(e.target.files?.[0] || null)} />
                  </label>
                ))}
              </div>

              <div className='mt-3 grid grid-cols-2 gap-2'>
                <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Weight (kg)' value={pWeight} onChange={e => setPWeight(e.target.value)} />
                <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Note (optional)' value={pNote} onChange={e => setPNote(e.target.value)} />
                <input type='date' className='h-10 rounded-lg border border-slate-200 px-3 col-span-1' value={pDate} onChange={e => setPDate(e.target.value)} />
                <input type='time' className='h-10 rounded-lg border border-slate-200 px-3 col-span-1' value={pTime} onChange={e => setPTime(e.target.value)} />
              </div>

              <div className='mt-3 flex gap-2'>
                <Button name={savingPhotos ? 'Saving…' : 'Save set'} color='primary' className='!w-fit' onClick={savePhotoSet} disabled={savingPhotos} />
                <Button
                  name='Clear'
                  className='!w-fit'
                  onClick={() => {
                    setPFront(null);
                    setPBack(null);
                    setPLeft(null);
                    setPRight(null);
                    setPWeight('');
                    setPNote('');
                  }}
                />
              </div>

              <div className='mt-4 rounded-xl border border-slate-200 p-3 bg-slate-50'>
                <div className='text-sm font-semibold mb-1'>How to take progress photos</div>
                <ul className='text-xs text-slate-600 list-disc pl-4 space-y-1'>
                  <li>Same lighting & distance every time.</li>
                  <li>Neutral pose: front, back, left, right.</li>
                  <li>Use timer; stand tall; relax shoulders.</li>
                  <li>Wear similar clothes for consistency.</li>
                </ul>
              </div>
            </div>

            {/* Timeline */}
            <div className={`xl:col-span-2 ${card}`}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <ImageIcon className='h-4 w-4 text-slate-500' />
                  <div className={sectionTitle}>Timeline</div>
                </div>
                <div className='flex gap-1'>
                  <Button name={<ChevronsLeft size={16} />} className='!px-2' onClick={() => scrollerRef.current?.scrollBy({ left: -320, behavior: 'smooth' })} />
                  <Button name={<ChevronsRight size={16} />} className='!px-2' onClick={() => scrollerRef.current?.scrollBy({ left: 320, behavior: 'smooth' })} />
                </div>
              </div>

              <div ref={scrollerRef} className='flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2'>
                {photoMonths.map(entry => (
                  <div key={entry.id} className='min-w-[400px] snap-start rounded-xl border border-slate-200 p-3 bg-white'>
                    <div className='flex items-center justify-between mb-2'>
                      <div>
                        <div className='text-sm font-semibold'>{entry.month}</div>
                        <div className='text-xs text-slate-500'>{entry.note}</div>
                      </div>
                      <div className='text-sm font-medium'>{entry.weight ?? '-'} kg</div>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      {['front', 'back', 'left', 'right'].map(side => (
                        <button
                          key={side}
                          onClick={() => setPhotoPreview({ src: entry.sides?.[side], label: `${entry.month} — ${side}` })}
                          className='overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:shadow-sm transition'
                        >
                          <img src={entry.sides?.[side]} className='h-40 w-full object-contain' alt={side} />
                          <div className='px-2 py-1 text-xs text-slate-600 capitalize'>{side}</div>
                        </button>
                      ))}
                    </div> 
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title='Add body photo set'>
        <div className='space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            {[
              { label: 'Front', setter: setPFront },
              { label: 'Back', setter: setPBack },
              { label: 'Left', setter: setPLeft },
              { label: 'Right', setter: setPRight },
            ].map(({ label, setter }) => (
              <label
                key={label}
                className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 aspect_[4/3] cursor-pointer hover:bg-slate-100 transition'
              >
                <Upload className='h-6 w-6 text-slate-500' />
                <div className='mt-2 text-sm font-medium'>{label}</div>
                <input type='file' accept='image/*' className='hidden' onChange={e => setter(e.target.files?.[0] || null)} />
              </label>
            ))}
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Weight (kg)' value={pWeight} onChange={e => setPWeight(e.target.value)} />
            <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Note (optional)' value={pNote} onChange={e => setPNote(e.target.value)} />
            <input type='date' className='h-10 rounded-lg border border-slate-200 px-3 col-span-1' value={pDate} onChange={e => setPDate(e.target.value)} />
            <input type='time' className='h-10 rounded-lg border border-slate-200 px-3 col-span-1' value={pTime} onChange={e => setPTime(e.target.value)} />
          </div>
          <div className='flex gap-2'>
            <Button name={savingPhotos ? 'Saving…' : 'Save set'} color='primary' className='!w-fit' onClick={savePhotoSet} disabled={savingPhotos} />
            <Button name='Cancel' className='!w-fit' onClick={() => setUploadOpen(false)} />
          </div>
        </div>
      </Modal>

      {/* Photo preview */}
      <Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} title={photoPreview?.label || 'Preview'} maxW='max-w-3xl'>
        {photoPreview?.before || photoPreview?.after ? (
          <BeforeAfter before={photoPreview.before} after={photoPreview.after} name='preview' />
        ) : photoPreview?.src ? (
          <div className='rounded-xl overflow-hidden border border-slate-200'>
            <img src={photoPreview.src} alt={photoPreview.label} className='w-full h-auto object-contain' />
          </div>
        ) : (
          <div className='text-sm text-slate-600'>Use the compare block on Overview to preview Before/After.</div>
        )}
      </Modal>
    </div>
  );
}
