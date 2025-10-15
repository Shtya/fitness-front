'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabsPill, spring } from '@/components/dashboard/ui/UI';
import { 
  Apple, X, Minus, Plus, CheckCircle, AlertCircle, Clock, Calendar, 
  Target, TrendingUp, Users, Settings as SettingsIcon, Menu as MenuIcon, 
  PlusCircle, CheckSquare, Square, Pill, MessageSquare, BarChart3, 
  History, ChevronLeft, ChevronRight 
} from 'lucide-react';
import CheckBox from '@/components/atoms/CheckBox';
import api from '@/utils/axios';
import { useUser } from '@/hooks/useUser';
import { useTranslations } from 'next-intl';
import Img from '@/components/atoms/Img';
import { Modal, StatCard, PageHeader } from '@/components/dashboard/ui/UI';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { Notification } from '@/config/Notification';
import Select from '@/components/atoms/Select';

/* =========================
   Constants / tiny helpers
========================= */
const LOCAL_KEY_SELECTED_DATE = 'nutrition.client.selected.date';

const jsDayToId = d => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d] || 'monday';
const todayISO = () => new Date().toISOString().slice(0, 10);

function dateOnlyISO(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅', color: 'bg-orange-100 text-orange-700' },
  { id: 'lunch', label: 'Lunch', icon: '☀️', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'dinner', label: 'Dinner', icon: '🌙', color: 'bg-blue-100 text-blue-700' },
  { id: 'snack', label: 'Snack', icon: '🍎', color: 'bg-green-100 text-green-700' },
];

