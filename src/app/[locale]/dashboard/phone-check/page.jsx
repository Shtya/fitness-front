'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ShieldAlert,
	Phone,
	CheckCircle2,
	XCircle,
	Copy,
	Check,
	ExternalLink,
	Flag,
	MessageSquarePlus,
	RefreshCw,
	Globe2,
	Building2,
	Signal,
	AlertTriangle,
	Search,
	Settings2,
	LoaderCircle,
	Sparkles,
	MapPin,
	UserRound,
	Activity,
} from 'lucide-react';
import { phoneIntelApi } from './phone-intel-api';
import PhoneKeysModal from './PhoneKeysModal';
import PhoneSitesModal from './PhoneSitesModal';
import { useUser } from '@/hooks/useUser';
import MarkdownMessage from '../ai-free/MarkdownMessage';

const COUNTRY_OPTIONS = [
	{ code: 'EG', dial: '+20', label: { en: 'Egypt', ar: 'مصر' } },
	{ code: 'SA', dial: '+966', label: { en: 'Saudi Arabia', ar: 'السعودية' } },
	{ code: 'AE', dial: '+971', label: { en: 'UAE', ar: 'الإمارات' } },
	{ code: 'KW', dial: '+965', label: { en: 'Kuwait', ar: 'الكويت' } },
	{ code: 'QA', dial: '+974', label: { en: 'Qatar', ar: 'قطر' } },
	{ code: 'BH', dial: '+973', label: { en: 'Bahrain', ar: 'البحرين' } },
	{ code: 'JO', dial: '+962', label: { en: 'Jordan', ar: 'الأردن' } },
	{ code: 'US', dial: '+1', label: { en: 'United States', ar: 'الولايات المتحدة' } },
	{ code: 'GB', dial: '+44', label: { en: 'United Kingdom', ar: 'المملكة المتحدة' } },
];

