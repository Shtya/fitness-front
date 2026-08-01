'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
	ArrowLeft,
	BookOpen,
	Check,
	CheckCheck,
	Copy,
	Eye,
	FileText,
	Image as ImageIcon,
	Link2,
	LoaderCircle,
	MessageCircle,
	Mic,
	MoreHorizontal,
	Paperclip,
	Pause,
	Pencil,
	Phone,
	Play,
	Plus,
	Radar,
	RefreshCw,
	Search,
	Send,
	Settings2,
	ShieldCheck,
	LayoutTemplate,
	Trash2,
	Video,
	X,
	Zap,
	ChartColumn,
	Languages,
} from 'lucide-react';
import { metaWhatsAppApi } from './meta-whatsapp-api';

const WA = {
	/* WhatsApp Desktop (macOS) design tokens from product mock */
	shell: '#FFFFFF',
	rail: '#F1F1F1',
	panel: '#FFFFFF',
	header: '#F1F1F1',
	chatBg: '#F0E9DF',
	chatPattern: 'url(/bg-whatsapp.svg)',
	border: '#DCDCDC',
	separator: '#DEDEDE',
	rowBorder: 'transparent',
	input: '#FFFFFF',
	search: '#FFFFFF',
	searchBorder: '#E5E5E5',
	composeBar: '#F1F1F1',
	composeBorder: '#CDCDCD',
	text: '#272727',
	muted: '#808080',
	icon: '#666666',
	green: '#24D366',
	greenSoft: 'rgba(36, 211, 102, 0.16)',
	greenText: '#1FA755',
	updates: '#05A884',
	bubbleOut: '#E1FFD4',
	bubbleIn: '#FFFFFF',
	dateChip: '#F7F7F6',
	dateText: '#494950',
	chip: '#F7F7F6',
	chipMeta: 'rgba(36, 211, 102, 0.12)',
	warn: '#808080',
	metaNote: '#1FA755',
	tick: '#53BDEB',
	selected: 'rgba(0, 0, 0, 0.06)',
	overlay: 'rgba(0, 0, 0, 0.35)',
	field: '#F1F1F1',
	radius: 10,
	shadow:
		'0 0 0 1px rgba(255,255,255,0.20) inset, 0 0 0 0.5px rgba(0,0,0,0.20), 0 20px 50px rgba(0,0,0,0.60)',
	font: '"SF Pro Text", "Segoe UI", system-ui, -apple-system, sans-serif',
};

const chatWallpaperStyle = {
	backgroundColor: WA.chatBg,
	backgroundImage: WA.chatPattern,
	backgroundRepeat: 'repeat',
	backgroundSize: '360px auto',
	backgroundPosition: 'center top',
};

const COPY = {
	en: {
		chats: 'Chats',
		search: 'Search name or phone',
		all: 'All',
		unread: 'Unread',
		leads: 'Leads',
		settings: 'Meta config',
		activity: 'Activity',
		usageBilling: 'Usage & Billing',
		usageBillingTitle: 'WhatsApp Usage & Billing',
		usageBillingHint:
			'Live consumption from your DB + Meta Analytics. Estimated cost is not the final Meta invoice.',
		usageRefresh: 'Refresh',
		usageSent: 'Sent',
		usageDelivered: 'Delivered',
		usageRead: 'Read',
		usageFailed: 'Failed',
		usageEstimated: 'Estimated cost (this month)',
		usageVsPrev: 'vs previous month',
		usageByCategory: 'By category',
		usageByCountry: 'By country',
		usageDaily: 'Daily volume & cost',
		usageTemplates: 'Templates',
		usageDisclaimer:
			'Estimated Meta cost — final amount may differ from the Meta invoice.',
		usageInvoiceNote: 'WhatsApp Manager → Billing is the source of truth for the amount due.',
		usageEmpty: 'No outbound messages this month yet.',
		usageLoadError: 'Could not load usage & billing',
		usageMetaCost: 'Meta pricing analytics cost',
		usageSources: 'Data sources',
		usageFxRate: 'FX rate',
		usageThisMonth: 'This month',
		usageBillable: 'Billable delivered',
		usageInbound: 'Inbound',
		usageCostUsd: 'USD',
		usageCostEgp: 'EGP',
		usageCountryRates: 'Template rates by country',
		usageSelectCountry: 'Country',
		usagePerMessage: 'Per delivered template message',
		usageRateMarketing: 'Marketing',
		usageRateUtility: 'Utility',
		usageRateAuth: 'Authentication',
		usageRateService: 'Service',
		usageRatePerMsg: '1 msg',
		usageRatePer100: '100 templates',
		usageByCategoryHint: 'Delivered billable messages this month, grouped by template type. Bar = share of total.',
		usageCatMsgs: 'msgs',
		usageCatCost: 'est. cost',
		usageTplType: 'Type',
		usageTplCost: 'Cost',
		backLeads: 'Lead Scout',
		refresh: 'Refresh inbox',
		sync: 'Sync from DB',
		syncHint:
			'Meta Cloud API cannot import WhatsApp history from before the webhook. Sync reloads messages stored in this system for this number.',
		closeChat: 'Close chat',
		openPhone: 'Open by phone',
		phonePlaceholder: 'e.g. 2010xxxxxxx or +20 10…',
		phoneHint: 'Include country code. Egypt local 01… is converted to 20…',
		phoneRequired: 'Phone number is required',
		phoneInvalid: 'Invalid phone. Use country code (10–15 digits), e.g. 2010xxxxxxx',
		phoneNormalized: 'Will send to',
		displayNameOptional: 'Display name (optional)',
		cancel: 'Cancel',
		noConversations: 'No conversations yet',
		noConversationsHint: 'Open a lead, open by phone, or wait for an inbound webhook message.',
		emptyChat: 'Select a chat to start messaging',
		businessAccount: 'Business account',
		encryption: 'Messages sent via Meta WhatsApp Cloud API.',
		metaNote:
			'Free-form text/media only within the 24h customer-care window. Outside it, use an approved template.',
		windowOpen: '24h window open',
		windowClosed: 'Template required',
		typeMessage: 'Type a message',
		fastReplies: 'Fast replies',
		fastRepliesHint: 'Saved snippets — click to insert into the message box',
		fastReplySave: 'Save reply',
		fastReplyTitle: 'Title',
		fastReplyBody: 'Reply text',
		fastReplyAdd: 'Add new reply',
		fastReplyDelete: 'Delete',
		fastReplySaved: 'Fast reply saved',
		fastReplyDeleted: 'Fast reply deleted',
		fastReplyEmpty: 'No saved replies yet',
		openPhoneFromChat: 'Opening chat…',
		translate: 'Translate',
		translateToEn: 'Translate to English',
		translateToAr: 'Translate to Arabic',
		translateHide: 'Hide translation',
		translateFailed: 'Translation failed',
		translatedLabel: 'Translation',
		unsupportedMessage: 'This message type isn’t supported here',
		stickerUnavailable: 'Sticker unavailable',
		mediaUnavailable: 'Media unavailable',
		templateName: 'Template name',
		templateLang: 'Language',
		sendTemplate: 'Send template',
		templates: 'Templates',
		templatesHint: 'Approved Meta templates only can be sent. New templates need Meta review.',
		createTemplate: 'Create template',
		addNewTemplate: 'Add new',
		seedTemplates: 'So7ba outreach seeds',
		seedTemplatesHint: 'Preview So7baFit presentation templates, then submit to Meta for review.',
		seedSubmitSelected: 'Submit selected to Meta',
		seedSubmitAll: 'Submit all to Meta',
		seedLoad: 'Load seed preview',
		seedSubmitted: 'Seed templates submitted to Meta',
		cloneAsUtility: 'Clone outreach as UTILITY',
		cloneAsUtilityHint:
			'Creates so7ba_fitness_util_ar / so7ba_fitness_util_en from the existing MARKETING outreach templates and submits them to Meta.',
		cloneAsUtilityOk: 'UTILITY clones submitted to Meta',
		backToTemplates: 'Back to templates',
		templateBody: 'Body text',
		templateHeader: 'Header (optional)',
		templateFooter: 'Footer (optional)',
		templateCategory: 'Category',
		templateVarsTitle: 'Fill template variables',
		templateNoVars: 'No variables — send as-is',
		templatePick: 'Choose a template',
		templateApprovedOnly: 'Only APPROVED templates can be sent',
		templateCreateOk: 'Template submitted to Meta for review',
		templateEditOk: 'Template update submitted to Meta for review',
		editTemplate: 'Edit template',
		saveTemplate: 'Save changes',
		templateEditLocked: 'Name and language cannot be changed after create',
		templateCategoryLocked: 'Category cannot be changed after Meta approval',
		templateCannotEdit: 'Only APPROVED, REJECTED, or PAUSED templates can be edited',
		keepExistingSample: 'Keeping current media sample — upload to replace',
		templateLoadError: 'Could not load templates from Meta',
		templateVarRequired: 'Fill all template variables',
		templateUrlParamInvalid:
			'URL button value is invalid. Use only Latin letters, numbers, and URL-safe characters (e.g. demo or user/123) — no spaces or Arabic text.',
		templateUrlParamHint:
			'This fills the end of the button link. Example: demo or account/abc123 — not a full URL, and not Arabic/emoji.',
		templateUrlParamPlaceholder: 'e.g. demo or user/123',
		refreshTemplates: 'Refresh templates',
		templatePreview: 'Message preview',
		templateMetaDetails: 'Meta requirements',
		templateNameRequired: 'Template name is required',
		templateNameInvalid: 'Use lowercase letters, numbers, underscores only (min 3). Example: hello_world',
		templateLangRequired: 'Language is required',
		templateLangInvalid: 'Use a Meta language code like en_US or ar',
		templateBodyRequired: 'Body text is required',
		templateBodyTooLong: 'Body max 1024 characters',
		templateHeaderTooLong: 'Header max 60 characters',
		templateFooterTooLong: 'Footer max 60 characters',
		templateVarsSequential: 'Variables must be sequential: {{1}}, {{2}}, {{3}}…',
		templateVarsMustBeNumbered:
			'Variables must be numbered like {{1}}, {{2}} — not {{name}} or {{user}}',
		templateEmptyList: 'No templates yet. Create one or refresh from Meta.',
		templateHeaderType: 'Header type',
		headerNone: 'None',
		headerText: 'Text',
		headerImage: 'Image',
		headerVideo: 'Video',
		headerDocument: 'Document',
		headerSampleRequired: 'Upload a sample file for this header type',
		headerSampleHint: 'Meta requires a sample media file for review (JPEG/PNG, MP4, or PDF)',
		uploadSample: 'Upload sample',
		changeSample: 'Change sample',
		templateButtons: 'Buttons (optional)',
		addButton: 'Add button',
		buttonType: 'Type',
		buttonText: 'Button text',
		buttonUrl: 'URL',
		buttonPhone: 'Phone number',
		buttonQuickReply: 'Quick reply',
		buttonUrlType: 'Visit website',
		buttonPhoneType: 'Call phone',
		buttonTextRequired: 'Button text is required (max 25 chars)',
		buttonUrlRequired: 'URL is required for website buttons',
		buttonPhoneRequired: 'Phone number is required for call buttons',
		buttonMax: 'Maximum 10 buttons',
		insertVar: 'Insert {{n}}',
		errorDismiss: 'Dismiss',
		metaErrorTitle: 'Meta API error',
		metaInvalidParamHint:
			'Common causes: use {{1}}/{{2}} (not {{name}}); URL buttons need https://; URL button variables must be Latin/URL-safe (not Arabic); footer cannot have variables; TEXT header allows only one {{1}}.',
		helloWorldTestOnlyHint:
			'hello_world only works from Meta Public Test Numbers. On a live business number, send your own APPROVED template for verification instead.',
		metaLibrary: 'Meta library',
		metaLibraryHint: 'Browse Meta ready-made templates, add one to your account, then verify by sending.',
		metaLibrarySearch: 'Search templates…',
		metaLibraryEmpty: 'No library templates found. Try another search.',
		metaLibraryLoadError: 'Could not load Meta template library',
		addFromLibrary: 'Add to my templates',
		verifySend: 'Verify & send',
		verifySendTitle: 'Send verification template',
		verifySendHint:
			'Like Meta API Setup: pick a recipient phone and send the template to verify delivery.',
		verifySendOk: 'Verification template sent',
		libraryAdded: 'Library template submitted to Meta for review',
		verificationTemplates: 'Verification / sample',
		templateColName: 'Name',
		templateColLanguage: 'Language',
		templateColCategory: 'Category',
		templateColStatus: 'Status',
		templateColHeader: 'Header',
		templateColActions: 'Actions',
		templateShow: 'Show',
		templateUse: 'Use',
		templateEdit: 'Edit',
		templateDelete: 'Delete',
		templateCopyName: 'Copy name',
		templateCopied: 'Template name copied',
		templateDeleteConfirm: 'Delete this template from Meta? This cannot be undone.',
		templateDeleted: 'Template deleted from Meta',
		templatePreviewTitle: 'Template preview',
		recording: 'Recording',
		recordingHint: 'Tap send when done · trash to cancel',
		recordingCancel: 'Cancel',
		recordingSend: 'Send voice',
		configTitle: 'Meta WhatsApp configuration',
		configSubtitle: 'Connect Cloud API credentials. Copy webhook + verify token into Meta Developer Console.',
		accessToken: 'Permanent Access Token',
		accessTokenHint:
			'System User permanent token for THIS app, with the So7bahfit WABA assigned. Needs whatsapp_business_management + whatsapp_business_messaging.',
		phoneNumberId: 'Phone Number ID',
		wabaId: 'WABA ID',
		wabaHint:
			'WhatsApp Business Account ID from Meta → WhatsApp → API Setup. Not the same as Phone Number ID.',
		verifyToken: 'Verify Token',
		appSecret: 'App Secret',
		webhook: 'Webhook callback URL',
		webhookHint: 'Meta Developer → WhatsApp → Configuration. Subscribe to messages.',
		copy: 'Copy',
		copied: 'Copied',
		generateToken: 'Generate',
		leaveBlank: 'Leave blank to keep saved secret',
		savedSecret: 'Saved — leave blank to keep, or paste a new value',
		requiredMark: 'Required',
		missingRequired: 'Fill and save all required fields first',
		save: 'Save',
		validate: 'Verify connection',
		toggleOn: 'Enable',
		toggleOff: 'Disable',
		enabled: 'Enabled',
		disabled: 'Disabled',
		connected: 'Connected',
		disconnected: 'Disconnected',
		error: 'Error',
		saveOk: 'Saved — values kept in the form',
		validateOk: 'Verified',
		loadError: 'Could not load',
		sendError: 'Send failed',
		variables: 'Connection variables',
		graphVersion: 'Graph API version',
		displayPhone: 'Display phone',
		open: 'Open',
	},
	ar: {
		chats: 'المحادثات',
		search: 'بحث بالاسم أو الرقم',
		all: 'الكل',
		unread: 'غير مقروء',
		leads: 'عملاء',
		settings: 'إعدادات ميتا',
		activity: 'السجل',
		usageBilling: 'الاستهلاك والفوترة',
		usageBillingTitle: 'استهلاك وفوترة واتساب',
		usageBillingHint:
			'استهلاك حي من قاعدة البيانات + تحليلات ميتا. التكلفة تقديرية وليست الفاتورة النهائية.',
		usageRefresh: 'تحديث',
		usageSent: 'مُرسل',
		usageDelivered: 'واصل',
		usageRead: 'مقروء',
		usageFailed: 'فشل',
		usageEstimated: 'تكلفة تقديرية (هذا الشهر)',
		usageVsPrev: 'مقارنة بالشهر السابق',
		usageByCategory: 'حسب التصنيف',
		usageByCountry: 'حسب الدولة',
		usageDaily: 'يومي: عدد الرسائل والتكلفة',
		usageTemplates: 'القوالب',
		usageDisclaimer: 'تكلفة ميتا تقديرية — المبلغ النهائي قد يختلف عن فاتورة ميتا.',
		usageInvoiceNote: 'WhatsApp Manager ← Billing هو المرجع المالي النهائي.',
		usageEmpty: 'لا توجد رسائل صادرة هذا الشهر بعد.',
		usageLoadError: 'تعذر تحميل الاستهلاك والفوترة',
		usageMetaCost: 'تكلفة تحليلات التسعير من ميتا',
		usageSources: 'مصادر البيانات',
		usageFxRate: 'سعر التحويل',
		usageThisMonth: 'هذا الشهر',
		usageBillable: 'مفوتر (واصل)',
		usageInbound: 'وارد',
		usageCostUsd: 'دولار',
		usageCostEgp: 'جنيه',
		usageCountryRates: 'أسعار القوالب حسب الدولة',
		usageSelectCountry: 'الدولة',
		usagePerMessage: 'لكل رسالة قالب واصلة',
		usageRateMarketing: 'تسويق',
		usageRateUtility: 'خدمي',
		usageRateAuth: 'مصادقة',
		usageRateService: 'خدمة',
		usageRatePerMsg: 'رسالة واحدة',
		usageRatePer100: '100 قالب',
		usageByCategoryHint: 'رسائل واصلة مفوترة هذا الشهر حسب نوع القالب. الشريط = نسبة من الإجمالي.',
		usageCatMsgs: 'رسالة',
		usageCatCost: 'تكلفة تقديرية',
		usageTplType: 'النوع',
		usageTplCost: 'التكلفة',
		backLeads: 'كشّاف العملاء',
		refresh: 'تحديث الوارد',
		sync: 'مزامنة من النظام',
		syncHint:
			'Meta Cloud API لا تستورد سجل واتساب قبل ربط الـ Webhook. المزامنة تجلب الرسائل المحفوظة في النظام لهذا الرقم.',
		closeChat: 'إغلاق المحادثة',
		openPhone: 'فتح برقم',
		phonePlaceholder: 'مثال: 2010xxxxxxx أو +20 10…',
		phoneHint: 'أدخل الرقم مع كود الدولة. الرقم المحلي المصري 01… يتحول تلقائيًا إلى 20…',
		phoneRequired: 'رقم الهاتف مطلوب',
		phoneInvalid: 'رقم غير صالح. استخدم كود الدولة (10–15 رقم)، مثل 2010xxxxxxx',
		phoneNormalized: 'سيتم الإرسال إلى',
		displayNameOptional: 'اسم العرض (اختياري)',
		cancel: 'إلغاء',
		noConversations: 'لا محادثات بعد',
		noConversationsHint: 'افتح عميلاً أو رقماً، أو انتظر رسالة واردة عبر الـ Webhook.',
		emptyChat: 'اختر محادثة للبدء',
		businessAccount: 'حساب أعمال',
		encryption: 'الرسائل عبر Meta WhatsApp Cloud API.',
		metaNote: 'النص والوسائط الحرة فقط خلال نافذة 24 ساعة. خارجها استخدم قالباً معتمداً.',
		windowOpen: 'نافذة 24 ساعة مفتوحة',
		windowClosed: 'يلزم قالب',
		typeMessage: 'اكتب رسالة',
		fastReplies: 'ردود سريعة',
		fastRepliesHint: 'مقاطع محفوظة — اضغط لإدراجها في خانة الرسالة',
		fastReplySave: 'حفظ الرد',
		fastReplyTitle: 'العنوان',
		fastReplyBody: 'نص الرد',
		fastReplyAdd: 'إضافة رد جديد',
		fastReplyDelete: 'حذف',
		fastReplySaved: 'تم حفظ الرد السريع',
		fastReplyDeleted: 'تم حذف الرد السريع',
		fastReplyEmpty: 'لا توجد ردود محفوظة بعد',
		openPhoneFromChat: 'فتح المحادثة…',
		translate: 'ترجمة',
		translateToEn: 'ترجمة إلى الإنجليزية',
		translateToAr: 'ترجمة إلى العربية',
		translateHide: 'إخفاء الترجمة',
		translateFailed: 'فشلت الترجمة',
		translatedLabel: 'الترجمة',
		unsupportedMessage: 'نوع الرسالة ده غير مدعوم هنا',
		stickerUnavailable: 'الستيكر غير متاح',
		mediaUnavailable: 'الوسائط غير متاحة',
		templateName: 'اسم القالب',
		templateLang: 'اللغة',
		sendTemplate: 'إرسال قالب',
		templates: 'القوالب',
		templatesHint: 'يُرسل فقط القوالب المعتمدة من ميتا. القوالب الجديدة تحتاج مراجعة ميتا.',
		createTemplate: 'إنشاء قالب',
		addNewTemplate: 'إضافة جديد',
		seedTemplates: 'قوالب تواصل So7ba',
		seedTemplatesHint: 'معاينة قوالب عرض So7baFit ثم إرسالها لمراجعة ميتا.',
		seedSubmitSelected: 'إرسال المحدد إلى ميتا',
		seedSubmitAll: 'إرسال الكل إلى ميتا',
		seedLoad: 'تحميل معاينة القوالب',
		seedSubmitted: 'تم إرسال القوالب إلى ميتا',
		cloneAsUtility: 'استنساخ Outreach كـ UTILITY',
		cloneAsUtilityHint:
			'ينشئ so7ba_fitness_util_ar / so7ba_fitness_util_en من قوالب Outreach الحالية (MARKETING) ويرسلها لميتا.',
		cloneAsUtilityOk: 'تم إرسال نسخ UTILITY إلى ميتا',
		backToTemplates: 'العودة للقوالب',
		templateBody: 'نص الجسم',
		templateHeader: 'العنوان (اختياري)',
		templateFooter: 'التذييل (اختياري)',
		templateCategory: 'التصنيف',
		templateVarsTitle: 'املأ متغيرات القالب',
		templateNoVars: 'بدون متغيرات — إرسال مباشر',
		templatePick: 'اختر قالبًا',
		templateApprovedOnly: 'يُرسل فقط القوالب بحالة APPROVED',
		templateCreateOk: 'تم إرسال القالب لمراجعة ميتا',
		templateEditOk: 'تم إرسال تعديل القالب لمراجعة ميتا',
		editTemplate: 'تعديل القالب',
		saveTemplate: 'حفظ التعديلات',
		templateEditLocked: 'لا يمكن تغيير الاسم واللغة بعد الإنشاء',
		templateCategoryLocked: 'لا يمكن تغيير التصنيف بعد موافقة ميتا',
		templateCannotEdit: 'يُعدَّل فقط القوالب بحالة APPROVED أو REJECTED أو PAUSED',
		keepExistingSample: 'الإبقاء على عينة الوسائط الحالية — ارفع ملفًا للاستبدال',
		templateLoadError: 'تعذر تحميل القوالب من ميتا',
		templateVarRequired: 'املأ كل متغيرات القالب',
		templateUrlParamInvalid:
			'قيمة زر الرابط غير صالحة. استخدم حروف إنجليزية وأرقام ورموز الرابط فقط (مثل demo أو user/123) — بدون مسافات أو نص عربي.',
		templateUrlParamHint:
			'هذه القيمة تُكمل نهاية رابط الزر. مثال: demo أو account/abc123 — ليست رابطًا كاملًا، وليست عربي أو إيموجي.',
		templateUrlParamPlaceholder: 'مثال: demo أو user/123',
		refreshTemplates: 'تحديث القوالب',
		templatePreview: 'معاينة الرسالة',
		templateMetaDetails: 'متطلبات ميتا',
		templateNameRequired: 'اسم القالب مطلوب',
		templateNameInvalid: 'استخدم حروف إنجليزية صغيرة وأرقام و _ فقط (٣ على الأقل). مثال: hello_world',
		templateLangRequired: 'اللغة مطلوبة',
		templateLangInvalid: 'استخدم كود لغة ميتا مثل en_US أو ar',
		templateBodyRequired: 'نص الجسم مطلوب',
		templateBodyTooLong: 'الحد الأقصى للجسم 1024 حرفًا',
		templateHeaderTooLong: 'الحد الأقصى للعنوان 60 حرفًا',
		templateFooterTooLong: 'الحد الأقصى للتذييل 60 حرفًا',
		templateVarsSequential: 'يجب أن تكون المتغيرات متسلسلة: {{1}} ثم {{2}} ثم {{3}}…',
		templateVarsMustBeNumbered:
			'المتغيرات يجب أن تكون أرقامًا مثل {{1}} و {{2}} — وليس {{name}} أو {{user}}',
		templateEmptyList: 'لا قوالب بعد. أنشئ قالبًا أو حدّث من ميتا.',
		templateHeaderType: 'نوع العنوان',
		headerNone: 'بدون',
		headerText: 'نص',
		headerImage: 'صورة',
		headerVideo: 'فيديو',
		headerDocument: 'مستند',
		headerSampleRequired: 'ارفع ملفًا نموذجيًا لهذا النوع من العنوان',
		headerSampleHint: 'ميتا تتطلب ملف وسائط نموذجي للمراجعة (JPEG/PNG أو MP4 أو PDF)',
		uploadSample: 'رفع نموذج',
		changeSample: 'تغيير النموذج',
		templateButtons: 'الأزرار (اختياري)',
		addButton: 'إضافة زر',
		buttonType: 'النوع',
		buttonText: 'نص الزر',
		buttonUrl: 'الرابط',
		buttonPhone: 'رقم الهاتف',
		buttonQuickReply: 'رد سريع',
		buttonUrlType: 'زيارة موقع',
		buttonPhoneType: 'اتصال',
		buttonTextRequired: 'نص الزر مطلوب (حد أقصى 25 حرفًا)',
		buttonUrlRequired: 'الرابط مطلوب لأزرار الموقع',
		buttonPhoneRequired: 'رقم الهاتف مطلوب لأزرار الاتصال',
		buttonMax: 'الحد الأقصى 10 أزرار',
		insertVar: 'إدراج {{n}}',
		errorDismiss: 'إغلاق',
		metaErrorTitle: 'خطأ من واجهة ميتا',
		metaInvalidParamHint:
			'الأسباب الشائعة: استخدم {{1}} و {{2}} (وليس {{name}})؛ أزرار الرابط يجب أن تبدأ بـ https://؛ متغير زر الرابط يجب أن يكون إنجليزي/آمن للرابط (وليس عربي)؛ التذييل بدون متغيرات؛ عنوان TEXT يسمح بـ {{1}} فقط.',
		helloWorldTestOnlyHint:
			'قالب hello_world يعمل فقط من أرقام الاختبار العامة في ميتا. على رقم الأعمال الحقيقي استخدم قالب APPROVED خاص بك للتحقق.',
		metaLibrary: 'مكتبة ميتا',
		metaLibraryHint: 'تصفح قوالب ميتا الجاهزة، أضفها لحسابك، ثم أرسل رسالة تحقق لتبدأ استخدامها.',
		metaLibrarySearch: 'ابحث عن قالب…',
		metaLibraryEmpty: 'لا قوالب في المكتبة. جرّب بحثًا آخر.',
		metaLibraryLoadError: 'تعذر تحميل مكتبة قوالب ميتا',
		addFromLibrary: 'أضف لقوالبي',
		verifySend: 'تحقق وأرسل',
		verifySendTitle: 'إرسال قالب للتحقق',
		verifySendHint:
			'مثل إعدادات ميتا: اختر رقم المستلم وأرسل القالب للتحقق من التسليم.',
		verifySendOk: 'تم إرسال قالب التحقق',
		libraryAdded: 'تم إرسال قالب المكتبة لمراجعة ميتا',
		verificationTemplates: 'التحقق / نماذج',
		templateColName: 'الاسم',
		templateColLanguage: 'اللغة',
		templateColCategory: 'التصنيف',
		templateColStatus: 'الحالة',
		templateColHeader: 'العنوان',
		templateColActions: 'إجراءات',
		templateShow: 'عرض',
		templateUse: 'استخدام',
		templateEdit: 'تعديل',
		templateDelete: 'حذف',
		templateCopyName: 'نسخ الاسم',
		templateCopied: 'تم نسخ اسم القالب',
		templateDeleteConfirm: 'حذف هذا القالب من ميتا؟ لا يمكن التراجع.',
		templateDeleted: 'تم حذف القالب من ميتا',
		templatePreviewTitle: 'معاينة القالب',
		recording: 'جاري التسجيل',
		recordingHint: 'اضغط إرسال عند الانتهاء · سلة للإلغاء',
		recordingCancel: 'إلغاء',
		recordingSend: 'إرسال الصوت',
		configTitle: 'إعدادات ميتا واتساب',
		configSubtitle: 'اربط بيانات Cloud API. انسخ الـ Webhook ورمز التحقق إلى Meta Developer.',
		accessToken: 'رمز الوصول الدائم',
		accessTokenHint:
			'رمز دائم من System User لهذا التطبيق، مع تعيين WABA So7bahfit. يحتاج صلاحيات whatsapp_business_management و whatsapp_business_messaging.',
		phoneNumberId: 'معرّف رقم الهاتف',
		wabaId: 'معرّف WABA',
		wabaHint:
			'معرّف حساب واتساب للأعمال من Meta ← WhatsApp ← API Setup. ليس نفس معرّف رقم الهاتف.',
		verifyToken: 'رمز التحقق',
		appSecret: 'سر التطبيق',
		webhook: 'رابط الـ Webhook',
		webhookHint: 'Meta Developer ← WhatsApp ← Configuration. اشترك في messages.',
		copy: 'نسخ',
		copied: 'تم النسخ',
		generateToken: 'توليد',
		leaveBlank: 'اتركه فارغًا للإبقاء على السر',
		savedSecret: 'محفوظ — اتركه فارغًا للإبقاء، أو الصق قيمة جديدة',
		requiredMark: 'مطلوب',
		missingRequired: 'املأ واحفظ كل الحقول المطلوبة أولاً',
		save: 'حفظ',
		validate: 'تحقق',
		toggleOn: 'تفعيل',
		toggleOff: 'تعطيل',
		enabled: 'مفعّل',
		disabled: 'معطّل',
		connected: 'متصل',
		disconnected: 'غير متصل',
		error: 'خطأ',
		saveOk: 'تم الحفظ — القيم ما زالت في النموذج',
		validateOk: 'تم التحقق',
		loadError: 'تعذر التحميل',
		sendError: 'فشل الإرسال',
		variables: 'متغيرات الاتصال',
		graphVersion: 'إصدار Graph',
		displayPhone: 'رقم العرض',
		open: 'فتح',
	},
};

