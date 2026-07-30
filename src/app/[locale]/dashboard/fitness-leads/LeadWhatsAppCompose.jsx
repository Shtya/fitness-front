'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';

const SHEET_VARS = [
	'businessName',
	'businessType',
	'phone',
	'email',
	'city',
	'neighborhood',
	'address',
	'country',
	'website',
	'instagramUrl',
	'facebookUrl',
	'linkedinUrl',
];

const MSG_STORAGE_KEY = 'lead-scout:wa-compose-messages:v3';

const DEFAULT_AR = `مرحبًا.

شفت بروفايل حضرتك ولاحظت اهتمامك بمجال الـ Fitness، فحبيت أتواصل معك.

أنا وفريقي طورنا منصة متكاملة لإدارة الجيمات والأونلاين كوتشنج، هدفها إنها تجمع كل شغل الكوتش أو الجيم في مكان واحد بدل الاعتماد على الواتساب، والإكسل، وملفات الـ PDF.

المنصة تشمل:
• إدارة العملاء والاشتراكات.
• برامج التمرين والتغذية.
• متابعة تقدم العملاء أسبوعيًا.
• تطبيق للمستخدم.
• لوحة تحكم للكوتش والإدارة.
• إدارة المدفوعات والتنبيهات.
• دعم التواصل مع العملاء بشكل احترافي.

الفكرة الأساسية إنها توفر وقت الكوتش، وتنظم الشغل، وتقدم تجربة احترافية للعملاء تساعد على زيادة الالتزام والاحتفاظ بالمشتركين.

تقدر تشوف معاينة سريعة للمنصة من هنا:
https://so7bafit.com/ar/presentation

لو عندك 10 دقائق هذا الأسبوع، يسعدني أعمل لك Demo سريع، وأسمع رأيك. حتى لو ما كان فيه تعاون، هيكون رأيك مهم بالنسبة لي.`;

const DEFAULT_EN = `Hi

I came across your profile and noticed you're involved in the fitness industry, so I wanted to reach out.

My team and I have built an all-in-one platform for gyms and online coaching businesses that brings everything into one place instead of managing clients through WhatsApp, spreadsheets, and PDFs.

The platform includes:
• Client & membership management
• Workout and nutrition plans
• Weekly progress tracking
• Mobile app for clients
• Coach & admin dashboards
• Payments and subscriptions
• Smart reminders and client communication

The goal is to help fitness businesses save time, automate daily operations, deliver a more professional experience, and improve client retention.

You can preview the platform here:
https://so7bafit.com/en/presentation

If you're interested, I'd be happy to give you a quick 10-minute demo this week. I'd genuinely love to hear your feedback, even if there's no collaboration afterward.`;

function loadSavedMessages() {
	if (typeof window === 'undefined') return { en: DEFAULT_EN, ar: DEFAULT_AR };
	try {
		const raw = localStorage.getItem(MSG_STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		return {
			en: typeof parsed?.en === 'string' && parsed.en.trim() ? parsed.en : DEFAULT_EN,
			ar: typeof parsed?.ar === 'string' && parsed.ar.trim() ? parsed.ar : DEFAULT_AR,
		};
	} catch {
		return { en: DEFAULT_EN, ar: DEFAULT_AR };
	}
}

function saveMessages(en, ar) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify({ en, ar }));
	} catch {
		/* ignore */
	}
}

export function digitsOnly(phone) {
	return String(phone || '').replace(/\D/g, '');
}

