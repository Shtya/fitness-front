
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { User as UserIcon, Dumbbell, Utensils, Scale, Ruler, Camera, Image as ImageIcon, Upload, ArrowUpRight, Clock, ChevronsLeft, ChevronsRight, Sparkles, Mail, Pencil, X, ShieldCheck, Activity, ImagePlus, Trash2, Edit3, Save, RotateCcw, Flame, ActivityIcon, Phone, User2, Apple, Plane, Lightbulb } from 'lucide-react';

import api from '@/utils/axios';
import { Modal, StatCard, TabsPill } from '@/components/dashboard/ui/UI';
import InputDate from '@/components/atoms/InputDate';
import Input from '@/components/atoms/Input';
import { useTranslations } from 'next-intl';
import Select from '@/components/atoms/Select';
import Img from '@/components/atoms/Img';
import { FaTasks } from 'react-icons/fa';

const card = 'rounded-lg border border-slate-200 bg-white/90 backdrop-blur shadow-sm p-4 md:p-5';
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

/* === Small utils for shimmer skeletons === */
const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent';
const skeletonBase = 'bg-slate-200/40 rounded-md';
const ShimmerStyle = () => <style>{`@keyframes shimmer{100%{transform:translateX(100%);}}`}</style>;

function HeaderSkeleton() {
	return (
		<div className='rounded-lg border border-slate-200 overflow-hidden shadow-sm'>
			<div className='bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white p-6 md:p-8'>
				<div className='flex flex-wrap items-center gap-4'>
					<div className={`${skeletonBase} ${shimmer} h-14 w-14 rounded-lg`} />
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
			</div>
		</div>
	);
}

