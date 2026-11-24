'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ChevronDown, MicOff, Plus, Send, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { errorMessage, pmApi } from '../api';
import { Markdown } from '../Markdown';
import { useProjectMind } from '../ProjectMindContext';
import { AiKeyBanner, ConfidenceBadge, ConfirmDialog, CopyButton, EmptyState, ErrorState, formatDate, InlineWarning, PageHeader, Panel, PanelTitle, RequireProject, SkeletonRows, SourceChip, Spinner } from '../ui';

const KINDS = ['question', 'answer', 'decision', 'follow_up', 'unresolved'];
const STYLES = ['business', 'client', 'technical'];

export default function MeetingsView() {
	return (
		<RequireProject needReady>
			<Inner />
		</RequireProject>
	);
}

/** Persistent, unmistakable capture status. Never implies listening: live transcription is off unless a source is configured. */
function CaptureStatus({ transcription }) {
	const t = useTranslations('projectmind.meetings');
	const live = transcription?.liveTranscription;
	return (
		<div role="status" aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
			<span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100"><MicOff className="size-4" aria-hidden /> {live?.enabled ? t('capture.on') : t('capture.off')}</span>
			<span className="text-slate-600 dark:text-slate-300">{t('capture.notRecording')}</span>
			<button type="button" disabled className="ms-auto cursor-not-allowed rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-500 opacity-70 dark:border-slate-600" aria-describedby="pm-live-reason" title={t('capture.disabledReason')}>
				{t('capture.start')}
			</button>
			<p id="pm-live-reason" className="w-full text-xs text-slate-600 dark:text-slate-300">{t('capture.disabledReason')} {t('capture.consent')}</p>
		</div>
	);
}

function PrepView({ prep, t }) {
	if (!prep || !prep.generatedAt) return null;
	const Section = ({ title, items }) => items?.length ? (
		<div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4><ul className="list-disc space-y-1 ps-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
	) : null;
	return (
		<div className="space-y-3">
			{prep.aiUnavailableReason ? <InlineWarning>{prep.aiUnavailableReason}</InlineWarning> : null}
			<Section title={t('prep.likely')} items={prep.likelyQuestions} />
			<Section title={t('prep.difficult')} items={prep.difficultQuestions} />
			<Section title={t('prep.decisions')} items={prep.decisionsToSeek} />
			<Section title={t('prep.limitations')} items={prep.limitations} />
			<p className="text-xs text-slate-500">{t('prep.openGaps', { n: prep.openGapCount })}</p>
		</div>
	);
}

