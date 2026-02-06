/* 
	Enhanced Settings Page with Theme Integration
*/

'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Info,
	Save,
	Link2,
	Loader2,
	Upload as UploadIcon,
	Radio,
	Palette,
	BellRing,
	Globe,
	Sparkles,
	Check as CheckIcon,
	ChevronDown,
	X,
	Trash2,
	Eye,
	EyeOff,
	Plus,
	Zap,
} from 'lucide-react';
import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import Textarea from '@/components/atoms/Textarea';
import { Switcher } from '@/components/atoms/Switcher';
import DhikrLoading from '@/components/molecules/DhikrLoading';
import api from '@/utils/axios';
import { useTheme, COLOR_PALETTES } from '@/app/[locale]/theme';

/* ============================================================================
   ANIMATION CONFIGS
   ============================================================================ */
const spring = { type: 'spring', stiffness: 400, damping: 30 };
const smoothSpring = { type: 'spring', stiffness: 300, damping: 28 };

/* ============================================================================
   ENHANCED UI PRIMITIVES
   ============================================================================ */

const CardShell = ({ title, desc, right, open, onToggle, children, icon: Icon }) => (
	<motion.div
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		className="rounded-2xl border-2 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden relative"
		style={{
			borderColor: 'var(--color-primary-200)',
			boxShadow: '0 20px 60px -15px rgba(15, 23, 42, 0.15)',
		}}>
		{/* Floating particles background */}
		<div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
			<motion.div
				className="absolute w-32 h-32 rounded-full blur-3xl"
				style={{
					background: 'var(--color-gradient-from)',
					top: '-10%',
					right: '10%',
				}}
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.3, 0.5, 0.3],
				}}
				transition={{
					duration: 4,
					repeat: Infinity,
					ease: 'easeInOut',
				}}
			/>
		</div>

		<button
			onClick={onToggle}
			className="w-full relative z-10 grid grid-cols-[auto_1fr_auto] items-center gap-4 p-5 border-b-2 transition-all duration-200 group hover:bg-gradient-to-r"
			style={{
				borderColor: 'var(--color-primary-100)',
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = `linear-gradient(90deg, var(--color-primary-50), transparent)`;
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = 'transparent';
			}}>
			{/* Icon */}
			{Icon && (
				<div
					className="w-12 h-12 rounded-xl grid place-content-center text-white shadow-lg"
					style={{
						background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					}}>
					<Icon className="w-6 h-6" strokeWidth={2.5} />
				</div>
			)}

			{/* Text */}
			<div className="text-left rtl:text-right min-w-0">
				<h3 className="text-slate-900 font-bold text-lg">{title}</h3>
				{desc ? <p className="text-slate-500 text-sm mt-0.5">{desc}</p> : null}
			</div>

			{/* Right section */}
			<div className="flex items-center gap-3">
				{right}
				<motion.div
					animate={{ rotate: open ? 180 : 0 }}
					transition={spring}
					className="w-8 h-8 rounded-lg grid place-content-center"
					style={{ backgroundColor: 'var(--color-primary-100)' }}>
					<ChevronDown className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} strokeWidth={2.5} />
				</motion.div>
			</div>
		</button>

		<AnimatePresence initial={false}>
			{open ? (
				<motion.div
					key="content"
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: 'auto', opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={smoothSpring}
					className="overflow-hidden">
					<div className="p-6 relative z-10">{children}</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	</motion.div>
);

const Row = ({ label, hint, children }) => (
	<div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b last:border-b-0" style={{ borderColor: 'var(--color-primary-100)' }}>
		<div>
			<div className="text-sm font-bold text-slate-800">{label}</div>
			{hint ? <div className="text-xs text-slate-500 mt-1 leading-relaxed">{hint}</div> : null}
		</div>
		<div className="md:col-span-2">{children}</div>
	</div>
);

const Button = ({ children, color = 'primary', className = '', loading = false, ...props }) => {
	const getStyles = () => {
		switch (color) {
			case 'primary':
				return {
					background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					color: 'white',
					boxShadow: '0 4px 12px -2px var(--color-primary-500)',
				};
			case 'neutral':
				return {
					backgroundColor: 'var(--color-primary-50)',
					color: 'var(--color-primary-700)',
				};
			case 'danger':
				return {
					background: 'linear-gradient(135deg, #ef4444, #dc2626)',
					color: 'white',
					boxShadow: '0 4px 12px -2px #ef4444',
				};
			default:
				return {};
		}
	};

	return (
		<motion.button
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			{...props}
			className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
			style={getStyles()}>
			{loading && (
				<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
					<Loader2 className="w-4 h-4" />
				</motion.div>
			)}
			{children}
		</motion.button>
	);
};

const Chip = ({ children, icon: Icon }) => (
	<span
		className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border-2"
		style={{
			backgroundColor: 'var(--color-primary-50)',
			color: 'var(--color-primary-700)',
			borderColor: 'var(--color-primary-200)',
		}}>
		{Icon && <Icon className="w-3.5 h-3.5" />}
		{children}
	</span>
);

const Help = ({ children }) => (
	<div
		className="flex items-start gap-3 text-xs rounded-xl p-3 border-2"
		style={{
			backgroundColor: 'var(--color-primary-50)',
			borderColor: 'var(--color-primary-200)',
			color: 'var(--color-primary-700)',
		}}>
		<Info className="w-4 h-4 shrink-0 mt-0.5" />
		<div>{children}</div>
	</div>
);

/* ============================================================================
   MODAL COMPONENT
   ============================================================================ */
const Modal = ({ open, onClose, children, title }) => {
	if (!open) return null;

	return (
		<AnimatePresence>
			<div className="fixed inset-0 z-[60]">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="absolute inset-0 bg-black/50 backdrop-blur-sm"
					onClick={onClose}
				/>
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					transition={spring}
					className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(880px,96vw)] rounded-2xl bg-white shadow-2xl border-2 overflow-hidden"
					style={{
						borderColor: 'var(--color-primary-200)',
					}}>
					{title && (
						<div
							className="px-6 py-4 border-b-2 flex items-center justify-between"
							style={{
								borderColor: 'var(--color-primary-100)',
								background: `linear-gradient(90deg, var(--color-primary-50), transparent)`,
							}}>
							<h3 className="text-lg font-bold text-slate-900">{title}</h3>
							<motion.button
								whileHover={{ scale: 1.1, rotate: 90 }}
								whileTap={{ scale: 0.9 }}
								onClick={onClose}
								className="w-8 h-8 rounded-lg grid place-content-center transition-colors"
								style={{ backgroundColor: 'var(--color-primary-100)' }}>
								<X className="w-4 h-4" style={{ color: 'var(--color-primary-600)' }} />
							</motion.button>
						</div>
					)}
					<div className="p-6">{children}</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
};

/* ============================================================================
   UPLOAD BOX
   ============================================================================ */
function UploadBox({ file, onFile, previewUrl, onClear, label }) {
	const [isDragging, setIsDragging] = useState(false);

	const onDrop = (e) => {
		e.preventDefault();
		setIsDragging(false);
		const f = e.dataTransfer.files?.[0];
		if (f) onFile(f);
	};

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={onDrop}
			className={`rounded-xl border-2 border-dashed transition-all duration-200 p-6 ${
				isDragging ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]' : 'border-slate-300 bg-slate-50/60'
			}`}>
			{!file ? (
				<label className="flex flex-col items-center gap-3 cursor-pointer">
					<div
						className="w-16 h-16 rounded-xl grid place-content-center"
						style={{
							background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
						}}>
						<UploadIcon className="w-8 h-8 text-white" strokeWidth={2.5} />
					</div>
					<div className="text-sm font-semibold text-slate-700 text-center">{label}</div>
					<div className="text-xs text-slate-500">or drag and drop</div>
					<input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
				</label>
			) : (
				<div className="flex items-center gap-4">
					{previewUrl ? (
						<div className="w-32 h-24 overflow-hidden rounded-xl border-2 bg-white shadow-lg" style={{ borderColor: 'var(--color-primary-200)' }}>
							<img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
						</div>
					) : null}
					<div className="flex-1 min-w-0">
						<div className="text-sm font-bold text-slate-900 truncate">{file.name}</div>
						<div className="text-xs text-slate-500 mt-1">{Math.round(file.size / 1024)} KB</div>
					</div>
					<Button color="danger" onClick={onClear}>
						<Trash2 className="w-4 h-4" />
						Remove
					</Button>
				</div>
			)}
		</div>
	);
}

