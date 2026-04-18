'use client';

export default function ClientFilters({ query, onChange }) {
	return (
		<div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
			<input
				className='h-10 rounded-lg border border-slate-200 px-3'
				placeholder='Search name/email/phone'
				value={query.q || ''}
				onChange={(e) => onChange({ ...query, page: 1, q: e.target.value })}
			/>
			<select
				className='h-10 rounded-lg border border-slate-200 px-3'
				value={query.status || ''}
				onChange={(e) => onChange({ ...query, page: 1, status: e.target.value })}
			>
				<option value=''>All status</option>
				<option value='active'>Active</option>
				<option value='expired'>Expired</option>
				<option value='pending'>Pending</option>
			</select>
			<input
				className='h-10 rounded-lg border border-slate-200 px-3'
				placeholder='Coach ID'
				value={query.coachId || ''}
				onChange={(e) => onChange({ ...query, page: 1, coachId: e.target.value })}
			/>
		</div>
	);
}
