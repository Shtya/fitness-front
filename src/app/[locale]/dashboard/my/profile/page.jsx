// /* 
//   Enhanced Profile & Preferences Page
//   - Progress photo history by pose: front, back, left, right (filter: This Month / Last Month / All)
//   - Local upload (File) or URL, with removable items anytime
//   - Body check‑ins (weight, body fat %, plus optional measures) with history + quick delta
//   - Exercise preferences (choose liked/avoid exercises)
//   - Uses your main gradient: bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600
//   - Borders are border-slate-200 everywhere
//   - All persisted to localStorage

//   Notes:
//   • File uploads are kept locally via URL.createObjectURL for preview; replace with your backend upload later and store the returned URL in place of object URLs.
//   • Photo model: { id, date, pose: 'front'|'back'|'left'|'right', src }
//   • Check‑in model: { id, date, weightKg, bodyFatPct, waistCm, chestCm, hipsCm, notes }
// */

// 'use client';

// import { useEffect, useMemo, useRef, useState } from 'react';
// import { motion } from 'framer-motion';
// import {
//   User,
//   Globe,
//   Sun,
//   Bell,
//   Scale,
//   Ruler,
//   Shield,
//   ListChecks,
//   Soup,
//   Replace,
//   Save,
//   Trash2,
//   UploadCloud,
//   Info,
//   ChevronRight,
//   Image as ImageIcon,
//   Filter,
//   Plus,
//   X,
//   Check,
// } from 'lucide-react';

// /* =================== STORAGE KEYS =================== */
// const LS_PROFILE = 'mw.account.profile.v2';
// const LS_PREFS = 'mw.account.prefs.v1';
// const spring = { type: 'spring', stiffness: 220, damping: 26 };

// /* =================== DEFAULTS =================== */
// const DEFAULT_PROFILE = {
//   fullName: 'Ahmed Abdelrahman Mahmoud',
//   nickname: 'Ahmed',
//   age: 25,
//   country: 'Egypt',
//   gender: 'male',
//   job: 'Software Engineer',
//   activityDesc: 'Desk job ~13h seated daily',
//   goal: 'Bulk from 70 kg to 80 kg and improve physique',
//   howFound: 'TikTok',
//   whyCoach: 'Nearby and I follow your work',
//   trainedOnlineBefore: 'No',
//   trainingSince: 'On/off for 1.5+ years',
//   otherSports: 'None',
//   trainingPlace: 'Gym only',
//   trainingDaysPerWeek: 5,
//   smoker: 'No',
//   chronicDiseases: 'Hypertension',
//   injuries: 'Occasional shoulder pain during training',
//   foodAllergy: 'None',
//   foodLikes: 'Most foods',
//   foodDislikes: 'Nothing specific',
//   workHours: '8 AM – 9 PM',
//   sleep: '5–7 hours',
//   lastDiet: 'None',
//   lastProgram: 'Push Pull Legs',
//   dropOutReasons: 'Work stress sometimes',
//   extraDetails: '—',
//   progressPhotos: [], // {id, date, pose, src}
//   checkIns: [], // {id, date, weightKg, bodyFatPct, waistCm, chestCm, hipsCm, notes}
//   exercisePrefs: {
//     liked: ['Bench Press','Lat Pulldown','Romanian Deadlift'],
//     avoid: ['Behind-the-neck Press'],
//   },
// };

// const DEFAULT_PREFS = {
//   language: 'en', // en | ar
//   theme: 'light', // light | dark | system
//   units: 'metric', // metric (kg/cm) | imperial (lb/in)
//   timeFormat: '24h', // 24h | 12h
//   restTimerDefaultSec: 90,
//   notifications: {
//     workouts: true,
//     meals: true,
//     water: true,
//     supplements: true,
//     remindersTime: '09:00',
//   },
//   dietary: {
//     halal: true,
//     vegan: false,
//     lactoseFree: false,
//     glutenFree: false,
//     notes: '',
//   },
//   privacy: {
//     showInLeaderboards: false,
//     shareProgressWithCoach: true,
//     shareNutritionWithCoach: true,
//   },
//   substitutions: [
//     { id: 'sub-1', from: '100 g rice', to: '120 g potato' },
//     { id: 'sub-2', from: '2 brown toast', to: '1 baladi bread' },
//     { id: 'sub-3', from: 'Greek yogurt', to: '1 scoop whey + 60 ml milk' },
//     { id: 'sub-4', from: 'Banana', to: 'Strawberry / Apple / Guava / Pear' },
//   ],
// };

// /* =================== UTIL =================== */
// function loadLS(key, fallback) {
//   try {
//     const v = localStorage.getItem(key);
//     return v ? JSON.parse(v) : fallback;
//   } catch {
//     return fallback;
//   }
// }
// function saveLS(key, val) {
//   try {
//     localStorage.setItem(key, JSON.stringify(val));
//   } catch {}
// }
// function uid(prefix='id') { return `${prefix}-${Math.random().toString(36).slice(2,9)}` }
// function todayStr() { return new Date().toISOString().slice(0, 10) }
// function monthKey(dStr){ const d=new Date(dStr); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
// function lastMonthKey(){ const d=new Date(); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

// /* =================== PAGE =================== */
// export default function ProfileAndPrefsPage() {
//   const [tab, setTab] = useState('profile'); // profile | preferences | dietary | substitutions | questionnaire
//   const [profile, setProfile] = useState(DEFAULT_PROFILE);
//   const [prefs, setPrefs] = useState(DEFAULT_PREFS);

//   // photos state (add form)
//   const [phDate, setPhDate] = useState(todayStr());
//   const [phPose, setPhPose] = useState('front');
//   const [phUrl, setPhUrl] = useState('');
//   const fileRef = useRef(null);

//   // photo filter
//   const [photoScope, setPhotoScope] = useState('this'); // this | last | all

//   // check-in state
//   const [ckDate, setCkDate] = useState(todayStr());
//   const [ckWeight, setCkWeight] = useState('');
//   const [ckFat, setCkFat] = useState('');
//   const [ckWaist, setCkWaist] = useState('');
//   const [ckChest, setCkChest] = useState('');
//   const [ckHips, setCkHips] = useState('');
//   const [ckNotes, setCkNotes] = useState('');

