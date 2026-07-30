'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
	Check,
	CheckCheck,
	Copy,
	FileText,
	Image as ImageIcon,
	Link2,
	LoaderCircle,
	MessageCircle,
	Mic,
	Paperclip,
	Phone,
	Plus,
	Radar,
	RefreshCw,
	Search,
	Send,
	Settings2,
	ShieldCheck,
	Square,
	LayoutTemplate,
	Trash2,
	Video,
	X,
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
		backLeads: 'Lead Scout',
		refresh: 'Refresh inbox',
		sync: 'Sync from DB',
		syncHint:
			'Meta Cloud API cannot import WhatsApp history from before the webhook. Sync reloads messages stored in this system for this number.',
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
		templateName: 'Template name',
		templateLang: 'Language',
		sendTemplate: 'Send template',
		templates: 'Templates',
		templatesHint: 'Approved Meta templates only can be sent. New templates need Meta review.',
		createTemplate: 'Create template',
		addNewTemplate: 'Add new',
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
		templateLoadError: 'Could not load templates from Meta',
		templateVarRequired: 'Fill all template variables',
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
			'Common causes: use {{1}}/{{2}} (not {{name}}); URL buttons need https://; footer cannot have variables; TEXT header allows only one {{1}}.',
		recording: 'Recording… tap stop to send',
		configTitle: 'Meta WhatsApp configuration',
		configSubtitle: 'Connect Cloud API credentials. Copy webhook + verify token into Meta Developer Console.',
		accessToken: 'Permanent Access Token',
		phoneNumberId: 'Phone Number ID',
		wabaId: 'WABA ID',
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
		backLeads: 'كشّاف العملاء',
		refresh: 'تحديث الوارد',
		sync: 'مزامنة من النظام',
		syncHint:
			'Meta Cloud API لا تستورد سجل واتساب قبل ربط الـ Webhook. المزامنة تجلب الرسائل المحفوظة في النظام لهذا الرقم.',
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
		templateName: 'اسم القالب',
		templateLang: 'اللغة',
		sendTemplate: 'إرسال قالب',
		templates: 'القوالب',
		templatesHint: 'يُرسل فقط القوالب المعتمدة من ميتا. القوالب الجديدة تحتاج مراجعة ميتا.',
		createTemplate: 'إنشاء قالب',
		addNewTemplate: 'إضافة جديد',
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
		templateLoadError: 'تعذر تحميل القوالب من ميتا',
		templateVarRequired: 'املأ كل متغيرات القالب',
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
			'الأسباب الشائعة: استخدم {{1}} و {{2}} (وليس {{name}})؛ أزرار الرابط يجب أن تبدأ بـ https://؛ التذييل بدون متغيرات؛ عنوان TEXT يسمح بـ {{1}} فقط.',
		recording: 'جاري التسجيل… اضغط إيقاف للإرسال',
		configTitle: 'إعدادات ميتا واتساب',
		configSubtitle: 'اربط بيانات Cloud API. انسخ الـ Webhook ورمز التحقق إلى Meta Developer.',
		accessToken: 'رمز الوصول الدائم',
		phoneNumberId: 'معرّف رقم الهاتف',
		wabaId: 'معرّف WABA',
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
						id: `BUTTON:${index}:${v.key}`,
						label: `Button ${index + 1} URL · {{${v.key}}}`,
					});
				});
			});
		}
	}
	return out;
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
	const send = (sendComponents || []).find(
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

function renderTemplateMessageDisplay(message, templates = []) {
	if (!message) return '';
	if (message.messageType !== 'template') return message.body || '';
	const raw = String(message.body || '');
	if (raw && !raw.startsWith('[template:')) return raw;

	const tpl =
		templates.find(
			t =>
				t.name === message.templateName &&
				(!message.templateLanguage || t.language === message.templateLanguage),
		) || templates.find(t => t.name === message.templateName);

	if (tpl?.components?.length) {
		const header = fillTemplatePlaceholders(
			templateHeaderText(tpl.components),
			message.templateComponents,
			'header',
		);
		const body = fillTemplatePlaceholders(
			templatePreviewText(tpl.components),
			message.templateComponents,
			'body',
		);
		const footer = templateFooterText(tpl.components);
		return [header, body, footer].filter(Boolean).join('\n') || message.templateName || raw;
	}
	return message.templateName || raw.replace(/^\[template:(.*)\]$/, '$1');
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

function AlertBanner({ message, tone = 'error', onClose, hint, t }) {
	const parsed = parseFlashMessage(message);
	if (!parsed) return null;
	const isError = tone === 'error';
	const showHint =
		hint ||
		(isError && /invalid parameter/i.test(parsed.full) ? t?.metaInvalidParamHint : null);

	return (
		<div
			className="flex items-start gap-3 rounded-xl px-3.5 py-3 text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.06)]"
			style={{
				background: isError ? '#FDECEC' : '#E1FFD4',
				color: isError ? '#9B1C1C' : '#1FA755',
				border: `1px solid ${isError ? '#F5C2C2' : '#B7EFC5'}`,
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
	return flash === t.saveOk || flash === t.validateOk || flash === t.templateCreateOk;
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

function MediaBubble({ message }) {
	const [url, setUrl] = useState(null);
	const [failed, setFailed] = useState(false);

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

	const type = message.messageType;
	if (failed) return <div className="text-[12px] opacity-70">Media unavailable</div>;
	if (!url) {
		return (
			<div className="flex h-24 w-40 items-center justify-center rounded-lg bg-black/5">
				<LoaderCircle className="h-5 w-5 animate-spin opacity-60" />
			</div>
		);
	}
	if (type === 'image') {
		return (
			<a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={url} alt={message.body || 'image'} className="max-h-72 max-w-full object-contain" />
			</a>
		);
	}
	if (type === 'audio' || type === 'voice') {
		return <audio controls preload="metadata" src={url} className="max-w-full" />;
	}
	if (type === 'video') {
		return <video controls preload="metadata" src={url} className="max-h-72 max-w-full rounded-lg" />;
	}
	return (
		<a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
			<FileText className="h-4 w-4" />
			{message.mediaFileName || 'Document'}
		</a>
	);
}

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
	const [templateName, setTemplateName] = useState('');
	const [templateLang, setTemplateLang] = useState(isAr ? 'ar' : 'en');
	const [templates, setTemplates] = useState([]);
	const [templatesLoading, setTemplatesLoading] = useState(false);
	const [templatesError, setTemplatesError] = useState(null);
	const [sidebarView, setSidebarView] = useState('chats'); // chats | templates
	const [templatesMode, setTemplatesMode] = useState('list'); // list | create
	const [createFormErrors, setCreateFormErrors] = useState({});
	const [sendTemplateOpen, setSendTemplateOpen] = useState(false);
	const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
	const [templateVarValues, setTemplateVarValues] = useState({});
	const [creatingTemplate, setCreatingTemplate] = useState(false);
	const [createForm, setCreateForm] = useState(() => emptyCreateTemplateForm(isAr));
	const [headerSampleFile, setHeaderSampleFile] = useState(null);
	const [headerSamplePreview, setHeaderSamplePreview] = useState('');
	const headerSampleRef = useRef(null);
	const [activity, setActivity] = useState([]);
	const [sending, setSending] = useState(false);
	const [recording, setRecording] = useState(false);
	const [initialConversation, setInitialConversation] = useState(null);
	const bottomRef = useRef(null);
	const fileRef = useRef(null);
	const imageRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const chunksRef = useRef([]);
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

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, activeId]);

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
			setStatus(data.status || data);
			setFlash(t.validateOk);
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
		for (const p of selectedPlaceholders) {
			if (!String(templateVarValues[p.id] || '').trim()) {
				setFlash(t.templateVarRequired);
				return;
			}
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
		const errors = validateCreateTemplateForm(createForm, t, {
			hasHeaderSample: Boolean(headerSampleFile || createForm.headerHandle),
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
			await metaWhatsAppApi.createTemplate({
				name: safeName,
				language: createForm.language.trim() || 'en_US',
				category: createForm.category,
				headerFormat,
				headerText:
					headerFormat === 'TEXT' ? createForm.headerText.trim() || undefined : undefined,
				headerHandle: ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)
					? headerHandle
					: undefined,
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
			});
			setFlash(t.templateCreateOk);
			setCreateForm(emptyCreateTemplateForm(isAr));
			setHeaderSampleFile(null);
			if (headerSamplePreview) URL.revokeObjectURL(headerSamplePreview);
			setHeaderSamplePreview('');
			setCreateFormErrors({});
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
		setHeaderSampleFile(null);
		if (headerSamplePreview) URL.revokeObjectURL(headerSamplePreview);
		setHeaderSamplePreview('');
		setCreateFormErrors({});
		setFlash(null);
	}

	function onHeaderSamplePick(file) {
		if (!file) return;
		setHeaderSampleFile(file);
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

	function openSendTemplate() {
		setFlash(null);
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

	async function startRecording() {
		if (!active?.canSendFreeform) {
			setFlash(t.windowClosed);
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream);
			chunksRef.current = [];
			recorder.ondataavailable = ev => {
				if (ev.data?.size) chunksRef.current.push(ev.data);
			};
			recorder.onstop = async () => {
				stream.getTracks().forEach(tr => tr.stop());
				const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
				const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
				await uploadFile(file, { asVoice: true });
			};
			mediaRecorderRef.current = recorder;
			recorder.start();
			setRecording(true);
		} catch {
			setFlash(isAr ? 'لا يمكن الوصول للميكروفون' : 'Microphone permission denied');
		}
	}

	function stopRecording() {
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state !== 'inactive') recorder.stop();
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
							{(flash || error) && (
								<div className="mb-2">
									<AlertBanner
										message={error || flash}
										tone={error || !isSuccessFlash(flash, t) ? 'error' : 'success'}
										onClose={() => {
											setFlash(null);
											setError(null);
										}}
										t={t}
									/>
								</div>
							)}
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
									<div className="text-[14px] font-bold" style={{ color: WA.text }}>{t.createTemplate}</div>
									<div className="text-[12px]" style={{ color: WA.muted }}>{t.templateMetaDetails}</div>
								</div>
								<button
									type="button"
									onClick={() => {
										setTemplatesMode('list');
										setCreateFormErrors({});
									}}
									className="rounded-md px-3 py-1.5 text-[12px] font-semibold"
									style={{ color: WA.icon }}
								>
									{t.backToTemplates}
								</button>
							</header>
							<div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-2">
								<form onSubmit={onCreateTemplate} className="min-h-0 space-y-3 overflow-y-auto border-b p-4 lg:border-b-0 lg:border-e" style={{ borderColor: WA.border }}>
									{(flash || Object.keys(createFormErrors).length > 0) && (
										<AlertBanner
											message={Object.values(createFormErrors)[0] || flash}
											tone={flash === t.templateCreateOk ? 'success' : 'error'}
											onClose={() => {
												setFlash(null);
												setCreateFormErrors({});
											}}
											t={t}
										/>
									)}
									<label className="block space-y-1">
										<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateName} *</span>
										<input
											value={createForm.name}
											onChange={e => {
												const name = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
												setCreateForm(f => ({ ...f, name }));
												setCreateFormErrors(err => ({ ...err, name: undefined }));
											}}
											placeholder="hello_world"
											className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
											style={{ borderColor: createFormErrors.name ? '#F87171' : WA.border, background: WA.field }}
										/>
										{createFormErrors.name ? <p className="text-[11px] text-rose-600">{createFormErrors.name}</p> : null}
									</label>
									<div className="flex gap-2">
										<label className="block w-1/2 space-y-1">
											<span className="text-[12px] font-medium" style={{ color: WA.muted }}>{t.templateLang} *</span>
											<select
												value={createForm.language}
												onChange={e => {
													setCreateForm(f => ({ ...f, language: e.target.value }));
													setCreateFormErrors(err => ({ ...err, language: undefined }));
												}}
												className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
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
												onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
												className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
												style={{ borderColor: WA.border, background: WA.field }}
											>
												<option value="UTILITY">UTILITY</option>
												<option value="MARKETING">MARKETING</option>
												<option value="AUTHENTICATION">AUTHENTICATION</option>
											</select>
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
										{creatingTemplate ? '…' : t.createTemplate}
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
								<div className="flex items-center gap-2">
									<button type="button" onClick={() => void loadTemplates()} title={t.refreshTemplates} className="rounded-md p-1.5" style={{ color: WA.icon }}>
										{templatesLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" strokeWidth={1.75} />}
									</button>
									<button
										type="button"
										onClick={() => {
											resetCreateTemplate();
											setTemplatesMode('create');
										}}
										className="inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 text-[12px] font-semibold text-white"
										style={{ background: WA.green }}
									>
										<Plus className="h-3.5 w-3.5" />
										{t.addNewTemplate}
									</button>
								</div>
							</header>
							{(templatesError || flash) && (
								<div className="mx-4 mt-3">
									<AlertBanner
										message={templatesError || flash}
										tone={templatesError || !isSuccessFlash(flash, t) ? 'error' : 'success'}
										onClose={() => {
											setFlash(null);
											setTemplatesError(null);
										}}
										t={t}
									/>
								</div>
							)}
							<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" style={chatWallpaperStyle}>
								{templatesLoading && !templates.length ? (
									<p className="py-16 text-center text-[13px]" style={{ color: WA.muted }}>…</p>
								) : !templates.length ? (
									<p className="py-16 text-center text-[13px]" style={{ color: WA.muted }}>{t.templateEmptyList}</p>
								) : (
									templates.map(tpl => {
										const hdrFmt = templateHeaderFormat(tpl.components);
										const btns = templateButtons(tpl.components);
										return (
											<div key={`${tpl.id || tpl.name}-${tpl.language}`} className="mx-auto w-full max-w-[520px]">
												<div className="mb-2 flex items-center justify-between gap-2 px-1">
													<div className="min-w-0">
														<div className="truncate text-[13px] font-bold" style={{ color: WA.text }}>{tpl.name}</div>
														<div className="text-[11px]" style={{ color: WA.muted }}>
															{tpl.language} · {tpl.category || '—'}
															{hdrFmt ? ` · ${hdrFmt}` : ''}
															{btns.length ? ` · ${btns.length} btn` : ''}
														</div>
													</div>
													<span
														className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
														style={{
															background: String(tpl.status).toUpperCase() === 'APPROVED' ? WA.greenSoft : '#FFF3C7',
															color: String(tpl.status).toUpperCase() === 'APPROVED' ? WA.greenText : WA.muted,
														}}
													>
														{tpl.status || '—'}
													</span>
												</div>
												<div className="flex justify-start">
													<div
														className="max-w-[360px] min-w-[160px] overflow-hidden text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.06)]"
														style={{ background: WA.bubbleIn, color: WA.text, borderRadius: 12 }}
													>
														{hdrFmt === 'IMAGE' ? (
															<div className="flex h-28 items-center justify-center" style={{ background: '#D1D7DB' }}>
																<ImageIcon className="h-7 w-7" style={{ color: WA.muted }} />
															</div>
														) : null}
														{hdrFmt === 'VIDEO' ? (
															<div className="flex h-28 items-center justify-center" style={{ background: '#D1D7DB' }}>
																<Video className="h-7 w-7" style={{ color: WA.muted }} />
															</div>
														) : null}
														{hdrFmt === 'DOCUMENT' ? (
															<div className="flex items-center gap-2 px-3 pt-2.5">
																<FileText className="h-5 w-5" style={{ color: WA.muted }} />
																<span className="text-[12px]" style={{ color: WA.muted }}>Document</span>
															</div>
														) : null}
														<div className="px-3 py-2">
															{templateHeaderText(tpl.components) ? (
																<div className="mb-1 text-[12px] font-bold">{templateHeaderText(tpl.components)}</div>
															) : null}
															<div className="whitespace-pre-wrap break-words">
																{templatePreviewText(tpl.components) || '—'}
															</div>
															{templateFooterText(tpl.components) ? (
																<div className="mt-1 text-[11px]" style={{ color: WA.muted }}>{templateFooterText(tpl.components)}</div>
															) : null}
														</div>
														{btns.length ? (
															<div className="border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
																{btns.map((btn, i) => (
																	<div
																		key={`${btn.text}-${i}`}
																		className="flex items-center justify-center gap-1.5 border-t px-3 py-2 text-[13px] font-semibold"
																		style={{ borderColor: i === 0 ? 'transparent' : 'rgba(0,0,0,0.06)', color: '#027EB5' }}
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
											</div>
										);
									})
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
								<button type="button" onClick={() => void onSync()} className="rounded-md p-1" style={{ color: WA.icon }} title={t.syncHint}>
									<RefreshCw className="h-6 w-6" strokeWidth={1.75} />
								</button>
							</div>
						</header>

						<div className="relative z-0 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3" style={chatWallpaperStyle}>
							<div className="mx-auto rounded-lg px-3.5 py-1.5 text-center text-[10px] shadow-[0_1px_0_rgba(0,0,0,0.08)]" style={{ background: WA.dateChip, color: WA.dateText }}>{t.encryption}</div>
							<div className="mx-auto max-w-[360px] rounded-lg px-3.5 py-1.5 text-center text-[10px] shadow-[0_1px_0_rgba(0,0,0,0.08)]" style={{ background: WA.chipMeta, color: WA.metaNote }}>{t.metaNote}</div>
							{messages.map(m => {
								const mine = m.direction === 'outbound';
								return (
									<div key={m.id} className={`flex px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
										<div
											className="relative max-w-[360px] min-w-[84px] px-2.5 pb-2 pt-1.5 text-[13px] font-medium leading-[1.35] shadow-[0_1px_0_rgba(0,0,0,0.08)]"
											style={{
												background: mine ? WA.bubbleOut : WA.bubbleIn,
												color: WA.text,
												borderRadius: 12,
											}}
										>
											{m.messageType === 'template' && (
												<div className="mb-0.5 text-[11px]" style={{ color: WA.muted }}>
													{m.templateName}
												</div>
											)}
											{m.hasMedia && <MediaBubble message={m} />}
											{(() => {
												const text = renderTemplateMessageDisplay(m, templates);
												if (!text) return null;
												if (m.messageType === 'image' || m.messageType === 'audio' || m.messageType === 'voice') {
													return null;
												}
												return <div className="whitespace-pre-wrap break-words">{text}</div>;
											})()}
											{(m.messageType === 'image' || m.messageType === 'document') &&
												m.body &&
												!String(m.body).startsWith('[') &&
												m.messageType !== 'template' && (
													<div className="whitespace-pre-wrap break-words">{m.body}</div>
												)}
											<div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.50)' }}>
												<span>{formatTime(m.createdAt || m.providerTimestamp, locale)}</span>
												{mine && <StatusTicks status={m.status} />}
											</div>
											{m.errorMessage && <div className="mt-1 text-[11px] text-rose-600">{m.errorMessage}</div>}
										</div>
									</div>
								);
							})}
							<div ref={bottomRef} />
						</div>

						<footer className="z-10 flex items-end gap-2 px-2.5 py-2.5" style={{ background: WA.composeBar }}>
							{active.canSendFreeform ? (
								recording ? (
									<div className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2" style={{ background: WA.input }}>
										<span className="text-sm text-rose-600">{t.recording}</span>
										<button type="button" onClick={stopRecording} className="grid h-8 w-8 place-items-center rounded-full bg-rose-500 text-white">
											<Square className="h-4 w-4" />
										</button>
									</div>
								) : (
									<form onSubmit={onSendText} className="flex w-full items-end gap-2">
										<input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadFile(f); }} />
										<input ref={fileRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadFile(f); }} />
										<button type="button" disabled={sending} onClick={() => imageRef.current?.click()} className="rounded-2xl p-1" style={{ color: WA.icon }} title="Image">
											<ImageIcon className="h-6 w-6" strokeWidth={1.75} />
										</button>
										<button type="button" disabled={sending} onClick={() => fileRef.current?.click()} className="rounded-2xl p-1" style={{ color: WA.icon }} title="Attach">
											<Paperclip className="h-6 w-6" strokeWidth={1.75} />
										</button>
										<button type="button" disabled={sending} onClick={openSendTemplate} className="rounded-2xl p-1" style={{ color: WA.icon }} title={t.sendTemplate}>
											<LayoutTemplate className="h-6 w-6" strokeWidth={1.75} />
										</button>
										<div
											className="relative flex min-h-[36px] flex-1 items-end rounded-2xl px-3 py-1.5"
											style={{ background: WA.input, outline: `0.5px solid ${WA.composeBorder}`, outlineOffset: -0.5 }}
										>
											<input
												value={draft}
												onChange={e => setDraft(e.target.value)}
												placeholder={t.typeMessage}
												className="w-full bg-transparent py-1 text-[13px] font-medium outline-none placeholder:text-black/40"
												style={{ color: WA.text, lineHeight: '16.6px' }}
											/>
										</div>
										{draft.trim() ? (
											<button type="submit" disabled={sending} className="rounded-2xl p-1 disabled:opacity-50" style={{ color: WA.green }}>
												<Send className="h-6 w-6" strokeWidth={1.75} />
											</button>
										) : (
											<button type="button" disabled={sending} onClick={() => void startRecording()} className="rounded-2xl p-1" style={{ color: WA.icon }} title="Voice">
												<Mic className="h-6 w-6" strokeWidth={1.75} />
											</button>
										)}
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
								{selectedPlaceholders.map(p => (
									<label key={p.id} className="block space-y-1">
										<span className="text-[12px] text-[#667781]">{p.label}</span>
										<input
											value={templateVarValues[p.id] || ''}
											onChange={e =>
												setTemplateVarValues(v => ({ ...v, [p.id]: e.target.value }))
											}
											required
											className="w-full rounded-lg border border-[#D1D7DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#00A884]"
										/>
									</label>
								))}
							</div>
						) : null}

						{flash && sendTemplateOpen ? (
							<div className="mb-1">
								<AlertBanner
									message={flash}
									tone={
										flash === t.templateVarRequired || flash === t.sendError || /invalid|fail|error/i.test(flash)
											? 'error'
											: 'success'
									}
									onClose={() => setFlash(null)}
									t={t}
								/>
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

								{flash && (
									<div className="mb-1">
										<AlertBanner
											message={flash}
											tone={isSuccessFlash(flash, t) ? 'success' : 'error'}
											onClose={() => setFlash(null)}
											t={t}
										/>
									</div>
								)}
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
		</div>
	);
}
