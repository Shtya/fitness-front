'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
	TrendingUp, TrendingDown, Wallet, Bell, Plus, X, ChevronDown,
	DollarSign, RefreshCw, Users, Heart, BarChart3, CheckCircle2,
	Clock, Layers, Receipt, Building2, Landmark, Briefcase,
	Lock, AlignLeft, CalendarDays, Hash, Check, FileText, Repeat,
	Star, Sparkles, ArrowUpRight, ArrowDownRight,
	Target, Edit2, Trash2, Wifi,
} from 'lucide-react';
import api from '@/utils/axios';
import ActionButtons from '@/components/atoms/Actions';

// ─── API ─────────────────────────────────────────────────────────────────────
const moneyApi = {
	getDashboard: () => api.get('/money/dashboard'),
	getMonthlySummary: params => api.get('/money/monthly-summary', { params }),
	getIncome: () => api.get('/money/income'),
	createIncome: p => api.post('/money/income', p),
	updateIncome: (id, p) => api.put(`/money/income/${id}`, p),
	deleteIncome: id => api.delete(`/money/income/${id}`),
	getExpenses: () => api.get('/money/expenses'),
	createExpense: p => api.post('/money/expenses', p),
	updateExpense: (id, p) => api.put(`/money/expenses/${id}`, p),
	deleteExpense: id => api.delete(`/money/expenses/${id}`),
	getCommitments: () => api.get('/money/commitments'),
	createCommitment: p => api.post('/money/commitments', p),
	updateCommitment: (id, p) => api.put(`/money/commitments/${id}`, p),
	deleteCommitment: id => api.delete(`/money/commitments/${id}`),
	toggleCommitmentStatus: id => api.patch(`/money/commitments/${id}/toggle-status`),
	getZakat: () => api.get('/money/zakat'),
	createZakat: p => api.post('/money/zakat', p),
	deleteZakat: id => api.delete(`/money/zakat/${id}`),
	getExpected: () => api.get('/money/expected'),
	createExpected: p => api.post('/money/expected', p),
	updateExpected: (id, p) => api.put(`/money/expected/${id}`, p),
	deleteExpected: id => api.delete(`/money/expected/${id}`),
	getNotifications: () => api.get('/money/notifications'),
	markNotificationRead: id => api.patch(`/money/notifications/${id}/read`),

};

