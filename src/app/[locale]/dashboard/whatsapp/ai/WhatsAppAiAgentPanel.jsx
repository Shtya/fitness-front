'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Activity,
	AlertTriangle,
	BookOpen,
	Bot,
	Check,
	Cpu,
	FlaskConical,
	Info,
	KeyRound,
	Loader2,
	Pencil,
	Plug,
	Plus,
	RefreshCw,
	RotateCcw,
	Save,
	Search,
	Send,
	Settings2,
	Sparkles,
	Trash2,
	X,
	Zap,
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

/** A setting row: what it does on one side, its switch on the other. */
function Toggle({ label, hint, checked, onChange }) {
	return (
		<div className="wa-ag-toggle">
			<div className="wa-ag-toggle-text">
				<p className="wa-ag-toggle-label">{label}</p>
				{hint ? <p className="wa-ag-hint">{hint}</p> : null}
			</div>
			<Switch label={label} checked={Boolean(checked)} onChange={onChange} />
		</div>
	);
}

function Field({ label, hint, wide, num, aside, children }) {
	return (
		<div className={`wa-ag-field${wide ? ' is-wide' : ''}${num ? ' is-num' : ''}`}>
			{label || aside ? (
				<span className="wa-ag-label-row">
					{label ? <span className="wa-ag-label">{label}</span> : null}
					{aside ? <span className="wa-ag-aside">{aside}</span> : null}
				</span>
			) : null}
			{children}
			{hint ? <span className="wa-ag-hint">{hint}</span> : null}
		</div>
	);
}

