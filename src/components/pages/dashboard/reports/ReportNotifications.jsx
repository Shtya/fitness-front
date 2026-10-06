'use client';

import { memo } from 'react';
import { Bell, BellOff, CalendarClock, Clock, MessagesSquare, Minus, Plus, Repeat, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FIELD_BG, FIELD_SHELL, FLOAT_LABEL, GmSection, GmSwitch, GmTextarea } from '@/components/atoms/GmFormParts';
import { DAYS_OF_WEEK } from './reportConfigModel';

const STEP_BTN = 'grid size-8 shrink-0 place-items-center rounded-[9px] gm-ink-soft transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] hover:text-(--color-primary-600) disabled:cursor-not-allowed disabled:opacity-35';

function Stepper({ label, unit, value, min, max, onChange }) {
	const t = useTranslations('reportConfig');
	const n = Math.min(max, Math.max(min, Number(value) || min));
	return (
		<div className={`relative flex h-11 items-center gap-1 px-1.5 ${FIELD_SHELL}`} style={FIELD_BG}>
			<span className={FLOAT_LABEL}>{label}</span>
			<button type='button' onClick={() => onChange(n - 1)} disabled={n <= min} aria-label={t('coachConfig.notif.decrease')} className={STEP_BTN}>
				<Minus className='size-4' />
			</button>
			<span className='min-w-0 flex-1 text-center'>
				<span className='font-en text-[15px] font-bold tabular-nums gm-ink' aria-live='polite'>{n}</span>
				<span className='ms-1.5 text-[11.5px] font-medium gm-muted'>{unit}</span>
			</span>
			<button type='button' onClick={() => onChange(n + 1)} disabled={n >= max} aria-label={t('coachConfig.notif.increase')} className={STEP_BTN}>
				<Plus className='size-4' />
			</button>
		</div>
	);
}

function ReportNotifications({ notifications, defaults, onChange }) {
	const t = useTranslations('reportConfig');
	const enabled = notifications?.enabled !== false;

	return (
		<GmSection
			icon={Bell}
			className='gm-panel p-4! sm:p-5!'
			title={(
				<span className='min-w-0'>
					<span className='block truncate'>{t('coachConfig.notif.title')}</span>
					<span className='mt-0.5 block truncate text-[11.5px] font-normal gm-muted'>{t('coachConfig.notif.subtitle')}</span>
				</span>
			)}
			action={<GmSwitch checked={enabled} hideLabel label={t('coachConfig.notif.title')} onChange={v => onChange({ enabled: v })} />}
		>
			{!enabled ? (
				<div className='flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-(--gm-line) px-4 py-10 text-center'>
					<span className='gm-plan__icon size-10! rounded-[12px]!'><BellOff className='size-4.5' /></span>
					<p className='max-w-sm text-[13px] font-semibold gm-ink-soft'>{t('coachConfig.notif.disabled')}</p>
				</div>
			) : (
				<div className='grid gap-4 lg:grid-cols-2'>
					<GmSection icon={CalendarClock} title={t('coachConfig.notif.schedule')}>
						<div className='space-y-4'>
							<div>
								<p className='mb-2 text-[11.5px] font-semibold gm-muted'>{t('coachConfig.notif.dayOfWeek')}</p>
								<div role='group' aria-label={t('coachConfig.notif.dayOfWeek')} className='gm-seg'>
									{DAYS_OF_WEEK.map(d => {
										const on = notifications?.dayOfWeek === d;
										return (
											<button key={d} type='button' aria-pressed={on} onClick={() => onChange({ dayOfWeek: d })} className={`gm-seg-item min-w-11 px-2! ${on ? 'is-on' : ''}`}>
												{t(`coachConfig.days.${d}`)}
											</button>
										);
									})}
								</div>
							</div>
							<label className={`relative flex h-11 items-center gap-2 px-3 sm:max-w-[220px] ${FIELD_SHELL}`} style={FIELD_BG}>
								<span className={FLOAT_LABEL}>{t('coachConfig.notif.sendTime')}</span>
								<Clock className='size-4 shrink-0 gm-muted' />
								<input
									type='time'
									dir='ltr'
									value={notifications?.sendTime || '09:00'}
									onChange={e => e.target.value && onChange({ sendTime: e.target.value })}
									className='w-full min-w-0 bg-transparent font-en text-[13px] font-semibold tabular-nums text-(--gm-ink) outline-none [&::-webkit-calendar-picker-indicator]:opacity-60'
								/>
							</label>
							<div className='border-t border-(--gm-line) pt-4'>
								<p className='mb-3 flex items-center gap-1.5 text-[12px] font-bold gm-ink'>
									<Repeat className='size-3.5 text-(--gm-warn)' />
									{t('coachConfig.notif.reminders')}
								</p>
								<div className='grid gap-3 sm:grid-cols-2'>
									<Stepper
										label={t('coachConfig.notif.reminderAfterDays')}
										unit={t('coachConfig.notif.daysAfterRequest')}
										value={notifications?.reminderAfterDays ?? 2}
										min={1}
										max={7}
										onChange={v => onChange({ reminderAfterDays: v })}
									/>
									<Stepper
										label={t('coachConfig.notif.maxReminders')}
										unit={t('coachConfig.notif.times')}
										value={notifications?.maxReminders ?? 3}
										min={1}
										max={10}
										onChange={v => onChange({ maxReminders: v })}
									/>
								</div>
							</div>
						</div>
					</GmSection>

					<GmSection icon={MessagesSquare} title={t('coachConfig.notif.messages')}>
						<div className='space-y-4'>
							{[
								{ key: 'initialMessage', label: t('coachConfig.notif.initialMessage'), ph: t('coachConfig.notif.initialMessagePh'), def: defaults.initialMessage },
								{ key: 'reminderMessage', label: t('coachConfig.notif.reminderMessage'), ph: t('coachConfig.notif.reminderMessagePh'), def: defaults.reminderMessage },
							].map(msg => (
								<div key={msg.key} className='space-y-1.5'>
									<GmTextarea label={msg.label} rows={4} value={notifications?.[msg.key] ?? ''} placeholder={msg.ph} onChange={v => onChange({ [msg.key]: v })} />
									<div className='flex justify-end'>
										<button
											type='button'
											onClick={() => onChange({ [msg.key]: msg.def })}
											disabled={notifications?.[msg.key] === msg.def}
											className='inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[11.5px] font-semibold text-(--color-primary-600) transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_55%,transparent)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent'
										>
											<RotateCcw className='size-3' />
											{t('coachConfig.notif.useDefault')}
										</button>
									</div>
								</div>
							))}
						</div>
					</GmSection>
				</div>
			)}
		</GmSection>
	);
}

export default memo(ReportNotifications);
