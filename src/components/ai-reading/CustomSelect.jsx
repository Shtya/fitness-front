'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Custom select — never use native <select> in AI Studio UI.
 */
export default function CustomSelect({
	value,
	onChange,
	options = [],
	placeholder = 'Select…',
	className = '',
	disabled = false,
	align = 'start',
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef(null);
	const listId = useId();
	const selected = options.find(o => String(o.value) === String(value));

	useEffect(() => {
		if (!open) return;
		const onDoc = e => {
			if (!rootRef.current?.contains(e.target)) setOpen(false);
		};
		const onKey = e => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			<button
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listId}
				onClick={() => !disabled && setOpen(o => !o)}
				className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#2d4a3e]/15 bg-white/80 px-3 py-2.5 text-start text-sm text-[#1a2e28] outline-none transition hover:border-[#2d4a3e]/30 focus:ring-2 focus:ring-[#3d5a4c]/25 disabled:opacity-50"
			>
				<span className={`truncate ${selected ? '' : 'text-[#5c6b63]'}`}>
					{selected?.label ?? placeholder}
				</span>
				<ChevronDown size={14} className={`shrink-0 text-[#5c6b63] transition ${open ? 'rotate-180' : ''}`} />
			</button>

			<AnimatePresence>
				{open && (
					<motion.ul
						id={listId}
						role="listbox"
						initial={{ opacity: 0, y: 6, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.98 }}
						transition={{ duration: 0.14 }}
						className={`absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#2d4a3e]/12 bg-[#fffefb] py-1.5 shadow-xl ${
							align === 'end' ? 'end-0' : 'start-0'
						}`}
					>
						{options.map(opt => {
							const active = String(opt.value) === String(value);
							return (
								<li key={String(opt.value)} role="option" aria-selected={active}>
									<button
										type="button"
										onClick={() => {
											onChange(opt.value);
											setOpen(false);
										}}
										className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-sm transition ${
											active ? 'bg-[#1a2e28]/[0.08] font-semibold text-[#1a2e28]' : 'text-[#1a2e28] hover:bg-[#1a2e28]/[0.05]'
										}`}
									>
										<span className="truncate">{opt.label}</span>
										{active && <Check size={14} className="shrink-0 text-[#3d5a4c]" />}
									</button>
								</li>
							);
						})}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}
