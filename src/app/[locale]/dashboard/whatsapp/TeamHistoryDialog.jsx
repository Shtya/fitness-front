'use client';

/*
 * Team log: when each person on your team opened and closed WhatsApp (admins see the people
 * they own; a super admin sees everyone). Opened from the "Have WhatsApp open now" popover.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Eye, History, LogIn, LogOut, RotateCcw, X } from 'lucide-react';
import api from '@/utils/axios';
import './wa-team-history.css';

const RANGES = [
	[1, '٢٤ ساعة', 'Last 24h'],
	[7, '٧ أيام', '7 days'],
	[30, '٣٠ يوم', '30 days'],
];

function initials(name) {
	const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

function duration(seconds, ar) {
	const s = Math.max(0, Math.round(Number(seconds) || 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (!h && !m) return ar ? 'أقل من دقيقة' : '< 1m';
	if (!h) return ar ? `${m} د` : `${m}m`;
	return ar ? `${h} س ${m ? `${m} د` : ''}`.trim() : `${h}h ${m ? `${m}m` : ''}`.trim();
}

const clock = (iso, ar) => new Date(iso).toLocaleTimeString(ar ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
const dayKey = iso => {
	const d = new Date(iso);
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
function dayLabel(iso, ar) {
	const d = new Date(iso);
	const today = new Date();
	const yesterday = new Date(Date.now() - 86_400_000);
	if (dayKey(d.toISOString()) === dayKey(today.toISOString())) return ar ? 'النهارده' : 'Today';
	if (dayKey(d.toISOString()) === dayKey(yesterday.toISOString())) return ar ? 'امبارح' : 'Yesterday';
	return d.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}
function ago(iso, ar) {
	if (!iso) return ar ? 'مفيش نشاط في الفترة دي' : 'No activity in this range';
	const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
	if (mins < 1) return ar ? 'آخر ظهور: دلوقتي' : 'Last seen just now';
	if (mins < 60) return ar ? `آخر ظهور: من ${mins} د` : `Last seen ${mins}m ago`;
	const h = Math.round(mins / 60);
	if (h < 24) return ar ? `آخر ظهور: من ${h} س` : `Last seen ${h}h ago`;
	return ar ? `آخر ظهور: ${dayLabel(iso, true)}` : `Last seen ${dayLabel(iso, false)}`;
}

/** Someone who opened WhatsApp in the range (or has it open now). */
const hasActivity = p => Boolean(p.online || p.sessions?.length);

/**
 * onViewAs(person) opens their account (the same "View as" as the presence popover);
 * canViewAs(person) says who it is offered for.
 */
