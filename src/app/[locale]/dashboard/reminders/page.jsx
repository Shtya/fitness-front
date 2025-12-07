

'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Calendar as CalendarIcon, BellRing, Info, Edit2, Trash2, Zap, Square, X } from 'lucide-react';

import { Modal, TabsPill } from '@/components/dashboard/ui/UI';
import Select from '@/components/atoms/Select';
import { TimeField } from '@/components/atoms/InputTime';
import InputDate from '@/components/atoms/InputDate';
import MultiLangText from '@/components/atoms/MultiLangText';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import { WEEK_DAYS, PRAYERS, SOUND_SAMPLES, defaultSettings, defaultReminder, normalizeSchedule, computeNextOccurrence, fetchTodayPrayerTimes, listReminders, getUserSettingsApi, createReminderApi, updateReminderApi, deleteReminderApi, toggleActiveApi, markCompletedApi, updateUserSettingsApi, safeT, toISODate, useReminderWebSocket, humanDateTime, sameDay, humanDuration, stopCurrentReminderSound } from '@/components/pages/reminders/atoms';
import api from '@/utils/axios';
import { Switcher } from '@/components/atoms/Switcher';

/* ---------- helpers ---------- */

function formatTime12Local(hhmm) {
	if (!hhmm) return '—';
	const [h0, m] = hhmm.split(':').map(Number);
	const h12 = ((h0 + 11) % 12) + 1;
	const ampm = h0 < 12 ? 'AM' : 'PM';
	return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatSchedule(t, rem) {
	const s = rem.schedule || {};
	const times = (s.times || []).map(formatTime12Local).join('، ');

	if (s.mode === 'prayer' && s.prayer) {
		const dir = s.prayer.direction === 'before' ? safeT(t, 'before', 'Before') : safeT(t, 'after', 'After');

		const prayerLabel = getPrayerLabel(t, s.prayer);

		return `${prayerLabel} • ${dir} ${s.prayer.offsetMin} ${safeT(t, 'minutesShort', 'min')}`;
	}

	const labelByMode = {
		once: `${safeT(t, 'mode.once', 'Once')} ${times}`,
		daily: `${safeT(t, 'mode.daily', 'Daily')} ${times}`,
		weekly: `${safeT(t, 'mode.weekly', 'Weekly')} ${(s.daysOfWeek || []).join('، ') || '—'} ${times}`,
		monthly: `${safeT(t, 'mode.monthly', 'Monthly')} ${times}`,
		interval: s.interval ? `${safeT(t, 'mode.intervalEvery', 'Every')} ${s.interval.every} ${safeT(t, `interval.unit.${s.interval.unit || 'hour'}`, s.interval.unit || 'hour')}` : safeT(t, 'mode.interval', 'Interval'),
	};
	return labelByMode[s.mode] || labelByMode.daily;
}

function getPrayerLabel(t, prayer) {
	const rawName = (prayer?.name || '').toLowerCase().trim();

	if (!rawName) {
		return prayer?.name || safeT(t, 'prayer.fallback', 'Prayer');
	}

	return safeT(t, `prayer.${rawName}`, prayer.name || rawName);
}

function formatSchedule2(t, rem) {
	const s = rem.schedule || {};

	const times24 = Array.isArray(s.times) ? [...s.times].filter(Boolean).sort((a, b) => a.localeCompare(b)) : [];

	const mappedTimes = times24.map(formatTime12Local);
	const fullTime = mappedTimes[0] || '';

	let time = '';
	let period = '';

	if (fullTime) {
		const parts = fullTime.split(' ');
		time = parts[0] || '';
		period = parts[1] || '';
	}

	let text;

	if (s.mode === 'prayer' && s.prayer) {
		const dir = s.prayer.direction === 'before' ? safeT(t, 'before', 'Before') : safeT(t, 'after', 'After');

		const prayerName = getPrayerLabel(t, s.prayer);
		const offset = Number.isFinite(Number(s.prayer.offsetMin)) ? Number(s.prayer.offsetMin) : 0;

		text = `${prayerName} • ${dir} ${offset} ${safeT(t, 'minutesShort', 'min')}`;
	} else {
		const every = s.interval && Number(s.interval.every) > 0 ? Number(s.interval.every) : null;
		const unitLabel = s.interval && s.interval.unit ? safeT(t, `interval.unit.${s.interval.unit}`, s.interval.unit) : '';

		const intervalLabel = s.interval && every ? `${safeT(t, 'mode.intervalEvery', 'Every')} ${every} ${unitLabel} ` : safeT(t, 'mode.interval', 'Interval');

		const labelByMode = {
			once: `${safeT(t, 'mode.once', 'Once')} ${mappedTimes.join('، ')}`,
			daily: `${safeT(t, 'mode.daily', 'Daily')} ${mappedTimes.join('، ')}`,
			weekly: `${safeT(t, 'mode.weekly', 'Weekly')}`,
			monthly: `${safeT(t, 'mode.monthly', 'Monthly')} ${mappedTimes.join('، ')}`,
			interval: intervalLabel,
		};

		text = labelByMode[s.mode] || labelByMode.daily;
	}

	let cleanText = text.replace(fullTime, '').trim();
	cleanText = cleanText.replace(/[,،]+$/, '').trim();

	return [cleanText, time, period];
}

function formatTimelineTime(date) {
	try {
		const formatted = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		}).format(date);

		const parts = formatted.split(' ');
		const time = parts[0] || '';
		const period = parts[1] || '';

		return [time, period];
	} catch {
		const fallback = date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});

		const parts = fallback.split(' ');
		return [parts[0] || '', parts[1] || ''];
	}
}

/** ---- Validation schema ---- */
const schema = yup.object().shape({
	title: yup.string().trim().required(),
	type: yup.mixed().oneOf(['custom']).default('custom'),
	schedule: yup.object({
		mode: yup.string().oneOf(['once', 'daily', 'weekly', 'monthly', 'interval', 'prayer']).required(),
		startDate: yup.string().required(),
	}),
});

/* ---------- Main Page ---------- */

