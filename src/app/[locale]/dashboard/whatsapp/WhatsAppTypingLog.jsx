'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Keyboard, Loader2, MessageCircle, Mic, RefreshCw, Search, Timer, X } from 'lucide-react';
import api from '@/utils/axios';
import {
	TYPING_LOG_FILTERS,
	TYPING_LOG_RANGES,
	TYPING_WINDOW_DEFAULT,
	TYPING_WINDOW_MAX,
	TYPING_WINDOW_MIN,
	formatTypingDuration,
	formatTypingTime,
	parseTypingWindow,
	typingAttemptWindow,
	typingElapsedMs,
	typingLogCopy,
	typingNow,
	typingRangeParams,
	typingStatusLabel,
	upsertTypingAttempt,
} from './whatsapp-typing-log';
import './wa-typing-log.css';

const PAGE_SIZE = 50;

function useNowTicker(active, intervalMs = 15_000) {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!active) return undefined;
		const id = window.setInterval(() => setTick(value => value + 1), intervalMs);
		return () => window.clearInterval(id);
	}, [active, intervalMs]);
}

function StatusBadge({ attempt, copy }) {
	const live = attempt.status === 'typing';
	return (
		<span className={`wa-tl-badge is-${attempt.status}`}>
			{live ? (
				<span className="wa-tl-dots" aria-hidden>
					<i />
					<i />
					<i />
				</span>
			) : null}
			{attempt.kind === 'recording' ? <Mic size={12} aria-hidden /> : null}
			{typingStatusLabel(attempt, copy)}
		</span>
	);
}

function MessageCell({ attempt, copy }) {
	if (!attempt.messageAt) {
		return <span className="wa-tl-muted">{copy.noMessageYet}</span>;
	}
	return (
		<span className="wa-tl-stack">
			<span>
				{copy.messageAt} {formatTypingTime(attempt.messageAt, copy.ar, false)}
			</span>
			<span className="wa-tl-muted">
				{formatTypingDuration(attempt.gapFromLastTypingMs, copy.ar)} {copy.afterLast}
				{attempt.sentWithinMinutes ? ` · ${copy.withinBucket(attempt.sentWithinMinutes)}` : ''}
			</span>
		</span>
	);
}

function DurationCell({ attempt, copy, nowMs }) {
	if (attempt.messageAt) {
		return (
			<span className="wa-tl-stack">
				<span>{formatTypingDuration(attempt.gapFromStartMs, copy.ar)}</span>
				<span className="wa-tl-muted">{copy.afterStart}</span>
			</span>
		);
	}
	const elapsed = typingElapsedMs(attempt, nowMs);
	if (elapsed == null) return <span className="wa-tl-muted">—</span>;
	const checkpoint = attempt.status === 'no_message' ? typingAttemptWindow(attempt) : attempt.checkpointMinutes;
	return (
		<span className="wa-tl-stack">
			<span>{copy.sinceTyping(formatTypingDuration(elapsed, copy.ar))}</span>
			{checkpoint ? <span className="wa-tl-muted">{copy.passedCheckpoint(checkpoint)}</span> : null}
		</span>
	);
}

