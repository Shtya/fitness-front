'use client';

import { useState } from 'react';
import usePackages from '@/hooks/usePackages';
import PackageCard from '@/components/billing/PackageCard';
import PackageFormDialog from '@/components/billing/PackageFormDialog';

export default function PackagesPage() {
	const { items, loading, createPackage, updatePackage } = usePackages();
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState(null);

	const save = async (payload) => {
		if (editing?.id) await updatePackage(editing.id, payload);
		else await createPackage(payload);
		setOpen(false);
		setEditing(null);
	};

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-2xl font-bold text-slate-800'>Packages</h1>
					<p className='text-slate-500'>Catalog management only (no direct client sending here).</p>
				</div>
				<button onClick={() => { setEditing(null); setOpen(true); }} className='h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold'>New Package</button>
			</div>
			<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
				{loading ? <div className='text-slate-500'>Loading packages...</div> : items.map((p) => (
					<PackageCard key={p.id} item={p} onEdit={(x) => { setEditing(x); setOpen(true); }} />
				))}
			</div>
			<PackageFormDialog open={open} onClose={() => setOpen(false)} initialValue={editing} onSubmit={save} />
		</div>
	);
}
