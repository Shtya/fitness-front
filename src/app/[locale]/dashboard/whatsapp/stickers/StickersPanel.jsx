'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Image as ImageIcon, Loader2, Smile, Sticker, Upload, X } from 'lucide-react';
import api from '@/utils/axios';
import { clipboardImageFiles } from '../whatsapp-utils';

const STICKER_EDGE = 512;
const STICKER_TARGET_BYTES = 480 * 1024;

async function canvasToBlob(canvas, type, quality) {
	return new Promise(resolve => {
		canvas.toBlob(resolve, type, quality);
	});
}

async function minimizeStickerFile(file) {
	if (!file) return file;
	const type = String(file.type || '').toLowerCase();
	if (type.includes('gif')) return file;
	if (file.size <= STICKER_TARGET_BYTES && type.includes('webp')) return file;
	if (typeof createImageBitmap !== 'function') return file;
	let bitmap = null;
	try {
		bitmap = await createImageBitmap(file);
		const scale = Math.min(1, STICKER_EDGE / Math.max(bitmap.width, bitmap.height, 1));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) return file;
		context.clearRect(0, 0, width, height);
		context.drawImage(bitmap, 0, 0, width, height);
		let quality = 0.82;
		let blob = (await canvasToBlob(canvas, 'image/webp', quality)) ||
			(await canvasToBlob(canvas, 'image/jpeg', quality));
		while (blob && blob.size > STICKER_TARGET_BYTES && quality > 0.38) {
			quality -= 0.14;
			blob = (await canvasToBlob(canvas, blob.type || 'image/webp', quality)) || blob;
		}
		if (!blob || !blob.size) return file;
		const extension = String(blob.type || '').includes('jpeg') ? 'jpg' : 'webp';
		return new File([blob], String(file.name || 'sticker').replace(/\.[^.]+$/, `.${extension}`), {
			type: blob.type || 'image/webp',
		});
	} catch {
		return file;
	} finally {
		bitmap?.close?.();
	}
}

const EMOJIS = [
	'😀', '😂', '🥰', '😍', '😊', '😭', '😎', '🤔',
	'👍', '👏', '🙏', '❤️', '🔥', '🎉', '💪', '✅',
	'👀', '✨', '😅', '🙌', '🤝', '💯', '🫡', '🌹',
];

function computePanelPosition(anchorRect) {
	const margin = 12;
	const viewportW = window.innerWidth || 1280;
	const viewportH = window.innerHeight || 720;
	if (viewportW < 769) {
		return { mode: 'sheet' };
	}
	const width = Math.min(360, viewportW - margin * 2);
	const height = Math.min(420, viewportH - margin * 2);
	const gap = 8;
	const rect = anchorRect || {
		top: viewportH - 64,
		bottom: viewportH - 32,
		left: viewportW - 72,
		right: viewportW - 40,
		width: 32,
		height: 32,
	};
	let left = rect.left + rect.width / 2 - width / 2;
	left = Math.max(margin, Math.min(left, viewportW - width - margin));
	let top = rect.top - gap - height;
	if (top < margin) {
		top = Math.min(rect.bottom + gap, viewportH - height - margin);
	}
	top = Math.max(margin, top);
	return { mode: 'anchored', top, left, width, height };
}

async function fetchStickerBlob(accountId, stickerId) {
	const { data, headers } = await api.get(
		`/whatsapp/accounts/${accountId}/stickers/${stickerId}/content`,
		{ responseType: 'blob' },
	);
	const type = String(headers['content-type'] || data.type || 'image/webp').split(';')[0];
	return new File([data], 'sticker.webp', { type });
}

