'use client';

import {
	Building2,
	Copy,
	ExternalLink,
	Mail,
	Phone,
	X,
} from 'lucide-react';

export default function LeadDocViewer({ lead, open, onClose, t, isAr, onOpenMetaChat }) {
	if (!open || !lead) return null;

	const copy = async text => {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(String(text));
		} catch {
			/* ignore */
		}
	};

	const rows = [
		{ label: t.docType, value: lead.businessType },
		{ label: t.docEmail, value: lead.email, href: lead.email ? `mailto:${lead.email}` : null },
		{ label: t.docPhone, value: lead.phone },
		{ label: t.docCity, value: [lead.city, lead.country].filter(Boolean).join(', ') },
		{ label: t.docArea, value: lead.neighborhood },
		{ label: t.docAddress, value: lead.address },
		{ label: t.docWebsite, value: lead.website, href: lead.website },
		{ label: t.docInstagram, value: lead.instagramUrl, href: lead.instagramUrl },
		{ label: t.docFacebook, value: lead.facebookUrl, href: lead.facebookUrl },
		{ label: t.docLinkedin, value: lead.linkedinUrl, href: lead.linkedinUrl },
		{ label: t.docTwitter, value: lead.twitterUrl, href: lead.twitterUrl },
		{ label: t.docTiktok, value: lead.tiktokUrl, href: lead.tiktokUrl },
		{ label: t.docYoutube, value: lead.youtubeUrl, href: lead.youtubeUrl },
		{ label: t.docWhatsapp, value: lead.whatsappUrl, href: lead.whatsappUrl },
		{ label: t.docStatus, value: lead.verificationStatus },
		{ label: t.docFoundVia, value: lead.foundVia },
		{ label: t.docNotes, value: lead.notes },
	].filter(r => r.value);

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
			<aside
				dir={isAr ? 'rtl' : 'ltr'}
				className="flex h-full w-full max-w-lg flex-col border-s border-slate-200 bg-white shadow-2xl"
				onClick={e => e.stopPropagation()}
			>
				<header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">{t.docTitle}</p>
						<h3 className="mt-1 text-xl font-bold text-slate-900">{lead.businessName || '—'}</h3>
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

				<div className="flex-1 overflow-y-auto px-5 py-4">
					<article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
						<div className="mb-4 flex items-center gap-2 text-slate-700">
							<Building2 className="h-5 w-5 text-emerald-600" />
							<span className="text-sm font-semibold">{t.docLeadCard}</span>
						</div>
						<dl className="space-y-3">
							{rows.map(row => (
								<div key={row.label} className="border-b border-slate-200/80 pb-3 last:border-0 last:pb-0">
									<dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
										{row.label}
									</dt>
									<dd className="mt-1 flex items-start justify-between gap-2 text-sm text-slate-900">
										{row.href ? (
											<a
												href={row.href}
												target={row.href.startsWith('mailto:') ? undefined : '_blank'}
												rel="noreferrer"
												className="break-all text-sky-700 hover:underline"
											>
												{row.value}
											</a>
										) : (
											<span className="break-words whitespace-pre-wrap">{row.value}</span>
										)}
										<button
											type="button"
											onClick={() => copy(row.value)}
											className="shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
											title={t.copy}
										>
											<Copy className="h-3.5 w-3.5" />
										</button>
									</dd>
								</div>
							))}
						</dl>
					</article>
				</div>

				<footer className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
					{lead.phone && onOpenMetaChat && (
						<button
							type="button"
							onClick={() => onOpenMetaChat(lead)}
							className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white"
						>
							<Phone className="h-3.5 w-3.5" />
							{t.metaOpenChat}
						</button>
					)}
					{lead.email && (
						<a
							href={`mailto:${lead.email}`}
							className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800"
						>
							<Mail className="h-3.5 w-3.5" />
							{t.docEmail}
						</a>
					)}
					{lead.phone && (
						<button
							type="button"
							onClick={() => copy(lead.phone)}
							className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800"
						>
							<Phone className="h-3.5 w-3.5" />
							{t.copy} {t.docPhone}
						</button>
					)}
					{lead.website && (
						<a
							href={lead.website}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
						>
							<ExternalLink className="h-3.5 w-3.5" />
							{t.openSite}
						</a>
					)}
					{lead.sourceUrl && (
						<a
							href={lead.sourceUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800"
						>
							<ExternalLink className="h-3.5 w-3.5" />
							{t.openSource}
						</a>
					)}
				</footer>
			</aside>
		</div>
	);
}