function initials(name = '') {
	const parts = String(name).trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return '?';
	return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function formatTime(value, locale) {
	if (!value) return '';
	try {
		return new Date(value).toLocaleTimeString(locale === 'ar' ? 'ar' : 'en', {
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return '';
	}
}

function randomVerifyToken() {
	const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let out = 'so7ba_';
	for (let i = 0; i < 28; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
	return out;
}

/** Match backend normalizeWaId — E.164 digits without +. */
function normalizeWaPhone(phone) {
	if (!phone) return null;
	let digits = String(phone).trim().replace(/\D/g, '');
	if (!digits) return null;
	if (digits.startsWith('00')) digits = digits.slice(2);
	if (/^01[0125]\d{8}$/.test(digits)) digits = `20${digits.slice(1)}`;
	if (digits.startsWith('0')) return null;
	if (digits.length < 10 || digits.length > 15) return null;
	return digits;
}

function parsePlaceholdersInText(text, component) {
	if (!text) return [];
	const named = [...String(text).matchAll(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g)];
	if (named.length) {
		const seen = new Set();
		return named
			.map(m => m[1])
			.filter(k => {
				if (seen.has(k)) return false;
				seen.add(k);
				return true;
			})
			.map(key => ({
				component,
				format: 'named',
				key,
				id: `${component}:named:${key}`,
				label: `${component} · ${key}`,
			}));
	}
	const nums = [
		...new Set(
			[...String(text).matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m => Number(m[1])),
		),
	].sort((a, b) => a - b);
	return nums.map(n => ({
		component,
		format: 'positional',
		key: String(n),
		index: n,
		id: `${component}:pos:${n}`,
		label: `${component} · {{${n}}}`,
	}));
}

function extractTemplatePlaceholders(components = []) {
	const out = [];
	for (const c of components || []) {
		const type = String(c.type || '').toUpperCase();
		if (type === 'BODY' || type === 'HEADER') {
			out.push(...parsePlaceholdersInText(c.text, type));
		}
		if (type === 'BUTTONS' && Array.isArray(c.buttons)) {
			c.buttons.forEach((btn, index) => {
				if (String(btn.type || '').toUpperCase() !== 'URL') return;
				const vars = parsePlaceholdersInText(btn.url, 'BUTTON');
				vars.forEach(v => {
					out.push({
						...v,
						component: 'BUTTON',
						buttonIndex: index,
						urlTemplate: String(btn.url || ''),
						id: `BUTTON:${index}:${v.key}`,
						label: `Button ${index + 1} URL · {{${v.key}}}`,
					});
				});
			});
		}
	}
	return out;
}

/** Meta #132018: dynamic URL button suffix must form a valid https URL. */
const URL_BUTTON_PARAM_SAFE = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;

function isValidUrlButtonParam(value, urlTemplate = '') {
	const param = String(value || '').trim();
	if (!param) return false;
	if (/\s/.test(param)) return false;
	if (/[^\x00-\x7F]/.test(param)) return false; // no Arabic / emoji / non-ASCII
	if (!URL_BUTTON_PARAM_SAFE.test(param)) return false;
	if (!urlTemplate) return true;
	const filled = String(urlTemplate).replace(/\{\{\s*[\w]+\s*\}\}/g, () => param);
	try {
		const u = new URL(filled);
		return /^https?:$/i.test(u.protocol);
	} catch {
		return false;
	}
}

function validateTemplateSendValues(placeholders, values, t) {
	const fieldErrors = {};
	for (const p of placeholders || []) {
		const text = String(values[p.id] || '').trim();
		if (!text) {
			fieldErrors[p.id] = t.templateVarRequired;
			continue;
		}
		if (p.component === 'BUTTON' && !isValidUrlButtonParam(text, p.urlTemplate)) {
			fieldErrors[p.id] = t.templateUrlParamInvalid;
		}
	}
	return fieldErrors;
}

function buildTemplateSendComponents(placeholders, values) {
	if (!placeholders.length) return undefined;
	const bodyParams = [];
	const headerParams = [];
	const buttonGroups = {};

	for (const p of placeholders) {
		const text = String(values[p.id] || '').trim();
		if (!text) continue;
		if (p.component === 'BODY') {
			bodyParams.push(
				p.format === 'named'
					? { type: 'text', parameter_name: p.key, text, _index: p.index || 0 }
					: { type: 'text', text, _index: p.index || 0 },
			);
		} else if (p.component === 'HEADER') {
			headerParams.push(
				p.format === 'named'
					? { type: 'text', parameter_name: p.key, text, _index: p.index || 0 }
					: { type: 'text', text, _index: p.index || 0 },
			);
		} else if (p.component === 'BUTTON') {
			const idx = String(p.buttonIndex ?? 0);
			if (!buttonGroups[idx]) buttonGroups[idx] = [];
			buttonGroups[idx].push({ type: 'text', text });
		}
	}

	const components = [];
	if (headerParams.length) {
		headerParams.sort((a, b) => (a._index || 0) - (b._index || 0));
		components.push({
			type: 'header',
			parameters: headerParams.map(({ type, text, parameter_name }) =>
				parameter_name ? { type, text, parameter_name } : { type, text },
			),
		});
	}
	if (bodyParams.length) {
		bodyParams.sort((a, b) => (a._index || 0) - (b._index || 0));
		components.push({
			type: 'body',
			parameters: bodyParams.map(({ type, text, parameter_name }) =>
				parameter_name ? { type, text, parameter_name } : { type, text },
			),
		});
	}
	Object.keys(buttonGroups)
		.sort((a, b) => Number(a) - Number(b))
		.forEach(index => {
			components.push({
				type: 'button',
				sub_type: 'url',
				index,
				parameters: buttonGroups[index],
			});
		});
	return components.length ? components : undefined;
}

function templatePreviewText(components = []) {
	const body = (components || []).find(c => String(c.type || '').toUpperCase() === 'BODY');
	return body?.text || '';
}

function templateHeaderText(components = []) {
	const header = (components || []).find(c => String(c.type || '').toUpperCase() === 'HEADER');
	return header?.text || '';
}

function templateHeaderFormat(components = []) {
	const header = (components || []).find(c => String(c.type || '').toUpperCase() === 'HEADER');
	return String(header?.format || (header?.text ? 'TEXT' : '')).toUpperCase();
}

function templateFooterText(components = []) {
	const footer = (components || []).find(c => String(c.type || '').toUpperCase() === 'FOOTER');
	return footer?.text || '';
}

function templateButtons(components = []) {
	const block = (components || []).find(c => String(c.type || '').toUpperCase() === 'BUTTONS');
	return Array.isArray(block?.buttons) ? block.buttons : [];
}

function templateHeaderComponent(components = []) {
	return (components || []).find(c => String(c.type || '').toUpperCase() === 'HEADER') || null;
}

function canEditMetaTemplate(tpl) {
	const status = String(tpl?.status || '').toUpperCase();
	return ['APPROVED', 'REJECTED', 'PAUSED'].includes(status) && Boolean(tpl?.id);
}

function formFromMetaTemplate(tpl, isAr) {
	const headerFormat = templateHeaderFormat(tpl?.components) || 'NONE';
	const buttons = templateButtons(tpl?.components).map(b => ({
		id: nextButtonId(),
		type: String(b.type || 'QUICK_REPLY').toUpperCase(),
		text: String(b.text || ''),
		url: String(b.url || ''),
		phone_number: String(b.phone_number || ''),
	}));
	return {
		name: String(tpl?.name || ''),
		language: String(tpl?.language || (isAr ? 'ar' : 'en_US')),
		category: String(tpl?.category || 'UTILITY').toUpperCase(),
		headerFormat: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)
			? headerFormat
			: 'NONE',
		headerText: templateHeaderText(tpl?.components),
		bodyText: templatePreviewText(tpl?.components),
		footerText: templateFooterText(tpl?.components),
		buttons,
	};
}

function emptyCreateTemplateForm(isAr) {
	return {
		name: '',
		language: isAr ? 'ar' : 'en_US',
		category: 'UTILITY',
		headerFormat: 'NONE',
		headerText: '',
		bodyText: '',
		footerText: '',
		buttons: [],
	};
}

function nextButtonId() {
	return `btn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function assertNumberedVars(text, fieldKey, errors, t) {
	const matches = [...String(text || '').matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)];
	if (!matches.length) return;
	for (const m of matches) {
		if (!/^\d+$/.test(String(m[1]).trim())) {
			errors[fieldKey] = t.templateVarsMustBeNumbered;
			return;
		}
	}
	const positional = matches.map(m => Number(m[1]));
	const unique = [...new Set(positional)].sort((a, b) => a - b);
	for (let i = 0; i < unique.length; i += 1) {
		if (unique[i] !== i + 1) {
			errors[fieldKey] = t.templateVarsSequential;
			return;
		}
	}
}

function fillTemplatePlaceholders(text, sendComponents, componentType = 'body') {
	if (!text) return '';
	const list = unwrapTemplateSendComponents(sendComponents);
	const send = list.find(
		c => String(c.type || '').toLowerCase() === componentType.toLowerCase(),
	);
	const params = send?.parameters || [];
	return String(text)
		.replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, n) => {
			const idx = Number(n) - 1;
			return params[idx]?.text != null ? String(params[idx].text) : `{{${n}}}`;
		})
		.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, name) => {
			const hit = params.find(p => p?.parameter_name === name);
			return hit?.text != null ? String(hit.text) : `{{${name}}}`;
		});
}

function unwrapTemplateSendComponents(stored) {
	if (Array.isArray(stored)) return stored;
	if (stored && Array.isArray(stored.send)) return stored.send;
	if (stored && Array.isArray(stored.parameters)) return stored.parameters;
	return [];
}

function unwrapStoredTemplateButtons(stored) {
	if (stored && Array.isArray(stored.buttons)) return stored.buttons;
	return [];
}

function resolveTemplateButtons(defComponents, sendComponents) {
	const buttons = templateButtons(defComponents);
	if (!buttons.length) return [];
	const send = unwrapTemplateSendComponents(sendComponents);
	const urlSends = send.filter(
		c =>
			String(c?.type || '').toLowerCase() === 'button' &&
			String(c?.sub_type || '').toLowerCase() === 'url',
	);
	return buttons.map((btn, index) => {
		const type = String(btn?.type || 'QUICK_REPLY').toUpperCase();
		const text = String(btn?.text || '').trim();
		let url = String(btn?.url || '').trim();
		const phone_number = String(btn?.phone_number || '').trim();
		if (type === 'URL' && url.includes('{{')) {
			const sendBtn =
				urlSends.find(s => Number(s.index ?? -1) === index) || urlSends[0];
			const param = String(sendBtn?.parameters?.[0]?.text || '').trim();
			if (param) url = url.replace(/\{\{\s*[\w]+\s*\}\}/g, () => param);
		}
		return { type, text, url, phone_number };
	});
}

const URL_IN_TEXT_RE =
	/((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;!?"')\]\}])/gi;

/** Candidate phone-like spans (normalized later). */
const PHONE_IN_TEXT_RE = /(?:\+?\d[\d\s\-().]{6,22}\d)/g;

function splitTextWithRichParts(text) {
	const raw = String(text || '');
	if (!raw) return [];

	const hits = [];

	const urlRe = new RegExp(URL_IN_TEXT_RE.source, 'gi');
	let match;
	while ((match = urlRe.exec(raw)) !== null) {
		const value = match[0];
		const href = /^www\./i.test(value) ? `https://${value}` : value;
		hits.push({ type: 'link', value, href, start: match.index, end: match.index + value.length });
	}

	const phoneRe = new RegExp(PHONE_IN_TEXT_RE.source, 'g');
	while ((match = phoneRe.exec(raw)) !== null) {
		const value = match[0];
		const waId = normalizeWaPhone(value);
		if (!waId) continue;
		hits.push({
			type: 'phone',
			value,
			waId,
			start: match.index,
			end: match.index + value.length,
		});
	}

	hits.sort((a, b) => a.start - b.start || b.end - a.start - (a.end - a.start));
	const picked = [];
	let cursor = 0;
	for (const hit of hits) {
		if (hit.start < cursor) continue;
		picked.push(hit);
		cursor = hit.end;
	}

	const parts = [];
	let last = 0;
	for (const hit of picked) {
		if (hit.start > last) parts.push({ type: 'text', value: raw.slice(last, hit.start) });
		parts.push(hit);
		last = hit.end;
	}
	if (last < raw.length) parts.push({ type: 'text', value: raw.slice(last) });
	return parts.length ? parts : [{ type: 'text', value: raw }];
}

function RichMessageText({ text, className = '', onPhoneClick }) {
	const parts = splitTextWithRichParts(text);
	return (
		<span className={className}>
			{parts.map((p, i) => {
				if (p.type === 'link') {
					return (
						<a
							key={`l-${i}`}
							href={p.href}
							target="_blank"
							rel="noopener noreferrer"
							className="break-all font-semibold underline underline-offset-2"
							style={{ color: '#027EB5' }}
							onClick={e => e.stopPropagation()}
						>
							{p.value}
						</a>
					);
				}
				if (p.type === 'phone') {
					return (
						<button
							key={`p-${i}`}
							type="button"
							className="inline break-all font-semibold underline underline-offset-2"
							style={{ color: '#027EB5' }}
							title={p.waId}
							onClick={e => {
								e.preventDefault();
								e.stopPropagation();
								onPhoneClick?.(p.waId, p.value);
							}}
						>
							{p.value}
						</button>
					);
				}
				return <span key={`t-${i}`}>{p.value}</span>;
			})}
		</span>
	);
}

function resolveTemplateMessageParts(message, templates = []) {
	if (!message) return { header: '', body: '', footer: '', buttons: [] };
	const send = unwrapTemplateSendComponents(message.templateComponents);
	const storedButtons = unwrapStoredTemplateButtons(message.templateComponents);
	const tpl =
		templates.find(
			t =>
				t.name === message.templateName &&
				(!message.templateLanguage || t.language === message.templateLanguage),
		) || templates.find(t => t.name === message.templateName);

	let header = '';
	let body = '';
	let footer = '';
	if (tpl?.components?.length) {
		header = fillTemplatePlaceholders(
			templateHeaderText(tpl.components),
			send,
			'header',
		);
		body = fillTemplatePlaceholders(templatePreviewText(tpl.components), send, 'body');
		footer = templateFooterText(tpl.components);
	}

	const raw = String(message.body || '');
	if (!body) {
		if (raw && !raw.startsWith('[template:')) body = raw;
		else body = message.templateName || raw.replace(/^\[template:(.*)\]$/, '$1');
	} else if (!header && !footer && raw && !raw.startsWith('[template:') && raw !== body) {
		// Prefer structured body; keep raw only when structure missing
	}

	const buttons = storedButtons.length
		? storedButtons
		: resolveTemplateButtons(tpl?.components, send);

	return { header, body, footer, buttons };
}

function renderTemplateMessageDisplay(message, templates = []) {
	if (!message) return '';
	if (message.messageType !== 'template') return message.body || '';
	const parts = resolveTemplateMessageParts(message, templates);
	return [parts.header, parts.body, parts.footer].filter(Boolean).join('\n');
}

function TemplateActionButtons({ buttons }) {
	const list = Array.isArray(buttons) ? buttons.filter(b => b?.text) : [];
	if (!list.length) return null;
	return (
		<div className="mt-1 overflow-hidden rounded-b-[10px] border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
			{list.map((btn, i) => {
				const type = String(btn.type || '').toUpperCase();
				const text = String(btn.text || 'Button');
				const url = String(btn.url || '').trim();
				const phone = String(btn.phone_number || '').trim();
				const className =
					'flex w-full items-center justify-center gap-1.5 border-t px-3 py-2.5 text-[13px] font-semibold transition hover:bg-black/[0.03]';
				const style = {
					borderColor: i === 0 ? 'transparent' : 'rgba(0,0,0,0.06)',
					color: '#027EB5',
				};
				const icon =
					type === 'URL' ? (
						<Link2 className="h-3.5 w-3.5 shrink-0" />
					) : type === 'PHONE_NUMBER' ? (
						<Phone className="h-3.5 w-3.5 shrink-0" />
					) : type === 'QUICK_REPLY' ? (
						<MessageCircle className="h-3.5 w-3.5 shrink-0" />
					) : null;

				if (type === 'URL' && url) {
					return (
						<a
							key={`${text}-${i}`}
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className={className}
							style={style}
							onClick={e => e.stopPropagation()}
						>
							{icon}
							<span className="truncate">{text}</span>
						</a>
					);
				}
				if (type === 'PHONE_NUMBER' && phone) {
					return (
						<a
							key={`${text}-${i}`}
							href={`tel:${phone.replace(/\s+/g, '')}`}
							className={className}
							style={style}
							onClick={e => e.stopPropagation()}
						>
							{icon}
							<span className="truncate">{text}</span>
						</a>
					);
				}
				return (
					<div key={`${text}-${i}`} className={className} style={style}>
						{icon}
						<span className="truncate">{text}</span>
					</div>
				);
			})}
		</div>
	);
}

function exampleParamsFromText(text) {
	const nums = [
		...new Set(
			[...String(text || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m => Number(m[1])),
		),
	].sort((a, b) => a - b);
	const samples = ['Ahmed', 'Cairo', 'So7baFit', '12345', 'today'];
	if (nums.length) return nums.map(n => samples[(n - 1) % samples.length]);
	return [];
}

const META_TEMPLATE_LANGUAGES = [
	'en_US',
	'en',
	'ar',
	'ar_AR',
	'fr',
	'es',
	'pt_BR',
	'hi',
	'id',
	'tr',
];

function validateCreateTemplateForm(form, t, opts = {}) {
	const errors = {};
	const name = String(form.name || '').trim().toLowerCase();
	if (!name) errors.name = t.templateNameRequired;
	else if (!/^[a-z0-9_]{3,512}$/.test(name)) errors.name = t.templateNameInvalid;
	else if (/__/.test(name) || name.startsWith('_') || name.endsWith('_')) {
		errors.name = t.templateNameInvalid;
	}

	const language = String(form.language || '').trim();
	if (!language) errors.language = t.templateLangRequired;
	else if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(language) && !/^[a-z]{2}$/.test(language)) {
		errors.language = t.templateLangInvalid;
	}

	const body = String(form.bodyText || '').trim();
	if (!body) errors.bodyText = t.templateBodyRequired;
	else if (body.length > 1024) errors.bodyText = t.templateBodyTooLong;
	else assertNumberedVars(body, 'bodyText', errors, t);

	const headerFormat = String(form.headerFormat || 'NONE').toUpperCase();
	if (headerFormat === 'TEXT') {
		const header = String(form.headerText || '').trim();
		if (header.length > 60) errors.headerText = t.templateHeaderTooLong;
		else assertNumberedVars(header, 'headerText', errors, t);
	} else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {
		if (!opts.hasHeaderSample && !form.headerHandle) {
			errors.headerSample = t.headerSampleRequired;
		}
	}

	const footer = String(form.footerText || '').trim();
	if (footer.length > 60) errors.footerText = t.templateFooterTooLong;

	const buttons = Array.isArray(form.buttons) ? form.buttons : [];
	if (buttons.length > 10) errors.buttons = t.buttonMax;
	buttons.forEach((btn, idx) => {
		const text = String(btn.text || '').trim();
		if (!text || text.length > 25) {
			errors[`button_${idx}_text`] = t.buttonTextRequired;
		}
		const type = String(btn.type || '').toUpperCase();
		if (type === 'URL' && !String(btn.url || '').trim()) {
			errors[`button_${idx}_url`] = t.buttonUrlRequired;
		}
		if (type === 'PHONE_NUMBER' && !String(btn.phone_number || '').trim()) {
			errors[`button_${idx}_phone`] = t.buttonPhoneRequired;
		}
		if (type === 'URL' && btn.url) {
			assertNumberedVars(btn.url, `button_${idx}_url`, errors, t);
		}
	});

	return errors;
}

function resolveWebhookUrl(status) {
	const fromApi = status?.webhookCallbackUrl || status?.webhookUrlHint || status?.webhookPath;
	if (!fromApi) return '';
	if (/^https?:\/\//i.test(fromApi)) return fromApi;
	const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
	if (base) return `${base}${fromApi.startsWith('/') ? fromApi : `/${fromApi}`}`;
	if (typeof window !== 'undefined') {
		return `${window.location.protocol}//${window.location.hostname}:3030${
			fromApi.startsWith('/') ? fromApi : `/${fromApi}`
		}`;
	}
	return fromApi;
}

const META_WA_CONFIG_DRAFT_KEY = 'so7ba.meta-whatsapp.config.draft';

function emptyConfigForm() {
	return {
		accessToken: '',
		phoneNumberId: '',
		wabaId: '',
		verifyToken: '',
		appSecret: '',
	};
}

function readConfigDraft() {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(META_WA_CONFIG_DRAFT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		return {
			accessToken: parsed.accessToken || '',
			phoneNumberId: parsed.phoneNumberId || '',
			wabaId: parsed.wabaId || '',
			verifyToken: parsed.verifyToken || '',
			appSecret: parsed.appSecret || '',
		};
	} catch {
		return null;
	}
}

function writeConfigDraft(form) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(
			META_WA_CONFIG_DRAFT_KEY,
			JSON.stringify({
				accessToken: form.accessToken || '',
				phoneNumberId: form.phoneNumberId || '',
				wabaId: form.wabaId || '',
				verifyToken: form.verifyToken || '',
				appSecret: form.appSecret || '',
				updatedAt: Date.now(),
			}),
		);
	} catch {
		/* ignore quota / private mode */
	}
}

function mergeConfigForm(server, draft) {
	const base = {
		accessToken: server?.accessToken || '',
		appSecret: server?.appSecret || '',
		phoneNumberId: server?.phoneNumberId || '',
		wabaId: server?.wabaId || '',
		verifyToken: server?.verifyToken || '',
	};
	if (!draft) return base;
	return {
		accessToken: draft.accessToken || base.accessToken,
		appSecret: draft.appSecret || base.appSecret,
		phoneNumberId: draft.phoneNumberId || base.phoneNumberId,
		wabaId: draft.wabaId || base.wabaId,
		verifyToken: draft.verifyToken || base.verifyToken,
	};
}

function Avatar({ name, size = 48 }) {
	return (
		<div
			className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
			style={{
				width: size,
				height: size,
				background: 'radial-gradient(ellipse 141% 141% at 100% 0%, #B1B5C0 0%, #858992 100%)',
				fontSize: size > 40 ? 15 : 12,
				border: '0.4px solid rgba(0,0,0,0.10)',
			}}
		>
			{initials(name)}
		</div>
	);
}

function parseFlashMessage(message) {
	const text = String(message || '').trim();
	if (!text) return null;
	const sep = text.includes(' — ') ? ' — ' : text.includes(' - ') ? ' - ' : text.includes(': ') ? ': ' : null;
	if (sep) {
		const idx = text.indexOf(sep);
		const title = text.slice(0, idx).trim();
		const detail = text.slice(idx + sep.length).trim();
		if (title && detail) return { title, detail, full: text };
	}
	return { title: text, detail: '', full: text };
}

function AlertBanner({ message, tone = 'error', onClose, hint, t, floating = false }) {
	const parsed = parseFlashMessage(message);
	if (!parsed) return null;
	const isError = tone === 'error';
	const showHint =
		hint ||
		(isError &&
		/invalid parameter/i.test(parsed.full) &&
		!/button input|library buttons|hsm_id requires name/i.test(parsed.full)
			? t?.metaInvalidParamHint
			: null) ||
		(isError && /131058|hello world templates can only be sent/i.test(parsed.full)
			? t?.helloWorldTestOnlyHint
			: null);

	return (
		<div
			className={`flex items-start gap-3 rounded-xl px-3.5 py-3 text-[13px] ${
				floating ? 'shadow-[0_8px_24px_rgba(11,20,26,0.18)]' : 'shadow-[0_1px_0_rgba(0,0,0,0.06)]'
			}`}
			style={{
				background: isError ? '#FDECEC' : '#E1FFD4',
				color: isError ? '#9B1C1C' : '#1FA755',
				border: `1px solid ${isError ? '#F5C2C2' : '#B7EFC5'}`,
				borderTop: floating
					? `3px solid ${isError ? '#E11D48' : '#24D366'}`
					: undefined,
			}}
			role="alert"
		>
			<div
				className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
				style={{ background: isError ? '#E11D48' : '#24D366' }}
			>
				{isError ? '!' : '✓'}
			</div>
			<div className="min-w-0 flex-1">
				<div className="font-semibold leading-snug">
					{isError && /invalid parameter/i.test(parsed.title)
						? `${t?.metaErrorTitle || 'Meta API error'}: ${parsed.title}`
						: parsed.title}
				</div>
				{parsed.detail ? (
					<p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed opacity-95">
						{parsed.detail}
					</p>
				) : null}
				{showHint ? (
					<p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed opacity-80">
						{showHint}
					</p>
				) : null}
			</div>
			{onClose ? (
				<button
					type="button"
					onClick={onClose}
					title={t?.errorDismiss || 'Dismiss'}
					className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100"
					style={{ color: 'inherit' }}
				>
					<X className="h-4 w-4" />
				</button>
			) : null}
		</div>
	);
}

function isSuccessFlash(flash, t) {
	return (
		flash === t.saveOk ||
		flash === t.validateOk ||
		flash === t.templateCreateOk ||
		flash === t.templateEditOk ||
		flash === t.verifySendOk ||
		flash === t.libraryAdded ||
		flash === t.templateDeleted ||
		flash === t.templateCopied ||
		(typeof flash === 'string' && flash.startsWith(t.seedSubmitted))
	);
}

/** WhatsApp-style bubble preview for Meta library / verification templates */
function LibraryWaBubble({ item }) {
	const buttons = Array.isArray(item?.buttons)
		? item.buttons
		: Array.isArray(item?.raw?.buttons)
			? item.raw.buttons
			: [];
	const header = item?.header || item?.raw?.header || item?.raw?.header_text || '';
	const body = item?.body || item?.note || item?.raw?.body || item?.raw?.body_text || '—';
	const footer = item?.footer || item?.raw?.footer || item?.raw?.footer_text || '';

	return (
		<div className="flex justify-end">
			<div
				className="w-full max-w-[280px] overflow-hidden text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.08)]"
				style={{ background: WA.bubbleOut, color: WA.text, borderRadius: 12 }}
			>
				{header ? (
					<div className="border-b px-3 py-2 text-[12px] font-bold" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
						{header}
					</div>
				) : null}
				<div className="whitespace-pre-wrap break-words px-3 py-2 leading-[1.35]">
					<RichMessageText text={body} />
				</div>
				{footer ? (
					<div className="px-3 pb-2 text-[11px]" style={{ color: WA.muted }}>{footer}</div>
				) : null}
				<div className="flex items-center justify-end gap-1 px-2.5 pb-1.5 text-[10px]" style={{ color: 'rgba(0,0,0,0.45)' }}>
					<span>WA</span>
					<CheckCheck className="h-3.5 w-3.5" style={{ color: '#53BDEB' }} />
				</div>
				{buttons.length ? (
					<div className="border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
						{buttons.map((btn, i) => {
							const text = typeof btn === 'string' ? btn : btn?.text || btn?.title || 'Button';
							const type = String(btn?.type || '').toUpperCase();
							return (
								<div
									key={`${text}-${i}`}
									className="flex items-center justify-center gap-1.5 border-t px-3 py-2 text-[13px] font-semibold"
									style={{
										borderColor: i === 0 ? 'transparent' : 'rgba(0,0,0,0.06)',
										color: '#027EB5',
									}}
								>
									{type === 'URL' ? <Link2 className="h-3.5 w-3.5" /> : null}
									{type === 'PHONE_NUMBER' ? <Phone className="h-3.5 w-3.5" /> : null}
									{text}
								</div>
							);
						})}
					</div>
				) : null}
			</div>
		</div>
	);
}

function RailBtn({ active, onClick, title, children, badge }) {
	const showCount = typeof badge === 'number' && badge > 0;
	const showDot = badge === true;
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className="relative flex h-12 w-12 items-center justify-center rounded-md transition-colors"
			style={{
				background: active ? WA.selected : 'transparent',
				color: active ? WA.text : WA.icon,
			}}
		>
			{children}
			{showCount ? (
				<span
					className="absolute end-0.5 top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-[12px] font-medium text-white"
					style={{ background: WA.green }}
				>
					{badge}
				</span>
			) : null}
			{showDot ? (
				<span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: '#FEBC2E' }} />
			) : null}
		</button>
	);
}

