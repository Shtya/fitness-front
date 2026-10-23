'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Loader2, Minus, Plus, RefreshCw, Send, SlidersHorizontal, Timer, X } from 'lucide-react';
import { DELAYED_SEND_MAX_MINUTES, formatDelayDuration, normalizeDelayedSendPrefs } from './delayed-send';
import './delayed-send.css';

const copy = {
	en: {
		button: 'Delay sending',
		buttonOn: 'Delay is on: Enter schedules the message',
		title: 'Delayed reply',
		toggle: 'Delay my messages in this chat',
		custom: 'Fixed time',
		reply: 'Like their reply',
		other: 'Other',
		hoursShort: 'h',
		minutesShort: 'm',
		repliedAfter: 'They replied after',
		adjust: 'Adjust',
		minutes: 'minutes',
		extraOn: 'Extra +{time}',
		remove: 'Remove',
		noReply: 'They have not replied yet, so there is no reply time to copy.',
		noMine: 'There is no message from you before their reply to measure from.',
		loadingGap: 'Measuring the reply time…',
		gapFailed: 'Could not measure the reply time.',
		retry: 'Try again',
		willSend: 'Sends at {when}',
		inTime: 'in {time}',
		fromNow: 'counted from now',
		raised: 'shortest delay is 1 minute',
		off: 'Off: messages send right away.',
		note: 'Enter schedules text messages. Photos and @mentions send right away.',
		close: 'Close',
		turnOff: 'Turn delay off',
		edit: 'Change delay',
		sendNow: 'Send now',
		sendNowHint: 'Send this message now without the delay',
		delayOn: 'Delay on',
	},
	ar: {
		button: 'تأجيل الإرسال',
		buttonOn: 'التأجيل شغّال: Enter بيجدول الرسالة',
		title: 'رد مؤجّل',
		toggle: 'أجّل رسايلي في الشات ده',
		custom: 'مدة ثابتة',
		reply: 'زي وقت ردّه',
		other: 'مدة تانية',
		hoursShort: 'س',
		minutesShort: 'د',
		repliedAfter: 'ردّ عليك بعد',
		adjust: 'زوّد / قلّل',
		minutes: 'دقيقة',
		extraOn: 'وقت إضافي +{time}',
		remove: 'شيله',
		noReply: 'لسه مارد، فمفيش وقت رد نحسب منه.',
		noMine: 'مفيش رسالة منك قبل ردّه نحسب منها.',
		loadingGap: 'بنحسب وقت الرد…',
		gapFailed: 'ماقدرناش نحسب وقت الرد.',
		retry: 'حاول تاني',
		willSend: 'هتتبعت {when}',
		inTime: 'بعد {time}',
		fromNow: 'محسوبة من دلوقتي',
		raised: 'أقل مدة دقيقة',
		off: 'مقفول: الرسايل بتتبعت على طول.',
		note: 'Enter بيجدول الرسايل النصية. الصور والمنشن بيتبعتوا فورًا.',
		close: 'إغلاق',
		turnOff: 'إيقاف التأجيل',
		edit: 'تعديل التأجيل',
		sendNow: 'ابعت دلوقتي',
		sendNowHint: 'ابعت الرسالة دي حالًا من غير تأجيل',
		delayOn: 'التأجيل شغّال',
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

const CUSTOM_PRESETS = [15, 30, 60, 120, 240];

function popoverStyle(anchor) {
	const margin = 10;
	const vw = window.innerWidth || 1024;
	const vh = window.innerHeight || 768;
	const width = Math.min(320, vw - margin * 2);
	const rect = anchor?.getBoundingClientRect?.();
	if (!rect || vw <= 768) return { left: margin, right: margin, bottom: margin, maxHeight: vh - margin * 2 };
	const left = Math.min(Math.max(margin, rect.right - width), vw - width - margin);
	const bottom = Math.max(margin, vh - rect.top + 8);
	return { left, width, bottom, maxHeight: Math.max(240, rect.top - 8 - margin) };
}

/** Small number box with −/+; `suffix` sits inside the box (س / د). */
function MiniNumber({ value, min, max, step = 1, suffix, label, onChange }) {
	const set = next => onChange(Math.min(max, Math.max(min, Math.round(Number(next) || 0))));
	return (
		<span className="wa-dsend__num" aria-label={label}>
			<button type="button" aria-label={`${label} −`} onClick={() => set(value - step)} disabled={value <= min}>
				<Minus size={12} strokeWidth={2.4} />
			</button>
			<input
				type="number"
				inputMode="numeric"
				value={value}
				min={min}
				max={max}
				aria-label={label}
				onChange={event => set(event.target.value)}
			/>
			{suffix ? <span className="wa-dsend__num-suffix">{suffix}</span> : null}
			<button type="button" aria-label={`${label} +`} onClick={() => set(value + step)} disabled={value >= max}>
				<Plus size={12} strokeWidth={2.4} />
			</button>
		</span>
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

/** Strip above the composer while the delay is on: when the next message goes out, plus "send now". */
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
		<div className={`wa-dsend__banner${plan?.ok ? '' : ' is-warning'}`} role="status" dir={ar ? 'rtl' : 'ltr'}>
			<span className="wa-dsend__banner-glyph" aria-hidden="true">
				{plan?.ok ? <Timer size={14} strokeWidth={2.2} /> : <AlertCircle size={14} strokeWidth={2.2} />}
			</span>
			<button type="button" className="wa-dsend__banner-text" onClick={onEdit} title={t.edit}>
				{plan?.ok ? (
					<>
						<span className="wa-dsend__banner-label">{t.delayOn}</span>
						<b>{fill(t.willSend, { when: formatSendWhen(plan.sendAt, ar, now) })}</b>
						<span className="wa-dsend__banner-sub">{fill(t.inTime, { time: formatDelayDuration(plan.sendAt - now, ar) })}</span>
					</>
				) : (
					<span>{problem}</span>
				)}
			</button>
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
			<button type="button" className="wa-dsend__banner-icon" onClick={onEdit} title={t.edit} aria-label={t.edit}>
				<SlidersHorizontal size={14} strokeWidth={2.2} />
			</button>
			<button type="button" className="wa-dsend__banner-icon" onClick={onTurnOff} title={t.turnOff} aria-label={t.turnOff}>
				<X size={15} strokeWidth={2.2} />
			</button>
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
	const update = patch => onPrefsChange({ ...p, ...patch });

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

	const gap = gapState?.data;
	const customHours = Math.floor(p.customMinutes / 60);
	const customRest = p.customMinutes % 60;

	return createPortal(
		<div ref={panelRef} role="dialog" aria-labelledby="wa-dsend-title" dir={ar ? 'rtl' : 'ltr'} className="wa-dsend" style={style}>
			<div className="wa-dsend__head">
				<span className="wa-dsend__glyph" aria-hidden="true">
					<Timer size={15} strokeWidth={2.2} />
				</span>
				<h3 id="wa-dsend-title">{t.title}</h3>
				<button
					type="button"
					role="switch"
					aria-checked={enabled}
					aria-label={t.toggle}
					title={t.toggle}
					className={`wa-dsend__switch${enabled ? ' is-on' : ''}`}
					onClick={() => onEnabledChange(!enabled)}
				>
					<span />
				</button>
				<button type="button" className="wa-ui-icon-btn wa-ui-icon-btn--sm" onClick={onClose} aria-label={t.close} title={t.close}>
					<X size={16} strokeWidth={2} />
				</button>
			</div>

			<fieldset className="wa-dsend__body" disabled={!enabled}>
				<div className="wa-ui-segment" role="radiogroup" aria-label={t.title}>
					{[
						['custom', t.custom],
						['reply', t.reply],
					].map(([value, label]) => (
						<button
							key={value}
							type="button"
							role="radio"
							aria-checked={p.method === value}
							className="wa-ui-segment__item"
							onClick={() => update({ method: value })}
						>
							{label}
						</button>
					))}
				</div>

				{p.method === 'custom' ? (
					<>
						<div className="wa-dsend__chips">
							{CUSTOM_PRESETS.map(minutes => (
								<button
									key={minutes}
									type="button"
									className="wa-ui-chip"
									aria-pressed={p.customMinutes === minutes}
									onClick={() => update({ customMinutes: minutes })}
								>
									{formatDelayDuration(minutes * 60_000, ar)}
								</button>
							))}
						</div>
						<div className="wa-dsend__row">
							<span className="wa-dsend__label">{t.other}</span>
							<MiniNumber
								label={t.hoursShort}
								suffix={t.hoursShort}
								value={customHours}
								min={0}
								max={Math.floor(DELAYED_SEND_MAX_MINUTES / 60)}
								onChange={hours => update({ customMinutes: hours * 60 + customRest })}
							/>
							<MiniNumber
								label={t.minutesShort}
								suffix={t.minutesShort}
								value={customRest}
								min={0}
								max={59}
								step={5}
								onChange={minutes => update({ customMinutes: customHours * 60 + minutes })}
							/>
						</div>
					</>
				) : (
					<>
						<div className="wa-dsend__gap">
							{gapState?.loading && !gap ? (
								<p className="wa-dsend__muted">
									<Loader2 size={13} className="animate-spin" aria-hidden="true" /> {t.loadingGap}
								</p>
							) : gapState?.error ? (
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
							) : gap?.ok ? (
								<>
									<p className="wa-dsend__gap-value">
										{t.repliedAfter} <b>{formatDelayDuration(gap.gapMs, ar)}</b>
									</p>
									<p className="wa-dsend__muted">
										{formatSendWhen(new Date(gap.myMessageAt).getTime(), ar, now)}
										<span aria-hidden="true">{ar ? '←' : '→'}</span>
										{formatSendWhen(new Date(gap.theirReplyAt).getTime(), ar, now)}
									</p>
								</>
							) : null}
						</div>
						<div className="wa-dsend__row">
							<span className="wa-dsend__label">{t.adjust}</span>
							<MiniNumber
								label={t.minutes}
								suffix={t.minutesShort}
								value={p.adjustMinutes}
								min={-DELAYED_SEND_MAX_MINUTES}
								max={DELAYED_SEND_MAX_MINUTES}
								step={5}
								onChange={minutes => update({ adjustMinutes: minutes })}
							/>
						</div>
					</>
				)}

				{p.extraMinutes ? (
					<p className="wa-dsend__extra">
						{fill(t.extraOn, { time: formatDelayDuration(p.extraMinutes * 60_000, ar) })}
						<button type="button" className="wa-dsend__link" onClick={() => update({ extraMinutes: 0 })}>
							{t.remove}
						</button>
					</p>
				) : null}
			</fieldset>

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
				<p className="wa-dsend__note">{t.note}</p>
			</div>
		</div>,
		document.body,
	);
}
