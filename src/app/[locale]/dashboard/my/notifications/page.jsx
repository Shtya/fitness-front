'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, Clock, Droplets, Dumbbell, Utensils, Pill, Mail, Smartphone, Settings2, Info, Plus, Minus, Save, Sparkles, BookOpenCheck, Heart, MoonStar, Sun, CalendarClock, RefreshCw, TestTube } from 'lucide-react';

/* =================== STORAGE =================== */
const LS_REMINDERS = 'mw.reminders.v1';
const spring = { type: 'spring', stiffness: 220, damping: 26 };

/* =================== DEFAULT MODEL =================== */
const DEFAULTS = {
  channels: {
    push: true,
    email: false,
    emailAddress: '',
  },
  workout: {
    enabled: true,
    time: '18:00', // default workout time
    days: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'], // fri off by default
    preAlertMin: 10,
  },
  meals: {
    m1: { enabled: true, time: '08:30', label: 'Meal 1' },
    m2: { enabled: true, time: '12:30', label: 'Meal 2' },
    m3: { enabled: true, time: '16:30', label: 'Meal 3' },
    m4: { enabled: false, time: '20:30', label: 'Meal 4' },
    m5: { enabled: false, time: '22:00', label: 'Meal 5' },
  },
  water: {
    enabled: true,
    mode: 'interval', // 'interval' | 'fixed'
    intervalMin: 60, // every 60 minutes
    start: '09:00',
    end: '21:00',
    fixedTimes: ['10:30', '13:00', '15:30', '18:00', '20:30'],
    dailyTargetLiters: 4,
  },
  supplements: {
    multi: { enabled: true, mode: 'afterMeal', meal: 'm1', offsetMin: 10, label: 'Multivitamin' },
    omega: { enabled: true, mode: 'afterMeal', meal: 'm2', offsetMin: 10, label: 'Omega-3' },
    zinc: { enabled: true, mode: 'afterMeal', meal: 'm5', offsetMin: 10, label: 'Zinc' },
    creatine: { enabled: true, mode: 'fixed', time: '17:30', label: 'Creatine (pre-workout)' },
  },
  // Gentle religious reminders — تذكيرات دينية لطيفة
  deen: {
    enabled: true,
    adhkarMorning: { enabled: true, time: '07:30', text: 'أذكار الصباح (5 دقائق)' },
    adhkarEvening: { enabled: true, time: '19:30', text: 'أذكار المساء (5 دقائق)' },
    quranDaily: { enabled: true, time: '21:00', text: 'ورد القرآن (10 دقائق)' },
    jumuah: { enabled: true, time: '11:30', text: 'سورة الكهف والصلاة على النبي ﷺ' }, // Fri
    prayers: {
      fajr: { enabled: true, time: '05:00', text: 'تذكير بصلاة الفجر' },
      dhuhr: { enabled: true, time: '12:45', text: 'تذكير بصلاة الظهر' },
      asr: { enabled: true, time: '16:15', text: 'تذكير بصلاة العصر' },
      maghrib: { enabled: true, time: '18:45', text: 'تذكير بصلاة المغرب' },
      isha: { enabled: true, time: '20:00', text: 'تذكير بصلاة العشاء' },
    },
    customs: [
      { id: 'c1', enabled: false, time: '10:00', text: 'سبحان الله وبحمده 100 مرة' },
      { id: 'c2', enabled: false, time: '22:30', text: 'دعاء قبل النوم / محاسبة النفس' },
    ],
  },
};

/* =================== UTILS =================== */
function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
const DAYS = [
  { k: 'sat', l: 'Sat' },
  { k: 'sun', l: 'Sun' },
  { k: 'mon', l: 'Mon' },
  { k: 'tue', l: 'Tue' },
  { k: 'wed', l: 'Wed' },
  { k: 'thu', l: 'Thu' },
  { k: 'fri', l: 'Fri' },
];

