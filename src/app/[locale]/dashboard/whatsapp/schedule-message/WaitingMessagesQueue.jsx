'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Clock, Loader2, Pencil, Send, Trash2, X } from 'lucide-react';
import { formatDelayDuration } from './delayed-send';
export { waitingOnceSchedules } from './delayed-send';
import { formatSendWhen } from './DelayedSendControl';
import './delayed-send.css';

const copy = {
	en: {
		waiting: count => (count === 1 ? '1 waiting to send' : `${count} waiting to send`),
		next: 'next {when}',
		sendNow: 'Send now',
		edit: 'Edit text',
		remove: 'Delete',
		save: 'Save',
		cancelEdit: 'Cancel',
		sending: 'Sending…',
		failed: 'Not sent',
		inTime: 'in {time}',
		due: 'any second',
		collapse: 'Hide waiting messages',
		expand: 'Show waiting messages',
		file: 'Attachment',
	},
	ar: {
		waiting: count => (count === 1 ? 'رسالة مستنية تتبعت' : `${count} رسايل مستنية تتبعت`),
		next: 'الجاية {when}',
		sendNow: 'ابعتها دلوقتي',
		edit: 'تعديل النص',
		remove: 'حذف',
		save: 'حفظ',
		cancelEdit: 'إلغاء',
		sending: 'بتتبعت…',
		failed: 'ماتبعتتش',
		inTime: 'بعد {time}',
		due: 'حالًا',
		collapse: 'إخفاء الرسايل المستنية',
		expand: 'إظهار الرسايل المستنية',
		file: 'مرفق',
	},
};

const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));

const sendTime = item => new Date(item.nextRunAt || item.scheduledAt || 0).getTime();

/**
 * One waiting message, drawn like an outgoing bubble that has not left yet (dashed edge, clock
 * in place of the ticks). Its actions sit beside it and show on hover / focus (always on touch).
 */
function QueueRow({ item, ar, t, now, busy, onSendNow, onSaveText, onCancel }) {
	const [editing, setEditing] = useState(false);
	const [text, setText] = useState(item.text || '');
	const inputRef = useRef(null);
	const status = String(item.status || '').toLowerCase();
	const isText = item.type === 'text' || !item.type;
	const at = sendTime(item);
	const left = at - now;
	const sending = status === 'processing';
	const failed = status === 'failed';
	const canEdit = isText && (status === 'active' || status === 'paused');

	useEffect(() => {
		if (!editing) setText(item.text || '');
	}, [item.text, editing]);

	useEffect(() => {
		if (!editing) return;
		const field = inputRef.current;
		field?.focus();
		field?.setSelectionRange(field.value.length, field.value.length);
	}, [editing]);

	const save = async () => {
		const next = text.trim();
		if (!next || next === (item.text || '').trim()) {
			setEditing(false);
			return;
		}
		const ok = await onSaveText(item, next);
		if (ok !== false) setEditing(false);
	};

	if (editing) {
		return (
			<li className="wa-queue__item is-editing">
				<div className="wa-queue__bubble">
					<textarea
						ref={inputRef}
						dir="auto"
						rows={Math.min(5, Math.max(1, text.split('\n').length))}
						value={text}
						onChange={event => setText(event.target.value)}
						onKeyDown={event => {
							if (event.key === 'Escape') {
								event.preventDefault();
								setEditing(false);
							} else if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault();
								void save();
							}
						}}
						className="wa-queue__input"
					/>
					<span className="wa-queue__edit-actions">
						<button type="button" className="wa-queue__icon" onClick={() => setEditing(false)} title={t.cancelEdit} aria-label={t.cancelEdit}>
							<X size={15} strokeWidth={2.2} />
						</button>
						<button
							type="button"
							className="wa-queue__icon is-save"
							disabled={busy || !text.trim()}
							onClick={() => void save()}
							title={t.save}
							aria-label={t.save}
						>
							{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.6} />}
						</button>
					</span>
				</div>
			</li>
		);
	}

	return (
		<li className={`wa-queue__item${failed ? ' is-failed' : ''}${sending ? ' is-sending' : ''}`} aria-busy={busy || sending || undefined}>
			{!sending ? (
				<span className="wa-queue__actions">
					<button type="button" className="wa-queue__icon is-danger" disabled={busy} onClick={() => onCancel(item)} title={t.remove} aria-label={t.remove}>
						<Trash2 size={14} strokeWidth={2.1} />
					</button>
					{canEdit ? (
						<button type="button" className="wa-queue__icon" disabled={busy} onClick={() => setEditing(true)} title={t.edit} aria-label={t.edit}>
							<Pencil size={14} strokeWidth={2.1} />
						</button>
					) : null}
					<button type="button" className="wa-queue__send" disabled={busy} onClick={() => onSendNow(item)} title={t.sendNow}>
						{busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} strokeWidth={2.2} className="wa-queue__send-icon" />}
						<span>{t.sendNow}</span>
					</button>
				</span>
			) : null}
			<div className="wa-queue__bubble" title={item.lastError || undefined}>
				<p className="wa-queue__text" dir="auto">
					{item.text || item.caption || item.fileName || t.file}
				</p>
				<span className="wa-queue__meta">
					{sending ? (
						<>
							<Loader2 size={12} className="animate-spin" aria-hidden="true" />
							{t.sending}
						</>
					) : failed ? (
						<>
							<AlertCircle size={12} aria-hidden="true" />
							{t.failed}
						</>
					) : (
						<>
							<Clock size={12} strokeWidth={2.4} aria-hidden="true" />
							<b>{formatSendWhen(at, ar, now)}</b>
							<span className="wa-queue__left">· {left > 60_000 ? fill(t.inTime, { time: formatDelayDuration(left, ar) }) : t.due}</span>
						</>
					)}
				</span>
			</div>
		</li>
	);
}

