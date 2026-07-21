'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export default function FakeContactDialog({
	open,
	onOpenChange,
	contact,
	labels,
	onSave,
}) {
	const [form, setForm] = useState({
		name: '',
		phone: '',
		about: '',
		avatarColor: '#10b981',
		verified: false,
		presenceStatus: 'offline',
		lastSeenAt: '',
		photoFile: null,
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setForm({
			name: contact?.name || contact?.displayName || '',
			phone: contact?.phone || contact?.waId || '',
			about: contact?.about || '',
			avatarColor: contact?.avatarColor || contact?.avatar_color || '#10b981',
			verified: Boolean(contact?.verified),
			presenceStatus: contact?.presenceStatus || contact?.presence_status || 'offline',
			lastSeenAt: contact?.lastSeenAt
				? new Date(new Date(contact.lastSeenAt).getTime() - new Date(contact.lastSeenAt).getTimezoneOffset() * 60000)
						.toISOString()
						.slice(0, 16)
				: '',
			photoFile: null,
		});
	}, [contact, open]);

	const submit = async event => {
		event.preventDefault();
		if (!form.name.trim()) return;
		setSaving(true);
		try {
			await onSave({
				name: form.name.trim(),
				phone: form.phone.trim() || null,
				about: form.about.trim() || null,
				avatarColor: form.avatarColor || null,
				verified: form.verified,
				presenceStatus: form.presenceStatus,
				lastSeenAt: form.lastSeenAt ? new Date(form.lastSeenAt).toISOString() : null,
				photoFile: form.photoFile,
			});
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md" dir={labels.dir}>
				<DialogHeader>
					<DialogTitle>{contact ? labels.editContact : labels.createContact}</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<label className="block space-y-1 text-sm font-bold">
						<span>{labels.contactName}</span>
						<input
							value={form.name}
							onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
							className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-900"
						/>
					</label>
					<label className="block space-y-1 text-sm font-bold">
						<span>{labels.phone}</span>
						<input
							value={form.phone}
							onChange={event => setForm(current => ({ ...current, phone: event.target.value }))}
							className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-900"
						/>
					</label>
					<label className="block space-y-1 text-sm font-bold">
						<span>{labels.about}</span>
						<textarea
							value={form.about}
							onChange={event => setForm(current => ({ ...current, about: event.target.value }))}
							rows={2}
							className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 font-normal dark:border-slate-700 dark:bg-slate-900"
						/>
					</label>
					<div className="grid gap-3 sm:grid-cols-2">
						<label className="block space-y-1 text-sm font-bold">
							<span>{labels.presence}</span>
							<select
								value={form.presenceStatus}
								onChange={event =>
									setForm(current => ({ ...current, presenceStatus: event.target.value }))
								}
								className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-900"
							>
								{['offline', 'online', 'away', 'typing', 'recording'].map(status => (
									<option key={status} value={status}>{labels[status] || status}</option>
								))}
							</select>
						</label>
						<label className="block space-y-1 text-sm font-bold">
							<span>{labels.lastSeen}</span>
							<input
								type="datetime-local"
								value={form.lastSeenAt}
								onChange={event =>
									setForm(current => ({ ...current, lastSeenAt: event.target.value }))
								}
								className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-900"
							/>
						</label>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<label className="block space-y-1 text-sm font-bold">
							<span>{labels.avatarColor}</span>
							<input
								type="color"
								value={form.avatarColor}
								onChange={event =>
									setForm(current => ({ ...current, avatarColor: event.target.value }))
								}
								className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
							/>
						</label>
						<label className="block space-y-1 text-sm font-bold">
							<span>{labels.profilePhoto}</span>
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onChange={event =>
									setForm(current => ({ ...current, photoFile: event.target.files?.[0] || null }))
								}
								className="block w-full text-xs font-normal"
							/>
						</label>
					</div>
					<label className="flex items-center gap-2 text-sm font-bold">
						<input
							type="checkbox"
							checked={form.verified}
							onChange={event =>
								setForm(current => ({ ...current, verified: event.target.checked }))
							}
						/>
						{labels.verified}
					</label>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							{labels.cancel}
						</Button>
						<Button type="submit" disabled={saving || !form.name.trim()}>
							{saving ? labels.saving : labels.save}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
