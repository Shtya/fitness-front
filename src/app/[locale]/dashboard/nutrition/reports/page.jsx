'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Plus, Download, Eye, Calendar, TrendingUp, Users, FileText, BarChart3 } from 'lucide-react';

import { api } from '@/utils/api';
import { Notification } from '@/config/Notification'; 
import { Modal } from '@/components/dashboard/ui/UI';
import { Button } from '@/app/[locale]/page';
import { Input } from '@/components/pages/auth/Input';
import  Select  from '@/components/atoms/Select';
import { StatCard } from '@/components/dashboard/ui/UI';

const spring = { type: 'spring', stiffness: 300, damping: 30 };

export default function NutritionReportsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [reports, setReports] = useState([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

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

  // Fetch reports for selected client
  const fetchReports = useCallback(async (clientId) => {
    if (!clientId) return;
    try {
      const { data } = await api.get(`/nutrition/reports/${clientId}`, {
        params: dateRange
      });
      setReports(data.records || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    }
  }, [dateRange]);

  // Generate new report
  const generateReport = async (reportData) => {
    if (!selectedClient) return;
    try {
      await api.post('/nutrition/reports', {
        userId: selectedClient.id,
        generatedById: 'current-user-id', // This should come from auth context
        ...reportData
      });
      Notification('Report generated successfully', 'success');
      fetchReports(selectedClient.id);
    } catch (error) {
      Notification('Failed to generate report', 'error');
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchClients();
      setLoading(false);
    };
    loadData();
  }, [fetchClients]);

  // Load reports when client changes
  useEffect(() => {
    if (selectedClient) {
      fetchReports(selectedClient.id);
    }
  }, [selectedClient, fetchReports]);

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
              <h1 className='text-xl md:text-2xl font-bold'>Nutrition Reports</h1>
              <p className='text-sm md:text-base text-white/80 mt-1'>
                Comprehensive nutrition analysis and client progress tracking
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <FileText size={24} className='text-white/60' />
            </div>
          </div>
        </div>
      </div>

      {/* Client Selection */}
      <div className='rounded-lg bg-white p-4 shadow-sm'>
        <div className='flex items-center gap-4 mb-4'>
          <Select
            label='Select Client'
            options={clients.map(client => ({ id: client.id, label: client.name }))}
            value={selectedClient?.id || ''}
            onChange={id => setSelectedClient(clients.find(c => c.id === id) || null)}
            placeholder='Choose a client to view reports'
          />
          {selectedClient && (
            <Button
              name='Generate Report'
              onClick={() => setGenerateOpen(true)}
              className='inline-flex items-center gap-2'
            >
              <Plus size={16} />
            </Button>
          )}
        </div>

        {/* Date Range Filter */}
        {selectedClient && (
          <div className='flex items-center gap-4'>
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
        )}
      </div>

      {/* Reports List */}
      {selectedClient && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <h3 className='text-lg font-semibold text-slate-800 mb-4'>
              Reports for {selectedClient.name}
            </h3>
            
            {reports.length > 0 ? (
              <div className='space-y-4'>
                {reports.map(report => (
                  <div key={report.id} className='p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors'>
                    <div className='flex items-center justify-between mb-3'>
                      <div>
                        <h4 className='font-medium text-slate-800'>{report.title}</h4>
                        <p className='text-sm text-slate-600'>
                          {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setViewReport(report)}
                          className='p-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        >
                          <Eye size={16} />
                        </button>
                        <button className='p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'>
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {report.description && (
                      <p className='text-sm text-slate-600 mb-3'>{report.description}</p>
                    )}
                    
                    {/* Report Summary Stats */}
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-indigo-600'>
                          {Math.round(report.data.avgDailyCalories)}
                        </div>
                        <div className='text-xs text-slate-500'>Avg Daily Calories</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-green-600'>
                          {Math.round(report.data.complianceRate * 100)}%
                        </div>
                        <div className='text-xs text-slate-500'>Compliance Rate</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-blue-600'>
                          {report.data.totalMedications}
                        </div>
                        <div className='text-xs text-slate-500'>Medications</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-purple-600'>
                          {report.data.approvedSuggestions}
                        </div>
                        <div className='text-xs text-slate-500'>Approved Suggestions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-slate-500'>
                No reports found for the selected period
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Generate Report Modal */}
      <Modal open={generateOpen} onClose={() => setGenerateOpen(false)} title='Generate Nutrition Report'>
        <ReportForm
          onSubmit={async payload => {
            try {
              await generateReport(payload);
              setGenerateOpen(false);
            } catch (e) {
              Notification(e?.response?.data?.message || 'Generate failed', 'error');
            }
          }}
        />
      </Modal>

      {/* View Report Modal */}
      <Modal 
        open={!!viewReport} 
        onClose={() => setViewReport(null)} 
        title={viewReport?.title || 'Report Details'}
        size='lg'
      >
        {viewReport && <ReportDetails report={viewReport} />}
      </Modal>
    </div>
  );
}

// Report Form Component
function ReportForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [periodStart, setPeriodStart] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0]);

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const payload = { title, description, periodStart, periodEnd };
        onSubmit?.(payload);
      }}
      className='space-y-4'
    >
      <Input 
        label='Report Title' 
        name='title' 
        value={title} 
        onChange={v => setTitle(v)} 
        required 
        placeholder='e.g., Monthly Nutrition Analysis'
      />
      
      <Input 
        label='Description' 
        name='description' 
        value={description} 
        onChange={v => setDescription(v)} 
        placeholder='Optional description for this report'
      />
      
      <div className='grid grid-cols-2 gap-3'>
        <Input 
          label='Start Date' 
          name='periodStart' 
          type='date' 
          value={periodStart} 
          onChange={v => setPeriodStart(v)} 
          required 
        />
        <Input 
          label='End Date' 
          name='periodEnd' 
          type='date' 
          value={periodEnd} 
          onChange={v => setPeriodEnd(v)} 
          required 
        />
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button name='Generate Report' />
      </div>
    </form>
  );
}

