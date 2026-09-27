'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Loader2, Search, Send, X } from 'lucide-react';
import { tw } from './styles';

async function copyPngToClipboard(dataUrl) {
	if (typeof window === 'undefined' || !window.ClipboardItem || !navigator.clipboard?.write) {
		throw new Error('unsupported');
	}
	const blob = await (await fetch(dataUrl)).blob();
	const png = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
	await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': png })]);
}

function titleOf(conversation) {
	return (
		conversation?.contact?.name ||
		conversation?.group?.subject ||
		conversation?.title ||
		conversation?.phoneNumber ||
		conversation?.providerChatId ||
		'Chat'
	);
}

export default function ShareScreenshotSheet({
	open,
	ar = false,
	previewUrl = '',
	conversations = [],
	busyId = '',
	onClose,
	onShare,
	onDownload,
}) {
	const [query, setQuery] = useState('');
	const [bigPreview, setBigPreview] = useState(false);
	const [copied, setCopied] = useState(false);

	const onCopy = async () => {
		if (!previewUrl) return;
		try {
			await copyPngToClipboard(previewUrl);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1800);
			toast.success(ar ? 'اتنسخت الصورة — اعمل لصق في الشات' : 'Image copied — paste it in any chat');
		} catch (error) {
			toast.error(
				error?.message === 'unsupported'
					? ar
						? 'المتصفح مش بيدعم نسخ الصور — استخدم تحميل PNG'
						: 'Browser cannot copy images — use Download PNG'
					: ar
						? 'فشل نسخ الصورة'
						: 'Could not copy image',
			);
		}
	};

	const list = useMemo(() => {
		const rows = Array.isArray(conversations) ? conversations : [];
		const q = query.trim().toLowerCase();
		const filtered = rows.filter(item => {
			if (item?.isArchived) return false;
			if (!q) return true;
			return titleOf(item).toLowerCase().includes(q);
		});
		return filtered.slice(0, 40);
	}, [conversations, query]);

	useEffect(() => {
		if (!open) setBigPreview(false);
	}, [open]);

	useEffect(() => {
		if (!bigPreview) return undefined;
		const onKey = e => {
			if (e.key === 'Escape') setBigPreview(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [bigPreview]);

	if (!open) return null;

	return (
		<div className={tw.shareRoot} data-no-capture="true">
			<button type="button" className={tw.shareBackdrop} aria-label="Close" onClick={onClose} />
			<div className={tw.shareSheet} role="dialog" aria-label={ar ? 'مشاركة السكرين' : 'Share screenshot'}>
				<div className={tw.shareHandle} aria-hidden="true" />
				<div className={tw.shareHead}>
					<div>
						<p className={tw.shareTitle}>{ar ? 'شارك السكرين' : 'Share screenshot'}</p>
						<p className={tw.shareSub}>
							{ar ? 'ابعت الصورة لأي شات في واتساب' : 'Send this image to any WhatsApp chat'}
						</p>
					</div>
					<button type="button" className={tw.shareClose} onClick={onClose}>
						<X size={16} />
					</button>
				</div>

				{previewUrl ? (
					<button
						type="button"
						className={tw.sharePreviewBtn}
						onClick={() => setBigPreview(true)}
						aria-label={ar ? 'عرض بالحجم الكامل' : 'View full size'}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={previewUrl} alt="" className={tw.sharePreview} />
						<span className={tw.sharePreviewHint}>{ar ? 'تكبير' : 'Tap to enlarge'}</span>
					</button>
				) : null}

				<label className={tw.shareSearch}>
					<Search size={15} />
					<input
						className={tw.shareSearchInput}
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder={ar ? 'ابحث في الشاتات…' : 'Search chats…'}
					/>
				</label>

				<div className={tw.shareList}>
					{list.length === 0 ? (
						<p className={tw.shareEmpty}>{ar ? 'مفيش شاتات مطابقة' : 'No matching chats'}</p>
					) : (
						list.map(item => {
							const busy = busyId === item.id;
							return (
								<button
									key={item.id}
									type="button"
									disabled={Boolean(busyId)}
									className={tw.shareRow}
									onClick={() => onShare?.(item)}
								>
									<span className={tw.shareAvatar}>
										{String(titleOf(item)).charAt(0).toUpperCase()}
									</span>
									<span className={tw.shareName}>{titleOf(item)}</span>
									{busy ? (
										<Loader2 size={16} className="animate-spin text-emerald-600" />
									) : (
										<Send size={15} className="text-emerald-600" />
									)}
								</button>
							);
						})
					)}
				</div>

				<div className={tw.shareFooter}>
					<button
						type="button"
						className={tw.shareGhost}
						onClick={() => void onCopy()}
						disabled={!previewUrl}
					>
						<span className="inline-flex items-center justify-center gap-1.5">
							{copied ? <Check size={14} /> : <Copy size={14} />}
							{copied ? (ar ? 'اتنسخت' : 'Copied') : ar ? 'نسخ الصورة' : 'Copy image'}
						</span>
					</button>
					<button type="button" className={tw.shareGhost} onClick={onDownload}>
						{ar ? 'تحميل PNG' : 'Download PNG'}
					</button>
					<button type="button" className={tw.shareGhost} onClick={onClose}>
						{ar ? 'إغلاق' : 'Close'}
					</button>
				</div>
			</div>

			{bigPreview && previewUrl ? (
				<div className={tw.shareLightbox} role="dialog" aria-label={ar ? 'معاينة كبيرة' : 'Full preview'}>
					<button
						type="button"
						className="absolute inset-0 border-0 bg-transparent"
						aria-label={ar ? 'إغلاق' : 'Close'}
						onClick={() => setBigPreview(false)}
					/>
					<button
						type="button"
						className={tw.shareLightboxClose}
						onClick={() => setBigPreview(false)}
						aria-label={ar ? 'إغلاق' : 'Close'}
					>
						<X size={20} />
					</button>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={previewUrl}
						alt=""
						className={tw.shareLightboxImg}
						onClick={e => e.stopPropagation()}
					/>
				</div>
			) : null}
		</div>
	);
}
