'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	Calendar,
	Check,
	Image as ImageIcon,
	Loader2,
	Plus,
	Send,
	Star,
	Trash2,
	X,
} from 'lucide-react';
import { resolveBoardMediaUrl, uploadBoardImage } from './useWhatsAppBoardApi';

const LABEL_PILL = {
	pink: 'bg-[#fff0f4] text-[#de4b70]',
	orange: 'bg-[#fff5e7] text-[#eb9218]',
	purple: 'bg-[#f4efff] text-[#8556d8]',
	blue: 'bg-[#edf6ff] text-[#2c82de]',
	green: 'bg-[#e9f9f2] text-[#17a96f]',
};

const LABEL_COLORS = [
	{ id: 'pink', value: '#f13d72' },
	{ id: 'orange', value: '#ff981b' },
	{ id: 'purple', value: '#8d58de' },
	{ id: 'blue', value: '#2785ed' },
	{ id: 'green', value: '#17b77a' },
];

function labelPillClass(label) {
	const name = String(label?.name || '').toLowerCase();
	const color = String(label?.color || '').toLowerCase();
	if (name.includes('urgent') || color.includes('f1') || color.includes('ef')) return LABEL_PILL.pink;
	if (name.includes('personal') || color.includes('f5') || color.includes('ff9')) return LABEL_PILL.orange;
	if (name.includes('work') || color.includes('8d') || color.includes('a1')) return LABEL_PILL.purple;
	if (name.includes('done') || color.includes('17') || color.includes('10')) return LABEL_PILL.green;
	return LABEL_PILL.blue;
}

function cloneCard(card) {
	return {
		...card,
		labels: [...(card.labels || [])],
		checklist: (card.checklist || []).map(item => ({ ...item })),
		comments: [...(card.comments || [])],
		attachments: [...(card.attachments || [])],
		links: [...(card.links || [])],
	};
}

/**
 * Side drawer for full card editing with debounced autosave.
 */
