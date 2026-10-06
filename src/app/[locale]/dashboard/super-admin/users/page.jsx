'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
	Search, ChevronRight, Users, User, LogIn, RefreshCw, X,
	Clock, Dumbbell, Crown, Plus,
	Building2, CornerDownRight,
	CheckCircle2, Ban, Eye, Trash2, KeyRound, Copy, Check,
	UserCheck, UserCog, UserCircle, Edit, Shield,
	AlertTriangle, Mail, Phone, LayoutGrid,
	Link2, MessageSquareText, Wand2,
} from 'lucide-react';
import api from '@/utils/axios';
import DataTable, { TablePagination } from '@/components/atoms/Datatable';
import { getStoredPerPage, setStoredPerPage } from '@/lib/table-prefs';
import GmStatCard from '@/components/molecules/GmStatCard';
import ActionsMenu from '@/components/molecules/ActionsMenu';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import FloatingInput from '@/components/atoms/FloatingInput';
import { memberInitials } from '@/components/pages/dashboard/users/roster/RosterCells';
import '@/components/pages/dashboard/users/roster/roster.css';
import { UserPageAccessFields, useUserPageAccess } from '@/components/page-access/UserPageAccessEditor';
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

const fmtWhen = (d, locale = 'en') => {
	if (!d) return '';
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

function LastLoginCell({ value, locale, empty }) {
	const label = fmtWhen(value, locale);
	return (
		<span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-[var(--gm-muted)]">
			<Clock className="size-3.5 shrink-0" aria-hidden />
			{label || empty}
		</span>
	);
}

const SORT_KEYS = ['name_asc', 'name_desc', 'date_desc', 'date_asc', 'status'];
const ROLE_ICON = { admin: Shield, coach: UserCog, client: User, super_admin: Crown };

function roleTone(role) {
	const key = String(role || '').toLowerCase();
	if (key === 'admin' || key === 'super_admin') return 'admin';
	if (key === 'coach') return 'coach';
	return 'client';
}

function Avatar({ name, role = 'client', size = 'md' }) {
	const tone = roleTone(role);
	const small = size === 'xs' || size === 'sm';
	return (
		<span className={`rs-avatar rs-avatar--${tone}${small ? ' rs-avatar--sm' : ''}`} aria-hidden>
			{memberInitials(name)}
		</span>
	);
}

function StatusBadge({ status, t }) {
	const key = status === 'active' || status === 'suspended' ? status : 'pending';
	const tone = key === 'active' ? 'ok' : key === 'suspended' ? 'danger' : 'warn';
	const label = t ? t(`status.${key}`) : key;
	return (
		<span className={`rs-badge rs-badge--${tone}`}>
			<span className="rs-badge__dot" aria-hidden />
			{label}
		</span>
	);
}

function RoleBadge({ role, t }) {
	const key = String(role || 'client').toLowerCase();
	const Icon = ROLE_ICON[key] || User;
	return (
		<span className={`rs-tag rs-tag--${roleTone(key)}`}>
			<Icon className="size-3.5" strokeWidth={2} aria-hidden />
			{t ? t(`role.${key}`) : key}
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
				className="gm-modal w-full max-w-md"
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
							<h3 className="text-sm font-semibold text-[var(--gm-ink)]">{t?.('credsModal.title') || 'Login Credentials'}</h3>
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
			toast.success(t('editModal.success'));
			onUpdated?.();
			onClose();
		} catch (e) {
			toast.error(e?.response?.data?.message || t('errors.updateFailed'));
		} finally { setLoading(false); }
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.92, opacity: 0, y: 16 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.92, opacity: 0, y: 16 }}
				className="gm-modal w-full max-w-md"
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
							<h3 className="text-sm font-semibold text-[var(--gm-ink)]">{t?.('editModal.title') || 'Edit User'}</h3>
							<p className="text-[10px] text-slate-500">{user.email}</p>
						</div>
					</div>
					<button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors">
						<X size={15} />
					</button>
				</div>

				<div className="space-y-3 p-5">
					<FloatingInput label={t('createModal.fields.name')} value={form.name} onChange={(v) => set('name', v)} icon={User} />
					<FloatingInput label={t('createModal.fields.email')} type="email" value={form.email} onChange={(v) => set('email', v)} icon={Mail} />
					<FloatingInput label={t('createModal.fields.phone')} type="tel" value={form.phone} onChange={(v) => set('phone', v)} icon={Phone} />
				</div>

				<div className="gm-modal-foot px-5 pb-5">
					<button type="button" onClick={onClose} className="rs-btn">{t('actions.cancel')}</button>
					<button type="button" onClick={submit} disabled={loading} className="rs-cta disabled:opacity-60">
						{loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
						{t('editModal.save')}
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
			toast.success(t('deleteModal.success'));
			onDeleted?.();
			onClose();
		} catch (e) {
			toast.error(e?.response?.data?.message || t('errors.deleteFailed'));
		} finally { setLoading(false); }
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.92, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.92, opacity: 0 }}
				className="gm-modal w-full max-w-sm"
			>
				<div className="p-6 text-center">
					<div className="w-14 h-14 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto mb-4">
						<Trash2 size={24} className="text-red-500" />
					</div>
					<h3 className="mb-1 text-base font-semibold text-[var(--gm-ink)]">{t?.('deleteModal.title') || 'Delete user?'}</h3>
					<p className="mb-1 text-xs text-[var(--gm-muted)]">{t('deleteModal.warning')}</p>
					<p className="text-sm font-bold text-slate-700 dark:text-slate-300">{user.name}</p>
					<p className="text-xs text-slate-400">{user.email}</p>
				</div>
				<div className="gm-modal-foot px-5 pb-5">
					<button type="button" onClick={onClose} className="rs-btn">{t('actions.cancel')}</button>
					<button
						type="button"
						onClick={doDelete}
						disabled={loading}
						className="rs-cta !border-transparent disabled:opacity-60"
						style={{ background: 'var(--gm-danger)', boxShadow: 'none' }}
					>
						{loading ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
						{t('deleteModal.confirm')}
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
	const icon = (Icon) => <Icon className="h-4 w-4" />;
	const options = [
		{ key: 'view', group: 'view', icon: icon(Eye), label: t('actions.viewDashboard'), onClick: () => onImpersonate(user) },
		{ key: 'pages', group: 'view', icon: icon(LayoutGrid), label: t('actions.pageAccess'), onClick: () => onPages?.(user) },
		{ key: 'edit', group: 'account', icon: icon(Edit), label: t('actions.editData'), onClick: () => onEdit(user) },
		{ key: 'creds', group: 'account', icon: icon(KeyRound), label: t('actions.copyCredentials'), onClick: () => onShowCreds(user) },
		user.status !== 'active' && { key: 'activate', group: 'status', icon: icon(CheckCircle2), label: t('actions.activate'), onClick: () => onStatusChange(user.id, 'active') },
		user.status !== 'suspended' && { key: 'suspend', group: 'status', icon: icon(Ban), label: t('actions.suspend'), onClick: () => onStatusChange(user.id, 'suspended') },
		{ key: 'delete', group: 'danger', icon: icon(Trash2), label: t('actions.deleteUser'), onClick: () => onDelete(user), danger: true },
	].filter(Boolean);

	return (
		<div className="flex items-center justify-end gap-1.5">
			<button
				type="button"
				onClick={() => onImpersonate(user)}
				className="rs-cta !h-8 !rounded-[9px] !px-2.5 !text-[12px]"
				style={{ width: 'auto' }}
				title={t('actions.loginAs')}
			>
				<LogIn className="size-3.5" strokeWidth={2} aria-hidden />
				{t('actions.loginAs')}
			</button>
			<ActionsMenu
				options={options}
				align="right"
				ariaLabel={t('table.actions')}
				buttonClassName="rs-row-action"
				header={(
					<>
						<span className="am-head__title">{user.name || '—'}</span>
						{user.email ? <span className="am-head__sub">{user.email}</span> : null}
					</>
				)}
			/>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Users table (partitioned sections)
// ─────────────────────────────────────────────────────────────────────────────
const TABLE_TH =
	'px-3 py-2.5 text-[11px] font-semibold text-[var(--gm-muted)] whitespace-nowrap text-start';
const TABLE_TD = 'px-3 py-2.5 align-middle text-start';

function pageAccessCounts(user) {
	return {
		legacy: Array.isArray(user?.allowedPages) ? user.allowedPages.length : 0,
		custom: (user?.pageOverrides?.extra || 0) + (user?.pageOverrides?.locked || 0),
	};
}

function AccessCell({ user }) {
	const tAccess = useTranslations('pageAccess');
	const { legacy, custom } = pageAccessCounts(user);
	if (!legacy && !custom) {
		return <span className="rs-none text-[12px]">{tAccess('user.roleDefault')}</span>;
	}
	return (
		<span className="rs-tag rs-tag--admin">
			<LayoutGrid className="size-3.5" strokeWidth={2} aria-hidden />
			{legacy ? tAccess('user.legacy', { count: legacy }) : tAccess('user.customized', { count: custom })}
		</span>
	);
}

function UserIdentity({ user, size = 'sm', extra }) {
	return (
		<div className="rs-member">
			<Avatar name={user.name} role={user.role} size={size} />
			<span className="rs-member__text">
				<span className="rs-member__name">{user.name || '—'}</span>
				{extra}
			</span>
		</div>
	);
}

function UsersTableShell({ title, subtitle, icon: Icon, count, children }) {
	return (
		<section className="overflow-hidden rounded-[18px] border border-[var(--gm-line)] bg-[var(--gm-paper)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--gm-line)] px-4 py-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="rs-avatar rs-avatar--sm rs-avatar--admin" aria-hidden>
						<Icon className="size-3.5" strokeWidth={2} />
					</span>
					<div className="min-w-0">
						<h2 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--gm-ink)]">{title}</h2>
						{subtitle ? <p className="truncate text-[12px] text-[var(--gm-muted)]">{subtitle}</p> : null}
					</div>
				</div>
				<span className="rs-tag rs-tag--admin shrink-0 tabular-nums">{count}</span>
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
function UsersTable({ title, subtitle, icon, users, actions, locale, t, emptyLabel }) {
	const columns = [
		{ key: 'user', header: t('table.user'), cell: (u) => <UserIdentity user={u} /> },
		{ key: 'email', header: t('table.email'), cell: (u) => (
			<div className="flex max-w-[220px] items-center gap-1">
				<span className="truncate text-[12.5px] text-[var(--gm-ink-soft)]">{u.email || '—'}</span>
				{u.email ? <CopyBtn value={u.email} /> : null}
			</div>
		) },
		{ key: 'phone', header: t('table.phone'), cell: (u) => <span className="text-[12.5px] text-[var(--gm-muted)]">{u.phone || '—'}</span> },
		{ key: 'role', header: t('table.role'), cell: (u) => <RoleBadge role={u.role} t={t} /> },
		{ key: 'status', header: t('table.status'), cell: (u) => <StatusBadge status={u.status} t={t} /> },
		{ key: 'access', header: t('table.access'), cell: (u) => <AccessCell user={u} /> },
		{ key: 'joined', header: t('table.joined'), cell: (u) => <span className="whitespace-nowrap text-[12px] text-[var(--gm-muted)]">{fmt(u.created_at, locale)}</span> },
		{ key: 'lastLogin', header: t('table.lastLogin'), cell: (u) => <LastLoginCell value={u.lastLogin} locale={locale} empty={t('table.never')} /> },
		{ key: 'actions', header: t('table.actions'), cell: (u) => <ActionBar user={u} {...actions} t={t} /> },
	];
	return (
		<UsersTableShell title={title} subtitle={subtitle} icon={icon} count={users.length}>
			<DataTable
				hideToolbar
				compact
				columns={columns}
				data={users}
				rowKey={(u) => u.id}
				labels={{ emptyTitle: emptyLabel || t('empty.noUsers') }}
			/>
		</UsersTableShell>
	);
}

/** Admins table — expand row → coaches (+ their clients) */
function AdminsTable({ admins, actions, locale, t, rosterTick = 0 }) {
	return (
		<UsersTableShell
			title={t('sections.admins')}
			subtitle={t('sections.adminsHint')}
			icon={Building2}
			count={admins.length}
		>
			<table className="w-full min-w-[920px] border-collapse">
				<thead>
					<tr className="border-b border-[var(--gm-line)]">
						<th className={TABLE_TH}>{t('table.admin')}</th>
						<th className={TABLE_TH}>{t('table.email')}</th>
						<th className={`${TABLE_TH} hidden md:table-cell`}>{t('table.team')}</th>
						<th className={TABLE_TH}>{t('table.status')}</th>
						<th className={`${TABLE_TH} hidden lg:table-cell`}>{t('table.access')}</th>
						<th className={`${TABLE_TH} hidden sm:table-cell`}>{t('table.joined')}</th>
						<th className={`${TABLE_TH} hidden md:table-cell`}>{t('table.lastLogin')}</th>
						<th className={`${TABLE_TH} text-end`}>{t('table.actions')}</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--gm-line)]">
					{admins.length === 0 ? (
						<EmptyTableRow colSpan={8} label={t('sections.noAdmins')} />
					) : (
						admins.map(admin => (
							<AdminTableBlock key={admin.id} admin={admin} actions={actions} locale={locale} t={t} rosterTick={rosterTick} />
						))
					)}
				</tbody>
			</table>
		</UsersTableShell>
	);
}

