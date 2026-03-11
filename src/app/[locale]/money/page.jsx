'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
	TrendingUp, TrendingDown, Wallet, Bell, Plus, X, ChevronDown,
	DollarSign, RefreshCw, Users, Heart, BarChart3, Clock,
	Layers, Receipt, Building2, Landmark, Briefcase,
	Lock, AlignLeft, Hash, Check, FileText, Repeat,
	Star, Sparkles, ArrowUpRight, ArrowDownRight,
	Target, Edit2, Trash2, Wifi, AlertTriangle,
	CreditCard, Banknote, LandmarkIcon,
} from 'lucide-react';
import api from '@/utils/axios';

// ─── API ─────────────────────────────────────────────────────────────────────
const moneyApi = {
	getDashboard: mode => api.get('/money/dashboard', { params: { mode } }),
	getWallets: () => api.get('/money/wallets'),
	createWallet: p => api.post('/money/wallets', p),
	updateWallet: (id, p) => api.patch(`/money/wallets/${id}`, p),
	deleteWallet: id => api.delete(`/money/wallets/${id}`),
	getIncome: () => api.get('/money/income'),
	createIncome: p => api.post('/money/income', p),
	updateIncome: (id, p) => api.patch(`/money/income/${id}`, p),
	deleteIncome: id => api.delete(`/money/income/${id}`),
	getExpenses: () => api.get('/money/expenses'),
	createExpense: p => api.post('/money/expenses', p),
	updateExpense: (id, p) => api.patch(`/money/expenses/${id}`, p),
	deleteExpense: id => api.delete(`/money/expenses/${id}`),
	getCommitments: () => api.get('/money/commitments'),
	createCommitment: p => api.post('/money/commitments', p),
	updateCommitment: (id, p) => api.patch(`/money/commitments/${id}`, p),
	deleteCommitment: id => api.delete(`/money/commitments/${id}`),
	toggleCommitmentStatus: id => api.patch(`/money/commitments/${id}/toggle-status`),
	getZakat: () => api.get('/money/zakat'),
	createZakat: p => api.post('/money/zakat', p),
	deleteZakat: id => api.delete(`/money/zakat/${id}`),
	getExpected: () => api.get('/money/expected'),
	createExpected: p => api.post('/money/expected', p),
	updateExpected: (id, p) => api.patch(`/money/expected/${id}`, p),
	deleteExpected: id => api.delete(`/money/expected/${id}`),
	getNotifications: () => api.get('/money/notifications'),
	markNotificationRead: id => api.patch(`/money/notifications/${id}/read`),
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const cn = (...c) => c.filter(Boolean).join(' ');
const fmt = v => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(v || 0));
const fmtD = (d, l) => !d ? '' : new Intl.DateTimeFormat(l === 'ar' ? 'ar-EG' : 'en-US', {
	day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn',
}).format(new Date(d));

function useIsMobile() {
	const [v, set] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia('(max-width:640px)');
		set(mq.matches);
		const h = e => set(e.matches);
		mq.addEventListener('change', h);
		return () => mq.removeEventListener('change', h);
	}, []);
	return v;
}

