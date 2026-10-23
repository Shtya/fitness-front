'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Clock, Loader2, Pencil, Send, Trash2, X } from 'lucide-react';
import { formatDelayDuration } from './delayed-send';
export { waitingOnceSchedules } from './delayed-send';
import { formatSendWhen } from './DelayedSendControl';
import './delayed-send.css';

const copy = {
	en: {
		title: 'Waiting to send',
		sendNow: 'Send now',
		edit: 'Edit text',
		remove: 'Delete',
		save: 'Save',
		cancelEdit: 'Cancel',
		sending: 'Sending…',
		failed: 'Not sent',
		inTime: 'in {time}',
		due: 'any second',
		collapse: 'Hide list',
		expand: 'Show list',
		file: 'Attachment',
	},
	ar: {
		title: 'في الانتظار',
		sendNow: 'ابعتها دلوقتي',
		edit: 'تعديل النص',
		remove: 'حذف',
		save: 'حفظ',
		cancelEdit: 'إلغاء',
		sending: 'بتتبعت…',
		failed: 'ماتبعتتش',
		inTime: 'بعد {time}',
		due: 'حالًا',
		collapse: 'إخفاء القائمة',
		expand: 'إظهار القائمة',
		file: 'مرفق',
	},
};

const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));

function QueueRow({ item, ar, t, now, busy, onSendNow, onSaveText, onCancel }) {
	const [editing, setEditing] = useState(false);
	const [text, setText] = useState(item.text || '');
	const inputRef = useRef(null);
	const status = String(item.status || '').toLowerCase();
	const isText = item.type === 'text' || !item.type;
	const at = new Date(item.nextRunAt || item.scheduledAt || 0).getTime();
	const left = at - now;
	const sending = status === 'processing';
	const failed = status === 'failed';
	const canEdit = isText && (status === 'active' || status === 'paused');

	useEffect(() => {
		if (!editing) setText(item.text || '');
	}, [item.text, editing]);

	useEffect(() => {
		if (editing) inputRef.current?.focus();
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
			<li className="wa-queue__row is-editing">
				<textarea
					ref={inputRef}
					dir="auto"
					rows={Math.min(4, Math.max(1, text.split('\n').length))}
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
				<button type="button" className="wa-queue__icon" onClick={() => setEditing(false)} title={t.cancelEdit} aria-label={t.cancelEdit}>
					<X size={15} strokeWidth={2.2} />
				</button>
				<button type="button" className="wa-queue__icon is-primary" disabled={busy || !text.trim()} onClick={() => void save()} title={t.save} aria-label={t.save}>
					{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.4} />}
				</button>
			</li>
		);
	}

	return (
		<li className={`wa-queue__row${failed ? ' is-failed' : ''}`} aria-busy={busy || sending || undefined}>
			<span className="wa-queue__glyph" aria-hidden="true">
				{sending ? <Loader2 size={13} className="animate-spin" /> : failed ? <AlertCircle size={13} /> : <Clock size={13} />}
			</span>
			<p className="wa-queue__text" dir="auto" title={item.text || item.caption || item.fileName || ''}>
				{item.text || item.caption || item.fileName || t.file}
			</p>
			<span className="wa-queue__when" title={item.lastError || undefined}>
				{sending ? (
					t.sending
				) : failed ? (
					t.failed
				) : (
					<>
						<b>{formatSendWhen(at, ar, now)}</b>
						<span>{left > 60_000 ? fill(t.inTime, { time: formatDelayDuration(left, ar) }) : t.due}</span>
					</>
				)}
			</span>
			<span className="wa-queue__actions">
				{!sending ? (
					<button type="button" className="wa-queue__icon is-primary" disabled={busy} onClick={() => onSendNow(item)} title={t.sendNow} aria-label={t.sendNow}>
						{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.2} className="wa-queue__send-icon" />}
					</button>
				) : null}
				{canEdit ? (
					<button type="button" className="wa-queue__icon" disabled={busy} onClick={() => setEditing(true)} title={t.edit} aria-label={t.edit}>
						<Pencil size={14} strokeWidth={2.1} />
					</button>
				) : null}
				{!sending ? (
					<button type="button" className="wa-queue__icon is-danger" disabled={busy} onClick={() => onCancel(item)} title={t.remove} aria-label={t.remove}>
						<Trash2 size={14} strokeWidth={2.1} />
					</button>
				) : null}
			</span>
		</li>
	);
}

/** Messages waiting for their send time, kept above the composer until they go out. */
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

	return (
		<section className="wa-queue" dir={ar ? 'rtl' : 'ltr'} aria-label={`${t.title} (${items.length})`}>
			<button
				type="button"
				className="wa-queue__head"
				onClick={() => setCollapsed(value => !value)}
				aria-expanded={!collapsed}
				title={collapsed ? t.expand : t.collapse}
			>
				<Clock size={13} strokeWidth={2.2} aria-hidden="true" />
				<span>{t.title}</span>
				<span className="wa-queue__count">{items.length}</span>
				<ChevronDown size={14} strokeWidth={2.2} className={`wa-queue__chevron${collapsed ? ' is-collapsed' : ''}`} aria-hidden="true" />
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
