'use client';

import { Info } from 'lucide-react';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

export default function DemoInfoTip({ text, side = 'top', className = '' }) {
	if (!text) return null;

	return (
		<TooltipProvider delayDuration={150}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label={typeof text === 'string' ? text : 'Info'}
						className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-[var(--color-primary-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)] dark:hover:bg-slate-800 ${className}`}
					>
						<Info size={13} strokeWidth={2.25} />
					</button>
				</TooltipTrigger>
				<TooltipContent
					side={side}
					sideOffset={6}
					className="z-[10000000001] max-w-xs border border-slate-700 bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:border-slate-600"
				>
					<p className="text-balance font-medium">{text}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
