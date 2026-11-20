'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { AlertTriangle, Bot, Camera, Check, CircleAlert, Images, Loader2, PencilLine, RotateCcw, RotateCw, ShieldCheck, ZoomIn } from 'lucide-react';
import { SUBCATEGORIES } from '../config/outfit-config.js';
import { reconcileColor, hammingHex } from '../engine/pixels.js';
import { findDuplicates } from '../engine/planner.js';
import { newId } from '../outfit-ui.js';
import { useOutfit } from '../OutfitContext.jsx';
import { analyzePhoto } from '../wardrobe/ai-client.js';
import { putImages, putItem, useKv } from '../wardrobe/db.js';
import { preparePhoto, runQueue } from '../wardrobe/photo.js';
import { ItemImage, Sheet } from '../ui/primitives.jsx';
import ItemEditor from './ItemEditor.jsx';

const MAX_FILES = 40;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function draftFromAnalysis(prepared, analysis) {
	const pixelHex = prepared?.colors?.[0]?.hex || null;
	const colorChoice = reconcileColor(analysis?.primaryHex, pixelHex);
	const sub = analysis?.subcategory || 'tshirt';
	return {
		id: newId('item'),
		createdAt: Date.now(),
		category: analysis?.category || SUBCATEGORIES[sub]?.category || 'top',
		subcategory: sub,
		colors: {
			primary: { hex: colorChoice.hex || '#808080' },
			secondary: (analysis?.secondaryHex || prepared?.colors?.slice(1, 3).map(c => c.hex) || []).map(hex => ({ hex })),
		},
		colorCandidates: prepared?.colors || [],
		colorSource: colorChoice.source,
		verifiedByPixels: colorChoice.verifiedByPixels,
		pattern: analysis?.pattern || 'solid',
		fabric: analysis?.fabric || 'cotton',
		fit: analysis?.fit || 'regular',
		sleeveLength: analysis?.sleeveLength || 'na',
		pantsLength: analysis?.pantsLength || 'na',
		formality: analysis?.formality || SUBCATEGORIES[sub]?.formality || 2,
		seasons: analysis?.seasons || [],
		styleTags: analysis?.styleTags || [],
		details: analysis?.details || [],
		confidence: analysis?.confidence || { category: 0, subcategory: 0, pattern: 0.5, fabric: 0.3, fit: 0.4, formality: 0.4, seasons: 0.3, color: pixelHex ? 0.8 : 0 },
		aiTagged: Boolean(analysis),
		status: 'clean',
		timesWorn: 0,
		wearsSinceWash: 0,
		favorite: false,
		hash: prepared?.hash || null,
		sha: prepared?.sha || null,
		noPhoto: !prepared,
	};
}

/** Live camera with a framing guide; returns a captured JPEG File. */
function CameraShot({ onShot, t }) {
	const videoRef = useRef(null);
	const [status, setStatus] = useState('starting');
	useEffect(() => {
		let stream;
		let cancelled = false;
		if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
			setStatus(window.isSecureContext ? 'noCamera' : 'insecure');
			return undefined;
		}
		navigator.mediaDevices
			.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
			.then(s => {
				if (cancelled) {
					for (const track of s.getTracks()) track.stop();
					return;
				}
				stream = s;
				videoRef.current.srcObject = s;
				videoRef.current.play().catch(() => {});
				setStatus('live');
			})
			.catch(error => setStatus(error?.name === 'NotAllowedError' ? 'denied' : 'noCamera'));
		return () => {
			cancelled = true;
			for (const track of stream?.getTracks() || []) track.stop();
		};
	}, []);
	const shoot = () => {
		const video = videoRef.current;
		if (!video?.videoWidth) return;
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext('2d').drawImage(video, 0, 0);
		canvas.toBlob(blob => blob && onShot(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.92);
	};
	return (
		<div className="wa-of-camera">
			<div className="wa-of-camera-stage">
				<video ref={videoRef} playsInline muted hidden={status !== 'live'} />
				{status === 'live' ? <span className="wa-of-frame-guide" aria-hidden="true" /> : <p className="wa-of-muted">{status === 'starting' ? t('input.camera.starting') : t(`input.camera.${status}`)}</p>}
			</div>
			<p className="wa-of-hint wa-of-center">{t('add.frameHint')}</p>
			<button type="button" className="wa-of-shutter" onClick={shoot} disabled={status !== 'live'} aria-label={t('add.capture')}>
				<span />
			</button>
		</div>
	);
}

