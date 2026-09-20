'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
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
		messagePlaceholder: 'Type the message to sendâ€¦',
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
		scheduling: 'Schedulingâ€¦',
		saving: 'Savingâ€¦',
		cancel: 'Cancel',
		emptyMessage: 'Write the message to schedule.',
		needRecipients: 'Select at least one chat.',
		needFutureTime: 'Pick a time at least 1 minute from now.',
		created: 'Message scheduled',
		updated: 'Schedule updated',
		failed: 'Could not schedule message',
		updateFailed: 'Could not update schedule',
	},
	ar: {
		title: 'Ø¬Ø¯ÙˆÙ„Ø© Ø±Ø³Ø§Ù„Ø©',
		editTitle: 'ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø©',
		subtitle: 'Ø£Ø±Ø³Ù„ Ù„Ø§Ø­Ù‚Ù‹Ø§ Ù„Ø´Ø§Øª ÙˆØ§Ø­Ø¯ Ø£Ùˆ Ø£ÙƒØ«Ø±',
		editSubtitle: 'Ø¹Ø¯Ù‘Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø£Ùˆ Ø§Ù„Ù…ÙˆØ¹Ø¯',
		message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø©',
		messagePlaceholder: 'Ø§ÙƒØªØ¨ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ù…Ø±Ø§Ø¯ Ø¥Ø±Ø³Ø§Ù„Ù‡Ø§â€¦',
		recipients: 'Ø¥Ù„Ù‰',
		addMore: 'Ø¥Ø¶Ø§ÙØ© Ø´Ø§ØªØ§Øª',
		searchChats: 'Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø´Ø§ØªØ§Øª',
		selectedCount: '{count} Ù…Ø­Ø¯Ø¯',
		when: 'Ø§Ù„Ù…ÙˆØ¹Ø¯',
		once: 'Ù…Ø±Ø©',
		daily: 'ÙŠÙˆÙ…ÙŠ',
		customDays: 'Ù…Ø®ØµØµ',
		dateTime: 'Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„ÙˆÙ‚Øª',
		timeOfDay: 'Ø§Ù„ÙˆÙ‚Øª',
		endDate: 'ÙŠÙ†ØªÙ‡ÙŠ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)',
		days: ['Ø­', 'Ù†', 'Ø«', 'Ø±', 'Ø®', 'Ø¬', 'Ø³'],
		schedule: 'Ø¬Ø¯ÙˆÙ„Ø©',
		save: 'Ø­ÙØ¸',
		scheduling: 'Ø¬Ø§Ø±ÙŠâ€¦',
		saving: 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸â€¦',
		cancel: 'Ø¥Ù„ØºØ§Ø¡',
		emptyMessage: 'Ø§ÙƒØªØ¨ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ù…Ø±Ø§Ø¯ Ø¬Ø¯ÙˆÙ„ØªÙ‡Ø§.',
		needRecipients: 'Ø§Ø®ØªÙŽØ± Ø´Ø§Øª ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„.',
		needFutureTime: 'Ø§Ø®ØªÙŽØ± ÙˆÙ‚Øª Ø¨Ø¹Ø¯ Ø¯Ù‚ÙŠÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„.',
		created: 'ØªÙ…Øª Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ø±Ø³Ø§Ù„Ø©',
		updated: 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø©',
		failed: 'ØªØ¹Ø°Ù‘Ø±Øª Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ø±Ø³Ø§Ù„Ø©',
		updateFailed: 'ØªØ¹Ø°Ù‘Ø± ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø©',
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

function computePopoverPosition(anchorEl) {
	const margin = 10;
	const width = Math.min(380, (window.innerWidth || 1280) - margin * 2);
	const maxHeight = Math.min(560, (window.innerHeight || 800) - margin * 2);
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
						toast.error(ar ? 'Ø§Ø®ØªÙŽØ± ÙŠÙˆÙ… ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' : 'Select at least one weekday');
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
						toast.error(ar ? 'Ø§Ø®ØªÙŽØ± ÙŠÙˆÙ… ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' : 'Select at least one weekday');
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

	if (!open || !position || typeof document === 'undefined') return null;

	return createPortal(
		<div
			ref={panelRef}
			role="dialog"
			aria-label={editing ? t.editTitle : t.title}
			className="wa-schedule-popover"
			style={{
				top: position.top,
				left: position.left,
				width: position.width,
				maxHeight: position.maxHeight,
			}}
			onPointerDown={event => event.stopPropagation()}
		>
			<header className="wa-schedule-popover__header">
				<div className="wa-schedule-popover__heading">
					<span className="wa-schedule-popover__icon" aria-hidden="true">
						<CalendarClock size={16} strokeWidth={2.1} />
					</span>
					<div className="min-w-0">
						<h3>{editing ? t.editTitle : t.title}</h3>
						<p>{editing ? t.editSubtitle : t.subtitle}</p>
					</div>
				</div>
				<button
					type="button"
					className="wa-schedule-popover__close"
					aria-label={t.cancel}
					onClick={() => onOpenChange?.(false)}
				>
					<X size={16} strokeWidth={2.2} />
				</button>
			</header>

			<div className="wa-schedule-popover__body nice-scroll">
				<section className="wa-schedule-popover__section">
					<label className="wa-schedule-popover__label">{t.message}</label>
					<textarea
						value={messageText}
						onChange={event => setMessageText(event.target.value)}
						rows={3}
						placeholder={t.messagePlaceholder}
						className="wa-schedule-popover__textarea"
					/>
				</section>

				<section className="wa-schedule-popover__section">
					<div className="wa-schedule-popover__row">
						<label className="wa-schedule-popover__label">{t.recipients}</label>
						<span className="wa-schedule-popover__count">
							{formatTemplate(t.selectedCount, { count: selectedIds.size })}
						</span>
					</div>
					<div className="wa-schedule-popover__chips">
						{selectedChips.map(item => (
							<span key={item.id} className="wa-schedule-popover__chip">
								<span className="truncate">{item.title}</span>
								{!editing ? (
									<button
										type="button"
										aria-label="Remove"
										onClick={() => toggleConversation(String(item.id))}
									>
										<X size={11} strokeWidth={2.4} />
									</button>
								) : null}
							</span>
						))}
						{!editing ? (
							<button
								type="button"
								className="wa-schedule-popover__add"
								onClick={() => setPickerOpen(current => !current)}
							>
								<Plus size={13} strokeWidth={2.4} />
								{t.addMore}
							</button>
						) : null}
					</div>
					{pickerOpen && !editing ? (
						<div className="wa-schedule-popover__picker">
							<div className="wa-schedule-popover__search">
								<Search size={14} strokeWidth={2} />
								<input
									value={search}
									onChange={event => setSearch(event.target.value)}
									placeholder={t.searchChats}
								/>
							</div>
							<div className="wa-schedule-popover__picker-list nice-scroll">
								{filteredConversations.map(item => {
									const checked = selectedIds.has(String(item.id));
									return (
										<button
											key={item.id}
											type="button"
											className={`wa-schedule-popover__picker-item ${checked ? 'is-checked' : ''}`}
											onClick={() => toggleConversation(String(item.id))}
										>
											<span className="wa-schedule-popover__check" aria-hidden="true">
												{checked ? <Check size={12} strokeWidth={2.6} /> : null}
											</span>
											<span className="truncate">{item.title}</span>
										</button>
									);
								})}
							</div>
						</div>
					) : null}
				</section>

				<section className="wa-schedule-popover__section">
					<label className="wa-schedule-popover__label">{t.when}</label>
					{!editing || editingSchedule?.scheduleKind === 'once' ? (
						<div className="wa-schedule-popover__segment" role="tablist">
							{(editing
								? [['once', t.once]]
								: [
										['once', t.once],
										['daily', t.daily],
										['custom', t.customDays],
									]
							).map(([value, label]) => (
								<button
									key={value}
									type="button"
									role="tab"
									aria-selected={mode === value}
									className={mode === value ? 'is-active' : ''}
									onClick={() => setMode(value)}
									disabled={editing && value !== 'once'}
								>
									{label}
								</button>
							))}
						</div>
					) : (
						<div className="wa-schedule-popover__segment" role="tablist">
							{(
								[
									['daily', t.daily],
									['custom', t.customDays],
								]
							).map(([value, label]) => (
								<button
									key={value}
									type="button"
									role="tab"
									aria-selected={mode === value}
									className={mode === value ? 'is-active' : ''}
									onClick={() => setMode(value)}
								>
									{label}
								</button>
							))}
						</div>
					)}

					{mode === 'once' ? (
						<label className="wa-schedule-popover__field">
							<span>{t.dateTime}</span>
							<input
								type="datetime-local"
								value={onceAt}
								onChange={event => setOnceAt(event.target.value)}
							/>
						</label>
					) : (
						<div className="wa-schedule-popover__stack">
							<label className="wa-schedule-popover__field">
								<span>{t.timeOfDay}</span>
								<input
									type="time"
									value={timeOfDay}
									onChange={event => setTimeOfDay(event.target.value)}
								/>
							</label>
							{mode === 'custom' ? (
								<div className="wa-schedule-popover__days">
									{t.days.map((label, index) => {
										const active = daysOfWeek.includes(index);
										return (
											<button
												key={`${label}-${index}`}
												type="button"
												className={active ? 'is-active' : ''}
												onClick={() => toggleDay(index)}
											>
												{label}
											</button>
										);
									})}
								</div>
							) : null}
							<label className="wa-schedule-popover__field">
								<span>{t.endDate}</span>
								<input
									type="date"
									value={endDate}
									onChange={event => setEndDate(event.target.value)}
								/>
							</label>
						</div>
					)}
				</section>
			</div>

			<footer className="wa-schedule-popover__footer">
				<button
					type="button"
					className="wa-schedule-popover__ghost"
					onClick={() => onOpenChange?.(false)}
				>
					{t.cancel}
				</button>
				<button
					type="button"
					className="wa-schedule-popover__primary"
					disabled={submitting}
					onClick={() => void submit()}
				>
					{submitting ? (
						<>
							<Loader2 size={14} className="animate-spin" />
							{editing ? t.saving : t.scheduling}
						</>
					) : editing ? (
						t.save
					) : (
						t.schedule
					)}
				</button>
			</footer>
		</div>,
		document.body,
	);
}
