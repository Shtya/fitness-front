'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
	Search, ChevronRight, Users, User, LogIn, RefreshCw, X,
	Clock, Dumbbell, Crown, Activity, Plus,
	Building2, CornerDownRight, MoreHorizontal,
	CheckCircle2, Ban, Eye, Trash2, KeyRound, Copy, Check,
	UserCheck, UserCog, UserCircle, Edit, Shield, SortAsc,
	ChevronDown, Filter, AlertTriangle, Mail, Phone, LayoutGrid,
	Link2, MessageSquareText, Wand2,
} from 'lucide-react';
import api from '@/utils/axios';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { getNavPagesForRole } from '@/components/molecules/Sidebar';
import { resolvePostLoginPath } from '@/lib/nav-access';
import { buildAutoLoginUrl, buildWelcomeMessage, resolveShareLandingPath } from '@/lib/auto-login';
import { notifyImpersonationChanged } from '@/lib/impersonation';

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
		<div className={`${sizeMap[size]} rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white font-black shrink-0 shadow-md ring-2 ring-white/20 dark:ring-black/20`}>
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
	const locale = useLocale();
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

	const nextPath = resolveShareLandingPath(user);
	const autoLink = creds?.tempPassword
		? buildAutoLoginUrl({
			locale,
			email: creds.email || user.email,
			password: creds.tempPassword,
			next: nextPath,
		})
		: '';
	const welcomeMsg = creds?.tempPassword
		? buildWelcomeMessage({
			locale,
			name: user.name,
			email: creds.email || user.email,
			password: creds.tempPassword,
			role: user.role,
			loginUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/auth`,
			autoLoginUrl: autoLink,
			next: nextPath,
		})
		: '';

	const copyText = async (text, okMsg) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(okMsg || 'Copied');
		} catch {
			toast.error('Copy failed');
		}
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.92, opacity: 0, y: 16 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.92, opacity: 0, y: 16 }}
				className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden"
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800"
					style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))' }}
				>
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg"
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

				<div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
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
								<div key={label} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
									<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
										<Icon size={9} />{label}
									</p>
									<div className="flex items-center gap-2">
										<code className="flex-1 text-sm font-mono font-bold text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] truncate">{value}</code>
										<CopyBtn value={value} label={`Copy ${label}`} />
									</div>
								</div>
							))}

							<button
								type="button"
								onClick={() => copyText(welcomeMsg, 'Welcome message copied')}
								className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
							>
								<MessageSquareText size={14} className="text-[var(--color-primary-500)]" />
								Copy welcome message
							</button>
							<button
								type="button"
								onClick={() => copyText(autoLink, 'One-click login link copied')}
								className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
							>
								<Link2 size={14} className="text-[var(--color-primary-500)]" />
								Copy one-click login link
							</button>

							<div className="mt-1 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
								<AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
								<p className="text-[10px] text-amber-700 dark:text-amber-400">
									Temp password was reset. The link embeds email & password — share only with this user.
								</p>
							</div>
						</>
					) : null}
				</div>

				<div className="px-5 pb-5">
					<button onClick={onClose}
						className="w-full h-10 rounded-lg text-white text-sm font-bold transition-all shadow-lg"
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
			await api.put(`/auth/user/${user.id}`, form);
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
				className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden"
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800"
					style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))' }}
				>
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg"
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
									className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-400)] transition-all"
								/>
							</div>
						);
					})}
				</div>

				<div className="flex gap-2 px-5 pb-5">
					<button onClick={onClose}
						className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
					>
						Cancel
					</button>
					<button onClick={submit} disabled={loading}
						className="flex-1 h-10 rounded-lg text-white text-sm font-bold transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
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
			await api.delete(`/auth/user/${user.id}`);
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
				className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900/50 shadow-2xl w-full max-w-sm overflow-hidden"
			>
				<div className="p-6 text-center">
					<div className="w-14 h-14 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto mb-4">
						<Trash2 size={24} className="text-red-500" />
					</div>
					<h3 className="font-black text-slate-900 dark:text-slate-100 text-base mb-1">Delete User?</h3>
					<p className="text-xs text-slate-500 mb-1">This action cannot be undone.</p>
					<p className="text-sm font-bold text-slate-700 dark:text-slate-300">{user.name}</p>
					<p className="text-xs text-slate-400">{user.email}</p>
				</div>
				<div className="flex gap-2 px-5 pb-5">
					<button onClick={onClose}
						className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
					>
						Cancel
					</button>
					<button onClick={doDelete} disabled={loading}
						className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
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
function ActionBar({ user, onImpersonate, onStatusChange, onEdit, onDelete, onShowCreds, onPages, t }) {
	const [menuOpen, setMenu] = useState(false);
	const menuRef = useRef(null);
	const pageCount = Array.isArray(user?.allowedPages) ? user.allowedPages.length : 0;

	useEffect(() => {
		if (!menuOpen) return;
		const h = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
		document.addEventListener('mousedown', h);
		return () => document.removeEventListener('mousedown', h);
	}, [menuOpen]);

	return (
		<div className="flex items-center justify-end gap-1.5 shrink-0">
			{/* Login As — does not change password */}
			<button
				type="button"
				onClick={() => onImpersonate(user)}
				className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[10px] font-bold shadow-sm hover:brightness-105 transition-all"
				style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				title="Login as this user (password unchanged)"
			>
				<LogIn size={10} />
				Login
			</button>

			{/* Page access */}
			<button
				type="button"
				onClick={() => onPages?.(user)}
				className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:opacity-90"
				style={{
					color: 'var(--color-primary-700)',
					background: 'var(--color-primary-50)',
					borderColor: 'var(--color-primary-200)',
				}}
				title="Choose which pages this user can see"
			>
				<LayoutGrid size={10} />
				{pageCount > 0 ? `${pageCount}` : 'Pages'}
			</button>

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
							className="absolute ltr:right-0 rtl:left-0 top-9 z-40 w-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xl py-1 overflow-hidden"
						>
							{/* View Dashboard */}
							<button onClick={() => { onImpersonate(user); setMenu(false); }}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-950)]/20 hover:text-[var(--color-primary-600)] transition-colors"
							>
								<Eye size={12} />View Dashboard
							</button>

							<button onClick={() => { onPages?.(user); setMenu(false); }}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--color-primary-950)]/20 hover:text-[var(--color-primary-600)] transition-colors"
							>
								<LayoutGrid size={12} />Page Access
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
// Users table (partitioned sections)
// ─────────────────────────────────────────────────────────────────────────────
const TABLE_TH =
	'px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-start';
const TABLE_TD = 'px-3 py-2.5 align-middle text-start';

function AccessCell({ user }) {
	const n = Array.isArray(user?.allowedPages) ? user.allowedPages.length : 0;
	if (!n) {
		return <span className="text-[10px] font-semibold text-slate-400">All pages</span>;
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border border-[var(--color-primary-200)] dark:bg-[var(--color-primary-950)]/30 dark:text-[var(--color-primary-300)] dark:border-[var(--color-primary-900)]/40">
			<LayoutGrid size={9} />
			{n} pages
		</span>
	);
}

function UserIdentity({ user, size = 'sm', extra }) {
	return (
		<div className="flex items-center gap-2.5 min-w-0">
			<Avatar name={user.name} size={size} />
			<div className="min-w-0">
				<p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name || '—'}</p>
				{extra}
			</div>
		</div>
	);
}

function UsersTableShell({ title, subtitle, icon: Icon, count, accent = 'primary', children }) {
	const accentCls =
		accent === 'cyan'
			? 'text-cyan-600 dark:text-cyan-400'
			: accent === 'slate'
				? 'text-slate-500'
				: 'text-[var(--color-primary-500)]';
	return (
		<section className="bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-5">
			<div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
				<div className="flex items-center gap-2.5 min-w-0">
					<span className={`w-8 h-8 rounded-lg grid place-items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ${accentCls}`}>
						<Icon size={14} />
					</span>
					<div className="min-w-0">
						<h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h2>
						{subtitle ? <p className="text-[10px] text-slate-500 truncate">{subtitle}</p> : null}
					</div>
				</div>
				<span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
					{count}
				</span>
			</div>
			<div className="overflow-x-auto">
				{children}
			</div>
		</section>
	);
}

function EmptyTableRow({ colSpan, label }) {
	return (
		<tr>
			<td colSpan={colSpan} className="px-4 py-10 text-center text-xs text-slate-400 italic">
				{label}
			</td>
		</tr>
	);
}

/** Flat table for coaches / clients / misc */
function UsersTable({ title, subtitle, icon, accent, users, actions, locale, t, emptyLabel = 'No users in this section' }) {
	return (
		<UsersTableShell title={title} subtitle={subtitle} icon={icon} count={users.length} accent={accent}>
			<table className="w-full min-w-[880px] border-collapse">
				<thead>
					<tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
						<th className={TABLE_TH}>User</th>
						<th className={TABLE_TH}>Email</th>
						<th className={`${TABLE_TH} hidden md:table-cell`}>Phone</th>
						<th className={TABLE_TH}>Role</th>
						<th className={TABLE_TH}>Status</th>
						<th className={`${TABLE_TH} hidden lg:table-cell`}>Access</th>
						<th className={`${TABLE_TH} hidden sm:table-cell`}>Joined</th>
						<th className={`${TABLE_TH} text-end`}>Actions</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
					{users.length === 0 ? (
						<EmptyTableRow colSpan={8} label={emptyLabel} />
					) : (
						users.map(u => (
							<tr key={u.id} className="hover:bg-[var(--color-primary-50)]/40 dark:hover:bg-[var(--color-primary-950)]/15 transition-colors">
								<td className={TABLE_TD}>
									<UserIdentity user={u} />
								</td>
								<td className={TABLE_TD}>
									<div className="flex items-center gap-1 max-w-[200px]">
										<span className="text-xs text-slate-600 dark:text-slate-300 truncate">{u.email || '—'}</span>
										{u.email ? <CopyBtn value={u.email} /> : null}
									</div>
								</td>
								<td className={`${TABLE_TD} hidden md:table-cell`}>
									<span className="text-xs text-slate-500">{u.phone || '—'}</span>
								</td>
								<td className={TABLE_TD}><RoleBadge role={u.role} t={t} /></td>
								<td className={TABLE_TD}><StatusBadge status={u.status} t={t} /></td>
								<td className={`${TABLE_TD} hidden lg:table-cell`}><AccessCell user={u} /></td>
								<td className={`${TABLE_TD} hidden sm:table-cell`}>
									<span className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(u.created_at, locale)}</span>
								</td>
								<td className={`${TABLE_TD} text-end`}>
									<ActionBar user={u} {...actions} t={t} />
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</UsersTableShell>
	);
}

/** Coach row inside nested admin tree table (expand → clients) */
function CoachTableRows({ coach, actions, locale, t, depth = 1 }) {
	const [open, setOpen] = useState(false);
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const toggle = async (e) => {
		e?.stopPropagation?.();
		if (loaded) { setOpen(o => !o); return; }
		setLoading(true);
		try {
			const { data } = await api.get(`/auth/coach/${coach.id}/clients`, { params: { limit: 100 } });
			setClients(data.items || data.users || []);
			setLoaded(true);
			setOpen(true);
		} catch { toast.error('Failed to load clients'); }
		finally { setLoading(false); }
	};

	const pad = depth * 16;

	return (
		<>
			<tr className="hover:bg-cyan-50/50 dark:hover:bg-cyan-950/15 transition-colors">
				<td className={TABLE_TD}>
					<div className="flex items-center gap-2 min-w-0" style={{ paddingInlineStart: pad }}>
						<button
							type="button"
							onClick={toggle}
							className="w-6 h-6 rounded-md border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 grid place-items-center shrink-0"
							title="Show clients"
						>
							{loading
								? <RefreshCw size={11} className="animate-spin" />
								: <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />}
						</button>
						<UserIdentity
							user={coach}
							size="sm"
							extra={
								loaded ? (
									<span className="text-[10px] text-cyan-600 font-semibold">{clients.length} clients</span>
								) : (
									<span className="text-[10px] text-slate-400">Expand for clients</span>
								)
							}
						/>
					</div>
				</td>
				<td className={TABLE_TD}>
					<div className="flex items-center gap-1 max-w-[200px]">
						<span className="text-xs text-slate-600 dark:text-slate-300 truncate">{coach.email}</span>
						<CopyBtn value={coach.email} />
					</div>
				</td>
				<td className={`${TABLE_TD} hidden md:table-cell`}>
					<span className="text-xs text-slate-500">{coach.phone || '—'}</span>
				</td>
				<td className={TABLE_TD}><RoleBadge role="coach" t={t} /></td>
				<td className={TABLE_TD}><StatusBadge status={coach.status} t={t} /></td>
				<td className={`${TABLE_TD} hidden lg:table-cell`}><AccessCell user={coach} /></td>
				<td className={`${TABLE_TD} hidden sm:table-cell`}>
					<span className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(coach.created_at, locale)}</span>
				</td>
				<td className={`${TABLE_TD} text-end`}>
					<ActionBar user={coach} {...actions} t={t} />
				</td>
			</tr>
			{open && (
				clients.length === 0 ? (
					<tr className="bg-slate-50/80 dark:bg-slate-900/40">
						<td colSpan={8} className="px-3 py-3 text-[11px] text-slate-400 italic" style={{ paddingInlineStart: pad + 40 }}>
							No clients assigned to this coach
						</td>
					</tr>
				) : clients.map(c => (
					<tr key={c.id} className="bg-slate-50/70 dark:bg-slate-900/30 hover:bg-[var(--color-primary-50)]/50 dark:hover:bg-[var(--color-primary-950)]/20">
						<td className={TABLE_TD}>
							<div className="flex items-center gap-2 min-w-0" style={{ paddingInlineStart: pad + 28 }}>
								<CornerDownRight size={12} className="text-slate-300 shrink-0" />
								<UserIdentity user={c} size="xs" />
							</div>
						</td>
						<td className={TABLE_TD}>
							<div className="flex items-center gap-1 max-w-[200px]">
								<span className="text-xs text-slate-600 dark:text-slate-300 truncate">{c.email}</span>
								<CopyBtn value={c.email} />
							</div>
						</td>
						<td className={`${TABLE_TD} hidden md:table-cell`}>
							<span className="text-xs text-slate-500">{c.phone || '—'}</span>
						</td>
						<td className={TABLE_TD}><RoleBadge role="client" t={t} /></td>
						<td className={TABLE_TD}><StatusBadge status={c.status} t={t} /></td>
						<td className={`${TABLE_TD} hidden lg:table-cell`}><AccessCell user={c} /></td>
						<td className={`${TABLE_TD} hidden sm:table-cell`}>
							<span className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(c.created_at, locale)}</span>
						</td>
						<td className={`${TABLE_TD} text-end`}>
							<ActionBar user={c} {...actions} t={t} />
						</td>
					</tr>
				))
			)}
		</>
	);
}

/** Admins table — expand row → coaches (+ their clients) */
function AdminsTable({ admins, actions, locale, t }) {
	return (
		<UsersTableShell
			title="Admins"
			subtitle="Expand a row to manage coaches and clients under that admin"
			icon={Building2}
			count={admins.length}
			accent="primary"
		>
			<table className="w-full min-w-[920px] border-collapse">
				<thead>
					<tr className="border-b border-slate-100 dark:border-slate-800">
						<th className={TABLE_TH}>Admin</th>
						<th className={TABLE_TH}>Email</th>
						<th className={`${TABLE_TH} hidden md:table-cell`}>Team</th>
						<th className={TABLE_TH}>Status</th>
						<th className={`${TABLE_TH} hidden lg:table-cell`}>Access</th>
						<th className={`${TABLE_TH} hidden sm:table-cell`}>Joined</th>
						<th className={`${TABLE_TH} text-end`}>Actions</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
					{admins.length === 0 ? (
						<EmptyTableRow colSpan={7} label="No admins found" />
					) : (
						admins.map(admin => (
							<AdminTableBlock key={admin.id} admin={admin} actions={actions} locale={locale} t={t} />
						))
					)}
				</tbody>
			</table>
		</UsersTableShell>
	);
}

function AdminTableBlock({ admin, actions, locale, t }) {
	const [open, setOpen] = useState(false);
	const [coaches, setCoaches] = useState([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const counts = admin.counts || {};
	const daysLeft = admin.daysLeft;

	const loadCoaches = async () => {
		if (loaded) { setOpen(o => !o); return; }
		setLoading(true);
		try {
			const { data } = await api.get(`/auth/admin/${admin.id}/coaches`, { params: { limit: 100 } });
			setCoaches(data.items || []);
			setLoaded(true);
			setOpen(true);
		} catch { toast.error('Failed to load coaches'); }
		finally { setLoading(false); }
	};

	return (
		<>
			<tr className="hover:bg-[var(--color-primary-50)]/50 dark:hover:bg-[var(--color-primary-950)]/20 transition-colors">
				<td className={TABLE_TD}>
					<div className="flex items-center gap-2.5 min-w-0">
						<button
							type="button"
							onClick={loadCoaches}
							className="w-7 h-7 rounded-lg border grid place-items-center shrink-0 transition-colors"
							style={{
								background: open ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' : 'var(--color-primary-50)',
								borderColor: 'var(--color-primary-200)',
								color: open ? '#fff' : 'var(--color-primary-600)',
							}}
							title="Show coaches"
						>
							{loading
								? <RefreshCw size={12} className="animate-spin" />
								: <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : ''}`} />}
						</button>
						<UserIdentity
							user={admin}
							size="md"
							extra={
								<div className="flex items-center gap-1.5 flex-wrap mt-0.5">
									<RoleBadge role="admin" t={t} />
									{daysLeft != null && daysLeft < 30 && (
										<span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
											daysLeft < 7
												? 'bg-red-50 text-red-600 border-red-200'
												: 'bg-amber-50 text-amber-600 border-amber-200'
										}`}>
											<Clock size={8} />
											{daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
										</span>
									)}
								</div>
							}
						/>
					</div>
				</td>
				<td className={TABLE_TD}>
					<div className="flex items-center gap-1 max-w-[220px]">
						<span className="text-xs text-slate-600 dark:text-slate-300 truncate">{admin.email}</span>
						<CopyBtn value={admin.email} />
					</div>
				</td>
				<td className={`${TABLE_TD} hidden md:table-cell`}>
					<div className="flex flex-wrap gap-1.5">
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
							<Dumbbell size={9} />{counts.coaches ?? 0}
						</span>
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--color-primary-50)] text-[var(--color-primary-700)]">
							<Users size={9} />{counts.clients ?? 0}
						</span>
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
							<Activity size={9} />{counts.activeClients ?? 0}
						</span>
					</div>
				</td>
				<td className={TABLE_TD}><StatusBadge status={admin.status} t={t} /></td>
				<td className={`${TABLE_TD} hidden lg:table-cell`}><AccessCell user={admin} /></td>
				<td className={`${TABLE_TD} hidden sm:table-cell`}>
					<span className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(admin.created_at, locale)}</span>
				</td>
				<td className={`${TABLE_TD} text-end`}>
					<ActionBar user={admin} {...actions} t={t} />
				</td>
			</tr>

			{open && (
				<tr className="bg-slate-50/90 dark:bg-slate-950/40">
					<td colSpan={7} className="p-0">
						<div className="border-y border-slate-200 dark:border-slate-800 mx-0">
							<div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
								<Dumbbell size={12} className="text-cyan-500" />
								<p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
									Coaches under {admin.name} ({coaches.length})
								</p>
							</div>
							{coaches.length === 0 ? (
								<p className="px-4 py-4 text-xs text-slate-400 italic">No coaches assigned yet</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full min-w-[860px] border-collapse">
										<thead>
											<tr className="border-b border-slate-100 dark:border-slate-800">
												<th className={TABLE_TH}>Coach / Client</th>
												<th className={TABLE_TH}>Email</th>
												<th className={`${TABLE_TH} hidden md:table-cell`}>Phone</th>
												<th className={TABLE_TH}>Role</th>
												<th className={TABLE_TH}>Status</th>
												<th className={`${TABLE_TH} hidden lg:table-cell`}>Access</th>
												<th className={`${TABLE_TH} hidden sm:table-cell`}>Joined</th>
												<th className={`${TABLE_TH} text-end`}>Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
											{coaches.map(coach => (
												<CoachTableRows
													key={coach.id}
													coach={coach}
													actions={actions}
													locale={locale}
													t={t}
												/>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</td>
				</tr>
			)}
		</>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav label helpers + shared page-access picker
// ─────────────────────────────────────────────────────────────────────────────
function navItemLabel(tNav, nameKey) {
	if (!nameKey) return '';
	try {
		return tNav(`items.${nameKey}`);
	} catch {
		return nameKey;
	}
}

function navGroupLabel(tNav, groupKey) {
	if (!groupKey) return '';
	try {
		return tNav(`groups.${groupKey}`);
	} catch {
		try {
			return tNav(`sections.${groupKey}`);
		} catch {
			return groupKey;
		}
	}
}

/** Toggle + grouped page checklist + login redirect. */
function PageAccessFields({
	role,
	pages,
	allowAll,
	setAllowAll,
	selected,
	setSelected,
	landingPageId,
	setLandingPageId,
	landingChoices,
	compact = false,
}) {
	const tNav = useTranslations('nav');

	const groups = useMemo(() => {
		const map = new Map();
		for (const p of pages) {
			const key = p.group || 'main';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(p);
		}
		return [...map.entries()];
	}, [pages]);

	const togglePage = (id) => {
		setSelected(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAll = () => setSelected(new Set(pages.map(p => p.id)));
	const clearAll = () => setSelected(new Set());

	return (
		<div className="space-y-3">
			{/* Mode switch */}
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={() => {
						setAllowAll(true);
						setSelected(new Set(pages.map(p => p.id)));
					}}
					className={`relative text-start px-3 py-2.5 rounded-xl border-2 transition-all ${
						allowAll
							? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]/30 shadow-sm'
							: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
					}`}
				>
					<p className="text-xs font-bold text-slate-900 dark:text-slate-100">All pages</p>
					<p className="text-[10px] text-slate-500 mt-0.5">Full sidebar for {role}</p>
					{allowAll && (
						<span className="absolute top-2 end-2 w-5 h-5 rounded-full grid place-items-center text-white"
							style={{ background: 'var(--color-primary-500)' }}
						>
							<Check size={12} strokeWidth={3} />
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => setAllowAll(false)}
					className={`relative text-start px-3 py-2.5 rounded-xl border-2 transition-all ${
						!allowAll
							? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]/30 shadow-sm'
							: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
					}`}
				>
					<p className="text-xs font-bold text-slate-900 dark:text-slate-100">Custom pages</p>
					<p className="text-[10px] text-slate-500 mt-0.5">Pick what they can open</p>
					{!allowAll && (
						<span className="absolute top-2 end-2 w-5 h-5 rounded-full grid place-items-center text-white"
							style={{ background: 'var(--color-primary-500)' }}
						>
							<Check size={12} strokeWidth={3} />
						</span>
					)}
				</button>
			</div>

			{/* Page checklist box */}
			{!allowAll && (
				<div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
					<div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
						<LayoutGrid size={14} className="text-[var(--color-primary-500)] shrink-0" />
						<div className="min-w-0 flex-1">
							<p className="text-xs font-bold text-slate-800 dark:text-slate-100">Choose visible pages</p>
							<p className="text-[10px] text-slate-500">Only checked pages appear for this account</p>
						</div>
						<span
							className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							{selected.size}/{pages.length}
						</span>
					</div>

					{!allowAll && selected.size > 0 && selected.size < 5 && (
						<div className="mx-3 mt-2 mb-1 rounded-lg border border-[color-mix(in_srgb,var(--color-primary-200)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-50)_80%,white)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--color-primary-800)]">
							<strong>{selected.size} pages</strong> — sidebar stays hidden; they get a top header with logo, pages, language & logout.
						</div>
					)}
					{!allowAll && selected.size >= 5 && (
						<div className="mx-3 mt-2 mb-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
							<strong>{selected.size} pages</strong> — normal sidebar navigation.
						</div>
					)}

					<div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
						<button
							type="button"
							onClick={selectAll}
							className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white"
							style={{ background: 'var(--color-primary-500)' }}
						>
							Select all
						</button>
						<button
							type="button"
							onClick={clearAll}
							className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
						>
							Clear
						</button>
					</div>

					<div className={`overflow-y-auto ${compact ? 'max-h-52' : 'max-h-64'}`}>
						{groups.map(([groupKey, items]) => (
							<div key={groupKey} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
								<div className="sticky top-0 z-[1] px-3 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm">
									<p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
										{navGroupLabel(tNav, groupKey)}
									</p>
								</div>
								<ul className="divide-y divide-slate-100 dark:divide-slate-800">
									{items.map(p => {
										const checked = selected.has(p.id);
										const Icon = p.icon || LayoutGrid;
										const label = navItemLabel(tNav, p.nameKey);
										return (
											<li key={p.id}>
												<button
													type="button"
													onClick={() => togglePage(p.id)}
													className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-start transition-colors ${
														checked
															? 'bg-[var(--color-primary-50)]/80 dark:bg-[var(--color-primary-950)]/25'
															: 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
													} ${p.parentId ? 'ps-8' : ''}`}
												>
													<span
														className={`w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition-colors ${
															checked
																? 'border-[var(--color-primary-500)] text-white'
																: 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
														}`}
														style={checked ? { background: 'var(--color-primary-500)' } : undefined}
													>
														{checked ? <Check size={12} strokeWidth={3} /> : null}
													</span>
													<span
														className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${
															checked
																? 'text-[var(--color-primary-600)] bg-white dark:bg-slate-900'
																: 'text-slate-400 bg-slate-100 dark:bg-slate-800'
														}`}
													>
														<Icon size={14} />
													</span>
													<span className="min-w-0 flex-1">
														<span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
															{label}
														</span>
														{p.href ? (
															<span className="block text-[10px] text-slate-400 truncate">{p.href}</span>
														) : null}
													</span>
													{p.marketplace ? (
														<span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded shrink-0">
															Add-on
														</span>
													) : null}
												</button>
											</li>
										);
									})}
								</ul>
							</div>
						))}
						{!pages.length && (
							<p className="text-xs text-slate-400 text-center py-8">No pages found for this role</p>
						)}
					</div>
				</div>
			)}

			{allowAll && (
				<div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-3 bg-slate-50/80 dark:bg-slate-800/40">
					<p className="text-xs text-slate-600 dark:text-slate-300">
						<span className="font-bold text-slate-800 dark:text-slate-100">{pages.length} pages</span>
						{' '}unlocked — same access as a normal {role}.
					</p>
				</div>
			)}

			{/* Redirect */}
			<div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
				<div className="flex items-start gap-2.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
					<span className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
						<LogIn size={14} />
					</span>
					<div className="min-w-0">
						<p className="text-xs font-bold text-slate-800 dark:text-slate-100">Redirect after login</p>
						<p className="text-[10px] text-slate-500">
							{allowAll
								? 'Any page for this role'
								: 'Only from the pages you checked above'}
						</p>
					</div>
				</div>
				<div className="p-3">
					<select
						value={landingPageId}
						onChange={e => setLandingPageId(e.target.value)}
						disabled={!allowAll && !landingChoices.length}
						className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-50"
					>
						<option value="">Role default ({resolvePostLoginPath({ role })})</option>
						{landingChoices.map(p => (
							<option key={p.id} value={p.id}>
								{navItemLabel(tNav, p.nameKey)} — {p.href}
							</option>
						))}
					</select>
					{!allowAll && !landingChoices.length && (
						<p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
							<AlertTriangle size={11} />
							Select at least one page with a URL to set a redirect.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

function PagesAccessModal({ user, onClose, onSaved, t }) {
	const pages = useMemo(() => getNavPagesForRole(user?.role), [user?.role]);
	const landingOptions = useMemo(() => pages.filter(p => p.href), [pages]);
	const initialRestricted = Array.isArray(user?.allowedPages) && user.allowedPages.length > 0;
	const [allowAll, setAllowAll] = useState(!initialRestricted);
	const [selected, setSelected] = useState(() => {
		if (initialRestricted) return new Set(user.allowedPages);
		return new Set(pages.map(p => p.id));
	});
	const [landingPage, setLandingPage] = useState(user?.loginLandingPage || '');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const restricted = Array.isArray(user?.allowedPages) && user.allowedPages.length > 0;
		setAllowAll(!restricted);
		setSelected(new Set(restricted ? user.allowedPages : pages.map(p => p.id)));
		setLandingPage(user?.loginLandingPage || '');
	}, [user?.id, user?.allowedPages, user?.loginLandingPage, pages]);

	const landingChoices = useMemo(() => {
		if (allowAll) return landingOptions;
		return landingOptions.filter(p => selected.has(p.id));
	}, [allowAll, landingOptions, selected]);

	useEffect(() => {
		if (!landingPage) return;
		if (!landingChoices.some(p => p.id === landingPage)) {
			setLandingPage(landingChoices[0]?.id || '');
		}
	}, [landingChoices, landingPage]);

	const save = async () => {
		setSaving(true);
		try {
			const payload = allowAll ? null : [...selected];
			if (!allowAll && !payload.length) {
				toast.error('Select at least one page, or enable All pages');
				setSaving(false);
				return;
			}
			if (landingPage && !allowAll && !payload.includes(landingPage)) {
				toast.error('Login landing page must be one of the allowed pages');
				setSaving(false);
				return;
			}
			const { data } = await api.put(`/auth/super-admin/users/${user.id}/allowed-pages`, {
				allowedPages: payload,
				loginLandingPage: landingPage || null,
			});
			toast.success(allowAll ? 'Access + landing page saved' : `Locked to ${payload.length} pages`);
			onSaved?.(data?.user || { ...user, allowedPages: payload, loginLandingPage: landingPage || null });
			onClose?.();
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Failed to save page access');
		} finally {
			setSaving(false);
		}
	};

	if (!user) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.94, opacity: 0, y: 16 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.94, opacity: 0, y: 16 }}
				className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0"
					style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))' }}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<LayoutGrid size={16} />
						</div>
						<div className="min-w-0">
							<h3 className="font-black text-slate-900 dark:text-slate-100 text-sm truncate">Page access — {user.name}</h3>
							<p className="text-[10px] text-slate-500 capitalize">{user.role} · pages + login redirect</p>
						</div>
					</div>
					<button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors">
						<X size={16} />
					</button>
				</div>

				<div className="p-4 overflow-y-auto min-h-0 flex-1">
					<PageAccessFields
						role={user.role}
						pages={pages}
						allowAll={allowAll}
						setAllowAll={setAllowAll}
						selected={selected}
						setSelected={setSelected}
						landingPageId={landingPage}
						setLandingPageId={setLandingPage}
						landingChoices={landingChoices}
					/>
				</div>

				<div className="flex gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
					<button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400">
						Cancel
					</button>
					<button
						onClick={save}
						disabled={saving}
						className="flex-1 h-10 rounded-lg text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
						{saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
						Save
					</button>
				</div>
			</motion.div>
		</div>
	);
}

function generatePassword(len = 12) {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
	const bytes = new Uint8Array(len);
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
	else for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
	let out = '';
	for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
	return out;
}

function CreateUserModal({ open, onClose, onCreated, t }) {
	const locale = useLocale();
	const [step, setStep] = useState(1); // 1 account · 2 pages · 3 share
	const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'admin', password: '' });
	const [loading, setLoading] = useState(false);
	const [savingAccess, setSavingAccess] = useState(false);
	const [created, setCreated] = useState(null); // { id, name, email, password, role }
	const [allowAll, setAllowAll] = useState(true);
	const [selected, setSelected] = useState(() => new Set());
	const [landingPageId, setLandingPageId] = useState('');
	const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

	const pages = useMemo(() => getNavPagesForRole(created?.role || form.role), [created?.role, form.role]);
	const landingOptions = useMemo(() => pages.filter(p => p.href), [pages]);
	const landingChoices = useMemo(() => {
		if (allowAll) return landingOptions;
		return landingOptions.filter(p => selected.has(p.id));
	}, [allowAll, landingOptions, selected]);

	const shareNextHref = useMemo(() => {
		const pick = landingChoices.find(p => p.id === landingPageId);
		if (pick?.href) return pick.href;
		if (landingChoices[0]?.href) return landingChoices[0].href;
		return resolveShareLandingPath({ role: created?.role || form.role });
	}, [landingChoices, landingPageId, created?.role, form.role]);

	useEffect(() => {
		if (!landingPageId) return;
		if (!landingChoices.some(p => p.id === landingPageId)) {
			setLandingPageId(landingChoices[0]?.id || '');
		}
	}, [landingChoices, landingPageId]);

	const autoLink = useMemo(() => {
		if (!created?.email || !created?.password) return '';
		return buildAutoLoginUrl({
			locale,
			email: created.email,
			password: created.password,
			next: shareNextHref,
		});
	}, [created, locale, shareNextHref]);

	const welcomeMsg = useMemo(() => {
		if (!created) return '';
		const loginUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/auth`;
		return buildWelcomeMessage({
			locale,
			name: created.name,
			email: created.email,
			password: created.password,
			role: created.role,
			loginUrl,
			autoLoginUrl: autoLink,
			next: shareNextHref,
		});
	}, [created, locale, autoLink, shareNextHref]);

	const copyText = async (text, okMsg) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(okMsg || 'Copied');
		} catch {
			toast.error('Copy failed');
		}
	};

	const submitCreate = async () => {
		if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email are required');
		setLoading(true);
		try {
			const payload = {
				name: form.name.trim(),
				email: form.email.trim(),
				phone: form.phone.trim() || undefined,
				role: form.role,
				...(form.password.trim() ? { password: form.password.trim() } : {}),
			};
			const { data } = await api.post('/auth/admin/users', payload);
			const password = data.tempPassword || form.password.trim() || '';
			const userId = data?.user?.id;
			if (!userId) throw new Error('User id missing from create response');
			const rolePages = getNavPagesForRole(form.role);
			setCreated({
				id: userId,
				name: form.name.trim(),
				email: form.email.trim(),
				password,
				role: form.role,
			});
			setAllowAll(true);
			setSelected(new Set(rolePages.map(p => p.id)));
			setLandingPageId('');
			setStep(2);
			toast.success('User created — configure pages next');
			onCreated?.();
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Create failed');
		} finally { setLoading(false); }
	};

	const submitAccess = async () => {
		if (!created?.id) return;
		const payloadPages = allowAll ? null : [...selected];
		if (!allowAll && !payloadPages.length) {
			return toast.error('Select at least one page, or enable All pages');
		}
		if (!allowAll && landingPageId && !payloadPages.includes(landingPageId)) {
			return toast.error('Redirect page must be one of the selected pages');
		}
		setSavingAccess(true);
		try {
			await api.put(`/auth/super-admin/users/${created.id}/allowed-pages`, {
				allowedPages: payloadPages,
				loginLandingPage: landingPageId || null,
			});
			toast.success('Page access saved');
			setStep(3);
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Failed to save page access');
		} finally {
			setSavingAccess(false);
		}
	};

	const handleClose = () => {
		setForm({ name: '', email: '', phone: '', role: 'admin', password: '' });
		setCreated(null);
		setStep(1);
		setAllowAll(true);
		setSelected(new Set());
		setLandingPageId('');
		onClose();
	};

	if (!open) return null;

	const stepMeta = [
		{ n: 1, label: 'Account' },
		{ n: 2, label: 'Pages' },
		{ n: 3, label: 'Share' },
	];

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.93, opacity: 0, y: 20 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.93, opacity: 0, y: 20 }}
				className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden"
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800"
					style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))' }}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<Plus size={16} />
						</div>
						<div className="min-w-0">
							<h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">Create New User</h3>
							<p className="text-[10px] text-slate-500">
								Step {step} of 3 — {stepMeta.find(s => s.n === step)?.label}
							</p>
						</div>
					</div>
					<button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors">
						<X size={16} />
					</button>
				</div>

				{/* Step progress */}
				<div className="px-5 pt-3 flex items-center gap-2">
					{stepMeta.map(s => (
						<div
							key={s.n}
							className={`h-1.5 flex-1 rounded-full transition-colors ${
								step >= s.n ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200 dark:bg-slate-700'
							}`}
						/>
					))}
				</div>

				<div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
					{/* ── Step 1: Account ── */}
					{step === 1 && (
						<>
							<div>
								<label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
									<User size={10} /> Full Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={form.name}
									onChange={e => set('name', e.target.value)}
									placeholder="e.g. John Doe"
									className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
									style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
								/>
							</div>
							<div>
								<label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
									<Mail size={10} /> Email <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									value={form.email}
									onChange={e => set('email', e.target.value)}
									placeholder="e.g. john@example.com"
									className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
									style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
								/>
							</div>
							<div>
								<label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
									<Phone size={10} /> Phone <span className="text-[10px] font-semibold text-slate-400">(optional)</span>
								</label>
								<input
									type="tel"
									value={form.phone}
									onChange={e => set('phone', e.target.value)}
									placeholder="e.g. +1 555 000 0000"
									className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
									style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
								/>
							</div>
							<div>
								<label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
									<KeyRound size={10} /> Password <span className="text-[10px] font-semibold text-slate-400">(optional)</span>
								</label>
								<div className="relative">
									<input
										type="text"
										value={form.password}
										onChange={e => set('password', e.target.value)}
										placeholder="Leave empty to auto-generate on create"
										className="w-full h-10 pe-28 ps-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
										style={{ '--tw-ring-color': 'var(--color-primary-500)' }}
									/>
									<button
										type="button"
										onClick={() => set('password', generatePassword(12))}
										className="absolute inset-y-1 end-1 px-2.5 rounded-md text-[11px] font-bold inline-flex items-center gap-1 text-white"
										style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
										title="Generate password"
									>
										<Wand2 size={12} />
										Generate
									</button>
								</div>
							</div>
							<div>
								<label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
									<Shield size={10} /> Role
								</label>
								<select
									value={form.role}
									onChange={e => set('role', e.target.value)}
									className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm appearance-none"
								>
									<option value="admin">Admin</option>
									<option value="coach">Coach</option>
									<option value="client">Client</option>
								</select>
							</div>
						</>
					)}

					{/* ── Step 2: Pages + redirect ── */}
					{step === 2 && created && (
						<>
							<div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
								<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
								<div className="min-w-0 text-start">
									<p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">{created.name}</p>
									<p className="text-[10px] text-emerald-700/80 truncate">{created.email} · {created.role}</p>
								</div>
							</div>

							<PageAccessFields
								role={created.role}
								pages={pages}
								allowAll={allowAll}
								setAllowAll={setAllowAll}
								selected={selected}
								setSelected={setSelected}
								landingPageId={landingPageId}
								setLandingPageId={setLandingPageId}
								landingChoices={landingChoices}
								compact
							/>
						</>
					)}

					{/* ── Step 3: Share ── */}
					{step === 3 && created && (
						<>
							<div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
								<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
								<div className="min-w-0 text-start">
									<p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Ready to share</p>
									<p className="text-[10px] text-emerald-700/80 truncate">Opens: {shareNextHref}</p>
								</div>
							</div>

							<div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
								<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password</p>
								<div className="flex items-center gap-2">
									<code className="flex-1 text-sm font-mono font-bold truncate" style={{ color: 'var(--color-primary-600)' }}>{created.password}</code>
									<CopyBtn value={created.password} />
								</div>
							</div>

							<button
								type="button"
								onClick={() => copyText(welcomeMsg, 'Welcome message copied')}
								className="w-full flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]/50 transition-colors text-start"
							>
								<span className="w-9 h-9 rounded-lg grid place-items-center shrink-0 text-white"
									style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
								>
									<MessageSquareText size={16} />
								</span>
								<span className="min-w-0">
									<span className="block text-xs font-bold text-slate-800 dark:text-slate-100">1) Copy welcome message</span>
									<span className="block text-[10px] text-slate-500 mt-0.5">Details + password + one-click link</span>
								</span>
							</button>

							<button
								type="button"
								onClick={() => copyText(autoLink, 'One-click login link copied')}
								className="w-full flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]/50 transition-colors text-start"
							>
								<span className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-slate-900 text-white">
									<Link2 size={16} />
								</span>
								<span className="min-w-0">
									<span className="block text-xs font-bold text-slate-800 dark:text-slate-100">2) Copy one-click login link</span>
									<span className="block text-[10px] text-slate-500 mt-0.5 break-all line-clamp-2">{autoLink || '…'}</span>
								</span>
							</button>

							<p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
								<AlertTriangle size={12} className="shrink-0 mt-0.5" />
								The link includes email & password in the URL. Share only with the account owner.
							</p>
						</>
					)}
				</div>

				<div className="flex gap-2 px-5 pb-5">
					{step === 1 && (
						<>
							<button onClick={handleClose}
								className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400"
							>
								Cancel
							</button>
							<button onClick={submitCreate} disabled={loading}
								className="flex-1 h-10 rounded-lg text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
								style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
							>
								{loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
								Create & continue
							</button>
						</>
					)}
					{step === 2 && (
						<>
							<button onClick={() => setStep(3)}
								className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400"
							>
								Skip
							</button>
							<button onClick={submitAccess} disabled={savingAccess}
								className="flex-1 h-10 rounded-lg text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
								style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
							>
								{savingAccess ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
								Save & continue
							</button>
						</>
					)}
					{step === 3 && (
						<button onClick={handleClose}
							className="flex-1 h-10 rounded-lg text-white text-sm font-bold shadow-lg"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							Done
						</button>
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
	const [editUser, setEditUser] = useState(null);
	const [deleteUser, setDeleteUser] = useState(null);
	const [credsUser, setCredsUser] = useState(null);
	const [pagesUser, setPagesUser] = useState(null);
	const searchTimer = useRef(null);

	const stats = useMemo(() => ({
		totalUsers: items.length,
		activeUsers: items.filter(u => u.status === 'active').length,
		coaches: items.filter(u => u.role === 'coach').length + items.reduce((s, u) => s + (u.counts?.coaches || 0), 0),
		clients: items.filter(u => u.role === 'client').length + items.reduce((s, u) => s + (u.counts?.clients || 0), 0),
	}), [items]);

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

	// ── Impersonate (does NOT change the user's password) ──
	const handleImpersonate = useCallback(async (target) => {
		const toastId = toast.loading('Logging in as user…');
		try {
			const prev = {
				accessToken: localStorage.getItem('accessToken'),
				refreshToken: localStorage.getItem('refreshToken'),
				user: localStorage.getItem('user'),
			};
			localStorage.setItem('super_admin_prev_session', JSON.stringify(prev));

			const { data: session } = await api.post(`/auth/super-admin/impersonate/${target.id}`);
			const { accessToken, refreshToken, user } = session;

			localStorage.setItem('accessToken', accessToken);
			localStorage.setItem('refreshToken', refreshToken);
			localStorage.setItem('user', JSON.stringify(user));
			localStorage.setItem('impersonated_user', JSON.stringify(user));
			notifyImpersonationChanged();

			await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, refreshToken, user }),
			});

			toast.success(`Logged in as ${user.name}`, { id: toastId });

			const dest = resolvePostLoginPath(user);
			router.push(`/${locale}${dest}`);
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Impersonation failed', { id: toastId });
			localStorage.removeItem('super_admin_prev_session');
			localStorage.removeItem('impersonated_user');
			notifyImpersonationChanged();
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
	const coaches = useMemo(() => items.filter(u => u.role === 'coach'), [items]);
	const clients = useMemo(() => items.filter(u => u.role === 'client'), [items]);
	const misc = useMemo(
		() => items.filter(u => !['admin', 'coach', 'client'].includes(String(u.role || '').toLowerCase())),
		[items],
	);

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
		onPages: (u) => setPagesUser(u),
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
					className="bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 p-3 mb-5 shadow-sm"
				>
					<div className="flex flex-col sm:flex-row gap-2.5">
						{/* Search */}
						<div className="relative flex-1">
							<Search size={14} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							<input
								value={search}
								onChange={e => handleSearch(e.target.value)}
								placeholder="Search by name, email…"
								className="w-full h-10 ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-primary-400)] transition-all"
								style={{ '--tw-ring-color': 'rgba(99,102,241,0.25)' }}
							/>
						</div>

						{/* Role filter */}
						<div className="relative">
							<Filter size={12} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							<select
								value={roleFilter}
								onChange={e => { setRole(e.target.value); setPage(1); }}
								className="h-10 ltr:pl-8 rtl:pr-8 ltr:pr-8 rtl:pl-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 appearance-none min-w-[130px] cursor-pointer"
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
								className="h-10 ltr:pl-7 rtl:pr-7 ltr:pr-8 rtl:pl-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 appearance-none min-w-[140px] cursor-pointer"
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
								className="h-10 ltr:pl-8 rtl:pr-8 ltr:pr-8 rtl:pl-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 appearance-none min-w-[148px] cursor-pointer"
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
							className="w-10 h-10 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-[var(--color-primary-500)] transition-colors"
						>
							<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
						</motion.button>
					</div>
				</motion.div>

				{/* ── Content ── */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-28 gap-4">
						<div className="w-14 h-14 rounded-lg flex items-center justify-center shadow-xl"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<RefreshCw size={22} className="animate-spin text-white" />
						</div>
						<p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading users…</p>
					</div>
				) : items.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-4">
						<div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
							<Users size={28} className="opacity-40" />
						</div>
						<p className="font-bold text-slate-600 dark:text-slate-400">No users found</p>
						<p className="text-sm text-slate-400">Try adjusting the filters or search term</p>
					</div>
				) : (
					<>
						{(!roleFilter || roleFilter === 'admin') && admins.length > 0 && (
							<AdminsTable
								admins={admins}
								actions={sharedActions}
								locale={locale}
								t={t}
							/>
						)}

						{(!roleFilter || roleFilter === 'coach') && coaches.length > 0 && (
							<UsersTable
								title="Coaches"
								subtitle="Standalone coaches (not nested under an admin in this list)"
								icon={Dumbbell}
								accent="cyan"
								users={coaches}
								actions={sharedActions}
								locale={locale}
								t={t}
								emptyLabel="No coaches found"
							/>
						)}

						{(!roleFilter || roleFilter === 'client') && clients.length > 0 && (
							<UsersTable
								title="Clients"
								subtitle="Client accounts in the current page"
								icon={UserCircle}
								accent="slate"
								users={clients}
								actions={sharedActions}
								locale={locale}
								t={t}
								emptyLabel="No clients found"
							/>
						)}

						{!roleFilter && misc.length > 0 && (
							<UsersTable
								title="Other roles"
								subtitle="Accounts that are not admin / coach / client"
								icon={Shield}
								accent="slate"
								users={misc}
								actions={sharedActions}
								locale={locale}
								t={t}
							/>
						)}

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-center gap-1.5 mt-8">
								<button
									disabled={page === 1}
									onClick={() => setPage(p => p - 1)}
									className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
								>
									← Prev
								</button>
								{page > 3 && <span className="text-slate-400 text-xs">…</span>}
								{pageNums.map(n => (
									<button
										key={n}
										onClick={() => setPage(n)}
										className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${n === page
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
									className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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

			<AnimatePresence>
				{pagesUser && (
					<PagesAccessModal
						user={pagesUser}
						onClose={() => setPagesUser(null)}
						onSaved={() => { setPagesUser(null); fetchUsers(); }}
						t={t}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}