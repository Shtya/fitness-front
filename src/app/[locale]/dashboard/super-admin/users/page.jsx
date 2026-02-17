'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
	Search, ChevronRight, Users, User, LogIn, RefreshCw, X,
	Clock, Dumbbell, Crown, UserX, Activity, Plus, Calendar,
	Building2, CornerDownRight, LogOut, MoreHorizontal,
	CheckCircle2, Ban, Eye, Trash2, KeyRound, Copy, Check,
	UserCheck, UserCog, UserCircle, Edit, Shield, SortAsc,
	ChevronDown, Filter, AlertTriangle, Mail, Phone,
} from 'lucide-react';
import api from '@/utils/axios';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';

// ─────────────────────────────────────────────────────────────────────────────
// Theme-aware CSS variables helper
// ─────────────────────────────────────────────────────────────────────────────
// Uses CSS variables:
// --color-primary-* (indigo shades)
// --color-secondary-* (purple shades)
// --color-gradient-from/via/to

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (d, locale = 'en') =>
	d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—';

const STATUS_CFG = {
	active: {
		cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
		dot: 'bg-emerald-500',
	},
	pending: {
		cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
		dot: 'bg-amber-500',
	},
	suspended: {
		cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
		dot: 'bg-red-500',
	},
};

const AVATAR_COLORS = [
	'from-[var(--color-primary-500)] to-[var(--color-secondary-600)]',
	'from-[var(--color-primary-400)] to-[var(--color-primary-600)]',
	'from-[var(--color-secondary-400)] to-[var(--color-secondary-600)]',
	'from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]',
	'from-cyan-500 to-[var(--color-primary-500)]',
	'from-[var(--color-secondary-500)] to-[var(--color-primary-700)]',
];

const SORT_OPTIONS = [
	{ value: 'name_asc', label: 'Name A→Z' },
	{ value: 'name_desc', label: 'Name Z→A' },
	{ value: 'date_desc', label: 'Newest first' },
	{ value: 'date_asc', label: 'Oldest first' },
	{ value: 'status', label: 'By status' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Micro components
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }) {
	const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
	const color = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
	const sizeMap = {
		xs: 'w-6 h-6 text-[9px]',
		sm: 'w-8 h-8 text-[10px]',
		md: 'w-10 h-10 text-xs',
		lg: 'w-12 h-12 text-sm',
		xl: 'w-14 h-14 text-base',
	};
	return (
		<div className={`${sizeMap[size]} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-black shrink-0 shadow-md ring-2 ring-white/20 dark:ring-black/20`}>
			{initials}
		</div>
	);
}

