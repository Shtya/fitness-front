'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
	Check,
	ChevronDown,
	CircleAlert,
	Clock,
	Scissors,
	Send,
	Sparkles,
	X,
} from 'lucide-react';
import api from '@/utils/axios';

const copy = {
	en: {
		title: 'Add to story',
		confirmSubtitle: 'This video will be published to your story.',
		partsSubtitle: 'Review the clips, then publish them in order.',
		duration: 'Duration',
		size: 'Size',
		clipLength: 'Clip length',
		recommended: 'Safe',
		longClipWarning:
			'WhatsApp only guarantees status clips up to {safe}s. A longer clip may stay on “Waiting for this status update” on the viewer’s phone.',
		willSplit: 'Longer than {max}s, so it will be split into {count} sequential clips.',
		fitsOne: 'Short enough to publish as a single story.',
		cancel: 'Cancel',
		close: 'Close',
		addToStory: 'Add to story',
		preparing: 'Preparing clips…',
		publish: 'Publish {count} stories',
		publishOne: 'Publish story',
		publishing: 'Publishing…',
		storyPart: 'Story {n}',
		of: 'of',
		waiting: 'Waiting',
		sent: 'Published',
		failed: 'Failed',
		uploading: 'Uploading…',
		retry: 'Retry from here',
		done: 'Your story is live',
		donePartial: 'Some clips were not published',
		prepareFailed: 'Could not prepare this video for a story',
		publishFailed: 'Could not publish this story',
		progress: '{done} of {total} published',
		backgroundPreparing: 'Preparing your story…',
		backgroundPublishing: 'Publishing your story…',
		backgroundHint: 'You can keep chatting, we will tell you when it is live.',
		donePartialCount: '{done} of {total} clips published',
	},
	ar: {
		title: 'إضافة إلى الحالة',
		confirmSubtitle: 'الفيديو ده هينشر في الحالة بتاعتك.',
		partsSubtitle: 'راجع المقاطع، وبعدين انشرها بالترتيب.',
		duration: 'المدة',
		size: 'الحجم',
		clipLength: 'مدة المقطع',
		recommended: 'مضمون',
		longClipWarning:
			'واتساب مضمون بس لحد {safe} ثانية في الحالة. المقطع الأطول ممكن يفضل «Waiting for this status update» على موبايل اللي بيتفرج.',
		willSplit: 'أطول من {max} ثانية، فهيتقسم إلى {count} مقاطع متتابعة.',
		fitsOne: 'قصير كفاية عشان ينشر كحالة واحدة.',
		cancel: 'إلغاء',
		close: 'إغلاق',
		addToStory: 'إضافة إلى الحالة',
		preparing: 'جاري تحضير المقاطع…',
		publish: 'نشر {count} حالات',
		publishOne: 'نشر الحالة',
		publishing: 'جاري النشر…',
		storyPart: 'حالة {n}',
		of: 'من',
		waiting: 'في الانتظار',
		sent: 'تم النشر',
		failed: 'فشل',
		uploading: 'جاري الرفع…',
		retry: 'إعادة المحاولة من هنا',
		done: 'حالتك بقت منشورة',
		donePartial: 'بعض المقاطع مانتشرتش',
		prepareFailed: 'تعذّر تحضير الفيديو كحالة',
		publishFailed: 'تعذّر نشر الحالة',
		progress: 'تم نشر {done} من {total}',
		backgroundPreparing: 'جاري تحضير الحالة…',
		backgroundPublishing: 'جاري نشر الحالة…',
		backgroundHint: 'كمّل شغلك عادي، هنقولك أول ما تنزل.',
		donePartialCount: 'اتنشر {done} من {total} مقاطع',
	},
};

/**
 * Selectable clip lengths.
 *
 * 30s is the length WhatsApp itself trims a status video to, and the only one every
 * client is known to play — past it the viewer's phone can sit on "Waiting for this
 * status update" instead. The longer options stay available, flagged, for accounts
 * whose client does accept them.
 */
const CLIP_LENGTHS = [30, 45, 60, 90, 120, 180];
const SAFE_CLIP_SECONDS = 30;

