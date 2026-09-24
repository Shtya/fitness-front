'use client';

import { Suspense } from 'react';
import StudioApp from '@/components/ai-reading/StudioApp';

export default function AIStudioPage() {
	return (
		<Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-sm text-[var(--ar-muted,#64748b)]">…</div>}>
			<StudioApp />
		</Suspense>
	);
}
