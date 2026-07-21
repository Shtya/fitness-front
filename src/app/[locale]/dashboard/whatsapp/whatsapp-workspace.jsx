'use client';

import { cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
	Activity,
	AlertTriangle,
	ArrowDownLeft,
	ArrowUpRight,
	BarChart3,
	Bell,
	Check,
	CheckCheck,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock,
	Camera,
	Download,
	EyeOff,
	ExternalLink,
	FileText,
	Globe2,
	Image as ImageIcon,
	Loader2,
	LogOut,
	MapPin,
	Maximize2,
	MoreHorizontal,
	MessageCircle,
	Mic,
	Paperclip,
	Pause,
	Pin,
	Play,
	Plus,
	Phone,
	RefreshCw,
	Reply,
	Search,
	Send,
	Settings,
	Smile,
	ShieldCheck,
	Smartphone,
	SmilePlus,
	Sparkles,
	Square,
	Star,
	Sticker,
	StickyNote,
	Trash2,
	TrendingUp,
	User,
	UserPlus,
	Users,
	Video,
	Wifi,
	WifiOff,
	X,
	Zap,
} from 'lucide-react';
import api from '@/utils/axios';
import { PageHeader } from '@/components/molecules/PageHeader';
import TranscriptionDialog from '../transcript/transcription-dialog';
import { createTranscriptionFile } from '../transcript/transcription-client';
import {
	conversationTitle,
	firstMessageLink,
	groupConsecutiveImageMessages,
	isRenderableWhatsAppMessage,
	mergeMessages,
	messageTextPresentation,
	normalizeWhatsAppIdentity,
	parseWhatsAppBold,
	messageTextSegments,
	relativeTime,
	seekRatio,
} from './whatsapp-utils';
import { DemoModeProvider, useDemoMode } from './demo/DemoModeProvider';
import DemoModeSettings from './demo/components/DemoModeSettings';
import { demoApi } from './demo/demo-api';
import {
	buildEffectiveConversations,
	buildEffectiveMessages,
	isDemoId,
	rawDemoId,
	resolveConversationSource,
} from './demo/demo-read-model';
import {
	canRouteDemoWrite,
	routeMessageCommand,
} from './demo/demo-command-adapter';
import AiReplySuggestions from './ai/AiReplySuggestions';
import WhatsAppAiSettings from './ai/WhatsAppAiSettings';
import { useWhatsAppAi } from './ai/use-whatsapp-ai';

const translations = {
	en: {
		title: 'WhatsApp',
		subtitle: 'Accounts, conversations and customer support',
		liveLabel: 'Live workspace',
		accounts: 'Accounts',
		chats: 'Chats',
		calls: 'Calls',
		updates: 'Updates',
		communities: 'Communities',
		noCalls: 'No WhatsApp calls yet',
		callsUnavailable: 'Call history is not provided by the connected WhatsApp account.',
		stories: 'Stories',
		groups: 'Groups',
		statuses: 'Stories',
		notifications: 'Notifications',
		reports: 'Reports',
		settings: 'Settings',
		settingsAi: 'AI replies',
		settingsDemo: 'Demo mode',
		settingsNotifications: 'Notifications',
		settingsPrivacy: 'Privacy',
		settingsAccess: 'Team access',
		profile: 'Profile',
		newAccount: 'New account',
		accountName: 'Account name',
		connect: 'Connect',
		disconnect: 'Disconnect',
		logout: 'Log out',
		deleteAccount: 'Delete account',
		deleteAccountConfirm:
			'Permanently delete "{name}"? This removes its session, conversations, messages, media, stories, groups and access records. This cannot be undone.',
		accountDeleted: 'WhatsApp account deleted',
		resetSession: 'Reset & resync',
		resetSessionConfirm:
			'Delete all synchronized data for "{name}" and download it again from the connected phone? The current WhatsApp link and staff access will be kept.',
		sessionResetStarted:
			'Old synchronized data was deleted and a clean synchronization was started.',
		scanQr: 'Scan this QR code from WhatsApp',
		scanQrHint: 'Open WhatsApp on your phone → Linked devices → Link a device',
		noAccounts: 'No WhatsApp accounts yet',
		noAccountsHint: 'Create your first account to start connecting WhatsApp',
		noConversations: 'No conversations yet',
		noAssignedConversations: 'No conversations assigned to you',
		connectToSeeChats: 'Connect this account to view conversations',
		connectToSeeStories: 'Connect this account to view stories',
		syncingChats: 'Syncing chats from WhatsApp…',
		syncProgress: 'Sync progress',
		selectConversation: 'Select a conversation to start',
		noMessagesYet: 'No messages in this conversation yet',
		loadingMessages: 'Loading messages…',
		mediaUnavailable: 'Media unavailable',
		loadingMedia: 'Loading media…',
		fileAttachment: 'File attachment',
		openFile: 'Open',
		downloadFile: 'Download',
		openLink: 'Open link',
		transcribe: 'Transcribe',
		recordVoice: 'Record voice message',
		recordingVoice: 'Recording voice message',
		cancelRecording: 'Cancel recording',
		sendRecording: 'Stop and send',
		microphoneDenied: 'Microphone permission was denied',
		microphoneUnavailable: 'No microphone is available',
		recordingUnsupported: 'Voice recording is not supported in this browser',
		recordingFailed: 'Voice recording failed',
		recordingStartFailed: 'Could not start voice recording',
		message: 'Write a message',
		send: 'Send',
		sync: 'Sync',
		older: 'Load older messages',
		assign: 'Assign',
		unassign: 'Unassigned',
		publish: 'Publish',
		refresh: 'Refresh',
		loading: 'Loading…',
		statusUpdate: "What's on your mind?",
		publishStatus: 'Publish story',
		statusPublished: 'Story published',
		syncingStatuses: 'Syncing new stories…',
		saveAccess: 'Save access',
		privacySettings: 'Privacy & read receipts',
		savePrivacy: 'Save privacy',
		hideStatusViews: 'View stories privately',
		hideStatusViewsHint: 'Do not tell contacts when you open their stories.',
		hideStatusViewsWarning:
			'Best-effort only: WhatsApp may still record a view when media is downloaded. Verify on two test accounts before relying on this.',
		readReceiptMode: 'When to send blue read receipts',
		readReceiptModeHint: 'Controls when contacts see the blue double-check on messages you’ve read.',
		readOnOpen: 'When a conversation is opened',
		readOnReply: 'Only when you reply',
		readManual: 'Only when I click Mark as read',
		readNever: 'Never',
		privacyOn: 'On',
		privacyOff: 'Off',
		markRead: 'Mark as read',
		markedRead: 'Blue read receipt sent',
		privacySaved: 'WhatsApp privacy settings updated',
		pushNotifications: 'Phone push notifications',
		pushNotificationsHint:
			'Get a notification as soon as a new WhatsApp message arrives, even when this PWA is closed.',
		enablePush: 'Enable notifications',
		pushEnabled: 'Notifications enabled',
		pushDenied: 'Notifications are blocked in your browser settings',
		pushUnsupported: 'Push notifications are not supported on this device',
		pushEnableFailed: 'Could not enable push notifications',
		notes: 'Internal notes',
		notesHint: 'Visible to staff only — never sent on WhatsApp',
		addNote: 'Add note',
		notePlaceholder: 'Add an internal note…',
		noNotes: 'No internal notes yet',
		noteSaved: 'Note added',
		search: 'Search conversations',
		allChats: 'All',
		unreadChats: 'Unread',
		favoriteChats: 'Favorites',
		assignedTo: 'Assigned to',
		allAssignees: 'All assignees',
		favoriteUpdated: 'Favorite updated',
		pinChat: 'Pin chat',
		unpinChat: 'Unpin chat',
		pinUpdated: 'Pinned chats updated',
		messagePreviewFallback: 'Message',
		online: 'Connected',
		offline: 'Not connected',
		connecting: 'Connecting',
		syncingPhone: 'Syncing with phone… keep WhatsApp open on your phone',
		connectStarted: 'WhatsApp session started',
		connectStillSyncing: 'Session started — still syncing with your phone',
		sessionLinkedHint: 'Your phone shows this device as linked. Restoring session…',
		qrPending: 'Waiting for scan',
		errorStatus: 'Connection error',
		provider: 'Provider',
		status: 'Status',
		lastConnected: 'Last connected',
		allSet: 'All good',
		needsAttention: 'Needs attention',
		totalConversations: 'Conversations',
		unreadTotal: 'Unread',
		avgResponse: 'Avg. response time',
		totalMessages: 'Total messages',
		inbound: 'Inbound',
		outbound: 'Outbound',
		failed: 'Failed',
		delivered: 'All delivered',
		noReportData: 'No report data for this period yet',
		permissions: 'Permissions',
		addStaff: 'Add staff member',
		noGroups: 'No groups yet',
		noStatuses: 'No active stories on this phone',
		storiesSessionSyncing:
			'WhatsApp is still linking on the server. Keep WhatsApp open on your phone, or reconnect from Accounts.',
		storiesSyncFailed: 'Could not load stories from WhatsApp. Reconnect the account and try again.',
		storiesEmptyAfterSync:
			'WhatsApp returned no stories. Open Status on your phone once, then tap refresh here.',
		groupDetails: 'Group details',
		openGroupChat: 'Open group chat',
		groupDescription: 'Description',
		groupOwner: 'Owner',
		groupParticipants: 'Participants',
		groupAdmins: 'Admins',
		chatUnavailable: 'This group chat is not available with your current assignment',
		storyFrom: 'Story from',
		readOnly: 'Read-only access',
		noLogs: 'No activity yet',
		noStaffAccess: 'No staff added to this account',
		noStaffAccessHint: 'Add a staff member from the left to set what they can view, use, and manage here',
		allStaffAdded: 'Every staff member already has access',
		searchStaff: 'Search staff',
		staffOnAccount: 'staff on this account',
		permView: 'See conversations',
		permUse: 'Send messages',
		permManage: 'Edit account settings',
		permAssign: 'Assign conversations',
		permTransfer: 'Transfer ownership',
		performance: 'Team performance',
		selectAccountFirst: 'Select a WhatsApp account to continue',
		workspaceLoadFailed: 'Could not load the WhatsApp workspace',
		retry: 'Retry',
		collapseHeader: 'Collapse WhatsApp header',
		expandHeader: 'Expand WhatsApp header',
	},
	ar: {
		title: 'واتساب',
		subtitle: 'إدارة الحسابات والمحادثات ودعم العملاء',
		liveLabel: 'مساحة عمل مباشرة',
		accounts: 'الحسابات',
		chats: 'المحادثات',
		calls: 'المكالمات',
		updates: 'التحديثات',
		communities: 'المجتمعات',
		noCalls: 'لا توجد مكالمات واتساب حتى الآن',
		callsUnavailable: 'سجل المكالمات غير متاح من حساب واتساب المتصل.',
		stories: 'الحالات',
		groups: 'المجموعات',
		statuses: 'الحالات',
		notifications: 'الإشعارات',
		reports: 'التقارير',
		settings: 'الإعدادات',
		settingsAi: 'ردود الذكاء الاصطناعي',
		settingsDemo: 'الوضع التجريبي',
		settingsNotifications: 'الإشعارات',
		settingsPrivacy: 'الخصوصية',
		settingsAccess: 'صلاحيات الفريق',
		profile: 'الملف الشخصي',
		newAccount: 'حساب جديد',
		accountName: 'اسم الحساب',
		connect: 'ربط الحساب',
		disconnect: 'قطع الاتصال',
		logout: 'تسجيل الخروج',
		deleteAccount: 'حذف الحساب',
		deleteAccountConfirm:
			'هل تريد حذف "{name}" نهائيًا؟ سيتم حذف الجلسة والمحادثات والرسائل والوسائط والحالات والمجموعات والصلاحيات، ولا يمكن التراجع.',
		accountDeleted: 'تم حذف حساب واتساب',
		resetSession: 'حذف وإعادة المزامنة',
		resetSessionConfirm:
			'هل تريد حذف كل البيانات المتزامنة للحساب "{name}" وتنزيلها من الهاتف المتصل مرة أخرى؟ سيبقى ربط واتساب وصلاحيات الموظفين كما هما.',
		sessionResetStarted:
			'تم حذف البيانات القديمة وبدأت مزامنة نظيفة من الهاتف.',
		scanQr: 'امسح رمز QR من تطبيق واتساب',
		scanQrHint: 'افتح واتساب على هاتفك ← الأجهزة المرتبطة ← ربط جهاز',
		noAccounts: 'لا توجد حسابات واتساب',
		noAccountsHint: 'أنشئ أول حساب لبدء ربط واتساب',
		noConversations: 'لا توجد محادثات بعد',
		noAssignedConversations: 'لا توجد محادثات مسندة إليك',
		connectToSeeChats: 'اتصل بالحساب لعرض المحادثات',
		connectToSeeStories: 'اتصل بالحساب لعرض الحالات',
		syncingChats: 'جارِ مزامنة المحادثات من واتساب…',
		syncProgress: 'تقدم المزامنة',
		selectConversation: 'اختر محادثة للبدء',
		noMessagesYet: 'لا توجد رسائل في هذه المحادثة بعد',
		loadingMessages: 'جارِ تحميل الرسائل…',
		mediaUnavailable: 'تعذر عرض الوسائط',
		loadingMedia: 'جارِ تحميل الوسائط…',
		fileAttachment: 'ملف مرفق',
		openFile: 'فتح',
		downloadFile: 'تنزيل',
		openLink: 'فتح الرابط',
		transcribe: 'تحويل إلى نص',
		recordVoice: 'تسجيل رسالة صوتية',
		recordingVoice: 'جارِ تسجيل رسالة صوتية',
		cancelRecording: 'إلغاء التسجيل',
		sendRecording: 'إيقاف وإرسال',
		microphoneDenied: 'تم رفض إذن استخدام الميكروفون',
		microphoneUnavailable: 'لا يوجد ميكروفون متاح',
		recordingUnsupported: 'تسجيل الصوت غير مدعوم في هذا المتصفح',
		recordingFailed: 'فشل تسجيل الرسالة الصوتية',
		recordingStartFailed: 'تعذر بدء تسجيل الرسالة الصوتية',
		message: 'اكتب رسالة',
		send: 'إرسال',
		sync: 'مزامنة',
		older: 'تحميل رسائل أقدم',
		assign: 'إسناد',
		unassign: 'غير مسندة',
		publish: 'نشر',
		refresh: 'تحديث',
		loading: 'جارِ التحميل…',
		statusUpdate: 'بماذا تفكر؟',
		publishStatus: 'نشر حالة',
		statusPublished: 'تم نشر الحالة',
		syncingStatuses: 'جارِ مزامنة الحالات الجديدة…',
		saveAccess: 'حفظ الصلاحيات',
		privacySettings: 'الخصوصية وإيصالات القراءة',
		savePrivacy: 'حفظ الخصوصية',
		hideStatusViews: 'مشاهدة الحالات بشكل خفي',
		hideStatusViewsHint: 'لا تُرسل لصاحب الحالة أنك شاهدتها.',
		hideStatusViewsWarning:
			'محاولة أفضل جهد فقط: واتساب قد يسجل المشاهدة عند تنزيل الوسائط. اختبر على حسابين قبل الاعتماد عليها.',
		readReceiptMode: 'متى يتم إرسال علامتي القراءة الزرقاوين',
		readReceiptModeHint: 'يحدد متى يرى جهات الاتصال علامة القراءة الزرقاء على رسائلك.',
		readOnOpen: 'عند فتح المحادثة',
		readOnReply: 'عند الرد فقط',
		readManual: 'فقط عند الضغط على تمّت القراءة',
		readNever: 'عدم الإرسال نهائياً',
		privacyOn: 'مفعّل',
		privacyOff: 'غير مفعّل',
		markRead: 'تمّت القراءة',
		markedRead: 'تم إرسال علامتي القراءة الزرقاوين',
		privacySaved: 'تم تحديث إعدادات خصوصية واتساب',
		pushNotifications: 'إشعارات الهاتف',
		pushNotificationsHint:
			'استقبل إشعاراً فور وصول رسالة واتساب جديدة حتى عندما يكون تطبيق الويب مغلقاً.',
		enablePush: 'تفعيل الإشعارات',
		pushEnabled: 'الإشعارات مفعّلة',
		pushDenied: 'الإشعارات محظورة من إعدادات المتصفح',
		pushUnsupported: 'هذا الجهاز لا يدعم إشعارات الويب',
		pushEnableFailed: 'تعذر تفعيل الإشعارات',
		notes: 'ملاحظات داخلية',
		notesHint: 'ظاهرة للموظفين فقط — لا تُرسل على واتساب',
		addNote: 'إضافة ملاحظة',
		notePlaceholder: 'أضف ملاحظة داخلية…',
		noNotes: 'لا توجد ملاحظات داخلية بعد',
		noteSaved: 'تمت إضافة الملاحظة',
		search: 'بحث في المحادثات',
		allChats: 'الكل',
		unreadChats: 'غير مقروءة',
		favoriteChats: 'المفضلة',
		assignedTo: 'المسند إلى',
		allAssignees: 'كل الموظفين',
		favoriteUpdated: 'تم تحديث المفضلة',
		pinChat: 'تثبيت المحادثة',
		unpinChat: 'إلغاء تثبيت المحادثة',
		pinUpdated: 'تم تحديث المحادثات المثبتة',
		messagePreviewFallback: 'رسالة',
		online: 'متصل',
		offline: 'غير متصل',
		connecting: 'جارِ الاتصال',
		syncingPhone: 'جارٍ المزامنة مع الهاتف… أبقِ واتساب مفتوحاً على هاتفك',
		connectStarted: 'تم بدء جلسة واتساب',
		connectStillSyncing: 'بدأت الجلسة — ما زالت المزامنة مع الهاتف جارية',
		sessionLinkedHint: 'هاتفك يعرض الجهاز كمربوط. جارٍ استعادة الجلسة…',
		qrPending: 'بانتظار المسح',
		errorStatus: 'خطأ في الاتصال',
		provider: 'المزود',
		status: 'الحالة',
		lastConnected: 'آخر اتصال',
		allSet: 'كل شيء تمام',
		needsAttention: 'يحتاج انتباه',
		totalConversations: 'المحادثات',
		unreadTotal: 'غير مقروءة',
		avgResponse: 'متوسط وقت الرد',
		totalMessages: 'إجمالي الرسائل',
		inbound: 'واردة',
		outbound: 'صادرة',
		failed: 'فشلت',
		delivered: 'تم تسليم الكل',
		noReportData: 'لا توجد بيانات تقرير لهذه الفترة بعد',
		permissions: 'الصلاحيات',
		addStaff: 'إضافة موظف',
		noGroups: 'لا توجد مجموعات',
		noStatuses: 'لا توجد حالات نشطة على هذا الهاتف',
		storiesSessionSyncing:
			'واتساب ما زال يربط الجلسة على الخادم. أبقِ واتساب مفتوحاً على هاتفك، أو أعد الربط من الحسابات.',
		storiesSyncFailed: 'تعذر تحميل الحالات من واتساب. أعد ربط الحساب وحاول مرة أخرى.',
		storiesEmptyAfterSync:
			'لم يُرجع واتساب أي حالات. افتح الحالات على هاتفك مرة واحدة ثم اضغط تحديث هنا.',
		groupDetails: 'تفاصيل المجموعة',
		openGroupChat: 'فتح محادثة المجموعة',
		groupDescription: 'الوصف',
		groupOwner: 'المالك',
		groupParticipants: 'المشاركون',
		groupAdmins: 'المشرفون',
		chatUnavailable: 'محادثة هذه المجموعة غير متاحة ضمن الإسناد الحالي',
		storyFrom: 'حالة من',
		readOnly: 'صلاحية عرض فقط',
		noLogs: 'لا يوجد نشاط بعد',
		noStaffAccess: 'لم يتم إضافة موظفين لهذا الحساب',
		noStaffAccessHint: 'أضف موظفًا من القائمة على اليسار لتحديد ما يمكنه رؤيته واستخدامه وإدارته هنا',
		allStaffAdded: 'تمت إضافة جميع الموظفين بالفعل',
		searchStaff: 'بحث عن موظف',
		staffOnAccount: 'موظف على هذا الحساب',
		permView: 'رؤية المحادثات',
		permUse: 'إرسال الرسائل',
		permManage: 'تعديل إعدادات الحساب',
		permAssign: 'إسناد المحادثات',
		permTransfer: 'نقل الملكية',
		performance: 'أداء الفريق',
		selectAccountFirst: 'اختر حساب واتساب للمتابعة',
		workspaceLoadFailed: 'تعذر تحميل مساحة عمل واتساب',
		retry: 'إعادة المحاولة',
		collapseHeader: 'طي رأس واتساب',
		expandHeader: 'توسيع رأس واتساب',
	},
};

const tabs = [
	['accounts', Smartphone],
	['chats', MessageCircle],
	['statuses', Zap],
	['groups', Users],
	['notifications', Bell],
	['reports', BarChart3],
	['settings', Settings],
];

const GRADIENT = 'linear-gradient(135deg, #1DAB61 0%, #1DAB61 100%)';
const GLOW = '0 10px 24px -10px var(--color-primary-400)';
const CONVERSATIONS_CACHE_TTL = 30_000;
const MESSAGES_CACHE_TTL = 30_000;
const STATUSES_CACHE_TTL = 60_000;
const MESSAGE_PAGE_SIZE = 30;

