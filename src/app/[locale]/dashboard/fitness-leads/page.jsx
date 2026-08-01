'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
	Check,
	CheckCircle2,
	ChevronDown,
	History,
	Info,
	LoaderCircle,
	MessageCircle,
	Radar,
	Search,
	Settings2,
	Sparkles,
	X,
	XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { fitnessLeadsApi } from './fitness-leads-api';
import FitnessKeysModal from './FitnessKeysModal';
import LeadSheet from './LeadSheet';
import LeadDocViewer from './LeadDocViewer';
import LeadHistoryPanel from './LeadHistoryPanel';
import LeadWhatsAppCompose, {
	buildInstagramUrl,
	buildMessengerUrl,
	digitsOnly,
} from './LeadWhatsAppCompose';
import LeadMetaBulkModal from './LeadMetaBulkModal';
import { metaWhatsAppApi } from '../meta-whatsapp/meta-whatsapp-api';
import {
	getLeadSendCount,
	incrementWaSend,
	loadWaSendCounts,
	saveWaSendCounts,
} from './wa-send-store';
import MarkdownMessage from '../ai-free/MarkdownMessage';
const COPY = {
	en: {
		brand: 'Lead Scout',
		title: 'Find businesses by niche',
		subtitle: 'Search Places + OSM, enrich public emails, export a sheet.',
		manageKeys: 'API keys',
		country: 'Country',
		cities: 'Cities',
		cityPlaceholder: 'Type a city, press Enter',
		categories: 'Keywords',
		keywordPlaceholder: 'Type a keyword, press Enter',
		maxPlaces: 'Max places',
		maxPlacesTip: 'Caps how many businesses Places returns per run (cost & time).',
		statusTip: 'Places → OSM → website enrich → save.',
		categoryTip: 'Search terms for Places/OSM — any niche, not just gyms.',
		enrichWeb: 'Enrich websites',
		useOsm: 'OpenStreetMap',
		start: 'Start search',
		running: 'Searching…',
		progress: 'Status',
		results: 'Results',
		noResults: 'No leads yet. Set cities & keywords, then search.',
		sheetHint: 'Click a row to open the lead. CSV export stays available.',
		copyCsv: 'Copy CSV',
		downloadCsv: 'Download CSV',
		copied: 'Copied',
		error: 'Something went wrong',
		partialOk: 'Search finished with some website enrich skips — your leads were still saved.',
		finalizePartial: 'Save partial results',
		finalizePartialOk: 'Partial results saved as complete',
		stuckEnrich:
			'Enrichment is stuck or very slow. You can save the leads collected so far and finish.',
		keysTitle: 'Lead Scout API keys',
		keysSubtitle: 'Google Places is required. Hunter / Apollo / Clearbit are optional.',
		keysClose: 'Close',
		keysLoading: 'Loading…',
		keysConfigured: 'Configured',
		keysMissing: 'Missing',
		keysSteps: 'How to get this key',
		keysGet: 'Open signup / console',
		keysDocs: 'Docs',
		keysSave: 'Save key',
		keysRemove: 'Remove saved key',
		keysSaved: 'Key saved',
		keysRemoved: 'Key removed',
		keysLoadError: 'Could not load keys',
		keysSaveError: 'Could not save key',
		keysRemoveConfirm: 'Remove this saved key?',
		needPlacesKey: 'Add Google Places API key first',
		aiTitle: 'AI keywords',
		aiPlaceholder: 'e.g. gyms in Cairo, clinics in Riyadh…',
		aiSuggest: 'Suggest',
		aiSuggesting: '…',
		aiApply: 'Apply all',
		docTitle: 'Lead document',
		docLeadCard: 'Public business record',
		docType: 'Type',
		docEmail: 'Email',
		docPhone: 'Phone',
		docCity: 'Location',
		docArea: 'Area / District',
		docAddress: 'Address',
		docWebsite: 'Website',
		docInstagram: 'Instagram',
		docFacebook: 'Facebook',
		docLinkedin: 'LinkedIn',
		docTwitter: 'X / Twitter',
		docTiktok: 'TikTok',
		docYoutube: 'YouTube',
		docWhatsapp: 'WhatsApp',
		docStatus: 'Verification',
		docFoundVia: 'Found via',
		docNotes: 'Notes',
		openSite: 'Open website',
		openSource: 'Open source',
		copy: 'Copy',
		close: 'Close',
		selectCountry: 'Select country',
		suggestions: 'Suggestions',
		history: 'Search history',
		historySubtitle: 'Open a past search to view leads or download CSV.',
		historyEmpty: 'Past searches will show up here.',
		historyOpen: 'View',
		historyDownload: 'CSV',
		historyDelete: 'Delete',
		historyFavorite: 'Favorite',
		historyUnfavorite: 'Remove favorite',
		historyDeleteConfirm: 'Delete this search and its leads? This cannot be undone.',
		historyColSearch: 'Search',
		historyColCities: 'Cities',
		historyColWhen: 'When',
		historyColStatus: 'Status',
		historyColActions: 'Actions',
		leadsLabel: 'leads',
		loadingHistory: 'Loading…',
		waSelected: '{n} selected',
		waCompose: 'Compose WhatsApp',
		msgCompose: 'Messenger',
		igCompose: 'Instagram',
		waClear: 'Clear',
		waSelectAll: 'Select all contacts',
		waSelectFilter: 'Select…',
		waSelectNever: 'Never contacted only',
		waSelectExclude2: 'Exclude sent 2+ times',
		waSelectExclude3: 'Exclude sent 3+ times',
		waComposeTitle: 'WhatsApp Web message',
		waComposeSubtitle: '{n} with phone · {skipped} skipped',
		msgComposeTitle: 'Messenger message',
		msgComposeSubtitle: '{n} with Facebook/Messenger · {skipped} skipped',
		igComposeTitle: 'Instagram message',
		igComposeSubtitle: '{n} with Instagram · {skipped} skipped',
		socialPasteHint: 'Message is copied — paste it in the chat (Ctrl/Cmd+V). Messenger/Instagram cannot prefill text.',
		socialCopyMsg: 'Copy message',
		waLangEn: 'English',
		waLangAr: 'Arabic',
		waMessage: 'Message',
		waResetMsg: 'Reset to default',
		waVariables: 'Insert from sheet',
		waPreview: 'Preview',
		waOpenChats: 'Open WhatsApp Web',
		waNext: 'Next ({current}/{total})',
		waOpenAll: 'Open all tabs ({n})',
		waOpenRemaining: 'Open remaining ({n})',
		waNextOne: 'Next one only',
		waStartChat: 'Open first chat',
		waNextChat: 'Next chat ({current}/{total})',
		waReuseHint: 'Same WhatsApp tab is reused — Next replaces the chat with the next number.',
		waPopupHint: 'Allow popups for this site if the browser blocks tabs.',
		waCopyLink: 'Copy link',
		waQueueProgress: 'Opened {current}/{total}: {name}',
		waQueueDone: 'Done — opened {n} chats',
		waStatus1: 'Sent once (any sheet)',
		waStatus2: 'Sent twice (any sheet)',
		waStatus3: 'Sent 3+ times (any sheet)',
		waLegend: 'Amber ×1 · Violet ×2 · Rose ×3+ (shared across sheets)',
		metaWhatsApp: 'Meta WhatsApp',
		metaBulk: 'Meta template',
		metaBulkSheet: 'Meta → whole sheet',
		metaBulkTitle: 'Meta template bulk send',
		metaBulkHint: 'Approved templates only — selected rows',
		metaBulkSheetHint: 'All phones in this Lead Scout sheet via an approved template',
		metaBulkStart: 'Start send',
		metaBulkCancel: 'Stop',
		metaBulkPaceHint: 'Approx. delay between each message',
		metaBulkBanHint:
			'Meta can restrict the number for poor quality / no opt-in — start slow (5–10/min).',
		metaTemplate: 'Template',
		metaLang: 'Language',
		metaRate: 'Msgs / minute',
		metaTemplate: 'Template',
		metaLang: 'Language',
		metaRate: 'Per minute',
		metaOpenChat: 'Open Meta chat',
		waClose: 'Close',
	},
	ar: {
		brand: 'كشّاف العملاء',
		title: 'ابحث عن أنشطة حسب التخصص',
		subtitle: 'بحث Places + OSM، إثراء الإيميلات العامة، وتصدير ورقة نتائج.',
		manageKeys: 'مفاتيح API',
		country: 'الدولة',
		cities: 'المدن',
		cityPlaceholder: 'اكتب مدينة ثم Enter',
		categories: 'كلمات البحث',
		keywordPlaceholder: 'اكتب كلمة ثم Enter',
		maxPlaces: 'الحد الأقصى',
		maxPlacesTip: 'يحدّ عدد الأنشطة من Places في كل تشغيل (تكلفة ووقت).',
		statusTip: 'Places ← OSM ← إثراء المواقع ← حفظ.',
		categoryTip: 'كلمات البحث لـ Places/OSM — أي تخصص، ليست للجيمات فقط.',
		enrichWeb: 'إثراء المواقع',
		useOsm: 'OpenStreetMap',
		start: 'بدء البحث',
		running: 'جاري البحث…',
		progress: 'الحالة',
		results: 'النتائج',
		noResults: 'لا نتائج بعد. اختر مدنًا وكلمات ثم ابحث.',
		sheetHint: 'اضغط صفًا لفتح المستند. تصدير CSV متاح.',
		copyCsv: 'نسخ CSV',
		downloadCsv: 'تنزيل CSV',
		copied: 'تم النسخ',
		error: 'حدث خطأ',
		partialOk: 'اكتمل البحث مع تخطي بعض مواقع الإثراء — النتائج محفوظة.',
		finalizePartial: 'حفظ النتائج الجزئية',
		finalizePartialOk: 'تم حفظ النتائج الجزئية كمكتملة',
		stuckEnrich:
			'الإثراء متوقف أو بطيء جدًا. يمكنك حفظ النتائج الحالية وإنهاء البحث.',
		keysTitle: 'مفاتيح كشّاف العملاء',
		keysSubtitle: 'Google Places مطلوب. Hunter / Apollo / Clearbit اختيارية.',
		keysClose: 'إغلاق',
		keysLoading: 'جاري التحميل…',
		keysConfigured: 'مفعّل',
		keysMissing: 'غير موجود',
		keysSteps: 'كيف تحصل على هذا المفتاح',
		keysGet: 'فتح التسجيل / الكونسول',
		keysDocs: 'التوثيق',
		keysSave: 'حفظ المفتاح',
		keysRemove: 'حذف المفتاح',
		keysSaved: 'تم الحفظ',
		keysRemoved: 'تم الحذف',
		keysLoadError: 'تعذر تحميل المفاتيح',
		keysSaveError: 'تعذر حفظ المفتاح',
		keysRemoveConfirm: 'حذف هذا المفتاح؟',
		needPlacesKey: 'أضف مفتاح Google Places أولاً',
		aiTitle: 'كلمات بالذكاء الاصطناعي',
		aiPlaceholder: 'مثال: جيمات في القاهرة، عيادات في الرياض…',
		aiSuggest: 'اقترح',
		aiSuggesting: '…',
		aiApply: 'تطبيق الكل',
		docTitle: 'مستند العميل',
		docLeadCard: 'سجل نشاط عام',
		docType: 'النوع',
		docEmail: 'الإيميل',
		docPhone: 'الهاتف',
		docCity: 'الموقع',
		docArea: 'الحي / المنطقة',
		docAddress: 'العنوان',
		docWebsite: 'الموقع الإلكتروني',
		docInstagram: 'إنستغرام',
		docFacebook: 'فيسبوك',
		docLinkedin: 'لينكدإن',
		docTwitter: 'إكس / تويتر',
		docTiktok: 'تيك توك',
		docYoutube: 'يوتيوب',
		docWhatsapp: 'واتساب',
		docStatus: 'التحقق',
		docFoundVia: 'المصدر',
		docNotes: 'ملاحظات',
		openSite: 'فتح الموقع',
		openSource: 'فتح المصدر',
		copy: 'نسخ',
		close: 'إغلاق',
		selectCountry: 'اختر الدولة',
		suggestions: 'اقتراحات',
		history: 'سجل البحث',
		historySubtitle: 'افتح بحثًا سابقًا لعرض النتائج أو تنزيل CSV.',
		historyEmpty: 'ستظهر عمليات البحث السابقة هنا.',
		historyOpen: 'عرض',
		historyDownload: 'CSV',
		historyDelete: 'حذف',
		historyFavorite: 'مفضلة',
		historyUnfavorite: 'إزالة من المفضلة',
		historyDeleteConfirm: 'حذف هذا البحث ونتائجه؟ لا يمكن التراجع.',
		historyColSearch: 'البحث',
		historyColCities: 'المدن',
		historyColWhen: 'الوقت',
		historyColStatus: 'الحالة',
		historyColActions: 'إجراءات',
		leadsLabel: 'نتيجة',
		loadingHistory: 'جاري التحميل…',
		waSelected: '{n} محدد',
		waCompose: 'رسالة واتساب',
		msgCompose: 'ماسنجر',
		igCompose: 'إنستغرام',
		waClear: 'مسح',
		waSelectAll: 'تحديد كل جهات التواصل',
		waSelectFilter: 'تحديد…',
		waSelectNever: 'لم يُرسل لهم من قبل فقط',
		waSelectExclude2: 'استثناء المُرسل لهم مرتين فأكثر',
		waSelectExclude3: 'استثناء المُرسل لهم 3 مرات فأكثر',
		waComposeTitle: 'رسالة عبر WhatsApp Web',
		waComposeSubtitle: '{n} برقم هاتف · {skipped} متخطى',
		msgComposeTitle: 'رسالة ماسنجر',
		msgComposeSubtitle: '{n} لديهم فيسبوك/ماسنجر · {skipped} متخطى',
		igComposeTitle: 'رسالة إنستغرام',
		igComposeSubtitle: '{n} لديهم إنستغرام · {skipped} متخطى',
		socialPasteHint: 'تم نسخ الرسالة — الصقها في الشات (Ctrl/Cmd+V). ماسنجر/إنستغرام لا يدعمان تعبئة النص مسبقًا.',
		socialCopyMsg: 'نسخ الرسالة',
		waLangEn: 'English',
		waLangAr: 'العربية',
		waMessage: 'الرسالة',
		waResetMsg: 'إعادة للافتراضي',
		waVariables: 'إدراج من الشيت',
		waPreview: 'معاينة',
		waOpenChats: 'فتح WhatsApp Web',
		waNext: 'التالي ({current}/{total})',
		waOpenAll: 'فتح كل التبويبات ({n})',
		waOpenRemaining: 'فتح المتبقي ({n})',
		waNextOne: 'التالي فقط',
		waStartChat: 'فتح أول محادثة',
		waNextChat: 'المحادثة التالية ({current}/{total})',
		waReuseHint: 'نفس تاب واتساب بيتعيد استخدامه — التالي بيستبدل الشات بالرقم الجاي.',
		waPopupHint: 'اسمح بالنوافذ المنبثقة للموقع لو المتصفح منع التبويبات.',
		waCopyLink: 'نسخ الرابط',
		waQueueProgress: 'تم فتح {current}/{total}: {name}',
		waQueueDone: 'تم — فُتحت {n} محادثة',
		waStatus1: 'أُرسل مرة (أي شيت)',
		waStatus2: 'أُرسل مرتين (أي شيت)',
		waStatus3: 'أُرسل 3+ مرات (أي شيت)',
		waLegend: 'أصفر ×1 · بنفسجي ×2 · وردي ×3+ (مشترك بين كل الشيتات)',
		metaWhatsApp: 'ميتا واتساب',
		metaBulk: 'قالب ميتا',
		metaBulkSheet: 'ميتا ← الشيت كامل',
		metaBulkTitle: 'إرسال قالب ميتا جماعي',
		metaBulkHint: 'قوالب معتمدة فقط — الصفوف المحددة',
		metaBulkSheetHint: 'كل أرقام الشيت الحالي من Lead Scout عبر قالب معتمد',
		metaBulkStart: 'بدء الإرسال',
		metaBulkCancel: 'إيقاف',
		metaBulkPaceHint: 'فاصل زمني تقريبي بين كل رسالة',
		metaBulkBanHint:
			'Meta ممكن تقيّد الرقم لو الجودة ضعيفة أو بدون موافقة المستلم — ابدأ ببطء (5–10/دقيقة).',
		metaTemplate: 'القالب',
		metaLang: 'اللغة',
		metaRate: 'رسائل / دقيقة',
		metaTemplate: 'القالب',
		metaLang: 'اللغة',
		metaRate: 'حد/دقيقة',
		metaOpenChat: 'فتح محادثة ميتا',
		waClose: 'إغلاق',
	},
};

