
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { UtensilsCrossed, User as UserIcon, Dumbbell, Utensils, Scale, Ruler, Camera, Image as ImageIcon, Upload, ArrowUpRight, Clock, ChevronsLeft, ChevronsRight, Sparkles, Phone, Mail, Pencil, X, ShieldCheck, Activity, ImagePlus, Trash2, Edit3, Save, RotateCcw } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import InputDate from '@/components/atoms/InputDate';
import Input from '@/components/atoms/Input';
import { useTranslations } from 'next-intl';
import Select from '@/components/atoms/Select';
import Img from '@/components/atoms/Img';

/* ============================ Helpers ============================ */
const card = 'rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm p-4 md:p-5';
const sectionTitle = 'text-base md:text-lg font-semibold text-slate-900';
const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28 } };

const toISODate = d => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const daysLeft = end => {
  if (!end) return null;
  const endDt = new Date(end + 'T23:59:59');
  const diff = Math.ceil((endDt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

function SparkBar({ value = 0 }) {
  return (
    <div className='h-2 w-full overflow-hidden rounded-full bg-slate-100'>
      <div className='h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500/90 to-blue-600 transition-[width] duration-500' style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ============================ Skeletons ============================ */
const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent';
const skeletonBase = 'bg-slate-200/40 rounded-md';
const ShimmerStyle = () => <style>{`@keyframes shimmer{100%{transform:translateX(100%);}}`}</style>;

function HeaderSkeleton() {
  return (
    <div className='rounded-2xl border border-slate-200 overflow-hidden shadow-sm'>
      <div className={`bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white p-6 md:p-8`}>
        <div className='flex flex-wrap items-center gap-4'>
          <div className={`${skeletonBase} ${shimmer} h-14 w-14 rounded-2xl`} />
          <div className='min-w-0 flex-1'>
            <div className={`${skeletonBase} ${shimmer} h-6 w-40`} />
            <div className='mt-2 flex gap-3'>
              <div className={`${skeletonBase} ${shimmer} h-4 w-48`} />
              <div className={`${skeletonBase} ${shimmer} h-4 w-32`} />
            </div>
          </div>
          <div className='ml-auto flex gap-2'>
            <div className={`${skeletonBase} ${shimmer} h-7 w-24 rounded-full`} />
            <div className={`${skeletonBase} ${shimmer} h-7 w-24 rounded-full`} />
            <div className={`${skeletonBase} ${shimmer} h-7 w-24 rounded-full`} />
          </div>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-5'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${skeletonBase} ${shimmer} h-16 w-full rounded-xl`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardSkeletonGrid({ rows = 4 }) {
  return (
    <div className='grid grid-cols-2 gap-2'>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className='rounded-xl border border-slate-200 p-3'>
          <div className='flex items-center justify-between'>
            <div className={`${skeletonBase} ${shimmer} h-3 w-16`} />
            <div className={`${skeletonBase} ${shimmer} h-4 w-10`} />
          </div>
          <div className='mt-2'>
            <div className={`${skeletonBase} ${shimmer} h-2 w-full rounded-full`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr>
            {[...Array(6)].map((_, i) => (
              <th key={i} className='text-right font-normal pb-2'>
                <div className={`${skeletonBase} ${shimmer} h-3 w-20 ml-auto`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className='border-t border-slate-100'>
              {[...Array(6)].map((_, c) => (
                <td key={c} className='py-2'>
                  <div className={`${skeletonBase} ${shimmer} h-3 w-16 ml-auto`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================ Compare widget ============================ */
function BeforeAfter({ before, after, name }) {
  const [pos, setPos] = useState(50);
  return (
    <div dir='ltr' className='relative aspect-[4/3] w-full rounded-xl overflow-hidden select-none bg-slate-200 border border-slate-200'>
      {before ? <Img src={before} alt={`${name} before`} className='absolute inset-0 w-full h-full object-cover' /> : <div className='absolute inset-0 bg-slate-300' />}
      <div className='absolute inset-0' style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {after ? <Img src={after} alt={`${name} after`} className='w-full h-full object-cover' /> : <div className='w-full h-full bg-slate-400' />}
      </div>
      <div className='absolute inset-y-0' style={{ left: `${pos}%` }}>
        <div className='h-full w-[2px] bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]' />
        <div className='absolute -top-4 -translate-x-1/2 left-0 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full'>Slide</div>
      </div>
      <input type='range' value={pos} min={0} max={100} onChange={e => setPos(Number(e.target.value))} className='absolute inset-0 opacity-0 cursor-ew-resize' aria-label='Compare before and after' />
    </div>
  );
}

/* ============================ Local Button ============================ */
function Btn({ children, onClick, disabled, className = '', size = 'md', variant = 'primary', type = 'button' }) {
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-base' };
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400/40 border border-indigo-600',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300/40 border border-slate-200',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400/40 border border-emerald-600',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-400/40 border border-rose-600',
    subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-300/40 border border-slate-200',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={['inline-flex items-center justify-center rounded-xl shadow-sm transition focus:outline-none focus:ring-4 disabled:opacity-60', sizes[size], variants[variant], className].join(' ')}>
      {children}
    </button>
  );
}

/* ============================ API helpers (Profile Module endpoints) ============================ */
// Users (fallback stays as your previous logic for demo/local)
async function fetchMe() {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch {
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch {
      return {
        id: '633c7739-31bb-4b41-bf1d-dd994d557694',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        name: 'ahmed083@gmail.com',
        email: 'ahmed083@gmail.com',
        phone: '+201551495772',
        membership: 'Basic',
        role: 'client',
        status: 'active',
        gender: 'male',
        coachId: 'aa8069ac-f8c6-4dde-ab8a-1c80baae9cc2',
        lastLogin: new Date().toISOString(),
        points: 12,
        defaultRestSeconds: 90,
        subscriptionStart: '2025-10-16',
        subscriptionEnd: '2026-04-15',
        activeExercisePlanId: '47309f5a-2424-472f-9e53-3637134f42f3',
        activeMealPlanId: 'f98d2c07-88a8-49c2-ae8f-2fd077cf77d8',
      };
    }
  }
}
async function fetchPlanName(type, id) {
  if (!id) return null;
  const url = type === 'exercise' ? `/plans/${id}` : `/nutrition/meal-plans/${id}`;
  try {
    const { data } = await api.get(url);
    return data?.name || null;
  } catch {
    return null;
  }
}
async function fetchCoach(id) {
  if (!id) return null;
  try {
    const { data } = await api.get(`/auth/profile/${id}`);
    return data;
  } catch {
    return null;
  }
}
async function updateUser(userId, payload) {
  const { data } = await api.put(`/auth/${userId}`, payload);
  return data;
}

// Profile STATS
async function getProfileStats() {
  const { data } = await api.get('/profile/stats');
  return data; // expect: includes measurements count, photos count, maybe recent info
}

// Measurements
async function getMeasurements(days = 120) {
  const { data } = await api.get(`/profile/measurements`, { params: { days } });
  return Array.isArray(data) ? data : [];
}
async function getLatestMeasurement() {
  const { data } = await api.get(`/profile/measurements/latest`);
  return data;
}
async function getMeasurementStats() {
  const { data } = await api.get(`/profile/measurements/stats`);
  return data;
}
async function postMeasurement(payload) {
  const { data } = await api.post(`/profile/measurements`, payload);
  return data;
}
async function putMeasurement(id, payload) {
  const { data } = await api.put(`/profile/measurements/${id}`, payload);
  return data;
}
async function deleteMeasurement(id) {
  const { data } = await api.delete(`/profile/measurements/${id}`);
  return data;
}

// Photos
async function getPhotosTimeline(months = 12) {
  const { data } = await api.get(`/profile/photos/timeline`, { params: { months } });
  return Array.isArray(data.records) ? data.records : [];
}
async function getPhotoSet(photoId) {
  const { data } = await api.get(`/profile/photos/${photoId}`);
  return data;
}
async function deletePhotoSet(photoId) {
  const { data } = await api.delete(`/profile/photos/${photoId}`);
  return data;
}
async function createPhotoSetApi(payload) {
  // payload: { takenAt, weight, note, sides:{front/back/left/right URLs} }
  const { data } = await api.post(`/profile/photos`, payload);
  return data;
}

// Bulk (optional if you implement)
async function bulkMeasurements(list) {
  const { data } = await api.post(`/profile/measurements/bulk`, list);
  return data;
}
async function bulkPhotos(list) {
  const { data } = await api.post(`/profile/photos/bulk`, list);
  return data;
}

// Asset upload (kept from your previous code)
async function uploadAsset(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category', 'progress_photo');
  try {
    const { data } = await api.post('/asset', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  } catch {
    const { data } = await api.post('/asset/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  }
}

/* ============================ Crop helpers ============================ */
function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}
async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const maxSide = Math.max(pixelCrop.width, pixelCrop.height);
  canvas.width = maxSide;
  canvas.height = maxSide;

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvas.width, canvas.height);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
  });
}
function blobToFile(blob, filename) {
  return new File([blob], filename, { type: blob.type });
}

/* ============================ Component ============================ */
export default function ProfileOverviewPage() {
  const t = useTranslations('myProfile');
  const [tab, setTab] = useState('overview');

  // Data
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null); // profile/stats
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Measurements
  const [measurements, setMeasurements] = useState([]);
  const [latestM, setLatestM] = useState(null);
  const [mStats, setMStats] = useState(null);

  // Photos
  const [photoMonths, setPhotoMonths] = useState([]);

  // UI state
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [compareAllOpen, setCompareAllOpen] = useState(false);
  const [compareAllIndex, setCompareAllIndex] = useState(0);
  const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState(null);
  const [confirmDeleteMeasurementId, setConfirmDeleteMeasurementId] = useState(null);
  const scrollerRef = useRef(null);

  // Add measurement form (default date today, time-less)
  const [mDate, setMDate] = useState(new Date());
  const [mWeight, setMWeight] = useState('');
  const [mWaist, setMWaist] = useState('');
  const [mChest, setMChest] = useState('');
  const [mHips, setMHips] = useState('');
  const [savingMeasure, setSavingMeasure] = useState(false);

  // Inline edit for measurement
  const [editRowId, setEditRowId] = useState(null);
  const [editRow, setEditRow] = useState({ date: '', weight: '', waist: '', chest: '', hips: '' });
  const [savingEditRow, setSavingEditRow] = useState(false);

  // Photo upload form (with crop)
  const [pFront, setPFront] = useState(null);
  const [pBack, setPBack] = useState(null);
  const [pLeft, setPLeft] = useState(null);
  const [pRight, setPRight] = useState(null);
  const [pWeight, setPWeight] = useState('');
  const [pNote, setPNote] = useState('');
  const [pDate, setPDate] = useState(new Date());
  const [savingPhotos, setSavingPhotos] = useState(false);

  // Compare state
  const [compare, setCompare] = useState({ side: 'front', beforeId: null, afterId: null });

  // Crop modal state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropSide, setCropSide] = useState(null);
  const [cropAreaPixels, setCropAreaPixels] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const sideOptions = useMemo(
    () => [
      { id: 'all', label: t('sides.all') },
      { id: 'front', label: t('sides.front') },
      { id: 'back', label: t('sides.back') },
      { id: 'left', label: t('sides.left') },
      { id: 'right', label: t('sides.right') },
    ],
    [t],
  );

  const photoSetOptions = useMemo(
    () =>
      (photoMonths || []).map(p => ({
        id: String(p.id),
        label: `${p.takenAt} (${p.weight ?? '-'} kg)`,
      })),
    [photoMonths],
  );

  const allSides = ['front', 'back', 'left', 'right'];

  // Load initial
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const me = await fetchMe();
        const computedName = me?.name && me.name.includes('@') ? me.email?.split('@')[0] : me?.name;
        const [exName, mpName, coach] = await Promise.all([fetchPlanName('exercise', me?.activeExercisePlanId), fetchPlanName('meal', me?.activeMealPlanId), fetchCoach(me?.coachId)]);

        setUser({
          ...me,
          name: computedName || me?.email || 'User',
          activeExercisePlan: exName ? { name: exName } : null,
          activeMealPlan: mpName ? { name: mpName } : null,
          coach: coach ? { id: coach.id, name: coach.name || coach.email || coach.id } : me?.coach || null,
        });

        // Profile module endpoints
        const [statsRes, listRes, latestRes, statMRes, timelineRes] = await Promise.allSettled([getProfileStats(), getMeasurements(120), getLatestMeasurement(), getMeasurementStats(), getPhotosTimeline(12)]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value || null);
        if (listRes.status === 'fulfilled') {
          const arr = (listRes.value || []).map(m => ({
            id: m.id, // assume backend returns id
            date: m.date?.slice(0, 10) ?? m.date,
            weight: m.weight,
            waist: m.waist,
            chest: m.chest,
            hips: m.hips,
          }));
          setMeasurements(arr);
        } else setMeasurements([]);

        if (latestRes.status === 'fulfilled') setLatestM(latestRes.value || null);
        if (statMRes.status === 'fulfilled') setMStats(statMRes.value || null);

        if (timelineRes.status === 'fulfilled') setPhotoMonths(Array.isArray(timelineRes.value) ? timelineRes.value : []);
        else setPhotoMonths([]);
      } catch (e) {
        setError(t('errors.loadProfile'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const lastWeight = useMemo(() => {
    if (latestM?.weight != null) return latestM.weight;
    if (!measurements.length) return '-';
    return measurements[measurements.length - 1]?.weight ?? '-';
  }, [measurements, latestM]);

  const weightDelta = useMemo(() => {
    if (!measurements.length) return '0.0';
    const first = measurements[0]?.weight ?? 0;
    const last = measurements[measurements.length - 1]?.weight ?? 0;
    return (last - first).toFixed(1);
  }, [measurements]);

  const tabs = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'body', label: t('tabs.body') },
    { key: 'photos', label: t('tabs.photos') },
  ];

  /* ============================ Actions: Measurements ============================ */
  async function addMeasurement() {
    if (!mDate) return;
    setSavingMeasure(true);
    try {
      const payload = {
        date: toISODate(mDate),
        weight: mWeight ? Number(mWeight) : undefined,
        waist: mWaist ? Number(mWaist) : undefined,
        chest: mChest ? Number(mChest) : undefined,
        hips: mHips ? Number(mHips) : undefined,
      };
      const created = await postMeasurement(payload);
      const row = {
        id: created?.id || `local-${Date.now()}`,
        date: payload.date,
        weight: payload.weight,
        waist: payload.waist,
        chest: payload.chest,
        hips: payload.hips,
      };
      setMeasurements(prev => [...prev, row]);
      setLatestM(prev => (!prev || row.date >= (prev.date || '') ? row : prev));
      setMWeight('');
      setMWaist('');
      setMChest('');
      setMHips('');
    } finally {
      setSavingMeasure(false);
    }
  }

  function startEditRow(m) {
    setEditRowId(m.id);
    setEditRow({
      date: m.date || toISODate(new Date()),
      weight: m.weight ?? '',
      waist: m.waist ?? '',
      chest: m.chest ?? '',
      hips: m.hips ?? '',
    });
  }
  async function saveEditRow() {
    if (!editRowId) return;
    setSavingEditRow(true);
    try {
      const payload = {
        date: editRow.date,
        weight: editRow.weight !== '' ? Number(editRow.weight) : undefined,
        waist: editRow.waist !== '' ? Number(editRow.waist) : undefined,
        chest: editRow.chest !== '' ? Number(editRow.chest) : undefined,
        hips: editRow.hips !== '' ? Number(editRow.hips) : undefined,
      };
      await putMeasurement(editRowId, payload);
      setMeasurements(prev => prev.map(m => (m.id === editRowId ? { ...m, ...payload } : m)));
      setEditRowId(null);
    } finally {
      setSavingEditRow(false);
    }
  }
  function cancelEditRow() {
    setEditRowId(null);
  }
  async function confirmDeleteMeasurement() {
    if (!confirmDeleteMeasurementId) return;
    const id = confirmDeleteMeasurementId;
    setConfirmDeleteMeasurementId(null);
    await deleteMeasurement(id);
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }

  /* ============================ Actions: Photos ============================ */
  function onPickSideFile(side, file) {
    if (!file) return;
    const src = URL.createObjectURL(file);
    setCropSide(side); // 'front' | 'back' | 'left' | 'right'
    setCropImageSrc(src);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCropOpen(true);
  }

  async function applyCrop() {
    if (!cropImageSrc || !cropAreaPixels || !cropSide) return;
    const blob = await getCroppedImg(cropImageSrc, cropAreaPixels);
    const croppedFile = blobToFile(blob, `${cropSide}-${Date.now()}.jpg`);
    if (cropSide === 'front') setPFront(croppedFile);
    if (cropSide === 'back') setPBack(croppedFile);
    if (cropSide === 'left') setPLeft(croppedFile);
    if (cropSide === 'right') setPRight(croppedFile);
    setCropOpen(false);
    URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
    setCropSide(null);
  }

  const savePhotoSet = async () => {
    if (!pFront && !pBack && !pLeft && !pRight) return;
    setSavingPhotos(true);
    try {
      const formData = new FormData();

      // Add files with their side names
      if (pFront) formData.append('front', pFront);
      if (pBack) formData.append('back', pBack);
      if (pLeft) formData.append('left', pLeft);
      if (pRight) formData.append('right', pRight);

      // Add JSON data
      const takenAt = `${toISODate(pDate)}`;
      const photoData = {
        takenAt,
        weight: pWeight ? Number(pWeight) : null,
        note: pNote || '',
      };
      formData.append('data', JSON.stringify(photoData));

      // Upload using FormData
      const { data: newPhoto } = await api.post('/profile/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newEntry = {
        id: newPhoto.id,
        month: new Date(newPhoto.takenAt).toLocaleString('default', { month: 'short', year: 'numeric' }),
        weight: newPhoto.weight,
        note: newPhoto.note,
        sides: newPhoto.sides,
        createdAt: newPhoto.created_at,
      };

      setPhotoMonths(prev => {
        const existingMonthIndex = prev.findIndex(entry => entry.takenAt === newEntry.month);

        if (existingMonthIndex !== -1) {
          const updated = [...prev];
          updated[existingMonthIndex] = newEntry;
          return updated;
        } else {
          // Add new month entry at the beginning
          return [newEntry, ...prev];
        }
      });

      setPFront(null);
      setPBack(null);
      setPLeft(null);
      setPRight(null);
      setPWeight('');
      setPNote('');
      setUploadOpen(false);
    } finally {
      setSavingPhotos(false);
    }
  };

  async function removePhotoSet(photoId) {
    setConfirmDeletePhotoId(photoId);
  }
  async function confirmDeletePhotoSet() {
    const id = confirmDeletePhotoId;
    setConfirmDeletePhotoId(null);
    if (!id) return;
    await deletePhotoSet(id);
    setPhotoMonths(prev => prev.filter(p => p.id !== id));
  }

  const findPhotoById = id => photoMonths.find(p => p.id === id);
  const leftSrc = () => (compare.beforeId ? findPhotoById(compare.beforeId)?.sides?.[compare.side] : '');
  const rightSrc = () => (compare.afterId ? findPhotoById(compare.afterId)?.sides?.[compare.side] : '');

  const openAllCompare = () => {
    if (!compare.beforeId || !compare.afterId) return;
    setCompareAllIndex(0);
    setCompareAllOpen(true);
  };

  /* ============================ Render ============================ */
  if (loading) {
    return (
      <div className=' '>
        <ShimmerStyle />
        <HeaderSkeleton />
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mt-6'>
          <div className={card}>
            <div className='flex items-center gap-2 mb-3'>
              <div className={`${skeletonBase} ${shimmer} h-4 w-20`} />
            </div>
            <CardSkeletonGrid rows={6} />
          </div>
          <div className={card}>
            <div className='flex items-center gap-2 mb-3'>
              <div className={`${skeletonBase} ${shimmer} h-4 w-24`} />
            </div>
            <TableSkeleton rows={6} />
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return <div className='p-6 text-rose-600'>{error}</div>;
  }

  const leftDaysVal = daysLeft(user?.subscriptionEnd);
  const subBadgeColor = leftDaysVal == null ? 'bg-white/10 ring-1 ring-white/25' : leftDaysVal <= 0 ? 'bg-rose-500/20 ring-1 ring-rose-300 text-white' : leftDaysVal <= 30 ? 'bg-amber-400/20 ring-1 ring-amber-300 text-white' : 'bg-white/10 ring-1 ring-white/25';

  return (
    <div className='space-y-6'>
      <ShimmerStyle />

      {/* Header */}
      <div className='rounded-2xl border border-slate-200 overflow-hidden shadow-sm'>
        <div className='bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white'>
          <div className='p-6 md:p-8'>
            <div className='flex flex-wrap justify-between items-center gap-4'>
              <div className='flex items-center gap-2'>
                <div className='h-14 w-14 rounded-2xl bg-white/15 grid place-items-center ring-1 ring-white/20'>
                  <UserIcon className='h-7 w-7 text-white' />
                </div>
                <div className='min-w-0'>
                  <div className='text-xl md:text-2xl font-semibold truncate'>{user?.name}</div>
                  <div className='text-white/90 text-sm flex items-center gap-3 flex-wrap'>
                    <span className='inline-flex items-center gap-1'>
                      <Mail size={14} />
                      {user?.email}
                    </span>
                  </div>
                </div>
              </div>

              <Btn variant='primary' className='!ml-auto md:!ml-0' onClick={() => setEditOpen(true)}>
                <Pencil size={14} className='mr-1' />
                {t('actions.edit')}
              </Btn>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-5'>
              <StatCard cn='!gap-1 flex-wrap' icon={Dumbbell} title={t('stats.workoutPlan')} value={user?.activeExercisePlan?.name || '-'} />
              <StatCard cn='!gap-1 flex-wrap' icon={Utensils} title={t('stats.mealPlan')} value={user?.activeMealPlan?.name || '-'} />
              <StatCard cn='!gap-1 flex-wrap' icon={Scale} title={t('stats.latestWeight')} value={lastWeight} />
              <StatCard cn='!gap-1 flex-wrap' icon={Activity} title={t('stats.caloriesToday')} value={String(user?.points ?? 0)} subtitle={stats ? `${t('stats.photos')}: ${stats?.photosCount ?? '-'} · ${t('stats.measurements')}: ${stats?.measurementsCount ?? '-'}` : ''} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabsPill sliceInPhone={false} id='profile-tabs' tabs={[...tabs]} active={tab} onChange={setTab} className='!bg-white' />

      <AnimatePresence mode='wait'>
        {/* ============================ OVERVIEW ============================ */}
        {tab === 'overview' && (
          <motion.div key='overview' {...fade} className='grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6'>
            {/* Identity */}
            <ProfileCard user={user} onEdit={() => console.log('edit open')} dir='rtl' />

            {/* Weight summary */}
            <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 0.8 }} className='relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600' />

              <div className='p-4 sm:p-5'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <Scale className='h-4 w-4 text-slate-500' />
                    <div className={sectionTitle}>{t('sections.weightTrend')}</div>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm'>
                    <ArrowUpRight className='h-4 w-4 text-slate-500' />
                    <span className='text-xs text-slate-500'>{t('labels.deltaKg')}</span>
                    <span className='text-sm font-semibold'>{weightDelta}</span>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  {measurements?.map((p, i) => (
                    <div key={(p.id || p.date || '') + i} className='rounded-xl border border-slate-200 p-3'>
                      <div className='flex items-center justify-between text-xs text-slate-600'>
                        <span>{p.date}</span>
                        <span className='font-semibold text-slate-900'>{p.weight ?? '-'}</span>
                      </div>
                      <div className='mt-2'>
                        <SparkBar value={30 + i * 8} />
                      </div>
                    </div>
                  ))}
                  {!measurements.length && <div className='text-sm text-slate-500'>{t('messages.noMeasurements')}</div>}
                </div>
              </div>
            </motion.div>

            {/* Compare */}
            <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 0.8 }} className='xl:col-span-3 relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600' />
              <div className={` p-4 sm:p-5`}>
                <div className='flex items-center gap-2 mb-3'>
                  <ImageIcon className='h-4 w-4 text-slate-500' />
                  <div className={sectionTitle}>{t('sections.compare')}</div>
                </div>

                <div className='grid md:grid-cols-4 gap-3'>
                  <label className='space-y-1.5'>
                    <div className='text-xs font-medium text-slate-600'>{t('labels.side')}</div>
                    <Select options={sideOptions} value={compare.side} onChange={val => setCompare(s => ({ ...s, side: String(val) }))} placeholder={t('placeholders.choose')} clearable={false} />
                  </label>

                  <label className='space-y-1.5'>
                    <div className='text-xs font-medium text-slate-600'>{t('labels.before')}</div>
                    <Select options={photoSetOptions} value={compare.beforeId || ''} onChange={val => setCompare(s => ({ ...s, beforeId: String(val) }))} placeholder={t('placeholders.choose')} clearable searchable />
                  </label>

                  <label className='space-y-1.5'>
                    <div className='text-xs font-medium text-slate-600'>{t('labels.after')}</div>
                    <Select options={photoSetOptions} value={compare.afterId || ''} onChange={val => setCompare(s => ({ ...s, afterId: String(val) }))} placeholder={t('placeholders.choose')} clearable searchable />
                  </label>

                  <div className='flex items-end gap-2'>
                    <Btn
                      variant='primary'
                      className='w-full'
                      disabled={!compare.beforeId || !compare.afterId || compare.side === 'all'}
                      onClick={() =>
                        setPhotoPreview({
                          src: null,
                          label: `${t('labels.beforeAfter')} — ${compare.side}`,
                          before: leftSrc(),
                          after: rightSrc(),
                        })
                      }>
                      {t('actions.preview')}
                    </Btn>
                    <Btn variant='outline' className='w-full' disabled={!compare.beforeId || !compare.afterId || compare.side !== 'all'} onClick={openAllCompare}>
                      {t('actions.previewAll')}
                    </Btn>
                  </div>
                </div>

                <div className='mt-4'>{compare.beforeId && compare.afterId && compare.side !== 'all' ? <BeforeAfter before={leftSrc()} after={rightSrc()} name='progress' /> : <div className='text-sm text-slate-500'>{t('messages.chooseTwoSets')}</div>}</div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ============================ BODY (Measurements CRUD) ============================ */}
        {tab === 'body' && (
          <motion.div key='body' {...fade} className='grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6'>
            <div className={card}>
              <div className='flex items-center gap-2 mb-3'>
                <Ruler className='h-4 w-4 text-slate-500' />
                <div className={sectionTitle}>{t('forms.addMeasurement')}</div>
              </div>

              <div className='mt-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  <InputDate label={t('forms.date')} value={mDate} onChange={d => setMDate(d)} className='sm:col-span-1' />
                  <Input label={t('forms.weightKg')} name='weight' value={mWeight} onChange={setMWeight} />
                  <Input label={t('forms.waistCm')} name='waist' value={mWaist} onChange={setMWaist} />
                  <Input label={t('forms.chestCm')} name='chest' value={mChest} onChange={setMChest} />
                </div>
                <div className='mt-3 flex items-center gap-2'>
                  <Btn variant='success' onClick={addMeasurement} disabled={savingMeasure}>
                    {savingMeasure ? t('actions.saving') : t('actions.save')}
                  </Btn>
                  <Btn
                    variant='subtle'
                    onClick={() => {
                      setMWeight('');
                      setMWaist('');
                      setMChest('');
                      setMHips('');
                    }}>
                    {t('actions.reset')}
                  </Btn>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <Scale className='h-4 w-4 text-slate-500' />
                  <div className={sectionTitle}>{t('sections.measurements')}</div>
                </div>
              </div>
              {measurements.length ? (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead className='text-slate-500'>
                      <tr>
                        <th className='text-right font-normal pb-2'>{t('table.date')}</th>
                        <th className='text-right font-normal pb-2'>{t('table.weight')}</th>
                        <th className='text-right font-normal pb-2'>{t('table.waist')}</th>
                        <th className='text-right font-normal pb-2'>{t('table.chest')}</th>
                        <th className='text-right font-normal pb-2'>{t('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements
                        .slice()
                        .reverse()
                        .map((m, idx) => {
                          const isEditing = editRowId === m.id;
                          return (
                            <tr key={(m.id || m.date || '') + idx} className='border-t border-slate-100'>
                              <td className='py-2'>{isEditing ? <input type='date' className='w-full rounded-md border border-slate-200 px-2 py-1' value={editRow.date} onChange={e => setEditRow(s => ({ ...s, date: e.target.value }))} /> : m.date}</td>
                              <td className='py-2 text-right font-medium'>{isEditing ? <input type='number' className='w-24 rounded-md border border-slate-200 px-2 py-1 text-right' value={editRow.weight} onChange={e => setEditRow(s => ({ ...s, weight: e.target.value }))} /> : m.weight ?? '-'}</td>
                              <td className='py-2 text-right font-medium'>{isEditing ? <input type='number' className='w-24 rounded-md border border-slate-200 px-2 py-1 text-right' value={editRow.waist} onChange={e => setEditRow(s => ({ ...s, waist: e.target.value }))} /> : m.waist ?? '-'}</td>
                              <td className='py-2 text-right font-medium'>{isEditing ? <input type='number' className='w-24 rounded-md border border-slate-200 px-2 py-1 text-right' value={editRow.chest} onChange={e => setEditRow(s => ({ ...s, chest: e.target.value }))} /> : m.chest ?? '-'}</td>
                              <td className='py-2 text-right'>
                                {!isEditing ? (
                                  <div className='flex items-center gap-2 ltr:justify-end rtl:justify-start '>
                                    <button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50' onClick={() => startEditRow(m)} title={t('actions.edit')}>
                                      <Edit3 size={16} />
                                    </button>
                                    <button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50' onClick={() => setConfirmDeleteMeasurementId(m.id)} title={t('actions.delete')}>
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className='flex items-center gap-2 ltr:justify-end rtl:justify-start '>
                                    <button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50' onClick={saveEditRow} disabled={savingEditRow} title={t('actions.save')}>
                                      <Save size={16} />
                                    </button>
                                    <button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50' onClick={cancelEditRow} title={t('actions.cancel')}>
                                      <RotateCcw size={16} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-sm text-slate-500'>{t('messages.noMeasurements')}</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ============================ PHOTOS ============================ */}
        {tab === 'photos' && (
          <motion.div key='photos' {...fade} className='grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6'>
            {/* Upload + Crop tiles */}
            <div className={card}>
              <div className='flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2 '>
                  <Camera className='h-4 w-4 text-slate-500' />
                  <div className={sectionTitle}>{t('sections.uploadBodyPhotos')}</div>
                </div>
                <Btn variant='outline' onClick={() => setTipsOpen(true)}>
                  {t('tips.cta')}
                </Btn>
              </div>

              <div className='grid grid-cols-2 gap-3  mt-4'>
                {[
                  { key: 'front', label: t('sides.front'), file: pFront, setter: setPFront },
                  { key: 'back', label: t('sides.back'), file: pBack, setter: setPBack },
                  { key: 'left', label: t('sides.left'), file: pLeft, setter: setPLeft },
                  { key: 'right', label: t('sides.right'), file: pRight, setter: setPRight },
                ].map(({ key, label, file, setter }) => (
                  <div key={key} className='relative rounded-xl border border-dashed border-slate-300 bg-slate-50 aspect-[4/3] overflow-hidden'>
                    {!file ? (
                      <label className='group absolute inset-0 cursor-pointer grid place-items-center hover:bg-slate-100 transition'>
                        <div className='flex flex-col items-center'>
                          <Upload className='h-6 w-6 text-slate-500' />
                          <div className='mt-2 text-sm font-medium'>{label}</div>
                        </div>
                        <input type='file' accept='image/*' className='hidden' onChange={e => onPickSideFile(key, e.target.files?.[0] || null)} />
                      </label>
                    ) : (
                      <>
                        <img src={URL.createObjectURL(file)} alt={label} className='absolute inset-0 w-full h-full object-cover' />
                        <button type='button' onClick={() => setter(null)} className='absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-full bg-black/60 text-white' aria-label={t('actions.clear')}>
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <Input label={t('forms.weightOptional')} name='pWeight' value={pWeight} onChange={setPWeight} />
                <InputDate label={t('forms.date')} value={pDate} onChange={setPDate} />
              </div>

              <div className='mt-3 flex gap-2'>
                <Btn variant='primary' onClick={savePhotoSet} disabled={savingPhotos || (!pFront && !pBack && !pLeft && !pRight)}>
                  {savingPhotos ? t('actions.saving') : t('actions.saveSet')}
                </Btn>
                <Btn
                  variant='subtle'
                  onClick={() => {
                    setPFront(null);
                    setPBack(null);
                    setPLeft(null);
                    setPRight(null);
                    setPWeight('');
                    setPNote('');
                  }}>
                  {t('actions.clear')}
                </Btn>
              </div>
            </div>

            {/* Timeline */}
            <div className={`xl:col-span-2 ${card}`}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <ImageIcon className='h-4 w-4 text-slate-500' />
                  <div className={sectionTitle}>{t('sections.timeline')}</div>
                </div>
                <div className='flex gap-1'>
                  <Btn variant='subtle' size='sm' onClick={() => scrollerRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}>
                    <ChevronsLeft size={16} className='rtl:scale-x-[-1]' />
                  </Btn>
                  <Btn variant='subtle' size='sm' onClick={() => scrollerRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}>
                    <ChevronsRight size={16} className='rtl:scale-x-[-1]' />
                  </Btn>
                </div>
              </div>

              {photoMonths.length === 0 ? (
                <div className='flex items-center justify-center text-slate-600 bg-slate-50 border border-slate-200 rounded-xl py-12'>
                  <div className='text-center space-y-2'>
                    <div className='mx-auto h-12 w-12 rounded-full bg-white border border-slate-200 grid place-items-center'>
                      <ImagePlus className='h-6 w-6 text-slate-400' />
                    </div>
                    <div className='text-sm font-medium'>{t('messages.noTimeline')}</div>
                    <Btn variant='primary' onClick={() => setUploadOpen(true)} className='mt-1'>
                      {t('actions.addBodyPhotos')}
                    </Btn>
                  </div>
                </div>
              ) : (
                <div ref={scrollerRef} className='flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2'>
                  {photoMonths.map(entry => (
                    <div key={entry.id} className='min-w-[300px] md:min-w-[400px] snap-start rounded-xl border border-slate-200 p-3 bg-white'>
                      <div className='flex items-center justify-between mb-2'>
                        <div>
                          <div className='text-sm font-semibold'>{entry.takenAt}</div>
                          <div className='text-xs text-slate-500'>{entry.note}</div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className='text-sm font-medium'>{entry.weight ?? '-'} kg</div>
                          <button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50' title={t('actions.delete')} onClick={() => removePhotoSet(entry.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className='grid grid-cols-2 gap-2'>
                        {['front', 'back', 'left', 'right'].map(side => (
                          <button key={side} onClick={() => setPhotoPreview({ src: entry.sides?.[side], label: `${entry.takenAt} — ${side}` })} className='overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:shadow-sm transition'>
                            <Img src={entry.sides?.[side]} className=' max-md:h-[120px] h-40 w-full object-cover' alt={side} />
                            <div className='px-2 py-1 text-xs text-slate-600 capitalize'>{t(`sides.${side}`)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload modal (same uploader but modal form) */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={t('modals.addBodySet')} maxW='max-w-3xl'>
        <div className='space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            {[
              { key: 'front', label: t('sides.front'), file: pFront, setter: setPFront },
              { key: 'back', label: t('sides.back'), file: pBack, setter: setPBack },
              { key: 'left', label: t('sides.left'), file: pLeft, setter: setPLeft },
              { key: 'right', label: t('sides.right'), file: pRight, setter: setPRight },
            ].map(({ key, label, file, setter }) => (
              <div key={key} className='relative rounded-xl border border-dashed border-slate-300 bg-slate-50 aspect-[4/3] overflow-hidden'>
                {!file ? (
                  <label className='group absolute inset-0 cursor-pointer grid place-items-center hover:bg-slate-100 transition'>
                    <div className='flex flex-col items-center'>
                      <Upload className='h-6 w-6 text-slate-500' />
                      <div className='mt-2 text-sm font-medium'>{label}</div>
                    </div>
                    <input type='file' accept='image/*' className='hidden' onChange={e => onPickSideFile(key, e.target.files?.[0] || null)} />
                  </label>
                ) : (
                  <>
                    <img src={URL.createObjectURL(file)} alt={label} className='absolute inset-0 w-full h-full object-cover' />
                    <button type='button' onClick={() => setter(null)} className='absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-full bg-black/60 text-white' aria-label={t('actions.clear')}>
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            <Input label={t('forms.weightOptional')} name='pWeight' value={pWeight} onChange={setPWeight} />
            <Input label={t('forms.noteOptional')} name='pNote' value={pNote} onChange={setPNote} />
            <InputDate label={t('forms.date')} value={pDate} onChange={setPDate} />
          </div>
          <div className='flex gap-2'>
            <Btn variant='primary' onClick={savePhotoSet} disabled={savingPhotos || (!pFront && !pBack && !pLeft && !pRight)}>
              {savingPhotos ? t('actions.saving') : t('actions.saveSet')}
            </Btn>
            <Btn variant='outline' onClick={() => setUploadOpen(false)}>
              <X size={14} className='mr-1' />
              {t('actions.cancel')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Photo preview (single side) */}
      <Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} title={photoPreview?.label || t('modals.preview')} maxW='max-w-3xl'>
        {photoPreview?.src ? (
          <div className='rounded-xl overflow-hidden border border-slate-200'>
            <Img src={photoPreview.src} alt={photoPreview.label} className='w-full h-auto object-contain' />
          </div>
        ) : (
          <div className='text-sm text-slate-600'>{t('messages.useCompareBlock')}</div>
        )}
      </Modal>

      {/* Compare ALL sides carousel */}
      <Modal open={compareAllOpen} onClose={() => setCompareAllOpen(false)} title={t('labels.beforeAfter')} maxW='max-w-3xl'>
        <div className='flex items-center justify-between mb-2 text-sm text-slate-600'>
          <span className='font-medium capitalize'>{t(`sides.${allSides[compareAllIndex]}`)}</span>
          <div className='flex gap-2'>
            <Btn variant='subtle' size='sm' onClick={() => setCompareAllIndex(i => (i + 3) % 4)}>
              <ChevronsLeft className='rtl:scale-x-[-1]' size={16} />
            </Btn>
            <Btn variant='subtle' size='sm' onClick={() => setCompareAllIndex(i => (i + 1) % 4)}>
              <ChevronsRight className='rtl:scale-x-[-1]' size={16} />
            </Btn>
          </div>
        </div>
        <BeforeAfter before={compare.beforeId ? findPhotoById(compare.beforeId)?.sides?.[allSides[compareAllIndex]] || '' : ''} after={compare.afterId ? findPhotoById(compare.afterId)?.sides?.[allSides[compareAllIndex]] || '' : ''} name='progress-all' />
        <div className='mt-3 flex justify-center gap-2'>
          {allSides.map((s, i) => (
            <button key={s} onClick={() => setCompareAllIndex(i)} className={['h-2 w-2 rounded-full', i === compareAllIndex ? 'bg-slate-900' : 'bg-slate-300'].join(' ')} aria-label={s} />
          ))}
        </div>
      </Modal>

      {/* Tips Modal */}
      <Modal open={tipsOpen} onClose={() => setTipsOpen(false)} title={t('tips.title')} maxW='max-w-lg'>
        <div className='space-y-2 text-sm text-slate-700'>
          <ul className='list-disc pl-5 space-y-1'>
            <li>{t('tips.lighting')}</li>
            <li>{t('tips.distance')}</li>
            <li>{t('tips.angles')}</li>
            <li>{t('tips.cameraHeight')}</li>
            <li>{t('tips.timer')}</li>
            <li>{t('tips.clothes')}</li>
            <li>{t('tips.background')}</li>
            <li>{t('tips.frequency')}</li>
          </ul>
        </div>
      </Modal>

      {/* Confirm delete Photo Set */}
      <Modal open={!!confirmDeletePhotoId} onClose={() => setConfirmDeletePhotoId(null)} title={t('modals.confirmDelete')} maxW='max-w-md'>
        <div className='text-sm text-slate-700 mb-3'>{t('messages.deletePhotoConfirm')}</div>
        <div className='flex gap-2'>
          <Btn variant='danger' onClick={confirmDeletePhotoSet}>
            {t('actions.delete')}
          </Btn>
          <Btn variant='outline' onClick={() => setConfirmDeletePhotoId(null)}>
            {t('actions.cancel')}
          </Btn>
        </div>
      </Modal>

      {/* Confirm delete Measurement */}
      <Modal open={!!confirmDeleteMeasurementId} onClose={() => setConfirmDeleteMeasurementId(null)} title={t('modals.confirmDelete')} maxW='max-w-md'>
        <div className='text-sm text-slate-700 mb-3'>{t('messages.deleteMeasurementConfirm')}</div>
        <div className='flex gap-2'>
          <Btn variant='danger' onClick={confirmDeleteMeasurement}>
            {t('actions.delete')}
          </Btn>
          <Btn variant='outline' onClick={() => setConfirmDeleteMeasurementId(null)}>
            {t('actions.cancel')}
          </Btn>
        </div>
      </Modal>

      {/* Crop Modal */}
      <Modal open={cropOpen} onClose={() => setCropOpen(false)} title={t('modals.cropTitle')} maxW='max-w-3xl'>
        {cropImageSrc ? (
          <div className='space-y-3'>
            <div className='relative w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden'>
              <Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, areaPixels) => setCropAreaPixels(areaPixels)} cropShape='rect' objectFit='cover' />
            </div>
            <div className='flex items-center gap-3'>
              <label className='text-sm text-slate-600'>{t('actions.zoom')}</label>
              <input type='range' min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} className='w-full' />
            </div>
            <div className='flex gap-2'>
              <Btn variant='primary' onClick={applyCrop}>
                {t('actions.apply')}
              </Btn>
              <Btn variant='outline' onClick={() => setCropOpen(false)}>
                {t('actions.cancel')}
              </Btn>
            </div>
          </div>
        ) : (
          <div className='text-sm text-slate-600'>{t('messages.pickImageFirst')}</div>
        )}
      </Modal>
    </div>
  );
}

function fmt(d) {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  } catch {
    return '-';
  }
}

function ProfileCard({ user = {}, onEdit = () => {}, dir = 'ltr' }) {
  const t = useTranslations('myProfile');
  const leftDaysVal = daysLeft(user?.subscriptionEnd);

  const subBadgeColor = leftDaysVal == null ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' : leftDaysVal <= 0 ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';

  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 0.8 }} className='relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm' dir={dir}>
      <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600' />

      <div className='p-4 sm:p-5'>
        <div className='flex items-start gap-4'>
          <div className='min-w-0 flex-1'>
            {user?.phone && (
              <div className='mt-1 text-sm text-slate-600'>
                {t('profile.phone')}{' '}
                <span className='font-medium' dir='ltr'>
                  {user.phone}
                </span>
              </div>
            )}

            <div className='mt-1 text-sm text-slate-600'>
              {t('profile.coach')} <span className='font-medium'>{user?.coach?.name || user?.coachId || '-'}</span>
            </div>

            {/* badges row (your snippet merged + styled) */}
            <div className='mt-3 ml-auto flex items-center gap-2 flex-wrap'>
              <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 px-3 py-1 text-xs text-white shadow-sm'>
                <Sparkles className='h-4 w-4' />
                <span className='opacity-90'>
                  {user?.membership || '-'} {t('profile.member')}
                </span>
              </span>

              <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200'>
                <ShieldCheck className='h-4 w-4' />
                {String(user?.role || '').toUpperCase() || '-'}
              </span>

              <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200'>
                <Activity className='h-4 w-4' />
                {String(user?.status || '').toUpperCase() || '-'}
              </span>

              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${subBadgeColor.replace('bg-', 'ring-')}`}>
                <Clock className='h-4 w-4' />
                <div className='flex items-center gap-1' dir='ltr'>
                  <span>{fmt(user?.subscriptionStart)}</span>
                  <span>→</span>
                  <span>{fmt(user?.subscriptionEnd)}</span>
                </div>
                {leftDaysVal != null && <span className='ml-1 opacity-90'>{leftDaysVal <= 0 ? 'expired' : `${leftDaysVal}d left`}</span>}
              </span>
            </div>
          </div>
        </div>

        {/* footer actions */}
        <div className='mt-4  '>
          <button onClick={onEdit} className='inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:translate-y-[1px]'>
            {t('actions.editProfile')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
