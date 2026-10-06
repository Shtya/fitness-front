'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Dumbbell, Gauge, ImageIcon, Info, Layers, Loader2, Repeat, Sparkles, Tag, Target,
	Timer, UploadCloud, VideoIcon, Wand2, X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api, { baseImg } from '@/utils/axios';
import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import { useUser } from '@/hooks/useUser';
import { Notification } from '@/config/Notification';
import { categoryLabel } from '@/lib/exercise-categories';
import {
	FIELD_BG, FIELD_SHELL, FLOAT_LABEL, NUMBER_INPUT, GmSection as Section, GmTextarea, useObjectUrl,
} from '@/components/atoms/GmFormParts';

/* ─────────────────────────── helpers ─────────────────────────── */
function parseArrayMaybe(v) {
	if (!v) return [];
	if (Array.isArray(v)) return v.filter(Boolean);
	if (typeof v === 'string') {
		try { const j = JSON.parse(v); if (Array.isArray(j)) return j.filter(Boolean); } catch (_) { }
		return v.split(',').map(s => s.trim()).filter(Boolean);
	}
	return [];
}
const isEmptyish = v => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
const safeStr = v => (v == null ? '' : String(v));

function resolveUrlMaybe(v) {
	if (!v) return '';
	if (typeof v !== 'string') return v;
	const s = v.trim();
	if (/^(https?:|data:|blob:)/i.test(s)) return s;
	try {
		const base = String(baseImg || '').replace(/\/+$/, '');
		return `${base}/${s.replace(/^\/+/, '')}`;
	} catch { return s; }
}

/* ─────────────────────────── primitives ─────────────────────────── */
function Field({ hint, highlight, className = '', children }) {
	return (
		<div className={`${className} ${highlight ? 'gm-ai-flash' : ''}`}>
			{children}
			{hint ? <p className='mt-1 ps-1 text-[11px] leading-relaxed gm-faint'>{hint}</p> : null}
		</div>
	);
}

function TagsInput({ label, value = [], onChange, placeholder, maxTags = 20, error }) {
	const [draft, setDraft] = useState('');
	const tags = Array.isArray(value) ? value : [];

	const commit = useCallback(text => {
		const parts = String(text || '').split(',').map(s => s.trim()).filter(Boolean);
		if (!parts.length) return;
		onChange(Array.from(new Set([...tags, ...parts])).slice(0, maxTags));
		setDraft('');
	}, [tags, onChange, maxTags]);

	const onKeyDown = e => {
		if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
		if (e.key === 'Backspace' && !draft && tags.length) { e.preventDefault(); onChange(tags.slice(0, -1)); }
	};

	return (
		<div>
			<div className={`relative flex min-h-11 flex-wrap items-center gap-1.5 px-3 py-2 ${FIELD_SHELL} ${error ? 'border-rose-300!' : ''}`} style={FIELD_BG}>
				<span className={FLOAT_LABEL}>{label}</span>
				<AnimatePresence mode='popLayout' initial={false}>
					{tags.map((tag, i) => (
						<motion.span
							key={tag}
							layout
							initial={{ scale: 0.85, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.85, opacity: 0 }}
							className='gm-plan__chip text-(--color-primary-700)!'
						>
							{tag}
							<button
								type='button'
								aria-label={`${label}: ${tag}`}
								onClick={() => onChange(tags.filter((_, j) => j !== i))}
								className='opacity-60 transition-opacity hover:opacity-100'
							>
								<X className='size-3' />
							</button>
						</motion.span>
					))}
				</AnimatePresence>
				<input
					value={draft}
					onChange={e => setDraft(e.target.value)}
					onKeyDown={onKeyDown}
					onBlur={() => commit(draft)}
					placeholder={tags.length ? '' : placeholder}
					className='min-w-[120px] flex-1 bg-transparent py-0.5 text-[13px] text-(--gm-ink) outline-none placeholder:text-(--gm-faint)'
				/>
			</div>
			{error ? <p className='mt-1 text-xs text-rose-500'>{error}</p> : null}
		</div>
	);
}

function UploadButton({ accept, onFile, label }) {
	return (
		<label
			title={label}
			className='grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-(--color-primary-600) transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_70%,transparent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-primary-400)_50%,transparent)]'
		>
			<UploadCloud className='size-4' />
			<input
				type='file'
				accept={accept}
				aria-label={label}
				className='sr-only'
				onChange={e => {
					onFile(e.target.files?.[0] || null);
					e.target.value = '';
				}}
			/>
		</label>
	);
}

