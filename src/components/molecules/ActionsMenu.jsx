'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { MoreHorizontal } from 'lucide-react';
import { readGmTokens } from '@/utils/gmTokens';
import './actions-menu.css';

const VIEWPORT_PAD = 10;
const GAP = 6;
const MIN_WIDTH = 240;

/**
 * Places the menu below the trigger when it fits, otherwise above (whichever side has more room),
 * and only scrolls when neither side can hold the full list.
 */
function placeMenu(trigger, menu, align) {
	const rect = trigger.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const width = Math.max(menu?.offsetWidth || MIN_WIDTH, MIN_WIDTH);
	const natural = menu?.scrollHeight || 320;
	const rtl = document.documentElement.dir === 'rtl';
	const alignEnd = align === 'right';

	let left = rtl ? (alignEnd ? rect.left : rect.right - width) : alignEnd ? rect.right - width : rect.left;
	left = Math.min(Math.max(VIEWPORT_PAD, left), vw - width - VIEWPORT_PAD);

	const below = vh - rect.bottom - GAP - VIEWPORT_PAD;
	const above = rect.top - GAP - VIEWPORT_PAD;
	const openUp = natural > below && above > below;
	const maxH = Math.max(160, Math.min(natural, openUp ? above : below));
	const top = openUp ? rect.top - GAP - maxH : rect.bottom + GAP;

	return { top, left, maxH, up: openUp };
}

export default function ActionsMenu({
	options = [],
	align = 'right',
	buttonClassName = '',
	menuClassName = '',
	ariaLabel = 'Row actions',
	header = null,
	onOpenChange,
}) {
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState(null);
	const [tokens, setTokens] = useState({});
	const btnRef = useRef(null);
	const menuRef = useRef(null);

	const visibleOptions = options.filter((o) => !o?.hide);

	const close = useCallback(() => {
		setOpen(false);
		setPos(null);
		onOpenChange?.(false);
	}, [onOpenChange]);

	const computePos = useCallback(() => {
		if (!btnRef.current || !menuRef.current) return;
		setPos(placeMenu(btnRef.current, menuRef.current, align));
	}, [align]);

	const toggle = () => {
		if (open) return close();
		setTokens(readGmTokens(btnRef.current));
		setOpen(true);
		onOpenChange?.(true);
	};

	useLayoutEffect(() => {
		if (open) computePos();
	}, [open, computePos, visibleOptions.length]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === 'Escape') {
				close();
				btnRef.current?.focus();
			}
		};
		const onDown = (e) => {
			if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
			close();
		};
		window.addEventListener('resize', computePos);
		window.addEventListener('scroll', computePos, true);
		window.addEventListener('keydown', onKey);
		document.addEventListener('mousedown', onDown);
		return () => {
			window.removeEventListener('resize', computePos);
			window.removeEventListener('scroll', computePos, true);
			window.removeEventListener('keydown', onKey);
			document.removeEventListener('mousedown', onDown);
		};
	}, [open, computePos, close]);

	useEffect(() => {
		if (open && pos) menuRef.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
		// Focus once, when the menu first becomes visible.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, Boolean(pos)]);

	const onMenuKeyDown = (e) => {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
		e.preventDefault();
		const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? [])];
		if (!items.length) return;
		if (e.key === 'Home') return items[0].focus();
		if (e.key === 'End') return items[items.length - 1].focus();
		const at = items.indexOf(document.activeElement);
		const step = e.key === 'ArrowDown' ? 1 : -1;
		const next = at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
		items[next].focus();
	};

	const startsNewGroup = (opt, i) => {
		if (i === 0) return false;
		const prev = visibleOptions[i - 1];
		if (opt.danger && !prev?.danger) return true;
		return opt.group != null && prev?.group != null && opt.group !== prev.group;
	};

	return (
		<>
			<button
				ref={btnRef}
				type="button"
				onClick={toggle}
				aria-label={ariaLabel}
				aria-expanded={open}
				aria-haspopup="menu"
				className={buttonClassName || 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50'}
			>
				<MoreHorizontal className={buttonClassName ? 'h-[18px] w-[18px]' : 'h-5 w-5 text-slate-700'} />
			</button>

			{open &&
				createPortal(
					<div
						ref={menuRef}
						role="menu"
						aria-label={ariaLabel}
						onKeyDown={onMenuKeyDown}
						className={`am-menu${pos ? ' is-ready' : ''}${pos?.up ? ' is-up' : ''}${align === 'right' ? '' : ' is-start'} ${menuClassName}`}
						style={{
							top: pos?.top ?? -9999,
							left: pos?.left ?? -9999,
							maxHeight: pos?.maxH,
							...tokens,
						}}
					>
						{header ? <div className="am-head">{header}</div> : null}
						{visibleOptions.length === 0 ? (
							<div className="am-empty">No actions</div>
						) : (
							visibleOptions.map((opt, i) => (
								<React.Fragment key={opt.key ?? i}>
									{startsNewGroup(opt, i) && <div className="am-sep" role="separator" />}
									<button
										type="button"
										role="menuitem"
										disabled={opt.disabled}
										onClick={() => {
											if (opt.disabled) return;
											close();
											opt.onClick?.();
										}}
										className={`am-item${opt.danger ? ' is-danger' : ''}`}
									>
										{opt.icon ? <span className="am-item__icon">{opt.icon}</span> : null}
										<span className="am-item__label">{opt.label}</span>
										{opt.hint ? <span className="am-item__hint">{opt.hint}</span> : null}
									</button>
								</React.Fragment>
							))
						)}
					</div>,
					document.body,
				)}
		</>
	);
}

ActionsMenu.propTypes = {
	options: PropTypes.arrayOf(
		PropTypes.shape({
			key: PropTypes.string,
			icon: PropTypes.node,
			label: PropTypes.string.isRequired,
			hint: PropTypes.node,
			group: PropTypes.string,
			onClick: PropTypes.func,
			danger: PropTypes.bool,
			disabled: PropTypes.bool,
			hide: PropTypes.bool,
		}),
	),
	align: PropTypes.oneOf(['right', 'left']),
	buttonClassName: PropTypes.string,
	menuClassName: PropTypes.string,
	ariaLabel: PropTypes.string,
	header: PropTypes.node,
	onOpenChange: PropTypes.func,
};