//   // exercise prefs quick list (could come from API)
//   const ALL_EXERCISES = useMemo(()=>[
//     'Bench Press','Incline DB Press','Push-up','Overhead Press','Lateral Raise','Squat','Front Squat','Leg Press','Romanian Deadlift','Hip Thrust','Lat Pulldown','Pull-up','Seated Row','Face Pull','Barbell Curl','Triceps Pushdown','Cable Fly','Hammer Curl','Skullcrusher','Calf Raise'
//   ],[]);

//   useEffect(() => {
//     setProfile(loadLS(LS_PROFILE, DEFAULT_PROFILE));
//     setPrefs(loadLS(LS_PREFS, DEFAULT_PREFS));
//   }, []);
//   useEffect(() => saveLS(LS_PROFILE, profile), [profile]);
//   useEffect(() => saveLS(LS_PREFS, prefs), [prefs]);

//   const unitLabel = prefs.units === 'metric' ? 'kg / cm' : 'lb / in';

//   /* ===== Photos ===== */
//   function addPhotoFromUrl(){
//     if(!phUrl) return;
//     const item = { id: uid('ph'), date: phDate, pose: phPose, src: phUrl.trim() };
//     setProfile(p => ({ ...p, progressPhotos: [...(p.progressPhotos||[]), item] }));
//     setPhUrl('');
//   }
//   function addPhotoFromFile(file){
//     if(!file) return;
//     const objectUrl = URL.createObjectURL(file);
//     const item = { id: uid('ph'), date: phDate, pose: phPose, src: objectUrl };
//     setProfile(p => ({ ...p, progressPhotos: [...(p.progressPhotos||[]), item] }));
//     if(fileRef.current) fileRef.current.value = '';
//   }
//   function removePhoto(id){
//     setProfile(p => ({...p, progressPhotos: (p.progressPhotos||[]).filter(x=>x.id!==id)}));
//   }
//   const filteredPhotos = useMemo(()=>{
//     const arr = (profile.progressPhotos||[]).slice().sort((a,b)=>a.date<b.date?1:-1);
//     if(photoScope==='all') return arr;
//     const targetKey = photoScope==='this' ? monthKey(todayStr()) : lastMonthKey();
//     return arr.filter(x=>monthKey(x.date)===targetKey);
//   },[profile.progressPhotos, photoScope]);

//   /* ===== Check‑ins ===== */
//   function addCheckIn(){
//     const item = {
//       id: uid('ck'),
//       date: ckDate,
//       weightKg: safeNum(ckWeight),
//       bodyFatPct: safeNum(ckFat),
//       waistCm: safeNum(ckWaist),
//       chestCm: safeNum(ckChest),
//       hipsCm: safeNum(ckHips),
//       notes: ckNotes?.trim() || ''
//     };
//     setProfile(p=>({...p, checkIns: [...(p.checkIns||[]), item]}));
//     setCkNotes('');
//   }
//   function removeCheckIn(id){
//     setProfile(p=>({...p, checkIns: (p.checkIns||[]).filter(c=>c.id!==id)}));
//   }
//   const sortedCheckIns = useMemo(()=> (profile.checkIns||[]).slice().sort((a,b)=>a.date<b.date?1:-1), [profile.checkIns]);
//   const latest = sortedCheckIns[0];
//   const prev = sortedCheckIns[1];
//   const deltaWeight = latest && prev ? round(latest.weightKg - prev.weightKg) : 0;
//   const deltaFat = latest && prev ? round(latest.bodyFatPct - prev.bodyFatPct) : 0;

//   /* ===== Exercise prefs ===== */
//   function toggleExercise(listKey, name){
//     setProfile(p=>{
//       const set = new Set(p.exercisePrefs?.[listKey] || []);
//       set.has(name) ? set.delete(name) : set.add(name);
//       return { ...p, exercisePrefs: { ...p.exercisePrefs, [listKey]: Array.from(set) } };
//     });
//   }

//   return (
//     <div className='space-y-6'>
//       {/* Header */}
//       <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
//         <div className='flex items-center justify-between flex-wrap gap-3'>
//           <div>
//             <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>Profile & Preferences</h1>
//             <p className='text-sm text-slate-600 mt-1'>Progress photos by pose, body check‑ins, preferences, diet and more.</p>
//           </div>
//           <div className='inline-flex items-center gap-2'>
//             <button
//               onClick={() => {
//                 saveLS(LS_PROFILE, profile);
//                 saveLS(LS_PREFS, prefs);
//               }}
//               className='inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'>
//               <Save size={16} /> Save
//             </button>
//           </div>
//         </div>
//       </motion.div>

//       {/* Tabs */}
//       <div className='rounded-xl border border-slate-200 bg-white p-2'>
//         <div className='flex flex-wrap gap-2'>
//           <TabBtn active={tab==='profile'} onClick={()=>setTab('profile')} icon={User} label='Profile'/>
//           <TabBtn active={tab==='preferences'} onClick={()=>setTab('preferences')} icon={ListChecks} label='Preferences'/>
//           <TabBtn active={tab==='dietary'} onClick={()=>setTab('dietary')} icon={Soup} label='Dietary'/>
//           <TabBtn active={tab==='substitutions'} onClick={()=>setTab('substitutions')} icon={Replace} label='Substitutions'/>
//           <TabBtn active={tab==='questionnaire'} onClick={()=>setTab('questionnaire')} icon={Info} label='Questionnaire'/>
//         </div>
//       </div>

