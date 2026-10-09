'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
	AudioLines,
	Check,
	FileText,
	Folder,
	FolderInput,
	FolderPlus,
	Image as ImageIcon,
	Inbox,
	Layers,
	Loader2,
	Pause,
	Pencil,
	Play,
	Search,
	Send,
	Trash2,
	Video,
	X,
} from 'lucide-react';
import api, { baseImg } from '@/utils/axios';

const copy = {
	en: {
		title: 'Saved library',
		subtitle: 'Reuse converted voices and important media without redoing the work.',
		allItems: 'All items',
		unsorted: 'Unsorted',
		newFolder: 'New folder',
		folderName: 'Folder name',
		create: 'Create',
		rename: 'Rename',
		remove: 'Delete',
		empty: 'Nothing saved here yet.',
		emptyHint: 'Use “Save to library” on any voice note, video, image or file.',
		loading: 'Loading…',
		sendTo: 'Send to…',
		sending: 'Sending…',
		sent: 'Sent',
		sendFailed: 'Could not send this item',
		pickChat: 'Pick a chat',
		noChats: 'No chats available for this account.',
		deleted: 'Removed from library',
		deleteFailed: 'Could not delete this item',
		confirmDelete: 'Delete this saved item?',
		confirmFolderDelete: 'Delete this folder? Its items move to Unsorted.',
		folderCreated: 'Folder created',
		folderExists: 'Folder already exists',
		renamePrompt: 'New name',
		saved: 'Saved to library',
		close: 'Close',
		items: 'items',
		moveTo: 'Move to',
		folders: 'Folders',
		search: 'Search saved items',
		searchChats: 'Search chats',
		noMatches: 'No saved items match your search.',
		send: 'Send',
		converted: 'Converted',
		current: 'Current chat',
		types: { voice: 'Voice note', audio: 'Audio', video: 'Video', image: 'Photo', sticker: 'Sticker', document: 'Document' },
	},
	ar: {
		title: 'المكتبة المحفوظة',
		subtitle: 'أعِد استخدام الأصوات المحوّلة والميديا المهمة بدون تكرار الشغل.',
		allItems: 'كل العناصر',
		unsorted: 'غير مصنّف',
		newFolder: 'مجلد جديد',
		folderName: 'اسم المجلد',
		create: 'إنشاء',
		rename: 'إعادة تسمية',
		remove: 'حذف',
		empty: 'مفيش حاجة محفوظة هنا.',
		emptyHint: 'استخدم «حفظ في المكتبة» على أي رسالة صوتية أو فيديو أو صورة أو ملف.',
		loading: 'جاري التحميل…',
		sendTo: 'إرسال إلى…',
		sending: 'جاري الإرسال…',
		sent: 'تم الإرسال',
		sendFailed: 'تعذّر إرسال هذا العنصر',
		pickChat: 'اختَر محادثة',
		noChats: 'مفيش محادثات متاحة لهذا الحساب.',
		deleted: 'تم الحذف من المكتبة',
		deleteFailed: 'تعذّر حذف هذا العنصر',
		confirmDelete: 'تحذف العنصر المحفوظ؟',
		confirmFolderDelete: 'تحذف المجلد؟ عناصره تنتقل إلى «غير مصنّف».',
		folderCreated: 'تم إنشاء المجلد',
		folderExists: 'المجلد موجود بالفعل',
		renamePrompt: 'الاسم الجديد',
		saved: 'تم الحفظ في المكتبة',
		close: 'إغلاق',
		items: 'عنصر',
		moveTo: 'نقل إلى',
		folders: 'المجلدات',
		search: 'ابحث في المحفوظات',
		searchChats: 'ابحث عن محادثة',
		noMatches: 'لا توجد عناصر مطابقة للبحث.',
		send: 'إرسال',
		converted: 'محوّل',
		current: 'المحادثة الحالية',
		types: { voice: 'رسالة صوتية', audio: 'صوت', video: 'فيديو', image: 'صورة', sticker: 'ستيكر', document: 'مستند' },
	},
};