// Report Details Component
function ReportDetails({ report }) {
  const data = report.data;
  
  return (
    <div className='space-y-6'>
      {/* Overview Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <StatCard
          icon={<TrendingUp className='w-5 h-5' />}
          title='Avg Daily Calories'
          value={Math.round(data.avgDailyCalories)}
          color='indigo'
        />
        <StatCard
          icon={<BarChart3 className='w-5 h-5' />}
          title='Compliance Rate'
          value={`${Math.round(data.complianceRate * 100)}%`}
          color='green'
        />
        <StatCard
          icon={<Users className='w-5 h-5' />}
          title='Total Meals'
          value={data.totalMeals}
          color='blue'
        />
        <StatCard
          icon={<Calendar className='w-5 h-5' />}
          title='Days Tracked'
          value={data.dailyData.length}
          color='purple'
        />
      </div>

      {/* Nutrition Breakdown */}
      <div className='rounded-lg border border-slate-200 p-4'>
        <h4 className='font-semibold text-slate-800 mb-3'>Nutrition Summary</h4>
        <div className='grid grid-cols-3 gap-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-red-600'>{Math.round(data.totalProtein)}g</div>
            <div className='text-sm text-slate-500'>Total Protein</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-yellow-600'>{Math.round(data.totalCarbs)}g</div>
            <div className='text-sm text-slate-500'>Total Carbs</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-orange-600'>{Math.round(data.totalFat)}g</div>
            <div className='text-sm text-slate-500'>Total Fat</div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className='rounded-lg border border-slate-200 p-4'>
        <h4 className='font-semibold text-slate-800 mb-3'>Daily Breakdown</h4>
        <div className='space-y-2 max-h-64 overflow-y-auto'>
          {data.dailyData.map((day, index) => (
            <div key={index} className='flex items-center justify-between p-2 rounded bg-slate-50'>
              <div className='text-sm font-medium'>{new Date(day.date).toLocaleDateString()}</div>
              <div className='flex items-center gap-4 text-xs text-slate-600'>
                <span>{Math.round(day.calories)} cal</span>
                <span>{Math.round(day.protein)}g protein</span>
                <span>{day.mealsTaken}/{day.totalMeals} meals</span>
                <span>{day.medicationsTaken}/{day.totalMedications} meds</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach Notes */}
      {(report.coachNotes || report.recommendations) && (
        <div className='space-y-4'>
          {report.coachNotes && (
            <div className='rounded-lg border border-slate-200 p-4'>
              <h4 className='font-semibold text-slate-800 mb-2'>Coach Notes</h4>
              <p className='text-sm text-slate-600'>{report.coachNotes}</p>
            </div>
          )}
          {report.recommendations && (
            <div className='rounded-lg border border-slate-200 p-4'>
              <h4 className='font-semibold text-slate-800 mb-2'>Recommendations</h4>
              <p className='text-sm text-slate-600'>{report.recommendations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
