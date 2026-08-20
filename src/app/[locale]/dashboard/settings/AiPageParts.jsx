'use client';

import { AudioLines, Dumbbell, ExternalLink, Images, KeyRound, Mail, MessageCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { CustomSelect } from '../ai-content-studio/components/CustomSelect';

export const PAGE_ICONS = {
	whatsapp: MessageCircle,
	transcript: AudioLines,
	fitcoach: Dumbbell,
	'email-memo': Mail,
	studio: Images,
};

export const PAGE_I18N = {
	whatsapp: 'whatsapp',
	transcript: 'transcript',
	fitcoach: 'fitcoach',
	'email-memo': 'emailMemo',
	studio: 'studio',
};

export const FEATURE_I18N = {
	'whatsapp.replies': 'whatsappReplies',
	'whatsapp.image': 'whatsappImage',
	'whatsapp.voice-changer': 'whatsappVoice',
	'whatsapp.transcript': 'whatsappTranscript',
	'transcription.stt': 'transcriptionStt',
	'transcription.enhance': 'transcriptionEnhance',
	'fitcoach.chat': 'fitcoachChat',
	'exercise.form': 'exerciseForm',
	'email-memo': 'emailMemo',
	'studio.topic': 'studioTopic',
	'studio.content': 'studioContent',
	'studio.image': 'studioImage',
	whatsapp: 'whatsappReplies',
	studio: 'studioTopic',
	'studio-image': 'studioImage',
	transcription: 'transcriptionStt',
	exercise: 'exerciseForm',
};

export function pageLabel(t, id) {
	const key = PAGE_I18N[id] || id;
	return t(`pages.${key}`);
}

export function featureLabel(t, id) {
	const key = FEATURE_I18N[id];
	return key ? t(`features.${key}`) : id;
}

export function featureHint(t, id) {
	const key = FEATURE_I18N[id];
	try {
		return key ? t(`features.hints.${key}`) : t('features.hints.generic');
	} catch {
		return t('features.hints.generic');
	}
}

export function CostBadge({ tier, t, className = '' }) {
	const key = String(tier || '').toUpperCase();
	const styles = {
		FREE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
		FREE_TIER: 'border-sky-200 bg-sky-50 text-sky-700',
		PREMIUM: 'border-violet-200 bg-violet-50 text-violet-700',
		PAID: 'border-rose-200 bg-rose-50 text-rose-700',
	};
	const label =
		key === 'FREE'
			? t('badges.free')
			: key === 'FREE_TIER'
				? t('badges.freeTier')
				: key === 'PREMIUM'
					? t('badges.premium')
					: t('badges.paid');
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[key] || styles.PAID} ${className}`}
		>
			<span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
			{label}
		</span>
	);
}

export function CostLegend({ t }) {
	return (
		<div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[11px] leading-5 text-slate-600 sm:grid-cols-3">
			<div>
				<CostBadge tier="FREE" t={t} />
				<p className="mt-1">{t('badges.freeHint')}</p>
			</div>
			<div>
				<CostBadge tier="FREE_TIER" t={t} />
				<p className="mt-1">{t('badges.freeTierHint')}</p>
			</div>
			<div>
				<CostBadge tier="PAID" t={t} />
				<p className="mt-1">{t('badges.paidHint')}</p>
			</div>
		</div>
	);
}

export function providerName(providers, id) {
	return providers.find((item) => item.id === id)?.name || id;
}

export function groupedModelOptions(models, providers, type, currentValue) {
	const byProvider = new Map();
	models
		.filter((item) => !type || item.type === type)
		.forEach((item) => {
			const list = byProvider.get(item.provider) || [];
			list.push(item);
			byProvider.set(item.provider, list);
		});
	return [...byProvider.entries()].map(([provider, items]) => ({
		label: providerName(providers, provider),
		options: items.map((item) => ({
			value: item.modelKey,
			label: `${item.name} · ${item.type}`,
			disabled:
				item.modelKey !== currentValue && (Boolean(item.locked) || item.enabled === false),
		})),
	}));
}

export function AiFeatureRow({ feature, models, providers, busy, onAssign, onOpenKeySteps, t }) {
	const groups = groupedModelOptions(models, providers, feature.type, feature.modelKey);
	const selected = models.find((item) => item.modelKey === feature.modelKey);
	const provider = providers.find((item) => item.id === (feature.provider || selected?.provider));
	return (
		<div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 sm:flex-row sm:items-center">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-1.5">
					<p className="text-sm font-semibold text-slate-800">{featureLabel(t, feature.id)}</p>
					<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
						{t(`models.types.${feature.type}`)}
					</span>
					<CostBadge tier={feature.costTier} t={t} />
					{feature.locked ? (
						<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
							{t('models.needsKey')}
						</span>
					) : null}
				</div>
				<p className="mt-0.5 text-[11px] leading-4 text-slate-500">{featureHint(t, feature.id)}</p>
			</div>
			<div className="flex w-full items-center gap-2 sm:w-auto">
				<div className="min-w-0 flex-1 sm:w-[260px] sm:flex-none">
					<CustomSelect
						value={feature.modelKey}
						disabled={busy === `feature-${feature.id}`}
						onChange={(value) => onAssign(feature.id, value, selected)}
						groups={groups}
						placeholder={t('features.chooseModel')}
						triggerClassName="h-8 rounded-lg text-xs"
					/>
				</div>
				{provider?.needsKey !== false ? (
					<button
						type="button"
						onClick={() => onOpenKeySteps?.(provider?.id || feature.provider)}
						className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
					>
						<KeyRound className="h-3.5 w-3.5" />
						{t('models.getKey')}
					</button>
				) : null}
			</div>
		</div>
	);
}

export function AiPageParts({
	pages = [],
	activePageId,
	onPageChange,
	models = [],
	providers = [],
	busy,
	onAssign,
	onOpenKeySteps,
	t,
	showNav = true,
	compact = false,
}) {
	const active = pages.find((page) => page.id === activePageId) || pages[0];
	const features = active?.features || [];
	return (
		<div className={showNav ? 'grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]' : ''}>
			{showNav ? (
				<nav className="rounded-2xl bg-slate-100/90 p-1.5">
					{pages.map((page) => {
						const selected = page.id === active?.id;
						const Icon = PAGE_ICONS[page.id] || Images;
						return (
							<button
								key={page.id}
								type="button"
								onClick={() => onPageChange?.(page.id)}
								className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition ${
									selected
										? 'bg-white text-slate-900 shadow-sm'
										: 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
								}`}
							>
								<span
									className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
										selected ? 'bg-indigo-50 text-indigo-600' : 'bg-white/80 text-slate-400'
									}`}
								>
									<Icon className="h-4 w-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold">{pageLabel(t, page.id)}</span>
									<span className="block text-[11px] font-medium text-slate-400">
										{t('pages.parts', { count: page.features?.length || 0 })}
									</span>
								</span>
							</button>
						);
					})}
				</nav>
			) : null}
			<div className="space-y-2">
				{showNav && active?.href ? (
					<div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
						<p className="text-sm font-semibold text-slate-800">{pageLabel(t, active.id)}</p>
						<Link
							href={active.href}
							className="inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap text-indigo-600 hover:text-indigo-800"
						>
							{t('pages.open')}
							<ExternalLink className="h-3 w-3" />
						</Link>
					</div>
				) : null}
				{features.map((feature) => (
					<AiFeatureRow
						key={feature.id}
						feature={feature}
						models={models}
						providers={providers}
						busy={busy}
						onAssign={onAssign}
						onOpenKeySteps={onOpenKeySteps}
						t={t}
					/>
				))}
				{!features.length ? (
					<p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
						{t('pages.empty')}
					</p>
				) : null}
				{compact ? null : <p className="px-0.5 text-[11px] text-slate-400">{t('pages.syncHint')}</p>}
			</div>
		</div>
	);
}
