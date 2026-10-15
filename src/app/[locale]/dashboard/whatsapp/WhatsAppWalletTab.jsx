'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, Check, Coins, Hourglass, Loader2, Pencil, Plus, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import api from '@/utils/axios';

const TRACKER_KEY = ['money', 'tracker'];
const CONFIRM_DELETE_MS = 3000;

function apiError(error, fallback) {
	const message = error?.response?.data?.message;
	return (Array.isArray(message) ? message[0] : message) || error?.message || fallback;
}

function todayYmd() {
	return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

function parseAmount(value) {
	const n = Number(String(value ?? '').replace(/,/g, '').trim());
	return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

const round2 = value => Math.round(value * 100) / 100;

function useMoneyFormat(ar) {
	return useMemo(() => {
		const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
		const unit = ar ? 'ج.م' : 'EGP';
		return value => `${nf.format(Number(value) || 0)} ${unit}`;
	}, [ar]);
}

function formatDay(ymd, ar) {
	if (!ymd) return '';
	const d = new Date(`${ymd}T00:00:00`);
	if (Number.isNaN(d.getTime())) return ymd;
	return d.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
}

function formatMonth(ym, ar) {
	if (!ym) return '';
	const d = new Date(`${ym}-01T00:00:00`);
	return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { month: 'long' });
}

/** Mirrors the server summary so a delete / toggle shows instantly; the server snapshot replaces it after. */
function applyLocally(snapshot, item, action, today) {
	if (!snapshot) return snapshot;
	const s = { ...snapshot.summary };
	const amount = Number(item.amount) || 0;
	const pendingBucket = date => (date.slice(0, 7) <= s.month ? 'pendingThisMonth' : date.slice(0, 7) === s.nextMonth ? 'pendingNextMonth' : null);
	const dropPending = date => {
		s.pendingTotal = round2(s.pendingTotal - amount);
		const bucket = pendingBucket(date);
		if (bucket) s[bucket] = round2(s[bucket] - amount);
	};
	const dropReceived = date => {
		s.balance = round2(s.balance - amount);
		if (date.slice(0, 7) === s.month) s.receivedThisMonth = round2(s.receivedThisMonth - amount);
	};
	let items = snapshot.items;
	if (action === 'delete') {
		if (item.kind === 'pending') dropPending(item.date);
		else dropReceived(item.date);
		items = items.filter(row => !(row.id === item.id && row.kind === item.kind));
	} else if (item.kind === 'pending') {
		dropPending(item.date);
		s.balance = round2(s.balance + amount);
		s.receivedThisMonth = round2(s.receivedThisMonth + amount);
		items = items.map(row => (row.id === item.id && row.kind === 'pending' ? { ...row, kind: 'received', date: today } : row));
	} else {
		dropReceived(item.date);
		s.pendingTotal = round2(s.pendingTotal + amount);
		const bucket = pendingBucket(item.date);
		if (bucket) s[bucket] = round2(s[bucket] + amount);
		items = items.map(row => (row.id === item.id && row.kind === 'received' ? { ...row, kind: 'pending' } : row));
	}
	return { ...snapshot, summary: s, items };
}

function removeGoldLocally(snapshot, holding) {
	if (!snapshot?.gold) return snapshot;
	const holdings = snapshot.gold.holdings.filter(row => row.id !== holding.id);
	const totalGrams = Math.round(holdings.reduce((sum, row) => sum + row.grams, 0) * 1000) / 1000;
	const totalValue = snapshot.gold.totalValue == null ? null : round2(holdings.reduce((sum, row) => sum + (row.value || 0), 0));
	return { ...snapshot, gold: { ...snapshot.gold, holdings, totalGrams, totalValue } };
}

const fieldClass =
	'h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1DAB61] focus:bg-white focus:ring-2 focus:ring-[#1DAB61]/15 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:bg-slate-950';
const primaryButton =
	'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1DAB61] px-5 text-sm font-bold text-white transition hover:bg-[#179c57] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

/** Bottom sheet on phones, centered card on larger screens. */
function Sheet({ open, ar, title, onClose, children }) {
	const closeLabel = ar ? 'إغلاق' : 'Close';
	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open || typeof document === 'undefined') return null;
	return createPortal(
		<div className="fixed inset-0 z-400 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
			<button type="button" aria-label={closeLabel} onClick={onClose} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />
			<div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl dark:bg-slate-900">
				<div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" aria-hidden="true" />
				<div className="mb-4 flex items-center justify-between gap-3">
					<h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
					<button
						type="button"
						onClick={onClose}
						aria-label={closeLabel}
						className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
					>
						<X size={16} />
					</button>
				</div>
				{children}
			</div>
		</div>,
		document.body,
	);
}

