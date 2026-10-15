'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Activity,
	BookOpen,
	Bot,
	FlaskConical,
	Loader2,
	Pencil,
	Plus,
	RefreshCw,
	RotateCcw,
	Save,
	Search,
	Send,
	Settings2,
	Trash2,
	X,
} from 'lucide-react';
import { WaCustomSelect } from '../WaCustomSelect';
import { apiErrorMessage, whatsappAiAgentApi } from './whatsapp-ai-api';
import { agentCopy, reasonLabel, splitList } from './agent-copy';

const GRADIENT = 'linear-gradient(135deg, #1DAB61 0%, #1DAB61 100%)';
const GLOW = '0 10px 24px -10px var(--color-primary-400)';
const fieldClass =
	'wa-input-3d w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-900';
const ghostButton =
	'inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const primaryButtonClass =
	'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black text-white transition disabled:cursor-wait disabled:opacity-60';

const PROVIDERS = [
	{ value: 'ai-free', label: 'AI Free (auto chain)' },
	{ value: 'llm7-free', label: 'LLM7' },
	{ value: 'pollinations-free', label: 'Pollinations' },
	{ value: 'dragify-free', label: 'Dragify' },
	{ value: 'browser-chatgpt', label: 'Browser ChatGPT' },
];
const DIALECTS = {
	en: [
		{ value: 'auto', label: "Match the customer" },
		{ value: 'msa', label: 'Modern Standard Arabic' },
		{ value: 'egyptian', label: 'Egyptian Arabic' },
		{ value: 'gulf', label: 'Gulf Arabic' },
		{ value: 'levantine', label: 'Levantine Arabic' },
		{ value: 'english', label: 'English' },
	],
	ar: [
		{ value: 'auto', label: 'مطابقة لهجة العميل' },
		{ value: 'msa', label: 'العربية الفصحى' },
		{ value: 'egyptian', label: 'المصرية' },
		{ value: 'gulf', label: 'الخليجية' },
		{ value: 'levantine', label: 'الشامية' },
		{ value: 'english', label: 'الإنجليزية' },
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
		{ value: 'support', label: 'دعم فني' },
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
			className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors disabled:opacity-50 ${
				checked ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200 dark:bg-slate-700'
			}`}
		>
			<span
				className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
					checked ? 'start-[22px]' : 'start-0.5'
				}`}
			/>
		</button>
	);
}

function ToggleRow({ label, hint, checked, onChange }) {
	return (
		<div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
			<div className="min-w-0">
				<p className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</p>
				{hint ? <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{hint}</p> : null}
			</div>
			<Switch label={label} checked={Boolean(checked)} onChange={onChange} />
		</div>
	);
}

function Section({ title, hint, children }) {
	return (
		<fieldset className="space-y-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
			<legend className="px-1 text-sm font-black text-slate-800 dark:text-slate-100">{title}</legend>
			{hint ? <p className="-mt-1 text-[11px] leading-4 text-slate-500">{hint}</p> : null}
			{children}
		</fieldset>
	);
}

