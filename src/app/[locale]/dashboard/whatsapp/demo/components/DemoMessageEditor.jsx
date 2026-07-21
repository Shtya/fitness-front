'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

function localDateTime(value) {
	const date = value ? new Date(value) : new Date();
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function DemoMessageEditor({
	message,
	messages = [],
	labels,
	disabled,
	onSave,
	onCancel,
}) {
	const [form, setForm] = useState({
		type: 'text',
		text: '',
		direction: 'inbound',
		status: 'delivered',
		showReadReceipt: true,
		forwarded: false,
		deletedMode: 'none',
		replyToId: '',
		reactions: '',
		latitude: '',
		longitude: '',
		locationName: '',
		mediaFile: null,
		timestamp: localDateTime(),
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setForm({
			type: message?.type || 'text',
			text: message?.text || '',
			direction: message?.direction || 'inbound',
			status: message?.status || (message?.direction === 'outbound' ? 'sent' : 'delivered'),
			showReadReceipt: message?.showReadReceipt ?? true,
			forwarded: Boolean(message?.forwarded),
			deletedMode: message?.deletedMode || 'none',
			replyToId: message?.replyToId || '',
			reactions: Array.isArray(message?.reactions)
				? message.reactions.map(reaction => reaction.emoji).join(' ')
				: '',
			latitude: message?.location?.latitude ?? '',
			longitude: message?.location?.longitude ?? '',
			locationName: message?.location?.name || '',
			mediaFile: null,
			timestamp: localDateTime(
				message?.providerTimestamp || message?.timestamp || message?.created_at || message?.createdAt,
			),
		});
	}, [message]);

	const submit = async event => {
		event.preventDefault();
		const hasText = Boolean(form.text.trim());
		const hasMedia = Boolean(form.mediaFile || message?.attachments?.length);
		const hasLocation =
			form.type === 'location' &&
			Number.isFinite(Number(form.latitude)) &&
			Number.isFinite(Number(form.longitude));
		if (!hasText && !hasMedia && !hasLocation && form.deletedMode === 'none') return;
		setSaving(true);
		try {
			await onSave({
				type: form.type,
				text: form.text.trim() || null,
				direction: form.direction,
				status: form.status,
				timestamp: new Date(form.timestamp).toISOString(),
				showReadReceipt: form.showReadReceipt,
				forwarded: form.forwarded,
				deletedMode: form.deletedMode,
				replyToId: form.replyToId || null,
				location: hasLocation
					? {
							latitude: Number(form.latitude),
							longitude: Number(form.longitude),
							name: form.locationName.trim() || null,
						}
					: null,
				reactions: form.reactions
					.trim()
					.split(/\s+/)
					.filter(Boolean)
					.map(emoji => ({ emoji, actorKey: 'contact' })),
				mediaFile: form.mediaFile,
			});
			if (!message) {
				setForm(current => ({
					...current,
					text: '',
					mediaFile: null,
					reactions: '',
					timestamp: localDateTime(),
				}));
			}
			onCancel?.();
		} finally {
			setSaving(false);
		}
	};

	return (
		<form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
			<div className="grid gap-2 sm:grid-cols-2">
				<select
					value={form.type}
					onChange={event => setForm(current => ({ ...current, type: event.target.value }))}
					className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
				>
					{['text', 'image', 'video', 'audio', 'document', 'location'].map(type => (
						<option key={type} value={type}>{labels[type] || type}</option>
					))}
				</select>
				<select
					value={form.replyToId}
					onChange={event => setForm(current => ({ ...current, replyToId: event.target.value }))}
					className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
				>
					<option value="">{labels.noReply}</option>
					{messages
						.filter(item => String(item.id) !== String(message?.id))
						.map(item => (
							<option key={item.id} value={item.id}>
								{String(item.text || item.type || '').slice(0, 50)}
							</option>
						))}
				</select>
			</div>
			<textarea
				value={form.text}
				onChange={event => setForm(current => ({ ...current, text: event.target.value }))}
				placeholder={labels.messageText}
				rows={3}
				className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
			/>
			{['image', 'video', 'audio', 'document'].includes(form.type) && !message && (
				<label className="grid gap-1 text-xs font-bold">
					{labels.mediaFile}
					<input
						type="file"
						accept={
							form.type === 'image'
								? 'image/jpeg,image/png,image/webp'
								: form.type === 'video'
									? 'video/mp4,video/webm'
									: form.type === 'audio'
										? 'audio/mpeg,audio/ogg,audio/webm,audio/mp4'
										: '.pdf,.doc,.docx,.xls,.xlsx'
						}
						onChange={event =>
							setForm(current => ({ ...current, mediaFile: event.target.files?.[0] || null }))
						}
					/>
				</label>
			)}
			{form.type === 'location' && (
				<div className="grid gap-2 sm:grid-cols-3">
					<input
						type="number"
						step="any"
						value={form.latitude}
						onChange={event => setForm(current => ({ ...current, latitude: event.target.value }))}
						placeholder={labels.latitude}
						className="h-9 rounded-lg border px-2 text-sm"
					/>
					<input
						type="number"
						step="any"
						value={form.longitude}
						onChange={event => setForm(current => ({ ...current, longitude: event.target.value }))}
						placeholder={labels.longitude}
						className="h-9 rounded-lg border px-2 text-sm"
					/>
					<input
						value={form.locationName}
						onChange={event => setForm(current => ({ ...current, locationName: event.target.value }))}
						placeholder={labels.locationName}
						className="h-9 rounded-lg border px-2 text-sm"
					/>
				</div>
			)}
			<div className="grid gap-2 sm:grid-cols-3">
				<select
					value={form.direction}
					onChange={event =>
						setForm(current => ({ ...current, direction: event.target.value }))
					}
					className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
				>
					<option value="inbound">{labels.inbound}</option>
					<option value="outbound">{labels.outbound}</option>
				</select>
				<select
					value={form.status}
					onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
					className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
				>
					{['pending', 'sent', 'delivered', 'read', 'failed', 'played'].map(status => (
						<option key={status} value={status}>
							{labels.statuses[status] || status}
						</option>
					))}
				</select>
				<input
					type="datetime-local"
					value={form.timestamp}
					onChange={event =>
						setForm(current => ({ ...current, timestamp: event.target.value }))
					}
					className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
				/>
			</div>
			<label className="flex items-center gap-2 text-xs font-bold">
				<input
					type="checkbox"
					checked={form.showReadReceipt}
					onChange={event =>
						setForm(current => ({ ...current, showReadReceipt: event.target.checked }))
					}
				/>
				{labels.showReadReceipt}
			</label>
			<div className="grid gap-2 sm:grid-cols-3">
				<label className="flex items-center gap-2 text-xs font-bold">
					<input
						type="checkbox"
						checked={form.forwarded}
						onChange={event =>
							setForm(current => ({ ...current, forwarded: event.target.checked }))
						}
					/>
					{labels.forwarded}
				</label>
				<select
					value={form.deletedMode}
					onChange={event => setForm(current => ({ ...current, deletedMode: event.target.value }))}
					className="h-9 rounded-lg border px-2 text-xs"
				>
					<option value="none">{labels.notDeleted}</option>
					<option value="for_me">{labels.deletedForMe}</option>
					<option value="for_everyone">{labels.deletedForEveryone}</option>
				</select>
				<input
					value={form.reactions}
					onChange={event => setForm(current => ({ ...current, reactions: event.target.value }))}
					placeholder={labels.reactions}
					className="h-9 rounded-lg border px-2 text-sm"
				/>
			</div>
			<div className="flex justify-end gap-2">
				{message && (
					<Button type="button" variant="outline" size="sm" onClick={onCancel}>
						{labels.cancel}
					</Button>
				)}
				<Button
					type="submit"
					size="sm"
					disabled={
						disabled ||
						saving ||
						(!form.text.trim() &&
							!form.mediaFile &&
							form.type !== 'location' &&
							form.deletedMode === 'none')
					}
				>
					{saving ? labels.saving : message ? labels.updateMessage : labels.addMessage}
				</Button>
			</div>
		</form>
	);
}
