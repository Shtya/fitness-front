'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import {
	BarChart3,
	Calculator,
	Check,
	ChevronLeft,
	Coins,
	Filter,
	HandCoins,
	Hourglass,
	Layers,
	Loader2,
	Minus,
	Pencil,
	Plus,
	Receipt,
	RotateCcw,
	Trash2,
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

/** Shift `todayYmd()` back by `days` (Cairo calendar day). */
function ymdDaysAgo(days) {
	const [y, m, d] = todayYmd().split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() - Math.max(0, Number(days) || 0));
	return dt.toISOString().slice(0, 10);
}

/** Spend totals keyed by YMD, oldest → newest. */
function dailySpendSeries(rows) {
	const map = new Map();
	for (const row of rows) {
		if (!row.date) continue;
		map.set(row.date, round2((map.get(row.date) || 0) + (Number(row.amount) || 0)));
	}
	return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
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
	'h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-base font-medium sm:h-11 sm:text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1DAB61] focus:ring-4 focus:ring-[#1DAB61]/12 aria-invalid:border-rose-400 aria-invalid:focus:ring-rose-500/12 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:hover:border-slate-600';
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

const PHONE_QUERY = '(max-width: 768px)';

function subscribePhone(callback) {
	const mq = window.matchMedia(PHONE_QUERY);
	mq.addEventListener('change', callback);
	return () => mq.removeEventListener('change', callback);
}

/** Same breakpoint as the WhatsApp mobile shell, so sheets and layout switch together. */
function useIsPhone() {
	return useSyncExternalStore(
		subscribePhone,
		() => window.matchMedia(PHONE_QUERY).matches,
		() => false,
	);
}

/**
 * Height the on-screen keyboard covers. iOS keeps position:fixed anchored to the full layout
 * height, so a bottom sheet has to lift itself by this much to keep its fields visible.
 */
function useKeyboardInset(active) {
	const [inset, setInset] = useState(0);
	useEffect(() => {
		const vv = typeof window === 'undefined' ? null : window.visualViewport;
		if (!active || !vv) return undefined;
		const update = () => {
			const next = Math.round(window.innerHeight - vv.height - vv.offsetTop);
			setInset(next > 80 ? next : 0);
		};
		update();
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
			setInset(0);
		};
	}, [active]);
	return inset;
}

/**
 * Bottom sheet on phones (slides up, drag the header down to dismiss, lifts above the keyboard,
 * scrolls inside itself), centered dialog on larger screens.
 */
