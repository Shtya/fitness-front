'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useLocale } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/dashboard/ui/UI';
import { Notification } from '@/config/Notification';
import MeasurementIntro from './MeasurementIntro';
import HeightInput from './HeightInput';
import CameraCapture from './CameraCapture';
import ProcessingState from './ProcessingState';
import MeasurementResults from './MeasurementResults';
import MeasurementEditor from './MeasurementEditor';
import ScanProgress from './ScanProgress';
import {
	analyzeBodyMeasurements,
	fetchLatestBodyMeasurement,
	replaceBodyMeasurements,
	saveBodyMeasurements,
} from './body-measurement-api';
import { emptyEstimates, fromApiEstimates, toSavePayload } from './measurement-fields';

const STEPS = ['intro', 'height', 'front', 'side', 'processing', 'results'];

function formatDate(value, locale) {
	if (!value) return '—';
	const dt = new Date(value);
	if (Number.isNaN(dt.getTime())) return String(value);
	return dt.toLocaleDateString(locale === 'ar' ? 'ar' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CameraStage({ title, hint, index, total, children, t }) {
	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
			<div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
				<div>
					<p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary-500)]">
						{t('camera.photoOf', { n: index, total })}
					</p>
					<h2 className="mt-1 text-lg font-black text-slate-900">{title}</h2>
					<p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
				</div>
				<div className="flex gap-1 pt-1">
					{Array.from({ length: total }).map((_, i) => (
						<span
							key={i}
							className={`h-1.5 w-6 rounded-full ${i < index ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200'}`}
						/>
					))}
				</div>
			</div>
			<div className="space-y-3 bg-slate-50/80 p-5 sm:p-7">
				<div className="flex flex-wrap gap-2">
					<span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">{t('camera.tipClothes')}</span>
					<span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">{t('camera.tipFrame')}</span>
					<span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">{t('camera.tipArms')}</span>
				</div>
				{children}
			</div>
		</div>
	);
}