function formatClock(seconds) {
	const total = Math.max(0, Math.round(Number(seconds) || 0));
	const minutes = Math.floor(total / 60);
	return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

function formatBytes(bytes) {
	const value = Number(bytes) || 0;
	if (value < 1024) return `${value} B`;
	if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
	return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function apiMessage(error, fallback) {
	const detail = error?.response?.data?.message;
	if (Array.isArray(detail)) return detail.join(', ') || fallback;
	return detail || fallback;
}

/**
 * Cut + publish without holding the dialog open. It used to be two waits behind two taps
 * (prepare, then publish) with the dialog locked meanwhile; now one tap closes the dialog and
 * this runs on its own, reporting through a single toast. A failed run cleans up its draft.
 */
async function publishStoryInBackground({ accountId, source, partSeconds, t, onPublished }) {
	const toastId = toast.loading(`${t.backgroundPreparing}\n${t.backgroundHint}`);
	let draftId = null;
	try {
		const { data: draft } = await api.post(`/whatsapp/accounts/${accountId}/story-drafts`, {
			...source,
			maxPartSeconds: partSeconds,
		});
		draftId = draft?.id || null;
		if (!draftId) throw new Error(t.prepareFailed);
		toast.loading(`${t.backgroundPublishing}\n${t.backgroundHint}`, { id: toastId });
		const { data } = await api.post(`/whatsapp/story-drafts/${draftId}/publish`);
		const parts = data?.parts || [];
		const published = parts.filter(part => part.status === 'published').length;
		if (data?.status === 'published') {
			toast.success(t.done, { id: toastId });
			onPublished?.(data);
			return;
		}
		if (published > 0) {
			toast.error(
				t.donePartialCount.replace('{done}', String(published)).replace('{total}', String(parts.length)),
				{ id: toastId },
			);
			onPublished?.(data);
			return;
		}
		throw new Error(data?.errorMessage || t.publishFailed);
	} catch (error) {
		toast.error(apiMessage(error, error?.message || t.publishFailed), { id: toastId });
		if (draftId) void api.delete(`/whatsapp/story-drafts/${draftId}`).catch(() => undefined);
	}
}

/**
 * Confirm-then-publish flow for putting a chat video on the account's story.
 *
 * Two stages, matching the two server steps. The first stage shows what is about to
 * happen — including whether the video has to be split, because that turns one action
 * into several posts and the user should know before it happens. The second stage
 * lists the clips the server actually cut, and publishes them in order.
 */
export default function AddToStoryDialog({
	open,
	accountId,
	attachmentId = '',
	socialDownloadId = '',
	previewUrl = '',
	durationSeconds = 0,
	fileSizeBytes = 0,
	locale = 'en',
	onClose,
	onPublished,
}) {
	const t = copy[locale === 'ar' ? 'ar' : 'en'];
	const ar = locale === 'ar';

	const [partSeconds, setPartSeconds] = useState(SAFE_CLIP_SECONDS);
	const [lengthMenuOpen, setLengthMenuOpen] = useState(false);
	const lengthMenuRef = useRef(null);

	useEffect(() => {
		if (!open) setLengthMenuOpen(false);
	}, [open]);

	useEffect(() => {
		if (!lengthMenuOpen) return undefined;
		const onPointerDown = event => {
			if (!lengthMenuRef.current?.contains(event.target)) setLengthMenuOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	}, [lengthMenuOpen]);

	const willSplit = Number(durationSeconds) > partSeconds;
	// Matches how the server plans the cut, so the count shown is the count produced.
	const expectedParts = Math.max(1, Math.ceil((Number(durationSeconds) || 0) / partSeconds));

	const start = useCallback(() => {
		if (!accountId || !(attachmentId || socialDownloadId)) return;
		onClose?.();
		void publishStoryInBackground({
			accountId,
			// One source or the other; the server cuts from whichever file it resolves.
			source: attachmentId ? { attachmentId } : { socialDownloadId },
			partSeconds,
			t,
			onPublished,
		});
	}, [accountId, attachmentId, socialDownloadId, partSeconds, t, onClose, onPublished]);

	if (!open || typeof document === 'undefined') return null;

	return createPortal(
		<div
			className="wa-ldlg-scrim fixed inset-0 z-[135] grid place-items-end bg-black/45 p-4 backdrop-blur-sm sm:place-items-center"
			onClick={() => onClose?.()}
		>
			<div
				role="dialog"
				aria-label={t.title}
				dir={ar ? 'rtl' : 'ltr'}
				className="wa-dk wa-ldlg flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b px-5 py-4">
					<div className="min-w-0">
						<h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
							<Sparkles size={18} className="text-emerald-600" />
							{t.title}
						</h3>
						<p className="mt-1 text-xs leading-snug text-slate-500">
							{t.confirmSubtitle}
						</p>
					</div>
					<button
						type="button"
						onClick={() => onClose?.()}
						aria-label={t.close}
						className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
					>
						<X size={18} />
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
						<div className="space-y-3">
							{previewUrl ? (
								<video
									src={previewUrl}
									controls
									playsInline
									preload="metadata"
									className="max-h-64 w-full rounded-xl bg-black object-contain"
								/>
							) : (
								// The dialog opens before the signed preview URL arrives.
								<div className="h-48 w-full animate-pulse rounded-xl bg-slate-200" aria-hidden="true" />
							)}
							<dl className="grid grid-cols-2 gap-2 text-sm">
								<div className="rounded-lg bg-slate-50 px-3 py-2">
									<dt className="text-xs font-semibold text-slate-500">{t.duration}</dt>
									<dd className="flex items-center gap-1.5 font-semibold text-slate-900">
										<Clock size={14} className="text-slate-400" />
										{formatClock(durationSeconds)}
									</dd>
								</div>
								{fileSizeBytes ? (
									<div className="rounded-lg bg-slate-50 px-3 py-2">
										<dt className="text-xs font-semibold text-slate-500">{t.size}</dt>
										<dd className="font-semibold text-slate-900">
											{formatBytes(fileSizeBytes)}
										</dd>
									</div>
								) : null}
							</dl>
							<div ref={lengthMenuRef} className="relative">
								<span className="mb-1 block text-xs font-semibold text-slate-500">
									{t.clipLength}
								</span>
								<button
									type="button"
									aria-haspopup="listbox"
									aria-expanded={lengthMenuOpen}
									onClick={() => setLengthMenuOpen(current => !current)}
									className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-300 focus:border-emerald-400"
								>
									<span className="flex items-center gap-2">
										<Scissors size={15} className="shrink-0 text-slate-400" />
										{formatClock(partSeconds)}
									</span>
									<ChevronDown
										size={15}
										className={`shrink-0 text-slate-400 transition-transform ${
											lengthMenuOpen ? 'rotate-180' : ''
										}`}
									/>
								</button>
								{lengthMenuOpen && (
									<ul
										role="listbox"
										className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
									>
										{CLIP_LENGTHS.map(length => {
											const active = length === partSeconds;
											return (
												<li key={length}>
													<button
														type="button"
														role="option"
														aria-selected={active}
														onClick={() => {
															setPartSeconds(length);
															setLengthMenuOpen(false);
														}}
														className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition ${
															active
																? 'bg-emerald-50 font-semibold text-emerald-700'
																: 'text-slate-700 hover:bg-slate-50'
														}`}
													>
														<span className="min-w-0 flex-1">{formatClock(length)}</span>
														{length === SAFE_CLIP_SECONDS && (
															<span className="shrink-0 text-[10px] font-semibold uppercase text-emerald-600">
																{t.recommended}
															</span>
														)}
														{active && <Check size={14} className="shrink-0" />}
													</button>
												</li>
											);
										})}
									</ul>
								)}
							</div>
							<p
								className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-snug ${
									willSplit
										? 'bg-amber-50 text-amber-800'
										: 'bg-emerald-50 text-emerald-800'
								}`}
							>
								{willSplit ? (
									<Scissors size={14} className="mt-0.5 shrink-0" />
								) : (
									<Check size={14} className="mt-0.5 shrink-0" />
								)}
								<span>
									{willSplit
										? t.willSplit
												.replace('{max}', String(partSeconds))
												.replace('{count}', String(expectedParts))
										: t.fitsOne}
								</span>
							</p>
							{partSeconds > SAFE_CLIP_SECONDS && (
								<p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-snug text-rose-700">
									<CircleAlert size={14} className="mt-0.5 shrink-0" />
									<span>{t.longClipWarning.replace('{safe}', String(SAFE_CLIP_SECONDS))}</span>
								</p>
							)}
						</div>
				</div>

				<div className="flex items-center justify-end gap-2 border-t bg-slate-50 px-5 py-3">
					<button
						type="button"
						onClick={() => onClose?.()}
						className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
					>
						{t.cancel}
					</button>
					<button
						type="button"
						onClick={start}
						className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
					>
						{willSplit ? <Scissors size={16} /> : <Send size={16} />}
						{willSplit ? t.publish.replace('{count}', String(expectedParts)) : t.publishOne}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
