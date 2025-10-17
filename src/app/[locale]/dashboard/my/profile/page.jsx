'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  PlayCircle,
  Trophy,
  FileText,
  MessageSquareText,
  Upload,
  ArrowUpRight,
  Calendar,
  Clock
} from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';
import Img from '@/components/atoms/Img';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';

// ------------------------- helpers & styling ------------------------- //
const card = 'rounded-lg border border-slate-200 bg-white shadow-sm p-4 md:p-5';
const glow = 'hover:shadow-md transition shadow-sm';
const sectionTitle = 'text-base md:text-lg font-semibold text-slate-900';
const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

const StatPill = ({ icon: Icon, label, value }) => (
  <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm'>
    <Icon className='h-4 w-4 text-slate-500' />
    <span className='text-xs text-slate-500'>{label}</span>
    <span className='text-sm font-semibold'>{value}</span>
  </div>
);

// ------------------------------- mock (replace with API) ------------------------------- //
const mockUser = {
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
  activeExercisePlan: { id: 'ex-42', name: 'PPL — Hypertrophy' },
  activeMealPlan: { id: 'mp-7', name: 'Lean Bulk 2700 kcal' },
  points: 120,
};

const weightTrend = [
  { date: 'Aug 01', weight: 83.5 },
  { date: 'Aug 15', weight: 82.9 },
  { date: 'Sep 01', weight: 82.3 },
  { date: 'Sep 15', weight: 81.8 },
  { date: 'Oct 01', weight: 81.4 },
  { date: 'Oct 15', weight: 80.9 },
];

const notifications = [
  { id: 1, title: 'New Intake Form submitted', date: '2025-10-12 08:32', unread: true },
  { id: 2, title: 'Subscription reminder', date: '2025-10-05 11:03', unread: false },
];

const prList = [
  { lift: 'Bench Press', e1rm: 108, date: '2025-10-10' },
  { lift: 'Deadlift', e1rm: 185, date: '2025-09-28' },
  { lift: 'Squat', e1rm: 150, date: '2025-10-02' },
];

const bodyPhotos = [
  { id: 'bp-1', month: 'Aug 2025', weight: 83.5, note: 'Start phase', front: '/placeholder/front-1.jpg', back: '/placeholder/back-1.jpg', left: '/placeholder/left-1.jpg', right: '/placeholder/right-1.jpg' },
  { id: 'bp-2', month: 'Sep 2025', weight: 82.3, note: 'Consistency', front: '/placeholder/front-2.jpg', back: '/placeholder/back-2.jpg', left: '/placeholder/left-2.jpg', right: '/placeholder/right-2.jpg' },
];

