'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CornerDownLeft, Search, Smartphone, X } from 'lucide-react';

/** Lowercase, no Arabic diacritics/tatweel, alef/yaa/taa-marbuta folded, so "الحسابات" ≈ "الحسابات". */
function fold(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[ً-ٰٟـ]/g, '')
		.replace(/[أإآ]/g, 'ا')
		.replace(/ى/g, 'ي')
		.replace(/ة/g, 'ه')
		.trim();
}

function matches(item, query) {
	if (!query) return true;
	const hay = fold(`${item.label} ${item.keywords || ''} ${item.id}`);
	return query.split(/\s+/).every(part => hay.includes(part));
}

/**
 * Quick switcher for the WhatsApp workspace (Ctrl + Shift + K): search every tab and tool and open
 * it with Enter; the accounts column switches account in one click (Alt + 1…9 from the keyboard).
 */
export default function WhatsAppQuickSwitcher({ open, ar, items, accounts, onClose, onSelectAccount }) {
	const [query, setQuery] = useState('');
	const [cursor, setCursor] = useState(0);
	const inputRef = useRef(null);
	const listRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		setQuery('');
		setCursor(0);
		const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
		return () => window.clearTimeout(timer);
	}, [open]);

	const folded = fold(query);
	const results = useMemo(() => {
		const tabs = items.filter(item => matches(item, folded));
		// Typing an account's name or number also offers switching to it.
		const accountHits = folded
			? accounts
					.filter(account => !account.active && matches({ id: account.id, label: account.label, keywords: account.sub }, folded))
					.map(account => ({
						id: `account:${account.id}`,
						label: ar ? `التحويل لـ ${account.label}` : `Switch to ${account.label}`,
						hint: account.sub,
						Icon: Smartphone,
						onSelect: () => onSelectAccount(account.id),
					}))
			: [];
		return [...tabs, ...accountHits];
	}, [accounts, ar, folded, items, onSelectAccount]);

	useEffect(() => {
		setCursor(current => Math.min(current, Math.max(0, results.length - 1)));
	}, [results.length]);

	useEffect(() => {
		listRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
	}, [cursor]);

	if (!open || typeof document === 'undefined') return null;

	const run = item => {
		if (!item) return;
		onClose();
		item.onSelect();
	};

	const onKeyDown = event => {
		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
			return;
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!results.length) return;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			setCursor(current => (current + step + results.length) % results.length);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			run(results[cursor]);
			return;
		}
		// Alt + 1…9: switch to that account (physical digit keys, any keyboard layout).
		const digit = /^Digit([1-9])$/.exec(event.code || '');
		if (event.altKey && digit) {
			const account = accounts[Number(digit[1]) - 1];
			if (account) {
				event.preventDefault();
				onClose();
				onSelectAccount(account.id);
			}
		}
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[1200] flex items-start justify-center bg-slate-950/45 px-3 pt-[9vh] backdrop-blur-[2px] sm:px-6"
			dir={ar ? 'rtl' : 'ltr'}
			onMouseDown={event => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={ar ? 'التنقل السريع' : 'Quick switcher'}
				onKeyDown={onKeyDown}
				className="flex max-h-[78vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(2,20,12,0.55)] dark:border-slate-700 dark:bg-slate-900 sm:flex-row"
			>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<div className="flex items-center gap-2.5 border-b border-slate-100 px-4 dark:border-slate-800">
						<Search size={18} className="shrink-0 text-slate-400" aria-hidden />
						<input
							ref={inputRef}
							value={query}
							onChange={event => {
								setQuery(event.target.value);
								setCursor(0);
							}}
							placeholder={ar ? 'دوّر على تابة أو أداة… (الحسابات، التقارير، تحويل تلقائي)' : 'Search tabs and tools… (accounts, reports, auto-forward)'}
							aria-label={ar ? 'بحث في التابات' : 'Search tabs'}
							role="combobox"
							aria-expanded="true"
							aria-controls="wa-quick-switcher-list"
							aria-activedescendant={results[cursor] ? `wa-qs-${results[cursor].id}` : undefined}
							className="h-14 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
						/>
						<button
							type="button"
							onClick={onClose}
							aria-label={ar ? 'إغلاق' : 'Close'}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
						>
							<X size={16} />
						</button>
					</div>

					<ul id="wa-quick-switcher-list" ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
						{results.length ? (
							results.map((item, index) => {
								const Icon = item.Icon;
								const selected = index === cursor;
								return (
									<li key={item.id} role="none">
										<button
											id={`wa-qs-${item.id}`}
											type="button"
											role="option"
											aria-selected={selected}
											data-index={index}
											onMouseMove={() => setCursor(index)}
											onClick={() => run(item)}
											className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition ${
												selected ? 'bg-[#1DAB61]/10 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'
											}`}
										>
											<span
												className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
													selected ? 'bg-[#1DAB61] text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
												}`}
												aria-hidden
											>
												{Icon ? <Icon size={16} strokeWidth={2.1} /> : null}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-[14px] font-semibold">{item.label}</span>
												{item.hint ? (
													<span className="block truncate text-[12px] text-slate-400" dir="auto">
														{item.hint}
													</span>
												) : null}
											</span>
											{item.active ? (
												<span className="shrink-0 rounded-full bg-[#1DAB61]/12 px-2 py-0.5 text-[11px] font-bold text-[#1DAB61]">
													{item.activeLabel || (ar ? 'مفتوحة' : 'Open')}
												</span>
											) : null}
											{selected ? <CornerDownLeft size={14} className="shrink-0 text-slate-400" aria-hidden /> : null}
										</button>
									</li>
								);
							})
						) : (
							<li className="px-3 py-10 text-center text-sm text-slate-400">
								{ar ? 'مفيش تابة بالاسم ده' : 'No tab matches that'}
							</li>
						)}
					</ul>

					<p className="hidden border-t border-slate-100 px-4 py-2 text-[11.5px] text-slate-400 dark:border-slate-800 sm:block">
						{ar
							? '↑ ↓ للتنقل · Enter للفتح · Alt + رقم لتغيير الحساب · Esc للإغلاق'
							: '↑ ↓ to move · Enter to open · Alt + number to switch account · Esc to close'}
					</p>
				</div>

				{accounts.length ? (
					<aside className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/40 sm:w-[230px] sm:border-s sm:border-t-0">
						<p className="px-2 pb-1.5 pt-1 text-[11.5px] font-bold text-slate-400">{ar ? 'الحسابات' : 'Accounts'}</p>
						<div className="flex gap-1.5 overflow-x-auto sm:flex-col sm:overflow-visible">
							{accounts.map((account, index) => (
								<button
									key={account.id}
									type="button"
									onClick={() => {
										onClose();
										if (!account.active) onSelectAccount(account.id);
									}}
									aria-current={account.active ? 'true' : undefined}
									title={index < 9 ? `Alt + ${index + 1}` : undefined}
									className={`flex min-w-[170px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition sm:min-w-0 ${
										account.active
											? 'bg-white shadow-sm ring-1 ring-[#1DAB61]/40 dark:bg-slate-900'
											: 'hover:bg-white dark:hover:bg-slate-900'
									}`}
								>
									<span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1DAB61]/12 text-[12px] font-black text-[#1DAB61]">
										{String(account.label || '?').trim().slice(0, 1).toUpperCase()}
										<span
											className={`absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
												account.tone === 'ok' ? 'bg-emerald-500' : account.tone === 'warn' ? 'bg-amber-400' : 'bg-slate-300'
											}`}
											aria-hidden
										/>
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
											{account.label}
										</span>
										{account.sub ? (
											<bdi dir="ltr" className="block truncate text-[11.5px] text-slate-400">
												{account.sub}
											</bdi>
										) : null}
									</span>
									{account.active ? (
										<Check size={15} className="shrink-0 text-[#1DAB61]" aria-hidden />
									) : account.unread ? (
										<span className="shrink-0 rounded-full bg-[#1DAB61] px-1.5 text-[10.5px] font-bold leading-[18px] text-white">
											{account.unread > 99 ? '99+' : account.unread}
										</span>
									) : index < 9 ? (
										<kbd className="hidden shrink-0 rounded border border-slate-200 px-1 text-[10px] font-semibold text-slate-400 dark:border-slate-700 sm:inline">
											{index + 1}
										</kbd>
									) : null}
								</button>
							))}
						</div>
					</aside>
				) : null}
			</div>
		</div>,
		document.body,
	);
}
