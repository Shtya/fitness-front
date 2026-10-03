'use client';

import { CheckCircle2, Clock, Megaphone, MessageSquarePlus, Plug, Send, Users, XCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ActivityList } from './ActivityFeed';
import { FB_BASE } from './FbShell';
import { useFbOverview } from './fb-hooks';
import { useFbT } from './fb-i18n';
import {
	EmptyState,
	ErrorState,
	outlineButtonClass,
	PageAvatar,
	Panel,
	ProgressBar,
	SkeletonList,
	StatCard,
	StatusBadge,
	useFbFormat,
} from './fb-ui';

function ChartTooltip({ active, payload, label, t }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
			<p className="mb-1 font-medium text-slate-900 dark:text-white">{label}</p>
			{payload.map((entry) => (
				<p key={entry.dataKey} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
					<span className="size-2 rounded-full" style={{ background: entry.color }} aria-hidden />
					{t(`status_${entry.dataKey}`)}: <span className="font-semibold tabular-nums">{entry.value}</span>
				</p>
			))}
		</div>
	);
}

function Onboarding() {
	const t = useFbT();
	const steps = [
		{ icon: Plug, title: t('onboard1'), text: t('onboard1Hint') },
		{ icon: Megaphone, title: t('onboard2'), text: t('onboard2Hint') },
		{ icon: MessageSquarePlus, title: t('onboard3'), text: t('onboard3Hint') },
		{ icon: Send, title: t('onboard4'), text: t('onboard4Hint') },
	];
	return (
		<Panel>
			<div className="flex flex-col gap-6 lg:flex-row lg:items-center">
				<div className="max-w-md">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('welcomeTitle')}</h2>
					<p className="mt-1 text-[13px] leading-6 text-slate-500 dark:text-slate-400">{t('welcomeHint')}</p>
					<Button asChild className="mt-4">
						<Link href={`${FB_BASE}/accounts`}>
							<Plug aria-hidden />
							{t('connectPage')}
						</Link>
					</Button>
				</div>
				<ol className="grid flex-1 gap-3 sm:grid-cols-2">
					{steps.map((step, index) => (
						<li key={step.title} className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
							<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[var(--color-primary-600)] shadow-sm dark:bg-slate-900">
								<step.icon className="size-4" aria-hidden />
							</span>
							<span>
								<span className="block text-[13px] font-semibold text-slate-900 dark:text-white">
									{index + 1}. {step.title}
								</span>
								<span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{step.text}</span>
							</span>
						</li>
					))}
				</ol>
			</div>
		</Panel>
	);
}

export default function OverviewView() {
	const t = useFbT();
	const locale = useLocale();
	const format = useFbFormat();
	const query = useFbOverview();

	if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
	const data = query.data;
	const loading = query.isLoading;
	const comments = data?.comments ?? {};
	const chartData = (data?.daily ?? []).map((row) => ({
		...row,
		label: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${row.day}T00:00:00`)),
	}));
	const hasChartData = chartData.some((row) => row.published || row.failed);

	return (
		<div className="space-y-5">
			{!loading && data && data.pages === 0 && <Onboarding />}

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<StatCard
					icon={Users}
					label={t('connectedPages')}
					value={format.number(data?.pages)}
					hint={data ? t('publishableN', { n: data.publishablePages }) : undefined}
					loading={loading}
				/>
				<StatCard icon={Megaphone} label={t('activeCampaigns')} value={format.number(data?.campaigns?.active)} hint={data ? t('totalN', { n: data.campaigns.total }) : undefined} tone="blue" loading={loading} />
				<StatCard icon={CheckCircle2} label={t('publishedComments')} value={format.number(comments.published)} tone="emerald" loading={loading} />
				<StatCard icon={Clock} label={t('pendingComments')} value={format.number((comments.pending || 0) + (comments.processing || 0))} tone="amber" loading={loading} />
				<StatCard icon={XCircle} label={t('failedComments')} value={format.number(comments.failed)} tone="rose" loading={loading} />
			</div>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
				<div className="min-w-0 space-y-5">
					<Panel title={t('last14Days')} description={t('last14DaysHint')}>
						{loading ? (
							<SkeletonList rows={1} className="[&>*]:h-56" />
						) : hasChartData ? (
							<div className="h-56" dir="ltr">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={chartData} barGap={2} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
										<CartesianGrid vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
										<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
										<YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
										<Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip t={t} />} />
										<Bar dataKey="published" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} />
										<Bar dataKey="failed" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={18} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						) : (
							<EmptyState title={t('noChartData')} description={t('noChartDataHint')} className="py-10" />
						)}
					</Panel>

					<Panel
						title={t('activeCampaigns')}
						actions={
							<Button asChild size="sm" variant="outline" className={outlineButtonClass}>
								<Link href={`${FB_BASE}/campaigns`}>{t('viewAll')}</Link>
							</Button>
						}
						bodyClassName="p-0"
					>
						{loading ? (
							<SkeletonList rows={2} className="p-5" />
						) : data.activeCampaigns.length === 0 ? (
							<EmptyState icon={Megaphone} title={t('noActiveCampaigns')} description={t('noActiveCampaignsHint')} className="py-8" />
						) : (
							<ul className="divide-y divide-slate-100 dark:divide-slate-800">
								{data.activeCampaigns.map((campaign) => (
									<li key={campaign.id}>
										<Link
											href={`${FB_BASE}/campaigns/${campaign.id}`}
											className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
										>
											<PageAvatar account={campaign.account} />
											<span className="min-w-0 flex-1">
												<span className="flex items-center gap-2">
													<span className="truncate text-sm font-medium text-slate-900 dark:text-white" dir="auto">{campaign.name}</span>
													<StatusBadge status={campaign.status} />
												</span>
												<ProgressBar
													className="mt-2"
													published={campaign.publishedCount}
													failed={campaign.failedCount}
													pending={campaign.pendingCount}
													total={campaign.totalCount}
												/>
											</span>
											<span className="shrink-0 text-xs text-slate-500 tabular-nums dark:text-slate-400">
												{campaign.publishedCount + campaign.failedCount}/{campaign.totalCount}
											</span>
										</Link>
									</li>
								))}
							</ul>
						)}
					</Panel>
				</div>

				<Panel
					title={t('recentActivity')}
					actions={
						<Button asChild size="sm" variant="outline" className={outlineButtonClass}>
							<Link href={`${FB_BASE}/activity`}>{t('viewAll')}</Link>
						</Button>
					}
					bodyClassName="p-0"
					className="lg:self-start"
				>
					{loading ? (
						<SkeletonList rows={4} className="p-5" />
					) : data.recentActivity.length ? (
						<ActivityList items={data.recentActivity} compact showCampaignLink />
					) : (
						<EmptyState title={t('noActivity')} className="py-8" />
					)}
				</Panel>
			</div>
		</div>
	);
}
