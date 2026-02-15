'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { Loader2, UploadCloud, Wand2, Sparkles, X } from 'lucide-react';
import Select from '@/components/atoms/Select';
import api, { baseImg } from '@/utils/axios';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/useUser';
import { Notification } from '@/config/Notification';
import { useTheme } from '@/app/[locale]/theme';

/* -------------------- helpers -------------------- */
function parseArrayMaybe(v) {
	if (!v) return [];
	if (Array.isArray(v)) return v.filter(Boolean);
	if (typeof v === 'string') {
		try {
			const j = JSON.parse(v);
			if (Array.isArray(j)) return j.filter(Boolean);
		} catch (_) { }
		return v
			.split(',')
			.map(s => s.trim())
			.filter(Boolean);
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
		const rel = s.replace(/^\/+/, '');
		return `${base}/${rel}`;
	} catch {
		return s;
	}
}

/* ================================================
	 Custom UI Primitives (Inputs / Buttons)
================================================ */
function Field({ label, hint, required, error, children, highlight }) {
	return (
		<div
			className={'w-full transition-all duration-300 ' + (highlight ? 'p-1 animate-pulse rounded-lg' : '')}
			style={
				highlight
					? {
						boxShadow: '0 0 0 2px rgba(var(--ring-highlight), 0.5)',
						background: 'rgba(var(--ring-highlight-bg), 0.15)',
					}
					: {}
			}>
			{label ? (
				<label className='mb-1.5 block text-sm font-semibold' style={{ color: 'var(--color-primary-700)' }}>
					{label} {required ? <span style={{ color: 'var(--color-rose-500, #f43f5e)' }}>*</span> : null}
				</label>
			) : null}
			{children}
			{error ? (
				<p className='mt-1.5 text-xs font-medium' style={{ color: 'var(--color-rose-500, #e11d48)' }}>
					{error}
				</p>
			) : hint ? (
				<p className='mt-1.5 text-xs' style={{ color: 'var(--color-primary-400)' }}>
					{hint}
				</p>
			) : null}
		</div>
	);
}

function TextInput({ value, onChange, placeholder, name, required, disabled, rightSlot, className = '', onBlur, onPaste }) {
	return (
		<div
			className={'relative flex items-center rounded-lg border transition-all duration-200 ' + (disabled ? 'opacity-55 ' : '') + className}
			style={{
				borderColor: 'var(--color-primary-200)',
				background: 'white',
				boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
			}}>
			<style>{`
        .themed-input:focus-within {
          border-color: var(--color-primary-500) !important;
          box-shadow: 0 0 0 3px rgba(var(--focus-ring), 0.25), 0 1px 3px rgba(0,0,0,0.06) !important;
        }
      `}</style>
			<input
				name={name}
				value={value ?? ''}
				onChange={e => onChange(e.target.value)}
				onBlur={onBlur}
				onPaste={onPaste}
				placeholder={placeholder}
				required={required}
				disabled={disabled}
				className="themed-input peer w-full rounded-lg bg-transparent px-4 py-2.5 text-sm outline-none"
			/>
			{rightSlot ? <div className="absolute rtl:left-1.5 ltr:right-1.5 flex items-center gap-1">{rightSlot}</div> : null}
		</div>
	);
}

