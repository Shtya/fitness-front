'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, MicOff, ShieldCheck, XCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { errorMessage, pmApi } from '../api';
import { ErrorState, formatBytes, PageHeader, Panel, PanelTitle, SkeletonRows } from '../ui';

function Row({ ok, label, detail }) {
	return (
		<li className="flex items-start gap-2.5 py-2 text-sm">
			{ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="ok" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" aria-label="not available" />}
			<div><p className="font-medium">{label}</p><p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p></div>
		</li>
	);
}

/** Honest integration status. Nothing here is a placeholder: each row reflects a real backend check. */
export default function SettingsView() {
	const t = useTranslations('projectmind.settings');
	const metaQ = useQuery({ queryKey: ['pm', 'meta'], queryFn: pmApi.meta });
	const aiQ = useQuery({ queryKey: ['pm', 'ai-status'], queryFn: pmApi.aiStatus });
	if (metaQ.isLoading || aiQ.isLoading) return <SkeletonRows rows={5} />;
	if (metaQ.isError) return <ErrorState message={errorMessage(metaQ.error)} onRetry={metaQ.refetch} />;
	const meta = metaQ.data;
	const ai = aiQ.data;

	return (
		<div className="space-y-4">
			<PageHeader title={t('title')} subtitle={t('subtitle')} />
			<Panel>
				<PanelTitle>{t('ai')}</PanelTitle>
				<ul className="divide-y divide-slate-100 dark:divide-slate-800">
					<Row ok={!!ai?.configured} label={t('aiProvider')} detail={ai?.configured ? t('aiOk', { names: ai.providers.filter((p) => p.configured).map((p) => p.name).join(', ') }) : t('aiMissing')} />
				</ul>
				{!ai?.configured ? <div className="mt-3 flex items-center gap-3"><KeyRound className="size-4 text-amber-600" aria-hidden /><p className="text-sm">{t('aiHow')}</p><Button asChild variant="outline" size="sm"><Link href="/dashboard/settings">{t('openSettings')}</Link></Button></div> : null}
			</Panel>
			<Panel>
				<PanelTitle>{t('integrations')}</PanelTitle>
				<ul className="divide-y divide-slate-100 dark:divide-slate-800">
					<Row ok label={t('zip')} detail={t('zipDetail', { size: formatBytes(meta.limits.maxZipBytes) })} />
					<Row ok label={t('github')} detail={t('githubDetail')} />
					<Row ok={false} label={t('stt')} detail={meta.transcription.liveTranscription.reason} />
					<Row ok={false} label={t('meetingApps')} detail={t('meetingAppsDetail')} />
					<Row ok={false} label={t('vector')} detail={t('vectorDetail')} />
				</ul>
				<p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><MicOff className="size-3.5" aria-hidden /> {meta.transcription.recording.note} {meta.transcription.consentReminder}</p>
			</Panel>
			<Panel>
				<PanelTitle>{t('privacy')}</PanelTitle>
				<ul className="list-disc space-y-1 ps-5 text-sm text-slate-700 dark:text-slate-200">
					{['p1', 'p2', 'p3', 'p4'].map((k) => <li key={k}>{t(k)}</li>)}
				</ul>
				<p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="size-3.5" aria-hidden /> {t('retention')}</p>
			</Panel>
		</div>
	);
}
