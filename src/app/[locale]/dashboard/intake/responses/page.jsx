'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';
import { FiFileText, FiDownload, FiEye, FiSearch, FiRefreshCcw, FiCalendar, FiAlertCircle, FiPlus } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa6';

import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import { Modal } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import MultiLangText from '@/components/atoms/MultiLangText';

const PAGE_SIZE = 50;

/* ----------------- small UI atoms (no shared Button) ------------------ */

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
  return <th className={cx('px-4 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50 z-10', className)}>{children}</th>;
}
function Td({ children, className }) {
  return <td className={cx('px-4 py-3 text-sm text-slate-700', className)}>{children}</td>;
}

/* ----------------------------- page ----------------------------------- */

export default function SubmissionsPage() {
  const router = useRouter();

  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [selectedFormId, setSelectedFormId] = useState('all');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateWarning, setDateWarning] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // debounce search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef(null);
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // validate date range
  useEffect(() => {
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom).getTime();
      const to = new Date(dateTo).getTime();
      setDateWarning(from > to ? '“From” date must be before “To” date.' : '');
    } else {
      setDateWarning('');
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    if (!forms.length) return;
    setPage(1);
    loadSubmissions('reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms, selectedFormId, dateFrom, dateTo]);

  const loadForms = async () => {
    setLoadingForms(true);
    try {
      const res = await api.get('/forms');
      const list = res?.data?.data || res?.data || [];
      setForms(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load forms');
    } finally {
      setLoadingForms(false);
    }
  };

  const normalizeSubmission = sub => ({
    ...sub,
    form_id: sub?.form?.id ?? sub?.form_id ?? null,
  });

  const withinRange = dt => {
    if (!dt) return true;
    const t = new Date(dt).getTime();
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00').getTime();
      if (t < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59').getTime();
      if (t > to) return false;
    }
    return true;
  };

  const loadSubmissions = async (mode = 'append') => {
    if (dateWarning) return; // don't fetch with invalid range
    setLoadingSubs(true);
    try {
      if (selectedFormId === 'all') {
        // fetch first page of each form and merge (desc by date)
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
          const arr = (r?.data || []).map(normalizeSubmission).filter(s => withinRange(s.created_at));
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
        const rows = (r?.data?.data || r?.data || []).map(normalizeSubmission).filter(s => withinRange(s.created_at));
        const newList = mode === 'append' ? [...submissions, ...rows] : rows;
        setSubmissions(newList);
        setTotal(r?.data?.total ?? newList.length);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submissions');
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
    setShowSubmissionModal(true);
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
        <div className=' mb-8 rounded-lg overflow-hidden border border-indigo-200 shadow-sm'>
          <div className='relative flex items-center justify-between  p-6 md:p-10 bg-gradient-to-r from-indigo-600 to-violet-600 text-white'>
            <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
            <div className='relative z-10'>
              <h1 className='text-2xl md:text-3xl font-bold'>Form Submissions</h1>
              <p className='text-white/90 mt-1'>View and manage form submissions from your clients.</p>
            </div>
            <div className=' max-w-[500px] grid grid-cols-1 md:grid-cols-3 gap-3'>
              <div className='md:col-span-2 relative'>
                <Input label='' placeholder='Search email, phone, IP, answers…' value={query} onChange={setQuery} />
              </div>
              <div>
                <Select value={selectedFormId} onChange={val => setSelectedFormId(val)} options={[{ id: 'all', label: 'All Forms' }, ...forms.map(f => ({ id: f.id, label: f.title }))]} />
              </div>
            </div>

          </div>
        </div>

        {/* Table */}
        <div className='rounded-lg border border-slate-200 bg-white overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-slate-200'>
              <thead className='bg-slate-50'>
                <tr>
                  <Th className='min-w-[220px]'>Form</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>IP Address</Th>
                  <Th>Submitted</Th>
                  <Th className='text-right pr-6'>Actions</Th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {loadingSubs && submissions.length === 0
                  ? // simple skeleton rows
                    [...Array(5)].map((_, i) => (
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
                              <MultiLangText className='font-medium text-slate-900 truncate max-w-[360px]'>{form?.title || 'Unknown Form'}</MultiLangText>
                            </div>
                          </Td>
                          <Td className='truncate max-w-[220px]'>{s.email}</Td>
                          <Td className='truncate max-w-[160px]'>{s.phone}</Td>
                          <Td className='font-mono text-xs'>{s.ipAddress}</Td>
                          <Td>{new Date(s.created_at).toLocaleString()}</Td>
                          <Td className='text-right pr-6'>
                            <IconButton title='View' onClick={() => viewSubmission(s)} tone='slate'>
                              <FiEye className='w-4 h-4' />
                              <span className='text-sm'>View</span>
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
              <h3 className='text-lg font-semibold text-slate-900 mb-1'>No submissions found</h3>
              <p className='text-slate-600'>{selectedFormId === 'all' ? 'No submissions have been made yet.' : 'No submissions found for the selected form.'}</p>
            </div>
          )}

          {/* Pager */}
          {selectedFormId !== 'all' && filteredSubmissions.length > 0 && filteredSubmissions.length < total && (
            <div className='p-4 border-t border-slate-200 flex justify-center'>
              <PrimaryButton onClick={onLoadMore} tone='indigo'>
                <FiEye className='w-4 h-4' />
                <span className='text-sm font-medium'>Load more</span>
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>

      {/* Submission Detail Modal */}
      <Modal open={showSubmissionModal && !!selectedSubmission} onClose={() => setShowSubmissionModal(false)} title='Submission Details' maxW='max-w-4xl'>
        {selectedSubmission && (
          <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Box title='Contact'>
                <Row k='Email' v={selectedSubmission.email} />
                <Row k='Phone' v={selectedSubmission.phone} />
                <Row k='IP' v={selectedSubmission.ipAddress} mono />
                <Row k='Submitted' v={new Date(selectedSubmission.created_at).toLocaleString()} />
              </Box>

              <Box title='Form'>
                <Row k='Form' v={forms.find(f => f.id == selectedSubmission.form_id)?.title || 'Unknown'} />
                <Row k='Submission ID' v={selectedSubmission.id} mono />
              </Box>
            </div>

            <div>
              <h3 className='font-semibold text-slate-900 mb-3'>Answers</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{renderAnswers(selectedSubmission, forms)}</div>
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <IconButton title='Close' onClick={() => setShowSubmissionModal(false)} tone='slate'>
                <span className='text-sm font-medium'>Close</span>
              </IconButton>
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

function renderAnswers(submission, forms) {
  const form = forms.find(f => f.id == submission.form_id);
  const fieldsByKey = new Map((form?.fields || []).map(fld => [fld.key, fld]));
  const entries = Object.entries(submission.answers || {});
  if (!entries.length) {
    return <div className='text-slate-600'>No answers.</div>;
  }
  return entries.map(([key, value]) => {
    const fld = fieldsByKey.get(key);
    const label = fld?.label || key;
    const out = value == null ? '' : Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return (
      <div key={key} className='rounded-lg border border-slate-200 bg-white p-3 w-full'>
        <MultiLangText dirAuto className='text-xs uppercase text-slate-500 mb-1'>{label}</MultiLangText>
        <div className='text-sm text-slate-900 break-words'>{ <MultiLangText>{out}</MultiLangText> || <span className='text-slate-400'>—</span>}</div>
      </div>
    );
  });
}
