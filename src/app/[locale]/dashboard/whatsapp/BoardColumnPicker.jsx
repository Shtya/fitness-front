'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { fetchWhatsAppBoard, createBoardCardFromMessages, boardPayloadToUi } from './whatsapp-board-api';

function columnAccent(title = '') {
	const value = String(title).toLowerCase();
	if (value.includes('progress') || value.includes('تقدم')) {
		return { bar: 'bg-[#8752d9]', soft: 'hover:bg-[#faf7ff]', count: 'bg-[#f1e8ff] text-[#8554d9]' };
	}
	if (value.includes('review') || value.includes('مراجعة')) {
		return { bar: 'bg-[#267fe8]', soft: 'hover:bg-[#f5faff]', count: 'bg-[#e8f3ff] text-[#2781e8]' };
	}
	if (value.includes('done') || value.includes('منتهي') || value.includes('مكتمل')) {
		return { bar: 'bg-[#17b87b]', soft: 'hover:bg-[#f4fcf8]', count: 'bg-[#e5f8ef] text-[#16aa6e]' };
	}
	return { bar: 'bg-[#ef2c65]', soft: 'hover:bg-[#fff6f8]', count: 'bg-[#ffe8ef] text-[#ee3c6c]' };
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Hover/flyout: pick which board column to send selected chat messages into.
 * Menu is portaled to document.body so sticky/overflow parents cannot crop it.
 */
export function BoardColumnPicker({
	accountId,
	conversationId,
	messageIds = [],
	locale = 'en',
	open = false,
	onClose,
	onSuccess,
	anchorClassName = '',
	triggerLabel,
}) {
	const ar = locale === 'ar';
	const [lists, setLists] = useState([]);
	const [loading, setLoading] = useState(false);
	const [sendingId, setSendingId] = useState(null);
	const [error, setError] = useState('');
	const [hoverOpen, setHoverOpen] = useState(false);
	const [menuPos, setMenuPos] = useState(null);
	const [mounted, setMounted] = useState(false);
	const rootRef = useRef(null);
	const menuRef = useRef(null);
	const closeTimerRef = useRef(null);
	const visible = open || hoverOpen;

	useEffect(() => setMounted(true), []);

	const clearCloseTimer = () => {
		if (closeTimerRef.current) {
			window.clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	};

	const openMenu = () => {
		clearCloseTimer();
		setHoverOpen(true);
	};

	const scheduleClose = () => {
		clearCloseTimer();
		closeTimerRef.current = window.setTimeout(() => {
			setHoverOpen(false);
			onClose?.();
		}, 140);
	};

	useEffect(() => () => clearCloseTimer(), []);

	useEffect(() => {
		if (!visible || !accountId) return;
		let cancelled = false;
		setLoading(true);
		setError('');
		fetchWhatsAppBoard(accountId)
			.then(payload => {
				if (cancelled) return;
				const normalized = boardPayloadToUi(payload);
				setLists(normalized.lists || []);
			})
			.catch(err => {
				if (cancelled) return;
				setError(err?.response?.data?.message || err?.message || 'Could not load columns');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [visible, accountId]);

	useEffect(() => {
		if (!visible) {
			setMenuPos(null);
			return undefined;
		}
		const update = () => {
			const trigger = rootRef.current?.getBoundingClientRect();
			if (!trigger) return;
			const menuWidth = 240;
			const gap = 8;
			const margin = 10;
			const viewportW = window.innerWidth || 1280;
			const viewportH = window.innerHeight || 720;
			const measuredH = menuRef.current?.getBoundingClientRect()?.height || 280;
			const spaceAbove = trigger.top - margin;
			const spaceBelow = viewportH - trigger.bottom - margin;
			const openUp = spaceAbove >= Math.min(measuredH, 220) || spaceAbove > spaceBelow;
			const maxHeight = Math.max(160, openUp ? spaceAbove - gap : spaceBelow - gap);
			let left = trigger.left;
			left = clamp(left, margin, viewportW - menuWidth - margin);
			const top = openUp
				? Math.max(margin, trigger.top - gap - Math.min(measuredH, maxHeight))
				: trigger.bottom + gap;
			setMenuPos({
				top,
				left,
				width: menuWidth,
				maxHeight,
				placement: openUp ? 'top' : 'bottom',
			});
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [visible, lists.length, loading, error]);

	const sendToColumn = async columnId => {
		if (!accountId || !conversationId || !messageIds.length || !columnId) return;
		setSendingId(columnId);
		setError('');
		try {
			await createBoardCardFromMessages(accountId, {
				conversationId,
				messageIds,
				columnId,
			});
			onSuccess?.();
			setHoverOpen(false);
			onClose?.();
		} catch (err) {
			setError(
				err?.response?.data?.message ||
					(ar ? 'فشل الإضافة للوحة' : 'Could not add to board'),
			);
		} finally {
			setSendingId(null);
		}
	};

	const menu = visible && mounted && menuPos
		? createPortal(
				<div
					ref={menuRef}
					role="menu"
					className="fixed z-[240] overflow-hidden rounded-xl border border-[#e6ebf1] bg-white shadow-[0_8px_24px_rgba(30,43,65,0.14)]"
					style={{
						top: menuPos.top,
						left: menuPos.left,
						width: menuPos.width,
						maxHeight: menuPos.maxHeight,
					}}
					onMouseEnter={openMenu}
					onMouseLeave={scheduleClose}
				>
					<div className="border-b border-[#edf0f4] px-3 py-2">
						<p className="text-[11px] font-bold text-[#182235]">
							{ar ? 'اختر العمود' : 'Choose column'}
						</p>
						<p className="mt-0.5 text-[10px] text-[#7b8799]">
							{ar
								? `${messageIds.length} رسالة → بطاقة واحدة`
								: `${messageIds.length} message(s) → one card`}
						</p>
					</div>
					<div className="overflow-y-auto p-1.5" style={{ maxHeight: Math.max(100, menuPos.maxHeight - 72) }}>
						{loading ? (
							<div className="flex items-center justify-center gap-2 py-6 text-slate-400">
								<Loader2 size={16} className="animate-spin" />
								<span className="text-[11px]">{ar ? 'جاري التحميل…' : 'Loading…'}</span>
							</div>
						) : error ? (
							<p className="px-2 py-4 text-center text-[11px] text-red-500">{error}</p>
						) : lists.length === 0 ? (
							<p className="px-2 py-4 text-center text-[11px] text-slate-500">
								{ar ? 'لا توجد أعمدة بعد' : 'No columns yet'}
							</p>
						) : (
							lists.map(list => {
								const accent = columnAccent(list.title);
								const busy = sendingId === list.id;
								return (
									<button
										key={list.id}
										type="button"
										role="menuitem"
										disabled={Boolean(sendingId)}
										onClick={() => void sendToColumn(list.id)}
										className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start transition-colors ${accent.soft} disabled:opacity-60`}
									>
										<span className={`h-8 w-1.5 shrink-0 rounded-full ${accent.bar}`} />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-[11px] font-bold text-[#182235]">
												{list.title}
											</span>
											<span className="block text-[9px] text-[#7b8799]">
												{(list.cards || []).length} {ar ? 'بطاقة' : 'cards'}
											</span>
										</span>
										{busy ? (
											<Loader2 size={14} className="animate-spin text-sky-600" />
										) : (
											<span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${accent.count}`}>
												{(list.cards || []).length}
											</span>
										)}
									</button>
								);
							})
						)}
					</div>
					{!loading && lists.length > 0 ? (
						<div className="border-t border-[#edf0f4] px-3 py-1.5 text-[9px] text-[#8a95a5]">
							{ar
								? 'مرّر فوق الزر لاختيار العمود قبل الإرسال'
								: 'Hover to pick a column before sending'}
						</div>
					) : null}
				</div>,
				document.body,
			)
		: null;

	return (
		<div
			ref={rootRef}
			className={`relative inline-flex ${anchorClassName}`}
			onMouseEnter={openMenu}
			onMouseLeave={scheduleClose}
		>
			<button
				type="button"
				disabled={!messageIds.length}
				className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-white disabled:opacity-50"
				aria-expanded={visible}
				onClick={event => {
					event.preventDefault();
					event.stopPropagation();
					if (visible) {
						setHoverOpen(false);
						onClose?.();
					} else {
						openMenu();
					}
				}}
			>
				<LayoutGrid size={12} />
				{triggerLabel || (ar ? 'إضافة للوحة المهام' : 'Add to tasks board')}
			</button>
			{menu}
		</div>
	);
}

export function BoardColumnPickerMenu({
	accountId,
	conversationId,
	messageIds = [],
	locale = 'en',
	onSuccess,
	className = '',
}) {
	const ar = locale === 'ar';
	const [lists, setLists] = useState([]);
	const [loading, setLoading] = useState(true);
	const [sendingId, setSendingId] = useState(null);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!accountId) return;
		let cancelled = false;
		setLoading(true);
		setError('');
		fetchWhatsAppBoard(accountId)
			.then(payload => {
				if (cancelled) return;
				const normalized = boardPayloadToUi(payload);
				setLists(normalized.lists || []);
			})
			.catch(err => {
				if (!cancelled) {
					setError(err?.response?.data?.message || 'Could not load columns');
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [accountId]);

	const sendToColumn = async columnId => {
		if (!accountId || !conversationId || !messageIds.length || !columnId) return;
		setSendingId(columnId);
		try {
			await createBoardCardFromMessages(accountId, {
				conversationId,
				messageIds,
				columnId,
			});
			onSuccess?.();
		} catch (err) {
			setError(err?.response?.data?.message || (ar ? 'فشل الإرسال' : 'Send failed'));
		} finally {
			setSendingId(null);
		}
	};

	return (
		<div className={`w-[220px] overflow-hidden rounded-xl border border-[#e6ebf1] bg-white shadow-lg ${className}`}>
			<div className="border-b border-[#edf0f4] px-3 py-2 text-[11px] font-bold text-[#182235]">
				{ar ? 'أرسل إلى عمود' : 'Send to column'}
			</div>
			<div className="max-h-52 overflow-y-auto p-1">
				{loading ? (
					<div className="flex justify-center py-4">
						<Loader2 size={16} className="animate-spin text-slate-400" />
					</div>
				) : error ? (
					<p className="px-2 py-3 text-center text-[11px] text-red-500">{error}</p>
				) : lists.length === 0 ? (
					<p className="px-2 py-3 text-center text-[11px] text-slate-500">
						{ar ? 'لا توجد أعمدة بعد' : 'No columns yet'}
					</p>
				) : (
					lists.map(list => {
						const accent = columnAccent(list.title);
						return (
							<button
								key={list.id}
								type="button"
								disabled={Boolean(sendingId)}
								onClick={() => void sendToColumn(list.id)}
								className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start ${accent.soft}`}
							>
								<span className={`h-7 w-1.5 rounded-full ${accent.bar}`} />
								<span className="flex-1 truncate text-[11px] font-semibold">{list.title}</span>
								{sendingId === list.id ? (
									<Loader2 size={12} className="animate-spin" />
								) : null}
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
