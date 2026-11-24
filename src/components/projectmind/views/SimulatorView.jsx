'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mic, MicOff, Play, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { errorCode, errorMessage, pmApi } from '../api';
import { useProjectMind } from '../ProjectMindContext';
import { AiKeyBanner, EmptyState, ErrorState, formatDate, PageHeader, Panel, PanelTitle, RequireProject, SkeletonRows, Spinner } from '../ui';

const DIMS = ['accuracy', 'clarity', 'completeness', 'evidence', 'confidence'];
const SCENARIOS = ['client', 'technical_lead', 'manager', 'new_developer'];
const LEVELS = ['easy', 'medium', 'hard'];

export default function SimulatorView() {
	return (
		<RequireProject needReady>
			<Inner />
		</RequireProject>
	);
}

function ScoreBars({ scores, t }) {
	return (
		<div className="grid gap-1.5 sm:grid-cols-5">
			{DIMS.map((d) => (
				<div key={d} className="text-xs">
					<div className="flex justify-between"><span>{t(`dim.${d}`)}</span><span className="font-semibold">{scores?.[d] ?? 0}/20</span></div>
					<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-label={t(`dim.${d}`)} aria-valuenow={scores?.[d] ?? 0} aria-valuemin={0} aria-valuemax={20}><div className="h-full bg-[var(--color-primary-600)]" style={{ width: `${((scores?.[d] ?? 0) / 20) * 100}%` }} /></div>
				</div>
			))}
		</div>
	);
}

function Session({ projectId, sessionId, onExit }) {
	const t = useTranslations('projectmind.simulator');
	const qc = useQueryClient();
	const [answer, setAnswer] = useState('');
	const q = useQuery({ queryKey: ['pm', 'sim', projectId, sessionId], queryFn: () => pmApi.simGet(projectId, sessionId) });
	const send = useMutation({
		mutationFn: () => pmApi.simAnswer(projectId, sessionId, answer),
		onSuccess: (data) => {
			qc.setQueryData(['pm', 'sim', projectId, sessionId], data);
			setAnswer('');
			qc.invalidateQueries({ queryKey: ['pm', 'sims', projectId] });
			qc.invalidateQueries({ queryKey: ['pm', 'dashboard'] });
		},
		onError: (e) => toast.error(errorCode(e) === 'AI_NOT_CONFIGURED' ? t('noKey') : errorMessage(e)),
	});
	if (q.isLoading) return <SkeletonRows rows={4} />;
	if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} />;
	const { session, turns } = q.data;
	const currentIdx = turns.findIndex((x) => x.answer === null);
	const done = session.status === 'completed';
	const sum = session.summary || {};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-slate-600 dark:text-slate-300">{t(`scenario.${session.scenario}`)} · {t(`level.${session.difficulty}`)}</p>
				<Button variant="ghost" size="sm" onClick={onExit}>{t('back')}</Button>
			</div>

			{done ? (
				<Panel className="border-[var(--color-primary-300)]">
					<div className="flex items-center gap-4">
						<div className="grid size-20 place-items-center rounded-full border-4 border-[var(--color-primary-500)] text-center" aria-label={t('totalScore', { n: session.totalScore })}><span className="text-2xl font-bold leading-none">{session.totalScore}<span className="block text-[10px] font-medium text-slate-500">/100</span></span></div>
						<div className="space-y-1 text-sm">
							<p className="flex items-center gap-1.5 font-semibold"><Trophy className="size-4 text-amber-500" aria-hidden /> {t('complete')}</p>
							{sum.strengths?.length ? <p><span className="font-medium">{t('strengths')}:</span> {sum.strengths.map((d) => t(`dim.${d}`)).join(', ')}</p> : null}
							{sum.weaknesses?.length ? <p><span className="font-medium">{t('weaknesses')}:</span> {sum.weaknesses.map((d) => t(`dim.${d}`)).join(', ')}</p> : null}
						</div>
					</div>
					{sum.topicsToStudy?.length ? <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('studyTopics')}</p><ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm">{sum.topicsToStudy.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
				</Panel>
			) : null}

			<ol className="space-y-3">
				{turns.map((turn, i) => {
					const answered = turn.answer !== null;
					const isCurrent = i === currentIdx && !done;
					if (!answered && !isCurrent) return <li key={turn.id} className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-400 dark:border-slate-700">{t('locked', { n: i + 1 })}</li>;
					return (
						<li key={turn.id}>
							<Panel as="div" className={cn(isCurrent && 'border-[var(--color-primary-400)]')}>
								<p className="text-xs font-semibold text-slate-500">{t('question', { n: i + 1, total: turns.length })}</p>
								<p className="mt-1 font-medium">{turn.question}</p>
								{answered ? (
									<div className="mt-3 space-y-3 text-sm">
										<p className="whitespace-pre-wrap rounded-md bg-slate-50 p-2 dark:bg-slate-800/60">{turn.answer}</p>
										<div className="flex items-center gap-2"><span className="text-lg font-bold">{turn.total}/100</span></div>
										<ScoreBars scores={turn.scores} t={t} />
										{turn.feedback ? <p><span className="font-medium">{t('feedback')}:</span> {turn.feedback}</p> : null}
										{turn.idealAnswer ? <details><summary className="cursor-pointer font-medium">{t('ideal')}</summary><p className="mt-1 whitespace-pre-wrap">{turn.idealAnswer}</p></details> : null}
										{turn.followUp ? <p className="text-slate-600 dark:text-slate-300"><span className="font-medium">{t('followUp')}:</span> {turn.followUp}</p> : null}
									</div>
								) : (
									<form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (answer.trim().length >= 2) send.mutate(); }}>
										<Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} maxLength={4000} placeholder={t('answerPlaceholder')} aria-label={t('answerPlaceholder')} autoFocus />
										<div className="flex items-center gap-2">
											<Button type="submit" disabled={answer.trim().length < 2 || send.isPending}>{send.isPending ? <Spinner /> : null} {t('submit')}</Button>
											<button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 opacity-70 dark:border-slate-600" title={t('voiceDisabled')}><MicOff className="size-3.5" aria-hidden /> {t('voice')}</button>
											<span className="text-xs text-slate-500">{t('voiceDisabled')}</span>
										</div>
									</form>
								)}
							</Panel>
						</li>
					);
				})}
			</ol>
		</div>
	);
}

