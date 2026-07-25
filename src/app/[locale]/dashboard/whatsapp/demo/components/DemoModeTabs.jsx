'use client';

import { Braces } from 'lucide-react';

export default function DemoModeTabs({ labels, mode, onChange }) {
	return (
		<div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60">
			{[
				{ id: 'form', label: labels.formMode },
				{ id: 'json', label: labels.jsonMode, icon: Braces },
			].map(tab => {
				const active = mode === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => onChange(tab.id)}
						className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
							active
								? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
								: 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
						}`}
					>
						{tab.icon ? <tab.icon size={12} /> : null}
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}
