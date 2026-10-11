'use client';

import { useState } from 'react';
import {
	AlertTriangle,
	ChevronDown,
	Clock,
	Inbox,
	MessageCircle,
	Timer,
	TrendingUp,
	UserRound,
	Users,
	Zap,
} from 'lucide-react';

import { PACE_STYLES, formatDuration, staffAssignHint } from './whatsapp-staff-pace';

function formatClock(value, locale = 'en') {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

/** 'ok' under 5 min, 'warn' under 15 min, 'bad' after that. */
function waitTone(seconds) {
	if (seconds == null) return 'none';
	if (seconds >= 900) return 'bad';
	if (seconds >= 300) return 'warn';
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

function ReportsHero({ t, periodDays, onPeriodChange }) {
	return (
		<header className="wa-rp-hero">
			<div className="wa-rp-hero__id">
				<span className="wa-rp-hero__icon" aria-hidden="true">
					<TrendingUp size={21} strokeWidth={2.1} />
				</span>
				<div className="min-w-0">
					<h2 className="wa-rp-hero__title">{t.reports}</h2>
					<p className="wa-rp-hero__hint">{t.reportsHint}</p>
				</div>
			</div>
			<div className="wa-story-seg wa-rp-period" role="tablist" aria-label={t.reports}>
				{[1, 7, 30].map(days => (
					<button
						key={days}
						type="button"
						role="tab"
						aria-selected={periodDays === days}
						onClick={() => onPeriodChange?.(days)}
						className={`wa-story-seg__btn${periodDays === days ? ' is-active' : ''}`}
					>
						{days === 1 ? t.reportToday : days === 7 ? t.reportWeek : t.reportMonth}
					</button>
				))}
			</div>
		</header>
	);
}

export function WhatsAppReportsTab({
	locale = 'en',
	t,
	report,
	loading,
	periodDays,
	onPeriodChange,
	staffDetail,
	staffDetailLoading,
	onOpenStaff,
	onOpenConversation,
}) {
	const ar = locale === 'ar';
	const [openId, setOpenId] = useState(null);
	const staff = report?.staff || [];
	const waiting = report?.waiting || [];
	const totals = report?.totals || {};

	const toggleStaff = userId => {
		const next = openId === userId ? null : userId;
		setOpenId(next);
		if (next) onOpenStaff?.(next);
	};

	const hero = <ReportsHero t={t} periodDays={periodDays} onPeriodChange={onPeriodChange} />;

	if (loading) {
		return (
			<div className="wa-rp">
				{hero}
				<div className="wa-rp-kpis" aria-busy="true">
					{[0, 1, 2, 3].map(index => (
						<div key={index} className="wa-rp-kpi is-skeleton">
							<span />
							<span />
							<span />
						</div>
					))}
				</div>
				<div className="wa-rp-cols">
					<div className="wa-rp-card is-skeleton" style={{ height: 260 }} />
					<div className="wa-rp-card is-skeleton" style={{ height: 260 }} />
				</div>
			</div>
		);
	}

	if (!report) {
		return (
			<div className="wa-rp">
				{hero}
				<div className="wa-rp-empty">
					<span className="wa-rp-empty__icon" aria-hidden="true">
						<TrendingUp size={26} strokeWidth={1.9} />
					</span>
					<p>{t.noReportData}</p>
				</div>
			</div>
		);
	}

	const overdue = Number(totals.overdueConversations || 0);
	const waitingCount = Number(totals.waitingConversations || 0);
	const best = report.bestToAssign;
	const bestPace = best ? PACE_STYLES[best.pace] || PACE_STYLES.idle : null;
	const avgTone = waitTone(report.averageResponseSeconds);

	return (
		<div className="wa-rp">
			{hero}

			<div className="wa-rp-kpis">
				<Kpi
					tone={avgTone === 'none' ? 'neutral' : avgTone}
					icon={Clock}
					label={t.avgFirstReply}
					value={formatDuration(report.averageResponseSeconds, locale)}
					hint={
						totals.repliesMeasured
							? `${t.typicalReplyHint} · ${totals.repliesMeasured} ${t.repliesCounted}`
							: t.typicalReplyHint
					}
				/>
				<Kpi
					tone={waitingCount ? 'warn' : 'ok'}
					icon={Inbox}
					label={t.waitingNow}
					value={waitingCount}
					hint={
						Number(totals.unassignedWaiting || 0)
							? `${t.waitingNowHint} · ${totals.unassignedWaiting} ${t.unassignedWaiting}`
							: t.waitingNowHint
					}
				/>
				<Kpi
					tone={overdue ? 'bad' : 'ok'}
					icon={AlertTriangle}
					label={t.overdueNow}
					value={overdue}
					hint={t.overdueHint}
				/>
				<div className="wa-rp-kpi is-best">
					<p className="wa-rp-kpi__label">
						<span className="wa-rp-kpi__icon">
							<Users size={16} strokeWidth={2.1} />
						</span>
						{t.bestToAssign}
					</p>
					{best ? (
						<div className="wa-rp-best">
							<span className="wa-rp-avatar is-lg">{initials(best.name)}</span>
							<div className="min-w-0">
								<p className="wa-rp-best__name">{best.name}</p>
								<span className={`wa-rp-pace ${bestPace?.className || ''}`}>{ar ? bestPace?.ar : bestPace?.en}</span>
							</div>
						</div>
					) : (
						<>
							<p className="wa-rp-kpi__value">—</p>
							<p className="wa-rp-kpi__hint">{t.noBestAssignee}</p>
						</>
					)}
				</div>
			</div>

			<div className="wa-rp-cols">
				<section className="wa-rp-section">
					<header className="wa-rp-section__head">
						<div>
							<h3>
								<Users size={16} strokeWidth={2.2} />
								{t.teamSla}
								<span className="wa-rp-count">{staff.length}</span>
							</h3>
							<p>{t.teamSlaHint}</p>
						</div>
						<div className="wa-rp-legend" aria-hidden="true">
							<span className="is-ok">{ar ? 'أقل من ٥ د' : '< 5 min'}</span>
							<span className="is-warn">{ar ? '٥–١٥ د' : '5–15 min'}</span>
							<span className="is-bad">{ar ? 'أكتر من ١٥ د' : '> 15 min'}</span>
						</div>
					</header>
					<div className="wa-rp-staff">
						{staff.length ? (
							staff.map(item => {
								const pace = PACE_STYLES[item.pace] || PACE_STYLES.idle;
								const open = openId === item.userId;
								const detail = staffDetail?.staff?.userId === item.userId ? staffDetail : null;
								return (
									<article key={item.userId} className={`wa-rp-card wa-rp-person${open ? ' is-open' : ''}`}>
										<button
											type="button"
											onClick={() => toggleStaff(item.userId)}
											aria-expanded={open}
											className="wa-rp-person__head"
										>
											<span className={`wa-rp-avatar is-${waitTone(item.medianResponseSeconds)}`}>{initials(item.name)}</span>
											<span className="wa-rp-person__id">
												<span className="wa-rp-person__name">{item.name}</span>
												<span className="wa-rp-person__meta">
													<span className={`wa-rp-pace ${pace.className}`}>{ar ? pace.ar : pace.en}</span>
													<span>
														{item.assignedConversations} {t.assignedChats}
													</span>
												</span>
											</span>
											<ChevronDown size={18} className="wa-rp-person__chev" aria-hidden="true" />
										</button>
										<div className="wa-rp-metrics">
											<Metric label={t.medianReply} value={formatDuration(item.medianResponseSeconds, locale)} tone={waitTone(item.medianResponseSeconds)} />
											<Metric label={t.p90Reply} value={formatDuration(item.p90ResponseSeconds, locale)} tone={waitTone(item.p90ResponseSeconds)} />
											<Metric
												label={t.waitingOnThem}
												value={item.waitingConversations}
												sub={`${item.waitingInboundMessages} ${t.pendingInbound}`}
												tone={item.waitingConversations ? 'warn' : 'none'}
											/>
											<Metric label={t.oldestWait} value={formatDuration(item.oldestWaitSeconds, locale)} tone={waitTone(item.oldestWaitSeconds)} />
										</div>
										<ReplyMix item={item} t={t} ar={ar} />
										<p className="wa-rp-person__foot">
											<span>
												<MessageCircle size={12} /> {t.sentByThem}: <b>{item.sentMessages}</b>
											</span>
											<span>
												{t.repliesCounted}: <b>{item.replies}</b>
											</span>
										</p>
										{open ? (
											<div className="wa-rp-detail">
												{staffDetailLoading && !detail ? (
													<div className="wa-rp-detail__loading">
														<span className="wa-rp-line is-skeleton" />
														<span className="wa-rp-line is-skeleton" />
														<span className="wa-rp-line is-skeleton" />
													</div>
												) : (
													<>
														<DetailList
															title={t.replyDelays}
															empty={t.noReplyHistory}
															items={(detail?.replies || []).map((reply, index) => ({
																key: `${reply.conversationId}-${index}`,
																conversationId: reply.conversationId,
																title: reply.title,
																sub: `${formatClock(reply.inboundAt, locale)} → ${formatClock(reply.repliedAt, locale)}`,
																seconds: reply.waitSeconds,
															}))}
															locale={locale}
															onOpen={onOpenConversation}
														/>
														<DetailList
															title={t.openWaiting}
															empty={t.noOpenWaiting}
															items={(detail?.waiting || []).map(chat => ({
																key: chat.conversationId,
																conversationId: chat.conversationId,
																title: chat.title,
																sub: `${chat.inboundWaiting} ${t.pendingInbound}`,
																seconds: chat.waitSeconds,
															}))}
															locale={locale}
															onOpen={onOpenConversation}
														/>
													</>
												)}
											</div>
										) : null}
									</article>
								);
							})
						) : (
							<p className="wa-rp-note">{t.noAssignedStaff}</p>
						)}
					</div>
				</section>

				<section className="wa-rp-section wa-rp-waiting">
					<header className="wa-rp-section__head">
						<div>
							<h3>
								<Inbox size={16} strokeWidth={2.2} />
								{t.waitingBoard}
								<span className={`wa-rp-count${overdue ? ' is-bad' : ''}`}>{waiting.length}</span>
							</h3>
							<p>{t.waitingBoardHint}</p>
						</div>
					</header>
					<div className="wa-rp-card wa-rp-queue">
						{waiting.length ? (
							waiting.map(chat => {
								const tone = waitTone(chat.waitSeconds);
								return (
									<button
										key={chat.conversationId}
										type="button"
										onClick={() => onOpenConversation?.(chat.conversationId)}
										className={`wa-rp-queue__row is-${tone}`}
									>
										<span className="wa-rp-avatar is-sm">{initials(chat.title)}</span>
										<span className="wa-rp-queue__copy">
											<span className="wa-rp-queue__title" dir="auto">
												{chat.title}
											</span>
											<span className="wa-rp-queue__sub">
												<UserRound size={11} />
												{chat.assignedUserName || t.unassign}
												<span className="wa-rp-queue__dot" aria-hidden="true" />
												{chat.inboundWaiting} {t.pendingInbound}
											</span>
										</span>
										<span className={`wa-rp-wait is-${tone}`}>
											{tone === 'bad' ? <Timer size={12} /> : null}
											{formatDuration(chat.waitSeconds, locale)}
										</span>
									</button>
								);
							})
						) : (
							<div className="wa-rp-allclear">
								<span aria-hidden="true">
									<Zap size={20} strokeWidth={2} />
								</span>
								<p>{t.noWaitingBoard}</p>
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}

function Kpi({ icon: Icon, label, value, hint, tone = 'neutral' }) {
	return (
		<div className={`wa-rp-kpi is-${tone}`}>
			<p className="wa-rp-kpi__label">
				<span className="wa-rp-kpi__icon">
					<Icon size={16} strokeWidth={2.1} />
				</span>
				{label}
			</p>
			<p className="wa-rp-kpi__value">{value}</p>
			{hint ? <p className="wa-rp-kpi__hint">{hint}</p> : null}
		</div>
	);
}

function Metric({ label, value, sub, tone = 'none' }) {
	return (
		<div className={`wa-rp-metric is-${tone}`}>
			<span className="wa-rp-metric__label">{label}</span>
			<span className="wa-rp-metric__value">{value}</span>
			{sub ? <span className="wa-rp-metric__sub">{sub}</span> : null}
		</div>
	);
}

function ReplyMix({ item, t, ar }) {
	const total = Number(item?.replies || 0);
	if (!total) return null;
	const fast = Number(item.fastReplies5m || 0);
	const late = Number(item.slowReplies15m || 0);
	const mid = Math.max(0, total - fast - late);
	const pct = n => `${Math.round((n / total) * 100)}%`;
	return (
		<div className="wa-rp-mix">
			<div className="wa-rp-mix__head">
				<span>{t.replyMix}</span>
				<span className="wa-rp-mix__legend">
					<i className="is-ok" /> {t.fastReplies} {fast}
					<i className="is-mid" /> {ar ? 'عادي' : 'OK'} {mid}
					<i className="is-bad" /> {t.lateReplies} {late}
				</span>
			</div>
			<div className="wa-rp-mix__bar" role="img" aria-label={`${pct(fast)} / ${pct(mid)} / ${pct(late)}`}>
				{fast ? <span className="is-ok" style={{ width: pct(fast) }} /> : null}
				{mid ? <span className="is-mid" style={{ width: pct(mid) }} /> : null}
				{late ? <span className="is-bad" style={{ width: pct(late) }} /> : null}
			</div>
		</div>
	);
}

function DetailList({ title, empty, items, locale, onOpen }) {
	return (
		<div className="wa-rp-dlist">
			<p className="wa-rp-dlist__title">{title}</p>
			{items.length ? (
				<ul className="wa-ui-scroll nice-scroll">
					{items.map(item => (
						<li key={item.key}>
							<button type="button" onClick={() => onOpen?.(item.conversationId)} className="wa-rp-dlist__row">
								<span className="min-w-0">
									<span className="wa-rp-dlist__name" dir="auto">
										{item.title}
									</span>
									<span className="wa-rp-dlist__sub">{item.sub}</span>
								</span>
								<span className={`wa-rp-wait is-${waitTone(item.seconds)}`}>{formatDuration(item.seconds, locale)}</span>
							</button>
						</li>
					))}
				</ul>
			) : (
				<p className="wa-rp-note">{empty}</p>
			)}
		</div>
	);
}

export { formatDuration as formatReportDuration, PACE_STYLES, staffAssignHint };
