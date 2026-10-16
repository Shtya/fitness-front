'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
	AlertTriangle, CalendarClock, CheckCircle2, Package, Plus, Receipt, RefreshCw, Wallet, XCircle,
} from 'lucide-react';

import api from '@/utils/axios';
import { Modal } from '@/components/dashboard/ui/UI';
import GmStatCard from '@/components/molecules/GmStatCard';
import { Notification } from '@/config/Notification';
import { useUser } from '@/hooks/useUser';
import { IntakeHero } from '@/components/pages/dashboard/intake/IntakeChrome';
import RenewalsTab from '@/components/pages/dashboard/billing/RenewalsTab';
import PaymentsTab from '@/components/pages/dashboard/billing/PaymentsTab';
import PackagesTab from '@/components/pages/dashboard/billing/PackagesTab';
import RecordPaymentForm from '@/components/pages/dashboard/billing/RecordPaymentForm';
import PackageForm from '@/components/pages/dashboard/billing/PackageForm';
import ConfirmDelete from '@/components/pages/dashboard/billing/ConfirmDelete';
import { apiError, formatDate, formatMoney } from '@/components/pages/dashboard/billing/billing-utils';
import '@/components/pages/dashboard/users/roster/roster.css';

const TABS = ['renewals', 'payments', 'packages'];
const MANAGER_ROLES = ['admin', 'super_admin'];