export default function BodyMeasurementFlow({ userId, backHref, t }) {
	const locale = useLocale();
	const [step, setStep] = useState('intro');
	const [existing, setExisting] = useState(null);
	const [height, setHeight] = useState('');
	const [frontBlob, setFrontBlob] = useState(null);
	const [sideBlob, setSideBlob] = useState(null);
	const [values, setValues] = useState(emptyEstimates());
	const [confidence, setConfidence] = useState({});
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const frontUrl = useMemo(() => (frontBlob ? URL.createObjectURL(frontBlob) : ''), [frontBlob]);
	const sideUrl = useMemo(() => (sideBlob ? URL.createObjectURL(sideBlob) : ''), [sideBlob]);

	useEffect(() => () => {
		if (frontUrl) URL.revokeObjectURL(frontUrl);
	}, [frontUrl]);
	useEffect(() => () => {
		if (sideUrl) URL.revokeObjectURL(sideUrl);
	}, [sideUrl]);

	useEffect(() => {
		if (!userId) return;
		fetchLatestBodyMeasurement(userId)
			.then((row) => {
				setExisting(row);
				if (row?.height) setHeight(String(row.height));
			})
			.catch(() => setExisting(null));
	}, [userId]);

	useEffect(() => {
		if (step !== 'processing') return undefined;
		let cancelled = false;
		(async () => {
			try {
				const data = await analyzeBodyMeasurements(userId, {
					frontBlob,
					sideBlob,
					height: Number(height),
				});
				if (cancelled) return;
				if (data?.existing) setExisting(data.existing);
				setValues(fromApiEstimates(data?.estimates || {}, height));
				setConfidence(data?.estimates?.confidence || {});
				setStep('results');
			} catch (error) {
				if (cancelled) return;
				const message = error?.response?.data?.message || error?.response?.data?.detail || t('errors.analyzeFailed');
				Notification(typeof message === 'string' ? message : t('errors.analyzeFailed'), 'error');
				setStep('side');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [step, userId, frontBlob, sideBlob, height, t]);

	const goBack = () => {
		if (step === 'intro') {
			if (backHref) window.history.back();
			return;
		}
		const idx = STEPS.indexOf(step);
		if (idx > 0) setStep(STEPS[idx - 1] === 'processing' ? 'side' : STEPS[idx - 1]);
	};

	const updateField = (key, next) => setValues((prev) => ({ ...prev, [key]: next }));

	const persist = async (replaceExisting) => {
		setSaving(true);
		try {
			const payload = toSavePayload(values, { source: 'ai', confidence, replaceExisting });
			const savedRow = replaceExisting
				? await replaceBodyMeasurements(userId, payload)
				: await saveBodyMeasurements(userId, payload);
			setExisting(savedRow);
			setSaved(true);
			setConfirmOpen(false);
			Notification(t('toast.saved'), 'success');
		} catch (error) {
			if (error?.response?.status === 409) {
				setExisting(error.response.data?.existing || existing);
				setConfirmOpen(true);
			} else {
				Notification(error?.response?.data?.message || t('errors.saveFailed'), 'error');
			}
		} finally {
			setSaving(false);
		}
	};

	const onSave = () => {
		if (existing) {
			setConfirmOpen(true);
			return;
		}
		persist(false);
	};

	return (
		<div className="mx-auto w-full max-w-3xl space-y-4">
			{step !== 'intro' && (
				<div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
					<ScanProgress step={step} t={t} />
				</div>
			)}

			{step !== 'intro' && (
				<div className="flex items-center">
					<Button type="button" variant="ghost" size="sm" className="rounded-full px-3" onClick={goBack}>
						<ArrowLeft className="h-4 w-4 rtl:rotate-180" />
						{t('actions.back')}
					</Button>
				</div>
			)}

			<AnimatePresence mode="wait">
				<motion.div
					key={step}
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.22 }}
				>
					{step === 'intro' && (
						<MeasurementIntro
							existing={existing}
							onStart={() => setStep('height')}
							t={t}
							formatDate={(d) => formatDate(d, locale)}
						/>
					)}

					{step === 'height' && (
						<HeightInput value={height} onChange={setHeight} onContinue={() => setStep('front')} t={t} />
					)}

					{step === 'front' && (
						<CameraStage title={t('camera.frontTitle')} hint={t('camera.frontHint')} index={1} total={2} t={t}>
							<CameraCapture
								variant="front"
								previewUrl={frontUrl}
								onCapture={(blob) => setFrontBlob(blob)}
								onRetake={() => setFrontBlob(null)}
								t={t}
							/>
							{frontBlob && (
								<Button type="button" className="h-12 w-full rounded-xl text-base font-bold" onClick={() => setStep('side')}>
									{t('actions.continue')}
								</Button>
							)}
						</CameraStage>
					)}

					{step === 'side' && (
						<CameraStage title={t('camera.sideTitle')} hint={t('camera.sideHint')} index={2} total={2} t={t}>
							<CameraCapture
								variant="side"
								previewUrl={sideUrl}
								onCapture={(blob) => setSideBlob(blob)}
								onRetake={() => setSideBlob(null)}
								t={t}
							/>
							{sideBlob && (
								<Button type="button" className="h-12 w-full rounded-xl text-base font-bold" onClick={() => setStep('processing')}>
									{t('actions.analyze')}
								</Button>
							)}
						</CameraStage>
					)}

					{step === 'processing' && <ProcessingState t={t} />}

					{step === 'results' && (
						<div className="space-y-4">
							<MeasurementResults values={values} t={t} />
							<MeasurementEditor values={values} onChange={updateField} t={t} />
							<Button type="button" className="h-12 w-full rounded-xl text-base font-bold" disabled={saving || saved} onClick={onSave}>
								<Save className="h-4 w-4" />
								{saved ? t('actions.saved') : saving ? t('actions.saving') : t('actions.save')}
							</Button>
						</div>
					)}
				</motion.div>
			</AnimatePresence>

			<Modal
				open={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				title={t('existing.confirmTitle')}
				maxW="max-w-lg"
			>
				<div className="space-y-4 p-1">
					<p className="text-sm text-slate-600">
						{t('existing.confirmText', { date: formatDate(existing?.updatedAt || existing?.date, locale) })}
					</p>
					<div className="flex gap-2 justify-end">
						<Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
							{t('actions.cancel')}
						</Button>
						<Button type="button" disabled={saving} onClick={() => persist(true)}>
							{saving ? t('actions.saving') : t('actions.replace')}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
