'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Smartphone } from 'lucide-react';

/** Overlay only when the phone connection actually dropped and the user must retry. */
export function PhoneSyncGate({
	open,
	progress = 0,
	stage = '',
	phoneClosed = false,
	labels,
	locale = 'en',
	onRetry,
	onDismiss,
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return undefined;
		const onBeforeUnload = event => {
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload);
			document.body.style.overflow = prevOverflow;
		};
	}, [open]);

	if (!open || !mounted) return null;

	const pct = Math.max(1, Math.min(100, Number(progress) || 1));
	const stageHint =
		stage === 'prefetch_history'
			? locale === 'ar'
				? 'جاري تجهيز أحدث الرسائل…'
				: 'Warming recent message history…'
			: stage === 'phone_wait'
				? locale === 'ar'
					? 'جارٍ إعادة اتصال الجهاز المرتبط…'
					: 'Reconnecting the linked device…'
			: stage === 'fetching_chats' || stage === 'chats' || (pct >= 25 && pct <= 45)
				? labels.syncingChatsFetching || labels.syncingChats
				: labels.keepPhoneOpenStage || labels.syncingChats;

	return createPortal(
		<div
			className={`wa-phone-sync-gate${phoneClosed ? ' is-phone-closed' : ''}`}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="wa-phone-sync-title"
			aria-describedby="wa-phone-sync-desc"
		>
			<div className="wa-phone-sync-gate__backdrop" />
			<div className="wa-phone-sync-gate__card">
				<div className="wa-phone-sync-gate__phone" aria-hidden="true">
					<div className="wa-phone-sync-gate__phone-bezel">
						<div className="wa-phone-sync-gate__phone-notch" />
						<div className="wa-phone-sync-gate__phone-screen">
							<div className="wa-phone-sync-gate__wa-mark">
								<svg viewBox="0 0 24 24" width="36" height="36" fill="none" aria-hidden="true">
									<path
										d="M12 2.2C6.6 2.2 2.2 6.5 2.2 11.8c0 1.9.5 3.7 1.5 5.3L2 22l5.1-1.6c1.5.8 3.2 1.3 4.9 1.3 5.4 0 9.8-4.3 9.8-9.7S17.4 2.2 12 2.2Z"
										fill="#25D366"
									/>
									<path
										d="M16.6 14.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.4 3.8 3.4 2.2.9 2.2.6 2.6.6.4 0 1.3-.5 1.4-1 .2-.5.2-.9.1-1Z"
										fill="#fff"
									/>
								</svg>
							</div>
							{!phoneClosed && (
								<div className="wa-phone-sync-gate__pulse-rings">
									<span />
									<span />
									<span />
								</div>
							)}
							{phoneClosed && (
								<div className="wa-phone-sync-gate__closed-badge">!</div>
							)}
						</div>
					</div>
					<div className="wa-phone-sync-gate__signal">
						<span />
						<span />
						<span />
					</div>
				</div>

				<h2 id="wa-phone-sync-title" className="wa-phone-sync-gate__title">
					{phoneClosed ? labels.phoneClosedTitle : labels.keepPhoneOpenTitle}
				</h2>
				<p id="wa-phone-sync-desc" className="wa-phone-sync-gate__body">
					{phoneClosed ? labels.phoneClosedBody : labels.keepPhoneOpenBody}
				</p>

				{!phoneClosed && (
					<div className="wa-phone-sync-gate__warn">
						<Smartphone size={16} className="shrink-0" />
						<span>{labels.keepPhoneOpenDoNotClose}</span>
					</div>
				)}

				{!phoneClosed ? (
					<div className="wa-phone-sync-gate__progress-wrap">
						<div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
							<span className="inline-flex items-center gap-1.5">
								<Loader2 size={12} className="animate-spin text-[#00A884]" />
								{stageHint}
							</span>
							<span className="tabular-nums text-slate-700 dark:text-slate-200">{pct}%</span>
						</div>
						<div className="wa-phone-sync-gate__track">
							<div className="wa-phone-sync-gate__fill" style={{ width: `${pct}%` }} />
						</div>
					</div>
				) : (
					<div className="wa-phone-sync-gate__actions">
						<button type="button" className="wa-phone-sync-gate__btn-primary" onClick={onRetry}>
							{labels.phoneClosedRetry}
						</button>
						<button type="button" className="wa-phone-sync-gate__btn-ghost" onClick={onDismiss}>
							{labels.phoneClosedDismiss}
						</button>
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}
