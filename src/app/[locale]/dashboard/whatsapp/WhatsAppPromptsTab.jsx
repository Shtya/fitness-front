'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';
import PromptsPanel from '@/components/ai-reading/PromptsPanel';
import { uiFontFamily } from '@/lib/ai-reading/fonts';
import { hydrateAiReadingStore } from '@/lib/ai-reading/storage';
import '@/lib/ai-reading/ai-reading-theme.css';
import '@/lib/ai-reading/reading-fonts.css';
import '@/components/ai-reading/room/reading-room.css';

/**
 * Standalone WhatsApp sidebar tab for the prompt library (folders + DB persistence).
 * Same data as the old Reading → Prompts section.
 */
export default function WhatsAppPromptsTab() {
	const locale = useLocale();
	const ar = String(locale).toLowerCase().startsWith('ar');
	const font = uiFontFamily(ar ? 'ar' : 'en');
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let alive = true;
		const finish = () => alive && setReady(true);
		hydrateAiReadingStore().then(finish, finish);
		return () => {
			alive = false;
		};
	}, []);

	return (
		<div
			className="ai-reading-root rr wa-prompts-pane flex h-full min-h-0 flex-1 flex-col overflow-hidden"
			dir={ar ? 'rtl' : 'ltr'}
			style={{ fontFamily: font }}
		>
			<main className="rr-main min-h-0 flex-1 overflow-y-auto overscroll-contain">
				<div className="mx-auto w-full max-w-5xl px-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8">
					{!ready ? (
						<div className="grid min-h-[40vh] place-items-center" aria-busy="true">
							<Loader2 size={20} className="animate-spin" style={{ color: 'var(--rr-ink-3)' }} />
						</div>
					) : (
						<div className="rr-enter">
							<PromptsPanel compactHeader />
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
