'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';

import { PACE_STYLES, formatDuration, staffAssignHint } from './whatsapp-staff-pace';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 'ok' up to 5 min, 'warn' up to 15 min, 'bad' after that. */
export function delayTone(seconds) {
	if (seconds == null) return 'none';
	if (seconds > 900) return 'bad';
	if (seconds > 300) return 'warn';
	return 'ok';
}

function initials(name = '') {
	return (
		String(name)
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map(part => part[0])
			.join('')
			.toUpperCase() || '?'
	);
}

function clock(value, locale) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en', {
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

function dayLabel(value, locale, withWeekday = true) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en', {
		...(withWeekday ? { weekday: 'short' } : {}),
		day: 'numeric',
		month: 'short',
	}).format(date);
}

/** "3 hours ago", "yesterday" — relative to `now`. */
export function timeAgo(value, locale, now = Date.now()) {
	const time = new Date(value).getTime();
	if (!Number.isFinite(time)) return '';
	const diff = time - now;
	const abs = Math.abs(diff);
	const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar-EG' : 'en', { numeric: 'auto' });
	if (abs < MINUTE) return locale === 'ar' ? 'دلوقتي' : 'just now';
	if (abs < HOUR) return rtf.format(Math.round(diff / MINUTE), 'minute');
	if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
	return rtf.format(Math.round(diff / DAY), 'day');
}

/** Where the shift timeline puts its labels for this period length. */
export function timelineTicks(fromMs, toMs, locale) {
	const span = toMs - fromMs;
	if (!(span > 0)) return [];
	const ticks = [];
	const start = new Date(fromMs);
	if (span <= 1.5 * DAY) {
		start.setMinutes(0, 0, 0);
		start.setHours(Math.ceil(start.getHours() / 6) * 6);
		for (let t = start.getTime(); t <= toMs; t += 6 * HOUR) {
			if (t >= fromMs) ticks.push({ at: t, label: clock(t, locale) });
		}
		return ticks;
	}
	const step = span <= 8 * DAY ? 1 : 5;
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() + 1);
	for (let t = start.getTime(); t <= toMs; t += step * DAY) {
		ticks.push({ at: t, label: dayLabel(t, locale, step === 1) });
	}
	return ticks;
}

function position(at, fromMs, toMs) {
	return Math.min(100, Math.max(0, ((at - fromMs) / (toMs - fromMs)) * 100));
}

/** The shift timeline: bands while WhatsApp was open, a tick per reply coloured by delay. */
function ShiftTrack({ fromMs, toMs, timeline, ticks, locale, label }) {
	const sessions = timeline?.sessions || [];
	const replies = timeline?.replies || [];
	const ar = locale === 'ar';
	return (
		<div className="wa-sb-track" role="img" aria-label={label}>
			{ticks.map(tick => (
				<span
					key={tick.at}
					className="wa-sb-track__grid"
					style={{ insetInlineStart: `${position(tick.at, fromMs, toMs)}%` }}
				/>
			))}
			{sessions.map(([start, end]) => {
				const left = position(start, fromMs, toMs);
				const width = Math.max(0.6, position(end, fromMs, toMs) - left);
				return (
					<span
						key={start}
						className="wa-sb-track__band"
						style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
						title={`${ar ? 'فاتح الواتساب' : 'WhatsApp open'} ${clock(start, locale)} – ${clock(end, locale)}`}
					/>
				);
			})}
			{replies.map(([at, seconds], index) => (
				<span
					key={`${at}-${index}`}
					className={`wa-sb-track__tick is-${delayTone(seconds)}`}
					style={{ insetInlineStart: `${position(at, fromMs, toMs)}%` }}
					title={`${ar ? 'رد' : 'Replied'} ${clock(at, locale)} ${ar ? 'بعد' : 'after'} ${formatDuration(seconds, locale)}`}
				/>
			))}
		</div>
	);
}

function Stat({ label, value, tone = 'none', sub }) {
	return (
		<div className={`wa-sb-stat is-${tone}`}>
			<span className="wa-sb-stat__value">{value}</span>
			<span className="wa-sb-stat__label">{label}</span>
			{sub ? <span className="wa-sb-stat__sub">{sub}</span> : null}
		</div>
	);
}