function toCsv(leads) {
	const cols = [
		'businessName',
		'businessType',
		'email',
		'phone',
		'country',
		'city',
		'neighborhood',
		'address',
		'website',
		'instagramUrl',
		'facebookUrl',
		'linkedinUrl',
		'twitterUrl',
		'tiktokUrl',
		'youtubeUrl',
		'whatsappUrl',
		'verificationStatus',
		'foundVia',
		'notes',
	];
	const escape = v => {
		const s = String(v ?? '');
		return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	const lines = [cols.join(',')];
	for (const row of leads) lines.push(cols.map(c => escape(row[c])).join(','));
	return lines.join('\n');
}

function downloadLeadsCsv(leads, name) {
	const blob = new Blob(['\uFEFF' + toCsv(leads)], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	a.click();
	URL.revokeObjectURL(url);
}

function InfoTip({ text }) {
	return (
		<span className="group relative inline-flex">
			<button
				type="button"
				className="rounded-full p-0.5 text-slate-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
				aria-label="info"
			>
				<Info className="h-3.5 w-3.5" />
			</button>
			<span
				role="tooltip"
				className="pointer-events-none absolute start-0 top-full z-30 mt-2 w-52 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-[11px] leading-relaxed font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
			>
				{text}
			</span>
		</span>
	);
}

function CountrySelect({ value, onChange, options, isAr, placeholder }) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef(null);
	const selected = options.find(c => c.key === value);

	useEffect(() => {
		const onDoc = e => {
			if (!rootRef.current?.contains(e.target)) setOpen(false);
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, []);

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
			>
				<span className="truncate">
					{selected ? (isAr ? selected.nameAr : selected.name) : placeholder}
				</span>
				<ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
			</button>
			{open && (
				<ul className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
					{options.map(c => {
						const active = c.key === value;
						return (
							<li key={c.key}>
								<button
									type="button"
									onClick={() => {
										onChange(c.key);
										setOpen(false);
									}}
									className={`flex w-full items-center justify-between px-3 py-2 text-sm ${
										active ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-700 hover:bg-slate-50'
									}`}
								>
									{isAr ? c.nameAr : c.name}
									{active && <Check className="h-4 w-4 text-emerald-600" />}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

/** Chips live inside the field (at the start). Enter adds. */
function TagInput({
	label,
	tip,
	values,
	onChange,
	placeholder,
	suggestions = [],
	suggestionsLabel,
}) {
	const [draft, setDraft] = useState('');
	const inputRef = useRef(null);

	const add = raw => {
		const v = String(raw || '').trim();
		if (!v) return;
		onChange(values.includes(v) ? values : [v, ...values]);
		setDraft('');
	};

	const remove = item => onChange(values.filter(v => v !== item));

	const unusedSuggestions = suggestions.filter(s => !values.includes(s)).slice(0, 10);

	return (
		<div>
			<div className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
				{label}
				{tip && <InfoTip text={tip} />}
			</div>
			<div
				className="flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100"
				onClick={() => inputRef.current?.focus()}
			>
				{values.map(item => (
					<span
						key={item}
						className="inline-flex max-w-[180px] items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900"
					>
						<span className="truncate">{item}</span>
						<button
							type="button"
							onClick={e => {
								e.stopPropagation();
								remove(item);
							}}
							className="shrink-0 text-emerald-700/70 hover:text-emerald-950"
							aria-label="remove"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
				<input
					ref={inputRef}
					value={draft}
					onChange={e => setDraft(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							e.preventDefault();
							add(draft);
						} else if (e.key === 'Backspace' && !draft && values.length) {
							onChange(values.slice(0, -1));
						}
					}}
					placeholder={values.length ? '' : placeholder}
					className="min-w-[120px] flex-1 border-0 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
				/>
			</div>
			{unusedSuggestions.length > 0 && (
				<div className="mt-1.5 flex flex-wrap items-center gap-1">
					<span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
						{suggestionsLabel}
					</span>
					{unusedSuggestions.map(s => (
						<button
							key={s}
							type="button"
							onClick={() => add(s)}
							className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
						>
							{s}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function CompactPipeline({ job, isAr, t }) {
	if (!job) return null;
	const steps = job.steps || [];
	return (
		<div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
			<div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
				{t.progress}
				<InfoTip text={t.statusTip} />
				<span className="tabular-nums text-emerald-700">{job.progressPercent || 0}%</span>
			</div>
			<div className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-slate-100">
				<div
					className="h-full rounded-full bg-emerald-500 transition-all"
					style={{ width: `${job.progressPercent || 0}%` }}
				/>
			</div>
			<div className="flex flex-wrap items-center gap-1.5">
				{steps.map(step => {
					const Icon =
						step.status === 'running'
							? LoaderCircle
							: step.status === 'done'
								? CheckCircle2
								: step.status === 'failed'
									? XCircle
									: null;
					return (
						<span
							key={step.id}
							title={step.message || (isAr ? step.labelAr : step.labelEn)}
							className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
								step.status === 'done'
									? 'bg-emerald-50 text-emerald-800'
									: step.status === 'running'
										? 'bg-sky-50 text-sky-800'
										: step.status === 'failed'
											? 'bg-rose-50 text-rose-800'
											: 'bg-slate-50 text-slate-500'
							}`}
						>
							{Icon ? (
								<Icon
									className={`h-3 w-3 ${step.status === 'running' ? 'animate-spin' : ''}`}
								/>
							) : (
								<span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
							)}
							{isAr ? step.labelAr : step.labelEn}
						</span>
					);
				})}
			</div>
		</div>
	);
}

export default function FitnessLeadsPage() {
	const locale = useLocale();
	const isAr = locale === 'ar';
	const t = COPY[isAr ? 'ar' : 'en'];

	const [options, setOptions] = useState(null);
	const [credentials, setCredentials] = useState(null);
	const [countryKey, setCountryKey] = useState('eg');
	const [cities, setCities] = useState([]);
	const [categories, setCategories] = useState([]);
	const [maxPlaces, setMaxPlaces] = useState(30);
	const [enrichWebsites, setEnrichWebsites] = useState(true);
	const [useOsm, setUseOsm] = useState(true);
	const [keysOpen, setKeysOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [warning, setWarning] = useState('');
	const [job, setJob] = useState(null);
	const [copied, setCopied] = useState(false);
	const [selectedLead, setSelectedLead] = useState(null);
	const [checkedIds, setCheckedIds] = useState([]);
	const [waComposeOpen, setWaComposeOpen] = useState(false);
	const [composeChannel, setComposeChannel] = useState('whatsapp');
	const [metaBulkOpen, setMetaBulkOpen] = useState(false);
	const [metaBulkScope, setMetaBulkScope] = useState('selected'); // selected | sheet
	const [waSendCounts, setWaSendCounts] = useState({});
	const [aiIntent, setAiIntent] = useState('');
	const [aiLoading, setAiLoading] = useState(false);
	const [aiKeywords, setAiKeywords] = useState([]);
	const [aiRationale, setAiRationale] = useState('');
	const [history, setHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [openingJobId, setOpeningJobId] = useState('');
	const [downloadingJobId, setDownloadingJobId] = useState('');
	const [favoritingJobId, setFavoritingJobId] = useState('');
	const [deletingJobId, setDeletingJobId] = useState('');

	const countryOptions = options?.countries || [];
	const selectedCountry = countryOptions.find(c => c.key === countryKey);
	const availableCities = selectedCountry?.cities || [];
	const placesConfigured = Boolean(
		(credentials?.providers || []).find(p => p.provider === 'google_places')?.configured,
	);

	const loadHistory = useCallback(async () => {
		setHistoryLoading(true);
		try {
			const res = await fitnessLeadsApi.listJobs();
			setHistory(res?.items || []);
		} catch {
			setHistory([]);
		} finally {
			setHistoryLoading(false);
		}
	}, []);

	const loadMeta = useCallback(async () => {
		const [opt, cred] = await Promise.all([
			fitnessLeadsApi.options().catch(() => null),
			fitnessLeadsApi.credentials().catch(() => null),
		]);
		setOptions(opt);
		setCredentials(cred);
		if (opt?.countries?.length) {
			const first = opt.countries.find(c => c.key === 'eg') || opt.countries[0];
			setCountryKey(first.key);
			setCities(first.cities.slice(0, 2));
			setCategories((opt.categories || []).filter(c => !/[ء-ي]/.test(c)).slice(0, 4));
			if (opt.defaults?.maxPlaces) setMaxPlaces(opt.defaults.maxPlaces);
		}
	}, []);

	useEffect(() => {
		void loadMeta();
		void loadHistory();
		setWaSendCounts(loadWaSendCounts());
	}, [loadMeta, loadHistory]);

	useEffect(() => {
		if (!selectedCountry) return;
		setCities(selectedCountry.cities.slice(0, 2));
	}, [countryKey]); // eslint-disable-line react-hooks/exhaustive-deps

	const keysCopy = useMemo(
		() => ({
			title: t.keysTitle,
			subtitle: t.keysSubtitle,
			close: t.keysClose,
			loading: t.keysLoading,
			configured: t.keysConfigured,
			missing: t.keysMissing,
			stepsTitle: t.keysSteps,
			getKey: t.keysGet,
			docs: t.keysDocs,
			save: t.keysSave,
			remove: t.keysRemove,
			saved: t.keysSaved,
			removed: t.keysRemoved,
			loadError: t.keysLoadError,
			saveError: t.keysSaveError,
			removeConfirm: t.keysRemoveConfirm,
		}),
		[t],
	);

	const addCategory = cat => {
		const v = String(cat || '').trim();
		if (!v) return;
		setCategories(prev => (prev.includes(v) ? prev : [v, ...prev]));
	};

	const suggestKeywords = async () => {
		if (aiIntent.trim().length < 3) return;
		setAiLoading(true);
		setError('');
		try {
			const res = await fitnessLeadsApi.suggestKeywords({
				intent: aiIntent.trim(),
				locale,
				countryKey,
			});
			setAiKeywords(res.keywords || []);
			setAiRationale(res.rationale || '');
		} catch (err) {
			setError(err?.response?.data?.message || t.error);
		} finally {
			setAiLoading(false);
		}
	};

	const applyAiKeywords = () => {
		if (!aiKeywords.length) return;
		setCategories(prev => {
			const next = [...prev];
			for (const k of aiKeywords) {
				if (!next.includes(k)) next.unshift(k);
			}
			return next;
		});
	};

	const startSearch = async () => {
		if (!placesConfigured) {
			setError(t.needPlacesKey);
			setKeysOpen(true);
			return;
		}
		if (!cities.length || !categories.length) return;
		setLoading(true);
		setError('');
		setWarning('');
		setJob(null);
		setSelectedLead(null);
		setCheckedIds([]);
		try {
			const started = await fitnessLeadsApi.startJob({
				countryKey,
				cities,
				categories,
				maxPlaces,
				enrichWebsites,
				useOsm,
			});
			setJob(started);
			const startedAt = Date.now();
			const pollMs = Math.min(Math.max(10, maxPlaces) * 12_000, 45 * 60 * 1000);
			while (Date.now() - startedAt < pollMs) {
				await new Promise(r => setTimeout(r, 1600));
				const next = await fitnessLeadsApi.getJob(started.jobId);
				setJob(next);
				if (next.status === 'done' || next.status === 'failed') {
					if (next.status === 'failed') {
						setError(next.errorMessage || t.error);
					} else if (next.errorMessage) {
						setWarning(next.errorMessage || t.partialOk);
					}
					break;
				}
			}
			void loadHistory();
		} catch (err) {
			setError(err?.response?.data?.message || t.error);
		} finally {
			setLoading(false);
		}
	};

	const finalizePartialJob = async () => {
		if (!job?.jobId) return;
		setLoading(true);
		setError('');
		setWarning('');
		try {
			const next = await fitnessLeadsApi.finalizeJob(job.jobId);
			setJob(next);
			setWarning(next.errorMessage || t.finalizePartialOk);
			void loadHistory();
		} catch (err) {
			setError(err?.response?.data?.message || t.error);
		} finally {
			setLoading(false);
		}
	};

	const openHistoryJob = async jobId => {
		setOpeningJobId(jobId);
		setError('');
		setWarning('');
		setSelectedLead(null);
		try {
			const next = await fitnessLeadsApi.getJob(jobId);
			setJob(next);
			setCheckedIds([]);
			if (next.countryKey) setCountryKey(next.countryKey);
			if (next.cities?.length) setCities(next.cities);
			if (next.categories?.length) setCategories(next.categories);
			setHistoryOpen(false);
		} catch (err) {
			setError(err?.response?.data?.message || t.error);
		} finally {
			setOpeningJobId('');
		}
	};

	const downloadHistoryJob = async item => {
		setDownloadingJobId(item.jobId);
		try {
			const full = item.jobId === job?.jobId ? job : await fitnessLeadsApi.getJob(item.jobId);
			downloadLeadsCsv(
				full.leads || [],
				`lead-scout-${item.countryKey || 'export'}-${item.jobId.slice(0, 8)}.csv`,
			);
		} catch (err) {
			setError(err?.response?.data?.message || t.error);
		} finally {
			setDownloadingJobId('');
		}
	};

	const toggleHistoryFavorite = async item => {
		setFavoritingJobId(item.jobId);
		setError('');
		try {
			const next = !item.isFavorite;
			await fitnessLeadsApi.setJobFavorite(item.jobId, next);
			setHistory(rows =>
				[...rows]
					.map(r => (r.jobId === item.jobId ? { ...r, isFavorite: next } : r))
					.sort((a, b) => {
						if (Boolean(a.isFavorite) !== Boolean(b.isFavorite)) {
							return a.isFavorite ? -1 : 1;
						}
						return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
					}),
			);
		} catch (err) {
			setError(err?.response?.data?.message || t.error);
		} finally {
			setFavoritingJobId('');
		}
	};

	const deleteHistoryJob = async item => {
		if (!window.confirm(t.historyDeleteConfirm)) return;
		setDeletingJobId(item.jobId);
		setError('');
		try {
			await fitnessLeadsApi.deleteJob(item.jobId);
			setHistory(rows => rows.filter(r => r.jobId !== item.jobId));
			if (job?.jobId === item.jobId) {
				setJob(null);
				setCheckedIds([]);
				setSelectedLead(null);
			}
		} catch (err) {
			setError(err?.response?.data?.message || t.error);
		} finally {
			setDeletingJobId('');
		}
	};

	const openHistoryPanel = () => {
		setHistoryOpen(true);
		void loadHistory();
	};

	const leads = job?.leads || [];
	const checkedLeads = useMemo(
		() => leads.filter(l => checkedIds.includes(l.id)),
		[leads, checkedIds],
	);

	useEffect(() => {
		setWaSendCounts(loadWaSendCounts());
	}, [job?.jobId]);

	const markWaOpened = lead => {
		if (!lead) return;
		setWaSendCounts(prev => {
			const next = incrementWaSend(prev, lead);
			saveWaSendCounts(next);
			return next;
		});
	};

	const openCompose = channel => {
		setComposeChannel(channel);
		setWaComposeOpen(true);
	};

	const applySelectFilter = mode => {
		const selectable = leads.filter(
			l =>
				digitsOnly(l.phone).length >= 8 ||
				Boolean(buildMessengerUrl(l)) ||
				Boolean(buildInstagramUrl(l)),
		);
		if (mode === 'clear') {
			setCheckedIds([]);
			return;
		}
		if (mode === 'all') {
			setCheckedIds(selectable.map(l => l.id));
			return;
		}
		const filtered = selectable.filter(l => {
			const n = getLeadSendCount(waSendCounts, l);
			if (mode === 'never') return n === 0;
			if (mode === 'exclude2') return n < 2;
			if (mode === 'exclude3') return n < 3;
			return true;
		});
		setCheckedIds(filtered.map(l => l.id));
	};

	const copyCsv = async () => {
		await navigator.clipboard.writeText(toCsv(leads));
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const downloadCsv = () => {
		downloadLeadsCsv(leads, `lead-scout-${job?.countryKey || countryKey}.csv`);
	};

	const keywordSuggestions = useMemo(() => {
		const base = options?.categories || [];
		return base.filter(c => !/[ء-ي]/.test(c) || isAr).slice(0, 14);
	}, [options?.categories, isAr]);

	return (
		<div
			dir={isAr ? 'rtl' : 'ltr'}
			className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] bg-[radial-gradient(900px_420px_at_0%_0%,#d1fae5_0%,transparent_55%),linear-gradient(180deg,#f8fafc,#f1f5f9)] p-4 sm:p-6 lg:p-8"
		>
			<div className="relative mx-auto max-w-6xl">
				<header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
							<Radar className="h-4 w-4" />
							{t.brand}
						</div>
						<h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t.title}</h1>
						<p className="mt-1 max-w-xl text-sm text-slate-500">{t.subtitle}</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 self-start">
						<Link
							href={`/${locale}/dashboard/meta-whatsapp`}
							className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
						>
							<MessageCircle className="h-4 w-4" />
							{t.metaWhatsApp}
						</Link>
						<button
							type="button"
							onClick={openHistoryPanel}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
						>
							<History className="h-4 w-4 text-slate-500" />
							{t.history}
							{history.length > 0 && (
								<span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
									{history.length}
								</span>
							)}
						</button>
						<button
							type="button"
							onClick={() => setKeysOpen(true)}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
						>
							<Settings2 className="h-4 w-4 text-slate-500" />
							{t.manageKeys}
						</button>
					</div>
				</header>

				{/* Form + AI */}
				<section className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.85fr)]">
					<div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block text-sm">
								<span className="mb-1.5 block font-medium text-slate-700">{t.country}</span>
								<CountrySelect
									value={countryKey}
									onChange={setCountryKey}
									options={countryOptions}
									isAr={isAr}
									placeholder={t.selectCountry}
								/>
							</label>
							<label className="block text-sm">
								<span className="mb-1.5 flex items-center gap-1 font-medium text-slate-700">
									{t.maxPlaces}
									<InfoTip text={t.maxPlacesTip} />
								</span>
								<input
									type="number"
									min={5}
									max={1000}
									value={maxPlaces}
									onChange={e => setMaxPlaces(Number(e.target.value) || 30)}
									className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
								/>
							</label>
						</div>

						<div className="mt-3 space-y-3">
							<TagInput
								label={t.cities}
								values={cities}
								onChange={setCities}
								placeholder={t.cityPlaceholder}
								suggestions={availableCities}
								suggestionsLabel={t.suggestions}
							/>
							<TagInput
								label={t.categories}
								tip={t.categoryTip}
								values={categories}
								onChange={setCategories}
								placeholder={t.keywordPlaceholder}
								suggestions={keywordSuggestions}
								suggestionsLabel={t.suggestions}
							/>
						</div>

						<div className="mt-4 flex flex-wrap items-center gap-4">
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									className="h-4 w-4 rounded border-slate-300 text-emerald-600"
									checked={enrichWebsites}
									onChange={e => setEnrichWebsites(e.target.checked)}
								/>
								{t.enrichWeb}
							</label>
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									className="h-4 w-4 rounded border-slate-300 text-emerald-600"
									checked={useOsm}
									onChange={e => setUseOsm(e.target.checked)}
								/>
								{t.useOsm}
							</label>
							<button
								type="button"
								disabled={loading || !cities.length || !categories.length}
								onClick={startSearch}
								className="ms-auto inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
							>
								{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
								{loading ? t.running : t.start}
							</button>
						</div>
					</div>

					<div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
							<Sparkles className="h-4 w-4 text-emerald-600" />
							{t.aiTitle}
						</div>
						<textarea
							value={aiIntent}
							onChange={e => setAiIntent(e.target.value)}
							rows={3}
							placeholder={t.aiPlaceholder}
							className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
						/>
						<div className="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								disabled={aiLoading || aiIntent.trim().length < 3}
								onClick={suggestKeywords}
								className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
							>
								{aiLoading ? (
									<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Sparkles className="h-3.5 w-3.5" />
								)}
								{aiLoading ? t.aiSuggesting : t.aiSuggest}
							</button>
							{aiKeywords.length > 0 && (
								<button
									type="button"
									onClick={applyAiKeywords}
									className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
								>
									{t.aiApply}
								</button>
							)}
						</div>
						{aiKeywords.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-1">
								{aiKeywords.map(k => (
									<button
										key={k}
										type="button"
										onClick={() => addCategory(k)}
										className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
									>
										+ {k}
									</button>
								))}
							</div>
						)}
						{aiRationale && (
							<div className="mt-3 max-h-28 flex-1 overflow-y-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
								<MarkdownMessage content={aiRationale} />
							</div>
						)}
					</div>
				</section>

				{error && (
					<div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
						{error}
						{(job?.status === 'failed' || job?.status === 'running') &&
						(job?.leadsCount || leads.length) > 0 ? (
							<button
								type="button"
								onClick={() => void finalizePartialJob()}
								disabled={loading}
								className="ms-3 inline-flex rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
							>
								{t.finalizePartial}
							</button>
						) : null}
					</div>
				)}
				{!error &&
					job?.status === 'running' &&
					job?.currentStep === 'enrich_websites' &&
					(job?.leadsCount || leads.length) > 0 && (
						<div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
							<span>{t.stuckEnrich}</span>
							<button
								type="button"
								onClick={() => void finalizePartialJob()}
								disabled={loading}
								className="inline-flex rounded-md bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
							>
								{t.finalizePartial}
							</button>
						</div>
					)}
				{warning && !error && (
					<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
						{warning}
					</div>
				)}

				<CompactPipeline job={job} isAr={isAr} t={t} />

				<LeadSheet
					leads={leads}
					isAr={isAr}
					t={t}
					copied={copied}
					onCopyCsv={copyCsv}
					onDownloadCsv={downloadCsv}
					onSelectLead={setSelectedLead}
					selectedId={selectedLead?.id}
					checkedIds={checkedIds}
					onCheckedChange={setCheckedIds}
					onComposeWhatsApp={() => openCompose('whatsapp')}
					onComposeMessenger={() => openCompose('messenger')}
					onComposeInstagram={() => openCompose('instagram')}
					onMetaBulk={() => {
						setMetaBulkScope('selected');
						setMetaBulkOpen(true);
					}}
					onMetaBulkSheet={() => {
						setMetaBulkScope('sheet');
						setMetaBulkOpen(true);
					}}
					waSendCounts={waSendCounts}
					onSelectFilter={applySelectFilter}
				/>
			</div>

			<LeadWhatsAppCompose
				open={waComposeOpen}
				onClose={() => setWaComposeOpen(false)}
				leads={checkedLeads}
				t={t}
				isAr={isAr}
				channel={composeChannel}
				onOpenedLead={markWaOpened}
			/>

			<LeadMetaBulkModal
				open={metaBulkOpen}
				onClose={() => setMetaBulkOpen(false)}
				leads={metaBulkScope === 'sheet' ? leads : checkedLeads}
				jobId={job?.jobId || null}
				scope={metaBulkScope}
				t={t}
				isAr={isAr}
			/>

			<LeadHistoryPanel
				open={historyOpen}
				onClose={() => setHistoryOpen(false)}
				history={history}
				loading={historyLoading}
				activeJobId={job?.jobId}
				openingJobId={openingJobId}
				downloadingJobId={downloadingJobId}
				favoritingJobId={favoritingJobId}
				deletingJobId={deletingJobId}
				onOpen={openHistoryJob}
				onDownload={downloadHistoryJob}
				onToggleFavorite={toggleHistoryFavorite}
				onDelete={deleteHistoryJob}
				t={t}
				isAr={isAr}
			/>

			<LeadDocViewer
				lead={selectedLead}
				open={Boolean(selectedLead)}
				onClose={() => setSelectedLead(null)}
				t={t}
				isAr={isAr}
				onOpenMetaChat={async lead => {
					try {
						const conv = await metaWhatsAppApi.openLead(lead.id);
						window.location.href = `/${locale}/dashboard/meta-whatsapp?conversation=${conv.id}`;
					} catch (err) {
						setError(err?.response?.data?.message || t.error);
					}
				}}
			/>
			<FitnessKeysModal
				open={keysOpen}
				onClose={() => setKeysOpen(false)}
				isAr={isAr}
				copy={keysCopy}
				onSaved={() => {
					void fitnessLeadsApi.credentials().then(setCredentials).catch(() => null);
				}}
			/>
		</div>
	);
}
