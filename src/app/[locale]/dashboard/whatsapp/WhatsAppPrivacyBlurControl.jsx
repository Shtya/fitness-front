'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

function OptionRow({ checked, label, hint, onChange }) {
	return (
		<label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
			<input
				type="checkbox"
				checked={checked}
				onChange={event => onChange(event.target.checked)}
				className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--color-primary-500)]"
			/>
			<span className="min-w-0">
				<span className="block text-[12px] font-bold leading-4 text-slate-800 dark:text-slate-100">
					{label}
				</span>
				{hint ? (
					<span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{hint}</span>
				) : null}
			</span>
		</label>
	);
}

export default function WhatsAppPrivacyBlurControl({
	value,
	onChange,
	labels,
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const enabled = Boolean(value?.enabled);

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = 280;
			const left = Math.min(
				Math.max(8, rect.right - width),
				window.innerWidth - width - 8,
			);
			setPosition({
				top: rect.bottom + 6,
				left,
				width,
			});
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (
				!rootRef.current?.contains(event.target) &&
				!menuRef.current?.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const closeOnEscape = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open]);

	const patch = next => onChange({ ...value, ...next });

	return (
		<div ref={rootRef} className="wa-privacy-blur-control relative shrink-0">
			<button
				ref={buttonRef}
				type="button"
				aria-pressed={enabled}
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-label={labels.blurOptions}
				title={labels.blurToggleHint}
				onClick={() => setOpen(current => !current)}
				className={`wa-btn-3d wa-privacy-blur-toggle rounded-lg text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
					enabled ? 'is-active' : ''
				} ${open ? 'is-open' : ''}`}
			>
				{enabled ? <EyeOff size={17} /> : <Eye size={17} />}
				<ChevronDown size={12} className={open ? 'rotate-180' : ''} />
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="dialog"
						aria-label={labels.blurOptions}
						className="wa-privacy-blur-menu fixed z-500 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
						style={position}
					>
						<div className="mb-1 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
							<div className="min-w-0">
								<p className="text-[12px] font-black text-slate-800 dark:text-slate-100">
									{labels.blurTitle}
								</p>
								<p className="text-[10px] text-slate-500">{labels.blurHint}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={enabled}
								aria-label={labels.blurToggle}
								onClick={() => patch({ enabled: !enabled })}
								className={`relative h-5 w-9 shrink-0 overflow-hidden rounded-full ${
									enabled ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200 dark:bg-slate-700'
								}`}
							>
								<span
									className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-all ${
										enabled ? 'start-[18px]' : 'start-0.5'
									}`}
								/>
							</button>
						</div>
						<OptionRow
							checked={Boolean(value?.list)}
							label={labels.blurList}
							hint={labels.blurListHint}
							onChange={list => patch({ list, enabled: true })}
						/>
						<OptionRow
							checked={Boolean(value?.thread)}
							label={labels.blurThread}
							hint={labels.blurThreadHint}
							onChange={thread => patch({ thread, enabled: true })}
						/>
						<OptionRow
							checked={Boolean(value?.hoverReveal)}
							label={labels.blurHover}
							hint={labels.blurHoverHint}
							onChange={hoverReveal => patch({ hoverReveal, enabled: true })}
						/>
						<OptionRow
							checked={Boolean(value?.persistReveal)}
							label={labels.blurPersist}
							hint={labels.blurPersistHint}
							onChange={persistReveal => patch({ persistReveal, enabled: true })}
						/>
					</div>,
					document.body,
				)}
		</div>
	);
}
