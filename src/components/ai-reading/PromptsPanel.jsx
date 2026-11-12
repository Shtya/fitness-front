'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Check,
	Copy,
	FolderPlus,
	Folders,
	Globe2,
	Pencil,
	Plus,
	Search,
	Sparkles,
	Star,
	Trash2,
	X,
} from 'lucide-react';
import { createPrompt, createPromptFolder } from '@/lib/ai-reading/schemas';
import {
	deletePrompt,
	deletePromptFolder,
	listPromptFolders,
	listPrompts,
	upsertPrompt,
	upsertPromptFolder,
} from '@/lib/ai-reading/storage';
import { EmptyState, useRoomLang } from '@/components/ai-reading/room/RoomUI';

const GLOBAL_FOLDER_ID = '__global__';

function blankForm(folderId = null) {
	return { id: '', title: '', body: '', folderId };
}

function fromPrompt(prompt) {
	return {
		id: prompt.id || '',
		title: prompt.title || '',
		body: prompt.body || '',
		folderId: prompt.folderId || null,
	};
}

/** Favorites first, then the saved order, then by title. */
function sortPrompts(list) {
	return [...list].sort((a, b) => {
		if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
		const ao = Number(a.sortOrder) || 0;
		const bo = Number(b.sortOrder) || 0;
		if (ao !== bo) return ao - bo;
		return String(a.title || '').localeCompare(String(b.title || ''));
	});
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

/** Saved prompts library: folders (Global + projects), add/edit/copy, DB-backed. */
export default function PromptsPanel({ compactHeader = false } = {}) {
	const { L, ar } = useRoomLang();
	const [items, setItems] = useState(() => listPrompts());
	const [folders, setFolders] = useState(() => listPromptFolders());
	const [activeFolderId, setActiveFolderId] = useState(GLOBAL_FOLDER_ID);
	const [query, setQuery] = useState('');
	const [form, setForm] = useState(() => blankForm(null));
	const [editing, setEditing] = useState(false);
	const [copiedId, setCopiedId] = useState('');
	const [error, setError] = useState('');
	const [folderDraft, setFolderDraft] = useState('');
	const [folderBusy, setFolderBusy] = useState(false);
	const [renamingFolderId, setRenamingFolderId] = useState('');
	const [renameDraft, setRenameDraft] = useState('');
	const [expandedId, setExpandedId] = useState('');

	const refresh = useCallback(() => {
		setItems(listPrompts());
		setFolders(listPromptFolders());
	}, []);

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

	const folderCounts = useMemo(() => {
		const counts = { [GLOBAL_FOLDER_ID]: 0 };
		folders.forEach(folder => {
			counts[folder.id] = 0;
		});
		items.forEach(prompt => {
			const key = prompt.folderId || GLOBAL_FOLDER_ID;
			counts[key] = (counts[key] || 0) + 1;
		});
		return counts;
	}, [folders, items]);

	const folderScopeId = activeFolderId === GLOBAL_FOLDER_ID ? null : activeFolderId;

	const scopedItems = useMemo(() => {
		const inFolder = items.filter(item => (item.folderId || null) === folderScopeId);
		return sortPrompts(inFolder);
	}, [items, folderScopeId]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return scopedItems;
		return scopedItems.filter(item => {
			const hay = `${item.title || ''} ${item.description || ''} ${item.body || ''}`.toLowerCase();
			return hay.includes(q);
		});
	}, [scopedItems, query]);

	const openCreate = () => {
		setForm(blankForm(folderScopeId));
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
		setForm(blankForm(folderScopeId));
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
		const existing = form.id ? items.find(item => item.id === form.id) : null;
		const next = createPrompt({
			...(existing || {}),
			id: form.id || undefined,
			title,
			// The form no longer asks for a description; an older one is kept as it was.
			description: existing?.description || '',
			body,
			folderId: form.folderId || null,
			category: existing?.category || 'custom',
			favorite: Boolean(existing?.favorite),
			sortOrder: existing?.sortOrder,
			createdAt: existing?.createdAt,
		});
		upsertPrompt(next);
		refresh();
		if (next.folderId) setActiveFolderId(next.folderId);
		else setActiveFolderId(GLOBAL_FOLDER_ID);
		closeForm();
	};

	const remove = id => {
		if (!id) return;
		const ok = window.confirm(L('تحذف الـ prompt ده؟', 'Delete this prompt?'));
		if (!ok) return;
		deletePrompt(id);
		refresh();
		if (form.id === id) closeForm();
	};

	const toggleFavorite = prompt => {
		if (!prompt?.id) return;
		upsertPrompt({ ...prompt, favorite: !prompt.favorite });
		refresh();
	};

	const onCopy = async prompt => {
		const ok = await copyText(prompt.body);
		if (ok) setCopiedId(prompt.id);
	};

	const addFolder = event => {
		event.preventDefault();
		const name = folderDraft.trim();
		if (!name || folderBusy) return;
		setFolderBusy(true);
		try {
			const folder = upsertPromptFolder(createPromptFolder({ name }));
			if (folder?.id) {
				setActiveFolderId(folder.id);
				setFolderDraft('');
			}
			refresh();
		} finally {
			setFolderBusy(false);
		}
	};

	const startRenameFolder = folder => {
		setRenamingFolderId(folder.id);
		setRenameDraft(folder.name || '');
	};

	const commitRenameFolder = () => {
		const folder = folders.find(item => item.id === renamingFolderId);
		const name = renameDraft.trim();
		if (!folder || !name) {
			setRenamingFolderId('');
			setRenameDraft('');
			return;
		}
		upsertPromptFolder({ ...folder, name });
		setRenamingFolderId('');
		setRenameDraft('');
		refresh();
	};

	const removeFolder = folder => {
		const ok = window.confirm(
			L(
				`تحذف مجلد "${folder.name}"؟ الـ prompts هترجع لـ Global.`,
				`Delete folder "${folder.name}"? Prompts move back to Global.`,
			),
		);
		if (!ok) return;
		deletePromptFolder(folder.id);
		if (activeFolderId === folder.id) setActiveFolderId(GLOBAL_FOLDER_ID);
		refresh();
	};

	const folderOptions = [
		{ id: '', label: L('Global', 'Global') },
		...folders.map(folder => ({ id: folder.id, label: folder.name })),
	];

	return (
		<div className="space-y-6 sm:space-y-8">
			<header className={`flex flex-wrap items-end justify-between gap-4 ${compactHeader ? 'sm:items-center' : ''}`}>
				<div className="min-w-0">
					{compactHeader ? null : <p className="rr-eyebrow mb-2">{L('مكتبة الأوامر', 'Prompt library')}</p>}
					<h1 className={compactHeader ? 'rr-serif text-2xl font-medium' : 'rr-display'}>
						{L('الـ Prompts بتاعتك', 'Your prompts')}
					</h1>
					<p className="rr-muted mt-2 max-w-xl text-[15px] leading-relaxed">
						{L(
							'نظّمهم في مجلدات مشاريع (زي QSC)، واحفظهم في الداتابيز عشان ما يضيعوش.',
							'Organize them in project folders (like QSC) and keep them in the database so nothing is lost.',
						)}
					</p>
				</div>
				<button type="button" className="rr-btn rr-btn-primary" onClick={openCreate}>
					<Plus size={17} strokeWidth={2.2} />
					{L('Prompt جديد', 'New prompt')}
				</button>
			</header>

			<div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
				<aside className="rr-card space-y-3 p-3 sm:p-4">
					<div className="flex items-center gap-2 px-1">
						<Folders size={15} style={{ color: 'var(--rr-ink-3)' }} aria-hidden />
						<p className="text-[13px] font-semibold" style={{ color: 'var(--rr-ink-3)' }}>
							{L('المجلدات', 'Folders')}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setActiveFolderId(GLOBAL_FOLDER_ID)}
						aria-current={activeFolderId === GLOBAL_FOLDER_ID ? 'true' : undefined}
						className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition ${
							activeFolderId === GLOBAL_FOLDER_ID
								? 'bg-[color-mix(in_srgb,var(--rr-accent)_12%,transparent)]'
								: 'hover:bg-[var(--rr-sunken)]'
						}`}
						style={{ color: activeFolderId === GLOBAL_FOLDER_ID ? 'var(--rr-accent)' : 'var(--rr-ink-2)' }}
					>
						<Globe2 size={15} />
						<span className="min-w-0 flex-1 truncate">{L('Global', 'Global')}</span>
						<span
							className="rounded-full px-2 text-[11px] leading-5"
							style={{ background: 'var(--rr-sunken)', color: 'var(--rr-ink-3)' }}
						>
							{folderCounts[GLOBAL_FOLDER_ID] || 0}
						</span>
					</button>
					<ul className="space-y-1">
						{folders.map(folder => {
							const active = activeFolderId === folder.id;
							const renaming = renamingFolderId === folder.id;
							return (
								<li key={folder.id} className="group">
									{renaming ? (
										<form
											className="flex items-center gap-1 rounded-xl border px-2 py-1.5"
											style={{ borderColor: 'var(--rr-line)' }}
											onSubmit={event => {
												event.preventDefault();
												commitRenameFolder();
											}}
										>
											<input
												className="rr-field min-w-0 flex-1 !px-2 !py-1 text-sm"
												value={renameDraft}
												onChange={event => setRenameDraft(event.target.value)}
												autoFocus
												maxLength={80}
											/>
											<button type="submit" className="rr-icon-btn" aria-label={L('حفظ', 'Save')}>
												<Check size={14} />
											</button>
											<button
												type="button"
												className="rr-icon-btn"
												onClick={() => {
													setRenamingFolderId('');
													setRenameDraft('');
												}}
												aria-label={L('إلغاء', 'Cancel')}
											>
												<X size={14} />
											</button>
										</form>
									) : (
										<div
											className={`flex items-center gap-1 rounded-xl px-1 py-0.5 ${
												active ? 'bg-[color-mix(in_srgb,var(--rr-accent)_12%,transparent)]' : ''
											}`}
										>
											<button
												type="button"
												onClick={() => setActiveFolderId(folder.id)}
												className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-start text-sm font-semibold"
												style={{ color: active ? 'var(--rr-accent)' : 'var(--rr-ink-2)' }}
											>
												<span className="min-w-0 flex-1 truncate">{folder.name}</span>
												<span
													className="rounded-full px-2 text-[11px] leading-5"
													style={{ background: 'var(--rr-sunken)', color: 'var(--rr-ink-3)' }}
												>
													{folderCounts[folder.id] || 0}
												</span>
											</button>
											<button
												type="button"
												className="rr-icon-btn opacity-0 group-hover:opacity-100 focus:opacity-100"
												onClick={() => startRenameFolder(folder)}
												aria-label={L('إعادة تسمية', 'Rename')}
												title={L('إعادة تسمية', 'Rename')}
											>
												<Pencil size={13} />
											</button>
											<button
												type="button"
												className="rr-icon-btn opacity-0 group-hover:opacity-100 focus:opacity-100"
												onClick={() => removeFolder(folder)}
												aria-label={L('حذف المجلد', 'Delete folder')}
												title={L('حذف المجلد', 'Delete folder')}
											>
												<Trash2 size={13} />
											</button>
										</div>
									)}
								</li>
							);
						})}
					</ul>
					<form onSubmit={addFolder} className="flex items-center gap-1.5 pt-1">
						<input
							className="rr-field min-w-0 flex-1 !px-2.5 !py-2 text-sm"
							value={folderDraft}
							onChange={event => setFolderDraft(event.target.value)}
							placeholder={L('مجلد مشروع… مثل QSC', 'Project folder… e.g. QSC')}
							maxLength={80}
						/>
						<button
							type="submit"
							className="rr-btn rr-btn-quiet rr-btn-sm shrink-0"
							disabled={!folderDraft.trim() || folderBusy}
							aria-label={L('إضافة مجلد', 'Add folder')}
							title={L('إضافة مجلد', 'Add folder')}
						>
							<FolderPlus size={15} />
						</button>
					</form>
				</aside>

				<div className="min-w-0 space-y-4">
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
							placeholder={L('ابحث في العناوين ونص الـ prompts…', 'Search titles and prompt text…')}
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
										{L('المجلد', 'Folder')}
									</span>
									<select
										className="rr-field w-full"
										value={form.folderId || ''}
										onChange={event =>
											setForm(current => ({
												...current,
												folderId: event.target.value || null,
											}))
										}
									>
										{folderOptions.map(option => (
											<option key={option.id || 'global'} value={option.id}>
												{option.label}
											</option>
										))}
									</select>
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
									<p
										className="rounded-xl px-3 py-2 text-sm font-semibold"
										style={{ background: 'var(--rr-danger-soft)', color: 'var(--rr-danger)' }}
									>
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
										: L('لسه مفيش prompts هنا', 'No prompts in this folder')
								}
								body={
									query
										? L('جرّب كلمة تانية، أو امسح البحث.', 'Try another word, or clear the search.')
										: L(
												'ضيف أمر في المجلد ده، أو انقل prompts موجودة له.',
												'Add a prompt to this folder, or move existing ones here.',
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
						<div className="space-y-3">
							<ul className="grid gap-3 xl:grid-cols-2">
								{filtered.map(prompt => {
									const copied = copiedId === prompt.id;
									const expanded = expandedId === prompt.id;
									const body = String(prompt.body || '');
									const words = body.trim() ? body.trim().split(/\s+/).length : 0;
									return (
										<li
											key={prompt.id}
											className="rr-card group flex min-w-0 flex-col p-4 transition-shadow hover:shadow-[0_6px_22px_-12px_rgba(29,28,26,0.28)] sm:p-5"
										>
											<div className="flex items-start gap-3">
												<span
													className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
													style={{
														background: 'color-mix(in srgb, var(--rr-accent) 12%, transparent)',
														color: 'var(--rr-accent)',
													}}
													aria-hidden
												>
													<Sparkles size={16} strokeWidth={2.1} />
												</span>
												<div className="min-w-0 flex-1">
													<h3 className="rr-serif truncate text-[17px] font-medium leading-snug" dir="auto">
														{prompt.title || L('بدون عنوان', 'Untitled')}
													</h3>
													<p className="mt-0.5 text-[12px]" style={{ color: 'var(--rr-ink-3)' }}>
														{ar ? `${words.toLocaleString('ar-EG')} كلمة` : `${words.toLocaleString('en')} words`}
													</p>
												</div>
												<button
													type="button"
													className={`rr-icon-btn shrink-0 transition-opacity ${
														prompt.favorite ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
													}`}
													onClick={() => toggleFavorite(prompt)}
													aria-pressed={Boolean(prompt.favorite)}
													aria-label={prompt.favorite ? L('إزالة من المفضلة', 'Unfavorite') : L('ثبّت في المفضلة', 'Add to favorites')}
													title={prompt.favorite ? L('إزالة من المفضلة', 'Unfavorite') : L('ثبّت في المفضلة', 'Add to favorites')}
												>
													<Star
														size={15}
														className={prompt.favorite ? 'fill-current' : ''}
														style={prompt.favorite ? { color: 'var(--rr-accent)' } : undefined}
													/>
												</button>
											</div>

											<button
												type="button"
												onClick={() => setExpandedId(expanded ? '' : prompt.id)}
												aria-expanded={expanded}
												title={expanded ? L('اقفل', 'Collapse') : L('اعرض النص كله', 'Show the full prompt')}
												className="mt-3 w-full rounded-xl px-3.5 py-3 text-start text-[13.5px] leading-relaxed transition-colors hover:brightness-[0.98]"
												style={{ background: 'var(--rr-sunken)', color: 'var(--rr-ink-2)' }}
											>
												<span
													dir="auto"
													className={expanded ? 'block max-h-[420px] overflow-y-auto whitespace-pre-wrap' : 'line-clamp-3'}
												>
													{expanded ? body : body.replace(/\s+/g, ' ').trim()}
												</span>
											</button>

											<div className="mt-3 flex items-center gap-1.5">
												<button
													type="button"
													className="rr-btn rr-btn-primary rr-btn-sm"
													onClick={() => void onCopy(prompt)}
													aria-label={L('نسخ الـ prompt', 'Copy prompt')}
												>
													{copied ? <Check size={15} strokeWidth={2.3} /> : <Copy size={15} strokeWidth={2.1} />}
													<span>{copied ? L('اتنسخ', 'Copied') : L('نسخ', 'Copy')}</span>
												</button>
												<span className="flex-1" />
												<button
													type="button"
													className="rr-icon-btn"
													onClick={() => openEdit(prompt)}
													aria-label={L('تعديل', 'Edit')}
													title={L('تعديل', 'Edit')}
												>
													<Pencil size={15} />
												</button>
												<button
													type="button"
													className="rr-icon-btn hover:!text-[var(--rr-danger)]"
													onClick={() => remove(prompt.id)}
													aria-label={L('حذف', 'Delete')}
													title={L('حذف', 'Delete')}
												>
													<Trash2 size={15} />
												</button>
											</div>
										</li>
									);
								})}
							</ul>
							<p className="px-1 text-[12px]" style={{ color: 'var(--rr-ink-3)' }}>
								{ar
									? `${filtered.length} من ${scopedItems.length} في المجلد ده`
									: `${filtered.length} of ${scopedItems.length} in this folder`}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
