'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
	CalendarClock,
	Check,
	ChevronDown,
	Coins,
	HandCoins,
	Hourglass,
	Layers,
	Loader2,
	Pencil,
	Plus,
	Receipt,
	Trash2,
	TrendingUp,
	Wallet,
	X,
} from 'lucide-react';
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

/** `$400` → USD; bare number → EGP. Keeps the `$` in the field as the currency signal. */
function parseMoneyInput(raw) {
	const text = String(raw ?? '').trim();
	const usd = /^\$/.test(text);
	const n = Number(text.replace(/^\$\s*/, '').replace(/,/g, '').trim());
	const amount = Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
	return { amount, currency: usd ? 'USD' : 'EGP' };
}

const round2 = value => Math.round(value * 100) / 100;

function useMoneyFormat(ar) {
	return useMemo(() => {
		const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
		const unit = ar ? 'ج.م' : 'EGP';
		return value => `${nf.format(Number(value) || 0)} ${unit}`;
	}, [ar]);
}

function formatUsd(value) {
	const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
	return `$${nf.format(Number(value) || 0)}`;
}

function formatFxRate(rate, ar) {
	if (!(rate > 0)) return '';
	const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
	return ar ? `سعر ${nf.format(rate)}` : `@ ${nf.format(rate)}`;
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
	const amount = Number(item.egpAmount ?? item.amount) || 0;
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
		const lockedRate = snapshot.fx?.usdToEgp ?? item.fxRate ?? null;
		items = items.map(row =>
			row.id === item.id && row.kind === 'pending'
				? {
						...row,
						kind: 'received',
						date: today,
						egpAmount: amount,
						fxRate: row.currency === 'USD' ? lockedRate : null,
					}
				: row,
		);
	} else {
		dropReceived(item.date);
		s.pendingTotal = round2(s.pendingTotal + amount);
		const bucket = pendingBucket(item.date);
		if (bucket) s[bucket] = round2(s[bucket] + amount);
		items = items.map(row =>
			row.id === item.id && row.kind === 'received'
				? {
						...row,
						kind: 'pending',
						egpAmount: amount,
						fxRate: row.currency === 'USD' ? snapshot.fx?.usdToEgp ?? row.fxRate : null,
					}
				: row,
		);
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

function removeLentLocally(snapshot, loan) {
	if (!snapshot?.lent) return snapshot;
	const loans = snapshot.lent.loans.filter(row => row.id !== loan.id);
	const total = round2(loans.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
	return { ...snapshot, lent: { ...snapshot.lent, loans, total } };
}

function removeExpenseLocally(snapshot, expense) {
	if (!snapshot?.expenses) return snapshot;
	const items = snapshot.expenses.items.filter(row => row.id !== expense.id);
	const total = round2(items.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
	const amount = Number(expense.amount) || 0;
	const month = snapshot.expenses.month;
	const spentThisMonth =
		month && String(expense.date || '').startsWith(month)
			? round2((Number(snapshot.expenses.spentThisMonth) || 0) - amount)
			: snapshot.expenses.spentThisMonth;
	const summary = snapshot.summary
		? { ...snapshot.summary, balance: round2((Number(snapshot.summary.balance) || 0) + amount) }
		: snapshot.summary;
	return { ...snapshot, summary, expenses: { ...snapshot.expenses, items, total, spentThisMonth } };
}

const fieldClass =
	'h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1DAB61] focus:ring-4 focus:ring-[#1DAB61]/12 aria-invalid:border-rose-400 aria-invalid:focus:ring-rose-500/12 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:hover:border-slate-600';
const primaryButton =
	'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1DAB61] px-5 text-sm font-bold text-white shadow-[0_6px_16px_-8px_rgba(29,171,97,0.8)] transition hover:bg-[#179c57] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none';

/** Label + control + optional hint / error, shared by every wallet form. */
function Field({ label, hint, error, className = '', children }) {
	return (
		<label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
			<span className="flex items-baseline gap-1.5 text-[11.5px] font-bold text-slate-600 dark:text-slate-300">
				{label}
				{hint ? <span className="font-semibold text-slate-400">{hint}</span> : null}
			</span>
			{children}
			{error ? <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</span> : null}
		</label>
	);
}

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
			<div
				data-wa-kb-scroll=""
				className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl dark:bg-slate-900"
			>
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

function EditItemSheet({ item, ar, money, usdToEgp, onClose, ...props }) {
	return (
		<Sheet open={Boolean(item)} ar={ar} title={ar ? 'تعديل' : 'Edit'} onClose={onClose}>
			{item ? (
				<EditItemForm key={`${item.kind}-${item.id}`} item={item} ar={ar} money={money} usdToEgp={usdToEgp} {...props} />
			) : null}
		</Sheet>
	);
}

function UsdFxBadge({ ar, money, amount, rate }) {
	if (!(amount > 0)) return null;
	if (!(rate > 0)) {
		return (
			<span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
				USD
			</span>
		);
	}
	const egp = round2(amount * rate);
	return (
		<span
			title={formatFxRate(rate, ar)}
			className="pointer-events-none absolute end-2 top-1/2 max-w-[46%] -translate-y-1/2 truncate rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
		>
			≈ {money(egp)}
		</span>
	);
}

function EditItemForm({ item, ar, money, usdToEgp, pending, onSubmit }) {
	const [name, setName] = useState(item.name);
	const [amount, setAmount] = useState(() => (item.currency === 'USD' ? `$${item.amount}` : String(item.amount)));
	const [date, setDate] = useState(item.date);
	const parsed = parseMoneyInput(amount);
	const value = parsed.amount;
	const currency = parsed.currency;
	const rate = currency === 'USD' ? (item.kind === 'received' && item.fxRate ? item.fxRate : usdToEgp) : null;
	const valid = name.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
	const received = item.kind === 'received';

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ name: name.trim(), amount: value, currency, date });
			}}
		>
			<label className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'الاسم' : 'Name'}</span>
				<input value={name} onChange={event => setName(event.target.value)} maxLength={180} className={fieldClass} />
			</label>
			<div className="grid grid-cols-2 gap-3">
				<label className="flex min-w-0 flex-col gap-1.5">
					<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'المبلغ' : 'Amount'}</span>
					<div className="relative">
						<input
							inputMode="text"
							value={amount}
							onChange={event => setAmount(event.target.value)}
							placeholder={ar ? '400 أو $400' : '400 or $400'}
							className={`${fieldClass} pe-19 font-bold tabular-nums`}
						/>
						{currency === 'USD' ? <UsdFxBadge ar={ar} money={money} amount={value} rate={rate} /> : null}
					</div>
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

