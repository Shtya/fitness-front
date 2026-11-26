'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Users } from 'lucide-react';

function initials(name) {
	const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

const ROLE_LABELS = {
	admin: ['أدمن', 'Admin'],
	super_admin: ['أدمن', 'Admin'],
	coach: ['كوتش', 'Coach'],
	user: ['موظف', 'Staff'],
};

/**
 * Who on the team has WhatsApp open right now (admins only). A small pill in the chat list
 * header: the number online; hover or click lists them with how many open chats they own.
 */
export default function TeamPresenceButton({ staff, ar, assignedCounts, onViewAs = null, canViewAs = member => String(member?.role || '').toLowerCase() !== 'super_admin' }) {
	const [open, setOpen] = useState(false);
	const [place, setPlace] = useState(null);
	const rootRef = useRef(null);
	const panelRef = useRef(null);
	const hoverTimer = useRef(0);
	const count = staff.length;

	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			if (!rootRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
		};
		const onKey = event => event.key === 'Escape' && setOpen(false);
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	// The panel is drawn on <body> (the chat list header sits under the list), right below the
	// pill and opening towards the page, never off its edge.
	useEffect(() => {
		if (!open) return undefined;
		const update = () => {
			const rect = rootRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = 300;
			const margin = 8;
			const vw = window.innerWidth || 1280;
			let left = ar ? rect.right - width : rect.left;
			left = Math.max(margin, Math.min(left, vw - width - margin));
			setPlace({ top: rect.bottom + 8, left, width });
		};
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, ar]);

	const openSoon = () => {
		window.clearTimeout(hoverTimer.current);
		hoverTimer.current = window.setTimeout(() => setOpen(true), 180);
	};
	const closeSoon = () => {
		window.clearTimeout(hoverTimer.current);
		hoverTimer.current = window.setTimeout(() => setOpen(false), 220);
	};

	return (
		<div ref={rootRef} className="wa-team relative" onMouseEnter={openSoon} onMouseLeave={closeSoon}>
			<button
				type="button"
				onClick={() => setOpen(current => !current)}
				aria-expanded={open}
				aria-label={ar ? `الفريق المتصل دلوقتي: ${count}` : `Team online now: ${count}`}
				title={ar ? 'مين من الفريق فاتح واتساب' : 'Who on the team has WhatsApp open'}
				className={`wa-team__pill ${count ? 'is-live' : ''}`}
			>
				<Users size={15} strokeWidth={2.1} aria-hidden="true" />
				<span className="wa-team__count">{count}</span>
				{count ? <span className="wa-team__dot" aria-hidden="true" /> : null}
			</button>

			{open && place && typeof document !== 'undefined' ? createPortal(
				<div
					ref={panelRef}
					className="wa-team__panel"
					role="dialog"
					aria-label={ar ? 'الفريق المتصل' : 'Team online'}
					dir={ar ? 'rtl' : 'ltr'}
					style={{ top: place.top, left: place.left, width: place.width }}
					onMouseEnter={openSoon}
					onMouseLeave={closeSoon}
				>
					<p className="wa-team__head">
						{ar ? 'فاتحين واتساب دلوقتي' : 'Have WhatsApp open now'}
						<span>{count}</span>
					</p>
					{count ? (
						<ul className="wa-team__list">
							{staff.map(member => {
								const owned = assignedCounts?.get(member.userId) || 0;
								const role = ROLE_LABELS[String(member.role || '').toLowerCase()];
								return (
									<li key={member.userId} className="wa-team__row">
										<span className="wa-team__avatar">
											{initials(member.name)}
											<span className="wa-team__avatar-dot" aria-hidden="true" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="wa-team__name" dir="auto">
												{member.name}
											</span>
											<span className="wa-team__meta">
												{role ? (ar ? role[0] : role[1]) : member.role || ''}
												{owned ? ` · ${ar ? `${owned} شات متسند ليه` : `${owned} assigned chat${owned > 1 ? 's' : ''}`}` : ''}
											</span>
										</span>
										{onViewAs && canViewAs(member) ? (
											<button
												type="button"
												className="wa-team__view-as"
												onClick={() => {
													setOpen(false);
													onViewAs(member);
												}}
												title={ar ? `ادخل بحساب ${member.name} وشوف اللي بيشوفه` : `Sign in as ${member.name} and see what they see`}
											>
												<Eye size={13} strokeWidth={2.2} aria-hidden="true" />
												{ar ? 'ادخل كـ' : 'View as'}
											</button>
										) : (
											<span className="wa-team__live">{ar ? 'متصل' : 'Online'}</span>
										)}
									</li>
								);
							})}
						</ul>
					) : (
						<p className="wa-team__empty">
							{ar ? 'محدش من الفريق فاتح واتساب دلوقتي.' : 'Nobody on the team has WhatsApp open right now.'}
						</p>
					)}
					<p className="wa-team__foot">
						{ar
							? 'متصل = الصفحة مفتوحة قدامه دلوقتي (بتتحدث كل ١٠ ثواني).'
							: 'Online = WhatsApp is open in front of them now (updates every 10 s).'}
					</p>
				</div>,
				document.body,
			) : null}
		</div>
	);
}
