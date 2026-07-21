'use client';

import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DemoProfilePicker({
	profiles,
	activeProfileId,
	disabled,
	labels,
	onActivate,
	onCreate,
	onClone,
	onDelete,
}) {
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState('');

	const submit = async event => {
		event.preventDefault();
		if (!name.trim()) return;
		await onCreate({ name: name.trim() });
		setName('');
		setCreating(false);
	};

	return (
		<div className="space-y-2">
			<div className="flex flex-col gap-2 sm:flex-row">
				<select
					aria-label={labels.profile}
					value={activeProfileId || ''}
					onChange={event => onActivate(event.target.value)}
					disabled={disabled || profiles.length === 0}
					className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
				>
					<option value="">{labels.selectProfile}</option>
					{profiles.map(profile => (
						<option key={profile.id} value={profile.id}>
							{profile.name || profile.label}
						</option>
					))}
				</select>
				<Button type="button" variant="outline" onClick={() => setCreating(value => !value)}>
					<Plus />
					{labels.createProfile}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					disabled={disabled || !activeProfileId}
					onClick={() => onClone(activeProfileId)}
					aria-label={labels.cloneProfile}
				>
					<Copy />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					disabled={disabled || !activeProfileId}
					onClick={() => {
						if (window.confirm(labels.confirmDeleteProfile)) onDelete(activeProfileId);
					}}
					aria-label={labels.delete}
				>
					<Trash2 />
				</Button>
			</div>
			{creating && (
				<form onSubmit={submit} className="flex gap-2">
					<input
						autoFocus
						value={name}
						onChange={event => setName(event.target.value)}
						placeholder={labels.profileName}
						className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
					/>
					<Button type="submit" size="sm" disabled={!name.trim() || disabled}>
						{labels.create}
					</Button>
				</form>
			)}
		</div>
	);
}