function Sheet({ open, ar, title, onClose, children }) {
	const closeLabel = ar ? 'إغلاق' : 'Close';
	const phone = useIsPhone();
	const reduceMotion = useReducedMotion();
	const dragControls = useDragControls();
	const panelRef = useRef(null);
	const closeRef = useRef(onClose);
	const keyboard = useKeyboardInset(open && phone);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		closeRef.current = onClose;
	}, [onClose]);
	useEffect(() => setMounted(true), []);

	useEffect(() => {
		if (!open) return undefined;
		const previous = document.activeElement;
		const onKey = event => {
			if (event.key === 'Escape') closeRef.current();
		};
		window.addEventListener('keydown', onKey);
		// Move focus into the sheet (unless a field already took it) so keyboard and screen-reader
		// users land where the content is; give it back to the trigger on close.
		const timer = window.setTimeout(() => {
			const panel = panelRef.current;
			if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
		}, 40);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.clearTimeout(timer);
			if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
		};
	}, [open]);

	if (!mounted) return null;

	const panelMotion = reduceMotion
		? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
		: phone
			? {
					initial: { y: '100%' },
					animate: { y: 0, transition: { type: 'spring', stiffness: 460, damping: 42, mass: 0.9 } },
					exit: { y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
				}
			: {
					initial: { opacity: 0, scale: 0.97, y: 8 },
					animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 520, damping: 40 } },
					exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
				};

	return createPortal(
		<AnimatePresence>
			{open ? (
				<div
					key="sheet"
					className={`fixed inset-0 z-400 flex justify-center ${phone ? 'items-end' : 'items-center p-4'}`}
					role="dialog"
					aria-modal="true"
					aria-label={title}
					dir={ar ? 'rtl' : 'ltr'}
				>
					<motion.button
						type="button"
						tabIndex={-1}
						aria-label={closeLabel}
						onClick={() => closeRef.current()}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0, transition: { duration: 0.18 } }}
						className="absolute inset-0 touch-none bg-slate-950/50 backdrop-blur-[2px]"
					/>
					<motion.div
						ref={panelRef}
						tabIndex={-1}
						data-wa-kb-scroll=""
						{...panelMotion}
						drag={phone && !reduceMotion ? 'y' : false}
						dragControls={dragControls}
						dragListener={false}
						dragConstraints={{ top: 0, bottom: 0 }}
						dragElastic={{ top: 0, bottom: 0.8 }}
						onDragEnd={(_, info) => {
							if (info.offset.y > 110 || info.velocity.y > 650) closeRef.current();
						}}
						style={
							phone
								? {
										marginBottom: keyboard,
										maxHeight: keyboard
											? `calc(100dvh - ${keyboard}px - 12px)`
											: 'calc(100dvh - max(20px, env(safe-area-inset-top)) - 8px)',
									}
								: { maxHeight: 'min(720px, calc(100dvh - 32px))' }
						}
						className={`wa-dk relative flex w-full flex-col overflow-hidden bg-white shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.35)] outline-none dark:bg-slate-900 ${
							phone ? 'rounded-t-[28px]' : 'max-w-md rounded-[28px]'
						}`}
					>
						<div
							onPointerDown={event => {
								if (phone) dragControls.start(event);
							}}
							className={`shrink-0 ${phone ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
						>
							{phone ? (
								<div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
									<span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
								</div>
							) : null}
							<div className={`flex items-center justify-between gap-3 px-5 ${phone ? 'pb-2' : 'pt-5 pb-3'}`}>
								<h3 className="min-w-0 truncate text-[17px] font-black text-slate-900 dark:text-white">{title}</h3>
								<button
									type="button"
									onClick={() => closeRef.current()}
									onPointerDown={event => event.stopPropagation()}
									aria-label={closeLabel}
									className="-me-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-200"
								>
									<X size={20} />
								</button>
							</div>
						</div>
						<div
							className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 ${
								phone && !keyboard ? 'pb-[max(20px,env(safe-area-inset-bottom))]' : 'pb-5'
							}`}
						>
							{children}
						</div>
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>,
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

/** Bottom sheet to pick entry type and fill the form — opened from the hero Add button. */
function AddEntrySheet({
	open,
	initialType = 'money',
	onClose,
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
	useEffect(() => {
		if (open) setType(initialType);
	}, [open, resetKey, initialType]);

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
		<Sheet open={open} ar={ar} title={ar ? 'إضافة حركة' : 'New entry'} onClose={onClose}>
			<p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{hints[type]}</p>
			<div
				role="tablist"
				aria-label={ar ? 'نوع الحركة' : 'Entry type'}
				className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100/90 p-1 dark:bg-slate-800/80"
			>
				{ADD_TYPES.map(([key, Icon, tone]) => {
					const active = type === key;
					return (
						<button
							key={key}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => setType(key)}
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
				<motion.div
					key={type}
					role="tabpanel"
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -4 }}
					transition={{ duration: 0.16, ease: 'easeOut' }}
					className="mt-4"
				>
					{forms[type]}
				</motion.div>
			</AnimatePresence>
		</Sheet>
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

function LedgerStatus({ row, ar, today, locked, onToggle, interactive = true, compact = false }) {
	const pill = compact
		? 'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-bold'
		: pillClass;
	if (row.type === 'money') {
		const received = row.source.kind === 'received';
		const overdue = !received && row.date < today;
		const tone = received
			? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'
			: overdue
				? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900'
				: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900';
		const content = (
			<>
				{received ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : <Hourglass size={12} aria-hidden="true" />}
				{received ? (ar ? 'وصلت' : 'Received') : overdue ? (ar ? 'متأخرة' : 'Overdue') : ar ? 'لسه' : 'Waiting'}
			</>
		);
		if (!interactive) return <span className={`${pill} ring-1 ${tone}`}>{content}</span>;
		return (
			<button
				type="button"
				role="checkbox"
				aria-checked={received}
				disabled={locked}
				onClick={onToggle}
				title={received ? (ar ? 'لسه ماوصلتش' : 'Mark as not received') : ar ? 'وصلت' : 'Mark as received'}
				className={`${pill} ring-1 transition hover:brightness-95 active:scale-95 ${tone}`}
			>
				{content}
			</button>
		);
	}
	if (row.type === 'gold') {
		return <span className={`${pill} ${LEDGER_TONES.gold.badge}`}>{ar ? `عيار ${row.source.karat}` : `${row.source.karat}K`}</span>;
	}
	if (row.type === 'lent') {
		return <span className={`${pill} ${LEDGER_TONES.lent.badge}`}>{ar ? 'عند ناس' : 'Lent out'}</span>;
	}
	return <span className={`${pill} ${LEDGER_TONES.expense.badge}`}>{ar ? 'اتصرف' : 'Spent'}</span>;
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

/** Filter / chart panels for the ledger — opened from the toolbar icon. */
function LedgerFilterSheet({ open, ar, type, moneyFilter, counts, expenseMin, expenseDays, onClose, onApplyMoney, onApplyExpense, onOpenChart }) {
	const [draftMoney, setDraftMoney] = useState(moneyFilter);
	const [draftMin, setDraftMin] = useState(expenseMin);
	const [draftDays, setDraftDays] = useState(expenseDays);

	useEffect(() => {
		if (!open) return;
		setDraftMoney(moneyFilter);
		setDraftMin(expenseMin);
		setDraftDays(expenseDays);
	}, [open, moneyFilter, expenseMin, expenseDays]);

	const title = type === 'expense' ? (ar ? 'فلاتر الصرف' : 'Spend filters') : ar ? 'فلاتر الفلوس' : 'Money filters';

	return (
		<Sheet open={open} ar={ar} title={title} onClose={onClose}>
			{type === 'money' ? (
				<div className="flex flex-col gap-3">
					<p className="text-xs text-slate-500 dark:text-slate-400">{ar ? 'اعرض حسب حالة الاستلام' : 'Filter by received status'}</p>
					<div className="flex flex-col gap-1.5">
						{[
							['all', ar ? 'الكل' : 'All', counts.money],
							['pending', ar ? 'لسه ماوصلتش' : 'Waiting', counts.pending],
							['received', ar ? 'وصلت' : 'Received', counts.received],
						].map(([key, label, count]) => (
							<button
								key={key}
								type="button"
								onClick={() => setDraftMoney(key)}
								className={`flex h-11 items-center justify-between rounded-xl border px-3.5 text-sm font-bold transition ${
									draftMoney === key
										? 'border-[#1DAB61] bg-[#1DAB61]/10 text-[#128c4f] dark:text-[#4ade80]'
										: 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
								}`}
							>
								{label}
								<span className="tabular-nums opacity-60">{count}</span>
							</button>
						))}
					</div>
					<button
						type="button"
						className={`${primaryButton} mt-1`}
						onClick={() => {
							onApplyMoney(draftMoney);
							onClose();
						}}
					>
						{ar ? 'تطبيق' : 'Apply'}
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					<Field label={ar ? 'المبلغ أكبر من' : 'Amount above'} hint={ar ? 'ج.م' : 'EGP'}>
						<input
							inputMode="decimal"
							value={draftMin}
							onChange={event => setDraftMin(event.target.value)}
							placeholder="0"
							className={`${fieldClass} font-bold tabular-nums`}
						/>
					</Field>
					<Field label={ar ? 'آخر كام يوم' : 'Last N days'} hint={ar ? 'فاضي = الكل' : 'Empty = all'}>
						<input
							inputMode="numeric"
							value={draftDays}
							onChange={event => setDraftDays(event.target.value.replace(/[^\d]/g, ''))}
							placeholder={ar ? 'مثلاً 7' : 'e.g. 7'}
							className={`${fieldClass} font-bold tabular-nums`}
						/>
					</Field>
					<button
						type="button"
						className={`${primaryButton}`}
						onClick={() => {
							onApplyExpense({ min: draftMin, days: draftDays });
							onClose();
						}}
					>
						{ar ? 'تطبيق' : 'Apply'}
					</button>
					<button
						type="button"
						onClick={() => {
							onClose();
							onOpenChart();
						}}
						className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
					>
						<BarChart3 size={16} />
						{ar ? 'استهلاك كل يوم' : 'Daily spending chart'}
					</button>
					<button
						type="button"
						onClick={() => {
							setDraftMin('');
							setDraftDays('');
							onApplyExpense({ min: '', days: '' });
							onClose();
						}}
						className="text-xs font-bold text-slate-400 underline"
					>
						{ar ? 'مسح الفلاتر' : 'Clear filters'}
					</button>
				</div>
			)}
		</Sheet>
	);
}

function SpendDailyChart({ open, ar, money, series, onClose }) {
	const max = series.reduce((m, [, v]) => Math.max(m, v), 0) || 1;
	return (
		<Sheet open={open} ar={ar} title={ar ? 'الاستهلاك اليومي' : 'Daily spending'} onClose={onClose}>
			{!series.length ? (
				<p className="py-6 text-center text-sm text-slate-400">{ar ? 'مفيش مصاريف في الفلتر الحالي' : 'No spend in the current filter'}</p>
			) : (
				<ul className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto pe-1">
					{series.map(([date, amount]) => (
						<li key={date} className="flex flex-col gap-1">
							<div className="flex items-baseline justify-between gap-2 text-[11px]">
								<span className="font-bold tabular-nums text-slate-500">{formatDay(date, ar)}</span>
								<span className="font-black tabular-nums text-rose-600 dark:text-rose-400">{money(amount)}</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
								<div
									className="h-full rounded-full bg-rose-500/90 transition-[width]"
									style={{ width: `${Math.max(6, (amount / max) * 100)}%` }}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</Sheet>
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
	lockedIds,
	onToggle,
	onEdit,
	onDelete,
	anchorRef,
	moneyFilter,
	onMoneyFilterChange,
	onOpenRow,
}) {
	const allRows = useMemo(() => buildLedgerRows(data), [data]);
	const priceNf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }), []);
	const gold = data?.gold;
	const lent = data?.lent;
	const expenses = data?.expenses;
	const [expenseMin, setExpenseMin] = useState('');
	const [expenseDays, setExpenseDays] = useState('');
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [chartOpen, setChartOpen] = useState(false);

	const counts = useMemo(() => {
		const next = { all: allRows.length, money: 0, gold: 0, lent: 0, expense: 0, pending: 0, received: 0 };
		for (const row of allRows) {
			next[row.type] += 1;
			if (row.type === 'money') next[row.source.kind === 'received' ? 'received' : 'pending'] += 1;
		}
		return next;
	}, [allRows]);

	const rows = useMemo(() => {
		let list;
		if (type === 'money') {
			const items = allRows.filter(row => row.type === 'money');
			const pending = items.filter(row => row.source.kind === 'pending');
			const received = items.filter(row => row.source.kind === 'received');
			if (moneyFilter === 'pending') list = pending;
			else if (moneyFilter === 'received') list = received;
			else list = [...pending, ...received];
		} else if (type !== 'all') {
			list = allRows.filter(row => row.type === type);
		} else {
			// Newest first; gold has no date, so it sits at the bottom.
			list = [...allRows].sort((a, b) => {
				if (!a.date && !b.date) return 0;
				if (!a.date) return 1;
				if (!b.date) return -1;
				return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
			});
		}

		if (type === 'expense') {
			const min = parseAmount(expenseMin);
			const since = expenseDays ? ymdDaysAgo(Number(expenseDays)) : null;
			list = list.filter(row => {
				if (Number.isFinite(min) && min > 0 && !(Number(row.amount) > min)) return false;
				if (since && (!row.date || row.date < since)) return false;
				return true;
			});
		}
		return list;
	}, [allRows, type, moneyFilter, expenseMin, expenseDays]);

	const spendSeries = useMemo(() => dailySpendSeries(rows.filter(row => row.type === 'expense')), [rows]);

	const total = useMemo(() => {
		if (type === 'gold') return gold?.totalValue != null ? money(gold.totalValue) : null;
		if (type === 'lent') return money(lent?.total);
		if (type === 'expense') return money(round2(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)));
		if (type === 'money') return money(round2(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)));
		return null;
	}, [type, rows, gold, lent, money]);

	const unavailable =
		(type === 'gold' && gold?.available === false) ||
		(type === 'lent' && lent?.available === false) ||
		(type === 'expense' && expenses?.available === false);

	const filtersAvailable = type === 'money' || type === 'expense';
	const filtersActive =
		(type === 'money' && moneyFilter !== 'all') ||
		(type === 'expense' && (Boolean(String(expenseMin).trim()) || Boolean(String(expenseDays).trim())));

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
									? null 
									: null
								: type === 'gold' && gold?.holdings?.length
									? formatGrams(gold.totalGrams, ar)
									: ar
										? `${rows.length} عنصر`
										: `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
						</p>
					</div>
					<div className="flex shrink-0 items-end gap-2">
						{filtersAvailable ? (
							<button
								type="button"
								onClick={() => setFiltersOpen(true)}
								aria-label={ar ? 'فلاتر' : 'Filters'}
								title={ar ? 'فلاتر' : 'Filters'}
								className={`relative grid h-11 w-11 place-items-center rounded-xl border transition sm:h-9 sm:w-9 ${
									filtersActive
										? 'border-[#1DAB61] bg-[#1DAB61]/10 text-[#128c4f] dark:text-[#4ade80]'
										: 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
								}`}
							>
								<Filter size={15} />
								{filtersActive ? (
									<span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#1DAB61]" aria-hidden="true" />
								) : null}
							</button>
						) : null}
						{type === 'expense' ? (
							<button
								type="button"
								onClick={() => setChartOpen(true)}
								aria-label={ar ? 'رسم الاستهلاك' : 'Spending chart'}
								title={ar ? 'استهلاك كل يوم' : 'Daily spending'}
								className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-rose-500 sm:h-9 sm:w-9 transition hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-rose-950/30"
							>
								<BarChart3 size={15} />
							</button>
						) : null}
						{total ? (
							<p className="text-end">
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
									className={`flex min-w-0 flex-col items-center justify-center min-h-12 gap-0.5 whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] font-bold transition [touch-action:manipulation] sm:h-9 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-0 sm:text-xs ${
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

				{type === 'gold' && gold?.quote ? (
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

			{filtersAvailable ? (
				<LedgerFilterSheet
					open={filtersOpen}
					ar={ar}
					type={type}
					moneyFilter={moneyFilter}
					counts={counts}
					expenseMin={expenseMin}
					expenseDays={expenseDays}
					onClose={() => setFiltersOpen(false)}
					onApplyMoney={onMoneyFilterChange}
					onApplyExpense={({ min, days }) => {
						setExpenseMin(min);
						setExpenseDays(days);
					}}
					onOpenChart={() => setChartOpen(true)}
				/>
			) : null}
			{type === 'expense' ? (
				<SpendDailyChart open={chartOpen} ar={ar} money={money} series={spendSeries} onClose={() => setChartOpen(false)} />
			) : null}

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
							const muted = row.type === 'money' && row.source.kind === 'received';
							return (
								<li key={row.key}>
									<button
										type="button"
										onClick={() => onOpenRow(row)}
										aria-busy={locked || undefined}
										className={`flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors [touch-action:manipulation] active:bg-slate-100 dark:active:bg-slate-800/70 ${
											locked ? 'opacity-60' : ''
										}`}
									>
										<LedgerIcon type={row.type} />
										<span className="flex min-w-0 flex-1 flex-col gap-1">
											<span className="flex items-baseline justify-between gap-3">
												<span
													className={`min-w-0 truncate text-[15px] font-bold ${muted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}
												>
													{row.name}
												</span>
												<span className="shrink-0 text-[15px]">
													<LedgerAmount row={row} money={money} />
												</span>
											</span>
											<span className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
												<LedgerStatus row={row} ar={ar} today={today} interactive={false} compact />
												{row.date ? <span className="tabular-nums">{formatDay(row.date, ar)}</span> : null}
												<LedgerMeta row={row} ar={ar} />
											</span>
										</span>
										{locked ? (
											<Loader2 size={16} className="shrink-0 animate-spin text-slate-400" />
										) : (
											<ChevronLeft size={18} className={`shrink-0 text-slate-300 dark:text-slate-600 ${ar ? '' : 'rotate-180'}`} aria-hidden="true" />
										)}
									</button>
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

/** The four things people add, one tap away and inside the thumb zone on phones. */
function QuickActions({ ar, onPick }) {
	const actions = [
		['money', Wallet, ar ? 'فلوس' : 'Money', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'],
		['gold', Coins, ar ? 'دهب' : 'Gold', 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'],
		['lent', HandCoins, ar ? 'سلفة' : 'Loan', 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300'],
		['expense', Receipt, ar ? 'مصروف' : 'Expense', 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'],
	];
	return (
		<nav aria-label={ar ? 'إضافة' : 'Add'} className={`${surfaceCard} grid grid-cols-4 gap-1 p-2`}>
			{actions.map(([key, Icon, label, tone]) => (
				<button
					key={key}
					type="button"
					onClick={() => onPick(key)}
					aria-label={ar ? `إضافة ${label}` : `Add ${label.toLowerCase()}`}
					className="group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 transition [touch-action:manipulation] hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100 dark:hover:bg-slate-800/60 dark:active:bg-slate-800"
				>
					<span className={`relative grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>
						<Icon size={20} aria-hidden="true" />
						<span className="absolute -end-1 -bottom-1 grid h-4.5 w-4.5 place-items-center rounded-full bg-[#1DAB61] text-white ring-2 ring-white dark:ring-slate-900">
							<Plus size={11} strokeWidth={3.5} aria-hidden="true" />
						</span>
					</span>
					<span className="max-w-full truncate text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
				</button>
			))}
		</nav>
	);
}

/** Phone detail view of one entry: everything about it plus its actions, at full thumb size. */
function EntrySheet({ row, ar, money, today, quote, locked, onClose, onToggle, onEdit, onDelete }) {
	const [confirming, setConfirming] = useState(false);
	const [shown, setShown] = useState(row);
	if (row && row !== shown) setShown(row);
	const current = row || shown;
	const priceNf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }), []);

	useEffect(() => {
		if (!row) setConfirming(false);
	}, [row]);

	const title = current ? ledgerTypeLabel(current.type, ar) : '';
	const item = current?.source;
	const details = [];
	if (current) {
		if (current.type === 'money') {
			const received = item.kind === 'received';
			details.push([received ? (ar ? 'وصلت يوم' : 'Received on') : ar ? 'متوقعة يوم' : 'Expected on', formatDay(current.date, ar)]);
			if (item.currency === 'USD') {
				details.push([ar ? 'بالدولار' : 'In USD', formatUsd(item.amount)]);
				if (item.fxRate) details.push([ar ? 'سعر الدولار' : 'USD rate', formatFxRate(item.fxRate, ar)]);
			}
		} else if (current.type === 'gold') {
			details.push([ar ? 'الوزن' : 'Weight', formatGrams(item.grams, ar)]);
			details.push([ar ? 'العيار' : 'Karat', ar ? `عيار ${item.karat}` : `${item.karat}K`]);
			const price = quote?.perGram?.[item.karat];
			if (price) details.push([ar ? 'سعر الجرام النهارده' : 'Price per gram today', `${priceNf.format(price)} ${ar ? 'ج.م' : 'EGP'}`]);
		} else {
			details.push([current.type === 'lent' ? (ar ? 'اتسلفت يوم' : 'Lent on') : ar ? 'اتصرف يوم' : 'Spent on', formatDay(current.date, ar)]);
		}
	}

	return (
		<Sheet open={Boolean(row)} ar={ar} title={title} onClose={onClose}>
			{current ? (
				<div className="flex flex-col gap-5">
					<div className="flex items-start gap-3">
						<LedgerIcon type={current.type} />
						<div className="min-w-0 flex-1">
							<p className="text-lg font-black leading-snug wrap-break-word text-slate-900 dark:text-white">{current.name}</p>
							<div className="mt-1.5">
								<LedgerStatus row={current} ar={ar} today={today} interactive={false} />
							</div>
						</div>
					</div>

					<div className="rounded-2xl bg-slate-50 px-4 py-3.5 dark:bg-slate-800/50">
						<p className="text-xs font-bold text-slate-500 dark:text-slate-400">
							{current.type === 'gold' ? (ar ? 'قيمته النهارده' : 'Worth today') : ar ? 'المبلغ' : 'Amount'}
						</p>
						{current.amount == null ? (
							<p className="mt-1 text-[28px] font-black text-slate-400">—</p>
						) : (
							<p className={`mt-1 text-[28px] font-black leading-tight ${current.type === 'money' ? 'text-slate-900 dark:text-white' : LEDGER_TONES[current.type].amount}`}>
								{current.type === 'expense' ? '− ' : ''}
								<MoneyFigure value={current.amount} ar={ar} unitClassName="text-sm opacity-60" />
							</p>
						)}
					</div>

					{details.length ? (
						<dl className="divide-y divide-slate-100 dark:divide-slate-800">
							{details.map(([label, value]) => (
								<div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
									<dt className="text-slate-500 dark:text-slate-400">{label}</dt>
									<dd className="font-bold tabular-nums text-slate-900 dark:text-white">{value}</dd>
								</div>
							))}
						</dl>
					) : null}

					{confirming ? (
						<div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
							<p className="text-sm font-bold text-rose-800 dark:text-rose-200">
								{ar ? `هتمسح "${current.name}" من السجل. متأكد؟` : `Delete “${current.name}” from your wallet?`}
							</p>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setConfirming(false)}
									className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
								>
									{ar ? 'لأ، سيبها' : 'Keep it'}
								</button>
								<button
									type="button"
									disabled={locked}
									onClick={() => {
										onDelete(current);
										onClose();
									}}
									className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-bold text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50"
								>
									<Trash2 size={16} />
									{ar ? 'امسح' : 'Delete'}
								</button>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-2.5">
							{current.type === 'money' ? (
								<button
									type="button"
									disabled={locked}
									onClick={() => onToggle(item)}
									className={
										item.kind === 'received'
											? 'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200'
											: `${primaryButton} h-12`
									}
								>
									{locked ? (
										<Loader2 size={16} className="animate-spin" />
									) : item.kind === 'received' ? (
										<Hourglass size={16} />
									) : (
										<Check size={16} strokeWidth={3} />
									)}
									{item.kind === 'received' ? (ar ? 'رجّعها لسه ماوصلتش' : 'Mark as not received') : ar ? 'وصلت' : 'Mark as received'}
								</button>
							) : null}
							<div className="grid grid-cols-2 gap-2.5">
								<button
									type="button"
									disabled={locked}
									onClick={() => {
										onClose();
										onEdit(current);
									}}
									className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
								>
									<Pencil size={16} />
									{ar ? 'تعديل' : 'Edit'}
								</button>
								<button
									type="button"
									disabled={locked}
									onClick={() => setConfirming(true)}
									className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-bold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
								>
									<Trash2 size={16} />
									{ar ? 'مسح' : 'Delete'}
								</button>
							</div>
						</div>
					)}
				</div>
			) : null}
		</Sheet>
	);
}

/** Quick what-if sums over the wallet: pick parts, add or subtract your own values. */
function CalcSheet({ open, ar, onClose, sources }) {
	const nf = useMemo(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }), []);
	const unit = ar ? 'ج.م' : 'EGP';
	const [picked, setPicked] = useState(() => new Set(['cash', 'gold']));
	const [extras, setExtras] = useState([]);
	const [sign, setSign] = useState(1);
	const [draft, setDraft] = useState('');
	const [label, setLabel] = useState('');
	const draftValue = parseAmount(draft);
	const draftValid = Number.isFinite(draftValue) && draftValue > 0;

	const terms = [
		...sources.filter(source => picked.has(source.key)).map(source => ({ key: source.key, label: source.label, value: source.value })),
		...extras.map(extra => ({ key: extra.id, label: extra.label, value: extra.value })),
	];
	const total = round2(terms.reduce((sum, term) => sum + term.value, 0));

	const toggle = key =>
		setPicked(current => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	const addExtra = () => {
		if (!draftValid) return;
		setExtras(current => [
			...current,
			{ id: `x${Date.now()}${current.length}`, label: label.trim() || (sign > 0 ? (ar ? 'قيمة' : 'Value') : ar ? 'خصم' : 'Minus'), value: sign * draftValue },
		]);
		setDraft('');
		setLabel('');
	};

	return (
		<Sheet open={open} ar={ar} title={ar ? 'حاسبة' : 'Calculator'} onClose={onClose}>
			<div className="flex flex-col gap-5">
				<div className="rounded-2xl bg-[#0c4430] px-4 py-4 text-white dark:bg-[#0a3a29]">
					<p className="text-xs font-semibold text-emerald-100/75">{ar ? 'النتيجة' : 'Result'}</p>
					<p className={`mt-1 truncate text-[34px] font-black leading-none tabular-nums ${total < 0 ? 'text-rose-200' : ''}`}>
						{nf.format(total)}
						<span className="ms-1.5 text-base font-bold text-emerald-100/60">{unit}</span>
					</p>
					<p className="mt-2.5 text-xs leading-relaxed text-emerald-100/70 tabular-nums" dir="ltr">
						{terms.length
							? terms.map((term, index) => `${index === 0 ? (term.value < 0 ? '− ' : '') : term.value < 0 ? ' − ' : ' + '}${nf.format(Math.abs(term.value))}`).join('')
							: ar
								? 'اختار من تحت'
								: 'Pick something below'}
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<p className="text-[11.5px] font-bold text-slate-600 dark:text-slate-300">{ar ? 'من محفظتك' : 'From your wallet'}</p>
					<div className="grid grid-cols-2 gap-2">
						{sources.map(source => {
							const on = picked.has(source.key);
							return (
								<button
									key={source.key}
									type="button"
									role="checkbox"
									aria-checked={on}
									onClick={() => toggle(source.key)}
									className={`flex min-h-[60px] min-w-0 items-center gap-2.5 rounded-2xl border px-3 text-start transition [touch-action:manipulation] active:scale-[0.98] ${
										on
											? 'border-[#1DAB61] bg-[#1DAB61]/[0.07] ring-1 ring-[#1DAB61]/30'
											: 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:bg-slate-800'
									}`}
								>
									<span
										className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${
											on ? 'border-[#1DAB61] bg-[#1DAB61] text-white' : 'border-slate-300 text-transparent dark:border-slate-600'
										}`}
										aria-hidden="true"
									>
										<Check size={12} strokeWidth={3.5} />
									</span>
									<span className="min-w-0">
										<span className="block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{source.label}</span>
										<span className="block truncate text-sm font-black tabular-nums text-slate-900 dark:text-white">
											{nf.format(source.value)}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<p className="text-[11.5px] font-bold text-slate-600 dark:text-slate-300">{ar ? 'ضيف قيمة بإيدك' : 'Add your own value'}</p>
					<form
						className="flex flex-col gap-2"
						onSubmit={event => {
							event.preventDefault();
							addExtra();
						}}
					>
						<div className="flex gap-2">
							<div className="grid shrink-0 grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label={ar ? 'العملية' : 'Operation'}>
								{[
									[1, Plus, ar ? 'زائد' : 'Add'],
									[-1, Minus, ar ? 'ناقص' : 'Subtract'],
								].map(([value, Icon, name]) => (
									<button
										key={value}
										type="button"
										role="radio"
										aria-checked={sign === value}
										aria-label={name}
										onClick={() => setSign(value)}
										className={`grid h-10 w-10 place-items-center rounded-lg transition ${
											sign === value
												? value > 0
													? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-950'
													: 'bg-white text-rose-600 shadow-sm dark:bg-slate-950'
												: 'text-slate-500'
										}`}
									>
										<Icon size={18} strokeWidth={2.5} />
									</button>
								))}
							</div>
							<input
								inputMode="decimal"
								value={draft}
								onChange={event => setDraft(event.target.value)}
								placeholder={ar ? 'المبلغ' : 'Amount'}
								aria-label={ar ? 'المبلغ' : 'Amount'}
								className={`${fieldClass} font-bold tabular-nums`}
							/>
						</div>
						<div className="flex gap-2">
							<input
								value={label}
								onChange={event => setLabel(event.target.value)}
								maxLength={40}
								placeholder={ar ? 'اسمها (اختياري)' : 'Label (optional)'}
								aria-label={ar ? 'اسم القيمة' : 'Label'}
								className={fieldClass}
							/>
							<button type="submit" disabled={!draftValid} className={`${primaryButton} h-12 shrink-0 sm:h-11`}>
								<Plus size={16} />
								{ar ? 'ضيف' : 'Add'}
							</button>
						</div>
					</form>

					{extras.length ? (
						<ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
							{extras.map(extra => (
								<li key={extra.id} className="flex items-center gap-3 ps-3.5 pe-1">
									<span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">{extra.label}</span>
									<span
										className={`shrink-0 text-sm font-black tabular-nums ${extra.value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
										dir="ltr"
									>
										{extra.value < 0 ? '− ' : '+ '}
										{nf.format(Math.abs(extra.value))}
									</span>
									<button
										type="button"
										onClick={() => setExtras(current => current.filter(item => item.id !== extra.id))}
										aria-label={ar ? `شيل ${extra.label}` : `Remove ${extra.label}`}
										className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
									>
										<X size={16} />
									</button>
								</li>
							))}
						</ul>
					) : null}
				</div>

				{picked.size || extras.length ? (
					<button
						type="button"
						onClick={() => {
							setPicked(new Set());
							setExtras([]);
						}}
						className="inline-flex h-11 items-center justify-center gap-2 self-center rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
					>
						<RotateCcw size={15} />
						{ar ? 'ابدأ من الأول' : 'Start over'}
					</button>
				) : null}
			</div>
		</Sheet>
	);
}

