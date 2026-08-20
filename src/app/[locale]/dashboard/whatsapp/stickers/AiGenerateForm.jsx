'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2, RefreshCw, Save, Sparkles, Sticker, Upload, X } from 'lucide-react';
import { generateWhatsAppAiMedia, listWhatsAppAiModels, validateAiReferenceFile } from './whatsapp-ai-media';
import api from '@/utils/axios';
import { IMAGE_AI_PRESETS } from './sticker-chatgpt-prompt';
import {
	NEW_STICKER_PROMPT_ID,
	SAVE_STICKER_PROMPT_ID,
	listStickerPromptLibrary,
	saveStickerPrompt,
	stickerPromptSelectOptions,
} from './sticker-prompt-library';
import { WaCustomSelect } from '../WaCustomSelect';

async function canvasToBlob(canvas, type, quality) {
	return new Promise(resolve => {
		canvas.toBlob(resolve, type, quality);
	});
}

async function overlayStickerCaption(file, caption) {
	const text = String(caption || '').trim().slice(0, 48);
	if (!file || !text || typeof createImageBitmap !== 'function') return file;
	let bitmap = null;
	try {
		bitmap = await createImageBitmap(file);
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext('2d');
		if (!context) return file;
		context.drawImage(bitmap, 0, 0);
		const fontSize = Math.max(22, Math.round(canvas.width * 0.11));
		context.font = `800 ${fontSize}px "Segoe UI", Tahoma, Arial, sans-serif`;
		context.textAlign = 'center';
		context.textBaseline = 'bottom';
		context.lineJoin = 'round';
		context.lineWidth = Math.max(6, Math.round(fontSize * 0.22));
		context.strokeStyle = '#111111';
		context.fillStyle = '#ffffff';
		const x = canvas.width / 2;
		const y = canvas.height - Math.round(canvas.height * 0.08);
		context.strokeText(text, x, y);
		context.fillText(text, x, y);
		const blob =
			(await canvasToBlob(canvas, 'image/webp', 0.9)) || (await canvasToBlob(canvas, 'image/png'));
		if (!blob?.size) return file;
		const extension = String(blob.type || '').includes('png') ? 'png' : 'webp';
		return new File([blob], String(file.name || 'sticker').replace(/\.[^.]+$/, `.${extension}`), {
			type: blob.type || 'image/webp',
		});
	} catch {
		return file;
	} finally {
		bitmap?.close?.();
	}
}