function MediaPreview({ type, url }) {
	if (!url) return null;
	return (
		<div className='mt-2.5 overflow-hidden rounded-[12px] border' style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--color-primary-50) 70%, var(--gm-paper))' }}>
			{type === 'video'
				? <video src={url} controls preload='metadata' className='h-40 w-full object-contain' />
				: <img src={url} alt='' className='h-40 w-full object-contain' />}
		</div>
	);
}

/* ─────────────────────────── Main form ─────────────────────────── */
export function ExerciseForm({ initial, onSubmit, onCancel, categories }) {
	const t = useTranslations('workouts');
	const locale = useLocale();
	const user = useUser();

	const schema = useMemo(() =>
		yup.object({
			name: yup.string().trim().min(2, t('val.nameMin')).required(t('val.nameReq')),
			targetReps: yup.string().trim().matches(/^\d+(-\d+)?$/, t('val.repsFmt')).required(t('val.repsReq')),
			targetSets: yup.number().typeError(t('val.setsNum')).integer(t('val.setsInt')).min(0, t('val.setsMin')).max(30, t('val.setsMax')).required(t('val.setsReq')),
			rest: yup.number().typeError(t('val.restNum')).min(0, t('val.restMin')).max(1200, t('val.restMax')),
			tempo: yup.string().trim().matches(/^\d+\/\d+\/\d+$/, t('val.tempoFmt')).nullable().transform(v => (v === '' ? null : v)),
			category: yup.string().trim().required(t('val.categoryReq')),
			details: yup.string().max(2000, t('val.detailsMax')).nullable(),
			primaryMusclesWorked: yup.array(yup.string().trim()).max(20, t('val.tagsMax')),
			secondaryMusclesWorked: yup.array(yup.string().trim()).max(20, t('val.tagsMax')),
			hasImgFile: yup.boolean().default(false),
			hasVideoFile: yup.boolean().default(false),
			imgUrl: yup.string().when('hasImgFile', { is: true, then: s => s.notRequired(), otherwise: s => s.required(t('val.imgReq')) }),
			videoUrl: yup.string().required(t('val.videoReq')),
		}),
	[t]);

	const [imgFile, setImgFile] = useState(null);
	const [videoFile, setVideoFile] = useState(null);
	const imgFileUrl = useObjectUrl(imgFile);
	const videoFileUrl = useObjectUrl(videoFile);

	const [aiLoading, setAiLoading] = useState(false);
	const [aiHighlight, setAiHighlight] = useState({});
	const [setting, setSetting] = useState();
	const inFlight = useRef(null);
	const flashTimers = useRef([]);

	useEffect(() => () => {
		flashTimers.current.forEach(clearTimeout);
		inFlight.current?.abort();
	}, []);

	const flashField = name => {
		if (!name) return;
		setAiHighlight(prev => ({ ...prev, [name]: true }));
		flashTimers.current.push(setTimeout(() => setAiHighlight(prev => ({ ...prev, [name]: false })), 900));
	};

	const categoryOptions = useMemo(
		() => (categories || []).map(c => ({ id: c, label: categoryLabel(c, locale) })),
		[categories, locale],
	);

	const defaultValues = useMemo(() => ({
		name: initial?.name || '',
		details: initial?.details || '',
		category: initial?.category || '',
		primaryMusclesWorked: parseArrayMaybe(initial?.primaryMusclesWorked),
		secondaryMusclesWorked: parseArrayMaybe(initial?.secondaryMusclesWorked),
		targetReps: safeStr(initial?.targetReps || 10),
		targetSets: initial?.targetSets === 0 ? 0 : initial?.targetSets ?? 3,
		rest: initial?.rest === 0 ? 0 : initial?.rest ?? 90,
		tempo: safeStr(initial?.tempo || '1/1/1'),
		imgUrl: resolveUrlMaybe(initial?.img),
		videoUrl: resolveUrlMaybe(initial?.video),
		hasImgFile: false,
		hasVideoFile: false,
	}), [initial]);

	const { control, handleSubmit, formState: { isSubmitting }, setValue, getValues, watch, reset, trigger } = useForm({
		resolver: yupResolver(schema),
		mode: 'onBlur',
		defaultValues,
	});

	useEffect(() => {
		reset(defaultValues);
		setImgFile(null);
		setVideoFile(null);
		setAiHighlight({});
	}, [defaultValues, reset]);

	useEffect(() => {
		api.get(user?.role !== 'admin' && user?.adminId ? `/settings?user_id=${user.adminId}` : '/settings')
			.then(res => setSetting(res.data))
			.catch(() => setSetting(null));
	}, [user?.adminId, user?.role]);

	const nameVal = watch('name');
	const canUseAi = Boolean(setting?.aiSecretKey) && Boolean(nameVal && nameVal.trim().length >= 2);

	/* ── AI ── */
	async function suggestFromAI(exName) {
		const API_KEY = setting?.aiSecretKey;
		if (!API_KEY || !exName || exName.trim().length < 2) return null;
		inFlight.current?.abort();
		const ctrl = new AbortController();
		inFlight.current = ctrl;
		setAiLoading(true);
		try {
			const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				signal: ctrl.signal,
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
				body: JSON.stringify({
					model: 'openai/gpt-3.5-turbo',
					temperature: 0.2,
					max_tokens: 150,
					messages: [
						{ role: 'system', content: 'You output ONLY compact JSON matching: { "details": string, "category": string, "primary": string[], "secondary": string[], "targetReps": string, "targetSets": number, "rest": number, "tempo": string, "image"?: string, "video"?: string }.' },
						{ role: 'user', content: `Suggest default values for exercise "${exName}". Keep category simple (e.g., "Back","Chest","Legs","Shoulders","Arms","Core","Full Body").` },
						{ role: 'user', content: String.raw`Tempo must match ^\d+\/\d+\/\d+$ (e.g., "2/1/2").` },
					],
				}),
			});
			if (!res.ok) throw new Error('AI request failed');
			const data = await res.json();
			const content = data?.choices?.[0]?.message?.content || '';
			let parsed = null;
			try { const m = content.match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : content); } catch { }
			return parsed;
		} catch (e) {
			if (e?.name !== 'AbortError') Notification(t('errors.apiKeyExpired'), 'error');
			return null;
		} finally {
			if (inFlight.current === ctrl) {
				inFlight.current = null;
				setAiLoading(false);
			}
		}
	}

	async function applyAISuggestions() {
		const exName = getValues('name');
		if (!exName || exName.trim().length < 2) return;
		const s = await suggestFromAI(exName);
		if (!s) return;

		const patch = (field, val, cond = true) => {
			if (cond && val) { setValue(field, val, { shouldValidate: true }); flashField(field); }
		};

		patch('details', s.details);
		patch('category', s.category);
		patch('primaryMusclesWorked', Array.isArray(s.primary) ? s.primary.filter(Boolean).slice(0, 20) : null, isEmptyish(getValues('primaryMusclesWorked')));
		patch('secondaryMusclesWorked', Array.isArray(s.secondary) ? s.secondary.filter(Boolean).slice(0, 20) : null, isEmptyish(getValues('secondaryMusclesWorked')));
		patch('targetReps', safeStr(s.targetReps), isEmptyish(getValues('targetReps')) && typeof s.targetReps === 'string');
		patch('targetSets', s.targetSets, (getValues('targetSets') == null || getValues('targetSets') === '') && typeof s.targetSets === 'number');
		patch('rest', s.rest, (getValues('rest') == null || getValues('rest') === '') && typeof s.rest === 'number');
		if (typeof s.tempo === 'string' && s.tempo.trim()) patch('tempo', safeStr(s.tempo.trim()));
		patch('imgUrl', s.image, isEmptyish(getValues('imgUrl')) && typeof s.image === 'string');
		patch('videoUrl', s.video, isEmptyish(getValues('videoUrl')) && typeof s.video === 'string');
	}

	const pickImage = f => {
		setImgFile(f);
		setValue('hasImgFile', !!f, { shouldValidate: true });
		setValue('imgUrl', f?.name || '');
		trigger('imgUrl');
	};

	const pickVideo = f => {
		setVideoFile(f);
		setValue('hasVideoFile', !!f, { shouldValidate: true });
		setValue('videoUrl', f?.name || '');
		trigger('videoUrl');
	};

	const onValidSubmit = handleSubmit(async values => {
		await onSubmit?.({
			name: values.name,
			details: values.details || '',
			category: values.category?.trim() || null,
			primaryMusclesWorked: values.primaryMusclesWorked || [],
			secondaryMusclesWorked: values.secondaryMusclesWorked || [],
			targetReps: safeStr(values.targetReps || '10'),
			targetSets: values.targetSets ?? 3,
			rest: values.rest ?? 90,
			tempo: safeStr(values.tempo || ''),
			imgUrl: imgFile ? undefined : values.imgUrl || '',
			videoUrl: videoFile ? undefined : values.videoUrl || '',
			imgFile: imgFile || undefined,
			videoFile: videoFile || undefined,
			userId: user?.role === 'admin' ? user?.id : user?.adminId,
		});
	});

	const numberChange = onChange => v => onChange(v === '' ? '' : Number(v));

	return (
		<form onSubmit={onValidSubmit} className='relative space-y-4' noValidate>
			{aiLoading && (
				<div className='absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--gm-paper)_72%,transparent)] backdrop-blur-sm'>
					<div className='gm-float flex items-center gap-2.5 px-5 py-3'>
						<Loader2 className='size-4 animate-spin text-(--color-primary-500)' />
						<span className='text-[13px] font-semibold gm-ink-soft'>{t('ai.fetching')}</span>
					</div>
				</div>
			)}

			<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
				<Controller name='name' control={control} render={({ field, fieldState }) => (
					<Field highlight={aiHighlight.name} hint={setting?.aiSecretKey ? t('hints.nameAi') : undefined}>
						<FloatingInput
							name='name'
							required
							label={t('labels.name')}
							value={field.value}
							onChange={field.onChange}
							onBlur={field.onBlur}
							error={fieldState.error?.message}
							icon={<Dumbbell className='size-4' />}
							suffix={canUseAi ? (
								<button
									type='button'
									onClick={applyAISuggestions}
									disabled={aiLoading}
									className='inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60'
									style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
								>
									<Wand2 className='size-3.5' />
									<span className='hidden sm:inline'>{t('actions.getAi')}</span>
								</button>
							) : null}
						/>
					</Field>
				)} />

				<Controller name='category' control={control} render={({ field, fieldState }) => (
					<Field highlight={aiHighlight.category}>
						<FloatingSelect
							required
							creatable
							createPlaceholder={t('hints.createCategory')}
							label={t('labels.category')}
							options={categoryOptions}
							value={field.value}
							onChange={val => { field.onChange(val); trigger('category'); }}
							error={fieldState.error?.message}
							icon={<Tag className='size-4' />}
						/>
					</Field>
				)} />

				<Controller name='details' control={control} render={({ field, fieldState }) => (
					<Field highlight={aiHighlight.details} className='sm:col-span-2'>
						<GmTextarea label={t('labels.details')} value={field.value} onChange={field.onChange} rows={3} error={fieldState.error?.message} />
					</Field>
				)} />
			</div>

			<Section icon={Target} title={t('sections.targets')}>
				<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
					<Controller name='targetReps' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.targetReps} hint={t('placeholders.reps')}>
							<FloatingInput
								name='targetReps'
								label={t('labels.targetReps').trim()}
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								icon={<Repeat className='size-4' />}
								clearable={false}
							/>
						</Field>
					)} />
					<Controller name='targetSets' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.targetSets}>
							<FloatingInput
								name='targetSets'
								type='number'
								inputMode='numeric'
								label={t('labels.targetSets')}
								value={safeStr(field.value)}
								onChange={numberChange(field.onChange)}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								icon={<Layers className='size-4' />}
								inputClassName={NUMBER_INPUT}
								clearable={false}
							/>
						</Field>
					)} />
					<Controller name='rest' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.rest}>
							<FloatingInput
								name='rest'
								type='number'
								inputMode='numeric'
								label={t('labels.rest')}
								value={safeStr(field.value)}
								onChange={numberChange(field.onChange)}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								icon={<Timer className='size-4' />}
								inputClassName={NUMBER_INPUT}
								clearable={false}
							/>
						</Field>
					)} />
					<Controller name='tempo' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.tempo} hint={t('placeholders.tempo')}>
							<FloatingInput
								name='tempo'
								label={t('labels.tempo')}
								value={safeStr(field.value)}
								onChange={field.onChange}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								icon={<Gauge className='size-4' />}
								clearable={false}
							/>
						</Field>
					)} />
				</div>
			</Section>

			<Section icon={Layers} title={t('labels.muscles')}>
				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<Controller name='primaryMusclesWorked' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.primaryMusclesWorked}>
							<TagsInput label={t('labels.primary')} value={field.value} onChange={field.onChange} placeholder={t('placeholders.tag')} error={fieldState.error?.message} />
						</Field>
					)} />
					<Controller name='secondaryMusclesWorked' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.secondaryMusclesWorked}>
							<TagsInput label={t('labels.secondary')} value={field.value} onChange={field.onChange} placeholder={t('placeholders.tag')} error={fieldState.error?.message} />
						</Field>
					)} />
				</div>
			</Section>

			<Controller name='hasImgFile' control={control} render={() => null} />
			<Controller name='hasVideoFile' control={control} render={() => null} />

			<Section icon={ImageIcon} title={t('sections.media')}>
				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<Controller name='imgUrl' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.imgUrl} hint={fieldState.error ? undefined : t('placeholders.mediaUrl')}>
							<FloatingInput
								name='imgUrl'
								required
								label={t('labels.image')}
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								icon={<ImageIcon className='size-4' />}
								suffix={<UploadButton accept='image/*' label={t('actions.uploadImage')} onFile={pickImage} />}
								onPaste={e => {
									const clipItems = e.clipboardData?.items;
									if (clipItems) {
										for (const item of clipItems) {
											if (item.kind === 'file' && item.type.startsWith('image/')) {
												const file = item.getAsFile();
												if (file) {
													e.preventDefault();
													setImgFile(file);
													setValue('hasImgFile', true, { shouldValidate: true });
													setValue('imgUrl', file.name || '', { shouldValidate: true });
													trigger('imgUrl');
													return;
												}
											}
										}
									}
									const txt = e.clipboardData?.getData('text/plain')?.trim();
									if (txt && /^(https?:|data:|blob:)/i.test(txt)) {
										e.preventDefault();
										setImgFile(null);
										setValue('hasImgFile', false, { shouldValidate: true });
										field.onChange(txt);
										trigger('imgUrl');
									}
								}}
							/>
							<MediaPreview type='image' url={imgFile ? imgFileUrl : field.value} />
						</Field>
					)} />

					<Controller name='videoUrl' control={control} render={({ field, fieldState }) => (
						<Field highlight={aiHighlight.videoUrl} hint={fieldState.error ? undefined : t('placeholders.mediaUrlVideo')}>
							<FloatingInput
								name='videoUrl'
								required
								label={t('labels.video')}
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								error={fieldState.error?.message}
								icon={<VideoIcon className='size-4' />}
								suffix={<UploadButton accept='video/*' label={t('actions.uploadVideo')} onFile={pickVideo} />}
							/>
							<MediaPreview type='video' url={videoFile ? videoFileUrl : field.value} />
						</Field>
					)} />
				</div>
			</Section>

			<div className='gm-wizard-banner items-start!'>
				<span className='gm-cred__icon shrink-0'><Info className='size-4' /></span>
				<p className='text-[12px] leading-relaxed gm-ink-soft'>
					<strong className='font-semibold gm-ink'>{t('notes.muscleWikiTipLabel')} </strong>
					{t('notes.muscleWikiTipPrefix')}{' '}
					<a
						href='https://musclewiki.com/'
						target='_blank'
						rel='noreferrer'
						className='font-semibold text-(--color-primary-600) underline underline-offset-2 hover:text-(--color-primary-800)'
					>
						musclewiki.com
					</a>
					{t('notes.muscleWikiTipSuffix')}
				</p>
			</div>

			<div className='gm-modal-foot'>
				{onCancel && (
					<Button color='neutral' name={t('actions.cancel')} onClick={onCancel} disabled={isSubmitting} />
				)}
				{setting?.aiSecretKey && (
					<Button
						color='neutral'
						name={t('actions.fillWithAi')}
						onClick={applyAISuggestions}
						loading={aiLoading}
						disabled={!canUseAi || aiLoading}
						icon={<Sparkles className='size-4' />}
					/>
				)}
				<Button color='primary' type='submit' name={t('actions.save')} loading={isSubmitting} disabled={isSubmitting} />
			</div>
		</form>
	);
}
