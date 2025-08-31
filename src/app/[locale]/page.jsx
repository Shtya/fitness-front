'use client';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Play, Pause, RotateCcw, Dumbbell, Utensils, NotebookPen, Salad, Phone, Youtube, Search } from 'lucide-react';

 
export default function GymTracker() {
 
  // Tabs / language
  const [activeTab, setActiveTab] = useState('training');
  const [language, setLanguage] = useState('ar');

  // Training state
  const [activeDay, setActiveDay] = useState('Day1');
  const [workouts, setWorkouts] = useState({}); // reserved for future
  const [workoutProgress, setWorkoutProgress] = useState({});
  const [activeExercise, setActiveExercise] = useState(null);

  // Meals / nutrition
  const [mealsCompleted, setMealsCompleted] = useState({});

  // Report state
  const [reportData, setReportData] = useState({
    hunger: '',
    mood: '',
    foodAdditions: '',
    foodQuantity: '',
    dietDeviation: '',
    workoutIntensity: '',
    workoutDeviation: '',
    physicalChanges: '',
    fitnessLevel: '',
    sleep: '',
    comments: '',
    cardioCommitment: 3,
    phoneNumber: '',
  });
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Timer state
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerConfig, setTimerConfig] = useState({ workTime: 60, restTime: 90, sets: 3, reps: 12 });

  // -------- Sample Data (unchanged content, enhanced UI) --------
  const workoutData = {
    Day1: {
      title: 'Push Day',
      exercises: [
        { name: 'Machine Flat Chest Press', sets: 3, reps: 8, video: '#', image: '#' },
        { name: 'Cable Crossover Press', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Machine Incline Chest Press', sets: 3, reps: 12, video: '#', image: '#' },
        { name: 'Dumbbell Lateral Raises', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Machine Lateral Raises', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Tricep Pushdown Rope', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Tricep Extension V Bar', sets: 3, reps: 15, video: '#', image: '#' },
      ],
    },
    Day2: {
      title: 'Pull Day',
      exercises: [
        { name: 'Machine Wide Grip Row', sets: 3, reps: 8, video: '#', image: '#' },
        { name: 'Seated Row Close Grip', sets: 3, reps: 12, video: '#', image: '#' },
        { name: 'Lat Pulldown', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Reverse Fly Machine', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Cable Biceps Curl', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Wide Grip Barbell Shrugs', sets: 2, reps: 15, video: '#', image: '#' },
        { name: 'Back Extension', sets: 4, reps: 20, video: '#', image: '#' },
      ],
    },
    Day3: {
      title: 'Leg Day',
      exercises: [
        { name: 'Leg Extension', sets: 3, reps: 20, video: '#', image: '#' },
        { name: 'Leg Curl', sets: 3, reps: 20, video: '#', image: '#' },
        { name: 'Leg Press', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Standing Calf Raises', sets: 3, reps: 20, video: '#', image: '#' },
        { name: 'Seated Calf Raises', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'Cable Crunches', sets: 3, reps: 20, video: '#', image: '#' },
      ],
    },
    Day4: {
      title: 'Push Day 2',
      exercises: [
        { name: 'Smith Machine Flat Chest Press', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'Dips Machine', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'Smith Machine Incline Bench Press', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'Rope Front Raises', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'One Hand Cable Lateral Raises', sets: 3, reps: 15, video: '#' },
        { name: 'One Hand Tricep Pushdown', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'Plank', sets: 3, duration: '1m', video: '#', image: '#' },
      ],
    },
    Day5: {
      title: 'Pull Day 2',
      exercises: [
        { name: 'Reverse Grip Seated Row', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'Lat Pulldown Close Grip', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'One Arm Cable Row', sets: 3, reps: 10, video: '#', image: '#' },
        { name: 'Face Pull', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Bicep Spider Curl', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Hammer Curl', sets: 3, reps: 15, video: '#', image: '#' },
        { name: 'Russian Twist', sets: 3, reps: 25, video: '#', image: '#' },
      ],
    },
  };

  const mealPlan = {
    Meal1: '2 whole egg, 2 brown toast, vegetables',
    Meal2: '50g oats, 10g nuts, 150g bananas, 100ml milk',
    Meal3: '150g chicken or any kind fish, 150g rice, 10g nuts, Vegetables',
    Meal4: '150g chicken or any kind of fish, 150g rice, 10g nuts, Vegetables',
    Meal5: 'Greek yogurt, 100g strawberries',
  };

  const foodDatabase = [
    { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, portion: '100g' },
    { name: 'Brown Rice', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, portion: '100g cooked' },
    { name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, portion: '100g' },
    { name: 'Eggs', calories: 155, protein: 13, carbs: 1.1, fat: 11, portion: '2 large eggs' },
    { name: 'Oats', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, portion: '100g' },
    { name: 'Banana', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, portion: '100g' },
    { name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, portion: '100g' },
    { name: 'Almonds', calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, portion: '100g' },
    { name: 'Whole Wheat Bread', calories: 247, protein: 13, carbs: 41, fat: 3.4, portion: '100g' },
    { name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, portion: '100g' },
  ];

  const notes = ['1: Start your workout with 3 minutes dynamic stretching', '2: 10 minutes cycling warm up in leg day', '3: After workout 20 minutes steady state cardio workout', '4: Finish your workout with 3 minutes static stretching', 'Rest time: 1m :90s max', 'TEMPO 1/1/1: ال tempo هو سرعة ادائك لكل عده في كل مجموعه', 'بمعني انك بتثبت ثانيه في نقطة البدايه وثانيه في نقطة النهايه', 'بتتحكم في الوزن بمقادر ثانيه في الرجوع من نقطة النهايه لنقطة البدايه', 'اختيار وزن مناسب حسب العدات المطلوبه', 'لا يتم احتساب المجاميع الغير مؤثره'];

  const supplements = ['حباية مالتي فيتامين بعد الوجبه الأولي', 'حباية اوميجا بعد الوجبه التانيه', 'حباية زنك بعد الوجبه الاخيره', 'مسموح بالملح ولاكن كميه معتدله', 'شرب اربعه لتر ميه يوميا', 'مسموح بالمشروبات الدايت و الشاي و القهوه ساده او بسكر دايت', 'ميزان الاكل بعد الطبخ/ ميزان الاكل مهم', 'ممنوع اي نوع من أنواع الزيوت المهدرجة أو السكر المصنع/ الشيت ميل بنحددها سوا قبليها', 'كل 100g رز تقدر تبدلهم ب 120g بطاطس أو بطاطا او100g مكرونه', 'السلطه ملهاش عدد جرامات محدد وممكن تاكل اي نوع من أنواع الخضروات خيار طماطم جزر وهكذا وممكن تبدلهم بخضار سوتيه', 'يمكن دمج الوجبات أو تبديلها', 'يمكن تبديل كل 2 brown toast برغيف عيش بلدي', 'يمكن تبديل ال greek yogurt ب سكوب بروتين و 60ml milk', 'يمكن تبديل الموز ب فراوله او تفاح او جوافه او كمثرا', 'تلاته جرام كرياتين قبل التمرين (مش ضروري ولاكن مفيد)', 'ضروري جدا نسبة الملح في اكلك تكون معتدله'];

  // -------- Effects (persist state) --------
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('workoutProgress');
    const savedMeals = localStorage.getItem('mealsCompleted');
    const savedLanguage = localStorage.getItem('language');

    if (savedWorkouts) setWorkoutProgress(JSON.parse(savedWorkouts));
    if (savedMeals) setMealsCompleted(JSON.parse(savedMeals));
    if (savedLanguage) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    localStorage.setItem('workoutProgress', JSON.stringify(workoutProgress));
  }, [workoutProgress]);

  useEffect(() => {
    localStorage.setItem('mealsCompleted', JSON.stringify(mealsCompleted));
  }, [mealsCompleted]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Timer
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => setTimer(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = t => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = () => setIsTimerRunning(true);
  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimer(0);
  };

  // Handlers
  const handleSetComplete = (day, exerciseIndex, setIndex) => {
    const next = { ...workoutProgress };
    if (!next[day]) next[day] = {};
    if (!next[day][exerciseIndex]) next[day][exerciseIndex] = {};
    next[day][exerciseIndex][setIndex] = !next[day][exerciseIndex][setIndex];
    setWorkoutProgress(next);
  };

  const handleMealComplete = meal => {
    const n = { ...mealsCompleted };
    n[meal] = !n[meal];
    setMealsCompleted(n);
  };

  const handleReportChange = (field, value) => setReportData({ ...reportData, [field]: value });

  const sendReport = () => {
    if (!reportData.phoneNumber) {
      setShowPhoneModal(true);
      return;
    }
    alert(language === 'ar' ? 'تم إرسال التقرير الأسبوعي بنجاح!' : 'Weekly report sent successfully!');
    console.log('Weekly Report:', reportData);
  };

  const toggleLanguage = () => setLanguage(language === 'ar' ? 'en' : 'ar');

  const startExercise = (exercise, day) => {
    setActiveExercise({ ...exercise, day });
    setTimerConfig({
      workTime: 60,
      restTime: 90,
      sets: exercise.sets,
      reps: exercise.reps || 12,
    });
    resetTimer();
  };

  // Food helpers
  const [foodQuery, setFoodQuery] = useState('');
  const [selectedFoodIndex, setSelectedFoodIndex] = useState(0);
  const [amount, setAmount] = useState(100);

  const filteredFood = useMemo(() => {
    const q = foodQuery.trim().toLowerCase();
    if (!q) return foodDatabase;
    return foodDatabase.filter(f => f.name.toLowerCase().includes(q));
  }, [foodQuery]);

  const caloriesFor = (f, amt) => Math.round((f.calories * amt) / 100);

  // Progress aggregations
  const dayProgress = useMemo(() => {
    const day = workoutData[activeDay];
    if (!day) return 0;
    const totalSets = day.exercises.reduce((acc, ex) => acc + ex.sets, 0);
    const done = Object.values(workoutProgress[activeDay] || {}).reduce((acc, exSets) => acc + Object.values(exSets).filter(Boolean).length, 0);
    return totalSets ? Math.round((done / totalSets) * 100) : 0;
  }, [activeDay, workoutProgress]);

  // =============== NEW: WGER SEARCH TAB STATE & LOGIC ===============
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [exerciseHits, setExerciseHits] = useState([]); // exercises from /exercise/
  const [videoHits, setVideoHits] = useState([]); // videos for matched exercises from /video/
  const [videoNext, setVideoNext] = useState(null); // pagination for videos

  const WGER_BASE = 'https://wger.de/api/v2';

  async function searchWgerByName(name) {
    try {
      setSearchLoading(true);
      setSearchError('');
      setExerciseHits([]);
      setVideoHits([]);
      setVideoNext(null);

      // 1) Find exercises by (partial) name — English language=2 (most complete)
      const exRes = await fetch(`${WGER_BASE}/exercise/?language=2&name=${encodeURIComponent(name)}`);
      if (!exRes.ok) throw new Error(`Exercise search failed ${exRes.status}`);
      const exJson = await exRes.json();
      const exercises = exJson.results || [];
      setExerciseHits(exercises);

      if (exercises.length === 0) {
        setSearchLoading(false);
        return; // no matches
      }

      // 2) Fetch videos for all found exercise IDs (first page)
      const ids = exercises.map(e => e.id).join(',');
      // wger video endpoint doesn't accept multiple ids at once; fetch first page and filter client-side
      const vidRes = await fetch(`${WGER_BASE}/video/?limit=20&offset=0`);
      if (!vidRes.ok) throw new Error(`Video fetch failed ${vidRes.status}`);
      const vidJson = await vidRes.json();
      // Filter by exercise ids
      const vids = (vidJson.results || []).filter(v => ids.split(',').includes(String(v.exercise)));
      setVideoHits(vids);
      setVideoNext(vidJson.next);
    } catch (err) {
      setSearchError(err.message || 'Unknown error');
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadMoreVideos() {
    if (!videoNext) return;
    try {
      setSearchLoading(true);
      const res = await fetch(videoNext);
      if (!res.ok) throw new Error(`Video fetch failed ${res.status}`);
      const json = await res.json();
      setVideoNext(json.next);

      // keep filtering to only the exercises we have
      const idSet = new Set(exerciseHits.map(e => String(e.id)));
      const more = (json.results || []).filter(v => idSet.has(String(v.exercise)));
      setVideoHits(prev => [...prev, ...more]);
    } catch (e) {
      setSearchError(e.message || 'Unknown error');
    } finally {
      setSearchLoading(false);
    }
  }

  // UI helpers
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const t = (en, ar) => (language === 'ar' ? ar : en);

  return (
    <div className='min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-indigo-50 to-white text-slate-800' dir={dir}>
      <Head>
        <title>{t('Advanced Gym Tracker', 'متتبع التدريب المتقدم')}</title>
        <meta name='description' content='Comprehensive gym workout tracking application' />
      </Head>

      {/* Header */}
      <header className='sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 border-b border-slate-200'>
        <div className='mx-auto max-w-6xl px-4 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120 }} className='h-10 w-10 grid place-items-center rounded-xl bg-main '>
              <Dumbbell className='h-5 w-5' />
            </motion.div>
            <h1 className='text-xl md:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700'>{t('Advanced Gym Tracker', 'متتبع التدريب المتقدم')}</h1>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={toggleLanguage} className='px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:opacity-95'>
            {t('العربية', 'English')}
          </motion.button>
        </div>

        {/* Tabs */}
        <div className='mx-auto max-w-6xl px-4 pb-3'>
          <div className='relative flex w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm'>
            {[
              { key: 'training', labelEn: 'Training', labelAr: 'التدريب', icon: <Dumbbell className='h-4 w-4' /> },
              { key: 'nutrition', labelEn: 'Nutrition', labelAr: 'التغذية', icon: <Utensils className='h-4 w-4' /> },
              { key: 'food', labelEn: 'Food Database', labelAr: 'قائمة الطعام', icon: <Salad className='h-4 w-4' /> },
              { key: 'report', labelEn: 'Weekly Report', labelAr: 'التقرير الأسبوعي', icon: <NotebookPen className='h-4 w-4' /> },
              { key: 'notes', labelEn: 'Notes', labelAr: 'ملاحظات', icon: <NotebookPen className='h-4 w-4' /> },
              { key: 'search', labelEn: 'Search (Wger)', labelAr: 'بحث (Wger)', icon: <Search className='h-4 w-4' /> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`relative mx-1 my-1 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition`}>
                {tab.icon}
                <span>{t(tab.labelEn, tab.labelAr)}</span>
                {activeTab === tab.key && <motion.span layoutId='tab-pill' className='absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow' transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
                {activeTab === tab.key && <span className='absolute inset-0 -z-10 rounded-xl' />}
                <span className={`${activeTab === tab.key ? 'text-white' : 'text-slate-600'}`}></span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-6xl px-4 py-6'>
        {/* TRAINING */}
        {activeTab === 'training' && (
          <div>
            {/* Day selector */}
            <div className='flex overflow-x-auto gap-2 py-2 mb-5'>
              {Object.keys(workoutData).map(day => (
                <motion.button key={day} whileTap={{ scale: 0.98 }} onClick={() => setActiveDay(day)} className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm ${activeDay === day ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-indigo-700 hover:border-indigo-300'}`}>
                  {workoutData[day].title}
                </motion.button>
              ))}
            </div>

            {/* Progress card */}
            <div className='bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-5 shadow'>
              <div className='flex items-center justify-between'>
                <h2 className='text-lg font-bold text-indigo-700'>{t('Daily Instructions', 'إرشادات اليوم')}</h2>
                <div className='text-sm text-slate-600 font-medium'>
                  {t('Day progress', 'تقدم اليوم')} :<span className='ms-2 inline-block rounded-full bg-indigo-50 px-2 py-1 text-indigo-700 font-bold'>{dayProgress}%</span>
                </div>
              </div>
              <div className='mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden'>
                <motion.div key={dayProgress} initial={{ width: 0 }} animate={{ width: `${dayProgress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} className='h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-600' />
              </div>
              <ul className='mt-4 grid grid-cols-1 md:grid-cols-2 gap-2'>
                {notes.map((note, i) => (
                  <li key={i} className='flex items-start gap-2 rounded-xl bg-indigo-50/60 p-3 text-slate-700'>
                    <Check className='mt-0.5 h-4 w-4 text-indigo-600' />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Active exercise panel */}
            <AnimatePresence>
              {activeExercise && (
                <motion.div key='active-ex' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className='mt-5 bg-white rounded-2xl border border-slate-200 p-5 shadow'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <h3 className='text-lg font-bold text-indigo-700'>{t('Active Exercise', 'تمارين نشطة')}</h3>
                    <button onClick={() => setActiveExercise(null)} className='rounded-lg bg-rose-500 px-3 py-1.5 text-white'>
                      {t('Close', 'إغلاق')}
                    </button>
                  </div>

                  <div className='mt-3 flex flex-wrap items-center justify-between gap-4'>
                    <span className='font-semibold'>{activeExercise.name}</span>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='rounded-xl bg-indigo-50 p-3 text-center'>
                        <div className='text-xs text-indigo-700'>{t('Sets', 'المجموعات')}</div>
                        <div className='text-xl font-extrabold'>{activeExercise.sets}</div>
                      </div>
                      <div className='rounded-xl bg-indigo-50 p-3 text-center'>
                        <div className='text-xs text-indigo-700'>{t('Reps', 'التكرارات')}</div>
                        <div className='text-xl font-extrabold'>{activeExercise.reps || activeExercise.duration}</div>
                      </div>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className='mt-4 text-center'>
                    <div className='text-4xl font-black tracking-tight text-slate-800'>{formatTime(timer)}</div>
                    <div className='mt-3 flex items-center justify-center gap-2'>
                      {!isTimerRunning ? (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={startTimer} className='flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white shadow'>
                          <Play className='h-4 w-4' /> {t('Start', 'بدء')}
                        </motion.button>
                      ) : (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={pauseTimer} className='flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-white shadow'>
                          <Pause className='h-4 w-4' /> {t('Pause', 'إيقاف')}
                        </motion.button>
                      )}
                      <motion.button whileTap={{ scale: 0.95 }} onClick={resetTimer} className='flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-white shadow'>
                        <RotateCcw className='h-4 w-4' /> {t('Reset', 'إعادة تعيين')}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Exercises list */}
            <div className='mt-5 grid gap-4'>
              {workoutData[activeDay].exercises.map((exercise, exIndex) => {
                const setsDone = Object.values(workoutProgress[activeDay]?.[exIndex] || {}).filter(Boolean).length;
                const percent = Math.round((setsDone / exercise.sets) * 100);
                return (
                  <motion.div key={exIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='rounded-2xl border border-slate-200 bg-white p-4 shadow'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <h3 className='text-base md:text-lg font-bold text-slate-800'>{exercise.name}</h3>
                      <div className='flex items-center gap-2'>
                        <span className='rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700'>
                          {exercise.sets} × {exercise.reps || exercise.duration}
                        </span>
                        <motion.button whileTap={{ scale: 0.98 }} className='rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow' onClick={() => startExercise(exercise, activeDay)}>
                          {t('Start', 'بدء التمرين')}
                        </motion.button>
                        <button className='flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50'>
                          <Youtube className='h-4 w-4 text-rose-600' /> {t('Video', 'فيديو')}
                        </button>
                      </div>
                    </div>

                    {/* mini progress */}
                    <div className='mt-3 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden'>
                      <motion.div key={percent} initial={{ width: 0 }} animate={{ width: `${percent}%` }} className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600' />
                    </div>

                    <div className='mt-3 flex flex-wrap gap-2'>
                      {Array.from({ length: exercise.sets }).map((_, setIndex) => (
                        <button key={setIndex} onClick={() => handleSetComplete(activeDay, exIndex, setIndex)} className={`size-10 rounded-full font-medium grid place-items-center transition ${workoutProgress[activeDay]?.[exIndex]?.[setIndex] ? 'bg-emerald-500 text-white shadow' : 'bg-slate-200 text-slate-700'}`}>
                          {setIndex + 1}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* NUTRITION */}
        {activeTab === 'nutrition' && (
          <div>
            <h2 className='mb-4 text-lg md:text-xl font-bold text-indigo-700'>{t('Daily Nutrition Plan', 'خطة التغذية اليومية')}</h2>
            <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow mb-6'>
              <h3 className='mb-3 text-base md:text-lg font-bold text-slate-800'>{t('Supplements & Guidelines', 'المكملات والإرشادات')}</h3>
              <ul className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                {supplements.map((s, i) => (
                  <li key={i} className='flex items-start gap-2 rounded-xl bg-emerald-50/70 p-3 text-slate-700'>
                    <Check className='mt-0.5 h-4 w-4 text-emerald-600' />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className='grid gap-4'>
              {Object.entries(mealPlan).map(([meal, description]) => (
                <div key={meal} className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow'>
                  <div>
                    <h3 className='font-bold text-slate-800'>{meal}:</h3>
                    <p className='text-slate-700'>{description}</p>
                  </div>
                  <label className='relative inline-flex cursor-pointer items-center'>
                    <input type='checkbox' className='peer sr-only' checked={mealsCompleted[meal] || false} onChange={() => handleMealComplete(meal)} />
                    <div className='h-7 w-14 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500'></div>
                    <div className='absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-7'></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOD DATABASE */}
        {activeTab === 'food' && (
          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow'>
            <h2 className='mb-4 text-lg md:text-xl font-bold text-indigo-700'>{t('Food Database', 'قاعدة بيانات الطعام')}</h2>

            <div className='mb-4'>
              <input type='text' value={foodQuery} onChange={e => setFoodQuery(e.target.value)} placeholder={t('Search for food...', 'ابحث عن الطعام...')} className='w-full rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500' />
            </div>

            <div className='overflow-x-auto rounded-xl border border-slate-200'>
              <table className='w-full table-auto text-sm'>
                <thead>
                  <tr className='bg-indigo-50 text-indigo-800'>
                    <th className='px-4 py-2 text-left'>{t('Food', 'الطعام')}</th>
                    <th className='px-4 py-2 text-left'>{t('Portion', 'الكمية')}</th>
                    <th className='px-4 py-2 text-left'>{t('Calories', 'السعرات')}</th>
                    <th className='px-4 py-2 text-left'>{t('Protein', 'البروتين')}</th>
                    <th className='px-4 py-2 text-left'>{t('Carbs', 'الكربوهيدرات')}</th>
                    <th className='px-4 py-2 text-left'>{t('Fat', 'الدهون')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFood.map((food, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className='px-4 py-2 font-medium'>{food.name}</td>
                      <td className='px-4 py-2'>{food.portion}</td>
                      <td className='px-4 py-2'>{food.calories}</td>
                      <td className='px-4 py-2'>{food.protein}g</td>
                      <td className='px-4 py-2'>{food.carbs}g</td>
                      <td className='px-4 py-2'>{food.fat}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calorie calculator */}
            <div className='mt-6 rounded-2xl bg-indigo-50 p-4'>
              <h3 className='mb-3 text-base md:text-lg font-bold text-indigo-800'>{t('Calorie Calculator', 'حاسبة السعرات الحرارية')}</h3>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div>
                  <label className='mb-2 block'>{t('Select Food', 'اختر الطعام')}</label>
                  <select className='w-full rounded-xl border border-slate-300 p-2' value={selectedFoodIndex} onChange={e => setSelectedFoodIndex(Number(e.target.value))}>
                    {foodDatabase.map((f, idx) => (
                      <option key={idx} value={idx}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='mb-2 block'>{t('Amount (grams)', 'الكمية (جرام)')}</label>
                  <input type='number' className='w-full rounded-xl border border-slate-300 p-2' min={0} value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} />
                </div>
              </div>
              <div className='mt-4 rounded-xl bg-white p-4 text-center font-bold text-indigo-700'>
                {t('Calories', 'السعرات الحرارية')}: {caloriesFor(foodDatabase[selectedFoodIndex], amount)}
              </div>
            </div>
          </div>
        )}

        {/* WEEKLY REPORT */}
        {activeTab === 'report' && (
          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow'>
            <h2 className='mb-4 text-lg md:text-xl font-bold text-indigo-700'>{t('Weekly Report', 'التقرير الأسبوعي')}</h2>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-2 block'>{t('Do you feel hungry?', 'هل تشعر بالجوع؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.hunger} onChange={e => handleReportChange('hunger', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Are you feeling psychologically comfortable or not?', 'هل تشعر براحه نفسيه ام لا؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.mood} onChange={e => handleReportChange('mood', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Would you like to add specific items?', 'هل تود إضافة أصناف معينه؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.foodAdditions} onChange={e => handleReportChange('foodAdditions', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Is the amount of food too much?', 'هل كمية الأكل كثيره؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.foodQuantity} onChange={e => handleReportChange('foodQuantity', e.target.value)} />
              </div>
              <div className='md:col-span-2'>
                <label className='mb-2 block'>{t('Is there any deviation in the diet? (If yes, please specify the number of times, types of food, and quantity)', 'هل هناك انحراف في الديت؟ (في حالة الاجابه بنعم يجب توضيح عدد المرات و نوعيات الاكل و الكميه)')}</label>
                <textarea className='w-full rounded-xl border border-slate-300 p-2' rows={3} value={reportData.dietDeviation} onChange={e => handleReportChange('dietDeviation', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Is the workout intensity appropriate?', 'هل كثافه التمرين مناسبه؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.workoutIntensity} onChange={e => handleReportChange('workoutIntensity', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Is there any deviation in the number of days?', 'هل هناك انحراف في عدد الايام؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.workoutDeviation} onChange={e => handleReportChange('workoutDeviation', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Do you notice any physical changes?', 'هل تلاحظ تغيير بالشكل؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.physicalChanges} onChange={e => handleReportChange('physicalChanges', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Do you notice any change in fitness level?', 'هل تلاحظ تغيير في مستوي اللياقه؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.fitnessLevel} onChange={e => handleReportChange('fitnessLevel', e.target.value)} />
              </div>
              <div>
                <label className='mb-2 block'>{t('Are you sleeping enough?', 'هل تنام كفايه؟')}</label>
                <input type='text' className='w-full rounded-xl border border-slate-300 p-2' value={reportData.sleep} onChange={e => handleReportChange('sleep', e.target.value)} />
              </div>
              <div className='md:col-span-2'>
                <label className='mb-2 block'>{t('Any notes or criticisms about the program?', 'هل في أي ملحوظات أو انتقادات بالبرنامج؟')}</label>
                <textarea className='w-full rounded-xl border border-slate-300 p-2' rows={3} value={reportData.comments} onChange={e => handleReportChange('comments', e.target.value)} />
              </div>
              <div className='md:col-span-2'>
                <label className='mb-2 block'>{t('On a scale of 1 to 5, how committed are you to cardio exercises?', 'علي مقياس من 1 ل 5 ما مدي الالتزام بتمارين الكارديو')}</label>
                <div className='mt-2 flex items-center justify-between'>
                  {[1, 2, 3, 4, 5].map(num => (
                    <button key={num} onClick={() => handleReportChange('cardioCommitment', num)} className={`size-10 rounded-full text-sm font-bold transition ${reportData.cardioCommitment === num ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} className='mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 font-bold text-white shadow hover:opacity-95' onClick={sendReport}>
              {t('Send Report', 'إرسال التقرير')}
            </motion.button>
          </div>
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow'>
            <h2 className='mb-4 text-lg md:text-xl font-bold text-indigo-700'>{t('Training Program Notes', 'ملاحظات النظام التدريبي')}</h2>
            <div className='mb-6 space-y-4 text-slate-700'>
              <p>{t("I've written the exercises in English and haven't included any links to how to perform them so you can watch them on YouTube. When you go to the gym to train, record yourself performing the first set of each exercise and send me the last three reps of each set. This is more useful for follow-up because watching is one thing, but implementation on the ground is another. 🤍🤝", 'انا كاتبلك التمارين بالأنجليزي ومش حاطط اي لينك لطريقة لعبها عشان تتفرج عليها علي يوتيوب ولما تيجي تتمرن في الچيم بتصور نفسك وانت بتتمرن اول مجموعه من كل اداء وبتقصلي اخر تلت عدات في المجموعه دا مفيد اكتر في المتابعه لأن الفرجه حاجه والتنفيذ علي ارض الواقع حاجه تانيه 🤍🤝')}</p>
              <p>{t("Cardio will be jogging (brisk walking), and if you're going to do it on the treadmill, it should be at normal level, not incline.", 'الكارديو هيكون هروله( مشي سريع) ولو هتلعبه علي ال treadmill يكون في المستوي العادي مش incline')}</p>
            </div>

            <h3 className='mb-3 text-base md:text-lg font-bold text-slate-800'>{t('Recording Guidelines', 'إرشادات التصوير')}</h3>
            <ul className='mb-6 list-inside list-disc space-y-2 text-slate-700'>
              <li>{t('Record yourself while performing the exercises', 'صور نفسك أثناء أداء التمارين')}</li>
              <li>{t('Focus on recording the last 3 reps of each set', 'ركز على تصوير آخر 3 عدات في كل مجموعة')}</li>
              <li>{t('Recording helps with follow-up and performance improvement', 'التصوير يساعد في المتابعة وتحسين الأداء')}</li>
            </ul>

            <h3 className='mb-3 text-base md:text-lg font-bold text-slate-800'>{t('General Tips', 'نصائح عامة')}</h3>
            <ul className='list-inside list-disc space-y-2 text-slate-700'>
              <li>{t('Make sure to warm up before exercise and cool down after', 'احرص على التسخين قبل التمرين والتبريد بعده')}</li>
              <li>{t('Maintain timing between sets (90 seconds maximum)', 'حافظ على التوقيت بين المجموعات (90 ثانية كحد أقصى)')}</li>
              <li>{t('Focus on performing the exercise correctly rather than lifting heavy weights', 'ركز على أداء التمرين بشكل صحيح أكثر من رفع أوزان ثقيلة')}</li>
              <li>{t("Don't neglect stretching exercises", 'لا تهمل تمارين الإطالة')}</li>
            </ul>
          </div>
        )}

        {/* =============== NEW: SEARCH TAB (WGER) =============== */}
        {activeTab === 'search' && (
          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow'>
            <h2 className='mb-4 text-lg md:text-xl font-bold text-indigo-700'>{t('Search exercises & videos (Wger)', 'ابحث عن تمارين وفيديوهات (Wger)')}</h2>
            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
              <div className='relative flex-1'>
                <input type='text' value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('Type exercise name e.g. bench press', 'اكتب اسم التمرين مثال bench press')} className='w-full rounded-xl border border-slate-300 p-3 ps-10 focus:outline-none focus:ring-2 focus:ring-indigo-500' />
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400' />
              </div>
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => searchWgerByName(searchQuery)} disabled={!searchQuery || searchLoading} className='rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50'>
                {t('Search', 'بحث')}
              </motion.button>
            </div>

            {/* state */}
            {searchError && <div className='mt-4 rounded-lg bg-rose-50 p-3 text-rose-700'>{searchError}</div>}
            {searchLoading && <div className='mt-4 animate-pulse rounded-lg bg-slate-100 p-4 text-slate-500'>{t('Searching...', 'جاري البحث...')}</div>}

            {/* results: exercises */}
            {exerciseHits.length > 0 && (
              <div className='mt-6'>
                <h3 className='mb-2 text-base font-bold text-slate-800'>{t('Matched Exercises', 'التمارين المطابقة')}</h3>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  {exerciseHits.map(ex => (
                    <div key={ex.id} className='rounded-xl border border-slate-200 p-3'>
                      <div className='text-sm text-slate-500'>#{ex.id}</div>
                      <div className='text-slate-800 font-semibold'>{ex.name || ex.name_original}</div>
                      {ex.category && (
                        <div className='text-xs text-slate-500 mt-1'>
                          {t('Category', 'الفئة')}: {ex.category}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* results: videos */}
            {videoHits.length > 0 && (
              <div className='mt-6'>
                <h3 className='mb-2 text-base font-bold text-slate-800'>{t('Related Videos', 'فيديوهات مرتبطة')}</h3>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  {videoHits.map(v => (
                    <div key={v.uuid} className='rounded-xl border border-slate-200 p-4'>
                      <div className='text-sm text-slate-500 mb-1'>
                        {t('Exercise ID', 'رقم التمرين')}: {v.exercise}
                      </div>
                      <div className='aspect-video w-full overflow-hidden rounded-lg bg-slate-100'>
                        {/* Some MOV/HEVC won't autoplay in browsers; show link as fallback */}
                        <video src={v.video} controls className='h-full w-full' preload='metadata' />
                      </div>
                      <div className='mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600'>
                        <span>
                          {t('Duration', 'المدة')}: {v.duration || '-'}s
                        </span>
                        <span>
                          • {v.width}×{v.height}
                        </span>
                        <span>• {v.codec}</span>
                        <a href={v.video} target='_blank' rel='noreferrer' className='ms-auto text-indigo-600 hover:underline'>
                          {t('Open video', 'فتح الفيديو')}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                {videoNext && (
                  <div className='mt-4 flex justify-center'>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={loadMoreVideos} className='rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-800 hover:bg-slate-50'>
                      {t('Load more', 'تحميل المزيد')}
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showPhoneModal && (
          <motion.div className='fixed inset-0 z-50 grid place-items-center bg-black/50' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 18 }} className='w-11/12 max-w-md rounded-2xl bg-white p-6 shadow-xl'>
              <h3 className='text-xl font-bold text-indigo-700'>{t('Enter Phone Number', 'أدخل رقم الهاتف')}</h3>
              <p className='mt-2 text-slate-700'>{t('Please enter your phone number to send the report', 'يرجى إدخال رقم هاتفك لإرسال التقرير')}</p>
              <input type='tel' className='mt-4 w-full rounded-xl border border-slate-300 p-3' placeholder={t('Phone Number', 'رقم الهاتف')} value={reportData.phoneNumber} onChange={e => handleReportChange('phoneNumber', e.target.value)} />
              <div className='mt-4 flex items-center justify-end gap-2'>
                <button className='rounded-lg bg-slate-200 px-4 py-2 text-slate-700' onClick={() => setShowPhoneModal(false)}>
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  className='flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white'
                  onClick={() => {
                    setShowPhoneModal(false);
                    sendReport();
                  }}>
                  <Phone className='h-4 w-4' /> {t('Send', 'إرسال')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className='mt-10 border-t border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-600 py-6 text-center text-white'>
        <p>Advanced Gym Tracker © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
