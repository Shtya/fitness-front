'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertTriangle,
	BadgeCheck,
	CheckCircle2,
	LoaderCircle,
	MessageSquareText,
	Send,
	Sparkles,
	Timer,
	X,
	XCircle,
} from 'lucide-react';
import { metaWhatsAppApi } from '../meta-whatsapp/meta-whatsapp-api';

function itemStatusRank(status, errorMessage) {
	if (status === 'sending') return 0;
	if (status === 'sent') return 1;
	if (status === 'skipped' && String(errorMessage || '').includes('Already sent')) return 1.5;
	if (status === 'failed') return 2;
	if (status === 'skipped') return 3;
	return 4;
}

function isAlreadySentItem(item) {
	return (
		item?.status === 'skipped' &&
		String(item?.errorMessage || '')
			.toLowerCase()
			.includes('already sent')
	);
}

function formatWait(ms) {
	const sec = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

function formatWaitLabel(ms, isAr) {
	const sec = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	if (m > 0) {
		return isAr ? `${m}د ${s}ث` : `${m}m ${s}s`;
	}
	return isAr ? `${s}ث` : `${s}s`;
}

const LEAD_FIELDS = [
	{ id: 'businessName', en: 'Business name', ar: 'اسم النشاط' },
	{ id: 'businessType', en: 'Business type', ar: 'نوع النشاط' },
	{ id: 'city', en: 'City', ar: 'المدينة' },
	{ id: 'country', en: 'Country', ar: 'الدولة' },
	{ id: 'neighborhood', en: 'Neighborhood', ar: 'الحي' },
	{ id: 'phone', en: 'Phone', ar: 'الهاتف' },
	{ id: 'email', en: 'Email', ar: 'الإيميل' },
	{ id: 'website', en: 'Website URL', ar: 'رابط الموقع' },
	{ id: 'websitePath', en: 'Website path (URL button)', ar: 'مسار الموقع (لزر الرابط)' },
	{ id: 'address', en: 'Address', ar: 'العنوان' },
];

function extractPlaceholders(components = []) {
	const out = [];
	for (const c of components || []) {
		const type = String(c.type || '').toUpperCase();
		if (type === 'BODY' || type === 'HEADER') {
			const nums = [
				...new Set(
					[...String(c.text || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m => Number(m[1])),
				),
			].sort((a, b) => a - b);
			nums.forEach(n => {
				out.push({
					id: `${type}:${n}`,
					component: type,
					key: String(n),
					label: `${type} · {{${n}}}`,
					hint: type === 'BODY' ? String(c.text || '').slice(0, 80) : '',
				});
			});
		}
		if (type === 'BUTTONS' && Array.isArray(c.buttons)) {
			c.buttons.forEach((btn, index) => {
				if (String(btn.type || '').toUpperCase() !== 'URL') return;
				const nums = [
					...new Set(
						[...String(btn.url || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m =>
							Number(m[1]),
						),
					),
				].sort((a, b) => a - b);
				nums.forEach(n => {
					out.push({
						id: `BUTTON:${index}:${n}`,
						component: 'BUTTON',
						key: String(n),
						label: `Button ${index + 1} URL · {{${n}}}`,
						hint: String(btn.url || ''),
					});
				});
			});
		}
	}
	return out;
}

function defaultFieldForPlaceholder(p) {
	if (p.component === 'BUTTON') return 'websitePath';
	if (p.component === 'HEADER') return 'businessName';
	const n = Number(p.key);
	if (n === 1) return 'businessName';
	if (n === 2) return 'city';
	if (n === 3) return 'businessType';
	if (n === 4) return 'country';
	return 'businessName';
}

function previewFill(text, values) {
	return String(text || '').replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, n) => {
		return values[n] != null && values[n] !== '' ? String(values[n]) : `{{${n}}}`;
	});
}

/**
 * Bulk send Meta-approved templates to Lead Scout rows / full sheet.
 */
export default function LeadMetaBulkModal({
	open,
	onClose,
	leads,
	jobId = null,
	scope = 'selected',
	t,
	isAr,
}) {
	const [templates, setTemplates] = useState([]);
	const [templateKey, setTemplateKey] = useState('');
	const [rateLimit, setRateLimit] = useState(5);
	const [variableMap, setVariableMap] = useState({});
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [error, setError] = useState(null);
	const [job, setJob] = useState(null);
	const [nowMs, setNowMs] = useState(() => Date.now());
	/** Set of normalized waIds already contacted */
	const [contactedWaIds, setContactedWaIds] = useState(() => new Set());
	const [contactStats, setContactStats] = useState({ contactedCount: 0, newCount: 0 });
	const [checkingPhones, setCheckingPhones] = useState(false);

	const withPhone = useMemo(
		() => (leads || []).filter(l => String(l.phone || '').replace(/\D/g, '').length >= 8),
		[leads],
	);

	const useFullSheet = scope === 'sheet' && Boolean(jobId);
	const recipientCount = useFullSheet ? null : withPhone.length;
	const delaySec = Math.max(1, Math.round(60 / Math.max(Number(rateLimit) || 5, 1)));
	const running = Boolean(job && ['queued', 'running'].includes(job.status));
	const done = Boolean(job && ['done', 'cancelled', 'failed'].includes(job.status));

	/** Prefer live item rows over possibly-stale job counters */
	const liveCounts = useMemo(() => {
		const items = job?.items || [];
		const fromItems = {
			sent: items.filter(i => i.status === 'sent').length,
			failed: items.filter(i => i.status === 'failed').length,
			skipped: items.filter(i => i.status === 'skipped').length,
			sending: items.filter(i => i.status === 'sending').length,
			queued: items.filter(i => i.status === 'queued').length,
		};
		const ic = job?.itemCounts;
		if (ic && typeof ic === 'object') {
			return {
				sent: Number(ic.sent ?? fromItems.sent),
				failed: Number(ic.failed ?? fromItems.failed),
				skipped: Number(ic.skipped ?? fromItems.skipped),
				sending: Number(ic.sending ?? fromItems.sending),
				queued: Number(ic.queued ?? fromItems.queued),
			};
		}
		if (items.length) return fromItems;
		return {
			sent: Number(job?.sentCount || 0),
			failed: Number(job?.failedCount || 0),
			skipped: Number(job?.skippedCount || 0),
			sending: 0,
			queued: 0,
		};
	}, [job?.items, job?.itemCounts, job?.sentCount, job?.failedCount, job?.skippedCount]);

	const processedCount = liveCounts.sent + liveCounts.failed + liveCounts.skipped;
	const hasSendingItem = liveCounts.sending > 0;
	const workerActive = Boolean(
		job?.workerRunning ||
			job?.status === 'running' ||
			hasSendingItem ||
			(running && processedCount > 0),
	);
	const displayStatus = done
		? job.status
		: workerActive || job?.status === 'running'
			? 'running'
			: job?.status || 'queued';

	const sortedItems = useMemo(() => {
		const items = [...(job?.items || [])];
		items.sort((a, b) => {
			const d =
				itemStatusRank(a.status, a.errorMessage) - itemStatusRank(b.status, b.errorMessage);
			if (d !== 0) return d;
			return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
		});
		return items;
	}, [job?.items]);

	const previewRecipients = useMemo(() => {
		return withPhone.map(l => {
			const digits = String(l.phone || '').replace(/\D/g, '');
			const egypt =
				/^01[0125]\d{8}$/.test(digits) ? `20${digits.slice(1)}` : digits.startsWith('00')
					? digits.slice(2)
					: digits;
			const alreadySent =
				contactedWaIds.has(digits) ||
				contactedWaIds.has(egypt) ||
				(egypt.startsWith('20') && contactedWaIds.has(`0${egypt.slice(2)}`));
			return { lead: l, alreadySent, waDigits: egypt || digits };
		});
	}, [withPhone, contactedWaIds]);

	const alreadySentPreviewCount = useMemo(
		() => previewRecipients.filter(r => r.alreadySent).length,
		[previewRecipients],
	);

	const clockSkew =
		job?.serverNow != null ? Number(job.serverNow) - Number(job._fetchedAt || Date.now()) : 0;
	const delayMs = Number(job?.delayMs || delaySec * 1000);

	const pacePhase = (() => {
		if (job?.pacePhase === 'waiting') return 'waiting';
		if (job?.pacePhase === 'sending' || hasSendingItem) return 'sending';
		if (job?.nextSendAt && Number(job.nextSendAt) > Date.now() + clockSkew - 500) {
			return 'waiting';
		}
		if (displayStatus === 'running') return 'waiting';
		return 'idle';
	})();

	const nextSendAt = job?.nextSendAt != null ? Number(job.nextSendAt) : null;
	const waitStartedAt = job?.waitStartedAt != null ? Number(job.waitStartedAt) : null;
	const waitRemainingMs =
		pacePhase === 'waiting' && nextSendAt != null
			? Math.max(0, nextSendAt - (nowMs + clockSkew))
			: pacePhase === 'waiting'
				? Math.max(0, delayMs)
				: 0;
	const waitTotalMs = (() => {
		if (waitStartedAt != null && nextSendAt != null) {
			return Math.max(1000, nextSendAt - waitStartedAt);
		}
		return Math.max(1000, delayMs);
	})();
	const waitLeftPct =
		pacePhase === 'waiting'
			? Math.min(100, Math.max(0, (waitRemainingMs / waitTotalMs) * 100))
			: pacePhase === 'sending'
				? 100
				: 0;

	const pollGenRef = useRef(0);

	const selectedTemplate = useMemo(() => {
		if (!templateKey) return null;
		return templates.find(x => `${x.name}::${x.language}` === templateKey) || null;
	}, [templates, templateKey]);

	const placeholders = useMemo(
		() => extractPlaceholders(selectedTemplate?.components),
		[selectedTemplate],
	);

	const sampleLead = withPhone[0] || leads?.[0] || null;
	const previewValues = useMemo(() => {
		const vals = {};
		for (const p of placeholders) {
			const field = variableMap[p.id] || defaultFieldForPlaceholder(p);
			let v = '';
			if (sampleLead) {
				if (field === 'websitePath') {
					try {
						const w = String(sampleLead.website || '');
						const u = new URL(w.startsWith('http') ? w : `https://${w}`);
						v = (u.pathname.replace(/^\//, '') || u.hostname || 'demo').slice(0, 40);
					} catch {
						v = 'demo';
					}
				} else {
					v = String(sampleLead[field] || sampleLead.businessName || '').trim();
				}
			}
			vals[p.key] = v || (isAr ? 'أحمد' : 'Alex');
		}
		return vals;
	}, [placeholders, variableMap, sampleLead, isAr]);

	const bodyPreview = useMemo(() => {
		const body = (selectedTemplate?.components || []).find(
			c => String(c.type || '').toUpperCase() === 'BODY',
		);
		return body?.text ? previewFill(body.text, previewValues) : '';
	}, [selectedTemplate, previewValues]);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setJob(null);
		setContactedWaIds(new Set());
		setContactStats({ contactedCount: 0, newCount: 0 });
		setLoading(true);
		metaWhatsAppApi
			.templates()
			.then(rows => {
				const approved = (Array.isArray(rows) ? rows : []).filter(r => r.status === 'APPROVED');
				setTemplates(approved);
				if (approved[0]) {
					const key = `${approved[0].name}::${approved[0].language}`;
					setTemplateKey(prev => prev || key);
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
		if (!open || !withPhone.length) {
			setContactedWaIds(new Set());
			setContactStats({ contactedCount: 0, newCount: 0 });
			return;
		}
		let cancelled = false;
		setCheckingPhones(true);
		const phones = withPhone.map(l => l.phone).filter(Boolean);
		metaWhatsAppApi
			.checkBulkPhones(phones)
			.then(res => {
				if (cancelled) return;
				setContactedWaIds(new Set(res?.contactedWaIds || []));
				setContactStats({
					contactedCount: Number(res?.contactedCount || 0),
					newCount: Number(res?.newCount || 0),
				});
			})
			.catch(() => {
				if (cancelled) return;
				setContactedWaIds(new Set());
				setContactStats({ contactedCount: 0, newCount: withPhone.length });
			})
			.finally(() => {
				if (!cancelled) setCheckingPhones(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, withPhone]);

	useEffect(() => {
		if (!selectedTemplate) return;
		const ph = extractPlaceholders(selectedTemplate.components);
		setVariableMap(prev => {
			const next = { ...prev };
			for (const p of ph) {
				if (!next[p.id]) next[p.id] = defaultFieldForPlaceholder(p);
			}
			return next;
		});
	}, [selectedTemplate?.name, selectedTemplate?.language]);

	useEffect(() => {
		if (!job?.id || !running) return undefined;
		const jobId = job.id;
		let cancelled = false;
		const tick = async () => {
			const gen = ++pollGenRef.current;
			try {
				const next = await metaWhatsAppApi.getBulk(jobId);
				if (cancelled || gen !== pollGenRef.current) return;
				setJob(prev => {
					const merged = {
						...next,
						_fetchedAt: Date.now(),
					};
					// Never drop items if a partial response arrives
					if (!Array.isArray(merged.items) || merged.items.length === 0) {
						if (Array.isArray(prev?.items) && prev.items.length) {
							merged.items = prev.items;
						}
					}
					return merged;
				});
				setNowMs(Date.now());
			} catch {
				/* keep last known state */
			}
		};
		void tick();
		const timer = setInterval(() => void tick(), 700);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [job?.id, running]);

	useEffect(() => {
		if (!running) return undefined;
		const tick = setInterval(() => setNowMs(Date.now()), 200);
		return () => clearInterval(tick);
	}, [running]);

	if (!open) return null;

	async function onSubmit(e) {
		e.preventDefault();
		if (!selectedTemplate?.name) return;
		if (!useFullSheet && !withPhone.length) return;

		for (const p of placeholders) {
			if (!String(variableMap[p.id] || '').trim()) {
				setError(
					isAr
						? `حدّد مصدر المتغير ${p.label}`
						: `Map a sheet field for ${p.label}`,
				);
				return;
			}
		}

		setSubmitting(true);
		setError(null);
		try {
			const payload = {
				templateName: selectedTemplate.name,
				language: selectedTemplate.language || (isAr ? 'ar' : 'en'),
				rateLimitPerMinute: Number(rateLimit) || 5,
				variableMap: placeholders.length
					? Object.fromEntries(placeholders.map(p => [p.id, variableMap[p.id]]))
					: undefined,
			};
			if (useFullSheet) {
				payload.jobId = jobId;
			} else {
				payload.recipients = withPhone.map(l => ({
					leadId: l.id,
					phone: l.phone,
					displayName: l.businessName,
				}));
			}
			const result = await metaWhatsAppApi.startBulk(payload);
			setJob({ ...result, _fetchedAt: Date.now() });
			setNowMs(Date.now());
		} catch (err) {
			setError(err?.response?.data?.message || (isAr ? 'فشل الإرسال الجماعي' : 'Bulk send failed'));
		} finally {
			setSubmitting(false);
		}
	}

	async function onCancel() {
		if (!job?.id) return;
		setCancelling(true);
		setError(null);
		try {
			const next = await metaWhatsAppApi.cancelBulk(job.id);
			setJob({ ...next, _fetchedAt: Date.now() });
		} catch (err) {
			const status = err?.response?.status;
			const msg =
				err?.response?.data?.message ||
				(status === 403
					? isAr
						? 'لا صلاحية للإيقاف'
						: 'No permission to stop'
					: isAr
						? 'تعذر الإيقاف'
						: 'Could not cancel');
			setError(Array.isArray(msg) ? msg.join(', ') : msg);
		} finally {
			setCancelling(false);
		}
	}

	const statusLabel = (status, item) => {
		if (isAlreadySentItem(item)) {
			return isAr ? 'مرسل سابقاً' : 'already sent';
		}
		const map = {
			queued: isAr ? 'في الانتظار' : 'queued',
			sending: isAr ? 'جارٍ الإرسال' : 'sending',
			sent: isAr ? 'تم' : 'sent',
			failed: isAr ? 'فشل' : 'failed',
			skipped: isAr ? 'تخطّي' : 'skipped',
		};
		return map[status] || status;
	};

	const fieldLabel = f => (isAr ? f.ar : f.en);

	return (
		<div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(11,20,26,0.55)] p-3 backdrop-blur-[3px] sm:p-6">
			<div
				className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
				dir={isAr ? 'rtl' : 'ltr'}
			>
				{/* Header */}
				<div className="relative shrink-0 overflow-hidden border-b border-slate-100 bg-gradient-to-br from-[#0B141A] via-[#10241c] to-[#0B141A] px-5 py-4 text-white">
					<div className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl" />
					<div className="relative flex items-start justify-between gap-3">
						<div className="min-w-0">
							<div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
								<Sparkles className="h-3 w-3" />
								Meta Cloud API
							</div>
							<h2 className="text-base font-semibold tracking-tight">
								{t.metaBulkTitle || (isAr ? 'إرسال قالب ميتا جماعي' : 'Meta template bulk send')}
							</h2>
							<p className="mt-1 text-[12px] text-white/65">
								{useFullSheet
									? t.metaBulkSheetHint ||
										(isAr
											? 'كل أرقام الشيت الحالي عبر قالب معتمد'
											: 'All phones in this Lead Scout sheet via an approved template')
									: t.metaBulkHint ||
										(isAr
											? 'قوالب معتمدة فقط — الصفوف المحددة'
											: 'Approved templates only — selected rows')}
								{recipientCount != null ? ` · ${recipientCount}` : ''}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-xl bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>

				{loading ? (
					<div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
						<LoaderCircle className="h-6 w-6 animate-spin text-emerald-600" />
						<span className="text-xs">{isAr ? 'تحميل القوالب…' : 'Loading templates…'}</span>
					</div>
				) : (
					<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
						<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
							{error && (
								<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
									<XCircle className="mt-0.5 h-4 w-4 shrink-0" />
									<span className="min-w-0 break-words">{error}</span>
								</div>
							)}

							{/* Template pick */}
							<div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
								<label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
									{t.metaTemplate || (isAr ? 'القالب' : 'Template')}
									<select
										value={templateKey}
										onChange={e => setTemplateKey(e.target.value)}
										disabled={running || done}
										className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500"
										required
									>
										<option value="">{isAr ? 'اختر قالب…' : 'Select template…'}</option>
										{templates.map(x => (
											<option key={`${x.name}::${x.language}`} value={`${x.name}::${x.language}`}>
												{x.name} ({x.language})
											</option>
										))}
									</select>
								</label>

								<div className="grid grid-cols-2 gap-3">
									<div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
										<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
											{t.metaLang || (isAr ? 'اللغة' : 'Language')}
										</div>
										<div className="mt-0.5 text-sm font-semibold text-slate-800">
											{selectedTemplate?.language || '—'}
										</div>
									</div>
									<label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
										<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
											{t.metaRate || (isAr ? 'رسائل / دقيقة' : 'Msgs / minute')}
										</div>
										<input
											type="number"
											min={1}
											max={60}
											value={rateLimit}
											onChange={e => setRateLimit(e.target.value)}
											disabled={running || done}
											className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none"
										/>
									</label>
								</div>
							</div>

							{/* Variable mapping */}
							{placeholders.length > 0 ? (
								<div className="space-y-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/80 to-white p-4">
									<div className="flex items-center gap-2">
										<MessageSquareText className="h-4 w-4 text-emerald-700" />
										<div>
											<div className="text-sm font-semibold text-slate-900">
												{isAr ? 'ربط متغيرات القالب بالشيت' : 'Map template variables to sheet'}
											</div>
											<p className="text-[11px] text-slate-500">
												{isAr
													? 'مثال: {{1}} ← اسم النشاط — بدون هذا الربط يفشل الإرسال (#132000)'
													: 'e.g. {{1}} ← Business name — without this Meta returns #132000'}
											</p>
										</div>
									</div>
									{placeholders.map(p => (
										<label key={p.id} className="block space-y-1">
											<span className="text-[12px] font-semibold text-slate-700">{p.label}</span>
											<select
												value={variableMap[p.id] || defaultFieldForPlaceholder(p)}
												onChange={e =>
													setVariableMap(m => ({ ...m, [p.id]: e.target.value }))
												}
												disabled={running || done}
												className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
											>
												{LEAD_FIELDS.map(f => (
													<option key={f.id} value={f.id}>
														{fieldLabel(f)}
													</option>
												))}
											</select>
										</label>
									))}
								</div>
							) : selectedTemplate ? (
								<p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
									{isAr ? 'هذا القالب بدون متغيرات — يُرسل كما هو.' : 'No variables — send as-is.'}
								</p>
							) : null}

							{bodyPreview ? (
								<div className="rounded-2xl border border-slate-200 bg-[#F0E9DF] p-4">
									<div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
										{isAr ? 'معاينة (أول صف)' : 'Preview (first row)'}
									</div>
									<div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white px-3 py-2.5 text-[12px] leading-relaxed text-slate-800 shadow-sm">
										{bodyPreview}
									</div>
								</div>
							) : null}

							<div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950">
								<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
								<span>
									{(t.metaBulkPaceHint ||
										(isAr
											? 'فاصل زمني تقريبي بين كل رسالة'
											: 'Approx. delay between each message')) +
										`: ~${delaySec}s · ` +
										(t.metaBulkBanHint ||
											(isAr
												? 'ابدأ ببطء (5–10/دقيقة) لتجنب تقييد ميتا.'
												: 'Start slow (5–10/min) to reduce Meta restrictions.'))}
								</span>
							</div>

							{!job && withPhone.length > 0 && (
								<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
									<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
										<div>
											<div className="text-sm font-semibold text-slate-900">
												{isAr ? 'المستلمون' : 'Recipients'}
											</div>
											<p className="text-[11px] text-slate-500">
												{isAr
													? 'الأرقام المُرسل لها سابقاً تُتخطى تلقائياً'
													: 'Phones messaged before are skipped automatically'}
											</p>
										</div>
										<div className="flex flex-wrap gap-1.5">
											{checkingPhones ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
													<LoaderCircle className="h-3 w-3 animate-spin" />
													{isAr ? 'فحص…' : 'Checking…'}
												</span>
											) : (
												<>
													<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
														{contactStats.newCount ||
															withPhone.length - alreadySentPreviewCount}{' '}
														{isAr ? 'جديد' : 'new'}
													</span>
													{alreadySentPreviewCount > 0 && (
														<span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-800">
															<BadgeCheck className="h-3 w-3" />
															{alreadySentPreviewCount}{' '}
															{isAr ? 'مرسل سابقاً' : 'already sent'}
														</span>
													)}
												</>
											)}
										</div>
									</div>
									<div className="max-h-44 space-y-1 overflow-y-auto px-3 py-2.5">
										{previewRecipients.map(({ lead, alreadySent }) => (
											<div
												key={lead.id || lead.phone}
												className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] ${
													alreadySent
														? 'border-sky-100 bg-sky-50/70'
														: 'border-slate-100 bg-slate-50/50'
												}`}
											>
												<div className="min-w-0">
													<p className="truncate font-semibold text-slate-800">
														{lead.businessName || lead.phone}
													</p>
													<p className="truncate text-[10px] text-slate-500">{lead.phone}</p>
												</div>
												{alreadySent ? (
													<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
														<BadgeCheck className="h-3 w-3" />
														{isAr ? 'مرسل سابقاً' : 'already sent'}
													</span>
												) : (
													<span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
														{isAr ? 'جديد' : 'new'}
													</span>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{job && (
								<div className="overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-b from-emerald-50/80 via-white to-white shadow-[0_10px_40px_rgba(16,185,129,0.08)]">
									{/* Top actions + status */}
									<div className="border-b border-emerald-100/70 bg-white/80 px-3 py-2.5 backdrop-blur-sm">
										<div className="flex items-center justify-between gap-2">
											<div className="min-w-0">
												<div className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
													{displayStatus === 'running' || running ? (
														<span className="relative flex h-2 w-2">
															<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
															<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
														</span>
													) : displayStatus === 'done' ? (
														<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
													) : (
														<XCircle className="h-3.5 w-3.5 text-rose-500" />
													)}
													{displayStatus === 'running'
														? isAr
															? 'جارٍ الإرسال…'
															: 'Sending…'
														: displayStatus === 'done'
															? isAr
																? 'اكتمل'
																: 'Done'
															: displayStatus === 'cancelled'
																? isAr
																	? 'توقف'
																	: 'Cancelled'
																: displayStatus === 'failed'
																	? isAr
																		? 'فشل'
																		: 'Failed'
																	: isAr
																		? 'في الطابور…'
																		: 'Queued…'}
												</div>
												<p className="mt-0.5 truncate text-[10px] text-slate-500">
													{pacePhase === 'waiting'
														? (isAr
																? 'استراحة قبل التالي · متبقي '
																: 'Rest before next · ') +
															formatWaitLabel(waitRemainingMs, isAr) +
															(isAr ? '' : ' left')
														: pacePhase === 'sending'
															? (isAr ? 'يرسل: ' : 'Sending: ') +
																(job.currentDisplayName ||
																	job.lastDisplayName ||
																	'…')
															: `${processedCount}/${job.totalCount} · ${liveCounts.sent} ${
																	isAr ? 'تم' : 'sent'
																}`}
												</p>
											</div>
											<div className="flex shrink-0 items-center gap-1.5">
												<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800">
													{processedCount}/{job.totalCount}
												</span>
												<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600">
													{liveCounts.sent} {isAr ? 'تم' : 'sent'}
												</span>
												{liveCounts.sending > 0 && (
													<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-800">
														{liveCounts.sending} {isAr ? 'الآن' : 'now'}
													</span>
												)}
												{liveCounts.skipped > 0 && (
													<span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-sky-800">
														{liveCounts.skipped} {isAr ? 'تخطّي' : 'skip'}
													</span>
												)}
												{liveCounts.failed > 0 && (
													<span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-rose-700">
														{liveCounts.failed} {isAr ? 'فشل' : 'fail'}
													</span>
												)}
												{running ? (
													<button
														type="button"
														disabled={cancelling}
														onClick={() => void onCancel()}
														className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40"
													>
														{cancelling
															? '…'
															: t.metaBulkCancel || (isAr ? 'إيقاف' : 'Stop')}
													</button>
												) : null}
											</div>
										</div>

										{job.errorMessage ? (
											<p
												className="mt-1.5 truncate text-[10px] text-rose-600"
												title={job.errorMessage}
											>
												{job.errorMessage}
											</p>
										) : null}

										{/* Inter-message rest progress */}
										{(running || displayStatus === 'running') && (
											<div className="mt-2.5">
												<div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold">
													<span className="inline-flex items-center gap-1 text-slate-600">
														<Timer className="h-3 w-3 text-emerald-600" />
														{pacePhase === 'sending'
															? isAr
																? 'جاري الإرسال…'
																: 'Sending now…'
															: isAr
																? 'الفاصل بين الرسائل'
																: 'Wait between messages'}
													</span>
													<span
														className="tabular-nums text-emerald-700"
														dir="ltr"
													>
														{pacePhase === 'waiting'
															? formatWait(waitRemainingMs)
															: pacePhase === 'sending'
																? isAr
																	? '…'
																	: '…'
																: formatWait(delayMs)}
														<span className="font-medium text-slate-400">
															{' / '}
															{formatWait(waitTotalMs || delayMs)}
														</span>
													</span>
												</div>
												<div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
													<div
														className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-linear ${
															pacePhase === 'sending'
																? 'animate-pulse bg-amber-400'
																: 'bg-gradient-to-r from-emerald-500 to-teal-400'
														}`}
														style={{
															width: `${
																pacePhase === 'waiting'
																	? Math.max(waitLeftPct, 2)
																	: pacePhase === 'sending'
																		? 100
																		: 0
															}%`,
														}}
													/>
												</div>
												<div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
													<span>
														{pacePhase === 'waiting'
															? (isAr ? 'متبقي ' : '') +
																formatWaitLabel(waitRemainingMs, isAr) +
																(isAr ? '' : ' remaining')
															: pacePhase === 'sending'
																? (isAr ? 'يرسل: ' : 'Sending: ') +
																	(job.currentDisplayName ||
																		job.lastDisplayName ||
																		'…')
																: isAr
																	? 'جاهز'
																	: 'Ready'}
													</span>
													<span dir="ltr">
														{isAr ? 'كل ' : 'every '}
														{formatWaitLabel(delayMs, isAr)}
													</span>
												</div>
											</div>
										)}
									</div>

									<div className="max-h-56 space-y-0.5 overflow-y-auto px-2 py-1.5">
										{sortedItems.length === 0 ? (
											<p className="py-4 text-center text-[11px] text-slate-400">
												{isAr ? 'لا عناصر بعد' : 'No recipients yet'}
											</p>
										) : (
											sortedItems.map(item => {
												const already = isAlreadySentItem(item);
												return (
													<div
														key={`${item.id}-${item.status}-${item.updatedAt || ''}`}
														className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] ${
															item.status === 'sending'
																? 'border-amber-200 bg-amber-50/80'
																: item.status === 'sent'
																	? 'border-emerald-100 bg-emerald-50/40'
																	: already
																		? 'border-sky-100 bg-sky-50/50'
																		: item.status === 'failed'
																			? 'border-rose-100 bg-rose-50/50'
																			: 'border-transparent bg-transparent'
														}`}
													>
														<div className="min-w-0 flex-1">
															<p className="truncate text-[11px] font-medium leading-tight text-slate-800">
																{item.displayName || item.waId}
															</p>
															{(already ||
																(item.errorMessage &&
																	item.status === 'failed')) && (
																<p
																	className={`truncate text-[9px] leading-tight ${
																		already ? 'text-sky-600' : 'text-rose-600'
																	}`}
																	title={item.errorMessage || ''}
																>
																	{already
																		? isAr
																			? 'مرسل سابقاً'
																			: 'Already sent'
																		: item.errorMessage}
																</p>
															)}
														</div>
														<span
															className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
																item.status === 'sent'
																	? 'bg-emerald-100 text-emerald-700'
																	: already
																		? 'bg-sky-100 text-sky-700'
																		: item.status === 'failed'
																			? 'bg-rose-100 text-rose-700'
																			: item.status === 'sending'
																				? 'bg-amber-100 text-amber-800'
																				: 'bg-slate-100 text-slate-500'
															}`}
															title={item.errorMessage || ''}
														>
															{statusLabel(item.status, item)}
														</span>
													</div>
												);
											})
										)}
									</div>
								</div>
							)}
						</div>

						<div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3.5">
							{!running && (
								<button
									type="button"
									onClick={onClose}
									className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
								>
									{t.waClose || (isAr ? 'إغلاق' : 'Close')}
								</button>
							)}
							{running ? (
								<button
									type="button"
									disabled={cancelling}
									onClick={() => void onCancel()}
									className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40"
								>
									{cancelling
										? '…'
										: t.metaBulkCancel || (isAr ? 'إيقاف' : 'Stop')}
								</button>
							) : null}
							{!done && !running && (
								<button
									type="submit"
									disabled={
										submitting ||
										!selectedTemplate?.name ||
										(!useFullSheet && !withPhone.length)
									}
									className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-700/20 transition hover:opacity-95 disabled:opacity-40"
								>
									{submitting ? (
										<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
									) : (
										<Send className="h-3.5 w-3.5" />
									)}
									{submitting
										? '…'
										: t.metaBulkStart || (isAr ? 'بدء الإرسال' : 'Start send')}
								</button>
							)}
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
