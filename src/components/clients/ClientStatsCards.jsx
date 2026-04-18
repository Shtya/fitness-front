'use client';

export default function ClientStatsCards({ clients = [] }) {
	const total = clients.length;
	const active = clients.filter((c) => String(c.subscriptionStatus).toLowerCase() === 'active').length;
	const expired = clients.filter((c) => String(c.subscriptionStatus).toLowerCase() === 'expired').length;
	const renewalSoon = clients.filter((c) => Number(c.daysLeft || 9999) <= 30).length;

	const cards = [
		{ label: 'Total Clients', value: total },
		{ label: 'Active', value: active },
		{ label: 'Expired', value: expired },
		{ label: 'Renewal <=30d', value: renewalSoon },
	];

	return (
		<div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
			{cards.map((c) => (
				<div key={c.label} className='rounded-xl border border-slate-200 bg-white p-4'>
					<div className='text-xs text-slate-500'>{c.label}</div>
					<div className='text-2xl font-bold text-slate-800'>{c.value}</div>
				</div>
			))}
		</div>
	);
}
