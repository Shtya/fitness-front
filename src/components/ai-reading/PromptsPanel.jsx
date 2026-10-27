'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Check,
	Copy,
	Pencil,
	Plus,
	Search,
	Sparkles,
	Star,
	Trash2,
	X,
} from 'lucide-react';
import { createPrompt } from '@/lib/ai-reading/schemas';
import { deletePrompt, listPrompts, upsertPrompt } from '@/lib/ai-reading/storage';
import { EmptyState, useRoomLang } from '@/components/ai-reading/room/RoomUI';

function blankForm() {
	return { id: '', title: '', description: '', body: '' };
}

function fromPrompt(prompt) {
	return {
		id: prompt.id || '',
		title: prompt.title || '',
		description: prompt.description || '',
		body: prompt.body || '',
	};
}

async function copyText(text) {
	const value = String(text || '');
	if (!value) return false;
	try {
		await navigator.clipboard.writeText(value);
		return true;
	} catch {
		try {
			const area = document.createElement('textarea');
			area.value = value;
			area.setAttribute('readonly', '');
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.appendChild(area);
			area.select();
			const ok = document.execCommand('copy');
			document.body.removeChild(area);
			return ok;
		} catch {
			return false;
		}
	}
}

/** Saved prompts library: add, edit, copy, and remember what each one is for. */
export default function PromptsPanel() {
	const { L, ar } = useRoomLang();
	const [items, setItems] = useState(() => listPrompts());
	const [query, setQuery] = useState('');
	const [form, setForm] = useState(blankForm);
	const [editing, setEditing] = useState(false);
	const [copiedId, setCopiedId] = useState('');
	const [error, setError] = useState('');

	const refresh = useCallback(() => setItems(listPrompts()), []);

	useEffect(() => {
		refresh();
		window.addEventListener('ai-reading:changed', refresh);
		return () => window.removeEventListener('ai-reading:changed', refresh);
	}, [refresh]);

	useEffect(() => {
		if (!copiedId) return undefined;
		const timer = window.setTimeout(() => setCopiedId(''), 1600);
		return () => window.clearTimeout(timer);
	}, [copiedId]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return items;
		return items.filter(item => {
			const hay = `${item.title || ''} ${item.description || ''} ${item.body || ''}`.toLowerCase();
			return hay.includes(q);
		});
	}, [items, query]);

	const openCreate = () => {
		setForm(blankForm());
		setEditing(true);
		setError('');
	};

	const openEdit = prompt => {
		setForm(fromPrompt(prompt));
		setEditing(true);
		setError('');
	};

	const closeForm = () => {
		setEditing(false);
		setForm(blankForm());
		setError('');
	};

	const save = event => {
		event.preventDefault();
		const title = form.title.trim();
		const body = form.body.trim();
		if (!title || !body) {
			setError(L('اكتب عنوانًا ونص الـ prompt.', 'Add a title and the prompt text.'));
			return;
		}
		const next = createPrompt({
			...(form.id ? items.find(item => item.id === form.id) || {} : {}),
			id: form.id || undefined,
			title,
			description: form.description.trim(),
			body,
			category: 'custom',
		});
		upsertPrompt(next);
		refresh();
		closeForm();
	};

	const remove = id => {
		if (!id) return;
		const ok = window.confirm(
			L('تحذف الـ prompt ده؟', 'Delete this prompt?'),
		);
		if (!ok) return;
		deletePrompt(id);
		refresh();
		if (form.id === id) closeForm();
	};

	const toggleFavorite = prompt => {
		upsertPrompt({ ...prompt, favorite: !prompt.favorite });
		refresh();
	};

	const onCopy = async prompt => {
		const ok = await copyText(prompt.body);
		if (ok) setCopiedId(prompt.id);
	};

	return (
		<div className="space-y-8 sm:space-y-10">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					<p className="rr-eyebrow mb-2">{L('مكتبة الأوامر', 'Prompt library')}</p>
					<h1 className="rr-display">{L('الـ Prompts بتاعتك', 'Your prompts')}</h1>
					<p className="rr-muted mt-2 max-w-xl text-[15px] leading-relaxed">
						{L(
							'احفظ أوامر جاهزة، واكتب هي بتعمل إيه، وانسخها بضغطة لما تحتاجها.',
							'Save reusable prompts, note what each one does, and copy them in one tap.',
						)}
					</p>
				</div>
				<button type="button" className="rr-btn rr-btn-primary" onClick={openCreate}>
					<Plus size={17} strokeWidth={2.2} />
					{L('Prompt جديد', 'New prompt')}
				</button>
			</header>

			<div className="relative">
				<Search
					size={16}
					strokeWidth={2}
					className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
					style={{ color: 'var(--rr-ink-3)' }}
				/>
				<input
					type="search"
					value={query}
					onChange={event => setQuery(event.target.value)}
					placeholder={L('ابحث بالعنوان أو الوصف…', 'Search by title or description…')}
					className="rr-field w-full ps-10"
					aria-label={L('بحث في الـ prompts', 'Search prompts')}
				/>
			</div>

			<AnimatePresence initial={false}>
				{editing ? (
					<motion.form
						key="prompt-form"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.22 }}
						onSubmit={save}
						className="rr-card space-y-4 p-5 sm:p-6"
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="rr-eyebrow mb-1">
									{form.id ? L('تعديل', 'Edit') : L('إضافة', 'Create')}
								</p>
								<h2 className="rr-serif text-xl font-medium">
									{form.id
										? L('عدّل الـ prompt', 'Edit prompt')
										: L('ضيف prompt جديد', 'Add a new prompt')}
								</h2>
							</div>
							<button
								type="button"
								className="rr-icon-btn"
								onClick={closeForm}
								aria-label={L('إغلاق', 'Close')}
							>
								<X size={18} />
							</button>
						</div>

						<label className="block space-y-1.5">
							<span className="text-[12.5px] font-semibold" style={{ color: 'var(--rr-ink-2)' }}>
								{L('العنوان', 'Title')}
							</span>
							<input
								className="rr-field w-full"
								value={form.title}
								onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
								placeholder={L('مثال: تلخيص صفحة', 'e.g. Summarize a page')}
								maxLength={120}
								required
							/>
						</label>

						<label className="block space-y-1.5">
							<span className="text-[12.5px] font-semibold" style={{ color: 'var(--rr-ink-2)' }}>
								{L('بتعمل إيه؟', 'What does it do?')}
							</span>
							<input
								className="rr-field w-full"
								value={form.description}
								onChange={event =>
									setForm(current => ({ ...current, description: event.target.value }))
								}
								placeholder={L(
									'وصف قصير عشان تعرف تستخدمه امتى',
									'Short note so you remember when to use it',
								)}
								maxLength={240}
							/>
						</label>

						<label className="block space-y-1.5">
							<span className="text-[12.5px] font-semibold" style={{ color: 'var(--rr-ink-2)' }}>
								{L('نص الـ prompt', 'Prompt text')}
							</span>
							<textarea
								className="rr-field min-h-[160px] w-full resize-y leading-relaxed"
								value={form.body}
								onChange={event => setForm(current => ({ ...current, body: event.target.value }))}
								placeholder={L('الصق الأمر كامل هنا…', 'Paste the full prompt here…')}
								dir="auto"
								required
							/>
						</label>

						{error ? (
							<p className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: 'var(--rr-danger-soft)', color: 'var(--rr-danger)' }}>
								{error}
							</p>
						) : null}

						<div className="flex flex-wrap items-center gap-2 pt-1">
							<button type="submit" className="rr-btn rr-btn-primary">
								<Check size={16} strokeWidth={2.2} />
								{L('حفظ', 'Save')}
							</button>
							<button type="button" className="rr-btn rr-btn-quiet" onClick={closeForm}>
								{L('إلغاء', 'Cancel')}
							</button>
						</div>
					</motion.form>
				) : null}
			</AnimatePresence>

			{!filtered.length ? (
				<div className="rr-card">
					<EmptyState
						icon={Sparkles}
						title={
							query
								? L('مفيش نتيجة', 'No matches')
								: L('لسه مفيش prompts', 'No prompts yet')
						}
						body={
							query
								? L('جرّب كلمة تانية، أو امسح البحث.', 'Try another word, or clear the search.')
								: L(
										'ضيف أول أمر تستخدمه كتير — هيوفر وقتك كل مرة.',
										'Add the first prompt you reuse often — it will save you time every time.',
									)
						}
						action={
							!query ? (
								<button type="button" className="rr-btn rr-btn-primary" onClick={openCreate}>
									<Plus size={17} /> {L('ضيف Prompt', 'Add a prompt')}
								</button>
							) : null
						}
					/>
				</div>
			) : (
				<div className="overflow-hidden rounded-[var(--rr-radius)] border" style={{ borderColor: 'var(--rr-line)', background: 'var(--rr-surface)', boxShadow: 'var(--rr-shadow-sm)' }}>
					<div className="hidden border-b px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wide sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] sm:gap-4" style={{ borderColor: 'var(--rr-line)', color: 'var(--rr-ink-3)', background: 'var(--rr-sunken)' }}>
						<span>{L('الـ prompt', 'Prompt')}</span>
						<span>{L('بيعمل إيه', 'What it does')}</span>
						<span className="text-end">{L('إجراءات', 'Actions')}</span>
					</div>
					<ul className="divide-y" style={{ borderColor: 'var(--rr-line)' }}>
						{filtered.map(prompt => {
							const copied = copiedId === prompt.id;
							return (
								<li
									key={prompt.id}
									className="grid gap-3 px-4 py-4 transition-colors sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-4"
									style={{ borderColor: 'var(--rr-line)' }}
								>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											{prompt.favorite ? (
												<Star size={13} className="shrink-0 fill-current" style={{ color: 'var(--rr-accent)' }} aria-hidden />
											) : null}
											<p className="rr-serif truncate text-[16px] font-medium leading-snug">
												{prompt.title || L('بدون عنوان', 'Untitled')}
											</p>
										</div>
										<p
											className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed"
											style={{ color: 'var(--rr-ink-3)' }}
											dir="auto"
										>
											{(prompt.body || '').replace(/\s+/g, ' ').trim()}
										</p>
									</div>
									<div className="min-w-0">
										<p className="text-[12px] font-semibold uppercase tracking-wide sm:hidden" style={{ color: 'var(--rr-ink-3)' }}>
											{L('بيعمل إيه', 'What it does')}
										</p>
										<p className="mt-0.5 text-[14px] leading-relaxed sm:mt-0" style={{ color: 'var(--rr-ink-2)' }} dir="auto">
											{prompt.description?.trim() || (
												<span style={{ color: 'var(--rr-ink-3)' }}>
													{L('مفيش وصف لسه', 'No description yet')}
												</span>
											)}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
										<button
											type="button"
											className="rr-btn rr-btn-primary rr-btn-sm"
											onClick={() => void onCopy(prompt)}
											title={L('نسخ الـ prompt', 'Copy prompt')}
											aria-label={L('نسخ الـ prompt', 'Copy prompt')}
										>
											{copied ? <Check size={15} strokeWidth={2.3} /> : <Copy size={15} strokeWidth={2.1} />}
											<span>{copied ? L('اتنسخ', 'Copied') : L('نسخ', 'Copy')}</span>
										</button>
										<button
											type="button"
											className="rr-btn rr-btn-quiet rr-btn-sm"
											onClick={() => openEdit(prompt)}
											aria-label={L('تعديل', 'Edit')}
											title={L('تعديل', 'Edit')}
										>
											<Pencil size={14} />
										</button>
										<button
											type="button"
											className="rr-btn rr-btn-quiet rr-btn-sm"
											onClick={() => toggleFavorite(prompt)}
											aria-label={prompt.favorite ? L('إزالة من المفضلة', 'Unfavorite') : L('مفضلة', 'Favorite')}
											title={prompt.favorite ? L('إزالة من المفضلة', 'Unfavorite') : L('مفضلة', 'Favorite')}
										>
											<Star size={14} className={prompt.favorite ? 'fill-current' : ''} style={prompt.favorite ? { color: 'var(--rr-accent)' } : undefined} />
										</button>
										<button
											type="button"
											className="rr-btn rr-btn-quiet rr-btn-sm"
											onClick={() => remove(prompt.id)}
											aria-label={L('حذف', 'Delete')}
											title={L('حذف', 'Delete')}
										>
											<Trash2 size={14} />
										</button>
									</div>
								</li>
							);
						})}
					</ul>
					<p className="border-t px-4 py-2.5 text-[12px]" style={{ borderColor: 'var(--rr-line)', color: 'var(--rr-ink-3)' }}>
						{ar
							? `${filtered.length} من ${items.length} أمر`
							: `${filtered.length} of ${items.length} prompts`}
					</p>
				</div>
			)}
		</div>
	);
}
