'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
	BookmarkPlus,
	Check,
	ChevronDown,
	Folder,
	FolderOpen,
	FolderPlus,
	Loader2,
	X,
} from 'lucide-react';
import api from '@/utils/axios';

const copy = {
	en: {
		title: 'Save to library',
		subtitle: 'Keep this so you can send it again later without redoing the work.',
		name: 'Name',
		folder: 'Folder',
		unsorted: 'Unsorted',
		newFolder: 'New folder…',
		folderName: 'Folder name',
		save: 'Save',
		saving: 'Saving…',
		cancel: 'Cancel',
		saved: 'Saved to library',
		failed: 'Could not save this to the library',
	},
	ar: {
		title: 'حفظ في المكتبة',
		subtitle: 'احتفظ به عشان تبعته تاني بعدين بدون تكرار الشغل.',
		name: 'الاسم',
		folder: 'المجلد',
		unsorted: 'غير مصنّف',
		newFolder: 'مجلد جديد…',
		folderName: 'اسم المجلد',
		save: 'حفظ',
		saving: 'جاري الحفظ…',
		cancel: 'إلغاء',
		saved: 'تم الحفظ في المكتبة',
		failed: 'تعذّر الحفظ في المكتبة',
	},
};

/**
 * Folder picker used by both "Save to library" on a message and "Save" inside the
 * voice editor. `voiceEdit` decides which endpoint runs: saving an attachment
 * copies it as-is, while a voice edit renders the conversion first.
 */
