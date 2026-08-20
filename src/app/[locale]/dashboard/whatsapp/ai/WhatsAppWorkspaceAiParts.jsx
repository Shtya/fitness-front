'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { AiPageParts, CostLegend } from '../../settings/AiPageParts';
import { AiSetupStepsDialog } from '../../settings/AiSetupStepsDialog';

export default function WhatsAppWorkspaceAiParts({ onRepliesAssigned }) {
	const t = useTranslations('settings.aiModule');
	const [data, setData] = useState(null);
	const [busy, setBusy] = useState('');
	const [loading, setLoading] = useState(true);
	const [stepsProviderId, setStepsProviderId] = useState('');

	const load = useCallback(async () => {
		const { data: payload } = await api.get('/ai/settings');
		setData(payload);
		return payload;
	}, []);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				setLoading(true);
				await load();
			} catch {
				if (alive) toast.error(t('errors.load'));
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [load, t]);

	async function assign(feature, modelKey) {
		setBusy(`feature-${feature}`);
		try {
			await api.put('/ai/settings/features', { feature, modelKey });
			const payload = await load();
			toast.success(t('features.saved'));
			if (feature === 'whatsapp.replies') {
				const model = (payload?.models || []).find((item) => item.modelKey === modelKey);
				await onRepliesAssigned?.({
					provider: model?.provider || 'ai-free',
					model: modelKey,
				});
			}
		} catch (err) {
			const raw = err?.response?.data?.message;
			toast.error(Array.isArray(raw) ? raw[0] : raw || t('errors.generic'));
		} finally {
			setBusy('');
		}
	}

	if (loading && !data) {
		return (
			<div className="mb-4 grid min-h-24 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
				<Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary-500)]" />
			</div>
		);
	}

	const page = (data?.pages || []).find((item) => item.id === 'whatsapp');
	if (!page) return null;
	const stepsProvider = (data?.providers || []).find((item) => item.id === stepsProviderId) || null;

	return (
		<div className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
			<div>
				<p className="text-sm font-black text-slate-900 dark:text-white">{t('pages.whatsapp')}</p>
				<p className="mt-0.5 text-xs text-slate-500">{t('pages.syncHint')}</p>
			</div>
			<CostLegend t={t} />
			<AiPageParts
				pages={[page]}
				activePageId="whatsapp"
				models={data?.models || []}
				providers={data?.providers || []}
				busy={busy}
				onAssign={assign}
				onOpenKeySteps={setStepsProviderId}
				t={t}
				showNav={false}
				compact
			/>
			<AiSetupStepsDialog
				open={Boolean(stepsProvider)}
				onOpenChange={(open) => {
					if (!open) setStepsProviderId('');
				}}
				provider={stepsProvider}
				t={t}
			/>
		</div>
	);
}