export default function MyNutritionPage() {
  const t = useTranslations();
  const { user: USER } = useUser();
  const USER_ID = USER?.id;
  
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => 
    typeof window !== 'undefined' ? localStorage.getItem(LOCAL_KEY_SELECTED_DATE) || todayISO() : todayISO()
  );
  
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // UI states
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [editLogOpen, setEditLogOpen] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // New states for enhanced features
  const [medications, setMedications] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [addSuggestionOpen, setAddSuggestionOpen] = useState(false);
  const [view, setView] = useState('plan'); // 'plan', 'logs', 'summary', 'medications', 'suggestions', 'history'
  const [history, setHistory] = useState([]);
  
  const [isPending, startTransition] = useTransition();

  // Fetch active meal plan
  const fetchMealPlan = useCallback(async () => {
    try {
      const { data } = await api.get('/nutrition/meal-plans/my/active');
      if (data.status === 'none') {
        setMealPlan(null);
        return;
      }
      setMealPlan(data.mealPlan);
    } catch (error) {
      console.error('Error fetching meal plan:', error);
      setMealPlan(null);
    }
  }, []);

  // Fetch logs for selected date
  const fetchLogs = useCallback(async (date) => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get('/nutrition/meal-logs', { 
        params: { date } 
      });
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Fetch summary for selected date
  const fetchSummary = useCallback(async (date) => {
    setLoadingSummary(true);
    try {
      const { data } = await api.get('/nutrition/meal-logs/summary', { 
        params: { date } 
      });
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Fetch medications
  const fetchMedications = useCallback(async () => {
    try {
      const { data } = await api.get('/nutrition/medications/me');
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
      setMedications([]);
    }
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    try {
      const { data } = await api.get('/nutrition/suggestions/me');
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async (from, to) => {
    try {
      const { data } = await api.get(`/nutrition/client-history/${USER_ID}`, {
        params: { from, to }
      });
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    }
  }, [USER_ID]);

  // Add suggestion
  const addSuggestion = async (suggestionData) => {
    try {
      await api.post('/nutrition/suggestions', {
        date: selectedDate,
        day: new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'lowercase' }),
        mealType: suggestionData.mealType,
        itemName: suggestionData.itemName,
        quantity: suggestionData.quantity,
        suggestion: suggestionData.suggestion
      });
      Notification('Suggestion submitted successfully', 'success');
      fetchSuggestions();
    } catch (error) {
      Notification('Failed to submit suggestion', 'error');
    }
  };

  // Log medication intake
  const logMedicationIntake = async (medicationId, taken, notes = '') => {
    try {
      await api.post('/nutrition/medications/log', {
        medicationId,
        date: selectedDate,
        taken,
        notes
      });
      Notification(taken ? 'Medication logged as taken' : 'Medication logged as not taken', 'success');
      fetchMedications();
    } catch (error) {
      Notification('Failed to log medication', 'error');
    }
  };

  // Toggle food taken status
  const toggleFoodTaken = async (logId, taken) => {
    try {
      setSaving(true);
      await api.post('/nutrition/meal-logs', {
        id: logId,
        taken: taken,
        takenAt: taken ? new Date().toISOString() : null
      });
      
      // Update local state
      setLogs(prev => prev.map(log => 
        log.id === logId 
          ? { ...log, taken, takenAt: taken ? new Date().toISOString() : null }
          : log
      ));
      
      // Refresh summary
      fetchSummary(selectedDate);
      
      Notification(taken ? 'Food marked as taken' : 'Food marked as not taken', 'success');
    } catch (error) {
      Notification('Failed to update food status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addCustomFood = async (foodData) => {
    try {
      setSaving(true);
      await api.post('/nutrition/meal-logs', {
        date: selectedDate,
        day: jsDayToId(new Date(selectedDate).getDay()),
        mealType: foodData.mealType,
        itemName: foodData.name,
        quantity: foodData.quantity,
        taken: false,
        notes: foodData.notes
      });
      
      // Refresh logs
      fetchLogs(selectedDate);
      Notification('Custom food added', 'success');
    } catch (error) {
      Notification('Failed to add food', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateLog = async (logId, updates) => {
    try {
      setSaving(true);
      await api.post('/nutrition/meal-logs', {
        id: logId,
        ...updates
      });
      
      // Update local state
      setLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, ...updates } : log
      ));
      
      Notification('Food log updated', 'success');
    } catch (error) {
      Notification('Failed to update food log', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMealPlan(), 
        fetchLogs(selectedDate), 
        fetchSummary(selectedDate),
        fetchMedications(),
        fetchSuggestions()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchMealPlan, fetchLogs, fetchSummary, fetchMedications, fetchSuggestions, selectedDate]);

  // Load history when view changes
  useEffect(() => {
    if (view === 'history') {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = todayISO();
      fetchHistory(from, to);
    }
  }, [view, fetchHistory]);

  // Persist selected date
  useEffect(() => {
    if (selectedDate) localStorage.setItem(LOCAL_KEY_SELECTED_DATE, selectedDate);
  }, [selectedDate]);

  // Group logs by meal type
  const logsByMealType = useMemo(() => {
    const grouped = {};
    MEAL_TYPES.forEach(mealType => {
      grouped[mealType.id] = logs.filter(log => log.mealType === mealType.id);
    });
    return grouped;
  }, [logs]);

  const Actions = ({ className }) => (
    <div className={`flex items-center gap-2 ${className}`}>
      <button 
        onClick={() => setAddFoodOpen(true)} 
        className='px-2 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/30 text-white h-[37px] max-md:w-[37px] justify-center text-sm font-medium shadow hover:bg-white/20 active:scale-95 transition' 
        aria-label='Add Custom Food'
      >
        <PlusCircle size={16} />
        <span className='max-md:hidden'>Add Food</span>
      </button>
    </div>
  );

  if (loading) return <SkeletonLoader />;

  return (
    <div className='space-y-5 sm:space-y-6'>
      {/* Header */}
      <div className={'relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'}>
        <div className='absolute inset-0'>
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
          <div
            className='absolute inset-0 opacity-15'
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              backgroundPosition: '-1px -1px',
            }}
          />
          <div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
          <div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
        </div>

        <div className='relative py-2 p-3 md:p-5 text-white'>
          <div className='flex flex-row items-center justify-between gap-3'>
            <div>
              <h1 className='text-xl md:text-4xl font-semibold'>My Nutrition</h1>
              <p className='text-white/85 mt-1 max-md:hidden'>Track your daily nutrition and meal compliance</p>
            </div>
            <Actions className={'md:!hidden'} />
          </div>

          <div className='mt-2 md:mt-4 flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <input
                type='date'
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className='px-3 py-2 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30'
              />
            </div>
            <Actions className={'max-md:!hidden'} />
          </div>

          <div className='mt-2 md:mt-4 flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <TabsPill 
                className='!rounded-lg' 
                slice={3} 
                id='view-tabs' 
                tabs={[
                  { key: 'plan', label: 'Meal Plan' },
                  { key: 'logs', label: 'My Logs' },
                  { key: 'summary', label: 'Summary' },
                  { key: 'medications', label: 'Medications' },
                  { key: 'suggestions', label: 'Suggestions' },
                  { key: 'history', label: 'History' },
                ]} 
                active={view} 
                onChange={setView} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary Stats */}
      <div className='grid grid-cols-4 gap-2 items-center justify-start'>
        {loadingSummary ? (
          <KpiSkeleton />
        ) : summary ? (
          <>
            <StatCard className='' icon={Target} title='Calories' value={`${Math.round(summary.totals.calories)}`} />
            <StatCard className='' icon={TrendingUp} title='Protein' value={`${Math.round(summary.totals.protein)}g`} />
            <StatCard className='' icon={Apple} title='Carbs' value={`${Math.round(summary.totals.carbs)}g`} />
            <StatCard className='' icon={CheckCircle} title='Fat' value={`${Math.round(summary.totals.fat)}g`} />
          </>
        ) : (
          <>
            <StatCard className='' icon={Target} title='Calories' value='0' />
            <StatCard className='' icon={TrendingUp} title='Protein' value='0g' />
            <StatCard className='' icon={Apple} title='Carbs' value='0g' />
            <StatCard className='' icon={CheckCircle} title='Fat' value='0g' />
          </>
        )}
      </div>

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        {/* Meal Plan View */}
        {view === 'plan' && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            {!mealPlan ? (
              <div className='text-center py-8'>
                <div className='text-6xl mb-4'>🍽️</div>
                <h3 className='text-lg font-semibold text-slate-800 mb-2'>No Active Meal Plan</h3>
                <p className='text-slate-600'>Your coach hasn't assigned a meal plan yet.</p>
              </div>
            ) : (
              <div>
                <div className='flex items-center justify-between mb-6'>
                  <div>
                    <h2 className='text-xl font-semibold text-slate-800'>{mealPlan.name}</h2>
                    {mealPlan.description && <p className='text-sm text-slate-600 mt-1'>{mealPlan.description}</p>}
                  </div>
                  <div className='text-sm text-slate-500'>
                    {selectedDate === todayISO() ? 'Today' : new Date(selectedDate).toLocaleDateString()}
                  </div>
                </div>

                {/* Meal Types */}
                {MEAL_TYPES.map(mealType => {
                  const mealLogs = logsByMealType[mealType.id] || [];
                  const plannedFoods = mealPlan.days?.[0]?.foods?.filter(f => f.mealType === mealType.id) || [];
                  
                  if (plannedFoods.length === 0 && mealLogs.length === 0) return null;

                  return (
                    <div key={mealType.id} className='mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50'>
                      <div className='flex items-center gap-2 mb-4'>
                        <span className='text-2xl'>{mealType.icon}</span>
                        <h4 className='text-lg font-semibold text-slate-700'>{mealType.label}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${mealType.color}`}>
                          {mealLogs.length} logged
                        </span>
                      </div>
                      
                      <div className='space-y-3'>
                        {/* Planned foods */}
                        {plannedFoods.map((food, index) => {
                          const log = mealLogs.find(l => l.itemName === food.name);
                          return (
                            <div key={`planned-${index}`} className='flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white'>
                              <div className='flex items-center gap-3 flex-1'>
                                <button
                                  onClick={() => toggleFoodTaken(log?.id, !log?.taken)}
                                  disabled={saving}
                                  className='flex-shrink-0 p-1 rounded hover:bg-slate-100 transition-colors'
                                >
                                  {log?.taken ? (
                                    <CheckSquare size={20} className='text-green-600' />
                                  ) : (
                                    <Square size={20} className='text-slate-400' />
                                  )}
                                </button>
                                <div className='flex-1'>
                                  <div className='font-medium text-slate-800'>{food.name}</div>
                                  <div className='text-sm text-slate-600'>
                                    {food.quantity}{food.unit} • {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                                  </div>
                                </div>
                              </div>
                              <div className='text-xs text-slate-500'>
                                {log?.takenAt ? new Date(log.takenAt).toLocaleTimeString() : '—'}
                              </div>
                            </div>
                          );
                        })}

                        {/* Custom logged foods */}
                        {mealLogs.filter(log => !plannedFoods.some(f => f.name === log.itemName)).map((log, index) => (
                          <div key={`custom-${index}`} className='flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-blue-50'>
                            <div className='flex items-center gap-3 flex-1'>
                              <button
                                onClick={() => toggleFoodTaken(log.id, !log.taken)}
                                disabled={saving}
                                className='flex-shrink-0 p-1 rounded hover:bg-blue-100 transition-colors'
                              >
                                {log.taken ? (
                                  <CheckSquare size={20} className='text-green-600' />
                                ) : (
                                  <Square size={20} className='text-slate-400' />
                                )}
                              </button>
                              <div className='flex-1'>
                                <div className='font-medium text-slate-800'>{log.itemName}</div>
                                <div className='text-sm text-slate-600'>
                                  {log.quantity}g • Custom food
                                </div>
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              <button
                                onClick={() => setEditLogOpen(log)}
                                className='p-1 rounded-lg hover:bg-blue-100 text-blue-600'
                              >
                                <SettingsIcon size={14} />
                              </button>
                              <div className='text-xs text-slate-500'>
                                {log.takenAt ? new Date(log.takenAt).toLocaleTimeString() : '—'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Logs View */}
        {view === 'logs' && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <h3 className='text-lg font-semibold text-slate-800 mb-4'>My Meal Logs</h3>
            {loadingLogs ? (
              <div className='space-y-3'>
                {[1, 2, 3].map(i => (
                  <div key={i} className='h-16 bg-slate-200 rounded-lg animate-pulse' />
                ))}
              </div>
            ) : logs.length > 0 ? (
              <div className='space-y-3'>
                {logs.map(log => (
                  <div key={log.id} className='flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50'>
                    <div className='flex items-center gap-3'>
                      <div className={`w-3 h-3 rounded-full ${log.taken ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <div>
                        <div className='font-medium text-slate-800'>{log.itemName}</div>
                        <div className='text-sm text-slate-600'>
                          {log.mealType} • {log.quantity}g • {log.taken ? 'Taken' : 'Not taken'}
                        </div>
                      </div>
                    </div>
                    <div className='text-xs text-slate-500'>
                      {log.takenAt ? new Date(log.takenAt).toLocaleTimeString() : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-slate-500'>
                No logs found for {selectedDate}
              </div>
            )}
          </div>
        )}

        {/* Summary View */}
        {view === 'summary' && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <h3 className='text-lg font-semibold text-slate-800 mb-4'>Daily Summary</h3>
            {loadingSummary ? (
              <div className='space-y-3'>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className='h-12 bg-slate-200 rounded-lg animate-pulse' />
                ))}
              </div>
            ) : summary ? (
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='text-center p-4 rounded-lg bg-indigo-50 border border-indigo-200'>
                  <div className='text-2xl font-bold text-indigo-600'>{Math.round(summary.totals.calories)}</div>
                  <div className='text-sm text-indigo-600'>Calories</div>
                </div>
                <div className='text-center p-4 rounded-lg bg-green-50 border border-green-200'>
                  <div className='text-2xl font-bold text-green-600'>{Math.round(summary.totals.protein)}g</div>
                  <div className='text-sm text-green-600'>Protein</div>
                </div>
                <div className='text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200'>
                  <div className='text-2xl font-bold text-yellow-600'>{Math.round(summary.totals.carbs)}g</div>
                  <div className='text-sm text-yellow-600'>Carbs</div>
                </div>
                <div className='text-center p-4 rounded-lg bg-red-50 border border-red-200'>
                  <div className='text-2xl font-bold text-red-600'>{Math.round(summary.totals.fat)}g</div>
                  <div className='text-sm text-red-600'>Fat</div>
                </div>
              </div>
            ) : (
              <div className='text-center py-8 text-slate-500'>
                No data for this date
              </div>
            )}
          </div>
        )}

        {/* Medications View */}
        {view === 'medications' && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <h3 className='text-lg font-semibold text-slate-800 mb-4'>My Medications & Vitamins</h3>
            {medications.length > 0 ? (
              <div className='space-y-3'>
                {medications.map(medication => (
                  <div key={medication.id} className='p-4 rounded-lg border border-slate-200 bg-slate-50'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='font-medium text-slate-800'>{medication.name}</div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        medication.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {medication.type}
                      </span>
                    </div>
                    <div className='text-sm text-slate-600 space-y-1'>
                      <div>Dosage: {medication.dosage}</div>
                      <div>Frequency: {medication.frequency}</div>
                      <div>Time: {medication.preferredTime}</div>
                      {medication.instructions && <div>Instructions: {medication.instructions}</div>}
                    </div>
                    <div className='mt-3 flex gap-2'>
                      <button
                        onClick={() => logMedicationIntake(medication.id, true)}
                        className='px-3 py-1 rounded text-xs bg-green-100 text-green-700 hover:bg-green-200'
                      >
                        Mark as Taken
                      </button>
                      <button
                        onClick={() => logMedicationIntake(medication.id, false)}
                        className='px-3 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200'
                      >
                        Mark as Not Taken
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-slate-500'>
                No medications assigned
              </div>
            )}
          </div>
        )}

        {/* Suggestions View */}
        {view === 'suggestions' && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-slate-800'>My Food Suggestions</h3>
              <button 
                onClick={() => setAddSuggestionOpen(true)}
                className='px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm'
              >
                Add Suggestion
              </button>
            </div>
            {suggestions.length > 0 ? (
              <div className='space-y-3'>
                {suggestions.map(suggestion => (
                  <div key={suggestion.id} className='p-4 rounded-lg border border-slate-200 bg-slate-50'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='font-medium text-slate-800'>{suggestion.itemName}</div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        suggestion.coachApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {suggestion.coachApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <div className='text-sm text-slate-600'>
                      <div>Suggestion: {suggestion.clientSuggestion}</div>
                      <div>Meal: {suggestion.mealType} • Quantity: {suggestion.quantity}g</div>
                      {suggestion.coachFeedback && (
                        <div className='mt-2 p-2 bg-blue-50 rounded text-blue-800'>
                          Coach Feedback: {suggestion.coachFeedback}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-slate-500'>
                No suggestions submitted
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <h3 className='text-lg font-semibold text-slate-800 mb-4'>My Nutrition History</h3>
            {history.length > 0 ? (
              <div className='space-y-4'>
                {history.map((day, index) => (
                  <div key={index} className='p-4 rounded-lg border border-slate-200 bg-slate-50'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='font-medium text-slate-800'>
                        {new Date(day.date).toLocaleDateString()}
                      </div>
                      <div className='text-sm text-slate-600'>
                        {day.summary.taken}/{day.summary.total} meals • {Math.round(day.summary.compliance * 100)}% compliance
                      </div>
                    </div>
                    <div className='space-y-2'>
                      {day.logs.map(log => (
                        <div key={log.id} className='flex items-center justify-between p-2 rounded bg-white'>
                          <div className='flex items-center gap-2'>
                            <div className={`w-2 h-2 rounded-full ${log.taken ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <span className='text-sm'>{log.itemName}</span>
                            <span className='text-xs text-slate-500'>({log.mealType})</span>
                          </div>
                          <div className='text-xs text-slate-500'>
                            {log.takenAt ? new Date(log.takenAt).toLocaleTimeString() : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-slate-500'>
                No history found
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <Modal open={addFoodOpen} onClose={() => setAddFoodOpen(false)} title='Add Custom Food'>
        <CustomFoodForm
          onSubmit={async payload => {
            try {
              await addCustomFood(payload);
              setAddFoodOpen(false);
            } catch (e) {
              Notification(e?.response?.data?.message || 'Add failed', 'error');
            }
          }}
        />
      </Modal>

      <Modal open={!!editLogOpen} onClose={() => setEditLogOpen(null)} title={`Edit: ${editLogOpen?.itemName || ''}`}>
        {editLogOpen && (
          <EditLogForm
            log={editLogOpen}
            onSubmit={async payload => {
              try {
                await updateLog(editLogOpen.id, payload);
                setEditLogOpen(null);
              } catch (e) {
                Notification(e?.response?.data?.message || 'Update failed', 'error');
              }
            }}
          />
        )}
      </Modal>

      <Modal open={addSuggestionOpen} onClose={() => setAddSuggestionOpen(false)} title='Add Food Suggestion'>
        <SuggestionForm
          onSubmit={async payload => {
            try {
              await addSuggestion(payload);
              setAddSuggestionOpen(false);
            } catch (e) {
              Notification(e?.response?.data?.message || 'Suggestion failed', 'error');
            }
          }}
        />
      </Modal>
    </div>
  );
}

// Form Components
function CustomFoodForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const payload = { name, mealType, quantity, notes };
        onSubmit?.(payload);
      }}
      className='space-y-4'
    >
      <Input label='Food Name' name='name' value={name} onChange={v => setName(v)} required />
      
      <Select
        label='Meal Type'
        options={MEAL_TYPES.map(mt => ({ id: mt.id, label: mt.label }))}
        value={mealType}
        onChange={v => setMealType(v)}
      />
      
      <Input label='Quantity (grams)' name='quantity' type='number' value={String(quantity)} onChange={v => setQuantity(Number(v))} />
      
      <Input label='Notes (optional)' name='notes' value={notes} onChange={v => setNotes(v)} />

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button name='Add Food' />
      </div>
    </form>
  );
}

function EditLogForm({ log, onSubmit }) {
  const [quantity, setQuantity] = useState(log.quantity || 0);
  const [notes, setNotes] = useState(log.notes || '');
  const [taken, setTaken] = useState(log.taken || false);

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const payload = { quantity, notes, taken };
        onSubmit?.(payload);
      }}
      className='space-y-4'
    >
      <Input label='Quantity (grams)' name='quantity' type='number' value={String(quantity)} onChange={v => setQuantity(Number(v))} />
      
      <Input label='Notes' name='notes' value={notes} onChange={v => setNotes(v)} />
      
      <CheckBox
        label='Mark as taken'
        checked={taken}
        onChange={setTaken}
      />

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button name='Update Log' />
      </div>
    </form>
  );
}

function SuggestionForm({ onSubmit }) {
  const [itemName, setItemName] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [quantity, setQuantity] = useState(0);
  const [suggestion, setSuggestion] = useState('');

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const payload = { itemName, mealType, quantity, suggestion };
        onSubmit?.(payload);
      }}
      className='space-y-4'
    >
      <Input label='Food Name' name='itemName' value={itemName} onChange={v => setItemName(v)} required />
      
      <Select
        label='Meal Type'
        options={MEAL_TYPES.map(mt => ({ id: mt.id, label: mt.label }))}
        value={mealType}
        onChange={v => setMealType(v)}
      />
      
      <Input label='Quantity (grams)' name='quantity' type='number' value={String(quantity)} onChange={v => setQuantity(Number(v))} />
      
      <Input label='Your Suggestion' name='suggestion' value={suggestion} onChange={v => setSuggestion(v)} placeholder='Why do you think this food would be good for your plan?' required />

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button name='Submit Suggestion' />
      </div>
    </form>
  );
}

function SkeletonLoader() {
  return (
    <div className='space-y-5 sm:space-y-6'>
      <div className='h-32 bg-slate-200 rounded-lg animate-pulse' />
      <div className='grid grid-cols-4 gap-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='h-24 bg-slate-200 rounded-lg animate-pulse' />
        ))}
      </div>
      <div className='h-64 bg-slate-200 rounded-lg animate-pulse' />
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className='grid grid-cols-4 gap-2 w-full col-span-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='card-glow p-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-lg shimmer' />
            <div className='flex-1'>
              <div className='h-3 shimmer w-24 rounded mb-2' />
              <div className='h-4 shimmer w-16 rounded' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}