// ------------------------------- page ------------------------------- //
export default function ProfilePage() {
  const [tab, setTab] = useState('overview');

  // modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  // units example (uses <Select />)
  const [unit, setUnit] = useState('metric');

  const weightDelta = useMemo(() => {
    if (!weightTrend.length) return '0.0';
    const first = weightTrend[0].weight;
    const last = weightTrend[weightTrend.length - 1].weight;
    return (last - first).toFixed(1);
  }, []);

  // header stats to mirror Exercises page look
  const headerStats = (
    <>
      <StatCard icon={Dumbbell} title='Workout Plan' value={mockUser.activeExercisePlan?.name || '-'} />
      <StatCard icon={Utensils} title='Meal Plan' value={mockUser.activeMealPlan?.name || '-'} />
      <StatCard icon={Clock} title='Subscription' value={`${mockUser.subscriptionStart} → ${mockUser.subscriptionEnd}`} />
      <StatCard icon={Trophy} title='Points' value={mockUser.points} />
    </>
  );

  // tabs (use your TabsPill component)
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'body', label: 'Body & Metrics' },
    { key: 'photos', label: 'Photos Timeline' },
    { key: 'exercise', label: 'Exercise' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'assets', label: 'Assets' },
    { key: 'forms', label: 'Forms' },
  ];

  return (
    <div className='space-y-6'>
      {/* Gradient header reused to match reference UI colors */}
      <GradientStatsHeader title='Profile' desc='Identity, plans, progress, and uploads.' loadingStats={false}>
        {headerStats}
      </GradientStatsHeader>

      {/* Tabs */}
      <TabsPill id='profile-tabs' tabs={tabs} active={tab} onChange={setTab} className='!bg-white' />

      <AnimatePresence mode='wait'>
        {/* ----------------------------- OVERVIEW ----------------------------- */}
        {tab === 'overview' && (
          <motion.div key='overview' {...fade} className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
            {/* Identity */}
            <div className={card}>
              <div className='flex items-start gap-3'>
                <div className='h-12 w-12 rounded-lg bg-slate-100 grid place-items-center border border-slate-200'>
                  <UserIcon className='h-6 w-6 text-slate-700' />
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <h2 className='text-lg font-semibold text-slate-900 truncate'>{mockUser.name}</h2>
                    <span className='inline-flex items-center gap-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] px-2 py-1 border border-indigo-200'>
                      {mockUser.role}
                    </span>
                  </div>
                  <div className='mt-1 text-sm text-slate-600'>{mockUser.email}</div>
                  <div className='mt-1 text-sm text-slate-600'>Phone: <span className='font-medium'>{mockUser.phone}</span></div>
                  <div className='mt-1 text-sm text-slate-600'>Coach: <span className='font-medium'>{mockUser.coach?.name || '-'}</span></div>
                  <div className='mt-1 text-sm text-slate-600'>Membership: <span className='font-medium'>{mockUser.membership}</span></div>
                </div>
              </div>
              <div className='mt-4 flex items-center gap-2'>
                <Button name='Edit Profile' className={`!w-fit ${glow}`} />
                <Button name='Switch Plan' color='primary' className='!w-fit' />
              </div>
            </div>

            {/* Weight summary */}
            <div className={card}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <Scale className='h-4 w-4 text-slate-500' />
                  <div className={sectionTitle}>Weight (last 90 days)</div>
                </div>
                <StatPill icon={ArrowUpRight} label='Delta (kg)' value={weightDelta} />
              </div>
              {/* lightweight spark-like list (swap with your charts lib if available) */}
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600'>
                {weightTrend.map((p) => (
                  <div key={p.date} className='rounded-lg border border-slate-200 p-2 flex items-center justify-between'>
                    <span>{p.date}</span>
                    <span className='font-semibold'>{p.weight}</span>
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
                {notifications.map((n) => (
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
          </motion.div>
        )}

        {/* ----------------------------- BODY & METRICS ----------------------------- */}
        {tab === 'body' && (
          <motion.div key='body' {...fade} className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
            {/* Quick metrics + add */}
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Ruler className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Body metrics</div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <StatPill icon={Scale} label='Weight' value={`${weightTrend[weightTrend.length - 1].weight} kg`} />
                <StatPill icon={Ruler} label='Waist' value='84 cm' />
                <StatPill icon={Ruler} label='Chest' value='101 cm' />
                <StatPill icon={Ruler} label='Hips' value='96 cm' />
              </div>

              <div className='mt-4'>
                <div className='text-sm font-medium mb-2'>Add measurement</div>
                <div className='grid grid-cols-2 gap-2'>
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Weight (kg)' />
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Waist (cm)' />
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Chest (cm)' />
                  <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Hips (cm)' />
                </div>
                <div className='mt-2 flex items-center gap-2'>
                  <Select
                    className='!w-[160px]'
                    placeholder='Units'
                    options={[{ id: 'metric', label: 'Metric' }, { id: 'imperial', label: 'Imperial' }]}
                    value={unit}
                    onChange={setUnit}
                  />
                  <Button name='Save' color='primary' className='!w-fit' />
                  <Button name='Cancel' className='!w-fit' />
                </div>
              </div>
            </div>

            {/* Weight card (compact) */}
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
                  {weightTrend.slice().reverse().map((p) => (
                    <tr key={p.date} className='border-t border-slate-100'>
                      <td className='py-2'>{p.date}</td>
                      <td className='py-2 text-right font-medium'>{p.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick actions */}
            <div className={card}>
              <div className='text-sm font-medium mb-2'>Quick actions</div>
              <div className='flex flex-wrap gap-2'>
                <Button name='Add Body Photos' color='primary' className='!w-fit' onClick={() => setUploadOpen(true)} />
                <Button name='Export Measurements' className='!w-fit' />
              </div>
            </div>
          </motion.div>
        )}

        {/* ----------------------------- PHOTOS TIMELINE ----------------------------- */}
        {tab === 'photos' && (
          <motion.div key='photos' {...fade} className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Camera className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Upload body photos</div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                {['Front','Back','Left','Right'].map((label) => (
                  <label key={label} className={`flex flex-col items-center justify-center ${glow} rounded-lg border border-slate-200 bg-white p-4 aspect-[4/3] cursor-pointer`}>
                    <Upload className='h-6 w-6 text-slate-500' />
                    <div className='mt-2 text-sm font-medium'>{label}</div>
                    <input type='file' accept='image/*' className='hidden' />
                  </label>
                ))}
              </div>
              <div className='mt-3 grid grid-cols-2 gap-2'>
                <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Weight (kg)' />
                <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Note (optional)' />
              </div>
              <div className='mt-3 flex gap-2'>
                <Button name='Save set' color='primary' className='!w-fit' />
                <Button name='Clear' className='!w-fit' />
              </div>
            </div>

            <div className={`lg:col-span-2 ${card}`}>
              <div className='flex items-center gap-2 mb-3'>
                <ImageIcon className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Timeline</div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {bodyPhotos.map((entry) => (
                  <div key={entry.id} className='rounded-lg border border-slate-200 p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <div>
                        <div className='text-sm font-semibold'>{entry.month}</div>
                        <div className='text-xs text-slate-500'>{entry.note}</div>
                      </div>
                      <div className='text-sm font-medium'>{entry.weight} kg</div>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      {['front','back','left','right'].map((side) => (
                        <button key={side} onClick={() => setPhotoPreview({ src: entry[side], label: side })} className='overflow-hidden rounded-lg border border-slate-200 bg-slate-50'>
                          <img src={entry[side]} className='h-40 w-full object-cover' alt={side} />
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

        {/* ----------------------------- EXERCISE ----------------------------- */}
        {tab === 'exercise' && (
          <motion.div key='exercise' {...fade} className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Dumbbell className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Active plan</div>
              </div>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-slate-600'>Plan</span>
                  <span className='font-medium'>{mockUser.activeExercisePlan?.name}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-slate-600'>Coach</span>
                  <span className='font-medium'>{mockUser.coach?.name}</span>
                </div>
              </div>
              <div className='mt-3 flex gap-2'>
                <Button name='Open workouts' color='primary' className='!w-fit' />
                <Button name='PR history' className='!w-fit' />
              </div>
            </div>

            <div className={`lg:col-span-2 ${card}`}>
              <div className='flex items-center gap-2 mb-3'>
                <FileText className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Recent PRs (E1RM)</div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                {prList.map((p) => (
                  <div key={p.lift} className='rounded-lg border border-slate-200 p-3'>
                    <div className='text-sm font-medium'>{p.lift}</div>
                    <div className='text-xs text-slate-500'>Last PR: {p.date}</div>
                    <div className='mt-1 text-lg font-semibold'>{p.e1rm} kg</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ----------------------------- NUTRITION ----------------------------- */}
        {tab === 'nutrition' && (
          <motion.div key='nutrition' {...fade} className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Utensils className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Active meal plan</div>
              </div>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-slate-600'>Plan</span>
                  <span className='font-medium'>{mockUser.activeMealPlan?.name}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-slate-600'>Streak</span>
                  <span className='font-medium'>7 days</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-slate-600'>Avg adherence</span>
                  <span className='font-medium'>4.4 / 5</span>
                </div>
              </div>
              <div className='mt-3 flex gap-2'>
                <Button name='Open meals' color='primary' className='!w-fit' />
                <Button name='Logs' className='!w-fit' />
              </div>
            </div>

            <div className={`lg:col-span-2 ${card}`}>
              <div className='flex items-center gap-2 mb-3'>
                <Calendar className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>This week</div>
              </div>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                {['Sat','Sun','Mon','Tue','Wed','Thu','Fri'].map((d, i) => (
                  <div key={d} className='rounded-lg border border-slate-200 p-3 text-center'>
                    <div className='text-xs text-slate-500'>{d}</div>
                    <div className='mt-1 text-sm font-semibold'>{[4.2,5,3.8,4.5,4.9,4.1,4.7][i]}</div>
                    <div className='text-[11px] text-slate-500'>Adherence</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ----------------------------- ASSETS ----------------------------- */}
        {tab === 'assets' && (
          <motion.div key='assets' {...fade} className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
            <div className={`lg:col-span-2 ${card}`}>
              <div className='flex items-center gap-2 mb-3'>
                <ImageIcon className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Assets</div>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
                {[{name:'meal-plan-v2.pdf', type:'pdf'},{name:'shoulder-mobility.mp4', type:'video'},{name:'form-checklist.png', type:'image'}].map((a) => (
                  <a key={a.name} href='#' className={`rounded-lg border border-slate-200 p-3 bg-white ${glow}`}>
                    <div className='text-sm font-medium truncate'>{a.name}</div>
                    <div className='mt-1 text-xs text-slate-500'>{a.type}</div>
                  </a>
                ))}
              </div>
            </div>
            <div className={card}>
              <div className='text-sm font-medium mb-2'>Upload new</div>
              <label className={`flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 cursor-pointer bg-white ${glow}`}>
                <span className='text-sm'>Choose file</span>
                <Upload className='h-4 w-4 text-slate-500' />
                <input type='file' className='hidden' />
              </label>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Category' />
                <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Type (image/pdf/video)' />
              </div>
              <Button name='Upload' color='primary' className='!w-fit mt-3' />
            </div>
          </motion.div>
        )}

        {/* ----------------------------- FORMS ----------------------------- */}
        {tab === 'forms' && (
          <motion.div key='forms' {...fade} className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
            <div className={`lg:col-span-2 ${card}`}>
              <div className='flex items-center gap-2 mb-3'>
                <FileText className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>Form submissions</div>
              </div>
              <div className='divide-y divide-slate-100'>
                {[{id:1,title:'Onboarding Intake',date:'2025-08-01'},{id:2,title:'Injury History',date:'2025-08-02'}].map(f => (
                  <div key={f.id} className='py-2 flex items-center justify-between'>
                    <div>
                      <div className='text-sm font-medium'>{f.title}</div>
                      <div className='text-xs text-slate-500'>{f.date}</div>
                    </div>
                    <Button name='Open' className='!w-fit' />
                  </div>
                ))}
              </div>
            </div>
            <div className={card}>
              <div className='text-sm font-medium mb-2'>Assign new form</div>
              <input className='h-10 w-full rounded-lg border border-slate-200 px-3' placeholder='Form title' />
              <Button name='Assign' color='primary' className='!w-fit mt-2' />
            </div>
          </motion.div>
        )}
 
      </AnimatePresence>

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title='Add body photo set'>
        <div className='space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            {['Front','Back','Left','Right'].map((label) => (
              <label key={label} className={`flex flex-col items-center justify-center ${glow} rounded-lg border border-slate-200 bg-white p-4 aspect-[4/3] cursor-pointer`}>
                <Upload className='h-6 w-6 text-slate-500' />
                <div className='mt-2 text-sm font-medium'>{label}</div>
                <input type='file' accept='image/*' className='hidden' />
              </label>
            ))}
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Weight (kg)' />
            <input className='h-10 rounded-lg border border-slate-200 px-3' placeholder='Note (optional)' />
          </div>
          <div className='flex gap-2'>
            <Button name='Save set' color='primary' className='!w-fit' />
            <Button name='Cancel' className='!w-fit' onClick={() => setUploadOpen(false)} />
          </div>
        </div>
      </Modal>

      {/* Photo preview */}
      <Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} title={photoPreview?.label || 'Preview'} maxW='max-w-3xl'>
        {photoPreview && (
          <div className='rounded-lg overflow-hidden border border-slate-200'>
            <img src={photoPreview.src} alt={photoPreview.label} className='w-full h-auto object-contain' />
          </div>
        )}
      </Modal>
 
    </div>
  );
}