/** Banknote-style guilloché rosette: a few phase-shifted wave rings, drawn once. */
function guillochePaths() {
	const paths = [];
	const cx = 160;
	const cy = 160;
	for (let ring = 0; ring < 9; ring += 1) {
		const radius = 52 + ring * 12;
		const amp = 7 + (ring % 3) * 2;
		const waves = 18 + (ring % 2) * 6;
		const phase = ring * 0.45;
		let d = '';
		for (let step = 0; step <= 360; step += 2) {
			const t = (step * Math.PI) / 180;
			const r = radius + amp * Math.sin(waves * t + phase);
			const x = (cx + r * Math.cos(t)).toFixed(1);
			const y = (cy + r * Math.sin(t)).toFixed(1);
			d += `${step === 0 ? 'M' : 'L'}${x} ${y}`;
		}
		paths.push(`${d}Z`);
	}
	return paths;
}
const GUILLOCHE = guillochePaths();

/**
 * The headline card. Balance first; under it one bar shows how everything you have splits
 * (cash, gold, lent out, on the way). Each legend entry jumps to its rows in the table.
 */
function BalanceHero({ ar, summary, goldValueNow, lentTotal, spentThisMonth, onEditBalance, onJump, onCalc }) {
	const balance = Number(summary?.balance) || 0;
	const pending = Number(summary?.pendingTotal) || 0;
	const parts = [
		{ key: 'cash', label: ar ? 'كاش' : 'Cash', value: Math.max(0, balance), swatch: 'bg-white' },
		{ key: 'gold', label: ar ? 'دهب' : 'Gold', value: goldValueNow, swatch: 'bg-[#f2c94c]' },
		{ key: 'lent', label: ar ? 'عند ناس' : 'Lent out', value: lentTotal, swatch: 'bg-[#8fd3ff]' },
		{
			key: 'pending',
			label: ar ? 'في الطريق' : 'On the way',
			value: pending,
			swatch: 'bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.75)_0_3px,rgba(255,255,255,0.18)_3px_6px)]',
		},
	];
	const total = parts.reduce((sum, part) => sum + part.value, 0);

	return (
		<section className="relative isolate overflow-hidden rounded-[30px] bg-[#0c4430] text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_24px_48px_-28px_rgba(6,40,27,0.95)] dark:bg-[#0a3a29]">
			{/* Light from the top edge + the rosette, both quiet enough to read over */}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_85%_-10%,rgba(52,211,153,0.35),transparent_60%),radial-gradient(90%_70%_at_0%_110%,rgba(3,25,17,0.7),transparent_65%)]"
			/>
			<svg
				aria-hidden="true"
				viewBox="0 0 320 320"
				className="pointer-events-none absolute -end-24 -top-28 -z-10 h-[340px] w-[340px] text-white opacity-[0.09] sm:-end-16"
			>
				{GUILLOCHE.map((d, index) => (
					<path key={index} d={d} fill="none" stroke="currentColor" strokeWidth="0.8" />
				))}
			</svg>

			<div className="px-5 pt-5 sm:px-7 sm:pt-6">
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm font-semibold text-emerald-100/80">{ar ? 'الرصيد المتاح' : 'Available balance'}</p>
					<div className="-me-1.5 flex items-center">
						<button
							type="button"
							onClick={onCalc}
							aria-label={ar ? 'حاسبة' : 'Calculator'}
							title={ar ? 'حاسبة' : 'Calculator'}
							className="grid h-11 w-11 place-items-center rounded-full text-emerald-50/90 transition [touch-action:manipulation] hover:bg-white/10 active:scale-95 active:bg-white/15"
						>
							<Calculator size={17} />
						</button>
						<button
							type="button"
							onClick={onEditBalance}
							aria-label={ar ? 'تعديل الرصيد' : 'Edit balance'}
							title={ar ? 'تعديل الرصيد' : 'Edit balance'}
							className="grid h-11 w-11 place-items-center rounded-full text-emerald-50/90 transition [touch-action:manipulation] hover:bg-white/10 active:scale-95 active:bg-white/15"
						>
							<Pencil size={17} />
						</button>
					</div>
				</div>

				<p className="mt-1 max-w-full">
					<MoneyFigure
						value={balance}
						ar={ar}
						className="block truncate text-[44px] font-black leading-none tracking-[-0.03em] sm:text-[54px]"
						unitClassName="ms-2 text-lg font-bold tracking-normal text-emerald-100/60 sm:text-xl"
					/>
				</p>

				{total > 0 ? (
					<p className="mt-3 text-[13px] text-emerald-100/70">
						{ar ? 'كل اللي ليك ' : 'Everything you have '}
						<MoneyFigure value={total} ar={ar} className="font-bold text-white" unitClassName="text-[11px] text-emerald-100/60" />
					</p>
				) : null}
			</div>

			{total > 0 ? (
				<div className="px-5 pt-5 sm:px-7">
					<div
						className="flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full"
						role="img"
						aria-label={parts
							.filter(part => part.value > 0)
							.map(part => `${part.label} ${Math.round((part.value / total) * 100)}%`)
							.join('، ')}
					>
						{parts
							.filter(part => part.value > 0)
							.map(part => (
								<span key={part.key} className={`h-full rounded-full ${part.swatch}`} style={{ flexGrow: part.value, flexBasis: 0, minWidth: 6 }} />
							))}
					</div>
				</div>
			) : null}

			<div className="grid grid-cols-2 gap-x-2 px-3 pt-3 pb-2 sm:grid-cols-4 sm:px-5">
				{parts.map(part => {
					const share = total > 0 ? Math.round((part.value / total) * 100) : 0;
					return (
						<button
							key={part.key}
							type="button"
							onClick={() => (part.key === 'cash' ? onEditBalance() : onJump(part.key))}
							className="flex min-h-[56px] min-w-0 flex-col justify-center rounded-2xl px-2 py-2 text-start transition [touch-action:manipulation] hover:bg-white/[0.06] active:bg-white/10"
						>
							<span className="flex items-center gap-1.5 text-xs text-emerald-100/75">
								<span className={`h-2.5 w-2.5 shrink-0 rounded-full ${part.swatch}`} aria-hidden="true" />
								<span className="truncate">{part.label}</span>
								{share > 0 ? <span className="tabular-nums text-emerald-100/45">{share}%</span> : null}
							</span>
							<MoneyFigure
								value={part.value}
								ar={ar}
								className={`mt-1 block truncate text-[15px] font-bold leading-tight ${part.value > 0 ? 'text-white' : 'text-white/40'}`}
								unitClassName="text-[10px] font-semibold text-emerald-100/50"
							/>
						</button>
					);
				})}
			</div>

			<button
				type="button"
				onClick={() => onJump('expense')}
				className="flex w-full items-center gap-3 border-t border-white/[0.08] bg-black/[0.12] px-5 py-3.5 text-start transition [touch-action:manipulation] hover:bg-black/20 sm:px-7"
			>
				<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-rose-200">
					<Receipt size={15} aria-hidden="true" />
				</span>
				<span className="min-w-0 flex-1 truncate text-[13px] text-emerald-100/80">
					{ar ? 'صرفت الشهر ده' : 'Spent this month'}
				</span>
				<MoneyFigure value={spentThisMonth} ar={ar} className="shrink-0 text-sm font-bold text-white" unitClassName="text-[10px] text-emerald-100/55" />
				<ChevronLeft size={16} className={`shrink-0 text-emerald-100/50 ${ar ? '' : 'rotate-180'}`} aria-hidden="true" />
			</button>
		</section>
	);
}

