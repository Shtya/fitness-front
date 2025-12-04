'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'use-intl';

import api, { baseImg } from '@/utils/axios';
import { toast } from 'react-hot-toast';
import { FiFileText, FiEye, FiPlus, FiUsers, FiLink2, FiSearch, FiCalendar } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa6';

import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import { Modal } from '@/components/dashboard/ui/UI';
import MultiLangText from '@/components/atoms/MultiLangText';
import Img from '@/components/atoms/Img';

const PAGE_SIZE = 50;

/* ----------------- small UI atoms ------------------ */

const cx = (...c) => c.filter(Boolean).join(' ');

function IconButton({ title, onClick, children, tone = 'slate', disabled }) {
  const tones = {
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300',
    indigo: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400',
  };
  const base = 'inline-flex items-center gap-2 h-9 px-3 rounded-lg border transition focus:outline-none focus:ring-2';
  const toneCls = tone === 'slate' ? tones.slate : tone === 'indigo' ? tones.indigo + ' border-transparent' : tones.emerald + ' border-transparent';
  return (
    <button type='button' title={title} aria-label={title} disabled={disabled} onClick={onClick} className={cx(base, toneCls, disabled && 'opacity-60 cursor-not-allowed')}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, tone = 'indigo', disabled }) {
  return (
    <button type='button' onClick={onClick} disabled={disabled} className={cx('inline-flex items-center gap-2 h-9 px-4 rounded-lg text-white transition focus:outline-none focus:ring-2', tone === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400', disabled && 'opacity-60 cursor-not-allowed')}>
      {children}
    </button>
  );
}

function Th({ children, className }) {
  return <th className={cx('px-4 py-3 text-left rtl:text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50 z-10', className)}>{children}</th>;
}
function Td({ children, className }) {
  return <td className={cx('px-4 py-3 text-sm text-slate-700', className)}>{children}</td>;
}

/* ----------------------------- page ----------------------------------- */

export default function SubmissionsPage() {
  const t = useTranslations('submissions');
  const router = useRouter();

  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [selectedFormId, setSelectedFormId] = useState('all');
  const [query, setQuery] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Submission modal (and assign)
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // debounce search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef(null);
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  useEffect(() => {
    loadForms();
    // Optional: fetch clients for assignment combo
    loadClients();
  }, []);

  useEffect(() => {
    if (!forms.length) return;
    setPage(1);
    loadSubmissions('reset');
  }, [forms, selectedFormId]);

  const loadClients = async () => {
    try {
      setClients([]);
    } catch {
      setClients([]);
    }
  };

  const loadForms = async () => {
    setLoadingForms(true);
    try {
      const res = await api.get('/forms');
      const list = res?.data?.data || res?.data || [];
      setForms(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(t('messages.load_forms_failed'));
    } finally {
      setLoadingForms(false);
    }
  };

  const normalizeSubmission = sub => ({
    ...sub,
    form_id: sub?.form?.id ?? sub?.form_id ?? null,
  });

  const loadSubmissions = async (mode = 'append') => {
    setLoadingSubs(true);
    try {
      if (selectedFormId === 'all') {
        const reqs = forms.map(f =>
          api
            .get(`/forms/${f.id}/submissions`, { params: { page: 1, limit: PAGE_SIZE } })
            .then(r => ({ formId: f.id, ...r.data }))
            .catch(() => ({ formId: f.id, data: [], total: 0 })),
        );
        const results = await Promise.all(reqs);
        let aggregated = [];
        let totalCount = 0;
        for (const r of results) {
          const arr = (r?.data || []).map(normalizeSubmission);
          aggregated = aggregated.concat(arr);
          totalCount += r?.total || 0;
        }
        aggregated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setTotal(totalCount);
        setSubmissions(aggregated);
      } else {
        const r = await api.get(`/forms/${selectedFormId}/submissions`, {
          params: { page, limit: PAGE_SIZE },
        });
        const rows = (r?.data?.data || r?.data || []).map(normalizeSubmission);
        const newList = mode === 'append' ? [...submissions, ...rows] : rows;
        setSubmissions(newList);
        setTotal(r?.data?.total ?? newList.length);
      }
    } catch (err) {
      toast.error(t('messages.load_submissions_failed'));
    } finally {
      setLoadingSubs(false);
    }
  };

  const onLoadMore = () => {
    if (selectedFormId === 'all') return;
    setPage(p => p + 1);
    setTimeout(() => loadSubmissions('append'), 0);
  };

  const filteredSubmissions = useMemo(() => {
    const q = debouncedQuery;
    if (!q) return submissions;
    return submissions.filter(s => {
      const formTitle = forms.find(f => f.id == s.form_id)?.title?.toLowerCase() || '';
      const email = s.email?.toLowerCase() || '';
      const phone = s.phone?.toLowerCase() || '';
      const ip = s.ipAddress?.toLowerCase() || '';
      const inAnswers =
        s.answers &&
        Object.values(s.answers).some(v =>
          String(Array.isArray(v) ? v.join(', ') : v)
            .toLowerCase()
            .includes(q),
        );
      return formTitle.includes(q) || email.includes(q) || phone.includes(q) || ip.includes(q) || inAnswers;
    });
  }, [submissions, forms, debouncedQuery]);

  const viewSubmission = submission => {
    setSelectedSubmission(submission);
    setAssignUserId(submission?.assignedToId || '');
    setShowSubmissionModal(true);
  };

  const assignSubmission = async () => {
    if (!selectedSubmission?.id || !selectedSubmission?.form_id) return;
    const uid = (assignUserId || '').trim();
    if (!uid) {
      toast.error(t('errors.user_required'));
      return;
    }
    setAssignLoading(true);
    try {
      await api.post(`/forms/${selectedSubmission.form_id}/submissions/${selectedSubmission.id}/assign`, {
        userId: uid,
      });
      toast.success(t('messages.assigned_ok'));
      // reflect locally
      setSelectedSubmission(prev => (prev ? { ...prev, assignedToId: uid, assignedAt: new Date().toISOString() } : prev));
    } catch (e) {
      toast.error(t('messages.assign_failed'));
    } finally {
      setAssignLoading(false);
    }
  };

  if (loadingForms && !forms.length) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <FaSpinner className='animate-spin h-8 w-8 text-indigo-600' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='container !px-0 py-8'>
        {/* Header */}
        <div className='relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'>
          <div className='absolute inset-0 overflow-hidden'>
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

          <div className='relative py-3 p-3 md:p-5 text-white'>
            <div className='flex items-center justify-between gap-3 flex-wrap'>
              <div className='space-y-1'>
                <h1 className='text-xl md:text-4xl font-semibold'>{t('header.title')}</h1>
                <p className='text-white/85 max-md:hidden'>{t('header.desc')}</p>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto md:min-w-[720px]'>
                <div className='md:col-span-2'>
                  <div className='relative'>
                    <Input cnInput='rtl:pr-8 ltr:pl-8 ' label='' placeholder={t('filters.search_placeholder')} value={query} onChange={setQuery} />
                    <FiSearch className='absolute rtl:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-black/50' />
                  </div>
                </div>

                <div className='md:col-span-1 max-w-[300px] w-full'>
                  <Select value={selectedFormId} onChange={val => setSelectedFormId(val)} options={[{ id: 'all', label: t('filters.all_forms') }, ...forms.map(f => ({ id: f.id, label: f.title }))]} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className='rounded-lg border border-slate-200 bg-white overflow-hidden mt-6'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-slate-200'>
              <thead className='bg-slate-50'>
                <tr>
                  <Th className='min-w-[220px]'>{t('table.form')}</Th>
                  <Th>{t('table.email')}</Th>
                  <Th>{t('table.phone')}</Th>
                  <Th>{t('table.ip')}</Th>
                  <Th>{t('table.submitted')}</Th>
                  <Th className='text-right pr-6'>{t('table.actions')}</Th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loadingSubs && submissions.length === 0
                  ? [...Array(5)].map((_, i) => (
                      <tr key={i} className='animate-pulse'>
                        <Td>
                          <div className='h-4 w-40 bg-slate-200 rounded' />
                        </Td>
                        <Td>
                          <div className='h-4 w-28 bg-slate-200 rounded' />
                        </Td>
                        <Td>
                          <div className='h-4 w-24 bg-slate-200 rounded' />
                        </Td>
                        <Td>
                          <div className='h-4 w-24 bg-slate-200 rounded' />
                        </Td>
                        <Td>
                          <div className='h-4 w-32 bg-slate-200 rounded' />
                        </Td>
                        <Td className='text-right pr-6'>
                          <div className='h-9 w-20 bg-slate-200 rounded' />
                        </Td>
                      </tr>
                    ))
                  : filteredSubmissions.map(s => {
                      const form = forms.find(f => f.id == s.form_id);
                      return (
                        <tr key={s.id} className='hover:bg-slate-50'>
                          <Td>
                            <div className='flex items-center gap-2'>
                              <span className='p-2 bg-indigo-100 rounded-lg'>
                                <FiFileText className='w-4 h-4 text-indigo-600' />
                              </span>
                              <MultiLangText className='font-medium text-slate-900 truncate max-w-[360px]'>{form?.title || t('labels.unknown_form')}</MultiLangText>
                            </div>
                          </Td>
                          <Td className='truncate max-w-[220px] font-en'>{s.email}</Td>
                          <Td className='truncate max-w-[160px]  font-en'>{s.phone}</Td>
                          <Td className='font-mono text-xs font-en'>{s.ipAddress}</Td>
                          <Td className={'font-en'}>{new Date(s.created_at).toLocaleString()}</Td>
                          <Td className='text-right pr-6'>
                            <IconButton title={t('actions.view')} onClick={() => viewSubmission(s)} tone='slate'>
                              <FiEye className='w-4 h-4' />
                              <span className='text-sm'>{t('actions.view')}</span>
                            </IconButton>
                          </Td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loadingSubs && filteredSubmissions.length === 0 && (
            <div className='text-center py-12'>
              <FiFileText className='h-12 w-12 text-slate-300 mx-auto mb-4' />
              <h3 className='text-lg font-semibold text-slate-900 mb-1'>{t('empty.title')}</h3>
              <p className='text-slate-600'>{selectedFormId === 'all' ? t('empty.subtitle_all') : t('empty.subtitle_one')}</p>
            </div>
          )}

          {/* Pager */}
          {selectedFormId !== 'all' && filteredSubmissions.length > 0 && filteredSubmissions.length < total && (
            <div className='p-4 border-top border-slate-200 flex justify-center'>
              <PrimaryButton onClick={onLoadMore} tone='indigo'>
                <FiEye className='w-4 h-4' />
                <span className='text-sm font-medium'>{t('actions.load_more')}</span>
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>

      {/* Submission Detail Modal */}
      <Modal open={showSubmissionModal && !!selectedSubmission} onClose={() => setShowSubmissionModal(false)} title={t('detail.title')} maxW='max-w-4xl'>
        {selectedSubmission && (
          <div className='space-y-6'>
            <Box title={t('detail.contact')}>
              <Row k={t('table.email')} v={selectedSubmission.email} />
              <Row k={t('table.phone')} v={selectedSubmission.phone} />
              <Row k={t('table.form')} v={forms.find(f => f.id == selectedSubmission.form_id)?.title || t('labels.unknown_form')} />
            </Box>

            <div>
              <h3 className='font-semibold text-slate-900 mb-3'>{t('detail.answers')}</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{renderAnswers(selectedSubmission, forms, t)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** ---------- tiny helpers ---------- */

function Box({ title, children }) {
  return (
    <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
      <div className='text-sm font-semibold text-slate-900 mb-2'>{title}</div>
      <div className='space-y-1'>{children}</div>
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className='text-sm'>
      <span className='text-slate-500'>{k}: </span>
      <MultiLangText className={mono ? 'font-mono' : 'font-medium'}>{String(v ?? '')}</MultiLangText>
    </div>
  );
}

function renderAnswers(submission, forms, t) {
  const form = forms.find(f => f.id == (submission.form_id ?? submission.form?.id));
  const fieldsByKey = new Map((form?.fields || []).map(fld => [fld.key, fld]));
  const entries = Object.entries(submission.answers || {});

  if (!entries.length) {
    return <div className='text-slate-600'>{t('detail.no_answers')}</div>;
  }

  return entries.map(([key, value]) => {
    const fld = fieldsByKey.get(key);
    const label = fld?.label || key;

    const isUploadImage = typeof value === 'string' && value.trim().toLowerCase().startsWith('upload');

    // Normalize path for URL (turn backslashes into slashes)
    const imgSrc = isUploadImage ? value.replace(/\\/g, '/') : null;

    const out = value == null ? '' : Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);

    return (
      <div key={key} className='rounded-lg border border-slate-200 bg-white p-3 w-full'>
        <MultiLangText dirAuto className='text-xs uppercase text-slate-500 mb-1'>
          {label}
        </MultiLangText>

        <div className='text-sm text-slate-900 break-words'>
          {isUploadImage ? (
            <a href={ baseImg + "/" + imgSrc} target='_blank' rel='noopener noreferrer' className='w-full h-[200px] inline-flex flex-col gap-2'>
              <Img src={imgSrc} alt={label} className=' w-fit h-full ' />
            </a>
          ) : out ? (
            <MultiLangText>{out}</MultiLangText>
          ) : (
            <span className='text-slate-400'>—</span>
          )}
        </div>
      </div>
    );
  });
}
