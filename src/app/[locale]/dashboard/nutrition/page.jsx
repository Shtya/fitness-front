/**
 * Foods page with category filtering (like workouts page)
 * - Fetches /foods/categories for unique categories
 * - Adds TabsPill to filter list
 * - Sends ?category= in GET /foods
 * - Form supports choosing an existing category or typing a new one
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Apple, Plus, LayoutGrid, Rows, Eye, Pencil, Trash2, Layers, RefreshCcw, Clock, ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, Upload, Beef, Drumstick, Carrot, Tag } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, PageHeader, TabsPill } from '@/components/dashboard/ui/UI';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { Notification } from '@/config/Notification';
import Select from '@/components/atoms/Select';

const useDebounced = (value, delay = 350) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
};

function ConfirmDialog({ open, onClose, loading, title = 'Are you sure?', message = '', onConfirm, confirmText = 'Confirm' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxW='max-w-md'>
      <div className='space-y-4'>
        {message ? <p className='text-sm text-slate-600'>{message}</p> : null}
        <div className='flex items-center justify-end gap-2'>
          <Button
            name={confirmText}
            loading={loading}
            color='danger'
            className='!w-fit'
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export default function FoodsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounced(searchText, 350);

  const [view, setView] = useState('list');
  const [preview, setPreview] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // NEW: categories
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');

  const reqId = useRef(0);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/foods/categories');
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(list);
    } catch {
      // ignore softly
      setCategories([]);
    }
  };

  const fetchList = async () => {
    setErr(null);
    setLoading(true);
    const myId = ++reqId.current;
    try {
      const params = { page, limit: perPage, sortBy, sortOrder };
      if (debounced) params.search = debounced;
      if (activeCategory && activeCategory !== 'all') params.category = activeCategory;

      const res = await api.get('/foods', { params });
      const data = res.data || {};

      let records = [];
      let totalRecords = 0;
      let serverPerPage = perPage;

      if (Array.isArray(data.records)) {
        records = data.records;
        totalRecords = Number(data.total_records || data.records.length || 0);
        serverPerPage = Number(data.per_page || perPage);
      } else if (Array.isArray(data)) {
        records = data;
        totalRecords = data.length;
      }

      if (myId !== reqId.current) return;
      setTotal(totalRecords);
      setPerPage(serverPerPage);
      setItems(records);
    } catch (e) {
      if (myId !== reqId.current) return;
      setErr(e?.response?.data?.message || 'Failed to load foods');
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const params = {};
      if (debounced) params.search = debounced;
      if (activeCategory && activeCategory !== 'all') params.category = activeCategory;
      const res = await api.get('/foods/stats', { params });
      setStats(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  };

  // initial categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // reset to page 1 on filters/sort changes
  useEffect(() => {
    setPage(1);
  }, [debounced, sortBy, sortOrder, perPage, activeCategory]);

  useEffect(() => {
    fetchList();
    fetchStats();
  }, [page, debounced, sortBy, sortOrder, perPage, activeCategory]);

  const toggleSort = field => {
    if (sortBy === field) {
      setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const askDelete = id => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const [deleteLoading, setDeleteLoading] = useState(false);
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/foods/${deleteId}`);
      setItems(arr => arr.filter(x => x.id !== deleteId));
      setTotal(t => Math.max(0, t - 1));
      Notification('Food deleted', 'success');
    } catch (e) {
      Notification(e?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  };

  const createOrUpdate = async ({ id, payload }) => {
    const body = {
      name: payload.name,
      category: payload.category || null, // NEW
      calories: payload.calories || 0,
      protein: payload.protein || 0,
      carbs: payload.carbs || 0,
      fat: payload.fat || 0,
      unit: payload.unit || 'g',
    };

    const url = id ? `/foods/${id}` : '/foods';
    const method = id ? 'put' : 'post';
    const res = await api[method](url, body);
    return res.data;
  };

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  // Tabs for categories (All + fetched)
  const tabs = [{ key: 'all', label: 'All' }, ...categories.map(c => ({ key: c, label: c }))];

  return (
    <div className='space-y-6'>
      {/* Header / KPIs */}
      <div className='rounded-lg md:rounded-lg overflow-hidden border border-blue-200'>
        <div className='relative p-4 md:p-8 bg-gradient to-blue-500 text-white'>
          <div className='relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:gap-6 md:justify-between'>
            <PageHeader title='Foods Database' subtitle='Manage your nutrition food library.' />
            <div className='flex items-center gap-2'>
              <Button name='Add Food' icon={<Plus className='w-4 h-4' />} onClick={() => setAddOpen(true)} />
            </div>
          </div>

          <div className='grid grid-cols-4 gap-2 items-center justify-start mt-6'>
            {loadingStats ? (
              <KpiSkeleton />
            ) : (
              <>
                <StatCard className='' icon={Layers} title='Total Foods' value={stats?.totals?.total || 0} />
                <StatCard className='' icon={Drumstick} title='Avg Protein' value={`${stats?.totals?.avgProtein || 0}g`} />
                <StatCard className='' icon={Beef} title='Avg Calories' value={stats?.totals?.avgCalories || 0} />
                <StatCard className='' icon={RefreshCcw} title='Added 7d' value={stats?.totals?.created7d || 0} sub={`${stats?.totals?.created30d || 0} added 30d`} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='flex items-center gap-2 mt-12 flex-wrap'>
        <div className='flex-1 flex items-center gap-2'>
          <div className='relative w-full md:w-60'>
            <Search className='absolute left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='Search food name...' className='h-[40px] w-full pl-10 pr-3 rounded-lg bg-white text-black border border-slate-300 font-medium text-sm shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 hover:border-blue-400 transition' />
          </div>

          <Button
            name={
              <span className='inline-flex items-center gap-2'>
                {view === 'grid' ? <Rows size={16} /> : <LayoutGrid size={16} />}
                {view === 'grid' ? 'List' : 'Grid'}
              </span>
            }
            color='outline'
            className='!w-fit !h-[40px] !bg-white rounded-lg'
            onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))}
          />
        </div>

        <Select
          label=''
          className='!max-w-[150px] !w-full'
          placeholder='Per page'
          options={[
            { id: 8, label: 8 },
            { id: 12, label: 12 },
            { id: 20, label: 20 },
            { id: 30, label: 30 },
          ]}
          value={perPage}
          onChange={n => setPerPage(Number(n))}
        />

        <button onClick={() => toggleSort('created_at')} className='bg-white inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-lg text-black border border-slate-300 font-medium text-sm backdrop-blur-md active:scale-[.97] transition'>
          <Clock size={16} />
          <span>Newest</span>
          {sortBy === 'created_at' ? sortOrder === 'ASC' ? <ChevronUp className='w-4 h-4 text-black' /> : <ChevronDown className='w-4 h-4 text-black' /> : null}
        </button>
      </div>

      {/* Category Tabs (like workouts) */}
      <div className='mt-3'>
        <TabsPill tabs={tabs} active={activeCategory} onChange={setActiveCategory} className='bg-white/70' id='foods-category-tabs' />
      </div>

      {/* Errors */}
      {err ? <div className='p-3 rounded-lg bg-red-50 text-red-700 border border-red-100'>{err}</div> : null}

      {/* Content */}
      {view === 'grid' ? <GridView loading={loading} items={items} onView={setPreview} onEdit={setEditRow} onDelete={askDelete} /> : <ListView loading={loading} items={items} onView={setPreview} onEdit={setEditRow} onDelete={askDelete} />}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Food Details'} maxW='max-w-md'>
        {preview && <FoodPreview food={preview} />}
      </Modal>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title='Add Food'>
        <FoodForm
          categories={categories}
          onSubmit={async payload => {
            try {
              const saved = await createOrUpdate({ payload });
              setItems(arr => [saved, ...arr]);
              setTotal(t => t + 1);
              setAddOpen(false);
              Notification('Food created', 'success');
              // refresh categories if a new one was added
              if (payload.category && !categories.includes(payload.category)) fetchCategories();
            } catch (e) {
              Notification(e?.response?.data?.message || 'Create failed', 'error');
            }
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit: ${editRow?.name || ''}`}>
        {editRow && (
          <FoodForm
            categories={categories}
            initial={editRow}
            onSubmit={async payload => {
              try {
                const saved = await createOrUpdate({ id: editRow.id, payload });
                setItems(arr => arr.map(e => (e.id === editRow.id ? saved : e)));
                setEditRow(null);
                Notification('Food updated', 'success');
                if (payload.category && !categories.includes(payload.category)) fetchCategories();
              } catch (e) {
                Notification(e?.response?.data?.message || 'Update failed', 'error');
              }
            }}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        loading={deleteLoading}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteId(null);
        }}
        title='Delete food?'
        message='This action cannot be undone.'
        confirmText='Delete'
        onConfirm={handleDelete}
      />
    </div>
  );
}

function GridView({ loading, items, onView, onEdit, onDelete }) {
  const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='card-glow p-4'>
            <div className='aspect-video rounded-lg shimmer mb-3' />
            <div className='h-4 rounded shimmer w-2/3 mb-2' />
            <div className='h-3 rounded shimmer w-1/2' />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className='card-glow p-10 text-center'>
        <div className='mx-auto w-14 h-14 rounded-lg bg-slate-100 grid place-content-center'>
          <Apple className='w-7 h-7 text-slate-500' />
        </div>
        <h3 className='mt-4 text-lg font-semibold'>No foods found</h3>
        <p className='text-sm text-slate-600 mt-1'>Try a different search query or add a new food.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
      {items.map(food => (
        <motion.div key={food.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className='card-glow overflow-hidden p-0 group'>
          <div className='relative aspect-video bg-blue-50 grid place-content-center'>
            <Apple className='w-12 h-12 text-blue-400' />
            {/* quick actions */}
            <div className='absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition'>
              <button title='Show' onClick={() => onView(food)} className='w-9 h-9 grid place-content-center rounded-lg backdrop-blur bg-white/85 hover:bg-white shadow border border-white/60'>
                <Eye className='w-4 h-4' />
              </button>
              <button title='Edit' onClick={() => onEdit(food)} className='w-9 h-9 grid place-content-center rounded-lg backdrop-blur bg-white/85 hover:bg-white shadow border border-white/60'>
                <Pencil className='w-4 h-4' />
              </button>
              <button title='Delete' onClick={() => onDelete(food.id)} className='w-9 h-9 grid place-content-center rounded-lg backdrop-blur bg-white/85 hover:bg-white shadow border border-red-200 text-red-600'>
                <Trash2 className='w-4 h-4' />
              </button>
            </div>
          </div>

          <div className='p-4'>
            <div className='font-semibold flex items-center gap-2'>
              {food.name}
              {food.category ? (
                <span className='ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200'>
                  <Tag className='w-3 h-3' />
                  {food.category}
                </span>
              ) : null}
            </div>
            <div className='text-xs text-slate-500 mt-1'>
              <div>Calories: {food.calories} kcal</div>
              <div>
                Protein: {food.protein}g · Carbs: {food.carbs}g · Fat: {food.fat}g
              </div>
              <div>Per 100{food.unit}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ListView({ loading, items, onView, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className='card-glow divide-y divide-transparent'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='p-4 flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3 w-full'>
              <div className='w-16 h-10 rounded-lg shimmer' />
              <div className='flex-1'>
                <div className='h-4 shimmer w-40 mb-2 rounded' />
                <div className='h-3 shimmer w-24 rounded' />
              </div>
            </div>
            <div className='w-28 h-6 shimmer rounded' />
          </div>
        ))}
      </div>
    );
  }
  if (!items.length) return <div className='card-glow p-6 text-slate-500'>No foods found.</div>;

  return (
    <div className='card-glow divide-y divide-slate-100'>
      {items.map(food => (
        <div key={food.id} className='p-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-lg bg-blue-100 grid place-content-center'>
              <Apple className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <div className='font-medium flex items-center gap-2'>
                {food.name}
                {food.category ? (
                  <span className='inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200'>
                    <Tag className='w-3 h-3' />
                    {food.category}
                  </span>
                ) : null}
              </div>
              <div className='text-xs text-slate-500'>
                {food.calories} kcal · P: {food.protein}g · C: {food.carbs}g · F: {food.fat}g
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <IconButton title='View' onClick={() => onView(food)}>
              <Eye className='w-4 h-4' />
            </IconButton>
            <IconButton title='Edit' onClick={() => onEdit(food)}>
              <Pencil className='w-4 h-4' />
            </IconButton>
            <IconButton title='Delete' onClick={() => onDelete(food.id)} danger>
              <Trash2 className='w-4 h-4' />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function FoodPreview({ food }) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <div className='w-12 h-12 rounded-lg bg-blue-100 grid place-content-center'>
          <Apple className='w-6 h-6 text-blue-600' />
        </div>
        <div>
          <div className='text-lg font-semibold'>{food.name}</div>
          <div className='text-sm text-slate-600'>Nutrition per 100{food.unit}</div>
          {food.category ? <div className='text-xs text-blue-700 mt-1'>Category: {food.category}</div> : null}
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='text-center p-3 rounded-lg bg-blue-50'>
          <div className='text-2xl font-bold text-blue-600'>{food.calories}</div>
          <div className='text-xs text-blue-700'>Calories</div>
        </div>
        <div className='text-center p-3 rounded-lg bg-blue-50'>
          <div className='text-2xl font-bold text-blue-600'>{food.protein}g</div>
          <div className='text-xs text-blue-700'>Protein</div>
        </div>
        <div className='text-center p-3 rounded-lg bg-yellow-50'>
          <div className='text-2xl font-bold text-yellow-600'>{food.carbs}g</div>
          <div className='text-xs text-yellow-700'>Carbs</div>
        </div>
        <div className='text-center p-3 rounded-lg bg-red-50'>
          <div className='text-2xl font-bold text-red-600'>{food.fat}g</div>
          <div className='text-xs text-red-700'>Fat</div>
        </div>
      </div>

      <div className='text-xs text-slate-500'>Created: {food.created_at ? new Date(food.created_at).toLocaleDateString() : '—'}</div>
    </div>
  );
}

function FoodForm({ initial, onSubmit, categories = [] }) {
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState(initial?.category || ''); // NEW
  const [calories, setCalories] = useState(initial?.calories || 0);
  const [protein, setProtein] = useState(initial?.protein || 0);
  const [carbs, setCarbs] = useState(initial?.carbs || 0);
  const [fat, setFat] = useState(initial?.fat || 0);
  const [unit, setUnit] = useState(initial?.unit || 'g');

  useEffect(() => {
    setName(initial?.name || '');
    setCategory(initial?.category || '');
    setCalories(initial?.calories || 0);
    setProtein(initial?.protein || 0);
    setCarbs(initial?.carbs || 0);
    setFat(initial?.fat || 0);
    setUnit(initial?.unit || 'g');
  }, [initial]);

  // List of options (dedup + include current)
  const categoryOptions = useMemo(() => {
    const set = new Set(categories.filter(Boolean));
    if (category && !set.has(category)) set.add(category);
    return Array.from(set);
  }, [categories, category]);

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const payload = {
          name,
          category: category?.trim() || null, // NEW
          calories: calories,
          protein: protein,
          carbs: carbs,
          fat: fat,
          unit,
        };
        onSubmit?.(payload);
      }}
      className='space-y-4'>
      <Input label='Food Name' name='name' value={name} onChange={v => setName(v)} required />

      {/* Category choose (existing or type new) */}
      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label className='text-sm text-slate-600'>Category</label>
          <div className='flex gap-2'>
            <select value={category} onChange={e => setCategory(e.target.value)} className='w-full h-[40px] rounded-lg border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-500/30'>
              <option value=''>— None —</option>
              {categoryOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className='text-[11px] text-slate-500 mt-1'>Pick an existing category or type a new one.</div>
        </div>

        <div>
          <label className='text-sm text-slate-600'>Or type new category</label>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder='e.g., protein, fruit, dairy' className='w-full h-[40px] rounded-lg border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-500/30' />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <Input label='Calories' name='calories' type='number' min={0} value={String(calories)} onChange={v => setCalories(Number(v || 0))} />

        <div>
          <label className='text-sm text-slate-600'>Unit</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className='w-full h-[40px] rounded-lg border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-500/30'>
            <option value='g'>g (grams)</option>
            <option value='ml'>ml (milliliters)</option>
            <option value='piece'>Piece</option>
            <option value='cup'>Cup</option>
          </select>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-3'>
        <Input label='Protein (g)' name='protein' type='number' min={0} step={0.1} value={String(protein)} onChange={v => setProtein(Number(v || 0))} />
        <Input label='Carbs (g)' name='carbs' type='number' min={0} step={0.1} value={String(carbs)} onChange={v => setCarbs(Number(v || 0))} />
        <Input label='Fat (g)' name='fat' type='number' min={0} step={0.1} value={String(fat)} onChange={v => setFat(Number(v || 0))} />
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button name='Save' />
      </div>
    </form>
  );
}

function BulkAddFoods({ onSubmit }) {
  const [text, setText] = useState(`[
  {
    "name": "Chicken Breast",
    "category": "protein",
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6,
    "unit": "g"
  },
  {
    "name": "Brown Rice",
    "category": "carb",
    "calories": 111,
    "protein": 2.6,
    "carbs": 23,
    "fat": 0.9,
    "unit": "g"
  }
]`);
  const [fileErr, setFileErr] = useState('');
  const [items, setItems] = useState([]);

  const parseCSV = csv => {
    const lines = csv.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(s => s.trim());
    const idx = key => headers.indexOf(key);
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim());
      const item = {
        name: cols[idx('name')],
        category: cols[idx('category')] || null,
        calories: cols[idx('calories')] ?? 0,
        protein: cols[idx('protein')] ?? 0,
        carbs: cols[idx('carbs')] ?? 0,
        fat: cols[idx('fat')] ?? 0,
        unit: cols[idx('unit')] || 'g',
      };
      if (item.name) out.push(item);
    }
    return out;
  };

  const handlePreview = () => {
    setFileErr('');
    try {
      let parsed = [];
      const trimmed = text.trim();
      if (!trimmed) {
        setItems([]);
        return;
      }
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const raw = JSON.parse(trimmed);
        const arr = Array.isArray(raw) ? raw : [raw];
        parsed = arr
          .map(i => ({
            name: i.name,
            category: i.category ?? null,
            calories: i.calories ?? 0,
            protein: i.protein ?? 0,
            carbs: i.carbs ?? 0,
            fat: i.fat ?? 0,
            unit: i.unit || 'g',
          }))
          .filter(i => i.name);
      } else {
        parsed = parseCSV(trimmed);
      }
      setItems(parsed);
    } catch (e) {
      setFileErr(e.message || 'Failed to parse input');
      setItems([]);
    }
  };

  const handleFile = f => {
    setFileErr('');
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.onerror = () => setFileErr('Failed to read file');
    reader.readAsText(f);
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-sm text-slate-600'>
          Paste <b>JSON</b> array or <b>CSV</b> with headers
        </div>
        <label className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer text-sm'>
          <Upload className='w-4 h-4' />
          <span className='text-nowrap'>Import file</span>
          <input type='file' accept='.json,.csv,.txt' className='hidden' onChange={e => handleFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={10} className='bg-white w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-500/30' />

      <div className='flex items-center gap-2'>
        <Button name='Preview' className='!w-fit hover:!bg-gray-50' color='neutral' onClick={handlePreview} />
        <div className='text-xs text-slate-500 ml-auto'>{items.length ? `${items.length} item(s) ready` : ''}</div>
      </div>

      {fileErr ? <div className='p-2 rounded bg-red-50 text-red-600 text-sm border border-red-100'>{fileErr}</div> : null}

      {!!items.length && (
        <>
          <div className='overflow-auto border border-slate-2 00 rounded-lg'>
            <table className='min-w-full text-sm'>
              <thead className='bg-slate-50'>
                <tr>
                  {['name', 'category', 'calories', 'protein', 'carbs', 'fat', 'unit'].map(h => (
                    <th key={h} className='text-left px-3 py-2 font-semibold text-slate-700 capitalize'>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='bg-white'>
                {items.map((it, i) => (
                  <tr key={i} className='border-t border-slate-100'>
                    <td className='px-3 py-2'>{it.name}</td>
                    <td className='px-3 py-2'>{it.category || '—'}</td>
                    <td className='px-3 py-2'>{it.calories}</td>
                    <td className='px-3 py-2'>{it.protein}g</td>
                    <td className='px-3 py-2'>{it.carbs}g</td>
                    <td className='px-3 py-2'>{it.fat}g</td>
                    <td className='px-3 py-2'>{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='flex items-center justify-end gap-2'>
            <Button name='Submit' icon={<Plus size={20} />} className='!w-fit !ml-auto' onClick={() => onSubmit(items)} />
          </div>
        </>
      )}
    </div>
  );
}

const IconButton = ({ title, onClick, children, danger = false }) => (
  <button title={title} onClick={onClick} className={`w-[34px] h-[34px] inline-flex items-center justify-center rounded-lg border transition ${danger ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    {children}
  </button>
);

function KpiSkeleton() {
  return (
    <div className='grid grid-cols-4 gap-2 w-full col-span-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='card-glow p-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-lg shimmer' />
            <div className='flex-1'>
              <div className='h-3 shimmer w-24 rounded mb-2' />
              <div className='h-4 shimmer w-16 rounded' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const maxButtons = 7;
  const pages = useMemo(() => {
    const arr = [];
    const start = Math.max(1, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    for (let i = Math.max(1, end - maxButtons + 1); i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  const go = p => onChange(Math.max(1, Math.min(totalPages, p)));

  if (totalPages <= 1) return null;
  return (
    <div className='flex items-center justify-center gap-2 pt-2'>
      <Button icon={<ChevronLeft />} className='bg-main !w-[40px] !h-[40px]' onClick={() => go(page - 1)} disabled={page <= 1} />
      {pages.map(p => (
        <button key={p} onClick={() => go(p)} className={`w-[40px] h-[40px] flex items-center justify-center rounded-lg border ${p === page ? 'bg-main text-white' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}>
          {p}
        </button>
      ))}
      <Button icon={<ChevronRight />} className='bg-main !w-[40px] !h-[40px]' onClick={() => go(page + 1)} disabled={page >= totalPages} />
    </div>
  );
}