/* =================== PAGE =================== */
export default function RemindersPage() {
  const [state, setState] = useState(DEFAULTS);
  const [tab, setTab] = useState('overview'); // overview | workout | meals | water | supp | deen | channels

  useEffect(() => setState(loadLS(LS_REMINDERS, DEFAULTS)), []);
  useEffect(() => saveLS(LS_REMINDERS, state), [state]);

  function toggleDay(k) {
    setState(s => {
      const on = new Set(s.workout.days);
      on.has(k) ? on.delete(k) : on.add(k);
      return { ...s, workout: { ...s.workout, days: Array.from(on) } };
    });
  }

  function addDeenCustom() {
    setState(s => {
      const id = `c${Math.random().toString(36).slice(2, 6)}`;
      const customs = [...s.deen.customs, { id, enabled: true, time: '12:00', text: 'ذكر قصير' }];
      return { ...s, deen: { ...s.deen, customs } };
    });
  }
  function delDeenCustom(id) {
    setState(s => ({ ...s, deen: { ...s.deen, customs: s.deen.customs.filter(c => c.id !== id) } }));
  }

  // Simple preview strings
  const previewWorkout = useMemo(() => {
    const d = DAYS.filter(x => state.workout.days.includes(x.k))
      .map(x => x.l)
      .join(', ');
    return `${state.workout.time} on ${d || '—'}`;
  }, [state.workout]);
  const previewWater = useMemo(() => {
    return state.water.mode === 'interval' ? `Every ${state.water.intervalMin} min from ${state.water.start} → ${state.water.end}` : `${state.water.fixedTimes.join(', ') || '—'}`;
  }, [state.water]);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <div className='flex items-center justify-between flex-wrap gap-3'>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>Reminders</h1>
            <p className='text-sm text-slate-600 mt-1'>Schedule push/email reminders for workout, meals, water, supplements — plus gentle Islamic reminders.</p>
          </div>
          <div className='inline-flex items-center gap-2'>
            <button
              onClick={() => {
                saveLS(LS_REMINDERS, state);
              }}
              className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'>
              <Save size={16} /> Save
            </button>
            <TestPush />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className='rounded-2xl border border-slate-200 bg-white p-2'>
        <div className='flex flex-wrap gap-2'>
          <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={BellRing} label='Overview' />
          <TabBtn active={tab === 'workout'} onClick={() => setTab('workout')} icon={Dumbbell} label='Workout' />
          <TabBtn active={tab === 'meals'} onClick={() => setTab('meals')} icon={Utensils} label='Meals' />
          <TabBtn active={tab === 'water'} onClick={() => setTab('water')} icon={Droplets} label='Water' />
          <TabBtn active={tab === 'supp'} onClick={() => setTab('supp')} icon={Pill} label='Supplements' />
          <TabBtn active={tab === 'deen'} onClick={() => setTab('deen')} icon={Sparkles} label='تذكيرات دينية' />
          <TabBtn active={tab === 'channels'} onClick={() => setTab('channels')} icon={Settings2} label='Channels' />
        </div>
      </div>

      {/* Panels */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Card title='Workout' icon={Dumbbell}>
            <Toggle label='Enable workout reminder' checked={state.workout.enabled} onChange={v => setState(s => ({ ...s, workout: { ...s.workout, enabled: v } }))} />
            <div className='grid grid-cols-2 gap-2 mt-2'>
              <TimeInput label='Time' value={state.workout.time} onChange={v => setState(s => ({ ...s, workout: { ...s.workout, time: v } }))} />
              <NumberInput label='Pre-alert (min)' value={state.workout.preAlertMin} onChange={v => setState(s => ({ ...s, workout: { ...s.workout, preAlertMin: v } }))} />
            </div>
            <div className='mt-2'>
              <div className='text-xs text-slate-500 mb-1'>Days</div>
              <div className='flex flex-wrap gap-1.5'>
                {DAYS.map(d => (
                  <button key={d.k} onClick={() => toggleDay(d.k)} className={`px-2 py-1 rounded-lg text-xs border ${state.workout.days.includes(d.k) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
            <Hint text={`Scheduled at ${previewWorkout}.`} />
          </Card>

          <Card title='Water' icon={Droplets}>
            <Toggle label='Enable water reminders' checked={state.water.enabled} onChange={v => setState(s => ({ ...s, water: { ...s.water, enabled: v } }))} />
            <div className='mt-2 grid grid-cols-2 gap-2'>
              <Select
                label='Mode'
                value={state.water.mode}
                onChange={v => setState(s => ({ ...s, water: { ...s.water, mode: v } }))}
                options={[
                  { value: 'interval', label: 'Every X minutes' },
                  { value: 'fixed', label: 'Fixed times' },
                ]}
              />
              <NumberInput label='Daily target (L)' value={state.water.dailyTargetLiters} onChange={v => setState(s => ({ ...s, water: { ...s.water, dailyTargetLiters: v } }))} step={0.5} />
            </div>
            {state.water.mode === 'interval' ? (
              <div className='mt-2 grid grid-cols-3 gap-2'>
                <NumberInput label='Interval (min)' value={state.water.intervalMin} onChange={v => setState(s => ({ ...s, water: { ...s.water, intervalMin: v } }))} />
                <TimeInput label='Start' value={state.water.start} onChange={v => setState(s => ({ ...s, water: { ...s.water, start: v } }))} />
                <TimeInput label='End' value={state.water.end} onChange={v => setState(s => ({ ...s, water: { ...s.water, end: v } }))} />
              </div>
            ) : (
              <FixedTimes times={state.water.fixedTimes} onChange={times => setState(s => ({ ...s, water: { ...s.water, fixedTimes: times } }))} />
            )}
            <Hint text={`Water plan: ${previewWater}. Target ${state.water.dailyTargetLiters}L/day.`} />
          </Card>

          <Card title='Meals' icon={Utensils}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {Object.entries(state.meals).map(([k, m]) => (
                <ReminderRow key={k} icon={Utensils} title={m.label} enabled={m.enabled} onToggle={v => setState(s => ({ ...s, meals: { ...s.meals, [k]: { ...m, enabled: v } } }))} right={<TimeInput label='Time' value={m.time} onChange={v => setState(s => ({ ...s, meals: { ...s.meals, [k]: { ...m, time: v } } }))} />} />
              ))}
            </div>
            <Hint text='Adjust meal times to match your day. Supplements can trigger after specific meals.' />
          </Card>

          <Card title='Supplements' icon={Pill}>
            <div className='space-y-3'>
              {Object.entries(state.supplements).map(([k, s]) => (
                <div key={k} className='rounded-xl border border-slate-200 p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='font-semibold text-sm'>{s.label}</div>
                    <ToggleMini checked={s.enabled} onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, enabled: v } } }))} />
                  </div>

                  <div className='grid grid-cols-2 md:grid-cols-3 gap-2 mt-2'>
                    <Select
                      label='When'
                      value={s.mode}
                      onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, mode: v } } }))}
                      options={[
                        { value: 'fixed', label: 'At a time' },
                        { value: 'afterMeal', label: 'After meal' },
                      ]}
                    />
                    {s.mode === 'fixed' ? (
                      <TimeInput label='Time' value={s.time || '17:30'} onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, time: v } } }))} />
                    ) : (
                      <>
                        <Select
                          label='Meal'
                          value={s.meal || 'm1'}
                          onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, meal: v } } }))}
                          options={[
                            { value: 'm1', label: 'Meal 1' },
                            { value: 'm2', label: 'Meal 2' },
                            { value: 'm3', label: 'Meal 3' },
                            { value: 'm4', label: 'Meal 4' },
                            { value: 'm5', label: 'Meal 5' },
                          ]}
                        />
                        <NumberInput label='Offset (min)' value={s.offsetMin || 10} onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, offsetMin: v } } }))} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Hint text='Example: Multivitamin 10 minutes after Meal 1; Creatine fixed at 17:30 (pre-workout).' />
          </Card>
        </motion.div>
      )}

      {tab === 'workout' && (
        <Section icon={Dumbbell} title='Workout Reminders'>
          <Toggle label='Enable workout reminder' checked={state.workout.enabled} onChange={v => setState(s => ({ ...s, workout: { ...s.workout, enabled: v } }))} />
          <div className='grid grid-cols-2 md:grid-cols-4 gap-2 mt-2'>
            <TimeInput label='Workout time' value={state.workout.time} onChange={v => setState(s => ({ ...s, workout: { ...s.workout, time: v } }))} />
            <NumberInput label='Pre-alert (min)' value={state.workout.preAlertMin} onChange={v => setState(s => ({ ...s, workout: { ...s.workout, preAlertMin: v } }))} />
            <div className='col-span-2'>
              <div className='text-xs text-slate-500 mb-1'>Days</div>
              <div className='flex flex-wrap gap-1.5'>
                {DAYS.map(d => (
                  <button key={d.k} onClick={() => toggleDay(d.k)} className={`px-2 py-1 rounded-lg text-xs border ${state.workout.days.includes(d.k) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {tab === 'meals' && (
        <Section icon={Utensils} title='Meal Reminders'>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
            {Object.entries(state.meals).map(([k, m]) => (
              <ReminderRow key={k} icon={Utensils} title={m.label} enabled={m.enabled} onToggle={v => setState(s => ({ ...s, meals: { ...s.meals, [k]: { ...m, enabled: v } } }))} right={<TimeInput label='Time' value={m.time} onChange={v => setState(s => ({ ...s, meals: { ...s.meals, [k]: { ...m, time: v } } }))} />} />
            ))}
          </div>
        </Section>
      )}

      {tab === 'water' && (
        <Section icon={Droplets} title='Water Reminders'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <Toggle label='Enable' checked={state.water.enabled} onChange={v => setState(s => ({ ...s, water: { ...s.water, enabled: v } }))} />
            <Select
              label='Mode'
              value={state.water.mode}
              onChange={v => setState(s => ({ ...s, water: { ...s.water, mode: v } }))}
              options={[
                { value: 'interval', label: 'Every X minutes' },
                { value: 'fixed', label: 'Fixed times' },
              ]}
            />
            <NumberInput label='Daily target (L)' step={0.5} value={state.water.dailyTargetLiters} onChange={v => setState(s => ({ ...s, water: { ...s.water, dailyTargetLiters: v } }))} />
          </div>
          {state.water.mode === 'interval' ? (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mt-2'>
              <NumberInput label='Interval (min)' value={state.water.intervalMin} onChange={v => setState(s => ({ ...s, water: { ...s.water, intervalMin: v } }))} />
              <TimeInput label='Start' value={state.water.start} onChange={v => setState(s => ({ ...s, water: { ...s.water, start: v } }))} />
              <TimeInput label='End' value={state.water.end} onChange={v => setState(s => ({ ...s, water: { ...s.water, end: v } }))} />
            </div>
          ) : (
            <FixedTimes times={state.water.fixedTimes} onChange={times => setState(s => ({ ...s, water: { ...s.water, fixedTimes: times } }))} />
          )}
          <Hint text='Tip: keep intervals gentle (45–90 min) inside a daytime window.' />
        </Section>
      )}

      {tab === 'supp' && (
        <Section icon={Pill} title='Supplements Reminders'>
          <div className='space-y-3'>
            {Object.entries(state.supplements).map(([k, s]) => (
              <div key={k} className='rounded-xl border border-slate-200 p-3'>
                <div className='flex items-center justify-between'>
                  <div className='font-semibold text-sm'>{s.label}</div>
                  <ToggleMini checked={s.enabled} onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, enabled: v } } }))} />
                </div>

                <div className='grid grid-cols-2 md:grid-cols-3 gap-2 mt-2'>
                  <Select
                    label='When'
                    value={s.mode}
                    onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, mode: v } } }))}
                    options={[
                      { value: 'fixed', label: 'At a time' },
                      { value: 'afterMeal', label: 'After meal' },
                    ]}
                  />
                  {s.mode === 'fixed' ? (
                    <TimeInput label='Time' value={s.time || '17:30'} onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, time: v } } }))} />
                  ) : (
                    <>
                      <Select
                        label='Meal'
                        value={s.meal || 'm1'}
                        onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, meal: v } } }))}
                        options={[
                          { value: 'm1', label: 'Meal 1' },
                          { value: 'm2', label: 'Meal 2' },
                          { value: 'm3', label: 'Meal 3' },
                          { value: 'm4', label: 'Meal 4' },
                          { value: 'm5', label: 'Meal 5' },
                        ]}
                      />
                      <NumberInput label='Offset (min)' value={s.offsetMin || 10} onChange={v => setState(st => ({ ...st, supplements: { ...st.supplements, [k]: { ...s, offsetMin: v } } }))} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === 'deen' && (
        <Section icon={Sparkles} title='تذكيرات دينية لطيفة'>
          <Toggle label='Enable all Deen reminders' checked={state.deen.enabled} onChange={v => setState(s => ({ ...s, deen: { ...s.deen, enabled: v } }))} />
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3'>
            <Card title='Adhkar & Qur’an' icon={BookOpenCheck}>
              <ReminderSimple row title='أذكار الصباح' value={state.deen.adhkarMorning} onChange={v => setState(s => ({ ...s, deen: { ...s.deen, adhkarMorning: v } }))} />
              <ReminderSimple row title='أذكار المساء' value={state.deen.adhkarEvening} onChange={v => setState(s => ({ ...s, deen: { ...s.deen, adhkarEvening: v } }))} />
              <ReminderSimple row title='ورد القرآن اليومي' value={state.deen.quranDaily} onChange={v => setState(s => ({ ...s, deen: { ...s.deen, quranDaily: v } }))} />
              <div className='mt-2 text-xs text-slate-500'>Customize the text freely (e.g., “10 min Surah” / “سورة الملك قبل النوم”).</div>
            </Card>

            <Card title='Salah (user-set times)' icon={MoonStar}>
              <div className='grid grid-cols-2 gap-2'>
                {Object.entries(state.deen.prayers).map(([k, v]) => (
                  <div key={k} className='rounded-xl border border-slate-200 p-2'>
                    <div className='flex items-center justify-between text-sm font-medium'>
                      <span className='capitalize'>{labelPrayer(k)}</span>
                      <ToggleMini checked={v.enabled} onChange={on => setState(s => ({ ...s, deen: { ...s.deen, prayers: { ...s.deen.prayers, [k]: { ...v, enabled: on } } } }))} />
                    </div>
                    <div className='grid grid-cols-2 gap-2 mt-2'>
                      <TimeInput label='Time' value={v.time} onChange={t => setState(s => ({ ...s, deen: { ...s.deen, prayers: { ...s.deen.prayers, [k]: { ...v, time: t } } } }))} />
                      <TextInput label='Text' value={v.text} onChange={t => setState(s => ({ ...s, deen: { ...s.deen, prayers: { ...s.deen.prayers, [k]: { ...v, text: t } } } }))} />
                    </div>
                  </div>
                ))}
              </div>
              <div className='text-xs text-slate-500 mt-2'>Note: This demo uses user-set times (no geolocation). You can later integrate an Adhan API.</div>
            </Card>
          </div>

          <Card title='Custom gentle reminders' icon={Heart}>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
              {state.deen.customs.map(c => (
                <div key={c.id} className='rounded-xl border border-slate-200 p-3'>
                  <div className='flex items-center justify-between'>
                    <ToggleMini checked={c.enabled} onChange={on => setState(s => ({ ...s, deen: { ...s.deen, customs: s.deen.customs.map(x => (x.id === c.id ? { ...x, enabled: on } : x)) } }))} />
                    <button onClick={() => delDeenCustom(c.id)} className='text-slate-400 hover:text-rose-600'>
                      <Minus size={16} />
                    </button>
                  </div>
                  <div className='grid grid-cols-2 gap-2 mt-2'>
                    <TimeInput label='Time' value={c.time} onChange={t => setState(s => ({ ...s, deen: { ...s.deen, customs: s.deen.customs.map(x => (x.id === c.id ? { ...x, time: t } : x)) } }))} />
                    <TextInput label='Text' value={c.text} onChange={t => setState(s => ({ ...s, deen: { ...s.deen, customs: s.deen.customs.map(x => (x.id === c.id ? { ...x, text: t } : x)) } }))} />
                  </div>
                </div>
              ))}
              <button onClick={addDeenCustom} className='h-10 rounded-xl border border-slate-200 px-3 text-sm hover:bg-slate-50 inline-flex items-center justify-center gap-2'>
                <Plus size={16} /> Add custom
              </button>
            </div>
          </Card>
        </Section>
      )}

      {tab === 'channels' && (
        <Section icon={Settings2} title='Channels & Delivery'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <Toggle label='Push notifications' checked={state.channels.push} onChange={v => setState(s => ({ ...s, channels: { ...s.channels, push: v } }))} />
            <Toggle label='Email reminders' checked={state.channels.email} onChange={v => setState(s => ({ ...s, channels: { ...s.channels, email: v } }))} />
            <TextInput label='Email address' value={state.channels.emailAddress} onChange={v => setState(s => ({ ...s, channels: { ...s.channels, emailAddress: v } }))} />
          </div>
          <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 mt-3'>This demo stores preferences in your browser only. Push/email sending requires a backend (cron/web push or email service).</div>
        </Section>
      )}
    </div>
  );
}