function Chips({ label, value, onChange, options, ariaLabel, wide = true }) {
	return (
		<div className={`wa-ag-field${wide ? ' is-wide' : ''}`}>
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
						{value === option.value ? <Check size={13} strokeWidth={2.6} aria-hidden /> : null}
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

/** Settings group: title and a one-line explanation beside (or above) its controls. */
function Group({ title, hint, children }) {
	return (
		<section className="wa-ag-group">
			<header className="wa-ag-group-head">
				<h3>{title}</h3>
				{hint ? <p>{hint}</p> : null}
			</header>
			<div className="wa-ag-group-body">{children}</div>
		</section>
	);
}

/** Comma lists read back as chips, so a typo or a missing comma is visible at once. */
function ListPreview({ value, tone }) {
	const items = splitList(value);
	if (!items.length) return null;
	return (
		<span className="wa-ag-preview">
			{items.slice(0, 12).map(item => (
				<span key={item} className={`wa-ag-tag${tone ? ` is-${tone}` : ''}`} dir="auto">
					{item}
				</span>
			))}
			{items.length > 12 ? <span className="wa-ag-tag">+{items.length - 12}</span> : null}
		</span>
	);
}

function NumberInput({ value, onChange, min, max, unit }) {
	return (
		<span className="wa-ag-num">
			<input type="number" min={min} max={max} value={value} onChange={event => onChange(event.target.value)} className="wa-ag-input" />
			{unit ? <span className="wa-ag-unit">{unit}</span> : null}
		</span>
	);
}

function Callout({ tone = 'info', icon: Icon = Info, children, role }) {
	return (
		<div className={`wa-ag-callout is-${tone}`} role={role}>
			<Icon size={16} aria-hidden />
			<div>{children}</div>
		</div>
	);
}

function Loading() {
	return (
		<div className="wa-ag-loading" role="status" aria-live="polite">
			<Loader2 size={20} className="animate-spin" aria-hidden />
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

function applyRecommended(draft) {
	if (!draft?.recommended) return draft;
	return settingsToDraft({ ...draft, ...draft.recommended });
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

const counter = (text, value, max) => fillTemplate(text.chars, { count: String(value || '').length, max });

/* ------------------------------------------------------------------ setup */

function SetupSection({ text, lang, draft, setDraft, saving, saved, dirty, error, onSubmit, onApplyRecommended, onOpenModels }) {
	const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
	const updatePermission = (key, value) =>
		setDraft(current => ({ ...current, permissions: { ...current.permissions, [key]: value } }));
	const confidence = Math.round(Number(draft.minConfidence ?? 0.55) * 100);

	return (
		<form onSubmit={onSubmit} className="wa-ag-setup">
			<section className={`wa-ag-status${draft.enabled ? ' is-on' : ''}`} aria-label={text.statusTitle}>
				<div className="wa-ag-status-cell is-power">
					<div className="wa-ag-status-power">
						<div className="min-w-0">
							<p className="wa-ag-status-title">{text.enabled}</p>
							<p className="wa-ag-hint">
								{draft.enabled ? (draft.defaultMode === 'auto' ? text.chip.auto : text.chip.suggest) : text.enabledHint}
							</p>
						</div>
						<Switch label={text.enabled} checked={Boolean(draft.enabled)} onChange={value => update('enabled', value)} />
					</div>
				</div>
				<div className="wa-ag-status-cell">
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
				<div className="wa-ag-status-cell">
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
				<div className="wa-ag-status-cell">
					<span className="wa-ag-label">{text.provider}</span>
					<div className="wa-ag-model">
						<span className="wa-ag-model-icon" aria-hidden>
							<Cpu size={16} />
						</span>
						<span className="min-w-0 flex-1">
							<b dir="auto">{providerLabel(draft, text)}</b>
							<span dir="ltr">{text.model}: {draft.model || 'auto'}</span>
						</span>
						<button type="button" className="wa-ag-link" onClick={onOpenModels}>
							{text.changeModel}
						</button>
					</div>
				</div>
			</section>

			{!draft.actorConfigured ? <Callout tone="warn" icon={AlertTriangle}>{text.actorMissing}</Callout> : null}
			{draft.lastError ? (
				<Callout tone="bad" icon={AlertTriangle}>
					{text.lastError}: {draft.lastError}
				</Callout>
			) : null}

			<div className="wa-ag-groups">
				<Group title={text.sectionIdentity} hint={text.identityHint}>
					<div className="wa-ag-grid">
						<Field label={text.agentName}>
							<input value={draft.agentName || ''} onChange={event => update('agentName', event.target.value)} maxLength={80} dir="auto" className="wa-ag-input" />
						</Field>
						<Field label={text.businessName}>
							<input value={draft.businessName || ''} onChange={event => update('businessName', event.target.value)} maxLength={120} dir="auto" className="wa-ag-input" />
						</Field>
						<Field label={text.persona} wide aside={counter(text, draft.persona, 2000)}>
							<textarea value={draft.persona || ''} onChange={event => update('persona', event.target.value)} rows={4} maxLength={2000} dir="auto" className="wa-ag-area" />
						</Field>
						<Chips label={text.dialect} value={draft.dialect} onChange={value => update('dialect', value)} options={DIALECTS[lang]} />
						<Chips label={text.tone} value={draft.tone} onChange={value => update('tone', value)} options={TONES[lang]} />
						<Field label={text.replyLength} wide>
							<Segmented ariaLabel={text.replyLength} value={draft.replyLength} onChange={value => update('replyLength', value)} options={LENGTHS[lang]} />
						</Field>
					</div>
				</Group>

				<Group title={text.sectionRules} hint={text.rulesHint}>
					<div className="wa-ag-grid">
						<Field label={text.rules} wide aside={counter(text, draft.rules, 4000)}>
							<textarea value={draft.rules || ''} onChange={event => update('rules', event.target.value)} rows={7} maxLength={4000} dir="auto" className="wa-ag-area" />
						</Field>
						<Field label={text.allowedTopics}>
							<input value={draft.allowedTopicsText} onChange={event => update('allowedTopicsText', event.target.value)} dir="auto" className="wa-ag-input" />
							<ListPreview value={draft.allowedTopicsText} tone="ok" />
						</Field>
						<Field label={text.forbiddenTopics}>
							<input value={draft.forbiddenTopicsText} onChange={event => update('forbiddenTopicsText', event.target.value)} dir="auto" className="wa-ag-input" />
							<ListPreview value={draft.forbiddenTopicsText} tone="bad" />
						</Field>
					</div>
				</Group>

				<Group title={text.sectionPermissions} hint={text.permissionsHint}>
					<div className="wa-ag-toggles">
						<Toggle label={text.permQuote} checked={draft.permissions?.quotePrices} onChange={value => updatePermission('quotePrices', value)} />
						<Toggle label={text.permCommit} checked={draft.permissions?.makeCommitments} onChange={value => updatePermission('makeCommitments', value)} />
						<Toggle label={text.permDiscount} checked={draft.permissions?.offerDiscounts} onChange={value => updatePermission('offerDiscounts', value)} />
						<Toggle label={text.permLinks} checked={draft.permissions?.shareLinks} onChange={value => updatePermission('shareLinks', value)} />
					</div>
				</Group>

				<Group title={text.sectionContext} hint={text.contextHint}>
					<div className="wa-ag-toggles">
						<Toggle label={text.useKnowledgeBase} checked={draft.useKnowledgeBase} onChange={value => update('useKnowledgeBase', value)} />
						<Toggle label={text.knowledgeOnly} hint={text.knowledgeOnlyHint} checked={draft.knowledgeOnly} onChange={value => update('knowledgeOnly', value)} />
						<Toggle label={text.useContactMemory} checked={draft.useContactMemory} onChange={value => update('useContactMemory', value)} />
					</div>
					<div className="wa-ag-grid mt-4">
						<Field label={text.contextLimit} num>
							<NumberInput min="4" max="40" value={draft.contextMessageLimit ?? 12} onChange={value => update('contextMessageLimit', value)} />
						</Field>
					</div>
				</Group>

				<Group title={text.sectionDisclosure} hint={text.disclosureHint}>
					<div className="wa-ag-toggles">
						<Toggle label={text.discloseAi} checked={draft.discloseAi} onChange={value => update('discloseAi', value)} />
					</div>
					{draft.discloseAi ? (
						<div className="wa-ag-grid mt-4">
							<Field label={text.disclosureText} wide aside={counter(text, draft.disclosureText, 300)}>
								<input value={draft.disclosureText || ''} onChange={event => update('disclosureText', event.target.value)} maxLength={300} dir="auto" className="wa-ag-input" />
							</Field>
						</div>
					) : null}
				</Group>

				<Group title={text.sectionHandoff} hint={text.handoffHint}>
					<div className="wa-ag-grid">
						<Field label={text.handoffKeywords} hint={text.handoffKeywordsHint}>
							<input value={draft.handoffKeywordsText} onChange={event => update('handoffKeywordsText', event.target.value)} dir="auto" className="wa-ag-input" />
							<ListPreview value={draft.handoffKeywordsText} />
						</Field>
						<Field label={text.handoffMessage}>
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
					</div>
					<div className="wa-ag-toggles mt-3">
						<Toggle label={text.allowGroups} checked={draft.allowGroups} onChange={value => update('allowGroups', value)} />
					</div>
				</Group>

				<Group title={text.sectionTiming} hint={text.timingHint}>
					<div className="wa-ag-grid is-3">
						<Field label={text.debounce} num>
							<NumberInput min="2" max="120" value={draft.debounceSeconds ?? 8} onChange={value => update('debounceSeconds', value)} unit={text.unitSeconds} />
						</Field>
						<Field label={text.humanPause} num>
							<NumberInput min="1" max="1440" value={draft.humanPauseMinutes ?? 30} onChange={value => update('humanPauseMinutes', value)} unit={text.unitMinutes} />
						</Field>
						<Field label={text.maxPerHour} num>
							<NumberInput min="1" max="120" value={draft.maxRepliesPerHour ?? 12} onChange={value => update('maxRepliesPerHour', value)} unit={text.unitPerHour} />
						</Field>
						<Field label={text.minConfidence} wide aside={<span dir="ltr">{confidence}%</span>}>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={draft.minConfidence ?? 0.55}
								onChange={event => update('minConfidence', Number(event.target.value))}
								className="wa-ag-range"
								style={{ '--ag-range': `${confidence}%` }}
								aria-valuetext={`${confidence}%`}
							/>
						</Field>
					</div>
				</Group>

				{draft.actorConfigured ? <p className="wa-ag-footnote">{text.actorNote}</p> : null}
			</div>

			<div className={`wa-ag-savebar${dirty ? ' is-dirty' : ''}`}>
				<p className="wa-ag-savebar-state" role="status" aria-live="polite">
					{error ? (
						<span className="is-bad">
							<AlertTriangle size={14} aria-hidden />
							{error}
						</span>
					) : dirty ? (
						<span className="is-dirty">
							<i aria-hidden />
							{text.unsaved}
						</span>
					) : saved ? (
						<span className="is-ok">
							<Check size={14} strokeWidth={2.6} aria-hidden />
							{text.saved}
						</span>
					) : (
						<span>{text.allSaved}</span>
					)}
				</p>
				{draft.recommended ? (
					<button type="button" className="wa-ag-ghost" onClick={onApplyRecommended} disabled={saving} title={text.applyRecommendedHint}>
						<Sparkles size={14} />
						<span className="wa-ag-hide-sm">{text.applyRecommended}</span>
					</button>
				) : null}
				<button type="submit" disabled={saving} className="wa-ag-save">
					{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
					{text.save}
				</button>
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
		<div className="wa-ag-stack">
			<div className="wa-ag-current">
				<span className="wa-ag-model-icon" aria-hidden>
					<Cpu size={18} />
				</span>
				<span className="min-w-0 flex-1">
					<span className="wa-ag-label">{text.currentModel}</span>
					<b dir="auto">
						{providerLabel(draft, text)}
						<span className="wa-ag-current-model" dir="ltr"> · {draft.model || 'auto'}</span>
					</b>
				</span>
			</div>
			<Callout tone="info" icon={KeyRound} role="note">{text.apiKeyPlaceHint}</Callout>
			{error ? <Callout tone="bad" icon={AlertTriangle} role="alert">{error}</Callout> : null}

			<section className="wa-ag-panel">
				<header className="wa-ag-panel-head">
					<div>
						<h3>{text.builtInModels}</h3>
						<p>{text.builtInModelsHint}</p>
					</div>
				</header>
				{!providers.length && !error ? (
					<Loading />
				) : (
					<div className="wa-ag-providers">
						{providers.map(provider => {
							const alert = (alerts || []).find(item => item.provider === provider.name);
							const providerActive = draft.provider === provider.name;
							return (
								<article key={provider.name} className={`wa-ag-provider${providerActive ? ' is-active' : ''}`}>
									<div className="wa-ag-provider-head">
										<h4>{provider.label}</h4>
										{providerActive ? (
											<span className="wa-ag-badge is-ok">
												<Check size={12} strokeWidth={2.8} aria-hidden />
												{text.inUse}
											</span>
										) : null}
									</div>
									{provider.description ? <p className="wa-ag-hint">{provider.description}</p> : null}
									<div className="wa-ag-chips">
										{(provider.models || [{ id: 'auto', label: 'Auto' }]).map(item => {
											const active = providerActive && (draft.model || 'auto') === item.id;
											const loading = busy === `${provider.name}:${item.id}`;
											return (
												<button
													key={item.id}
													type="button"
													disabled={Boolean(busy)}
													aria-pressed={active}
													onClick={() => void activate(provider.name, item.id, null)}
													className={`wa-ag-chip${active ? ' is-on' : ''}`}
												>
													{loading ? <Loader2 size={13} className="animate-spin" aria-hidden /> : active ? <Check size={13} strokeWidth={2.6} aria-hidden /> : null}
													<span dir="ltr">{item.label}</span>
												</button>
											);
										})}
									</div>
									{alert ? (
										<Callout tone="warn" icon={AlertTriangle} role="status">
											{fillTemplate(text.modelFailedThisTurn, { model: provider.label, reason: alert.error })}
											{alert.recoveredBy
												? ` ${fillTemplate(text.modelSwitchedTo, { model: labelForProvider(alert.recoveredBy, text) })}`
												: ''}
										</Callout>
									) : null}
								</article>
							);
						})}
					</div>
				)}
			</section>

			<section className="wa-ag-panel">
				<header className="wa-ag-panel-head">
					<div>
						<h3>{text.externalModels}</h3>
						<p>{text.externalModelsHint}</p>
					</div>
					{!form ? (
						<button type="button" className="wa-ag-ghost" onClick={() => setForm({ preset: 'openai', label: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '', isActive: true })}>
							<Plus size={14} />
							{text.addExternal}
						</button>
					) : null}
				</header>
				{form ? (
					<form onSubmit={saveExternal} className="wa-ag-editor">
						<div className="wa-ag-grid">
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
								<input required={form.preset === 'custom'} value={form.baseUrl} onChange={event => setForm(current => ({ ...current, baseUrl: event.target.value }))} dir="ltr" className="wa-ag-input is-mono" />
							</Field>
							<Field label={text.extModel}>
								<input required value={form.model} onChange={event => setForm(current => ({ ...current, model: event.target.value }))} dir="ltr" className="wa-ag-input is-mono" />
							</Field>
							<Field label={text.extApiKey} hint={form.id ? text.extApiKeyKeep : undefined} wide>
								<input type="password" autoComplete="off" value={form.apiKey} onChange={event => setForm(current => ({ ...current, apiKey: event.target.value }))} className="wa-ag-input" />
							</Field>
						</div>
						<div className="wa-ag-editor-foot">
							<button type="button" className="wa-ag-ghost" onClick={() => setForm(null)}>{text.kbCancel}</button>
							<button type="submit" disabled={busy === 'form'} className="wa-ag-save">
								{busy === 'form' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
								{text.kbSave}
							</button>
						</div>
					</form>
				) : null}
				{externals.length === 0 && !form ? (
					<div className="wa-ag-empty">
						<span className="wa-ag-empty-icon" aria-hidden>
							<Plug size={20} />
						</span>
						<p>{text.extEmpty}</p>
					</div>
				) : externals.length ? (
					<ul className="wa-ag-rows">
						{externals.map(item => {
							const active = draft.provider === 'external' && draft.externalModelId === item.id;
							const testing = busy === `test:${item.id}`;
							return (
								<li key={item.id} className={`wa-ag-ext${active ? ' is-active' : ''}`}>
									<span className="wa-ag-model-icon" aria-hidden>
										<Plug size={16} />
									</span>
									<div className="min-w-0 flex-1">
										<p className="wa-ag-ext-name">
											<span dir="auto">{item.label}</span>
											{active ? <span className="wa-ag-badge is-ok">{text.inUse}</span> : null}
											{item.lastTestOk === true ? <span className="wa-ag-badge is-ok">{text.extTestOk}</span> : null}
										</p>
										<p className="wa-ag-ext-meta" dir="ltr">
											{item.model} · {item.baseUrl}
											{item.keyLast4 ? ` · ••••${item.keyLast4}` : ''}
										</p>
										{item.lastTestOk === false && item.lastTestMessage ? <p className="wa-ag-note is-bad">{item.lastTestMessage}</p> : null}
										{active && externalAlert ? (
											<p className="wa-ag-note is-warn">
												{fillTemplate(text.modelFailedThisTurn, { model: item.label, reason: externalAlert.error })}
												{externalAlert.recoveredBy
													? ` ${fillTemplate(text.modelSwitchedTo, { model: labelForProvider(externalAlert.recoveredBy, text) })}`
													: ''}
											</p>
										) : null}
									</div>
									<div className="wa-ag-ext-actions">
										{active ? null : (
											<button type="button" className="wa-ag-ghost is-accent" disabled={Boolean(busy)} onClick={() => void activate('external', item.model, item.id)}>
												{text.useThisModel}
											</button>
										)}
										<button type="button" className="wa-ag-ghost" disabled={Boolean(busy)} onClick={() => void testExternal(item)}>
											{testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
											<span className="wa-ag-hide-sm">{text.extTest}</span>
										</button>
										<button type="button" className="wa-ag-icon" title={text.kbEdit} aria-label={text.kbEdit} onClick={() => setForm({ ...item, apiKey: '' })}>
											<Pencil size={14} />
										</button>
										<button type="button" className="wa-ag-icon is-danger" title={text.kbDelete} aria-label={text.kbDelete} onClick={() => void removeExternal(item)}>
											<Trash2 size={14} />
										</button>
									</div>
								</li>
							);
						})}
					</ul>
				) : null}
			</section>
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

	const addStarter = async () => {
		setBusy(true);
		setError('');
		try {
			const added = await whatsappAiAgentApi.addStarterKnowledge(accountId);
			if (Array.isArray(added) && added.length) {
				setEntries(current => [...added, ...(current || [])]);
			}
		} catch (starterError) {
			setError(apiErrorMessage(starterError, 'Failed to save'));
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

	const counts = useMemo(() => {
		const out = { all: (entries || []).length };
		for (const entry of entries || []) out[entry.category] = (out[entry.category] || 0) + 1;
		return out;
	}, [entries]);

	const categoryOptions = [
		{ value: 'all', label: text.kbAll },
		...CATEGORY_IDS.map(id => ({ value: id, label: text.categories[id] })),
	];

	return (
		<div className="wa-ag-stack">
			<div className="wa-ag-toolbar">
				<label className="wa-ag-search">
					<Search size={15} aria-hidden />
					<input
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder={text.kbSearch}
						aria-label={text.kbSearch}
						dir="auto"
					/>
					{query ? (
						<button type="button" onClick={() => setQuery('')} aria-label={text.kbCancel}>
							<X size={14} />
						</button>
					) : null}
				</label>
				<button type="button" className="wa-ag-ghost" onClick={() => void addStarter()} disabled={busy}>
					{busy && !editing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
					<span className="wa-ag-hide-sm">{text.kbStarter}</span>
				</button>
				<button type="button" className="wa-ag-save" onClick={() => setEditing({ ...EMPTY_ENTRY })}>
					<Plus size={15} />
					{text.kbAdd}
				</button>
			</div>

			{entries?.length ? (
				<div className="wa-ag-filter" role="tablist" aria-label={text.kbCategory}>
					{categoryOptions.map(option => (
						<button
							key={option.value}
							type="button"
							role="tab"
							aria-selected={category === option.value}
							onClick={() => setCategory(option.value)}
							className={`wa-ag-filter-btn${category === option.value ? ' is-on' : ''}`}
						>
							{option.label}
							<span>{counts[option.value] || 0}</span>
						</button>
					))}
				</div>
			) : null}

			{editing ? (
				<form onSubmit={save} className="wa-ag-panel wa-ag-editor is-raised">
					<header className="wa-ag-panel-head">
						<div>
							<h3>{editing.id ? text.kbEditTitle : text.kbNewTitle}</h3>
						</div>
						<button type="button" className="wa-ag-icon" onClick={() => setEditing(null)} aria-label={text.kbCancel} title={text.kbCancel}>
							<X size={16} />
						</button>
					</header>
					<div className="wa-ag-grid">
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
						<Field label={text.kbTags}>
							<input
								value={editing.tagsText}
								onChange={event => setEditing(current => ({ ...current, tagsText: event.target.value }))}
								dir="auto"
								className="wa-ag-input"
							/>
							<ListPreview value={editing.tagsText} />
						</Field>
						<Chips
							label={text.kbCategory}
							value={editing.category}
							onChange={value => setEditing(current => ({ ...current, category: value }))}
							options={CATEGORY_IDS.map(id => ({ value: id, label: text.categories[id] }))}
						/>
						<Field label={text.kbContent} wide aside={counter(text, editing.content, 8000)}>
							<textarea
								required
								value={editing.content}
								onChange={event => setEditing(current => ({ ...current, content: event.target.value }))}
								rows={7}
								maxLength={8000}
								dir="auto"
								className="wa-ag-area"
							/>
						</Field>
					</div>
					<div className="wa-ag-editor-foot">
						<label className="wa-ag-inline-switch">
							<Switch label={editing.isActive ? text.kbActive : text.kbInactive} checked={Boolean(editing.isActive)} onChange={value => setEditing(current => ({ ...current, isActive: value }))} />
							<span>{editing.isActive ? text.kbActive : text.kbInactive}</span>
						</label>
						<button type="button" className="wa-ag-ghost ms-auto" onClick={() => setEditing(null)}>{text.kbCancel}</button>
						<button type="submit" disabled={busy} className="wa-ag-save">
							{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
							{text.kbSave}
						</button>
					</div>
				</form>
			) : null}

			{error ? <Callout tone="bad" icon={AlertTriangle} role="alert">{error}</Callout> : null}
			{entries == null ? (
				<Loading />
			) : entries.length === 0 ? (
				<div className="wa-ag-empty is-large">
					<span className="wa-ag-empty-icon" aria-hidden>
						<BookOpen size={22} />
					</span>
					<p>{text.kbEmpty}</p>
					<button type="button" className="wa-ag-save" onClick={() => void addStarter()} disabled={busy}>
						{busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
						{text.kbStarter}
					</button>
					<p className="wa-ag-hint">{text.kbStarterHint}</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="wa-ag-empty">
					<span className="wa-ag-empty-icon" aria-hidden>
						<Search size={20} />
					</span>
					<p>{text.kbNoMatch}</p>
				</div>
			) : (
				<ul className="wa-ag-entries">
					{filtered.map(entry => (
						<li key={entry.id} className={`wa-ag-entry${entry.isActive ? '' : ' is-off'}${editing?.id === entry.id ? ' is-editing' : ''}`}>
							<div className="wa-ag-entry-head">
								<span className={`wa-ag-cat is-${entry.category}`}>{text.categories[entry.category] || entry.category}</span>
								<Switch label={entry.isActive ? text.kbActive : text.kbInactive} checked={entry.isActive} onChange={() => void toggleActive(entry)} />
							</div>
							<p className="wa-ag-entry-title" dir="auto">{entry.title}</p>
							<p className="wa-ag-entry-body" dir="auto">{entry.content}</p>
							<div className="wa-ag-entry-foot">
								<span className="wa-ag-preview">
									{(entry.tags || []).slice(0, 4).map(tag => (
										<span key={tag} className="wa-ag-tag" dir="auto">#{tag}</span>
									))}
								</span>
								<span className="wa-ag-entry-actions">
									<button type="button" title={text.kbEdit} aria-label={`${text.kbEdit}: ${entry.title}`} onClick={() => setEditing({ ...entry, tagsText: (entry.tags || []).join(', ') })} className="wa-ag-icon">
										<Pencil size={14} />
									</button>
									<button type="button" title={text.kbDelete} aria-label={`${text.kbDelete}: ${entry.title}`} onClick={() => void remove(entry)} className="wa-ag-icon is-danger">
										<Trash2 size={14} />
									</button>
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
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
					<p className="wa-ag-chat-status">
						{pending ? text.testThinking : `${providerLabel(draft, text)} · ${text.testOnline}`}
					</p>
				</div>
				<button type="button" className="wa-ag-chat-clear" onClick={reset} disabled={!messages.length && !pending && !error}>
					<RotateCcw size={14} />
					<span className="wa-ag-hide-sm">{text.testReset}</span>
				</button>
			</header>
			<div ref={scrollRef} className="wa-ag-thread nice-scroll">
				<div className="wa-ag-day">{text.testToday}</div>
				{!messages.length && !pending ? (
					<div className="wa-ag-chat-empty">
						<span className="wa-ag-empty-icon" aria-hidden>
							<FlaskConical size={20} />
						</span>
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
									<p className="wa-ag-bubble-empty">{text.testNoReply}</p>
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
			{error ? <p className="wa-ag-chat-error" role="alert"><AlertTriangle size={14} aria-hidden />{error}</p> : null}
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
					{pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="rtl:-scale-x-100" />}
				</button>
			</form>
		</div>
	);
}

function formatUsd(value) {
	if (value == null || !Number.isFinite(Number(value))) return null;
	const n = Number(value);
	if (n === 0) return '$0';
	if (n < 0.0001) return `$${n.toFixed(6)}`;
	if (n < 0.01) return `$${n.toFixed(4)}`;
	return `$${n.toFixed(4)}`;
}

function costLabel(text, costSource) {
	if (costSource === 'provider') return text.costProvider;
	if (costSource === 'free') return text.costFree;
	return text.costEstimated;
}

function TestResultMeta({ text, result }) {
	if (!result) return null;
	const knowledge = (result.sources || []).filter(source => source.type === 'knowledge');
	const cost = formatUsd(result.estimatedCostUsd ?? result.usage?.estimatedCostUsd);
	const tokens = result.totalTokens ?? result.usage?.totalTokens;
	return (
		<div className="wa-ag-meta">
			<p>
				<span className={`wa-ag-delivery is-${String(result.delivery || '').replace('would_', '')}`}>{text.delivery[result.delivery] || result.delivery}</span>
				<span dir="ltr"> · {labelForProvider(result.provider, text)}</span>
				{result.model ? <span dir="ltr"> · {result.model}</span> : null}
			</p>
			{cost != null || tokens ? (
				<p dir="ltr">
					{text.requestCost}: {cost || '—'}
					{result.costSource || result.usage?.costSource
						? ` (${costLabel(text, result.costSource || result.usage?.costSource)})`
						: ''}
					{tokens != null ? ` · ${fillTemplate(text.requestTokens, { total: tokens })}` : ''}
				</p>
			) : null}
			<p dir="auto">{text.sources}: {knowledge.length ? knowledge.map(source => source.title).join(' · ') : text.noSources}</p>
		</div>
	);
}

/* --------------------------------------------------------------- activity */

const OUTCOME_TONE = {
	sent: 'ok',
	approved: 'ok',
	suggested: 'draft',
	handoff: 'handoff',
	error: 'bad',
	running: 'info',
};

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
	const totalCost = useMemo(() => {
		if (!runs?.length) return 0;
		return runs.reduce((sum, run) => sum + (Number(run.estimatedCostUsd) || 0), 0);
	}, [runs]);
	const summary = useMemo(() => {
		const list = runs || [];
		return {
			total: list.length,
			sent: list.filter(run => run.outcome === 'sent' || run.outcome === 'approved').length,
			drafts: list.filter(run => run.outcome === 'suggested' || run.outcome === 'handoff').length,
			errors: list.filter(run => run.outcome === 'error').length,
		};
	}, [runs]);

	return (
		<div className="wa-ag-stack">
			<div className="wa-ag-stats">
				<div className="wa-ag-stat">
					<span>{text.activityRequests}</span>
					<b>{runs ? summary.total : '—'}</b>
				</div>
				<div className="wa-ag-stat is-ok">
					<span>{text.activitySent}</span>
					<b>{runs ? summary.sent : '—'}</b>
				</div>
				<div className="wa-ag-stat is-draft">
					<span>{text.activityDrafts}</span>
					<b>{runs ? summary.drafts : '—'}</b>
				</div>
				<div className="wa-ag-stat">
					<span>{text.activityTotalCost}</span>
					<b dir="ltr">{runs ? formatUsd(totalCost) : '—'}</b>
				</div>
			</div>

			<section className="wa-ag-panel">
				<header className="wa-ag-panel-head">
					<div>
						<h3>{text.tabs.activity}</h3>
						<p>{text.activityCostHint}</p>
					</div>
					<button type="button" className="wa-ag-ghost" onClick={() => void load()} disabled={loading}>
						<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
						<span className="wa-ag-hide-sm">{text.refresh}</span>
					</button>
				</header>
				{error ? <Callout tone="bad" icon={AlertTriangle} role="alert">{error}</Callout> : null}
				{runs == null ? (
					<Loading />
				) : runs.length === 0 ? (
					<div className="wa-ag-empty">
						<span className="wa-ag-empty-icon" aria-hidden>
							<Activity size={20} />
						</span>
						<p>{text.activityEmpty}</p>
					</div>
				) : (
					<ul className="wa-ag-runs">
						{runs.map(run => {
							const cost = formatUsd(run.estimatedCostUsd);
							return (
								<li key={run.id} className="wa-ag-run">
									<div className="wa-ag-run-head">
										<span className={`wa-ag-badge is-${OUTCOME_TONE[run.outcome] || 'muted'}`}>{text.outcomes[run.outcome] || run.outcome}</span>
										{run.provider || run.model ? (
											<span className="wa-ag-run-model" dir="ltr">
												{labelForProvider(run.provider, text)}
												{run.model ? ` · ${run.model}` : ''}
											</span>
										) : null}
										<span className="wa-ag-run-time">{run.createdAt ? formatter.format(new Date(run.createdAt)) : ''}</span>
									</div>
									{run.reply ? <p className="wa-ag-run-reply" dir="auto">{run.reply}</p> : null}
									{run.error ? <p className="wa-ag-note is-bad">{run.error}</p> : null}
									{run.latencyMs != null || cost != null || run.totalTokens != null ? (
										<p className="wa-ag-run-meta" dir="ltr">
											{run.latencyMs != null ? <span>{Math.round(run.latencyMs / 100) / 10}s</span> : null}
											{run.totalTokens != null ? <span>{fillTemplate(text.requestTokens, { total: run.totalTokens })}</span> : null}
											{cost != null ? (
												<span className="is-cost">
													{text.requestCost}: {cost}
													{run.costSource ? ` · ${costLabel(text, run.costSource)}` : ''}
												</span>
											) : null}
										</p>
									) : null}
								</li>
							);
						})}
					</ul>
				)}
			</section>
		</div>
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
	const [dirty, setDirty] = useState(false);
	const [saveError, setSaveError] = useState('');

	useEffect(() => {
		if (!accountId) return undefined;
		const controller = new AbortController();
		setDraft(null);
		setLoadError('');
		setDirty(false);
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
		setDirty(true);
		setDraft(updater);
	}, []);

	const submit = async event => {
		event?.preventDefault?.();
		if (!draft) return;
		setSaving(true);
		setSaveError('');
		try {
			const next = await whatsappAiAgentApi.updateSettings(accountId, draftToPayload(draft));
			setDraft(settingsToDraft(next));
			setSaved(true);
			setDirty(false);
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
		<section data-wa-ai-agent-panel className={`wa-ag${section === 'test' ? ' is-test' : ''}`} dir={lang === 'ar' ? 'rtl' : undefined}>
			<div className="wa-ag-top">
				<div className="wa-ag-head">
					<div className="wa-ag-mark">
						<Bot size={20} />
					</div>
					<div className="wa-ag-copy">
						<h2>{text.title}</h2>
						<p title={text.description}>{text.description}</p>
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
								title={tab.label}
							>
								<Icon size={15} />
								<span>{tab.label}</span>
								{tab.id === 'setup' && dirty ? <i className="wa-ag-tab-dot" aria-label={text.unsaved} /> : null}
							</button>
						);
					})}
				</div>
			</div>

			<div className="wa-ag-body nice-scroll">
				{loadError ? (
					<Callout tone="bad" icon={AlertTriangle} role="alert">{loadError}</Callout>
				) : !draft ? (
					<Loading />
				) : section === 'setup' ? (
					<>
						{draft.prefilled?.length > 0 && !saved ? (
							<div className="wa-ag-prefill" role="status">
								<Sparkles size={16} aria-hidden />
								<p>{text.prefilledNote}</p>
								<button type="button" className="wa-ag-ghost" onClick={submit} disabled={saving}>
									{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
									{text.save}
								</button>
							</div>
						) : null}
						<SetupSection
							text={text}
							lang={lang}
							draft={draft}
							setDraft={setDraftDirty}
							saving={saving}
							saved={saved}
							dirty={dirty}
							error={saveError}
							onSubmit={submit}
							onApplyRecommended={() => setDraftDirty(current => applyRecommended(current))}
							onOpenModels={() => setSection('models')}
						/>
					</>
				) : section === 'models' ? (
					<ModelsSection text={text} accountId={accountId} draft={draft} setDraft={setDraftDirty} onSaved={() => { setSaved(true); setDirty(false); }} alerts={draft.providerAlerts || []} />
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
			</div>
		</section>
	);
}
