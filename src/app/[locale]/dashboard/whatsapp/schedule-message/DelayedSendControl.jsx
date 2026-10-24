'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Loader2, RefreshCw, Send, Timer, X } from 'lucide-react';
import { DELAYED_SEND_MAX_MINUTES, formatDelayDuration, normalizeDelayedSendPrefs } from './delayed-send';
import './delayed-send.css';

const copy = {
	en: {
		button: 'Delay sending',
		buttonOn: 'Delay is on: Enter schedules the message',
		title: 'Send later',
		none: 'Send right away',
		noneHint: 'No delay',
		after: 'After a set time',
		custom: 'Wait',
		hoursShort: 'h',
		minutesShort: 'm',
		reply: 'Same as their reply time',
		replyHint: 'How fast they answer',
		repliedAfter: 'They replied after {time}',
		adjust: 'Adjust',
		minutes: 'minutes',
		extraOn: 'Extra +{time}',
		remove: 'Remove',
		noReply: 'They have not replied yet.',
		noMine: 'No message of yours before their reply.',
		loadingGap: 'Measuring…',
		gapFailed: 'Could not measure.',
		retry: 'Retry',
		willSend: 'Sends {when}',
		inTime: 'in {time}',
		fromNow: 'counted from now',
		raised: 'shortest delay is 1 minute',
		off: 'Messages send right away.',
		note: 'Press Enter to schedule. Photos and @mentions send right away.',
		close: 'Close',
		turnOff: 'Turn delay off',
		edit: 'Change delay',
		sendNow: 'Send now',
		sendNowHint: 'Send this message now without the delay',
	},
	ar: {
		button: 'تأجيل الإرسال',
		buttonOn: 'التأجيل شغّال: Enter بيجدول الرسالة',
		title: 'إرسال مؤجّل',
		none: 'ابعت على طول',
		noneHint: 'من غير تأجيل',
		after: 'بعد مدة',
		custom: 'استنى',
		hoursShort: 'س',
		minutesShort: 'د',
		reply: 'زي وقت ردّه',
		replyHint: 'حسب سرعة ردّه',
		repliedAfter: 'ردّ عليك بعد {time}',
		adjust: 'زوّد / قلّل',
		minutes: 'دقيقة',
		extraOn: 'وقت إضافي +{time}',
		remove: 'شيله',
		noReply: 'لسه مارد عليك.',
		noMine: 'مفيش رسالة منك قبل ردّه.',
		loadingGap: 'بنحسب…',
		gapFailed: 'ماقدرناش نحسبها.',
		retry: 'حاول تاني',
		willSend: 'هتتبعت {when}',
		inTime: 'بعد {time}',
		fromNow: 'محسوبة من دلوقتي',
		raised: 'أقل مدة دقيقة',
		off: 'الرسايل بتتبعت على طول.',
		note: 'اكتب واضغط Enter وهتتجدول. الصور والمنشن بيتبعتوا فورًا.',
		close: 'إغلاق',
		turnOff: 'إيقاف التأجيل',
		edit: 'تغيير التأجيل',
		sendNow: 'ابعت دلوقتي',
		sendNowHint: 'ابعت الرسالة دي حالًا من غير تأجيل',
	},
};

const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));

const formatClock = (ms, ar) =>
	new Date(ms).toLocaleTimeString(ar ? 'ar-EG' : undefined, { hour: 'numeric', minute: '2-digit' });

export function formatSendWhen(ms, ar, now = Date.now()) {
	const date = new Date(ms);
	const sameDay = new Date(now).toDateString() === date.toDateString();
	return sameDay
		? formatClock(ms, ar)
		: date.toLocaleString(ar ? 'ar-EG' : undefined, {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			});
}

function popoverStyle(anchor) {
	const margin = 10;
	const vw = window.innerWidth || 1024;
	const vh = window.innerHeight || 768;
	const width = Math.min(300, vw - margin * 2);
	const rect = anchor?.getBoundingClientRect?.();
	if (!rect || vw <= 768) return { left: margin, right: margin, bottom: margin, maxHeight: vh - margin * 2 };
	const left = Math.min(Math.max(margin, rect.right - width), vw - width - margin);
	const bottom = Math.max(margin, vh - rect.top + 8);
	return { left, width, bottom, maxHeight: Math.max(240, rect.top - 8 - margin) };
}

const ARABIC_DIGITS = /[٠-٩]/g;

/**
 * A number you type (no −/+): the box keeps what you are typing until it is a valid number,
 * Arabic digits count too, and leaving it shows the value actually in use.
 */
function TimeInput({ value, min, max, suffix, label, onChange }) {
	const [draft, setDraft] = useState(String(value));
	const [focused, setFocused] = useState(false);
	useEffect(() => {
		if (!focused) setDraft(String(value));
	}, [value, focused]);
	const typed = raw => {
		const clean = String(raw)
			.replace(ARABIC_DIGITS, d => String(d.charCodeAt(0) - 0x0660))
			.replace(min < 0 ? /[^\d-]/g : /\D/g, '')
			.slice(0, 5);
		setDraft(clean);
		if (clean === '' || clean === '-') return;
		const n = Math.round(Number(clean));
		if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
	};
	return (
		<label className="wa-dsend__num">
			<input
				type="text"
				inputMode="numeric"
				dir="ltr"
				value={draft}
				aria-label={label}
				onFocus={event => {
					setFocused(true);
					event.target.select();
				}}
				onBlur={() => {
					setFocused(false);
					setDraft(String(value));
				}}
				onChange={event => typed(event.target.value)}
			/>
			{suffix ? <span className="wa-dsend__num-suffix">{suffix}</span> : null}
		</label>
	);
}

