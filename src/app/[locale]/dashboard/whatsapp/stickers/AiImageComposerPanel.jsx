'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AiGenerateForm from './AiGenerateForm';

function computePanelPosition(anchorRect) {
	const margin = 12;
	const viewportW = window.innerWidth || 1280;
	const viewportH = window.innerHeight || 720;
	if (viewportW < 769) {
		return { mode: 'sheet' };
	}
	const width = Math.min(720, viewportW - margin * 2);
	const height = Math.min(760, viewportH - margin * 2);
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

export default function AiImageComposerPanel({
	open,
	onClose,
	onSendImage,
	accountId,
	locale = 'en',
	anchorRef,
	disabled = false,
}) {
	const ar = locale === 'ar';
	const [position, setPosition] = useState(null);
	const panelRef = useRef(null);

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
			aria-label={ar ? 'توليد صورة بالذكاء الاصطناعي' : 'AI image generation'}
			className={
				position?.mode === 'sheet'
					? 'wa-sticker-panel fixed inset-x-0 bottom-[88px] z-[1400] mx-auto flex h-[82dvh] max-w-[640px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.12)] dark:border-slate-700 dark:bg-slate-900'
					: 'wa-sticker-panel flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(11,20,26,0.18)] dark:border-slate-700 dark:bg-slate-900'
			}
			style={style}
		>
			<div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 px-3 dark:border-slate-800">
				<p className="text-sm font-bold text-slate-800 dark:text-slate-100">
					{ar ? 'صورة AI' : 'AI Image'}
				</p>
				<button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center text-[#667781]">
					<X size={21} />
				</button>
			</div>
			<AiGenerateForm
				kind="image"
				accountId={accountId}
				locale={locale}
				disabled={disabled || !accountId}
				onUse={async file => {
					const sent = await onSendImage?.(file);
					if (sent !== false) onClose?.();
				}}
			/>
		</section>,
		document.body,
	);
}
