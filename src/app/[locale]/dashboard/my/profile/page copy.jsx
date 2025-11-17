"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { UtensilsCrossed, User as UserIcon, Dumbbell, Utensils, Scale, Ruler, Camera, Image as ImageIcon, Upload, ArrowUpRight, Clock, ChevronsLeft, ChevronsRight, Sparkles, Phone, Mail, Pencil, X, ShieldCheck, Activity, ImagePlus, Trash2, Edit3, Save, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const card = 'rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg hover:shadow-xl transition-shadow p-5 md:p-6';
const sectionTitle = 'text-lg md:text-xl font-bold text-slate-900';
const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28 } };

const toISODate = d => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const daysLeft = end => {
  if (!end) return null;
  const endDt = new Date(end + 'T23:59:59');
  const diff = Math.ceil((endDt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

function SparkBar({ value = 0 }) {
  return (
    <div className='h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner'>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className='h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600' 
      />
    </div>
  );
}

function WeightTrendChart({ measurements }) {
  if (!measurements.length) return null;
  
  const maxWeight = Math.max(...measurements.map(m => m.weight || 0));
  const minWeight = Math.min(...measurements.filter(m => m.weight).map(m => m.weight));
  const range = maxWeight - minWeight || 1;
  
  return (
    <div className='relative h-32 mt-4'>
      <svg className='w-full h-full' viewBox='0 0 400 100' preserveAspectRatio='none'>
        <defs>
          <linearGradient id='weightGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
            <stop offset='0%' stopColor='rgb(99, 102, 241)' stopOpacity='0.3' />
            <stop offset='100%' stopColor='rgb(99, 102, 241)' stopOpacity='0.05' />
          </linearGradient>
        </defs>
        
        {/* Area */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          d={measurements.reduce((path, m, i) => {
            const x = (i / (measurements.length - 1)) * 400;
            const y = 100 - ((m.weight - minWeight) / range) * 80;
            return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
          }, '') + ` L 400 100 L 0 100 Z`}
          fill='url(#weightGradient)'
        />
        
        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          d={measurements.reduce((path, m, i) => {
            const x = (i / (measurements.length - 1)) * 400;
            const y = 100 - ((m.weight - minWeight) / range) * 80;
            return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
          }, '')}
          fill='none'
          stroke='rgb(99, 102, 241)'
          strokeWidth='2.5'
        />
        
        {/* Points */}
        {measurements.map((m, i) => {
          const x = (i / (measurements.length - 1)) * 400;
          const y = 100 - ((m.weight - minWeight) / range) * 80;
          return (
            <motion.circle
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.05, duration: 0.3 }}
              cx={x}
              cy={y}
              r='4'
              fill='white'
              stroke='rgb(99, 102, 241)'
              strokeWidth='2'
            />
          );
        })}
      </svg>
    </div>
  );
}

function Btn({ children, onClick, disabled, className = '', size = 'md', variant = 'primary', type = 'button' }) {
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-6 text-base' };
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg border-0',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-md',
    danger: 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800 shadow-md',
    subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-0',
  };
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      className={['inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed', sizes[size], variants[variant], className].join(' ')}
    >
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children, maxW = 'max-w-2xl' }) {
  if (!open) return null;
  
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm' onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className={`w-full ${maxW} bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}
      >
        <div className='sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-slate-900'>{title}</h2>
          <button onClick={onClose} className='p-2 hover:bg-slate-100 rounded-lg transition'>
            <X size={20} />
          </button>
        </div>
        <div className='p-6'>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function Input({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label className='block'>
      <span className='text-sm font-medium text-slate-700 mb-1.5 block'>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className='w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition'
      />
    </label>
  );
}

function Select({ label, options, value, onChange, placeholder = 'Select...' }) {
  return (
    <label className='block'>
      {label && <span className='text-sm font-medium text-slate-700 mb-1.5 block'>{label}</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className='w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition bg-white'
      >
        <option value=''>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function ProfileOverviewPage() {
  const [tab, setTab] = useState('overview');
  const [user, setUser] = useState({
    id: '633c7739-31bb-4b41-bf1d-dd994d557694',
    name: 'Ahmed Hassan',
    email: 'ahmed083@gmail.com',
    phone: '+201551495772',
    membership: 'Premium',
    role: 'client',
    status: 'active',
    gender: 'male',
    points: 2350,
    defaultRestSeconds: 90,
    subscriptionStart: '2025-10-16',
    subscriptionEnd: '2026-04-15',
    caloriesTarget: 2500,
    proteinPerDay: 150,
    carbsPerDay: 250,
    fatsPerDay: 70,
    activityLevel: 'moderate',
    notes: 'Training for marathon',
    activeExercisePlan: { name: 'Advanced Strength' },
    activeMealPlan: { name: 'High Protein Diet' },
    coach: { id: 'aa', name: 'John Doe' },
  });

  const [measurements, setMeasurements] = useState([
    { id: '1', date: '2024-11-01', weight: 85, waist: 90, chest: 105 },
    { id: '2', date: '2024-11-08', weight: 84, waist: 89, chest: 105 },
    { id: '3', date: '2024-11-15', weight: 83.5, waist: 88, chest: 106 },
    { id: '4', date: '2024-11-17', weight: 83, waist: 87, chest: 106 },
  ]);

  const [photoMonths, setPhotoMonths] = useState([
    {
      id: '1',
      takenAt: 'Nov 2024',
      weight: 83,
      note: 'Progress check',
      sides: {
        front: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
        back: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
        left: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
        right: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      }
    }
  ]);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pFront, setPFront] = useState(null);
  const [pBack, setPBack] = useState(null);
  const [pLeft, setPLeft] = useState(null);
  const [pRight, setPRight] = useState(null);

  const lastWeight = measurements[measurements.length - 1]?.weight || 0;
  const firstWeight = measurements[0]?.weight || 0;
  const weightDelta = (lastWeight - firstWeight).toFixed(1);
  const weightTrend = weightDelta > 0 ? 'up' : weightDelta < 0 ? 'down' : 'stable';

  const openEditProfile = () => {
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      gender: user.gender || 'male',
      membership: user.membership || 'Basic',
      defaultRestSeconds: user.defaultRestSeconds || 90,
      caloriesTarget: user.caloriesTarget || 2000,
      proteinPerDay: user.proteinPerDay || 150,
      carbsPerDay: user.carbsPerDay || 200,
      fatsPerDay: user.fatsPerDay || 60,
      activityLevel: user.activityLevel || 'moderate',
      notes: user.notes || '',
    });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    // Simulate API call
    setTimeout(() => {
      setUser(prev => ({ ...prev, ...editForm }));
      setSavingProfile(false);
      setEditOpen(false);
    }, 1000);
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'body', label: 'Body Metrics' },
    { key: 'photos', label: 'Progress Photos' },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 p-4 md:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto space-y-6'>
        
        {/* Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-2xl overflow-hidden shadow-2xl'
        >
          <div className='bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white relative overflow-hidden'>
             
            <div className='relative p-6 md:p-8 lg:p-10'>
              <div className='flex flex-col md:flex-row md:items-center gap-6'>
                <div className='flex-shrink-0'>
                  <div className='h-24 w-24 rounded-2xl bg-white/15 backdrop-blur grid place-items-center ring-4 ring-white/20 shadow-xl'>
                    <UserIcon className='h-12 w-12 text-white' />
                  </div>
                </div>
                
                <div className='flex-1 min-w-0'>
                  <h1 className='text-3xl md:text-4xl font-bold mb-2'>{user.name}</h1>
                  <div className='flex flex-wrap items-center gap-4 text-white/90'>
                    <span className='inline-flex items-center gap-2'>
                      <Mail size={16} />
                      {user.email}
                    </span>
                    <span className='inline-flex items-center gap-2'>
                      <Phone size={16} />
                      {user.phone}
                    </span>
                  </div>
                </div>
                
                <Btn variant='primary' className='bg-white !text-indigo-700 hover:bg-white/90 self-start' onClick={openEditProfile}>
                  <Pencil size={16} className='mr-2' />
                  Edit Profile
                </Btn>
              </div>
              
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8'>
                {[
                  { icon: Dumbbell, label: 'Workout Plan', value: user.activeExercisePlan?.name || '-' },
                  { icon: Utensils, label: 'Meal Plan', value: user.activeMealPlan?.name || '-' },
                  { icon: Scale, label: 'Current Weight', value: `${lastWeight} kg` },
                  { icon: Activity, label: 'Total Points', value: user.points },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className='bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20'
                  >
                    <div className='flex items-center gap-3'>
                      <stat.icon className='h-6 w-6 text-white/80' />
                      <div>
                        <div className='text-xs text-white/70'>{stat.label}</div>
                        <div className='text-lg font-bold'>{stat.value}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className='flex gap-2 overflow-x-auto pb-2'>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 rounded-xl font-medium transition whitespace-nowrap ${
                tab === t.key
                  ? 'bg-white text-indigo-700 shadow-lg'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode='wait'>
          {tab === 'overview' && (
            <motion.div key='overview' {...fade} className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              
              {/* Weight Trend Card */}
              <div className={card}>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='h-10 w-10 rounded-lg bg-indigo-100 grid place-items-center'>
                      <Scale className='h-5 w-5 text-indigo-600' />
                    </div>
                    <div>
                      <h2 className={sectionTitle}>Weight Trend</h2>
                      <p className='text-sm text-slate-500'>Last 30 days</p>
                    </div>
                  </div>
                  
                  <div className='flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50'>
                    {weightTrend === 'up' && <TrendingUp className='h-5 w-5 text-rose-600' />}
                    {weightTrend === 'down' && <TrendingDown className='h-5 w-5 text-emerald-600' />}
                    {weightTrend === 'stable' && <Minus className='h-5 w-5 text-slate-600' />}
                    <span className={`font-bold ${weightTrend === 'up' ? 'text-rose-600' : weightTrend === 'down' ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                    </span>
                  </div>
                </div>
                
                <WeightTrendChart measurements={measurements} />
                
                <div className='grid grid-cols-2 gap-3 mt-6'>
                  {measurements.slice(-4).map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className='rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 p-4 border border-indigo-100'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-xs text-slate-600'>{m.date}</span>
                        <span className='text-lg font-bold text-indigo-700'>{m.weight} kg</span>
                      </div>
                      <SparkBar value={30 + i * 15} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Profile Info Card */}
              <div className={card}>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='h-10 w-10 rounded-lg bg-indigo-100 grid place-items-center'>
                    <UserIcon className='h-5 w-5 text-indigo-600' />
                  </div>
                  <div>
                    <h2 className={sectionTitle}>Profile Information</h2>
                    <p className='text-sm text-slate-500'>Your account details</p>
                  </div>
                </div>
                
                <div className='space-y-4'>
                  <div className='flex items-center justify-between p-3 rounded-lg bg-slate-50'>
                    <span className='text-sm text-slate-600'>Membership</span>
                    <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium'>
                      <Sparkles size={14} />
                      {user.membership}
                    </span>
                  </div>
                  
                  <div className='flex items-center justify-between p-3 rounded-lg bg-slate-50'>
                    <span className='text-sm text-slate-600'>Status</span>
                    <span className='px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium'>
                      {user.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className='flex items-center justify-between p-3 rounded-lg bg-slate-50'>
                    <span className='text-sm text-slate-600'>Coach</span>
                    <span className='font-medium text-slate-900'>{user.coach?.name || '-'}</span>
                  </div>
                  
                  <div className='flex items-center justify-between p-3 rounded-lg bg-slate-50'>
                    <span className='text-sm text-slate-600'>Subscription</span>
                    <span className='text-sm font-medium text-slate-900'>
                      {user.subscriptionEnd}
                    </span>
                  </div>
                  
                  <div className='flex items-center justify-between p-3 rounded-lg bg-slate-50'>
                    <span className='text-sm text-slate-600'>Days Remaining</span>
                    <span className='px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold'>
                      {daysLeft(user.subscriptionEnd) || 0} days
                    </span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {tab === 'body' && (
            <motion.div key='body' {...fade} className='grid grid-cols-1 gap-6'>
              <div className={card}>
                <h2 className={sectionTitle + ' mb-6'}>Body Measurements</h2>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-slate-200'>
                        <th className='text-left py-3 px-4 font-semibold text-slate-700'>Date</th>
                        <th className='text-right py-3 px-4 font-semibold text-slate-700'>Weight (kg)</th>
                        <th className='text-right py-3 px-4 font-semibold text-slate-700'>Waist (cm)</th>
                        <th className='text-right py-3 px-4 font-semibold text-slate-700'>Chest (cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.slice().reverse().map((m, i) => (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className='border-b border-slate-100 hover:bg-slate-50'
                        >
                          <td className='py-3 px-4 text-slate-600'>{m.date}</td>
                          <td className='py-3 px-4 text-right font-bold text-indigo-700'>{m.weight}</td>
                          <td className='py-3 px-4 text-right font-medium'>{m.waist}</td>
                          <td className='py-3 px-4 text-right font-medium'>{m.chest}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'photos' && (
            <motion.div key='photos' {...fade} className='space-y-6'>
              <div className={card}>
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center gap-3'>
                    <div className='h-10 w-10 rounded-lg bg-indigo-100 grid place-items-center'>
                      <Camera className='h-5 w-5 text-indigo-600' />
                    </div>
                    <div>
                      <h2 className={sectionTitle}>Progress Photos</h2>
                      <p className='text-sm text-slate-500'>Track your transformation</p>
                    </div>
                  </div>
                  <Btn variant='primary' onClick={() => setUploadOpen(true)}>
                    <ImagePlus size={16} className='mr-2' />
                    Upload Photos
                  </Btn>
                </div>

                {photoMonths.length === 0 ? (
                  <div className='text-center py-12 bg-slate-50 rounded-xl'>
                    <ImageIcon className='h-12 w-12 text-slate-400 mx-auto mb-3' />
                    <p className='text-slate-600 mb-4'>No progress photos yet</p>
                    <Btn variant='primary' onClick={() => setUploadOpen(true)}>
                      Upload Your First Photos
                    </Btn>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {photoMonths.map((entry, idx) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className='rounded-xl border border-slate-200 overflow-hidden bg-white shadow-lg hover:shadow-xl transition'
                      >
                        <div className='p-4 bg-gradient-to-r from-indigo-50 to-purple-50'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <h3 className='font-bold text-lg'>{entry.takenAt}</h3>
                              <p className='text-sm text-slate-600'>{entry.weight} kg</p>
                            </div>
                            <button className='p-2 hover:bg-white rounded-lg transition'>
                              <Trash2 size={18} className='text-rose-600' />
                            </button>
                          </div>
                        </div>
                        <div className='grid grid-cols-2 gap-2 p-4'>
                          {['front', 'back', 'left', 'right'].map(side => (
                            <div key={side} className='relative rounded-lg overflow-hidden aspect-[3/4] bg-slate-100'>
                              <img 
                                src={entry.sides?.[side]} 
                                alt={side}
                                className='w-full h-full object-cover'
                              />
                              <div className='absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2'>
                                <span className='text-white text-xs font-medium capitalize'>{side}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Profile Modal */}
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title='Edit Profile' maxW='max-w-3xl'>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Input 
                label='Name' 
                name='name' 
                value={editForm.name || ''} 
                onChange={val => setEditForm(prev => ({ ...prev, name: val }))}
              />
              
              <Input 
                label='Phone' 
                name='phone' 
                value={editForm.phone || ''} 
                onChange={val => setEditForm(prev => ({ ...prev, phone: val }))}
              />
              
              <Select
                label='Gender'
                options={[
                  { id: 'male', label: 'Male' },
                  { id: 'female', label: 'Female' }
                ]}
                value={editForm.gender || 'male'}
                onChange={val => setEditForm(prev => ({ ...prev, gender: val }))}
              />
              
              <Select
                label='Membership'
                options={[
                  { id: 'Basic', label: 'Basic' },
                  { id: 'Premium', label: 'Premium' },
                  { id: 'Elite', label: 'Elite' }
                ]}
                value={editForm.membership || 'Basic'}
                onChange={val => setEditForm(prev => ({ ...prev, membership: val }))}
              />
              
              <Input 
                label='Default Rest (seconds)' 
                name='defaultRestSeconds' 
                type='number'
                value={editForm.defaultRestSeconds || ''} 
                onChange={val => setEditForm(prev => ({ ...prev, defaultRestSeconds: val }))}
              />
              
              <Input 
                label='Calories Target' 
                name='caloriesTarget' 
                type='number'
                value={editForm.caloriesTarget || ''} 
                onChange={val => setEditForm(prev => ({ ...prev, caloriesTarget: val }))}
              />
              
              <Input 
                label='Protein Per Day (g)' 
                name='proteinPerDay' 
                type='number'
                value={editForm.proteinPerDay || ''} 
                onChange={val => setEditForm(prev => ({ ...prev, proteinPerDay: val }))}
              />
              
              <Input 
                label='Carbs Per Day (g)' 
                name='carbsPerDay' 
                type='number'
                value={editForm.carbsPerDay || ''} 
                onChange={val => setEditForm(prev => ({ ...prev, carbsPerDay: val }))}
              />
              
              <Input 
                label='Fats Per Day (g)' 
                name='fatsPerDay' 
                type='number'
                value={editForm.fatsPerDay || ''} 
                onChange={val => setEditForm(prev => ({ ...prev, fatsPerDay: val }))}
              />
              
              <Select
                label='Activity Level'
                options={[
                  { id: 'sedentary', label: 'Sedentary' },
                  { id: 'light', label: 'Light' },
                  { id: 'moderate', label: 'Moderate' },
                  { id: 'active', label: 'Active' },
                  { id: 'very_active', label: 'Very Active' }
                ]}
                value={editForm.activityLevel || 'moderate'}
                onChange={val => setEditForm(prev => ({ ...prev, activityLevel: val }))}
              />
            </div>
            
            <label className='block'>
              <span className='text-sm font-medium text-slate-700 mb-1.5 block'>Notes</span>
              <textarea
                value={editForm.notes || ''}
                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className='w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition'
                placeholder='Add any notes about your training...'
              />
            </label>
            
            <div className='flex gap-3 pt-4'>
              <Btn 
                variant='primary' 
                onClick={saveProfile}
                disabled={savingProfile}
                className='flex-1'
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Btn>
              <Btn 
                variant='outline' 
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Btn>
            </div>
          </div>
        </Modal>

        {/* Upload Photos Modal */}
        <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title='Upload Progress Photos' maxW='max-w-3xl'>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {[
                { key: 'front', label: 'Front', file: pFront, setter: setPFront },
                { key: 'back', label: 'Back', file: pBack, setter: setPBack },
                { key: 'left', label: 'Left', file: pLeft, setter: setPLeft },
                { key: 'right', label: 'Right', file: pRight, setter: setPRight }
              ].map(({ key, label, file, setter }) => (
                <div key={key} className='relative'>
                  {!file ? (
                    <label className='block aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition group'>
                      <div className='h-full flex flex-col items-center justify-center p-4'>
                        <Upload className='h-8 w-8 text-slate-400 group-hover:text-indigo-600 transition' />
                        <span className='mt-2 text-sm font-medium text-slate-600'>{label}</span>
                      </div>
                      <input 
                        type='file' 
                        accept='image/*' 
                        className='hidden'
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) setter(file);
                        }}
                      />
                    </label>
                  ) : (
                    <div className='relative aspect-[3/4] rounded-xl overflow-hidden'>
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={label}
                        className='w-full h-full object-cover'
                      />
                      <button
                        onClick={() => setter(null)}
                        className='absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition'
                      >
                        <X size={16} />
                      </button>
                      <div className='absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2'>
                        <span className='text-white text-xs font-medium'>{label}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className='bg-indigo-50 border border-indigo-200 rounded-lg p-4'>
              <h3 className='font-semibold text-indigo-900 mb-2 flex items-center gap-2'>
                <Sparkles size={16} />
                Photography Tips
              </h3>
              <ul className='text-sm text-indigo-800 space-y-1'>
                <li>• Use consistent lighting for each photo</li>
                <li>• Stand in the same position each time</li>
                <li>• Wear similar clothing to track changes</li>
                <li>• Take photos at the same time of day</li>
              </ul>
            </div>
            
            <div className='flex gap-3 pt-4'>
              <Btn 
                variant='primary' 
                className='flex-1'
                disabled={!pFront && !pBack && !pLeft && !pRight}
              >
                <Upload size={16} className='mr-2' />
                Upload Photos
              </Btn>
              <Btn 
                variant='outline' 
                onClick={() => setUploadOpen(false)}
              >
                Cancel
              </Btn>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}