'use client';

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardPaste, Copy, Link2, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { tw } from './styles';
import { nextId } from './capture';
import {
	absoluteMediaLink,
	resolveFakeChatMediaUrl,
	shortMediaPath,
	uploadFakeChatImage,
} from './media-url';

function uniqueImageFiles(files) {
	const seen = new Set();
	const out = [];
	for (const file of Array.from(files || [])) {
		if (!file?.type?.startsWith('image/')) continue;
		const key = `${file.type}:${file.size}:${file.name || ''}:${file.lastModified || 0}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(file);
	}
	return out;
}

function itemPath(item) {
	return shortMediaPath(item?.url || item?.dataUrl) || String(item?.url || item?.dataUrl || '');
}

/**
 * Top-of-panel image paste bank.
 * Paste is handled once by FakeChatStudio (window) — this tray only uploads/drops
 * to avoid double-adding the same image. Images go to /uploads/… (short site links).
 */
export default function ClipboardTray({
	ar = false,
	items = [],
	onChange,
	onUseAs,
}) {
	const inputRef = useRef(null);
	const [busy, setBusy] = useState(false);

	const addFiles = useCallback(
		async files => {
			const list = uniqueImageFiles(files);
			if (!list.length) return;
			setBusy(true);
			try {
				const next = [];
				for (const file of list) {
					const url = await uploadFakeChatImage(file);
					const path = shortMediaPath(url) || url;
					const already = (items || []).some(item => itemPath(item) === path);
					if (already) continue;
					next.push({
						id: nextId('img'),
						url: path,
						name: file.name || 'paste.png',
						createdAt: Date.now(),
					});
				}
				if (!next.length) {
					toast(ar ? 'الصورة موجودة بالفعل' : 'Image already in tray');
					return;
				}
				onChange?.([...(items || []), ...next]);
				const last = next[next.length - 1];
				const path = itemPath(last);
				try {
					await navigator.clipboard.writeText(path);
				} catch {
					/* ignore */
				}
				toast.success(
					ar
						? next.length > 1
							? `اترفع ${next.length} · ${path}`
							: `اترفعت · ${path}`
						: next.length > 1
							? `Uploaded ${next.length} · ${path}`
							: `Uploaded · ${path}`,
				);
			} catch (error) {
				toast.error(error?.message || (ar ? 'تعذر رفع الصورة' : 'Could not upload image'));
			} finally {
				setBusy(false);
			}
		},
		[ar, items, onChange],
	);

	const copyLink = async item => {
		const path = itemPath(item);
		const absolute = absoluteMediaLink(path) || path;
		try {
			await navigator.clipboard.writeText(path);
			toast.success(ar ? `اتنسخ: ${path}` : `Copied: ${path}`);
		} catch {
			try {
				await navigator.clipboard.writeText(absolute);
				toast.success(ar ? 'اتنسخ اللينك' : 'Link copied');
			} catch {
				toast.error(ar ? 'تعذر النسخ' : 'Copy failed');
			}
		}
	};

	const remove = id => {
		onChange?.((items || []).filter(item => item.id !== id));
	};

	return (
		<section className={tw.clipTray} data-no-capture="true" data-clip-tray="true">
			<div className={tw.clipHead}>
				<div>
					<p className={tw.clipTitle}>{ar ? 'صور اللصق' : 'Paste images'}</p>
					<p className={tw.clipHint}>
						{ar
							? 'Ctrl+V يرفع على السيرفر · لينك قصير /uploads/… · هوفر = نسخ / حذف'
							: 'Ctrl+V uploads to server · short /uploads/… link · hover = copy / delete'}
					</p>
				</div>
				<label className={cn(tw.fileBtn, 'cursor-pointer', busy && 'pointer-events-none opacity-60')}>
					<input
						ref={inputRef}
						className={tw.fileInputHidden}
						type="file"
						accept="image/*"
						multiple
						disabled={busy}
						onChange={e => {
							void addFiles(e.target.files);
							e.target.value = '';
						}}
					/>
					{busy ? <Loader2 size={12} className="animate-spin" /> : <ClipboardPaste size={12} />}
					{ar ? (busy ? 'جاري الرفع…' : 'رفع') : busy ? 'Uploading…' : 'Upload'}
				</label>
			</div>

			{!(items || []).length ? (
				<div
					className={tw.clipEmpty}
					tabIndex={0}
					onDragOver={e => {
						e.preventDefault();
						e.dataTransfer.dropEffect = 'copy';
					}}
					onDrop={e => {
						e.preventDefault();
						void addFiles(e.dataTransfer.files);
					}}
				>
					<Link2 size={16} className="opacity-50" />
					<span>{ar ? 'الصق صورة عشان تترفع وتاخد لينك…' : 'Paste an image to upload + get a link…'}</span>
				</div>
			) : (
				<div className={tw.clipGrid}>
					{(items || []).map(item => {
						const path = itemPath(item);
						const thumb = resolveFakeChatMediaUrl(path);
						return (
							<div key={item.id} className={tw.clipItem} title={path}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img className={tw.clipThumb} src={thumb} alt="" draggable={false} />
								<p className={tw.clipPath} dir="ltr">
									{path}
								</p>
								<div className={tw.clipActions}>
									<button
										type="button"
										className={tw.clipAct}
										title={ar ? 'نسخ اللينك القصير' : 'Copy short link'}
										onClick={() => void copyLink(item)}
									>
										<Copy size={12} />
									</button>
									{typeof onUseAs === 'function' ? (
										<button
											type="button"
											className={tw.clipAct}
											title={ar ? 'استخدم كصورة الجهة' : 'Use as contact'}
											onClick={() => onUseAs(path, 'contactAvatar')}
										>
											@
										</button>
									) : null}
									<button
										type="button"
										className={cn(tw.clipAct, tw.clipActDanger)}
										title={ar ? 'حذف' : 'Delete'}
										onClick={() => remove(item.id)}
									>
										<Trash2 size={12} />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