//       {/* Panels */}
//       {tab === 'profile' && (
//         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
//           {/* Basics */}
//           <Card title='Basic Info' icon={User}>
//             <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
//               <Input label='Full name' value={profile.fullName} onChange={v => setProfile(p => ({ ...p, fullName: v }))} />
//               <Input label='Nickname' value={profile.nickname} onChange={v => setProfile(p => ({ ...p, nickname: v }))} />
//               <Input label='Age' type='number' value={profile.age} onChange={v => setProfile(p => ({ ...p, age: +v || 0 }))} />
//               <Input label='Country' value={profile.country} onChange={v => setProfile(p => ({ ...p, country: v }))} />
//               <Select
//                 label='Gender'
//                 value={profile.gender}
//                 onChange={v => setProfile(p => ({ ...p, gender: v }))}
//                 options={[
//                   { value: 'male', label: 'Male' },
//                   { value: 'female', label: 'Female' },
//                   { value: 'other', label: 'Other' },
//                 ]}
//               />
//               <Input label='Job' value={profile.job} onChange={v => setProfile(p => ({ ...p, job: v }))} />
//             </div>
//           </Card>

//           {/* Progress Photos by Pose */}
//           <Card title='Progress Photos (Front / Back / Left / Right)' icon={UploadCloud}>
//             <div className='rounded-lg border border-slate-200 overflow-hidden'>
//               <div className='bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-3 py-2 flex items-center gap-2'>
//                 <ImageIcon size={16}/>
//                 <span className='font-medium'>Add Photo</span>
//               </div>
//               <div className='p-3 grid grid-cols-1 md:grid-cols-5 gap-2'>
//                 <input type='date' value={phDate} onChange={e=>setPhDate(e.target.value)} className='h-9 rounded-lg border border-slate-200 px-2 text-sm'/>
//                 <Select
//                   label='Pose'
//                   value={phPose}
//                   onChange={setPhPose}
//                   options={[
//                     {value:'front',label:'Front'},
//                     {value:'back',label:'Back'},
//                     {value:'left',label:'Left'},
//                     {value:'right',label:'Right'},
//                   ]}
//                 />
//                 <Input label='Image URL' placeholder='https://image.jpg' value={phUrl} onChange={setPhUrl} />
//                 <button onClick={addPhotoFromUrl} className='h-9 mt-6 rounded-lg border border-slate-200 px-3 text-sm hover:bg-slate-50'>Add URL</button>
//                 <div className='mt-6'>
//                   <input ref={fileRef} type='file' accept='image/*' onChange={e=> addPhotoFromFile(e.target.files?.[0])} className='text-sm'/>
//                 </div>
//               </div>
//             </div>

//             <div className='mt-3 flex items-center justify-between'>
//               <div className='text-sm font-semibold flex items-center gap-2'><Filter size={14}/> Filter</div>
//               <div className='flex gap-2'>
//                 <ScopePill active={photoScope==='this'} onClick={()=>setPhotoScope('this')}>This Month</ScopePill>
//                 <ScopePill active={photoScope==='last'} onClick={()=>setPhotoScope('last')}>Last Month</ScopePill>
//                 <ScopePill active={photoScope==='all'} onClick={()=>setPhotoScope('all')}>All</ScopePill>
//               </div>
//             </div>

//             <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
//               {filteredPhotos.map(ph => (
//                 <div key={ph.id} className='group relative rounded-xl border border-slate-200 overflow-hidden'>
//                   {/* eslint-disable-next-line @next/next/no-img-element */}
//                   <img src={ph.src} alt={ph.pose} className='w-full h-44 object-cover' />
//                   <div className='absolute top-2 left-2 text-[11px] px-2 py-0.5 rounded-full bg-black/60 text-white capitalize'>{ph.pose}</div>
//                   <div className='absolute bottom-0 inset-x-0 bg-black/40 text-white text-xs px-2 py-1 flex items-center justify-between'>
//                     <span>{ph.date}</span>
//                     <button className='opacity-80 hover:opacity-100' onClick={()=>removePhoto(ph.id)}>
//                       <Trash2 size={14}/>
//                     </button>
//                   </div>
//                 </div>
//               ))}
//               {!filteredPhotos.length && (
//                 <div className='text-sm text-slate-500'>No photos in this range.</div>
//               )}
//             </div>
//           </Card>

//           {/* Body Check‑ins */}
//           <Card title='Body Check‑ins (Weight, Body Fat, Measures)' icon={Scale}>
//             <div className='rounded-lg border border-slate-200 overflow-hidden'>
//               <div className='bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-3 py-2 flex items-center gap-2'>
//                 <Plus size={16}/>
//                 <span className='font-medium'>Add Check‑in</span>
//               </div>
//               <div className='p-3 grid grid-cols-2 md:grid-cols-6 gap-2'>
//                 <input type='date' value={ckDate} onChange={e=>setCkDate(e.target.value)} className='h-9 rounded-lg border border-slate-200 px-2 text-sm'/>
//                 <Input label={`Weight (${prefs.units==='metric'?'kg':'lb'})`} type='number' value={ckWeight} onChange={setCkWeight}/>
//                 <Input label='Body Fat %' type='number' value={ckFat} onChange={setCkFat}/>
//                 <Input label={`Waist (${prefs.units==='metric'?'cm':'in'})`} type='number' value={ckWaist} onChange={setCkWaist}/>
//                 <Input label={`Chest (${prefs.units==='metric'?'cm':'in'})`} type='number' value={ckChest} onChange={setCkChest}/>
//                 <Input label={`Hips (${prefs.units==='metric'?'cm':'in'})`} type='number' value={ckHips} onChange={setCkHips}/>
//                 <div className='md:col-span-5 col-span-2'>
//                   <Textarea label='Notes' rows={2} value={ckNotes} onChange={setCkNotes}/>
//                 </div>
//                 <button onClick={addCheckIn} className='h-9 mt-6 rounded-lg border border-slate-200 px-3 text-sm hover:bg-slate-50'>Add</button>
//               </div>
//             </div>

//             {/* Latest summary */}
//             <div className='mt-3 grid grid-cols-1 md:grid-cols-3 gap-3'>
//               <Stat title='Latest Weight' value={latest? fmtWeight(latest.weightKg, prefs.units): '—'} delta={deltaWeight} suffix={prefs.units==='metric'?'kg':'lb'}/>
//               <Stat title='Latest Body Fat' value={latest? `${round(latest.bodyFatPct)} %` : '—'} delta={deltaFat} suffix='%' />
//               <div className='rounded-xl border border-slate-200 p-3 text-sm text-slate-700'>
//                 <div className='font-semibold mb-1'>Last note</div>
//                 <div className='text-slate-600 min-h-10'>{latest?.notes || '—'}</div>
//               </div>
//             </div>

