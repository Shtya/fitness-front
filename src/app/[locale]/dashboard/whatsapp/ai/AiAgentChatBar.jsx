'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Brain, Check, ChevronDown, Loader2, Pencil, Play, Send, Trash2, X } from 'lucide-react';
import { apiErrorMessage, whatsappAiAgentApi } from './whatsapp-ai-api';
import { AI_AGENT_STATE_EVENT } from './agent-events';
import { agentCopy, reasonLabel } from './agent-copy';

const MODES = ['inherit', 'auto', 'suggest', 'off'];

function chipFor(state, settings) {
	if (!settings?.enabled) return { key: 'off', tone: 'muted' };
	const status = state?.status;
	if (status === 'waiting' || status === 'generating') return { key: status, tone: 'live' };
	if (status === 'handoff') return { key: 'handoff', tone: 'warn' };
	if (status === 'error') return { key: 'error', tone: 'danger' };
	if (state?.pausedUntil) return { key: 'paused', tone: 'warn' };
	const mode = state?.effectiveMode || 'off';
	return { key: mode, tone: mode === 'off' ? 'muted' : 'ok' };
}

const TONE_CLASS = {
	ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
	live: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
	warn: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
	danger: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
	muted: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
};

/**
 * Per-chat agent strip: live status chip, mode switch (account default / auto /
 * suggest / off), resume after a pause or hand-off, contact memory, and the
 * pending draft reply when the agent is in suggest mode.
 */
