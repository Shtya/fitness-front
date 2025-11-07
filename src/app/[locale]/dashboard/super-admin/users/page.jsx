'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import api from '@/utils/axios';
import DataTable from '@/components/dashboard/ui/DataTable';
import { Modal } from '@/components/dashboard/ui/UI';
import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';
import Button from '@/components/atoms/Button';
import ActionsMenu from '@/components/molecules/ActionsMenu';
import { Notification } from '@/config/Notification';

import {
  Plus, Search, Shield, User, Mail, Phone, Eye, PencilLine, Trash2, PauseCircle, PlayCircle,
  ChevronDown, ChevronUp, Users, UserCircle, EyeOff, Eye as EyeIcon, Sparkles, ListChecks
} from 'lucide-react';

/* ======================= helpers ======================= */
const toTitle = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const normStatus = s => (s ? String(s).trim().toLowerCase() : 'pending');

/* simple badge */
function Badge({ children, color = 'slate' }) {
  const map = {
    green: 'bg-green-100 text-green-700 ring-green-600/10',
    amber: 'bg-amber-100 text-amber-800 ring-amber-600/10',
    red: 'bg-red-100 text-red-700 ring-red-600/10',
    slate: 'bg-slate-100 text-slate-700 ring-slate-600/10',
    violet: 'bg-violet-100 text-violet-700 ring-violet-600/10',
    blue: 'bg-blue-100 text-blue-700 ring-blue-600/10',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/10',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-600/10'
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color] || map.slate}`}>
      {children}
    </span>
  );
}

function StatusPill({ value }) {
  const v = normStatus(value);
  const color = v === 'active' ? 'green' : v === 'suspended' ? 'red' : 'amber';
  return <Badge color={color}>{toTitle(v)}</Badge>;
}

/* ======================= validation ======================= */
const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;

const createAdminSchema = yup.object({
  name: yup.string().trim().min(2, 'superAdmin.errors.nameMin').required('superAdmin.errors.nameRequired'),
  email: yup.string().trim().email('superAdmin.errors.emailInvalid').required('superAdmin.errors.emailRequired'),
  phone: yup.string().matches(phoneRegex, 'superAdmin.errors.phoneInvalid').optional().nullable(),
  password: yup.string().trim().required('superAdmin.errors.passwordRequired').min(8, 'superAdmin.errors.passwordMin'),
  status: yup.mixed().oneOf(['active', 'suspended']).required('superAdmin.errors.statusRequired')
});

/* ======================= create admin modal ======================= */
function CreateAdminModal({ open, onClose, onCreated }) {
  const t = useTranslations('superAdmin');
  const [showPwd, setShowPwd] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting }, setValue, trigger } = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '', status: 'active' },
    resolver: yupResolver(createAdminSchema),
    mode: 'onBlur'
  });

  const generatePassword = e => {
    e?.preventDefault?.();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let p = '';
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setValue('password', p);
    trigger('password');
    Notification(t('alerts.passwordGenerated'), 'info');
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/super-admin/admins', data);
      Notification(t('alerts.adminCreated'), 'success');
      onCreated?.();
      onClose?.();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.createFailed'), 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('createModal.title')}>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Controller name='name' control={control}
            render={({ field }) => <Input label={t('fields.name')} placeholder={t('placeholders.name')} error={t(errors.name?.message || '')} icon={<User className='w-4 h-4' />} {...field} />} />
          <Controller name='phone' control={control}
            render={({ field }) => <Input label={t('fields.phone')} placeholder={t('placeholders.phone')} error={t(errors.phone?.message || '')} icon={<Phone className='w-4 h-4' />} {...field} value={field.value || ''} />} />
          <Controller name='email' control={control}
            render={({ field }) => <Input label={t('fields.email')} type='email' placeholder={t('placeholders.email')} error={t(errors.email?.message || '')} icon={<Mail className='w-4 h-4' />} {...field} />} />

          {/* password */}
          <div className='relative'>
            <Controller name='password' control={control}
              render={({ field }) => (
                <Input
                  label={t('fields.password')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder='••••••••'
                  error={t(errors.password?.message || '')}
                  {...field}
                />
              )}
            />
            <div className='absolute right-2 top-9 flex items-center gap-1'>
              <Button color='neutral' className='!min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={() => setShowPwd(v => !v)} name='' icon={showPwd ? <EyeOff className='w-4 h-4' /> : <EyeIcon className='w-4 h-4' />} />
              <Button color='neutral' className='!min-h-[30px] !px-2 !py-1 !text-xs rounded-lg' onClick={generatePassword} name='' icon={<Sparkles className='w-4 h-4' />} />
            </div>
          </div>

          <Controller name='status' control={control}
            render={({ field }) => (
              <Select
                label={t('fields.status')}
                placeholder={t('placeholders.status')}
                options={[
                  { id: 'active', label: t('status.active') },
                  { id: 'suspended', label: t('status.suspended') }
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className='flex justify-end gap-2'>
          <Button color='neutral' name={t('common.cancel')} onClick={onClose} />
          <Button color='primary' type='submit' name={isSubmitting ? t('common.creating') : t('createModal.create')} disabled={isSubmitting} />
        </div>
      </form>
    </Modal>
  );
}

/* ======================= expandable row (coaches & clients) ======================= */
function AdminExpandPanel({ admin, loadDetails }) {
  // Expected shape:
  // admin.coaches?: [{ id, name, email, clientsCount, clients?: [...] }]
  // If not present, we call loadDetails(admin.id) to fetch and merge
  const t = useTranslations('superAdmin');
  const [openCoachIds, setOpenCoachIds] = useState({}); // {coachId: bool}

  useEffect(() => {
    if (!admin?._detailsLoaded) {
      loadDetails?.(admin.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCoach = (cid) => setOpenCoachIds(s => ({ ...s, [cid]: !s[cid] }));

  return (
    <div className='bg-slate-50/70 rounded-lg p-3 border border-slate-200'>
      <div className='flex items-center gap-2 mb-2'>
        <Users className='w-4 h-4 text-slate-600' />
        <h4 className='text-sm font-semibold text-slate-700'>{t('expand.coaches')}</h4>
      </div>

      {!admin?.coaches?.length ? (
        <div className='text-sm text-slate-500'>{t('expand.noCoaches')}</div>
      ) : (
        <div className='space-y-2'>
          {admin.coaches.map(c => (
            <div key={c.id} className='rounded-md bg-white border border-slate-200 p-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <UserCircle className='w-4 h-4 text-indigo-600' />
                  <div>
                    <div className='text-sm font-medium'>{c.name}</div>
                    <div className='text-xs text-slate-500'>{c.email}</div>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Badge color='emerald'>{t('expand.clientsCount', { n: c.clientsCount ?? (c.clients?.length || 0) })}</Badge>
                  <button onClick={() => toggleCoach(c.id)} className='inline-flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900'>
                    {openCoachIds[c.id] ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
                    <span>{openCoachIds[c.id] ? t('expand.hideClients') : t('expand.showClients')}</span>
                  </button>
                </div>
              </div>

              {openCoachIds[c.id] && (
                <div className='mt-2 rounded-md border border-slate-200'>
                  {/* clients table */}
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-100 text-slate-700'>
                      <tr>
                        <th className='py-2 px-3 text-left'>{t('table.clientName')}</th>
                        <th className='py-2 px-3 text-left'>{t('table.clientEmail')}</th>
                        <th className='py-2 px-3 text-left'>{t('table.joinDate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(c.clients || []).map(cl => (
                        <tr key={cl.id} className='border-t border-slate-100'>
                          <td className='py-2 px-3'>{cl.name}</td>
                          <td className='py-2 px-3'>{cl.email}</td>
                          <td className='py-2 px-3'>{cl.joinDate ? new Date(cl.joinDate).toISOString().slice(0, 10) : '—'}</td>
                        </tr>
                      ))}
                      {!c.clients?.length && (
                        <tr><td className='py-2 px-3 text-slate-500' colSpan={3}>{t('expand.noClients')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================= main page ======================= */
export default function SuperAdminAdminsPage() {
  const t = useTranslations('superAdmin');

  const [searchText, setSearchText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    const tmo = setTimeout(() => setDebounced(searchText.trim()), 350);
    return () => clearTimeout(tmo);
  }, [searchText]);

  const fetchAdmins = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = { page, limit };
      if (debounced) params.search = debounced;
      const r = await api.get('/auth/super-admin/admins', { params });
      const data = r?.data || {};
      const list = data.records || data.admins || data.items || [];
      const mapped = list.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone || '',
        status: a.status || 'active',
        coachesCount: a.coachesCount ?? a.coaches?.length ?? 0,
        clientsCount: a.clientsCount ?? 0, // total clients under all coaches (if backend returns)
        createdAt: a.created_at || a.createdAt,
        coaches: a.coaches || null, // might be null → we fetch on expand
        _detailsLoaded: Boolean(a.coaches && Array.isArray(a.coaches))
      }));
      setRows(mapped);
      setTotal(data.total || mapped.length);
    } catch (e) {
      setErr(e?.response?.data?.message || t('alerts.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, [page, debounced]); // eslint-disable-line

  const loadAdminDetails = async (adminId) => {
    try {
      const r = await api.get(`/auth/super-admin/admins/${adminId}`); // returns { id, coaches: [{id,name,email,clients:[...]}], ... }
      const full = r?.data || {};
      setRows(prev => prev.map(x => x.id === adminId ? { ...x, ...full, _detailsLoaded: true } : x));
    } catch {
      // optional error is silent here
    }
  };

  const setStatusApi = async (admin, to) => {
    try {
      await api.put(`/auth/super-admin/admins/${admin.id}/status`, { status: to });
      Notification(t('alerts.statusUpdated', { status: toTitle(to) }), 'success');
      fetchAdmins();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.updateFailed'), 'error');
    }
  };

  const deleteAdmin = async (admin) => {
    if (!confirm(t('dialogs.deleteConfirm', { name: admin.name }))) return;
    try {
      await api.delete(`/auth/super-admin/admins/${admin.id}`);
      Notification(t('alerts.deleted'), 'success');
      fetchAdmins();
    } catch (e) {
      Notification(e?.response?.data?.message || t('alerts.deleteFailed'), 'error');
    }
  };

  const I = (Icon, cls = '') => <Icon className={`h-4 w-4 ${cls}`} />;

  const columns = [
    {
      header: t('table.admin'),
      accessor: 'name',
      cell: r => (
        <div className='flex items-center gap-2'>
          <Shield className='w-4 h-4 text-indigo-600' />
          <div className='flex flex-col'>
            <span className='font-medium'>{r.name}</span>
            <span className='text-xs text-slate-500'>{r.email}</span>
          </div>
        </div>
      ),
    },
    { header: t('table.phone'), accessor: 'phone' },
    { header: t('table.status'), accessor: 'status', cell: r => <StatusPill value={r.status} /> },
    {
      header: t('table.coaches'),
      accessor: 'coachesCount',
      cell: r => <Badge color='blue'>{t('badges.coaches', { n: r.coachesCount || 0 })}</Badge>
    },
    {
      header: t('table.clients'),
      accessor: 'clientsCount',
      cell: r => <Badge color='emerald'>{t('badges.clients', { n: r.clientsCount || 0 })}</Badge>
    },
    {
      header: t('table.createdAt'),
      accessor: 'createdAt',
      className: 'text-nowrap',
      cell: r => r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '—'
    },
    {
      header: t('table.actions'),
      accessor: '_actions',
      cell: r => {
        const items = [
          { icon: I(Eye, 'text-slate-600'), label: t('actions.viewExpand'), onClick: () => setExpandedRowId(id => id === r.id ? null : r.id) },
          { icon: I(PencilLine, 'text-indigo-600'), label: t('actions.edit'), onClick: () => Notification(t('hints.editComingSoon'), 'info') },
        ];
        if (r.status === 'active') {
          items.push({ icon: I(PauseCircle, 'text-amber-600'), label: t('actions.suspend'), onClick: () => setStatusApi(r, 'suspended') });
        } else {
          items.push({ icon: I(PlayCircle, 'text-emerald-600'), label: t('actions.activate'), onClick: () => setStatusApi(r, 'active') });
        }
        items.push({ icon: I(Trash2, 'text-rose-600'), label: t('actions.delete'), onClick: () => deleteAdmin(r), className: 'text-rose-600' });
        return <ActionsMenu options={items} align='right' />;
      }
    }
  ];

  const dataWithExpand = useMemo(() => rows, [rows]);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur'>
        <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
        <div className='relative p-6 sm:p-8 text-white'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h1 className='text-2xl md:text-4xl font-semibold'>{t('header.title')}</h1>
              <p className='text-white/85 mt-1'>{t('header.subtitle')}</p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className='group relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white border border-white/20 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30 transition-transform active:scale-[.98]'
            >
              <Plus size={16} />
              <span>{t('header.createAdmin')}</span>
            </button>
          </div>

          {/* quick stats */}
          <div className='mt-6 grid grid-cols-2 md:grid-cols-4 gap-3'>
            <Stat label={t('stats.totalAdmins')} value={total} />
            <Stat label={t('stats.totalCoaches')} value={rows.reduce((a, b) => a + (b.coachesCount || 0), 0)} />
            <Stat label={t('stats.totalClients')} value={rows.reduce((a, b) => a + (b.clientsCount || 0), 0)} />
            <Stat label={t('stats.activeAdmins')} value={rows.filter(r => r.status === 'active').length} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className='flex items-center gap-2 flex-wrap'>
        <div className='relative w-full md:w-72'>
          <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
          <input
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setPage(1); }}
            placeholder={t('placeholders.search')}
            className='h-[40px] w-full pl-10 pr-3 rounded-lg bg-white text-black border border-slate-300 font-medium text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition'
          />
        </div>
      </div>

      {/* Table with expand rows */}
      {err && <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div>}
      <div className='overflow-hidden rounded-lg border border-slate-200 bg-white'>
        <DataTable
          columns={columns}
          data={dataWithExpand}
          loading={loading}
          itemsPerPage={limit}
          pagination
          selectable={false}
          serverPagination
          page={page}
          onPageChange={setPage}
          totalRows={total}
          rowRenderer={(row) => (
            <div className='w-full'>
              {/* default row handled by DataTable */}
              {expandedRowId === row.id && (
                <div className='p-3 border-t border-slate-200'>
                  <AdminExpandPanel
                    admin={rows.find(r => r.id === row.id) || row}
                    loadDetails={loadAdminDetails}
                  />
                </div>
              )}
            </div>
          )}
        />
      </div>

      {/* Create Modal */}
      <CreateAdminModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => fetchAdmins()}
      />
    </div>
  );
}

/* small stat card */
function Stat({ label, value }) {
  return (
    <div className='rounded-lg bg-white/95 text-slate-800 border border-white/70 shadow-sm px-4 py-3'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='text-xl font-semibold mt-1'>{value ?? 0}</div>
    </div>
  );
}
