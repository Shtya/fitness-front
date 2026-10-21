'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Check, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { WaCustomSelect } from '../WaCustomSelect';

const COPY = {
	en: {
		title: 'AI reply suggestions',
		description:
			'Generate editable reply ideas from recent messages. Replies match the customer language. AI never sends WhatsApp messages.',
		enabled: 'Enable AI suggestions',
		enabledHint: 'Turn on to see suggested replies while chatting.',
		sectionProvider: 'Provider & model',
		promptLibrary: 'Saved prompts',
		promptLibraryHint:
			'These instructions are sent to the model. Mark one as default for chats.',
		promptName: 'Prompt name',
		promptContent: 'Prompt instructions',
		addPrompt: 'Add prompt',
		emptyPrompts: 'No saved prompts yet. Add one to guide how suggestions are written.',
		unsaved: 'Unsaved changes',
		suggestionsOn: 'On',
		suggestionsOff: 'Off',
		promptCount: '{count} / 20',
		defaultPrompt: 'Use by default',
		deletePrompt: 'Delete prompt',
		tone: 'Tone',
		count: 'Number of suggestions',
		context: 'Messages used as context',
		provider: 'AI provider',
		model: 'Model',
		save: 'Save',
		saved: 'Settings saved',
	},
	ar: {
		title: 'اقتراحات الرد بالذكاء الاصطناعي',
		description:
			'إنشاء ردود قابلة للتعديل من أحدث الرسائل. الرد يتبع لغة العميل تلقائيًا. الذكاء الاصطناعي لا يرسل أي رسالة واتساب.',
		enabled: 'تفعيل اقتراحات الذكاء الاصطناعي',
		enabledHint: 'فعّل الخيار لرؤية الردود المقترحة أثناء المحادثة.',
		sectionProvider: 'المزود والنموذج',
		promptLibrary: 'التعليمات المحفوظة',
		promptLibraryHint: 'هذه هي التعليمات المرسلة للنموذج. اختر واحدة كافتراضية للمحادثات.',
		promptName: 'اسم التعليمات',
		promptContent: 'نص التعليمات',
		addPrompt: 'إضافة تعليمات',
		emptyPrompts: 'لا توجد تعليمات محفوظة. أضف تعليمات لتوجيه طريقة كتابة الاقتراحات.',
		unsaved: 'تغييرات غير محفوظة',
		suggestionsOn: 'مفعّل',
		suggestionsOff: 'متوقف',
		promptCount: '{count} / 20',
		defaultPrompt: 'استخدام افتراضي',
		deletePrompt: 'حذف التعليمات',
		tone: 'أسلوب الرد',
		count: 'عدد الاقتراحات',
		context: 'عدد رسائل السياق',
		provider: 'مزود الذكاء الاصطناعي',
		model: 'النموذج',
		save: 'حفظ',
		saved: 'تم حفظ الإعدادات',
	},
};