/* ============================================================================
   COLOR PALETTE SELECTOR
   ============================================================================ */
function PaletteSelector({ value, onChange }) {
	const [open, setOpen] = useState(false);
	const { colors } = useTheme();

	return (
		<div className="relative">
			<motion.button
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
				onClick={() => setOpen(!open)}
				className="w-full rounded-xl border-2 p-4 text-left transition-all duration-200 relative overflow-hidden group"
				style={{
					borderColor: 'var(--color-primary-200)',
					backgroundColor: 'white',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = 'white';
				}}>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div
							className="w-12 h-12 rounded-xl shadow-lg"
							style={{
								background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
							}}
						/>
						<div>
							<div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color Palette</div>
							<div className="text-sm font-black text-slate-900 mt-0.5">{COLOR_PALETTES[value]?.name || 'Select Palette'}</div>
						</div>
					</div>
					<motion.div animate={{ rotate: open ? 180 : 0 }} transition={spring}>
						<ChevronDown className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} />
					</motion.div>
				</div>
			</motion.button>

			<AnimatePresence>
				{open && (
					<>
						<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
						<motion.div
							initial={{ opacity: 0, y: -10, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -10, scale: 0.95 }}
							transition={spring}
							className="absolute z-50 mt-2 w-full max-h-[400px] overflow-y-auto rounded-2xl border-2 bg-white/98 backdrop-blur-xl shadow-2xl p-3"
							style={{
								borderColor: 'var(--color-primary-200)',
							}}>
							<div className="space-y-2">
								{Object.entries(COLOR_PALETTES).map(([key, palette]) => {
									const isActive = value === key;
									return (
										<motion.button
											key={key}
											whileHover={{ x: 4 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => {
												onChange(key);
												setOpen(false);
											}}
											className="w-full rounded-xl p-3 text-left transition-all duration-200 relative overflow-hidden group"
											style={
												isActive
													? {
															background: `linear-gradient(90deg, ${palette.primary[50]}, ${palette.secondary[50]})`,
															border: `2px solid ${palette.primary[300]}`,
													  }
													: {
															backgroundColor: 'white',
															border: '2px solid transparent',
													  }
											}
											onMouseEnter={(e) => {
												if (!isActive) {
													e.currentTarget.style.backgroundColor = palette.primary[50];
												}
											}}
											onMouseLeave={(e) => {
												if (!isActive) {
													e.currentTarget.style.backgroundColor = 'white';
												}
											}}>
											<div className="flex items-center gap-3">
												{/* Gradient preview */}
												<div
													className="w-16 h-12 rounded-lg shadow-md"
													style={{
														background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})`,
													}}
												/>

												{/* Color swatches */}
												<div className="flex-1">
													<div className="text-sm font-bold text-slate-900">{palette.name}</div>
													<div className="flex items-center gap-1 mt-1">
														{[palette.primary[500], palette.secondary[500], palette.primary[300]].map((color, idx) => (
															<div
																key={idx}
																className="w-6 h-6 rounded-md shadow-sm"
																style={{ backgroundColor: color }}
															/>
														))}
													</div>
												</div>

												{/* Active indicator */}
												{isActive && (
													<motion.div
														initial={{ scale: 0, rotate: -180 }}
														animate={{ scale: 1, rotate: 0 }}
														className="w-8 h-8 rounded-lg grid place-content-center text-white"
														style={{
															background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})`,
														}}>
														<CheckIcon className="w-5 h-5" strokeWidth={3} />
													</motion.div>
												)}
											</div>
										</motion.button>
									);
								})}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ============================================================================
   API MAPPING HELPERS
   ============================================================================ */
