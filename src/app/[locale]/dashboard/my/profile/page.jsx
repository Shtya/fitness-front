'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Globe,
  Moon,
  Sun,
  Bell,
  Scale,
  Ruler,
  Shield,
  ListChecks,
  Soup,
  Replace,
  Save,
  Trash2,
  UploadCloud,
  Info,
  ChevronRight,
} from 'lucide-react';

/* =================== STORAGE KEYS =================== */
const LS_PROFILE = 'mw.account.profile.v1';
const LS_PREFS   = 'mw.account.prefs.v1';
const spring = { type: 'spring', stiffness: 220, damping: 26 };

/* =================== DEFAULTS =================== */
const DEFAULT_PROFILE = {
  fullName: 'Ahmed Abdelrahman Mahmoud',
  nickname: 'Ahmed',
  age: 25,
  country: 'Egypt',
  gender: 'male',
  job: 'Software Engineer',
  activityDesc: 'Desk job ~13h seated daily',
  goal: 'Bulk from 70 kg to 80 kg and improve physique',
  howFound: 'TikTok',
  whyCoach: 'Nearby and I follow your work',
  trainedOnlineBefore: 'No',
  trainingSince: 'On/off for 1.5+ years',
  otherSports: 'None',
  trainingPlace: 'Gym only',
  trainingDaysPerWeek: 5,
  smoker: 'No',
  chronicDiseases: 'Hypertension',
  injuries: 'Occasional shoulder pain during training',
  foodAllergy: 'None',
  foodLikes: 'Most foods',
  foodDislikes: 'Nothing specific',
  workHours: '8 AM – 9 PM',
  sleep: '5–7 hours',
  lastDiet: 'None',
  lastProgram: 'Push Pull Legs',
  dropOutReasons: 'Work stress sometimes',
  extraDetails: '—',
  progressPhotos: [], // {date, url}
  supplementsPhotos: [], // {date, url}
};

const DEFAULT_PREFS = {
  language: 'en',               // en | ar
  theme: 'light',               // light | dark | system
  units: 'metric',              // metric (kg/cm) | imperial (lb/in)
  timeFormat: '24h',            // 24h | 12h
  restTimerDefaultSec: 90,      // default rest timer
  notifications: {
    workouts: true,
    meals: true,
    water: true,
    supplements: true,
    remindersTime: '09:00',
  },
  dietary: {
    halal: true,
    vegan: false,
    lactoseFree: false,
    glutenFree: false,
    notes: '',
  },
  privacy: {
    showInLeaderboards: false,
    shareProgressWithCoach: true,
    shareNutritionWithCoach: true,
  },
  substitutions: [
    { id: 'sub-1', from: '100 g rice', to: '120 g potato' },
    { id: 'sub-2', from: '2 brown toast', to: '1 baladi bread' },
    { id: 'sub-3', from: 'Greek yogurt', to: '1 scoop whey + 60 ml milk' },
    { id: 'sub-4', from: 'Banana', to: 'Strawberry / Apple / Guava / Pear' },
  ],
};

/* =================== UTIL =================== */
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