/** One choice in the list: a radio row; its extra controls show only while it is picked. */
function Choice({ checked, title, hint, onPick, children }) {
	return (
		<div className={`wa-dsend__choice${checked ? ' is-checked' : ''}`}>
			<button type="button" role="radio" aria-checked={checked} className="wa-dsend__choice-head" onClick={onPick}>
				<span className="wa-dsend__radio" aria-hidden="true">
					{checked ? <Check size={11} strokeWidth={3.2} /> : null}
				</span>
				<span className="wa-dsend__choice-text">
					<span className="wa-dsend__choice-title">{title}</span>
					{hint ? <span className="wa-dsend__choice-hint">{hint}</span> : null}
				</span>
			</button>
			{checked && children ? <div className="wa-dsend__choice-body">{children}</div> : null}
		</div>
	);
}

export function DelayedSendButton({ ar, enabled, disabled, onClick, buttonRef, className = '' }) {
	const t = ar ? copy.ar : copy.en;
	return (
		<button
			ref={buttonRef}
			type="button"
			disabled={disabled}
			aria-pressed={enabled}
			title={enabled ? t.buttonOn : t.button}
			aria-label={enabled ? t.buttonOn : t.button}
			onClick={onClick}
			className={`wa-input-action wa-dsend__button${enabled ? ' is-on' : ''} ${className}`}
		>
			<Timer size={18} strokeWidth={2} />
		</button>
	);
}

/**
 * Small pill above the composer while the delay is on: when the next message goes out.
 * Tap it to change the delay; "Send now" skips the delay for the message being typed.
 */
export function DelayedSendBanner({ ar, plan, gapState, now, onEdit, onTurnOff, onSendNow, canSendNow }) {
	const t = ar ? copy.ar : copy.en;
	const reason = plan?.ok ? '' : plan?.reason;
	const problem = plan?.ok
		? ''
		: gapState?.error
			? t.gapFailed
			: reason === 'loading' || gapState?.loading
				? t.loadingGap
				: reason === 'no_my_message'
					? t.noMine
					: t.noReply;
	return (
		<div className="wa-dsend__bar" dir={ar ? 'rtl' : 'ltr'}>
			<div className={`wa-dsend__pill${plan?.ok ? '' : ' is-warning'}`} role="status">
				<button type="button" className="wa-dsend__pill-main" onClick={onEdit} title={t.edit}>
					{plan?.ok ? <Timer size={14} strokeWidth={2.2} aria-hidden="true" /> : <AlertCircle size={14} strokeWidth={2.2} aria-hidden="true" />}
					{plan?.ok ? (
						<>
							<b>{fill(t.willSend, { when: formatSendWhen(plan.sendAt, ar, now) })}</b>
							<span className="wa-dsend__pill-sub">{fill(t.inTime, { time: formatDelayDuration(plan.sendAt - now, ar) })}</span>
						</>
					) : (
						<span>{problem}</span>
					)}
				</button>
				<button type="button" className="wa-dsend__pill-x" onClick={onTurnOff} title={t.turnOff} aria-label={t.turnOff}>
					<X size={13} strokeWidth={2.4} />
				</button>
			</div>
			{onSendNow ? (
				<button
					type="button"
					className="wa-dsend__send-now"
					onClick={onSendNow}
					disabled={!canSendNow}
					title={t.sendNowHint}
					aria-label={t.sendNowHint}
				>
					<Send size={13} strokeWidth={2.2} className="wa-dsend__send-now-icon" aria-hidden="true" />
					<span>{t.sendNow}</span>
				</button>
			) : null}
		</div>
	);
}