function PersonStatus({ person, locale, now }) {
	const ar = locale === 'ar';
	if (person.online) {
		return <span className="wa-sb-status is-online">{ar ? 'فاتح الواتساب دلوقتي' : 'On WhatsApp now'}</span>;
	}
	if (!person.lastSeenAt) {
		return <span className="wa-sb-status">{ar ? 'مدخلش من فترة طويلة' : 'Not seen in 90 days'}</span>;
	}
	return (
		<span className="wa-sb-status" title={`${dayLabel(person.lastSeenAt, locale)} ${clock(person.lastSeenAt, locale)}`}>
			{ar ? 'آخر ظهور ' : 'Last seen '}
			{timeAgo(person.lastSeenAt, locale, now)}
		</span>
	);
}

/** One sentence on how the period went, for the open row. */
function periodSentence(person, ar) {
	const active = formatDuration(person.activeSeconds || 0, ar ? 'ar' : 'en');
	const sessions = person.sessions || 0;
	const opened = person.chatsOpened || 0;
	const replied = person.repliedChats || 0;
	const seenOnly = person.seenNoReply || 0;
	if (!sessions && !person.replies) {
		return ar ? 'مفيش أي نشاط في الفترة دي.' : 'No activity in this period.';
	}
	return ar
		? `كان فاتح ${active} على ${sessions} مرة. فتح ${opened} شات، ورد في ${replied}${seenOnly ? `، و${seenOnly} شافهم ومردش` : ''}.`
		: `Active ${active} over ${sessions} ${sessions === 1 ? 'session' : 'sessions'}. Opened ${opened} chats and replied in ${replied}${seenOnly ? `; ${seenOnly} opened without a reply` : ''}.`;
}

