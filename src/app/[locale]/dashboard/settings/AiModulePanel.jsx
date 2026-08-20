'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	AlertTriangle,
	BarChart3,
	Boxes,
	Gauge,
	KeyRound,
	Loader2,
	SlidersHorizontal,
	Sparkles,
	Trash2,
} from 'lucide-react';
import { Switcher } from '@/components/atoms/Switcher';
import { STUDIO } from '../ai-content-studio/components/studio-theme';
import { AiPageParts, CostBadge, CostLegend, providerName } from './AiPageParts';
import { AiSetupStepsDialog } from './AiSetupStepsDialog';
import api from '@/utils/axios';
import toast from 'react-hot-toast';

const SECTIONS = [
	{ id: 'keys', icon: KeyRound },
	{ id: 'models', icon: Boxes },
	{ id: 'defaults', icon: SlidersHorizontal },
	{ id: 'usage', icon: BarChart3 },
	{ id: 'limits', icon: Gauge },
];

const TYPE_ORDER = ['text', 'image', 'audio'];

const fieldClass =
	'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#818CF8] focus:ring-4 focus:ring-indigo-50';

function money(value) {
	const n = Number(value || 0);
	if (!Number.isFinite(n)) return '$0.00';
	return `$${n.toFixed(n >= 1 ? 2 : 4)}`;
}

function apiErrorMessage(err, fallback) {
	const raw = err?.response?.data?.message;
	const text = Array.isArray(raw) ? raw[0] : raw;
	if (text) return String(text);
	if (!err?.response) return null;
	return fallback;
}

function Progress({ value }) {
	const pct = Math.min(100, Math.max(0, Number(value || 0)));
	const color = pct >= 100 ? '#dc2626' : pct >= 90 ? '#ea580c' : pct >= 80 ? '#d97706' : STUDIO.purple;
	return (
		<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
			<div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
		</div>
	);
}

