'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Copy, Image as ImageIcon, Loader2, Smile, Sparkles, Sticker, Upload, X } from 'lucide-react';
import api from '@/utils/axios';
import { clipboardImageFiles } from '../whatsapp-utils';
import AiGenerateForm from './AiGenerateForm';
import StickerPromptStudio from './StickerPromptStudio';
import GiphyPicker from './GiphyPicker';

const STICKER_EDGE = 512;
const STICKER_TARGET_BYTES = 480 * 1024;

async function canvasToBlob(canvas, type, quality) {
	return new Promise(resolve => {
		canvas.toBlob(resolve, type, quality);
	});
}

function knockoutNearWhite(context, width, height, threshold = 242) {
	const image = context.getImageData(0, 0, width, height);
	const data = image.data;
	const seen = new Uint8Array(width * height);
	const stack = [];
	const push = (x, y) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return;
		const index = y * width + x;
		if (seen[index]) return;
		seen[index] = 1;
		stack.push(index);
	};
	push(0, 0);
	push(width - 1, 0);
	push(0, height - 1);
	push(width - 1, height - 1);
	while (stack.length) {
		const index = stack.pop();
		const pixel = index * 4;
		if (data[pixel] < threshold || data[pixel + 1] < threshold || data[pixel + 2] < threshold) continue;
		data[pixel + 3] = 0;
		const x = index % width;
		const y = (index / width) | 0;
		push(x - 1, y);
		push(x + 1, y);
		push(x, y - 1);
		push(x, y + 1);
	}
	context.putImageData(image, 0, 0);
}