function AddItemForm({ ar, money, usdToEgp, pending, onSubmit }) {
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(todayYmd);
	const [received, setReceived] = useState(false);
	const parsed = parseMoneyInput(amount);
	const value = parsed.amount;
	const currency = parsed.currency;
	const amountInvalid = amount.trim() !== '' && !(Number.isFinite(value) && value > 0);
	const valid = name.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ name: name.trim(), amount: value, currency, date, received });
			}}
		>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(9.5rem,11rem)_10rem]">
				<Field label={ar ? 'الاسم' : 'Name'} className="col-span-2 sm:col-span-1">
					<input
						value={name}
						onChange={event => setName(event.target.value)}
						maxLength={180}
						placeholder={ar ? 'مثلاً: مرتب، شغل حر…' : 'e.g. Salary, freelance…'}
						className={fieldClass}
					/>
				</Field>
				<Field
					label={ar ? 'المبلغ' : 'Amount'}
					hint={ar ? '$ للدولار' : '$ for USD'}
					error={amountInvalid ? (ar ? 'اكتب مبلغ صحيح' : 'Enter a valid amount') : null}
				>
					<div className="relative">
						<input
							inputMode="text"
							value={amount}
							onChange={event => setAmount(event.target.value)}
							aria-invalid={amountInvalid || undefined}
							placeholder={ar ? '400 أو $400' : '400 or $400'}
							className={`${fieldClass} pe-19 font-bold tabular-nums`}
						/>
						{currency === 'USD' ? <UsdFxBadge ar={ar} money={money} amount={value} rate={usdToEgp} /> : null}
					</div>
				</Field>
				<Field label={ar ? 'التاريخ' : 'Date'}>
					<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${fieldClass} tabular-nums`} />
				</Field>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					role="switch"
					aria-checked={received}
					onClick={() => setReceived(current => !current)}
					className="group inline-flex h-11 items-center gap-2.5 rounded-xl px-1 text-sm font-bold text-slate-600 dark:text-slate-300"
				>
					<span
						className={`relative h-6 w-10.5 shrink-0 rounded-full transition-colors ${received ? 'bg-[#1DAB61]' : 'bg-slate-200 dark:bg-slate-700'}`}
					>
						<span
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${received ? 'start-5' : 'start-0.5'}`}
						/>
					</span>
					{ar ? 'وصلت خلاص' : 'Already received'}
				</button>
				<button type="submit" disabled={!valid || pending} className={`${primaryButton} ms-auto w-full sm:w-auto`}>
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

const KARAT_PURITY = { 24: '99.9%', 21: '87.5%', 18: '75%' };

