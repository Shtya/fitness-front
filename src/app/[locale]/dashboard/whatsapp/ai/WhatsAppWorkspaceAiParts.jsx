'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound, Layers, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { CostBadge, featureHint, featureLabel, groupedModelOptions } from '../../settings/AiPageParts';
import { AiSetupStepsDialog } from '../../settings/AiSetupStepsDialog';
import { CustomSelect } from '../../ai-content-studio/components/CustomSelect';

const TIERS = [
	{ tier: 'FREE', hint: 'badges.freeHint' },
	{ tier: 'FREE_TIER', hint: 'badges.freeTierHint' },
	{ tier: 'PAID', hint: 'badges.paidHint' },
];

/** One WhatsApp AI feature: what it does on one side, its model on the other. */
function FeatureRow({ feature, models, providers, busy, onAssign, onOpenKeySteps, t }) {
	const groups = groupedModelOptions(models, providers, feature.type, feature.modelKey);
	const selected = models.find(item => item.modelKey === feature.modelKey);
	const provider = providers.find(item => item.id === (feature.provider || selected?.provider));
	const saving = busy === `feature-${feature.id}`;
	return (
		<div className="wst-row wst-feature">
			<div className="wst-row-text">
				<p className="wst-row-title">
					{featureLabel(t, feature.id)}
					<span className="wst-chip">{t(`models.types.${feature.type}`)}</span>
					<CostBadge tier={feature.costTier} t={t} />
				</p>
				<p className="wst-row-hint">{featureHint(t, feature.id)}</p>
				{feature.locked ? (
					<p className="wst-inline-warn">
						<KeyRound size={12} aria-hidden="true" />
						{t('models.needsKey')}
					</p>
				) : null}
			</div>
			<div className="wst-row-control is-select">
				<div className="wst-select">
					<CustomSelect
						value={feature.modelKey}
						disabled={saving}
						onChange={value => onAssign(feature.id, value, selected)}
						groups={groups}
						placeholder={t('features.chooseModel')}
						triggerClassName="h-10 rounded-[10px] text-[13px]"
					/>
					{saving ? <Loader2 size={14} className="wst-select-spin animate-spin" aria-hidden="true" /> : null}
				</div>
				{provider?.needsKey !== false ? (
					<button
						type="button"
						onClick={() => onOpenKeySteps?.(provider?.id || feature.provider)}
						className="wst-btn is-ghost is-sm"
						title={t('models.getKey')}
					>
						<KeyRound size={14} aria-hidden="true" />
						<span className="wst-hide-sm">{t('models.getKey')}</span>
					</button>
				) : (
					<span className="wst-key-spacer" aria-hidden="true" />
				)}
			</div>
		</div>
	);
}

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
			<section className="wst-section">
				<div className="wst-loading" role="status">
					<Loader2 size={20} className="animate-spin" aria-hidden="true" />
				</div>
			</section>
		);
	}

	const page = (data?.pages || []).find((item) => item.id === 'whatsapp');
	if (!page) return null;
	const features = page.features || [];
	const models = data?.models || [];
	const providers = data?.providers || [];
	const stepsProvider = providers.find((item) => item.id === stepsProviderId) || null;

	return (
		<section className="wst-section">
			<header className="wst-head">
				<span className="wst-icon" aria-hidden="true">
					<Layers size={18} />
				</span>
				<div className="wst-head-text">
					<h3>{t('pages.whatsapp')}</h3>
					<p>{t('pages.syncHint')}</p>
				</div>
			</header>

			{/* What each price badge means, read once at the top */}
			<ul className="wst-legend">
				{TIERS.map(({ tier, hint }) => (
					<li key={tier}>
						<CostBadge tier={tier} t={t} />
						<span>{t(hint)}</span>
					</li>
				))}
			</ul>

			<div className="wst-rows">
				{features.map((feature) => (
					<FeatureRow
						key={feature.id}
						feature={feature}
						models={models}
						providers={providers}
						busy={busy}
						onAssign={assign}
						onOpenKeySteps={setStepsProviderId}
						t={t}
					/>
				))}
				{!features.length ? <p className="wst-empty">{t('pages.empty')}</p> : null}
			</div>

			<AiSetupStepsDialog
				open={Boolean(stepsProvider)}
				onOpenChange={(open) => {
					if (!open) setStepsProviderId('');
				}}
				provider={stepsProvider}
				t={t}
			/>
		</section>
	);
}