const TONE_OPTIONS = [
	{ value: 'professional', label: 'Professional' },
	{ value: 'friendly', label: 'Friendly' },
	{ value: 'egyptian', label: 'مصري عامي' },
	{ value: 'sales', label: 'Sales' },
	{ value: 'support', label: 'Technical support' },
	{ value: 'concise', label: 'Concise' },
];


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
			className={`wst-switch${checked ? ' is-on' : ''}`}
		>
			<span />
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
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		setDraft(settings);
		setDirty(false);
	}, [settings]);

	if (loading && !draft) {
		return (
			<section className="wst-section">
				<div className="wst-loading" role="status">
					<Loader2 size={20} className="animate-spin" aria-hidden="true" />
				</div>
			</section>
		);
	}
	if (!draft) return null;

	const update = (key, value) => {
		setSaved(false);
		setDirty(true);
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
		setSaved(false);
		setDirty(true);
		setDraft(current => {
			const promptPresets = [
				...(current.promptPresets || []),
				{ id, name: '', prompt: '' },
			];
			return {
				...current,
				promptPresets,
				activePromptId: current.activePromptId || id,
			};
		});
	};

	const removePrompt = id => {
		setSaved(false);
		setDirty(true);
		setDraft(current => {
			const promptPresets = (current.promptPresets || []).filter(
				preset => preset.id !== id,
			);
			return {
				...current,
				promptPresets,
				activePromptId:
					current.activePromptId === id
						? promptPresets[0]?.id || null
						: current.activePromptId,
			};
		});
	};

	const submit = async event => {
		event.preventDefault();
		try {
			await onSave({
				...draft,
				language: 'auto',
				persona: '',
			});
			setSaved(true);
			setDirty(false);
		} catch {
			setSaved(false);
		}
	};

	const prompts = draft.promptPresets || [];

	return (
		<form onSubmit={submit} className="wst-section">
			<header className="wst-head">
				<span className="wst-icon" aria-hidden="true">
					<Bot size={18} />
				</span>
				<div className="wst-head-text">
					<h3>{text.title}</h3>
					<p>{text.description}</p>
				</div>
			</header>

			<div className="wst-rows">
				<div className={`wst-row wst-power${draft.enabled ? ' is-on' : ''}`}>
					<div className="wst-row-text">
						<p className="wst-row-title">{text.enabled}</p>
						<p className="wst-row-hint">{text.enabledHint}</p>
					</div>
					<div className="wst-row-control">
						<span className={`wst-state${draft.enabled ? ' is-on' : ''}`}>
							{draft.enabled ? text.suggestionsOn : text.suggestionsOff}
						</span>
						<Switch
							label={text.enabled}
							checked={Boolean(draft.enabled)}
							onChange={value => update('enabled', value)}
						/>
					</div>
				</div>

				<div className="wst-row is-stack">
					<div className="wst-fields">
						<label className="wst-field">
							<span className="wst-label">{text.tone}</span>
							<WaCustomSelect
								ariaLabel={text.tone}
								value={draft.tone || 'professional'}
								onChange={value => update('tone', value)}
								options={TONE_OPTIONS}
								buttonClassName="h-10 text-sm"
							/>
						</label>
						<label className="wst-field">
							<span className="wst-label">{text.count}</span>
							<input
								type="number"
								min="1"
								max="5"
								value={draft.suggestionCount ?? 3}
								onChange={event => update('suggestionCount', Number(event.target.value))}
								className="wst-input"
							/>
						</label>
						<label className="wst-field">
							<span className="wst-label">{text.context}</span>
							<input
								type="number"
								min="5"
								max="50"
								value={draft.contextMessageLimit ?? 20}
								onChange={event => update('contextMessageLimit', Number(event.target.value))}
								className="wst-input"
							/>
						</label>
					</div>
				</div>

				<div className="wst-row is-stack">
					<div className="wst-sub-head">
						<div>
							<p className="wst-row-title">
								<FileText size={15} aria-hidden="true" />
								{text.promptLibrary}
								<span className="wst-chip">{text.promptCount.replace('{count}', String(prompts.length))}</span>
							</p>
							<p className="wst-row-hint">{text.promptLibraryHint}</p>
						</div>
						<button
							type="button"
							onClick={addPrompt}
							disabled={prompts.length >= 20}
							className="wst-btn is-ghost"
						>
							<Plus size={15} aria-hidden="true" />
							{text.addPrompt}
						</button>
					</div>

					{prompts.length === 0 ? (
						<div className="wst-empty">
							<span className="wst-empty-icon" aria-hidden="true">
								<FileText size={18} />
							</span>
							<p>{text.emptyPrompts}</p>
						</div>
					) : (
						<div className="wst-prompts">
							{prompts.map((preset, index) => {
								const isDefault = draft.activePromptId === preset.id;
								return (
									<div key={preset.id} className={`wst-prompt${isDefault ? ' is-default' : ''}`}>
										<div className="wst-prompt-head">
											<label className={`wst-default${isDefault ? ' is-on' : ''}`}>
												<input
													type="radio"
													name="active-ai-prompt"
													checked={isDefault}
													onChange={() => update('activePromptId', preset.id)}
												/>
												{isDefault ? <Check size={13} strokeWidth={2.6} aria-hidden="true" /> : null}
												<span>{text.defaultPrompt}</span>
											</label>
											<button
												type="button"
												onClick={() => removePrompt(preset.id)}
												aria-label={text.deletePrompt}
												title={text.deletePrompt}
												className="wst-icon-btn is-danger"
											>
												<Trash2 size={15} />
											</button>
										</div>
										<input
											required
											value={preset.name}
											onChange={event =>
												updatePrompt(preset.id, 'name', event.target.value)
											}
											maxLength={80}
											placeholder={`${text.promptName} ${index + 1}`}
											aria-label={text.promptName}
											className="wst-input"
											dir="auto"
										/>
										<textarea
											required
											value={preset.prompt}
											onChange={event =>
												updatePrompt(preset.id, 'prompt', event.target.value)
											}
											rows={5}
											maxLength={4000}
											placeholder={text.promptContent}
											aria-label={text.promptContent}
											className="wst-input wst-area"
											dir="auto"
										/>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			<footer className={`wst-foot${dirty ? ' is-dirty' : ''}`}>
				<p className="wst-foot-state" role="status" aria-live="polite">
					{error ? (
						<span className="is-bad">
							<AlertTriangle size={14} aria-hidden="true" />
							{error}
						</span>
					) : dirty ? (
						<span className="is-dirty">
							<i aria-hidden="true" />
							{text.unsaved}
						</span>
					) : saved ? (
						<span className="is-ok">
							<Check size={14} strokeWidth={2.6} aria-hidden="true" />
							{text.saved}
						</span>
					) : null}
				</p>
				<button type="submit" disabled={saving} className="wst-btn is-primary">
					{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
					{text.save}
				</button>
			</footer>
		</form>
	);
}
