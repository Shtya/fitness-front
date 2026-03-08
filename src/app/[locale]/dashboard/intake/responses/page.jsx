'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'use-intl';
import { useRouter } from 'next/navigation';

import api, { baseImg } from '@/utils/axios';
import { toast } from 'react-hot-toast';

import { FiSearch, FiTrash2 } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa6';

import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import MultiLangText from '@/components/atoms/MultiLangText';
import Img from '@/components/atoms/Img';

import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import DataTable from '@/components/dashboard/ui/DataTable';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';

import {
  FileText,
  Search,
  Eye,
  Sparkles,
  Users,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const PAGE_SIZE = 50;
const cx = (...c) => c.filter(Boolean).join(' ');

// ─────────────────────────────────────────────────────────────
//  PRIMITIVE UI COMPONENTS
// ─────────────────────────────────────────────────────────────

/** Elevated card with consistent border + shadow */
function Card({ children, className = '' }) {
  return (
    <div
      className={cx('overflow-hidden rounded-2xl border bg-white', className)}
      style={{
        borderColor: 'var(--color-primary-100)',
        boxShadow: '0 1px 3px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.06)',
      }}
    >
      {children}
    </div>
  );
}

/** Pill / badge */
function Pill({ children, tone = 'primary' }) {
  const tones = {
    primary: {
      border: 'var(--color-primary-200)',
      bg: 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.9))',
      text: 'var(--color-primary-800)',
    },
    soft: { border: '#e2e8f0', bg: '#f8fafc', text: '#475569' },
    success: { border: '#bbf7d0', bg: '#f0fdf4', text: '#166534' },
    warning: { border: '#fde68a', bg: '#fffbeb', text: '#92400e' },
  };
  const s = tones[tone] || tones.primary;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-xl border px-2.5 py-0.5 text-xs font-semibold"
      style={{ borderColor: s.border, background: s.bg, color: s.text }}
    >
      {children}
    </span>
  );
}

/** Tooltip wrapper for icon buttons */
function TipBtn({ tooltip, onClick, disabled, children, variant = 'ghost' }) {
  const [show, setShow] = useState(false);
  const styles = {
    ghost:   { bg: 'white',                      border: 'var(--color-primary-200)', color: 'var(--color-primary-600)' },
    view:    { bg: 'white',                      border: '#bae6fd',                   color: '#0369a1' },
    danger:  { bg: '#fef2f2',                    border: '#fecaca',                   color: '#dc2626' },
  };
  const s = styles[variant] || styles.ghost;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        style={{ background: s.bg, borderColor: s.border, color: s.color, boxShadow: '0 1px 3px rgba(15,23,42,0.07)' }}
      >
        {children}
      </button>
      <div
        className={cx(
          'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-white transition-all duration-150',
          show ? 'opacity-100 -translate-y-0.5' : 'opacity-0 translate-y-1',
        )}
        style={{ background: '#0f172a', boxShadow: '0 8px 24px rgba(15,23,42,0.3)' }}
      >
        {tooltip}
        <div
          className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent"
          style={{ borderTopColor: '#0f172a', marginTop: '-1px' }}
        />
      </div>
    </div>
  );
}