// ─── Utils ────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const cn = (...c) => c.filter(Boolean).join(' ');
const fmt = (v, l) => new Intl.NumberFormat(l === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 }).format(Number(v || 0));
const fmtD = (d, l) => !d ? '' : new Intl.DateTimeFormat(l === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
const fmtM = (k, l) => {
	if (!k) return '';
	const [y, m] = k.split('-');
	return new Intl.DateTimeFormat(l === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(+y, +m - 1, 1));
};

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

// ─── Global styles ────────────────────────────────────────────────────────────
function Styles() {
	useEffect(() => {
		const id = 'mn-v8';
		if (document.getElementById(id)) return;
		const el = document.createElement('style');
		el.id = id;
		el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Sora:wght@300;400;500;600;700;800&display=swap');
      .mn-root { font-family:'Sora',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
      .mn-root *,.mn-root *::before,.mn-root *::after { box-sizing:border-box; }
      .mn-root input,.mn-root select,.mn-root textarea { font-size:16px!important; font-family:'Sora',system-ui,sans-serif; }
      .mn-root ::-webkit-scrollbar { width:3px; height:3px; }
      .mn-root ::-webkit-scrollbar-thumb { background:var(--color-primary-300); border-radius:3px; }

      /* Hide native calendar icon — inputs use clean styling */
      .mn-root input[type="date"]::-webkit-calendar-picker-indicator { display:none; }
      .mn-root input[type="date"]::-webkit-inner-spin-button { display:none; }
      .mn-root input[type="date"] { cursor:pointer; }

      .mn-serif { font-family:'Instrument Serif',Georgia,serif; }
      .mn-hide-scroll { scrollbar-width:none; -ms-overflow-style:none; }
      .mn-hide-scroll::-webkit-scrollbar { display:none; }

      @keyframes mn-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      .mn-shimmer {
        background: linear-gradient(90deg,
          var(--color-primary-50) 25%,
          var(--color-primary-100) 50%,
          var(--color-primary-50) 75%);
        background-size:200% 100%;
        animation:mn-shimmer 1.5s infinite;
      }
      @keyframes mn-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.4)} }
      .mn-pulse { animation:mn-pulse-dot 1.8s ease-in-out infinite; }

      /* Credit card holographic sheen */
      @keyframes mn-holo {
        0%   { opacity:.18; background-position:0% 50%; }
        50%  { opacity:.30; background-position:100% 50%; }
        100% { opacity:.18; background-position:0% 50%; }
      }
      .mn-holo {
        background: linear-gradient(135deg,
          transparent 0%, rgba(255,255,255,.18) 30%,
          rgba(168,85,247,.15) 50%, rgba(99,102,241,.12) 70%, transparent 100%);
        background-size:300% 300%;
        animation:mn-holo 5s ease infinite;
      }

      /* Chip shine sweep */
      @keyframes mn-chip {
        0%   { transform:translateX(-130%) rotate(30deg); }
        100% { transform:translateX(130%) rotate(30deg); }
      }
      .mn-chip::after {
        content:'';
        position:absolute; inset:0;
        background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,.38) 50%,transparent 80%);
        animation:mn-chip 3.5s ease-in-out infinite;
      }

      /* Table */
      .mn-table { width:100%; border-collapse:collapse; }
      .mn-table th {
        padding:10px 14px; font-size:10px; font-weight:800;
        letter-spacing:.08em; text-transform:uppercase;
        color:var(--color-primary-400);
        background:var(--color-primary-50);
        border-bottom:1px solid var(--color-primary-100);
        white-space:nowrap;
      }
      .mn-table td {
        padding:11px 14px; font-size:13px;
        border-bottom:1px solid var(--color-primary-50);
        vertical-align:middle;
      }
      .mn-table tr:last-child td { border-bottom:none; }
      .mn-table tbody tr:hover td { background:var(--color-primary-50); }

      .mn-panel-shadow { box-shadow:-20px 0 60px rgba(99,102,241,.13), 0 0 0 1px rgba(255,255,255,.5) inset; }

      .mn-tab-on  { background:rgba(255,255,255,.97)!important; }
      .mn-tab-off { background:rgba(255,255,255,.11); }
      .mn-tab-off:hover { background:rgba(255,255,255,.2); }

      /* Zakat ring */
      .mn-zk-track { stroke:rgba(255,255,255,.12); }
      .mn-zk-fill  { stroke:rgba(52,211,153,.95); stroke-linecap:round; }
    `;
		document.head.appendChild(el);
	}, []);
	return null;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ vals }) {
	if (!vals?.length) return null;
	const max = Math.max(...vals, 1);
	return (
		<div className="flex items-end gap-0.5 h-8">
			{vals.map((v, i) => (
				<div key={i} className="w-1.5 rounded-sm bg-white/30 transition-all duration-500"
					style={{ height: `${Math.max(15, (v / max) * 100)}%` }} />
			))}
		</div>
	);
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, color = 'default', icon: Icon }) {
	const s = {
		default: 'bg-white/10 text-white/70 border-white/15',
		primary: 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] border-[var(--color-primary-200)]',
		green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
		red: 'bg-rose-50 text-rose-700 border-rose-200',
		amber: 'bg-amber-50 text-amber-700 border-amber-200',
		muted: 'bg-zinc-50 text-zinc-500 border-zinc-200',
	};
	return (
		<span className={cn('inline-flex text-nowrap items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', s[color])}>
			{Icon && <Icon size={9} />}{children}
		</span>
	);
}

// ─── Inp — date inputs NEVER get an icon (native icon hidden via CSS) ─────────
function Inp({ icon: Icon, label, className: cls, type, ...p }) {
	const isDate = type === 'date';
	const showIcon = !!Icon && !isDate;
	return (
		<div>
			{label && (
				<label className="flex items-center gap-1 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]">
					{showIcon && <Icon size={10} />}{label}
				</label>
			)}
			<div className="relative flex items-center">
				{showIcon && (
					<span className="absolute start-3 flex items-center pointer-events-none text-[var(--color-primary-400)]">
						<Icon size={15} />
					</span>
				)}
				<input
					{...p}
					type={type}
					className={cn(
						'w-full h-11 rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]',
						'text-[var(--color-primary-900)] placeholder-[var(--color-primary-300)]',
						'focus:outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)]',
						'transition-all duration-200',
						showIcon ? 'ps-9' : 'px-3',
						cls,
					)}
				/>
			</div>
		</div>
	);
}

// ─── Select ───────────────────────────────────────────────────────────────────
function Sel({ icon: Icon, label, options, value, onChange }) {
	return (
		<div>
			{label && (
				<label className="flex items-center gap-1 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]">
					{Icon && <Icon size={10} />}{label}
				</label>
			)}
			<div className="relative flex items-center">
				{Icon && (
					<span className="absolute start-3 flex items-center pointer-events-none text-[var(--color-primary-400)]">
						<Icon size={15} />
					</span>
				)}
				<select value={value} onChange={e => onChange(e.target.value)}
					className={cn(
						'w-full h-11 rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]',
						'text-[var(--color-primary-900)] appearance-none cursor-pointer pe-8',
						'focus:outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-200)]',
						'transition-all duration-200',
						Icon ? 'ps-9' : 'ps-3',
					)}>
					{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
				<span className="absolute end-2.5 pointer-events-none text-[var(--color-primary-400)]"><ChevronDown size={13} /></span>
			</div>
		</div>
	);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
	return (
		<button type="button" onClick={() => onChange(!checked)}
			className={cn('relative w-11 h-6 rounded-full border-none cursor-pointer transition-all duration-300 flex-shrink-0',
				checked ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-primary-100)]')}>
			<div className={cn('absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-all duration-300',
				checked ? 'start-[23px]' : 'start-[3px]')} />
		</button>
	);
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, className }) {
	return (
		<div className={cn('bg-white rounded-2xl overflow-hidden border border-[var(--color-primary-100)] shadow-sm', className)}>
			{children}
		</div>
	);
}
function CardHeader({ title, icon: Icon, action }) {
	return (
		<div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-primary-50)]">
			<div className="flex items-center gap-2.5">
				{Icon && (
					<div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
						style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' }}>
						<Icon size={13} />
					</div>
				)}
				<span className="mn-serif text-[15.5px] text-[var(--color-primary-900)]">{title}</span>
			</div>
			{action}
		</div>
	);
}

// ─── Empty ────────────────────────────────────────────────────────────────────
function Empty({ icon: Icon, title, subtitle }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-5 text-center gap-3">
			<div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] flex items-center justify-center text-[var(--color-primary-300)]">
				<Icon size={20} />
			</div>
			<div className="text-sm font-medium text-[var(--color-primary-400)]">{title}</div>
			{subtitle && <div className="text-xs text-[var(--color-primary-300)] leading-relaxed max-w-[180px]">{subtitle}</div>}
		</div>
	);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ h = 80 }) {
	return <div className="mn-shimmer rounded-2xl" style={{ height: h }} />;
}

// ─── Progress ─────────────────────────────────────────────────────────────────
function Progress({ value, color = 'primary', h = 2 }) {
	const fills = {
		primary: 'from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]',
		green: 'from-emerald-400 to-emerald-500',
		amber: 'from-amber-400 to-amber-500',
		red: 'from-rose-400 to-rose-500',
	};
	return (
		<div className="w-full rounded-full overflow-hidden bg-[var(--color-primary-100)]" style={{ height: h }}>
			<div className={cn('h-full rounded-full transition-all duration-700 bg-gradient-to-r', fills[color])}
				style={{ width: `${Math.min(value, 100)}%` }} />
		</div>
	);
}

// ─── Credit Card ─────────────────────────────────────────────────────────────
function CreditCardDisplay({ balance, income, expenses, commitments, remaining, currency, locale, monthLabel, spendRate, t }) {
	return (
		<div className="relative w-full select-none">
			<div className="relative w-full rounded-[22px] overflow-hidden"
				style={{
					background: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 30%, var(--color-gradient-via) 62%, var(--color-secondary-600) 100%)',
					minHeight: 195,
					boxShadow: '0 22px 55px -8px rgba(99,102,241,.52), 0 0 0 1px rgba(255,255,255,.12) inset',
				}}>

				{/* Holographic overlay */}
				<div className="mn-holo absolute inset-0 pointer-events-none z-10" />

				{/* Dot grid */}
				<div className="absolute inset-0 opacity-[0.055] pointer-events-none z-10"
					style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />

				{/* Circle decorations */}
				<div className="absolute -top-16 -end-16 w-52 h-52 rounded-full border border-white/10 pointer-events-none" />
				<div className="absolute -top-8 -end-8  w-36 h-36 rounded-full border border-white/7  pointer-events-none" />
				<div className="absolute -bottom-14 -start-8 w-44 h-44 rounded-full bg-white/[0.025] pointer-events-none" />

				{/* Top: chip + wifi */}
				<div className="relative z-20 flex items-start justify-between px-5 pt-5">
					<div className="relative mn-chip w-10 h-7 rounded-[6px] overflow-hidden flex-shrink-0"
						style={{ background: 'linear-gradient(135deg,#d4af37 0%,#f5e77a 40%,#c8960c 70%,#e8c84a 100%)' }}>
						<div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px p-1">
							{Array.from({ length: 9 }).map((_, i) => (
								<div key={i} className="rounded-[1px] opacity-50" style={{ background: 'rgba(100,65,0,.6)' }} />
							))}
						</div>
					</div>
					<Wifi size={18} className="text-white/35" strokeWidth={1.5} />
				</div>

				{/* Balance */}
				<div className="relative z-20 px-5 pt-3.5 pb-0">
					<div className="text-[9.5px] font-bold tracking-[0.2em] uppercase text-white/40 mb-0.5">{t('stats.balance')}</div>
					<div className="mn-serif text-[40px] text-white leading-none tracking-[-1.5px] drop-shadow-md">
						{fmt(balance, locale)}
						<span className="text-sm opacity-55 ms-2 font-normal tracking-normal">{currency}</span>
					</div>
				</div>

				{/* Spend bar */}
				{spendRate > 0 && (
					<div className="relative z-20 px-5 mt-2.5">
						<div className="flex items-center justify-between mb-1">
							<span className="text-[8.5px] font-bold uppercase tracking-widest text-white/30">{t('months.spendRate')}</span>
							<span className={cn('text-[10px] font-black tabular-nums',
								spendRate < 60 ? 'text-emerald-400' : spendRate < 80 ? 'text-amber-400' : 'text-rose-400')}>
								{spendRate}%
							</span>
						</div>
						<div className="h-[2.5px] w-full rounded-full bg-white/15 overflow-hidden">
							<div className={cn('h-full rounded-full transition-all duration-700',
								spendRate < 60 ? 'bg-emerald-400' : spendRate < 80 ? 'bg-amber-400' : 'bg-rose-400')}
								style={{ width: `${Math.min(spendRate, 100)}%` }} />
						</div>
					</div>
				)}

				{/* 4 mini stats */}
				<div className="relative z-20 grid grid-cols-4 gap-2 px-5 mt-3.5 pb-5">
					{[
						{ l: t('stats.income'), v: income, c: 'text-emerald-300', I: TrendingUp },
						{ l: t('stats.expenses'), v: expenses, c: 'text-rose-300', I: TrendingDown },
						{ l: t('stats.commitments'), v: commitments, c: 'text-violet-300', I: Lock },
						{ l: t('stats.remaining'), v: remaining, c: remaining >= 0 ? 'text-sky-300' : 'text-rose-300', I: Wallet },
					].map((s, i) => (
						<motion.div key={s.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
							transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
							className="flex flex-col gap-0.5">
							<div className="flex items-center gap-1">
								<s.I size={9} className={s.c} />
								<span className="text-[7px] font-black uppercase tracking-wider text-white/30 truncate leading-none">{s.l}</span>
							</div>
							<div className={cn('font-mono text-[12px] font-bold tabular-nums leading-tight', s.c)}>
								{fmt(Math.abs(s.v), locale)}
							</div>
						</motion.div>
					))}
				</div>
			</div>

			{/* Month pill below card */}
			{monthLabel && (
				<div className="flex items-center gap-1.5 mt-2.5 px-1">
					<div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-400)]" />
					<span className="text-[10px] font-bold text-[var(--color-primary-400)] uppercase tracking-widest">{monthLabel}</span>
				</div>
			)}
		</div>
	);
}

// ─── Side Panel (Desktop) ─────────────────────────────────────────────────────
function DesktopPanel({ open, onClose, title, children, isRTL }) {
	useEffect(() => {
		document.body.style.overflow = open ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	}, [open]);
	if (typeof document === 'undefined') return null;
	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div key="ov" className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }} onClick={onClose} />
					<motion.div key="p" dir={isRTL ? 'rtl' : 'ltr'}
						className={cn('fixed top-0 bottom-0 z-[61] w-[min(480px,92vw)] bg-white flex flex-col overflow-hidden mn-panel-shadow',
							isRTL ? 'left-0 border-e border-[var(--color-primary-100)]' : 'right-0 border-s border-[var(--color-primary-100)]')}
						initial={{ x: isRTL ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isRTL ? '-100%' : '100%' }}
						transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
						<div className="relative flex items-center justify-between px-5 py-4 flex-shrink-0"
							style={{ background: 'linear-gradient(135deg,var(--color-primary-700),var(--color-gradient-via),var(--color-secondary-600))' }}>
							<div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
							<div className="relative z-10 flex items-center gap-3">
								<div className="w-8 h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center text-white">
									<Sparkles size={14} />
								</div>
								<span className="mn-serif text-lg text-white">{title}</span>
							</div>
							<button onClick={onClose}
								className="relative z-10 w-8 h-8 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors flex-shrink-0 border-none">
								<X size={14} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">{children}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body,
	);
}

// ─── Bottom Sheet (mobile only) ───────────────────────────────────────────────
function BottomSheet({ open, onClose, title, children }) {
	useEffect(() => {
		document.body.style.overflow = open ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	}, [open]);
	if (typeof document === 'undefined') return null;
	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div key="bov" className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						transition={{ duration: 0.22 }} onClick={onClose} />
					<motion.div key="bs"
						className="fixed bottom-0 left-0 right-0 z-[51] bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
						initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
						transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
						<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
							<div className="w-9 h-1 rounded-full bg-[var(--color-primary-200)]" />
						</div>
						{title && (
							<div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-primary-50)] flex-shrink-0">
								<span className="mn-serif text-[17px] text-[var(--color-primary-900)]">{title}</span>
								<button onClick={onClose}
									className="w-8 h-8 rounded-full bg-[var(--color-primary-50)] border-none cursor-pointer flex items-center justify-center text-[var(--color-primary-400)] hover:bg-[var(--color-primary-100)] transition-colors">
									<X size={14} />
								</button>
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

// Panel dispatcher: bottom-sheet on mobile ONLY, slide panel on desktop
function Panel({ open, onClose, title, children, mob, isRTL }) {
	if (mob) return <BottomSheet open={open} onClose={onClose} title={title}>{children}</BottomSheet>;
	return <DesktopPanel open={open} onClose={onClose} title={title} isRTL={isRTL}>{children}</DesktopPanel>;
}

// ─── Forecast Panel ───────────────────────────────────────────────────────────
function ForecastPanel({ open, onClose, income, expenses, commitments, expected, locale, t, mob, isRTL }) {
	const [fromDate, setFromDate] = useState(today);
	const [months, setMonths] = useState(3);

	const toDate = useMemo(() => {
		const d = new Date(fromDate); d.setMonth(d.getMonth() + Number(months));
		return d.toISOString().split('T')[0];
	}, [fromDate, months]);

	const filterByRange = useCallback((items, dateKey) => {
		const from = new Date(fromDate), to = new Date(toDate);
		return items.filter(i => { const d = new Date(i[dateKey] || i.date); return d >= from && d <= to; });
	}, [fromDate, toDate]);

	const calcProjected = useCallback((items, dateKey) => {
		let total = filterByRange(items, dateKey).reduce((s, i) => s + Number(i.amount || 0), 0);
		items.filter(i => i.recurring).forEach(item => {
			const itemDate = new Date(item[dateKey] || item.date);
			const from = new Date(fromDate), to = new Date(toDate);
			if (itemDate < from) {
				const em = item.recurrenceType === 'weekly' ? 0.25 : item.recurrenceType === 'custom_months' ? Number(item.recurrenceEvery || 1) : 1;
				if (em > 0) total += Math.floor(((to - from) / (1000 * 60 * 60 * 24 * 30)) / em) * Number(item.amount || 0);
			}
		});
		return total;
	}, [filterByRange, fromDate, toDate]);

	const projI = useMemo(() => calcProjected(income, 'date'), [income, calcProjected]);
	const projE = useMemo(() => calcProjected(expenses, 'date'), [expenses, calcProjected]);
	const projC = useMemo(() => calcProjected(commitments, 'dueDate'), [commitments, calcProjected]);
	const projX = useMemo(() => filterByRange(expected || [], 'expectedDate').reduce((s, i) => s + Number(i.amount || 0), 0), [expected, filterByRange]);
	const net = projI + projX - projE - projC;
	const sRate = (projI + projX) > 0 ? Math.round(((projE + projC) / (projI + projX)) * 100) : 0;

	const presets = [
		{ label: t('forecast.oneMonth'), v: 1 }, { label: t('forecast.threeMonths'), v: 3 },
		{ label: t('forecast.sixMonths'), v: 6 }, { label: t('forecast.oneYear'), v: 12 },
	];

	return (
		<Panel open={open} onClose={onClose} title={t('forecast.title')} mob={mob} isRTL={isRTL}>
			<div className="flex flex-col gap-4 px-5 py-4">
				<div className="flex flex-col gap-3">
					<div className="grid grid-cols-2 gap-2.5">
						<Inp label={t('forecast.from')} type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
						<div>
							<label className="flex items-center gap-1 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]">{t('forecast.to')}</label>
							<div className="h-11 rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] flex items-center px-3 text-sm font-semibold text-[var(--color-primary-700)]">
								{fmtD(toDate, locale)}
							</div>
						</div>
					</div>
					<div className="flex gap-2 overflow-x-auto mn-hide-scroll pb-0.5">
						{presets.map(p => (
							<button key={p.v} onClick={() => setMonths(p.v)}
								className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 border whitespace-nowrap',
									months === p.v
										? 'text-white border-transparent shadow-md'
										: 'bg-white border-[var(--color-primary-200)] text-[var(--color-primary-500)] hover:border-[var(--color-primary-400)]')}
								style={months === p.v ? { background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' } : {}}>
								{p.label}
							</button>
						))}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2.5">
					{[
						{ l: t('forecast.income'), v: projI, cl: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', ib: 'bg-emerald-500', I: TrendingUp, px: '+' },
						{ l: t('forecast.expenses'), v: projE, cl: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', ib: 'bg-rose-500', I: TrendingDown, px: '-' },
						{ l: t('forecast.commitments'), v: projC, cl: 'text-[var(--color-primary-700)]', bg: 'bg-[var(--color-primary-50)] border-[var(--color-primary-100)]', ib: 'bg-[var(--color-primary-500)]', I: Lock, px: '-' },
						{ l: t('forecast.expected'), v: projX, cl: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', ib: 'bg-amber-500', I: Star, px: '+' },
						{ l: t('forecast.netBalance'), v: net, cl: net >= 0 ? 'text-emerald-700' : 'text-rose-700', bg: net >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100', ib: net >= 0 ? 'bg-emerald-500' : 'bg-rose-500', I: Wallet, px: net >= 0 ? '+' : '' },
					].map(item => (
						<motion.div key={item.l} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
							className={cn('rounded-2xl border p-3.5 relative overflow-hidden', item.bg)}>
							<div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
							<div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white mb-2 relative z-10', item.ib)}><item.I size={15} /></div>
							<div className={cn('text-[9px] font-extrabold uppercase tracking-wider mb-1 opacity-60 relative z-10', item.cl)}>{item.l}</div>
							<div className={cn('mn-serif text-[20px] leading-tight relative z-10 tabular-nums', item.cl)}>{item.px}{fmt(Math.abs(item.v), locale)}</div>
						</motion.div>
					))}
				</div>
				{(projI + projX) > 0 && (
					<Card>
						<div className="px-4 py-3 flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-primary-400)]">{t('forecast.spendRate')}</span>
								<span className={cn('text-sm font-black', sRate < 60 ? 'text-emerald-600' : sRate < 80 ? 'text-amber-600' : 'text-rose-600')}>{sRate}%</span>
							</div>
							<Progress value={sRate} color={sRate < 60 ? 'green' : sRate < 80 ? 'amber' : 'red'} h={8} />
							<div className="text-xs text-[var(--color-primary-400)]">
								{sRate < 60 ? `✓ ${t('months.healthy')}` : sRate < 80 ? `⚠ ${t('months.moderate')}` : `⚡ ${t('months.high')}`}
							</div>
						</div>
					</Card>
				)}
			</div>
		</Panel>
	);
}

// ─── Add / Edit Form ──────────────────────────────────────────────────────────
function AddForm({ t, locale, onSave, onClose, loading, initialData }) {
	const isEdit = !!initialData;
	const [f, setF] = useState(() => initialData ? {
		type: initialData._formType || 'income',
		source: initialData.source || '',
		desc: initialData.description || initialData.name || '',
		amount: initialData.amount || '',
		date: initialData.date || initialData.dueDate || today,
		zakatDesc: initialData.description || '',
		recurring: initialData.recurring || false,
		recurrenceType: initialData.recurrenceType || 'monthly',
		recurrenceEvery: initialData.recurrenceEvery || 1,
		commitType: initialData.type || 'التزام',
		jamiaStart: initialData.jamiaStart || '',
		jamiaEnd: initialData.jamiaEnd || '',
		jamiaMyMonth: initialData.jamiaMyMonth || '',
	} : {
		type: 'income', source: '', desc: '', amount: '', date: today,
		zakatDesc: '', recurring: false, recurrenceType: 'monthly', recurrenceEvery: 1,
		commitType: 'التزام', jamiaStart: '', jamiaEnd: '', jamiaMyMonth: '',
	});
	const set = (k, v) => setF(p => ({ ...p, [k]: v }));

	const types = [
		{ v: 'income', l: t('form.types.income'), I: TrendingUp, ab: 'bg-emerald-50', abo: 'border-emerald-200', at: 'text-emerald-700', ion: 'bg-emerald-500' },
		{ v: 'expense', l: t('form.types.expense'), I: TrendingDown, ab: 'bg-rose-50', abo: 'border-rose-200', at: 'text-rose-700', ion: 'bg-rose-500' },
		{ v: 'commitment', l: t('form.types.commitment'), I: Lock, ab: 'bg-[var(--color-primary-50)]', abo: 'border-[var(--color-primary-300)]', at: 'text-[var(--color-primary-700)]', ion: 'bg-[var(--color-primary-500)]' },
		{ v: 'zakat', l: t('form.types.zakat'), I: Heart, ab: 'bg-amber-50', abo: 'border-amber-200', at: 'text-amber-700', ion: 'bg-amber-500' },
	];
	const ct = [{ v: 'التزام', l: t('form.commitmentTypes.fixed') }, { v: 'اشتراك', l: t('form.commitmentTypes.subscription') }, { v: 'جمعية', l: t('form.commitmentTypes.jamia') }];
	const rec = [{ value: 'monthly', label: t('form.recurrence.monthly') }, { value: 'weekly', label: t('form.recurrence.weekly') }, { value: 'custom_months', label: t('form.recurrence.customMonths') }];
	const valid = f.amount && (f.source?.trim() || f.desc?.trim() || f.zakatDesc?.trim());

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				{!isEdit && (
					<div>
						<label className="flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]"><Layers size={10} />{t('form.sections.type')}</label>
						<div className="grid grid-cols-2 gap-2">
							{types.map(({ v, l, I, ab, abo, at, ion }) => {
								const on = f.type === v;
								return (
									<button key={v} type="button" onClick={() => set('type', v)}
										className={cn('flex items-center gap-2.5 p-3 rounded-2xl border-[1.5px] cursor-pointer transition-all duration-200 text-start active:scale-95',
											on ? cn(ab, abo) : 'bg-[var(--color-primary-50)] border-[var(--color-primary-100)]')}>
										<div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-all duration-200',
											on ? ion : 'bg-[var(--color-primary-100)] text-[var(--color-primary-400)]')}><I size={16} /></div>
										<span className={cn('text-xs font-bold flex-1', on ? at : 'text-[var(--color-primary-500)]')}>{l}</span>
										{on && <Check size={13} className={at} />}
									</button>
								);
							})}
						</div>
					</div>
				)}

				{f.type === 'commitment' && (
					<div>
						<label className="flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]"><Lock size={10} />{t('form.sections.commitmentType')}</label>
						<div className="flex gap-2">
							{ct.map(({ v, l }) => (
								<button key={v} type="button" onClick={() => set('commitType', v)}
									className={cn('flex-1 h-10 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 border',
										f.commitType === v
											? 'bg-[var(--color-primary-50)] border-[var(--color-primary-300)] text-[var(--color-primary-700)]'
											: 'bg-white border-[var(--color-primary-100)] text-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)]')}>
									{l}
								</button>
							))}
						</div>
					</div>
				)}

				<div>
					<label className="flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]"><FileText size={10} />{t('form.sections.details')}</label>
					<div className="flex flex-col gap-2.5">
						{f.type === 'income' && <Inp icon={Building2} value={f.source} onChange={e => set('source', e.target.value)} placeholder={t('form.placeholders.source')} />}
						{(f.type === 'expense' || f.type === 'commitment') && <Inp icon={AlignLeft} value={f.desc} onChange={e => set('desc', e.target.value)} placeholder={t('form.placeholders.description')} />}
						{f.type === 'zakat' && <Inp icon={Heart} value={f.zakatDesc} onChange={e => set('zakatDesc', e.target.value)} placeholder={t('form.placeholders.zakatDescription')} />}
						<div className="grid grid-cols-2 gap-2">
							<Inp icon={DollarSign} type="number" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder={t('form.placeholders.amount')} />
							<Inp type="date" value={f.date} onChange={e => set('date', e.target.value)} />
						</div>
					</div>
				</div>

				{f.type !== 'zakat' && (
					<div>
						<label className="flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]"><Repeat size={10} />{t('form.sections.recurrence')}</label>
						<div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]">
							<span className="text-sm font-medium text-[var(--color-primary-700)]">{t('form.recurringQuestion')}</span>
							<Toggle checked={f.recurring} onChange={v => set('recurring', v)} />
						</div>
						{f.recurring && (
							<div className="mt-2.5 flex flex-col gap-2">
								<Sel icon={RefreshCw} value={f.recurrenceType} onChange={v => set('recurrenceType', v)} options={rec} />
								{f.recurrenceType === 'custom_months' && (
									<Inp icon={Hash} type="number" value={f.recurrenceEvery} onChange={e => set('recurrenceEvery', e.target.value)} placeholder={t('form.placeholders.recurrenceEvery')} />
								)}
							</div>
						)}
					</div>
				)}

				{f.type === 'commitment' && f.commitType === 'جمعية' && (
					<div>
						<label className="flex items-center gap-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-400)]"><Users size={10} />{t('form.sections.jamia')}</label>
						<div className="flex flex-col gap-2.5">
							<div className="grid grid-cols-2 gap-2">
								<Inp label={t('form.placeholders.jamiaStart')} type="date" value={f.jamiaStart} onChange={e => set('jamiaStart', e.target.value)} />
								<Inp label={t('form.placeholders.jamiaEnd')} type="date" value={f.jamiaEnd} onChange={e => set('jamiaEnd', e.target.value)} />
							</div>
							<Inp label={t('form.placeholders.jamiaMyMonth')} type="date" value={f.jamiaMyMonth} onChange={e => set('jamiaMyMonth', e.target.value)} />
						</div>
					</div>
				)}
			</div>

			<div className="flex gap-2 px-4 py-3 border-t border-[var(--color-primary-50)] flex-shrink-0 bg-white">
				<button onClick={onClose}
					className="flex-1 h-11 rounded-xl border border-[var(--color-primary-200)] bg-transparent text-[var(--color-primary-500)] text-sm font-semibold cursor-pointer hover:bg-[var(--color-primary-50)] transition-colors">
					{t('common.cancel')}
				</button>
				<button onClick={() => valid && onSave(f)} disabled={!valid || loading}
					className="flex-[2] h-11 rounded-xl border-none text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
					style={{ background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-via),var(--color-gradient-to))', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }}>
					<Check size={14} />
					{loading ? t('common.saving') : t('common.save')}
				</button>
			</div>
		</>
	);
}

// ─── Expected Form ────────────────────────────────────────────────────────────
function ExpectedForm({ t, locale, onSave, onClose, loading, initialData }) {
	const [f, setF] = useState({
		description: initialData?.description || '', amount: initialData?.amount || '',
		expectedDate: initialData?.expectedDate || today, notes: initialData?.notes || '',
	});
	const set = (k, v) => setF(p => ({ ...p, [k]: v }));
	const valid = f.description && f.amount && f.expectedDate;
	return (
		<>
			<div className="flex flex-col gap-3.5 p-4">
				<Inp icon={AlignLeft} label={t('expected.descLabel')} value={f.description} onChange={e => set('description', e.target.value)} placeholder={t('expected.descPlaceholder')} />
				<div className="grid grid-cols-2 gap-2">
					<Inp icon={DollarSign} label={t('expected.amountLabel')} type="number" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
					<Inp label={t('expected.dateLabel')} type="date" value={f.expectedDate} onChange={e => set('expectedDate', e.target.value)} />
				</div>
				<Inp icon={FileText} label={t('expected.notesLabel')} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder={t('expected.notesPlaceholder')} />
			</div>
			<div className="flex gap-2 px-4 py-3 border-t border-[var(--color-primary-50)] flex-shrink-0 bg-white">
				<button onClick={onClose} className="flex-1 h-11 rounded-xl border border-[var(--color-primary-200)] bg-transparent text-[var(--color-primary-500)] text-sm font-semibold cursor-pointer hover:bg-[var(--color-primary-50)] transition-colors">
					{t('common.cancel')}
				</button>
				<button onClick={() => valid && onSave(f)} disabled={!valid || loading}
					className="flex-[2] h-11 rounded-xl border-none text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 bg-gradient-to-r from-amber-400 to-amber-500 shadow-lg shadow-amber-200">
					<Check size={14} />
					{loading ? t('common.saving') : t('common.save')}
				</button>
			</div>
		</>
	);
}

// ─── Income Tab ───────────────────────────────────────────────────────────────
function IncomeTab({ data, locale, t, onEdit, onDelete }) {
	const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
	if (!data.length) return <Card><Empty icon={TrendingUp} title={t('states.noIncome')} subtitle={t('states.addFirst')} /></Card>;
	return (
		<div className="flex flex-col gap-3.5">
			<div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
				<div className="relative z-10 flex items-center gap-3.5">
					<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-emerald-200"><TrendingUp size={22} /></div>
					<div className="flex-1">
						<div className="text-[9.5px] font-extrabold uppercase tracking-widest text-emerald-600/70 mb-1">{t('income.total')}</div>
						<div className="mn-serif text-[30px] text-emerald-700 leading-tight">{fmt(total, locale)} <span className="text-sm opacity-60">{t('common.currency')}</span></div>
					</div>
					<ArrowUpRight size={28} className="text-emerald-300" />
				</div>
			</div>
			<Card><div className="overflow-x-auto"><table className="mn-table"><thead><tr>
				<th>{t('table.source')}</th><th>{t('table.amount')}</th><th>{t('table.date')}</th><th>{t('table.type')}</th><th className="w-20"></th>
			</tr></thead><tbody>
					{data.map(item => (
						<tr key={item.id}>
							<td><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0"><Briefcase size={14} className="text-emerald-500" /></div><span className="font-semibold text-[var(--color-primary-900)] text-nowrap ">{item.source}</span></div></td>
							<td><span className="font-mono font-bold text-emerald-600 tabular-nums">+{fmt(item.amount, locale)}</span></td>
							<td><Badge color="muted">{fmtD(item.date, locale)}</Badge></td>
							<td>{item.recurring ? <Badge color="primary" icon={Repeat}>{t(`recurrence.${item.recurrenceType || 'monthly'}`)}</Badge> : <Badge color="muted">{t('table.oneTime')}</Badge>}</td>
							<td><ActionButtons row={item} actions={[
								{ icon: <Edit2 />, tooltip: t('common.edit'), variant: 'blue', onClick: r => onEdit(r, 'income') },
								{ icon: <Trash2 />, tooltip: t('common.delete'), variant: 'red', confirm: { message: t('common.deleteConfirm') }, onClick: r => onDelete(r.id, 'income') },
							]} /></td>
						</tr>
					))}
				</tbody></table></div></Card>
		</div>
	);
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
function ExpensesTab({ data, locale, t, onEdit, onDelete }) {
	const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
	if (!data.length) return <Card><Empty icon={Receipt} title={t('states.noExpenses')} subtitle={t('states.addFirst')} /></Card>;
	return (
		<div className="flex flex-col gap-3.5">
			<div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
				<div className="relative z-10 flex items-center gap-3.5">
					<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-rose-200"><TrendingDown size={22} /></div>
					<div className="flex-1">
						<div className="text-[9.5px] font-extrabold uppercase tracking-widest text-rose-600/70 mb-1">{t('expenses.total')}</div>
						<div className="mn-serif text-[30px] text-rose-700 leading-tight">{fmt(total, locale)} <span className="text-sm opacity-60">{t('common.currency')}</span></div>
					</div>
					<ArrowDownRight size={28} className="text-rose-300" />
				</div>
			</div>
			<Card><div className="overflow-x-auto"><table className="mn-table"><thead><tr>
				<th>{t('table.description')}</th><th>{t('table.amount')}</th><th>{t('table.date')}</th><th>{t('table.type')}</th><th className="w-20"></th>
			</tr></thead><tbody>
					{data.map(item => (
						<tr key={item.id}>
							<td><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0"><Receipt size={14} className="text-rose-500" /></div><span className="font-semibold text-[var(--color-primary-900)] text-nowrap ">{item.description}</span></div></td>
							<td><span className="font-mono font-bold text-rose-600 tabular-nums">-{fmt(item.amount, locale)}</span></td>
							<td><Badge color="muted">{fmtD(item.date, locale)}</Badge></td>
							<td>{item.recurring ? <Badge color="red" icon={Repeat}>{t(`recurrence.${item.recurrenceType || 'monthly'}`)}</Badge> : <Badge color="muted">{t('table.oneTime')}</Badge>}</td>
							<td><ActionButtons row={item} actions={[
								{ icon: <Edit2 />, tooltip: t('common.edit'), variant: 'blue', onClick: r => onEdit(r, 'expense') },
								{ icon: <Trash2 />, tooltip: t('common.delete'), variant: 'red', confirm: { message: t('common.deleteConfirm') }, onClick: r => onDelete(r.id, 'expense') },
							]} /></td>
						</tr>
					))}
				</tbody></table></div></Card>
		</div>
	);
}

// ─── Commitments Tab ──────────────────────────────────────────────────────────
function CommitmentsTab({ data, locale, t, onToggle, togglingId, onEdit, onDelete }) {
	const [filter, setFilter] = useState('all');
	const filters = [{ v: 'all', l: t('commitments.filters.all') }, { v: 'التزام', l: t('commitments.filters.fixed') }, { v: 'اشتراك', l: t('commitments.filters.subscription') }, { v: 'جمعية', l: t('commitments.filters.jamia') }];
	const fd = filter === 'all' ? data : data.filter(i => i.type === filter);
	const pend = data.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);
	const paid = data.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);
	const pct = (pend + paid) > 0 ? Math.round((paid / (pend + paid)) * 100) : 0;
	if (!data.length) return <Card><Empty icon={Lock} title={t('states.noCommitments')} subtitle={t('states.addFirst')} /></Card>;
	return (
		<div className="flex flex-col gap-3.5">

			<div className="flex gap-2 overflow-x-auto mn-hide-scroll pb-0.5">
				{filters.map(f => (
					<button key={f.v} onClick={() => setFilter(f.v)}
						className={cn('flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 border whitespace-nowrap',
							filter === f.v ? 'border-transparent text-white shadow-md' : 'bg-white border-[var(--color-primary-200)] text-[var(--color-primary-500)] hover:border-[var(--color-primary-400)]')}
						style={filter === f.v ? { background: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))' } : {}}>
						{f.l}
					</button>
				))}
			</div>
			{fd.length ? (
				<Card><div className="overflow-x-auto"><table className="mn-table"><thead><tr>
					<th>{t('table.name')}</th><th>{t('table.amount')}</th><th>{t('table.dueDate')}</th><th>{t('table.status')}</th><th className="w-20"></th>
				</tr></thead><tbody>
						{fd.map(item => {
							const ip = item.status === 'paid';
							const TI = item.type === 'اشتراك' ? RefreshCw : item.type === 'جمعية' ? Users : Lock;
							return (
								<tr key={item.id} className={ip ? 'opacity-60' : ''}>
									<td><div className="flex items-center gap-2"><div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', ip ? 'bg-emerald-50 text-emerald-500' : 'bg-[var(--color-primary-50)] text-[var(--color-primary-500)]')}><TI size={14} /></div><div><div className={cn('font-semibold  text-nowrap text-[var(--color-primary-900)]', ip && 'line-through text-[var(--color-primary-400)]')}>{item.name}</div><Badge color="primary">{item.type === 'التزام' ? t('commitments.filters.fixed') : item.type === 'اشتراك' ? t('commitments.filters.subscription') : t('commitments.filters.jamia')}</Badge></div></div></td>
									<td className=''><span className="flex items-center gap-1 font-mono font-bold text-[var(--color-primary-600)] tabular-nums">{fmt(item.amount, locale)} <span className="text-xs opacity-60">{t('common.currency')}</span></span></td>
									<td><Badge color="muted">{fmtD(item.dueDate, locale)}</Badge></td>
									<td><button onClick={() => onToggle(item.id)} disabled={togglingId === item.id}
										className={cn(' text-nowrap text-[10.5px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-150 border-none disabled:opacity-50',
											ip ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}>
										{togglingId === item.id ? t('common.loading') : ip ? `✓ ${t('commitments.markedPaid')}` : t('commitments.markAsPaid')}
									</button></td>
									<td><ActionButtons row={item} actions={[
										{ icon: <Edit2 />, tooltip: t('common.edit'), variant: 'blue', onClick: r => onEdit(r, 'commitment') },
										{ icon: <Trash2 />, tooltip: t('common.delete'), variant: 'red', confirm: { message: t('common.deleteConfirm') }, onClick: r => onDelete(r.id, 'commitment') },
									]} /></td>
								</tr>
							);
						})}
					</tbody></table></div></Card>
			) : <Card><Empty icon={Lock} title={t('states.noCommitments')} /></Card>}
		</div>
	);
}

// ─── Zakat Tab — redesigned ───────────────────────────────────────────────────
function ZakatTab({ incTotal, expTotal, log, locale, t, onDelete }) {
	const [mode, setMode] = useState('net');
	const [custom, setCst] = useState('');
	const [pct, setPct] = useState(2.5);

	const base = mode === 'net' ? Math.max(incTotal - expTotal, 0) : mode === 'total' ? incTotal : Number(custom || 0);
	const due = Math.round((base * pct) / 100);
	const paid = log.reduce((s, i) => s + Number(i.amount || 0), 0);
	const rem = Math.max(due - paid, 0);
	const prog = due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 0;
	const nisab = base >= 85 * 55.5;
	const R = 40, C = 2 * Math.PI * R, off = C - (prog / 100) * C;

	return (
		<div className="flex flex-col gap-4">

			{/* ── Hero card ── */}
			<div className="relative rounded-3xl overflow-hidden text-white"
				style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 35%,#047857 65%,#059669 100%)', boxShadow: '0 20px 50px -8px rgba(6,78,59,.5)' }}>
				<div className="absolute inset-0 pointer-events-none">
					<div className="absolute top-0 end-0 w-64 h-64 rounded-full bg-emerald-400/12 blur-3xl" />
					<div className="absolute bottom-0 start-0 w-40 h-40 rounded-full bg-emerald-300/10 blur-2xl" />
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />
					<div className="absolute inset-0 opacity-[0.05]"
						style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
				</div>

				<div className="relative z-10 p-5">
					{/* Title row */}
					<div className="flex items-center justify-between mb-5">
						<div className="flex items-center gap-3">
							<div className="w-11 h-11 rounded-2xl bg-white/12 border border-white/18 flex items-center justify-center backdrop-blur-sm">
								<Landmark size={20} />
							</div>
							<div>
								<div className="text-[16px] font-bold leading-tight">{t('zakat.title')}</div>
								<div className="text-[11px] text-white/50 mt-0.5">{t('zakat.subtitle')}</div>
							</div>
						</div>
						<div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border',
							nisab ? 'bg-emerald-400/20 border-emerald-400/35 text-emerald-200' : 'bg-white/10 border-white/18 text-white/55')}>
							<span className={cn('w-1.5 h-1.5 rounded-full', nisab ? 'bg-emerald-400' : 'bg-white/30')} />
							{nisab ? t('zakat.reachedNisab') : t('zakat.notReachedNisab')}
						</div>
					</div>

					{/* Ring + stat rows */}
					<div className="flex items-center gap-5">
						<div className="relative flex-shrink-0 w-[96px] h-[96px]">
							<svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90" aria-hidden="true">
								<circle cx="48" cy="48" r={R} fill="none" className="mn-zk-track" strokeWidth="7" />
								<circle cx="48" cy="48" r={R} fill="none" className="mn-zk-fill" strokeWidth="7"
									strokeDasharray={C} strokeDashoffset={off}
									style={{ transition: 'stroke-dashoffset .9s cubic-bezier(0.16,1,0.3,1)', filter: 'drop-shadow(0 0 7px rgba(52,211,153,.7))' }} />
							</svg>
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<div className="text-[23px] font-black leading-none tabular-nums">{prog}%</div>
								<div className="text-[7.5px] font-bold uppercase tracking-widest mt-0.5 text-white/45">{t('zakat.paid')}</div>
							</div>
						</div>
						<div className="flex-1 flex flex-col gap-1.5">
							{[
								{ l: t('zakat.due'), v: due, a: 'bg-white/10 border-white/14', d: 'bg-white/45' },
								{ l: t('zakat.paid'), v: paid, a: 'bg-emerald-400/20 border-emerald-300/25', d: 'bg-emerald-400' },
								{ l: t('zakat.remaining'), v: rem, a: rem > 0 ? 'bg-amber-400/18 border-amber-300/22' : 'bg-emerald-400/15 border-emerald-300/20', d: rem > 0 ? 'bg-amber-400' : 'bg-emerald-400' },
							].map(s => (
								<div key={s.l} className={cn('flex items-center justify-between px-3 py-2 rounded-xl border', s.a)}>
									<div className="flex items-center gap-2">
										<span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.d)} />
										<span className="text-[10.5px] font-semibold text-white/60">{s.l}</span>
									</div>
									<span className="font-mono text-[13px] font-bold tabular-nums">{fmt(s.v, locale)} <span className="text-[9px] opacity-50">{t('common.currency')}</span></span>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Due amount strip */}
				{due > 0 && (
					<div className="relative z-10 mx-5 mb-5 mt-1 rounded-2xl flex items-center justify-between px-4 py-3"
						style={{ background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.14)' }}>
						<div>
							<div className="text-[9.5px] font-extrabold uppercase tracking-widest text-white/45 mb-1">{t('zakat.due')}</div>
							<div className="mn-serif text-[26px] text-white leading-tight">{fmt(due, locale)} <span className="text-sm opacity-50">{t('common.currency')}</span></div>
						</div>
						<div className="w-12 h-12 rounded-2xl bg-emerald-500/35 border border-emerald-400/25 flex items-center justify-center">
							<Heart size={20} />
						</div>
					</div>
				)}
			</div>

			{/* ── Calculation base ── */}
			<Card>
				<CardHeader title={t('zakat.calculationBase')} icon={BarChart3} />
				<div className="px-4 py-4 flex flex-col gap-4">
					<div className="grid grid-cols-3 gap-2">
						{[
							{ v: 'net', l: t('zakat.baseNet'), a: Math.max(incTotal - expTotal, 0) },
							{ v: 'total', l: t('zakat.baseTotal'), a: incTotal },
							{ v: 'custom', l: t('zakat.baseCustom'), a: Number(custom || 0) },
						].map(x => {
							const on = mode === x.v;
							return (
								<button key={x.v} onClick={() => setMode(x.v)}
									className={cn('rounded-2xl border p-3 text-center cursor-pointer transition-all duration-200 flex flex-col items-center gap-1.5',
										on ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-300)]' : 'bg-gray-50 border-gray-100 hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-100)]')}>
									<div className={cn('w-2.5 h-2.5 rounded-full transition-all duration-200', on ? 'bg-[var(--color-primary-500)]' : 'bg-gray-200')} />
									<div className={cn('text-[10px] font-bold', on ? 'text-[var(--color-primary-800)]' : 'text-gray-400')}>{x.l}</div>
									<div className={cn('font-mono text-[11px] font-bold tabular-nums', on ? 'text-[var(--color-primary-600)]' : 'text-gray-300')}>
										{x.v === 'custom' && !custom ? '–' : fmt(x.a, locale)}
									</div>
								</button>
							);
						})}
					</div>
					{mode === 'custom' && <Inp icon={DollarSign} type="number" value={custom} onChange={e => setCst(e.target.value)} placeholder={t('zakat.customBasePlaceholder')} />}
					<div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
						<div className="flex items-center justify-between mb-3">
							<span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700/60">{t('zakat.percentage')}</span>
							<div className="flex items-center gap-1">
								<span className="font-mono text-xl font-black text-emerald-700">{pct}</span>
								<span className="text-xs font-bold text-emerald-500">%</span>
							</div>
						</div>
						<input type="range" min="2" max="10" step="0.5" value={pct} onChange={e => setPct(Number(e.target.value))}
							className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500"
							style={{ background: `linear-gradient(to right,#10b981 0%,#10b981 ${((pct - 2) / 8) * 100}%,#d1fae5 ${((pct - 2) / 8) * 100}%,#d1fae5 100%)` }} />
						<div className="flex justify-between mt-1.5"><span className="text-[9px] font-bold text-emerald-400">2%</span><span className="text-[9px] font-bold text-emerald-400">10%</span></div>
					</div>
				</div>
			</Card>

			{/* ── Zakat log ── */}
			<Card>
				<CardHeader title={t('zakat.logTitle')} icon={Heart}
					action={<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">{log.length}</span>} />
				{log.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="mn-table"><thead><tr>
							<th>#</th><th>{t('table.description')}</th><th>{t('table.amount')}</th><th>{t('table.date')}</th><th className="w-16"></th>
						</tr></thead><tbody>
								{log.map((item, idx) => (
									<tr key={item.id}>
										<td><div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-bold bg-gradient-to-br from-emerald-500 to-emerald-600">{idx + 1}</div></td>
										<td><span className="font-semibold text-emerald-900">{item.description}</span></td>
										<td><span className="font-mono font-bold text-emerald-600 tabular-nums">{fmt(item.amount, locale)} <span className="text-xs opacity-60">{t('common.currency')}</span></span></td>
										<td><Badge color="muted">{fmtD(item.date, locale)}</Badge></td>
										<td><ActionButtons row={item} actions={[{ icon: <Trash2 />, tooltip: t('common.delete'), variant: 'red', confirm: { message: t('common.deleteConfirm') }, onClick: r => onDelete(r.id) }]} /></td>
									</tr>
								))}
							</tbody></table>
						<div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-t border-emerald-100">
							<span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">{t('zakat.paid')} — {log.length}</span>
							<span className="font-mono text-base font-bold text-emerald-700 tabular-nums">{fmt(paid, locale)} <span className="text-xs opacity-60">{t('common.currency')}</span></span>
						</div>
					</div>
				) : <Empty icon={Heart} title={t('states.noZakat')} />}
			</Card>
		</div>
	);
}

