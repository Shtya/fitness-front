'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
	AlertCircle,
	CalendarClock,
	Check,
	Loader2,
	Plus,
	Search,
	X,
} from 'lucide-react';
import api from '@/utils/axios';

const copy = {
	en: {
		title: 'Schedule message',
		editTitle: 'Edit schedule',
		subtitle: 'Send later to one or more chats',
		editSubtitle: 'Update message or timing',
		message: 'Message',
		messagePlaceholder: 'Type the message to send…',
		recipients: 'Send to',
		addMore: 'Add chats',
		searchChats: 'Search chats',
		selectedCount: '{count} selected',
		when: 'Schedule',
		once: 'Once',
		daily: 'Daily',
		customDays: 'Custom',
		dateTime: 'Date & time',
		timeOfDay: 'Time',
		endDate: 'Ends (optional)',
		days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
		schedule: 'Schedule',
		save: 'Save',
		scheduling: 'Scheduling…',
		saving: 'Saving…',
		cancel: 'Cancel',
		emptyMessage: 'Write the message to schedule.',
		needRecipients: 'Select at least one chat.',
		needFutureTime: 'Pick a time at least 1 minute from now.',
		created: 'Message scheduled',
		updated: 'Schedule updated',
		failed: 'Could not schedule message',
		updateFailed: 'Could not update schedule',
		quick: 'Quick picks',
		inOneHour: 'In 1 hour',
		tonight: 'Tonight, 8 PM',
		tomorrow: 'Tomorrow, 9 AM',
		repeatOn: 'Repeat on',
		chars: '{count} characters',
		removeChat: 'Remove {name}',
		summaryOnce: 'Sends {when}',
		summaryDaily: 'Sends every day at {time}',
		summaryDays: 'Sends every {days} at {time}',
		summaryUntil: ', until {date}',
		pastTime: 'This time has passed. Pick a time at least 1 minute from now.',
		noDays: 'Pick at least one day.',
		noChats: 'No chats match.',
	},
	ar: {
		title: 'جدولة رسالة',
		editTitle: 'تعديل الجدولة',
		subtitle: 'أرسل لاحقًا لشات واحد أو أكثر',
		editSubtitle: 'عدّل الرسالة أو الموعد',
		message: 'الرسالة',
		messagePlaceholder: 'اكتب الرسالة المراد إرسالها…',
		recipients: 'إلى',
		addMore: 'إضافة شاتات',
		searchChats: 'ابحث في الشاتات',
		selectedCount: '{count} محدد',
		when: 'الموعد',
		once: 'مرة',
		daily: 'يومي',
		customDays: 'مخصص',
		dateTime: 'التاريخ والوقت',
		timeOfDay: 'الوقت',
		endDate: 'ينتهي (اختياري)',
		days: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
		schedule: 'جدولة',
		save: 'حفظ',
		scheduling: 'جاري…',
		saving: 'جاري الحفظ…',
		cancel: 'إلغاء',
		emptyMessage: 'اكتب الرسالة المراد جدولتها.',
		needRecipients: 'اختَر شات واحد على الأقل.',
		needFutureTime: 'اختَر وقت بعد دقيقة على الأقل.',
		created: 'تمت جدولة الرسالة',
		updated: 'تم تحديث الجدولة',
		failed: 'تعذّرت جدولة الرسالة',
		updateFailed: 'تعذّر تحديث الجدولة',
		quick: 'اختيارات سريعة',
		inOneHour: 'بعد ساعة',
		tonight: 'الليلة ٨ م',
		tomorrow: 'غدًا ٩ ص',
		repeatOn: 'التكرار في',
		chars: '{count} حرف',
		removeChat: 'إزالة {name}',
		summaryOnce: 'تُرسل {when}',
		summaryDaily: 'تُرسل كل يوم الساعة {time}',
		summaryDays: 'تُرسل كل {days} الساعة {time}',
		summaryUntil: ' حتى {date}',
		pastTime: 'هذا الوقت فات. اختر وقتًا بعد دقيقة على الأقل.',
		noDays: 'اختر يومًا واحدًا على الأقل.',
		noChats: 'لا توجد محادثات مطابقة.',
	},
};

