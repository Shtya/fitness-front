'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Activity,
	BookOpen,
	Bot,
	Cpu,
	FlaskConical,
	Loader2,
	Pencil,
	Plus,
	RefreshCw,
	Save,
	Search,
	Send,
	Settings2,
	Trash2,
	X,
} from 'lucide-react';
import { WaCustomSelect } from '../WaCustomSelect';
import { apiErrorMessage, whatsappAiAgentApi } from './whatsapp-ai-api';
import { agentCopy, fillTemplate, splitList } from './agent-copy';
import './wa-agent.css';

const PROVIDERS = [
	{ value: 'ai-free', label: 'AI Free' },
	{ value: 'llm7-free', label: 'LLM7' },
	{ value: 'pollinations-free', label: 'Pollinations' },
	{ value: 'dragify-free', label: 'Dragify' },
	{ value: 'browser-chatgpt', label: 'Browser ChatGPT' },
];
const DIALECTS = {
	en: [
		{ value: 'auto', label: 'Match customer' },
		{ value: 'msa', label: 'MSA' },
		{ value: 'egyptian', label: 'Egyptian' },
		{ value: 'gulf', label: 'Gulf' },
		{ value: 'levantine', label: 'Levantine' },
		{ value: 'english', label: 'English' },
	],
	ar: [
		{ value: 'auto', label: 'لهجة العميل' },
		{ value: 'msa', label: 'فصحى' },
		{ value: 'egyptian', label: 'مصرية' },
		{ value: 'gulf', label: 'خليجية' },
		{ value: 'levantine', label: 'شامية' },
		{ value: 'english', label: 'إنجليزية' },
	],
};
const TONES = {
	en: [
		{ value: 'professional', label: 'Professional' },
		{ value: 'friendly', label: 'Friendly' },
		{ value: 'sales', label: 'Sales' },
		{ value: 'support', label: 'Support' },
		{ value: 'formal', label: 'Formal' },
		{ value: 'concise', label: 'Concise' },
	],
	ar: [
		{ value: 'professional', label: 'احترافية' },
		{ value: 'friendly', label: 'ودّية' },
		{ value: 'sales', label: 'بيعية' },
		{ value: 'support', label: 'دعم' },
		{ value: 'formal', label: 'رسمية' },
		{ value: 'concise', label: 'مختصرة' },
	],
};
const LENGTHS = {
	en: [
		{ value: 'short', label: 'Short' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'detailed', label: 'Detailed' },
	],
	ar: [
		{ value: 'short', label: 'قصير' },
		{ value: 'medium', label: 'متوسط' },
		{ value: 'detailed', label: 'مفصّل' },
	],
};
const CATEGORY_IDS = ['project', 'service', 'price', 'policy', 'faq', 'other'];

function Switch({ checked, onChange, label, disabled }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`wa-ag-switch${checked ? ' is-on' : ''}`}
		>
			<span />
		</button>
	);
}

function Toggle({ label, hint, checked, onChange }) {
	return (
		<div className="wa-ag-toggle">
			<div>
				<p className="text-[12.5px] font-bold leading-4">{label}</p>
				{hint ? <p className="wa-ag-hint mt-0.5">{hint}</p> : null}
			</div>
			<Switch label={label} checked={Boolean(checked)} onChange={onChange} />
		</div>
	);
}

function Field({ label, hint, wide, num, children }) {
	return (
		<div className={`wa-ag-field${wide ? ' is-wide' : ''}${num ? ' is-num' : ''}`}>
			{label ? <span className="wa-ag-label">{label}</span> : null}
			{children}
			{hint ? <span className="wa-ag-hint">{hint}</span> : null}
		</div>
	);
}