function CardSkeletonGrid({ rows = 4 }) {
	return (
		<div className='grid grid-cols-2 gap-2'>
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className='rounded-lg border border-slate-200 p-3'>
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

/* === Before / After comparison === */
function BeforeAfter({ before, after, name }) {
	const [pos, setPos] = useState(50);
	return (
		<div dir='ltr' className='relative aspect-[4/3] w-full rounded-lg overflow-hidden select-none bg-slate-200 border border-slate-200'>
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

/* === Generic button === */
function Btn({ children, onClick, disabled, className = '', size = 'md', variant = 'primary', type = 'button' }) {
	const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-base' };
	const variants = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400/40 border border-indigo-600',
		outline: 'bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300/40 border border-slate-200',
		success: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400/40 border border-indigo-600', // same as primary (no green main)
		danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-400/40 border border-rose-600',
		subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-300/40 border border-slate-200',
	};
	return (
		<button type={type} onClick={onClick} disabled={disabled} className={['inline-flex items-center justify-center rounded-lg shadow-sm transition focus:outline-none focus:ring-4 disabled:opacity-60', sizes[size], variants[variant], className].join(' ')}>
			{children}
		</button>
	);
}

/* === API helpers === */

async function fetchMe() {
	try {
		const { data } = await api.get('/auth/me');
		return data;
	} catch {
		try {
			const { data } = await api.get('/auth/me');
			return data;
		} catch {
			// fallback dummy data (dev only)
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

async function getProfileStats() {
	const { data } = await api.get('/profile/stats');
	return data;
}

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

async function getPhotosTimeline(months = 12) {
	const { data } = await api.get(`/profile/photos/timeline`, { params: { months } });
	return Array.isArray(data.records) ? data.records : [];
}

async function deletePhotoSet(photoId) {
	const { data } = await api.delete(`/profile/photos/${photoId}`);
	return data;
}

async function createPhotoSetApi(payload) {
	const { data } = await api.post(`/profile/photos`, payload);
	return data;
}

async function bulkMeasurements(list) {
	const { data } = await api.post(`/profile/measurements/bulk`, list);
	return data;
}

async function bulkPhotos(list) {
	const { data } = await api.post(`/profile/photos/bulk`, list);
	return data;
}

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

/* === Crop helpers === */
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

/* === Weight Trend Graph (اتجاه الوزن) === */

function WeightTrendChart({ data = [], t }) {
	if (!data.length) {
		return (
			<div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center'>
				<div className='mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200'>
					<Scale className='h-5 w-5 text-slate-400' />
				</div>
				<p className='text-sm font-medium text-slate-600'>{t('messages.noMeasurements')}</p>
				<p className='mt-1 text-xs text-slate-500'>{t('messages.noMeasurementsHint') || t('labels.direction')}</p>
			</div>
		);
	}

	const sorted = [...data].slice().sort((a, b) => new Date(a.date) - new Date(b.date));

	const weights = sorted.map(m => Number(m.weight || 0));
	const minW = Math.min(...weights);
	const maxW = Math.max(...weights);
	const range = maxW - minW || 1;

	const points = sorted.map((m, idx) => {
		const x = sorted.length === 1 ? 50 : (idx / (sorted.length - 1)) * 100;
		const normalized = (Number(m.weight || 0) - minW) / range;
		const y = 68 - normalized * 36; // keep top/bottom padding
		return { x, y };
	});

	const path = points.map(p => `${p.x},${p.y}`).join(' ');

	const first = sorted[0];
	const last = sorted[sorted.length - 1];

	const delta = last.weight != null && first.weight != null ? (last.weight - first.weight).toFixed(1) : '0.0';

	return (
		<div className='space-y-3'>
			{/* Header row inside chart */}
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div className='flex items-center gap-2'>
					<span className='inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 ring-1 ring-indigo-100'>
						<Scale className='h-3.5 w-3.5' />
						<span className='font-medium'>{t('labels.direction')}</span>
					</span>
				</div>

				<div className='flex flex-wrap items-center gap-2 text-[11px]'>
					{/* Start */}
					<div className='inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-700 ring-1 ring-slate-200'>
						<span className='text-[10px] text-slate-500'>{t('labels.start')}</span>
						<span className='font-semibold text-slate-900'>{first.weight ?? '-'}</span>
						<span className='text-[10px] text-slate-400'>kg</span>
					</div>

					{/* End */}
					<div className='inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-700 ring-1 ring-slate-200'>
						<span className='text-[10px] text-slate-500'>{t('labels.end')}</span>
						<span className='font-semibold text-slate-900'>{last.weight ?? '-'}</span>
						<span className='text-[10px] text-slate-400'>kg</span>
					</div>

					{/* Delta */}
					<div className='inline-flex items-center gap-1.5 rounded-full bg-indigo-600/10 px-2.5 py-1 text-indigo-700 ring-1 ring-indigo-200'>
						<ArrowUpRight className='h-3.5 w-3.5' />
						<span className='text-[10px]'>{t('labels.deltaKg')}</span>
						<span className='font-semibold'>{delta}</span>
					</div>
				</div>
			</div>

			{/* Chart */}
			<div className='relative overflow-hidden rounded-xl bg-slate-50/60 ring-1 ring-slate-200'>
				<svg viewBox='0 0 100 80' className='w-full h-40 md:h-48'>
					<defs>
						{/* line gradient */}
						<linearGradient id='weightLine' x1='0' y1='0' x2='1' y2='0'>
							<stop offset='0%' stopColor='#4f46e5' />
							<stop offset='50%' stopColor='#6366f1' />
							<stop offset='100%' stopColor='#3b82f6' />
						</linearGradient>

						{/* fill gradient */}
						<linearGradient id='weightFill' x1='0' y1='0' x2='0' y2='1'>
							<stop offset='0%' stopColor='#4f46e5' stopOpacity='0.20' />
							<stop offset='100%' stopColor='#4f46e5' stopOpacity='0.01' />
						</linearGradient>
					</defs>

					{/* Background */}
					<rect x='0' y='0' width='100' height='80' fill='transparent' />

					{/* Grid lines */}
					{[0, 1, 2, 3].map(i => (
						<line key={i} x1='0' x2='100' y1={22 + i * 14} y2={22 + i * 14} stroke='#cbd5f5' strokeOpacity='0.5' strokeWidth='0.3' />
					))}

					{/* Fill under line */}
					{points.length > 1 && <path d={`M ${points[0].x},${points[0].y} ${path} L ${points[points.length - 1].x},74 L ${points[0].x},74 Z`} fill='url(#weightFill)' />}

					{/* Line */}
					<polyline fill='none' stroke='url(#weightLine)' strokeWidth='1.6' strokeLinejoin='round' strokeLinecap='round' points={path} />

					{/* Dots */}
					{points.map((p, i) => (
						<g key={i}>
							<circle cx={p.x} cy={p.y} r='1.6' fill='#ffffff' stroke='#4f46e5' strokeWidth='0.6' />
						</g>
					))}
				</svg>
			</div>

			{/* Last few points “chips” */}
			<div className='flex overflow-x-auto py-1 gap-2 text-[11px] text-slate-500'>
				{sorted.map(m => (
					<div key={m.id || m.date} className='inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200'>
						<span className='text-slate-500 text-nowrap '>{m.date?.slice(5)}</span>
						<span className='font-semibold text-slate-900'>{m.weight ?? '-'}</span>
						<span className='text-slate-400'>kg</span>
					</div>
				))}
			</div>
		</div>
	);
}

/* === Main component === */

export default function ProfileOverviewPage() {
	const t = useTranslations('myProfile');
	const [tab, setTab] = useState('overview');

	const [user, setUser] = useState(null);
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [measurements, setMeasurements] = useState([]);
	const [latestM, setLatestM] = useState(null);
	const [mStats, setMStats] = useState(null);

	const [photoMonths, setPhotoMonths] = useState([]);

	const [editOpen, setEditOpen] = useState(false);
	const [savingProfile, setSavingProfile] = useState(false);
	const [editForm, setEditForm] = useState({
		name: '',
		phone: '',
		gender: '',
		membership: '',
		defaultRestSeconds: '',
		caloriesTarget: '',
		proteinPerDay: '',
		carbsPerDay: '',
		fatsPerDay: '',
		activityLevel: '',
		notes: '',
	});

	const [uploadOpen, setUploadOpen] = useState(false);
	const [showUploadBlock, setShowUploadBlock] = useState(false);
	const [photoPreview, setPhotoPreview] = useState(null);
	const [tipsOpen, setTipsOpen] = useState(false);
	const [compareAllOpen, setCompareAllOpen] = useState(false);
	const [compareAllIndex, setCompareAllIndex] = useState(0);
	const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState(null);
	const [confirmDeleteMeasurementId, setConfirmDeleteMeasurementId] = useState(null);
	const scrollerRef = useRef(null);

	// measurement form handled by react-hook-form
	const { control, handleSubmit, formState: { errors }, reset } = useForm({
		defaultValues: { date: new Date(), weight: '', waist: '', chest: '' },
	});
	const [mHips, setMHips] = useState('');
	const [savingMeasure, setSavingMeasure] = useState(false);

	const [editRowId, setEditRowId] = useState(null);
	const [editRow, setEditRow] = useState({ date: '', weight: '', waist: '', chest: '', hips: '' });
	const [savingEditRow, setSavingEditRow] = useState(false);

	const [pFront, setPFront] = useState(null);
	const [pBack, setPBack] = useState(null);
	const [pLeft, setPLeft] = useState(null);
	const [pRight, setPRight] = useState(null);
	const [pWeight, setPWeight] = useState('');
	const [pNote, setPNote] = useState('');
	const [pDate, setPDate] = useState(new Date());
	const [savingPhotos, setSavingPhotos] = useState(false);

	const [compare, setCompare] = useState({ side: 'front', beforeId: null, afterId: null });

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

	/* === Initial load === */
	useEffect(() => {
		(async () => {
			try {
				setLoading(true);

				const me = await fetchMe();
				const computedName = me?.name && me.name.includes('@') ? me.email?.split('@')[0] : me?.name;
				const [exName, mpName, coach] = await Promise.all([fetchPlanName('exercise', me?.activeExercisePlanId), fetchPlanName('meal', me?.activeMealPlanId), fetchCoach(me?.coachId)]);

				const userObj = {
					...me,
					name: computedName || me?.email || 'User',
					activeExercisePlan: exName ? { name: exName } : null,
					activeMealPlan: mpName ? { name: mpName } : null,
					coach: coach ? { id: coach.id, name: coach.name || coach.email || coach.id } : me?.coach || null,
				};

				setUser(userObj);

				const [statsRes, listRes, latestRes, statMRes, timelineRes] = await Promise.allSettled([getProfileStats(), getMeasurements(120), getLatestMeasurement(), getMeasurementStats(), getPhotosTimeline(12)]);

				if (statsRes.status === 'fulfilled') setStats(statsRes.value || null);
				if (listRes.status === 'fulfilled') {
					const arr = (listRes.value || []).map(m => ({
						id: m.id,
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

	const tabs = [
		{ key: 'overview', label: t('tabs.overview') },
		{ key: 'body', label: t('tabs.body') },
		{ key: 'photos', label: t('tabs.photos') },
	];

	/* === Edit Profile Modal helpers === */

	const openEditProfile = () => {
		if (!user) return;
		setEditForm({
			name: user.name || '',
			phone: user.phone || '',
			gender: user.gender || '',
			membership: user.membership || '',
			defaultRestSeconds: user.defaultRestSeconds != null ? String(user.defaultRestSeconds) : '',
			caloriesTarget: user.caloriesTarget != null ? String(user.caloriesTarget) : '',
			proteinPerDay: user.proteinPerDay != null ? String(user.proteinPerDay) : '',
			carbsPerDay: user.carbsPerDay != null ? String(user.carbsPerDay) : '',
			fatsPerDay: user.fatsPerDay != null ? String(user.fatsPerDay) : '',
			activityLevel: user.activityLevel || '',
			notes: user.notes || '',
		});
		setEditOpen(true);
	};

	const numericProfileFields = ['defaultRestSeconds', 'caloriesTarget', 'proteinPerDay', 'carbsPerDay', 'fatsPerDay'];

	const handleSaveProfile = async () => {
		if (!user) return;
		setSavingProfile(true);
		try {
			const payload = {};
			Object.entries(editForm).forEach(([key, val]) => {
				if (val === '' || val == null) return;
				if (numericProfileFields.includes(key)) {
					payload[key] = Number(val);
				} else {
					payload[key] = val;
				}
			});

			const { data } = await api.put(`/auth/profile/${user.id}`, payload);
			// assume backend returns updated user
			setUser(prev => ({ ...prev, ...(data || payload) }));
			setEditOpen(false);
		} catch (e) {
			// optional: toast error
		} finally {
			setSavingProfile(false);
		}
	};

	/* === Measurements CRUD === */

	async function addMeasurement(form) {
		// form is validated by react-hook-form (weight required)
		setSavingMeasure(true);
		try {
			const payload = {
				date: toISODate(form.date),
				weight: form.weight !== '' && form.weight != null ? Number(form.weight) : undefined,
				waist: form.waist !== '' && form.waist != null ? Number(form.waist) : undefined,
				chest: form.chest !== '' && form.chest != null ? Number(form.chest) : undefined,
				hips: form.hips !== '' && form.hips != null ? Number(form.hips) : undefined,
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
			reset({ date: new Date(), weight: '', waist: '', chest: '' });
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

	/* === Photos === */

	function onPickSideFile(side, file) {
		if (!file) return;
		const src = URL.createObjectURL(file);
		setCropSide(side);
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

			if (pFront) formData.append('front', pFront);
			if (pBack) formData.append('back', pBack);
			if (pLeft) formData.append('left', pLeft);
			if (pRight) formData.append('right', pRight);

			const takenAt = `${toISODate(pDate)}`;
			const photoData = {
				takenAt,
				weight: pWeight ? Number(pWeight) : null,
				note: pNote || '',
			};
			formData.append('data', JSON.stringify(photoData));

			const { data: newPhoto } = await api.post('/profile/photos', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			const newEntry = {
				id: newPhoto.id,
				month: new Date(newPhoto.takenAt).toLocaleString('default', { month: 'short', year: 'numeric' }),
				weight: newPhoto.weight,
				note: newPhoto.note,
				sides: newPhoto.sides,
				takenAt: newPhoto.takenAt,
				createdAt: newPhoto.created_at,
			};

			setPhotoMonths(prev => {
				const existingMonthIndex = prev.findIndex(entry => entry.id === newEntry.id);
				if (existingMonthIndex !== -1) {
					const updated = [...prev];
					updated[existingMonthIndex] = newEntry;
					return updated;
				} else {
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
			setShowUploadBlock(false);
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

	/* === Loading / error === */

	if (loading) {
	  return (
	    <div>
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

	return (
		<div className='space-y-6'>
			<ShimmerStyle />

			{/* Header */}
			<div className='rounded-lg border border-slate-200 overflow-hidden shadow-sm'>
				<div className='bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white'>
					<div className='p-6 md:p-8'>
						<div className='flex rtl:flex-row-reverse flex-wrap justify-between items-center gap-4'>
							<div className='flex rtl:flex-row-reverse items-center gap-2'>
								<div className='h-14 w-14 rounded-lg bg-white/15 grid place-items-center ring-1 ring-white/20'>
									<UserIcon className='h-7 w-7 text-white' />
								</div>
								<div className='min-w-0'>
									<div className='text-xl md:text-2xl font-semibold truncate'>{user?.name}</div>
									<div className='text-white/90 text-sm flex items-center gap-3 flex-wrap'>
										<span className='w-full rtl:text-left gap-1'>
											{user?.email}
										</span>
									</div>
								</div>
							</div>

							<Btn variant='subtle' className='' onClick={openEditProfile}>
								<Pencil size={16} className=' rtl:ml-1 ltr:mr-1 max-md:!mx-0 ' />
								<span className='max-md:hidden'> {t('actions.edit')} </span>
							</Btn>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<TabsPill sliceInPhone={false} id='profile-tabs' tabs={[...tabs]} active={tab} onChange={setTab} className='!bg-white' />

			<AnimatePresence mode='wait'>
				{/* Overview Tab */}
				{tab === 'overview' && (
					<motion.div key='overview' {...fade} className='grid grid-cols-1   xl:grid-cols-3 gap-4 '>
						<ProfileCard user={user} onEdit={openEditProfile} cn="xl:col-span-2" dir='rtl' />

						{/* Weight Trend Graph (اتجاه الوزن) */}
						<motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 0.8 }} className=' box-3d  xl:col-span-1 relative overflow-hidden rounded-lg border border-slate-200 bg-white '>
							<div className='relative p-4 sm:p-5 '>
								<WeightTrendChart data={measurements} t={t} />
							</div>
						</motion.div>

						{/* Compare block stays full width below on small screens */}
						<motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 0.8 }} className=' box-3d xl:col-span-3 relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:border-slate-300'>
							<div className='relative p-4 sm:p-5 space-y-4'>
								{/* Header */}
								<div className='flex items-center justify-between gap-3 mb-1'>
									<div className='flex items-center gap-3'>
										<div className='flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100'>
											<ImageIcon className='h-4 w-4' />
										</div>
										<div className='flex flex-col'>
											<div className={sectionTitle}>{t('sections.compare')}</div>
											<span className='text-[11px] text-slate-500'>{t('messages.chooseTwoSets') /* works as a hint too */}</span>
										</div>
									</div>
								</div>

								{/* Controls */}
								<div className='grid md:grid-cols-4 gap-3 mt-4'>
									{/* Side */}
									<label className='space-y-1.5'>
										<div className='text-xs font-medium text-slate-600'>{t('labels.side')}</div>
										<Select searchable={false} options={sideOptions} value={compare.side} onChange={val => setCompare(s => ({ ...s, side: String(val) }))} placeholder={t('placeholders.choose')} clearable={false} />
									</label>

									{/* Before */}
									<label className='space-y-1.5'>
										<div className='text-xs font-medium text-slate-600'>{t('labels.before')}</div>
										<Select searchable={false} options={photoSetOptions} value={compare.beforeId || ''} onChange={val => setCompare(s => ({ ...s, beforeId: String(val) }))} placeholder={t('placeholders.choose')} clearable />
									</label>

									{/* After */}
									<label className='space-y-1.5'>
										<div className='text-xs font-medium text-slate-600'>{t('labels.after')}</div>
										<Select searchable={false} options={photoSetOptions} value={compare.afterId || ''} onChange={val => setCompare(s => ({ ...s, afterId: String(val) }))} placeholder={t('placeholders.choose')} clearable />
									</label>

									{/* Actions */}
									<div className='flex  items-end mb-[1px] justify-end gap-2'>
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

								{/* Preview area */}
								<div className='mt-4'>
									{compare.beforeId && compare.afterId && compare.side !== 'all' ? (
										<div className='rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-3 sm:px-4 sm:py-4'>
											<BeforeAfter before={leftSrc()} after={rightSrc()} name='progress' />
										</div>
									) : (
										<div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center'>
											<div className='mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200'>
												<ImageIcon className='h-5 w-5 text-slate-400' />
											</div>
											<p className='text-sm font-medium text-slate-600'>{t('messages.chooseTwoSets')}</p>
											<p className='mt-1 text-xs text-slate-500'>{t('messages.compareHint') || t('labels.beforeAfter') /* optional extra hint */}</p>
										</div>
									)}
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}

				{/* Body Tab */}
				{tab === 'body' && (
					<motion.div key='body' {...fade} className='grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6'>
						<div className={card + ' box-3d'}>
							<div className='flex items-center justify-between gap-2 mb-3'>
								<div className='flex items-center gap-2'>
									<Ruler className='h-4 w-4 text-slate-500' />
									<div className={sectionTitle}>{t('forms.addMeasurement')}</div>
								</div>

								<div className='  flex items-center gap-2 flex-wrap'>
									{/* measurement form uses react-hook-form for validation */}
								</div>
							</div>

							<form onSubmit={handleSubmit(addMeasurement)} className='mt-4'>
								<div className='grid grid-cols-2 sm:grid-cols-2 gap-2'>
									<Controller
										name='date'
										control={control}
										render={({ field }) => <InputDate placeholder={t('forms.date')} value={field.value} onChange={field.onChange} className='sm:col-span-1' />}
									/>

									<Controller
										name='weight'
										control={control}
										rules={{ required: t('errors.required') || 'هذا الحقل مطلوب' }}
										render={({ field }) => <Input placeholder={t('forms.weightKg')} name='weight' value={field.value} onChange={field.onChange} error={errors.weight?.message} />}
									/>

									<Controller name='waist' control={control} render={({ field }) => <Input placeholder={t('forms.waistCm')} name='waist' value={field.value} onChange={field.onChange} />} />
									<Controller name='chest' control={control} render={({ field }) => <Input placeholder={t('forms.chestCm')} name='chest' value={field.value} onChange={field.onChange} />} />
								</div>

								<div className='mt-3'>
									<Btn variant='primary' type='submit' disabled={savingMeasure}>
										{savingMeasure ? t('actions.saving') : t('actions.save')}
									</Btn>
								</div>
							</form>
						</div>

						<div className={card + ' box-3d'}>
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
												<th className=' ltr:text-left rtl:text-right font-normal pb-2'>{t('table.date')}</th>
												<th className=' ltr:text-left rtl:text-right font-normal pb-2'>{t('table.weight')}</th>
												<th className=' ltr:text-left rtl:text-right font-normal pb-2'>{t('table.waist')}</th>
												<th className=' ltr:text-left rtl:text-right font-normal pb-2'>{t('table.chest')}</th>
												<th className='text-center font-normal pb-2'>{t('table.actions')}</th>
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
															<td className='py-2'>{isEditing ? <input type='date' className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm' value={editRow.date} onChange={e => setEditRow(s => ({ ...s, date: e.target.value }))} /> : m.date}</td>
															<td className='py-2 ltr:text-left rtl:text-right font-medium'>{isEditing ? <input type='number' className='w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm' value={editRow.weight} onChange={e => setEditRow(s => ({ ...s, weight: e.target.value }))} /> : m.weight ?? '-'}</td>
															<td className='py-2 ltr:text-left rtl:text-right font-medium'>{isEditing ? <input type='number' className='w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm' value={editRow.waist} onChange={e => setEditRow(s => ({ ...s, waist: e.target.value }))} /> : m.waist ?? '-'}</td>
															<td className='py-2 ltr:text-left rtl:text-right font-medium'>{isEditing ? <input type='number' className='w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm' value={editRow.chest} onChange={e => setEditRow(s => ({ ...s, chest: e.target.value }))} /> : m.chest ?? '-'}</td>
															<td className='py-2 ltr:text-left rtl:text-right mr-auto flex  items-center rtl:justify-end ltr:justify-end'>
																{!isEditing ? (
																	<div className='flex items-center gap-2 ltr:justify-end rtl:justify-start'>
																		<button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50' onClick={() => startEditRow(m)} title={t('actions.edit')}>
																			<Edit3 size={16} />
																		</button>
																		<button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50' onClick={() => setConfirmDeleteMeasurementId(m.id)} title={t('actions.delete')}>
																			<Trash2 size={16} />
																		</button>
																	</div>
																) : (
																	<div className='flex items-center  gap-2  '>
																		<button className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50' onClick={saveEditRow} disabled={savingEditRow} title={t('actions.save')}>
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

				{/* Photos Tab */}
				{tab === 'photos' && (
					<motion.div key='photos' {...fade} className='grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6'>
						{/* Upload panel (hidden until button click) */}
						<div className={card + ' box-3d'}>
							<div className='flex items-center justify-between gap-2 flex-wrap'>
								<div className='flex items-center gap-2'>
									<Camera className='h-4 w-4 text-slate-500' />
									<div className={sectionTitle}>{t('sections.uploadBodyPhotos')}</div>
								</div>
								<div className='flex gap-2'>
									<Btn variant='outline' size='sm' onClick={() => setTipsOpen(true)}>
										{t('tips.cta')}
									</Btn>
								</div>
							</div>

							<div className='  mt-4 space-y-3 flex flex-col items-end'>

								<button
									className={` ${showUploadBlock ? "h-fit py-4 " : "min-h-[200px]"} border border-slate-200 cursor-pointer rounded-md w-full   flex items-center justify-center`}
									onClick={() => setShowUploadBlock(s => !s)}
								>
									<Upload size={16} className='mr-1' />
									{showUploadBlock ? t('actions.hideUpload') : t('actions.addBodyPhotos')}
								</button>

								<AnimatePresence initial={false}>
									{showUploadBlock && (
										<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className=' w-full space-y-3'>
											<div className='grid grid-cols-2 gap-3 mt-3'>
												{[
													{ key: 'front', label: t('sides.front'), file: pFront, setter: setPFront },
													{ key: 'back', label: t('sides.back'), file: pBack, setter: setPBack },
													{ key: 'left', label: t('sides.left'), file: pLeft, setter: setPLeft },
													{ key: 'right', label: t('sides.right'), file: pRight, setter: setPRight },
												].map(({ key, label, file, setter }) => (
													<div key={key} className='relative rounded-lg border border-dashed border-slate-300 bg-slate-50 aspect-[4/3] overflow-hidden'>
														{!file ? (
															<label className='group absolute inset-0 cursor-pointer grid place-items-center hover:bg-slate-100 transition'>
																<div className='flex flex-col items-center'>
																	<ImagePlus className='h-6 w-6 text-slate-500' />
																	<div className='mt-2 text-sm font-medium'>{label}</div>
																	<div className='mt-1 text-[11px] text-slate-500'>{t('labels.tapToUpload')}</div>
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
												<InputDate placeholder={t('forms.date')} value={pDate} onChange={setPDate} />
												<Input placeholder={t('forms.weightOptional')} name='pWeight' value={pWeight} onChange={setPWeight} />
												<Input placeholder={t('forms.noteOptional')} name='pNote' value={pNote} onChange={setPNote} />
											</div>

											<div className='flex gap-2 flex-wrap'>
												<Btn variant='primary' onClick={savePhotoSet} disabled={savingPhotos || (!pFront && !pBack && !pLeft && !pRight)}>
													{savingPhotos ? t('actions.saving') : t('actions.saveSet')}
												</Btn>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</div>

						{/* Timeline */}
						<div className={`xl:col-span-2 ${card} box-3d`}>
							<div className='flex items-center justify-between mb-3 gap-2'>
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
								<div className='flex items-center justify-center text-slate-600 bg-slate-50 border border-slate-200 rounded-lg py-12'>
									<div className='text-center space-y-2'>
										<div className='mx-auto h-12 w-12 rounded-full bg-white border border-slate-200 grid place-items-center'>
											<ImagePlus className='h-6 w-6 text-slate-400' />
										</div>
										<div className='text-sm font-medium'>{t('messages.noTimeline')}</div>
										<Btn
											variant='primary'
											onClick={() => {
												setShowUploadBlock(true);
											}}
											className='mt-1'>
											{t('actions.addBodyPhotos')}
										</Btn>
									</div>
								</div>
							) : (
								<div ref={scrollerRef} className='flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2'>
									{photoMonths.map(entry => (
										<div key={entry.id} className='min-w-[260px] sm:min-w-[320px] md:min-w-[380px] snap-start rounded-lg border border-slate-200 p-3 bg-white'>
											<div className='flex items-center justify-between mb-2 gap-2'>
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
													<button
														key={side}
														onClick={() =>
															setPhotoPreview({
																src: entry.sides?.[side],
																label: `${entry.takenAt} — ${side}`,
															})
														}
														className='overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:shadow-sm transition'>
														<Img src={entry.sides?.[side]} className='max-h-[140px] aspect-square w-full object-contain' alt={side} />
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

			{/* Modal: inline upload (already have full-screen version too) */}
			<Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={t('modals.addBodySet')} maxW='max-w-3xl'>
				<div className='space-y-3'>
					<div className='grid grid-cols-2 gap-3'>
						{[
							{ key: 'front', label: t('sides.front'), file: pFront, setter: setPFront },
							{ key: 'back', label: t('sides.back'), file: pBack, setter: setPBack },
							{ key: 'left', label: t('sides.left'), file: pLeft, setter: setPLeft },
							{ key: 'right', label: t('sides.right'), file: pRight, setter: setPRight },
						].map(({ key, label, file, setter }) => (
							<div key={key} className='relative rounded-lg border border-dashed border-slate-300 bg-slate-50 aspect-[4/3] overflow-hidden'>
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

			{/* Modal: preview single image or compare hint */}
			<Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} title={photoPreview?.label || t('modals.preview')} maxW='max-w-3xl'>
				{photoPreview?.src ? (
					<div className='rounded-lg overflow-hidden border border-slate-200'>
						<Img src={photoPreview.src} alt={photoPreview.label} className='w-full h-auto object-contain' />
					</div>
				) : (
					<div className='text-sm text-slate-600'>{t('messages.useCompareBlock')}</div>
				)}
			</Modal>

			{/* Modal: before/after all sides */}
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

			{/* Modal: tips */}
			<Modal
				open={tipsOpen}
				onClose={() => setTipsOpen(false)}
				title={
					<div className='flex items-center gap-2 pt-1'>
						<div className='flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100'>
							<Lightbulb className='h-4 w-4' />
						</div>
						<span className=' font-medium text-slate-600'>{t('tips.subtitle') || t('tips.title')}</span>
					</div>
				}
				maxW='max-w-lg'>
				<div className='relative space-y-4 text-sm text-slate-700'>
					<div className='absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 rounded-full' />

					<ul className='space-y-2 pt-1'>
						{['lighting', 'distance', 'angles', 'cameraHeight', 'timer', 'clothes', 'background', 'frequency'].map(key => (
							<li key={key} className='flex items-start gap-3 rounded-lg bg-slate-50 py-2 px-3 ring-1 ring-slate-200'>
								<span className='mt-1 h-2 w-2 rounded-full bg-indigo-500' />
								<span className='text-[13px] leading-relaxed text-slate-700'>{t(`tips.${key}`)}</span>
							</li>
						))}
					</ul>
				</div>
			</Modal>

			{/* Modal: delete photo set */}
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

			{/* Modal: delete measurement */}
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

			{/* Modal: crop */}
			<Modal open={cropOpen} onClose={() => setCropOpen(false)} title={t('modals.cropTitle')} maxW='max-w-3xl'>
				{cropImageSrc ? (
					<div className='space-y-3'>
						<div className='relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden'>
							<Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, areaPixels) => setCropAreaPixels(areaPixels)} cropShape='rect' objectFit='contain' />
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

			{/* Modal: Edit Profile */}
			<Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('modals.editProfileTitle') || t('actions.editProfile')} maxW='max-w-3xl'>
				<div className='space-y-4'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
						<Input placeholder={t('profile.name')} name='name' value={editForm.name} onChange={val => setEditForm(f => ({ ...f, name: val }))} />
						<Input placeholder={t('profile.phone')} name='phone' value={editForm.phone} onChange={val => setEditForm(f => ({ ...f, phone: val }))} />

						<Input placeholder={t('profile.caloriesTarget')} name='caloriesTarget' type='number' value={editForm.caloriesTarget} onChange={val => setEditForm(f => ({ ...f, caloriesTarget: val }))} />
						<Input placeholder={t('profile.proteinPerDay')} name='proteinPerDay' type='number' value={editForm.proteinPerDay} onChange={val => setEditForm(f => ({ ...f, proteinPerDay: val }))} />
						<Input placeholder={t('profile.carbsPerDay')} name='carbsPerDay' type='number' value={editForm.carbsPerDay} onChange={val => setEditForm(f => ({ ...f, carbsPerDay: val }))} />
						<Input placeholder={t('profile.fatsPerDay')} name='fatsPerDay' type='number' value={editForm.fatsPerDay} onChange={val => setEditForm(f => ({ ...f, fatsPerDay: val }))} />
						<Select
							searchable={false}
							placeholder={t('profile.activityLevel')}
							options={[
								{ id: 'sedentary', label: t('profile.activity.sedentary') },
								{ id: 'light', label: t('profile.activity.light') },
								{ id: 'moderate', label: t('profile.activity.moderate') },
								{ id: 'high', label: t('profile.activity.high') },
								{ id: 'athlete', label: t('profile.activity.athlete') },
							]}
							value={editForm.activityLevel}
							onChange={val => setEditForm(f => ({ ...f, activityLevel: String(val) }))}
							clearable
						/>
					</div>

					<div className='flex gap-2 justify-end'>
						<Btn variant='primary' onClick={handleSaveProfile} disabled={savingProfile}>
							{savingProfile ? t('actions.saving') : t('actions.save')}
						</Btn>
					</div>
				</div>
			</Modal>
		</div>
	);
}

/* === Helpers === */

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

function ProfileCard({ user = {}, dir = 'ltr', cn }) {
	const t = useTranslations('myProfile');

	const { phone, membership, gender, subscriptionStart, subscriptionEnd, caloriesTarget, proteinPerDay, carbsPerDay, fatsPerDay, activityLevel, coach, activeExercisePlan, activeMealPlan } = user || {};

	const leftDaysVal = daysLeft(subscriptionEnd);

	const subBadgeColor = leftDaysVal == null ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' : leftDaysVal <= 0 ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';

	const leftDaysLabel = leftDaysVal == null ? t('profile.noEndDate') : leftDaysVal <= 0 ? t('profile.expired') : t('profile.daysLeft', { count: leftDaysVal });

	const formatMacro = val => (val == null ? '-- g' : `${val} g`);
	const formatActivity = val => val || t('profile.activityNotSet');

	return (
		<motion.div dir={dir} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} className={` ${cn} box-3d relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md`}>
			<div className='relative p-5 xl:p-6 space-y-5'>
				{/* Header */}
				<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
					<div className='space-y-1 flex items-center justify-between w-full '>
						<div className='flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200'>
							<div className='h-7 w-7 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md'>
								<User2 className='h-4 w-4' />
							</div>
							<div className='flex flex-col'>
								<div className='flex items-center gap-2'>
									<span className='text-[10px] text-slate-500'>{t('profile.coachLabel')}</span> :<span className='text-sm font-semibold text-slate-800'>{coach?.name || t('profile.noCoach')}</span>
								</div>
							</div>
						</div>

						{/* Phone */}
						{phone && (
							<div className='font-number flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200 text-sm text-slate-700  h-[40px] '>
								<span dir='ltr'>{phone}</span>
								<Phone className='  h-3.5 w-3.5 text-slate-500' />
							</div>
						)}
					</div>
				</div>

				{/* Grid */}
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
					{/* Membership */}
					<div className='rounded-xl max-md:border-none max-md:p-0 max-md:bg-white/0 backdrop-blur-2xl bg-white/90 border border-slate-200 p-4 space-y-3'>
						<div className='flex justify-between items-center'>
							<span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('profile.membershipTitle')}</span>
							<span className='px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] ring-1 ring-indigo-200 font-number '>{membership ? membership.toUpperCase() : t('profile.noPlan')}</span>
						</div>

						<div className='flex justify-between items-center'>
							<span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('profile.gender')}</span>
							<span className='px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] ring-1 uppercase ring-indigo-200 font-number '>{gender}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('profile.activityLevel')}</span>
							<span className='px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] ring-1 uppercase ring-indigo-200 '>{formatActivity(activityLevel)}</span>
						</div>
					</div>

					{/* Subscription */}
					<div className='rounded-xl max-md:border-none max-md:p-0 max-md:bg-white/0 max-md:my-4 backdrop-blur-2xl bg-white/90  border border-slate-200 p-4 space-y-3'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('profile.start')}</span>
							<span className={` font-number px-2.5 py-0.5 rounded-full text-[11px] font-medium ${subBadgeColor}`}>{fmt(subscriptionStart) || '--'}</span>
						</div>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('profile.end')}</span>
							<span className={` font-number px-2.5 py-0.5 rounded-full text-[11px] font-medium ${subBadgeColor}`}>{fmt(subscriptionEnd) || '--'}</span>
						</div>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>{t('profile.subscriptionPeriod')}</span>
							<span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${subBadgeColor}`}>{leftDaysLabel}</span>
						</div>
					</div>

					{/* Active Plans */}
					<div className='rounded-xl max-md:border-none max-md:p-0 max-md:bg-white/0 backdrop-blur-2xl bg-white/90  border border-slate-200 p-4 space-y-3'>
						<div className='flex items-center gap-2 mb-3'>
							<FaTasks className='h-4 w-4 text-orange-500' />
							<span className='text-sm font-semibold text-slate-800'>{t('profile.activePlans')}</span>
						</div>
						<div className='grid grid-cols-2 gap-2 mt-1'>
							{/* Exercise Plan */}
							<div className='relative overflow-hidden rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'>
								<div className='absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500' />

								<div className='flex flex-col items-center gap-1.5'>
									<div className='flex mx-auto items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700'>
										<Dumbbell className='h-3.5 w-3.5' />
										<span className='uppercase text-center tracking-wide'>{t('profile.exercisePlan')}</span>
									</div>

									<div className='mt-0.5 text-sm font-semibold text-slate-900 text-center'>{activeExercisePlan?.name || t('profile.noExercisePlan')}</div>

									<span className='text-[11px] text-slate-500'>{t('profile.planActiveLabel') /* optional */}</span>
								</div>
							</div>

							{/* Meal Plan */}
							<div className='relative overflow-hidden rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'>
								<div className='absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-400 via-rose-500 to-pink-500' />

								<div className='flex flex-col items-center gap-1.5'>
									<div className='flex mx-auto items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700'>
										<Apple className='h-3.5 w-3.5' />
										<span className='uppercase text-center tracking-wide'>{t('profile.mealPlan')}</span>
									</div>

									<div className='mt-0.5 text-sm font-semibold text-slate-900 text-center'>{activeMealPlan?.name || t('profile.noMealPlan')}</div>

									<span className='text-[11px] text-slate-500'>{t('profile.planActiveLabel')}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Nutrition */}
				<div className='rounded-xl max-md:border-none max-md:p-0 max-md:bg-white/0 bg-slate-50 border border-slate-200 p-4'>
					<div className='flex items-center gap-2 mb-3'>
						<Flame className='h-4 w-4 text-orange-500' />
						<span className='text-sm font-semibold text-slate-800'>{t('profile.nutritionTargets')}</span>
					</div>

					<div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-center'>
						{/* Calories */}
						<div className='relative overflow-hidden rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'>
							<div className='absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400' />
							<div className='flex flex-col items-center gap-1.5'>
								<div className='inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700'>
									{/* make sure Flame is imported */}
									<Flame className='h-3.5 w-3.5' />
									<span className='uppercase tracking-wide'>{t('profile.calories')}</span>
								</div>

								<div className='flex items-end gap-1 mt-0.5'>
									<span className='text-2xl font-bold text-slate-900'>{caloriesTarget || '--'}</span>
									<span className='text-[11px] uppercase text-slate-500 mb-[2px]'>kcal</span>
								</div>

								<span className='text-[11px] text-slate-500'>{t('profile.perDayLabel') /* e.g. "في اليوم" */}</span>
							</div>
						</div>

						{/* Protein */}
						<div className='relative overflow-hidden rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200'>
							<div className='absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600/80' />
							<div className='flex flex-col items-center gap-1.5'>
								<div className='inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700'>
									{/* Dumbbell icon if you like for protein */}
									<Dumbbell className='h-3.5 w-3.5' />
									<span className='uppercase tracking-wide'>{t('profile.protein')}</span>
								</div>
								<div className='flex items-end gap-1'>
									<span className='text-base font-semibold text-slate-900'>{formatMacro(proteinPerDay)}</span>
								</div>
								<span className='text-[11px] text-slate-500'>{t('profile.gramsPerDay') /* "جم / اليوم" */}</span>
							</div>
						</div>

						{/* Carbs */}
						<div className='relative overflow-hidden rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200'>
							<div className='absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600/80' />
							<div className='flex flex-col items-center gap-1.5'>
								<div className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700'>
									<span className='h-2 w-2 rounded-full bg-emerald-500' />
									<span className='uppercase tracking-wide'>{t('profile.carbs')}</span>
								</div>
								<div className='flex items-end gap-1'>
									<span className='text-base font-semibold text-slate-900'>{formatMacro(carbsPerDay)}</span>
								</div>
								<span className='text-[11px] text-slate-500'>{t('profile.gramsPerDay')}</span>
							</div>
						</div>

						{/* Fats */}
						<div className='relative overflow-hidden rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200'>
							<div className='absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600/80' />
							<div className='flex flex-col items-center gap-1.5'>
								<div className='inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700'>
									<span className='h-2 w-2 rounded-full bg-amber-500' />
									<span className='uppercase tracking-wide'>{t('profile.fats')}</span>
								</div>
								<div className='flex items-end gap-1'>
									<span className='text-base font-semibold text-slate-900'>{formatMacro(fatsPerDay)}</span>
								</div>
								<span className='text-[11px] text-slate-500'>{t('profile.gramsPerDay')}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