function supportsPush() {
	if (typeof window === 'undefined') return true;

	const hasNotification = 'Notification' in window;
	const hasSW = 'serviceWorker' in navigator;

	const ua = navigator.userAgent;
	const iOS = /iPhone|iPad|iPod/i.test(ua);
	const safari = /^((?!chrome|android).)*safari/i.test(ua);

	if (iOS && safari) return false;
	if (!hasNotification || !hasSW) return false;

	return true;
}
export default function RemindersPage() {
	const t = useTranslations('reminders');
	const [notificationStatus, setNotificationStatus] = useState('checking');

	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();

	const [reminders, setReminders] = useState([]);
	const [settings, setSettings] = useState(null);
	const [loading, setLoading] = useState(true);

	const [dueModal, setDueModal] = useState({ open: false, reminder: null });

	const [openForm, setOpenForm] = useState(false);
	const [editing, setEditing] = useState(null);
	const [openSettings, setOpenSettings] = useState(false);
	const [openCalendar, setOpenCalendar] = useState(false);

 	const now = new Date();
 
	const today = new Date();
	const todayKey = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][today.getDay()];

	// active day for TabsPill (default to today)
	const [activeDay, setActiveDay] = useState(todayKey);

	function dateForWeekday(key) {
		const now = new Date();
		for (let i = 0; i < 7; i++) {
			const d = new Date(now);
			d.setDate(now.getDate() + i);
			const k = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getDay()];
			if (k === key) return d;
		}
		return now;
	}

	const selectedDate = useMemo(() => dateForWeekday(activeDay), [activeDay]);

	const timelineEntries = useMemo(() => buildTimelineEntries(reminders, settings, selectedDate), [reminders, settings, selectedDate]);

	const viewToggleOptions = useMemo(
		() => [
			{ key: 'list', label: safeT(t, 'view.list', 'List') },
			{ key: 'timeline', label: safeT(t, 'view.timeline', 'Timeline') },
		],
		[t],
	);

	const viewFromQuery = searchParams?.get('view');
	const reminderIdFromQuery = searchParams?.get('reminderId');
	const searchParamsString = searchParams?.toString() || '';
	const [viewMode, setViewMode] = useState(viewFromQuery === 'timeline' ? 'timeline' : 'list');
	const [highlightReminderId, setHighlightReminderId] = useState(reminderIdFromQuery || null);
	const timelineSectionRef = useRef(null);
	const [pushSupported, setPushSupported] = useState(true);

	useEffect(() => {
		setPushSupported(supportsPush());
	}, []);

	useEffect(() => {
		api
			.get('/reminders/settings/user')
			.then(res => setSettings(res.data))
			.finally(() => setLoading(false));
	}, []);


	useEffect(() => {
		setViewMode(viewFromQuery === 'timeline' ? 'timeline' : 'list');
		setHighlightReminderId(reminderIdFromQuery || null);
	}, [viewFromQuery, reminderIdFromQuery]);

	const switchView = useCallback(
		(nextMode, options = {}) => {
			setViewMode(nextMode);
			if (!router || !pathname) return;
			const params = new URLSearchParams(searchParamsString);
			if (nextMode === 'timeline') {
				params.set('view', 'timeline');
				let reminderId = null;
				if (options.reminderId) {
					reminderId = options.reminderId;
				} else if (options.keepReminderId && highlightReminderId) {
					reminderId = highlightReminderId;
				}
				if (reminderId) {
					params.set('reminderId', reminderId);
				} else {
					params.delete('reminderId');
				}
			} else {
				params.delete('view');
				params.delete('reminderId');
			}
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[router, pathname, searchParamsString, highlightReminderId],
	);

	useEffect(() => {
		if (viewMode === 'timeline' && timelineSectionRef.current) {
			timelineSectionRef.current.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		}
	}, [viewMode]);

	useEffect(() => {
		if (viewMode !== 'timeline' || !highlightReminderId) return;
		const el = document.querySelector(`[data-reminder-id="${highlightReminderId}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}, [viewMode, highlightReminderId, timelineEntries]);

	useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				const [rs, st] = await Promise.all([listReminders(), getUserSettingsApi()]);

				if (!mounted) return;

				const withAudio = (rs || []).map(r => ({
					...r,
					sound: {
						...r.sound,
						previewUrl: r.sound?.id === 'drop' ? SOUND_SAMPLES.drop : r.sound?.id === 'soft' ? SOUND_SAMPLES.soft : SOUND_SAMPLES.chime,
					},
				}));

				setReminders(withAudio);
				setSettings(st);
			} catch (error) {
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		// 2) تسجيل الـ Service Worker بشكل منفصل (لا يلمس loading)
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
			(async () => {
				try {
					const registration = await navigator.serviceWorker.register('/sw.js', {
						scope: '/',
						updateViaCache: 'none',
					});

					// ⚠️ لا تنتظر للأبد على state === 'activated'
					if (registration.installing) {
						const installingWorker = registration.installing;
						await new Promise(resolve => {
							if (!installingWorker) return resolve(null);

							const handler = e => {
								const state = e.target.state;
								// نعتبر activated أو redundant نهاية طبيعية
								if (state === 'activated' || state === 'redundant') {
									installingWorker.removeEventListener('statechange', handler);
									resolve(null);
								}
							};

							installingWorker.addEventListener('statechange', handler);

							// safety timeout حتى لو ما جاء أي event
							setTimeout(() => resolve(null), 5000);
						});
					}
					try {
						await subscribeToPush(registration);
					} catch (e) {
					}
				} catch (swError) {
				}
			})();
		}

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof Notification === 'undefined') {
			// متصفح لا يدعم Notifications
			setNotificationStatus('unsupported');
			return;
		}
		setNotificationStatus(Notification.permission); // 'default' | 'granted' | 'denied'
	}, []);

	const filtered = useMemo(() => {
		// Show ALL reminders sorted by next occurrence (regardless of selected tab)
		const list = reminders.slice().sort((a, b) => (computeNextOccurrence(a, settings || {})?.getTime() || 0) - (computeNextOccurrence(b, settings || {})?.getTime() || 0));
		return list;
	}, [reminders, settings]);

	// build tabs with counts per weekday and localized labels (accurate per-day occurrences)
	const tabs = useMemo(() => {
		return WEEK_DAYS.map(d => {
			const label = safeT(t, `weekday.${d.label}`, d.label);
			const date = dateForWeekday(d.key);
			const entries = buildTimelineEntries(reminders, settings, date);
			const count = entries.length || 0;
			const labelWithCount = count > 0 ? `${label} (${count})` : label;
			return { key: d.key, label: labelWithCount };
		});
	}, [WEEK_DAYS, reminders, settings, t]);

	useReminderWebSocket(rem => {
		setReminders(prev => prev.map(r => (r.id === rem.id ? { ...r, ...rem } : r)));
		setDueModal({ open: true, reminder: rem });
	});

	const onCreate = () => {
		setEditing(null);
		setOpenForm(true);
	};
	const onEdit = rem => {
		setEditing(rem);
		setOpenForm(true);
	};

	const onSave = async draft => {
		const schedule = normalizeSchedule(draft.schedule);
		const payload = {
			...draft,
			title: draft.title?.trim() || 'Reminder',
			type: 'custom',
			schedule: {
				...schedule,
				exdates: (schedule.exdates || []).filter(Boolean),
			},
		};
		setOpenForm(false);

		if (draft.id) {
			const before = reminders;
			const idx = before.findIndex(r => r.id === draft.id);
			const optimistic = [...before];
			optimistic[idx] = {
				...before[idx],
				...payload,
				updatedAt: new Date().toISOString(),
			};
			setReminders(optimistic);
			try {
				const saved = await updateReminderApi(draft.id, payload);
				saved.sound.previewUrl = saved.sound?.id === 'drop' ? SOUND_SAMPLES.drop : saved.sound?.id === 'soft' ? SOUND_SAMPLES.soft : SOUND_SAMPLES.chime;
				setReminders(list => list.map(r => (r.id === saved.id ? saved : r)));
			} catch {
				setReminders(before);
			}
		} else {
			try {
				const created = await createReminderApi(payload);
				created.sound.previewUrl = created.sound?.id === 'drop' ? SOUND_SAMPLES.drop : created.sound?.id === 'soft' ? SOUND_SAMPLES.soft : SOUND_SAMPLES.chime;

				setReminders(list => [created, ...list]);
			} catch {
				// ignore
			}
		}
	};

	const onDelete = async id => {
		const before = reminders;
		setReminders(before.filter(r => r.id !== id));
		try {
			await deleteReminderApi(id);
		} catch {
			setReminders(before);
		}
	};

	const onToggleActive = async id => {
		const before = reminders;
		setReminders(before.map(r => (r.id === id ? { ...r, active: !r.active } : r)));
		try {
			const saved = await toggleActiveApi(id);
			saved.sound.previewUrl = saved.sound?.id === 'drop' ? SOUND_SAMPLES.drop : saved.sound?.id === 'soft' ? SOUND_SAMPLES.soft : SOUND_SAMPLES.chime;
			setReminders(list => list.map(r => (r.id === id ? saved : r)));
		} catch {
			setReminders(before);
		}
	};

	const requestNotificationPermission = async () => {
		if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

		try {
			const result = await Notification.requestPermission();
			setNotificationStatus(result);

			if (result === 'granted' && 'serviceWorker' in navigator) {
				try {
					const registration = await navigator.serviceWorker.ready;
					await subscribeToPush(registration);
				} catch (err) {
				}
			}
		} catch (err) {
		}
	};

	const onAck = async rem => {
		try {
			const saved = await markCompletedApi(rem.id);
			saved.sound.previewUrl = saved.sound?.id === 'drop' ? SOUND_SAMPLES.drop : saved.sound?.id === 'soft' ? SOUND_SAMPLES.soft : SOUND_SAMPLES.chime;
			setReminders(list => list.map(r => (r.id === rem.id ? saved : r)));
		} catch {
			// ignore
		}
	};

	const quickCreate = async mins => {
		const n = Number(mins);
		if (Number.isNaN(n) || n <= 0) return;
		const now = new Date();
		const future = new Date(now.getTime() + n * 60 * 1000);

		const hh = String(future.getHours()).padStart(2, '0');
		const mm = String(future.getMinutes()).padStart(2, '0');
		const hhmm = `${hh}:${mm}`;

		const payload = defaultReminder({
			title: 'Quick Alert',
			schedule: {
				mode: 'once',
				times: [hhmm],
				startDate: toISODate(future),
				endDate: null,
				daysOfWeek: [],
				timezone: settings?.timezone || 'Africa/Cairo',
			},
		});
		try {
			const created = await createReminderApi(payload);
			created.sound.previewUrl = created.sound?.id === 'drop' ? SOUND_SAMPLES.drop : created.sound?.id === 'soft' ? SOUND_SAMPLES.soft : SOUND_SAMPLES.chime;
			setReminders(list => [created, ...list]);
		} catch {
			// ignore
		}
	};

	if (loading) {
		return (
			<main className='container !px-0'>
				{/* Header skeleton */}
				<div className='relative mb-4 overflow-hidden rounded-lg border border-indigo-100/60 bg-indigo-500/70'>
					<div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-90' />
					<div className='absolute inset-0 opacity-15' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)', backgroundSize: '22px 22px', backgroundPosition: '-1px -1px' }} />
					<div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
					<div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />

					<div className='relative p-4 md:p-6 animate-pulse'>
						<div className='flex items-center justify-between'>
							<div className='h-5 w-40 rounded-full bg-white/40 mb-2' />
							<div className='  md:hidden flex items-center gap-2'>
								<div className='h-8 w-8 rounded-full bg-white/40 mb-2' />
								<div className='h-8 w-20 rounded-full bg-white/40 mb-2' />
							</div>
						</div>
						<div className=' max-md:hidden h-4 w-64 rounded-full bg-white/30' />
						<div className='mt-4 flex  max-md:justify-end flex-wrap gap-2'>
							<div className='h-8 w-20 rounded-full bg-white/30' />
							<div className='h-8 w-20 rounded-full bg-white/20' />
						</div>
					</div>
				</div>

				{/* List skeleton */}
				<div className='space-y-3'>
					<div className='h-20 rounded-xl bg-slate-100 animate-pulse' />
					<div className='h-20 rounded-xl bg-slate-100 animate-pulse' />
					<div className='h-20 rounded-xl bg-slate-100 animate-pulse' />
				</div>
			</main>
		);
	}


	const telegramEnabled = settings?.telegramEnabled === true;
	const needsActivation = notificationStatus !== 'granted' && !telegramEnabled;

	if (needsActivation) {
		return (
			<main className="container !px-0">
				<div className="max-w-xl mx-auto mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-6 md:p-8 text-center shadow-sm">
					<h1 className="text-xl md:text-2xl font-semibold text-slate-900 mb-3">
						{safeT(t, 'permission.title', 'تفعيل الإشعارات مطلوب')}
					</h1>

					<p className="text-sm md:text-base text-slate-600 mb-4">
						{safeT(
							t,
							'permission.description',
							'لكي تعمل صفحة التذكيرات بشكل صحيح وتستقبل تنبيهات، لازم تفعّل الإشعارات للمتصفح أو تيليجرام.'
						)}
					</p>

					{/* حالة: المتصفح لا يدعم الإشعارات */}
					{notificationStatus === 'unsupported' && (
						<p className="text-xs md:text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
							{safeT(
								t,
								'permission.unsupported',
								'متصفحك الحالي لا يدعم إشعارات المتصفح. يمكنك تفعيل الإشعارات عبر تيليجرام لاستقبال التذكيرات.'
							)}
						</p>
					)}

					{notificationStatus === 'denied' && (
						<p className="text-xs md:text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
							{safeT(
								t,
								'permission.denied',
								'لقد قمت برفض الإشعارات من قبل. يمكنك تعديل الإعدادات من المتصفح، أو تفعيل الإشعارات عبر تيليجرام من الزر بالأسفل.'
							)}
						</p>
					)}

					{notificationStatus === 'default' && (
						<button
							type="button"
							onClick={requestNotificationPermission}
							className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 px-5 py-2.5 text-sm md:text-base text-white font-medium mb-4"
						>
							{safeT(t, 'permission.button', 'تفعيل إشعارات المتصفح')}
						</button>
					)}
					<div className="mt-4">
						<TelegramConnectSection settings={settings} />
					</div>
				</div>
			</main>
		);
	}



	return (
		<main className='container !px-0'>
			<div className='relative z-[10] rounded-lg border border-indigo-100/60 '>
				<div className='absolute rounded-lg inset-0 overflow-hidden'>
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

				<div className='relative p-3 md:p-5 text-white'>
					<div className='flex  flex-row  items-center  justify-between gap-3'>
						<div>
							<h1 className='text-xl md:text-4xl font-semibold max-md:text-center block'>{safeT(t, 'title', 'Reminders')}</h1>
							<p className='text-white/85 mt-1 hidden md:block'>{safeT(t, 'subtitle', 'Manage your personal reminders')}</p>
						</div>

						<div className='flex flex-wrap max-md:justify-center items-center gap-2'>

							<button type='button' onClick={() => setOpenCalendar(true)} title={t('actions.openCalendar')} aria-label={t('actions.openCalendar')} className=' flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20'>
								<CalendarIcon className='inline-block w-4 h-4' />
							</button>

							<QuickCreate t={t} onPick={quickCreate} />
							<button type='button' onClick={onCreate} title={t('actions.createNew')} aria-label={t('actions.createNew')} className=' flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20'>
								<Plus className='inline-block w-4 h-4' />
								{t('actions.createNew')}
							</button>
						</div>
					</div>

					<div className='max-md:mt-[17px] flex items-center justify-between gap-3'>

						<TelegramConnectSection settings={settings} />

						<div className=' max-md:justify-end  flex items-center justify-between gap-2'>
							<div className='flex items-center gap-2'>
								<div className='flex  gap-1 rounded-full bg-white/10 p-2'>
									{viewToggleOptions.map(option => {
										const active = viewMode === option.key;
										return (
											<button type='button' key={option.key} onClick={() => switchView(option.key, { keepReminderId: true })} className={`px-3 py-1.5 text-sm rounded-full transition ${active ? 'bg-white text-indigo-600 font-semibold' : 'text-white/80 hover:bg-white/10'}`}>
												{option.label}
											</button>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<TabsPill outerCn='!pt-4' tabs={tabs} sliceInPhone={false} active={activeDay} onChange={setActiveDay} />

			<section ref={timelineSectionRef} className='mt-6'>
				{viewMode === 'timeline' ? (
					<ReminderTimeline t={t} entries={timelineEntries} highlightReminderId={highlightReminderId} />
				) : (
					<div className='grid grid-cols-1 '>
						{filtered.length === 0 ? (
							<div className=' border border-dashed border-slate-200 p-10 text-center'>
								<p className='text-slate-600'>{safeT(t, 'empty.day', 'No reminders for this day')}</p>
							</div>
						) : (
							filtered.map(r => (
								<ReminderCard
									key={r.id}
									now={now}
									t={t}
									reminder={r}
									settings={
										settings || {
											quietHours: { start: '22:00', end: '07:00' },
										}
									}
									onEdit={() => onEdit(r)}
									onDelete={() => onDelete(r.id)}
									onToggleActive={() => onToggleActive(r.id)}
									onAck={() => onAck(r)}
								/>
							))
						)}
					</div>
				)}
			</section>

			<Modal open={openForm} onClose={() => setOpenForm(false)} title={editing ? safeT(t, 'form.editTitle', 'Edit reminder') : safeT(t, 'form.newTitle', 'New reminder')} maxW='max-w-3xl'>
				<ReminderForm t={t} initial={editing || defaultReminder()} onCancel={() => setOpenForm(false)} onSave={onSave} settings={settings || defaultSettings()} />
			</Modal>

			<Modal open={openSettings} onClose={() => setOpenSettings(false)} title={safeT(t, 'settings.title', 'Settings')} maxW='max-w-2xl'>
				<SettingsPanel
					t={t}
					value={settings || defaultSettings()}
					onChange={async val => {
						try {
							const saved = await updateUserSettingsApi(val);
							setSettings(saved);
						} catch {
							// ignore
						}
					}}
				/>
			</Modal>

			<Modal open={openCalendar} onClose={() => setOpenCalendar(false)} title={safeT(t, 'calendar.title', 'Calendar')} maxW='max-w-4xl'>
				<CalendarView t={t} reminders={reminders} settings={settings || defaultSettings()} />
			</Modal>

			<DueDialog
				open={dueModal.open}
				reminder={dueModal.reminder}
				onClose={() => {
					stopCurrentReminderSound();
					setDueModal({ open: false, reminder: null });
				}}
				onAck={() => {
					if (dueModal.reminder) onAck(dueModal.reminder);
					stopCurrentReminderSound();
					setDueModal({ open: false, reminder: null });
				}}
			/>
		</main>
	);
}


export function TelegramConnectSection({ settings }) {
	const t = useTranslations();
	const [status, setStatus] = useState(
		settings?.telegramEnabled ? 'linked' : 'idle'
	);

	useEffect(() => {
		if (settings?.telegramEnabled) {
			setStatus('linked');
		}
	}, [settings?.telegramEnabled]);

	const handleConnect = async () => {
		if (status === 'linked') return;

		try {
			setStatus('loading');

			const res = await api.post('/reminders/telegram/link');
			const botUrl = res.data?.botUrl;

			if (!botUrl) {
				setStatus('error');
				return;
			}

			window.open(botUrl, '_blank');
			setStatus('waiting');
		} catch (err) {
			setStatus('error');
		}
	};

	const telegramAlreadyEnabled = settings?.telegramEnabled && settings?.telegramChatId;

	return (
		<div className=" ">

			{status !== 'linked' && !telegramAlreadyEnabled && (
				<>
					<button
						onClick={handleConnect}
						disabled={status === 'loading'}
						className="w-full px-3 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs disabled:opacity-50"
					>
						{status === 'loading'
							? t('reminders.telegram.loading')
							: t('reminders.telegram.activate')}
					</button>

				</>
			)}

			{status === 'linked' && telegramAlreadyEnabled && (
				<button
					type="button"
					disabled
					className="w-full px-3 bg-emerald-600 text-white py-2 rounded-lg text-xs opacity-90 cursor-default"
				>
					{t('reminders.telegram.enabled')}
				</button>
			)}
		</div>
	);
}



/* ---------- Timeline ---------- */

function ReminderTimeline({ t, entries, highlightReminderId }) {
	if (!entries.length) {
		return (
			<div className='rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center'>
				<p className='text-slate-600'>{safeT(t, 'timeline.empty', 'No reminders scheduled for today')}</p>
			</div>
		);
	}

	return (
		<div className=' '>
			<div className='flex items-center gap-2 mb-4'>
				<span className='h-2 w-2 rounded-full bg-emerald-500' />
				<p className='text-xs md:text-sm text-slate-500'>{safeT(t, 'timeline.subtitle', 'Timeline of your reminders (today)')}</p>
			</div>
			<div className='relative'>
				<div className='absolute left-4 top-0 bottom-0 hidden md:block border-l border-dashed border-slate-200' />
				<div className='space-y-3 md:space-y-2'>
					{entries.map(entry => {
						const isHighlighted = highlightReminderId && entry.reminderId === highlightReminderId;
						const statusLabel = entry.status === 'past' ? safeT(t, 'timeline.status.past', 'Earlier today') : entry.status === 'now' ? safeT(t, 'timeline.status.now', 'Happening now') : safeT(t, 'timeline.status.upcoming', 'Upcoming');
						const statusClass = entry.status === 'past' ? 'bg-slate-100 text-slate-600' : entry.status === 'now' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700';

						const [time, period] = formatTimelineTime(entry.time);

						return (
							<div key={entry.id} data-reminder-id={entry.reminderId} className={`box-3d relative flex flex-col gap-2 md:flex-row md:items-center md:gap-4 rounded-2xl border px-4 py-3 transition ${isHighlighted ? 'border-emerald-300 ring-2 ring-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
								<div className='absolute -left-[3px] top-4 hidden md:block h-3 w-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm' />

								<div className='flex items-end gap-2'>
									<div className='font-number text-3xl md:text-4xl font-[600] text-slate-900'>{time}</div>
									<div className='font-number text-xs md:text-sm font-[600] text-slate-500'>{period}</div>
									<div className={`rounded-full px-3 py-1 text-[10px] md:text-xs font-semibold ${statusClass}`}>{statusLabel}</div>
								</div>

								<div className='flex-1'>
									{entry.title && <div className='text-sm md:text-base font-semibold text-slate-800'>{entry.title}</div>}
									{entry.notes ? <p className='text-xs md:text-sm text-slate-600'>{entry.notes}</p> : null}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

/* ---------- Shared small components ---------- */

function IconButton({ cn, icon, onClick, label, danger }) {
	return (
		<button type='button' onClick={onClick} aria-label={label} title={label} className={`${cn} rounded-lg border px-2.5 py-2 text-sm transition ${danger ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
			{icon}
		</button>
	);
}

/* ---------- Reminder card ---------- */

const ReminderCard = React.memo(function ReminderCard({ now, t, reminder, onEdit, onDelete, onToggleActive, settings }) {

	const next = useMemo(() => computeNextOccurrence(reminder, settings || {}), [reminder.id, JSON.stringify(reminder?.schedule || {}), JSON.stringify(settings || {}), now?.getTime()]);

	const due = next && next.getTime() <= now.getTime();

	const muted = !reminder.active;

	const remainingMs = next ? Math.max(0, next.getTime() - now.getTime()) : null;
	const remainingStr = remainingMs === null ? '—' : remainingMs === 0 ? safeT(t, 'now', 'Now') : humanDuration(remainingMs, { hhmm: true });

	const almostDue = remainingMs !== null && remainingMs <= 5 * 60 * 1000 && remainingMs > 0;

	const [scheduleText, time, period] = formatSchedule2(t, reminder);

	return (
		<div className={`  hover:bg-slate-50 group bg-white relative  border-b  py-3 px-4 backdrop-blur transition ${muted ? '  border-slate-200' : due ? 'border-emerald-400 ring-2 ring-emerald-300/70' : almostDue ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
			<div className='relative flex items-start justify-between gap-4'>
				<div className=' w-fit '>
					<div className='text-xs mb-1 flex flex-wrap items-center gap-2 text-slate-600'>
						<span className='inline-flex items-end gap-1 text-xs'>
							<div className='relative'>
								{period && <span className=' absolute ltr:-right-7 rtl:-left-7  font-en text-sm font-[800] lowercase font-number '>{period}</span>}
								<span className='text-4xl font-[700] font-number  '>{time}</span>
							</div>
							{scheduleText && <span className='text-nowrap truncate rtl:mr-[2px] ltr:ml-[2px] '>{scheduleText}</span>}
						</span>
					</div>
					<div className='gap-2 flex flex-wrap items-center '>
						<MultiLangText className='  truncate text-base font-semibold text-slate-800'>{reminder.title}</MultiLangText>
						{next && (
							<span className=' text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700'>
								{safeT(t, 'next', 'Next')}: {next ? humanDateTime(next) : '—'}
							</span>
						)}

						{due && <span className={`px-2 py-0.5 rounded-md ${due ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'}`}>{due ? safeT(t, 'now', 'Now') : `${safeT(t, 'willStartAfter', 'يعمل بعد')} ${remainingStr}`} </span>}
						{due && <span className='px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-xs font-semibold'>⏱ {safeT(t, 'passed', 'Passed')}</span>}
					</div>
					{reminder.notes && <p className='mt-1 text-sm text-slate-600'>{reminder.notes}</p>}
				</div>

				<div className='max-md:ltr:absolute max-md:ltr:right-0 max-md:ltr:top-0 max-md:ltr:w-[118px] ltr:w-[150px] relative z-10 flex items-center gap-1 md:gap-2'>
					<IconButton cn={' max-md:h-[30px] h-[35px]  flex items-center justify-center  '} icon={<Edit2 className='w-[16px] max-md:w-[12px] ' />} label={safeT(t, 'actions.edit', 'Edit')} onClick={onEdit} />
					<IconButton cn={' max-md:h-[30px] h-[35px]  flex items-center justify-center  '} danger icon={<Trash2 className='w-[16px] max-md:w-[12px] ' />} label={safeT(t, 'actions.delete', 'Delete')} onClick={onDelete} />
					<div className='max-md:scale-[.9] mt-1 rtl:ml-[-15px] ltr:mr-[-150px] '>
						<Switcher checked={reminder.active} onChange={onToggleActive} />
					</div>
				</div>
			</div>
		</div>
	);
})

/* ---------- timeline building ---------- */

function buildTimelineEntries(reminders = [], settings = {}, targetDate = new Date()) {
	const today = targetDate;
	const todayIso = toISODate(today);
	const dayKey = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][today.getDay()];
	const now = new Date();
	const entries = [];
	const normalizedSettings = settings || {};

	for (const reminder of reminders) {
		if (!reminder?.active) continue;
		const schedule = reminder.schedule || {};
		const times = Array.isArray(schedule.times) && schedule.times.length ? schedule.times : ['08:00'];

		const pushOccurrence = dateObj => {
			entries.push(makeTimelineEntry(reminder, dateObj, now));
		};

		if (schedule.mode === 'interval' || schedule.mode === 'prayer') {
			const next = computeNextOccurrence(reminder, normalizedSettings);
			if (next && sameDay(next, today)) {
				pushOccurrence(next);
			}
			continue;
		}

		if (schedule.mode === 'once') {
			if (schedule.startDate && sameDay(new Date(`${schedule.startDate}T00:00:00`), today)) {
				const firstTime = times[0] || '08:00';
				pushOccurrence(new Date(`${todayIso}T${firstTime}:00`));
			}
			continue;
		}

		if (schedule.mode === 'weekly') {
			const allowedDays = Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length ? schedule.daysOfWeek : WEEK_DAYS.map(d => d.key);
			if (!allowedDays.includes(dayKey)) continue;
		}

		if (schedule.mode === 'monthly' && schedule.startDate) {
			const startDate = new Date(`${schedule.startDate}T00:00:00`);
			if (startDate.getDate() !== today.getDate()) continue;
		}

		times.filter(Boolean).forEach(timeStr => pushOccurrence(new Date(`${todayIso}T${timeStr}:00`)));
	}

	return entries.sort((a, b) => a.time - b.time);
}

function makeTimelineEntry(reminder, time, now) {
	const diff = time.getTime() - now.getTime();
	let status = 'upcoming';
	if (Math.abs(diff) <= 60 * 1000) status = 'now';
	else if (diff < 0) status = 'past';

	return {
		id: `${reminder.id}-${time.getTime()}`,
		reminderId: reminder.id,
		title: reminder.title,
		notes: reminder.notes,
		time,
		status,
	};
}

/* ---------- Form ---------- */

function ReminderForm({ t, initial, onCancel, onSave, settings }) {
	const {
		register,
		handleSubmit,
		control,
		watch,
		setValue,
		reset,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			id: initial?.id || null,
			title: initial?.title || 'Reminder',
			type: 'custom',
			notes: initial?.notes || '',
			active: initial?.active ?? true,
			schedule: normalizeSchedule(initial?.schedule || {}),
			sound: initial?.sound || {
				id: 'chime',
				name: 'Chime',
				previewUrl: SOUND_SAMPLES.chime,
				volume: 0.8,
			},
			priority: initial?.priority || 'normal',
			rrule: initial?.schedule?.rrule || '',
			exdates: initial?.schedule?.exdates || [],
			defaultSnooze: initial?.defaultSnooze ?? 10,
			quietHours: initial?.quietHours || {
				start: '12:00 PM',
				end: '01:00 AM',
			},
			timezone: initial?.timezone || settings.timezone || 'Africa/Cairo',
		},
	});

	useEffect(() => {
		reset({
			id: initial?.id || null,
			title: initial?.title || 'Reminder',
			type: 'custom',
			notes: initial?.notes || '',
			active: initial?.active ?? true,
			schedule: normalizeSchedule(initial?.schedule || {}),
			sound: initial?.sound || {
				id: 'chime',
				name: 'Chime',
				previewUrl: SOUND_SAMPLES.chime,
				volume: 0.8,
			},
			priority: initial?.priority || 'normal',
			rrule: initial?.schedule?.rrule || '',
			exdates: initial?.schedule?.exdates || [],
			defaultSnooze: initial?.defaultSnooze ?? 10,
			quietHours: initial?.quietHours || {
				start: '10:00 PM',
				end: '07:00 AM',
			},
			timezone: initial?.timezone || settings.timezone || 'Africa/Cairo',
		});
	}, [initial, reset, settings.timezone]);

	const mode = watch('schedule.mode');
	const times = watch('schedule.times');
	const [activeTab, setActiveTab] = useState('details');


	const onSubmit = data => {
		onSave({
			...data,
			type: 'custom',
			title: data.title?.trim() || 'Reminder',
			schedule: normalizeSchedule({
				...data.schedule,
				rrule: data.rrule,
				exdates: data.exdates,
			}),
		});
	};

	const addTime = () => setValue('schedule.times', [...(times || []), '12:00']);
	const removeTime = idx =>
		setValue(
			'schedule.times',
			(times || []).filter((_, i) => i !== idx),
		);

	const [todayTimes, setTodayTimes] = useState(null);
	useEffect(() => {
		let mounted = true;
		fetchTodayPrayerTimes(settings)
			.then(tms => {
				if (mounted) setTodayTimes(tms);
			})
			.catch(() => { });
		return () => {
			mounted = false;
		};
	}, [settings.city, settings.country]);



	const MODE_OPTIONS = [
		{ id: 'once', label: safeT(t, 'mode.once', 'Once') },
		{ id: 'daily', label: safeT(t, 'mode.daily', 'Daily') },
		{ id: 'weekly', label: safeT(t, 'mode.weekly', 'Weekly') },
		{ id: 'monthly', label: safeT(t, 'mode.monthly', 'Monthly') },
		{ id: 'prayer', label: safeT(t, 'mode.prayer', 'Prayer') },
		{ id: 'interval', label: safeT(t, 'mode.interval', 'Interval') },
	];

	const intervalOptions = [
		{
			id: '1',
			label: safeT(t, 'interval.every1h', 'Every 1 hour'),
			value: 1,
		},
		{
			id: '2',
			label: safeT(t, 'interval.every2h', 'Every 2 hours'),
			value: 2,
		},
		{
			id: '3',
			label: safeT(t, 'interval.every3h', 'Every 3 hours'),
			value: 3,
		},
		{
			id: '4',
			label: safeT(t, 'interval.every4h', 'Every 4 hours'),
			value: 4,
		},
		{
			id: '5',
			label: safeT(t, 'interval.every5h', 'Every 5 hours'),
			value: 5,
		},
		{
			id: '6',
			label: safeT(t, 'interval.every6h', 'Every 6 hours'),
			value: 6,
		},
	];

	return (
		<form className='grid gap-5' onSubmit={handleSubmit(onSubmit)}>
			{activeTab === 'details' && (
				<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
					<Input label={safeT(t, 'form.title', 'Title')} placeholder={safeT(t, 'form.titlePh', 'Reminder title')} error={errors?.title && safeT(t, 'errors.title', 'Title is required')} value={watch('title')} {...register('title')} />

					<input type='hidden' value='custom' {...register('type')} />



					<div className=' '>
						<div className='mb-1.5 flex items-center gap-1.5'>
							<label className='block text-sm font-medium text-slate-700'>{safeT(t, 'form.mode', 'Mode')}</label>
							<Info className='w-3.5 h-3.5 text-slate-400' />
						</div>
						<Controller control={control} name='schedule.mode' render={({ field }) => <Select options={MODE_OPTIONS} value={field.value || 'daily'} onChange={val => field.onChange(val)} placeholder={safeT(t, 'form.modePh', 'Select mode')} className='min-w-[220px]' />} />
						{errors?.schedule?.mode && <p className='mt-1.5 text-xs text-rose-600'>{safeT(t, 'errors.mode', 'Select a mode')}</p>}
					</div>


					{mode === 'weekly' && <WeeklyDaysSelector t={t} initial={initial} getDays={() => watch('schedule.daysOfWeek')} setDays={arr => setValue('schedule.daysOfWeek', arr)} />}

					{mode === 'interval' && (
						<div className='md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3'>
							<div>
								<label className='mb-1.5 block text-sm font-medium text-slate-700'>{safeT(t, 'form.intervalStart', 'Start time')}</label>
								<TimeField showLabel={false} value={(times && times[0]) || '09:00'} onChange={val => setValue('schedule.times', [val])} />
							</div>
							<Controller
								control={control}
								name='schedule.interval.every'
								render={({ field }) => {
									const currentEvery = field.value || 1;
									return (
										<div>
											<label className='mb-1.5 block text-sm font-medium text-slate-700'>{safeT(t, 'form.intervalEvery', 'Repeat every')}</label>
											<Select
												options={intervalOptions.map(o => ({
													id: String(o.value),
													label: o.label,
												}))}
												value={String(currentEvery)}
												onChange={val => {
													const every = Number(val);
													field.onChange(every);
													const currentInterval = watch('schedule.interval') || {};
													setValue('schedule.interval', {
														...currentInterval,
														every,
														unit: currentInterval.unit || 'hour',
													});
												}}
											/>
										</div>
									);
								}}
							/>
						</div>
					)}

					{mode !== 'prayer' && mode !== 'interval' && (
						<div className='md:col-span-2'>
							<label className='mb-1.5 block text-sm font-medium text-slate-700'>{safeT(t, 'form.times', 'Times')}</label>
							<div className='flex flex-wrap gap-2'>
								{(times || []).map((tVal, i) => (
									<div key={i} className=' relative flex items-center gap-2 '>
										<TimeField
											showLabel={false}
											value={tVal}
											onChange={val => {
												const next = (times || []).map((x, idx) => (idx === i ? val : x));
												next.sort((a, b) => a.localeCompare(b));
												setValue('schedule.times', next);
											}}
										/>
										<IconButton cn={' absolute ltr:right-[5px] rtl:left-[5px] top-[7px] flex items-center justify-center h-[30px] w-[30px] border border-rose-300 '} danger icon={'✕'} onClick={() => removeTime(i)} />
									</div>
								))}
								<button type='button' onClick={addTime} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'>
									{safeT(t, 'form.addTime', 'Add time')}
								</button>
							</div>
						</div>
					)}

					{mode === 'prayer' && (
						<>
							<div className='md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3'>
								<Controller
									control={control}
									name='schedule.prayer.name'
									render={({ field }) => (
										<div>
											<label className='mb-1.5 block text-sm font-medium text-slate-700'>{safeT(t, 'form.prayer', 'Prayer')}</label>
											<Select
												options={PRAYERS.map(p => ({
													id: p,
													label: safeT(t, `prayer.${p.toLowerCase()}`, p),
												}))}
												value={field.value || 'Fajr'}
												onChange={val => field.onChange(val)}
											/>
										</div>
									)}
								/>
								<Controller
									control={control}
									name='schedule.prayer.direction'
									render={({ field }) => (
										<div>
											<label className='mb-1.5 block text-sm font-medium text-slate-700'>{safeT(t, 'form.beforeAfter', 'Before/After')}</label>
											<Select
												options={[
													{
														id: 'before',
														label: safeT(t, 'before', 'Before'),
													},
													{
														id: 'after',
														label: safeT(t, 'after', 'After'),
													},
												]}
												value={field.value || 'before'}
												onChange={val => field.onChange(val)}
											/>
										</div>
									)}
								/>
								<Controller control={control} name='schedule.prayer.offsetMin' render={({ field }) => <Input label={safeT(t, 'form.minutes', 'Minutes')} type='number' value={field.value ?? 10} onChange={e => field.onChange(Number(e.target.value) || 0)} cnInputParent='h-[40px]' />} />
							</div>

							{todayTimes && (
								<div className='md:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600'>
									<div className='font-medium mb-1'>{safeT(t, 'form.todayPrayerTimes', 'Today prayer times')}</div>
									<div className='grid grid-cols-2 sm:grid-cols-3 gap-1'>
										{PRAYERS.map(p => (
											<div key={p} className='flex items-center gap-1'>
												<span className='font-semibold'>{safeT(t, `prayer.${p.toLowerCase()}`, p)}:</span>
												<span>{todayTimes[p] || '—'}</span>
											</div>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</div>
			)}

			{activeTab === 'settings' && (
				<div className='grid gap-4'>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
						<div>
							<label className='mb-1.5 block text-sm font-medium text-slate-700'>{safeT(t, 'settings.defaultSnooze', 'Default snooze (min)')}</label>
							<Input type='number' cnInputParent='h-[40px]' value={watch('defaultSnooze') ?? 10} onChange={e => setValue('defaultSnooze', Number(e.target.value) || 10)} />
						</div>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
						<div>
							<label className='mb-1 block text-sm text-slate-600'>{safeT(t, 'settings.quietFrom', 'Quiet from')}</label>
							<Input
								placeholder='10:00 PM'
								value={watch('quietHours.start') ?? '10:00 PM'}
								onChange={e =>
									setValue('quietHours', {
										...(watch('quietHours') || {}),
										start: e.target.value,
									})
								}
							/>
						</div>
						<div>
							<label className='mb-1 block text-sm text-slate-600'>{safeT(t, 'settings.quietTo', 'Quiet to')}</label>
							<Input
								placeholder='07:00 AM'
								value={watch('quietHours.end') ?? '07:00 AM'}
								onChange={e =>
									setValue('quietHours', {
										...(watch('quietHours') || {}),
										end: e.target.value,
									})
								}
							/>
						</div>
						<div>
							<label className='mb-1 block text-sm text-slate-600'>{safeT(t, 'settings.timezone', 'Timezone')}</label>
							<Input value={watch('timezone') ?? 'Africa/Cairo'} onChange={e => setValue('timezone', e.target.value)} />
						</div>
					</div>
				</div>
			)}

			<div className='mt-4 flex items-center justify-end gap-2'>
				<button
					type='button'
					onClick={() => {
						onCancel();
					}}
					className='rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50'>
					{safeT(t, 'actions.cancel', 'Cancel')}
				</button>
				<button type='submit' className='rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-4 py-2'>
					{safeT(t, 'actions.save', 'Save')}
				</button>
			</div>
		</form>
	);
}

/* ---------- Weekly day selector ---------- */

function WeeklyDaysSelector({ t, initial, getDays, setDays }) {
	const days = getDays() || initial?.schedule?.daysOfWeek || [];
	const orderedDays = WEEK_DAYS;
	const isSelected = k => (days || []).includes(k);
	const setSorted = arr => setDays(Array.from(new Set(arr)));
	const toggle = k => {
		const cur = new Set(days || []);
		cur.has(k) ? cur.delete(k) : cur.add(k);
		setSorted([...cur]);
	};


	return (
		<div className='md:col-span-2'>
			<label className='mb-1.5 block text-sm font-medium text-slate-700'>{safeT(t, 'form.weekdays', 'Week days')}</label>

			<div className='flex flex-wrap gap-2'>
				{orderedDays.map(d => {
					const selected = isSelected(d.key);
					return (
						<button key={d.key} type='button' role='checkbox' aria-checked={selected} title={safeT(t, `weekday.${d.label}`, d.label)} onClick={() => toggle(d.key)} className={['h-9 min-w-9 px-3 rounded-lg text-sm font-medium transition-all select-none', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50', selected ? 'bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'].join(' ')}>
							{safeT(t, `weekday.${d.label}`, d.label)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

/* ---------- Settings panel ---------- */

function SettingsPanel({ t, value, onChange }) {
	const [v, setV] = useState(value);
	const set = patch => setV(s => ({ ...s, ...patch }));
	const save = async () => {
		try {
			const saved = await updateUserSettingsApi(v);
			onChange(saved);
		} catch {
			// ignore
		}
	};
	return (
		<div className='grid gap-4'>
			<div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
				<Input label={safeT(t, 'settings.timezone', 'Timezone')} cnInputParent='h-[40px]' value={v.timezone} onChange={e => set({ timezone: e.target.value })} />
				<Input label={safeT(t, 'settings.city', 'City')} cnInputParent='h-[40px]' value={v.city} onChange={e => set({ city: e.target.value })} />
				<Input label={safeT(t, 'settings.country', 'Country')} cnInputParent='h-[40px]' value={v.country} onChange={e => set({ country: e.target.value })} />
			</div>
			<div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
				<div>
					<label className='mb-1 block text-sm text-slate-600'>{safeT(t, 'settings.quietFrom', 'Quiet from')}</label>
					<Input
						value={v.quietHours.start}
						onChange={e =>
							set({
								quietHours: { ...v.quietHours, start: e.target.value },
							})
						}
						placeholder='10:00 PM'
					/>
				</div>
				<div>
					<label className='mb-1 block text-sm text-slate-600'>{safeT(t, 'settings.quietTo', 'Quiet to')}</label>
					<Input
						value={v.quietHours.end}
						onChange={e =>
							set({
								quietHours: { ...v.quietHours, end: e.target.value },
							})
						}
						placeholder='07:00 AM'
					/>
				</div>
				<Input label={safeT(t, 'settings.defaultSnooze', 'Default snooze (min)')} type='number' cnInputParent='h-[40px]' value={v.defaultSnooze} onChange={e => set({ defaultSnooze: Number(e.target.value) || 10 })} />
			</div>
			<div className='flex justify-end'>
				<button type='button' onClick={save} className='rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-4 py-2'>
					{safeT(t, 'actions.save', 'Save')}
				</button>
			</div>
		</div>
	);
}

/* ---------- Calendar ---------- */

function CalendarView({ t, reminders, settings }) {
	const [cursor, setCursor] = React.useState(new Date());
	const [selectedDate, setSelectedDate] = React.useState(new Date());

	useEffect(() => {
		const today = new Date();
		setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
		setSelectedDate(today);
	}, []);

	const y = cursor.getFullYear();
	const m = cursor.getMonth();
	const first = new Date(y, m, 1);
	const startWeekday = (first.getDay() + 6) % 7;
	const daysInMonth = new Date(y, m + 1, 0).getDate();

	const daySlots = [];
	for (let i = 0; i < startWeekday; i++) daySlots.push(null);
	for (let d = 1; d <= daysInMonth; d++) daySlots.push(new Date(y, m, d));

	const byDay = new Map();
	reminders.forEach(r => {
		const s = r.schedule || {};
		if (s.mode === 'once') {
			const dt = new Date(`${s.startDate}T00:00:00`);
			const key = toISODate(dt);
			byDay.set(key, [...(byDay.get(key) || []), r]);
			return;
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const day = new Date(y, m, d);
			const key = toISODate(day);
			if (s.mode === 'weekly') {
				const code = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][day.getDay()];
				if ((s.daysOfWeek || []).includes(code)) {
					byDay.set(key, [...(byDay.get(key) || []), r]);
				}
			} else {
				byDay.set(key, [...(byDay.get(key) || []), r]);
			}
		}
	});

	const selectedKey = selectedDate ? toISODate(selectedDate) : null;
	const selectedList = selectedKey ? byDay.get(selectedKey) || [] : [];

	const goToToday = () => {
		const today = new Date();
		setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
		setSelectedDate(today);
	};

	return (
		<div className='w-full space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 shadow-sm backdrop-blur-sm sm:p-4 lg:p-6'>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex items-center justify-between gap-2 sm:gap-4'>
					<button className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 text-lg leading-none shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95' onClick={() => setCursor(new Date(y, m - 1, 1))}>
						‹
					</button>

					<div className='flex flex-col text-center sm:text-left'>
						<span className='text-base font-semibold text-slate-900 sm:text-lg'>
							{cursor.toLocaleDateString('ar-EG', {
								month: 'long',
								year: 'numeric',
							})}
						</span>
						<span className='text-xs text-slate-500'>{safeT(t, 'calendar.subtitle', 'Tap a day to see reminders')}</span>
					</div>

					<button className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 text-lg leading-none shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95' onClick={() => setCursor(new Date(y, m + 1, 1))}>
						›
					</button>
				</div>

				<div className='flex items-center gap-2 sm:justify-end'>
					<button onClick={goToToday} className='inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95'>
						<span className='mr-1 h-2 w-2 rounded-full bg-emerald-500' />
						{safeT(t, 'calendar.today', 'Today')}
					</button>
				</div>
			</div>

			<div className='grid gap-4 lg:grid-cols-5'>
				<div className='lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:p-5 shadow-sm'>
					<div className='grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:gap-2 sm:text-[12px]'>
						{['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => (
							<div key={d} className='py-1'>
								{safeT(t, `weekday.header.${d}`, d)}
							</div>
						))}
					</div>

					<div className='mt-2 grid grid-cols-7 gap-1.5 sm:gap-2'>
						{daySlots.map((d, i) => {
							if (!d) {
								return <div key={i} className='aspect-square rounded-xl border border-transparent p-1' />;
							}

							const key = toISODate(d);
							const list = byDay.get(key) || [];
							const count = list.length;
							const isToday = sameDay(d, new Date());
							const isSelected = selectedDate && sameDay(d, selectedDate);

							let stateClasses = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
							if (isToday) {
								stateClasses = 'border-emerald-400 bg-emerald-50/70 text-emerald-900 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]';
							}
							if (isSelected) {
								stateClasses = 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]';
							}

							return (
								<button key={i} onClick={() => setSelectedDate(d)} className={`group flex flex-col justify-between rounded-2xl border p-1.5 text-left text-xs sm:p-2 sm:text-sm transition-all duration-150 ease-out min-h-[56px] sm:min-h-[72px] ${stateClasses}`}>
									<div className='flex items-center justify-between gap-1'>
										<span className='text-[11px] font-semibold sm:text-sm'>{d.getDate()}</span>
										{count > 0 && <span className='rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-white sm:text-[11px]'>{count}</span>}
									</div>

									{count > 0 && (
										<div className='mt-1 flex flex-wrap gap-0.5'>
											{Array.from({ length: Math.min(count, 4) }).map((_, idx) => (
												<span key={idx} className='h-1.5 w-1.5 rounded-full bg-slate-400/80 group-hover:bg-slate-600/90' />
											))}
											{count > 4 && <span className='ml-auto text-[10px] text-slate-500'>+{count - 4}</span>}
										</div>
									)}
								</button>
							);
						})}
					</div>
				</div>

				<div className='lg:col-span-2'>
					<div className='flex flex-col rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm h-full'>
						<div className='mb-3 flex items-center justify-between gap-2'>
							<div className='flex flex-col'>
								<span className='text-sm font-semibold text-slate-800 sm:text-base'>
									{selectedDate
										? `${safeT(t, 'calendar.remindersOf', 'Reminders of')} ${selectedDate.toLocaleDateString('ar-EG', {
											weekday: 'long',
											day: 'numeric',
											month: 'long',
										})}`
										: safeT(t, 'calendar.pickDay', 'Pick a day')}
								</span>
								{selectedDate && (
									<span className='text-[11px] text-slate-500 sm:text-xs'>
										{safeT(t, 'calendar.total', 'Total reminders:')} {selectedList.length}
									</span>
								)}
							</div>
						</div>

						<div className='flex-1 overflow-y-auto pr-1 space-y-2 max-h-[260px] sm:max-h-[320px]'>
							{selectedList.length === 0 ? (
								<p className='rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-xs text-slate-500 sm:text-sm'>{selectedDate ? safeT(t, 'calendar.noneForDay', 'No reminders for this day') : safeT(t, 'calendar.none', 'Select a day to view reminders')}</p>
							) : (
								selectedList.map((r, idx) => (
									<div key={idx} className='group rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:border-blue-500/60 hover:bg-blue-50/40 sm:text-sm'>
										<div className='flex items-start justify-between gap-2'>
											<div>
												<div className='line-clamp-1 text-[13px] font-semibold text-slate-900 sm:text-sm'>{r.title || safeT(t, 'untitled', 'Untitled')}</div>
												<div className='mt-0.5 text-[11px] text-slate-500 sm:text-xs'>{formatSchedule(t, r)}</div>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</div>

			<div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 shadow-sm sm:hidden'>
				<span>
					{selectedDate
						? selectedDate.toLocaleDateString('ar-EG', {
							weekday: 'short',
							day: 'numeric',
							month: 'short',
						})
						: safeT(t, 'calendar.mobileHint', 'Tap a day to see its reminders')}
				</span>
				{selectedDate && (
					<span className='rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700'>
						{selectedList.length} {safeT(t, 'calendar.remindersShort', 'reminders')}
					</span>
				)}
			</div>
		</div>
	);
}

/* ---------- Quick create ---------- */

function QuickCreate({ t, onPick }) {
	const [open, setOpen] = useState(false);
	const options = [
		{ id: '1', label: '1' },
		{ id: '5', label: '5' },
		{ id: '10', label: '10' },
		{ id: '15', label: '15' },
		{ id: '30', label: '30' },
		{ id: '50', label: '50' },
		{ id: 'custom', label: safeT(t, 'quick.custom', 'Custom…') },
	];
	const [custom, setCustom] = useState('');
	return (
		//
		<div className='relative  max-sm:hidden'>
			<button type='button' onClick={() => setOpen(v => !v)} className='flex gap-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20' aria-label={safeT(t, 'quick.title', 'Quick reminder')} title={safeT(t, 'quick.title', 'Quick reminder')}>
				<Zap className='inline-block w-4 h-4 mt-[2px]' />
				{safeT(t, 'quick.after', 'After X min')}
			</button>
			<AnimatePresence>
				{open && (
					<motion.div className='absolute ltr:left-0 rtl:right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl z-50' initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
						<div className='grid gap-1 max-h-[105px] overflow-y-auto'>
							{options.slice(0, 6).map(o => (
								<button
									key={o.id}
									className='rtl:text-right text-left rounded-md text-slate-800 px-3 py-2 text-sm hover:bg-slate-50'
									onClick={() => {
										onPick(Number(o.id));
										setOpen(false);
									}}>
									{safeT(t, 'quick.createIn', 'Create in')} {o.id} {safeT(t, 'minutesShort', 'min')}
								</button>
							))}
							<div className='border-t border-slate-100 my-1' />
							<div className='flex items-center gap-2 px-2'>
								<input type='number' min={1} placeholder={safeT(t, 'quick.custom', 'Custom…')} className='text-slate-800 h-[36px] w-full rounded-lg border border-slate-300 px-2 text-base' value={custom} onChange={e => setCustom(e.target.value)} />
								<button
									className='rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white px-3 py-2 text-xs'
									onClick={() => {
										const n = Number(custom);
										if (!Number.isNaN(n) && n > 0) onPick(n);
										setCustom('');
										setOpen(false);
									}}>
									{safeT(t, 'actions.add', 'Add')}
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ---------- Due dialog ---------- */

function DueDialog({ open, reminder, onClose, onAck }) {
	if (!open || !reminder) return null;
	const t = useTranslations('reminders');
	return (
		<Modal open={open} onClose={onClose} title={reminder.title || 'Reminder'} maxW='max-w-md'>
			<div className='grid gap-3'>
				{reminder.notes && <p className='text-slate-700'>{reminder.notes}</p>}
				<div className='flex items-center justify-end gap-2'>
					<button onClick={onClose} className='rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50'>
						{safeT(t, 'actions.close', 'Close')}
					</button>
					<button onClick={onAck} className='rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-4 py-2'>
						{safeT(t, 'actions.done', 'Done')}
					</button>
				</div>
			</div>
		</Modal>
	);
}

/* ---------- Push subscription helpers ---------- */

const subscribeToPush = async registration => {
	try {
		// 🔍 Diagnostic: Check protocol
		const protocol = window.location.protocol;
		const hostname = window.location.hostname;
		const isSecureContext = window.isSecureContext;

		if (!isSecureContext && hostname !== 'localhost' && hostname !== '127.0.0.1') {
			throw new Error(`⚠️ SECURITY ERROR: Push API requires HTTPS or localhost. ` + `Current: ${protocol}//${hostname}. ` + `If using IP address, switch to localhost or use HTTPS.`);
		}

		const data = await api.get('/reminders/push/vapid-key');

		if (!data?.data?.publicKey) {
			throw new Error('No VAPID public key received from server');
		}
		let applicationServerKey;
		try {
			const publicKey = data.data.publicKey;
			applicationServerKey = urlBase64ToUint8Array_local(publicKey);
		} catch (convertError) {
			throw new Error(`Failed to convert VAPID key: ${convertError.message}`);
		}

		if (!registration.active) {
			await new Promise(resolve => {
				if (registration.installing) {
					registration.installing.addEventListener('statechange', () => {
						if (registration.active) {
							resolve(null);
						}
					});
				} else {
					setTimeout(resolve, 1000);
				}
			});

			if (!registration.active) {
				throw new Error('Service Worker is not active after waiting');
			}
		}

		let permission = Notification.permission;
		if (permission === 'default') {
			permission = await Notification.requestPermission();
		}

		if (permission !== 'granted') {
			throw new Error('Notification permission not granted: ' + permission);
		}

		let subscription = await registration.pushManager.getSubscription();

		if (!subscription) {
			try {

				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: applicationServerKey,
				});
				console.log(subscription);
			} catch (subscribeError) {

				// Try alternate approach without applicationServerKey
				if (subscribeError.name === 'AbortError') {
					try {
						const subWithoutKey = await registration.pushManager.subscribe({ userVisibleOnly: true });
						subscription = subWithoutKey;
					} catch (fallbackError) {
						throw subscribeError; // Throw original error
					}
				} else {
					throw subscribeError;
				}
			}
		}
		if (!subscription) {
			throw new Error('Subscription is null after creation');
		}

		const p256dh = subscription.getKey('p256dh');
		const auth = subscription.getKey('auth');

		if (!p256dh || !auth) {
			throw new Error('Missing subscription keys');
		}


		const p256dhBase64 = arrayBufferToBase64_local(p256dh);
		const authBase64 = arrayBufferToBase64_local(auth);

		const subscriptionData = {
			endpoint: subscription.endpoint,
			keys: {
				p256dh: p256dhBase64,
				auth: authBase64,
			},
		};

		const postResponse = await api.post('/reminders/push/subscribe', subscriptionData);
		return subscription;
	} catch (error) {
		throw error;
	}
};

function arrayBufferToBase64_local(buffer) {
	if (!buffer) {
		throw new Error('Buffer is null or undefined');
	}
	const bytes = new Uint8Array(buffer);
	console.log(`[arrayBufferToBase64] Converting ${bytes.byteLength} bytes to base64...`);

	// استخدام طريقة آمنة تعمل على جميع المتصفحات
	let binary = '';
	const chunkSize = 8192; // معالجة 8KB في كل مرة لتجنب stack overflow

	for (let i = 0; i < bytes.byteLength; i += chunkSize) {
		const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
		binary += String.fromCharCode.apply(null, chunk);
	}

	const base64 = window.btoa(binary);
	const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	console.log(`[arrayBufferToBase64] ✅ Success: ${bytes.byteLength} bytes → base64 (${urlSafeBase64.length} chars)`);
	return urlSafeBase64;
}

function urlBase64ToUint8Array_local(base64String) {
	if (!base64String) {
		throw new Error('Base64 string is empty');
	}

	const cleaned = base64String.trim();

	const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
	const base64 = (cleaned + padding).replace(/\-/g, '+').replace(/_/g, '/');

	try {
		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	} catch (error) {
		throw new Error(`Invalid VAPID public key format: ${error.message}`);
	}
}

export function addMonths(date, months) {
	const d = new Date(date);
	d.setMonth(d.getMonth() + months);
	return d;
}

/* ---------- Local Input component (replaces imported Input) ---------- */

function Input({ label, type = 'text', error, placeholder, cnInputParent = '', className = '', name, onChange, onBlur, value, defaultValue, id, inputRef, disabled = false, clearable = true, cnInput = '', ...rest }) {
	const inputId = id || (name ? `input-${name}` : undefined);

	const handleChange = e => {
		if (typeof onChange === 'function') {
			onChange(e); // keep same API (event)
		}
	};

	// derive current value to decide showing clear icon
	const currentValue = typeof value !== 'undefined' ? value : typeof defaultValue !== 'undefined' ? defaultValue : '';

	const showClear = clearable && !disabled && currentValue !== '';

	const clearInput = e => {
		e.stopPropagation();

		if (typeof onChange === 'function') {
			// Build a minimal event-like object so existing handlers using e.target.value / e.target.name still work
			const fakeEvent = {
				...e,
				target: {
					...(e.target || {}),
					name,
					value: '',
				},
			};
			onChange(fakeEvent);
		}

		if (inputRef && typeof inputRef === 'object' && inputRef.current) {
			inputRef.current.focus();
		}
	};

	return (
		<div className={`w-full relative ${className}`}>
			{label && (
				<label htmlFor={inputId} className='mb-1.5 block text-sm font-medium text-slate-700'>
					{label}
				</label>
			)}

			<div className={[cnInputParent, 'relative flex items-center rounded-lg border bg-white', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text', error && error !== 'users' ? 'border-rose-500' : 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500', 'focus-within:ring-4 focus-within:ring-indigo-100', 'transition-colors'].join(' ')}>
				<input id={inputId} name={name} type={type} placeholder={placeholder} className={`input-3d ${cnInput} h-[40px] ltr:pr-[28px] rtl:pl-[28px] w-full rounded-lg px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-gray-400`} value={value} defaultValue={defaultValue} onChange={handleChange} onBlur={onBlur} ref={inputRef} disabled={disabled} aria-invalid={!!error} {...rest} />

				{showClear && <X size={16} className='absolute rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-60 transition hover:opacity-100' onClick={clearInput} />}
			</div>

			{error && error !== 'users' && <p className='mt-1.5 text-xs text-rose-600'>{error}</p>}
		</div>
	);
}
