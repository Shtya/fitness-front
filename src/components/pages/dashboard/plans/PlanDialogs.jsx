'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	CalendarDays, Check, Clock, Dumbbell, History, Layers, Lightbulb, NotebookPen, Search, UserPlus, Users, Zap,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Badge from '@/components/atoms/GmBadge';
import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import { Avatar, EmptyBlock, ErrorBox, MetaTile, RowSkeleton } from '@/components/atoms/GmStates';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { Notification } from '@/config/Notification';
import { PLAN_BLOCKS, formatDuration } from './PlanBuilder';

const BLOCK_LABEL = { warmup: 'builder.blocks.warmup', main: 'builder.blocks.workout', cardio: 'builder.blocks.cardio' };

const formatDateTime = (value, locale) => {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '—';
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' }).format(d);
};

/* ─────────────────────────── Preview ─────────────────────────── */
function PreviewExercise({ ex, index, cardio, t }) {
	const duration = cardio ? formatDuration(ex.durationSeconds) : null;
	const rest = ex.restSeconds ?? ex.rest;
	return (
		<li className='flex items-center gap-3 rounded-[12px] border border-(--gm-line) p-2.5' style={{ background: 'color-mix(in srgb, var(--gm-paper) 70%, transparent)' }}>
			<span className='relative size-12 shrink-0 overflow-hidden rounded-[10px] border border-(--gm-line)' style={{ background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}>
				{ex.img ? (
					<Img src={ex.img} alt='' showBlur={false} className='h-full w-full object-cover' loading='lazy' />
				) : (
					<span className='grid h-full place-items-center text-(--color-primary-300)'><Dumbbell className='size-4' /></span>
				)}
				<span
					className='absolute start-0 top-0 grid size-5 place-items-center rounded-ee-xl font-en text-[10px] font-bold text-white tabular-nums'
					style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				>
					{index + 1}
				</span>
			</span>
			<div className='min-w-0 flex-1'>
				<MultiLangText className='block truncate text-[13px] font-bold gm-ink'>{ex.name}</MultiLangText>
				<div className='mt-1 flex flex-wrap items-center gap-1' dir='ltr'>
					{!cardio && (ex.targetSets || ex.targetReps) ? (
						<span className='gm-plan__chip font-en tabular-nums'>{ex.targetSets || '—'} × {ex.targetReps || '—'}</span>
					) : null}
					{!cardio && ex.tempo ? <span className='gm-plan__chip font-en tabular-nums'>{ex.tempo}</span> : null}
					{!cardio && rest ? (
						<span className='gm-plan__chip font-en tabular-nums'><Clock className='size-3' />{rest}{t('builder.secondsShort')}</span>
					) : null}
					{duration ? (
						<span className='gm-plan__chip font-en tabular-nums'><Clock className='size-3' />{duration.value} {t(`builder.cardio.${duration.unit}`)}</span>
					) : null}
				</div>
				{ex.note ? <p dir='auto' className='mt-1 line-clamp-1 text-start text-[11.5px] gm-muted'>{ex.note}</p> : null}
			</div>
		</li>
	);
}

export function PlanPreview({ plan, locale }) {
	const t = useTranslations('workoutPlans');
	const days = plan?.program?.days || [];
	const notes = (Array.isArray(plan?.notes) ? plan.notes : []).filter(Boolean);
	const totalExercises = days.reduce((sum, d) => sum + PLAN_BLOCKS.reduce((s, b) => s + (d[b.key]?.length || 0), 0), 0);

	return (
		<div className='space-y-5'>
			<div className='grid grid-cols-2 gap-2.5 md:grid-cols-4'>
				<MetaTile icon={CalendarDays} label={t('plans.table.days')}>
					<span className='font-en tabular-nums'>{days.length}</span>
				</MetaTile>
				<MetaTile icon={Dumbbell} label={t('preview.exercises')}>
					<span className='font-en tabular-nums'>{totalExercises}</span>
				</MetaTile>
				<MetaTile icon={Users} label={t('plans.table.clientsUsing')}>
					<span className='font-en tabular-nums'>{Number(plan?.clientsUsingCount ?? 0)}</span>
				</MetaTile>
				<MetaTile icon={Zap} label={t('plans.table.status')}>
					<Badge color={plan?.isActive ? 'green' : 'slate'} dot>{plan?.isActive ? t('plans.table.active') : t('plans.table.inactive')}</Badge>
				</MetaTile>
			</div>

			{notes.length > 0 && (
				<div className='gm-answer'>
					<p className='mb-2.5 flex items-center gap-2 text-[12.5px] font-bold gm-ink'>
						<span className='gm-plan__icon size-7! rounded-[9px]!'><NotebookPen className='size-3.5' /></span>
						{t('builder.notesTitle')}
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

			{days.length ? (
				<div className='space-y-3'>
					{days.map((d, idx) => {
						const count = PLAN_BLOCKS.reduce((s, b) => s + (d[b.key]?.length || 0), 0);
						return (
							<section key={d.id || idx} className='overflow-hidden rounded-2xl border border-(--gm-line)' style={{ background: 'color-mix(in srgb, var(--gm-paper) 52%, transparent)' }}>
								<header className='flex flex-wrap items-center gap-2.5 border-b border-(--gm-line) px-4 py-3'>
									<span
										className='grid size-7 shrink-0 place-items-center rounded-[9px] font-en text-[11px] font-bold text-white tabular-nums'
										style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
									>
										{idx + 1}
									</span>
									<MultiLangText className='min-w-0 truncate text-[13.5px] font-bold gm-ink'>{d.name || d.nameOfWeek}</MultiLangText>
									<div className='ms-auto flex items-center gap-1.5'>
										{d.dayOfWeek && <Badge color='primary' icon={<CalendarDays className='size-3' />}>{t(`days.${String(d.dayOfWeek).toLowerCase()}`)}</Badge>}
										<span className='gm-plan__chip font-en tabular-nums'><Dumbbell className='size-3' />{count}</span>
									</div>
								</header>
								<div className='space-y-4 p-4'>
									{count ? PLAN_BLOCKS.filter(b => d[b.key]?.length).map(block => {
										const Icon = block.icon;
										return (
											<div key={block.id}>
												<p className='mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold' style={{ color: block.tone, background: `color-mix(in srgb, ${block.tone} 12%, transparent)` }}>
													<Icon className='size-3.5' />
													{t(BLOCK_LABEL[block.id])}
												</p>
												<ol className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
													{d[block.key].map((ex, i) => (
														<PreviewExercise key={ex.id || ex.exerciseId || i} ex={ex} index={i} cardio={block.id === 'cardio'} t={t} />
													))}
												</ol>
											</div>
										);
									}) : (
										<div className='flex items-center gap-3 rounded-[12px] border border-dashed border-(--gm-line) px-4 py-3.5'>
											<span className='gm-plan__icon size-8! rounded-[10px]!'><Lightbulb className='size-4' /></span>
											<div>
												<p className='text-[12.5px] font-semibold gm-ink-soft'>{t('preview.noExercisesYetTitle')}</p>
												<p className='text-[11.5px] gm-faint'>{t('preview.noExercisesYetHelper')}</p>
											</div>
										</div>
									)}
								</div>
							</section>
						);
					})}
				</div>
			) : (
				<EmptyBlock icon={Layers} title={t('preview.noDaysYet')} />
			)}

			<footer className='flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-(--gm-line) pt-3.5 text-[11.5px] gm-muted'>
				<span className='inline-flex items-center gap-1.5'>
					<Clock className='size-3.5' />
					{t('preview.createdAt')}
					<span className='font-en font-semibold gm-ink-soft' dir='ltr'>{formatDateTime(plan?.created_at, locale)}</span>
				</span>
				<span className='inline-flex items-center gap-1.5'>
					<History className='size-3.5' />
					{t('preview.updatedAt')}
					<span className='font-en font-semibold gm-ink-soft' dir='ltr'>{formatDateTime(plan?.updated_at, locale)}</span>
				</span>
			</footer>
		</div>
	);
}

/* ─────────────────────────── Assign ─────────────────────────── */
export function AssignForm({ plan, user, onAssigned, onCancel }) {
	const t = useTranslations('workoutPlans');
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState(null);
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState(() => new Set());
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
			setClients(list.map(c => ({ id: c.id, name: c.name || '', email: c.email || '' })));
		} catch (e) {
			setErr(e?.response ? e.response.data?.message || t('assign.loadFailed') : t('errors.serverUnreachable'));
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

	const toggle = id => setSelected(prev => {
		const next = new Set(prev);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	});

	const submit = async e => {
		e.preventDefault();
		if (!selected.size || submitting) return;
		setSubmitting(true);
		try {
			await api.post(`/plans/${plan.id}/assign`, { athleteIds: [...selected], isActive: true, confirm: 'yes' });
			Notification(t('notifications.assignedSuccess'), 'success');
			onAssigned?.();
		} catch (error) {
			Notification(error?.response?.data?.message || t('notifications.assignFailed'), 'error');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={submit} className='space-y-4'>
			<div className='gm-cred justify-start!'>
				<span className='gm-cred__icon shrink-0'><Dumbbell className='size-4' /></span>
				<div className='min-w-0'>
					<p className='gm-cred__label'>{t('plans.table.name')}</p>
					<MultiLangText className='gm-cred__value block truncate'>{plan?.name}</MultiLangText>
				</div>
			</div>

			<FloatingInput label={t('assign.searchLabel')} value={search} onChange={setSearch} icon={<Search className='size-4' />} />

			<div className='flex items-center justify-between gap-2 text-[12px]'>
				<span className='font-semibold gm-muted'>{t('assign.selectedCount', { count: selected.size })}</span>
				{selected.size > 0 && (
					<button type='button' onClick={() => setSelected(new Set())} className='font-semibold text-(--color-primary-600) hover:underline'>
						{t('actions.clear')}
					</button>
				)}
			</div>

			<div
				role='listbox'
				aria-multiselectable='true'
				aria-label={t('assign.selectUsersLabel')}
				className='max-h-72 space-y-0.5 overflow-y-auto rounded-[14px] border border-(--gm-line) p-1.5'
				style={{ background: 'color-mix(in srgb, var(--gm-paper) 52%, transparent)' }}
			>
				{loading ? (
					<RowSkeleton />
				) : err ? (
					<ErrorBox message={err} onRetry={load} retryLabel={t('actions.retry')} />
				) : visible.length ? (
					visible.map(c => {
						const on = selected.has(c.id);
						return (
							<button
								key={c.id}
								type='button'
								role='option'
								aria-selected={on}
								onClick={() => toggle(c.id)}
								className={`flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-start transition-colors ${on ? 'bg-[color-mix(in_srgb,var(--color-primary-100)_70%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)]'}`}
							>
								<Avatar name={c.name} />
								<span className='min-w-0 flex-1'>
									<span dir='auto' className='block truncate text-[13px] font-semibold gm-ink'>{c.name || '—'}</span>
									{c.email && <span className='block truncate font-en text-[11.5px] gm-muted' dir='ltr'>{c.email}</span>}
								</span>
								<span
									className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${on ? 'border-transparent text-white' : 'border-(--gm-line)'}`}
									style={on ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' } : undefined}
								>
									{on && <Check className='size-3.5' strokeWidth={2.5} />}
								</span>
							</button>
						);
					})
				) : (
					<EmptyBlock icon={Users} title={clients.length ? t('assign.noMatches') : t('assign.noClients')} />
				)}
			</div>

			<div className='gm-modal-foot'>
				<Button color='neutral' name={t('actions.cancel')} onClick={onCancel} disabled={submitting} />
				<Button
					color='primary'
					type='submit'
					name={submitting ? t('assign.assigning') : t('actions.assign')}
					loading={submitting}
					disabled={submitting || !selected.size}
					icon={<UserPlus className='size-4' />}
				/>
			</div>
		</form>
	);
}

/* ─────────────────────────── Assignees ─────────────────────────── */
export function PlanUsers({ plan, users, loading, error, onRetry, onAssign }) {
	const t = useTranslations('workoutPlans');
	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div className='min-w-0'>
					<MultiLangText className='block truncate text-[14px] font-bold gm-ink'>{plan?.name}</MultiLangText>
					<p className='mt-0.5 text-[12px] gm-muted'>{t('plans.usersModal.count', { count: users.length })}</p>
				</div>
				<button type='button' onClick={onAssign} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5'>
					<UserPlus className='size-3.5' />
					{t('actions.assign')}
				</button>
			</div>

			{loading ? (
				<div className='space-y-1'><RowSkeleton rows={3} /></div>
			) : error ? (
				<ErrorBox message={error} onRetry={onRetry} retryLabel={t('actions.retry')} />
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
								{u.subscriptionActive ? t('plans.usersModal.subscriptionActive') : t('plans.usersModal.subscriptionInactive')}
							</Badge>
						</li>
					))}
				</ul>
			) : (
				<EmptyBlock icon={Users} title={t('plans.usersModal.emptyTitle')} desc={t('plans.usersModal.emptyDesc')} />
			)}
		</div>
	);
}
