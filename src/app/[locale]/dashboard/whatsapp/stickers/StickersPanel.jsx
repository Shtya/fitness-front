'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
	Activity,
	Clock3,
	Copy,
	Hand,
	Heart,
	Image as ImageIcon,
	Leaf,
	Loader2,
	RefreshCw,
	Search,
	Smile,
	Sparkles,
	Sticker,
	Trash2,
	Upload,
	X,
} from 'lucide-react';
import api from '@/utils/axios';
import { clipboardImageFiles } from '../whatsapp-utils';
import AiGenerateForm from './AiGenerateForm';
import StickerPromptStudio from './StickerPromptStudio';
import GiphyPicker from './GiphyPicker';
import {
	EMOJI_CATEGORIES,
	EMOJIS_BY_CATEGORY,
	readRecentEmojis,
	rememberEmoji,
	searchEmojis,
} from './emoji-catalog';

const CATEGORY_ICONS = {
	recent: Clock3,
	smileys: Smile,
	people: Hand,
	hearts: Heart,
	nature: Leaf,
	activity: Activity,
};

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

function computePanelPosition(anchorRect, { wide = false, tall = false } = {}, composerTop = null) {
	const margin = 12;
	const viewportW = window.innerWidth || 1280;
	const viewportH = window.innerHeight || 720;
	if (viewportW < 769) {
		// Sits directly on top of the composer, like the phone apps' emoji keyboard.
		const bottom = composerTop != null ? Math.max(0, Math.round(viewportH - composerTop)) : 88;
		return { mode: 'sheet', bottom };
	}
	const width = Math.min(wide ? 560 : 408, viewportW - margin * 2);
	const height = Math.min(tall ? 640 : 440, viewportH - margin * 2);
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
	const emojiScrollRef = useRef(null);
	const searchRef = useRef(null);
	const [emojiQuery, setEmojiQuery] = useState('');
	const [recentEmojis, setRecentEmojis] = useState([]);
	const [activeCategory, setActiveCategory] = useState('smileys');
	const actionBtnClass = 'wa-ui-btn wa-ui-btn--secondary wa-ui-btn--sm';
	const tabs = [
		['emoji', Smile, ar ? 'إيموجي' : 'Emoji'],
		['gif', ImageIcon, 'GIF'],
		['sticker', Sticker, ar ? 'ستيكرز' : 'Stickers'],
	];
	const emojiSections = useMemo(() => {
		const sections = EMOJI_CATEGORIES.map(category => ({
			id: category.id,
			label: ar ? category.ar : category.en,
			items: EMOJIS_BY_CATEGORY[category.id].map(item => item.emoji),
		}));
		return recentEmojis.length
			? [{ id: 'recent', label: ar ? 'المستخدمة مؤخرًا' : 'Recent', items: recentEmojis }, ...sections]
			: sections;
	}, [ar, recentEmojis]);
	const emojiResults = useMemo(() => searchEmojis(emojiQuery), [emojiQuery]);
	const pickEmoji = emoji => {
		onInsertEmoji?.(emoji);
		setRecentEmojis(current => rememberEmoji(emoji, current));
	};
	const jumpToCategory = id => {
		setEmojiQuery('');
		setActiveCategory(id);
		const node = emojiScrollRef.current?.querySelector(`[data-emoji-section="${id}"]`);
		if (node) emojiScrollRef.current.scrollTo({ top: node.offsetTop - 4, behavior: 'smooth' });
	};
	const syncActiveCategory = () => {
		const root = emojiScrollRef.current;
		if (!root || emojiQuery) return;
		const sections = [...root.querySelectorAll('[data-emoji-section]')];
		let current = sections[0]?.dataset.emojiSection;
		for (const section of sections) {
			if (section.offsetTop - root.scrollTop <= 24) current = section.dataset.emojiSection;
		}
		if (current && current !== activeCategory) setActiveCategory(current);
	};

	useEffect(() => {
		autoHealRef.current = '';
	}, [accountId]);

	useEffect(() => {
		if (!open) return;
		const recent = readRecentEmojis();
		setRecentEmojis(recent);
		setActiveCategory(recent.length ? 'recent' : 'smileys');
		setEmojiQuery('');
	}, [open]);

	useEffect(() => {
		if (!open || tab !== 'emoji') return undefined;
		// Desktop only: focusing a field on a phone would pop the keyboard over the picker.
		if (window.innerWidth < 769) return undefined;
		const timer = window.setTimeout(() => searchRef.current?.focus(), 60);
		return () => window.clearTimeout(timer);
	}, [open, tab]);

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
				computePanelPosition(
					anchorRef?.current?.getBoundingClientRect(),
					{
						wide: stickerMode === 'ai' || promptOpen,
						tall: stickerMode === 'ai' || promptOpen,
					},
					document
						.querySelector('.wa-chat-thread-pane .wa-composer-stack')
						?.getBoundingClientRect().top ?? null,
				),
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
			if (event.key !== 'Escape') return;
			if (event.target === searchRef.current && searchRef.current?.value) return;
			onClose?.();
			anchorRef?.current?.focus?.();
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
			: position?.mode === 'sheet'
				? { bottom: position.bottom }
				: undefined;
	const expanded = stickerMode === 'ai' || promptOpen;

	return createPortal(
		<section
			ref={panelRef}
			role="dialog"
			aria-label={ar ? 'إيموجي و GIF وستيكرز' : 'Emoji, GIF and stickers'}
			dir={ar ? 'rtl' : 'ltr'}
			onPaste={event => {
				if (tab !== 'sticker') return;
				const files = clipboardImageFiles(event);
				if (!files.length) return;
				event.preventDefault();
				event.stopPropagation();
				void addFiles(files);
			}}
			className={`wa-sticker-panel wa-ui-picker ${
				position?.mode === 'sheet' ? 'is-sheet' : 'is-popover'
			}${expanded ? ' is-expanded' : ''}`}
			style={style}
		>
			<div className="wa-ui-picker__head">
				{tab === 'emoji' ? (
					<label className="wa-ui-search wa-ui-picker__search">
						<Search size={16} strokeWidth={2} aria-hidden="true" />
						<input
							ref={searchRef}
							type="search"
							className="wa-ui-input"
							value={emojiQuery}
							onChange={event => setEmojiQuery(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Escape' && emojiQuery) {
									event.stopPropagation();
									setEmojiQuery('');
								}
								if (event.key === 'Enter' && emojiResults[0]) {
									event.preventDefault();
									pickEmoji(emojiResults[0]);
								}
							}}
							placeholder={ar ? 'ابحث عن إيموجي' : 'Search emoji'}
							aria-label={ar ? 'ابحث عن إيموجي' : 'Search emoji'}
						/>
					</label>
				) : (
					<p className="wa-ui-picker__title">
						{tab === 'gif' ? 'GIF' : stickerMode === 'ai' ? (ar ? 'ستيكر AI' : 'AI sticker') : ar ? 'ستيكرز' : 'Stickers'}
					</p>
				)}
				<button
					type="button"
					aria-label={ar ? 'إغلاق' : 'Close'}
					title={ar ? 'إغلاق' : 'Close'}
					onClick={onClose}
					className="wa-ui-icon-btn"
				>
					<X size={18} strokeWidth={2} />
				</button>
			</div>

			{tab === 'emoji' ? (
				<>
					{!emojiQuery ? (
						<div className="wa-ui-picker__cats" role="tablist" aria-label={ar ? 'فئات الإيموجي' : 'Emoji categories'}>
							{emojiSections.map(section => {
								const Icon = CATEGORY_ICONS[section.id] || Smile;
								return (
									<button
										key={section.id}
										type="button"
										role="tab"
										aria-selected={activeCategory === section.id}
										aria-label={section.label}
										title={section.label}
										onClick={() => jumpToCategory(section.id)}
										className="wa-ui-picker__cat"
									>
										<Icon size={18} strokeWidth={1.9} />
									</button>
								);
							})}
						</div>
					) : null}
					<div ref={emojiScrollRef} className="wa-ui-picker__body" onScroll={syncActiveCategory}>
						{emojiQuery ? (
							emojiResults.length ? (
								<div className="wa-ui-picker__grid" role="listbox" aria-label={ar ? 'نتائج البحث' : 'Search results'}>
									{emojiResults.map(emoji => (
										<button key={emoji} type="button" className="wa-ui-picker__emoji" onClick={() => pickEmoji(emoji)}>
											{emoji}
										</button>
									))}
								</div>
							) : (
								<p className="wa-ui-picker__empty">{ar ? 'لا توجد نتائج' : 'No emoji found'}</p>
							)
						) : (
							emojiSections.map(section => (
								<div key={section.id} data-emoji-section={section.id} className="wa-ui-picker__section">
									<p className="wa-ui-picker__section-title">{section.label}</p>
									<div className="wa-ui-picker__grid">
										{section.items.map(emoji => (
											<button
												key={`${section.id}-${emoji}`}
												type="button"
												className="wa-ui-picker__emoji"
												onClick={() => pickEmoji(emoji)}
											>
												{emoji}
											</button>
										))}
									</div>
								</div>
							))
						)}
					</div>
				</>
			) : tab === 'gif' ? (
				process.env.NEXT_PUBLIC_GIPHY_API_KEY || process.env.NEXT_PUBLIC_TENOR_API_KEY ? (
					<GiphyPicker
						ar={ar}
						apiKey={process.env.NEXT_PUBLIC_GIPHY_API_KEY || ''}
						tenorKey={process.env.NEXT_PUBLIC_TENOR_API_KEY || ''}
						onPick={file => onSendSticker?.(file)}
					/>
				) : (
					<div className="wa-ui-picker__placeholder">
						<ImageIcon size={28} strokeWidth={1.6} aria-hidden="true" />
						<p className="wa-ui-picker__placeholder-title">
							{ar ? 'الـGIF غير مفعّل' : 'GIFs aren’t set up yet'}
						</p>
						<p>
							{ar ? 'أضف مفتاح Giphy أو Tenor في متغيرات البيئة:' : 'Add a Giphy or Tenor key to the environment:'}
						</p>
						<code dir="ltr">NEXT_PUBLIC_GIPHY_API_KEY · NEXT_PUBLIC_TENOR_API_KEY</code>
					</div>
				)
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="wa-ui-picker__toolbar">
						{stickerMode === 'ai' ? (
							<button type="button" onClick={() => setStickerMode('library')} className={actionBtnClass}>
								<Sticker size={14} strokeWidth={2} aria-hidden="true" />
								{ar ? 'رجوع للمكتبة' : 'Back to library'}
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={syncStickers}
									disabled={syncing || !accountId}
									className={actionBtnClass}
									title={ar ? 'استيراد الستيكرز اللي وصلت على واتساب' : 'Import stickers received on WhatsApp'}
								>
									{syncing ? (
										<Loader2 size={14} className="animate-spin" aria-hidden="true" />
									) : (
										<RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
									)}
									{ar ? 'مزامنة' : 'Sync'}
								</button>
								<button
									type="button"
									onClick={() => fileRef.current?.click()}
									disabled={uploading || !accountId}
									className={actionBtnClass}
								>
									{uploading ? (
										<Loader2 size={14} className="animate-spin" aria-hidden="true" />
									) : (
										<Upload size={14} strokeWidth={2} aria-hidden="true" />
									)}
									{ar ? 'رفع' : 'Upload'}
								</button>
								<span className="wa-ui-picker__toolbar-gap" aria-hidden="true" />
								<button
									type="button"
									onClick={() => {
										setPromptOpen(false);
										setStickerMode(current => (current === 'ai' ? 'library' : 'ai'));
									}}
									aria-pressed={stickerMode === 'ai'}
									title={ar ? 'توليد ستيكر بالذكاء الاصطناعي' : 'Generate an AI sticker'}
									className="wa-ui-btn wa-ui-btn--ghost wa-ui-btn--sm wa-ui-picker__toggle"
								>
									<Sparkles size={14} strokeWidth={2} aria-hidden="true" />
									{ar ? 'ستيكر AI' : 'AI sticker'}
								</button>
								<button
									type="button"
									onClick={() => {
										setStickerMode('library');
										setPromptOpen(current => !current);
									}}
									aria-pressed={promptOpen}
									title={ar ? 'برومبت توليد استيكر بـ ChatGPT' : 'ChatGPT sticker generation prompt'}
									className="wa-ui-btn wa-ui-btn--ghost wa-ui-btn--sm wa-ui-picker__toggle"
								>
									<Copy size={14} strokeWidth={2} aria-hidden="true" />
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
						className={`min-h-0 flex-1 ${expanded ? 'flex overflow-hidden p-0' : 'wa-ui-picker__body'}`}
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
							<div className="wa-ui-picker__stickers" aria-busy="true">
								{Array.from({ length: 8 }, (_, index) => (
									<span key={index} className="wa-ui-picker__sticker is-skeleton" />
								))}
							</div>
						) : stickers.length ? (
							<div className="wa-ui-picker__stickers">
								{stickers.map(item => (
									<div key={item.id} className="wa-ui-picker__sticker">
										<button
											type="button"
											title={ar ? 'إرسال الستيكر' : 'Send sticker'}
											aria-label={ar ? 'إرسال الستيكر' : 'Send sticker'}
											onClick={() => void sendSticker(item)}
											className="wa-ui-picker__sticker-send"
										>
											{previews[item.id] ? (
												<img src={previews[item.id]} alt="" />
											) : (
												<span className="wa-ui-picker__sticker-missing">
													<Sticker size={18} strokeWidth={1.6} aria-hidden="true" />
													{ar ? 'غير متوفر هنا' : 'Not on this device'}
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
											className="wa-ui-picker__sticker-delete"
										>
											{deletingId === item.id ? (
												<Loader2 size={12} className="animate-spin" />
											) : (
												<Trash2 size={13} strokeWidth={2} />
											)}
										</button>
									</div>
								))}
							</div>
						) : (
							<div className="wa-ui-picker__placeholder">
								<Sticker size={28} strokeWidth={1.6} aria-hidden="true" />
								<p className="wa-ui-picker__placeholder-title">{ar ? 'مكتبة الستيكرز فاضية' : 'No stickers yet'}</p>
								<p>
									{ar
										? 'الصق صورة بـ Ctrl+V، أو ارفع صورة، أو زامن الستيكرز اللي وصلت على واتساب.'
										: 'Paste an image with Ctrl+V, upload one, or sync stickers you received on WhatsApp.'}
								</p>
							</div>
						)}
					</div>
				</div>
			)}

			<div className="wa-ui-picker__tabs" role="tablist" aria-label={ar ? 'نوع المحتوى' : 'Picker type'}>
				{tabs.map(([id, Icon, label]) => (
					<button
						key={id}
						type="button"
						role="tab"
						aria-selected={tab === id}
						onClick={() => {
							setTab(id);
							if (id !== 'sticker') {
								setStickerMode('library');
								setPromptOpen(false);
							}
						}}
						className="wa-ui-picker__tab"
					>
						<Icon size={18} strokeWidth={1.9} aria-hidden="true" />
						<span>{label}</span>
					</button>
				))}
			</div>
		</section>,
		document.body,
	);
}