function apiToUi(s) {
	return {
		org: {
			name: s.orgName ?? '',
			defaultLang: s.defaultLang ?? 'ar',
			timezone: s.timezone ?? 'Africa/Cairo',
			homeSlug: s.homeSlug ?? '',
		},
		siteMeta: {
			metaTitle: s.metaTitle ?? '',
			metaDescription: s.metaDescription ?? '',
			metaKeywords: s.metaKeywords ?? '',
			ogImageUrl: s.ogImageUrl ?? '',
			homeTitle: s.homeTitle ?? '',
		},
		loader: {
			enabled: s.loaderEnabled,
			message: s.loaderMessage ?? '',
			durationSec: s.loaderDurationSec ?? 2,
		},
		aiSecretKey: s.aiSecretKey ?? '',
		dhikrEnabled: s.dhikrEnabled,
		dhikrItems: (s.dhikrItems || []).map((d) => ({ id: d.id, text: d.text })),
		activeDhikrId: s.activeDhikrId ?? s.dhikrItems?.[0]?.id ?? null,
		themePalette: s.themePalette ?? 'indigo',
		report: {
			enabled: s.reportEnabled,
			day: s.reportDay,
			time: s.reportTime,
			items: {
				weightTrend: s.rptWeightTrend,
				mealAdherence: s.rptMealAdherence,
				workoutCompletion: s.rptWorkoutCompletion,
				waterIntake: s.rptWaterIntake,
				checkinNotes: s.rptCheckinNotes,
				nextFocus: s.rptNextFocus,
				latestPhotos: s.rptLatestPhotos,
			},
			customMessage: s.reportCustomMessage ?? '',
		},
		reminders: (s.reminders || []).map((r) => ({ id: String(r.id), title: r.title, time: r.time })),
	};
}

const isUuidLike = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function uiToApi({ org, siteMeta, loader, dhikrEnabled, dhikrItems, activeDhikrId, themePalette, report, reminders, aiSecretKey }) {
	return {
		organizationKey: null,
		orgName: org.name,
		defaultLang: org.defaultLang,
		timezone: org.timezone,
		homeSlug: org.homeSlug || null,
		aiSecretKey: aiSecretKey || null,
		metaTitle: siteMeta.metaTitle || null,
		metaDescription: siteMeta.metaDescription || null,
		metaKeywords: siteMeta.metaKeywords || null,
		ogImageUrl: siteMeta.ogImageUrl || null,
		homeTitle: siteMeta.homeTitle || null,

		loaderEnabled: !!loader.enabled,
		loaderMessage: loader.message || '',
		loaderDurationSec: Number(loader.durationSec || 0),

		dhikrEnabled: !!dhikrEnabled,
		activeDhikrId: activeDhikrId ?? null,

		dhikrItems: (dhikrItems || []).map((d) => ({
			...(isUuidLike(d.id) ? { id: d.id } : {}),
			text: d.text,
		})),

		themePalette: themePalette,

		reportEnabled: !!report.enabled,
		reportDay: report.day,
		reportTime: report.time,
		rptWeightTrend: !!report.items.weightTrend,
		rptMealAdherence: !!report.items.mealAdherence,
		rptWorkoutCompletion: !!report.items.workoutCompletion,
		rptWaterIntake: !!report.items.waterIntake,
		rptCheckinNotes: !!report.items.checkinNotes,
		rptNextFocus: !!report.items.nextFocus,
		rptLatestPhotos: !!report.items.latestPhotos,
		reportCustomMessage: report.customMessage || '',

		reminders: (reminders || []).map((r) => ({
			...(isUuidLike(r.id) ? { id: r.id } : {}),
			title: r.title,
			time: r.time,
		})),
	};
}