/** Account setting: minutes without a message before an attempt counts as "no message". */
function NoMessageWindowControl({ accountId, value, copy, onSaved }) {
	const [draft, setDraft] = useState(String(value));
	const [state, setState] = useState('idle');
	useEffect(() => {
		setDraft(String(value));
		setState('idle');
	}, [value, accountId]);

	const parsed = parseTypingWindow(draft);
	const dirty = parsed !== null && parsed !== value;
	const invalid = draft.trim() !== '' && parsed === null;

	const save = async event => {
		event.preventDefault();
		if (!dirty || state === 'saving') return;
		setState('saving');
		try {
			const { data } = await api.put('/whatsapp/typing-attempts/settings', {
				accountId,
				noMessageWindowMinutes: parsed,
			});
			onSaved(Number(data?.windowMinutes) || parsed);
			setState('saved');
		} catch {
			setState('error');
		}
	};

	const note = invalid
		? copy.windowInvalid
		: state === 'error'
			? copy.windowError
			: state === 'saved'
				? copy.windowSaved
				: '';

	return (
		<form className="wa-tl-window" onSubmit={save} title={copy.windowHint}>
			<Timer size={15} aria-hidden />
			<label htmlFor="wa-tl-window-input">{copy.windowLabel}</label>
			<input
				id="wa-tl-window-input"
				type="number"
				inputMode="numeric"
				min={TYPING_WINDOW_MIN}
				max={TYPING_WINDOW_MAX}
				step={1}
				value={draft}
				aria-invalid={invalid || undefined}
				onChange={event => {
					setDraft(event.target.value);
					setState('idle');
				}}
			/>
			<span className="wa-tl-window__unit">{copy.windowUnit}</span>
			{dirty ? (
				<button type="submit" disabled={state === 'saving'}>
					{state === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
					{copy.windowSave}
				</button>
			) : null}
			{note ? (
				<span className={`wa-tl-window__note ${state === 'saved' && !invalid ? 'is-ok' : 'is-bad'}`} role="status">
					{note}
				</span>
			) : null}
		</form>
	);
}

/** Full-width typing log for the WhatsApp workspace (scoped server-side like the inbox). */
export default function WhatsAppTypingLogTab({ locale, accountId, liveEvent, onOpenConversation }) {
	const [windowMinutes, setWindowMinutes] = useState(TYPING_WINDOW_DEFAULT);
	const copy = useMemo(() => typingLogCopy(locale, windowMinutes), [locale, windowMinutes]);
	const [chatId, setChatId] = useState('');
	const [chats, setChats] = useState([]);
	const [filter, setFilter] = useState('all');
	const [range, setRange] = useState('today');
	const [custom, setCustom] = useState({ from: '', to: '' });
	const [query, setQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [items, setItems] = useState([]);
	const [counts, setCounts] = useState(null);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState('');
	const [skew, setSkew] = useState(0);
	const requestRef = useRef(0);
	const countsTimerRef = useRef(null);

	const rangeParams = useMemo(() => typingRangeParams(range, custom), [range, custom]);

	useEffect(() => {
		const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
		return () => window.clearTimeout(id);
	}, [query]);

	useEffect(() => {
		setChatId('');
		setWindowMinutes(TYPING_WINDOW_DEFAULT);
	}, [accountId]);

	const loadChats = useCallback(async () => {
		if (!accountId) return;
		try {
			const { data } = await api.get('/whatsapp/typing-attempts/chats', {
				params: { accountId, ...rangeParams },
			});
			setChats(Array.isArray(data?.items) ? data.items : []);
		} catch {
			setChats([]);
		}
	}, [accountId, rangeParams]);

	useEffect(() => {
		void loadChats();
	}, [loadChats]);

	const chatOptions = useMemo(() => {
		if (!chatId || chats.some(chat => chat.conversationId === chatId)) return chats;
		const row = items.find(item => item.conversationId === chatId);
		return [{ conversationId: chatId, name: row?.name || null, phone: row?.phone || null, attempts: null }, ...chats];
	}, [chats, chatId, items]);

	const fetchPage = useCallback(
		async ({ offset = 0, limit = PAGE_SIZE } = {}) => {
			const { data } = await api.get('/whatsapp/typing-attempts', {
				params: {
					accountId,
					conversationId: chatId || undefined,
					filter,
					q: debouncedQuery || undefined,
					limit,
					offset,
					...rangeParams,
				},
			});
			return data || {};
		},
		[accountId, chatId, filter, debouncedQuery, rangeParams],
	);

	const reload = useCallback(async () => {
		if (!accountId) return;
		const requestId = ++requestRef.current;
		setLoading(true);
		setError('');
		try {
			const data = await fetchPage();
			if (requestId !== requestRef.current) return;
			setItems(Array.isArray(data.items) ? data.items : []);
			setCounts(data.counts || null);
			setHasMore(Boolean(data.hasMore));
			if (Number(data.windowMinutes) > 0) setWindowMinutes(Number(data.windowMinutes));
			if (data.now) setSkew(new Date(data.now).getTime() - Date.now());
		} catch {
			if (requestId === requestRef.current) setError(copy.error);
		} finally {
			if (requestId === requestRef.current) setLoading(false);
		}
	}, [accountId, fetchPage, copy.error]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const loadMore = useCallback(async () => {
		if (loadingMore || !hasMore) return;
		setLoadingMore(true);
		try {
			const data = await fetchPage({ offset: items.length });
			const next = Array.isArray(data.items) ? data.items : [];
			setItems(current => {
				const seen = new Set(current.map(item => item.id));
				return [...current, ...next.filter(item => !seen.has(item.id))];
			});
			setHasMore(Boolean(data.hasMore));
		} catch {
			setError(copy.error);
		} finally {
			setLoadingMore(false);
		}
	}, [fetchPage, hasMore, items.length, loadingMore, copy.error]);

	// Live rows from the socket; counts are re-read once things settle.
	useEffect(() => {
		const attempt = liveEvent?.attempt;
		if (!attempt || (accountId && attempt.accountId !== accountId)) return;
		setItems(current =>
			upsertTypingAttempt(current, attempt, {
				filter,
				range: rangeParams,
				query: debouncedQuery,
				conversationId: chatId,
			}),
		);
		if (countsTimerRef.current) window.clearTimeout(countsTimerRef.current);
		countsTimerRef.current = window.setTimeout(async () => {
			try {
				const data = await fetchPage({ limit: 1 });
				if (data.counts) setCounts(data.counts);
			} catch {
				/* counts stay as they were */
			}
		}, 2_000);
	}, [liveEvent, accountId, chatId, filter, rangeParams, debouncedQuery, fetchPage]);

	useEffect(
		() => () => {
			if (countsTimerRef.current) window.clearTimeout(countsTimerRef.current);
		},
		[],
	);

	const hasOpen = items.some(item => item.status === 'typing' || item.status === 'stopped');
	useNowTicker(hasOpen);
	const nowMs = typingNow(skew);

	if (!accountId) {
		return (
			<div className="wa-dk wa-secondary-pane wa-tl">
				<p className="wa-tl-empty">{copy.selectAccount}</p>
			</div>
		);
	}

	return (
		<div className="wa-dk wa-secondary-pane wa-tl" dir={copy.ar ? 'rtl' : 'ltr'}>
			<header className="wa-tl-head">
				<div className="wa-tl-head__title">
					<span className="wa-tl-head__icon" aria-hidden>
						<Keyboard size={18} />
					</span>
					<div>
						<h2>{copy.title}</h2>
						<p>{copy.subtitle}</p>
					</div>
				</div>
				<div className="wa-tl-head__actions">
					<NoMessageWindowControl
						accountId={accountId}
						value={windowMinutes}
						copy={copy}
						onSaved={minutes => {
							setWindowMinutes(minutes);
							window.setTimeout(() => void reload(), 1_500);
						}}
					/>
					<button
						type="button"
						className="wa-tl-iconbtn"
						onClick={() => {
							void reload();
							void loadChats();
						}}
						disabled={loading}
						aria-label={copy.retry}
						title={copy.retry}
					>
						<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
					</button>
				</div>
			</header>

			<div className="wa-tl-chips" role="tablist" aria-label={copy.cols.status}>
				{TYPING_LOG_FILTERS.map(key => (
					<button
						key={key}
						type="button"
						role="tab"
						aria-selected={filter === key}
						className={`wa-tl-chip is-${key} ${filter === key ? 'is-on' : ''}`}
						onClick={() => setFilter(key)}
					>
						<span>{copy.filters[key]}</span>
						{counts ? <b>{counts[key] ?? 0}</b> : null}
					</button>
				))}
			</div>

			<div className="wa-tl-toolbar">
				<label className="wa-tl-search">
					<Search size={15} aria-hidden />
					<input
						type="search"
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder={copy.search}
						aria-label={copy.search}
					/>
					{query ? (
						<button type="button" onClick={() => setQuery('')} aria-label="Clear">
							<X size={14} />
						</button>
					) : null}
				</label>
				<label className={`wa-tl-chat ${chatId ? 'is-on' : ''}`}>
					<MessageCircle size={15} aria-hidden />
					<select
						value={chatId}
						onChange={event => setChatId(event.target.value)}
						aria-label={copy.chatFilter}
					>
						<option value="">{copy.allChats}</option>
						{chatOptions.map(chat => (
							<option key={chat.conversationId} value={chat.conversationId}>
								{[chat.name || copy.unknown, chat.phone ? `+${chat.phone}` : '', chat.attempts ? `(${chat.attempts})` : '']
									.filter(Boolean)
									.join(' ')}
							</option>
						))}
					</select>
					{chatId ? (
						<button type="button" onClick={() => setChatId('')} aria-label={copy.clearChat} title={copy.clearChat}>
							<X size={14} />
						</button>
					) : null}
				</label>
				<div className="wa-tl-seg" role="radiogroup">
					{TYPING_LOG_RANGES.map(key => (
						<button
							key={key}
							type="button"
							role="radio"
							aria-checked={range === key}
							className={range === key ? 'is-on' : ''}
							onClick={() => setRange(key)}
						>
							{copy.ranges[key]}
						</button>
					))}
				</div>
				{range === 'custom' ? (
					<div className="wa-tl-dates">
						<label>
							<span>{copy.from}</span>
							<input
								type="date"
								value={custom.from}
								onChange={event => setCustom(current => ({ ...current, from: event.target.value }))}
							/>
						</label>
						<label>
							<span>{copy.to}</span>
							<input
								type="date"
								value={custom.to}
								onChange={event => setCustom(current => ({ ...current, to: event.target.value }))}
							/>
						</label>
					</div>
				) : null}
			</div>

			<div className="wa-tl-body nice-scroll">
				{error ? (
					<div className="wa-tl-error" role="alert">
						<span>{error}</span>
						<button type="button" onClick={() => void reload()}>
							{copy.retry}
						</button>
					</div>
				) : null}
				{loading && !items.length ? (
					<div className="wa-tl-empty" role="status">
						<Loader2 size={18} className="animate-spin" />
						{copy.loading}
					</div>
				) : !items.length && !error ? (
					<p className="wa-tl-empty">{copy.empty}</p>
				) : (
					<div className="wa-tl-table" role="table">
						<div className="wa-tl-row is-head" role="row">
							<span role="columnheader">{copy.cols.customer}</span>
							<span role="columnheader">{copy.cols.started}</span>
							<span role="columnheader">{copy.cols.last}</span>
							<span role="columnheader">{copy.cols.status}</span>
							<span role="columnheader">{copy.cols.message}</span>
							<span role="columnheader">{copy.cols.waiting}</span>
							<span role="columnheader" aria-hidden />
						</div>
						{items.map(attempt => (
							<div key={attempt.id} className={`wa-tl-row is-${attempt.status}`} role="row">
								<span className="wa-tl-cell wa-tl-customer" role="cell">
									<button
										type="button"
										className="wa-tl-customer__name wa-privacy-sensitive"
										dir="auto"
										onClick={() => setChatId(attempt.conversationId)}
										title={copy.onlyThisChat}
										disabled={chatId === attempt.conversationId}
									>
										{attempt.name || attempt.phone || copy.unknown}
									</button>
									{attempt.phone ? (
										<span className="wa-tl-muted wa-privacy-sensitive" dir="ltr">
											+{attempt.phone}
										</span>
									) : null}
								</span>
								<span className="wa-tl-cell" role="cell" data-label={copy.cols.started}>
									{formatTypingTime(attempt.startedAt, copy.ar)}
								</span>
								<span className="wa-tl-cell" role="cell" data-label={copy.cols.last}>
									{formatTypingTime(attempt.lastTypingAt, copy.ar, false)}
									{attempt.eventCount > 1 ? (
										<span className="wa-tl-muted"> · {copy.events(attempt.eventCount)}</span>
									) : null}
								</span>
								<span className="wa-tl-cell" role="cell" data-label={copy.cols.status}>
									<StatusBadge attempt={attempt} copy={copy} />
									{attempt.superseded ? <span className="wa-tl-muted wa-tl-note">{copy.superseded}</span> : null}
								</span>
								<span className="wa-tl-cell" role="cell" data-label={copy.cols.message}>
									<MessageCell attempt={attempt} copy={copy} />
								</span>
								<span className="wa-tl-cell" role="cell" data-label={copy.cols.waiting}>
									<DurationCell attempt={attempt} copy={copy} nowMs={nowMs} />
								</span>
								<span className="wa-tl-cell wa-tl-actions" role="cell">
									{typeof onOpenConversation === 'function' ? (
										<button
											type="button"
											className="wa-tl-iconbtn"
											onClick={() => onOpenConversation(attempt.conversationId)}
											title={copy.openChat}
											aria-label={copy.openChat}
										>
											<MessageCircle size={16} />
										</button>
									) : null}
								</span>
							</div>
						))}
					</div>
				)}
				{hasMore ? (
					<div className="wa-tl-more">
						<button type="button" onClick={() => void loadMore()} disabled={loadingMore}>
							{loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
							{copy.loadMore}
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}

/** Strip under the chat header: this conversation's typing attempts, newest first. */
export function TypingHistoryPanel({ locale, open, conversationId, liveEvent, onHide }) {
	const copy = useMemo(() => typingLogCopy(locale), [locale]);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [skew, setSkew] = useState(0);
	const requestRef = useRef(0);

	const load = useCallback(async () => {
		if (!conversationId) return;
		const requestId = ++requestRef.current;
		setLoading(true);
		setError('');
		try {
			const { data } = await api.get('/whatsapp/typing-attempts', {
				params: { conversationId, limit: 30 },
			});
			if (requestId !== requestRef.current) return;
			setItems(Array.isArray(data?.items) ? data.items : []);
			if (data?.now) setSkew(new Date(data.now).getTime() - Date.now());
		} catch {
			if (requestId === requestRef.current) setError(copy.error);
		} finally {
			if (requestId === requestRef.current) setLoading(false);
		}
	}, [conversationId, copy.error]);

	useEffect(() => {
		setItems([]);
		if (open) void load();
	}, [open, load]);

	useEffect(() => {
		const attempt = liveEvent?.attempt;
		if (!open || !attempt || attempt.conversationId !== conversationId) return;
		setItems(current => upsertTypingAttempt(current, attempt));
	}, [liveEvent, open, conversationId]);

	const hasOpen = items.some(item => item.status === 'typing' || item.status === 'stopped');
	useNowTicker(open && hasOpen);
	const nowMs = typingNow(skew);

	if (!open) return null;

	return (
		<div className="wa-tl-panel" dir={copy.ar ? 'rtl' : 'ltr'}>
			<div className="wa-tl-panel__head">
				<span className="wa-tl-head__icon is-sm" aria-hidden>
					<Keyboard size={15} />
				</span>
				<b>{copy.historyTitle}</b>
				{loading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
				<span className="wa-tl-panel__spacer" />
				<button type="button" className="wa-tl-iconbtn" onClick={() => void load()} aria-label={copy.retry} title={copy.retry}>
					<RefreshCw size={15} />
				</button>
				<button type="button" className="wa-tl-iconbtn" onClick={onHide} aria-label={copy.hide} title={copy.hide}>
					<X size={16} />
				</button>
			</div>
			<div className="wa-tl-panel__list nice-scroll">
				{error ? <p className="wa-tl-empty">{error}</p> : null}
				{!loading && !error && !items.length ? <p className="wa-tl-empty">{copy.emptyChat}</p> : null}
				{items.map(attempt => (
					<div key={attempt.id} className={`wa-tl-item is-${attempt.status}`}>
						<div className="wa-tl-item__top">
							<StatusBadge attempt={attempt} copy={copy} />
							<span className="wa-tl-muted">{formatTypingTime(attempt.startedAt, copy.ar)}</span>
						</div>
						<div className="wa-tl-item__meta">
							<span>
								{copy.cols.last}: {formatTypingTime(attempt.lastTypingAt, copy.ar, false)}
							</span>
							{attempt.messageAt ? (
								<span>
									{copy.messageAt} {formatTypingTime(attempt.messageAt, copy.ar, false)} ·{' '}
									{formatTypingDuration(attempt.gapFromLastTypingMs, copy.ar)} {copy.afterLast}
								</span>
							) : (
								<DurationCell attempt={attempt} copy={copy} nowMs={nowMs} />
							)}
							{attempt.superseded ? <span className="wa-tl-muted">{copy.superseded}</span> : null}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
