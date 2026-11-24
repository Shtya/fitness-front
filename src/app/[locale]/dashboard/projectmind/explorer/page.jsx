import { Suspense } from 'react';
import ExplorerView from '@/components/projectmind/views/ExplorerView';

export default function Page() {
	// useSearchParams() (deep links like ?path=…&line=10-25) requires a Suspense boundary.
	return (
		<Suspense fallback={null}>
			<ExplorerView />
		</Suspense>
	);
}
