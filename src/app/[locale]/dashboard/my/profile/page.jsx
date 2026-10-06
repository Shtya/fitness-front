'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import {
	User as UserIcon,
	Dumbbell,
	Scale,
	Ruler,
	Camera,
	Image as ImageIcon,
	Upload,
	Clock,
	ChevronsLeft,
	ChevronsRight,
	X,
	ImagePlus,
	Trash2,
	Edit3,
	Save,
	Flame,
	Beef,
	Droplets,
	User2,
	Apple,
	Lightbulb,
	TrendingUp,
	Calendar,
	Trophy,
	Target,
	Zap,
	Award,
	Plus,
	Info,
	Star,
	ChevronRight,
	Activity,
	ScanLine,
	Shield,
	FileText,
} from 'lucide-react';

import api from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import Input from '@/components/atoms/Input';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Select from '@/components/atoms/Select';
import Img from '@/components/atoms/Img';
import { useTheme } from '@/app/[locale]/theme';
import BodyMeasurementFlow from '@/components/body-measurement/BodyMeasurementFlow';
import DataTable from '@/components/atoms/Datatable';
import { getStoredPerPage, setStoredPerPage } from '@/lib/table-prefs';

/* =========================================================================
	 DESIGN TOKENS
	 ========================================================================= */
const card = 'relative overflow-hidden rounded-3xl border border-white/85 bg-[#eef2f9] shadow-[5px_5px_8px_rgba(100,116,139,0.32)]';
const neuInput = '!h-[46px] !min-h-[46px] !rounded-2xl !border-0 !bg-[#e4eaf3] !text-slate-800 !shadow-[inset_2px_2px_5px_rgba(100,116,139,0.28),inset_-1px_-1px_2px_rgba(255,255,255,0.85)]';
const sectionTitle = 'text-base sm:text-lg font-black text-slate-900 tracking-tight';

const fadeUp = {
	initial: { opacity: 0, y: 18 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -12 },
	transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
};

const staggerContainer = { animate: { transition: { staggerChildren: 0.06 } } };
const staggerItem = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } };

/* =========================================================================
	 UTILITIES
	 ========================================================================= */
const toISODate = (d) => {
	if (!d) return '';
	const dt = d instanceof Date ? d : new Date(d);
	return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const daysLeft = (end) => {
	if (!end) return null;
	const diff = Math.ceil((new Date(end + 'T23:59:59').getTime() - Date.now()) / 86400000);
	return diff;
};

/* =========================================================================
	 SKELETON
	 ========================================================================= */
function SkeletonPulse({ className = '' }) {
	return <div className={`rounded-lg bg-slate-100 animate-pulse ${className}`} />;
}

function LoadingSkeleton() {
	return (
		<div className="mx-auto w-full max-w-[440px] space-y-4">
			<div className="m-[5px] overflow-hidden rounded-3xl p-4" style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), #1a3fbf)' }}>
				<div className="mb-3 flex items-center gap-3">
					<SkeletonPulse className="h-11 w-11 rounded-2xl bg-white/20" />
					<div className="flex-1 space-y-2">
						<SkeletonPulse className="h-4 w-36 bg-white/25" />
						<SkeletonPulse className="h-2.5 w-24 bg-white/15" />
					</div>
					<SkeletonPulse className="h-11 w-11 rounded-2xl bg-white/20" />
				</div>
				<SkeletonPulse className="mb-3 h-9 rounded-2xl bg-white/15" />
				<div className="grid grid-cols-2 gap-1.5">
					{[0, 1, 2, 3].map(i => <SkeletonPulse key={i} className="h-12 rounded-2xl bg-white/15" />)}
				</div>
			</div>
			{[0, 1].map(i => <SkeletonPulse key={i} className="h-40 rounded-3xl bg-[#eef2f9]" />)}
		</div>
	);
}

/* =========================================================================
	 HEADER STAT PILL (same pattern as nutrition page)
	 ========================================================================= */
function HeaderStatPill({ label, value, icon: Icon, delay = 0 }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
			className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-2.5 py-2"
		>
			<div className="mb-1 flex items-center gap-1.5">
				{Icon && <Icon className="h-3 w-3 shrink-0 text-white/70" />}
				<p className="truncate text-[9px] font-medium text-white/55">{label}</p>
			</div>
			<p className="truncate text-xs font-bold text-white">{value ?? '—'}</p>
		</motion.div>
	);
}

/* =========================================================================
	 BUTTON
	 ========================================================================= */
function Btn({ children, onClick, disabled, className = '', size = 'md', variant = 'primary', type = 'button', icon: Icon }) {
	const sizes = { sm: 'h-9 px-4 text-xs', md: 'h-11 px-5 text-sm', lg: 'h-13 px-8 text-base' };
	const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]';

	const variants = {
		primary: 'bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white shadow-md hover:shadow-lg hover:brightness-105',
		outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
		ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
		success: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md hover:brightness-105',
		danger: 'bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-md hover:brightness-105',
	};

	return (
		<button type={type} onClick={onClick} disabled={disabled}
			className={`${base} ${sizes[size]} ${variants[variant] ?? variants.primary} ${className}`}>
			{Icon && <Icon className="h-4 w-4" />}
			{children}
		</button>
	);
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
	return (
		<div className="flex items-center justify-between mb-3">
			<div className="flex items-center gap-3.5">
				{/* Icon badge with glow */}
				<div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-(--color-primary-600)/20 bg-(--color-primary-600)/10 text-(--color-primary-600)">
					<Icon className="h-[18px] w-[18px]" />
				</div>
				<div className="min-w-0">
					<h3 className="text-[15px] font-bold leading-tight text-slate-900">{title}</h3>
					{subtitle && (
						<p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
					)}
				</div>
			</div>

			{action && (
				<div className="flex-none">{action}</div>
			)}
		</div>
	);
}

/* =========================================================================
	 BEFORE / AFTER COMPARE
	 ========================================================================= */