const COPY = {
	en: {
		brand: 'Phone Check',
		title: 'Phone Intelligence',
		subtitle: 'Deep public search across APIs and sites you manage — useful signals, not fluff.',
		phonePlaceholder: '1xxxxxxxxx',
		check: 'Deep check',
		checking: 'Searching…',
		refresh: 'Refresh',
		valid: 'Valid',
		invalid: 'Invalid',
		country: 'Country',
		carrier: 'Carrier',
		lineType: 'Line type',
		risk: 'Risk',
		reports: 'Reports',
		category: 'Top category',
		publicName: 'Possible public name',
		noPublicName: 'Not found yet',
		publicPresence: 'Public mentions',
		noPresence: 'No strong public mentions yet — try useful searches below or add more sites.',
		report: 'Report number',
		addComment: 'Add report',
		copyReport: 'Copy report',
		copied: 'Copied',
		truecaller: 'Truecaller',
		submitReport: 'Submit report',
		commentPlaceholder: 'Optional details…',
		reportThanks: 'Report saved.',
		empty: 'Enter a number to start a deep public search.',
		error: 'Lookup failed. Try again.',
		riskLow: 'Low',
		riskMedium: 'Medium',
		riskHigh: 'High',
		na: '—',
		manageKeys: 'Manage API keys',
		manageSites: 'Search websites',
		keysTitle: 'Phone Check API keys',
		keysSubtitle: 'Add provider keys from this page. Each provider includes signup link and steps.',
		keysClose: 'Close',
		keysLoading: 'Loading…',
		keysConfigured: 'Configured',
		keysMissing: 'Not configured',
		keysSteps: 'How to get this key',
		keysGet: 'Open signup / dashboard',
		keysDocs: 'Docs',
		keysSave: 'Save key',
		keysRemove: 'Remove saved key',
		keysSaved: 'Key saved successfully',
		keysRemoved: 'Saved key removed',
		keysLoadError: 'Could not load credentials',
		keysSaveError: 'Could not save credentials',
		keysRemoveConfirm: 'Remove the saved key for this provider?',
		keysSource: 'Source',
		keysReadOnly: 'Only admin or coach can save keys. You can still view setup steps.',
		searchingIn: 'Searching now',
		doneSearching: 'Search complete',
		searchTimedOut: 'Stopped waiting — job may still be finishing in background. Refresh shortly.',
		searchStillRunning: 'Still searching…',
		aiTitle: 'FitCoach analysis',
		aiRun: 'Analyze with FitCoach',
		aiRunning: 'Analyzing…',
		aiHint: 'Structured markdown summary from the same free AI as FitCoach.',
		usefulLinks: 'Working searches only',
		usefulLinksHint: 'Only sources that returned real hits or reachable pages in this run.',
		findings: 'What we found',
		names: 'Names',
		locations: 'Locations',
		activities: 'Activity hints',
		communityScore: 'Community score',
		highlights: 'Useful signals from sources',
		fromSource: 'Source',
		noHighlights: 'No structured public signals yet.',
		sitesTitle: 'Search websites',
		sitesSubtitle:
			'Sites used during deep check. Add public reverse-phone URL templates. We fetch public pages only — no private login automation.',
		sitesLoading: 'Loading…',
		sitesLoadError: 'Could not load sites',
		sitesSaveError: 'Could not save site',
		sitesRemoveConfirm: 'Remove this website?',
		sitesAdd: 'Add website',
		sitesEdit: 'Save changes',
		sitesSave: 'Save',
		sitesEnabled: 'On',
		sitesDisabled: 'Off',
		sitesNeedsLogin: 'Needs login (manual)',
		sitesNamePh: 'Name (e.g. tellows)',
		sitesUrlPh: 'URL template with {local} {quotedLocal} {e164}…',
		sitesDomainPh: 'Domain for site: search (optional)',
		sitesNotesPh: 'Notes (optional)',
		sitesModeEngine: 'Search engine (site:domain)',
		sitesModeUrl: 'Direct public URL',
		sitesModeManual: 'Manual open only',
		sitesPlaceholders:
			'Placeholders: {local} {quotedLocal} {e164} {e164Digits} {national} {country}. Example: https://www.tellows.com/num/{e164Digits}',
		sitesReadOnly: 'Only admin/coach can add sites.',
		autoAi: 'Auto analysis after deep search',
		nameSourcesNote:
			'Name comes from public pages (tellows/Google/etc.) or Twilio CNAM — not private app logins.',
		inspectSource: 'Source response',
		inspectHint: 'Click any badge to inspect what that source returned.',
		inspectClose: 'Close',
		inspectNames: 'Names in this response',
		inspectEmpty: 'No payload yet for this source.',
		inspectCopy: 'Copy JSON',
	},
	ar: {
		brand: 'فحص الرقم',
		title: 'ذكاء أرقام الهاتف',
		subtitle: 'بحث عميق عبر الـ APIs والمواقع اللي بتديرها — إشارات مفيدة مش كلام عام.',
		phonePlaceholder: '1xxxxxxxxx',
		check: 'فحص عميق',
		checking: 'جاري البحث…',
		refresh: 'تحديث',
		valid: 'صالح',
		invalid: 'غير صالح',
		country: 'الدولة',
		carrier: 'الشركة',
		lineType: 'نوع الخط',
		risk: 'الخطورة',
		reports: 'بلاغات',
		category: 'التصنيف',
		publicName: 'اسم محتمل ظهر علنًا',
		noPublicName: 'لم يظهر بعد',
		publicPresence: 'الظهور العام',
		noPresence: 'مفيش ظهور قوي لسه — جرّب الروابط تحت أو زوّد مواقع البحث.',
		report: 'الإبلاغ عن الرقم',
		addComment: 'إضافة بلاغ',
		copyReport: 'نسخ التقرير',
		copied: 'تم النسخ',
		truecaller: 'Truecaller',
		submitReport: 'إرسال البلاغ',
		commentPlaceholder: 'تفاصيل اختيارية…',
		reportThanks: 'تم حفظ البلاغ.',
		empty: 'اكتب رقم عشان نبدأ بحث عميق.',
		error: 'فشل الفحص. حاول تاني.',
		riskLow: 'منخفضة',
		riskMedium: 'متوسطة',
		riskHigh: 'مرتفعة',
		na: '—',
		manageKeys: 'إدارة مفاتيح API',
		manageSites: 'مواقع البحث',
		keysTitle: 'مفاتيح Phone Check',
		keysSubtitle: 'أضف مفاتيح المزودين من هذه الصفحة. لكل مزود رابط تسجيل وخطوات واضحة.',
		keysClose: 'إغلاق',
		keysLoading: 'جاري التحميل…',
		keysConfigured: 'مفعّل',
		keysMissing: 'غير مفعّل',
		keysSteps: 'كيف تحصل على هذا المفتاح',
		keysGet: 'فتح صفحة التسجيل / اللوحة',
		keysDocs: 'التوثيق',
		keysSave: 'حفظ المفتاح',
		keysRemove: 'حذف المفتاح المحفوظ',
		keysSaved: 'تم حفظ المفتاح بنجاح',
		keysRemoved: 'تم حذف المفتاح المحفوظ',
		keysLoadError: 'تعذر تحميل المفاتيح',
		keysSaveError: 'تعذر حفظ المفاتيح',
		keysRemoveConfirm: 'حذف المفتاح المحفوظ لهذا المزود؟',
		keysSource: 'المصدر',
		keysReadOnly: 'يمكن للمشرف أو المدرب فقط حفظ المفاتيح. يمكنك الاطلاع على خطوات الإعداد.',
		searchingIn: 'بيبحث دلوقتي في',
		doneSearching: 'خلص البحث',
		searchTimedOut: 'وقفنا الانتظار — الجوب ممكن لسه شغالة في الخلفية. حدّث بعد شوية.',
		searchStillRunning: 'لسه بيدوّر…',
		aiTitle: 'تحليل FitCoach',
		aiRun: 'حلّل بـ FitCoach',
		aiRunning: 'جاري التحليل…',
		aiHint: 'ملخص Markdown من نفس الذكاء المجاني في FitCoach.',
		usefulLinks: 'عمليات بحث شغالة فقط',
		usefulLinksHint: 'بنعرض بس المصادر اللي رجّعت نتائج حقيقية أو صفحة وصلت في الجولة دي.',
		findings: 'اللي لقيناه',
		names: 'أسماء',
		locations: 'أماكن',
		activities: 'نشاط ظاهر',
		communityScore: 'تقييم المجتمع',
		highlights: 'إشارات مفيدة من المصادر',
		fromSource: 'المصدر',
		noHighlights: 'مفيش إشارات منظمة لسه.',
		sitesTitle: 'مواقع البحث',
		sitesSubtitle:
			'المواقع المستخدمة في الفحص العميق. ضيف أي قالب URL عام. المواقع اللي محتاجة login تفضل روابط يدوية — مش بنعمل تسجيل دخول خاص أوتوماتيك.',
		sitesLoading: 'جاري التحميل…',
		sitesLoadError: 'تعذر تحميل المواقع',
		sitesSaveError: 'تعذر حفظ الموقع',
		sitesRemoveConfirm: 'حذف الموقع ده؟',
		sitesAdd: 'إضافة موقع',
		sitesEdit: 'حفظ التعديل',
		sitesSave: 'حفظ',
		sitesEnabled: 'شغال',
		sitesDisabled: 'واقف',
		sitesNeedsLogin: 'محتاج login (يدوي)',
		sitesNamePh: 'الاسم (مثل Instagram عبر Google)',
		sitesUrlPh: 'قالب الرابط مع {local} {quotedLocal} {e164}…',
		sitesDomainPh: 'الدومين لـ site: (اختياري)',
		sitesNotesPh: 'ملاحظات (اختياري)',
		sitesModeEngine: 'محرك بحث (site:domain)',
		sitesModeUrl: 'رابط عام مباشر',
		sitesModeManual: 'فتح يدوي فقط',
		sitesPlaceholders:
			'Placeholders: {local} {quotedLocal} {e164} {e164Digits} {national} {country}. مثال: https://www.google.com/search?q=site%3Ainstagram.com+{quotedLocal}',
		sitesReadOnly: 'المشرف/المدرب بس يقدر يضيف مواقع.',
		autoAi: 'تحليل تلقائي بعد البحث العميق',
		inspectSource: 'رد المصدر',
		inspectHint: 'اضغط على أي badge عشان تشوف الـ response اللي رجع من المصدر ده.',
		inspectClose: 'إغلاق',
		inspectNames: 'أسماء ظهرت في الرد ده',
		inspectEmpty: 'لسه مفيش payload للمصدر ده.',
		inspectCopy: 'نسخ JSON',
		nameSourcesNote:
			'الاسم بييجي من نتائج عامة / Twilio CNAM لو متاح — مش من تطبيقات خاصة زي GetContact.',
	},
};