export default function AddItems({ open, onClose }) {
	const t = useTranslations('outfitMatcher');
	const { locale, items, colorBlind, prefs, setPrefs } = useOutfit();
	const [consent, setConsent] = useKv('aiConsent', null);
	const [stage, setStage] = useState('choose'); // choose | camera | queue | review
	const [queue, setQueue] = useState([]); // { key, file, status, prepared, draft, error }
	const [reviewIndex, setReviewIndex] = useState(0);
	const [askConsent, setAskConsent] = useState(false);
	const [usage, setUsage] = useState(null);
	const uploadRef = useRef(null);
	const onDevice = Boolean(prefs.onDeviceOnly) || consent === 'declined';
	const pendingFiles = useRef(null);

	useEffect(() => {
		if (!open) {
			setStage('choose');
			setQueue([]);
			setReviewIndex(0);
		}
	}, [open]);

	const update = useCallback((key, patch) => setQueue(list => list.map(entry => (entry.key === key ? { ...entry, ...patch } : entry))), []);

	const process = useCallback(
		async (files, useAi) => {
			const entries = files.slice(0, MAX_FILES).map(file => ({ key: newId('q'), file, status: file.size > MAX_FILE_BYTES ? 'error' : 'waiting', error: file.size > MAX_FILE_BYTES ? 'tooLarge' : null }));
			if (files.length > MAX_FILES) toast(t('add.tooMany', { max: MAX_FILES }));
			setQueue(entries);
			setStage('queue');
			await runQueue(
				entries.filter(entry => entry.status === 'waiting'),
				async entry => {
					try {
						update(entry.key, { status: 'preparing' });
						const prepared = await preparePhoto(entry.file);
						let analysis = null;
						if (useAi) {
							update(entry.key, { status: 'analyzing', prepared });
							try {
								const result = await analyzePhoto(prepared.medium, prepared.sha, locale);
								analysis = result.analysis;
								if (result.usedToday != null) setUsage({ used: result.usedToday, limit: result.limitToday });
								if (analysis && analysis.isClothing === false) update(entry.key, { notClothing: true });
							} catch (error) {
								update(entry.key, { aiError: error.code || 'ai_failed' });
							}
						}
						update(entry.key, { status: 'ready', prepared, draft: draftFromAnalysis(prepared, analysis) });
					} catch {
						update(entry.key, { status: 'error', error: 'unreadable' });
					}
				},
				3,
			);
		},
		[locale, t, update],
	);

	const start = files => {
		const list = [...files].filter(file => file.type.startsWith('image/'));
		if (!list.length) return;
		if (!onDevice && consent !== 'granted') {
			pendingFiles.current = list;
			setAskConsent(true);
			return;
		}
		void process(list, !onDevice);
	};

	const ready = queue.filter(entry => entry.status === 'ready');
	const busy = queue.some(entry => ['waiting', 'preparing', 'analyzing'].includes(entry.status));
	const current = ready[reviewIndex];
	const duplicates = current ? findDuplicates(current.draft, items, hammingHex) : [];

	const saveCurrent = async () => {
		if (!current) return;
		const { colorCandidates, ...item } = current.draft;
		void colorCandidates;
		try {
			if (current.prepared) await putImages(item.id, { thumb: current.prepared.thumb, medium: current.prepared.medium });
			await putItem(item);
		} catch {
			toast.error(t('wardrobe.storageFull'));
			return;
		}
		update(current.key, { status: 'saved' });
		next();
	};
	const next = () => {
		const remaining = queue.filter(entry => entry.status === 'ready').length - 1;
		if (remaining <= 0 && !busy) {
			toast.success(t('add.allSaved'));
			onClose();
		}
	};
	const skip = () => {
		update(current.key, { status: 'skipped' });
		next();
	};
	const rotate = async (delta, zoomDelta = 0) => {
		const entry = current;
		const rotation = ((entry.rotation || 0) + delta + 360) % 360;
		const zoom = Math.min(2.5, Math.max(1, (entry.zoom || 1) + zoomDelta));
		const prepared = await preparePhoto(entry.file, { rotation, zoom });
		update(entry.key, { rotation, zoom, prepared, draft: { ...entry.draft, colorCandidates: prepared.colors, hash: prepared.hash, sha: prepared.sha } });
	};
	const addManual = () => {
		setQueue([{ key: newId('q'), status: 'ready', draft: draftFromAnalysis(null, null), prepared: null }]);
		setReviewIndex(0);
		setStage('review');
	};

	const previewUrl = useObjectUrl(current?.prepared?.medium);

	return (
		<>
			<Sheet open={open} onClose={onClose} title={stage === 'review' ? t('add.reviewTitle', { index: Math.min(reviewIndex + 1, ready.length), total: ready.length }) : t('add.title')} size="lg"
				footer={
					stage === 'review' && current ? (
						<div className="wa-of-row-gap wa-of-end">
							<button type="button" className="wa-of-btn wa-of-btn-ghost" onClick={skip}>
								{t('add.skip')}
							</button>
							<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={saveCurrent}>
								<Check size={18} aria-hidden="true" />
								{ready.length > 1 || busy ? t('add.saveNext') : t('add.save')}
							</button>
						</div>
					) : stage === 'queue' ? (
						<button type="button" className="wa-of-btn wa-of-btn-primary wa-of-btn-block" disabled={!ready.length} onClick={() => setStage('review')}>
							{busy ? <Loader2 size={18} className="wa-of-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
							{t('add.reviewCount', { count: ready.length })}
						</button>
					) : null
				}
			>
				<input ref={uploadRef} type="file" accept="image/*" multiple hidden onChange={event => { start(event.target.files || []); event.target.value = ''; }} />
				{stage === 'choose' ? (
					<div className="wa-of-stack">
						<div className="wa-of-tiles wa-of-tiles-2">
							<button type="button" className="wa-of-tile wa-of-tile-lg" onClick={() => setStage('camera')}>
								<Camera size={26} aria-hidden="true" />
								<span>{t('add.takePhoto')}</span>
								<span className="wa-of-muted">{t('add.takePhotoHint')}</span>
							</button>
							<button type="button" className="wa-of-tile wa-of-tile-lg" onClick={() => uploadRef.current?.click()}>
								<Images size={26} aria-hidden="true" />
								<span>{t('add.upload')}</span>
								<span className="wa-of-muted">{t('add.uploadHint')}</span>
							</button>
						</div>
						<button type="button" className="wa-of-btn wa-of-btn-ghost" onClick={addManual}>
							<PencilLine size={17} aria-hidden="true" />
							{t('add.manual')}
						</button>
						<label className="wa-of-toggle wa-of-toggle-card">
							<input type="checkbox" checked={onDevice} onChange={event => setPrefs(prev => ({ ...(prev || {}), onDeviceOnly: event.target.checked }))} />
							<span>
								<span className="wa-of-toggle-title">{t('add.onDevice')}</span>
								<span className="wa-of-muted">{onDevice ? t('add.onDeviceOn') : t('add.onDeviceOff')}</span>
							</span>
						</label>
						{usage ? <p className="wa-of-hint">{t('add.usage', { used: usage.used, limit: usage.limit })}</p> : null}
					</div>
				) : null}
				{stage === 'camera' ? (
					<CameraShot
						t={t}
						onShot={file => {
							start([file]);
						}}
					/>
				) : null}
				{stage === 'queue' ? (
					<ul className="wa-of-queue" aria-live="polite">
						{queue.map(entry => (
							<li key={entry.key} data-status={entry.status}>
								<QueueThumb entry={entry} />
								<span className="wa-of-grow">
									<span className="wa-of-queue-name">{entry.file?.name || t('add.manual')}</span>
									<span className="wa-of-muted">
										{t(`add.status.${entry.status}`)}
										{entry.aiError ? ` · ${t(`add.aiErrors.${entry.aiError in AI_ERRORS ? entry.aiError : 'ai_failed'}`)}` : ''}
									</span>
									<span className="wa-of-progress" data-step={entry.status} aria-hidden="true" />
								</span>
								{entry.status === 'ready' || entry.status === 'saved' ? <Check size={18} className="wa-of-ok" aria-hidden="true" /> : entry.status === 'error' ? <CircleAlert size={18} className="wa-of-bad" aria-hidden="true" /> : <Loader2 size={18} className="wa-of-spin" aria-hidden="true" />}
							</li>
						))}
					</ul>
				) : null}
				{stage === 'review' && current ? (
					<div className="wa-of-review">
						<div className="wa-of-review-photo">
							{previewUrl ? <img src={previewUrl} alt="" /> : <ItemImage item={current.draft} colorBlind={colorBlind} />}
							{current.prepared ? (
								<div className="wa-of-review-tools">
									<button type="button" className="wa-of-fab" onClick={() => rotate(-90)} aria-label={t('add.rotateLeft')} title={t('add.rotateLeft')}>
										<RotateCcw size={17} aria-hidden="true" />
									</button>
									<button type="button" className="wa-of-fab" onClick={() => rotate(90)} aria-label={t('add.rotateRight')} title={t('add.rotateRight')}>
										<RotateCw size={17} aria-hidden="true" />
									</button>
									<button type="button" className="wa-of-fab" onClick={() => rotate(0, (current.zoom || 1) >= 2.5 ? -1.5 : 0.5)} aria-label={t('add.crop')} title={t('add.crop')}>
										<ZoomIn size={17} aria-hidden="true" />
									</button>
								</div>
							) : null}
						</div>
						<div className="wa-of-review-form">
							{current.draft.aiTagged ? (
								<p className="wa-of-note">
									<Bot size={15} aria-hidden="true" /> {t('add.aiFilled')}
								</p>
							) : (
								<p className="wa-of-note">
									<ShieldCheck size={15} aria-hidden="true" /> {t('add.manualFill')}
								</p>
							)}
							{current.notClothing ? (
								<p className="wa-of-alert">
									<AlertTriangle size={16} aria-hidden="true" />
									<span>{t('add.notClothing')}</span>
								</p>
							) : null}
							{duplicates.length ? (
								<p className="wa-of-alert">
									<AlertTriangle size={16} aria-hidden="true" />
									<span>{t('add.duplicate', { count: duplicates.length })}</span>
								</p>
							) : null}
							<ItemEditor item={current.draft} locale={locale} colorBlind={colorBlind} onChange={draft => update(current.key, { draft })} />
						</div>
					</div>
				) : null}
				{stage === 'review' && !current && !busy ? <p className="wa-of-muted">{t('add.allSaved')}</p> : null}
			</Sheet>

			<Sheet open={askConsent} onClose={() => setAskConsent(false)} title={t('consent.title')} size="sm"
				footer={
					<div className="wa-of-stack">
						<button type="button" className="wa-of-btn wa-of-btn-primary wa-of-btn-block" onClick={() => {
							setConsent('granted');
							setAskConsent(false);
							if (pendingFiles.current) void process(pendingFiles.current, true);
							pendingFiles.current = null;
						}}>
							<Bot size={18} aria-hidden="true" />
							{t('consent.allow')}
						</button>
						<button type="button" className="wa-of-btn wa-of-btn-block" onClick={() => {
							setConsent('declined');
							setAskConsent(false);
							if (pendingFiles.current) void process(pendingFiles.current, false);
							pendingFiles.current = null;
						}}>
							<ShieldCheck size={18} aria-hidden="true" />
							{t('consent.onDevice')}
						</button>
					</div>
				}
			>
				<ul className="wa-of-bullets">
					<li>{t('consent.point1')}</li>
					<li>{t('consent.point2')}</li>
					<li>{t('consent.point3')}</li>
				</ul>
			</Sheet>
		</>
	);
}

const AI_ERRORS = { ai_not_configured: 1, quota: 1, ai_busy: 1, offline: 1, ai_failed: 1, ai_refused: 1, ai_invalid: 1, unauthorized: 1, too_large: 1, invalid_request: 1 };

function useObjectUrl(blob) {
	const [url, setUrl] = useState(null);
	useEffect(() => {
		if (!blob) {
			setUrl(null);
			return undefined;
		}
		const value = URL.createObjectURL(blob);
		setUrl(value);
		return () => URL.revokeObjectURL(value);
	}, [blob]);
	return url;
}

function QueueThumb({ entry }) {
	const url = useObjectUrl(entry.prepared?.thumb);
	return <span className="wa-of-queue-thumb">{url ? <img src={url} alt="" /> : null}</span>;
}
