'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Copy, MessageSquarePlus, RefreshCw, Send, ShieldQuestion, Square, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { errorMessage, pmApi } from '../api';
import { Markdown } from '../Markdown';
import { useProjectMind } from '../ProjectMindContext';
import { AiKeyBanner, ConfidenceBadge, ConfirmDialog, CopyButton, EmptyState, ErrorState, InlineWarning, LabelBadge, RequireProject, SkeletonRows, SourceChip, Spinner } from '../ui';

export const STYLES = ['technical', 'business', 'client'];
const SUGGESTIONS = ['q1', 'q2', 'q3', 'q4'];

function Answer({ m, t, onFollowUp }) {
	const meta = m.meta || {};
	const status = meta.status;
	const claims = meta.claims || [];
	const sources = meta.sources || [];
	const [showSnippets, setShowSnippets] = useState(false);

	if (status === 'insufficient_evidence') {
		return (
			<div className="rounded-xl border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60" role="status">
				<p className="flex items-start gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
					<ShieldQuestion className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden /> {m.content}
				</p>
				{meta.notes?.length ? <p className="mt-2 text-xs text-slate-500">{meta.notes[0]}</p> : null}
				<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('insufficientHelp')}</p>
			</div>
		);
	}
	if (status === 'blocked') {
		return <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" role="status">{m.content}</div>;
	}
	if (status === 'provider_error') {
		return (
			<div className="space-y-2">
				<div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
					<p>{m.content}</p>
					{meta.providerError?.code ? <p className="mt-1 text-xs opacity-80"><bdi dir="ltr">{meta.providerError.code}</bdi></p> : null}
				</div>
				{meta.retrievedOnly?.length ? (
					<div>
						<p className="mb-2 text-xs font-medium text-slate-500">{t('retrievedOnly')}</p>
						<ul className="grid gap-2 md:grid-cols-2">
							{meta.retrievedOnly.map((s) => (
								<li key={s.n} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
									<div className="border-b border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-800/60"><SourceChip {...s} /></div>
									<pre dir="ltr" className="max-h-28 overflow-hidden p-2 text-[11.5px] leading-[1.45] text-slate-700 dark:text-slate-200">{String(s.snippet || '').split(String.fromCharCode(10)).slice(0, 7).join(String.fromCharCode(10))}</pre>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		);
	}

	const byLabel = ['verified', 'inferred', 'missing', 'recommended'].map((l) => [l, claims.filter((c) => c.label === l)]).filter(([, a]) => a.length);
	return (
		<div className="space-y-3">
			<Markdown>{m.content}</Markdown>
			{byLabel.length ? (
				<div className="space-y-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
					{byLabel.map(([label, list]) => (
						<div key={label} className="space-y-1">
							<LabelBadge label={label} />
							<ul className="space-y-1 ps-1">
								{list.map((c, i) => (
									<li key={i} dir="auto" className="text-sm text-slate-700 dark:text-slate-200">
										{c.text}{' '}
										{c.sources.map((n) => {
											const s = sources.find((x) => x.n === n);
											return s ? <SourceChip key={n} {...s} /> : null;
										})}
										{c.downgraded ? <span className="ms-1 text-xs text-amber-700 dark:text-amber-300">({t('downgraded')})</span> : null}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			) : null}
			{sources.length ? (
				<div>
					<button className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:underline dark:text-slate-300" onClick={() => setShowSnippets((v) => !v)} aria-expanded={showSnippets}>
						<ChevronDown className={cn('size-3.5 transition-transform', showSnippets && 'rotate-180')} /> {t('sources', { n: sources.length })}
					</button>
					<div className="mt-1.5 space-y-2">
						{sources.map((s) => (
							<div key={s.n}>
								<SourceChip {...s} />
								{showSnippets ? <pre dir="ltr" className="mt-1 max-h-40 overflow-auto rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-900">{s.snippet}</pre> : null}
							</div>
						))}
					</div>
				</div>
			) : null}
			{(meta.notes || []).map((n, i) => <InlineWarning key={i}>{n}</InlineWarning>)}
			<div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
				<ConfidenceBadge confidence={meta.confidence} />
				{meta.model ? <span className="text-xs text-slate-500"><bdi dir="ltr">{meta.model}</bdi> · {meta.latencyMs ? `${(meta.latencyMs / 1000).toFixed(1)}s` : ''}</span> : null}
				<CopyButton text={m.content} label={t('copyAnswer')} className="ms-auto h-7" />
			</div>
			<div className="flex flex-wrap gap-1.5">
				{['followUp1', 'followUp2'].map((k) => (
					<button key={k} onClick={() => onFollowUp(t(k))} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] dark:border-slate-700 dark:hover:bg-slate-800">
						{t(k)}
					</button>
				))}
			</div>
		</div>
	);
}

export default function ChatView() {
	return (
		<RequireProject needReady>
			<Inner />
		</RequireProject>
	);
}

function Inner() {
	const t = useTranslations('projectmind.chat');
	const tc = useTranslations('projectmind.common');
	const qc = useQueryClient();
	const { projectId } = useProjectMind();
	const [cid, setCid] = useState(null);
	const [style, setStyle] = useState('technical');
	const [input, setInput] = useState('');
	const [pending, setPending] = useState(null); // the question currently being answered
	const [toDelete, setToDelete] = useState(null);
	const abortRef = useRef(null);
	const endRef = useRef(null);
	const scrollRef = useRef(null);
	const lastQuestion = useRef('');
	const params = useSearchParams();
	const autoSent = useRef(false);

	const aiQ = useQuery({ queryKey: ['pm', 'ai-status'], queryFn: pmApi.aiStatus, staleTime: 60_000 });
	const convsQ = useQuery({ queryKey: ['pm', 'convs', projectId], queryFn: () => pmApi.conversations(projectId) });
	const msgsQ = useQuery({ queryKey: ['pm', 'msgs', projectId, cid], queryFn: () => pmApi.conversation(projectId, cid), enabled: !!cid });
	const messages = msgsQ.data?.messages || [];

	useEffect(() => {
		// Scroll only the message list; scrollIntoView would also move the whole page under the sticky header.
		const el = scrollRef.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
	}, [messages.length, pending]);

	const ask = useMutation({
		mutationFn: ({ question }) => {
			const ctrl = new AbortController();
			abortRef.current = ctrl;
			return pmApi.ask(projectId, { question, conversationId: cid || undefined, style }, ctrl.signal);
		},
		onSuccess: (r) => {
			setCid(r.conversationId);
			qc.invalidateQueries({ queryKey: ['pm', 'convs', projectId] });
			qc.invalidateQueries({ queryKey: ['pm', 'msgs', projectId] });
			qc.invalidateQueries({ queryKey: ['pm', 'dashboard'] });
		},
		onError: (e) => {
			if (e?.code === 'ERR_CANCELED') return toast(t('stopped'));
			toast.error(errorMessage(e));
		},
		onSettled: () => {
			setPending(null);
			abortRef.current = null;
		},
	});

	const send = useCallback(
		(text) => {
			const question = (text ?? input).trim();
			if (!question || ask.isPending) return;
			lastQuestion.current = question;
			setPending(question);
			setInput('');
			ask.mutate({ question });
		},
		[ask, input],
	);

	// Deep link from the dashboard / recent questions: ?q=… asks once on arrival.
	useEffect(() => {
		const pre = params.get('q');
		if (pre && !autoSent.current) {
			autoSent.current = true;
			send(pre);
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// One row per distinct title (repeated questions otherwise flood the list).
	const convs = useMemo(() => [...new Map((convsQ.data || []).map((c) => [c.title, c])).values()], [convsQ.data]);

	const delConv = useMutation({
		mutationFn: (id) => pmApi.deleteConversation(projectId, id),
		onSuccess: (_r, id) => {
			if (id === cid) setCid(null);
			setToDelete(null);
			qc.invalidateQueries({ queryKey: ['pm', 'convs', projectId] });
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	return (
		<div className="flex h-[calc(100dvh-8rem)] min-h-[520px] flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
				<AiKeyBanner status={aiQ.data} compact />
			</div>
			<div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
				<aside className="flex min-h-0 flex-col gap-2" aria-label={t('history')}>
					<Button variant="outline" className="w-full" onClick={() => setCid(null)}>
						<MessageSquarePlus /> {t('newChat')}
					</Button>
					{convsQ.isLoading ? (
						<SkeletonRows rows={3} />
					) : convs.length === 0 ? (
						<p className="px-1 text-xs text-slate-500">{t('noHistory')}</p>
					) : (
						<ul className="hidden min-h-0 flex-1 space-y-0.5 overflow-auto lg:block">
							{convs.map((c) => (
								<li key={c.id} className="group flex items-center gap-1">
									<button onClick={() => setCid(c.id)} className={cn('min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800', c.id === cid && 'bg-[var(--color-primary-50)] font-medium dark:bg-slate-800')}>
										{c.title}
									</button>
									<button className="rounded p-1.5 opacity-0 hover:bg-slate-100 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-slate-800" aria-label={tc('delete')} onClick={() => setToDelete(c)}>
										<Trash2 className="size-3.5" />
									</button>
								</li>
							))}
						</ul>
					)}
				</aside>

				<div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
					<div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-auto p-4" aria-live="polite" aria-busy={ask.isPending}>
						{!cid && !pending ? (
							<EmptyState icon={ShieldQuestion} title={t('emptyTitle')} body={t('emptyBody')} action={
								<div className="flex flex-wrap justify-center gap-2">
									{SUGGESTIONS.map((k) => (
										<button key={k} onClick={() => send(t(`suggest.${k}`))} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] dark:border-slate-700 dark:hover:bg-slate-800">
											{t(`suggest.${k}`)}
										</button>
									))}
								</div>
							} />
						) : null}
						{msgsQ.isLoading ? <SkeletonRows rows={3} /> : null}
						{msgsQ.isError ? <ErrorState message={errorMessage(msgsQ.error)} onRetry={msgsQ.refetch} /> : null}
						{messages.map((m) => (
							<div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
								{m.role === 'user' ? (
									<p dir="auto" className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[var(--color-primary-600)] px-3.5 py-2 text-sm text-white">{m.content}</p>
								) : (
									<div className="w-full max-w-3xl"><Answer m={m} t={t} onFollowUp={(q) => send(q)} /></div>
								)}
							</div>
						))}
						{pending ? (
							<>
								{!messages.some((m) => m.role === 'user' && m.content === pending && m === messages[messages.length - 1]) ? (
									<div className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[var(--color-primary-600)] px-3.5 py-2 text-sm text-white">{pending}</p></div>
								) : null}
								<div className="flex items-center gap-2 text-sm text-slate-500" role="status"><Spinner /> {t('thinking')}</div>
							</>
						) : null}
						<div ref={endRef} />
					</div>

					<form
						className="border-t border-slate-200 p-3 dark:border-slate-800"
						onSubmit={(e) => {
							e.preventDefault();
							send();
						}}
					>
						<div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
							<span className="text-slate-500">{t('answerStyle')}:</span>
							<div role="radiogroup" aria-label={t('answerStyle')} className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
								{STYLES.map((s) => (
									<button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)} className={cn('rounded-md px-2.5 py-1 font-medium', style === s ? 'bg-[var(--color-primary-600)] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>
										{t(`style.${s}`)}
									</button>
								))}
							</div>
							<span className="ms-auto text-slate-500">{t('provider')}: <bdi dir="ltr">{aiQ.data?.configured ? aiQ.data.providers.find((p) => p.configured)?.name || 'AI' : t('providerNone')}</bdi></span>
						</div>
						<div className="flex items-end gap-2">
							<Textarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
										e.preventDefault();
										send();
									}
								}}
								maxLength={2000}
								rows={2}
								placeholder={t('placeholder')}
								aria-label={t('placeholder')}
								className="min-h-[3rem] flex-1 resize-none"
							/>
							{ask.isPending ? (
								<Button type="button" variant="outline" onClick={() => abortRef.current?.abort()} aria-label={t('stop')}>
									<Square /> {t('stop')}
								</Button>
							) : (
								<>
									{lastQuestion.current && messages.length ? (
										<Button type="button" variant="ghost" size="icon" onClick={() => send(lastQuestion.current)} aria-label={t('regenerate')} title={t('regenerate')}>
											<RefreshCw />
										</Button>
									) : null}
									<Button type="submit" disabled={!input.trim()}>
										<Send className="rtl:-scale-x-100" /> {t('send')}
									</Button>
								</>
							)}
						</div>
						<p className="mt-1.5 text-[11px] text-slate-500">{t('shortcutHint')}</p>
					</form>
				</div>
			</div>

			<ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={t('deleteTitle')} body={toDelete?.title} confirmLabel={tc('delete')} busy={delConv.isPending} onConfirm={() => delConv.mutate(toDelete.id)} />
		</div>
	);
}