// ─── Injected CSS — animations and pseudo-selectors only, no hardcoded palette
function Styles() {
	useEffect(() => {
		const id = 'mn-v12';
		if (document.getElementById(id)) return;
		const el = document.createElement('style');
		el.id = id;
		el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Sora:wght@300;400;500;600;700;800&display=swap');
      .mn-root{font-family:'Sora',system-ui,sans-serif;}
      .mn-root input,.mn-root select,.mn-root textarea{font-size:16px!important;font-family:'Sora',system-ui,sans-serif;}
      .mn-root ::-webkit-scrollbar{width:3px;height:3px;}
      .mn-root input[type="date"]::-webkit-calendar-picker-indicator,
      .mn-root input[type="date"]::-webkit-inner-spin-button{display:none;}
      .mn-root input[type="date"]{cursor:pointer;}
      .mn-serif{font-family:'Instrument Serif',Georgia,serif;}
      .mn-hide-scroll{scrollbar-width:none;-ms-overflow-style:none;}
      .mn-hide-scroll::-webkit-scrollbar{display:none;}

      @keyframes mn-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .mn-shimmer{
        background:linear-gradient(90deg,var(--color-primary-100) 25%,var(--color-primary-200) 50%,var(--color-primary-100) 75%);
        background-size:200% 100%;animation:mn-shimmer 1.5s infinite;
      }
      @keyframes mn-pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.4)}}
      .mn-pulse{animation:mn-pulse-dot 1.8s ease-in-out infinite;}

      @keyframes mn-holo{0%,100%{opacity:.15;background-position:0% 50%}50%{opacity:.28;background-position:100% 50%}}
      .mn-holo{
        background:linear-gradient(135deg,transparent 0%,rgba(255,255,255,.18) 30%,rgba(168,85,247,.15) 50%,rgba(99,102,241,.12) 70%,transparent 100%);
        background-size:300% 300%;animation:mn-holo 5s ease infinite;
      }
      @keyframes mn-chip{0%{transform:translateX(-130%) rotate(30deg)}100%{transform:translateX(130%) rotate(30deg)}}
      .mn-chip::after{
        content:'';position:absolute;inset:0;
        background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,.38) 50%,transparent 80%);
        animation:mn-chip 3.5s ease-in-out infinite;
      }

      /* gradient helpers — use CSS vars internally */
      .mn-hdr{background:linear-gradient(135deg,var(--color-primary-700),var(--color-gradient-via),var(--color-secondary-600));}
      .mn-hero{background:linear-gradient(150deg,var(--color-primary-800) 0%,var(--color-primary-700) 28%,var(--color-gradient-via) 62%,var(--color-secondary-600) 100%);}
      .mn-card-bg{
        background:linear-gradient(135deg,var(--color-primary-800) 0%,var(--color-primary-700) 30%,var(--color-gradient-via) 62%,var(--color-secondary-600) 100%);
        box-shadow:0 22px 55px -8px rgba(99,102,241,.48),inset 0 0 0 1px rgba(255,255,255,.12);
      }
      .mn-save-btn{background:linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-via),var(--color-gradient-to));}

      /* table */
      .mn-table{width:100%;border-collapse:collapse;}
      .mn-table th{
        padding:8px 11px;font-size:9.5px;font-weight:800;
        letter-spacing:.08em;text-transform:uppercase;
        color:var(--color-primary-400);
        background:var(--color-primary-100);
        border-bottom:1px solid var(--color-primary-200);
        white-space:nowrap;
      }
      .mn-table td{
        padding:9px 11px;font-size:12.5px;
        border-bottom:1px solid var(--color-primary-100);
        vertical-align:middle;
      }
      .mn-table tr:last-child td{border-bottom:none;}
      .mn-table tbody tr{transition:background .12s;}
      .mn-table tbody tr:hover td{background:var(--color-primary-100);}

      /* panel shadow */
      .mn-panel-shadow{box-shadow:-20px 0 60px rgba(99,102,241,.12),inset 0 0 0 1px rgba(255,255,255,.5);}

      /* tooltip */
      .mn-tip-wrap{position:relative;display:inline-flex;}
      .mn-tip{
        position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);
        background:rgba(17,24,39,.9);color:#fff;font-size:10px;font-weight:600;
        padding:3px 7px;border-radius:5px;white-space:nowrap;pointer-events:none;
        opacity:0;transition:opacity .15s;z-index:9999;
      }
      .mn-tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:rgba(17,24,39,.9);}
      .mn-tip-wrap:hover:not(.mn-tip-open) .mn-tip{opacity:1;}
      .mn-tip-wrap.mn-tip-open .mn-tip{opacity:0!important;}

      /* zakat ring */
      .mn-zk-track{stroke:rgba(255,255,255,.12);}
      .mn-zk-fill{stroke:rgba(52,211,153,.95);stroke-linecap:round;}

      /* range thumb */
      input[type=range]::-webkit-slider-thumb{
        -webkit-appearance:none;width:16px;height:16px;border-radius:50%;
        background:#10b981;cursor:pointer;box-shadow:0 2px 6px rgba(16,185,129,.4);border:2px solid white;
      }
      input[type=range]::-moz-range-thumb{
        width:16px;height:16px;border-radius:50%;
        background:#10b981;cursor:pointer;box-shadow:0 2px 6px rgba(16,185,129,.4);border:2px solid white;
      }
    `;
		document.head.appendChild(el);
	}, []);
	return null;
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
	if (typeof document === 'undefined') return null;
	return createPortal(
		<AnimatePresence>
			<motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
				initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
				<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
				<motion.div className="relative z-10 bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs"
					initial={{ scale: .9, y: 10 }} animate={{ scale: 1, y: 0 }}>
					<div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-3">
						<AlertTriangle size={19} className="text-rose-500" />
					</div>
					<p className="text-center text-sm font-medium text-[var(--color-primary-700)] mb-4">{message}</p>
					<div className="flex gap-2">
						<button onClick={onCancel} className="flex-1 h-9 rounded-xl border border-[var(--color-primary-200)] text-[var(--color-primary-500)] text-sm font-semibold cursor-pointer hover:bg-[var(--color-primary-100)] transition-colors bg-transparent">Cancel</button>
						<button onClick={onConfirm} className="flex-1 h-9 rounded-xl bg-rose-500 text-white text-sm font-semibold cursor-pointer hover:bg-rose-600 transition-colors border-none">Delete</button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>,
		document.body,
	);
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────
function ActionBtn({ icon: Icon, tooltip, onClick, color = 'gray', confirm, row }) {
	const ref = useRef(null);
	const [open, setOpen] = useState(false);
	const click = () => { ref.current?.classList.add('mn-tip-open'); confirm ? setOpen(true) : onClick(row); };
	const leave = () => ref.current?.classList.remove('mn-tip-open');
	const cls = { blue: 'hover:bg-blue-50 hover:text-blue-600 text-[var(--color-primary-400)]', red: 'hover:bg-rose-50 hover:text-rose-600 text-[var(--color-primary-400)]', gray: 'hover:bg-[var(--color-primary-200)] hover:text-[var(--color-primary-600)] text-[var(--color-primary-400)]' };
	return (
		<>
			<div ref={ref} className="mn-tip-wrap" onMouseLeave={leave}>
				<button onClick={click} className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer border-none bg-transparent', cls[color])}><Icon size={13} /></button>
				<div className="mn-tip">{tooltip}</div>
			</div>
			{open && <ConfirmModal message={confirm?.message} onConfirm={() => { setOpen(false); onClick(row); }} onCancel={() => setOpen(false)} />}
		</>
	);
}

function TableActions({ row, onEdit, onDelete, editTooltip, deleteTooltip, deleteConfirm, hideEdit = false }) {
	return (
		<div className="flex items-center justify-end gap-0.5">
			{!hideEdit && <ActionBtn icon={Edit2} tooltip={editTooltip} color="blue" onClick={onEdit} row={row} />}
			<ActionBtn icon={Trash2} tooltip={deleteTooltip} color="red" onClick={onDelete} row={row} confirm={{ message: deleteConfirm }} />
		</div>
	);
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, color = 'default', icon: Icon }) {
	const s = {
		default:   'bg-white/10 text-white/70 border-white/15',
		primary:   'bg-[var(--color-primary-100)] text-[var(--color-primary-600)] border-[var(--color-primary-200)]',
		secondary: 'bg-[var(--color-secondary-100)] text-[var(--color-secondary-600)] border-[var(--color-secondary-200)]',
		green:     'bg-emerald-50 text-emerald-700 border-emerald-200',
		red:       'bg-rose-50 text-rose-700 border-rose-200',
		amber:     'bg-amber-50 text-amber-700 border-amber-200',
		muted:     'bg-zinc-50 text-zinc-500 border-zinc-200',
	};
	return (
		<span className={cn('inline-flex text-nowrap items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold border', s[color])}>
			{Icon && <Icon size={8} />}{children}
		</span>
	);
}

// ─── Form primitives ──────────────────────────────────────────────────────────
function Inp({ icon: Icon, label, className: cls, type, ...p }) {
	const isDate = type === 'date';
	const showIcon = !!Icon && !isDate;
	return (
		<div>
			{label && <label className="flex items-center gap-1 mb-1 text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]">{showIcon && <Icon size={9} />}{label}</label>}
			<div className="relative flex items-center">
				{showIcon && <span className="absolute start-3 flex items-center pointer-events-none text-[var(--color-primary-400)]"><Icon size={14} /></span>}
				<input {...p} type={type}
					className={cn(
						'w-full h-10 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-100)]',
						'text-[var(--color-primary-900)] placeholder-[var(--color-primary-300)] text-sm',
						'focus:outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)] transition-all duration-200',
						showIcon ? 'ps-9 pe-3' : 'px-3', cls,
					)} />
			</div>
		</div>
	);
}

function Sel({ icon: Icon, label, options, value, onChange }) {
	return (
		<div>
			{label && <label className="flex items-center gap-1 mb-1 text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]">{Icon && <Icon size={9} />}{label}</label>}
			<div className="relative flex items-center">
				{Icon && <span className="absolute start-3 flex items-center pointer-events-none text-[var(--color-primary-400)]"><Icon size={14} /></span>}
				<select value={value} onChange={e => onChange(e.target.value)}
					className={cn(
						'w-full h-10 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-100)]',
						'text-[var(--color-primary-900)] text-sm appearance-none cursor-pointer pe-7',
						'focus:outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)] transition-all duration-200',
						Icon ? 'ps-9' : 'ps-3',
					)}>
					{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
				<span className="absolute end-2 pointer-events-none text-[var(--color-primary-400)]"><ChevronDown size={12} /></span>
			</div>
		</div>
	);
}

function Toggle({ checked, onChange }) {
	return (
		<button type="button" onClick={() => onChange(!checked)}
			className={cn('relative w-10 h-[22px] rounded-full border-none cursor-pointer transition-all duration-300 flex-shrink-0', checked ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-primary-200)]')}>
			<div className={cn('absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-300', checked ? 'start-[20px]' : 'start-[2px]')} />
		</button>
	);
}

// ─── Card primitives ──────────────────────────────────────────────────────────
function Card({ children, className }) {
	return <div className={cn('bg-white rounded-2xl overflow-hidden border border-[var(--color-primary-100)] shadow-sm', className)}>{children}</div>;
}

function CardHeader({ title, icon: Icon, action }) {
	return (
		<div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--color-primary-100)]">
			<div className="flex items-center gap-2">
				{Icon && <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white mn-hdr"><Icon size={12} /></div>}
				<span className="mn-serif text-[15px] text-[var(--color-primary-900)]">{title}</span>
			</div>
			{action}
		</div>
	);
}

function Empty({ icon: Icon, title, subtitle }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-5 text-center gap-2">
			<div className="w-11 h-11 rounded-2xl bg-[var(--color-primary-100)] border border-[var(--color-primary-200)] flex items-center justify-center text-[var(--color-primary-300)]"><Icon size={19} /></div>
			<div className="text-sm font-semibold text-[var(--color-primary-400)]">{title}</div>
			{subtitle && <div className="text-xs text-[var(--color-primary-300)] leading-relaxed max-w-[175px]">{subtitle}</div>}
		</div>
	);
}

function Skeleton({ h = 70 }) {
	return <div className="mn-shimmer rounded-2xl" style={{ height: h }} />;
}

function Progress({ value, color = 'primary', h = 4 }) {
	const fills = { primary: 'mn-save-btn', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500' };
	return (
		<div className="w-full rounded-full overflow-hidden bg-[var(--color-primary-200)]" style={{ height: h }}>
			<div className={cn('h-full rounded-full transition-all duration-700', fills[color])} style={{ width: `${Math.min(value, 100)}%` }} />
		</div>
	);
}

// ─── StatsCard — compact 4-col, mobile-first ─────────────────────────────────
function StatsCard({ income, expenses, commitments, remaining, t }) {
	const max = Math.max(income, expenses, commitments, Math.abs(remaining), 1);
	const rows = [
		{ k: 'income',      v: income,              sign: '+', vc: 'text-emerald-300', dc: 'bg-emerald-400', I: TrendingUp  },
		{ k: 'expenses',    v: expenses,             sign: '-', vc: 'text-rose-300',    dc: 'bg-rose-400',    I: TrendingDown },
		{ k: 'commitments', v: commitments,          sign: '-', vc: 'text-[var(--color-secondary-300)]', dc: 'bg-[var(--color-secondary-400)]', I: Lock },
		{ k: 'remaining',   v: Math.abs(remaining),  sign: remaining < 0 ? '-' : '', vc: remaining >= 0 ? 'text-sky-300' : 'text-rose-300', dc: remaining >= 0 ? 'bg-sky-400' : 'bg-rose-400', I: Wallet },
	];
	return (
		<div className="grid grid-cols-4 gap-1">
			{rows.map((r, i) => (
				<motion.div key={r.k}
					initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
					transition={{ delay: i * 0.055, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
					className="relative flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-2 overflow-hidden">
					{/* background fill bar */}
					<div className={cn('absolute bottom-0 inset-x-0 rounded-b-xl opacity-15', r.dc)}
						style={{ height: `${Math.round((r.v / max) * 100)}%` }} />
					{/* icon + label */}
					<div className="relative flex items-center gap-1">
						<r.I size={9} className={r.vc} />
						<span className="text-[7.5px] font-extrabold uppercase tracking-wider text-white/35 truncate leading-none">
							{t(`stats.${r.k}`)}
						</span>
					</div>
					{/* value */}
					<div className={cn('relative font-mono font-black tabular-nums leading-none text-[11px] sm:text-[12px]', r.vc)}>
						{r.sign}{fmt(r.v)}
					</div>
					{/* micro bar */}
					<div className="relative h-[1.5px] w-full rounded-full bg-white/10 overflow-hidden">
						<div className={cn('h-full rounded-full', r.dc)} style={{ width: `${Math.round((r.v / max) * 100)}%` }} />
					</div>
				</motion.div>
			))}
		</div>
	);
}

// ─── Summary pills — 4-col compact ───────────────────────────────────────────
function SummaryPills({ currentMoneyBalance, monthlyBalance, realAccountsTotal, mode }) {
	const pills = [
		{ l: 'Current',  v: currentMoneyBalance,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  I: Wallet     },
		{ l: 'Monthly',  v: monthlyBalance,        cls: 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]', I: BarChart3  },
		{ l: 'Accounts', v: realAccountsTotal,     cls: 'bg-amber-50 text-amber-700 border-amber-200',        I: CreditCard },
		{ l: 'Mode',     v: mode === 'month' ? 'Month' : 'Today', cls: 'bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)] border-[var(--color-secondary-200)]', I: Clock, isText: true },
	];
	return (
		<div className="grid grid-cols-4 gap-1 mt-1.5">
			{pills.map(p => (
				<div key={p.l} className={cn('rounded-xl border px-2 py-1.5', p.cls)}>
					<div className="flex items-center justify-between mb-0.5">
						<span className="text-[7.5px] font-extrabold uppercase tracking-widest opacity-55">{p.l}</span>
						<p.I size={8} />
					</div>
					<div className="font-mono text-[10.5px] sm:text-[11px] font-bold tabular-nums leading-snug">
						{p.isText ? p.v : fmt(p.v)}
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Balance mode switch ──────────────────────────────────────────────────────
function BalanceModeSwitch({ value, onChange }) {
	return (
		<div className="inline-flex items-center rounded-full bg-white/10 border border-white/15 p-0.5 backdrop-blur-sm">
			{['today', 'month'].map(m => (
				<button key={m} onClick={() => onChange(m)}
					className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border-none', value === m ? 'bg-white text-[var(--color-primary-700)] shadow' : 'text-white/65 hover:text-white bg-transparent')}>
					{m === 'today' ? 'Until Today' : 'This Month'}
				</button>
			))}
		</div>
	);
}

// ─── Credit card ──────────────────────────────────────────────────────────────
function CreditCardDisplay({ balance, income, expenses, commitments, remaining, currency, spendRate, t, balanceMode }) {
	const sc = spendRate < 60 ? 'text-emerald-400' : spendRate < 80 ? 'text-amber-400' : 'text-rose-400';
	const sb = spendRate < 60 ? 'bg-emerald-400' : spendRate < 80 ? 'bg-amber-400' : 'bg-rose-400';
	return (
		<div className="relative w-full select-none">
			<div className="relative w-full rounded-2xl overflow-hidden mn-card-bg" style={{ minHeight: 185 }}>
				<div className="mn-holo absolute inset-0 pointer-events-none z-10" />
				<div className="absolute inset-0 opacity-[0.05] pointer-events-none z-10"
					style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
				<div className="absolute -top-14 -end-14 w-44 h-44 rounded-full border border-white/10 pointer-events-none" />
				<div className="absolute -bottom-10 -start-6 w-36 h-36 rounded-full bg-white/[0.025] pointer-events-none" />

				{/* chip + wifi */}
				<div className="relative z-20 flex items-start justify-between px-4 pt-3.5">
					<div className="relative mn-chip w-8 h-5 rounded-[4px] overflow-hidden flex-shrink-0"
						style={{ background: 'linear-gradient(135deg,#d4af37,#f5e77a 40%,#c8960c 70%,#e8c84a)' }}>
						<div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px p-0.5">
							{Array.from({ length: 9 }).map((_, i) => <div key={i} className="rounded-[1px] opacity-50" style={{ background: 'rgba(100,65,0,.6)' }} />)}
						</div>
					</div>
					<Wifi size={13} className="text-white/25" strokeWidth={1.5} />
				</div>

				{/* balance */}
				<div className="relative z-20 px-4 pt-1.5">
					<div className="text-[8px] font-bold tracking-[0.16em] uppercase text-white/30 mb-0.5">
						{balanceMode === 'month' ? 'Month Balance' : 'Current Money'}
					</div>
					<div className="mn-serif text-[34px] text-white leading-none tracking-[-1.5px] drop-shadow">
						{fmt(balance)}<span className="text-xs opacity-45 ms-1.5 font-normal tracking-normal">{currency}</span>
					</div>
				</div>

				{/* spend rate */}
				{spendRate > 0 && (
					<div className="relative z-20 px-4 mt-2">
						<div className="flex items-center justify-between mb-0.5">
							<span className="text-[7.5px] font-bold uppercase tracking-widest text-white/25">{t('months.spendRate')}</span>
							<span className={cn('text-[9px] font-black tabular-nums', sc)}>{spendRate}%</span>
						</div>
						<div className="h-[2px] w-full rounded-full bg-white/12 overflow-hidden">
							<div className={cn('h-full rounded-full transition-all duration-700', sb)} style={{ width: `${Math.min(spendRate, 100)}%` }} />
						</div>
					</div>
				)}

				{/* stats */}
				<div className="relative z-20 px-4 mt-2.5 pb-3.5">
					<StatsCard income={income} expenses={expenses} commitments={commitments} remaining={remaining} t={t} />
				</div>
			</div>
		</div>
	);
}

// ─── Panels ───────────────────────────────────────────────────────────────────
function DesktopPanel({ open, onClose, title, children, isRTL }) {
	useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
	if (typeof document === 'undefined') return null;
	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div key="ov" className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} onClick={onClose} />
					<motion.div key="pnl" dir={isRTL ? 'rtl' : 'ltr'}
						className={cn('fixed top-0 bottom-0 z-[61] w-[min(460px,92vw)] bg-white flex flex-col overflow-hidden mn-panel-shadow',
							isRTL ? 'left-0 rounded-r-3xl border-e border-[var(--color-primary-100)]' : 'right-0 rounded-l-3xl border-s border-[var(--color-primary-100)]')}
						initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
						transition={{ duration: .35, ease: [0.16, 1, 0.3, 1] }}>
						<div className="relative flex items-center justify-between px-4 py-3.5 flex-shrink-0 mn-hdr">
							<div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
							<div className="relative z-10 flex items-center gap-2">
								<div className="w-7 h-7 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center text-white"><Sparkles size={12} /></div>
								<span className="mn-serif text-[17px] text-white">{title}</span>
							</div>
							<button onClick={onClose} className="relative z-10 w-7 h-7 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors"><X size={13} /></button>
						</div>
						<div className="flex-1 overflow-y-auto">{children}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body,
	);
}

function BottomSheet({ open, onClose, title, children }) {
	useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
	if (typeof document === 'undefined') return null;
	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div key="bov" className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .22 }} onClick={onClose} />
					<motion.div key="bs" className=" w-[calc(100%-10px)] fixed bottom-0 left-0 right-0 z-[51] bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[91vh] overflow-hidden pb-6"
						initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: .35, ease: [0.16, 1, 0.3, 1] }}>
						<div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
							<div className="w-8 h-1 rounded-full bg-[var(--color-primary-200)]" />
						</div>
						{title && (
							<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-primary-100)] flex-shrink-0">
								<span className="mn-serif text-[16px] text-[var(--color-primary-900)]">{title}</span>
								<button onClick={onClose} className="w-7 h-7 rounded-full bg-[var(--color-primary-100)] border-none cursor-pointer flex items-center justify-center text-[var(--color-primary-400)] hover:bg-[var(--color-primary-200)] transition-colors"><X size={13} /></button>
							</div>
						)}
						<div className="flex-1 overflow-y-auto">{children}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body,
	);
}

function Panel({ open, onClose, title, children, mob, isRTL }) {
	return mob
		? <BottomSheet open={open} onClose={onClose} title={title}>{children}</BottomSheet>
		: <DesktopPanel open={open} onClose={onClose} title={title} isRTL={isRTL}>{children}</DesktopPanel>;
}

// ─── ForecastPanel ────────────────────────────────────────────────────────────
function ForecastPanel({ open, onClose, income, expenses, commitments, expected, locale, t, mob, isRTL }) {
	const [fromDate, setFromDate] = useState(today);
	const [months, setMonths] = useState(3);
	const toDate = useMemo(() => { const d = new Date(fromDate); d.setMonth(d.getMonth() + Number(months)); return d.toISOString().split('T')[0]; }, [fromDate, months]);
	const inRange = useCallback((items, key) => { const [f, to] = [new Date(fromDate), new Date(toDate)]; return items.filter(i => { const d = new Date(i[key] || i.date); return d >= f && d <= to; }); }, [fromDate, toDate]);
	const calcP = useCallback((items, key) => {
		let t = inRange(items, key).reduce((s, i) => s + Number(i.amount || 0), 0);
		items.filter(i => i.recurring).forEach(item => {
			const d = new Date(item[key] || item.date); const [f, to] = [new Date(fromDate), new Date(toDate)];
			if (d < f) { const em = item.recurrenceType === 'weekly' ? .25 : item.recurrenceType === 'custom_months' ? Number(item.recurrenceEvery || 1) : 1; if (em > 0) t += Math.floor(((to - f) / (1000 * 60 * 60 * 24 * 30)) / em) * Number(item.amount || 0); }
		});
		return t;
	}, [inRange, fromDate, toDate]);
	const projI = useMemo(() => calcP(income, 'date'), [income, calcP]);
	const projE = useMemo(() => calcP(expenses, 'date'), [expenses, calcP]);
	const projC = useMemo(() => calcP(commitments, 'dueDate'), [commitments, calcP]);
	const projX = useMemo(() => inRange(expected || [], 'expectedDate').reduce((s, i) => s + Number(i.amount || 0), 0), [expected, inRange]);
	const net = projI + projX - projE - projC;
	const sRate = (projI + projX) > 0 ? Math.round(((projE + projC) / (projI + projX)) * 100) : 0;
	const presets = [{ v: 1, l: t('forecast.oneMonth') }, { v: 3, l: t('forecast.threeMonths') }, { v: 6, l: t('forecast.sixMonths') }, { v: 12, l: t('forecast.oneYear') }];
	const cards = [
		{ l: t('forecast.income'),     v: projI, px: '+', cl: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', ib: 'bg-emerald-500',   I: TrendingUp  },
		{ l: t('forecast.expenses'),   v: projE, px: '-', cl: 'text-rose-700',    bg: 'bg-rose-50 border-rose-100',       ib: 'bg-rose-500',     I: TrendingDown },
		{ l: t('forecast.commitments'),v: projC, px: '-', cl: 'text-[var(--color-primary-700)]', bg: 'bg-[var(--color-primary-100)] border-[var(--color-primary-200)]', ib: 'bg-[var(--color-primary-500)]', I: Lock  },
		{ l: t('forecast.expected'),   v: projX, px: '+', cl: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100',     ib: 'bg-amber-500',    I: Star   },
		{ l: t('forecast.netBalance'), v: net,   px: net >= 0 ? '+' : '', cl: net >= 0 ? 'text-emerald-700' : 'text-rose-700', bg: net >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100', ib: net >= 0 ? 'bg-emerald-500' : 'bg-rose-500', I: Wallet },
	];
	return (
		<Panel open={open} onClose={onClose} title={t('forecast.title')} mob={mob} isRTL={isRTL}>
			<div className="flex flex-col gap-3.5 px-4 py-4">
				<div className="grid grid-cols-2 gap-2">
					<Inp label={t('forecast.from')} type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
					<div>
						<label className="block mb-1 text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]">{t('forecast.to')}</label>
						<div className="h-10 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-100)] flex items-center px-3 text-sm font-semibold text-[var(--color-primary-700)]">{fmtD(toDate, locale)}</div>
					</div>
				</div>
				<div className="flex gap-1.5 overflow-x-auto mn-hide-scroll">
					{presets.map(p => (
						<button key={p.v} onClick={() => setMonths(p.v)}
							className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all border whitespace-nowrap', months === p.v ? 'text-white border-transparent mn-save-btn shadow' : 'bg-white border-[var(--color-primary-200)] text-[var(--color-primary-500)] hover:border-[var(--color-primary-400)]')}>
							{p.l}
						</button>
					))}
				</div>
				<div className="grid grid-cols-2 gap-2">
					{cards.map(c => (
						<div key={c.l} className={cn('rounded-2xl border p-3 relative overflow-hidden', c.bg)}>
							<div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
							<div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white mb-1.5 relative z-10', c.ib)}><c.I size={13} /></div>
							<div className={cn('text-[8.5px] font-extrabold uppercase tracking-wider mb-0.5 opacity-60 relative z-10', c.cl)}>{c.l}</div>
							<div className={cn('mn-serif text-[18px] leading-tight relative z-10 tabular-nums', c.cl)}>{c.px}{fmt(Math.abs(c.v))}</div>
						</div>
					))}
				</div>
				{(projI + projX) > 0 && (
					<Card>
						<div className="px-4 py-3 flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[var(--color-primary-400)]">{t('forecast.spendRate')}</span>
								<span className={cn('text-sm font-black', sRate < 60 ? 'text-emerald-600' : sRate < 80 ? 'text-amber-600' : 'text-rose-600')}>{sRate}%</span>
							</div>
							<Progress value={sRate} color={sRate < 60 ? 'green' : sRate < 80 ? 'amber' : 'red'} h={6} />
						</div>
					</Card>
				)}
			</div>
		</Panel>
	);
}

// ─── AddForm ──────────────────────────────────────────────────────────────────
function AddForm({ t, onSave, onClose, loading, initialData }) {
	const isEdit = !!initialData;
	const [f, setF] = useState(() => initialData ? {
		type: initialData._formType || 'income', source: initialData.source || '', desc: initialData.description || initialData.name || '',
		amount: initialData.amount || '', date: initialData.date || initialData.dueDate || today,
		zakatDesc: initialData.description || '', recurring: initialData.recurring || false,
		recurrenceType: initialData.recurrenceType || 'monthly', recurrenceEvery: initialData.recurrenceEvery || 1,
		commitType: initialData.type || 'التزام', jamiaStart: initialData.jamiaStart || '', jamiaEnd: initialData.jamiaEnd || '', jamiaMyMonth: initialData.jamiaMyMonth || '',
	} : { type: 'income', source: '', desc: '', amount: '', date: today, zakatDesc: '', recurring: false, recurrenceType: 'monthly', recurrenceEvery: 1, commitType: 'التزام', jamiaStart: '', jamiaEnd: '', jamiaMyMonth: '' });
	const set = (k, v) => setF(p => ({ ...p, [k]: v }));
	const types = [
		{ v: 'income',     l: t('form.types.income'),     I: TrendingUp,  ab: 'bg-emerald-50', abo: 'border-emerald-300', at: 'text-emerald-700', ion: 'bg-emerald-500'  },
		{ v: 'expense',    l: t('form.types.expense'),    I: TrendingDown, ab: 'bg-rose-50',    abo: 'border-rose-300',    at: 'text-rose-700',    ion: 'bg-rose-500'    },
		{ v: 'commitment', l: t('form.types.commitment'), I: Lock,  ab: 'bg-[var(--color-primary-100)]', abo: 'border-[var(--color-primary-400)]', at: 'text-[var(--color-primary-700)]', ion: 'bg-[var(--color-primary-500)]' },
		{ v: 'zakat',      l: t('form.types.zakat'),      I: Heart,       ab: 'bg-amber-50',   abo: 'border-amber-300',   at: 'text-amber-700',   ion: 'bg-amber-500'   },
	];
	const ct  = [{ v: 'التزام', l: t('form.commitmentTypes.fixed') }, { v: 'اشتراك', l: t('form.commitmentTypes.subscription') }, { v: 'جمعية', l: t('form.commitmentTypes.jamia') }];
	const rec = [{ value: 'monthly', label: t('form.recurrence.monthly') }, { value: 'weekly', label: t('form.recurrence.weekly') }, { value: 'custom_months', label: t('form.recurrence.customMonths') }];
	const valid = f.amount && (f.source?.trim() || f.desc?.trim() || f.zakatDesc?.trim());
	return (
		<>
			<div className="flex flex-col gap-3 p-4">
				{!isEdit && (
					<div className="grid grid-cols-2 gap-2">
						{types.map(({ v, l, I, ab, abo, at, ion }) => {
							const on = f.type === v;
							return (
								<button key={v} type="button" onClick={() => set('type', v)}
									className={cn('flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-150 text-start active:scale-95', on ? cn(ab, abo) : 'bg-[var(--color-primary-100)] border-[var(--color-primary-200)] hover:border-[var(--color-primary-300)]')}>
									<div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white transition-all', on ? ion : 'bg-[var(--color-primary-200)]')}><I size={14} className={on ? 'text-white' : 'text-[var(--color-primary-400)]'} /></div>
									<span className={cn('text-[11px] font-bold flex-1 leading-tight', on ? at : 'text-[var(--color-primary-500)]')}>{l}</span>
									{on && <Check size={11} className={at} />}
								</button>
							);
						})}
					</div>
				)}
				{f.type === 'commitment' && (
					<div className="flex gap-1.5">
						{ct.map(({ v, l }) => (
							<button key={v} type="button" onClick={() => set('commitType', v)}
								className={cn('flex-1 h-9 rounded-xl text-[11px] font-bold cursor-pointer transition-all border', f.commitType === v ? 'bg-[var(--color-primary-100)] border-[var(--color-primary-400)] text-[var(--color-primary-700)]' : 'bg-white border-[var(--color-primary-200)] text-[var(--color-primary-400)] hover:bg-[var(--color-primary-100)]')}>
								{l}
							</button>
						))}
					</div>
				)}
				<div className="flex flex-col gap-2">
					{f.type === 'income'     && <Inp icon={Building2} value={f.source}   onChange={e => set('source', e.target.value)}   placeholder={t('form.placeholders.source')} />}
					{(f.type === 'expense' || f.type === 'commitment') && <Inp icon={AlignLeft} value={f.desc} onChange={e => set('desc', e.target.value)} placeholder={t('form.placeholders.description')} />}
					{f.type === 'zakat'      && <Inp icon={Heart}    value={f.zakatDesc} onChange={e => set('zakatDesc', e.target.value)} placeholder={t('form.placeholders.zakatDescription')} />}
					<div className="grid grid-cols-2 gap-2">
						<Inp icon={DollarSign} type="number" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder={t('form.placeholders.amount')} />
						<Inp type="date" value={f.date} onChange={e => set('date', e.target.value)} />
					</div>
				</div>
				{f.type !== 'zakat' && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-100)]">
							<span className="text-sm font-medium text-[var(--color-primary-700)]">{t('form.recurringQuestion')}</span>
							<Toggle checked={f.recurring} onChange={v => set('recurring', v)} />
						</div>
						{f.recurring && (
							<>
								<Sel icon={RefreshCw} value={f.recurrenceType} onChange={v => set('recurrenceType', v)} options={rec} />
								{f.recurrenceType === 'custom_months' && <Inp icon={Hash} type="number" value={f.recurrenceEvery} onChange={e => set('recurrenceEvery', e.target.value)} placeholder={t('form.placeholders.recurrenceEvery')} />}
							</>
						)}
					</div>
				)}
				{f.type === 'commitment' && f.commitType === 'جمعية' && (
					<div className="flex flex-col gap-2">
						<div className="grid grid-cols-2 gap-2">
							<Inp label="Start" type="date" value={f.jamiaStart}   onChange={e => set('jamiaStart', e.target.value)} />
							<Inp label="End"   type="date" value={f.jamiaEnd}     onChange={e => set('jamiaEnd', e.target.value)} />
						</div>
						<Inp label="My Month" type="date" value={f.jamiaMyMonth} onChange={e => set('jamiaMyMonth', e.target.value)} />
					</div>
				)}
			</div>
			<div className="flex gap-2 px-4 py-3 border-t border-[var(--color-primary-100)] flex-shrink-0 bg-white">
				<button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--color-primary-200)] bg-transparent text-[var(--color-primary-500)] text-sm font-semibold cursor-pointer hover:bg-[var(--color-primary-100)] transition-colors">{t('common.cancel')}</button>
				<button onClick={() => valid && onSave(f)} disabled={!valid || loading}
					className="flex-[2] h-10 rounded-xl border-none text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 mn-save-btn shadow-lg">
					<Check size={13} />{loading ? t('common.saving') : t('common.save')}
				</button>
			</div>
		</>
	);
}

function ExpectedForm({ t, onSave, onClose, loading, initialData }) {
	const [f, setF] = useState({ description: initialData?.description || '', amount: initialData?.amount || '', expectedDate: initialData?.expectedDate || today, notes: initialData?.notes || '' });
	const set = (k, v) => setF(p => ({ ...p, [k]: v }));
	const valid = f.description && f.amount && f.expectedDate;
	return (
		<>
			<div className="flex flex-col gap-3 p-4">
				<Inp icon={AlignLeft} label="Description" value={f.description} onChange={e => set('description', e.target.value)} placeholder="Expected income" />
				<div className="grid grid-cols-2 gap-2">
					<Inp icon={DollarSign} label="Amount" type="number" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
					<Inp label="Date" type="date" value={f.expectedDate} onChange={e => set('expectedDate', e.target.value)} />
				</div>
				<Inp icon={FileText} label="Notes" value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
			</div>
			<div className="flex gap-2 px-4 py-3 border-t border-[var(--color-primary-100)] flex-shrink-0 bg-white">
				<button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--color-primary-200)] bg-transparent text-[var(--color-primary-500)] text-sm font-semibold cursor-pointer hover:bg-[var(--color-primary-100)] transition-colors">Cancel</button>
				<button onClick={() => valid && onSave(f)} disabled={!valid || loading}
					className="flex-[2] h-10 rounded-xl border-none text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 bg-gradient-to-r from-amber-400 to-amber-500 shadow-lg shadow-amber-200 transition-all duration-200">
					<Check size={13} />{loading ? 'Saving…' : 'Save'}
				</button>
			</div>
		</>
	);
}

function WalletForm({ onSave, onClose, loading, initialData }) {
	const [f, setF] = useState({ name: initialData?.name || '', type: initialData?.type || 'cash', currency: initialData?.currency || 'EGP', openingBalance: initialData?.openingBalance || '', isDefault: !!initialData?.isDefault, notes: initialData?.notes || '' });
	const set = (k, v) => setF(p => ({ ...p, [k]: v }));
	const valid = f.name && f.openingBalance !== '';
	const typeOpts = [{ value: 'cash', label: 'Cash' }, { value: 'vodafone_cash', label: 'Vodafone Cash' }, { value: 'bank', label: 'Bank' }, { value: 'mastercard', label: 'Mastercard' }, { value: 'other', label: 'Other' }];
	const currOpts = [{ value: 'EGP', label: 'EGP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }];
	return (
		<>
			<div className="flex flex-col gap-3 p-4">
				<Inp icon={Wallet} label="Account Name" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Wallet / Bank / Mastercard" />
				<div className="grid grid-cols-2 gap-2">
					<Sel icon={Layers} label="Type" value={f.type} onChange={v => set('type', v)} options={typeOpts} />
					<Sel icon={DollarSign} label="Currency" value={f.currency} onChange={v => set('currency', v)} options={currOpts} />
				</div>
				<Inp icon={DollarSign} label="Balance" type="number" value={f.openingBalance} onChange={e => set('openingBalance', e.target.value)} placeholder="0" />
				<Inp icon={FileText} label="Notes" value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
				<div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-100)]">
					<div>
						<div className="text-sm font-medium text-[var(--color-primary-700)]">Default account</div>
						<div className="text-[11px] text-[var(--color-primary-400)]">Main manual account</div>
					</div>
					<Toggle checked={f.isDefault} onChange={v => set('isDefault', v)} />
				</div>
			</div>
			<div className="flex gap-2 px-4 py-3 border-t border-[var(--color-primary-100)] flex-shrink-0 bg-white">
				<button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--color-primary-200)] bg-transparent text-[var(--color-primary-500)] text-sm font-semibold cursor-pointer hover:bg-[var(--color-primary-100)] transition-colors">Cancel</button>
				<button onClick={() => valid && onSave(f)} disabled={!valid || loading}
					className="flex-[2] h-10 rounded-xl border-none text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 mn-save-btn shadow-lg transition-all duration-200">
					<Check size={13} />{loading ? 'Saving…' : 'Save'}
				</button>
			</div>
		</>
	);
}

// ─── Tab banners ──────────────────────────────────────────────────────────────
function TotalBanner({ total, color, icon: Icon, label, currency }) {
	return (
		<div className={cn('rounded-2xl border p-3 relative overflow-hidden', color.border, color.bg)}>
			<div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
			<div className="relative z-10 flex items-center gap-3">
				<div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow', color.icon)}><Icon size={17} /></div>
				<div className="flex-1 min-w-0">
					<div className={cn('text-[8.5px] font-extrabold uppercase tracking-widest mb-0.5 opacity-60', color.text)}>{label}</div>
					<div className={cn('mn-serif text-[24px] leading-tight', color.text)}>{fmt(total)} <span className="text-xs opacity-50">{currency}</span></div>
				</div>
				{color.arrow && <color.arrow size={22} className={color.arrowColor} />}
			</div>
		</div>
	);
}

function walletTypeMeta(type) {
	const map = {
		bank:          { icon: LandmarkIcon, badge: 'Bank',       cls: 'bg-blue-50 text-blue-700 border-blue-200',     wrap: 'bg-blue-50 text-blue-500' },
		mastercard:    { icon: CreditCard,   badge: 'Mastercard', cls: 'bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)] border-[var(--color-secondary-200)]', wrap: 'bg-[var(--color-secondary-100)] text-[var(--color-secondary-500)]' },
		vodafone_cash: { icon: Wallet,       badge: 'Vodafone',   cls: 'bg-rose-50 text-rose-700 border-rose-200',     wrap: 'bg-rose-50 text-rose-500' },
	};
	return map[type] ?? { icon: Banknote, badge: 'Cash', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', wrap: 'bg-emerald-50 text-emerald-500' };
}

function WalletsTab({ data, total, onEdit, onDelete }) {
	if (!data.length) return <Card><Empty icon={Wallet} title="No manual accounts yet" subtitle="Add cash, Vodafone, bank, or Mastercard." /></Card>;
	return (
		<div className="flex flex-col gap-3">
			<TotalBanner total={total} currency="EGP" label="Real Accounts Total" icon={Wallet}
				color={{ bg: 'bg-gradient-to-br from-amber-50 to-white', border: 'border-amber-100', text: 'text-amber-700', icon: 'bg-gradient-to-br from-amber-400 to-amber-500', arrow: ArrowUpRight, arrowColor: 'text-amber-300' }} />
			<Card>
				<CardHeader title="Manual Accounts" icon={CreditCard} action={<Badge color="amber">{data.length}</Badge>} />
				<div className="overflow-x-auto">
					<table className="mn-table">
						<thead><tr><th>Name</th><th>Type</th><th>Balance</th><th>Def.</th><th className="text-end">Act.</th></tr></thead>
						<tbody>
							{data.map(item => {
								const m = walletTypeMeta(item.type);
								const Icon = m.icon;
								return (
									<tr key={item.id}>
										<td>
											<div className="flex items-center gap-2">
												<div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', m.wrap)}><Icon size={12} /></div>
												<div>
													<div className="font-semibold text-[var(--color-primary-900)] text-[12.5px]">{item.name}</div>
													{item.notes && <div className="text-[10px] text-[var(--color-primary-400)]">{item.notes}</div>}
												</div>
											</div>
										</td>
										<td><Badge color="primary">{m.badge}</Badge></td>
										<td><span className="font-mono font-bold text-[var(--color-primary-700)] tabular-nums text-[12px]">{fmt(item.openingBalance)}</span></td>
										<td>{item.isDefault ? <Badge color="green">✓</Badge> : <Badge color="muted">—</Badge>}</td>
										<td><TableActions row={item} onEdit={onEdit} onDelete={r => onDelete(r.id)} editTooltip="Edit" deleteTooltip="Delete" deleteConfirm="Delete this account?" /></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<div className="px-3 py-2 border-t border-[var(--color-primary-100)] bg-[var(--color-primary-100)]">
					<p className="text-[10px] text-[var(--color-primary-400)]">Manual balances — not auto-synced.</p>
				</div>
			</Card>
		</div>
	);
}

function IncomeTab({ data, locale, t, onEdit, onDelete }) {
	const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
	if (!data.length) return <Card><Empty icon={TrendingUp} title={t('states.noIncome')} subtitle={t('states.addFirst')} /></Card>;
	return (
		<div className="flex flex-col gap-3">
			<TotalBanner total={total} currency={t('common.currency')} label={t('income.total')} icon={TrendingUp}
				color={{ bg: 'bg-gradient-to-br from-emerald-50 to-white', border: 'border-emerald-100', text: 'text-emerald-700', icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600', arrow: ArrowUpRight, arrowColor: 'text-emerald-300' }} />
			<Card>
				<div className="overflow-x-auto">
					<table className="mn-table">
						<thead><tr><th>{t('table.source')}</th><th>{t('table.amount')}</th><th>{t('table.date')}</th><th>{t('table.type')}</th><th className="text-end">{t('table.actions')}</th></tr></thead>
						<tbody>
							{data.map(item => (
								<tr key={item.id}>
									<td><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><Briefcase size={11} className="text-emerald-500" /></div><span className="font-semibold text-[var(--color-primary-900)] text-nowrap text-[12.5px]">{item.source}</span></div></td>
									<td><span className="font-mono font-bold text-emerald-600 tabular-nums text-[12px]">+{fmt(item.amount)}</span></td>
									<td><Badge color="muted">{fmtD(item.date, locale)}</Badge></td>
									<td>{item.recurring ? <Badge color="primary" icon={Repeat}>{item.recurrenceType || 'monthly'}</Badge> : <Badge color="muted">{t('table.oneTime')}</Badge>}</td>
									<td><TableActions row={item} onEdit={r => onEdit(r, 'income')} onDelete={r => onDelete(r.id, 'income')} editTooltip={t('common.edit')} deleteTooltip={t('common.delete')} deleteConfirm={t('common.deleteConfirm')} /></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
}

function ExpensesTab({ data, locale, t, onEdit, onDelete }) {
	const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
	if (!data.length) return <Card><Empty icon={Receipt} title={t('states.noExpenses')} subtitle={t('states.addFirst')} /></Card>;
	return (
		<div className="flex flex-col gap-3">
			<TotalBanner total={total} currency={t('common.currency')} label={t('expenses.total')} icon={TrendingDown}
				color={{ bg: 'bg-gradient-to-br from-rose-50 to-white', border: 'border-rose-100', text: 'text-rose-700', icon: 'bg-gradient-to-br from-rose-500 to-rose-600', arrow: ArrowDownRight, arrowColor: 'text-rose-300' }} />
			<Card>
				<div className="overflow-x-auto">
					<table className="mn-table">
						<thead><tr><th>{t('table.description')}</th><th>{t('table.amount')}</th><th>{t('table.date')}</th><th>{t('table.type')}</th><th className="text-end">{t('table.actions')}</th></tr></thead>
						<tbody>
							{data.map(item => (
								<tr key={item.id}>
									<td><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0"><Receipt size={11} className="text-rose-500" /></div><span className="font-semibold text-[var(--color-primary-900)] text-nowrap text-[12.5px]">{item.description}</span></div></td>
									<td><span className="font-mono font-bold text-rose-600 tabular-nums text-[12px]">-{fmt(item.amount)}</span></td>
									<td><Badge color="muted">{fmtD(item.date, locale)}</Badge></td>
									<td>{item.recurring ? <Badge color="red" icon={Repeat}>{item.recurrenceType || 'monthly'}</Badge> : <Badge color="muted">{t('table.oneTime')}</Badge>}</td>
									<td><TableActions row={item} onEdit={r => onEdit(r, 'expense')} onDelete={r => onDelete(r.id, 'expense')} editTooltip={t('common.edit')} deleteTooltip={t('common.delete')} deleteConfirm={t('common.deleteConfirm')} /></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
}

function CommitmentsTab({ data, locale, t, onToggle, togglingId, onEdit, onDelete }) {
	const [filter, setFilter] = useState('all');
	const filters = [{ v: 'all', l: t('commitments.filters.all') }, { v: 'التزام', l: t('commitments.filters.fixed') }, { v: 'اشتراك', l: t('commitments.filters.subscription') }, { v: 'جمعية', l: t('commitments.filters.jamia') }];
	const fd = filter === 'all' ? data : data.filter(i => i.type === filter);
	const paid = data.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);
	const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
	const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
	if (!data.length) return <Card><Empty icon={Lock} title={t('states.noCommitments')} subtitle={t('states.addFirst')} /></Card>;
	return (
		<div className="flex flex-col gap-3">
			<div className="rounded-2xl border border-[var(--color-primary-200)] bg-gradient-to-br from-[var(--color-primary-100)] to-white p-3">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl mn-save-btn flex items-center justify-center text-white shadow"><Lock size={14} /></div>
						<div>
							<div className="text-[8.5px] font-extrabold uppercase tracking-widest text-[var(--color-primary-400)] mb-0.5">{t('commitments.title')}</div>
							<div className="mn-serif text-[19px] text-[var(--color-primary-700)] leading-tight">{fmt(total)} <span className="text-xs opacity-55">{t('common.currency')}</span></div>
						</div>
					</div>
					<div className="text-end">
						<div className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-primary-400)] mb-0.5">{t('commitments.paid')}</div>
						<div className="text-lg font-black text-emerald-600 tabular-nums">{pct}%</div>
					</div>
				</div>
				<Progress value={pct} color={pct < 50 ? 'amber' : 'green'} h={5} />
			</div>
			<div className="flex gap-1.5 overflow-x-auto mn-hide-scroll">
				{filters.map(f => (
					<button key={f.v} onClick={() => setFilter(f.v)}
						className={cn('flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10.5px] font-semibold cursor-pointer transition-all border whitespace-nowrap', filter === f.v ? 'border-transparent text-white mn-save-btn shadow' : 'bg-white border-[var(--color-primary-200)] text-[var(--color-primary-500)] hover:border-[var(--color-primary-400)]')}>
						{f.l}
					</button>
				))}
			</div>
			{fd.length ? (
				<Card>
					<div className="overflow-x-auto">
						<table className="mn-table">
							<thead><tr><th>{t('table.name')}</th><th>{t('table.amount')}</th><th>{t('table.dueDate')}</th><th>{t('table.status')}</th><th className="text-end">{t('table.actions')}</th></tr></thead>
							<tbody>
								{fd.map(item => {
									const ip = item.status === 'paid';
									const TI = item.type === 'اشتراك' ? RefreshCw : item.type === 'جمعية' ? Users : Lock;
									return (
										<tr key={item.id} className={ip ? 'opacity-55' : ''}>
											<td>
												<div className="flex items-center gap-2">
													<div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0', ip ? 'bg-emerald-50 text-emerald-500' : 'bg-[var(--color-primary-100)] text-[var(--color-primary-500)]')}><TI size={11} /></div>
													<div>
														<div className={cn('font-semibold text-nowrap text-[var(--color-primary-900)] text-[12.5px]', ip && 'line-through text-[var(--color-primary-400)]')}>{item.name}</div>
														<Badge color="primary">{item.type}</Badge>
													</div>
												</div>
											</td>
											<td><span className="font-mono font-bold text-[var(--color-primary-600)] tabular-nums text-[12px]">{fmt(item.amount)}</span></td>
											<td><Badge color="muted">{fmtD(item.dueDate, locale)}</Badge></td>
											<td>
												<button onClick={() => onToggle(item.id)} disabled={togglingId === item.id}
													className={cn('text-nowrap text-[9.5px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-all border-none disabled:opacity-50', ip ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}>
													{togglingId === item.id ? '…' : ip ? `✓ ${t('commitments.markedPaid')}` : t('commitments.markAsPaid')}
												</button>
											</td>
											<td><TableActions row={item} onEdit={r => onEdit(r, 'commitment')} onDelete={r => onDelete(r.id, 'commitment')} editTooltip={t('common.edit')} deleteTooltip={t('common.delete')} deleteConfirm={t('common.deleteConfirm')} /></td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</Card>
			) : <Card><Empty icon={Lock} title={t('states.noCommitments')} /></Card>}
		</div>
	);
}

function ZakatTab({ incTotal, expTotal, log, locale, t, onDelete }) {
	const [mode, setMode] = useState('net');
	const [custom, setCst] = useState('');
	const [pct, setPct] = useState(2.5);
	const base = mode === 'net' ? Math.max(incTotal - expTotal, 0) : mode === 'total' ? incTotal : Number(custom || 0);
	const due  = Math.round((base * pct) / 100);
	const paid = log.reduce((s, i) => s + Number(i.amount || 0), 0);
	const rem  = Math.max(due - paid, 0);
	const prog = due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 0;
	const nisab = base >= 85 * 55.5;
	const R = 36, C = 2 * Math.PI * R, off = C - (prog / 100) * C;
	return (
		<div className="flex flex-col gap-3">
			<div className="relative rounded-2xl overflow-hidden text-white"
				style={{ background: 'linear-gradient(135deg,#064e3b,#065f46 35%,#047857 65%,#059669)', boxShadow: '0 18px 38px -8px rgba(6,78,59,.42)' }}>
				<div className="absolute top-0 end-0 w-52 h-52 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
				<div className="relative z-10 p-4">
					<div className="flex items-center justify-between mb-3.5">
						<div className="flex items-center gap-2.5">
							<div className="w-9 h-9 rounded-xl bg-white/12 border border-white/18 flex items-center justify-center"><Landmark size={16} /></div>
							<div>
								<div className="text-[14px] font-bold">{t('zakat.title')}</div>
								<div className="text-[9.5px] text-white/40 mt-0.5">{t('zakat.subtitle')}</div>
							</div>
						</div>
						<div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold border', nisab ? 'bg-emerald-400/20 border-emerald-400/30 text-emerald-200' : 'bg-white/10 border-white/18 text-white/45')}>
							<span className={cn('w-1.5 h-1.5 rounded-full', nisab ? 'bg-emerald-400' : 'bg-white/30')} />
							{nisab ? t('zakat.reachedNisab') : t('zakat.notReachedNisab')}
						</div>
					</div>
					<div className="flex items-center gap-3.5">
						<div className="relative flex-shrink-0 w-[82px] h-[82px]">
							<svg width="82" height="82" viewBox="0 0 82 82" className="-rotate-90" aria-hidden>
								<circle cx="41" cy="41" r={R} fill="none" className="mn-zk-track" strokeWidth="5.5" />
								<circle cx="41" cy="41" r={R} fill="none" className="mn-zk-fill" strokeWidth="5.5"
									strokeDasharray={C} strokeDashoffset={off}
									style={{ transition: 'stroke-dashoffset .9s cubic-bezier(0.16,1,0.3,1)', filter: 'drop-shadow(0 0 5px rgba(52,211,153,.7))' }} />
							</svg>
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<div className="text-[19px] font-black leading-none tabular-nums">{prog}%</div>
								<div className="text-[7px] font-bold uppercase tracking-widest mt-0.5 text-white/35">{t('zakat.paid')}</div>
							</div>
						</div>
						<div className="flex-1 flex flex-col gap-1.5">
							{[
								{ l: t('zakat.due'),       v: due,  a: 'bg-white/10 border-white/14',           d: 'bg-white/45' },
								{ l: t('zakat.paid'),      v: paid, a: 'bg-emerald-400/20 border-emerald-300/25', d: 'bg-emerald-400' },
								{ l: t('zakat.remaining'), v: rem,  a: rem > 0 ? 'bg-amber-400/18 border-amber-300/22' : 'bg-emerald-400/15 border-emerald-300/20', d: rem > 0 ? 'bg-amber-400' : 'bg-emerald-400' },
							].map(s => (
								<div key={s.l} className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-xl border', s.a)}>
									<div className="flex items-center gap-1.5">
										<span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.d)} />
										<span className="text-[9.5px] font-semibold text-white/50">{s.l}</span>
									</div>
									<span className="font-mono text-[11.5px] font-bold tabular-nums">{fmt(s.v)} <span className="text-[8.5px] opacity-40">{t('common.currency')}</span></span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
			<Card>
				<CardHeader title={t('zakat.calculationBase')} icon={BarChart3} />
				<div className="px-3.5 py-3 flex flex-col gap-3">
					<div className="grid grid-cols-3 gap-1.5">
						{[{ v: 'net', l: t('zakat.baseNet'), a: Math.max(incTotal - expTotal, 0) }, { v: 'total', l: t('zakat.baseTotal'), a: incTotal }, { v: 'custom', l: t('zakat.baseCustom'), a: Number(custom || 0) }].map(x => {
							const on = mode === x.v;
							return (
								<button key={x.v} onClick={() => setMode(x.v)}
									className={cn('rounded-xl border p-2 text-center cursor-pointer transition-all flex flex-col items-center gap-1', on ? 'bg-[var(--color-primary-100)] border-[var(--color-primary-300)]' : 'bg-[var(--color-primary-100)] border-[var(--color-primary-200)] hover:border-[var(--color-primary-300)]')}>
									<div className={cn('w-2 h-2 rounded-full', on ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-primary-300)]')} />
									<div className={cn('text-[9px] font-bold', on ? 'text-[var(--color-primary-800)]' : 'text-[var(--color-primary-400)]')}>{x.l}</div>
									<div className={cn('font-mono text-[10px] font-bold tabular-nums', on ? 'text-[var(--color-primary-600)]' : 'text-[var(--color-primary-300)]')}>
										{x.v === 'custom' && !custom ? '–' : fmt(x.a)}
									</div>
								</button>
							);
						})}
					</div>
					{mode === 'custom' && <Inp icon={DollarSign} type="number" value={custom} onChange={e => setCst(e.target.value)} placeholder={t('zakat.customBasePlaceholder')} />}
					<div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
						<div className="flex items-center justify-between mb-2">
							<span className="text-[9.5px] font-bold uppercase tracking-widest text-emerald-700/55">{t('zakat.percentage')}</span>
							<span className="font-mono text-[17px] font-black text-emerald-700">{pct}<span className="text-xs ml-0.5">%</span></span>
						</div>
						<input type="range" min="2" max="10" step="0.5" value={pct} onChange={e => setPct(Number(e.target.value))}
							className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
							style={{ background: `linear-gradient(to right,#10b981 0%,#10b981 ${((pct - 2) / 8) * 100}%,#d1fae5 ${((pct - 2) / 8) * 100}%,#d1fae5 100%)` }} />
					</div>
				</div>
			</Card>
			<Card>
				<CardHeader title={t('zakat.logTitle')} icon={Heart}
					action={<span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">{log.length}</span>} />
				{log.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="mn-table">
							<thead><tr><th>#</th><th>{t('table.description')}</th><th>{t('table.amount')}</th><th>{t('table.date')}</th><th className="text-end">{t('table.actions')}</th></tr></thead>
							<tbody>
								{log.map((item, idx) => (
									<tr key={item.id}>
										<td><div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br from-emerald-500 to-emerald-600">{idx + 1}</div></td>
										<td><span className="font-semibold text-emerald-900 text-[12.5px]">{item.description}</span></td>
										<td><span className="font-mono font-bold text-emerald-600 tabular-nums text-[12px]">{fmt(item.amount)} <span className="text-[8.5px] opacity-55">{t('common.currency')}</span></span></td>
										<td><Badge color="muted">{fmtD(item.date, locale)}</Badge></td>
										<td><TableActions row={item} hideEdit onDelete={r => onDelete(r.id)} editTooltip="Edit" deleteTooltip={t('common.delete')} deleteConfirm={t('common.deleteConfirm')} /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : <Empty icon={Heart} title={t('states.noZakat')} />}
			</Card>
		</div>
	);
}

function ExpectedTab({ data, locale, t, onEdit, onDelete }) {
	const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
	return (
		<div className="flex flex-col gap-3">
			<TotalBanner total={total} currency={t('common.currency')} label={t('expected.totalLabel')} icon={Star}
				color={{ bg: 'bg-gradient-to-br from-amber-50 to-white', border: 'border-amber-100', text: 'text-amber-700', icon: 'bg-gradient-to-br from-amber-400 to-amber-500', arrow: ArrowUpRight, arrowColor: 'text-amber-300' }} />
			{data.length > 0 ? (
				<Card>
					<div className="overflow-x-auto">
						<table className="mn-table">
							<thead><tr><th>Description</th><th>{t('table.amount')}</th><th>Date</th><th>Notes</th><th className="text-end">{t('table.actions')}</th></tr></thead>
							<tbody>
								{data.map(item => (
									<tr key={item.id}>
										<td><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"><Star size={11} className="text-amber-500" /></div><span className="font-semibold text-[var(--color-primary-900)] text-[12.5px]">{item.description}</span></div></td>
										<td><span className="font-mono font-bold text-amber-600 tabular-nums text-[12px]">+{fmt(item.amount)}</span></td>
										<td><Badge color="amber">{fmtD(item.expectedDate, locale)}</Badge></td>
										<td><span className="text-[10.5px] text-[var(--color-primary-400)]">{item.notes || '—'}</span></td>
										<td><TableActions row={item} onEdit={r => onEdit(r)} onDelete={r => onDelete(r.id)} editTooltip={t('common.edit')} deleteTooltip={t('common.delete')} deleteConfirm={t('common.deleteConfirm')} /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			) : <Card><Empty icon={Star} title={t('expected.emptyTitle')} subtitle={t('expected.emptySubtitle')} /></Card>}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function MoneyPage() {
	const t      = useTranslations('money');
	const locale = useLocale();
	const isRTL  = locale === 'ar';
	const mob    = useIsMobile();

	const [tab, setTab]               = useState('wallets');
	const [balanceMode, setBalanceMode] = useState('today');
	const [loading, setLoading]       = useState(true);
	const [saving, setSaving]         = useState(false);
	const [toggling, setToggling]     = useState(null);

	const [notifOpen, setNotifOpen]   = useState(false);
	const [addOpen, setAddOpen]       = useState(false);
	const [editOpen, setEditOpen]     = useState(false);
	const [editData, setEditData]     = useState(null);
	const [walletAddOpen, setWalletAddOpen]   = useState(false);
	const [walletEditOpen, setWalletEditOpen] = useState(false);
	const [walletEditData, setWalletEditData] = useState(null);
	const [expAddOpen, setExpAddOpen]   = useState(false);
	const [expEditOpen, setExpEditOpen] = useState(false);
	const [expEditData, setExpEditData] = useState(null);
	const [forecastOpen, setForecastOpen] = useState(false);

	const [dash,     setDash]     = useState(null);
	const [wallets,  setWallets]  = useState([]);
	const [income,   setIncome]   = useState([]);
	const [expenses, setExpenses] = useState([]);
	const [commits,  setCommits]  = useState([]);
	const [zakat,    setZakat]    = useState([]);
	const [expected, setExpected] = useState([]);
	const [notifs,   setNotifs]   = useState([]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [d, w, i, e, c, z, n, ex] = await Promise.all([
				moneyApi.getDashboard(balanceMode),
				moneyApi.getWallets().catch(() => ({ data: [] })),
				moneyApi.getIncome(), moneyApi.getExpenses(), moneyApi.getCommitments(),
				moneyApi.getZakat(), moneyApi.getNotifications(),
				moneyApi.getExpected().catch(() => ({ data: [] })),
			]);
			setDash(d.data || null); setWallets(w.data || []); setIncome(i.data || []);
			setExpenses(e.data || []); setCommits(c.data || []); setZakat(z.data || []);
			setNotifs(n.data || []); setExpected(ex.data || []);
		} catch (err) { console.error(err); }
		finally { setLoading(false); }
	}, [balanceMode]);

	useEffect(() => { load(); }, [load]);

	const handleSave = async form => {
		setSaving(true);
		try {
			if (form.type === 'income') {
				const p = { source: form.source, amount: +form.amount, date: form.date, recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: +form.recurrenceEvery || 1 };
				editData ? await moneyApi.updateIncome(editData.id, p) : await moneyApi.createIncome(p); setTab('income');
			} else if (form.type === 'expense') {
				const p = { description: form.desc, amount: +form.amount, date: form.date, recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: +form.recurrenceEvery || 1 };
				editData ? await moneyApi.updateExpense(editData.id, p) : await moneyApi.createExpense(p); setTab('expenses');
			} else if (form.type === 'commitment') {
				const p = { name: form.desc, amount: +form.amount, dueDate: form.date, type: form.commitType, status: editData?.status || 'pending', recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: +form.recurrenceEvery || 1, jamiaStart: form.commitType === 'جمعية' ? form.jamiaStart || null : null, jamiaEnd: form.commitType === 'جمعية' ? form.jamiaEnd || null : null, jamiaMyMonth: form.commitType === 'جمعية' ? form.jamiaMyMonth || null : null };
				editData ? await moneyApi.updateCommitment(editData.id, p) : await moneyApi.createCommitment(p); setTab('commits');
			} else {
				await moneyApi.createZakat({ description: form.zakatDesc, amount: +form.amount, date: form.date, isZakat: true }); setTab('zakat');
			}
			setAddOpen(false); setEditOpen(false); setEditData(null); await load();
		} catch (err) { console.error(err); } finally { setSaving(false); }
	};

	const handleDelete = async (id, type) => {
		try {
			if (type === 'income')     await moneyApi.deleteIncome(id);
			if (type === 'expense')    await moneyApi.deleteExpense(id);
			if (type === 'commitment') await moneyApi.deleteCommitment(id);
			await load();
		} catch (err) { console.error(err); }
	};

	const handleEdit = (item, type) => { setEditData({ ...item, _formType: type }); setEditOpen(true); };
	const handleExpectedSave = async form => {
		setSaving(true);
		try {
			const p = { description: form.description, amount: +form.amount, expectedDate: form.expectedDate, notes: form.notes };
			expEditData ? await moneyApi.updateExpected(expEditData.id, p) : await moneyApi.createExpected(p);
			setExpAddOpen(false); setExpEditOpen(false); setExpEditData(null); setTab('expected'); await load();
		} catch (err) { console.error(err); } finally { setSaving(false); }
	};
	const handleWalletSave = async form => {
		setSaving(true);
		try {
			const p = { name: form.name, type: form.type, currency: form.currency, openingBalance: +form.openingBalance || 0, isDefault: !!form.isDefault, notes: form.notes || null };
			walletEditData ? await moneyApi.updateWallet(walletEditData.id, p) : await moneyApi.createWallet(p);
			setWalletAddOpen(false); setWalletEditOpen(false); setWalletEditData(null); setTab('wallets'); await load();
		} catch (err) { console.error(err); } finally { setSaving(false); }
	};

	const stats = dash?.stats || {};
	const visibleBalance      = Number(stats.balance || 0);
	const currentMoneyBalance = Number(stats.currentMoneyBalance || 0);
	const monthlyBalance      = Number(stats.monthlyBalance || 0);
	const realAccountsTotal   = Number(stats.realAccountsTotal || 0);
	const incT     = Number(stats.totalIncome || 0);
	const expT     = Number(stats.totalExpenses || 0);
	const totalCom = Number(stats.totalCommitments || 0);
	const totalZak = Number(stats.totalZakatPaid || 0);
	const totalRem = incT + Number(stats.totalExpected || 0) - expT - totalCom - totalZak;
	const spendRate = incT > 0 ? Math.round(((expT + totalCom + totalZak) / incT) * 100) : 0;
	const unread = notifs.filter(i => !i.isRead).length;

	const tabs = useMemo(() => [
		{ id: 'wallets',  l: t('tabs.wallets'),     I: Wallet,      n: wallets.length  },
		{ id: 'income',   l: t('tabs.income'),      I: TrendingUp,  n: income.length   },
		{ id: 'expenses', l: t('tabs.expenses'),    I: TrendingDown,n: expenses.length },
		{ id: 'commits',  l: t('tabs.commitments'), I: Layers,      n: commits.length  },
		{ id: 'zakat',    l: t('tabs.zakat'),       I: Landmark,    n: zakat.length    },
		{ id: 'expected', l: t('tabs.expected'),    I: Star,        n: expected.length },
	], [t, wallets.length, income.length, expenses.length, commits.length, zakat.length, expected.length]);

	return (
		<div className="mn-root w-[calc(100%+14px)] rtl:mr-[-7px] ltr:ml-[-7px] mt-[-7px] !p-0 min-h-screen flex flex-col">
			<Styles />

			{/* HERO */}
			<div className="relative overflow-hidden rounded-md px-3 sm:px-5 pt-4 pb-0 mn-hero">
				<div className="absolute inset-0 bg-gradient-to-b from-white/8 to-transparent pointer-events-none" />
				<div className="absolute w-64 h-64 rounded-full bg-white/[0.06] blur-[55px] -top-32 -start-16 pointer-events-none" />
				<div className="absolute w-52 h-52 rounded-full bg-white/[0.04] blur-[45px] -bottom-16 -end-10 pointer-events-none" />
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />

				{/* top row */}
				<div className="relative z-10 flex items-start justify-between gap-3 mb-3.5">
					<div>
						<div className="mn-serif text-[21px] text-white leading-tight tracking-[-0.01em]">{t('header.title')}</div>
						<div className="text-[10px] text-white/38 mt-0.5">{t('header.subtitle')}</div>
						<div className="mt-2"><BalanceModeSwitch value={balanceMode} onChange={setBalanceMode} /></div>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<button onClick={() => setForecastOpen(true)} className="h-8 w-8 flex items-center justify-center rounded-xl cursor-pointer border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm hover:bg-white/18 transition-all active:scale-95"><Target size={12} /></button>
						<button onClick={() => setNotifOpen(true)} className="relative h-8 w-8 flex items-center justify-center rounded-xl cursor-pointer border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm hover:bg-white/18 transition-all active:scale-95">
							<Bell size={12} />
							{unread > 0 && <span className="mn-pulse absolute -top-1 -end-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[7px] font-black text-white flex items-center justify-center ring-[1.5px] ring-white/20">{unread}</span>}
						</button>
						<button onClick={() => { if (tab === 'wallets') setWalletAddOpen(true); else if (tab === 'expected') setExpAddOpen(true); else setAddOpen(true); }}
							className="h-8 w-8 flex items-center justify-center rounded-xl cursor-pointer border-none transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 bg-white/95 text-[var(--color-primary-700)] shadow-md">
							<Plus size={13} />
						</button>
					</div>
				</div>

				{/* card + pills */}
				<div className="relative z-10 mb-1.5">
					{loading ? <div className="rounded-2xl bg-[var(--color-primary-700)] h-[180px]" /> : (
						<>
							<CreditCardDisplay balance={visibleBalance} income={incT} expenses={expT} commitments={totalCom} remaining={totalRem} currency={t('common.currency')} spendRate={spendRate} t={t} balanceMode={balanceMode} />
							<SummaryPills currentMoneyBalance={currentMoneyBalance} monthlyBalance={monthlyBalance} realAccountsTotal={realAccountsTotal} mode={balanceMode} />
						</>
					)}
				</div>

				{/* tabs */}
				<div className="relative z-10 flex items-center gap-1 py-2.5 overflow-x-auto mn-hide-scroll">
					{tabs.map(({ id, l, I, n }) => {
						const on = tab === id;
						return (
							<button key={id} onClick={() => setTab(id)}
								className={cn('flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200', on ? 'bg-white text-[var(--color-primary-700)] border-transparent font-bold shadow scale-[1.02]' : 'border-white/12 text-white/65 hover:text-white hover:border-white/22 hover:bg-white/10')}
								style={!on ? { backdropFilter: 'blur(4px)' } : {}}>
								<I size={10} strokeWidth={on ? 2.5 : 2} />{l}
								<span className={cn('text-[8px] font-bold px-1 py-0.5 rounded-full', on ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]' : 'bg-white/12 text-white/55')}>{n}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* CONTENT */}
			<div className="flex-1 px-2 pt-3.5 ">
				{loading ? (
					<div className="flex flex-col gap-2">{[70, 115, 70, 95].map((h, i) => <Skeleton key={i} h={h} />)}</div>
				) : tab === 'wallets' ? (
					<WalletsTab data={wallets} total={realAccountsTotal} onEdit={item => { setWalletEditData(item); setWalletEditOpen(true); }} onDelete={async id => { try { await moneyApi.deleteWallet(id); await load(); } catch (e) { console.error(e); } }} />
				) : tab === 'income' ? <IncomeTab data={income} locale={locale} t={t} onEdit={handleEdit} onDelete={handleDelete} />
				: tab === 'expenses' ? <ExpensesTab data={expenses} locale={locale} t={t} onEdit={handleEdit} onDelete={handleDelete} />
				: tab === 'commits' ? <CommitmentsTab data={commits} locale={locale} t={t} onToggle={async id => { setToggling(id); try { await moneyApi.toggleCommitmentStatus(id); await load(); } catch (e) { console.error(e); } finally { setToggling(null); } }} togglingId={toggling} onEdit={handleEdit} onDelete={handleDelete} />
				: tab === 'zakat' ? <ZakatTab incTotal={incT} expTotal={expT} log={zakat} locale={locale} t={t} onDelete={async id => { try { await moneyApi.deleteZakat(id); await load(); } catch (e) { console.error(e); } }} />
				: <ExpectedTab data={expected} locale={locale} t={t} onEdit={item => { setExpEditData(item); setExpEditOpen(true); }} onDelete={async id => { try { await moneyApi.deleteExpected(id); await load(); } catch (e) { console.error(e); } }} />}
			</div>

			{/* PANELS */}
			<Panel open={addOpen}       onClose={() => setAddOpen(false)}                               title={t('form.addTitle')}     mob={mob} isRTL={isRTL}><AddForm t={t} onSave={handleSave} onClose={() => setAddOpen(false)} loading={saving} /></Panel>
			<Panel open={editOpen}      onClose={() => { setEditOpen(false); setEditData(null); }}       title={t('form.editTitle')}    mob={mob} isRTL={isRTL}>{editData && <AddForm t={t} initialData={editData} onSave={handleSave} onClose={() => { setEditOpen(false); setEditData(null); }} loading={saving} />}</Panel>
			<Panel open={walletAddOpen} onClose={() => setWalletAddOpen(false)}                         title={t('wallets.addTitle')}  mob={mob} isRTL={isRTL}><WalletForm onSave={handleWalletSave} onClose={() => setWalletAddOpen(false)} loading={saving} /></Panel>
			<Panel open={walletEditOpen} onClose={() => { setWalletEditOpen(false); setWalletEditData(null); }} title={t('wallets.editTitle')} mob={mob} isRTL={isRTL}>{walletEditData && <WalletForm initialData={walletEditData} onSave={handleWalletSave} onClose={() => { setWalletEditOpen(false); setWalletEditData(null); }} loading={saving} />}</Panel>
			<Panel open={expAddOpen}    onClose={() => setExpAddOpen(false)}                            title="Add Expected"           mob={mob} isRTL={isRTL}><ExpectedForm t={t} onSave={handleExpectedSave} onClose={() => setExpAddOpen(false)} loading={saving} /></Panel>
			<Panel open={expEditOpen}   onClose={() => { setExpEditOpen(false); setExpEditData(null); }} title="Edit Expected"          mob={mob} isRTL={isRTL}>{expEditData && <ExpectedForm t={t} initialData={expEditData} onSave={handleExpectedSave} onClose={() => { setExpEditOpen(false); setExpEditData(null); }} loading={saving} />}</Panel>
			<Panel open={notifOpen}     onClose={() => setNotifOpen(false)}                             title={t('notifications.title')} mob={mob} isRTL={isRTL}>
				<div className="flex flex-col gap-2 p-4">
					{notifs.length ? notifs.map(item => {
						const s = ({ warn: 'bg-amber-50 border-amber-200 text-amber-800', ok: 'bg-emerald-50 border-emerald-200 text-emerald-800', alert: 'bg-rose-50 border-rose-200 text-rose-800' })[item.type] || 'bg-amber-50 border-amber-200 text-amber-800';
						return <button key={item.id} onClick={async () => { try { await moneyApi.markNotificationRead(item.id); setNotifs(p => p.map(i => i.id === item.id ? { ...i, isRead: true } : i)); } catch (e) { console.error(e); } }} className={cn('w-full text-start rounded-xl px-3 py-2.5 border cursor-pointer hover:opacity-90 transition-opacity', s, item.isRead && 'opacity-55')}><div className="text-sm font-semibold mb-0.5">{item.text}</div><div className="text-[10px] opacity-60">{item.timeLabel || t('notifications.new')}</div></button>;
					}) : <Empty icon={Bell} title={t('notifications.empty')} />}
				</div>
			</Panel>
			<ForecastPanel open={forecastOpen} onClose={() => setForecastOpen(false)} income={income} expenses={expenses} commitments={commits} expected={expected} locale={locale} t={t} mob={mob} isRTL={isRTL} />
		</div>
	);
}