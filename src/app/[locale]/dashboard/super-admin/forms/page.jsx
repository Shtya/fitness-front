'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  User,
  Clock,
  Tag,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import api from '@/utils/axios';

const STATUS_COLORS = {
  new: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  reviewed: 'bg-blue-100 text-blue-700 border-blue-300',
  resolved: 'bg-green-100 text-green-700 border-green-300',
  closed: 'bg-gray-100 text-gray-700 border-gray-300',
};

function StatusBadge({ status, label }) {
  const cls = STATUS_COLORS[status] || STATUS_COLORS.new;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || status}
    </span>
  );
}

export default function SuperAdminFormsPage() {
  const t = useTranslations('feedback.admin');
  const locale = useLocale();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/feedback', {
        params: {
          skip: 0,
          take: 100,
          category: 'contact',
          status: statusFilter || undefined,
        },
      });

      if (data?.success) {
        setItems(data.data || []);
      } else if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Failed to load contact forms', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await api.patch(`/feedback/${id}/status`, { status: nextStatus });
      await fetchSubmissions();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB');
    } catch {
      return String(value);
    }
  };

  const stats = useMemo(() => {
    const total = items.length;
    const byStatus = items.reduce(
      (acc, it) => {
        acc[it.status] = (acc[it.status] || 0) + 1;
        return acc;
      },
      {}
    );
    return { total, byStatus };
  }, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
          Contact Form Submissions
        </h1>
        <p className="text-slate-600">
          Submissions sent from the public contact form.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            Total
          </p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            New
          </p>
          <p className="text-2xl font-bold text-amber-600">
            {stats.byStatus.new || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            Resolved
          </p>
          <p className="text-2xl font-bold text-emerald-600">
            {stats.byStatus.resolved || 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 shadow-sm flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Filter by status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
          >
            <option value="">All</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchSubmissions}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <Loader2
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-600 text-sm">Loading submissions…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-sm">
            No contact form submissions found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-slate-200 shadow-sm"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
                  onClick={() =>
                    setExpandedId(isOpen ? null : item.id)
                  }
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                          <User className="w-4 h-4 text-slate-500" />
                          {item.name || item.title || 'Unknown'}
                        </span>
                        <StatusBadge
                          status={item.status}
                          label={item.status}
                        />
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                          <Tag className="w-3 h-3" />
                          {item.category || 'contact'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {item.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {item.email}
                          </span>
                        )}
                        {item.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {item.phone}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.status !== 'reviewed') {
                          handleStatusChange(item.id, 'reviewed');
                        }
                      }}
                      className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <Eye className="w-3 h-3" />
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.status !== 'resolved') {
                          handleStatusChange(item.id, 'resolved');
                        }
                      }}
                      className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Resolve
                    </button>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 text-slate-500 bg-slate-50">
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="px-4 pb-4 border-t border-slate-100"
                    >
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Message
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">
                          {item.description || '—'}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.status !== 'reviewed' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(item.id, 'reviewed')
                            }
                            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Eye className="w-3 h-3" />
                            Mark as reviewed
                          </button>
                        )}
                        {item.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(item.id, 'resolved')
                            }
                            className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Mark as resolved
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