function StatusBadge({ status, t }) {
	const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
	const label = t ? t(`status.${status}`) : status;
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} inline-block`} />
			{label}
		</span>
	);
}

function RoleBadge({ role, t }) {
	const map = {
		admin: { icon: Building2, cls: 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]/30 border-[var(--color-primary-200)] dark:border-[var(--color-primary-900)]/40' },
		coach: { icon: Dumbbell, cls: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900/40' },
		client: { icon: User, cls: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
		super_admin: { icon: Crown, cls: 'text-[var(--color-secondary-600)] dark:text-[var(--color-secondary-400)] bg-[var(--color-secondary-50)] dark:bg-[var(--color-secondary-950)]/30 border-[var(--color-secondary-200)] dark:border-[var(--color-secondary-900)]/40' },
	};
	const cfg = map[role] || map.client;
	const Icon = cfg.icon;
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
			<Icon size={9} />
			{t ? t(`role.${role}`) : role}
		</span>
	);
}

function CopyBtn({ value, label }) {
	const [done, setDone] = useState(false);
	return (
		<button
			title={label || 'Copy'}
			onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
			className="p-1 rounded-lg hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-950)]/30 text-slate-400 hover:text-[var(--color-primary-500)] transition-all"
		>
			{done ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
		</button>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Credentials Modal
// ─────────────────────────────────────────────────────────────────────────────
function CredentialsModal({ user, onClose, t }) {
	const [creds, setCreds] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const { data } = await api.post(`/auth/admin/users/${user.id}/credentials`);
				setCreds(data);
			} catch {
				toast.error(t?.('errors.credsFailed') || 'Failed to fetch credentials');
				onClose();
			} finally {
				setLoading(false);
			}
		})();
	}, [user.id]);

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.92, opacity: 0, y: 16 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.92, opacity: 0, y: 16 }}
				className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden"
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800"
					style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))' }}
				>
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<KeyRound size={14} />
						</div>
						<div>
							<h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">Login Credentials</h3>
							<p className="text-[10px] text-slate-500">{user.name}</p>
						</div>
					</div>
					<button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors">
						<X size={15} />
					</button>
				</div>

				<div className="p-5 space-y-3">
					{loading ? (
						<div className="flex items-center justify-center py-8 gap-3">
							<RefreshCw size={18} className="animate-spin text-[var(--color-primary-500)]" />
							<span className="text-sm text-slate-500">Fetching credentials…</span>
						</div>
					) : creds ? (
						<>
							{[
								{ label: 'Email', value: creds.email || user.email, icon: Mail },
								{ label: 'Temp Password', value: creds.tempPassword, icon: KeyRound },
							].map(({ label, value, icon: Icon }) => (
								<div key={label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
									<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
										<Icon size={9} />{label}
									</p>
									<div className="flex items-center gap-2">
										<code className="flex-1 text-sm font-mono font-bold text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] truncate">{value}</code>
										<CopyBtn value={value} label={`Copy ${label}`} />
									</div>
								</div>
							))}
							<div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
								<AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
								<p className="text-[10px] text-amber-700 dark:text-amber-400">This is a temporary password. Share securely and ask the user to change it.</p>
							</div>
						</>
					) : null}
				</div>

				<div className="px-5 pb-5">
					<button onClick={onClose}
						className="w-full h-10 rounded-xl text-white text-sm font-bold transition-all shadow-lg"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
						Done
					</button>
				</div>
			</motion.div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit User Modal
// ─────────────────────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onUpdated, t }) {
	const [form, setForm] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
	const [loading, setLoading] = useState(false);
	const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

	const submit = async () => {
		setLoading(true);
		try {
			await api.put(`/auth/admin/users/${user.id}`, form);
			toast.success('User updated successfully');
			onUpdated?.();
			onClose();
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Update failed');
		} finally { setLoading(false); }
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.92, opacity: 0, y: 16 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.92, opacity: 0, y: 16 }}
				className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden"
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800"
					style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))' }}
				>
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<Edit size={14} />
						</div>
						<div>
							<h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">Edit User</h3>
							<p className="text-[10px] text-slate-500">{user.email}</p>
						</div>
					</div>
					<button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors">
						<X size={15} />
					</button>
				</div>

				<div className="p-5 space-y-4">
					{[
						{ key: 'name', label: 'Full Name', type: 'text', ph: 'Enter name', icon: User },
						{ key: 'email', label: 'Email', type: 'email', ph: 'Enter email', icon: Mail },
						{ key: 'phone', label: 'Phone', type: 'tel', ph: 'Enter phone', icon: Phone },
					].map(f => {
						const Icon = f.icon;
						return (
							<div key={f.key}>
								<label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
									<Icon size={11} />{f.label}
								</label>
								<input
									type={f.type} value={form[f.key]}
									onChange={e => set(f.key, e.target.value)}
									placeholder={f.ph}
									className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-400)] transition-all"
								/>
							</div>
						);
					})}
				</div>

				<div className="flex gap-2 px-5 pb-5">
					<button onClick={onClose}
						className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
					>
						Cancel
					</button>
					<button onClick={submit} disabled={loading}
						className="flex-1 h-10 rounded-xl text-white text-sm font-bold transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
						{loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
						Save Changes
					</button>
				</div>
			</motion.div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted, t }) {
	const [loading, setLoading] = useState(false);
	const doDelete = async () => {
		setLoading(true);
		try {
			await api.delete(`/auth/admin/users/${user.id}`);
			toast.success('User deleted');
			onDeleted?.();
			onClose();
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Delete failed');
		} finally { setLoading(false); }
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.92, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.92, opacity: 0 }}
				className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-2xl w-full max-w-sm overflow-hidden"
			>
				<div className="p-6 text-center">
					<div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto mb-4">
						<Trash2 size={24} className="text-red-500" />
					</div>
					<h3 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">Delete User?</h3>
					<p className="text-xs text-slate-500 mb-1">This action cannot be undone.</p>
					<p className="text-sm font-bold text-slate-700 dark:text-slate-300">{user.name}</p>
					<p className="text-xs text-slate-400">{user.email}</p>
				</div>
				<div className="flex gap-2 px-5 pb-5">
					<button onClick={onClose}
						className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
					>
						Cancel
					</button>
					<button onClick={doDelete} disabled={loading}
						className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
					>
						{loading ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
						Delete
					</button>
				</div>
			</motion.div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Buttons Row (compact)
// ─────────────────────────────────────────────────────────────────────────────
function ActionBar({ user, onImpersonate, onStatusChange, onEdit, onDelete, onShowCreds, t }) {
	const [menuOpen, setMenu] = useState(false);
	const menuRef = useRef(null);

	useEffect(() => {
		if (!menuOpen) return;
		const h = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
		document.addEventListener('mousedown', h);
		return () => document.removeEventListener('mousedown', h);
	}, [menuOpen]);

	return (
		<div className="flex items-center gap-1.5 shrink-0">
			{/* Login As */}
			<motion.button
				whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
				onClick={() => onImpersonate(user)}
				className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-white text-[10px] font-bold shadow-md transition-all"
				style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				title="Login as this user"
			>
				<LogIn size={10} />
				Login
			</motion.button>

			{/* 3-dot menu */}
			<div className="relative" ref={menuRef}>
				<button
					onClick={(e) => { e.stopPropagation(); setMenu(o => !o); }}
					className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
				>
					<MoreHorizontal size={14} />
				</button>

				<AnimatePresence>
					{menuOpen && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: -6 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: -6 }}
							transition={{ duration: 0.14 }}
							className="absolute ltr:right-0 rtl:left-0 top-9 z-40 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl py-1 overflow-hidden"
						>
							{/* View Dashboard */}
							<button onClick={() => { onImpersonate(user); setMenu(false); }}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-950)]/20 hover:text-[var(--color-primary-600)] transition-colors"
							>
								<Eye size={12} />View Dashboard
							</button>

							{/* Edit */}
							<button onClick={() => { onEdit(user); setMenu(false); }}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-950)]/20 hover:text-[var(--color-primary-600)] transition-colors"
							>
								<Edit size={12} />Edit Data
							</button>

							{/* Credentials */}
							<button onClick={() => { onShowCreds(user); setMenu(false); }}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-950)]/20 hover:text-[var(--color-primary-600)] transition-colors"
							>
								<KeyRound size={12} />Copy Credentials
							</button>

							<div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

							{/* Status changes */}
							{user.status !== 'active' && (
								<button onClick={() => { onStatusChange(user.id, 'active'); setMenu(false); }}
									className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
								>
									<CheckCircle2 size={12} />Activate
								</button>
							)}
							{user.status !== 'suspended' && (
								<button onClick={() => { onStatusChange(user.id, 'suspended'); setMenu(false); }}
									className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
								>
									<Ban size={12} />Suspend Account
								</button>
							)}

							<div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

							{/* Delete */}
							<button onClick={() => { onDelete(user); setMenu(false); }}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
							>
								<Trash2 size={12} />Delete User
							</button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Impersonation bar
// ─────────────────────────────────────────────────────────────────────────────
function ImpersonationBar({ t }) {
	// ── Exit impersonation ──
	const onExit = useCallback(async () => {
		const raw = localStorage.getItem('super_admin_prev_session');
		if (!raw) return;
		try {
			const prev = JSON.parse(raw);
			localStorage.setItem('accessToken', prev.accessToken);
			localStorage.setItem('refreshToken', prev.refreshToken);
			localStorage.setItem('user', prev.user);
			localStorage.removeItem('impersonated_user');
			localStorage.removeItem('super_admin_prev_session');

			await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken: prev.accessToken, refreshToken: prev.refreshToken, user: JSON.parse(prev.user) }),
			});

			toast.success('Returned to super admin');
			setImp(false);
			router.push(`/${locale}/dashboard/super-admin/users`);
		} catch { toast.error('Failed to restore session'); }
	}, [router, locale]);

	const [user, setUser] = useState(null);
	useEffect(() => {
		try { setUser(JSON.parse(localStorage.getItem('impersonated_user') || 'null')); } catch { }
	}, []);
	if (!user) return null;
	return (
		<motion.div
			initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
			className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-4 px-6 py-3.5 text-white shadow-2xl"
			style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))' }}
		>
			<div className="flex items-center gap-3 text-sm font-semibold min-w-0">
				<div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
					<Shield size={14} />
				</div>
				<span className="truncate">
					Impersonating <strong className="underline underline-offset-2">{user.name}</strong>
					<span className="opacity-70 ml-2 text-xs">({user.email})</span>
				</span>
			</div>
			<button onClick={onExit}
				className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-bold border border-white/30 transition-all backdrop-blur-sm"
			>
				<LogOut size={13} />
				{t ? t('impersonation.return') : 'Return to Super Admin'}
			</button>
		</motion.div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Row
// ─────────────────────────────────────────────────────────────────────────────
function ClientRow({ client, onImpersonate, onStatusChange, onEdit, onDelete, onShowCreds, t, locale }) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -8 }}
			animate={{ opacity: 1, x: 0 }}
			className="flex items-center gap-3 py-2.5 px-4 ltr:pl-24 rtl:pr-24 hover:bg-[var(--color-primary-50)]/40 dark:hover:bg-[var(--color-primary-950)]/10 group transition-all"
		>
			<CornerDownRight size={10} className="text-slate-300 dark:text-slate-700 shrink-0" />
			<Avatar name={client.name} size="xs" />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5 flex-wrap">
					<p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{client.name}</p>
					<StatusBadge status={client.status} t={t} />
				</div>
				<div className="flex items-center gap-1">
					<p className="text-[10px] text-slate-400 truncate">{client.email}</p>
					<CopyBtn value={client.email} />
				</div>
			</div>
			<p className="text-[10px] text-slate-400 hidden lg:block shrink-0">{fmt(client.created_at, locale)}</p>
			<div className="opacity-0 group-hover:opacity-100 transition-all">
				<ActionBar
					user={client}
					onImpersonate={onImpersonate}
					onStatusChange={onStatusChange}
					onEdit={onEdit}
					onDelete={onDelete}
					onShowCreds={onShowCreds}
					t={t}
				/>
			</div>
		</motion.div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Coach Row (expandable → clients)
// ─────────────────────────────────────────────────────────────────────────────
function CoachRow({ coach, onImpersonate, onStatusChange, onEdit, onDelete, onShowCreds, t, locale }) {
	const [open, setOpen] = useState(false);
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const toggle = useCallback(async () => {
		if (loaded) { setOpen(o => !o); return; }
		setLoading(true);
		try {
			const { data } = await api.get(`/auth/coach/${coach.id}/clients`, { params: { limit: 100 } });
			setClients(data.items || data.users || []);
			setLoaded(true); setOpen(true);
		} catch { toast.error('Failed to load clients'); }
		finally { setLoading(false); }
	}, [coach.id, loaded]);

	return (
		<div className="border-t border-slate-100 dark:border-slate-800/60">
			<div
				className="flex items-center gap-3 py-2.5 ltr:pl-12 rtl:pr-12 ltr:pr-4 rtl:pl-4 hover:bg-cyan-50/40 dark:hover:bg-cyan-950/10 cursor-pointer group transition-all"
				onClick={toggle}
			>
				<div className="w-5 flex justify-center shrink-0">
					{loading
						? <RefreshCw size={11} className="animate-spin text-cyan-400" />
						: (
							<motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
								<ChevronRight size={11} className="text-cyan-400" />
							</motion.div>
						)
					}
				</div>
				<CornerDownRight size={10} className="text-slate-300 dark:text-slate-600 shrink-0" />
				<Avatar name={coach.name} size="sm" />
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{coach.name}</p>
						<RoleBadge role="coach" t={t} />
						<StatusBadge status={coach.status} t={t} />
					</div>
					<div className="flex items-center gap-1">
						<p className="text-[10px] text-slate-400 truncate">{coach.email}</p>
						<CopyBtn value={coach.email} />
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<p className="text-[10px] text-slate-400 hidden md:block">{fmt(coach.created_at, locale)}</p>
					{clients.length > 0 && (
						<span className="px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 text-[9px] font-black">
							{clients.length}
						</span>
					)}
				</div>
				<div className="opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
					<ActionBar
						user={coach}
						onImpersonate={onImpersonate}
						onStatusChange={onStatusChange}
						onEdit={onEdit}
						onDelete={onDelete}
						onShowCreds={onShowCreds}
						t={t}
					/>
				</div>
			</div>

			<AnimatePresence>
				{open && (
					<motion.div
						key="clients"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.22 }}
						className="overflow-hidden bg-slate-50/60 dark:bg-slate-900/20"
					>
						{clients.length === 0
							? <p className="ltr:pl-28 rtl:pr-28 py-3 text-[10px] text-slate-400 italic flex items-center gap-1.5"><User size={10} />No clients assigned</p>
							: clients.map(c => (
								<ClientRow
									key={c.id} client={c}
									onImpersonate={onImpersonate} onStatusChange={onStatusChange}
									onEdit={onEdit} onDelete={onDelete} onShowCreds={onShowCreds}
									t={t} locale={locale}
								/>
							))
						}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Card (expandable → coaches → clients)
// ─────────────────────────────────────────────────────────────────────────────
function AdminCard({ admin, onImpersonate, onStatusChange, onEdit, onDelete, onShowCreds, t, locale }) {
	const [open, setOpen] = useState(false);
	const [coaches, setCoaches] = useState([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const loadCoaches = useCallback(async () => {
		if (loaded) { setOpen(o => !o); return; }
		setLoading(true);
		try {
			const { data } = await api.get(`/auth/admin/${admin.id}/coaches`, { params: { limit: 100 } });
			setCoaches(data.items || []);
			setLoaded(true); setOpen(true);
		} catch { toast.error('Failed to load coaches'); }
		finally { setLoading(false); }
	}, [admin.id, loaded]);

	const counts = admin.counts || {};
	const daysLeft = admin.daysLeft;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-[var(--color-primary-500)]/5 transition-all duration-300"
		>
			{/* Gradient top accent */}
			<div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))' }} />

			{/* Admin header */}
			<div className="p-4 sm:p-5">
				<div className="flex items-start gap-3">
					{/* Expand toggle */}
					<motion.button
						whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
						onClick={loadCoaches}
						className="mt-1 w-8 h-8 rounded-xl border flex items-center justify-center transition-all shrink-0"
						style={{
							background: open
								? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
								: 'var(--color-primary-50)',
							borderColor: 'var(--color-primary-200)',
							color: open ? 'white' : 'var(--color-primary-500)',
						}}
					>
						{loading
							? <RefreshCw size={13} className="animate-spin" />
							: <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.22 }}>
								<ChevronRight size={13} />
							</motion.div>
						}
					</motion.button>

					<Avatar name={admin.name} size="lg" />

					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between gap-2 flex-wrap">
							<div className="min-w-0">
								<div className="flex items-center gap-2 flex-wrap mb-0.5">
									<p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{admin.name}</p>
									<RoleBadge role="admin" t={t} />
									<StatusBadge status={admin.status} t={t} />
									{daysLeft !== null && daysLeft !== undefined && daysLeft < 30 && (
										<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${daysLeft < 7 ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40'}`}>
											<Clock size={9} />
											{daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
										</span>
									)}
								</div>
								<div className="flex items-center gap-1">
									<p className="text-xs text-slate-400 truncate">{admin.email}</p>
									<CopyBtn value={admin.email} />
								</div>
							</div>

							<ActionBar
								user={admin}
								onImpersonate={onImpersonate}
								onStatusChange={onStatusChange}
								onEdit={onEdit}
								onDelete={onDelete}
								onShowCreds={onShowCreds}
								t={t}
							/>
						</div>

						{/* Mini stats row */}
						<div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
							{[
								{ icon: Dumbbell, label: 'Coaches', val: counts.coaches ?? 0, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/20' },
								{ icon: Users, label: 'Clients', val: counts.clients ?? 0, color: 'text-[var(--color-primary-500)]', bg: 'bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]/20' },
								{ icon: Activity, label: 'Active', val: counts.activeClients ?? 0, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
								{ icon: UserX, label: 'Suspended', val: counts.suspendedClients ?? 0, color: 'text-red-400', bg: 'bg-red-50 dark:bg-red-950/20' },
							].map((s, i) => {
								const Icon = s.icon;
								return (
									<div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl ${s.bg}`}>
										<Icon size={12} className={s.color} />
										<span className="text-xs font-black text-slate-700 dark:text-slate-300">{s.val}</span>
										<span className="text-[10px] text-slate-400">{s.label}</span>
									</div>
								);
							})}
							<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
								<Calendar size={11} className="text-slate-400" />
								<span className="text-[10px] text-slate-400">{fmt(admin.created_at, locale)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Coaches list */}
			<AnimatePresence>
				{open && (
					<motion.div
						key="coaches"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.28 }}
						className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
					>
						{coaches.length === 0
							? (
								<p className="flex items-center gap-2 px-6 py-4 text-xs text-slate-400 italic">
									<Dumbbell size={12} />No coaches assigned yet
								</p>
							)
							: coaches.map(coach => (
								<CoachRow
									key={coach.id}
									coach={coach}
									onImpersonate={onImpersonate}
									onStatusChange={onStatusChange}
									onEdit={onEdit}
									onDelete={onDelete}
									onShowCreds={onShowCreds}
									t={t}
									locale={locale}
								/>
							))
						}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Create User Modal
// ─────────────────────────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose, onCreated, t }) {
	const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'admin' });
	const [loading, setLoading] = useState(false);
	const [tempPass, setTempPass] = useState('');
	const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

	const submit = async () => {
		if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email are required');
		setLoading(true);
		try {
			const { data } = await api.post('/auth/admin/users', form);
			setTempPass(data.tempPassword || '');
			toast.success('User created successfully!');
			onCreated?.();
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Create failed');
		} finally { setLoading(false); }
	};

	const handleClose = () => { setForm({ name: '', email: '', phone: '', role: 'admin' }); setTempPass(''); onClose(); };

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.93, opacity: 0, y: 20 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.93, opacity: 0, y: 20 }}
				className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden"
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800"
					style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))' }}
				>
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<Plus size={16} />
						</div>
						<div>
							<h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">Create New User</h3>
							<p className="text-[10px] text-slate-500">Fill in the details below</p>
						</div>
					</div>
					<button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors">
						<X size={16} />
					</button>
				</div>

				<div className="p-5 space-y-4">
					{tempPass ? (
						<div className="text-center py-4">
							<div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
								style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
							>
								<CheckCircle2 size={30} className="text-white" />
							</div>
							<p className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">User Created!</p>
							<p className="text-xs text-slate-500 mb-4">Temporary password generated. Share securely.</p>
							<div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
								<code className="flex-1 text-sm font-mono font-black" style={{ color: 'var(--color-primary-600)' }}>{tempPass}</code>
								<CopyBtn value={tempPass} />
							</div>
						</div>
					) : (
						<>
							{[
								{ key: 'name', label: 'Full Name', type: 'text', ph: 'e.g. John Doe', icon: User },
								{ key: 'email', label: 'Email', type: 'email', ph: 'e.g. john@example.com', icon: Mail },
								{ key: 'phone', label: 'Phone', type: 'tel', ph: 'e.g. +1 555 000 0000', icon: Phone },
							].map(f => {
								const Icon = f.icon;
								return (
									<div key={f.key}>
										<label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
											<Icon size={10} />{f.label}
										</label>
										<input
											type={f.type} value={form[f.key]}
											onChange={e => set(f.key, e.target.value)}
											placeholder={f.ph}
											className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all"
											style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
										/>
									</div>
								);
							})}
							<div>
								<label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
									<Shield size={10} />Role
								</label>
								<select
									value={form.role}
									onChange={e => set('role', e.target.value)}
									className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none appearance-none"
								>
									<option value="admin">Admin</option>
									<option value="coach">Coach</option>
									<option value="client">Client</option>
								</select>
							</div>
						</>
					)}
				</div>

				<div className="flex gap-2 px-5 pb-5">
					{tempPass ? (
						<button onClick={handleClose}
							className="flex-1 h-10 rounded-xl text-white text-sm font-bold transition-all shadow-lg"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							Done
						</button>
					) : (
						<>
							<button onClick={handleClose}
								className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
							>
								Cancel
							</button>
							<button onClick={submit} disabled={loading}
								className="flex-1 h-10 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
								style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
							>
								{loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
								Create User
							</button>
						</>
					)}
				</div>
			</motion.div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function SuperAdminUsersPage() {
	const router = useRouter();
	const t = useTranslations('superAdmin');
	const locale = useLocale();
	const dir = locale === 'ar' ? 'rtl' : 'ltr';

	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatus] = useState('');
	const [roleFilter, setRole] = useState('');   // '', 'admin', 'coach', 'client'
	const [sortBy, setSortBy] = useState('date_desc');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPgs] = useState(1);
	const [totalCount, setCount] = useState(0);
	const [createOpen, setCreate] = useState(false);
	const [isImpersonating, setImp] = useState(false);
	const [editUser, setEditUser] = useState(null);
	const [deleteUser, setDeleteUser] = useState(null);
	const [credsUser, setCredsUser] = useState(null);
	const searchTimer = useRef(null);

	const stats = useMemo(() => ({
		totalUsers: items.length,
		activeUsers: items.filter(u => u.status === 'active').length,
		coaches: items.filter(u => u.role === 'coach').length + items.reduce((s, u) => s + (u.counts?.coaches || 0), 0),
		clients: items.filter(u => u.role === 'client').length + items.reduce((s, u) => s + (u.counts?.clients || 0), 0),
	}), [items]);

	useEffect(() => {
		setImp(!!localStorage.getItem('super_admin_prev_session'));
	}, []);

	// ── Fetch ──
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const { data } = await api.get('/auth/super-admin/overview', {
				params: {
					page, limit: 15, includeTree: true,
					...(search && { search }),
					...(statusFilter && { status: statusFilter }),
					...(roleFilter && { role: roleFilter }),
					...(sortBy && { sort: sortBy }),
				},
			});
			setItems(data.items || []);
			setTotalPgs(data.totalPages || 1);
			setCount(data.total || 0);
		} catch { toast.error('Failed to load users'); }
		finally { setLoading(false); }
	}, [page, search, statusFilter, roleFilter, sortBy]);

	useEffect(() => { fetchUsers(); }, [fetchUsers]);

	const handleSearch = v => {
		setSearch(v); setPage(1);
		clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(fetchUsers, 450);
	};

	// ── Impersonate ──
	const handleImpersonate = useCallback(async (target) => {
		const toastId = toast.loading('Logging in as user…');
		try {
			const prev = {
				accessToken: localStorage.getItem('accessToken'),
				refreshToken: localStorage.getItem('refreshToken'),
				user: localStorage.getItem('user'),
			};
			localStorage.setItem('super_admin_prev_session', JSON.stringify(prev));

			const { data: creds } = await api.post(`/auth/admin/users/${target.id}/credentials`);
			const { data: session } = await api.post('/auth/login', { email: creds.email, password: creds.tempPassword });
			const { accessToken, refreshToken, user } = session;

			localStorage.setItem('accessToken', accessToken);
			localStorage.setItem('refreshToken', refreshToken);
			localStorage.setItem('user', JSON.stringify(user));
			localStorage.setItem('impersonated_user', JSON.stringify(user));

			await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, refreshToken, user }),
			});

			toast.success(`Logged in as ${user.name}`, { id: toastId });
			setImp(true);

			const roleRoutes = { admin: '/dashboard/users', coach: '/dashboard/users', client: '/dashboard/my/workouts' };
			router.push(`/${locale}${roleRoutes[user.role] || '/dashboard/users'}`);
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Impersonation failed', { id: toastId });
			localStorage.removeItem('super_admin_prev_session');
		}
	}, [router, locale]);



	// ── Status change ──
	const handleStatusChange = useCallback(async (userId, status) => {
		try {
			await api.put(`/auth/status/${userId}`, { status });
			toast.success(`Status updated to ${status}`);
			fetchUsers();
		} catch { toast.error('Status update failed'); }
	}, [fetchUsers]);

	// ── Delete ──
	const handleDelete = useCallback(async () => {
		fetchUsers();
		setDeleteUser(null);
	}, [fetchUsers]);

	const admins = useMemo(() => items.filter(u => u.role === 'admin'), [items]);
	const others = useMemo(() => items.filter(u => u.role !== 'admin'), [items]);

	const pageNums = useMemo(() => {
		const range = []; const delta = 2;
		const left = Math.max(1, page - delta);
		const right = Math.min(totalPages, page + delta);
		for (let i = left; i <= right; i++) range.push(i);
		return range;
	}, [page, totalPages]);

	const sharedActions = {
		onImpersonate: handleImpersonate,
		onStatusChange: handleStatusChange,
		onEdit: (u) => setEditUser(u),
		onDelete: (u) => setDeleteUser(u),
		onShowCreds: (u) => setCredsUser(u),
		t,
		locale,
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-[#0b1120]" dir={dir}>

			{/* ── GradientStatsHeader ── */}
			<GradientStatsHeader
				onClick={() => setCreate(true)}
				btnName="Create User"
				title={t ? t('title') : 'Super Admin — Users'}
				desc={`${totalCount} total users managed`}
				loadingStats={loading}
			>
				<StatCard icon={Users} title="Total Users" value={stats.totalUsers} />
				<StatCard icon={UserCheck} title="Active" value={stats.activeUsers} />
				<StatCard icon={UserCog} title="Coaches" value={stats.coaches} />
				<StatCard icon={UserCircle} title="Clients" value={stats.clients} />
			</GradientStatsHeader>

			<div className="p-4 md:p-6">

				{/* ── Filters Bar ── */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 mb-5 shadow-sm"
				>
					<div className="flex flex-col sm:flex-row gap-2.5">
						{/* Search */}
						<div className="relative flex-1">
							<Search size={14} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							<input
								value={search}
								onChange={e => handleSearch(e.target.value)}
								placeholder="Search by name, email…"
								className="w-full h-10 ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-primary-400)] transition-all"
								style={{ '--tw-ring-color': 'rgba(99,102,241,0.25)' }}
							/>
						</div>

						{/* Role filter */}
						<div className="relative">
							<Filter size={12} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							<select
								value={roleFilter}
								onChange={e => { setRole(e.target.value); setPage(1); }}
								className="h-10 ltr:pl-8 rtl:pr-8 ltr:pr-8 rtl:pl-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 appearance-none min-w-[130px] cursor-pointer"
							>
								<option value="">All Roles</option>
								<option value="admin">Admin</option>
								<option value="coach">Coach</option>
								<option value="client">Client</option>
							</select>
						</div>

						{/* Status filter */}
						<div className="relative">
							<div className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400 pointer-events-none" />
							<select
								value={statusFilter}
								onChange={e => { setStatus(e.target.value); setPage(1); }}
								className="h-10 ltr:pl-7 rtl:pr-7 ltr:pr-8 rtl:pl-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 appearance-none min-w-[140px] cursor-pointer"
							>
								<option value="">All Statuses</option>
								<option value="active">Active</option>
								<option value="pending">Pending</option>
								<option value="suspended">Suspended</option>
							</select>
						</div>

						{/* Sort */}
						<div className="relative">
							<SortAsc size={12} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							<select
								value={sortBy}
								onChange={e => { setSortBy(e.target.value); setPage(1); }}
								className="h-10 ltr:pl-8 rtl:pr-8 ltr:pr-8 rtl:pl-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 appearance-none min-w-[148px] cursor-pointer"
							>
								{SORT_OPTIONS.map(o => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
						</div>

						{/* Refresh */}
						<motion.button
							whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}
							onClick={fetchUsers}
							className="w-10 h-10 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-[var(--color-primary-500)] transition-colors"
						>
							<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
						</motion.button>
					</div>
				</motion.div>

				{/* ── Content ── */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-28 gap-4">
						<div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<RefreshCw size={22} className="animate-spin text-white" />
						</div>
						<p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading users…</p>
					</div>
				) : items.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-4">
						<div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
							<Users size={28} className="opacity-40" />
						</div>
						<p className="font-bold text-slate-600 dark:text-slate-400">No users found</p>
						<p className="text-sm text-slate-400">Try adjusting the filters or search term</p>
					</div>
				) : (
					<>
						{/* Admins tree */}
						{admins.length > 0 && (!roleFilter || roleFilter === 'admin') && (
							<div className="mb-6">
								<div className="flex items-center gap-2 mb-3 ltr:pl-1 rtl:pr-1">
									<Building2 size={12} className="text-[var(--color-primary-500)]" />
									<p className="text-[10px] font-black uppercase tracking-widest"
										style={{ color: 'var(--color-primary-400)' }}
									>
										Admins ({admins.length})
									</p>
								</div>
								<div className="space-y-3">
									{admins.map(admin => (
										<AdminCard key={admin.id} admin={admin} {...sharedActions} />
									))}
								</div>
							</div>
						)}

						{/* Others (coaches / clients not under an admin) */}
						{others.length > 0 && (
							<div>
								<div className="flex items-center gap-2 mb-3 ltr:pl-1 rtl:pr-1">
									<Users size={12} className="text-slate-400" />
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
										Others ({others.length})
									</p>
								</div>
								<div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
									{others.map(u => (
										<div
											key={u.id}
											className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-primary-50)]/30 dark:hover:bg-[var(--color-primary-950)]/10 group transition-all"
										>
											<Avatar name={u.name} size="md" />
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-1.5 flex-wrap">
													<p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
													<RoleBadge role={u.role} t={t} />
													<StatusBadge status={u.status} t={t} />
												</div>
												<div className="flex items-center gap-1">
													<p className="text-xs text-slate-400 truncate">{u.email}</p>
													<CopyBtn value={u.email} />
												</div>
											</div>
											<p className="text-xs text-slate-400 hidden sm:block shrink-0">{fmt(u.created_at, locale)}</p>
											<div className="opacity-0 group-hover:opacity-100 transition-all">
												<ActionBar user={u} {...sharedActions} />
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-1.5 mt-8">
								<button
									disabled={page === 1}
									onClick={() => setPage(p => p - 1)}
									className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
								>
									← Prev
								</button>
								{page > 3 && <span className="text-slate-400 text-xs">…</span>}
								{pageNums.map(n => (
									<button
										key={n}
										onClick={() => setPage(n)}
										className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${n === page
												? 'text-white shadow-lg'
												: 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
											}`}
										style={n === page ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' } : {}}
									>
										{n}
									</button>
								))}
								{page < totalPages - 2 && <span className="text-slate-400 text-xs">…</span>}
								<button
									disabled={page === totalPages}
									onClick={() => setPage(p => p + 1)}
									className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
								>
									Next →
								</button>
							</div>
						)}
					</>
				)}
			</div>

			{/* ── Modals ── */}
			<AnimatePresence>
				{createOpen && (
					<CreateUserModal open={createOpen} onClose={() => setCreate(false)} onCreated={fetchUsers} t={t} />
				)}
			</AnimatePresence>

			<AnimatePresence>
				{editUser && (
					<EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={fetchUsers} t={t} />
				)}
			</AnimatePresence>

			<AnimatePresence>
				{deleteUser && (
					<DeleteModal user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={handleDelete} t={t} />
				)}
			</AnimatePresence>

			<AnimatePresence>
				{credsUser && (
					<CredentialsModal user={credsUser} onClose={() => setCredsUser(null)} t={t} />
				)}
			</AnimatePresence>
 
		</div>
	);
}