function BalanceSheet({ open, ar, onClose, ...props }) {
	return (
		<Sheet open={open} ar={ar} title={ar ? 'الرصيد' : 'Balance'} onClose={onClose}>
			<BalanceForm ar={ar} {...props} />
		</Sheet>
	);
}

/** Mounted only while the sheet is open, so it starts from the balance at that moment. */
function BalanceForm({ ar, money, balance, pending, onSubmit }) {
	const [mode, setMode] = useState('set');
	const [amount, setAmount] = useState(() => String(balance ?? 0));

	const value = parseAmount(amount);
	const valid = amount.trim() !== '' && Number.isFinite(value) && value >= 0 && (mode === 'set' || value > 0);
	const next = !valid ? null : mode === 'set' ? value : mode === 'add' ? round2(balance + value) : round2(balance - value);
	const modes = [
		['set', ar ? 'تعديل' : 'Set'],
		['add', ar ? 'إضافة' : 'Add'],
		['subtract', ar ? 'سحب' : 'Take out'],
	];

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ mode, amount: value });
			}}
		>
			<div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
				{modes.map(([key, label]) => (
					<button
						key={key}
						type="button"
						onClick={() => {
							setMode(key);
							setAmount(key === 'set' ? String(balance ?? 0) : '');
						}}
						className={`h-9 rounded-lg text-sm font-bold transition ${
							mode === key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500'
						}`}
					>
						{label}
					</button>
				))}
			</div>
			<input
				key={mode}
				autoFocus
				inputMode="decimal"
				value={amount}
				onChange={event => setAmount(event.target.value)}
				onFocus={event => event.currentTarget.select()}
				placeholder="0"
				className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 text-center text-3xl font-black tabular-nums text-slate-900 outline-none focus:border-[#1DAB61] focus:bg-white focus:ring-2 focus:ring-[#1DAB61]/15 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white"
			/>
			{mode !== 'set' ? (
				<p className="text-center text-sm text-slate-500 dark:text-slate-400">
					{money(balance)} <span className="mx-1 text-slate-300">→</span>
					<span className={`font-black ${next != null && next < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
						{next == null ? '—' : money(next)}
					</span>
				</p>
			) : null}
			<button type="submit" disabled={!valid || pending} className={primaryButton}>
				{pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
				{ar ? 'حفظ' : 'Save'}
			</button>
		</form>
	);
}

function EditItemSheet({ item, ar, onClose, ...props }) {
	return (
		<Sheet open={Boolean(item)} ar={ar} title={ar ? 'تعديل' : 'Edit'} onClose={onClose}>
			{item ? <EditItemForm key={`${item.kind}-${item.id}`} item={item} ar={ar} {...props} /> : null}
		</Sheet>
	);
}

function EditItemForm({ item, ar, pending, onSubmit }) {
	const [name, setName] = useState(item.name);
	const [amount, setAmount] = useState(() => String(item.amount));
	const [date, setDate] = useState(item.date);

	const value = parseAmount(amount);
	const valid = name.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
	const received = item.kind === 'received';

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ name: name.trim(), amount: value, date });
			}}
		>
			<label className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'الاسم' : 'Name'}</span>
				<input value={name} onChange={event => setName(event.target.value)} maxLength={180} className={fieldClass} />
			</label>
			<div className="grid grid-cols-2 gap-3">
				<label className="flex min-w-0 flex-col gap-1.5">
					<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'المبلغ' : 'Amount'}</span>
					<input
						inputMode="decimal"
						value={amount}
						onChange={event => setAmount(event.target.value)}
						className={`${fieldClass} font-bold tabular-nums`}
					/>
				</label>
				<label className="flex min-w-0 flex-col gap-1.5">
					<span className="text-xs font-bold text-slate-500 dark:text-slate-400">
						{received ? (ar ? 'وصلت يوم' : 'Received on') : ar ? 'متوقعة يوم' : 'Expected on'}
					</span>
					<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${fieldClass} tabular-nums`} />
				</label>
			</div>
			<button type="submit" disabled={!valid || pending} className={`${primaryButton} mt-2`}>
				{pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
				{ar ? 'حفظ' : 'Save'}
			</button>
		</form>
	);
}

function AddItemForm({ ar, pending, onSubmit }) {
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(todayYmd);
	const [received, setReceived] = useState(false);
	const value = parseAmount(amount);
	const valid = name.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

	return (
		<form
			className="flex flex-col gap-2.5"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ name: name.trim(), amount: value, date, received });
			}}
		>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_10rem]">
				<input
					value={name}
					onChange={event => setName(event.target.value)}
					maxLength={180}
					placeholder={ar ? 'الاسم' : 'Name'}
					className={`${fieldClass} col-span-2 sm:col-span-1`}
				/>
				<input
					inputMode="decimal"
					value={amount}
					onChange={event => setAmount(event.target.value)}
					placeholder={ar ? 'المبلغ' : 'Amount'}
					className={`${fieldClass} font-bold tabular-nums`}
				/>
				<input
					type="date"
					value={date}
					onChange={event => setDate(event.target.value)}
					aria-label={ar ? 'التاريخ' : 'Date'}
					className={`${fieldClass} tabular-nums`}
				/>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					aria-pressed={received}
					onClick={() => setReceived(current => !current)}
					className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition ${
						received
							? 'border-[#1DAB61] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
							: 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
					}`}
				>
					<span
						className={`grid h-5 w-5 place-items-center rounded-full border-2 transition ${
							received ? 'border-[#1DAB61] bg-[#1DAB61] text-white' : 'border-slate-300 text-transparent dark:border-slate-600'
						}`}
					>
						<Check size={12} strokeWidth={3.5} />
					</span>
					{ar ? 'وصلت' : 'Received'}
				</button>
				<button type="submit" disabled={!valid || pending} className={`${primaryButton} ms-auto`}>
					{pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
					{ar ? 'إضافة' : 'Add'}
				</button>
			</div>
		</form>
	);
}

const GOLD_KARATS = [24, 21, 18];

function parseGrams(value) {
	const n = Number(String(value ?? '').replace(/,/g, '').trim());
	return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : NaN;
}

function formatGrams(grams, ar) {
	const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
	return `${nf.format(Number(grams) || 0)} ${ar ? 'جم' : 'g'}`;
}

function KaratPicker({ ar, value, onChange }) {
	return (
		<div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label={ar ? 'العيار' : 'Karat'}>
			{GOLD_KARATS.map(karat => (
				<button
					key={karat}
					type="button"
					role="radio"
					aria-checked={value === karat}
					onClick={() => onChange(karat)}
					className={`h-9 rounded-lg text-sm font-bold tabular-nums transition ${
						value === karat ? 'bg-white text-amber-700 shadow-sm dark:bg-slate-950 dark:text-amber-300' : 'text-slate-500'
					}`}
				>
					{ar ? `عيار ${karat}` : `${karat}K`}
				</button>
			))}
		</div>
	);
}

function AddGoldForm({ ar, money, gold, pending, onSubmit }) {
	const [grams, setGrams] = useState('');
	const [karat, setKarat] = useState(21);
	const [name, setName] = useState('');
	const value = parseGrams(grams);
	const valid = Number.isFinite(value) && value > 0;
	const price = gold?.quote?.perGram?.[karat];

	if (gold && !gold.available) {
		return (
			<p className="rounded-xl bg-amber-50 px-3 py-3 text-center text-sm font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
				{ar ? 'الدهب لسه محتاج تفعيل من السيرفر' : 'Gold is not set up on the server yet'}
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-2.5"
			onSubmit={event => {
				event.preventDefault();
				if (!valid) return;
				onSubmit({ grams: value, karat, name: name.trim() || (ar ? `دهب عيار ${karat}` : `Gold ${karat}K`) });
			}}
		>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
				<input
					value={name}
					onChange={event => setName(event.target.value)}
					maxLength={120}
					placeholder={ar ? 'الاسم (اختياري)' : 'Name (optional)'}
					className={`${fieldClass} col-span-2 sm:col-span-1`}
				/>
				<input
					inputMode="decimal"
					value={grams}
					onChange={event => setGrams(event.target.value)}
					placeholder={ar ? 'الجرامات' : 'Grams'}
					className={`${fieldClass} col-span-2 font-bold tabular-nums sm:col-span-1`}
				/>
			</div>
			<KaratPicker ar={ar} value={karat} onChange={setKarat} />
			<div className="flex items-center gap-2">
				<p className="min-w-0 text-sm text-slate-500 dark:text-slate-400">
					{price ? (
						<>
							≈{' '}
							<span className="font-black tabular-nums text-amber-700 dark:text-amber-300">
								{money(valid ? Math.round(value * price * 100) / 100 : 0)}
							</span>
						</>
					) : (
						<span className="text-xs">{ar ? 'السعر مش متاح دلوقتي' : 'Price unavailable right now'}</span>
					)}
				</p>
				<button type="submit" disabled={!valid || pending} className={`${primaryButton} ms-auto`}>
					{pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
					{ar ? 'إضافة' : 'Add'}
				</button>
			</div>
		</form>
	);
}

function AddCard({ ar, money, gold, moneyPending, goldPending, onAddMoney, onAddGold, resetKey }) {
	const [type, setType] = useState('money');
	return (
		<section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60">
			<div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
				{[
					['money', ar ? 'فلوس' : 'Money', Wallet],
					['gold', ar ? 'دهب' : 'Gold', Coins],
				].map(([key, label, Icon]) => (
					<button
						key={key}
						type="button"
						onClick={() => setType(key)}
						className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition ${
							type === key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500'
						}`}
					>
						<Icon size={14} className={key === 'gold' && type === key ? 'text-amber-500' : ''} />
						{label}
					</button>
				))}
			</div>
			{type === 'money' ? (
				<AddItemForm key={`m-${resetKey}`} ar={ar} pending={moneyPending} onSubmit={onAddMoney} />
			) : (
				<AddGoldForm key={`g-${resetKey}`} ar={ar} money={money} gold={gold} pending={goldPending} onSubmit={onAddGold} />
			)}
		</section>
	);
}