function MeetingDetail({ projectId, meetingId, onDeleted }) {
	const t = useTranslations('projectmind.meetings');
	const tc = useTranslations('projectmind.common');
	const tChat = useTranslations('projectmind.chat');
	const qc = useQueryClient();
	const [style, setStyle] = useState('client');
	const [question, setQuestion] = useState('');
	const [answer, setAnswer] = useState(null);
	const [noteKind, setNoteKind] = useState('decision');
	const [noteBody, setNoteBody] = useState('');
	const [showDetails, setShowDetails] = useState(false);
	const [confirmDel, setConfirmDel] = useState(false);

	const q = useQuery({ queryKey: ['pm', 'meeting', projectId, meetingId], queryFn: () => pmApi.meeting(projectId, meetingId) });
	const refresh = () => qc.invalidateQueries({ queryKey: ['pm', 'meeting', projectId, meetingId] });

	const prep = useMutation({ mutationFn: () => pmApi.meetingPrep(projectId, meetingId), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
	const addNote = useMutation({
		mutationFn: (body) => pmApi.noteAdd(projectId, meetingId, body),
		onSuccess: () => {
			setNoteBody('');
			refresh();
		},
		onError: (e) => toast.error(errorMessage(e)),
	});
	const delNote = useMutation({ mutationFn: (nid) => pmApi.noteDelete(projectId, meetingId, nid), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
	const setStatus = useMutation({ mutationFn: (s) => pmApi.meetingStatus(projectId, meetingId, s), onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['pm', 'meetings', projectId] }); }, onError: (e) => toast.error(errorMessage(e)) });
	const delMeeting = useMutation({ mutationFn: () => pmApi.meetingDelete(projectId, meetingId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pm', 'meetings', projectId] }); onDeleted(); }, onError: (e) => toast.error(errorMessage(e)) });
	const ask = useMutation({
		mutationFn: () => pmApi.ask(projectId, { question, style }),
		onSuccess: (r) => setAnswer({ ...r, question }),
		onError: (e) => toast.error(errorMessage(e)),
	});

	if (q.isLoading) return <SkeletonRows rows={5} />;
	if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} />;
	const { meeting, notes, transcription } = q.data;
	const firstSentence = answer ? (answer.answer.split(/(?<=[.!?؟])\s/)[0] || answer.answer) : '';

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h2 className="text-lg font-semibold">{meeting.title}</h2>
					<p className="text-xs text-slate-500">{formatDate(meeting.scheduledAt, 'en')} · {t(`status.${meeting.status}`)}</p>
				</div>
				<div className="flex gap-1.5">
					{['planned', 'live', 'done'].filter((s) => s !== meeting.status).map((s) => (
						<Button key={s} size="sm" variant="outline" onClick={() => setStatus.mutate(s)} disabled={setStatus.isPending}>{t(`markAs.${s}`)}</Button>
					))}
					<Button size="icon" variant="ghost" aria-label={tc('delete')} onClick={() => setConfirmDel(true)}><Trash2 /></Button>
				</div>
			</div>

			<CaptureStatus transcription={transcription} />

			<Panel>
				<PanelTitle hint={<Button size="sm" variant="outline" onClick={() => prep.mutate()} disabled={prep.isPending}>{prep.isPending ? <Spinner /> : <Sparkles />} {t('prep.generate')}</Button>}>{t('prep.title')}</PanelTitle>
				{meeting.prep?.generatedAt ? <PrepView prep={meeting.prep} t={t} /> : <p className="text-sm text-slate-500">{t('prep.empty')}</p>}
			</Panel>

			<Panel>
				<PanelTitle>{t('quick.title')}</PanelTitle>
				<form onSubmit={(e) => { e.preventDefault(); if (question.trim() && !ask.isPending) ask.mutate(); }} className="space-y-2">
					<div role="radiogroup" aria-label={tChat('answerStyle')} className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-slate-700">
						{STYLES.map((s) => <button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)} className={cn('rounded-md px-2.5 py-1 font-medium', style === s ? 'bg-[var(--color-primary-600)] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>{tChat(`style.${s}`)}</button>)}
					</div>
					<div className="flex gap-2">
						<Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} maxLength={2000} placeholder={t('quick.placeholder')} aria-label={t('quick.placeholder')} className="flex-1 text-base" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (question.trim() && !ask.isPending) ask.mutate(); } }} />
						<Button type="submit" size="lg" disabled={!question.trim() || ask.isPending}>{ask.isPending ? <Spinner /> : <Send className="rtl:-scale-x-100" />} {t('quick.ask')}</Button>
					</div>
				</form>
				{answer ? (
					<div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800" aria-live="polite">
						{answer.status === 'answered' ? (
							<>
								<p className="text-base font-medium">{firstSentence}</p>
								<button className="flex items-center gap-1 text-xs text-slate-600 hover:underline dark:text-slate-300" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails}><ChevronDown className={cn('size-3.5 transition-transform', showDetails && 'rotate-180')} /> {t('quick.details')}</button>
								{showDetails ? <><Markdown>{answer.answer}</Markdown><div className="flex flex-wrap gap-1.5">{answer.sources.map((s) => <SourceChip key={s.n} {...s} />)}</div></> : null}
								<div className="flex flex-wrap items-center gap-2"><ConfidenceBadge confidence={answer.confidence} /><CopyButton text={answer.answer} label={t('quick.copy')} />
									<Button size="sm" variant="outline" onClick={() => addNote.mutate({ kind: 'question', body: answer.question })}><Plus /> {t('quick.saveQ')}</Button>
									<Button size="sm" variant="outline" onClick={() => addNote.mutate({ kind: 'answer', body: answer.answer })}><Plus /> {t('quick.saveA')}</Button></div>
							</>
						) : (
							<p className="flex items-start gap-2 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden /> {answer.answer}</p>
						)}
					</div>
				) : null}
			</Panel>

			<Panel>
				<PanelTitle>{t('notes.title')}</PanelTitle>
				<form onSubmit={(e) => { e.preventDefault(); if (noteBody.trim()) addNote.mutate({ kind: noteKind, body: noteBody }); }} className="flex flex-wrap gap-2">
					<select value={noteKind} onChange={(e) => setNoteKind(e.target.value)} aria-label={t('notes.kind')} className="h-9 rounded-md border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700">{KINDS.map((k) => <option key={k} value={k}>{t(`notes.kinds.${k}`)}</option>)}</select>
					<Input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} maxLength={8000} placeholder={t('notes.placeholder')} aria-label={t('notes.placeholder')} className="min-w-48 flex-1" />
					<Button type="submit" disabled={!noteBody.trim() || addNote.isPending}>{addNote.isPending ? <Spinner /> : <Plus />} {t('notes.add')}</Button>
				</form>
				{notes.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t('notes.empty')}</p> : (
					<div className="mt-3 grid gap-3 md:grid-cols-2">
						{KINDS.map((k) => {
							const list = notes.filter((n) => n.kind === k);
							if (!list.length) return null;
							return (
								<div key={k}>
									<h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t(`notes.kinds.${k}`)}</h4>
									<ul className="space-y-1.5">{list.map((n) => (
										<li key={n.id} className="group flex items-start gap-2 rounded-md bg-slate-50 p-2 text-sm dark:bg-slate-800/60"><span className="min-w-0 flex-1 whitespace-pre-wrap">{n.body}</span><button onClick={() => delNote.mutate(n.id)} aria-label={tc('delete')} className="opacity-0 focus:opacity-100 group-hover:opacity-100"><Trash2 className="size-3.5" /></button></li>
									))}</ul>
								</div>
							);
						})}
					</div>
				)}
			</Panel>
			<ConfirmDialog open={confirmDel} onOpenChange={setConfirmDel} title={t('deleteTitle')} body={t('deleteBody')} confirmLabel={tc('delete')} busy={delMeeting.isPending} onConfirm={() => delMeeting.mutate()} />
		</div>
	);
}