function formatTemplate(template, values) {
	return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));
}

function defaultDateTimeLocal(date = new Date(Date.now() + 60 * 60 * 1000)) {
	const pad = value => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultTimeValue(date = new Date()) {
	const pad = value => String(value).padStart(2, '0');
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

// JS weekday index (0 = Sunday). 2024-01-07 was a Sunday.
function weekdayLabel(index, ar, style = 'short') {
	return new Date(2024, 0, 7 + index).toLocaleDateString(ar ? 'ar-EG' : undefined, { weekday: style });
}

function formatTimeOfDay(value, ar) {
	const [h, m] = String(value || '').split(':').map(Number);
	if (!Number.isFinite(h) || !Number.isFinite(m)) return value || '';
	return new Date(2024, 0, 1, h, m).toLocaleTimeString(ar ? 'ar-EG' : undefined, {
		hour: 'numeric',
		minute: '2-digit',
	});
}

function initialsOf(title) {
	return (
		String(title || '?')
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.filter(part => /\p{L}/u.test(part[0]))
											.map(part => part[0])
			.join('')
			.toUpperCase() || '#'
	);
}

function computePopoverPosition(anchorEl) {
	const margin = 10;
	const width = Math.min(420, (window.innerWidth || 1280) - margin * 2);
	const maxHeight = Math.min(640, (window.innerHeight || 800) - margin * 2);
	const rect = anchorEl?.getBoundingClientRect?.();
	if (!rect) {
		return {
			top: Math.max(margin, ((window.innerHeight || 800) - maxHeight) / 2),
			left: Math.max(margin, ((window.innerWidth || 1280) - width) / 2),
			width,
			maxHeight,
		};
	}
	const gap = 8;
	const spaceBelow = window.innerHeight - rect.bottom - margin - gap;
	const spaceAbove = rect.top - margin - gap;
	const openUp = spaceBelow < 320 && spaceAbove > spaceBelow;
	const available = Math.max(220, openUp ? spaceAbove : spaceBelow);
	const height = Math.min(maxHeight, available);
	const top = openUp
		? Math.max(margin, rect.top - gap - height)
		: Math.min(rect.bottom + gap, window.innerHeight - margin - 120);
	let left = rect.right - width;
	left = clamp(left, margin, window.innerWidth - width - margin);
	return { top, left, width, maxHeight: height };
}

export default function ScheduleMessageDialog({
	open,
	onOpenChange,
	anchorEl = null,
	ar = false,
	accountId,
	conversations = [],
	initialConversationId,
	initialText = '',
	editingSchedule = null,
	onCreated,
	onUpdated,
}) {
	const t = ar ? copy.ar : copy.en;
	const editing = Boolean(editingSchedule?.id);
	const panelRef = useRef(null);
	const [position, setPosition] = useState(null);
	const [mode, setMode] = useState('once');
	const [messageText, setMessageText] = useState('');
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	const [pickerOpen, setPickerOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [onceAt, setOnceAt] = useState(() => defaultDateTimeLocal());
	const [timeOfDay, setTimeOfDay] = useState(() => defaultTimeValue());
	const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]);
	const [endDate, setEndDate] = useState('');
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!open) return;
		if (editingSchedule?.id) {
			setMessageText(String(editingSchedule.text || editingSchedule.title || '').trim());
			const ids = new Set(
				(Array.isArray(editingSchedule.recipients) ? editingSchedule.recipients : [])
					.map(item => String(item?.conversationId || ''))
					.filter(Boolean),
			);
			if (!ids.size && initialConversationId) ids.add(String(initialConversationId));
			setSelectedIds(ids);
			const kind = String(editingSchedule.scheduleKind || 'once');
			const days = Array.isArray(editingSchedule.daysOfWeek) ? editingSchedule.daysOfWeek : [];
			if (kind === 'recurring') {
				setMode(days.length === 7 ? 'daily' : 'custom');
				setDaysOfWeek(days.length ? days : [1, 2, 3, 4, 5]);
				setTimeOfDay(editingSchedule.timeOfDay || defaultTimeValue());
				setEndDate(
					editingSchedule.recurrenceEndDate
						? String(editingSchedule.recurrenceEndDate).slice(0, 10)
						: '',
				);
			} else {
				setMode('once');
				const when = editingSchedule.scheduledAt || editingSchedule.nextRunAt;
				setOnceAt(when ? defaultDateTimeLocal(new Date(when)) : defaultDateTimeLocal());
			}
		} else {
			setMessageText(String(initialText || '').trim());
			const next = new Set();
			if (initialConversationId) next.add(String(initialConversationId));
			setSelectedIds(next);
			setMode('once');
			setOnceAt(defaultDateTimeLocal());
			setTimeOfDay(defaultTimeValue());
			setDaysOfWeek([1, 2, 3, 4, 5]);
			setEndDate('');
		}
		setSearch('');
		setPickerOpen(false);
	}, [open, initialConversationId, initialText, editingSchedule]);

	useEffect(() => {
		if (!open) {
			setPosition(null);
			return undefined;
		}
		const update = () => setPosition(computePopoverPosition(anchorEl));
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorEl]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') onOpenChange?.(false);
		};
		const onPointer = event => {
			if (panelRef.current?.contains(event.target)) return;
			if (anchorEl && (anchorEl === event.target || anchorEl.contains?.(event.target))) return;
			onOpenChange?.(false);
		};
		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onPointer);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onPointer);
		};
	}, [open, anchorEl, onOpenChange]);

	const filteredConversations = useMemo(() => {
		const query = search.trim().toLowerCase();
		return (Array.isArray(conversations) ? conversations : []).filter(item => {
			if (!item?.id) return false;
			if (!query) return true;
			return String(item.title || '').toLowerCase().includes(query);
		});
	}, [conversations, search]);

	const selectedChips = useMemo(
		() =>
			[...selectedIds]
				.map(id => conversations.find(item => String(item.id) === String(id)))
				.filter(Boolean),
		[selectedIds, conversations],
	);

	const toggleConversation = id => {
		if (editing) return;
		setSelectedIds(current => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleDay = day => {
		setDaysOfWeek(current => {
			const next = new Set(current);
			if (next.has(day)) next.delete(day);
			else next.add(day);
			return [...next].sort((a, b) => a - b);
		});
	};

	const submit = async () => {
		if (!accountId && !editing) return;
		const text = messageText.trim();
		if (!text) {
			toast.error(t.emptyMessage);
			return;
		}
		const conversationIds = [...selectedIds];
		if (!conversationIds.length) {
			toast.error(t.needRecipients);
			return;
		}

		setSubmitting(true);
		try {
			if (editing) {
				const payload = { text };
				if (mode === 'once') {
					const scheduled = new Date(onceAt);
					if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now() + 60_000) {
						toast.error(t.needFutureTime);
						setSubmitting(false);
						return;
					}
					payload.scheduledAt = scheduled.toISOString();
				} else {
					payload.timeOfDay = timeOfDay;
					payload.daysOfWeek = mode === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek;
					if (!payload.daysOfWeek.length) {
						toast.error(ar ? 'اختَر يوم واحد على الأقل' : 'Select at least one weekday');
						setSubmitting(false);
						return;
					}
					payload.recurrenceEndDate = endDate || null;
				}
				await api.patch(`/whatsapp/message-schedules/${editingSchedule.id}`, payload);
				toast.success(t.updated);
				onUpdated?.();
				onOpenChange?.(false);
			} else {
				const payload = {
					type: 'text',
					text,
					conversationIds,
					scheduleKind: mode === 'once' ? 'once' : 'recurring',
					timezone: 'Asia/Qatar',
					clientMessageId: `schedule:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
				};

				if (mode === 'once') {
					const scheduled = new Date(onceAt);
					if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now() + 60_000) {
						toast.error(t.needFutureTime);
						setSubmitting(false);
						return;
					}
					payload.scheduledAt = scheduled.toISOString();
				} else {
					payload.timeOfDay = timeOfDay;
					payload.daysOfWeek = mode === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek;
					if (!payload.daysOfWeek.length) {
						toast.error(ar ? 'اختَر يوم واحد على الأقل' : 'Select at least one weekday');
						setSubmitting(false);
						return;
					}
					if (endDate) payload.recurrenceEndDate = endDate;
				}

				await api.post(`/whatsapp/accounts/${accountId}/message-schedules`, payload);
				toast.success(t.created);
				onCreated?.();
				onOpenChange?.(false);
			}
		} catch (error) {
			toast.error(
				error?.response?.data?.message ||
					error?.message ||
					(editing ? t.updateFailed : t.failed),
			);
		} finally {
			setSubmitting(false);
		}
	};

	const onceDate = new Date(onceAt);
	const oncePast =
		mode === 'once' && (!Number.isFinite(onceDate.getTime()) || onceDate.getTime() <= Date.now() + 60_000);
	const noDays = mode === 'custom' && !daysOfWeek.length;
	const canSubmit =
		!submitting && Boolean(messageText.trim()) && selectedIds.size > 0 && !oncePast && !noDays;
	const endLabel = endDate
		? new Date(`${endDate}T00:00`).toLocaleDateString(ar ? 'ar-EG' : undefined, {
				month: 'short',
				day: 'numeric',
			})
		: '';
	let summary = '';
	if (mode === 'once' && !oncePast) {
		summary = formatTemplate(t.summaryOnce, {
			when: onceDate.toLocaleString(ar ? 'ar-EG' : undefined, {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			}),
		});
	} else if (mode === 'daily') {
		summary = formatTemplate(t.summaryDaily, { time: formatTimeOfDay(timeOfDay, ar) });
	} else if (mode === 'custom' && daysOfWeek.length) {
		summary = formatTemplate(t.summaryDays, {
			days:
				// Mon–Fri is only 'the workweek' in English; Arabic locales often work Sun–Thu.
				!ar && daysOfWeek.join(',') === '1,2,3,4,5'
					? 'weekday'
					: daysOfWeek.map(day => weekdayLabel(day, ar)).join(ar ? '، ' : ', '),
			time: formatTimeOfDay(timeOfDay, ar),
		});
	}
	if (summary && mode !== 'once' && endLabel) summary += formatTemplate(t.summaryUntil, { date: endLabel });

	const quickPicks = (() => {
		const now = new Date();
		const inHour = new Date(now.getTime() + 60 * 60 * 1000);
		const tonight = new Date(now);
		tonight.setHours(20, 0, 0, 0);
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(9, 0, 0, 0);
		return [
			['hour', t.inOneHour, inHour],
			tonight.getTime() > now.getTime() + 15 * 60 * 1000 ? ['tonight', t.tonight, tonight] : null,
			['tomorrow', t.tomorrow, tomorrow],
		].filter(Boolean);
	})();
	const modes = editing
		? editingSchedule?.scheduleKind === 'once'
			? [['once', t.once]]
			: [
					['daily', t.daily],
					['custom', t.customDays],
				]
		: [
				['once', t.once],
				['daily', t.daily],
				['custom', t.customDays],
			];

	if (!open || !position || typeof document === 'undefined') return null;

	return createPortal(
		<div
			ref={panelRef}
			role="dialog"
			aria-labelledby="wa-sched-title"
			dir={ar ? 'rtl' : 'ltr'}
			className="wa-ui-schedule"
			style={{
				top: position.top,
				left: position.left,
				width: position.width,
				maxHeight: position.maxHeight,
			}}
			onPointerDown={event => event.stopPropagation()}
		>
			<div className="wa-ui-modal__header">
				<div className="wa-ui-modal__heading">
					<h3 id="wa-sched-title" className="wa-ui-modal__title">
						{editing ? t.editTitle : t.title}
					</h3>
					<p className="wa-ui-modal__subtitle">{editing ? t.editSubtitle : t.subtitle}</p>
				</div>
				<button
					type="button"
					className="wa-ui-icon-btn"
					aria-label={t.cancel}
					title={t.cancel}
					onClick={() => onOpenChange?.(false)}
				>
					<X size={18} strokeWidth={2} />
				</button>
			</div>

			<div className="wa-ui-schedule__body">
				<div className="wa-ui-schedule__field">
					<div className="wa-ui-schedule__label-row">
						<label htmlFor="wa-sched-message" className="wa-ui-schedule__label">
							{t.message}
						</label>
						{messageText ? (
							<span className="wa-ui-schedule__aside">
								{formatTemplate(t.chars, { count: messageText.length })}
							</span>
						) : null}
					</div>
					<textarea
						id="wa-sched-message"
						autoFocus={!messageText}
						value={messageText}
						onChange={event => setMessageText(event.target.value)}
						rows={3}
						dir="auto"
						placeholder={t.messagePlaceholder}
						className="wa-ui-input wa-ui-schedule__textarea"
					/>
				</div>

				<div className="wa-ui-schedule__field">
					<div className="wa-ui-schedule__label-row">
						<span className="wa-ui-schedule__label" id="wa-sched-recipients">
							{t.recipients}
						</span>
						<span className="wa-ui-schedule__aside">
							{formatTemplate(t.selectedCount, { count: selectedIds.size })}
						</span>
					</div>
					<div className="wa-ui-schedule__recipients" aria-labelledby="wa-sched-recipients">
						{selectedChips.map(item => (
							<span key={item.id} className="wa-ui-schedule__recipient">
								<span className="wa-ui-schedule__avatar" aria-hidden="true">
									{initialsOf(item.title)}
								</span>
								<span className="wa-ui-schedule__recipient-name" dir="auto">
									{item.title}
								</span>
								{!editing ? (
									<button
										type="button"
										aria-label={formatTemplate(t.removeChat, { name: item.title })}
										onClick={() => toggleConversation(String(item.id))}
									>
										<X size={13} strokeWidth={2.2} />
									</button>
								) : null}
							</span>
						))}
						{!editing ? (
							<button
								type="button"
								aria-expanded={pickerOpen}
								aria-controls="wa-sched-picker"
								className="wa-ui-schedule__add"
								onClick={() => setPickerOpen(current => !current)}
							>
								<Plus size={15} strokeWidth={2.2} aria-hidden="true" />
								{t.addMore}
							</button>
						) : null}
					</div>
					{pickerOpen && !editing ? (
						<div id="wa-sched-picker" className="wa-ui-schedule__picker">
							<label className="wa-ui-search">
								<Search size={16} strokeWidth={2} aria-hidden="true" />
								<input
									autoFocus
									value={search}
									onChange={event => setSearch(event.target.value)}
									onKeyDown={event => {
										if (event.key === 'Escape') {
											event.stopPropagation();
											setPickerOpen(false);
										}
									}}
									placeholder={t.searchChats}
									aria-label={t.searchChats}
									className="wa-ui-input"
								/>
							</label>
							<div className="wa-ui-schedule__picker-list" role="group" aria-label={t.recipients}>
								{filteredConversations.length ? (
									filteredConversations.map(item => {
										const checked = selectedIds.has(String(item.id));
										return (
											<button
												key={item.id}
												type="button"
												role="checkbox"
												aria-checked={checked}
												className={`wa-ui-schedule__picker-item${checked ? ' is-checked' : ''}`}
												onClick={() => toggleConversation(String(item.id))}
											>
												<span className="wa-ui-schedule__avatar" aria-hidden="true">
													{initialsOf(item.title)}
												</span>
												<span className="wa-ui-schedule__picker-name" dir="auto">
													{item.title}
												</span>
												<span className="wa-ui-schedule__check" aria-hidden="true">
													{checked ? <Check size={13} strokeWidth={3} /> : null}
												</span>
											</button>
										);
									})
								) : (
									<p className="wa-ui-schedule__empty">{t.noChats}</p>
								)}
							</div>
						</div>
					) : null}
				</div>

				<div className="wa-ui-schedule__field">
					<span className="wa-ui-schedule__label" id="wa-sched-when">
						{t.when}
					</span>
					{modes.length > 1 ? (
						<div className="wa-ui-segment" role="radiogroup" aria-labelledby="wa-sched-when">
							{modes.map(([value, label]) => (
								<button
									key={value}
									type="button"
									role="radio"
									aria-checked={mode === value}
									className="wa-ui-segment__item"
									onClick={() => setMode(value)}
								>
									{label}
								</button>
							))}
						</div>
					) : null}

					{mode === 'once' ? (
						<>
							{!editing ? (
								<div className="wa-ui-schedule__quick" role="group" aria-label={t.quick}>
									{quickPicks.map(([key, label, date]) => {
										const value = defaultDateTimeLocal(date);
										return (
											<button
												key={key}
												type="button"
												aria-pressed={onceAt === value}
												className="wa-ui-chip"
												onClick={() => setOnceAt(value)}
											>
												{label}
											</button>
										);
									})}
								</div>
							) : null}
							<label className="wa-ui-schedule__sub-field">
								<span>{t.dateTime}</span>
								<input
									type="datetime-local"
									value={onceAt}
									min={defaultDateTimeLocal(new Date(Date.now() + 2 * 60 * 1000))}
									onChange={event => setOnceAt(event.target.value)}
									aria-invalid={oncePast || undefined}
									className="wa-ui-input"
								/>
							</label>
						</>
					) : (
						<>
							{mode === 'custom' ? (
								<div className="wa-ui-schedule__sub-field">
									<span id="wa-sched-days">{t.repeatOn}</span>
									<div className="wa-ui-schedule__days" role="group" aria-labelledby="wa-sched-days">
										{[0, 1, 2, 3, 4, 5, 6].map(index => {
											const active = daysOfWeek.includes(index);
											return (
												<button
													key={index}
													type="button"
													aria-pressed={active}
													aria-label={weekdayLabel(index, ar, 'long')}
													title={weekdayLabel(index, ar, 'long')}
													className="wa-ui-schedule__day"
													onClick={() => toggleDay(index)}
												>
													{/* Two letters in English: S/S and T/T were ambiguous. */}
													{ar ? t.days[index] : weekdayLabel(index, false).slice(0, 2)}
												</button>
											);
										})}
									</div>
								</div>
							) : null}
							<div className="wa-ui-schedule__pair">
								<label className="wa-ui-schedule__sub-field">
									<span>{t.timeOfDay}</span>
									<input
										type="time"
										value={timeOfDay}
										onChange={event => setTimeOfDay(event.target.value)}
										className="wa-ui-input"
									/>
								</label>
								<label className="wa-ui-schedule__sub-field">
									<span>{t.endDate}</span>
									<input
										type="date"
										value={endDate}
										onChange={event => setEndDate(event.target.value)}
										className="wa-ui-input"
									/>
								</label>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="wa-ui-schedule__summary" aria-live="polite">
				{oncePast || noDays ? (
					<p className="wa-ui-schedule__summary-text is-warning">
						<AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
						{oncePast ? t.pastTime : t.noDays}
					</p>
				) : summary ? (
					<p className="wa-ui-schedule__summary-text">
						<CalendarClock size={15} strokeWidth={2} aria-hidden="true" />
						{summary}
					</p>
				) : null}
			</div>

			<div className="wa-ui-modal__footer">
				<button type="button" className="wa-ui-btn wa-ui-btn--secondary" onClick={() => onOpenChange?.(false)}>
					{t.cancel}
				</button>
				<button
					type="button"
					className="wa-ui-btn wa-ui-btn--primary"
					disabled={!canSubmit}
					onClick={() => void submit()}
				>
					{submitting ? (
						<>
							<Loader2 size={15} className="animate-spin" aria-hidden="true" />
							{editing ? t.saving : t.scheduling}
						</>
					) : editing ? (
						t.save
					) : (
						t.schedule
					)}
				</button>
			</div>
		</div>,
		document.body,
	);
}