export default function TeamHistoryDialog({ open, ar, onClose, onViewAs = null, canViewAs = () => false }) {
	const [days, setDays] = useState(7);
	const [showQuiet, setShowQuiet] = useState(false);
	const [state, setState] = useState({ status: 'idle', people: [] });
	const [pick, setPick] = useState(null);
	const panelRef = useRef(null);

	const load = useCallback(async () => {
		setState(cur => ({ ...cur, status: 'loading' }));
		try {
			const { data } = await api.get('/whatsapp/presence/staff-history', { params: { days } });
			const people = Array.isArray(data?.people) ? data.people : [];
			setState({ status: 'ready', people });
			setPick(cur => (cur && people.some(p => p.userId === cur) ? cur : (people.find(hasActivity) || people[0])?.userId || null));
		} catch (error) {
			setState(cur => ({ ...cur, status: 'error', message: error?.response?.data?.message || error?.message || '' }));
		}
	}, [days]);

	useEffect(() => {
		if (open) void load();
	}, [open, load]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = e => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		const t = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
		return () => {
			document.removeEventListener('keydown', onKey);
			window.clearTimeout(t);
		};
	}, [open, onClose]);

	const person = state.people.find(p => p.userId === pick) || null;
	const groups = useMemo(() => {
		const out = [];
		const sorted = [...(person?.sessions || [])].sort((x, y) => Date.parse(y.startedAt) - Date.parse(x.startedAt));
		for (const s of sorted) {
			const key = dayKey(s.startedAt);
			let g = out[out.length - 1];
			if (!g || g.key !== key) {
				g = { key, label: dayLabel(s.startedAt, ar), total: 0, items: [] };
				out.push(g);
			}
			g.items.push(s);
			g.total += s.durationSeconds || 0;
		}
		return out;
	}, [person, ar]);

	// people with a log first; the ones with nothing in this range fold away under one toggle
	const active = state.people.filter(hasActivity);
	const quiet = state.people.filter(p => !hasActivity(p));
	const quietOpen = showQuiet || !active.length;
	const viewAs = p => {
		onClose();
		onViewAs?.(p);
	};
	const viewAsButton = (p, wide = false) =>
		onViewAs && canViewAs(p) ? (
			<button
				type="button"
				className={`wa-th__viewas${wide ? ' is-wide' : ''}`}
				onClick={() => viewAs(p)}
				title={ar ? `ادخل بحساب ${p.name} وشوف اللي بيشوفه` : `Sign in as ${p.name} and see what they see`}
				aria-label={ar ? `ادخل بحساب ${p.name}` : `View as ${p.name}`}
			>
				<Eye size={wide ? 14 : 15} strokeWidth={2.2} aria-hidden="true" />
				{wide ? <span>{ar ? 'ادخل كـ' : 'View as'}</span> : null}
			</button>
		) : null;
	const personRow = p => (
		<li key={p.userId} className={`wa-th__item${hasActivity(p) ? '' : ' is-quiet'}`}>
			<button type="button" className={`wa-th__person${p.userId === pick ? ' is-on' : ''}`} aria-pressed={p.userId === pick} onClick={() => setPick(p.userId)}>
				<span className="wa-th__avatar">
					{initials(p.name)}
					{p.online ? <span className="wa-th__live-dot" aria-hidden="true" /> : null}
				</span>
				<span className="wa-th__who">
					<span className="wa-th__name" dir="auto">
						{p.name}
					</span>
					<span className={`wa-th__seen${p.online ? ' is-online' : ''}`}>{p.online ? (ar ? 'فاتح واتساب دلوقتي' : 'Online now') : ago(p.lastSeenAt, ar)}</span>
				</span>
				<span className="wa-th__total" title={ar ? 'إجمالي الوقت في الفترة' : 'Total time in this range'}>
					{p.totalSeconds ? duration(p.totalSeconds, ar) : '—'}
				</span>
			</button>
			{viewAsButton(p)}
		</li>
	);

	if (!open || typeof document === 'undefined') return null;

	return createPortal(
		<div className="wa-th" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
			<div ref={panelRef} className="wa-th__panel" role="dialog" aria-modal="true" aria-labelledby="wa-th-title" tabIndex={-1} dir={ar ? 'rtl' : 'ltr'}>
				<header className="wa-th__head">
					<span className="wa-th__icon" aria-hidden="true">
						<History size={18} />
					</span>
					<div className="wa-th__titles">
						<h2 id="wa-th-title">{ar ? 'سجل دخول وخروج الفريق' : 'Team log'}</h2>
						<p>{ar ? 'امتى كل واحد فتح واتساب وامتى قفله' : 'When each person opened and closed WhatsApp'}</p>
					</div>
					<div className="wa-th__range" role="radiogroup" aria-label={ar ? 'الفترة' : 'Range'}>
						{RANGES.map(([n, a, e]) => (
							<button key={n} type="button" role="radio" aria-checked={days === n} className={days === n ? 'is-on' : ''} onClick={() => setDays(n)}>
								{ar ? a : e}
							</button>
						))}
					</div>
					<button type="button" className="wa-th__x" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}>
						<X size={18} />
					</button>
				</header>

				{state.status === 'error' ? (
					<div className="wa-th__state" role="alert">
						<p>{ar ? 'مقدرناش نجيب السجل.' : 'Could not load the log.'}</p>
						{state.message ? <small>{String(state.message)}</small> : null}
						<button type="button" className="wa-th__retry" onClick={() => void load()}>
							<RotateCcw size={14} aria-hidden="true" />
							{ar ? 'حاول تاني' : 'Try again'}
						</button>
					</div>
				) : state.status === 'loading' && !state.people.length ? (
					<div className="wa-th__body" aria-busy="true">
						<ul className="wa-th__people">
							{[0, 1, 2, 3].map(i => (
								<li key={i} className="wa-th__skel" />
							))}
						</ul>
						<div className="wa-th__log">
							{[0, 1, 2].map(i => (
								<div key={i} className="wa-th__skel is-row" />
							))}
						</div>
					</div>
				) : !state.people.length ? (
					<div className="wa-th__state">
						<p>{ar ? 'مفيش حد في فريقك لسه.' : 'Nobody on your team yet.'}</p>
						<small>{ar ? 'السجل بيظهر للكوتشز والموظفين اللي تبعك.' : 'The log shows the coaches and staff who belong to you.'}</small>
					</div>
				) : (
					<div className={`wa-th__body${state.status === 'loading' ? ' is-refreshing' : ''}`}>
						<ul className="wa-th__people" aria-label={ar ? 'الفريق' : 'Team'}>
							{active.length ? active.map(personRow) : <li className="wa-th__empty-note">{ar ? 'محدش فتح واتساب في الفترة دي.' : 'Nobody opened WhatsApp in this range.'}</li>}
							{quiet.length ? (
								<li className="wa-th__quiet">
									<button type="button" className="wa-th__quiet-toggle" aria-expanded={quietOpen} onClick={() => setShowQuiet(v => !v)} disabled={!active.length}>
										<ChevronDown size={15} aria-hidden="true" />
										<span>{ar ? 'من غير نشاط' : 'No activity'}</span>
										<b>{quiet.length}</b>
									</button>
								</li>
							) : null}
							{quiet.length && quietOpen ? quiet.map(personRow) : null}
						</ul>

						<div className="wa-th__log" aria-live="polite">
							{person ? (
								<>
									<div className="wa-th__log-head">
										<b dir="auto">{person.name}</b>
										{viewAsButton(person, true)}
										<span>
											{ar ? `${person.sessions.length} مرة · ${duration(person.totalSeconds, true)}` : `${person.sessions.length} sitting${person.sessions.length === 1 ? '' : 's'} · ${duration(person.totalSeconds, false)}`}
										</span>
									</div>
									{groups.length ? (
										groups.map(g => (
											<section key={g.key} className="wa-th__day">
												<h3>
													<span>{g.label}</span>
													<span className="wa-th__day-total">{duration(g.total, ar)}</span>
												</h3>
												<ol>
													{g.items.map(s => (
														<li key={s.startedAt} className={`wa-th__row${s.live ? ' is-live' : ''}`}>
															<span className="wa-th__t">
																<LogIn size={13} aria-hidden="true" />
																<span className="wa-th__clock">{clock(s.startedAt, ar)}</span>
															</span>
															<span className="wa-th__bar" aria-hidden="true" />
															<span className="wa-th__t">
																{s.live ? (
																	<span className="wa-th__now">{ar ? 'لسه فاتح' : 'still open'}</span>
																) : (
																	<>
																		<LogOut size={13} aria-hidden="true" />
																		<span className="wa-th__clock" title={s.endEstimated ? (ar ? 'تقريبي: آخر نشاط اتسجّل، الخروج نفسه ما اتسجلش' : 'Approximate: the last recorded activity (the close itself was not seen)') : undefined}>
																			{s.endEstimated ? '≈ ' : ''}
																			{clock(s.endedAt, ar)}
																		</span>
																	</>
																)}
															</span>
															<span className="wa-th__dur">{duration(s.durationSeconds, ar)}</span>
														</li>
													))}
												</ol>
											</section>
										))
									) : (
										<p className="wa-th__none">{ar ? 'ما فتحش واتساب في الفترة دي.' : 'Did not open WhatsApp in this range.'}</p>
									)}
								</>
							) : null}
						</div>
					</div>
				)}

				<p className="wa-th__foot">
					{ar
						? 'بيتسجّل أول ما يفتح واتساب في أي تابة وآخر ما يقفل كل التابات. «≈» = الخروج ما اتسجلش (زي ريستارت للسيرفر)، فبنعرض آخر نشاط.'
						: 'Logged when they open WhatsApp in any tab and when they close the last one. “≈” = the close was not seen (e.g. a server restart), so the last activity is shown.'}
				</p>
			</div>
		</div>,
		document.body,
	);
}