const ICON_BY_TYPE = {
	voice: AudioLines,
	audio: AudioLines,
	video: Video,
	image: ImageIcon,
	sticker: ImageIcon,
	document: FileText,
};

function formatClock(seconds) {
	const total = Math.max(0, Math.floor(Number(seconds) || 0));
	const mins = Math.floor(total / 60);
	return `${mins}:${String(total % 60).padStart(2, '0')}`;
}

function formatSize(bytes) {
	const value = Number(bytes);
	if (!Number.isFinite(value) || value <= 0) return '';
	if (value < 1024) return `${value} B`;
	if (value < 1024 ** 2) return `${(value / 1024).toFixed(0)} KB`;
	return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

/** Content URL for playback. Streams from the API with the session cookie/header. */
function itemContentUrl(itemId) {
	const origin = String(baseImg || '').replace(/\/$/, '');
	return `${origin}/api/v1/whatsapp/library/items/${itemId}/content`;
}

export default function SavedLibraryPanel({
	open,
	locale = 'en',
	onClose,
	conversations = [],
	activeConversationId = '',
}) {
	const t = copy[locale === 'ar' ? 'ar' : 'en'];
	const ar = locale === 'ar';

	const [loading, setLoading] = useState(true);
	const [folders, setFolders] = useState([]);
	const [rootCount, setRootCount] = useState(0);
	const [items, setItems] = useState([]);
	// `null` = all items, 'root' = unsorted, otherwise a folder id.
	const [selectedFolder, setSelectedFolder] = useState(null);
	const [creatingFolder, setCreatingFolder] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [busyItemId, setBusyItemId] = useState('');
	const [sendTarget, setSendTarget] = useState(null);
	const [playingId, setPlayingId] = useState('');
	const [query, setQuery] = useState('');
	const [chatQuery, setChatQuery] = useState('');
	const audioRef = useRef(null);

	const loadFolders = useCallback(async () => {
		const { data } = await api.get('/whatsapp/library/folders');
		setFolders(Array.isArray(data?.folders) ? data.folders : []);
		setRootCount(Number(data?.rootCount) || 0);
	}, []);

	const loadItems = useCallback(async (folder) => {
		const query = folder == null ? '' : `?folderId=${folder}`;
		const { data } = await api.get(`/whatsapp/library/items${query}`);
		setItems(Array.isArray(data?.items) ? data.items : []);
	}, []);

	const refresh = useCallback(
		async (folder = selectedFolder) => {
			setLoading(true);
			try {
				await Promise.all([loadFolders(), loadItems(folder)]);
			} catch {
				setItems([]);
			} finally {
				setLoading(false);
			}
		},
		[loadFolders, loadItems, selectedFolder],
	);

	useEffect(() => {
		if (!open) return;
		void refresh(selectedFolder);
		// `refresh` is intentionally not a dependency: it changes with selectedFolder
		// and would re-fetch twice per switch.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, selectedFolder]);

	useEffect(() => {
		if (!open) {
			audioRef.current?.pause();
			setPlayingId('');
		}
	}, [open]);

	const createFolder = useCallback(async () => {
		const name = newFolderName.trim();
		if (!name) return;
		try {
			const { data } = await api.post('/whatsapp/library/folders', { name });
			toast.success(data?.created ? t.folderCreated : t.folderExists);
			setNewFolderName('');
			setCreatingFolder(false);
			await loadFolders();
			setSelectedFolder(data?.id || null);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.folderCreated);
		}
	}, [newFolderName, loadFolders, t.folderCreated, t.folderExists]);

	const renameFolder = useCallback(
		async (folder) => {
			const next = window.prompt(t.renamePrompt, folder.name);
			if (!next?.trim() || next.trim() === folder.name) return;
			try {
				await api.put(`/whatsapp/library/folders/${folder.id}`, { name: next.trim() });
				await loadFolders();
			} catch (error) {
				toast.error(error?.response?.data?.message || t.deleteFailed);
			}
		},
		[loadFolders, t.renamePrompt, t.deleteFailed],
	);

	const deleteFolder = useCallback(
		async (folder) => {
			if (!window.confirm(t.confirmFolderDelete)) return;
			try {
				await api.delete(`/whatsapp/library/folders/${folder.id}`);
				setSelectedFolder(null);
				await refresh(null);
			} catch (error) {
				toast.error(error?.response?.data?.message || t.deleteFailed);
			}
		},
		[refresh, t.confirmFolderDelete, t.deleteFailed],
	);

	const deleteItem = useCallback(
		async (item) => {
			if (!window.confirm(t.confirmDelete)) return;
			setBusyItemId(item.id);
			try {
				await api.delete(`/whatsapp/library/items/${item.id}`);
				toast.success(t.deleted);
				await refresh();
			} catch (error) {
				toast.error(error?.response?.data?.message || t.deleteFailed);
			} finally {
				setBusyItemId('');
			}
		},
		[refresh, t.confirmDelete, t.deleted, t.deleteFailed],
	);

	const renameItem = useCallback(
		async (item) => {
			const next = window.prompt(t.renamePrompt, item.title || '');
			// `null` is cancel; an unchanged name is not worth a request.
			if (next === null || !next.trim() || next.trim() === item.title) return;
			setBusyItemId(item.id);
			try {
				await api.patch(`/whatsapp/library/items/${item.id}`, { title: next.trim() });
				await refresh();
			} catch (error) {
				toast.error(error?.response?.data?.message || t.deleteFailed);
			} finally {
				setBusyItemId('');
			}
		},
		[refresh, t.renamePrompt, t.deleteFailed],
	);

	const moveItem = useCallback(
		async (item, folderId) => {
			setBusyItemId(item.id);
			try {
				await api.patch(`/whatsapp/library/items/${item.id}`, {
					folderId: folderId || null,
				});
				await refresh();
			} catch (error) {
				toast.error(error?.response?.data?.message || t.deleteFailed);
			} finally {
				setBusyItemId('');
			}
		},
		[refresh, t.deleteFailed],
	);

	const sendItem = useCallback(
		async (item, conversationId) => {
			if (!conversationId) return;
			setBusyItemId(item.id);
			setSendTarget(null);
			try {
				await api.post(`/whatsapp/library/items/${item.id}/send`, { conversationId });
				toast.success(t.sent);
			} catch (error) {
				toast.error(error?.response?.data?.message || t.sendFailed);
			} finally {
				setBusyItemId('');
			}
		},
		[t.sent, t.sendFailed],
	);

	const togglePlay = useCallback(
		(item) => {
			const audio = audioRef.current;
			if (!audio) return;
			if (playingId === item.id) {
				audio.pause();
				return;
			}
			audio.src = itemContentUrl(item.id);
			void audio.play().catch(() => setPlayingId(''));
			setPlayingId(item.id);
		},
		[playingId],
	);

	const folderName = useMemo(() => {
		if (selectedFolder == null) return t.allItems;
		if (selectedFolder === 'root') return t.unsorted;
		return folders.find((folder) => folder.id === selectedFolder)?.name || t.allItems;
	}, [selectedFolder, folders, t.allItems, t.unsorted]);

	const needle = query.trim().toLowerCase();
	const visibleItems = needle
		? items.filter(item =>
				[item.title, item.mediaType, t.types[item.mediaType]]
					.filter(Boolean)
					.some(part => String(part).toLowerCase().includes(needle)),
			)
		: items;
	const chatNeedle = chatQuery.trim().toLowerCase();
	const visibleChats = chatNeedle
		? conversations.filter(conversation =>
				String(conversation.title || '').toLowerCase().includes(chatNeedle),
			)
		: conversations;
	const navItems = [
		{ id: null, name: t.allItems, itemCount: null, Icon: Layers },
		{ id: 'root', name: t.unsorted, itemCount: rootCount, Icon: Inbox },
	];

	if (!open || typeof document === 'undefined') return null;

	const renderNav = (folder, Icon, editable) => {
		const active = selectedFolder === folder.id;
		return (
			<div key={String(folder.id)} className={`wa-ui-lib__nav-row${active ? ' is-active' : ''}`}>
				<button
					type="button"
					aria-current={active ? 'true' : undefined}
					onClick={() => setSelectedFolder(folder.id)}
					className="wa-ui-lib__nav-btn"
				>
					<Icon size={17} strokeWidth={1.9} aria-hidden="true" />
					<span className="wa-ui-lib__nav-name">{folder.name}</span>
					{folder.itemCount != null ? (
						<span className="wa-ui-lib__nav-count">{folder.itemCount}</span>
					) : null}
				</button>
				{editable ? (
					<span className="wa-ui-lib__nav-tools">
						<button
							type="button"
							aria-label={`${t.rename}: ${folder.name}`}
							title={t.rename}
							onClick={() => void renameFolder(folder)}
							className="wa-ui-icon-btn wa-ui-icon-btn--sm"
						>
							<Pencil size={14} strokeWidth={2} />
						</button>
						<button
							type="button"
							aria-label={`${t.remove}: ${folder.name}`}
							title={t.remove}
							onClick={() => void deleteFolder(folder)}
							className="wa-ui-icon-btn wa-ui-icon-btn--sm wa-ui-lib__danger"
						>
							<Trash2 size={14} strokeWidth={2} />
						</button>
					</span>
				) : null}
			</div>
		);
	};

	return createPortal(
		<div
			className="wa-ui-scrim is-sheet-on-phone"
			style={{ zIndex: 125 }}
			onClick={() => onClose?.()}
			onKeyDown={event => {
				if (event.key === 'Escape' && !sendTarget) onClose?.();
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="wa-lib-title"
				dir={ar ? 'rtl' : 'ltr'}
				className="wa-ui-modal wa-ui-lib"
				style={{ '--wa-ui-modal-width': '880px', '--wa-ui-modal-height': '640px' }}
				onClick={event => event.stopPropagation()}
			>
				<div className="wa-ui-modal__header">
					<div className="wa-ui-modal__heading">
						<h3 id="wa-lib-title" className="wa-ui-modal__title">
							{t.title}
						</h3>
						<p className="wa-ui-modal__subtitle">{t.subtitle}</p>
					</div>
					<button
						type="button"
						autoFocus
						aria-label={t.close}
						title={t.close}
						onClick={() => onClose?.()}
						className="wa-ui-icon-btn"
					>
						<X size={18} strokeWidth={2} />
					</button>
				</div>

				<div className="wa-ui-lib__body">
					<nav className="wa-ui-lib__nav" aria-label={t.folders}>
						<div className="wa-ui-lib__nav-list">
							{navItems.map(item => renderNav(item, item.Icon, false))}
							{folders.length ? <p className="wa-ui-lib__nav-section">{t.folders}</p> : null}
							{folders.map(folder => renderNav(folder, Folder, true))}
						</div>
						{creatingFolder ? (
							<form
								className="wa-ui-lib__new-folder"
								onSubmit={event => {
									event.preventDefault();
									void createFolder();
								}}
							>
								<input
									autoFocus
									value={newFolderName}
									placeholder={t.folderName}
									aria-label={t.folderName}
									onChange={event => setNewFolderName(event.target.value)}
									onKeyDown={event => {
										if (event.key === 'Escape') {
											event.stopPropagation();
											setCreatingFolder(false);
										}
									}}
									className="wa-ui-input"
								/>
								<button
									type="submit"
									disabled={!newFolderName.trim()}
									aria-label={t.create}
									title={t.create}
									className="wa-ui-icon-btn wa-ui-lib__confirm"
								>
									<Check size={16} strokeWidth={2.4} />
								</button>
							</form>
						) : (
							<button type="button" onClick={() => setCreatingFolder(true)} className="wa-ui-lib__add-folder">
								<FolderPlus size={17} strokeWidth={1.9} aria-hidden="true" />
								<span>{t.newFolder}</span>
							</button>
						)}
					</nav>

					<section className="wa-ui-lib__main" aria-labelledby="wa-lib-folder">
						<div className="wa-ui-lib__toolbar">
							<p id="wa-lib-folder" className="wa-ui-lib__folder-title">
								{folderName}
								{!loading ? <span className="wa-ui-lib__folder-count">{items.length}</span> : null}
							</p>
							<label className="wa-ui-search wa-ui-lib__search">
								<Search size={16} strokeWidth={2} aria-hidden="true" />
								<input
									type="search"
									value={query}
									onChange={event => setQuery(event.target.value)}
									placeholder={t.search}
									aria-label={t.search}
									className="wa-ui-input"
								/>
							</label>
						</div>

						<div className="wa-ui-lib__list">
							{loading ? (
								<ul className="wa-ui-lib__items" aria-busy="true" aria-label={t.loading}>
									{[0, 1, 2].map(row => (
										<li key={row} className="wa-ui-lib__item is-skeleton">
											<span className="wa-ui-lib__thumb" />
											<span className="wa-ui-lib__skeleton-lines">
												<span />
												<span />
											</span>
										</li>
									))}
								</ul>
							) : !items.length ? (
								<div className="wa-ui-lib__empty">
									<Inbox size={28} strokeWidth={1.6} aria-hidden="true" />
									<p className="wa-ui-lib__empty-title">{t.empty}</p>
									<p>{t.emptyHint}</p>
								</div>
							) : !visibleItems.length ? (
								<div className="wa-ui-lib__empty">
									<Search size={24} strokeWidth={1.6} aria-hidden="true" />
									<p>{t.noMatches}</p>
								</div>
							) : (
								<ul className="wa-ui-lib__items">
									{visibleItems.map(item => {
										const Icon = ICON_BY_TYPE[item.mediaType] || FileText;
										const playable = ['voice', 'audio'].includes(item.mediaType);
										const playing = playingId === item.id;
										const busy = busyItemId === item.id;
										const size = formatSize(item.fileSizeBytes);
										return (
											<li key={item.id} className={`wa-ui-lib__item${busy ? ' is-busy' : ''}`}>
												{playable ? (
													<button
														type="button"
														aria-label={`${playing ? 'Pause' : 'Play'}: ${item.title}`}
														aria-pressed={playing}
														onClick={() => togglePlay(item)}
														className={`wa-ui-lib__thumb is-playable${playing ? ' is-playing' : ''}`}
													>
														{playing ? (
															<Pause size={18} strokeWidth={2} fill="currentColor" />
														) : (
															<Play size={18} strokeWidth={2} fill="currentColor" />
														)}
													</button>
												) : (
													<span className={`wa-ui-lib__thumb is-${item.mediaType || 'file'}`} aria-hidden="true">
														<Icon size={19} strokeWidth={1.8} />
													</span>
												)}
												<div className="wa-ui-lib__copy">
													<p className="wa-ui-lib__title" dir="auto" title={item.title}>
														{item.title}
													</p>
													<p className="wa-ui-lib__meta">
														<span>{t.types[item.mediaType] || item.mediaType}</span>
														{item.durationSeconds ? (
															<span className="tabular-nums">{formatClock(item.durationSeconds)}</span>
														) : null}
														{size ? <span className="tabular-nums">{size}</span> : null}
														{item.source === 'voice_edit' ? (
															<span className="wa-ui-badge wa-ui-badge--accent">{t.converted}</span>
														) : null}
													</p>
												</div>

												<div className="wa-ui-lib__actions">
													<label className="wa-ui-lib__move" title={t.moveTo}>
														<FolderInput size={15} strokeWidth={1.9} aria-hidden="true" />
														<select
															value={item.folderId || ''}
															disabled={busy}
															aria-label={`${t.moveTo}: ${item.title}`}
															onChange={event => void moveItem(item, event.target.value)}
														>
															<option value="">{t.unsorted}</option>
															{folders.map(folder => (
																<option key={folder.id} value={folder.id}>
																	{folder.name}
																</option>
															))}
														</select>
													</label>
													<button
														type="button"
														disabled={busy}
														onClick={() => {
															setChatQuery('');
															setSendTarget(sendTarget?.id === item.id ? null : item);
														}}
														className="wa-ui-btn wa-ui-btn--secondary wa-ui-btn--sm wa-ui-lib__send"
													>
														{busy ? (
															<Loader2 size={14} className="animate-spin" aria-hidden="true" />
														) : (
															<Send size={14} strokeWidth={2} className="rtl:-scale-x-100" aria-hidden="true" />
														)}
														<span>{busy ? t.sending : t.send}</span>
													</button>
													<button
														type="button"
														disabled={busy}
														aria-label={`${t.rename}: ${item.title}`}
														title={t.rename}
														onClick={() => void renameItem(item)}
														className="wa-ui-icon-btn wa-ui-icon-btn--sm"
													>
														<Pencil size={15} strokeWidth={1.9} />
													</button>
													<button
														type="button"
														disabled={busy}
														aria-label={`${t.remove}: ${item.title}`}
														title={t.remove}
														onClick={() => void deleteItem(item)}
														className="wa-ui-icon-btn wa-ui-icon-btn--sm wa-ui-lib__danger"
													>
														<Trash2 size={15} strokeWidth={1.9} />
													</button>
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</div>
					</section>
				</div>

				<audio
					ref={audioRef}
					className="hidden"
					onPlay={() => undefined}
					onPause={() => setPlayingId('')}
					onEnded={() => setPlayingId('')}
				/>
			</div>

			{sendTarget ? (
				<div
					className="wa-ui-scrim is-sheet-on-phone"
					style={{ zIndex: 126 }}
					onClick={event => {
						event.stopPropagation();
						setSendTarget(null);
					}}
					onKeyDown={event => {
						if (event.key === 'Escape') {
							event.stopPropagation();
							setSendTarget(null);
						}
					}}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="wa-lib-send-title"
						dir={ar ? 'rtl' : 'ltr'}
						className="wa-ui-modal wa-ui-lib-send"
						style={{ '--wa-ui-modal-width': '400px', '--wa-ui-modal-height': '560px' }}
						onClick={event => event.stopPropagation()}
					>
						<div className="wa-ui-modal__header">
							<div className="wa-ui-modal__heading">
								<h4 id="wa-lib-send-title" className="wa-ui-modal__title">
									{t.pickChat}
								</h4>
								<p className="wa-ui-modal__subtitle" dir="auto">
									{sendTarget.title}
								</p>
							</div>
							<button
								type="button"
								aria-label={t.close}
								title={t.close}
								onClick={() => setSendTarget(null)}
								className="wa-ui-icon-btn"
							>
								<X size={18} strokeWidth={2} />
							</button>
						</div>
						<div className="wa-ui-lib__send-search">
							<label className="wa-ui-search">
								<Search size={16} strokeWidth={2} aria-hidden="true" />
								<input
									autoFocus
									type="search"
									value={chatQuery}
									onChange={event => setChatQuery(event.target.value)}
									placeholder={t.searchChats}
									aria-label={t.searchChats}
									className="wa-ui-input"
								/>
							</label>
						</div>
						<div className="wa-ui-lib__chats">
							{!visibleChats.length ? (
								<p className="wa-ui-lib__empty">{t.noChats}</p>
							) : (
								visibleChats.map(conversation => {
									const current = conversation.id === activeConversationId;
									const initials =
										String(conversation.title || '?')
											.trim()
											.split(/\s+/)
											.slice(0, 2)
											.filter(part => /\p{L}/u.test(part[0]))
											.map(part => part[0])
											.join('')
											.toUpperCase() || '#';
									return (
										<button
											key={conversation.id}
											type="button"
											onClick={() => void sendItem(sendTarget, conversation.id)}
											className={`wa-ui-lib__chat${current ? ' is-current' : ''}`}
										>
											<span className="wa-ui-lib__chat-avatar" aria-hidden="true">
												{initials}
											</span>
											<span className="wa-ui-lib__chat-name" dir="auto">
												{conversation.title}
											</span>
											{current ? <span className="wa-ui-badge">{t.current}</span> : null}
										</button>
									);
								})
							)}
						</div>
					</div>
				</div>
			) : null}
		</div>,
		document.body,
	);
}
