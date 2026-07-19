'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
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
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock,
	Download,
	EyeOff,
	FileText,
	Image as ImageIcon,
	Loader2,
	LogOut,
	Maximize2,
	MessageCircle,
	Mic,
	Paperclip,
	Pause,
	Play,
	Plus,
	RefreshCw,
	Search,
	Send,
	Settings,
	ShieldCheck,
	Smartphone,
	Sparkles,
	Square,
	StickyNote,
	TrendingUp,
	User,
	UserPlus,
	Users,
	Wifi,
	WifiOff,
	X,
	Zap,
} from 'lucide-react';
import api from '@/utils/axios';
import {
	conversationTitle,
	mergeMessages,
	relativeTime,
	seekRatio,
} from './whatsapp-utils';

const translations = {
	en: {
		title: 'WhatsApp',
		subtitle: 'Accounts, conversations and customer support',
		liveLabel: 'Live workspace',
		accounts: 'Accounts',
		chats: 'Chats',
		stories: 'Stories',
		groups: 'Groups',
		statuses: 'Stories',
		notifications: 'Notifications',
		reports: 'Reports',
		settings: 'Settings',
		newAccount: 'New account',
		accountName: 'Account name',
		connect: 'Connect',
		disconnect: 'Disconnect',
		logout: 'Log out',
		scanQr: 'Scan this QR code from WhatsApp',
		scanQrHint: 'Open WhatsApp on your phone → Linked devices → Link a device',
		noAccounts: 'No WhatsApp accounts yet',
		noAccountsHint: 'Create your first account to start connecting WhatsApp',
		noConversations: 'No conversations yet',
		noAssignedConversations: 'No conversations assigned to you',
		syncingChats: 'Syncing chats from WhatsApp…',
		syncProgress: 'Sync progress',
		selectConversation: 'Select a conversation to start',
		noMessagesYet: 'No messages in this conversation yet',
		loadingMessages: 'Loading messages…',
		mediaUnavailable: 'Media unavailable',
		loadingMedia: 'Loading media…',
		recordVoice: 'Record voice message',
		recordingVoice: 'Recording voice message',
		cancelRecording: 'Cancel recording',
		sendRecording: 'Stop and send',
		microphoneDenied: 'Microphone permission was denied',
		message: 'Write a message',
		sync: 'Sync',
		older: 'Load older messages',
		assign: 'Assign',
		unassign: 'Unassigned',
		publish: 'Publish',
		refresh: 'Refresh',
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
		online: 'Connected',
		offline: 'Not connected',
		connecting: 'Connecting',
		syncingPhone: 'Syncing with phone… keep WhatsApp open on your phone',
		connectStarted: 'WhatsApp session started',
		connectStillSyncing: 'Session started — still syncing with your phone',
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
	},
	ar: {
		title: 'واتساب',
		subtitle: 'إدارة الحسابات والمحادثات ودعم العملاء',
		liveLabel: 'مساحة عمل مباشرة',
		accounts: 'الحسابات',
		chats: 'المحادثات',
		stories: 'الحالات',
		groups: 'المجموعات',
		statuses: 'الحالات',
		notifications: 'الإشعارات',
		reports: 'التقارير',
		settings: 'الإعدادات',
		newAccount: 'حساب جديد',
		accountName: 'اسم الحساب',
		connect: 'ربط الحساب',
		disconnect: 'قطع الاتصال',
		logout: 'تسجيل الخروج',
		scanQr: 'امسح رمز QR من تطبيق واتساب',
		scanQrHint: 'افتح واتساب على هاتفك ← الأجهزة المرتبطة ← ربط جهاز',
		noAccounts: 'لا توجد حسابات واتساب',
		noAccountsHint: 'أنشئ أول حساب لبدء ربط واتساب',
		noConversations: 'لا توجد محادثات بعد',
		noAssignedConversations: 'لا توجد محادثات مسندة إليك',
		syncingChats: 'جارِ مزامنة المحادثات من واتساب…',
		syncProgress: 'تقدم المزامنة',
		selectConversation: 'اختر محادثة للبدء',
		noMessagesYet: 'لا توجد رسائل في هذه المحادثة بعد',
		loadingMessages: 'جارِ تحميل الرسائل…',
		mediaUnavailable: 'تعذر عرض الوسائط',
		loadingMedia: 'جارِ تحميل الوسائط…',
		recordVoice: 'تسجيل رسالة صوتية',
		recordingVoice: 'جارِ تسجيل رسالة صوتية',
		cancelRecording: 'إلغاء التسجيل',
		sendRecording: 'إيقاف وإرسال',
		microphoneDenied: 'تم رفض إذن استخدام الميكروفون',
		message: 'اكتب رسالة',
		sync: 'مزامنة',
		older: 'تحميل رسائل أقدم',
		assign: 'إسناد',
		unassign: 'غير مسندة',
		publish: 'نشر',
		refresh: 'تحديث',
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
		online: 'متصل',
		offline: 'غير متصل',
		connecting: 'جارِ الاتصال',
		syncingPhone: 'جارٍ المزامنة مع الهاتف… أبقِ واتساب مفتوحاً على هاتفك',
		connectStarted: 'تم بدء جلسة واتساب',
		connectStillSyncing: 'بدأت الجلسة — ما زالت المزامنة مع الهاتف جارية',
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

const GRADIENT = 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-secondary-600) 100%)';
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

function gradientFor(seed = '') {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % AVATAR_GRADIENTS.length;
	return AVATAR_GRADIENTS[hash];
}