export default function BillingPage() {
	const t = useTranslations('billing');
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const user = useUser();
	// The route is admin-only; until the stored user loads, assume it so the CTA does not flicker.
	const canManage = !user || MANAGER_ROLES.includes(user.role);

	const [tab, setTab] = useState(() => (TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'renewals'));

	const [stats, setStats] = useState(null);
	const [clients, setClients] = useState([]);
	const [plans, setPlans] = useState([]);
	const [loading, setLoading] = useState({ stats: true, clients: true, plans: true });
	const [loadError, setLoadError] = useState(null);
	const [paymentsVersion, setPaymentsVersion] = useState(0);

	const [recordFor, setRecordFor] = useState(null);
	const [editingPlan, setEditingPlan] = useState(null);
	const [deletePayment, setDeletePayment] = useState(null);
	const [deletePlan, setDeletePlan] = useState(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	const load = useCallback(async (key, request, apply) => {
		setLoading(l => ({ ...l, [key]: true }));
		try {
			const { data } = await request();
			apply(data);
			return true;
		} catch (e) {
			setLoadError(apiError(e, t('errors.load')));
			return false;
		} finally {
			setLoading(l => ({ ...l, [key]: false }));
		}
	}, [t]);

	const loadStats = useCallback(() => load('stats', () => api.get('/billing/stats/overview'), setStats), [load]);
	const loadClients = useCallback(
		() => load('clients', () => api.get('/billing/clients', { params: { limit: 1000 } }), d => setClients(Array.isArray(d?.items) ? d.items : [])),
		[load],
	);
	const loadPlans = useCallback(
		() => load('plans', () => api.get('/billing/plans', { params: { limit: 200 } }), d => setPlans(Array.isArray(d?.items) ? d.items : [])),
		[load],
	);

	const refreshAll = useCallback(() => {
		setLoadError(null);
		loadStats();
		loadClients();
		loadPlans();
		setPaymentsVersion(v => v + 1);
	}, [loadStats, loadClients, loadPlans]);

	useEffect(() => {
		loadStats();
		loadClients();
		loadPlans();
	}, [loadStats, loadClients, loadPlans]);

	const changeTab = useCallback((id) => {
		setTab(id);
		router.replace(`${pathname}?tab=${id}`, { scroll: false });
	}, [router, pathname]);

	const openRecord = useCallback((clientId = null) => setRecordFor({ clientId }), []);
	const closeRecord = useCallback(() => setRecordFor(null), []);
	const onRecorded = useCallback(() => {
		setRecordFor(null);
		refreshAll();
	}, [refreshAll]);

	const onPlanSaved = useCallback(() => {
		setEditingPlan(null);
		loadPlans();
	}, [loadPlans]);

	const confirmDeletePayment = useCallback(async () => {
		if (!deletePayment) return;
		setDeleting(true);
		try {
			const { data } = await api.delete(`/billing/payments/${deletePayment.id}`);
			Notification(t(data?.subscriptionReverted ? 'toasts.deletedReverted' : 'toasts.deleted'), 'success');
			setDeletePayment(null);
			refreshAll();
		} catch (e) {
			Notification(apiError(e, t('errors.delete')), 'error');
		} finally {
			setDeleting(false);
		}
	}, [deletePayment, refreshAll, t]);

	const confirmDeletePlan = useCallback(async () => {
		if (!deletePlan) return;
		setDeleting(true);
		try {
			await api.delete(`/billing/plans/${deletePlan.id}`);
			Notification(t('toasts.planDeleted'), 'success');
			setDeletePlan(null);
			loadPlans();
		} catch (e) {
			Notification(apiError(e, t('errors.delete')), 'error');
		} finally {
			setDeleting(false);
		}
	}, [deletePlan, loadPlans, t]);

	const cards = useMemo(() => {
		const c = stats?.clients;
		const r = stats?.revenue;
		const ready = Boolean(stats);
		const base = [
			{
				key: 'month', icon: Wallet, tone: 'gm-chip', stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)',
				title: t('kpi.thisMonth'),
				value: ready ? `${formatMoney(r.thisMonth)} ${t('currency')}` : '—',
				spark: r?.thisMonth ?? 0, max: Math.max(r?.thisMonth ?? 0, r?.lastMonth ?? 0, 1),
				hint: ready ? t('kpi.thisMonthHint', { count: r.thisMonthCount, last: `${formatMoney(r.lastMonth)} ${t('currency')}` }) : null,
				onClick: () => changeTab('payments'),
			},
			{
				key: 'active', icon: CheckCircle2, tone: 'gm-chip-ok', stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)',
				title: t('kpi.active'), value: ready ? c.active : '—',
				spark: c?.active ?? 0, max: Math.max(c?.total ?? 0, 1),
				hint: ready ? t('kpi.activeHint', { total: c.total }) : null,
				onClick: () => changeTab('renewals'),
			},
			{
				key: 'expiring', icon: AlertTriangle, tone: 'gm-chip-warn', stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)',
				title: t('kpi.expiring'), value: ready ? c.expiringSoon : '—',
				spark: c?.expiringSoon ?? 0, max: Math.max(c?.total ?? 0, 1),
				hint: ready ? t('kpi.expiringHint') : null,
				onClick: () => changeTab('renewals'),
			},
			{
				key: 'expired', icon: XCircle, tone: 'gm-chip-secondary', stroke: 'var(--color-primary-400)', fill: 'var(--color-primary-300)',
				title: t('kpi.expired'), value: ready ? c.expired : '—',
				spark: c?.expired ?? 0, max: Math.max(c?.total ?? 0, 1),
				hint: ready ? t('kpi.expiredHint', { none: c.noSubscription }) : null,
				onClick: () => changeTab('renewals'),
			},
		];
		return base.map((card, i) => ({ ...card, seed: 0.35 + i * 0.35 }));
	}, [stats, t, changeTab]);

	const tabs = [
		{ id: 'renewals', label: t('tabs.renewals'), icon: CalendarClock, count: stats ? stats.clients.expiringSoon || null : null },
		{ id: 'payments', label: t('tabs.payments'), icon: Receipt },
		{ id: 'packages', label: t('tabs.packages'), icon: Package, count: plans.length || null },
	];

	const busy = loading.stats || loading.clients || loading.plans;

	return (
		<div className='gm-surface rs-scope app-stack relative pb-8'>
			<div className='rs-summary'>
				<IntakeHero
					icon={Wallet}
					title={t('title')}
					subtitle={t('subtitle')}
					ctaLabel={canManage ? (
						<>
							<Plus className='size-4' strokeWidth={2} aria-hidden />
							<span>{t('actions.record')}</span>
						</>
					) : null}
					onCta={canManage ? () => openRecord() : undefined}
					extra={(
						<button type='button' onClick={refreshAll} disabled={busy} className='rs-btn' aria-label={t('actions.refresh')}>
							<RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} aria-hidden />
							<span className='max-sm:hidden'>{t('actions.refresh')}</span>
						</button>
					)}
				/>
				<section className='grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4'>
					{cards.map((card, index) => <GmStatCard key={card.key} card={card} index={index} />)}
				</section>
			</div>

			{loadError && (
				<div role='alert' className='flex flex-wrap items-center gap-2 rounded-[14px] border border-rose-200/70 bg-rose-50/80 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300'>
					<XCircle className='size-4 shrink-0' />
					<span className='min-w-0 flex-1'>{loadError}</span>
					<button type='button' onClick={refreshAll} disabled={busy} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-60'>
						<RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
						{t('actions.retry')}
					</button>
				</div>
			)}

			<div role='tablist' aria-label={t('title')} className='rs-seg' style={{ flexWrap: 'wrap', height: 'auto', width: 'fit-content', maxWidth: '100%' }}>
				{tabs.map(({ id, label, icon: Icon, count }) => {
					const on = tab === id;
					return (
						<button key={id} type='button' role='tab' aria-selected={on} onClick={() => changeTab(id)} className={`rs-seg__btn${on ? ' is-on' : ''}`}>
							{on && <motion.span layoutId='billing-tab-pill' className='rs-seg__pill' transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
							<Icon className='size-3.5' aria-hidden />
							<span>{label}</span>
							{count ? <span className='rs-btn__count'>{count}</span> : null}
						</button>
					);
				})}
			</div>

			<div role='tabpanel'>
				{tab === 'renewals' && <RenewalsTab clients={clients} loading={loading.clients} onRecord={canManage ? openRecord : undefined} />}
				{tab === 'payments' && <PaymentsTab version={paymentsVersion} onDelete={setDeletePayment} />}
				{tab === 'packages' && (
					<PackagesTab
						plans={plans}
						loading={loading.plans}
						canManage={canManage}
						onAdd={() => setEditingPlan({})}
						onEdit={setEditingPlan}
						onDelete={setDeletePlan}
					/>
				)}
			</div>

			<Modal cn='gm-modal-root' panelClassName='gm-modal' open={Boolean(recordFor)} onClose={closeRecord} title={t('form.title')} maxW='max-w-2xl'>
				{recordFor && (
					<RecordPaymentForm
						key={recordFor.clientId || 'new'}
						clients={clients}
						plans={plans}
						initialClientId={recordFor.clientId}
						onSaved={onRecorded}
						onCancel={closeRecord}
					/>
				)}
			</Modal>

			<Modal cn='gm-modal-root' panelClassName='gm-modal' open={Boolean(editingPlan)} onClose={() => setEditingPlan(null)} title={editingPlan?.id ? t('packages.editTitle') : t('packages.addTitle')} maxW='max-w-lg'>
				{editingPlan && <PackageForm key={editingPlan.id || 'new'} plan={editingPlan.id ? editingPlan : null} onSaved={onPlanSaved} onCancel={() => setEditingPlan(null)} />}
			</Modal>

			<ConfirmDelete
				open={Boolean(deletePayment)}
				title={t('payments.deleteTitle')}
				subject={deletePayment ? `${deletePayment.client?.name || ''} · ${formatMoney(deletePayment.amount)} ${t('currency')} · ${formatDate(deletePayment.paidAt, locale)}` : ''}
				message={t('payments.deleteConfirm')}
				note={deletePayment?.extendsSubscription ? t('payments.deleteRevert') : null}
				loading={deleting}
				cancelLabel={t('actions.cancel')}
				confirmLabel={t('actions.delete')}
				onConfirm={confirmDeletePayment}
				onClose={() => setDeletePayment(null)}
			/>

			<ConfirmDelete
				open={Boolean(deletePlan)}
				title={t('packages.deleteTitle')}
				subject={deletePlan?.name}
				message={t('packages.deleteConfirm')}
				loading={deleting}
				cancelLabel={t('actions.cancel')}
				confirmLabel={t('actions.delete')}
				onConfirm={confirmDeletePlan}
				onClose={() => setDeletePlan(null)}
			/>
		</div>
	);
}
