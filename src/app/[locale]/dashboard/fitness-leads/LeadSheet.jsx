'use client';

import { Copy, Download, ExternalLink, Instagram, MessageCircle, Phone } from 'lucide-react';
import { getLeadSendCount, sendLevel } from './wa-send-store';
import { buildInstagramUrl, buildMessengerUrl, digitsOnly } from './LeadWhatsAppCompose';

const COLS = [
	{ key: 'businessName', labelEn: 'Business', labelAr: 'النشاط', width: 'min-w-[180px]' },
	{ key: 'businessType', labelEn: 'Type', labelAr: 'النوع', width: 'min-w-[100px]' },
	{ key: 'phone', labelEn: 'Phone', labelAr: 'الهاتف', width: 'min-w-[110px]' },
	{ key: 'city', labelEn: 'City', labelAr: 'المدينة', width: 'min-w-[90px]' },
	{ key: 'address', labelEn: 'Address', labelAr: 'العنوان', width: 'min-w-[180px]' },
	{ key: 'country', labelEn: 'Country', labelAr: 'الدولة', width: 'min-w-[80px]' },
	{ key: 'website', labelEn: 'Website', labelAr: 'الموقع', width: 'min-w-[110px]' },
	{ key: 'social', labelEn: 'Social', labelAr: 'سوشيال', width: 'min-w-[200px]' },
];

const SOCIAL_LINKS = [
	{ key: 'instagramUrl', label: 'IG' },
	{ key: 'facebookUrl', label: 'FB' },
	{ key: 'linkedinUrl', label: 'LI' },
	{ key: 'twitterUrl', label: 'X' },
	{ key: 'tiktokUrl', label: 'TT' },
	{ key: 'youtubeUrl', label: 'YT' },
	{ key: 'whatsappUrl', label: 'WA' },
];

function cellValue(lead, key) {
	const v = lead?.[key];
	if (v == null || v === '') return null;
	return String(v);
}

function hasPhone(lead) {
	return digitsOnly(lead?.phone).length >= 8;
}

function isSelectable(lead) {
	return hasPhone(lead) || Boolean(buildMessengerUrl(lead)) || Boolean(buildInstagramUrl(lead));
}

function SocialCell({ lead }) {
	const links = SOCIAL_LINKS.map(s => ({ ...s, href: lead?.[s.key] })).filter(s => s.href);
	if (!links.length) return <span className="text-slate-300">—</span>;
	return (
		<div className="flex flex-wrap gap-1">
			{links.map(s => (
				<a
					key={s.key}
					href={s.href}
					target="_blank"
					rel="noreferrer"
					onClick={e => e.stopPropagation()}
					className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 hover:bg-sky-100"
					title={s.href}
				>
					{s.label}
				</a>
			))}
		</div>
	);
}

function rowToneFor(level, checked, active, idx) {
	if (level >= 3) return 'bg-rose-100 hover:bg-rose-100/90';
	if (level === 2) return 'bg-violet-100 hover:bg-violet-100/90';
	if (level === 1) return 'bg-amber-100 hover:bg-amber-100/90';
	if (checked) return 'bg-emerald-50/80';
	if (active) return 'bg-sky-50';
	return idx % 2 === 0 ? 'bg-white hover:bg-sky-50/70' : 'bg-slate-50/80 hover:bg-sky-50/70';
}

function levelTitle(level, t) {
	if (level >= 3) return t.waStatus3;
	if (level === 2) return t.waStatus2;
	if (level === 1) return t.waStatus1;
	return undefined;
}

