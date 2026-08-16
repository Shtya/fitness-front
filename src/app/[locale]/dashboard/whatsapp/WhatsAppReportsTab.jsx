'use client';

import { useState } from 'react';
import {
	AlertTriangle,
	ChevronDown,
	Clock,
	Inbox,
	Loader2,
	Timer,
	TrendingUp,
	UserRound,
	Users,
} from 'lucide-react';

const PACE_STYLES = {
	fast: {
		en: 'Replies quickly',
		ar: 'بيرد بسرعة',
		className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
	},
	ok: {
		en: 'Normal pace',
		ar: 'رد طبيعي',
		className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
	},
	slow: {
		en: 'Replies late',
		ar: 'بيرد متأخر',
		className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
	},
	backlog: {
		en: 'Messages piling up',
		ar: 'رسايل متراكمة',
		className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
	},
	idle: {
		en: 'No recent replies',
		ar: 'مفيش ردود في الفترة',
		className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
	},
};

function formatDuration(totalSeconds, locale = 'en') {
	if (totalSeconds == null || Number.isNaN(Number(totalSeconds))) return '—';
	const s = Math.max(0, Math.round(Number(totalSeconds)));
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (locale === 'ar') {
		if (d > 0) return h ? `${d} يوم و${h}س` : `${d} يوم`;
		if (h > 0) return `${h}س ${m}د`;
		if (m > 0) return `${m}د`;
		return `${sec}ث`;
	}
	if (d > 0) return h ? `${d}d ${h}h` : `${d}d`;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m`;
	return `${sec}s`;
}

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

function waitTone(seconds) {
	if (seconds == null) return 'text-slate-500';
	if (seconds >= 900) return 'text-rose-600';
	if (seconds >= 300) return 'text-amber-600';
	return 'text-emerald-600';
}

function initials(name = '') {
	return String(name)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase() || '?';
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

	const toggleStaff = (userId) => {
		const next = openId === userId ? null : userId;
		setOpenId(next);
		if (next) onOpenStaff?.(next);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16 text-slate-400">
				<Loader2 size={18} className="animate-spin" />
			</div>
		);
	}

	if (!report) {
		return (
			<div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
				<TrendingUp className="mb-2 text-slate-300" size={28} />
				<p className="text-sm font-bold text-slate-500">{t.noReportData}</p>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="max-w-xl text-xs leading-5 text-slate-500">{t.reportsHint}</p>
				<div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
					{[1, 7, 30].map((days) => (
						<button
							key={days}
							type="button"
							onClick={() => onPeriodChange?.(days)}
							className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
								periodDays === days
									? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
									: 'text-slate-500'
							}`}
						>
							{days === 1 ? t.reportToday : days === 7 ? t.reportWeek : t.reportMonth}
						</button>
					))}
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<Kpi
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
					icon={Inbox}
					label={t.waitingNow}
					value={totals.waitingConversations || 0}
					hint={
						Number(totals.unassignedWaiting || 0)
							? `${t.waitingNowHint} · ${totals.unassignedWaiting} ${t.unassignedWaiting}`
							: t.waitingNowHint
					}
					danger={Number(totals.overdueConversations || 0) > 0}
				/>
				<Kpi
					icon={AlertTriangle}
					label={t.overdueNow}
					value={totals.overdueConversations || 0}
					hint={t.overdueHint}
					danger={Number(totals.overdueConversations || 0) > 0}
				/>
				<Kpi
					icon={Users}
					label={t.bestToAssign}
					value={report.bestToAssign?.name || '—'}
					hint={
						report.bestToAssign
							? ar
								? PACE_STYLES[report.bestToAssign.pace]?.ar
								: PACE_STYLES[report.bestToAssign.pace]?.en
							: t.noBestAssignee
					}
				/>
			</div>

			<div>
				<p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{t.teamSla}</p>
				<p className="mb-2 text-[11px] text-slate-400">{t.teamSlaHint}</p>
				<div className="space-y-2">
					{staff.length ? (
						staff.map((item) => {
							const pace = PACE_STYLES[item.pace] || PACE_STYLES.idle;
							const open = openId === item.userId;
							const detail = staffDetail?.staff?.userId === item.userId ? staffDetail : null;
							return (
								<div
									key={item.userId}
									className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
								>
									<button
										type="button"
										onClick={() => toggleStaff(item.userId)}
										className="flex w-full items-start gap-3 p-3 text-start"
									>
										<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
											{initials(item.name)}
										</span>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="truncate text-sm font-bold">{item.name}</p>
												<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pace.className}`}>
													{ar ? pace.ar : pace.en}
												</span>
											</div>
											<div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:grid-cols-4">
												<Metric
													label={t.medianReply}
													value={formatDuration(item.medianResponseSeconds, locale)}
													className={waitTone(item.medianResponseSeconds)}
												/>
												<Metric
													label={t.p90Reply}
													value={formatDuration(item.p90ResponseSeconds, locale)}
													className={waitTone(item.p90ResponseSeconds)}
												/>
												<Metric
													label={t.waitingOnThem}
													value={`${item.waitingConversations} · ${item.waitingInboundMessages} ${t.pendingInbound}`}
													className={item.waitingConversations ? 'text-amber-700' : ''}
												/>
												<Metric
													label={t.oldestWait}
													value={formatDuration(item.oldestWaitSeconds, locale)}
													className={waitTone(item.oldestWaitSeconds)}
												/>
											</div>
											<ReplyMix item={item} label={t.replyMix} />
											<p className="mt-1.5 text-[10px] text-slate-400">
												{t.assignedChats}: {item.assignedConversations} · {t.sentByThem}: {item.sentMessages} · {t.repliesCounted}: {item.replies} · {t.fastReplies}: {item.fastReplies5m} · {t.lateReplies}: {item.slowReplies15m}
											</p>
										</div>
										<ChevronDown
											size={16}
											className={`mt-1 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
										/>
									</button>
									{open ? (
										<div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
											{staffDetailLoading && !detail ? (
												<p className="flex items-center gap-2 text-xs text-slate-400">
													<Loader2 size={12} className="animate-spin" />
													{t.loading}
												</p>
											) : (
												<div className="grid gap-4 lg:grid-cols-2">
													<div>
														<p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
															{t.replyDelays}
														</p>
														{(detail?.replies || []).length ? (
															<ul className="max-h-56 space-y-1 overflow-y-auto">
																{detail.replies.map((reply, index) => (
																	<li key={`${reply.conversationId}-${index}`}>
																		<button
																			type="button"
																			onClick={() => onOpenConversation?.(reply.conversationId)}
																			className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-slate-50 dark:hover:bg-slate-800"
																		>
																			<span className="min-w-0">
																				<span className="block truncate text-[11px] font-semibold">{reply.title}</span>
																				<span className="text-[10px] text-slate-400">
																					{formatClock(reply.inboundAt, locale)} → {formatClock(reply.repliedAt, locale)}
																				</span>
																			</span>
																			<span className={`shrink-0 text-[11px] font-black tabular-nums ${waitTone(reply.waitSeconds)}`}>
																				{formatDuration(reply.waitSeconds, locale)}
																			</span>
																		</button>
																	</li>
																))}
															</ul>
														) : (
															<p className="text-[11px] text-slate-400">{t.noReplyHistory}</p>
														)}
													</div>
													<div>
														<p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
															{t.openWaiting}
														</p>
														{(detail?.waiting || []).length ? (
															<ul className="max-h-56 space-y-1 overflow-y-auto">
																{detail.waiting.map((chat) => (
																	<li key={chat.conversationId}>
																		<button
																			type="button"
																			onClick={() => onOpenConversation?.(chat.conversationId)}
																			className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-slate-50 dark:hover:bg-slate-800"
																		>
																			<span className="min-w-0">
																				<span className="block truncate text-[11px] font-semibold">{chat.title}</span>
																				<span className="text-[10px] text-slate-400">
																					{chat.inboundWaiting} {t.pendingInbound}
																				</span>
																			</span>
																			<span className={`shrink-0 text-[11px] font-black tabular-nums ${waitTone(chat.waitSeconds)}`}>
																				{formatDuration(chat.waitSeconds, locale)}
																			</span>
																		</button>
																	</li>
																))}
															</ul>
														) : (
															<p className="text-[11px] text-slate-400">{t.noOpenWaiting}</p>
														)}
													</div>
												</div>
											)}
										</div>
									) : null}
								</div>
							);
						})
					) : (
						<p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-700">
							{t.noAssignedStaff}
						</p>
					)}
				</div>
			</div>

			<div>
				<p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{t.waitingBoard}</p>
				<p className="mb-2 text-[11px] text-slate-400">{t.waitingBoardHint}</p>
				{waiting.length ? (
					<div dir="ltr" className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-3 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-slate-800/80">
							<span className="min-w-0 flex-1 text-left">{t.reportChat}</span>
							<span className="w-18 shrink-0 text-right">{t.pendingInbound}</span>
							<span className="w-24 shrink-0 text-right">{t.waitTime}</span>
						</div>
						<div>
							{waiting.map((chat) => (
								<button
									key={chat.conversationId}
									type="button"
									onClick={() => onOpenConversation?.(chat.conversationId)}
									className="flex w-full items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
								>
									<span className="min-w-0 flex-1 text-left">
										<span className="block truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
											{chat.title}
										</span>
										<span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-400">
											<UserRound size={11} />
											{chat.assignedUserName || t.unassign}
										</span>
									</span>
									<span className="w-18 shrink-0 text-right text-[12px] font-bold tabular-nums">
										{chat.inboundWaiting}
									</span>
									<span className={`inline-flex w-24 shrink-0 items-center justify-end gap-1 text-right text-[12px] font-black tabular-nums ${waitTone(chat.waitSeconds)}`}>
										{chat.waitSeconds >= 900 ? <Timer size={12} /> : null}
										{formatDuration(chat.waitSeconds, locale)}
									</span>
								</button>
							))}
						</div>
					</div>
				) : (
					<p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-700">
						{t.noWaitingBoard}
					</p>
				)}
			</div>
		</div>
	);
}

