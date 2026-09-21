'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import BodyMeasurementFlow from '@/components/body-measurement/BodyMeasurementFlow';
import { useRouter } from '@/i18n/navigation';
import api from '@/utils/axios';

export default function MyBodyMeasurementPage() {
	const t = useTranslations('bodyMeasurement');
	const router = useRouter();
	const [user, setUser] = useState(undefined);

	useEffect(() => {
		let cancelled = false;
		api.get('/auth/me')
			.then(({ data }) => {
				if (!cancelled) setUser(data || null);
			})
			.catch(() => {
				if (!cancelled) setUser(null);
			});
		return () => { cancelled = true; };
	}, []);

	const isClient = String(user?.role || '').toLowerCase() === 'client';

	useEffect(() => {
		if (user === undefined) return;
		if (!user) {
			router.replace('/auth');
			return;
		}
		if (!isClient) {
			router.replace('/dashboard/my-account');
		}
	}, [user, isClient, router]);

	if (user === undefined || !user?.id || !isClient) {
		return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
	}

	return (
		<div className="pb-8">
			<BodyMeasurementFlow userId={user.id} t={t} backHref="/dashboard/my/profile" />
		</div>
	);
}
