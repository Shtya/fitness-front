/* 

	- show his active plan here and get it with the id and show button to edit
	- 
*/

'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, Plus, Users as UsersIcon, CheckCircle2, XCircle, RefreshCcw, Trash2, Mail, Shield, Dumbbell, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Eye, Clock, Search } from 'lucide-react';
import DataTable from '@/components/dashboard/ui/DataTable';
import api from '@/utils/axios';
import { Link } from '@/i18n/navigation';
import { Modal, PageHeader, StatCard } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';
import Select from '@/components/atoms/Select';

/* ---------- helpers ---------- */
const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };
const toTitle = s => (s ? s.toString().charAt(0).toUpperCase() + s.toString().slice(1).toLowerCase() : s);
const normRole = r => {
  const t = String(r || '').toUpperCase();
  if (['ADMIN', 'TRAINER', 'CLIENT'].includes(t)) return toTitle(t);
  if (['admin', 'trainer', 'client'].includes(String(r))) return toTitle(r);
  return 'Client';
};
const normStatus = s => {
  const t = String(s || '').toUpperCase();
  if (['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'].includes(t)) return toTitle(t);
  if (['active', 'inactive', 'pending', 'suspended'].includes(String(s))) return toTitle(s);
  return 'Inactive';
};

function Badge({ children, color = 'slate' }) {
  const map = {
    green: 'bg-green-100 text-green-700 ring-green-600/10',
    red: 'bg-red-100 text-red-700 ring-red-600/10',
    blue: 'bg-blue-100 text-blue-700 ring-blue-600/10',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/10',
    slate: 'bg-slate-100 text-slate-700 ring-slate-600/10',
    amber: 'bg-amber-100 text-amber-800 ring-amber-600/10',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color] || map.slate}`}>{children}</span>;
}
function StatusPill({ status }) {
  const s = normStatus(status);
  const ok = s === 'Active';
  const warn = s === 'Pending';
  return (
    <Badge color={ok ? 'green' : warn ? 'amber' : 'red'}>
      {ok ? <CheckCircle2 className='w-3 h-3' /> : <XCircle className='w-3 h-3' />} {s}
    </Badge>
  );
}
function RolePill({ role }) {
  const r = normRole(role);
  const color = r === 'Admin' ? 'indigo' : r === 'Trainer' ? 'blue' : 'slate';
  return (
    <Badge color={color}>
      <Shield className='w-3 h-3' /> {r}
    </Badge>
  );
}

function ToolbarButton({ icon: Icon, children, onClick, variant = 'primary' }) {
  const styles = variant === 'primary' ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:opacity-95' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200';
  return (
    <button onClick={onClick} className={` cursor-pointer hover:scale-[.95] duration-300 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${styles}`}>
      <Icon className='w-4 h-4' /> {children}
    </button>
  );
}

/* ---------- main ---------- */
export default function UsersList() {
  // server params
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('created_at'); // valid: created_at, name, email, role, status
  const [sortOrder, setSortOrder] = useState('DESC'); // 'ASC' | 'DESC'

  const [role, setRole] = useState(null);
  const [status, setStatus] = useState(null);

  // ui state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // search with debounce (server-side)
  const [searchText, setSearchText] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchText.trim()), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  // client-side filters
  const [roleFilter, setRoleFilter] = useState('All'); // All | Admin | Trainer | Client
  const [statusFilter, setStatusFilter] = useState('All'); // All | Active | Inactive | Pending | Suspended
  const [hasPlanFilter, setHasPlanFilter] = useState('All'); // All | With plan | No plan

  // selection
  const [selected, setSelected] = useState([]);

  // modal
  const [addOpen, setAddOpen] = useState(false);

  // fetch
  async function fetchUsers() {
    setLoading(true);
    setErr(null);
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (debounced) params.search = debounced;

      const res = await api.get('/auth/users', { params });

      // normalize two shapes:
      // A) CRUD.findAll → { total_records, current_page, per_page, records }
      // B) Alt sample   → { users, total, page, totalPages }
      const data = res.data || {};
      let records = [];
      let totalRecords = 0;
      let currentPage = page;
      let pagesCount = 1;

      if (Array.isArray(data.records)) {
        records = data.records;
        totalRecords = Number(data.total_records || 0);
        currentPage = Number(data.current_page || page);
        pagesCount = Math.max(1, Math.ceil(totalRecords / Number(data.per_page || limit)));
      } else if (Array.isArray(data.users)) {
        records = data.users;
        totalRecords = Number(data.total || data.users.length || 0);
        currentPage = Number(data.page || page);
        pagesCount = Number(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        // very defensive
        records = data;
        totalRecords = data.length;
        currentPage = page;
        pagesCount = Math.max(1, Math.ceil(totalRecords / limit));
      }

      // map for UI
      const mapped = records.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: normRole(u.role),
        status: normStatus(u.status),
        phone: u.phone || '',
        membership: u.membership || '-',
        joinDate: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : u.joinDate || '',
        points: u.points ?? 0,
        activePlanId: u.activePlanId ?? null,
      }));

      setRows(mapped);
      setTotal(totalRecords);
      setTotalPages(pagesCount);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, sortOrder, debounced]);

  // client filters
  const filtered = useMemo(() => {
    return rows
      .filter(r => (roleFilter === 'All' ? true : r.role === roleFilter))
      .filter(r => (statusFilter === 'All' ? true : r.status === statusFilter))
      .filter(r => (hasPlanFilter === 'All' ? true : hasPlanFilter === 'With plan' ? !!r.activePlanId : !r.activePlanId));
  }, [rows, roleFilter, statusFilter, hasPlanFilter]);

  // KPIs
  const kpiTotal = filtered.length;
  const kpiActive = filtered.filter(u => u.status === 'Active').length;

  // columns
  const columns = [
    { header: 'Name', accessor: 'name', className: 'text-nowrap' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role', cell: row => <RolePill role={row.role} /> },
    { header: 'Status', accessor: 'status', cell: row => <StatusPill status={row.status} /> },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Membership', accessor: 'membership' },
    { header: 'Join Date', accessor: 'joinDate', className: 'text-nowrap' },
    {
      header: 'Actions',
      accessor: '_actions',
      disableSort: true,
      cell: row => (
        <div className='flex items-center gap-1'>
          <Link href={'/dashboard/users/' + row?.id} className='w-[30px] h-[30px] justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1.5'>
            <Eye size={16} />
          </Link>

          <Link href={'/dashboard/users/edit/' + row?.id} className='w-[30px] h-[30px] justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1.5'>
            <Pencil size={16} />
          </Link>

          {/* <button
            onClick={async () => {
              if (!confirm('Delete this user?')) return;
              try {
                await api.delete(`/auth/user/${row.id}`);
                setRows(arr => arr.filter(x => x.id !== row.id));
              } catch (e) {
                alert(e?.response?.data?.message || 'Delete failed');
              }
            }}
            className='w-[30px] h-[30px] justify-center rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 inline-flex items-center gap-1.5'>
            <Trash2  size={16} />
          </button> */}
        </div>
      ),
    },
  ];

  // add user
  const addUser = async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      phone: form.get('phone') || undefined,
      membership: form.get('membership') || undefined,
      role: String(form.get('role') || '').toUpperCase() || undefined, // ADMIN/TRAINER/CLIENT (backend may ignore if dto disallows)
      status: String(form.get('status') || '').toUpperCase() || undefined, // ACTIVE/INACTIVE/PENDING (backend may ignore)
    };
    try {
      await api.post('/auth/register', payload);
      setAddOpen(false);
      // reload first page to include the new user
      setPage(1);
      fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || 'Create failed');
    }
  };

  // sort handlers (propagate to server)
  const toggleSort = field => {
    if (sortBy === field) {
      setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const ROLE_OPTIONS = [
    { id: 'All', name: 'All roles' },
    { id: 'Admin', name: 'Admin' },
    { id: 'Trainer', name: 'Trainer' },
    { id: 'Client', name: 'Client' },
  ];

  const STATUS_OPTIONS = [
    { id: 'All', name: 'All statuses' },
    { id: 'Active', name: 'Active' },
    { id: 'Inactive', name: 'Inactive' },
    { id: 'Pending', name: 'Pending' },
    { id: 'Suspended', name: 'Suspended' },
  ];

  const PLAN_OPTIONS = [
    { id: 'All', name: 'All plans' },
    { id: 'With plan', name: 'With plan' },
    { id: 'No plan', name: 'No plan' },
  ];
  const toSelectOptions = arr => arr.map(o => ({ id: o.id, label: o.name }));

  return (
    <div className='space-y-6'>
      <div className='rounded-xl   md:rounded-2xl overflow-hidden border border-indigo-200'>
        <div className='relative p-4 md:p-8  bg-gradient text-white'>
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
          <div className='relative z-10 flex flex-row md:items-center gap-3 md:gap-6 justify-between'>
            {/* Title */}
            <PageHeader className=' ' icon={Dumbbell} title='User Management' subtitle='Manage clients, trainers and admins with full control.' />
            <ToolbarButton icon={Plus} onClick={() => setAddOpen(true)}>
              Add User
            </ToolbarButton>
          </div>

          {/* KPIs */}
          <div className='flex items-center justify-start gap-3 mt-6 '>
            <StatCard className={'max-w-[200px] w-full '} icon={UsersIcon} title='Total Users ' value={kpiTotal} />
            <StatCard className={'max-w-[200px] w-full '} icon={CheckCircle2} title='Active' value={kpiActive} />
            <StatCard className={'max-w-[200px] w-full '} icon={Shield} title='Admins' value={1} />
            <StatCard className={'max-w-[200px] w-full '} icon={Shield} title='Admins' value={1} />
          </div>
        </div>
      </div>

      {/* Filters + search */}
      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='flex-1'>
          <div className='relative w-full md:w-60  '>
            <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder='Search name, email, phone...'
              className={` h-[40px] w-full pl-10 pr-3 rounded-xl bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition `}
            />
          </div>
        </div>

        <Select
          label=''
          className='!max-w-[150px] !w-full '
          placeholder='Role'
          options={toSelectOptions(ROLE_OPTIONS)}
          value={roleFilter}
          onChange={id => {
            // receives the selected id
            setRoleFilter(id);
            setPage(1);
          }}
        />

        <Select
          label=''
          className='!max-w-[150px] !w-full'
          placeholder='Status'
          options={toSelectOptions(STATUS_OPTIONS)}
          value={statusFilter}
          onChange={id => {
            setStatusFilter(id);
            setPage(1);
          }}
        />

        <Select
          label=''
          className='!max-w-[150px] !w-full'
          placeholder='Plan'
          options={toSelectOptions(PLAN_OPTIONS)}
          value={hasPlanFilter}
          onChange={id => {
            setHasPlanFilter(id);
            setPage(1);
          }}
        />

        <button onClick={() => toggleSort('created_at')} className={` bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-xl  text-black border border-slate-300   font-medium text-sm backdrop-blur-md hover:from-indigo-500/90 hover:to-sky-400/90 active:scale-[.97] transition `}>
          <Clock size={16} />
          <span>Newest</span>
          {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black transition-transform' /> : <ChevronDown className='w-4 h-4 text-black transition-transform' /> : null}
        </button>
      </div>

      {/* Table */}
      <div className='space-y-4'>
        {err ? <div className='p-3 rounded-xl bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

        <div className='card-glow overflow-hidden'>
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            itemsPerPage={limit}
            pagination
            selectable
            selectedIds={selected}
            onToggleRow={id => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))}
            onToggleAll={ids => setSelected(prev => (prev.length === ids.length ? [] : ids))}
            onRowClick={row => console.log('row clicked', row)}
            initialSort={{ key: sortBy === 'created_at' ? 'joinDate' : sortBy, dir: sortOrder.toLowerCase() }} // just to align initial arrow in your table, actual sort is server-driven
          />
        </div>
      </div>

      {/* Add User Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Add New User'>
        <form onSubmit={addUser} className='space-y-3'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className='text-sm text-slate-600'>Full Name</label>
              <input name='name' required className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
            </div>
            <div>
              <label className='text-sm text-slate-600'>Email</label>
              <input type='email' name='email' required className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
            </div>
            <div>
              <label className='text-sm text-slate-600'>Password</label>
              <input type='password' name='password' required className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
            </div>
            <div>
              <label className='text-sm text-slate-600'>Phone</label>
              <input name='phone' className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
            </div>

            <div>
              <Select
                label='Role'
                placeholder='Select role'
                options={['Client', 'Trainer', 'Admin'].map(r => ({
                  id: r,
                  label: r,
                }))}
                value={role}
                onChange={id => setRole(id)}
              />
            </div>

            <div>
              <Select
                label='Status'
                placeholder='Select status'
                options={['Pending', 'Active', 'Inactive'].map(s => ({
                  id: s,
                  label: s,
                }))}
                value={status}
                onChange={id => setStatus(id)}
              />
            </div>

            <div>
              <label className='text-sm text-slate-600'>Membership</label>
              <input name='membership' placeholder='Basic / Gold / Platinum…' className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
            </div>
          </div>
          <div className='flex items-center justify-end gap-2 pt-2'>
            <button type='button' onClick={() => setAddOpen(false)} className='px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50'>
              Cancel
            </button>
            <button type='submit' className='px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'>
              Save
            </button>
          </div>
          <p className='text-xs text-slate-500 pt-2'>
            Note: If your <code>RegisterDto</code> doesn’t allow <code>role</code>/<code>status</code>, backend will ignore them—no problem.
          </p>
        </form>
      </Modal>
    </div>
  );
}