export default function TaskBoardCardDrawer({
	card,
	lists = [],
	locale = 'en',
	onClose,
	onPatch,
	onDelete,
	onToggleComplete,
	onDuplicate,
	onOpenConversation,
	availableLabels = [],
	isDone = false,
}) {
	const ar = locale === 'ar';
	const [draft, setDraft] = useState(() => cloneCard(card));
	const [commentText, setCommentText] = useState('');
	const [labelDraft, setLabelDraft] = useState('');
	const [subItemDraft, setSubItemDraft] = useState('');
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [uploading, setUploading] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const fileRef = useRef(null);
	const pasteLock = useRef(false);
	const saveTimer = useRef(null);
	const pendingUpdates = useRef({});
	const draftRef = useRef(draft);

	useEffect(() => {
		draftRef.current = draft;
	}, [draft]);

	useEffect(() => {
		setDraft(cloneCard(card));
		setSaveError('');
		pendingUpdates.current = {};
	}, [card.id]);

	useEffect(() => {
		const onKey = event => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	const flushSave = useCallback(async () => {
		const updates = pendingUpdates.current;
		if (!Object.keys(updates).length) return;
		pendingUpdates.current = {};
		setSaving(true);
		setSaveError('');
		try {
			await onPatch(card.id, updates);
		} catch (err) {
			setDraft(cloneCard(card));
			setSaveError(err?.response?.data?.message || err?.message || (ar ? 'فشل الحفظ' : 'Save failed'));
			toast.error(ar ? 'تعذر حفظ البطاقة' : 'Could not save card');
			throw err;
		} finally {
			setSaving(false);
		}
	}, [ar, card, onPatch]);

	const applyDraft = useCallback(updates => {
		setDraft(current => {
			const next = { ...current, ...updates };
			draftRef.current = next;
			return next;
		});
	}, []);

	const queueSave = useCallback(
		(updates, { immediate = false } = {}) => {
			pendingUpdates.current = { ...pendingUpdates.current, ...updates };
			setDraft(current => {
				const next = { ...current, ...updates };
				draftRef.current = next;
				return next;
			});
			if (saveTimer.current) clearTimeout(saveTimer.current);
			if (immediate) {
				void flushSave();
				return;
			}
			saveTimer.current = setTimeout(() => {
				void flushSave();
			}, 450);
		},
		[flushSave],
	);

	const addImageFile = async file => {
		if (!file || !file.type?.startsWith('image/')) return;
		if (pasteLock.current) return;
		pasteLock.current = true;
		const tempId = `att-${Date.now()}`;
		const previewUrl = URL.createObjectURL(file);
		const optimisticAttachment = {
			id: tempId,
			url: previewUrl,
			name: file.name || 'Image',
			__local: true,
		};
		applyDraft({
			attachments: [...(draftRef.current.attachments || []), optimisticAttachment],
			coverImage: draftRef.current.coverImage || previewUrl,
		});
		setUploading(true);
		setSaveError('');
		try {
			const url = await uploadBoardImage(file);
			if (!url) throw new Error(ar ? 'فشل رفع الصورة' : 'Upload failed');
			const attachments = [
				...(draftRef.current.attachments || []).filter(item => item.id !== tempId),
				{ id: tempId, url, name: file.name || 'Image' },
			];
			const coverImage =
				!draftRef.current.coverImage || String(draftRef.current.coverImage).startsWith('blob:')
					? url
					: draftRef.current.coverImage;
			pendingUpdates.current = {
				...pendingUpdates.current,
				attachments,
				coverImage,
			};
			applyDraft({ attachments, coverImage });
			await flushSave();
			toast.success(ar ? 'تمت إضافة الصورة' : 'Image added');
		} catch (err) {
			applyDraft({
				attachments: (draftRef.current.attachments || []).filter(item => item.id !== tempId),
				coverImage:
					String(draftRef.current.coverImage) === previewUrl ? null : draftRef.current.coverImage,
			});
			toast.error(err?.message || (ar ? 'فشل رفع الصورة' : 'Upload failed'));
		} finally {
			URL.revokeObjectURL(previewUrl);
			setUploading(false);
			pasteLock.current = false;
		}
	};

	const onPaste = async event => {
		const items = event.clipboardData?.items;
		if (!items) return;
		for (const item of items) {
			if (!item.type?.startsWith('image/')) continue;
			event.preventDefault();
			const file = item.getAsFile();
			if (file) await addImageFile(file);
			break;
		}
	};

	const toggleLabel = label => {
		const exists = (draft.labels || []).some(item => item.id === label.id);
		queueSave(
			{
				labels: exists
					? draft.labels.filter(item => item.id !== label.id)
					: [...(draft.labels || []), label],
			},
			{ immediate: true },
		);
	};

	const addLabel = () => {
		const name = labelDraft.trim();
		if (!name) return;
		const color = LABEL_COLORS[(draft.labels || []).length % LABEL_COLORS.length].value;
		queueSave(
			{ labels: [...(draft.labels || []), { id: `lbl-${Date.now()}`, name, color }] },
			{ immediate: true },
		);
		setLabelDraft('');
	};

	const addSubItem = () => {
		const text = subItemDraft.trim();
		if (!text) return;
		queueSave(
			{
				checklist: [
					...(draft.checklist || []),
					{ id: `chk-${Date.now()}`, text, completed: false },
				],
			},
			{ immediate: true },
		);
		setSubItemDraft('');
	};

	const checklist = draft.checklist || [];
	const doneCount = checklist.filter(item => item.completed).length;
	const imageAttachments = (draft.attachments || [])
		.map(item => ({
			...item,
			src:
				item.url && (item.url.startsWith('blob:') || item.url.startsWith('data:'))
					? item.url
					: resolveBoardMediaUrl(item.url),
		}))
		.filter(item => item.src);
	const cover = resolveBoardMediaUrl(draft.coverImage) || imageAttachments[0]?.src || '';

	const handleClose = async () => {
		if (saveTimer.current) clearTimeout(saveTimer.current);
		try {
			await flushSave();
		} catch {
			return;
		}
		onClose();
	};

	return (
		<div className="fixed inset-0 z-[100000] flex" dir={ar ? 'rtl' : 'ltr'} onPaste={onPaste}>
			<button
				type="button"
				aria-label={ar ? 'إغلاق' : 'Close'}
				className="absolute inset-0 bg-black/25 transition-opacity"
				onClick={() => void handleClose()}
			/>
			<aside
				className={`relative ms-auto flex h-full w-full max-w-[440px] flex-col border-[#dce1e8] bg-white shadow-[-8px_0_30px_rgba(27,39,62,0.14)] animate-in slide-in-from-right duration-200 ${
					ar ? 'border-e' : 'border-s'
				}`}
				onClick={event => event.stopPropagation()}
				onDragOver={event => {
					event.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={event => {
					event.preventDefault();
					setDragOver(false);
					const file = event.dataTransfer?.files?.[0];
					if (file) void addImageFile(file);
				}}
			>
				<header className="flex shrink-0 items-center gap-2 border-b border-[#edf0f4] px-4 py-3">
					<div className="min-w-0 flex-1">
						<p className="text-[11px] font-bold uppercase tracking-wide text-[#8a95a5]">
							{ar ? 'تفاصيل المهمة' : 'Task details'}
						</p>
						<p className="truncate text-[12px] text-[#667781]">
							{saving
								? ar
									? 'جارٍ الحفظ…'
									: 'Saving…'
								: saveError
									? ar
										? 'فشل الحفظ'
										: 'Save failed'
									: ar
										? 'حفظ تلقائي'
										: 'Autosaved'}
						</p>
					</div>
					{saving ? <Loader2 size={14} className="animate-spin text-[#0db873]" /> : null}
					<button
						type="button"
						onClick={() => void handleClose()}
						className="grid h-9 w-9 place-items-center rounded-xl bg-[#f5f6f8] text-[#415069] hover:bg-[#eceff3]"
					>
						<X size={16} />
					</button>
				</header>

				<div className="nice-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
					<section className="flex items-start gap-2">
						<button
							type="button"
							onClick={() => onToggleComplete?.({ ...card, isCompleted: isDone })}
							className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-all ${
								isDone
									? 'border-[#13b779] bg-[#13b779] text-white'
									: 'border-[#c9d2de] bg-white hover:border-[#13b779]'
							}`}
						>
							{isDone ? <Check size={14} strokeWidth={3} /> : null}
						</button>
						<input
							value={draft.title || ''}
							onChange={event => queueSave({ title: event.target.value })}
							className={`min-w-0 flex-1 bg-transparent text-lg font-bold outline-none ${
								isDone ? 'text-[#6b7788] line-through' : 'text-[#18243b]'
							}`}
							placeholder={ar ? 'عنوان المهمة' : 'Task title'}
						/>
					</section>

					<section>
						<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
							{ar ? 'الوصف' : 'Description'}
						</label>
						<textarea
							value={draft.description || ''}
							onChange={event => queueSave({ description: event.target.value })}
							onPaste={onPaste}
							rows={4}
							placeholder={ar ? 'أضف وصفاً…' : 'Add a description…'}
							className="w-full resize-none rounded-xl border border-[#e2e7ee] px-3 py-2.5 text-[13px] leading-5 outline-none focus:border-[#0db873]"
						/>
						{imageAttachments.length ? (
							<div className="mt-2 flex flex-wrap gap-1.5">
								{imageAttachments.map(item => (
									<div
										key={item.id}
										className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#e8ecf1] bg-[#f5f7fa]"
									>
										<img src={item.src} alt="" className="h-full w-full object-cover" />
										<button
											type="button"
											className="absolute end-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100"
											onClick={() => {
												const nextAttachments = (draft.attachments || []).filter(
													row => row.id !== item.id,
												);
												queueSave(
													{
														attachments: nextAttachments,
														coverImage:
															resolveBoardMediaUrl(draft.coverImage) === item.src
																? nextAttachments[0]?.url || null
																: draft.coverImage,
													},
													{ immediate: true },
												);
											}}
										>
											<X size={9} />
										</button>
									</div>
								))}
							</div>
						) : null}
					</section>

					<section className="grid grid-cols-2 gap-2">
						<div>
							<label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
								{ar ? 'العمود' : 'Column'}
							</label>
							<select
								value={draft.listId || ''}
								onChange={event =>
									queueSave({ listId: event.target.value }, { immediate: true })
								}
								className="h-9 w-full rounded-xl border border-[#e2e7ee] px-2.5 text-[12px] outline-none focus:border-[#0db873]"
							>
								{lists.map(list => (
									<option key={list.id} value={list.id}>
										{list.title}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
								{ar ? 'الاستحقاق' : 'Due date'}
							</label>
							<input
								type="date"
								value={draft.dueDate || ''}
								onChange={event =>
									queueSave({ dueDate: event.target.value || null }, { immediate: true })
								}
								className="h-9 w-full rounded-xl border border-[#e2e7ee] px-2.5 text-[12px] outline-none focus:border-[#0db873]"
							/>
						</div>
					</section>

					<section>
						<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
							{ar ? 'الأولوية' : 'Priority'}
						</label>
						<button
							type="button"
							onClick={() =>
								queueSave({ isStarred: !draft.isStarred }, { immediate: true })
							}
							className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border text-[12px] font-semibold ${
								draft.isStarred
									? 'border-[#f5b400]/40 bg-[#fff8e8] text-[#b78105]'
									: 'border-[#e2e7ee] text-[#54656f]'
							}`}
						>
							<Star
								size={13}
								className={draft.isStarred ? 'fill-[#f5b400] text-[#f5b400]' : ''}
							/>
							{draft.isStarred ? (ar ? 'مميّز / عالية' : 'Starred / High') : ar ? 'عادي' : 'Normal'}
						</button>
					</section>

					<section>
						<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
							{ar ? 'صورة' : 'Image'}
						</label>
						{cover ? (
							<div className="space-y-2">
								<div className="relative overflow-hidden rounded-xl border border-[#e8ecf1]">
									<img src={cover} alt="" className="max-h-44 w-full object-cover" />
									<button
										type="button"
										className="absolute end-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white"
										onClick={() =>
											queueSave({ coverImage: null, attachments: [] }, { immediate: true })
										}
									>
										{ar ? 'إزالة' : 'Remove'}
									</button>
								</div>
								{imageAttachments.length > 1 ? (
									<div className="flex flex-wrap gap-1.5">
										{imageAttachments.slice(1).map(item => (
											<img
												key={item.id}
												src={item.src}
												alt=""
												className="h-12 w-12 rounded-lg border border-[#e8ecf1] object-cover"
											/>
										))}
									</div>
								) : null}
							</div>
						) : (
							<label
								className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-5 text-center text-[11px] font-semibold transition-colors ${
									dragOver
										? 'border-[#0db873] bg-[#eefaf4] text-[#0db873]'
										: 'border-[#d5dde8] bg-[#fbfcfd] text-[#667781] hover:border-[#0db873]'
								}`}
							>
								{uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
								{ar ? 'رفع / لصق Ctrl+V / سحب صورة' : 'Upload / paste Ctrl+V / drop image'}
								<input
									ref={fileRef}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={event => {
										const file = event.target.files?.[0];
										event.target.value = '';
										if (file) void addImageFile(file);
									}}
								/>
							</label>
						)}
					</section>

					<section>
						<div className="mb-2 flex items-center justify-between">
							<label className="text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
								{ar ? 'عناصر فرعية' : 'Sub-items'} ({doneCount}/{checklist.length})
							</label>
						</div>
						<ul className="space-y-1.5">
							{checklist.map(item => (
								<li
									key={item.id}
									className="flex items-center gap-2 rounded-lg border border-[#e8ecf1] px-2 py-1.5"
								>
									<button
										type="button"
										onClick={() =>
											queueSave(
												{
													checklist: checklist.map(row =>
														row.id === item.id
															? { ...row, completed: !row.completed }
															: row,
													),
												},
												{ immediate: true },
											)
										}
										className={`grid h-4 w-4 place-items-center rounded border-2 ${
											item.completed
												? 'border-[#13b779] bg-[#13b779] text-white'
												: 'border-[#c9d0da]'
										}`}
									>
										{item.completed ? <Check size={10} strokeWidth={3} /> : null}
									</button>
									<input
										value={item.text}
										onChange={event =>
											queueSave({
												checklist: checklist.map(row =>
													row.id === item.id
														? { ...row, text: event.target.value }
														: row,
												),
											})
										}
										className={`min-w-0 flex-1 bg-transparent text-[12px] outline-none ${
											item.completed
												? 'text-slate-400 line-through'
												: 'text-[#18243b]'
										}`}
									/>
									<button
										type="button"
										onClick={() =>
											queueSave(
												{ checklist: checklist.filter(row => row.id !== item.id) },
												{ immediate: true },
											)
										}
										className="text-slate-400 hover:text-red-500"
									>
										<Trash2 size={12} />
									</button>
								</li>
							))}
						</ul>
						<div className="mt-2 relative">
							<input
								value={subItemDraft}
								onChange={event => setSubItemDraft(event.target.value)}
								placeholder={ar ? 'عنصر فرعي جديد' : 'New sub-item'}
								className="h-9 w-full rounded-lg border border-[#e2e7ee] pe-16 ps-2.5 text-xs outline-none focus:border-[#0db873]"
								onKeyDown={event => {
									if (event.key === 'Enter') addSubItem();
								}}
							/>
							<button
								type="button"
								onClick={addSubItem}
								className="absolute end-1 top-1/2 inline-flex h-7 -translate-y-1/2 items-center gap-0.5 rounded-md bg-[#0db873] px-2 text-[10px] font-semibold text-white"
							>
								<Plus size={11} />
								{ar ? 'إضافة' : 'Add'}
							</button>
						</div>
					</section>

					<section>
						<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
							{ar ? 'التصنيفات' : 'Labels'}
						</label>
						<div className="mb-2 flex flex-wrap gap-1.5">
							{(draft.labels || []).map(label => (
								<button
									key={label.id}
									type="button"
									onClick={() => toggleLabel(label)}
									className={`rounded-md px-2 py-1 text-[10px] font-semibold ${labelPillClass(label)}`}
								>
									{label.name} ×
								</button>
							))}
							{availableLabels
								.filter(label => !(draft.labels || []).some(item => item.id === label.id))
								.map(label => (
									<button
										key={label.id}
										type="button"
										onClick={() => toggleLabel(label)}
										className="rounded-md border border-dashed border-[#d5dde8] px-2 py-1 text-[10px] font-semibold text-[#667781]"
									>
										+ {label.name}
									</button>
								))}
						</div>
						<div className="relative">
							<input
								value={labelDraft}
								onChange={event => setLabelDraft(event.target.value)}
								placeholder={ar ? 'تصنيف جديد' : 'New label'}
								className="h-9 w-full rounded-lg border border-[#e2e7ee] pe-14 ps-2.5 text-xs outline-none focus:border-[#0db873]"
								onKeyDown={event => {
									if (event.key === 'Enter') addLabel();
								}}
							/>
							<button
								type="button"
								onClick={addLabel}
								className="absolute end-1 top-1/2 h-7 -translate-y-1/2 rounded-md bg-[#0db873] px-2.5 text-[10px] font-semibold text-white"
							>
								{ar ? 'إضافة' : 'Add'}
							</button>
						</div>
					</section>

					{draft.links?.length ? (
						<section>
							<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
								{ar ? 'رسائل مربوطة' : 'Linked messages'}
							</label>
							<div className="space-y-1.5">
								{draft.links.map(link => (
									<div
										key={link.id}
										className="rounded-lg border border-[#e8ecf1] bg-[#fbfcfd] px-2.5 py-1.5 text-[12px] text-[#3b4555]"
									>
										{link.snippet || link.messageType || 'Message'}
									</div>
								))}
							</div>
							{draft.conversationId && onOpenConversation ? (
								<button
									type="button"
									className="mt-2 text-[12px] font-semibold text-[#0db873] hover:underline"
									onClick={() => onOpenConversation(draft.conversationId)}
								>
									{ar ? 'فتح المحادثة' : 'Open conversation'}
								</button>
							) : null}
						</section>
					) : null}

					<section>
						<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
							{ar ? 'تعليقات' : 'Comments'}
						</label>
						<div className="relative rounded-xl border border-[#e2e7ee] px-2.5 py-1">
							<input
								value={commentText}
								onChange={event => setCommentText(event.target.value)}
								placeholder={ar ? 'اكتب تعليقاً…' : 'Write a comment…'}
								className="h-8 w-full bg-transparent pe-10 text-[12px] outline-none"
								onKeyDown={event => {
									if (event.key === 'Enter' && commentText.trim()) {
										queueSave(
											{
												comments: [
													...(draft.comments || []),
													{
														id: `c-${Date.now()}`,
														text: commentText.trim(),
														timestamp: new Date().toISOString(),
													},
												],
											},
											{ immediate: true },
										);
										setCommentText('');
									}
								}}
							/>
							<button
								type="button"
								className="absolute end-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg bg-[#6332e8] text-white disabled:opacity-40"
								disabled={!commentText.trim()}
								onClick={() => {
									if (!commentText.trim()) return;
									queueSave(
										{
											comments: [
												...(draft.comments || []),
												{
													id: `c-${Date.now()}`,
													text: commentText.trim(),
													timestamp: new Date().toISOString(),
												},
											],
										},
										{ immediate: true },
									);
									setCommentText('');
								}}
							>
								<Send size={13} />
							</button>
						</div>
						{(draft.comments || []).map(comment => (
							<div
								key={comment.id}
								className="mt-1.5 rounded-lg border border-[#e8ecf1] px-2.5 py-1.5 text-[12px]"
							>
								{comment.text}
							</div>
						))}
					</section>

					{saveError ? (
						<p className="rounded-lg bg-[#fff1f2] px-3 py-2 text-[11px] font-semibold text-[#e11d48]">
							{saveError}
							<button
								type="button"
								className="ms-2 underline"
								onClick={() => void flushSave()}
							>
								{ar ? 'إعادة المحاولة' : 'Retry'}
							</button>
						</p>
					) : null}
				</div>

				<footer className="flex shrink-0 flex-wrap gap-2 border-t border-[#edf0f4] px-4 py-3">
					<button
						type="button"
						className="rounded-lg border border-[#e2e7ee] px-3 py-2 text-[12px] font-semibold"
						onClick={() => onToggleComplete?.({ ...card, isCompleted: isDone })}
					>
						{isDone ? (ar ? 'إعادة فتح' : 'Reopen') : ar ? 'إكمال' : 'Complete'}
					</button>
					<button
						type="button"
						className="rounded-lg border border-[#e2e7ee] px-3 py-2 text-[12px] font-semibold"
						onClick={() => onDuplicate?.(card)}
					>
						{ar ? 'تكرار' : 'Duplicate'}
					</button>
					{confirmDelete ? (
						<button
							type="button"
							className="ms-auto rounded-lg bg-[#e11d48] px-3 py-2 text-[12px] font-semibold text-white"
							onClick={() => {
								onDelete?.(card.id);
								onClose();
							}}
						>
							{ar ? 'تأكيد الحذف' : 'Confirm delete'}
						</button>
					) : (
						<button
							type="button"
							className="ms-auto rounded-lg border border-[#f8d0d8] px-3 py-2 text-[12px] font-semibold text-[#e11d48]"
							onClick={() => setConfirmDelete(true)}
						>
							{ar ? 'حذف' : 'Delete'}
						</button>
					)}
				</footer>
			</aside>
		</div>
	);
}

export function todayIsoDate() {
	const date = new Date();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

export function InlineCardComposer({ locale, onCancel, onCreate }) {
	const ar = locale === 'ar';
	const [title, setTitle] = useState('');
	const [dueDate, setDueDate] = useState(todayIsoDate());
	const [images, setImages] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState('');
	const inputRef = useRef(null);
	const pasteLock = useRef(false);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		return () => {
			images.forEach(item => {
				if (item?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
			});
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
	}, []);

	const addImageFile = async file => {
		if (!file || !file.type?.startsWith('image/')) return;
		if (pasteLock.current) return;
		pasteLock.current = true;
		const localId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const previewUrl = URL.createObjectURL(file);
		setImages(current =>
			[...current, { id: localId, previewUrl, serverUrl: '', uploading: true }].slice(0, 4),
		);
		setUploading(true);
		setUploadError('');
		try {
			const url = await uploadBoardImage(file);
			if (!url) throw new Error(ar ? 'فشل رفع الصورة' : 'Upload failed');
			setImages(current =>
				current.map(item =>
					item.id === localId ? { ...item, serverUrl: url, uploading: false } : item,
				),
			);
		} catch (err) {
			setImages(current => current.filter(item => item.id !== localId));
			URL.revokeObjectURL(previewUrl);
			setUploadError(
				err?.response?.data?.message || err?.message || (ar ? 'فشل رفع الصورة' : 'Upload failed'),
			);
		} finally {
			setUploading(false);
			pasteLock.current = false;
		}
	};

	const removeImage = id => {
		setImages(current => {
			const target = current.find(item => item.id === id);
			if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl);
			return current.filter(item => item.id !== id);
		});
	};

	const onPaste = async event => {
		const items = event.clipboardData?.items;
		if (!items) return;
		for (const item of items) {
			if (!item.type?.startsWith('image/')) continue;
			event.preventDefault();
			const file = item.getAsFile();
			if (file) await addImageFile(file);
			break;
		}
	};

	const submit = () => {
		const readyUrls = images.map(item => item.serverUrl).filter(Boolean);
		if (!title.trim() || uploading || images.some(item => item.uploading)) return;
		onCreate({
			title: title.trim(),
			description: '',
			dueDate: dueDate || todayIsoDate(),
			images: readyUrls,
		});
	};

	return (
		<div
			className="mx-2 mb-2 rounded-xl border border-[#0db873]/40 bg-white p-2.5 shadow-[0_2px_10px_rgba(13,184,115,0.08)]"
			onPaste={onPaste}
		>
			<div className="relative">
				<input
					ref={inputRef}
					value={title}
					onChange={event => setTitle(event.target.value)}
					placeholder={ar ? 'عنوان البطاقة…' : 'Card title…'}
					className="h-9 w-full rounded-lg border border-[#e2e7ee] pe-16 ps-2.5 text-[12px] font-semibold outline-none focus:border-[#0db873]"
					onKeyDown={event => {
						if (event.key === 'Enter') {
							event.preventDefault();
							submit();
						}
						if (event.key === 'Escape') onCancel();
					}}
				/>
				<div className="absolute end-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
					<button
						type="button"
						onClick={onCancel}
						className="grid h-6 w-6 place-items-center rounded-md border border-[#e2e7ee] bg-white text-[#54656f] hover:bg-[#f5f7fa]"
						aria-label={ar ? 'إلغاء' : 'Cancel'}
					>
						<X size={12} />
					</button>
					<button
						type="button"
						disabled={uploading || !title.trim()}
						onClick={submit}
						className="grid h-6 w-6 place-items-center rounded-md bg-[#0db873] text-white disabled:opacity-50"
						aria-label={ar ? 'حفظ' : 'Save'}
					>
						<Check size={12} />
					</button>
				</div>
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-1.5">
				<label className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#f5f7fa] px-2 text-[10px] font-semibold text-[#54656f]">
					<Calendar size={11} />
					<input
						type="date"
						value={dueDate}
						onChange={event => setDueDate(event.target.value)}
						className="max-w-[118px] bg-transparent text-[10px] font-semibold outline-none"
					/>
				</label>
				{uploading ? (
					<span className="inline-flex h-7 items-center gap-1 px-1 text-[9px] font-semibold text-[#8a95a5]">
						<Loader2 size={11} className="animate-spin" />
						{ar ? 'جاري الرفع…' : 'Uploading…'}
					</span>
				) : null}
			</div>

			{uploadError ? <p className="mt-1.5 text-[10px] font-semibold text-[#e11d48]">{uploadError}</p> : null}

			{images.length ? (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{images.map(item => (
						<div
							key={item.id}
							className="group relative h-12 w-12 overflow-hidden rounded-lg border border-[#e8ecf1] bg-[#f5f7fa]"
						>
							<img
								src={item.previewUrl || resolveBoardMediaUrl(item.serverUrl)}
								alt=""
								className="h-full w-full object-cover"
							/>
							{item.uploading ? (
								<span className="absolute inset-0 grid place-items-center bg-black/35">
									<Loader2 size={12} className="animate-spin text-white" />
								</span>
							) : null}
							<button
								type="button"
								className="absolute end-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100"
								onClick={() => removeImage(item.id)}
							>
								<X size={9} />
							</button>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}