function BeforeAfter({ before, after, name, t }) {
	const [pos, setPos] = useState(50);
	return (
		<div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-lg">
			{before
				? <Img src={before} alt={`${name} ${t('labels.before')}`} className="absolute inset-0 w-full h-full object-cover" />
				: <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center"><ImageIcon className="h-16 w-16 text-slate-400/50" /></div>
			}
			<div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
				{after
					? <Img src={after} alt={`${name} ${t('labels.after')}`} className="w-full h-full object-cover" />
					: <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center"><ImageIcon className="h-16 w-16 text-slate-500/50" /></div>
				}
			</div>
			<div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%` }}>
				<div className="h-full w-0.5 bg-white shadow-2xl" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					<div className="flex items-center justify-center h-11 w-11 rounded-full bg-white shadow-2xl border-[3px] border-[var(--color-primary-500)]">
						<ChevronsLeft className=" rtl:scale-x-[-1] h-4 w-4 -mr-1.5 text-[var(--color-primary-600)]" />
						<ChevronsRight className=" rtl:scale-x-[-1] h-4 w-4 -ml-1.5 text-[var(--color-primary-600)]" />
					</div>
				</div>
			</div>
			<input type="range" value={pos} min={0} max={100} onChange={e => setPos(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full" />
			<span className="absolute top-3 start-3 bg-black/65 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold">{t('labels.before')}</span>
			<span className="absolute top-3 end-3 bg-black/65 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold">{t('labels.after')}</span>
		</div>
	);
}

/* =========================================================================
	 WEIGHT TREND CHART
	 ========================================================================= */
function WeightTrendChart({ data = [], t }) {
	const [hoveredIdx, setHoveredIdx] = useState(null);
	if (!data.length) return null;

	const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	const delta = last.weight != null && first.weight != null ? (last.weight - first.weight).toFixed(1) : '0.0';
	const isLoss = parseFloat(delta) < 0;
	const isGain = parseFloat(delta) > 0;
	const deltaColor = isLoss ? '#10b981' : isGain ? '#ef4444' : '#94a3b8';
	const stats = [
		{ label: t('labels.start'), value: `${first.weight ?? '-'} ${t('units.kg')}`, color: '#64748b', bg: '#f8fafc', icon: Scale },
		{ label: t('labels.current'), value: `${last.weight ?? '-'} ${t('units.kg')}`, color: 'var(--color-primary-600)', bg: 'color-mix(in srgb, var(--color-primary-50) 80%, #fff)', icon: TrendingUp },
		{ label: t('labels.change'), value: `${isLoss ? '↓' : isGain ? '↑' : '→'} ${Math.abs(parseFloat(delta))} ${t('units.kg')}`, color: deltaColor, bg: isLoss ? '#f0fdf4' : isGain ? '#fef2f2' : '#f8fafc', icon: Activity },
	];

	return (
		<div>
			<SectionHeader icon={TrendingUp} title={t('messages.weightProgressionOverTime')} />
			<div className="grid grid-cols-3 gap-2">
				{stats.map((s) => (
					<div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 px-2 py-3 text-center" style={{ background: s.bg }}>
						<s.icon size={13} color={s.color} />
						<p className="text-[10px] text-slate-400">{s.label}</p>
						<p className="text-xs font-bold" style={{ color: s.color }}>{s.value}</p>
					</div>
				))}
			</div>
			<div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{sorted.map((m, i) => {
					const diff = i > 0 ? (Number(m.weight) - Number(sorted[i - 1].weight)).toFixed(1) : null;
					const diffNum = diff == null ? 0 : parseFloat(diff);
					const on = hoveredIdx === i;
					return (
						<button key={m.id || m.date} type="button" onClick={() => setHoveredIdx(on ? null : i)} className={`flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 ${on ? 'border-(--color-primary-300) bg-(--color-primary-50)' : 'border-slate-200 bg-slate-50'}`}>
							<span className="text-[9px] font-semibold text-slate-400">{String(m.date || '').slice(5)}</span>
							<span className={`text-sm font-black ${on ? 'text-(--color-primary-700)' : 'text-slate-800'}`}>{m.weight ?? '-'}</span>
							<span className="text-[8px] font-bold text-slate-400">{t('units.kg')}</span>
							{diff != null && <span className={`text-[8px] font-black ${diffNum < 0 ? 'text-emerald-500' : diffNum > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{diffNum > 0 ? '+' : ''}{diff}</span>}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function NutritionGoalsCard({ user, t }) {
	const goals = [
		{ label: t('profile.calories'), value: user?.caloriesTarget, unit: t('units.kcal'), icon: Flame, color: '#f97316', bg: '#fff7ed' },
		{ label: t('profile.protein'), value: user?.proteinPerDay, unit: t('units.g'), icon: Beef, color: '#2563eb', bg: '#eff6ff' },
		{ label: t('profile.carbs'), value: user?.carbsPerDay, unit: t('units.g'), icon: Zap, color: '#f59e0b', bg: '#fffbeb' },
		{ label: t('profile.fats'), value: user?.fatsPerDay, unit: t('units.g'), icon: Droplets, color: '#ec4899', bg: '#fdf2f8' },
	];

	return (
		<motion.div {...fadeUp} className={card + ' overflow-hidden p-4'}>
			<SectionHeader
				icon={Target}
				title={t('profile.nutritionTargets')}
				subtitle={t('messages.dailyMacroGoals')}
			/>
			<div className="grid grid-cols-4 gap-2">
				{goals.map((goal) => (
					<div key={goal.label} className="flex flex-col items-center gap-1 rounded-2xl border border-white/80 px-1 py-3 text-center shadow-[3px_3px_6px_rgba(100,116,139,0.18)]" style={{ background: goal.bg }}>
						<div className="mb-0.5 grid h-[34px] w-[34px] place-items-center rounded-2xl border bg-[#eef2f9] shadow-[2px_2px_4px_rgba(100,116,139,0.2)]" style={{ borderColor: `${goal.color}28` }}>
							<goal.icon size={15} color={goal.color} />
						</div>
						<p className="text-[17px] font-bold leading-5 text-slate-800">{goal.value != null && goal.value !== '' ? goal.value : '—'}</p>
						<p className="-mt-0.5 text-[9px] text-slate-400">{goal.unit}</p>
						<span className="h-0.5 w-5 rounded-full" style={{ background: `${goal.color}66` }} />
						<p className="line-clamp-2 text-[9px] font-medium" style={{ color: goal.color }}>{goal.label}</p>
					</div>
				))}
			</div>
		</motion.div>
	);
}

/* =========================================================================
	 MEASUREMENTS TABLE
	 ========================================================================= */
function MeasurementsTable({ measurements, onEdit, onDelete, editRowId, editRow, setEditRow, onSave, onCancel, saving, t }) {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(() => getStoredPerPage(10));
	const rows = useMemo(() => [...measurements].reverse(), [measurements]);
	useEffect(() => { setPage(1); }, [measurements]);
	const paged = useMemo(() => {
		const start = (page - 1) * limit;
		return rows.slice(start, start + limit);
	}, [rows, page, limit]);

	if (!measurements.length) return (
		<div className="flex flex-col items-center justify-center py-12 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
			<div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-slate-200">
				<Ruler className="h-7 w-7 text-slate-400" />
			</div>
			<p className="mt-4 text-sm font-bold text-slate-700">{t('messages.noMeasurements')}</p>
			<p className="mt-1 text-xs text-slate-500">{t('messages.startTracking')}</p>
		</div>
	);

	const inlineInput = (val, onChange, w = 'w-24') => (
		<input type="number"
			className={`${w} h-9 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]`}
			value={val} onChange={e => onChange(e.target.value)}
		/>
	);

	const columns = [
		{
			key: 'date',
			header: t('table.date'),
			cell: (m) => (editRowId === m.id
				? <input type="date" className="h-9 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]" value={editRow.date} onChange={e => setEditRow(s => ({ ...s, date: e.target.value }))} />
				: <span className="text-sm font-semibold text-slate-800">{m.date}</span>),
		},
		{
			key: 'weight',
			header: t('table.weight'),
			cell: (m) => (editRowId === m.id
				? inlineInput(editRow.weight, v => setEditRow(s => ({ ...s, weight: v })))
				: <span className="text-sm font-black text-slate-900">{m.weight ?? '-'} <span className="text-xs font-medium text-slate-400">{t('units.kg')}</span></span>),
		},
		{
			key: 'waist',
			header: t('table.waist'),
			cell: (m) => (editRowId === m.id
				? inlineInput(editRow.waist, v => setEditRow(s => ({ ...s, waist: v })))
				: <span className="text-sm text-slate-600">{m.waist ?? '-'} <span className="text-xs text-slate-400">{t('units.cm')}</span></span>),
		},
		{
			key: 'chest',
			header: t('table.chest'),
			cell: (m) => (editRowId === m.id
				? inlineInput(editRow.chest, v => setEditRow(s => ({ ...s, chest: v })))
				: <span className="text-sm text-slate-600">{m.chest ?? '-'} <span className="text-xs text-slate-400">{t('units.cm')}</span></span>),
		},
		{
			key: 'actions',
			header: t('table.actions'),
			cell: (m) => (editRowId === m.id ? (
				<div className="flex items-center justify-center gap-1.5">
					<button type="button" onClick={onSave} disabled={saving} className="h-8 w-8 flex items-center justify-center rounded-lg text-white shadow-md bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-primary-500)] hover:brightness-105 disabled:opacity-50 transition-all" title={t('actions.save')}>
						<Save className="h-3.5 w-3.5" />
					</button>
					<button type="button" onClick={onCancel} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-all text-slate-500" title={t('actions.cancel')}>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			) : (
				<div className="flex items-center justify-center gap-1.5">
					<button type="button" onClick={() => onEdit(m)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-200)] transition-all text-slate-500 hover:text-[var(--color-primary-600)]" title={t('actions.edit')}>
						<Edit3 className="h-3.5 w-3.5" />
					</button>
					<button type="button" onClick={() => onDelete(m.id)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-rose-100 bg-white hover:bg-rose-50 text-rose-400 hover:text-rose-600 hover:border-rose-200 transition-all" title={t('actions.delete')}>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>
			)),
		},
	];

	return (
		<DataTable
			hideToolbar
			compact
			columns={columns}
			data={paged}
			rowKey={(m, i) => m.id ?? i}
			perPageOptions={[10, 20, 30, 50]}
			pagination={{ current_page: page, per_page: limit, total_records: rows.length }}
			onPageChange={({ page: nextPage, per_page }) => {
				const nextLimit = Number(per_page);
				if (nextLimit) {
					setStoredPerPage(nextLimit);
					setLimit(nextLimit);
				}
				setPage(Number(nextPage ?? 1));
			}}
		/>
	);
}

/* =========================================================================
	 API HELPERS (unchanged logic)
	 ========================================================================= */
async function fetchMe() {
	try { const { data } = await api.get('/auth/me'); return data; } catch { return null; }
}
async function fetchPlanName(type, id) {
	if (!id) return null;
	try { const { data } = await api.get(type === 'exercise' ? `/plans/${id}` : `/nutrition/meal-plans/${id}`); return data?.name || null; } catch { return null; }
}
async function fetchCoach(id) {
	if (!id) return null;
	try { const { data } = await api.get(`/auth/profile/${id}`); return data; } catch { return null; }
}
async function getMeasurements(days = 120) { const { data } = await api.get('/profile/measurements', { params: { days } }); return Array.isArray(data) ? data : []; }
async function postMeasurement(payload) { const { data } = await api.post('/profile/measurements', payload); return data; }
async function putMeasurement(id, payload) { const { data } = await api.put(`/profile/measurements/${id}`, payload); return data; }
async function deleteMeasurement(id) { return api.delete(`/profile/measurements/${id}`); }
async function getPhotosTimeline(months = 12) { const { data } = await api.get('/profile/photos/timeline', { params: { months } }); return Array.isArray(data.records) ? data.records : []; }
async function deletePhotoSet(photoId) { return api.delete(`/profile/photos/${photoId}`); }

function createImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image(); img.setAttribute('crossOrigin', 'anonymous');
		img.addEventListener('load', () => resolve(img));
		img.addEventListener('error', reject);
		img.src = url;
	});
}
async function getCroppedImg(imageSrc, pixelCrop) {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const side = Math.max(pixelCrop.width, pixelCrop.height);
	canvas.width = side; canvas.height = side;
	ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, side, side);
	return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}
