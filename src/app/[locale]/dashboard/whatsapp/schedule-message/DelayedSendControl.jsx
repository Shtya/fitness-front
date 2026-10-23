'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Hourglass, Loader2, Minus, Plus, RefreshCw, Timer, X } from 'lucide-react';
import { DELAYED_SEND_MAX_MINUTES, formatDelayDuration, normalizeDelayedSendPrefs } from './delayed-send';
import './delayed-send.css';

const copy = {
	en: {
		button: 'Delay sending',
		buttonOn: 'Delay is on: Enter schedules the message',
		title: 'Delayed reply',
		subtitle: 'Enter saves the message as scheduled instead of sending it now.',
		toggle: 'Delay my next messages in this chat',
		method: 'Work out the delay from',
		custom: 'A fixed time',
		reply: 'Their reply time',
		hours: 'Hours',
		minutes: 'Minutes',
		adjust: 'Adjust the reply gap',
		extra: 'Extra delay',
		none: 'None',
		youSent: 'You sent',
		theyReplied: 'they replied',
		gap: 'Reply gap',
		countsFrom: 'Counts from their last message at {time}.',
		noReply: 'They have not replied yet, so there is no reply time to copy.',
		noMine: 'There is no message from you before their reply to measure from.',
		loadingGap: 'Measuring the reply time…',
		gapFailed: 'Could not measure the reply time.',
		retry: 'Try again',
		total: 'Delay',
		sendsAt: 'Sends {when}',
		inTime: 'in {time}',
		fromNow: 'Their reply plus this delay has already passed, so it counts from now.',
		raised: 'Raised to 1 minute, the shortest delay.',
		textOnly: 'Works for text messages. Photos and @mentions still send right away.',
		close: 'Close',
		turnOff: 'Turn delay off',
		edit: 'Change delay',
		bannerOn: 'Delayed',
	},
	ar: {
		button: 'تأجيل الإرسال',
		buttonOn: 'التأجيل مفعّل: Enter يجدول الرسالة',
		title: 'رد مؤجّل',
		subtitle: 'Enter يحفظ الرسالة كمجدولة بدل ما تتبعت فورًا.',
		toggle: 'أجّل رسائلي الجاية في الشات ده',
		method: 'احسب التأجيل من',
		custom: 'مدة ثابتة',
		reply: 'وقت ردّه',
		hours: 'ساعات',
		minutes: 'دقايق',
		adjust: 'زوّد أو قلّل من فرق الرد',
		extra: 'وقت إضافي',
		none: 'بدون',
		youSent: 'إنت بعت',
		theyReplied: 'ورد',
		gap: 'فرق الرد',
		countsFrom: 'بيتحسب من آخر رسالة منه الساعة {time}.',
		noReply: 'لسه مارد، فمفيش وقت رد نحسب منه.',
		noMine: 'مفيش رسالة منك قبل ردّه نحسب منها.',
		loadingGap: 'بنحسب وقت الرد…',
		gapFailed: 'ماقدرناش نحسب وقت الرد.',
		retry: 'حاول تاني',
		total: 'التأجيل',
		sendsAt: 'تتبعت {when}',
		inTime: 'بعد {time}',
		fromNow: 'وقت ردّه + التأجيل عدّى خلاص، فبيتحسب من دلوقتي.',
		raised: 'اتزوّد لدقيقة، أقل مدة ممكنة.',
		textOnly: 'للرسائل النصية. الصور والمنشن بيتبعتوا فورًا.',
		close: 'إغلاق',
		turnOff: 'إيقاف التأجيل',
		edit: 'تغيير التأجيل',
		bannerOn: 'مؤجّلة',
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
	const width = Math.min(360, vw - margin * 2);
	const rect = anchor?.getBoundingClientRect?.();
	if (!rect || vw <= 768) return { left: margin, right: margin, bottom: margin, maxHeight: vh - margin * 2 };
	const left = Math.min(Math.max(margin, rect.right - width), vw - width - margin);
	const bottom = Math.max(margin, vh - rect.top + 8);
	return { left, width, bottom, maxHeight: Math.max(240, rect.top - 8 - margin) };
}

function Stepper({ label, value, min, max, step = 1, onChange }) {
	const set = next => onChange(Math.min(max, Math.max(min, Math.round(Number(next) || 0))));
	return (
		<label className="wa-dsend__stepper">
			<span>{label}</span>
			<span className="wa-dsend__stepper-row">
				<button type="button" aria-label="−" onClick={() => set(value - step)} disabled={value <= min}>
					<Minus size={14} strokeWidth={2.2} />
				</button>
				<input
					type="number"
					inputMode="numeric"
					value={value}
					min={min}
					max={max}
					onChange={event => set(event.target.value)}
					className="wa-ui-input"
				/>
				<button type="button" aria-label="+" onClick={() => set(value + step)} disabled={value >= max}>
					<Plus size={14} strokeWidth={2.2} />
				</button>
			</span>
		</label>
	);
}

/** Summary of when the next message goes out; shared by the popover and the strip. */
function PlanSummary({ plan, t, ar, now }) {
	if (!plan?.ok) return null;
	return (
		<div className="wa-dsend__plan" aria-live="polite">
			<p className="wa-dsend__plan-main">
				<Hourglass size={15} strokeWidth={2} aria-hidden="true" />
				<span>
					{t.total} <b>{formatDelayDuration(plan.totalMs, ar)}</b>
				</span>
				<span aria-hidden="true">→</span>
				<b>{fill(t.sendsAt, { when: formatSendWhen(plan.sendAt, ar, now) })}</b>
			</p>
			<p className="wa-dsend__plan-sub">
				{fill(t.inTime, { time: formatDelayDuration(plan.sendAt - now, ar) })}
				{plan.fromNow ? ` · ${t.fromNow}` : ''}
				{plan.raisedToMin ? ` · ${t.raised}` : ''}
			</p>
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

/** Strip above the composer while the delay is on: the time the next message would go out. */
export function DelayedSendBanner({ ar, plan, gapState, prefs, now, onEdit, onTurnOff }) {
	const t = ar ? copy.ar : copy.en;
	const p = normalizeDelayedSendPrefs(prefs);
	const reason = plan?.ok ? '' : plan?.reason;
	return (
		<div className={`wa-dsend__banner${plan?.ok ? '' : ' is-warning'}`} role="status" dir={ar ? 'rtl' : 'ltr'}>
			<Timer size={15} strokeWidth={2} aria-hidden="true" className="wa-dsend__banner-glyph" />
			<button type="button" className="wa-dsend__banner-text" onClick={onEdit} title={t.edit}>
				{plan?.ok ? (
					<>
						<b>{fill(t.sendsAt, { when: formatSendWhen(plan.sendAt, ar, now) })}</b>
						<span>
							{' · '}
							{p.method === 'reply' ? t.reply : t.custom} {formatDelayDuration(plan.totalMs, ar)}
						</span>
					</>
				) : gapState?.error ? (
					t.gapFailed
				) : reason === 'loading' || gapState?.loading ? (
					t.loadingGap
				) : reason === 'no_my_message' ? (
					t.noMine
				) : (
					t.noReply
				)}
			</button>
			<button type="button" className="wa-ui-icon-btn wa-ui-icon-btn--sm" onClick={onTurnOff} title={t.turnOff} aria-label={t.turnOff}>
				<X size={15} strokeWidth={2} />
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
		<div
			ref={panelRef}
			role="dialog"
			aria-labelledby="wa-dsend-title"
			dir={ar ? 'rtl' : 'ltr'}
			className="wa-dsend"
			style={style}
		>
			<div className="wa-dsend__head">
				<span className="wa-dsend__glyph" aria-hidden="true">
					<Timer size={18} strokeWidth={2} />
				</span>
				<div className="min-w-0 flex-1">
					<h3 id="wa-dsend-title">{t.title}</h3>
					<p>{t.subtitle}</p>
				</div>
				<button type="button" className="wa-ui-icon-btn wa-ui-icon-btn--sm" onClick={onClose} aria-label={t.close} title={t.close}>
					<X size={16} strokeWidth={2} />
				</button>
			</div>

			<div className="wa-dsend__body">
				<label className="wa-dsend__toggle">
					<span>{t.toggle}</span>
					<button
						type="button"
						role="switch"
						aria-checked={enabled}
						aria-label={t.toggle}
						className={`wa-dsend__switch${enabled ? ' is-on' : ''}`}
						onClick={() => onEnabledChange(!enabled)}
					>
						<span />
					</button>
				</label>

				<fieldset className="wa-dsend__group" disabled={!enabled}>
					<legend>{t.method}</legend>
					<div className="wa-ui-segment" role="radiogroup">
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
								{[15, 30, 60, 120, 240].map(minutes => (
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
							<div className="wa-dsend__pair">
								<Stepper
									label={t.hours}
									value={customHours}
									min={0}
									max={Math.floor(DELAYED_SEND_MAX_MINUTES / 60)}
									onChange={hours => update({ customMinutes: hours * 60 + customRest })}
								/>
								<Stepper
									label={t.minutes}
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
										<Loader2 size={14} className="animate-spin" aria-hidden="true" /> {t.loadingGap}
									</p>
								) : gapState?.error ? (
									<p className="wa-dsend__warn">
										<AlertCircle size={14} aria-hidden="true" /> {t.gapFailed}
										<button type="button" className="wa-dsend__link" onClick={onRetryGap}>
											<RefreshCw size={12} aria-hidden="true" /> {t.retry}
										</button>
									</p>
								) : gap && !gap.ok ? (
									<p className="wa-dsend__warn">
										<AlertCircle size={14} aria-hidden="true" /> {gap.reason === 'no_my_message' ? t.noMine : t.noReply}
									</p>
								) : gap?.ok ? (
									<>
										<p className="wa-dsend__timeline">
											<span>
												{t.youSent} <b>{formatSendWhen(new Date(gap.myMessageAt).getTime(), ar, now)}</b>
											</span>
											<span aria-hidden="true">→</span>
											<span>
												{t.theyReplied} <b>{formatSendWhen(new Date(gap.theirReplyAt).getTime(), ar, now)}</b>
											</span>
										</p>
										<p className="wa-dsend__gap-value">
											{t.gap}: <b>{formatDelayDuration(gap.gapMs, ar)}</b>
										</p>
										<p className="wa-dsend__muted">
											{fill(t.countsFrom, { time: formatSendWhen(new Date(gap.theirLastAt).getTime(), ar, now) })}
										</p>
									</>
								) : null}
							</div>
							<div className="wa-dsend__chips">
								{[-30, -15, 0, 15, 30, 60].map(minutes => (
									<button
										key={minutes}
										type="button"
										className="wa-ui-chip"
										aria-pressed={p.adjustMinutes === minutes}
										onClick={() => update({ adjustMinutes: minutes })}
									>
										{minutes === 0
											? '±0'
											: `${minutes > 0 ? '+' : '−'}${formatDelayDuration(Math.abs(minutes) * 60_000, ar)}`}
									</button>
								))}
							</div>
							<Stepper
								label={t.adjust}
								value={p.adjustMinutes}
								min={-DELAYED_SEND_MAX_MINUTES}
								max={DELAYED_SEND_MAX_MINUTES}
								step={5}
								onChange={minutes => update({ adjustMinutes: minutes })}
							/>
						</>
					)}

					<div className="wa-dsend__extra">
						<span className="wa-dsend__label">{t.extra}</span>
						<div className="wa-dsend__chips">
							{[0, 5, 15, 30, 60].map(minutes => (
								<button
									key={minutes}
									type="button"
									className="wa-ui-chip"
									aria-pressed={p.extraMinutes === minutes}
									onClick={() => update({ extraMinutes: minutes })}
								>
									{minutes ? `+${formatDelayDuration(minutes * 60_000, ar)}` : t.none}
								</button>
							))}
						</div>
						<Stepper
							label={t.minutes}
							value={p.extraMinutes}
							min={0}
							max={DELAYED_SEND_MAX_MINUTES}
							step={5}
							onChange={minutes => update({ extraMinutes: minutes })}
						/>
					</div>
				</fieldset>
			</div>

			<div className="wa-dsend__foot">
				{enabled ? <PlanSummary plan={plan} t={t} ar={ar} now={now} /> : null}
				<p className="wa-dsend__note">{t.textOnly}</p>
			</div>
		</div>,
		document.body,
	);
}
