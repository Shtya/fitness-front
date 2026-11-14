'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Check, Search, Smartphone } from 'lucide-react';

/* ── Usage memory ─────────────────────────────────────────────────────────────
 * Every tab or tool you open is remembered on this device (count + last time), and the
 * switcher lists the ones you use most and most recently first. Per-viewer convenience only. */

const USAGE_KEY = 'wa-quick-switch-usage-v1';
const HOUR = 3_600_000;

function readUsage() {
	try {
		const raw = JSON.parse(window.localStorage.getItem(USAGE_KEY) || '{}');
		return raw && typeof raw === 'object' ? raw : {};
	} catch {
		return {};
	}
}

/** Remember that `id` (a tab key or tool id) was just opened. */
export function recordQuickSwitchUse(id) {
	if (!id || typeof window === 'undefined') return;
	try {
		const usage = readUsage();
		const prev = usage[id] || { count: 0, last: 0 };
		// Ignore the same tab re-reported within a few seconds (re-renders, restores).
		if (Date.now() - prev.last < 4000) return;
		usage[id] = { count: Math.min(prev.count + 1, 500), last: Date.now() };
		window.localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
	} catch {
		/* storage blocked: ordering just stays default */
	}
}

/** Frecency: how often, weighted by how recently. 0 for never used. */
function usageScore(entry, now) {
	if (!entry?.count) return 0;
	const age = now - (Number(entry.last) || 0);
	const recency = age < HOUR ? 8 : age < 24 * HOUR ? 4 : age < 7 * 24 * HOUR ? 2 : 1;
	return Math.log2(entry.count + 1) * 3 + recency;
}

/* ── Matching ─────────────────────────────────────────────────────────────── */

function fold(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[ً-ٰٟـ]/g, '')
		.replace(/[أإآ]/g, 'ا')
		.replace(/ى/g, 'ي')
		.replace(/ة/g, 'ه')
		.trim();
}

/** 3 = label starts with it, 2 = a word starts with it, 1 = found anywhere, 0 = no match. */
function matchRank(item, query) {
	if (!query) return 1;
	const label = fold(item.label);
	const hay = `${label} ${fold(item.keywords)} ${fold(item.id)}`;
	if (!query.split(/\s+/).every(part => hay.includes(part))) return 0;
	if (label.startsWith(query)) return 3;
	if (hay.split(/\s+/).some(word => word.startsWith(query))) return 2;
	return 1;
}

const FONT = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Noto Sans Arabic", sans-serif';

/* Windows 11 style overlay scrollbar: a thin pill. */
const SCROLL_CSS = `
.wa-qs-scroll{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.28) transparent}
.wa-qs-scroll::-webkit-scrollbar{width:10px;height:6px}
.wa-qs-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.24);border-radius:10px;border:3px solid transparent;background-clip:content-box}
.wa-qs-scroll::-webkit-scrollbar-track{background:transparent}`;

/**
 * Quick switcher for the WhatsApp workspace: search every tab and tool, most-used first,
 * and switch account from the chips under the search (Alt + 1…9 from the keyboard).
 */