/** Karat choices as comparable price cards; prices come straight from the tracker's gold quote. */
function KaratPicker({ ar, value, onChange, perGram }) {
	const priceNf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }), []);
	return (
		<div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={ar ? 'العيار' : 'Karat'}>
			{GOLD_KARATS.map(karat => {
				const active = value === karat;
				const price = perGram?.[karat];
				return (
					<button
						key={karat}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(karat)}
						className={`relative flex min-w-0 flex-col items-start gap-1 rounded-2xl border p-2.5 text-start transition active:scale-[0.98] sm:p-3 ${
							active
								? 'border-amber-400 bg-amber-50/80 shadow-[0_6px_16px_-10px_rgba(217,119,6,0.7)] ring-2 ring-amber-400/20 dark:border-amber-500/70 dark:bg-amber-950/30'
								: 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/30 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-amber-900'
						}`}
					>
						<span
							className={`absolute end-2 top-2 grid h-4.5 w-4.5 place-items-center rounded-full transition ${
								active ? 'bg-amber-500 text-white' : 'border border-slate-300 text-transparent dark:border-slate-600'
							}`}
							aria-hidden="true"
						>
							<Check size={11} strokeWidth={3.5} />
						</span>
						<span
							className={`text-sm font-black tabular-nums sm:text-[15px] ${active ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'}`}
						>
							{ar ? `عيار ${karat}` : `${karat}K`}
						</span>
						<span className="text-[10.5px] font-semibold tabular-nums text-slate-400">{KARAT_PURITY[karat]}</span>
						<span className="mt-1 w-full border-t border-dashed border-slate-200 pt-1.5 dark:border-slate-700">
							{price ? (
								<>
									<span className="block truncate text-[13px] font-black tabular-nums text-slate-900 sm:text-sm dark:text-white">
										{priceNf.format(price)}
									</span>
									<span className="block text-[10px] font-semibold text-slate-400">{ar ? 'ج.م / جرام' : 'EGP / gram'}</span>
								</>
							) : (
								<span className="block text-[11px] font-semibold text-slate-400">{ar ? 'السعر مش متاح' : 'No price'}</span>
							)}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function AddGoldForm({ ar, money, gold, pending, onSubmit }) {
	const [grams, setGrams] = useState('');
	const [karat, setKarat] = useState(21);
	const [name, setName] = useState('');
	const value = parseGrams(grams);
	const gramsInvalid = grams.trim() !== '' && !(Number.isFinite(value) && value > 0);
	const valid = Number.isFinite(value) && value > 0;
	const perGram = gold?.quote?.perGram;
	const price = perGram?.[karat];
	const priceNf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }), []);
	const updatedAt = gold?.quote?.updatedAt ? new Date(gold.quote.updatedAt) : null;

	if (gold && !gold.available) {
		return (
			<p className="rounded-xl bg-amber-50 px-3 py-3 text-center text-sm font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
				{ar ? 'الدهب لسه محتاج تفعيل من السيرفر' : 'Gold is not set up on the server yet'}
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={event => {
				event.preventDefault();
				if (!valid) return;
				onSubmit({ grams: value, karat, name: name.trim() || (ar ? `دهب عيار ${karat}` : `Gold ${karat}K`) });
			}}
		>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
				<Field label={ar ? 'الاسم' : 'Name'} hint={ar ? 'اختياري' : 'Optional'}>
					<input
						value={name}
						onChange={event => setName(event.target.value)}
						maxLength={120}
						placeholder={ar ? `دهب عيار ${karat}` : `Gold ${karat}K`}
						className={fieldClass}
					/>
				</Field>
				<Field label={ar ? 'الوزن' : 'Weight'} error={gramsInvalid ? (ar ? 'اكتب وزن صحيح' : 'Enter a valid weight') : null}>
					<div className="relative">
						<input
							inputMode="decimal"
							value={grams}
							onChange={event => setGrams(event.target.value)}
							aria-invalid={gramsInvalid || undefined}
							placeholder="0"
							className={`${fieldClass} pe-12 font-bold tabular-nums`}
						/>
						<span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
							{ar ? 'جرام' : 'g'}
						</span>
					</div>
				</Field>
			</div>

			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2">
					<span className="text-[11.5px] font-bold text-slate-600 dark:text-slate-300">{ar ? 'العيار' : 'Karat'}</span>
					{updatedAt && !Number.isNaN(updatedAt.getTime()) ? (
						<span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-400">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
							{ar ? 'سعر النهارده · ' : 'Live price · '}
							{updatedAt.toLocaleTimeString(ar ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
						</span>
					) : null}
				</div>
				<KaratPicker ar={ar} value={karat} onChange={setKarat} perGram={perGram} />
			</div>

			<div className="flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50 to-orange-50/40 p-3.5 sm:flex-row sm:items-center dark:border-amber-900/50 dark:from-amber-950/30 dark:to-transparent">
				<div className="min-w-0 flex-1">
					<p className="text-[11.5px] font-bold text-amber-800/80 dark:text-amber-200/80">{ar ? 'القيمة التقديرية' : 'Estimated value'}</p>
					{price ? (
						<>
							<p className="truncate text-xl font-black tabular-nums text-amber-700 dark:text-amber-300">
								{money(valid ? round2(value * price) : 0)}
							</p>
							<p className="text-[11px] font-semibold tabular-nums text-amber-800/60 dark:text-amber-200/60">
								{formatGrams(valid ? value : 0, ar)} × {priceNf.format(price)} {ar ? 'ج.م' : 'EGP'}
							</p>
						</>
					) : (
						<p className="text-xs font-semibold text-slate-500">{ar ? 'السعر مش متاح دلوقتي' : 'Price unavailable right now'}</p>
					)}
				</div>
				<button type="submit" disabled={!valid || pending} className={`${primaryButton} w-full sm:w-auto`}>
					{pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
					{ar ? 'إضافة الدهب' : 'Add gold'}
				</button>
			</div>
		</form>
	);
}

function AddLentForm({ ar, pending, onSubmit, available }) {
	const [person, setPerson] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(todayYmd);
	const value = parseAmount(amount);
	const amountInvalid = amount.trim() !== '' && !(Number.isFinite(value) && value > 0);
	const valid = person.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

	if (available === false) {
		return (
			<p className="rounded-xl bg-sky-50 px-3 py-3 text-center text-sm font-bold text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
				{ar ? 'السلف لسه محتاج تفعيل من السيرفر' : 'Lent money is not set up on the server yet'}
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ person: person.trim(), amount: value, date });
			}}
		>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_10rem]">
				<Field label={ar ? 'مع مين؟' : 'Who has it?'} className="col-span-2 sm:col-span-1">
					<input
						value={person}
						onChange={event => setPerson(event.target.value)}
						maxLength={120}
						placeholder={ar ? 'اسم الشخص' : 'Person name'}
						className={fieldClass}
					/>
				</Field>
				<Field label={ar ? 'المبلغ' : 'Amount'} error={amountInvalid ? (ar ? 'مبلغ غير صحيح' : 'Invalid amount') : null}>
					<input
						inputMode="decimal"
						value={amount}
						onChange={event => setAmount(event.target.value)}
						aria-invalid={amountInvalid || undefined}
						placeholder="0"
						className={`${fieldClass} font-bold tabular-nums`}
					/>
				</Field>
				<Field label={ar ? 'تاريخ السلفة' : 'Lent on'}>
					<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${fieldClass} tabular-nums`} />
				</Field>
			</div>
			<button type="submit" disabled={!valid || pending} className={`${primaryButton} w-full sm:w-auto sm:self-end`}>
				{pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
				{ar ? 'إضافة السلفة' : 'Add loan'}
			</button>
		</form>
	);
}

function AddExpenseForm({ ar, pending, onSubmit, available, onRetry }) {
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(todayYmd);
	const value = parseAmount(amount);
	const amountInvalid = amount.trim() !== '' && !(Number.isFinite(value) && value > 0);
	const valid = name.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

	if (available === false) {
		return (
			<div className="flex flex-col items-center gap-2 rounded-xl bg-rose-50 px-3 py-3 text-center dark:bg-rose-950/30">
				<p className="text-sm font-bold text-rose-700 dark:text-rose-300">
					{ar ? 'المصاريف لسه محتاجة تفعيل من السيرفر' : 'Expenses are not set up on the server yet'}
				</p>
				{onRetry ? (
					<button type="button" onClick={onRetry} className="text-xs font-bold text-rose-800 underline dark:text-rose-200">
						{ar ? 'إعادة المحاولة' : 'Retry'}
					</button>
				) : null}
			</div>
		);
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ name: name.trim(), amount: value, date });
			}}
		>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_10rem]">
				<Field label={ar ? 'صرفت في إيه؟' : 'Spent on'} className="col-span-2 sm:col-span-1">
					<input
						value={name}
						onChange={event => setName(event.target.value)}
						maxLength={180}
						placeholder={ar ? 'مثلاً: أكل، مواصلات…' : 'e.g. Food, transport…'}
						className={fieldClass}
					/>
				</Field>
				<Field label={ar ? 'المبلغ' : 'Amount'} error={amountInvalid ? (ar ? 'مبلغ غير صحيح' : 'Invalid amount') : null}>
					<input
						inputMode="decimal"
						value={amount}
						onChange={event => setAmount(event.target.value)}
						aria-invalid={amountInvalid || undefined}
						placeholder="0"
						className={`${fieldClass} font-bold tabular-nums`}
					/>
				</Field>
				<Field label={ar ? 'تاريخ الصرف' : 'Date'}>
					<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${fieldClass} tabular-nums`} />
				</Field>
			</div>
			<button type="submit" disabled={!valid || pending} className={`${primaryButton} w-full sm:w-auto sm:self-end`}>
				{pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
				{ar ? 'إضافة المصروف' : 'Add expense'}
			</button>
		</form>
	);
}

const ADD_TYPES = [
	['money', Wallet, 'text-emerald-600 dark:text-emerald-400'],
	['gold', Coins, 'text-amber-600 dark:text-amber-400'],
	['lent', HandCoins, 'text-sky-600 dark:text-sky-400'],
	['expense', Receipt, 'text-rose-600 dark:text-rose-400'],
];

function AddCard({
	ar,
	money,
	usdToEgp,
	gold,
	lent,
	expenses,
	moneyPending,
	goldPending,
	lentPending,
	expensePending,
	onAddMoney,
	onAddGold,
	onAddLent,
	onAddExpense,
	onRetryExpenses,
	resetKey,
}) {
	const [type, setType] = useState('money');
	const [open, setOpen] = useState(false);
	const pick = key => {
		setType(key);
		setOpen(true);
	};
	const hints = {
		money: ar ? 'فلوس جاتلك أو مستنيها' : 'Money received or on its way',
		gold: ar ? 'الوزن والعيار وبنحسب القيمة بسعر النهارده' : 'Weight and karat, valued at today’s price',
		lent: ar ? 'فلوس سلفتها لحد' : 'Money someone owes you',
		expense: ar ? 'حاجة صرفت عليها' : 'Something you paid for',
	};
	const forms = {
		money: (
			<AddItemForm key={`m-${resetKey}`} ar={ar} money={money} usdToEgp={usdToEgp} pending={moneyPending} onSubmit={onAddMoney} />
		),
		gold: <AddGoldForm key={`g-${resetKey}`} ar={ar} money={money} gold={gold} pending={goldPending} onSubmit={onAddGold} />,
		lent: <AddLentForm key={`l-${resetKey}`} ar={ar} available={lent?.available} pending={lentPending} onSubmit={onAddLent} />,
		expense: (
			<AddExpenseForm
				key={`e-${resetKey}`}
				ar={ar}
				available={expenses?.available}
				pending={expensePending}
				onSubmit={onAddExpense}
				onRetry={onRetryExpenses}
			/>
		),
	};

	return (
		<section data-wa-kb-scroll="" className={`${surfaceCard} p-3.5 sm:p-5`}>
			<div className="flex items-center gap-3">
				<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1DAB61]/10 text-[#1DAB61]">
					<Plus size={18} strokeWidth={2.5} />
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="text-[15px] font-black text-slate-900 dark:text-white">{ar ? 'إضافة حركة' : 'New entry'}</h3>
					<p className="truncate text-xs text-slate-500 dark:text-slate-400">{hints[type]}</p>
				</div>
				<button
					type="button"
					onClick={() => setOpen(current => !current)}
					aria-expanded={open}
					aria-label={open ? (ar ? 'قفل الإضافة' : 'Collapse') : ar ? 'فتح الإضافة' : 'Expand'}
					className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
				>
					<ChevronDown size={18} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
				</button>
			</div>

			<div
				role="tablist"
				aria-label={ar ? 'نوع الحركة' : 'Entry type'}
				className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100/90 p-1 dark:bg-slate-800/80"
			>
				{ADD_TYPES.map(([key, Icon, tone]) => {
					const active = type === key;
					return (
						<button
							key={key}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => pick(key)}
							className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[11.5px] font-bold transition-colors sm:h-11 sm:flex-row sm:gap-2 sm:text-[13px] ${
								active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
							}`}
						>
							{active ? (
								<motion.span
									layoutId="wallet-add-tab"
									transition={{ type: 'spring', stiffness: 520, damping: 38 }}
									className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.1),0_4px_12px_-6px_rgba(15,23,42,0.18)] dark:bg-slate-950"
								/>
							) : null}
							<Icon size={17} className={`relative ${active ? tone : ''}`} />
							<span className="relative max-w-full truncate px-1">{ledgerTypeLabel(key, ar)}</span>
						</button>
					);
				})}
			</div>

			<AnimatePresence initial={false} mode="wait">
				{open ? (
					<motion.div
						key={type}
						role="tabpanel"
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.16, ease: 'easeOut' }}
						className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"
					>
						{forms[type]}
					</motion.div>
				) : null}
			</AnimatePresence>
		</section>
	);
}

function LentEditForm({ loan, ar, pending, onSubmit }) {
	const [person, setPerson] = useState(loan.person);
	const [amount, setAmount] = useState(() => String(loan.amount));
	const [date, setDate] = useState(loan.date);
	const value = parseAmount(amount);
	const valid = person.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ person: person.trim(), amount: value, date });
			}}
		>
			<label className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'الشخص' : 'Person'}</span>
				<input value={person} onChange={event => setPerson(event.target.value)} maxLength={120} className={fieldClass} />
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
					<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'تاريخ السلفة' : 'Lent on'}</span>
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

function ExpenseEditForm({ expense, ar, pending, onSubmit }) {
	const [name, setName] = useState(expense.name);
	const [amount, setAmount] = useState(() => String(expense.amount));
	const [date, setDate] = useState(expense.date);
	const value = parseAmount(amount);
	const valid = name.trim() && Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={event => {
				event.preventDefault();
				if (valid) onSubmit({ name: name.trim(), amount: value, date });
			}}
		>
			<label className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'الحاجة' : 'What'}</span>
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
					<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'تاريخ الصرف' : 'Spent on'}</span>
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

function GoldEditForm({ holding, ar, pending, onSubmit, perGram }) {
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
			<KaratPicker ar={ar} value={karat} onChange={setKarat} perGram={perGram} />
			<button type="submit" disabled={!valid || pending} className={`${primaryButton} mt-2`}>
				{pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
				{ar ? 'حفظ' : 'Save'}
			</button>
		</form>
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

const LEDGER_TONES = {
	money: {
		badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
		amount: 'text-slate-900 dark:text-white',
		icon: 'text-emerald-500',
	},
	gold: {
		badge: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
		amount: 'text-amber-700 dark:text-amber-300',
		icon: 'text-amber-500',
	},
	lent: {
		badge: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
		amount: 'text-sky-700 dark:text-sky-300',
		icon: 'text-sky-500',
	},
	expense: {
		badge: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
		amount: 'text-rose-600 dark:text-rose-300',
		icon: 'text-rose-500',
	},
};

const LEDGER_ICONS = { money: Wallet, gold: Coins, lent: HandCoins, expense: Receipt };

function ledgerTypeLabel(type, ar) {
	const labels = {
		money: ar ? 'فلوس' : 'Money',
		gold: ar ? 'دهب' : 'Gold',
		lent: ar ? 'سلف' : 'Lent',
		expense: ar ? 'صرف' : 'Spend',
	};
	return labels[type];
}

/** One flat list of everything in the wallet, so a single table can show and filter it. */
function buildLedgerRows(data) {
	const rows = [];
	for (const item of data?.items || []) {
		rows.push({
			key: `m-${item.kind}-${item.id}`,
			type: 'money',
			id: item.id,
			name: item.name,
			date: item.date,
			amount: Number(item.egpAmount ?? item.amount) || 0,
			source: item,
		});
	}
	for (const holding of data?.gold?.holdings || []) {
		rows.push({ key: `g-${holding.id}`, type: 'gold', id: holding.id, name: holding.name, date: null, amount: holding.value, source: holding });
	}
	for (const loan of data?.lent?.loans || []) {
		rows.push({ key: `l-${loan.id}`, type: 'lent', id: loan.id, name: loan.person, date: loan.date, amount: loan.amount, source: loan });
	}
	for (const expense of data?.expenses?.items || []) {
		rows.push({ key: `e-${expense.id}`, type: 'expense', id: expense.id, name: expense.name, date: expense.date, amount: expense.amount, source: expense });
	}
	return rows;
}

function LedgerIcon({ type, size = 'md' }) {
	const Icon = LEDGER_ICONS[type];
	return (
		<span
			className={`grid shrink-0 place-items-center rounded-xl ${LEDGER_TONES[type].badge} ${size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'}`}
		>
			<Icon size={size === 'sm' ? 15 : 16} />
		</span>
	);
}

function LedgerMeta({ row, ar }) {
	const item = row.source;
	if (row.type === 'gold') return <span className="tabular-nums">{formatGrams(item.grams, ar)}</span>;
	if (row.type === 'money' && item.currency === 'USD' && item.fxRate) {
		return (
			<span className="rounded-full bg-sky-50 px-1.5 py-px font-bold tabular-nums text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
				{formatFxRate(item.fxRate, ar)}
			</span>
		);
	}
	return null;
}

const pillClass = 'inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold';

function LedgerStatus({ row, ar, today, locked, onToggle }) {
	if (row.type === 'money') {
		const received = row.source.kind === 'received';
		const overdue = !received && row.date < today;
		const tone = received
			? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'
			: overdue
				? 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900'
				: 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900';
		return (
			<button
				type="button"
				role="checkbox"
				aria-checked={received}
				disabled={locked}
				onClick={onToggle}
				title={received ? (ar ? 'لسه ماوصلتش' : 'Mark as not received') : ar ? 'وصلت' : 'Mark as received'}
				className={`${pillClass} ring-1 transition active:scale-95 ${tone}`}
			>
				{received ? <Check size={12} strokeWidth={3} /> : <Hourglass size={12} />}
				{received ? (ar ? 'وصلت' : 'Received') : overdue ? (ar ? 'متأخرة' : 'Overdue') : ar ? 'لسه' : 'Waiting'}
			</button>
		);
	}
	if (row.type === 'gold') {
		return <span className={`${pillClass} ${LEDGER_TONES.gold.badge}`}>{ar ? `عيار ${row.source.karat}` : `${row.source.karat}K`}</span>;
	}
	if (row.type === 'lent') {
		return <span className={`${pillClass} ${LEDGER_TONES.lent.badge}`}>{ar ? 'عند ناس' : 'Lent out'}</span>;
	}
	return <span className={`${pillClass} ${LEDGER_TONES.expense.badge}`}>{ar ? 'اتصرف' : 'Spent'}</span>;
}

function LedgerAmount({ row, money }) {
	const item = row.source;
	if (row.type === 'money') {
		const received = item.kind === 'received';
		const color = received ? 'text-emerald-600 dark:text-emerald-400' : LEDGER_TONES.money.amount;
		if (item.currency === 'USD') {
			return (
				<div className={color}>
					<p className="font-black tabular-nums">{formatUsd(item.amount)}</p>
					<p className="text-[10.5px] font-bold tabular-nums opacity-70">≈ {money(row.amount)}</p>
				</div>
			);
		}
		return <p className={`font-black tabular-nums ${color}`}>{money(item.amount)}</p>;
	}
	if (row.amount == null) return <p className="font-black text-slate-400">—</p>;
	return (
		<p className={`font-black tabular-nums ${LEDGER_TONES[row.type].amount}`}>
			{row.type === 'expense' ? '− ' : ''}
			{money(row.amount)}
		</p>
	);
}

function LedgerActions({ ar, onEdit, onDelete }) {
	return (
		<div className="flex shrink-0 items-center justify-end">
			<button
				type="button"
				onClick={onEdit}
				aria-label={ar ? 'تعديل' : 'Edit'}
				title={ar ? 'تعديل' : 'Edit'}
				className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
			>
				<Pencil size={14} />
			</button>
			<DeleteButton ar={ar} onConfirm={onDelete} />
		</div>
	);
}

/** Every entry (money, gold, lent, spend) in one filterable table; stacked rows on phones. */
function LedgerTable({
	ar,
	money,
	today,
	data,
	type,
	onTypeChange,
	moneyFilter,
	onMoneyFilterChange,
	lockedIds,
	onToggle,
	onEdit,
	onDelete,
	anchorRef,
}) {
	const allRows = useMemo(() => buildLedgerRows(data), [data]);
	const priceNf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }), []);
	const gold = data?.gold;
	const lent = data?.lent;
	const expenses = data?.expenses;

	const counts = useMemo(() => {
		const next = { all: allRows.length, money: 0, gold: 0, lent: 0, expense: 0, pending: 0, received: 0 };
		for (const row of allRows) {
			next[row.type] += 1;
			if (row.type === 'money') next[row.source.kind === 'received' ? 'received' : 'pending'] += 1;
		}
		return next;
	}, [allRows]);

	const rows = useMemo(() => {
		if (type === 'money') {
			const items = allRows.filter(row => row.type === 'money');
			const pending = items.filter(row => row.source.kind === 'pending');
			const received = items.filter(row => row.source.kind === 'received');
			if (moneyFilter === 'pending') return pending;
			if (moneyFilter === 'received') return received;
			return [...pending, ...received];
		}
		if (type !== 'all') return allRows.filter(row => row.type === type);
		// Newest first; gold has no date, so it sits at the bottom.
		return [...allRows].sort((a, b) => {
			if (!a.date && !b.date) return 0;
			if (!a.date) return 1;
			if (!b.date) return -1;
			return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
		});
	}, [allRows, type, moneyFilter]);

	const total = useMemo(() => {
		if (type === 'gold') return gold?.totalValue != null ? money(gold.totalValue) : null;
		if (type === 'lent') return money(lent?.total);
		if (type === 'expense') return money(expenses?.total);
		if (type === 'money') return money(round2(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)));
		return null;
	}, [type, rows, gold, lent, expenses, money]);

	const unavailable =
		(type === 'gold' && gold?.available === false) ||
		(type === 'lent' && lent?.available === false) ||
		(type === 'expense' && expenses?.available === false);

	const tabs = [
		['all', ar ? 'الكل' : 'All', Layers, counts.all],
		['money', ledgerTypeLabel('money', ar), Wallet, counts.money],
		['gold', ledgerTypeLabel('gold', ar), Coins, counts.gold],
		['lent', ledgerTypeLabel('lent', ar), HandCoins, counts.lent],
		['expense', ledgerTypeLabel('expense', ar), Receipt, counts.expense],
	];
	const showType = type === 'all';
	const th = 'px-3 py-2.5 text-start text-[11px] font-bold text-slate-500 first:ps-4 last:pe-4 dark:text-slate-400';
	const td = 'border-t border-slate-100 px-3 py-3 align-middle first:ps-4 last:pe-4 dark:border-slate-800';

	return (
		<section ref={anchorRef} className={`${surfaceCard} scroll-mt-3 overflow-hidden`}>
			<div className="flex flex-col gap-3 p-3 sm:p-4">
				<div className="flex items-end justify-between gap-3">
					<div className="min-w-0">
						<h3 className="text-sm font-black text-slate-900 dark:text-white">{ar ? 'كل الحركات' : 'All entries'}</h3>
						<p className="text-[11px] text-slate-400">
							{type === 'expense' && expenses?.month
								? ar
									? `الشهر ده ${money(expenses.spentThisMonth)} · ${formatMonth(expenses.month, ar)}`
									: `${money(expenses.spentThisMonth)} this month · ${formatMonth(expenses.month, ar)}`
								: type === 'gold' && gold?.holdings?.length
									? formatGrams(gold.totalGrams, ar)
									: ar
										? `${rows.length} عنصر`
										: `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
						</p>
					</div>
					{total ? (
						<p className="shrink-0 text-end">
							<span className="block text-[10.5px] font-bold text-slate-400">{ar ? 'الإجمالي' : 'Total'}</span>
							<span
								className={`text-base font-black tabular-nums sm:text-lg ${type === 'money' ? 'text-slate-900 dark:text-white' : LEDGER_TONES[type].amount}`}
							>
								{type === 'expense' ? '− ' : ''}
								{total}
							</span>
						</p>
					) : null}
				</div>

				<div
					role="tablist"
					aria-label={ar ? 'نوع الحركة' : 'Entry type'}
					className="grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
				>
					<div className="contents">
						{tabs.map(([key, label, Icon, count]) => {
							const active = type === key;
							return (
								<button
									key={key}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => onTypeChange(key)}
									className={`flex min-w-0 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] font-bold transition sm:h-9 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-0 sm:text-xs ${
										active
											? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
											: 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
									}`}
								>
									<Icon
										size={14}
										className={active && key !== 'all' ? LEDGER_TONES[key].icon : ''}
									/>
									<span className="max-w-full truncate">
										{label}
										<span className="ms-1 tabular-nums opacity-50 sm:hidden">{count}</span>
									</span>
									<span
										className={`hidden min-w-5 rounded-full px-1.5 text-[10.5px] tabular-nums sm:inline ${
											active ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'opacity-60'
										}`}
									>
										{count}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{type === 'money' && counts.money ? (
					<div className="flex flex-wrap gap-1.5">
						{[
							['all', ar ? 'الكل' : 'All', counts.money],
							['pending', ar ? 'لسه' : 'Waiting', counts.pending],
							['received', ar ? 'وصلت' : 'Received', counts.received],
						].map(([key, label, count]) => (
							<button
								key={key}
								type="button"
								onClick={() => onMoneyFilterChange(key)}
								className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
									moneyFilter === key
										? 'border-[#1DAB61] bg-[#1DAB61]/10 text-[#128c4f] dark:text-[#4ade80]'
										: 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
								}`}
							>
								{label} <span className="tabular-nums opacity-60">{count}</span>
							</button>
						))}
					</div>
				) : null}

				{(type === 'gold' || type === 'all') && gold?.quote ? (
					<div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold tabular-nums">
						<span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
							<Coins size={12} />
							{ar ? 'سعر الجرام' : 'Per gram'}
						</span>
						{GOLD_KARATS.map(karat => (
							<span
								key={karat}
								className="rounded-full bg-amber-50 px-2 py-0.5 text-slate-700 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-slate-200 dark:ring-amber-900/40"
							>
								<span className="text-amber-600/80 dark:text-amber-300/80">{karat}K</span> {priceNf.format(gold.quote.perGram[karat])}
							</span>
						))}
					</div>
				) : null}
			</div>

			{unavailable ? (
				<div className="border-t border-slate-100 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-800">
					{ar ? 'القسم ده لسه محتاج تفعيل من السيرفر' : 'This section is not set up on the server yet'}
				</div>
			) : !rows.length ? (
				<div className="flex flex-col items-center gap-2 border-t border-slate-100 px-4 py-12 text-center dark:border-slate-800">
					<span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
						{type === 'all' ? <Layers size={20} /> : (() => { const Icon = LEDGER_ICONS[type]; return <Icon size={20} />; })()}
					</span>
					<p className="text-sm font-bold text-slate-500 dark:text-slate-400">{ar ? 'مفيش حاجة هنا لسه' : 'Nothing here yet'}</p>
					<p className="text-xs text-slate-400">{ar ? 'ضيف من فوق وهتظهر هنا' : 'Add one above and it shows up here'}</p>
				</div>
			) : (
				<>
					<table className="hidden w-full border-separate border-spacing-0 text-sm sm:table">
						<thead className="bg-slate-50/80 dark:bg-slate-800/40">
							<tr>
								<th className={th}>{ar ? 'البند' : 'Item'}</th>
								{showType ? <th className={th}>{ar ? 'النوع' : 'Type'}</th> : null}
								<th className={th}>{ar ? 'التاريخ' : 'Date'}</th>
								<th className={th}>{ar ? 'الحالة' : 'Status'}</th>
								<th className={`${th} text-end`}>{ar ? 'المبلغ' : 'Amount'}</th>
								<th className={th}>
									<span className="sr-only">{ar ? 'إجراءات' : 'Actions'}</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(row => {
								const locked = lockedIds.has(row.id);
								return (
									<tr
										key={row.key}
										className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${locked ? 'pointer-events-none opacity-60' : ''}`}
									>
										<td className={td}>
											<div className="flex min-w-0 items-center gap-3">
												<LedgerIcon type={row.type} />
												<div className="min-w-0">
													<p
														className={`max-w-[16rem] truncate font-bold ${
															row.type === 'money' && row.source.kind === 'received'
																? 'text-slate-500 dark:text-slate-400'
																: 'text-slate-900 dark:text-white'
														}`}
													>
														{row.name}
													</p>
													<p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 empty:hidden">
														<LedgerMeta row={row} ar={ar} />
													</p>
												</div>
											</div>
										</td>
										{showType ? (
											<td className={`${td} whitespace-nowrap text-xs font-bold text-slate-500 dark:text-slate-400`}>
												{ledgerTypeLabel(row.type, ar)}
											</td>
										) : null}
										<td className={`${td} whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400`}>
											{row.date ? formatDay(row.date, ar) : '—'}
										</td>
										<td className={td}>
											<LedgerStatus row={row} ar={ar} today={today} locked={locked} onToggle={() => onToggle(row.source)} />
										</td>
										<td className={`${td} whitespace-nowrap text-end`}>
											<LedgerAmount row={row} money={money} />
										</td>
										<td className={`${td} w-px`}>
											<LedgerActions ar={ar} onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>

					<ul className="divide-y divide-slate-100 border-t border-slate-100 sm:hidden dark:divide-slate-800 dark:border-slate-800">
						{rows.map(row => {
							const locked = lockedIds.has(row.id);
							return (
								<li key={row.key} className={`flex items-start gap-3 px-3 py-3 ${locked ? 'pointer-events-none opacity-60' : ''}`}>
									<LedgerIcon type={row.type} size="sm" />
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-3">
											<p
												className={`min-w-0 truncate pt-1 text-sm font-bold ${
													row.type === 'money' && row.source.kind === 'received'
														? 'text-slate-500 dark:text-slate-400'
														: 'text-slate-900 dark:text-white'
												}`}
											>
												{row.name}
											</p>
											<div className="shrink-0 pt-1 text-end text-sm">
												<LedgerAmount row={row} money={money} />
											</div>
										</div>
										<div className="mt-1.5 flex items-center justify-between gap-2">
											<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
												<LedgerStatus row={row} ar={ar} today={today} locked={locked} onToggle={() => onToggle(row.source)} />
												{row.date ? <span className="tabular-nums">{formatDay(row.date, ar)}</span> : null}
												<LedgerMeta row={row} ar={ar} />
											</div>
											<LedgerActions ar={ar} onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				</>
			)}
		</section>
	);
}

/** Number with a smaller currency unit, so the figure itself carries the weight. */
function MoneyFigure({ value, ar, className = '', unitClassName = '' }) {
	const nf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }), []);
	return (
		<span className={`tabular-nums ${className}`}>
			{nf.format(Number(value) || 0)}
			<span className={`ms-1 font-bold ${unitClassName}`}>{ar ? 'ج.م' : 'EGP'}</span>
		</span>
	);
}

const surfaceCard =
	'rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900/60';

const STAT_TONES = {
	green: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50',
	amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50',
	sky: 'bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/50',
};

/** One stat inside the stats strip: a row on phones, a column from `sm` up. */
function SummaryCard({ icon: Icon, label, value, hint, tone, ar }) {
	return (
		<div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:flex-col sm:items-stretch sm:gap-3 sm:p-5">
			<div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
				<span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${STAT_TONES[tone]}`}>
					<Icon size={18} />
				</span>
				<div className="min-w-0">
					<p className="truncate text-[13px] font-bold text-slate-600 dark:text-slate-300">{label}</p>
					{hint ? <p className="truncate text-[11px] text-slate-400 sm:hidden">{hint}</p> : null}
				</div>
			</div>
			<div className="shrink-0 text-end sm:mt-auto sm:text-start">
				<MoneyFigure
					value={value}
					ar={ar}
					className="block text-[17px] font-black leading-tight text-slate-900 sm:text-[22px] dark:text-white"
					unitClassName="text-[11px] text-slate-400 sm:text-xs"
				/>
				{hint ? <p className="mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block">{hint}</p> : null}
			</div>
		</div>
	);
}

/** The headline card: balance first, then what sits around it. Tiles jump to their rows in the table. */
function BalanceHero({ ar, summary, goldValueNow, lentTotal, spentThisMonth, onEditBalance, onJump }) {
	const balance = Number(summary?.balance) || 0;
	const tiles = [
		{ key: 'gold', icon: Coins, label: ar ? 'قيمة الدهب' : 'Gold value', value: goldValueNow },
		{ key: 'lent', icon: HandCoins, label: ar ? 'عند ناس' : 'Lent out', value: lentTotal },
		{ key: 'expense', icon: Receipt, label: ar ? 'مصروف الشهر' : 'Spent this month', value: spentThisMonth },
		{ key: 'pending', icon: Hourglass, label: ar ? 'في الطريق' : 'On the way', value: Number(summary?.pendingTotal) || 0 },
	];

	return (
		<section className="relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(140deg,#0b3a29_0%,#0e5a39_48%,#16894f_100%)] p-5 text-white shadow-[0_22px_44px_-24px_rgba(11,58,41,0.9)] ring-1 ring-inset ring-white/10 sm:p-6">
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -end-16 -top-24 -z-10 h-64 w-64 rounded-full bg-[#2fe08a]/25 blur-3xl"
			/>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -bottom-28 -start-10 -z-10 h-56 w-56 rounded-full bg-[#0b2a1e]/60 blur-3xl"
			/>

			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<span className="grid h-9 w-9 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15">
						<Wallet size={17} />
					</span>
					<div>
						<p className="text-[13px] font-bold text-white/90">{ar ? 'الرصيد المتاح' : 'Available balance'}</p>
						<p className="text-[11px] text-white/55">{ar ? 'الفلوس اللي معاك دلوقتي' : 'Cash in hand right now'}</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onEditBalance}
					className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/12 px-3.5 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 active:scale-95"
				>
					<Pencil size={13} />
					{ar ? 'تعديل' : 'Edit'}
				</button>
			</div>

			<button
				type="button"
				onClick={onEditBalance}
				aria-label={ar ? 'تعديل الرصيد' : 'Edit balance'}
				className="mt-5 block max-w-full text-start"
			>
				<MoneyFigure
					value={balance}
					ar={ar}
					className="block truncate text-[40px] font-black leading-none tracking-tight sm:text-5xl"
					unitClassName="text-lg text-white/60 sm:text-xl"
				/>
			</button>
			{goldValueNow > 0 ? (
				<p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-1 text-[11.5px] font-semibold text-white/80">
					<TrendingUp size={12} />
					{ar ? 'الإجمالي مع الدهب' : 'Net worth with gold'}
					<MoneyFigure value={balance + goldValueNow} ar={ar} className="font-black text-white" unitClassName="text-[10px] text-white/60" />
				</p>
			) : null}

			<div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
				{tiles.map(tile => (
					<button
						key={tile.key}
						type="button"
						onClick={() => onJump(tile.key)}
						className="group flex min-w-0 flex-col gap-2 rounded-2xl bg-white/[0.07] p-3 text-start ring-1 ring-white/10 transition hover:bg-white/[0.12] active:scale-[0.98]"
					>
						<span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/65">
							<span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/12">
								<tile.icon size={13} />
							</span>
							<span className="truncate">{tile.label}</span>
						</span>
						<MoneyFigure
							value={tile.value}
							ar={ar}
							className={`block truncate text-[15px] font-black leading-tight ${tile.value > 0 ? 'text-white' : 'text-white/45'}`}
							unitClassName="text-[10px] text-white/55"
						/>
					</button>
				))}
			</div>
		</section>
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
	const [editingLent, setEditingLent] = useState(null);
	const [editingExpense, setEditingExpense] = useState(null);
	const [filter, setFilter] = useState('all');
	const [ledgerType, setLedgerType] = useState('all');
	const ledgerRef = useRef(null);
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
			setLedgerType(current => (current === 'all' || current === 'money' ? current : 'money'));
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
			setLedgerType(current => (current === 'all' || current === 'gold' ? current : 'gold'));
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

	const createLentMutation = useMutation({
		mutationFn: payload => api.post('/money/tracker/lent', payload),
		onSuccess: res => {
			applySnapshot(res);
			setAddFormKey(key => key + 1);
			setLedgerType(current => (current === 'all' || current === 'lent' ? current : 'lent'));
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر إضافة السلفة' : 'Could not add lent money')),
	});

	const editLentMutation = useMutation({
		mutationFn: ({ id, payload }) => api.patch(`/money/tracker/lent/${id}`, payload),
		onSuccess: res => {
			applySnapshot(res);
			setEditingLent(null);
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر الحفظ' : 'Could not save')),
	});

	const createExpenseMutation = useMutation({
		mutationFn: payload => api.post('/money/tracker/expenses', payload),
		onSuccess: res => {
			applySnapshot(res);
			setAddFormKey(key => key + 1);
			setLedgerType(current => (current === 'all' || current === 'expense' ? current : 'expense'));
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر إضافة المصروف' : 'Could not add expense')),
	});

	const editExpenseMutation = useMutation({
		mutationFn: ({ id, payload }) => api.patch(`/money/tracker/expenses/${id}`, payload),
		onSuccess: res => {
			applySnapshot(res);
			setEditingExpense(null);
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

	const deleteLent = loan =>
		runOptimistic(loan.id, snapshot => removeLentLocally(snapshot, loan), () => api.delete(`/money/tracker/lent/${loan.id}`));

	const deleteExpense = expense =>
		runOptimistic(
			expense.id,
			snapshot => removeExpenseLocally(snapshot, expense),
			() => api.delete(`/money/tracker/expenses/${expense.id}`),
		);

	const data = trackerQuery.data;
	const summary = data?.summary;
	const usdToEgp = data?.fx?.usdToEgp ?? null;
	const gold = data?.gold;
	const lent = data?.lent;
	const expenses = data?.expenses;
	const goldValueNow = Number(gold?.totalValue) || 0;
	const lentTotal = Number(lent?.total) || 0;
	const spentThisMonth = Number(expenses?.spentThisMonth) || 0;
	const jumpToLedger = key => {
		if (key === 'pending') {
			setLedgerType('money');
			setFilter('pending');
		} else {
			setLedgerType(key);
		}
		window.setTimeout(() => ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
	};
	const toggleItem = item =>
		runOptimistic(
			item.id,
			snapshot => applyLocally(snapshot, item, 'toggle', today),
			() => api.post(`/money/tracker/items/${item.kind}/${item.id}/toggle`),
		);
	const editRow = row => {
		if (row.type === 'gold') setEditingGold(row.source);
		else if (row.type === 'lent') setEditingLent(row.source);
		else if (row.type === 'expense') setEditingExpense(row.source);
		else setEditing(row.source);
	};
	const deleteRow = row => {
		if (row.type === 'gold') return deleteGold(row.source);
		if (row.type === 'lent') return deleteLent(row.source);
		if (row.type === 'expense') return deleteExpense(row.source);
		const item = row.source;
		return runOptimistic(
			item.id,
			snapshot => applyLocally(snapshot, item, 'delete', today),
			() => api.delete(`/money/tracker/items/${item.kind}/${item.id}`, { params: { revert: 1 } }),
		);
	};

	return (
		<div className="wa-dk mx-auto flex w-full max-w-4xl flex-col gap-4 p-3 pb-6 sm:gap-5 sm:p-4 md:p-6" dir={ar ? 'rtl' : 'ltr'}>
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
					<BalanceHero
						ar={ar}
						summary={summary}
						goldValueNow={goldValueNow}
						lentTotal={lentTotal}
						spentThisMonth={spentThisMonth}
						onEditBalance={() => setBalanceOpen(true)}
						onJump={jumpToLedger}
					/>

					<section
						className={`${surfaceCard} grid grid-cols-1 divide-y divide-slate-100 overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800`}
					>
						<SummaryCard
							ar={ar}
							icon={TrendingUp}
							tone="green"
							label={ar ? 'جالي الشهر ده' : 'Received'}
							value={summary?.receivedThisMonth}
							hint={formatMonth(summary?.month, ar)}
						/>
						<SummaryCard
							ar={ar}
							icon={Hourglass}
							tone="amber"
							label={ar ? 'فاضل الشهر ده' : 'Due this month'}
							value={summary?.pendingThisMonth}
							hint={formatMonth(summary?.month, ar)}
						/>
						<SummaryCard
							ar={ar}
							icon={CalendarClock}
							tone="sky"
							label={ar ? 'الشهر الجاي' : 'Next month'}
							value={summary?.pendingNextMonth}
							hint={formatMonth(summary?.nextMonth, ar)}
						/>
					</section>

					<AddCard
						ar={ar}
						money={money}
						usdToEgp={usdToEgp}
						gold={gold}
						lent={lent}
						expenses={expenses}
						resetKey={addFormKey}
						moneyPending={createMutation.isPending}
						goldPending={createGoldMutation.isPending}
						lentPending={createLentMutation.isPending}
						expensePending={createExpenseMutation.isPending}
						onAddMoney={payload => createMutation.mutate(payload)}
						onAddGold={payload => createGoldMutation.mutate(payload)}
						onAddLent={payload => createLentMutation.mutate(payload)}
						onAddExpense={payload => createExpenseMutation.mutate(payload)}
						onRetryExpenses={() => void queryClient.invalidateQueries({ queryKey: TRACKER_KEY })}
					/>

					<LedgerTable
						ar={ar}
						money={money}
						today={today}
						data={data}
						type={ledgerType}
						onTypeChange={setLedgerType}
						moneyFilter={filter}
						onMoneyFilterChange={setFilter}
						lockedIds={lockedIds}
						onToggle={toggleItem}
						onEdit={editRow}
						onDelete={deleteRow}
						anchorRef={ledgerRef}
					/>
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
				money={money}
				usdToEgp={usdToEgp}
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
						perGram={gold?.quote?.perGram}
						onSubmit={payload => editGoldMutation.mutate({ id: editingGold.id, payload })}
					/>
				) : null}
			</Sheet>
			<Sheet open={Boolean(editingLent)} ar={ar} title={ar ? 'تعديل السلفة' : 'Edit loan'} onClose={() => setEditingLent(null)}>
				{editingLent ? (
					<LentEditForm
						key={editingLent.id}
						loan={editingLent}
						ar={ar}
						pending={editLentMutation.isPending}
						onSubmit={payload => editLentMutation.mutate({ id: editingLent.id, payload })}
					/>
				) : null}
			</Sheet>
			<Sheet open={Boolean(editingExpense)} ar={ar} title={ar ? 'تعديل المصروف' : 'Edit expense'} onClose={() => setEditingExpense(null)}>
				{editingExpense ? (
					<ExpenseEditForm
						key={editingExpense.id}
						expense={editingExpense}
						ar={ar}
						pending={editExpenseMutation.isPending}
						onSubmit={payload => editExpenseMutation.mutate({ id: editingExpense.id, payload })}
					/>
				) : null}
			</Sheet>
		</div>
	);
}