function Inner() {
	const t = useTranslations('projectmind.simulator');
	const locale = useLocale();
	const qc = useQueryClient();
	const { projectId } = useProjectMind();
	const [scenario, setScenario] = useState('client');
	const [difficulty, setDifficulty] = useState('medium');
	const [sessionId, setSessionId] = useState(null);
	const aiQ = useQuery({ queryKey: ['pm', 'ai-status'], queryFn: pmApi.aiStatus, staleTime: 60_000 });
	const sessionsQ = useQuery({ queryKey: ['pm', 'sims', projectId], queryFn: () => pmApi.simSessions(projectId) });
	const start = useMutation({
		mutationFn: () => pmApi.simStart(projectId, { scenario, difficulty }),
		onSuccess: (d) => {
			setSessionId(d.session.id);
			qc.invalidateQueries({ queryKey: ['pm', 'sims', projectId] });
		},
		onError: (e) => toast.error(errorCode(e) === 'AI_NOT_CONFIGURED' ? t('noKey') : errorMessage(e)),
	});

	if (sessionId) return <div className="space-y-4"><PageHeader title={t('title')} /><Session projectId={projectId} sessionId={sessionId} onExit={() => setSessionId(null)} /></div>;

	const done = (sessionsQ.data || []).filter((s) => s.status === 'completed');
	return (
		<div className="space-y-4">
			<PageHeader title={t('title')} subtitle={t('subtitle')} />
			<AiKeyBanner status={aiQ.data} />
			<Panel>
				<PanelTitle>{t('setup')}</PanelTitle>
				<div className="grid gap-4 md:grid-cols-2">
					<fieldset><legend className="mb-1.5 text-sm font-medium">{t('scenarioLabel')}</legend>
						<div className="grid gap-1.5" role="radiogroup">{SCENARIOS.map((s) => <button key={s} type="button" role="radio" aria-checked={scenario === s} onClick={() => setScenario(s)} className={cn('rounded-lg border px-3 py-2 text-start text-sm', scenario === s ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700')}><span className="font-medium">{t(`scenario.${s}`)}</span><span className="block text-xs text-slate-500">{t(`scenarioDesc.${s}`)}</span></button>)}</div>
					</fieldset>
					<fieldset><legend className="mb-1.5 text-sm font-medium">{t('difficultyLabel')}</legend>
						<div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="radiogroup">{LEVELS.map((l) => <button key={l} type="button" role="radio" aria-checked={difficulty === l} onClick={() => setDifficulty(l)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium', difficulty === l ? 'bg-[var(--color-primary-600)] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>{t(`level.${l}`)}</button>)}</div>
						<div className="mt-4"><Button onClick={() => start.mutate()} disabled={start.isPending}>{start.isPending ? <Spinner /> : <Play />} {t('start')}</Button></div>
						<p className="mt-2 text-xs text-slate-500">{t('startHint')}</p>
					</fieldset>
				</div>
			</Panel>

			<Panel>
				<PanelTitle>{t('history')}</PanelTitle>
				{sessionsQ.isLoading ? <SkeletonRows rows={2} /> : (sessionsQ.data || []).length === 0 ? <EmptyState icon={Mic} title={t('emptyTitle')} body={t('emptyBody')} /> : (
					<>
						{done.length > 1 ? <div className="mb-4 flex h-24 items-end gap-2" role="img" aria-label={t('trend')}>{done.slice().reverse().map((s) => <div key={s.id} className="flex flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] text-slate-500">{s.totalScore}</span><div className="w-full rounded-t bg-[var(--color-primary-500)]" style={{ height: `${Math.max(4, s.totalScore)}%` }} /></div>)}</div> : null}
						<ul className="divide-y divide-slate-200 dark:divide-slate-800">{sessionsQ.data.map((s) => (
							<li key={s.id}><button onClick={() => setSessionId(s.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-start text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"><span>{t(`scenario.${s.scenario}`)} · {t(`level.${s.difficulty}`)}<span className="block text-xs text-slate-500">{formatDate(s.createdAt, locale)}</span></span><span className="font-semibold">{s.status === 'completed' ? `${s.totalScore}/100` : t('inProgress')}</span></button></li>
						))}</ul>
					</>
				)}
			</Panel>
		</div>
	);
}
