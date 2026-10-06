'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Camera, CheckCircle2, ClipboardList, Clock, Dumbbell, ImageOff, MessageSquareText, Ruler, Utensils } from 'lucide-react';
import { useTranslations } from 'next-intl';

import Button from '@/components/atoms/Button';
import Badge from '@/components/atoms/GmBadge';
import Img from '@/components/atoms/Img';
import { GmSection, GmTextarea } from '@/components/atoms/GmFormParts';
import { Avatar, ErrorBox, MetaTile } from '@/components/atoms/GmStates';
import { resolveCustomAnswers } from './reportConfigModel';

const PHOTO_SIDES = ['front', 'back', 'left', 'right'];
const MEASURE_KEYS = ['weight', 'waist', 'chest', 'hips', 'arms', 'thighs'];

export const formatDate = (value, locale, withTime = false) => {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return String(value);
	const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		...(withTime ? { timeStyle: 'short' } : {}),
		...(dateOnly ? { timeZone: 'UTC' } : {}),
		numberingSystem: 'latn',
	}).format(d);
};

function DataRow({ label, value }) {
	return (
		<div className='flex items-start justify-between gap-3 border-b border-(--gm-line) py-2.5 last:border-b-0'>
			<span className='text-[12px] font-medium gm-muted'>{label}</span>
			<span dir='auto' className='max-w-[60%] text-end text-[13px] font-semibold gm-ink'>{value ?? '—'}</span>
		</div>
	);
}

function NoteBlock({ title, children }) {
	return (
		<div className='mt-3'>
			<p className='mb-1.5 text-[11px] font-bold gm-muted'>{title}</p>
			<div dir='auto' className='gm-answer whitespace-pre-wrap text-[13px] leading-relaxed gm-ink'>{children}</div>
		</div>
	);
}

export function ReportDetailSkeleton() {
	return (
		<div className='space-y-4'>
			<div className='flex items-center gap-3'>
				<span className='gm-skel size-11 rounded-[12px]!' />
				<div className='flex-1 space-y-2'>
					<span className='gm-skel block h-3.5 w-1/3' />
					<span className='gm-skel block h-3 w-1/2' />
				</div>
			</div>
			<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
				{PHOTO_SIDES.map(s => <span key={s} className='gm-skel block aspect-[3/4] rounded-[14px]!' />)}
			</div>
			<span className='gm-skel block h-28 rounded-[14px]!' />
		</div>
	);
}