/* =================== REUSABLE UI =================== */

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border transition
        ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
      <Icon size={16} />
      {label}
    </button>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <div className='rounded-2xl border border-slate-200 bg-white p-4'>
        <div className='flex items-center gap-2 mb-3'>
          {Icon ? <Icon size={18} className='text-slate-700' /> : null}
          <div className='font-semibold'>{title}</div>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4'>
      <div className='flex items-center gap-2 mb-3'>
        {Icon ? <Icon size={18} className='text-slate-700' /> : null}
        <div className='font-semibold'>{title}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className='flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2'>
      <span className='text-sm'>{label}</span>
      <button type='button' onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full transition relative ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-pressed={checked}>
        <span className={`absolute top-0.5 ${checked ? 'left-6' : 'left-0.5'} h-5 w-5 rounded-full bg-white shadow transition`} />
      </button>
    </label>
  );
}

function ToggleMini({ checked, onChange }) {
  return (
    <button type='button' onClick={() => onChange(!checked)} className={`h-5 w-9 rounded-full transition relative ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-pressed={checked}>
      <span className={`absolute top-0.5 ${checked ? 'left-5' : 'left-0.5'} h-4 w-4 rounded-full bg-white shadow transition`} />
    </button>
  );
}

function TimeInput({ label, value, onChange }) {
  return (
    <label className='block'>
      <span className='text-xs text-slate-600'>{label}</span>
      <input type='time' value={value} onChange={e => onChange(e.target.value)} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
    </label>
  );
}

function NumberInput({ label, value, onChange, step = 1, min = 0 }) {
  return (
    <label className='block'>
      <span className='text-xs text-slate-600'>{label}</span>
      <input type='number' value={value} step={step} min={min} onChange={e => onChange(+e.target.value || 0)} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder = '' }) {
  return (
    <label className='block'>
      <span className='text-xs text-slate-600'>{label}</span>
      <input type='text' value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} className='mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className='block'>
      <span className='text-xs text-slate-600'>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className='mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReminderRow({ icon: Icon, title, enabled, onToggle, right }) {
  return (
    <div className='rounded-xl border border-slate-200 p-3 flex items-center gap-3'>
      <div className='w-9 h-9 rounded-lg bg-slate-100 grid place-items-center border border-slate-200'>
        <Icon size={16} className='text-slate-700' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='text-sm font-medium'>{title}</div>
      </div>
      <div className='flex items-center gap-3'>
        {right}
        <ToggleMini checked={enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

function FixedTimes({ times, onChange }) {
  function add() {
    onChange([...(times || []), '12:00']);
  }
  function set(idx, v) {
    const next = [...times];
    next[idx] = v;
    onChange(next);
  }
  function del(idx) {
    const next = [...times];
    next.splice(idx, 1);
    onChange(next);
  }
  return (
    <div className='mt-2'>
      <div className='text-xs text-slate-500 mb-1'>Fixed times</div>
      <div className='flex flex-wrap gap-2'>
        {(times || []).map((t, i) => (
          <div key={`${t}-${i}`} className='flex items-center gap-1'>
            <input type='time' value={t} onChange={e => set(i, e.target.value)} className='h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
            <button onClick={() => del(i)} className='text-slate-400 hover:text-rose-600'>
              <Minus size={16} />
            </button>
          </div>
        ))}
        <button onClick={add} className='h-9 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50 inline-flex items-center gap-1'>
          <Plus size={16} /> Add time
        </button>
      </div>
    </div>
  );
}

function ReminderSimple({ title, value, onChange, row = false }) {
  const body = (
    <div className={`grid ${row ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-2`}>
      <Toggle label='Enable' checked={value.enabled} onChange={v => onChange({ ...value, enabled: v })} />
      <TimeInput label='Time' value={value.time} onChange={t => onChange({ ...value, time: t })} />
      <div className={`${row ? '' : 'col-span-2'}`}>
        <TextInput label='Text' value={value.text} onChange={txt => onChange({ ...value, text: txt })} />
      </div>
    </div>
  );
  return row ? (
    <div className='rounded-xl border border-slate-200 p-3 mb-2'>
      <div className='text-sm font-semibold mb-2'>{title}</div>
      {body}
    </div>
  ) : (
    <div className='space-y-2'>{body}</div>
  );
}

function Hint({ text }) {
  return (
    <div className='mt-2 text-xs text-slate-500 flex items-center gap-1'>
      <Info size={14} /> {text}
    </div>
  );
}

function labelPrayer(k) {
  switch (k) {
    case 'fajr':
      return 'Fajr';
    case 'dhuhr':
      return 'Dhuhr';
    case 'asr':
      return 'Asr';
    case 'maghrib':
      return 'Maghrib';
    case 'isha':
      return 'Isha';
    default:
      return k;
  }
}

/* =========== Demo: Test Push =========== */
function TestPush() {
  async function test() {
    try {
      if (!('Notification' in window)) return alert('Notifications not supported in this browser.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return alert('Permission not granted.');
      new Notification('Test reminder', {
        body: 'This is how your push reminder will look.',
        icon: '/icon-192.png', // optional, if you have a PWA icon
        badge: '/icon-96.png',
      });
    } catch (e) {
      console.error(e);
      alert('Could not show notification.');
    }
  }
  return (
    <button onClick={test} className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'>
      <TestTube size={16} /> Test push
    </button>
  );
}