function GoldEditForm({ holding, ar, pending, onSubmit }) {
	const [name, setName] = useState(holding.name);
	const [grams, setGrams] = useState(() => String(holding.grams));
	const [karat, setKarat] = useState(GOLD_KARATS.includes(holding.karat) ? holding.karat : 21);
	const value = parseGrams(grams);
	const valid = name.trim() && Number.isFinite(value) && value > 0;

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ name: name.trim(), grams: value, karat });
			}}
		>
			<label className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'الاسم' : 'Name'}</span>
				<input value={name} onChange={event => setName(event.target.value)} maxLength={120} className={fieldClass} />
			</label>
			<label className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'الجرامات' : 'Grams'}</span>
				<input
					inputMode="decimal"
					value={grams}
					onChange={event => setGrams(event.target.value)}
					className={`${fieldClass} font-bold tabular-nums`}
				/>
			</label>
			<KaratPicker ar={ar} value={karat} onChange={setKarat} />
			<button type="submit" disabled={!valid || pending} className={`${primaryButton} mt-2`}>
				{pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
				{ar ? 'حفظ' : 'Save'}
			</button>
		</form>
	);
}

function formatTime(iso, ar) {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleTimeString(ar ? 'ar-EG' : 'en-GB', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' });
}

function GoldSection({ ar, money, gold, lockedIds, onEdit, onDelete }) {
	const quote = gold?.quote;
	const holdings = gold?.holdings || [];
	if (!gold?.available || (!holdings.length && !quote)) return null;

	return (
		<section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50 to-white dark:border-amber-900/50 dark:from-amber-950/30 dark:to-slate-900/60">
			<div className="flex items-start justify-between gap-3 p-4 pb-3">
				<div className="min-w-0">
					<p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
						<Coins size={14} />
						{ar ? 'الدهب' : 'Gold'}
						{holdings.length ? <span className="font-semibold text-amber-600/70">· {formatGrams(gold.totalGrams, ar)}</span> : null}
					</p>
					<p className="mt-1 truncate text-2xl font-black tabular-nums text-slate-900 dark:text-white">
						{gold.totalValue != null ? money(gold.totalValue) : '—'}
					</p>
				</div>
				{quote ? (
					<p className={`shrink-0 text-end text-[10.5px] ${quote.stale ? 'text-rose-500' : 'text-slate-400'}`}>
						{quote.stale ? (ar ? 'آخر سعر متاح' : 'Last known price') : ar ? 'سعر النهارده' : "Today's price"}
						<br />
						<span className="tabular-nums">{formatTime(quote.updatedAt, ar)}</span>
					</p>
				) : null}
			</div>
			{quote ? (
				<div className="grid grid-cols-3 gap-px border-y border-amber-200/70 bg-amber-200/70 dark:border-amber-900/50 dark:bg-amber-900/40">
					{GOLD_KARATS.map(karat => (
						<div key={karat} className="bg-white/80 px-2 py-2 text-center dark:bg-slate-900/80">
							<p className="text-[10.5px] font-bold text-slate-400">{ar ? `عيار ${karat}` : `${karat}K`}</p>
							<p className="mt-0.5 text-[13px] font-black tabular-nums text-slate-800 dark:text-slate-100">
								{money(quote.perGram[karat])}
							</p>
						</div>
					))}
				</div>
			) : (
				<p className="border-t border-amber-200/70 px-4 py-2 text-xs text-rose-500 dark:border-amber-900/50">
					{ar ? 'سعر الدهب مش متاح دلوقتي' : 'Gold price is unavailable right now'}
				</p>
			)}
			{holdings.length ? (
				<div className="flex flex-col divide-y divide-amber-100 dark:divide-amber-900/30">
					{holdings.map(holding => (
						<div
							key={holding.id}
							className={`flex items-center gap-3 px-4 py-2.5 ${lockedIds.has(holding.id) ? 'pointer-events-none opacity-60' : ''}`}
						>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-bold text-slate-900 dark:text-white">{holding.name}</p>
								<p className="text-[11px] tabular-nums text-slate-400">
									{formatGrams(holding.grams, ar)} · {ar ? `عيار ${holding.karat}` : `${holding.karat}K`}
								</p>
							</div>
							<span className="shrink-0 text-sm font-black tabular-nums text-amber-700 dark:text-amber-300">
								{holding.value != null ? money(holding.value) : '—'}
							</span>
							<div className="flex shrink-0 items-center">
								<button
									type="button"
									onClick={() => onEdit(holding)}
									aria-label={ar ? 'تعديل' : 'Edit'}
									className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-amber-100/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
								>
									<Pencil size={14} />
								</button>
								<DeleteButton ar={ar} onConfirm={() => onDelete(holding)} />
							</div>
						</div>
					))}
				</div>
			) : null}
		</section>
	);
}

function DeleteButton({ ar, onConfirm }) {
	const [armed, setArmed] = useState(false);
	const timer = useRef(0);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	return (
		<button
			type="button"
			onClick={() => {
				window.clearTimeout(timer.current);
				if (armed) {
					setArmed(false);
					onConfirm();
					return;
				}
				setArmed(true);
				timer.current = window.setTimeout(() => setArmed(false), CONFIRM_DELETE_MS);
			}}
			onBlur={() => setArmed(false)}
			aria-label={armed ? (ar ? 'تأكيد الحذف' : 'Confirm delete') : ar ? 'حذف' : 'Delete'}
			title={armed ? (ar ? 'اضغط تاني للحذف' : 'Tap again to delete') : ar ? 'حذف' : 'Delete'}
			className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
				armed
					? 'bg-rose-600 px-2.5 text-white shadow-sm'
					: 'w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30'
			}`}
		>
			<Trash2 size={14} />
			{armed ? <span>{ar ? 'تأكيد' : 'Sure?'}</span> : null}
		</button>
	);
}

function ItemRow({ item, ar, money, today, locked, onToggle, onEdit, onDelete }) {
	const received = item.kind === 'received';
	const overdue = !received && item.date < today;

	return (
		<div
			className={`flex items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 transition dark:bg-slate-900/60 ${
				received ? 'border-emerald-200/70 dark:border-emerald-900/50' : 'border-slate-200 dark:border-slate-800'
			} ${locked ? 'pointer-events-none opacity-70' : ''}`}
		>
			<button
				type="button"
				role="checkbox"
				aria-checked={received}
				onClick={onToggle}
				title={received ? (ar ? 'لسه ماوصلتش' : 'Mark as not received') : ar ? 'وصلت' : 'Mark as received'}
				className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${
					received
						? 'border-[#1DAB61] bg-[#1DAB61] text-white'
						: 'border-slate-300 text-transparent hover:border-[#1DAB61] hover:text-[#1DAB61]/40 dark:border-slate-600'
				}`}
			>
				<Check size={15} strokeWidth={3} />
			</button>
			<div className="min-w-0 flex-1">
				<p className={`truncate text-sm font-bold ${received ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
					{item.name}
				</p>
				<p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
					<span className="tabular-nums">{formatDay(item.date, ar)}</span>
					{overdue ? (
						<span className="rounded-full bg-rose-50 px-1.5 py-px font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
							{ar ? 'متأخرة' : 'Overdue'}
						</span>
					) : null}
				</p>
			</div>
			<span className={`shrink-0 text-sm font-black tabular-nums ${received ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
				{money(item.amount)}
			</span>
			<div className="flex shrink-0 items-center">
				<button
					type="button"
					onClick={onEdit}
					aria-label={ar ? 'تعديل' : 'Edit'}
					className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
				>
					<Pencil size={14} />
				</button>
				<DeleteButton ar={ar} onConfirm={onDelete} />
			</div>
		</div>
	);
}

function SummaryCard({ icon: Icon, label, value, hint, tone }) {
	const tones = {
		green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
		amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
		sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
	};
	return (
		<div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60">
			<div className="flex items-center gap-2">
				<span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg sm:h-8 sm:w-8 ${tones[tone]}`}>
					<Icon size={15} />
				</span>
				<p className="min-w-0 text-[11px] font-bold leading-tight text-slate-500 sm:text-xs dark:text-slate-400">{label}</p>
			</div>
			<p className="mt-2 wrap-break-word text-[15px] font-black leading-tight tabular-nums text-slate-900 sm:text-lg dark:text-white">{value}</p>
			{hint ? <p className="mt-0.5 truncate text-[10.5px] text-slate-400">{hint}</p> : null}
		</div>
	);
}

/** Personal money tracker: balance in hand, money received, and money still expected. */
export default function WhatsAppWalletTab({ locale = 'en' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const money = useMoneyFormat(ar);
	const queryClient = useQueryClient();
	const [balanceOpen, setBalanceOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	const [editingGold, setEditingGold] = useState(null);
	const [filter, setFilter] = useState('all');
	const [lockedIds, setLockedIds] = useState(() => new Set());
	const [addFormKey, setAddFormKey] = useState(0);
	const today = todayYmd();

	const trackerQuery = useQuery({
		queryKey: TRACKER_KEY,
		queryFn: () => api.get('/money/tracker').then(res => res.data),
	});
	const applySnapshot = res => queryClient.setQueryData(TRACKER_KEY, res.data);

	const balanceMutation = useMutation({
		mutationFn: payload => api.patch('/money/tracker/balance', payload),
		onSuccess: res => {
			applySnapshot(res);
			setBalanceOpen(false);
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر تعديل الرصيد' : 'Could not update balance')),
	});

	const createMutation = useMutation({
		mutationFn: payload => api.post('/money/tracker/items', payload),
		onSuccess: res => {
			applySnapshot(res);
			setAddFormKey(key => key + 1);
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر الإضافة' : 'Could not add item')),
	});

	const editMutation = useMutation({
		mutationFn: ({ item, payload }) => api.patch(`/money/tracker/items/${item.kind}/${item.id}`, payload),
		onSuccess: res => {
			applySnapshot(res);
			setEditing(null);
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر الحفظ' : 'Could not save')),
	});

	const createGoldMutation = useMutation({
		mutationFn: payload => api.post('/money/tracker/gold', payload),
		onSuccess: res => {
			applySnapshot(res);
			setAddFormKey(key => key + 1);
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر إضافة الدهب' : 'Could not add gold')),
	});

	const editGoldMutation = useMutation({
		mutationFn: ({ id, payload }) => api.patch(`/money/tracker/gold/${id}`, payload),
		onSuccess: res => {
			applySnapshot(res);
			setEditingGold(null);
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر الحفظ' : 'Could not save')),
	});

	const setLocked = (id, on) =>
		setLockedIds(current => {
			const next = new Set(current);
			if (on) next.add(id);
			else next.delete(id);
			return next;
		});

	/** Update the screen first, sync in the background, and put things back if the server refuses. */
	const runOptimistic = async (id, updateLocally, request) => {
		await queryClient.cancelQueries({ queryKey: TRACKER_KEY });
		const previous = queryClient.getQueryData(TRACKER_KEY);
		queryClient.setQueryData(TRACKER_KEY, updateLocally(previous));
		setLocked(id, true);
		try {
			applySnapshot(await request());
		} catch (error) {
			queryClient.setQueryData(TRACKER_KEY, previous);
			void queryClient.invalidateQueries({ queryKey: TRACKER_KEY });
			toast.error(apiError(error, ar ? 'ماتمش، رجعناها زي ما كانت' : 'Failed — restored'));
		} finally {
			setLocked(id, false);
		}
	};

	const deleteGold = holding =>
		runOptimistic(holding.id, snapshot => removeGoldLocally(snapshot, holding), () => api.delete(`/money/tracker/gold/${holding.id}`));

	const data = trackerQuery.data;
	const summary = data?.summary;
	const gold = data?.gold;
	const goldValueNow = Number(gold?.totalValue) || 0;
	const allItems = data?.items;
	const items = useMemo(() => {
		const all = allItems || [];
		const pending = all.filter(item => item.kind === 'pending');
		const received = all.filter(item => item.kind === 'received');
		if (filter === 'pending') return pending;
		if (filter === 'received') return received;
		return [...pending, ...received];
	}, [allItems, filter]);
	const counts = useMemo(() => {
		const all = allItems || [];
		const pending = all.filter(item => item.kind === 'pending').length;
		return { all: all.length, pending, received: all.length - pending };
	}, [allItems]);

	return (
		<div className="wa-dk mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 pb-6 sm:gap-5 sm:p-4 md:p-6" dir={ar ? 'rtl' : 'ltr'}>
			<header className="hidden items-center gap-3 min-[769px]:flex">
				<span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1DAB61] text-white">
					<Wallet size={19} />
				</span>
				<h2 className="text-lg font-black text-slate-900 dark:text-white">{ar ? 'محفظتي' : 'My wallet'}</h2>
			</header>

			{trackerQuery.isLoading ? (
				<div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
					<Loader2 size={16} className="animate-spin" />
					{ar ? 'جاري التحميل…' : 'Loading…'}
				</div>
			) : trackerQuery.isError ? (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
					<span>{apiError(trackerQuery.error, ar ? 'تعذر تحميل المحفظة' : 'Could not load your wallet')}</span>
					<button type="button" onClick={() => trackerQuery.refetch()} className="font-bold underline">
						{ar ? 'إعادة المحاولة' : 'Retry'}
					</button>
				</div>
			) : (
				<>
					<section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1DAB61] to-[#0f7a43] px-5 py-6 text-white shadow-[0_18px_36px_-22px_rgba(18,138,76,0.95)]">
						<Wallet size={120} strokeWidth={1.2} className="pointer-events-none absolute -bottom-6 -end-4 text-white/10" aria-hidden="true" />
						<button
							type="button"
							onClick={() => setBalanceOpen(true)}
							aria-label={ar ? 'تعديل الرصيد' : 'Edit balance'}
							title={ar ? 'تعديل الرصيد' : 'Edit balance'}
							className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/30 active:scale-95"
						>
							<Pencil size={15} />
						</button>
						<p className="text-sm font-semibold text-white/80">{ar ? 'معايا دلوقتي' : 'Balance'}</p>
						<button
							type="button"
							onClick={() => setBalanceOpen(true)}
							className="mt-1 block max-w-full truncate text-start text-4xl font-black tabular-nums tracking-tight"
						>
							{money(summary?.balance)}
						</button>
						{summary?.pendingTotal > 0 || goldValueNow > 0 ? (
							<div className="mt-3 flex flex-wrap gap-1.5">
								{goldValueNow > 0 ? (
									<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white/90">
										<Coins size={12} />
										{ar ? `مع الدهب ${money((summary?.balance || 0) + goldValueNow)}` : `With gold ${money((summary?.balance || 0) + goldValueNow)}`}
									</span>
								) : null}
								{summary?.pendingTotal > 0 ? (
									<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white/90">
										<Hourglass size={12} />
										{ar ? `${money(summary.pendingTotal)} في الطريق` : `${money(summary.pendingTotal)} on the way`}
									</span>
								) : null}
							</div>
						) : null}
					</section>

					<section className="grid grid-cols-3 gap-2 sm:gap-3">
						<SummaryCard
							icon={TrendingUp}
							tone="green"
							label={ar ? 'جالي الشهر ده' : 'Received'}
							value={money(summary?.receivedThisMonth)}
							hint={formatMonth(summary?.month, ar)}
						/>
						<SummaryCard
							icon={Hourglass}
							tone="amber"
							label={ar ? 'فاضل الشهر ده' : 'Due this month'}
							value={money(summary?.pendingThisMonth)}
							hint={formatMonth(summary?.month, ar)}
						/>
						<SummaryCard
							icon={CalendarClock}
							tone="sky"
							label={ar ? 'الشهر الجاي' : 'Next month'}
							value={money(summary?.pendingNextMonth)}
							hint={formatMonth(summary?.nextMonth, ar)}
						/>
					</section>

					<GoldSection ar={ar} money={money} gold={gold} lockedIds={lockedIds} onEdit={setEditingGold} onDelete={deleteGold} />

					<AddCard
						ar={ar}
						money={money}
						gold={gold}
						resetKey={addFormKey}
						moneyPending={createMutation.isPending}
						goldPending={createGoldMutation.isPending}
						onAddMoney={payload => createMutation.mutate(payload)}
						onAddGold={payload => createGoldMutation.mutate(payload)}
					/>

					<section className="flex flex-col gap-2">
						<div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 sm:self-start dark:bg-slate-800">
							{[
								['all', ar ? 'الكل' : 'All', counts.all],
								['pending', ar ? 'لسه' : 'Waiting', counts.pending],
								['received', ar ? 'وصلت' : 'Received', counts.received],
							].map(([key, label, count]) => (
								<button
									key={key}
									type="button"
									onClick={() => setFilter(key)}
									className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
										filter === key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500'
									}`}
								>
									{label} <span className="tabular-nums opacity-60">{count}</span>
								</button>
							))}
						</div>
						{!items.length ? (
							<div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
								{ar ? 'مفيش حاجة هنا' : 'Nothing here'}
							</div>
						) : (
							items.map(item => (
								<ItemRow
									key={`${item.kind}-${item.id}`}
									item={item}
									ar={ar}
									money={money}
									today={today}
									locked={lockedIds.has(item.id)}
									onToggle={() =>
										runOptimistic(
											item.id,
											snapshot => applyLocally(snapshot, item, 'toggle', today),
											() => api.post(`/money/tracker/items/${item.kind}/${item.id}/toggle`),
										)
									}
									onEdit={() => setEditing(item)}
									onDelete={() =>
										runOptimistic(
											item.id,
											snapshot => applyLocally(snapshot, item, 'delete', today),
											() => api.delete(`/money/tracker/items/${item.kind}/${item.id}`, { params: { revert: 1 } }),
										)
									}
								/>
							))
						)}
					</section>
				</>
			)}

			<BalanceSheet
				open={balanceOpen}
				ar={ar}
				money={money}
				balance={summary?.balance ?? 0}
				pending={balanceMutation.isPending}
				onClose={() => setBalanceOpen(false)}
				onSubmit={payload => balanceMutation.mutate(payload)}
			/>
			<EditItemSheet
				item={editing}
				ar={ar}
				pending={editMutation.isPending}
				onClose={() => setEditing(null)}
				onSubmit={payload => editMutation.mutate({ item: editing, payload })}
			/>
			<Sheet open={Boolean(editingGold)} ar={ar} title={ar ? 'تعديل الدهب' : 'Edit gold'} onClose={() => setEditingGold(null)}>
				{editingGold ? (
					<GoldEditForm
						key={editingGold.id}
						holding={editingGold}
						ar={ar}
						pending={editGoldMutation.isPending}
						onSubmit={payload => editGoldMutation.mutate({ id: editingGold.id, payload })}
					/>
				) : null}
			</Sheet>
		</div>
	);
}
