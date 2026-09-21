'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import BodyMeasurementFlow from '@/components/body-measurement/BodyMeasurementFlow';

export default function ClientBodyMeasurementPage() {
	const params = useParams();
	const userId = params?.id;
	const t = useTranslations('bodyMeasurement');

	return (
		<div className="pb-8">
			<BodyMeasurementFlow userId={userId} t={t} backHref={`/dashboard/users/${userId}`} />
		</div>
	);
}