/** Personal money tracker: balance in hand, money received, and money still expected. */
export default function WhatsAppWalletTab({ locale = 'en' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const money = useMoneyFormat(ar);
	const queryClient = useQueryClient();
	const [balanceOpen, setBalanceOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [calcOpen, setCalcOpen] = useState(false);
	const [addType, setAddType] = useState('money');
	const [moneyFilter, setMoneyFilter] = useState('all');
	const [openEntry, setOpenEntry] = useState(null);
	const [editing, setEditing] = useState(null);
	const [editingGold, setEditingGold] = useState(null);
	const [editingLent, setEditingLent] = useState(null);
	const [editingExpense, setEditingExpense] = useState(null);
	const [ledgerType, setLedgerType] = useState('all');
	const ledgerRef = useRef(null);
	const [lockedIds, setLockedIds] = useState(() => new Set());
	const [addFormKey, setAddFormKey] = useState(0);
	const today = todayYmd();

	const closeAddAfterSuccess = () => {
		setAddFormKey(key => key + 1);
		setAddOpen(false);
		toast.success(ar ? 'اتضافت' : 'Added');
	};

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
			closeAddAfterSuccess();
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
			closeAddAfterSuccess();
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
			closeAddAfterSuccess();
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
			closeAddAfterSuccess();
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
	const ledgerRows = useMemo(() => buildLedgerRows(data), [data]);
	// Looked up by type + id (not key): toggling a money item changes its kind but it's the same entry.
	const openRow = openEntry ? ledgerRows.find(row => row.type === openEntry.type && row.id === openEntry.id) || null : null;
	const jumpToLedger = key => {
		if (key === 'pending') {
			setLedgerType('money');
			setMoneyFilter('pending');
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
						onCalc={() => setCalcOpen(true)}
					/>

					<QuickActions
						ar={ar}
						onPick={type => {
							setAddType(type);
							setAddOpen(true);
						}}
					/>

					<LedgerTable
						ar={ar}
						money={money}
						today={today}
						data={data}
						type={ledgerType}
						onTypeChange={setLedgerType}
						lockedIds={lockedIds}
						onToggle={toggleItem}
						onEdit={editRow}
						onDelete={deleteRow}
						anchorRef={ledgerRef}
						moneyFilter={moneyFilter}
						onMoneyFilterChange={setMoneyFilter}
						onOpenRow={row => setOpenEntry({ type: row.type, id: row.id })}
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
			<AddEntrySheet
				open={addOpen}
				initialType={addType}
				onClose={() => setAddOpen(false)}
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
			<CalcSheet
				open={calcOpen}
				ar={ar}
				onClose={() => setCalcOpen(false)}
				sources={[
					{ key: 'cash', label: ar ? 'الكاش' : 'Cash', value: Number(summary?.balance) || 0 },
					{ key: 'gold', label: ar ? 'الدهب' : 'Gold', value: goldValueNow },
					{ key: 'lent', label: ar ? 'عند ناس' : 'Lent out', value: lentTotal },
					{ key: 'pending', label: ar ? 'في الطريق' : 'On the way', value: Number(summary?.pendingTotal) || 0 },
				]}
			/>
			<EntrySheet
				row={openRow}
				ar={ar}
				money={money}
				today={today}
				quote={gold?.quote}
				locked={openRow ? lockedIds.has(openRow.id) : false}
				onClose={() => setOpenEntry(null)}
				onToggle={toggleItem}
				onEdit={editRow}
				onDelete={deleteRow}
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
