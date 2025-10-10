'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Users as UsersIcon, CheckCircle2, XCircle, Shield, ChevronUp, ChevronDown, Eye, Clock, Search, BadgeCheck, ListChecks, Power, Trash2, Check, EyeOff, Eye as EyeIcon, Sparkles, Dumbbell, Utensils, MessageCircle, Edit3, KeyRound, Copy, User, Mail, Phone, Calendar, Crown, Award, Users, Globe, Languages } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

export function Stepper({ step = 1, steps = 4 }) {
  const items = Array.from({ length: steps }, (_, i) => i + 1);

  const lineVariants = {
    initial: { scaleX: 0, opacity: 0.4 },
    active: { scaleX: 1, opacity: 1, transition: { duration: 0.45, ease: 'easeOut' } },
    inactive: { scaleX: 1, opacity: 0.25 },
  };

  const bubbleVariants = {
    initial: { y: 8, scale: 0.8, opacity: 0 },
    enter: i => ({
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { delay: i * 0.05, type: 'spring', stiffness: 380, damping: 26 },
    }),
    active: {
      scale: 1.06,
      transition: { type: 'spring', stiffness: 320, damping: 20 },
    },
    inactive: { scale: 1, opacity: 0.9 },
  };

  return (
    <div className='relative overflow-hidden'>
      <div className='flex py-3 items-center justify-between gap-4 mb-4' aria-label='progress' role='progressbar' aria-valuemin={1} aria-valuemax={steps} aria-valuenow={step}>
        {items.map(idx => {
          const isActive = step >= idx;

          return (
            <div key={idx} className='flex-1 relative'>
              {/* Base track */}
              <div className='h-2.5 rounded-full bg-slate-200 overflow-hidden' />

              {/* Animated fill */}
              <motion.div
                className='absolute inset-0 h-2.5 origin-left rounded-full '
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(90deg, rgba(99,102,241,1) 0%, rgba(139,92,246,1) 100%)',
                        boxShadow: '0 0 12px rgba(99,102,241,.55)',
                      }
                    : {}
                }
                variants={lineVariants}
                initial='initial'
                animate={isActive ? 'active' : 'inactive'}
              />

              {/* Shimmer accent on active */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    key={`shimmer-${idx}`}
                    className='pointer-events-none absolute inset-0 h-2.5 rounded-full'
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Step bubble */}
              <motion.div custom={idx * 0.5} variants={bubbleVariants} initial='initial' animate='enter' className='absolute -top-3 left-1/2 -translate-x-1/2'>
                <motion.div
                  animate={isActive ? 'active' : 'inactive'}
                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold
                    ${isActive ? 'text-white border-indigo-300 shadow-md' : 'text-slate-500 border-slate-300 bg-white'}`}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, rgba(99,102,241,1), rgba(139,92,246,1))',
                        }
                      : {}
                  }>
                  {idx}
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlanPicker({ buttonName, plans = [], defaultSelectedId = null, onSelect, onAssign, onSkip, assigning = false }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [selectedId, setSelectedId] = useState(defaultSelectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(p => p.name?.toLowerCase().includes(q) || p.days?.some(d => d.name?.toLowerCase().includes(q) || d.day?.toLowerCase().includes(q)));
  }, [plans, query]);

  const handleSelect = id => {
    setSelectedId(id);
    onSelect?.(id);
  };

  return (
    <div className='space-y-4'>
      {/* Tools: search */}
      <div className='flex items-center gap-2'>
        <label className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search by plan or day…' className='w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50' />
        </label>
      </div>

      {/* Grid of plans */}
      <AnimatePresence mode='popLayout'>
        {filtered.length === 0 ? (
          <motion.div key='empty' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500'>
            No plans found. Try another keyword.
          </motion.div>
        ) : (
          <motion.div layout className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {filtered.map((plan, i) => {
              const isSelected = selectedId === plan.id;
              const assignmentsCount = plan.assignments?.length ?? 0;
              const orderedDays = orderDays(plan.days || []);

              return (
                <motion.button key={plan.id} layout type='button' onClick={() => handleSelect(plan.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }} className={['group relative text-left rounded-lg border p-4 transition-all', 'bg-white hover:bg-indigo-50/50', isSelected ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-200 hover:border-indigo-200'].join(' ')}>
                  {/* Selected check */}
                  <div className='absolute right-3 top-3'>
                    <CheckCircle2 className={`h-5 w-5 transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-300'}`} />
                  </div>

                  {/* Title row */}
                  <div className='flex items-start gap-3 pr-7'>
                    <div className='grid place-items-center h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600'>
                      <Dumbbell className='h-4 w-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <h3 className='font-semibold text-slate-800 truncate'>{plan.name || 'Untitled Plan'}</h3>
                      </div>
                      <div className='mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                        <span className='inline-flex items-center gap-1'>
                          <UsersIcon className='h-3.5 w-3.5' />
                          {assignmentsCount} assigned
                        </span>
                        <span className='inline-flex items-center gap-1'>
                          <CalendarDays className='h-3.5 w-3.5' />
                          {orderedDays.length} days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand details */}
                  <div className='mt-3'>
                    <button
                      type='button'
                      onClick={e => {
                        e.stopPropagation();
                        setExpanded(expanded === plan.id ? null : plan.id);
                      }}
                      className='inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900'>
                      Details
                      <ChevronDown className={`h-4 w-4 transition-transform ${expanded === plan.id ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded === plan.id && (
                        <motion.div key='details' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className='overflow-hidden'>
                          <div className='mt-3 flex flex-wrap gap-2'>
                            {orderedDays.slice(0, 6).map(d => (
                              <span key={d.id} className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-600'>
                                <span className='font-medium capitalize'>{d.day}</span>
                                <span className='text-slate-400'>•</span>
                                <span className='truncate max-w-[140px]'>{d.name}</span>
                              </span>
                            ))}
                            {orderedDays.length > 6 && <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-600'>+{orderedDays.length - 6} more</span>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className='flex justify-between gap-2 pt-2'>
        <div className='flex justify-end w-full gap-2'>
          {!buttonName && (
            <button type='button' onClick={onSkip} className='rounded-lg px-4 py-2 text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors'>
              Skip
            </button>
          )}

          <button
            type='button'
            onClick={() => onAssign?.(selectedId)}
            disabled={!selectedId || assigning}
            className={`rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              ${!selectedId ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}
            `}>
            {assigning ? 'Assigning…' : buttonName || 'Assign & Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

const WEEK_ORDER = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export function orderDays(days) {
  const map = Object.fromEntries(WEEK_ORDER.map((d, i) => [d, i]));
  return [...days].sort((a, b) => (map[a.day] ?? 99) - (map[b.day] ?? 99));
}

export function MealPlanPicker({ meals = [], defaultSelectedId = null, assigning = false, onSelect, onBack, onSkip, onAssign }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(defaultSelectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter(m => (m.name || '').toLowerCase().includes(q) || (m.desc || '').toLowerCase().includes(q));
  }, [meals, query]);

  const handleSelect = id => {
    setSelectedId(id);
    onSelect?.(id);
  };

  return (
    <div className='space-y-4'>
      {/* Search */}
      <div className='flex items-center gap-2'>
        <label className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search by plan name or description…' className='w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50' />
        </label>
      </div>

      {/* Grid */}
      <AnimatePresence mode='popLayout'>
        {filtered.length === 0 ? (
          <motion.div key='empty' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500'>
            No meal plans found. Try another keyword.
          </motion.div>
        ) : (
          <motion.div layout className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {filtered.map((plan, i) => {
              const isSelected = selectedId === plan.id;

              return (
                <motion.button key={plan.id} layout type='button' onClick={() => handleSelect(plan.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }} className={['group relative text-left rounded-lg border p-4 transition-all', 'bg-white hover:bg-indigo-50/40', isSelected ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-200 hover:border-indigo-200'].join(' ')}>
                  {/* Selected check */}
                  <div className='absolute right-3 top-3'>
                    <CheckCircle2 className={`h-5 w-5 transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-300'}`} />
                  </div>

                  {/* Title row */}
                  <div className='flex items-start gap-3 pr-7'>
                    <div className='grid place-items-center h-9 w-9 rounded-lg bg-indigo-100 text-indigo-700'>
                      <Utensils className='h-4 w-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-slate-800 truncate'>{plan.name || 'Untitled Meal Plan'}</h3>
                      {plan.desc && <p className='mt-1 text-sm text-slate-600 line-clamp-2'>{plan.desc}</p>}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className='flex justify-between gap-2 pt-2'>
        <button type='button' onClick={onBack} className='rounded-lg px-4 py-2 text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors'>
          Back
        </button>
        <div className='flex gap-2'>
          <button type='button' onClick={onSkip} className='rounded-lg px-4 py-2 text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors'>
            Skip
          </button>
          <button type='button' onClick={() => onAssign?.(selectedId)} disabled={!selectedId || assigning} className={`rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${!selectedId ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {assigning ? 'Assigning…' : 'Assign & Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FieldRow({ icon, label, value, canCopy }) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2'>
      <div className='flex items-center gap-2 min-w-0'>
        <div className='grid place-items-center h-8 w-8 rounded-lg bg-slate-100 text-slate-600'>{icon}</div>
        <div className='min-w-0'>
          <div className='text-xs text-slate-500'>{label}</div>
          <div className='text-sm font-medium text-slate-800 truncate'>{value || '—'}</div>
        </div>
      </div>
      {canCopy && <CopyButton text={String(value ?? '')} />}
    </div>
  );
}

export function PasswordRow({ label, value, canCopy }) {
  const [show, setShow] = useState(false);
  const isMasked = !show && value && value !== 'sent to email (or set by admin)';
  const masked = isMasked ? '•'.repeat(Math.min(String(value).length, 12) || 8) : value;

  return (
    <div className='flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2'>
      <div className='flex items-center gap-2 min-w-0'>
        <div className='grid place-items-center h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700'>
          <KeyRound className='h-4 w-4' />
        </div>
        <div className='min-w-0'>
          <div className='text-xs text-slate-500'>{label}</div>
          <div className='text-sm font-medium text-slate-800 truncate'>{masked || '—'}</div>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        {isMasked && (
          <button type='button' onClick={() => setShow(true)} className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100' aria-label='Show password'>
            <Eye className='h-4 w-4' /> Show
          </button>
        )}
        {!isMasked && value && value !== 'sent to email (or set by admin)' && (
          <button type='button' onClick={() => setShow(false)} className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100' aria-label='Hide password'>
            <EyeOff className='h-4 w-4' /> Hide
          </button>
        )}
        {canCopy && value && value !== 'sent to email (or set by admin)' && <CopyButton text={String(value)} />}
      </div>
    </div>
  );
}

export function CopyButton({ text }) {
  return (
    <button
      type='button'
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          // if you have a toast:
          // Notification('Copied to clipboard', 'success');
        } catch {
          // Notification('Copy failed', 'error');
        }
      }}
      className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100'
      aria-label='Copy to clipboard'
      title='Copy'>
      <Copy className='h-4 w-4' /> Copy
    </button>
  );
}

// utils/whatsapp.js
export function buildWhatsAppLink({ phone, email, password, role, lang = 'en' }) {
  const to = String(phone || '').replace(/[^0-9]/g, '');
  if (!to) return null;

  const safe = v => (v == null ? '' : String(v));
  const hasPwd = Boolean(password);

  const url = safe(`${process.env.NEXT_PUBLIC_WEBSITE_URL}/en/auth`);
  const urlLine = url ? (lang === 'ar' ? `رابط تسجيل الدخول: ${url}` : `Login here: ${url}`) : '';

  const linesEN = ['Your account is ready!', email ? `• Email: ${email}` : null, hasPwd ? `• Password: ${password}` : '• Password: (sent to email / set by admin)', urlLine || null, '', 'You can sign in right away. If you didn’t request this, ignore this message.'].filter(Boolean);

  const linesAR = ['تم إنشاء حسابك بنجاح!', email ? `• البريد الإلكتروني: ${email}` : null, hasPwd ? `• كلمة المرور: ${password}` : '• كلمة المرور: (أُرسلت على الإيميل / يحددها المشرف)', urlLine || null, '', 'تقدر تسجّل دخولك مباشرة. إذا ما طلبتش إنشاء الحساب، تجاهل الرسالة.'].filter(Boolean);

  const text = encodeURIComponent((lang === 'ar' ? linesAR : linesEN).join('\n'));
  return `https://wa.me/${to}?text=${text}`;
}

export function LanguageToggle({ value = 'en', onChange }) {
  const isEN = value === 'en';
  return (
    <div className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-[2px]'>
      <button
        type='button'
        onClick={() => onChange?.('en')}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg
          ${isEN ? 'bg-indigo-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
        title='English'>
        <Globe className='h-4 w-4' /> EN
      </button>
      <button
        type='button'
        onClick={() => onChange?.('ar')}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg
          ${!isEN ? 'bg-indigo-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
        title='العربية'>
        <Languages className='h-4 w-4' /> AR
      </button>
    </div>
  );
}

import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css'; // make sure this is imported once in your app

const DURATIONS = [
  { label: '1 mo', months: 1 },
  { label: '3 mo', months: 3 },
  { label: '6 mo', months: 6 },
  { label: '12 mo', months: 12 },
];

export function SubscriptionPeriodPicker({ startValue, endValue, onStartChange, onEndChange, errorStart, errorEnd }) {
  const today = useMemo(() => formatISO(new Date(), { representation: 'date' }), []);

  const invalidRange = useMemo(() => {
    if (!startValue || !endValue) return false;
    return isBefore(parseISO(endValue), parseISO(startValue));
  }, [startValue, endValue]);

  const setDuration = months => {
    if (!startValue) {
      const start = today;
      onStartChange?.(start);
      const end = formatISO(addMonths(new Date(), months, /* inclusiveMinusOneDay */ true), {
        representation: 'date',
      });
      onEndChange?.(end);
      return;
    }
    const end = formatISO(addMonths(parseISO(startValue), months, true), { representation: 'date' });
    onEndChange?.(end);
  };

  const startDateObj = startValue ? parseISO(startValue) : null;
  const endDateObj = endValue ? parseISO(endValue) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className=' mt-1'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        {/* START DATE */}
        <div>
          <label className='text-sm font-[500] text-slate-700'>Subscription start date</label>
          <div className='mt-1 bg-white rounded-lg'>
            <Flatpickr
              value={startDateObj}
              options={{
                dateFormat: 'Y-m-d',
                minDate: today,
                disableMobile: true,
              }}
              onChange={dates => {
                const d = dates?.[0];
                onStartChange?.(d ? formatISO(d, { representation: 'date' }) : '');
                // If end is before new start, nudge end to start
                if (endValue && d && isBefore(parseISO(endValue), d)) {
                  onEndChange?.(formatISO(d, { representation: 'date' }));
                }
              }}
              className={`w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 ${errorStart ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'}`}
              placeholder={today}
            />
          </div>
          {errorStart && <p className='mt-1 text-xs text-rose-600'>{errorStart}</p>}
        </div>

        {/* END DATE */}
        <div>
          <label className='text-sm font-[500] text-slate-700'>Subscription end date</label>
          <div className='mt-1 bg-white rounded-lg'>
            <Flatpickr
              value={endDateObj}
              options={{
                dateFormat: 'Y-m-d',
                minDate: startValue || today,
                disableMobile: true,
              }}
              onChange={dates => {
                const d = dates?.[0];
                onEndChange?.(d ? formatISO(d, { representation: 'date' }) : '');
              }}
              className={`w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 ${errorEnd || invalidRange ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'}`}
              placeholder='Pick end date'
            />
          </div>
          {(errorEnd || invalidRange) && <p className='mt-1 text-xs text-rose-600'>{errorEnd || 'End date must be on/after start date'}</p>}
        </div>
      </div>

      {/* Quick durations */}
      <div className='mt-3 flex flex-wrap items-center gap-2'>
        {DURATIONS.map(d => (
          <button key={d.label} type='button' onClick={() => setDuration(d.months)} className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-indigo-50 hover:border-indigo-200'>
            {d.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- helpers (same as yours) ---------- */
export function formatISO(date, { representation = 'date' } = {}) {
  const d = new Date(date);
  if (representation === 'date') {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  return d.toISOString();
}

export function parseISO(s) {
  return new Date(`${s}T00:00:00`);
}

export function addMonths(date, months, inclusiveMinusOneDay = false) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // handle month overflow (e.g., Jan 31 + 1 month)
  if (d.getDate() < day) d.setDate(0);
  if (inclusiveMinusOneDay) {
    d.setDate(d.getDate() - 1); // inclusive end date behavior
  }
  return d;
}

export function isBefore(a, b) {
  return a.getTime() < b.getTime();
}