/* ============================================================================
   MAIN SETTINGS PAGE
   ============================================================================ */
export default function SettingsPage() {
	const t = useTranslations('settings');
	const { theme: currentTheme, setTheme } = useTheme();
	const [saving, setSaving] = useState(false);
	const [initializing, setInitializing] = useState(true);
	const [error, setError] = useState('');
	const [aiSecretKey, setAiSecretKey] = useState('');

	/* Accordion control */
	const sections = { org: 'org', site: 'site', loader: 'loader', dhikr: 'dhikr', theme: 'theme', reports: 'reports', reminders: 'reminders', ai: 'ai' };
	const [openKey, setOpenKey] = useState(() => {
		if (typeof window === 'undefined') return sections.theme;
		return localStorage.getItem('settings.openKey') || sections.theme;
	});

	const toggleOpen = (key) => setOpenKey((k) => (k === key ? '' : key));
	const isOpen = (key) => openKey === key;

	useEffect(() => {
		if (typeof window !== 'undefined') localStorage.setItem('settings.openKey', openKey || '');
	}, [openKey]);

	/* State */
	const tzOptions = useMemo(
		() => [
			{ id: 'Africa/Cairo', label: 'Africa/Cairo' },
			{ id: 'Europe/London', label: 'Europe/London' },
			{ id: 'Asia/Dubai', label: 'Asia/Dubai' },
			{ id: 'America/New_York', label: 'America/New_York' },
		],
		[]
	);

	const [org, setOrg] = useState({ name: '', defaultLang: 'ar', timezone: 'Africa/Cairo', homeSlug: '' });
	const [siteMeta, setSiteMeta] = useState({ metaTitle: '', metaDescription: '', metaKeywords: '', ogImageUrl: '', homeTitle: '' });
	const [ogFile, setOgFile] = useState(null);
	const [ogPreviewUrl, setOgPreviewUrl] = useState('');
	const [loader, setLoader] = useState({ enabled: true, message: '', durationSec: 2 });
	const [loaderPreviewOpen, setLoaderPreviewOpen] = useState(false);
	const [showAiKey, setShowAiKey] = useState(false);
	const [dhikrEnabled, setDhikrEnabled] = useState(true);
	const [dhikrItems, setDhikrItems] = useState([
		{ id: 1, text: 'سُبْحَانَ اللَّهِ' },
		{ id: 2, text: 'الْحَمْدُ لِلَّهِ' },
		{ id: 3, text: 'اللَّهُ أَكْبَرُ' },
	]);
	const [activeDhikrId, setActiveDhikrId] = useState(1);
	const [themePalette, setThemePalette] = useState('indigo');

	const weekdayOptions = useMemo(() => ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => ({ id: d, label: d })), []);
	const [report, setReport] = useState({
		enabled: true,
		day: 'Sunday',
		time: '09:00',
		items: {
			weightTrend: true,
			mealAdherence: true,
			workoutCompletion: true,
			waterIntake: true,
			checkinNotes: true,
			nextFocus: true,
			latestPhotos: false,
		},
		customMessage: '',
	});

	const templateRef = useRef(null);
	const labelsMap = useMemo(
		() => ({
			weightTrend: t('reportsAuto.contents.items.weightTrend'),
			mealAdherence: t('reportsAuto.contents.items.mealAdherence'),
			workoutCompletion: t('reportsAuto.contents.items.workoutCompletion'),
			waterIntake: t('reportsAuto.contents.items.waterIntake'),
			checkinNotes: t('reportsAuto.contents.items.checkinNotes'),
			nextFocus: t('reportsAuto.contents.items.nextFocus'),
			latestPhotos: t('reportsAuto.contents.items.latestPhotos'),
		}),
		[t]
	);

	const buildTemplateFromItems = useCallback(
		(items) => {
			const lines = Object.entries(items)
				.filter(([, v]) => v)
				.map(([k]) => `• ${labelsMap[k]}`);
			return lines.join('\n');
		},
		[labelsMap]
	);

	const toggleReportItem = useCallback(
		(key, checked) => {
			setReport((s) => {
				const nextItems = { ...s.items, [key]: checked };
				const line = `• ${labelsMap[key]}`;
				const lines = (s.customMessage || '').split('\n').filter(Boolean);
				const idx = lines.findIndex((l) => l.trim() === line);
				if (checked && idx === -1) lines.push(line);
				if (!checked && idx !== -1) lines.splice(idx, 1);
				return { ...s, items: nextItems, customMessage: lines.join('\n') };
			});
		},
		[labelsMap]
	);

	const [reminders, setReminders] = useState([{ id: Date.now().toString(), title: t('reminders.examples.water'), time: '12:00' }]);

	/* File handling */
	const onOgFile = async (file) => {
		setOgFile(file);
		if (!file) {
			setOgPreviewUrl('');
			return;
		}
		setOgPreviewUrl(URL.createObjectURL(file));
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await api.post('/settings/og-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			const url = res.data?.url;
			if (url) setSiteMeta((s) => ({ ...s, ogImageUrl: url }));
		} catch (e) {
			console.error('OG upload failed', e);
			setError('Failed to upload image.');
		}
	};

	const clearOg = () => {
		setOgFile(null);
		setOgPreviewUrl('');
		setSiteMeta((s) => ({ ...s, ogImageUrl: '' }));
	};

	/* Load settings */
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				setInitializing(true);
				const { data } = await api.get('/settings');
				if (!alive) return;
				const u = apiToUi(data);

				setOrg(u.org);
				setSiteMeta(u.siteMeta);
				setLoader(u.loader);
				setDhikrEnabled(u.dhikrEnabled);
				setDhikrItems(u.dhikrItems);
				setActiveDhikrId(u.activeDhikrId);
				setThemePalette(u.themePalette);
				setAiSecretKey(data.aiSecretKey || '');

				const custom = u.report.customMessage?.trim() ? u.report.customMessage : buildTemplateFromItems(u.report.items);
				setReport({ ...u.report, customMessage: custom });

				setReminders(u.reminders.length ? u.reminders : [{ id: Date.now().toString(), title: t('reminders.examples.water'), time: '12:00' }]);
				setError('');
			} catch (e) {
				console.error('GET /settings failed', e);
				setError('Failed to load settings.');
			} finally {
				if (alive) setInitializing(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [buildTemplateFromItems, t]);

	/* Save settings */
	const saveAll = async () => {
		setSaving(true);
		try {
			const dto = uiToApi({
				org,
				siteMeta,
				loader,
				dhikrEnabled,
				dhikrItems,
				activeDhikrId,
				themePalette,
				report,
				reminders,
				aiSecretKey,
			});
			await api.put('/settings', dto);
			
			// Apply theme immediately
			setTheme(themePalette);
			
			setError('');
		} catch (e) {
			console.error('PUT /settings failed', e);
			setError('Failed to save settings.');
		} finally {
			setSaving(false);
		}
	};

	/* Reminder management */
	const addReminder = ({ title, time }) => {
		if (!title?.trim() || !time?.trim()) return;
		setReminders((arr) => [...arr, { id: Date.now().toString(), title: title.trim(), time }]);
	};
	const updateReminder = (id, patch) => setReminders((arr) => arr.map((r) => (String(r.id) === String(id) ? { ...r, ...patch } : r)));
	const removeReminder = (id) => setReminders((arr) => arr.filter((r) => String(r.id) !== String(id)));

	return (
		<div className="min-h-screen relative"  >
			{/* Floating background elements */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40"> </div>

			<div className="relative z-10  space-y-6 ">
				{/* Header */}
				<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-black text-slate-900">{t('title')}</h1>
						<p className="text-slate-600 text-base mt-2 font-medium">{t('subtitle')}</p>
						{initializing && (
							<div className="flex items-center gap-2 mt-3">
								<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
									<Loader2 className="w-4 h-4" style={{ color: 'var(--color-primary-500)' }} />
								</motion.div>
								<span className="text-sm font-semibold" style={{ color: 'var(--color-primary-600)' }}>
									{t('loading') || 'Loading…'}
								</span>
							</div>
						)}
						{error && (
							<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-red-600 mt-2 font-semibold">
								{error}
							</motion.div>
						)}
					</div>

					{/* Quick actions */}
					<div className="flex items-center gap-3">
						<Button color="neutral" onClick={() => window.location.reload()}>
							{t("close")}
						</Button>
						<Button onClick={saveAll} loading={saving} disabled={saving || initializing}>
							<Save className="w-4 h-4" />
							{t('save')}
						</Button>
					</div>
				</motion.div>

				{/* Theme Palette Selector - Featured */}
				<CardShell title={t('branding.title')} desc={t('branding.desc')} open={isOpen(sections.theme)} onToggle={() => toggleOpen(sections.theme)} icon={Palette}>
					<Row label={t('branding.palette')} hint="Choose a color palette for your application">
						<PaletteSelector value={themePalette} onChange={setThemePalette} />
					</Row>

					<Row label={t('branding.previewLabel')} hint={t('branding.previewHint')}>
						<div className="space-y-4">
							{/* Gradient header preview */}
							<div
								className="relative overflow-hidden rounded-2xl shadow-xl"
								style={{
									background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
								}}>
								<motion.div
									className="absolute inset-0"
									animate={{
										backgroundPosition: ['-200% 0', '200% 0'],
									}}
									transition={{
										duration: 3,
										repeat: Infinity,
										ease: 'linear',
									}}
									style={{
										background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
										backgroundSize: '200% 100%',
									}}
								/>
								<div className="relative z-10 p-6 md:p-8 text-white">
									<h2 className="text-2xl md:text-3xl font-black">{t('branding.headerDemo.title')}</h2>
									<p className="text-white/90 mt-2 text-lg">{t('branding.headerDemo.desc')}</p>
									<div className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold bg-white/20 backdrop-blur-sm border-2 border-white/30">
										<Sparkles className="w-4 h-4" />
										{t('branding.headerDemo.badge')}
									</div>
								</div>
							</div>

							{/* Surface preview */}
							<div className="rounded-2xl p-6 border-2" style={{ borderColor: 'var(--color-primary-200)', backgroundColor: 'var(--color-primary-50)' }}>
								<div
									className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold shadow-lg"
									style={{
										background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
										color: 'white',
									}}>
									<CheckIcon className="w-5 h-5" strokeWidth={3} />
									{t('branding.previewChip')}
								</div>
							</div>
						</div>
					</Row>
				</CardShell>

				{/* Organization */}
				<CardShell
					title={t('org.title')}
					desc={t('org.desc')}
					open={isOpen(sections.org)}
					onToggle={() => toggleOpen(sections.org)}
					icon={Radio}
					right={<Chip icon={Radio}>{org.timezone}</Chip>}>
					<Row label={t('org.name.label')} hint={t('org.name.hint')}>
						<Input value={org.name} onChange={(v) => setOrg((s) => ({ ...s, name: v }))} placeholder={t('org.name.ph')} />
					</Row>

					<Row label={t('org.defaultLang.label')} hint={t('org.defaultLang.hint')}>
						<div className="flex items-center gap-2">
							<Button type="button" color={org.defaultLang === 'ar' ? 'primary' : 'neutral'} onClick={() => setOrg((s) => ({ ...s, defaultLang: 'ar' }))}>
								AR
							</Button>
							<Button type="button" color={org.defaultLang === 'en' ? 'primary' : 'neutral'} onClick={() => setOrg((s) => ({ ...s, defaultLang: 'en' }))}>
								EN
							</Button>
						</div>
					</Row>

					<Row label={t('org.timezone.label')}>
						<Select value={org.timezone} onChange={(val) => setOrg((s) => ({ ...s, timezone: val }))} options={tzOptions} placeholder={t('org.timezone.label')} />
					</Row>

					<Row label={t('org.homeSlug.label')} hint={t('org.homeSlug.hint')}>
						<div className="flex gap-2">
							<Input className="flex-1" value={org.homeSlug} onChange={(v) => setOrg((s) => ({ ...s, homeSlug: v }))} placeholder={t('org.homeSlug.ph')} />
							<Button color="neutral">
								<Link2 className="w-4 h-4" />
								{t('org.homeSlug.preview')}
							</Button>
						</div>
					</Row>
				</CardShell>

				{/* AI Secret Key */}
				<CardShell title={t('ai.title')} desc={t('ai.desc')} open={isOpen('ai')} onToggle={() => toggleOpen('ai')} icon={Zap}>
					<Row label={t('ai.secretKey.label')} hint={t('ai.secretKey.hint')}>
						<div className="space-y-3">
							<div className="flex gap-2">
								<Input
									type={showAiKey ? 'text' : 'password'}
									value={aiSecretKey}
									onChange={setAiSecretKey}
									placeholder={t('ai.secretKey.placeholder')}
									className="flex-1 font-mono text-sm"
								/>
								<Button color="neutral" onClick={() => setShowAiKey(!showAiKey)} type="button">
									{showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									{showAiKey ? t('ai.secretKey.hide') : t('ai.secretKey.show')}
								</Button>
							</div>

							<Help>
								<div className="space-y-2 text-sm">
									<p className="font-bold">{t('ai.steps.title')}</p>
									<ol className="list-decimal list-inside space-y-1.5 pl-2">
										<li>
											{t('ai.steps.step1')}{' '}
											<a className="font-bold underline" style={{ color: 'var(--color-primary-700)' }} href="https://openrouter.ai/settings/keys" target="_blank">
												{t('ai.form_here')}
											</a>
										</li>
										<li>{t('ai.steps.step2')}</li>
										<li>{t('ai.steps.step3')}</li>
										<li>{t('ai.steps.step4')}</li>
										<li>{t('ai.steps.step5')}</li>
										<li>{t('ai.steps.step6')}</li>
										<li>{t('ai.steps.step7')}</li>
									</ol>
									<p className="text-red-600 font-bold mt-3">{t('ai.steps.warning')}</p>
								</div>
							</Help>
						</div>
					</Row>
				</CardShell>

				{/* Landing Page SEO */}
				<CardShell title={t('site.title')} desc={t('site.desc')} open={isOpen(sections.site)} onToggle={() => toggleOpen(sections.site)} icon={Globe}>
					<Row label={t('site.metaTitle')}>
						<Input value={siteMeta.metaTitle} onChange={(v) => setSiteMeta((s) => ({ ...s, metaTitle: v }))} placeholder={t('site.metaTitlePh')} />
					</Row>
					<Row label={t('site.metaDescription')}>
						<Textarea value={siteMeta.metaDescription} onChange={(e) => setSiteMeta((s) => ({ ...s, metaDescription: e.target.value }))} placeholder={t('site.metaDescriptionPh')} />
					</Row>
					<Row label={t('site.metaKeywords')}>
						<Input value={siteMeta.metaKeywords} onChange={(v) => setSiteMeta((s) => ({ ...s, metaKeywords: v }))} placeholder={t('site.metaKeywordsPh')} />
					</Row>

					<Row label={t('site.ogImageUpload')} hint={t('site.ogImageHint')}>
						<div className="space-y-3">
							{(siteMeta.ogImageUrl || ogPreviewUrl) && (
								<div className="flex items-center gap-4">
									<div className="w-32 h-24 overflow-hidden rounded-xl border-2 bg-white shadow-lg" style={{ borderColor: 'var(--color-primary-200)' }}>
										<img src={ogPreviewUrl || siteMeta.ogImageUrl} className="w-full h-full object-cover" alt="og-preview" />
									</div>
									<Button color="danger" onClick={clearOg}>
										<Trash2 className="w-4 h-4" />
										{t('remove') || 'Remove'}
									</Button>
								</div>
							)}
							<UploadBox file={ogFile} onFile={onOgFile} previewUrl={ogPreviewUrl} onClear={clearOg} label={t('site.chooseImage')} />
						</div>
					</Row>

					<Row label={t('site.homeTitle')}>
						<Input value={siteMeta.homeTitle} onChange={(v) => setSiteMeta((s) => ({ ...s, homeTitle: v }))} placeholder={t('site.homeTitlePh')} />
					</Row>
				</CardShell>

				{/* Loader */}
				<CardShell title={t('loader.title')} desc={t('loader.desc')} open={isOpen(sections.loader)} onToggle={() => toggleOpen(sections.loader)} icon={Loader2}>
					<Row label={t('loader.enabled')}>
						<Switcher checked={loader.enabled} onChange={(v) => setLoader((s) => ({ ...s, enabled: v }))} />
					</Row>
					<Row label={t('loader.message')} hint={t('loader.messageHint')}>
						<div className="flex gap-2">
							<Input value={loader.message} onChange={(v) => setLoader((s) => ({ ...s, message: v }))} placeholder={t('loader.messagePh')} />
							<Button color="neutral" onClick={() => setLoaderPreviewOpen(true)}>
								{t('loader.previewBtn')}
							</Button>
						</div>
					</Row>
					<Row label={t('loader.durationSec')} hint={t('loader.durationHint')}>
						<Input type="number" value={loader.durationSec} onChange={(v) => setLoader((s) => ({ ...s, durationSec: Number(v || 0) }))} />
					</Row>
				</CardShell>

				{/* Dhikr */}
				<CardShell title={t('dhikr.title')} desc={t('dhikr.desc')} open={isOpen(sections.dhikr)} onToggle={() => toggleOpen(sections.dhikr)} icon={Sparkles}>
					<Row label={t('dhikr.enabled')}>
						<Switcher checked={dhikrEnabled} onChange={setDhikrEnabled} />
					</Row>
					<Row label={t('dhikr.activeOne')} hint={t('dhikr.activeHint')}>
						<div className="space-y-3">
							{dhikrItems.map((item) => (
								<motion.label
									key={item.id}
									whileHover={{ x: 4 }}
									className="flex items-center justify-between rounded-xl border-2 bg-white px-4 py-3 cursor-pointer transition-all duration-200"
									style={{
										borderColor: activeDhikrId === item.id ? 'var(--color-primary-300)' : 'var(--color-primary-100)',
										backgroundColor: activeDhikrId === item.id ? 'var(--color-primary-50)' : 'white',
									}}>
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<input
											type="radio"
											name="activeDhikr"
											checked={activeDhikrId === item.id}
											onChange={() => setActiveDhikrId(item.id)}
											className="w-5 h-5"
										/>
										<Input
											className="flex-1"
											value={item.text}
											onChange={(v) => setDhikrItems((list) => list.map((x) => (x.id === item.id ? { ...x, text: v } : x)))}
										/>
									</div>
									<motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => setDhikrItems((list) => list.filter((x) => x.id !== item.id))} className="ml-2">
										<X className="w-5 h-5 text-red-500" />
									</motion.button>
								</motion.label>
							))}
							<Button color="neutral" onClick={() => setDhikrItems((list) => [...list, { id: Date.now(), text: '' }])}>
								<Plus className="w-4 h-4" />
								{t('add')}
							</Button>
						</div>
					</Row>
				</CardShell>

				{/* Reports & Automations */}
				<CardShell title={t('reportsAuto.title')} desc={t('reportsAuto.desc')} open={isOpen(sections.reports)} onToggle={() => toggleOpen(sections.reports)} icon={BellRing}>
					<Row label={t('reportsAuto.enabled')}>
						<Switcher checked={report.enabled} onChange={(v) => setReport((s) => ({ ...s, enabled: v }))} />
					</Row>
					<Row label={t('reportsAuto.schedule.label')} hint={t('reportsAuto.schedule.hint')}>
						<div className="grid grid-cols-2 gap-3">
							<Select value={report.day} onChange={(val) => setReport((s) => ({ ...s, day: val }))} options={weekdayOptions} searchable={false} clearable={false} />
							<Input type="time" value={report.time} onChange={(v) => setReport((s) => ({ ...s, time: v }))} />
						</div>
					</Row>
					<Row label={t('reportsAuto.contents.label')} hint={t('reportsAuto.contents.hint')}>
						<div className="grid sm:grid-cols-2 gap-2">
							{Object.entries(report.items).map(([key, val]) => (
								<label
									key={key}
									className="flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200"
									style={{
										borderColor: val ? 'var(--color-primary-300)' : 'var(--color-primary-100)',
										backgroundColor: val ? 'var(--color-primary-50)' : 'white',
									}}>
									<input type="checkbox" className="h-5 w-5" checked={!!val} onChange={(e) => toggleReportItem(key, e.target.checked)} />
									<span className="text-sm font-semibold text-slate-800">{labelsMap[key]}</span>
								</label>
							))}
						</div>
					</Row>
					<Row label={t('reportsAuto.template.label')} hint={t('reportsAuto.template.hint')}>
						<Textarea ref={templateRef} value={report.customMessage} onChange={(e) => setReport((s) => ({ ...s, customMessage: e.target.value }))} />
					</Row>
				</CardShell>

				{/* Reminders */}
				<CardShell title={t('reminders.title')} desc={t('reminders.desc')} open={isOpen(sections.reminders)} onToggle={() => toggleOpen(sections.reminders)} icon={BellRing}>
					<Row label={t('reminders.list')}>
						<div className="space-y-3">
							{reminders.map((r) => (
								<div key={r.id} className="grid sm:grid-cols-[1fr_160px_36px] gap-3 rounded-xl border-2 p-3" style={{ borderColor: 'var(--color-primary-100)' }}>
									<Input value={r.title} onChange={(v) => updateReminder(r.id, { title: v })} placeholder={t('reminders.titlePh')} />
									<Input type="time" value={r.time} onChange={(v) => updateReminder(r.id, { time: v })} />
									<motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => removeReminder(r.id)}>
										<X className="w-5 h-5 text-red-500" />
									</motion.button>
								</div>
							))}
						</div>
					</Row>
					<Row label={t('reminders.add')}>
						<AddReminderForm onAdd={addReminder} t={t} />
						<Help>{t('reminders.firebaseNote')}</Help>
					</Row>
				</CardShell>
			</div>

			{/* Sticky Footer */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="fixed inset-x-0 bottom-0 z-50 border-t-2 bg-white/98 backdrop-blur-xl shadow-2xl"
				style={{
					borderColor: 'var(--color-primary-200)',
				}}>
				<div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 flex items-center justify-between">
					<div className="text-sm font-semibold text-slate-600">
						{t('unsavedChanges') || 'Remember to save your changes'}
					</div>
					<div className="flex items-center gap-3">
						<Button color="neutral" onClick={() => window.location.reload()}>
							Cancel
						</Button>
						<Button onClick={saveAll} loading={saving} disabled={saving || initializing}>
							{!saving && <Save className="w-4 h-4" />}
							{t('save')}
						</Button>
					</div>
				</div>
			</motion.div>

			{/* Loader Preview Modal */}
			<Modal open={loaderPreviewOpen} onClose={() => setLoaderPreviewOpen(false)} title="Loader Preview">
				<div className="relative h-[70vh] rounded-xl overflow-hidden">
					<div className="absolute inset-0">
						<DhikrLoading />
					</div>
					<div
						className="absolute left-1/2 bottom-6 -translate-x-1/2 rounded-xl px-6 py-3 border-2 shadow-xl backdrop-blur-xl"
						style={{
							backgroundColor: 'var(--color-primary-50)',
							borderColor: 'var(--color-primary-200)',
						}}>
						<div className="text-slate-900 text-sm font-bold">{loader.message || t('loader.messagePh')}</div>
						<div className="text-slate-600 text-xs text-center mt-1">
							{t('loader.durationHint')}: {loader.durationSec}s
						</div>
					</div>
				</div>
			</Modal>
		</div>
	);
}

/* ============================================================================
   ADD REMINDER FORM
   ============================================================================ */
function AddReminderForm({ onAdd, t }) {
	const [title, setTitle] = useState('');
	const [time, setTime] = useState('09:00');

	return (
		<div className="flex flex-wrap items-center gap-3">
			<Input className="min-w-[240px] flex-1" value={title} onChange={setTitle} placeholder={t('reminders.titlePh')} />
			<Input type="time" value={time} onChange={setTime} className="w-32" />
			<Button
				color="neutral"
				onClick={() => {
					onAdd({ title, time });
					setTitle('');
				}}>
				<Plus className="w-4 h-4" />
				{t('add')}
			</Button>
		</div>
	);
}