//             {/* History */}
//             <div className='mt-3'>
//               <div className='text-sm font-semibold mb-2'>History</div>
//               <div className='rounded-xl border border-slate-200 overflow-hidden'>
//                 <table className='w-full text-sm'>
//                   <thead className='bg-slate-50'>
//                     <tr className='text-left text-slate-600'>
//                       <th className='px-3 py-2'>Date</th>
//                       <th className='px-3 py-2'>Weight</th>
//                       <th className='px-3 py-2'>Body Fat %</th>
//                       <th className='px-3 py-2 hidden md:table-cell'>Waist</th>
//                       <th className='px-3 py-2 hidden md:table-cell'>Chest</th>
//                       <th className='px-3 py-2 hidden md:table-cell'>Hips</th>
//                       <th className='px-3 py-2'>Notes</th>
//                       <th className='px-3 py-2'></th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {sortedCheckIns.map(row=> (
//                       <tr key={row.id} className='border-t border-slate-100'>
//                         <td className='px-3 py-2'>{row.date}</td>
//                         <td className='px-3 py-2'>{fmtWeight(row.weightKg, prefs.units)}</td>
//                         <td className='px-3 py-2'>{row.bodyFatPct? `${round(row.bodyFatPct)}%`:'—'}</td>
//                         <td className='px-3 py-2 hidden md:table-cell'>{row.waistCm? fmtLen(row.waistCm, prefs.units): '—'}</td>
//                         <td className='px-3 py-2 hidden md:table-cell'>{row.chestCm? fmtLen(row.chestCm, prefs.units): '—'}</td>
//                         <td className='px-3 py-2 hidden md:table-cell'>{row.hipsCm? fmtLen(row.hipsCm, prefs.units): '—'}</td>
//                         <td className='px-3 py-2 max-w-[260px] truncate' title={row.notes}>{row.notes || '—'}</td>
//                         <td className='px-3 py-2 text-right'>
//                           <button onClick={()=>removeCheckIn(row.id)} className='text-slate-400 hover:text-rose-600'>
//                             <Trash2 size={16}/>
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                     {!sortedCheckIns.length && (
//                       <tr><td className='px-3 py-3 text-slate-500' colSpan={8}>No check‑ins yet.</td></tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </Card>

//           {/* Exercise Preferences */}
//           <Card title='Exercise Preferences (Like / Avoid)' icon={ListChecks}>
//             <div className='grid grid-cols-1 gap-3'>
//               <div>
//                 <div className='text-sm font-semibold mb-1'>Tap to toggle Like</div>
//                 <div className='flex flex-wrap gap-2'>
//                   {ALL_EXERCISES.map(name=> (
//                     <Chip
//                       key={name}
//                       label={name}
//                       active={(profile.exercisePrefs?.liked||[]).includes(name)}
//                       onClick={()=>toggleExercise('liked', name)}
//                     />
//                   ))}
//                 </div>
//               </div>
//               <div>
//                 <div className='text-sm font-semibold mb-1'>Tap to toggle Avoid</div>
//                 <div className='flex flex-wrap gap-2'>
//                   {ALL_EXERCISES.map(name=> (
//                     <Chip
//                       key={`avoid-${name}`}
//                       label={name}
//                       active={(profile.exercisePrefs?.avoid||[]).includes(name)}
//                       variant='outline'
//                       onClick={()=>toggleExercise('avoid', name)}
//                     />
//                   ))}
//                 </div>
//               </div>
//               <div className='rounded-xl border border-slate-200 p-3 text-sm text-slate-700'>
//                 <div className='font-semibold mb-1'>Selections</div>
//                 <div>
//                   <span className='text-slate-500 mr-2'>Liked:</span>
//                   {(profile.exercisePrefs?.liked||[]).map(n=> <Tag key={`l-${n}`}>{n}</Tag>)}
//                   {!((profile.exercisePrefs?.liked||[]).length) && <span className='text-slate-400'>—</span>}
//                 </div>
//                 <div className='mt-2'>
//                   <span className='text-slate-500 mr-2'>Avoid:</span>
//                   {(profile.exercisePrefs?.avoid||[]).map(n=> <Tag key={`a-${n}`}>{n}</Tag>)}
//                   {!((profile.exercisePrefs?.avoid||[]).length) && <span className='text-slate-400'>—</span>}
//                 </div>
//               </div>
//             </div>
//           </Card>
//         </motion.div>
//       )}

//       {tab === 'preferences' && (
//         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
//           {/* App */}
//           <Card title='App Preferences' icon={ListChecks}>
//             <div className='grid grid-cols-2 gap-3'>
//               <Select
//                 label='Language'
//                 value={prefs.language}
//                 onChange={v => setPrefs(p => ({ ...p, language: v }))}
//                 options={[
//                   { value: 'en', label: 'English' },
//                   { value: 'ar', label: 'Arabic' },
//                 ]}
//                 icon={Globe}
//               />
//               <Select
//                 label='Theme'
//                 value={prefs.theme}
//                 onChange={v => setPrefs(p => ({ ...p, theme: v }))}
//                 options={[
//                   { value: 'light', label: 'Light' },
//                   { value: 'dark', label: 'Dark' },
//                   { value: 'system', label: 'System' },
//                 ]}
//                 icon={Sun}
//               />
//               <Select
//                 label='Units'
//                 value={prefs.units}
//                 onChange={v => setPrefs(p => ({ ...p, units: v }))}
//                 options={[
//                   { value: 'metric', label: 'Metric (kg/cm)' },
//                   { value: 'imperial', label: 'Imperial (lb/in)' },
//                 ]}
//                 icon={Scale}
//               />
//               <Select
//                 label='Time format'
//                 value={prefs.timeFormat}
//                 onChange={v => setPrefs(p => ({ ...p, timeFormat: v }))}
//                 options={[
//                   { value: '24h', label: '24-hour' },
//                   { value: '12h', label: '12-hour' },
//                 ]}
//                 icon={Ruler}
//               />
//               <Input label='Default rest timer (sec)' type='number' value={prefs.restTimerDefaultSec} onChange={v => setPrefs(p => ({ ...p, restTimerDefaultSec: +v || 0 }))} />
//               <div className='col-span-2 rounded-lg border border-slate-200 p-3'>
//                 <div className='text-sm font-semibold mb-1 flex items-center gap-2'>
//                   <Bell size={16} /> Notifications
//                 </div>
//                 <div className='grid grid-cols-2 gap-2 text-sm'>
//                   <Toggle label='Workout reminders' checked={!!prefs.notifications.workouts} onChange={v => setPrefs(p => ({ ...p, notifications: { ...p.notifications, workouts: v } }))} />
//                   <Toggle label='Meals reminders' checked={!!prefs.notifications.meals} onChange={v => setPrefs(p => ({ ...p, notifications: { ...p.notifications, meals: v } }))} />
//                   <Toggle label='Water reminders' checked={!!prefs.notifications.water} onChange={v => setPrefs(p => ({ ...p, notifications: { ...p.notifications, water: v } }))} />
//                   <Toggle label='Supplements reminders' checked={!!prefs.notifications.supplements} onChange={v => setPrefs(p => ({ ...p, notifications: { ...p.notifications, supplements: v } }))} />
//                   <div className='col-span-2'>
//                     <Input label='Default reminder time' type='time' value={prefs.notifications.remindersTime} onChange={v => setPrefs(p => ({ ...p, notifications: { ...p.notifications, remindersTime: v } }))} />
//                   </div>
//                 </div>
//               </div>
//               <div className='text-xs text-slate-500 mt-1 col-span-2'>Units now: <b>{unitLabel}</b></div>
//             </div>
//           </Card>

//           {/* Privacy */}
//           <Card title='Privacy' icon={Shield}>
//             <div className='grid grid-cols-1 gap-2 text-sm'>
//               <Toggle label='Show me in leaderboards' checked={!!prefs.privacy.showInLeaderboards} onChange={v => setPrefs(p => ({ ...p, privacy: { ...p.privacy, showInLeaderboards: v } }))} />
//               <Toggle label='Share progress with coach' checked={!!prefs.privacy.shareProgressWithCoach} onChange={v => setPrefs(p => ({ ...p, privacy: { ...p.privacy, shareProgressWithCoach: v } }))} />
//               <Toggle label='Share nutrition with coach' checked={!!prefs.privacy.shareNutritionWithCoach} onChange={v => setPrefs(p => ({ ...p, privacy: { ...p.privacy, shareNutritionWithCoach: v } }))} />
//             </div>
//           </Card>
//         </motion.div>
//       )}

//       {tab === 'dietary' && (
//         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
//           <Card title='Dietary Preferences' icon={Soup}>
//             <div className='grid grid-cols-2 gap-3'>
//               <Toggle label='Halal' checked={!!prefs.dietary.halal} onChange={v => setPrefs(p => ({ ...p, dietary: { ...p.dietary, halal: v } }))} />
//               <Toggle label='Vegan' checked={!!prefs.dietary.vegan} onChange={v => setPrefs(p => ({ ...p, dietary: { ...p.dietary, vegan: v } }))} />
//               <Toggle label='Lactose-free' checked={!!prefs.dietary.lactoseFree} onChange={v => setPrefs(p => ({ ...p, dietary: { ...p.dietary, lactoseFree: v } }))} />
//               <Toggle label='Gluten-free' checked={!!prefs.dietary.glutenFree} onChange={v => setPrefs(p => ({ ...p, dietary: { ...p.dietary, glutenFree: v } }))} />
//               <div className='col-span-2'>
//                 <Textarea label='Notes (e.g., disliked foods)' value={prefs.dietary.notes} onChange={v => setPrefs(p => ({ ...p, dietary: { ...p.dietary, notes: v } }))} />
//               </div>
//             </div>
//           </Card>

//           <Card title='Quick Tips' icon={Info}>
//             <ul className='list-disc pl-5 text-sm text-slate-600 space-y-2'>
//               <li>Weigh food <b>after cooking</b> when possible.</li>
//               <li>Salt allowed in moderation; avoid hydrogenated oils and refined sugars.</li>
//               <li>Diet drinks, tea, and black coffee are fine (or with diet sugar).</li>
//               <li>Swap examples: 100 g rice ↔ 120 g potato ↔ 100 g pasta.</li>
//               <li>Greek yogurt ↔ 1 scoop whey + 60 ml milk.</li>
//             </ul>
//           </Card>
//         </motion.div>
//       )}

//       {tab === 'substitutions' && (
//         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-4'>
//           <Card title='Food Substitutions' icon={Replace}>
//             <Subs prefs={prefs} setPrefs={setPrefs} />
//           </Card>
//         </motion.div>
//       )}

//       {tab === 'questionnaire' && (
//         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='space-y-4'>
//           <Card title='Client Questionnaire (English)' icon={Info}>
//             <QA i='1' q='Full name or nickname?' a={`${profile.fullName} (${profile.nickname})`} />
//             <QA i='2' q='How old are you?' a={`${profile.age} years`} />
//             <QA i='3' q='Where do you live?' a={profile.country} />
//             <QA i='4' q='Gender?' a={cap(profile.gender)} />
//             <QA i='5' q='Front/Back/Side body photos?' a='I will send the photos tomorrow.' />
//             <QA i='6' q='What is your job?' a={profile.job} />
//             <QA i='7' q='Daily movement & activity?' a={profile.activityDesc} />
//             <QA i='8' q='What is your goal for this period?' a={profile.goal} />
//             <QA i='9' q='How did you find Coach Mohamed Abdelghani?' a={profile.howFound} />
//             <QA i='10' q='Why did you choose Coach Mohamed Abdelghani?' a={profile.whyCoach} />
//             <QA i='11' q='Have you trained online before? Why did you stop?' a={profile.trainedOnlineBefore} />
//             <QA i='12' q='Since when do you train?' a={profile.trainingSince} />
//             <QA i='13' q='Any other sport? How many days/week? Primary?' a={profile.otherSports} />
//             <QA i='14' q='Home training or only gym?' a={profile.trainingPlace} />
//             <QA i='15' q='Max training days per week?' a={`${profile.trainingDaysPerWeek} days/week`} />
//             <QA i='16' q='Photos of supplements/medications used now?' a='I will send the photos tomorrow.' />
//             <QA i='17' q='Are you a smoker?' a={profile.smoker} />
//             <QA i='18' q='Any chronic diseases?' a={profile.chronicDiseases} />
//             <QA i='19' q='Current/past injuries and were they treated?' a={profile.injuries} />
//             <QA i='20' q='Food allergies?' a={profile.foodAllergy} />
//             <QA i='21' q='Favorite food types?' a={profile.foodLikes} />
//             <QA i='22' q='Food types you dislike?' a={profile.foodDislikes} />
//             <QA i='23' q='Work/study hours?' a={profile.workHours} />
//             <QA i='24' q='Hours of sleep and when?' a={profile.sleep} />
//             <QA i='25' q='Last diet you followed?' a={profile.lastDiet} />
//             <QA i='26' q='Last training program you followed?' a={profile.lastProgram} />
//             <QA i='27' q='Reasons that might stop you from continuing?' a={profile.dropOutReasons} />
//             <QA i='28' q='Any other details?' a={profile.extraDetails} />

//             <div className='mt-4 text-xs text-slate-500'>Edit any answer in the Profile/Preferences tabs and it will reflect here automatically.</div>
//           </Card>
//         </motion.div>
//       )}
//     </div>
//   );
// }

// /* =================== REUSABLE UI =================== */
// function TabBtn({ active, onClick, icon: Icon, label }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition
//         ${active ? 'bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
//       <Icon size={16} />
//       {label}
//     </button>
//   );
// }

// function Card({ title, icon: Icon, children }) {
//   return (
//     <div className='rounded-xl border border-slate-200 bg-white p-4'>
//       <div className='flex items-center gap-2 mb-3'>
//         {Icon ? <Icon size={18} className='text-slate-700' /> : null}
//         <div className='font-semibold'>{title}</div>
//       </div>
//       {children}
//     </div>
//   );
// }

// function Input({ label, value, onChange, type = 'text', placeholder = '', icon: Icon }) {
//   return (
//     <label className='block'>
//       {label && (
//         <span className='text-sm font-medium flex items-center gap-2'>
//           {Icon ? <Icon size={14} /> : null}
//           {label}
//         </span>
//       )}
//       <input type={type} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
//     </label>
//   );
// }

// function Textarea({ label, value, onChange, rows = 3 }) {
//   return (
//     <label className='block'>
//       {label && <span className='text-sm font-medium'>{label}</span>}
//       <textarea rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' />
//     </label>
//   );
// }

// function Select({ label, value, onChange, options, icon: Icon }) {
//   return (
//     <label className='block'>
//       {label && (
//         <span className='text-sm font-medium flex items-center gap-2'>
//           {Icon ? <Icon size={14} /> : null}
//           {label}
//         </span>
//       )}
//       <select value={value} onChange={e => onChange(e.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
//         {options.map(o => (
//           <option key={o.value} value={o.value}>
//             {o.label}
//           </option>
//         ))}
//       </select>
//     </label>
//   );
// }

// function Toggle({ label, checked, onChange }) {
//   return (
//     <label className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
//       <span className='text-sm'>{label}</span>
//       <button type='button' onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full transition relative ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-pressed={checked}>
//         <span className={`absolute top-0.5 ${checked ? 'left-6' : 'left-0.5'} h-5 w-5 rounded-full bg-white shadow transition`} />
//       </button>
//     </label>
//   );
// }

// function QA({ i, q, a }) {
//   return (
//     <div className='rounded-lg border border-slate-200 p-3 mb-2'>
//       <div className='text-xs text-slate-500'>Q{i}</div>
//       <div className='text-sm font-medium text-slate-800'>{q}</div>
//       <div className='text-sm text-slate-700 mt-1'>{a}</div>
//     </div>
//   );
// }

// function ScopePill({active, children, onClick}){
//   return (
//     <button onClick={onClick} className={`px-3 py-1 rounded-full border text-xs ${active? 'bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white border-indigo-300':'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
//       {children}
//     </button>
//   );
// }

// function Stat({ title, value, delta, suffix }){
//   const pos = typeof delta==='number' && delta>0;
//   const neg = typeof delta==='number' && delta<0;
//   return (
//     <div className='rounded-xl border border-slate-200 p-3'>
//       <div className='text-sm text-slate-500'>{title}</div>
//       <div className='text-xl font-semibold text-slate-800 mt-1'>{value}</div>
//       {delta!==0 && (
//         <div className={`text-xs mt-1 ${pos? 'text-emerald-600':'text-rose-600'}`}>{pos? '+':''}{delta} {suffix} since last</div>
//       )}
//     </div>
//   );
// }

// function Chip({ label, active, onClick, variant='solid' }){
//   return (
//     <button onClick={onClick} className={`px-3 py-1.5 rounded-full border text-xs transition flex items-center gap-1
//       ${active
//         ? 'bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white border-indigo-300'
//         : (variant==='outline' ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')
//       }`}>
//       {active && <Check size={12}/>} {label}
//     </button>
//   );
// }

// function Tag({children}){
//   return <span className='inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 mr-1 mb-1'>{children}</span>
// }

// /* ============ helpers ============ */
// function safeNum(v){ const n = Number(v); return Number.isFinite(n) ? n : 0 }
// function round(n){ return Math.round((n + Number.EPSILON) * 10) / 10 }
// function fmtWeight(kg, units){ if(!kg && kg!==0) return '—'; return units==='metric' ? `${round(kg)}` : `${round(kg*2.20462)}` }
// function fmtLen(cm, units){ if(!cm && cm!==0) return '—'; return units==='metric' ? `${round(cm)}` : `${round(cm/2.54)}` }
// function cap(s){ if (!s) return ''; return s.slice(0,1).toUpperCase()+s.slice(1) }

// /* ============ Substitutions ============ */
// function Subs({prefs, setPrefs}){
//   const [subFrom, setSubFrom] = useState('');
//   const [subTo, setSubTo] = useState('');
//   function add(){ if(!subFrom||!subTo) return; const id = uid('sub'); setPrefs(p => ({ ...p, substitutions: [...(p.substitutions || []), { id, from: subFrom, to: subTo }] })); setSubFrom(''); setSubTo(''); }
//   function del(id){ setPrefs(p => ({ ...p, substitutions: (p.substitutions || []).filter(s => s.id !== id) })); }
//   return (
//     <div>
//       <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
//         <Input label='From' placeholder='e.g., 100 g rice' value={subFrom} onChange={setSubFrom} />
//         <Input label='To' placeholder='e.g., 120 g potato' value={subTo} onChange={setSubTo} />
//         <button onClick={add} className='h-9 rounded-lg border border-slate-200 px-3 text-sm hover:bg-slate-50 mt-6'>Add</button>
//       </div>
//       <div className='mt-4 divide-y divide-slate-100'>
//         {(prefs.substitutions || []).map(s => (
//           <div key={s.id} className='flex items-center justify-between py-2'>
//             <div className='text-sm text-slate-700'>
//               {s.from} <ChevronRight size={14} className='inline-block mx-1' /> {s.to}
//             </div>
//             <button onClick={() => del(s.id)} className='text-slate-400 hover:text-rose-600'>
//               <Trash2 size={16} />
//             </button>
//           </div>
//         ))}
//         {!(prefs.substitutions || []).length && <div className='text-sm text-slate-500'>No substitutions yet.</div>}
//       </div>
//     </div>
//   );
// }
'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  CalendarDays,
  Clock,
  Dumbbell,
  Flame,
  Goal,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Utensils,
  X,
  Save,
} from 'lucide-react';

const DEFAULT_PROFILE = {
  fullName: 'Mariam Khaled',
  email: 'mariam.khaled@example.com',
  phone: '+20 111 222 3344',
  city: 'Cairo, Egypt',
  membership: 'Premium Coaching',
  coach: 'Omar El-Sayed',
  goal: 'Lose 6kg and improve strength',
  activityLevel: '3 workouts / week',
  preferredTrainingTime: 'Morning (7:00 AM)',
  dietaryNotes: 'High protein, moderate carbs, lactose free',
};

const UPCOMING_SESSIONS = [
  {
    title: 'Lower Body Strength',
    focus: 'Compound lifts & mobility',
    date: 'Mon, 12 Aug',
    time: '07:00 AM',
    icon: Dumbbell,
  },
  {
    title: 'Cardio & Conditioning',
    focus: 'Intervals + endurance work',
    date: 'Wed, 14 Aug',
    time: '07:30 AM',
    icon: Activity,
  },
  {
    title: 'Upper Body Technique',
    focus: 'Form review & accessory work',
    date: 'Sat, 17 Aug',
    time: '10:00 AM',
    icon: Goal,
  },
];

const ACTIONS = [
  { label: 'Update Goals', description: 'Refresh your fitness targets for the next block.', icon: Goal },
  { label: 'Sync Wearables', description: 'Connect Apple Health, Fitbit or Garmin.', icon: HeartPulse },
  { label: 'Nutrition Check-in', description: 'Share photos of meals & hydration logs.', icon: Utensils },
  { label: 'Adjust Notifications', description: 'Choose reminders for workouts & meals.', icon: Bell },
];

function ArrowIcon(props) {
  return (
    <svg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      <path d='M6 3l4 5-4 5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [formState, setFormState] = useState(DEFAULT_PROFILE);

  const highlightCards = useMemo(
    () => [
      {
        label: 'This week workouts',
        value: '3 booked',
        trend: '+1 vs last week',
        icon: Dumbbell,
        accent: 'from-indigo-500/90 to-indigo-600',
      },
      {
        label: 'Calories target',
        value: '1,950 kcal',
        trend: 'On track',
        icon: Flame,
        accent: 'from-orange-500/90 to-amber-500',
      },
      {
        label: 'Recovery score',
        value: '82%',
        trend: 'Great job!',
        icon: HeartPulse,
        accent: 'from-emerald-500/90 to-teal-500',
      },
    ],
    []
  );

  const upcomingSessionCards = useMemo(
    () =>
      UPCOMING_SESSIONS.map(session => ({
        ...session,
        accent: session.icon === Activity ? 'bg-sky-100 text-sky-600' : session.icon === Goal ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600',
      })),
    []
  );

  const dietaryTags = useMemo(() => {
    const source = editing ? formState.dietaryNotes : profile.dietaryNotes;
    return source.split(',').map(tag => tag.trim()).filter(Boolean);
  }, [editing, formState.dietaryNotes, profile.dietaryNotes]);

  const handleChange = event => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormState(profile);
    setEditing(false);
  };

  const handleSave = () => {
    setProfile(formState);
    setEditing(false);
  };

  return (
    <div className='space-y-6'>
      <header className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex items-center gap-4'>
            <div className='grid size-20 place-content-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 text-white shadow-lg'>
              <UserRound className='size-10' />
            </div>
            <div>
              <h1 className='text-2xl font-semibold text-slate-900 sm:text-3xl'>{profile.fullName}</h1>
              <p className='text-sm text-slate-500'>{profile.membership}</p>
              <div className='mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600'>
                <span className='inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1'>
                  <ShieldCheck className='size-4 text-emerald-500' />
                  Client since 2022
                </span>
                <span className='inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1'>
                  <MapPin className='size-4 text-indigo-500' />
                  {profile.city}
                </span>
                <span className='inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1'>
                  <CalendarDays className='size-4 text-rose-500' />
                  Next check-in: 18 Aug
                </span>
              </div>
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            {editing ? (
              <>
                <button onClick={handleCancel} className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                  <X className='size-4' />
                  Cancel
                </button>
                <button onClick={handleSave} className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500'>
                  <Save className='size-4' />
                  Save changes
                </button>
              </>
            ) : (
              <button onClick={() => { setFormState(profile); setEditing(true); }} className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500'>
                Edit profile
              </button>
            )}
          </div>
        </div>
      </header>

      <section className='grid gap-4 md:grid-cols-3'>
        {highlightCards.map(card => (
          <div key={card.label} className='relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg'>
            <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${card.accent} opacity-20`} aria-hidden />
            <div className='relative flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>{card.label}</p>
                <p className='mt-2 text-2xl font-semibold text-slate-900'>{card.value}</p>
                <p className='mt-1 text-xs text-emerald-600'>{card.trend}</p>
              </div>
              <div className='grid size-12 place-content-center rounded-xl bg-indigo-50 text-indigo-600'>
                <card.icon className='size-6' />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Personal details</h2>
                <p className='text-sm text-slate-500'>These details are shared with your coach to personalise your programme.</p>
              </div>
            </div>

            <div className='mt-6 grid gap-5 sm:grid-cols-2'>
              <Field label='Full name' name='fullName' value={formState.fullName} onChange={handleChange} editing={editing} />
              <Field label='Email address' name='email' value={formState.email} onChange={handleChange} editing={editing} icon={Mail} />
              <Field label='Phone number' name='phone' value={formState.phone} onChange={handleChange} editing={editing} icon={Phone} />
              <Field label='City' name='city' value={formState.city} onChange={handleChange} editing={editing} icon={MapPin} />
              <Field label='Preferred training time' name='preferredTrainingTime' value={formState.preferredTrainingTime} onChange={handleChange} editing={editing} icon={Clock} />
              <Field label='Activity level' name='activityLevel' value={formState.activityLevel} onChange={handleChange} editing={editing} icon={Activity} />
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Goals & focus</h2>
            <p className='text-sm text-slate-500'>Align with your coach on what matters most this block.</p>
            <textarea
              name='goal'
              rows={4}
              value={formState.goal}
              onChange={handleChange}
              disabled={!editing}
              className='mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100'
            />
            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              <InfoBadge icon={ShieldCheck} label='Assigned coach' value={profile.coach} />
              <InfoBadge icon={Flame} label='Current focus' value='Fat loss & strength' />
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Nutrition notes</h2>
            <p className='text-sm text-slate-500'>Capture any important dietary considerations or preferences.</p>
            <textarea
              name='dietaryNotes'
              rows={3}
              value={formState.dietaryNotes}
              onChange={handleChange}
              disabled={!editing}
              className='mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100'
            />
            {dietaryTags.length ? (
              <div className='mt-4 flex flex-wrap gap-2'>
                {dietaryTags.map(tag => (
                  <span key={tag} className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600'>
                    <Utensils className='size-3' />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className='space-y-6'>
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Upcoming sessions</h2>
            <div className='mt-4 space-y-4'>
              {upcomingSessionCards.map(session => (
                <div key={session.title} className='flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3'>
                  <div className={`grid size-10 place-content-center rounded-xl ${session.accent}`}>
                    <session.icon className='size-5' />
                  </div>
                  <div className='flex-1'>
                    <p className='text-sm font-semibold text-slate-800'>{session.title}</p>
                    <p className='text-xs text-slate-500'>{session.focus}</p>
                    <div className='mt-2 flex flex-wrap gap-3 text-xs text-slate-500'>
                      <span className='inline-flex items-center gap-1 rounded-full bg-white px-2 py-1'>
                        <CalendarDays className='size-3 text-indigo-500' />
                        {session.date}
                      </span>
                      <span className='inline-flex items-center gap-1 rounded-full bg-white px-2 py-1'>
                        <Clock className='size-3 text-indigo-500' />
                        {session.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Wellness snapshot</h2>
            <ul className='mt-4 space-y-3 text-sm text-slate-600'>
              <li className='flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2'>
                <span className='inline-flex items-center gap-2 text-slate-500'>
                  <HeartPulse className='size-4 text-rose-500' /> Resting heart rate
                </span>
                <span className='font-semibold text-slate-900'>61 bpm</span>
              </li>
              <li className='flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2'>
                <span className='inline-flex items-center gap-2 text-slate-500'>
                  <Flame className='size-4 text-orange-500' /> Average burn
                </span>
                <span className='font-semibold text-slate-900'>520 kcal / session</span>
              </li>
              <li className='flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2'>
                <span className='inline-flex items-center gap-2 text-slate-500'>
                  <Utensils className='size-4 text-emerald-500' /> Nutrition compliance
                </span>
                <span className='font-semibold text-slate-900'>88%</span>
              </li>
            </ul>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Quick actions</h2>
            <div className='mt-4 space-y-3'>
              {ACTIONS.map(action => (
                <button key={action.label} className='flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 text-left text-sm text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-slate-800'>
                  <div className='grid size-10 place-content-center rounded-xl bg-slate-50 text-indigo-600'>
                    <action.icon className='size-5' />
                  </div>
                  <div className='flex-1'>
                    <p className='font-semibold text-slate-900'>{action.label}</p>
                    <p className='text-xs text-slate-500'>{action.description}</p>
                  </div>
                  <ArrowIcon className='size-4 text-slate-400' />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, name, value, onChange, editing, icon: Icon }) {
  return (
    <label className='space-y-2'>
      <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{label}</span>
      <div className='relative'>
        {Icon ? <Icon className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400' /> : null}
        <input
          type='text'
          name={name}
          value={value}
          onChange={onChange}
          disabled={!editing}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  );
}

function InfoBadge({ icon: Icon, label, value }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3'>
      <div className='grid size-10 place-content-center rounded-xl bg-indigo-50 text-indigo-600'>
        <Icon className='size-5' />
      </div>
      <div>
        <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>{label}</p>
        <p className='text-sm font-semibold text-slate-900'>{value}</p>
      </div>
    </div>
  );
}