'use client';

import { useEffect, useState } from 'react';
import { Bot, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { WaCustomSelect } from '../WaCustomSelect';

const COPY = {
	en: {
		title: 'AI reply suggestions',
		description:
			'Generate editable reply ideas from recent messages. AI never sends WhatsApp messages.',
		enabled: 'Enable AI suggestions',
		enabledHint: 'Turn on to see suggested replies while chatting.',
		sectionProvider: 'Provider & language',
		sectionBehavior: 'Suggestion behavior',
		sectionFallback: 'Fallback prompt',
		fallbackHint: 'Used automatically when no saved prompt below is marked default.',
		prompt: 'Fallback system prompt',
		promptLibrary: 'Saved prompts',
		promptLibraryHint: 'Save multiple instructions and choose the default used in chats.',
		promptName: 'Prompt name',
		promptContent: 'Prompt instructions',
		addPrompt: 'Add prompt',
		defaultPrompt: 'Use by default',
		deletePrompt: 'Delete prompt',
		persona: 'Reply personality',
		language: 'Reply language',
		tone: 'Tone',
		count: 'Number of suggestions',
		context: 'Messages used as context',
		provider: 'AI provider',
		model: 'Model',
		save: 'Save AI settings',
		saved: 'Settings saved',
	},
	ar: {
		title: 'اقتراحات الرد بالذكاء الاصطناعي',
		description:
			'إنشاء ردود قابلة للتعديل من أحدث الرسائل. الذكاء الاصطناعي لا يرسل أي رسالة واتساب.',
		enabled: 'تفعيل اقتراحات الذكاء الاصطناعي',
		enabledHint: 'فعّل الخيار لرؤية الردود المقترحة أثناء المحادثة.',
		sectionProvider: 'المزود واللغة',
		sectionBehavior: 'سلوك الاقتراحات',
		sectionFallback: 'التعليمات الاحتياطية',
		fallbackHint: 'تُستخدم تلقائيًا عند عدم وجود تعليمات محفوظة محددة كافتراضية.',
		prompt: 'التعليمات الاحتياطية',
		promptLibrary: 'التعليمات المحفوظة',
		promptLibraryHint: 'احفظ أكثر من تعليمات واختر الافتراضية المستخدمة في المحادثات.',
		promptName: 'اسم التعليمات',
		promptContent: 'نص التعليمات',
		addPrompt: 'إضافة تعليمات',
		defaultPrompt: 'استخدام افتراضي',
		deletePrompt: 'حذف التعليمات',
		persona: 'شخصية الرد',
		language: 'لغة الرد',
		tone: 'أسلوب الرد',
		count: 'عدد الاقتراحات',
		context: 'عدد رسائل السياق',
		provider: 'مزود الذكاء الاصطناعي',
		model: 'النموذج',
		save: 'حفظ إعدادات الذكاء الاصطناعي',
		saved: 'تم حفظ الإعدادات',
	},
};

const GRADIENT = 'linear-gradient(135deg, #1DAB61 0%, #1DAB61 100%)';
const GLOW = '0 10px 24px -10px var(--color-primary-400)';

const fieldClass =
	'wa-input-3d w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-900';

const sectionLabelClass =
	'text-[11px] font-bold uppercase tracking-wider text-slate-400';

function promptId() {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function Switch({ checked, onChange, label }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
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

export default function WhatsAppAiSettings({
	locale = 'en',
	settings,
	loading,
	saving,
	error,
	onSave,
}) {
	const text = COPY[String(locale).toLowerCase().startsWith('ar') ? 'ar' : 'en'];
	const [draft, setDraft] = useState(settings);
	const [saved, setSaved] = useState(false);

	useEffect(() => setDraft(settings), [settings]);

	if (loading && !draft) {
		return (
			<div className="grid min-h-32 place-items-center rounded-2xl border border-slate-200 dark:border-slate-700">
				<Loader2 className="animate-spin text-[var(--color-primary-500)]" />
			</div>
		);
	}
	if (!draft) return null;

	const update = (key, value) => {
		setSaved(false);
		setDraft(current => ({ ...current, [key]: value }));
	};

	const updatePrompt = (id, key, value) => {
		update(
			'promptPresets',
			(draft.promptPresets || []).map(preset =>
				preset.id === id ? { ...preset, [key]: value } : preset,
			),
		);
	};

	const addPrompt = () => {
		if ((draft.promptPresets || []).length >= 20) return;
		const id = promptId();
		const promptPresets = [
			...(draft.promptPresets || []),
			{ id, name: '', prompt: '' },
		];
		setSaved(false);
		setDraft(current => ({
			...current,
			promptPresets,
			activePromptId: current.activePromptId || id,
		}));
	};

	const removePrompt = id => {
		const promptPresets = (draft.promptPresets || []).filter(preset => preset.id !== id);
		setSaved(false);
		setDraft(current => ({
			...current,
			promptPresets,
			activePromptId:
				current.activePromptId === id
					? promptPresets[0]?.id || null
					: current.activePromptId,
		}));
	};

	const submit = async event => {
		event.preventDefault();
		try {
			await onSave(draft);
			setSaved(true);
		} catch {
			setSaved(false);
		}
	};

	return (
		<form
			onSubmit={submit}
			className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900"
		>
			<div className="mb-4 flex items-start gap-3">
				<div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-500)] dark:bg-[var(--color-primary-950)]/40">
					<Bot size={20} />
				</div>
				<div>
					<h3 className="font-black text-slate-900 dark:text-white">{text.title}</h3>
					<p className="mt-1 text-xs leading-5 text-slate-500">{text.description}</p>
				</div>
			</div>

			<div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
				<div>
					<p className="text-sm font-bold text-slate-800 dark:text-slate-100">{text.enabled}</p>
					<p className="mt-0.5 text-xs text-slate-400">{text.enabledHint}</p>
				</div>
				<Switch
					label={text.enabled}
					checked={Boolean(draft.enabled)}
					onChange={value => update('enabled', value)}
				/>
			</div>

			<p className={`mb-2 ${sectionLabelClass}`}>{text.sectionProvider}</p>
			<div className="grid gap-3 md:grid-cols-2">
				<label className="space-y-1 text-xs font-bold">
					<span>{text.provider}</span>
					<WaCustomSelect
						ariaLabel={text.provider}
						value={draft.provider || 'ai-free'}
						onChange={value => update('provider', value)}
						options={[
							{ value: 'ai-free', label: 'FitCoach Free (auto fallback)' },
							{ value: 'llm7-free', label: 'LLM7 Free' },
							{ value: 'pollinations-free', label: 'Pollinations Free' },
							{ value: 'browser-chatgpt', label: 'Browser ChatGPT' },
							{ value: 'dragify-free', label: 'Legacy Free (same as FitCoach)' },
						]}
					/>
				</label>
				<label className="space-y-1 text-xs font-bold">
					<span>{text.model}</span>
					<input
						value={draft.model || 'auto'}
						onChange={event => update('model', event.target.value)}
						maxLength={80}
						className={fieldClass}
					/>
				</label>
				<label className="space-y-1 text-xs font-bold">
					<span>{text.language}</span>
					<WaCustomSelect
						ariaLabel={text.language}
						value={draft.language || 'auto'}
						onChange={value => update('language', value)}
						options={[
							{ value: 'auto', label: 'Auto' },
							{ value: 'ar', label: 'العربية' },
							{ value: 'en', label: 'English' },
						]}
					/>
				</label>
				<label className="space-y-1 text-xs font-bold">
					<span>{text.tone}</span>
					<WaCustomSelect
						ariaLabel={text.tone}
						value={draft.tone || 'professional'}
						onChange={value => update('tone', value)}
						options={[
							{ value: 'professional', label: 'Professional' },
							{ value: 'friendly', label: 'Friendly' },
							{ value: 'egyptian', label: 'مصري عامي' },
							{ value: 'sales', label: 'Sales' },
							{ value: 'support', label: 'Technical support' },
							{ value: 'concise', label: 'Concise' },
						]}
					/>
				</label>
			</div>

			<p className={`mb-2 mt-4 ${sectionLabelClass}`}>{text.sectionBehavior}</p>
			<div className="grid gap-3 md:grid-cols-2">
				<label className="space-y-1 text-xs font-bold">
					<span>{text.count}</span>
					<input
						type="number"
						min="1"
						max="5"
						value={draft.suggestionCount ?? 3}
						onChange={event => update('suggestionCount', Number(event.target.value))}
						className={fieldClass}
					/>
				</label>
				<label className="space-y-1 text-xs font-bold">
					<span>{text.context}</span>
					<input
						type="number"
						min="5"
						max="50"
						value={draft.contextMessageLimit ?? 20}
						onChange={event => update('contextMessageLimit', Number(event.target.value))}
						className={fieldClass}
					/>
				</label>
			</div>

			<label className="mt-3 block space-y-1 text-xs font-bold">
				<span>{text.persona}</span>
				<input
					value={draft.persona || ''}
					onChange={event => update('persona', event.target.value)}
					maxLength={500}
					className={fieldClass}
				/>
			</label>

			<div className="mt-4 rounded-2xl border border-[var(--color-secondary-200)] bg-[var(--color-secondary-50)]/40 p-3 dark:border-[var(--color-secondary-900)] dark:bg-[var(--color-secondary-950)]/20">
				<div className="mb-3 flex items-start justify-between gap-3">
					<div>
						<p className="text-sm font-black text-[var(--color-secondary-900)] dark:text-[var(--color-secondary-200)]">
							{text.promptLibrary}
						</p>
						<p className="mt-0.5 text-xs leading-5 text-slate-500">
							{text.promptLibraryHint}
						</p>
					</div>
					<button
						type="button"
						onClick={addPrompt}
						disabled={(draft.promptPresets || []).length >= 20}
						style={{ background: GRADIENT }}
						className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-black text-white disabled:opacity-50"
					>
						<Plus size={14} />
						{text.addPrompt}
					</button>
				</div>

				<div className="space-y-3">
					{(draft.promptPresets || []).map((preset, index) => (
						<div
							key={preset.id}
							className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
						>
							<div className="mb-2 flex items-center gap-2">
								<label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-bold">
									<input
										type="radio"
										name="active-ai-prompt"
										checked={draft.activePromptId === preset.id}
										onChange={() => update('activePromptId', preset.id)}
										className="accent-[var(--color-primary-600)]"
									/>
									<span>{text.defaultPrompt}</span>
								</label>
								<button
									type="button"
									onClick={() => removePrompt(preset.id)}
									aria-label={text.deletePrompt}
									title={text.deletePrompt}
									className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
								>
									<Trash2 size={15} />
								</button>
							</div>
							<div className="grid gap-2">
								<input
									required
									value={preset.name}
									onChange={event =>
										updatePrompt(preset.id, 'name', event.target.value)
									}
									maxLength={80}
									placeholder={`${text.promptName} ${index + 1}`}
									aria-label={text.promptName}
									className={fieldClass}
								/>
								<textarea
									required
									value={preset.prompt}
									onChange={event =>
										updatePrompt(preset.id, 'prompt', event.target.value)
									}
									rows={4}
									maxLength={4000}
									placeholder={text.promptContent}
									aria-label={text.promptContent}
									className={`${fieldClass} resize-y`}
								/>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="mt-4 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
				<p className="text-sm font-black text-slate-800 dark:text-slate-100">{text.sectionFallback}</p>
				<p className="mt-0.5 text-xs text-slate-400">{text.fallbackHint}</p>
				<textarea
					value={draft.systemPrompt || ''}
					onChange={event => update('systemPrompt', event.target.value)}
					rows={5}
					maxLength={4000}
					aria-label={text.prompt}
					className={`${fieldClass} mt-3 resize-y`}
				/>
			</div>

			{error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
			{saved && !error && <p className="mt-3 text-xs font-semibold text-emerald-600">{text.saved}</p>}
			<button
				type="submit"
				disabled={saving}
				style={{ background: GRADIENT, boxShadow: GLOW }}
				className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black text-white transition disabled:cursor-wait disabled:opacity-60"
			>
				{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
				{text.save}
			</button>
		</form>
	);
}