function AdminTableBlock({ admin, actions, locale, t, rosterTick = 0 }) {
	const [open, setOpen] = useState(false);
	const [coaches, setCoaches] = useState([]);
	const [clients, setClients] = useState([]);
	const [coachTotal, setCoachTotal] = useState(0);
	const [clientTotal, setClientTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [movingId, setMovingId] = useState(null);
	const counts = admin.counts || {};
	const daysLeft = admin.daysLeft;

	const loadRoster = async () => {
		setLoading(true);
		try {
			const [coachesRes, clientsRes] = await Promise.all([
				api.get(`/auth/admin/${admin.id}/coaches`, { params: { limit: 500, page: 1 } }),
				api.get(`/auth/admin/${admin.id}/clients`, { params: { limit: 500, page: 1 } }),
			]);
			setCoaches(coachesRes.data.items || []);
			setClients(clientsRes.data.items || []);
			setCoachTotal(Number(coachesRes.data.total ?? coachesRes.data.items?.length ?? 0));
			setClientTotal(Number(clientsRes.data.total ?? clientsRes.data.items?.length ?? 0));
			setLoaded(true);
			setOpen(true);
		} catch { toast.error(t('errors.loadCoaches')); }
		finally { setLoading(false); }
	};

	useEffect(() => {
		if (!loaded) return;
		loadRoster();
		// Reload this admin's roster after a create or move on the page.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rosterTick]);

	const toggle = () => {
		if (loaded) { setOpen(o => !o); return; }
		loadRoster();
	};

	const grouped = useMemo(() => {
		const byCoach = new Map(coaches.map((c) => [c.id, []]));
		const loose = [];
		for (const client of clients) {
			const coachId = client.coach?.id;
			if (coachId && byCoach.has(coachId)) byCoach.get(coachId).push(client);
			else loose.push(client);
		}
		return { byCoach, loose };
	}, [coaches, clients]);

	const copyTally = async () => {
		const line = `${admin.name}: ${t('sections.coachCount', { count: counts.coaches ?? coachTotal })}, ${t('sections.clientCount', { count: counts.clients ?? clientTotal })}, ${t('sections.activeCount', { count: counts.activeClients ?? 0 })}`;
		try {
			await navigator.clipboard.writeText(line);
			toast.success(t('sections.copiedTally'));
		} catch { toast.error(t('errors.loadFailed')); }
	};

	const addUnder = (preset) => actions.onAddUnder?.(preset);

	const moveClient = async (client, coachId) => {
		if (!coachId || coachId === client.coach?.id) return;
		setMovingId(client.id);
		try {
			await api.post('/auth/coach/assign', { userId: client.id, coachId });
			toast.success(t('sections.moved'));
			await loadRoster();
		} catch (e) {
			toast.error(e?.response?.data?.message || t('sections.moveFailed'));
		} finally { setMovingId(null); }
	};

	return (
		<>
			<tr className="transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-500)_6%,transparent)]">
				<td className={TABLE_TD}>
					<div className="flex items-center gap-2.5 min-w-0">
						<button
							type="button"
							onClick={toggle}
							className="w-7 h-7 rounded-lg border grid place-items-center shrink-0 transition-colors"
							style={{
								background: open ? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' : 'var(--color-primary-50)',
								borderColor: 'var(--color-primary-200)',
								color: open ? '#fff' : 'var(--color-primary-600)',
							}}
							title={t('sections.showCoaches')}
						>
							{loading
								? <RefreshCw size={12} className="animate-spin" />
								: <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : 'rtl:rotate-180'}`} />}
						</button>
						<UserIdentity
							user={admin}
							size="md"
							extra={
								<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
									<RoleBadge role="admin" t={t} />
									<span className="rs-tag rs-tag--coach">{t('sections.coachCount', { count: counts.coaches ?? 0 })}</span>
									<span className="rs-tag rs-tag--client">{t('sections.clientCount', { count: counts.clients ?? 0 })}</span>
									<span className="rs-badge rs-badge--ok">{t('sections.activeCount', { count: counts.activeClients ?? 0 })}</span>
									{daysLeft != null && daysLeft < 30 && (
										<span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
											daysLeft < 7
												? 'bg-red-50 text-red-600 border-red-200'
												: 'bg-amber-50 text-amber-600 border-amber-200'
										}`}>
											<Clock size={8} />
											{daysLeft < 0 ? t('subscription.expired') : `${daysLeft}d`}
										</span>
									)}
								</div>
							}
						/>
					</div>
				</td>
				<td className={TABLE_TD}>
					<div className="flex items-center gap-1 max-w-[220px]">
						<span className="truncate text-[12.5px] text-[var(--gm-ink-soft)]">{admin.email}</span>
						<CopyBtn value={admin.email} />
					</div>
				</td>
				<td className={`${TABLE_TD} hidden md:table-cell`}>
					<div className="flex flex-wrap gap-1.5">
						<button type="button" className="rs-btn !h-8 !px-2.5 !text-[12px]" onClick={() => addUnder({ role: 'coach', adminId: admin.id, adminName: admin.name })}>
							<Plus className="size-3.5" aria-hidden />
							{t('sections.addCoach')}
						</button>
						<button type="button" className="rs-btn !h-8 !px-2.5 !text-[12px]" onClick={() => addUnder({ role: 'client', adminId: admin.id, adminName: admin.name })}>
							<Plus className="size-3.5" aria-hidden />
							{t('sections.addClient')}
						</button>
					</div>
				</td>
				<td className={TABLE_TD}><StatusBadge status={admin.status} t={t} /></td>
				<td className={`${TABLE_TD} hidden lg:table-cell`}><AccessCell user={admin} /></td>
				<td className={`${TABLE_TD} hidden sm:table-cell`}>
					<span className="whitespace-nowrap text-[12px] text-[var(--gm-muted)]">{fmt(admin.created_at, locale)}</span>
				</td>
				<td className={`${TABLE_TD} hidden md:table-cell`}>
					<LastLoginCell value={admin.lastLogin} locale={locale} empty={t('table.never')} />
				</td>
				<td className={`${TABLE_TD} text-end`}>
					<ActionBar user={admin} {...actions} t={t} />
				</td>
			</tr>

			{open && (
				<tr className="bg-[color-mix(in_srgb,var(--gm-muted)_6%,var(--gm-paper))]">
					<td colSpan={8} className="p-0">
						<div className="border-y border-[var(--gm-line)]">
							<div className="flex flex-wrap items-center gap-2 border-b border-[var(--gm-line)] px-3 py-2.5">
								<p className="text-[13px] font-semibold text-[var(--gm-ink)]">
									{t('sections.coachesUnder', { name: admin.name })}
								</p>
								<span className="rs-tag rs-tag--coach">{t('sections.coachCount', { count: counts.coaches ?? coachTotal })}</span>
								<span className="rs-tag rs-tag--client">{t('sections.clientCount', { count: counts.clients ?? clientTotal })}</span>
								<button type="button" className="rs-btn !h-8 !px-2.5 !text-[12px]" onClick={copyTally}>
									<Copy className="size-3.5" aria-hidden />
									{t('sections.copyTally')}
								</button>
								<button type="button" className="rs-btn !h-8 !px-2.5 !text-[12px] md:hidden" onClick={() => addUnder({ role: 'coach', adminId: admin.id, adminName: admin.name })}>
									<Plus className="size-3.5" aria-hidden />
									{t('sections.addCoach')}
								</button>
								{(coachTotal > coaches.length || clientTotal > clients.length) && (
									<span className="text-[12px] text-[var(--gm-muted)]">
										{t('sections.listCap', { shown: Math.max(coaches.length, clients.length), total: Math.max(coachTotal, clientTotal) })}
									</span>
								)}
							</div>
							{coaches.length === 0 && clients.length === 0 ? (
								<p className="px-4 py-4 text-[12.5px] text-[var(--gm-muted)]">{t('empty.noCoaches')}</p>
							) : (
								<div className="flex flex-col">
									{coaches.map((coach) => {
										const mine = grouped.byCoach.get(coach.id) || [];
										const coachUser = { ...coach, role: 'coach' };
										return (
											<section key={coach.id} className="border-b border-[var(--gm-line)] last:border-b-0">
												<div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
													<UserIdentity
														user={coachUser}
														extra={<span className="text-[11px] font-semibold text-[var(--color-secondary-600)]">{t('sections.clientCount', { count: mine.length })}</span>}
													/>
													<span className="truncate text-[12px] text-[var(--gm-muted)]">{coach.email}</span>
													<StatusBadge status={coach.status} t={t} />
													<LastLoginCell value={coach.lastLogin} locale={locale} empty={t('table.never')} />
													<button
														type="button"
														className="rs-btn !h-8 !px-2.5 !text-[12px]"
														onClick={() => addUnder({ role: 'client', adminId: admin.id, adminName: admin.name, coachId: coach.id, coachName: coach.name })}
													>
														<Plus className="size-3.5" aria-hidden />
														{t('sections.addClientFor', { name: coach.name || coach.email })}
													</button>
													<div className="ms-auto">
														<ActionBar user={coachUser} {...actions} t={t} />
													</div>
												</div>
												{mine.length === 0 ? (
													<p className="px-4 pb-3 text-[12px] text-[var(--gm-muted)]" style={{ paddingInlineStart: 52 }}>{t('empty.noClients')}</p>
												) : mine.map((client) => (
													<div key={client.id} className="flex flex-wrap items-center gap-2 border-t border-[var(--gm-line)] px-3 py-2" style={{ paddingInlineStart: 44 }}>
														<CornerDownRight className="size-3.5 shrink-0 text-[var(--gm-faint)] rtl:-scale-x-100" aria-hidden />
														<UserIdentity user={{ ...client, role: 'client' }} size="sm" />
														<span className="truncate text-[12px] text-[var(--gm-muted)]">{client.email}</span>
														<StatusBadge status={client.status} t={t} />
														<LastLoginCell value={client.lastLogin} locale={locale} empty={t('table.never')} />
														<label className="ms-auto flex items-center gap-1.5 text-[11px] text-[var(--gm-muted)]">
															{t('sections.moveCoach')}
															<select
																className="h-8 max-w-[180px] rounded-lg border border-[var(--gm-line)] bg-[var(--gm-paper)] px-2 text-[12px] text-[var(--gm-ink)]"
																value={client.coach?.id || ''}
																disabled={movingId === client.id}
																onChange={(e) => moveClient(client, e.target.value)}
															>
																{coaches.map((c) => (
																	<option key={c.id} value={c.id}>{c.name || c.email}</option>
																))}
															</select>
														</label>
														<ActionBar user={{ ...client, role: 'client' }} {...actions} t={t} />
													</div>
												))}
											</section>
										);
									})}
									{grouped.loose.length > 0 && (
										<section className="border-t border-[var(--gm-line)]">
											<div className="px-3 py-2">
												<p className="text-[12.5px] font-semibold text-[var(--gm-ink)]">{t('sections.unassigned')}</p>
												<p className="text-[12px] text-[var(--gm-muted)]">{t('sections.unassignedHint')}</p>
											</div>
											{grouped.loose.map((client) => (
												<div key={client.id} className="flex flex-wrap items-center gap-2 border-t border-[var(--gm-line)] px-3 py-2">
													<UserIdentity user={{ ...client, role: 'client' }} size="sm" />
													<span className="truncate text-[12px] text-[var(--gm-muted)]">{client.email}</span>
													<StatusBadge status={client.status} t={t} />
													<LastLoginCell value={client.lastLogin} locale={locale} empty={t('table.never')} />
													{coaches.length > 0 && (
														<label className="ms-auto flex items-center gap-1.5 text-[11px] text-[var(--gm-muted)]">
															{t('sections.moveCoach')}
															<select
																className="h-8 max-w-[180px] rounded-lg border border-[var(--gm-line)] bg-[var(--gm-paper)] px-2 text-[12px] text-[var(--gm-ink)]"
																value=""
																disabled={movingId === client.id}
																onChange={(e) => moveClient(client, e.target.value)}
															>
																<option value="">{t('sections.unassigned')}</option>
																{coaches.map((c) => (
																	<option key={c.id} value={c.id}>{c.name || c.email}</option>
																))}
															</select>
														</label>
													)}
													<ActionBar user={{ ...client, role: 'client' }} {...actions} t={t} />
												</div>
											))}
										</section>
									)}
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
// Per-user page overrides (on top of the role settings in Page access)
// ─────────────────────────────────────────────────────────────────────────────
function PagesAccessModal({ user, onClose, onSaved }) {
	const tAccess = useTranslations('pageAccess');
	const editor = useUserPageAccess(user?.id, user?.role);

	const save = async () => {
		try {
			await editor.save();
			toast.success(tAccess('user.saved'));
			onSaved?.();
		} catch (e) {
			toast.error(e?.response?.data?.message || tAccess('saveFailed'));
		}
	};

	if (!user) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<motion.div
				initial={{ scale: 0.94, opacity: 0, y: 16 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.94, opacity: 0, y: 16 }}
				className="gm-modal flex max-h-[88vh] w-full max-w-xl flex-col"
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
							<h3 className="font-black text-slate-900 dark:text-slate-100 text-sm truncate">{tAccess('user.title', { name: user.name || user.email })}</h3>
							<p className="text-[10px] text-slate-500">{tAccess(`roles.${user.role}`)}</p>
						</div>
					</div>
					<button onClick={onClose} aria-label={tAccess('user.cancel')} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 transition-colors">
						<X size={16} />
					</button>
				</div>

				<div className="p-4 overflow-y-auto min-h-0 flex-1">
					<UserPageAccessFields editor={editor} />
				</div>

				<div className="flex gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
					<button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400">
						{tAccess('user.cancel')}
					</button>
					<button
						onClick={save}
						disabled={editor.saving || editor.status !== 'ready'}
						className="flex-1 h-10 rounded-lg text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
						style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					>
						{editor.saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
						{tAccess('user.save')}
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

function blankCreateForm(preset) {
	return {
		name: '',
		email: '',
		phone: '',
		role: preset?.role || 'admin',
		password: '',
		adminId: preset?.adminId || '',
		coachId: preset?.coachId || '',
	};
}

function CreateUserModal({ open, onClose, onCreated, t, preset = null }) {
	const locale = useLocale();
	const [step, setStep] = useState(1); // 1 account · 2 pages · 3 share
	const [form, setForm] = useState(() => blankCreateForm(preset));
	const [coachOptions, setCoachOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [created, setCreated] = useState(null); // { id, name, email, password, role }
	const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

	useEffect(() => {
		if (!open) return;
		setForm(blankCreateForm(preset));
		setCreated(null);
		setStep(1);
		setCoachOptions([]);
		if (!preset?.adminId || preset?.coachId || preset?.role === 'coach') return;
		let cancelled = false;
		api.get(`/auth/admin/${preset.adminId}/coaches`, { params: { limit: 500, page: 1 } })
			.then(({ data }) => { if (!cancelled) setCoachOptions(data.items || []); })
			.catch(() => { if (!cancelled) setCoachOptions([]); });
		return () => { cancelled = true; };
	}, [open, preset]);
	const tAccess = useTranslations('pageAccess');
	const access = useUserPageAccess(created?.id, created?.role);

	const shareNextHref = useMemo(
		() => resolveShareLandingPath({
			role: created?.role || form.role,
			loginLandingPage: access.landingPageId,
			pageAccess: { locked: access.lockedIds },
		}),
		[created?.role, form.role, access.landingPageId, access.lockedIds],
	);

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
				...(form.adminId ? { adminId: form.adminId } : {}),
				...(form.role === 'client' && form.coachId ? { coachId: form.coachId } : {}),
			};
			const { data } = await api.post('/auth/admin/users', payload);
			const password = data.tempPassword || form.password.trim() || '';
			const userId = data?.user?.id;
			if (!userId) throw new Error('User id missing from create response');
			setCreated({
				id: userId,
				name: form.name.trim(),
				email: form.email.trim(),
				password,
				role: form.role,
			});
			setStep(2);
			toast.success('User created — configure pages next');
			onCreated?.();
		} catch (e) {
			toast.error(e?.response?.data?.message || 'Create failed');
		} finally { setLoading(false); }
	};

	const submitAccess = async () => {
		if (!created?.id) return;
		try {
			await access.save();
			toast.success(tAccess('user.saved'));
			setStep(3);
		} catch (e) {
			toast.error(e?.response?.data?.message || tAccess('saveFailed'));
		}
	};

	const handleClose = () => {
		setForm(blankCreateForm(null));
		setCreated(null);
		setStep(1);
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
				className="gm-modal w-full max-w-lg"
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
							<h3 className="text-sm font-semibold text-[var(--gm-ink)]">{t?.('createModal.title') || 'Create New User'}</h3>
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
							{preset?.adminName && (
								<p className="rounded-[12px] border border-[var(--gm-line)] bg-[color-mix(in_srgb,var(--color-primary-500)_8%,var(--gm-paper))] px-3 py-2 text-[12.5px] text-[var(--gm-ink-soft)]">
									{t('createModal.underAdmin', { name: preset.adminName })}
									{preset.coachName ? ` · ${t('createModal.underCoach', { name: preset.coachName })}` : ''}
								</p>
							)}
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
							<FloatingSelect
								label={t('createModal.fields.role')}
								value={form.role}
								disabled={Boolean(preset?.role)}
								onChange={(id) => set('role', id || 'admin')}
								options={[
									{ id: 'admin', label: t('role.admin') },
									{ id: 'coach', label: t('role.coach') },
									{ id: 'client', label: t('role.client') },
								]}
							/>
							{form.role === 'client' && preset?.adminId && !preset?.coachId && (
								<FloatingSelect
									label={t('createModal.coachOptional')}
									value={form.coachId || 'none'}
									onChange={(id) => set('coachId', !id || id === 'none' ? '' : id)}
									options={[
										{ id: 'none', label: t('createModal.noCoach') },
										...coachOptions.map((c) => ({ id: c.id, label: c.name || c.email })),
									]}
								/>
							)}
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

							<UserPageAccessFields editor={access} compact />
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
							<button onClick={submitAccess} disabled={access.saving || access.status !== 'ready'}
								className="flex-1 h-10 rounded-lg text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
								style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
							>
								{access.saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
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

	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [debounced, setDebounced] = useState('');
	const [statusFilter, setStatus] = useState('');
	const [roleFilter, setRole] = useState('');
	const [sortBy, setSortBy] = useState('date_desc');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [totalCount, setCount] = useState(0);
	const [createOpen, setCreate] = useState(false);
	const [createPreset, setCreatePreset] = useState(null);
	const [rosterTick, setRosterTick] = useState(0);
	const [editUser, setEditUser] = useState(null);
	const [deleteUser, setDeleteUser] = useState(null);
	const [credsUser, setCredsUser] = useState(null);
	const [pagesUser, setPagesUser] = useState(null);

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
					page, limit, includeTree: true,
					...(debounced && { search: debounced }),
					...(statusFilter && { status: statusFilter }),
					...(roleFilter && { role: roleFilter }),
					...(sortBy && { sort: sortBy }),
				},
			});
			setItems(data.items || []);
			setCount(data.total || 0);
		} catch { toast.error(t('errors.loadFailed')); }
		finally { setLoading(false); }
	}, [page, limit, debounced, statusFilter, roleFilter, sortBy, t]);

	useEffect(() => {
		const id = setTimeout(() => setDebounced(search.trim()), 350);
		return () => clearTimeout(id);
	}, [search]);

	useEffect(() => {
		setLimit(getStoredPerPage(10));
	}, []);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	useEffect(() => { fetchUsers(); }, [fetchUsers]);

	// ── Impersonate (does NOT change the user's password) ──
	const handleImpersonate = useCallback(async (target) => {
		const toastId = toast.loading(t('impersonation.loading'));
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

			toast.success(t('impersonation.success', { name: user.name }), { id: toastId });

			const dest = resolvePostLoginPath(user);
			router.push(`/${locale}${dest}`);
		} catch (e) {
			toast.error(e?.response?.data?.message || t('impersonation.failed'), { id: toastId });
			localStorage.removeItem('super_admin_prev_session');
			localStorage.removeItem('impersonated_user');
			notifyImpersonationChanged();
		}
	}, [router, locale, t]);



	// ── Status change ──
	const handleStatusChange = useCallback(async (userId, status) => {
		try {
			await api.put(`/auth/status/${userId}`, { status });
			toast.success(t('actions.statusUpdated'));
			fetchUsers();
		} catch { toast.error(t('errors.statusFailed')); }
	}, [fetchUsers, t]);

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

	const roleSegments = [
		{ id: '', label: t('filters.allRoles'), Icon: Users },
		{ id: 'admin', label: t('role.admin'), Icon: Shield },
		{ id: 'coach', label: t('role.coach'), Icon: UserCog },
		{ id: 'client', label: t('role.client'), Icon: User },
	];

	const statCards = [
		{
			key: 'total',
			title: t('stats.totalUsers'),
			value: totalCount,
			icon: Users,
			hint: t('statsHints.platform'),
			tone: 'gm-chip',
			stroke: 'var(--color-primary-500)',
			fill: 'var(--color-primary-400)',
			seed: 0.4,
			max: Math.max(totalCount, 1),
		},
		{
			key: 'active',
			title: t('stats.active'),
			value: stats.activeUsers,
			icon: UserCheck,
			hint: t('statsHints.thisPage'),
			tone: 'gm-chip-ok',
			stroke: 'var(--gm-ok)',
			fill: 'var(--gm-ok)',
			seed: 0.9,
			max: Math.max(totalCount, 1),
		},
		{
			key: 'coaches',
			title: t('stats.coaches'),
			value: stats.coaches,
			icon: UserCog,
			hint: t('statsHints.thisPage'),
			tone: 'gm-chip-secondary',
			stroke: 'var(--color-secondary-500)',
			fill: 'var(--color-secondary-400)',
			seed: 1.4,
			max: Math.max(totalCount, 1),
		},
		{
			key: 'clients',
			title: t('stats.clients'),
			value: stats.clients,
			icon: UserCircle,
			hint: t('statsHints.thisPage'),
			tone: 'gm-chip-warn',
			stroke: 'var(--gm-warn)',
			fill: 'var(--gm-warn)',
			seed: 1.9,
			max: Math.max(totalCount, 1),
		},
	];

	const sharedActions = {
		onImpersonate: handleImpersonate,
		onStatusChange: handleStatusChange,
		onEdit: (u) => setEditUser(u),
		onDelete: (u) => setDeleteUser(u),
		onShowCreds: (u) => setCredsUser(u),
		onPages: (u) => setPagesUser(u),
		onAddUnder: (preset) => { setCreatePreset(preset); setCreate(true); },
		t,
		locale,
	};

	return (
		<div className="gm-surface rs-scope app-stack pb-4">
			<div className="rs-summary">
				<header className="rs-hero">
					<span className="rs-hero__mark" aria-hidden>
						<Crown strokeWidth={1.7} />
					</span>
					<div className="rs-hero__text">
						<h1 className="rs-hero__title">{t('header.title')}</h1>
						<p className="rs-hero__sub">{t('header.subtitle')}</p>
					</div>
					<button type="button" className="rs-cta" onClick={() => { setCreatePreset(null); setCreate(true); }}>
						<Plus className="size-4" strokeWidth={2} aria-hidden />
						<span>{t('header.createNewUser')}</span>
					</button>
				</header>
				<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{statCards.map((card, index) => (
						<GmStatCard key={card.key} card={card} index={index} />
					))}
				</section>
			</div>

			<div className="rs-toolbar">
				<label className="rs-search">
					<span className="rs-search__icon" aria-hidden>
						<Search className="size-4" strokeWidth={2} />
					</span>
					<input
						type="search"
						value={search}
						onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						placeholder={t('filters.searchPlaceholder')}
						className="rs-search__input"
					/>
				</label>

				<div className="rs-seg max-w-full" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label={t('filters.allRoles')}>
					{roleSegments.map((opt) => {
						const on = roleFilter === opt.id;
						const Icon = opt.Icon;
						return (
							<button
								key={opt.id || 'all'}
								type="button"
								role="radio"
								aria-checked={on}
								className={`rs-seg__btn${on ? ' is-on' : ''}`}
								onClick={() => { setRole(opt.id); setPage(1); }}
							>
								{on ? <span className="rs-seg__pill" aria-hidden /> : null}
								<Icon className="size-3.5" strokeWidth={2} aria-hidden />
								<span>{opt.label}</span>
							</button>
						);
					})}
				</div>

				<div className="w-full min-w-[160px] sm:w-44">
					<FloatingSelect
						label={t('filters.allStatuses')}
						value={statusFilter || 'all'}
						onChange={(id) => { setStatus(!id || id === 'all' ? '' : id); setPage(1); }}
						options={[
							{ id: 'all', label: t('filters.allStatuses') },
							{ id: 'active', label: t('status.active') },
							{ id: 'pending', label: t('status.pending') },
							{ id: 'suspended', label: t('status.suspended') },
						]}
					/>
				</div>
				<div className="w-full min-w-[160px] sm:w-48">
					<FloatingSelect
						label={t('filters.sortLabel')}
						value={sortBy}
						onChange={(id) => { setSortBy(id || 'date_desc'); setPage(1); }}
						options={SORT_KEYS.map((id) => ({ id, label: t(`sort.${id}`) }))}
					/>
				</div>
				<button type="button" className="rs-btn" onClick={fetchUsers} aria-label={t('actions.refresh')}>
					<RefreshCw className={`size-4${loading ? ' animate-spin' : ''}`} strokeWidth={2} aria-hidden />
					<span className="hidden sm:inline">{t('actions.refresh')}</span>
				</button>
			</div>

			{loading && items.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 py-24">
					<span className="rs-hero__mark !h-12 !w-12 !rounded-2xl" aria-hidden>
						<RefreshCw className="size-5 animate-spin" />
					</span>
					<p className="text-sm text-[var(--gm-muted)]">{t('loading')}</p>
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
					<span className="rs-avatar rs-avatar--admin" aria-hidden>
						<Users className="size-4" />
					</span>
					<p className="text-sm font-semibold text-[var(--gm-ink)]">{t('empty.noUsers')}</p>
					<p className="text-[13px] text-[var(--gm-muted)]">{t('empty.tryAdjust')}</p>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{(!roleFilter || roleFilter === 'admin') && admins.length > 0 && (
						<AdminsTable admins={admins} actions={sharedActions} locale={locale} t={t} rosterTick={rosterTick} />
					)}
					{(!roleFilter || roleFilter === 'coach') && coaches.length > 0 && (
						<UsersTable
							title={t('sections.coaches')}
							subtitle={t('sections.coachesHint')}
							icon={Dumbbell}
							users={coaches}
							actions={sharedActions}
							locale={locale}
							t={t}
							emptyLabel={t('empty.noCoaches')}
						/>
					)}
					{(!roleFilter || roleFilter === 'client') && clients.length > 0 && (
						<UsersTable
							title={t('sections.clients')}
							subtitle={t('sections.clientsHint')}
							icon={UserCircle}
							users={clients}
							actions={sharedActions}
							locale={locale}
							t={t}
							emptyLabel={t('empty.noClients')}
						/>
					)}
					{!roleFilter && misc.length > 0 && (
						<UsersTable
							title={t('sections.misc')}
							subtitle={t('sections.miscHint')}
							icon={Shield}
							users={misc}
							actions={sharedActions}
							locale={locale}
							t={t}
						/>
					)}
					{totalCount > 0 && (
						<TablePagination
							pagination={{ current_page: page, per_page: limit, total_records: totalCount }}
							onPageChange={({ page: nextPage, per_page }) => {
								const nextLimit = Number(per_page);
								if (nextLimit && nextLimit !== limit) {
									setStoredPerPage(nextLimit);
									setLimit(nextLimit);
									setPage(1);
									return;
								}
								setPage(Number(nextPage ?? 1));
							}}
							isLoading={loading}
						/>
					)}
				</div>
			)}

			{/* ── Modals ── */}
			<AnimatePresence>
				{createOpen && (
					<CreateUserModal
						open={createOpen}
						preset={createPreset}
						onClose={() => { setCreate(false); setCreatePreset(null); }}
						onCreated={() => { fetchUsers(); setRosterTick((n) => n + 1); }}
						t={t}
					/>
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
					/>
				)}
			</AnimatePresence>
		</div>
	);
}