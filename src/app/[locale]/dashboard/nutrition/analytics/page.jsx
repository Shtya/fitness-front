'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  TrendingUp, Users, Calendar, BarChart3, PieChart, 
  Target, Clock, CheckCircle, AlertCircle, Download,
  Filter, RefreshCw, Eye, FileText, Activity
} from 'lucide-react';

import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import { TabsPill, StatCard } from '@/components/dashboard/ui/UI';
import  Button  from '@/components/atoms/Button';
import  Input  from '@/components/atoms/Input';
import  Select  from '@/components/atoms/Select';

 
 
export default function NutritionAnalyticsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  // Analytics data
  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [complianceStats, setComplianceStats] = useState(null);
  const [clientHistory, setClientHistory] = useState([]);
  const [medications, setMedications] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  
  // UI states
  const [view, setView] = useState('overview'); // 'overview', 'nutrition', 'compliance', 'medications', 'suggestions', 'history'
  const [loadingData, setLoadingData] = useState(false);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get('/users?role=CLIENT&limit=100');
      setClients(data.records || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  }, []);

  // Fetch analytics data for selected client
  const fetchAnalyticsData = useCallback(async (clientId) => {
    if (!clientId) return;
    
    setLoadingData(true);
    try {
      const [nutritionData, complianceData, historyData, medicationsData, suggestionsData] = await Promise.all([
        api.get(`/nutrition/nutrition-summary/${clientId}`, {
          params: { from: dateRange.from, to: dateRange.to }
        }),
        api.get(`/nutrition/compliance-stats/${clientId}`, {
          params: { from: dateRange.from, to: dateRange.to }
        }),
        api.get(`/nutrition/client-history/${clientId}`, {
          params: { from: dateRange.from, to: dateRange.to }
        }),
        api.get(`/nutrition/medications/${clientId}`),
        api.get(`/nutrition/suggestions/${clientId}`)
      ]);

      setNutritionSummary(nutritionData.data);
      setComplianceStats(complianceData.data);
      setClientHistory(historyData.data);
      setMedications(medicationsData.data);
      setSuggestions(suggestionsData.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      Notification('Failed to load analytics data', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [dateRange]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchClients();
      setLoading(false);
    };
    loadData();
  }, [fetchClients]);

  // Load analytics when client changes
  useEffect(() => {
    if (selectedClient) {
      fetchAnalyticsData(selectedClient.id);
    }
  }, [selectedClient, fetchAnalyticsData]);

  if (loading) {
    return (
      <div className='space-y-5 sm:space-y-6'>
        <div className='h-8 bg-slate-200 rounded animate-pulse' />
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-24 bg-slate-200 rounded-lg animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

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
              <h1 className='text-xl md:text-2xl font-bold'>Nutrition Analytics</h1>
              <p className='text-sm md:text-base text-white/80 mt-1'>
                Comprehensive client nutrition analysis and progress tracking
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <BarChart3 size={24} className='text-white/60' />
            </div>
          </div>
        </div>
      </div>

      {/* Client Selection & Filters */}
      <div className='rounded-lg bg-white p-4 shadow-sm'>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between'>
          <div className='flex flex-col md:flex-row gap-4 flex-1'>
            <Select
              label='Select Client'
              options={clients.map(client => ({ id: client.id, label: client.name }))}
              value={selectedClient?.id || ''}
              onChange={id => setSelectedClient(clients.find(c => c.id === id) || null)}
              placeholder='Choose a client to analyze'
              className='min-w-[200px]'
            />
            
            <div className='flex gap-2'>
              <Input
                label='From Date'
                type='date'
                value={dateRange.from}
                onChange={v => setDateRange(prev => ({ ...prev, from: v }))}
              />
              <Input
                label='To Date'
                type='date'
                value={dateRange.to}
                onChange={v => setDateRange(prev => ({ ...prev, to: v }))}
              />
            </div>
          </div>
          
          {selectedClient && (
            <Button
              name='Refresh Data'
              onClick={() => fetchAnalyticsData(selectedClient.id)}
              disabled={loadingData}
              className='inline-flex items-center gap-2'
            >
              <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
            </Button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      {selectedClient && (
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <TabsPill 
            className='!rounded-lg' 
            slice={3} 
            id='analytics-tabs' 
            tabs={[
              { key: 'overview', label: 'Overview' },
              { key: 'nutrition', label: 'Nutrition' },
              { key: 'compliance', label: 'Compliance' },
              { key: 'medications', label: 'Medications' },
              { key: 'suggestions', label: 'Suggestions' },
              { key: 'history', label: 'History' },
            ]} 
            active={view} 
            onChange={setView} 
          />
        </div>
      )}

      {/* Analytics Content */}
      {selectedClient && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          {/* Overview Tab */}
          {view === 'overview' && (
            <div className='space-y-6'>
              {/* Key Metrics */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                <StatCard
                  icon={<Target className='w-5 h-5' />}
                  title='Avg Daily Calories'
                  value={nutritionSummary ? Math.round(nutritionSummary.reduce((sum, day) => sum + day.totals.calories, 0) / nutritionSummary.length) : 0}
                  color='indigo'
                />
                <StatCard
                  icon={<CheckCircle className='w-5 h-5' />}
                  title='Compliance Rate'
                  value={complianceStats ? `${Math.round(complianceStats.complianceRate * 100)}%` : '0%'}
                  color='green'
                />
                <StatCard
                  icon={<Activity className='w-5 h-5' />}
                  title='Active Medications'
                  value={medications.filter(m => m.isActive).length}
                  color='blue'
                />
                <StatCard
                  icon={<FileText className='w-5 h-5' />}
                  title='Suggestions'
                  value={suggestions.length}
                  color='purple'
                />
              </div>

              {/* Recent Activity */}
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-800 mb-4'>Recent Activity</h3>
                {clientHistory.length > 0 ? (
                  <div className='space-y-3'>
                    {clientHistory.slice(0, 5).map((day, index) => (
                      <div key={index} className='flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50'>
                        <div>
                          <div className='font-medium text-slate-800'>
                            {new Date(day.date).toLocaleDateString()}
                          </div>
                          <div className='text-sm text-slate-600'>
                            {day.summary.taken}/{day.summary.total} meals completed
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm font-semibold text-slate-800'>
                            {Math.round(day.summary.compliance * 100)}%
                          </div>
                          <div className='text-xs text-slate-500'>compliance</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-slate-500'>
                    No recent activity found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nutrition Tab */}
          {view === 'nutrition' && (
            <div className='space-y-6'>
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-800 mb-4'>Nutrition Summary</h3>
                {loadingData ? (
                  <div className='space-y-3'>
                    {[1, 2, 3].map(i => (
                      <div key={i} className='h-16 bg-slate-200 rounded-lg animate-pulse' />
                    ))}
                  </div>
                ) : nutritionSummary && nutritionSummary.length > 0 ? (
                  <div className='space-y-4'>
                    {/* Daily Breakdown */}
                    {nutritionSummary.map((day, index) => (
                      <div key={index} className='p-4 rounded-lg border border-slate-200 bg-slate-50'>
                        <div className='flex items-center justify-between mb-3'>
                          <div className='font-medium text-slate-800'>
                            {new Date(day.date).toLocaleDateString()}
                          </div>
                          <div className='text-sm text-slate-500'>
                            {day.totals.calories} calories
                          </div>
                        </div>
                        <div className='grid grid-cols-4 gap-4 text-sm'>
                          <div className='text-center'>
                            <div className='font-semibold text-indigo-600'>{Math.round(day.totals.calories)}</div>
                            <div className='text-slate-500'>Calories</div>
                          </div>
                          <div className='text-center'>
                            <div className='font-semibold text-green-600'>{Math.round(day.totals.protein)}g</div>
                            <div className='text-slate-500'>Protein</div>
                          </div>
                          <div className='text-center'>
                            <div className='font-semibold text-yellow-600'>{Math.round(day.totals.carbs)}g</div>
                            <div className='text-slate-500'>Carbs</div>
                          </div>
                          <div className='text-center'>
                            <div className='font-semibold text-red-600'>{Math.round(day.totals.fat)}g</div>
                            <div className='text-slate-500'>Fat</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-slate-500'>
                    No nutrition data found for the selected period
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {view === 'compliance' && (
            <div className='space-y-6'>
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-800 mb-4'>Compliance Statistics</h3>
                {loadingData ? (
                  <div className='space-y-3'>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className='h-12 bg-slate-200 rounded-lg animate-pulse' />
                    ))}
                  </div>
                ) : complianceStats ? (
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    <div className='text-center p-4 rounded-lg bg-indigo-50 border border-indigo-200'>
                      <div className='text-2xl font-bold text-indigo-600'>{complianceStats.totalDays}</div>
                      <div className='text-sm text-indigo-600'>Total Days</div>
                    </div>
                    <div className='text-center p-4 rounded-lg bg-green-50 border border-green-200'>
                      <div className='text-2xl font-bold text-green-600'>{complianceStats.daysWithIntake}</div>
                      <div className='text-sm text-green-600'>Days with Intake</div>
                    </div>
                    <div className='text-center p-4 rounded-lg bg-blue-50 border border-blue-200'>
                      <div className='text-2xl font-bold text-blue-600'>{complianceStats.takenItems}</div>
                      <div className='text-sm text-blue-600'>Items Taken</div>
                    </div>
                    <div className='text-center p-4 rounded-lg bg-purple-50 border border-purple-200'>
                      <div className='text-2xl font-bold text-purple-600'>{Math.round(complianceStats.complianceRate * 100)}%</div>
                      <div className='text-sm text-purple-600'>Compliance Rate</div>
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-8 text-slate-500'>
                    No compliance data found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medications Tab */}
          {view === 'medications' && (
            <div className='space-y-6'>
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-800 mb-4'>Medication Tracking</h3>
                {loadingData ? (
                  <div className='space-y-3'>
                    {[1, 2, 3].map(i => (
                      <div key={i} className='h-16 bg-slate-200 rounded-lg animate-pulse' />
                    ))}
                  </div>
                ) : medications.length > 0 ? (
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-slate-500'>
                    No medications assigned to this client
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions Tab */}
          {view === 'suggestions' && (
            <div className='space-y-6'>
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-800 mb-4'>Client Suggestions</h3>
                {loadingData ? (
                  <div className='space-y-3'>
                    {[1, 2, 3].map(i => (
                      <div key={i} className='h-16 bg-slate-200 rounded-lg animate-pulse' />
                    ))}
                  </div>
                ) : suggestions.length > 0 ? (
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
                    No suggestions from this client
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {view === 'history' && (
            <div className='space-y-6'>
              <div className='rounded-lg bg-white p-4 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-800 mb-4'>Detailed History</h3>
                {loadingData ? (
                  <div className='space-y-3'>
                    {[1, 2, 3].map(i => (
                      <div key={i} className='h-20 bg-slate-200 rounded-lg animate-pulse' />
                    ))}
                  </div>
                ) : clientHistory.length > 0 ? (
                  <div className='space-y-4'>
                    {clientHistory.map((day, index) => (
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
                    No history found for the selected period
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* No Client Selected */}
      {!selectedClient && (
        <div className='rounded-lg bg-white p-8 shadow-sm text-center'>
          <div className='text-6xl mb-4'>📊</div>
          <h3 className='text-lg font-semibold text-slate-800 mb-2'>Select a Client</h3>
          <p className='text-slate-600'>Choose a client from the dropdown above to view their nutrition analytics.</p>
        </div>
      )}
    </div>
  );
}