import { Suspense } from 'react';
import ChatView from '@/components/projectmind/views/ChatView';

export default function Page() {
	// useSearchParams() (?q= deep link) needs a Suspense boundary.
	return (
		<Suspense fallback={null}>
			<ChatView />
		</Suspense>
	);
}