export default function DelayedSendPopover({
	open,
	anchorEl,
	ar,
	enabled,
	onEnabledChange,
	prefs,
	onPrefsChange,
	gapState,
	onRetryGap,
	plan,
	now,
	onClose,
}) {
	const t = ar ? copy.ar : copy.en;
	const panelRef = useRef(null);
	const [style, setStyle] = useState(null);
	const p = normalizeDelayedSendPrefs(prefs);

	useEffect(() => {
		if (!open) return undefined;
		const place = () => setStyle(popoverStyle(anchorEl));
		place();
		const onKey = event => {
			if (event.key === 'Escape') onClose();
		};
		const onPointer = event => {
			if (panelRef.current?.contains(event.target)) return;
			if (anchorEl && (anchorEl === event.target || anchorEl.contains?.(event.target))) return;
			onClose();
		};
		window.addEventListener('resize', place);
		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onPointer);
		return () => {
			window.removeEventListener('resize', place);
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onPointer);
		};
	}, [open, anchorEl, onClose]);

	if (!open || !style || typeof document === 'undefined') return null;

	// Picking a delay is what turns it on; "Send right away" turns it off. No separate switch.
	const choose = patch => {
		onPrefsChange({ ...p, ...patch });
		if (!enabled) onEnabledChange(true);
	};
	const picked = !enabled ? 'none' : p.method;
	const gap = gapState?.data;
	const customHours = Math.floor(p.customMinutes / 60);
	const customRest = p.customMinutes % 60;

	let replyHint = t.replyHint;
	if (picked === 'reply') {
		if (gapState?.loading && !gap) replyHint = t.loadingGap;
		else if (gap?.ok) replyHint = fill(t.repliedAfter, { time: formatDelayDuration(gap.gapMs, ar) });
	}

	return createPortal(
		<div ref={panelRef} role="dialog" aria-labelledby="wa-dsend-title" dir={ar ? 'rtl' : 'ltr'} className="wa-dsend" style={style}>
			<div className="wa-dsend__head">
				<Timer size={15} strokeWidth={2.2} className="wa-dsend__head-icon" aria-hidden="true" />
				<h3 id="wa-dsend-title">{t.title}</h3>
				<button type="button" className="wa-ui-icon-btn wa-ui-icon-btn--sm" onClick={onClose} aria-label={t.close} title={t.close}>
					<X size={16} strokeWidth={2} />
				</button>
			</div>

			<div className="wa-dsend__body" role="radiogroup" aria-labelledby="wa-dsend-title">
				<Choice checked={picked === 'none'} title={t.none} hint={t.noneHint} onPick={() => onEnabledChange(false)} />

				<Choice
					checked={picked === 'custom'}
					title={t.after}
					hint={picked === 'custom' ? null : formatDelayDuration(p.customMinutes * 60_000, ar)}
					onPick={() => choose({ method: 'custom' })}
				>
					<div className="wa-dsend__row">
						<span className="wa-dsend__label">{t.custom}</span>
						<TimeInput
							label={t.hoursShort}
							suffix={t.hoursShort}
							value={customHours}
							min={0}
							max={Math.floor(DELAYED_SEND_MAX_MINUTES / 60)}
							onChange={hours => choose({ method: 'custom', customMinutes: hours * 60 + customRest })}
						/>
						<TimeInput
							label={t.minutesShort}
							suffix={t.minutesShort}
							value={customRest}
							min={0}
							max={59}
							onChange={minutes => choose({ method: 'custom', customMinutes: customHours * 60 + minutes })}
						/>
					</div>
				</Choice>

				<Choice checked={picked === 'reply'} title={t.reply} hint={replyHint} onPick={() => choose({ method: 'reply' })}>
					{gapState?.error ? (
						<p className="wa-dsend__warn">
							<AlertCircle size={13} aria-hidden="true" /> {t.gapFailed}
							<button type="button" className="wa-dsend__link" onClick={onRetryGap}>
								<RefreshCw size={12} aria-hidden="true" /> {t.retry}
							</button>
						</p>
					) : gap && !gap.ok ? (
						<p className="wa-dsend__warn">
							<AlertCircle size={13} aria-hidden="true" /> {gap.reason === 'no_my_message' ? t.noMine : t.noReply}
						</p>
					) : gapState?.loading && !gap ? (
						<p className="wa-dsend__muted">
							<Loader2 size={13} className="animate-spin" aria-hidden="true" /> {t.loadingGap}
						</p>
					) : (
						<div className="wa-dsend__row">
							<span className="wa-dsend__label">{t.adjust}</span>
							<TimeInput
								label={t.minutes}
								suffix={t.minutesShort}
								value={p.adjustMinutes}
								min={-DELAYED_SEND_MAX_MINUTES}
								max={DELAYED_SEND_MAX_MINUTES}
								onChange={minutes => choose({ method: 'reply', adjustMinutes: minutes })}
							/>
						</div>
					)}
				</Choice>

				{enabled && p.extraMinutes ? (
					<p className="wa-dsend__extra">
						{fill(t.extraOn, { time: formatDelayDuration(p.extraMinutes * 60_000, ar) })}
						<button type="button" className="wa-dsend__link" onClick={() => onPrefsChange({ ...p, extraMinutes: 0 })}>
							{t.remove}
						</button>
					</p>
				) : null}
			</div>

			<div className="wa-dsend__foot" aria-live="polite">
				{!enabled ? (
					<p className="wa-dsend__result is-off">{t.off}</p>
				) : plan?.ok ? (
					<p className="wa-dsend__result">
						<b>{fill(t.willSend, { when: formatSendWhen(plan.sendAt, ar, now) })}</b>
						<span>
							{fill(t.inTime, { time: formatDelayDuration(plan.sendAt - now, ar) })}
							{plan.fromNow ? ` · ${t.fromNow}` : ''}
							{plan.raisedToMin ? ` · ${t.raised}` : ''}
						</span>
					</p>
				) : null}
				{enabled ? <p className="wa-dsend__note">{t.note}</p> : null}
			</div>
		</div>,
		document.body,
	);
}