function ImageMessage({ url, alt, fileName }) {
	const [loaded, setLoaded] = useState(false);
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="group relative mb-1 block w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
			>
				{!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800" />}
				<img
					src={url}
					alt={alt}
					onLoad={() => setLoaded(true)}
					className={`max-h-72 w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
				/>
				<div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/25 group-hover:opacity-100">
					<span className="rounded-full bg-black/50 p-2 text-white">
						<Maximize2 size={16} />
					</span>
				</div>
			</button>
			{open && (
				<div
					role="dialog"
					aria-modal="true"
					className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
					onClick={() => setOpen(false)}
				>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
					>
						<X size={20} />
					</button>
					<a
						href={url}
						download={fileName || true}
						onClick={event => event.stopPropagation()}
						className="absolute start-4 top-4 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
					>
						<Download size={14} />
					</a>
					<img
						src={url}
						alt={alt}
						onClick={event => event.stopPropagation()}
						className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
					/>
				</div>
			)}
		</>
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

function StoryThumbnail({ accountId, status, label, size = 16, viewed = false }) {
	const [url, setUrl] = useState(null);
	const [failed, setFailed] = useState(false);
	const urlRef = useRef(null);
	const type = String(status?.type || '').toLowerCase();
	const isTextStory = type === 'text' || type === 'chat';
	const isVideo = type.includes('video');

	useEffect(() => {
		let cancelled = false;
		if (isTextStory || !accountId || !status?.id) return undefined;
		fetchStatusMediaBlob(accountId, status.id)
			.then(data => {
				if (cancelled) return;
				const objectUrl = URL.createObjectURL(data);
				urlRef.current = objectUrl;
				setUrl(objectUrl);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
			if (urlRef.current) {
				URL.revokeObjectURL(urlRef.current);
				urlRef.current = null;
			}
		};
	}, [accountId, status?.id, isTextStory]);

	if (isTextStory || failed || !url) {
		return <Avatar label={label} size={size} />;
	}
	return (
		<div className={`h-full w-full overflow-hidden rounded-full ${viewed ? 'opacity-80' : ''}`}>
			{isVideo ? (
				<video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
			) : (
				<img
					src={url}
					alt=""
					className="h-full w-full object-cover"
					onError={() => setFailed(true)}
				/>
			)}
		</div>
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
	try {
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (AudioCtx) {
			const ctx = new AudioCtx();
			try {
				const decoded = await ctx.decodeAudioData(buffer.slice(0));
				duration = decoded.duration || 0;
			} finally {
				await ctx.close().catch(() => {});
			}
		}
	} catch {
		/* decodeAudioData can fail for some ogg/opus variants */
	}
	if (!(Number.isFinite(duration) && duration > 0)) {
		duration = await probeAudioDuration(objectUrl);
	}
	return { objectUrl, duration: Number.isFinite(duration) && duration > 0 ? duration : 0 };
}

async function prepareVoicePlayback(sourceUrl, mimeType) {
	const response = await fetch(sourceUrl, { mode: 'cors', credentials: 'omit' });
	if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
	const blob = await response.blob();
	return prepareVoicePlaybackFromBlob(blob, mimeType || blob.type);
}

function VoiceMessage({ url, attachmentId, mine, mimeType, seed, fallbackDuration = 0 }) {
	const audioRef = useRef(null);
	const objectUrlRef = useRef(null);
	const [playing, setPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [playbackUrl, setPlaybackUrl] = useState(null);
	const [duration, setDuration] = useState(
		Number.isFinite(fallbackDuration) && fallbackDuration > 0 ? fallbackDuration : 0,
	);
	const bars = useMemo(() => seededWaveform(seed, 32), [seed]);

	useEffect(() => {
		if (Number.isFinite(fallbackDuration) && fallbackDuration > 0) {
			setDuration(current => (current > 0 ? current : fallbackDuration));
		}
	}, [fallbackDuration]);

	useEffect(() => {
		let cancelled = false;
		setPlaybackUrl(null);
		setCurrentTime(0);
		setPlaying(false);

		const load = async () => {
			if (attachmentId) {
				const { data } = await api.get(`/whatsapp/attachments/${attachmentId}/content`, {
					responseType: 'blob',
				});
				return prepareVoicePlaybackFromBlob(data, mimeType);
			}
			return prepareVoicePlayback(url, mimeType);
		};

		load()
			.then(({ objectUrl, duration: probed }) => {
				if (cancelled) {
					URL.revokeObjectURL(objectUrl);
					return;
				}
				if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = objectUrl;
				setPlaybackUrl(objectUrl);
				if (probed > 0) setDuration(current => (current > 0 ? current : probed));
			})
			.catch(() => {
				if (!cancelled && url) setPlaybackUrl(url);
			});

		return () => {
			cancelled = true;
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
		};
	}, [url, attachmentId, mimeType]);

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

	const seekTo = event => {
		const audio = audioRef.current;
		if (!audio || !duration) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const isRtl =
			typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
		const ratio = seekRatio(event.clientX, rect.left, rect.width, isRtl);
		audio.currentTime = ratio * duration;
		setCurrentTime(audio.currentTime);
	};

	const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

	return (
		<div className={`mb-1 flex items-center gap-2.5 rounded-2xl px-2.5 py-2 ${mine ? 'bg-white/15' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
			<audio ref={audioRef} preload="metadata" src={playbackUrl || undefined} className="hidden" />
			<button
				type="button"
				onClick={toggle}
				disabled={!playbackUrl}
				className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 disabled:opacity-50 ${mine ? 'bg-white' : ''}`}
				style={!mine ? { background: GRADIENT } : undefined}
			>
				{playing ? (
					<Pause size={14} className={mine ? 'text-[var(--color-primary-600)]' : 'text-white'} fill="currentColor" />
				) : (
					<Play size={14} className={`ms-0.5 ${mine ? 'text-[var(--color-primary-600)]' : 'text-white'}`} fill="currentColor" />
				)}
			</button>
			<div className="min-w-0 flex-1">
				<div onClick={seekTo} className="flex h-6 cursor-pointer items-center gap-[2px]">
					{bars.map((h, i) => {
						const played = bars.length > 0 && i / bars.length < progress;
						return (
							<span
								key={i}
								className={`w-[3px] shrink-0 rounded-full transition-colors ${
									played
										? mine
											? 'bg-white'
											: 'bg-[var(--color-primary-500)]'
										: mine
											? 'bg-white/30'
											: 'bg-slate-200 dark:bg-slate-700'
								}`}
								style={{ height: `${h * 100}%` }}
							/>
						);
					})}
				</div>
				<div className={`mt-1 text-[10px] tabular-nums ${mine ? 'text-white/70' : 'text-slate-400'}`}>
					{formatClock(currentTime)} / {formatClock(duration)}
				</div>
			</div>
		</div>
	);
}

export function MediaAttachment({ attachment, mine, labels }) {
	const [url, setUrl] = useState(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const type = String(attachment?.type || '').toLowerCase();

	useEffect(() => {
		let cancelled = false;
		let objectUrl = null;
		if (!attachment?.id) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		setLoading(true);
		api
			.get(`/whatsapp/attachments/${attachment.id}/content`, { responseType: 'blob' })
			.then(({ data: blob }) => {
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
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [attachment?.id]);

	if (loading) {
		return (
			<div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${mine ? 'bg-white/15' : 'bg-black/5'}`}>
				<Loader2 size={14} className="animate-spin" />
				<span>{labels.loadingMedia}</span>
			</div>
		);
	}
	if (failed || !url) {
		return (
			<div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${mine ? 'bg-white/15' : 'bg-black/5'}`}>
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
		return <ImageMessage url={url} alt={attachment.fileName || 'image'} fileName={attachment.fileName} />;
	}
	if (type === 'audio' || type === 'ptt' || type === 'voice') {
		const fallbackDuration = durationFromFileName(attachment.fileName);
		return (
			<VoiceMessage
				url={url}
				mine={mine}
				mimeType={attachment.mimeType}
				seed={String(attachment.id || attachment.fileName || url)}
				fallbackDuration={fallbackDuration}
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
			className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs underline ${mine ? 'bg-white/15' : 'bg-black/5'}`}
		>
			<FileText size={14} />
			<span>{attachment.fileName || attachment.type || 'file'}</span>
		</a>
	);
}

