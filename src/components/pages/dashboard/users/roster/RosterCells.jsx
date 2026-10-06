'use client';

import { useTranslations } from 'next-intl';
import { Crown, Dumbbell, Gem, Mars, Shield, User, UserCog, Utensils, Venus } from 'lucide-react';
import { Link } from '@/i18n/navigation';

const DAY_MS = 24 * 60 * 60 * 1000;

const ROLE_ICON = { admin: Shield, coach: UserCog, client: User };
const TIER_ICON = { gold: Crown, platinum: Gem };

const roleKey = (role) => {
	const r = String(role || '').toLowerCase();
	return ROLE_ICON[r] ? r : 'client';
};

const hasValue = (v) => v != null && v !== '' && v !== '-';

export function memberInitials(name = '') {
	const parts = String(name).trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Remaining share of the subscription window, used for the status time meter.
 * Returns null when the row has no usable end date.
 */
export function subscriptionWindow(start, end, now = Date.now()) {
	if (!hasValue(end)) return null;
	const endMs = new Date(end).getTime();
	if (Number.isNaN(endMs)) return null;

	const daysLeft = Math.ceil((endMs - now) / DAY_MS);
	const startMs = hasValue(start) ? new Date(start).getTime() : NaN;
	const span = Number.isNaN(startMs) ? NaN : endMs - startMs;
	const ratio = span > 0 ? Math.min(1, Math.max(0, (endMs - now) / span)) : daysLeft > 0 ? 1 : 0;

	const tone = daysLeft < 0 || ratio < 0.1 ? 'danger' : ratio < 0.3 ? 'warn' : 'ok';
	return { daysLeft, ratio, tone };
}

export function MemberCell({ row }) {
	const role = roleKey(row.role);
	const tip = [row.name, row.email, row.joinDate].filter(Boolean).join(' · ');

	return (
		<div className='rs-member' title={tip}>
			<span className={`rs-avatar rs-avatar--${role}`} aria-hidden>
				{memberInitials(row.name)}
			</span>
			<span className='rs-member__text'>
				<Link href={`/dashboard/users/${row.id}`} className='rs-member__name'>
					{row.name || '—'}
				</Link>
				{row.email && <span className='rs-member__email'>{row.email}</span>}
			</span>
		</div>
	);
}

export function RoleTag({ role }) {
	const t = useTranslations('users');
	const key = roleKey(role);
	const Icon = ROLE_ICON[key];

	return (
		<span className={`rs-tag rs-tag--${key}`}>
			<Icon className='size-3.5' strokeWidth={2} aria-hidden />
			{t(`roles.${key}`)}
		</span>
	);
}

export function TierTag({ membership }) {
	const t = useTranslations('users');
	const tier = String(membership || '').toLowerCase();
	if (!['basic', 'gold', 'platinum'].includes(tier)) return <span className='rs-none'>—</span>;

	const Icon = TIER_ICON[tier];
	return (
		<span className={`rs-tag rs-tag--${tier}`}>
			{Icon && <Icon className='size-3.5' strokeWidth={2} aria-hidden />}
			{t(`membership.${tier}`)}
		</span>
	);
}

export function ProgramCell({ workout, meal }) {
	const t = useTranslations('users');
	const lines = [
		{ key: 'workout', Icon: Dumbbell, value: workout, label: t('table.exercisePlan') },
		{ key: 'meal', Icon: Utensils, value: meal, label: t('table.mealPlan') },
	];

	return (
		<div className='rs-program'>
			{lines.map(({ key, Icon, value, label }) => {
				const assigned = hasValue(value);
				const text = assigned ? value : t('roster.noProgram');
				return (
					<span key={key} className={`rs-program__line${assigned ? '' : ' is-empty'}`} title={`${label}: ${text}`}>
						<Icon className='size-3.5' strokeWidth={1.9} aria-hidden />
						<span>{text}</span>
					</span>
				);
			})}
		</div>
	);
}

export function CoachCell({ name }) {
	if (!name) return <span className='rs-none'>—</span>;
	return (
		<span className='rs-coach' title={name}>
			<span className='rs-avatar rs-avatar--coach rs-avatar--sm' aria-hidden>
				{memberInitials(name)}
			</span>
			<span>{name}</span>
		</span>
	);
}

export function GenderCell({ gender }) {
	const t = useTranslations('users');
	const g = String(gender || '').toLowerCase();
	if (g !== 'male' && g !== 'female') return <span className='rs-none'>—</span>;

	const Icon = g === 'male' ? Mars : Venus;
	return (
		<span className='rs-gender'>
			<Icon className='size-3.5' strokeWidth={2} aria-hidden />
			{t(`gender.${g}`)}
		</span>
	);
}

export function StatusCell({ row }) {
	const t = useTranslations('users');
	const account = String(row.status || 'pending').toLowerCase();
	const term = account === 'active' ? subscriptionWindow(row.subscriptionStart, row.subscriptionEnd) : null;
	const expired = term != null && term.daysLeft < 0;

	let tone = 'ok';
	let label = t('status.active');
	if (account === 'pending') {
		tone = 'warn';
		label = t('status.pending');
	} else if (account === 'suspended') {
		tone = 'danger';
		label = t('status.suspended');
	} else if (expired) {
		tone = 'danger';
		label = t('common.expired');
	}

	const showMeter = term != null && !expired;

	return (
		<div className='rs-status'>
			<span className={`rs-badge rs-badge--${tone}`}>
				<span className='rs-badge__dot' aria-hidden />
				{label}
			</span>
			{showMeter && (
				<span className={`rs-time rs-time--${term.tone}`} title={t('common.daysLeft', { days: term.daysLeft })}>
					<span className='rs-time__track' aria-hidden>
						<span className='rs-time__fill' style={{ width: `${Math.max(4, Math.round(term.ratio * 100))}%` }} />
					</span>
					<span className='rs-time__text'>{t('roster.daysLeftShort', { days: term.daysLeft })}</span>
				</span>
			)}
		</div>
	);
}
