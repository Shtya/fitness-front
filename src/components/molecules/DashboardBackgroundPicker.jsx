'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ClipboardPaste, ImagePlus, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '@/hooks/useUser';
import {
	DASHBOARD_BG_GRADIENTS,
	DASHBOARD_BG_PRESETS,
	DASHBOARD_OVERLAY_MAX,
	DASHBOARD_OVERLAY_TONES,
	backgroundCss,
	blobToDataUrl,
	clearPersonalAppearance,
	effectiveBackground,
	effectiveOverlay,
	previewOverlay,
	setPersonalOverlay,
	setSystemOverlay,
	galleryImageUrl,
	prepareBackgroundImage,
	removeGalleryImage,
	setPersonalBackground,
	setSystemBackground,
	uploadSystemBackground,
	useDashboardBackground,
} from '@/lib/dashboard-background';

const OVERLAY_TONE_SWATCH = {
	light: '#ffffff',
	dark: '#0f172a',
	brand: 'var(--color-primary-600)',
};

function OverlayControl({ snapshot, isSuperAdmin, label }) {
	const stored = effectiveOverlay(snapshot) || { tone: 'light', opacity: 0 };
	const [draft, setDraft] = useState(stored);
	const pending = useRef(null);
	const timer = useRef(null);
	const latest = useRef({ isSuperAdmin, label });
	latest.current = { isSuperAdmin, label };

	useEffect(() => {
		if (!pending.current) setDraft(stored);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stored.tone, stored.opacity]);

	const save = useCallback(async () => {
		const next = pending.current;
		pending.current = null;
		if (!next) return;
		try {
			if (latest.current.isSuperAdmin) await setSystemOverlay(next);
			else setPersonalOverlay(next);
		} catch {
			previewOverlay(effectiveOverlay());
			toast.error(latest.current.label('failed', "Couldn't change the background."));
		}
	}, []);

	/* Closing the panel mid-drag still saves the last value. */
	useEffect(
		() => () => {
			clearTimeout(timer.current);
			void save();
		},
		[save],
	);

	const change = next => {
		setDraft(next);
		previewOverlay(next);
		pending.current = next;
		clearTimeout(timer.current);
		timer.current = setTimeout(() => void save(), 450);
	};

	const toneLabel = {
		light: label('overlayLight', 'Light'),
		dark: label('overlayDark', 'Dark'),
		brand: label('overlayBrand', 'Theme'),
	};

	return (
		<div className='tp-ov'>
			<div className='tp-ov__head'>
				<p className='tp-bg__label'>{label('overlay', 'Overlay')}</p>
				<span className='tp-ov__value'>{draft.opacity}%</span>
			</div>
			<div className='tp-ov__tones' role='radiogroup' aria-label={label('overlay', 'Overlay')}>
				{DASHBOARD_OVERLAY_TONES.map(tone => (
					<button
						key={tone}
						type='button'
						role='radio'
						aria-checked={draft.tone === tone}
						className={`tp-ov__tone${draft.tone === tone ? ' is-on' : ''}`}
						onClick={() =>
							change({ tone, opacity: draft.opacity || Math.round(DASHBOARD_OVERLAY_MAX / 3) })
						}>
						<span className='tp-ov__swatch' style={{ background: OVERLAY_TONE_SWATCH[tone] }} aria-hidden />
						{toneLabel[tone]}
					</button>
				))}
			</div>
			<input
				type='range'
				className='tp-ov__range'
				min={0}
				max={DASHBOARD_OVERLAY_MAX}
				step={1}
				value={draft.opacity}
				aria-label={`${label('overlay', 'Overlay')} — ${toneLabel[draft.tone] || ''}`}
				aria-valuetext={`${draft.opacity}%`}
				onChange={event => change({ tone: draft.tone, opacity: Number(event.target.value) })}
			/>
		</div>
	);
}

function isSame(a, b) {
	return Boolean(a && b && a.kind === b.kind && a.value === b.value);
}

function imageFromClipboard(event) {
	for (const item of event.clipboardData?.items || []) {
		if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
	}
	return null;
}

