'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	CalendarCog, CalendarDays, Check, ChefHat, ChevronDown, Clock, Flame, History, NotebookPen, Pill, Replace, Search,
	UserPlus, Users, UtensilsCrossed,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Badge from '@/components/atoms/GmBadge';
import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import MultiLangText from '@/components/atoms/MultiLangText';
import { Avatar, EmptyBlock, ErrorBox, MetaTile, RowSkeleton } from '@/components/atoms/GmStates';
import { Notification } from '@/config/Notification';
import { DAY_KEYS, dayMealsOf, mealKcal, mealsKcal } from './mealPlanModel';

const GRADIENT = { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' };
const fmtNum = n => Math.round(Number(n) || 0).toLocaleString('en-US');

const formatDateTime = (value, locale) => {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '—';
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' }).format(d);
};

const mealsSignature = meals => JSON.stringify((meals || []).map(m => [
	m.title, m.time,
	(m.items || []).map(i => [i.name, i.quantity, i.unit, i.calories, (i.alternatives || []).map(a => [a.name, a.quantity, a.unit, a.calories])]),
	(m.supplements || []).map(s => [s.name, s.time, s.bestWith]),
]));

const itemAlternatives = it => (Array.isArray(it.alternatives) && it.alternatives.length
	? it.alternatives
	: [{ name: it.alternativeName, quantity: it.alternativeQuantity, unit: it.alternativeUnit, calories: it.alternativeCalories }]
).filter(a => String(a?.name || '').trim());

const shortTime = v => String(v || '').slice(0, 5);

/* ─────────────────────────── Preview ─────────────────────────── */
function QtyChip({ quantity, unit, t }) {
	if (quantity == null || quantity === '') return null;
	return <span className='gm-plan__chip font-en tabular-nums'>{quantity} {t(`unit.${unit || 'g'}`)}</span>;
}

function PreviewMeal({ meal, index, t }) {
	const items = meal.items || [];
	const supplements = meal.supplements || [];
	return (
		<article className='rounded-[14px] border border-(--gm-line) p-3' style={{ background: 'color-mix(in srgb, var(--gm-paper) 72%, transparent)' }}>
			<header className='mb-2.5 flex flex-wrap items-center gap-2'>
				<span className='grid size-7 shrink-0 place-items-center rounded-[9px] font-en text-[11px] font-bold text-white tabular-nums' style={GRADIENT}>{index + 1}</span>
				<MultiLangText className='min-w-0 flex-1 truncate text-[13.5px] font-bold gm-ink'>{meal.title || t('form.meal_n', { n: index + 1 })}</MultiLangText>
				{meal.time && <span className='gm-plan__chip font-en tabular-nums' dir='ltr'><Clock className='size-3' />{shortTime(meal.time)}</span>}
				<span className='gm-plan__chip font-en tabular-nums text-(--color-primary-700)!'><Flame className='size-3' />{fmtNum(mealKcal(meal))} {t('form.kcal_short')}</span>
			</header>

			{items.length > 0 && (
				<ul className='divide-y divide-(--gm-line)'>
					{items.map((it, ii) => (
						<li key={it.id || ii} className='py-1.5 first:pt-0 last:pb-0'>
							<div className='flex items-center gap-2'>
								<span className='size-1.5 shrink-0 rounded-full bg-(--color-primary-400)' />
								<MultiLangText className='min-w-0 flex-1 truncate text-[12.5px] font-semibold gm-ink-soft'>{it.name}</MultiLangText>
								{it.itemType === 'recipe' && <Badge color='blue' icon={<ChefHat className='size-3' />}>{t('recipes.label')}</Badge>}
								<QtyChip quantity={it.quantity} unit={it.unit} t={t} />
								<span className='w-16 shrink-0 text-end font-en text-[12px] font-semibold tabular-nums gm-muted'>{fmtNum(it.calories)} {t('form.kcal_short')}</span>
							</div>
							{itemAlternatives(it).map((alt, ai) => (
								<div key={ai} className='mt-1 flex items-center gap-2 ps-3.5 text-[11.5px]' style={{ color: 'var(--gm-warn)' }}>
									<Replace className='size-3 shrink-0' />
									<span className='shrink-0 font-semibold'>{t('form.alternative_item')}:</span>
									<MultiLangText className='min-w-0 flex-1 truncate'>{alt.name}</MultiLangText>
									<QtyChip quantity={alt.quantity} unit={alt.unit} t={t} />
									{alt.calories != null && <span className='w-16 shrink-0 text-end font-en tabular-nums'>{fmtNum(alt.calories)} {t('form.kcal_short')}</span>}
								</div>
							))}
						</li>
					))}
				</ul>
			)}

			{supplements.length > 0 && (
				<div className='mt-2.5 space-y-1 border-t border-(--gm-line) pt-2.5'>
					{supplements.map((s, si) => (
						<div key={s.id || si} className='flex flex-wrap items-center gap-2 text-[12px]'>
							<span className='grid size-6 shrink-0 place-items-center rounded-[7px]' style={{ color: 'var(--color-secondary-600)', background: 'color-mix(in srgb, var(--color-secondary-500) 12%, transparent)' }}>
								<Pill className='size-3' />
							</span>
							<MultiLangText className='min-w-0 flex-1 truncate font-semibold gm-ink-soft'>{s.name}</MultiLangText>
							{s.time && <span className='gm-plan__chip font-en tabular-nums' dir='ltr'><Clock className='size-3' />{shortTime(s.time)}</span>}
							{s.bestWith && <span className='gm-plan__chip'>{t('details.best_with')}: <MultiLangText>{s.bestWith}</MultiLangText></span>}
						</div>
					))}
				</div>
			)}
		</article>
	);
}

function DayGroup({ group, open, onToggle, t }) {
	const everyDay = group.days.length === DAY_KEYS.length;
	return (
		<section className='overflow-hidden rounded-2xl border border-(--gm-line)' style={{ background: 'color-mix(in srgb, var(--gm-paper) 52%, transparent)' }}>
			<button
				type='button'
				onClick={onToggle}
				aria-expanded={open}
				className='flex w-full flex-wrap items-center gap-2 px-3.5 py-3 text-start transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)] sm:px-4'
			>
				<span className='gm-plan__icon size-8! shrink-0 rounded-[10px]!'><CalendarDays className='size-4' /></span>
				<div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
					{everyDay
						? <Badge color='primary'>{t('preview.every_day')}</Badge>
						: group.days.map(d => <Badge key={d} color='slate'>{t(`days.${d}`)}</Badge>)}
				</div>
				<span className='gm-plan__chip font-en tabular-nums'><UtensilsCrossed className='size-3' />{t('form.meals_count', { count: group.meals.length })}</span>
				<span className='gm-plan__chip font-en tabular-nums text-(--color-primary-700)!'><Flame className='size-3' />{fmtNum(mealsKcal(group.meals))} {t('form.kcal_per_day')}</span>
				<ChevronDown className={`size-4 shrink-0 gm-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
						className='overflow-hidden'
					>
						<div className='grid grid-cols-1 gap-2.5 border-t border-(--gm-line) p-3 sm:p-4 lg:grid-cols-2'>
							{group.meals.map((m, mi) => <PreviewMeal key={m.id || mi} meal={m} index={mi} t={t} />)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}

export function MealPlanPreview({ plan, locale }) {
	const t = useTranslations('nutrition');
	const [openGroups, setOpenGroups] = useState({ 0: true });

	const groups = useMemo(() => {
		const map = new Map();
		for (const d of plan?.days || []) {
			const meals = dayMealsOf(d);
			if (!meals.length) continue;
			const sig = mealsSignature(meals);
			if (!map.has(sig)) map.set(sig, { days: [], meals });
			map.get(sig).days.push(String(d.day || '').toLowerCase());
		}
		return [...map.values()];
	}, [plan?.days]);

	const notes = String(plan?.notes || '').split('\n').map(s => s.trim()).filter(Boolean);
	const dayCount = groups.reduce((sum, g) => sum + g.days.length, 0);
	const avgKcal = dayCount ? groups.reduce((sum, g) => sum + mealsKcal(g.meals) * g.days.length, 0) / dayCount : 0;
	const mealCounts = groups.map(g => g.meals.length);
	const minMeals = mealCounts.length ? Math.min(...mealCounts) : 0;
	const maxMeals = mealCounts.length ? Math.max(...mealCounts) : 0;
	const loadingDetails = !Array.isArray(plan?.days);

	return (
		<div className='space-y-5'>
			{plan?.desc && <p dir='auto' className='text-start text-[13px] leading-relaxed gm-ink-soft'>{plan.desc}</p>}

			<div className='grid grid-cols-2 gap-2.5 md:grid-cols-4'>
				<MetaTile icon={UtensilsCrossed} label={t('preview.meals_per_day')}>
					<span className='font-en tabular-nums'>{minMeals === maxMeals ? minMeals : `${minMeals}–${maxMeals}`}</span>
				</MetaTile>
				<MetaTile icon={Flame} label={t('preview.avg_kcal')}>
					<span className='font-en tabular-nums'>{fmtNum(avgKcal)}</span>
				</MetaTile>
				<MetaTile icon={Users} label={t('table.clientsUsing')}>
					<span className='font-en tabular-nums'>{Number(plan?.clientsUsingCount ?? 0)}</span>
				</MetaTile>
				<MetaTile icon={CalendarCog} label={t('table.schedule')}>
					{groups.length > 1 ? t('table.custom_days') : t('table.same_every_day')}
				</MetaTile>
			</div>

			{notes.length > 0 && (
				<div className='gm-answer'>
					<p className='mb-2.5 flex items-center gap-2 text-[12.5px] font-bold gm-ink'>
						<span className='gm-plan__icon size-7! rounded-[9px]!'><NotebookPen className='size-3.5' /></span>
						{t('details.notes')}
					</p>
					<ul className='space-y-1.5'>
						{notes.map((n, i) => (
							<li key={i} className='flex items-start gap-2.5 text-[13px] leading-relaxed gm-ink-soft'>
								<span className='mt-2 size-1.5 shrink-0 rounded-full bg-(--color-primary-400)' />
								<span dir='auto' className='min-w-0 flex-1 text-start wrap-break-word'>{n}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{loadingDetails ? (
				<div className='space-y-2'>
					{Array.from({ length: 2 }).map((_, i) => <span key={i} className='gm-skel block h-14 w-full rounded-2xl!' />)}
				</div>
			) : groups.length ? (
				<div className='space-y-3'>
					{groups.map((g, i) => (
						<DayGroup key={g.days.join('-')} group={g} open={!!openGroups[i]} onToggle={() => setOpenGroups(s => ({ ...s, [i]: !s[i] }))} t={t} />
					))}
				</div>
			) : (
				<EmptyBlock icon={UtensilsCrossed} title={t('preview.no_meals')} />
			)}

			<footer className='flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-(--gm-line) pt-3.5 text-[11.5px] gm-muted'>
				<span className='inline-flex items-center gap-1.5'>
					<Clock className='size-3.5' />
					{t('preview.created_at')}
					<span className='font-en font-semibold gm-ink-soft' dir='ltr'>{formatDateTime(plan?.created_at, locale)}</span>
				</span>
				<span className='inline-flex items-center gap-1.5'>
					<History className='size-3.5' />
					{t('preview.updated_at')}
					<span className='font-en font-semibold gm-ink-soft' dir='ltr'>{formatDateTime(plan?.updated_at, locale)}</span>
				</span>
			</footer>
		</div>
	);
}

/* ─────────────────────────── Assign ─────────────────────────── */
export function AssignMealPlan({ plan, user, onAssigned, onCancel }) {
	const t = useTranslations('nutrition');
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const load = useCallback(async () => {
		if (!user?.id) return;
		setLoading(true);
		setErr(null);
		try {
			let list = [];
			if (user.role === 'admin') {
				const res = await api.get(`/auth/admin/${user.id}/clients`, { params: { page: 1, limit: 100, search: '' } });
				list = res.data?.items || res.data?.users || [];
			} else if (user.role === 'coach') {
				const res = await api.get(`/auth/coaches/${user.id}/clients`, { params: { limit: 1000 } });
				list = res.data?.users || [];
			}
			setClients(list.map(c => ({ id: String(c.id), name: c.name || '', email: c.email || '' })));
		} catch (e) {
			setErr(e?.response ? e.response.data?.message || t('assign.load_failed') : t('errors.server_unreachable'));
		} finally {
			setLoading(false);
		}
	}, [user?.id, user?.role, t]);

	useEffect(() => { load(); }, [load]);

	const visible = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return clients;
		return clients.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
	}, [clients, search]);

	const submit = async e => {
		e.preventDefault();
		if (!selected || submitting) return;
		setSubmitting(true);
		try {
			await api.post(`/nutrition/meal-plans/${plan.id}/assign`, { userId: selected });
			Notification(t('toast.assigned'), 'success');
			onAssigned?.();
		} catch (error) {
			Notification(error?.response?.data?.message || t('toast.assign_failed'), 'error');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={submit} className='space-y-4'>
			<div className='gm-cred justify-start!'>
				<span className='gm-cred__icon shrink-0'><UtensilsCrossed className='size-4' /></span>
				<div className='min-w-0'>
					<p className='gm-cred__label'>{t('table.name')}</p>
					<MultiLangText className='gm-cred__value block truncate'>{plan?.name}</MultiLangText>
				</div>
			</div>

			<p className='text-[12px] leading-relaxed gm-muted'>{t('assign.replace_hint')}</p>

			<FloatingInput label={t('assign.search_label')} value={search} onChange={setSearch} icon={<Search className='size-4' />} />

			<div
				role='radiogroup'
				aria-label={t('modals.assign_select_client')}
				className='max-h-72 space-y-0.5 overflow-y-auto rounded-[14px] border border-(--gm-line) p-1.5'
				style={{ background: 'color-mix(in srgb, var(--gm-paper) 52%, transparent)' }}
			>
				{loading ? (
					<RowSkeleton />
				) : err ? (
					<ErrorBox message={err} onRetry={load} retryLabel={t('btn.retry')} />
				) : visible.length ? (
					visible.map(c => {
						const on = selected === c.id;
						return (
							<div
								key={c.id}
								role='radio'
								tabIndex={0}
								aria-checked={on}
								onClick={() => setSelected(c.id)}
								onKeyDown={e => {
									if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setSelected(c.id); }
								}}
								className={`flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-2.5 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--color-primary-300) ${on ? 'bg-[color-mix(in_srgb,var(--color-primary-100)_70%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)]'}`}
							>
								<Avatar name={c.name} />
								<span className='min-w-0 flex-1'>
									<span dir='auto' className='block truncate text-[13px] font-semibold gm-ink'>{c.name || '—'}</span>
									{c.email && <span className='block truncate font-en text-[11.5px] gm-muted' dir='ltr'>{c.email}</span>}
								</span>
								<span
									className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${on ? 'border-transparent text-white' : 'border-(--gm-line)'}`}
									style={on ? GRADIENT : undefined}
								>
									{on && <Check className='size-3.5' strokeWidth={2.5} />}
								</span>
							</div>
						);
					})
				) : (
					<EmptyBlock icon={Users} title={clients.length ? t('assign.no_matches') : t('list.no_clients')} />
				)}
			</div>

			<div className='gm-modal-foot'>
				<Button color='neutral' name={t('btn.cancel')} onClick={onCancel} disabled={submitting} />
				<Button
					color='primary'
					type='submit'
					name={submitting ? t('btn.assigning') : t('btn.assign_plan')}
					loading={submitting}
					disabled={submitting || !selected}
					icon={<UserPlus className='size-4' />}
				/>
			</div>
		</form>
	);
}