/* =================== PAGE =================== */
export default function ProfileAndPrefsPage() {
  const [tab, setTab] = useState('profile'); // profile | preferences | dietary | substitutions | questionnaire
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  // photo adders
  const [pDate, setPDate] = useState(new Date().toISOString().slice(0,10));
  const [pUrl, setPUrl] = useState('');
  const [sDate, setSDate] = useState(new Date().toISOString().slice(0,10));
  const [sUrl, setSUrl] = useState('');

  // substitution editor
  const [subFrom, setSubFrom] = useState('');
  const [subTo, setSubTo] = useState('');

  useEffect(() => {
    setProfile(loadLS(LS_PROFILE, DEFAULT_PROFILE));
    setPrefs(loadLS(LS_PREFS, DEFAULT_PREFS));
  }, []);
  useEffect(() => saveLS(LS_PROFILE, profile), [profile]);
  useEffect(() => saveLS(LS_PREFS, prefs), [prefs]);

  const unitLabel = prefs.units === 'metric' ? 'kg / cm' : 'lb / in';

  function addProgressPhoto() {
    if (!pUrl) return;
    setProfile(p => ({ ...p, progressPhotos: [...(p.progressPhotos || []), { date: pDate, url: pUrl }] }));
    setPUrl('');
  }
  function delProgressPhoto(idx) {
    setProfile(p => {
      const next = [...(p.progressPhotos || [])];
      next.splice(idx, 1);
      return { ...p, progressPhotos: next };
    });
  }
  function addSuppPhoto() {
    if (!sUrl) return;
    setProfile(p => ({ ...p, supplementsPhotos: [...(p.supplementsPhotos || []), { date: sDate, url: sUrl }] }));
    setSUrl('');
  }
  function delSuppPhoto(idx) {
    setProfile(p => {
      const next = [...(p.supplementsPhotos || [])];
      next.splice(idx, 1);
      return { ...p, supplementsPhotos: next };
    });
  }
  function addSubstitution() {
    if (!subFrom || !subTo) return;
    const id = `sub-${Math.random().toString(36).slice(2,7)}`;
    setPrefs(p => ({ ...p, substitutions: [...(p.substitutions || []), { id, from: subFrom, to: subTo }] }));
    setSubFrom(''); setSubTo('');
  }
  function delSubstitution(id) {
    setPrefs(p => ({ ...p, substitutions: (p.substitutions || []).filter(s => s.id !== id) }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Profile & Preferences</h1>
            <p className="text-sm text-slate-600 mt-1">Edit your basics, units, language, notifications, theme, diet, and substitutions.</p>
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => { saveLS(LS_PROFILE, profile); saveLS(LS_PREFS, prefs); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              <Save size={16}/> Save
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          <TabBtn active={tab==='profile'} onClick={()=>setTab('profile')} icon={User} label="Profile" />
          <TabBtn active={tab==='preferences'} onClick={()=>setTab('preferences')} icon={ListChecks} label="Preferences" />
          <TabBtn active={tab==='dietary'} onClick={()=>setTab('dietary')} icon={Soup} label="Dietary" />
          <TabBtn active={tab==='substitutions'} onClick={()=>setTab('substitutions')} icon={Replace} label="Substitutions" />
          <TabBtn active={tab==='questionnaire'} onClick={()=>setTab('questionnaire')} icon={Info} label="Questionnaire" />
        </div>
      </div>

      {/* Panels */}
      {tab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Basics */}
          <Card title="Basic Info" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Full name" value={profile.fullName} onChange={v=>setProfile(p=>({...p, fullName:v}))} />
              <Input label="Nickname" value={profile.nickname} onChange={v=>setProfile(p=>({...p, nickname:v}))} />
              <Input label="Age" type="number" value={profile.age} onChange={v=>setProfile(p=>({...p, age:+v||0}))} />
              <Input label="Country" value={profile.country} onChange={v=>setProfile(p=>({...p, country:v}))} />
              <Select label="Gender" value={profile.gender} onChange={v=>setProfile(p=>({...p, gender:v}))}
                options={[{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'other',label:'Other'}]}
              />
              <Input label="Job" value={profile.job} onChange={v=>setProfile(p=>({...p, job:v}))} />
            </div>
          </Card>

          {/* Goals & activity */}
          <Card title="Goals & Activity" icon={ListChecks}>
            <Textarea label="Goal" value={profile.goal} onChange={v=>setProfile(p=>({...p, goal:v}))} />
            <Textarea label="Daily activity (description)" value={profile.activityDesc} onChange={v=>setProfile(p=>({...p, activityDesc:v}))} />
            <Input label="Max training days/week" type="number" value={profile.trainingDaysPerWeek} onChange={v=>setProfile(p=>({...p, trainingDaysPerWeek:+v||0}))} />
          </Card>

          {/* Photos */}
          <Card title="Photos (Progress & Supplements)" icon={UploadCloud}>
            <div className="space-y-4">
              {/* Progress */}
              <div>
                <div className="text-sm font-semibold mb-1">Progress photos</div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="date" value={pDate} onChange={e=>setPDate(e.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm" />
                  <input type="url" placeholder="https://image.jpg" value={pUrl} onChange={e=>setPUrl(e.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm" />
                  <button onClick={addProgressPhoto} className="h-9 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50">Add</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(profile.progressPhotos||[]).slice(-4).reverse().map((ph, i) => (
                    <div key={`${ph.url}-${i}`} className="relative rounded-xl overflow-hidden border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.url} alt="progress" className="w-full h-28 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-xs px-2 py-1 flex items-center justify-between">
                        <span>{ph.date}</span>
                        <button className="opacity-80 hover:opacity-100" onClick={()=>delProgressPhoto((profile.progressPhotos||[]).length-1-i)}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplements */}
              <div>
                <div className="text-sm font-semibold mb-1">Supplements photos</div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="date" value={sDate} onChange={e=>setSDate(e.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm" />
                  <input type="url" placeholder="https://image.jpg" value={sUrl} onChange={e=>setSUrl(e.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm" />
                  <button onClick={addSuppPhoto} className="h-9 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50">Add</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(profile.supplementsPhotos||[]).slice(-4).reverse().map((ph, i) => (
                    <div key={`${ph.url}-${i}`} className="relative rounded-xl overflow-hidden border border-slate-200">
                      <img src={ph.url} alt="supp" className="w-full h-28 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-xs px-2 py-1 flex items-center justify-between">
                        <span>{ph.date}</span>
                        <button className="opacity-80 hover:opacity-100" onClick={()=>delSuppPhoto((profile.supplementsPhotos||[]).length-1-i)}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {tab === 'preferences' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* App */}
          <Card title="App Preferences" icon={ListChecks}>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Language" value={prefs.language} onChange={v=>setPrefs(p=>({...p, language:v}))}
                options={[{value:'en',label:'English'},{value:'ar',label:'Arabic'}]}
                icon={Globe}
              />
              <Select label="Theme" value={prefs.theme} onChange={v=>setPrefs(p=>({...p, theme:v}))}
                options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'},{value:'system',label:'System'}]}
                icon={Sun}
              />
              <Select label="Units" value={prefs.units} onChange={v=>setPrefs(p=>({...p, units:v}))}
                options={[{value:'metric',label:'Metric (kg/cm)'},{value:'imperial',label:'Imperial (lb/in)'}]}
                icon={Scale}
              />
              <Select label="Time format" value={prefs.timeFormat} onChange={v=>setPrefs(p=>({...p, timeFormat:v}))}
                options={[{value:'24h',label:'24-hour'},{value:'12h',label:'12-hour'}]}
                icon={Ruler}
              />
              <Input label="Default rest timer (sec)" type="number" value={prefs.restTimerDefaultSec} onChange={v=>setPrefs(p=>({...p, restTimerDefaultSec:+v||0}))} />
              <div className="col-span-2 rounded-xl border border-slate-200 p-3">
                <div className="text-sm font-semibold mb-1 flex items-center gap-2"><Bell size={16}/> Notifications</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Toggle label="Workout reminders" checked={!!prefs.notifications.workouts} onChange={v=>setPrefs(p=>({...p, notifications:{...p.notifications, workouts:v}}))} />
                  <Toggle label="Meals reminders" checked={!!prefs.notifications.meals} onChange={v=>setPrefs(p=>({...p, notifications:{...p.notifications, meals:v}}))} />
                  <Toggle label="Water reminders" checked={!!prefs.notifications.water} onChange={v=>setPrefs(p=>({...p, notifications:{...p.notifications, water:v}}))} />
                  <Toggle label="Supplements reminders" checked={!!prefs.notifications.supplements} onChange={v=>setPrefs(p=>({...p, notifications:{...p.notifications, supplements:v}}))} />
                  <div className="col-span-2">
                    <Input label="Default reminder time" type="time" value={prefs.notifications.remindersTime} onChange={v=>setPrefs(p=>({...p, notifications:{...p.notifications, remindersTime:v}}))} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Privacy */}
          <Card title="Privacy" icon={Shield}>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <Toggle label="Show me in leaderboards" checked={!!prefs.privacy.showInLeaderboards} onChange={v=>setPrefs(p=>({...p, privacy:{...p.privacy, showInLeaderboards:v}}))} />
              <Toggle label="Share progress with coach" checked={!!prefs.privacy.shareProgressWithCoach} onChange={v=>setPrefs(p=>({...p, privacy:{...p.privacy, shareProgressWithCoach:v}}))} />
              <Toggle label="Share nutrition with coach" checked={!!prefs.privacy.shareNutritionWithCoach} onChange={v=>setPrefs(p=>({...p, privacy:{...p.privacy, shareNutritionWithCoach:v}}))} />
              <div className="text-xs text-slate-500 mt-1">Units now: <b>{unitLabel}</b></div>
            </div>
          </Card>
        </motion.div>
      )}

      {tab === 'dietary' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Dietary Preferences" icon={Soup}>
            <div className="grid grid-cols-2 gap-3">
              <Toggle label="Halal" checked={!!prefs.dietary.halal} onChange={v=>setPrefs(p=>({...p, dietary:{...p.dietary, halal:v}}))} />
              <Toggle label="Vegan" checked={!!prefs.dietary.vegan} onChange={v=>setPrefs(p=>({...p, dietary:{...p.dietary, vegan:v}}))} />
              <Toggle label="Lactose-free" checked={!!prefs.dietary.lactoseFree} onChange={v=>setPrefs(p=>({...p, dietary:{...p.dietary, lactoseFree:v}}))} />
              <Toggle label="Gluten-free" checked={!!prefs.dietary.glutenFree} onChange={v=>setPrefs(p=>({...p, dietary:{...p.dietary, glutenFree:v}}))} />
              <div className="col-span-2">
                <Textarea label="Notes (e.g., disliked foods)" value={prefs.dietary.notes} onChange={v=>setPrefs(p=>({...p, dietary:{...p.dietary, notes:v}}))} />
              </div>
            </div>
          </Card>

          <Card title="Quick Tips" icon={Info}>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li>Weigh food <b>after cooking</b> when possible.</li>
              <li>Salt allowed in moderation; avoid hydrogenated oils and refined sugars.</li>
              <li>Diet drinks, tea, and black coffee are fine (or with diet sugar).</li>
              <li>Swap examples: 100 g rice ↔ 120 g potato ↔ 100 g pasta.</li>
              <li>Greek yogurt ↔ 1 scoop whey + 60 ml milk.</li>
            </ul>
          </Card>
        </motion.div>
      )}

      {tab === 'substitutions' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-4">
          <Card title="Food Substitutions" icon={Replace}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input label="From" placeholder="e.g., 100 g rice" value={subFrom} onChange={setSubFrom} />
              <Input label="To" placeholder="e.g., 120 g potato" value={subTo} onChange={setSubTo} />
              <button onClick={addSubstitution} className="h-9 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50 mt-6">Add</button>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {(prefs.substitutions||[]).map(s => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div className="text-sm text-slate-700">{s.from} <ChevronRight size={14} className="inline-block mx-1" /> {s.to}</div>
                  <button onClick={()=>delSubstitution(s.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                </div>
              ))}
              {!(prefs.substitutions||[]).length && <div className="text-sm text-slate-500">No substitutions yet.</div>}
            </div>
          </Card>
        </motion.div>
      )}

      {tab === 'questionnaire' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-4">
        {/* All Q&A translated to English with your dummy answers */}
          <Card title="Client Questionnaire (English)" icon={Info}>
            <QA i="1"  q="Full name or nickname?"                          a={`${profile.fullName} (${profile.nickname})`} />
            <QA i="2"  q="How old are you?"                                 a={`${profile.age} years`} />
            <QA i="3"  q="Where do you live?"                                a={profile.country} />
            <QA i="4"  q="Gender?"                                           a={cap(profile.gender)} />
            <QA i="5"  q="Front/Back/Side body photos?"                      a="I will send the photos tomorrow." />
            <QA i="6"  q="What is your job?"                                 a={profile.job} />
            <QA i="7"  q="Daily movement & activity?"                        a={profile.activityDesc} />
            <QA i="8"  q="What is your goal for this period?"                a={profile.goal} />
            <QA i="9"  q="How did you find Coach Mohamed Abdelghani?"        a={profile.howFound} />
            <QA i="10" q="Why did you choose Coach Mohamed Abdelghani?"      a={profile.whyCoach} />
            <QA i="11" q="Have you trained online before? Why did you stop?" a={profile.trainedOnlineBefore} />
            <QA i="12" q="Since when do you train?"                           a={profile.trainingSince} />
            <QA i="13" q="Any other sport? How many days/week? Primary?"     a={profile.otherSports} />
            <QA i="14" q="Home training or only gym?"                         a={profile.trainingPlace} />
            <QA i="15" q="Max training days per week?"                        a={`${profile.trainingDaysPerWeek} days/week`} />
            <QA i="16" q="Photos of supplements/medications used now?"        a="I will send the photos tomorrow." />
            <QA i="17" q="Are you a smoker?"                                  a={profile.smoker} />
            <QA i="18" q="Any chronic diseases?"                               a={profile.chronicDiseases} />
            <QA i="19" q="Current/past injuries and were they treated?"       a={profile.injuries} />
            <QA i="20" q="Food allergies?"                                    a={profile.foodAllergy} />
            <QA i="21" q="Favorite food types?"                               a={profile.foodLikes} />
            <QA i="22" q="Food types you dislike?"                            a={profile.foodDislikes} />
            <QA i="23" q="Work/study hours?"                                  a={profile.workHours} />
            <QA i="24" q="Hours of sleep and when?"                           a={profile.sleep} />
            <QA i="25" q="Last diet you followed?"                            a={profile.lastDiet} />
            <QA i="26" q="Last training program you followed?"                a={profile.lastProgram} />
            <QA i="27" q="Reasons that might stop you from continuing?"       a={profile.dropOutReasons} />
            <QA i="28" q="Any other details?"                                 a={profile.extraDetails} />

            <div className="mt-4 text-xs text-slate-500">
              Edit any answer in the Profile/Preferences tabs and it will reflect here automatically.
            </div>
          </Card>
        </motion.div>
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
        ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon ? <Icon size={18} className="text-slate-700" /> : null}
        <div className="font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type='text', placeholder='', icon: Icon }) {
  return (
    <label className="block">
      <span className="text-sm font-medium flex items-center gap-2">{Icon ? <Icon size={14}/> : null}{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, rows=3 }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        rows={rows}
        value={value ?? ''}
        onChange={e=>onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}

function Select({ label, value, onChange, options, icon: Icon }) {
  return (
    <label className="block">
      <span className="text-sm font-medium flex items-center gap-2">{Icon ? <Icon size={14}/> : null}{label}</span>
      <select
        value={value}
        onChange={e=>onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={()=>onChange(!checked)}
        className={`h-6 w-11 rounded-full transition relative ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 ${checked ? 'left-6' : 'left-0.5'} h-5 w-5 rounded-full bg-white shadow transition`} />
      </button>
    </label>
  );
}

function QA({ i, q, a }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 mb-2">
      <div className="text-xs text-slate-500">Q{i}</div>
      <div className="text-sm font-medium text-slate-800">{q}</div>
      <div className="text-sm text-slate-700 mt-1">{a}</div>
    </div>
  );
}

function cap(s) {
  if (!s) return '';
  return s.slice(0,1).toUpperCase()+s.slice(1);
}
