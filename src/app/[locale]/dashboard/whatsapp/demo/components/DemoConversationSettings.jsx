'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

function localDateTime(value) {
	if (!value) return '';
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function DemoConversationSettings({ conversation, labels, onSave }) {
	const [form, setForm] = useState({
		pinned: false,
		archived: false,
		unreadCount: 0,
		mutedUntil: '',
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setForm({
			pinned: Boolean(conversation?.pinned),
			archived: Boolean(conversation?.archived),
			unreadCount: Math.max(0, Number(conversation?.unreadCount) || 0),
			mutedUntil: localDateTime(conversation?.mutedUntil),
		});
	}, [
		conversation?.archived,
		conversation?.id,
		conversation?.mutedUntil,
		conversation?.pinned,
		conversation?.unreadCount,
	]);

	const submit = async event => {
		event.preventDefault();
		setSaving(true);
		try {
			await onSave({
				pinned: form.pinned,
				archived: form.archived,
				unreadCount: Math.max(0, Number(form.unreadCount) || 0),
				mutedUntil: form.mutedUntil ? new Date(form.mutedUntil).toISOString() : null,
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<form
			onSubmit={submit}
			className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[auto_auto_100px_1fr_auto] sm:items-end dark:border-slate-700"
		>
			{['pinned', 'archived'].map(field => (
				<label key={field} className="flex h-9 items-center gap-2 text-xs font-bold">
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
			<label className="grid gap-1 text-[11px] font-bold">
				{labels.unreadCount}
				<input
					type="number"
					min="0"
					value={form.unreadCount}
					onChange={event =>
						setForm(current => ({ ...current, unreadCount: event.target.value }))
					}
					className="h-9 rounded-lg border bg-transparent px-2 text-sm"
				/>
			</label>
			<label className="grid gap-1 text-[11px] font-bold">
				{labels.mutedUntil}
				<input
					type="datetime-local"
					value={form.mutedUntil}
					onChange={event =>
						setForm(current => ({ ...current, mutedUntil: event.target.value }))
					}
					className="h-9 rounded-lg border bg-transparent px-2 text-sm"
				/>
			</label>
			<Button type="submit" size="sm" disabled={saving}>
				{saving ? labels.saving : labels.save}
			</Button>
		</form>
	);
}
