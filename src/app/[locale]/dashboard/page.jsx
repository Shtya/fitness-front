'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, BarChart3, Bell, CalendarDays, Dumbbell, Flame, Goal, HeartPulse, LineChart, PieChart as PieChartIcon, TrendingUp, Users, Settings, TimerReset, Apple, Salad, Sandwich, CheckCircle2, Layers, Star, Zap, UserCheck, AlertTriangle, Crown, Target, Clock, Award, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart as RLineChart, Line, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import api from '@/utils/axios';

export const cn = (...classes) => classes.filter(Boolean).join(' ');
const spring = { type: 'spring', stiffness: 120, damping: 16, mass: 0.8 };
const fadeUp = (i = 0) => ({
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.06 * i, ...spring } },
});

const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export function GlowCard({ children, className }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={cn('card-glow', className)}>
      {children}
    </motion.div>
  );
}

function KPI({ icon: Icon, label, value, delta, i, trend = 'up' }) {
  return (
    <GlowCard className='p-5 overflow-hidden' key={label}>
      <motion.div variants={fadeUp(i)} initial='hidden' animate='show' className='flex items-start justify-between'>
        <div>
          <div className='text-sm text-slate-500 mb-1 flex items-center gap-2'>
            <Icon className='size-4' />
            {label}
          </div>
          <div className='text-3xl font-semibold tracking-tight'>{value}</div>
          <div className={cn('mt-2 text-xs font-medium flex items-center gap-1', 
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'
          )}>
            {trend === 'up' ? <TrendingUp className='size-3' /> : trend === 'down' ? <TrendingDown className='size-3' /> : null}
            {delta} vs last period
          </div>
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.08 * i, ...spring }} className='h-12 w-12 bg-main flex-none !rounded-full before:!rounded-full text-white flex items-center justify-center'>
          <Icon className='size-7' />
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
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState(null);
  const [activityTrends, setActivityTrends] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [userDistribution, setUserDistribution] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [systemResponse, trendsResponse] = await Promise.all([
        api.get('/stats/system/overview'),
        api.get('/stats/system/activity-trends?days=7')
      ]);

      setSystemStats(systemResponse.data);
      setActivityTrends(trendsResponse.data.trends || []);
      
      // Generate recent activity from trends
      const activity = generateRecentActivity(trendsResponse.data.trends);
      setRecentActivity(activity);

      // Generate user distribution from system stats
      if (systemResponse.data.summary) {
        const distribution = [
          { name: 'Active', value: systemResponse.data.summary.activeUsers },
          { name: 'New This Month', value: systemResponse.data.summary.newUsersThisMonth },
          { name: 'Suspended', value: systemResponse.data.summary.suspendedUsers },
        ];
        setUserDistribution(distribution);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivity = (trends) => {
    if (!trends || trends.length === 0) return [];
    
    const activities = [];
    trends.slice(-4).forEach((trend, index) => {
      if (trend.workouts > 0) {
        activities.push({
          user: `${trend.workouts} members`,
          action: 'completed workouts',
          time: index === 0 ? 'Today' : `${index + 1}d ago`,
          icon: Dumbbell
        });
      }
      if (trend.meals > 0 && activities.length < 4) {
        activities.push({
          user: `${trend.meals} meals`,
          action: 'were logged',
          time: index === 0 ? 'Today' : `${index + 1}d ago`,
          icon: Apple
        });
      }
    });
    
    // Fill with default activities if needed
    while (activities.length < 4) {
      activities.push({
        user: 'System',
        action: 'No recent activity',
        time: 'N/A',
        icon: Clock
      });
    }
    
    return activities;
  };

  const kpis = useMemo(() => {
    if (!systemStats) return [];
    
    return [
      { 
        label: 'Total Users', 
        value: systemStats.summary?.totalUsers || 0, 
        delta: `${systemStats.summary?.userGrowth || 0}%`, 
        icon: Users,
        trend: (systemStats.summary?.userGrowth || 0) >= 0 ? 'up' : 'down'
      },
      { 
        label: 'Active Users', 
        value: systemStats.summary?.activeUsers || 0, 
        delta: '+8%', 
        icon: UserCheck,
        trend: 'up'
      },
      { 
        label: 'Exercise Plans', 
        value: systemStats.plans?.exercisePlans || 0, 
        delta: `${systemStats.plans?.utilizationRate || 0}% utilization`, 
        icon: Target,
        trend: 'up'
      },
      { 
        label: 'Meal Logs', 
        value: systemStats.nutrition?.totalLogs || 0, 
        delta: `${systemStats.nutrition?.avgAdherence || 0} avg adherence`, 
        icon: Apple,
        trend: 'up'
      },
    ];
  }, [systemStats]);

  const activityChartData = useMemo(() => {
    return activityTrends.map(trend => ({
      name: new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short' }),
      workouts: trend.workouts,
      meals: trend.meals,
      activeUsers: trend.activeUsers,
    }));
  }, [activityTrends]);

  const leaderboard = useMemo(() => {
    // This would come from your API - using mock data for now
    return [
      { name: 'Ahmed', points: 1280, progress: 100 },
      { name: 'Lena', points: 1120, progress: 87 },
      { name: 'Hassan', points: 990, progress: 77 },
      { name: 'Maria', points: 940, progress: 73 },
    ];
  }, []);

  if (loading && !systemStats) {
    return (
      <div className='min-h-screen w-full p-6'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className='h-32' />
          ))}
        </div>
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
          <div className='space-y-6 xl:col-span-2'>
            <Skeleton className='h-80' />
            <Skeleton className='h-64' />
          </div>
          <div className='space-y-6'>
            <Skeleton className='h-80' />
            <Skeleton className='h-64' />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen w-full p-6'>
      <main>
        <motion.div initial='hidden' animate='show' className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {kpis.map((k, i) => (
            <KPI key={k.label} icon={k.icon} label={k.label} value={k.value} delta={k.delta} i={i} trend={k.trend} />
          ))}
        </motion.div>

        {/* Primary grid */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
          {/* Left column (2/3) */}
          <div className='space-y-6 xl:col-span-2'>
            {/* System Activity Chart */}
            <GlowCard className='p-5'>
              <SectionHeader 
                icon={Activity} 
                subtitle='System Analytics' 
                title='Platform Activity (7 Days)' 
                right={<button className='text-xs text-indigo-600 hover:underline'>View details</button>}
              />
              {loading ? (
                <Skeleton className='h-56' />
              ) : (
                <div className='h-56'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={activityChartData} margin={{ top: 8, right: 8, left: -18 }}>
                      <CartesianGrid strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey='name' tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ opacity: 0.1 }}
                        formatter={(value, name) => {
                          const labels = {
                            workouts: 'Workouts',
                            meals: 'Meals',
                            activeUsers: 'Active Users'
                          };
                          return [value, labels[name] || name];
                        }}
                      />
                      <Bar dataKey='workouts' radius={[8, 8, 0, 0]} fill='#6366f1' name='workouts' />
                      <Bar dataKey='meals' radius={[8, 8, 0, 0]} fill='#10b981' name='meals' />
                      <Bar dataKey='activeUsers' radius={[8, 8, 0, 0]} fill='#f59e0b' name='activeUsers' />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlowCard>

            {/* Recent System Activity */}
            <GlowCard className='p-5'>
              <SectionHeader 
                icon={Bell} 
                subtitle='Real-time' 
                title='Recent Platform Activity' 
                right={<button className='text-xs text-indigo-600 hover:underline'>View all</button>}
              />
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
                      <p className='text-xs text-slate-500'>{a.time}</p>
                    </div>
                    <button className='text-xs text-slate-500 hover:text-slate-700'>View</button>
                  </motion.div>
                ))}
              </div>
            </GlowCard>

            {/* System Health Metrics */}
            <GlowCard className='p-5'>
              <SectionHeader 
                icon={HeartPulse} 
                subtitle='System Health' 
                title='Platform Performance' 
              />
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center p-4 rounded-lg bg-slate-50'>
                  <div className='text-2xl font-bold text-slate-800'>{systemStats?.plans?.utilizationRate || 0}%</div>
                  <div className='text-sm text-slate-600'>Plan Utilization</div>
                </div>
                <div className='text-center p-4 rounded-lg bg-slate-50'>
                  <div className='text-2xl font-bold text-slate-800'>{systemStats?.nutrition?.avgAdherence || 0}/5</div>
                  <div className='text-sm text-slate-600'>Avg Meal Adherence</div>
                </div>
                <div className='text-center p-4 rounded-lg bg-slate-50'>
                  <div className='text-2xl font-bold text-slate-800'>{systemStats?.activity?.today?.activeUsers || 0}</div>
                  <div className='text-sm text-slate-600'>Active Today</div>
                </div>
                <div className='text-center p-4 rounded-lg bg-slate-50'>
                  <div className='text-2xl font-bold text-slate-800'>{systemStats?.summary?.newUsersThisMonth || 0}</div>
                  <div className='text-sm text-slate-600'>New This Month</div>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Right column (1/3) */}
          <div className='space-y-6'>
            {/* User Distribution */}
            <GlowCard className='p-5'>
              <SectionHeader icon={PieChartIcon} subtitle='Users' title='User Distribution' />
              {loading ? (
                <Skeleton className='h-48' />
              ) : (
                <div className='h-48'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie 
                        data={userDistribution} 
                        innerRadius={52} 
                        outerRadius={72} 
                        paddingAngle={8} 
                        dataKey='value'
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {userDistribution.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Users']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className='mt-3 space-y-2 text-xs'>
                {userDistribution.map((m, i) => (
                  <div key={i} className='flex items-center gap-2 justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='h-2 w-2 rounded-full' style={{ background: pieColors[i % pieColors.length] }} />
                      <span className='text-slate-600'>{m.name}</span>
                    </div>
                    <span className='font-medium'>{m.value}</span>
                  </div>
                ))}
              </div>
            </GlowCard>

            {/* Top Performers Leaderboard */}
            <GlowCard className='p-5'>
              <SectionHeader icon={Crown} subtitle='Performance' title='Top Members' />
              <div className='space-y-2'>
                {leaderboard.map((m, i) => (
                  <motion.div key={i} variants={fadeUp(i)} initial='hidden' animate='show' className='flex items-center gap-3 rounded-lg border border-slate-200/70 p-3'>
                    <div className='size-9 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 text-white grid place-content-center font-semibold'>
                      {m.name.charAt(0)}
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center justify-between'>
                        <p className='text-sm font-medium text-slate-800'>{m.name}</p>
                        <p className='text-sm font-semibold'>{m.points}</p>
                      </div>
                      <div className='mt-1 h-2 rounded-full bg-slate-100'>
                        <div 
                          className='h-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500' 
                          style={{ width: `${m.progress}%` }} 
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlowCard>

            {/* Quick Stats */}
            <GlowCard className='p-5'>
              <SectionHeader icon={Zap} subtitle='Quick Look' title="Today's Snapshot" />
              <div className='space-y-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-slate-600'>Workouts Completed</span>
                  <span className='font-semibold'>{systemStats?.activity?.today?.workouts || 0}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-slate-600'>Meals Logged</span>
                  <span className='font-semibold'>{systemStats?.activity?.today?.meals || 0}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-slate-600'>Active Sessions</span>
                  <span className='font-semibold'>{systemStats?.activity?.today?.activeUsers || 0}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-slate-600'>System Uptime</span>
                  <span className='font-semibold text-emerald-600'>99.9%</span>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      </main>
    </div>
  );
}