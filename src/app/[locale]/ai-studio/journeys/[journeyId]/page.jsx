'use client';

import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { JourneyDetail } from '@/components/ai-reading/Journeys';
import { ChevronLeft } from 'lucide-react';
import '@/lib/ai-reading/ai-reading-theme.css';

/** Journey detail stays a focused page; list lives inside Studio tabs. */
export default function JourneyDetailPage() {
	const params = useParams();
	const locale = useLocale();
	const isRTL = locale === 'ar';

	return (
		<div
			className={`ai-reading-root min-h-full ${isRTL ? 'rtl' : 'ltr'}`}
			style={{
				background:
					'radial-gradient(1100px 520px at 8% -8%, color-mix(in srgb, var(--color-primary-400, #818cf8) 12%, transparent), transparent)',
			}}
		>
			<div className="mx-auto max-w-3xl px-4 py-6">
				<Link
					href="/ai-studio?tab=studio&sub=journey"
					className="mb-6 inline-flex items-center gap-1 text-xs font-semibold hover:opacity-80"
					style={{ color: 'var(--ar-muted)' }}
				>
					<ChevronLeft size={14} /> Studio
				</Link>
				<JourneyDetail journeyId={params?.journeyId} />
			</div>
		</div>
	);
}