function DetailPanel({ person, detail, loading, locale, onOpen }) {
	const ar = locale === 'ar';
	const [view, setView] = useState('replies');
	const replies = detail?.replies || [];
	const sessions = detail?.activity?.sessions || [];
	const chats = detail?.activity?.chats || [];
	const waiting = detail?.waiting || [];
	const views = [
		['replies', ar ? 'ردوده' : 'Replies', replies.length],
		['waiting', ar ? 'مستنيين رده' : 'Waiting on them', waiting.length],
		['sessions', ar ? 'دخل إمتى' : 'Sessions', sessions.length],
		['chats', ar ? 'فتح إيه' : 'Chats opened', chats.length],
	];
	return (
		<div className="wa-sb-detail">
			<p className="wa-sb-detail__summary">{periodSentence(person, ar)}</p>
			<div className="wa-sb-tabs" role="tablist">
				{views.map(([key, label, count]) => (
					<button
						key={key}
						type="button"
						role="tab"
						aria-selected={view === key}
						className={`wa-sb-tabs__btn${view === key ? ' is-active' : ''}`}
						onClick={() => setView(key)}
					>
						{label}
						{detail ? <span className="wa-sb-tabs__count">{count}</span> : null}
					</button>
				))}
			</div>
			{loading && !detail ? (
				<div className="wa-sb-lines" aria-busy="true">
					<span />
					<span />
					<span />
				</div>
			) : (
				<ul className="wa-sb-list nice-scroll">
					{view === 'replies' &&
						(replies.length ? (
							replies.map((reply, index) => (
								<li key={`${reply.conversationId}-${reply.repliedAt}-${index}`}>
									<button type="button" className="wa-sb-list__row" onClick={() => onOpen?.(reply.conversationId)}>
										<span className="wa-sb-list__main">
											<span className="wa-sb-list__title"><bdi>{reply.title}</bdi></span>
											<span className="wa-sb-list__sub">
												{ar
													? `بعت ${clock(reply.inboundAt, locale)}، رد عليه ${clock(reply.repliedAt, locale)} (${dayLabel(reply.repliedAt, locale)})`
													: `Wrote ${clock(reply.inboundAt, locale)}, answered ${clock(reply.repliedAt, locale)} (${dayLabel(reply.repliedAt, locale)})`}
											</span>
										</span>
										<span className={`wa-sb-pill is-${delayTone(reply.waitSeconds)}`}>{formatDuration(reply.waitSeconds, locale)}</span>
									</button>
								</li>
							))
						) : (
							<li className="wa-sb-empty">{ar ? 'مردش على حد في الفترة دي.' : 'No replies in this period.'}</li>
						))}
					{view === 'waiting' &&
						(waiting.length ? (
							waiting.map(chat => (
								<li key={chat.conversationId}>
									<button type="button" className="wa-sb-list__row" onClick={() => onOpen?.(chat.conversationId)}>
										<span className="wa-sb-list__main">
											<span className="wa-sb-list__title"><bdi>{chat.title}</bdi></span>
											<span className="wa-sb-list__sub">
												{ar ? `${chat.inboundWaiting} رسالة من غير رد` : `${chat.inboundWaiting} unanswered messages`}
											</span>
										</span>
										<span className={`wa-sb-pill is-${delayTone(chat.waitSeconds)}`}>{formatDuration(chat.waitSeconds, locale)}</span>
									</button>
								</li>
							))
						) : (
							<li className="wa-sb-empty">{ar ? 'مفيش حد مستني رده.' : 'Nobody is waiting on them.'}</li>
						))}
					{view === 'sessions' &&
						(sessions.length ? (
							sessions.map(session => (
								<li key={session.startedAt} className="wa-sb-list__row is-static">
									<span className="wa-sb-list__main">
										<span className="wa-sb-list__title">
											{dayLabel(session.startedAt, locale)}، {clock(session.startedAt, locale)} – {clock(session.endedAt, locale)}
										</span>
										<span className="wa-sb-list__sub">
											{ar
												? `فتح ${session.chatsOpened} شات وبعت ${session.messagesSent} رسالة`
												: `Opened ${session.chatsOpened} chats, sent ${session.messagesSent} messages`}
										</span>
									</span>
									<span className="wa-sb-pill is-none">{formatDuration(session.durationSeconds, locale)}</span>
								</li>
							))
						) : (
							<li className="wa-sb-empty">{ar ? 'مفيش دخول متسجل في الفترة دي.' : 'No sessions recorded in this period.'}</li>
						))}
					{view === 'chats' &&
						(chats.length ? (
							chats.map(chat => (
								<li key={chat.conversationId}>
									<button type="button" className="wa-sb-list__row" onClick={() => onOpen?.(chat.conversationId)}>
										<span className="wa-sb-list__main">
											<span className="wa-sb-list__title"><bdi>{chat.title}</bdi></span>
											<span className="wa-sb-list__sub">
												{ar
													? `فتحه ${chat.timesOpened} مرة، بعت ${chat.messagesSent} رسالة`
													: `Opened ${chat.timesOpened}×, sent ${chat.messagesSent} messages`}
											</span>
										</span>
										<span className={`wa-sb-pill ${chat.messagesSent ? 'is-ok' : 'is-warn'}`}>
											{chat.messagesSent ? (ar ? 'رد' : 'Replied') : ar ? 'شاف بس' : 'Seen only'}
										</span>
									</button>
								</li>
							))
						) : (
							<li className="wa-sb-empty">{ar ? 'مفتحش أي شات في الفترة دي.' : 'No chats opened in this period.'}</li>
						))}
				</ul>
			)}
		</div>
	);
}