async function minimizeStickerFile(file, options = {}) {
	if (!file) return file;
	const type = String(file.type || '').toLowerCase();
	const knockoutBackground = Boolean(options.knockoutBackground);
	if (type.includes('gif')) return file;
	if (!knockoutBackground && file.size <= STICKER_TARGET_BYTES && type.includes('webp')) return file;
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
		if (knockoutBackground) knockoutNearWhite(context, width, height);
		let quality = 0.82;
		let blob = (await canvasToBlob(canvas, 'image/webp', quality)) ||
			(await canvasToBlob(canvas, 'image/png'));
		while (blob && blob.size > STICKER_TARGET_BYTES && quality > 0.38) {
			quality -= 0.14;
			blob = (await canvasToBlob(canvas, blob.type || 'image/webp', quality)) || blob;
		}
		if (!blob || !blob.size) return file;
		const extension = String(blob.type || '').includes('png') ? 'png' : 'webp';
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

function computePanelPosition(anchorRect, { wide = false, tall = false } = {}) {
	const margin = 12;
	const viewportW = window.innerWidth || 1280;
	const viewportH = window.innerHeight || 720;
	if (viewportW < 769) {
		return { mode: 'sheet' };
	}
	const width = Math.min(wide ? 560 : 420, viewportW - margin * 2);
	const height = Math.min(tall ? 680 : 520, viewportH - margin * 2);
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

async function loadPreviewMap(accountId, items, onBatch, isCancelled) {
	const next = {};
	const batchSize = 32;
	for (let index = 0; index < items.length; index += batchSize) {
		if (isCancelled?.()) return next;
		await Promise.all(
			items.slice(index, index + batchSize).map(async item => {
				if (item.available === false) return;
				try {
					const file = await fetchStickerBlob(accountId, item.id);
					next[item.id] = URL.createObjectURL(file);
				} catch {
					/* skip broken sticker file */
				}
			}),
		);
		onBatch?.({ ...next });
	}
	return next;
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
	const [deletingId, setDeletingId] = useState(null);
	const [promptOpen, setPromptOpen] = useState(false);
	const [stickerMode, setStickerMode] = useState('library');
	const panelRef = useRef(null);
	const fileRef = useRef(null);
	const autoHealRef = useRef('');
	const previewsRef = useRef({});
	const actionBtnClass =
		'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg px-2.5 text-[11px] font-bold leading-none disabled:opacity-50';
	const tabs = [
		['emoji', Smile, ar ? 'إيموجي' : 'Emoji'],
		['gif', ImageIcon, 'GIF'],
		['sticker', Sticker, ar ? 'ستيكرز' : 'Stickers'],
	];

	useEffect(() => {
		autoHealRef.current = '';
	}, [accountId]);

	useEffect(() => {
		if (!open) {
			setPromptOpen(false);
			setStickerMode('library');
		}
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const update = () =>
			setPosition(
				computePanelPosition(anchorRef?.current?.getBoundingClientRect(), {
					wide: stickerMode === 'ai' || promptOpen,
					tall: stickerMode === 'ai' || promptOpen || tab === 'sticker',
				}),
			);
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRef, stickerMode, promptOpen, tab]);

	useEffect(() => {
		if (!open) return undefined;
		const onPointer = event => {
			if (event.target?.closest?.('[data-wa-select-menu]')) return;
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
		const loadStickers = async () => {
			setLoading(true);
			try {
				const { data } = await api.get(`/whatsapp/accounts/${accountId}/stickers`);
				if (cancelled) return;
				let items = data?.items || [];
				const missing = items.filter(item => item.available === false);
				const healKey = `${accountId}:${items.length}:${missing.length}`;
				if (missing.length && autoHealRef.current !== healKey) {
					autoHealRef.current = healKey;
					setSyncing(true);
					try {
						const synced = await api.post(`/whatsapp/accounts/${accountId}/stickers/sync`, null, {
							timeout: 120000,
						});
						if (cancelled) return;
						items = synced.data?.items || items;
					} catch {
						/* keep listed stickers even if heal-sync fails */
					} finally {
						if (!cancelled) setSyncing(false);
					}
				}
				setStickers(items);
				await loadPreviewMap(
					accountId,
					items,
					batch => {
						if (cancelled) return;
						setPreviews(current => {
							Object.values(current).forEach(url => {
								if (!Object.values(batch).includes(url)) URL.revokeObjectURL(url);
							});
							previewsRef.current = batch;
							return batch;
						});
					},
					() => cancelled,
				);
			} catch {
				if (!cancelled) toast.error(ar ? 'تعذر تحميل الستيكرز' : 'Could not load stickers');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		void loadStickers();
		return () => {
			cancelled = true;
		};
	}, [open, tab, accountId, ar]);

	useEffect(() => {
		return () => {
			Object.values(previewsRef.current).forEach(url => URL.revokeObjectURL(url));
		};
	}, []);

	const refreshStickers = async items => {
		setStickers(items);
		const next = await loadPreviewMap(accountId, items);
		setPreviews(current => {
			Object.values(current).forEach(url => {
				if (!Object.values(next).includes(url)) URL.revokeObjectURL(url);
			});
			previewsRef.current = next;
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
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/stickers/sync`, null, {
				timeout: 120000,
			});
			await refreshStickers(data?.items || []);
			const pending = Number(data?.pending || 0);
			const imported = Number(data?.imported || 0);
			const repaired = Number(data?.repaired || 0);
			toast.success(
				ar
					? pending
						? `المكتبة: ${(data?.items || []).length} ستيكر. اتعمل استيراد ${imported}. لسه ${pending} مش محمّلين، اضغط مزامنة تاني وواتساب متصل.`
						: imported || repaired
							? `تمت المزامنة: +${imported} جديد${repaired ? `، إصلاح ${repaired}` : ''} (${(data?.items || []).length})`
							: `المكتبة محدّثة (${(data?.items || []).length} ستيكر)`
					: pending
						? `Library: ${(data?.items || []).length} stickers. Imported ${imported}. ${pending} still need WhatsApp download — sync again while connected.`
						: imported || repaired
							? `Synced: +${imported} new${repaired ? `, repaired ${repaired}` : ''} (${(data?.items || []).length})`
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

	const deleteSticker = async item => {
		if (!accountId || !item?.id || deletingId) return;
		setDeletingId(item.id);
		try {
			await api.delete(`/whatsapp/accounts/${accountId}/stickers/${item.id}`);
			setStickers(current => current.filter(sticker => sticker.id !== item.id));
			setPreviews(current => {
				const next = { ...current };
				if (next[item.id]) {
					URL.revokeObjectURL(next[item.id]);
					delete next[item.id];
				}
				return next;
			});
			toast.success(ar ? 'تم حذف الستيكر' : 'Sticker deleted');
		} catch (error) {
			toast.error(error.response?.data?.message || (ar ? 'فشل حذف الستيكر' : 'Could not delete sticker'));
		} finally {
			setDeletingId(null);
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
					? `wa-sticker-panel fixed inset-x-0 bottom-[88px] z-[1400] mx-auto flex ${stickerMode === 'ai' || promptOpen ? 'h-[80dvh]' : 'h-[62dvh]'} max-w-[560px] flex-col overflow-hidden border border-slate-200 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.12)] dark:border-slate-700 dark:bg-slate-900`
					: 'wa-sticker-panel flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(11,20,26,0.18)] dark:border-slate-700 dark:bg-slate-900'
			}
			style={style}
		>
			<div className="flex h-14 shrink-0 items-stretch border-b border-slate-100 dark:border-slate-800">
				<div className="grid min-w-0 flex-1 grid-cols-3">
					{tabs.map(([id, Icon, label]) => (
						<button
							key={id}
							type="button"
							aria-label={label}
							aria-pressed={tab === id}
							onClick={() => {
								setTab(id);
								if (id !== 'sticker') {
									setStickerMode('library');
									setPromptOpen(false);
								}
							}}
							className={`grid h-full place-items-center gap-0.5 border-b-2 px-1 text-[10px] font-bold ${
								tab === id ? 'border-[#16B96B] text-[#16B96B]' : 'border-transparent text-[#667781]'
							}`}
						>
							<Icon size={20} />
							<span className="leading-none">{label}</span>
						</button>
					))}
				</div>
				<button type="button" aria-label="Close" onClick={onClose} className="grid h-full w-12 shrink-0 place-items-center text-[#667781]">
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
				process.env.NEXT_PUBLIC_GIPHY_API_KEY || process.env.NEXT_PUBLIC_TENOR_API_KEY ? (
					<GiphyPicker
						ar={ar}
						apiKey={process.env.NEXT_PUBLIC_GIPHY_API_KEY || ''}
						tenorKey={process.env.NEXT_PUBLIC_TENOR_API_KEY || ''}
						onPick={file => onSendSticker?.(file)}
					/>
				) : (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-[#667781]">
						<ImageIcon size={30} />
						<p className="text-sm font-semibold">
							{ar ? 'أضف مفتاح Giphy أو Tenor في البيئة' : 'Add Giphy or Tenor API key in env'}
						</p>
						<p className="text-xs opacity-80">
							NEXT_PUBLIC_GIPHY_API_KEY / NEXT_PUBLIC_TENOR_API_KEY
						</p>
					</div>
				)
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
						{stickerMode === 'ai' ? (
							<>
								<button
									type="button"
									onClick={() => setStickerMode('library')}
									className={`${actionBtnClass} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`}
								>
									{ar ? 'المكتبة' : 'Library'}
								</button>
								<span className="text-xs font-bold text-slate-700 dark:text-slate-100">
									{ar ? 'ستيكر AI' : 'AI Sticker'}
								</span>
							</>
						) : (
							<>
						<button
							type="button"
							onClick={syncStickers}
							disabled={syncing || !accountId}
							className={`${actionBtnClass} bg-emerald-50 text-emerald-700`}
						>
							{syncing ? <Loader2 size={12} className="animate-spin" /> : null}
							{ar ? 'مزامنة واتساب' : 'Sync WhatsApp'}
						</button>
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							disabled={uploading || !accountId}
							className={`${actionBtnClass} bg-slate-100 text-slate-700`}
						>
							{uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
							{ar ? 'رفع' : 'Upload'}
						</button>
						<button
							type="button"
							onClick={() => {
								setPromptOpen(false);
								setStickerMode(current => (current === 'ai' ? 'library' : 'ai'));
							}}
							aria-pressed={stickerMode === 'ai'}
							title={ar ? 'توليد ستيكر بالذكاء الاصطناعي' : 'Generate an AI sticker'}
							className={`${actionBtnClass} ${
								stickerMode === 'ai' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-50 text-emerald-700'
							}`}
						>
							<Sparkles size={12} />
							{ar ? 'ستيكر AI' : 'AI Sticker'}
						</button>
						<button
							type="button"
							onClick={() => {
								setStickerMode('library');
								setPromptOpen(current => !current);
							}}
							aria-pressed={promptOpen}
							title={ar ? 'برومبت توليد استيكر بـ ChatGPT' : 'ChatGPT sticker generation prompt'}
							className={`${actionBtnClass} ${
								promptOpen ? 'bg-violet-100 text-violet-800' : 'bg-violet-50 text-violet-700'
							}`}
						>
							<Copy size={12} />
							{ar ? 'برومبت' : 'Prompt'}
						</button>
							</>
						)}
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
						className={`min-h-0 flex-1 ${stickerMode === 'ai' || promptOpen ? 'flex overflow-hidden p-0' : 'overflow-y-auto p-2'}`}
						onDragOver={event => event.preventDefault()}
						onDrop={event => {
							if (stickerMode === 'ai') return;
							event.preventDefault();
							void addFiles([...(event.dataTransfer?.files || [])].filter(file =>
								String(file.type || '').startsWith('image/'),
							));
						}}
					>
						{stickerMode === 'ai' ? (
							<AiGenerateForm
								kind="sticker"
								accountId={accountId}
								locale={locale}
								stickers={stickers}
								previews={previews}
								disabled={!accountId}
								onUse={async file => {
									const prepared = await minimizeStickerFile(file, { knockoutBackground: true });
									const sent = await onSendSticker?.(prepared);
									if (sent !== false) onClose?.();
								}}
							/>
						) : promptOpen ? (
							<StickerPromptStudio locale={locale} actionBtnClass={actionBtnClass} />
						) : loading ? (
							<div className="grid h-full place-items-center text-[#667781]">
								<Loader2 className="animate-spin" />
							</div>
						) : stickers.length ? (
							<div className="grid grid-cols-4 gap-1.5">
								{stickers.map(item => (
									<div key={item.id} className="group relative aspect-square">
										<button
											type="button"
											title={ar ? 'إرسال الستيكر' : 'Send sticker'}
											onClick={() => void sendSticker(item)}
											className="h-full w-full overflow-hidden rounded-xl bg-[#F0F2F5] p-1 transition hover:bg-emerald-50"
										>
											{previews[item.id] ? (
												<img src={previews[item.id]} alt="" className="h-full w-full object-contain" />
											) : (
												<span className="grid h-full place-items-center px-1 text-center text-[9px] font-semibold leading-3 text-slate-400">
													<Sticker className="mb-1 text-slate-300" size={18} />
													{ar ? 'غير متوفر هنا' : 'Missing on this machine'}
												</span>
											)}
										</button>
										<button
											type="button"
											aria-label={ar ? 'حذف الستيكر' : 'Delete sticker'}
											title={ar ? 'حذف الستيكر' : 'Delete sticker'}
											disabled={deletingId === item.id}
											onClick={event => {
												event.preventDefault();
												event.stopPropagation();
												void deleteSticker(item);
											}}
											className="absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 shadow-sm transition hover:bg-rose-600 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-60 max-[768px]:opacity-100"
										>
											{deletingId === item.id ? <Loader2 size={10} className="animate-spin" /> : <X size={11} strokeWidth={2.6} />}
										</button>
									</div>
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
