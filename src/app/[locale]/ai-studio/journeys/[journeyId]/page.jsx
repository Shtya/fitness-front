'use client';

import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { JourneyDetail } from '@/components/ai-reading/Journeys';
import { ChevronLeft } from 'lucide-react';

/** Journey detail stays a focused page; list lives inside Studio tabs. */
export default function JourneyDetailPage() {
	const params = useParams();
	const locale = useLocale();
	const isRTL = locale === 'ar';

	return (
		<div
			className={`min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}
			style={{
				background: 'radial-gradient(1100px 520px at 8% -8%, rgba(45,74,62,0.10), transparent), #f6f1e8',
			}}
		>
			<div className="mx-auto max-w-3xl px-4 py-6">
				<Link href="/ai-studio?tab=studio&sub=journey" className="mb-6 inline-flex items-center gap-1 text-xs font-semibold text-[#5c6b63] hover:text-[#1a2e28]">
					<ChevronLeft size={14} /> Studio
				</Link>
				<JourneyDetail journeyId={params?.journeyId} />
			</div>
		</div>
	);
}