export default function StickersPanel({
	open,
	onClose,
	onInsertEmoji,
	onSendSticker,
	accountId,
	locale = 'en',
	anchorRef,
}) {
	const ar = locale === 'ar';
	const [tab, setTab] = useState('emoji');
	const [position, setPosition] = useState(null);
	const [stickers, setStickers] = useState([]);
	const [previews, setPreviews] = useState({});
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [uploading, setUploading] = useState(false);
	const panelRef = useRef(null);
	const fileRef = useRef(null);
	const tabs = [
		['emoji', Smile, ar ? 'إيموجي' : 'Emoji'],
		['gif', ImageIcon, 'GIF'],
		['sticker', Sticker, ar ? 'ستيكرز' : 'Stickers'],
	];

	useEffect(() => {
		if (!open) return undefined;
		const update = () => setPosition(computePanelPosition(anchorRef?.current?.getBoundingClientRect()));
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRef]);

	useEffect(() => {
		if (!open) return undefined;
		const onPointer = event => {
			if (panelRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) return;
			onClose?.();
		};
		const onKey = event => {
			if (event.key === 'Escape') onClose?.();
		};
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, onClose, anchorRef]);

	useEffect(() => {
		if (!open || tab !== 'sticker' || !accountId) return undefined;
		let cancelled = false;
		setLoading(true);
		api.get(`/whatsapp/accounts/${accountId}/stickers`)
			.then(async ({ data }) => {
				if (cancelled) return;
				const items = data?.items || [];
				setStickers(items);
				const next = {};
				await Promise.all(
					items.map(async item => {
						try {
							const file = await fetchStickerBlob(accountId, item.id);
							if (cancelled) return;
							next[item.id] = URL.createObjectURL(file);
						} catch {
							/* skip broken sticker file */
						}
					}),
				);
				if (!cancelled) setPreviews(current => {
					Object.values(current).forEach(url => URL.revokeObjectURL(url));
					return next;
				});
			})
			.catch(() => {
				if (!cancelled) toast.error(ar ? 'تعذر تحميل الستيكرز' : 'Could not load stickers');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, tab, accountId, ar]);

	useEffect(() => {
		return () => {
			Object.values(previews).forEach(url => URL.revokeObjectURL(url));
		};
	}, [previews]);

	const refreshStickers = async items => {
		setStickers(items);
		const next = {};
		await Promise.all(
			items.map(async item => {
				try {
					const file = await fetchStickerBlob(accountId, item.id);
					next[item.id] = URL.createObjectURL(file);
				} catch {
					/* skip */
				}
			}),
		);
		setPreviews(current => {
			Object.values(current).forEach(url => URL.revokeObjectURL(url));
			return next;
		});
	};

	const addFiles = async files => {
		if (!accountId || !files?.length) return;
		setUploading(true);
		try {
			let lastItems = stickers;
			for (const file of files) {
				const prepared = await minimizeStickerFile(file);
				const form = new FormData();
				form.append('file', prepared);
				const { data } = await api.post(`/whatsapp/accounts/${accountId}/stickers`, form);
				lastItems = [data, ...lastItems.filter(item => item.id !== data.id)];
			}
			await refreshStickers(lastItems);
			toast.success(ar ? 'تمت إضافة الستيكر' : 'Sticker added');
		} catch (error) {
			const message = String(error.response?.data?.message || error.message || '');
			toast.error(
				/file too large/i.test(message)
					? ar
						? 'الصورة كبيرة جدًا. حاولنا تصغيرها، ارفع صورة أصغر.'
						: 'That image is still too large. Try a smaller file.'
					: message || (ar ? 'فشل حفظ الستيكر' : 'Could not save sticker'),
			);
		} finally {
			setUploading(false);
		}
	};

	useEffect(() => {
		if (!open || tab !== 'sticker') return undefined;
		const onPaste = event => {
			const files = clipboardImageFiles(event);
			if (!files.length) return;
			event.preventDefault();
			event.stopPropagation();
			void addFiles(files);
		};
		window.addEventListener('paste', onPaste, true);
		return () => window.removeEventListener('paste', onPaste, true);
	}, [open, tab, accountId, stickers, ar]);

	const syncStickers = async () => {
		if (!accountId) return;
		setSyncing(true);
		try {
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/stickers/sync`);
			await refreshStickers(data?.items || []);
			toast.success(
				ar
					? data?.imported
						? `تمت إضافة ${data.imported} ستيكر جديد من واتساب`
						: `المكتبة محدّثة (${(data?.items || []).length} ستيكر)`
					: data?.imported
						? `Synced ${data.imported} new stickers from WhatsApp`
						: `Sticker library is up to date (${(data?.items || []).length})`,
			);
		} catch (error) {
			toast.error(error.response?.data?.message || (ar ? 'فشلت المزامنة' : 'Sync failed'));
		} finally {
			setSyncing(false);
		}
	};

	const sendSticker = async item => {
		try {
			const file = await fetchStickerBlob(accountId, item.id);
			await onSendSticker?.(file);
		} catch (error) {
			toast.error(error.response?.data?.message || (ar ? 'فشل إرسال الستيكر' : 'Could not send sticker'));
		}
	};

	if (!open || typeof document === 'undefined') return null;

	const style =
		position?.mode === 'anchored'
			? {
					position: 'fixed',
					top: position.top,
					left: position.left,
					width: position.width,
					height: position.height,
					zIndex: 1400,
				}
			: undefined;

	return createPortal(
		<section
			ref={panelRef}
			role="dialog"
			aria-label={ar ? 'إيموجي وستيكرز' : 'Emoji, GIF and stickers'}
			onPaste={event => {
				if (tab !== 'sticker') return;
				const files = clipboardImageFiles(event);
				if (!files.length) return;
				event.preventDefault();
				event.stopPropagation();
				void addFiles(files);
			}}
			className={
				position?.mode === 'sheet'
					? 'wa-sticker-panel fixed inset-x-0 bottom-[88px] z-[1400] mx-auto flex h-[48dvh] max-w-[430px] flex-col overflow-hidden border border-slate-200 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.12)]'
					: 'wa-sticker-panel flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(11,20,26,0.18)]'
			}
			style={style}
		>
			<div className="flex h-12 shrink-0 items-center border-b border-slate-100 px-2">
				{tabs.map(([id, Icon, label]) => (
					<button
						key={id}
						type="button"
						aria-label={label}
						aria-pressed={tab === id}
						onClick={() => setTab(id)}
						className={`grid h-11 flex-1 place-items-center border-b-2 ${
							tab === id ? 'border-[#16B96B] text-[#16B96B]' : 'border-transparent text-[#667781]'
						}`}
					>
						<Icon size={22} />
					</button>
				))}
				<button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center text-[#667781]">
					<X size={21} />
				</button>
			</div>

			{tab === 'emoji' ? (
				<div className="grid flex-1 grid-cols-6 content-start gap-2 overflow-y-auto p-3 sm:grid-cols-7">
					{EMOJIS.map(emoji => (
						<button
							key={emoji}
							type="button"
							onClick={() => onInsertEmoji?.(emoji)}
							className="grid aspect-square place-items-center rounded-xl text-2xl transition-transform hover:bg-slate-50 active:scale-90"
						>
							{emoji}
						</button>
					))}
				</div>
			) : tab === 'gif' ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-[#667781]">
					<ImageIcon size={30} />
					<p className="text-sm font-semibold">{ar ? 'الـ GIF قريبًا' : 'GIFs coming soon'}</p>
				</div>
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
						<button
							type="button"
							onClick={syncStickers}
							disabled={syncing || !accountId}
							className="inline-flex h-8 items-center rounded-lg bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 disabled:opacity-50"
						>
							{syncing ? <Loader2 size={12} className="me-1 animate-spin" /> : null}
							{ar ? 'مزامنة واتساب' : 'Sync WhatsApp'}
						</button>
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							disabled={uploading || !accountId}
							className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-[11px] font-bold text-slate-700 disabled:opacity-50"
						>
							{uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
							{ar ? 'رفع' : 'Upload'}
						</button>
						<input
							ref={fileRef}
							type="file"
							accept="image/webp,image/png,image/jpeg,image/gif"
							multiple
							hidden
							onChange={event => {
								const files = [...(event.target.files || [])];
								event.target.value = '';
								void addFiles(files);
							}}
						/>
					</div>
					<div
						className="min-h-0 flex-1 overflow-y-auto p-2"
						onDragOver={event => event.preventDefault()}
						onDrop={event => {
							event.preventDefault();
							void addFiles([...(event.dataTransfer?.files || [])].filter(file =>
								String(file.type || '').startsWith('image/'),
							));
						}}
					>
						{loading ? (
							<div className="grid h-full place-items-center text-[#667781]">
								<Loader2 className="animate-spin" />
							</div>
						) : stickers.length ? (
							<div className="grid grid-cols-4 gap-1.5">
								{stickers.map(item => (
									<button
										key={item.id}
										type="button"
										title={ar ? 'إرسال الستيكر' : 'Send sticker'}
										onClick={() => void sendSticker(item)}
										className="aspect-square overflow-hidden rounded-xl bg-[#F0F2F5] p-1 transition hover:bg-emerald-50"
									>
										{previews[item.id] ? (
											<img src={previews[item.id]} alt="" className="h-full w-full object-contain" />
										) : (
											<Sticker className="mx-auto mt-4 text-slate-300" size={22} />
										)}
									</button>
								))}
							</div>
						) : (
							<div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-[#667781]">
								<Sticker size={30} />
								<p className="text-sm font-semibold">{ar ? 'مكتبة الستيكرز' : 'Sticker library'}</p>
								<p className="text-xs leading-5">
									{ar
										? 'اعمل Ctrl+V هنا، أو ارفع صورة، أو زامن الستيكرز اللي وصلت على واتساب.'
										: 'Paste with Ctrl+V, upload an image, or sync stickers already received on WhatsApp.'}
								</p>
							</div>
						)}
					</div>
				</div>
			)}
		</section>,
		document.body,
	);
}