function Btn({ children, tone = 'primary', loading = false, className = '', ...props }) {
	const styles = {
		primary: {
			background: STUDIO.gradient,
			color: '#fff',
			border: '1px solid transparent',
			borderRadius: STUDIO.btnRadius,
			boxShadow: STUDIO.shadow3dPrimary,
		},
		ghost: {
			background: '#fff',
			color: '#334155',
			border: `1px solid ${STUDIO.border}`,
			borderRadius: STUDIO.btnRadius,
			boxShadow: STUDIO.shadow3d,
		},
		danger: {
			background: '#fff',
			color: '#dc2626',
			border: '1px solid #fecaca',
			borderRadius: STUDIO.btnRadius,
			boxShadow: STUDIO.shadow3d,
		},
	};
	return (
		<button
			type="button"
			{...props}
			className={`inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
			style={styles[tone] || styles.primary}
		>
			{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
			{children}
		</button>
	);
}

function Card({ children, className = '' }) {
	return (
		<section
			className={`rounded-[20px] border border-slate-200/80 bg-white p-5 sm:rounded-[24px] sm:p-6 ${className}`}
			style={{ boxShadow: STUDIO.shadowCard }}
		>
			{children}
		</section>
	);
}

export default function AiModulePanel() {
	const t = useTranslations('settings.aiModule');
	const [section, setSection] = useState('defaults');
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [keyDrafts, setKeyDrafts] = useState({});
	const [busy, setBusy] = useState('');
	const [selectedProviderId, setSelectedProviderId] = useState('');
	const [selectedPageId, setSelectedPageId] = useState('whatsapp');
	const [stepsProviderId, setStepsProviderId] = useState('');
	const [limitsForm, setLimitsForm] = useState({
		monthlyCostLimit: 20,
		monthlyRequestLimit: 1000,
		monthlyImageLimit: 100,
		safetyBufferPercent: 0,
		warningsEnabled: true,
	});
	const [providerLimitsForm, setProviderLimitsForm] = useState({});

	const load = useCallback(async () => {
		const { data: payload } = await api.get('/ai/settings');
		setData(payload);
		setLimitsForm({
			monthlyCostLimit: Number(payload?.limits?.monthlyCostLimit ?? 20),
			monthlyRequestLimit: Number(payload?.limits?.monthlyRequestLimit ?? 1000),
			monthlyImageLimit: Number(payload?.limits?.monthlyImageLimit ?? 100),
			safetyBufferPercent: Number(payload?.limits?.safetyBufferPercent ?? 0),
			warningsEnabled: payload?.warningsEnabled !== false,
		});
		setProviderLimitsForm(payload?.providerLimits && typeof payload.providerLimits === 'object' ? payload.providerLimits : {});
		return payload;
	}, []);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				setLoading(true);
				await load();
			} catch (err) {
				toast.error(apiErrorMessage(err, t('errors.load')) || t('errors.offline'));
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [load, t]);

	const usage = data?.usage;
	const models = data?.models || [];
	const pages = data?.pages || [];
	const providers = data?.providers || [];
	const fallbackProviderId = providers.some((item) => item.id === 'gemini')
		? 'gemini'
		: providers[0]?.id || '';
	const activeProviderId = providers.some((item) => item.id === selectedProviderId)
		? selectedProviderId
		: fallbackProviderId;
	const selectedProvider = providers.find((item) => item.id === activeProviderId);
	const stepsProvider = providers.find((item) => item.id === stepsProviderId) || null;
	const activePageId = pages.some((item) => item.id === selectedPageId)
		? selectedPageId
		: pages[0]?.id || 'whatsapp';
	const modelsByProvider = useMemo(() => {
		const order = providers.map((item) => item.id);
		const map = new Map();
		models.forEach((item) => {
			if (!map.has(item.provider)) map.set(item.provider, new Map());
			const byType = map.get(item.provider);
			const list = byType.get(item.type) || [];
			list.push(item);
			byType.set(item.type, list);
		});
		return [...map.entries()]
			.sort((a, b) => {
				const ai = order.indexOf(a[0]);
				const bi = order.indexOf(b[0]);
				return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
			})
			.map(([provider, byType]) => ({
				provider,
				types: TYPE_ORDER.filter((type) => byType.has(type)).map((type) => [type, byType.get(type)]),
			}));
	}, [models, providers]);
	const billedProviders = providers.filter((item) => item.needsKey !== false);
	const warningText = useMemo(() => {
		if (!usage?.warning) return '';
		if (usage.warning >= 100) return t('usage.hardStop');
		if (usage.warning >= 90) return t('usage.warn90');
		return t('usage.warn80');
	}, [usage?.warning, t]);

	async function withBusy(id, fn) {
		setBusy(id);
		try {
			await fn();
		} catch (err) {
			toast.error(apiErrorMessage(err, t('errors.generic')) || t('errors.offline'));
		} finally {
			setBusy('');
		}
	}

	async function saveFeature(feature, modelKey) {
		await withBusy(`feature-${feature}`, async () => {
			await api.put('/ai/settings/features', { feature, modelKey });
			await load();
			toast.success(t('features.saved'));
		});
	}

	async function saveKey(provider) {
		const apiKey = String(keyDrafts[provider] || '').trim();
		if (!apiKey) {
			toast.error(t('keys.pasteFirst'));
			return;
		}
		await withBusy(`save-${provider}`, async () => {
			await api.post(`/ai/credentials/${provider}`, { apiKey });
			setKeyDrafts((s) => ({ ...s, [provider]: '' }));
			await load();
			toast.success(t('keys.saved'));
		});
	}

	async function testKey(provider) {
		await withBusy(`test-${provider}`, async () => {
			const { data: result } = await api.post(`/ai/credentials/${provider}/test`);
			if (result?.ok) toast.success(result.message || t('keys.tested'));
			else toast.error(result?.message || t('keys.testFailed'));
			await load();
		});
	}

	async function removeKey(provider) {
		await withBusy(`remove-${provider}`, async () => {
			await api.delete(`/ai/credentials/${provider}`);
			await load();
			toast.success(t('keys.removed'));
		});
	}

	async function saveLimits() {
		await withBusy('limits', async () => {
			await api.put('/ai/settings/limits', {
				...limitsForm,
				monthlyCostLimit: Number(limitsForm.monthlyCostLimit),
				monthlyRequestLimit: Number(limitsForm.monthlyRequestLimit),
				monthlyImageLimit: Number(limitsForm.monthlyImageLimit),
				safetyBufferPercent: Number(limitsForm.safetyBufferPercent),
			});
			await load();
			toast.success(t('limits.saved'));
		});
	}

	async function saveProviderLimit(provider) {
		const row = providerLimitsForm[provider] || {};
		await withBusy(`plimit-${provider}`, async () => {
			await api.put('/ai/settings/provider-limits', {
				provider,
				monthlyCostLimit: Number(row.monthlyCostLimit || 0),
				monthlyRequestLimit: Number(row.monthlyRequestLimit || 0),
			});
			await load();
			toast.success(t('limits.saved'));
		});
	}

	async function patchModel(id, body, locked) {
		if (locked && (body.enabled || body.isDefault)) {
			toast.error(t('models.needsKey'));
			return;
		}
		await withBusy(`model-${id}`, async () => {
			if (body.isDefault) await api.post(`/ai/models/${id}/default`);
			else await api.put(`/ai/models/${id}`, body);
			await load();
		});
	}

	async function deleteModel(id) {
		await withBusy(`del-${id}`, async () => {
			await api.delete(`/ai/models/${id}`);
			await load();
			toast.success(t('models.removed'));
		});
	}

	function renderModelRow(model) {
		const locked = Boolean(model.locked);
		const provider = providers.find((item) => item.id === model.provider);
		return (
			<div
				key={model.id}
				className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
					locked ? 'border-slate-200 bg-slate-50/80' : 'border-slate-200 bg-white'
				}`}
			>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-1.5">
						<h3 className="truncate text-sm font-semibold text-slate-900">{model.name}</h3>
						<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
							{t(`models.types.${model.type}`)}
						</span>
						<CostBadge tier={model.costTier} t={t} />
						{model.isDefault ? (
							<span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
								{t('models.default')}
							</span>
						) : null}
						{locked ? (
							<span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
								{t('models.needsKey')}
							</span>
						) : null}
					</div>
					<p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{model.modelKey}</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{provider?.needsKey !== false ? (
						<button
							type="button"
							onClick={() => setStepsProviderId(model.provider)}
							className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
						>
							<KeyRound className="h-3.5 w-3.5" />
							{t('models.getKey')}
						</button>
					) : null}
					<div className={`flex items-center gap-3 ${locked ? 'pointer-events-none opacity-40' : ''}`}>
						<label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
							{t('models.enabled')}
							<Switcher
								checked={Boolean(model.enabled) && !locked}
								onChange={(v) => patchModel(model.id, { enabled: v }, locked)}
							/>
						</label>
						<label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
							{t('models.default')}
							<Switcher
								checked={model.isDefault}
								onChange={(v) => v && patchModel(model.id, { isDefault: true }, locked)}
							/>
						</label>
						{model.system ? null : (
							<button type="button" className="text-xs font-semibold text-red-500" onClick={() => deleteModel(model.id)}>
								<Trash2 className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-500">
				<Loader2 className="h-5 w-5 animate-spin" />
				<span className="text-sm font-medium">{t('loading')}</span>
			</div>
		);
	}

	return (
		<div className="relative overflow-hidden rounded-[24px]" style={{ background: STUDIO.page }}>
			<div
				className="pointer-events-none absolute -end-16 -top-16 h-64 w-64 rounded-full blur-3xl"
				style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
			/>
			<div
				className="pointer-events-none absolute -start-10 bottom-0 h-56 w-56 rounded-full blur-3xl"
				style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)' }}
			/>

			<div className="relative z-10 space-y-5 p-4 sm:p-6">
				<header
					className="flex flex-wrap items-start gap-4 rounded-[20px] bg-white px-5 py-4 sm:px-6"
					style={{ boxShadow: STUDIO.shadow }}
				>
					<span
						className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-white"
						style={{
							borderRadius: 12,
							background: STUDIO.gradientBr,
							boxShadow: STUDIO.shadow3dPrimary,
						}}
					>
						<Sparkles className="h-5 w-5" />
					</span>
					<div className="min-w-0">
						<h1 className="text-xl font-bold tracking-tight text-slate-900">{t('title')}</h1>
						<p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{t('desc')}</p>
					</div>
				</header>

				{warningText ? (
					<div className="flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>{warningText}</span>
					</div>
				) : null}

				<div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
					{SECTIONS.map((item) => {
						const active = section === item.id;
						const Icon = item.icon;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => setSection(item.id)}
								className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition sm:flex-none ${
									active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
								}`}
							>
								<Icon className="h-4 w-4" />
								{t(`tabs.${item.id}`)}
							</button>
						);
					})}
				</div>

				{section === 'defaults' ? (
					<div className="space-y-3">
						<CostLegend t={t} />
						<Card className="p-4 sm:p-4">
							<AiPageParts
								pages={pages}
								activePageId={activePageId}
								onPageChange={setSelectedPageId}
								models={models}
								providers={providers}
								busy={busy}
								onAssign={saveFeature}
								onOpenKeySteps={setStepsProviderId}
								t={t}
							/>
						</Card>
					</div>
				) : null}

				{section === 'models' ? (
					<div className="space-y-4">
						<CostLegend t={t} />
						{modelsByProvider.map((group) => (
							<div key={group.provider} className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h2 className="text-sm font-semibold text-slate-800">{providerName(providers, group.provider)}</h2>
									{providers.find((item) => item.id === group.provider)?.needsKey !== false ? (
										<button
											type="button"
											onClick={() => setStepsProviderId(group.provider)}
											className="inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap text-indigo-600 hover:text-indigo-800"
										>
											<KeyRound className="h-3.5 w-3.5" />
											{t('models.getKey')}
										</button>
									) : null}
								</div>
								{group.types.map(([type, items]) => (
									<div key={`${group.provider}-${type}`}>
										<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
											{t(`models.types.${type}`)}
										</p>
										<div className="space-y-1.5">{items.map(renderModelRow)}</div>
									</div>
								))}
							</div>
						))}
					</div>
				) : null}

				{section === 'keys' ? (
					<div className="space-y-4">
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{providers.map((item) => {
								const active = item.id === activeProviderId;
								const connected = item.needsKey === false || item.credential?.configured;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelectedProviderId(item.id)}
										className={`rounded-xl border px-3 py-2.5 text-start transition ${
											active
												? 'border-indigo-300 bg-indigo-50/50 shadow-sm'
												: 'border-slate-200 bg-white hover:border-slate-300'
										}`}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
												<p className="mt-0.5 text-[11px] text-slate-400">
													{[item.supportsText && t('models.types.text'), item.supportsImage && t('models.types.image'), item.supportsAudio && t('models.types.audio')]
														.filter(Boolean)
														.join(' · ')}
												</p>
											</div>
											<span
												className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
													item.needsKey === false
														? 'bg-emerald-50 text-emerald-700'
														: connected
															? 'bg-emerald-50 text-emerald-700'
															: 'bg-slate-100 text-slate-500'
												}`}
											>
												{item.needsKey === false
													? t('keys.noKeyBadge')
													: connected
														? t('keys.configured')
														: t('keys.missing')}
											</span>
										</div>
									</button>
								);
							})}
						</div>

						{selectedProvider ? (
							<Card className="space-y-3 p-4 sm:p-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="min-w-0">
										<h2 className="text-sm font-semibold text-slate-900">{selectedProvider.name}</h2>
										<p className="mt-0.5 text-xs text-slate-500">
											{selectedProvider.needsKey === false
												? t('keys.noKeyHint')
												: selectedProvider.credential?.configured
													? t('keys.savedAs', { last4: selectedProvider.credential?.last4 || '••••' })
													: t('keys.missing')}
										</p>
									</div>
									<div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
										<Btn
											tone="ghost"
											className="h-9 shrink-0 whitespace-nowrap px-3 text-xs"
											onClick={() => setStepsProviderId(selectedProvider.id)}
										>
											{t('keys.showSteps')}
										</Btn>
										{selectedProvider.needsKey === false || !selectedProvider.implemented ? null : (
											<>
												<Btn
													tone="ghost"
													className="h-9 shrink-0 whitespace-nowrap px-3 text-xs"
													loading={busy === `test-${selectedProvider.id}`}
													disabled={!selectedProvider.credential?.configured}
													onClick={() => testKey(selectedProvider.id)}
												>
													{t('keys.test')}
												</Btn>
												<Btn
													tone="danger"
													className="h-9 shrink-0 whitespace-nowrap px-3 text-xs"
													loading={busy === `remove-${selectedProvider.id}`}
													disabled={!selectedProvider.credential?.configured}
													onClick={() => removeKey(selectedProvider.id)}
												>
													{t('keys.remove')}
												</Btn>
											</>
										)}
									</div>
								</div>

								{selectedProvider.needsKey === false ? null : selectedProvider.implemented ? (
									<>
										<div className="flex flex-col gap-2 sm:flex-row">
											<input
												type="password"
												autoComplete="off"
												value={keyDrafts[selectedProvider.id] || ''}
												onChange={(e) =>
													setKeyDrafts((s) => ({ ...s, [selectedProvider.id]: e.target.value }))
												}
												placeholder={t('keys.placeholder')}
												className={`${fieldClass} h-10 py-2 font-mono`}
											/>
											<Btn
												className="h-10 shrink-0 whitespace-nowrap"
												loading={busy === `save-${selectedProvider.id}`}
												onClick={() => saveKey(selectedProvider.id)}
											>
												{t('keys.save')}
											</Btn>
										</div>
										<p className="text-[11px] text-slate-400">{t('keys.onlyLast4')}</p>
									</>
								) : (
									<p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{t('keys.comingSoonHint')}</p>
								)}
							</Card>
						) : null}
					</div>
				) : null}

				{section === 'usage' ? (
					<div className="space-y-5">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							{[
								[t('usage.cost'), money(usage?.monthlyCost), usage?.percents?.cost],
								[t('usage.requests'), usage?.requests ?? 0, usage?.percents?.requests],
								[t('usage.images'), usage?.images ?? 0, usage?.percents?.images],
							].map(([label, value, pct]) => (
								<Card key={label}>
									<div className="text-xs font-medium text-slate-500">{label}</div>
									<div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
									<Progress value={pct} />
								</Card>
							))}
						</div>
						<Card className="overflow-hidden p-0 sm:p-0">
							{(usage?.modelBreakdown || []).length ? (
								<table className="min-w-full text-sm">
									<thead className="border-b border-slate-100 text-left text-xs font-medium text-slate-400">
										<tr>
											<th className="px-5 py-3">{t('models.name')}</th>
											<th className="px-5 py-3">{t('models.provider')}</th>
											<th className="px-5 py-3">{t('models.type')}</th>
											<th className="px-5 py-3">{t('usage.requests')}</th>
											<th className="px-5 py-3">{t('usage.cost')}</th>
										</tr>
									</thead>
									<tbody>
										{usage.modelBreakdown.map((row) => (
											<tr key={`${row.provider}-${row.modelKey}-${row.type}`} className="border-t border-slate-50">
												<td className="px-5 py-3">
													<div className="text-sm font-semibold text-slate-800">{row.name || row.modelKey}</div>
													<p className="font-mono text-[11px] text-slate-400">{row.modelKey}</p>
												</td>
												<td className="px-5 py-3">
													<div className="text-xs text-slate-600">{providerName(providers, row.provider)}</div>
													<CostBadge tier={row.costTier} t={t} className="mt-1" />
												</td>
												<td className="px-5 py-3 text-slate-500">{row.type}</td>
												<td className="px-5 py-3">{row.requests}</td>
												<td className="px-5 py-3 font-semibold">{money(row.cost)}</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className="px-5 py-12 text-center text-sm text-slate-400">{t('usage.empty')}</div>
							)}
						</Card>
					</div>
				) : null}

				{section === 'limits' ? (
					<div className="space-y-4">
						<Card className="max-w-xl space-y-4">
							<h2 className="text-sm font-semibold text-slate-800">{t('limits.workspace')}</h2>
							<label className="block">
								<span className="mb-1.5 block text-xs font-medium text-slate-500">{t('limits.cost')}</span>
								<input className={fieldClass} type="number" value={limitsForm.monthlyCostLimit} onChange={(e) => setLimitsForm((s) => ({ ...s, monthlyCostLimit: e.target.value }))} />
							</label>
							<label className="block">
								<span className="mb-1.5 block text-xs font-medium text-slate-500">{t('limits.requests')}</span>
								<input className={fieldClass} type="number" value={limitsForm.monthlyRequestLimit} onChange={(e) => setLimitsForm((s) => ({ ...s, monthlyRequestLimit: e.target.value }))} />
							</label>
							<label className="block">
								<span className="mb-1.5 block text-xs font-medium text-slate-500">{t('limits.images')}</span>
								<input className={fieldClass} type="number" value={limitsForm.monthlyImageLimit} onChange={(e) => setLimitsForm((s) => ({ ...s, monthlyImageLimit: e.target.value }))} />
							</label>
							<label className="block">
								<span className="mb-1.5 block text-xs font-medium text-slate-500">{t('limits.buffer')}</span>
								<input className={fieldClass} type="number" value={limitsForm.safetyBufferPercent} onChange={(e) => setLimitsForm((s) => ({ ...s, safetyBufferPercent: e.target.value }))} />
							</label>
							<div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
								<div>
									<div className="text-sm font-medium text-slate-800">{t('limits.warnings')}</div>
									<div className="text-xs text-slate-500">{t('limits.warningsHint')}</div>
								</div>
								<Switcher checked={limitsForm.warningsEnabled} onChange={(v) => setLimitsForm((s) => ({ ...s, warningsEnabled: v }))} />
							</div>
							<Btn loading={busy === 'limits'} onClick={saveLimits}>
								{t('limits.save')}
							</Btn>
						</Card>

						<Card className="space-y-3">
							<div>
								<h2 className="text-sm font-semibold text-slate-800">{t('limits.perProvider')}</h2>
								<p className="mt-1 text-xs text-slate-500">{t('limits.perProviderHint')}</p>
							</div>
							{billedProviders.map((provider) => {
								const used = (usage?.providerBreakdown || []).find((row) => row.provider === provider.id);
								const form = providerLimitsForm[provider.id] || {};
								return (
									<div key={provider.id} className="rounded-xl border border-slate-200 px-3 py-3">
										<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
											<div>
												<p className="text-sm font-semibold text-slate-800">{provider.name}</p>
												<p className="text-[11px] text-slate-400">
													{t('usage.used')}: {used?.requests || 0} · {money(used?.cost)}
												</p>
											</div>
											<Btn
												tone="ghost"
												className="h-8 px-3 text-xs"
												loading={busy === `plimit-${provider.id}`}
												onClick={() => saveProviderLimit(provider.id)}
											>
												{t('limits.save')}
											</Btn>
										</div>
										<div className="grid gap-2 sm:grid-cols-2">
											<label className="block">
												<span className="mb-1 block text-[11px] font-medium text-slate-500">{t('limits.cost')}</span>
												<input
													className={fieldClass}
													type="number"
													value={form.monthlyCostLimit ?? ''}
													onChange={(e) =>
														setProviderLimitsForm((s) => ({
															...s,
															[provider.id]: { ...form, monthlyCostLimit: e.target.value },
														}))
													}
												/>
											</label>
											<label className="block">
												<span className="mb-1 block text-[11px] font-medium text-slate-500">{t('limits.requests')}</span>
												<input
													className={fieldClass}
													type="number"
													value={form.monthlyRequestLimit ?? ''}
													onChange={(e) =>
														setProviderLimitsForm((s) => ({
															...s,
															[provider.id]: { ...form, monthlyRequestLimit: e.target.value },
														}))
													}
												/>
											</label>
										</div>
									</div>
								);
							})}
						</Card>
					</div>
				) : null}
				<AiSetupStepsDialog
					open={Boolean(stepsProvider)}
					onOpenChange={(open) => {
						if (!open) setStepsProviderId('');
					}}
					provider={stepsProvider}
					t={t}
				/>
			</div>
		</div>
	);
}