export default function WhatsAppQuickSwitcher({ open, ar, items, accounts, onClose, onSelectAccount }) {
	const [query, setQuery] = useState('');
	const [cursor, setCursor] = useState(0);
	const [usage, setUsage] = useState({});
	const inputRef = useRef(null);
	const listRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		setQuery('');
		setCursor(0);
		setUsage(readUsage());
		const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
		return () => window.clearTimeout(timer);
	}, [open]);

	const folded = fold(query);

	/** Flat list of rows (with section headers when not searching). */
	const { rows, results } = useMemo(() => {
		const now = Date.now();
		const scored = items.map((item, order) => ({ item, order, score: usageScore(usage[item.id], now) }));
		if (folded) {
			const hits = scored
				.map(entry => ({ ...entry, rank: matchRank(entry.item, folded) }))
				.filter(entry => entry.rank > 0)
				.sort((a, b) => b.rank - a.rank || b.score - a.score || a.order - b.order)
				.map(entry => entry.item);
			const accountHits = accounts
				.filter(account => !account.active && matchRank({ id: account.id, label: account.label, keywords: account.sub }, folded))
				.map(account => ({
					id: `account:${account.id}`,
					label: ar ? `التحويل لـ ${account.label}` : `Switch to ${account.label}`,
					hint: account.sub,
					Icon: Smartphone,
					onSelect: () => onSelectAccount(account.id),
				}));
			const list = [...hits, ...accountHits];
			return { results: list, rows: list.map(item => ({ type: 'item', item })) };
		}
		const lastUsed = entry => Number(usage[entry.item.id]?.last) || 0;
		const used = scored
			.filter(entry => entry.score > 0)
			.sort((a, b) => b.score - a.score || lastUsed(b) - lastUsed(a) || a.order - b.order);
		const rest = scored.filter(entry => entry.score === 0).sort((a, b) => a.order - b.order);
		const out = [];
		if (used.length) {
			out.push({ type: 'head', key: 'used', label: ar ? 'الأكثر استخدامًا' : 'Most used' });
			used.forEach(entry => out.push({ type: 'item', item: entry.item }));
		}
		if (rest.length) {
			out.push({ type: 'head', key: 'rest', label: used.length ? (ar ? 'باقي التابات' : 'Everything else') : ar ? 'كل التابات' : 'All tabs' });
			rest.forEach(entry => out.push({ type: 'item', item: entry.item }));
		}
		return { rows: out, results: [...used, ...rest].map(entry => entry.item) };
	}, [accounts, ar, folded, items, onSelectAccount, usage]);

	useEffect(() => {
		setCursor(current => Math.min(current, Math.max(0, results.length - 1)));
	}, [results.length]);

	useEffect(() => {
		listRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
	}, [cursor]);

	if (!open || typeof document === 'undefined') return null;

	const run = item => {
		if (!item) return;
		recordQuickSwitchUse(item.id);
		onClose();
		item.onSelect();
	};

	const switchAccount = account => {
		onClose();
		if (account && !account.active) onSelectAccount(account.id);
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
		const digit = /^Digit([1-9])$/.exec(event.code || '');
		if (event.altKey && digit) {
			const account = accounts[Number(digit[1]) - 1];
			if (account) {
				event.preventDefault();
				switchAccount(account);
			}
		}
	};

	let index = -1;

	return createPortal(
		<div
			className="fixed inset-0 z-[1200] flex items-start justify-center bg-slate-900/[0.08] px-3 pt-[11vh] sm:px-6"
			dir={ar ? 'rtl' : 'ltr'}
			style={{ fontFamily: FONT }}
			onMouseDown={event => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<style>{SCROLL_CSS}</style>
			<motion.div
				initial={{ opacity: 0, y: -6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.14, ease: [0.1, 0.9, 0.2, 1] }}
				role="dialog"
				aria-modal="true"
				aria-label={ar ? 'التنقل السريع' : 'Quick switcher'}
				onKeyDown={onKeyDown}
				className="flex max-h-[70vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[10px] border border-black/[0.08] bg-[#fbfbfc]/[0.97] shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_32px_64px_-12px_rgba(0,0,0,0.22),0_2px_21px_rgba(0,0,0,0.08)] backdrop-blur-xl"
			>
				{/* Search */}
				<div className="flex items-center gap-4 px-6">
					<Search size={20} strokeWidth={1.8} className="shrink-0 text-[#5d5d5d]" aria-hidden />
					<input
						ref={inputRef}
						value={query}
						onChange={event => {
							setQuery(event.target.value);
							setCursor(0);
						}}
						placeholder={ar ? 'ابدأ اكتب…' : 'Start typing…'}
						aria-label={ar ? 'بحث في التابات والأدوات' : 'Search tabs and tools'}
						role="combobox"
						aria-expanded="true"
						aria-controls="wa-quick-switcher-list"
						aria-activedescendant={results[cursor] ? `wa-qs-${results[cursor].id}` : undefined}
						className="h-[60px] min-w-0 flex-1 bg-transparent text-[17px] text-[#1a1a1a] outline-none placeholder:text-[#8a8a8a]"
					/>
				</div>

				{/* Accounts: one click (or Alt + number) to switch */}
				{accounts.length > 1 ? (
					<div className="wa-qs-scroll flex items-center gap-1.5 overflow-x-auto overflow-y-hidden border-t border-black/[0.06] px-5 py-2">
						<span className="me-1 shrink-0 text-[12px] font-semibold text-[#5d5d5d]">{ar ? 'الحساب' : 'Account'}</span>
						{accounts.map((account, i) => (
							<button
								key={account.id}
								type="button"
								onClick={() => switchAccount(account)}
								aria-current={account.active ? 'true' : undefined}
								title={i < 9 ? `Alt + ${i + 1}` : undefined}
								className={`flex h-7 shrink-0 items-center gap-1.5 rounded-[5px] border px-2 text-[12.5px] transition-colors ${
									account.active
										? 'border-[#1DAB61]/40 bg-[#1DAB61]/[0.08] font-semibold text-[#0c6b3b]'
										: 'border-black/[0.08] bg-white text-[#1a1a1a] hover:bg-black/[0.03]'
								}`}
							>
								<span
									className={`h-2 w-2 rounded-full ${
										account.tone === 'ok' ? 'bg-emerald-500' : account.tone === 'warn' ? 'bg-amber-400' : 'bg-slate-300'
									}`}
									aria-hidden
								/>
								<span className="max-w-[150px] truncate">{account.label}</span>
								{account.active ? (
									<Check size={13} strokeWidth={2.4} aria-hidden />
								) : account.unread ? (
									<span className="rounded-full bg-[#1DAB61] px-1.5 text-[10px] font-bold leading-4 text-white">
										{account.unread > 99 ? '99+' : account.unread}
									</span>
								) : i < 9 ? (
									<span className="text-[11px] text-[#8a8a8a]">Alt+{i + 1}</span>
								) : null}
							</button>
						))}
					</div>
				) : null}

				{/* Results */}
				<div
					id="wa-quick-switcher-list"
					ref={listRef}
					role="listbox"
					className="wa-qs-scroll min-h-0 flex-1 overflow-y-auto border-t border-black/[0.06] px-2 pb-2"
				>
					{rows.length ? (
						rows.map(row => {
							if (row.type === 'head') {
								return (
									<p key={`head-${row.key}`} className="px-4 pb-1.5 pt-3.5 text-[12.5px] font-semibold text-[#1a1a1a]">
										{row.label}
									</p>
								);
							}
							index += 1;
							const i = index;
							const { item } = row;
							const Icon = item.Icon;
							const selected = i === cursor;
							return (
								<button
									key={item.id}
									id={`wa-qs-${item.id}`}
									type="button"
									role="option"
									aria-selected={selected}
									data-index={i}
									onMouseMove={() => cursor !== i && setCursor(i)}
									onClick={() => run(item)}
									className={`relative flex h-[44px] w-full items-center gap-4 rounded-[5px] px-3.5 text-start transition-colors duration-75 ${
										selected ? 'bg-black/[0.045]' : ''
									}`}
								>
									{/* Windows 11 selection pill */}
									<span
										aria-hidden
										className={`absolute start-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#1DAB61] transition-opacity ${
											selected ? 'opacity-100' : 'opacity-0'
										}`}
									/>
									<span
										aria-hidden
										className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[5px] border border-black/[0.07] bg-white text-[#333] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
									>
										{Icon ? <Icon size={15} strokeWidth={1.9} /> : null}
									</span>
									<span className="min-w-0 flex-1 truncate text-[14px] text-[#1a1a1a]">
										{item.label}
										{item.hint ? (
											<bdi dir="ltr" className="ms-2 text-[12.5px] text-[#8a8a8a]">
												{item.hint}
											</bdi>
										) : null}
									</span>
									{item.active ? (
										<span className="shrink-0 text-[12px] text-[#1DAB61]">{item.activeLabel || (ar ? 'مفتوحة' : 'Open')}</span>
									) : null}
									{selected ? (
										<span className="shrink-0 text-[12px] text-[#8a8a8a]">{ar ? 'افتح ↵' : 'Open ↵'}</span>
									) : null}
								</button>
							);
						})
					) : (
						<p className="px-4 py-10 text-center text-[13.5px] text-[#5d5d5d]">
							{ar ? 'مفيش نتايج. جرّب اسم التابة بالعربي أو الإنجليزي.' : 'No results. Try the tab name in English or Arabic.'}
						</p>
					)}
				</div>
			</motion.div>
		</div>,
		document.body,
	);
}