function NumberInput({ value, onChange, name, min = 0, step = 1, disabled, placeholder }) {
	return (
		<div className='relative'>
			<style>{`
        .themed-number-input:focus {
          border-color: var(--color-primary-500) !important;
          box-shadow: 0 0 0 3px rgba(var(--focus-ring), 0.25), 0 1px 3px rgba(0,0,0,0.06) !important;
        }
        .themed-number-input::-webkit-outer-spin-button,
        .themed-number-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
			<input
				type='number'
				inputMode='numeric'
				name={name}
				value={safeStr(value)}
				min={min}
				step={step}
				onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
				placeholder={placeholder}
				disabled={disabled}
				className='themed-number-input w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all duration-200'
				style={{
					borderColor: 'var(--color-primary-200)',
					background: 'white',
					color: 'var(--color-primary-900)',
					boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
				}}
			/>
		</div>
	);
}

function TextArea({ value, onChange, rows = 3, placeholder, disabled }) {
	return (
		<>
			<style>{`
        .themed-textarea:focus {
          border-color: var(--color-primary-500) !important;
          box-shadow: 0 0 0 3px rgba(var(--focus-ring), 0.25), 0 1px 3px rgba(0,0,0,0.06) !important;
        }
      `}</style>
			<textarea
				rows={rows}
				value={value ?? ''}
				onChange={e => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				className='themed-textarea w-full resize-y rounded-lg border px-4 py-2.5 text-sm outline-none transition-all duration-200'
				style={{
					borderColor: 'var(--color-primary-200)',
					background: 'white',
					color: 'var(--color-primary-900)',
					boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
				}}
			/>
		</>
	);
}

/* Tags input */
function TagsField({ value = [], onChange, placeholder = 'Type and press Enter', maxTags = 20 }) {
	const [input, setInput] = useState('');

	function addTag(tag) {
		const t = tag.trim();
		if (!t) return;
		const next = Array.from(new Set([...(value || []), t])).slice(0, maxTags);
		onChange(next);
		setInput('');
	}
	function removeTag(idx) {
		const next = [...(value || [])];
		next.splice(idx, 1);
		onChange(next);
	}

	return (
		<div
			className='rounded-lg border p-2.5 transition-all duration-200'
			style={{
				borderColor: 'var(--color-primary-200)',
				background: 'white',
				boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
			}}>
			<div className='flex flex-wrap gap-2'>
				{(value || []).map((t, i) => (
					<span
						key={`${t}-${i}`}
						className='group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150'
						style={{
							background: 'var(--color-primary-100)',
							color: 'var(--color-primary-700)',
						}}>
						{t}
						<button
							type='button'
							onClick={() => removeTag(i)}
							className='opacity-50 hover:opacity-100 transition-opacity'
							style={{ color: 'var(--color-primary-600)' }}
							aria-label='Remove tag'>
							<X className='h-3.5 w-3.5' />
						</button>
					</span>
				))}
				<input
					value={input}
					onChange={e => setInput(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addTag(input);
						}
					}}
					placeholder={placeholder}
					className='min-w-[160px] flex-1 bg-transparent px-2 py-1 text-sm outline-none'
					style={{ color: 'var(--color-primary-900)' }}
				/>
			</div>
		</div>
	);
}

function MediaPreview({ type = 'image', url }) {
	if (!url) return null;
	return (
		<div
			className='mt-2 overflow-hidden rounded-lg border'
			style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}>
			{type === 'video' ? (
				<video src={url} controls className='h-44 w-full object-contain' />
			) : (
				<img src={url} alt='' className='h-44 w-full object-contain' />
			)}
		</div>
	);
}

function PrimaryButton({ children, type = 'button', onClick, disabled, loading, fullWidth }) {
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled || loading}
			className={'relative inline-flex items-center justify-center overflow-hidden rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ' + (fullWidth ? 'w-full ' : '') + (disabled || loading ? 'opacity-60 cursor-not-allowed ' : 'hover:scale-[1.02] active:scale-[0.97]')}
			style={{
				background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
				boxShadow: '0 2px 10px rgba(var(--shadow-primary), 0.35)',
			}}>
			{loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
			{children}
		</button>
	);
}

/* ================================================
	 The Form (with i18n)
================================================ */
 


export function ExerciseForm({ initial, onSubmit, categories }) {
	const t = useTranslations('workouts');
	const { colors } = useTheme();

	const schema = useMemo(
		() =>
			yup.object({
				name: yup.string().trim().min(2, t('val.nameMin')).required(t('val.nameReq')),
				targetReps: yup
					.string()
					.trim()
					.matches(/^\d+(-\d+)?$/, t('val.repsFmt'))
					.required(t('val.repsReq')),
				targetSets: yup.number().typeError(t('val.setsNum')).integer(t('val.setsInt')).min(0, t('val.setsMin')).max(30, t('val.setsMax')).required(t('val.setsReq')),
				rest: yup.number().typeError(t('val.restNum')).min(0, t('val.restMin')).max(1200, t('val.restMax')),
				tempo: yup
					.string()
					.trim()
					.matches(/^\d+\/\d+\/\d+$/, t('val.tempoFmt'))
					.nullable()
					.transform(v => (v === '' ? null : v)),
				category: yup.string().trim().required(t('val.categoryReq')),
				details: yup.string().max(2000, t('val.detailsMax')).nullable(),
				primaryMusclesWorked: yup.array(yup.string().trim()).max(20, t('val.tagsMax')),
				secondaryMusclesWorked: yup.array(yup.string().trim()).max(20, t('val.tagsMax')),
				hasImgFile: yup.boolean().default(false),
				hasVideoFile: yup.boolean().default(false),
				imgUrl: yup.string().when('hasImgFile', {
					is: true,
					then: s => s.notRequired(),
					otherwise: s => s.required(t('val.imgReq')),
				}),
				videoUrl: yup.string().required(t('val.videoReq')),
			}),
		[t],
	);

	const [imgFile, setImgFile] = useState(null);
	const [videoFile, setVideoFile] = useState(null);

	// AI state
	const [aiLoading, setAiLoading] = useState(false);
	const [showAiButton, setShowAiButton] = useState(false);
	const [aiHighlight, setAiHighlight] = useState({});
	const inFlight = useRef(null);

	const flashField = name => {
		if (!name) return;
		setAiHighlight(prev => ({ ...prev, [name]: true }));
		setTimeout(() => {
			setAiHighlight(prev => ({ ...prev, [name]: false }));
		}, 900);
	};

	const categoryOptions = useMemo(() => (categories || []).map(c => ({ id: c, label: c })), [categories]);

	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
		setValue,
		getValues,
		watch,
		reset,
		trigger,
	} = useForm({
		resolver: yupResolver(schema),
		mode: 'onBlur',
		defaultValues: {
			name: initial?.name || '',
			details: initial?.details || '',
			category: initial?.category || '',
			primaryMusclesWorked: parseArrayMaybe(initial?.primaryMusclesWorked),
			secondaryMusclesWorked: parseArrayMaybe(initial?.secondaryMusclesWorked),
			targetReps: safeStr(initial?.targetReps || 10),
			targetSets: initial?.targetSets === 0 ? 0 : initial?.targetSets ?? 3,
			rest: initial?.rest === 0 ? 0 : initial?.rest ?? 90,
			tempo: safeStr(initial?.tempo || '1/1/1'),
			imgUrl: initial?.img || '',
			videoUrl: initial?.video || '',
			hasImgFile: false,
			hasVideoFile: false,
		},
	});

	useEffect(() => {
		reset({
			name: initial?.name || '',
			details: initial?.details || '',
			category: initial?.category || '',
			primaryMusclesWorked: parseArrayMaybe(initial?.primaryMusclesWorked),
			secondaryMusclesWorked: parseArrayMaybe(initial?.secondaryMusclesWorked),
			targetReps: safeStr(initial?.targetReps || 10),
			targetSets: initial?.targetSets === 0 ? 0 : initial?.targetSets ?? 3,
			rest: initial?.rest === 0 ? 0 : initial?.rest ?? 90,
			tempo: safeStr(initial?.tempo || '1/1/1'),
			imgUrl: initial?.img || '',
			videoUrl: initial?.video || '',
			hasImgFile: false,
			hasVideoFile: false,
		});
		setImgFile(null);
		setVideoFile(null);
		setAiHighlight({});
	}, [initial, reset]);

	const [setting, setSetting] = useState();
	const user = useUser();

	useEffect(() => {
		api.get(user?.role == 'admin' ? `/settings` : `/settings?user_id=${user?.adminId}`).then(res => {
			setSetting(res.data);
		});
	}, [user?.adminId, user?.role]);

	useEffect(() => {
		if (!initial) return;
		const img = resolveUrlMaybe(initial?.img);
		const vid = resolveUrlMaybe(initial?.video);
		setValue('imgUrl', img);
		setValue('videoUrl', vid);
	}, [initial, setValue]);

	const nameVal = watch('name');
	useEffect(() => setShowAiButton(Boolean(nameVal && nameVal.trim().length >= 2)), [nameVal]);

	/* ---------- AI ---------- */
	async function suggestFromAI(exName) {
		const API_KEY = setting?.aiSecretKey;
		if (!API_KEY || !exName || exName.trim().length < 2) return null;
		if (inFlight.current) inFlight.current.abort();
		const ctrl = new AbortController();
		inFlight.current = ctrl;

		setAiLoading(true);
		try {
			const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
				body: JSON.stringify({
					model: 'openai/gpt-3.5-turbo',
					temperature: 0.2,
					max_tokens: 150,
					messages: [
						{
							role: 'system',
							content:
								'You output ONLY compact JSON matching this schema: { "details": string, "category": string, "primary": string[], "secondary": string[], "targetReps": string, "targetSets": number, "rest": number, "tempo": string, "image"?: string, "video"?: string }.',
						},
						{ role: 'user', content: `Suggest default values for exercise "${exName}". Keep category simple (e.g., "Back","Chest","Legs","Shoulders","Arms","Core","Full Body").` },
						{ role: 'user', content: String.raw`Tempo must match ^\d+\/\d+\/\d+$ (e.g., "2/1/2").` },
					],
					signal: ctrl.signal,
				}),
			});
			if (!res.ok) throw new Error('AI request failed');
			const data = await res.json();
			const content = data?.choices?.[0]?.message?.content || '';
			let parsed = null;
			try {
				const m = content.match(/\{[\s\S]*\}/);
				parsed = JSON.parse(m ? m[0] : content);
			} catch { }
			return parsed;
		} catch (err) {
			Notification(t('errors.apiKeyExpired'), 'error');
			return null;
		} finally {
			setAiLoading(false);
			if (inFlight.current === ctrl) inFlight.current = null;
		}
	}

	async function applyAISuggestions() {
		const exName = getValues('name');
		if (!exName || exName.trim().length < 2) return;
		const s = await suggestFromAI(exName);
		if (!s) return;

		if (s.details) { setValue('details', s.details, { shouldValidate: true }); flashField('details'); }
		if (s.category) { setValue('category', s.category, { shouldValidate: true }); flashField('category'); }

		const currentPrimary = getValues('primaryMusclesWorked');
		if (isEmptyish(currentPrimary) && Array.isArray(s.primary)) {
			setValue('primaryMusclesWorked', s.primary.filter(Boolean).slice(0, 20), { shouldValidate: true });
			flashField('primaryMusclesWorked');
		}
		const currentSecondary = getValues('secondaryMusclesWorked');
		if (isEmptyish(currentSecondary) && Array.isArray(s.secondary)) {
			setValue('secondaryMusclesWorked', s.secondary.filter(Boolean).slice(0, 20), { shouldValidate: true });
			flashField('secondaryMusclesWorked');
		}
		const currentReps = getValues('targetReps');
		if (isEmptyish(currentReps) && typeof s.targetReps === 'string') {
			setValue('targetReps', safeStr(s.targetReps), { shouldValidate: true });
			flashField('targetReps');
		}
		const currentSets = getValues('targetSets');
		if ((currentSets == null || currentSets === '') && typeof s.targetSets === 'number') {
			setValue('targetSets', s.targetSets, { shouldValidate: true });
			flashField('targetSets');
		}
		const currentRest = getValues('rest');
		if ((currentRest == null || currentRest === '') && typeof s.rest === 'number') {
			setValue('rest', s.rest, { shouldValidate: true });
			flashField('rest');
		}
		if (typeof s.tempo === 'string' && s.tempo.trim()) {
			setValue('tempo', safeStr(s.tempo.trim()), { shouldValidate: true });
			flashField('tempo');
		}
		const currentImg = getValues('imgUrl');
		if (isEmptyish(currentImg) && typeof s.image === 'string') {
			setValue('imgUrl', s.image, { shouldValidate: true });
			flashField('imgUrl');
		}
		const currentVideo = getValues('videoUrl');
		if (isEmptyish(currentVideo) && typeof s.video === 'string') {
			setValue('videoUrl', s.video, { shouldValidate: true });
			flashField('videoUrl');
		}
	}

	const onValidSubmit = handleSubmit(async values => {
		const payload = {
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
			userId: user?.role == 'admin' ? user?.id : user?.adminId,
		};
		await onSubmit?.(payload);
	});

	/* Dynamic CSS vars injected once so nested components pick them up */
	const ringHex = colors?.primary?.[500] || '#6366f1';

	return (
		<form onSubmit={onValidSubmit} className='relative space-y-5'>
			{/* Dynamic ring helper vars */}
			<style>{`
        :root {
          --focus-ring: 99, 102, 241;
          --shadow-primary: 99, 102, 241;
          --ring-highlight: 99, 102, 241;
          --ring-highlight-bg: 238, 242, 255;
        }
        .themed-input::placeholder,
        .themed-number-input::placeholder,
        .themed-textarea::placeholder { color: var(--color-primary-300); }
      `}</style>

			{/* AI Loading Overlay */}
			{aiLoading && (
				<div className='absolute inset-0 z-10 grid place-items-center rounded-lg backdrop-blur-sm' style={{ background: 'rgba(255,255,255,0.75)' }}>
					<div
						className='flex items-center gap-2.5 rounded-lg px-5 py-3 shadow-lg'
						style={{
							border: '1px solid var(--color-primary-200)',
							background: 'white',
						}}>
						<Loader2 className='h-4 w-4 animate-spin' style={{ color: 'var(--color-primary-500)' }} />
						<span className='text-sm font-medium' style={{ color: 'var(--color-primary-700)' }}>
							{t('ai.fetching')}
						</span>
					</div>
				</div>
			)}

			<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
				{/* Name */}
				<Controller
					name='name'
					control={control}
					render={({ field, fieldState }) => (
						<Field label={t('labels.name')} required hint={showAiButton ? t('hints.nameAi') : undefined} error={fieldState.error?.message} highlight={aiHighlight.name}>
							<TextInput
								name='name'
								value={field.value}
								onChange={field.onChange}
								placeholder={t('placeholders.name')}
								rightSlot={
									showAiButton && setting?.aiSecretKey ? (
										<button
											type='button'
											onClick={applyAISuggestions}
											className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-[1.04] active:scale-[0.96]'
											style={{
												background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
												boxShadow: '0 1px 6px rgba(var(--shadow-primary), 0.3)',
											}}>
											<Wand2 className='h-3.5 w-3.5' />
											{t('actions.getAi')}
										</button>
									) : null
								}
							/>
						</Field>
					)}
				/>

				{/* Category */}
				<Controller
					name='category'
					control={control}
					render={({ field, fieldState }) => (
						<Field label={t('labels.category')} required error={fieldState.error?.message} highlight={aiHighlight.category}>
							<Select
								searchable={false}
								clearable={false}
								className='!w-full'
								placeholder={t('placeholders.category')}
								options={categoryOptions}
								value={field.value}
								onChange={val => field.onChange(val)}
								allowCustom={true}
								createHint={t('hints.createCategory')}
							/>
						</Field>
					)}
				/>

				{/* Reps + Sets row */}
				<div className='max-md:space-y-4 md:grid md:grid-cols-2 md:gap-3'>
					<Controller
						name='targetReps'
						control={control}
						render={({ field, fieldState }) => (
							<Field label={t('labels.targetReps')} error={fieldState.error?.message} highlight={aiHighlight.targetReps}>
								<TextInput name='targetReps' value={field.value} onChange={field.onChange} placeholder={t('placeholders.reps')} />
							</Field>
						)}
					/>
					<Controller
						name='targetSets'
						control={control}
						render={({ field, fieldState }) => (
							<Field label={t('labels.targetSets')} error={fieldState.error?.message} highlight={aiHighlight.targetSets}>
								<NumberInput name='targetSets' value={field.value} onChange={field.onChange} min={0} step={1} placeholder={t('placeholders.sets')} />
							</Field>
						)}
					/>
				</div>

				{/* Rest + Tempo row */}
				<div className='max-md:space-y-4 md:grid md:grid-cols-2 md:gap-3'>
					<Controller
						name='rest'
						control={control}
						render={({ field, fieldState }) => (
							<Field label={t('labels.rest')} error={fieldState.error?.message} highlight={aiHighlight.rest}>
								<NumberInput name='rest' value={field.value} onChange={field.onChange} min={0} step={5} placeholder={t('placeholders.rest')} />
							</Field>
						)}
					/>
					<Controller
						name='tempo'
						control={control}
						render={({ field, fieldState }) => (
							<Field label={t('labels.tempo')} error={fieldState.error?.message} highlight={aiHighlight.tempo}>
								<TextInput name='tempo' value={safeStr(field.value)} onChange={field.onChange} placeholder={t('placeholders.tempo')} />
							</Field>
						)}
					/>
				</div>

				{/* Details */}
				<Controller
					name='details'
					control={control}
					render={({ field, fieldState }) => (
						<div className='sm:col-span-2'>
							<Field label={t('labels.details')} error={fieldState.error?.message} highlight={aiHighlight.details}>
								<TextArea rows={2} value={field.value} onChange={field.onChange} placeholder={t('placeholders.details')} />
							</Field>
						</div>
					)}
				/>

				{/* Primary Muscles */}
				<Controller
					name='primaryMusclesWorked'
					control={control}
					render={({ field, fieldState }) => (
						<Field label={t('labels.primary')} error={fieldState.error?.message} highlight={aiHighlight.primaryMusclesWorked}>
							<TagsField value={field.value} onChange={field.onChange} placeholder={t('placeholders.tag')} maxTags={20} />
						</Field>
					)}
				/>

				{/* Secondary Muscles */}
				<Controller
					name='secondaryMusclesWorked'
					control={control}
					render={({ field, fieldState }) => (
						<Field label={t('labels.secondary')} error={fieldState.error?.message} highlight={aiHighlight.secondaryMusclesWorked}>
							<TagsField value={field.value} onChange={field.onChange} placeholder={t('placeholders.tag')} maxTags={20} />
						</Field>
					)}
				/>

				{/* Media */}
				<div className='sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<Controller name='hasImgFile' control={control} render={() => null} />
					<Controller name='hasVideoFile' control={control} render={() => null} />

					{/* Image */}
					<Controller
						name='imgUrl'
						control={control}
						render={({ field, fieldState }) => (
							<div>
								<Field label={t('labels.image')} required error={fieldState.error?.message} highlight={aiHighlight.imgUrl}>
									<div className='flex items-center gap-2'>
										<TextInput
											name='imgUrl'
											value={field.value}
											onChange={val => { field.onChange(val); }}
											placeholder={t('placeholders.mediaUrl')}
											className='flex-1'
											onPaste={(e) => {
  // 1) Try to get an image file from clipboard
  const items = e.clipboardData?.items;
  if (items && items.length) {
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault(); // prevent weird text paste
          setImgFile(file);
          setValue('hasImgFile', true, { shouldValidate: true });
          // you can set empty or file name, up to you:
          setValue('imgUrl', file.name || '', { shouldValidate: true });
          trigger('imgUrl');
          return; // stop here, image handled
        }
      }
    }
  }

  // 2) Otherwise treat it as text (URL)
  const txt = e.clipboardData?.getData('text/plain')?.trim();
  if (txt && /^(https?:|data:|blob:)/i.test(txt)) {
    setImgFile(null);
    setValue('hasImgFile', false, { shouldValidate: true });
    field.onChange(txt);
    trigger('imgUrl');
  }
}}

										/>
										<label
											className='inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-[10px] text-sm transition-all duration-200 hover:scale-[1.03]'
											style={{
												borderColor: 'var(--color-primary-200)',
												background: 'var(--color-primary-50)',
												color: 'var(--color-primary-600)',
											}}>
											<UploadCloud className='h-4 w-4' />
											<input
												type='file'
												accept='image/*'
												className='hidden'
												onChange={e => {
													const f = e.target.files?.[0] || null;
													setImgFile(f);
													setValue('hasImgFile', !!f, { shouldValidate: true });
													setValue('imgUrl', f?.name || '');
													trigger('imgUrl');
												}}
												aria-label={t('actions.uploadImage')}
											/>
										</label>
									</div>
 
									<MediaPreview type='image' url={imgFile ? URL.createObjectURL(imgFile) : field.value} />
								</Field>
							</div>
						)}
					/>

					{/* Video */}
					<Controller
						name='videoUrl'
						control={control}
						render={({ field, fieldState }) => (
							<div>
								<Field label={t('labels.video')} required error={fieldState.error?.message} highlight={aiHighlight.videoUrl}>
									<div className='flex items-center gap-2'>
										<TextInput
											name='videoUrl'
											value={field.value}
											onChange={val => { field.onChange(val); }}
											placeholder={t('placeholders.mediaUrlVideo')}
											className='flex-1'
										/>
										<label
											className='inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-[10px] text-sm transition-all duration-200 hover:scale-[1.03]'
											style={{
												borderColor: 'var(--color-primary-200)',
												background: 'var(--color-primary-50)',
												color: 'var(--color-primary-600)',
											}}>
											<UploadCloud className='h-4 w-4' />
											<input
												type='file'
												accept='video/*'
												className='hidden'
												onChange={e => {
													const f = e.target.files?.[0] || null;
													setVideoFile(f);
													setValue('hasVideoFile', !!f, { shouldValidate: true });
													setValue('videoUrl', f?.name || '');
													trigger('videoUrl');
												}}
												aria-label={t('actions.uploadVideo')}
											/>
										</label>
									</div>
									<MediaPreview type='video' url={videoFile ? URL.createObjectURL(videoFile) : field.value} />
								</Field>
							</div>
						)}
					/>

					{/* MuscleWiki tip */}
					<div
						className='sm:col-span-2 rounded-lg border border-dashed px-4 py-3 text-[11px] leading-relaxed'
						style={{
							borderColor: 'var(--color-primary-200)',
							background: 'var(--color-primary-50)',
							color: 'var(--color-primary-600)',
						}}>
						<strong className='font-semibold' style={{ color: 'var(--color-primary-700)' }}>
							{t('notes.muscleWikiTipLabel')}
						</strong>{' '}
						{t('notes.muscleWikiTipPrefix')}{' '}
						<a
							href='https://musclewiki.com/'
							target='_blank'
							rel='noreferrer'
							className='underline font-medium'
							style={{ color: 'var(--color-primary-600)' }}>
							musclewiki.com
						</a>
						{t('notes.muscleWikiTipSuffix')}
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div className='flex items-center justify-end gap-3 pt-3'>
				{setting?.aiSecretKey && (
					<PrimaryButton type='button' onClick={applyAISuggestions} loading={aiLoading} disabled={!nameVal || nameVal.trim().length < 2}>
						<Sparkles className='mr-1.5 h-4 w-4' />
						{t('actions.fillWithAi')}
					</PrimaryButton>
				)}
				<PrimaryButton type='submit' loading={isSubmitting}>
					{t('actions.save')}
				</PrimaryButton>
			</div>
		</form>
	);
}