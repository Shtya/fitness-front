'use client';

import { useState } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DemoEventQueue({
	events,
	conversations,
	labels,
	onCreate,
	onDelete,
}) {
	const [form, setForm] = useState({
		conversationId: '',
		eventType: 'typing',
		delayMs: 1000,
		durationMs: 3000,
		scheduledAt: '',
		infinite: false,
		randomize: false,
		text: '',
		active: true,
		unreadCount: 1,
		notification: false,
		moveToTop: true,
		typingBefore: false,
	});
	const [saving, setSaving] = useState(false);

	const submit = async event => {
		event.preventDefault();
		if (!form.conversationId || (form.eventType === 'incoming_message' && !form.text.trim())) return;
		setSaving(true);
		try {
			if (
				form.eventType === 'incoming_message' &&
				form.notification &&
				typeof Notification !== 'undefined' &&
				Notification.permission === 'default'
			) {
				await Notification.requestPermission();
			}
			await onCreate({
				conversationId: form.conversationId,
				eventType: form.eventType,
				delayMs: Math.max(0, Number(form.delayMs) || 0),
				durationMs: form.infinite ? null : Math.max(0, Number(form.durationMs) || 0),
				scheduledAt: form.scheduledAt
					? new Date(form.scheduledAt).toISOString()
					: null,
				infinite: form.infinite,
				randomize: form.randomize,
				enabled: true,
				payload:
					form.eventType === 'incoming_message'
						? {
								text: form.text.trim(),
								status: 'delivered',
								unreadCount: Math.max(0, Number(form.unreadCount) || 0),
								notification: form.notification,
								moveToTop: form.moveToTop,
								typingBefore: form.typingBefore,
							}
						: { active: form.active },
			});
			setForm(current => ({ ...current, text: '' }));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-3">
			<form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
				<div className="grid gap-2 sm:grid-cols-3">
					<select
						value={form.conversationId}
						onChange={event =>
							setForm(current => ({ ...current, conversationId: event.target.value }))
						}
						className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
					>
						<option value="">{labels.selectConversation}</option>
						{conversations.map(conversation => (
							<option key={conversation.id} value={conversation.id}>
								{conversation.contactName || conversation.name || conversation.id}
							</option>
						))}
					</select>
					<select
						value={form.eventType}
						onChange={event => setForm(current => ({ ...current, eventType: event.target.value }))}
						className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
					>
						<option value="typing">{labels.typing}</option>
						<option value="recording">{labels.recording}</option>
						<option value="incoming_message">{labels.incomingMessage}</option>
					</select>
					<label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs dark:border-slate-700">
						<Clock size={14} />
						<input
							type="number"
							min="0"
							step="100"
							value={form.delayMs}
							onChange={event =>
								setForm(current => ({ ...current, delayMs: event.target.value }))
							}
							className="h-8 min-w-0 flex-1 bg-transparent"
						/>
						ms
					</label>
				</div>
				<div className="grid gap-2 sm:grid-cols-3">
					<label className="grid gap-1 text-[11px] font-bold">
						{labels.durationMs}
						<input
							type="number"
							min="0"
							step="100"
							value={form.durationMs}
							disabled={form.infinite || form.eventType === 'incoming_message'}
							onChange={event =>
								setForm(current => ({ ...current, durationMs: event.target.value }))
							}
							className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
						/>
					</label>
					<label className="grid gap-1 text-[11px] font-bold">
						{labels.exactTime}
						<input
							type="datetime-local"
							value={form.scheduledAt}
							onChange={event =>
								setForm(current => ({ ...current, scheduledAt: event.target.value }))
							}
							className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
						/>
					</label>
					<div className="flex flex-wrap items-end gap-3 pb-1 text-xs font-bold">
						<label className="flex items-center gap-1">
							<input
								type="checkbox"
								checked={form.infinite}
								disabled={form.eventType === 'incoming_message'}
								onChange={event =>
									setForm(current => ({ ...current, infinite: event.target.checked }))
								}
							/>
							{labels.infinite}
						</label>
						<label className="flex items-center gap-1">
							<input
								type="checkbox"
								checked={form.randomize}
								onChange={event =>
									setForm(current => ({ ...current, randomize: event.target.checked }))
								}
							/>
							{labels.randomize}
						</label>
					</div>
				</div>
				{form.eventType === 'incoming_message' ? (
					<div className="space-y-2">
						<input
							value={form.text}
							onChange={event => setForm(current => ({ ...current, text: event.target.value }))}
							placeholder={labels.messageText}
							className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
						/>
						<div className="flex flex-wrap items-center gap-3 text-xs font-bold">
							<label className="flex items-center gap-1">
								{labels.unreadCount}
								<input
									type="number"
									min="0"
									value={form.unreadCount}
									onChange={event =>
										setForm(current => ({ ...current, unreadCount: event.target.value }))
									}
									className="h-8 w-16 rounded border px-2"
								/>
							</label>
							{['notification', 'moveToTop', 'typingBefore'].map(field => (
								<label key={field} className="flex items-center gap-1">
									<input
										type="checkbox"
										checked={form[field]}
										onChange={event =>
											setForm(current => ({ ...current, [field]: event.target.checked }))
										}
									/>
									{labels[field]}
								</label>
							))}
						</div>
					</div>
				) : (
					<label className="flex items-center gap-2 text-xs font-bold">
						<input
							type="checkbox"
							checked={form.active}
							onChange={event =>
								setForm(current => ({ ...current, active: event.target.checked }))
							}
						/>
						{form.active ? labels.startIndicator : labels.stopIndicator}
					</label>
				)}
				<Button
					type="submit"
					size="sm"
					disabled={
						saving ||
						!form.conversationId ||
						(form.eventType === 'incoming_message' && !form.text.trim())
					}
				>
					{labels.queueEvent}
				</Button>
			</form>
			<div className="max-h-44 space-y-1 overflow-y-auto">
				{events.length === 0 ? (
					<p className="p-3 text-center text-xs text-slate-400">{labels.noEvents}</p>
				) : (
					events.map(event => (
						<div
							key={event.id}
							className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"
						>
							<span>
								{labels[event.eventType] || event.eventType} · {Math.max(0, Number(event.delayMs) || 0)}ms
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onClick={() => onDelete(event.id)}
								aria-label={labels.delete}
							>
								<Trash2 />
							</Button>
						</div>
					))
				)}
			</div>
		</div>
	);
}
