'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { Check, Eye, EyeOff, MessageSquareText, MousePointer2, PanelLeft, Pin } from 'lucide-react';

const extraCopy = {
	en: {
		what: 'What to blur',
		reveal: 'Revealing',
		on: 'On',
		off: 'Off',
		statusOff: 'Chats are visible',
		statusNothing: 'Pick what to hide below',
		statusList: 'Hiding the chat list',
		statusThread: 'Hiding the open chat',
		statusBoth: 'Hiding the chat list and the open chat',
		offHint: 'Choosing an option turns blur on.',
		needsHover: 'Needs “Reveal on hover”',
	},
	ar: {
		what: 'ما الذي يتم تمويهه',
		reveal: 'الإظهار',
		on: 'مفعّل',
		off: 'متوقف',
		statusOff: 'المحادثات ظاهرة',
		statusNothing: 'اختر ما تريد إخفاءه بالأسفل',
		statusList: 'إخفاء قائمة المحادثات',
		statusThread: 'إخفاء المحادثة المفتوحة',
		statusBoth: 'إخفاء القائمة والمحادثة المفتوحة',
		offHint: 'اختيار أي خيار يفعّل التمويه.',
		needsHover: 'يتطلب «الإظهار عند المرور»',
	},
};

function OptionRow({ id, checked, label, hint, icon: Icon, onChange, disabled = false, nested = false }) {
	return (
		<label
			htmlFor={id}
			className={`wa-ui-blur__option${checked ? ' is-checked' : ''}${disabled ? ' is-disabled' : ''}${
				nested ? ' is-nested' : ''
			}`}
		>
			<span className="wa-ui-blur__option-icon" aria-hidden="true">
				<Icon size={17} strokeWidth={1.9} />
			</span>
			<span className="wa-ui-blur__option-copy">
				<span className="wa-ui-blur__option-label">{label}</span>
				{hint ? <span className="wa-ui-blur__option-hint">{hint}</span> : null}
			</span>
			<input
				id={id}
				type="checkbox"
				className="sr-only"
				checked={checked}
				disabled={disabled}
				onChange={event => onChange(event.target.checked)}
			/>
			<span className="wa-ui-blur__check" aria-hidden="true">
				{checked ? <Check size={13} strokeWidth={3} /> : null}
			</span>
		</label>
	);
}

export default function WhatsAppPrivacyBlurControl({ value, onChange, labels }) {
	const locale = useLocale();
	const x = extraCopy[String(locale).startsWith('ar') ? 'ar' : 'en'];
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const switchRef = useRef(null);
	const enabled = Boolean(value?.enabled);
	const list = Boolean(value?.list);
	const thread = Boolean(value?.thread);
	const hoverReveal = Boolean(value?.hoverReveal);
	const persistReveal = Boolean(value?.persistReveal);

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = Math.min(320, window.innerWidth - 16);
			const rtl = document.documentElement.dir === 'rtl';
			const preferred = rtl ? rect.left : rect.right - width;
			const left = Math.min(Math.max(8, preferred), window.innerWidth - width - 8);
			setPosition({ top: rect.bottom + 8, left, width });
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
				setOpen(false);
			}
		};
		const closeOnEscape = event => {
			if (event.key !== 'Escape') return;
			setOpen(false);
			buttonRef.current?.focus();
		};
		const focusTimer = window.setTimeout(() => switchRef.current?.focus(), 30);
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			window.clearTimeout(focusTimer);
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open]);

	const patch = next => onChange({ ...value, ...next });
	const status = !enabled
		? x.statusOff
		: list && thread
			? x.statusBoth
			: list
				? x.statusList
				: thread
					? x.statusThread
					: x.statusNothing;

	return (
		<div ref={rootRef} className="wa-privacy-blur-control relative shrink-0">
			<button
				ref={buttonRef}
				type="button"
				aria-pressed={enabled}
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-label={labels.blurOptions}
				title={labels.blurToggleHint}
				onClick={() => setOpen(current => !current)}
				className={`wa-btn-3d wa-privacy-blur-toggle rounded-full text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
					enabled ? 'is-active' : ''
				} ${open ? 'is-open' : ''}`}
			>
				{enabled ? (
					<EyeOff size={18} strokeWidth={2.25} absoluteStrokeWidth />
				) : (
					<Eye size={18} strokeWidth={2.25} absoluteStrokeWidth />
				)}
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="dialog"
						aria-labelledby="wa-blur-title"
						dir={String(locale).startsWith('ar') ? 'rtl' : 'ltr'}
						className="wa-ui-blur"
						style={position}
					>
						<div className={`wa-ui-blur__head${enabled ? ' is-on' : ''}`}>
							<span className="wa-ui-blur__glyph" aria-hidden="true">
								{enabled ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
							</span>
							<div className="wa-ui-blur__head-copy">
								<p id="wa-blur-title" className="wa-ui-blur__title">
									{labels.blurTitle}
								</p>
								<p className="wa-ui-blur__status" aria-live="polite">
									{status}
								</p>
							</div>
							<button
								ref={switchRef}
								type="button"
								role="switch"
								aria-checked={enabled}
								aria-label={labels.blurToggle}
								onClick={() => patch({ enabled: !enabled })}
								className="wa-ui-switch"
							>
								<span className="wa-ui-switch__thumb" />
							</button>
						</div>

						<div className={`wa-ui-blur__body${enabled ? '' : ' is-off'}`}>
							<p className="wa-ui-blur__section">{x.what}</p>
							<OptionRow
								id="wa-blur-list"
								icon={PanelLeft}
								checked={list}
								label={labels.blurList}
								hint={labels.blurListHint}
								onChange={next => patch({ list: next, enabled: true })}
							/>
							<OptionRow
								id="wa-blur-thread"
								icon={MessageSquareText}
								checked={thread}
								label={labels.blurThread}
								hint={labels.blurThreadHint}
								onChange={next => patch({ thread: next, enabled: true })}
							/>

							<p className="wa-ui-blur__section">{x.reveal}</p>
							<OptionRow
								id="wa-blur-hover"
								icon={MousePointer2}
								checked={hoverReveal}
								label={labels.blurHover}
								hint={labels.blurHoverHint}
								onChange={next => patch({ hoverReveal: next, enabled: true })}
							/>
							<OptionRow
								id="wa-blur-persist"
								icon={Pin}
								nested
								checked={persistReveal}
								// Only meaningful while hover-reveal is on; still uncheckable if it was left on.
								disabled={!hoverReveal && !persistReveal}
								label={labels.blurPersist}
								hint={!hoverReveal ? x.needsHover : labels.blurPersistHint}
								onChange={next => patch({ persistReveal: next, enabled: true })}
							/>
							{!enabled ? <p className="wa-ui-blur__footnote">{x.offHint}</p> : null}
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