export function applyVars(template, lead) {
	const src = String(template || '');
	return src
		.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
			const raw = lead?.[key];
			if (raw == null || raw === '') {
				if (key === 'neighborhood') return '';
				return '';
			}
			if (key === 'neighborhood') return ` (${raw})`;
			return String(raw);
		})
		.replace(/[^\S\n]{2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function buildWebWhatsAppUrl(phone, text) {
	const to = digitsOnly(phone);
	if (!to) return null;
	const q = new URLSearchParams();
	q.set('phone', to);
	if (text) q.set('text', text);
	return `https://web.whatsapp.com/send?${q.toString()}`;
}

export function buildMessengerUrl(lead) {
	const raw = String(lead?.facebookUrl || '').trim();
	if (!raw) return null;
	const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
	try {
		const u = new URL(withProto);
		const host = u.hostname.replace(/^www\./, '').toLowerCase();
		if (host === 'm.me' || host.endsWith('.m.me')) return withProto;
		if (host.includes('messenger.com')) return withProto;
		if (host.includes('facebook.com') || host.includes('fb.com')) {
			const parts = u.pathname.split('/').filter(Boolean);
			const skip = new Set(['pages', 'groups', 'watch', 'events', 'reel', 'photo', 'story.php']);
			if (parts[0] && !skip.has(parts[0].toLowerCase()) && parts[0] !== 'profile.php') {
				return `https://m.me/${parts[0]}`;
			}
			return withProto;
		}
		return withProto;
	} catch {
		return null;
	}
}

export function buildInstagramUrl(lead) {
	const raw = String(lead?.instagramUrl || '').trim();
	if (!raw) return null;
	return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function channelTargetUrl(channel, lead, message) {
	if (channel === 'whatsapp') return buildWebWhatsAppUrl(lead.phone, message);
	if (channel === 'messenger') return buildMessengerUrl(lead);
	if (channel === 'instagram') return buildInstagramUrl(lead);
	return null;
}

function leadMatchesChannel(channel, lead) {
	if (channel === 'whatsapp') return digitsOnly(lead.phone).length >= 8;
	if (channel === 'messenger') return Boolean(buildMessengerUrl(lead));
	if (channel === 'instagram') return Boolean(buildInstagramUrl(lead));
	return false;
}

export default function LeadWhatsAppCompose({
	open,
	onClose,
	leads,
	t,
	isAr,
	onOpenedLead,
	channel = 'whatsapp',
}) {
	const [lang, setLang] = useState(isAr ? 'ar' : 'en');
	const [msgEn, setMsgEn] = useState(DEFAULT_EN);
	const [msgAr, setMsgAr] = useState(DEFAULT_AR);
	const [queueIndex, setQueueIndex] = useState(-1);
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedMsg, setCopiedMsg] = useState(false);
	const textareaRef = useRef(null);
	const hydrated = useRef(false);

	useEffect(() => {
		const saved = loadSavedMessages();
		setMsgEn(saved.en);
		setMsgAr(saved.ar);
		hydrated.current = true;
	}, []);

	useEffect(() => {
		if (!hydrated.current) return;
		saveMessages(msgEn, msgAr);
	}, [msgEn, msgAr]);

	const eligible = useMemo(
		() => (leads || []).filter(l => leadMatchesChannel(channel, l)),
		[leads, channel],
	);
	const skipped = (leads || []).length - eligible.length;
	const template = lang === 'ar' ? msgAr : msgEn;
	const setTemplate = lang === 'ar' ? setMsgAr : setMsgEn;
	const previewLead = eligible[Math.max(queueIndex, 0)] || eligible[0];
	const previewText = previewLead ? applyVars(template, previewLead) : '';
	const needsPaste = channel === 'messenger' || channel === 'instagram';

	const title =
		channel === 'messenger'
			? t.msgComposeTitle
			: channel === 'instagram'
				? t.igComposeTitle
				: t.waComposeTitle;
	const subtitle =
		channel === 'messenger'
			? t.msgComposeSubtitle
			: channel === 'instagram'
				? t.igComposeSubtitle
				: t.waComposeSubtitle;

	useEffect(() => {
		if (!open) {
			setQueueIndex(-1);
			setCopiedLink(false);
			setCopiedMsg(false);
		}
	}, [open]);

	useEffect(() => {
		setLang(isAr ? 'ar' : 'en');
	}, [isAr]);

	const resetDefaults = () => {
		setMsgEn(DEFAULT_EN);
		setMsgAr(DEFAULT_AR);
		saveMessages(DEFAULT_EN, DEFAULT_AR);
	};

	const insertVar = key => {
		const token = `{{${key}}}`;
		const el = textareaRef.current;
		if (!el) {
			setTemplate(prev => `${prev}${token}`);
			return;
		}
		const start = el.selectionStart ?? template.length;
		const end = el.selectionEnd ?? start;
		const next = template.slice(0, start) + token + template.slice(end);
		setTemplate(next);
		requestAnimationFrame(() => {
			el.focus();
			const pos = start + token.length;
			el.setSelectionRange(pos, pos);
		});
	};

	const copyMessage = async text => {
		try {
			await navigator.clipboard.writeText(text || '');
			setCopiedMsg(true);
			setTimeout(() => setCopiedMsg(false), 2000);
			return true;
		} catch {
			return false;
		}
	};

	const openUrlInBrowser = url => {
		if (channel === 'whatsapp') {
			// Same named tab so each "Next" overrides the previous WhatsApp chat.
			// Do not use noopener — it blocks named-window reuse.
			const w = window.open(url, 'leadScoutWhatsAppChat');
			try {
				w?.focus?.();
			} catch {
				/* ignore */
			}
			return;
		}
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const openAt = async index => {
		const lead = eligible[index];
		if (!lead) return false;
		const message = applyVars(template, lead);
		const url = channelTargetUrl(channel, lead, message);
		if (!url) return false;
		if (needsPaste) await copyMessage(message);
		openUrlInBrowser(url);
		onOpenedLead?.(lead);
		setQueueIndex(index);
		return true;
	};

	const openAllTabs = async (fromIndex = 0) => {
		if (!eligible.length || channel === 'whatsapp') return;
		if (needsPaste) {
			const first = eligible[fromIndex] || eligible[0];
			await copyMessage(applyVars(template, first));
		}
		let last = fromIndex - 1;
		for (let i = fromIndex; i < eligible.length; i++) {
			const lead = eligible[i];
			const message = applyVars(template, lead);
			const url = channelTargetUrl(channel, lead, message);
			if (!url) continue;
			window.open(url, '_blank', 'noopener,noreferrer');
			onOpenedLead?.(lead);
			last = i;
		}
		if (last >= 0) setQueueIndex(last);
	};

	const startWhatsAppQueue = () => openAt(0);
	const nextWhatsAppChat = () => openAt(queueIndex + 1);

	const copyCurrentLink = async () => {
		const lead = eligible[Math.max(queueIndex, 0)];
		if (!lead) return;
		const message = applyVars(template, lead);
		const url = channelTargetUrl(channel, lead, message);
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 1500);
		} catch {
			/* ignore */
		}
	};

	const done = queueIndex >= 0 && queueIndex >= eligible.length - 1;
	const remaining = done ? 0 : eligible.length - Math.max(queueIndex + 1, 0);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-[2px] sm:items-center"
			onClick={onClose}
		>
			<div
				dir={isAr ? 'rtl' : 'ltr'}
				className="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
				onClick={e => e.stopPropagation()}
			>
				<header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
					<div>
						<div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
							<MessageCircle className="h-4 w-4" />
							{title}
						</div>
						<p className="mt-1 text-xs text-slate-500">
							{subtitle
								.replace('{n}', String(eligible.length))
								.replace('{skipped}', String(skipped))}
						</p>
						{needsPaste && (
							<p className="mt-1 text-[11px] text-amber-700">{t.socialPasteHint}</p>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
						aria-label={t.close}
					>
						<X className="h-4 w-4" />
					</button>
				</header>

				<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
							{['en', 'ar'].map(code => (
								<button
									key={code}
									type="button"
									onClick={() => setLang(code)}
									className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
										lang === code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
									}`}
								>
									{code === 'en' ? t.waLangEn : t.waLangAr}
								</button>
							))}
						</div>
						<button
							type="button"
							onClick={resetDefaults}
							className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
						>
							{t.waResetMsg}
						</button>
					</div>

					<div>
						<div className="mb-1.5 text-xs font-medium text-slate-600">{t.waMessage}</div>
						<textarea
							ref={textareaRef}
							dir={lang === 'ar' ? 'rtl' : 'ltr'}
							value={template}
							onChange={e => setTemplate(e.target.value)}
							rows={12}
							className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
						/>
					</div>

					<div>
						<div className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
							{t.waVariables}
						</div>
						<div className="flex flex-wrap gap-1.5">
							{SHEET_VARS.map(key => (
								<button
									key={key}
									type="button"
									onClick={() => insertVar(key)}
									className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
								>
									{`{{${key}}}`}
								</button>
							))}
						</div>
					</div>

					{previewLead && (
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
							<div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
								{t.waPreview} · {previewLead.businessName || previewLead.phone}
							</div>
							<p
								className="whitespace-pre-wrap text-sm text-slate-700"
								dir={lang === 'ar' ? 'rtl' : 'ltr'}
							>
								{previewText || '—'}
							</p>
						</div>
					)}

					{queueIndex >= 0 && eligible.length > 0 && (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900">
							{done
								? t.waQueueDone.replace('{n}', String(eligible.length))
								: t.waQueueProgress
										.replace('{current}', String(queueIndex + 1))
										.replace('{total}', String(eligible.length))
										.replace(
											'{name}',
											eligible[queueIndex]?.businessName ||
												eligible[queueIndex]?.phone ||
												'',
										)}
						</div>
					)}
					{channel === 'whatsapp' && eligible.length > 0 && (
						<p className="text-[11px] text-slate-400">{t.waReuseHint}</p>
					)}
					{channel !== 'whatsapp' && eligible.length > 1 && (
						<p className="text-[11px] text-slate-400">{t.waPopupHint}</p>
					)}
				</div>

				<footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
					<button
						type="button"
						disabled={!eligible.length}
						onClick={copyCurrentLink}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
					>
						{copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
						{copiedLink ? t.copied : t.waCopyLink}
					</button>
					{needsPaste && (
						<button
							type="button"
							disabled={!eligible.length}
							onClick={() =>
								copyMessage(
									applyVars(template, eligible[Math.max(queueIndex, 0)] || eligible[0]),
								)
							}
							className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
						>
							{copiedMsg ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
							{copiedMsg ? t.copied : t.socialCopyMsg}
						</button>
					)}
					<div className="ms-auto flex flex-wrap gap-2">
						{channel === 'whatsapp' ? (
							<>
								{queueIndex < 0 && (
									<button
										type="button"
										disabled={!eligible.length}
										onClick={startWhatsAppQueue}
										className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
									>
										<ExternalLink className="h-3.5 w-3.5" />
										{t.waStartChat}
									</button>
								)}
								{queueIndex >= 0 && !done && (
									<button
										type="button"
										onClick={nextWhatsAppChat}
										className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
									>
										<ExternalLink className="h-3.5 w-3.5" />
										{t.waNextChat
											.replace('{current}', String(queueIndex + 2))
											.replace('{total}', String(eligible.length))}
									</button>
								)}
								{done && (
									<button
										type="button"
										onClick={onClose}
										className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
									>
										{t.close}
									</button>
								)}
							</>
						) : (
							<>
								{queueIndex >= 0 && !done && (
									<button
										type="button"
										onClick={async () => {
											await openAt(queueIndex + 1);
										}}
										className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
									>
										{t.waNextOne}
									</button>
								)}
								{!done && (
									<button
										type="button"
										disabled={!eligible.length}
										onClick={() => openAllTabs(queueIndex < 0 ? 0 : queueIndex + 1)}
										className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
									>
										<ExternalLink className="h-3.5 w-3.5" />
										{queueIndex < 0
											? t.waOpenAll.replace('{n}', String(eligible.length))
											: t.waOpenRemaining.replace('{n}', String(remaining))}
									</button>
								)}
								{done && (
									<button
										type="button"
										onClick={onClose}
										className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
									>
										{t.close}
									</button>
								)}
							</>
						)}
					</div>
				</footer>
			</div>
		</div>
	);
}