/** Key-value display in detail modal */
function InfoRow({ k, v, mono = false }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: 'var(--color-primary-100)',
        background: 'linear-gradient(135deg, #ffffff, var(--color-primary-50))',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</p>
      <MultiLangText className={cx('mt-1 break-words text-sm font-semibold text-slate-900', mono && 'font-mono text-xs')}>
        {String(v ?? '—')}
      </MultiLangText>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  REVIEWED CHECKBOX
// ─────────────────────────────────────────────────────────────
function ReviewedCell({ row, updatingReviewed, setReviewed, t }) {
  const formId = row.form_id ?? row.form?.id;
  const key    = formId != null && row.id != null ? `${formId}-${row.id}` : '';
  const loading = key ? updatingReviewed.has(key) : false;

  return (
    <label
      className={cx(
        'inline-flex cursor-pointer select-none items-center gap-2 transition-opacity',
        loading && 'cursor-not-allowed opacity-60',
      )}
      aria-label={t('review.aria_label')}
    >
      {/* Hidden native checkbox */}
      <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={!!row.reviewed}
          disabled={loading}
          onChange={e => setReviewed(row, e.target.checked)}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 bg-white transition-colors checked:border-[color:var(--color-primary-500)] checked:bg-[color:var(--color-primary-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] focus-visible:ring-offset-1 disabled:cursor-not-allowed"
        />
        {/* Checkmark SVG */}
        <svg
          className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          viewBox="0 0 12 12" fill="none"
        >
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <span className={cx('text-sm font-medium transition-colors', row.reviewed ? 'text-slate-700' : 'text-slate-400')}>
        {loading
          ? t('review.loading')
          : row.reviewed
            ? t('review.checked')
            : t('review.label')}
      </span>

      {loading && <FaSpinner className="h-3.5 w-3.5 animate-spin flex-shrink-0 text-[color:var(--color-primary-400)]" />}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
//  ANSWER RENDERING
// ─────────────────────────────────────────────────────────────
function AnswerCard({ fieldKey, label, value, forms, submission, t }) {
  const isUrl        = s => typeof s === 'string' && /^(https?:)?\/\//i.test(s.trim());
  const isProbPath   = s => typeof s === 'string' && /\/uploads\/|^uploads\/|^\/uploads\//i.test(s.trim());
  const isImageUrl   = s => typeof s === 'string' && /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(s.trim());

  const normalizeUrl = raw => {
    if (!raw || typeof raw !== 'string') return '';
    const cleaned = raw.replace(/\\/g, '/').trim();
    if (isUrl(cleaned)) return cleaned;
    if (typeof baseImg !== 'undefined' && baseImg) {
      return cleaned.startsWith('/') ? `${baseImg}${cleaned}` : `${baseImg}/${cleaned}`;
    }
    return cleaned;
  };

  const extractFiles = val => {
    if (Array.isArray(val)) return val.filter(v => typeof v === 'string' && v.trim()).map(v => v.replace(/\\/g, '/').trim());
    if (typeof val === 'string') {
      const v = val.trim();
      if (v.toLowerCase().startsWith('upload') || isUrl(v) || isProbPath(v)) return [v.replace(/\\/g, '/').trim()];
    }
    return [];
  };

  const files      = extractFiles(value);
  const imageFiles = files.filter(isImageUrl);
  const otherFiles = files.filter(f => !isImageUrl(f));

  const out = value == null ? ''
    : Array.isArray(value) ? value.join(', ')
    : typeof value === 'object' ? JSON.stringify(value)
    : String(value);

  return (
    <div
      className="overflow-hidden rounded-xl border bg-white p-4 transition-colors hover:border-[color:var(--color-primary-200)]"
      style={{ borderColor: 'var(--color-primary-100)' }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <MultiLangText dirAuto className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </MultiLangText>
        <span
          className="flex-shrink-0 rounded-lg border px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{
            borderColor: 'var(--color-primary-200)',
            background: 'var(--color-primary-50)',
            color: 'var(--color-primary-600)',
          }}
        >
          {fieldKey}
        </span>
      </div>

      {/* Content */}
      <div className="text-sm text-slate-900">
        {imageFiles.length > 0 ? (
          <div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {imageFiles.map((rawUrl, i) => (
                <a key={i} href={normalizeUrl(rawUrl)} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="overflow-hidden rounded-xl border border-[color:var(--color-primary-100)] transition-all group-hover:border-[color:var(--color-primary-300)] group-hover:shadow-md">
                    <Img src={rawUrl} alt={`${label} ${i + 1}`} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                </a>
              ))}
            </div>
            {otherFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {otherFiles.map((rawUrl, i) => (
                  <a key={i} href={normalizeUrl(rawUrl)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-primary-600)] underline-offset-2 hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    {rawUrl}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-1.5">
            {files.map((rawUrl, i) => (
              <a key={i} href={normalizeUrl(rawUrl)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-primary-600)] underline-offset-2 hover:underline">
                <ExternalLink className="h-3 w-3" />
                {rawUrl}
              </a>
            ))}
          </div>
        ) : out ? (
          <MultiLangText className="break-words font-medium text-slate-800">{out}</MultiLangText>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>

      {/* Divider */}
      <div
        className="mt-3 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary-100), transparent)' }}
      />
    </div>
  );
}

function renderAnswers(submission, forms, t) {
  const form       = forms.find(f => f.id == (submission.form_id ?? submission.form?.id));
  const fieldsByKey = new Map((form?.fields || []).map(fld => [fld.key, fld]));
  const entries    = Object.entries(submission.answers || {});

  if (!entries.length) return <p className="text-slate-500">{t('detail.no_answers')}</p>;

  return entries.map(([key, value]) => (
    <AnswerCard
      key={key}
      fieldKey={key}
      label={fieldsByKey.get(key)?.label || key}
      value={value}
      forms={forms}
      submission={submission}
      t={t}
    />
  ));
}

// ─────────────────────────────────────────────────────────────
//  PAGE LOADING SCREEN
// ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <FaSpinner className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary-500)' }} />
        <p className="text-sm font-medium text-slate-400">Loading…</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function SubmissionsPage() {
  const t      = useTranslations('submissions');
  const router = useRouter();

  const [forms, setForms]               = useState([]);
  const [submissions, setSubmissions]   = useState([]);
  const [updatingReviewed, setUpdatingReviewed] = useState(new Set());
  const [deletingId, setDeletingId]     = useState(null);

  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingSubs, setLoadingSubs]   = useState(false);

  const [selectedFormId, setSelectedFormId] = useState('all');
  const [query, setQuery]               = useState('');

  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE)), [total]);

  // Detail modal
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef(null);
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // ── Fetch forms ──
  useEffect(() => { loadForms(); }, []);

  useEffect(() => {
    if (!forms.length) return;
    setPage(1);
    loadSubmissions({ forcedPage: 1 });
  }, [forms, selectedFormId]);

  useEffect(() => {
    if (!forms.length) return;
    if (selectedFormId === 'all') return;
    loadSubmissions({ forcedPage: page });
  }, [page]);

  const loadForms = async () => {
    setLoadingForms(true);
    try {
      const res  = await api.get('/forms');
      const list = res?.data?.data || res?.data || [];
      setForms(Array.isArray(list) ? list : []);
    } catch {
      toast.error(t('messages.load_forms_failed'));
    } finally {
      setLoadingForms(false);
    }
  };

  const normalizeSubmission = sub => ({
    ...sub,
    form_id: sub?.form?.id ?? sub?.form_id ?? null,
  });

  const loadSubmissions = async ({ forcedPage } = {}) => {
    setLoadingSubs(true);
    try {
      if (selectedFormId === 'all') {
        const reqs = forms.map(f =>
          api.get(`/forms/${f.id}/submissions`, { params: { page: 1, limit: PAGE_SIZE } })
            .then(r => ({ ...r.data, formId: f.id }))
            .catch(() => ({ data: [], total: 0, formId: f.id }))
        );
        const results   = await Promise.all(reqs);
        let aggregated  = [];
        let totalCount  = 0;
        for (const r of results) {
          aggregated = aggregated.concat((r?.data || []).map(normalizeSubmission));
          totalCount += r?.total || 0;
        }
        aggregated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setTotal(totalCount);
        setSubmissions(aggregated);
      } else {
        const currentPage = forcedPage ?? page;
        const r = await api.get(`/forms/${selectedFormId}/submissions`, {
          params: { page: currentPage, limit: PAGE_SIZE },
        });
        const rows = (r?.data?.data || r?.data || []).map(normalizeSubmission);
        setSubmissions(rows);
        setTotal(r?.data?.total ?? rows.length);
      }
    } catch {
      toast.error(t('messages.load_submissions_failed'));
    } finally {
      setLoadingSubs(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    const q = debouncedQuery;
    if (!q) return submissions;
    return submissions.filter(s => {
      const formTitle = forms.find(f => f.id == s.form_id)?.title?.toLowerCase() || '';
      const inAnswers = s.answers &&
        Object.values(s.answers).some(v =>
          String(Array.isArray(v) ? v.join(', ') : v).toLowerCase().includes(q)
        );
      return (
        formTitle.includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.ipAddress || '').toLowerCase().includes(q) ||
        inAnswers
      );
    });
  }, [submissions, forms, debouncedQuery]);

  const headerStats = useMemo(() => ({
    totalShown:  filteredSubmissions.length,
    uniqueForms: new Set(filteredSubmissions.map(s => String(s.form_id ?? ''))).size,
  }), [filteredSubmissions]);

  // ── Callbacks ──
  const viewSubmission = useCallback(submission => {
    setSelectedSubmission(submission);
    setShowSubmissionModal(true);
  }, []);

  const setReviewed = useCallback(async (row, checked) => {
    const formId = row.form_id ?? row.form?.id;
    if (formId == null || row.id == null) return;
    const key = `${formId}-${row.id}`;
    setUpdatingReviewed(prev => new Set([...prev, key]));
    try {
      await api.patch(`/forms/${formId}/submissions/${row.id}`, { reviewed: !!checked });
      setSubmissions(prev => prev.map(s => s.id === row.id ? { ...s, reviewed: !!checked } : s));
    } catch {
      toast.error(t('messages.update_reviewed_failed', { default: 'Failed to update' }));
    } finally {
      setUpdatingReviewed(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  }, [t]);

  const deleteSubmission = useCallback(async row => {
    const formId = row.form_id ?? row.form?.id;
    if (formId == null || row.id == null) return;
    if (!window.confirm(t('actions.confirm_delete', { default: 'Delete this response?' }))) return;
    setDeletingId(row.id);
    try {
      await api.delete(`/forms/${formId}/submissions/${row.id}`);
      setSubmissions(prev => prev.filter(s => s.id !== row.id));
      setTotal(prev => Math.max(0, (prev ?? 0) - 1));
      if (selectedSubmission?.id === row.id) { setShowSubmissionModal(false); setSelectedSubmission(null); }
      toast.success(t('messages.delete_success', { default: 'Deleted' }));
    } catch {
      toast.error(t('messages.delete_failed', { default: 'Failed to delete' }));
    } finally {
      setDeletingId(null);
    }
  }, [selectedSubmission?.id, t]);

  // ── Columns ──
  const columns = useMemo(() => [
    {
      header: t('table.reviewed'),
      accessor: 'reviewed',
      cell: row => (
        <ReviewedCell
          row={row}
          updatingReviewed={updatingReviewed}
          setReviewed={setReviewed}
          t={t}
        />
      ),
    },
    {
      header: t('table.form'),
      accessor: '__formTitle',
      cell: row => {
        const form = forms.find(f => f.id == row.form_id);
        return (
          <div className="flex min-w-[200px] items-center gap-3">
            <div
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))' }}
            >
              <FileText className="h-4 w-4" style={{ color: 'var(--color-primary-500)' }} />
            </div>
            <div className="min-w-0">
              <MultiLangText className="block max-w-[360px] truncate text-sm font-semibold text-slate-900">
                {form?.title || t('labels.unknown_form')}
              </MultiLangText>
              <p className="mt-0.5 text-[11px] text-slate-400 font-en">
                {new Date(row.created_at).toLocaleDateString()} · {new Date(row.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: t('table.email'),
      accessor: 'email',
      cell: row => (
        <span className="max-w-[220px] truncate font-en text-sm text-slate-700">
          {row.email || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      header: t('table.phone'),
      accessor: 'phone',
      cell: row => (
        <span className="max-w-[160px] truncate font-en text-sm text-slate-700">
          {row.phone || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      header: t('table.ip'),
      accessor: 'ipAddress',
      cell: row => (
        <span
          className="inline-flex items-center rounded-xl border px-2.5 py-1 font-mono text-xs font-medium"
          style={{
            borderColor: 'var(--color-primary-200)',
            background: 'var(--color-primary-50)',
            color: 'var(--color-primary-700)',
          }}
        >
          {row.ipAddress || '—'}
        </span>
      ),
    },
    {
      header: t('table.submitted'),
      accessor: 'created_at',
      cell: row => (
        <span className="font-en text-sm text-slate-600">
          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      header: t('table.actions'),
      accessor: '__actions',
      className: 'text-right',
      cell: row => (
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-[color:var(--color-primary-100)] bg-white p-1 shadow-sm">
            <TipBtn tooltip={t('actions.view')} onClick={() => viewSubmission(row)} variant="view">
              <Eye className="h-3.5 w-3.5" />
            </TipBtn>
            <div className="h-4 w-px bg-slate-100" />
            <TipBtn
              tooltip={t('actions.delete', { default: 'Delete' })}
              onClick={() => deleteSubmission(row)}
              disabled={deletingId === row.id}
              variant="danger"
            >
              {deletingId === row.id
                ? <FaSpinner className="h-3.5 w-3.5 animate-spin" />
                : <FiTrash2 className="h-3.5 w-3.5" />}
            </TipBtn>
          </div>
        </div>
      ),
    },
  ], [forms, t, updatingReviewed, deletingId, setReviewed, deleteSubmission, viewSubmission]);

  // ─────────────────────────────────────────────────────────────
  if (loadingForms && !forms.length) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-20">

      {/* ── Header ── */}
      <GradientStatsHeader
        title={t('header.title')}
        desc={t('header.desc')}
        icon={Sparkles}
        btnName={t('header.new', { default: t('filters.all_forms') })}
        onClick={() => router.push('/dashboard/intake/forms')}
      >
        <StatCard icon={Users}     title={t('labels.total')}  value={total || 0} />
        <StatCard icon={FileText}  title={t('labels.shown')}  value={headerStats.totalShown} />
        <StatCard icon={CheckCircle2} title={t('labels.forms')} value={headerStats.uniqueForms} />
      </GradientStatsHeader>

      {/* ── Filters bar ── */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-[300px]">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-400"
          />
          <Input
            cnInput="ltr:pl-8 rtl:pr-8"
            cnInputParent="w-full"
            placeholder={t('filters.search_placeholder')}
            value={query}
            onChange={setQuery}
          />
        </div>

        {/* Form filter */}
        <Select clearable={false} searchable={false} className='!w-[150px] '
          value={selectedFormId}
          onChange={val => setSelectedFormId(val)}
          options={[
            { id: 'all', label: t('filters.all_forms') },
            ...forms.map(f => ({ id: f.id, label: f.title })),
          ]}
        />
      </div>

      {/* ── Table ── */}
      <div className="mt-6">
        <Card>
          <DataTable
            columns={columns}
            data={filteredSubmissions}
            loading={loadingSubs}
            itemsPerPage={PAGE_SIZE}
            serverPagination
            stickyHeader
            pagination
            selectable={false}
            page={page}
            onPageChange={p => setPage(p)}
            totalRows={totalPages}
            emptyState={
              <div className="py-16 text-center">
                <div
                  className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
                  }}
                >
                  <FileText className="h-7 w-7" style={{ color: 'var(--color-primary-500)' }} />
                </div>
                <h3 className="mb-1 text-base font-bold text-slate-800">{t('empty.title')}</h3>
                <p className="text-sm text-slate-500">
                  {selectedFormId === 'all' ? t('empty.subtitle_all') : t('empty.subtitle_one')}
                </p>
              </div>
            }
          />
        </Card>
      </div>

      {/* ── Submission detail modal ── */}
      <Modal
        open={showSubmissionModal && !!selectedSubmission}
        onClose={() => setShowSubmissionModal(false)}
        title={t('detail.title')}
        maxW="max-w-4xl"
      >
        {selectedSubmission && (
          <div className="space-y-6 pt-2">
            {/* Contact card */}
            <Card className="p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))' }}
                  >
                    <FileText className="h-5 w-5" style={{ color: 'var(--color-primary-600)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t('detail.contact')}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(selectedSubmission.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Pill tone="primary">
                  {forms.find(f => f.id == selectedSubmission.form_id)?.title || t('labels.unknown_form')}
                </Pill>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <InfoRow k={t('table.email')} v={selectedSubmission.email} />
                <InfoRow k={t('table.phone')} v={selectedSubmission.phone} />
                <InfoRow k={t('table.ip')}    v={selectedSubmission.ipAddress} mono />
              </div>
            </Card>

            {/* Answers */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900">{t('detail.answers')}</h3>
                <Pill tone="soft">
                  {Object.keys(selectedSubmission.answers || {}).length}
                </Pill>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {renderAnswers(selectedSubmission, forms, t)}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}