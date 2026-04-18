'use client';

import useClients from '@/hooks/useClients';
import ClientFilters from '@/components/clients/ClientFilters';
import ClientStatsCards from '@/components/clients/ClientStatsCards';
import ClientTable from '@/components/clients/ClientTable';

export default function ClientsPage() {
	const { items, loading, query, setQuery } = useClients();
	return (
		<div className='space-y-4'>
			<div>
				<h1 className='text-2xl font-bold text-slate-800'>Clients</h1>
				<p className='text-slate-500'>Real coach-facing client management.</p>
			</div>
			<ClientStatsCards clients={items} />
			<ClientFilters query={query} onChange={setQuery} />
			<ClientTable clients={items} loading={loading} />
		</div>
	);
}
