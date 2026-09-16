'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
	AudioLines,
	Bookmark,
	FileText,
	FolderPlus,
	Image as ImageIcon,
	Loader2,
	Pencil,
	Play,
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

	if (!open || typeof document === 'undefined') return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[125] grid place-items-end bg-black/45 p-4 backdrop-blur-sm sm:place-items-center"
			onClick={() => onClose?.()}
		>
			<div
				role="dialog"
				aria-label={t.title}
				dir={ar ? 'rtl' : 'ltr'}
				className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b px-5 py-4">
					<div className="min-w-0">
						<h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
							<Bookmark size={18} className="text-emerald-600" />
							{t.title}
						</h3>
						<p className="mt-1 text-xs leading-snug text-slate-500">{t.subtitle}</p>
					</div>
					<button
						type="button"
						aria-label={t.close}
						onClick={() => onClose?.()}
						className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
					>
						<X size={18} />
					</button>
				</div>

				<div className="flex min-h-0 flex-1 flex-col sm:flex-row">
					<aside className="shrink-0 border-b bg-slate-50 p-3 sm:w-56 sm:border-b-0 sm:border-e">
						<div className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
							{[
								{ id: null, name: t.allItems, itemCount: null },
								{ id: 'root', name: t.unsorted, itemCount: rootCount },
								...folders,
							].map((folder) => {
								const active = selectedFolder === folder.id;
								return (
									<div key={String(folder.id)} className="group flex items-center gap-1">
										<button
											type="button"
											onClick={() => setSelectedFolder(folder.id)}
											className={`flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-start text-sm font-medium transition ${
												active
													? 'bg-emerald-600 text-white'
													: 'text-slate-700 hover:bg-slate-200'
											}`}
										>
											<span className="truncate">{folder.name}</span>
											{folder.itemCount != null ? (
												<span className={`text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>
													{folder.itemCount}
												</span>
											) : null}
										</button>
										{folder.id && folder.id !== 'root' ? (
											<span className="hidden shrink-0 gap-0.5 group-hover:flex">
												<button
													type="button"
													aria-label={t.rename}
													title={t.rename}
													onClick={() => void renameFolder(folder)}
													className="rounded p-1 text-slate-500 hover:bg-slate-200"
												>
													<Pencil size={13} />
												</button>
												<button
													type="button"
													aria-label={t.remove}
													title={t.remove}
													onClick={() => void deleteFolder(folder)}
													className="rounded p-1 text-slate-500 hover:bg-rose-100 hover:text-rose-600"
												>
													<Trash2 size={13} />
												</button>
											</span>
										) : null}
									</div>
								);
							})}
						</div>

						{creatingFolder ? (
							<div className="mt-2 flex gap-1">
								<input
									autoFocus
									value={newFolderName}
									placeholder={t.folderName}
									onChange={(event) => setNewFolderName(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter') void createFolder();
										if (event.key === 'Escape') setCreatingFolder(false);
									}}
									className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
								/>
								<button
									type="button"
									onClick={() => void createFolder()}
									className="rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white"
								>
									{t.create}
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setCreatingFolder(true)}
								className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
							>
								<FolderPlus size={15} />
								{t.newFolder}
							</button>
						)}
					</aside>

					<div className="min-h-0 flex-1 overflow-y-auto p-3">
						{loading ? (
							<div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
								<Loader2 size={16} className="animate-spin" />
								{t.loading}
							</div>
						) : !items.length ? (
							<div className="py-16 text-center">
								<p className="text-sm font-medium text-slate-600">{t.empty}</p>
								<p className="mt-1 text-xs text-slate-400">{t.emptyHint}</p>
							</div>
						) : (
							<>
								<p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
									{folderName} · {items.length} {t.items}
								</p>
								<ul className="space-y-2">
									{items.map((item) => {
										const Icon = ICON_BY_TYPE[item.mediaType] || FileText;
										const playable = ['voice', 'audio'].includes(item.mediaType);
										const busy = busyItemId === item.id;
										return (
											<li
												key={item.id}
												className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"
											>
												<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
													<Icon size={17} />
												</span>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-semibold text-slate-800">
														{item.title}
													</p>
													<p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
														<span>{item.mediaType}</span>
														{item.durationSeconds ? (
															<span className="tabular-nums">
																{formatClock(item.durationSeconds)}
															</span>
														) : null}
														{formatSize(item.fileSizeBytes) ? (
															<span>{formatSize(item.fileSizeBytes)}</span>
														) : null}
														{item.source === 'voice_edit' ? (
															<span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
																converted
															</span>
														) : null}
													</p>
												</div>

												{playable ? (
													<button
														type="button"
														aria-label="Play"
														onClick={() => togglePlay(item)}
														className={`grid size-8 shrink-0 place-items-center rounded-full transition ${
															playingId === item.id
																? 'bg-emerald-600 text-white'
																: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
														}`}
													>
														<Play size={14} />
													</button>
												) : null}

												<select
													value={item.folderId || ''}
													disabled={busy}
													aria-label={t.moveTo}
													onChange={(event) => void moveItem(item, event.target.value)}
													className="hidden shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-emerald-400 sm:block"
												>
													<option value="">{t.unsorted}</option>
													{folders.map((folder) => (
														<option key={folder.id} value={folder.id}>
															{folder.name}
														</option>
													))}
												</select>

												<button
													type="button"
													disabled={busy}
													onClick={() =>
														setSendTarget(sendTarget?.id === item.id ? null : item)
													}
													className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
												>
													{busy ? (
														<Loader2 size={13} className="animate-spin" />
													) : (
														<Send size={13} />
													)}
													{busy ? t.sending : t.sendTo}
												</button>

												<button
													type="button"
													disabled={busy}
													aria-label={t.remove}
													title={t.remove}
													onClick={() => void deleteItem(item)}
													className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
												>
													<Trash2 size={15} />
												</button>
											</li>
										);
									})}
								</ul>
							</>
						)}
					</div>
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
					className="fixed inset-0 z-[126] grid place-items-center bg-black/40 p-4"
					onClick={() => setSendTarget(null)}
				>
					<div
						dir={ar ? 'rtl' : 'ltr'}
						className="max-h-[70vh] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<h4 className="text-sm font-bold text-slate-900">{t.pickChat}</h4>
							<button
								type="button"
								onClick={() => setSendTarget(null)}
								className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
							>
								<X size={16} />
							</button>
						</div>
						<div className="max-h-[58vh] overflow-y-auto p-2">
							{!conversations.length ? (
								<p className="px-3 py-8 text-center text-sm text-slate-500">{t.noChats}</p>
							) : (
								conversations.map((conversation) => (
									<button
										key={conversation.id}
										type="button"
										onClick={() => void sendItem(sendTarget, conversation.id)}
										className={`flex w-full items-center gap-2 rounded-xl p-3 text-start text-sm hover:bg-slate-100 ${
											conversation.id === activeConversationId ? 'bg-slate-50' : ''
										}`}
									>
										<span className="truncate font-medium text-slate-800">
											{conversation.title}
										</span>
									</button>
								))
							)}
						</div>
					</div>
				</div>
			) : null}
		</div>,
		document.body,
	);
}
