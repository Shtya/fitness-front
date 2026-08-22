'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Check, Loader2, Search, Users, X } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import api from '@/utils/axios';

const copy = {
	en: {
		title: 'Schedule message',
		subtitle: 'Send the same message to one or more chats on a schedule.',
		message: 'Message',
		recipients: 'Recipients',
		currentChat: 'Current chat',
		addMore: 'Add more chats',
		searchChats: 'Search chats',
		selectedCount: '{count} chats selected',
		when: 'When to send',
		once: 'Once',
		daily: 'Every day',
		customDays: 'Custom days',
		dateTime: 'Date & time',
		timeOfDay: 'Time of day',
		endDate: 'End date (optional)',
		days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
		schedule: 'Schedule message',
		scheduling: 'Scheduling…',
		cancel: 'Cancel',
		emptyMessage: 'Write a message in the composer first.',
		needRecipients: 'Select at least one chat.',
		needFutureTime: 'Pick a time at least 1 minute from now.',
		created: 'Message scheduled',
		failed: 'Could not schedule message',
	},
	ar: {
		title: 'جدولة رسالة',
		subtitle: 'ابعت نفس الرسالة لشات واحد أو أكتر في وقت محدد.',
		message: 'الرسالة',
		recipients: 'المستلمون',
		currentChat: 'الشات الحالي',
		addMore: 'ضيف شاتات',
		searchChats: 'ابحث في الشاتات',
		selectedCount: '{count} شات محدد',
		when: 'متى الإرسال',
		once: 'مرة واحدة',
		daily: 'كل يوم',
		customDays: 'أيام مخصصة',
		dateTime: 'التاريخ والوقت',
		timeOfDay: 'وقت الإرسال',
		endDate: 'تاريخ الانتهاء (اختياري)',
		days: ['أحد', 'إثن', 'ثلا', 'أرب', 'خم', 'جم', 'سب'],
		schedule: 'جدولة الرسالة',
		scheduling: 'بيحدّد الموعد…',
		cancel: 'إلغاء',
		emptyMessage: 'اكتب رسالة في خانة الإرسال الأول.',
		needRecipients: 'اختَر شات واحد على الأقل.',
		needFutureTime: 'اختَر وقت بعد دقيقة على الأقل.',
		created: 'تمت جدولة الرسالة',
		failed: 'تعذّرت جدولة الرسالة',
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

export default function ScheduleMessageDialog({
	open,
	onOpenChange,
	ar = false,
	accountId,
	conversations = [],
	initialConversationId,
	initialText = '',
	onCreated,
}) {
	const t = ar ? copy.ar : copy.en;
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
		setMessageText(String(initialText || '').trim());
		const next = new Set();
		if (initialConversationId) next.add(String(initialConversationId));
		setSelectedIds(next);
		setMode('once');
		setOnceAt(defaultDateTimeLocal());
		setTimeOfDay(defaultTimeValue());
		setDaysOfWeek([1, 2, 3, 4, 5]);
		setEndDate('');
		setSearch('');
		setPickerOpen(false);
	}, [open, initialConversationId, initialText]);

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
		if (!accountId) return;
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
				return;
			}
			payload.scheduledAt = scheduled.toISOString();
		} else {
			payload.timeOfDay = timeOfDay;
			payload.daysOfWeek = mode === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek;
			if (!payload.daysOfWeek.length) {
				toast.error(ar ? 'اختَر يوم واحد على الأقل' : 'Select at least one weekday');
				return;
			}
			if (endDate) payload.recurrenceEndDate = endDate;
		}

		setSubmitting(true);
		try {
			await api.post(`/whatsapp/accounts/${accountId}/message-schedules`, payload);
			toast.success(t.created);
			onCreated?.();
			onOpenChange?.(false);
		} catch (error) {
			toast.error(error?.response?.data?.message || error?.message || t.failed);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CalendarClock size={18} />
						{t.title}
					</DialogTitle>
					<DialogDescription>{t.subtitle}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label className="mb-1 block text-xs font-bold text-slate-600">{t.message}</label>
						<textarea
							value={messageText}
							onChange={event => setMessageText(event.target.value)}
							rows={3}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
						/>
					</div>

					<div>
						<div className="mb-2 flex items-center justify-between gap-2">
							<label className="text-xs font-bold text-slate-600">{t.recipients}</label>
							<span className="text-[11px] font-semibold text-emerald-700">
								{formatTemplate(t.selectedCount, { count: selectedIds.size })}
							</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{selectedChips.map(item => (
								<span
									key={item.id}
									className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
								>
									{item.title}
									<button type="button" onClick={() => toggleConversation(String(item.id))}>
										<X size={12} />
									</button>
								</span>
							))}
						</div>
						<button
							type="button"
							onClick={() => setPickerOpen(current => !current)}
							className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:border-slate-700"
						>
							<Users size={13} />
							{t.addMore}
						</button>
						{pickerOpen ? (
							<div className="mt-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
								<div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
									<Search size={14} className="text-slate-400" />
									<input
										value={search}
										onChange={event => setSearch(event.target.value)}
										placeholder={t.searchChats}
										className="min-w-0 flex-1 bg-transparent text-sm outline-none"
									/>
								</div>
								<div className="max-h-40 space-y-1 overflow-y-auto nice-scroll">
									{filteredConversations.map(item => {
										const checked = selectedIds.has(String(item.id));
										return (
											<label
												key={item.id}
												className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
											>
												<input
													type="checkbox"
													checked={checked}
													onChange={() => toggleConversation(String(item.id))}
												/>
												<span className="truncate">{item.title}</span>
											</label>
										);
									})}
								</div>
							</div>
						) : null}
					</div>

					<div>
						<label className="mb-2 block text-xs font-bold text-slate-600">{t.when}</label>
						<div className="mb-3 flex flex-wrap gap-2">
							{[
								['once', t.once],
								['daily', t.daily],
								['custom', t.customDays],
							].map(([value, label]) => (
								<button
									key={value}
									type="button"
									onClick={() => setMode(value)}
									className={`rounded-full px-3 py-1 text-[11px] font-bold ${
										mode === value
											? 'bg-emerald-600 text-white'
											: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
									}`}
								>
									{label}
								</button>
							))}
						</div>

						{mode === 'once' ? (
							<input
								type="datetime-local"
								value={onceAt}
								onChange={event => setOnceAt(event.target.value)}
								className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
							/>
						) : (
							<div className="space-y-3">
								<div>
									<label className="mb-1 block text-[11px] font-semibold text-slate-500">
										{t.timeOfDay}
									</label>
									<input
										type="time"
										value={timeOfDay}
										onChange={event => setTimeOfDay(event.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
									/>
								</div>
								{mode === 'custom' ? (
									<div className="flex flex-wrap gap-2">
										{t.days.map((label, index) => {
											const checked = daysOfWeek.includes(index);
											return (
												<button
													key={label}
													type="button"
													onClick={() => toggleDay(index)}
													className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
														checked
															? 'bg-emerald-600 text-white'
															: 'bg-slate-100 text-slate-700 dark:bg-slate-800'
													}`}
												>
													{label}
												</button>
											);
										})}
									</div>
								) : null}
								<div>
									<label className="mb-1 block text-[11px] font-semibold text-slate-500">
										{t.endDate}
									</label>
									<input
										type="date"
										value={endDate}
										onChange={event => setEndDate(event.target.value)}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
									/>
								</div>
							</div>
						)}
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={() => onOpenChange?.(false)}
							className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600"
						>
							{t.cancel}
						</button>
						<button
							type="button"
							disabled={submitting}
							onClick={() => void submit()}
							className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
						>
							{submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
							{submitting ? t.scheduling : t.schedule}
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
