'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { metaWhatsAppApi } from '../meta-whatsapp/meta-whatsapp-api';

/**
 * Bulk send Meta-approved templates to selected Lead Scout rows.
 * Free-form / marketing text outside the 24h window is intentionally not offered.
 */
export default function LeadMetaBulkModal({ open, onClose, leads, t, isAr }) {
	const [templates, setTemplates] = useState([]);
	const [templateName, setTemplateName] = useState('');
	const [language, setLanguage] = useState(isAr ? 'ar' : 'en');
	const [rateLimit, setRateLimit] = useState(20);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [job, setJob] = useState(null);

	const withPhone = (leads || []).filter(l => String(l.phone || '').replace(/\D/g, '').length >= 8);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setJob(null);
		setLoading(true);
		metaWhatsAppApi
			.templates()
			.then(rows => {
				const approved = (Array.isArray(rows) ? rows : []).filter(r => r.status === 'APPROVED');
				setTemplates(approved);
				if (approved[0] && !templateName) {
					setTemplateName(approved[0].name);
					if (approved[0].language) setLanguage(approved[0].language);
				}
			})
			.catch(err => {
				setError(
					err?.response?.data?.message ||
						(isAr
							? 'تعذر تحميل القوالب — تأكد من إعداد ميتا واتساب وتفعيله'
							: 'Could not load templates — configure & enable Meta WhatsApp first'),
				);
				setTemplates([]);
			})
			.finally(() => setLoading(false));
	}, [open, isAr]);

	useEffect(() => {
		if (!job?.id || !['queued', 'running'].includes(job.status)) return;
		const timer = setInterval(() => {
			metaWhatsAppApi
				.getBulk(job.id)
				.then(setJob)
				.catch(() => {});
		}, 2000);
		return () => clearInterval(timer);
	}, [job?.id, job?.status]);

	if (!open) return null;

	async function onSubmit(e) {
		e.preventDefault();
		if (!templateName.trim() || !withPhone.length) return;
		setSubmitting(true);
		setError(null);
		try {
			const result = await metaWhatsAppApi.startBulk({
				templateName: templateName.trim(),
				language: language.trim() || 'en',
				rateLimitPerMinute: Number(rateLimit) || 20,
				recipients: withPhone.map(l => ({
					leadId: l.id,
					phone: l.phone,
					displayName: l.businessName,
				})),
			});
			setJob(result);
		} catch (err) {
			setError(err?.response?.data?.message || (isAr ? 'فشل الإرسال الجماعي' : 'Bulk send failed'));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
			<div
				className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
				dir={isAr ? 'rtl' : 'ltr'}
			>
				<div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
					<div>
						<h2 className="text-sm font-semibold text-slate-900">
							{t.metaBulkTitle || (isAr ? 'إرسال قالب ميتا جماعي' : 'Meta template bulk send')}
						</h2>
						<p className="text-[11px] text-slate-500">
							{(t.metaBulkHint ||
								(isAr
									? 'قوالب معتمدة فقط — احترام سياسة Meta ونافذة الـ 24 ساعة'
									: 'Approved templates only — respects Meta policy & 24h window')) +
								` · ${withPhone.length}`}
						</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
						<X className="h-4 w-4" />
					</button>
				</div>

				{loading ? (
					<div className="flex justify-center py-10 text-slate-400">
						<LoaderCircle className="h-5 w-5 animate-spin" />
					</div>
				) : (
					<form onSubmit={onSubmit} className="space-y-3 p-4">
						{error && (
							<div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>
						)}
						<label className="block text-xs font-medium text-slate-600">
							{t.metaTemplate || (isAr ? 'القالب' : 'Template')}
							<input
								list="lead-meta-bulk-templates"
								value={templateName}
								onChange={e => setTemplateName(e.target.value)}
								className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								required
							/>
							<datalist id="lead-meta-bulk-templates">
								{templates.map(x => (
									<option key={`${x.name}-${x.language}`} value={x.name}>
										{x.language}
									</option>
								))}
							</datalist>
						</label>
						<div className="grid grid-cols-2 gap-3">
							<label className="block text-xs font-medium text-slate-600">
								{t.metaLang || (isAr ? 'اللغة' : 'Language')}
								<input
									value={language}
									onChange={e => setLanguage(e.target.value)}
									className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</label>
							<label className="block text-xs font-medium text-slate-600">
								{t.metaRate || (isAr ? 'حد/دقيقة' : 'Per minute')}
								<input
									type="number"
									min={1}
									max={60}
									value={rateLimit}
									onChange={e => setRateLimit(e.target.value)}
									className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</label>
						</div>

						{job && (
							<div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
								<div className="font-semibold">{job.status}</div>
								<div>
									{job.sentCount}/{job.totalCount} sent · {job.failedCount} failed ·{' '}
									{job.skippedCount} skipped
								</div>
							</div>
						)}

						<div className="flex justify-end gap-2 pt-1">
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600"
							>
								{t.waClose || (isAr ? 'إغلاق' : 'Close')}
							</button>
							<button
								type="submit"
								disabled={submitting || !withPhone.length || Boolean(job && ['queued', 'running'].includes(job.status))}
								className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
							>
								{submitting ? '…' : t.metaBulkStart || (isAr ? 'بدء الإرسال' : 'Start send')}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