/** Messages waiting for their send time, shown as pending bubbles above the composer. */
export default function WaitingMessagesQueue({ ar, items, busyId, onSendNow, onSaveText, onCancel }) {
	const t = ar ? copy.ar : copy.en;
	const [collapsed, setCollapsed] = useState(false);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!items.length) return undefined;
		setNow(Date.now());
		const timer = window.setInterval(() => setNow(Date.now()), 15_000);
		return () => window.clearInterval(timer);
	}, [items.length]);

	if (!items.length) return null;

	// "next" is the soonest message still on its way (not failed, not already past its time).
	const next = items.reduce((soonest, item) => {
		if (String(item.status || '').toLowerCase() === 'failed') return soonest;
		const at = sendTime(item);
		return at > now && (!soonest || at < soonest) ? at : soonest;
	}, 0);

	return (
		<section className={`wa-queue${collapsed ? ' is-collapsed' : ''}`} dir={ar ? 'rtl' : 'ltr'} aria-label={t.waiting(items.length)}>
			<button
				type="button"
				className="wa-queue__toggle"
				onClick={() => setCollapsed(value => !value)}
				aria-expanded={!collapsed}
				title={collapsed ? t.expand : t.collapse}
			>
				<Clock size={13} strokeWidth={2.4} aria-hidden="true" />
				<span>{t.waiting(items.length)}</span>
				{next ? <span className="wa-queue__toggle-next">· {fill(t.next, { when: formatSendWhen(next, ar, now) })}</span> : null}
				<ChevronDown size={14} strokeWidth={2.4} className="wa-queue__chevron" aria-hidden="true" />
			</button>
			{collapsed ? null : (
				<ul className="wa-queue__list">
					{items.map(item => (
						<QueueRow
							key={item.id}
							item={item}
							ar={ar}
							t={t}
							now={now}
							busy={busyId === item.id}
							onSendNow={onSendNow}
							onSaveText={onSaveText}
							onCancel={onCancel}
						/>
					))}
				</ul>
			)}
		</section>
	);
}