function riskLabel(level, t) {
	if (level === 'high') return t.riskHigh;
	if (level === 'medium') return t.riskMedium;
	return t.riskLow;
}

function riskClass(level) {
	if (level === 'high') return 'bg-rose-100 text-rose-800 border-rose-200';
	if (level === 'medium') return 'bg-amber-100 text-amber-900 border-amber-200';
	return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

function targetBadgeClass(status) {
	if (status === 'running') return 'border-sky-300 bg-sky-50 text-sky-800';
	if (status === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
	if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-800';
	if (status === 'skipped') return 'border-slate-200 bg-slate-100 text-slate-500';
	return 'border-slate-200 bg-white text-slate-600';
}

function prettyLinkLabel(key) {
	return String(key || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, c => c.toUpperCase());
}

export default function PhoneCheckPage() {
	const locale = useLocale();
	const t = COPY[locale === 'ar' ? 'ar' : 'en'];
	const isAr = locale === 'ar';
	const user = useUser();
	const canManageKeys = ['admin', 'coach', 'super_admin'].includes(user?.role);

	const [countryCode, setCountryCode] = useState('EG');
	const [phone, setPhone] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);
	const [providers, setProviders] = useState(null);
	const [categories, setCategories] = useState([]);
	const [reportOpen, setReportOpen] = useState(false);
	const [keysOpen, setKeysOpen] = useState(false);
	const [sitesOpen, setSitesOpen] = useState(false);
	const [reportCategory, setReportCategory] = useState('spam');
	const [reportComment, setReportComment] = useState('');
	const [reportBusy, setReportBusy] = useState(false);
	const [reportMsg, setReportMsg] = useState('');
	const [copied, setCopied] = useState(false);
	const [job, setJob] = useState(null);
	const [aiSummary, setAiSummary] = useState('');
	const [aiBusy, setAiBusy] = useState(false);
	const [selectedTargetId, setSelectedTargetId] = useState(null);
	const [inspectCopied, setInspectCopied] = useState(false);

	const reloadProviders = useCallback(async () => {
		try {
			const p = await phoneIntelApi.providers();
			setProviders(p);
		} catch {
			/* ignore */
		}
	}, []);

	useEffect(() => {
		const ac = new AbortController();
		Promise.all([
			phoneIntelApi.providers(ac.signal).catch(() => null),
			phoneIntelApi.categories(ac.signal).catch(() => []),
		]).then(([p, c]) => {
			setProviders(p);
			setCategories(Array.isArray(c) ? c : []);
			if (Array.isArray(c) && c[0]?.value) setReportCategory(c[0].value);
		});
		return () => ac.abort();
	}, []);

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
			source: t.keysSource,
			readOnly: t.keysReadOnly,
		}),
		[t],
	);

	const sitesCopy = useMemo(
		() => ({
			title: t.sitesTitle,
			subtitle: t.sitesSubtitle,
			loading: t.sitesLoading,
			loadError: t.sitesLoadError,
			saveError: t.sitesSaveError,
			removeConfirm: t.sitesRemoveConfirm,
			add: t.sitesAdd,
			edit: t.sitesEdit,
			save: t.sitesSave,
			enabled: t.sitesEnabled,
			disabled: t.sitesDisabled,
			needsLogin: t.sitesNeedsLogin,
			namePh: t.sitesNamePh,
			urlPh: t.sitesUrlPh,
			domainPh: t.sitesDomainPh,
			notesPh: t.sitesNotesPh,
			modeEngine: t.sitesModeEngine,
			modeUrl: t.sitesModeUrl,
			modeManual: t.sitesModeManual,
			placeholders: t.sitesPlaceholders,
			readOnly: t.sitesReadOnly,
		}),
		[t],
	);

	const selectedCountry = useMemo(
		() => COUNTRY_OPTIONS.find(c => c.code === countryCode) || COUNTRY_OPTIONS[0],
		[countryCode],
	);

	const runAiAnalyze = useCallback(
		async report => {
			if (!report) return;
			setAiBusy(true);
			try {
				const data = await phoneIntelApi.analyze(report, locale);
				setAiSummary(data.summary || '');
			} catch (err) {
				setAiSummary(err?.response?.data?.message || t.error);
			} finally {
				setAiBusy(false);
			}
		},
		[locale, t.error],
	);

	const runLookup = useCallback(
		async (refresh = false) => {
			const trimmed = phone.trim();
			if (!trimmed) return;
			setLoading(true);
			setError('');
			setReportMsg('');
			setJob(null);
			setResult(null);
			setAiSummary('');
			setSelectedTargetId(null);

			try {
				const started = await phoneIntelApi.startEnrich({
					phone: trimmed,
					countryCode,
					refresh,
				});
				setJob(started);
				if (started?.result) setResult(started.result);

				const jobId = started.jobId;
				const startedAt = Date.now();
				const maxMs = 240000;
				let finalResult = started?.result || null;
				let lastStatus = started?.status;

				while (Date.now() - startedAt < maxMs) {
					await new Promise(r => setTimeout(r, 1000));
					const next = await phoneIntelApi.getEnrichJob(jobId);
					setJob(next);
					lastStatus = next?.status;
					if (next?.result) {
						setResult(next.result);
						finalResult = next.result;
					}
					if (next.status === 'done') break;
					if (next.status === 'failed') {
						setError(next.errorMessage || t.error);
						break;
					}
				}

				if (lastStatus === 'running' || lastStatus === 'queued') {
					setError(t.searchTimedOut);
				}

				if (finalResult && lastStatus === 'done') {
					void runAiAnalyze(finalResult);
				}
			} catch (err) {
				setError(err?.response?.data?.message || t.error);
			} finally {
				setLoading(false);
			}
		},
		[phone, countryCode, t.error, t.searchTimedOut, runAiAnalyze],
	);

	const onSubmit = e => {
		e.preventDefault();
		void runLookup(false);
	};

	const copyReport = async () => {
		if (!result) return;
		const findings = result.findings || {};
		const lines = [
			`Phone Check Report`,
			`Number: ${result.phone?.international || result.phone?.e164}`,
			`Names: ${(findings.names || []).map(n => n.label).join(', ') || '—'}`,
			`Locations: ${(findings.locations || []).join(', ') || '—'}`,
			`Activities: ${(findings.activities || []).join(', ') || '—'}`,
			`Community score: ${(findings.scores || []).map(s => s.value).join(', ') || '—'}`,
			`Highlights: ${(findings.highlights || []).map(h => `${h.label}: ${h.value}`).join(' | ') || '—'}`,
			`Carrier: ${result.network?.carrier || '—'}`,
			`Risk: ${result.network?.riskLevel || '—'}`,
			`Reports: ${result.reports?.total ?? 0}`,
		];
		await navigator.clipboard.writeText(lines.join('\n'));
		setCopied(true);
		setTimeout(() => setCopied(false), 1800);
	};

	const submitReport = async () => {
		if (!result?.phone?.e164) return;
		setReportBusy(true);
		setReportMsg('');
		try {
			await phoneIntelApi.createReport({
				phone: result.phone.e164,
				countryCode,
				category: reportCategory,
				comment: reportComment,
			});
			setReportMsg(t.reportThanks);
			setReportComment('');
			setReportOpen(false);
			await runLookup(true);
		} catch (err) {
			setReportMsg(err?.response?.data?.message || t.error);
		} finally {
			setReportBusy(false);
		}
	};

	const searchTargets = useMemo(() => {
		const fromJob = job?.searchTargets || [];
		const fromResult = result?.searchTargets || [];
		const map = new Map();
		for (const item of [...fromJob, ...fromResult]) {
			if (item?.id) map.set(item.id, item);
		}
		// Seed known API badges before job targets arrive
		if (providers && map.size === 0 && loading) {
			for (const [key, on] of Object.entries({
				twilio: providers.twilio,
				abstract: providers.abstract,
				numverify: providers.numverify,
				serpapi: providers.serpapi,
				googleCse: providers.googleCse,
			})) {
				map.set(`api:${key}`, {
					id: `api:${key}`,
					labelEn: key,
					labelAr: key,
					status: on ? 'pending' : 'skipped',
					kind: 'api',
					message: on ? undefined : 'API key missing',
				});
			}
		}
		return [...map.values()];
	}, [job, result, providers, loading]);

	const selectedTarget = useMemo(
		() => searchTargets.find(t => t.id === selectedTargetId) || null,
		[searchTargets, selectedTargetId],
	);

	const selectedNames = useMemo(() => {
		const response = selectedTarget?.response;
		if (!response) return [];
		const fromList = Array.isArray(response.namesFound) ? response.namesFound : [];
		const fromCaller = response.possibleCallerName ? [response.possibleCallerName] : [];
		const fromHits = Array.isArray(response.hits)
			? response.hits.map(h => h?.possibleName).filter(Boolean)
			: [];
		const fromPages = Array.isArray(response.pages)
			? response.pages.map(p => p?.possibleName).filter(Boolean)
			: [];
		return [...new Set([...fromCaller, ...fromList, ...fromHits, ...fromPages])];
	}, [selectedTarget]);

	const copyInspectJson = async () => {
		if (!selectedTarget?.response) return;
		await navigator.clipboard.writeText(JSON.stringify(selectedTarget.response, null, 2));
		setInspectCopied(true);
		setTimeout(() => setInspectCopied(false), 1500);
	};

	const jobRunning = job?.status === 'running' || job?.status === 'queued';
	const searchActive = loading || jobRunning;

	const findings = result?.findings || {};
	const presenceItems = (result?.publicPresence || []).filter(
		p =>
			(p.confidenceScore ?? 0) >= 0.25 &&
			!String(p.title || '')
				.toLowerCase()
				.includes('manual'),
	);

	return (
		<div
			dir={isAr ? 'rtl' : 'ltr'}
			className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] bg-[radial-gradient(1200px_600px_at_10%_-10%,#dbeafe_0%,transparent_55%),radial-gradient(900px_500px_at_90%_0%,#ecfdf5_0%,transparent_50%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 sm:p-6 lg:p-8"
		>
			<div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />

			<div className="relative mx-auto max-w-5xl">
				<motion.header
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
				>
					<div>
						<div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 backdrop-blur">
							<ShieldAlert className="h-3.5 w-3.5 text-sky-600" />
							{t.brand}
						</div>
						<h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
							{t.title}
						</h1>
						<p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
							{t.subtitle}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => setSitesOpen(true)}
							className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur hover:bg-white"
						>
							<Globe2 className="h-4 w-4 text-sky-600" />
							{t.manageSites}
						</button>
						<button
							type="button"
							onClick={() => setKeysOpen(true)}
							className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur hover:bg-white"
						>
							<Settings2 className="h-4 w-4 text-sky-600" />
							{t.manageKeys}
						</button>
					</div>
				</motion.header>

				<motion.form
					onSubmit={onSubmit}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.05, duration: 0.4 }}
					className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:flex-row sm:items-stretch"
				>
					<select
						value={countryCode}
						onChange={e => setCountryCode(e.target.value)}
						className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:w-48"
					>
						{COUNTRY_OPTIONS.map(c => (
							<option key={c.code} value={c.code}>
								{c.dial} · {c.label[isAr ? 'ar' : 'en']}
							</option>
						))}
					</select>
					<div className="relative flex-1">
						<Phone className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							value={phone}
							onChange={e => setPhone(e.target.value)}
							placeholder={`${selectedCountry.dial} ${t.phonePlaceholder}`}
							className="w-full rounded-xl border border-slate-200 bg-white py-3 pe-3 ps-10 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							inputMode="tel"
							autoComplete="tel"
						/>
					</div>
					<button
						type="submit"
						disabled={loading || !phone.trim()}
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
						{loading ? t.checking : t.check}
					</button>
				</motion.form>

				{(searchActive || searchTargets.length > 0) && (
					<div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
						<div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
							<span>
								{searchActive
									? t.searchStillRunning
									: job?.status === 'failed'
										? t.error
										: t.doneSearching}
							</span>
							{job?.progressPercent != null && (
								<span className="tabular-nums text-sky-700">{job.progressPercent}%</span>
							)}
						</div>
						<p className="mb-2 text-xs text-slate-500">{t.inspectHint}</p>
						{searchActive && (
							<div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
								<div
									className="h-full rounded-full bg-sky-500 transition-all duration-500"
									style={{ width: `${Math.min(100, job?.progressPercent || 8)}%` }}
								/>
							</div>
						)}
						<div className="flex flex-wrap gap-1.5">
							{searchTargets.map(target => {
								const active = selectedTargetId === target.id;
								return (
									<button
										key={target.id}
										type="button"
										onClick={() =>
											setSelectedTargetId(prev => (prev === target.id ? null : target.id))
										}
										className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${targetBadgeClass(
											target.status,
										)} ${active ? 'ring-2 ring-sky-400 ring-offset-1' : ''}`}
										title={target.message || t.inspectSource}
									>
										{target.status === 'running' && (
											<LoaderCircle className="h-3 w-3 animate-spin" />
										)}
										{isAr ? target.labelAr || target.labelEn : target.labelEn}
									</button>
								);
							})}
						</div>

						{selectedTarget && (
							<div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
								<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
									<div className="text-sm font-bold text-slate-900">
										{t.inspectSource}:{' '}
										{isAr
											? selectedTarget.labelAr || selectedTarget.labelEn
											: selectedTarget.labelEn}
									</div>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={copyInspectJson}
											className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
										>
											{inspectCopied ? t.copied : t.inspectCopy}
										</button>
										<button
											type="button"
											onClick={() => setSelectedTargetId(null)}
											className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
										>
											{t.inspectClose}
										</button>
									</div>
								</div>
								{selectedTarget.message && (
									<p className="mb-2 text-xs text-slate-500">{selectedTarget.message}</p>
								)}
								{selectedNames.length > 0 && (
									<div className="mb-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
										<span className="font-semibold">{t.inspectNames}: </span>
										{selectedNames.join(' · ')}
									</div>
								)}
								{selectedTarget.response ? (
									<pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-100">
										{JSON.stringify(selectedTarget.response, null, 2)}
									</pre>
								) : (
									<p className="text-sm text-slate-500">{t.inspectEmpty}</p>
								)}
							</div>
						)}
					</div>
				)}

				{error && (
					<div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
						{typeof error === 'string' ? error : t.error}
					</div>
				)}
				{reportMsg && (
					<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
						{reportMsg}
					</div>
				)}

				{!result && !loading && !job && (
					<div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center text-slate-500">
						{t.empty}
					</div>
				)}

				<AnimatePresence mode="wait">
					{result && (
						<motion.div
							key={result.phone?.e164 + String(result.checkedAt)}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.35 }}
							className="space-y-4"
						>
							<section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur">
								<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
									<div>
										<div className="text-2xl font-bold text-slate-900">
											{result.phone?.international || result.phone?.e164}
										</div>
										{result.insights?.verdict && (
											<p className="mt-1 text-sm text-slate-600">{result.insights.verdict}</p>
										)}
									</div>
									<div
										className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${
											result.network?.valid
												? 'border-emerald-200 bg-emerald-50 text-emerald-800'
												: 'border-rose-200 bg-rose-50 text-rose-800'
										}`}
									>
										{result.network?.valid ? (
											<CheckCircle2 className="h-4 w-4" />
										) : (
											<XCircle className="h-4 w-4" />
										)}
										{result.network?.valid ? t.valid : t.invalid}
									</div>
								</div>

								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									<Stat icon={UserRound} label={t.publicName} value={
										result.identity?.possiblePublicName?.label ||
										findings.names?.[0]?.label ||
										t.noPublicName
									} />
									<Stat icon={MapPin} label={t.locations} value={(findings.locations || []).slice(0, 3).join(', ') || t.na} />
									<Stat icon={Activity} label={t.activities} value={(findings.activities || []).slice(0, 3).join(', ') || t.na} />
									<Stat
										icon={AlertTriangle}
										label={t.communityScore}
										value={
											findings.scores?.[0]?.value ||
											result.network?.communityScore ||
											t.na
										}
									/>
									<Stat icon={Globe2} label={t.country} value={result.network?.country || t.na} />
									<Stat icon={Signal} label={t.carrier} value={result.network?.carrier || t.na} />
									<div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
										<div className="mb-1 text-xs font-medium text-slate-500">{t.risk}</div>
										<span
											className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-semibold ${riskClass(
												result.network?.riskLevel,
											)}`}
										>
											{riskLabel(result.network?.riskLevel, t)}
											{result.network?.riskScore != null
												? ` · ${Math.round(result.network.riskScore)}`
												: ''}
										</span>
									</div>
									<Stat icon={Building2} label={t.lineType} value={result.network?.lineType || t.na} />
									<Stat icon={Flag} label={t.reports} value={String(result.reports?.total ?? 0)} />
								</div>
								<p className="mt-2 text-xs text-slate-500">{t.nameSourcesNote}</p>

								{(findings.highlights?.length > 0 ||
									findings.names?.length > 0 ||
									findings.locations?.length > 0 ||
									findings.scores?.length > 0 ||
									findings.activities?.length > 0) && (
									<div className="mt-4 space-y-3">
										<div className="text-sm font-bold text-slate-900">{t.highlights}</div>
										<div className="grid gap-2 sm:grid-cols-2">
											{(findings.highlights?.length
												? findings.highlights
												: [
														...(findings.names || []).map(n => ({
															kind: 'name',
															label: t.names,
															value: n.label,
															source: n.source || 'public',
															sourceUrl: n.sourceUrl,
														})),
														...(findings.locations || []).slice(0, 3).map(loc => ({
															kind: 'location',
															label: t.locations,
															value: loc,
															source: 'public',
														})),
														...(findings.scores || []).map(s => ({
															kind: 'score',
															label: t.communityScore,
															value: s.value,
															source: 'public',
															sourceUrl: s.sourceUrl,
														})),
														...(findings.activities || []).slice(0, 3).map(act => ({
															kind: 'activity',
															label: t.activities,
															value: act,
															source: 'public',
														})),
													]
											).map((h, idx) => (
												<div
													key={`${h.kind}-${h.value}-${idx}`}
													className="rounded-xl border border-sky-100 bg-sky-50/60 p-3"
												>
													<div className="text-[11px] font-semibold uppercase tracking-wide text-sky-800/80">
														{h.label || h.kind}
													</div>
													<div className="mt-1 text-sm font-semibold text-slate-900">
														{h.value}
													</div>
													<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
														<span>
															{t.fromSource}: {h.source || 'public'}
														</span>
														{h.sourceUrl && (
															<a
																href={h.sourceUrl}
																target="_blank"
																rel="noreferrer"
																className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
															>
																<ExternalLink className="h-3 w-3" />
																open
															</a>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								<div className="mt-4 flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => setReportOpen(true)}
										className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
									>
										<MessageSquarePlus className="h-4 w-4" />
										{t.addComment}
									</button>
									<button
										type="button"
										onClick={copyReport}
										className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
									>
										{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
										{copied ? t.copied : t.copyReport}
									</button>
									<button
										type="button"
										onClick={() => runLookup(true)}
										className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
									>
										<RefreshCw className="h-4 w-4" />
										{t.refresh}
									</button>
									{result.externalManualSearch?.truecaller && (
										<a
											href={result.externalManualSearch.truecaller}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
										>
											<ExternalLink className="h-4 w-4" />
											{t.truecaller}
										</a>
									)}
								</div>
							</section>

							<section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
								<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
									<div>
										<h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
											<Sparkles className="h-5 w-5 text-emerald-600" />
											{t.aiTitle}
										</h2>
										<p className="mt-1 text-xs text-slate-600">{t.aiHint}</p>
									</div>
									<button
										type="button"
										disabled={aiBusy}
										onClick={() => runAiAnalyze(result)}
										className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
									>
										{aiBusy ? (
											<LoaderCircle className="h-4 w-4 animate-spin" />
										) : (
											<Sparkles className="h-4 w-4" />
										)}
										{aiBusy ? t.aiRunning : t.aiRun}
									</button>
								</div>
								{aiSummary ? (
									<div className="rounded-xl border border-emerald-100 bg-white p-4">
										<MarkdownMessage content={aiSummary} />
									</div>
								) : aiBusy ? (
									<p className="text-sm text-slate-500">{t.aiRunning}</p>
								) : (
									<p className="text-sm text-slate-500">{t.autoAi}</p>
								)}
							</section>

							<section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
								<h2 className="mb-3 text-lg font-bold text-slate-900">{t.publicPresence}</h2>
								{!presenceItems.length ? (
									<p className="text-sm text-slate-500">{t.noPresence}</p>
								) : (
									<ul className="space-y-3">
										{presenceItems.slice(0, 16).map((item, idx) => (
											<li
												key={item.id || item.sourceUrl || idx}
												className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
											>
												<a
													href={item.sourceUrl}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-start gap-2 font-semibold text-sky-700 hover:underline"
												>
													<ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
													<span>{item.title}</span>
												</a>
												{item.possibleName && (
													<div className="mt-1 text-xs font-semibold text-slate-700">
														{t.publicName}: {item.possibleName}
													</div>
												)}
												{item.snippet && (
													<p className="mt-1 text-sm leading-relaxed text-slate-600">
														{item.snippet}
													</p>
												)}
											</li>
										))}
									</ul>
								)}
							</section>

							<section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
								<h2 className="mb-1 text-lg font-bold text-slate-900">{t.usefulLinks}</h2>
								<p className="mb-3 text-xs text-slate-500">{t.usefulLinksHint}</p>
								{Object.keys(result.externalManualSearch || {}).length === 0 ? (
									<p className="text-sm text-slate-500">{t.noPresence}</p>
								) : (
									<div className="flex flex-wrap gap-2">
										{Object.entries(result.externalManualSearch || {}).map(([key, url]) => (
											<a
												key={key}
												href={url}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-white"
											>
												<ExternalLink className="h-3.5 w-3.5" />
												{prettyLinkLabel(key)}
											</a>
										))}
									</div>
								)}
							</section>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<PhoneKeysModal
				open={keysOpen}
				onClose={() => setKeysOpen(false)}
				isAr={isAr}
				canManage={canManageKeys}
				copy={keysCopy}
				onSaved={() => {
					void reloadProviders();
				}}
			/>

			<PhoneSitesModal
				open={sitesOpen}
				onClose={() => setSitesOpen(false)}
				isAr={isAr}
				canManage={canManageKeys}
				copy={sitesCopy}
			/>

			<AnimatePresence>
				{reportOpen && (
					<motion.div
						className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setReportOpen(false)}
					>
						<motion.div
							initial={{ y: 24, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							exit={{ y: 16, opacity: 0 }}
							onClick={e => e.stopPropagation()}
							className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
						>
							<h3 className="text-lg font-bold text-slate-900">{t.report}</h3>
							<label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
								{t.category}
							</label>
							<select
								value={reportCategory}
								onChange={e => setReportCategory(e.target.value)}
								className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
							>
								{categories.map(c => (
									<option key={c.value} value={c.value}>
										{isAr ? c.labelAr : c.labelEn}
									</option>
								))}
							</select>
							<label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
								{t.addComment}
							</label>
							<textarea
								value={reportComment}
								onChange={e => setReportComment(e.target.value)}
								rows={3}
								placeholder={t.commentPlaceholder}
								className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
							/>
							<div className="mt-4 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setReportOpen(false)}
									className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
								>
									Cancel
								</button>
								<button
									type="button"
									disabled={reportBusy}
									onClick={submitReport}
									className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
								>
									{reportBusy ? '…' : t.submitReport}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function Stat({ icon: Icon, label, value }) {
	return (
		<div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
			<div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
				<Icon className="h-3.5 w-3.5" />
				{label}
			</div>
			<div className="line-clamp-2 text-sm font-semibold text-slate-900">{value}</div>
		</div>
	);
}