export default function SaveToLibraryDialog({
	open,
	attachmentId,
	voiceEdit = null,
	defaultTitle = '',
	locale = 'en',
	onClose,
	onSaved,
}) {
	const t = copy[locale === 'ar' ? 'ar' : 'en'];
	const ar = locale === 'ar';

	const [folders, setFolders] = useState([]);
	const [folderId, setFolderId] = useState('');
	const [title, setTitle] = useState(defaultTitle);
	const [newFolderName, setNewFolderName] = useState('');
	const [creatingFolder, setCreatingFolder] = useState(false);
	const [saving, setSaving] = useState(false);
	const [folderMenuOpen, setFolderMenuOpen] = useState(false);
	const folderMenuRef = useRef(null);

	const selectedFolder = useMemo(
		() => folders.find((folder) => folder.id === folderId) || null,
		[folders, folderId],
	);

	useEffect(() => {
		if (!open) return;
		setTitle(defaultTitle);
		setNewFolderName('');
		setCreatingFolder(false);
		setFolderMenuOpen(false);
		api
			.get('/whatsapp/library/folders')
			.then(({ data }) => setFolders(Array.isArray(data?.folders) ? data.folders : []))
			.catch(() => setFolders([]));
	}, [open, defaultTitle]);

	// The dialog swallows outside clicks, so the dropdown has to close itself.
	useEffect(() => {
		if (!folderMenuOpen) return undefined;
		const onPointerDown = (event) => {
			if (!folderMenuRef.current?.contains(event.target)) setFolderMenuOpen(false);
		};
		const onKeyDown = (event) => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				setFolderMenuOpen(false);
			}
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeyDown, true);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown, true);
		};
	}, [folderMenuOpen]);

	const save = useCallback(async () => {
		if (!attachmentId || saving) return;
		setSaving(true);
		try {
			let targetFolderId = folderId || null;
			if (creatingFolder && newFolderName.trim()) {
				// Creating an existing folder returns it instead of failing, so the same
				// name can be reused across saves.
				const { data } = await api.post('/whatsapp/library/folders', {
					name: newFolderName.trim(),
				});
				targetFolderId = data?.id || null;
			}

			const payload = {
				attachmentId,
				folderId: targetFolderId,
				title: title.trim() || undefined,
			};
			const endpoint = voiceEdit
				? '/whatsapp/library/items/from-voice-edit'
				: '/whatsapp/library/items/from-attachment';
			const body = voiceEdit ? { ...voiceEdit, ...payload } : payload;

			await api.post(endpoint, body);
			toast.success(t.saved);
			onSaved?.();
			onClose?.();
		} catch (error) {
			toast.error(error?.response?.data?.message || t.failed);
		} finally {
			setSaving(false);
		}
	}, [
		attachmentId,
		saving,
		folderId,
		creatingFolder,
		newFolderName,
		title,
		voiceEdit,
		onSaved,
		onClose,
		t.saved,
		t.failed,
	]);

	if (!open || typeof document === 'undefined') return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[135] grid place-items-end bg-black/45 p-4 backdrop-blur-sm sm:place-items-center"
			onClick={() => {
				if (!saving) onClose?.();
			}}
		>
			<div
				role="dialog"
				aria-label={t.title}
				dir={ar ? 'rtl' : 'ltr'}
				className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b px-5 py-4">
					<div className="min-w-0">
						<h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
							<BookmarkPlus size={18} className="text-emerald-600" />
							{t.title}
						</h3>
						<p className="mt-1 text-xs leading-snug text-slate-500">{t.subtitle}</p>
					</div>
					<button
						type="button"
						disabled={saving}
						onClick={() => onClose?.()}
						className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
					>
						<X size={18} />
					</button>
				</div>

				<div className="space-y-3 px-5 py-4">
					<label className="block">
						<span className="mb-1 block text-xs font-semibold text-slate-500">{t.name}</span>
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							maxLength={200}
							className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
						/>
					</label>

					<div>
						<span className="mb-1 block text-xs font-semibold text-slate-500">{t.folder}</span>
						{creatingFolder ? (
							<div className="flex gap-2">
								<input
									autoFocus
									value={newFolderName}
									placeholder={t.folderName}
									onChange={(event) => setNewFolderName(event.target.value)}
									maxLength={120}
									className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
								/>
								<button
									type="button"
									onClick={() => {
										setCreatingFolder(false);
										setNewFolderName('');
									}}
									className="rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
								>
									{t.cancel}
								</button>
							</div>
						) : (
							<div className="flex gap-2">
								<div ref={folderMenuRef} className="relative min-w-0 flex-1">
									<button
										type="button"
										aria-haspopup="listbox"
										aria-expanded={folderMenuOpen}
										onClick={() => setFolderMenuOpen((current) => !current)}
										className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-emerald-400"
									>
										<span className="flex min-w-0 items-center gap-2">
											{selectedFolder ? (
												<Folder size={15} className="shrink-0 text-slate-400" />
											) : (
												<FolderOpen size={15} className="shrink-0 text-slate-400" />
											)}
											<span className="truncate">{selectedFolder?.name || t.unsorted}</span>
										</span>
										<ChevronDown
											size={15}
											className={`shrink-0 text-slate-400 transition-transform ${
												folderMenuOpen ? 'rotate-180' : ''
											}`}
										/>
									</button>
									{folderMenuOpen && (
										<ul
											role="listbox"
											// Scrolls only past a dozen folders; the dialog itself stays put.
											className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
										>
											{[{ id: '', name: t.unsorted }, ...folders].map((folder) => {
												const active = folder.id === folderId;
												return (
													<li key={folder.id || 'unsorted'}>
														<button
															type="button"
															role="option"
															aria-selected={active}
															onClick={() => {
																setFolderId(folder.id);
																setFolderMenuOpen(false);
															}}
															className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition ${
																active
																	? 'bg-emerald-50 font-semibold text-emerald-700'
																	: 'text-slate-700 hover:bg-slate-50'
															}`}
														>
															{folder.id ? (
																<Folder size={15} className="shrink-0 opacity-60" />
															) : (
																<FolderOpen size={15} className="shrink-0 opacity-60" />
															)}
															<span className="min-w-0 flex-1 truncate">{folder.name}</span>
															{active && <Check size={14} className="shrink-0" />}
														</button>
													</li>
												);
											})}
										</ul>
									)}
								</div>
								<button
									type="button"
									title={t.newFolder}
									aria-label={t.newFolder}
									onClick={() => setCreatingFolder(true)}
									className="rounded-lg border border-slate-200 px-2.5 text-slate-500 hover:bg-slate-50"
								>
									<FolderPlus size={16} />
								</button>
							</div>
						)}
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 border-t bg-slate-50 px-5 py-3">
					<button
						type="button"
						disabled={saving}
						onClick={() => onClose?.()}
						className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
					>
						{t.cancel}
					</button>
					<button
						type="button"
						disabled={saving}
						onClick={() => void save()}
						className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
					>
						{saving ? <Loader2 size={16} className="animate-spin" /> : <BookmarkPlus size={16} />}
						{saving ? t.saving : t.save}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
