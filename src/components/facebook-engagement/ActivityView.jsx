'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import ActivityFeed from './ActivityFeed';
import { useFbT } from './fb-i18n';
import { Panel } from './fb-ui';

const LEVELS = ['', 'success', 'error', 'warning', 'info'];

export default function ActivityView() {
	const t = useFbT();
	const [level, setLevel] = useState('');
	const [page, setPage] = useState(1);

	return (
		<Panel
			title={t('activityLog')}
			description={t('activityLogHint')}
			bodyClassName="p-0"
			actions={
				<div role="group" aria-label={t('filterLevel')} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
					{LEVELS.map((value) => (
						<button
							key={value || 'all'}
							type="button"
							aria-pressed={level === value}
							onClick={() => {
								setLevel(value);
								setPage(1);
							}}
							className={cn(
								'rounded-lg px-3 py-1 text-xs font-medium transition',
								level === value
									? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
									: 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
							)}
						>
							{t(value ? `level_${value}` : 'allLevels')}
						</button>
					))}
				</div>
			}
		>
			<ActivityFeed
				params={{ page, limit: 25, ...(level && { level }) }}
				onPageChange={setPage}
				showCampaignLink
			/>
		</Panel>
	);
}
