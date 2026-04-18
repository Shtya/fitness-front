'use client';

import { formatDate } from '@/utils/formatters';

export default function ClientProfileHeader({ client }) {
	const profile = client?.profile || {};
	const current = client?.currentSubscription || null;
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-5'>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-bold text-slate-800'>{profile.name || 'Client'}</h1>
					<p className='text-slate-500'>{profile.email || '—'} · {profile.phone || '—'}</p>
				</div>
				<div className='text-right text-sm text-slate-600'>
					<div>Onboarding: {formatDate(profile.created_at)}</div>
					<div>Subscription: {String(current?.status || 'none').replace('_', ' ')}</div>
				</div>
			</div>
		</div>
	);
}
