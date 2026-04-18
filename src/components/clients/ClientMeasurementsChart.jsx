'use client';

export default function ClientMeasurementsChart({ data = [] }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-white p-4'>
			<h3 className='font-semibold text-slate-800 mb-3'>Measurements Trend</h3>
			{/* TODO: Replace with chart library when backend returns structured measurements */}
			<pre className='text-xs bg-slate-50 p-3 rounded-lg overflow-auto'>{JSON.stringify(data, null, 2)}</pre>
		</div>
	);
}