function Chips({ label, value, onChange, options, ariaLabel }) {
	return (
		<div className="wa-ag-field is-wide">
			{label ? <span className="wa-ag-label">{label}</span> : null}
			<div className="wa-ag-chips" role="listbox" aria-label={ariaLabel || label}>
				{options.map(option => (
					<button
						key={option.value}
						type="button"
						role="option"
						aria-selected={value === option.value}
						onClick={() => onChange(option.value)}
						className={`wa-ag-chip${value === option.value ? ' is-on' : ''}`}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}

function Segmented({ value, onChange, options, ariaLabel }) {
	return (
		<div className="wa-ag-seg" role="radiogroup" aria-label={ariaLabel}>
			{options.map(option => (
				<button
					key={option.value}
					type="button"
					role="radio"
					aria-checked={value === option.value}
					onClick={() => onChange(option.value)}
					className={value === option.value ? 'is-on' : ''}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}

function settingsToDraft(settings) {
	return {
		...settings,
		allowedTopicsText: (settings.allowedTopics || []).join(', '),
		forbiddenTopicsText: (settings.forbiddenTopics || []).join(', '),
		handoffKeywordsText: (settings.handoffKeywords || []).join(', '),
	};
}

function draftToPayload(draft) {
	return {
		enabled: Boolean(draft.enabled),
		scope: draft.scope,
		defaultMode: draft.defaultMode,
		provider: draft.provider,
		model: String(draft.model || '').trim() || 'auto',
		externalModelId: draft.provider === 'external' ? draft.externalModelId || null : null,
		agentName: draft.agentName || '',
		businessName: draft.businessName || '',
		persona: draft.persona || '',
		dialect: draft.dialect,
		tone: draft.tone,
		replyLength: draft.replyLength,
		rules: draft.rules || '',
		allowedTopics: splitList(draft.allowedTopicsText),
		forbiddenTopics: splitList(draft.forbiddenTopicsText),
		permissions: draft.permissions,
		useKnowledgeBase: Boolean(draft.useKnowledgeBase),
		knowledgeOnly: Boolean(draft.knowledgeOnly),
		useContactMemory: Boolean(draft.useContactMemory),
		contextMessageLimit: Number(draft.contextMessageLimit) || 12,
		discloseAi: Boolean(draft.discloseAi),
		disclosureText: draft.disclosureText || '',
		handoffKeywords: splitList(draft.handoffKeywordsText),
		handoffMessage: draft.handoffMessage || '',
		mediaPolicy: draft.mediaPolicy,
		allowGroups: Boolean(draft.allowGroups),
		debounceSeconds: Number(draft.debounceSeconds) || 8,
		humanPauseMinutes: Number(draft.humanPauseMinutes) || 30,
		maxRepliesPerHour: Number(draft.maxRepliesPerHour) || 12,
		minConfidence: Math.min(1, Math.max(0, Number(draft.minConfidence))),
	};
}

function providerLabel(draft, text) {
	if (draft.provider === 'external') return text.externalModels;
	return labelForProvider(draft.provider, text);
}

function labelForProvider(name, text) {
	if (name === 'external') return text.externalModels;
	return PROVIDERS.find(item => item.value === name)?.label || name;
}

function formatClock(date, locale) {
	return new Intl.DateTimeFormat(String(locale || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en', {
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

/* ------------------------------------------------------------------ setup */

function SetupSection({ text, lang, draft, setDraft, saving, saved, error, onSubmit }) {
	const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
	const updatePermission = (key, value) =>
		setDraft(current => ({ ...current, permissions: { ...current.permissions, [key]: value } }));

	return (
		<form onSubmit={onSubmit} className="wa-ag-desk">
			<aside className="wa-ag-rail">
				<div className="wa-ag-rail-span">
					<h3>{text.enabled}</h3>
					<p className="wa-ag-hint">{text.enabledHint}</p>
					<div className="flex items-center justify-between gap-3">
						<span className="text-[13px] font-bold">
							{draft.enabled ? (draft.defaultMode === 'auto' ? text.chip.auto : text.chip.suggest) : text.chip.off}
						</span>
						<Switch label={text.enabled} checked={Boolean(draft.enabled)} onChange={value => update('enabled', value)} />
					</div>
				</div>
				<div>
					<span className="wa-ag-label">{text.scope}</span>
					<Segmented
						ariaLabel={text.scope}
						value={draft.scope}
						onChange={value => update('scope', value)}
						options={[
							{ value: 'all', label: text.scopeAll },
							{ value: 'selected', label: text.scopeSelected },
						]}
					/>
				</div>
				<div>
					<span className="wa-ag-label">{text.defaultMode}</span>
					<Segmented
						ariaLabel={text.defaultMode}
						value={draft.defaultMode}
						onChange={value => update('defaultMode', value)}
						options={[
							{ value: 'auto', label: text.modeAuto },
							{ value: 'suggest', label: text.modeSuggest },
						]}
					/>
				</div>
				<div className="wa-ag-rail-span wa-ag-model">
					<span className="wa-ag-label">{text.provider}</span>
					<b dir="auto">{providerLabel(draft, text)}</b>
					<span dir="ltr">{text.model}: {draft.model || 'auto'}</span>
				</div>
				<button type="submit" disabled={saving} className="wa-ag-save wa-ag-rail-span">
					{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
					{text.save}
				</button>
				{saved && !error ? <p className="wa-ag-note is-ok wa-ag-rail-span">{text.saved}</p> : null}
				{error ? <p className="wa-ag-note is-bad wa-ag-rail-span">{error}</p> : null}
			</aside>

			<div className="wa-ag-mods">
				<section className="wa-ag-mod">
					<h3>{text.sectionIdentity}</h3>
					<div className="wa-ag-fields">
						<Field label={text.agentName}>
							<input value={draft.agentName || ''} onChange={event => update('agentName', event.target.value)} maxLength={80} dir="auto" className="wa-ag-input" />
						</Field>
						<Field label={text.businessName}>
							<input value={draft.businessName || ''} onChange={event => update('businessName', event.target.value)} maxLength={120} dir="auto" className="wa-ag-input" />
						</Field>
						<Field label={text.persona} wide>
							<textarea value={draft.persona || ''} onChange={event => update('persona', event.target.value)} rows={3} maxLength={2000} dir="auto" className="wa-ag-area" />
						</Field>
						<Chips label={text.dialect} value={draft.dialect} onChange={value => update('dialect', value)} options={DIALECTS[lang]} />
						<Chips label={text.tone} value={draft.tone} onChange={value => update('tone', value)} options={TONES[lang]} />
						<Chips label={text.replyLength} value={draft.replyLength} onChange={value => update('replyLength', value)} options={LENGTHS[lang]} />
					</div>
				</section>

				<section className="wa-ag-mod">
					<h3>{text.sectionRules}</h3>
					<div className="wa-ag-fields">
						<Field label={text.rules} wide>
							<textarea value={draft.rules || ''} onChange={event => update('rules', event.target.value)} rows={4} maxLength={4000} dir="auto" className="wa-ag-area" />
						</Field>
						<Field label={text.allowedTopics}>
							<input value={draft.allowedTopicsText} onChange={event => update('allowedTopicsText', event.target.value)} dir="auto" className="wa-ag-input" />
						</Field>
						<Field label={text.forbiddenTopics}>
							<input value={draft.forbiddenTopicsText} onChange={event => update('forbiddenTopicsText', event.target.value)} dir="auto" className="wa-ag-input" />
						</Field>
					</div>
				</section>

				<section className="wa-ag-mod">
					<h3>{text.sectionPermissions}</h3>
					<p className="wa-ag-hint">{text.permissionsHint}</p>
					<Toggle label={text.permQuote} checked={draft.permissions?.quotePrices} onChange={value => updatePermission('quotePrices', value)} />
					<Toggle label={text.permCommit} checked={draft.permissions?.makeCommitments} onChange={value => updatePermission('makeCommitments', value)} />
					<Toggle label={text.permDiscount} checked={draft.permissions?.offerDiscounts} onChange={value => updatePermission('offerDiscounts', value)} />
					<Toggle label={text.permLinks} checked={draft.permissions?.shareLinks} onChange={value => updatePermission('shareLinks', value)} />
				</section>

				<section className="wa-ag-mod">
					<h3>{text.sectionContext}</h3>
					<Toggle label={text.useKnowledgeBase} checked={draft.useKnowledgeBase} onChange={value => update('useKnowledgeBase', value)} />
					<Toggle label={text.knowledgeOnly} hint={text.knowledgeOnlyHint} checked={draft.knowledgeOnly} onChange={value => update('knowledgeOnly', value)} />
					<Toggle label={text.useContactMemory} checked={draft.useContactMemory} onChange={value => update('useContactMemory', value)} />
					<div className="mt-3 wa-ag-fields">
						<Field label={text.contextLimit} num>
							<input type="number" min="4" max="40" value={draft.contextMessageLimit ?? 12} onChange={event => update('contextMessageLimit', event.target.value)} className="wa-ag-input" />
						</Field>
					</div>
				</section>

				<section className="wa-ag-mod">
					<h3>{text.sectionDisclosure}</h3>
					<Toggle label={text.discloseAi} checked={draft.discloseAi} onChange={value => update('discloseAi', value)} />
					{draft.discloseAi ? (
						<div className="mt-3">
							<Field label={text.disclosureText} wide>
								<input value={draft.disclosureText || ''} onChange={event => update('disclosureText', event.target.value)} maxLength={300} dir="auto" className="wa-ag-input" />
							</Field>
						</div>
					) : null}
				</section>

				<section className="wa-ag-mod">
					<h3>{text.sectionHandoff}</h3>
					<div className="wa-ag-fields">
						<Field label={text.handoffKeywords} hint={text.handoffKeywordsHint}>
							<input value={draft.handoffKeywordsText} onChange={event => update('handoffKeywordsText', event.target.value)} dir="auto" className="wa-ag-input" />
						</Field>
						<Field label={text.handoffMessage} wide>
							<input value={draft.handoffMessage || ''} onChange={event => update('handoffMessage', event.target.value)} maxLength={500} dir="auto" className="wa-ag-input" />
						</Field>
						<Chips
							label={text.mediaPolicy}
							value={draft.mediaPolicy}
							onChange={value => update('mediaPolicy', value)}
							options={[
								{ value: 'handoff', label: text.mediaHandoff },
								{ value: 'acknowledge', label: text.mediaAcknowledge },
								{ value: 'ignore', label: text.mediaIgnore },
							]}
						/>
						<Field label={text.debounce} num>
							<input type="number" min="2" max="120" value={draft.debounceSeconds ?? 8} onChange={event => update('debounceSeconds', event.target.value)} className="wa-ag-input" />
						</Field>
						<Field label={text.humanPause} num>
							<input type="number" min="1" max="1440" value={draft.humanPauseMinutes ?? 30} onChange={event => update('humanPauseMinutes', event.target.value)} className="wa-ag-input" />
						</Field>
						<Field label={text.maxPerHour} num>
							<input type="number" min="1" max="120" value={draft.maxRepliesPerHour ?? 12} onChange={event => update('maxRepliesPerHour', event.target.value)} className="wa-ag-input" />
						</Field>
						<Field label={`${text.minConfidence}: ${Math.round(Number(draft.minConfidence ?? 0.55) * 100)}%`} wide>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={draft.minConfidence ?? 0.55}
								onChange={event => update('minConfidence', Number(event.target.value))}
								className="max-w-xs accent-[#1dab61]"
							/>
						</Field>
					</div>
					<div className="mt-3">
						<Toggle label={text.allowGroups} checked={draft.allowGroups} onChange={value => update('allowGroups', value)} />
					</div>
				</section>

				<p className={`wa-ag-note${draft.actorConfigured ? '' : ' is-warn'}`}>
					{draft.actorConfigured ? text.actorNote : text.actorMissing}
				</p>
				{draft.lastError ? (
					<p className="wa-ag-note is-bad">
						{text.lastError}: {draft.lastError}
					</p>
				) : null}
			</div>
		</form>
	);
}

/* ---------------------------------------------------------------- models */

function ModelsSection({ text, accountId, draft, setDraft, onSaved, alerts = [] }) {
	const [catalog, setCatalog] = useState(null);
	const [externals, setExternals] = useState([]);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState('');
	const [form, setForm] = useState(null);

	useEffect(() => {
		const controller = new AbortController();
		Promise.all([
			whatsappAiAgentApi.catalog(accountId, controller.signal),
			whatsappAiAgentApi.listExternalModels(accountId, controller.signal),
		])
			.then(([nextCatalog, nextExternals]) => {
				setCatalog(nextCatalog);
				setExternals(Array.isArray(nextExternals) ? nextExternals : []);
			})
			.catch(loadError => {
				if (!controller.signal.aborted) setError(apiErrorMessage(loadError, 'Failed to load'));
			});
		return () => controller.abort();
	}, [accountId]);

	const activate = async (provider, model, externalModelId = null) => {
		setBusy(`${provider}:${model || externalModelId}`);
		setError('');
		try {
			const next = await whatsappAiAgentApi.updateSettings(accountId, {
				...draftToPayload(draft),
				provider,
				model: model || 'auto',
				externalModelId,
			});
			setDraft(settingsToDraft(next));
			onSaved?.();
		} catch (saveError) {
			setError(apiErrorMessage(saveError, 'Failed to save'));
		} finally {
			setBusy('');
		}
	};

	const saveExternal = async event => {
		event.preventDefault();
		if (!form) return;
		setBusy('form');
		setError('');
		const payload = {
			preset: form.preset,
			label: form.label.trim(),
			baseUrl: form.baseUrl.trim(),
			model: form.model.trim(),
			apiKey: form.apiKey.trim(),
			isActive: form.isActive !== false,
		};
		try {
			const saved = form.id
				? await whatsappAiAgentApi.updateExternalModel(accountId, form.id, payload)
				: await whatsappAiAgentApi.createExternalModel(accountId, payload);
			setExternals(current => {
				const list = current.filter(item => item.id !== saved.id);
				return [saved, ...list];
			});
			setForm(null);
		} catch (saveError) {
			setError(apiErrorMessage(saveError, 'Failed to save'));
		} finally {
			setBusy('');
		}
	};

	const removeExternal = async item => {
		if (!window.confirm(text.extDeleteConfirm)) return;
		setError('');
		try {
			await whatsappAiAgentApi.deleteExternalModel(accountId, item.id);
			setExternals(current => current.filter(row => row.id !== item.id));
			if (draft.externalModelId === item.id) {
				setDraft(current => ({ ...current, provider: 'ai-free', model: 'auto', externalModelId: null }));
			}
		} catch (deleteError) {
			setError(apiErrorMessage(deleteError, 'Failed to delete'));
		}
	};

	const testExternal = async item => {
		setBusy(`test:${item.id}`);
		setError('');
		try {
			await whatsappAiAgentApi.testExternalModel(accountId, item.id);
			setExternals(current =>
				current.map(row => (row.id === item.id ? { ...row, lastTestOk: true, lastTestMessage: text.extTestOk } : row)),
			);
		} catch (testError) {
			setError(apiErrorMessage(testError, 'Test failed'));
		} finally {
			setBusy('');
		}
	};

	const presets = catalog?.externalPresets || [];
	const providers = catalog?.providers || [];
	const externalAlert = (alerts || []).find(item => item.provider === 'external');

	return (
		<div className="wa-ag-mods">
			<section className="wa-ag-mod">
				<h3>{text.builtInModels}</h3>
				<p className="wa-ag-hint">{text.builtInModelsHint}</p>
				{!providers.length ? (
					<div className="grid min-h-16 place-items-center"><Loader2 className="animate-spin text-[#1dab61]" /></div>
				) : (
					<div className="wa-ag-cards is-split">
						{providers.map(provider => {
							const alert = (alerts || []).find(item => item.provider === provider.name);
							return (
							<article key={provider.name} className="wa-ag-card">
								<h4>{provider.label}</h4>
								<p className="wa-ag-hint mt-1">{provider.description}</p>
								<div className="wa-ag-chips mt-3">
									{(provider.models || [{ id: 'auto', label: 'Auto' }]).map(item => {
										const active = draft.provider === provider.name && (draft.model || 'auto') === item.id;
										return (
											<button
												key={item.id}
												type="button"
												disabled={Boolean(busy)}
												onClick={() => void activate(provider.name, item.id, null)}
												className={`wa-ag-chip${active ? ' is-on' : ''}`}
											>
												{item.label}
												{active ? ` · ${text.inUse}` : ''}
											</button>
										);
									})}
								</div>
								{alert ? (
									<p className="wa-ag-note is-warn mt-2" role="status">
										{fillTemplate(text.modelFailedThisTurn, { model: provider.label, reason: alert.error })}
										{alert.recoveredBy
											? ` ${fillTemplate(text.modelSwitchedTo, { model: labelForProvider(alert.recoveredBy, text) })}`
											: ''}
									</p>
								) : null}
							</article>
							);
						})}
					</div>
				)}
			</section>

			<section className="wa-ag-mod">
				<div className="mb-2 flex items-center justify-between gap-2">
					<div>
						<h3 className="!mb-0">{text.externalModels}</h3>
						<p className="wa-ag-hint mt-1">{text.externalModelsHint}</p>
					</div>
					<button type="button" className="wa-ag-ghost" onClick={() => setForm({ preset: 'openai', label: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '', isActive: true })}>
						<Plus size={14} />
						{text.addExternal}
					</button>
				</div>
				{form ? (
					<form onSubmit={saveExternal} className="mb-3 rounded-2xl bg-[var(--ag-fill)] p-3">
						<div className="wa-ag-fields">
							<Field label={text.extPreset}>
								<div className="wa-ag-select">
									<WaCustomSelect
										ariaLabel={text.extPreset}
										value={form.preset}
										onChange={value => {
											const preset = presets.find(item => item.id === value);
											setForm(current => ({
												...current,
												preset: value,
												baseUrl: preset?.baseUrl || current.baseUrl,
												label: current.label || preset?.label || '',
											}));
										}}
										options={(presets.length ? presets : [{ id: 'custom', label: 'Custom' }]).map(item => ({ value: item.id, label: item.label }))}
									/>
								</div>
							</Field>
							<Field label={text.extLabel}>
								<input required value={form.label} onChange={event => setForm(current => ({ ...current, label: event.target.value }))} maxLength={80} dir="auto" className="wa-ag-input" />
							</Field>
							<Field label={text.extBaseUrl}>
								<input required={form.preset === 'custom'} value={form.baseUrl} onChange={event => setForm(current => ({ ...current, baseUrl: event.target.value }))} dir="ltr" className="wa-ag-input" />
							</Field>
							<Field label={text.extModel}>
								<input required value={form.model} onChange={event => setForm(current => ({ ...current, model: event.target.value }))} dir="ltr" className="wa-ag-input" />
							</Field>
							<Field label={text.extApiKey} hint={form.id ? text.extApiKeyKeep : undefined}>
								<input type="password" autoComplete="off" value={form.apiKey} onChange={event => setForm(current => ({ ...current, apiKey: event.target.value }))} className="wa-ag-input" />
							</Field>
						</div>
						<div className="mt-3 flex flex-wrap justify-end gap-2">
							<button type="button" className="wa-ag-ghost" onClick={() => setForm(null)}>{text.kbCancel}</button>
							<button type="submit" disabled={busy === 'form'} className="wa-ag-save">
								{busy === 'form' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
								{text.kbSave}
							</button>
						</div>
					</form>
				) : null}
				{externals.length === 0 && !form ? (
					<p className="wa-ag-empty">{text.extEmpty}</p>
				) : (
					<ul className="wa-ag-cards">
						{externals.map(item => {
							const active = draft.provider === 'external' && draft.externalModelId === item.id;
							return (
								<li key={item.id} className="wa-ag-card">
									<div className="flex flex-wrap items-start gap-2">
										<div className="min-w-0 flex-1">
											<h4 dir="auto">{item.label}</h4>
											<p className="wa-ag-hint mt-1 font-mono" dir="ltr">{item.model} · {item.baseUrl}</p>
											{item.keyLast4 ? <p className="wa-ag-hint">••••{item.keyLast4}</p> : null}
											{item.lastTestOk === false && item.lastTestMessage ? <p className="wa-ag-note is-bad">{item.lastTestMessage}</p> : null}
											{item.lastTestOk === true ? <p className="wa-ag-note is-ok">{text.extTestOk}</p> : null}
											{active && externalAlert ? (
												<p className="wa-ag-note is-warn">
													{fillTemplate(text.modelFailedThisTurn, { model: item.label, reason: externalAlert.error })}
													{externalAlert.recoveredBy
														? ` ${fillTemplate(text.modelSwitchedTo, { model: labelForProvider(externalAlert.recoveredBy, text) })}`
														: ''}
												</p>
											) : null}
										</div>
										<div className="flex flex-wrap gap-1">
											<button type="button" className={`wa-ag-chip${active ? ' is-on' : ''}`} disabled={Boolean(busy)} onClick={() => void activate('external', item.model, item.id)}>
												{active ? text.inUse : text.useThisModel}
											</button>
											<button type="button" className="wa-ag-ghost" disabled={Boolean(busy)} onClick={() => void testExternal(item)}>{text.extTest}</button>
											<button type="button" className="wa-ag-ghost" onClick={() => setForm({ ...item, apiKey: '' })}>{text.kbEdit}</button>
											<button type="button" className="wa-ag-ghost" onClick={() => void removeExternal(item)}>{text.kbDelete}</button>
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</section>
			{error ? <p className="wa-ag-note is-bad">{error}</p> : null}
		</div>
	);
}

/* -------------------------------------------------------------- knowledge */

const EMPTY_ENTRY = { category: 'faq', title: '', content: '', tagsText: '', isActive: true };

function KnowledgeSection({ text, accountId }) {
	const [entries, setEntries] = useState(null);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('all');
	const [editing, setEditing] = useState(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(
		async signal => {
			setError('');
			try {
				setEntries(await whatsappAiAgentApi.listKnowledge(accountId, signal));
			} catch (loadError) {
				if (signal?.aborted) return;
				setError(apiErrorMessage(loadError, 'Failed to load'));
				setEntries(current => current || []);
			}
		},
		[accountId],
	);

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, [load]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return (entries || []).filter(entry => {
			if (category !== 'all' && entry.category !== category) return false;
			if (!needle) return true;
			return [entry.title, entry.content, ...(entry.tags || [])].join(' ').toLowerCase().includes(needle);
		});
	}, [entries, query, category]);

	const save = async event => {
		event.preventDefault();
		if (!editing) return;
		setBusy(true);
		setError('');
		const payload = {
			category: editing.category,
			title: editing.title.trim(),
			content: editing.content.trim(),
			tags: splitList(editing.tagsText),
			isActive: Boolean(editing.isActive),
		};
		try {
			const saved = editing.id
				? await whatsappAiAgentApi.updateKnowledge(accountId, editing.id, payload)
				: await whatsappAiAgentApi.createKnowledge(accountId, payload);
			setEntries(current => {
				const list = current || [];
				return editing.id ? list.map(entry => (entry.id === saved.id ? saved : entry)) : [saved, ...list];
			});
			setEditing(null);
		} catch (saveError) {
			setError(apiErrorMessage(saveError, 'Failed to save'));
		} finally {
			setBusy(false);
		}
	};

	const remove = async entry => {
		if (!window.confirm(text.kbDeleteConfirm)) return;
		setError('');
		try {
			await whatsappAiAgentApi.deleteKnowledge(accountId, entry.id);
			setEntries(current => (current || []).filter(item => item.id !== entry.id));
			if (editing?.id === entry.id) setEditing(null);
		} catch (deleteError) {
			setError(apiErrorMessage(deleteError, 'Failed to delete'));
		}
	};

	const toggleActive = async entry => {
		setError('');
		try {
			const saved = await whatsappAiAgentApi.updateKnowledge(accountId, entry.id, {
				category: entry.category,
				title: entry.title,
				content: entry.content,
				tags: entry.tags,
				isActive: !entry.isActive,
			});
			setEntries(current => (current || []).map(item => (item.id === saved.id ? saved : item)));
		} catch (toggleError) {
			setError(apiErrorMessage(toggleError, 'Failed to save'));
		}
	};

	const categoryOptions = [
		{ value: 'all', label: text.kbAll },
		...CATEGORY_IDS.map(id => ({ value: id, label: text.categories[id] })),
	];

	return (
		<div className="wa-ag-mods">
			<section className="wa-ag-mod">
				<div className="mb-3 flex flex-wrap items-end gap-2">
					<Field label={text.kbSearch}>
						<div className="relative">
							<Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
							<input
								value={query}
								onChange={event => setQuery(event.target.value)}
								placeholder={text.kbSearch}
								aria-label={text.kbSearch}
								dir="auto"
								className="wa-ag-input ps-8"
							/>
						</div>
					</Field>
					<Chips
						ariaLabel={text.kbCategory}
						value={category}
						onChange={setCategory}
						options={categoryOptions}
					/>
					<button type="button" className="wa-ag-ghost" onClick={() => setEditing({ ...EMPTY_ENTRY })}>
						<Plus size={14} />
						{text.kbAdd}
					</button>
				</div>

				{editing ? (
					<form onSubmit={save} className="mb-3 rounded-2xl bg-[var(--ag-fill)] p-3">
						<div className="wa-ag-fields">
							<Field label={text.kbTitle}>
								<input
									required
									value={editing.title}
									onChange={event => setEditing(current => ({ ...current, title: event.target.value }))}
									maxLength={200}
									dir="auto"
									className="wa-ag-input"
								/>
							</Field>
							<Chips
								label={text.kbCategory}
								value={editing.category}
								onChange={value => setEditing(current => ({ ...current, category: value }))}
								options={CATEGORY_IDS.map(id => ({ value: id, label: text.categories[id] }))}
							/>
							<Field label={text.kbContent} wide>
								<textarea
									required
									value={editing.content}
									onChange={event => setEditing(current => ({ ...current, content: event.target.value }))}
									rows={5}
									maxLength={8000}
									dir="auto"
									className="wa-ag-area"
								/>
							</Field>
							<Field label={text.kbTags}>
								<input
									value={editing.tagsText}
									onChange={event => setEditing(current => ({ ...current, tagsText: event.target.value }))}
									dir="auto"
									className="wa-ag-input"
								/>
							</Field>
						</div>
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<Toggle label={editing.isActive ? text.kbActive : text.kbInactive} checked={Boolean(editing.isActive)} onChange={value => setEditing(current => ({ ...current, isActive: value }))} />
							<button type="button" className="wa-ag-ghost ms-auto" onClick={() => setEditing(null)}>{text.kbCancel}</button>
							<button type="submit" disabled={busy} className="wa-ag-save">
								{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
								{text.kbSave}
							</button>
						</div>
					</form>
				) : null}

				{error ? <p className="wa-ag-note is-bad">{error}</p> : null}
				{entries == null ? (
					<div className="grid min-h-24 place-items-center"><Loader2 className="animate-spin text-[#1dab61]" /></div>
				) : entries.length === 0 ? (
					<p className="wa-ag-empty">{text.kbEmpty}</p>
				) : filtered.length === 0 ? (
					<p className="wa-ag-empty">{text.kbNoMatch}</p>
				) : (
					<ul className="wa-ag-cards is-split">
						{filtered.map(entry => (
							<li key={entry.id} className={`wa-ag-card ${entry.isActive ? '' : 'opacity-60'}`}>
								<div className="mb-1 flex items-start gap-2">
									<span className="wa-ag-chip is-on !h-6 text-[10px]">{text.categories[entry.category] || entry.category}</span>
									<p className="min-w-0 flex-1 truncate text-[13.5px] font-bold" dir="auto">{entry.title}</p>
									<Switch label={entry.isActive ? text.kbActive : text.kbInactive} checked={entry.isActive} onChange={() => void toggleActive(entry)} />
								</div>
								<p className="line-clamp-3 text-xs leading-5 text-[var(--ag-muted)]" dir="auto">{entry.content}</p>
								{entry.tags?.length ? (
									<p className="mt-2 flex flex-wrap gap-1">
										{entry.tags.map(tag => (
											<span key={tag} className="wa-ag-chip !h-6 text-[10px]" dir="auto">#{tag}</span>
										))}
									</p>
								) : null}
								<div className="mt-2 flex justify-end gap-1">
									<button type="button" title={text.kbEdit} aria-label={text.kbEdit} onClick={() => setEditing({ ...entry, tagsText: (entry.tags || []).join(', ') })} className="wa-ag-ghost !h-8 !w-8 !px-0">
										<Pencil size={14} />
									</button>
									<button type="button" title={text.kbDelete} aria-label={text.kbDelete} onClick={() => void remove(entry)} className="wa-ag-ghost !h-8 !w-8 !px-0 text-rose-500">
										<Trash2 size={14} />
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

/* ------------------------------------------------------------------- test */

function TestSection({ text, accountId, draft, locale, onAlerts }) {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const controllerRef = useRef(null);
	const scrollRef = useRef(null);
	const inputRef = useRef(null);

	useEffect(() => () => controllerRef.current?.abort(), []);
	useEffect(() => {
		const node = scrollRef.current;
		if (node) node.scrollTop = node.scrollHeight;
	}, [messages, pending]);

	const reset = () => {
		controllerRef.current?.abort();
		setMessages([]);
		setPending(false);
		setError('');
		inputRef.current?.focus();
	};

	const send = async event => {
		event.preventDefault();
		const content = input.trim();
		if (!content || pending) return;
		const at = new Date();
		const transcript = [...messages, { role: 'customer', content, at }];
		setMessages(transcript);
		setInput('');
		setPending(true);
		setError('');
		const controller = new AbortController();
		controllerRef.current = controller;
		try {
			const result = await whatsappAiAgentApi.test(
				accountId,
				{
					messages: transcript
						.filter(item => item.role === 'customer' || (item.role === 'agent' && item.content))
						.slice(-30)
						.map(item => ({ role: item.role, content: item.content })),
					draft: draftToPayload(draft),
				},
				controller.signal,
			);
			if (result.providerAlerts) onAlerts?.(result.providerAlerts);
			setMessages(current => [
				...current,
				{
					role: 'agent',
					content: result.decision === 'skip' ? '' : result.reply,
					at: new Date(),
					result,
				},
			]);
		} catch (testError) {
			if (controller.signal.aborted) return;
			const alerts = testError?.response?.data?.providerAlerts;
			if (alerts) onAlerts?.(alerts);
			setError(apiErrorMessage(testError, 'Test failed'));
		} finally {
			if (controllerRef.current === controller) setPending(false);
		}
	};

	const agentName = draft.agentName || text.title;

	return (
		<div className="wa-ag-chat">
			<header className="wa-ag-chat-bar">
				<span className="wa-ag-chat-avatar" aria-hidden="true">
					<Bot size={18} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="wa-ag-chat-name" dir="auto">{agentName}</p>
					<p className="wa-ag-chat-status">{pending ? text.testThinking : text.testOnline}</p>
				</div>
				<button type="button" className="wa-ag-ghost" onClick={reset} disabled={!messages.length && !pending && !error}>
					<Trash2 size={14} />
					{text.testReset}
				</button>
			</header>
			<div ref={scrollRef} className="wa-ag-thread nice-scroll">
				<div className="wa-ag-day">{text.testToday}</div>
				{!messages.length && !pending ? (
					<div className="wa-ag-chat-empty">
						<p className="wa-ag-chat-empty-title">{text.testEmptyTitle}</p>
						<p>{text.testEmpty}</p>
						{draft.useKnowledgeBase ? <p className="wa-ag-chat-empty-kb">{text.testKbHint}</p> : null}
					</div>
				) : null}
				{messages.map((message, index) => {
					if (message.role === 'system') return null;
					const outbound = message.role === 'customer';
					const time = message.at ? formatClock(message.at instanceof Date ? message.at : new Date(message.at), locale) : '';
					return (
						<div key={`${message.role}-${index}`} className={`wa-ag-row${outbound ? ' is-out' : ''}`}>
							{!outbound && message.result?.fallbacks?.length ? (
								<p className="wa-ag-sys" role="status">
									{fillTemplate(text.fallbackBanner, {
										from: labelForProvider(message.result.fallbacks[0].provider, text),
										reason: message.result.fallbacks[0].error,
										to: labelForProvider(message.result.provider, text),
									})}
								</p>
							) : null}
							<div className={`wa-ag-bubble${outbound ? ' is-out' : ' is-in'}`}>
								{message.content ? (
									<p dir="auto">{message.content}</p>
								) : (
									<p className="italic text-[var(--ag-faint)]">{text.testNoReply}</p>
								)}
								{!outbound ? <TestResultMeta text={text} result={message.result} /> : null}
								<span className="wa-ag-time">{time}</span>
							</div>
						</div>
					);
				})}
				{pending ? (
					<div className="wa-ag-row">
						<div className="wa-ag-bubble is-in is-typing" aria-label={text.testThinking}>
							<i /><i /><i />
						</div>
					</div>
				) : null}
			</div>
			{error ? <p className="wa-ag-note is-bad wa-ag-chat-error" role="alert">{error}</p> : null}
			<form onSubmit={send} className="wa-ag-composer">
				<input
					ref={inputRef}
					value={input}
					onChange={event => setInput(event.target.value)}
					placeholder={text.testPlaceholder}
					aria-label={text.testPlaceholder}
					maxLength={2000}
					dir="auto"
					className="wa-ag-chat-input"
				/>
				<button type="submit" disabled={pending || !input.trim()} className="wa-ag-send" aria-label={text.testSend}>
					<Send size={16} className="rtl:-scale-x-100" />
				</button>
			</form>
		</div>
	);
}

function TestResultMeta({ text, result }) {
	if (!result) return null;
	const knowledge = (result.sources || []).filter(source => source.type === 'knowledge');
	return (
		<div className="wa-ag-meta">
			<p>
				<span>{text.delivery[result.delivery] || result.delivery}</span>
				<span dir="ltr"> · {labelForProvider(result.provider, text)}</span>
				{result.model ? <span dir="ltr"> · {result.model}</span> : null}
			</p>
			<p dir="auto">{text.sources}: {knowledge.length ? knowledge.map(source => source.title).join(' · ') : text.noSources}</p>
		</div>
	);
}

/* --------------------------------------------------------------- activity */

function ActivitySection({ text, accountId, locale }) {
	const [runs, setRuns] = useState(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const load = useCallback(
		async signal => {
			setLoading(true);
			setError('');
			try {
				setRuns(await whatsappAiAgentApi.listRuns(accountId, signal));
			} catch (loadError) {
				if (signal?.aborted) return;
				setError(apiErrorMessage(loadError, 'Failed to load'));
				setRuns(current => current || []);
			} finally {
				setLoading(false);
			}
		},
		[accountId],
	);
	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, [load]);
	const formatter = useMemo(
		() => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }),
		[locale],
	);
	return (
		<section className="wa-ag-mod">
			<div className="mb-2 flex justify-end">
				<button type="button" className="wa-ag-ghost" onClick={() => void load()} disabled={loading}>
					<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
					{text.refresh}
				</button>
			</div>
			{error ? <p className="wa-ag-note is-bad">{error}</p> : null}
			{runs == null ? (
				<div className="grid min-h-24 place-items-center"><Loader2 className="animate-spin text-[#1dab61]" /></div>
			) : runs.length === 0 ? (
				<p className="wa-ag-empty">{text.activityEmpty}</p>
			) : (
				<ul className="divide-y divide-[var(--ag-line)]">
					{runs.map(run => (
						<li key={run.id} className="space-y-1 py-2.5 text-xs">
							<div className="flex flex-wrap items-center gap-2">
								<span className="wa-ag-chip is-on !h-6 text-[10px]">{text.outcomes[run.outcome] || run.outcome}</span>
								<span className="text-[var(--ag-faint)]">{run.createdAt ? formatter.format(new Date(run.createdAt)) : ''}</span>
								{run.latencyMs != null ? <span className="text-[var(--ag-faint)]" dir="ltr">{Math.round(run.latencyMs / 100) / 10}s</span> : null}
							</div>
							{run.reply ? <p className="line-clamp-2 text-[var(--ag-muted)]" dir="auto">{run.reply}</p> : null}
							{run.error ? <p className="wa-ag-note is-bad">{run.error}</p> : null}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

/* ------------------------------------------------------------------ panel */

export default function WhatsAppAiAgentPanel({ locale = 'en', accountId }) {
	const lang = String(locale).toLowerCase().startsWith('ar') ? 'ar' : 'en';
	const text = agentCopy(locale);
	const [section, setSection] = useState('setup');
	const [draft, setDraft] = useState(null);
	const [loadError, setLoadError] = useState('');
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [saveError, setSaveError] = useState('');

	useEffect(() => {
		if (!accountId) return undefined;
		const controller = new AbortController();
		setDraft(null);
		setLoadError('');
		whatsappAiAgentApi
			.getSettings(accountId, controller.signal)
			.then(settings => setDraft(settingsToDraft(settings)))
			.catch(error => {
				if (!controller.signal.aborted) setLoadError(apiErrorMessage(error, 'Failed to load'));
			});
		return () => controller.abort();
	}, [accountId]);

	const setDraftDirty = useCallback(updater => {
		setSaved(false);
		setDraft(updater);
	}, []);

	const submit = async event => {
		event.preventDefault();
		if (!draft) return;
		setSaving(true);
		setSaveError('');
		try {
			const next = await whatsappAiAgentApi.updateSettings(accountId, draftToPayload(draft));
			setDraft(settingsToDraft(next));
			setSaved(true);
		} catch (error) {
			setSaveError(apiErrorMessage(error, 'Failed to save'));
		} finally {
			setSaving(false);
		}
	};

	const tabs = [
		{ id: 'setup', label: text.tabs.setup, icon: Settings2 },
		{ id: 'models', label: text.tabs.models, icon: Cpu },
		{ id: 'knowledge', label: text.tabs.knowledge, icon: BookOpen },
		{ id: 'test', label: text.tabs.test, icon: FlaskConical },
		{ id: 'activity', label: text.tabs.activity, icon: Activity },
	];

	const live = draft
		? draft.enabled
			? draft.defaultMode === 'auto'
				? text.chip.auto
				: text.chip.suggest
			: text.chip.off
		: null;

	return (
		<section data-wa-ai-agent-panel className={`wa-ag${section === 'test' ? ' is-test' : ''}`}>
			<div className="wa-ag-head">
				<div className="wa-ag-mark">
					<Bot size={20} />
				</div>
				<div className="min-w-0 flex-1">
					<h2>{text.title}</h2>
					<p>{text.description}</p>
				</div>
				{live ? (
					<span className={`wa-ag-live${draft.enabled ? ' is-on' : ''}`}>
						<i />
						{live}
					</span>
				) : null}
			</div>

			<div role="tablist" aria-label={text.title} className="wa-ag-tabs">
				{tabs.map(tab => {
					const Icon = tab.icon;
					const selected = section === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={selected}
							onClick={() => setSection(tab.id)}
							className={`wa-ag-tab${selected ? ' is-on' : ''}`}
						>
							<Icon size={14} />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{loadError ? (
				<p className="wa-ag-note is-bad flex items-center gap-2"><X size={14} />{loadError}</p>
			) : !draft ? (
				<div className="grid min-h-32 place-items-center"><Loader2 className="animate-spin text-[#1dab61]" /></div>
			) : section === 'setup' ? (
				<SetupSection text={text} lang={lang} draft={draft} setDraft={setDraftDirty} saving={saving} saved={saved} error={saveError} onSubmit={submit} />
			) : section === 'models' ? (
				<ModelsSection text={text} accountId={accountId} draft={draft} setDraft={setDraftDirty} onSaved={() => setSaved(true)} alerts={draft.providerAlerts || []} />
			) : section === 'knowledge' ? (
				<KnowledgeSection text={text} accountId={accountId} />
			) : section === 'test' ? (
				<TestSection
					text={text}
					accountId={accountId}
					draft={draft}
					locale={locale}
					onAlerts={alerts => setDraft(current => ({ ...current, providerAlerts: alerts }))}
				/>
			) : (
				<ActivitySection text={text} accountId={accountId} locale={locale} />
			)}
		</section>
	);
}
