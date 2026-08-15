import { Suspense } from 'react';
import EmailMemoWorkspace from './EmailMemoWorkspace';

export const metadata = {
	title: 'Email Memo',
};

export default function EmailMemoPage() {
	return (
		<div className="h-full min-h-0 overflow-auto">
			<Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 m-4" />}>
				<EmailMemoWorkspace />
			</Suspense>
		</div>
	);
}
