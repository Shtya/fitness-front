'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useTranslations } from 'use-intl';
import {
  Sparkles, Brain, Users, FileText, Dumbbell, Utensils,
  ChevronDown, ChevronUp, Trash2, Plus, RefreshCw, Check,
  Edit3, X, Search, Save, Copy, Loader2, Zap, Target,
  AlertCircle, ArrowRight, ClipboardList, ChefHat, Activity,
  Eye, EyeOff, RotateCcw, Download, Share2, Star, TrendingUp,
  Calendar, Clock, Weight, Heart, Flag, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/utils/axios';
import { Notification } from '@/config/Notification';

// ─── AI Config ────────────────────────────────────────────────
const AI_BASE_URL = 'http://localhost:7777/v1/chat/completions';
const AI_AUTH = 'Bearer change-secret-key-2026';
const AI_MODEL = 'gpt-4o';

async function askAI(prompt) {
  const res = await fetch(AI_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: AI_AUTH,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('AI returned empty content');
  return raw;
}

function safeParseJSON(raw) {
  try {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const text = fenced ? fenced[1] : raw;
    const braceStart = text.indexOf('{');
    const braceEnd = text.lastIndexOf('}');
    if (braceStart === -1 || braceEnd === -1) throw new Error('No JSON object found');
    return JSON.parse(text.slice(braceStart, braceEnd + 1));
  } catch {
    return null;
  }
}

// ─── Loading Animation ─────────────────────────────────────────
const LOADING_PHASES = [
  { icon: Brain, label: 'تحليل بيانات العميل...', color: 'text-violet-400' },
  { icon: Target, label: 'تحديد الأهداف والقيود...', color: 'text-blue-400' },
  { icon: Dumbbell, label: 'اختيار التمارين المناسبة...', color: 'text-emerald-400' },
  { icon: ChefHat, label: 'بناء خطة التغذية...', color: 'text-amber-400' },
  { icon: Sparkles, label: 'تحسين الخطة النهائية...', color: 'text-rose-400' },
];

function AILoadingScreen({ phase }) {
  const currentPhase = LOADING_PHASES[phase % LOADING_PHASES.length];
  const Icon = currentPhase.icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] gap-8">
      {/* Orbital Animation */}
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[color:var(--color-primary-200)] animate-spin" style={{ animationDuration: '8s' }} />
        <div className="absolute inset-3 rounded-full border-2 border-[color:var(--color-primary-300)] animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
        <div className="absolute inset-6 rounded-full theme-gradient-bg opacity-20 animate-pulse" />

        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="flex items-center justify-center w-16 h-16 rounded-2xl theme-gradient-bg shadow-lg"
            >
              <Icon className="w-8 h-8 text-white" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full theme-gradient-bg opacity-70"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 90}deg) translateX(68px) translateY(-50%)`,
              animation: `spin ${3 + i * 0.5}s linear infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Phase text */}
      <div className="text-center space-y-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`text-lg font-semibold ${currentPhase.color}`}
          >
            {currentPhase.label}
          </motion.p>
        </AnimatePresence>
        <p className="text-sm text-slate-400">الذكاء الاصطناعي يعمل على إنشاء خطتك المخصصة</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {LOADING_PHASES.map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            animate={{
              scale: i === phase % LOADING_PHASES.length ? 1.5 : 1,
              backgroundColor: i === phase % LOADING_PHASES.length
                ? 'var(--color-primary-500)'
                : '#cbd5e1',
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── ExercisePicker Modal ──────────────────────────────────────
function ExercisePicker({ open, exercises, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises.slice(0, 50);
    return exercises.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [exercises, search]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن تمرين..."
                className="w-full h-10 pr-10 pl-4 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)] focus:border-[color:var(--color-primary-400)]"
              />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">لا توجد تمارين مطابقة</div>
            ) : filtered.map(ex => (
              <button
                key={ex.id}
                onClick={() => { onSelect(ex); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[color:var(--color-primary-50)] border border-transparent hover:border-[color:var(--color-primary-200)] transition text-right group"
              >
                <div className="w-8 h-8 rounded-lg theme-gradient-bg flex items-center justify-center flex-shrink-0 opacity-70 group-hover:opacity-100 transition">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{ex.name}</p>
                  {ex.category && (
                    <p className="text-xs text-slate-400">{ex.category}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Exercise Row ──────────────────────────────────────────────
function ExerciseRow({ exercise, allExercises, onUpdate, onRemove, index }) {
  const [replacing, setReplacing] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="group relative rounded-xl border border-slate-200 bg-white hover:border-[color:var(--color-primary-200)] hover:shadow-sm transition-all duration-200 overflow-hidden"
    >
      {/* accent bar */}
      <div className="absolute top-0 right-0 w-1 h-full theme-gradient-bg opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* index badge */}
          <span className="flex-shrink-0 w-7 h-7 rounded-lg theme-gradient-bg text-white text-xs font-bold flex items-center justify-center mt-0.5">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                className="w-full text-sm font-semibold text-slate-800 border-b border-[color:var(--color-primary-300)] bg-transparent outline-none pb-0.5 mb-2"
                value={exercise.exercise_name}
                onChange={e => onUpdate({ exercise_name: e.target.value })}
                onBlur={() => setEditing(false)}
                onKeyDown={e => e.key === 'Enter' && setEditing(false)}
              />
            ) : (
              <p className="text-sm font-semibold text-slate-800 truncate mb-2">{exercise.exercise_name}</p>
            )}

            {/* sets/reps/notes */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">سيتات</span>
                <input
                  type="text"
                  value={exercise.sets}
                  onChange={e => onUpdate({ sets: e.target.value })}
                  className="w-12 h-6 text-xs text-center border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-300)] font-semibold text-slate-700"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">تكرار</span>
                <input
                  type="text"
                  value={exercise.reps}
                  onChange={e => onUpdate({ reps: e.target.value })}
                  className="w-16 h-6 text-xs text-center border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary-300)] font-semibold text-slate-700"
                />
              </div>
              {exercise.notes && (
                <span className="text-[10px] text-slate-400 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200 max-w-[180px] truncate">
                  {exercise.notes}
                </span>
              )}
            </div>
          </div>

          {/* actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => setEditing(!editing)}
              className="p-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-600 text-slate-400 transition"
              title="تعديل"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setReplacing(true)}
              className="p-1.5 rounded-lg hover:bg-[color:var(--color-primary-50)] hover:text-[color:var(--color-primary-600)] text-slate-400 transition"
              title="استبدال"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition"
              title="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <ExercisePicker
        open={replacing}
        exercises={allExercises}
        onSelect={ex => onUpdate({ exercise_id: ex.id, exercise_name: ex.name })}
        onClose={() => setReplacing(false)}
      />
    </motion.div>
  );
}

// ─── Training Day Card ─────────────────────────────────────────
function TrainingDayCard({ day, index, allExercises, onUpdate, onAddExercise, onRemoveExercise, onRemoveDay }) {
  const [collapsed, setCollapsed] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Day Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[color:var(--color-primary-50)] to-white border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl theme-gradient-bg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <input
            className="w-full text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-[color:var(--color-primary-300)] focus:border-[color:var(--color-primary-400)] outline-none transition pb-0.5"
            value={day.day_name}
            onChange={e => onUpdate({ day_name: e.target.value })}
          />
          <p className="text-xs text-slate-400 mt-0.5">{day.exercises?.length ?? 0} تمارين</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-[color:var(--color-primary-100)] text-slate-500 transition"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onRemoveDay}
            className="p-2 rounded-xl hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day Body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {(day.exercises || []).map((ex, exIdx) => (
                  <ExerciseRow
                    key={`${ex.exercise_id}-${exIdx}`}
                    exercise={ex}
                    index={exIdx}
                    allExercises={allExercises}
                    onUpdate={patch => onUpdate({
                      exercises: day.exercises.map((e, i) => i === exIdx ? { ...e, ...patch } : e)
                    })}
                    onRemove={() => onRemoveExercise(exIdx)}
                  />
                ))}
              </AnimatePresence>

              {/* Add exercise button */}
              <button
                onClick={() => setAddingExercise(true)}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[color:var(--color-primary-200)] text-[color:var(--color-primary-500)] text-sm font-medium hover:border-[color:var(--color-primary-400)] hover:bg-[color:var(--color-primary-50)] transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة تمرين
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExercisePicker
        open={addingExercise}
        exercises={allExercises}
        onSelect={ex => {
          onAddExercise({ exercise_id: ex.id, exercise_name: ex.name, sets: '3', reps: '10-12', notes: '' });
          setAddingExercise(false);
        }}
        onClose={() => setAddingExercise(false)}
      />
    </motion.div>
  );
}

// ─── Meal Item Row ─────────────────────────────────────────────
function MealItemRow({ item, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 group">
      <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:border-[color:var(--color-primary-200)] transition">
        <input
          className="flex-1 text-sm bg-transparent outline-none text-slate-700 font-medium"
          value={item.name || item.food || ''}
          onChange={e => onUpdate({ ...item, name: e.target.value, food: e.target.value })}
          placeholder="اسم الوجبة..."
        />
        <input
          className="w-20 text-xs text-center bg-white border border-slate-200 rounded-lg h-6 outline-none focus:ring-1 focus:ring-[color:var(--color-primary-300)] text-slate-600"
          value={item.quantity || item.amount || ''}
          onChange={e => onUpdate({ ...item, quantity: e.target.value, amount: e.target.value })}
          placeholder="الكمية"
        />
        {(item.calories || item.kcal) && (
          <span className="text-[10px] font-bold text-[color:var(--color-primary-600)] bg-[color:var(--color-primary-50)] border border-[color:var(--color-primary-200)] rounded-lg px-2 py-0.5">
            {item.calories || item.kcal} kcal
          </span>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 opacity-0 group-hover:opacity-100 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-slate-300 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Meal Card ─────────────────────────────────────────────────
function MealCard({ meal, mealIndex, onUpdate, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);
  const items = meal.items || meal.foods || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50/50 border-b border-amber-100/50">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <ChefHat className="w-4 h-4 text-amber-600" />
        </div>
        <input
          className="flex-1 text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-transparent hover:border-amber-300 focus:border-amber-400 transition"
          value={meal.meal_name || meal.name || `وجبة ${mealIndex + 1}`}
          onChange={e => onUpdate({ ...meal, meal_name: e.target.value, name: e.target.value })}
        />
        {meal.time && (
          <span className="text-xs text-amber-600 bg-amber-100 border border-amber-200 rounded-lg px-2 py-0.5 font-medium flex-shrink-0">
            <Clock className="w-3 h-3 inline ml-1" />{meal.time}
          </span>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-amber-100 text-amber-500 transition">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onRemove} className="p-1 rounded hover:bg-rose-50 hover:text-rose-500 text-slate-300 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-1.5">
              {items.map((item, i) => (
                <MealItemRow
                  key={i}
                  item={item}
                  onUpdate={updated => {
                    const newItems = [...items];
                    newItems[i] = updated;
                    onUpdate({ ...meal, items: newItems, foods: newItems });
                  }}
                  onRemove={() => {
                    const newItems = items.filter((_, idx) => idx !== i);
                    onUpdate({ ...meal, items: newItems, foods: newItems });
                  }}
                />
              ))}
              <button
                onClick={() => {
                  const newItem = { name: '', quantity: '', calories: '' };
                  onUpdate({ ...meal, items: [...items, newItem], foods: [...items, newItem] });
                }}
                className="w-full py-1.5 text-xs text-amber-500 border border-dashed border-amber-200 rounded-lg hover:bg-amber-50 transition flex items-center justify-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" /> إضافة عنصر
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Nutrition Day Card ────────────────────────────────────────
function NutritionDayCard({ day, dayIndex, onUpdate, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);
  const meals = day.meals || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: dayIndex * 0.1 }}
      className="rounded-2xl border border-amber-100 bg-white overflow-hidden shadow-sm"
    >
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <input
            className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none border-b border-transparent hover:border-amber-300 transition"
            value={day.day_name || day.day || `اليوم ${dayIndex + 1}`}
            onChange={e => onUpdate({ ...day, day_name: e.target.value, day: e.target.value })}
          />
          <p className="text-xs text-slate-400 mt-0.5">{meals.length} وجبات</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-xl hover:bg-amber-100 text-amber-500 transition">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="p-2 rounded-xl hover:bg-rose-50 hover:text-rose-500 text-slate-300 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <AnimatePresence>
                {meals.map((meal, mi) => (
                  <MealCard
                    key={mi}
                    meal={meal}
                    mealIndex={mi}
                    onUpdate={updated => {
                      const newMeals = meals.map((m, i) => i === mi ? updated : m);
                      onUpdate({ ...day, meals: newMeals });
                    }}
                    onRemove={() => {
                      const newMeals = meals.filter((_, i) => i !== mi);
                      onUpdate({ ...day, meals: newMeals });
                    }}
                  />
                ))}
              </AnimatePresence>
              <button
                onClick={() => {
                  const newMeal = { meal_name: `وجبة ${meals.length + 1}`, items: [] };
                  onUpdate({ ...day, meals: [...meals, newMeal] });
                }}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-200 text-amber-500 text-sm font-medium hover:bg-amber-50 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> إضافة وجبة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Client Summary Card ───────────────────────────────────────
function ClientSummaryCard({ summary }) {
  if (!summary) return null;

  const fields = [
    { icon: Target, label: 'الهدف', value: summary.goal, color: 'text-emerald-500' },
    { icon: Activity, label: 'المستوى', value: summary.fitness_level || summary.experience_level, color: 'text-blue-500' },
    { icon: Weight, label: 'الوزن', value: summary.weight, color: 'text-violet-500' },
    { icon: TrendingUp, label: 'العمر', value: summary.age, color: 'text-amber-500' },
    { icon: Heart, label: 'القيود', value: summary.limitations || summary.restrictions, color: 'text-rose-500' },
    { icon: Flag, label: 'الملاحظات', value: summary.notes || summary.special_notes, color: 'text-slate-500' },
  ].filter(f => f.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[color:var(--color-primary-200)] bg-gradient-to-br from-[color:var(--color-primary-50)] to-white p-5 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl theme-gradient-bg flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">ملخص العميل</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${f.color}`} />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">{f.label}</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 truncate">{f.value}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function CoachAIPage() {
  const t = useTranslations('coach_ai');

  // Data state
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [allMealPlans, setAllMealPlans] = useState([]);

  // Selection state
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [activeTab, setActiveTab] = useState('training');
  const [formOpen, setFormOpen] = useState(false);

  // AI Result state
  const [aiResult, setAiResult] = useState(null);
  const [clientSummary, setClientSummary] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState([]);
  const [nutritionPlan, setNutritionPlan] = useState([]);

  // Assignment state
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [assigningMeal, setAssigningMeal] = useState(false);
  const [assignedClientId, setAssignedClientId] = useState('');
  const [clients, setClients] = useState([]);

  // Phase ticker
  const phaseTimerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      phaseTimerRef.current = setInterval(() => {
        setLoadingPhase(p => p + 1);
      }, 2200);
    } else {
      clearInterval(phaseTimerRef.current);
      setLoadingPhase(0);
    }
    return () => clearInterval(phaseTimerRef.current);
  }, [loading]);

  // ── Fetch initial data
  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [formsRes, exRes, usersRes] = await Promise.all([
          api.get('/forms').catch(() => ({ data: [] })),
          api.get('/plan-exercises', { params: { limit: 500 } }).catch(() => ({ data: { records: [] } })),
          api.get('/auth/users', { params: { limit: 200 } }).catch(() => ({ data: { users: [] } })),
        ]);

        const formsData = formsRes?.data?.data || formsRes?.data || [];
        setForms(Array.isArray(formsData) ? formsData : []);

        const exData = exRes?.data?.records || exRes?.data || [];
        setExercises(Array.isArray(exData) ? exData : []);

        const usersData = usersRes?.data?.users || [];
        setClients(Array.isArray(usersData) ? usersData : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // ── Load submissions when form selected
  useEffect(() => {
    if (!selectedFormId) { setSubmissions([]); return; }
    api.get(`/forms/${selectedFormId}/submissions`, { params: { limit: 100 } })
      .then(res => {
        const data = res?.data?.data || res?.data || [];
        setSubmissions(Array.isArray(data) ? data : []);
      })
      .catch(() => setSubmissions([]));
  }, [selectedFormId]);

  // ── Load submission detail
  useEffect(() => {
    if (!selectedSubmissionId || !submissions.length) { setSelectedSubmission(null); return; }
    const sub = submissions.find(s => String(s.id) === String(selectedSubmissionId));
    setSelectedSubmission(sub || null);
  }, [selectedSubmissionId, submissions]);

  // ── Build AI prompt
  const buildPrompt = (submission, exercisesList) => {
    const exercisesCompact = exercisesList.slice(0, 200).map(e => ({
      id: e.id,
      name: e.name,
      category: e.category,
      primaryMuscles: e.primaryMusclesWorked,
    }));

    return `You are an expert fitness coach AI. Analyze the following client submission and generate a complete, personalized plan.

CLIENT SUBMISSION:
Email: ${submission.email || 'N/A'}
Phone: ${submission.phone || 'N/A'}
Answers: ${JSON.stringify(submission.answers, null, 2)}

AVAILABLE EXERCISES (you MUST only use these):
${JSON.stringify(exercisesCompact, null, 2)}

Generate a complete response in this EXACT JSON format:
{
  "client_summary": {
    "goal": "...",
    "fitness_level": "...",
    "weight": "...",
    "age": "...",
    "limitations": "...",
    "notes": "..."
  },
  "training_plan": [
    {
      "day_id": "day_1",
      "day_name": "اليوم الأول - الصدر والترايسبس",
      "exercises": [
        {
          "exercise_id": "EXACT_ID_FROM_LIST",
          "exercise_name": "EXACT_NAME_FROM_LIST",
          "sets": "4",
          "reps": "8-12",
          "notes": "ملاحظة مختصرة"
        }
      ]
    }
  ],
  "nutrition_plan": [
    {
      "day_name": "يوم التدريب",
      "total_calories": 2200,
      "meals": [
        {
          "meal_name": "الإفطار",
          "time": "08:00",
          "items": [
            { "name": "شوفان", "quantity": "100g", "calories": 370 }
          ]
        }
      ]
    }
  ]
}

RULES:
- Use ONLY exercise IDs from the provided list
- Generate 3-5 training days based on client goal
- Generate nutrition plan with 4-6 meals
- All text in Arabic
- Return ONLY valid JSON, no markdown, no commentary`;
  };

  // ── Generate plan
  const handleGenerate = async () => {
    if (!selectedSubmission) {
      Notification('الرجاء اختيار استجابة عميل أولاً', 'error');
      return;
    }

    if (exercises.length === 0) {
      Notification('لا توجد تمارين متاحة في النظام', 'error');
      return;
    }

    setLoading(true);
    setAiResult(null);
    setTrainingPlan([]);
    setNutritionPlan([]);
    setClientSummary(null);

    try {
      const prompt = buildPrompt(selectedSubmission, exercises);
      const raw = await askAI(prompt);
      const parsed = safeParseJSON(raw);

      if (!parsed) {
        throw new Error('فشل في تحليل رد الذكاء الاصطناعي');
      }

      setAiResult(parsed);
      setClientSummary(parsed.client_summary || null);
      setTrainingPlan(parsed.training_plan || []);
      setNutritionPlan(parsed.nutrition_plan || []);
      setActiveTab('training');
      setFormOpen(false);

      Notification('تم توليد الخطة بنجاح!', 'success');
    } catch (err) {
      console.error(err);
      Notification(err.message || 'فشل في توليد الخطة', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Save workout plan to system
  const handleSaveWorkoutPlan = async () => {
    if (!trainingPlan.length) return;
    if (!assignedClientId) {
      Notification('الرجاء اختيار العميل لتعيين الخطة', 'error');
      return;
    }

    setAssigningPlan(true);
    try {
      const payload = {
        name: `خطة ${selectedSubmission?.email || 'عميل جديد'} - ${new Date().toLocaleDateString('ar')}`,
        isActive: true,
        program: {
          days: trainingPlan.map(day => ({
            dayOfWeek: 'monday',
            nameOfWeek: day.day_name,
            exercises: (day.exercises || []).map((ex, i) => ({
              exerciseId: ex.exercise_id,
              targetSets: Number(ex.sets) || 3,
              targetReps: ex.reps || '10-12',
              note: ex.notes || null,
              order: i + 1,
            })),
            warmupExercises: [],
            cardioExercises: [],
          })),
        },
      };

      const planRes = await api.post('/plans', payload);
      const planId = planRes?.data?.id;

      if (planId) {
        await api.post(`/plans/${planId}/assign`, {
          athleteIds: [assignedClientId],
          isActive: true,
          confirm: 'yes',
        });
        Notification('تم حفظ وتعيين خطة التدريب بنجاح!', 'success');
      }
    } catch (e) {
      Notification(e?.response?.data?.message || 'فشل في حفظ الخطة', 'error');
    } finally {
      setAssigningPlan(false);
    }
  };

  // ── Save nutrition plan
  const handleSaveNutritionPlan = async () => {
    if (!nutritionPlan.length) return;
    if (!assignedClientId) {
      Notification('الرجاء اختيار العميل لتعيين خطة التغذية', 'error');
      return;
    }

    setAssigningMeal(true);
    try {
      const allMeals = nutritionPlan[0]?.meals || [];
      const payload = {
        name: `تغذية ${selectedSubmission?.email || 'عميل جديد'} - ${new Date().toLocaleDateString('ar')}`,
        description: 'خطة تغذية مولّدة بالذكاء الاصطناعي',
        baseMeals: allMeals.map((meal, i) => ({
          title: meal.meal_name || meal.name || `وجبة ${i + 1}`,
          time: meal.time || null,
          items: (meal.items || meal.foods || []).map(item => ({
            name: item.name || item.food || '',
            quantity: parseFloat(item.quantity || item.amount || '100') || 100,
            calories: Number(item.calories || item.kcal || 0),
            unit: 'g',
          })),
          supplements: [],
        })),
        customizeDays: false,
      };

      const mealRes = await api.post('/nutrition/meal-plans', payload);
      const mealPlanId = mealRes?.data?.id;

      if (mealPlanId) {
        await api.post(`/nutrition/meal-plans/${mealPlanId}/assign`, { userId: assignedClientId });
        Notification('تم حفظ وتعيين خطة التغذية بنجاح!', 'success');
      }
    } catch (e) {
      Notification(e?.response?.data?.message || 'فشل في حفظ خطة التغذية', 'error');
    } finally {
      setAssigningMeal(false);
    }
  };

  // ─────────────────────────────────────────────────────────────

  const hasResult = trainingPlan.length > 0 || nutritionPlan.length > 0;

  return (
    <div className="min-h-screen pb-20" dir="rtl">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl theme-gradient-bg p-6 mb-8 shadow-lg">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">مساعد الكوتش الذكي</h1>
                <p className="text-white/70 text-sm">توليد خطط التدريب والتغذية بالذكاء الاصطناعي</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-white text-sm font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" />
                الخطة جاهزة
              </motion.div>
            )}

            <button
              onClick={() => setFormOpen(!formOpen)}
              className="flex items-center gap-2 bg-white text-[color:var(--color-primary-700)] font-bold px-4 py-2.5 rounded-xl hover:bg-white/90 transition shadow-md text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {hasResult ? 'خطة جديدة' : 'ابدأ الآن'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: Users, value: submissions.length, label: 'استجابات' },
            { icon: Dumbbell, value: exercises.length, label: 'تمرين' },
            { icon: Brain, value: hasResult ? trainingPlan.length : 0, label: 'أيام تدريب' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <Icon className="w-5 h-5 text-white/80 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/60 font-medium">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Selection Form ── */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-[color:var(--color-primary-200)] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[color:var(--color-primary-500)]" />
                اختر بيانات العميل
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Form select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                    النموذج
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFormId}
                      onChange={e => { setSelectedFormId(e.target.value); setSelectedSubmissionId(''); }}
                      disabled={loadingData}
                      className="w-full h-11 pr-4 pl-10 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)] focus:border-[color:var(--color-primary-400)] transition disabled:opacity-50"
                    >
                      <option value="">اختر نموذجاً...</option>
                      {forms.map(f => (
                        <option key={f.id} value={f.id}>{f.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Submission select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                    استجابة العميل
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubmissionId}
                      onChange={e => setSelectedSubmissionId(e.target.value)}
                      disabled={!selectedFormId || submissions.length === 0}
                      className="w-full h-11 pr-4 pl-10 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)] focus:border-[color:var(--color-primary-400)] transition disabled:opacity-50"
                    >
                      <option value="">اختر استجابة...</option>
                      {submissions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.email || s.phone || `#${s.id}`} - {new Date(s.created_at).toLocaleDateString('ar')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Submission preview */}
              <AnimatePresence>
                {selectedSubmission && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="rounded-xl border border-[color:var(--color-primary-100)] bg-[color:var(--color-primary-50)] p-4 mb-5"
                  >
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">معاينة البيانات</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'البريد', value: selectedSubmission.email },
                        { label: 'الهاتف', value: selectedSubmission.phone },
                        ...Object.entries(selectedSubmission.answers || {}).slice(0, 6).map(([k, v]) => ({
                          label: k,
                          value: Array.isArray(v) ? v.join(', ') : String(v),
                        })),
                      ].filter(f => f.value).map((f, i) => (
                        <div key={i} className="bg-white rounded-lg border border-slate-100 p-2">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{f.label}</p>
                          <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!selectedSubmission || loading || loadingData}
                className="w-full h-12 rounded-xl theme-gradient-bg text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    توليد الخطة بالذكاء الاصطناعي
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading Screen ── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-[color:var(--color-primary-100)] bg-white shadow-xl overflow-hidden"
          >
            <AILoadingScreen phase={loadingPhase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result ── */}
      <AnimatePresence>
        {hasResult && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Client Summary */}
            <ClientSummaryCard summary={clientSummary} />

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 bg-slate-100 rounded-2xl p-1.5">
              {[
                { key: 'training', label: 'خطة التدريب', icon: Dumbbell, count: trainingPlan.length },
                { key: 'nutrition', label: 'خطة التغذية', icon: ChefHat, count: nutritionPlan.length },
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-all duration-200 ${active
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-[color:var(--color-primary-500)]' : ''}`} />
                    {tab.label}
                    <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${active ? 'theme-gradient-bg text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Training Tab */}
            <AnimatePresence mode="wait">
              {activeTab === 'training' && (
                <motion.div
                  key="training"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Dumbbell className="w-5 h-5 text-[color:var(--color-primary-500)]" />
                      أيام التدريب
                    </h2>
                    <button
                      onClick={() => setTrainingPlan(p => [...p, {
                        day_id: `day_${Date.now()}`,
                        day_name: `يوم ${p.length + 1}`,
                        exercises: [],
                      }])}
                      className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-primary-600)] bg-[color:var(--color-primary-50)] border border-[color:var(--color-primary-200)] rounded-xl px-3 py-2 hover:bg-[color:var(--color-primary-100)] transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> إضافة يوم
                    </button>
                  </div>

                  <AnimatePresence>
                    {trainingPlan.map((day, i) => (
                      <TrainingDayCard
                        key={day.day_id || i}
                        day={day}
                        index={i}
                        allExercises={exercises}
                        onUpdate={patch => setTrainingPlan(p => p.map((d, idx) => idx === i ? { ...d, ...patch } : d))}
                        onAddExercise={ex => setTrainingPlan(p => p.map((d, idx) => idx === i ? { ...d, exercises: [...(d.exercises || []), ex] } : d))}
                        onRemoveExercise={exIdx => setTrainingPlan(p => p.map((d, idx) => idx === i ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) } : d))}
                        onRemoveDay={() => setTrainingPlan(p => p.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Assign section */}
                  <div className="mt-6 rounded-2xl border border-[color:var(--color-primary-200)] bg-[color:var(--color-primary-50)] p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[color:var(--color-primary-500)]" />
                      تعيين الخطة لعميل
                    </h3>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <select
                          value={assignedClientId}
                          onChange={e => setAssignedClientId(e.target.value)}
                          className="w-full h-10 pr-4 pl-8 rounded-xl border border-slate-200 bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-300)] transition"
                        >
                          <option value="">اختر العميل...</option>
                          {clients.filter(c => c.role?.toLowerCase() === 'client').map(c => (
                            <option key={c.id} value={c.id}>{c.name} - {c.email}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                      <button
                        onClick={handleSaveWorkoutPlan}
                        disabled={assigningPlan || !assignedClientId}
                        className="flex items-center gap-2 theme-gradient-bg text-white font-bold text-sm px-4 py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
                      >
                        {assigningPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        حفظ وتعيين
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Nutrition Tab */}
              {activeTab === 'nutrition' && (
                <motion.div
                  key="nutrition"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-amber-500" />
                      خطة التغذية
                    </h2>
                    <button
                      onClick={() => setNutritionPlan(p => [...p, {
                        day_name: `يوم ${p.length + 1}`,
                        meals: [],
                      }])}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-100 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> إضافة يوم
                    </button>
                  </div>

                  <AnimatePresence>
                    {nutritionPlan.map((day, i) => (
                      <NutritionDayCard
                        key={i}
                        day={day}
                        dayIndex={i}
                        onUpdate={updated => setNutritionPlan(p => p.map((d, idx) => idx === i ? updated : d))}
                        onRemove={() => setNutritionPlan(p => p.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Assign nutrition section */}
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-500" />
                      تعيين خطة التغذية لعميل
                    </h3>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <select
                          value={assignedClientId}
                          onChange={e => setAssignedClientId(e.target.value)}
                          className="w-full h-10 pr-4 pl-8 rounded-xl border border-slate-200 bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                        >
                          <option value="">اختر العميل...</option>
                          {clients.filter(c => c.role?.toLowerCase() === 'client').map(c => (
                            <option key={c.id} value={c.id}>{c.name} - {c.email}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                      <button
                        onClick={handleSaveNutritionPlan}
                        disabled={assigningMeal || !assignedClientId}
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
                      >
                        {assigningMeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        حفظ وتعيين
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {!hasResult && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border-2 border-dashed border-[color:var(--color-primary-200)] bg-[color:var(--color-primary-50)/30] p-16 text-center"
        >
          <div className="w-20 h-20 rounded-3xl theme-gradient-bg mx-auto mb-5 flex items-center justify-center opacity-70">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">ابدأ بتوليد خطة مخصصة</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            اختر نموذجاً واستجابة العميل ثم اضغط على "ابدأ الآن" لتوليد خطة تدريب وتغذية كاملة بالذكاء الاصطناعي
          </p>
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 theme-gradient-bg text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition shadow-md"
          >
            <Sparkles className="w-5 h-5" />
            ابدأ الآن
          </button>
        </motion.div>
      )}
    </div>
  );
}