function Kpi({ icon: Icon, label, value, hint, danger = false }) {
	return (
		<div className={`rounded-2xl border p-4 ${danger ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
			<div className="flex items-center gap-1.5 text-slate-400">
				<Icon size={13} />
				<p className="text-[11px] font-medium">{label}</p>
			</div>
			<p className={`mt-2 truncate text-xl font-black tabular-nums ${danger ? 'text-rose-600' : ''}`}>{value}</p>
			{hint ? <p className="mt-1 text-[10px] leading-4 text-slate-400">{hint}</p> : null}
		</div>
	);
}

function Metric({ label, value, className = '' }) {
	return (
		<span>
			<span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
			<span className={`block font-black tabular-nums ${className}`}>{value}</span>
		</span>
	);
}

function ReplyMix({ item, label }) {
	const total = Number(item?.replies || 0);
	if (!total) return null;
	const fast = Number(item.fastReplies5m || 0);
	const late = Number(item.slowReplies15m || 0);
	const mid = Math.max(0, total - fast - late);
	return (
		<div className="mt-2">
			<p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
			<div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
				{fast ? <span className="bg-emerald-500" style={{ width: `${(fast / total) * 100}%` }} /> : null}
				{mid ? <span className="bg-sky-400" style={{ width: `${(mid / total) * 100}%` }} /> : null}
				{late ? <span className="bg-rose-500" style={{ width: `${(late / total) * 100}%` }} /> : null}
			</div>
		</div>
	);
}

export function staffAssignHint(item, locale = 'en') {
	if (!item) return '';
	const pace = PACE_STYLES[item.pace] || PACE_STYLES.idle;
	const paceLabel = locale === 'ar' ? pace.ar : pace.en;
	const wait = item.waitingConversations
		? locale === 'ar'
			? `${item.waitingConversations} شات / ${item.waitingInboundMessages || 0} رسالة مستنية`
			: `${item.waitingConversations} chats / ${item.waitingInboundMessages || 0} unanswered`
		: locale === 'ar'
			? 'مفيش رسايل متراكمة'
			: 'no backlog';
	const median = item.medianResponseSeconds == null
		? ''
		: ` · ${formatDuration(item.medianResponseSeconds, locale)}`;
	return `${paceLabel} · ${wait}${median}`;
}

export { formatDuration as formatReportDuration, PACE_STYLES };