export default function AiAgentChatBar({ conversationId, locale = 'en', canUse = false, onSent }) {
	const text = agentCopy(locale);
	const [data, setData] = useState(null);
	const [busy, setBusy] = useState('');
	const [error, setError] = useState('');
	const [menuOpen, setMenuOpen] = useState(false);
	const [memoryOpen, setMemoryOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [draftText, setDraftText] = useState('');
	const menuRef = useRef(null);

	useEffect(() => {
		setData(null);
		setError('');
		setEditing(false);
		setMenuOpen(false);
		setMemoryOpen(false);
		if (!conversationId) return undefined;
		const controller = new AbortController();
		whatsappAiAgentApi
			.getConversation(conversationId, controller.signal)
			.then(setData)
			.catch(() => {
				/* agent unavailable for this chat: stay hidden */
			});
		return () => controller.abort();
	}, [conversationId]);

	useEffect(() => {
		const onState = event => {
			const next = event.detail;
			if (!next || next.conversationId !== conversationId) return;
			setData(current => (current ? { ...current, state: { ...current.state, ...next } } : current));
		};
		window.addEventListener(AI_AGENT_STATE_EVENT, onState);
		return () => window.removeEventListener(AI_AGENT_STATE_EVENT, onState);
	}, [conversationId]);

	useEffect(() => {
		if (!menuOpen) return undefined;
		const close = event => {
			if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
		};
		const onKey = event => event.key === 'Escape' && setMenuOpen(false);
		document.addEventListener('pointerdown', close);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', close);
			document.removeEventListener('keydown', onKey);
		};
	}, [menuOpen]);

	const suggestion = data?.state?.pendingSuggestion || null;
	useEffect(() => {
		setEditing(false);
		setDraftText(suggestion?.text || '');
	}, [suggestion?.runId, suggestion?.text]);

	const run = useCallback(
		async (key, action) => {
			setBusy(key);
			setError('');
			try {
				const next = await action();
				if (next?.state) setData(next);
				else if (next?.agent) setData(next.agent);
				return next;
			} catch (actionError) {
				setError(apiErrorMessage(actionError, key === 'send' ? text.sendFailed : 'Failed'));
				return null;
			} finally {
				setBusy('');
			}
		},
		[text.sendFailed],
	);

	if (!conversationId || !data?.settings?.enabled) return null;
	const state = data.state || {};
	const chip = chipFor(state, data.settings);
	const pausedUntil = state.pausedUntil ? new Date(state.pausedUntil) : null;
	const formatter = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
	const canResume = canUse && (Boolean(pausedUntil) || state.status === 'handoff' || state.status === 'error');
	const memory = data.memory || { facts: [], commitments: [] };
	const memoryCount = memory.facts.length + memory.commitments.length;
	const modeLabel = mode =>
		mode === 'inherit'
			? `${text.modeInherit} (${data.settings.scope === 'all' ? (data.settings.defaultMode === 'auto' ? text.modeAuto : text.modeSuggest) : text.modeOff})`
			: mode === 'auto'
				? text.modeAuto
				: mode === 'suggest'
					? text.modeSuggest
					: text.modeOff;

	return (
		<div data-wa-ai-agent-bar className="relative z-10 shrink-0 border-b border-slate-100 bg-white/95 px-3 py-1.5 text-[12px] dark:border-slate-800 dark:bg-[#111b21]/95">
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold ring-1 ${TONE_CLASS[chip.tone]}`} data-wa-ai-agent-status={chip.key}>
					{chip.tone === 'live' ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Bot size={12} aria-hidden="true" />}
					{text.chip[chip.key] || chip.key}
				</span>
				{pausedUntil ? (
					<span className="text-slate-400">{text.pausedUntil.replace('{time}', formatter.format(pausedUntil))}</span>
				) : null}
				{state.statusReason && (chip.tone === 'warn' || chip.tone === 'danger') ? (
					<span className="truncate text-slate-400">{reasonLabel(text, state.statusReason)}</span>
				) : null}
				<span className="ms-auto" />
				{canResume ? (
					<button
						type="button"
						disabled={Boolean(busy)}
						onClick={() => void run('resume', () => whatsappAiAgentApi.resume(conversationId))}
						className="inline-flex h-7 items-center gap-1 rounded-lg px-2 font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
					>
						{busy === 'resume' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
						{text.resume}
					</button>
				) : null}
				<button
					type="button"
					aria-expanded={memoryOpen}
					onClick={() => setMemoryOpen(open => !open)}
					title={text.memory}
					aria-label={text.memory}
					className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 ${memoryOpen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
				>
					<Brain size={13} />
					{memoryCount ? <span className="font-bold">{memoryCount}</span> : null}
				</button>
				{canUse ? (
					<div ref={menuRef} className="relative">
						<button
							type="button"
							aria-haspopup="menu"
							aria-expanded={menuOpen}
							aria-label={text.chatMode}
							title={text.chatMode}
							onClick={() => setMenuOpen(open => !open)}
							className="inline-flex h-7 items-center gap-1 rounded-lg px-2 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
						>
							{modeLabel(state.mode || 'inherit')}
							<ChevronDown size={13} />
						</button>
						{menuOpen ? (
							<div role="menu" aria-label={text.chatMode} className="absolute end-0 top-full z-30 mt-1 min-w-[14rem] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-[#233138]">
								{MODES.map(mode => (
									<button
										key={mode}
										type="button"
										role="menuitemradio"
										aria-checked={(state.mode || 'inherit') === mode}
										onClick={() => {
											setMenuOpen(false);
											void run('mode', () => whatsappAiAgentApi.setMode(conversationId, mode));
										}}
										className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[13px] hover:bg-slate-100 dark:hover:bg-slate-700/60"
									>
										<span className="grid w-4 place-items-center">
											{(state.mode || 'inherit') === mode ? <Check size={14} className="text-emerald-600" /> : null}
										</span>
										{modeLabel(mode)}
									</button>
								))}
							</div>
						) : null}
					</div>
				) : null}
			</div>

			{memoryOpen ? (
				<div className="mt-1.5 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
					<div className="mb-1 flex items-center gap-2">
						<p className="flex-1 font-bold text-slate-600 dark:text-slate-300">{text.memory}</p>
						{canUse && memoryCount ? (
							<button
								type="button"
								disabled={Boolean(busy)}
								onClick={() => void run('memory', () => whatsappAiAgentApi.clearMemory(conversationId))}
								className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30"
							>
								<Trash2 size={12} />
								{text.clearMemory}
							</button>
						) : null}
					</div>
					{memoryCount ? (
						<ul className="list-disc space-y-0.5 ps-4 text-slate-600 dark:text-slate-300">
							{[...memory.facts, ...memory.commitments].map((item, index) => (
								<li key={`${item.at}-${index}`} dir="auto">{item.text}</li>
							))}
						</ul>
					) : (
						<p className="text-slate-400">{text.memoryEmpty}</p>
					)}
				</div>
			) : null}

			{suggestion ? (
				<div data-wa-ai-agent-suggestion className="mt-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
					<p className="mb-1 flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
						<Bot size={13} />
						{text.suggestionTitle}
					</p>
					{editing ? (
						<textarea
							value={draftText}
							onChange={event => setDraftText(event.target.value)}
							rows={3}
							maxLength={4000}
							dir="auto"
							aria-label={text.suggestionTitle}
							className="w-full resize-y rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-emerald-400 dark:border-emerald-900 dark:bg-slate-900"
						/>
					) : (
						<p className="max-h-28 overflow-y-auto whitespace-pre-line text-[13px] text-slate-800 dark:text-slate-100" dir="auto">{suggestion.text}</p>
					)}
					{suggestion.reasons?.length ? (
						<p className="mt-1 flex flex-wrap gap-1">
							{suggestion.reasons.map(reason => (
								<span key={reason} className="rounded bg-amber-100/80 px-1.5 text-[11px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{reasonLabel(text, reason)}</span>
							))}
						</p>
					) : null}
					{canUse ? (
						<div className="mt-1.5 flex flex-wrap justify-end gap-1">
							<button
								type="button"
								disabled={Boolean(busy)}
								onClick={() => void run('dismiss', () => whatsappAiAgentApi.dismissSuggestion(conversationId))}
								className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-slate-500 hover:bg-white/70 disabled:opacity-50 dark:hover:bg-slate-800"
							>
								<X size={13} />
								{text.suggestionDismiss}
							</button>
							{!editing ? (
								<button
									type="button"
									disabled={Boolean(busy)}
									onClick={() => setEditing(true)}
									className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-slate-600 hover:bg-white/70 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
								>
									<Pencil size={13} />
									{text.suggestionEdit}
								</button>
							) : null}
							<button
								type="button"
								disabled={Boolean(busy) || !draftText.trim()}
								onClick={async () => {
									const result = await run('send', () =>
										whatsappAiAgentApi.sendSuggestion(conversationId, editing ? draftText : null),
									);
									if (result?.message) onSent?.(result.message);
								}}
								className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#00A884] px-2.5 font-bold text-white hover:bg-[#008f72] disabled:opacity-50"
							>
								{busy === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className="rtl:-scale-x-100" />}
								{busy === 'send' ? text.suggestionSending : text.suggestionSend}
							</button>
						</div>
					) : null}
				</div>
			) : null}
			{error ? <p className="mt-1 text-rose-600">{error}</p> : null}
		</div>
	);
}