function PersonRow({ person, open, onToggle, range, ticks, locale, now, detail, detailLoading, onOpen }) {
	const ar = locale === 'ar';
	const pace = PACE_STYLES[person.pace] || PACE_STYLES.idle;
	return (
		<li className={`wa-sb-person${open ? ' is-open' : ''}${person.online ? ' is-online' : ''}`}>
			<button type="button" className="wa-sb-person__row" onClick={onToggle} aria-expanded={open}>
				<span className="wa-sb-who">
					<span className="wa-sb-avatar" aria-hidden="true">
						{initials(person.name)}
						<i className="wa-sb-avatar__dot" />
					</span>
					<span className="wa-sb-who__text">
						<span className="wa-sb-who__top">
							<span className="wa-sb-who__name">{person.name}</span>
							<span className={`wa-sb-pace ${pace.className}`}>{ar ? pace.ar : pace.en}</span>
						</span>
						<PersonStatus person={person} locale={locale} now={now} />
						<span className="wa-sb-who__last">
							{person.lastReplyAt
								? `${ar ? 'آخر رد ' : 'Last reply '}${timeAgo(person.lastReplyAt, locale, now)}`
								: ar
									? 'مردش في الفترة دي'
									: 'No replies this period'}
						</span>
					</span>
				</span>
				<ShiftTrack
					fromMs={range.from}
					toMs={range.to}
					timeline={person.timeline}
					ticks={ticks}
					locale={locale}
					label={staffAssignHint(person, locale)}
				/>
				<span className="wa-sb-nums">
					<Stat
						label={ar ? 'متوسط الرد' : 'Typical reply'}
						value={formatDuration(person.medianResponseSeconds, locale)}
						tone={delayTone(person.medianResponseSeconds)}
					/>
					<Stat
						label={ar ? 'رد' : 'Replies'}
						value={person.replies}
						sub={person.slowReplies15m ? (ar ? `${person.slowReplies15m} متأخر` : `${person.slowReplies15m} late`) : null}
						tone={person.slowReplies15m ? 'warn' : 'none'}
					/>
					<Stat
						label={ar ? 'مستنيين' : 'Waiting'}
						value={person.waitingConversations}
						sub={person.waitingConversations ? formatDuration(person.oldestWaitSeconds, locale) : null}
						tone={person.waitingConversations ? delayTone(person.oldestWaitSeconds) : 'none'}
					/>
				</span>
				<ChevronDown size={18} className="wa-sb-person__chev" aria-hidden="true" />
			</button>
			{open ? (
				<DetailPanel
					key={`${person.userId}:${range.from}`}
					person={person}
					detail={detail}
					loading={detailLoading}
					locale={locale}
					onOpen={onOpen}
				/>
			) : null}
		</li>
	);
}

function Skeleton({ header }) {
	return (
		<div className="wa-sb" aria-busy="true">
			{header}
			<div className="wa-sb-pulse is-skeleton">
				{[0, 1, 2, 3].map(index => (
					<span key={index} />
				))}
			</div>
			<div className="wa-sb-board">
				<div className="wa-sb-roster is-skeleton">
					{[0, 1, 2].map(index => (
						<span key={index} />
					))}
				</div>
				<div className="wa-sb-side is-skeleton">
					<span />
				</div>
			</div>
		</div>
	);
}