export default function ReportDetail({ report, config, locale, saving, onSaveFeedback, onClose }) {
	const t = useTranslations('reportConfig');
	const [draft, setDraft] = useState(report?.coachFeedback || '');
	const [error, setError] = useState('');

	useEffect(() => { setDraft(report?.coachFeedback || ''); setError(''); }, [report?.id, report?.coachFeedback]);

	const yn = v => (v === 'yes' ? t('reports.yes') : v === 'no' ? t('reports.no') : v || '—');
	const customAnswers = useMemo(() => resolveCustomAnswers(report?.customAnswers, config), [report?.customAnswers, config]);

	const formatAnswer = (value, type) => {
		if (typeof value === 'boolean') return value ? t('reports.yes') : t('reports.no');
		if (type === 'rating') return `${value} / 5`;
		return Array.isArray(value) ? value.join(', ') : String(value);
	};
	const groupLabel = group => (['diet', 'training', 'measurements', 'photos'].includes(group) ? t(`weekly.${group}.title`) : group);

	const submit = async () => {
		setError('');
		try {
			await onSaveFeedback(draft.trim());
		} catch (e) {
			setError(e?.message || t('reports.errors.save'));
		}
	};

	const name = report?.user?.name || report?.user?.email || t('reports.athlete');
	const reviewed = Boolean(report?.reviewedAt);
	const training = report?.training || {};
	const diet = report?.diet || {};
	const m = report?.measurements || {};

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-center gap-3 rounded-[16px] border border-(--gm-line) p-3.5 sm:p-4' style={{ background: 'color-mix(in srgb, var(--color-primary-50) 55%, var(--gm-paper))' }}>
				<Avatar name={name} />
				<div className='min-w-0 flex-1'>
					<p dir='auto' className='truncate text-[14px] font-bold gm-ink'>{name}</p>
					{report?.user?.email && report?.user?.name && <p className='truncate font-en text-[12px] gm-muted'>{report.user.email}</p>}
				</div>
				{reviewed
					? <Badge color='green' icon={<CheckCircle2 className='size-3' />}>{t('reports.reviewed')}</Badge>
					: <Badge color='amber' dot>{t('reports.awaitingReview')}</Badge>}
			</div>

			<div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3'>
				<MetaTile icon={CalendarDays} label={t('reports.columns.weekOf')}>
					<span className='font-en tabular-nums'>{formatDate(report?.weekOf, locale)}</span>
				</MetaTile>
				<MetaTile icon={Clock} label={t('reports.detail.submittedAt')}>
					<span className='font-en tabular-nums'>{formatDate(report?.created_at, locale, true)}</span>
				</MetaTile>
				<MetaTile icon={CheckCircle2} label={t('reports.detail.reviewedAt')}>
					<span className='font-en tabular-nums'>{reviewed ? formatDate(report.reviewedAt, locale, true) : '—'}</span>
				</MetaTile>
			</div>

			<GmSection icon={Camera} title={t('reports.detail.photos')}>
				<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
					{PHOTO_SIDES.map(side => {
						const url = report?.photos?.[side]?.url;
						return (
							<figure key={side} className='gm-media-card'>
								<div className='relative aspect-[3/4] overflow-hidden' style={{ background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}>
									{url ? (
										<Img src={url} alt={t(`reports.detail.section.photos.${side}`)} showBlur={false} className='size-full object-cover' />
									) : (
										<div className='grid size-full place-items-center gm-faint'>
											<span className='flex flex-col items-center gap-1.5 text-[11.5px] font-medium'>
												<ImageOff className='size-5' />
												{t('reports.detail.noPhoto')}
											</span>
										</div>
									)}
								</div>
								<figcaption className='gm-media-card__foot px-3 py-2 text-[11.5px] font-semibold gm-ink-soft'>{t(`reports.detail.section.photos.${side}`)}</figcaption>
							</figure>
						);
					})}
				</div>
			</GmSection>

			<GmSection
				icon={Ruler}
				title={t('reports.detail.measurements')}
				action={m.date ? <span className='gm-plan__chip font-en tabular-nums'>{formatDate(m.date, locale)}</span> : null}
			>
				<div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6'>
					{MEASURE_KEYS.map(k => (
						<div key={k} className='gm-answer px-3! py-2.5!'>
							<p className='text-[11px] font-semibold gm-muted'>{t(`reports.detail.section.measurements.${k}`)}</p>
							<p className='mt-1 font-en text-[16px] font-bold tabular-nums gm-ink'>{m[k] ?? '—'}</p>
						</div>
					))}
				</div>
			</GmSection>

			<div className='grid gap-4 md:grid-cols-2'>
				<GmSection icon={Dumbbell} title={t('reports.detail.training')}>
					<DataRow label={t('reports.detail.section.training.cardioAdherence')} value={training.cardioAdherence != null ? `${training.cardioAdherence} / 5` : '—'} />
					<DataRow label={t('reports.detail.section.training.intensityOk')} value={yn(training.intensityOk)} />
					<DataRow label={t('reports.detail.section.training.shape')} value={yn(training.shapeChange)} />
					<DataRow label={t('reports.detail.section.training.fitness')} value={yn(training.fitnessChange)} />
					<DataRow label={t('reports.detail.section.training.sleepEnough')} value={yn(training.sleep?.enough)} />
					<DataRow label={t('reports.detail.section.training.sleepHours')} value={training.sleep?.hours || '—'} />
					{(training.daysDeviation?.count || training.daysDeviation?.reason) && (
						<div className='mt-3'>
							<p className='mb-1 text-[11px] font-bold gm-muted'>{t('reports.detail.section.training.daysDeviation')}</p>
							<DataRow label={t('reports.detail.section.training.deviation.count')} value={training.daysDeviation?.count || '—'} />
							<DataRow label={t('reports.detail.section.training.deviation.reason')} value={training.daysDeviation?.reason || '—'} />
						</div>
					)}
					{training.programNotes && <NoteBlock title={t('reports.detail.section.training.notes.title')}>{training.programNotes}</NoteBlock>}
				</GmSection>

				<GmSection icon={Utensils} title={t('reports.detail.diet')}>
					<DataRow label={t('reports.detail.section.diet.hungry')} value={yn(diet.hungry)} />
					<DataRow label={t('reports.detail.section.diet.comfort')} value={yn(diet.mentalComfort)} />
					<DataRow label={t('reports.detail.section.diet.tooMuch')} value={yn(diet.foodTooMuch)} />
					<DataRow label={t('reports.detail.section.diet.wantSpecific')} value={diet.wantSpecific || '—'} />
					{(diet.dietDeviation?.times || diet.dietDeviation?.details) && (
						<div className='mt-3'>
							<p className='mb-1 text-[11px] font-bold gm-muted'>{t('reports.detail.section.diet.deviation.title')}</p>
							<DataRow label={t('reports.detail.section.diet.deviation.times')} value={diet.dietDeviation?.times || '—'} />
							<DataRow label={t('reports.detail.section.diet.deviation.details')} value={diet.dietDeviation?.details || '—'} />
						</div>
					)}
				</GmSection>
			</div>

			{customAnswers.length > 0 && (
				<GmSection icon={ClipboardList} title={t('reports.detail.customAnswers')}>
					<div className='grid gap-2.5 sm:grid-cols-2'>
						{customAnswers.map(a => (
							<div key={a.key} className='gm-answer'>
								<p className='flex flex-wrap items-center gap-1.5 text-[11px] font-semibold gm-muted'>
									{a.group && <span className='gm-plan__chip px-2! py-0.5!'>{groupLabel(a.group)}</span>}
									<span dir='auto'>{a.field?.label || t(config ? 'reports.detail.removedQuestion' : 'reports.detail.customQuestion')}</span>
								</p>
								<p dir='auto' className='mt-1.5 whitespace-pre-wrap text-[13px] font-semibold gm-ink'>{formatAnswer(a.value, a.field?.type)}</p>
							</div>
						))}
					</div>
				</GmSection>
			)}

			<GmSection
				icon={MessageSquareText}
				title={t('reports.detail.feedback')}
				action={reviewed && report?.reviewedBy?.name ? <span className='truncate text-[11.5px] gm-muted'>{report.reviewedBy.name}</span> : null}
			>
				<GmTextarea label={t('reports.detail.feedback')} rows={4} value={draft} placeholder={t('reports.detail.feedbackPh')} onChange={setDraft} />
				{error && <div className='mt-3'><ErrorBox message={error} /></div>}
			</GmSection>

			<div className='sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2.5 border-t border-(--gm-line) px-4 pt-4 md:-mx-6 md:px-6' style={{ background: 'color-mix(in srgb, var(--gm-paper) 92%, transparent)' }}>
				<Button color='neutral' name={t('reports.close')} onClick={onClose} disabled={saving} />
				<Button
					color='primary'
					name={reviewed ? t('reports.detail.updateFeedback') : t('reports.detail.markReviewed')}
					onClick={submit}
					loading={saving}
					disabled={saving}
					icon={<CheckCircle2 className='size-4' />}
				/>
			</div>
		</div>
	);
}
