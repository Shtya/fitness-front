'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, BarChart3, Bell, CalendarDays, Dumbbell, Flame, Goal, HeartPulse, LineChart, PieChart as PieChartIcon, TrendingUp, Users, Settings, TimerReset, Apple, Salad, Sandwich, CheckCircle2, Layers, Star, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart as RLineChart, Line, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

export const cn = (...classes) => classes.filter(Boolean).join(' ');
const spring = { type: 'spring', stiffness: 120, damping: 16, mass: 0.8 };
const fadeUp = (i = 0) => ({
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.06 * i, ...spring } },
});

const kpis = [
  { label: 'Total Workouts', value: 24, delta: '+12%', icon: Dumbbell },
  { label: 'Completed Meals', value: '86%', delta: '+5%', icon: Apple },
  { label: 'Active Users', value: 1234, delta: '+8%', icon: Users },
  { label: 'Weekly Progress', value: '4.2 kg', delta: '-2.1%', icon: TrendingUp },
];

const revenue = [
  { name: 'Mon', value: 420 },
  { name: 'Tue', value: 560 },
  { name: 'Wed', value: 480 },
  { name: 'Thu', value: 640 },
  { name: 'Fri', value: 720 },
  { name: 'Sat', value: 460 },
  { name: 'Sun', value: 520 },
];

const macroSplit = [
  { name: 'Protein', value: 40 },
  { name: 'Carbs', value: 35 },
  { name: 'Fats', value: 25 },
];

const recentActivity = [
  { user: 'John Doe', action: 'completed Chest Day workout', time: '2h', icon: CheckCircle2 },
  { user: 'Sarah Smith', action: 'logged a new meal', time: '4h', icon: Salad },
  { user: 'Mike Johnson', action: 'new personal record (Deadlift 180kg)', time: '6h', icon: Star },
  { user: 'Emily Wilson', action: 'scheduled a training session', time: '1d', icon: CalendarDays },
];

const leaderboard = [
  { name: 'Ahmed', points: 1280 },
  { name: 'Lena', points: 1120 },
  { name: 'Hassan', points: 990 },
  { name: 'Maria', points: 940 },
];

export function GlowCard({ children, className }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={cn('card-glow', className)}>
      {' '}
      {children}
    </motion.div>
  );
}

function KPI({ icon: Icon, label, value, delta, i }) {
  return (
    <GlowCard className='p-5 overflow-hidden' key={label}>
      <motion.div variants={fadeUp(i)} initial='hidden' animate='show' className='flex items-start justify-between'>
        <div>
          <div className='text-sm text-slate-500 mb-1 flex items-center gap-2'>
            <Icon className='size-4' />
            {label}
          </div>
          <div className='text-3xl font-semibold tracking-tight'>{value}</div>
          <div className={cn('mt-2 text-xs font-medium', String(delta).startsWith('-') ? 'text-rose-600' : 'text-emerald-600')}>{delta} vs last week</div>
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.08 * i, ...spring }} className='h-12 w-12  bg-main flex-none !rounded-full before:!rounded-full text-white flex items-center justify-center'>
          <Icon className='size-7  ' />
        </motion.div>
      </motion.div>
    </GlowCard>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className='flex items-center justify-between mb-4'>
      <div>
        <div className='flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider'>
          <Icon className='size-4' />
          {subtitle}
        </div>
        <h3 className='text-lg md:text-xl font-semibold text-slate-800'>{title}</h3>
      </div>
      {right}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/60', className)} />;
}

// ---------- main ----------
export default function GymDashboard() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className='min-h-screen w-full'>
      <main className=' '>
        <motion.div initial='hidden' animate='show' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {kpis.map((k, i) => (
            <KPI key={k.label} icon={k.icon} label={k.label} value={k.value} delta={k.delta} i={i} />
          ))}
        </motion.div>
        {/* Primary grid */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
          {/* Left column (2/3) */}
          <div className='space-y-6 xl:col-span-2'>
            <GlowCard className='p-5'>
              <SectionHeader icon={BarChart3} subtitle='Business' title='Membership Revenue (7 days)' />
              {loading ? (
                <Skeleton className='h-56' />
              ) : (
                <div className='h-56'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={revenue} margin={{ top: 8, right: 8, left: -18 }}>
                      <CartesianGrid strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey='name' tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ opacity: 0.1 }} />
                      <Bar dataKey='value' radius={[8, 8, 0, 0]} fill='#8b5cf6' />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlowCard>

            <GlowCard className='p-5'>
              <SectionHeader icon={Activity} subtitle='Activity' title='Recent Member Activity' right={<button className='text-xs text-indigo-600 hover:underline'>View all</button>} />
              <div className='divide-y divide-slate-200/80'>
                {recentActivity.map((a, i) => (
                  <motion.div key={i} variants={fadeUp(i)} initial='hidden' animate='show' className='flex items-start gap-3 py-3'>
                    <div className='h-10 w-10 rounded-full bg-indigo-50 grid place-content-center'>
                      <a.icon className='size-5 text-indigo-600' />
                    </div>
                    <div className='flex-1'>
                      <p className='text-sm text-slate-800'>
                        <span className='font-medium'>{a.user}</span> {a.action}
                      </p>
                      <p className='text-xs text-slate-500'>{a.time} ago</p>
                    </div>
                    <button className='text-xs text-slate-500 hover:text-slate-700'>Details</button>
                  </motion.div>
                ))}
              </div>
            </GlowCard>
          </div>

          {/* Right column (1/3) */}
          <div className='space-y-6'>
            <GlowCard className='p-5'>
              <SectionHeader icon={PieChartIcon} subtitle='Nutrition' title='Macro Split' />
              {loading ? (
                <Skeleton className='h-48' />
              ) : (
                <div className='h-48'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie data={macroSplit} innerRadius={52} outerRadius={72} paddingAngle={8} dataKey='value'>
                        {macroSplit.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className='mt-3 grid grid-cols-3 gap-2 text-xs'>
                {macroSplit.map((m, i) => (
                  <div key={i} className='flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full' style={{ background: pieColors[i % pieColors.length] }} />
                    <span className='text-slate-600'>{m.name}</span>
                    <span className='ml-auto font-medium'>{m.value}%</span>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard className='p-5'>
              <SectionHeader icon={Users} subtitle='Gamification' title='Leaderboard' />
              <div className='space-y-2'>
                {leaderboard.map((m, i) => (
                  <motion.div key={i} variants={fadeUp(i)} initial='hidden' animate='show' className='flex items-center gap-3 rounded-lg border border-slate-200/70 p-3'>
                    <div className='size-9 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 text-white grid place-content-center font-semibold'>{m.name.charAt(0)}</div>
                    <div className='flex-1'>
                      <div className='flex items-center justify-between'>
                        <p className='text-sm font-medium text-slate-800'>{m.name}</p>
                        <p className='text-sm font-semibold'>{m.points}</p>
                      </div>
                      <div className='mt-1 h-2 rounded-full bg-slate-100'>
                        <div className='h-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500' style={{ width: `${(m.points / leaderboard[0].points) * 100}%` }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlowCard>
          </div>
        </div>{' '}
      </main>
    </div>
  );
}
