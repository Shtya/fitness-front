'use client';

import useSubscriptions from '@/hooks/useSubscriptions';
import SubscriptionsTable from '@/components/billing/SubscriptionsTable';

export default function SubscriptionsPage() {
	const { items, loading, updateSubscription } = useSubscriptions();
	return (
		<div className='space-y-4'>
			<div>
				<h1 className='text-2xl font-bold text-slate-800'>Subscriptions</h1>
				<p className='text-slate-500'>Lifecycle management: renew, pause, resume, cancel, freeze, extend, change package.</p>
			</div>
			<SubscriptionsTable items={items} loading={loading} onAction={(id, action) => updateSubscription(id, { action })} />
		</div>
	);
}
