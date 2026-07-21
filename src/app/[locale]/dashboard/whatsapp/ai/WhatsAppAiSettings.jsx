'use client';

import { useEffect, useState } from 'react';
import { Bot, Loader2, Plus, Save, Trash2 } from 'lucide-react';

const COPY = {
	en: {
		title: 'AI reply suggestions',
		description:
			'Generate editable reply ideas from recent messages. AI never sends WhatsApp messages.',
		enabled: 'Enable AI suggestions',
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

const fieldClass =
	'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950';

function promptId() {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
				<Loader2 className="animate-spin text-violet-500" />
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
			className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
		>
			<div className="mb-4 flex items-start gap-3">
				<div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
					<Bot size={20} />
				</div>
				<div>
					<h3 className="font-black text-slate-900 dark:text-white">{text.title}</h3>
					<p className="mt-1 text-xs leading-5 text-slate-500">{text.description}</p>
				</div>
			</div>

			<label className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700">
				<span className="text-sm font-bold">{text.enabled}</span>
				<input
					type="checkbox"
					checked={Boolean(draft.enabled)}
					onChange={event => update('enabled', event.target.checked)}
					className="h-5 w-5 accent-violet-600"
				/>
			</label>

			<div className="grid gap-3 md:grid-cols-2">
				<label className="space-y-1 text-xs font-bold">
					<span>{text.provider}</span>
					<select
						value={draft.provider || 'dragify-free'}
						onChange={event => update('provider', event.target.value)}
						className={fieldClass}
					>
						<option value="dragify-free">Dragify Free (ChatGPT Web)</option>
					</select>
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
					<select
						value={draft.language || 'auto'}
						onChange={event => update('language', event.target.value)}
						className={fieldClass}
					>
						<option value="auto">Auto</option>
						<option value="ar">العربية</option>
						<option value="en">English</option>
					</select>
				</label>
				<label className="space-y-1 text-xs font-bold">
					<span>{text.tone}</span>
					<select
						value={draft.tone || 'professional'}
						onChange={event => update('tone', event.target.value)}
						className={fieldClass}
					>
						<option value="professional">Professional</option>
						<option value="friendly">Friendly</option>
						<option value="egyptian">مصري عامي</option>
						<option value="sales">Sales</option>
						<option value="support">Technical support</option>
						<option value="concise">Concise</option>
					</select>
				</label>
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

			<div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900 dark:bg-violet-950/20">
				<div className="mb-3 flex items-start justify-between gap-3">
					<div>
						<p className="text-sm font-black text-violet-900 dark:text-violet-200">
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
						className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50"
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
										className="accent-violet-600"
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

			<label className="mt-3 block space-y-1 text-xs font-bold">
				<span>{text.prompt}</span>
				<textarea
					value={draft.systemPrompt || ''}
					onChange={event => update('systemPrompt', event.target.value)}
					rows={5}
					maxLength={4000}
					className={`${fieldClass} resize-y`}
				/>
			</label>

			{error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
			{saved && !error && <p className="mt-3 text-xs font-semibold text-emerald-600">{text.saved}</p>}
			<button
				type="submit"
				disabled={saving}
				className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
			>
				{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
				{text.save}
			</button>
		</form>
	);
}