// ─── Expected Tab ─────────────────────────────────────────────────────────────
function ExpectedTab({ data, locale, t, onEdit, onDelete }) {
	const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
	return (
		<div className="flex flex-col gap-3.5">
			<div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
				<div className="relative z-10 flex items-center gap-3.5">
					<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-amber-200"><Star size={22} /></div>
					<div className="flex-1">
						<div className="text-[9.5px] font-extrabold uppercase tracking-widest text-amber-600/70 mb-1">{t('expected.totalLabel')}</div>
						<div className="mn-serif text-[30px] text-amber-700 leading-tight">{fmt(total, locale)} <span className="text-sm opacity-60">{t('common.currency')}</span></div>
					</div>
					<ArrowUpRight size={28} className="text-amber-300" />
				</div>
			</div>
			{data.length > 0 ? (
				<Card><div className="overflow-x-auto"><table className="mn-table"><thead><tr>
					<th>{t('expected.descLabel')}</th><th>{t('table.amount')}</th><th>{t('expected.dateLabel')}</th><th>{t('expected.notesLabel')}</th><th className="w-20"></th>
				</tr></thead><tbody>
						{data.map(item => (
							<tr key={item.id}>
								<td><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0"><Star size={14} className="text-amber-500" /></div><span className="font-semibold text-[var(--color-primary-900)]">{item.description}</span></div></td>
								<td><span className="font-mono font-bold text-amber-600 tabular-nums">+{fmt(item.amount, locale)}</span></td>
								<td><Badge color="amber">{fmtD(item.expectedDate, locale)}</Badge></td>
								<td><span className="text-xs text-[var(--color-primary-400)]">{item.notes || '—'}</span></td>
								<td><ActionButtons row={item} actions={[
									{ icon: <Edit2 />, tooltip: t('common.edit'), variant: 'blue', onClick: r => onEdit(r) },
									{ icon: <Trash2 />, tooltip: t('common.delete'), variant: 'red', confirm: { message: t('common.deleteConfirm') }, onClick: r => onDelete(r.id) },
								]} /></td>
							</tr>
						))}
					</tbody></table></div></Card>
			) : <Card><Empty icon={Star} title={t('expected.emptyTitle')} subtitle={t('expected.emptySubtitle')} /></Card>}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function MoneyPage() {
	const t = useTranslations('money');
	const locale = useLocale();
	const isRTL = locale === 'ar';
	const mob = useIsMobile();

	const [tab, setTab] = useState('income');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [toggling, setToggling] = useState(null);
	const [notifOpen, setNotifOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [editData, setEditData] = useState(null);
	const [expAddOpen, setExpAddOpen] = useState(false);
	const [expEditOpen, setExpEditOpen] = useState(false);
	const [expEditData, setExpEditData] = useState(null);
	const [forecastOpen, setForecastOpen] = useState(false);

	const [dash, setDash] = useState(null);
	const [months, setMonths] = useState([]);
	const [income, setIncome] = useState([]);
	const [expenses, setExpenses] = useState([]);
	const [commits, setCommits] = useState([]);
	const [zakat, setZakat] = useState([]);
	const [expected, setExpected] = useState([]);
	const [notifs, setNotifs] = useState([]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [d, m, i, e, c, z, n, ex] = await Promise.all([
				moneyApi.getDashboard(), moneyApi.getMonthlySummary(),
				moneyApi.getIncome(), moneyApi.getExpenses(),
				moneyApi.getCommitments(), moneyApi.getZakat(),
				moneyApi.getNotifications(),
				moneyApi.getExpected().catch(() => ({ data: [] })),
			]);
			setDash(d.data || null); setMonths(m.data || []);
			setIncome(i.data || []); setExpenses(e.data || []);
			setCommits(c.data || []); setZakat(z.data || []);
			setNotifs(n.data || []); setExpected(ex.data || []);
		} catch (err) { console.error(err); }
		finally { setLoading(false); }
	}, []);

	useEffect(() => { load(); }, [load]);

	const handleSave = async form => {
		setSaving(true);
		try {
			if (form.type === 'income') {
				const p = { source: form.source, amount: +form.amount, date: form.date, recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: +form.recurrenceEvery || 1 };
				editData ? await moneyApi.updateIncome(editData.id, p) : await moneyApi.createIncome(p);
				setTab('income');
			} else if (form.type === 'expense') {
				const p = { description: form.desc, amount: +form.amount, date: form.date, recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: +form.recurrenceEvery || 1 };
				editData ? await moneyApi.updateExpense(editData.id, p) : await moneyApi.createExpense(p);
				setTab('expenses');
			} else if (form.type === 'commitment') {
				const p = { name: form.desc, amount: +form.amount, dueDate: form.date, type: form.commitType, status: editData?.status || 'pending', recurring: form.recurring, recurrenceType: form.recurrenceType, recurrenceEvery: +form.recurrenceEvery || 1, jamiaStart: form.commitType === 'جمعية' ? form.jamiaStart || null : null, jamiaEnd: form.commitType === 'جمعية' ? form.jamiaEnd || null : null, jamiaMyMonth: form.commitType === 'جمعية' ? form.jamiaMyMonth || null : null };
				editData ? await moneyApi.updateCommitment(editData.id, p) : await moneyApi.createCommitment(p);
				setTab('commits');
			} else {
				await moneyApi.createZakat({ description: form.zakatDesc, amount: +form.amount, date: form.date, isZakat: true });
				setTab('zakat');
			}
			setAddOpen(false); setEditOpen(false); setEditData(null);
			await load();
		} catch (err) { console.error(err); }
		finally { setSaving(false); }
	};

	const handleDelete = async (id, type) => {
		try {
			if (type === 'income') await moneyApi.deleteIncome(id);
			else if (type === 'expense') await moneyApi.deleteExpense(id);
			else if (type === 'commitment') await moneyApi.deleteCommitment(id);
			await load();
		} catch (err) { console.error(err); }
	};

	const handleEdit = (item, type) => { setEditData({ ...item, _formType: type }); setEditOpen(true); };

	const handleExpectedSave = async form => {
		setSaving(true);
		try {
			const p = { description: form.description, amount: +form.amount, expectedDate: form.expectedDate, notes: form.notes };
			expEditData ? await moneyApi.updateExpected(expEditData.id, p) : await moneyApi.createExpected(p);
			setExpAddOpen(false); setExpEditOpen(false); setExpEditData(null);
			setTab('expected');
			await load();
		} catch (err) { console.error(err); }
		finally { setSaving(false); }
	};

	const handleExpectedDelete = async id => {
		try { await moneyApi.deleteExpected(id); await load(); } catch (err) { console.error(err); }
	};

	// ── Derived ──
	const stats = dash?.stats || {};
	const bal = Number(stats.balance || 0);
	const incT = Number(stats.totalIncome || 0);
	const expT = Number(stats.totalExpenses || 0);
	const unread = notifs.filter(i => !i.isRead).length;

	const totalCom = Number(stats.totalCommitments || 0);
	const totalZakat = Number(stats.totalZakatPaid || 0);
	const totalRem = incT - expT - totalCom - totalZakat;
	const spendRate = incT > 0 ? Math.round(((expT + totalCom + totalZakat) / incT) * 100) : 0;

	const tabs = useMemo(() => [
		{ id: 'income', l: t('tabs.income'), I: TrendingUp, n: income.length },
		{ id: 'expenses', l: t('tabs.expenses'), I: TrendingDown, n: expenses.length },
		{ id: 'commits', l: t('tabs.commitments'), I: Layers, n: commits.length },
		{ id: 'zakat', l: t('tabs.zakat'), I: Landmark, n: zakat.length },
		{ id: 'expected', l: t('tabs.expected'), I: Star, n: expected.length },
	], [t, income.length, expenses.length, commits.length, zakat.length, expected.length]);

	const isExpectedTab = tab === 'expected';

	return (
		<div className="mn-root !p-0  min-h-screen flex flex-col">
			<Styles />

			<div
				className="relative overflow-hidden rounded-md px-4 sm:px-5 pt-5 pb-0"
				style={{
					background: 'linear-gradient(150deg,var(--color-primary-800) 0%,var(--color-primary-700) 28%,var(--color-gradient-via) 62%,var(--color-secondary-600) 100%)',
				}}
			>
				<div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

				<div
					className="absolute inset-0 opacity-[0.055] pointer-events-none mix-blend-overlay"
					style={{
						backgroundImage:
							"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
					}}
				/>
				<div className="absolute w-80 h-80 rounded-full bg-white/[0.07] blur-[60px] -top-40 -start-24 pointer-events-none" />
				<div className="absolute w-64 h-64 rounded-full bg-white/[0.05] blur-[55px] -bottom-24 -end-16 pointer-events-none" />
				<div className="absolute w-48 h-24 rounded-full pointer-events-none"
					style={{ background: 'radial-gradient(ellipse,rgba(255,255,255,.09) 0%,transparent 70%)', top: '30%', left: '40%' }} />

				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
				<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

				<div
					className="absolute -top-10 -end-10 w-44 h-44 rounded-full border border-white/10 pointer-events-none"
					style={{ boxShadow: 'inset 0 0 40px rgba(255,255,255,0.04)' }}
				/>
				<div className="absolute -top-4 -end-4 w-28 h-28 rounded-full border border-white/8 pointer-events-none" />

				<div className="relative z-10 flex items-start justify-between gap-3 mb-5">

					<div>
						<div className="mn-serif text-[23px] text-white leading-tight drop-shadow-sm tracking-[-0.01em]">
							{t('header.title')}
						</div>
						<div className="text-[11px] text-white/45 mt-0.5 tracking-wide">
							{t('header.subtitle')}
						</div>
					</div>

					{/* Action cluster */}
					<div className="flex items-center gap-1.5 shrink-0">

						{/* Forecast */}
						<button
							onClick={() => setForecastOpen(true)}
							className="relative h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 hover:scale-[1.03] active:scale-95"
							style={{
								background: 'rgba(255,255,255,0.12)',
								border: '1px solid rgba(255,255,255,0.2)',
								color: 'rgba(255,255,255,0.9)',
								backdropFilter: 'blur(8px)',
								WebkitBackdropFilter: 'blur(8px)',
							}}
						>
							<Target size={13} />
							<span className="hidden sm:inline">{t('forecast.button')}</span>
						</button>

						{/* Notifications */}
						<button
							onClick={() => setNotifOpen(true)}
							className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-[1.03] active:scale-95"
							style={{
								background: 'rgba(255,255,255,0.12)',
								border: '1px solid rgba(255,255,255,0.2)',
								color: 'rgba(255,255,255,0.9)',
								backdropFilter: 'blur(8px)',
								WebkitBackdropFilter: 'blur(8px)',
							}}
						>
							<Bell size={15} />
							{unread > 0 && (
								<span className="mn-pulse absolute -top-1 -end-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center shadow-md ring-2 ring-white/20">
									{unread}
								</span>
							)}
						</button>

						{/* Primary CTA — elevated white pill */}
						<button
							onClick={() => isExpectedTab ? setExpAddOpen(true) : setAddOpen(true)}
							className="h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap border-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
							style={{
								background: 'rgba(255,255,255,0.96)',
								color: 'var(--color-primary-700)',
								boxShadow: '0 4px 20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,1)',
							}}
						>
							<Plus size={14} />
							<span className="hidden sm:inline">{t('common.add')}</span>
						</button>
					</div>
				</div>

				{/* ── Credit Card ── */}
				<div className="relative z-10 mb-5">
					{loading ? (
						<div className="bg-[var(--color-primary-700)] rounded-[22px]" style={{ height: 195 }} />
					) : (
						<CreditCardDisplay
							balance={bal}
							income={incT}
							expenses={expT}
							commitments={totalCom}
							remaining={totalRem}
							currency={t('common.currency')}
							locale={locale}
							spendRate={spendRate}
							t={t}
						/>
					)}
				</div>

				{/* ── Tabs ── */}
				<div className="relative z-10 flex items-center gap-1.5 pb-4 overflow-x-auto mn-hide-scroll">
					{tabs.map(({ id, l, I, n }) => {
						const on = tab === id;
						return (
							<button
								key={id}
								onClick={() => setTab(id)}
								className={cn(
									'flex-shrink-0 flex items-center gap-1.5 max-md:px-2 max-md:gap-1 px-3.5 py-2 rounded-full border',
									'text-[11.5px] max-md:text-[10px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200',
									on
										? 'mn-tab-on text-[var(--color-primary-700)] border-transparent font-bold shadow-lg scale-[1.02]'
										: 'border-white/15 text-white/75 hover:text-white hover:border-white/30 hover:bg-white/10',
								)}
								style={
									!on
										? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }
										: {}
								}
							>
								<I size={12} className='' strokeWidth={on ? 2.5 : 2} />
								{l}
								{n !== null && (
									<span
										className={cn(
											'text-[9px] max-md:hidden font-bold px-1.5 py-0.5 rounded-full',
											on
												? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]'
												: 'bg-white/15 text-white/70',
										)}
									>
										{n}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* ══ BODY ════════════════════════════════════════════════════════════ */}
			<div className="flex-1 py-4 pb-24 bg-[var(--color-primary-50)] min-h-[40vh]">
				{loading ? (
					<div className="flex flex-col gap-3">
						{[80, 130, 80, 110].map((h, i) => <Skeleton key={i} h={h} />)}
					</div>
				) : tab === 'income' ? <IncomeTab data={income} locale={locale} t={t} onEdit={handleEdit} onDelete={handleDelete} />
					: tab === 'expenses' ? <ExpensesTab data={expenses} locale={locale} t={t} onEdit={handleEdit} onDelete={handleDelete} />
						: tab === 'commits' ? (
							<CommitmentsTab data={commits} locale={locale} t={t}
								onToggle={async id => {
									setToggling(id);
									try { await moneyApi.toggleCommitmentStatus(id); await load(); } catch { }
									finally { setToggling(null); }
								}}
								togglingId={toggling} onEdit={handleEdit} onDelete={handleDelete}
							/>
						) : tab === 'zakat' ? (
							<ZakatTab incTotal={incT} expTotal={expT} log={zakat} locale={locale} t={t}
								onDelete={async id => { try { await moneyApi.deleteZakat(id); await load(); } catch { } }}
							/>
						) : (
							<ExpectedTab data={expected} locale={locale} t={t}
								onEdit={item => { setExpEditData(item); setExpEditOpen(true); }}
								onDelete={handleExpectedDelete}
							/>
						)
				}
			</div>

			{/* ══ PANELS ══════════════════════════════════════════════════════════ */}
			<Panel open={addOpen} onClose={() => setAddOpen(false)} title={t('form.addTitle')} mob={mob} isRTL={isRTL}>
				<AddForm t={t} locale={locale} onSave={handleSave} onClose={() => setAddOpen(false)} loading={saving} />
			</Panel>
			<Panel open={editOpen} onClose={() => { setEditOpen(false); setEditData(null); }} title={t('form.editTitle')} mob={mob} isRTL={isRTL}>
				{editData && <AddForm t={t} locale={locale} initialData={editData} onSave={handleSave} onClose={() => { setEditOpen(false); setEditData(null); }} loading={saving} />}
			</Panel>
			<Panel open={expAddOpen} onClose={() => setExpAddOpen(false)} title={t('expected.addTitle')} mob={mob} isRTL={isRTL}>
				<ExpectedForm t={t} locale={locale} onSave={handleExpectedSave} onClose={() => setExpAddOpen(false)} loading={saving} />
			</Panel>
			<Panel open={expEditOpen} onClose={() => { setExpEditOpen(false); setExpEditData(null); }} title={t('expected.editTitle')} mob={mob} isRTL={isRTL}>
				{expEditData && <ExpectedForm t={t} locale={locale} initialData={expEditData} onSave={handleExpectedSave} onClose={() => { setExpEditOpen(false); setExpEditData(null); }} loading={saving} />}
			</Panel>
			<Panel open={notifOpen} onClose={() => setNotifOpen(false)} title={t('notifications.title')} mob={mob} isRTL={isRTL}>
				<div className="flex flex-col gap-2.5 p-4">
					{notifs.length ? notifs.map(item => {
						const s = ({ warn: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800' }, ok: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800' }, alert: { border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-800' } })[item.type] || { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800' };
						return (
							<button key={item.id}
								onClick={async () => { try { await moneyApi.markNotificationRead(item.id); setNotifs(p => p.map(i => i.id === item.id ? { ...i, isRead: true } : i)); } catch { } }}
								className={cn('w-full text-start rounded-2xl px-3.5 py-3 border cursor-pointer hover:opacity-90 transition-opacity', s.border, s.bg, s.text, item.isRead && 'opacity-55')}>
								<div className="text-sm font-semibold mb-1">{item.text}</div>
								<div className="text-[11px] opacity-70">{item.timeLabel || t('notifications.new')}</div>
							</button>
						);
					}) : <Empty icon={Bell} title={t('notifications.empty')} />}
				</div>
			</Panel>
			<ForecastPanel open={forecastOpen} onClose={() => setForecastOpen(false)}
				income={income} expenses={expenses} commitments={commits} expected={expected}
				locale={locale} t={t} mob={mob} isRTL={isRTL} />
		</div>
	);
}


