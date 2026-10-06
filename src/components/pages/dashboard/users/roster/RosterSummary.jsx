'use client';

import { useTranslations } from 'next-intl';
import { ArrowUpRight, UserCheck, UserCircle, UserCog, UserPlus, Users } from 'lucide-react';
import GmStatCard from '@/components/molecules/GmStatCard';

const num = (v) => {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Users page header: title + primary action, and (admins only) live account metrics.
 */
export default function RosterSummary({ stats, showMetrics, canCreate, onCreate, onReviewPending }) {
	const t = useTranslations('users');
	const total = num(stats.totalUsers);
	const pending = num(stats.pendingUsers);
	const ofTotal = (value) => t('stats.ofTotal', { value, total });

	const cards = [
		{
			key: 'total',
			title: t('stats.totalUsers'),
			value: total,
			icon: Users,
			hint: t('stats.allAccounts'),
			tone: 'gm-chip',
			stroke: 'var(--color-primary-500)',
			fill: 'var(--color-primary-400)',
			seed: 0.4,
			max: Math.max(total, 1),
			onClick: pending > 0 ? onReviewPending : undefined,
		},
		{
			key: 'active',
			title: t('stats.active'),
			value: num(stats.activeUsers),
			icon: UserCheck,
			hint: ofTotal(num(stats.activeUsers)),
			tone: 'gm-chip-ok',
			stroke: 'var(--gm-ok)',
			fill: 'var(--gm-ok)',
			seed: 0.9,
			max: Math.max(total, 1),
		},
		{
			key: 'coaches',
			title: t('stats.coaches'),
			value: num(stats.coaches),
			icon: UserCog,
			hint: ofTotal(num(stats.coaches)),
			tone: 'gm-chip-secondary',
			stroke: 'var(--color-secondary-500)',
			fill: 'var(--color-secondary-400)',
			seed: 1.4,
			max: Math.max(total, 1),
		},
		{
			key: 'clients',
			title: t('stats.clients'),
			value: num(stats.clients),
			icon: UserCircle,
			hint: ofTotal(num(stats.clients)),
			tone: 'gm-chip-warn',
			stroke: 'var(--gm-warn)',
			fill: 'var(--gm-warn)',
			seed: 1.9,
			max: Math.max(total, 1),
		},
	];

	return (
		<div className='rs-summary'>
			<header className='rs-hero'>
				<span className='rs-hero__mark' aria-hidden>
					<Users strokeWidth={1.7} />
				</span>
				<div className='rs-hero__text'>
					<h1 className='rs-hero__title'>{t('header.title')}</h1>
					<p className='rs-hero__sub'>{t('header.subtitle')}</p>
				</div>
				{canCreate && (
					<button type='button' className='rs-cta' onClick={onCreate}>
						<UserPlus className='size-4' strokeWidth={2} aria-hidden />
						<span>{t('header.createNewUser')}</span>
					</button>
				)}
				{showMetrics && pending > 0 && (
					<button type='button' className='rs-review' onClick={onReviewPending}>
						{t('roster.reviewPending', { count: pending })}
						<ArrowUpRight className='size-3.5' strokeWidth={2.2} aria-hidden />
					</button>
				)}
			</header>

			{showMetrics && (
				<section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
					{cards.map((card, index) => (
						<GmStatCard key={card.key} card={card} index={index} />
					))}
				</section>
			)}
		</div>
	);
}