export default function LeadSheet({
	leads,
	isAr,
	t,
	copied,
	onCopyCsv,
	onDownloadCsv,
	onSelectLead,
	selectedId,
	checkedIds = [],
	onCheckedChange,
	onComposeWhatsApp,
	onComposeMessenger,
	onComposeInstagram,
	onMetaBulk,
	onMetaBulkSheet,
	waSendCounts = {},
	onSelectFilter,
}) {
	const selectableLeads = leads.filter(isSelectable);
	const allSelected =
		selectableLeads.length > 0 && selectableLeads.every(l => checkedIds.includes(l.id));
	const someSelected = checkedIds.length > 0;
	const anyMarked = selectableLeads.some(l => getLeadSendCount(waSendCounts, l) > 0);
	const selectedLeads = leads.filter(l => checkedIds.includes(l.id));
	const selectedWa = selectedLeads.filter(hasPhone).length;
	const selectedMsg = selectedLeads.filter(l => buildMessengerUrl(l)).length;
	const selectedIg = selectedLeads.filter(l => buildInstagramUrl(l)).length;
	const sheetPhoneCount = selectableLeads.length;

	const toggleOne = (lead, e) => {
		e.stopPropagation();
		if (!isSelectable(lead)) return;
		const next = checkedIds.includes(lead.id)
			? checkedIds.filter(id => id !== lead.id)
			: [...checkedIds, lead.id];
		onCheckedChange?.(next);
	};

	const toggleAll = () => {
		if (allSelected) onCheckedChange?.([]);
		else onCheckedChange?.(selectableLeads.map(l => l.id));
	};

	return (
		<section className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
				<h2 className="text-sm font-bold text-slate-900">
					{t.results} {leads.length ? `(${leads.length})` : ''}
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					{selectableLeads.length > 0 && (
						<select
							defaultValue=""
							onChange={e => {
								const v = e.target.value;
								e.target.value = '';
								if (v) onSelectFilter?.(v);
							}}
							className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700"
							aria-label={t.waSelectFilter}
						>
							<option value="" disabled>
								{t.waSelectFilter}
							</option>
							<option value="all">{t.waSelectAll}</option>
							<option value="never">{t.waSelectNever}</option>
							<option value="exclude2">{t.waSelectExclude2}</option>
							<option value="exclude3">{t.waSelectExclude3}</option>
							<option value="clear">{t.waClear}</option>
						</select>
					)}
					{leads.length > 0 && (
						<>
							{sheetPhoneCount > 0 && onMetaBulkSheet ? (
								<button
									type="button"
									onClick={onMetaBulkSheet}
									className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white"
									title={t.metaBulkSheetHint}
								>
									{t.metaBulkSheet}
									<span className="opacity-80">({sheetPhoneCount})</span>
								</button>
							) : null}
							<button
								type="button"
								onClick={onCopyCsv}
								className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
							>
								<Copy className="h-3.5 w-3.5" />
								{copied ? t.copied : t.copyCsv}
							</button>
							<button
								type="button"
								onClick={onDownloadCsv}
								className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
							>
								<Download className="h-3.5 w-3.5" />
								{t.downloadCsv}
							</button>
						</>
					)}
				</div>
			</div>

			{someSelected && (
				<div className="flex flex-wrap items-center gap-2 border-b border-emerald-100 bg-emerald-50/90 px-4 py-2.5">
					<span className="text-xs font-semibold text-emerald-900">
						{t.waSelected.replace('{n}', String(checkedIds.length))}
					</span>
					<button
						type="button"
						disabled={!selectedWa}
						onClick={onComposeWhatsApp}
						className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
					>
						<MessageCircle className="h-3.5 w-3.5" />
						{t.waCompose}
						{selectedWa > 0 && <span className="opacity-80">({selectedWa})</span>}
					</button>
					<button
						type="button"
						disabled={!selectedWa}
						onClick={onMetaBulk}
						className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-40"
					>
						{t.metaBulk}
						{selectedWa > 0 && <span className="opacity-80">({selectedWa})</span>}
					</button>
					<button
						type="button"
						disabled={!selectedMsg}
						onClick={onComposeMessenger}
						className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
					>
						{t.msgCompose}
						{selectedMsg > 0 && <span className="opacity-80">({selectedMsg})</span>}
					</button>
					<button
						type="button"
						disabled={!selectedIg}
						onClick={onComposeInstagram}
						className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
					>
						<Instagram className="h-3.5 w-3.5" />
						{t.igCompose}
						{selectedIg > 0 && <span className="opacity-80">({selectedIg})</span>}
					</button>
					<button
						type="button"
						onClick={() => onCheckedChange?.([])}
						className="text-xs font-medium text-emerald-800/70 hover:text-emerald-950"
					>
						{t.waClear}
					</button>
				</div>
			)}

			{!leads.length ? (
				<p className="px-4 py-12 text-center text-sm text-slate-500">{t.noResults}</p>
			) : (
				<div className="max-h-[min(70vh,720px)] overflow-auto">
					<table className="w-max min-w-full border-collapse text-left text-[12px] tabular-nums">
						<thead className="sticky top-0 z-10">
							<tr className="bg-emerald-900 text-white">
								<th className="sticky start-0 z-20 border-e border-emerald-800 bg-emerald-900 px-2 py-2">
									<input
										type="checkbox"
										checked={allSelected}
										onChange={toggleAll}
										disabled={!selectableLeads.length}
										className="h-3.5 w-3.5 rounded border-emerald-300 text-emerald-600"
										title={t.waSelectAll}
										aria-label={t.waSelectAll}
									/>
								</th>
								<th className="border-e border-emerald-800 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide">
									#
								</th>
								{COLS.map(col => (
									<th
										key={col.key}
										className={`border-e border-emerald-800 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide ${col.width}`}
									>
										{isAr ? col.labelAr : col.labelEn}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{leads.map((lead, idx) => {
								const active = selectedId === lead.id;
								const checked = checkedIds.includes(lead.id);
								const phoneOk = isSelectable(lead);
								const count = getLeadSendCount(waSendCounts, lead);
								const level = sendLevel(count);
								return (
									<tr
										key={lead.id || idx}
										onClick={() => onSelectLead(lead)}
										title={levelTitle(level, t)}
										className={`cursor-pointer border-b border-slate-200 transition-colors ${rowToneFor(level, checked, active, idx)}`}
									>
										<td
											className="sticky start-0 z-[1] border-e border-slate-200 bg-inherit px-2 py-1.5"
											onClick={e => e.stopPropagation()}
										>
											<input
												type="checkbox"
												checked={checked}
												disabled={!phoneOk}
												onChange={e => toggleOne(lead, e)}
												className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 disabled:opacity-30"
												aria-label="select"
											/>
										</td>
										<td className="border-e border-slate-200 px-2 py-1.5 font-medium text-slate-500">
											<span className="inline-flex items-center gap-1">
												{idx + 1}
												{level === 1 && <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />}
												{level === 2 && <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-600" />}
												{level >= 3 && <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />}
												{level > 0 && <span className="text-[10px] font-bold text-slate-600">×{count}</span>}
											</span>
										</td>
										{COLS.map(col => {
											if (col.key === 'social') {
												return (
													<td
														key={col.key}
														className={`border-e border-slate-100 px-2 py-1.5 ${col.width}`}
													>
														<SocialCell lead={lead} />
													</td>
												);
											}
											const val = cellValue(lead, col.key);
											return (
												<td
													key={col.key}
													className={`border-e border-slate-100 px-2 py-1.5 text-slate-800 ${col.width} max-w-[240px] truncate`}
													title={val || undefined}
												>
													{!val ? (
														<span className="text-slate-300">—</span>
													) : col.key === 'phone' ? (
														<span className="inline-flex max-w-full items-center gap-1">
															<Phone className="h-3 w-3 shrink-0 text-slate-400" />
															<span className="truncate">{val}</span>
														</span>
													) : col.key === 'website' ? (
														<a
															href={val}
															target="_blank"
															rel="noreferrer"
															onClick={e => e.stopPropagation()}
															className="inline-flex max-w-full items-center gap-1 text-sky-700 hover:underline"
														>
															<ExternalLink className="h-3 w-3 shrink-0" />
															<span className="truncate">{val.replace(/^https?:\/\//, '')}</span>
														</a>
													) : col.key === 'businessName' ? (
														<span className="font-semibold text-slate-900">{val}</span>
													) : (
														val
													)}
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			{leads.length > 0 && (
				<p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
					{t.sheetHint}
					{anyMarked ? ` · ${t.waLegend}` : ''}
				</p>
			)}
		</section>
	);
}