export default function DashboardBackgroundPicker({ t }) {
	const user = useUser();
	const isSuperAdmin = user?.role === 'super_admin';
	const snapshot = useDashboardBackground();
	const active = effectiveBackground(snapshot);
	const isDefault = !active;
	const [busy, setBusy] = useState(false);
	const [dragging, setDragging] = useState(false);
	const fileRef = useRef(null);

	const label = useCallback(
		(key, fallback) => (t?.has?.(`background.${key}`) ? t(`background.${key}`) : fallback),
		[t],
	);

	const apply = useCallback(
		async background => {
			setBusy(true);
			try {
				if (isSuperAdmin) await setSystemBackground(background);
				else setPersonalBackground(background);
			} catch (error) {
				toast.error(
					error?.message === 'too-large'
						? label('tooLarge', 'This image is too large to save. Try a smaller one.')
						: label('failed', "Couldn't change the background."),
				);
			} finally {
				setBusy(false);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isSuperAdmin],
	);

	const applyImage = useCallback(
		async file => {
			if (!file?.type?.startsWith('image/')) {
				toast.error(label('notImage', 'Paste or choose an image file.'));
				return;
			}
			setBusy(true);
			try {
				const blob = await prepareBackgroundImage(file);
				if (isSuperAdmin) {
					const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
					await uploadSystemBackground(blob, `background.${ext}`);
				} else {
					setPersonalBackground({ kind: 'image', value: await blobToDataUrl(blob) });
				}
			} catch (error) {
				toast.error(
					error?.message === 'too-large'
						? label('tooLarge', 'This image is too large to save. Try a smaller one.')
						: error?.message === 'not-image'
							? label('notImage', 'Paste or choose an image file.')
							: label('failed', "Couldn't change the background."),
				);
			} finally {
				setBusy(false);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isSuperAdmin],
	);

	const remove = useCallback(
		async image => {
			if (!window.confirm(label('deleteConfirm', 'Delete this image for everyone?'))) return;
			setBusy(true);
			try {
				await removeGalleryImage(image.id);
			} catch {
				toast.error(label('failed', "Couldn't change the background."));
			} finally {
				setBusy(false);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	useEffect(() => {
		const onPaste = event => {
			const file = imageFromClipboard(event);
			if (!file) return;
			event.preventDefault();
			void applyImage(file);
		};
		window.addEventListener('paste', onPaste);
		return () => window.removeEventListener('paste', onPaste);
	}, [applyImage]);

	const customActive = active?.kind === 'image' && String(active.value).startsWith('data:');

	return (
		<div className='tp-bg' aria-busy={busy}>
			<p className={`tp-bg__scope${isSuperAdmin ? ' is-system' : ''}`}>
				{isSuperAdmin
					? label('scopeSystem', 'As super admin, your choice becomes the default background for everyone.')
					: label('scopePersonal', 'Only you will see this background.')}
			</p>

			<OverlayControl snapshot={snapshot} isSuperAdmin={isSuperAdmin} label={label} />

			<p className='tp-bg__label'>{label('images', 'Images')}</p>
			<div className='tp-bg__grid' role='radiogroup' aria-label={label('images', 'Images')}>
				{DASHBOARD_BG_PRESETS.map((preset, index) => {
					const background = { kind: 'preset', value: preset.id };
					const on = index === 0 ? isDefault || isSame(active, background) : isSame(active, background);
					return (
						<button
							key={preset.id}
							type='button'
							role='radio'
							aria-checked={on}
							aria-label={`${label('images', 'Images')} ${index + 1}`}
							disabled={busy}
							className={`tp-bg__tile${on ? ' is-on' : ''}`}
							style={{ backgroundImage: `url("${preset.src}")` }}
							onClick={() => apply(isSuperAdmin && index === 0 ? null : background)}>
							{index === 0 ? <span className='tp-bg__tag'>{label('default', 'Default')}</span> : null}
							{on ? <Check className='tp-bg__check' strokeWidth={3} aria-hidden /> : null}
						</button>
					);
				})}
				{snapshot.gallery.map((image, index) => {
					const src = galleryImageUrl(image.url);
					if (!src) return null;
					const background = { kind: 'image', value: image.url };
					const on = isSame(active, background);
					const name = `${label('images', 'Images')} ${DASHBOARD_BG_PRESETS.length + index + 1}`;
					return (
						<div key={image.id} className='tp-bg__cell'>
							<button
								type='button'
								role='radio'
								aria-checked={on}
								aria-label={name}
								disabled={busy}
								className={`tp-bg__tile${on ? ' is-on' : ''}`}
								style={{ backgroundImage: `url("${src}")` }}
								onClick={() => apply(background)}>
								{on ? <Check className='tp-bg__check' strokeWidth={3} aria-hidden /> : null}
							</button>
							{isSuperAdmin ? (
								<button
									type='button'
									className='tp-bg__del'
									disabled={busy}
									title={label('delete', 'Delete image')}
									aria-label={`${label('delete', 'Delete image')}: ${name}`}
									onClick={() => remove(image)}>
									<Trash2 aria-hidden />
								</button>
							) : null}
						</div>
					);
				})}
				{isSuperAdmin ? (
					<button
						type='button'
						className='tp-bg__tile is-add'
						disabled={busy}
						title={label('addImage', 'Add image')}
						aria-label={label('addImage', 'Add image')}
						onClick={() => fileRef.current?.click()}>
						{busy ? <Loader2 className='animate-spin' aria-hidden /> : <Plus aria-hidden />}
					</button>
				) : null}
			</div>

			<p className='tp-bg__label'>{label('gradients', 'Gradients')}</p>
			<div className='tp-bg__grid is-dense' role='radiogroup' aria-label={label('gradients', 'Gradients')}>
				{DASHBOARD_BG_GRADIENTS.map((gradient, index) => {
					const background = { kind: 'gradient', value: gradient.id };
					const on = isSame(active, background);
					return (
						<button
							key={gradient.id}
							type='button'
							role='radio'
							aria-checked={on}
							aria-label={`${label('gradients', 'Gradients')} ${index + 1}`}
							disabled={busy}
							className={`tp-bg__tile is-swatch${on ? ' is-on' : ''}`}
							style={{ backgroundImage: gradient.css }}
							onClick={() => apply(background)}>
							{on ? <Check className='tp-bg__check' strokeWidth={3} aria-hidden /> : null}
						</button>
					);
				})}
			</div>

			<p className='tp-bg__label'>{label('custom', 'Custom image')}</p>
			<div
				className={`tp-bg__drop${dragging ? ' is-drag' : ''}${customActive ? ' has-image' : ''}`}
				style={customActive ? { backgroundImage: backgroundCss(active) } : undefined}
				onDragOver={event => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={event => {
					event.preventDefault();
					setDragging(false);
					void applyImage(event.dataTransfer?.files?.[0]);
				}}>
				<div className='tp-bg__drop-body'>
					{busy ? (
						<Loader2 className='tp-bg__drop-icon animate-spin' aria-hidden />
					) : (
						<ClipboardPaste className='tp-bg__drop-icon' aria-hidden />
					)}
					<p className='tp-bg__drop-text'>
						{busy
							? label('uploading', 'Applying…')
							: isSuperAdmin
								? label('pasteHintSystem', 'Paste an image (Ctrl+V), drop it here, or choose a file. It is added to Images so everyone can use it.')
								: label('pasteHint', 'Paste an image (Ctrl+V), drop it here, or choose a file')}
					</p>
					<button type='button' className='tp-bg__btn' disabled={busy} onClick={() => fileRef.current?.click()}>
						<ImagePlus aria-hidden />
						{label('choose', 'Choose image')}
					</button>
				</div>
				<input
					ref={fileRef}
					type='file'
					accept='image/png,image/jpeg,image/webp,image/gif'
					hidden
					onChange={event => {
						void applyImage(event.target.files?.[0]);
						event.target.value = '';
					}}
				/>
			</div>

			{!isSuperAdmin && (snapshot.personal || snapshot.personalOverlay) ? (
				<button type='button' className='tp-bg__reset' disabled={busy} onClick={clearPersonalAppearance}>
					<RotateCcw aria-hidden />
					{label('useSystem', 'Use system default')}
				</button>
			) : null}
			{isSuperAdmin && snapshot.system ? (
				<button type='button' className='tp-bg__reset' disabled={busy} onClick={() => apply(null)}>
					<RotateCcw aria-hidden />
					{label('resetSystem', 'Reset to default')}
				</button>
			) : null}
		</div>
	);
}
