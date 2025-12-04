'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Users as UsersIcon, CheckCircle2, XCircle, Shield, ChevronUp, ChevronDown, Eye, Clock, Search, BadgeCheck, ListChecks, Power, Trash2, Check, EyeOff, Eye as EyeIcon, Sparkles, Dumbbell, Utensils, MessageCircle, Edit3, KeyRound, Copy, User, Mail, Phone, Calendar, Crown, Award, Users, Globe, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { useTranslations } from 'next-intl';
import MultiLangText from '@/components/atoms/MultiLangText';
import Button from '@/components/atoms/Button';

/* ===========================
   Stepper
=========================== */
export function Stepper({ step = 1, steps = 4 }) {
  const t = useTranslations('Stepper');
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
    <div dir='ltr' className='relative overflow-hidden'>
      <div className='flex py-3 items-center justify-between gap-4 mb-4' aria-label={t('progress')} role='progressbar' aria-valuemin={1} aria-valuemax={steps} aria-valuenow={step}>
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
                  style={isActive ? { background: 'linear-gradient(135deg, rgba(99,102,241,1), rgba(139,92,246,1))' } : {}}>
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

export function PlanPicker({
  workoutPlans,
  visibleWorkouts,
  setVisibleWorkouts,
  buttonName,
  plans = [],
  defaultSelectedId = null,
  onSelect,
  onAssign,
  onSkip,
  assigning = false,
  loading = false, // ✅ NEW: loading flag
}) {
  const t = useTranslations('Plans');
  const tc = useTranslations('Common');
  const common = useTranslations('common');

  const [expanded, setExpanded] = useState(null);
  const [selectedId, setSelectedId] = useState(defaultSelectedId);

  const handleSelect = id => {
    setSelectedId(id);
    onSelect?.(id);
  };

  // ✅ Make sure we only show as many as visibleWorkouts
  const visiblePlans = plans.slice(0, visibleWorkouts || plans.length);

  const showEmpty = !loading && plans.length === 0;

  const renderSkeletonCard = (_, i) => (
    <motion.div key={`skeleton-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }} className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm animate-pulse'>
      <div className='flex items-center gap-3 mb-3'>
        <div className='h-5 w-5 rounded-full bg-slate-200' />
        <div className='flex-1 space-y-2'>
          <div className='h-3 w-2/3 rounded bg-slate-200' />
          <div className='h-2.5 w-1/3 rounded bg-slate-100' />
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {Array.from({ length: 3 }).map((__, idx) => (
          <div key={idx} className='h-6 w-20 rounded-full bg-slate-100' />
        ))}
      </div>
    </motion.div>
  );
 
  return (
    <div className='space-y-4'>
      <AnimatePresence mode='popLayout'>
        {loading ? (
          <motion.div key='loading' layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {Array.from({ length: 6 }).map(renderSkeletonCard)}
          </motion.div>
        ) : showEmpty ? (
          <motion.div key='empty' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 bg-slate-50/60'>
            {t('empty')}
          </motion.div>
        ) : (
          <motion.div key='plans' layout className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {visiblePlans.map((plan, i) => {
              const isSelected = selectedId === plan.id;

              // ✅ Use your real shape: program.days
              const rawDays = plan.program?.days || plan.days || [];
              const orderedDays = orderDays(rawDays);

              return (
                <motion.button key={plan.id} layout type='button' onClick={() => handleSelect(plan.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }} className={['flex flex-col group relative text-left rounded-lg border p-4 transition-all', 'bg-white hover:bg-indigo-50/50', isSelected ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-200 hover:border-indigo-200'].join(' ')}>
                  {/* Title row */}
                  <div className='flex items-start gap-3'>
                    <CheckCircle2 className={`h-5 w-5 transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-300'}`} />
                    <div className='flex-1 flex gap-2 items-center justify-between min-w-0'>
                      <MultiLangText className='font-semibold text-slate-800  '>{plan.name || t('untitled')}</MultiLangText>
                    </div>
                  </div>

                  {/* Expand details */}
                  <div className='mt-2'>
                    {orderedDays.length > 0 && <div className='flex items-center justify-between' >
                      <span className='flex-none inline-flex items-center gap-1 text-xs text-slate-600'>
                        <CalendarDays className='h-3.5 w-3.5' />
                        {t('daysCount', { count: orderedDays.length })}
                      </span>
                      <button
                        type='button'
                        onClick={e => {
                          e.stopPropagation();
                          setExpanded(expanded === plan.id ? null : plan.id);
                        }}
                        className='inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900'>
                        {t('details')}
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded === plan.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>}

                    <AnimatePresence initial={false}>
                      {expanded === plan.id && (
                        <motion.div key='details' initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className='overflow-hidden'>
                          <div className='mt-3 flex flex-wrap gap-2'>
                            {orderedDays.slice(0, 6).map(d => (
                              <span key={d.id || d.dayOfWeek} className='rtl:flex-row-reverse inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-600'>
                                <span className='font-medium capitalize'>{common(d.dayOfWeek || d?.day || d.id)}</span>
                                <span className='text-slate-400'>•</span>
                                <span className='truncate max-w-[140px]'>{common('day')}</span>
                              </span>
                            ))}
                            {orderedDays.length > 6 && (
                              <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-600'>
                                {t('moreCount', {
                                  count: orderedDays.length - 6,
                                })}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}

            {/* See more */}
            {workoutPlans?.length > (visibleWorkouts || 0) ? (
              <div className='flex'>
                <Button name={tc('seeMore')} color='neutral' onClick={() => setVisibleWorkouts(v => v + 6)} />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className='flex justify-between gap-2 pt-2'>
        <div className='flex justify-end w-full gap-2'>
          {!buttonName && (
            <button type='button' onClick={onSkip} className='rounded-lg px-4 py-2 text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors'>
              {tc('skip')}
            </button>
          )}

          <button
            type='button'
            onClick={() => onAssign?.(selectedId)}
            disabled={!selectedId || assigning}
            className={`rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              ${!selectedId ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {assigning ? tc('assigning') : buttonName || tc('assignNext')}
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

export function MealPlanPicker({
  loading,
  mealPlans = [], // ✅ default to [] so length is always safe
  visibleMeals,
  setVisibleMeals,
  meals = [],
  defaultSelectedId = null,
  assigning = false,
  onSelect,
  onBack,
  onSkip,
  onAssign,
}) {
  const t = useTranslations('Meals');
  const tc = useTranslations('Common');

  const [selectedId, setSelectedId] = useState(defaultSelectedId);

  const handleSelect = id => {
    setSelectedId(id);
    onSelect?.(id);
  };

  const renderSkeletonCard = (_, i) => (
    <motion.div key={`meal-skeleton-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }} className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm animate-pulse'>
      <div className='flex items-start gap-3 mb-2'>
        <div className='h-5 w-5 rounded-full bg-slate-200' />
        <div className='flex-1 space-y-2'>
          <div className='h-3 w-2/3 rounded bg-slate-200' />
          <div className='h-2.5 w-full rounded bg-slate-100' />
          <div className='h-2.5 w-3/4 rounded bg-slate-100' />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className='space-y-4'>
      {/* Grid */}
      <AnimatePresence mode='popLayout'>
        {loading ? (
          <motion.div key='loading' layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {Array.from({ length: 6 }).map(renderSkeletonCard)}
          </motion.div>
        ) : meals.length === 0 ? (
          // ✅ Empty state (only when not loading and meals is empty)
          <motion.div key='empty' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 bg-slate-50/60'>
            {t('empty')}
          </motion.div>
        ) : (
          // ✅ Use `meals` exactly as passed from parent (already sliced)
          <motion.div key='meals' layout className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {meals.map((plan, i) => {
              const isSelected = selectedId === plan.id;

              return (
                <motion.button key={plan.id} layout type='button' onClick={() => handleSelect(plan.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }} className={[' flex flex-col group relative text-left rounded-lg border p-4 transition-all', 'bg-white hover:bg-indigo-50/40', isSelected ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-200 hover:border-indigo-200'].join(' ')}>
                  {/* Title row */}
                  <div className='flex items-start gap-3'>
                    <CheckCircle2 className={`h-5 w-5 transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-300'}`} />
                    <div className='flex-1 min-w-0'>
                      <MultiLangText className=' text-sm font-semibold text-slate-800  '>{plan.name || t('untitled')}</MultiLangText>
                      {plan.desc && <MultiLangText className='mt-1 text-sm text-slate-600 line-clamp-2'>{plan.desc}</MultiLangText>}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* See more */}
        {mealPlans.length > visibleMeals ? (
          <div className='flex justify-start'>
            <Button
              name={tc('seeMore')}
              color='neutral'
              onClick={() => setVisibleMeals(v => v + 6)}
            />
          </div>
        ) : null}
      </AnimatePresence>

      {/* Footer actions */}
      <div className='flex justify-between gap-2 pt-2'>
        <button type='button' onClick={onBack} className='rounded-lg px-4 py-2 text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors'>
          {tc('back')}
        </button>
        <div className='flex gap-2'>
          <button type='button' onClick={onSkip} className='rounded-lg px-4 py-2 text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors'>
            {tc('skip')}
          </button>
          <button type='button' onClick={() => onAssign?.(selectedId)} disabled={!selectedId || assigning} className={`rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${!selectedId ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {assigning ? tc('assigning') : tc('assignFinish')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   FieldRow
=========================== */
export function FieldRow({ icon, label, value, canCopy }) {
  const tc = useTranslations('Common');
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

/* ===========================
   PasswordRow
=========================== */
export function PasswordRow({ label, value, canCopy }) {
  const [show, setShow] = useState(false);
  const isMasked = !show && value && value !== 'sent to email (or set by admin)';
  const masked = isMasked ? '•'.repeat(Math.min(String(value).length, 12) || 8) : value;
  const t = useTranslations('Common');
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
          <button type='button' onClick={() => setShow(true)} className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100' aria-label={t('showPassword')} title={t('showPassword')}>
            <Eye className='h-4 w-4' /> {t('show')}
          </button>
        )}
        {!isMasked && value && value !== 'sent to email (or set by admin)' && (
          <button type='button' onClick={() => setShow(false)} className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100' aria-label={t('hidePassword')} title={t('hidePassword')}>
            <EyeOff className='h-4 w-4' /> {t('hide')}
          </button>
        )}
        {canCopy && value && value !== 'sent to email (or set by admin)' && <CopyButton text={String(value)} />}
      </div>
    </div>
  );
}

/* ===========================
   CopyButton
=========================== */
export function CopyButton({ text }) {
  const t = useTranslations('Common');
  return (
    <button
      type='button'
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          // toast.success(t('copied')); // if you have a toast system
        } catch {
          // toast.error(t('copyFailed'));
        }
      }}
      className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100'
      aria-label={t('copyToClipboard')}
      title={t('copy')}>
      <Copy className='h-4 w-4' /> {t('copy')}
    </button>
  );
}

/* ===========================
   WhatsApp Link (kept bilingual logic)
=========================== */
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

/* ===========================
   SubscriptionPeriodPicker
=========================== */

export function SubscriptionPeriodPicker({
  startValue,
  endValue,
  setValue, // <<— from react-hook-form
  errorStart,
  errorEnd,
}) {
  const t = useTranslations('date');

  const today = useMemo(() => formatISO(new Date(), { representation: 'date' }), []);

  const threeMonthsFrom = date => formatISO(addMonths(date, 3), { representation: 'date' });

  // ========== RANGE VALIDATION ==========
  const invalidRange = useMemo(() => {
    if (!startValue || !endValue) return false;
    return isBefore(parseISO(endValue), parseISO(startValue));
  }, [startValue, endValue]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='mt-1'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        {/* START DATE */}
        <div>
          <label className='text-sm font-[500] text-slate-700'>{t('startLabel')}</label>

          <div className='mt-1 bg-white rounded-lg'>
            <Flatpickr
              value={startValue ? parseISO(startValue) : null}
              options={{
                dateFormat: 'Y-m-d',
                minDate: startValue || today,
                disableMobile: true,
              }}
              onChange={dates => {
                const d = dates?.[0];
                if (!d) return;

                const iso = formatISO(d, { representation: 'date' });

                // update RHF
                setValue('subscriptionStart', iso, { shouldValidate: true });

                // adjust END if too early
                if (endValue && isBefore(parseISO(endValue), d)) {
                  const newEnd = threeMonthsFrom(d);
                  setValue('subscriptionEnd', newEnd, { shouldValidate: true });
                }
              }}
              className={`w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 ${errorStart ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'}`}
            />
          </div>

          {errorStart && <p className='mt-1 text-xs text-rose-600'>{errorStart}</p>}
        </div>

        {/* END DATE */}
        <div>
          <label className='text-sm font-[500] text-slate-700'>{t('endLabel')}</label>

          <div className='mt-1 bg-white rounded-lg'>
            <Flatpickr
              value={endValue ? parseISO(endValue) : null}
              options={{
                dateFormat: 'Y-m-d',
                minDate: today,
                disableMobile: true,
              }}
              onChange={dates => {
                const d = dates?.[0];
                if (!d) return;

                const iso = formatISO(d, { representation: 'date' });

                // update RHF
                setValue('subscriptionEnd', iso, { shouldValidate: true });
              }}
              className={`w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 ${errorEnd || invalidRange ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'}`}
              placeholder={t('pickEnd')}
            />
          </div>

          {(errorEnd || invalidRange) && <p className='mt-1 text-xs text-rose-600'>{errorEnd || t('endAfterStart')}</p>}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- helpers ---------- */
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
  if (d.getDate() < day) d.setDate(0);
  if (inclusiveMinusOneDay) d.setDate(d.getDate() - 1);
  return d;
}
export function isBefore(a, b) {
  return a.getTime() < b.getTime();
}