const blobToFile = (blob, name) => new File([blob], name, { type: blob.type });

/* =========================================================================
	 MAIN COMPONENT
	 ========================================================================= */
export default function ProfileOverviewPage() {
	const t = useTranslations('myProfile');
	const tBm = useTranslations('bodyMeasurement');
	const locale = useLocale();
	useTheme();

	useEffect(() => {
		const shell = document.querySelector('.dashboard-icy');
		const body = document.getElementById('body');
		const pane = document.querySelector('[data-dashboard-content]');
		const dark = document.documentElement.classList.contains('dark')
			|| document.documentElement.getAttribute('data-theme-mode') === 'dark';
		const color = dark ? '#0b1220' : '#ffffff';
		for (const el of [shell, body, pane]) {
			el?.style.setProperty('--gm-bg-image', 'none', 'important');
			el?.style.setProperty('background-image', 'none', 'important');
			el?.style.setProperty('background-color', color, 'important');
		}
		return () => {
			for (const el of [shell, body, pane]) {
				el?.style.removeProperty('--gm-bg-image');
				el?.style.removeProperty('background-image');
				el?.style.removeProperty('background-color');
			}
		};
	}, []);

	const [tab, setTab] = useState('overview');
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [measurements, setMeasurements] = useState([]);
	const [photoMonths, setPhotoMonths] = useState([]);

	const [editOpen, setEditOpen] = useState(false);
	const [photoPreview, setPhotoPreview] = useState(null);
	const [tipsOpen, setTipsOpen] = useState(false);
	const [compareAllOpen, setCompareAllOpen] = useState(false);
	const [compareAllIndex, setCompareAllIndex] = useState(0);
	const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState(null);
	const [confirmDeleteMeasurementId, setConfirmDeleteMeasurementId] = useState(null);
	const [cropOpen, setCropOpen] = useState(false);

	const [editForm, setEditForm] = useState({});
	const [savingProfile, setSavingProfile] = useState(false);

	const { control, handleSubmit, formState: { errors }, reset } = useForm({ defaultValues: { date: new Date(), weight: '', waist: '', chest: '' } });
	const [savingMeasure, setSavingMeasure] = useState(false);
	const [editRowId, setEditRowId] = useState(null);
	const [editRow, setEditRow] = useState({ date: '', weight: '', waist: '', chest: '' });
	const [savingEditRow, setSavingEditRow] = useState(false);

	const [showUploadBlock, setShowUploadBlock] = useState(false);
	const [pFront, setPFront] = useState(null);
	const [pBack, setPBack] = useState(null);
	const [pLeft, setPLeft] = useState(null);
	const [pRight, setPRight] = useState(null);
	const [pWeight, setPWeight] = useState('');
	const [pNote, setPNote] = useState('');
	const [pDate, setPDate] = useState(new Date());
	const [savingPhotos, setSavingPhotos] = useState(false);

	const [compare, setCompare] = useState({ side: 'front', beforeId: null, afterId: null });
	const [cropImageSrc, setCropImageSrc] = useState(null);
	const [cropSide, setCropSide] = useState(null);
	const [cropAreaPixels, setCropAreaPixels] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);

	const scrollerRef = useRef(null);

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const me = await fetchMe();
				if (!me) { setLoading(false); return; }
				const computedName = me?.name && String(me.name).includes('@') ? me.email?.split('@')[0] : me?.name;
				const [exName, mpName, coach] = await Promise.all([
					fetchPlanName('exercise', me?.activeExercisePlanId),
					fetchPlanName('meal', me?.activeMealPlanId),
					fetchCoach(me?.coachId),
				]);
				setUser({ ...me, name: computedName || me?.email || t('profile.user'), activeExercisePlan: exName ? { name: exName } : null, activeMealPlan: mpName ? { name: mpName } : null, coach: coach ? { id: coach.id, name: coach.name || coach.email } : null });
				const [mRes, pRes] = await Promise.allSettled([getMeasurements(120), getPhotosTimeline(12)]);
				if (mRes.status === 'fulfilled') setMeasurements((mRes.value || []).map(m => ({ id: m.id, date: m.date?.slice(0, 10) ?? m.date, weight: m.weight, waist: m.waist, chest: m.chest })));
				if (pRes.status === 'fulfilled') setPhotoMonths(Array.isArray(pRes.value) ? pRes.value : []);
			} catch (e) { console.error(e); }
			finally { setLoading(false); }
		})();
	}, [t]);

	const tabs = [
		{ key: 'overview', label: t('tabs.overview'), icon: Trophy },
		{ key: 'body', label: t('tabs.body'), icon: Ruler },
		{ key: 'aiMeasure', label: t('tabs.aiMeasure'), icon: ScanLine },
		{ key: 'photos', label: t('tabs.photos'), icon: Camera },
	];

	const openEditProfile = () => {
		setEditForm({ name: user?.name || '', phone: user?.phone || '', caloriesTarget: user?.caloriesTarget || '', proteinPerDay: user?.proteinPerDay || '', carbsPerDay: user?.carbsPerDay || '', fatsPerDay: user?.fatsPerDay || '' });
		setEditOpen(true);
	};

	const handleSaveProfile = async () => {
		setSavingProfile(true);
		try {
			const payload = {};
			Object.entries(editForm).forEach(([key, val]) => { if (val !== '') payload[key] = ['caloriesTarget', 'proteinPerDay', 'carbsPerDay', 'fatsPerDay'].includes(key) ? Number(val) : val; });
			const { data } = await api.put(`/auth/profile/${user.id}`, payload);
			setUser(prev => ({ ...prev, ...(data || payload) }));
			setEditOpen(false);
		} catch (e) { console.error(e); }
		finally { setSavingProfile(false); }
	};

	async function addMeasurement(form) {
		setSavingMeasure(true);
		try {
			const payload = { date: toISODate(form.date), weight: form.weight ? Number(form.weight) : undefined, waist: form.waist ? Number(form.waist) : undefined, chest: form.chest ? Number(form.chest) : undefined };
			const created = await postMeasurement(payload);
			setMeasurements(prev => [...prev, { id: created?.id || `local-${Date.now()}`, ...payload }]);
			reset({ date: new Date(), weight: '', waist: '', chest: '' });
		} finally { setSavingMeasure(false); }
	}

	function startEditRow(m) { setEditRowId(m.id); setEditRow({ date: m.date || '', weight: m.weight ?? '', waist: m.waist ?? '', chest: m.chest ?? '' }); }

	async function saveEditRow() {
		if (!editRowId) return;
		setSavingEditRow(true);
		try {
			const payload = { date: editRow.date, weight: editRow.weight ? Number(editRow.weight) : undefined, waist: editRow.waist ? Number(editRow.waist) : undefined, chest: editRow.chest ? Number(editRow.chest) : undefined };
			await putMeasurement(editRowId, payload);
			setMeasurements(prev => prev.map(m => m.id === editRowId ? { ...m, ...payload } : m));
			setEditRowId(null);
		} finally { setSavingEditRow(false); }
	}

	async function confirmDeleteMeasurement() {
		if (!confirmDeleteMeasurementId) return;
		await deleteMeasurement(confirmDeleteMeasurementId);
		setMeasurements(prev => prev.filter(m => m.id !== confirmDeleteMeasurementId));
		setConfirmDeleteMeasurementId(null);
	}

	function onPickSideFile(side, file) {
		if (!file) return;
		setCropSide(side); setCropImageSrc(URL.createObjectURL(file)); setZoom(1); setCrop({ x: 0, y: 0 }); setCropOpen(true);
	}

	async function applyCrop() {
		if (!cropImageSrc || !cropAreaPixels || !cropSide) return;
		const blob = await getCroppedImg(cropImageSrc, cropAreaPixels);
		const f = blobToFile(blob, `${cropSide}-${Date.now()}.jpg`);
		({ front: setPFront, back: setPBack, left: setPLeft, right: setPRight })[cropSide]?.(f);
		setCropOpen(false);
		URL.revokeObjectURL(cropImageSrc);
		setCropImageSrc(null);
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
			formData.append('data', JSON.stringify({ takenAt: toISODate(pDate), weight: pWeight ? Number(pWeight) : null, note: pNote || '' }));
			const { data: newPhoto } = await api.post('/profile/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
			setPhotoMonths(prev => [{ id: newPhoto.id, takenAt: newPhoto.takenAt, weight: newPhoto.weight, note: newPhoto.note, sides: newPhoto.sides }, ...prev]);
			setPFront(null); setPBack(null); setPLeft(null); setPRight(null); setPWeight(''); setPNote(''); setShowUploadBlock(false);
		} finally { setSavingPhotos(false); }
	};

	async function confirmDeletePhotoSet() {
		if (!confirmDeletePhotoId) return;
		await deletePhotoSet(confirmDeletePhotoId);
		setPhotoMonths(prev => prev.filter(p => p.id !== confirmDeletePhotoId));
		setConfirmDeletePhotoId(null);
	}

	const sideOptions = useMemo(() => [
		{ id: 'all', label: t('sides.all') },
		{ id: 'front', label: t('sides.front') },
		{ id: 'back', label: t('sides.back') },
		{ id: 'left', label: t('sides.left') },
		{ id: 'right', label: t('sides.right') },
	], [t]);

	const photoSetOptions = useMemo(() => photoMonths.map(p => ({ id: String(p.id), label: `${p.takenAt} (${p.weight ?? '-'} ${t('units.kg')})` })), [photoMonths, t]);
	const findPhotoById = id => photoMonths.find(p => p.id === id);
	const leftSrc = () => compare.beforeId ? findPhotoById(compare.beforeId)?.sides?.[compare.side] : '';
	const rightSrc = () => compare.afterId ? findPhotoById(compare.afterId)?.sides?.[compare.side] : '';
	const allSides = ['front', 'back', 'left', 'right'];
	const openAllCompare = () => { if (!compare.beforeId || !compare.afterId) return; setCompareAllIndex(0); setCompareAllOpen(true); };

	if (loading) return (
		<div data-plain-page="1" className="report-phone -mx-[var(--app-gutter)] min-h-full bg-white px-[var(--app-gutter)] pt-1 dark:bg-[#0b1220]">
			<LoadingSkeleton />
		</div>
	);

	const leftDaysVal = daysLeft(user?.subscriptionEnd);
	const leftDaysLabel = leftDaysVal == null ? t('profile.noEndDate') : leftDaysVal <= 0 ? t('profile.expired') : `${leftDaysVal} ${t('profile.daysLeft')}`;
	const isExpiringSoon = leftDaysVal != null && leftDaysVal > 0 && leftDaysVal <= 7;

	return (
		<div data-plain-page="1" className="report-phone -mx-[var(--app-gutter)] min-h-full bg-white px-[var(--app-gutter)] pt-1 dark:bg-[#0b1220]">
			<div className="mx-auto w-full max-w-[440px] space-y-4">
			<div className="m-[5px] rounded-3xl shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]">
				<div
					className="relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-s-white/30 border-e-[rgba(15,34,128,0.35)] border-b-[rgba(15,34,128,0.45)] pb-3"
					style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), #1a3fbf)' }}
				>
					<div className="pointer-events-none absolute -start-16 -top-10 h-[280px] w-[280px] rounded-full bg-white/[0.06]" />
					<div className="pointer-events-none absolute -end-12 -bottom-10 h-[200px] w-[200px] rounded-full bg-white/[0.04]" />
					<div className="relative flex items-center gap-3 p-4 pb-2">
						<div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white">
							<UserIcon className="h-5 w-5" />
							<span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-(--color-primary-700) bg-emerald-400" />
						</div>
						<div className="min-w-0 flex-1">
							<h1 className="truncate text-xl font-black leading-6 tracking-[-0.3px] text-white">{user?.name || t('profile.user')}</h1>
							<p className="mt-0.5 truncate text-[10px] font-medium text-white/55">{user?.email}</p>
						</div>
						<button type="button" onClick={openEditProfile} aria-label={t('actions.edit')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-t-white/45 border-b-[rgba(15,48,120,0.35)] bg-white/15 text-white">
							<Edit3 className="h-[18px] w-[18px]" />
						</button>
					</div>
					<div className="mx-4 mb-2 h-px bg-white/20" />
					<div className="flex gap-1.5 px-4 pb-2">
						{tabs.map(({ key, label }) => {
							const on = tab === key;
							return (
								<button key={key} type="button" onClick={() => setTab(key)} className={`h-9 min-w-0 flex-1 truncate rounded-2xl px-1 text-[11px] font-bold ${on ? 'border border-white/90 bg-white text-(--color-primary-700) shadow-[2px_4px_7px_rgba(30,58,138,0.35)]' : 'border border-white/30 bg-white/10 text-white/70'}`}>
									{label}
								</button>
							);
						})}
					</div>
					<div className="space-y-1.5 px-4">
						<div className="flex gap-1.5">
							<HeaderStatPill label={t('stats.membership')} value={user?.membership || t('profile.basic')} icon={Award} />
							<HeaderStatPill label={t('stats.coach')} value={user?.coach?.name || t('profile.noCoach')} icon={User2} />
						</div>
						<div className="flex gap-1.5">
							<HeaderStatPill label={t('stats.exercisePlan')} value={user?.activeExercisePlan?.name || t('profile.none')} icon={Dumbbell} />
							<HeaderStatPill label={t('stats.mealPlan')} value={user?.activeMealPlan?.name || t('profile.none')} icon={Apple} />
						</div>
					</div>
				</div>
			</div>

			{/* ═══════════════════════ CONTENT ═══════════════════════ */}
			<div className="space-y-4">
				<AnimatePresence mode="wait">

					{/* ── OVERVIEW TAB ── */}
					{tab === 'overview' && (
						<motion.div key="overview" variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-4">

							<NutritionGoalsCard user={user} t={t} />
							<motion.div variants={staggerItem} className={card + ' overflow-hidden'}>
								<div className="px-4 pt-4">
									<SectionHeader icon={UserIcon} title={t('sections.personalInfo.title')} subtitle={t('sections.personalInfo.subtitle')} />
								</div>
								<div>
									{[
										{ icon: UserIcon, label: t('profile.name'), value: user?.name, color: '#3b82f6', bg: '#eff6ff' },
										{ icon: Info, label: t('fields.email'), value: user?.email, color: '#64748b', bg: '#f8fafc' },
										{ icon: Activity, label: t('profile.phone'), value: user?.phone, color: '#10b981', bg: '#f0fdf4' },
										{ icon: User2, label: t('fields.gender'), value: user?.gender === 'male' ? t('gender.male') : user?.gender === 'female' ? t('gender.female') : user?.gender, color: '#8b5cf6', bg: '#f5f3ff' },
										{ icon: Calendar, label: t('table.birthDate'), value: user?.birthDate ? new Date(user.birthDate).toLocaleDateString() : '', color: '#f59e0b', bg: '#fffbeb' },
										{ icon: Award, label: t('stats.membership'), value: user?.membership, color: '#f97316', bg: '#fff7ed' },
									].filter((row) => row.value).map((row, i, arr) => (
										<div key={row.label} className={`flex items-center gap-3 px-4 py-3 ${i === arr.length - 1 ? '' : 'border-b border-slate-100'}`}>
											<div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-2xl shadow-[2px_2px_4px_rgba(100,116,139,0.18)]" style={{ background: row.bg, color: row.color }}>
												<row.icon size={15} />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-[11px] text-slate-400">{row.label}</p>
												<p className="truncate text-[13px] font-semibold text-slate-800">{row.value}</p>
											</div>
										</div>
									))}
								</div>
							</motion.div>



							{measurements.length > 0 && (
								<motion.div variants={staggerItem} className={card + ' p-4'}>
									<WeightTrendChart data={measurements} t={t} />
								</motion.div>
							)}
						</motion.div>
					)}

					{/* ── AI BODY SCAN TAB (client role) ── */}
					{tab === 'aiMeasure' && user?.id && (
						<motion.div key="aiMeasure" {...fadeUp} className="space-y-4">
							<BodyMeasurementFlow userId={user.id} t={tBm} />
						</motion.div>
					)}

					{/* ── BODY TAB ── */}
					{tab === 'body' && (
						<motion.div key="body" {...fadeUp} className="flex flex-col gap-4">
							{/* add measurement form */}
							<div className={card + ' p-4'}>
								<SectionHeader icon={Plus} title={t('forms.addMeasurement')} subtitle={t('messages.trackYourMeasurements')} />
								<form onSubmit={handleSubmit(addMeasurement)} className="space-y-3">
									<div className="grid grid-cols-2 gap-2.5">
										<Controller name="date" control={control} render={({ field }) => (
											<input
												type="date"
												aria-label={t('forms.date')}
												className="h-[46px] w-full rounded-2xl bg-[#e4eaf3] px-3 text-sm text-slate-800 shadow-[inset_2px_2px_5px_rgba(100,116,139,0.28)] outline-none"
												value={field.value instanceof Date && !Number.isNaN(field.value.getTime()) ? field.value.toISOString().slice(0, 10) : ''}
												onChange={e => field.onChange(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
											/>
										)} />
										<Controller name="weight" control={control} rules={{ required: t('errors.required') }} render={({ field }) => (
											<Input placeholder={t('forms.weightKg')} cnInputParent={neuInput} {...field} error={errors.weight?.message} />
										)} />
										<Controller name="waist" control={control} render={({ field }) => <Input placeholder={t('forms.waistCm')} cnInputParent={neuInput} {...field} />} />
										<Controller name="chest" control={control} render={({ field }) => <Input placeholder={t('forms.chestCm')} cnInputParent={neuInput} {...field} />} />
									</div>
									<Btn type="submit" variant="primary" disabled={savingMeasure} className="!h-[50px] w-full !rounded-2xl" icon={Plus}>
										{savingMeasure ? t('actions.saving') : t('actions.save')}
									</Btn>
								</form>
							</div>

							{/* measurements table — spans 2 cols */}
							<div className={card + ' p-5 sm:p-6 lg:col-span-2'}>
								<SectionHeader icon={Ruler} title={t('sections.measurements')} subtitle={t('messages.measurementHistory')} />
								<MeasurementsTable
									measurements={measurements}
									onEdit={startEditRow}
									onDelete={id => setConfirmDeleteMeasurementId(id)}
									editRowId={editRowId}
									editRow={editRow}
									setEditRow={setEditRow}
									onSave={saveEditRow}
									onCancel={() => setEditRowId(null)}
									saving={savingEditRow}
									t={t}
								/>
							</div>
						</motion.div>
					)}

					{/* ── PHOTOS TAB ── */}
					{tab === 'photos' && (
						<motion.div key="photos" {...fadeUp} className="flex flex-col gap-4">

							{/* upload panel */}
							<div className={card + ' p-5 sm:p-6'}>
								<SectionHeader
									icon={Camera}
									title={t('sections.uploadBodyPhotos')}
									subtitle={t('messages.uploadProgressPhotos')}
									action={
										<button onClick={() => setTipsOpen(true)}
											className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500">
											<Info className="h-4 w-4" />
										</button>
									}
								/>

								<button type="button" onClick={() => setShowUploadBlock(s => !s)} className="mb-3 flex w-full flex-col items-center rounded-2xl border-[1.5px] border-dashed border-slate-200 bg-[#fafafa] px-4 py-6 text-center">
									<span className="mb-3 grid h-[60px] w-[60px] place-items-center rounded-2xl bg-[#eef2f9] text-(--color-primary-500) shadow-[3px_3px_6px_rgba(100,116,139,0.22)]">
										<Upload className="h-6 w-6" />
									</span>
									<span className="text-[13px] font-bold text-slate-600">{showUploadBlock ? t('actions.hideUpload') : t('actions.addBodyPhotos')}</span>
									<span className="mt-1 text-[11px] text-slate-400">{t('messages.uploadProgressPhotos')}</span>
								</button>

								<AnimatePresence>
									{showUploadBlock && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											className="space-y-4 overflow-hidden"
										>
											{/* photo grid */}
											<div className="grid grid-cols-2 gap-2.5">
												{[
													{ key: 'front', label: t('sides.front'), file: pFront, setter: setPFront },
													{ key: 'back', label: t('sides.back'), file: pBack, setter: setPBack },
													{ key: 'left', label: t('sides.left'), file: pLeft, setter: setPLeft },
													{ key: 'right', label: t('sides.right'), file: pRight, setter: setPRight },
												].map(({ key, label, file, setter }) => (
													<div key={key}
														className="relative rounded-lg border-2 border-dashed border-[var(--color-primary-200)] bg-[var(--color-primary-50)] aspect-square overflow-hidden transition-all hover:border-[var(--color-primary-400)]">
														{!file ? (
															<label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center gap-1.5 hover:bg-[var(--color-primary-100)]/50 transition-colors">
																<div className="h-9 w-9 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-100">
																	<ImagePlus className="h-4 w-4 text-[var(--color-primary-500)]" />
																</div>
																<span className="text-[11px] font-bold text-[var(--color-primary-600)]">{label}</span>
																<input type="file" accept="image/*" className="hidden" onChange={e => onPickSideFile(key, e.target.files?.[0])} />
															</label>
														) : (
															<>
																<img src={URL.createObjectURL(file)} alt={label} className="absolute inset-0 w-full h-full object-cover" />
																<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
																<span className="absolute bottom-2 start-2 text-[10px] font-bold text-white">{label}</span>
																<button onClick={() => setter(null)}
																	className="absolute top-2 end-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
																	<X className="h-3.5 w-3.5" />
																</button>
															</>
														)}
													</div>
												))}
											</div>

											<div className="space-y-2.5">
												<input type="date" aria-label={t('forms.date')} className="h-[46px] w-full rounded-2xl bg-[#e4eaf3] px-3 text-sm text-slate-800 shadow-[inset_2px_2px_5px_rgba(100,116,139,0.28)] outline-none" value={pDate instanceof Date && !Number.isNaN(pDate.getTime()) ? pDate.toISOString().slice(0, 10) : ''} onChange={e => setPDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : new Date())} />
												<Input placeholder={t('forms.weightOptional')} cnInputParent={neuInput} value={pWeight} onChange={setPWeight} />
												<Input placeholder={t('forms.noteOptional')} cnInputParent={neuInput} value={pNote} onChange={setPNote} />
											</div>

											<Btn variant="primary" className="w-full" disabled={savingPhotos || (!pFront && !pBack && !pLeft && !pRight)} icon={Save} onClick={savePhotoSet}>
												{savingPhotos ? t('actions.saving') : t('actions.saveSet')}
											</Btn>
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* timeline */}
							<div className={card + ' lg:col-span-2 p-5 sm:p-6'}>
								<SectionHeader
									icon={ImageIcon}
									title={t('sections.timeline')}
									subtitle={t('messages.photoHistory')}
									action={
										<div className="flex gap-1.5">
											{[
												{ fn: () => scrollerRef.current?.scrollBy({ left: -320, behavior: 'smooth' }), icon: ChevronsLeft, label: t('actions.scrollLeft') },
												{ fn: () => scrollerRef.current?.scrollBy({ left: 320, behavior: 'smooth' }), icon: ChevronsRight, label: t('actions.scrollRight') },
											].map(({ fn, icon: I, label }) => (
												<button key={label} onClick={fn} aria-label={label}
													className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
													<I className="rtl:scale-x-[-1] h-4 w-4" />
												</button>
											))}
										</div>
									}
								/>

								{!photoMonths.length ? (
									<div className="flex flex-col items-center justify-center py-14 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
										<ImagePlus className="h-11 w-11 text-slate-300 mb-3" />
										<p className="text-sm font-semibold text-slate-500 mb-4">{t('messages.noTimeline')}</p>
										<Btn variant="primary" icon={Upload} onClick={() => setShowUploadBlock(true)}>{t('actions.addBodyPhotos')}</Btn>
									</div>
								) : (
									<div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:thin]">
										{photoMonths.map(entry => (
											<div key={entry.id}
												className="min-w-[300px] snap-start rounded-lg border border-slate-100 bg-white p-4 shadow-sm hover:shadow-lg transition-all duration-300">
												{/* entry header */}
												<div className="flex items-center justify-between mb-3">
													<div>
														<p className="text-sm font-black text-slate-900">{entry.takenAt}</p>
														{entry.note && <p className="text-xs text-slate-400 truncate max-w-[160px]">{entry.note}</p>}
													</div>
													<div className="flex items-center gap-2">
														<div className="flex items-center gap-1 bg-[var(--color-primary-50)] rounded-lg px-2.5 py-1.5 border border-[var(--color-primary-100)]">
															<Scale className="h-3 w-3 text-[var(--color-primary-500)]" />
															<span className="text-xs font-black text-[var(--color-primary-700)]">{entry.weight ?? '-'}</span>
															<span className="text-[9px] text-[var(--color-primary-500)]">{t('units.kg')}</span>
														</div>
														<button onClick={() => setConfirmDeletePhotoId(entry.id)}
															className="h-7 w-7 flex items-center justify-center rounded-lg border border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all">
															<Trash2 className="h-3.5 w-3.5" />
														</button>
													</div>
												</div>
												{/* photo grid */}
												<div className="grid grid-cols-2 gap-1.5">
													{['front', 'back', 'left', 'right'].map(side => (
														<button key={side}
															onClick={() => setPhotoPreview({ src: entry.sides?.[side], label: `${entry.takenAt} — ${t(`sides.${side}`)}` })}
															className="group relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 aspect-square transition-all hover:border-[var(--color-primary-300)] hover:shadow-md"
														>
															<Img src={entry.sides?.[side]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={t(`sides.${side}`)} />
															<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
															<span className="absolute bottom-1 start-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{t(`sides.${side}`)}</span>
														</button>
													))}
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							<div className={card + ' p-4'}>
								<SectionHeader icon={ImageIcon} title={t('sections.compare')} subtitle={t('messages.compareHint')} />
								<div className="space-y-2">
									<Select searchable={false} cnInputParent={neuInput} options={sideOptions} value={compare.side} onChange={val => setCompare(s => ({ ...s, side: String(val) }))} placeholder={t('labels.side')} />
									<Select searchable={false} cnInputParent={neuInput} options={photoSetOptions} value={compare.beforeId || ''} onChange={val => setCompare(s => ({ ...s, beforeId: String(val) }))} placeholder={t('labels.before')} clearable />
									<Select searchable={false} cnInputParent={neuInput} options={photoSetOptions} value={compare.afterId || ''} onChange={val => setCompare(s => ({ ...s, afterId: String(val) }))} placeholder={t('labels.after')} clearable />
									<Btn variant="primary" className="!h-[50px] w-full !rounded-2xl" disabled={!compare.beforeId || !compare.afterId} onClick={() => compare.side === 'all' ? openAllCompare() : setPhotoPreview({ before: leftSrc(), after: rightSrc() })}>
										{t('actions.preview')}
									</Btn>
								</div>
								{compare.beforeId && compare.afterId && compare.side !== 'all' && (
									<div className="mt-3 overflow-hidden rounded-2xl">
										<BeforeAfter before={leftSrc()} after={rightSrc()} name="progress" t={t} />
									</div>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<div className={card + ' p-4'}>
					<SectionHeader icon={Shield} title={t('legal.title')} subtitle={t('legal.subtitle')} />
					<div className="space-y-2">
						{[
							{ href: `/${locale}/privacy`, icon: Shield, label: t('legal.privacy') },
							{ href: `/${locale}/policy`, icon: FileText, label: t('legal.terms') },
						].map((item) => (
							<Link key={item.href} href={item.href} className="flex items-center justify-between rounded-2xl border border-white/80 bg-[#eef2f9] px-3.5 py-3 shadow-[3px_3px_6px_rgba(100,116,139,0.18)]">
								<span className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-900">
									<item.icon size={16} className="text-(--color-primary-600)" />
									{item.label}
								</span>
								<ChevronRight size={16} className="text-slate-400 rtl:scale-x-[-1]" />
							</Link>
						))}
					</div>
				</div>
			</div>

			{/* ═══════════════════════ MODALS ═══════════════════════ */}
			<Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} title={photoPreview?.label} maxW="max-w-4xl">
				{photoPreview?.src
					? <div className="rounded-lg overflow-hidden"><Img src={photoPreview.src} alt={photoPreview.label} className="w-full" /></div>
					: photoPreview?.before && photoPreview?.after
						? <BeforeAfter before={photoPreview.before} after={photoPreview.after} name="preview" t={t} />
						: null
				}
			</Modal>

			<Modal open={compareAllOpen} onClose={() => setCompareAllOpen(false)} title={t('labels.beforeAfter')} maxW="max-w-4xl">
				<div className="flex items-center justify-between mb-4">
					<span className="text-lg font-black capitalize">{t(`sides.${allSides[compareAllIndex]}`)}</span>
					<div className="flex gap-2">
						<Btn variant="outline" size="sm" onClick={() => setCompareAllIndex(i => (i + 3) % 4)}><ChevronsLeft className=" rtl:scale-x-[-1] h-4 w-4" /></Btn>
						<Btn variant="outline" size="sm" onClick={() => setCompareAllIndex(i => (i + 1) % 4)}><ChevronsRight className=" rtl:scale-x-[-1] h-4 w-4" /></Btn>
					</div>
				</div>
				<BeforeAfter
					before={findPhotoById(compare.beforeId)?.sides?.[allSides[compareAllIndex]] || ''}
					after={findPhotoById(compare.afterId)?.sides?.[allSides[compareAllIndex]] || ''}
					name="all-sides" t={t}
				/>
			</Modal>

			<Modal open={tipsOpen} onClose={() => setTipsOpen(false)} title={t('modals.photographyTipsTitle')} maxW="max-w-2xl">
				<div className="space-y-3">
					{['lighting', 'distance', 'angles', 'cameraHeight', 'timer', 'clothes', 'background', 'frequency'].map(key => (
						<div key={key} className="flex gap-3 p-3.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] border border-[var(--color-primary-100)]">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-400)] text-white shrink-0 shadow-sm">
								<Lightbulb className="h-4 w-4" />
							</div>
							<p className="text-sm text-slate-700 md: leading-relaxed">{t(`tips.${key}`)}</p>
						</div>
					))}
				</div>
			</Modal>

			<Modal open={!!confirmDeletePhotoId} onClose={() => setConfirmDeletePhotoId(null)} title={t('modals.confirmDeleteTitle')} maxW="max-w-md">
				<p className="text-sm text-slate-600 mb-6 md: leading-relaxed">{t('messages.deletePhotoConfirm')}</p>
				<div className="flex gap-3">
					<Btn variant="danger" onClick={confirmDeletePhotoSet} className="flex-1">{t('actions.delete')}</Btn>
					<Btn variant="outline" onClick={() => setConfirmDeletePhotoId(null)} className="flex-1">{t('actions.cancel')}</Btn>
				</div>
			</Modal>

			<Modal open={!!confirmDeleteMeasurementId} onClose={() => setConfirmDeleteMeasurementId(null)} title={t('modals.confirmDeleteTitle')} maxW="max-w-md">
				<p className="text-sm text-slate-600 mb-6 md: leading-relaxed">{t('messages.deleteMeasurementConfirm')}</p>
				<div className="flex gap-3">
					<Btn variant="danger" onClick={confirmDeleteMeasurement} className="flex-1">{t('actions.delete')}</Btn>
					<Btn variant="outline" onClick={() => setConfirmDeleteMeasurementId(null)} className="flex-1">{t('actions.cancel')}</Btn>
				</div>
			</Modal>

			<Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('modals.editProfileTitle')} maxW="max-w-2xl">
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Input placeholder={t('profile.name')} value={editForm.name || ''} onChange={val => setEditForm(f => ({ ...f, name: val }))} />
						<Input placeholder={t('profile.phone')} value={editForm.phone || ''} onChange={val => setEditForm(f => ({ ...f, phone: val }))} />
					</div>
					<div className="rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] p-4">
						<p className="text-xs font-black text-[var(--color-primary-600)] uppercase tracking-wider mb-3">{t('profile.nutritionTargets')}</p>
						<div className="grid grid-cols-2 gap-3">
							<Input placeholder={t('profile.caloriesTarget')} type="number" value={editForm.caloriesTarget || ''} onChange={val => setEditForm(f => ({ ...f, caloriesTarget: val }))} />
							<Input placeholder={t('profile.proteinPerDay')} type="number" value={editForm.proteinPerDay || ''} onChange={val => setEditForm(f => ({ ...f, proteinPerDay: val }))} />
							<Input placeholder={t('profile.carbsPerDay')} type="number" value={editForm.carbsPerDay || ''} onChange={val => setEditForm(f => ({ ...f, carbsPerDay: val }))} />
							<Input placeholder={t('profile.fatsPerDay')} type="number" value={editForm.fatsPerDay || ''} onChange={val => setEditForm(f => ({ ...f, fatsPerDay: val }))} />
						</div>
					</div>
					<Btn variant="primary" onClick={handleSaveProfile} disabled={savingProfile} className="w-full" icon={Save}>
						{savingProfile ? t('actions.saving') : t('actions.save')}
					</Btn>
				</div>
			</Modal>

			<Modal open={cropOpen} onClose={() => setCropOpen(false)} title={t('modals.cropImageTitle')} maxW="max-w-3xl">
				{cropImageSrc && (
					<div className="space-y-4">
						<div className="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden">
							<Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, p) => setCropAreaPixels(p)} cropShape="rect" objectFit="contain" />
						</div>
						<div className="flex items-center gap-4 px-1">
							<span className="text-xs font-semibold text-slate-600 shrink-0">{t('labels.zoom')}</span>
							<input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--color-primary-500)]" />
							<span className="text-xs font-bold text-slate-800 shrink-0 w-8">{zoom.toFixed(1)}×</span>
						</div>
						<div className="flex gap-3">
							<Btn variant="primary" onClick={applyCrop} className="flex-1">{t('actions.apply')}</Btn>
							<Btn variant="outline" onClick={() => setCropOpen(false)} className="flex-1">{t('actions.cancel')}</Btn>
						</div>
					</div>
				)}
			</Modal>
			</div>
		</div>
	);
}