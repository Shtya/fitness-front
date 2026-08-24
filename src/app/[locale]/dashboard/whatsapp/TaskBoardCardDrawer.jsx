'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	Calendar,
	Check,
	FileText,
	Heart,
	Image as ImageIcon,
	Loader2,
	Maximize2,
	MessageCircle,
	Mic,
	Plus,
	Reply,
	Send,
	Trash2,
	Video,
	X,
} from 'lucide-react';
import { resolveBoardMediaUrl, uploadBoardImage } from './useWhatsAppBoardApi';
import { WaCustomSelect } from './WaCustomSelect';

const LABEL_PILL = {
	pink: 'bg-[#fff0f4] text-[#de4b70]',
	orange: 'bg-[#fff5e7] text-[#eb9218]',
	purple: 'bg-[#f4efff] text-[#8556d8]',
	blue: 'bg-[#edf6ff] text-[#2c82de]',
	green: 'bg-[#e9f9f2] text-[#17a96f]',
};

function autoResizeTextArea(element, { minRows = 1, maxRows = 24 } = {}) {
	if (!element) return;
	const styles = window.getComputedStyle(element);
	const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
	const padding =
		(Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
	const minHeight = lineHeight * minRows + padding;
	const maxHeight = lineHeight * maxRows + padding;
	element.style.height = 'auto';
	const next = Math.min(maxHeight, Math.max(minHeight, element.scrollHeight));
	element.style.height = `${next}px`;
	element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function insertTextAreaNewline(element, value, setValue) {
	if (!element) return;
	const start = element.selectionStart ?? value.length;
	const end = element.selectionEnd ?? value.length;
	const next = `${value.slice(0, start)}\n${value.slice(end)}`;
	setValue(next);
	requestAnimationFrame(() => {
		element.selectionStart = element.selectionEnd = start + 1;
		autoResizeTextArea(element, { minRows: 2, maxRows: 12 });
	});
}

const LABEL_COLORS = [
	{ id: 'pink', value: '#f13d72' },
	{ id: 'orange', value: '#ff981b' },
	{ id: 'purple', value: '#8d58de' },
	{ id: 'blue', value: '#2785ed' },
	{ id: 'green', value: '#17b77a' },
];

const PRIORITY_OPTIONS = [
	{ id: 'low', en: 'Low', ar: 'منخفضة' },
	{ id: 'medium', en: 'Medium', ar: 'متوسطة' },
	{ id: 'high', en: 'High', ar: 'عالية' },
	{ id: 'urgent', en: 'Urgent', ar: 'عاجلة' },
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

function isMostlyArabic(text) {
	const value = String(text || '');
	const arabic = (value.match(/[\u0600-\u06FF]/g) || []).length;
	const latin = (value.match(/[A-Za-z]/g) || []).length;
	return arabic > 0 && arabic >= latin;
}

function boardTextProps(text) {
	const rtl = isMostlyArabic(text);
	return {
		dir: rtl ? 'rtl' : 'ltr',
		lang: rtl ? 'ar' : undefined,
		className: rtl
			? 'text-right font-[family-name:var(--font-arabic),"Tajawal","Cairo",Tahoma,sans-serif]'
			: 'text-left',
	};
}

/** Split a wall-of-text WA snippet into ordered readable list nodes. */
function parseSnippetToTree(snippet) {
	const raw = String(snippet || '').trim();
	if (!raw) return [];
	if (/^\[(Voice message|Image|Video|Document|audio|ptt|voice|image|video)\]$/i.test(raw)) {
		return [];
	}

	// Prefer explicit separators used in WhatsApp tickets (—, –, bullets, newlines).
	let parts = raw
		.split(/\n+|\r+|(?:\s*[—–•●▪︎]\s*)+|(?:\s{0,2}-\s+)(?=\S)/)
		.map(part => part.replace(/^[\s\-—–•●▪︎\d.)]+/u, '').trim())
		.filter(part => part.length > 0);

	// Keep meaningful chunks only when we actually got a list.
	if (parts.length <= 1) {
		const bySentence = raw
			.split(/(?<=[.!?؟۔])\s+(?=[^\s])/u)
			.map(part => part.trim())
			.filter(part => part.length > 12);
		if (bySentence.length > 1) parts = bySentence;
	}

	if (parts.length <= 1) return [{ text: raw, children: [] }];

	return parts.map(text => {
		const nested = text
			.split(/\s*;\s*|\s*\|\s*/)
			.map(item => item.trim())
			.filter(Boolean);
		if (nested.length > 1 && nested.every(item => item.length < 90)) {
			return {
				text: nested[0],
				children: nested.slice(1).map(child => ({ text: child, children: [] })),
			};
		}
		return { text, children: [] };
	});
}

function linkedMessageKind(link) {
	const type = String(link?.messageType || '').toLowerCase();
	const snippet = String(link?.snippet || '');
	if (type.includes('audio') || type === 'ptt' || type === 'voice' || /\[voice/i.test(snippet)) {
		return 'voice';
	}
	if (type.includes('image') || /\[image/i.test(snippet)) return 'image';
	if (type.includes('video') || /\[video/i.test(snippet)) return 'video';
	if (type.includes('document') || /\[document/i.test(snippet)) return 'document';
	return 'text';
}

function LinkedSnippetTree({ nodes, ar }) {
	if (!nodes?.length) return null;
	return (
		<ol className="ms-0 list-none space-y-1.5 ps-0">
			{nodes.map((node, index) => {
				const props = boardTextProps(node.text);
				return (
					<li key={`${index}-${node.text.slice(0, 24)}`} className="relative ps-5">
						<span
							className="absolute start-0 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#e8f6ef] text-[9px] font-bold text-[#0db873]"
							aria-hidden
						>
							{index + 1}
						</span>
						<p
							dir={props.dir}
							lang={props.lang}
							className={`text-[12.5px] leading-5 text-[#334155] ${props.className}`}
						>
							{node.text}
						</p>
						{node.children?.length ? (
							<ul className="mt-1.5 space-y-1 border-s border-[#dce8e1] ps-3">
								{node.children.map((child, childIndex) => {
									const childProps = boardTextProps(child.text);
									return (
										<li
											key={`${index}-${childIndex}`}
											dir={childProps.dir}
											lang={childProps.lang}
											className={`text-[12px] leading-5 text-[#54656f] ${childProps.className}`}
										>
											<span className="me-1.5 text-[#0db873]">•</span>
											{child.text}
										</li>
									);
								})}
							</ul>
						) : null}
					</li>
				);
			})}
		</ol>
	);
}

function LinkedMessageItem({ link, index, ar }) {
	const kind = linkedMessageKind(link);
	const tree = kind === 'text' ? parseSnippetToTree(link.snippet) : [];
	const Icon =
		kind === 'voice' ? Mic : kind === 'image' ? ImageIcon : kind === 'video' ? Video : FileText;
	const kindLabel =
		kind === 'voice'
			? ar
				? 'رسالة صوتية'
				: 'Voice message'
			: kind === 'image'
				? ar
					? 'صورة'
					: 'Image'
				: kind === 'video'
					? ar
						? 'فيديو'
						: 'Video'
					: kind === 'document'
						? ar
							? 'مستند'
							: 'Document'
						: ar
							? 'نص'
							: 'Text';
	const fallbackProps = boardTextProps(link.snippet || '');

	return (
		<article className="rounded-xl border border-[#e8ecf1] bg-white p-3 shadow-[0_1px_2px_rgba(27,39,62,0.04)]">
			<header className="mb-2.5 flex items-center gap-2">
				<span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#eefaf4] text-[#0db873]">
					<Icon size={14} strokeWidth={2} />
				</span>
				<p className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#18243b]">
					#{index + 1} · {kindLabel}
				</p>
			</header>
			{kind === 'text' ? (
				tree.length > 1 || tree[0]?.children?.length ? (
					<LinkedSnippetTree nodes={tree} ar={ar} />
				) : (
					<p
						dir={fallbackProps.dir}
						lang={fallbackProps.lang}
						className={`whitespace-pre-wrap text-[12.5px] leading-6 text-[#334155] ${fallbackProps.className}`}
					>
						{link.snippet || (ar ? 'رسالة' : 'Message')}
					</p>
				)
			) : (
				<p className="rounded-lg bg-[#f8fafc] px-2.5 py-2 text-[12px] font-medium text-[#54656f]">
					{kindLabel}
				</p>
			)}
		</article>
	);
}

function readBoardUser() {
	try {
		const raw =
			(typeof window !== 'undefined' &&
				(localStorage.getItem('impersonated_user') || localStorage.getItem('user'))) ||
			null;
		const user = raw ? JSON.parse(raw) : null;
		const composedName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
		const name =
			user?.name ||
			user?.fullName ||
			composedName ||
			user?.username ||
			user?.email?.split?.('@')?.[0] ||
			user?.email ||
			'User';
		return {
			id: String(user?.id || user?._id || user?.userId || 'anon'),
			name: String(name).trim() || 'User',
			avatar:
				user?.avatar ||
				user?.image ||
				user?.photo ||
				user?.profileImage ||
				user?.profilePicture ||
				null,
		};
	} catch {
		return { id: 'anon', name: 'User', avatar: null };
	}
}

function formatCommentTime(value, ar) {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString(ar ? 'ar' : 'en', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function initials(name) {
	const parts = String(name || 'U')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (!parts.length) return 'U';
	return ((parts[0][0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function cloneCard(card) {
	return {
		...card,
		priority: card.priority || (card.isStarred ? 'high' : 'medium'),
		labels: [...(card.labels || [])],
		checklist: (card.checklist || []).map(item => ({ ...item })),
		comments: (card.comments || []).map(item => ({
			...item,
			likes: Array.isArray(item.likes) ? [...item.likes] : [],
		})),
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
	const boardUser = readBoardUser();
	const [draft, setDraft] = useState(() => cloneCard(card));
	const [commentText, setCommentText] = useState('');
	const [replyToId, setReplyToId] = useState(null);
	const [replyText, setReplyText] = useState('');
	const [labelDraft, setLabelDraft] = useState('');
	const [subItemDraft, setSubItemDraft] = useState('');
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [uploading, setUploading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const [lightboxSrc, setLightboxSrc] = useState('');
	const fileRef = useRef(null);
	const pasteLock = useRef(false);
	const saveTimer = useRef(null);
	const pendingUpdates = useRef({});
	const draftRef = useRef(draft);
	const closedRef = useRef(false);

	useEffect(() => {
		draftRef.current = draft;
	}, [draft]);

	useEffect(() => {
		setDraft(cloneCard(card));
		setSaveError('');
		pendingUpdates.current = {};
		setReplyToId(null);
		setReplyText('');
		closedRef.current = false;
	}, [card.id]);

	useEffect(() => {
		const onKey = event => {
			if (event.key === 'Escape') {
				if (lightboxSrc) {
					setLightboxSrc('');
					return;
				}
				void handleClose();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lightboxSrc]);

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
			if (closedRef.current) return;
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

	const clearPendingSave = useCallback(() => {
		if (saveTimer.current) {
			clearTimeout(saveTimer.current);
			saveTimer.current = null;
		}
		pendingUpdates.current = {};
	}, []);

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
			type: 'image',
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
				{ id: tempId, url, name: file.name || 'Image', type: 'image' },
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

	const persistComments = comments => {
		queueSave({ comments }, { immediate: true });
	};

	const addComment = (text, parentId = null) => {
		const value = String(text || '').trim();
		if (!value) return;
		const next = [
			...(draft.comments || []),
			{
				id: `c-${Date.now()}`,
				text: value,
				timestamp: new Date().toISOString(),
				authorId: boardUser.id,
				authorName: boardUser.name,
				authorAvatar: boardUser.avatar,
				likes: [],
				parentId: parentId || null,
			},
		];
		persistComments(next);
	};

	const toggleLike = commentId => {
		const next = (draft.comments || []).map(item => {
			if (item.id !== commentId) return item;
			const likes = Array.isArray(item.likes) ? [...item.likes] : [];
			const idx = likes.indexOf(boardUser.id);
			if (idx >= 0) likes.splice(idx, 1);
			else likes.push(boardUser.id);
			return { ...item, likes };
		});
		persistComments(next);
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
	const priority = draft.priority || (draft.isStarred ? 'high' : 'medium');
	const titleProps = boardTextProps(draft.title);
	const descriptionProps = boardTextProps(draft.description);

	const rootComments = (draft.comments || []).filter(item => !item.parentId);
	const repliesByParent = (draft.comments || []).reduce((map, item) => {
		if (!item.parentId) return map;
		const bucket = map.get(item.parentId) || [];
		bucket.push(item);
		map.set(item.parentId, bucket);
		return map;
	}, new Map());

	const handleClose = async () => {
		if (saveTimer.current) clearTimeout(saveTimer.current);
		try {
			await flushSave();
		} catch {
			return;
		}
		onClose();
	};

	const handleDelete = async () => {
		if (deleting) return;
		setDeleting(true);
		closedRef.current = true;
		clearPendingSave();
		try {
			await onDelete?.(card.id);
		} catch {
			closedRef.current = false;
			setConfirmDelete(false);
		} finally {
			setDeleting(false);
		}
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
							className={`mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${
								isDone
									? 'border-[#13b779] bg-[#13b779] text-white'
									: 'border-[#c9d2de] bg-white hover:border-[#13b779]'
							}`}
						>
							{isDone ? <Check size={11} strokeWidth={3} /> : null}
						</button>
						<textarea
							value={draft.title || ''}
							onChange={event => {
								queueSave({ title: event.target.value });
								autoResizeTextArea(event.target, { minRows: 1, maxRows: 16 });
							}}
							ref={node => {
								if (node) autoResizeTextArea(node, { minRows: 1, maxRows: 16 });
							}}
							rows={1}
							dir={titleProps.dir}
							lang={titleProps.lang}
							className={`min-w-0 flex-1 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent text-lg font-bold leading-6 outline-none ${titleProps.className} ${
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
							onChange={event => {
								queueSave({ description: event.target.value });
								autoResizeTextArea(event.target, { minRows: 4, maxRows: 28 });
							}}
							onPaste={onPaste}
							ref={node => {
								if (node) autoResizeTextArea(node, { minRows: 4, maxRows: 28 });
							}}
							rows={4}
							dir={descriptionProps.dir}
							lang={descriptionProps.lang}
							placeholder={ar ? 'أضف وصفاً…' : 'Add a description…'}
							className={`w-full resize-none whitespace-pre-wrap break-words rounded-xl border border-[#e2e7ee] px-3 py-2.5 text-[13px] leading-5 outline-none focus:border-[#0db873] ${descriptionProps.className}`}
						/>
						{imageAttachments.length ? (
							<div className="mt-2 flex flex-wrap gap-1.5">
								{imageAttachments.map(item => (
									<div
										key={item.id}
										className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#e8ecf1] bg-[#f5f7fa]"
									>
										<img src={item.src} alt="" className="h-full w-full object-contain" />
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
						<div>
							<label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
								{ar ? 'الأولوية' : 'Priority'}
							</label>
							<WaCustomSelect
								value={priority}
								ariaLabel={ar ? 'الأولوية' : 'Priority'}
								size="sm"
								buttonClassName="!h-9 !rounded-xl !border-[#e2e7ee] !font-semibold !text-[12px] focus:!border-[#0db873]"
								options={PRIORITY_OPTIONS.map(option => ({
									value: option.id,
									label: ar ? option.ar : option.en,
								}))}
								onChange={next => {
									queueSave(
										{
											priority: next,
											isStarred: next === 'high' || next === 'urgent',
										},
										{ immediate: true },
									);
								}}
							/>
						</div>
					</section>

					<section>
						<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
							{ar ? 'صورة' : 'Image'}
						</label>
						{cover ? (
							<div className="space-y-2">
								<div className="relative overflow-hidden rounded-xl border border-[#e8ecf1] bg-[#f7f8fa]">
									<img src={cover} alt="" className="max-h-56 w-full object-contain" />
									<button
										type="button"
										className="absolute start-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white"
										aria-label={ar ? 'عرض كامل' : 'View full'}
										onClick={() => setLightboxSrc(cover)}
									>
										<Maximize2 size={14} />
									</button>
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
											<button
												key={item.id}
												type="button"
												className="h-12 w-12 overflow-hidden rounded-lg border border-[#e8ecf1] bg-[#f7f8fa]"
												onClick={() => setLightboxSrc(item.src)}
											>
												<img
													src={item.src}
													alt=""
													className="h-full w-full object-contain"
												/>
											</button>
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
								{ar ? 'العناصر المستخدمة' : 'Used items'}
							</label>
							<span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[10px] font-semibold text-[#667781]">
								{doneCount}/{checklist.length}
							</span>
						</div>
						<ul className="space-y-1">
							{checklist.map(item => {
								const itemProps = boardTextProps(item.text);
								return (
									<li
										key={item.id}
										className="flex items-center gap-2 rounded-xl bg-[#f8fafc] px-2.5 py-2"
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
													: 'border-[#c9d0da] bg-white'
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
											dir={itemProps.dir}
											lang={itemProps.lang}
											className={`min-w-0 flex-1 bg-transparent text-[12px] outline-none ${itemProps.className} ${
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
								);
							})}
						</ul>
						<div className="mt-2 relative">
							<input
								value={subItemDraft}
								onChange={event => setSubItemDraft(event.target.value)}
								placeholder={ar ? 'عنصر جديد' : 'New item'}
								className="h-9 w-full rounded-xl border border-[#e2e7ee] bg-white pe-16 ps-3 text-xs outline-none focus:border-[#0db873]"
								onKeyDown={event => {
									if (event.key === 'Enter') addSubItem();
								}}
							/>
							<button
								type="button"
								onClick={addSubItem}
								className="absolute end-1 top-1/2 inline-flex h-7 -translate-y-1/2 items-center gap-0.5 rounded-lg bg-[#0db873] px-2 text-[10px] font-semibold text-white"
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

					<section>
						<div className="mb-2 flex items-center justify-between gap-2">
							<label className="text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
								{ar ? 'رسائل مربوطة' : 'Linked messages'}
							</label>
							<span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[10px] font-semibold text-[#667781]">
								{(draft.links || []).length}
							</span>
						</div>

						{(draft.links || []).length ? (
							<div className="space-y-2.5">
								{[...(draft.links || [])]
									.slice()
									.sort((a, b) => String(a.id).localeCompare(String(b.id)))
									.map((link, index) => (
										<LinkedMessageItem key={link.id} link={link} index={index} ar={ar} />
									))}
							</div>
						) : (
							<p className="rounded-xl border border-dashed border-[#d5dde8] bg-[#fbfcfd] px-3 py-4 text-center text-[11px] leading-5 text-[#8a95a5]">
								{ar
									? 'لا توجد رسائل مربوطة بعد. اربط نصًا أو صورة أو رسالة صوتية من محادثة واتساب.'
									: 'No linked messages yet. Link text, image, or voice notes from a WhatsApp chat.'}
							</p>
						)}

						{draft.conversationId && onOpenConversation ? (
							<button
								type="button"
								className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d7ebe0] bg-[#f3fbf7] px-2.5 text-[11px] font-semibold text-[#0db873] hover:border-[#0db873]"
								onClick={() => onOpenConversation(draft.conversationId)}
							>
								{ar ? 'فتح محادثة واتساب' : 'Open WhatsApp chat'}
							</button>
						) : (
							<p className="mt-2 text-[10px] leading-4 text-[#8a95a5]">
								{ar
									? 'من الشات: اختر الرسائل → أرسل إلى لوحة المهام.'
									: 'From chat: select messages → send to the tasks board.'}
							</p>
						)}
					</section>

					<section>
						<label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#8a95a5]">
							<MessageCircle size={12} />
							{ar ? 'تعليقات' : 'Comments'}
						</label>

						<div className="space-y-3">
							{rootComments.map(comment => {
								const liked = (comment.likes || []).includes(boardUser.id);
								const replies = repliesByParent.get(comment.id) || [];
								const textProps = boardTextProps(comment.text);
								return (
									<div key={comment.id} className="rounded-xl border border-[#e8ecf1] bg-white p-2.5">
										<div className="flex items-start gap-2.5">
											{comment.authorAvatar ? (
												<img
													src={comment.authorAvatar}
													alt=""
													className="h-8 w-8 rounded-full object-cover"
												/>
											) : (
												<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eef2f7] text-[11px] font-bold text-[#54656f]">
													{initials(comment.authorName || 'U')}
												</span>
											)}
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<p className="truncate text-[12px] font-semibold text-[#18243b]">
														{comment.authorName || (ar ? 'مستخدم' : 'User')}
													</p>
													<span className="text-[10px] text-[#8a95a5]">
														{formatCommentTime(comment.timestamp, ar)}
													</span>
												</div>
												<p
													dir={textProps.dir}
													lang={textProps.lang}
													className={`mt-1 text-[12.5px] leading-5 text-[#334155] ${textProps.className}`}
												>
													{comment.text}
												</p>
												<div className="mt-1.5 flex items-center gap-3">
													<button
														type="button"
														onClick={() => toggleLike(comment.id)}
														className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
															liked ? 'text-[#e11d48]' : 'text-[#667781]'
														}`}
													>
														<Heart
															size={12}
															className={liked ? 'fill-[#e11d48]' : ''}
														/>
														{(comment.likes || []).length || ''}
														<span>{ar ? 'إعجاب' : 'Like'}</span>
													</button>
													<button
														type="button"
														onClick={() => {
															setReplyToId(comment.id);
															setReplyText('');
														}}
														className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#667781]"
													>
														<Reply size={12} />
														{ar ? 'رد' : 'Reply'}
													</button>
												</div>
											</div>
										</div>

										{replies.length ? (
											<div className="ms-4 mt-2 space-y-2 border-s border-[#e8ecf1] ps-3">
												{replies.map(reply => {
													const replyProps = boardTextProps(reply.text);
													const replyLiked = (reply.likes || []).includes(boardUser.id);
													return (
														<div key={reply.id} className="flex items-start gap-2">
															{reply.authorAvatar ? (
																<img
																	src={reply.authorAvatar}
																	alt=""
																	className="h-7 w-7 rounded-full object-cover"
																/>
															) : (
																<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1f5f9] text-[10px] font-bold text-[#54656f]">
																	{initials(reply.authorName || 'U')}
																</span>
															)}
															<div className="min-w-0 flex-1 rounded-lg bg-[#f8fafc] px-2.5 py-1.5">
																<div className="flex items-center gap-2">
																	<p className="truncate text-[11px] font-semibold text-[#18243b]">
																		{reply.authorName || (ar ? 'مستخدم' : 'User')}
																	</p>
																	<span className="text-[10px] text-[#8a95a5]">
																		{formatCommentTime(reply.timestamp, ar)}
																	</span>
																</div>
																<p
																	dir={replyProps.dir}
																	lang={replyProps.lang}
																	className={`mt-0.5 text-[12px] leading-5 text-[#334155] ${replyProps.className}`}
																>
																	{reply.text}
																</p>
																<button
																	type="button"
																	onClick={() => toggleLike(reply.id)}
																	className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${
																		replyLiked ? 'text-[#e11d48]' : 'text-[#667781]'
																	}`}
																>
																	<Heart
																		size={11}
																		className={replyLiked ? 'fill-[#e11d48]' : ''}
																	/>
																	{(reply.likes || []).length || ''}
																</button>
															</div>
														</div>
													);
												})}
											</div>
										) : null}

										{replyToId === comment.id ? (
											<div className="ms-4 mt-2 flex items-center gap-2 border-s border-[#e8ecf1] ps-3">
												<input
													value={replyText}
													onChange={event => setReplyText(event.target.value)}
													placeholder={ar ? 'اكتب رداً…' : 'Write a reply…'}
													className="h-8 min-w-0 flex-1 rounded-lg border border-[#e2e7ee] px-2.5 text-[12px] outline-none focus:border-[#0db873]"
													onKeyDown={event => {
														if (event.key === 'Enter' && replyText.trim()) {
															addComment(replyText, comment.id);
															setReplyText('');
															setReplyToId(null);
														}
														if (event.key === 'Escape') setReplyToId(null);
													}}
												/>
												<button
													type="button"
													disabled={!replyText.trim()}
													className="grid h-8 w-8 place-items-center rounded-lg bg-[#6332e8] text-white disabled:opacity-40"
													onClick={() => {
														if (!replyText.trim()) return;
														addComment(replyText, comment.id);
														setReplyText('');
														setReplyToId(null);
													}}
												>
													<Send size={13} />
												</button>
											</div>
										) : null}
									</div>
								);
							})}
						</div>

						<div className="relative mt-3 rounded-xl border border-[#e2e7ee] px-2.5 py-1">
							<input
								value={commentText}
								onChange={event => setCommentText(event.target.value)}
								placeholder={ar ? 'اكتب تعليقاً…' : 'Write a comment…'}
								className="h-8 w-full bg-transparent pe-10 text-[12px] outline-none"
								onKeyDown={event => {
									if (event.key === 'Enter' && commentText.trim()) {
										addComment(commentText);
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
									addComment(commentText);
									setCommentText('');
								}}
							>
								<Send size={13} />
							</button>
						</div>
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
							disabled={deleting}
							className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-[#e11d48] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
							onClick={() => void handleDelete()}
						>
							{deleting ? <Loader2 size={12} className="animate-spin" /> : null}
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

			{lightboxSrc ? (
				<div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/70 p-4">
					<button
						type="button"
						aria-label={ar ? 'إغلاق' : 'Close'}
						className="absolute inset-0"
						onClick={() => setLightboxSrc('')}
					/>
					<div className="relative z-[1] max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black/20 p-2">
						<img
							src={lightboxSrc}
							alt=""
							className="max-h-[86vh] max-w-[86vw] object-contain"
						/>
						<button
							type="button"
							className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white"
							onClick={() => setLightboxSrc('')}
						>
							<X size={16} />
						</button>
					</div>
				</div>
			) : null}
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
		if (inputRef.current) autoResizeTextArea(inputRef.current, { minRows: 2, maxRows: 12 });
	}, []);

	useEffect(() => {
		if (inputRef.current) autoResizeTextArea(inputRef.current, { minRows: 2, maxRows: 12 });
	}, [title]);

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
		const raw = title.replace(/\r\n/g, '\n');
		const lines = raw
			.split('\n')
			.map(line => line.trimEnd())
			.filter((line, index, arr) => line.length > 0 || (index > 0 && index < arr.length - 1));
		const compact = lines.join('\n').trim();
		if (!compact || uploading || images.some(item => item.uploading)) return;
		const [firstLine, ...rest] = compact.split('\n');
		onCreate({
			title: firstLine.trim(),
			description: rest.join('\n').trim(),
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
				<textarea
					ref={inputRef}
					value={title}
					onChange={event => setTitle(event.target.value)}
					placeholder={ar ? 'عنوان البطاقة…' : 'Card title…'}
					rows={2}
					className="min-h-[52px] w-full resize-none rounded-lg border border-[#e2e7ee] pe-16 ps-2.5 py-2 text-[12px] font-semibold leading-5 outline-none focus:border-[#0db873]"
					onKeyDown={event => {
						if (event.key === 'Escape') {
							event.preventDefault();
							onCancel();
							return;
						}
						if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
							event.preventDefault();
							insertTextAreaNewline(event.currentTarget, title, setTitle);
							return;
						}
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							submit();
						}
					}}
				/>
				<div className="absolute end-1.5 top-2 flex items-center gap-1">
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
			<p className="mt-1 text-[9px] font-medium text-[#8a95a5]">
				{ar ? 'Enter للحفظ · Ctrl+Enter لسطر جديد' : 'Enter to save · Ctrl+Enter for new line'}
			</p>

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
								className="h-full w-full object-contain"
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