export function WhatsAppReportsTab({
	locale = 'en',
	report,
	loading,
	refreshing = false,
	periodDays,
	onPeriodChange,
	onRefresh,
	staffDetail,
	staffDetailLoading,
	onOpenStaff,
	onOpenConversation,
}) {
	const ar = locale === 'ar';
	const [openId, setOpenId] = useState(null);
	const [now, setNow] = useState(() => Date.now());

	// Online status and "last seen" go stale: refresh quietly every minute while visible.
	useEffect(() => {
		const timer = setInterval(() => {
			setNow(Date.now());
			if (typeof document !== 'undefined' && document.visibilityState === 'visible') onRefresh?.();
		}, 60_000);
		return () => clearInterval(timer);
	}, [onRefresh]);

	const range = useMemo(() => {
		const from = Date.parse(report?.period?.from || '') || now - (periodDays || 7) * DAY;
		const to = Date.parse(report?.period?.to || '') || now;
		return { from, to: Math.max(to, from + MINUTE) };
	}, [report?.period?.from, report?.period?.to, periodDays, now]);
	const ticks = useMemo(() => timelineTicks(range.from, range.to, locale), [range.from, range.to, locale]);
	// Only as many axis labels as fit (about 64px each); the grid lines in the tracks stay.
	const axisRef = useRef(null);
	const [axisWidth, setAxisWidth] = useState(0);
	useEffect(() => {
		const node = axisRef.current;
		if (!node || typeof ResizeObserver === 'undefined') return undefined;
		const observer = new ResizeObserver(([entry]) => setAxisWidth(entry.contentRect.width));
		observer.observe(node);
		return () => observer.disconnect();
	}, [report]);
	const axisTicks = useMemo(() => {
		const fit = Math.max(2, Math.floor((axisWidth || 600) / 64));
		const step = Math.max(1, Math.ceil(ticks.length / fit));
		return ticks.filter((_, index) => index % step === 0);
	}, [ticks, axisWidth]);

	const toggle = userId => {
		const next = openId === userId ? null : userId;
		setOpenId(next);
		if (next) onOpenStaff?.(next);
	};

	const header = (
		<header className="wa-sb-head">
			<div className="wa-sb-head__text">
				<h2>{ar ? 'الفريق على الواتساب' : 'Team on WhatsApp'}</h2>
				<p>
					{ar
						? 'مين فاتح دلوقتي، رد إمتى، واتأخر قد إيه.'
						: 'Who is on now, when they replied, and how long customers waited.'}
				</p>
			</div>
			<div className="wa-sb-head__actions">
				<div className="wa-sb-seg" role="tablist" aria-label={ar ? 'الفترة' : 'Period'}>
					{[1, 7, 30].map(days => (
						<button
							key={days}
							type="button"
							role="tab"
							aria-selected={periodDays === days}
							onClick={() => {
								setOpenId(null);
								onPeriodChange?.(days);
							}}
							className={`wa-sb-seg__btn${periodDays === days ? ' is-active' : ''}`}
						>
							{days === 1 ? (ar ? 'النهارده' : 'Today') : days === 7 ? (ar ? '٧ أيام' : '7 days') : ar ? '٣٠ يوم' : '30 days'}
						</button>
					))}
				</div>
				<button
					type="button"
					className={`wa-sb-refresh${refreshing ? ' is-spinning' : ''}`}
					onClick={() => onRefresh?.(true)}
					aria-label={ar ? 'تحديث' : 'Refresh'}
					title={
						report?.generatedAt
							? `${ar ? 'اتحدث ' : 'Updated '}${timeAgo(report.generatedAt, locale, now)}`
							: undefined
					}
				>
					<RefreshCw size={16} strokeWidth={2.2} />
				</button>
			</div>
		</header>
	);

	if (!report) {
		if (loading) return <Skeleton header={header} />;
		return (
			<div className="wa-sb">
				{header}
				<p className="wa-sb-blank">{ar ? 'مقدرناش نجيب التقرير. دوس تحديث.' : 'The report did not load. Press refresh to try again.'}</p>
			</div>
		);
	}

	const staff = report.staff || [];
	const totals = report.totals || {};
	const waiting = [...(report.waiting || []), ...(report.unassigned || [])].sort(
		(a, b) => Number(b.waitSeconds) - Number(a.waitSeconds),
	);
	const recent = report.recentReplies || [];
	const overdue = Number(totals.overdueConversations || 0);
	const late = Number(totals.lateReplies || 0);

	return (
		<div className={`wa-sb${refreshing ? ' is-refreshing' : ''}`}>
			{header}

			<section className="wa-sb-pulse" aria-label={ar ? 'ملخص الفريق' : 'Team summary'}>
				<Stat
					label={ar ? 'متوسط أول رد' : 'Typical first reply'}
					value={formatDuration(report.averageResponseSeconds, locale)}
					tone={delayTone(report.averageResponseSeconds)}
					sub={ar ? `من ${totals.repliesMeasured || 0} رد` : `from ${totals.repliesMeasured || 0} replies`}
				/>
				<Stat
					label={ar ? 'عملاء مستنيين رد' : 'Customers waiting'}
					value={waiting.length}
					tone={overdue ? 'bad' : waiting.length ? 'warn' : 'ok'}
					sub={overdue ? (ar ? `${overdue} عدى عليهم ربع ساعة` : `${overdue} over 15 min`) : null}
				/>
				<Stat
					label={ar ? 'ردود متأخرة' : 'Late replies'}
					value={late}
					tone={late ? 'warn' : 'ok'}
					sub={ar ? 'أكتر من ربع ساعة' : 'over 15 min'}
				/>
				<Stat
					label={ar ? 'فاتحين دلوقتي' : 'On WhatsApp now'}
					value={`${totals.onlineNow || 0}/${staff.length}`}
					tone={totals.onlineNow ? 'ok' : 'none'}
				/>
			</section>

			<div className="wa-sb-board">
				<section className="wa-sb-roster" aria-label={ar ? 'الفريق' : 'Team'}>
					<div className="wa-sb-roster__head" aria-hidden="true">
						<span>{ar ? 'الشخص' : 'Person'}</span>
						<span className="wa-sb-axis" ref={axisRef}>
							{axisTicks.map(tick => (
								<span
									key={tick.at}
									className="wa-sb-axis__tick"
									style={{ insetInlineStart: `${position(tick.at, range.from, range.to)}%` }}
								>
									{tick.label}
								</span>
							))}
						</span>
						<span className="wa-sb-legend">
							<i className="is-band" /> {ar ? 'فاتح' : 'Open'}
							<i className="is-ok" /> {ar ? 'رد سريع' : 'Quick'}
							<i className="is-warn" /> {ar ? '٥–١٥ د' : '5–15m'}
							<i className="is-bad" /> {ar ? 'متأخر' : 'Late'}
						</span>
					</div>
					{staff.length ? (
						<ul className="wa-sb-people">
							{staff.map(person => (
								<PersonRow
									key={person.userId}
									person={person}
									open={openId === person.userId}
									onToggle={() => toggle(person.userId)}
									range={range}
									ticks={ticks}
									locale={locale}
									now={now}
									detail={staffDetail?.staff?.userId === person.userId ? staffDetail : null}
									detailLoading={staffDetailLoading}
									onOpen={onOpenConversation}
								/>
							))}
						</ul>
					) : (
						<p className="wa-sb-blank">
							{ar
								? 'لسه مفيش موظفين على الأكاونت ده. ادّي حد صلاحية من الإعدادات وشغله هيظهر هنا.'
								: 'No staff on this account yet. Give someone access in Settings and their work shows up here.'}
						</p>
					)}
				</section>

				<aside className="wa-sb-side">
					<section className="wa-sb-panel">
						<h3>{ar ? 'مستنيين رد' : 'Waiting for a reply'}</h3>
						{waiting.length ? (
							<ul className="wa-sb-list nice-scroll">
								{waiting.slice(0, 30).map(chat => (
									<li key={chat.conversationId}>
										<button type="button" className="wa-sb-list__row" onClick={() => onOpenConversation?.(chat.conversationId)}>
											<span className="wa-sb-list__main">
												<span className="wa-sb-list__title"><bdi>{chat.title}</bdi></span>
												<span className="wa-sb-list__sub">
													{chat.assignedUserName || (ar ? 'مش متوزع على حد' : 'Not assigned')}
												</span>
											</span>
											<span className={`wa-sb-pill is-${delayTone(chat.waitSeconds)}`}>{formatDuration(chat.waitSeconds, locale)}</span>
										</button>
									</li>
								))}
							</ul>
						) : (
							<p className="wa-sb-empty">{ar ? 'كل العملاء اترد عليهم.' : 'Every customer has been answered.'}</p>
						)}
					</section>
					<section className="wa-sb-panel">
						<h3>{ar ? 'آخر الردود' : 'Latest replies'}</h3>
						{recent.length ? (
							<ul className="wa-sb-list nice-scroll">
								{recent.map((reply, index) => (
									<li key={`${reply.conversationId}-${reply.repliedAt}-${index}`}>
										<button type="button" className="wa-sb-list__row" onClick={() => onOpenConversation?.(reply.conversationId)}>
											<span className="wa-sb-list__main">
												<span className="wa-sb-list__title">
													<bdi>{reply.userName}</bdi> {ar ? 'رد على' : 'answered'} <bdi>{reply.title}</bdi>
												</span>
												<span className="wa-sb-list__sub">{timeAgo(reply.repliedAt, locale, now)}</span>
											</span>
											<span className={`wa-sb-pill is-${delayTone(reply.waitSeconds)}`}>{formatDuration(reply.waitSeconds, locale)}</span>
										</button>
									</li>
								))}
							</ul>
						) : (
							<p className="wa-sb-empty">{ar ? 'مفيش ردود في الفترة دي.' : 'No replies in this period.'}</p>
						)}
					</section>
				</aside>
			</div>
		</div>
	);
}

export { formatDuration as formatReportDuration, PACE_STYLES, staffAssignHint };