/* ─────────────────────────── Assignees ─────────────────────────── */
export function MealPlanUsers({ plan, users, loading, error, onRetry, onAssign }) {
	const t = useTranslations('nutrition');
	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div className='min-w-0'>
					<MultiLangText className='block truncate text-[14px] font-bold gm-ink'>{plan?.name}</MultiLangText>
					<p className='mt-0.5 text-[12px] gm-muted'>{t('modals.plan_users_count', { count: users.length })}</p>
				</div>
				<button type='button' onClick={onAssign} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5'>
					<UserPlus className='size-3.5' />
					{t('btn.assign')}
				</button>
			</div>

			{loading ? (
				<div className='space-y-1'><RowSkeleton rows={3} /></div>
			) : error ? (
				<ErrorBox message={error} onRetry={onRetry} retryLabel={t('btn.retry')} />
			) : users.length ? (
				<ul className='space-y-2'>
					{users.map(u => (
						<li key={u.id} className='flex items-center gap-3 rounded-[14px] border border-(--gm-line) px-3 py-2.5' style={{ background: 'color-mix(in srgb, var(--gm-paper) 70%, transparent)' }}>
							<Avatar name={u.name} />
							<div className='min-w-0 flex-1'>
								<p dir='auto' className='truncate text-start text-[13px] font-semibold gm-ink'>{u.name || '—'}</p>
								{u.email && <p className='truncate font-en text-[11.5px] gm-muted' dir='ltr'>{u.email}</p>}
							</div>
							<Badge color={u.subscriptionActive ? 'green' : 'red'} dot>
								{u.subscriptionActive ? t('modals.subscription_active') : t('modals.subscription_inactive')}
							</Badge>
						</li>
					))}
				</ul>
			) : (
				<EmptyBlock icon={Users} title={t('modals.no_plan_users')} desc={t('modals.no_plan_users_desc')} />
			)}
		</div>
	);
}
