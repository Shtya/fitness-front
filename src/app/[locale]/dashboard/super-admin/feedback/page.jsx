'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Clock,
  Mail,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/utils/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Notification } from '@/config/Notification';

const FeedbackPage = () => {
  const t = useTranslations('feedback.admin');
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pagination, setPagination] = useState({
    skip: 0,
    take: 20,
    pages: 1,
    total: 0,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/feedback', {
        params: {
          skip: pagination.skip,
          take: pagination.take,
          type: selectedType || undefined,
          status: selectedStatus || undefined,
        },
      });

      if (response.data.success) {
        setFeedbacks(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      Notification.error(error.response?.data?.message || t('genericError'));
    } finally {
      setLoading(false);
    }
  }, [pagination.skip, pagination.take, selectedType, selectedStatus, t]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/feedback/stats/overview');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    fetchStats();
  }, [fetchFeedbacks, fetchStats]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await api.patch(`/feedback/${id}/status`, { status: newStatus });
      if (response.data.success) {
        Notification.success(t('statusUpdated'));
        fetchFeedbacks();
        fetchStats();
      }
    } catch (error) {
      Notification.error(t('updateFailed'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteConfirm'))) return;

    try {
      const response = await api.delete(`/feedback/${id}`);
      if (response.data.success) {
        Notification.success(t('deleted'));
        fetchFeedbacks();
        fetchStats();
      }
    } catch (error) {
      Notification.error(t('deleteFailed'));
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      enhancement: 'bg-blue-100 text-blue-700 border-blue-300',
      issue: 'bg-red-100 text-red-700 border-red-300',
      other: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[type] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      reviewed: 'bg-blue-100 text-blue-700 border-blue-300',
      resolved: 'bg-green-100 text-green-700 border-green-300',
      closed: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[status] || colors.new;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      new: t('statusNew'),
      reviewed: t('statusReviewed'),
      resolved: t('statusResolved'),
      closed: t('statusClosed'),
    };
    return statusMap[status] || status;
  };

  const filteredFeedbacks = feedbacks.filter((f) =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-4xl font-bold text-slate-900 mb-2'>{t('title')}</h1>
        <p className='text-slate-600'>{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
          <StatCard icon={MessageSquare} label={t('totalFeedback')} value={stats.total} color='blue' />
          <StatCard
            icon={Clock}
            label={t('newFeedback')}
            value={stats.stats.filter((s) => s.status === 'new').reduce((acc, s) => acc + parseInt(s.count), 0)}
            color='yellow'
          />
          <StatCard
            icon={CheckCircle2}
            label={t('resolvedFeedback')}
            value={stats.stats.filter((s) => s.status === 'resolved').reduce((acc, s) => acc + parseInt(s.count), 0)}
            color='green'
          />
          <StatCard
            icon={AlertCircle}
            label={t('issuesFeedback')}
            value={stats.stats.filter((s) => s.type === 'issue').reduce((acc, s) => acc + parseInt(s.count), 0)}
            color='red'
          />
        </div>
      )}

      {/* Filters */}
      <div className='bg-white rounded-lg shadow-md p-6 mb-6 border border-slate-200'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='search' className='text-sm font-medium text-slate-700'>
              {t('search')}
            </Label>
            <div className='relative'>
              <Search className='absolute left-3 top-3 w-4 h-4 text-slate-400' />
              <Input
                id='search'
                type='text'
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='type-filter' className='text-sm font-medium text-slate-700'>
              {t('typeFilter')}
            </Label>
            <Select value={selectedType || 'all'} onValueChange={(value) => {
              setSelectedType(value === 'all' ? '' : value);
              setPagination((p) => ({ ...p, skip: 0 }));
            }}>
              <SelectTrigger id='type-filter'>
                <SelectValue placeholder={t('typeFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>جميع الأنواع</SelectItem>
                <SelectItem value='enhancement'>تحسين</SelectItem>
                <SelectItem value='issue'>مشكلة</SelectItem>
                <SelectItem value='other'>أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='status-filter' className='text-sm font-medium text-slate-700'>
              {t('statusFilter')}
            </Label>
            <Select value={selectedStatus || 'all'} onValueChange={(value) => {
              setSelectedStatus(value === 'all' ? '' : value);
              setPagination((p) => ({ ...p, skip: 0 }));
            }}>
              <SelectTrigger id='status-filter'>
                <SelectValue placeholder={t('statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>جميع الحالات</SelectItem>
                <SelectItem value='new'>{t('statusNew')}</SelectItem>
                <SelectItem value='reviewed'>{t('statusReviewed')}</SelectItem>
                <SelectItem value='resolved'>{t('statusResolved')}</SelectItem>
                <SelectItem value='closed'>{t('statusClosed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm font-medium text-slate-700'>&nbsp;</Label>
            <Button
              variant='outline'
              className='w-full'
              onClick={() => {
                const csv = generateCSV(filteredFeedbacks);
                downloadCSV(csv);
              }}
            >
              <Download className='w-4 h-4 mr-2' />
              {t('exportCSV')}
            </Button>
          </div>
        </div>
      </div>

      {/* Feedbacks List */}
      <div className='space-y-3'>
        {loading ? (
          <div className='text-center py-12 bg-white rounded-lg border border-slate-200'>
            <Loader2 className='w-8 h-8 text-indigo-600 mx-auto animate-spin mb-2' />
            <p className='text-slate-600'>{t('loading')}</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className='bg-white rounded-lg p-12 text-center border border-slate-200'>
            <MessageSquare className='w-12 h-12 text-slate-300 mx-auto mb-4' />
            <p className='text-slate-600 font-medium'>{t('noFeedback')}</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <motion.div
              key={feedback.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-white rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-shadow'
            >
              <div className='p-4'>
                {/* Header */}
                <div
                  className='flex items-start justify-between cursor-pointer'
                  onClick={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-2 flex-wrap'>
                      <h3 className='text-lg font-semibold text-slate-900'>{feedback.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(feedback.type)}`}>
                        {feedback.type}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(feedback.status)}`}>
                        {getStatusLabel(feedback.status)}
                      </span>
                    </div>
                    <div className='flex items-center gap-4 text-sm text-slate-600 flex-wrap'>
                      <span className='flex items-center gap-1'>
                        <Clock className='w-4 h-4' />
                        {new Date(feedback.created_at).toLocaleDateString('ar')}
                      </span>
                      {feedback.email && (
                        <span className='flex items-center gap-1'>
                          <Mail className='w-4 h-4' />
                          {feedback.email}
                        </span>
                      )}
                      {feedback.user && (
                        <span className='flex items-center gap-1'>
                          <User className='w-4 h-4' />
                          {feedback.user.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <button className='p-2 hover:bg-slate-100 rounded-lg transition-colors'>
                    {expandedId === feedback.id ? <ChevronUp className='w-5 h-5' /> : <ChevronDown className='w-5 h-5' />}
                  </button>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === feedback.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className='mt-4 pt-4 border-t border-slate-200'
                    >
                      <div className='mb-4'>
                        <Label className='text-sm font-semibold text-slate-700 mb-2 block'>{t('description')}</Label>
                        <p className='text-slate-600 text-sm leading-relaxed'>{feedback.description}</p>
                      </div>

                      {/* Actions */}
                      <div className='flex items-center gap-2 justify-end flex-wrap'>
                        <Select value={feedback.status} onValueChange={(value) => handleStatusChange(feedback.id, value)}>
                          <SelectTrigger className='w-40'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='new'>{t('statusNew')}</SelectItem>
                            <SelectItem value='reviewed'>{t('statusReviewed')}</SelectItem>
                            <SelectItem value='resolved'>{t('statusResolved')}</SelectItem>
                            <SelectItem value='closed'>{t('statusClosed')}</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() => handleDelete(feedback.id)}
                        >
                          <Trash2 className='w-4 h-4 mr-2' />
                          {t('delete')}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className='mt-6 flex justify-center gap-2 flex-wrap'>
          <Button
            variant='outline'
            disabled={pagination.skip === 0}
            onClick={() => setPagination((p) => ({ ...p, skip: Math.max(0, p.skip - p.take) }))}
          >
            السابق
          </Button>
          <span className='px-4 py-2 text-slate-600'>
            صفحة {Math.floor(pagination.skip / pagination.take) + 1} من {pagination.pages}
          </span>
          <Button
            variant='outline'
            disabled={pagination.skip + pagination.take >= pagination.total}
            onClick={() => setPagination((p) => ({ ...p, skip: p.skip + p.take }))}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => {
  const bgColors = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
  };

  const textColors = {
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    red: 'text-red-600',
  };

  return (
    <div className={`${bgColors[color]} rounded-lg p-6 border`}>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-medium text-slate-600'>{label}</p>
          <p className={`text-2xl font-bold ${textColors[color]} mt-1`}>{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${textColors[color]} opacity-60`} />
      </div>
    </div>
  );
};

// CSV Export Helper
const generateCSV = (feedbacks) => {
  const headers = ['ID', 'Title', 'Type', 'Status', 'Email', 'User', 'Created Date', 'Description'];
  const rows = feedbacks.map((f) => [
    f.id,
    f.title,
    f.type,
    f.status,
    f.email || '',
    f.user?.name || '',
    new Date(f.created_at).toLocaleString(),
    f.description.replace(/"/g, '""'),
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  return csv;
};

const downloadCSV = (csv) => {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `feedback_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export default FeedbackPage;
