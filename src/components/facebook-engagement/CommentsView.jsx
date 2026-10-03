'use client';

import CommentsTable from './CommentsTable';
import { useFbAccounts } from './fb-hooks';
import { useFbT } from './fb-i18n';
import { Panel } from './fb-ui';

export default function CommentsView() {
	const t = useFbT();
	const accounts = useFbAccounts();
	return (
		<Panel title={t('allComments')} description={t('allCommentsHint')}>
			<CommentsTable accounts={accounts.data ?? []} />
		</Panel>
	);
}
