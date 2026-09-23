'use client';

import { Suspense } from 'react';
import StudioApp from '@/components/ai-reading/StudioApp';

export default function AIStudioPage() {
	return (
		<Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[#5c6b63]">…</div>}>
			<StudioApp />
		</Suspense>
	);
}