function Field({ label, hint, children }) {
	return (
		<label className="block space-y-1 text-xs font-bold">
			<span>{label}</span>
			{children}
			{hint ? <span className="block text-[11px] font-normal text-slate-400">{hint}</span> : null}
		</label>
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

/* ------------------------------------------------------------------ setup */

function SetupSection({ text, lang, draft, setDraft, saving, saved, error, onSubmit }) {
	const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
	const updatePermission = (key, value) =>
		setDraft(current => ({ ...current, permissions: { ...current.permissions, [key]: value } }));
	const modeOptions = [
		{ value: 'auto', label: text.modeAuto },
		{ value: 'suggest', label: text.modeSuggest },
	];
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
				<div>
					<p className="text-sm font-bold text-slate-800 dark:text-slate-100">{text.enabled}</p>
					<p className="mt-0.5 text-xs text-slate-400">{text.enabledHint}</p>
				</div>
				<Switch label={text.enabled} checked={Boolean(draft.enabled)} onChange={value => update('enabled', value)} />
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<Field label={text.scope}>
					<WaCustomSelect
						ariaLabel={text.scope}
						value={draft.scope}
						onChange={value => update('scope', value)}
						options={[
							{ value: 'all', label: text.scopeAll },
							{ value: 'selected', label: text.scopeSelected },
						]}
					/>
				</Field>
				<Field label={text.defaultMode}>
					<WaCustomSelect
						ariaLabel={text.defaultMode}
						value={draft.defaultMode}
						onChange={value => update('defaultMode', value)}
						options={modeOptions}
					/>
				</Field>
				<Field label={text.provider}>
					<WaCustomSelect
						ariaLabel={text.provider}
						value={draft.provider}
						onChange={value => update('provider', value)}
						options={PROVIDERS}
					/>
				</Field>
				<Field label={text.model} hint={text.modelHint}>
					<input
						value={draft.model || ''}
						onChange={event => update('model', event.target.value)}
						maxLength={80}
						dir="ltr"
						className={fieldClass}
					/>
				</Field>
			</div>

			<Section title={text.sectionIdentity}>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label={text.agentName}>
						<input value={draft.agentName || ''} onChange={event => update('agentName', event.target.value)} maxLength={80} dir="auto" className={fieldClass} />
					</Field>
					<Field label={text.businessName}>
						<input value={draft.businessName || ''} onChange={event => update('businessName', event.target.value)} maxLength={120} dir="auto" className={fieldClass} />
					</Field>
				</div>
				<Field label={text.persona}>
					<textarea value={draft.persona || ''} onChange={event => update('persona', event.target.value)} rows={3} maxLength={2000} dir="auto" className={`${fieldClass} resize-y`} />
				</Field>
				<div className="grid gap-3 sm:grid-cols-3">
					<Field label={text.dialect}>
						<WaCustomSelect ariaLabel={text.dialect} value={draft.dialect} onChange={value => update('dialect', value)} options={DIALECTS[lang]} />
					</Field>
					<Field label={text.tone}>
						<WaCustomSelect ariaLabel={text.tone} value={draft.tone} onChange={value => update('tone', value)} options={TONES[lang]} />
					</Field>
					<Field label={text.replyLength}>
						<WaCustomSelect ariaLabel={text.replyLength} value={draft.replyLength} onChange={value => update('replyLength', value)} options={LENGTHS[lang]} />
					</Field>
				</div>
			</Section>

			<Section title={text.sectionRules}>
				<Field label={text.rules}>
					<textarea value={draft.rules || ''} onChange={event => update('rules', event.target.value)} rows={4} maxLength={4000} dir="auto" className={`${fieldClass} resize-y`} />
				</Field>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label={text.allowedTopics}>
						<input value={draft.allowedTopicsText} onChange={event => update('allowedTopicsText', event.target.value)} dir="auto" className={fieldClass} />
					</Field>
					<Field label={text.forbiddenTopics}>
						<input value={draft.forbiddenTopicsText} onChange={event => update('forbiddenTopicsText', event.target.value)} dir="auto" className={fieldClass} />
					</Field>
				</div>
			</Section>

			<Section title={text.sectionPermissions} hint={text.permissionsHint}>
				<div className="grid gap-2 sm:grid-cols-2">
					<ToggleRow label={text.permQuote} checked={draft.permissions?.quotePrices} onChange={value => updatePermission('quotePrices', value)} />
					<ToggleRow label={text.permCommit} checked={draft.permissions?.makeCommitments} onChange={value => updatePermission('makeCommitments', value)} />
					<ToggleRow label={text.permDiscount} checked={draft.permissions?.offerDiscounts} onChange={value => updatePermission('offerDiscounts', value)} />
					<ToggleRow label={text.permLinks} checked={draft.permissions?.shareLinks} onChange={value => updatePermission('shareLinks', value)} />
				</div>
			</Section>

			<Section title={text.sectionContext}>
				<div className="grid gap-2 sm:grid-cols-2">
					<ToggleRow label={text.useKnowledgeBase} checked={draft.useKnowledgeBase} onChange={value => update('useKnowledgeBase', value)} />
					<ToggleRow label={text.knowledgeOnly} hint={text.knowledgeOnlyHint} checked={draft.knowledgeOnly} onChange={value => update('knowledgeOnly', value)} />
					<ToggleRow label={text.useContactMemory} checked={draft.useContactMemory} onChange={value => update('useContactMemory', value)} />
					<Field label={text.contextLimit}>
						<input type="number" min="4" max="40" value={draft.contextMessageLimit ?? 12} onChange={event => update('contextMessageLimit', event.target.value)} className={fieldClass} />
					</Field>
				</div>
			</Section>

			<Section title={text.sectionDisclosure}>
				<ToggleRow label={text.discloseAi} checked={draft.discloseAi} onChange={value => update('discloseAi', value)} />
				{draft.discloseAi ? (
					<Field label={text.disclosureText}>
						<input value={draft.disclosureText || ''} onChange={event => update('disclosureText', event.target.value)} maxLength={300} dir="auto" className={fieldClass} />
					</Field>
				) : null}
			</Section>

			<Section title={text.sectionHandoff}>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label={text.handoffKeywords} hint={text.handoffKeywordsHint}>
						<input value={draft.handoffKeywordsText} onChange={event => update('handoffKeywordsText', event.target.value)} dir="auto" className={fieldClass} />
					</Field>
					<Field label={text.handoffMessage}>
						<input value={draft.handoffMessage || ''} onChange={event => update('handoffMessage', event.target.value)} maxLength={500} dir="auto" className={fieldClass} />
					</Field>
					<Field label={text.mediaPolicy}>
						<WaCustomSelect
							ariaLabel={text.mediaPolicy}
							value={draft.mediaPolicy}
							onChange={value => update('mediaPolicy', value)}
							options={[
								{ value: 'handoff', label: text.mediaHandoff },
								{ value: 'acknowledge', label: text.mediaAcknowledge },
								{ value: 'ignore', label: text.mediaIgnore },
							]}
						/>
					</Field>
					<ToggleRow label={text.allowGroups} checked={draft.allowGroups} onChange={value => update('allowGroups', value)} />
					<Field label={text.debounce}>
						<input type="number" min="2" max="120" value={draft.debounceSeconds ?? 8} onChange={event => update('debounceSeconds', event.target.value)} className={fieldClass} />
					</Field>
					<Field label={text.humanPause}>
						<input type="number" min="1" max="1440" value={draft.humanPauseMinutes ?? 30} onChange={event => update('humanPauseMinutes', event.target.value)} className={fieldClass} />
					</Field>
					<Field label={text.maxPerHour}>
						<input type="number" min="1" max="120" value={draft.maxRepliesPerHour ?? 12} onChange={event => update('maxRepliesPerHour', event.target.value)} className={fieldClass} />
					</Field>
					<Field label={`${text.minConfidence}: ${Math.round(Number(draft.minConfidence ?? 0.55) * 100)}%`}>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={draft.minConfidence ?? 0.55}
							onChange={event => update('minConfidence', Number(event.target.value))}
							className="w-full accent-[var(--color-primary-600)]"
						/>
					</Field>
				</div>
			</Section>

			<p className={`rounded-xl px-3 py-2 text-xs leading-5 ${draft.actorConfigured ? 'bg-slate-50 text-slate-500 dark:bg-slate-800/60' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
				{draft.actorConfigured ? text.actorNote : text.actorMissing}
			</p>
			{draft.lastError ? (
				<p className="text-xs text-rose-600">
					<span className="font-bold">{text.lastError}:</span> {draft.lastError}
				</p>
			) : null}
			{error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
			{saved && !error ? <p className="text-xs font-semibold text-emerald-600">{text.saved}</p> : null}
			<button type="submit" disabled={saving} style={{ background: GRADIENT, boxShadow: GLOW }} className={primaryButtonClass}>
				{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
				{text.save}
			</button>
		</form>
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
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-[12rem] flex-1">
					<Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
					<input
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder={text.kbSearch}
						aria-label={text.kbSearch}
						dir="auto"
						className={`${fieldClass} ps-8`}
					/>
				</div>
				<div className="w-44">
					<WaCustomSelect ariaLabel={text.kbCategory} value={category} onChange={setCategory} options={categoryOptions} />
				</div>
				<button type="button" className={ghostButton} onClick={() => setEditing({ ...EMPTY_ENTRY })}>
					<Plus size={15} />
					{text.kbAdd}
				</button>
			</div>

			{editing ? (
				<form onSubmit={save} className="space-y-2 rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/40 p-3 dark:border-[var(--color-primary-900)] dark:bg-[var(--color-primary-950)]/20">
					<div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
						<input
							required
							value={editing.title}
							onChange={event => setEditing(current => ({ ...current, title: event.target.value }))}
							maxLength={200}
							placeholder={text.kbTitle}
							aria-label={text.kbTitle}
							dir="auto"
							className={fieldClass}
						/>
						<WaCustomSelect
							ariaLabel={text.kbCategory}
							value={editing.category}
							onChange={value => setEditing(current => ({ ...current, category: value }))}
							options={CATEGORY_IDS.map(id => ({ value: id, label: text.categories[id] }))}
						/>
					</div>
					<textarea
						required
						value={editing.content}
						onChange={event => setEditing(current => ({ ...current, content: event.target.value }))}
						rows={5}
						maxLength={8000}
						placeholder={text.kbContent}
						aria-label={text.kbContent}
						dir="auto"
						className={`${fieldClass} resize-y`}
					/>
					<input
						value={editing.tagsText}
						onChange={event => setEditing(current => ({ ...current, tagsText: event.target.value }))}
						placeholder={text.kbTags}
						aria-label={text.kbTags}
						dir="auto"
						className={fieldClass}
					/>
					<div className="flex flex-wrap items-center gap-2">
						<label className="me-auto inline-flex items-center gap-2 text-xs font-bold">
							<Switch label={text.kbActive} checked={Boolean(editing.isActive)} onChange={value => setEditing(current => ({ ...current, isActive: value }))} />
							{editing.isActive ? text.kbActive : text.kbInactive}
						</label>
						<button type="button" className={ghostButton} onClick={() => setEditing(null)}>
							{text.kbCancel}
						</button>
						<button type="submit" disabled={busy} style={{ background: GRADIENT, boxShadow: GLOW }} className={primaryButtonClass}>
							{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
							{text.kbSave}
						</button>
					</div>
				</form>
			) : null}

			{error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
			{entries == null ? (
				<div className="grid min-h-24 place-items-center"><Loader2 className="animate-spin text-[var(--color-primary-500)]" /></div>
			) : entries.length === 0 ? (
				<p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-600">{text.kbEmpty}</p>
			) : filtered.length === 0 ? (
				<p className="px-3 py-4 text-center text-xs text-slate-500">{text.kbNoMatch}</p>
			) : (
				<ul className="grid gap-2 md:grid-cols-2">
					{filtered.map(entry => (
						<li key={entry.id} className={`rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 ${entry.isActive ? '' : 'opacity-60'}`}>
							<div className="mb-1 flex items-start gap-2">
								<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800">
									{text.categories[entry.category] || entry.category}
								</span>
								<p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100" dir="auto">{entry.title}</p>
								<Switch label={entry.isActive ? text.kbActive : text.kbInactive} checked={entry.isActive} onChange={() => void toggleActive(entry)} />
							</div>
							<p className="line-clamp-3 whitespace-pre-line text-xs leading-5 text-slate-500" dir="auto">{entry.content}</p>
							{entry.tags?.length ? (
								<p className="mt-1 flex flex-wrap gap-1">
									{entry.tags.map(tag => (
										<span key={tag} className="rounded bg-[var(--color-primary-50)] px-1.5 text-[10px] font-bold text-[var(--color-primary-700)] dark:bg-[var(--color-primary-950)]/40" dir="auto">#{tag}</span>
									))}
								</p>
							) : null}
							<div className="mt-2 flex justify-end gap-1">
								<button
									type="button"
									title={text.kbEdit}
									aria-label={text.kbEdit}
									onClick={() => setEditing({ ...entry, tagsText: (entry.tags || []).join(', ') })}
									className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									<Pencil size={14} />
								</button>
								<button
									type="button"
									title={text.kbDelete}
									aria-label={text.kbDelete}
									onClick={() => void remove(entry)}
									className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
								>
									<Trash2 size={14} />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------- test */

function TestSection({ text, accountId, draft }) {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const controllerRef = useRef(null);
	const scrollRef = useRef(null);

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
	};

	const send = async event => {
		event.preventDefault();
		const content = input.trim();
		if (!content || pending) return;
		const transcript = [...messages, { role: 'customer', content }];
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
			setMessages(current => [...current, { role: 'agent', content: result.decision === 'skip' ? '' : result.reply, result }]);
		} catch (testError) {
			if (controller.signal.aborted) return;
			setError(apiErrorMessage(testError, 'Test failed'));
		} finally {
			if (controllerRef.current === controller) setPending(false);
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<p className="flex-1 text-xs leading-5 text-slate-500">{text.testHint}</p>
				<button type="button" className={ghostButton} onClick={reset} disabled={!messages.length && !pending}>
					<RotateCcw size={14} />
					{text.testReset}
				</button>
			</div>
			<div ref={scrollRef} className="nice-scroll max-h-[28rem] min-h-[12rem] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40">
				{!messages.length && !pending ? <p className="py-10 text-center text-xs text-slate-400">{text.testEmpty}</p> : null}
				{messages.map((message, index) =>
					message.role === 'customer' ? (
						<div key={index} className="flex justify-end">
							<p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-ee-sm bg-[var(--color-primary-500)] px-3 py-2 text-sm text-white" dir="auto">{message.content}</p>
						</div>
					) : (
						<div key={index} className="flex justify-start">
							<div className="max-w-[85%] space-y-1.5 rounded-2xl rounded-es-sm bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900">
								{message.content ? (
									<p className="whitespace-pre-line text-slate-800 dark:text-slate-100" dir="auto">{message.content}</p>
								) : (
									<p className="italic text-slate-400">{text.testNoReply}</p>
								)}
								<TestResultMeta text={text} result={message.result} />
							</div>
						</div>
					),
				)}
				{pending ? (
					<p className="inline-flex items-center gap-2 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" />{text.testThinking}</p>
				) : null}
			</div>
			{error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
			<form onSubmit={send} className="flex gap-2">
				<input
					value={input}
					onChange={event => setInput(event.target.value)}
					placeholder={text.testPlaceholder}
					aria-label={text.testPlaceholder}
					maxLength={2000}
					dir="auto"
					className={fieldClass}
				/>
				<button type="submit" disabled={pending || !input.trim()} style={{ background: GRADIENT, boxShadow: GLOW }} className={primaryButtonClass}>
					<Send size={15} className="rtl:-scale-x-100" />
					{text.testSend}
				</button>
			</form>
		</div>
	);
}

function TestResultMeta({ text, result }) {
	if (!result) return null;
	const tone =
		result.delivery === 'would_send'
			? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
			: result.delivery === 'would_skip'
				? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
				: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
	const knowledge = (result.sources || []).filter(source => source.type === 'knowledge');
	return (
		<div className="space-y-1 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500 dark:border-slate-800">
			<div className="flex flex-wrap items-center gap-1.5">
				<span className={`rounded-md px-1.5 py-0.5 font-bold ${tone}`}>{text.delivery[result.delivery] || result.delivery}</span>
				<span>{text.confidence}: {Math.round(Number(result.confidence || 0) * 100)}%</span>
				<span className="text-slate-400" dir="ltr">{result.provider} · {result.model} · {Math.round((result.latencyMs || 0) / 100) / 10}s</span>
			</div>
			{result.reasons?.length ? (
				<p className="flex flex-wrap gap-1">
					{result.reasons.map(reason => (
						<span key={reason} className="rounded bg-amber-100/70 px-1.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{reasonLabel(text, reason)}</span>
					))}
				</p>
			) : null}
			{result.reasoning ? (
				<p dir="auto"><span className="font-bold">{text.reasoning}:</span> {result.reasoning}</p>
			) : null}
			<p dir="auto">
				<span className="font-bold">{text.sources}:</span>{' '}
				{knowledge.length ? knowledge.map(source => source.title).join(' · ') : text.noSources}
			</p>
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
		<div className="space-y-2">
			<div className="flex justify-end">
				<button type="button" className={ghostButton} onClick={() => void load()} disabled={loading}>
					<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
					{text.refresh}
				</button>
			</div>
			{error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
			{runs == null ? (
				<div className="grid min-h-24 place-items-center"><Loader2 className="animate-spin text-[var(--color-primary-500)]" /></div>
			) : runs.length === 0 ? (
				<p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-600">{text.activityEmpty}</p>
			) : (
				<ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
					{runs.map(run => (
						<li key={run.id} className="space-y-1 px-3 py-2 text-xs">
							<div className="flex flex-wrap items-center gap-2">
								<span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
									{text.outcomes[run.outcome] || run.outcome}
								</span>
								<span className="text-slate-400">{run.createdAt ? formatter.format(new Date(run.createdAt)) : ''}</span>
								{run.latencyMs != null ? <span className="text-slate-400" dir="ltr">{Math.round(run.latencyMs / 100) / 10}s</span> : null}
								{(run.reasons || []).map(reason => (
									<span key={reason} className="rounded bg-amber-100/70 px-1.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{reasonLabel(text, reason)}</span>
								))}
							</div>
							{run.reply ? <p className="line-clamp-2 text-slate-600 dark:text-slate-300" dir="auto">{run.reply}</p> : null}
							{run.error ? <p className="text-rose-600">{run.error}</p> : null}
						</li>
					))}
				</ul>
			)}
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
		{ id: 'knowledge', label: text.tabs.knowledge, icon: BookOpen },
		{ id: 'test', label: text.tabs.test, icon: FlaskConical },
		{ id: 'activity', label: text.tabs.activity, icon: Activity },
	];

	return (
		<section
			data-wa-ai-agent-panel
			className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900"
		>
			<div className="mb-4 flex items-start gap-3">
				<div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-500)] dark:bg-[var(--color-primary-950)]/40">
					<Bot size={20} />
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="font-black text-slate-900 dark:text-white">{text.title}</h3>
					<p className="mt-1 text-xs leading-5 text-slate-500">{text.description}</p>
				</div>
				{draft ? (
					<span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${draft.enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
						{draft.enabled ? (draft.defaultMode === 'auto' ? text.chip.auto : text.chip.suggest) : text.chip.off}
					</span>
				) : null}
			</div>

			<div role="tablist" aria-label={text.title} className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
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
							className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-black transition ${
								selected ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
							}`}
						>
							<Icon size={14} />
							{tab.label}
						</button>
					);
				})}
			</div>

			{loadError ? (
				<p className="flex items-center gap-2 text-xs font-semibold text-rose-600"><X size={14} />{loadError}</p>
			) : !draft ? (
				<div className="grid min-h-32 place-items-center"><Loader2 className="animate-spin text-[var(--color-primary-500)]" /></div>
			) : section === 'setup' ? (
				<SetupSection text={text} lang={lang} draft={draft} setDraft={setDraftDirty} saving={saving} saved={saved} error={saveError} onSubmit={submit} />
			) : section === 'knowledge' ? (
				<KnowledgeSection text={text} accountId={accountId} />
			) : section === 'test' ? (
				<TestSection text={text} accountId={accountId} draft={draft} />
			) : (
				<ActivitySection text={text} accountId={accountId} locale={locale} />
			)}
		</section>
	);
}
