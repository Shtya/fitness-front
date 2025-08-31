'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, Plus, Users as UsersIcon, Search, Filter, Calendar, CheckCircle2, XCircle, RefreshCcw, Trash2, Mail, Shield, Dumbbell } from 'lucide-react';
import DataTable from '@/components/dashboard/ui/DataTable';

// ------- Helpers -------
const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

const roles = ['Client', 'Trainer', 'Admin'];
const statuses = ['Active', 'Inactive'];

const mockFetchUsers = () =>
  new Promise(res =>
    setTimeout(
      () =>
        res([
          { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Client', status: 'Active', joinDate: '2023-01-15', phone: '+1 555-0101', membership: 'Gold' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Trainer', status: 'Active', joinDate: '2023-02-20', phone: '+1 555-0102', membership: '-' },
          { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Client', status: 'Inactive', joinDate: '2023-03-10', phone: '+1 555-0103', membership: 'Basic' },
          { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Admin', status: 'Active', joinDate: '2023-04-05', phone: '+1 555-0104', membership: '-' },
          { id: 5, name: 'David Brown', email: 'david@example.com', role: 'Client', status: 'Active', joinDate: '2023-05-12', phone: '+1 555-0105', membership: 'Platinum' },
        ]),
      1000,
    ),
  );

// debounce
function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// ------- UI Atoms -------
function StatCard({ icon: Icon, title, value, sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='card-glow p-4'>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white grid place-content-center shadow-md'>
          <Icon className='w-5 h-5' />
        </div>
        <div>
          <div className='text-sm text-slate-600'>{title}</div>
          <div className='text-xl font-semibold'>{value}</div>
          {sub ? <div className='text-xs text-slate-500 mt-0.5'>{sub}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}

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
  const ok = status === 'Active';
  return (
    <Badge color={ok ? 'green' : 'red'}>
      {ok ? <CheckCircle2 className='w-3 h-3' /> : <XCircle className='w-3 h-3' />} {status}
    </Badge>
  );
}

function RolePill({ role }) {
  const color = role === 'Admin' ? 'indigo' : role === 'Trainer' ? 'blue' : 'slate';
  return (
    <Badge color={color}>
      <Shield className='w-3 h-3' /> {role}
    </Badge>
  );
}

function ToolbarButton({ icon: Icon, children, onClick, variant = 'primary' }) {
  const styles = variant === 'primary' ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:opacity-95' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200';
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${styles}`}>
      <Icon className='w-4 h-4' /> {children}
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr className='animate-pulse'>
      <td className='px-4 py-3'>
        <div className='w-4 h-4 bg-slate-200 rounded' />
      </td>
      {[160, 220, 180, 140, 120, 120].map((w, i) => (
        <td key={i} className='px-4 py-3'>
          <div className='h-3 rounded bg-slate-200' style={{ width: w }} />
        </td>
      ))}
      <td className='px-4 py-3'>
        <div className='h-8 w-20 rounded bg-slate-200' />
      </td>
    </tr>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className='text-center py-16'>
      <div className='mx-auto w-14 h-14 rounded-2xl bg-slate-100 grid place-content-center'>
        <UsersIcon className='w-7 h-7 text-slate-500' />
      </div>
      <h3 className='mt-4 text-lg font-semibold'>No users found</h3>
      <p className='text-sm text-slate-600 mt-1'>Try adjusting filters or add a new user to your gym.</p>
      <div className='mt-6'>
        <ToolbarButton icon={Plus} onClick={onAdd}>
          Add User
        </ToolbarButton>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className='fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className='fixed z-50 inset-0 grid place-items-center p-4' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={spring}>
            <div className='w-full max-w-lg card-glow p-5'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-lg font-semibold'>{title}</h3>
                <button onClick={onClose} className='w-9 h-9 rounded-lg border border-slate-200 grid place-content-center bg-white hover:bg-slate-50'>
                  <XCircle className='w-5 h-5 text-slate-600' />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ------- Main -------
export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const q = useDebounced(searchTerm, 350);

  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selected, setSelected] = useState([]);
  const [addOpen, setAddOpen] = useState(false);

	
  const filtered = useMemo(() => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.phone || '').toLowerCase().includes(s) || (u.membership || '').toLowerCase().includes(s));
  }, [users, search]);

  const columns = [
    { header: 'Name', accessor: 'name', sortable: true },
    { header: 'Email', accessor: 'email', sortable: true },
    { header: 'Role', accessor: 'role', cell: row => <RolePill role={row.role} /> },
    { header: 'Status', accessor: 'status', cell: row => <StatusPill status={row.status} /> },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Membership', accessor: 'membership' },
    { header: 'Join Date', accessor: 'joinDate', sortable: true },
    {
      header: 'Actions',
      accessor: '_actions',
      disableSort: true,
      cell: row => (
        <div className='flex items-center gap-2'>
          <button className='px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50'>View</button>
          <button className='px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50'>Edit</button>
          <button onClick={() => setUsers(arr => arr.filter(x => x.id !== row.id))} className='px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600'>
            Delete
          </button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    setLoading(true);
    mockFetchUsers().then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const allChecked = selected.length && selected.length === filtered.length;
  const toggleAll = () => setSelected(prev => (prev.length === filtered.length ? [] : filtered.map(u => u.id)));
  const toggleOne = id => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  // KPIs
  const kpiTotal = users.length;
  const kpiActive = users.filter(u => u.status === 'Active').length;
  const kpiTrainers = users.filter(u => u.role === 'Trainer').length;
  const kpiClients = users.filter(u => u.role === 'Client').length;

  // actions
  const bulkSetStatus = status => {
    setUsers(arr => arr.map(u => (selected.includes(u.id) ? { ...u, status } : u)));
    setSelected([]);
  };
  const bulkDelete = () => {
    setUsers(arr => arr.filter(u => !selected.includes(u.id)));
    setSelected([]);
  };
  const refresh = () => {
    setLoading(true);
    setSelected([]);
    mockFetchUsers().then(data => {
      setUsers(data);
      setLoading(false);
    });
  };

  const exportCSV = () => {
    const rows = [['id', 'name', 'email', 'role', 'status', 'joinDate', 'phone', 'membership']].concat(filtered.map(u => [u.id, u.name, u.email, u.role, u.status, u.joinDate, u.phone || '', u.membership || '']));
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = () => alert('Import CSV not wired in this mock. Hook to your uploader.');

  const addUser = e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newU = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      name: form.get('name'),
      email: form.get('email'),
      role: form.get('role'),
      status: form.get('status'),
      joinDate: form.get('joinDate'),
      phone: form.get('phone'),
      membership: form.get('membership'),
    };
    setUsers(arr => [newU, ...arr]);
    setAddOpen(false);
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setUsers([
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Client', status: 'Active', joinDate: '2023-01-15', phone: '+1 555-0101', membership: 'Gold' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Trainer', status: 'Active', joinDate: '2023-02-20', phone: '+1 555-0102', membership: '-' },
        { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Client', status: 'Inactive', joinDate: '2023-03-10', phone: '+1 555-0103', membership: 'Basic' },
        { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Admin', status: 'Active', joinDate: '2023-04-05', phone: '+1 555-0104', membership: '-' },
        { id: 5, name: 'David Brown', email: 'david@example.com', role: 'Client', status: 'Active', joinDate: '2023-05-12', phone: '+1 555-0105', membership: 'Platinum' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);


  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={spring} className='h-10 w-10 grid place-content-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md'>
            <Dumbbell className='w-5 h-5' />
          </motion.div>
          <div>
            <h1 className='text-2xl font-semibold'>User Management</h1>
            <p className='text-sm text-slate-600'>Manage clients, trainers and admins with full control.</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <ToolbarButton icon={Upload} onClick={importCSV} variant='ghost'>
            Import
          </ToolbarButton>
          <ToolbarButton icon={Download} onClick={exportCSV} variant='ghost'>
            Export
          </ToolbarButton>
          <ToolbarButton icon={Plus} onClick={() => setAddOpen(true)}>
            Add User
          </ToolbarButton>
        </div>
      </div>

      {/* KPIs */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
        <StatCard icon={UsersIcon} title='Total Users' value={kpiTotal} sub={`${kpiClients} Clients · ${kpiTrainers} Trainers`} />
        <StatCard icon={CheckCircle2} title='Active' value={kpiActive} sub={`${((kpiActive / Math.max(1, kpiTotal)) * 100).toFixed(0)}% active`} />
        <StatCard icon={Shield} title='Admins' value={users.filter(u => u.role === 'Admin').length} />
        <StatCard icon={RefreshCcw} title='Churn Risk' value={users.filter(u => u.status === 'Inactive').length} sub='Inactive users' />
      </div>

      {/* Filters Bar */}
 
        {/* Bulk actions */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='mt-3 pt-3 border-t border-slate-200'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge color='blue'>{selected.length} selected</Badge>
                <button onClick={() => bulkSetStatus('Active')} className='px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4' /> Activate
                </button>
                <button onClick={() => bulkSetStatus('Inactive')} className='px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 inline-flex items-center gap-2'>
                  <XCircle className='w-4 h-4' /> Deactivate
                </button>
                <button onClick={bulkDelete} className='px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2'>
                  <Trash2 className='w-4 h-4' /> Delete
                </button>
                <button className='px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-2'>
                  <Mail className='w-4 h-4' /> Send Email
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
 
      {/* Table */}
      <div className='space-y-4'>
        {/* search input */}
        <div className='flex items-center gap-2'>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search users…' className='w-full md:w-72 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
        </div>

        <div className='card-glow overflow-hidden '>
          <DataTable columns={columns} data={filtered} loading={loading} itemsPerPage={5} pagination selectable selectedIds={selected} onToggleRow={id => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))} onToggleAll={ids => setSelected(prev => (prev.length === ids.length ? [] : ids))} onRowClick={row => console.log('row clicked', row)} initialSort={{ key: 'name', dir: 'asc' }} />
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
              <label className='text-sm text-slate-600'>Phone</label>
              <input name='phone' className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30' />
            </div>
            <div>
              <label className='text-sm text-slate-600'>Role</label>
              <select name='role' className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white'>
                {roles.map(r => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className='text-sm text-slate-600'>Status</label>
              <select name='status' className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white'>
                {statuses.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className='text-sm text-slate-600'>Membership</label>
              <input name='membership' placeholder='Basic / Gold / Platinum…' className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white' />
            </div>
            <div>
              <label className='text-sm text-slate-600'>Join Date</label>
              <input type='date' name='joinDate' required className='mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white' />
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
        </form>
      </Modal>
    </div>
  );
}