function Inner() {
	const t = useTranslations('projectmind.meetings');
	const locale = useLocale();
	const qc = useQueryClient();
	const { projectId } = useProjectMind();
	const [selected, setSelected] = useState(null);
	const [title, setTitle] = useState('');
	const [when, setWhen] = useState('');
	const aiQ = useQuery({ queryKey: ['pm', 'ai-status'], queryFn: pmApi.aiStatus, staleTime: 60_000 });
	const q = useQuery({ queryKey: ['pm', 'meetings', projectId], queryFn: () => pmApi.meetings(projectId) });
	const create = useMutation({
		mutationFn: () => pmApi.meetingCreate(projectId, { title, scheduledAt: when ? new Date(when).toISOString() : undefined }),
		onSuccess: (m) => {
			setTitle('');
			setWhen('');
			setSelected(m.id);
			qc.invalidateQueries({ queryKey: ['pm', 'meetings', projectId] });
		},
		onError: (e) => toast.error(errorMessage(e)),
	});

	return (
		<div className="space-y-4">
			<PageHeader title={t('title')} subtitle={t('subtitle')} />
			<AiKeyBanner status={aiQ.data} />
			<div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
				<aside className="space-y-3">
					<form onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 2) create.mutate(); }} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
						<Label htmlFor="mt-title">{t('newMeeting')}</Label>
						<Input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titlePlaceholder')} maxLength={200} />
						<Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label={t('when')} dir="ltr" />
						<Button type="submit" className="w-full" disabled={title.trim().length < 2 || create.isPending}>{create.isPending ? <Spinner /> : <CalendarPlus />} {t('create')}</Button>
					</form>
					{q.isLoading ? <SkeletonRows rows={3} /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} /> : (q.data || []).length === 0 ? <p className="px-1 text-sm text-slate-500">{t('none')}</p> : (
						<ul className="space-y-1">{q.data.map((m) => (
							<li key={m.id}><button onClick={() => setSelected(m.id)} className={cn('w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800', selected === m.id && 'bg-[var(--color-primary-50)] dark:bg-slate-800')}><span className="block truncate font-medium">{m.title}</span><span className="text-xs text-slate-500">{formatDate(m.scheduledAt || m.createdAt, locale)} · {t(`status.${m.status}`)}</span></button></li>
						))}</ul>
					)}
				</aside>
				<div>{selected ? <MeetingDetail key={selected} projectId={projectId} meetingId={selected} onDeleted={() => setSelected(null)} /> : <EmptyState icon={CalendarPlus} title={t('pickTitle')} body={t('pickBody')} />}</div>
			</div>
		</div>
	);
}