function SyncProgressBanner({ visible, progress, label }) {
	if (!visible) return null;
	const value = Math.max(1, Math.min(100, Number(progress) || 1));
	return (
		<div className="mb-3 overflow-hidden rounded-2xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/80 p-3 dark:border-slate-700 dark:bg-slate-800/80">
			<div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">
				<span className="inline-flex items-center gap-2">
					<Loader2 size={14} className="animate-spin" />
					{label}
				</span>
				<span>{value}%</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-900">
				<div
					className="h-full rounded-full transition-all duration-500"
					style={{
						width: `${value}%`,
						background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))',
					}}
				/>
			</div>
		</div>
	);
}

function isNumericLabel(label = '') {
	const trimmed = label.trim();
	return trimmed.length > 0 && /^\+?[\d\s()-]+$/.test(trimmed) && /\d/.test(trimmed);
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

function Avatar({ label = '?', size = 10, className = '', isGroup = false }) {
	const numeric = !isGroup && isNumericLabel(label);
	return (
		<div
			className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900 ${gradientFor(label)} ${className}`}
			style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: `${size * 1.4}px` }}
		>
			{isGroup ? (
				<Users size={size * 1.3} />
			) : numeric ? (
				<User size={size * 1.3} />
			) : (
				label?.[0]?.toUpperCase() || '?'
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

function Toggle({ checked, onChange }) {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
				checked ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200 dark:bg-slate-700'
			}`}
		>
			<span
				className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
					checked ? 'start-[22px]' : 'start-0.5'
				}`}
			/>
		</button>
	);
}

export default function WhatsAppWorkspace() {
	const locale = useLocale();
	const t = translations[locale] || translations.en;
	const [activeTab, setActiveTab] = useState('accounts');
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
	const [busy, setBusy] = useState(false);
	const [sending, setSending] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [hasMoreMessages, setHasMoreMessages] = useState(true);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [recordingVoice, setRecordingVoice] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [draft, setDraft] = useState('');
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
	const [staffSearch, setStaffSearch] = useState('');
	const fileRef = useRef(null);
	const messageBoxRef = useRef(null);
	const conversationsCacheRef = useRef(new Map());
	const messagesCacheRef = useRef(new Map());
	const statusesCacheRef = useRef(new Map());
	const refreshStatusesFromProviderRef = useRef(null);
	const reloadConversationsTimer = useRef(null);
	const messagesRequestId = useRef(0);
	const olderRequestId = useRef(0);
	const socketRef = useRef(null);
	const accountIdRef = useRef(null);
	const conversationIdRef = useRef(null);
	const watchedConversationRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const recordingStreamRef = useRef(null);
	const recordingChunksRef = useRef([]);
	const recordingTimerRef = useRef(null);
	const recordingSecondsRef = useRef(0);
	const discardRecordingRef = useRef(false);
	const statusMediaUrlRef = useRef(null);
	const storyRequestId = useRef(0);
	const groupRequestId = useRef(0);

	const selectedAccount = useMemo(
		() => accounts.find(item => item.id === accountId) || null,
		[accounts, accountId],
	);
	const selectedConversation = useMemo(
		() => conversations.find(item => item.id === conversationId) || null,
		[conversations, conversationId],
	);
	const currentAccess = selectedAccount?.currentAccess || {};
	const canUseWhatsApp = Boolean(currentAccess.canUse);
	const canManageWhatsApp = Boolean(currentAccess.canManage);
	const canAssignWhatsApp = Boolean(currentAccess.canAssign);

	const subscribeToWhatsAppPush = useCallback(
		async requestPermission => {
			if (
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
			const raw = window.localStorage.getItem(`wa-viewed-statuses:${accountId}`);
			const parsed = raw ? JSON.parse(raw) : [];
			setViewedStatusIds(new Set(Array.isArray(parsed) ? parsed : []));
		} catch {
			setViewedStatusIds(new Set());
		}
	}, [accountId]);

	const markStatusesViewed = useCallback(
		statusIds => {
			const ids = (Array.isArray(statusIds) ? statusIds : [statusIds]).filter(Boolean);
			if (!ids.length) return;
			setViewedStatusIds(current => {
				const next = new Set(current);
				ids.forEach(id => next.add(id));
				if (accountId && typeof window !== 'undefined') {
					window.localStorage.setItem(
						`wa-viewed-statuses:${accountId}`,
						JSON.stringify([...next]),
					);
				}
				return next;
			});
		},
		[accountId],
	);

	const filteredConversations = useMemo(() => {
		const sorted = [...conversations].sort((a, b) => {
			const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
			const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
			return bTime - aTime;
		});
		if (!chatSearch.trim()) return sorted;
		const q = chatSearch.trim().toLowerCase();
		return sorted.filter(conversation =>
			conversationTitle(conversation).toLowerCase().includes(q),
		);
	}, [conversations, chatSearch]);

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
		setAccountId(current => requestedAccount?.id || current || list[0]?.id || null);
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

	const loadConversations = useCallback(async (id, page = 1, append = false, options = {}) => {
		if (!id) return;
		const cached = conversationsCacheRef.current.get(id);
		const isFirstPage = page === 1 && !append;
		if (isFirstPage && cached) {
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
			params: { page, limit: 50 },
		});
		const items = data?.items || [];
		const previousItems = append
			? conversationsCacheRef.current.get(id)?.items || []
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
		conversationsCacheRef.current.set(id, next);
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
			await loadConversations(accountId, conversationPage + 1, true);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not load more conversations');
		} finally {
			setLoadingMoreConversations(false);
		}
	};

	const scheduleReloadConversations = useCallback(
		id => {
			if (!id) return;
			if (reloadConversationsTimer.current) clearTimeout(reloadConversationsTimer.current);
			reloadConversationsTimer.current = setTimeout(() => {
				loadConversations(id, 1, false, { force: true }).catch(() => {});
			}, 800);
		},
		[loadConversations],
	);

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

	const loadMessages = useCallback(async (id, canSync) => {
		if (!id) return;
		const requestId = ++messagesRequestId.current;
		const cached = messagesCacheRef.current.get(id);
		if (cached?.items?.length) {
			setMessages(cached.items);
			setHasMoreMessages(cached.hasMore);
			setLoadingMessages(false);
			requestAnimationFrame(() => {
				const el = messageBoxRef.current;
				if (el) el.scrollTop = el.scrollHeight;
			});
		} else {
			setLoadingMessages(true);
			setMessages([]);
			setHasMoreMessages(true);
		}
		try {
			const { data } = await api.get(`/whatsapp/conversations/${id}/messages`, {
				params: { limit: MESSAGE_PAGE_SIZE },
			});
			if (messagesRequestId.current !== requestId) return;
			let items = mergeMessages(
				Array.isArray(data) ? data : [],
				cached?.items || [],
			);
			setMessages(items);
			setHasMoreMessages(
				Boolean(cached?.hasMore) ||
					(Array.isArray(data) && data.length >= MESSAGE_PAGE_SIZE),
			);
			messagesCacheRef.current.set(id, {
				items,
				hasMore:
					Boolean(cached?.hasMore) ||
					(Array.isArray(data) && data.length >= MESSAGE_PAGE_SIZE),
				cachedAt: Date.now(),
			});
			requestAnimationFrame(() => {
				const el = messageBoxRef.current;
				if (el) el.scrollTop = el.scrollHeight;
			});
			api
				.post(`/whatsapp/conversations/${id}/read`)
				.then(() => setConversationUnreadCount(id, 0))
				.catch(() => {});

			const applySynced = synced => {
				if (messagesRequestId.current !== requestId) return;
				items = mergeMessages(items, synced?.items || []);
				setMessages(items);
				const hasMore =
					items.length >= MESSAGE_PAGE_SIZE || synced?.hasMore !== false;
				setHasMoreMessages(hasMore);
				messagesCacheRef.current.set(id, {
					items,
					hasMore,
					cachedAt: Date.now(),
				});
				requestAnimationFrame(() => {
					const el = messageBoxRef.current;
					if (el) el.scrollTop = el.scrollHeight;
				});
			};

			if (!canSync) {
				// View-only staff read stored history without invoking provider sync.
			} else if (
				cached?.items?.length &&
				Date.now() - cached.cachedAt < MESSAGES_CACHE_TTL
			) {
				// Fresh cache plus the DB request above is enough; realtime events keep it current.
			} else if (items.length < MESSAGE_PAGE_SIZE && !cached?.items?.length) {
				// Partial/empty DB: wait once while backfilling the latest 30 messages.
				try {
					const { data: synced } = await api.post(
						`/whatsapp/conversations/${id}/sync/latest`,
						null,
						{ params: { limit: MESSAGE_PAGE_SIZE }, timeout: 25000 },
					);
					applySynced(synced);
				} catch {
					/* show empty state after sync attempt */
				}
			} else {
				api
					.post(`/whatsapp/conversations/${id}/sync/latest`, null, {
						params: { limit: MESSAGE_PAGE_SIZE },
						timeout: 25000,
					})
					.then(({ data: synced }) => applySynced(synced))
					.catch(() => {});
			}
		} catch (error) {
			if (messagesRequestId.current !== requestId) return;
			if (!cached?.items?.length) {
				setMessages([]);
				toast.error(error.response?.data?.message || 'Could not load messages');
			}
		} finally {
			if (messagesRequestId.current === requestId) setLoadingMessages(false);
		}
	}, [setConversationUnreadCount]);

	useEffect(() => {
		let cancelled = false;
		const boot = async () => {
			try {
				await loadAccounts();
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
				} catch (retryError) {
					if (cancelled || retryError?.response?.status === 401) return;
					toast.error(
						retryError?.response?.data?.message ||
							retryError?.message ||
							'Failed to load WhatsApp workspace',
					);
				}
			} finally {
				if (!cancelled) loadStaff().catch(() => {});
			}
		};
		boot();
		return () => {
			cancelled = true;
		};
	}, [loadAccounts, loadStaff]);

	useEffect(() => {
		accountIdRef.current = accountId;
	}, [accountId]);

	useEffect(() => {
		if (!accountId) return;
		loadConversations(accountId).catch(() => {});
		setConversationId(null);
		setMessages([]);
		setLoadingMessages(false);
		setSelectedGroup(null);
		setSelectedStatus(null);
		setStatuses([]);
		if (statusMediaUrlRef.current) {
			URL.revokeObjectURL(statusMediaUrlRef.current);
			statusMediaUrlRef.current = null;
		}
		setStatusMediaUrl(null);
	}, [accountId, loadConversations]);

	useEffect(
		() => () => {
			if (statusMediaUrlRef.current) URL.revokeObjectURL(statusMediaUrlRef.current);
		},
		[],
	);

	useEffect(() => {
		if (!conversationId) {
			setMessages([]);
			setLoadingMessages(false);
			setHasMoreMessages(true);
			setNotes([]);
			setNoteDraft('');
			setShowNotes(false);
			return;
		}
		setHasMoreMessages(true);
		loadMessages(conversationId, canUseWhatsApp).catch(() => {});
	}, [conversationId, canUseWhatsApp, loadMessages]);

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
		loadNotes(conversationId).catch(() => {});
	}, [conversationId, showNotes, loadNotes]);

	const saveNote = async event => {
		event.preventDefault();
		if (!conversationId || !noteDraft.trim() || savingNote) return;
		const text = noteDraft.trim();
		setSavingNote(true);
		try {
			const { data } = await api.post(`/whatsapp/conversations/${conversationId}/notes`, {
				text,
			});
			setNoteDraft('');
			setNotes(current => [...current, data]);
			toast.success(t.noteSaved);
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
		watchedConversationRef.current = conversationId;
		if (conversationId) socket.emit('whatsapp:conversation:watch', conversationId);
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
			if (activeConversationId) {
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
				void refreshStatusesFromProviderRef.current?.(accountId, { silent: true });
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
					loadConversations(accountId, 1, false, { force: true }).catch(() => {});
				}
				if (event.event === 'sync_failed') {
					toast.error(event.payload?.message || 'WhatsApp sync failed');
				}
			}
			if (['connection', 'connection_error'].includes(event.event)) {
				loadAccounts().catch(() => {});
				// Do not mark inbox as syncing here — that left the bar stuck at 5%.
				if ((event.payload?.status || event.payload?.event?.status) === 'connected' && accountId) {
					loadConversations(accountId, 1, false, { force: true }).catch(() => {});
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
			} catch {}
		}, 2500);
		return () => clearInterval(poll);
	}, [selectedAccount, loadAccounts]);

	const createAccount = async event => {
		event.preventDefault();
		if (!newAccountName.trim()) return;
		setBusy(true);
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
			setBusy(false);
		}
	};

	const connectAccount = async () => {
		if (!accountId) return;
		setBusy(true);
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
			await loadAccounts().catch(() => {});
		} finally {
			setBusy(false);
		}
	};

	const disconnectAccount = async logout => {
		if (!accountId) return;
		setBusy(true);
		try {
			await api.post(`/whatsapp/accounts/${accountId}/${logout ? 'logout' : 'disconnect'}`);
			setQr(null);
			await loadAccounts();
		} finally {
			setBusy(false);
		}
	};

	const syncAccount = async (silent = false) => {
		if (!accountId) return;
		if (!silent) setBusy(true);
		setSyncingInbox(true);
		setSyncProgress(15);
		try {
			// Chats first — this is what fixes inbox order. Contacts are optional/heavy.
			setSyncProgress(35);
			await api.post(`/whatsapp/accounts/${accountId}/sync/chats`);
			setSyncProgress(80);
			await api.post(`/whatsapp/accounts/${accountId}/sync/contacts`).catch(() => null);
			setSyncProgress(100);
			await loadConversations(accountId);
			if (!silent) toast.success('WhatsApp data synchronized');
		} catch (error) {
			if (!silent) toast.error(error.response?.data?.message || 'Synchronization failed');
		} finally {
			setSyncingInbox(false);
			if (!silent) setBusy(false);
		}
	};

	useEffect(() => {
		if (activeTab !== 'chats' || !accountId || !selectedAccount) return;
		if (selectedAccount.status !== 'connected') return;
		if (!canUseWhatsApp) return;
		if (conversations.length > 0 || syncingInbox || busy) return;
		syncAccount(true).catch(() => {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, accountId, selectedAccount?.status, conversations.length, canUseWhatsApp]);

	// Keep stories fresh while the statuses tab is open (phone-side posts have no push event).
	useEffect(() => {
		if (activeTab !== 'statuses' || !accountId) return undefined;
		const poll = setInterval(() => {
			void refreshStatusesFromProviderRef.current?.(accountId, { silent: true });
		}, STATUSES_CACHE_TTL);
		return () => clearInterval(poll);
	}, [activeTab, accountId]);

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
		const text = draft.trim();
		setDraft('');
		setSending(true);
		try {
			const { data } = await api.post(`/whatsapp/conversations/${conversationId}/messages`, {
				type: 'text',
				text,
				clientMessageId: newClientMessageId(),
			});
			setMessages(current => {
				const next = mergeMessages(current, [data.message]);
				const previous = messagesCacheRef.current.get(conversationId);
				messagesCacheRef.current.set(conversationId, {
					items: next,
					hasMore: previous?.hasMore ?? true,
					cachedAt: Date.now(),
				});
				return next;
			});
		} catch (error) {
			setDraft(text);
			toast.error(error.response?.data?.message || 'Message failed');
		} finally {
			setSending(false);
		}
	};

	const sendFile = async (file, forcedType) => {
		if (!file || !conversationId || !accountId) return;
		setSending(true);
		try {
			const form = new FormData();
			form.append('file', file);
			const { data: uploaded } = await api.post(
				`/whatsapp/accounts/${accountId}/media`,
				form,
			);
			const type =
				forcedType ||
				(file.type.startsWith('image/')
					? 'image'
					: file.type.startsWith('video/')
						? 'video'
						: file.type.startsWith('audio/')
							? 'audio'
							: 'document');
			const { data } = await api.post(`/whatsapp/conversations/${conversationId}/messages`, {
				type,
				fileId: uploaded.fileId,
				caption: draft.trim() || undefined,
				clientMessageId: newClientMessageId(),
			});
			setDraft('');
			setMessages(current => {
				const next = mergeMessages(current, [data.message]);
				const previous = messagesCacheRef.current.get(conversationId);
				messagesCacheRef.current.set(conversationId, {
					items: next,
					hasMore: previous?.hasMore ?? true,
					cachedAt: Date.now(),
				});
				return next;
			});
		} catch (error) {
			toast.error(error.response?.data?.message || 'Media message failed');
		} finally {
			setSending(false);
			if (fileRef.current) fileRef.current.value = '';
		}
	};

	const stopVoiceRecording = (send = true) => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === 'inactive') return;
		discardRecordingRef.current = !send;
		recorder.stop();
	};

	const startVoiceRecording = async () => {
		if (!conversationId || sending || recordingVoice) return;
		if (
			typeof navigator === 'undefined' ||
			!navigator.mediaDevices?.getUserMedia ||
			typeof MediaRecorder === 'undefined'
		) {
			toast.error('Voice recording is not supported in this browser');
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
				toast.error('Voice recording failed');
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
			recordingStreamRef.current?.getTracks().forEach(track => track.stop());
			recordingStreamRef.current = null;
			setRecordingVoice(false);
			toast.error(
				error?.name === 'NotAllowedError' ? t.microphoneDenied : 'Could not start recording',
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
		if (!conversationId || loadingOlder || !hasMoreMessages) return;
		const targetConversationId = conversationId;
		const requestId = ++olderRequestId.current;
		const box = messageBoxRef.current;
		const previousHeight = box?.scrollHeight || 0;
		setLoadingOlder(true);
		const oldest = messages[0];
		try {
			const requests = [
				api.get(`/whatsapp/conversations/${targetConversationId}/messages`, {
					params: { before: oldest?.id, limit: MESSAGE_PAGE_SIZE },
				}),
			];
			if (canUseWhatsApp) {
				requests.push(
					api.post(`/whatsapp/conversations/${targetConversationId}/sync/older`, null, {
						params: { limit: MESSAGE_PAGE_SIZE },
					}),
				);
			}
			const responses = await Promise.all(requests);
			if (
				requestId !== olderRequestId.current ||
				conversationIdRef.current !== targetConversationId
			) {
				return;
			}
			const local = responses[0]?.data || [];
			const provider = responses[1]?.data;
			const incoming = [...local, ...(provider?.items || [])];
			const hasMore =
				local.length >= MESSAGE_PAGE_SIZE ||
				(incoming.length > 0 && provider?.hasMore !== false);
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
			if (requestId === olderRequestId.current) setLoadingOlder(false);
		}
	};

	const assignConversation = async userId => {
		if (!conversationId) return;
		try {
			await api.put(`/whatsapp/conversations/${conversationId}/assignment`, {
				userId: userId || null,
			});
			await loadConversations(accountId);
			toast.success(userId ? 'Conversation assigned' : 'Conversation unassigned');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Assignment failed');
		}
	};

	const applyStatuses = useCallback((targetAccountId, items) => {
		if (accountIdRef.current === targetAccountId) setStatuses(items);
		statusesCacheRef.current.set(targetAccountId, {
			items,
			cachedAt: Date.now(),
		});
	}, []);

	const refreshStatusesFromProvider = useCallback(
		async (targetAccountId, { silent = true } = {}) => {
			if (!targetAccountId) return;
			setSyncingStatuses(true);
			try {
				const { data: refreshed } = await api.get(
					`/whatsapp/accounts/${targetAccountId}/statuses`,
					{ params: { refresh: true }, timeout: 45000 },
				);
				applyStatuses(targetAccountId, refreshed?.items || []);
			} catch (error) {
				if (!silent) {
					toast.error(
						error.response?.data?.message || 'Could not refresh statuses',
					);
				}
			} finally {
				setSyncingStatuses(false);
			}
		},
		[applyStatuses],
	);

	refreshStatusesFromProviderRef.current = refreshStatusesFromProvider;

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
				applyStatuses(accountId, data.items);
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
		if (!accountId) return;
		if (tab === 'statuses') {
			const targetAccountId = accountId;
			const cached = statusesCacheRef.current.get(targetAccountId);
			if (cached) setStatuses(cached.items);
			setBusy(!cached);
			try {
				// Show DB snapshot immediately, then always revalidate from WhatsApp.
				const { data } = await api.get(`/whatsapp/accounts/${targetAccountId}/statuses`);
				const localItems = data?.items || [];
				if (accountIdRef.current === targetAccountId) setStatuses(localItems);
				statusesCacheRef.current.set(targetAccountId, {
					items: localItems,
					cachedAt: cached?.cachedAt || Date.now(),
				});
				void refreshStatusesFromProvider(targetAccountId, { silent: !force });
			} catch (error) {
				if (!cached) {
					toast.error(error.response?.data?.message || 'Could not load statuses');
				} else if (force) {
					void refreshStatusesFromProvider(targetAccountId, { silent: false });
				}
			} finally {
				setBusy(false);
			}
			return;
		}
		setBusy(true);
		try {
			if (tab === 'groups') {
				const { data } = await api.get(`/whatsapp/accounts/${accountId}/groups`);
				setGroups(data || []);
			}
			if (tab === 'notifications') {
				const { data } = await api.get(`/whatsapp/accounts/${accountId}/logs`);
				setLogs(data || []);
			}
			if (tab === 'reports') {
				const { data } = await api.get(
					`/whatsapp/accounts/${accountId}/reports/summary`,
				);
				setReport(data);
			}
			if (tab === 'settings') {
				const [accessResponse, privacyResponse] = await Promise.all([
					api.get(`/whatsapp/accounts/${accountId}/access`),
					api.get(`/whatsapp/accounts/${accountId}/privacy`),
				]);
				setAccountAccess(accessResponse.data || []);
				setPrivacySettings(
					privacyResponse.data || {
						hideStatusViewReceipts: true,
						readReceiptMode: 'on_reply',
					},
				);
			}
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not load section');
		} finally {
			setBusy(false);
		}
	};

	const openStory = async (status, queue = null, index = 0) => {
		if (!status || !accountId) return;
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
					`/whatsapp/accounts/${accountId}/statuses/${encodeURIComponent(status.providerStatusId)}/view`,
					{ senderWaId: status.senderWaId || undefined },
				)
				.catch(() => {});
		}
		if (isTextStory) {
			setLoadingStory(false);
			return;
		}
		try {
			const data = await fetchStatusMediaBlob(accountId, status.id);
			if (requestId !== storyRequestId.current) return;
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
					statusesCacheRef.current.set(accountId, {
						items: (statusesCacheRef.current.get(accountId)?.items || []).filter(
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
			setStoryProgress(pct);
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
		try {
			await api.put(`/whatsapp/accounts/${accountId}/access`, {
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
		if (!accountId) return;
		try {
			const { data } = await api.put(
				`/whatsapp/accounts/${accountId}/privacy`,
				privacySettings,
			);
			setPrivacySettings(data);
			setAccounts(current =>
				current.map(account =>
					account.id === accountId
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
		if (!conversationId) return;
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
		<div className="mx-auto flex h-[calc(100vh-2rem)] max-w-[1800px] flex-col gap-4 text-slate-900 dark:text-slate-100">
			{/* Unified header: brand + account switcher + tabs, all in one compact bar */}
			<Card className="shrink-0 overflow-hidden">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
					<div className="flex items-center gap-3">
						<div
							className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
							style={{ background: GRADIENT, boxShadow: GLOW }}
						>
							<MessageCircle size={21} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-lg font-black leading-tight">{t.title}</h1>
								<span className="relative flex h-1.5 w-1.5">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
								</span>
							</div>
							<p className="text-xs text-slate-400">{t.subtitle}</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{accounts.length > 0 && (
							<select
								value={accountId || ''}
								onChange={event => setAccountId(event.target.value)}
								className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
							>
								{accounts.map(account => (
									<option key={account.id} value={account.id}>
										{account.label} · {account.status}
									</option>
								))}
							</select>
						)}
						{selectedAccount && accStatus && (
							<span className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${accStatus.bg} ${accStatus.text}`}>
								<span className={`h-2 w-2 rounded-full ${accStatus.dot}`} />
								{accStatus.label}
							</span>
						)}
					</div>
				</div>
				<div className="flex gap-1 overflow-x-auto p-2">
					{tabs.map(([key, Icon]) => (
						<button
							key={key}
							onClick={() => loadTabData(key)}
							className={`flex min-w-max items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
								activeTab === key
									? 'text-white shadow-md'
									: 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
							}`}
							style={activeTab === key ? { background: GRADIENT, boxShadow: GLOW } : undefined}
						>
							<Icon size={15} />
							{t[key]}
						</button>
					))}
				</div>
			</Card>

			<div className="min-h-0 flex-1 overflow-y-auto pb-1 nice-scroll">
				{activeTab === 'accounts' && (
					<div className="grid gap-4 lg:grid-cols-[360px_1fr]">
						<Card className="p-4">
							<h2 className="mb-3 flex items-center gap-2 text-sm font-black">
								<Sparkles size={14} className="text-[var(--color-primary-500)]" />
								{t.newAccount}
							</h2>
							<form onSubmit={createAccount} className="flex gap-2">
								<input
									value={newAccountName}
									onChange={event => setNewAccountName(event.target.value)}
									placeholder={t.accountName}
									className="h-11 flex-1 rounded-xl border border-slate-200 bg-transparent px-3.5 outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700"
								/>
								<button
									disabled={busy}
									className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px disabled:opacity-50"
									style={{ background: GRADIENT, boxShadow: GLOW }}
								>
									<Plus size={18} />
								</button>
							</form>
							<div className="mt-5 space-y-2">
								{accounts.map(account => {
									const meta = statusMeta(account.status, t);
									const active = account.id === accountId;
									return (
										<button
											key={account.id}
											onClick={() => setAccountId(account.id)}
											className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all ${
												active
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
														disabled={busy}
														className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-600 shadow-md transition-transform hover:-translate-y-px disabled:opacity-50"
													>
														<Wifi size={15} /> {t.connect}
													</button>
												))}
											</div>
										</div>
										{['connecting', 'qr_pending'].includes(selectedAccount.status) && (
											<p className="mt-3 text-sm text-white/80">{t.syncingPhone}</p>
										)}
									</div>
									<div className="space-y-5 p-5">
										{qr && canManageWhatsApp && (
											<div className="mx-auto max-w-sm text-center">
												<div className="mb-4 flex items-center justify-center gap-2">
													<span className="relative flex h-2 w-2">
														<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
														<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
													</span>
													<p className="text-sm font-black">{t.scanQr}</p>
												</div>
												<div className="relative mx-auto w-fit rounded-2xl bg-white p-4 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.35)] dark:bg-slate-800">
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
					<Card className="grid h-full min-h-[600px] overflow-hidden lg:grid-cols-[330px_1fr]">
						<aside className={`${conversationId ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-e border-slate-200 dark:border-slate-700`}>
							<div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
								<h2 className="font-black">{t.chats}</h2>
								{canUseWhatsApp && (
									<button onClick={() => syncAccount()} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
										<RefreshCw size={17} />
									</button>
								)}
							</div>
							{syncingInbox && (
								<div className="border-b border-slate-100 px-3 pt-3 dark:border-slate-800">
									<SyncProgressBanner
										visible={syncingInbox}
										progress={syncProgress}
										label={t.syncProgress}
									/>
								</div>
							)}
							<div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
								<div className="relative">
									<Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
									<input
										value={chatSearch}
										onChange={event => setChatSearch(event.target.value)}
										placeholder={t.search}
										className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 text-sm outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800"
									/>
								</div>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto p-2 nice-scroll">
								{filteredConversations.length === 0 ? (
									<Empty
										title={
											syncingInbox
												? t.syncingChats
												: conversationScope === 'assigned'
													? t.noAssignedConversations
													: t.noConversations
										}
									/>
								) : (
									<>
									{filteredConversations.map(conversation => {
										const title = conversationTitle(conversation);
										const active = conversation.id === conversationId;
										const isGroup = conversation.type === 'group';
										const unreadCount = Math.max(
											0,
											Number(conversation.unreadCount) || 0,
										);
										const unread = unreadCount > 0;
										return (
											<button
												key={conversation.id}
												onClick={() => setConversationId(conversation.id)}
												className={`relative mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-start transition-colors ${
													active
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
												<Avatar label={title} size={10} isGroup={isGroup} />
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-2">
														<p className={`truncate ${unread ? 'font-black' : 'font-bold'}`}>{title}</p>
														{conversation.lastMessageAt && (
															<span className={`shrink-0 text-[10px] ${unread ? 'font-bold text-[var(--color-primary-500)]' : 'text-slate-400'}`}>
																{relativeTime(conversation.lastMessageAt)}
															</span>
														)}
													</div>
													<div className="mt-0.5 flex items-center justify-between gap-2">
														<p className="truncate text-xs text-slate-400">
															{conversation.assignedUser?.name ? (
																<span className="inline-flex items-center gap-1 text-slate-500">
																	<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary-400)]" />
																	{conversation.assignedUser.name}
																</span>
															) : (
																t.unassign
															)}
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
											</button>
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
						</aside>
						<section className={`${!conversationId ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col`}>
							{!selectedConversation ? (
								<Empty title={t.selectConversation} />
							) : (
								<>
									<header className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
										<div className="flex items-center gap-3">
											<Avatar
												label={conversationTitle(selectedConversation)}
												size={9}
												isGroup={selectedConversation.type === 'group'}
											/>
											<div>
												<h3 className="font-black">
													{conversationTitle(selectedConversation)}
												</h3>
												<p className="text-xs text-slate-500">
													{selectedConversation.assignedUser?.name || t.unassign}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => setShowNotes(current => !current)}
												className={`h-9 rounded-lg border px-3 text-xs font-bold transition-colors ${
													showNotes
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
											{canUseWhatsApp &&
												selectedAccount?.privacySettings?.readReceiptMode === 'manual' && (
													<button
														type="button"
														onClick={markConversationReadManually}
														className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
													>
														{t.markRead}
													</button>
												)}
											{canAssignWhatsApp && <select
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
											<button onClick={() => setConversationId(null)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800">
												<X size={18} />
											</button>
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
																	{relativeTime(note.created_at || note.createdAt)}
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
										className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.05),transparent_60%)] p-4 nice-scroll"
									>
										{loadingMessages ? (
											<div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
												<div className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-slate-800/90">
													<Loader2 size={28} className="animate-spin text-[var(--color-primary-500)]" />
												</div>
												<p className="text-sm font-semibold text-slate-500">{t.loadingMessages}</p>
											</div>
										) : messages.length === 0 ? (
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
												{messages.map(message => {
													const mine = message.direction === 'outbound';
													return (
														<div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
															<div
																className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${mine ? 'text-white' : 'border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'}`}
																style={mine ? { background: GRADIENT } : undefined}
															>
																{message.attachments?.length
																	? message.attachments.map(attachment => (
																			<MediaAttachment
																				key={attachment.id}
																				attachment={attachment}
																				mine={mine}
																				labels={t}
																			/>
																		))
																	: ['image', 'audio', 'ptt', 'video', 'document', 'sticker'].includes(
																			String(message.type || '').toLowerCase(),
																		) && (
																			<div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${mine ? 'bg-white/15' : 'bg-black/5'}`}>
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
																{message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
																<div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
																	{new Date(message.providerTimestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																	{mine && (['read', 'played'].includes(message.status) ? <CheckCheck size={13} /> : <Check size={13} />)}
																</div>
															</div>
														</div>
													);
												})}
											</>
										)}
									</div>
									{canUseWhatsApp ? (
									<form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
										<input
											ref={fileRef}
											type="file"
											className="hidden"
											onChange={event => sendFile(event.target.files?.[0])}
										/>
										<button
											type="button"
											disabled={sending || recordingVoice}
											onClick={() => fileRef.current?.click()}
											className="rounded-xl p-3 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
										>
											<Paperclip size={19} />
										</button>
										{recordingVoice ? (
											<>
												<div className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 dark:border-rose-900/50 dark:bg-rose-950/30">
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
													className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
												>
													<X size={18} />
												</button>
												<button
													type="button"
													title={t.sendRecording}
													aria-label={t.sendRecording}
													onClick={() => stopVoiceRecording(true)}
													className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/25 transition-transform hover:-translate-y-px"
												>
													<Square size={16} fill="currentColor" />
												</button>
											</>
										) : (
											<>
												<textarea
													value={draft}
													onChange={event => setDraft(event.target.value)}
													onKeyDown={event => {
														if (event.key === 'Enter' && !event.shiftKey) {
															event.preventDefault();
															sendMessage(event);
														}
													}}
													rows={1}
													placeholder={t.message}
													className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700"
												/>
												<button
													type="button"
													disabled={sending}
													title={t.recordVoice}
													aria-label={t.recordVoice}
													onClick={startVoiceRecording}
													className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-500)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
												>
													<Mic size={19} />
												</button>
												<button
													disabled={sending || !draft.trim()}
													className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-40"
													style={{ background: GRADIENT, boxShadow: GLOW }}
												>
													{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
												</button>
											</>
										)}
									</form>
									) : (
										<div className="border-t border-slate-100 p-3 text-center text-sm font-bold text-slate-400 dark:border-slate-800">
											{t.readOnly}
										</div>
									)}
								</>
							)}
						</section>
					</Card>
				)}

				{activeTab === 'groups' && (
					<div className="grid h-full min-h-[600px] gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
						<Card className="flex min-h-0 flex-col overflow-hidden">
							<div className="shrink-0 p-4 pb-3">
								<CardHeader
									icon={Users}
									title={t.groups}
									right={
										<button onClick={() => loadTabData('groups')} className="rounded-xl border border-slate-200 p-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" title={t.refresh}>
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
												className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all ${
													selectedGroup?.id === group.id
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
				)}

				{activeTab === 'statuses' && (
					<div className="space-y-4">
						<Card className="p-4">
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
							{syncingStatuses && (
								<p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
									<Loader2 size={13} className="animate-spin" />
									{t.syncingStatuses}
								</p>
							)}
							{statuses.length === 0 ? (
								<Empty icon={Zap} title={t.noStatuses} />
							) : (
								<div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-3 gap-y-5">
									{groupedStatuses.map(story => {
										const name =
											story.latest.contactName ||
											(story.latest.isOwn
												? selectedAccount?.label || t.accounts
												: String(story.senderWaId).replace(/@.*$/, ''));
										const viewed = story.isViewed;
										return (
											<button
												type="button"
												key={story.senderWaId}
												onClick={() => openStoryGroup(story)}
												className="group text-center transition-transform hover:-translate-y-0.5"
											>
												<div
													className={`mx-auto grid h-20 w-20 place-items-center rounded-full p-[3px] shadow-md transition-transform duration-200 group-hover:scale-105 ${
														viewed ? 'bg-slate-300 dark:bg-slate-600' : ''
													}`}
													style={viewed ? undefined : { background: GRADIENT }}
												>
													<div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-white bg-white dark:border-slate-900 dark:bg-slate-900">
														<StoryThumbnail
															accountId={accountId}
															status={story.latest}
															label={name}
															size={16}
															viewed={viewed}
														/>
													</div>
												</div>
												<p className={`mt-2 truncate text-xs ${viewed ? 'font-semibold text-slate-500' : 'font-bold'}`}>
													{name}
												</p>
												<p className="text-[10px] text-slate-400">{relativeTime(story.latest.publishedAt)}</p>
												<span
													className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
														viewed
															? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
															: 'text-white'
													}`}
													style={viewed ? undefined : { background: GRADIENT }}
												>
													{story.unviewedCount > 0
														? `${story.unviewedCount}/${story.items.length}`
														: story.items.length}
												</span>
											</button>
										);
									})}
								</div>
							)}
						</Card>

						{selectedStatus && (
							<div
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
						{logs.length === 0 ? (
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
						{report && (
							<>
								<div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
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
											className={`rounded-2xl border p-4 ${
												failedTotal > 0
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
						)}
					</Card>
				)}

				{activeTab === 'settings' && (
					<div className="space-y-4">
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
						<div className="grid gap-4 lg:grid-cols-[340px_1fr]">
						<Card className="p-4">
							<h2 className="mb-3 flex items-center gap-2 text-sm font-black">
								<UserPlus size={14} className="text-[var(--color-primary-500)]" />
								{t.addStaff}
							</h2>
							<div className="relative mb-3">
								<Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input
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
										onClick={saveAccess}
										disabled={accountAccess.length === 0}
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
													<div className="min-w-0">
														<p className="truncate font-bold">{row.user?.name}</p>
														<p className="truncate text-xs text-slate-500">{row.user?.email}</p>
													</div>
												</div>
												{['canView', 'canUse', 'canManage', 'canAssign', 'canTransfer'].map(flag => (
													<div key={flag} className="flex justify-center">
														<Toggle checked={Boolean(row[flag])} onChange={value => setAccessFlag(row.userId, flag, value)} />
													</div>
												))}
											</div>
										))}
									</div>
								</div>
							)}
						</Card>
						</div>
					</div>
				)}
			</div>

			{busy && (
				<div className="pointer-events-none fixed inset-0 z-[200] grid place-items-center bg-black/10 backdrop-blur-[1px]">
					<div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900">
						<Loader2 className="animate-spin text-[var(--color-primary-500)]" />
					</div>
				</div>
			)}
		</div>
	);
}