function newClientMessageId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function statusMeta(status, t) {
	if (status === 'connected') return { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: t.online };
	if (['connecting', 'qr_pending'].includes(status)) return { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', label: status === 'qr_pending' ? t.qrPending : t.connecting };
	if (status === 'error') return { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', label: t.errorStatus };
	return { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: t.offline };
}

function statusGradient(status) {
	if (status === 'connected') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
	if (['connecting', 'qr_pending'].includes(status)) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
	if (status === 'error') return 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
	return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
}

const AVATAR_GRADIENTS = [
	'from-[var(--color-primary-500)] to-[var(--color-secondary-500)]',
	'from-emerald-500 to-teal-500',
	'from-amber-500 to-orange-500',
	'from-sky-500 to-blue-600',
	'from-rose-500 to-pink-600',
	'from-violet-500 to-purple-600',
];

const AVATAR_PLACEHOLDER_STYLES = [
	{
		background: '#FFE4E8',
		color: '#A64D63',
	},
	{
		background: '#DDF4FF',
		color: '#317DA7',
	},
	{
		background: '#E8FFE3',
		color: '#4F8D47',
	},
];

function gradientFor(seed = '') {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % AVATAR_GRADIENTS.length;
	return AVATAR_GRADIENTS[hash];
}

function avatarPlaceholderStyle(seed = '') {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return AVATAR_PLACEHOLDER_STYLES[hash % AVATAR_PLACEHOLDER_STYLES.length];
}

function ImageMessage({ url, alt, onOpen, className = '' }) {
	const [loaded, setLoaded] = useState(false);

	return (
		<button
			type="button"
			aria-label={alt || 'Open image preview'}
			onClick={onOpen}
			className={`group relative block h-full min-h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}
		>
			{!loaded && <div className="absolute inset-0 animate-pulse bg-linear-to-br from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800" />}
			<img
				src={url}
				alt={alt}
				onLoad={() => setLoaded(true)}
				className={`h-full max-h-72 w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
			/>
			<div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/25 group-hover:opacity-100">
				<span className="rounded-full bg-black/50 p-2 text-white">
					<Maximize2 size={16} />
				</span>
			</div>
		</button>
	);
}

export default function WhatsAppWorkspace() {
	return (
		<DemoModeProvider>
			<WhatsAppWorkspaceContent />
		</DemoModeProvider>
	);
}

function ChatImageViewer({ images, activeId, onClose, onChange }) {
	const index = images.findIndex(image => String(image.id) === String(activeId));
	const image = images[index];
	const canNavigate = images.length > 1;

	useEffect(() => {
		if (!image) return undefined;
		const onKeyDown = event => {
			if (event.key === 'Escape') onClose();
			if (event.key === 'ArrowLeft' && canNavigate) {
				onChange(images[(index - 1 + images.length) % images.length].id);
			}
			if (event.key === 'ArrowRight' && canNavigate) {
				onChange(images[(index + 1) % images.length].id);
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [canNavigate, image, images, index, onChange, onClose]);

	if (!image) return null;
	const previous = () => onChange(images[(index - 1 + images.length) % images.length].id);
	const next = () => onChange(images[(index + 1) % images.length].id);

	return (
		<div role="dialog" aria-modal="true" aria-label="Chat image viewer" className="fixed inset-0 z-400 flex flex-col bg-[#0b141a]" onClick={onClose}>
			<div className="flex h-16 shrink-0 items-center justify-between px-4 text-white">
				<span className="text-sm font-semibold">{index + 1} / {images.length}</span>
				<div className="flex items-center gap-2">
					<a href={image.url} download={image.fileName || true} aria-label="Download image" onClick={event => event.stopPropagation()} className="rounded-full p-2 hover:bg-white/10">
						<Download size={21} />
					</a>
					<button type="button" onClick={onClose} aria-label="Close image viewer" className="rounded-full p-2 hover:bg-white/10">
						<X size={24} />
					</button>
				</div>
			</div>
			<div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-4">
				<img src={image.url} alt={image.fileName || 'Chat image'} onClick={event => event.stopPropagation()} className="max-h-full max-w-full object-contain" />
				{canNavigate && (
					<>
						<button type="button" aria-label="Previous image" onClick={event => { event.stopPropagation(); previous(); }} className="absolute start-3 grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65">
							<ChevronLeft size={26} />
						</button>
						<button type="button" aria-label="Next image" onClick={event => { event.stopPropagation(); next(); }} className="absolute end-3 grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65">
							<ChevronRight size={26} />
						</button>
					</>
				)}
			</div>
			{canNavigate && (
				<div className="flex h-20 shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-3" onClick={event => event.stopPropagation()}>
					{images.map(item => (
						<button key={item.id} type="button" onClick={() => onChange(item.id)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${String(item.id) === String(activeId) ? 'border-[#25D366]' : 'border-transparent opacity-60'}`}>
							<img src={item.url} alt="" className="h-full w-full object-cover" />
						</button>
					))}
				</div>
			)}
		</div>
	);
}

async function readBlobErrorMessage(blob) {
	try {
		const text = await blob.text();
		const parsed = JSON.parse(text);
		if (Array.isArray(parsed?.message)) return parsed.message.join(', ');
		return parsed?.message || text || null;
	} catch {
		return null;
	}
}

async function fetchStatusMediaBlob(accountId, statusId) {
	const response = await api.get(
		`/whatsapp/accounts/${accountId}/statuses/${statusId}/content`,
		{ responseType: 'blob', validateStatus: () => true },
	);
	const blob = response.data;
	if (!blob || response.status >= 400) {
		const message =
			(blob instanceof Blob ? await readBlobErrorMessage(blob) : null) ||
			'Media unavailable';
		throw new Error(message);
	}
	const headerType = String(response.headers?.['content-type'] || '')
		.split(';')[0]
		.trim()
		.toLowerCase();
	const blobType = String(blob.type || '')
		.split(';')[0]
		.trim()
		.toLowerCase();
	if (
		headerType.includes('json') ||
		blobType.includes('json') ||
		headerType.includes('text/html')
	) {
		throw new Error((await readBlobErrorMessage(blob)) || 'Media unavailable');
	}
	if (!blob.size) throw new Error('Media unavailable');
	const typed =
		blobType.startsWith('image/') || blobType.startsWith('video/')
			? blob
			: headerType.startsWith('image/') || headerType.startsWith('video/')
				? new Blob([blob], { type: headerType })
				: blob;
	return typed;
}

function StoryThumbnail({ label, size = 16, viewed = false, thumbUrl = '', thumbType = '' }) {
	// Thumbnails are fetched via the content endpoint only (never the /view
	// endpoint), so this never registers a WhatsApp "seen" receipt — that only
	// happens when a story is explicitly opened, see openStory().
	const isVideo = thumbType === 'video';
	return (
		<div className={viewed ? 'opacity-80' : undefined}>
			<Avatar label={label} size={size} src={!isVideo ? thumbUrl : ''} videoSrc={isVideo ? thumbUrl : ''} />
		</div>
	);
}

/* Segmented "stepper" ring around a story avatar — one arc per item, filled for
	 viewed items and gradient-highlighted for unviewed ones. Replaces the old
	 plain N/M count badge. */
function polarToCartesian(cx, cy, r, angleDeg) {
	const rad = ((angleDeg - 90) * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
	const start = polarToCartesian(cx, cy, r, endAngle);
	const end = polarToCartesian(cx, cy, r, startAngle);
	const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
	return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
function StoryRing({ size = 80, strokeWidth = 3, segmentsViewed, idSuffix = '' }) {
	const segs = segmentsViewed && segmentsViewed.length ? segmentsViewed : [false];
	const n = segs.length;
	const r = (size - strokeWidth) / 2;
	const cx = size / 2;
	const cy = size / 2;
	const gap = n > 1 ? Math.min(10, 360 / n / 3) : 0;
	const step = 360 / n;
	// Unique id per instance — reusing one static id across every ring in the
	// grid caused browsers to resolve url(#id) inconsistently, which is why
	// only some rings were rendering their stroke.
	const gradId = `storyRingGradient-${idSuffix || Math.random().toString(36).slice(2)}`;
	return (
		<svg width={size} height={size} className=" opacity-80 pointer-events-none absolute inset-0">
			<defs>
				<linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#25D366" />
					<stop offset="100%" stopColor="#128C7E" />
				</linearGradient>
			</defs>
			{segs.map((viewed, i) => {
				if (n === 1) {
					return (
						<circle
							key={i}
							cx={cx}
							cy={cy}
							r={r}
							fill="none"
							stroke={viewed ? '#cbd5e1' : `url(#${gradId})`}
							strokeWidth={strokeWidth}
						/>
					);
				}
				const start = i * step + gap / 2;
				const end = (i + 1) * step - gap / 2;
				return (
					<path
						key={i}
						d={describeArc(cx, cy, r, start, end)}
						fill="none"
						stroke={viewed ? '#cbd5e1' : `url(#${gradId})`}
						strokeWidth={strokeWidth}
						strokeLinecap="round"
					/>
				);
			})}
		</svg>
	);
}

function seededWaveform(seed = '', count = 32) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	const bars = [];
	for (let i = 0; i < count; i++) {
		hash = (hash * 1103515245 + 12345) >>> 0;
		bars.push(0.28 + ((hash >>> 8) % 100) / 100 * 0.72);
	}
	return bars;
}

function waveformPeaksFromAudioBuffer(audioBuffer, count = 36) {
	const channel = audioBuffer?.getChannelData?.(0);
	if (!channel?.length) return [];
	const blockSize = Math.max(1, Math.floor(channel.length / count));
	const peaks = [];
	for (let index = 0; index < count; index += 1) {
		const start = index * blockSize;
		const end = Math.min(channel.length, start + blockSize);
		let peak = 0;
		for (let cursor = start; cursor < end; cursor += 1) {
			peak = Math.max(peak, Math.abs(channel[cursor]));
		}
		peaks.push(peak);
	}
	const maxPeak = Math.max(...peaks, 0.001);
	return peaks.map(peak => Math.max(0.15, Math.min(1, peak / maxPeak)));
}

function formatClock(seconds) {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}

function durationFromFileName(fileName) {
	const match = String(fileName || '').match(/voice-(\d+(?:\.\d+)?)s/i);
	if (!match) return 0;
	const value = Number(match[1]);
	return Number.isFinite(value) && value > 0 ? value : 0;
}

async function probeAudioDuration(objectUrl) {
	return new Promise(resolve => {
		const audio = new Audio();
		let settled = false;
		const finish = value => {
			if (settled) return;
			settled = true;
			audio.removeAttribute('src');
			audio.load();
			resolve(Number.isFinite(value) && value > 0 ? value : 0);
		};
		const timer = setTimeout(() => finish(0), 4000);
		const tryRead = () => {
			const value = audio.duration;
			if (Number.isFinite(value) && value > 0) {
				clearTimeout(timer);
				finish(value);
				return true;
			}
			return false;
		};
		audio.preload = 'metadata';
		audio.addEventListener('loadedmetadata', () => {
			if (tryRead()) return;
			// Chrome webm often reports Infinity until we force a far seek.
			const onTick = () => {
				if (tryRead()) {
					audio.removeEventListener('timeupdate', onTick);
					audio.currentTime = 0;
				}
			};
			audio.addEventListener('timeupdate', onTick);
			try {
				audio.currentTime = 1e101;
			} catch {
				audio.removeEventListener('timeupdate', onTick);
			}
		});
		audio.addEventListener('error', () => {
			clearTimeout(timer);
			finish(0);
		});
		audio.src = objectUrl;
	});
}

async function prepareVoicePlaybackFromBlob(blob, mimeType) {
	const type = (mimeType || blob.type || 'audio/webm').split(';')[0];
	const typedBlob = blob.type ? blob : new Blob([blob], { type });
	const buffer = await typedBlob.arrayBuffer();
	const objectUrl = URL.createObjectURL(new Blob([buffer], { type }));

	let duration = 0;
	let waveform = [];
	try {
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (AudioCtx) {
			const ctx = new AudioCtx();
			try {
				const decoded = await ctx.decodeAudioData(buffer.slice(0));
				duration = decoded.duration || 0;
				waveform = waveformPeaksFromAudioBuffer(decoded);
			} finally {
				await ctx.close().catch(() => { });
			}
		}
	} catch {
		/* decodeAudioData can fail for some ogg/opus variants */
	}
	if (!(Number.isFinite(duration) && duration > 0)) {
		duration = await probeAudioDuration(objectUrl);
	}
	return { objectUrl, duration: Number.isFinite(duration) && duration > 0 ? duration : 0, waveform };
}

async function prepareVoicePlayback(sourceUrl, mimeType) {
	const response = await fetch(sourceUrl, { mode: 'cors', credentials: 'omit' });
	if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
	const blob = await response.blob();
	return prepareVoicePlaybackFromBlob(blob, mimeType || blob.type);
}

function VoicePlaybackButton({ playing, loading, downloaded, onClick }) {
	const label = loading ? 'Loading voice message' : downloaded ? (playing ? 'Pause voice message' : 'Play voice message') : 'Download voice message';
	return (
		<button type="button" onClick={onClick} disabled={loading} aria-label={label} className="wa-voice-play grid shrink-0 place-items-center transition-transform duration-180 active:scale-[0.96] disabled:opacity-70">
			{loading ? <Loader2 size={25} className="animate-spin" /> : !downloaded ? <Download size={25} /> : playing ? <Pause size={25} fill="currentColor" /> : <Play size={27} className="ms-0.5" fill="currentColor" />}
		</button>
	);
}

function VoiceWaveform({ peaks, progress, mine, loading, onSeek }) {
	return (
		<button type="button" onClick={onSeek} disabled={loading} aria-label="Seek voice message" className="wa-voice-waveform relative flex min-w-0 flex-1 items-center disabled:opacity-60">
			{peaks.map((height, index) => {
				const played = peaks.length > 0 && index / peaks.length <= progress;
				return <span key={index} className={played ? (mine ? 'is-played-outgoing' : 'is-played-incoming') : 'is-unplayed'} style={{ height: `${Math.round(4 + height * 22)}px` }} />;
			})}
			<span className={`wa-voice-thumb ${mine ? 'is-outgoing' : 'is-incoming'}`} style={{ left: `calc(${Math.max(0, Math.min(1, progress)) * 100}% - 6px)` }} />
		</button>
	);
}

function VoiceAvatar({ label, src, mine }) {
	return (
		<div className={`wa-voice-avatar-wrap relative shrink-0 ${mine ? 'is-outgoing' : 'is-incoming'}`}>
			<Avatar label={label} size={9} src={src} className="wa-voice-avatar ring-0" />
			<span className="wa-voice-mic-badge absolute grid place-items-center rounded-full"><Mic size={9} strokeWidth={3} /></span>
		</div>
	);
}

function VoicePlaybackRate({ value, onChange }) {
	return <button type="button" onClick={onChange} className="wa-voice-rate shrink-0 transition-transform duration-180 active:scale-[0.96]">{value}x</button>;
}

function VoiceReplyPreview({ reply }) {
	if (!reply) return null;
	return <div className="wa-voice-reply"><strong>{reply.sender}</strong><span><Mic size={13} /> {formatClock(reply.duration)}</span></div>;
}

function VoiceTranscribeButton({ label, disabled, onClick }) {
	return <button type="button" onClick={onClick} disabled={disabled} className="wa-transcribe disabled:opacity-60">{label}</button>;
}

function VoiceMessageOutgoing({ children }) {
	return <div className="wa-voice-layout is-outgoing">{children}</div>;
}

function VoiceMessageIncoming({ children }) {
	return <div className="wa-voice-layout is-incoming">{children}</div>;
}

function VoiceMessage({
	url,
	attachmentId,
	mine,
	mimeType,
	fileName,
	demoAttachment = false,
	seed,
	fallbackDuration = 0,
	avatarLabel,
	avatarSrc,
	transcribeLabel,
}) {
	const audioRef = useRef(null);
	const objectUrlRef = useRef(null);
	const voiceBlobRef = useRef(null);
	const [playing, setPlaying] = useState(false);
	const [loadingPlayback, setLoadingPlayback] = useState(true);
	const [currentTime, setCurrentTime] = useState(0);
	const [playbackUrl, setPlaybackUrl] = useState(null);
	const [playbackRate, setPlaybackRate] = useState(1);
	const fallbackBars = useMemo(() => seededWaveform(seed, 36), [seed]);
	const [bars, setBars] = useState(fallbackBars);
	const [transcriptionOpen, setTranscriptionOpen] = useState(false);
	const [transcript, setTranscript] = useState('');
	const [duration, setDuration] = useState(
		Number.isFinite(fallbackDuration) && fallbackDuration > 0 ? fallbackDuration : 0,
	);
	const Layout = mine ? VoiceMessageOutgoing : VoiceMessageIncoming;

	useEffect(() => {
		if (Number.isFinite(fallbackDuration) && fallbackDuration > 0) {
			setDuration(current => (current > 0 ? current : fallbackDuration));
		}
	}, [fallbackDuration]);

	useEffect(() => {
		let cancelled = false;
		voiceBlobRef.current = null;
		setPlaybackUrl(null);
		setCurrentTime(0);
		setPlaying(false);
		setLoadingPlayback(true);
		setBars(fallbackBars);

		const load = async () => {
			if (attachmentId) {
				const data = demoAttachment
					? await demoApi.getMedia(rawDemoId(attachmentId))
					: (
						await api.get(`/whatsapp/attachments/${attachmentId}/content`, {
							responseType: 'blob',
						})
					).data;
				voiceBlobRef.current = data;
				return prepareVoicePlaybackFromBlob(data, mimeType);
			}
			return prepareVoicePlayback(url, mimeType);
		};

		load()
			.then(({ objectUrl, duration: probed, waveform }) => {
				if (cancelled) {
					URL.revokeObjectURL(objectUrl);
					return;
				}
				if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = objectUrl;
				setPlaybackUrl(objectUrl);
				if (waveform?.length) setBars(waveform);
				if (probed > 0) setDuration(current => (current > 0 ? current : probed));
			})
			.catch(() => {
				if (!cancelled && url) setPlaybackUrl(url);
			})
			.finally(() => {
				if (!cancelled) setLoadingPlayback(false);
			});

		return () => {
			cancelled = true;
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
		};
	}, [url, attachmentId, demoAttachment, mimeType, fallbackBars]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !playbackUrl) return undefined;

		const applyDuration = value => {
			if (Number.isFinite(value) && value > 0) {
				setDuration(current => (current > 0 ? current : value));
			}
		};

		const onTime = () => {
			const time = audio.currentTime || 0;
			setCurrentTime(time);
			if (!(audio.duration > 0 && Number.isFinite(audio.duration)) && time > 0) {
				setDuration(current => Math.max(current, Math.ceil(time)));
			}
		};
		const onEnd = () => {
			const endedAt = audio.currentTime || 0;
			if (endedAt > 0) setDuration(current => Math.max(current, endedAt));
			setPlaying(false);
			setCurrentTime(0);
		};
		const onMeta = () => applyDuration(audio.duration);

		audio.addEventListener('loadedmetadata', onMeta);
		audio.addEventListener('durationchange', onMeta);
		audio.addEventListener('timeupdate', onTime);
		audio.addEventListener('ended', onEnd);
		if (audio.readyState >= 1) onMeta();
		return () => {
			audio.removeEventListener('loadedmetadata', onMeta);
			audio.removeEventListener('durationchange', onMeta);
			audio.removeEventListener('timeupdate', onTime);
			audio.removeEventListener('ended', onEnd);
		};
	}, [playbackUrl]);

	const toggle = async () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) {
			audio.pause();
			setPlaying(false);
			return;
		}
		try {
			await audio.play();
			setPlaying(true);
		} catch {
			setPlaying(false);
		}
	};

	const cyclePlaybackRate = () => {
		const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
		setPlaybackRate(next);
		if (audioRef.current) audioRef.current.playbackRate = next;
	};

	const seekTo = event => {
		const audio = audioRef.current;
		if (!audio || !duration) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const ratio = seekRatio(event.clientX, rect.left, rect.width, false);
		audio.currentTime = ratio * duration;
		setCurrentTime(audio.currentTime);
	};

	const loadTranscriptionFile = useCallback(async () => {
		let blob = voiceBlobRef.current;
		if (!blob && attachmentId) {
			blob = demoAttachment
				? await demoApi.getMedia(rawDemoId(attachmentId))
				: (
					await api.get(`/whatsapp/attachments/${attachmentId}/content`, {
						responseType: 'blob',
					})
				).data;
			voiceBlobRef.current = blob;
		} else if (!blob && url) {
			const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
			if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
			blob = await response.blob();
			voiceBlobRef.current = blob;
		}
		if (!blob) throw new Error('Voice message is unavailable');
		return createTranscriptionFile(blob, fileName, attachmentId, mimeType);
	}, [attachmentId, demoAttachment, fileName, mimeType, url]);

	const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

	return (
		<div className={`wa-voice-message mb-1 ${mine ? 'is-outgoing' : 'is-incoming'}`}>
			<audio ref={audioRef} preload="metadata" src={playbackUrl || undefined} className="hidden" />
			<Layout>
				<VoiceAvatar label={avatarLabel} src={avatarSrc} mine={mine} />
				<VoicePlaybackButton playing={playing} loading={loadingPlayback} downloaded={Boolean(playbackUrl)} onClick={toggle} />
				<div className="wa-voice-track min-w-0 flex-1">
					<VoiceWaveform peaks={bars} progress={progress} mine={mine} loading={loadingPlayback} onSeek={seekTo} />
					<span className="wa-voice-duration">{formatClock(currentTime || duration)}</span>
				</div>
				{playing && <VoicePlaybackRate value={playbackRate} onChange={cyclePlaybackRate} />}
			</Layout>
			{!mine && !transcript && <VoiceTranscribeButton label={transcribeLabel} disabled={!attachmentId && !url} onClick={() => setTranscriptionOpen(true)} />}
			{transcript && <p className="wa-transcript mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">{transcript}</p>}
			<TranscriptionDialog
				open={transcriptionOpen}
				onOpenChange={setTranscriptionOpen}
				loadFile={loadTranscriptionFile}
				onCompleted={text => setTranscript(String(text || '').trim())}
			/>
		</div>
	);
}

function formatAttachmentSize(value) {
	const bytes = Number(value);
	if (!Number.isFinite(bytes) || bytes <= 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
	if (bytes < 1024 ** 3) {
		return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
	}
	return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function attachmentExtension(fileName, mimeType) {
	const extension = String(fileName || '').split('.').pop();
	if (extension && extension !== fileName && extension.length <= 8) return extension.toUpperCase();
	const subtype = String(mimeType || '').split('/')[1]?.split(/[;+]/)[0];
	return subtype ? subtype.slice(0, 8).toUpperCase() : 'FILE';
}

export function MediaAttachment({
	attachment,
	mine,
	labels,
	onImageReady,
	onOpenImage,
	className = '',
	voiceAvatarLabel,
	voiceAvatarSrc,
}) {
	const [url, setUrl] = useState(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [fileAction, setFileAction] = useState('');
	const type = String(attachment?.type || '').toLowerCase();
	const isVoice = type === 'audio' || type === 'ptt' || type === 'voice';
	const isDocument = !['image', 'sticker', 'video', 'audio', 'ptt', 'voice'].includes(type);
	const demoAttachment = Boolean(attachment?.demoAttachment || isDemoId(attachment?.id));

	const loadAttachmentBlob = useCallback(async () => {
		if (attachment?.id) {
			return demoAttachment
				? demoApi.getMedia(rawDemoId(attachment.id))
				: (
						await api.get(`/whatsapp/attachments/${attachment.id}/content`, {
							responseType: 'blob',
						})
					).data;
		}
		if (attachment?.url) {
			const response = await fetch(attachment.url, {
				mode: 'cors',
				credentials: 'omit',
			});
			if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
			return response.blob();
		}
		throw new Error('Attachment is unavailable');
	}, [attachment?.id, attachment?.url, demoAttachment]);

	useEffect(() => {
		let cancelled = false;
		let objectUrl = null;
		if (isVoice || isDocument) {
			setLoading(false);
			return undefined;
		}
		if (!attachment?.id && !attachment?.url) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		setLoading(true);
		loadAttachmentBlob()
			.then(blob => {
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setUrl(objectUrl);
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
			if (type === 'image' || type === 'sticker') onImageReady?.(attachment.id, null);
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [attachment?.id, isDocument, isVoice, loadAttachmentBlob, onImageReady, type]);

	useEffect(() => {
		if (!url || (type !== 'image' && type !== 'sticker')) return;
		onImageReady?.(attachment.id, {
			id: attachment.id,
			url,
			fileName: attachment.fileName,
		});
	}, [attachment.id, attachment.fileName, onImageReady, type, url]);

	if (isVoice) {
		return (
			<VoiceMessage
				attachmentId={attachment.id}
				url={attachment.url}
				mine={mine}
				mimeType={attachment.mimeType}
				fileName={attachment.fileName}
				demoAttachment={demoAttachment}
				seed={String(attachment.id || attachment.fileName || attachment.url)}
				fallbackDuration={durationFromFileName(attachment.fileName)}
				avatarLabel={voiceAvatarLabel}
				avatarSrc={voiceAvatarSrc}
				transcribeLabel={labels.transcribe}
			/>
		);
	}

	const handleFileAction = async action => {
		if (fileAction) return;
		const previewWindow =
			action === 'open' ? window.open('about:blank', '_blank') : null;
		if (previewWindow) previewWindow.opener = null;
		setFileAction(action);
		try {
			const blob = await loadAttachmentBlob();
			const objectUrl = URL.createObjectURL(blob);
			if (action === 'download') {
				const anchor = document.createElement('a');
				anchor.href = objectUrl;
				anchor.download = attachment.fileName || 'attachment';
				anchor.click();
			} else if (previewWindow) {
				previewWindow.location.href = objectUrl;
			} else {
				window.open(objectUrl, '_blank', 'noopener,noreferrer');
			}
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
		} catch {
			previewWindow?.close();
			setFailed(true);
		} finally {
			setFileAction('');
		}
	};

	if (isDocument) {
		const extension = attachmentExtension(attachment.fileName, attachment.mimeType);
		const size = formatAttachmentSize(
			attachment.sizeBytes ?? attachment.size ?? attachment.fileSize,
		);
		const details = [extension, size].filter(Boolean).join(' · ');
		return (
			<div className="wa-file-card mb-2 min-w-[230px] max-w-full overflow-hidden rounded-xl border border-black/5 bg-black/[0.045] dark:border-white/10 dark:bg-white/[0.07]">
				<div className="flex min-w-0 items-center gap-3 p-3">
					<span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#027EB5] shadow-sm dark:bg-slate-700 dark:text-[#53BDEB]">
						<FileText size={23} />
						<span className="absolute -bottom-1 rounded bg-[#027EB5] px-1 text-[8px] font-black text-white dark:bg-[#53BDEB] dark:text-slate-900">
							{extension}
						</span>
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-bold" title={attachment.fileName}>
							{attachment.fileName || labels.fileAttachment}
						</span>
						<span className="mt-0.5 block truncate text-[11px] opacity-60">
							{details || labels.fileAttachment}
						</span>
					</span>
				</div>
				<div className="grid grid-cols-2 border-t border-black/5 dark:border-white/10">
					<button
						type="button"
						onClick={() => handleFileAction('open')}
						disabled={Boolean(fileAction)}
						className="flex h-10 items-center justify-center gap-1.5 text-xs font-bold text-[#027EB5] transition-colors hover:bg-black/5 disabled:opacity-50 dark:text-[#53BDEB]"
					>
						{fileAction === 'open' ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
						{labels.openFile}
					</button>
					<button
						type="button"
						onClick={() => handleFileAction('download')}
						disabled={Boolean(fileAction)}
						className="flex h-10 items-center justify-center gap-1.5 border-s border-black/5 text-xs font-bold text-[#027EB5] transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:text-[#53BDEB]"
					>
						{fileAction === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
						{labels.downloadFile}
					</button>
				</div>
				{failed && (
					<p className="border-t border-rose-200 px-3 py-2 text-[11px] text-rose-600">
						{labels.mediaUnavailable}
					</p>
				)}
			</div>
		);
	}

	if (loading) {
		return (
			<div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-black/5`}>
				<Loader2 size={14} className="animate-spin" />
				<span>{labels.loadingMedia}</span>
			</div>
		);
	}
	if (failed || !url) {
		return (
			<div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-black/5`}>
				{type === 'audio' || type === 'ptt' ? (
					<Mic size={14} />
				) : type === 'image' ? (
					<ImageIcon size={14} />
				) : (
					<FileText size={14} />
				)}
				<span>{labels.mediaUnavailable}</span>
			</div>
		);
	}
	if (type === 'image' || type === 'sticker') {
		return (
			<ImageMessage
				url={url}
				alt={attachment.fileName || 'image'}
				onOpen={() => onOpenImage?.(attachment.id)}
				className={`${className} ${type === 'sticker' ? 'wa-sticker-asset' : 'wa-photo-asset'}`}
			/>
		);
	}
	if (type === 'video') {
		return (
			<video controls preload="metadata" className="mb-2 max-h-64 w-full rounded-xl">
				<source src={url} type={attachment.mimeType || 'video/mp4'} />
			</video>
		);
	}
	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs underline bg-black/5`}
		>
			<FileText size={14} />
			<span>{attachment.fileName || attachment.type || 'file'}</span>
		</a>
	);
}

function MessageAttachments({
	attachments,
	mine,
	labels,
	onImageReady,
	onOpenImage,
	voiceAvatarLabel,
	voiceAvatarSrc,
}) {
	const images = attachments.filter(attachment =>
		['image', 'sticker'].includes(String(attachment.type || '').toLowerCase()),
	);
	const otherAttachments = attachments.filter(attachment =>
		!['image', 'sticker'].includes(String(attachment.type || '').toLowerCase()),
	);
	const visibleImages = images.slice(0, 4);

	const tileClass = index => {
		if (visibleImages.length === 1) return 'aspect-[4/3] min-h-44 rounded-xl sm:min-h-56';
		if (visibleImages.length === 2) return 'aspect-square min-h-32 sm:min-h-40';
		if (visibleImages.length === 3 && index === 0) {
			return 'row-span-2 min-h-64 sm:min-h-72';
		}
		return ' aspect-square min-h-28 sm:min-h-36';
	};
	const gridClass =
		visibleImages.length === 1
			? 'grid-cols-1'
			: visibleImages.length === 3
				? 'grid-cols-2 grid-rows-2'
				: 'grid-cols-2';

	return (
		<>
			{images.length > 0 && (
				<div className={`wa-media-gallery ${mine ? 'wa-media-gallery-mine' : 'wa-media-gallery-other'} ${visibleImages.length === 1 ? 'wa-media-gallery-single' : ''} mb-1 grid overflow-hidden rounded-xl ${gridClass} gap-0.5`}>
					{visibleImages.map((attachment, index) => (
						<div key={attachment.id} className={`relative overflow-hidden ${tileClass(index)}`}>
							<MediaAttachment
								attachment={attachment}
								mine={mine}
								labels={labels}
								onImageReady={onImageReady}
								onOpenImage={onOpenImage}
								className="rounded-none"
							/>
							{index === 3 && images.length > 4 && (
								<div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55 text-2xl font-semibold text-white">
									+{images.length - 4}
								</div>
							)}
						</div>
					))}
					{images.slice(4).map(attachment => (
						<div key={attachment.id} className="hidden">
							<MediaAttachment
								attachment={attachment}
								mine={mine}
								labels={labels}
								onImageReady={onImageReady}
								onOpenImage={onOpenImage}
							/>
						</div>
					))}
				</div>
			)}
			{otherAttachments.map(attachment => (
				<MediaAttachment
					key={attachment.id}
					attachment={attachment}
					mine={mine}
					labels={labels}
					onImageReady={onImageReady}
					onOpenImage={onOpenImage}
					voiceAvatarLabel={voiceAvatarLabel}
					voiceAvatarSrc={voiceAvatarSrc}
				/>
			))}
		</>
	);
}

function MessageActionMenu({
	open,
	message,
	locale,
	isVoice,
	anchorRect,
	previewImageUrl,
	busy,
	onClose,
	onAction,
	onReact,
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!open || !message) return null;
	const ar = locale === 'ar';
	const actions = [
		isVoice && { id: 'transcribe', label: ar ? 'تحويل إلى نص' : 'Transcribe', icon: Mic },
		{ id: 'reply', label: ar ? 'رد' : 'Reply', icon: Reply },
		{ id: 'forward', label: ar ? 'إعادة توجيه' : 'Forward', icon: Send },
		{ id: 'info', label: ar ? 'معلومات' : 'Info', icon: MessageCircle },
		{
			id: 'star',
			label: message.isStarred ? (ar ? 'إلغاء النجمة' : 'Unstar') : ar ? 'تمييز بنجمة' : 'Star',
			icon: Star,
		},
		{
			id: 'pin',
			label: message.isPinned ? (ar ? 'إلغاء التثبيت' : 'Unpin') : ar ? 'تثبيت' : 'Pin',
			icon: Pin,
		},
		{ id: 'delete', label: ar ? 'حذف' : 'Delete', icon: Trash2, destructive: true },
	].filter(Boolean);
	const menuItems = (
		<>
			{actions.map(action => {
				const Icon = action.icon;
				return (
					<button
						key={action.id}
						type="button"
						disabled={busy}
						onClick={() => onAction(action.id)}
						className={`flex min-h-12 w-full items-center justify-between gap-8 border-b border-black/10 px-5 py-3 text-start text-[17px] font-semibold last:border-0 hover:bg-black/5 disabled:opacity-50 ${
							action.destructive ? 'text-[#d70040]' : 'text-[#111b21]'
						}`}
					>
						<span>{action.label}</span>
						<Icon size={22} strokeWidth={2} />
					</button>
				);
			})}
		</>
	);
	const reactions = (
		<div className="flex items-center justify-center gap-2 px-3 py-2">
			{['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
				<button
					key={emoji}
					type="button"
					disabled={busy}
					onClick={() => onReact(emoji)}
					className="grid h-10 w-10 place-items-center rounded-full text-2xl hover:bg-black/5 disabled:opacity-50"
				>
					{emoji}
				</button>
			))}
			<button
				type="button"
				onClick={() => onAction('react')}
				className="grid h-10 w-10 place-items-center rounded-full bg-[#eef0f2] text-[#54656f]"
				aria-label={ar ? 'المزيد من التفاعلات' : 'More reactions'}
			>
				<Plus size={25} />
			</button>
		</div>
	);
	const previewType = String(message.type || '').toLowerCase();
	const previewText = message.text || (isVoice
		? ar ? 'رسالة صوتية' : 'Voice message'
		: previewType || (ar ? 'رسالة' : 'Message'));
	const mobileTop =
		typeof window === 'undefined'
			? 20
			: Math.max(16, Math.min(anchorRect?.top || 80, window.innerHeight - 620));
	return (
		<>
			<button
				type="button"
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				onClick={onClose}
				className="fixed inset-0 z-40 hidden min-[769px]:block"
			/>
			<div className="absolute end-0 top-8 z-50 hidden w-64 overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl min-[769px]:block">
				{reactions}
				<div className="border-t border-black/10">{menuItems}</div>
			</div>
			{mounted &&
				createPortal(
					<div className="fixed inset-0 z-[100] hidden overflow-y-auto bg-black/20 px-3 backdrop-blur-md max-[768px]:block" onClick={onClose}>
						<div
							className="relative mx-auto w-full max-w-md pb-5"
							style={{ top: mobileTop }}
							onClick={event => event.stopPropagation()}
						>
							<div className={`mb-3 flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
								<div className={`max-w-[88%] overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm shadow-xl ${
									message.direction === 'outbound' ? 'bg-[#d9fdd3]' : 'bg-white'
								}`}>
									{previewImageUrl && (
										<img src={previewImageUrl} alt="" className="mb-2 max-h-44 w-full rounded-xl object-cover" />
									)}
									<div className="flex items-center gap-2">
										{isVoice && <Mic size={17} className="shrink-0 text-[#00a884]" />}
										<p className="whitespace-pre-wrap wrap-break-word">
											<WhatsAppFormattedText text={previewText} />
										</p>
									</div>
									<p className="mt-1 text-end text-[10px] text-[#667781]">
										{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], {
											hour: '2-digit',
											minute: '2-digit',
										})}
									</p>
								</div>
							</div>
							<div className="mx-auto mb-3 w-fit rounded-full bg-white shadow-xl">{reactions}</div>
							<div className="overflow-hidden rounded-2xl bg-white shadow-2xl">{menuItems}</div>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}

function ConversationActionMenu({
	conversation,
	anchorRect,
	locale,
	canAssign,
	busy,
	onClose,
	onAction,
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted || !conversation) return null;
	const ar = locale === 'ar';
	const top =
		typeof window === 'undefined'
			? 20
			: Math.max(16, Math.min(anchorRect?.top || 80, window.innerHeight - 420));
	const actions = [
		{
			id: 'pin',
			label: conversation.isPinned ? (ar ? 'إلغاء تثبيت المحادثة' : 'Unpin conversation') : ar ? 'تثبيت المحادثة' : 'Pin conversation',
			icon: Pin,
		},
		{
			id: 'favorite',
			label: conversation.isFavorite ? (ar ? 'إزالة من المفضلة' : 'Remove from favorites') : ar ? 'إضافة إلى المفضلة' : 'Add to favorites',
			icon: Star,
		},
		canAssign && { id: 'assign', label: ar ? 'تعيين إلى شخص' : 'Assign to person', icon: UserPlus },
		{ id: 'info', label: ar ? 'معلومات المحادثة' : 'Conversation info', icon: MessageCircle },
	].filter(Boolean);
	return createPortal(
		<div
			className="fixed inset-0 z-[105] overflow-y-auto bg-black/20 px-3 backdrop-blur-md"
			onClick={onClose}
		>
			<div
				className="relative mx-auto w-full max-w-md pb-5"
				style={{ top }}
				onClick={event => event.stopPropagation()}
			>
				<div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl">
					<Avatar
						label={conversationTitle(conversation)}
						size={12}
						src={conversation.contact?.avatarUrl}
						isGroup={conversation.type === 'group'}
					/>
					<div className="min-w-0 flex-1">
						<p className="truncate text-base font-bold">{conversationTitle(conversation)}</p>
						<p className="truncate text-sm text-[#667781]">
							{conversation.lastMessage?.text || conversation.lastMessage?.type || (ar ? 'لا توجد رسائل' : 'No messages')}
						</p>
					</div>
				</div>
				<div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
					{actions.map(action => {
						const Icon = action.icon;
						return (
							<button
								key={action.id}
								type="button"
								disabled={busy}
								onClick={() => onAction(action.id)}
								className="flex min-h-14 w-full items-center justify-between gap-5 border-b border-black/10 px-5 py-3 text-start text-[17px] font-semibold text-[#111b21] last:border-0 hover:bg-black/5 disabled:opacity-50"
							>
								<span>{action.label}</span>
								<Icon
									size={22}
									fill={
										(action.id === 'pin' && conversation.isPinned) ||
										(action.id === 'favorite' && conversation.isFavorite)
											? 'currentColor'
											: 'none'
									}
								/>
							</button>
						);
					})}
				</div>
			</div>
		</div>,
		document.body,
	);
}

function MobileWhatsAppHeader({ title, showTitle = true, scrolled = false, onSearch, onCamera, onMore }) {
	return (
		<header className={`wa-mobile-header ${scrolled ? 'is-scrolled' : ''} hidden shrink-0 flex-col px-4 pb-2 min-[769px]:hidden`}>
			<div className="flex justify-between mt-2 h-11 items-center   gap-3">
				<button type="button" onClick={onMore} aria-label="More options" className="grid h-7 w-7 place-items-center rounded-full bg-[#F0F2F5]">
					<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect width="28" height="28" rx="14" fill="#0A0A0A" fillOpacity="0.03" />
						<path fillRule="evenodd" clipRule="evenodd" d="M10 14.0001C10 14.9114 9.26127 15.6501 8.35 15.6501C7.43873 15.6501 6.7 14.9114 6.7 14.0001C6.7 13.0888 7.43873 12.3501 8.35 12.3501C9.26127 12.3501 10 13.0888 10 14.0001ZM15.65 14.0001C15.65 14.9114 14.9112 15.6501 14 15.6501C13.0887 15.6501 12.35 14.9114 12.35 14.0001C12.35 13.0888 13.0887 12.3501 14 12.3501C14.9112 12.3501 15.65 13.0888 15.65 14.0001ZM19.65 15.6501C20.5613 15.6501 21.3 14.9114 21.3 14.0001C21.3 13.0888 20.5613 12.3501 19.65 12.3501C18.7387 12.3501 18 13.0888 18 14.0001C18 14.9114 18.7387 15.6501 19.65 15.6501Z" fill="#0A0A0A" />
					</svg>

				</button>
				<div className='flex items-center gap-2'>
					<button type="button" onClick={onCamera} aria-label="Camera" className="grid h-7 w-7 place-items-center rounded-full bg-[#F0F2F5]">
						<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect width="28" height="28" rx="14" fill="#0A0A0A" fillOpacity="0.03" />
							<path fillRule="evenodd" clipRule="evenodd" d="M11.8699 7C11.6312 7 11.4004 7.08539 11.2191 7.24074L9.45833 8.75H7C5.89543 8.75 5 9.64543 5 10.75V19.25C5 20.3546 5.89543 21.25 7 21.25H21C22.1046 21.25 23 20.3546 23 19.25V10.75C23 9.64543 22.1046 8.75 21 8.75H18.5417L16.7809 7.24074C16.5996 7.08539 16.3688 7 16.1301 7H11.8699ZM14 19C16.2091 19 18 17.2091 18 15C18 12.7909 16.2091 11 14 11C11.7909 11 10 12.7909 10 15C10 17.2091 11.7909 19 14 19ZM14 17.75C15.5188 17.75 16.75 16.5188 16.75 15C16.75 13.4812 15.5188 12.25 14 12.25C12.4812 12.25 11.25 13.4812 11.25 15C11.25 16.5188 12.4812 17.75 14 17.75ZM19.5 13.25C20.0523 13.25 20.5 12.8023 20.5 12.25C20.5 11.6977 20.0523 11.25 19.5 11.25C18.9477 11.25 18.5 11.6977 18.5 12.25C18.5 12.8023 18.9477 13.25 19.5 13.25Z" fill="#0A0A0A" />
						</svg>

					</button>
					<button type="button" onClick={onSearch} aria-label="New chat" className="wa-new-chat grid h-7 w-7 place-items-center rounded-full bg-[#00A884] text-white">
						<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect width="28" height="28" rx="14" fill="#1DAB61" />
							<path fillRule="evenodd" clipRule="evenodd" d="M14.9 8.7501C14.9 8.25304 14.4971 7.8501 14 7.8501C13.5029 7.8501 13.1 8.25304 13.1 8.7501V13.1001H8.75001C8.25295 13.1001 7.85001 13.503 7.85001 14.0001C7.85001 14.4972 8.25295 14.9001 8.75001 14.9001H13.1V19.2501C13.1 19.7472 13.5029 20.1501 14 20.1501C14.4971 20.1501 14.9 19.7472 14.9 19.2501V14.9001H19.25C19.7471 14.9001 20.15 14.4972 20.15 14.0001C20.15 13.503 19.7471 13.1001 19.25 13.1001H14.9V8.7501Z" fill="white" />
						</svg>

					</button>
				</div>
			</div>
			{showTitle && <h1 className="mt-1 mb-1 title-whatsapp">{title}</h1>}
		</header>
	);
}

function MobileWhatsAppNav({ activeTab, onSelect, labels, unreadCount }) {
	const items = [
		{
			id: 'statuses', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path fillRule="evenodd" clipRule="evenodd" d="M10.2631 7.16603C12.0087 6.03242 14.0511 5.44138 16.1323 5.46753C18.2135 5.49368 20.2404 6.13584 21.9569 7.31294C22.3213 7.56281 22.8193 7.46998 23.0692 7.10559C23.319 6.74121 23.2262 6.24325 22.8618 5.99339C20.8845 4.63748 18.5498 3.89778 16.1524 3.86766C13.755 3.83754 11.4025 4.51835 9.39169 5.82416C9.02114 6.0648 8.91583 6.56026 9.15646 6.93081C9.3971 7.30136 9.89256 7.40667 10.2631 7.16603ZM26.2469 9.50241C26.0103 9.12928 25.516 9.0186 25.1428 9.25521C24.7697 9.49182 24.659 9.98611 24.8956 10.3592C26.0011 12.1027 26.57 14.1325 26.5315 16.1966C26.4929 18.2606 25.8488 20.2678 24.6789 21.9688C24.4286 22.3329 24.5207 22.8309 24.8848 23.0813C25.2488 23.3317 25.7469 23.2395 25.9973 22.8755C27.3448 20.9161 28.0868 18.604 28.1312 16.2264C28.1756 13.8489 27.5203 11.5107 26.2469 9.50241ZM7.0458 9.00668C7.41229 9.25345 7.50935 9.75059 7.26259 10.1171C6.1668 11.7446 5.54733 13.6457 5.474 15.6063C5.40067 17.567 5.87638 19.5091 6.84754 21.2139C6.94878 21.3916 6.97811 21.6014 6.92948 21.8L5.90076 26.0036L10.5183 25.2053C10.694 25.175 10.8748 25.2041 11.0319 25.2882C12.6909 26.1755 14.5571 26.6023 16.4368 26.5243C18.3165 26.4463 20.141 25.8663 21.7207 24.8445C22.0917 24.6045 22.5869 24.7108 22.8269 25.0818C23.0669 25.4527 22.9606 25.948 22.5897 26.188C20.77 27.3649 18.6684 28.0331 16.5032 28.1229C14.431 28.209 12.373 27.7623 10.525 26.8279L5.9727 27.6149C4.93123 27.795 4.04698 26.8477 4.29822 25.821L5.30112 21.723C4.28779 19.8287 3.79468 17.6973 3.87512 15.5465C3.95959 13.2881 4.67315 11.0982 5.93539 9.22347C6.18215 8.85698 6.6793 8.75992 7.0458 9.00668ZM9.79997 16C9.79997 12.5759 12.5758 9.80003 16 9.80003C19.4241 9.80003 22.2 12.5759 22.2 16C22.2 19.4242 19.4241 22.2 16 22.2C12.5758 22.2 9.79997 19.4242 9.79997 16ZM16 8.20003C11.6922 8.20003 8.19997 11.6922 8.19997 16C8.19997 20.3079 11.6922 23.8 16 23.8C20.3078 23.8 23.8 20.3079 23.8 16C23.8 11.6922 20.3078 8.20003 16 8.20003Z" fill="#767779" />
			</svg>
			, label: labels.updates
		},
		{
			id: 'calls', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M22.246 27.236C18.8584 27.236 14.7666 25.0019 11.0269 21.2743C7.27502 17.5225 5.06519 13.4185 5.06519 10.0066C5.06519 8.08822 5.62371 6.67975 6.93504 5.46556C7.02004 5.39271 7.09289 5.31986 7.16574 5.25915C7.94282 4.53063 8.75633 4.16637 9.49699 4.17852C10.2862 4.2028 11.0147 4.62777 11.6461 5.55055L14.0745 9.07171C14.7666 10.0674 14.8759 11.2451 13.8438 12.3015L12.9696 13.1878C12.7025 13.4549 12.6539 13.7464 12.836 14.0742C13.3217 14.9241 14.1231 15.8348 15.2523 16.964C16.2843 17.996 17.6321 19.1009 18.227 19.4652C18.5549 19.6473 18.8463 19.5988 19.1134 19.3316L19.9998 18.4574C21.0561 17.4254 22.2339 17.5346 23.2295 18.2267L26.7507 20.6551C27.6735 21.2865 28.1227 22.015 28.1227 22.8042C28.1227 23.5449 27.7706 24.3463 27.0421 25.1355C26.9814 25.2083 26.9085 25.2812 26.8357 25.3662C25.6093 26.6896 24.1887 27.236 22.246 27.236ZM22.2582 25.7669C23.6302 25.7547 24.8322 25.2933 25.7429 24.3098C25.7915 24.237 25.8279 24.2006 25.8886 24.1277C26.3014 23.6785 26.5078 23.2292 26.5078 22.8285C26.5078 22.44 26.35 22.1121 25.9493 21.8572L22.4403 19.5016C21.991 19.1981 21.4811 19.1495 20.9833 19.6473L19.9998 20.643C19.2712 21.3715 18.3363 21.3472 17.6078 20.8494C16.7579 20.2666 15.3615 19.0767 14.2566 17.9596C13.1639 16.8547 12.0347 15.5434 11.4518 14.6934C10.954 13.9649 10.9297 13.03 11.6583 12.3015L12.6539 11.318C13.1517 10.8202 13.1031 10.3102 12.7996 9.86094L10.4441 6.35192C10.1891 5.95124 9.86125 5.79339 9.4727 5.79339C9.08416 5.79339 8.62277 5.99981 8.17352 6.41263C8.11281 6.4612 8.06424 6.50977 7.99139 6.55833C7.00789 7.46898 6.5465 8.65889 6.53436 10.0066C6.49793 13.115 8.90203 17.0854 12.1075 20.2787C15.2887 23.472 19.162 25.8033 22.2582 25.7669Z" fill="#767779" />
			</svg>
			, label: labels.calls
		},
		{
			id: 'groups', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				<g clipPath="url(#clip0_2007_1337)">
					<path fillRule="evenodd" clipRule="evenodd" d="M16 6.9667C14.4004 6.9667 12.9667 8.43166 12.9667 10.4167C12.9667 12.4017 14.4004 13.8667 16 13.8667C17.5996 13.8667 19.0333 12.4017 19.0333 10.4167C19.0333 8.43166 17.5996 6.9667 16 6.9667ZM11.3667 10.4167C11.3667 7.70732 13.3654 5.3667 16 5.3667C18.6346 5.3667 20.6333 7.70732 20.6333 10.4167C20.6333 13.1261 18.6346 15.4667 16 15.4667C13.3654 15.4667 11.3667 13.1261 11.3667 10.4167ZM9.91577 21.1993C8.65547 22.3383 8.01766 23.7137 7.70971 24.6403C7.70813 24.6451 7.70719 24.6488 7.70663 24.6516C7.70619 24.6538 7.70599 24.6555 7.70591 24.6566L7.70737 24.659L7.70898 24.6611C7.71808 24.6725 7.75002 24.7 7.81589 24.7H24.1841C24.25 24.7 24.2819 24.6725 24.291 24.6611C24.2926 24.6591 24.2936 24.6576 24.2941 24.6566C24.2939 24.6541 24.2931 24.6489 24.2903 24.6403C23.9823 23.7137 23.3445 22.3383 22.0842 21.1993C20.8408 20.0757 18.9391 19.1334 16 19.1334C13.0609 19.1334 11.1591 20.0757 9.91577 21.1993ZM8.84299 20.0123C10.3926 18.6119 12.6811 17.5334 16 17.5334C19.3189 17.5334 21.6074 18.6119 23.157 20.0123C24.6897 21.3974 25.4476 23.0493 25.8086 24.1357C26.1997 25.3124 25.247 26.3 24.1841 26.3H7.81589C6.75295 26.3 5.80032 25.3124 6.19137 24.1357C6.55242 23.0493 7.31032 21.3974 8.84299 20.0123ZM23.9667 12.4999C23.9667 11.2799 24.8189 10.4666 25.6667 10.4666C26.5144 10.4666 27.3667 11.2799 27.3667 12.4999C27.3667 13.72 26.5144 14.5333 25.6667 14.5333C24.8189 14.5333 23.9667 13.72 23.9667 12.4999ZM25.6667 8.86662C23.753 8.86662 22.3667 10.5903 22.3667 12.4999C22.3667 14.4095 23.753 16.1333 25.6667 16.1333C27.5804 16.1333 28.9667 14.4095 28.9667 12.4999C28.9667 10.5903 27.5804 8.86662 25.6667 8.86662ZM27.4838 24.8H30.25C31.0829 24.8 31.8665 24.0981 31.7251 23.1389C31.6078 22.3428 31.294 21.0402 30.4267 19.9211C29.5296 18.7635 28.0872 17.8666 25.8781 17.8666C24.9945 17.8666 24.239 18.0231 23.5963 18.2888C24.0942 18.6815 24.5441 19.1056 24.9499 19.5491C25.2308 19.4958 25.5391 19.4666 25.8781 19.4666C27.5879 19.4666 28.5652 20.1309 29.1621 20.9012C29.7371 21.6431 29.9988 22.5393 30.1144 23.2H27.2157C27.3679 23.7513 27.4449 24.3336 27.4838 24.8ZM4.78575 23.2H1.88098C1.99124 22.5346 2.2417 21.6315 2.79201 20.886C3.35968 20.117 4.2776 19.4666 5.87806 19.4666C6.30291 19.4666 6.68254 19.5077 7.02234 19.5811C7.42227 19.1409 7.86539 18.7193 8.35546 18.3282C7.66401 18.0382 6.84439 17.8666 5.87806 17.8666C3.74645 17.8666 2.35996 18.7772 1.50473 19.9358C0.679599 21.0536 0.382209 22.3523 0.271031 23.144C0.136948 24.0989 0.91592 24.8 1.75002 24.8H4.51762C4.55648 24.3336 4.63352 23.7513 4.78575 23.2ZM6.33334 10.4666C5.48561 10.4666 4.63334 11.2799 4.63334 12.4999C4.63334 13.72 5.48561 14.5333 6.33334 14.5333C7.18106 14.5333 8.03334 13.72 8.03334 12.4999C8.03334 11.2799 7.18106 10.4666 6.33334 10.4666ZM3.03334 12.4999C3.03334 10.5903 4.41964 8.86662 6.33334 8.86662C8.24704 8.86662 9.63334 10.5903 9.63334 12.4999C9.63334 14.4095 8.24704 16.1333 6.33334 16.1333C4.41964 16.1333 3.03334 14.4095 3.03334 12.4999Z" fill="#767779" />
				</g>
				<defs>
					<clipPath id="clip0_2007_1337">
						<rect width="32" height="32" fill="white" />
					</clipPath>
				</defs>
			</svg>
			, label: labels.communities
		},
		{
			id: 'chats', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				<g clipPath="url(#clip0_2007_4903)">
					<path fillRule="evenodd" clipRule="evenodd" d="M1.80001 15.1669C1.80001 10.7151 6.47471 6.8002 12.6667 6.8002C18.8586 6.8002 23.5333 10.7151 23.5333 15.1669C23.5333 19.6187 18.8586 23.5335 12.6667 23.5335C12.2895 23.5335 11.9169 23.5187 11.5499 23.4897C11.1145 23.4554 10.6897 23.613 10.3816 23.9119C9.10114 25.1538 7.81299 25.766 6.85748 26.0693C6.80694 26.0853 6.75733 26.1005 6.70868 26.1148C6.79334 25.9138 6.8784 25.7016 6.95845 25.4856C7.15247 24.9623 7.33641 24.3669 7.39419 23.8404C7.42286 23.5793 7.42758 23.2777 7.34999 22.9895C7.26799 22.6849 7.07725 22.3475 6.69615 22.1536C6.37203 21.9886 6.06045 21.8109 5.76256 21.6215C3.29263 20.0512 1.80001 17.7111 1.80001 15.1669ZM4.62643 26.7923L4.62576 26.7936L4.62574 26.7936L4.62572 26.7937C4.49495 27.0416 4.50351 27.34 4.64829 27.58C4.79308 27.8201 5.05298 27.9669 5.33335 27.9669V27.1669C5.33335 27.9669 5.33373 27.9669 5.33412 27.9669L5.33495 27.9669L5.33682 27.9669L5.34136 27.9668L5.35357 27.9667C5.36308 27.9665 5.37536 27.9663 5.39029 27.9658C5.42015 27.9649 5.46068 27.9632 5.51114 27.96C5.61204 27.9537 5.75287 27.9414 5.92776 27.9178C6.27732 27.8705 6.76447 27.7774 7.3415 27.5943C8.49018 27.2297 9.99258 26.5086 11.4669 25.0881C11.8619 25.1182 12.2621 25.1335 12.6667 25.1335C14.3803 25.1335 16.0334 24.8523 17.5447 24.3386C18.4415 24.5183 19.3793 24.6135 20.3438 24.6135C20.4705 24.6135 20.5967 24.6118 20.7223 24.6086C20.7922 24.6068 20.8501 24.6293 20.8901 24.6625C22.1112 25.6765 24.1029 27.2146 26.5247 27.1398C26.7966 27.1314 27.0456 26.9855 27.1857 26.7523C27.3258 26.5192 27.3379 26.231 27.2178 25.987L27.2178 25.9869L27.2178 25.9869L27.2177 25.9868L27.2174 25.9861L27.2148 25.9809L27.2035 25.9575C27.1934 25.9363 27.1781 25.9043 27.1587 25.8627C27.1198 25.7796 27.0647 25.6592 27.0011 25.5128C26.873 25.2179 26.7145 24.8273 26.5847 24.4295C26.4509 24.0197 26.365 23.6544 26.351 23.3939C26.349 23.3558 26.3485 23.3244 26.3489 23.2989C26.7102 23.1014 27.218 22.7891 27.4712 22.6281C30.0589 20.983 31.8 18.4066 31.8 15.4408C31.8 10.2058 26.4804 6.26807 20.3438 6.26807C19.7403 6.26807 19.1472 6.30534 18.5681 6.37728L18.5694 6.38821C16.7947 5.62659 14.7765 5.2002 12.6667 5.2002C5.972 5.2002 0.200012 9.49344 0.200012 15.1669C0.200012 18.3821 2.08749 21.181 4.90413 22.9718C5.19704 23.158 5.50039 23.3337 5.81327 23.4982C5.81373 23.5392 5.8116 23.5944 5.80375 23.6658C5.76779 23.9934 5.63922 24.4413 5.45824 24.9294C5.28164 25.4058 5.0733 25.8729 4.90703 26.2245C4.82435 26.3993 4.75311 26.5433 4.70289 26.643C4.6778 26.6928 4.65801 26.7314 4.64474 26.7571L4.62989 26.7857L4.62643 26.7923ZM21.2009 7.89585C23.6015 9.68773 25.1333 12.2442 25.1333 15.1669C25.1333 18.4186 23.2372 21.217 20.3579 23.0135C20.466 23.0134 20.5737 23.0119 20.6809 23.0091C21.1201 22.9977 21.5604 23.1394 21.9122 23.4316C22.8531 24.2128 23.9762 25.0482 25.225 25.3867C25.1697 25.2383 25.115 25.0834 25.0637 24.9261C24.9166 24.4757 24.7787 23.9517 24.7533 23.4798C24.7324 23.0899 24.7691 22.3108 25.4705 21.9539C25.7491 21.8121 26.3202 21.4639 26.6128 21.2779C28.8538 19.8532 30.2 17.7355 30.2 15.4408C30.2 11.6337 26.4006 8.23511 21.2009 7.89585ZM26.3593 23.2052C26.3587 23.2045 26.3565 23.2104 26.3542 23.225C26.3587 23.2133 26.3599 23.206 26.3593 23.2052Z" fill="#767779" />
				</g>
				<defs>
					<clipPath id="clip0_2007_4903">
						<rect width="32" height="32" fill="white" />
					</clipPath>
				</defs>
			</svg>
			, label: labels.chats, badge: unreadCount
		},
		{
			id: 'settings', icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M16.0001 27.7641C16.3026 27.7641 16.5926 27.7389 16.9077 27.7137L17.5884 29.012C17.7144 29.2894 18.0043 29.4406 18.3447 29.3902C18.6598 29.3398 18.8741 29.1003 18.9245 28.7725L19.1262 27.3356C19.706 27.1843 20.2733 26.9574 20.8405 26.7179L21.8993 27.6759C22.1262 27.9028 22.4413 27.9406 22.7565 27.7767C23.0212 27.6129 23.1346 27.323 23.0716 26.9952L22.7817 25.5834C23.2607 25.2431 23.7397 24.8523 24.1808 24.4238L25.4918 24.9784C25.8069 25.1044 26.0968 25.0414 26.3363 24.7515C26.5506 24.5246 26.5758 24.1969 26.3994 23.9196L25.6304 22.6969C25.9708 22.2053 26.2607 21.6758 26.5254 21.1212L27.975 21.1842C28.3027 21.2095 28.58 21.0204 28.6809 20.7179C28.7817 20.4027 28.6935 20.1002 28.4288 19.8985L27.2943 19.0036C27.4456 18.4363 27.5716 17.8313 27.6221 17.2136L28.9834 16.7724C29.2985 16.659 29.5002 16.4195 29.5002 16.0918C29.5002 15.764 29.2985 15.5245 28.9834 15.4111L27.6221 14.9699C27.5716 14.3523 27.4456 13.7598 27.2943 13.18L28.4288 12.285C28.6809 12.0833 28.7817 11.7934 28.6809 11.4783C28.58 11.1758 28.3027 10.9867 27.975 11.0119L26.5254 11.0623C26.2607 10.5077 25.9708 9.99088 25.6304 9.48667L26.3994 8.26397C26.5758 7.99927 26.5506 7.67153 26.3363 7.44464C26.0968 7.16733 25.8069 7.0917 25.4918 7.21775L24.1808 7.75977C23.7397 7.3438 23.2607 6.94043 22.7817 6.60009L23.0716 5.20092C23.1346 4.86058 23.0212 4.57067 22.7565 4.4194C22.4413 4.25554 22.1388 4.28075 21.8993 4.52025L20.8405 5.46563C20.2733 5.21353 19.706 5.01185 19.1262 4.84798L18.9245 3.4236C18.8741 3.09586 18.6598 2.86897 18.3447 2.80595C18.0043 2.76813 17.7144 2.90679 17.5884 3.17149L16.9077 4.46982C16.5926 4.44461 16.3026 4.43201 16.0001 4.43201C15.685 4.43201 15.4077 4.44461 15.0799 4.46982L14.4119 3.17149C14.2732 2.90679 13.9833 2.76813 13.6429 2.80595C13.3278 2.86897 13.1135 3.09586 13.0631 3.4236L12.8614 4.84798C12.2816 5.01185 11.7144 5.21353 11.1597 5.46563L10.1009 4.52025C9.8488 4.28075 9.54628 4.25554 9.24375 4.4194C8.96644 4.57067 8.85299 4.86058 8.91602 5.20092L9.21854 6.60009C8.72694 6.94043 8.24795 7.3438 7.81937 7.75977L6.49583 7.21775C6.1807 7.0917 5.89078 7.16733 5.65129 7.44464C5.4496 7.67153 5.42439 7.99927 5.58826 8.25137L6.35717 9.48667C6.01684 9.99088 5.73952 10.5077 5.46221 11.0623L4.01262 11.0119C3.69749 10.9867 3.42018 11.1758 3.30673 11.4783C3.20589 11.7934 3.29412 12.0833 3.55883 12.285L4.6933 13.18C4.54203 13.7598 4.41598 14.3523 4.37817 14.9699L3.00421 15.4111C2.68908 15.5119 2.5 15.7514 2.5 16.0918C2.5 16.4321 2.68908 16.6716 3.00421 16.7724L4.37817 17.2136C4.41598 17.8313 4.54203 18.4363 4.6933 19.0036L3.55883 19.8985C3.30673 20.1002 3.21849 20.4027 3.30673 20.7179C3.42018 21.0204 3.69749 21.2095 4.01262 21.1842L5.46221 21.1212C5.72692 21.6758 6.01684 22.2053 6.35717 22.6969L5.58826 23.9196C5.41179 24.1969 5.437 24.5246 5.65129 24.7515C5.89078 25.0414 6.1807 25.1044 6.49583 24.9784L7.81937 24.4238C8.24795 24.8523 8.72694 25.2431 9.21854 25.5834L8.91602 26.9952C8.85299 27.323 8.96644 27.6129 9.24375 27.7767C9.54628 27.9406 9.8614 27.9028 10.1009 27.6759L11.1471 26.7179C11.7144 26.9574 12.2816 27.1843 12.8614 27.3356L13.0631 28.7725C13.1135 29.1003 13.3278 29.3398 13.6556 29.3902C13.9833 29.4406 14.2732 29.2894 14.4119 29.012L15.0799 27.7137C15.3951 27.7389 15.685 27.7641 16.0001 27.7641ZM19.0379 15.2724C18.4707 13.7598 17.3363 12.9279 15.9623 12.9279C15.748 12.9279 15.5211 12.9531 15.143 13.0413L11.79 7.30598C13.0505 6.68833 14.4749 6.34799 16.0001 6.34799C21.143 6.34799 25.1767 10.243 25.58 15.2724H19.0379ZM6.38238 16.1044C6.38238 12.827 7.92021 9.94046 10.3278 8.17574L13.706 13.9489C13.0757 14.6296 12.7732 15.3607 12.7732 16.1422C12.7732 16.8985 13.0505 17.5918 13.706 18.2977L10.2522 23.9574C7.8824 22.1927 6.38238 19.3439 6.38238 16.1044ZM14.5253 16.1296C14.5253 15.3229 15.2186 14.6926 15.9749 14.6926C16.7816 14.6926 17.4497 15.3229 17.4497 16.1296C17.4497 16.9237 16.7816 17.5792 15.9749 17.5792C15.2186 17.5792 14.5253 16.9237 14.5253 16.1296ZM16.0001 25.8482C14.4371 25.8482 12.9875 25.4952 11.7018 24.8523L15.143 19.2305C15.5085 19.3187 15.748 19.3439 15.9623 19.3439C17.3489 19.3439 18.4833 18.4867 19.0379 16.9489H25.58C25.1767 21.9532 21.143 25.8482 16.0001 25.8482Z" fill="#767779" />
			</svg>
			, label: labels.settings
		},
	];
	return (
		<nav className="wa-mobile-nav hidden shrink-0 grid-cols-5 border-t border-white/10 bg-[#111b21]/95 pb-[max(6px,env(safe-area-inset-bottom))] pt-2 backdrop-blur min-[769px]:hidden">
			{items.map(({ id, icon: Icon, label, badge }) => {
				const active = activeTab === id;
				const iconNode = isValidElement(Icon)
					? cloneElement(Icon, {
						width: Icon.props.width ?? 22,
						height: Icon.props.height ?? 22,
						strokeWidth: Icon.props.strokeWidth ?? (active ? 2.5 : 2),
						style: { ...Icon.props.style, ...(active ? { color: '#0A0A0A' } : {}) },
						'aria-hidden': Icon.props['aria-hidden'] ?? true,
					})
					: <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />;
				return (
					<button key={id} type="button" onClick={() => onSelect(id)} className={`wa-mobile-nav-item ${active ? 'is-active font-semibold text-[#0A0A0A]' : ''} relative flex min-w-0 flex-col items-center gap-1 text-[10px]`}>
						<span className="wa-mobile-nav-icon relative grid h-8 min-w-12 place-items-center rounded-full px-3">
							{iconNode}
							{badge > 0 && (
								<span className="absolute -end-0.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1DAB61] px-1 text-[10px] font-bold text-white">
									{badge > 99 ? '99+' : badge}
								</span>
							)}
						</span>
						<span className="w-full truncate px-1">{label}</span>
					</button>
				);
			})}
			<span className="wa-home-indicator opacity-0 !bg-[#0A0A0A] col-span-5 mx-auto mt-3 block h-[5px] w-[140px] rounded-full bg-current" aria-hidden="true" />
		</nav>
	);
}

function MobileOverflowMenu({ open, tabs: menuTabs, labels, onSelect, onProfile, onClose }) {
	if (!open) return null;
	return (
		<>
			<button type="button" aria-label="Close menu" onClick={onClose} className="fixed inset-0 z-190 bg-transparent min-[769px]:hidden" />
			<div className="wa-mobile-menu absolute start-4 top-[52px] z-200 min-w-52 overflow-hidden rounded-xl py-2 shadow-2xl min-[769px]:hidden">
				<button type="button" onClick={() => { onProfile(); onClose(); }} className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm active:bg-white/10">
					<User size={18} className="text-[#8696a0]" />
					<span>{labels.profile}</span>
				</button>
				{menuTabs.map(([id, Icon]) => (
					<button key={id} type="button" onClick={() => { onSelect(id); onClose(); }} className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm active:bg-white/10">
						<Icon size={18} className="text-[#8696a0]" />
						<span>{labels[id]}</span>
					</button>
				))}
			</div>
		</>
	);
}

function MobileAttachmentSheet({
	open,
	onClose,
	onAction,
	locale = 'en',
	aiEnabled = false,
	aiVisible = true,
	onToggleAiVisible,
	prompts = [],
	activePromptId,
	promptSaving = false,
	onPromptChange,
	suggestionsLoading = false,
	onRegenerateSuggestions,
}) {
	if (!open) return null;
	const ar = String(locale).toLowerCase().startsWith('ar');
	const actions = [
		['photos', ImageIcon, ar ? 'الصور' : 'Photos', '#7C5CFC'],
		['camera', Camera, ar ? 'الكاميرا' : 'Camera', '#FF4F78'],
		['document', FileText, ar ? 'مستند' : 'Document', '#4B88FF'],
		['location', MapPin, ar ? 'الموقع' : 'Location', '#20B86B'],
	];
	return createPortal(
		<div className="wa-composer-overlay fixed inset-0 z-500" role="presentation">
			<button type="button" aria-label={ar ? 'إغلاق الإجراءات' : 'Close attachment actions'} onClick={onClose} className="absolute inset-0 bg-black/30" />
			<section
				role="dialog"
				aria-modal="true"
				aria-label={ar ? 'إجراءات المرفقات' : 'Attachment actions'}
				className="wa-attachment-sheet absolute inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[22px] bg-white px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
			>
				<div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300" />

				{aiEnabled && (
					<div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 px-3 py-2.5">
						<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-600 text-white">
							<Sparkles size={15} />
						</span>
						<p className="shrink-0 text-xs font-black text-violet-800">
							{ar ? 'ردود الذكاء الاصطناعي' : 'AI replies'}
						</p>
						{prompts.length > 0 && (
							<select
								value={activePromptId || prompts[0]?.id || ''}
								onChange={event => onPromptChange?.(event.target.value)}
								disabled={promptSaving}
								className="h-8 min-w-0 flex-1 rounded-full border border-violet-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500 disabled:opacity-50"
							>
								{prompts.map(prompt => (
									<option key={prompt.id} value={prompt.id}>
										{prompt.name}
									</option>
								))}
							</select>
						)}
						<button
							type="button"
							onClick={onToggleAiVisible}
							className="shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-bold text-violet-700"
						>
							{aiVisible
								? ar ? 'إخفاء' : 'Hide'
								: ar ? 'إظهار' : 'Show'}
						</button>
						<button
							type="button"
							onClick={onRegenerateSuggestions}
							disabled={suggestionsLoading || !aiVisible}
							aria-label={ar ? 'تحديث الاقتراحات' : 'Regenerate suggestions'}
							className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-violet-200 bg-white text-violet-700 disabled:opacity-40"
						>
							<RefreshCw size={14} className={suggestionsLoading ? 'animate-spin' : ''} />
						</button>
					</div>
				)}

				<div className="flex flex-col">
					{actions.map(([id, Icon, label, color]) => (
						<button
							key={id}
							type="button"
							onClick={() => onAction(id)}
							className="flex min-h-14 w-full items-center gap-3 border-b border-black/5 px-1 py-3 text-start last:border-0 active:bg-black/[0.03]"
						>
							<span
								className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
								style={{ background: color }}
							>
								<Icon size={21} strokeWidth={2.2} />
							</span>
							<span className="text-[16px] font-semibold text-[#111b21]">{label}</span>
						</button>
					))}
				</div>
			</section>
		</div>,
		document.body,
	);
}

function MobileStickerPanel({ open, onClose, onInsert }) {
	const [tab, setTab] = useState('emoji');
	if (!open) return null;
	const tabs = [['emoji', Smile, 'Emoji'], ['gif', ImageIcon, 'GIF'], ['sticker', Sticker, 'Stickers']];
	const emojis = ['😀', '😂', '🥰', '😍', '😊', '😭', '😎', '🤔', '👍', '👏', '🙏', '❤️', '🔥', '🎉', '💪', '✅', '👀', '✨'];
	return createPortal(
		<section role="dialog" aria-label="Emoji, GIF and stickers" className="wa-sticker-panel fixed inset-x-0 bottom-[88px] z-400 mx-auto flex h-[48dvh] max-w-[430px] flex-col border-t border-slate-200 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.12)] min-[769px]:hidden">
			<div className="flex h-12 shrink-0 items-center border-b border-slate-100 px-2">
				{tabs.map(([id, Icon, label]) => <button key={id} type="button" aria-label={label} aria-pressed={tab === id} onClick={() => setTab(id)} className={`grid h-11 flex-1 place-items-center border-b-2 ${tab === id ? 'border-[#16B96B] text-[#16B96B]' : 'border-transparent text-[#667781]'}`}><Icon size={22} /></button>)}
				<button type="button" aria-label="Close sticker panel" onClick={onClose} className="grid h-11 w-11 place-items-center text-[#667781]"><X size={21} /></button>
			</div>
			{tab === 'emoji' ? (
				<div className="grid flex-1 grid-cols-6 content-start gap-3 overflow-y-auto p-4">{emojis.map(emoji => <button key={emoji} type="button" onClick={() => onInsert(emoji)} className="grid aspect-square place-items-center text-3xl transition-transform active:scale-90">{emoji}</button>)}</div>
			) : (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 text-[#667781]"><Sticker size={30} /><p className="text-sm">{tab === 'gif' ? 'Search and send GIFs' : 'Your stickers'}</p></div>
			)}
		</section>,
		document.body,
	);
}

function MobileCallsView({ logs, labels, locale, loading }) {
	const calls = logs.filter(log =>
		/call|voice_call|video_call/i.test(
			`${log.type || ''} ${log.event || ''} ${log.action || ''} ${log.message || ''}`,
		),
	);
	return (
		<section className="wa-mobile-calls min-h-full bg-white px-4 pb-28 min-[769px]:hidden">
			<div className="mb-5 rounded-2xl bg-[#F0F2F5] p-4">
				<div className="flex items-center gap-3">
					<span className="grid h-11 w-11 place-items-center rounded-full bg-[#D9FDD3] text-[#00A884]"><Phone size={22} /></span>
					<div>
						<h2 className="font-semibold text-[#111B21]">{labels.calls}</h2>
						<p className="text-[13px] text-[#667781]">{labels.callsUnavailable}</p>
					</div>
				</div>
			</div>
			{loading ? (
				<TabLoading label={labels.loading} />
			) : calls.length === 0 ? (
				<Empty icon={Phone} title={labels.noCalls} hint={labels.callsUnavailable} />
			) : (
				<div>
					{calls.map(call => {
						const outgoing = /outgoing|outbound/i.test(`${call.type || ''} ${call.event || ''}`);
						const video = /video/i.test(`${call.type || ''} ${call.event || ''}`);
						const label = call.contactName || call.name || call.phoneNumber || call.waId || labels.calls;
						return (
							<div key={call.id} className="flex min-h-[72px] items-center gap-3 border-b border-[#E9EDEF] py-2">
								<Avatar label={label} size={12} src={call.avatarUrl} />
								<div className="min-w-0 flex-1">
									<p className="truncate font-semibold text-[#111B21]">{label}</p>
									<p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#667781]">
										{outgoing ? <ArrowUpRight size={14} className="text-[#00A884]" /> : <ArrowDownLeft size={14} />}
										{call.created_at || call.createdAt
											? new Date(call.created_at || call.createdAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
											: labels.calls}
									</p>
								</div>
								<button type="button" disabled aria-label={video ? 'Video call unavailable' : 'Voice call unavailable'} className="grid h-10 w-10 place-items-center text-[#00A884]">
									{video ? <Video size={22} /> : <Phone size={21} />}
								</button>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}

function formatRecordingDuration(seconds) {
	const value = Math.max(0, Number(seconds) || 0);
	const minutes = Math.floor(value / 60);
	const remainingSeconds = value % 60;
	return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function titleCaseKey(key = '') {
	const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDuration(totalSeconds) {
	if (totalSeconds == null || Number.isNaN(totalSeconds)) return '—';
	const s = Math.round(totalSeconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${sec}s`;
	return `${sec}s`;
}

function metricMeta(key = '') {
	const k = key.toLowerCase();
	if (k.includes('fail')) return { icon: AlertTriangle, color: '#f43f5e', bg: 'bg-rose-50' };
	if (k.includes('inbound')) return { icon: ArrowDownLeft, color: '#10b981', bg: 'bg-emerald-50' };
	if (k.includes('outbound')) return { icon: ArrowUpRight, color: 'var(--color-primary-500)', bg: 'bg-[var(--color-primary-50)]' };
	if (k.includes('active') || k.includes('conversation')) return { icon: Activity, color: 'var(--color-secondary-500)', bg: 'bg-[var(--color-secondary-50)]' };
	return { icon: MessageCircle, color: '#0ea5e9', bg: 'bg-sky-50' };
}

function conversationTimestamp(value, locale) {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '';
	const now = new Date();
	const sameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();
	if (sameDay) {
		return new Intl.DateTimeFormat(locale, {
			hour: 'numeric',
			minute: '2-digit',
		}).format(date);
	}
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
	}).format(date);
}

function messageDayLabel(value, locale) {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '';
	const today = new Date();
	const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const dayDifference = Math.round((startOfToday - startOfDate) / 86_400_000);
	if (dayDifference === 0) return locale === 'ar' ? 'اليوم' : 'Today';
	if (dayDifference === 1) return locale === 'ar' ? 'أمس' : 'Yesterday';
	return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).format(date);
}

function conversationPreview(conversation) {
	const message = conversation?.lastMessage;
	if (!message) return '';
	const text = String(message.text || '').trim();
	const type = String(message.type || '').toLowerCase();
	const mediaLabel = {
		image: 'Photo',
		video: 'Video',
		audio: 'Voice message',
		ptt: 'Voice message',
		voice: 'Voice message',
		location: 'Location',
		live_location: 'Live location',
		document: 'Document',
		sticker: 'Sticker',
	}[type];
	const preview = text || mediaLabel || '';
	const shouldShowSender = message.direction === 'outbound' && !mediaLabel;
	return shouldShowSender ? `You: ${preview}` : preview;
}

function CameraPreviewIcon({ className = '' }) {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
			<path fillRule="evenodd" clipRule="evenodd" d="M9.86992 5C9.63121 5 9.40038 5.08539 9.21913 5.24074L7.45833 6.75H5C3.89543 6.75 3 7.64543 3 8.75V17.25C3 18.3546 3.89543 19.25 5 19.25H19C20.1046 19.25 21 18.3546 21 17.25V8.75C21 7.64543 20.1046 6.75 19 6.75H16.5417L14.7809 5.24074C14.5996 5.08539 14.3688 5 14.1301 5H9.86992ZM12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17ZM12 15.75C13.5188 15.75 14.75 14.5188 14.75 13C14.75 11.4812 13.5188 10.25 12 10.25C10.4812 10.25 9.25 11.4812 9.25 13C9.25 14.5188 10.4812 15.75 12 15.75ZM17.5 11.25C18.0523 11.25 18.5 10.8023 18.5 10.25C18.5 9.69772 18.0523 9.25 17.5 9.25C16.9477 9.25 16.5 9.69772 16.5 10.25C16.5 10.8023 16.9477 11.25 17.5 11.25Z" fill="currentColor" />
		</svg>
	);
}

function ConversationPreviewIcon({ type }) {
	const normalizedType = String(type || '').toLowerCase();
	const props = { size: 15, strokeWidth: 2, className: 'shrink-0 text-[#667781]' };
	if (['image', 'photo'].includes(normalizedType)) {
		return <CameraPreviewIcon className={props.className} />;
	}
	if (['audio', 'ptt', 'voice'].includes(normalizedType)) {
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={props.className}
				aria-hidden="true"
			>
				<path d="M12 19v3" />
				<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
				<rect x="9" y="2" width="6" height="13" rx="3" fill="currentColor" />
			</svg>
		);
	}
	if (['location', 'live_location'].includes(normalizedType)) return <MapPin {...props} />;
	if (normalizedType === 'video') return <Video {...props} />;
	if (normalizedType === 'document') return <FileText {...props} />;
	if (normalizedType === 'sticker') {
		return (
			<img
				src="/sticker.svg"
				alt=""
				aria-hidden="true"
				className="h-4 w-4 shrink-0 object-contain"
			/>
		);
	}
	return null;
}

function WhatsAppFormattedText({ text }) {
	return parseWhatsAppBold(text).flatMap((part, partIndex) =>
		messageTextSegments(part.text).map((segment, segmentIndex) => {
			const key = `${partIndex}:${segmentIndex}`;
			const content =
				segment.type === 'link' ? (
					<a
						key={key}
						href={segment.href}
						target="_blank"
						rel="noreferrer"
						className="break-all font-medium text-[#027EB5] underline decoration-[#027EB5]/50 underline-offset-2 hover:decoration-current dark:text-[#53BDEB]"
						onClick={event => event.stopPropagation()}
					>
						{segment.text}
					</a>
				) : (
					segment.text
				);
			return part.bold ? (
				<strong key={key} className="font-bold">
					{content}
				</strong>
			) : (
				<span key={key}>{content}</span>
			);
		}),
	);
}

function MessageLinkPreview({ text, labels }) {
	const link = firstMessageLink(text);
	if (!link) return null;
	return (
		<a
			href={link.href}
			target="_blank"
			rel="noreferrer"
			onClick={event => event.stopPropagation()}
			className="mb-2 flex min-w-0 items-center gap-3 rounded-xl border border-black/5 bg-black/[0.045] p-3 no-underline transition-colors hover:bg-black/[0.075] dark:border-white/10 dark:bg-white/[0.07] dark:hover:bg-white/10"
		>
			<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#027EB5] shadow-sm dark:bg-slate-700 dark:text-[#53BDEB]">
				<Globe2 size={20} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-bold">{link.hostname}</span>
				<span dir="ltr" className="block truncate text-[11px] opacity-60">
					{link.displayUrl}
				</span>
			</span>
			<span className="shrink-0 text-[#027EB5] dark:text-[#53BDEB]" title={labels.openLink}>
				<ExternalLink size={17} />
			</span>
		</a>
	);
}

function Avatar({ label = '?', size = 10, className = '', isGroup = false, src = '', videoSrc = '' }) {
	const placeholderStyle = avatarPlaceholderStyle(label);
	return (
		<div
			className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${className}`}
			style={{
				width: `${size * 4}px`,
				height: `${size * 4}px`,
				fontSize: `${size * 1.4}px`,
				...placeholderStyle,
			}}
		>
			{isGroup ? (
				<svg width="52%" height="52%" viewBox="0 0 20 20" aria-hidden="true">
					<path fill="currentColor" d="M7 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m7.5 1a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M1.615 16.428a1.22 1.22 0 0 1-.569-1.175a6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.95 9.95 0 0 1 7 18a9.95 9.95 0 0 1-5.385-1.572M14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755a4.5 4.5 0 0 1 5.874 2.636a.82.82 0 0 1-.36.98A7.47 7.47 0 0 1 14.5 16" />
				</svg>
			) : (
				<svg width="52%" height="52%" viewBox="0 0 24 24" aria-hidden="true">
					<path fill="currentColor" d="M19.652 19.405c.552-.115.882-.693.607-1.187c-.606-1.087-1.56-2.043-2.78-2.771C15.907 14.509 13.98 14 12 14s-3.907.508-5.479 1.447c-1.22.728-2.174 1.684-2.78 2.771c-.275.494.055 1.072.607 1.187a37.5 37.5 0 0 0 15.303 0" />
					<circle cx="12" cy="8" r="5" fill="currentColor" />
				</svg>
			)}
			{src && (
				<img
					src={src}
					alt=""
					loading="lazy"
					referrerPolicy="no-referrer"
					onError={event => {
						event.currentTarget.style.display = 'none';
					}}
					className="absolute inset-0 h-full w-full rounded-full object-cover"
				/>
			)}
			{videoSrc && (
				<video
					src={videoSrc}
					muted
					playsInline
					preload="metadata"
					className="absolute inset-0 h-full w-full rounded-full object-cover"
				/>
			)}
		</div>
	);
}

function Card({ children, className = '' }) {
	return (
		<div
			className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_32px_-14px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 ${className}`}
		>
			{children}
		</div>
	);
}

function CardHeader({ icon: Icon, title, subtitle, right, iconBg = 'bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]/40', iconColor = 'text-[var(--color-primary-500)]' }) {
	return (
		<div className="mb-4 flex items-start justify-between gap-3">
			<div className="flex items-center gap-3">
				<div className={`rounded-xl p-2 ${iconBg}`}>
					<Icon size={16} className={iconColor} />
				</div>
				<div>
					<p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
					{subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
				</div>
			</div>
			{right && <div className="shrink-0">{right}</div>}
		</div>
	);
}

function StatTile({ icon: Icon, label, value, color = 'var(--color-primary-500)', bg = 'bg-[var(--color-primary-50)]' }) {
	return (
		<div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
			<div
				className="pointer-events-none absolute -end-6 -top-6 h-20 w-20 rounded-full opacity-[0.12] transition-transform duration-300 group-hover:scale-125"
				style={{ background: color }}
			/>
			<div className="relative flex items-center gap-2.5">
				{Icon && (
					<div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${bg}`}>
						<Icon size={16} style={{ color }} />
					</div>
				)}
				<p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
			</div>
			<p className="relative mt-3 text-xl font-black leading-snug tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
		</div>
	);
}

function Empty({ icon: Icon = MessageCircle, title, hint }) {
	return (
		<div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
			<div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] p-4 dark:from-slate-800 dark:to-slate-800">
				<Icon size={26} className="text-[var(--color-primary-500)]" />
			</div>
			<p className="font-bold text-slate-700 dark:text-slate-200">{title}</p>
			{hint && <p className="max-w-xs text-xs text-slate-400">{hint}</p>}
		</div>
	);
}

function TabLoading({ label = 'Loading…' }) {
	return (
		<div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
			<div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] p-4 dark:from-slate-800 dark:to-slate-800">
				<Loader2 size={28} className="animate-spin text-[var(--color-primary-500)]" />
			</div>
			<p className="text-sm font-semibold text-slate-500">{label}</p>
		</div>
	);
}

function Toggle({ checked, onChange, label }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${checked ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200 dark:bg-slate-700'
				}`}
		>
			<span
				className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${checked ? 'start-[22px]' : 'start-0.5'
					}`}
			/>
		</button>
	);
}

function ConversationFilterDropdown({ value, onChange, labels }) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const options = [
		{ value: 'all', label: labels.all },
		{ value: 'unread', label: labels.unread },
		{ value: 'favorites', label: labels.favorites },
	];
	const selected = options.find(option => option.value === value) || options[0];

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPosition({
				top: rect.bottom + 6,
				left: rect.left,
				width: rect.width,
			});
		};
		updatePosition();
		const closeOnOutsideClick = event => {
			if (
				!rootRef.current?.contains(event.target) &&
				!menuRef.current?.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const closeOnEscape = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [open]);

	return (
		<div ref={rootRef} className="relative w-[116px] shrink-0">
			<button
				ref={buttonRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen(current => !current)}
				className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none transition-colors hover:border-[var(--color-primary-300)] focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800"
			>
				<span className="truncate">{selected.label}</span>
				<ChevronDown
					size={14}
					className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="listbox"
						aria-label="Conversation type"
						className="fixed z-500 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
						style={position}
					>
						{options.map(option => (
							<button
								key={option.value}
								type="button"
								role="option"
								aria-selected={option.value === value}
								onClick={() => {
									onChange(option.value);
									setOpen(false);
								}}
								className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-xs font-bold transition-colors ${option.value === value
									? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-slate-800'
									: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
									}`}
							>
								<span>{option.label}</span>
								{option.value === value && <Check size={13} />}
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}

function WhatsAppWorkspaceContent() {
	const locale = useLocale();
	const router = useRouter();
	const t = translations[locale] || translations.en;
	const demo = useDemoMode();
	const [activeTab, setActiveTab] = useState('accounts');
	const [settingsSection, setSettingsSection] = useState('ai');
	const [accounts, setAccounts] = useState([]);
	const [accountId, setAccountId] = useState(null);
	const [conversations, setConversations] = useState([]);
	const [conversationPage, setConversationPage] = useState(1);
	const [conversationTotal, setConversationTotal] = useState(0);
	const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
	const [conversationScope, setConversationScope] = useState('all');
	const [syncingInbox, setSyncingInbox] = useState(false);
	const [syncProgress, setSyncProgress] = useState(0);
	const [conversationId, setConversationId] = useState(null);
	const [messages, setMessages] = useState([]);
	const [groups, setGroups] = useState([]);
	const [selectedGroup, setSelectedGroup] = useState(null);
	const [loadingGroup, setLoadingGroup] = useState(false);
	const [statuses, setStatuses] = useState([]);
	const [statusFetchHint, setStatusFetchHint] = useState(null);
	const [selectedStatus, setSelectedStatus] = useState(null);
	const [storyQueue, setStoryQueue] = useState([]);
	const [storyIndex, setStoryIndex] = useState(0);
	const [statusMediaUrl, setStatusMediaUrl] = useState(null);
	const [loadingStory, setLoadingStory] = useState(false);
	const [storyProgress, setStoryProgress] = useState(0);
	const [storyDurationMs, setStoryDurationMs] = useState(5000);
	const [storyPaused, setStoryPaused] = useState(false);
	const storyStartRef = useRef(0);
	const storyElapsedRef = useRef(0);
	const storyProgressBarRef = useRef(null);
	const [logs, setLogs] = useState([]);
	const [report, setReport] = useState(null);
	const [staff, setStaff] = useState([]);
	const [accountAccess, setAccountAccess] = useState([]);
	const [privacySettings, setPrivacySettings] = useState({
		hideStatusViewReceipts: true,
		readReceiptMode: 'on_reply',
	});
	const [pushPermission, setPushPermission] = useState('checking');
	const [enablingPush, setEnablingPush] = useState(false);
	const [qr, setQr] = useState(null);
	const [bootStatus, setBootStatus] = useState('loading');
	const [bootError, setBootError] = useState('');
	const [isAdmin, setIsAdmin] = useState(false);
	const [currentUserId, setCurrentUserId] = useState('anonymous');
	const [tabLoading, setTabLoading] = useState(false);
	const [tabError, setTabError] = useState('');
	const [accountBusy, setAccountBusy] = useState(false);
	const [sending, setSending] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [hasMoreMessages, setHasMoreMessages] = useState(true);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [recordingVoice, setRecordingVoice] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [draft, setDraft] = useState('');
	const [replyingTo, setReplyingTo] = useState(null);
	const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
	const [reactingMessageIds, setReactingMessageIds] = useState(() => new Set());
	const [actionMessageId, setActionMessageId] = useState(null);
	const [actionMessageAnchor, setActionMessageAnchor] = useState(null);
	const [pendingMessageActions, setPendingMessageActions] = useState(() => new Set());
	const [forwardingMessage, setForwardingMessage] = useState(null);
	const [messageInfo, setMessageInfo] = useState(null);
	const [loadingMessageInfo, setLoadingMessageInfo] = useState(false);
	const [deleteMessageTarget, setDeleteMessageTarget] = useState(null);
	const [transcriptionMessage, setTranscriptionMessage] = useState(null);
	const [conversationActionTarget, setConversationActionTarget] = useState(null);
	const [conversationActionAnchor, setConversationActionAnchor] = useState(null);
	const [conversationAssignTarget, setConversationAssignTarget] = useState(null);
	const [conversationInfoTarget, setConversationInfoTarget] = useState(null);
	const [notes, setNotes] = useState([]);
	const [noteDraft, setNoteDraft] = useState('');
	const [showNotes, setShowNotes] = useState(false);
	const [loadingNotes, setLoadingNotes] = useState(false);
	const [savingNote, setSavingNote] = useState(false);
	const [statusDraft, setStatusDraft] = useState('');
	const [publishingStatus, setPublishingStatus] = useState(false);
	const [syncingStatuses, setSyncingStatuses] = useState(false);
	const [viewedStatusIds, setViewedStatusIds] = useState(() => new Set());
	const [newAccountName, setNewAccountName] = useState('');
	const [chatSearch, setChatSearch] = useState('');
	const [searchOpen, setSearchOpen] = useState(false);
	const [conversationFilter, setConversationFilter] = useState('all');
	const [pendingPreferenceActions, setPendingPreferenceActions] = useState(() => new Set());
	const [assignmentFilter, setAssignmentFilter] = useState('');
	const [searchingConversations, setSearchingConversations] = useState(false);
	const [staffSearch, setStaffSearch] = useState('');
	const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
	const [registeredChatImages, setRegisteredChatImages] = useState({});
	const [activeChatImageId, setActiveChatImageId] = useState(null);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileHeaderScrolled, setMobileHeaderScrolled] = useState(false);
	const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
	const [aiSuggestionsVisible, setAiSuggestionsVisible] = useState(true);
	const [stickerPanelOpen, setStickerPanelOpen] = useState(false);
	const whatsappAi = useWhatsAppAi({
		accountId,
		conversationId,
		messages,
		allowSuggestions: !demo.settings.enabled,
	});
	const fileRef = useRef(null);
	const messageBoxRef = useRef(null);
	const longPressTimerRef = useRef(null);
	const longPressOriginRef = useRef(null);
	const conversationLongPressTimerRef = useRef(null);
	const conversationLongPressOriginRef = useRef(null);
	const suppressConversationClickRef = useRef(false);
	const lastAutoScrolledMessageRef = useRef(null);
	const chatSearchRef = useRef('');
	const conversationFilterRef = useRef('all');
	const assignmentFilterRef = useRef('');
	const conversationsCacheRef = useRef(new Map());
	const messagesCacheRef = useRef(new Map());
	const messageSyncInFlightRef = useRef(new Map());
	const previewBackfillAttemptedRef = useRef(new Set());
	const statusesCacheRef = useRef(new Map());
	const refreshStatusesFromProviderRef = useRef(null);
	const reloadConversationsTimer = useRef(null);
	const messagesRequestId = useRef(0);
	const olderRequestId = useRef(0);
	const loadingOlderRef = useRef(false);
	const socketRef = useRef(null);
	const accountIdRef = useRef(null);
	const accountsRef = useRef([]);
	const previousAccountIdRef = useRef(null);
	const conversationIdRef = useRef(null);
	const watchedConversationRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const recordingStreamRef = useRef(null);
	const recordingChunksRef = useRef([]);
	const recordingTimerRef = useRef(null);
	const recordingSecondsRef = useRef(0);
	const discardRecordingRef = useRef(false);
	const statusMediaUrlRef = useRef(null);

	const scrollMessagesToBottom = useCallback((behavior = 'auto') => {
		const scroll = () => {
			const box = messageBoxRef.current;
			if (box) box.scrollTo({ top: box.scrollHeight, behavior });
		};
		requestAnimationFrame(() => {
			scroll();
			requestAnimationFrame(scroll);
		});
		window.setTimeout(scroll, 120);
		window.setTimeout(scroll, 350);
	}, []);
	const storyRequestId = useRef(0);
	const statusRefreshInFlightRef = useRef(null);
	const groupRequestId = useRef(0);
	const conversationsRequestId = useRef(0);
	const conversationSearchRequestId = useRef(0);
	const tabRequestId = useRef(0);

	const selectedAccount = useMemo(
		() => accounts.find(item => item.id === accountId) || null,
		[accounts, accountId],
	);
	const isAccountConnected = selectedAccount?.status === 'connected';
	const effectiveConversations = useMemo(
		() =>
			buildEffectiveConversations({
				realConversations: conversations,
				demoState: demo.data,
				runtime: demo.runtime,
				enabled: demo.settings.enabled,
				featureFlags: demo.settings.featureFlags,
			}),
		[conversations, demo.data, demo.runtime, demo.settings.enabled, demo.settings.featureFlags],
	);
	const selectedConversation = useMemo(
		() => effectiveConversations.find(item => item.id === conversationId) || null,
		[effectiveConversations, conversationId],
	);
	const effectiveMessages = useMemo(
		() =>
			buildEffectiveMessages({
				realMessages: messages,
				selectedConversation,
				demoState: demo.data,
				runtime: demo.runtime,
				enabled: demo.settings.enabled,
			}),
		[messages, selectedConversation, demo.data, demo.runtime, demo.settings.enabled],
	);
	const selectedConversationSource = resolveConversationSource(selectedConversation);
	const selectedDemoRuntimeId =
		selectedConversation?.demoOverlayId || selectedConversation?.rawDemoId || '';
	const currentAccess = selectedAccount?.currentAccess || {};
	const canUseWhatsApp = Boolean(currentAccess.canUse);
	const canManageWhatsApp = Boolean(currentAccess.canManage);
	const canAssignWhatsApp = Boolean(currentAccess.canAssign);
	const canComposeInConversation =
		(canUseWhatsApp || demo.settings.enabled) &&
		canRouteDemoWrite(demo.settings.enabled, selectedConversation) &&
		(!demo.settings.enabled || demo.settings.featureFlags.useFakeMessages !== false);
	const availableTabs = useMemo(
		() => tabs.filter(([key]) => key !== 'settings' || canManageWhatsApp || isAdmin),
		[canManageWhatsApp, isAdmin],
	);
	const unreadConversationCount = useMemo(
		() => effectiveConversations.reduce((total, conversation) => total + Math.max(0, Number(conversation.unreadCount) || 0), 0),
		[effectiveConversations],
	);
	const chatImages = useMemo(
		() => effectiveMessages.flatMap(message =>
			(message.attachments || [])
				.filter(attachment => ['image', 'sticker'].includes(String(attachment.type || '').toLowerCase()))
				.map(attachment => registeredChatImages[attachment.id])
				.filter(Boolean),
		),
		[effectiveMessages, registeredChatImages],
	);
	const messageRows = useMemo(
		() => groupConsecutiveImageMessages(effectiveMessages.filter(isRenderableWhatsAppMessage)),
		[effectiveMessages],
	);
	const registerChatImage = useCallback((id, image) => {
		setRegisteredChatImages(current => {
			if (!image) {
				if (!current[id]) return current;
				const next = { ...current };
				delete next[id];
				return next;
			}
			if (current[id]?.url === image.url) return current;
			return { ...current, [id]: image };
		});
	}, []);

	useEffect(() => {
		setActiveChatImageId(null);
		setRegisteredChatImages({});
		setReplyingTo(null);
		setReactionPickerMessageId(null);
		setActionMessageId(null);
		setActionMessageAnchor(null);
		setForwardingMessage(null);
		setDeleteMessageTarget(null);
		setMessageInfo(null);
		setTranscriptionMessage(null);
	}, [conversationId]);

	useEffect(() => {
		if (!reactionPickerMessageId) return undefined;
		const closePickerOutside = event => {
			if (
				event.target.closest(
					'[data-message-reaction-picker], [data-message-actions-trigger]',
				)
			) {
				return;
			}
			setReactionPickerMessageId(null);
		};
		document.addEventListener('pointerdown', closePickerOutside);
		return () => document.removeEventListener('pointerdown', closePickerOutside);
	}, [reactionPickerMessageId]);

	useEffect(() => {
		try {
			const user = JSON.parse(window.localStorage.getItem('user') || 'null');
			const roles = [
				user?.role,
				...(Array.isArray(user?.roles) ? user.roles : []),
			]
				.filter(Boolean)
				.map(role => String(role).toUpperCase());
			setIsAdmin(roles.includes('ADMIN') || roles.includes('SUPER_ADMIN'));
			setCurrentUserId(String(user?.id || 'anonymous'));
		} catch {
			setIsAdmin(false);
		}
		const id = window.setInterval(() => setRelativeTimeNow(Date.now()), 60_000);
		return () => window.clearInterval(id);
	}, []);

	const subscribeToWhatsAppPush = useCallback(
		async requestPermission => {
			if (
				process.env.NODE_ENV === 'development' ||
				typeof window === 'undefined' ||
				!('Notification' in window) ||
				!('serviceWorker' in navigator) ||
				!('PushManager' in window)
			) {
				setPushPermission('unsupported');
				return false;
			}
			setEnablingPush(true);
			try {
				let permission = Notification.permission;
				if (permission === 'default' && requestPermission) {
					permission = await Notification.requestPermission();
				}
				setPushPermission(permission);
				if (permission !== 'granted') return false;

				await navigator.serviceWorker.register('/sw.js');
				const registration = await navigator.serviceWorker.ready;
				let subscription = await registration.pushManager.getSubscription();
				if (!subscription) {
					const { data } = await api.get('/reminders/push/vapid-key');
					const publicKey = data?.publicKey;
					if (!publicKey) throw new Error('Missing VAPID public key');
					const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
					const binary = window.atob(
						(publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'),
					);
					const applicationServerKey = Uint8Array.from(binary, character =>
						character.charCodeAt(0),
					);
					subscription = await registration.pushManager.subscribe({
						userVisibleOnly: true,
						applicationServerKey,
					});
				}
				await api.post('/reminders/push/subscribe', subscription.toJSON());
				setPushPermission('granted');
				if (requestPermission) toast.success(t.pushEnabled);
				return true;
			} catch (error) {
				if (requestPermission) {
					toast.error(error.response?.data?.message || t.pushEnableFailed);
				}
				return false;
			} finally {
				setEnablingPush(false);
			}
		},
		[t],
	);

	const groupedStatuses = useMemo(() => {
		const map = new Map();
		const statusKey = value => {
			const text = String(value || '');
			const broadcast = text.match(/status@broadcast_([^_]+)/i)?.[1];
			if (broadcast) return broadcast.toLowerCase();
			const hex = text.match(/_([0-9A-Fa-f]{10,}|3A[0-9A-Fa-f]+)(?:_|$)/)?.[1];
			if (hex) return hex.toLowerCase();
			return text.toLowerCase();
		};
		for (const status of statuses) {
			const key = status.senderWaId || (status.isOwn ? 'own' : status.id);
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(status);
		}
		return [...map.entries()]
			.map(([senderWaId, items]) => {
				const deduped = [];
				const seen = new Set();
				for (const item of [...items].sort(
					(a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
				)) {
					const identity = statusKey(item.providerStatusId || item.id);
					if (seen.has(identity)) continue;
					seen.add(identity);
					deduped.push(item);
				}
				const ordered = deduped;
				const unviewedItems = ordered.filter(item => !viewedStatusIds.has(item.id));
				const firstUnviewedIndex = ordered.findIndex(item => !viewedStatusIds.has(item.id));
				return {
					senderWaId,
					items: ordered,
					latest: ordered[ordered.length - 1] || items[0],
					isOwn: ordered.some(item => item.isOwn),
					isViewed: unviewedItems.length === 0,
					unviewedCount: unviewedItems.length,
					startIndex: firstUnviewedIndex >= 0 ? firstUnviewedIndex : 0,
				};
			})
			.sort((a, b) => {
				// WhatsApp-like order: own → unviewed → viewed, then newest first.
				if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
				if (a.isViewed !== b.isViewed) return a.isViewed ? 1 : -1;
				const aTime = a.latest?.publishedAt ? new Date(a.latest.publishedAt).getTime() : 0;
				const bTime = b.latest?.publishedAt ? new Date(b.latest.publishedAt).getTime() : 0;
				return bTime - aTime;
			});
	}, [statuses, viewedStatusIds]);

	const storiesBySender = useMemo(() => {
		const map = new Map();
		for (const story of groupedStatuses) {
			const key = normalizeWhatsAppIdentity(story.senderWaId);
			if (key && !story.isOwn) map.set(key, story);
		}
		return map;
	}, [groupedStatuses]);

	const storyForConversation = useCallback(
		conversation => {
			const identities = [
				conversation?.providerChatId,
				conversation?.contact?.waId,
				conversation?.contact?.phoneNumber,
			];
			for (const identity of identities) {
				const story = storiesBySender.get(normalizeWhatsAppIdentity(identity));
				if (story) return story;
			}
			return null;
		},
		[storiesBySender],
	);

	// Story grid thumbnails: fetch media content (never the /view receipt
	// endpoint) for each sender's latest story so the grid shows a real
	// preview instead of just initials. See StoryThumbnail for the rationale.
	const storyThumbCacheRef = useRef(new Map());
	const [storyThumbs, setStoryThumbs] = useState({});

	useEffect(() => {
		if (activeTab !== 'statuses' || !accountId) return undefined;
		let cancelled = false;
		const targets = groupedStatuses
			.map(story => story.latest)
			.filter(
				item =>
					item &&
					['image', 'video'].includes(String(item.type || '').toLowerCase()) &&
					!storyThumbCacheRef.current.has(item.id),
			);
		if (!targets.length) return undefined;

		(async () => {
			for (const item of targets) {
				if (cancelled || accountIdRef.current !== accountId) break;
				if (storyThumbCacheRef.current.has(item.id)) continue;
				storyThumbCacheRef.current.set(item.id, null);
				try {
					const blob = await fetchStatusMediaBlob(accountId, item.id);
					if (cancelled || accountIdRef.current !== accountId) return;
					const url = URL.createObjectURL(blob);
					const type = String(blob.type || '').startsWith('video/') ? 'video' : 'image';
					storyThumbCacheRef.current.set(item.id, { url, type });
					setStoryThumbs(prev => ({ ...prev, [item.id]: { url, type } }));
				} catch {
					storyThumbCacheRef.current.delete(item.id);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [activeTab, accountId, groupedStatuses]);

	useEffect(() => {
		return () => {
			storyThumbCacheRef.current.forEach(entry => {
				if (entry?.url) URL.revokeObjectURL(entry.url);
			});
			storyThumbCacheRef.current.clear();
			setStoryThumbs({});
		};
	}, [accountId]);

	useEffect(() => {
		if (
			typeof window === 'undefined' ||
			!('Notification' in window) ||
			!('serviceWorker' in navigator) ||
			!('PushManager' in window)
		) {
			setPushPermission('unsupported');
			return;
		}
		setPushPermission(Notification.permission);
		if (Notification.permission === 'granted') {
			void subscribeToWhatsAppPush(false);
		}
	}, [subscribeToWhatsAppPush]);

	useEffect(() => {
		if (!accountId || typeof window === 'undefined') {
			setViewedStatusIds(new Set());
			return;
		}
		try {
			const raw = window.localStorage.getItem(
				`wa-viewed-statuses:${currentUserId}:${accountId}`,
			);
			const parsed = raw ? JSON.parse(raw) : [];
			setViewedStatusIds(new Set(Array.isArray(parsed) ? parsed : []));
		} catch {
			setViewedStatusIds(new Set());
		}
	}, [accountId, currentUserId]);

	const markStatusesViewed = useCallback(
		statusIds => {
			const ids = (Array.isArray(statusIds) ? statusIds : [statusIds]).filter(Boolean);
			if (!ids.length) return;
			setViewedStatusIds(current => {
				const next = new Set(current);
				ids.forEach(id => next.add(id));
				const limited = new Set([...next].slice(-500));
				if (accountId && typeof window !== 'undefined') {
					window.localStorage.setItem(
						`wa-viewed-statuses:${currentUserId}:${accountId}`,
						JSON.stringify([...limited]),
					);
				}
				return limited;
			});
		},
		[accountId, currentUserId],
	);

	const filteredConversations = useMemo(() => {
		if (!isAccountConnected && !demo.settings.enabled) return [];
		const sorted = [...effectiveConversations].sort((a, b) => {
			if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
			const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
			const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
			return bTime - aTime;
		});
		if (!chatSearch.trim()) return sorted;
		const q = chatSearch.trim().toLowerCase();
		return sorted.filter(conversation =>
			conversationTitle(conversation).toLowerCase().includes(q),
		);
	}, [effectiveConversations, chatSearch, isAccountConnected, demo.settings.enabled]);

	const availableStaff = useMemo(() => {
		const rest = staff.filter(user => !accountAccess.some(row => row.userId === user.id));
		if (!staffSearch.trim()) return rest;
		const q = staffSearch.trim().toLowerCase();
		return rest.filter(
			user => user.name?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q),
		);
	}, [staff, accountAccess, staffSearch]);

	const loadAccounts = useCallback(async () => {
		const { data } = await api.get('/whatsapp/accounts');
		const list = Array.isArray(data) ? data : [];
		const requestedAccountId =
			typeof window !== 'undefined'
				? new URLSearchParams(window.location.search).get('accountId')
				: null;
		const requestedAccount = list.find(item => item.id === requestedAccountId);
		setAccounts(list);
		const currentAccount = list.find(item => item.id === accountIdRef.current);
		const nextAccountId = requestedAccount?.id || currentAccount?.id || list[0]?.id || null;
		setAccountId(current => {
			const stillExists = list.some(item => item.id === current);
			return requestedAccount?.id || (stillExists ? current : null) || list[0]?.id || null;
		});
		const activeAccount = list.find(item => item.id === nextAccountId);
		if (activeAccount?.status === 'connected') {
			setQr(null);
		}
		if (requestedAccount) setActiveTab('chats');
		return list;
	}, []);

	const loadStaff = useCallback(async () => {
		try {
			const { data } = await api.get('/whatsapp/accounts/staff');
			setStaff(Array.isArray(data) ? data : []);
		} catch {
			setStaff([]);
		}
	}, []);

	const reloadWorkspace = useCallback(async () => {
		setBootStatus('loading');
		setBootError('');
		try {
			await Promise.all([loadAccounts(), loadStaff()]);
			setBootStatus('success');
		} catch (error) {
			const message =
				error?.response?.data?.message ||
				error?.message ||
				t.workspaceLoadFailed;
			setBootStatus('error');
			setBootError(Array.isArray(message) ? message.join(', ') : message);
		}
	}, [loadAccounts, loadStaff, t.workspaceLoadFailed]);

	const loadConversations = useCallback(async (id, page = 1, append = false, options = {}) => {
		if (!id) return;
		const requestId = ++conversationsRequestId.current;
		const search = String(options.search || '').trim();
		const filter = options.filter || conversationFilterRef.current || 'all';
		const assignedUserId =
			options.assignedUserId ?? assignmentFilterRef.current ?? '';
		const useCache = !search && filter === 'all' && !assignedUserId;
		const account = accountsRef.current.find(item => item.id === id);
		if (account && account.status !== 'connected') {
			if (accountIdRef.current === id) {
				setConversations([]);
				setConversationPage(1);
				setConversationTotal(0);
			}
			return { items: [], total: 0, page: 1, scope: 'all' };
		}
		const cached = useCache ? conversationsCacheRef.current.get(id) : null;
		const isFirstPage = page === 1 && !append;
		if (isFirstPage && cached && accountIdRef.current === id) {
			setConversations(cached.items);
			const requestedConversationId =
				typeof window !== 'undefined'
					? new URLSearchParams(window.location.search).get('conversationId')
					: null;
			if (cached.items.some(item => item.id === requestedConversationId)) {
				setConversationId(requestedConversationId);
				setActiveTab('chats');
			}
			setConversationPage(cached.page);
			setConversationTotal(cached.total);
			setConversationScope(cached.scope);
			if (!options.force && Date.now() - cached.cachedAt < CONVERSATIONS_CACHE_TTL) {
				return cached;
			}
		}
		const { data } = await api.get(`/whatsapp/accounts/${id}/conversations`, {
			params: {
				page,
				limit: 50,
				search: search || undefined,
				filter: filter === 'all' ? undefined : filter,
				assignedUserId: assignedUserId || undefined,
			},
		});
		const items = data?.items || [];
		const previousItems = append
			? useCache
				? conversationsCacheRef.current.get(id)?.items || []
				: []
			: [];
		const nextItems = append
			? [...new Map([...previousItems, ...items].map(item => [item.id, item])).values()]
			: items;
		const next = {
			items: nextItems,
			page: data?.page || page,
			total: data?.total || nextItems.length,
			scope: data?.scope || 'all',
			cachedAt: Date.now(),
		};
		if (useCache) conversationsCacheRef.current.set(id, next);
		if (
			accountIdRef.current !== id ||
			conversationsRequestId.current !== requestId
		) {
			return next;
		}
		setConversations(nextItems);
		const requestedConversationId =
			typeof window !== 'undefined'
				? new URLSearchParams(window.location.search).get('conversationId')
				: null;
		if (nextItems.some(item => item.id === requestedConversationId)) {
			setConversationId(requestedConversationId);
			setActiveTab('chats');
		}
		setConversationPage(next.page);
		setConversationTotal(next.total);
		setConversationScope(next.scope);
		return next;
	}, []);

	const loadMoreConversations = async () => {
		if (!accountId || loadingMoreConversations || conversations.length >= conversationTotal) return;
		setLoadingMoreConversations(true);
		try {
			await loadConversations(accountId, conversationPage + 1, true, {
				search: chatSearchRef.current,
				filter: conversationFilterRef.current,
				assignedUserId: assignmentFilterRef.current,
			});
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not load more conversations');
		} finally {
			setLoadingMoreConversations(false);
		}
	};

	const scheduleReloadConversations = useCallback(
		id => {
			if (!id) return;
			const account = accountsRef.current.find(item => item.id === id);
			if (account && account.status !== 'connected') return;
			if (reloadConversationsTimer.current) clearTimeout(reloadConversationsTimer.current);
			reloadConversationsTimer.current = setTimeout(() => {
				loadConversations(id, 1, false, {
					force: true,
					search: chatSearchRef.current,
					filter: conversationFilterRef.current,
					assignedUserId: assignmentFilterRef.current,
				}).catch(() => { });
			}, 800);
		},
		[loadConversations],
	);

	useEffect(() => {
		chatSearchRef.current = chatSearch.trim();
		conversationFilterRef.current = conversationFilter;
		assignmentFilterRef.current = assignmentFilter;
		if (!accountId || !isAccountConnected) return undefined;
		const searchRequestId = ++conversationSearchRequestId.current;
		const timer = window.setTimeout(async () => {
			setSearchingConversations(true);
			try {
				await loadConversations(accountId, 1, false, {
					force: true,
					search: chatSearchRef.current,
					filter: conversationFilterRef.current,
					assignedUserId: assignmentFilterRef.current,
				});
			} catch (error) {
				toast.error(error.response?.data?.message || 'Could not search conversations');
			} finally {
				if (
					accountIdRef.current === accountId &&
					conversationSearchRequestId.current === searchRequestId
				) {
					setSearchingConversations(false);
				}
			}
		}, 300);
		return () => window.clearTimeout(timer);
	}, [
		accountId,
		assignmentFilter,
		chatSearch,
		conversationFilter,
		isAccountConnected,
		loadConversations,
	]);

	useEffect(() => {
		if (
			activeTab !== 'chats' ||
			!accountId ||
			!isAccountConnected ||
			!canUseWhatsApp ||
			demo.settings.enabled
		) {
			return undefined;
		}

		const missingPreviews = conversations
			.filter(
				conversation =>
					conversation.lastMessageAt &&
					!isRenderableWhatsAppMessage(conversation.lastMessage) &&
					!previewBackfillAttemptedRef.current.has(
						`${accountId}:${conversation.id}`,
					),
			)
			.slice(0, 8);
		if (!missingPreviews.length) return undefined;

		for (const conversation of missingPreviews) {
			previewBackfillAttemptedRef.current.add(`${accountId}:${conversation.id}`);
		}
		let cancelled = false;
		void Promise.allSettled(
			missingPreviews.map(conversation =>
				api.post(`/whatsapp/conversations/${conversation.id}/sync/latest`, null, {
					params: { limit: 1 },
					timeout: 45000,
				}),
			),
		).then(results => {
			if (cancelled || !results.some(result => result.status === 'fulfilled')) return;
			conversationsCacheRef.current.delete(accountId);
			void loadConversations(accountId, 1, false, { force: true });
		});

		return () => {
			cancelled = true;
		};
	}, [
		accountId,
		activeTab,
		canUseWhatsApp,
		conversations,
		demo.settings.enabled,
		isAccountConnected,
		loadConversations,
	]);

	const setConversationUnreadCount = useCallback((id, unreadCount) => {
		if (!id) return;
		const normalizedCount = Math.max(0, Number(unreadCount) || 0);
		setConversations(current => {
			const next = current.map(conversation =>
				conversation.id === id
					? { ...conversation, unreadCount: normalizedCount }
					: conversation,
			);
			const currentAccountId = accountIdRef.current;
			const cached = currentAccountId
				? conversationsCacheRef.current.get(currentAccountId)
				: null;
			if (currentAccountId && cached) {
				conversationsCacheRef.current.set(currentAccountId, {
					...cached,
					items: next,
					cachedAt: Date.now(),
				});
			}
			return next;
		});
	}, []);

	const updateCachedMessage = useCallback((targetConversationId, messageId, updater) => {
		if (!targetConversationId || !messageId) return;
		const apply = items =>
			items.map(message =>
				message.id === messageId || message.providerMessageId === messageId
					? updater(message)
					: message,
			);
		if (conversationIdRef.current === targetConversationId) {
			setMessages(current => apply(current));
		}
		const cached = messagesCacheRef.current.get(targetConversationId);
		if (cached) {
			messagesCacheRef.current.set(targetConversationId, {
				...cached,
				items: apply(cached.items),
				cachedAt: Date.now(),
			});
		}
	}, []);

	const applyStatuses = useCallback((targetAccountId, payload) => {
		const items = Array.isArray(payload) ? payload : payload?.items || [];
		const hint = Array.isArray(payload) ? null : payload?.hint || null;
		if (accountIdRef.current === targetAccountId) {
			setStatuses(items);
			setStatusFetchHint(hint);
		}
		statusesCacheRef.current.set(targetAccountId, {
			items,
			hint,
			cachedAt: Date.now(),
		});
	}, []);

	const refreshStatusesFromProvider = useCallback(
		async (targetAccountId, { silent = true, force = false } = {}) => {
			if (!targetAccountId) return;
			const account = accountsRef.current.find(item => item.id === targetAccountId);
			if (account && account.status !== 'connected') return;
			const cached = statusesCacheRef.current.get(targetAccountId);
			if (!force && cached && Date.now() - cached.cachedAt < STATUSES_CACHE_TTL) {
				return;
			}
			if (statusRefreshInFlightRef.current === targetAccountId) return;
			statusRefreshInFlightRef.current = targetAccountId;
			setSyncingStatuses(true);
			try {
				const { data: refreshed } = await api.get(
					`/whatsapp/accounts/${targetAccountId}/statuses`,
					{ params: { refresh: true }, timeout: 40000 },
				);
				applyStatuses(targetAccountId, refreshed);
			} catch (error) {
				if (!silent) {
					toast.error(
						error.response?.data?.message || 'Could not refresh statuses',
					);
				}
				if (accountIdRef.current === targetAccountId) {
					setStatusFetchHint('whatsapp_stories_sync_failed');
				}
			} finally {
				if (statusRefreshInFlightRef.current === targetAccountId) {
					statusRefreshInFlightRef.current = null;
				}
				setSyncingStatuses(false);
			}
		},
		[applyStatuses],
	);

	refreshStatusesFromProviderRef.current = refreshStatusesFromProvider;

	const loadStatuses = useCallback(
		async (targetAccountId, { force = false, silent = true } = {}) => {
			if (!targetAccountId) return;
			const account = accountsRef.current.find(item => item.id === targetAccountId);
			if (account && account.status !== 'connected') {
				setStatuses([]);
				setStatusFetchHint('whatsapp_not_connected');
				return;
			}
			const cached = statusesCacheRef.current.get(targetAccountId);
			const cacheFresh =
				Boolean(cached?.items?.length) &&
				Date.now() - cached.cachedAt < STATUSES_CACHE_TTL;
			if (cached?.items?.length && accountIdRef.current === targetAccountId) {
				setStatuses(cached.items);
				setStatusFetchHint(cached.hint || null);
			}
			try {
				const { data } = await api.get(`/whatsapp/accounts/${targetAccountId}/statuses`, {
					timeout: 15000,
				});
				if (accountIdRef.current === targetAccountId) {
					applyStatuses(targetAccountId, data);
				} else {
					statusesCacheRef.current.set(targetAccountId, {
						items: data?.items || [],
						hint: data?.hint || null,
						cachedAt: cached?.cachedAt || Date.now(),
					});
				}
				if (force || !cacheFresh) {
					const providerRefreshRequired =
						force || !Array.isArray(data?.items) || data.items.length === 0;
					void refreshStatusesFromProvider(targetAccountId, {
						silent: !providerRefreshRequired && silent,
						force: providerRefreshRequired,
					});
				}
			} catch (error) {
				if (!cached?.items?.length) {
					if (force || !silent) {
						toast.error(error.response?.data?.message || 'Could not load statuses');
					}
				} else if (force) {
					void refreshStatusesFromProvider(targetAccountId, { silent: false, force: true });
				}
			}
		},
		[refreshStatusesFromProvider, applyStatuses],
	);

	const loadMessages = useCallback(async (id, canSync) => {
		if (!id) return;
		const requestId = ++messagesRequestId.current;
		const isCurrentRequest = () =>
			messagesRequestId.current === requestId &&
			conversationIdRef.current === id;
		const cached = messagesCacheRef.current.get(id);
		if (cached?.items?.length) {
			setMessages(cached.items);
			setHasMoreMessages(cached.hasMore);
			setLoadingMessages(false);
			scrollMessagesToBottom();
		} else {
			setLoadingMessages(true);
			setMessages([]);
			setHasMoreMessages(true);
		}
		try {
			const { data } = await api.get(`/whatsapp/conversations/${id}/messages`, {
				params: { limit: MESSAGE_PAGE_SIZE },
			});
			if (!isCurrentRequest()) return;
			const storedItems = Array.isArray(data) ? data : [];
			const currentCache = messagesCacheRef.current.get(id);
			let items = mergeMessages(currentCache?.items || cached?.items || [], storedItems);
			const storedPageIsFull =
				storedItems.length >= MESSAGE_PAGE_SIZE;
			const initialHasMore =
				Boolean(currentCache?.hasMore ?? cached?.hasMore) || storedPageIsFull;
			setHasMoreMessages(initialHasMore);
			messagesCacheRef.current.set(id, {
				items,
				hasMore: initialHasMore,
				cachedAt: Date.now(),
			});
			setMessages(current => mergeMessages(current, items));
			// Stored messages should be visible immediately. Provider history can
			// be much slower and must never keep the conversation behind a loader.
			setLoadingMessages(false);
			scrollMessagesToBottom();
			if (canSync) {
				api
					.post(`/whatsapp/conversations/${id}/read`)
					.then(() => setConversationUnreadCount(id, 0))
					.catch(() => { });
			}

			const applySynced = synced => {
				if (!isCurrentRequest()) return;
				const latestCache = messagesCacheRef.current.get(id);
				items = mergeMessages(latestCache?.items || items, synced?.items || []);
				setMessages(current => mergeMessages(current, synced?.items || []));
				const hasMore =
					typeof synced?.hasMore === 'boolean'
						? synced.hasMore
						: items.length >= MESSAGE_PAGE_SIZE;
				setHasMoreMessages(hasMore);
				messagesCacheRef.current.set(id, {
					items,
					hasMore,
					cachedAt: Date.now(),
				});
				scrollMessagesToBottom();
			};

			const cacheIsFresh =
				cached?.items?.length &&
				Date.now() - cached.cachedAt < MESSAGES_CACHE_TTL;
			const needsProviderBackfill =
				canSync && (items.length < MESSAGE_PAGE_SIZE || !cacheIsFresh);
			if (needsProviderBackfill) {
				let syncPromise = messageSyncInFlightRef.current.get(id);
				if (!syncPromise) {
					syncPromise = api
						.post(`/whatsapp/conversations/${id}/sync/latest`, null, {
							params: { limit: MESSAGE_PAGE_SIZE },
							timeout: 90000,
						})
						.then(response => response.data)
						.finally(() => {
							if (messageSyncInFlightRef.current.get(id) === syncPromise) {
								messageSyncInFlightRef.current.delete(id);
							}
						});
					messageSyncInFlightRef.current.set(id, syncPromise);
				}
				syncPromise
					.then(synced => applySynced(synced))
					.catch(error => {
						if (
							messagesRequestId.current === requestId &&
							items.length === 0
						) {
							toast.error(
								error.response?.data?.message || 'Could not synchronize message history',
							);
						}
					});
			}
		} catch (error) {
			if (!isCurrentRequest()) return;
			if (!cached?.items?.length) {
				setMessages([]);
				toast.error(error.response?.data?.message || 'Could not load messages');
			}
		} finally {
			if (isCurrentRequest()) setLoadingMessages(false);
		}
	}, [scrollMessagesToBottom, setConversationUnreadCount]);

	useEffect(() => {
		let cancelled = false;
		const boot = async () => {
			setBootStatus('loading');
			setBootError('');
			try {
				await loadAccounts();
				if (!cancelled) setBootStatus('success');
			} catch (error) {
				if (cancelled) return;
				// 401 already redirects to /auth via axios interceptor.
				if (error?.response?.status === 401) return;
				const message =
					error?.code === 'ECONNABORTED' || error?.message?.includes?.('timeout')
						? 'WhatsApp API timed out — is the backend still starting or syncing?'
						: error?.response?.data?.message ||
						error?.message ||
						'Failed to load WhatsApp workspace';
				toast.error(Array.isArray(message) ? message.join(', ') : message);
				// One automatic retry after a short delay (common while Nest restores WA session).
				await new Promise(resolve => setTimeout(resolve, 1500));
				if (cancelled) return;
				try {
					await loadAccounts();
					if (!cancelled) setBootStatus('success');
				} catch (retryError) {
					if (cancelled || retryError?.response?.status === 401) return;
					setBootStatus('error');
					setBootError(
						retryError?.response?.data?.message ||
						retryError?.message ||
						t.workspaceLoadFailed,
					);
					toast.error(
						retryError?.response?.data?.message ||
						retryError?.message ||
						'Failed to load WhatsApp workspace',
					);
				}
			} finally {
				if (!cancelled) loadStaff().catch(() => { });
			}
		};
		boot();
		return () => {
			cancelled = true;
		};
	}, [loadAccounts, loadStaff, t.workspaceLoadFailed]);

	useEffect(() => {
		accountIdRef.current = accountId;
	}, [accountId]);

	useEffect(() => {
		accountsRef.current = accounts;
	}, [accounts]);

	useEffect(() => {
		if (!accountId) return;
		const accountChanged = previousAccountIdRef.current !== accountId;
		previousAccountIdRef.current = accountId;
		if (accountChanged) {
			conversationsRequestId.current += 1;
			tabRequestId.current += 1;
			storyRequestId.current += 1;
			groupRequestId.current += 1;
			setConversationId(null);
			setMessages([]);
			setLoadingMessages(false);
			setSearchingConversations(false);
			setSelectedGroup(null);
			setGroups([]);
			setLogs([]);
			setReport(null);
			setAccountAccess([]);
			setPrivacySettings({
				hideStatusViewReceipts: true,
				readReceiptMode: 'on_reply',
			});
			setTabLoading(false);
			setTabError('');
			setSelectedStatus(null);
			setStatuses(statusesCacheRef.current.get(accountId)?.items || []);
			if (statusMediaUrlRef.current) {
				URL.revokeObjectURL(statusMediaUrlRef.current);
				statusMediaUrlRef.current = null;
			}
			setStatusMediaUrl(null);
		}
		if (!isAccountConnected) {
			conversationsCacheRef.current.delete(accountId);
			setConversations([]);
			setConversationPage(1);
			setConversationTotal(0);
			setSyncingInbox(false);
			setSyncProgress(0);
			setStatuses([]);
			setStatusFetchHint(null);
			setSelectedStatus(null);
			statusesCacheRef.current.delete(accountId);
			if (statusMediaUrlRef.current) {
				URL.revokeObjectURL(statusMediaUrlRef.current);
				statusMediaUrlRef.current = null;
			}
			setStatusMediaUrl(null);
			return;
		}
		loadConversations(accountId).catch(() => { });
	}, [accountId, isAccountConnected, loadConversations]);

	useEffect(
		() => () => {
			if (statusMediaUrlRef.current) URL.revokeObjectURL(statusMediaUrlRef.current);
		},
		[],
	);

	useEffect(() => {
		messagesRequestId.current += 1;
		olderRequestId.current += 1;
		loadingOlderRef.current = false;
		setLoadingOlder(false);
		if (!conversationId) {
			setMessages([]);
			setLoadingMessages(false);
			setHasMoreMessages(true);
			setNotes([]);
			setNoteDraft('');
			setShowNotes(false);
			return;
		}
		if (isDemoId(conversationId)) {
			setMessages([]);
			setLoadingMessages(false);
			setHasMoreMessages(false);
			setNotes([]);
			setShowNotes(false);
			demo.markRuntimeRead(selectedDemoRuntimeId);
			return;
		}
		setHasMoreMessages(true);
		loadMessages(conversationId, canUseWhatsApp && !demo.settings.enabled).catch(() => { });
		if (selectedConversationSource === 'real_overlay') {
			demo.markRuntimeRead(selectedDemoRuntimeId);
			demo.markRuntimeRead(conversationId);
		}
	}, [
		conversationId,
		canUseWhatsApp,
		demo.settings.enabled,
		loadMessages,
		selectedDemoRuntimeId,
		selectedConversationSource,
		demo.markRuntimeRead,
	]);

	useEffect(() => {
		const latest = effectiveMessages[effectiveMessages.length - 1];
		if (!latest?.id || latest.id === lastAutoScrolledMessageRef.current) return;
		lastAutoScrolledMessageRef.current = latest.id;
		const box = messageBoxRef.current;
		if (!box || loadingOlder) return;
		const distanceFromBottom =
			box.scrollHeight - box.clientHeight - box.scrollTop;
		const shouldFollowMessage =
			latest.direction === 'outbound' || distanceFromBottom < 180;
		if (!shouldFollowMessage) return;
		requestAnimationFrame(() => {
			const currentBox = messageBoxRef.current;
			if (currentBox) {
				currentBox.scrollTo({
					top: currentBox.scrollHeight,
					behavior: 'smooth',
				});
			}
		});
	}, [effectiveMessages, loadingOlder]);

	const loadNotes = useCallback(async id => {
		if (!id) return;
		setLoadingNotes(true);
		try {
			const { data } = await api.get(`/whatsapp/conversations/${id}/notes`);
			if (conversationIdRef.current !== id) return;
			setNotes(Array.isArray(data) ? data : []);
		} catch {
			if (conversationIdRef.current === id) setNotes([]);
		} finally {
			if (conversationIdRef.current === id) setLoadingNotes(false);
		}
	}, []);

	useEffect(() => {
		if (!conversationId || !showNotes) return;
		loadNotes(conversationId).catch(() => { });
	}, [conversationId, showNotes, loadNotes]);

	const saveNote = async event => {
		event.preventDefault();
		if (demo.settings.enabled || !conversationId || !noteDraft.trim() || savingNote) return;
		const targetConversationId = conversationId;
		const text = noteDraft.trim();
		setSavingNote(true);
		try {
			const { data } = await api.post(`/whatsapp/conversations/${targetConversationId}/notes`, {
				text,
			});
			if (conversationIdRef.current === targetConversationId) {
				setNoteDraft('');
				setNotes(current => [...current, data]);
				toast.success(t.noteSaved);
			}
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not save note');
		} finally {
			setSavingNote(false);
		}
	};

	useEffect(() => {
		conversationIdRef.current = conversationId;
		const socket = socketRef.current;
		if (!socket) return;
		if (watchedConversationRef.current) {
			socket.emit('whatsapp:conversation:unwatch', watchedConversationRef.current);
		}
		watchedConversationRef.current = isDemoId(conversationId) ? null : conversationId;
		if (conversationId && !isDemoId(conversationId)) {
			socket.emit('whatsapp:conversation:watch', conversationId);
		}
	}, [conversationId]);

	useEffect(() => {
		const token = localStorage.getItem('accessToken');
		if (!token) return;
		const socket = io(`${process.env.NEXT_PUBLIC_BASE_URL}/whatsapp`, {
			auth: { token },
			transports: ['websocket', 'polling'],
		});
		socketRef.current = socket;
		const rewatchRooms = () => {
			if (accountId) socket.emit('whatsapp:account:watch', accountId);
			const activeConversationId = conversationIdRef.current;
			if (activeConversationId && !isDemoId(activeConversationId)) {
				watchedConversationRef.current = activeConversationId;
				socket.emit('whatsapp:conversation:watch', activeConversationId);
			}
		};
		rewatchRooms();
		socket.on('connect', rewatchRooms);
		socket.on('whatsapp:event', event => {
			if (event.accountId && event.accountId !== accountId) return;
			const activeConversationId = conversationIdRef.current;
			if (event.event === 'message' && event.conversationId === activeConversationId) {
				setMessages(current => {
					const next = mergeMessages(current, [event.payload]);
					const previous = messagesCacheRef.current.get(activeConversationId);
					messagesCacheRef.current.set(activeConversationId, {
						items: next,
						hasMore: previous?.hasMore ?? true,
						cachedAt: Date.now(),
					});
					return next;
				});
			}
			if (
				event.event === 'message_status' &&
				event.conversationId === activeConversationId
			) {
				setMessages(current => {
					const next = current.map(message =>
						message.id === event.payload.messageId
							? { ...message, status: event.payload.status }
							: message,
					);
					const previous = messagesCacheRef.current.get(activeConversationId);
					messagesCacheRef.current.set(activeConversationId, {
						items: next,
						hasMore: previous?.hasMore ?? true,
						cachedAt: Date.now(),
					});
					return next;
				});
			}
			if (
				event.event === 'message_reactions' &&
				event.conversationId === activeConversationId
			) {
				updateCachedMessage(
					activeConversationId,
					event.payload.messageId || event.payload.providerMessageId,
					message => ({ ...message, reactions: event.payload.reactions || [] }),
				);
			}
			if (
				event.event === 'message_updated' &&
				event.conversationId === activeConversationId
			) {
				updateCachedMessage(
					activeConversationId,
					event.payload.messageId,
					message => ({ ...message, ...(event.payload.changes || {}) }),
				);
			}
			if (
				['conversation_updated', 'conversation_assignment'].includes(event.event) &&
				accountId
			) {
				scheduleReloadConversations(accountId);
			}
			if (event.event === 'conversation_read') {
				setConversationUnreadCount(
					event.conversationId || event.payload?.conversationId,
					0,
				);
			}
			if (event.event === 'statuses_updated' && accountId) {
				void refreshStatusesFromProviderRef.current?.(accountId, {
					silent: true,
					force: true,
				});
			}
			if (event.event === 'qr') setQr(event.payload.qr);
			if (event.event === 'sync_started') {
				setSyncingInbox(true);
				setSyncProgress(Number(event.payload?.progress) || 10);
			}
			if (event.event === 'sync_progress') {
				setSyncingInbox(true);
				setSyncProgress(prev =>
					Math.max(prev, Number(event.payload?.progress) || prev || 20),
				);
			}
			if (['sync_completed', 'sync_failed'].includes(event.event)) {
				setSyncingInbox(false);
				setSyncProgress(event.event === 'sync_completed' ? 100 : 0);
				if (accountId) {
					loadConversations(accountId, 1, false, { force: true }).catch(() => { });
				}
				if (event.event === 'sync_failed') {
					toast.error(event.payload?.message || 'WhatsApp sync failed');
				}
			}
			if (['connection', 'connection_error'].includes(event.event)) {
				const status = event.payload?.status || event.payload?.event?.status;
				if (status === 'connected') {
					setQr(null);
				}
				loadAccounts().catch(() => { });
				if (status === 'connected' && accountId) {
					loadConversations(accountId, 1, false, { force: true }).catch(() => { });
				}
			}
		});
		return () => {
			if (reloadConversationsTimer.current) clearTimeout(reloadConversationsTimer.current);
			socketRef.current = null;
			watchedConversationRef.current = null;
			socket.disconnect();
		};
	}, [
		accountId,
		loadAccounts,
		loadConversations,
		scheduleReloadConversations,
		setConversationUnreadCount,
		updateCachedMessage,
	]);

	useEffect(() => {
		if (!selectedAccount || !['connecting', 'qr_pending'].includes(selectedAccount.status)) {
			return;
		}
		const poll = setInterval(async () => {
			try {
				const { data } = await api.get(`/whatsapp/accounts/${selectedAccount.id}/qr`);
				setQr(data.qr || null);
				await loadAccounts();
			} catch { }
		}, 2500);
		return () => clearInterval(poll);
	}, [selectedAccount, loadAccounts]);

	const createAccount = async event => {
		event.preventDefault();
		if (!newAccountName.trim()) return;
		setAccountBusy(true);
		try {
			const { data } = await api.post('/whatsapp/accounts', {
				label: newAccountName.trim(),
			});
			setNewAccountName('');
			await loadAccounts();
			setAccountId(data.id);
			toast.success('WhatsApp account created');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not create account');
		} finally {
			setAccountBusy(false);
		}
	};

	const connectAccount = async () => {
		if (!accountId) return;
		if (['connecting', 'qr_pending', 'connected'].includes(selectedAccount?.status)) {
			if (selectedAccount?.status === 'connected') return;
			toast.success(t.sessionLinkedHint);
			return;
		}
		setAccountBusy(true);
		try {
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/connect`);
			setQr(data.qr || null);
			await loadAccounts();
			if (data.status === 'connected') {
				toast.success(t.connectStarted);
			} else if (data.qr) {
				toast.success(t.qrPending || 'Scan the QR code');
			} else {
				toast.success(t.connectStillSyncing || t.syncingPhone);
			}
		} catch (error) {
			toast.error(
				error.code === 'ECONNABORTED'
					? t.syncingPhone
					: error.response?.data?.message || 'Could not start WhatsApp provider',
			);
			await loadAccounts().catch(() => { });
		} finally {
			setAccountBusy(false);
		}
	};

	const disconnectAccount = async logout => {
		if (!accountId) return;
		setAccountBusy(true);
		try {
			await api.post(`/whatsapp/accounts/${accountId}/${logout ? 'logout' : 'disconnect'}`);
			setQr(null);
			await loadAccounts();
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
				(logout ? 'Could not log out WhatsApp' : 'Could not disconnect WhatsApp'),
			);
		} finally {
			setAccountBusy(false);
		}
	};

	const resetAccountData = async () => {
		if (!accountId || !selectedAccount || accountBusy) return;
		const targetAccountId = accountId;
		const confirmed = window.confirm(
			t.resetSessionConfirm.replace('{name}', selectedAccount.label || t.accounts),
		);
		if (!confirmed) return;
		setAccountBusy(true);
		setSyncingInbox(true);
		setSyncProgress(10);
		try {
			await api.post(`/whatsapp/accounts/${targetAccountId}/reset-data`);
			conversationsCacheRef.current.delete(targetAccountId);
			statusesCacheRef.current.delete(targetAccountId);
			messagesCacheRef.current.clear();
			setConversationId(null);
			setConversations([]);
			setConversationPage(1);
			setConversationTotal(0);
			setMessages([]);
			setStatuses([]);
			setSelectedStatus(null);
			setGroups([]);
			setSelectedGroup(null);
			setLogs([]);
			setReport(null);
			if (statusMediaUrlRef.current) {
				URL.revokeObjectURL(statusMediaUrlRef.current);
				statusMediaUrlRef.current = null;
			}
			setStatusMediaUrl(null);
			setQr(null);
			setSyncProgress(35);
			await api.post(`/whatsapp/accounts/${targetAccountId}/sync/chats`);
			setSyncProgress(90);
			await loadConversations(targetAccountId, 1, false, { force: true });
			setSyncProgress(100);
			void api
				.post(`/whatsapp/accounts/${targetAccountId}/sync/contacts`)
				.catch(() => null);
			void loadStatuses(targetAccountId, { force: true, silent: true });
			await loadAccounts();
			toast.success(t.sessionResetStarted);
		} catch (error) {
			setSyncProgress(0);
			toast.error(error.response?.data?.message || 'Could not reset and resync WhatsApp data');
			await loadAccounts().catch(() => { });
		} finally {
			setSyncingInbox(false);
			setAccountBusy(false);
		}
	};

	const deleteAccount = async () => {
		if (!accountId || !selectedAccount || accountBusy) return;
		const targetAccountId = accountId;
		const confirmed = window.confirm(
			t.deleteAccountConfirm.replace('{name}', selectedAccount.label || t.accounts),
		);
		if (!confirmed) return;
		setAccountBusy(true);
		try {
			await api.delete(`/whatsapp/accounts/${targetAccountId}`);
			conversationsCacheRef.current.delete(targetAccountId);
			statusesCacheRef.current.delete(targetAccountId);
			messagesCacheRef.current.clear();
			if (statusMediaUrlRef.current) {
				URL.revokeObjectURL(statusMediaUrlRef.current);
				statusMediaUrlRef.current = null;
			}
			accountIdRef.current = null;
			setAccountId(null);
			setConversationId(null);
			setConversations([]);
			setMessages([]);
			setStatuses([]);
			setSelectedStatus(null);
			setStatusMediaUrl(null);
			setQr(null);
			await loadAccounts();
			toast.success(t.accountDeleted);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not delete WhatsApp account');
		} finally {
			setAccountBusy(false);
		}
	};

	const syncAccount = async (silent = false) => {
		if (!accountId) return;
		if (!silent) setAccountBusy(true);
		setSyncingInbox(true);
		setSyncProgress(15);
		try {
			// Chats first — this is what fixes inbox order. Contacts are optional/heavy.
			setSyncProgress(35);
			await api.post(`/whatsapp/accounts/${accountId}/sync/chats`);
			setSyncProgress(90);
			await loadConversations(accountId, 1, false, { force: true });
			setSyncProgress(100);
			void api.post(`/whatsapp/accounts/${accountId}/sync/contacts`).catch(() => null);
			if (!silent) toast.success('WhatsApp data synchronized');
		} catch (error) {
			setSyncProgress(0);
			if (!silent) toast.error(error.response?.data?.message || 'Synchronization failed');
			await loadAccounts().catch(() => { });
		} finally {
			setSyncingInbox(false);
			if (!silent) setAccountBusy(false);
		}
	};

	useEffect(() => {
		if (activeTab !== 'chats' || !accountId || !selectedAccount) return;
		if (selectedAccount.status !== 'connected') return;
		if (!canUseWhatsApp) return;
		if (conversations.length > 0 || syncingInbox || accountBusy) return;
		syncAccount(true).catch(() => { });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, accountId, selectedAccount?.status, conversations.length, canUseWhatsApp]);

	// Keep story rings fresh in both the chat list and the statuses tab.
	useEffect(() => {
		if (!['chats', 'statuses'].includes(activeTab) || !accountId || !isAccountConnected) {
			return undefined;
		}
		const poll = setInterval(() => {
			void refreshStatusesFromProviderRef.current?.(accountId, { silent: true });
		}, STATUSES_CACHE_TTL);
		return () => clearInterval(poll);
	}, [activeTab, accountId, isAccountConnected]);

	useEffect(() => {
		if (!['chats', 'statuses'].includes(activeTab) || !accountId || !isAccountConnected) return;
		void loadStatuses(accountId, { silent: true });
	}, [activeTab, accountId, isAccountConnected, loadStatuses]);

	// Clear a stuck sync bar if backend never finishes.
	useEffect(() => {
		if (!syncingInbox) return undefined;
		const timer = setTimeout(() => {
			setSyncingInbox(false);
			setSyncProgress(0);
		}, 120000);
		return () => clearTimeout(timer);
	}, [syncingInbox]);

	const sendMessage = async event => {
		event.preventDefault();
		if (!conversationId || !draft.trim() || sending) return;
		const targetConversationId = conversationId;
		const text = draft.trim();
		const replySnapshot = replyingTo;
		if (demo.settings.enabled) {
			setSending(true);
			try {
				await routeMessageCommand({
					demoEnabled: true,
					conversation: selectedConversation,
					demoCommand: ({ conversationId: demoConversationId }) =>
						demo.createMessage(demoConversationId, {
							type: 'text',
							text,
							direction: 'outbound',
							status: 'sent',
							timestamp: new Date().toISOString(),
							showReadReceipt: true,
							replyToId: replySnapshot?.id,
						}),
				});
				if (conversationIdRef.current === targetConversationId) {
					setDraft('');
					setReplyingTo(null);
				}
			} catch (error) {
				toast.error(
					error.response?.data?.message ||
					error.message ||
					'Demo Mode blocked this message.',
				);
			} finally {
				setSending(false);
			}
			return;
		}
		const clientMessageId = newClientMessageId();
		const optimisticMessage = {
			id: `pending:${clientMessageId}`,
			clientMessageId,
			type: 'text',
			text,
			direction: 'outbound',
			status: 'pending',
			providerTimestamp: new Date().toISOString(),
			created_at: new Date().toISOString(),
			optimistic: true,
			quotedProviderMessageId: replySnapshot?.providerMessageId || null,
			replyTo: replySnapshot || null,
		};
		setDraft('');
		setReplyingTo(null);
		setSending(true);
		const previous = messagesCacheRef.current.get(targetConversationId);
		messagesCacheRef.current.set(targetConversationId, {
			items: mergeMessages(previous?.items || [], [optimisticMessage]),
			hasMore: previous?.hasMore ?? true,
			cachedAt: Date.now(),
		});
		if (conversationIdRef.current === targetConversationId) {
			setMessages(current => mergeMessages(current, [optimisticMessage]));
		}
		try {
			const { data } = await api.post(`/whatsapp/conversations/${targetConversationId}/messages`, {
				type: 'text',
				text,
				clientMessageId,
				quotedProviderMessageId: replySnapshot?.providerMessageId || undefined,
			});
			const confirmedMessage = {
				...data.message,
				replyTo: data.message?.replyTo || replySnapshot || null,
			};
			const currentCache = messagesCacheRef.current.get(targetConversationId);
			const withoutOptimistic = (currentCache?.items || []).filter(
				message => message.id !== optimisticMessage.id,
			);
			const cachedMessages = mergeMessages(withoutOptimistic, [confirmedMessage]);
			messagesCacheRef.current.set(targetConversationId, {
				items: cachedMessages,
				hasMore: currentCache?.hasMore ?? true,
				cachedAt: Date.now(),
			});
			if (conversationIdRef.current === targetConversationId) {
				setMessages(current =>
					mergeMessages(
						current.filter(message => message.id !== optimisticMessage.id),
						[confirmedMessage],
					),
				);
			}
		} catch (error) {
			const currentCache = messagesCacheRef.current.get(targetConversationId);
			if (currentCache) {
				messagesCacheRef.current.set(targetConversationId, {
					...currentCache,
					items: currentCache.items.filter(message => message.id !== optimisticMessage.id),
					cachedAt: Date.now(),
				});
			}
			if (conversationIdRef.current === targetConversationId) {
				setMessages(current =>
					current.filter(message => message.id !== optimisticMessage.id),
				);
				setDraft(current => current || text);
				setReplyingTo(current => current || replySnapshot);
			}
			toast.error(error.response?.data?.message || 'Message failed');
		} finally {
			setSending(false);
		}
	};

	const sendFile = async (file, forcedType) => {
		if (!file || !conversationId || !accountId) return;
		if (demo.settings.enabled) {
			toast.error(
				locale === 'ar'
					? 'الوسائط التجريبية مؤجلة حالياً. لم يتم إرسال أي شيء إلى واتساب.'
					: 'Demo media is deferred. Nothing was sent to WhatsApp.',
			);
			if (fileRef.current) fileRef.current.value = '';
			return;
		}
		if (file.size > 25 * 1024 * 1024) {
			toast.error('File size must not exceed 25 MB');
			if (fileRef.current) fileRef.current.value = '';
			return;
		}
		const targetConversationId = conversationId;
		const targetAccountId = accountId;
		const caption = draft.trim();
		const replySnapshot = replyingTo;
		let uploadedFileId = null;
		setSending(true);
		try {
			const form = new FormData();
			form.append('file', file);
			const { data: uploaded } = await api.post(
				`/whatsapp/accounts/${targetAccountId}/media`,
				form,
			);
			uploadedFileId = uploaded.fileId;
			const type =
				forcedType ||
				(file.type.startsWith('image/')
					? 'image'
					: file.type.startsWith('video/')
						? 'video'
						: file.type.startsWith('audio/')
							? 'audio'
							: 'document');
			const { data } = await api.post(`/whatsapp/conversations/${targetConversationId}/messages`, {
				type,
				fileId: uploaded.fileId,
				caption: caption || undefined,
				clientMessageId: newClientMessageId(),
				quotedProviderMessageId: replySnapshot?.providerMessageId || undefined,
			});
			uploadedFileId = null;
			const confirmedMessage = {
				...data.message,
				replyTo: data.message?.replyTo || replySnapshot || null,
			};
			const previous = messagesCacheRef.current.get(targetConversationId);
			const cachedMessages = mergeMessages(previous?.items || [], [confirmedMessage]);
			messagesCacheRef.current.set(targetConversationId, {
				items: cachedMessages,
				hasMore: previous?.hasMore ?? true,
				cachedAt: Date.now(),
			});
			if (conversationIdRef.current === targetConversationId) {
				setDraft(current => (current.trim() === caption ? '' : current));
				setReplyingTo(null);
				setMessages(current => mergeMessages(current, [confirmedMessage]));
			}
		} catch (error) {
			if (uploadedFileId) {
				void api
					.delete(`/whatsapp/accounts/${targetAccountId}/media`, {
						data: { fileId: uploadedFileId },
					})
					.catch(() => { });
			}
			toast.error(error.response?.data?.message || 'Media message failed');
		} finally {
			setSending(false);
			if (fileRef.current) fileRef.current.value = '';
		}
	};

	const reactToMessage = async (message, emoji) => {
		if (
			!conversationId ||
			!message?.id ||
			message.optimistic ||
			reactingMessageIds.has(message.id)
		) {
			return;
		}
		if (demo.settings.enabled) {
			toast.error(locale === 'ar' ? 'التفاعلات التجريبية غير متاحة هنا' : 'Demo reactions are not available here');
			return;
		}
		const targetConversationId = conversationId;
		const previousReactions = Array.isArray(message.reactions) ? message.reactions : [];
		const existingOwn = previousReactions.find(reaction => reaction.actorKey === 'me');
		const nextEmoji = existingOwn?.emoji === emoji ? '' : emoji;
		const optimisticReactions = [
			...previousReactions.filter(reaction => reaction.actorKey !== 'me'),
			...(nextEmoji
				? [{ id: `pending-reaction:${message.id}`, actorKey: 'me', emoji: nextEmoji }]
				: []),
		];
		setReactionPickerMessageId(null);
		setReactingMessageIds(current => new Set(current).add(message.id));
		updateCachedMessage(targetConversationId, message.id, current => ({
			...current,
			reactions: optimisticReactions,
		}));
		try {
			const { data } = await api.put(
				`/whatsapp/conversations/${targetConversationId}/messages/${message.id}/reaction`,
				{ emoji: nextEmoji || undefined },
			);
			updateCachedMessage(targetConversationId, message.id, current => ({
				...current,
				reactions: data.reactions || [],
			}));
		} catch (error) {
			updateCachedMessage(targetConversationId, message.id, current => ({
				...current,
				reactions: previousReactions,
			}));
			toast.error(error.response?.data?.message || 'Could not react to message');
		} finally {
			setReactingMessageIds(current => {
				const next = new Set(current);
				next.delete(message.id);
				return next;
			});
		}
	};

	const markMessageActionPending = (messageId, pending) => {
		setPendingMessageActions(current => {
			const next = new Set(current);
			if (pending) next.add(messageId);
			else next.delete(messageId);
			return next;
		});
	};

	const handleMessageAction = async (message, action) => {
		if (!message || message.optimistic) return;
		setActionMessageId(null);
		setActionMessageAnchor(null);
		if (action === 'reply') {
			setReplyingTo({
				id: message.id,
				providerMessageId: message.providerMessageId,
				text: message.text,
				type: message.type,
				direction: message.direction,
			});
			return;
		}
		if (action === 'react') {
			setReactionPickerMessageId(message.id);
			return;
		}
		if (action === 'forward') {
			setForwardingMessage(message);
			return;
		}
		if (action === 'delete') {
			setDeleteMessageTarget(message);
			return;
		}
		if (action === 'transcribe') {
			setTranscriptionMessage(message);
			return;
		}
		if (demo.settings.enabled) {
			toast.error(locale === 'ar' ? 'هذا الإجراء غير متاح في الوضع التجريبي' : 'This action is unavailable in demo mode');
			return;
		}
		if (action === 'info') {
			setMessageInfo({ loading: true, message });
			setLoadingMessageInfo(true);
			try {
				const { data } = await api.get(
					`/whatsapp/conversations/${conversationId}/messages/${message.id}/info`,
				);
				setMessageInfo({ ...data, message });
			} catch (error) {
				setMessageInfo(null);
				toast.error(error.response?.data?.message || 'Could not load message info');
			} finally {
				setLoadingMessageInfo(false);
			}
			return;
		}
		if (!['star', 'pin'].includes(action)) return;
		const field = action === 'star' ? 'isStarred' : 'isPinned';
		const enabled = !message[field];
		markMessageActionPending(message.id, true);
		updateCachedMessage(conversationId, message.id, current => ({ ...current, [field]: enabled }));
		try {
			const { data } = await api.put(
				`/whatsapp/conversations/${conversationId}/messages/${message.id}/${action}`,
				{ enabled },
			);
			updateCachedMessage(conversationId, message.id, current => ({
				...current,
				...(data.changes || { [field]: enabled }),
			}));
		} catch (error) {
			updateCachedMessage(conversationId, message.id, current => ({ ...current, [field]: message[field] }));
			toast.error(error.response?.data?.message || `Could not ${action} message`);
		} finally {
			markMessageActionPending(message.id, false);
		}
	};

	const forwardSelectedMessage = async targetConversationId => {
		const message = forwardingMessage;
		if (!message || !targetConversationId || pendingMessageActions.has(message.id)) return;
		markMessageActionPending(message.id, true);
		try {
			await api.post(
				`/whatsapp/conversations/${conversationId}/messages/${message.id}/forward`,
				{ targetConversationId },
			);
			setForwardingMessage(null);
			toast.success(locale === 'ar' ? 'تمت إعادة توجيه الرسالة' : 'Message forwarded');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not forward message');
		} finally {
			markMessageActionPending(message.id, false);
		}
	};

	const deleteSelectedMessage = async mode => {
		const message = deleteMessageTarget;
		if (!message || pendingMessageActions.has(message.id)) return;
		if (demo.settings.enabled) {
			toast.error(locale === 'ar' ? 'الحذف غير متاح في الوضع التجريبي' : 'Delete is unavailable in demo mode');
			return;
		}
		markMessageActionPending(message.id, true);
		try {
			const { data } = await api.delete(
				`/whatsapp/conversations/${conversationId}/messages/${message.id}`,
				{ data: { mode } },
			);
			updateCachedMessage(conversationId, message.id, current => ({
				...current,
				...(data.changes || { deletedMode: mode, text: null }),
			}));
			setDeleteMessageTarget(null);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not delete message');
		} finally {
			markMessageActionPending(message.id, false);
		}
	};

	const loadSelectedTranscriptionFile = useCallback(async () => {
		const attachment = transcriptionMessage?.attachments?.find(item =>
			['audio', 'ptt', 'voice'].includes(String(item.type || transcriptionMessage?.type || '').toLowerCase()),
		);
		if (!attachment) throw new Error('Voice message is unavailable');
		const demoAttachment = Boolean(attachment.demoAttachment || isDemoId(attachment.id));
		const blob = demoAttachment
			? await demoApi.getMedia(rawDemoId(attachment.id))
			: (
					await api.get(`/whatsapp/attachments/${attachment.id}/content`, {
						responseType: 'blob',
					})
				).data;
		return createTranscriptionFile(
			blob,
			attachment.fileName,
			attachment.id,
			attachment.mimeType,
		);
	}, [transcriptionMessage]);

	const startMessageLongPress = (event, message) => {
		if (typeof window === 'undefined' || window.innerWidth > 768) return;
		if (event.target.closest('button, a, audio, input, textarea, [role="button"]')) return;
		clearTimeout(longPressTimerRef.current);
		const anchorRect = event.currentTarget.getBoundingClientRect();
		longPressOriginRef.current = { x: event.clientX, y: event.clientY };
		longPressTimerRef.current = setTimeout(() => {
			if (navigator.vibrate) navigator.vibrate(15);
			setReactionPickerMessageId(null);
			setActionMessageAnchor(anchorRect);
			setActionMessageId(message.id);
		}, 500);
	};
	const cancelMessageLongPress = event => {
		const origin = longPressOriginRef.current;
		if (
			event?.type === 'pointermove' &&
			origin &&
			Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 8
		) {
			return;
		}
		clearTimeout(longPressTimerRef.current);
		longPressTimerRef.current = null;
		longPressOriginRef.current = null;
	};

	const openComposerFilePicker = ({ accept, capture } = {}) => {
		const input = fileRef.current;
		if (!input) return;
		input.setAttribute('accept', accept || 'image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/ogg,audio/mp4,audio/webm,application/pdf,.doc,.docx,.xls,.xlsx');
		if (capture) input.setAttribute('capture', capture);
		else input.removeAttribute('capture');
		input.click();
	};

	const handleAttachmentAction = action => {
		setAttachmentSheetOpen(false);
		if (action === 'photos') return openComposerFilePicker({ accept: 'image/*,video/*' });
		if (action === 'camera') return openComposerFilePicker({ accept: 'image/*', capture: 'environment' });
		if (action === 'document') return openComposerFilePicker({ accept: 'application/pdf,.doc,.docx,.xls,.xlsx,.txt' });
		if (action === 'location') {
			if (!navigator.geolocation) return toast.error('Location is not available');
			navigator.geolocation.getCurrentPosition(
				position => setDraft(`https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`),
				() => toast.error('Could not access your location'),
			);
			return;
		}
		setDraft(current => current || (action === 'contact' ? 'Contact: ' : 'Poll: '));
	};

	const stopVoiceRecording = (send = true) => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === 'inactive') return;
		discardRecordingRef.current = !send;
		recorder.stop();
	};

	const startVoiceRecording = async () => {
		if (!conversationId || sending || recordingVoice) return;
		setAttachmentSheetOpen(false);
		setStickerPanelOpen(false);
		if (demo.settings.enabled) {
			toast.error(
				locale === 'ar'
					? 'الصوت التجريبي مؤجل حالياً. لم يتم إرسال أي شيء إلى واتساب.'
					: 'Demo voice messages are deferred. Nothing was sent to WhatsApp.',
			);
			return;
		}
		if (
			typeof navigator === 'undefined' ||
			!navigator.mediaDevices?.getUserMedia ||
			typeof MediaRecorder === 'undefined'
		) {
			toast.error(t.recordingUnsupported);
			return;
		}
		let stream = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const supportedTypes = [
				'audio/webm;codecs=opus',
				'audio/ogg;codecs=opus',
				'audio/webm',
			];
			const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
			const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
			recordingStreamRef.current = stream;
			mediaRecorderRef.current = recorder;
			recordingChunksRef.current = [];
			discardRecordingRef.current = false;
			recordingSecondsRef.current = 0;
			setRecordingSeconds(0);
			setRecordingVoice(true);

			recorder.ondataavailable = event => {
				if (event.data?.size) recordingChunksRef.current.push(event.data);
			};
			recorder.onerror = () => {
				discardRecordingRef.current = true;
				toast.error(t.recordingFailed);
				if (recorder.state !== 'inactive') {
					try {
						recorder.stop();
					} catch {
						stream?.getTracks().forEach(track => track.stop());
					}
				}
			};
			recorder.onstop = () => {
				if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
				recordingTimerRef.current = null;
				recordingStreamRef.current?.getTracks().forEach(track => track.stop());
				recordingStreamRef.current = null;
				mediaRecorderRef.current = null;
				const durationSec = Math.max(1, recordingSecondsRef.current || 1);
				setRecordingVoice(false);
				setRecordingSeconds(0);
				recordingSecondsRef.current = 0;

				const discard = discardRecordingRef.current;
				const chunks = recordingChunksRef.current;
				recordingChunksRef.current = [];
				if (discard || chunks.length === 0) return;

				const recordedType = recorder.mimeType || chunks[0]?.type || 'audio/webm';
				const extension = recordedType.includes('ogg') ? 'ogg' : 'webm';
				const blob = new Blob(chunks, { type: recordedType.split(';')[0] || recordedType });
				if (!blob.size) return;
				// Encode length in the name so the bubble can show duration even when
				// the browser reports Infinity/NaN for webm metadata.
				const file = new File([blob], `voice-${durationSec}s.${extension}`, {
					type: recordedType.split(';')[0] || recordedType,
				});
				void sendFile(file, 'voice');
			};

			recorder.start(250);
			recordingTimerRef.current = setInterval(() => {
				recordingSecondsRef.current += 1;
				const next = recordingSecondsRef.current;
				setRecordingSeconds(next);
				if (next >= 299 && recorder.state !== 'inactive') {
					discardRecordingRef.current = false;
					recorder.stop();
				}
			}, 1000);
		} catch (error) {
			stream?.getTracks().forEach(track => track.stop());
			recordingStreamRef.current?.getTracks().forEach(track => track.stop());
			recordingStreamRef.current = null;
			mediaRecorderRef.current = null;
			recordingChunksRef.current = [];
			setRecordingVoice(false);
			const permissionDenied = ['NotAllowedError', 'SecurityError'].includes(error?.name);
			const microphoneUnavailable = ['NotFoundError', 'DevicesNotFoundError'].includes(
				error?.name,
			);
			toast.error(
				permissionDenied
					? t.microphoneDenied
					: microphoneUnavailable
						? t.microphoneUnavailable
						: t.recordingStartFailed,
			);
		}
	};

	useEffect(() => {
		return () => {
			discardRecordingRef.current = true;
			if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
			if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
			recordingStreamRef.current?.getTracks().forEach(track => track.stop());
		};
	}, []);

	useEffect(() => {
		if (recordingVoice) stopVoiceRecording(false);
		// Stop and discard if the operator switches conversations.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId]);

	const loadOlder = async () => {
		if (
			!conversationId ||
			isDemoId(conversationId) ||
			loadingOlderRef.current ||
			loadingOlder ||
			!hasMoreMessages
		) {
			return;
		}
		const targetConversationId = conversationId;
		const requestId = ++olderRequestId.current;
		const box = messageBoxRef.current;
		const previousHeight = box?.scrollHeight || 0;
		loadingOlderRef.current = true;
		setLoadingOlder(true);
		const oldest = messages[0];
		try {
			const requests = [
				api.get(`/whatsapp/conversations/${targetConversationId}/messages`, {
					params: { before: oldest?.id, limit: MESSAGE_PAGE_SIZE },
				}),
			];
			if (canUseWhatsApp && !demo.settings.enabled) {
				requests.push(
					api.post(`/whatsapp/conversations/${targetConversationId}/sync/older`, null, {
						params: { limit: MESSAGE_PAGE_SIZE },
					}),
				);
			}
			const responses = await Promise.allSettled(requests);
			if (
				requestId !== olderRequestId.current ||
				conversationIdRef.current !== targetConversationId
			) {
				return;
			}
			const local =
				responses[0]?.status === 'fulfilled'
					? responses[0].value?.data || []
					: [];
			const provider =
				responses[1]?.status === 'fulfilled'
					? responses[1].value?.data
					: null;
			if (!local.length && !provider?.items?.length) {
				const failure = responses.find(result => result.status === 'rejected');
				if (failure?.status === 'rejected') throw failure.reason;
			}
			const incoming = [...local, ...(provider?.items || [])];
			const hasMore =
				typeof provider?.hasMore === 'boolean'
					? provider.hasMore
					: local.length >= MESSAGE_PAGE_SIZE;
			setHasMoreMessages(hasMore);
			setMessages(current => {
				const next = mergeMessages(incoming, current);
				messagesCacheRef.current.set(targetConversationId, {
					items: next,
					hasMore,
					cachedAt: Date.now(),
				});
				return next;
			});
			requestAnimationFrame(() => {
				const currentBox = messageBoxRef.current;
				if (currentBox) currentBox.scrollTop += currentBox.scrollHeight - previousHeight;
			});
		} catch (error) {
			if (conversationIdRef.current === targetConversationId) {
				toast.error(error.response?.data?.message || 'Could not load older messages');
			}
		} finally {
			if (requestId === olderRequestId.current) {
				loadingOlderRef.current = false;
				setLoadingOlder(false);
			}
		}
	};

	const assignConversationTarget = async (targetConversationId, userId) => {
		if (
			demo.settings.enabled ||
			!targetConversationId ||
			isDemoId(targetConversationId)
		) return;
		try {
			await api.put(`/whatsapp/conversations/${targetConversationId}/assignment`, {
				userId: userId || null,
			});
			await loadConversations(accountId);
			toast.success(userId ? 'Conversation assigned' : 'Conversation unassigned');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Assignment failed');
		}
	};
	const assignConversation = userId => assignConversationTarget(conversationId, userId);

	const toggleConversationFavorite = async (conversation, event) => {
		event?.stopPropagation?.();
		if (demo.settings.enabled || !conversation?.id || isDemoId(conversation.id)) return;
		const actionKey = `favorite:${conversation.id}`;
		if (pendingPreferenceActions.has(actionKey)) return;
		const previousFavorite = Boolean(conversation.isFavorite);
		const nextFavorite = !conversation.isFavorite;
		const previousIndex = conversations.findIndex(item => item.id === conversation.id);
		setPendingPreferenceActions(current => new Set(current).add(actionKey));
		setConversations(current =>
			current
				.map(item =>
					item.id === conversation.id ? { ...item, isFavorite: nextFavorite } : item,
				)
				.filter(
					item =>
						conversationFilter !== 'favorites' ||
						item.id !== conversation.id ||
						nextFavorite,
				),
		);
		try {
			await api.put(`/whatsapp/conversations/${conversation.id}/favorite`, {
				isFavorite: nextFavorite,
			});
			const cached = accountId
				? conversationsCacheRef.current.get(accountId)
				: null;
			if (cached) {
				conversationsCacheRef.current.set(accountId, {
					...cached,
					items: cached.items.map(item =>
						item.id === conversation.id ? { ...item, isFavorite: nextFavorite } : item,
					),
					cachedAt: Date.now(),
				});
			}
			toast.success(t.favoriteUpdated);
		} catch (error) {
			setConversations(current => {
				if (current.some(item => item.id === conversation.id)) {
					return current.map(item =>
						item.id === conversation.id
							? { ...item, isFavorite: previousFavorite }
							: item,
					);
				}
				const restored = [...current];
				restored.splice(
					Math.min(Math.max(previousIndex, 0), restored.length),
					0,
					{ ...conversation, isFavorite: previousFavorite },
				);
				return restored;
			});
			toast.error(error.response?.data?.message || 'Could not update favorite');
		} finally {
			setPendingPreferenceActions(current => {
				const next = new Set(current);
				next.delete(actionKey);
				return next;
			});
		}
	};

	const toggleConversationPinned = async (conversation, event) => {
		event?.stopPropagation?.();
		if (demo.settings.enabled || !conversation?.id || isDemoId(conversation.id)) return;
		const actionKey = `pin:${conversation.id}`;
		if (pendingPreferenceActions.has(actionKey)) return;
		const previousPinned = Boolean(conversation.isPinned);
		const nextPinned = !conversation.isPinned;
		setPendingPreferenceActions(current => new Set(current).add(actionKey));
		setConversations(current =>
			current.map(item =>
				item.id === conversation.id ? { ...item, isPinned: nextPinned } : item,
			),
		);
		try {
			await api.put(`/whatsapp/conversations/${conversation.id}/pin`, {
				isPinned: nextPinned,
			});
			const cached = accountId
				? conversationsCacheRef.current.get(accountId)
				: null;
			if (cached) {
				conversationsCacheRef.current.set(accountId, {
					...cached,
					items: cached.items.map(item =>
						item.id === conversation.id ? { ...item, isPinned: nextPinned } : item,
					),
					cachedAt: Date.now(),
				});
			}
			toast.success(t.pinUpdated);
		} catch (error) {
			setConversations(current =>
				current.map(item =>
					item.id === conversation.id ? { ...item, isPinned: previousPinned } : item,
				),
			);
			toast.error(error.response?.data?.message || 'Could not update pinned chat');
		} finally {
			setPendingPreferenceActions(current => {
				const next = new Set(current);
				next.delete(actionKey);
				return next;
			});
		}
	};

	const closeConversationActions = () => {
		suppressConversationClickRef.current = false;
		setConversationActionTarget(null);
		setConversationActionAnchor(null);
	};

	const startConversationLongPress = (event, conversation) => {
		if (event.target.closest('button, a, input, select')) return;
		clearTimeout(conversationLongPressTimerRef.current);
		const anchorRect = event.currentTarget.getBoundingClientRect();
		conversationLongPressOriginRef.current = {
			x: event.clientX,
			y: event.clientY,
		};
		conversationLongPressTimerRef.current = setTimeout(() => {
			suppressConversationClickRef.current = true;
			if (navigator.vibrate) navigator.vibrate(15);
			setConversationActionAnchor(anchorRect);
			setConversationActionTarget(conversation);
		}, 500);
	};

	const cancelConversationLongPress = event => {
		const origin = conversationLongPressOriginRef.current;
		if (
			event?.type === 'pointermove' &&
			origin &&
			Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 8
		) {
			return;
		}
		clearTimeout(conversationLongPressTimerRef.current);
		conversationLongPressTimerRef.current = null;
		conversationLongPressOriginRef.current = null;
	};

	const handleConversationAction = action => {
		const conversation = conversationActionTarget;
		if (!conversation) return;
		closeConversationActions();
		if (action === 'pin') {
			void toggleConversationPinned(conversation);
		} else if (action === 'favorite') {
			void toggleConversationFavorite(conversation);
		} else if (action === 'assign') {
			setConversationAssignTarget(conversation);
		} else if (action === 'info') {
			setConversationInfoTarget(conversation);
		}
	};

	const publishStory = async event => {
		event.preventDefault();
		if (!accountId || !statusDraft.trim() || publishingStatus || !canUseWhatsApp) return;
		const text = statusDraft.trim();
		setPublishingStatus(true);
		try {
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/statuses`, {
				type: 'text',
				content: text,
			});
			setStatusDraft('');
			if (Array.isArray(data?.items)) {
				applyStatuses(accountId, data);
			} else {
				await refreshStatusesFromProvider(accountId, { silent: true });
			}
			toast.success(t.statusPublished);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not publish story');
		} finally {
			setPublishingStatus(false);
		}
	};

	const loadTabData = async (tab, force = false) => {
		setActiveTab(tab);
		setTabError('');
		if (!accountId) return;
		const targetAccountId = accountId;
		const requestId = ++tabRequestId.current;
		const isCurrentRequest = () =>
			accountIdRef.current === targetAccountId &&
			tabRequestId.current === requestId;
		if (tab === 'statuses') {
			if (!force) return;
			setTabLoading(true);
			setTabError('');
			try {
				const account = accountsRef.current.find(item => item.id === targetAccountId);
				if (account && account.status !== 'connected') {
					if (isCurrentRequest()) {
						setStatuses([]);
						setStatusFetchHint('whatsapp_not_connected');
					}
					return;
				}
				await loadStatuses(targetAccountId, { force: true, silent: false });
			} catch (error) {
				if (isCurrentRequest()) {
					setTabError(error.response?.data?.message || 'Could not load statuses');
					toast.error(error.response?.data?.message || 'Could not load statuses');
				}
			} finally {
				if (isCurrentRequest()) setTabLoading(false);
			}
			return;
		}
		if (tab === 'settings' && !canManageWhatsApp && !isAdmin) return;
		setTabLoading(true);
		setTabError('');
		try {
			if (tab === 'groups') {
				const { data } = await api.get(`/whatsapp/accounts/${targetAccountId}/groups`);
				if (isCurrentRequest()) setGroups(data || []);
			}
			if (tab === 'notifications' || tab === 'calls') {
				const { data } = await api.get(`/whatsapp/accounts/${targetAccountId}/logs`);
				if (isCurrentRequest()) setLogs(data || []);
			}
			if (tab === 'reports') {
				const { data } = await api.get(
					`/whatsapp/accounts/${targetAccountId}/reports/summary`,
				);
				if (isCurrentRequest()) setReport(data);
			}
			if (tab === 'settings') {
				const [accessResponse, privacyResponse] = await Promise.all([
					api.get(`/whatsapp/accounts/${targetAccountId}/access`),
					api.get(`/whatsapp/accounts/${targetAccountId}/privacy`),
				]);
				if (isCurrentRequest()) {
					setAccountAccess(accessResponse.data || []);
					setPrivacySettings(
						privacyResponse.data || {
							hideStatusViewReceipts: true,
							readReceiptMode: 'on_reply',
						},
					);
				}
			}
		} catch (error) {
			if (isCurrentRequest()) {
				setTabError(error.response?.data?.message || 'Could not load section');
				toast.error(error.response?.data?.message || 'Could not load section');
			}
		} finally {
			if (isCurrentRequest()) setTabLoading(false);
		}
	};

	useEffect(() => {
		if (window.matchMedia('(max-width: 768px)').matches) {
			void loadTabData('chats');
		}
		// The mobile workspace opens on the familiar WhatsApp chats screen.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (
			!accountId ||
			!['groups', 'calls', 'notifications', 'reports', 'settings'].includes(activeTab)
		) {
			return;
		}
		void loadTabData(activeTab);
		// Reload account-scoped tab data whenever the selected account changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountId]);

	const openStory = async (status, queue = null, index = 0) => {
		if (!status || !accountId) return;
		const targetAccountId = accountId;
		const requestId = ++storyRequestId.current;
		const playlist = Array.isArray(queue) && queue.length ? queue : [status];
		setStoryQueue(playlist);
		setStoryIndex(index);
		setSelectedStatus(status);
		markStatusesViewed(status.id);
		const statusType = String(status.type || '').toLowerCase();
		const isTextStory = statusType === 'text' || statusType === 'chat';
		setLoadingStory(!isTextStory);
		setStoryPaused(false);
		storyElapsedRef.current = 0;
		setStoryProgress(0);
		setStoryDurationMs(statusType.includes('video') ? 15000 : 5000);
		if (statusMediaUrlRef.current) {
			URL.revokeObjectURL(statusMediaUrlRef.current);
			statusMediaUrlRef.current = null;
		}
		setStatusMediaUrl(null);
		const hideStatusViewReceipts =
			selectedAccount?.privacySettings?.hideStatusViewReceipts ?? true;
		if (!hideStatusViewReceipts) {
			api
				.post(
					`/whatsapp/accounts/${targetAccountId}/statuses/${encodeURIComponent(status.providerStatusId)}/view`,
					{ senderWaId: status.senderWaId || undefined },
				)
				.catch(() => { });
		}
		if (isTextStory) {
			setLoadingStory(false);
			return;
		}
		try {
			const data = await fetchStatusMediaBlob(targetAccountId, status.id);
			if (
				requestId !== storyRequestId.current ||
				accountIdRef.current !== targetAccountId
			) {
				return;
			}
			const objectUrl = URL.createObjectURL(data);
			statusMediaUrlRef.current = objectUrl;
			setStatusMediaUrl(objectUrl);
			if (String(data.type || '').includes('video')) {
				setSelectedStatus(current =>
					current?.id === status.id ? { ...current, type: 'video' } : current,
				);
			}
		} catch (error) {
			if (requestId === storyRequestId.current) {
				setStatusMediaUrl(null);
				const message =
					error.response?.data?.message ||
					(typeof error?.message === 'string' ? error.message : null) ||
					t.mediaUnavailable;
				if (/not found|could not be downloaded|unavailable/i.test(String(message))) {
					setStatuses(current => current.filter(item => item.id !== status.id));
					statusesCacheRef.current.set(targetAccountId, {
						items: (statusesCacheRef.current.get(targetAccountId)?.items || []).filter(
							item => item.id !== status.id,
						),
						cachedAt: Date.now(),
					});
					const remaining = playlist.filter(item => item.id !== status.id);
					if (!remaining.length) {
						closeStory();
					} else {
						const nextIndex = Math.min(index, remaining.length - 1);
						openStory(remaining[nextIndex], remaining, nextIndex);
						return;
					}
				}
				toast.error(message);
			}
		} finally {
			if (requestId === storyRequestId.current) setLoadingStory(false);
		}
	};

	const openStoryGroup = story => {
		if (!story?.items?.length) return;
		const startIndex = Number.isInteger(story.startIndex) ? story.startIndex : 0;
		openStory(story.items[startIndex] || story.items[0], story.items, startIndex);
	};

	const goStory = delta => {
		if (!storyQueue.length) return;
		const next = storyIndex + delta;
		if (next < 0 || next >= storyQueue.length) {
			closeStory();
			return;
		}
		openStory(storyQueue[next], storyQueue, next);
	};

	const closeStory = () => {
		storyRequestId.current += 1;
		setSelectedStatus(null);
		setStoryQueue([]);
		setStoryIndex(0);
		setStatusMediaUrl(null);
		if (statusMediaUrlRef.current) {
			URL.revokeObjectURL(statusMediaUrlRef.current);
			statusMediaUrlRef.current = null;
		}
	};

	useEffect(() => {
		if (!selectedStatus) return undefined;
		const onKeyDown = event => {
			if (event.key === 'Escape') closeStory();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedStatus?.id]);

	useEffect(() => {
		if (!selectedStatus || loadingStory) {
			storyElapsedRef.current = 0;
			setStoryProgress(0);
			return undefined;
		}
		if (storyPaused) return undefined;
		storyStartRef.current = Date.now() - storyElapsedRef.current;
		const id = setInterval(() => {
			const elapsed = Date.now() - storyStartRef.current;
			storyElapsedRef.current = elapsed;
			const pct = Math.min(100, (elapsed / storyDurationMs) * 100);
			if (storyProgressBarRef.current) {
				storyProgressBarRef.current.style.width = `${pct}%`;
			}
			if (pct >= 100) goStory(1);
		}, 50);
		return () => clearInterval(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedStatus?.id, loadingStory, storyDurationMs, storyPaused]);

	const openGroupDetails = async group => {
		if (!accountId || !group?.id) return;
		const requestId = ++groupRequestId.current;
		setSelectedGroup(group);
		setLoadingGroup(true);
		try {
			const { data } = await api.get(
				`/whatsapp/accounts/${accountId}/groups/${group.id}`,
				{ params: { refresh: true } },
			);
			if (requestId !== groupRequestId.current) return;
			setSelectedGroup(data);
			setGroups(current => current.map(item => (item.id === data.id ? data : item)));
		} catch (error) {
			if (requestId === groupRequestId.current) {
				toast.error(error.response?.data?.message || 'Could not load group details');
			}
		} finally {
			if (requestId === groupRequestId.current) setLoadingGroup(false);
		}
	};

	const openGroupChat = group => {
		if (!group?.conversationId) {
			toast.error(t.chatUnavailable);
			return;
		}
		setConversations(current => {
			if (current.some(item => item.id === group.conversationId)) return current;
			return [
				{
					id: group.conversationId,
					accountId,
					groupId: group.id,
					group,
					type: 'group',
					providerChatId: group.waId,
					unreadCount: 0,
				},
				...current,
			];
		});
		setConversationId(group.conversationId);
		setActiveTab('chats');
	};

	const setAccessFlag = (userId, flag, value) => {
		setAccountAccess(current =>
			current.map(row => (row.userId === userId ? { ...row, [flag]: value } : row)),
		);
	};

	const addStaffAccess = user => {
		if (accountAccess.some(row => row.userId === user.id)) return;
		setAccountAccess(current => [
			...current,
			{
				userId: user.id,
				user,
				canView: true,
				canUse: false,
				canManage: false,
				canAssign: false,
				canTransfer: false,
			},
		]);
	};

	const saveAccess = async () => {
		if (!accountId || (!canManageWhatsApp && !isAdmin)) return;
		const targetAccountId = accountId;
		try {
			await api.put(`/whatsapp/accounts/${targetAccountId}/access`, {
				access: accountAccess.map(
					({ userId, canView, canUse, canManage, canAssign, canTransfer }) => ({
						userId,
						canView,
						canUse,
						canManage,
						canAssign,
						canTransfer,
					}),
				),
			});
			toast.success('WhatsApp access updated');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not save access');
		}
	};

	const savePrivacySettings = async () => {
		if (!accountId || (!canManageWhatsApp && !isAdmin)) return;
		const targetAccountId = accountId;
		const targetSettings = privacySettings;
		try {
			const { data } = await api.put(
				`/whatsapp/accounts/${targetAccountId}/privacy`,
				targetSettings,
			);
			if (accountIdRef.current !== targetAccountId) return;
			setPrivacySettings(data);
			setAccounts(current =>
				current.map(account =>
					account.id === targetAccountId
						? { ...account, privacySettings: data }
						: account,
				),
			);
			toast.success(t.privacySaved);
		} catch (error) {
			toast.error(
				error.response?.data?.message || 'Could not save WhatsApp privacy settings',
			);
		}
	};

	const markConversationReadManually = async () => {
		if (demo.settings.enabled || !conversationId || isDemoId(conversationId)) return;
		try {
			const { data } = await api.post(
				`/whatsapp/conversations/${conversationId}/read`,
				null,
				{ params: { manual: true } },
			);
			if (data?.providerReceiptSent) toast.success(t.markedRead);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not send read receipt');
		}
	};

	const accStatus = selectedAccount ? statusMeta(selectedAccount.status, t) : null;

	const reportTotals = report?.totals || {};
	const reportEntries = Object.entries(reportTotals);
	const inboundTotal = reportTotals.inbound || 0;
	const outboundTotal = reportTotals.outbound || 0;
	const failedTotal = reportTotals.failed || 0;
	const messagesTotal = reportTotals.messages ?? inboundTotal + outboundTotal;
	const deliveryTotal = inboundTotal + outboundTotal + failedTotal || 1;
	const otherReportEntries = reportEntries.filter(
		([key]) => !['messages', 'inbound', 'outbound', 'failed'].includes(key.toLowerCase()),
	);

	return (
		<div
			className="wa-mobile-shell relative mx-auto flex h-dvh max-w-[1800px] flex-col overflow-hidden bg-[#0b141a] text-slate-900 min-[769px]:h-[calc(100vh-2rem)] min-[769px]:gap-4 min-[769px]:overflow-visible min-[769px]:bg-transparent dark:text-slate-100"
			style={{
				// Scope this page to WhatsApp's real brand palette — every
				// var(--color-primary-*) / var(--color-secondary-*) /
				// var(--color-gradient-*) reference used across every tab in
				// this file (icons, buttons, borders, badges, active tab bg,
				// GRADIENT/GLOW) resolves from these overrides via the CSS
				// cascade, so this single wrapper re-themes the whole page.
				'--color-primary-50': '#e7f8ec',
				'--color-primary-100': '#c8f0d3',
				'--color-primary-200': '#97e5ac',
				'--color-primary-300': '#5cd980',
				'--color-primary-400': '#25D366',
				'--color-primary-500': '#20BD5C',
				'--color-primary-600': '#128C7E',
				'--color-primary-700': '#0e7566',
				'--color-primary-800': '#0a5c50',
				'--color-primary-900': '#075E54',
				'--color-primary-950': '#043a33',
				'--color-secondary-50': '#e6f7f5',
				'--color-secondary-100': '#c2ede7',
				'--color-secondary-200': '#8bdccf',
				'--color-secondary-300': '#54c9b3',
				'--color-secondary-400': '#25b399',
				'--color-secondary-500': '#128C7E',
				'--color-secondary-600': '#0f7768',
				'--color-secondary-700': '#0c5f54',
				'--color-secondary-800': '#094a41',
				'--color-secondary-900': '#073a33',
				'--color-secondary-950': '#052c27',
				'--color-gradient-from': '#25D366',
				'--color-gradient-via': '#1DA851',
				'--color-gradient-to': '#128C7E',
			}}
		>
			{!(activeTab === 'chats' && conversationId) && (
				<MobileWhatsAppHeader
					title={
						activeTab === 'statuses'
							? t.updates
							: activeTab === 'groups'
								? t.communities
								: t[activeTab] || t.title
					}
					onSearch={() => {
						if (activeTab !== 'chats') void loadTabData('chats');
						setSearchOpen(true);
					}}
					onCamera={() => void loadTabData('statuses')}
					onMore={() => setMobileMenuOpen(current => !current)}
					showTitle={activeTab !== 'chats'}
					scrolled={activeTab === 'chats' && mobileHeaderScrolled}
				/>
			)}
			<MobileOverflowMenu
				open={mobileMenuOpen}
				tabs={availableTabs.filter(([key]) => !['chats', 'statuses', 'groups'].includes(key))}
				labels={t}
				onSelect={tab => void loadTabData(tab)}
				onProfile={() => router.push(`/${locale}/dashboard/profile`)}
				onClose={() => setMobileMenuOpen(false)}
			/>
			<MobileAttachmentSheet
				open={attachmentSheetOpen}
				onClose={() => setAttachmentSheetOpen(false)}
				onAction={handleAttachmentAction}
				locale={locale}
				aiEnabled={
					Boolean(whatsappAi.settings?.enabled) &&
					!demo.settings.enabled &&
					canUseWhatsApp
				}
				aiVisible={aiSuggestionsVisible}
				onToggleAiVisible={() => setAiSuggestionsVisible(current => !current)}
				prompts={
					canManageWhatsApp || isAdmin
						? whatsappAi.settings?.promptPresets || []
						: []
				}
				activePromptId={whatsappAi.settings?.activePromptId}
				promptSaving={whatsappAi.settingsSaving}
				onPromptChange={whatsappAi.selectPrompt}
				suggestionsLoading={whatsappAi.suggestionsLoading}
				onRegenerateSuggestions={whatsappAi.regenerateSuggestions}
			/>
			<MobileStickerPanel open={stickerPanelOpen} onClose={() => setStickerPanelOpen(false)} onInsert={emoji => setDraft(current => `${current}${emoji}`)} />
			{/* Unified header: brand + account switcher + tabs, same PageHeader used across dashboard pages */}
			<div className="hidden shrink-0 min-[769px]:block">
				<PageHeader
					title={t.title}
					desc={t.subtitle}
					icon={MessageCircle}
					tabs={availableTabs.map(([key, Icon]) => ({ id: key, label: t[key], icon: Icon }))}
					activeTab={activeTab}
					onTabChange={key => loadTabData(key)}
					collapsible
					collapseStorageKey="whatsapp-dashboard-header"
					collapseLabel={t.collapseHeader}
					expandLabel={t.expandHeader}
					actions={
						<div className="flex flex-wrap items-center gap-2.5">
							{demo.settings.enabled && !demo.settings.featureFlags.hideDemoBadge && (
								<span className="rounded-[14px] bg-violet-500 px-3.5 py-2.5 text-xs font-black text-white shadow">
									{locale === 'ar' ? 'وضع تجريبي' : 'DEMO MODE'}
								</span>
							)}
							{accounts.length > 0 && (
								<select
									aria-label={t.accounts}
									value={accountId || ''}
									onChange={event => setAccountId(event.target.value)}
									className="h-10 rounded-[14px] border-0 bg-white/[0.16] px-3.5 text-sm font-bold text-white outline-none backdrop-blur-md transition-all focus:bg-white/25"
									style={{ boxShadow: '0 2px 8px -2px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.2) inset' }}
								>
									{accounts.map(account => (
										<option key={account.id} value={account.id} className="text-slate-900">
											{account.label} · {account.status}
										</option>
									))}
								</select>
							)}
							{selectedAccount && accStatus && (
								<span
									className={`flex items-center gap-1.5 rounded-[14px] px-3.5 py-2.5 text-xs font-bold ${accStatus.bg} ${accStatus.text}`}
									style={{ boxShadow: '0 2px 8px -2px rgba(0,0,0,0.12)' }}
								>
									<span className={`h-2 w-2 rounded-full ${accStatus.dot}`} />
									{accStatus.label}
								</span>
							)}
						</div>
					}
				/>
			</div>

			<div className={`min-h-0 flex-1 overflow-y-auto nice-scroll ${activeTab === 'chats' ? 'wa-chat-workspace-scroll' : ''}`}>
				{tabError && activeTab !== 'accounts' && (
					<div
						role="alert"
						className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
					>
						<span>{tabError}</span>
						<button
							type="button"
							onClick={() => loadTabData(activeTab, true)}
							className="shrink-0 rounded-lg border border-current px-3 py-1.5 text-xs font-bold"
						>
							{t.retry}
						</button>
					</div>
				)}
				{activeTab === 'accounts' && bootStatus === 'loading' && (
					<Card className="p-4">
						<TabLoading label={t.loading} />
					</Card>
				)}
				{activeTab === 'accounts' && bootStatus === 'error' && (
					<Card className="p-4">
						<div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
							<AlertTriangle size={28} className="text-rose-500" />
							<p className="font-bold">{t.workspaceLoadFailed}</p>
							<p className="max-w-lg text-xs text-slate-500">{bootError}</p>
							<button
								type="button"
								onClick={reloadWorkspace}
								className="rounded-xl px-4 py-2 text-sm font-bold text-white"
								style={{ background: GRADIENT }}
							>
								{t.retry}
							</button>
						</div>
					</Card>
				)}
				{activeTab === 'accounts' && bootStatus === 'success' && (
					<div className="grid gap-4 min-[769px]:grid-cols-[360px_1fr]">
						<Card className="p-4">
							{isAdmin && (
								<>
									<h2 className="mb-3 flex items-center gap-2 text-sm font-black">
										<Sparkles size={14} className="text-[var(--color-primary-500)]" />
										{t.newAccount}
									</h2>
									<form onSubmit={createAccount} className="flex gap-2">
										<label className="sr-only" htmlFor="whatsapp-account-name">
											{t.accountName}
										</label>
										<input
											id="whatsapp-account-name"
											value={newAccountName}
											onChange={event => setNewAccountName(event.target.value)}
											placeholder={t.accountName}
											className="h-11 flex-1 rounded-xl border border-slate-200 bg-transparent px-3.5 outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700"
										/>
										<button
											type="submit"
											aria-label={t.newAccount}
											disabled={accountBusy}
											className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px disabled:opacity-50"
											style={{ background: GRADIENT, boxShadow: GLOW }}
										>
											{accountBusy ? (
												<Loader2 size={18} className="animate-spin" />
											) : (
												<Plus size={18} />
											)}
										</button>
									</form>
								</>
							)}
							<div className="mt-5 space-y-2">
								{accounts.map(account => {
									const meta = statusMeta(account.status, t);
									const active = account.id === accountId;
									return (
										<button
											key={account.id}
											onClick={() => setAccountId(account.id)}
											className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all ${active
												? 'border-[var(--color-primary-300)] bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] dark:border-[var(--color-primary-700)] dark:from-slate-800 dark:to-slate-800'
												: 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
												}`}
										>
											<Avatar label={account.label} size={10} />
											<div className="min-w-0 flex-1">
												<p className="truncate font-bold">{account.label}</p>
												<p className="truncate text-xs text-slate-500">{account.phoneNumber || account.providerName}</p>
											</div>
											<span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${meta.bg} ${meta.text}`}>
												<span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
												{meta.label}
											</span>
										</button>
									);
								})}
							</div>
						</Card>
						<Card className="overflow-hidden p-0">
							{!selectedAccount ? (
								<div className="p-5">
									<Empty icon={Smartphone} title={t.noAccounts} hint={t.noAccountsHint} />
								</div>
							) : (
								<div>
									<div
										className="relative overflow-hidden p-5"
										style={{ background: statusGradient(selectedAccount.status) }}
									>
										<div
											className="pointer-events-none absolute inset-0 opacity-[0.06]"
											style={{
												backgroundImage:
													'repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(255,255,255,1) 31px,rgba(255,255,255,1) 32px), repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,1) 31px,rgba(255,255,255,1) 32px)',
											}}
										/>
										<div className="relative flex flex-wrap items-center justify-between gap-4">
											<div className="flex items-center gap-3">
												<Avatar label={selectedAccount.label} size={13} className="ring-4 ring-white/25" />
												<div>
													<div className="flex items-center gap-2">
														<h2 className="text-xl font-black text-white">{selectedAccount.label}</h2>
														{selectedAccount.status === 'connected' && (
															<span className="relative flex h-1.5 w-1.5">
																<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
																<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
															</span>
														)}
													</div>
													<p className="text-sm text-white/70">
														{selectedAccount.phoneNumber || selectedAccount.providerName}
													</p>
												</div>
											</div>
											<div className="flex flex-wrap gap-2">
												{canUseWhatsApp && (
													<button
														onClick={() => syncAccount()}
														className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
													>
														<RefreshCw size={15} /> {t.sync}
													</button>
												)}
												{canManageWhatsApp && (selectedAccount.status === 'connected' ? (
													<>
														<button onClick={() => disconnectAccount(false)} className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20">
															<WifiOff size={15} /> {t.disconnect}
														</button>
														<button onClick={() => disconnectAccount(true)} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-rose-600 shadow-md transition-transform hover:-translate-y-px">
															<LogOut size={15} /> {t.logout}
														</button>
													</>
												) : (
													<button
														onClick={connectAccount}
														disabled={
															accountBusy ||
															['connecting', 'qr_pending'].includes(
																selectedAccount.status,
															)
														}
														className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-600 shadow-md transition-transform hover:-translate-y-px disabled:opacity-50"
													>
														<Wifi size={15} /> {t.connect}
													</button>
												))}
												{isAdmin && canManageWhatsApp && (
													<>
														<button
															type="button"
															onClick={resetAccountData}
															disabled={accountBusy}
															aria-label={t.resetSession}
															title={t.resetSession}
															className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-50"
														>
															<RefreshCw size={15} /> {t.resetSession}
														</button>
														<button
															type="button"
															onClick={deleteAccount}
															disabled={accountBusy}
															aria-label={t.deleteAccount}
															title={t.deleteAccount}
															className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-rose-700 disabled:opacity-50"
														>
															<Trash2 size={15} /> {t.deleteAccount}
														</button>
													</>
												)}
											</div>
										</div>
										{['connecting', 'qr_pending'].includes(selectedAccount.status) && (
											<p className="mt-3 text-sm text-white/80">
												{selectedAccount.lastConnectedAt
													? t.sessionLinkedHint
													: t.syncingPhone}
											</p>
										)}
									</div>
									<div className="space-y-5 p-5">
										{accountBusy && (
											<div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
												<Loader2 size={16} className="animate-spin text-[var(--color-primary-500)]" />
												{t.loading}
											</div>
										)}
										{qr && canManageWhatsApp && (
											<div className="mx-auto max-w-sm text-center">
												<div className="mb-4 flex items-center justify-center gap-2">
													<span className="relative flex h-2 w-2">
														<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
														<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
													</span>
													<p className="text-sm font-black">{t.scanQr}</p>
												</div>
												<div className="relative mx-auto w-fit rounded-2xl bg-white p-4 shadow-[0_20px_50px_-15px_rgba(37,211,102,0.35)] dark:bg-slate-800">
													<span className="absolute -start-1.5 -top-1.5 h-6 w-6 rounded-tl-xl border-s-4 border-t-4 border-[var(--color-primary-500)]" />
													<span className="absolute -end-1.5 -top-1.5 h-6 w-6 rounded-tr-xl border-e-4 border-t-4 border-[var(--color-primary-500)]" />
													<span className="absolute -start-1.5 -bottom-1.5 h-6 w-6 rounded-bl-xl border-b-4 border-s-4 border-[var(--color-secondary-500)]" />
													<span className="absolute -end-1.5 -bottom-1.5 h-6 w-6 rounded-br-xl border-b-4 border-e-4 border-[var(--color-secondary-500)]" />
													{qr.startsWith('data:image') ? (
														<img src={qr} alt="WhatsApp QR" className="aspect-square w-52 rounded-lg" />
													) : (
														<p className="max-w-52 break-all text-xs">{qr}</p>
													)}
												</div>
												<p className="mx-auto mt-4 max-w-xs text-xs text-slate-500">{t.scanQrHint}</p>
											</div>
										)}
										<div className="grid gap-3 sm:grid-cols-3">
											<StatTile icon={ShieldCheck} label={t.provider} value={selectedAccount.providerName} bg="bg-[var(--color-primary-50)]" color="var(--color-primary-500)" />
											<StatTile icon={accStatus?.dot === 'bg-emerald-500' ? CheckCircle2 : AlertTriangle} label={t.status} value={accStatus?.label} bg={accStatus?.bg} color={accStatus?.dot === 'bg-emerald-500' ? '#10b981' : accStatus?.dot === 'bg-rose-500' ? '#f43f5e' : '#f59e0b'} />
											<StatTile icon={Clock} label={t.lastConnected} value={selectedAccount.lastConnectedAt ? new Date(selectedAccount.lastConnectedAt).toLocaleString() : '—'} bg="bg-[var(--color-secondary-50)]" color="var(--color-secondary-500)" />
										</div>
									</div>
								</div>
							)}
						</Card>
					</div>
				)}

				{activeTab === 'chats' && (
					<Card className="wa-chat-card grid h-full min-h-[600px] overflow-hidden max-[768px]:min-h-0 max-[768px]:rounded-none max-[768px]:border-0 min-[769px]:grid-cols-[330px_1fr]">
						<aside className={`wa-chat-list ${conversationId ? 'hidden min-[769px]:flex' : 'flex'} min-h-0 flex-col border-e border-slate-200 dark:border-slate-700`}>
							<div
								className="wa-chat-list-scroll min-h-0 flex-1 min-[769px]:contents"
								onScroll={event => setMobileHeaderScrolled(event.currentTarget.scrollTop > 0)}
							>
								<div className="wa-chat-list-header border-b border-slate-100 p-3 dark:border-slate-800">
									<div className="wa-desktop-chat-list-tools flex items-center justify-between">
										<h2 className="font-black">{t.chats}</h2>
										<div className="flex items-center gap-1">
											{searchOpen ? (
												<button
													type="button"
													onClick={() => {
														setSearchOpen(false);
														setChatSearch('');
													}}
													aria-label="Close search"
													className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
												>
													<X size={17} />
												</button>
											) : (
												<>
													<button
														type="button"
														onClick={() => setSearchOpen(true)}
														aria-label={t.search}
														className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
													>
														<Search size={17} />
													</button>
													{canUseWhatsApp && isAccountConnected && (
														<button
															type="button"
															onClick={() => syncAccount()}
															aria-label={t.sync}
															className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
														>
															<RefreshCw size={17} />
														</button>
													)}
												</>
											)}
										</div>
									</div>
									<div className="wa-mobile-chat-tools hidden">
										<h1 className="mb-2 title-whatsapp">{t.chats}</h1>
										{/* <label className="relative block">
											<Search size={20} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#667781]" />
											<input
												aria-label={t.search}
												value={chatSearch}
												onChange={event => setChatSearch(event.target.value)}
												placeholder={locale === 'ar' ? 'ابحث في المحادثات' : 'Ask Meta AI or Search'}
												className="search-input h-9 w-full rounded-[10px] bg-[#F0F2F5] ps-10 pe-3 text-[15px] text-[#111B21] outline-none placeholder:text-[#667781]"
											/>
										</label> */}

										<div className="mt-2 flex gap-2 overflow-x-auto pb-1">
											{[
												['all', t.allChats],
												['unread', t.unreadChats],
												['favorites', t.favoriteChats],
											].map(([value, label]) => (
												<button
													key={value}
													type="button"
													onClick={() => setConversationFilter(value)}
													className={`h-[34px] shrink-0 rounded-[19px] px-3.5 text-sm font-semibold ${conversationFilter === value
														? 'bg-[#D9FDD3] text-[#008069]'
														: 'bg-[#F0F2F5] text-[#54656F]'
														}`}
												>
													{label}
												</button>
											))}
											<button type="button" onClick={() => void loadTabData('groups')} className="h-[34px] shrink-0 rounded-[19px] bg-[#F0F2F5] px-3.5 text-sm font-semibold text-[#54656F]">
												{t.groups}
											</button>
										</div>

										<div className="flex items-center gap-7 mt-1 mb-3">
											<svg className='ml-[20px]' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path fillRule="evenodd" clipRule="evenodd" d="M4.09998 6.2C4.09998 5.26112 4.86109 4.5 5.79998 4.5H18.8C19.7389 4.5 20.5 5.26112 20.5 6.2V7.2C20.5 7.88933 20.0897 8.48283 19.5 8.74964V18.2C19.5 19.1389 18.7389 19.9 17.8 19.9H6.80001C5.86112 19.9 5.10001 19.1389 5.10001 18.2V8.74967C4.51028 8.48287 4.09998 7.88935 4.09998 7.2V6.2ZM6.50001 8.9H18.1V18.2C18.1 18.3657 17.9657 18.5 17.8 18.5H6.80001C6.63432 18.5 6.50001 18.3657 6.50001 18.2V8.9ZM5.79998 5.9C5.63429 5.9 5.49998 6.03431 5.49998 6.2V7.2C5.49998 7.36569 5.63429 7.5 5.79998 7.5H18.8C18.9657 7.5 19.1 7.36569 19.1 7.2V6.2C19.1 6.03431 18.9657 5.9 18.8 5.9H5.79998ZM9.20002 10.5001C8.70297 10.5001 8.30002 10.903 8.30002 11.4001C8.30002 11.8972 8.70297 12.3001 9.20002 12.3001H15.4C15.8971 12.3001 16.3 11.8972 16.3 11.4001C16.3 10.903 15.8971 10.5001 15.4 10.5001H9.20002Z" fill="#767779" />
											</svg>
											<h1 className=' border-transparent py-2 flex-1 !border-b-[#00000020] border-[.33px] title-whatsapp !text-[18px] !font-[600] flex justify-between '> <span>Archived</span> <span className="text-xs opacity-60" >56</span> </h1>
										</div>
									</div>
									{syncingInbox && (
										<div className="mt-3 pb-4">
											<div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold text-slate-500">
												<Loader2 size={12} className="animate-spin" />
												{t.syncProgress}
											</div>
											<div className="wa-sync-progress-track relative mt-7 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
												<div
													className="h-full rounded-full transition-all duration-500"
													style={{
														width: `${Math.max(1, Math.min(100, Number(syncProgress) || 1))}%`,
														background: GRADIENT,
													}}
												/>
												<span
													className="wa-sync-progress-badge"
													style={{
														left: `${Math.max(6, Math.min(94, Number(syncProgress) || 1))}%`,
													}}
												>
													{Math.max(1, Math.min(100, Number(syncProgress) || 1))}%
												</span>
											</div>
										</div>
									)}
									<div
										data-desktop-chat-search
										className={`grid transition-all duration-300 ease-out ${searchOpen
											? 'mt-3 grid-rows-[1fr] opacity-100'
											: 'grid-rows-[0fr] opacity-0'
											}`}
									>
										<div className="min-h-0 overflow-hidden">
											<div className="flex items-center gap-2">
												<div className="relative min-w-0 flex-1">
													<Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
													<input
														autoFocus={searchOpen}
														aria-label={t.search}
														value={chatSearch}
														onChange={event => setChatSearch(event.target.value)}
														placeholder={t.search}
														className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-8 text-sm outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800"
													/>
													{searchingConversations && (
														<Loader2 size={14} className="absolute end-2.5 top-3 animate-spin text-slate-400" />
													)}
												</div>
												<ConversationFilterDropdown
													value={conversationFilter}
													onChange={setConversationFilter}
													labels={{
														all: t.allChats,
														unread: t.unreadChats,
														favorites: t.favoriteChats,
													}}
												/>
											</div>
										</div>
									</div>
								</div>
								<div className="wa-conversation-list min-h-0 flex-1 overflow-y-auto p-2 nice-scroll">
									{filteredConversations.length === 0 ? (
										<Empty
											title={
												!isAccountConnected && !demo.settings.enabled
													? t.connectToSeeChats
													: syncingInbox
														? t.syncingChats
														: conversationScope === 'assigned'
															? t.noAssignedConversations
															: t.noConversations
											}
										/>
									) : (
										<>

											<img src='/meta.png' className="md:hidden w-[60px] fixed bottom-[90px] z-[100] right-[10px]" />

											{filteredConversations.map(conversation => {
												const title = conversationTitle(conversation);
												const active = conversation.id === conversationId;
												const isGroup = conversation.type === 'group';
												const story = !isGroup ? storyForConversation(conversation) : null;
												const unreadCount = Math.max(
													0,
													Number(conversation.unreadCount) || 0,
												);
												const unread = unreadCount > 0;
												const typing = Boolean(
													conversation.isTyping ||
													conversation.typing ||
													conversation.presence?.typing,
												);
												return (
													<div
														key={conversation.id}
														role="button"
														tabIndex={0}
														onClick={() => {
															if (suppressConversationClickRef.current) {
																suppressConversationClickRef.current = false;
																return;
															}
															setConversationId(conversation.id);
														}}
														onPointerDown={event => startConversationLongPress(event, conversation)}
														onPointerMove={cancelConversationLongPress}
														onPointerUp={cancelConversationLongPress}
														onPointerCancel={cancelConversationLongPress}
														onPointerLeave={cancelConversationLongPress}
														onContextMenu={event => {
															event.preventDefault();
															suppressConversationClickRef.current = true;
															setConversationActionAnchor(event.currentTarget.getBoundingClientRect());
															setConversationActionTarget(conversation);
														}}
														onKeyDown={event => {
															if (event.key === 'Enter' || event.key === ' ') {
																event.preventDefault();
																setConversationId(conversation.id);
															}
														}}
														className={`wa-conversation-row relative mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-start transition-colors ${active
															? 'bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] dark:from-slate-800 dark:to-slate-800'
															: 'hover:bg-slate-50 dark:hover:bg-slate-800'
															}`}
													>
														{active && (
															<span
																className="absolute inset-y-2 start-0 w-1 rounded-full"
																style={{ background: GRADIENT }}
															/>
														)}
														<div className="wa-conversation-avatar relative grid h-14 w-14 shrink-0 place-items-center">
															{story ? (
																<>
																	<StoryRing
																		size={56}
																		strokeWidth={2}
																		segmentsViewed={story.items.map(item =>
																			viewedStatusIds.has(item.id),
																		)}
																		idSuffix={`chat-${conversation.id}`}
																	/>
																	<button
																		type="button"
																		aria-label={locale === 'ar' ? `عرض حالة ${title}` : `View ${title}'s story`}
																		onClick={event => {
																			event.stopPropagation();
																			openStoryGroup(story);
																		}}
																		className="relative z-1 grid h-12 w-12 place-items-center rounded-full bg-white"
																	>
																		<Avatar
																			label={title}
																			size={12}
																			isGroup={isGroup}
																			src={conversation.contact?.avatarUrl}
																			className="!ring-0"
																		/>
																	</button>
																</>
															) : (
																<Avatar
																	label={title}
																	size={14}
																	isGroup={isGroup}
																	src={conversation.contact?.avatarUrl}
																/>
															)}
														</div>
														<div className="min-w-0 flex-1">
															<div className="flex items-center justify-between gap-2">
																<p className={`title-chat truncate ${unread ? '!font-black' : ''}`}>{title}</p>
																<div className="flex shrink-0 items-center gap-1">
																	<button
																		type="button"
																		disabled={demo.settings.enabled || pendingPreferenceActions.has(
																			`pin:${conversation.id}`,
																		)}
																		onClick={event =>
																			toggleConversationPinned(conversation, event)
																		}
																		aria-label={
																			conversation.isPinned ? t.unpinChat : t.pinChat
																		}
																		className={`wa-conversation-preference rounded p-0.5 disabled:opacity-50 ${conversation.isPinned
																			? 'text-[var(--color-primary-500)]'
																			: 'text-slate-300 hover:text-[var(--color-primary-500)]'
																			}`}
																	>
																		<Pin
																			size={13}
																			fill={
																				conversation.isPinned
																					? 'currentColor'
																					: 'none'
																			}
																		/>
																	</button>
																	<button
																		type="button"
																		disabled={demo.settings.enabled || pendingPreferenceActions.has(
																			`favorite:${conversation.id}`,
																		)}
																		onClick={event =>
																			toggleConversationFavorite(conversation, event)
																		}
																		aria-label={t.favoriteChats}
																		className={`wa-conversation-preference rounded p-0.5 disabled:opacity-50 ${conversation.isFavorite
																			? 'text-amber-500'
																			: 'text-slate-300 hover:text-amber-500'
																			}`}
																	>
																		<Star
																			size={13}
																			fill={
																				conversation.isFavorite
																					? 'currentColor'
																					: 'none'
																			}
																		/>
																	</button>
																	{conversation.lastMessageAt && (
																		<span className={`time-chat text-[10px] ${unread ? '!font-bold !text-[#1DAB61]' : '!text-[#767779'}`}>
																			{conversationTimestamp(
																				conversation.lastMessage?.providerTimestamp ||
																				conversation.lastMessageAt,
																				locale,
																			)}
																		</span>
																	)}
																</div>
															</div>
															<div className="mt-0.5 flex items-center justify-between gap-2">
																<p className={`desc-chat flex min-w-0 items-center gap-1 truncate text-sm ${typing ? 'font-medium text-[#00A884]' : 'text-[#667781]'}`}>
																	{!typing && conversation.lastMessage?.direction === 'outbound' && (
																		<CheckCheck size={16} className={['read', 'played'].includes(conversation.lastMessage?.status) ? 'shrink-0 text-[#53BDEB]' : 'shrink-0 text-[#8696A0]'} />
																	)}
																	{!typing && (
																		<ConversationPreviewIcon
																			type={conversation.lastMessage?.type}
																		/>
																	)}
																	<span className="truncate">
																		{typing
																			? locale === 'ar' ? 'يكتب الآن…' : 'typing…'
																			: conversationPreview(conversation)}
																	</span>
																</p>
																{unread && (
																	<span
																		className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-bold text-white"
																		style={{ background: GRADIENT }}
																	>
																		{unreadCount > 99 ? '99+' : unreadCount}
																	</span>
																)}
															</div>
														</div>
													</div>
												);
											})}
											{!chatSearch.trim() && conversations.length < conversationTotal && (
												<button
													type="button"
													onClick={loadMoreConversations}
													disabled={loadingMoreConversations}
													className="mx-auto my-3 flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold disabled:opacity-50 dark:border-slate-700"
												>
													{loadingMoreConversations && <Loader2 size={13} className="animate-spin" />}
													{t.older}
												</button>
											)}
										</>
									)}
								</div>
							</div>
						</aside>
						<section className={`${!conversationId ? 'hidden min-[769px]:flex' : 'flex'} min-h-0 flex-col`}>
							{!selectedConversation ? (
								<Empty title={!isAccountConnected && !demo.settings.enabled ? t.connectToSeeChats : t.selectConversation} />
							) : (
								<>
									<header className="wa-chat-toolbar flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
										<div className="flex min-w-0 items-center gap-2.5">
											<button type="button" aria-label="Back to chats" onClick={() => setConversationId(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white min-[769px]:hidden">
												<ChevronLeft size={27} />
											</button>
											<span className=" mr-[15px] wa-chat-back-count hidden min-[769px]:hidden">10</span>
											<div className="wa-chat-avatar-ring shrink-0">
												<Avatar
													label={conversationTitle(selectedConversation)}
													size={6}
													isGroup={selectedConversation.type === 'group'}
													src={selectedConversation.contact?.avatarUrl}
												/>
											</div>
											<div className="wa-chat-contact min-w-0">
												<h3 className="truncate font-black">
													{conversationTitle(selectedConversation)}
												</h3>
												<p className="wa-chat-assignee text-xs text-slate-500">
													{selectedConversation.assignedUser?.name || t.unassign}
												</p>
												<p className="wa-chat-contact-hint hidden text-[11px] text-[#667781]">
													{selectedConversation.isTyping || selectedConversation.typing || selectedConversation.presence?.typing
														? locale === 'ar' ? 'يكتب الآن…' : 'typing…'
														: locale === 'ar' ? 'اضغط هنا لمعلومات جهة الاتصال' : 'tap here for contact info'}
												</p>
											</div>
										</div>
										<div className="hidden items-center gap-2 min-[769px]:flex">
											<button
												type="button"
												disabled={demo.settings.enabled || pendingPreferenceActions.has(
													`pin:${selectedConversation.id}`,
												)}
												onClick={event =>
													toggleConversationPinned(selectedConversation, event)
												}
												aria-label={
													selectedConversation.isPinned ? t.unpinChat : t.pinChat
												}
												title={
													selectedConversation.isPinned ? t.unpinChat : t.pinChat
												}
												className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors disabled:opacity-50 ${selectedConversation.isPinned
													? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] text-[var(--color-primary-500)] dark:bg-slate-800'
													: 'border-slate-200 text-slate-400 hover:text-[var(--color-primary-500)] dark:border-slate-700'
													}`}
											>
												<Pin
													size={16}
													fill={
														selectedConversation.isPinned
															? 'currentColor'
															: 'none'
													}
												/>
											</button>
											<button
												type="button"
												disabled={demo.settings.enabled || pendingPreferenceActions.has(
													`favorite:${selectedConversation.id}`,
												)}
												onClick={event =>
													toggleConversationFavorite(selectedConversation, event)
												}
												aria-label={t.favoriteChats}
												title={t.favoriteChats}
												className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors disabled:opacity-50 ${selectedConversation.isFavorite
													? 'border-amber-300 bg-amber-50 text-amber-500 dark:bg-amber-950/30'
													: 'border-slate-200 text-slate-400 hover:text-amber-500 dark:border-slate-700'
													}`}
											>
												<Star
													size={16}
													fill={
														selectedConversation.isFavorite
															? 'currentColor'
															: 'none'
													}
												/>
											</button>
											<button
												type="button"
												disabled={demo.settings.enabled}
												onClick={() => setShowNotes(current => !current)}
												className={`h-9 rounded-lg border px-3 text-xs font-bold transition-colors ${showNotes
													? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:border-slate-600 dark:bg-slate-800'
													: 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
													}`}
												title={t.notes}
											>
												<span className="inline-flex items-center gap-1.5">
													<StickyNote size={14} />
													{t.notes}
												</span>
											</button>
											{!demo.settings.enabled && canUseWhatsApp &&
												selectedAccount?.privacySettings?.readReceiptMode === 'manual' && (
													<button
														type="button"
														onClick={markConversationReadManually}
														className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
													>
														{t.markRead}
													</button>
												)}
											{!demo.settings.enabled && canAssignWhatsApp && <select
												value={selectedConversation.assignedUserId || ''}
												onChange={event => assignConversation(event.target.value)}
												className="h-9 max-w-40 rounded-lg border border-slate-200 bg-transparent px-2 text-xs outline-none dark:border-slate-700"
											>
												<option value="">{t.unassign}</option>
												{staff.map(user => (
													<option key={user.id} value={user.id}>
														{user.name}
													</option>
												))}
											</select>}
											<button type="button" aria-label="Close conversation" onClick={() => setConversationId(null)} className="rounded-lg p-2 hover:bg-slate-100 min-[769px]:hidden dark:hover:bg-slate-800">
												<X size={18} />
											</button>
										</div>
										<div className="wa-chat-mobile-actions flex shrink-0 items-center min-[769px]:hidden">
											{/* <button type="button" disabled aria-label="Voice call unavailable" className="grid h-11 w-11 place-items-center rounded-full"><Phone size={26} strokeWidth={2.3} /></button> */}
											{/* <ChevronDown size={17} strokeWidth={2.4} aria-hidden="true" /> */}
											<svg width="80" height="34" viewBox="0 0 80 34" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fillRule="evenodd" clipRule="evenodd" d="M6.49995 7.7002C4.67741 7.7002 3.19995 9.17766 3.19995 11.0002V21.0002C3.19995 22.8227 4.67741 24.3002 6.49995 24.3002H19C20.8226 24.3002 22.3 22.8227 22.3 21.0002V19.0266L25.8181 22.0895C26.9828 23.1036 28.8 22.2763 28.8 20.7319L28.8 11.2685C28.8 9.72414 26.9829 8.89685 25.8181 9.91093L22.3 12.9738V11.0002C22.3 9.17766 20.8226 7.7002 19 7.7002H6.49995ZM22.3 15.0952V16.9052L26.8687 20.8828C26.9981 20.9954 27.2 20.9035 27.2 20.7319L27.2 11.2685C27.2 11.0969 26.9981 11.005 26.8687 11.1177L22.3 15.0952ZM4.79995 11.0002C4.79995 10.0613 5.56107 9.3002 6.49995 9.3002H19C19.9389 9.3002 20.7 10.0613 20.7 11.0002V21.0002C20.7 21.9391 19.9389 22.7002 19 22.7002H6.49995C5.56107 22.7002 4.79995 21.9391 4.79995 21.0002V11.0002Z" fill="#0A0A0A"/>
<path d="M68.7676 26.1555C65.8452 26.1555 62.2666 24.3303 58.9751 21.0388C55.6631 17.7268 53.8584 14.1585 53.8584 11.2258C53.8584 9.45192 54.3403 8.27272 55.5093 7.22682C55.5913 7.15504 55.6733 7.08326 55.7656 7.00123C56.4526 6.386 57.1294 6.08864 57.7754 6.09889C58.5137 6.10914 59.2007 6.52955 59.8364 7.44215L61.9077 10.426C62.5435 11.3386 62.6152 12.4255 61.7539 13.2869L60.9746 14.0764C60.7388 14.3123 60.7285 14.5071 60.8618 14.7429C61.272 15.3889 62.041 16.2708 62.8408 17.0603C63.5996 17.8191 64.7173 18.7932 65.271 19.1419C65.4966 19.2854 65.7017 19.2752 65.9375 19.0393L66.7271 18.2498C67.5884 17.3987 68.665 17.4705 69.5879 18.1062L72.5718 20.1775C73.4844 20.8132 73.915 21.5003 73.915 22.2385C73.915 22.8845 73.6279 23.5613 73.0127 24.2483C72.9409 24.3303 72.8589 24.4226 72.7769 24.5047C71.7412 25.6736 70.562 26.1555 68.7676 26.1555ZM68.7778 24.5764C69.916 24.5559 70.8901 24.1663 71.5874 23.3665C71.6489 23.2947 71.6899 23.2434 71.7515 23.1716C72.0181 22.864 72.1616 22.5359 72.1616 22.2385C72.1616 21.9309 72.0488 21.6746 71.7412 21.4695L68.7573 19.4802C68.4292 19.2752 68.0806 19.2547 67.7627 19.5725L66.8604 20.4749C66.1528 21.1824 65.2915 21.1311 64.6045 20.6184C63.8047 20.0237 62.564 18.9163 61.7847 18.1267C60.9951 17.3474 59.98 16.199 59.3955 15.4094C58.8828 14.7224 58.8315 13.8611 59.5391 13.1536L60.4414 12.2512C60.7593 11.9334 60.7388 11.5745 60.5234 11.2566L58.5342 8.27272C58.3394 7.9651 58.0728 7.85231 57.7754 7.85231C57.478 7.85231 57.1499 7.99586 56.8423 8.26246C56.7705 8.31373 56.7192 8.365 56.6475 8.42653C55.8477 9.12379 55.4478 10.0979 55.4272 11.2258C55.376 13.8406 57.478 17.3064 60.1543 19.9724C62.8101 22.6179 66.1631 24.6277 68.7778 24.5764Z" fill="#0A0A0A"/>
</svg>

										</div>
									</header>
									{showNotes && (
										<div className="border-b border-slate-100 bg-amber-50/60 px-3 py-3 dark:border-slate-800 dark:bg-amber-950/20">
											<div className="mb-2 flex items-center justify-between gap-2">
												<div>
													<p className="text-xs font-black text-amber-900 dark:text-amber-200">{t.notes}</p>
													<p className="text-[11px] text-amber-800/80 dark:text-amber-200/70">{t.notesHint}</p>
												</div>
												{loadingNotes && <Loader2 size={14} className="animate-spin text-amber-700" />}
											</div>
											<div className="mb-2 max-h-36 space-y-2 overflow-y-auto nice-scroll">
												{notes.length === 0 && !loadingNotes ? (
													<p className="text-xs text-amber-800/70 dark:text-amber-200/60">{t.noNotes}</p>
												) : (
													notes.map(note => (
														<div
															key={note.id}
															className="rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2 text-xs dark:border-amber-900/50 dark:bg-slate-900/50"
														>
															<div className="mb-1 flex items-center justify-between gap-2">
																<span className="font-bold text-slate-700 dark:text-slate-200">
																	{note.author?.name || note.author?.fullName || 'Staff'}
																</span>
																<span className="text-[10px] text-slate-400">
																	{relativeTime(note.created_at || note.createdAt, relativeTimeNow, locale)}
																</span>
															</div>
															<p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{note.text}</p>
														</div>
													))
												)}
											</div>
											<form onSubmit={saveNote} className="flex gap-2">
												<input
													value={noteDraft}
													onChange={event => setNoteDraft(event.target.value)}
													placeholder={t.notePlaceholder}
													maxLength={2000}
													className="h-9 flex-1 rounded-lg border border-amber-200 bg-white px-3 text-xs outline-none dark:border-amber-900/60 dark:bg-slate-900"
												/>
												<button
													type="submit"
													disabled={savingNote || !noteDraft.trim()}
													className="h-9 rounded-lg px-3 text-xs font-bold text-white disabled:opacity-50"
													style={{ background: GRADIENT }}
												>
													{savingNote ? <Loader2 size={13} className="animate-spin" /> : t.addNote}
												</button>
											</form>
										</div>
									)}
									<div
										ref={messageBoxRef}
										onScroll={event => {
											if (!loadingMessages && event.currentTarget.scrollTop < 50) loadOlder();
										}}
										className={`wa-message-wallpaper min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#0B141A] p-4 nice-scroll ${
											Boolean(whatsappAi.settings?.enabled) &&
											aiSuggestionsVisible &&
											!demo.settings.enabled &&
											canUseWhatsApp
												? 'wa-has-ai-suggestions'
												: ''
										}`}
										style={{
											backgroundImage: "url('/bg-whatsapp.svg')",
											backgroundRepeat: 'repeat',
											backgroundSize: 'auto, 360px 360px',
										}}
									>
										{loadingMessages ? (
											<div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
												<div className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-slate-800/90">
													<Loader2 size={28} className="animate-spin text-[var(--color-primary-500)]" />
												</div>
												<p className="text-sm font-semibold text-slate-500">{t.loadingMessages}</p>
											</div>
										) : effectiveMessages.length === 0 ? (
											<div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
												<div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-800/80">
													<MessageCircle size={24} className="text-[var(--color-primary-400)]" />
												</div>
												<p className="text-sm font-semibold text-slate-400">{t.noMessagesYet}</p>
											</div>
										) : (
											<>
												{hasMoreMessages && (
													<button
														onClick={loadOlder}
														disabled={loadingOlder}
														className="mx-auto flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow dark:bg-slate-800"
													>
														{loadingOlder ? <Loader2 size={13} className="animate-spin" /> : <ChevronUp size={13} />}
														{t.older}
													</button>
												)}
												{messageRows.map((row, rowIndex) => {
													const groupedImages = row.kind === 'image-gallery';
													const message = groupedImages
														? row.messages[row.messages.length - 1]
														: row.message;
													const previousRow = messageRows[rowIndex - 1];
													const previousMessage = previousRow
														? previousRow.kind === 'image-gallery'
															? previousRow.messages[previousRow.messages.length - 1]
															: previousRow.message
														: null;
													const messageDate = message.providerTimestamp || message.created_at;
													const previousMessageDate = previousMessage?.providerTimestamp || previousMessage?.created_at;
													const dayLabel = messageDayLabel(messageDate, locale);
													const previousDayLabel = messageDayLabel(previousMessageDate, locale);
													const attachments = groupedImages
														? row.attachments
														: message.attachments;
													const mine = message.direction === 'outbound';
													const isRead = ['read', 'played'].includes(message.status);
													const textPresentation = messageTextPresentation(message.text);
													const isDeleted =
														message.deletedMode && message.deletedMode !== 'none';
													const attachmentTypes = (attachments || []).map(attachment => String(attachment.type || '').toLowerCase());
													const isStickerMessage = !message.text && attachmentTypes.length > 0 && attachmentTypes.every(type => type === 'sticker');
													const isVisualMediaMessage = !message.text && attachmentTypes.length > 0 && attachmentTypes.every(type => ['image', 'sticker', 'video'].includes(type));
													return (
														<div key={row.key} className="wa-message-row">
															{dayLabel && dayLabel !== previousDayLabel && (
																<div className="wa-date-separator mx-auto mb-3 mt-4 w-fit rounded-lg border border-black/5 bg-white/90 px-3.5 py-1 text-center text-xs font-semibold text-[#54656F] shadow-sm">
																	{dayLabel}
																</div>
															)}
																	<div className={`wa-message-line flex ${mine ? 'justify-end' : 'justify-start'} ${message.optimistic ? 'opacity-70' : ''}`}>
																<div className={`group flex items-start gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
																<div
																	onPointerDown={event => startMessageLongPress(event, message)}
																	onPointerMove={cancelMessageLongPress}
																	onPointerUp={cancelMessageLongPress}
																	onPointerCancel={cancelMessageLongPress}
																	onContextMenu={event => {
																		if (window.innerWidth <= 768) {
																			event.preventDefault();
																			setReactionPickerMessageId(null);
																			setActionMessageAnchor(event.currentTarget.getBoundingClientRect());
																			setActionMessageId(message.id);
																		}
																	}}
															className={`wa-message-bubble relative ${mine ? 'wa-message-mine' : 'wa-message-other'} ${isStickerMessage ? 'wa-message-sticker' : ''} ${isVisualMediaMessage || groupedImages ? 'wa-message-media' : ''} max-w-[88%] rounded-2xl text-sm shadow-sm sm:max-w-[76%] min-[769px]:max-w-[70%] ${groupedImages ? 'p-1.5' : 'px-3.5 py-2.5'} ${mine
																		? 'bg-[#d9fdd3] text-slate-900 dark:bg-[#005c4b] dark:text-white'
																		: 'border border-slate-100 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
																		}`}
																>
																	{(message.forwarded || message.isForwarded) && (
																		<p className="mb-1 text-[10px] italic opacity-60">
																			{locale === 'ar' ? 'مُعاد توجيهها' : 'Forwarded'}
																		</p>
																	)}
																	{message.replyTo && (
																		<div className="mb-2 rounded-lg border-s-4 border-emerald-500 bg-black/5 px-2 py-1 text-xs opacity-80">
																			{message.replyTo.text || message.replyTo.type}
																		</div>
																	)}
																	{!isDeleted && attachments?.length
																		? (
																			<MessageAttachments
																				attachments={attachments}
																				mine={mine}
																				labels={t}
																				onImageReady={registerChatImage}
																				onOpenImage={setActiveChatImageId}
																				voiceAvatarLabel={mine ? selectedAccount?.label : conversationTitle(selectedConversation)}
																				voiceAvatarSrc={mine ? '' : selectedConversation.contact?.avatarUrl}
																			/>
																		)
																		: !isDeleted && ['image', 'audio', 'ptt', 'video', 'document', 'sticker'].includes(
																			String(message.type || '').toLowerCase(),
																		) && (
																			<div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-black/5`}>
																				{String(message.type).includes('audio') || message.type === 'ptt' ? (
																					<Mic size={14} />
																				) : String(message.type).includes('image') ? (
																					<ImageIcon size={14} />
																				) : (
																					<FileText size={14} />
																				)}
																				<span>{message.type}</span>
																			</div>
																		)}
																	{isDeleted ? (
																		<p className="italic opacity-60">
																			{locale === 'ar' ? 'تم حذف هذه الرسالة' : 'This message was deleted'}
																		</p>
																	) : message.location ? (
																		<a
																			href={`https://www.google.com/maps?q=${encodeURIComponent(
																				`${message.location.latitude},${message.location.longitude}`,
																			)}`}
																			target="_blank"
																			rel="noreferrer"
																			className="block rounded-lg bg-black/5 p-3 font-bold text-emerald-700 underline"
																		>
																			{message.location.name ||
																				`${message.location.latitude}, ${message.location.longitude}`}
																		</a>
																	) : message.text ? (
																		<>
																			<MessageLinkPreview text={message.text} labels={t} />
																			<p
																				dir={textPresentation.dir}
																				lang={textPresentation.lang}
																				style={textPresentation.style}
																				className="wa-message-text whitespace-pre-wrap wrap-break-word leading-relaxed"
																			>
																				<WhatsAppFormattedText text={message.text} />
																			</p>
																		</>
																	) : null}
															<div className={`wa-message-meta mt-1 flex items-center justify-end gap-1 px-0.5 text-[10px] ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																		{message.isStarred && <Star size={11} fill="currentColor" />}
																		{message.isPinned && <Pin size={11} fill="currentColor" />}
																		{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																		{mine && message.showReadReceipt !== false &&
																			(message.optimistic ? (
																				<Clock size={12} className="animate-pulse" />
																			) : isRead ? (
																				<CheckCheck size={13} className="text-[#53BDEB]" />
																			) : (
																				<Check size={13} />
																			))}
																	</div>
																	{Array.isArray(message.reactions) && message.reactions.length > 0 && (
																		<div className={`wa-message-reactions ${mine ? 'is-outgoing' : 'is-incoming'}`}>
																			{Object.values(
																				message.reactions.reduce((groups, reaction) => {
																					const emoji = reaction.emoji || '';
																					if (!emoji) return groups;
																					if (!groups[emoji]) {
																						groups[emoji] = { emoji, count: 0, mine: false };
																					}
																					groups[emoji].count += 1;
																					if (reaction.actorKey === 'me') groups[emoji].mine = true;
																					return groups;
																				}, {}),
																			).map(group => (
																				<span
																					key={group.emoji}
																					className={`wa-message-reaction-chip ${group.mine ? 'is-mine' : ''}`}
																				>
																					<span className="wa-message-reaction-emoji">{group.emoji}</span>
																					{group.count > 1 && (
																						<span className="wa-message-reaction-count">{group.count}</span>
																					)}
																				</span>
																			))}
																		</div>
																	)}
																</div>
																{!message.optimistic && (
																	<div className="relative mt-1 shrink-0">
																		<button
																			type="button"
																			data-message-actions-trigger
																			onClick={event => {
																				setReactionPickerMessageId(null);
																				setActionMessageAnchor(event.currentTarget.closest('.group')?.querySelector('.wa-message-bubble')?.getBoundingClientRect() || null);
																				setActionMessageId(current => current === message.id ? null : message.id);
																			}}
																			aria-label={locale === 'ar' ? 'إجراءات الرسالة' : 'Message actions'}
																			className="hidden h-7 w-7 place-items-center rounded-full bg-white/90 text-[#667781] opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100 min-[769px]:grid"
																		>
																			<MoreHorizontal size={16} />
																		</button>
																		{reactionPickerMessageId === message.id && (
																			<div data-message-reaction-picker className={`absolute top-8 z-30 flex gap-1 rounded-full border border-black/10 bg-white p-1.5 shadow-xl ${mine ? 'end-0' : 'start-0'}`}>
																				{['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
																					<button
																						key={emoji}
																						type="button"
																						onClick={() => void reactToMessage(message, emoji)}
																						disabled={reactingMessageIds.has(message.id)}
																						className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-slate-100 disabled:opacity-50"
																					>
																						{emoji}
																					</button>
																				))}
																			</div>
																		)}
																		<MessageActionMenu
																			open={actionMessageId === message.id}
																			message={message}
																			locale={locale}
																			isVoice={(attachments || []).some(attachment => ['audio', 'ptt', 'voice'].includes(String(attachment.type || message.type || '').toLowerCase()))}
																			anchorRect={actionMessageAnchor}
																			previewImageUrl={(attachments || [])
																				.map(attachment => registeredChatImages[attachment.id]?.url)
																				.find(Boolean)}
																			busy={pendingMessageActions.has(message.id)}
																			onClose={() => {
																				setActionMessageId(null);
																				setActionMessageAnchor(null);
																			}}
																			onAction={action => void handleMessageAction(message, action)}
																			onReact={emoji => {
																				setActionMessageId(null);
																				setActionMessageAnchor(null);
																				void reactToMessage(message, emoji);
																			}}
																		/>
																	</div>
																)}
																</div>
															</div>
														</div>
													);
												})}
											</>
										)}
									</div>
									<div
										className={`wa-composer-stack ${
											Boolean(whatsappAi.settings?.enabled) &&
											aiSuggestionsVisible &&
											!demo.settings.enabled &&
											canUseWhatsApp
												? 'wa-composer-stack--ai'
												: ''
										}`}
									>
									<AiReplySuggestions
										locale={locale}
										repliesOnly
										enabled={
											Boolean(whatsappAi.settings?.enabled) &&
											aiSuggestionsVisible &&
											!demo.settings.enabled &&
											canUseWhatsApp
										}
										loading={whatsappAi.suggestionsLoading}
										error={whatsappAi.suggestionsError}
										suggestions={whatsappAi.suggestions}
										onRegenerate={whatsappAi.regenerateSuggestions}
										onSelect={suggestion => setDraft(suggestion)}
									/>
									{canComposeInConversation ? (
										<form onSubmit={sendMessage} className="wa-composer flex flex-wrap items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
											<input
												ref={fileRef}
												type="file"
												accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/ogg,audio/mp4,audio/webm,application/pdf,.doc,.docx,.xls,.xlsx"
												className="hidden"
												onChange={event => sendFile(event.target.files?.[0])}
											/>
											{replyingTo && (
												<div className="flex min-w-0 basis-full items-center gap-3 rounded-xl border-s-4 border-[#00A884] bg-[#F0F2F5] px-3 py-2 text-xs text-[#54656F]">
													<Reply size={16} className="shrink-0 text-[#00A884]" />
													<div className="min-w-0 flex-1">
														<p className="font-semibold text-[#008069]">
															{locale === 'ar' ? 'الرد على رسالة' : 'Replying to message'}
														</p>
														<p className="truncate">
															{replyingTo.text ||
																(replyingTo.type === 'image'
																	? locale === 'ar' ? 'صورة' : 'Photo'
																	: replyingTo.type)}
														</p>
													</div>
													<button
														type="button"
														onClick={() => setReplyingTo(null)}
														aria-label={locale === 'ar' ? 'إلغاء الرد' : 'Cancel reply'}
														className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-black/5"
													>
														<X size={16} />
													</button>
												</div>
											)}
											<button
												type="button"
												aria-label="Attach file"
										disabled={sending || recordingVoice}
										onClick={() => {
											setStickerPanelOpen(false);
											setAttachmentSheetOpen(true);
										}}
										title="Attachment actions"
												className="wa-attach-button grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
											>
												{/* <Plus size={27}  /> */}
												<svg className="min-[769px]:hidden" width="25" height="25" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path fillRule="evenodd" clipRule="evenodd" d="M16.9 7.0001C16.9 6.50304 16.4971 6.1001 16 6.1001C15.5029 6.1001 15.1 6.50304 15.1 7.0001V15.1001H7C6.50294 15.1001 6.1 15.503 6.1 16.0001C6.1 16.4972 6.50294 16.9001 7 16.9001H15.1V25.0001C15.1 25.4972 15.5029 25.9001 16 25.9001C16.4971 25.9001 16.9 25.4972 16.9 25.0001V16.9001H25C25.4971 16.9001 25.9 16.4972 25.9 16.0001C25.9 15.503 25.4971 15.1001 25 15.1001H16.9V7.0001Z" fill="#0A0A0A" />
												</svg>

												<Paperclip size={19} className="hidden min-[769px]:block" />
											</button>
											{recordingVoice ? (
												<>
											<div className="wa-recording-panel flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 dark:border-rose-900/50 dark:bg-rose-950/30">
														<span className="relative flex h-3 w-3">
															<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
															<span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
														</span>
														<span className="flex-1 text-sm font-bold text-rose-600 dark:text-rose-300">
															{t.recordingVoice}
														</span>
														<span className="font-mono text-sm font-black tabular-nums text-rose-600 dark:text-rose-300">
															{formatRecordingDuration(recordingSeconds)}
														</span>
													</div>
													<button
														type="button"
														title={t.cancelRecording}
														aria-label={t.cancelRecording}
														onClick={() => stopVoiceRecording(false)}
												className="wa-recording-cancel grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
													>
														<X size={18} />
													</button>
													<button
														type="button"
														title={t.sendRecording}
														aria-label={t.sendRecording}
														onClick={() => stopVoiceRecording(true)}
												className="wa-recording-stop grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/25 transition-transform hover:-translate-y-px"
													>
														<Square size={16} fill="currentColor" />
													</button>
												</>
											) : (
												<div className="flex min-w-0 flex-1 items-center gap-1">
													<div className="wa-input-pill flex min-w-0 flex-1 items-end !bg-white rounded-full !border !border-slate-200 dark:border-slate-700">
														<textarea
															aria-label={t.message}
													value={draft}
													onChange={event => {
														setDraft(event.target.value);
														event.currentTarget.style.height = 'auto';
														event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 112)}px`;
													}}
															onKeyDown={event => {
																if (
																	event.key === 'Enter' &&
																	!event.shiftKey &&
																	!event.nativeEvent.isComposing
																) {
																	event.preventDefault();
																	sendMessage(event);
																}
															}}
													rows={1}
													dir={messageTextPresentation(draft).dir}
													placeholder={t.message}
															className="max-h-28 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3.5 py-2.5 outline-none"
														/>
												<button type="button" aria-label="Stickers" title="Emoji, GIF and stickers" onClick={() => { setAttachmentSheetOpen(false); setStickerPanelOpen(current => !current); }} className="wa-sticker-button wa-input-action grid h-[40px] w-9 shrink-0 place-items-center text-[#8696A0]">
															<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path fillRule="evenodd" clipRule="evenodd" d="M11.6154 2.89991L13.9358 2.89991C14.4593 2.8999 14.7592 2.8999 15.0178 2.92026C18.2543 3.17497 20.8249 5.7456 21.0797 8.98208C21.1 9.24075 21.1 9.54062 21.1 10.0641V10.1375C21.1 10.9379 21.1 11.377 21.0704 11.7531C20.6999 16.4607 16.9608 20.1998 12.2532 20.5703C11.8771 20.5999 11.438 20.5999 10.6376 20.5999H10.2524C9.55427 20.5999 9.15433 20.5999 8.81011 20.5638C5.71094 20.238 3.26189 17.789 2.93616 14.6898C2.89998 14.3456 2.89999 13.9457 2.9 13.2477L2.9 11.6154C2.8999 9.64928 2.89984 8.52143 3.1842 7.58403C3.82407 5.47466 5.47475 3.82397 7.58412 3.1841C8.52152 2.89975 9.64937 2.89981 11.6154 2.89991ZM11.75 4.09991C9.61283 4.09991 8.67748 4.10643 7.93247 4.33243C6.20662 4.85596 4.85605 6.20653 4.33252 7.93237C4.10653 8.67739 4.1 9.61273 4.1 11.7499V13.1999C4.1 13.9582 4.10083 14.2908 4.12958 14.5644C4.3961 17.1001 6.39986 19.1038 8.93555 19.3703C9.2091 19.3991 9.54174 19.3999 10.3 19.3999H10.6C11.4472 19.3999 11.836 19.3994 12.1591 19.374C12.2949 19.3633 12.3998 19.2475 12.3994 19.1065C12.3993 19.073 12.3992 19.0395 12.3991 19.0059C12.3968 18.2485 12.3944 17.4838 12.4565 16.7239C12.514 16.0197 12.6331 15.438 12.9014 14.9115C13.3424 14.046 14.0461 13.3423 14.9116 12.9013C15.4381 12.633 16.0198 12.5139 16.7239 12.4564C17.5478 12.3891 18.376 12.3928 19.1977 12.3973C19.4427 12.3987 19.5331 12.3969 19.6099 12.361C19.6767 12.3297 19.7451 12.2681 19.7831 12.2049C19.827 12.132 19.8371 12.0506 19.8592 11.8267C19.8647 11.771 19.8697 11.7151 19.8741 11.659C19.8995 11.3359 19.9 10.9471 19.9 10.0999C19.9 9.53129 19.8995 9.28181 19.8834 9.07623C19.6749 6.4282 17.5717 4.32496 14.9237 4.11656C14.7181 4.10038 14.4686 4.09991 13.9 4.09991H11.75ZM18.9751 13.5977C18.2535 13.5944 17.5348 13.5941 16.8217 13.6524C16.1917 13.7039 15.7856 13.8028 15.4564 13.9705C14.8167 14.2965 14.2965 14.8166 13.9706 15.4563C13.8029 15.7855 13.704 16.1917 13.6525 16.8216C13.6128 17.3078 13.6031 17.8966 13.6007 18.6525C13.6004 18.7573 13.6003 18.8287 13.6054 18.8834C13.6103 18.9368 13.6195 18.9631 13.6308 18.981C13.6562 19.0214 13.7033 19.0559 13.7494 19.068C13.7706 19.0735 13.7977 19.0743 13.8468 19.0639C13.8977 19.0531 13.9619 19.0328 14.0567 19.0025C16.4656 18.234 18.3983 16.4129 19.3177 14.0764C19.3562 13.9785 19.3823 13.9119 19.3971 13.8589C19.4116 13.8076 19.4123 13.7794 19.4077 13.7575C19.3975 13.7092 19.3639 13.6596 19.3227 13.6322C19.3049 13.6203 19.2775 13.6103 19.2206 13.6045C19.1626 13.5986 19.0863 13.5982 18.9751 13.5977Z" fill="#0A0A0A" />
															</svg>

														</button>

													</div>
											<button type="button" aria-label="Camera" title="Camera or photo picker" onClick={() => openComposerFilePicker({ accept: 'image/*', capture: 'environment' })} className="wa-camera-button wa-input-action grid h-11 w-9 shrink-0 place-items-center text-[#8696A0]">
														<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path fillRule="evenodd" clipRule="evenodd" d="M12.3302 7.08112C12.8052 6.52227 13.5016 6.2002 14.235 6.2002H17.762C18.4954 6.2002 19.1918 6.52228 19.6668 7.08112L20.3484 7.88312C20.5193 8.08427 20.77 8.2002 21.034 8.2002H24.7499C26.4344 8.2002 27.7999 9.56573 27.7999 11.2502V21.2502C27.7999 22.9347 26.4344 24.3002 24.75 24.3002H7.24995C5.56548 24.3002 4.19995 22.9347 4.19995 21.2502V11.2502C4.19995 9.56573 5.56548 8.2002 7.24995 8.2002H10.963C11.227 8.2002 11.4777 8.08427 11.6486 7.88312L12.3302 7.08112ZM14.235 7.8002C13.971 7.8002 13.7203 7.91612 13.5494 8.11727L12.8678 8.91927C12.3928 9.47812 11.6964 9.8002 10.963 9.8002H7.24995C6.44914 9.8002 5.79995 10.4494 5.79995 11.2502V21.2502C5.79995 22.051 6.44914 22.7002 7.24995 22.7002H24.75C25.5508 22.7002 26.2 22.051 26.2 21.2502V11.2502C26.2 10.4494 25.5508 9.8002 24.7499 9.8002H21.034C20.3006 9.8002 19.6041 9.47812 19.1292 8.91927L18.4476 8.11727C18.2766 7.91612 18.026 7.8002 17.762 7.8002H14.235ZM15.9984 12.8002C14.0934 12.8002 12.549 14.3445 12.549 16.2496C12.549 18.1546 14.0934 19.6989 15.9984 19.6989C17.9034 19.6989 19.4478 18.1546 19.4478 16.2496C19.4478 14.3445 17.9034 12.8002 15.9984 12.8002ZM10.949 16.2496C10.949 13.4609 13.2097 11.2002 15.9984 11.2002C18.7871 11.2002 21.0478 13.4609 21.0478 16.2496C21.0478 19.0382 18.7871 21.2989 15.9984 21.2989C13.2097 21.2989 10.949 19.0382 10.949 16.2496ZM22.65 13.8002C23.3404 13.8002 23.9 13.2405 23.9 12.5502C23.9 11.8598 23.3404 11.3002 22.65 11.3002C21.9597 11.3002 21.4 11.8598 21.4 12.5502C21.4 13.2405 21.9597 13.8002 22.65 13.8002Z" fill="#0A0A0A" />
														</svg>

													</button>
													<button
														type="button"
														disabled={sending}
														title={t.recordVoice}
														aria-label={t.recordVoice}
														onClick={startVoiceRecording}
														className={`wa-mic-button grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-500)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800 ${draft.trim() ? 'max-[768px]:hidden' : ''}`}
													>
														{/* <Mic size={19} /> */}
														<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path fillRule="evenodd" fill='red' clipRule="evenodd" d="M11.6996 8.3C11.6996 5.92518 13.6248 4 15.9996 4C18.3744 4 20.2996 5.92518 20.2996 8.3V15.8C20.2996 18.1748 18.3744 20.1 15.9996 20.1C13.6248 20.1 11.6996 18.1748 11.6996 15.8V8.3ZM15.9996 5.6C14.5084 5.6 13.2996 6.80883 13.2996 8.3V15.8C13.2996 17.2912 14.5084 18.5 15.9996 18.5C17.4908 18.5 18.6996 17.2912 18.6996 15.8V8.3C18.6996 6.80883 17.4908 5.6 15.9996 5.6ZM8.99958 15C9.44141 15 9.79959 15.3582 9.79958 15.8C9.79958 16.6142 9.95995 17.4204 10.2715 18.1726C10.5831 18.9249 11.0398 19.6083 11.6155 20.1841C12.1912 20.7598 12.8747 21.2165 13.6269 21.5281C14.3792 21.8396 15.1854 22 15.9996 22C16.8138 22 17.62 21.8396 18.3722 21.5281C19.1244 21.2165 19.8079 20.7598 20.3836 20.1841C20.9594 19.6083 21.4161 18.9249 21.7276 18.1726C22.0392 17.4204 22.1996 16.6142 22.1996 15.8C22.1996 15.3582 22.5578 15 22.9996 15C23.4414 15 23.7996 15.3582 23.7996 15.8C23.7996 16.8243 23.5978 17.8386 23.2058 18.7849C22.8139 19.7313 22.2393 20.5911 21.515 21.3154C20.7907 22.0397 19.9309 22.6143 18.9845 23.0063C18.2856 23.2958 17.5496 23.4815 16.7999 23.5588V26C16.7999 26.4418 16.4418 26.8 15.9999 26.8C15.5581 26.8 15.1999 26.4418 15.1999 26V23.5589C14.45 23.4816 13.7138 23.2958 13.0147 23.0063C12.0683 22.6143 11.2084 22.0397 10.4842 21.3154C9.75985 20.5911 9.18531 19.7313 8.79332 18.7849C8.40134 17.8386 8.19958 16.8243 8.19958 15.8C8.19958 15.3582 8.55776 15 8.99958 15Z" fill="#fff" />
														</svg>

													</button>
													<button
														type="submit"
														aria-label={t.send}
														disabled={sending || !draft.trim()}
														className={`wa-send-button grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-40 ${!draft.trim() ? 'max-[768px]:hidden' : ''}`}
														style={{ background: GRADIENT, boxShadow: GLOW }}
													>
														{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
													</button>
												</div>
											)}
										</form>
									) : (
										<div className="border-t border-slate-100 p-3 text-center text-sm font-bold text-slate-400 dark:border-slate-800">
											{t.readOnly}
										</div>
									)}
									</div>
								</>
							)}
						</section>
					</Card>
				)}

				{activeTab === 'calls' && (
					<MobileCallsView logs={logs} labels={t} locale={locale} loading={tabLoading} />
				)}

				{activeTab === 'groups' && (
					tabLoading ? (
						<Card className="flex min-h-[600px] items-center justify-center p-4">
							<TabLoading label={t.loading} />
						</Card>
					) : (
						<div className="grid h-full min-h-[600px] gap-4 min-[769px]:grid-cols-[minmax(280px,360px)_1fr]">
							<Card className="flex min-h-0 flex-col overflow-hidden">
								<div className="shrink-0 p-4 pb-3">
									<CardHeader
										icon={Users}
										title={t.groups}
										right={
											<button type="button" aria-label={t.refresh} onClick={() => loadTabData('groups')} className="rounded-xl border border-slate-200 p-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" title={t.refresh}>
												<RefreshCw size={15} />
											</button>
										}
									/>
								</div>
								<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 nice-scroll">
									{groups.length === 0 ? (
										<Empty icon={Users} title={t.noGroups} />
									) : (
										<div className="space-y-2">
											{groups.map(group => (
												<button
													type="button"
													key={group.id}
													onClick={() => openGroupDetails(group)}
													className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all ${selectedGroup?.id === group.id
														? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] dark:bg-slate-800'
														: 'border-slate-200 hover:border-[var(--color-primary-200)] dark:border-slate-700'
														}`}
												>
													<Avatar label={group.subject} size={11} />
													<div className="min-w-0 flex-1">
														<p className="truncate font-black">{group.subject}</p>
														<p className="text-xs text-slate-500">
															{group.participantCount || group.participants?.length || 0} {t.groupParticipants.toLowerCase()}
														</p>
													</div>
													<MessageCircle size={15} className="text-slate-400" />
												</button>
											))}
										</div>
									)}
								</div>
							</Card>

							<Card className="flex min-h-0 flex-col overflow-hidden">
								{!selectedGroup ? (
									<div className="p-5">
										<Empty icon={Users} title={t.groupDetails} hint={t.selectConversation} />
									</div>
								) : (
									<>
										<div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
											<Avatar label={selectedGroup.subject} size={16} />
											<div className="min-w-0 flex-1">
												<h2 className="truncate text-xl font-black">{selectedGroup.subject}</h2>
												<p className="mt-1 text-sm text-slate-500">
													{selectedGroup.participantCount || selectedGroup.participants?.length || 0} {t.groupParticipants.toLowerCase()}
												</p>
											</div>
											<button
												type="button"
												onClick={() => openGroupChat(selectedGroup)}
												disabled={!selectedGroup.conversationId}
												className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
												style={{ background: GRADIENT }}
											>
												<MessageCircle size={16} /> {t.openGroupChat}
											</button>
										</div>

										<div className="min-h-0 flex-1 overflow-y-auto p-5 nice-scroll">
											{loadingGroup ? (
												<div className="grid min-h-48 place-items-center">
													<Loader2 size={28} className="animate-spin text-[var(--color-primary-500)]" />
												</div>
											) : (
												<div className="space-y-5">
													<div className="grid gap-3 sm:grid-cols-2">
														<div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
															<p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t.groupDescription}</p>
															<p className="mt-2 text-sm">{selectedGroup.description || '—'}</p>
														</div>
														<div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
															<p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t.groupOwner}</p>
															<p className="mt-2 text-sm">{String(selectedGroup.ownerWaId || '—').replace(/@.*$/, '')}</p>
														</div>
													</div>
													<div>
														<h3 className="mb-3 flex items-center gap-2 font-black">
															<Users size={16} className="text-[var(--color-primary-500)]" />
															{t.groupParticipants}
														</h3>
														<div className="grid gap-2 sm:grid-cols-2">
															{(selectedGroup.participants || []).map(participant => (
																<div key={participant.id || participant.waId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
																	<Avatar label={participant.displayName || participant.waId} size={9} />
																	<div className="min-w-0 flex-1">
																		<p className="truncate text-sm font-bold">{participant.displayName || String(participant.waId).replace(/@.*$/, '')}</p>
																		<p className="truncate text-xs text-slate-400">{String(participant.waId).replace(/@.*$/, '')}</p>
																	</div>
																	{participant.isAdmin && (
																		<span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-600 dark:bg-amber-950/30">
																			{t.groupAdmins}
																		</span>
																	)}
																</div>
															))}
														</div>
														{!selectedGroup.participants?.length && (
															<p className="py-8 text-center text-sm text-slate-400">{t.noGroups}</p>
														)}
													</div>
												</div>
											)}
										</div>
									</>
								)}
							</Card>
						</div>
					)
				)}

				{activeTab === 'statuses' && (
					<div className="wa-statuses-page space-y-4">
						<Card className="wa-statuses-card p-4">
							<CardHeader
								icon={Zap}
								title={t.statuses}
								right={
									<button
										type="button"
										onClick={() => loadTabData('statuses', true)}
										disabled={syncingStatuses}
										className="rounded-xl border border-slate-200 p-2 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
										title={t.refresh}
									>
										<RefreshCw size={15} className={syncingStatuses ? 'animate-spin' : undefined} />
									</button>
								}
							/>
							{canUseWhatsApp && (
								<form onSubmit={publishStory} className="mb-4 flex gap-2">
									<input
										aria-label={t.statusUpdate}
										value={statusDraft}
										onChange={event => setStatusDraft(event.target.value)}
										placeholder={t.statusUpdate}
										maxLength={700}
										className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800"
									/>
									<button
										type="submit"
										disabled={publishingStatus || !statusDraft.trim()}
										className="h-11 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50"
										style={{ background: GRADIENT, boxShadow: GLOW }}
									>
										{publishingStatus ? (
											<Loader2 size={15} className="animate-spin" />
										) : (
											t.publishStatus
										)}
									</button>
								</form>
							)}
							{syncingStatuses && !tabLoading && (
								<p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
									<Loader2 size={13} className="animate-spin" />
									{t.syncingStatuses}
								</p>
							)}
							{tabLoading ? (
								<TabLoading label={t.loading} />
							) : statuses.length === 0 ? (
								<Empty
									icon={Zap}
									title={
										!isAccountConnected
											? t.connectToSeeStories
											: statusFetchHint === 'whatsapp_session_not_ready' ||
												['connecting', 'qr_pending'].includes(
													selectedAccount?.status,
												)
												? t.storiesSessionSyncing
												: statusFetchHint === 'whatsapp_not_connected'
													? t.connectToSeeStories
													: statusFetchHint === 'whatsapp_stories_sync_failed'
														? t.storiesSyncFailed
														: statusFetchHint === 'whatsapp_stories_empty'
															? t.storiesEmptyAfterSync
															: t.noStatuses
									}
								/>
							) : (
								<div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-3 gap-y-5">
									{groupedStatuses.map(story => {
										const name =
											story.latest.contactName ||
											(story.latest.isOwn
												? selectedAccount?.label || t.accounts
												: String(story.senderWaId).replace(/@.*$/, ''));
										const viewed = story.isViewed;
										const readCount = story.items.length - story.unviewedCount;
										return (
											<button
												type="button"
												key={story.senderWaId}
												onClick={() => openStoryGroup(story)}
												className="group text-center transition-transform hover:-translate-y-0.5"
											>
												<div className="relative mx-auto h-20 w-20 transition-transform duration-200 group-hover:scale-105">
													<StoryRing
														size={80}
														strokeWidth={3}
														segmentsViewed={story.items.map(item => viewedStatusIds.has(item.id))}
														idSuffix={String(story.senderWaId).replace(/[^a-zA-Z0-9_-]/g, '_')}
													/>
													<div className="absolute inset-[6px] grid place-items-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md dark:border-slate-900 dark:bg-slate-900">
														<StoryThumbnail
															label={name}
															size={16}
															viewed={viewed}
															thumbUrl={storyThumbs[story.latest.id]?.url}
															thumbType={storyThumbs[story.latest.id]?.type}
														/>
													</div>
												</div>
												<p className={`mt-2 truncate text-xs ${viewed ? 'font-semibold text-slate-500' : 'font-bold'}`}>
													{name}
												</p>
												<p className="text-[10px] text-slate-400">{relativeTime(story.latest.publishedAt, relativeTimeNow, locale)}</p>
												<span
													className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${viewed
														? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
														: 'text-white'
														}`}
													style={viewed ? undefined : { background: GRADIENT }}
												>
													{readCount}/{story.items.length}
												</span>
											</button>
										);
									})}
								</div>
							)}
						</Card>

						{selectedStatus && (
							<div
								role="dialog"
								aria-modal="true"
								aria-label={t.storyFrom}
								className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm"
								onClick={closeStory}
								onKeyDown={event => {
									if (event.key === 'Escape') closeStory();
								}}
							>
								<div
									className="relative flex h-[min(760px,92vh)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl"
									onClick={event => event.stopPropagation()}
									onMouseEnter={() => setStoryPaused(true)}
									onMouseLeave={() => setStoryPaused(false)}
								>
									<div className="absolute inset-x-3 top-3 z-10 flex gap-1">
										{(storyQueue.length ? storyQueue : [selectedStatus]).map((item, index) => (
											<div key={item.id || index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
												<div
													ref={index === storyIndex ? storyProgressBarRef : undefined}
													className="h-full bg-white"
													style={{
														width:
															index < storyIndex
																? '100%'
																: index === storyIndex
																	? `${storyProgress}%`
																	: '0%',
													}}
												/>
											</div>
										))}
									</div>
									<div className="absolute inset-x-0 top-5 z-40 flex items-center gap-3 px-4 py-3 pointer-events-none">
										<div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-3">
											<Avatar label={selectedStatus.contactName || selectedStatus.senderWaId} size={10} />
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-black">
													{selectedStatus.contactName || (selectedStatus.isOwn ? selectedAccount?.label : String(selectedStatus.senderWaId).replace(/@.*$/, ''))}
												</p>
												<p className="text-[11px] text-white/60">{new Date(selectedStatus.publishedAt).toLocaleString()}</p>
											</div>
										</div>
										<button
											type="button"
											onClick={event => {
												event.preventDefault();
												event.stopPropagation();
												closeStory();
											}}
											className="pointer-events-auto relative z-50 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
											aria-label="Close story"
										>
											<X size={19} />
										</button>
									</div>
									<button
										type="button"
										aria-label="Previous story"
										onClick={() => goStory(-1)}
										className="absolute bottom-0 left-0 top-24 z-20 flex w-1/3 cursor-w-resize items-center justify-start bg-transparent p-3"
									>
										{storyQueue.length > 1 && storyIndex > 0 && (
											<span className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50">
												<ChevronLeft size={20} />
											</span>
										)}
									</button>
									<button
										type="button"
										aria-label="Next story"
										onClick={() => goStory(1)}
										className="absolute bottom-0 right-0 top-24 z-20 flex w-1/3 cursor-e-resize items-center justify-end bg-transparent p-3"
									>
										{storyQueue.length > 1 && storyIndex < storyQueue.length - 1 && (
											<span className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50">
												<ChevronRight size={20} />
											</span>
										)}
									</button>
									<div className="relative z-10 flex min-h-0 flex-1 items-center justify-center pt-20 pointer-events-none">
										{loadingStory ? (
											<Loader2 size={32} className="animate-spin" />
										) : String(selectedStatus.type).toLowerCase().includes('video') && statusMediaUrl ? (
											<video
												src={statusMediaUrl}
												controls
												autoPlay
												onLoadedMetadata={event => {
													if (event.target.duration) setStoryDurationMs(event.target.duration * 1000);
												}}
												onError={() => {
													setStatusMediaUrl(null);
													toast.error(t.mediaUnavailable);
												}}
												className="pointer-events-auto max-h-full w-full object-contain"
											/>
										) : statusMediaUrl ? (
											<img
												src={statusMediaUrl}
												alt={selectedStatus.caption || 'WhatsApp story'}
												className="max-h-full w-full object-contain"
												onError={() => {
													setStatusMediaUrl(null);
													toast.error(t.mediaUnavailable);
												}}
											/>
										) : (
											<div className={`grid h-full w-full place-items-center bg-gradient-to-br ${gradientFor(selectedStatus.providerStatusId)}`}>
												<p className="max-w-sm whitespace-pre-wrap px-8 text-center text-2xl font-black leading-relaxed">
													{selectedStatus.caption || t.mediaUnavailable}
												</p>
											</div>
										)}
									</div>
									{selectedStatus.caption && statusMediaUrl && (
										<p className="relative z-30 bg-black/35 px-5 py-4 text-center text-sm">{selectedStatus.caption}</p>
									)}
								</div>
							</div>
						)}
					</div>
				)}

				{activeTab === 'notifications' && (
					<Card className="p-4">
						<CardHeader icon={Bell} title={t.notifications} />
						{tabLoading ? (
							<TabLoading label={t.loading} />
						) : logs.length === 0 ? (
							<Empty icon={Bell} title={t.noLogs} />
						) : (
							<div className="space-y-2">
								{logs.map(log => {
									const isError = log.event.includes('error');
									return (
										<div key={log.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
											<div className={`mt-0.5 rounded-lg p-1.5 ${isError ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
												{isError ? <AlertTriangle size={13} className="text-rose-500" /> : <CheckCircle2 size={13} className="text-emerald-500" />}
											</div>
											<div>
												<p className="font-bold">{log.event}</p>
												<p className="text-sm text-slate-500">{log.message || new Date(log.created_at).toLocaleString()}</p>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</Card>
				)}

				{activeTab === 'reports' && (
					<Card className="p-4">
						<CardHeader icon={TrendingUp} title={t.reports} />
						{tabLoading ? (
							<TabLoading label={t.loading} />
						) : report ? (
							<>
								<div className="grid gap-3 min-[769px]:grid-cols-[1.3fr_1fr]">
									<div className="rounded-2xl p-5 text-white" style={{ background: GRADIENT, boxShadow: GLOW }}>
										<div className="flex items-start justify-between">
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-white/70">{t.totalMessages}</p>
												<p className="mt-1 text-4xl font-black tabular-nums">{messagesTotal}</p>
											</div>
											<div className="rounded-xl bg-white/15 p-2.5">
												<MessageCircle size={20} />
											</div>
										</div>
										<div className="mt-5">
											<div className="flex h-2.5 overflow-hidden rounded-full bg-white/15">
												{inboundTotal > 0 && (
													<div className="bg-white" style={{ width: `${(inboundTotal / deliveryTotal) * 100}%` }} />
												)}
												{outboundTotal > 0 && (
													<div className="bg-white/55" style={{ width: `${(outboundTotal / deliveryTotal) * 100}%` }} />
												)}
												{failedTotal > 0 && (
													<div className="bg-rose-300" style={{ width: `${(failedTotal / deliveryTotal) * 100}%` }} />
												)}
											</div>
											<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-white/80">
												<span className="flex items-center gap-1.5">
													<span className="h-2 w-2 rounded-full bg-white" /> {t.inbound} · {inboundTotal}
												</span>
												<span className="flex items-center gap-1.5">
													<span className="h-2 w-2 rounded-full bg-white/55" /> {t.outbound} · {outboundTotal}
												</span>
												{failedTotal > 0 && (
													<span className="flex items-center gap-1.5">
														<span className="h-2 w-2 rounded-full bg-rose-300" /> {t.failed} · {failedTotal}
													</span>
												)}
											</div>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
											<div className="flex items-center gap-1.5 text-slate-400">
												<Clock size={13} />
												<p className="text-xs font-medium">{t.avgResponse}</p>
											</div>
											<p className="mt-2 text-2xl font-black tabular-nums">{formatDuration(report.averageResponseSeconds)}</p>
										</div>
										<div
											className={`rounded-2xl border p-4 ${failedTotal > 0
												? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20'
												: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'
												}`}
										>
											<div className={`flex items-center gap-1.5 ${failedTotal > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
												{failedTotal > 0 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
												<p className="text-xs font-medium">{t.failed}</p>
											</div>
											<p className={`mt-2 text-2xl font-black tabular-nums ${failedTotal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
												{failedTotal > 0 ? failedTotal : t.delivered}
											</p>
										</div>
										{otherReportEntries.map(([key, value]) => {
											const meta = metricMeta(key);
											return (
												<StatTile key={key} icon={meta.icon} label={titleCaseKey(key)} value={value} color={meta.color} bg={meta.bg} />
											);
										})}
									</div>
								</div>
								{report.staff?.length > 0 && (
									<div className="mt-5">
										<p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{t.performance}</p>
										<div className="space-y-2">
											{report.staff.map(item => {
												const max = Math.max(...report.staff.map(s => s.sentMessages), 1);
												return (
													<div key={item.userId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
														<Avatar label={item.name} size={9} />
														<div className="min-w-0 flex-1">
															<div className="mb-1 flex items-center justify-between gap-2">
																<span className="truncate font-bold">{item.name}</span>
																<span className="shrink-0 text-sm font-bold text-[var(--color-primary-500)]">{item.sentMessages}</span>
															</div>
															<div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
																<div
																	className="h-full rounded-full"
																	style={{
																		width: `${(item.sentMessages / max) * 100}%`,
																		background: GRADIENT,
																	}}
																/>
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</>
						) : (
							<Empty icon={TrendingUp} title={t.noReportData} />
						)}
					</Card>
				)}

				{activeTab === 'settings' && (
					tabLoading ? (
						<Card className="p-4">
							<TabLoading label={t.loading} />
						</Card>
					) : (
						<div className="space-y-4">
							<div
								role="tablist"
								aria-label={t.settings}
								className="nice-scroll flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
							>
								{[
									{ id: 'ai', label: t.settingsAi, icon: Sparkles },
									{ id: 'demo', label: t.settingsDemo, icon: Zap },
									{ id: 'notifications', label: t.settingsNotifications, icon: Bell },
									{ id: 'privacy', label: t.settingsPrivacy, icon: ShieldCheck },
									{ id: 'access', label: t.settingsAccess, icon: Users },
								].map(item => {
									const Icon = item.icon;
									const selected = settingsSection === item.id;
									return (
										<button
											key={item.id}
											type="button"
											role="tab"
											aria-selected={selected}
											onClick={() => setSettingsSection(item.id)}
											className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-black transition-colors ${
												selected
													? 'bg-violet-600 text-white shadow-sm'
													: 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
											}`}
										>
											<Icon size={15} />
											{item.label}
										</button>
									);
								})}
							</div>

							{settingsSection === 'ai' && accountId && (
								<WhatsAppAiSettings
									locale={locale}
									settings={whatsappAi.settings}
									loading={whatsappAi.settingsLoading}
									saving={whatsappAi.settingsSaving}
									error={whatsappAi.settingsError}
									onSave={whatsappAi.saveSettings}
								/>
							)}
							{settingsSection === 'demo' && (
								<DemoModeSettings
									locale={locale}
									realAccountId={accountId}
									realConversations={conversations}
								/>
							)}
							{settingsSection === 'notifications' && (
								<Card className="p-4">
								<CardHeader icon={Smartphone} title={t.pushNotifications} />
								<div className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
									<div className="max-w-2xl">
										<p className="text-sm font-bold">
											{pushPermission === 'granted'
												? t.pushEnabled
												: pushPermission === 'denied'
													? t.pushDenied
													: pushPermission === 'unsupported'
														? t.pushUnsupported
														: t.enablePush}
										</p>
										<p className="mt-1 text-xs leading-relaxed text-slate-500">
											{t.pushNotificationsHint}
										</p>
									</div>
									<button
										type="button"
										onClick={() => subscribeToWhatsAppPush(true)}
										disabled={
											enablingPush ||
											pushPermission === 'granted' ||
											pushPermission === 'unsupported'
										}
										className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
										style={{ background: GRADIENT, boxShadow: GLOW }}
									>
										{enablingPush ? (
											<Loader2 size={15} className="animate-spin" />
										) : pushPermission === 'granted' ? (
											<CheckCircle2 size={15} />
										) : (
											<Bell size={15} />
										)}
										{pushPermission === 'granted' ? t.pushEnabled : t.enablePush}
									</button>
								</div>
								</Card>
							)}
							{settingsSection === 'privacy' && (
								<Card className="p-4">
								<CardHeader
									icon={ShieldCheck}
									title={t.privacySettings}
									right={
										<button
											type="button"
											onClick={savePrivacySettings}
											className="rounded-xl px-4 py-2 text-sm font-bold text-white transition-transform hover:-translate-y-px"
											style={{ background: GRADIENT, boxShadow: GLOW }}
										>
											{t.savePrivacy}
										</button>
									}
								/>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
										<div>
											<div className="mb-2 flex items-center gap-2.5">
												<div className="rounded-lg bg-[var(--color-primary-50)] p-1.5 dark:bg-[var(--color-primary-950)]/40">
													<EyeOff size={14} className="text-[var(--color-primary-500)]" />
												</div>
												<p className="text-sm font-black">{t.hideStatusViews}</p>
											</div>
											<p className="text-xs text-slate-500">{t.hideStatusViewsHint}</p>
											<div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900 dark:bg-amber-950/20">
												<AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
												<p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
													{t.hideStatusViewsWarning}
												</p>
											</div>
										</div>
										<div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
											<span className={`text-xs font-bold ${privacySettings.hideStatusViewReceipts ? 'text-emerald-600' : 'text-slate-400'}`}>
												{privacySettings.hideStatusViewReceipts ? t.privacyOn : t.privacyOff}
											</span>
											<Toggle
												label={t.hideStatusViews}
												checked={Boolean(privacySettings.hideStatusViewReceipts)}
												onChange={value =>
													setPrivacySettings(current => ({
														...current,
														hideStatusViewReceipts: value,
													}))
												}
											/>
										</div>
									</div>
									<div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
										<div>
											<div className="mb-2 flex items-center gap-2.5">
												<div className="rounded-lg bg-[var(--color-secondary-50)] p-1.5 dark:bg-[var(--color-secondary-950)]/40">
													<CheckCheck size={14} className="text-[var(--color-secondary-500)]" />
												</div>
												<p className="text-sm font-black">{t.readReceiptMode}</p>
											</div>
											<p className="text-xs text-slate-500">{t.readReceiptModeHint}</p>
										</div>
										<select
											aria-label={t.readReceiptMode}
											value={privacySettings.readReceiptMode}
											onChange={event =>
												setPrivacySettings(current => ({
													...current,
													readReceiptMode: event.target.value,
												}))
											}
											className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800"
										>
											<option value="on_open">{t.readOnOpen}</option>
											<option value="on_reply">{t.readOnReply}</option>
											<option value="manual">{t.readManual}</option>
											<option value="never">{t.readNever}</option>
										</select>
									</div>
								</div>
								</Card>
							)}
							{settingsSection === 'access' && (
								<div className="grid gap-4 min-[769px]:grid-cols-[340px_1fr]">
								<Card className="p-4">
									<h2 className="mb-3 flex items-center gap-2 text-sm font-black">
										<UserPlus size={14} className="text-[var(--color-primary-500)]" />
										{t.addStaff}
									</h2>
									<div className="relative mb-3">
										<Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
										<input
											aria-label={t.searchStaff}
											value={staffSearch}
											onChange={event => setStaffSearch(event.target.value)}
											placeholder={t.searchStaff}
											className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 text-sm outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800"
										/>
									</div>
									<div className="max-h-[440px] space-y-1.5 overflow-y-auto nice-scroll">
										{availableStaff.length === 0 ? (
											<p className="p-4 text-center text-xs text-slate-400">{t.allStaffAdded}</p>
										) : (
											availableStaff.map(user => (
												<button
													key={user.id}
													onClick={() => addStaffAccess(user)}
													className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-2.5 text-start transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] dark:border-slate-700 dark:hover:bg-slate-800"
												>
													<Avatar label={user.name} size={8} />
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-bold">{user.name}</p>
														{user.email && <p className="truncate text-[11px] text-slate-400">{user.email}</p>}
													</div>
													<span
														className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white"
														style={{ background: GRADIENT }}
													>
														<Plus size={13} />
													</span>
												</button>
											))
										)}
									</div>
								</Card>
								<Card className="p-4">
									<CardHeader
										icon={ShieldCheck}
										title={t.settings}
										subtitle={accountAccess.length > 0 ? `${accountAccess.length} ${t.staffOnAccount}` : t.permissions}
										right={
											<button
												type="button"
												onClick={saveAccess}
												className="rounded-xl px-4 py-2 text-sm font-bold text-white transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-40"
												style={{ background: GRADIENT, boxShadow: GLOW }}
											>
												{t.saveAccess}
											</button>
										}
									/>
									{accountAccess.length === 0 ? (
										<div className="space-y-5">
											<Empty icon={ShieldCheck} title={t.noStaffAccess} hint={t.noStaffAccessHint} />
											<div className="grid gap-2 sm:grid-cols-5">
												{[
													{ key: 'View', desc: t.permView },
													{ key: 'Use', desc: t.permUse },
													{ key: 'Manage', desc: t.permManage },
													{ key: 'Assign', desc: t.permAssign },
													{ key: 'Transfer', desc: t.permTransfer },
												].map(item => (
													<div key={item.key} className="rounded-xl border border-dashed border-slate-200 p-3 text-center dark:border-slate-700">
														<p className="text-xs font-black">{item.key}</p>
														<p className="mt-1 text-[10px] leading-snug text-slate-400">{item.desc}</p>
													</div>
												))}
											</div>
										</div>
									) : (
										<div className="overflow-x-auto">
											<div className="min-w-[720px]">
												<div className="grid grid-cols-[1fr_repeat(5,90px)] gap-2 border-b border-slate-100 p-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
													<span>Staff</span>{['View', 'Use', 'Manage', 'Assign', 'Transfer'].map(label => <span key={label} className="text-center">{label}</span>)}
												</div>
												{accountAccess.map(row => (
													<div key={row.userId} className="grid grid-cols-[1fr_repeat(5,90px)] items-center gap-2 border-b border-slate-100 p-2.5 dark:border-slate-800">
														<div className="flex items-center gap-2.5">
															<Avatar label={row.user?.name} size={8} />
															<div className="min-w-0 flex-1">
																<p className="truncate font-bold">{row.user?.name}</p>
																<p className="truncate text-xs text-slate-500">{row.user?.email}</p>
															</div>
															<button
																type="button"
																aria-label={`Remove ${row.user?.name || 'staff'}`}
																onClick={() =>
																	setAccountAccess(current =>
																		current.filter(item => item.userId !== row.userId),
																	)
																}
																className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
															>
																<X size={14} />
															</button>
														</div>
														{['canView', 'canUse', 'canManage', 'canAssign', 'canTransfer'].map(flag => (
															<div key={flag} className="flex justify-center">
																<Toggle
																	label={`${row.user?.name || 'Staff'} ${flag}`}
																	checked={Boolean(row[flag])}
																	onChange={value => setAccessFlag(row.userId, flag, value)}
																/>
															</div>
														))}
													</div>
												))}
											</div>
										</div>
									)}
								</Card>
								</div>
							)}
						</div>
					)
				)}
			</div>
			{!(activeTab === 'chats' && conversationId) && (
				<MobileWhatsAppNav
					activeTab={activeTab}
					onSelect={tab => void loadTabData(tab)}
					labels={t}
					unreadCount={unreadConversationCount}
				/>
			)}
			<ConversationActionMenu
				conversation={conversationActionTarget}
				anchorRect={conversationActionAnchor}
				locale={locale}
				canAssign={!demo.settings.enabled && canAssignWhatsApp}
				busy={
					conversationActionTarget
						? pendingPreferenceActions.has(`pin:${conversationActionTarget.id}`) ||
							pendingPreferenceActions.has(`favorite:${conversationActionTarget.id}`)
						: false
				}
				onClose={closeConversationActions}
				onAction={handleConversationAction}
			/>
			{conversationAssignTarget && (
				<div className="fixed inset-0 z-[110] grid place-items-end bg-black/25 p-4 backdrop-blur-sm sm:place-items-center" onClick={() => setConversationAssignTarget(null)}>
					<div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div>
								<h3 className="text-lg font-bold">{locale === 'ar' ? 'تعيين المحادثة' : 'Assign conversation'}</h3>
								<p className="text-sm text-[#667781]">{conversationTitle(conversationAssignTarget)}</p>
							</div>
							<button type="button" onClick={() => setConversationAssignTarget(null)} className="rounded-full p-2 hover:bg-slate-100"><X size={18} /></button>
						</div>
						<div className="max-h-[58vh] overflow-y-auto p-2">
							<button
								type="button"
								onClick={() => {
									void assignConversationTarget(conversationAssignTarget.id, '');
									setConversationAssignTarget(null);
								}}
								className="flex w-full items-center gap-3 rounded-xl p-3 text-start hover:bg-slate-100"
							>
								<div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"><X size={18} /></div>
								<span className="font-semibold">{locale === 'ar' ? 'بدون تعيين' : 'Unassigned'}</span>
							</button>
							{staff.map(user => (
								<button
									key={user.id}
									type="button"
									onClick={() => {
										void assignConversationTarget(conversationAssignTarget.id, user.id);
										setConversationAssignTarget(null);
									}}
									className="flex w-full items-center gap-3 rounded-xl p-3 text-start hover:bg-slate-100"
								>
									<Avatar label={user.name} size={10} src={user.avatarUrl} />
									<div className="min-w-0 flex-1">
										<p className="truncate font-semibold">{user.name}</p>
										{user.email && <p className="truncate text-xs text-[#667781]">{user.email}</p>}
									</div>
									{conversationAssignTarget.assignedUserId === user.id && <Check size={18} className="text-[#00a884]" />}
								</button>
							))}
						</div>
					</div>
				</div>
			)}
			{conversationInfoTarget && (
				<div className="fixed inset-0 z-[110] grid place-items-end bg-black/25 p-4 backdrop-blur-sm sm:place-items-center" onClick={() => setConversationInfoTarget(null)}>
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-bold">{locale === 'ar' ? 'معلومات المحادثة' : 'Conversation info'}</h3>
							<button type="button" onClick={() => setConversationInfoTarget(null)} className="rounded-full p-2 hover:bg-slate-100"><X size={18} /></button>
						</div>
						<div className="mt-4 flex flex-col items-center text-center">
							<Avatar label={conversationTitle(conversationInfoTarget)} size={20} src={conversationInfoTarget.contact?.avatarUrl} isGroup={conversationInfoTarget.type === 'group'} />
							<h4 className="mt-3 text-xl font-bold">{conversationTitle(conversationInfoTarget)}</h4>
							<p className="text-sm text-[#667781]">
								{conversationInfoTarget.contact?.phoneNumber ||
									conversationInfoTarget.contact?.waId ||
									conversationInfoTarget.providerChatId ||
									'—'}
							</p>
						</div>
						<div className="mt-5 space-y-3 text-sm">
							{[
								[locale === 'ar' ? 'النوع' : 'Type', conversationInfoTarget.type || 'chat'],
								[locale === 'ar' ? 'الحساب' : 'Account', selectedAccount?.label],
								[locale === 'ar' ? 'تم التعيين إلى' : 'Assigned to', conversationInfoTarget.assignedUser?.name || (locale === 'ar' ? 'بدون تعيين' : 'Unassigned')],
								[locale === 'ar' ? 'رسائل غير مقروءة' : 'Unread messages', Number(conversationInfoTarget.unreadCount) || 0],
								[locale === 'ar' ? 'آخر رسالة' : 'Last message', conversationInfoTarget.lastMessageAt ? new Date(conversationInfoTarget.lastMessageAt).toLocaleString() : '—'],
							].map(([label, value]) => (
								<div key={label} className="flex items-start justify-between gap-4 border-b pb-2 last:border-0">
									<span className="text-[#667781]">{label}</span>
									<strong className="max-w-[60%] text-end">{value || '—'}</strong>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
			{forwardingMessage && (
				<div className="fixed inset-0 z-[110] grid place-items-end bg-black/35 p-4 sm:place-items-center" onClick={() => setForwardingMessage(null)}>
					<div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<h3 className="text-lg font-bold">{locale === 'ar' ? 'إعادة توجيه إلى' : 'Forward to'}</h3>
							<button type="button" onClick={() => setForwardingMessage(null)} className="rounded-full p-2 hover:bg-slate-100"><X size={18} /></button>
						</div>
						<div className="max-h-[58vh] overflow-y-auto p-2">
							{conversations
								.filter(item => item.id !== conversationId && item.accountId === selectedConversation?.accountId)
								.map(item => (
									<button
										key={item.id}
										type="button"
										onClick={() => void forwardSelectedMessage(item.id)}
										disabled={pendingMessageActions.has(forwardingMessage.id)}
										className="flex w-full items-center gap-3 rounded-xl p-3 text-start hover:bg-slate-100 disabled:opacity-50"
									>
										<Avatar label={conversationTitle(item)} size={10} src={item.contact?.avatarUrl} isGroup={item.type === 'group'} />
										<span className="min-w-0 flex-1 truncate font-semibold">{conversationTitle(item)}</span>
										<Send size={18} className="text-[#00a884]" />
									</button>
								))}
						</div>
					</div>
				</div>
			)}
			{deleteMessageTarget && (
				<div className="fixed inset-0 z-[110] grid place-items-end bg-black/35 p-4 sm:place-items-center" onClick={() => setDeleteMessageTarget(null)}>
					<div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
						<div className="px-5 pb-3 pt-5">
							<h3 className="text-lg font-bold">{locale === 'ar' ? 'حذف الرسالة؟' : 'Delete message?'}</h3>
							<p className="mt-1 text-sm text-[#667781]">{locale === 'ar' ? 'اختر طريقة حذف هذه الرسالة.' : 'Choose how this message should be deleted.'}</p>
						</div>
						<button type="button" onClick={() => void deleteSelectedMessage('local')} className="flex w-full items-center justify-between border-t px-5 py-4 font-semibold text-[#d70040] hover:bg-slate-50">
							{locale === 'ar' ? 'حذف لدي' : 'Delete for me'} <Trash2 size={20} />
						</button>
						{deleteMessageTarget.direction === 'outbound' && (
							<button type="button" onClick={() => void deleteSelectedMessage('everyone')} className="flex w-full items-center justify-between border-t px-5 py-4 font-semibold text-[#d70040] hover:bg-slate-50">
								{locale === 'ar' ? 'حذف لدى الجميع' : 'Delete for everyone'} <Users size={20} />
							</button>
						)}
						<button type="button" onClick={() => setDeleteMessageTarget(null)} className="w-full border-t px-5 py-4 font-semibold hover:bg-slate-50">
							{locale === 'ar' ? 'إلغاء' : 'Cancel'}
						</button>
					</div>
				</div>
			)}
			{messageInfo && (
				<div className="fixed inset-0 z-[110] grid place-items-end bg-black/35 p-4 sm:place-items-center" onClick={() => setMessageInfo(null)}>
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-bold">{locale === 'ar' ? 'معلومات الرسالة' : 'Message info'}</h3>
							<button type="button" onClick={() => setMessageInfo(null)} className="rounded-full p-2 hover:bg-slate-100"><X size={18} /></button>
						</div>
						{loadingMessageInfo ? (
							<div className="grid min-h-40 place-items-center"><Loader2 className="animate-spin text-[#00a884]" /></div>
						) : (
							<div className="mt-4 space-y-3 text-sm">
								<div className="rounded-xl bg-slate-50 p-3">
									<p className="font-semibold">{messageInfo.message?.text || messageInfo.type}</p>
									<p className="mt-1 text-xs text-slate-500">{new Date(messageInfo.sentAt).toLocaleString()}</p>
								</div>
								{[
									[locale === 'ar' ? 'الحالة' : 'Status', messageInfo.status],
									[locale === 'ar' ? 'الاتجاه' : 'Direction', messageInfo.direction],
									[locale === 'ar' ? 'تم التسليم' : 'Delivered', messageInfo.provider?.acknowledgements?.deliveryRemaining === 0 ? '✓' : '—'],
									[locale === 'ar' ? 'تمت القراءة' : 'Read', messageInfo.provider?.acknowledgements?.readRemaining === 0 ? '✓✓' : '—'],
									[locale === 'ar' ? 'تم التشغيل' : 'Played', messageInfo.provider?.acknowledgements?.playedRemaining === 0 ? '✓' : '—'],
								].map(([label, value]) => (
									<div key={label} className="flex justify-between gap-4 border-b pb-2 last:border-0"><span className="text-slate-500">{label}</span><strong>{value || '—'}</strong></div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
			<TranscriptionDialog
				open={Boolean(transcriptionMessage)}
				onOpenChange={open => {
					if (!open) setTranscriptionMessage(null);
				}}
				loadFile={loadSelectedTranscriptionFile}
			/>
			<ChatImageViewer
				images={chatImages}
				activeId={activeChatImageId}
				onClose={() => setActiveChatImageId(null)}
				onChange={setActiveChatImageId}
			/>
		</div>
	);
}