function StatusTicks({ status }) {
	if (status === 'read') return <CheckCheck className="h-3.5 w-3.5" style={{ color: WA.tick }} />;
	if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-[#667781]" />;
	if (status === 'sent' || status === 'queued' || status === 'pending') {
		return <Check className="h-3.5 w-3.5 text-[#667781]" />;
	}
	if (status === 'failed') return <span className="text-[10px] text-rose-600">!</span>;
	return null;
}

function FieldActions({ value, t, onGenerate }) {
	const [copied, setCopied] = useState(false);
	async function copy() {
		if (!value) return;
		try {
			await navigator.clipboard.writeText(String(value));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* ignore */
		}
	}
	return (
		<div className="flex items-center gap-1">
			{onGenerate && (
				<button type="button" onClick={onGenerate} className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#00A884] hover:bg-[#D9FDD3]">
					{t.generateToken}
				</button>
			)}
			<button type="button" onClick={() => void copy()} disabled={!value} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#54656F] hover:bg-[#E9EDEF] disabled:opacity-40">
				{copied ? <Check className="h-3 w-3 text-[#00A884]" /> : <Copy className="h-3 w-3" />}
				{copied ? t.copied : t.copy}
			</button>
		</div>
	);
}

function ConfigField({
	label,
	value,
	onChange,
	t,
	type = 'text',
	placeholder,
	readOnly = false,
	mono = false,
	onGenerate,
	hint,
	required = false,
	saved = false,
}) {
	return (
		<label className="block space-y-1.5">
			<div className="flex items-center justify-between gap-2">
				<span className="text-[12px] font-medium text-[#667781]">
					{label}
					{required ? <span className="ms-1 text-[#00A884]">*</span> : null}
					{saved && !value ? (
						<span className="ms-2 rounded bg-[#D9FDD3] px-1.5 py-0.5 text-[10px] font-semibold text-[#008069]">
							{t.savedSecret.split('—')[0].trim()}
						</span>
					) : null}
				</span>
				<FieldActions value={value} t={t} onGenerate={onGenerate} />
			</div>
			<input
				type={type}
				value={value ?? ''}
				onChange={e => onChange?.(e.target.value)}
				readOnly={readOnly}
				placeholder={placeholder}
				className={`w-full rounded-lg border border-[#D1D7DB] px-3 py-2 text-sm text-[#111B21] outline-none focus:border-[#00A884] ${
					mono ? 'font-mono' : ''
				} ${readOnly ? 'bg-[#F0F2F5] text-[#54656F]' : 'bg-white'}`}
			/>
			{hint ? <p className="text-[11px] leading-relaxed text-[#667781]">{hint}</p> : null}
		</label>
	);
}

function isMediaPlaceholderBody(body) {
	return /^\[(image|video|audio|voice|sticker|document|unsupported)\]$/i.test(
		String(body || '').trim(),
	);
}

function messageCaption(message) {
	const body = String(message?.body || '').trim();
	if (!body || isMediaPlaceholderBody(body)) return '';
	return body;
}

function getMessageTranslateText(message, templates = []) {
	if (!message) return '';
	const type = String(message.messageType || '').toLowerCase();
	if (type === 'template') {
		return String(renderTemplateMessageDisplay(message, templates) || '').trim();
	}
	if (type === 'button' || type === 'interactive') {
		return String(messageCaption(message) || message.body || '')
			.replace(/^\[button\]\s*/i, '')
			.trim();
	}
	const caption = messageCaption(message);
	if (caption) return caption;
	if (type === 'text' && message.body && !isMediaPlaceholderBody(message.body)) {
		return String(message.body).trim();
	}
	return '';
}

function detectTranslateTarget(text) {
	return /[\u0600-\u06FF]/.test(String(text || '')) ? 'en' : 'ar';
}

function buildChatRows(messages = []) {
	const rows = [];
	let i = 0;
	while (i < messages.length) {
		const m = messages[i];
		if (m?.messageType === 'image' && m.hasMedia) {
			const group = [m];
			let j = i + 1;
			while (j < messages.length) {
				const n = messages[j];
				if (n?.messageType === 'image' && n.hasMedia && n.direction === m.direction) {
					group.push(n);
					j += 1;
				} else break;
			}
			if (group.length >= 2) {
				rows.push({
					kind: 'image_grid',
					key: `grid_${group.map(x => x.id).join('_')}`,
					messages: group,
					direction: m.direction,
				});
				i = j;
				continue;
			}
		}
		rows.push({ kind: 'single', key: m.id, message: m });
		i += 1;
	}
	return rows;
}

function formatAudioClock(sec) {
	if (!Number.isFinite(sec) || sec < 0) return '0:00';
	const s = Math.floor(sec);
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${m}:${String(r).padStart(2, '0')}`;
}

function VoiceNotePlayer({ src, mine }) {
	const audioRef = useRef(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(0);

	useEffect(() => {
		const el = audioRef.current;
		if (!el) return undefined;
		const onTime = () => setProgress(el.currentTime || 0);
		const onMeta = () => setDuration(el.duration || 0);
		const onEnded = () => {
			setPlaying(false);
			setProgress(0);
		};
		el.addEventListener('timeupdate', onTime);
		el.addEventListener('loadedmetadata', onMeta);
		el.addEventListener('ended', onEnded);
		return () => {
			el.removeEventListener('timeupdate', onTime);
			el.removeEventListener('loadedmetadata', onMeta);
			el.removeEventListener('ended', onEnded);
		};
	}, [src]);

	async function toggle() {
		const el = audioRef.current;
		if (!el) return;
		if (playing) {
			el.pause();
			setPlaying(false);
			return;
		}
		try {
			await el.play();
			setPlaying(true);
		} catch {
			setPlaying(false);
		}
	}

	const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
	const bars = [4, 10, 6, 14, 8, 12, 5, 16, 9, 11, 7, 13, 6, 15, 8, 10, 5, 12, 7, 14];

	return (
		<div className="flex min-w-[220px] max-w-[280px] items-center gap-2.5 py-0.5">
			<audio ref={audioRef} src={src} preload="metadata" className="hidden" />
			<button
				type="button"
				onClick={() => void toggle()}
				className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-sm"
				style={{ background: mine ? '#1FA755' : '#00A884' }}
			>
				{playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ms-0.5 h-4 w-4 fill-current" />}
			</button>
			<div className="min-w-0 flex-1">
				<button
					type="button"
					className="flex w-full items-end gap-[2px]"
					onClick={e => {
						const el = audioRef.current;
						const rect = e.currentTarget.getBoundingClientRect();
						const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
						if (el && duration) {
							el.currentTime = ratio * duration;
							setProgress(el.currentTime);
						}
					}}
				>
					{bars.map((h, idx) => (
						<span
							key={idx}
							className="w-[3px] rounded-full"
							style={{
								height: h,
								background:
									(idx / bars.length) * 100 <= pct
										? mine
											? '#1FA755'
											: '#00A884'
										: 'rgba(0,0,0,0.22)',
							}}
						/>
					))}
				</button>
				<div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>
					<span>{formatAudioClock(playing || progress ? progress : duration)}</span>
					<Mic className="h-3 w-3 opacity-50" />
				</div>
			</div>
		</div>
	);
}

function MediaBubble({ message, mine, onOpenMedia, labels }) {
	const [url, setUrl] = useState(null);
	const [failed, setFailed] = useState(false);
	const type = String(message.messageType || '').toLowerCase();

	useEffect(() => {
		let revoked = false;
		let objectUrl = null;
		if (!message.hasMedia || !message.mediaUrl) return undefined;
		metaWhatsAppApi
			.mediaBlobUrl(message.mediaUrl)
			.then(u => {
				if (revoked) {
					URL.revokeObjectURL(u);
					return;
				}
				objectUrl = u;
				setUrl(u);
			})
			.catch(() => setFailed(true));
		return () => {
			revoked = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [message.id, message.mediaUrl, message.hasMedia]);

	if (failed) {
		return (
			<div className="text-[12px] opacity-70">
				{labels?.mediaUnavailable || 'Media unavailable'}
			</div>
		);
	}
	if (!url) {
		return (
			<div className="flex h-24 w-40 items-center justify-center rounded-lg bg-black/5">
				<LoaderCircle className="h-5 w-5 animate-spin opacity-60" />
			</div>
		);
	}

	if (type === 'sticker') {
		return (
			<button type="button" onClick={() => onOpenMedia?.(url, 'sticker')} className="block">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={url} alt="sticker" className="h-36 w-36 object-contain drop-shadow-sm" />
			</button>
		);
	}

	if (type === 'image') {
		return (
			<button
				type="button"
				onClick={() => onOpenMedia?.(url, 'image')}
				className="block overflow-hidden rounded-lg"
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={url}
					alt={messageCaption(message) || 'image'}
					className="max-h-72 max-w-full object-cover transition hover:brightness-95"
				/>
			</button>
		);
	}

	if (type === 'audio' || type === 'voice') {
		return <VoiceNotePlayer src={url} mine={mine} />;
	}

	if (type === 'video') {
		return (
			<video
				controls
				playsInline
				preload="metadata"
				src={url}
				className="max-h-72 w-full max-w-[300px] rounded-lg bg-black"
			/>
		);
	}

	return (
		<a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
			<FileText className="h-4 w-4" />
			{message.mediaFileName || 'Document'}
		</a>
	);
}

function ImageGridBubble({ messages, mine, onOpenMedia, locale }) {
	const [urls, setUrls] = useState({});
	const count = messages.length;
	const show = messages.slice(0, 4);
	const extra = Math.max(0, count - 4);

	useEffect(() => {
		let cancelled = false;
		const created = [];
		Promise.all(
			show.map(async m => {
				if (!m.mediaUrl) return [m.id, null];
				try {
					const u = await metaWhatsAppApi.mediaBlobUrl(m.mediaUrl);
					created.push(u);
					return [m.id, u];
				} catch {
					return [m.id, null];
				}
			}),
		).then(entries => {
			if (cancelled) {
				created.forEach(u => URL.revokeObjectURL(u));
				return;
			}
			setUrls(Object.fromEntries(entries));
		});
		return () => {
			cancelled = true;
			created.forEach(u => URL.revokeObjectURL(u));
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages.map(m => m.id).join('|')]);

	const last = messages[messages.length - 1];
	const gridClass =
		count === 2
			? 'grid-cols-2'
			: count === 3
				? 'grid-cols-2'
				: 'grid-cols-2';

	return (
		<div
			className={`relative max-w-[300px] overflow-hidden rounded-xl p-0.5 shadow-[0_1px_0_rgba(0,0,0,0.08)] ${mine ? '' : ''}`}
			style={{ background: mine ? WA.bubbleOut : WA.bubbleIn }}
		>
			<div className={`grid gap-0.5 ${gridClass}`}>
				{show.map((m, idx) => {
					const url = urls[m.id];
					const tall =
						count === 3 && idx === 0 ? 'row-span-2 min-h-[200px]' : 'min-h-[110px]';
					const isLast = idx === show.length - 1 && extra > 0;
					return (
						<button
							key={m.id}
							type="button"
							onClick={() => url && onOpenMedia?.(url, 'image')}
							className={`relative overflow-hidden bg-black/10 ${tall} ${
								count === 3 && idx === 0 ? 'col-span-1' : ''
							}`}
						>
							{url ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={url} alt="" className="h-full w-full object-cover" />
							) : (
								<div className="grid h-full place-items-center">
									<LoaderCircle className="h-5 w-5 animate-spin opacity-50" />
								</div>
							)}
							{isLast ? (
								<div className="absolute inset-0 grid place-items-center bg-black/45 text-2xl font-semibold text-white">
									+{extra}
								</div>
							) : null}
						</button>
					);
				})}
			</div>
			<div className="flex items-center justify-end gap-1 px-2 py-1 text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.50)' }}>
				<span>{formatTime(last?.createdAt || last?.providerTimestamp, locale)}</span>
				{mine ? <StatusTicks status={last?.status} /> : null}
			</div>
		</div>
	);
}

function MediaLightbox({ url, kind, onClose }) {
	useEffect(() => {
		if (!url) return undefined;
		const onKey = e => {
			if (e.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [url, onClose]);

	if (!url) return null;
	return (
		<div
			className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
			onClick={onClose}
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
			>
				<X className="h-6 w-6" />
			</button>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={url}
				alt=""
				className={`max-h-[92vh] max-w-[96vw] object-contain ${kind === 'sticker' ? 'drop-shadow-2xl' : ''}`}
				onClick={e => e.stopPropagation()}
			/>
		</div>
	);
}

function formatMoneyUsd(value) {
	const n = Number(value || 0);
	return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMoneyEgp(value) {
	const n = Number(value || 0);
	return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

/** Per-message rate card amounts (need more precision than invoice totals). */
function formatRateUsd(value) {
	const n = Number(value || 0);
	return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function formatRateEgp(value) {
	const n = Number(value || 0);
	return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} EGP`;
}

function MoneyDuo({ usd, egp, size = 'md', align = 'end' }) {
	const usdText = formatMoneyUsd(usd);
	const egpText = formatMoneyEgp(egp);
	const alignCls = align === 'start' ? 'items-start text-start' : align === 'center' ? 'items-center text-center' : 'items-end text-end';
	if (size === 'xl') {
		return (
			<div className={`flex flex-col ${alignCls}`}>
				<span className="text-[22px] font-bold tabular-nums tracking-tight text-white">{usdText}</span>
				<span className="text-[12px] font-semibold tabular-nums text-white/85">{egpText}</span>
			</div>
		);
	}
	if (size === 'lg') {
		return (
			<div className={`flex flex-col ${alignCls}`}>
				<span className="text-[16px] font-bold tabular-nums" style={{ color: WA.text }}>{usdText}</span>
				<span className="text-[11px] font-medium tabular-nums" style={{ color: WA.muted }}>{egpText}</span>
			</div>
		);
	}
	if (size === 'inline') {
		return (
			<span className="inline-flex items-baseline gap-1.5 tabular-nums whitespace-nowrap">
				<span className="text-[11px] font-bold" style={{ color: WA.text }}>{usdText}</span>
				<span className="text-[10px]" style={{ color: WA.muted }}>{egpText}</span>
			</span>
		);
	}
	return (
		<span className="inline-flex flex-col leading-tight tabular-nums" style={{ textAlign: align === 'start' ? 'start' : 'end' }}>
			<span className="text-[12px] font-bold" style={{ color: WA.text }}>{usdText}</span>
			<span className="text-[10px]" style={{ color: WA.muted }}>{egpText}</span>
		</span>
	);
}

const USAGE_CAT_STYLE = {
	MARKETING: { bg: '#FFF1E8', bar: '#F97316', text: '#C2410C' },
	UTILITY: { bg: '#E8F8F2', bar: '#14B8A6', text: '#0F766E' },
	AUTHENTICATION: { bg: '#EEF4FF', bar: '#3B82F6', text: '#1D4ED8' },
	SERVICE: { bg: '#ECFDF3', bar: '#22C55E', text: '#15803D' },
	UNKNOWN: { bg: '#F4F4F5', bar: '#A1A1AA', text: '#52525B' },
};

export default function MetaWhatsAppWorkspace() {
	const locale = useLocale();
	const isAr = locale === 'ar';
	const t = COPY[isAr ? 'ar' : 'en'];

	const [status, setStatus] = useState(null);
	const [loading, setLoading] = useState(true);
	const [flash, setFlash] = useState(null);
	const [error, setError] = useState(null);
	const [configOpen, setConfigOpen] = useState(false);
	const [activityOpen, setActivityOpen] = useState(false);
	const [usageOpen, setUsageOpen] = useState(false);
	const [usageData, setUsageData] = useState(null);
	const [usageLoading, setUsageLoading] = useState(false);
	const [usageMarket, setUsageMarket] = useState('EGYPT');
	const [phoneOpen, setPhoneOpen] = useState(false);
	const [phoneInput, setPhoneInput] = useState('');
	const [phoneName, setPhoneName] = useState('');
	const [phoneTouched, setPhoneTouched] = useState(false);
	const [phoneError, setPhoneError] = useState(null);
	const [openingPhone, setOpeningPhone] = useState(false);
	const [saving, setSaving] = useState(false);
	const [validating, setValidating] = useState(false);

	const [form, setForm] = useState(emptyConfigForm);
	const configDraftReady = useRef(false);
	const configDraftTimer = useRef(null);

	const [q, setQ] = useState('');
	const [filter, setFilter] = useState('all');
	const [conversations, setConversations] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const [active, setActive] = useState(null);
	const [messages, setMessages] = useState([]);
	const [draft, setDraft] = useState('');
	const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
	const [quickReplies, setQuickReplies] = useState([]);
	const [quickRepliesLoading, setQuickRepliesLoading] = useState(false);
	const [quickReplySaving, setQuickReplySaving] = useState(false);
	const [quickReplyFormOpen, setQuickReplyFormOpen] = useState(false);
	const [quickReplyTitle, setQuickReplyTitle] = useState('');
	const [quickReplyBody, setQuickReplyBody] = useState('');
	const [openingChatPhone, setOpeningChatPhone] = useState(false);
	/** messageId -> { open, loading, text, sourceLang, targetLang, error } */
	const [messageTranslations, setMessageTranslations] = useState({});
	const [templateName, setTemplateName] = useState('');
	const [templateLang, setTemplateLang] = useState(isAr ? 'ar' : 'en');
	const [templates, setTemplates] = useState([]);
	const [templatesLoading, setTemplatesLoading] = useState(false);
	const [templatesError, setTemplatesError] = useState(null);
	const [sidebarView, setSidebarView] = useState('chats'); // chats | templates
	const [templatesMode, setTemplatesMode] = useState('list'); // list | create | seed | library
	const [seedTemplates, setSeedTemplates] = useState([]);
	const [seedNote, setSeedNote] = useState('');
	const [seedSelected, setSeedSelected] = useState({});
	const [seedLoading, setSeedLoading] = useState(false);
	const [seedSubmitting, setSeedSubmitting] = useState(false);
	const [libraryItems, setLibraryItems] = useState([]);
	const [libraryVerification, setLibraryVerification] = useState([]);
	const [libraryLoading, setLibraryLoading] = useState(false);
	const [librarySearch, setLibrarySearch] = useState('');
	const [libraryCreatingKey, setLibraryCreatingKey] = useState('');
	const [libraryOpen, setLibraryOpen] = useState(false);
	const [verifyOpen, setVerifyOpen] = useState(false);
	const [verifyPhone, setVerifyPhone] = useState('');
	const [verifyTemplate, setVerifyTemplate] = useState(null); // { name, language, components?, body? }
	const [previewTemplate, setPreviewTemplate] = useState(null);
	const [deletingTemplateKey, setDeletingTemplateKey] = useState('');
	const [actionsMenuKey, setActionsMenuKey] = useState('');
	const [createFormErrors, setCreateFormErrors] = useState({});
	const [sendTemplateOpen, setSendTemplateOpen] = useState(false);
	const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
	const [templateVarValues, setTemplateVarValues] = useState({});
	const [templateVarErrors, setTemplateVarErrors] = useState({});
	const [creatingTemplate, setCreatingTemplate] = useState(false);
	const [createForm, setCreateForm] = useState(() => emptyCreateTemplateForm(isAr));
	const [editingTemplateId, setEditingTemplateId] = useState('');
	const [existingHeaderComponent, setExistingHeaderComponent] = useState(null);
	const [headerSampleFile, setHeaderSampleFile] = useState(null);
	const [headerSamplePreview, setHeaderSamplePreview] = useState('');
	const headerSampleRef = useRef(null);
	const [activity, setActivity] = useState([]);
	const [sending, setSending] = useState(false);
	const [recording, setRecording] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [recordingLevel, setRecordingLevel] = useState(0.2);
	const [mediaLightbox, setMediaLightbox] = useState(null); // { url, kind }
	const [initialConversation, setInitialConversation] = useState(null);
	const bottomRef = useRef(null);
	const messagesScrollRef = useRef(null);
	const fileRef = useRef(null);
	const imageRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const chunksRef = useRef([]);
	const recordingDiscardRef = useRef(false);
	const recordingStartedAtRef = useRef(0);
	const recordingAnalyserRef = useRef(null);
	const recordingRafRef = useRef(0);
	const recordingAudioCtxRef = useRef(null);
	const searchTimer = useRef(null);

	const webhookUrl = useMemo(() => resolveWebhookUrl(status), [status]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		const conv = params.get('conversation');
		if (conv) setInitialConversation(conv);
		if (params.get('tab') === 'settings') setConfigOpen(true);
	}, []);

	useEffect(() => {
		if (!configDraftReady.current) return undefined;
		clearTimeout(configDraftTimer.current);
		configDraftTimer.current = setTimeout(() => writeConfigDraft(form), 200);
		return () => clearTimeout(configDraftTimer.current);
	}, [form]);

	const loadStatus = useCallback(async () => {
		const data = await metaWhatsAppApi.status();
		setStatus(data);
		const localDraft = readConfigDraft();
		setForm(mergeConfigForm(data, localDraft));
		configDraftReady.current = true;
		if (!data.hasAccessToken || !data.enabled) setConfigOpen(true);
		return data;
	}, []);

	const loadConversations = useCallback(async (query = q) => {
		const rows = await metaWhatsAppApi.conversations({ q: query || undefined, limit: 100 });
		setConversations(Array.isArray(rows) ? rows : []);
	}, [q]);

	const loadMessages = useCallback(async conversationId => {
		if (!conversationId) return;
		const [conv, msgs] = await Promise.all([
			metaWhatsAppApi.conversation(conversationId),
			metaWhatsAppApi.messages(conversationId, { limit: 200 }),
		]);
		setActive(conv);
		setMessages(Array.isArray(msgs) ? msgs : []);
		void metaWhatsAppApi.markRead(conversationId).then(() => loadConversations()).catch(() => {});
	}, [loadConversations]);

	const bootstrap = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			await loadStatus();
			await loadConversations('');
		} catch (e) {
			setError(e?.response?.data?.message || t.loadError);
		} finally {
			setLoading(false);
		}
	}, [loadConversations, loadStatus, t.loadError]);

	useEffect(() => {
		void bootstrap();
	}, [bootstrap]);

	useEffect(() => {
		if (!initialConversation) return;
		setActiveId(initialConversation);
		void loadMessages(initialConversation);
	}, [initialConversation, loadMessages]);

	const scrollChatToBottom = useCallback((instant = true) => {
		const el = messagesScrollRef.current;
		const jump = () => {
			if (el) {
				el.scrollTop = el.scrollHeight;
			} else {
				bottomRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'end' });
			}
		};
		// Wait for bubbles to layout before jumping (avoids top→bottom animation)
		requestAnimationFrame(() => {
			jump();
			requestAnimationFrame(jump);
		});
	}, []);

	useEffect(() => {
		if (!activeId) return;
		// Open / update chat: jump to bottom instantly (no top→bottom smooth scroll)
		scrollChatToBottom(true);
	}, [messages, activeId, scrollChatToBottom]);

	// Live poll: always refresh chat list; also pull open-thread messages (webhook inbound)
	useEffect(() => {
		let cancelled = false;
		const tick = async () => {
			try {
				await loadConversations();
				if (cancelled || !activeId) return;
				const [conv, msgs] = await Promise.all([
					metaWhatsAppApi.conversation(activeId),
					metaWhatsAppApi.messages(activeId, { limit: 200 }),
				]);
				if (cancelled) return;
				if (conv) setActive(conv);
				if (Array.isArray(msgs)) {
					setMessages(prev => {
						const prevKey = prev.map(m => `${m.id}:${m.status}`).join('|');
						const nextKey = msgs.map(m => `${m.id}:${m.status}`).join('|');
						return prevKey === nextKey ? prev : msgs;
					});
				}
			} catch {
				/* ignore transient poll errors */
			}
		};
		const timer = setInterval(() => void tick(), 2500);
		const onFocus = () => void tick();
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', onFocus);
			window.addEventListener('focus', onFocus);
		}
		void tick();
		return () => {
			cancelled = true;
			clearInterval(timer);
			if (typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', onFocus);
				window.removeEventListener('focus', onFocus);
			}
		};
	}, [activeId, loadConversations]);

	useEffect(() => {
		if (!activityOpen) return;
		metaWhatsAppApi.activity(40).then(rows => setActivity(Array.isArray(rows) ? rows : [])).catch(() => setActivity([]));
	}, [activityOpen]);

	const loadUsageBilling = useCallback(async () => {
		setUsageLoading(true);
		try {
			const data = await metaWhatsAppApi.usageBilling();
			setUsageData(data);
		} catch (err) {
			setFlash(apiErrorMessage(err, t.usageLoadError));
			setUsageData(null);
		} finally {
			setUsageLoading(false);
		}
	}, [t.usageLoadError]);

	useEffect(() => {
		if (!usageOpen) return;
		void loadUsageBilling();
	}, [usageOpen, loadUsageBilling]);

	const loadTemplates = useCallback(async () => {
		setTemplatesLoading(true);
		setTemplatesError(null);
		try {
			const rows = await metaWhatsAppApi.templates();
			setTemplates(Array.isArray(rows) ? rows : []);
		} catch (err) {
			setTemplates([]);
			const msg = err?.response?.data?.message;
			setTemplatesError(typeof msg === 'string' ? msg : t.templateLoadError);
		} finally {
			setTemplatesLoading(false);
		}
	}, [t.templateLoadError]);

	useEffect(() => {
		if (!status?.hasAccessToken || !status?.wabaId) return;
		void loadTemplates();
	}, [status?.hasAccessToken, status?.wabaId, loadTemplates]);

	useEffect(() => {
		if (sidebarView === 'templates') void loadTemplates();
	}, [sidebarView, loadTemplates]);

	const filtered = useMemo(() => {
		let rows = conversations;
		if (filter === 'unread') rows = rows.filter(c => (c.unreadCount || 0) > 0);
		if (filter === 'leads') rows = rows.filter(c => c.leadId);
		return rows;
	}, [conversations, filter]);

	const approvedTemplates = useMemo(
		() =>
			templates.filter(x => String(x.status || '').toUpperCase() === 'APPROVED'),
		[templates],
	);

	const selectedTemplate = useMemo(() => {
		if (!selectedTemplateKey) return null;
		return (
			templates.find(x => `${x.name}::${x.language}` === selectedTemplateKey) || null
		);
	}, [selectedTemplateKey, templates]);

	const selectedPlaceholders = useMemo(
		() => extractTemplatePlaceholders(selectedTemplate?.components),
		[selectedTemplate],
	);

	const parsedPhone = useMemo(() => normalizeWaPhone(phoneInput), [phoneInput]);

	const connectionLabel =
		status?.connectionStatus === 'connected'
			? t.connected
			: status?.connectionStatus === 'error'
				? t.error
				: t.disconnected;

	function onSearchChange(value) {
		setQ(value);
		clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(() => {
			void loadConversations(value);
		}, 300);
	}

	function missingConnectionFields(nextStatus = status, nextForm = form) {
		const missing = [];
		if (!nextForm.phoneNumberId?.trim() && !nextStatus?.phoneNumberId) missing.push(t.phoneNumberId);
		if (!nextForm.wabaId?.trim() && !nextStatus?.wabaId) missing.push(t.wabaId);
		if (!nextForm.verifyToken?.trim() && !nextStatus?.verifyToken && !nextStatus?.hasVerifyToken) {
			missing.push(t.verifyToken);
		}
		if (!nextForm.accessToken?.trim() && !nextStatus?.hasAccessToken) missing.push(t.accessToken);
		if (!nextForm.appSecret?.trim() && !nextStatus?.hasAppSecret) missing.push(t.appSecret);
		return missing;
	}

	function apiErrorMessage(err, fallback = t.loadError) {
		const data = err?.response?.data;
		const status = err?.response?.status;
		const parts = [];

		const push = value => {
			const s = String(value || '').trim();
			if (s && !parts.includes(s)) parts.push(s);
		};

		const walk = value => {
			if (value == null) return;
			if (typeof value === 'string') {
				push(value);
				return;
			}
			if (Array.isArray(value)) {
				value.forEach(walk);
				return;
			}
			if (typeof value === 'object') {
				walk(value.message);
				walk(value.details);
				walk(value.error_user_msg);
				walk(value.error_user_title);
				walk(value.error);
				if (value.error_data) walk(value.error_data.details);
			}
		};

		walk(data?.message);
		walk(data?.error);
		walk(data?.details);
		if (!parts.length) walk(data);

		if (!parts.length) return fallback;
		const joined = parts.join(' — ');
		if (status && status !== 400 && !joined.includes(String(status))) {
			return `${joined} (HTTP ${status})`;
		}
		return joined;
	}

	async function persistConfig() {
		const payload = {
			phoneNumberId: form.phoneNumberId.trim(),
			wabaId: form.wabaId.trim(),
		};
		if (form.accessToken.trim()) payload.accessToken = form.accessToken.trim();
		if (form.verifyToken.trim()) payload.verifyToken = form.verifyToken.trim();
		if (form.appSecret.trim()) payload.appSecret = form.appSecret.trim();
		const data = await metaWhatsAppApi.saveConfig(payload);
		setStatus(data);
		const next = {
			accessToken: data.accessToken || form.accessToken || '',
			appSecret: data.appSecret || form.appSecret || '',
			phoneNumberId: data.phoneNumberId || form.phoneNumberId || '',
			wabaId: data.wabaId || form.wabaId || '',
			verifyToken: data.verifyToken || form.verifyToken || '',
		};
		setForm(next);
		writeConfigDraft(next);
		return data;
	}

	async function onSave(e) {
		e?.preventDefault?.();
		setSaving(true);
		setFlash(null);
		try {
			if (!form.phoneNumberId.trim()) {
				setFlash(`${t.missingRequired}: ${t.phoneNumberId}`);
				return;
			}
			await persistConfig();
			setFlash(t.saveOk);
		} catch (err) {
			setFlash(apiErrorMessage(err));
		} finally {
			setSaving(false);
		}
	}

	async function onValidate() {
		setValidating(true);
		setFlash(null);
		try {
			const missing = missingConnectionFields();
			if (missing.length) {
				setFlash(`${t.missingRequired}: ${missing.join(', ')}`);
				return;
			}
			const saved = await persistConfig();
			const stillMissing = missingConnectionFields(saved);
			if (stillMissing.length) {
				setFlash(`${t.missingRequired}: ${stillMissing.join(', ')}`);
				return;
			}
			const data = await metaWhatsAppApi.validate();
			const nextStatus = data.status || data;
			setStatus(nextStatus);
			if (nextStatus?.wabaId || data.wabaId) {
				const resolvedWaba = nextStatus?.wabaId || data.wabaId;
				setForm(f => {
					const next = { ...f, wabaId: resolvedWaba };
					writeConfigDraft(next);
					return next;
				});
			}
			setFlash(
				data.wabaAutoResolved
					? `${t.validateOk} — WABA auto-fixed`
					: t.validateOk,
			);
		} catch (err) {
			setFlash(apiErrorMessage(err));
			await loadStatus().catch(() => {});
		} finally {
			setValidating(false);
		}
	}

	async function onToggleEnabled() {
		setFlash(null);
		const enabling = !status?.enabled;
		try {
			if (enabling) {
				const missing = missingConnectionFields();
				if (missing.length) {
					setFlash(`${t.missingRequired}: ${missing.join(', ')}`);
					return;
				}
				await persistConfig();
			}
			const data = await metaWhatsAppApi.setEnabled(enabling);
			setStatus(data);
		} catch (err) {
			setFlash(apiErrorMessage(err));
		}
	}

	async function selectConversation(id) {
		setActiveId(id);
		setMessageTranslations({});
		await loadMessages(id);
	}

	async function onSync() {
		if (!activeId) return;
		setFlash(null);
		try {
			const data = await metaWhatsAppApi.syncConversation(activeId);
			setActive(data.conversation);
			setMessages(Array.isArray(data.messages) ? data.messages : []);
			setFlash(data.metaHistoryNote || t.syncHint);
			await loadConversations();
		} catch (err) {
			setFlash(err?.response?.data?.message || t.loadError);
		}
	}

	async function onOpenPhone(e) {
		e.preventDefault();
		setPhoneTouched(true);
		const raw = phoneInput.trim();
		if (!raw) {
			setPhoneError(t.phoneRequired);
			return;
		}
		const waId = normalizeWaPhone(raw);
		if (!waId) {
			setPhoneError(t.phoneInvalid);
			return;
		}
		setPhoneError(null);
		setOpeningPhone(true);
		try {
			const conv = await metaWhatsAppApi.openPhone(waId, phoneName.trim() || undefined);
			setPhoneOpen(false);
			setPhoneInput('');
			setPhoneName('');
			setPhoneTouched(false);
			setFlash(conv.metaHistoryNote || null);
			await loadConversations();
			await selectConversation(conv.id);
		} catch (err) {
			const msg = err?.response?.data?.message;
			setPhoneError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : t.phoneInvalid);
		} finally {
			setOpeningPhone(false);
		}
	}

	async function openChatFromPhoneNumber(waId, displayHint) {
		if (!waId || openingChatPhone) return;
		setOpeningChatPhone(true);
		setFlash(t.openPhoneFromChat);
		try {
			const conv = await metaWhatsAppApi.openPhone(waId, displayHint || undefined);
			setFlash(null);
			await loadConversations();
			await selectConversation(conv.id);
		} catch (err) {
			setFlash(err?.response?.data?.message || t.phoneInvalid);
		} finally {
			setOpeningChatPhone(false);
		}
	}

	async function toggleMessageTranslation(message) {
		const id = message?.id;
		if (!id) return;
		const existing = messageTranslations[id];
		if (existing?.open && existing.text) {
			setMessageTranslations(prev => ({
				...prev,
				[id]: { ...prev[id], open: false },
			}));
			return;
		}
		if (existing?.text && !existing.error) {
			setMessageTranslations(prev => ({
				...prev,
				[id]: { ...prev[id], open: true, error: null },
			}));
			return;
		}

		const text = getMessageTranslateText(message, templates);
		if (!text) return;
		const targetLang = detectTranslateTarget(text);

		setMessageTranslations(prev => ({
			...prev,
			[id]: {
				...(prev[id] || {}),
				open: true,
				loading: true,
				error: null,
				targetLang,
			},
		}));

		try {
			const result = await metaWhatsAppApi.translate(text, targetLang);
			setMessageTranslations(prev => ({
				...prev,
				[id]: {
					open: true,
					loading: false,
					text: String(result?.translatedText || '').trim(),
					sourceLang: result?.sourceLang || (targetLang === 'ar' ? 'en' : 'ar'),
					targetLang: result?.targetLang || targetLang,
					error: null,
				},
			}));
		} catch (err) {
			const msg = err?.response?.data?.message;
			setMessageTranslations(prev => ({
				...prev,
				[id]: {
					...(prev[id] || {}),
					open: true,
					loading: false,
					error: typeof msg === 'string' ? msg : t.translateFailed,
				},
			}));
		}
	}

	async function loadQuickReplies() {
		setQuickRepliesLoading(true);
		try {
			const rows = await metaWhatsAppApi.listQuickReplies();
			setQuickReplies(Array.isArray(rows) ? rows : []);
		} catch {
			setQuickReplies([]);
		} finally {
			setQuickRepliesLoading(false);
		}
	}

	async function openQuickReplies() {
		setQuickRepliesOpen(true);
		setQuickReplyFormOpen(false);
		await loadQuickReplies();
	}

	function useQuickReply(reply) {
		if (!reply?.body) return;
		setDraft(String(reply.body));
		setQuickRepliesOpen(false);
	}

	async function saveQuickReply(e) {
		e?.preventDefault?.();
		const title = quickReplyTitle.trim();
		const body = quickReplyBody.trim() || draft.trim();
		if (!title || !body) {
			setFlash(isAr ? 'العنوان والنص مطلوبان' : 'Title and reply text are required');
			return;
		}
		setQuickReplySaving(true);
		try {
			await metaWhatsAppApi.createQuickReply({ title, body });
			setQuickReplyTitle('');
			setQuickReplyBody('');
			setQuickReplyFormOpen(false);
			setFlash(t.fastReplySaved);
			await loadQuickReplies();
		} catch (err) {
			setFlash(err?.response?.data?.message || t.loadError);
		} finally {
			setQuickReplySaving(false);
		}
	}

	async function deleteQuickReply(id) {
		if (!id) return;
		try {
			await metaWhatsAppApi.deleteQuickReply(id);
			setFlash(t.fastReplyDeleted);
			await loadQuickReplies();
		} catch (err) {
			setFlash(err?.response?.data?.message || t.loadError);
		}
	}

	async function onSendText(e) {
		e.preventDefault();
		if (!activeId || !draft.trim()) return;
		setSending(true);
		try {
			await metaWhatsAppApi.sendText({ conversationId: activeId, text: draft.trim() });
			setDraft('');
			await loadMessages(activeId);
			await loadConversations();
		} catch (err) {
			setFlash(err?.response?.data?.message || t.sendError);
		} finally {
			setSending(false);
		}
	}

	async function onSendTemplate(e) {
		e?.preventDefault?.();
		if (!activeId || !selectedTemplate) return;
		const fieldErrors = validateTemplateSendValues(
			selectedPlaceholders,
			templateVarValues,
			t,
		);
		setTemplateVarErrors(fieldErrors);
		if (Object.keys(fieldErrors).length) {
			setFlash(Object.values(fieldErrors)[0]);
			return;
		}
		setSending(true);
		setFlash(null);
		try {
			const components = buildTemplateSendComponents(
				selectedPlaceholders,
				templateVarValues,
			);
			await metaWhatsAppApi.sendTemplate({
				conversationId: activeId,
				templateName: selectedTemplate.name,
				language: selectedTemplate.language || 'en',
				components,
			});
			setSendTemplateOpen(false);
			setSelectedTemplateKey('');
			setTemplateVarValues({});
			setTemplateVarErrors({});
			setTemplateName('');
			await loadMessages(activeId);
			await loadConversations();
		} catch (err) {
			setFlash(err?.response?.data?.message || t.sendError);
		} finally {
			setSending(false);
		}
	}

	async function onCreateTemplate(e) {
		e.preventDefault();
		const isEditing = Boolean(editingTemplateId);
		const keepExistingMedia =
			isEditing &&
			['IMAGE', 'VIDEO', 'DOCUMENT'].includes(String(createForm.headerFormat || '').toUpperCase()) &&
			Boolean(existingHeaderComponent) &&
			!headerSampleFile;
		const errors = validateCreateTemplateForm(createForm, t, {
			hasHeaderSample: Boolean(
				headerSampleFile || createForm.headerHandle || keepExistingMedia,
			),
		});
		setCreateFormErrors(errors);
		if (Object.keys(errors).length) {
			setFlash(Object.values(errors)[0]);
			return;
		}
		setCreatingTemplate(true);
		setFlash(null);
		try {
			const safeName = createForm.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
			const headerFormat = String(createForm.headerFormat || 'NONE').toUpperCase();
			let headerHandle = createForm.headerHandle || undefined;
			if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat) && headerSampleFile) {
				const uploaded = await metaWhatsAppApi.uploadTemplateHeader(headerSampleFile);
				headerHandle = uploaded?.headerHandle;
				if (!headerHandle) throw new Error(t.headerSampleRequired);
			}
			const payload = {
				headerFormat,
				headerText:
					headerFormat === 'TEXT' ? createForm.headerText.trim() || undefined : undefined,
				headerHandle: ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)
					? headerHandle
					: undefined,
				existingHeaderComponent:
					keepExistingMedia && !headerHandle ? existingHeaderComponent : undefined,
				bodyText: createForm.bodyText.trim(),
				footerText: createForm.footerText.trim() || undefined,
				buttons: (createForm.buttons || [])
					.filter(b => String(b.text || '').trim())
					.map(b => ({
						type: b.type,
						text: String(b.text).trim(),
						url: b.url?.trim() || undefined,
						phone_number: b.phone_number?.trim() || undefined,
					})),
				exampleBodyParams: exampleParamsFromText(createForm.bodyText),
				exampleHeaderParams:
					headerFormat === 'TEXT' ? exampleParamsFromText(createForm.headerText) : undefined,
			};
			if (isEditing) {
				// Meta rejects category changes on APPROVED templates (#100).
				await metaWhatsAppApi.updateTemplate(editingTemplateId, payload);
				setFlash(t.templateEditOk);
			} else {
				const { existingHeaderComponent: _keep, ...createPayload } = payload;
				await metaWhatsAppApi.createTemplate({
					...createPayload,
					category: createForm.category,
					name: safeName,
					language: createForm.language.trim() || 'en_US',
				});
				setFlash(t.templateCreateOk);
			}
			resetCreateTemplate();
			setTemplatesMode('list');
			await loadTemplates();
		} catch (err) {
			setFlash(apiErrorMessage(err, t.sendError));
		} finally {
			setCreatingTemplate(false);
		}
	}

	function resetCreateTemplate() {
		setCreateForm(emptyCreateTemplateForm(isAr));
		setEditingTemplateId('');
		setExistingHeaderComponent(null);
		setHeaderSampleFile(null);
		if (headerSamplePreview) URL.revokeObjectURL(headerSamplePreview);
		setHeaderSamplePreview('');
		setCreateFormErrors({});
		setFlash(null);
	}

	function openEditTemplate(tpl) {
		if (!canEditMetaTemplate(tpl)) {
			setFlash(t.templateCannotEdit);
			return;
		}
		const headerFormat = templateHeaderFormat(tpl.components) || 'NONE';
		setCreateForm(formFromMetaTemplate(tpl, isAr));
		setEditingTemplateId(String(tpl.id));
		setExistingHeaderComponent(
			['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)
				? templateHeaderComponent(tpl.components)
				: null,
		);
		setHeaderSampleFile(null);
		if (headerSamplePreview) URL.revokeObjectURL(headerSamplePreview);
		setHeaderSamplePreview('');
		setCreateFormErrors({});
		setActionsMenuKey('');
		setPreviewTemplate(null);
		setTemplatesMode('create');
		setFlash(null);
	}

	function onHeaderSamplePick(file) {
		if (!file) return;
		setHeaderSampleFile(file);
		setExistingHeaderComponent(null);
		if (headerSamplePreview) URL.revokeObjectURL(headerSamplePreview);
		if (String(file.type || '').startsWith('image/')) {
			setHeaderSamplePreview(URL.createObjectURL(file));
		} else {
			setHeaderSamplePreview('');
		}
		setCreateFormErrors(err => ({ ...err, headerSample: undefined }));
	}

	function insertBodyVar() {
		const existing = [
			...String(createForm.bodyText || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g),
		].map(m => Number(m[1]));
		const next = existing.length ? Math.max(...existing) + 1 : 1;
		setCreateForm(f => ({ ...f, bodyText: `${f.bodyText}{{${next}}}` }));
		setCreateFormErrors(err => ({ ...err, bodyText: undefined }));
	}

	function addTemplateButton(type = 'QUICK_REPLY') {
		setCreateForm(f => {
			if ((f.buttons || []).length >= 10) return f;
			return {
				...f,
				buttons: [
					...(f.buttons || []),
					{ id: nextButtonId(), type, text: '', url: '', phone_number: '' },
				],
			};
		});
	}

	async function loadSeedTemplates() {
		setSeedLoading(true);
		setTemplatesError(null);
		try {
			const data = await metaWhatsAppApi.seedTemplates();
			const rows = Array.isArray(data?.templates) ? data.templates : [];
			setSeedTemplates(rows);
			setSeedNote(data?.note || '');
			const next = {};
			rows.forEach(row => {
				next[row.key] = true;
			});
			setSeedSelected(next);
			setTemplatesMode('seed');
		} catch (err) {
			setTemplatesError(apiErrorMessage(err, t.templateLoadError));
		} finally {
			setSeedLoading(false);
		}
	}

	async function submitSeedTemplates(all = false) {
		const keys = all
			? seedTemplates.map(s => s.key)
			: Object.keys(seedSelected).filter(k => seedSelected[k]);
		if (!keys.length) {
			setFlash(t.templatePick);
			return;
		}
		setSeedSubmitting(true);
		setFlash(null);
		setTemplatesError(null);
		try {
			const data = await metaWhatsAppApi.submitSeedTemplates({ keys });
			const failed = data?.results?.filter(r => !r.ok) || [];
			if (failed.length) {
				setFlash(
					failed.map(f => `${f.name}: ${f.error || 'failed'}`).join(' | ') ||
						t.sendError,
				);
			} else {
				setFlash(
					`${t.seedSubmitted} (${data?.submitted || keys.length}) — pending Meta review`,
				);
			}
			await loadTemplates();
		} catch (err) {
			setFlash(apiErrorMessage(err, t.sendError));
		} finally {
			setSeedSubmitting(false);
		}
	}

	async function cloneOutreachAsUtility() {
		setSeedSubmitting(true);
		setFlash(null);
		setTemplatesError(null);
		try {
			const data = await metaWhatsAppApi.cloneTemplates({
				names: ['so7ba_fitness_outreach_ar', 'so7ba_fitness_outreach_en'],
				category: 'UTILITY',
				nameMap: {
					so7ba_fitness_outreach_ar: 'so7ba_fitness_util_ar',
					so7ba_fitness_outreach_en: 'so7ba_fitness_util_en',
				},
			});
			const failed = data?.results?.filter(r => !r.ok) || [];
			if (failed.length) {
				setFlash(
					failed
						.map(f => `${f.sourceName}: ${f.error || 'failed'}`)
						.join(' | ') || t.sendError,
				);
			} else {
				const names = (data?.results || [])
					.filter(r => r.ok)
					.map(r => r.newName)
					.join(', ');
				setFlash(
					`${t.cloneAsUtilityOk}${names ? `: ${names}` : ''} — pending Meta review`,
				);
			}
			await loadTemplates();
		} catch (err) {
			setFlash(apiErrorMessage(err, t.sendError));
		} finally {
			setSeedSubmitting(false);
		}
	}

	async function loadMetaLibrary(search = librarySearch) {
		setLibraryOpen(true);
		setLibraryLoading(true);
		setFlash(null);
		setTemplatesError(null);
		try {
			const data = await metaWhatsAppApi.templateLibrary({
				search: search?.trim() || undefined,
				language: isAr ? 'ar' : undefined,
			});
			setLibraryVerification(Array.isArray(data?.verification) ? data.verification : []);
			setLibraryItems(Array.isArray(data?.templates) ? data.templates : []);
		} catch (err) {
			setFlash(apiErrorMessage(err, t.metaLibraryLoadError));
		} finally {
			setLibraryLoading(false);
		}
	}

	function openVerifySend(tpl) {
		if (!tpl?.name) return;
		setFlash(null);
		setActionsMenuKey('');
		setVerifyTemplate({
			name: tpl.name,
			language: tpl.language || 'en_US',
			components: tpl.components || null,
			body: tpl.body || templatePreviewText(tpl.components) || '',
			isVerification: Boolean(tpl.isVerification),
		});
		setVerifyPhone(active?.waId || '');
		setTemplateVarValues({});
		setVerifyOpen(true);
	}

	async function copyTemplateName(name) {
		try {
			await navigator.clipboard.writeText(String(name || ''));
			setFlash(t.templateCopied);
		} catch {
			setFlash(t.sendError);
		}
		setActionsMenuKey('');
	}

	async function onDeleteTemplate(tpl) {
		if (!tpl?.name) return;
		const key = `${tpl.id || tpl.name}::${tpl.language || ''}`;
		if (!window.confirm(t.templateDeleteConfirm)) return;
		setDeletingTemplateKey(key);
		setFlash(null);
		setActionsMenuKey('');
		try {
			await metaWhatsAppApi.deleteTemplate({
				name: tpl.name,
				...(tpl.id ? { hsmId: tpl.id } : {}),
			});
			setFlash(t.templateDeleted);
			if (previewTemplate?.name === tpl.name) setPreviewTemplate(null);
			await loadTemplates();
		} catch (err) {
			setFlash(apiErrorMessage(err, t.sendError));
		} finally {
			setDeletingTemplateKey('');
		}
	}

	async function onAddFromLibrary(item) {
		const libraryName = item?.libraryTemplateName || item?.name;
		if (!libraryName) return;
		const key = `${libraryName}::${item.language || 'en_US'}`;
		setLibraryCreatingKey(key);
		setFlash(null);
		try {
			const slug = String(libraryName)
				.toLowerCase()
				.replace(/[^a-z0-9_]+/g, '_')
				.slice(0, 40);
			const buttons = item.buttons || item.raw?.buttons || [];
			await metaWhatsAppApi.createFromLibrary({
				name: `${slug}_${Date.now().toString(36).slice(-4)}`,
				language: item.language || (isAr ? 'ar' : 'en_US'),
				category: item.category || 'UTILITY',
				libraryTemplateName: libraryName,
				buttons,
				buttonUrl: isAr ? 'https://so7bafit.com/ar/presentation' : 'https://so7bafit.com/en/presentation',
				buttonPhone: status?.displayPhoneNumber || undefined,
			});
			setFlash(t.libraryAdded);
			await loadTemplates();
		} catch (err) {
			setFlash(apiErrorMessage(err, t.sendError));
		} finally {
			setLibraryCreatingKey('');
		}
	}

	async function onVerifySend(e) {
		e?.preventDefault?.();
		if (!verifyTemplate?.name) return;
		const raw = String(verifyPhone || '').trim();
		if (!raw) {
			setFlash(t.phoneRequired);
			return;
		}
		const waId = normalizeWaPhone(raw);
		if (!waId) {
			setFlash(t.phoneInvalid);
			return;
		}
		const placeholders = extractTemplatePlaceholders(verifyTemplate.components);
		const fieldErrors = validateTemplateSendValues(placeholders, templateVarValues, t);
		setTemplateVarErrors(fieldErrors);
		if (Object.keys(fieldErrors).length) {
			setFlash(Object.values(fieldErrors)[0]);
			return;
		}
		setSending(true);
		setFlash(null);
		try {
			const components = buildTemplateSendComponents(placeholders, templateVarValues);
			await metaWhatsAppApi.sendTemplate({
				phone: waId,
				templateName: verifyTemplate.name,
				language: verifyTemplate.language || 'en_US',
				components,
			});
			setVerifyOpen(false);
			setVerifyTemplate(null);
			setTemplateVarErrors({});
			setFlash(t.verifySendOk);
			await loadConversations();
			if (activeId) await loadMessages(activeId);
		} catch (err) {
			setFlash(apiErrorMessage(err, t.sendError));
		} finally {
			setSending(false);
		}
	}

	function openSendTemplate() {
		setFlash(null);
		setTemplateVarErrors({});
		setSendTemplateOpen(true);
		void loadTemplates();
	}

	async function uploadFile(file, { asVoice = false, caption = '' } = {}) {
		if (!activeId || !file) return;
		setSending(true);
		setFlash(null);
		try {
			await metaWhatsAppApi.sendMedia({
				conversationId: activeId,
				file,
				caption,
				asVoice,
			});
			await loadMessages(activeId);
			await loadConversations();
		} catch (err) {
			setFlash(err?.response?.data?.message || t.sendError);
		} finally {
			setSending(false);
		}
	}

	function cleanupRecordingMeters() {
		if (recordingRafRef.current) {
			cancelAnimationFrame(recordingRafRef.current);
			recordingRafRef.current = 0;
		}
		try {
			recordingAudioCtxRef.current?.close?.();
		} catch {
			/* ignore */
		}
		recordingAudioCtxRef.current = null;
		recordingAnalyserRef.current = null;
		setRecordingLevel(0.2);
		setRecordingSeconds(0);
	}

	async function startRecording() {
		if (!active?.canSendFreeform) {
			setFlash(t.windowClosed);
			return;
		}
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
			setFlash(isAr ? 'المتصفح لا يدعم تسجيل الصوت' : 'Browser does not support voice recording');
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					channelCount: 1,
				},
			});
			const preferred = [
				'audio/ogg;codecs=opus',
				'audio/webm;codecs=opus',
				'audio/webm',
				'audio/mp4',
			];
			const mimeType =
				preferred.find(tp => {
					try {
						return MediaRecorder.isTypeSupported(tp);
					} catch {
						return false;
					}
				}) || '';
			const recorder = mimeType
				? new MediaRecorder(stream, { mimeType })
				: new MediaRecorder(stream);
			chunksRef.current = [];
			recordingDiscardRef.current = false;
			recorder.ondataavailable = ev => {
				if (ev.data?.size) chunksRef.current.push(ev.data);
			};
			recorder.onerror = () => {
				stream.getTracks().forEach(tr => tr.stop());
				cleanupRecordingMeters();
				setRecording(false);
				setFlash(isAr ? 'فشل تسجيل الصوت' : 'Voice recording failed');
			};
			recorder.onstop = async () => {
				stream.getTracks().forEach(tr => tr.stop());
				cleanupRecordingMeters();
				const discarded = recordingDiscardRef.current;
				recordingDiscardRef.current = false;
				if (discarded) return;
				const type = recorder.mimeType || mimeType || 'audio/webm';
				const blob = new Blob(chunksRef.current, { type });
				if (!blob.size) {
					setFlash(isAr ? 'التسجيل فاضي — جرب تاني' : 'Empty recording — try again');
					return;
				}
				const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
				const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || type });
				try {
					await uploadFile(file, { asVoice: true });
				} catch {
					/* uploadFile already flashes */
				}
			};
			mediaRecorderRef.current = recorder;
			recorder.start(250);

			// Live timer + mic level meter (WhatsApp-like feedback)
			recordingStartedAtRef.current = Date.now();
			setRecordingSeconds(0);
			try {
				const Ctx = window.AudioContext || window.webkitAudioContext;
				if (Ctx) {
					const ctx = new Ctx();
					const source = ctx.createMediaStreamSource(stream);
					const analyser = ctx.createAnalyser();
					analyser.fftSize = 256;
					source.connect(analyser);
					recordingAudioCtxRef.current = ctx;
					recordingAnalyserRef.current = analyser;
					const data = new Uint8Array(analyser.frequencyBinCount);
					const tick = () => {
						const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
						setRecordingSeconds(elapsed);
						analyser.getByteFrequencyData(data);
						let sum = 0;
						for (let i = 0; i < data.length; i += 1) sum += data[i];
						const avg = sum / (data.length || 1) / 255;
						setRecordingLevel(Math.max(0.12, Math.min(1, avg * 1.8)));
						recordingRafRef.current = requestAnimationFrame(tick);
					};
					recordingRafRef.current = requestAnimationFrame(tick);
				} else {
					recordingRafRef.current = requestAnimationFrame(function tick() {
						setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
						setRecordingLevel(0.25 + Math.random() * 0.55);
						recordingRafRef.current = requestAnimationFrame(tick);
					});
				}
			} catch {
				recordingRafRef.current = requestAnimationFrame(function tick() {
					setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
					setRecordingLevel(0.25 + Math.random() * 0.55);
					recordingRafRef.current = requestAnimationFrame(tick);
				});
			}

			setRecording(true);
			setFlash(null);
		} catch (err) {
			const name = String(err?.name || '');
			setFlash(
				name === 'NotAllowedError' || name === 'PermissionDeniedError'
					? isAr
						? 'اسمح بالوصول للميكروفون من إعدادات المتصفح'
						: 'Allow microphone access in browser settings'
					: isAr
						? 'لا يمكن الوصول للميكروفون'
						: 'Microphone permission denied',
			);
		}
	}

	function stopRecording() {
		const recorder = mediaRecorderRef.current;
		recordingDiscardRef.current = false;
		if (recorder && recorder.state !== 'inactive') {
			try {
				recorder.requestData?.();
			} catch {
				/* ignore */
			}
			recorder.stop();
		}
		cleanupRecordingMeters();
		setRecording(false);
	}

	function cancelRecording() {
		const recorder = mediaRecorderRef.current;
		recordingDiscardRef.current = true;
		chunksRef.current = [];
		if (recorder && recorder.state !== 'inactive') {
			recorder.stop();
		}
		cleanupRecordingMeters();
		setRecording(false);
	}

	if (loading) {
		return (
			<div className="grid min-h-[70vh] place-items-center" style={{ background: WA.shell }}>
				<LoaderCircle className="h-7 w-7 animate-spin text-[#00A884]" />
			</div>
		);
	}

	return (
		<div
			dir={isAr ? 'rtl' : 'ltr'}
			className="relative flex min-h-[480px] w-auto overflow-hidden"
			style={{
				background: WA.shell,
				color: WA.text,
				fontFamily: WA.font,
				height: 'calc(100vh - 31px)',
				marginTop: 16,
				marginBottom: 15,
				marginInlineEnd: 16,
				borderRadius: WA.radius,
				boxShadow: WA.shadow,
			}}
		>
			{/* Floating Meta-style error/success toast */}
			{(flash || error || templatesError) && (
				<div className="pointer-events-none absolute inset-x-0 top-3 z-[70] flex justify-center px-4">
					<div className="pointer-events-auto w-full max-w-2xl">
						<AlertBanner
							floating
							message={templatesError || flash || error}
							tone={
								templatesError || error || !isSuccessFlash(flash, t)
									? 'error'
									: 'success'
							}
							onClose={() => {
								setFlash(null);
								setError(null);
								setTemplatesError(null);
							}}
							t={t}
						/>
					</div>
				</div>
			)}

			{/* Left rail — WhatsApp Desktop */}
			<aside
				className="relative hidden w-[68px] shrink-0 flex-col items-center justify-between px-2.5 pb-2.5 pt-11 md:flex"
				style={{ background: WA.rail, borderInlineEnd: `1px solid ${WA.border}` }}
			>
				<div className="absolute start-2 top-2 flex items-center gap-2">
					<span className="h-3 w-3 rounded-full" style={{ background: '#FF5F57', outline: '0.5px solid #E34239' }} />
					<span className="h-3 w-3 rounded-full" style={{ background: '#FEBC2E', outline: '0.5px solid #E19D1A' }} />
					<span className="h-3 w-3 rounded-full" style={{ background: '#28C840', outline: '0.5px solid #1CA926' }} />
				</div>
				<div className="flex flex-col items-center gap-1">
					<RailBtn active={sidebarView === 'chats'} onClick={() => setSidebarView('chats')} title={t.chats} badge={conversations.reduce((n, c) => n + (c.unreadCount || 0), 0) || false}>
						<MessageCircle className="h-6 w-6" strokeWidth={1.75} />
					</RailBtn>
					<RailBtn
						active={sidebarView === 'templates'}
						onClick={() => {
							setSidebarView('templates');
							setTemplatesMode('list');
						}}
						title={t.templates}
					>
						<LayoutTemplate className="h-6 w-6" strokeWidth={1.75} />
					</RailBtn>
					<RailBtn active={false} onClick={() => setPhoneOpen(true)} title={t.openPhone}>
						<Phone className="h-6 w-6" strokeWidth={1.75} />
					</RailBtn>
					<div className="my-1 h-px w-full" style={{ background: WA.separator }} />
					<RailBtn
						active={configOpen}
						onClick={() => setConfigOpen(true)}
						title={t.settings}
						badge={!(status?.enabled && status?.connectionStatus === 'connected')}
					>
						<Settings2 className="h-6 w-6" strokeWidth={1.75} />
					</RailBtn>
					<RailBtn active={false} onClick={() => void bootstrap()} title={t.refresh}>
						<RefreshCw className="h-6 w-6" strokeWidth={1.75} />
					</RailBtn>
					<RailBtn active={activityOpen} onClick={() => setActivityOpen(true)} title={t.activity}>
						<ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
					</RailBtn>
					<RailBtn active={usageOpen} onClick={() => setUsageOpen(true)} title={t.usageBilling}>
						<ChartColumn className="h-6 w-6" strokeWidth={1.75} />
					</RailBtn>
				</div>
				<Link href={`/${locale}/dashboard/fitness-leads`} title={t.backLeads} className="flex h-12 w-12 items-center justify-center rounded-md" style={{ color: WA.icon }}>
					<Radar className="h-5 w-5" strokeWidth={1.75} />
				</Link>
			</aside>

			{/* Chat list — hidden on templates tab (templates use full chat pane) */}
			{sidebarView === 'chats' ? (
			<section
				className={`${activeId ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col md:max-w-[314px] md:min-w-[241px] md:w-[314px]`}
				style={{ background: WA.panel, borderInlineEnd: `1px solid ${WA.border}` }}
			>
						<header className="flex flex-col gap-2.5 px-2.5 pb-2 pt-2.5">
							<div className="flex items-center gap-4 px-2.5">
								<h1 className="flex-1 text-[17px] font-bold" style={{ color: WA.text }}>{t.chats}</h1>
								<button
									type="button"
									onClick={() => {
										setPhoneError(null);
										setPhoneTouched(false);
										setPhoneOpen(true);
									}}
									title={t.openPhone}
									className="rounded-md p-1"
									style={{ color: WA.icon }}
								>
									<Plus className="h-6 w-6" strokeWidth={1.75} />
								</button>
							</div>
							<div
								className="flex items-center gap-1.5 rounded-md px-2 py-2"
								style={{ outline: `1px solid ${WA.searchBorder}`, outlineOffset: -1 }}
							>
								<Search className="h-4 w-4 shrink-0" style={{ color: WA.muted }} />
								<input
									value={q}
									onChange={e => onSearchChange(e.target.value)}
									placeholder={t.search}
									className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-black/50"
									style={{ color: WA.text }}
								/>
							</div>
							<div className="flex items-center gap-2 px-1">
								{[
									{ id: 'all', label: t.all },
									{ id: 'unread', label: t.unread },
									{ id: 'leads', label: t.leads },
								].map(chip => (
									<button
										key={chip.id}
										type="button"
										onClick={() => setFilter(chip.id)}
										className="rounded-full px-3 py-1 text-[12px] font-medium"
										style={{
											background: filter === chip.id ? WA.greenSoft : WA.field,
											color: filter === chip.id ? WA.greenText : WA.muted,
										}}
									>
										{chip.label}
									</button>
								))}
							</div>
						</header>

						<div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 pb-5">
							<div className="min-h-0 flex-1 overflow-y-auto">
								{!filtered.length ? (
									<div className="px-4 py-16 text-center">
										<p className="text-[14px] font-semibold" style={{ color: WA.text }}>{t.noConversations}</p>
										<p className="mt-2 text-[13px]" style={{ color: WA.muted }}>{t.noConversationsHint}</p>
									</div>
								) : (
									filtered.map(c => {
										const selected = activeId === c.id;
										const name = c.displayName || c.businessName || c.waId;
										return (
											<button
												key={c.id}
												type="button"
												onClick={() => void selectConversation(c.id)}
												className="flex w-full items-start gap-2.5 rounded-md px-2 py-2.5 text-start"
												style={{ background: selected ? WA.selected : 'transparent' }}
											>
												<Avatar name={name} size={48} />
												<div className="flex min-w-0 flex-1 gap-2 pt-1">
													<div className="min-w-0 flex-1">
														<div className="truncate text-[14px] font-semibold" style={{ color: WA.text }}>{name}</div>
														<p className={`mt-0.5 truncate text-[13px] ${c.unreadCount ? 'font-medium' : ''}`} style={{ color: WA.muted }}>
															{String(c.lastMessagePreview || '')
																.replace(/^\[template:(.*)\]$/, '$1')
																.replace(/^Template:\s*/i, '') || c.waId}
														</p>
													</div>
													<div className="flex shrink-0 flex-col items-end gap-1.5">
														<span className="text-[13px]" style={{ color: c.unreadCount ? WA.greenText : WA.muted }}>
															{formatTime(c.lastMessageAt, locale)}
														</span>
														{c.unreadCount > 0 && (
															<span className="grid min-h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[13px] text-white" style={{ background: WA.green }}>
																{c.unreadCount}
															</span>
														)}
													</div>
												</div>
											</button>
										);
									})
								)}
							</div>
							<p className="mt-4 px-2 text-center text-[10px]" style={{ color: WA.muted }}>
								{t.encryption}
							</p>
						</div>
			</section>
			) : null}

			<section
				className={`${activeId || sidebarView === 'templates' ? 'flex' : 'hidden md:flex'} relative min-w-0 flex-1 flex-col overflow-hidden`}
				style={{
					minWidth: 0,
					...(sidebarView === 'templates'
						? { backgroundColor: WA.panel }
						: chatWallpaperStyle),
				}}
			>
				{sidebarView === 'templates' ? (
					templatesMode === 'create' ? (
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
							<header className="flex items-center justify-between gap-2 px-5 py-3" style={{ background: WA.header, borderBottom: '0.5px solid rgba(0,0,0,0.12)' }}>
								<div>
									<div className="text-[14px] font-bold" style={{ color: WA.text }}>
										{editingTemplateId ? t.editTemplate : t.createTemplate}
									</div>
									<div className="text-[12px]" style={{ color: WA.muted }}>
										{editingTemplateId ? t.templateEditLocked : t.templateMetaDetails}
									</div>
								</div>
								<button
									type="button"
									onClick={() => {
										resetCreateTemplate();
										setTemplatesMode('list');
									}}
									className="inline-flex h-9 items-center rounded-xl border px-3.5 text-[12px] font-semibold transition hover:bg-white"
									style={{ borderColor: WA.border, background: WA.panel, color: WA.text }}
								>
									{t.backToTemplates}
								</button>
							</header>
							<div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-2">
								<form onSubmit={onCreateTemplate} className="min-h-0 space-y-3 overflow-y-auto border-b p-4 lg:border-b-0 lg:border-e" style={{ borderColor: WA.border }}>
									<label className="block space-y-1">
										<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateName} *</span>
										<input
											value={createForm.name}
											disabled={Boolean(editingTemplateId)}
											onChange={e => {
												const name = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
												setCreateForm(f => ({ ...f, name }));
												setCreateFormErrors(err => ({ ...err, name: undefined }));
											}}
											placeholder="hello_world"
											className="w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60"
											style={{ borderColor: createFormErrors.name ? '#F87171' : WA.border, background: WA.field }}
										/>
										{createFormErrors.name ? <p className="text-[11px] text-rose-600">{createFormErrors.name}</p> : null}
									</label>
									<div className="flex gap-2">
										<label className="block w-1/2 space-y-1">
											<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateLang} *</span>
											<select
												value={createForm.language}
												disabled={Boolean(editingTemplateId)}
												onChange={e => {
													setCreateForm(f => ({ ...f, language: e.target.value }));
													setCreateFormErrors(err => ({ ...err, language: undefined }));
												}}
												className="w-full rounded-lg border px-2 py-2 text-sm outline-none disabled:opacity-60"
												style={{ borderColor: createFormErrors.language ? '#F87171' : WA.border, background: WA.field }}
											>
												{META_TEMPLATE_LANGUAGES.map(code => (
													<option key={code} value={code}>{code}</option>
												))}
											</select>
										</label>
										<label className="block w-1/2 space-y-1">
											<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateCategory} *</span>
											<select
												value={createForm.category}
												disabled={Boolean(editingTemplateId)}
												onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
												className="w-full rounded-lg border px-2 py-2 text-sm outline-none disabled:opacity-60"
												style={{ borderColor: WA.border, background: WA.field }}
											>
												<option value="UTILITY">UTILITY</option>
												<option value="MARKETING">MARKETING</option>
												<option value="AUTHENTICATION">AUTHENTICATION</option>
											</select>
											{editingTemplateId ? (
												<p className="text-[11px]" style={{ color: WA.muted }}>{t.templateCategoryLocked}</p>
											) : null}
										</label>
									</div>

									<div className="space-y-2">
										<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateHeaderType}</span>
										<div className="flex flex-wrap gap-1.5">
											{[
												{ id: 'NONE', label: t.headerNone },
												{ id: 'TEXT', label: t.headerText },
												{ id: 'IMAGE', label: t.headerImage },
												{ id: 'VIDEO', label: t.headerVideo },
												{ id: 'DOCUMENT', label: t.headerDocument },
											].map(opt => (
												<button
													key={opt.id}
													type="button"
													onClick={() => {
														setCreateForm(f => ({ ...f, headerFormat: opt.id }));
														if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(opt.id)) {
															setExistingHeaderComponent(null);
														}
														setCreateFormErrors(err => ({ ...err, headerSample: undefined, headerText: undefined }));
													}}
													className="rounded-full px-3 py-1 text-[12px] font-medium"
													style={{
														background: createForm.headerFormat === opt.id ? WA.greenSoft : WA.field,
														color: createForm.headerFormat === opt.id ? WA.greenText : WA.muted,
													}}
												>
													{opt.label}
												</button>
											))}
										</div>
										{createForm.headerFormat === 'TEXT' ? (
											<label className="block space-y-1">
												<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateHeader}</span>
												<input
													value={createForm.headerText}
													onChange={e => {
														setCreateForm(f => ({ ...f, headerText: e.target.value.slice(0, 60) }));
														setCreateFormErrors(err => ({ ...err, headerText: undefined }));
													}}
													maxLength={60}
													placeholder="Title {{1}}"
													className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
													style={{ borderColor: createFormErrors.headerText ? '#F87171' : WA.border, background: WA.field }}
												/>
												{createFormErrors.headerText ? <p className="text-[11px] text-rose-600">{createFormErrors.headerText}</p> : null}
											</label>
										) : null}
										{['IMAGE', 'VIDEO', 'DOCUMENT'].includes(createForm.headerFormat) ? (
											<div className="space-y-1.5">
												<input
													ref={headerSampleRef}
													type="file"
													accept={
														createForm.headerFormat === 'IMAGE'
															? 'image/jpeg,image/png,image/jpg'
															: createForm.headerFormat === 'VIDEO'
																? 'video/mp4'
																: 'application/pdf'
													}
													className="hidden"
													onChange={e => onHeaderSamplePick(e.target.files?.[0])}
												/>
												<button
													type="button"
													onClick={() => headerSampleRef.current?.click()}
													className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold"
													style={{ borderColor: createFormErrors.headerSample ? '#F87171' : WA.border, color: WA.text, background: WA.field }}
												>
													{createForm.headerFormat === 'IMAGE' ? <ImageIcon className="h-4 w-4" /> : createForm.headerFormat === 'VIDEO' ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
													{headerSampleFile ? t.changeSample : t.uploadSample}
												</button>
												{!headerSampleFile && existingHeaderComponent && editingTemplateId ? (
													<p className="text-[11px]" style={{ color: WA.muted }}>{t.keepExistingSample}</p>
												) : null}
												{headerSampleFile ? (
													<p className="truncate text-[11px]" style={{ color: WA.muted }}>{headerSampleFile.name}</p>
												) : (
													<p className="text-[11px]" style={{ color: WA.muted }}>{t.headerSampleHint}</p>
												)}
												{createFormErrors.headerSample ? <p className="text-[11px] text-rose-600">{createFormErrors.headerSample}</p> : null}
											</div>
										) : null}
									</div>

									<label className="block space-y-1">
										<div className="flex items-center justify-between gap-2">
											<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateBody} *</span>
											<button type="button" onClick={insertBodyVar} className="text-[11px] font-semibold" style={{ color: WA.greenText }}>
												{t.insertVar}
											</button>
										</div>
										<textarea
											value={createForm.bodyText}
											onChange={e => {
												setCreateForm(f => ({ ...f, bodyText: e.target.value.slice(0, 1024) }));
												setCreateFormErrors(err => ({ ...err, bodyText: undefined }));
											}}
											placeholder={"Hello {{1}}, welcome to So7baFit."}
											rows={5}
											maxLength={1024}
											className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
											style={{ borderColor: createFormErrors.bodyText ? '#F87171' : WA.border, background: WA.field }}
										/>
										{createFormErrors.bodyText ? (
											<p className="text-[11px] text-rose-600">{createFormErrors.bodyText}</p>
										) : (
											<p className="text-[11px]" style={{ color: WA.muted }}>{t.templateVarsMustBeNumbered}</p>
										)}
									</label>
									<label className="block space-y-1">
										<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateFooter}</span>
										<input
											value={createForm.footerText}
											onChange={e => {
												setCreateForm(f => ({ ...f, footerText: e.target.value.slice(0, 60) }));
												setCreateFormErrors(err => ({ ...err, footerText: undefined }));
											}}
											maxLength={60}
											className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
											style={{ borderColor: createFormErrors.footerText ? '#F87171' : WA.border, background: WA.field }}
										/>
									</label>

									<div className="space-y-2">
										<div className="flex items-center justify-between gap-2">
											<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateButtons}</span>
											<div className="flex flex-wrap gap-1">
												<button type="button" onClick={() => addTemplateButton('QUICK_REPLY')} className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ color: WA.greenText }}>+ {t.buttonQuickReply}</button>
												<button type="button" onClick={() => addTemplateButton('URL')} className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ color: WA.greenText }}>+ {t.buttonUrlType}</button>
												<button type="button" onClick={() => addTemplateButton('PHONE_NUMBER')} className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ color: WA.greenText }}>+ {t.buttonPhoneType}</button>
											</div>
										</div>
										{createFormErrors.buttons ? <p className="text-[11px] text-rose-600">{createFormErrors.buttons}</p> : null}
										{(createForm.buttons || []).map((btn, idx) => (
											<div key={btn.id || idx} className="space-y-1.5 rounded-lg border p-2.5" style={{ borderColor: WA.border, background: WA.field }}>
												<div className="flex items-center gap-2">
													<select
														value={btn.type}
														onChange={e => setCreateForm(f => ({
															...f,
															buttons: f.buttons.map((b, i) => i === idx ? { ...b, type: e.target.value } : b),
														}))}
														className="rounded-md border bg-white px-2 py-1.5 text-[12px] outline-none"
														style={{ borderColor: WA.border, color: WA.text }}
													>
														<option value="QUICK_REPLY">{t.buttonQuickReply}</option>
														<option value="URL">{t.buttonUrlType}</option>
														<option value="PHONE_NUMBER">{t.buttonPhoneType}</option>
													</select>
													<input
														value={btn.text}
														onChange={e => setCreateForm(f => ({
															...f,
															buttons: f.buttons.map((b, i) => i === idx ? { ...b, text: e.target.value.slice(0, 25) } : b),
														}))}
														placeholder={t.buttonText}
														maxLength={25}
														className="min-w-0 flex-1 rounded-md border bg-white px-2 py-1.5 text-[12px] outline-none"
														style={{ borderColor: createFormErrors[`button_${idx}_text`] ? '#F87171' : WA.border }}
													/>
													<button
														type="button"
														onClick={() => setCreateForm(f => ({ ...f, buttons: f.buttons.filter((_, i) => i !== idx) }))}
														className="rounded-md p-1"
														style={{ color: WA.icon }}
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
												{btn.type === 'URL' ? (
													<input
														value={btn.url || ''}
														onChange={e => setCreateForm(f => ({
															...f,
															buttons: f.buttons.map((b, i) => i === idx ? { ...b, url: e.target.value } : b),
														}))}
														placeholder="https://example.com/{{1}}"
														className="w-full rounded-md border bg-white px-2 py-1.5 text-[12px] outline-none"
														style={{ borderColor: createFormErrors[`button_${idx}_url`] ? '#F87171' : WA.border }}
													/>
												) : null}
												{btn.type === 'PHONE_NUMBER' ? (
													<input
														value={btn.phone_number || ''}
														onChange={e => setCreateForm(f => ({
															...f,
															buttons: f.buttons.map((b, i) => i === idx ? { ...b, phone_number: e.target.value } : b),
														}))}
														placeholder="+2010xxxxxxx"
														className="w-full rounded-md border bg-white px-2 py-1.5 text-[12px] outline-none"
														style={{ borderColor: createFormErrors[`button_${idx}_phone`] ? '#F87171' : WA.border }}
													/>
												) : null}
											</div>
										))}
									</div>

									<div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: WA.field, color: WA.muted }}>
										<div className="mb-1 font-semibold" style={{ color: WA.text }}>{t.templateMetaDetails}</div>
										<ul className="list-disc space-y-1 ps-4">
											<li>{t.templateNameInvalid}</li>
											<li>{t.templateVarsMustBeNumbered}</li>
											<li>{t.templatesHint}</li>
										</ul>
									</div>
									<button
										type="submit"
										disabled={creatingTemplate}
										className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
										style={{ background: WA.green }}
									>
										{creatingTemplate ? '…' : editingTemplateId ? t.saveTemplate : t.createTemplate}
									</button>
								</form>

								<div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4" style={chatWallpaperStyle}>
									<div className="text-[13px] font-semibold" style={{ color: WA.text }}>{t.templatePreview}</div>
									<div className="flex justify-end">
										<div
											className="max-w-[320px] min-w-[180px] overflow-hidden rounded-xl text-[13px] font-medium shadow-[0_1px_0_rgba(0,0,0,0.08)]"
											style={{ background: WA.bubbleOut, color: WA.text }}
										>
											{createForm.headerFormat === 'IMAGE' && headerSamplePreview ? (
												<img src={headerSamplePreview} alt="" className="max-h-40 w-full object-cover" />
											) : null}
											{createForm.headerFormat === 'IMAGE' && !headerSamplePreview ? (
												<div className="flex h-28 items-center justify-center" style={{ background: '#D1D7DB' }}>
													<ImageIcon className="h-8 w-8" style={{ color: WA.muted }} />
												</div>
											) : null}
											{createForm.headerFormat === 'VIDEO' ? (
												<div className="flex h-28 items-center justify-center" style={{ background: '#D1D7DB' }}>
													<Video className="h-8 w-8" style={{ color: WA.muted }} />
												</div>
											) : null}
											{createForm.headerFormat === 'DOCUMENT' ? (
												<div className="flex items-center gap-2 px-3 pt-2.5">
													<FileText className="h-5 w-5" style={{ color: WA.muted }} />
													<span className="truncate text-[12px]" style={{ color: WA.muted }}>{headerSampleFile?.name || 'document.pdf'}</span>
												</div>
											) : null}
											<div className="px-3 py-2">
												{createForm.headerFormat === 'TEXT' && createForm.headerText.trim() ? (
													<div className="mb-1 text-[12px] font-bold">{createForm.headerText}</div>
												) : null}
												<div className="whitespace-pre-wrap break-words">
													{createForm.bodyText.trim() || '…'}
												</div>
												{createForm.footerText.trim() ? (
													<div className="mt-1 text-[11px]" style={{ color: WA.muted }}>{createForm.footerText}</div>
												) : null}
												<div className="mt-1 flex justify-end text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>
													preview
												</div>
											</div>
											{(createForm.buttons || []).filter(b => b.text).length ? (
												<div className="border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
													{(createForm.buttons || []).filter(b => b.text).map((btn, i) => (
														<div
															key={btn.id || i}
															className="flex items-center justify-center gap-1.5 border-t px-3 py-2 text-[13px] font-semibold"
															style={{ borderColor: i === 0 ? 'transparent' : 'rgba(0,0,0,0.06)', color: '#027EB5' }}
														>
															{btn.type === 'URL' ? <Link2 className="h-3.5 w-3.5" /> : null}
															{btn.type === 'PHONE_NUMBER' ? <Phone className="h-3.5 w-3.5" /> : null}
															{btn.text}
														</div>
													))}
												</div>
											) : null}
										</div>
									</div>
									<div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: WA.panel, color: WA.muted }}>
										<div><span className="font-semibold" style={{ color: WA.text }}>{t.templateName}:</span> {createForm.name || '—'}</div>
										<div><span className="font-semibold" style={{ color: WA.text }}>{t.templateLang}:</span> {createForm.language}</div>
										<div><span className="font-semibold" style={{ color: WA.text }}>{t.templateCategory}:</span> {createForm.category}</div>
										<div><span className="font-semibold" style={{ color: WA.text }}>{t.templateHeaderType}:</span> {createForm.headerFormat}</div>
										<div><span className="font-semibold" style={{ color: WA.text }}>{t.templateButtons}:</span> {(createForm.buttons || []).length}</div>
										<div><span className="font-semibold" style={{ color: WA.text }}>Status:</span> PENDING (after submit)</div>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
							<header className="flex items-center justify-between gap-2 px-5 py-3" style={{ background: WA.header, borderBottom: '0.5px solid rgba(0,0,0,0.12)' }}>
								<div>
									<div className="text-[14px] font-bold" style={{ color: WA.text }}>{t.templates}</div>
									<div className="text-[12px]" style={{ color: WA.muted }}>{templates.length} · Meta Cloud API · {t.templatesHint}</div>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									{/* <button
										type="button"
										onClick={() => void cloneOutreachAsUtility()}
										disabled={seedSubmitting || templatesLoading}
										title={t.cloneAsUtilityHint}
										className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-[12px] font-semibold transition hover:bg-white disabled:opacity-50"
										style={{ borderColor: WA.border, background: WA.panel, color: WA.text }}
									>
										{seedSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" strokeWidth={2} />}
										{t.cloneAsUtility}
									</button> */}
									<button
										type="button"
										onClick={() => void loadTemplates()}
										title={t.refreshTemplates}
										className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition hover:bg-white"
										style={{ borderColor: WA.border, color: WA.icon, background: WA.panel }}
									>
										{templatesLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={2} />}
									</button>
									<button
										type="button"
										onClick={() => void loadMetaLibrary()}
										disabled={libraryLoading}
										className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-[12px] font-semibold transition hover:bg-white disabled:opacity-50"
										style={{ borderColor: WA.border, background: WA.panel, color: WA.text }}
									>
										{libraryLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" strokeWidth={2} />}
										{t.metaLibrary}
									</button>
									<button
										type="button"
										onClick={() => {
											resetCreateTemplate();
											setTemplatesMode('create');
										}}
										className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:opacity-95"
										style={{ background: WA.green }}
									>
										<Plus className="h-4 w-4" strokeWidth={2.25} />
										{t.addNewTemplate}
									</button>
								</div>
							</header>
							<div className="min-h-0 flex-1 overflow-y-auto p-4" style={{ background: WA.panel }}>
								{templatesLoading && !templates.length ? (
									<p className="py-16 text-center text-[13px]" style={{ color: WA.muted }}>…</p>
								) : !templates.length ? (
									<p className="py-16 text-center text-[13px]" style={{ color: WA.muted }}>{t.templateEmptyList}</p>
								) : (
									<div className="overflow-x-auto rounded-xl border" style={{ borderColor: WA.border }}>
										<table className="min-w-full border-collapse text-start text-[13px]">
											<thead>
												<tr style={{ background: WA.header, color: WA.muted }}>
													<th className="px-3 py-2.5 font-semibold">{t.templateColName}</th>
													<th className="px-3 py-2.5 font-semibold">{t.templateColLanguage}</th>
													<th className="px-3 py-2.5 font-semibold">{t.templateColCategory}</th>
													<th className="px-3 py-2.5 font-semibold">{t.templateColHeader}</th>
													<th className="px-3 py-2.5 font-semibold">{t.templateColStatus}</th>
													<th className="px-3 py-2.5 font-semibold">{t.templateColActions}</th>
												</tr>
											</thead>
											<tbody>
												{templates.map(tpl => {
													const rowKey = `${tpl.id || tpl.name}::${tpl.language || ''}`;
													const hdrFmt = templateHeaderFormat(tpl.components);
													const btns = templateButtons(tpl.components);
													const status = String(tpl.status || '').toUpperCase();
													const approved = status === 'APPROVED';
													const deleting = deletingTemplateKey === rowKey;
													const menuOpen = actionsMenuKey === rowKey;
													return (
														<tr
															key={rowKey}
															className="border-t align-middle"
															style={{ borderColor: WA.border, background: WA.panel }}
														>
															<td className="max-w-[220px] px-3 py-3">
																<div className="truncate font-semibold" style={{ color: WA.text }} title={tpl.name}>
																	{tpl.name}
																</div>
																<div className="text-[11px]" style={{ color: WA.muted }}>
																	{btns.length ? `${btns.length} btn` : '—'}
																	{tpl.id ? ` · ${String(tpl.id).slice(-6)}` : ''}
																</div>
															</td>
															<td className="whitespace-nowrap px-3 py-3" style={{ color: WA.text }}>
																{tpl.language || '—'}
															</td>
															<td className="whitespace-nowrap px-3 py-3" style={{ color: WA.text }}>
																{tpl.category || '—'}
															</td>
															<td className="whitespace-nowrap px-3 py-3" style={{ color: WA.muted }}>
																{hdrFmt || t.headerNone}
															</td>
															<td className="px-3 py-3">
																<span
																	className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
																	style={{
																		background: approved
																			? WA.greenSoft
																			: status === 'REJECTED'
																				? '#FDECEC'
																				: '#FFF3C7',
																		color: approved
																			? WA.greenText
																			: status === 'REJECTED'
																				? '#9B1C1C'
																				: WA.muted,
																	}}
																>
																	{tpl.status || '—'}
																</span>
															</td>
															<td className="px-3 py-3">
																<div className="relative flex flex-wrap items-center gap-1.5">
																	<button
																		type="button"
																		title={t.templateShow}
																		onClick={() => {
																			setPreviewTemplate(tpl);
																			setActionsMenuKey('');
																		}}
																		className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold"
																		style={{ background: WA.field, color: WA.text }}
																	>
																		<Eye className="h-3.5 w-3.5" />
																		{t.templateShow}
																	</button>
																	<button
																		type="button"
																		title={t.templateUse}
																		disabled={!approved}
																		onClick={() => openVerifySend(tpl)}
																		className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
																		style={{ background: WA.green }}
																	>
																		<Send className="h-3.5 w-3.5" />
																		{t.templateUse}
																	</button>
																	<button
																		type="button"
																		title={t.templateEdit}
																		disabled={!canEditMetaTemplate(tpl)}
																		onClick={() => openEditTemplate(tpl)}
																		className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold disabled:opacity-40"
																		style={{ background: WA.field, color: WA.text }}
																	>
																		<Pencil className="h-3.5 w-3.5" />
																		{t.templateEdit}
																	</button>
																	<button
																		type="button"
																		title={t.templateDelete}
																		disabled={deleting}
																		onClick={() => void onDeleteTemplate(tpl)}
																		className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold disabled:opacity-40"
																		style={{ background: '#FDECEC', color: '#9B1C1C' }}
																	>
																		{deleting ? (
																			<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
																		) : (
																			<Trash2 className="h-3.5 w-3.5" />
																		)}
																		{t.templateDelete}
																	</button>
																	<button
																		type="button"
																		title={t.templateColActions}
																		onClick={() => setActionsMenuKey(menuOpen ? '' : rowKey)}
																		className="rounded-lg p-1.5"
																		style={{ color: WA.icon }}
																	>
																		<MoreHorizontal className="h-4 w-4" />
																	</button>
																	{menuOpen ? (
																		<div
																			className="absolute end-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border py-1 shadow-lg"
																			style={{ background: WA.panel, borderColor: WA.border }}
																		>
																			<button
																				type="button"
																				className="flex w-full items-center gap-2 px-3 py-2 text-start text-[12px] hover:bg-[#F0F2F5]"
																				style={{ color: WA.text }}
																				onClick={() => void copyTemplateName(tpl.name)}
																			>
																				<Copy className="h-3.5 w-3.5" />
																				{t.templateCopyName}
																			</button>
																			<button
																				type="button"
																				className="flex w-full items-center gap-2 px-3 py-2 text-start text-[12px] hover:bg-[#F0F2F5]"
																				style={{ color: WA.text }}
																				onClick={() => {
																					setPreviewTemplate(tpl);
																					setActionsMenuKey('');
																				}}
																			>
																				<Eye className="h-3.5 w-3.5" />
																				{t.templateShow}
																			</button>
																			{approved ? (
																				<button
																					type="button"
																					className="flex w-full items-center gap-2 px-3 py-2 text-start text-[12px] hover:bg-[#F0F2F5]"
																					style={{ color: WA.text }}
																					onClick={() => openVerifySend(tpl)}
																				>
																					<Send className="h-3.5 w-3.5" />
																					{t.verifySend}
																				</button>
																			) : null}
																			{canEditMetaTemplate(tpl) ? (
																				<button
																					type="button"
																					className="flex w-full items-center gap-2 px-3 py-2 text-start text-[12px] hover:bg-[#F0F2F5]"
																					style={{ color: WA.text }}
																					onClick={() => openEditTemplate(tpl)}
																				>
																					<Pencil className="h-3.5 w-3.5" />
																					{t.templateEdit}
																				</button>
																			) : null}
																		</div>
																	) : null}
																</div>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>
					)
				) : !activeId || !active ? (
					<div className="grid flex-1 place-items-center px-6 text-center" style={{ background: WA.panel }}>
						<div>
							<MessageCircle className="mx-auto mb-4 h-16 w-16" style={{ color: WA.separator }} />
							<p className="text-[17px] font-bold" style={{ color: WA.text }}>{t.emptyChat}</p>
							<p className="mt-2 text-[13px]" style={{ color: WA.muted }}>{status?.enabled ? connectionLabel : t.disabled}{status?.displayPhoneNumber ? ` · ${status.displayPhoneNumber}` : ''}</p>
						</div>
					</div>
				) : (
					<>
						<header
							className="relative z-10 flex items-center justify-between gap-2 px-5 py-2"
							style={{ background: WA.header, borderBottom: '0.5px solid rgba(0,0,0,0.20)' }}
						>
							<div className="flex min-w-0 flex-1 items-center gap-2">
								<button type="button" className="md:hidden" style={{ color: WA.icon }} onClick={() => setActiveId(null)}>{isAr ? '›' : '‹'}</button>
								<Avatar name={active.displayName || active.businessName || active.waId} size={36} />
								<div className="min-w-0">
									<div className="truncate text-[14px] font-bold" style={{ color: WA.text }}>{active.displayName || active.businessName || active.waId}</div>
									<div className="truncate text-[12px]" style={{ color: WA.muted }}>{active.waId}</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<span className="hidden rounded-md px-2 py-1 text-[11px] font-medium sm:inline" style={{ background: active.withinCustomerCareWindow ? WA.greenSoft : WA.dateChip, color: active.withinCustomerCareWindow ? WA.greenText : WA.muted }}>
									{active.withinCustomerCareWindow ? t.windowOpen : t.windowClosed}
								</span>
								<button
									type="button"
									onClick={() => {
										setActiveId(null);
										setActive(null);
										setMessages([]);
										setDraft('');
										setMessageTranslations({});
									}}
									className="rounded-md p-1 transition hover:bg-black/5"
									style={{ color: WA.icon }}
									title={t.closeChat}
								>
									<ArrowLeft
										className={`h-6 w-6 ${isAr ? 'rotate-180' : ''}`}
										strokeWidth={1.75}
									/>
								</button>
							</div>
						</header>

						<div
							ref={messagesScrollRef}
							className="relative z-0 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
							style={chatWallpaperStyle}
						>
							<div className="mx-auto rounded-lg px-3.5 py-1.5 text-center text-[10px] shadow-[0_1px_0_rgba(0,0,0,0.08)]" style={{ background: WA.dateChip, color: WA.dateText }}>{t.encryption}</div>
							<div className="mx-auto max-w-[360px] rounded-lg px-3.5 py-1.5 text-center text-[10px] shadow-[0_1px_0_rgba(0,0,0,0.08)]" style={{ background: WA.chipMeta, color: WA.metaNote }}>{t.metaNote}</div>
							{buildChatRows(messages).map(row => {
								if (row.kind === 'image_grid') {
									const mine = row.direction === 'outbound';
									return (
										<div key={row.key} className={`flex px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
											<ImageGridBubble
												messages={row.messages}
												mine={mine}
												locale={locale}
												onOpenMedia={(url, kind) => setMediaLightbox({ url, kind })}
											/>
										</div>
									);
								}

								const m = row.message;
								const mine = m.direction === 'outbound';
								const type = String(m.messageType || '').toLowerCase();
								const isSticker = type === 'sticker';
								const isTemplate = type === 'template';
								const isButtonReply =
									type === 'button' ||
									type === 'interactive' ||
									/^\[button\]/i.test(String(m.body || ''));
								const caption = messageCaption(m);
								const showUnsupported =
									type === 'unsupported' ||
									/^\[unsupported\]$/i.test(String(m.body || '').trim());
								const templateParts = isTemplate
									? resolveTemplateMessageParts(m, templates)
									: null;
								const translateText = getMessageTranslateText(m, templates);
								const canTranslate = Boolean(translateText) && !isSticker && !showUnsupported;
								const translation = messageTranslations[m.id];
								const translateTarget = detectTranslateTarget(translateText);
								const translateTitle =
									translation?.open && translation?.text
										? t.translateHide
										: translateTarget === 'en'
											? t.translateToEn
											: t.translateToAr;

								const translateBtn = canTranslate ? (
									<button
										type="button"
										onClick={() => toggleMessageTranslation(m)}
										disabled={translation?.loading}
										title={translateTitle}
										aria-label={translateTitle}
										className="mb-1 grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-black/5 disabled:opacity-50"
										style={{ color: WA.icon }}
									>
										{translation?.loading ? (
											<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Languages className="h-3.5 w-3.5" strokeWidth={2} />
										)}
									</button>
								) : null;

								return (
									<div key={m.id} className={`flex flex-col gap-1 px-1 ${mine ? 'items-end' : 'items-start'}`}>
										<div className={`flex max-w-full items-end gap-1 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
											<div
												className={`relative max-w-[360px] text-[13px] font-medium leading-[1.35] ${
													isSticker
														? 'bg-transparent p-0 shadow-none'
														: 'min-w-[84px] overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.08)]'
												}`}
												style={{
													background: isSticker
														? 'transparent'
														: mine
															? WA.bubbleOut
															: WA.bubbleIn,
													color: WA.text,
													borderRadius: 12,
												}}
											>
												<div className={isSticker ? '' : 'px-2.5 pb-1.5 pt-1.5'}>
													{m.hasMedia ? (
														<MediaBubble
															message={m}
															mine={mine}
															labels={t}
															onOpenMedia={(url, kind) => setMediaLightbox({ url, kind })}
														/>
													) : null}
													{type === 'sticker' && !m.hasMedia ? (
														<div
															className="rounded-xl px-3 py-2 text-[12px]"
															style={{ background: WA.bubbleIn, color: WA.muted }}
														>
															{t.stickerUnavailable}
														</div>
													) : null}
													{showUnsupported ? (
														<div className="text-[12px]" style={{ color: WA.muted }}>
															{t.unsupportedMessage}
														</div>
													) : null}
													{isTemplate ? (
														<div className="space-y-1">
															{m.templateName ? (
																<div
																	className="text-[11px] font-semibold"
																	style={{ color: WA.muted }}
																>
																	{m.templateName}
																</div>
															) : null}
															{templateParts?.header ? (
																<div className="whitespace-pre-wrap break-words font-bold">
																	<RichMessageText
																		text={templateParts.header}
																		onPhoneClick={openChatFromPhoneNumber}
																	/>
																</div>
															) : null}
															{templateParts?.body ? (
																<div className="whitespace-pre-wrap break-words">
																	<RichMessageText
																		text={templateParts.body}
																		onPhoneClick={openChatFromPhoneNumber}
																	/>
																</div>
															) : null}
															{templateParts?.footer ? (
																<div
																	className="whitespace-pre-wrap break-words text-[11px]"
																	style={{ color: WA.muted }}
																>
																	<RichMessageText
																		text={templateParts.footer}
																		onPhoneClick={openChatFromPhoneNumber}
																	/>
																</div>
															) : null}
														</div>
													) : null}
													{isButtonReply && !isTemplate && !showUnsupported ? (
														<div
															className="mb-1 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
															style={{ background: 'rgba(2,126,181,0.10)', color: '#027EB5' }}
														>
															<MessageCircle className="h-3.5 w-3.5 shrink-0" />
															<span className="truncate">
																{caption || m.body || (isAr ? 'رد زر' : 'Button reply')}
															</span>
														</div>
													) : null}
													{caption &&
													!isTemplate &&
													!isButtonReply &&
													!showUnsupported ? (
														<div
															className={`whitespace-pre-wrap break-words ${m.hasMedia ? 'mt-1' : ''}`}
														>
															<RichMessageText
																text={caption}
																onPhoneClick={openChatFromPhoneNumber}
															/>
														</div>
													) : null}
													{type === 'text' &&
													!caption &&
													m.body &&
													!isMediaPlaceholderBody(m.body) ? (
														<div className="whitespace-pre-wrap break-words">
															<RichMessageText
																text={m.body}
																onPhoneClick={openChatFromPhoneNumber}
															/>
														</div>
													) : null}
													<div
														className={`mt-1 flex items-center justify-end gap-1 text-[11px] font-medium ${
															isSticker
																? 'rounded-full bg-black/25 px-2 py-0.5 text-white'
																: ''
														}`}
														style={isSticker ? undefined : { color: 'rgba(0,0,0,0.50)' }}
													>
														<span>
															{formatTime(m.createdAt || m.providerTimestamp, locale)}
														</span>
														{mine && <StatusTicks status={m.status} />}
													</div>
													{m.errorMessage ? (
														<div className="mt-1 text-[11px] text-rose-600">
															{m.errorMessage}
														</div>
													) : null}
												</div>
												{isTemplate ? (
													<TemplateActionButtons buttons={templateParts?.buttons} />
												) : null}
											</div>
											{translateBtn}
										</div>
										{translation?.open ? (
											<div
												className="max-w-[360px] rounded-xl px-2.5 py-1.5 text-[12px] leading-[1.35] shadow-[0_1px_0_rgba(0,0,0,0.06)]"
												style={{
													background: 'rgba(255,255,255,0.92)',
													color: WA.text,
													border: `1px solid ${WA.border}`,
												}}
												dir={translation?.targetLang === 'ar' ? 'rtl' : 'ltr'}
											>
												<div
													className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide"
													style={{ color: WA.muted }}
												>
													{t.translatedLabel}
													{translation?.sourceLang && translation?.targetLang
														? ` · ${String(translation.sourceLang).toUpperCase()} → ${String(translation.targetLang).toUpperCase()}`
														: ''}
												</div>
												{translation.loading ? (
													<div className="flex items-center gap-1.5" style={{ color: WA.muted }}>
														<LoaderCircle className="h-3.5 w-3.5 animate-spin" />
														<span>…</span>
													</div>
												) : translation.error ? (
													<div className="text-rose-600">{translation.error}</div>
												) : (
													<div className="whitespace-pre-wrap break-words">
														{translation.text}
													</div>
												)}
											</div>
										) : null}
									</div>
								);
							})}
							<div ref={bottomRef} />
						</div>

						<footer className="z-10 px-2.5 py-2" style={{ background: WA.composeBar }}>
							{active.canSendFreeform ? (
								recording ? (
									<div className="flex w-full items-center gap-2">
										<button
											type="button"
											onClick={cancelRecording}
											className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:bg-rose-50"
											style={{ color: '#E53935' }}
											title={t.recordingCancel}
										>
											<Trash2 className="h-5 w-5" strokeWidth={2} />
										</button>
										<div
											className="relative flex min-h-[52px] flex-1 items-center gap-3 overflow-hidden rounded-3xl px-4 py-2 shadow-md"
											style={{
												background: '#FFFFFF',
												outline: '2px solid rgba(229,57,53,0.35)',
												outlineOffset: -2,
											}}
										>
											<span className="relative flex h-3 w-3 shrink-0">
												<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
												<span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
											</span>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="text-[13px] font-bold tracking-wide text-rose-600">
														{t.recording}
													</span>
													<span
														className="rounded-md px-1.5 py-0.5 font-mono text-[13px] font-semibold tabular-nums"
														style={{ background: 'rgba(229,57,53,0.1)', color: '#C62828' }}
													>
														{formatAudioClock(recordingSeconds)}
													</span>
												</div>
												<div className="mt-1.5 flex h-5 items-end gap-[2px]">
													{Array.from({ length: 28 }).map((_, i) => {
														const wave =
															0.25 +
															Math.abs(Math.sin(i * 0.55 + recordingSeconds * 4)) *
																recordingLevel *
																0.9;
														return (
															<span
																key={i}
																className="w-[3px] rounded-full transition-[height] duration-75"
																style={{
																	height: `${Math.max(3, Math.round(wave * 18))}px`,
																	background: i % 3 === 0 ? '#E53935' : '#EF9A9A',
																}}
															/>
														);
													})}
												</div>
												<p className="mt-0.5 truncate text-[10px]" style={{ color: WA.muted }}>
													{t.recordingHint}
												</p>
											</div>
										</div>
										<button
											type="button"
											onClick={stopRecording}
											className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg transition hover:scale-105 active:scale-95"
											style={{ background: WA.green }}
											title={t.recordingSend}
										>
											<Send className="h-5 w-5" strokeWidth={2.25} />
										</button>
									</div>
								) : (
									<form onSubmit={onSendText} className="flex w-full items-end gap-2">
										<input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
											const files = [...(e.target.files || [])];
											e.target.value = '';
											files.forEach(f => void uploadFile(f));
										}} />
										<input ref={fileRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadFile(f); }} />
										<div
											className="flex items-center gap-0.5 rounded-2xl px-1 py-1"
											style={{ background: 'rgba(255,255,255,0.7)', outline: `1px solid ${WA.composeBorder}` }}
										>
											<button
												type="button"
												disabled={sending}
												onClick={() => imageRef.current?.click()}
												className="grid h-9 w-9 place-items-center rounded-xl transition hover:bg-black/5 disabled:opacity-40"
												style={{ color: WA.icon }}
												title="Image"
											>
												<ImageIcon className="h-5 w-5" strokeWidth={1.8} />
											</button>
											<button
												type="button"
												disabled={sending}
												onClick={() => fileRef.current?.click()}
												className="grid h-9 w-9 place-items-center rounded-xl transition hover:bg-black/5 disabled:opacity-40"
												style={{ color: WA.icon }}
												title="Attach"
											>
												<Paperclip className="h-5 w-5" strokeWidth={1.8} />
											</button>
											<button
												type="button"
												disabled={sending}
												onClick={openSendTemplate}
												className="grid h-9 w-9 place-items-center rounded-xl transition hover:bg-black/5 disabled:opacity-40"
												style={{ color: WA.icon }}
												title={t.sendTemplate}
											>
												<LayoutTemplate className="h-5 w-5" strokeWidth={1.8} />
											</button>
											<button
												type="button"
												disabled={sending || openingChatPhone}
												onClick={() => void openQuickReplies()}
												className="grid h-9 w-9 place-items-center rounded-xl transition hover:bg-black/5 disabled:opacity-40"
												style={{ color: WA.icon }}
												title={t.fastReplies}
											>
												<Zap className="h-5 w-5" strokeWidth={1.8} />
											</button>
										</div>
										<div
											className="relative flex min-h-[44px] flex-1 items-center rounded-3xl pe-11 ps-3.5 shadow-sm"
											style={{ background: WA.input, outline: `1px solid ${WA.composeBorder}`, outlineOffset: -1 }}
										>
											<input
												value={draft}
												onChange={e => setDraft(e.target.value)}
												placeholder={t.typeMessage}
												className="w-full bg-transparent py-2.5 text-[14px] font-medium outline-none placeholder:text-black/35"
												style={{ color: WA.text, lineHeight: '20px' }}
											/>
											{draft.trim() ? (
												<button
													type="submit"
													disabled={sending}
													className="absolute end-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white shadow-sm disabled:opacity-50"
													style={{ background: WA.green }}
													title={t.typeMessage}
												>
													<Send className="h-4 w-4" strokeWidth={2.2} />
												</button>
											) : (
												<button
													type="button"
													disabled={sending}
													onClick={() => void startRecording()}
													className="absolute end-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full transition hover:bg-black/5 disabled:opacity-40"
													style={{ color: WA.icon }}
													title="Voice"
												>
													<Mic className="h-5 w-5" strokeWidth={1.9} />
												</button>
											)}
										</div>
									</form>
								)
							) : (
								<div className="flex w-full flex-wrap items-center gap-2">
									<p className="flex-1 text-[12px]" style={{ color: WA.muted }}>{t.windowClosed}</p>
									<button type="button" onClick={openSendTemplate} disabled={sending} className="h-9 rounded-2xl px-4 text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: WA.green }}>
										{t.sendTemplate}
									</button>
								</div>
							)}
						</footer>
					</>
				)}
			</section>

			{libraryOpen && (
				<div
					className="absolute inset-0 z-50 grid place-items-center bg-[rgba(11,20,26,0.45)] p-3 sm:p-6"
					onClick={() => setLibraryOpen(false)}
				>
					<div
						className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(11,20,26,0.28)]"
						style={{ background: WA.panel }}
						onClick={e => e.stopPropagation()}
					>
						<header
							className="flex items-start justify-between gap-3 border-b px-5 py-4"
							style={{ borderColor: WA.border, background: '#F7F8FA' }}
						>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span
										className="grid h-9 w-9 place-items-center rounded-xl"
										style={{ background: WA.greenSoft, color: WA.greenText }}
									>
										<BookOpen className="h-4 w-4" />
									</span>
									<div>
										<h3 className="text-[17px] font-bold" style={{ color: WA.text }}>{t.metaLibrary}</h3>
										<p className="text-[12px]" style={{ color: WA.muted }}>{t.metaLibraryHint}</p>
									</div>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setLibraryOpen(false)}
								className="rounded-lg p-1.5 hover:bg-black/5"
								style={{ color: WA.icon }}
							>
								<X className="h-5 w-5" />
							</button>
						</header>

						<div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: WA.border }}>
							<div
								className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5"
								style={{ background: WA.field, outline: `1px solid ${WA.searchBorder}`, outlineOffset: -1 }}
							>
								<Search className="h-4 w-4 shrink-0" style={{ color: WA.muted }} />
								<input
									value={librarySearch}
									onChange={e => setLibrarySearch(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') void loadMetaLibrary(librarySearch);
									}}
									placeholder={t.metaLibrarySearch}
									className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-black/45"
									style={{ color: WA.text }}
								/>
							</div>
							<button
								type="button"
								onClick={() => void loadMetaLibrary(librarySearch)}
								disabled={libraryLoading}
								className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[12px] font-semibold text-white disabled:opacity-50"
								style={{ background: WA.green }}
							>
								{libraryLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
								{t.search}
							</button>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5" style={chatWallpaperStyle}>
							{libraryLoading ? (
								<div className="grid place-items-center py-20">
									<LoaderCircle className="h-7 w-7 animate-spin" style={{ color: WA.green }} />
								</div>
							) : (
								<>
									{(libraryVerification.length > 0 || templates.some(tpl => tpl.name === 'hello_world')) && (
										<section className="mb-5">
											<div className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: WA.muted }}>
												{t.verificationTemplates}
											</div>
											<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
												{(libraryVerification.length
													? libraryVerification
													: [{ name: 'hello_world', language: 'en_US', category: 'UTILITY', body: 'Hello World sample', isVerification: true }]
												).map(item => {
													const accountTpl =
														templates.find(
															tpl =>
																tpl.name === item.name &&
																String(tpl.language) === String(item.language || 'en_US'),
														) || templates.find(tpl => tpl.name === item.name);
													return (
														<div
															key={`verify-${item.name}-${item.language}`}
															className="flex flex-col overflow-hidden rounded-2xl border"
															style={{ background: 'rgba(255,255,255,0.72)', borderColor: 'rgba(0,0,0,0.08)' }}
														>
															<div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
																<div className="min-w-0">
																	<div className="truncate text-[12px] font-bold" style={{ color: WA.text }}>{item.name}</div>
																	<div className="truncate text-[10px]" style={{ color: WA.muted }}>
																		{item.language} · {item.category}
																		{accountTpl ? ` · ${accountTpl.status}` : ''}
																	</div>
																</div>
																<button
																	type="button"
																	onClick={() =>
																		openVerifySend({
																			...item,
																			components: accountTpl?.components || null,
																		})
																	}
																	className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white"
																	style={{ background: WA.green }}
																>
																	{t.verifySend}
																</button>
															</div>
															<div className="flex-1 p-3" style={chatWallpaperStyle}>
																<LibraryWaBubble item={item} />
															</div>
														</div>
													);
												})}
											</div>
										</section>
									)}

									<section>
										<div className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: WA.muted }}>
											{t.metaLibrary}
										</div>
										{!libraryItems.length ? (
											<p
												className="rounded-2xl border border-dashed px-4 py-12 text-center text-[13px]"
												style={{ color: WA.muted, borderColor: 'rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.65)' }}
											>
												{t.metaLibraryEmpty}
											</p>
										) : (
											<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
												{libraryItems.map(item => {
													const key = `${item.libraryTemplateName || item.name}::${item.language || ''}`;
													const creating = libraryCreatingKey === key;
													return (
														<div
															key={key}
															className="flex flex-col overflow-hidden rounded-2xl border"
															style={{ background: 'rgba(255,255,255,0.72)', borderColor: 'rgba(0,0,0,0.08)' }}
														>
															<div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
																<div className="min-w-0">
																	<div className="truncate text-[12px] font-bold" style={{ color: WA.text }}>
																		{item.libraryTemplateName || item.name}
																	</div>
																	<div className="truncate text-[10px]" style={{ color: WA.muted }}>
																		{item.language} · {item.category}
																		{item.topic ? ` · ${item.topic}` : ''}
																	</div>
																</div>
																<button
																	type="button"
																	disabled={creating}
																	onClick={() => void onAddFromLibrary(item)}
																	className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
																	style={{ background: WA.green }}
																>
																	{creating ? '…' : t.addFromLibrary}
																</button>
															</div>
															<div className="flex-1 p-3" style={chatWallpaperStyle}>
																<LibraryWaBubble item={item} />
															</div>
														</div>
													);
												})}
											</div>
										)}
									</section>
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{sendTemplateOpen && (
				<div className="absolute inset-0 z-40 grid place-items-center bg-[rgba(11,20,26,0.35)] p-4" onClick={() => setSendTemplateOpen(false)}>
					<form
						onSubmit={onSendTemplate}
						className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl p-5"
						style={{ background: WA.panel }}
						onClick={e => e.stopPropagation()}
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-semibold">{t.sendTemplate}</h3>
								<p className="mt-1 text-[12px] text-[#667781]">{t.templateApprovedOnly}</p>
							</div>
							<button type="button" onClick={() => setSendTemplateOpen(false)} className="p-1 text-[#54656F]">
								<X className="h-4 w-4" />
							</button>
						</div>

						{templatesLoading ? (
							<p className="py-6 text-center text-sm text-[#667781]">…</p>
						) : !approvedTemplates.length ? (
							<p className="rounded-lg bg-[#FFF3C7] px-3 py-2 text-[12px] text-[#54656F]">{t.templatesHint}</p>
						) : (
							<label className="block space-y-1.5">
								<span className="text-[12px] font-medium text-[#667781]">{t.templatePick}</span>
								<select
									value={selectedTemplateKey}
									onChange={e => {
										setSelectedTemplateKey(e.target.value);
										setTemplateVarValues({});
										setTemplateVarErrors({});
									}}
									required
									className="w-full rounded-lg border border-[#D1D7DB] bg-[#F0F2F5] px-3 py-2 text-sm outline-none"
								>
									<option value="">{t.templatePick}</option>
									{approvedTemplates.map(tpl => (
										<option key={`${tpl.name}::${tpl.language}`} value={`${tpl.name}::${tpl.language}`}>
											{tpl.name} ({tpl.language})
										</option>
									))}
								</select>
							</label>
						)}

						{selectedTemplate && templatePreviewText(selectedTemplate.components) ? (
							<p className="rounded-lg bg-[#F0F2F5] px-3 py-2 text-[12px] text-[#54656F] whitespace-pre-wrap">
								{templatePreviewText(selectedTemplate.components)}
							</p>
						) : null}

						{selectedTemplate && selectedPlaceholders.length === 0 ? (
							<p className="text-[12px] text-[#008069]">{t.templateNoVars}</p>
						) : null}

						{selectedPlaceholders.length > 0 ? (
							<div className="space-y-2">
								<div className="text-[13px] font-semibold">{t.templateVarsTitle}</div>
								{selectedPlaceholders.map(p => {
									const isUrlBtn = p.component === 'BUTTON';
									const err = templateVarErrors[p.id];
									return (
										<label key={p.id} className="block space-y-1">
											<span className="text-[12px] text-[#667781]">{p.label}</span>
											<input
												dir="ltr"
												value={templateVarValues[p.id] || ''}
												onChange={e => {
													const next = e.target.value;
													setTemplateVarValues(v => ({ ...v, [p.id]: next }));
													setTemplateVarErrors(errs => {
														if (!errs[p.id]) return errs;
														const copy = { ...errs };
														delete copy[p.id];
														return copy;
													});
												}}
												required
												placeholder={isUrlBtn ? t.templateUrlParamPlaceholder : undefined}
												className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
													err
														? 'border-[#EA4335] focus:border-[#EA4335]'
														: 'border-[#D1D7DB] focus:border-[#00A884]'
												}`}
											/>
											{isUrlBtn ? (
												<p className="text-[11px] text-[#667781]">{t.templateUrlParamHint}</p>
											) : null}
											{err ? (
												<p className="text-[11px] font-medium text-[#EA4335]">{err}</p>
											) : null}
										</label>
									);
								})}
							</div>
						) : null}

						<div className="flex justify-end gap-2 pt-1">
							<button type="button" onClick={() => setSendTemplateOpen(false)} className="px-3 py-2 text-sm text-[#667781]">
								{t.cancel}
							</button>
							<button
								type="submit"
								disabled={sending || !selectedTemplate}
								className="rounded-lg bg-[#00A884] px-4 py-2 text-sm font-semibold text-[#111B21] disabled:opacity-50"
							>
								{sending ? '…' : t.sendTemplate}
							</button>
						</div>
					</form>
				</div>
			)}

			{previewTemplate && (
				<div
					className="absolute inset-0 z-50 grid place-items-center bg-[rgba(11,20,26,0.35)] p-4"
					onClick={() => setPreviewTemplate(null)}
				>
					<div
						className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl p-5"
						style={{ background: WA.panel }}
						onClick={e => e.stopPropagation()}
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-semibold">{t.templatePreviewTitle}</h3>
								<p className="mt-1 text-[12px] text-[#667781]">
									{previewTemplate.name} · {previewTemplate.language} · {previewTemplate.category || '—'} ·{' '}
									{previewTemplate.status || '—'}
								</p>
							</div>
							<button type="button" onClick={() => setPreviewTemplate(null)} className="p-1 text-[#54656F]">
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="flex justify-start rounded-xl p-4" style={{ ...chatWallpaperStyle, minHeight: 120 }}>
							<div
								className="max-w-[360px] min-w-[160px] overflow-hidden text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.06)]"
								style={{ background: WA.bubbleIn, color: WA.text, borderRadius: 12 }}
							>
								{templateHeaderFormat(previewTemplate.components) === 'IMAGE' ? (
									<div className="flex h-28 items-center justify-center" style={{ background: '#D1D7DB' }}>
										<ImageIcon className="h-7 w-7" style={{ color: WA.muted }} />
									</div>
								) : null}
								{templateHeaderFormat(previewTemplate.components) === 'VIDEO' ? (
									<div className="flex h-28 items-center justify-center" style={{ background: '#D1D7DB' }}>
										<Video className="h-7 w-7" style={{ color: WA.muted }} />
									</div>
								) : null}
								{templateHeaderFormat(previewTemplate.components) === 'DOCUMENT' ? (
									<div className="flex items-center gap-2 px-3 pt-2.5">
										<FileText className="h-5 w-5" style={{ color: WA.muted }} />
										<span className="text-[12px]" style={{ color: WA.muted }}>Document</span>
									</div>
								) : null}
								<div className="px-3 py-2">
									{templateHeaderText(previewTemplate.components) ? (
										<div className="mb-1 text-[12px] font-bold">{templateHeaderText(previewTemplate.components)}</div>
									) : null}
									<div className="whitespace-pre-wrap break-words">
										{templatePreviewText(previewTemplate.components) || '—'}
									</div>
									{templateFooterText(previewTemplate.components) ? (
										<div className="mt-1 text-[11px]" style={{ color: WA.muted }}>
											{templateFooterText(previewTemplate.components)}
										</div>
									) : null}
								</div>
								{templateButtons(previewTemplate.components).length ? (
									<div className="border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
										{templateButtons(previewTemplate.components).map((btn, i) => (
											<div
												key={`${btn.text}-${i}`}
												className="flex items-center justify-center gap-1.5 border-t px-3 py-2 text-[13px] font-semibold"
												style={{
													borderColor: i === 0 ? 'transparent' : 'rgba(0,0,0,0.06)',
													color: '#027EB5',
												}}
											>
												{String(btn.type).toUpperCase() === 'URL' ? <Link2 className="h-3.5 w-3.5" /> : null}
												{String(btn.type).toUpperCase() === 'PHONE_NUMBER' ? <Phone className="h-3.5 w-3.5" /> : null}
												{btn.text}
											</div>
										))}
									</div>
								) : null}
							</div>
						</div>

						<div className="flex flex-wrap justify-end gap-2 pt-1">
							<button
								type="button"
								onClick={() => void copyTemplateName(previewTemplate.name)}
								className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm"
								style={{ background: WA.field, color: WA.text }}
							>
								<Copy className="h-3.5 w-3.5" />
								{t.templateCopyName}
							</button>
							{canEditMetaTemplate(previewTemplate) ? (
								<button
									type="button"
									onClick={() => openEditTemplate(previewTemplate)}
									className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold"
									style={{ background: WA.field, color: WA.text }}
								>
									<Pencil className="h-3.5 w-3.5" />
									{t.templateEdit}
								</button>
							) : null}
							{String(previewTemplate.status).toUpperCase() === 'APPROVED' ? (
								<button
									type="button"
									onClick={() => {
										const tpl = previewTemplate;
										setPreviewTemplate(null);
										openVerifySend(tpl);
									}}
									className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white"
									style={{ background: WA.green }}
								>
									<Send className="h-3.5 w-3.5" />
									{t.templateUse}
								</button>
							) : null}
							<button
								type="button"
								onClick={() => {
									const tpl = previewTemplate;
									setPreviewTemplate(null);
									void onDeleteTemplate(tpl);
								}}
								className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold"
								style={{ background: '#FDECEC', color: '#9B1C1C' }}
							>
								<Trash2 className="h-3.5 w-3.5" />
								{t.templateDelete}
							</button>
						</div>
					</div>
				</div>
			)}

			{verifyOpen && verifyTemplate && (
				<div
					className="absolute inset-0 z-50 grid place-items-center bg-[rgba(11,20,26,0.35)] p-4"
					onClick={() => {
						setVerifyOpen(false);
						setVerifyTemplate(null);
					}}
				>
					<form
						onSubmit={onVerifySend}
						className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl p-5"
						style={{ background: WA.panel }}
						onClick={e => e.stopPropagation()}
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-semibold">{t.verifySendTitle}</h3>
								<p className="mt-1 text-[12px] text-[#667781]">{t.verifySendHint}</p>
							</div>
							<button
								type="button"
								onClick={() => {
									setVerifyOpen(false);
									setVerifyTemplate(null);
								}}
								className="p-1 text-[#54656F]"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="rounded-lg bg-[#F0F2F5] px-3 py-2 text-[12px] text-[#54656F]">
							<div className="font-semibold text-[#111B21]">
								{verifyTemplate.name} · {verifyTemplate.language}
							</div>
							{verifyTemplate.body ? (
								<p className="mt-1 whitespace-pre-wrap">{verifyTemplate.body}</p>
							) : null}
						</div>

						<label className="block space-y-1.5">
							<span className="text-[12px] font-medium text-[#667781]">{t.openPhone}</span>
							<input
								type="tel"
								inputMode="tel"
								dir="ltr"
								required
								value={verifyPhone}
								onChange={e => setVerifyPhone(e.target.value)}
								placeholder={t.phonePlaceholder}
								className="w-full rounded-lg border border-[#D1D7DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#00A884]"
							/>
							<p className="text-[11px] text-[#667781]">{t.phoneHint}</p>
						</label>

						{extractTemplatePlaceholders(verifyTemplate.components).length > 0 ? (
							<div className="space-y-2">
								<div className="text-[13px] font-semibold">{t.templateVarsTitle}</div>
								{extractTemplatePlaceholders(verifyTemplate.components).map(p => {
									const isUrlBtn = p.component === 'BUTTON';
									const err = templateVarErrors[p.id];
									return (
										<label key={p.id} className="block space-y-1">
											<span className="text-[12px] text-[#667781]">{p.label}</span>
											<input
												dir="ltr"
												value={templateVarValues[p.id] || ''}
												onChange={e => {
													const next = e.target.value;
													setTemplateVarValues(v => ({ ...v, [p.id]: next }));
													setTemplateVarErrors(errs => {
														if (!errs[p.id]) return errs;
														const copy = { ...errs };
														delete copy[p.id];
														return copy;
													});
												}}
												required
												placeholder={isUrlBtn ? t.templateUrlParamPlaceholder : undefined}
												className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
													err
														? 'border-[#EA4335] focus:border-[#EA4335]'
														: 'border-[#D1D7DB] focus:border-[#00A884]'
												}`}
											/>
											{isUrlBtn ? (
												<p className="text-[11px] text-[#667781]">{t.templateUrlParamHint}</p>
											) : null}
											{err ? (
												<p className="text-[11px] font-medium text-[#EA4335]">{err}</p>
											) : null}
										</label>
									);
								})}
							</div>
						) : (
							<p className="text-[12px] text-[#008069]">{t.templateNoVars}</p>
						)}

						<div className="flex justify-end gap-2 pt-1">
							<button
								type="button"
								onClick={() => {
									setVerifyOpen(false);
									setVerifyTemplate(null);
								}}
								className="px-3 py-2 text-sm text-[#667781]"
							>
								{t.cancel}
							</button>
							<button
								type="submit"
								disabled={sending}
								className="rounded-lg bg-[#00A884] px-4 py-2 text-sm font-semibold text-[#111B21] disabled:opacity-50"
							>
								{sending ? '…' : t.verifySend}
							</button>
						</div>
					</form>
				</div>
			)}

			{quickRepliesOpen && (
				<div
					className="absolute inset-0 z-40 grid place-items-end bg-[rgba(11,20,26,0.35)] p-3 sm:place-items-center sm:p-4"
					onClick={() => setQuickRepliesOpen(false)}
				>
					<div
						className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
						style={{ background: WA.panel }}
						onClick={e => e.stopPropagation()}
					>
						<header
							className="flex items-start justify-between gap-3 border-b px-4 py-3"
							style={{ borderColor: WA.border }}
						>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span
										className="grid h-8 w-8 place-items-center rounded-xl"
										style={{ background: WA.greenSoft, color: WA.greenText }}
									>
										<Zap className="h-4 w-4" />
									</span>
									<div>
										<h3 className="text-[15px] font-bold" style={{ color: WA.text }}>
											{t.fastReplies}
										</h3>
										<p className="text-[11px]" style={{ color: WA.muted }}>
											{t.fastRepliesHint}
										</p>
									</div>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setQuickRepliesOpen(false)}
								className="rounded-lg p-1.5 transition hover:bg-black/5"
								style={{ color: WA.icon }}
							>
								<X className="h-4 w-4" />
							</button>
						</header>

						<div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
							{quickRepliesLoading ? (
								<div className="flex items-center justify-center gap-2 py-10 text-[12px]" style={{ color: WA.muted }}>
									<LoaderCircle className="h-4 w-4 animate-spin" />
									…
								</div>
							) : quickReplies.length === 0 ? (
								<p className="py-8 text-center text-[12px]" style={{ color: WA.muted }}>
									{t.fastReplyEmpty}
								</p>
							) : (
								quickReplies.map(reply => (
									<div
										key={reply.id}
										className="group flex items-start gap-2 rounded-xl border px-3 py-2.5 transition hover:bg-black/[0.02]"
										style={{ borderColor: WA.border }}
									>
										<button
											type="button"
											className="min-w-0 flex-1 text-start"
											onClick={() => useQuickReply(reply)}
										>
											<div className="flex items-center gap-1.5">
												<span className="text-[13px] font-semibold" style={{ color: WA.text }}>
													{reply.title}
												</span>
												{reply.isDefault ? (
													<span
														className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
														style={{ background: WA.greenSoft, color: WA.greenText }}
													>
														default
													</span>
												) : null}
											</div>
											<p
												className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-[11px] leading-snug"
												style={{ color: WA.muted }}
											>
												{reply.body}
											</p>
										</button>
										{!reply.isDefault ? (
											<button
												type="button"
												title={t.fastReplyDelete}
												onClick={() => void deleteQuickReply(reply.id)}
												className="shrink-0 rounded-lg p-1.5 opacity-60 transition hover:bg-rose-50 hover:opacity-100"
												style={{ color: '#E53935' }}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										) : null}
									</div>
								))
							)}
						</div>

						<div className="border-t px-3 py-3" style={{ borderColor: WA.border }}>
							{quickReplyFormOpen ? (
								<form onSubmit={e => void saveQuickReply(e)} className="space-y-2">
									<input
										value={quickReplyTitle}
										onChange={e => setQuickReplyTitle(e.target.value)}
										placeholder={t.fastReplyTitle}
										className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none"
										style={{ borderColor: WA.border, color: WA.text }}
										required
									/>
									<textarea
										value={quickReplyBody}
										onChange={e => setQuickReplyBody(e.target.value)}
										placeholder={t.fastReplyBody}
										rows={4}
										className="w-full resize-none rounded-xl border px-3 py-2 text-[13px] outline-none"
										style={{ borderColor: WA.border, color: WA.text }}
										required
									/>
									<div className="flex justify-end gap-2">
										<button
											type="button"
											onClick={() => setQuickReplyFormOpen(false)}
											className="rounded-xl px-3 py-2 text-[12px] font-semibold"
											style={{ color: WA.muted }}
										>
											{t.cancel}
										</button>
										<button
											type="submit"
											disabled={quickReplySaving}
											className="rounded-xl px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
											style={{ background: WA.green }}
										>
											{quickReplySaving ? '…' : t.fastReplySave}
										</button>
									</div>
								</form>
							) : (
								<div className="flex gap-2">
									{draft.trim() ? (
										<button
											type="button"
											onClick={() => {
												setQuickReplyBody(draft.trim());
												setQuickReplyTitle('');
												setQuickReplyFormOpen(true);
											}}
											className="flex-1 rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:bg-black/[0.02]"
											style={{ borderColor: WA.border, color: WA.text }}
										>
											{isAr ? 'حفظ المسودة كرد' : 'Save draft as reply'}
										</button>
									) : null}
									<button
										type="button"
										onClick={() => {
											setQuickReplyTitle('');
											setQuickReplyBody('');
											setQuickReplyFormOpen(true);
										}}
										className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white"
										style={{ background: WA.green }}
									>
										<Plus className="h-3.5 w-3.5" />
										{t.fastReplyAdd}
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{phoneOpen && (
				<div className="absolute inset-0 z-40 grid place-items-center bg-[rgba(11,20,26,0.35)] p-4" onClick={() => setPhoneOpen(false)}>
					<form onSubmit={onOpenPhone} className="w-full max-w-sm space-y-3 rounded-2xl p-5" style={{ background: WA.panel }} onClick={e => e.stopPropagation()}>
						<h3 className="text-lg font-semibold">{t.openPhone}</h3>
						<p className="text-[12px] text-[#667781]">{t.phoneHint}</p>
						<label className="block space-y-1.5">
							<span className="text-[12px] font-medium text-[#667781]">{t.openPhone}</span>
							<input
								type="tel"
								inputMode="tel"
								dir="ltr"
								value={phoneInput}
								onChange={e => {
									setPhoneInput(e.target.value);
									if (phoneTouched) {
										const next = e.target.value.trim();
										if (!next) setPhoneError(t.phoneRequired);
										else if (!normalizeWaPhone(next)) setPhoneError(t.phoneInvalid);
										else setPhoneError(null);
									}
								}}
								onBlur={() => setPhoneTouched(true)}
								placeholder={t.phonePlaceholder}
								aria-invalid={Boolean(phoneError)}
								className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
									phoneError
										? 'border-rose-400 bg-[#FFF5F5] focus:border-rose-500'
										: 'border-[#D1D7DB] bg-[#F0F2F5] focus:border-[#00A884]'
								}`}
								autoFocus
							/>
						</label>
						{parsedPhone && !phoneError ? (
							<p className="text-[12px] text-[#008069]" dir="ltr">
								{t.phoneNormalized}: +{parsedPhone}
							</p>
						) : null}
						{phoneError ? <p className="text-[12px] text-rose-600">{phoneError}</p> : null}
						<label className="block space-y-1.5">
							<span className="text-[12px] font-medium text-[#667781]">{t.displayNameOptional}</span>
							<input
								value={phoneName}
								onChange={e => setPhoneName(e.target.value)}
								className="w-full rounded-lg border border-[#D1D7DB] bg-[#F0F2F5] px-3 py-2 text-sm outline-none focus:border-[#00A884]"
							/>
						</label>
						<div className="flex justify-end gap-2 pt-1">
							<button
								type="button"
								onClick={() => {
									setPhoneOpen(false);
									setPhoneError(null);
									setPhoneTouched(false);
								}}
								className="px-3 py-2 text-sm text-[#667781]"
							>
								{t.cancel}
							</button>
							<button
								type="submit"
								disabled={openingPhone || !parsedPhone}
								className="rounded-lg bg-[#00A884] px-4 py-2 text-sm font-semibold text-[#111B21] disabled:opacity-50"
							>
								{openingPhone ? '…' : t.open}
							</button>
						</div>
					</form>
				</div>
			)}

			{configOpen && (
				<div className="absolute inset-0 z-30 flex justify-end bg-[rgba(11,20,26,0.35)]" onClick={() => setConfigOpen(false)}>
					<aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-s" style={{ background: WA.panel, borderColor: WA.border }} onClick={e => e.stopPropagation()}>
						<header className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: WA.border, background: WA.header }}>
							<div>
								<h2 className="text-lg font-semibold">{t.configTitle}</h2>
								<p className="mt-1 text-[12px] text-[#667781]">{t.configSubtitle}</p>
							</div>
							<button type="button" onClick={() => setConfigOpen(false)} className="p-2 text-[#54656F]"><X className="h-4 w-4" /></button>
						</header>
						<div className="space-y-4 p-5">
							<span className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: status?.enabled ? WA.greenSoft : '#FFF3C7', color: status?.enabled ? '#008069' : '#54656F' }}>
								{status?.enabled ? t.enabled : t.disabled} · {connectionLabel}
								{status?.displayPhoneNumber ? ` · ${status.displayPhoneNumber}` : ''}
							</span>

							<form onSubmit={onSave} className="space-y-3">
								<ConfigField
									label={t.webhook}
									value={webhookUrl}
									t={t}
									readOnly
									mono
									hint={t.webhookHint}
								/>
								<ConfigField
									label={t.phoneNumberId}
									value={form.phoneNumberId}
									onChange={v => setForm(f => ({ ...f, phoneNumberId: v }))}
									t={t}
									mono
									required
								/>
								<ConfigField
									label={t.wabaId}
									value={form.wabaId}
									onChange={v => setForm(f => ({ ...f, wabaId: v }))}
									t={t}
									mono
									required
									hint={t.wabaHint}
								/>
								<ConfigField
									label={t.verifyToken}
									value={form.verifyToken}
									onChange={v => setForm(f => ({ ...f, verifyToken: v }))}
									t={t}
									mono
									required
									saved={Boolean(status?.hasVerifyToken || status?.verifyToken)}
									onGenerate={() => setForm(f => ({ ...f, verifyToken: randomVerifyToken() }))}
								/>
								<ConfigField
									label={t.accessToken}
									value={form.accessToken}
									onChange={v => setForm(f => ({ ...f, accessToken: v }))}
									t={t}
									type="password"
									required
									hint={t.accessTokenHint}
									saved={Boolean(status?.hasAccessToken)}
									placeholder={
										status?.hasAccessToken
											? `${t.savedSecret} (${status.accessTokenHint})`
											: t.requiredMark
									}
								/>
								<ConfigField
									label={t.appSecret}
									value={form.appSecret}
									onChange={v => setForm(f => ({ ...f, appSecret: v }))}
									t={t}
									type="password"
									required
									saved={Boolean(status?.hasAppSecret)}
									placeholder={
										status?.hasAppSecret
											? `${t.savedSecret} (${status.appSecretHint})`
											: t.requiredMark
									}
								/>
								<ConfigField
									label={t.graphVersion}
									value={status?.graphApiVersion || 'v21.0'}
									t={t}
									readOnly
									mono
								/>

								{status?.lastError && <p className="text-[12px] text-rose-600">{status.lastError}</p>}

								<div className="flex flex-wrap gap-2 pt-1">
									<button type="submit" disabled={saving} className="rounded-lg bg-[#00A884] px-4 py-2 text-sm font-semibold text-[#111B21] disabled:opacity-50">
										{saving ? '…' : t.save}
									</button>
									<button type="button" onClick={() => void onValidate()} disabled={validating} className="rounded-lg border border-[#D1D7DB] px-4 py-2 text-sm">
										{validating ? '…' : t.validate}
									</button>
									<button
										type="button"
										onClick={() => void onToggleEnabled()}
										className="rounded-lg border border-[#D1D7DB] px-4 py-2 text-sm"
									>
										{status?.enabled ? t.toggleOff : t.toggleOn}
									</button>
								</div>
							</form>
						</div>
					</aside>
				</div>
			)}

			{activityOpen && (
				<div className="absolute inset-0 z-30 flex justify-end bg-[rgba(11,20,26,0.35)]" onClick={() => setActivityOpen(false)}>
					<aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-s" style={{ background: WA.panel, borderColor: WA.border }} onClick={e => e.stopPropagation()}>
						<header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: WA.border, background: WA.header }}>
							<h2 className="text-lg font-semibold">{t.activity}</h2>
							<button type="button" onClick={() => setActivityOpen(false)} className="p-2 text-[#54656F]"><X className="h-4 w-4" /></button>
						</header>
						<ul className="divide-y divide-[#E9EDEF] p-2">
							{activity.map(row => (
								<li key={row.id} className="px-3 py-3">
									<div className="text-sm font-medium">{row.action}</div>
									<pre className="mt-1 overflow-auto text-[11px] text-[#667781]">{JSON.stringify(row.details || {}, null, 0)}</pre>
								</li>
							))}
							{!activity.length && <li className="py-10 text-center text-sm text-[#667781]">—</li>}
						</ul>
					</aside>
				</div>
			)}


			{usageOpen && (
				<div
					className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(11,20,26,0.45)] p-3 sm:p-4"
					onClick={() => setUsageOpen(false)}
				>
					<div
						className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(11,20,26,0.28)]"
						style={{ background: '#FFFFFF' }}
						onClick={e => e.stopPropagation()}
					>
						{usageLoading && !usageData ? (
							<div className="grid min-h-[220px] place-items-center">
								<LoaderCircle className="h-6 w-6 animate-spin" style={{ color: WA.green }} />
							</div>
						) : !usageData ? (
							<div className="flex flex-col items-center gap-2 px-5 py-12">
								<p className="text-[12px]" style={{ color: WA.muted }}>{t.usageEmpty}</p>
								<button type="button" onClick={() => setUsageOpen(false)} className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: WA.green }}>OK</button>
							</div>
						) : (() => {
								const s = usageData.summary || {};
								const fx = Number(usageData.fx?.usdToEgp || 50.7);
								const cats = Object.entries(s.byCategory || {});
								const maxCat = Math.max(1, ...cats.map(([, c]) => Number(c) || 0));
								const daily = usageData.daily || [];
								const maxSent = Math.max(1, ...daily.map(d => Number(d.sent) || 0));
								const vs = Number(s.vsPreviousMonthPct || 0);
								const rateCard = [...(usageData.rateCardSample || [])].sort((a, b) => {
									const prefer = ['EGYPT', 'SAUDI', 'UAE', 'QATAR', 'KUWAIT', 'BAHRAIN', 'OMAN'];
									const ai = prefer.indexOf(a.market);
									const bi = prefer.indexOf(b.market);
									if (ai !== -1 || bi !== -1) {
										if (ai === -1) return 1;
										if (bi === -1) return -1;
										return ai - bi;
									}
									return String(a.label || '').localeCompare(String(b.label || ''));
								});
								const selectedRate =
									rateCard.find(r => r.market === usageMarket) ||
									rateCard.find(r => r.market === 'EGYPT') ||
									rateCard[0] ||
									null;
								const rateRows = selectedRate
									? [
											{ key: 'marketing', label: t.usageRateMarketing, usd: selectedRate.marketing, color: '#C2410C', soft: '#FFF1E8' },
											{ key: 'utility', label: t.usageRateUtility, usd: selectedRate.utility, color: '#0F766E', soft: '#E8F8F2' },
											{ key: 'authentication', label: t.usageRateAuth, usd: selectedRate.authentication, color: '#1D4ED8', soft: '#EEF4FF' },
											{ key: 'service', label: t.usageRateService, usd: selectedRate.service, color: '#15803D', soft: '#ECFDF3' },
										]
									: [];

								return (
									<>
										<header
											className="flex shrink-0 items-center justify-between gap-2 border-b px-3.5 py-2.5"
											style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#F8FAF9' }}
										>
											<div className="min-w-0">
												<div className="flex items-center gap-1.5">
													<ChartColumn className="h-3.5 w-3.5 shrink-0" style={{ color: WA.green }} />
													<h3 className="truncate text-[14px] font-bold" style={{ color: WA.text }}>{t.usageBillingTitle}</h3>
												</div>
												<p className="mt-0.5 text-[10px]" style={{ color: WA.muted }}>{t.usageThisMonth} · 1 USD ≈ {fx.toFixed(1)} EGP</p>
											</div>
											<div className="flex shrink-0 items-center gap-1">
												<button type="button" disabled={usageLoading} onClick={() => void loadUsageBilling()} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-black/5 disabled:opacity-50" title={t.usageRefresh}>
													{usageLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" style={{ color: WA.muted }} />}
												</button>
												<button type="button" onClick={() => setUsageOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-black/5">
													<X className="h-3.5 w-3.5" style={{ color: WA.muted }} />
												</button>
											</div>
										</header>

										<div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
											<div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5" style={{ background: 'linear-gradient(135deg, #0B3D2E, #1FA755)' }}>
												<div>
													<div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{t.usageEstimated}</div>
													<div className="mt-0.5 text-[18px] font-bold tabular-nums text-white">{formatMoneyUsd(s.estimatedCostUsd || 0)}</div>
													<div className="text-[11px] font-medium text-white/85">{formatMoneyEgp(s.estimatedCostEgp ?? Number(((s.estimatedCostUsd || 0) * fx).toFixed(2)))}</div>
												</div>
												<div className="text-end">
													<div className="text-[10px] text-white/70">{t.usageBillable}</div>
													<div className="text-[15px] font-bold tabular-nums text-white">{s.billableDelivered ?? 0}</div>
													<div className="mt-0.5 text-[10px] font-semibold text-white/80">
														{vs >= 0 ? '▲' : '▼'} {Math.abs(vs).toFixed(0)}% {t.usageVsPrev}
													</div>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-1.5">
												{[
													{ label: t.usageSent, value: s.sent },
													{ label: t.usageDelivered, value: s.delivered },
													{ label: t.usageRead, value: s.read },
													{ label: t.usageFailed, value: s.failed },
												].map(card => (
													<div
														key={card.label}
														className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
														style={{ background: '#F4F6F5' }}
													>
														<span className="text-[11px] font-semibold" style={{ color: WA.muted }}>{card.label}</span>
														<span className="text-[15px] font-bold tabular-nums" style={{ color: WA.text }}>{card.value ?? 0}</span>
													</div>
												))}
											</div>

											<section className="rounded-xl border px-2.5 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
												<div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
													<div>
														<div className="text-[11px] font-bold" style={{ color: WA.text }}>{t.usageCountryRates}</div>
														<div className="text-[9px]" style={{ color: WA.muted }}>{t.usagePerMessage}</div>
													</div>
													<label className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: WA.muted }}>
														{t.usageSelectCountry}
														<select
															value={usageMarket}
															onChange={e => setUsageMarket(e.target.value)}
															className="rounded-md border px-2 py-1 text-[11px] font-semibold outline-none"
															style={{ borderColor: 'rgba(0,0,0,0.12)', color: WA.text, background: '#fff' }}
														>
															{rateCard.map(r => (
																<option key={r.market} value={r.market}>{r.label}</option>
															))}
														</select>
													</label>
												</div>
												<div className="space-y-1.5">
													{rateRows.map(row => {
														const per100Egp = Number((Number(row.usd || 0) * fx * 100).toFixed(2));
														return (
															<div key={row.key} className="rounded-lg px-2.5 py-1.5" style={{ background: row.soft }}>
																<div className="flex items-center justify-between gap-2">
																	<span className="text-[11px] font-bold" style={{ color: row.color }}>{row.label}</span>
																	<span className="text-[12px] font-bold tabular-nums" style={{ color: WA.text }}>
																		{formatRateUsd(row.usd)}
																		<span className="ms-1 text-[9px] font-semibold" style={{ color: WA.muted }}>/ {t.usageRatePerMsg}</span>
																	</span>
																</div>
																<div className="mt-0.5 flex items-center justify-between gap-2">
																	<span className="text-[9px] font-semibold" style={{ color: WA.muted }}>{t.usageRatePer100}</span>
																	<span className="text-[11px] font-bold tabular-nums" style={{ color: WA.text }}>
																		{formatMoneyEgp(per100Egp)}
																	</span>
																</div>
															</div>
														);
													})}
												</div>
											</section>

											<div className="grid gap-2 sm:grid-cols-2">
												<section className="rounded-xl border px-2.5 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
													<h4 className="text-[11px] font-bold" style={{ color: WA.text }}>{t.usageByCategory}</h4>
													<p className="mb-2 text-[9px] leading-snug" style={{ color: WA.muted }}>{t.usageByCategoryHint}</p>
													<div className="mb-1 flex items-center justify-between gap-2 px-0.5 text-[9px] font-semibold" style={{ color: WA.muted }}>
														<span>{t.usageTplType}</span>
														<span className="flex gap-3">
															<span>{t.usageCatMsgs}</span>
															<span>{t.usageCatCost}</span>
														</span>
													</div>
													<div className="space-y-2">
														{cats.length ? cats.map(([cat, count]) => {
															const style = USAGE_CAT_STYLE[cat] || USAGE_CAT_STYLE.UNKNOWN;
															const costUsd = Number(usageData.byCategoryCost?.[cat] || 0);
															const costEgp = Number(usageData.byCategoryCostEgp?.[cat]) || Number((costUsd * fx).toFixed(2));
															const pct = Math.round((Number(count) / maxCat) * 100);
															return (
																<div key={cat}>
																	<div className="flex items-center justify-between gap-2">
																		<span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: style.bg, color: style.text }}>{cat}</span>
																		<div className="flex items-center gap-3">
																			<span className="min-w-[2rem] text-end text-[11px] font-bold tabular-nums" style={{ color: WA.text }}>{count}</span>
																			<MoneyDuo size="inline" usd={costUsd} egp={costEgp} />
																		</div>
																	</div>
																	<div className="mt-1 flex items-center gap-1.5">
																		<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5">
																			<div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.bar }} />
																		</div>
																		<span className="w-7 text-end text-[9px] font-semibold tabular-nums" style={{ color: WA.muted }}>{pct}%</span>
																	</div>
																</div>
															);
														}) : <p className="text-[10px]" style={{ color: WA.muted }}>—</p>}
													</div>
												</section>

												<section className="rounded-xl border px-2.5 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
													<h4 className="mb-1.5 text-[11px] font-bold" style={{ color: WA.text }}>{t.usageByCountry}</h4>
													<div className="max-h-36 space-y-1 overflow-y-auto">
														{(usageData.byCountry || []).length ? (usageData.byCountry || []).map(row => (
															<div key={row.country} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1" style={{ background: '#F4F6F5' }}>
																<div className="min-w-0">
																	<div className="truncate text-[11px] font-semibold" style={{ color: WA.text }}>{row.label || row.country}</div>
																	<div className="text-[9px]" style={{ color: WA.muted }}>{row.count} msgs</div>
																</div>
																<MoneyDuo size="inline" usd={row.estimatedCostUsd} egp={row.estimatedCostEgp ?? Number((Number(row.estimatedCostUsd || 0) * fx).toFixed(2))} />
															</div>
														)) : <p className="text-[10px]" style={{ color: WA.muted }}>—</p>}
													</div>
												</section>
											</div>

											<section className="rounded-xl border px-2.5 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
												<h4 className="mb-1.5 text-[11px] font-bold" style={{ color: WA.text }}>{t.usageDaily}</h4>
												{!daily.length ? (
													<p className="text-[10px]" style={{ color: WA.muted }}>{t.usageEmpty}</p>
												) : (
													<div className="flex h-20 items-end gap-0.5 overflow-x-auto">
														{daily.map(day => {
															const h = Math.max(4, Math.round((Number(day.sent) / maxSent) * 56));
															const egp = day.estimatedCostEgp ?? Number((Number(day.estimatedCostUsd || 0) * fx).toFixed(2));
															return (
																<div key={day.date} className="group relative flex w-5 shrink-0 flex-col items-center gap-0.5" title={`${day.date}: ${day.sent} · ${formatMoneyUsd(day.estimatedCostUsd)} / ${formatMoneyEgp(egp)}`}>
																	<div className="w-full rounded-t" style={{ height: h, background: '#1FA755' }} />
																	<span className="text-[7px] tabular-nums" style={{ color: WA.muted }}>{String(day.date).slice(8)}</span>
																</div>
															);
														})}
													</div>
												)}
											</section>

											<section className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
												<div className="border-b px-2.5 py-1.5" style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#F8FAF9' }}>
													<h4 className="text-[11px] font-bold" style={{ color: WA.text }}>{t.usageTemplates}</h4>
												</div>
												<div className="max-h-44 overflow-auto">
													<table className="min-w-full text-start text-[10px]">
														<thead style={{ color: WA.muted }}>
															<tr>
																<th className="px-2.5 py-1.5 text-start font-semibold">Name</th>
																<th className="px-1.5 py-1.5 text-start font-semibold">{t.usageTplType}</th>
																<th className="px-1.5 py-1.5 text-start font-semibold">{t.usageSent}</th>
																<th className="px-1.5 py-1.5 text-start font-semibold">{t.usageDelivered}</th>
																<th className="px-2.5 py-1.5 text-start font-semibold">{t.usageTplCost}</th>
															</tr>
														</thead>
														<tbody>
															{(usageData.templates || []).map(tpl => {
																const style = USAGE_CAT_STYLE[tpl.category] || USAGE_CAT_STYLE.UNKNOWN;
																return (
																	<tr key={tpl.name} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
																		<td className="px-2.5 py-1.5 text-start font-semibold" style={{ color: WA.text }}>{tpl.name}</td>
																		<td className="px-1.5 py-1.5 text-start">
																			<span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: style.bg, color: style.text }}>
																				{tpl.category}
																			</span>
																		</td>
																		<td className="px-1.5 py-1.5 text-start tabular-nums font-semibold">{tpl.sent}</td>
																		<td className="px-1.5 py-1.5 text-start tabular-nums">{tpl.delivered}</td>
																		<td className="px-2.5 py-1.5 text-start">
																			<MoneyDuo
																				size="inline"
																				usd={tpl.estimatedCostUsd}
																				egp={tpl.estimatedCostEgp ?? Number((Number(tpl.estimatedCostUsd || 0) * fx).toFixed(2))}
																			/>
																		</td>
																	</tr>
																);
															})}
															{!(usageData.templates || []).length ? (
																<tr><td colSpan={5} className="px-2.5 py-6 text-center" style={{ color: WA.muted }}>—</td></tr>
															) : null}
														</tbody>
													</table>
												</div>
											</section>

											<p className="text-[9px] leading-relaxed" style={{ color: WA.muted }}>
												{usageData.disclaimer || t.usageDisclaimer}
												{usageData.invoiceNote ? ` · ${usageData.invoiceNote}` : ''}
											</p>
										</div>
									</>
								);
							})()}
						</div>
					</div>
			)}



			{mediaLightbox?.url ? (
				<MediaLightbox
					url={mediaLightbox.url}
					kind={mediaLightbox.kind}
					onClose={() => setMediaLightbox(null)}
				/>
			) : null}
		</div>
	);
}