export default function AiGenerateForm({
	kind = 'image',
	accountId,
	locale = 'en',
	stickers = [],
	previews = {},
	onUse,
	disabled = false,
}) {
	const ar = locale === 'ar';
	const isSticker = kind === 'sticker';
	const [prompt, setPrompt] = useState('');
	const [referenceFile, setReferenceFile] = useState(null);
	const [referencePreview, setReferencePreview] = useState('');
	const [referenceStickerId, setReferenceStickerId] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [generatedFile, setGeneratedFile] = useState(null);
	const [models, setModels] = useState([]);
	const [modelId, setModelId] = useState('pollinations:sana');
	const [stickerText, setStickerText] = useState('');
	const [promptLibrary, setPromptLibrary] = useState(() => listStickerPromptLibrary());
	const [selectedPromptId, setSelectedPromptId] = useState('');
	const [loading, setLoading] = useState(false);
	const [using, setUsing] = useState(false);
	const [error, setError] = useState('');
	const abortRef = useRef(null);
	const fileRef = useRef(null);
	const generatedUrlRef = useRef('');

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
			if (generatedUrlRef.current) URL.revokeObjectURL(generatedUrlRef.current);
		};
	}, []);

	useEffect(() => {
		return () => {
			if (referencePreview) URL.revokeObjectURL(referencePreview);
		};
	}, [referencePreview]);

	useEffect(() => {
		if (!accountId) return undefined;
		let cancelled = false;
		Promise.all([
			listWhatsAppAiModels(accountId),
			api.get('/ai/settings').then((res) => res.data).catch(() => null),
		])
			.then(([data, settings]) => {
				if (cancelled) return;
				const items = Array.isArray(data?.models) ? data.models : [];
				setModels(items);
				const assigned = settings?.features?.find((item) => item.id === 'whatsapp.image')?.modelKey;
				const match =
					items.find((item) => assigned && (item.id === assigned || item.model === assigned || item.id?.endsWith(`:${assigned}`))) ||
					items.find((item) => item.available && item.free) ||
					items.find((item) => item.available) ||
					items[0];
				if (match?.id) setModelId(match.id);
			})
			.catch(() => {
				if (!cancelled) setModels([]);
			});
		return () => {
			cancelled = true;
		};
	}, [accountId]);

	const clearReference = () => {
		if (referencePreview) URL.revokeObjectURL(referencePreview);
		setReferenceFile(null);
		setReferencePreview('');
		setReferenceStickerId('');
		if (fileRef.current) fileRef.current.value = '';
	};

	const setLocalReference = file => {
		const message = validateAiReferenceFile(file, ar);
		if (message) {
			toast.error(message);
			return;
		}
		if (referencePreview) URL.revokeObjectURL(referencePreview);
		setReferenceFile(file);
		setReferenceStickerId('');
		setReferencePreview(URL.createObjectURL(file));
	};

	const cancelGenerate = () => {
		abortRef.current?.abort();
		abortRef.current = null;
		setLoading(false);
	};

	const generate = async () => {
		const overlay = stickerText.trim();
		const text = [
			prompt.trim(),
			overlay ? `with clearly readable sticker text "${overlay}"` : '',
			referenceStickerId || referenceFile ? 'keep the same character as the reference sticker' : '',
		]
			.filter(Boolean)
			.join('. ');
		if (!accountId || text.length < 2) {
			setError(ar ? 'اكتب وصف أو نص، أو اختار ستيكر مرجع' : 'Enter a prompt, sticker text, or pick a reference');
			return;
		}
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		setLoading(true);
		setError('');
		try {
			const generated = await generateWhatsAppAiMedia({
				accountId,
				kind,
				prompt: text,
				model: modelId,
				file: referenceFile,
				stickerId: referenceStickerId || undefined,
				seed: Date.now() % 1_000_000,
				signal: controller.signal,
			});
			let file = generated.file;
			if (overlay) file = await overlayStickerCaption(file, overlay);
			if (generatedUrlRef.current) URL.revokeObjectURL(generatedUrlRef.current);
			const url = URL.createObjectURL(file);
			generatedUrlRef.current = url;
			setGeneratedFile(file);
			setPreviewUrl(url);
		} catch (err) {
			if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError') {
				return;
			}
			const message =
				err.response?.data?.message ||
				err.message ||
				(ar ? 'فشل التوليد' : 'Generation failed');
			setError(Array.isArray(message) ? message.join(', ') : message);
			toast.error(Array.isArray(message) ? message.join(', ') : message);
		} finally {
			if (abortRef.current === controller) abortRef.current = null;
			setLoading(false);
		}
	};

	const useResult = async () => {
		if (!generatedFile || using) return;
		setUsing(true);
		try {
			await onUse?.(generatedFile);
		} finally {
			setUsing(false);
		}
	};

	const selectedModel = models.find(item => item.id === modelId);
	const selectedHint = selectedModel
		? selectedModel.available === false
			? ar
				? 'الموديل ده مش متاح دلوقتي. محتاج مفتاح API.'
				: selectedModel.hint
			: selectedModel.free === false
				? ar
					? 'الموديل ده مش مجاني على الـ API.'
					: selectedModel.hint
				: ar
					? selectedModel.model === 'kontext'
						? 'أفضل مع صورة مرجع'
						: 'مجاني على Pollinations'
					: selectedModel.hint
		: '';
	const modelOptions = (models.length
		? models
		: [{ id: 'pollinations:sana', label: 'Sana / DreamShaper', available: true, free: true }]
	).map(item => ({
		value: item.id,
		label: `${item.label}${item.free === false ? (ar ? ' — مدفوع' : ' — paid') : ''}`,
		description: item.hint,
		disabled: item.available === false,
	}));
	const presetOptions = isSticker
		? [
				{ value: '', label: ar ? 'اختار برومبت جاهز' : 'Choose a prompt' },
				...stickerPromptSelectOptions(promptLibrary, ar),
			]
		: [
				{ value: '', label: ar ? 'اختار برومبت جاهز' : 'Choose a prompt' },
				...IMAGE_AI_PRESETS.map(item => ({
					value: item.id,
					label: ar ? item.ar : item.en,
				})),
			];
	const canGenerate =
		!disabled &&
		!loading &&
		!using &&
		accountId &&
		(prompt.trim().length >= 2 || stickerText.trim().length >= 1 || referenceStickerId || referenceFile);

	const pickReferenceSticker = item => {
		if (referencePreview) URL.revokeObjectURL(referencePreview);
		setReferenceFile(null);
		setReferencePreview('');
		setReferenceStickerId(item.id);
		const kontext = models.find(model => model.model === 'kontext' && model.available !== false);
		if (kontext?.id) setModelId(kontext.id);
	};

	const saveCurrentPrompt = () => {
		const body = [prompt.trim(), stickerText.trim()].filter(Boolean).join('\n');
		const saved = saveStickerPrompt({
			title: stickerText.trim() || prompt.trim().slice(0, 40),
			text: body,
			prompt: prompt.trim() || body,
		});
		if (!saved) {
			toast.error(ar ? 'اكتب برومبت الأول' : 'Write a prompt first');
			return;
		}
		setPromptLibrary(listStickerPromptLibrary());
		setSelectedPromptId(saved.id);
		toast.success(ar ? 'تم حفظ البرومبت' : 'Prompt saved');
	};

	const applyPreset = id => {
		if (isSticker && id === SAVE_STICKER_PROMPT_ID) {
			saveCurrentPrompt();
			return;
		}
		if (isSticker && id === NEW_STICKER_PROMPT_ID) {
			setSelectedPromptId(NEW_STICKER_PROMPT_ID);
			setPrompt('');
			setStickerText('');
			return;
		}
		if (isSticker) {
			const item = promptLibrary.find(entry => entry.id === id);
			if (!item) return;
			setSelectedPromptId(item.id);
			setPrompt(String(item.prompt || item.text || '').slice(0, 1200));
			if (item.kind === 'preset' || item.kind === 'saved') {
				setStickerText(ar ? item.titleAr : item.titleEn);
			}
			return;
		}
		const preset = IMAGE_AI_PRESETS.find(item => item.id === id);
		if (!preset) return;
		setPrompt(preset.prompt);
	};
	const fieldClass =
		'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
	const actionClass =
		'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg px-2.5 text-[11px] font-bold leading-none disabled:opacity-50';

	return (
		<div className="flex min-h-0 flex-1 flex-col" dir={ar ? 'rtl' : 'ltr'}>
			<div
				className={`grid min-h-0 flex-1 ${
					isSticker
						? 'grid-rows-[minmax(0,1fr)_minmax(200px,240px)]'
						: 'grid-rows-[minmax(0,1fr)_minmax(240px,1fr)] sm:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] sm:grid-rows-1'
				}`}
			>
				<div className="flex min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden overscroll-contain p-3">
					<label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
						{ar ? 'برومبت جاهز' : 'Ready prompt'}
					</label>
					<WaCustomSelect
						value={isSticker ? selectedPromptId : ''}
						onChange={applyPreset}
						options={presetOptions}
						ariaLabel={ar ? 'برومبت جاهز' : 'Ready prompt'}
						size="sm"
						disabled={disabled || loading}
					/>
					<label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
						{isSticker ? (ar ? 'وصف الستيكر' : 'Sticker prompt') : ar ? 'وصف الصورة' : 'Image prompt'}
					</label>
					<textarea
						value={prompt}
						onChange={event => setPrompt(event.target.value)}
						rows={3}
						maxLength={1200}
						placeholder={
							isSticker
								? ar
									? 'مثال: قط مصرى بيقول خلاص يا عم'
									: 'e.g. sleepy cat saying good night'
								: ar
									? 'مثال: غروب على النيل'
									: 'e.g. sunset over the Nile'
						}
						disabled={disabled || loading}
						className={`${fieldClass} min-h-[72px] resize-none`}
					/>
					<label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
						{ar ? 'الموديل' : 'Model'}
					</label>
					<WaCustomSelect
						value={modelId}
						onChange={setModelId}
						options={modelOptions}
						ariaLabel={ar ? 'الموديل' : 'Model'}
						size="sm"
						disabled={disabled || loading}
					/>
					{selectedHint ? (
						<p className="text-[10px] text-slate-500 dark:text-slate-400">{selectedHint}</p>
					) : null}
					<label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
						{isSticker ? (ar ? 'نص على الستيكر' : 'Text on sticker') : ar ? 'نص على الصورة' : 'Text on image'}
					</label>
					<input
						value={stickerText}
						onChange={event => setStickerText(event.target.value)}
						maxLength={48}
						placeholder={ar ? 'مثال: خلاص يا عم' : 'e.g. good night'}
						disabled={disabled || loading}
						className={fieldClass}
					/>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							disabled={disabled || loading}
							className={`${actionClass} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`}
						>
							<Upload size={12} />
							{ar ? 'صورة مرجع' : 'Reference'}
						</button>
						{(referencePreview || referenceStickerId) && (
							<button type="button" onClick={clearReference} className={`${actionClass} bg-rose-50 text-rose-700`}>
								<X size={12} />
								{ar ? 'إزالة المرجع' : 'Clear'}
							</button>
						)}
						<button
							type="button"
							onClick={() => void generate()}
							disabled={!canGenerate}
							className={`${actionClass} bg-emerald-50 text-emerald-700`}
						>
							{loading ? <Loader2 size={12} className="animate-spin" /> : generatedFile ? <RefreshCw size={12} /> : <Sparkles size={12} />}
							{loading
								? ar
									? 'جاري التوليد…'
									: 'Generating…'
								: generatedFile
									? ar
										? 'إعادة التوليد'
										: 'Regenerate'
									: ar
										? 'توليد'
										: 'Generate'}
						</button>
						{loading && (
							<button type="button" onClick={cancelGenerate} className={`${actionClass} bg-slate-100 text-slate-700`}>
								{ar ? 'إلغاء' : 'Cancel'}
							</button>
						)}
						{isSticker ? (
							<button
								type="button"
								onClick={saveCurrentPrompt}
								disabled={disabled || loading || (!prompt.trim() && !stickerText.trim())}
								className={`${actionClass} bg-violet-50 text-violet-700`}
							>
								<Save size={12} />
								{ar ? 'حفظ البرومبت' : 'Save prompt'}
							</button>
						) : null}
						<input
							ref={fileRef}
							type="file"
							accept="image/webp,image/png,image/jpeg,image/gif"
							hidden
							onChange={event => {
								const file = event.target.files?.[0];
								event.target.value = '';
								if (file) setLocalReference(file);
							}}
						/>
					</div>
					{(referencePreview || (referenceStickerId && previews[referenceStickerId])) && (
						<div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-[#F0F2F5] dark:border-slate-700 dark:bg-slate-800">
							<img
								src={referencePreview || previews[referenceStickerId]}
								alt=""
								className="h-full w-full object-contain"
							/>
						</div>
					)}
					{isSticker && (
						<div>
							<p className="mb-1 text-[10px] font-bold text-slate-500">
								{ar ? 'اختار ستيكر موجود وتعالّم منه' : 'Pick an existing sticker to remix'}
							</p>
							{stickers.length ? (
								<div className="grid grid-cols-6 gap-1.5">
									{stickers.slice(0, 18).map(item => (
										<button
											key={item.id}
											type="button"
											title={ar ? 'استخدام كمرجع' : 'Use as reference'}
											onClick={() => pickReferenceSticker(item)}
											className={`aspect-square overflow-hidden rounded-lg border ${
												referenceStickerId === item.id
													? 'border-emerald-500 ring-1 ring-emerald-400'
													: 'border-slate-200 dark:border-slate-700'
											} bg-[#F0F2F5]`}
										>
											{previews[item.id] ? (
												<img src={previews[item.id]} alt="" className="h-full w-full object-contain" />
											) : (
												<Sticker size={14} className="m-auto text-slate-400" />
											)}
										</button>
									))}
								</div>
							) : (
								<p className="text-[10px] text-slate-400">
									{ar ? 'ارفع أو زامن ستيكرز عشان تستخدمهم كمرجع' : 'Upload or sync stickers to use them as reference'}
								</p>
							)}
						</div>
					)}
					{error ? <p className="text-[11px] font-semibold text-rose-600">{error}</p> : null}
				</div>
				<div className="grid min-h-0 place-items-center overflow-auto overscroll-contain border-t border-slate-100 bg-[#F0F2F5] p-2 dark:border-slate-800 dark:bg-slate-800 sm:border-s sm:border-t-0">
					{previewUrl ? (
						<img src={previewUrl} alt="" className="max-h-full max-w-full object-contain" />
					) : (
						<div className="px-4 text-center text-[11px] text-slate-400">
							<ImagePlus className="mx-auto mb-1" size={28} />
							{ar ? 'المعاينة هتظهر هنا' : 'Preview will appear here'}
						</div>
					)}
				</div>
			</div>
			<div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800">
				<button
					type="button"
					disabled={!generatedFile || loading || using || disabled}
					onClick={() => void useResult()}
					className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#16B96B] text-sm font-bold text-white disabled:opacity-50"
				>
					{using ? <Loader2 size={14} className="animate-spin" /> : isSticker ? (
						ar ? 'استخدام الستيكر' : 'Use Sticker'
					) : ar ? (
						'إرسال للدردشة'
					) : (
						'Send to Chat'
					)}
				</button>
			</div>
		</div>
	);
}
