'use client';

import { cloneElement, isValidElement, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
	Activity,
	AlertCircle,
	AudioLines,
	AlertTriangle,
	Archive,
	ArrowDownLeft,
	ArrowUpRight,
	BarChart3,
	Bell,
	BellOff,
	Copy,
	Check,
	CheckCheck,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock,
	CalendarClock,
	CalendarDays,
	Camera,
	Columns2,
	Download,
	Eye,
	EyeOff,
	ExternalLink,
	FileText,
	FolderKanban,
	Globe2,
	Image as ImageIcon,
	ImageOff,
	Images,
	LayoutGrid,
	ListChecks,
	ListFilter,
	Loader2,
	LogOut,
	Mail,
	MapPin,
	Expand,
	MessageCircle,
	Mic,
	MoreHorizontal,
	PanelLeft,
	PanelLeftClose,
	PanelRight,
	PanelRightClose,
	Pause,
	Pin,
	Play,
	Plus,
	Phone,
	Radio,
	RefreshCw,
	Repeat,
	Reply,
	Search,
	Send,
	Settings,
	Smile,
	ShieldCheck,
	Smartphone,
	SmilePlus,
	Sparkles,
	Star,
	Trash2,
	TrendingUp,
	User,
	UserPlus,
	UserCircle2,
	UserRound,
	Users,
	Video,
	Wifi,
	WifiOff,
	X,
	Zap,
} from 'lucide-react';
import api from '@/utils/axios';
import { notifyWhatsAppUnreadChanged } from '@/lib/outreach-unread';
import TranscriptionDialog from '../transcript/transcription-dialog';
import WhatsAppChatIdlePane from './WhatsAppChatIdlePane';
import VoiceChangerDialog from './voice-changer/VoiceChangerDialog';
import CloneChatVoicePanel from './voice-changer/CloneChatVoicePanel';
import ScheduleMessageDialog from './schedule-message/ScheduleMessageDialog';
import ScheduledMessagesPanel from './schedule-message/ScheduledMessagesPanel';
import {
	loadConversationHistoryForClone,
	loadMoreConversationHistoryForClone,
} from './voice-changer/voice-clone-chat-samples';
import StickersPanel from './stickers/StickersPanel';
import AiImageComposerPanel from './stickers/AiImageComposerPanel';
import { ChatDocumentViewer } from './document-viewer/chat-document-viewer';
import {
	fetchVoiceChangerSettings,
	readVoiceChangerError,
	transformVoiceNote,
} from './voice-changer/voice-changer-client';
import {
	createTranscriptionFile,
	isSelectableTranscriptMessage,
	MAX_TRANSCRIPT_BUNDLE_ITEMS,
	toTranscriptSource,
} from '../transcript/transcription-client';
import {
	conversationTitle,
	conversationAvatarUrl,
	inboxAvatarForWaId,
	buildWhatsAppMentionDirectory,
	resolveWhatsAppMentionLabel,
	conversationUnreadCount,
	conversationMatchesInboxFilter,
	WHATSAPP_INBOX_CHIP_FILTERS,
	isChannelConversation,
	firstMessageLink,
	textWithoutFirstLink,
	getStoryMediaEmbed,
	groupConsecutiveImageMessages,
	groupSenderIdentity,
	messagesFormBubbleCluster,
	isRenderableWhatsAppMessage,
	isWhatsAppLocationMessage,
	whatsAppLocationFromMessage,
	whatsAppLocationHref,
	mediaPreviewFromRaw,
	mergeMessages,
	buildOptimisticMediaMessage,
	messageDeliveryState,
	preferWhatsAppAckStatus,
	isSelfChatConversation,
	isEmailMemoAiConversation,
	messageMatchesAckTarget,
	messageTextPresentation,
	normalizeWhatsAppIdentity,
	looksLikeMarkdown,
	parseWhatsAppBold,
	compressImageForWhatsApp,
	quotedMessageLabel,
	quotedPreviewFromMessage,
	quotedTargetFromMessage,
	quotedVoicePresentation,
	resolveQuotedReplySource,
	buildReplySnapshot,
	messageMatchesQuotedTarget,
	messageTextSegments,
	relativeTime,
	scopeMessagesToConversation,
	seekRatio,
	sortConversationsByActivity,
	updateConversationPreview,
	visibleMessageText,
	clipboardImageFiles,
	voiceDurationSecondsFromSource,
} from './whatsapp-utils';
import { writeCachedMessagePage, readCachedMessagePage } from './whatsapp-idb-cache';
import { createWhatsAppTabLeader } from './whatsapp-tab-leader';
import { DemoModeProvider, useDemoMode } from './demo/DemoModeProvider';
import DemoModeSettings from './demo/components/DemoModeSettings';
import { demoApi } from './demo/demo-api';
import WhatsAppSplitPane from './WhatsAppSplitPane';
import { VoiceRecordingBar } from './VoiceRecordingBar';
import { useVoiceRecordingPreview } from './use-voice-recording-preview';
import {
	VOICE_NOTE_MAX_SECONDS,
	buildVoiceNoteFile,
	createVoiceMediaRecorder,
	getVoiceMediaStream,
	mediaUploadFailedMessage,
} from './whatsapp-voice-recorder';
import WhatsAppDesktopRail from './WhatsAppDesktopRail';
import WhatsAppAccountLinkPanel, {
	WhatsAppRestoreProgress,
} from './WhatsAppAccountLinkPanel';

const EmailMemoWorkspace = lazy(() => import('../email-memo/EmailMemoWorkspace'));
import { WhatsAppReportsTab, staffAssignHint } from './WhatsAppReportsTab';
import { WhatsAppBoardTab } from './WhatsAppBoardTab';
import { BoardColumnPicker, BoardColumnPickerMenu } from './BoardColumnPicker';
import { createBoardCardFromMessages } from './whatsapp-board-api';
import { WaCustomSelect } from './WaCustomSelect';
import { WaActionMenu } from './WaActionMenu';
import {
	addMessagesToChatGroup,
	createChatMessageGroup,
	deleteChatMessageGroup,
	fetchChatMessageGroupMessages,
	listChatMessageGroupMembership,
	listChatMessageGroups,
	removeMessagesFromChatGroup,
} from './message-groups-api';
import {
	fetchConversations,
	fetchMessages,
	messagesCacheKey,
	useWhatsAppQueryCache,
	WHATSAPP_STALE_TIME,
	whatsappKeys,
} from './hooks/useWhatsAppQueries';
import {
	MESSAGE_PAGE_SIZE,
	MESSAGES_CACHE_TTL_MS,
	shouldProviderBackfill,
	shouldSkipOpenChatNetwork,
} from './whatsapp-message-sync';
import { useWaScrollWindow, WaVirtualSpacer } from './wa-virtual-list';
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
import AiReplySuggestions, { PromptInstructionsDropdown } from './ai/AiReplySuggestions';
import WhatsAppAiSettings from './ai/WhatsAppAiSettings';
import WhatsAppWorkspaceAiParts from './ai/WhatsAppWorkspaceAiParts';
import { useWhatsAppAi } from './ai/use-whatsapp-ai';
import WhatsAppPrivacyBlurControl from './WhatsAppPrivacyBlurControl';
import ExpandableMessageText from './ExpandableMessageText';
import EmailMemoMessageCard from './EmailMemoMessageCard';
import { isEmailMemoMessageText } from './email-memo-message';
import MarkdownMessage from '../ai-free/MarkdownMessage';
import {
	applyWhatsAppPrivacyBlurClasses,
	markPrivacyBlurRevealed,
	readWhatsAppPrivacyBlur,
	writeWhatsAppPrivacyBlur,
} from './whatsapp-privacy-blur';

const EMPTY_MESSAGES = [];
const WHATSAPP_SELECTED_ACCOUNT_KEY = 'wa-selected-account-id';
const WHATSAPP_ACTIVE_TAB_KEY = 'wa-active-tab';
const WHATSAPP_CHAT_LIST_COLLAPSED_KEY = 'wa-chat-list-collapsed';
const WHATSAPP_CHAT_LIST_WIDTH_KEY = 'wa-chat-list-width';
const CHAT_LIST_WIDTH_MIN = 220;
const CHAT_LIST_WIDTH_MAX = 520;
const CHAT_LIST_WIDTH_DEFAULT = 300;

function readStoredChatListWidth() {
	if (typeof window === 'undefined') return CHAT_LIST_WIDTH_DEFAULT;
	try {
		const raw = Number(window.localStorage.getItem(WHATSAPP_CHAT_LIST_WIDTH_KEY));
		if (Number.isFinite(raw)) {
			return Math.min(CHAT_LIST_WIDTH_MAX, Math.max(CHAT_LIST_WIDTH_MIN, Math.round(raw)));
		}
	} catch {
		/* ignore */
	}
	return CHAT_LIST_WIDTH_DEFAULT;
}
const WHATSAPP_PERSISTED_TABS = new Set([
	'accounts',
	'chats',
	'channels',
	'calls',
	'groups',
	'statuses',
	'emails',
	'reports',
	'board',
	'settings',
	'profile',
]);

function isConversationWorkspaceTab(tab) {
	return tab === 'chats' || tab === 'channels';
}

function resolveWhatsAppStorageUserId(userId) {
	const fromArg = String(userId || '').trim();
	if (fromArg && fromArg !== 'anonymous') return fromArg;
	return resolveStoredWhatsAppUserId();
}

function readStoredWhatsAppAccountId(userId) {
	if (typeof window === 'undefined') return null;
	try {
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		if (scopedUserId) {
			const scoped = window.localStorage.getItem(
				`${WHATSAPP_SELECTED_ACCOUNT_KEY}:${scopedUserId}`,
			);
			if (scoped) return scoped;
		}
		return window.localStorage.getItem(WHATSAPP_SELECTED_ACCOUNT_KEY) || null;
	} catch {
		return null;
	}
}

function writeWhatsAppAccountToLocation(accountId) {
	if (typeof window === 'undefined' || !accountId) return;
	try {
		const url = new URL(window.location.href);
		if (url.searchParams.get('accountId') === String(accountId)) return;
		url.searchParams.set('accountId', String(accountId));
		window.history.replaceState(
			window.history.state,
			'',
			`${url.pathname}${url.search}${url.hash}`,
		);
	} catch {
		// Ignore history failures.
	}
}

function writeStoredWhatsAppAccountId(accountId, userId) {
	if (typeof window === 'undefined' || !accountId) return;
	try {
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		if (scopedUserId) {
			window.localStorage.setItem(`${WHATSAPP_SELECTED_ACCOUNT_KEY}:${scopedUserId}`, accountId);
			window.localStorage.removeItem(WHATSAPP_SELECTED_ACCOUNT_KEY);
			return;
		}
		window.localStorage.setItem(WHATSAPP_SELECTED_ACCOUNT_KEY, accountId);
	} catch {
		// Ignore quota / private-mode failures.
	}
}

function clearStoredWhatsAppAccountId(accountId, userId) {
	if (typeof window === 'undefined') return;
	try {
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		const scopedKey = scopedUserId
			? `${WHATSAPP_SELECTED_ACCOUNT_KEY}:${scopedUserId}`
			: WHATSAPP_SELECTED_ACCOUNT_KEY;
		const current = window.localStorage.getItem(scopedKey);
		if (!accountId || current === accountId) {
			window.localStorage.removeItem(scopedKey);
		}
		if (!scopedUserId) {
			window.localStorage.removeItem(WHATSAPP_SELECTED_ACCOUNT_KEY);
		}
	} catch {
		// Ignore storage failures.
	}
}

function readStoredWhatsAppActiveTab(userId) {
	if (typeof window === 'undefined') return null;
	try {
		const value = userId
			? window.localStorage.getItem(`${WHATSAPP_ACTIVE_TAB_KEY}:${userId}`)
			: window.localStorage.getItem(WHATSAPP_ACTIVE_TAB_KEY);
		return WHATSAPP_PERSISTED_TABS.has(value) ? value : null;
	} catch {
		return null;
	}
}

function writeStoredWhatsAppActiveTab(tab, userId) {
	if (typeof window === 'undefined' || !WHATSAPP_PERSISTED_TABS.has(tab)) return;
	try {
		if (userId) {
			window.localStorage.setItem(`${WHATSAPP_ACTIVE_TAB_KEY}:${userId}`, tab);
			window.localStorage.removeItem(WHATSAPP_ACTIVE_TAB_KEY);
			return;
		}
		window.localStorage.setItem(WHATSAPP_ACTIVE_TAB_KEY, tab);
	} catch {
		// Ignore quota / private-mode failures.
	}
}

function resolveStoredWhatsAppUserId() {
	if (typeof window === 'undefined') return null;
	try {
		const user = JSON.parse(window.localStorage.getItem('user') || 'null');
		const id = String(user?.id || '').trim();
		return id || null;
	} catch {
		return null;
	}
}

function defaultWhatsAppActiveTab() {
	if (typeof window === 'undefined') return null;
	const userId = resolveStoredWhatsAppUserId();
	const stored =
		readStoredWhatsAppActiveTab(userId) ||
		readStoredWhatsAppActiveTab(null);
	if (stored === 'notifications') return 'chats';
	if (stored && WHATSAPP_PERSISTED_TABS.has(stored)) return stored;
	return 'chats';
}

function isRequestCancelled(error) {
	if (!error) return false;
	const name = String(error.name || '');
	const code = String(error.code || '');
	const message = String(error.message || '').toLowerCase();
	return (
		error.silent === true ||
		name === 'CancelledError' ||
		name === 'CanceledError' ||
		name === 'AbortError' ||
		code === 'ERR_CANCELED' ||
		code === 'ERR_CANCELLED' ||
		message.includes('cancelled') ||
		message.includes('canceled') ||
		message.includes('aborted')
	);
}

const translations = {
	en: {
		title: 'WhatsApp',
		subtitle: 'Accounts, conversations and customer support',
		liveLabel: 'Live workspace',
		accounts: 'Accounts',
		chats: 'Chats',
		channels: 'Channels',
		emails: 'Emails',
		emailsHint: 'Email Memo — Gmail, AI summaries, and WhatsApp delivery',
		calls: 'Calls',
		updates: 'Updates',
		communities: 'Groups',
		groups: 'Groups',
		noCalls: 'No WhatsApp calls yet',
		callsUnavailable: 'Call history is not provided by the connected WhatsApp account.',
		stories: 'Stories',
		groups: 'Groups',
		statuses: 'Stories',
		notifications: 'Notifications',
		reports: 'Reports',
		board: 'Tasks board',
		boardHint: 'Trello-style tasks for this WhatsApp account. Drag cards, add checklists, and link chats.',
		addToBoard: 'Add to tasks board',
		addToBoardHint: 'Right-click messages or multi-select, then pick a column',
		pickBoardColumn: 'Choose column',
		addToBoardNow: 'Add to tasks…',
		scheduleMessage: 'Schedule message',
		scheduleMessageHint: 'Send later once or on a recurring schedule',
		scheduledMessages: 'Scheduled messages',
		copyMessage: 'Copy text',
		copiedMessage: 'Copied',
		selectMoreMessages: 'Select more',
		clearMessageSelection: 'Clear selection',
		multiMessageActions: 'Selected messages',
		sentToBoard: 'Added to tasks board',
		openBoardTab: 'Open tasks board',
		settings: 'Settings',
		settingsAi: 'AI replies',
		settingsDemo: 'Demo mode',
		settingsNotifications: 'Notifications',
		settingsPrivacy: 'Privacy',
		settingsAccess: 'Team access',
		profile: 'Profile',
		profileName: 'Name',
		profilePhone: 'Phone',
		profileAbout: 'About',
		profileStatus: 'Status',
		noWhatsAppProfile: 'Connect a WhatsApp account to see this profile.',
		manageWhatsAppAccount: 'Manage account',
		newAccount: 'New account',
		accountName: 'Account name',
		connect: 'Connect',
		disconnect: 'Disconnect',
		logout: 'Log out',
		deleteAccount: 'Delete account',
		deleteAccountConfirm:
			'Permanently delete "{name}"? This removes its session, conversations, messages, media, stories, groups and access records. This cannot be undone.',
		accountDeleted: 'WhatsApp account deleted',
		accountDeletedFreshReady:
			'Account deleted. A fresh account is ready — scan the QR to link your phone.',
		resetSession: 'Reset & resync',
		resetSessionConfirm:
			'Delete all synchronized data for "{name}" and download it again from the connected phone? The current WhatsApp link and staff access will be kept.',
		sessionResetStarted:
			'Old synchronized data was deleted and a clean synchronization was started.',
		scanQr: 'Scan this QR code from WhatsApp',
		scanQrHint: 'Open WhatsApp on your phone → Linked devices → Link a device',
		linkViaQr: 'QR code',
		linkViaPhone: 'Phone number',
		phoneNumberPlaceholder: 'e.g. +201234567890',
		getPairingCode: 'Get pairing code',
		pairingCodeTitle: 'Enter this code on your phone',
		pairingCodeHint:
			'Open WhatsApp on your phone → Linked devices → Link with phone number instead → enter this code',
		pairingCodeReady: 'Enter this code on your phone',
		pairingCodeCopied: 'Code copied',
		phoneNumberRequired: 'Enter a phone number first',
		phoneNumberInvalid: 'Enter a valid phone number with country code',
		connectWhatsApp: 'Connect WhatsApp',
		linkDeviceTitle: 'Link Device',
		linkDeviceHint: 'Connect using device linking',
		phoneConnectTitle: 'Phone Number',
		phoneConnectHint: 'Connect using your phone number',
		sendPairingCode: 'Send code',
		verifyPhoneTitle: 'Confirm on your phone',
		verifyPhoneSent: 'We generated a pairing code for',
		didntReceiveCode: "Didn't receive the code?",
		resendCode: 'Resend code',
		resendIn: 'Resend in {seconds}s',
		changePhoneNumber: 'Change number',
		waitingPhoneConfirm: 'Waiting for your phone to confirm…',
		connectingWhatsApp: 'Connecting WhatsApp…',
		restorePhoneVerified: 'Phone verified',
		restoreSessionRestored: 'Session restored',
		restoreChatsRestored: 'Chats restored',
		restoreContactsRestored: 'Contacts restored',
		restoreLoadingMessages: 'Loading messages…',
		restoreAlmostReady: 'Almost ready…',
		connectionMethodLabel: 'Connection method',
		connectionMethodQr: 'Linked Device',
		connectionMethodPhone: 'Phone Number',
		openWhatsAppInbox: 'Open WhatsApp',
		noAccounts: 'No WhatsApp accounts yet',
		noAccountsHint: 'Create your first account to start connecting WhatsApp',
		noConversations: 'No conversations yet',
		noChannels: 'No subscribed channels yet',
		noAssignedConversations: 'No conversations assigned to you',
		connectToSeeChats: 'Connect this account to view conversations',
		connectToSeeChannels: 'Connect this account to view channels',
		connectToSeeStories: 'Connect this account to view stories',
		syncingChats: 'Syncing chats from WhatsApp…',
		syncingChatsFetching:
			'Loading chat list from your phone — keep WhatsApp open. This step can take 1–2 minutes.',
		syncProgress: 'Sync progress',
		selectConversation: 'Select a conversation to start',
		selectConversationHint: 'Pick a chat from the list to read messages and reply.',
		restoreSessionSubtitle: 'Please wait while we restore your previous session',
		restoreStepSecureTitle: 'Secure connection',
		restoreStepSecureDesc: 'Your data is encrypted',
		restoreStepSyncTitle: 'Syncing messages',
		restoreStepSyncDesc: 'Fetching your conversations',
		restoreStepDoneTitle: 'Almost done',
		restoreStepDoneDesc: 'Finalizing setup',
		unreadMessagesLong: '{count} unread messages',
		noMessagesYet: 'No messages in this conversation yet',
		loadingMessages: 'Loading messages…',
		messagesStillSyncing:
			'WhatsApp is still syncing with the phone. Retrying automatically…',
		mediaUnavailable: 'Media unavailable',
		loadingMedia: 'Loading media…',
		tapToRetry: 'Tap to retry',
		fileAttachment: 'File attachment',
		openFile: 'Open',
		downloadFile: 'Save as...',
		saveAsFile: 'Save as...',
		selectMedia: 'Select media',
		cancelSelectMedia: 'Cancel',
		downloadSelectedMedia: 'Download selected',
		selectAllMedia: 'Select all media',
		noMediaToSelect: 'No downloadable media in this chat',
		downloadingSelectedMedia: 'Preparing zip download…',
		selectedMediaDownloaded: 'Downloaded {count} files as zip',
		selectedMediaPartialFail: 'Zip ready with {ok} files, {failed} failed',
		selectedMediaZipEmpty: 'Could not download the selected files',
		selectedMediaZipName: 'whatsapp-media',
		selectMessages: 'Select messages',
		cancelSelectMessages: 'Cancel',
		selectAllMessages: 'Select all',
		noMessagesToSelect: 'No voices or tickets to select in this chat',
		transcribeSelected: 'Transcribe selected',
		selectedMessagesCount: '{count} selected',
		needVoiceOrTicket: 'Select at least one voice or text message',
		tooManySelected: 'Select up to {count} messages at a time',
		selectMessageAction: 'Select',
		reconnectAccount: 'Reconnect WhatsApp',
		autoConnecting: 'Restoring WhatsApp session…',
		checkingSession: 'Checking WhatsApp session…',
		loadingInbox: 'Loading chats…',
		sessionLinkBanner:
			'Phone not linked — scan QR to send and receive live. Saved chats stay available.',
		sessionLinkAction: 'Link phone',
		qrExpired: 'QR code expired',
		qrRefresh: 'Generate new QR',
		defaultAccountLabel: 'WhatsApp',
		openLink: 'Open link',
		copyLink: 'Copy link',
		linkCopied: 'Link copied',
		viewLinkInStory: 'Watch inside story',
		openLinkExternally: 'Open in browser',
		transcribe: 'Transcribe',
		recordVoice: 'Record voice message',
		recordingVoice: 'Recording voice message...',
		recordingLive: 'LIVE',
		recordingPaused: 'PAUSED',
		recordingCancel: 'Cancel',
		cancelRecording: 'Cancel recording',
		stopRecording: 'Stop recording',
		recordingPause: 'Pause',
		recordingResume: 'Resume',
		sendRecording: 'Send',
		recordingPreview: 'Listen',
		recordingPreviewStop: 'Stop preview',
		recordingPreviewMode: 'Preview',
		recordingPreviewPlaying: 'Playing',
		recordingPreviewPaused: 'Paused',
		recordingPreviewPause: 'Pause preview',
		recordingPreviewResume: 'Resume preview',
		recordingPreviewSeek: 'Preview progress',
		recordingPreviewEmpty: 'Nothing recorded yet',
		recordingPreviewFailed: 'Could not play preview',
		microphoneDenied: 'Microphone permission was denied',
		microphoneUnavailable: 'No microphone is available',
		recordingUnsupported: 'Voice recording is not supported in this browser',
		recordingFailed: 'Voice recording failed',
		recordingStartFailed: 'Could not start voice recording',
		voiceChanger: 'Voice changer settings',
		voiceChanging: 'Changing voice…',
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
		replyToStory: 'Reply',
		replyToStoryPlaceholder: 'Reply to this story…',
		storyReplySent: 'Reply sent',
		storyReplyUnavailable: 'Cannot reply to this story',
		loopStory: 'Loop',
		loopStoryOn: 'Loop on — will replay after finish',
		loopStoryOff: 'Loop off',
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
		openSplitChat: 'Open second chat',
		splitPickHint: 'Pick another chat from the list to open beside this one',
		cloneVoicePickHint: 'Pick a chat from the list — only voice notes will show for cloning',
		cloneVoicePickDone: 'Back to voice settings',
		cloneVoicePickCancel: 'Cancel',
		cloneVoicePickIdle: 'Choose a chat from the sidebar',
		cloneVoicePickIdleHint: 'Voice notes from that chat will appear here. You can pick another chat anytime.',
		closeSplitChat: 'Close second chat',
		splitChat: 'Split chat',
		notesHint: 'Visible to staff only — never sent on WhatsApp',
		addNote: 'Add note',
		notePlaceholder: 'Add an internal note…',
		noNotes: 'No internal notes yet',
		noteSaved: 'Note added',
		search: 'Search conversations',
		readMore: 'Read more',
		readFullEmail: 'Read full email',
		blurToggle: 'Privacy blur',
		blurToggleHint: 'Hide names, photos and messages while screen sharing',
		blurTitle: 'Privacy blur',
		blurHint: 'Hide chat content during screen sharing',
		blurOptions: 'Blur options',
		blurList: 'Conversation list only',
		blurListHint: 'Names, avatars and latest messages in the sidebar',
		blurThread: 'Open chat only',
		blurThreadHint: 'Header, message text and photos inside the chat',
		blurHover: 'Reveal on hover',
		blurHoverHint: 'Show a blurred item while the pointer is over it',
		blurPersist: 'Keep revealed after hover',
		blurPersistHint: 'Once you hover an item, it stays visible until blur is turned off',
		collapseChatList: 'Collapse chat list',
		expandChatList: 'Expand chat list',
		resizeChatList: 'Drag to resize chat list',
		allChats: 'All',
		unreadChats: 'Unread',
		favoriteChats: 'Favorites',
		importantChats: 'Important',
		importantOnlyBanner: 'Showing important messages only',
		saveAsImportant: 'Save as important',
		removeImportant: 'Remove from important',
		noImportantConversations: 'No chats with important messages',
		noImportantMessages: 'No important messages in this chat',
		messageGroups: 'Message groups',
		messageGroupsHint: 'Group selected messages under a project name in this chat',
		selectForGroup: 'Select for group',
		cancelGroupSelect: 'Cancel',
		addToGroup: 'Add to group',
		removeFromGroup: 'Remove from group',
		createGroup: 'Create group',
		newGroupName: 'Group name (e.g. Al-Huda)',
		groupCreated: 'Group created',
		messagesAddedToGroup: 'Messages added to group',
		messagesRemovedFromGroup: 'Messages removed from group',
		groupDeleted: 'Group deleted',
		noMessageGroups: 'No groups in this chat yet',
		viewingGroupBanner: 'Showing group: {name}',
		backToChat: 'Back to full chat',
		deleteGroup: 'Delete group',
		openGroup: 'Open',
		selectMessagesFirst: 'Select messages first',
		chooseOrCreateGroup: 'Choose a group or create one',
		archived: 'Archived',
		archivedChats: 'Archived chats',
		archiveChat: 'Archive chat',
		unarchiveChat: 'Unarchive chat',
		archiveUpdated: 'Archived chats updated',
		noArchivedConversations: 'No archived chats',
		assignedTo: 'Assigned to',
		chatActions: 'Chat actions',
		allAssignees: 'All assignees',
		favoriteUpdated: 'Favorite updated',
		pinChat: 'Pin chat',
		unpinChat: 'Unpin chat',
		pinUpdated: 'Pinned chats updated',
		muteChat: 'Mute notifications',
		unmuteChat: 'Unmute notifications',
		muteUpdated: 'Notification mute updated',
		messagePreviewFallback: 'Message',
		online: 'Connected',
		offline: 'Not connected',
		connecting: 'Connecting',
		restoring: 'Restoring…',
		syncingPhone: 'Syncing with phone… keep WhatsApp open on your phone',
		keepPhoneOpenTitle: 'Keep WhatsApp open on your phone',
		keepPhoneOpenBody:
			'We are syncing chats and messages from your phone. Leave this page open and do not close WhatsApp on your phone until sync finishes.',
		keepPhoneOpenDoNotClose: 'Do not close this tab or the WhatsApp app',
		keepPhoneOpenStage: 'Syncing data…',
		phoneClosedTitle: 'Please open WhatsApp on your phone',
		phoneClosedBody:
			'Sync paused because the phone connection dropped. Open WhatsApp, keep it in the foreground, then continue.',
		phoneClosedRetry: 'I opened WhatsApp — continue',
		phoneClosedDismiss: 'Close',
		connectStarted: 'WhatsApp session started',
		connectStillSyncing: 'Session started — still syncing with your phone',
		sessionLinkedHint: 'Your phone shows this device as linked. Restoring session…',
		restartConnection: 'Restart connection',
		restartConnectionHint:
			'Connection looks stuck. Click Restart to close the old session and try again.',
		qrPending: 'Waiting for scan',
		generatingQr: 'Generating QR code…',
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
		reportsHint: 'Reply times only count when the team answered within 24 hours. The list below is assigned chats still waiting for a reply.',
		reportToday: 'Today',
		reportWeek: '7 days',
		reportMonth: '30 days',
		avgFirstReply: 'Typical reply',
		typicalReplyHint: 'Median time from a customer message to the next staff reply, ignoring old WhatsApp history.',
		waitingNow: 'Assigned, unanswered',
		waitingNowHint: 'Assigned chats where the last message is from the customer.',
		overdueNow: 'Late (15m+)',
		overdueHint: 'Those assigned chats waiting longer than 15 minutes.',
		bestToAssign: 'Best to assign next',
		noBestAssignee: 'No idle fast teammate right now',
		teamSla: 'People with assigned chats',
		teamSlaHint: 'Only teammates who currently have chats assigned to them.',
		medianReply: 'Typical reply',
		p90Reply: 'Slow end (9 of 10 faster)',
		assignedChats: 'Assigned chats',
		sentByThem: 'Sent by them',
		replyMix: 'Reply mix',
		unassignedWaiting: 'unassigned & waiting',
		waitingOnThem: 'Waiting on them',
		oldestWait: 'Oldest wait',
		pendingInbound: 'unanswered',
		repliesCounted: 'replies counted',
		fastReplies: 'under 5m',
		lateReplies: 'over 15m',
		replyDelays: 'How long each reply took',
		openWaiting: 'Chats waiting now',
		noReplyHistory: 'No timed replies in this period',
		noOpenWaiting: 'No unanswered chats on this person',
		waitingBoard: 'Assigned tickets still unanswered',
		waitingBoardHint: 'Chat on the left. Unanswered count and wait time on the right.',
		waitTime: 'Waiting',
		reportChat: 'Ticket',
		noWaitingBoard: 'No assigned chats are waiting for a reply',
		noAssignedStaff: 'No teammates currently have assigned chats',
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
		channels: 'القنوات',
		emails: 'إيميلات',
		emailsHint: 'مذكرة الإيميل — Gmail وملخصات AI وإرسال واتساب',
		calls: 'المكالمات',
		updates: 'التحديثات',
		communities: 'المجموعات',
		groups: 'المجموعات',
		noCalls: 'لا توجد مكالمات واتساب حتى الآن',
		callsUnavailable: 'سجل المكالمات غير متاح من حساب واتساب المتصل.',
		stories: 'الحالات',
		groups: 'المجموعات',
		statuses: 'الحالات',
		notifications: 'الإشعارات',
		reports: 'التقارير',
		board: 'لوحة المهام',
		boardHint: 'مهام على شكل Trello لهذا الحساب. اسحب البطاقات، أضف قوائم، واربط الشات.',
		addToBoard: 'إضافة للوحة المهام',
		addToBoardHint: 'كليك يمين على الرسائل أو حدّد عدة رسائل ثم اختر العمود',
		pickBoardColumn: 'اختر العمود',
		addToBoardNow: 'إضافة للمهام…',
		scheduleMessage: 'جدولة الرسالة',
		scheduleMessageHint: 'أرسل لاحقًا مرة واحدة أو بشكل متكرر',
		scheduledMessages: 'رسائل مجدولة',
		copyMessage: 'نسخ النص',
		copiedMessage: 'تم النسخ',
		selectMoreMessages: 'تحديد المزيد',
		clearMessageSelection: 'إلغاء التحديد',
		multiMessageActions: 'الرسائل المحددة',
		sentToBoard: 'تمت الإضافة للوحة المهام',
		openBoardTab: 'فتح لوحة المهام',
		settings: 'الإعدادات',
		settingsAi: 'ردود الذكاء الاصطناعي',
		settingsDemo: 'الوضع التجريبي',
		settingsNotifications: 'الإشعارات',
		settingsPrivacy: 'الخصوصية',
		settingsAccess: 'صلاحيات الفريق',
		profile: 'الملف الشخصي',
		profileName: 'الاسم',
		profilePhone: 'الهاتف',
		profileAbout: 'النبذة',
		profileStatus: 'الحالة',
		noWhatsAppProfile: 'اربط حساب واتساب لعرض الملف الشخصي.',
		manageWhatsAppAccount: 'إدارة الحساب',
		newAccount: 'حساب جديد',
		accountName: 'اسم الحساب',
		connect: 'ربط الحساب',
		disconnect: 'قطع الاتصال',
		logout: 'تسجيل الخروج',
		deleteAccount: 'حذف الحساب',
		deleteAccountConfirm:
			'هل تريد حذف "{name}" نهائيًا؟ سيتم حذف الجلسة والمحادثات والرسائل والوسائط والحالات والمجموعات والصلاحيات، ولا يمكن التراجع.',
		accountDeleted: 'تم حذف حساب واتساب',
		accountDeletedFreshReady:
			'تم حذف الحساب. حساب جديد جاهز — امسح رمز QR لربط هاتفك.',
		resetSession: 'حذف وإعادة المزامنة',
		resetSessionConfirm:
			'هل تريد حذف كل البيانات المتزامنة للحساب "{name}" وتنزيلها من الهاتف المتصل مرة أخرى؟ سيبقى ربط واتساب وصلاحيات الموظفين كما هما.',
		sessionResetStarted:
			'تم حذف البيانات القديمة وبدأت مزامنة نظيفة من الهاتف.',
		scanQr: 'امسح رمز QR من تطبيق واتساب',
		scanQrHint: 'افتح واتساب على هاتفك ← الأجهزة المرتبطة ← ربط جهاز',
		linkViaQr: 'رمز QR',
		linkViaPhone: 'رقم الهاتف',
		phoneNumberPlaceholder: 'مثال: ‎+201234567890',
		getPairingCode: 'الحصول على رمز الربط',
		pairingCodeTitle: 'أدخل هذا الرمز على هاتفك',
		pairingCodeHint:
			'افتح واتساب على هاتفك ← الأجهزة المرتبطة ← ربط برقم الهاتف بدلاً من ذلك ← أدخل هذا الرمز',
		pairingCodeReady: 'أدخل هذا الرمز على هاتفك',
		pairingCodeCopied: 'تم نسخ الرمز',
		phoneNumberRequired: 'أدخل رقم الهاتف أولاً',
		phoneNumberInvalid: 'أدخل رقم هاتف صحيح مع رمز الدولة',
		connectWhatsApp: 'ربط واتساب',
		linkDeviceTitle: 'ربط جهاز',
		linkDeviceHint: 'الاتصال عبر ربط الجهاز',
		phoneConnectTitle: 'رقم الهاتف',
		phoneConnectHint: 'الاتصال باستخدام رقم الهاتف',
		sendPairingCode: 'إرسال الرمز',
		verifyPhoneTitle: 'أكّد من هاتفك',
		verifyPhoneSent: 'تم إنشاء رمز الربط للرقم',
		didntReceiveCode: 'لم يصلك الرمز؟',
		resendCode: 'إعادة الإرسال',
		resendIn: 'إعادة الإرسال خلال {seconds}ث',
		changePhoneNumber: 'تعديل الرقم',
		waitingPhoneConfirm: 'بانتظار تأكيد الهاتف…',
		connectingWhatsApp: 'جارٍ ربط واتساب…',
		restorePhoneVerified: 'تم التحقق من الهاتف',
		restoreSessionRestored: 'تم استعادة الجلسة',
		restoreChatsRestored: 'تم استعادة المحادثات',
		restoreContactsRestored: 'تم استعادة جهات الاتصال',
		restoreLoadingMessages: 'جارٍ تحميل الرسائل…',
		restoreAlmostReady: 'أوشكنا على الانتهاء…',
		connectionMethodLabel: 'طريقة الاتصال',
		connectionMethodQr: 'جهاز مرتبط',
		connectionMethodPhone: 'رقم الهاتف',
		openWhatsAppInbox: 'فتح واتساب',
		noAccounts: 'لا توجد حسابات واتساب',
		noAccountsHint: 'أنشئ أول حساب لبدء ربط واتساب',
		noConversations: 'لا توجد محادثات بعد',
		noChannels: 'لا توجد قنوات مشتركة بعد',
		noAssignedConversations: 'لا توجد محادثات مسندة إليك',
		connectToSeeChats: 'اتصل بالحساب لعرض المحادثات',
		connectToSeeChannels: 'اتصل بالحساب لعرض القنوات',
		connectToSeeStories: 'اتصل بالحساب لعرض الحالات',
		syncingChats: 'جارِ مزامنة المحادثات من واتساب…',
		syncingChatsFetching:
			'جارِ تحميل قائمة المحادثات من هاتفك — أبقِ واتساب مفتوحاً. قد تستغرق هذه الخطوة 1–2 دقيقة.',
		syncProgress: 'تقدم المزامنة',
		selectConversation: 'اختر محادثة للبدء',
		selectConversationHint: 'اختار شات من القائمة عشان تقرأ وترد.',
		restoreSessionSubtitle: 'يرجى الانتظار أثناء استعادة جلستك السابقة',
		restoreStepSecureTitle: 'اتصال آمن',
		restoreStepSecureDesc: 'بياناتك مشفّرة',
		restoreStepSyncTitle: 'مزامنة الرسائل',
		restoreStepSyncDesc: 'جارٍ جلب محادثاتك',
		restoreStepDoneTitle: 'أوشكنا على الانتهاء',
		restoreStepDoneDesc: 'جارٍ إنهاء الإعداد',
		unreadMessagesLong: '{count} رسالة غير مقروءة',
		noMessagesYet: 'لا توجد رسائل في هذه المحادثة بعد',
		loadingMessages: 'جارِ تحميل الرسائل…',
		messagesStillSyncing:
			'واتساب ما زال يزامن مع الهاتف. جارٍ إعادة المحاولة تلقائياً…',
		mediaUnavailable: 'تعذر عرض الوسائط',
		loadingMedia: 'جارِ تحميل الوسائط…',
		tapToRetry: 'اضغط لإعادة المحاولة',
		fileAttachment: 'ملف مرفق',
		openFile: 'فتح',
		downloadFile: 'حفظ باسم...',
		saveAsFile: 'حفظ باسم...',
		selectMedia: 'تحديد وسائط',
		cancelSelectMedia: 'إلغاء',
		downloadSelectedMedia: 'تنزيل المحدد',
		selectAllMedia: 'تحديد كل الوسائط',
		noMediaToSelect: 'لا توجد وسائط قابلة للتنزيل في هذه المحادثة',
		downloadingSelectedMedia: 'جارِ تجهيز ملف ZIP…',
		selectedMediaDownloaded: 'تم تنزيل {count} ملف في ZIP',
		selectedMediaPartialFail: 'تم تجهيز ZIP بـ {ok} ملف، وفشل {failed}',
		selectedMediaZipEmpty: 'تعذر تنزيل الملفات المحددة',
		selectedMediaZipName: 'وسائط-واتساب',
		selectMessages: 'تحديد رسائل',
		cancelSelectMessages: 'إلغاء',
		selectAllMessages: 'تحديد الكل',
		noMessagesToSelect: 'لا توجد أصوات أو تذاكر للتحديد في هذه المحادثة',
		transcribeSelected: 'تحويل المحدد',
		selectedMessagesCount: '{count} محدد',
		needVoiceOrTicket: 'حدّد رسالة صوتية أو نصية واحدة على الأقل',
		tooManySelected: 'يمكنك تحديد حتى {count} رسالة في المرة',
		selectMessageAction: 'تحديد',
		reconnectAccount: 'إعادة ربط واتساب',
		autoConnecting: 'جارِ استعادة جلسة واتساب…',
		checkingSession: 'جارِ التحقق من جلسة واتساب…',
		loadingInbox: 'جارِ تحميل المحادثات…',
		sessionLinkBanner:
			'الجوال غير مربوط — امسح QR للإرسال والاستقبال. المحادثات المحفوظة تبقى ظاهرة.',
		sessionLinkAction: 'ربط الجوال',
		qrExpired: 'انتهت صلاحية رمز QR',
		qrRefresh: 'إنشاء رمز جديد',
		defaultAccountLabel: 'واتساب',
		openLink: 'فتح الرابط',
		copyLink: 'نسخ الرابط',
		linkCopied: 'تم نسخ الرابط',
		viewLinkInStory: 'مشاهدة داخل الحالة',
		openLinkExternally: 'فتح في المتصفح',
		transcribe: 'تحويل إلى نص',
		recordVoice: 'تسجيل رسالة صوتية',
		recordingVoice: 'جارِ تسجيل رسالة صوتية...',
		recordingLive: 'مباشر',
		recordingPaused: 'متوقف',
		recordingCancel: 'إلغاء',
		cancelRecording: 'إلغاء التسجيل',
		stopRecording: 'إيقاف التسجيل',
		recordingPause: 'إيقاف',
		recordingResume: 'متابعة',
		sendRecording: 'إرسال',
		recordingPreview: 'استمع',
		recordingPreviewStop: 'إيقاف المعاينة',
		recordingPreviewMode: 'معاينة',
		recordingPreviewPlaying: 'تشغيل',
		recordingPreviewPaused: 'متوقف',
		recordingPreviewPause: 'إيقاف المعاينة',
		recordingPreviewResume: 'متابعة المعاينة',
		recordingPreviewSeek: 'تقدم المعاينة',
		recordingPreviewEmpty: 'مفيش تسجيل لسه',
		recordingPreviewFailed: 'تعذر تشغيل المعاينة',
		microphoneDenied: 'تم رفض إذن استخدام الميكروفون',
		microphoneUnavailable: 'لا يوجد ميكروفون متاح',
		recordingUnsupported: 'تسجيل الصوت غير مدعوم في هذا المتصفح',
		recordingFailed: 'فشل تسجيل الرسالة الصوتية',
		recordingStartFailed: 'تعذر بدء تسجيل الرسالة الصوتية',
		voiceChanger: 'إعدادات تغيير الصوت',
		voiceChanging: 'جارِ تغيير الصوت…',
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
		replyToStory: 'رد',
		replyToStoryPlaceholder: 'اكتب ردًا على هذه الحالة…',
		storyReplySent: 'تم إرسال الرد',
		storyReplyUnavailable: 'تعذر الرد على هذه الحالة',
		loopStory: 'تكرار',
		loopStoryOn: 'التكرار مفعّل — سيعاد التشغيل بعد الانتهاء',
		loopStoryOff: 'التكرار متوقف',
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
		openSplitChat: 'فتح شات ثاني',
		splitPickHint: 'اختر شات آخر من القائمة لفتحه بجانب الحالي',
		cloneVoicePickHint: 'اختَر محادثة من القائمة — هتظهر رسائل صوتية بس للاستنساخ',
		cloneVoicePickDone: 'رجوع لإعدادات الصوت',
		cloneVoicePickCancel: 'إلغاء',
		cloneVoicePickIdle: 'اختَر محادثة من القائمة الجانبية',
		cloneVoicePickIdleHint: 'هتظهر رسائل صوتية المحادثة هنا. تقدر تختار شات تاني في أي وقت.',
		closeSplitChat: 'إغلاق الشات الثاني',
		splitChat: 'شات مقسوم',
		notesHint: 'ظاهرة للموظفين فقط — لا تُرسل على واتساب',
		addNote: 'إضافة ملاحظة',
		notePlaceholder: 'أضف ملاحظة داخلية…',
		noNotes: 'لا توجد ملاحظات داخلية بعد',
		noteSaved: 'تمت إضافة الملاحظة',
		search: 'بحث في المحادثات',
		readMore: 'اقرأ المزيد',
		readFullEmail: 'قراءة الإيميل كاملاً',
		blurToggle: 'تمويه الخصوصية',
		blurToggleHint: 'إخفاء الأسماء والصور والرسائل أثناء مشاركة الشاشة',
		blurTitle: 'تمويه الخصوصية',
		blurHint: 'إخفاء محتوى الشات أثناء مشاركة الشاشة',
		blurOptions: 'خيارات التمويه',
		blurList: 'قائمة المحادثات فقط',
		blurListHint: 'الأسماء والصور وآخر رسالة في الشريط الجانبي',
		blurThread: 'الشات المفتوح فقط',
		blurThreadHint: 'الاسم والنص والصور داخل المحادثة',
		blurHover: 'إظهار عند المرور بالماوس',
		blurHoverHint: 'يظهر العنصر المموّه طالما المؤشر فوقه',
		blurPersist: 'يبقى ظاهر بعد الهوفر',
		blurPersistHint: 'بعد أول هوفر يبقى ظاهر حتى إيقاف التمويه',
		collapseChatList: 'طي قائمة المحادثات',
		expandChatList: 'توسيع قائمة المحادثات',
		resizeChatList: 'اسحب لتغيير عرض قائمة المحادثات',
		allChats: 'الكل',
		unreadChats: 'غير مقروءة',
		favoriteChats: 'المفضلة',
		importantChats: 'مهم',
		importantOnlyBanner: 'عرض الرسائل المهمة فقط',
		saveAsImportant: 'حفظ كمهم',
		removeImportant: 'إزالة من المهم',
		noImportantConversations: 'لا توجد محادثات فيها عناصر مهمة',
		noImportantMessages: 'لا توجد رسائل مهمة في هذه المحادثة',
		messageGroups: 'مجموعات الرسائل',
		messageGroupsHint: 'اجمع الرسائل المحددة تحت اسم مشروع جوّه نفس الشات',
		selectForGroup: 'تحديد لمجموعة',
		cancelGroupSelect: 'إلغاء',
		addToGroup: 'إضافة للمجموعة',
		removeFromGroup: 'إزالة من المجموعة',
		createGroup: 'إنشاء مجموعة',
		newGroupName: 'اسم المجموعة (مثال: الهدى)',
		groupCreated: 'تم إنشاء المجموعة',
		messagesAddedToGroup: 'تمت إضافة الرسائل للمجموعة',
		messagesRemovedFromGroup: 'تمت إزالة الرسائل من المجموعة',
		groupDeleted: 'تم حذف المجموعة',
		noMessageGroups: 'لا توجد مجموعات في هذا الشات بعد',
		viewingGroupBanner: 'عرض المجموعة: {name}',
		backToChat: 'العودة لكل الرسائل',
		deleteGroup: 'حذف المجموعة',
		openGroup: 'فتح',
		selectMessagesFirst: 'حدّد رسائل أولاً',
		chooseOrCreateGroup: 'اختار مجموعة أو أنشئ واحدة',
		archived: 'مؤرشفة',
		archivedChats: 'المحادثات المؤرشفة',
		archiveChat: 'أرشفة المحادثة',
		unarchiveChat: 'إلغاء أرشفة المحادثة',
		archiveUpdated: 'تم تحديث المحادثات المؤرشفة',
		noArchivedConversations: 'لا توجد محادثات مؤرشفة',
		assignedTo: 'المسند إلى',
		chatActions: 'إجراءات المحادثة',
		allAssignees: 'كل الموظفين',
		favoriteUpdated: 'تم تحديث المفضلة',
		pinChat: 'تثبيت المحادثة',
		unpinChat: 'إلغاء تثبيت المحادثة',
		pinUpdated: 'تم تحديث المحادثات المثبتة',
		muteChat: 'كتم الإشعارات',
		unmuteChat: 'إلغاء كتم الإشعارات',
		muteUpdated: 'تم تحديث كتم الإشعارات',
		messagePreviewFallback: 'رسالة',
		online: 'متصل',
		offline: 'غير متصل',
		connecting: 'جارِ الاتصال',
		restoring: 'جارٍ الاستعادة…',
		syncingPhone: 'جارٍ المزامنة مع الهاتف… أبقِ واتساب مفتوحاً على هاتفك',
		keepPhoneOpenTitle: 'أبقِ واتساب مفتوحاً على هاتفك',
		keepPhoneOpenBody:
			'نقوم الآن بمزامنة المحادثات والرسائل من هاتفك. اترك هذه الصفحة مفتوحة ولا تغلق واتساب على الهاتف حتى تنتهي المزامنة.',
		keepPhoneOpenDoNotClose: 'لا تغلق هذا التبويب ولا تطبيق واتساب',
		keepPhoneOpenStage: 'جارٍ مزامنة البيانات…',
		phoneClosedTitle: 'من فضلك افتح واتساب على هاتفك',
		phoneClosedBody:
			'توقفت المزامنة لأن الاتصال بالهاتف انقطع. افتح واتساب واتركه في الواجهة ثم أكمل.',
		phoneClosedRetry: 'فتحت واتساب — متابعة',
		phoneClosedDismiss: 'إغلاق',
		connectStarted: 'تم بدء جلسة واتساب',
		connectStillSyncing: 'بدأت الجلسة — ما زالت المزامنة مع الهاتف جارية',
		sessionLinkedHint: 'هاتفك يعرض الجهاز كمربوط. جارٍ استعادة الجلسة…',
		restartConnection: 'إعادة تشغيل الاتصال',
		restartConnectionHint:
			'يبدو أن الاتصال عالق. اضغط إعادة التشغيل لإغلاق الجلسة القديمة والمحاولة من جديد.',
		qrPending: 'بانتظار المسح',
		generatingQr: 'جارِ إنشاء رمز QR…',
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
		reportsHint: 'وقت الرد بيتحسب بس لو الفريق رد خلال ٢٤ ساعة. اللي تحت: شاتات مسندة ولسه آخر رسالة فيها من العميل.',
		reportToday: 'اليوم',
		reportWeek: '٧ أيام',
		reportMonth: '٣٠ يوم',
		avgFirstReply: 'مدة الرد المعتادة',
		typicalReplyHint: 'الوسيط من رسالة العميل لحد رد الموظف، من غير تاريخ واتساب القديم.',
		waitingNow: 'مسندة ومن غير رد',
		waitingNowHint: 'شاتات متعمل لها assign وآخر رسالة فيها من العميل.',
		overdueNow: 'متأخرة (١٥ د+)',
		overdueHint: 'من الشاتات المسندة اللي مستنية أكتر من ١٥ دقيقة.',
		bestToAssign: 'الأنسب للإسناد دلوقتي',
		noBestAssignee: 'مفيش حد فاضي وسريع دلوقتي',
		teamSla: 'الناس اللي عندهم شاتات مسندة',
		teamSlaHint: 'بيظهر بس الزملاء اللي عليهم شاتات assign دلوقتي.',
		medianReply: 'الرد المعتاد',
		p90Reply: 'أبطأ ردود (٩ من ١٠ أسرع)',
		assignedChats: 'شاتات مسندة',
		sentByThem: 'رسايل باعته',
		replyMix: 'توزيع الردود',
		unassignedWaiting: 'من غير إسناد ومستنية',
		waitingOnThem: 'مستني عليه',
		oldestWait: 'أقدم انتظار',
		pendingInbound: 'من غير رد',
		repliesCounted: 'ردود اتحسبت',
		fastReplies: 'أقل من ٥ د',
		lateReplies: 'أكتر من ١٥ د',
		replyDelays: 'كل رد اتأخر قد إيه',
		openWaiting: 'شاتات مستنية دلوقتي',
		noReplyHistory: 'مفيش ردود متوقّتة في الفترة دي',
		noOpenWaiting: 'مفيش شاتات مفتوحة من غير رد على الشخص ده',
		waitingBoard: 'تذاكر مسندة لسه من غير رد',
		waitingBoardHint: 'اسم الشات على الشمال. عدد الرسائل بدون رد ومدة الانتظار على اليمين.',
		waitTime: 'مدة الانتظار',
		reportChat: 'التذكرة',
		noWaitingBoard: 'مفيش شاتات مسندة مستنية رد دلوقتي',
		noAssignedStaff: 'مفيش حد من الفريق عليه شاتات مسندة دلوقتي',
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
	['channels', Radio],
	['statuses', Zap],
	['groups', Users],
	['reports', BarChart3],
	['board', LayoutGrid],
	['settings', Settings],
];

const GRADIENT = 'linear-gradient(135deg, #1DAB61 0%, #1DAB61 100%)';
const GLOW = '0 10px 24px -10px var(--color-primary-400)';
const BRAND_GRADIENT = 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-secondary-500) 100%)';
const CONVERSATIONS_CACHE_TTL = WHATSAPP_STALE_TIME;
// Memory paint TTL — WhatsApp Web keeps chats warm in-session; 30s forced
// revalidation felt like endless loading. DB is the durable store; sockets
// deliver live rows. Re-fetch DB quietly when TTL expires.
const MESSAGES_CACHE_TTL = MESSAGES_CACHE_TTL_MS;
const STATUSES_CACHE_TTL = 60_000;

function DeliveryTicks({ message, size = 13, className = '', selfChat = false }) {
	const state = messageDeliveryState(message, { selfChat });
	if (state === 'hidden') return null;
	if (state === 'pending') {
		return <Clock size={Math.max(12, size - 1)} className={`animate-pulse ${className}`} />;
	}
	if (state === 'failed') {
		return <AlertCircle size={size} className={`text-rose-500 ${className}`} />;
	}
	if (state === 'read') {
		return <CheckCheck size={size} className={`text-[#53BDEB] ${className}`} />;
	}
	if (state === 'delivered') {
		return <CheckCheck size={size} className={`text-[#8696A0] ${className}`} />;
	}
	return <Check size={size} className={className} />;
}

function newClientMessageId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function releaseBlobUrl(url) {
	if (typeof url !== 'string' || !url.startsWith('blob:')) return;
	window.setTimeout(() => {
		try {
			URL.revokeObjectURL(url);
		} catch {
			/* ignore revoked or already-detached blob URLs */
		}
	}, 8000);
}

function releaseOptimisticMediaPreview(message) {
	for (const attachment of message?.attachments || []) {
		releaseBlobUrl(attachment?.url);
	}
}

function outgoingMediaType(file, forcedType) {
	if (forcedType) return forcedType;
	if (file?.type?.startsWith('image/')) return 'image';
	if (file?.type?.startsWith('video/')) return 'video';
	if (file?.type?.startsWith('audio/')) return 'audio';
	return 'document';
}

function isOptimisticVoiceType(type) {
	return ['voice', 'audio', 'ptt'].includes(String(type || '').toLowerCase());
}

function isMultiSelectClick(event) {
	return Boolean(event?.ctrlKey || event?.metaKey);
}

function statusMeta(status, t, account) {
	if (status === 'connected') return { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: t.online };
	if (status === 'qr_pending') {
		return {
			dot: 'bg-amber-500',
			text: 'text-amber-600',
			bg: 'bg-amber-50 dark:bg-amber-950/30',
			label: t.qrPending,
			hint: t.scanQrHint,
		};
	}
	if (status === 'connecting') {
		const restoring = Boolean(account?.lastConnectedAt);
		return {
			dot: 'bg-amber-500',
			text: 'text-amber-600',
			bg: 'bg-amber-50 dark:bg-amber-950/30',
			label: restoring ? t.restoring || t.connecting : t.connecting,
			hint: restoring ? t.sessionLinkedHint : t.syncingPhone,
		};
	}
	if (status === 'error') return { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', label: t.errorStatus };
	return { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: t.offline };
}

function statusGradient(status) {
	if (status === 'connected') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
	if (['connecting', 'qr_pending'].includes(status)) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
	if (status === 'error') return 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
	return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
}

/** Overlay only when the phone connection actually dropped and the user must retry. */
function PhoneSyncGate({
	open,
	progress = 0,
	stage = '',
	phoneClosed = false,
	labels,
	locale = 'en',
	onRetry,
	onDismiss,
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) return undefined;
		const onBeforeUnload = event => {
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload);
			document.body.style.overflow = prevOverflow;
		};
	}, [open]);

	if (!open || !mounted) return null;

	const pct = Math.max(1, Math.min(100, Number(progress) || 1));
	const stageHint =
		stage === 'prefetch_history'
			? locale === 'ar'
				? 'جاري تجهيز أحدث الرسائل…'
				: 'Warming recent message history…'
			: stage === 'phone_wait'
				? locale === 'ar'
					? 'أبقِ واتساب مفتوحاً — جارٍ إعادة الاتصال…'
					: 'Keep WhatsApp open — reconnecting…'
			: stage === 'fetching_chats' || stage === 'chats' || (pct >= 25 && pct <= 45)
				? labels.syncingChatsFetching || labels.syncingChats
				: labels.keepPhoneOpenStage || labels.syncingChats;

	return createPortal(
		<div
			className={`wa-phone-sync-gate${phoneClosed ? ' is-phone-closed' : ''}`}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="wa-phone-sync-title"
			aria-describedby="wa-phone-sync-desc"
		>
			<div className="wa-phone-sync-gate__backdrop" />
			<div className="wa-phone-sync-gate__card">
				<div className="wa-phone-sync-gate__phone" aria-hidden="true">
					<div className="wa-phone-sync-gate__phone-bezel">
						<div className="wa-phone-sync-gate__phone-notch" />
						<div className="wa-phone-sync-gate__phone-screen">
							<div className="wa-phone-sync-gate__wa-mark">
								<svg viewBox="0 0 24 24" width="36" height="36" fill="none" aria-hidden="true">
									<path
										d="M12 2.2C6.6 2.2 2.2 6.5 2.2 11.8c0 1.9.5 3.7 1.5 5.3L2 22l5.1-1.6c1.5.8 3.2 1.3 4.9 1.3 5.4 0 9.8-4.3 9.8-9.7S17.4 2.2 12 2.2Z"
										fill="#25D366"
									/>
									<path
										d="M16.6 14.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.4 3.8 3.4 2.2.9 2.2.6 2.6.6.4 0 1.3-.5 1.4-1 .2-.5.2-.9.1-1Z"
										fill="#fff"
									/>
								</svg>
							</div>
							{!phoneClosed && (
								<div className="wa-phone-sync-gate__pulse-rings">
									<span />
									<span />
									<span />
								</div>
							)}
							{phoneClosed && (
								<div className="wa-phone-sync-gate__closed-badge">!</div>
							)}
						</div>
					</div>
					<div className="wa-phone-sync-gate__signal">
						<span />
						<span />
						<span />
					</div>
				</div>

				<h2 id="wa-phone-sync-title" className="wa-phone-sync-gate__title">
					{phoneClosed ? labels.phoneClosedTitle : labels.keepPhoneOpenTitle}
				</h2>
				<p id="wa-phone-sync-desc" className="wa-phone-sync-gate__body">
					{phoneClosed ? labels.phoneClosedBody : labels.keepPhoneOpenBody}
				</p>

				{!phoneClosed && (
					<div className="wa-phone-sync-gate__warn">
						<Smartphone size={16} className="shrink-0" />
						<span>{labels.keepPhoneOpenDoNotClose}</span>
					</div>
				)}

				{!phoneClosed ? (
					<div className="wa-phone-sync-gate__progress-wrap">
						<div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
							<span className="inline-flex items-center gap-1.5">
								<Loader2 size={12} className="animate-spin text-[#00A884]" />
								{stageHint}
							</span>
							<span className="tabular-nums text-slate-700 dark:text-slate-200">{pct}%</span>
						</div>
						<div className="wa-phone-sync-gate__track">
							<div className="wa-phone-sync-gate__fill" style={{ width: `${pct}%` }} />
						</div>
					</div>
				) : (
					<div className="wa-phone-sync-gate__actions">
						<button type="button" className="wa-phone-sync-gate__btn-primary" onClick={onRetry}>
							{labels.phoneClosedRetry}
						</button>
						<button type="button" className="wa-phone-sync-gate__btn-ghost" onClick={onDismiss}>
							{labels.phoneClosedDismiss}
						</button>
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
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

function ImageMessage({
	url,
	alt,
	onOpen,
	className = '',
	previewUrl = null,
	loading = false,
	unavailable = false,
	cover = true,
	selectMode = false,
	retryLabel = 'Tap to retry',
	loadingLabel = 'Loading media…',
}) {
	const [loaded, setLoaded] = useState(false);
	const [broken, setBroken] = useState(false);
	const [previewReady, setPreviewReady] = useState(false);

	useEffect(() => {
		setLoaded(false);
		setBroken(false);
	}, [url]);

	useEffect(() => {
		setPreviewReady(false);
	}, [previewUrl]);

	const previewSrc = previewUrl || null;
	const hasFull = Boolean(url);
	const isBroken = Boolean(broken || (unavailable && !hasFull));
	const isPending =
		!isBroken &&
		(loading || (hasFull && !loaded) || (!hasFull && Boolean(previewSrc || loading)));
	const showFrame = !cover && (isPending || isBroken) && !hasFull;
	const showSkeleton = !isBroken && !previewReady && !loaded && !showFrame;
	const fitClass = cover
		? 'absolute inset-0 z-[1] h-full w-full object-cover'
		: 'wa-photo-main relative z-[1] mx-auto block h-auto w-auto max-w-full object-contain';

	return (
		<button
			type="button"
			aria-label={isBroken ? retryLabel : alt || 'Open image preview'}
			aria-busy={isPending}
			onClick={event => {
				if (selectMode) {
					// Keep bubbling so the message row can toggle selection (images included).
					return;
				}
				onOpen?.(event);
			}}
			disabled={selectMode && isBroken && !previewSrc}
			className={`wa-photo-open relative block overflow-hidden ${
				cover ? 'h-full min-h-0 w-full' : showFrame ? 'wa-photo-frame' : 'h-auto w-auto max-w-full'
			} ${isPending ? 'is-loading' : isBroken ? 'is-unavailable' : 'is-ready'} ${
				previewSrc ? 'wa-photo-has-preview' : 'wa-photo-no-preview'
			} ${selectMode ? 'wa-photo-select-mode' : ''} ${className}`}
		>
			{showFrame ? <span className="wa-photo-sizer" aria-hidden="true" /> : null}
			{showSkeleton ? <span className="wa-photo-skeleton" aria-hidden="true" /> : null}
			{previewSrc && !isBroken ? (
				<img
					src={previewSrc}
					alt=""
					aria-hidden="true"
					draggable={false}
					onLoad={() => setPreviewReady(true)}
					className={`wa-photo-placeholder ${
						cover || showFrame
							? 'absolute inset-0 h-full w-full object-cover'
							: 'absolute inset-0 z-0 h-full w-full object-cover'
					} ${loaded ? 'is-faded' : 'is-visible'}`}
				/>
			) : null}
			{isBroken && !hasFull ? (
				<div
					className={`wa-photo-state ${
						cover ? 'absolute inset-0' : 'absolute inset-0'
					}`}
				>
					<span className="wa-photo-state__icon" aria-hidden="true">
						<ImageOff size={28} strokeWidth={1.75} />
					</span>
					<span className="wa-photo-state__action" aria-hidden="true">
						<RefreshCw size={18} strokeWidth={2.4} />
					</span>
					<span className="wa-photo-state__label">{retryLabel}</span>
				</div>
			) : hasFull ? (
				<img
					src={url}
					alt={alt}
					draggable={false}
					onLoad={() => setLoaded(true)}
					onError={() => {
						setBroken(!previewSrc);
						setLoaded(false);
					}}
					className={`${fitClass} wa-photo-full ${loaded ? 'is-loaded' : 'is-pending'}`}
				/>
			) : null}
			{isPending ? (
				<div className="wa-photo-state is-loading-state" aria-hidden="true">
					<span className="wa-photo-state__icon wa-photo-state__icon--muted">
						<ImageIcon size={28} strokeWidth={1.75} />
					</span>
					<span className="wa-photo-download__ring">
						<Loader2 size={22} strokeWidth={2.25} className="animate-spin" />
					</span>
					<span className="wa-photo-state__label wa-photo-state__label--soft">{loadingLabel}</span>
				</div>
			) : null}
			{!isBroken && onOpen && !isPending && hasFull && loaded ? (
				<span className="wa-photo-open-hint" aria-hidden="true">
					<Expand size={15} strokeWidth={2.4} />
				</span>
			) : null}
		</button>
	);
}

function openStreetMapTileUrl(lat, lng, zoom = 15) {
	const n = 2 ** zoom;
	const latRad = (lat * Math.PI) / 180;
	const x = Math.floor(((lng + 180) / 360) * n);
	const y = Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
	);
	if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
	return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

function ContactMessageCard({ message, locale = 'en' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const raw = message?.raw && typeof message.raw === 'object' ? message.raw : {};
	const contactNode =
		raw?.message?.contactMessage ||
		raw?.contactMessage ||
		raw?.message?.contactsArrayMessage?.contacts?.[0] ||
		null;
	const displayName =
		String(
			contactNode?.displayName ||
				message?.contactName ||
				message?.text ||
				'',
		).trim() || (ar ? 'جهة اتصال' : 'Contact');
	const vcard = String(contactNode?.vcard || contactNode?.vCard || '');
	const phoneMatch = vcard.match(/TEL[^:]*:([+\d\s-]+)/i);
	const phone = String(phoneMatch?.[1] || message?.senderWaId || '')
		.replace(/\s+/g, ' ')
		.trim();
	return (
		<div className="wa-contact-card mb-1 flex min-w-[220px] max-w-[280px] items-center gap-3 rounded-xl border border-black/5 bg-black/[0.04] p-2.5 dark:border-white/10 dark:bg-white/[0.06]">
			<span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00A884]/15 text-[#00A884]">
				<User size={22} />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-bold">{displayName}</p>
				{phone ? (
					<p dir="ltr" className="truncate text-[11px] opacity-70">
						{phone}
					</p>
				) : (
					<p className="text-[11px] opacity-60">{ar ? 'بطاقة جهة اتصال' : 'Contact card'}</p>
				)}
			</div>
		</div>
	);
}

function LocationMessage({ message, location, type, locale = 'en', conversationId = null }) {
	const [mapFailed, setMapFailed] = useState(false);
	const [opening, setOpening] = useState(false);
	const resolved = location || whatsAppLocationFromMessage(message);
	const isLive =
		Boolean(resolved?.isLive) ||
		['live_location', 'livelocation'].includes(String(type || message?.type || '').toLowerCase());
	const arabic = String(locale).toLowerCase().startsWith('ar');
	const fallbackLabel = arabic
		? isLive
			? 'موقع مباشر'
			: 'موقع'
		: isLive
			? 'Live location'
			: 'Location';
	const lat = Number(resolved?.latitude);
	const lng = Number(resolved?.longitude);
	const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
	const title = String(resolved?.name || '').trim() || fallbackLabel;
	const address = String(resolved?.address || '').trim();
	const href = whatsAppLocationHref(message, resolved);
	const subtitle =
		address ||
		(arabic ? 'عرض على الخريطة' : 'Open in Maps');
	const preview = resolved?.previewDataUrl;
	const tileUrl = hasCoords && !preview ? openStreetMapTileUrl(lat, lng) : null;
	const showPin = Boolean((tileUrl && !mapFailed) || (!preview && !tileUrl) || (preview && mapFailed));
	const openMaps = async event => {
		event.preventDefault();
		event.stopPropagation();
		let mapsHref = href;
		if (
			!mapsHref &&
			conversationId &&
			message?.id &&
			!String(message.id).startsWith('live:') &&
			!String(message.id).startsWith('pending:')
		) {
			setOpening(true);
			let authFailed = false;
			let apiFailed = false;
			let notConnected = false;
			try {
				const { data } = await api.get(
					`/whatsapp/conversations/${conversationId}/messages/${message.id}/location`,
					{ timeout: 45000 },
				);
				const location = data?.location || data?.data?.location || null;
				mapsHref = whatsAppLocationHref({ ...message, location }, location);
			} catch (error) {
				authFailed = Number(error?.response?.status) === 401;
				const apiMessage = String(
					error?.response?.data?.message || error?.message || '',
				).toLowerCase();
				notConnected = apiMessage.includes('not connected');
				apiFailed = true;
				mapsHref = null;
			} finally {
				setOpening(false);
			}
			if (!mapsHref && authFailed) return;
			if (!mapsHref && notConnected) {
				toast.error(
					arabic
						? 'اربط واتساب أولاً ثم أعد فتح الموقع'
						: 'Link WhatsApp first, then open this location again',
				);
				return;
			}
			if (!mapsHref && apiFailed) {
				toast.error(
					arabic
						? 'إحداثيات هذه الرسالة غير محفوظة. اطلب إرسال الموقع مرة أخرى'
						: 'This location was not saved. Ask them to send it again',
				);
				return;
			}
		}
		if (!mapsHref) {
			toast.error(arabic ? 'لا يمكن فتح هذا الموقع' : 'This location cannot be opened');
			return;
		}
		window.open(mapsHref, '_blank', 'noopener,noreferrer');
	};
	const map = (
		<div className="wa-location-map">
			{preview && !mapFailed ? (
				<img
					src={preview}
					alt=""
					className="wa-location-map-media"
					onError={() => setMapFailed(true)}
				/>
			) : tileUrl && !mapFailed ? (
				<img
					src={tileUrl}
					alt=""
					className="wa-location-map-media"
					onError={() => setMapFailed(true)}
				/>
			) : (
				<div className="wa-location-map-fallback" aria-hidden="true">
					<span className="wa-location-map-roads" />
				</div>
			)}
			{showPin ? (
				<span className="wa-location-map-pin" aria-hidden="true">
					<MapPin size={26} strokeWidth={2.2} />
				</span>
			) : null}
		</div>
	);
	return (
		<button
			type="button"
			className="wa-location-link"
			onPointerDown={event => event.stopPropagation()}
			onClick={openMaps}
			disabled={opening}
			aria-label={subtitle || title}
		>
			<div className="wa-location-card">
				{map}
				<div className="wa-location-copy">
					<p className="wa-location-title">{title}</p>
					{subtitle ? <p className="wa-location-sub">{subtitle}</p> : null}
				</div>
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
		<div role="dialog" aria-modal="true" aria-label="Chat image viewer" className="wa-chat-image-viewer fixed inset-0 z-400 flex flex-col bg-[#0b141a]" onClick={onClose}>
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

async function fetchAttachmentContentBlob(attachmentId, { timeout = 60_000 } = {}) {
	const debugMedia =
		typeof window !== 'undefined' &&
		window.localStorage?.getItem('WA_MEDIA_DEBUG') === '1';
	const started = debugMedia ? performance.now() : 0;
	const response = await api.get(`/whatsapp/attachments/${attachmentId}/content`, {
		responseType: 'blob',
		validateStatus: () => true,
		timeout,
	});
	const blob = response.data;
	if (debugMedia) {
		const ms = Math.round(performance.now() - started);
		const sizeKb = blob instanceof Blob ? Math.round(blob.size / 1024) : 0;
		// eslint-disable-next-line no-console
		console.debug(
			`[wa-media] content ${attachmentId.slice(0, 8)}… status=${response.status} ${ms}ms ${sizeKb}KB`,
		);
	}
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
		headerType.includes('text/html') ||
		blobType.includes('text/')
	) {
		throw new Error((await readBlobErrorMessage(blob)) || 'Media unavailable');
	}
	if (!blob.size) throw new Error('Media unavailable');
	if (
		(!blobType || blobType === 'application/octet-stream') &&
		(headerType.startsWith('image/') ||
			headerType.startsWith('video/') ||
			headerType.startsWith('audio/'))
	) {
		return new Blob([blob], { type: headerType });
	}
	return blob;
}

// Media that is not on disk yet is pulled from the linked WhatsApp Web page one
// item at a time. A chat page full of photos and voice notes used to fire every
// request at once, which saturated the browser connection pool and made each
// one time out. Requests are therefore deduped per attachment and drained a few
// at a time, with playback/open actions jumping ahead of background prefetches.
const ATTACHMENT_FETCH_CONCURRENCY = 8;
const ATTACHMENT_BLOB_CACHE_LIMIT = 120;
const attachmentBlobCache = new Map();
const attachmentBlobRequests = new Map();
const attachmentFetchQueue = [];
let attachmentFetchActive = 0;

function attachmentFetchPriorityScore(attachmentId, { priority = false, kind = '' } = {}) {
	if (priority) return 0;
	const type = String(kind || '').toLowerCase();
	if (
		type === 'image' ||
		type === 'sticker' ||
		type === 'audio' ||
		type === 'ptt' ||
		type === 'voice'
	) {
		return 1;
	}
	if (type === 'video') return 2;
	return 3;
}

function drainAttachmentFetchQueue() {
	while (
		attachmentFetchActive < ATTACHMENT_FETCH_CONCURRENCY &&
		attachmentFetchQueue.length
	) {
		attachmentFetchQueue.sort((a, b) => a.score - b.score);
		const task = attachmentFetchQueue.shift();
		attachmentFetchActive += 1;
		task.run().finally(() => {
			attachmentFetchActive -= 1;
			drainAttachmentFetchQueue();
		});
	}
}

function requestAttachmentBlob(
	attachmentId,
	{ timeout = 60_000, priority = false, kind = '' } = {},
) {
	const id = String(attachmentId || '');
	if (!id) return Promise.reject(new Error('Attachment is unavailable'));
	const cached = attachmentBlobCache.get(id);
	if (cached) return Promise.resolve(cached);
	const pending = attachmentBlobRequests.get(id);
	if (pending) return pending;

	const promise = new Promise((resolve, reject) => {
		const run = () =>
			fetchAttachmentContentBlob(id, { timeout })
				.then(blob => {
					rememberAttachmentBlob(id, blob);
					resolve(blob);
				})
				.catch(reject);
		const entry = {
			score: attachmentFetchPriorityScore(id, { priority, kind }),
			run,
		};
		if (priority) attachmentFetchQueue.unshift(entry);
		else attachmentFetchQueue.push(entry);
		drainAttachmentFetchQueue();
	}).finally(() => {
		attachmentBlobRequests.delete(id);
	});

	attachmentBlobRequests.set(id, promise);
	return promise;
}

function rememberAttachmentBlob(attachmentId, blob) {
	attachmentBlobCache.set(attachmentId, blob);
	while (attachmentBlobCache.size > ATTACHMENT_BLOB_CACHE_LIMIT) {
		const oldest = attachmentBlobCache.keys().next().value;
		if (oldest === undefined) break;
		attachmentBlobCache.delete(oldest);
	}
}

function forgetAttachmentBlob(attachmentId) {
	const id = String(attachmentId || '');
	if (!id) return;
	attachmentBlobCache.delete(id);
	attachmentBlobRequests.delete(id);
}

/** Defers media requests until the bubble is close to the viewport. */
function useNearViewport(elementRef, { rootMargin = '600px' } = {}) {
	const [isNear, setIsNear] = useState(false);
	useEffect(() => {
		if (isNear) return undefined;
		let cancelled = false;
		let observer = null;
		let raf = 0;
		let tries = 0;
		const marginPx = Number.parseInt(String(rootMargin), 10);
		const pad = Number.isFinite(marginPx) ? Math.abs(marginPx) : 600;

		const markNear = () => {
			if (!cancelled) setIsNear(true);
		};

		const isAlreadyNear = node => {
			const rect = node.getBoundingClientRect();
			if (!(rect.width > 0 || rect.height > 0)) return false;
			const vh = typeof window === 'undefined' ? 0 : window.innerHeight || 0;
			return rect.top < vh + pad && rect.bottom > -pad;
		};

		const attach = () => {
			if (cancelled) return;
			const node = elementRef.current;
			// Ref is often null on the first effect tick — retry until mounted.
			if (!node) {
				if (tries++ < 90) raf = window.requestAnimationFrame(attach);
				else markNear();
				return;
			}
			if (typeof IntersectionObserver === 'undefined') {
				markNear();
				return;
			}
			const rect = node.getBoundingClientRect();
			// Zero-size tiles never intersect — load anyway after a short settle.
			if (!(rect.width > 0 || rect.height > 0)) {
				if (tries++ < 45) raf = window.requestAnimationFrame(attach);
				else markNear();
				return;
			}
			if (isAlreadyNear(node)) {
				markNear();
				return;
			}
			observer = new IntersectionObserver(
				entries => {
					if (entries.some(entry => entry.isIntersecting)) markNear();
				},
				{ rootMargin },
			);
			observer.observe(node);
		};

		attach();
		return () => {
			cancelled = true;
			if (raf) window.cancelAnimationFrame(raf);
			observer?.disconnect();
		};
	}, [elementRef, isNear, rootMargin]);
	return isNear;
}

function computeBesideMenuPosition(anchorRect, menuSize = { width: 228, height: 280 }) {
	const gap = 6;
	const margin = 10;
	const viewportW =
		typeof window === 'undefined' ? 1280 : window.innerWidth || 1280;
	const viewportH =
		typeof window === 'undefined' ? 720 : window.innerHeight || 720;
	const width = Math.min(menuSize.width, viewportW - margin * 2);
	const height = Math.min(menuSize.height, viewportH - margin * 2);
	const rect = anchorRect || {
		top: margin,
		bottom: margin + 32,
		left: viewportW - width - margin,
		right: viewportW - margin,
		width: 32,
		height: 32,
	};
	const isRtl =
		typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
	let left = isRtl ? rect.left - gap - width : rect.right + gap;
	if (left + width > viewportW - margin) {
		left = rect.left - gap - width;
	}
	if (left < margin) {
		left = Math.min(rect.right + gap, viewportW - width - margin);
	}
	left = Math.max(margin, Math.min(left, viewportW - width - margin));
	let top = rect.top;
	if (top + height > viewportH - margin) {
		top = Math.max(margin, viewportH - height - margin);
	}
	return { top, left, width, maxHeight: height };
}

function computeAnchoredMenuPosition(anchorRect, menuSize = { width: 220, height: 420 }) {
	const gap = 8;
	const margin = 12;
	const viewportW =
		typeof window === 'undefined' ? 1280 : window.innerWidth || 1280;
	const viewportH =
		typeof window === 'undefined' ? 720 : window.innerHeight || 720;
	const width = Math.min(menuSize.width, viewportW - margin * 2);
	const height = Math.min(menuSize.height, viewportH - margin * 2);
	const rect = anchorRect || {
		top: margin,
		bottom: margin + 32,
		left: viewportW - width - margin,
		right: viewportW - margin,
		width: 32,
		height: 32,
	};
	const spaceBelow = viewportH - rect.bottom - margin;
	const spaceAbove = rect.top - margin;
	const openUp = spaceBelow < height && spaceAbove > spaceBelow;
	let top = openUp ? rect.top - gap - height : rect.bottom + gap;
	top = Math.max(margin, Math.min(top, viewportH - height - margin));
	let left = rect.right - width;
	left = Math.max(margin, Math.min(left, viewportW - width - margin));
	return {
		top,
		left,
		width,
		maxHeight: height,
		placement: openUp ? 'top' : 'bottom',
	};
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MORE_REACTIONS = [
	'🔥', '👏', '🥰', '😍', '💯', '🎉', '😭', '💪',
	'🫡', '👀', '✨', '🤝', '🌹', '💔', '😅', '🤩',
];

function computeReactionPickerPosition(anchorRect, options = {}) {
	const gap = 4;
	const margin = 10;
	const width = options.width || 156;
	const height = options.height || 24;
	const mine = Boolean(options.mine);
	const viewportW =
		typeof window === 'undefined' ? 1280 : window.innerWidth || 1280;
	const viewportH =
		typeof window === 'undefined' ? 720 : window.innerHeight || 720;
	const rect = anchorRect || {
		top: margin,
		bottom: margin + 32,
		left: viewportW - width - margin,
		right: viewportW - margin,
		width: 32,
		height: 32,
	};
	const clampedWidth = Math.min(width, viewportW - margin * 2);
	const clampedHeight = Math.min(height, viewportH - margin * 2);
	const spaceBelow = viewportH - rect.bottom - margin;
	const spaceAbove = rect.top - margin;
	const openUp = spaceBelow < clampedHeight && spaceAbove > spaceBelow;
	let top = openUp ? rect.top - gap - clampedHeight : rect.bottom + gap;
	top = Math.max(margin, Math.min(top, viewportH - clampedHeight - margin));
	let left = mine ? rect.right - clampedWidth : rect.left;
	left = Math.max(margin, Math.min(left, viewportW - clampedWidth - margin));
	return { top, left, width: clampedWidth, placement: openUp ? 'top' : 'bottom' };
}

function ownReactionEmoji(message) {
	return (message?.reactions || []).find(reaction => reaction.actorKey === 'me')?.emoji || '';
}

async function mapPool(items, concurrency, worker) {
	const list = Array.isArray(items) ? items : [];
	if (!list.length) return [];
	const limit = Math.max(1, Math.min(Number(concurrency) || 1, list.length));
	let cursor = 0;
	const runners = Array.from({ length: limit }, async () => {
		while (cursor < list.length) {
			const index = cursor;
			cursor += 1;
			await worker(list[index], index);
		}
	});
	await Promise.all(runners);
}

async function fetchStatusMediaBlob(accountId, statusId) {
	const response = await api.get(
		`/whatsapp/accounts/${accountId}/statuses/${statusId}/content`,
		{
			responseType: 'blob',
			validateStatus: () => true,
			// Story grid previews should fail fast and move on instead of blocking the queue.
			timeout: 45_000,
		},
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

function StoryThumbnail({
	label,
	size = 16,
	viewed = false,
	thumbUrl = '',
	thumbType = '',
	priority = false,
}) {
	// Thumbnails are fetched via the content endpoint only (never the /view
	// endpoint), so this never registers a WhatsApp "seen" receipt — that only
	// happens when a story is explicitly opened, see openStory().
	const isVideo = thumbType === 'video';
	return (
		<div className={`h-full w-full ${viewed ? 'opacity-80' : ''}`}>
			<Avatar
				label={label}
				size={size}
				src={!isVideo ? thumbUrl : ''}
				videoSrc={isVideo ? thumbUrl : ''}
				priority={priority}
				className="!h-full !w-full !ring-0"
			/>
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

function seededWaveform(seed = '', count = 40) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	const bars = [];
	for (let i = 0; i < count; i++) {
		hash = (hash * 1103515245 + 12345) >>> 0;
		const noise = ((hash >>> 8) % 100) / 100;
		// Mix LCG noise with a slow envelope so placeholder never looks like a flat line.
		const envelope = 0.35 + 0.65 * Math.abs(Math.sin((i + 1) * 0.55 + (hash % 7) * 0.2));
		bars.push(Math.max(0.18, Math.min(1, 0.22 + noise * 0.55 * envelope + envelope * 0.28)));
	}
	return bars;
}

function isUsefulWaveform(peaks) {
	if (!Array.isArray(peaks) || peaks.length < 12) return false;
	let min = 1;
	let max = 0;
	let sum = 0;
	for (const value of peaks) {
		const n = Number(value);
		if (!Number.isFinite(n)) return false;
		min = Math.min(min, n);
		max = Math.max(max, n);
		sum += n;
	}
	const avg = sum / peaks.length;
	const variance =
		peaks.reduce((total, value) => total + (Number(value) - avg) ** 2, 0) / peaks.length;
	// Reject silent / corrupt / near-flat decodes (common with some ogg/opus blobs).
	return max - min >= 0.14 && variance >= 0.004;
}

function waveformPeaksFromAudioBuffer(audioBuffer, count = 48) {
	const channel = audioBuffer?.getChannelData?.(0);
	if (!channel?.length) return [];
	const blockSize = Math.max(1, Math.floor(channel.length / count));
	const peaks = [];
	for (let index = 0; index < count; index += 1) {
		const start = index * blockSize;
		const end = Math.min(channel.length, start + blockSize);
		let peak = 0;
		let sumSquares = 0;
		const samples = Math.max(1, end - start);
		for (let cursor = start; cursor < end; cursor += 1) {
			const sample = Math.abs(channel[cursor]);
			peak = Math.max(peak, sample);
			sumSquares += sample * sample;
		}
		const rms = Math.sqrt(sumSquares / samples);
		peaks.push(peak * 0.4 + rms * 0.6);
	}
	const maxPeak = Math.max(...peaks, 0.0001);
	const normalized = peaks.map(peak => peak / maxPeak);
	if (!isUsefulWaveform(normalized)) return [];
	// Expand mid dynamics so voice notes look like WhatsApp frequencies.
	return normalized.map(peak => Math.max(0.14, Math.min(1, peak ** 0.55)));
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

async function analyzeVoiceBlob(blob, mimeType, objectUrlForProbe) {
	const rawType = String(mimeType || blob.type || 'audio/ogg; codecs=opus');
	const type = rawType.split(';')[0] || 'audio/ogg';
	const typedBlob = blob.type ? blob : new Blob([blob], { type: rawType });
	const buffer = await typedBlob.arrayBuffer();
	let duration = 0;
	let waveform = [];
	try {
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (AudioCtx) {
			const ctx = new AudioCtx();
			try {
				const decodeOnce = () =>
					Promise.race([
						ctx.decodeAudioData(buffer.slice(0)),
						new Promise((_, reject) => {
							window.setTimeout(() => reject(new Error('decode timeout')), 4500);
						}),
					]);
				let decoded = null;
				try {
					decoded = await decodeOnce();
				} catch {
					// WhatsApp PTT is often ogg/opus with odd/missing blob MIME — retry once.
					const retryBlob = new Blob([buffer], { type: 'audio/ogg; codecs=opus' });
					const retryBuf = await retryBlob.arrayBuffer();
					decoded = await Promise.race([
						ctx.decodeAudioData(retryBuf.slice(0)),
						new Promise((_, reject) => {
							window.setTimeout(() => reject(new Error('decode timeout')), 4500);
						}),
					]);
				}
				duration = decoded?.duration || 0;
				waveform = waveformPeaksFromAudioBuffer(decoded);
			} finally {
				await ctx.close().catch(() => { });
			}
		}
	} catch {
		/* decodeAudioData can fail / hang for some ogg/opus variants — keep seeded bars */
	}
	if (!(Number.isFinite(duration) && duration > 0) && objectUrlForProbe) {
		duration = await probeAudioDuration(objectUrlForProbe);
	}
	return {
		duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
		waveform: isUsefulWaveform(waveform) ? waveform : [],
	};
}

async function prepareVoicePlaybackFromBlob(blob, mimeType, { analyze = true, reuseObjectUrl = null } = {}) {
	const type = (mimeType || blob.type || 'audio/webm').split(';')[0];
	const typedBlob = blob.type ? blob : new Blob([blob], { type });
	const objectUrl = reuseObjectUrl || URL.createObjectURL(typedBlob);

	// Fast path for prefetch / first paint: skip AudioContext decode (can take seconds).
	if (!analyze) {
		return { objectUrl, duration: 0, waveform: [], reused: Boolean(reuseObjectUrl) };
	}

	const analyzed = await analyzeVoiceBlob(typedBlob, type, objectUrl);
	return {
		objectUrl,
		duration: analyzed.duration,
		waveform: analyzed.waveform,
		reused: Boolean(reuseObjectUrl),
	};
}

async function prepareVoicePlayback(sourceUrl, mimeType) {
	const response = await fetch(sourceUrl, { mode: 'cors', credentials: 'omit' });
	if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
	const blob = await response.blob();
	return prepareVoicePlaybackFromBlob(blob, mimeType || blob.type);
}

function VoicePlayIcon() {
	return (
		<svg className="wa-voice-play-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
			<path fill="currentColor" d="M8.2 5.8c0-.9.9-1.5 1.7-1.1l10.2 5.7c.9.5.9 1.7 0 2.2l-10.2 5.7c-.8.4-1.7-.2-1.7-1.1V5.8Z" />
		</svg>
	);
}

function VoicePauseIcon() {
	return (
		<svg className="wa-voice-play-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
			<path fill="currentColor" d="M7.5 5.5h2.8c.6 0 1 .4 1 1v11c0 .6-.4 1-1 1H7.5c-.6 0-1-.4-1-1v-11c0-.6.4-1 1-1Zm6.2 0h2.8c.6 0 1 .4 1 1v11c0 .6-.4 1-1 1h-2.8c-.6 0-1-.4-1-1v-11c0-.6.4-1 1-1Z" />
		</svg>
	);
}

function VoiceMicIcon() {
	return (
		<svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
			/>
		</svg>
	);
}

function VoiceLoadingIcon() {
	return (
		<svg className="wa-voice-play-icon wa-voice-play-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
			<path fill="currentColor" d="M12 2a10 10 0 1 0 10 10h-2.2A7.8 7.8 0 1 1 12 4.2V2Z" opacity="0.35" />
			<path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2.2A7.8 7.8 0 0 0 12 4.2V2Z" />
		</svg>
	);
}

function VoicePlaybackButton({ playing, loading, failed, onClick }) {
	const label = loading
		? 'Loading voice message'
		: failed
			? 'Retry voice message'
			: playing
				? 'Pause voice message'
				: 'Play voice message';
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className={`wa-voice-play grid shrink-0 place-items-center ${playing ? 'is-playing' : ''} ${loading ? 'is-loading' : ''} ${failed ? 'is-failed' : ''}`}
		>
			{loading ? <VoiceLoadingIcon /> : playing ? <VoicePauseIcon /> : <VoicePlayIcon />}
		</button>
	);
}

function VoiceWaveform({ peaks, progress, mine, loading, failed, onSeek }) {
	const items = isUsefulWaveform(peaks) ? peaks : seededWaveform(String(peaks?.length || 'voice'), 40);
	return (
		<button
			type="button"
			onClick={onSeek}
			disabled={loading || failed}
			aria-label="Seek voice message"
			className={`wa-voice-waveform relative flex min-w-0 flex-1 items-center disabled:opacity-60 ${failed ? 'is-failed' : ''}`}
		>
			<span className="wa-voice-waveform-bars" aria-hidden="true">
				{items.map((height, index) => {
					const played =
						items.length > 0 && (index + 0.5) / items.length <= progress;
					const px = Math.round(4 + Number(height) * 20);
					return (
						<span
							key={index}
							className={`wa-voice-bar ${played ? (mine ? 'is-played-outgoing' : 'is-played-incoming') : 'is-unplayed'}`}
							style={{
								'--wa-bar-h': `${px}px`,
								height: `${px}px`,
							}}
						/>
					);
				})}
			</span>
			{!failed && progress > 0.01 ? (
				<span
					className={`wa-voice-thumb ${mine ? 'is-outgoing' : 'is-incoming'}`}
					style={{ left: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
				/>
			) : null}
		</button>
	);
}

function VoicePlaybackRate({ value, onChange }) {
	return (
		<button
			type="button"
			onClick={event => {
				event.stopPropagation();
				onChange();
			}}
			className="wa-voice-rate shrink-0"
		>
			{value}x
		</button>
	);
}

function VoiceReplyPreview({ reply }) {
	if (!reply) return null;
	return (
		<div className="wa-voice-reply">
			<strong>{reply.sender}</strong>
			<span>
				<Mic size={13} /> {formatClock(reply.duration)}
			</span>
		</div>
	);
}

function VoiceAvatar({ label = '?', src = '', mine = false }) {
	return (
		<div className={`wa-voice-avatar-wrap ${mine ? 'is-outgoing' : 'is-incoming'}`}>
			<Avatar label={label} size={11} src={src} className="wa-voice-avatar" />
			<span className="wa-voice-mic-badge" aria-hidden="true">
				<VoiceMicIcon />
			</span>
		</div>
	);
}

function VoiceMessageLayout({ mine, children }) {
	return <div className={`wa-voice-layout ${mine ? 'is-outgoing' : 'is-incoming'}`}>{children}</div>;
}

function isPersistedAttachmentId(value) {
	const id = String(value || '');
	if (!id || id.startsWith('live:') || id.startsWith('live-att:')) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** Any chat message that can be forwarded / shared (including image-only). */
function isSharableChatMessage(message) {
	if (!message?.id || message.optimistic) return false;
	if (message.deletedMode && message.deletedMode !== 'none') return false;
	return true;
}

function messageHasSelectableMedia(message) {
	if (!isSharableChatMessage(message)) return false;
	const type = String(message?.type || '').toLowerCase();
	if (['image', 'sticker', 'video', 'document', 'audio', 'ptt', 'voice'].includes(type)) {
		return true;
	}
	return (message?.attachments || []).some(item => {
		const id = String(item?.id || '');
		return Boolean(item?.demoAttachment || isDemoId(id) || isPersistedAttachmentId(id));
	});
}

/** OS notification while the WhatsApp tab is open but not focused (PWA / browser). */
function showWhatsAppDesktopNotification({
	title,
	body,
	conversationId,
	accountId,
	locale,
}) {
	if (typeof window === 'undefined' || !('Notification' in window)) return;
	if (Notification.permission !== 'granted') return;
	const pageHidden =
		typeof document !== 'undefined' &&
		(document.hidden || document.visibilityState === 'hidden');
	const unfocused = typeof document !== 'undefined' && !document.hasFocus?.();
	if (!pageHidden && !unfocused) return;
	try {
		const pathLocale = locale || 'en';
		const url = `/${pathLocale}/dashboard/whatsapp?accountId=${encodeURIComponent(
			String(accountId || ''),
		)}&conversationId=${encodeURIComponent(String(conversationId || ''))}`;
		const notification = new Notification(String(title || 'WhatsApp').slice(0, 80), {
			body: String(body || 'New message').slice(0, 160),
			icon: '/logo/logo1.png',
			badge: '/logo/logo1.png',
			tag: `whatsapp-${conversationId || 'inbox'}`,
			renotify: true,
			data: { url },
		});
		notification.onclick = () => {
			try {
				window.focus();
				if (url) window.location.assign(url);
			} catch {
				/* ignore */
			}
			notification.close();
		};
	} catch {
		/* Notification constructor can throw if permission revoked mid-session */
	}
}

function assertAudioBlob(blob) {
	if (!blob) throw new Error('Empty audio');
	const type = String(blob.type || '').toLowerCase();
	if (type.includes('application/json') || type.includes('text/')) {
		throw new Error('Attachment response was not audio');
	}
	if (blob.size < 32) throw new Error('Audio too small');
	return blob;
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
	labels = {},
	sessionReady = true,
	downloadStatus = '',
	attachmentType = 'ptt',
	avatarLabel = '?',
	avatarSrc = '',
}) {
	const audioRef = useRef(null);
	const containerRef = useRef(null);
	const objectUrlRef = useRef(null);
	const voiceBlobRef = useRef(null);
	const loadPromiseRef = useRef(null);
	const analyzedRef = useRef(false);
	const ignoreAudioErrorRef = useRef(false);
	const wasSessionReadyRef = useRef(sessionReady);
	const [playing, setPlaying] = useState(false);
	const [loadingPlayback, setLoadingPlayback] = useState(false);
	const [loadFailed, setLoadFailed] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [playbackUrl, setPlaybackUrl] = useState(null);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [prefetchNonce, setPrefetchNonce] = useState(0);
	const fallbackBars = useMemo(() => seededWaveform(seed, 36), [seed]);
	const [bars, setBars] = useState(fallbackBars);
	const [duration, setDuration] = useState(
		Number.isFinite(fallbackDuration) && fallbackDuration > 0 ? fallbackDuration : 0,
	);
	const canFetchAttachment = demoAttachment || isPersistedAttachmentId(attachmentId);
	const isNearViewport = useNearViewport(containerRef, { rootMargin: '900px' });
	const alreadyOnDisk = String(downloadStatus || '').toLowerCase() === 'downloaded';

	useEffect(() => {
		if (Number.isFinite(fallbackDuration) && fallbackDuration > 0) {
			setDuration(current => (current > 0 ? current : fallbackDuration));
		}
	}, [fallbackDuration]);

	// Reset only when the attachment identity changes — MIME/url churn after
	// download must not revoke a live blob and fake a Retry state.
	useEffect(() => {
		setBars(fallbackBars);
		setPlaybackUrl(null);
		setCurrentTime(0);
		setPlaying(false);
		setLoadFailed(false);
		setLoadingPlayback(false);
		voiceBlobRef.current = null;
		loadPromiseRef.current = null;
		analyzedRef.current = false;
		ignoreAudioErrorRef.current = true;
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = null;
		}
		const timer = window.setTimeout(() => {
			ignoreAudioErrorRef.current = false;
		}, 0);
		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- identity-only reset
	}, [attachmentId, demoAttachment]);

	useEffect(() => {
		if (sessionReady && !wasSessionReadyRef.current) {
			setLoadFailed(false);
			setPrefetchNonce(value => value + 1);
		}
		wasSessionReadyRef.current = sessionReady;
	}, [sessionReady]);

	useEffect(() => {
		const id = String(attachmentId || '');
		if (!id) return undefined;
		const onReady = event => {
			if (String(event?.detail?.attachmentId || '') !== id) return;
			forgetAttachmentBlob(id);
			voiceBlobRef.current = null;
			analyzedRef.current = false;
			setLoadFailed(false);
			setPrefetchNonce(value => value + 1);
		};
		window.addEventListener('wa-attachment-ready', onReady);
		return () => window.removeEventListener('wa-attachment-ready', onReady);
	}, [attachmentId]);

	const ensurePlaybackReady = useCallback(async ({ priority = false, analyze = false, softFail = false } = {}) => {
		const existingUrl = objectUrlRef.current;
		// Already playable — never block the spinner on waveform analysis.
		if (existingUrl && voiceBlobRef.current) {
			if (analyze && !analyzedRef.current) {
				void (async () => {
					try {
						const refined = await prepareVoicePlaybackFromBlob(
							voiceBlobRef.current,
							mimeType || voiceBlobRef.current.type,
							{ analyze: true, reuseObjectUrl: existingUrl },
						);
						if (isUsefulWaveform(refined.waveform)) setBars(refined.waveform);
						if (refined.duration > 0) {
							setDuration(current => (current > 0 ? current : refined.duration));
						}
						analyzedRef.current = true;
					} catch {
						/* analysis is best-effort — keep seeded bars */
					}
				})();
			}
			return existingUrl;
		}

		if (loadPromiseRef.current) {
			if (priority) {
				// Soft/background fetch may hang on phone media — don't block Play.
				const raced = await Promise.race([
					loadPromiseRef.current.catch(() => null),
					new Promise(resolve => window.setTimeout(() => resolve(null), 900)),
				]);
				if (raced && objectUrlRef.current && voiceBlobRef.current) {
					if (analyze && !analyzedRef.current) {
						void ensurePlaybackReady({ analyze: true, softFail: true });
					}
					return objectUrlRef.current || raced;
				}
				loadPromiseRef.current = null;
			} else {
				const pendingUrl = await loadPromiseRef.current.catch(() => null);
				if (pendingUrl && objectUrlRef.current && voiceBlobRef.current) {
					if (analyze && !analyzedRef.current) {
						void ensurePlaybackReady({ analyze: true, softFail: true });
					}
					return objectUrlRef.current || pendingUrl;
				}
			}
		}

		const run = (async () => {
			// Background prefetch must not flip the bubble into a stuck spinner.
			if (!softFail) setLoadingPlayback(true);
			if (!softFail) setLoadFailed(false);
			try {
				let blob = voiceBlobRef.current;
				if (!blob) {
					const fetchBlob = async () => {
						if (canFetchAttachment) {
							let next = demoAttachment
								? await demoApi.getMedia(rawDemoId(attachmentId))
								: await requestAttachmentBlob(attachmentId, {
										timeout: priority ? 45_000 : softFail ? 25_000 : 35_000,
										priority: priority || !softFail || alreadyOnDisk,
										kind: attachmentType || 'ptt',
									});
							if (
								next &&
								(!next.type ||
									String(next.type).includes('octet-stream') ||
									String(next.type).includes('application/ogg'))
							) {
								next = next.slice(0, next.size, mimeType || 'audio/ogg; codecs=opus');
							}
							return assertAudioBlob(next);
						}
						if (url) {
							const response = url.startsWith('blob:')
								? await fetch(url)
								: await fetch(url, { mode: 'cors', credentials: 'omit' });
							if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
							return assertAudioBlob(await response.blob());
						}
						throw new Error('Voice message unavailable');
					};

					try {
						blob = await fetchBlob();
					} catch (firstError) {
						if (!priority) throw firstError;
						forgetAttachmentBlob(attachmentId);
						voiceBlobRef.current = null;
						await new Promise(resolve => window.setTimeout(resolve, 450));
						blob = await fetchBlob();
					}
					voiceBlobRef.current = blob;
				}

				const reuseObjectUrl =
					objectUrlRef.current && voiceBlobRef.current === blob ? objectUrlRef.current : null;
				// Create a playable URL immediately — analyze waveform in the background.
				const prepared = await prepareVoicePlaybackFromBlob(blob, mimeType || blob.type, {
					analyze: false,
					reuseObjectUrl,
				});
				if (
					objectUrlRef.current &&
					objectUrlRef.current !== prepared.objectUrl &&
					!prepared.reused
				) {
					ignoreAudioErrorRef.current = true;
					URL.revokeObjectURL(objectUrlRef.current);
				}
				objectUrlRef.current = prepared.objectUrl;
				setPlaybackUrl(prepared.objectUrl);
				setLoadFailed(false);
				ignoreAudioErrorRef.current = false;
				if (analyze && !analyzedRef.current) {
					void (async () => {
						try {
							const refined = await prepareVoicePlaybackFromBlob(blob, mimeType || blob.type, {
								analyze: true,
								reuseObjectUrl: prepared.objectUrl,
							});
							if (isUsefulWaveform(refined.waveform)) setBars(refined.waveform);
							if (refined.duration > 0) {
								setDuration(current => (current > 0 ? current : refined.duration));
							}
							analyzedRef.current = true;
						} catch {
							/* keep seeded waveform */
						}
					})();
				}
				return prepared.objectUrl;
			} catch (error) {
				if (!softFail) setLoadFailed(true);
				throw error;
			} finally {
				setLoadingPlayback(false);
				loadPromiseRef.current = null;
			}
		})();

		loadPromiseRef.current = run;
		return run;
	}, [
		alreadyOnDisk,
		attachmentId,
		attachmentType,
		canFetchAttachment,
		demoAttachment,
		mimeType,
		url,
	]);

	useEffect(() => {
		if (!isNearViewport) return undefined;
		if (!canFetchAttachment && !url) return undefined;
		if (!sessionReady && !alreadyOnDisk && !url) return undefined;
		const timer = window.setTimeout(() => {
			// Prefetch playable blob early (like WhatsApp Web auto-download for voice).
			void ensurePlaybackReady({
				analyze: true,
				softFail: true,
				priority: alreadyOnDisk,
			}).catch(() => {});
		}, alreadyOnDisk ? 0 : 40);
		return () => window.clearTimeout(timer);
	}, [
		alreadyOnDisk,
		canFetchAttachment,
		ensurePlaybackReady,
		isNearViewport,
		prefetchNonce,
		sessionReady,
		url,
	]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !playbackUrl) return undefined;

		const applyDuration = value => {
			if (Number.isFinite(value) && value > 0 && value !== Infinity) {
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
		const onError = () => {
			if (ignoreAudioErrorRef.current) return;
			setLoadFailed(true);
			setPlaying(false);
			setLoadingPlayback(false);
		};

		audio.addEventListener('loadedmetadata', onMeta);
		audio.addEventListener('durationchange', onMeta);
		audio.addEventListener('timeupdate', onTime);
		audio.addEventListener('ended', onEnd);
		audio.addEventListener('error', onError);
		if (audio.readyState >= 1) onMeta();
		return () => {
			audio.removeEventListener('loadedmetadata', onMeta);
			audio.removeEventListener('durationchange', onMeta);
			audio.removeEventListener('timeupdate', onTime);
			audio.removeEventListener('ended', onEnd);
			audio.removeEventListener('error', onError);
		};
	}, [playbackUrl]);

	useEffect(
		() => () => {
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}
		},
		[],
	);

	const toggle = async () => {
		if (playing) {
			audioRef.current?.pause();
			setPlaying(false);
			return;
		}
		try {
			const hadRealFailure = loadFailed && !voiceBlobRef.current && !objectUrlRef.current;
			if (hadRealFailure) {
				forgetAttachmentBlob(attachmentId);
				voiceBlobRef.current = null;
				analyzedRef.current = false;
				ignoreAudioErrorRef.current = true;
				setPlaybackUrl(null);
			} else if (loadFailed) {
				setLoadFailed(false);
			}
			const readyUrl = await ensurePlaybackReady({ priority: true, analyze: true });
			const audio = audioRef.current;
			if (!audio || !readyUrl) return;
			if (audio.src !== readyUrl) {
				ignoreAudioErrorRef.current = true;
				audio.src = readyUrl;
			}
			audio.playbackRate = playbackRate;
			await audio.play();
			ignoreAudioErrorRef.current = false;
			setPlaying(true);
			setLoadFailed(false);
			setLoadingPlayback(false);
		} catch {
			setPlaying(false);
			setLoadFailed(true);
			setLoadingPlayback(false);
		}
	};

	const cyclePlaybackRate = () => {
		const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
		setPlaybackRate(next);
		if (audioRef.current) audioRef.current.playbackRate = next;
	};

	const seekTo = event => {
		const audio = audioRef.current;
		if (!audio || !duration || !playbackUrl || loadFailed) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const isRtl =
			typeof document !== 'undefined' &&
			(document.documentElement.dir === 'rtl' ||
				document.documentElement.getAttribute('lang') === 'ar');
		const ratio = seekRatio(event.clientX, rect.left, rect.width, isRtl);
		audio.currentTime = ratio * duration;
		setCurrentTime(audio.currentTime);
	};

	const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
	const statusLabel = loadFailed
		? labels.tapToRetry || labels.failed || 'Tap to retry'
		: formatClock(currentTime > 0 ? currentTime : duration);

	return (
		<div
			ref={containerRef}
			className={`wa-voice-message ${mine ? 'is-outgoing' : 'is-incoming'} ${loadFailed ? 'is-failed' : ''} ${loadingPlayback ? 'is-loading' : ''}`}
		>
			<audio ref={audioRef} preload="metadata" src={playbackUrl || undefined} className="hidden" />
			<VoiceMessageLayout mine={mine}>
				{mine ? <VoiceAvatar label={avatarLabel} src={avatarSrc} mine /> : null}
				<div className="wa-voice-track">
					<div className="wa-voice-track-row">
						<VoicePlaybackButton
							playing={playing}
							loading={loadingPlayback}
							failed={loadFailed}
							onClick={() => void toggle()}
						/>
						<div className="wa-voice-main">
							<div className="wa-voice-main-row">
								<VoiceWaveform
									peaks={bars}
									progress={progress}
									mine={mine}
									loading={loadingPlayback}
									failed={loadFailed}
									onSeek={seekTo}
								/>
								{!loadFailed ? (
									<VoicePlaybackRate value={playbackRate} onChange={cyclePlaybackRate} />
								) : (
									<button
										type="button"
										className="wa-voice-retry"
										onClick={event => {
											event.stopPropagation();
											void toggle();
										}}
									>
										<RefreshCw size={11} strokeWidth={2.4} />
										<span>{labels.retry || 'Retry'}</span>
									</button>
								)}
							</div>
							<div className="wa-voice-track-meta">
								<span className={`wa-voice-duration ${loadFailed ? 'is-failed' : ''}`}>
									{statusLabel}
								</span>
							</div>
						</div>
					</div>
				</div>
				{!mine ? <VoiceAvatar label={avatarLabel} src={avatarSrc} mine={false} /> : null}
			</VoiceMessageLayout>
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
	const parts = String(fileName || '')
		.split('.')
		.map(part => part.trim())
		.filter(Boolean);
	if (parts.length) {
		const last = parts[parts.length - 1];
		if (last.length <= 5) return last.toUpperCase();
		const previous = parts.length > 1 ? parts[parts.length - 2] : '';
		if (previous && previous.length <= 5) return previous.toUpperCase();
		return last.slice(0, 4).toUpperCase();
	}
	const subtype = String(mimeType || '').split('/')[1]?.split(/[;+]/)[0] || '';
	if (!subtype || subtype === 'octet-stream') return 'FILE';
	return subtype.slice(0, 4).toUpperCase();
}

export function MediaAttachment({
	attachment,
	mine,
	labels,
	onImageReady,
	onOpenImage,
	onOpenDocument,
	className = '',
	layout = 'inline',
	sessionReady = true,
	messageRaw = null,
	messageDurationSeconds = 0,
	selectMode = false,
	avatarLabel = '?',
	avatarSrc = '',
}) {
	const [url, setUrl] = useState(null);
	const [loading, setLoading] = useState(() => !attachment?.previewDataUrl);
	const [failed, setFailed] = useState(false);
	const [fileAction, setFileAction] = useState('');
	const [retryNonce, setRetryNonce] = useState(0);
	const containerRef = useRef(null);
	const wasSessionReadyRef = useRef(sessionReady);
	const autoRetryCountRef = useRef(0);
	const loadGenRef = useRef(0);
	const isNearViewport = useNearViewport(containerRef);
	const type = String(attachment?.type || '').toLowerCase();
	const isVoice = type === 'audio' || type === 'ptt' || type === 'voice';
	const isDocument = !['image', 'sticker', 'video', 'audio', 'ptt', 'voice'].includes(type);
	const demoAttachment = Boolean(attachment?.demoAttachment || isDemoId(attachment?.id));
	const previewDataUrl = attachment?.previewDataUrl || null;
	const isGallery = layout === 'gallery';
	const isSingleMedia = layout === 'single';
	const alreadyOnDisk =
		String(attachment?.downloadStatus || '').toLowerCase() === 'downloaded';
	const canFetchWithoutSession = demoAttachment || alreadyOnDisk;

	const loadAttachmentBlob = useCallback(async () => {
		if (attachment?.id) {
			if (demoAttachment) return demoApi.getMedia(rawDemoId(attachment.id));
			const kind = String(attachment?.type || '').toLowerCase();
			const isHeavyMedia = kind === 'video';
			try {
				return await requestAttachmentBlob(attachment.id, {
					timeout: isHeavyMedia ? 120_000 : 45_000,
					priority: true,
					kind,
				});
			} catch (firstError) {
				// Short retry — media often fails while WA is still hydrating.
				await new Promise(resolve => window.setTimeout(resolve, 500));
				try {
					return await requestAttachmentBlob(attachment.id, {
						timeout: isHeavyMedia ? 150_000 : 60_000,
						priority: true,
						kind,
					});
				} catch {
					throw firstError;
				}
			}
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
	}, [attachment?.id, attachment?.type, attachment?.url, demoAttachment]);

	useEffect(() => {
		autoRetryCountRef.current = 0;
		setUrl(null);
		setFailed(false);
		setLoading(true);
	}, [attachment?.id]);

	useEffect(() => {
		if (sessionReady && !wasSessionReadyRef.current) {
			autoRetryCountRef.current = 0;
			setFailed(false);
			setRetryNonce(value => value + 1);
		}
		wasSessionReadyRef.current = sessionReady;
	}, [sessionReady]);

	useEffect(() => {
		const attachmentId = String(attachment?.id || '');
		if (!attachmentId) return undefined;
		const onReady = event => {
			const readyId = String(event?.detail?.attachmentId || '');
			if (readyId !== attachmentId) return;
			forgetAttachmentBlob(attachmentId);
			autoRetryCountRef.current = 0;
			setFailed(false);
			setLoading(true);
			setRetryNonce(value => value + 1);
		};
		window.addEventListener('wa-attachment-ready', onReady);
		return () => window.removeEventListener('wa-attachment-ready', onReady);
	}, [attachment?.id]);

	useEffect(() => {
		if (!failed || !sessionReady || !isNearViewport) return undefined;
		if (autoRetryCountRef.current >= 2) return undefined;
		const timer = window.setTimeout(() => {
			autoRetryCountRef.current += 1;
			setFailed(false);
			setRetryNonce(value => value + 1);
		}, 1200);
		return () => window.clearTimeout(timer);
	}, [failed, sessionReady, isNearViewport]);

	useEffect(() => {
		let cancelled = false;
		let objectUrl = null;
		const loadGen = ++loadGenRef.current;
		if (isVoice || isDocument) {
			setLoading(false);
			return undefined;
		}
		const attachmentId = String(attachment?.id || '');
		if (attachmentId.startsWith('live:') || attachmentId.startsWith('live-att:')) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		if (!attachment?.id && !attachment?.url) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		if (!isNearViewport) return undefined;
		// Cached media streams offline; pending media needs a linked WhatsApp session.
		if (!sessionReady && !canFetchWithoutSession) {
			setLoading(false);
			setFailed(true);
			return undefined;
		}
		setLoading(true);
		setFailed(false);
		loadAttachmentBlob()
			.then(blob => {
				if (cancelled || loadGenRef.current !== loadGen) return;
				const kind = String(attachment?.type || '').toLowerCase();
				const mime = String(attachment?.mimeType || blob?.type || '').toLowerCase();
				let nextBlob = blob;
				if (
					(kind === 'image' || kind === 'sticker') &&
					(!mime || mime.includes('octet-stream'))
				) {
					nextBlob = blob.slice(0, blob.size, 'image/jpeg');
				} else if (kind === 'video' && (!mime || mime.includes('octet-stream'))) {
					nextBlob = blob.slice(0, blob.size, 'video/mp4');
				} else if (
					['audio', 'ptt', 'voice'].includes(kind) &&
					(!mime || mime.includes('octet-stream'))
				) {
					nextBlob = blob.slice(0, blob.size, 'audio/ogg');
				}
				objectUrl = URL.createObjectURL(nextBlob);
				setUrl(objectUrl);
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled && loadGenRef.current === loadGen) setFailed(true);
			})
			.finally(() => {
				if (loadGenRef.current === loadGen) setLoading(false);
			});
		return () => {
			cancelled = true;
			if (objectUrl) {
				const stale = objectUrl;
				window.setTimeout(() => URL.revokeObjectURL(stale), 60_000);
			}
		};
		// Intentionally omit onImageReady / url — unstable parent callbacks were
		// cancelling in-flight video/image fetches and leaving "Loading media…".
		// eslint-disable-next-line react-hooks/exhaustive-deps -- load once per id/viewport/retry
	}, [
		attachment?.id,
		attachment?.mimeType,
		attachment?.type,
		canFetchWithoutSession,
		isDocument,
		isNearViewport,
		isVoice,
		loadAttachmentBlob,
		retryNonce,
		sessionReady,
		type,
	]);

	useEffect(() => {
		if (!url || (type !== 'image' && type !== 'sticker')) return;
		onImageReady?.(attachment.id, {
			id: attachment.id,
			url,
			fileName: attachment.fileName,
		});
	}, [attachment.id, attachment.fileName, onImageReady, type, url]);

	if (isVoice) {
		const fromName = durationFromFileName(attachment.fileName);
		const fromMessage =
			Number(messageDurationSeconds) > 0
				? Number(messageDurationSeconds)
				: voiceDurationSecondsFromSource({
						raw: messageRaw,
						attachments: [attachment],
					});
		return (
			<VoiceMessage
				attachmentId={attachment.id}
				url={attachment.url}
				mine={mine}
				mimeType={attachment.mimeType}
				fileName={attachment.fileName}
				demoAttachment={demoAttachment}
				seed={String(attachment.id || attachment.fileName || attachment.url)}
				fallbackDuration={fromName || fromMessage || 0}
				labels={labels}
				sessionReady={sessionReady}
				downloadStatus={attachment.downloadStatus}
				attachmentType={type || 'ptt'}
				avatarLabel={avatarLabel}
				avatarSrc={avatarSrc}
			/>
		);
	}

	const handleFileAction = async action => {
		if (fileAction) return;
		setFileAction(action);
		try {
			const blob = await loadAttachmentBlob();
			if (action === 'download') {
				const objectUrl = URL.createObjectURL(blob);
				const anchor = document.createElement('a');
				anchor.href = objectUrl;
				anchor.download = attachment.fileName || 'attachment';
				anchor.click();
				window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			} else if (typeof onOpenDocument === 'function') {
				const fileName = attachment.fileName || labels.fileAttachment || 'attachment';
				const extension = String(attachmentExtension(fileName, attachment.mimeType) || '')
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '');
				let previewBlob = blob;
				let previewMime = attachment.mimeType || blob?.type || '';
				if (extension === 'pdf') {
					previewMime = 'application/pdf';
					if (!String(blob?.type || '').toLowerCase().includes('pdf')) {
						previewBlob = blob.slice(0, blob.size, 'application/pdf');
					}
				}
				onOpenDocument({
					name: fileName,
					fileName: attachment.fileName,
					mimeType: previewMime,
					blob: previewBlob,
					attachmentId: attachment.id,
				});
			} else {
				const objectUrl = URL.createObjectURL(blob);
				window.open(objectUrl, '_blank', 'noopener,noreferrer');
				window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			}
		} catch {
			setFailed(true);
		} finally {
			setFileAction('');
		}
	};

	if (isDocument) {
		const extension = attachmentExtension(attachment.fileName, attachment.mimeType);
		const extKey = String(extension || '')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '');
		const size = formatAttachmentSize(
			attachment.sizeBytes ?? attachment.size ?? attachment.fileSize,
		);
		const details = [extension, size].filter(Boolean).join(' · ');
		const isWord = extKey === 'doc' || extKey === 'docx';
		const isExcel = extKey === 'xls' || extKey === 'xlsx' || extKey === 'csv';
		const isPdf = extKey === 'pdf';
		const saveLabel = labels.saveAsFile || labels.downloadFile;
		return (
			<div
				ref={containerRef}
				className={`wa-file-card ${mine ? 'is-outgoing' : 'is-incoming'}`}
				data-ext={extKey || undefined}
			>
				<div className="wa-file-card-head">
					<span className="wa-file-card-icon" data-ext={extKey || undefined} aria-hidden="true">
						{isWord ? (
							<svg className="wa-file-type-glyph" viewBox="0 0 32 36" width="28" height="32">
								<path
									fill="#2b579a"
									d="M4 0h17l7 7v25a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z"
								/>
								<path fill="#1e3f78" d="M21 0v7h7z" />
								<path
									fill="#fff"
									d="M8.2 25.2 11.1 12h2.6l1.7 8.3L17.2 12h2.5l-2.9 13.2h-2.5L12.5 16l-1.8 9.2H8.2z"
								/>
							</svg>
						) : isExcel ? (
							<svg className="wa-file-type-glyph" viewBox="0 0 32 36" width="28" height="32">
								<path
									fill="#1a7f37"
									d="M4 0h17l7 7v25a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z"
								/>
								<path fill="#0f5c28" d="M21 0v7h7z" />
								<path
									fill="#fff"
									d="M9.2 25.2 13.1 18l-3.7-6.2h3l2.3 4.2 2.3-4.2h2.9L16.2 18l3.9 7.2h-3l-2.4-4.6-2.4 4.6H9.2z"
								/>
							</svg>
						) : isPdf ? (
							<svg className="wa-file-type-glyph" viewBox="0 0 32 36" width="28" height="32">
								<path
									fill="#e5252a"
									d="M4 0h17l7 7v25a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z"
								/>
								<path fill="#b51d22" d="M21 0v7h7z" />
								<path
									fill="#fff"
									d="M8.4 25.2V12h3.4c2.2 0 3.5 1.2 3.5 3.1 0 1.9-1.3 3.1-3.5 3.1H10.6v7H8.4zm2.2-8.8h1c.9 0 1.4-.5 1.4-1.3S12.5 13.8 11.6 13.8h-1v2.6z"
								/>
							</svg>
						) : (
							<span className="wa-file-card-ext">{extension || 'FILE'}</span>
						)}
					</span>
					<span className="wa-file-card-copy">
						<span className="wa-file-card-name" title={attachment.fileName}>
							{attachment.fileName || labels.fileAttachment}
						</span>
						<span className="wa-file-card-details">
							{details || labels.fileAttachment}
						</span>
					</span>
				</div>
				<div className="wa-file-card-actions">
					<button
						type="button"
						onClick={() => handleFileAction('open')}
						disabled={Boolean(fileAction)}
						className="wa-file-card-action"
					>
						{fileAction === 'open' ? <Loader2 size={14} className="animate-spin" /> : null}
						{labels.openFile}
					</button>
					<button
						type="button"
						onClick={() => handleFileAction('download')}
						disabled={Boolean(fileAction)}
						className="wa-file-card-action"
					>
						{fileAction === 'download' ? <Loader2 size={14} className="animate-spin" /> : null}
						{saveLabel}
					</button>
				</div>
				{failed && (
					<p className="wa-file-card-error">{labels.mediaUnavailable}</p>
				)}
			</div>
		);
	}

	if ((type === 'image' || type === 'sticker') && (url || previewDataUrl || loading || failed)) {
		return (
			<div
				ref={containerRef}
				className={
					isGallery
						? `absolute inset-0 overflow-hidden ${className}`
						: isSingleMedia
							? `relative w-fit max-w-full overflow-hidden ${className}`
							: `relative w-fit max-w-[min(100%,480px)] overflow-hidden ${className}`
				}
			>
				<ImageMessage
					url={url || null}
					previewUrl={previewDataUrl}
					loading={Boolean((loading || !url) && !failed)}
					unavailable={Boolean(failed && !url)}
					alt={attachment.fileName || 'image'}
					cover={isGallery}
					selectMode={selectMode}
					retryLabel={labels.tapToRetry || labels.retry || 'Tap to retry'}
					loadingLabel={labels.loadingMedia || 'Loading media…'}
					onOpen={() => {
						if (selectMode) return;
						if (url) {
							onOpenImage?.(attachment.id);
							return;
						}
						autoRetryCountRef.current = 0;
						setFailed(false);
						setLoading(true);
						setRetryNonce(value => value + 1);
					}}
					className={`${type === 'sticker' ? 'wa-sticker-asset' : 'wa-photo-asset'}${isSingleMedia ? ' wa-photo-asset-single' : ''}`}
				/>
			</div>
		);
	}

	if (loading) {
		return (
			<div
				ref={containerRef}
				className={
					type === 'video'
						? `wa-media-card wa-media-card--video mb-2 ${className}`
						: `wa-media-card mb-2 ${className}`
				}
			>
				<span className="wa-media-card__icon" aria-hidden="true">
					{type === 'video' ? <Video size={28} strokeWidth={1.75} /> : <ImageIcon size={28} strokeWidth={1.75} />}
				</span>
				<span className="wa-photo-download__ring">
					<Loader2 size={22} strokeWidth={2.25} className="animate-spin" />
				</span>
				<span className="wa-media-card__label">{labels.loadingMedia}</span>
			</div>
		);
	}
	if (failed || !url) {
		const retry = () => {
			autoRetryCountRef.current = 0;
			setFailed(false);
			setRetryNonce(value => value + 1);
		};
		if (!isGallery) {
			return (
				<button
					ref={containerRef}
					type="button"
					onClick={retry}
					className={`wa-media-card ${type === 'video' ? 'wa-media-card--video' : ''} mb-2 text-start ${className}`}
				>
					<span className="wa-media-card__icon" aria-hidden="true">
						{type === 'video' ? (
							<Video size={28} strokeWidth={1.75} />
						) : type === 'audio' || type === 'ptt' ? (
							<Mic size={28} strokeWidth={1.75} />
						) : (
							<ImageOff size={28} strokeWidth={1.75} />
						)}
					</span>
					<span className="wa-photo-state__action" aria-hidden="true">
						<RefreshCw size={18} strokeWidth={2.4} />
					</span>
					<span className="wa-media-card__label">
						{labels.tapToRetry || labels.mediaUnavailable || 'Tap to retry'}
					</span>
				</button>
			);
		}
		return (
			<button
				ref={containerRef}
				type="button"
				onClick={retry}
				className={`wa-media-unavailable absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-1.5 overflow-hidden px-3 text-center text-xs ${mine ? 'text-emerald-950/80' : 'text-slate-600'} ${className}`}
			>
				<span className="relative z-[1] grid h-11 w-11 place-items-center rounded-full bg-black/35 text-white shadow-sm">
					{type === 'audio' || type === 'ptt' ? (
						<Mic size={18} className="shrink-0" />
					) : type === 'video' ? (
						<Video size={18} className="shrink-0" />
					) : (
						<FileText size={18} className="shrink-0" />
					)}
				</span>
				<span className="relative z-[1] min-w-0">
					<span className="block font-semibold text-white drop-shadow">
						{labels.mediaUnavailable}
					</span>
					<span className="mt-0.5 block text-[10px] text-white/85 drop-shadow">
						{labels.tapToRetry || 'Tap to retry'}
					</span>
				</span>
			</button>
		);
	}
	if (type === 'image' || type === 'sticker') {
		return (
			<ImageMessage
				url={url}
				previewUrl={previewDataUrl}
				alt={attachment.fileName || 'image'}
				onOpen={() => onOpenImage?.(attachment.id)}
				className={`${className} ${type === 'sticker' ? 'wa-sticker-asset' : 'wa-photo-asset'}`}
			/>
		);
	}
	if (type === 'video') {
		return (
			<div
				ref={containerRef}
				className={`wa-video-wrap mb-2 ${selectMode ? 'pointer-events-none' : ''} ${className}`}
			>
				<video
					key={url}
					controls={!selectMode}
					playsInline
					preload="metadata"
					poster={previewDataUrl || undefined}
					src={url}
					className="wa-video-asset"
					onError={() => {
						setFailed(true);
						setUrl(null);
					}}
				/>
			</div>
		);
	}
	if (selectMode) {
		return (
			<div
				ref={containerRef}
				className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-black/5 ${className}`}
			>
				<FileText size={14} />
				<span>{attachment.fileName || attachment.type || 'file'}</span>
			</div>
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
	onOpenDocument,
	sessionReady = true,
	messageRaw = null,
	message = null,
	selectMode = false,
	avatarLabel = '?',
	avatarSrc = '',
}) {
	const rawPreview = mediaPreviewFromRaw(messageRaw);
	const voiceDuration = voiceDurationSecondsFromSource(message || { raw: messageRaw, attachments });
	const normalized = (Array.isArray(attachments) ? attachments : []).map(attachment => {
		const kind = String(attachment?.type || '').toLowerCase();
		if (!['image', 'sticker', 'video'].includes(kind)) return attachment;
		if (attachment?.previewDataUrl) return attachment;
		return rawPreview ? { ...attachment, previewDataUrl: rawPreview } : attachment;
	});
	const images = normalized.filter(attachment =>
		['image', 'sticker'].includes(String(attachment.type || '').toLowerCase()),
	);
	const otherAttachments = normalized.filter(attachment =>
		!['image', 'sticker'].includes(String(attachment.type || '').toLowerCase()),
	);
	const visibleImages = images.slice(0, 4);

	const tileClass = index => {
		if (visibleImages.length === 1) return 'wa-photo-tile-single';
		if (visibleImages.length === 3 && index === 0) return 'row-span-2';
		return '';
	};
	const gridClass =
		visibleImages.length === 1
			? 'grid-cols-1'
			: visibleImages.length === 3
				? 'grid-cols-2 grid-rows-2'
				: 'grid-cols-2';
	const galleryCountClass =
		visibleImages.length === 2
			? 'wa-media-gallery-2'
			: visibleImages.length > 2
				? 'wa-media-gallery-quad'
				: '';

	return (
		<>
			{images.length > 0 && (
				<div className={`wa-media-gallery ${mine ? 'wa-media-gallery-mine' : 'wa-media-gallery-other'} ${visibleImages.length === 1 ? 'wa-media-gallery-single' : ''} ${galleryCountClass} grid overflow-hidden rounded-none ${gridClass} gap-[2px]`}>
					{visibleImages.map((attachment, index) => (
						<div key={attachment.id} className={`wa-photo-tile relative min-h-0 min-w-0 overflow-hidden ${tileClass(index)}`}>
							<MediaAttachment
								attachment={attachment}
								mine={mine}
								labels={labels}
								onImageReady={onImageReady}
								onOpenImage={onOpenImage}
								onOpenDocument={onOpenDocument}
								layout={visibleImages.length === 1 ? 'single' : 'gallery'}
								sessionReady={sessionReady}
								selectMode={selectMode}
								className={visibleImages.length === 1 ? '' : 'rounded-none'}
							/>
							{index === 3 && images.length > 4 && (
								<div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center bg-black/55 text-[2rem] font-semibold tracking-wide text-white">
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
								onOpenDocument={onOpenDocument}
								sessionReady={sessionReady}
								selectMode={selectMode}
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
					onOpenDocument={onOpenDocument}
					sessionReady={sessionReady}
					selectMode={selectMode}
					messageRaw={messageRaw}
					messageDurationSeconds={voiceDuration}
					avatarLabel={avatarLabel}
					avatarSrc={avatarSrc}
				/>
			))}
		</>
	);
}

function HoverActionButton({
	tooltip,
	className = '',
	children,
	tooltipPrefer = 'below',
	...props
}) {
	const buttonRef = useRef(null);
	const [tip, setTip] = useState(null);

	const hideTip = useCallback(() => setTip(null), []);

	const showTip = useCallback(() => {
		const node = buttonRef.current;
		if (!node || !tooltip) return;
		const rect = node.getBoundingClientRect();
		const preferBelow = tooltipPrefer === 'below';
		const gap = 8;
		setTip({
			label: tooltip,
			left: rect.left + rect.width / 2,
			top: preferBelow ? rect.bottom + gap : rect.top - gap,
			place: preferBelow ? 'below' : 'above',
		});
	}, [tooltip, tooltipPrefer]);

	useEffect(() => {
		if (!tip) return undefined;
		const onScroll = () => hideTip();
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', hideTip);
		return () => {
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', hideTip);
		};
	}, [tip, hideTip]);

	return (
		<>
			<button
				{...props}
				ref={buttonRef}
				type={props.type || 'button'}
				aria-label={props['aria-label'] || tooltip}
				className={className}
				onMouseEnter={event => {
					props.onMouseEnter?.(event);
					showTip();
				}}
				onMouseLeave={event => {
					props.onMouseLeave?.(event);
					hideTip();
				}}
				onFocus={event => {
					props.onFocus?.(event);
					showTip();
				}}
				onBlur={event => {
					props.onBlur?.(event);
					hideTip();
				}}
				onClick={event => {
					hideTip();
					props.onClick?.(event);
				}}
			>
				{children}
			</button>
			{tip && typeof document !== 'undefined'
				? createPortal(
						<span
							className={`wa-hover-portal-tooltip is-${tip.place}`}
							style={{ left: tip.left, top: tip.top }}
							role="tooltip"
						>
							{tip.label}
						</span>,
						document.body,
					)
				: null}
		</>
	);
}

function MessageHoverActions({
	mine,
	locale,
	open,
	emojiOpen,
	showTranscribe = false,
	showCopy = false,
	onEmoji,
	onReply,
	onTranscribe,
	onCopy,
	onMore,
}) {
	const ar = locale === 'ar';
	const [copied, setCopied] = useState(false);
	const copiedTimerRef = useRef(null);

	useEffect(
		() => () => {
			if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
		},
		[],
	);

	const copyLabel = copied ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy';
	const reactLabel = ar ? 'تفاعل' : 'React';
	const replyLabel = ar ? 'رد' : 'Reply';
	const transcribeLabel = ar ? 'تفريغ' : 'Transcribe';
	const moreLabel = ar ? 'المزيد' : 'More';

	return (
		<div
			className={`wa-message-hover-actions ${mine ? 'is-outgoing' : 'is-incoming'} ${open ? 'is-open' : ''}`}
			role="toolbar"
			aria-label={ar ? 'إجراءات الرسالة' : 'Message actions'}
		>
			{showCopy ? (
				<HoverActionButton
					onPointerDown={event => event.stopPropagation()}
					onClick={async event => {
						event.preventDefault();
						event.stopPropagation();
						if (copied) return;
						const ok = await onCopy?.(event);
						if (!ok) return;
						setCopied(true);
						if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
						copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
					}}
					tooltip={copyLabel}
					className={`wa-message-hover-btn ${copied ? 'is-copied' : ''}`}
				>
					{copied ? (
						<Check size={15} strokeWidth={2.4} aria-hidden />
					) : (
						<Copy size={14} strokeWidth={2.2} aria-hidden />
					)}
				</HoverActionButton>
			) : null}
			<HoverActionButton
				data-message-reaction-trigger
				onPointerDown={event => event.stopPropagation()}
				onClick={onEmoji}
				tooltip={reactLabel}
				aria-expanded={Boolean(emojiOpen)}
				className="wa-message-hover-btn"
			>
				<Smile size={15} strokeWidth={2.1} aria-hidden />
			</HoverActionButton>
			<HoverActionButton
				onClick={onReply}
				tooltip={replyLabel}
				className="wa-message-hover-btn"
			>
				<Reply size={15} strokeWidth={2.1} aria-hidden />
			</HoverActionButton>
			{showTranscribe ? (
				<HoverActionButton
					onClick={onTranscribe}
					tooltip={transcribeLabel}
					className="wa-message-hover-btn is-transcribe"
				>
					<AudioLines size={15} strokeWidth={2.1} aria-hidden />
				</HoverActionButton>
			) : null}
			<span className="wa-message-hover-sep" aria-hidden />
			<HoverActionButton
				data-message-actions-trigger
				onClick={onMore}
				tooltip={moreLabel}
				aria-expanded={open && !emojiOpen}
				className="wa-message-hover-btn is-more"
			>
				<MoreHorizontal size={15} strokeWidth={2.1} aria-hidden />
			</HoverActionButton>
		</div>
	);
}

function MessageReactionPicker({
	open,
	locale,
	mine,
	busy,
	anchorRect,
	activeEmoji,
	onReact,
	onClose,
}) {
	const [mounted, setMounted] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [pos, setPos] = useState(() => computeReactionPickerPosition(anchorRect, { mine }));
	const pickerRef = useRef(null);

	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) setExpanded(false);
	}, [open]);

	useLayoutEffect(() => {
		if (!open) return undefined;
		const update = () => {
			const measured = pickerRef.current?.getBoundingClientRect();
			setPos(
				computeReactionPickerPosition(anchorRect, {
					mine,
					width: measured?.width || (expanded ? 176 : 156),
					height: measured?.height || (expanded ? 136 : 24),
				}),
			);
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRect, mine, expanded]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;
	if (!mounted || typeof document === 'undefined') return null;
	const ar = locale === 'ar';

	return createPortal(
		<>
			<button
				type="button"
				tabIndex={-1}
				aria-label={ar ? 'إغلاق التفاعل' : 'Close reactions'}
				onPointerDown={event => {
					event.preventDefault();
					event.stopPropagation();
					onClose();
				}}
				className="wa-reaction-picker-backdrop"
			/>
			<div
			ref={pickerRef}
			data-message-reaction-picker
			role="dialog"
			aria-label={ar ? 'تفاعل مع الرسالة' : 'React to message'}
			className={`wa-reaction-picker ${expanded ? 'is-expanded' : ''} ${mine ? 'is-outgoing' : 'is-incoming'}`}
			style={{ top: pos.top, left: pos.left }}
			onPointerDown={event => event.stopPropagation()}
		>
			<div className="wa-reaction-picker-row">
				{QUICK_REACTIONS.map(emoji => (
					<button
						key={emoji}
						type="button"
						disabled={busy}
						aria-pressed={activeEmoji === emoji}
						onClick={() => onReact(emoji)}
						className={`wa-reaction-picker-btn ${activeEmoji === emoji ? 'is-active' : ''}`}
					>
						<span className="wa-reaction-picker-emoji">{emoji}</span>
					</button>
				))}
				<button
					type="button"
					aria-label={ar ? 'المزيد من التفاعلات' : 'More reactions'}
					aria-expanded={expanded}
					onClick={() => setExpanded(current => !current)}
					className={`wa-reaction-picker-more ${expanded ? 'is-open' : ''}`}
				>
					{expanded ? <X size={10} strokeWidth={2.6} /> : <Plus size={11} strokeWidth={2.6} />}
				</button>
			</div>
			{expanded && (
				<div className="wa-reaction-picker-grid">
					{MORE_REACTIONS.map(emoji => (
						<button
							key={emoji}
							type="button"
							disabled={busy}
							aria-pressed={activeEmoji === emoji}
							onClick={() => onReact(emoji)}
							className={`wa-reaction-picker-btn ${activeEmoji === emoji ? 'is-active' : ''}`}
						>
							<span className="wa-reaction-picker-emoji">{emoji}</span>
						</button>
					))}
				</div>
			)}
		</div>
		</>,
		document.body,
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
	mentionDirectory = null,
	accountId = null,
	conversationId = null,
	canUseBoard = false,
	canUseGroups = false,
	onBoardSuccess,
}) {
	const [mounted, setMounted] = useState(false);
	const [boardOpen, setBoardOpen] = useState(false);
	const [desktopPos, setDesktopPos] = useState(() =>
		computeAnchoredMenuPosition(anchorRect),
	);
	const menuRef = useRef(null);
	const boardItemRef = useRef(null);
	const boardCloseTimerRef = useRef(null);
	const [boardFlyoutPos, setBoardFlyoutPos] = useState(null);

	const clearBoardCloseTimer = () => {
		if (boardCloseTimerRef.current) {
			window.clearTimeout(boardCloseTimerRef.current);
			boardCloseTimerRef.current = null;
		}
	};

	const openBoardSubmenu = () => {
		if (!canUseBoard) return;
		clearBoardCloseTimer();
		setBoardOpen(true);
	};

	const scheduleBoardSubmenuClose = () => {
		clearBoardCloseTimer();
		boardCloseTimerRef.current = window.setTimeout(() => {
			setBoardOpen(false);
			boardCloseTimerRef.current = null;
		}, 160);
	};

	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) {
			clearBoardCloseTimer();
			setBoardOpen(false);
			setBoardFlyoutPos(null);
		}
	}, [open]);
	useEffect(() => () => clearBoardCloseTimer(), []);

	useEffect(() => {
		if (!open) return undefined;
		const update = () => {
			const measured = menuRef.current?.getBoundingClientRect();
			setDesktopPos(
				computeAnchoredMenuPosition(anchorRect, {
					width: measured?.width || 240,
					height: measured?.height || 480,
				}),
			);
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRect]);

	useEffect(() => {
		if (!boardOpen || !open) {
			setBoardFlyoutPos(null);
			return undefined;
		}
		const update = () => {
			const trigger = boardItemRef.current?.getBoundingClientRect();
			if (!trigger) return;
			const flyoutW = 228;
			const gap = 8;
			const margin = 10;
			const viewportW = window.innerWidth || 1280;
			const viewportH = window.innerHeight || 720;
			const spaceEnd = viewportW - trigger.right - margin;
			const spaceStart = trigger.left - margin;
			const openOnStart = spaceEnd < flyoutW + gap && spaceStart >= flyoutW + gap;
			let left = openOnStart ? trigger.left - flyoutW - gap : trigger.right + gap;
			left = Math.min(Math.max(margin, left), viewportW - flyoutW - margin);
			const maxHeight = Math.max(120, viewportH - margin * 2);
			let top = trigger.top;
			top = Math.min(Math.max(margin, top), viewportH - Math.min(maxHeight, 280) - margin);
			setBoardFlyoutPos({ top, left, maxHeight });
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [boardOpen, open, desktopPos.top, desktopPos.left]);

	if (!open || !message) return null;
	const ar = locale === 'ar';
	const canSelectTranscript = isSelectableTranscriptMessage(message);
	const canSelectMedia = messageHasSelectableMedia(message);
	const canSelect = canSelectTranscript || canSelectMedia;
	const hasCopyableText = Boolean(String(message.text || '').trim());
	const isOutboundText =
		String(message.type || 'text').toLowerCase() === 'text' &&
		String(message.direction || '').toLowerCase() !== 'inbound' &&
		!message.optimistic;
	const actions = [
		isVoice && { id: 'transcribe', label: ar ? 'تحويل إلى نص' : 'Transcribe', icon: Mic },
		canUseBoard &&
			canSelectTranscript && {
				id: 'addToBoard',
				label: ar ? 'إضافة للمهام…' : 'Add to tasks…',
				icon: LayoutGrid,
				submenu: true,
			},
		canUseGroups && {
			id: 'addToGroup',
			label: ar ? 'إضافة لمجموعة رسائل' : 'Add to message group',
			icon: FolderKanban,
		},
		canSelect && {
			id: canSelectMedia && !canSelectTranscript ? 'selectMedia' : 'select',
			label: ar ? 'تحديد' : 'Select',
			icon: ListChecks,
		},
		hasCopyableText && { id: 'copy', label: ar ? 'نسخ النص' : 'Copy text', icon: Copy },
		{ id: 'reply', label: ar ? 'رد' : 'Reply', icon: Reply },
		isOutboundText && { id: 'edit', label: ar ? 'تعديل' : 'Edit', icon: FileText },
		{ id: 'forward', label: ar ? 'إرسال إلى…' : 'Send to…', icon: Send },
		{ id: 'info', label: ar ? 'معلومات' : 'Info', icon: MessageCircle },
		{
			id: 'star',
			label: message.isStarred
				? ar
					? 'إزالة من المهم'
					: 'Remove from important'
				: ar
					? 'حفظ كمهم'
					: 'Save as important',
			icon: Star,
		},
		{
			id: 'pin',
			label: message.isPinned ? (ar ? 'إلغاء التثبيت' : 'Unpin') : ar ? 'تثبيت' : 'Pin',
			icon: Pin,
		},
		{ id: 'delete', label: ar ? 'حذف' : 'Delete', icon: Trash2, destructive: true },
	].filter(Boolean);

	const runAction = (actionId, event) => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		if (actionId === 'addToBoard') {
			clearBoardCloseTimer();
			setBoardOpen(boardOpen ? false : true);
			return;
		}
		clearBoardCloseTimer();
		setBoardOpen(false);
		onAction(actionId);
	};

	const renderMenuItems = (options = {}) => {
		const { attachBoardRef = false } = options;
		return actions.map(action => {
			const Icon = action.icon;
			const filled =
				action.id === 'star'
					? Boolean(message.isStarred)
					: action.id === 'pin'
						? Boolean(message.isPinned)
						: false;
			const isBoard = action.id === 'addToBoard';
			return (
				<button
					key={action.id}
					ref={isBoard && attachBoardRef ? boardItemRef : undefined}
					type="button"
					disabled={busy}
					onMouseEnter={() => {
						if (isBoard) openBoardSubmenu();
						else scheduleBoardSubmenuClose();
					}}
					onMouseDown={event => {
						if (isBoard) {
							event.preventDefault();
							event.stopPropagation();
						}
					}}
					onClick={event => runAction(action.id, event)}
					aria-expanded={isBoard ? boardOpen : undefined}
					aria-haspopup={isBoard ? 'menu' : undefined}
					className={`wa-message-action-item ${action.destructive ? 'is-destructive' : ''} ${
						isBoard && boardOpen ? 'is-active' : ''
					}`}
				>
					<span className="flex min-w-0 flex-1 items-center gap-1">
						{action.label}
						{action.submenu ? (
							<ChevronRight
								size={14}
								className={`opacity-50 transition-transform rtl:rotate-180 ${
									boardOpen && isBoard ? 'rotate-90 rtl:-rotate-90' : ''
								}`}
							/>
						) : null}
					</span>
					<Icon
						size={16}
						strokeWidth={2.1}
						fill={filled ? 'currentColor' : 'none'}
					/>
				</button>
			);
		});
	};

	const renderBoardFlyout = () =>
		boardOpen && canUseBoard && accountId && conversationId && boardFlyoutPos ? (
			<div
				className="wa-message-action-board-flyout hidden min-[769px]:block"
				style={{
					top: boardFlyoutPos.top,
					left: boardFlyoutPos.left,
					maxHeight: boardFlyoutPos.maxHeight,
				}}
				onMouseEnter={openBoardSubmenu}
				onMouseLeave={scheduleBoardSubmenuClose}
				onMouseDown={event => event.stopPropagation()}
				onClick={event => event.stopPropagation()}
			>
				<BoardColumnPickerMenu
					accountId={accountId}
					conversationId={conversationId}
					messageIds={[message.id]}
					locale={locale}
					onSuccess={() => {
						onBoardSuccess?.();
						onClose?.();
					}}
					className="wa-message-action-board-panel"
				/>
			</div>
		) : null;

	const renderBoardSheet = () =>
		boardOpen && canUseBoard && accountId && conversationId ? (
			<div
				className="wa-message-action-board wa-message-action-board--sheet"
				onMouseDown={event => event.stopPropagation()}
				onClick={event => event.stopPropagation()}
			>
				<BoardColumnPickerMenu
					accountId={accountId}
					conversationId={conversationId}
					messageIds={[message.id]}
					locale={locale}
					onSuccess={() => {
						onBoardSuccess?.();
						onClose?.();
					}}
					className="wa-message-action-board-panel"
				/>
			</div>
		) : null;

	const renderReactions = () => (
		<div className="wa-message-action-reactions">
			{QUICK_REACTIONS.map(emoji => (
				<button
					key={emoji}
					type="button"
					disabled={busy}
					onClick={() => onReact(emoji)}
					className="wa-message-action-react"
				>
					{emoji}
				</button>
			))}
			<button
				type="button"
				onClick={() => onAction('react')}
				className="wa-message-action-react-more"
				aria-label={ar ? 'المزيد من التفاعلات' : 'More reactions'}
			>
				<Plus size={16} strokeWidth={2.3} />
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

	if (!mounted) return null;

	return createPortal(
		<>
			{/* Desktop: fixed portal so overflow parents cannot clip the menu. */}
			<button
				type="button"
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				onClick={onClose}
				className="fixed inset-0 z-[120] hidden bg-transparent min-[769px]:block"
			/>
			<div
				ref={menuRef}
				data-message-action-menu
				className="wa-message-action-menu hidden min-[769px]:block"
				style={{
					top: desktopPos.top,
					left: desktopPos.left,
					width: desktopPos.width || 220,
				}}
				onMouseLeave={scheduleBoardSubmenuClose}
			>
				{renderReactions()}
				<div className="wa-message-action-list">{renderMenuItems({ attachBoardRef: true })}</div>
			</div>
			{renderBoardFlyout()}

			{/* Mobile sheet */}
			<div
				className="fixed inset-0 z-[100] hidden overflow-y-auto bg-black/20 px-3 backdrop-blur-md max-[768px]:block"
				onClick={onClose}
			>
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
									<WhatsAppFormattedText
										text={previewText}
										mentionDirectory={mentionDirectory}
										mentionLabels={message.mentionLabels}
									/>
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
					<div className="mx-auto mb-2.5 w-fit overflow-hidden rounded-full bg-white shadow-xl">
						{renderReactions()}
					</div>
					<div className="wa-message-action-sheet overflow-hidden">
						{renderMenuItems({ attachBoardRef: false })}
						{renderBoardSheet()}
					</div>
				</div>
			</div>
		</>,
		document.body,
	);
}

function MultiMessageActionMenu({
	open,
	anchorRect,
	locale,
	selectedCount,
	messageIds = [],
	accountId,
	conversationId,
	canTranscribe = false,
	canUseBoard = false,
	canUseGroups = false,
	busy = false,
	onClose,
	onAction,
	onBoardSuccess,
}) {
	const [mounted, setMounted] = useState(false);
	const [boardOpen, setBoardOpen] = useState(false);
	const [boardFlyoutPos, setBoardFlyoutPos] = useState(null);
	const [pos, setPos] = useState(() => computeAnchoredMenuPosition(anchorRect, { width: 248, height: 360 }));
	const menuRef = useRef(null);
	const boardItemRef = useRef(null);
	const boardCloseTimerRef = useRef(null);

	const clearBoardCloseTimer = () => {
		if (boardCloseTimerRef.current) {
			window.clearTimeout(boardCloseTimerRef.current);
			boardCloseTimerRef.current = null;
		}
	};

	const openBoardSubmenu = () => {
		if (!canUseBoard) return;
		clearBoardCloseTimer();
		setBoardOpen(true);
	};

	const scheduleBoardSubmenuClose = () => {
		clearBoardCloseTimer();
		boardCloseTimerRef.current = window.setTimeout(() => {
			setBoardOpen(false);
			boardCloseTimerRef.current = null;
		}, 160);
	};

	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!open) {
			clearBoardCloseTimer();
			setBoardOpen(false);
			setBoardFlyoutPos(null);
		}
	}, [open]);
	useEffect(() => () => clearBoardCloseTimer(), []);
	useEffect(() => {
		if (!open) return undefined;
		const update = () => {
			const measured = menuRef.current?.getBoundingClientRect();
			setPos(
				computeAnchoredMenuPosition(anchorRect, {
					width: measured?.width || 248,
					height: measured?.height || 360,
				}),
			);
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRect]);

	useEffect(() => {
		if (!boardOpen || !open) {
			setBoardFlyoutPos(null);
			return undefined;
		}
		const update = () => {
			const trigger = boardItemRef.current?.getBoundingClientRect();
			if (!trigger) return;
			const flyoutW = 228;
			const gap = 8;
			const margin = 10;
			const viewportW = window.innerWidth || 1280;
			const viewportH = window.innerHeight || 720;
			const spaceEnd = viewportW - trigger.right - margin;
			const spaceStart = trigger.left - margin;
			const openOnStart = spaceEnd < flyoutW + gap && spaceStart >= flyoutW + gap;
			let left = openOnStart ? trigger.left - flyoutW - gap : trigger.right + gap;
			left = Math.min(Math.max(margin, left), viewportW - flyoutW - margin);
			const maxHeight = Math.max(120, viewportH - margin * 2);
			let top = trigger.top;
			top = Math.min(Math.max(margin, top), viewportH - Math.min(maxHeight, 280) - margin);
			setBoardFlyoutPos({ top, left, maxHeight });
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [boardOpen, open, pos.top, pos.left]);

	if (!mounted || !open) return null;
	const ar = locale === 'ar';
	const actions = [
		canUseBoard && {
			id: 'addToBoard',
			label: ar ? 'إضافة للمهام…' : 'Add to tasks…',
			icon: LayoutGrid,
			submenu: true,
		},
		canTranscribe && {
			id: 'transcribe',
			label: ar ? 'تحويل المحدد' : 'Transcribe selected',
			icon: AudioLines,
		},
		canUseGroups && {
			id: 'addToGroup',
			label: ar ? 'إضافة لمجموعة رسائل' : 'Add to message group',
			icon: FolderKanban,
		},
		canUseGroups && {
			id: 'removeFromGroup',
			label: ar ? 'إزالة من المجموعة' : 'Remove from group',
			icon: Trash2,
		},
		{
			id: 'shareAsSend',
			label: ar ? 'إرسال إلى شخص…' : 'Send to chat…',
			icon: Send,
		},
		{
			id: 'selectAll',
			label: ar ? 'تحديد الكل' : 'Select all',
			icon: CheckCheck,
		},
		{
			id: 'clear',
			label: ar ? 'إلغاء التحديد' : 'Clear selection',
			icon: X,
		},
	].filter(Boolean);

	return createPortal(
		<>
			<button
				type="button"
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				onClick={onClose}
				className="fixed inset-0 z-[120] bg-transparent"
			/>
			<div
				ref={menuRef}
				className="wa-message-action-menu"
				style={{
					top: pos.top,
					left: pos.left,
					width: Math.max(pos.width || 248, 248),
				}}
				onMouseDown={event => event.stopPropagation()}
				onClick={event => event.stopPropagation()}
				onMouseLeave={scheduleBoardSubmenuClose}
			>
				<div className="wa-message-action-multi-head">
					{ar ? `${selectedCount} رسالة محددة` : `${selectedCount} selected`}
				</div>
				<div className="wa-message-action-list">
					{actions.map(action => {
						const Icon = action.icon;
						const isBoard = action.id === 'addToBoard';
						return (
							<button
								key={action.id}
								ref={isBoard ? boardItemRef : undefined}
								type="button"
								disabled={
									busy ||
									(action.id !== 'clear' &&
										action.id !== 'selectAll' &&
										!messageIds.length)
								}
								onMouseEnter={() => {
									if (isBoard) openBoardSubmenu();
									else scheduleBoardSubmenuClose();
								}}
								onMouseDown={event => {
									if (isBoard) {
										event.preventDefault();
										event.stopPropagation();
									}
								}}
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									if (isBoard) {
										clearBoardCloseTimer();
										setBoardOpen(boardOpen ? false : true);
										return;
									}
									clearBoardCloseTimer();
									setBoardOpen(false);
									onAction(action.id);
								}}
								aria-expanded={isBoard ? boardOpen : undefined}
								aria-haspopup={isBoard ? 'menu' : undefined}
								className={`wa-message-action-item ${
									isBoard && boardOpen ? 'is-active' : ''
								}`}
							>
								<span className="flex min-w-0 flex-1 items-center gap-1">
									{action.label}
									{action.submenu ? (
										<ChevronRight
											size={14}
											className={`opacity-50 transition-transform rtl:rotate-180 ${
												boardOpen && isBoard
													? 'rotate-90 rtl:-rotate-90'
													: ''
											}`}
										/>
									) : null}
								</span>
								<Icon size={16} strokeWidth={2.1} />
							</button>
						);
					})}
				</div>
			</div>
			{boardOpen && canUseBoard && accountId && conversationId && boardFlyoutPos ? (
				<div
					className="wa-message-action-board-flyout"
					style={{
						top: boardFlyoutPos.top,
						left: boardFlyoutPos.left,
						maxHeight: boardFlyoutPos.maxHeight,
					}}
					onMouseEnter={openBoardSubmenu}
					onMouseLeave={scheduleBoardSubmenuClose}
					onMouseDown={event => event.stopPropagation()}
					onClick={event => event.stopPropagation()}
				>
					<BoardColumnPickerMenu
						accountId={accountId}
						conversationId={conversationId}
						messageIds={messageIds}
						locale={locale}
						onSuccess={() => {
							onBoardSuccess?.();
							onClose?.();
						}}
						className="wa-message-action-board-panel"
					/>
				</div>
			) : null}
		</>,
		document.body,
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
	const [pos, setPos] = useState(() => computeBesideMenuPosition(anchorRect));
	const menuRef = useRef(null);
	useEffect(() => setMounted(true), []);
	useEffect(() => {
		if (!conversation) return undefined;
		const update = () => {
			const measured = menuRef.current?.getBoundingClientRect();
			setPos(
				computeBesideMenuPosition(anchorRect, {
					width: measured?.width || 228,
					height: measured?.height || 280,
				}),
			);
		};
		update();
		const raf = window.requestAnimationFrame(update);
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [conversation, anchorRect]);
	if (!mounted || !conversation) return null;
	const ar = locale === 'ar';
	const actions = [
		{
			id: 'openBeside',
			label: ar ? 'فتح بجانب الشات الحالي' : 'Open beside current chat',
			icon: Columns2,
		},
		{
			id: 'pin',
			label: conversation.isPinned ? (ar ? 'إلغاء تثبيت المحادثة' : 'Unpin conversation') : ar ? 'تثبيت المحادثة' : 'Pin conversation',
			icon: Pin,
		},
		{
			id: 'mute',
			label: conversation.isMuted
				? ar
					? 'إلغاء كتم الإشعارات'
					: 'Unmute notifications'
				: ar
					? 'كتم الإشعارات'
					: 'Mute notifications',
			icon: conversation.isMuted ? Bell : BellOff,
		},
		{
			id: 'favorite',
			label: conversation.isFavorite ? (ar ? 'إزالة من المفضلة' : 'Remove from favorites') : ar ? 'إضافة إلى المفضلة' : 'Add to favorites',
			icon: Star,
		},
		{
			id: 'archive',
			label: conversation.isArchived
				? ar
					? 'إلغاء أرشفة المحادثة'
					: 'Unarchive chat'
				: ar
					? 'أرشفة المحادثة'
					: 'Archive chat',
			icon: Archive,
		},
		canAssign && { id: 'assign', label: ar ? 'تعيين إلى شخص' : 'Assign to person', icon: UserPlus },
		{ id: 'info', label: ar ? 'معلومات المحادثة' : 'Conversation info', icon: MessageCircle },
	].filter(Boolean);
	return createPortal(
		<>
			<button
				type="button"
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				onClick={onClose}
				className="fixed inset-0 z-[105] bg-transparent"
			/>
			<div
				ref={menuRef}
				className="wa-conversation-action-menu"
				style={{
					top: pos.top,
					left: pos.left,
					width: pos.width,
				}}
				onClick={event => event.stopPropagation()}
			>
				<div className="wa-conversation-action-head">
					<Avatar
						label={conversationTitle(conversation)}
						size={8}
						src={conversationAvatarUrl(conversation)}
						isGroup={conversation.type === 'group'}
					/>
					<div className="min-w-0 flex-1">
						<p className="truncate text-[13px] font-semibold leading-tight">
							{conversationTitle(conversation)}
						</p>
						<p className="truncate text-[11px] leading-tight text-[#667781]">
							{conversation.lastMessage?.text || conversation.lastMessage?.type || (ar ? 'لا توجد رسائل' : 'No messages')}
						</p>
					</div>
				</div>
				<div className="wa-conversation-action-list">
					{actions.map(action => {
						const Icon = action.icon;
						return (
							<button
								key={action.id}
								type="button"
								disabled={busy}
								onClick={() => onAction(action.id)}
								className="wa-conversation-action-item"
							>
								<span>{action.label}</span>
								<Icon
									size={16}
									strokeWidth={2.1}
									fill={
										(action.id === 'pin' && conversation.isPinned) ||
										(action.id === 'mute' && conversation.isMuted) ||
										(action.id === 'favorite' && conversation.isFavorite) ||
										(action.id === 'archive' && conversation.isArchived)
											? 'currentColor'
											: 'none'
									}
								/>
							</button>
						);
					})}
				</div>
			</div>
		</>,
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
			, label: labels.groups || labels.communities
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
	anchorRef = null,
	aiEnabled = false,
	aiVisible = true,
	onToggleAiVisible,
	prompts = [],
	activePromptId,
	promptSaving = false,
	onPromptChange,
	suggestionsLoading = false,
	onRegenerateSuggestions,
	settingsEnabled = false,
	onEnableAi,
	onDisableAi,
}) {
	const [placement, setPlacement] = useState(null);

	useLayoutEffect(() => {
		if (!open) {
			setPlacement(null);
			return undefined;
		}

		const update = () => {
			const desktop =
				typeof window !== 'undefined' &&
				window.matchMedia('(min-width: 769px)').matches;
			const rect = anchorRef?.current?.getBoundingClientRect?.();
			if (!desktop || !rect) {
				setPlacement({ mode: 'sheet' });
				return;
			}
			const width = Math.min(248, window.innerWidth - 24);
			let left = rect.left;
			if (left + width > window.innerWidth - 12) {
				left = window.innerWidth - width - 12;
			}
			left = Math.max(12, left);
			setPlacement({
				mode: 'popover',
				bottom: Math.max(12, window.innerHeight - rect.top + 8),
				left,
				width,
			});
		};

		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [open, anchorRef]);

	if (!open) return null;
	if (!placement) return null;
	const ar = String(locale).toLowerCase().startsWith('ar');
	const isDesktop = placement.mode === 'popover';
	const actions = [
		['photos', ImageIcon, ar ? 'الصور والوسائط' : 'Photos & media', '#7C5CFC'],
		...(!isDesktop
			? [['camera', Camera, ar ? 'الكاميرا' : 'Camera', '#FF4F78']]
			: []),
		['document', FileText, ar ? 'مستند' : 'Document', '#4B88FF'],
		['contact', User, ar ? 'جهة اتصال' : 'Contact', '#00A884'],
		['location', MapPin, ar ? 'الموقع' : 'Location', '#20B86B'],
	];
	return createPortal(
		<div className="wa-composer-overlay fixed inset-0 z-500" role="presentation">
			<button type="button" aria-label={ar ? 'إغلاق الإجراءات' : 'Close attachment actions'} onClick={onClose} className={`absolute inset-0 ${isDesktop ? 'bg-transparent' : 'bg-black/20'}`} />
			<section
				role="dialog"
				aria-modal="true"
				aria-label={ar ? 'المزيد من الخيارات' : 'More options'}
				className={
					isDesktop
						? 'wa-attachment-popover bg-white px-1.5 py-1.5'
						: 'wa-attachment-sheet absolute inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[20px] bg-white px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-2.5 shadow-2xl'
				}
				style={
					isDesktop
						? {
								bottom: placement.bottom,
								left: placement.left,
								width: placement.width,
							}
						: undefined
				}
			>
				{!isDesktop && <div className="mx-auto mb-2.5 h-1 w-8 rounded-full bg-slate-300" />}

				{aiEnabled && (
					<div className="mb-1 rounded-xl border border-violet-100 bg-violet-50/80 px-2 py-1.5">
						<div className="flex items-center gap-2">
							<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600 text-white">
								<Sparkles size={12} />
							</span>
							<div className="min-w-0 flex-1">
								<p className="text-[12px] font-bold leading-4 text-violet-900">
									{ar ? 'اقتراحات الذكاء' : 'AI suggestions'}
								</p>
								{!isDesktop ? (
									<p className="text-[10px] leading-3 text-violet-700/80">
										{ar ? 'ردود مقترحة أثناء الشات' : 'Suggest replies while you chat'}
									</p>
								) : null}
							</div>
							<Toggle
								size="sm"
								checked={Boolean(settingsEnabled)}
								label={ar ? 'تفعيل الذكاء الاصطناعي' : 'Enable AI suggestions'}
								onChange={next => {
									if (next) {
										void Promise.resolve(onEnableAi?.()).catch(() => {});
										if (!aiVisible) onToggleAiVisible?.();
									} else {
										void Promise.resolve(onDisableAi?.()).catch(() => {});
									}
								}}
							/>
						</div>
						{settingsEnabled ? (
							<div className="mt-1.5 flex items-center gap-1.5 border-t border-violet-100 pt-1.5">
								<Toggle
									size="sm"
									checked={Boolean(aiVisible)}
									label={ar ? 'إظهار الشريط' : 'Show suggestion bar'}
									onChange={() => onToggleAiVisible?.()}
								/>
								<span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-violet-800">
									{ar ? 'إظهار الشريط' : 'Show bar'}
								</span>
								{prompts.length > 0 && !isDesktop ? (
									<PromptInstructionsDropdown
										prompts={prompts}
										value={activePromptId || prompts[0]?.id || ''}
										onChange={onPromptChange}
										label={ar ? 'التعليمات' : 'Instructions'}
										disabled={promptSaving}
										emptyLabel={ar ? 'لا توجد تعليمات' : 'No instructions'}
									/>
								) : null}
								<button
									type="button"
									onClick={onRegenerateSuggestions}
									disabled={suggestionsLoading || !aiVisible}
									aria-label={ar ? 'تحديث الاقتراحات' : 'Regenerate suggestions'}
									className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-violet-200 bg-white text-violet-700 disabled:opacity-40"
								>
									<RefreshCw size={11} className={suggestionsLoading ? 'animate-spin' : ''} />
								</button>
							</div>
						) : null}
					</div>
				)}

				<div className="flex flex-col">
					{actions.map(([id, Icon, label, color]) => (
						<button
							key={id}
							type="button"
							onClick={() => onAction(id)}
							className={`flex w-full items-center text-start last:border-0 hover:bg-black/[0.04] active:bg-black/[0.05] ${
								isDesktop
									? 'min-h-9 gap-2 rounded-lg px-1.5 py-1'
									: 'min-h-11 gap-2.5 border-b border-black/5 px-0.5 py-2'
							}`}
						>
							<span
								className={`grid shrink-0 place-items-center rounded-full text-white ${
									isDesktop ? 'h-7 w-7' : 'h-9 w-9'
								}`}
								style={{ background: color }}
							>
								<Icon size={isDesktop ? 13 : 17} strokeWidth={2.2} />
							</span>
							<span className={`font-semibold text-[#111b21] ${isDesktop ? 'text-[12px]' : 'text-[14px]'}`}>
								{label}
							</span>
						</button>
					))}
				</div>
			</section>
		</div>,
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
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}

function reportDateRange(days = 7) {
	const to = new Date();
	const from = new Date(Date.now() - Number(days || 7) * 24 * 60 * 60 * 1000);
	return { from: from.toISOString(), to: to.toISOString() };
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

function WhatsAppFormattedText({
	text,
	mentionDirectory = null,
	mentionLabels = null,
	forceMarkdown = false,
}) {
	if (forceMarkdown || looksLikeMarkdown(text)) {
		return <MarkdownMessage content={text} className="wa-chat-md" />;
	}
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
				) : segment.type === 'mention' ? (
					<span key={key} className="wa-message-mention">
						{resolveWhatsAppMentionLabel(
							segment.text,
							mentionDirectory,
							mentionLabels,
						)}
					</span>
				) : segment.type === 'emoji' ? (
					<span key={key} className="wa-message-emoji">
						{segment.text}
					</span>
				) : (
					segment.text
				);
			let node = <span key={key}>{content}</span>;
			if (part.code) {
				node = (
					<code key={key} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.92em] dark:bg-white/10">
						{content}
					</code>
				);
			}
			if (part.bold) {
				node = (
					<strong key={`${key}-b`} className="font-bold">
						{node}
					</strong>
				);
			}
			if (part.italic) {
				node = (
					<em key={`${key}-i`} className="italic">
						{node}
					</em>
				);
			}
			if (part.strike) {
				node = (
					<span key={`${key}-s`} className="line-through">
						{node}
					</span>
				);
			}
			return node;
		}),
	);
}

function MessageLinkPreview({ text, labels }) {
	const link = firstMessageLink(text);
	if (!link) return null;
	const copyLink = async event => {
		event.preventDefault();
		event.stopPropagation();
		try {
			await navigator.clipboard.writeText(link.href);
			toast.success(labels.linkCopied || 'Link copied');
		} catch {
			toast.error(labels.copyLinkFailed || 'Could not copy link');
		}
	};
	return (
		<div className="mb-1 flex min-w-0 items-center gap-2 rounded-xl border border-black/5 bg-black/[0.045] p-2.5 dark:border-white/10 dark:bg-white/[0.07]">
			<a
				href={link.href}
				target="_blank"
				rel="noreferrer"
				onClick={event => event.stopPropagation()}
				className="flex min-w-0 flex-1 items-center gap-3 no-underline transition-colors"
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
			</a>
			<div className="flex shrink-0 items-center gap-0.5">
				<button
					type="button"
					onPointerDown={event => event.stopPropagation()}
					onClick={copyLink}
					title={labels.copyLink}
					aria-label={labels.copyLink}
					className="grid h-8 w-8 place-items-center rounded-full text-[#027EB5] transition-colors hover:bg-black/8 dark:text-[#53BDEB]"
				>
					<Copy size={15} strokeWidth={2.2} />
				</button>
				<a
					href={link.href}
					target="_blank"
					rel="noreferrer"
					onClick={event => event.stopPropagation()}
					title={labels.openLink}
					aria-label={labels.openLink}
					className="grid h-8 w-8 place-items-center rounded-full text-[#027EB5] no-underline transition-colors hover:bg-black/8 dark:text-[#53BDEB]"
				>
					<ExternalLink size={16} />
				</a>
			</div>
		</div>
	);
}

function Avatar({
	label = '?',
	size = 10,
	className = '',
	isGroup = false,
	src = '',
	videoSrc = '',
	priority = false,
}) {
	const placeholderStyle = avatarPlaceholderStyle(label);
	return (
		<div
			className={`wa-avatar-3d relative grid shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-900 ${className}`}
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
					loading={priority ? 'eager' : 'lazy'}
					decoding={priority ? 'sync' : 'async'}
					fetchPriority={priority ? 'high' : 'auto'}
					referrerPolicy="no-referrer"
					onError={event => {
						event.currentTarget.style.display = 'none';
					}}
					className="absolute inset-0 h-full w-full rounded-full object-cover"
				/>
			)}
			{videoSrc && (
				<video
					src={`${videoSrc}#t=0.001`}
					muted
					playsInline
					preload="metadata"
					className="absolute inset-0 h-full w-full rounded-full object-cover"
				/>
			)}
		</div>
	);
}

function Card({ children, className = '', style, ...props }) {
	return (
		<div
			className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_32px_-14px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 ${className}`}
			style={style}
			{...props}
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
			<p
				className="relative mt-3 break-words text-xl font-black leading-snug tabular-nums text-slate-800 dark:text-slate-100"
				title={typeof value === 'string' ? value : undefined}
			>
				{value}
			</p>
		</div>
	);
}

function Empty({ icon: Icon = MessageCircle, title, hint, className = '' }) {
	return (
		<div
			className={`wa-chat-list-empty flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center text-slate-500 ${className}`}
			title={title}
		>
			<div className="wa-chat-list-empty__icon rounded-2xl bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] p-4 dark:from-slate-800 dark:to-slate-800">
				<Icon size={26} className="text-[var(--color-primary-500)]" />
			</div>
			<p className="wa-chat-list-empty__title font-bold text-slate-700 dark:text-slate-200">{title}</p>
			{hint && <p className="wa-chat-list-empty__hint max-w-xs text-xs text-slate-400">{hint}</p>}
		</div>
	);
}

function ChatIdlePane({ title, hint, unreadLabel, steps }) {
	return (
		<WhatsAppChatIdlePane
			title={title}
			hint={hint}
			unreadLabel={unreadLabel}
			steps={steps}
		/>
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

function Toggle({ checked, onChange, label, size = 'md' }) {
	const compact = size === 'sm';
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`relative shrink-0 overflow-hidden rounded-full transition-colors ${
				compact ? 'h-5 w-9' : 'h-6 w-11'
			} ${checked ? 'bg-[var(--color-primary-500)]' : 'bg-slate-200 dark:bg-slate-700'}`}
		>
			<span
				className={`absolute rounded-full bg-white shadow-md transition-all duration-200 ${
					compact
						? `top-0.5 h-4 w-4 ${checked ? 'start-[18px]' : 'start-0.5'}`
						: `top-0.5 h-5 w-5 ${checked ? 'start-[22px]' : 'start-0.5'}`
				}`}
			/>
		</button>
	);
}

function ConversationFilterDropdown({ value, onChange, labels, variant = 'dropdown' }) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const options = [
		{ value: 'all', label: labels.all },
		{ value: 'unread', label: labels.unread },
		{ value: 'favorites', label: labels.favorites },
		{ value: 'important', label: labels.important },
	];
	const selected = options.find(option => option.value === value) || options[0];

	useEffect(() => {
		if (!open || variant === 'pills') return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPosition({
				top: rect.bottom + 6,
				left: rect.left,
				width: Math.max(rect.width, 180),
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
	}, [open, variant]);

	if (variant === 'pills') {
		return (
			<div
				className="wa-desktop-filter-pills flex gap-1 px-1 pb-1"
				role="listbox"
				aria-label="Conversation type"
			>
				{options.map(option => {
					const active = option.value === value;
					return (
						<button
							key={option.value}
							type="button"
							role="option"
							aria-selected={active}
							onClick={() => onChange(option.value)}
							className={`wa-filter-pill rounded-[18px] border-0 px-3 py-1.5 text-[10px] font-semibold transition-colors ${
								active ? 'is-active' : ''
							}`}
						>
							{option.label}
						</button>
					);
				})}
			</div>
		);
	}

	return (
		<div ref={rootRef} className="wa-desktop-filter relative shrink-0">
			<button
				ref={buttonRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={selected.label}
				title={selected.label}
				onClick={() => setOpen(current => !current)}
				className={`wa-btn-3d rounded-full p-0 text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
					open || value !== 'all' ? 'is-active' : ''
				}`}
			>
				<ListFilter size={16} />
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

function AccountSwitcherDropdown({
	accounts = [],
	value,
	onChange,
	labels,
	statusLabels,
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);
	const selected = accounts.find(account => account.id === value) || accounts[0] || null;
	const selectedStatus = selected ? statusMeta(selected.status, statusLabels, selected) : null;

	useEffect(() => {
		if (!open) return undefined;
		const updatePosition = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = Math.max(rect.width, 260);
			const left = Math.min(
				Math.max(8, rect.left),
				Math.max(8, window.innerWidth - width - 8),
			);
			setPosition({
				top: rect.bottom + 8,
				left,
				width,
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

	if (!accounts.length) return null;

	return (
		<div ref={rootRef} className="relative min-w-[200px] max-w-[280px]">
			<button
				ref={buttonRef}
				type="button"
				aria-label={labels.accounts}
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen(current => !current)}
				className="wa-account-switcher wa-btn-3d flex h-10 w-full items-center gap-2.5 rounded-[14px] border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition-all hover:border-[var(--color-primary-300)] hover:bg-slate-50 focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
			>
				<Avatar label={selected?.label || '?'} size={7} className="shrink-0" />
				<span className="min-w-0 flex-1 truncate text-start text-slate-800 dark:text-slate-100">
					{selected?.label || labels.accounts}
				</span>
				{selectedStatus && (
					<span className={`h-2 w-2 shrink-0 rounded-full ${selectedStatus.dot}`} />
				)}
				<ChevronDown
					size={15}
					className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open &&
				position &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						role="listbox"
						aria-label={labels.accounts}
						className="fixed z-500 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
						style={position}
					>
						{accounts.map(account => {
							const meta = statusMeta(account.status, statusLabels, account);
							const active = account.id === value;
							return (
								<button
									key={account.id}
									type="button"
									role="option"
									aria-selected={active}
									onClick={() => {
										onChange(account.id);
										setOpen(false);
									}}
									className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-start transition-colors ${
										active
											? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-slate-800 dark:text-[var(--color-primary-300)]'
											: 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
									}`}
								>
									<Avatar label={account.label} size={9} className="shrink-0" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-bold">{account.label}</p>
										<p className="truncate text-[11px] opacity-70">
											{account.phoneNumber || account.providerName}
										</p>
									</div>
									<span
										className={`flex max-w-[40%] shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.text}`}
										title={meta.hint || meta.label}
									>
										<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
										<span className="min-w-0 truncate">{meta.label}</span>
									</span>
									{active ? (
										<Check size={14} className="shrink-0 text-[var(--color-primary-600)]" />
									) : (
										<span className="w-3.5 shrink-0" />
									)}
								</button>
							);
						})}
					</div>,
					document.body,
				)}
		</div>
	);
}

function WhatsAppWorkspaceContent() {
	const locale = useLocale();
	const t = translations[locale] || translations.en;
	const demo = useDemoMode();
	const {
		queryClient,
		invalidateConversations,
		resetConversationsCache,
		conversationsCacheAdapter,
		messagesCacheAdapter,
		prefetchMessages,
	} = useWhatsAppQueryCache();
	const conversationsCacheRef = useRef(conversationsCacheAdapter);
	const messagesCacheRef = useRef(messagesCacheAdapter);
	conversationsCacheRef.current = conversationsCacheAdapter;
	messagesCacheRef.current = messagesCacheAdapter;
	const hoverPrefetchTimerRef = useRef(null);
	const prefetchInFlightRef = useRef(0);
	const listScrollPrefetchBlockedUntilRef = useRef(0);
	const [activeTab, setActiveTab] = useState(null);
	const [tabReady, setTabReady] = useState(false);
	const restoredTabRef = useRef(false);
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
	const [syncPhoneClosed, setSyncPhoneClosed] = useState(false);
	const [syncStage, setSyncStage] = useState('');
	const [conversationId, setConversationId] = useState(null);
	const [secondaryConversationId, setSecondaryConversationId] = useState(null);
	const [splitPickMode, setSplitPickMode] = useState(false);
	const [messages, setMessages] = useState([]);
	// Rendered alongside `messages` so the pane can go blank on the very first
	// render after a chat switch, instead of showing the previous chat's history
	// until effects run.
	const [messagesOwnerId, setMessagesOwnerId] = useState(null);
	const conversationMessages =
		messagesOwnerId && messagesOwnerId === conversationId ? messages : EMPTY_MESSAGES;
	const conversationMessagesRef = useRef(conversationMessages);
	conversationMessagesRef.current = conversationMessages;
	const [groups, setGroups] = useState([]);
	const [selectedGroup, setSelectedGroup] = useState(null);
	const [loadingGroup, setLoadingGroup] = useState(false);
	const [statuses, setStatuses] = useState([]);
	const [statusFetchHint, setStatusFetchHint] = useState(null);
	const [selectedStatus, setSelectedStatus] = useState(null);
	const [storyQueue, setStoryQueue] = useState([]);
	const [storyIndex, setStoryIndex] = useState(0);
	const [storyLoop, setStoryLoop] = useState(false);
	const [storyReplayKey, setStoryReplayKey] = useState(0);
	const [storyReplyDraft, setStoryReplyDraft] = useState('');
	const [sendingStoryReply, setSendingStoryReply] = useState(false);
	const [storyViewerEmbed, setStoryViewerEmbed] = useState(null);
	const storyLoopRef = useRef(false);
	const [statusMediaUrl, setStatusMediaUrl] = useState(null);
	const [loadingStory, setLoadingStory] = useState(false);
	const [storyProgress, setStoryProgress] = useState(0);
	const [storyDurationMs, setStoryDurationMs] = useState(5000);
	const [storyPaused, setStoryPaused] = useState(false);
	const storyStartRef = useRef(0);
	const storyElapsedRef = useRef(0);
	const storyProgressBarRef = useRef(null);
	const storyVideoRef = useRef(null);
	const [logs, setLogs] = useState([]);
	const [report, setReport] = useState(null);
	const [reportPeriodDays, setReportPeriodDays] = useState(7);
	const [reportStaffDetail, setReportStaffDetail] = useState(null);
	const [reportStaffDetailLoading, setReportStaffDetailLoading] = useState(false);
	const reportPeriodDaysRef = useRef(7);
	reportPeriodDaysRef.current = reportPeriodDays;
	const [staff, setStaff] = useState([]);
	const [accountAccess, setAccountAccess] = useState([]);
	const [assignableStaff, setAssignableStaff] = useState([]);
	const [privacySettings, setPrivacySettings] = useState({
		hideStatusViewReceipts: true,
		readReceiptMode: 'on_reply',
	});
	const [pushPermission, setPushPermission] = useState('checking');
	const [enablingPush, setEnablingPush] = useState(false);
	const [qr, setQr] = useState(null);
	const [pairingCode, setPairingCode] = useState(null);
	const [linkMode, setLinkMode] = useState(null); // null | 'qr' | 'phone'
	const [linkPhoneNumber, setLinkPhoneNumber] = useState('');
	const parsedLinkPhone = useMemo(() => {
		const trimmed = linkPhoneNumber.trim();
		if (!trimmed) return null;
		try {
			const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
			const parsed = parsePhoneNumberFromString(withPlus);
			return parsed?.isValid() ? parsed : null;
		} catch {
			return null;
		}
	}, [linkPhoneNumber]);
	const linkPhoneTouched = linkPhoneNumber.trim().length > 3;
	const linkPhoneValid = Boolean(parsedLinkPhone);
	useEffect(() => {
		linkModeRef.current = linkMode;
	}, [linkMode]);
	const [bootStatus, setBootStatus] = useState('loading');
	const [bootError, setBootError] = useState('');
	const [isAdmin, setIsAdmin] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(
		() => resolveStoredWhatsAppUserId() || 'anonymous',
	);
	const [tabLoading, setTabLoading] = useState(false);
	const [tabError, setTabError] = useState('');
	const [accountBusy, setAccountBusy] = useState(false);
	const [inboxReady, setInboxReady] = useState(false);
	const [sessionProbeDone, setSessionProbeDone] = useState(false);
	const [qrExpired, setQrExpired] = useState(false);
	const [sending, setSending] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [hasMoreMessages, setHasMoreMessages] = useState(true);
	const hasMoreMessagesRef = useRef(true);
	hasMoreMessagesRef.current = hasMoreMessages;
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [showJumpToBottom, setShowJumpToBottom] = useState(false);
	const [messagesSyncHint, setMessagesSyncHint] = useState('');
	const [recordingVoice, setRecordingVoice] = useState(false);
	const [recordingPaused, setRecordingPaused] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [voiceChangerOpen, setVoiceChangerOpen] = useState(false);
	const [cloneVoicePickMode, setCloneVoicePickMode] = useState(false);
	const [cloneVoicePickSampleBase, setCloneVoicePickSampleBase] = useState(0);
	const [pendingCloneSampleTick, setPendingCloneSampleTick] = useState(0);
	const pendingCloneSamplesRef = useRef([]);
	const cloneVoiceHistoryRef = useRef(new Map());
	const [voiceChanging, setVoiceChanging] = useState(false);
	const [voiceChangerSettings, setVoiceChangerSettings] = useState(null);
	const voiceChangerSettingsRef = useRef({ configured: true, enabled: false, provider: 'off' });
	const [draft, setDraft] = useState('');
	const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
	const [scheduleAnchorEl, setScheduleAnchorEl] = useState(null);
	const [messageSchedules, setMessageSchedules] = useState([]);
	const [messageSchedulesLoading, setMessageSchedulesLoading] = useState(false);
	const [messageScheduleBusyId, setMessageScheduleBusyId] = useState('');
	const [composerImages, setComposerImages] = useState([]);
	const composerImagesRef = useRef([]);

	const openSchedulePopover = useCallback(event => {
		setScheduleAnchorEl(event?.currentTarget || null);
		setScheduleDialogOpen(true);
	}, []);

	const closeSchedulePopover = useCallback(open => {
		setScheduleDialogOpen(open);
		if (!open) setScheduleAnchorEl(null);
	}, []);

	useEffect(() => {
		composerImagesRef.current = composerImages;
	}, [composerImages]);

	useEffect(() => () => {
		for (const item of composerImagesRef.current) {
			if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
		}
	}, []);
	const [replyingTo, setReplyingTo] = useState(null);
	const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
	const [reactionPickerAnchor, setReactionPickerAnchor] = useState(null);
	const reactionPickerMessageRef = useRef(null);
	const skipReactionPickerCloseRef = useRef(false);
	const [reactingMessageIds, setReactingMessageIds] = useState(() => new Set());
	const [actionMessageId, setActionMessageId] = useState(null);
	const [actionMessageAnchor, setActionMessageAnchor] = useState(null);
	const [multiMessageMenuAnchor, setMultiMessageMenuAnchor] = useState(null);
	const [pendingMessageActions, setPendingMessageActions] = useState(() => new Set());
	const [forwardingMessage, setForwardingMessage] = useState(null);
	const [sharingMessageIds, setSharingMessageIds] = useState(null);
	const [sharingBusy, setSharingBusy] = useState(false);
	const [highlightedMessageKey, setHighlightedMessageKey] = useState(null);
	const highlightTimerRef = useRef(null);
	const [messageInfo, setMessageInfo] = useState(null);
	const [loadingMessageInfo, setLoadingMessageInfo] = useState(false);
	const [deleteMessageTarget, setDeleteMessageTarget] = useState(null);
	const [transcriptionSources, setTranscriptionSources] = useState(null);
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
	const [chatListCollapsed, setChatListCollapsed] = useState(() => {
		if (typeof window === 'undefined') return false;
		try {
			return window.localStorage.getItem(WHATSAPP_CHAT_LIST_COLLAPSED_KEY) === '1';
		} catch {
			return false;
		}
	});
	const [chatListWidth, setChatListWidth] = useState(readStoredChatListWidth);
	const [chatListResizing, setChatListResizing] = useState(false);
	const chatListResizeRef = useRef({ active: false, startX: 0, startWidth: CHAT_LIST_WIDTH_DEFAULT });
	const [collapsedChatTip, setCollapsedChatTip] = useState(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const searchInputRef = useRef(null);
	const [privacyBlur, setPrivacyBlur] = useState(() => readWhatsAppPrivacyBlur());
	const [conversationFilter, setConversationFilter] = useState('all');
	const [archivedCount, setArchivedCount] = useState(0);
	const [pendingPreferenceActions, setPendingPreferenceActions] = useState(() => new Set());
	const [assignmentFilter, setAssignmentFilter] = useState('');
	const [searchingConversations, setSearchingConversations] = useState(false);
	const [staffSearch, setStaffSearch] = useState('');
	const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
	const [registeredChatImages, setRegisteredChatImages] = useState({});
	const [activeChatImageId, setActiveChatImageId] = useState(null);
	const [documentPreview, setDocumentPreview] = useState(null);
	const [mediaSelectMode, setMediaSelectMode] = useState(false);
	const [selectedMediaIds, setSelectedMediaIds] = useState(() => new Set());
	const [downloadingSelectedMedia, setDownloadingSelectedMedia] = useState(false);
	const [ticketSelectMode, setTicketSelectMode] = useState(false);
	const [selectedMessageIds, setSelectedMessageIds] = useState(() => new Set());
	const [groupSelectMode, setGroupSelectMode] = useState(false);
	const [messageGroups, setMessageGroups] = useState([]);
	const [messageGroupMembership, setMessageGroupMembership] = useState({});
	const [messageGroupsOpen, setMessageGroupsOpen] = useState(false);
	const [activeMessageGroup, setActiveMessageGroup] = useState(null);
	const [groupViewMessages, setGroupViewMessages] = useState(null);
	const [groupPickerOpen, setGroupPickerOpen] = useState(false);
	const [newGroupName, setNewGroupName] = useState('');
	const [messageGroupsBusy, setMessageGroupsBusy] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileHeaderScrolled, setMobileHeaderScrolled] = useState(false);
	const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
	const [shareContactOpen, setShareContactOpen] = useState(false);
	const [muteDurationOpen, setMuteDurationOpen] = useState(false);
	const [muteTargetConversation, setMuteTargetConversation] = useState(null);
	const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
	const [inChatSearchQuery, setInChatSearchQuery] = useState('');
	const [inChatSearchHits, setInChatSearchHits] = useState([]);
	const [inChatSearchBusy, setInChatSearchBusy] = useState(false);
	const [editingMessage, setEditingMessage] = useState(null);
	const [editDraft, setEditDraft] = useState('');
	const [uploadProgress, setUploadProgress] = useState(null);
	const [composerDragOver, setComposerDragOver] = useState(false);
	const tabLeaderRef = useRef(null);
	const presenceTypingTimerRef = useRef(null);
	const presencePausedTimerRef = useRef(null);

	const notifyPeerTyping = useCallback(() => {
		if (!conversationId || demo.settings.enabled || isDemoId(conversationId)) return;
		if (presenceTypingTimerRef.current) return;
		presenceTypingTimerRef.current = window.setTimeout(() => {
			presenceTypingTimerRef.current = null;
		}, 2500);
		void api
			.post(`/whatsapp/conversations/${conversationId}/presence`, { state: 'composing' })
			.catch(() => {});
		if (presencePausedTimerRef.current) window.clearTimeout(presencePausedTimerRef.current);
		presencePausedTimerRef.current = window.setTimeout(() => {
			void api
				.post(`/whatsapp/conversations/${conversationId}/presence`, { state: 'paused' })
				.catch(() => {});
		}, 3000);
	}, [conversationId, demo.settings.enabled]);
	const attachButtonRef = useRef(null);
	const [aiSuggestionsVisible, setAiSuggestionsVisible] = useState(true);
	const [stickerPanelOpen, setStickerPanelOpen] = useState(false);
	const [aiImagePanelOpen, setAiImagePanelOpen] = useState(false);
	const whatsappAi = useWhatsAppAi({
		accountId,
		conversationId,
		messages: conversationMessages,
		allowSuggestions: !demo.settings.enabled && aiSuggestionsVisible,
		messagesReady: Boolean(conversationId) && !loadingMessages,
	});
	const fileRef = useRef(null);
	const stickerButtonRef = useRef(null);
	const aiImageButtonRef = useRef(null);
	const messageBoxRef = useRef(null);
	const longPressTimerRef = useRef(null);
	const longPressOriginRef = useRef(null);
	const conversationLongPressTimerRef = useRef(null);
	const conversationLongPressOriginRef = useRef(null);
	const suppressConversationClickRef = useRef(false);
	const lastAutoScrolledMessageRef = useRef(null);
	const pinThreadToBottomRef = useRef(false);
	const chatSearchRef = useRef('');
	const conversationFilterRef = useRef('all');
	const lastOpenMessagesLoadKeyRef = useRef('');
	const assignmentFilterRef = useRef('');
	const messageSyncInFlightRef = useRef(new Map());
	/** Skip provider history sync while WA Store is known unhealthy. */
	const providerHistorySyncBlockedUntilRef = useRef(0);
	const messageHistoryRetryRef = useRef({ conversationId: null, attempts: 0, timer: null });
	const statusesCacheRef = useRef(new Map());
	const refreshStatusesFromProviderRef = useRef(null);
	const reloadConversationsTimer = useRef(null);
	const messagesRequestId = useRef(0);
	const olderRequestId = useRef(0);
	const loadingOlderRef = useRef(false);
	const socketRef = useRef(null);
	const presenceTtlTimersRef = useRef({});
	const workspaceHandlersRef = useRef({});
	const accountIdRef = useRef(null);
	const accountsRef = useRef([]);
	const conversationsRef = useRef([]);
	const syncingInboxRef = useRef(false);
	const previousAccountIdRef = useRef(null);
	const conversationIdRef = useRef(null);
	const activeTabRef = useRef(activeTab);
	activeTabRef.current = activeTab;
	// Which conversation the rendered `messages` array belongs to. Never read
	// conversationIdRef inside a setState updater for this — updaters run during
	// the next render, by which point the ref already points at the new chat.
	const messagesOwnerRef = useRef(null);
	const watchedConversationRef = useRef(null);
	const watchedAccountRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const recordingStreamRef = useRef(null);
	const recordingChunksRef = useRef([]);
	const recordingTimerRef = useRef(null);
	const recordingSecondsRef = useRef(0);
	const discardRecordingRef = useRef(false);
	const {
		voicePreviewActive,
		voicePreviewPlaying,
		voicePreviewProgress,
		voicePreviewCurrentTime,
		voicePreviewDuration,
		clearVoicePreview,
		toggleVoicePreview,
		seekVoicePreview,
	} = useVoiceRecordingPreview({
		mediaRecorderRef,
		recordingChunksRef,
		setRecordingPaused,
		labels: t,
	});
	const statusMediaUrlRef = useRef(null);
	const autoConnectAttemptedRef = useRef(null);
	const linkModeRef = useRef(null);
	const autoCreateAccountAttemptedRef = useRef(false);
	const autoInboxSyncAttemptedRef = useRef(null);
	const loadOlderAtRef = useRef(0);
	const olderScrollRestoreRef = useRef(null);
	const suppressOlderLoadUntilRef = useRef(0);
	const syncCooldownUntilRef = useRef(0);

	const scrollMessagesToBottom = useCallback((behavior = 'auto') => {
		const scroll = () => {
			const box = messageBoxRef.current;
			if (!box) return;
			if (behavior === 'smooth') {
				box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
			} else {
				box.scrollTop = box.scrollHeight;
			}
			const distance = box.scrollHeight - box.clientHeight - box.scrollTop;
			setShowJumpToBottom(distance > 220);
		};
		requestAnimationFrame(() => {
			scroll();
			requestAnimationFrame(scroll);
		});
		window.setTimeout(scroll, 80);
		window.setTimeout(scroll, 220);
		window.setTimeout(scroll, 600);
	}, []);

	const jumpMessagesToBottom = useCallback(() => {
		pinThreadToBottomRef.current = true;
		setShowJumpToBottom(false);
		scrollMessagesToBottom('smooth');
	}, [scrollMessagesToBottom]);

	/** Single write path for the message pane. The base list is whatever the
	 *  target conversation already owns — messages belonging to a chat the user
	 *  left are dropped instead of merged into the chat now on screen. */
	const writeConversationMessages = useCallback((targetConversationId, updater) => {
		if (!targetConversationId) return;
		const owned = messagesOwnerRef.current === targetConversationId;
		messagesOwnerRef.current = targetConversationId;
		setMessagesOwnerId(targetConversationId);
		setMessages(current => {
			const base = owned ? current : [];
			const next = typeof updater === 'function' ? updater(base) : updater;
			return scopeMessagesToConversation(next, targetConversationId);
		});
	}, []);

	const clearConversationMessages = useCallback(targetConversationId => {
		messagesOwnerRef.current = targetConversationId || null;
		setMessagesOwnerId(targetConversationId || null);
		setMessages(current => (current.length ? [] : current));
	}, []);

	const writeConversationMessagesRef = useRef(writeConversationMessages);
	writeConversationMessagesRef.current = writeConversationMessages;

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
	const selectedChatTitle = selectedConversation
		? conversationTitle(selectedConversation)
		: '';
	const selectedChatTitlePresentation = messageTextPresentation(selectedChatTitle);
	const scheduleConversationOptions = useMemo(
		() =>
			effectiveConversations.map(item => ({
				id: item.id,
				title: conversationTitle(item),
			})),
		[effectiveConversations],
	);
	const selectedSecondaryConversation = useMemo(
		() =>
			effectiveConversations.find(item => item.id === secondaryConversationId) || null,
		[effectiveConversations, secondaryConversationId],
	);
	const baseEffectiveMessages = useMemo(
		() =>
			buildEffectiveMessages({
				realMessages: conversationMessages,
				selectedConversation,
				demoState: demo.data,
				runtime: demo.runtime,
				enabled: demo.settings.enabled,
			}),
		[
			conversationMessages,
			selectedConversation,
			demo.data,
			demo.runtime,
			demo.settings.enabled,
		],
	);
	const effectiveMessages = useMemo(() => {
		if (activeMessageGroup && Array.isArray(groupViewMessages)) return groupViewMessages;
		return baseEffectiveMessages;
	}, [activeMessageGroup, groupViewMessages, baseEffectiveMessages]);
	const mentionDirectory = useMemo(
		() =>
			buildWhatsAppMentionDirectory({
				conversations: effectiveConversations,
				messages: effectiveMessages,
				participants: selectedConversation?.group?.participants || [],
			}),
		[effectiveConversations, effectiveMessages, selectedConversation],
	);
	const reactionPickerMessage = useMemo(() => {
		if (!reactionPickerMessageId) return null;
		return (
			effectiveMessages.find(item => item.id === reactionPickerMessageId) ||
			(reactionPickerMessageRef.current?.id === reactionPickerMessageId
				? reactionPickerMessageRef.current
				: null)
		);
	}, [effectiveMessages, reactionPickerMessageId]);
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
		(!demo.settings.enabled || demo.settings.featureFlags.useFakeMessages !== false) &&
		!isEmailMemoAiConversation(selectedConversation);
	const availableTabs = useMemo(
		() =>
			tabs.filter(([key]) => {
				if (key === 'settings') return canManageWhatsApp || isAdmin;
				if (key === 'reports') return canManageWhatsApp || canAssignWhatsApp || isAdmin;
				if (key === 'board') return canManageWhatsApp || canAssignWhatsApp || isAdmin;
				return true;
			}),
		[canAssignWhatsApp, canManageWhatsApp, isAdmin],
	);
	const unreadConversationCount = useMemo(
		() =>
			effectiveConversations.reduce((total, conversation) => {
				if (isChannelConversation(conversation)) return total;
				return total + conversationUnreadCount(conversation);
			}, 0),
		[effectiveConversations],
	);
	const unreadChannelCount = useMemo(
		() =>
			effectiveConversations.reduce((total, conversation) => {
				if (!isChannelConversation(conversation)) return total;
				return total + conversationUnreadCount(conversation);
			}, 0),
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
	const messageListWindow = useWaScrollWindow({
		count: messageRows.length,
		rowHeight: 96,
		overscan: 10,
		minCountToWindow: 60,
		// Variable-height bubbles + fixed spacers jump hard when prepending older pages.
		enabled: false,
		scrollRef: messageBoxRef,
	});
	const visibleMessageRows = useMemo(() => {
		const slice = messageRows.slice(messageListWindow.start, messageListWindow.end);
		return slice.map((row, offset) => ({
			row,
			rowIndex: messageListWindow.start + offset,
		}));
	}, [messageRows, messageListWindow.start, messageListWindow.end]);
	const registerChatImage = useCallback(
		(id, image) => {
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
			// Tall media expands after the first bottom-pin — re-stick while opening.
			if (image && pinThreadToBottomRef.current) {
				scrollMessagesToBottom('auto');
			}
		},
		[scrollMessagesToBottom],
	);

	useEffect(() => {
		setActiveChatImageId(null);
		setRegisteredChatImages({});
		setDocumentPreview(null);
		setReplyingTo(null);
		setReactionPickerMessageId(null);
		setReactionPickerAnchor(null);
		reactionPickerMessageRef.current = null;
		setActionMessageId(null);
		setActionMessageAnchor(null);
		setMultiMessageMenuAnchor(null);
		setForwardingMessage(null);
		setSharingMessageIds(null);
		setSharingBusy(false);
		setDeleteMessageTarget(null);
		setMessageInfo(null);
		setTranscriptionSources(null);
	}, [conversationId]);

	useEffect(() => {
		if (typeof window === 'undefined') return undefined;
		if (activeTab !== 'calls') return undefined;
		const media = window.matchMedia('(min-width: 769px)');
		const leaveCallsOnDesktop = () => {
			if (media.matches) setActiveTab('chats');
		};
		leaveCallsOnDesktop();
		media.addEventListener('change', leaveCallsOnDesktop);
		return () => media.removeEventListener('change', leaveCallsOnDesktop);
	}, [activeTab]);

	useEffect(() => {
		if (!conversationId) {
			setSecondaryConversationId(null);
			setSplitPickMode(false);
			setShowNotes(false);
		}
	}, [conversationId]);

	useEffect(() => {
		if (
			secondaryConversationId &&
			conversationId &&
			secondaryConversationId === conversationId
		) {
			setSecondaryConversationId(null);
		}
	}, [conversationId, secondaryConversationId]);

	useEffect(() => {
		if (!reactionPickerMessageId) return undefined;
		const closePickerOutside = event => {
			if (skipReactionPickerCloseRef.current) return;
			if (
				event.target.closest(
					'[data-message-reaction-picker], [data-message-reaction-trigger], [data-message-actions-trigger]',
				)
			) {
				return;
			}
			setReactionPickerMessageId(null);
			setReactionPickerAnchor(null);
			reactionPickerMessageRef.current = null;
		};
		document.addEventListener('pointerdown', closePickerOutside);
		return () => document.removeEventListener('pointerdown', closePickerOutside);
	}, [reactionPickerMessageId]);

	useEffect(() => {
		if (!localStorage.getItem('accessToken')) return undefined;
		let cancelled = false;
		fetchVoiceChangerSettings()
			.then(data => {
				if (cancelled) return;
				voiceChangerSettingsRef.current = data;
				setVoiceChangerSettings(data);
			})
			.catch(() => {
				if (cancelled) return;
				voiceChangerSettingsRef.current = {
					configured: true,
					enabled: false,
					provider: 'off',
				};
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!showNotes) return undefined;
		const closeNotesOutside = event => {
			if (event.target.closest('[data-wa-notes-popover]')) return;
			setShowNotes(false);
		};
		document.addEventListener('pointerdown', closeNotesOutside);
		return () => document.removeEventListener('pointerdown', closeNotesOutside);
	}, [showNotes]);

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

	useLayoutEffect(() => {
		const next = defaultWhatsAppActiveTab() || 'chats';
		setActiveTab(next);
		setTabReady(true);
	}, []);

	useEffect(() => {
		if (!tabReady || !activeTab) return;
		if (!currentUserId || currentUserId === 'anonymous') return;
		if (!restoredTabRef.current) {
			restoredTabRef.current = true;
			const stored = readStoredWhatsAppActiveTab(currentUserId);
			if (
				stored &&
				stored !== 'notifications' &&
				WHATSAPP_PERSISTED_TABS.has(stored) &&
				stored !== activeTab
			) {
				setActiveTab(stored);
				return;
			}
		}
		writeStoredWhatsAppActiveTab(activeTab, currentUserId);
	}, [activeTab, currentUserId, tabReady]);

	useEffect(() => {
		try {
			window.localStorage.setItem(
				WHATSAPP_CHAT_LIST_COLLAPSED_KEY,
				chatListCollapsed ? '1' : '0',
			);
		} catch {
			// Ignore quota / private-mode failures.
		}
		if (!chatListCollapsed) setCollapsedChatTip(null);
	}, [chatListCollapsed]);

	useEffect(() => {
		try {
			window.localStorage.setItem(WHATSAPP_CHAT_LIST_WIDTH_KEY, String(chatListWidth));
		} catch {
			/* ignore */
		}
	}, [chatListWidth]);

	const beginChatListResize = useCallback(
		event => {
			if (chatListCollapsed || event.button !== 0) return;
			event.preventDefault();
			event.stopPropagation();
			chatListResizeRef.current = {
				active: true,
				startX: event.clientX,
				startWidth: chatListWidth,
			};
			setChatListResizing(true);
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
		},
		[chatListCollapsed, chatListWidth],
	);

	useEffect(() => {
		if (!chatListResizing) return undefined;
		const onMove = event => {
			const state = chatListResizeRef.current;
			if (!state.active) return;
			const rtl = locale === 'ar';
			const delta = event.clientX - state.startX;
			const next = state.startWidth + (rtl ? -delta : delta);
			setChatListWidth(
				Math.min(CHAT_LIST_WIDTH_MAX, Math.max(CHAT_LIST_WIDTH_MIN, Math.round(next))),
			);
		};
		const onUp = () => {
			chatListResizeRef.current.active = false;
			setChatListResizing(false);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [chatListResizing, locale]);

	useEffect(() => {
		writeWhatsAppPrivacyBlur(privacyBlur);
		applyWhatsAppPrivacyBlurClasses(privacyBlur);
	}, [privacyBlur]);

	useEffect(() => {
		if (!searchOpen) return undefined;
		const frame = window.requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(frame);
	}, [searchOpen]);

	useEffect(
		() => () => applyWhatsAppPrivacyBlurClasses({ enabled: false }),
		[],
	);

	useEffect(() => {
		if (!privacyBlur.enabled || !privacyBlur.persistReveal) return undefined;
		const onPointerOver = event => markPrivacyBlurRevealed(event.target);
		document.addEventListener('pointerover', onPointerOver, { passive: true });
		return () => document.removeEventListener('pointerover', onPointerOver);
	}, [privacyBlur.enabled, privacyBlur.persistReveal]);

	const subscribeToWhatsAppPush = useCallback(
		async requestPermission => {
			if (typeof window === 'undefined' || !('Notification' in window)) {
				setPushPermission('unsupported');
				return false;
			}
			const canUseServiceWorker =
				'serviceWorker' in navigator && 'PushManager' in window;
			setEnablingPush(true);
			try {
				let permission = Notification.permission;
				if (permission === 'default' && requestPermission) {
					permission = await Notification.requestPermission();
				}
				setPushPermission(permission);
				if (permission !== 'granted') return false;

				// Local Notification API works even in development.
				// Full background PWA push needs a service worker (production build).
				if (!canUseServiceWorker || process.env.NODE_ENV === 'development') {
					if (requestPermission) {
						toast.success(
							process.env.NODE_ENV === 'development'
								? locale === 'ar'
									? 'تم تفعيل إشعارات المتصفح. إشعارات PWA الكاملة تحتاج نسخة الإنتاج.'
									: 'Browser notifications enabled. Full PWA push needs a production build.'
								: t.pushEnabled,
						);
					}
					return true;
				}

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
		[t, locale],
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
	const storyThumbInFlightRef = useRef(new Set());
	const [storyThumbs, setStoryThumbs] = useState({});

	useEffect(() => {
		if (activeTab !== 'statuses' || !accountId) return undefined;
		let cancelled = false;
		// Prefer unviewed + own stories first so the visible top of the grid fills sooner.
		const targets = [...groupedStatuses]
			.sort((a, b) => {
				if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
				if (a.isViewed !== b.isViewed) return a.isViewed ? 1 : -1;
				return 0;
			})
			.map(story => story.latest)
			.filter(
				item =>
					item &&
					['image', 'video', 'gif', 'sticker'].includes(
						String(item.type || '').toLowerCase(),
					) &&
					!storyThumbCacheRef.current.has(item.id) &&
					!storyThumbInFlightRef.current.has(item.id),
			);
		if (!targets.length) return undefined;

		for (const item of targets) storyThumbInFlightRef.current.add(item.id);

		void mapPool(targets, 6, async item => {
			if (cancelled || accountIdRef.current !== accountId) return;
			try {
				const blob = await fetchStatusMediaBlob(accountId, item.id);
				if (cancelled || accountIdRef.current !== accountId) return;
				const url = URL.createObjectURL(blob);
				const type = String(blob.type || '').startsWith('video/') ? 'video' : 'image';
				storyThumbCacheRef.current.set(item.id, { url, type });
				setStoryThumbs(prev =>
					prev[item.id]?.url === url ? prev : { ...prev, [item.id]: { url, type } },
				);
			} catch {
				storyThumbCacheRef.current.delete(item.id);
			} finally {
				storyThumbInFlightRef.current.delete(item.id);
			}
		});

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
		if (typeof window === 'undefined' || !('Notification' in window)) {
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
		const archivedView = conversationFilter === 'archived';
		const chipFilter = WHATSAPP_INBOX_CHIP_FILTERS.has(conversationFilter)
			? conversationFilter
			: 'all';
		const scoped = effectiveConversations.filter(conversation => {
			if (activeTab === 'channels' ? !isChannelConversation(conversation) : isChannelConversation(conversation)) {
				return false;
			}
			if (archivedView ? !conversation.isArchived : conversation.isArchived) {
				return false;
			}
			// Chip filters (Unread / Favorites / Important) apply to the loaded All inbox
			// immediately — no waiting on a server round-trip.
			if (
				!archivedView &&
				chipFilter !== 'all' &&
				!conversationMatchesInboxFilter(conversation, chipFilter, {
					messagesCache: messagesCacheRef.current,
				})
			) {
				return false;
			}
			return true;
		});
		const sorted = [...scoped].sort((a, b) => {
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
	}, [effectiveConversations, chatSearch, activeTab, conversationFilter]);

	const chatListWindow = useWaScrollWindow({
		count: filteredConversations.length,
		rowHeight: 76,
		overscan: 14,
		minCountToWindow: 40,
		initialAlign: 'start',
	});
	const visibleConversations = useMemo(
		() =>
			filteredConversations.slice(chatListWindow.start, chatListWindow.end),
		[filteredConversations, chatListWindow.start, chatListWindow.end],
	);

	const archivedChatsCount = useMemo(() => {
		const local = effectiveConversations.filter(conversation => {
			if (!conversation.isArchived) return false;
			return activeTab === 'channels'
				? isChannelConversation(conversation)
				: !isChannelConversation(conversation);
		}).length;
		return Math.max(local, archivedCount);
	}, [effectiveConversations, activeTab, archivedCount]);

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
		const storedAccountId = readStoredWhatsAppAccountId(currentUserId);
		const storedAccount = list.find(item => item.id === storedAccountId);
		setAccounts(list);
		const nextAccountId =
			requestedAccount?.id ||
			storedAccount?.id ||
			list.find(item => item.id === accountIdRef.current)?.id ||
			list[0]?.id ||
			null;
		setAccountId(current => {
			const currentStillExists = list.some(item => item.id === current);
			const resolved =
				requestedAccount?.id ||
				storedAccount?.id ||
				(currentStillExists ? current : null) ||
				list[0]?.id ||
				null;
			if (resolved) {
				if (requestedAccount || !storedAccount) {
					writeStoredWhatsAppAccountId(resolved, currentUserId);
				}
				writeWhatsAppAccountToLocation(resolved);
			}
			return resolved;
		});
		const activeAccount = list.find(item => item.id === nextAccountId);
		if (activeAccount?.status === 'connected') {
			setQr(null);
			setPairingCode(null);
		}
		if (requestedAccount) {
			const tab = activeTabRef.current;
			if (isConversationWorkspaceTab(tab) || tab === 'accounts' || !tab) {
				setActiveTab('chats');
			}
		}
		return list;
	}, [currentUserId]);

	const selectWhatsAppAccount = useCallback(
		nextAccountId => {
			if (!nextAccountId) return;
			setAccountId(nextAccountId);
			writeStoredWhatsAppAccountId(nextAccountId, currentUserId);
			writeWhatsAppAccountToLocation(nextAccountId);
		},
		[currentUserId],
	);

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
		if (!id) return { items: [], total: 0, page: 1, scope: 'all' };
		const requestId = ++conversationsRequestId.current;
		const search = String(options.search || '').trim();
		const filter = options.filter || conversationFilterRef.current || 'all';
		const assignedUserId =
			options.assignedUserId ?? assignmentFilterRef.current ?? '';
		const chipBackfill =
			Boolean(options.mergeIntoInbox) &&
			WHATSAPP_INBOX_CHIP_FILTERS.has(filter) &&
			!search &&
			!assignedUserId;
		const useCache = !search && filter === 'all' && !assignedUserId && !chipBackfill;
		// Always read conversations from DB — even when the live session is offline —
		// so the inbox stays usable after a browser/session drop.
		const cached = useCache ? conversationsCacheRef.current.get(id) : null;
		const isFirstPage = page === 1 && !append;
		const cachedItems = Array.isArray(cached?.items) ? cached.items : [];
		// Never treat an empty cache as authoritative — that was freezing the inbox
		// on a blank pre-sync snapshot for the full TTL window.
		const cacheHasRows = cachedItems.length > 0;
		const cacheIsFresh =
			Boolean(cached) &&
			cacheHasRows &&
			Date.now() - cached.cachedAt < CONVERSATIONS_CACHE_TTL;
		// Stale-while-revalidate: paint known rows immediately, then always refresh
		// unless a forced reload cleared the cache intentionally.
		if (
			isFirstPage &&
			cacheHasRows &&
			!options.force &&
			!chipBackfill &&
			accountIdRef.current === id
		) {
			setConversations(sortConversationsByActivity(cachedItems));
			const requestedConversationId =
				typeof window !== 'undefined'
					? new URLSearchParams(window.location.search).get('conversationId')
					: null;
			if (cachedItems.some(item => item.id === requestedConversationId)) {
				setConversationId(requestedConversationId);
				const requested = cachedItems.find(item => item.id === requestedConversationId);
				// Never steal focus from Task Board / Emails / Reports / Settings.
				const tab = activeTabRef.current;
				if (isConversationWorkspaceTab(tab) || tab === 'accounts') {
					setActiveTab(isChannelConversation(requested) ? 'channels' : 'chats');
				}
			}
			setConversationPage(cached.page);
			setConversationTotal(cached.total);
			setConversationScope(cached.scope);
			if (typeof cached.archivedCount === 'number') {
				setArchivedCount(cached.archivedCount);
			}
			// Fresh cache still background-revalidates; do not return early.
			if (cacheIsFresh && options.background !== true) {
				void loadConversations(id, 1, false, {
					...options,
					background: true,
					force: false,
					search,
					filter,
					assignedUserId,
				}).catch(() => { });
				return cached;
			}
		}
		if (options.force && !options.background && !chipBackfill) {
			await resetConversationsCache(id);
		}
		const queryKey = whatsappKeys.conversations(id, {
			page,
			search,
			filter,
			assignedUserId,
		});
		let data;
		try {
			data = await queryClient.fetchQuery({
				queryKey,
				queryFn: () =>
					fetchConversations(id, {
						page,
						limit: 50,
						search,
						filter,
						assignedUserId,
					}),
				staleTime: options.force || options.background || chipBackfill ? 0 : CONVERSATIONS_CACHE_TTL,
			});
		} catch (error) {
			// Cancelled by a newer force reload / account switch — ignore, do not clear UI.
			if (isRequestCancelled(error)) {
				const fallbackItems =
					conversationsCacheRef.current.get(id)?.items ||
					(accountIdRef.current === id ? conversationsRef.current : null) ||
					[];
				return {
					items: fallbackItems,
					total: fallbackItems.length,
					page,
					scope: 'all',
					cancelled: true,
				};
			}
			throw error;
		}
		const items = sortConversationsByActivity(
			Array.isArray(data?.items) ? data.items : [],
		);
		const markImportant = filter === 'important' || filter === 'starred';
		const annotateChipFields = item =>
			markImportant ? { ...item, hasImportantMessages: true } : item;
		const previousItems = append
			? (conversationsCacheRef.current.get(id)?.items ||
				(accountIdRef.current === id ? conversationsRef.current : []) ||
				[])
			: [];
		let nextItems = append
			? sortConversationsByActivity([
					...new Map(
						[...previousItems, ...items.map(annotateChipFields)].map(item => [item.id, item]),
					).values(),
				])
			: items.map(annotateChipFields);

		// Chip filters: merge missing rows into the All inbox instead of replacing it.
		if (chipBackfill) {
			const inboxBase =
				conversationsCacheRef.current.get(id)?.items ||
				(accountIdRef.current === id ? conversationsRef.current : []) ||
				[];
			const byId = new Map(inboxBase.map(item => [item.id, item]));
			items.forEach(item => {
				const annotated = annotateChipFields(item);
				const live = byId.get(item.id);
				if (!live) {
					byId.set(item.id, annotated);
					return;
				}
				byId.set(item.id, {
					...live,
					...annotated,
					isTyping: live.isTyping,
					typing: live.typing,
					presence: live.presence,
					unreadCount:
						live.unreadCount == null ? annotated.unreadCount : live.unreadCount,
					hasImportantMessages:
						Boolean(live.hasImportantMessages) || Boolean(annotated.hasImportantMessages),
					isFavorite:
						annotated.isFavorite == null ? live.isFavorite : annotated.isFavorite,
				});
			});
			nextItems = sortConversationsByActivity([...byId.values()]);
		}

		const next = {
			items: nextItems,
			page: data?.page || page,
			total: typeof data?.total === 'number' ? data.total : nextItems.length,
			scope: data?.scope || 'all',
			archivedCount:
				typeof data?.archivedCount === 'number' ? data.archivedCount : undefined,
			cachedAt: Date.now(),
		};
		const isCurrent =
			accountIdRef.current === id && conversationsRequestId.current === requestId;
		// Only the latest request may write cache — superseded empty responses
		// were poisoning TanStack and later hydrating the UI to [].
		// Chip backfills always update the All inbox cache.
		if ((useCache || chipBackfill) && isCurrent) {
			const existingCache = conversationsCacheRef.current.get(id);
			conversationsCacheRef.current.set(id, {
				...(existingCache || {}),
				...next,
				page: chipBackfill ? existingCache?.page || next.page : next.page,
				total: chipBackfill
					? Math.max(existingCache?.total || 0, nextItems.length)
					: next.total,
			});
		}
		if (!isCurrent) {
			return next;
		}
		// Background revalidation must not wipe a newer live preview patch with
		// an older network snapshot that raced past a socket update.
		if (options.background && !chipBackfill) {
			const liveById = new Map((conversationsRef.current || []).map(item => [item.id, item]));
			const merged = sortConversationsByActivity(
				nextItems.map(item => {
					const live = liveById.get(item.id);
					if (!live) return item;
					const netTime = new Date(
						item.lastMessage?.providerTimestamp || item.lastMessageAt || 0,
					).getTime();
					const liveTime = new Date(
						live.lastMessage?.providerTimestamp || live.lastMessageAt || 0,
					).getTime();
					if (liveTime > netTime) {
						return {
							...item,
							...live,
							unreadCount:
								live.unreadCount == null ? item.unreadCount : live.unreadCount,
						};
					}
					return {
						...live,
						...item,
						isTyping: live.isTyping,
						typing: live.typing,
						presence: live.presence,
					};
				}),
			);
			if (useCache) {
				conversationsCacheRef.current.set(id, { ...next, items: merged });
			}
			setConversations(merged);
		} else {
			setConversations(nextItems);
		}
		const requestedConversationId =
			typeof window !== 'undefined'
				? new URLSearchParams(window.location.search).get('conversationId')
				: null;
		if (nextItems.some(item => item.id === requestedConversationId)) {
			setConversationId(requestedConversationId);
			const requested = nextItems.find(item => item.id === requestedConversationId);
			// Keep the user on Task Board (and other non-chat tabs) when a deep-link
			// conversationId is present — only switch when already in the chat workspace.
			const tab = activeTabRef.current;
			if (isConversationWorkspaceTab(tab) || tab === 'accounts') {
				setActiveTab(isChannelConversation(requested) ? 'channels' : 'chats');
			}
		}
		// Chip backfill must not reset All-inbox pagination / totals.
		if (!chipBackfill) {
			setConversationPage(next.page);
			setConversationTotal(next.total);
			setConversationScope(next.scope);
		}
		if (typeof next.archivedCount === 'number') {
			setArchivedCount(next.archivedCount);
		}
		return next;
	}, [queryClient, resetConversationsCache]);

	const loadMoreConversations = async () => {
		if (!accountId || loadingMoreConversations || conversations.length >= conversationTotal) return;
		setLoadingMoreConversations(true);
		try {
			const search = chatSearchRef.current;
			const assignment = assignmentFilterRef.current;
			const filter = conversationFilterRef.current;
			const chipOnly =
				WHATSAPP_INBOX_CHIP_FILTERS.has(filter) && !search && !assignment;
			// Extend the All inbox so local chip filters keep working without
			// replacing the list with a filtered-only page.
			await loadConversations(accountId, conversationPage + 1, true, {
				search,
				filter: chipOnly ? 'all' : filter,
				assignedUserId: assignment,
			});
			if (chipOnly) {
				void loadConversations(accountId, 1, false, {
					background: true,
					mergeIntoInbox: true,
					force: false,
					search: '',
					filter,
					assignedUserId: '',
				}).catch(() => {});
			}
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
			if (syncingInboxRef.current) return;
			if (reloadConversationsTimer.current) clearTimeout(reloadConversationsTimer.current);
			reloadConversationsTimer.current = setTimeout(() => {
				if (syncingInboxRef.current) return;
				const search = chatSearchRef.current;
				const assignment = assignmentFilterRef.current;
				const filter = conversationFilterRef.current;
				const chipOnly =
					WHATSAPP_INBOX_CHIP_FILTERS.has(filter) && !search && !assignment;
				// Always refresh the All inbox first so chip filters stay instant.
				loadConversations(id, 1, false, {
					force: true,
					search,
					filter: chipOnly ? 'all' : filter,
					assignedUserId: assignment,
				})
					.then(() => {
						if (!chipOnly || accountIdRef.current !== id) return;
						return loadConversations(id, 1, false, {
							background: true,
							mergeIntoInbox: true,
							force: false,
							search: '',
							filter,
							assignedUserId: '',
						});
					})
					.catch(() => { });
			}, 800);
		},
		[loadConversations],
	);

	useEffect(() => {
		chatSearchRef.current = chatSearch.trim();
		conversationFilterRef.current = conversationFilter;
		assignmentFilterRef.current = assignmentFilter;
		if (!accountId) return undefined;
		const searchRequestId = ++conversationSearchRequestId.current;
		const hasTextSearch = Boolean(chatSearchRef.current);
		const hasAssignment = Boolean(assignmentFilter);
		const needsServerSearch = hasTextSearch || hasAssignment;
		const needsChipBackfill =
			!needsServerSearch && WHATSAPP_INBOX_CHIP_FILTERS.has(conversationFilter);
		const timer = window.setTimeout(async () => {
			// Account switching already reloads via the accountId effect. Forcing a
			// second cancel+refetch here races and surfaces "Could not search conversations".
			if (!needsServerSearch && !needsChipBackfill) {
				if (
					accountIdRef.current === accountId &&
					conversationSearchRequestId.current === searchRequestId
				) {
					setSearchingConversations(false);
				}
				return;
			}

			// Chip filters: UI already filtered the loaded All list. Backfill missing
			// chats (e.g. unread not in the first All page) quietly in the background.
			if (needsChipBackfill) {
				if (
					accountIdRef.current === accountId &&
					conversationSearchRequestId.current === searchRequestId
				) {
					setSearchingConversations(false);
				}
				try {
					await loadConversations(accountId, 1, false, {
						background: true,
						mergeIntoInbox: true,
						force: false,
						search: '',
						filter: conversationFilterRef.current,
						assignedUserId: '',
					});
				} catch {
					// Silent — local filter already shows what we have.
				}
				return;
			}

			setSearchingConversations(true);
			try {
				await loadConversations(accountId, 1, false, {
					force: true,
					search: chatSearchRef.current,
					filter: conversationFilterRef.current,
					assignedUserId: assignmentFilterRef.current,
				});
			} catch (error) {
				if (isRequestCancelled(error)) return;
				if (accountIdRef.current !== accountId) return;
				if (conversationSearchRequestId.current !== searchRequestId) return;
				toast.error(error.response?.data?.message || 'Could not search conversations');
			} finally {
				if (
					accountIdRef.current === accountId &&
					conversationSearchRequestId.current === searchRequestId
				) {
					setSearchingConversations(false);
				}
			}
		}, needsChipBackfill ? 0 : 300);
		return () => window.clearTimeout(timer);
	}, [
		accountId,
		assignmentFilter,
		chatSearch,
		conversationFilter,
		loadConversations,
	]);

	// Inbox previews come from conversation_updated / chat sync — no GET /messages?limit=1 walk.

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

	// Patches a single conversation's preview/unread count in place instead of
	// refetching the whole list — avoids the flicker/scroll-jump of a full reload
	// for the common case of "a new message arrived somewhere in this account".
	const applyConversationPreview = useCallback(payload => {
		const viewingOpenChat =
			payload?.conversationId &&
			payload.conversationId === conversationIdRef.current &&
			isConversationWorkspaceTab(activeTabRef.current);
		const nextPayload = viewingOpenChat ? { ...payload, unreadCount: 0 } : payload;
		setConversations(current => {
			const next = updateConversationPreview(current, nextPayload);
			if (next === current) return current;
			const currentAccountId = accountIdRef.current;
			const cached = currentAccountId ? conversationsCacheRef.current.get(currentAccountId) : null;
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
				message.id === messageId ||
				message.providerMessageId === messageId ||
				message.clientMessageId === messageId
					? updater(message)
					: message,
			);
		if (conversationIdRef.current === targetConversationId) {
			writeConversationMessagesRef.current?.(targetConversationId, current =>
				apply(current),
			);
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
			const liveSession = account?.status === 'connected';
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
				// Live provider refresh only when the session is connected.
				if (liveSession && (force || !cacheFresh)) {
					const providerRefreshRequired =
						force || !Array.isArray(data?.items) || data.items.length === 0;
					void refreshStatusesFromProvider(targetAccountId, {
						silent: true,
						force: providerRefreshRequired,
					});
				} else if (!liveSession && accountIdRef.current === targetAccountId) {
					const items = Array.isArray(data?.items) ? data.items : cached?.items || [];
					if (!items.length) {
						setStatusFetchHint(data?.hint || 'whatsapp_not_connected');
					}
				}
			} catch (error) {
				if (!cached?.items?.length) {
					if (force || !silent) {
						toast.error(error.response?.data?.message || 'Could not load statuses');
					}
					if (!liveSession && accountIdRef.current === targetAccountId) {
						setStatusFetchHint('whatsapp_not_connected');
					}
				} else if (force && liveSession) {
					void refreshStatusesFromProvider(targetAccountId, { silent: false, force: true });
				}
			}
		},
		[refreshStatusesFromProvider, applyStatuses],
	);

	const loadMessages = useCallback(async (id, canSync, options = {}) => {
		if (!id) return;
		const forceProvider = Boolean(options.forceProvider);
		const starredOnly =
			Boolean(options.starredOnly) ||
			conversationFilterRef.current === 'important' ||
			conversationFilterRef.current === 'starred';
		const cacheKey = messagesCacheKey(id, starredOnly);
		const requestId = ++messagesRequestId.current;
		const isCurrentRequest = () =>
			messagesRequestId.current === requestId &&
			conversationIdRef.current === id;
		const conversationMeta =
			conversationsRef.current.find(item => item.id === id) || null;
		const allowProviderSync =
			Boolean(canSync) && !isEmailMemoAiConversation(conversationMeta);
		if (!messagesCacheRef.current.get(cacheKey) && !starredOnly) {
			void readCachedMessagePage(id, false).then(page => {
				if (!page?.items?.length) return;
				if (conversationIdRef.current !== id) return;
				if (messagesCacheRef.current.get(cacheKey)?.items?.length) return;
				messagesCacheRef.current.set(cacheKey, {
					items: page.items,
					hasMore: true,
					cachedAt: page.cachedAt || Date.now(),
				});
				writeConversationMessages(id, () => page.items);
			});
		}
		if (hoverPrefetchTimerRef.current) {
			window.clearTimeout(hoverPrefetchTimerRef.current);
			hoverPrefetchTimerRef.current = null;
		}
		void queryClient.cancelQueries({
			queryKey: ['whatsapp', 'messages'],
			predicate: query => String(query.queryKey[2] || '') !== String(id),
		});
		const cached = messagesCacheRef.current.get(cacheKey);
		const cacheIsFresh =
			Boolean(cached?.items?.length) &&
			Date.now() - cached.cachedAt < MESSAGES_CACHE_TTL;
		const markReadIfNeeded = () => {
			if (canSync && isConversationWorkspaceTab(activeTabRef.current)) {
				api
					.post(`/whatsapp/conversations/${id}/read`)
					.then(() => {
						setConversationUnreadCount(id, 0);
						notifyWhatsAppUnreadChanged();
					})
					.catch(() => { });
			}
		};
		if (cached?.items?.length && !starredOnly) {
			writeConversationMessages(id, () => cached.items);
			setHasMoreMessages(cached.hasMore);
			setLoadingMessages(false);
			setMessagesSyncHint('');
			scrollMessagesToBottom();
			// WhatsApp Web model: warm in-memory thread opens instantly.
			// Provider history sync is NOT re-run on every open — live rows
			// arrive via socket; Postgres is the durable cache.
			if (
				shouldSkipOpenChatNetwork({
					cacheIsFresh,
					forceProvider,
					itemCount: cached.items.length,
					socketHealthy: Boolean(socketRef.current?.connected),
					providerHydratedAt: cached.providerHydratedAt,
					lastProviderSyncAt:
						cached.lastProviderSyncAt || conversationMeta?.lastProviderSyncAt,
				})
			) {
				markReadIfNeeded();
				return;
			}
		} else if (starredOnly && cached?.items) {
			writeConversationMessages(id, () =>
				(cached.items || []).filter(item => item?.isStarred),
			);
			setHasMoreMessages(Boolean(cached.hasMore));
			setLoadingMessages(false);
			setMessagesSyncHint('');
			scrollMessagesToBottom();
			if (cacheIsFresh && !forceProvider) return;
		} else {
			setLoadingMessages(true);
			// Keeps this chat's already-rendered messages (no blank flash) while
			// dropping anything that belonged to the chat the user just left.
			if (!starredOnly) {
				writeConversationMessages(id, current => current);
			} else {
				writeConversationMessages(id, () => []);
			}
			setHasMoreMessages(false);
		}
		try {
			const storedItems = await queryClient.fetchQuery({
				queryKey: whatsappKeys.messages(id, { starredOnly }),
				queryFn: async ({ signal }) => {
					const items = await fetchMessages(id, {
						limit: MESSAGE_PAGE_SIZE,
						signal,
						starredOnly,
					});
					return {
						items,
						hasMore: items.length >= MESSAGE_PAGE_SIZE,
						cachedAt: Date.now(),
					};
				},
				staleTime: cacheIsFresh && !forceProvider ? MESSAGES_CACHE_TTL : 0,
			});
			if (!isCurrentRequest()) return;
			const pageItems = Array.isArray(storedItems)
				? storedItems
				: storedItems?.items || [];
			const currentCache = messagesCacheRef.current.get(cacheKey);
			let items = mergeMessages(
				starredOnly ? [] : currentCache?.items || cached?.items || [],
				pageItems,
				id,
			);
			if (starredOnly) {
				items = items.filter(item => item?.isStarred);
			}
			const storedPageIsFull = pageItems.length >= MESSAGE_PAGE_SIZE;
			const initialHasMore =
				Boolean(currentCache?.hasMore ?? cached?.hasMore ?? storedItems?.hasMore) ||
				storedPageIsFull;
			const seededHydratedAt =
				currentCache?.providerHydratedAt ||
				cached?.providerHydratedAt ||
				0;
			const seededLastSync =
				currentCache?.lastProviderSyncAt ||
				cached?.lastProviderSyncAt ||
				conversationMeta?.lastProviderSyncAt ||
				null;
			setHasMoreMessages(initialHasMore);
			messagesCacheRef.current.set(cacheKey, {
				items,
				hasMore: initialHasMore,
				cachedAt: Date.now(),
				providerHydratedAt: seededHydratedAt,
				lastProviderSyncAt: seededLastSync,
				lastSyncReason: currentCache?.lastSyncReason || cached?.lastSyncReason || null,
			});
			writeConversationMessages(id, () => items);
			if (!items.length && isCurrentRequest() && !starredOnly) {
				const preview = conversationsRef.current.find(item => item.id === id)?.lastMessage;
				if (preview && isRenderableWhatsAppMessage(preview)) {
					items = [
						{
							...preview,
							id: preview.id || `inbox-preview-${id}`,
							conversationId: preview.conversationId || id,
						},
					];
					writeConversationMessages(id, () => items);
				}
			}
			if (isCurrentRequest()) {
				setLoadingMessages(false);
				setMessagesSyncHint('');
				if (items.length > 0) scrollMessagesToBottom();
			}
			markReadIfNeeded();

			const applySynced = synced => {
				if (!isCurrentRequest() || starredOnly) return;
				const latestCache = messagesCacheRef.current.get(cacheKey);
				items = mergeMessages(latestCache?.items || items, synced?.items || [], id);
				writeConversationMessages(id, current =>
					mergeMessages(current, synced?.items || [], id),
				);
				const hasMore =
					typeof synced?.hasMore === 'boolean'
						? synced.hasMore
						: items.length >= MESSAGE_PAGE_SIZE;
				setHasMoreMessages(hasMore);
				const syncAt =
					synced?.lastProviderSyncAt ||
					new Date().toISOString();
				messagesCacheRef.current.set(cacheKey, {
					items,
					hasMore,
					cachedAt: Date.now(),
					providerHydratedAt: Date.now(),
					lastProviderSyncAt: syncAt,
					lastSyncReason: synced?.syncReason || synced?.syncError || null,
				});
				if (
					synced?.lastProviderSyncAt ||
					synced?.syncReason === 'fresh' ||
					synced?.syncReason === 'local_replica' ||
					synced?.syncReason === 'hydrated_empty'
				) {
					setConversations(current =>
						current.map(item =>
							item.id === id
								? {
										...item,
										lastProviderSyncAt:
											synced?.lastProviderSyncAt ||
											item.lastProviderSyncAt ||
											syncAt,
									}
								: item,
						),
					);
				}
				scrollMessagesToBottom();
			};

			const historySyncBlocked =
				Date.now() < providerHistorySyncBlockedUntilRef.current;
			const backfill = shouldProviderBackfill({
				canSync: allowProviderSync,
				starredOnly,
				forceProvider,
				historySyncBlocked,
				itemCount: items.length,
				providerHydratedAt: seededHydratedAt,
				lastProviderSyncAt: seededLastSync,
			});
			const needsProviderBackfill = backfill.needed;
			if (needsProviderBackfill) {
				if (isCurrentRequest()) {
					setLoadingMessages(false);
					setMessagesSyncHint('');
					if (items.length > 0) scrollMessagesToBottom();
				}
				const runSyncOnce = () => {
					let syncPromise = messageSyncInFlightRef.current.get(id);
					if (!syncPromise) {
						syncPromise = api
							.post(`/whatsapp/conversations/${id}/sync/latest`, null, {
								params: {
									limit: MESSAGE_PAGE_SIZE,
									...(forceProvider ? { force: 1 } : {}),
								},
								timeout: 12000,
							})
							.then(response => response.data)
							.finally(() => {
								if (messageSyncInFlightRef.current.get(id) === syncPromise) {
									messageSyncInFlightRef.current.delete(id);
								}
							});
						messageSyncInFlightRef.current.set(id, syncPromise);
					}
					return syncPromise;
				};
				const scheduleBackgroundRetry = cooldownMs => {
					const retryState = messageHistoryRetryRef.current;
					if (retryState.timer) {
						clearTimeout(retryState.timer);
						retryState.timer = null;
					}
					if (retryState.conversationId !== id) {
						retryState.conversationId = id;
						retryState.attempts = 0;
					}
					// Empty ChatStore will not fill from hammering sync/latest.
					// One quiet retry (Postgres only), then wait for live events.
					if (retryState.attempts >= 1) {
						if (isCurrentRequest()) {
							setMessagesSyncHint('');
							setLoadingMessages(false);
						}
						return;
					}
					retryState.attempts += 1;
					const waitMs = Math.min(
						30_000,
						Math.max(10_000, Number(cooldownMs) || 12_000),
					);
					providerHistorySyncBlockedUntilRef.current = Date.now() + waitMs;
					retryState.timer = setTimeout(() => {
						retryState.timer = null;
						if (conversationIdRef.current !== id) return;
						providerHistorySyncBlockedUntilRef.current = 0;
						loadMessagesRef.current?.(id, true, { forceProvider: false })?.catch?.(() => { });
					}, waitMs);
				};
				const finishProviderSync = async () => {
					try {
						const synced = await runSyncOnce();
						if (!isCurrentRequest() || starredOnly) return;
						if (synced?.syncSkipped || synced?.syncError) {
							const cooldown = Number(synced?.cooldownMs) || 0;
							if (cooldown > 0) {
								providerHistorySyncBlockedUntilRef.current =
									Date.now() + Math.min(30_000, Math.max(3_000, cooldown));
							}
							if (synced?.syncReason === 'fresh' || synced?.syncError === 'fresh' || synced?.syncReason === 'local_replica' || synced?.syncError === 'local_replica' || synced?.syncReason === 'hydrated_empty' || synced?.syncError === 'hydrated_empty') {
								applySynced(synced);
								setMessagesSyncHint('');
								messageHistoryRetryRef.current.attempts = 0;
							} else if (Array.isArray(synced?.items) && synced.items.length) {
								applySynced(synced);
								setMessagesSyncHint('');
								messageHistoryRetryRef.current.attempts = 0;
							} else if (items.length === 0 && isCurrentRequest()) {
								setMessagesSyncHint('');
								setLoadingMessages(false);
								scheduleBackgroundRetry(cooldown || 4_000);
							} else if (items.length > 0 && isCurrentRequest()) {
								// Keep local paint; mark hydrated so we do not storm the phone.
								const latestCache = messagesCacheRef.current.get(cacheKey);
								messagesCacheRef.current.set(cacheKey, {
									...(latestCache || { items, hasMore: initialHasMore }),
									cachedAt: Date.now(),
									providerHydratedAt: Date.now(),
									lastProviderSyncAt:
										synced?.lastProviderSyncAt ||
										latestCache?.lastProviderSyncAt ||
										seededLastSync,
									lastSyncReason: synced?.syncReason || synced?.syncError || backfill.reason,
								});
							}
						} else {
							providerHistorySyncBlockedUntilRef.current = 0;
							messageHistoryRetryRef.current.attempts = 0;
							setMessagesSyncHint('');
							applySynced(synced);
						}
					} catch (error) {
						providerHistorySyncBlockedUntilRef.current = Date.now() + 8_000;
						if (isCurrentRequest() && !items.length) {
							setMessagesSyncHint('');
							setLoadingMessages(false);
							const firstFailure = messageHistoryRetryRef.current.attempts === 0;
							scheduleBackgroundRetry(8_000);
							if (firstFailure) {
								toast.error(
									error.response?.data?.message || 'Could not synchronize message history',
								);
							}
						}
					}
				};
				if (items.length > 0) {
					void finishProviderSync();
				} else {
					await finishProviderSync();
				}
			} else if (isCurrentRequest()) {
				// Trust DB/cache — remember hydration so the next open stays soft.
				if (!starredOnly && items.length > 0) {
					const latestCache = messagesCacheRef.current.get(cacheKey);
					messagesCacheRef.current.set(cacheKey, {
						...(latestCache || { items, hasMore: initialHasMore }),
						cachedAt: Date.now(),
						providerHydratedAt:
							seededHydratedAt ||
							Date.now(),
						lastProviderSyncAt: seededLastSync,
						lastSyncReason: backfill.reason,
					});
				}
				setLoadingMessages(false);
				setMessagesSyncHint('');
				scrollMessagesToBottom();
			}
		} catch (error) {
			if (!isCurrentRequest()) return;
			const cancelled =
				error?.name === 'CancelledError' ||
				error?.code === 'ERR_CANCELED' ||
				error?.message === 'canceled';
			if (cancelled) return;
			if (!cached?.items?.length) {
				clearConversationMessages(id);
				toast.error(error.response?.data?.message || 'Could not load messages');
			}
		} finally {
			if (isCurrentRequest()) setLoadingMessages(false);
		}
	}, [
		clearConversationMessages,
		queryClient,
		scrollMessagesToBottom,
		setConversationUnreadCount,
		writeConversationMessages,
	]);

	const loadMessagesRef = useRef(loadMessages);
	loadMessagesRef.current = loadMessages;

	const cancelIdleMessagePrefetch = useCallback((keepConversationId = null) => {
		if (hoverPrefetchTimerRef.current) {
			window.clearTimeout(hoverPrefetchTimerRef.current);
			hoverPrefetchTimerRef.current = null;
		}
		void queryClient.cancelQueries({
			queryKey: ['whatsapp', 'messages'],
			predicate: query =>
				String(query.queryKey[2] || '') !== String(keepConversationId || ''),
		});
	}, [queryClient]);

	const scheduleConversationPrefetch = useCallback((id) => {
		if (!id || id === conversationIdRef.current) return;
		if (messageSyncInFlightRef.current.size > 0) return;
		if (Date.now() < listScrollPrefetchBlockedUntilRef.current) return;
		const cached = messagesCacheRef.current.get(id);
		if (cached?.items?.length) return;
		if (hoverPrefetchTimerRef.current) window.clearTimeout(hoverPrefetchTimerRef.current);
		hoverPrefetchTimerRef.current = window.setTimeout(() => {
			hoverPrefetchTimerRef.current = null;
			if (id === conversationIdRef.current) return;
			if (prefetchInFlightRef.current >= 2) return;
			prefetchInFlightRef.current += 1;
			prefetchMessages(id, 40).finally(() => {
				prefetchInFlightRef.current = Math.max(0, prefetchInFlightRef.current - 1);
			});
		}, 220);
	}, [prefetchMessages]);

	useEffect(() => {
		return () => {
			if (hoverPrefetchTimerRef.current) {
				window.clearTimeout(hoverPrefetchTimerRef.current);
				hoverPrefetchTimerRef.current = null;
			}
		};
	}, []);

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
		conversationsRef.current = conversations;
	}, [conversations]);

	useEffect(() => {
		syncingInboxRef.current = syncingInbox;
	}, [syncingInbox]);

	useEffect(() => {
		if (!accountId) return;
		const accountChanged = previousAccountIdRef.current !== accountId;
		previousAccountIdRef.current = accountId;
		if (accountChanged) {
			conversationsRequestId.current += 1;
			conversationSearchRequestId.current += 1;
			tabRequestId.current += 1;
			storyRequestId.current += 1;
			groupRequestId.current += 1;
			messagesRequestId.current += 1;
			olderRequestId.current += 1;
			// Multi-account isolation: never reuse another account's message pages.
			messagesCacheRef.current.clear();
			setConversationId(null);
			clearConversationMessages(null);
			setLoadingMessages(false);
			setSearchingConversations(false);
			setSelectedGroup(null);
			setGroups([]);
			setLogs([]);
			setReport(null);
			setAccountAccess([]);
			setAssignableStaff([]);
			setPrivacySettings({
				hideStatusViewReceipts: true,
				readReceiptMode: 'on_reply',
			});
			setTabLoading(false);
			setTabError('');
			setSelectedStatus(null);
			setStatuses(statusesCacheRef.current.get(accountId)?.items || []);
			setInboxReady(false);
			setSessionProbeDone(false);
			setQrExpired(false);
			if (statusMediaUrlRef.current) {
				URL.revokeObjectURL(statusMediaUrlRef.current);
				statusMediaUrlRef.current = null;
			}
			setStatusMediaUrl(null);
		}
		if (!accountId) return;
		if (!isAccountConnected) {
			setSyncingInbox(current => (current ? false : current));
			setSyncProgress(current => (current === 0 ? current : 0));
		} else {
			setSessionProbeDone(true);
			setQrExpired(false);
		}
		const cachedRows = conversationsCacheRef.current.get(accountId)?.items;
		if (Array.isArray(cachedRows) && cachedRows.length > 0) {
			setInboxReady(true);
		}
		const hydrateId = accountId;
		loadConversations(hydrateId)
			.catch(() => { })
			.finally(() => {
				if (accountIdRef.current === hydrateId) setInboxReady(true);
			});
	}, [accountId, clearConversationMessages, isAccountConnected, loadConversations]);

	useEffect(
		() => () => {
			if (statusMediaUrlRef.current) URL.revokeObjectURL(statusMediaUrlRef.current);
		},
		[],
	);

	const markRuntimeReadRef = useRef(demo.markRuntimeRead);
	markRuntimeReadRef.current = demo.markRuntimeRead;

	useEffect(() => {
		// Point the ref at the new chat before anything else runs, so in-flight
		// requests for the previous chat immediately fail their isCurrentRequest()
		// guard instead of writing into the pane the user is now looking at.
		const switchedConversation = conversationIdRef.current !== conversationId;
		conversationIdRef.current = conversationId;
		if (switchedConversation) {
			const warmCache = conversationId
				? messagesCacheRef.current.get(conversationId)
				: null;
			if (warmCache?.items?.length) {
				writeConversationMessages(conversationId, () => warmCache.items);
				setHasMoreMessages(Boolean(warmCache.hasMore));
				setLoadingMessages(false);
			} else {
				clearConversationMessages(conversationId);
				setHasMoreMessages(true);
				setLoadingMessages(Boolean(conversationId));
			}
			lastAutoScrolledMessageRef.current = null;
			pinThreadToBottomRef.current = true;
			setShowJumpToBottom(false);
		}
		messagesRequestId.current += 1;
		olderRequestId.current += 1;
		loadingOlderRef.current = false;
		setLoadingOlder(false);
		setMessagesSyncHint('');
		if (messageHistoryRetryRef.current.timer) {
			clearTimeout(messageHistoryRetryRef.current.timer);
			messageHistoryRetryRef.current.timer = null;
		}
		messageHistoryRetryRef.current.conversationId = conversationId || null;
		messageHistoryRetryRef.current.attempts = 0;
		if (!conversationId) {
			clearConversationMessages(null);
			setLoadingMessages(false);
			setHasMoreMessages(true);
			setNotes(current => (current.length ? [] : current));
			setNoteDraft(current => (current ? '' : current));
			setShowNotes(current => (current ? false : current));
			return;
		}
		if (isDemoId(conversationId)) {
			clearConversationMessages(conversationId);
			setLoadingMessages(false);
			setHasMoreMessages(false);
			setNotes(current => (current.length ? [] : current));
			setShowNotes(current => (current ? false : current));
			markRuntimeReadRef.current?.(selectedDemoRuntimeId);
			return;
		}
		setHasMoreMessages(true);
		if (!isDemoId(conversationId) && isConversationWorkspaceTab(activeTabRef.current)) {
			setConversationUnreadCount(conversationId, 0);
			notifyWhatsAppUnreadChanged();
		}
		const loadKey = `${conversationId}:${conversationFilter}`;
		const shouldReloadMessages =
			switchedConversation ||
			lastOpenMessagesLoadKeyRef.current !== loadKey ||
			!messagesCacheRef.current.get(conversationId)?.items?.length;
		if (shouldReloadMessages) {
			lastOpenMessagesLoadKeyRef.current = loadKey;
			loadMessages(conversationId, canUseWhatsApp && !demo.settings.enabled).catch(() => { });
		}
		if (selectedConversationSource === 'real_overlay') {
			markRuntimeReadRef.current?.(selectedDemoRuntimeId);
			markRuntimeReadRef.current?.(conversationId);
		}
	}, [
		clearConversationMessages,
		conversationId,
		conversationFilter,
		canUseWhatsApp,
		demo.settings.enabled,
		loadMessages,
		selectedDemoRuntimeId,
		selectedConversationSource,
		setConversationUnreadCount,
		writeConversationMessages,
	]);

	useEffect(() => {
		setStickerPanelOpen(false);
		setAiImagePanelOpen(false);
		setDocumentPreview(null);
	}, [conversationId]);

	const loadMessageSchedules = useCallback(async targetConversationId => {
		if (!targetConversationId || isDemoId(targetConversationId)) {
			setMessageSchedules([]);
			return;
		}
		setMessageSchedulesLoading(true);
		try {
			const { data } = await api.get(
				`/whatsapp/conversations/${targetConversationId}/message-schedules`,
			);
			setMessageSchedules(Array.isArray(data) ? data : []);
		} catch {
			setMessageSchedules([]);
		} finally {
			setMessageSchedulesLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!conversationId || demo.settings.enabled) {
			setMessageSchedules([]);
			return;
		}
		void loadMessageSchedules(conversationId);
	}, [conversationId, demo.settings.enabled, loadMessageSchedules]);

	const pauseMessageSchedule = useCallback(async schedule => {
		if (!schedule?.id) return;
		setMessageScheduleBusyId(schedule.id);
		try {
			await api.post(`/whatsapp/message-schedules/${schedule.id}/pause`);
			if (conversationId) await loadMessageSchedules(conversationId);
		} catch (error) {
			toast.error(error?.response?.data?.message || 'Could not pause schedule');
		} finally {
			setMessageScheduleBusyId('');
		}
	}, [conversationId, loadMessageSchedules]);

	const resumeMessageSchedule = useCallback(async schedule => {
		if (!schedule?.id) return;
		setMessageScheduleBusyId(schedule.id);
		try {
			await api.post(`/whatsapp/message-schedules/${schedule.id}/resume`);
			if (conversationId) await loadMessageSchedules(conversationId);
		} catch (error) {
			toast.error(error?.response?.data?.message || 'Could not resume schedule');
		} finally {
			setMessageScheduleBusyId('');
		}
	}, [conversationId, loadMessageSchedules]);

	const cancelMessageSchedule = useCallback(async schedule => {
		if (!schedule?.id) return;
		setMessageScheduleBusyId(schedule.id);
		try {
			await api.delete(`/whatsapp/message-schedules/${schedule.id}`);
			if (conversationId) await loadMessageSchedules(conversationId);
			toast.success(locale === 'ar' ? 'تم إلغاء الجدولة' : 'Schedule cancelled');
		} catch (error) {
			toast.error(error?.response?.data?.message || 'Could not cancel schedule');
		} finally {
			setMessageScheduleBusyId('');
		}
	}, [conversationId, loadMessageSchedules, locale]);

	const loadMessageSchedulesRef = useRef(loadMessageSchedules);
	loadMessageSchedulesRef.current = loadMessageSchedules;

	useLayoutEffect(() => {
		const latest = effectiveMessages[effectiveMessages.length - 1];
		if (!latest?.id) return;
		const box = messageBoxRef.current;
		if (!box || loadingOlder) return;
		// Never fight "load older" scroll restoration.
		if (olderScrollRestoreRef.current) return;
		const pinOpen = pinThreadToBottomRef.current;
		const isNewLatest = latest.id !== lastAutoScrolledMessageRef.current;
		const nearBottom =
			box.scrollHeight - box.clientHeight - box.scrollTop < 180;
		if (pinOpen) {
			lastAutoScrolledMessageRef.current = latest.id;
			box.scrollTop = box.scrollHeight;
			setShowJumpToBottom(false);
			return;
		}
		if (!isNewLatest || !(nearBottom || latest.direction === 'outbound')) return;
		lastAutoScrolledMessageRef.current = latest.id;
		box.scrollTop = box.scrollHeight;
		setShowJumpToBottom(false);
	}, [effectiveMessages, loadingOlder, conversationId, loadingMessages]);

	// Restore scroll after older messages are prepended (before paint).
	useLayoutEffect(() => {
		const pending = olderScrollRestoreRef.current;
		if (!pending || loadingOlder) return;
		if (pending.conversationId !== conversationIdRef.current) {
			olderScrollRestoreRef.current = null;
			return;
		}
		const box = messageBoxRef.current;
		if (!box) {
			olderScrollRestoreRef.current = null;
			return;
		}

		const applyRestore = () => {
			const current = messageBoxRef.current;
			if (!current) return;
			if (pending.anchorId) {
				const safeId =
					typeof CSS !== 'undefined' && CSS.escape
						? CSS.escape(pending.anchorId)
						: pending.anchorId.replace(/"/g, '\\"');
				const anchor =
					current.querySelector(`[data-wa-message-id="${safeId}"]`) ||
					current.querySelector(`[data-wa-message-ids~="${safeId}"]`);
				if (anchor) {
					const nextTop = anchor.getBoundingClientRect().top;
					current.scrollTop += nextTop - pending.anchorOffset;
					return;
				}
			}
			const delta = current.scrollHeight - pending.previousHeight;
			current.scrollTop = pending.previousScrollTop + delta;
		};

		applyRestore();
		requestAnimationFrame(() => {
			applyRestore();
			olderScrollRestoreRef.current = null;
			// Block immediate re-trigger while still sitting near the top.
			suppressOlderLoadUntilRef.current = Date.now() + 900;
		});
	}, [loadingOlder, effectiveMessages.length, conversationId]);

	// Keep the thread glued to the bottom while media/layout grows on first open.
	useEffect(() => {
		const box = messageBoxRef.current;
		if (!box || !conversationId) return undefined;
		const keepBottom = () => {
			if (!pinThreadToBottomRef.current) return;
			if (loadingOlderRef.current || olderScrollRestoreRef.current) return;
			box.scrollTop = box.scrollHeight;
			setShowJumpToBottom(false);
		};
		const onMediaLoad = event => {
			if (event?.target?.tagName === 'IMG' || event?.target?.tagName === 'VIDEO') {
				keepBottom();
			}
		};
		box.addEventListener('load', onMediaLoad, true);
		let observer = null;
		if (typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(() => {
				keepBottom();
			});
			observer.observe(box);
			const thread = box.querySelector('.wa-message-thread');
			if (thread) observer.observe(thread);
		}
		keepBottom();
		return () => {
			box.removeEventListener('load', onMediaLoad, true);
			observer?.disconnect();
		};
	}, [conversationId, effectiveMessages.length, loadingMessages]);

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

	workspaceHandlersRef.current = {
		applyConversationPreview,
		loadAccounts,
		loadConversations,
		loadMessages,
		queryClient,
		scheduleReloadConversations,
		setConversationUnreadCount,
		updateCachedMessage,
		writeConversationMessages,
	};

	useEffect(() => {
		const token = localStorage.getItem('accessToken');
		if (!token) return;
		const socket = io(`${process.env.NEXT_PUBLIC_BASE_URL}/whatsapp`, {
			auth: { token },
			transports: ['websocket', 'polling'],
		});
		socketRef.current = socket;
		let hasConnectedOnce = false;
		const handlers = () => workspaceHandlersRef.current;
		const loadConversations = (...args) => handlers().loadConversations?.(...args);
		const loadMessages = (...args) => handlers().loadMessages?.(...args);
		const loadAccounts = (...args) => handlers().loadAccounts?.(...args);
		const applyConversationPreview = (...args) => handlers().applyConversationPreview?.(...args);
		const scheduleReloadConversations = (...args) =>
			handlers().scheduleReloadConversations?.(...args);
		const setConversationUnreadCount = (...args) =>
			handlers().setConversationUnreadCount?.(...args);
		const updateCachedMessage = (...args) => handlers().updateCachedMessage?.(...args);
		const writeConversationMessages = (...args) =>
			handlers().writeConversationMessages?.(...args);
		const queryClient = new Proxy(
			{},
			{
				get(_target, prop) {
					const client = handlers().queryClient;
					const value = client?.[prop];
					return typeof value === 'function' ? value.bind(client) : value;
				},
			},
		);
		const rewatchRooms = () => {
			// Any events missed while disconnected (WiFi blip, laptop sleep, server
			// restart) are gone for good — rejoining rooms alone does not replay them.
			const isReconnect = hasConnectedOnce;
			hasConnectedOnce = true;
			if (accountIdRef.current) socket.emit('whatsapp:account:watch', accountIdRef.current);
			const activeConversationId = conversationIdRef.current;
			if (activeConversationId && !isDemoId(activeConversationId)) {
				watchedConversationRef.current = activeConversationId;
				socket.emit('whatsapp:conversation:watch', activeConversationId);
			}
			if (isReconnect) {
				if (accountIdRef.current) {
					// Soft refresh: keep painted inbox; merge from Postgres (no force wipe).
					loadConversations(accountIdRef.current, 1, false, {
						force: false,
						background: true,
					}).catch(() => { });
				}
				if (activeConversationId && !isDemoId(activeConversationId)) {
					// Reconnect catch-up: refresh from Postgres only. New traffic
					// resumes via socket; do not re-hit WhatsApp Web getMessages.
					loadMessages(activeConversationId, true, { forceProvider: false }).catch(
						() => { },
					);
				}
			}
		};
		rewatchRooms();
		socket.on('connect', rewatchRooms);
		let accountsRefreshTimer;
		const refreshAccountsSoon = () => {
			if (accountsRefreshTimer) return;
			accountsRefreshTimer = setTimeout(() => {
				accountsRefreshTimer = null;
				loadAccounts().catch(() => { });
			}, 800);
		};
		socket.on('whatsapp:event', event => {
			// Defense in depth: conversation events now carry accountId too.
			const watchedAccountId = accountIdRef.current;
			if (event.accountId && watchedAccountId && event.accountId !== watchedAccountId) return;
			const activeConversationId = conversationIdRef.current;
			const eventConversationId = event.conversationId || event.payload?.conversationId;
			if (event.event === 'message' && eventConversationId) {
				const targetConversationId = eventConversationId;
				const previous = messagesCacheRef.current.get(targetConversationId);
				const incomingId = String(event.payload?.id || '');
				const incomingProviderId = String(event.payload?.providerMessageId || '');
				const alreadyKnown = (previous?.items || []).some(
					item =>
						(incomingId && item.id === incomingId) ||
						(incomingProviderId && item.providerMessageId === incomingProviderId),
				);
				// Keep the cache warm even for chats that are not open, so
				// reopening them shows the new message without a round trip.
				const nextCached = mergeMessages(
					previous?.items || [],
					[event.payload],
					targetConversationId,
				);
				messagesCacheRef.current.set(targetConversationId, {
					items: nextCached,
					hasMore: previous?.hasMore ?? true,
					cachedAt: Date.now(),
					providerHydratedAt: previous?.providerHydratedAt || Date.now(),
				});
				queryClient.setQueryData(whatsappKeys.messages(targetConversationId), {
					items: nextCached,
					hasMore: previous?.hasMore ?? true,
					cachedAt: Date.now(),
				});
				if (targetConversationId === activeConversationId) {
					const importantView =
						conversationFilterRef.current === 'important' ||
						conversationFilterRef.current === 'starred';
					if (!importantView || event.payload?.isStarred) {
						writeConversationMessages(targetConversationId, current =>
							mergeMessages(current, [event.payload], targetConversationId),
						);
					}
				}
				const viewingLiveThread =
					targetConversationId === activeConversationId &&
					isConversationWorkspaceTab(activeTabRef.current);
				if (viewingLiveThread) {
					setConversationUnreadCount(targetConversationId, 0);
					api
						.post(`/whatsapp/conversations/${targetConversationId}/read`)
						.then(() => notifyWhatsAppUnreadChanged())
						.catch(() => { });
				}
				const inbound =
					event.payload?.direction === 'inbound' ||
					event.payload?.fromMe === false;
				if (inbound && !alreadyKnown && !viewingLiveThread) {
					const peer = conversationsRef.current.find(
						item => item.id === targetConversationId,
					);
					if (!peer?.isMuted && (tabLeaderRef.current?.isLeader !== false)) {
						const title =
							conversationTitle(peer) ||
							event.payload?.contactName ||
							(locale === 'ar' ? 'رسالة واتساب' : 'WhatsApp');
						const body =
							String(event.payload?.text || '').trim() ||
							(event.payload?.type === 'image'
								? locale === 'ar'
									? 'صورة'
									: 'Photo'
								: event.payload?.type === 'ptt' || event.payload?.type === 'audio'
									? locale === 'ar'
										? 'رسالة صوتية'
										: 'Voice message'
									: locale === 'ar'
										? 'رسالة جديدة'
										: 'New message');
						showWhatsAppDesktopNotification({
							title,
							body,
							conversationId: targetConversationId,
							accountId: accountIdRef.current,
							locale,
						});
					}
				}
			}
			if (
				['schedule_created', 'schedule_updated', 'schedule_cancelled', 'schedule_run_completed'].includes(
					event.event,
				)
			) {
				const openId = conversationIdRef.current;
				if (openId) void loadMessageSchedulesRef.current?.(openId);
				return;
			}
			if (event.event === 'message_status' && eventConversationId) {
				const nextStatus = event.payload?.status;
				const applyAck = items => {
					if (!items.length) return items;
					const matched = items.map(message =>
						messageMatchesAckTarget(message, event.payload)
							? { ...message, status: preferWhatsAppAckStatus(message.status, nextStatus) }
							: message,
					);
					if (matched.some((message, index) => message !== items[index])) return matched;
					const pending = items.filter(
						message =>
							String(message?.direction || 'outbound').toLowerCase() !== 'inbound' &&
							(message.optimistic ||
								['pending', 'sent'].includes(String(message.status || ''))),
					);
					if (pending.length !== 1) return items;
					return items.map(message =>
						message === pending[0]
							? { ...message, status: preferWhatsAppAckStatus(message.status, nextStatus) }
							: message,
					);
				};
				const cached = messagesCacheRef.current.get(eventConversationId);
				if (cached) {
					messagesCacheRef.current.set(eventConversationId, {
						...cached,
						items: applyAck(cached.items),
						cachedAt: Date.now(),
					});
				}
				if (eventConversationId === activeConversationId) {
					writeConversationMessages(activeConversationId, applyAck);
				}
				setConversations(current =>
					current.map(conversation => {
						if (conversation.id !== eventConversationId) return conversation;
						const last = conversation.lastMessage;
						if (!last || !messageMatchesAckTarget(last, event.payload)) {
							return conversation;
						}
						return {
							...conversation,
							lastMessage: {
								...last,
								status: preferWhatsAppAckStatus(last.status, nextStatus),
							},
						};
					}),
				);
			}
			if (
				event.event === 'message_reactions' &&
				eventConversationId === activeConversationId
			) {
				updateCachedMessage(
					activeConversationId,
					event.payload.messageId || event.payload.providerMessageId,
					message => ({ ...message, reactions: event.payload.reactions || [] }),
				);
			}
			if (event.event === 'attachment_ready' && event.payload?.attachmentId) {
				const attachmentId = String(event.payload.attachmentId);
				forgetAttachmentBlob(attachmentId);
				const applyReady = items =>
					(items || []).map(message => {
						if (!message?.attachments?.length) return message;
						let changed = false;
						const attachments = message.attachments.map(item => {
							if (String(item?.id) !== attachmentId) return item;
							changed = true;
							return {
								...item,
								downloadStatus: 'downloaded',
								mimeType: event.payload.mimeType || item.mimeType,
							};
						});
						return changed ? { ...message, attachments } : message;
					});
				if (eventConversationId) {
					const cached = messagesCacheRef.current.get(eventConversationId);
					if (cached) {
						messagesCacheRef.current.set(eventConversationId, {
							...cached,
							items: applyReady(cached.items),
							cachedAt: Date.now(),
						});
					}
					if (eventConversationId === activeConversationId) {
						writeConversationMessages(eventConversationId, applyReady);
					}
				}
				window.dispatchEvent(
					new CustomEvent('wa-attachment-ready', {
						detail: {
							attachmentId,
							messageId: event.payload.messageId,
							cached: Boolean(event.payload.cached),
						},
					}),
				);
			}
			if (
				event.event === 'message_updated' &&
				eventConversationId === activeConversationId
			) {
				const changes = event.payload.changes || {};
				const importantView =
					conversationFilterRef.current === 'important' ||
					conversationFilterRef.current === 'starred';
				if (importantView && changes.isStarred === false) {
					writeConversationMessages(activeConversationId, current =>
						(current || []).filter(
							item =>
								item?.id !== event.payload.messageId &&
								item?.providerMessageId !== event.payload.messageId,
						),
					);
				} else {
					updateCachedMessage(
						activeConversationId,
						event.payload.messageId,
						message => ({ ...message, ...changes }),
					);
					if (importantView && changes.isStarred === true) {
						void loadMessagesRef.current?.(activeConversationId, false)?.catch?.(() => {});
					}
				}
			}
			if (event.event === 'conversation_updated' && event.payload?.preview && accountIdRef.current) {
				// Common case: a message arrived somewhere in this account — patch
				// just that conversation's preview/unread count in place. A chat
				// that is not in the list yet (first ever message) has nothing to
				// patch, so fall back to a reload to make it appear.
				const isKnownConversation = conversationsRef.current.some(
					item => item.id === event.payload.conversationId,
				);
				if (isKnownConversation) {
					applyConversationPreview(event.payload);
				} else {
					scheduleReloadConversations(accountIdRef.current);
				}
				notifyWhatsAppUnreadChanged();
			} else if (
				['conversation_updated', 'conversation_assignment'].includes(event.event) &&
				accountIdRef.current
			) {
				// Structural change (assignment, reconciliation with no specific
				// preview) — fall back to a full reload.
				scheduleReloadConversations(accountIdRef.current);
				notifyWhatsAppUnreadChanged();
			}
			if (event.event === 'conversation_read') {
				setConversationUnreadCount(
					eventConversationId || event.payload?.conversationId,
					0,
				);
				notifyWhatsAppUnreadChanged();
			}
			if (event.event === 'presence') {
				const targetId = eventConversationId || null;
				if (!targetId) return;
				const typing = Boolean(
					event.payload?.typing ||
						event.payload?.state === 'composing' ||
						event.payload?.state === 'recording',
				);
				const recording = Boolean(
					event.payload?.recording || event.payload?.state === 'recording',
				);
				const isOnline = Boolean(event.payload?.isOnline);
				const presence = {
					typing,
					recording,
					online: isOnline,
					state: event.payload?.state || 'unavailable',
					t: event.payload?.t || Date.now(),
				};
				setConversations(current =>
					current.map(item =>
						item.id === targetId
							? { ...item, isTyping: typing, typing, presence }
							: item,
					),
				);
				// Clear stuck "typing…" after a few seconds (WA Web clears quickly).
				if (typing) {
					const clearKey = `presence-ttl:${targetId}`;
					if (presenceTtlTimersRef.current[clearKey]) {
						window.clearTimeout(presenceTtlTimersRef.current[clearKey]);
					}
					presenceTtlTimersRef.current[clearKey] = window.setTimeout(() => {
						delete presenceTtlTimersRef.current[clearKey];
						setConversations(current =>
							current.map(item => {
								if (item.id !== targetId) return item;
								if (!item.isTyping && !item.typing && !item.presence?.typing) {
									return item;
								}
								return {
									...item,
									isTyping: false,
									typing: false,
									presence: {
										...(item.presence || {}),
										typing: false,
										recording: false,
										online: Boolean(item.presence?.online),
										state: item.presence?.online ? 'available' : 'unavailable',
										t: Date.now(),
									},
								};
							}),
						);
					}, 8000);
				}
			}
			if (event.event === 'statuses_updated' && accountIdRef.current) {
				void refreshStatusesFromProviderRef.current?.(accountIdRef.current, {
					silent: true,
					force: true,
				});
			}
			if (event.event === 'qr') {
				const nextQr = event.payload?.qr || null;
				setQr(nextQr);
				setQrExpired(!nextQr);
				if (nextQr && linkModeRef.current !== 'phone') setLinkMode('qr');
			}
			if (event.event === 'sync_started') {
				const backgroundHydrate =
					event.payload?.background === true ||
					event.payload?.source === 'history_sync' ||
					event.payload?.stage === 'hydrating';
				if (backgroundHydrate && (conversationsRef.current || []).length > 0) {
					setSyncStage(String(event.payload?.stage || 'hydrating'));
				} else {
					setSyncPhoneClosed(false);
					setSyncingInbox(true);
					setSyncStage(String(event.payload?.stage || 'starting'));
					setSyncProgress(prev =>
						Math.max(prev, Number(event.payload?.progress) || 10),
					);
				}
			}
			if (event.event === 'sync_progress') {
				const backgroundHydrate =
					event.payload?.background === true ||
					event.payload?.source === 'history_sync' ||
					event.payload?.stage === 'hydrating';
				if (backgroundHydrate && (conversationsRef.current || []).length > 0) {
					if (event.payload?.stage) setSyncStage(String(event.payload.stage));
				} else {
					setSyncPhoneClosed(false);
					setSyncingInbox(true);
					if (event.payload?.stage) {
						setSyncStage(String(event.payload.stage));
					}
					setSyncProgress(prev =>
						Math.max(prev, Number(event.payload?.progress) || prev || 20),
					);
				}
			}
			if (['sync_completed', 'sync_failed'].includes(event.event)) {
				const isManualSync = event.payload?.stage === 'manual';
				const backgroundHydrate =
					event.payload?.background === true ||
					event.payload?.source === 'history_sync';
				const phoneClosedFail =
					event.event === 'sync_failed' && event.payload?.reason === 'phone_closed';
				// Manual sync UI state is owned by syncAccount(); clearing here races
				// auto-resync when the list is still empty mid-reload.
				if (!isManualSync) {
					if (phoneClosedFail) {
						setSyncPhoneClosed(true);
						setSyncingInbox(true);
						setSyncProgress(0);
					} else {
						setSyncPhoneClosed(false);
						setSyncingInbox(false);
						setSyncProgress(event.event === 'sync_completed' ? 100 : 0);
						setSyncStage('');
					}
				} else if (event.event === 'sync_completed') {
					setSyncPhoneClosed(false);
					setSyncProgress(100);
					setSyncStage('');
				}
				// Manual sync already force-reloads inside syncAccount(). A second
				// force reload here cancels that in-flight GET and can leave the
				// list empty (or toast "no chats") even when sync succeeded.
				if (accountIdRef.current && !isManualSync && event.event === 'sync_completed') {
					void loadConversations(accountIdRef.current, 1, false, {
						force: !backgroundHydrate,
						background: backgroundHydrate,
					}).catch(() => { });
					if (!backgroundHydrate) {
						const openId = conversationIdRef.current;
						if (openId && !isDemoId(openId)) {
							void loadMessagesRef.current?.(openId, false)?.catch?.(() => { });
						}
					}
				}
				if (event.event === 'sync_failed' && !isManualSync && !phoneClosedFail) {
					const message = String(event.payload?.message || '');
					if (
						!/not ready|not connected|listChats|syncing|chat store|linked session|waiting for|cooling down|timed out|retry automatically/i.test(
							message,
						)
					) {
						toast.error(message || 'WhatsApp sync failed');
					}
				}
			}
			if (event.event === 'session_invalid') {
				setQr(null);
				setPairingCode(null);
				toast.error(
					event.payload?.message ||
					'WhatsApp unlinked this device. Scan the QR code again to reconnect.',
					{ duration: 10000 },
				);
				loadAccounts().catch(() => { });
			}
			if (['connection', 'connection_error'].includes(event.event)) {
				const status = event.payload?.status || event.payload?.event?.status;
				const reason = String(event.payload?.reason || '');
				if (syncingInboxRef.current && status && status !== 'connected') {
					if (reason === 'phone_closed') {
						setSyncPhoneClosed(true);
						setSyncingInbox(true);
						setSyncProgress(0);
					}
				}
				if (status === 'connected') {
					setSyncPhoneClosed(false);
					setQr(null);
					setPairingCode(null);
					providerHistorySyncBlockedUntilRef.current = 0;
					const activeConversationId = conversationIdRef.current;
					if (
						activeConversationId &&
						!isDemoId(activeConversationId) &&
						messageHistoryRetryRef.current.attempts > 0
					) {
						messageHistoryRetryRef.current.attempts = 0;
						if (messageHistoryRetryRef.current.timer) {
							clearTimeout(messageHistoryRetryRef.current.timer);
							messageHistoryRetryRef.current.timer = null;
						}
						// Reconnect catch-up is loadMessages(forceProvider: false) below.
					}
				}
				refreshAccountsSoon();
				if (status === 'connected' && accountIdRef.current) {
					loadConversations(accountIdRef.current, 1, false, { force: true }).catch(() => { });
					const activeConversationId = conversationIdRef.current;
					if (activeConversationId && !isDemoId(activeConversationId)) {
						// Soft reopen: keep warm message cache; DB catch-up only
						// (forceProvider false). Avoid clearing cache → sync storm.
						loadMessages(activeConversationId, true, { forceProvider: false }).catch(
							() => { },
						);
					}
				}
			}
		});
		return () => {
			if (accountsRefreshTimer) clearTimeout(accountsRefreshTimer);
			if (reloadConversationsTimer.current) clearTimeout(reloadConversationsTimer.current);
			socketRef.current = null;
			watchedConversationRef.current = null;
			watchedAccountRef.current = null;
			socket.disconnect();
		};
	}, []);

	useEffect(() => {
		const socket = socketRef.current;
		if (!socket) return;
		if (watchedAccountRef.current && watchedAccountRef.current !== accountId) {
			socket.emit('whatsapp:account:unwatch', watchedAccountRef.current);
		}
		watchedAccountRef.current = accountId || null;
		if (accountId) {
			socket.emit('whatsapp:account:watch', accountId);
		}
	}, [accountId]);

	useEffect(() => {
		const id = selectedAccount?.id;
		const status = selectedAccount?.status;
		if (!id || !['connecting', 'qr_pending', 'disconnected', 'error'].includes(status)) {
			return undefined;
		}
		const poll = setInterval(async () => {
			try {
				const { data } = await api.get(`/whatsapp/accounts/${id}/qr`);
				if (data.qr) {
					setQr(data.qr);
					setQrExpired(false);
					if (linkModeRef.current !== 'phone') setLinkMode('qr');
				} else if (data.pairingCode) {
					setPairingCode(data.pairingCode);
					setLinkMode('phone');
					setQrExpired(false);
				} else {
					// QR refs often expire — keep a stable "expired" state instead of
					// flashing blank then reconnect CTA.
					setQr(current => {
						if (current) {
							window.setTimeout(() => setQrExpired(true), 0);
						}
						return null;
					});
				}
				if (data.status && data.status !== status) {
					await loadAccounts();
				}
			} catch { /* ignore transient QR poll errors */ }
		}, 2500);
		return () => clearInterval(poll);
	}, [selectedAccount?.id, selectedAccount?.status, loadAccounts]);

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
			selectWhatsAppAccount(data.id);
			toast.success('WhatsApp account created');
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not create account');
		} finally {
			setAccountBusy(false);
		}
	};

	const connectAccount = async (phoneNumber, options = {}) => {
		if (!accountId) return;
		const force = Boolean(options.force);
		const switchingMode = Boolean(phoneNumber) || options.mode === 'qr';
		const status = selectedAccount?.status;
		const updatedAt = selectedAccount?.updatedAt || selectedAccount?.updated_at;
		const statusAgeMs = updatedAt
			? Date.now() - new Date(updatedAt).getTime()
			: Number.POSITIVE_INFINITY;
		const stuckConnecting =
			['connecting', 'qr_pending'].includes(status) && statusAgeMs > 90_000;
		const willResetSession = force || stuckConnecting || status === 'error';

		if (!force && !switchingMode && status === 'connected') {
			toast.success(t.sessionLinkedHint);
			return;
		}
		if (
			!force &&
			!switchingMode &&
			!stuckConnecting &&
			['connecting', 'qr_pending'].includes(status)
		) {
			return;
		}

		setAccountBusy(true);
		if (willResetSession || switchingMode) {
			setQr(null);
			setPairingCode(null);
		}
		try {
			// Clear a stuck in-memory session before starting a fresh connect.
			if (willResetSession) {
				await api
					.post(`/whatsapp/accounts/${accountId}/disconnect`)
					.catch(() => undefined);
			}
			const { data } = await api.post(
				`/whatsapp/accounts/${accountId}/connect`,
				phoneNumber
					? { phoneNumber }
					: options.mode === 'qr'
						? { mode: 'qr' }
						: {},
			);
			if (data.qr) {
				setQr(data.qr);
				setLinkMode('qr');
			}
			if (data.pairingCode) {
				setPairingCode(data.pairingCode);
				setLinkMode('phone');
			}
			await loadAccounts();
			if (data.status === 'connected') {
				toast.success(t.connectStarted);
			} else if (data.pairingCode) {
				toast.success(t.pairingCodeReady || 'Enter this code on your phone');
			} else if (data.qr) {
				toast.success(t.qrPending || 'Scan the QR code');
			} else if (willResetSession || switchingMode) {
				toast.success(t.connectStillSyncing || t.syncingPhone);
			}
		} catch (error) {
			toast.error(
				Array.isArray(error.response?.data?.message)
					? error.response.data.message.join(', ')
					: error.response?.data?.message || 'Could not start WhatsApp provider',
			);
			await loadAccounts().catch(() => { });
		} finally {
			setAccountBusy(false);
		}
	};

	// After refresh (or session drop), bootstrap any non-connected account:
	// restore from saved tokens when possible, otherwise surface a QR code.
	useEffect(() => {
		if (!selectedAccount) return;
		if (selectedAccount.status === 'connected') {
			setSessionProbeDone(true);
			return;
		}
		if (!canManageWhatsApp) {
			setSessionProbeDone(true);
			return;
		}
		const { id, status } = selectedAccount;
		if (
			![
				'connecting',
				'qr_pending',
				'disconnected',
				'error',
			].includes(status)
		) {
			setSessionProbeDone(true);
			return;
		}
		if (autoConnectAttemptedRef.current && autoConnectAttemptedRef.current !== id) {
			autoConnectAttemptedRef.current = null;
		}
		if (autoConnectAttemptedRef.current === id) {
			setSessionProbeDone(true);
			return;
		}
		autoConnectAttemptedRef.current = id;

		const bootstrapSession = async () => {
			try {
				const { data: qrData } = await api.get(`/whatsapp/accounts/${id}/qr`);
				if (qrData.qr) {
					setQr(qrData.qr);
					setQrExpired(false);
					if (linkModeRef.current !== 'phone') setLinkMode('qr');
				}
				if (qrData.pairingCode) {
					setPairingCode(qrData.pairingCode);
					setLinkMode('phone');
					setQrExpired(false);
				}
				if (qrData.status === 'connected') {
					await loadAccounts();
					return;
				}
				if (qrData.qr || qrData.pairingCode) {
					await loadAccounts();
					return;
				}
				if (['connecting', 'qr_pending'].includes(status)) {
					return;
				}
				const hadSession = Boolean(
					selectedAccount.lastConnectedAt ||
						selectedAccount.initialHydratedAt ||
						selectedAccount.phoneNumber,
				);
				if (!hadSession || linkModeRef.current === 'phone') {
					return;
				}
				const { data } = await api.post(`/whatsapp/accounts/${id}/connect`, {});
				if (data.qr) {
					setQr(data.qr);
					setLinkMode('qr');
					setQrExpired(false);
				}
				if (data.pairingCode) {
					setPairingCode(data.pairingCode);
					setLinkMode('phone');
					setQrExpired(false);
				}
				await loadAccounts();
			} catch {
				await loadAccounts().catch(() => { });
			} finally {
				if (accountIdRef.current === id) setSessionProbeDone(true);
			}
		};
		void bootstrapSession();
		// Intentionally only re-run when the selected account/status changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedAccount?.id, selectedAccount?.status, canManageWhatsApp]);

	// First visit with zero accounts: create a default-named account and start QR linking.
	useEffect(() => {
		if (bootStatus !== 'success' || !isAdmin || accountBusy) return;
		if (accounts.length > 0) return;
		if (autoCreateAccountAttemptedRef.current) return;
		autoCreateAccountAttemptedRef.current = true;
		const ensureDefaultAccount = async () => {
			setAccountBusy(true);
			try {
				const { data } = await api.post('/whatsapp/accounts', {
					label: t.defaultAccountLabel,
				});
				await loadAccounts();
				if (data?.id) {
					selectWhatsAppAccount(data.id);
					setActiveTab('accounts');
					setLinkMode(null);
					setQr(null);
					setPairingCode(null);
					await loadAccounts();
				}
			} catch (error) {
				toast.error(error.response?.data?.message || 'Could not create WhatsApp account');
			} finally {
				setAccountBusy(false);
			}
		};
		void ensureDefaultAccount();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bootStatus, accounts.length, isAdmin]);

	const disconnectAccount = async logout => {
		if (!accountId) return;
		setAccountBusy(true);
		try {
			await api.post(`/whatsapp/accounts/${accountId}/${logout ? 'logout' : 'disconnect'}`);
			setQr(null);
			setPairingCode(null);
			setLinkMode(null);
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
			clearStoredWhatsAppAccountId(targetAccountId, currentUserId);
			setConversationId(null);
			setConversations([]);
			clearConversationMessages(null);
			setStatuses([]);
			setSelectedStatus(null);
			setStatusMediaUrl(null);
			setQr(null);
			setPairingCode(null);
			autoConnectAttemptedRef.current = null;
			const remaining = await loadAccounts();
			const stillEmpty = !Array.isArray(remaining) || remaining.length === 0;
			// Last account gone → create a clean blank one so the user can scan
			// immediately without a refresh resurrecting a zombie session.
			if (stillEmpty && isAdmin) {
				autoCreateAccountAttemptedRef.current = true;
				const { data } = await api.post('/whatsapp/accounts', {
					label: t.defaultAccountLabel,
				});
				await loadAccounts();
				if (data?.id) {
					selectWhatsAppAccount(data.id);
					setActiveTab('accounts');
					setLinkMode(null);
					setQr(null);
					setPairingCode(null);
					await loadAccounts();
				}
				toast.success(t.accountDeletedFreshReady);
			} else {
				autoCreateAccountAttemptedRef.current = false;
				toast.success(t.accountDeleted);
			}
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not delete WhatsApp account');
		} finally {
			setAccountBusy(false);
		}
	};

	const syncAccount = async (silent = false) => {
		if (!accountId) return;
		if (!silent) setAccountBusy(true);
		setSyncPhoneClosed(false);
		setSyncingInbox(true);
		setSyncStage('manual');
		setSyncProgress(15);
		let keepPhoneGate = false;
		try {
			// Chats first — this is what fixes inbox order. Contacts are optional/heavy.
			setSyncProgress(20);
			const { data: syncResult } = await api.post(
				`/whatsapp/accounts/${accountId}/sync/chats`,
				null,
				{ timeout: 300000 },
			);
			setSyncProgress(90);
			setSyncStage('saving');
			await resetConversationsCache(accountId);
			const listed = await loadConversations(accountId, 1, false, { force: true });
			setSyncProgress(100);
			void api.post(`/whatsapp/accounts/${accountId}/sync/contacts`).catch(() => null);
			const syncCount = Number(syncResult?.count) || 0;
			const listedCount = listed?.cancelled
				? conversationsRef.current.length
				: listed?.items?.length || listed?.total || 0;
			if (!listed?.cancelled && syncCount === 0 && listedCount === 0) {
				// Quiet while ChatStore is still hydrating after link — auto-retry later.
				if (!silent) {
					toast.error(
						'WhatsApp returned no chats. The session may still be syncing — try Sync again shortly.',
					);
				} else {
					syncCooldownUntilRef.current = Date.now() + 15_000;
				}
			} else if (!silent) {
				toast.success('WhatsApp data synchronized');
			}
		} catch (error) {
			setSyncProgress(0);
			setSyncStage('');
			const message =
				error.response?.data?.message || error?.message || 'Synchronization failed';
			const softFailure =
				/not ready|waiting for the linked|linked session|still syncing|chat store|listChats|cooling down|timed out|timeout of/i.test(
					String(message),
				);
			const phoneHint =
				/timeout of|timed out|phone|open WhatsApp|هاتف|واتساب/i.test(String(message));
			if (phoneHint) {
				keepPhoneGate = true;
				setSyncPhoneClosed(true);
				setSyncingInbox(true);
			}
			syncCooldownUntilRef.current = Date.now() + (softFailure ? 15_000 : 60_000);
			// Silent auto-sync must not spam toasts while WA Web ChatStore hydrates.
			if ((!silent || !softFailure) && !phoneHint) {
				toast.error(Array.isArray(message) ? message.join(', ') : message);
			}
			await loadAccounts().catch(() => { });
		} finally {
			if (!keepPhoneGate) {
				setSyncingInbox(false);
				setSyncStage('');
				setSyncPhoneClosed(false);
			}
			if (!silent) setAccountBusy(false);
		}
	};

	useEffect(() => {
		if (activeTab !== 'chats' || !accountId || !selectedAccount) return undefined;
		if (selectedAccount.status !== 'connected') return undefined;
		if (!canUseWhatsApp) return undefined;
		if (conversations.length > 0 || syncingInbox || accountBusy) return undefined;
		if (autoInboxSyncAttemptedRef.current === accountId) return undefined;
		try {
			const key = `wa-sync-leader:${accountId}`;
			const now = Date.now();
			const prev = Number(window.localStorage.getItem(key) || 0);
			if (now - prev < 15_000) {
				autoInboxSyncAttemptedRef.current = accountId;
				return undefined;
			}
			window.localStorage.setItem(key, String(now));
		} catch {
			/* private mode / blocked storage */
		}
		autoInboxSyncAttemptedRef.current = accountId;
		const timer = window.setTimeout(() => {
			if (conversationsRef.current.length > 0 || syncingInboxRef.current) return;
			// One shot only. Backend bootstrap + history debounce own the rest.
			syncAccount(true).catch(() => { });
		}, 800);
		return () => window.clearTimeout(timer);
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
		if (!['chats', 'statuses'].includes(activeTab) || !accountId) return;
		void loadStatuses(accountId, { silent: true });
	}, [activeTab, accountId, loadStatuses]);

	// Clear a stuck sync bar if backend never finishes.
	useEffect(() => {
		if (!syncingInbox || syncPhoneClosed) return undefined;
		const timer = setTimeout(() => {
			setSyncingInbox(false);
			setSyncProgress(0);
			setSyncPhoneClosed(false);
		}, 300000);
		return () => clearTimeout(timer);
	}, [syncingInbox, syncPhoneClosed]);

	const sendMessage = async event => {
		event.preventDefault();
		if (recordingVoice) {
			stopVoiceRecording(true);
			return;
		}
		if (composerImages.length) {
			if (!conversationId || sending) return;
			const targetConversationId = conversationId;
			const imagesToSend = [...composerImages];
			const caption = draft.trim();
			const replySnapshot = replyingTo;

			// Drop composer staging immediately — WhatsApp shows the bubble in-thread first.
			composerImagesRef.current = [];
			setComposerImages([]);
			setDraft('');
			setReplyingTo(null);

			for (let index = 0; index < imagesToSend.length; index += 1) {
				const item = imagesToSend[index];
				const clientMessageId = newClientMessageId();
				const imageCaption = index === 0 ? caption : '';
				const imageReply = index === 0 ? replySnapshot : null;
				const optimisticMessage = buildOptimisticMediaMessage({
					conversationId: targetConversationId,
					clientMessageId,
					type: 'image',
					file: item.file,
					previewUrl: item.previewUrl,
					caption: imageCaption,
					replySnapshot: imageReply,
				});
				persistConversationMessages(targetConversationId, current =>
					mergeMessages(current, [optimisticMessage], targetConversationId),
				);

				const sent = await sendFile(item.file, 'image', {
					conversationId: targetConversationId,
					clientMessageId,
					caption: imageCaption,
					replySnapshot: imageReply,
					optimisticMessage,
				});
				if (!sent) {
					const remaining = imagesToSend.slice(index).map((entry, offset) => {
						if (offset === 0) {
							// Failed send revoked the blob preview — rebuild for re-attach.
							return {
								...entry,
								previewUrl: URL.createObjectURL(entry.file),
							};
						}
						return entry;
					});
					composerImagesRef.current = remaining;
					setComposerImages(remaining);
					if (caption) setDraft(current => current || caption);
					if (replySnapshot) setReplyingTo(current => current || replySnapshot);
					return;
				}
			}
			return;
		}
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
			writeConversationMessages(targetConversationId, current =>
				mergeMessages(current, [optimisticMessage], targetConversationId),
			);
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
				clientMessageId,
				replyTo: data.message?.replyTo || replySnapshot || null,
			};
			const currentCache = messagesCacheRef.current.get(targetConversationId);
			const cachedMessages = mergeMessages(currentCache?.items || [], [confirmedMessage], targetConversationId);
			messagesCacheRef.current.set(targetConversationId, {
				items: cachedMessages,
				hasMore: currentCache?.hasMore ?? true,
				cachedAt: Date.now(),
			});
			if (conversationIdRef.current === targetConversationId) {
				writeConversationMessages(targetConversationId, current =>
					mergeMessages(current, [confirmedMessage], targetConversationId),
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
				writeConversationMessages(targetConversationId, current =>
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

	const persistConversationMessages = (targetConversationId, updater) => {
		const previous = messagesCacheRef.current.get(targetConversationId);
		const nextItems = updater(previous?.items || []);
		messagesCacheRef.current.set(targetConversationId, {
			...previous,
			items: nextItems,
			hasMore: previous?.hasMore ?? true,
			cachedAt: Date.now(),
		});
		void writeCachedMessagePage(targetConversationId, { items: nextItems });
		if (conversationIdRef.current === targetConversationId) {
			writeConversationMessages(targetConversationId, () => nextItems);
		}
		const last = nextItems[nextItems.length - 1];
		if (!last) return;
		setConversations(current =>
			current.map(conversation => {
				if (conversation.id !== targetConversationId) return conversation;
				return {
					...conversation,
					lastMessageAt: last.providerTimestamp || conversation.lastMessageAt,
					unreadCount:
						String(last.direction || '').toLowerCase() === 'outbound'
							? 0
							: conversation.unreadCount,
					lastMessage: {
						id: last.id,
						clientMessageId: last.clientMessageId,
						providerMessageId: last.providerMessageId,
						text: last.text,
						type: last.type,
						direction: last.direction,
						status: last.status,
						providerTimestamp: last.providerTimestamp,
					},
				};
			}),
		);
	};

	const sendFile = async (file, forcedType, options = {}) => {
		if (!file || !accountId) return false;
		const targetConversationId = options.conversationId || conversationId;
		if (!targetConversationId) return false;
		if (demo.settings.enabled) {
			toast.error(
				locale === 'ar'
					? 'الوسائط التجريبية مؤجلة حالياً. لم يتم إرسال أي شيء إلى واتساب.'
					: 'Demo media is deferred. Nothing was sent to WhatsApp.',
			);
			if (fileRef.current) fileRef.current.value = '';
			return false;
		}
		if (file.size > 25 * 1024 * 1024) {
			toast.error('File size must not exceed 25 MB');
			if (fileRef.current) fileRef.current.value = '';
			if (options.optimisticMessage) {
				releaseOptimisticMediaPreview(options.optimisticMessage);
				persistConversationMessages(targetConversationId, current =>
					current.filter(message => message.id !== options.optimisticMessage.id),
				);
			}
			return false;
		}
		const targetAccountId = accountId;
		const type = outgoingMediaType(file, forcedType);
		const caption =
			type === 'sticker'
				? ''
				: options.caption !== undefined
					? options.caption
					: draft.trim();
		const replySnapshot =
			options.replySnapshot !== undefined ? options.replySnapshot : replyingTo;
		const clientMessageId = options.clientMessageId || newClientMessageId();
		let optimisticMessage = options.optimisticMessage || null;
		let uploadedFileId = null;
		const ownsOptimisticPreview = !options.optimisticMessage;

		// Show in-chat bubble with clock immediately (text already does this).
		if (!optimisticMessage) {
			const mediaType = isOptimisticVoiceType(type)
				? type === 'audio'
					? 'audio'
					: 'voice'
				: type;
			optimisticMessage = buildOptimisticMediaMessage({
				conversationId: targetConversationId,
				clientMessageId,
				type: mediaType,
				file,
				previewUrl: URL.createObjectURL(file),
				caption: caption || '',
				replySnapshot,
			});
			persistConversationMessages(targetConversationId, current =>
				mergeMessages(current, [optimisticMessage], targetConversationId),
			);
			if (conversationIdRef.current === targetConversationId) {
				setReplyingTo(null);
			}
		}

		setSending(true);
		setUploadProgress(0);
		try {
			let outgoingFile = file;
			if (type === 'image') {
				outgoingFile = await compressImageForWhatsApp(file);
			}
			const form = new FormData();
			form.append('file', outgoingFile);
			const { data: uploaded } = await api.post(
				`/whatsapp/accounts/${targetAccountId}/media`,
				form,
				{
					maxBodyLength: Infinity,
					maxContentLength: Infinity,
					onUploadProgress: event => {
						if (!event?.total) return;
						const pct = Math.round((event.loaded / event.total) * 100);
						setUploadProgress(Math.min(99, Math.max(0, pct)));
					},
				},
			);
			uploadedFileId = uploaded.fileId;
			setUploadProgress(100);
			const { data } = await api.post(`/whatsapp/conversations/${targetConversationId}/messages`, {
				type,
				fileId: uploaded.fileId,
				caption: caption || undefined,
				clientMessageId,
				quotedProviderMessageId: replySnapshot?.providerMessageId || undefined,
			});
			uploadedFileId = null;
			const confirmedMessage = {
				...data.message,
				clientMessageId,
				replyTo: data.message?.replyTo || replySnapshot || null,
			};
			persistConversationMessages(targetConversationId, current =>
				mergeMessages(current, [confirmedMessage], targetConversationId),
			);
			if (optimisticMessage) releaseOptimisticMediaPreview(optimisticMessage);
			if (conversationIdRef.current === targetConversationId && !isOptimisticVoiceType(type)) {
				setDraft(current => (current.trim() === caption ? '' : current));
				setReplyingTo(null);
			}
			return true;
		} catch (error) {
			if (uploadedFileId) {
				void api
					.delete(`/whatsapp/accounts/${targetAccountId}/media`, {
						data: { fileId: uploadedFileId },
					})
					.catch(() => { });
			}
			if (optimisticMessage) {
				releaseOptimisticMediaPreview(optimisticMessage);
				persistConversationMessages(targetConversationId, current =>
					current.filter(message => message.id !== optimisticMessage.id),
				);
				if (conversationIdRef.current === targetConversationId && ownsOptimisticPreview) {
					setReplyingTo(current => current || replySnapshot);
				}
			}
			toast.error(mediaUploadFailedMessage(error, locale));
			return false;
		} finally {
			setSending(false);
			setUploadProgress(null);
			if (fileRef.current) fileRef.current.value = '';
		}
	};

	const queueComposerImages = files => {
		const current = composerImagesRef.current;
		const next = [...current];
		for (const file of files) {
			if (file.size > 25 * 1024 * 1024) {
				toast.error('File size must not exceed 25 MB');
				continue;
			}
			if (next.some(item => item.file.size === file.size && item.file.type === file.type)) {
				continue;
			}
			if (next.length >= 10) {
				toast.error(locale === 'ar' ? 'يمكن إرفاق 10 صور كحد أقصى' : 'You can attach up to 10 images');
				break;
			}
			next.push({
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				file,
				previewUrl: URL.createObjectURL(file),
			});
		}
		if (next.length === current.length) return;
		composerImagesRef.current = next;
		setComposerImages(next);
	};

	const removeComposerImage = id => {
		setComposerImages(current => {
			const target = current.find(item => item.id === id);
			if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
			return current.filter(item => item.id !== id);
		});
	};

	const handleComposerPaste = event => {
		if (event.defaultPrevented || !conversationId || sending || recordingVoice) return;
		const files = clipboardImageFiles(event);
		if (!files.length) return;
		event.preventDefault();
		event.stopPropagation();
		queueComposerImages(files);
	};

	const sendRecordedVoice = async file => {
		if (!file || !conversationId || !accountId) return false;
		if (file.size > 25 * 1024 * 1024) {
			toast.error('File size must not exceed 25 MB');
			return false;
		}
		const targetConversationId = conversationId;
		const replySnapshot = replyingTo;
		const clientMessageId = newClientMessageId();
		const optimisticMessage = buildOptimisticMediaMessage({
			conversationId: targetConversationId,
			clientMessageId,
			type: 'voice',
			file,
			previewUrl: URL.createObjectURL(file),
			replySnapshot,
		});
		persistConversationMessages(targetConversationId, current =>
			mergeMessages(current, [optimisticMessage], targetConversationId),
		);
		if (conversationIdRef.current === targetConversationId) {
			setReplyingTo(null);
		}

		const settings = voiceChangerSettingsRef.current;
		const provider = String(settings?.provider || 'off');
		const useChanger = Boolean(settings?.enabled) && provider !== 'off';
		const catalogItem = settings?.catalog?.find(item => item.id === provider);
		if (useChanger && catalogItem?.needsKey && !settings?.credentials?.[provider]?.configured) {
			toast.error(
				locale === 'ar'
					? 'احفظ مفتاح الـ API أولاً من إعدادات تغيير الصوت.'
					: 'Save an API key first from voice changer settings.',
			);
			return false;
		}
		let outgoing = file;
		if (useChanger) {
			setVoiceChanging(true);
			toast.loading(t.voiceChanging, { id: 'whatsapp-voice-changer' });
			try {
				outgoing = await transformVoiceNote(file, {
					provider: settings.provider,
					preset: settings.preset,
					pitchSemitones: settings.pitchSemitones,
					voiceId: settings.voiceId,
				});
				toast.dismiss('whatsapp-voice-changer');
			} catch (error) {
				releaseOptimisticMediaPreview(optimisticMessage);
				persistConversationMessages(targetConversationId, current =>
					current.filter(message => message.id !== optimisticMessage.id),
				);
				if (conversationIdRef.current === targetConversationId) {
					setReplyingTo(current => current || replySnapshot);
				}
				toast.error((await readVoiceChangerError(error, locale)) || t.voiceChanging, {
					id: 'whatsapp-voice-changer',
				});
				return false;
			} finally {
				setVoiceChanging(false);
			}
		}

		return sendFile(outgoing, 'voice', {
			clientMessageId,
			optimisticMessage,
			conversationId: targetConversationId,
			replySnapshot,
			caption: '',
		});
	};

	const collectDownloadableAttachments = useCallback((messageList = []) => {
		const items = [];
		for (const message of messageList) {
			for (const attachment of message?.attachments || []) {
				const id = String(attachment?.id || '');
				if (!id) continue;
				const demoAttachment = Boolean(attachment?.demoAttachment || isDemoId(id));
				if (!demoAttachment && !isPersistedAttachmentId(id)) continue;
				items.push({
					id,
					fileName: attachment.fileName || `attachment-${id.slice(0, 8)}`,
					mimeType: attachment.mimeType,
					type: attachment.type,
					demoAttachment,
					messageId: message.id,
				});
			}
		}
		return items;
	}, []);

	const downloadSelectedMedia = useCallback(async () => {
		const selected = [...selectedMediaIds];
		if (!selected.length || downloadingSelectedMedia) return;
		const catalog = collectDownloadableAttachments(effectiveMessages);
		const byId = new Map(catalog.map(item => [item.id, item]));
		setDownloadingSelectedMedia(true);
		const loadingToast = toast.loading(t.downloadingSelectedMedia);
		let ok = 0;
		let failed = 0;
		const usedNames = new Set();
		const uniqueName = fileName => {
			const raw = String(fileName || 'file').replace(/[\\/:*?"<>|]/g, '_').trim() || 'file';
			if (!usedNames.has(raw)) {
				usedNames.add(raw);
				return raw;
			}
			const dot = raw.lastIndexOf('.');
			const base = dot > 0 ? raw.slice(0, dot) : raw;
			const ext = dot > 0 ? raw.slice(dot) : '';
			let index = 2;
			let next = `${base} (${index})${ext}`;
			while (usedNames.has(next)) {
				index += 1;
				next = `${base} (${index})${ext}`;
			}
			usedNames.add(next);
			return next;
		};

		try {
			const entries = [];
			for (const id of selected) {
				const meta = byId.get(id);
				try {
					const blob = meta?.demoAttachment
						? await demoApi.getMedia(rawDemoId(id))
						: await requestAttachmentBlob(id, { timeout: 90_000, priority: true });
					if (!blob || blob.size < 8) throw new Error('empty');
					entries.push({
						name: uniqueName(meta?.fileName || `whatsapp-${id.slice(0, 8)}`),
						blob,
					});
					ok += 1;
				} catch {
					failed += 1;
				}
			}

			if (!entries.length) {
				toast.error(t.selectedMediaZipEmpty, { id: loadingToast });
				return;
			}

			// Single file: keep a normal download. Multiple: one zip.
			if (entries.length === 1) {
				const objectUrl = URL.createObjectURL(entries[0].blob);
				const anchor = document.createElement('a');
				anchor.href = objectUrl;
				anchor.download = entries[0].name;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			} else {
				const JSZip = (await import('jszip')).default;
				const zip = new JSZip();
				for (const entry of entries) {
					zip.file(entry.name, entry.blob);
				}
				const zipBlob = await zip.generateAsync({
					type: 'blob',
					compression: 'DEFLATE',
					compressionOptions: { level: 6 },
				});
				const stamp = new Date().toISOString().slice(0, 10);
				const chatLabel = String(selectedChatTitle || t.selectedMediaZipName)
					.replace(/[\\/:*?"<>|]+/g, ' ')
					.trim()
					.slice(0, 40);
				const zipName = `${chatLabel || t.selectedMediaZipName}-${stamp}.zip`;
				const objectUrl = URL.createObjectURL(zipBlob);
				const anchor = document.createElement('a');
				anchor.href = objectUrl;
				anchor.download = zipName;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			}

			if (failed === 0) {
				toast.success(t.selectedMediaDownloaded.replace('{count}', String(ok)), {
					id: loadingToast,
				});
				setMediaSelectMode(false);
				setSelectedMediaIds(new Set());
			} else {
				toast.error(
					t.selectedMediaPartialFail
						.replace('{ok}', String(ok))
						.replace('{failed}', String(failed)),
					{ id: loadingToast },
				);
			}
		} catch {
			toast.error(t.selectedMediaZipEmpty, { id: loadingToast });
		} finally {
			setDownloadingSelectedMedia(false);
		}
	}, [
		collectDownloadableAttachments,
		downloadingSelectedMedia,
		effectiveMessages,
		selectedChatTitle,
		selectedMediaIds,
		t.downloadingSelectedMedia,
		t.selectedMediaDownloaded,
		t.selectedMediaPartialFail,
		t.selectedMediaZipEmpty,
		t.selectedMediaZipName,
	]);

	useEffect(() => {
		setMediaSelectMode(false);
		setSelectedMediaIds(new Set());
		setDownloadingSelectedMedia(false);
		setTicketSelectMode(false);
		setSelectedMessageIds(new Set());
		setComposerImages(current => {
			for (const item of current) {
				if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
			}
			return [];
		});
	}, [conversationId]);

	const selectableTranscriptMessages = useMemo(
		() => (effectiveMessages || []).filter(isSelectableTranscriptMessage),
		[effectiveMessages],
	);

	const toggleTicketSelectMode = () => {
		if (ticketSelectMode) {
			setTicketSelectMode(false);
			setSelectedMessageIds(new Set());
			return;
		}
		if (!selectableTranscriptMessages.length) {
			toast.error(t.noMessagesToSelect);
			return;
		}
		setMediaSelectMode(false);
		setSelectedMediaIds(new Set());
		setGroupSelectMode(false);
		setGroupPickerOpen(false);
		setTicketSelectMode(true);
	};

	const refreshMessageGroups = useCallback(async (id = conversationId) => {
		if (!id || isDemoId(id) || demo.settings.enabled) {
			setMessageGroups([]);
			setMessageGroupMembership({});
			return;
		}
		try {
			const [groups, membership] = await Promise.all([
				listChatMessageGroups(id),
				listChatMessageGroupMembership(id),
			]);
			if (conversationIdRef.current !== id) return;
			setMessageGroups(groups);
			setMessageGroupMembership(membership);
		} catch {
			if (conversationIdRef.current === id) {
				setMessageGroups([]);
				setMessageGroupMembership({});
			}
		}
	}, [conversationId, demo.settings.enabled]);

	useEffect(() => {
		setGroupSelectMode(false);
		setSelectedMessageIds(new Set());
		setMessageGroupsOpen(false);
		setGroupPickerOpen(false);
		setNewGroupName('');
		setActiveMessageGroup(null);
		setGroupViewMessages(null);
		if (!conversationId || isDemoId(conversationId) || demo.settings.enabled) {
			setMessageGroups([]);
			setMessageGroupMembership({});
			return;
		}
		void refreshMessageGroups(conversationId);
	}, [conversationId, demo.settings.enabled, refreshMessageGroups]);

	const clearActiveMessageGroup = () => {
		setActiveMessageGroup(null);
		setGroupViewMessages(null);
		if (conversationId && !isDemoId(conversationId)) {
			void loadMessages(conversationId, canUseWhatsApp && !demo.settings.enabled)?.catch?.(() => {});
		}
	};

	const openMessageGroup = async group => {
		if (!conversationId || !group?.id) return;
		setMessageGroupsBusy(true);
		try {
			const data = await fetchChatMessageGroupMessages(conversationId, group.id);
			setActiveMessageGroup({
				id: data.id || group.id,
				name: data.name || group.name,
				messageCount: data.messageCount ?? (data.messages || []).length,
			});
			setGroupViewMessages(Array.isArray(data.messages) ? data.messages : []);
			setHasMoreMessages(false);
			setMessageGroupsOpen(false);
			setGroupSelectMode(false);
			setSelectedMessageIds(new Set());
			scrollMessagesToBottom();
		} catch (error) {
			toast.error(error.response?.data?.message || (locale === 'ar' ? 'تعذر فتح المجموعة' : 'Could not open group'));
		} finally {
			setMessageGroupsBusy(false);
		}
	};

	const toggleGroupSelectMode = () => {
		if (groupSelectMode) {
			setGroupSelectMode(false);
			setSelectedMessageIds(new Set());
			setGroupPickerOpen(false);
			return;
		}
		setMediaSelectMode(false);
		setSelectedMediaIds(new Set());
		setTicketSelectMode(false);
		setGroupSelectMode(true);
		setMessageGroupsOpen(false);
		setGroupPickerOpen(false);
	};

	const toggleMediaSelectMode = useCallback(() => {
		const catalog = collectDownloadableAttachments(effectiveMessages);
		if (!catalog.length) {
			toast.error(t.noMediaToSelect);
			return;
		}
		if (mediaSelectMode) {
			setMediaSelectMode(false);
			setSelectedMediaIds(new Set());
			return;
		}
		setTicketSelectMode(false);
		setSelectedMessageIds(new Set());
		setMediaSelectMode(true);
	}, [effectiveMessages, mediaSelectMode, t]);

	const toggleMessageGroupsPanel = useCallback(() => {
		setMessageGroupsOpen(current => !current);
		setGroupPickerOpen(false);
		if (conversationId) void refreshMessageGroups(conversationId);
	}, [conversationId, refreshMessageGroups]);

	const toggleSplitChat = useCallback(() => {
		if (secondaryConversationId) {
			setSecondaryConversationId(null);
			setSplitPickMode(false);
			return;
		}
		setSplitPickMode(true);
		toast(t.splitPickHint, { icon: '▦' });
	}, [secondaryConversationId, t]);

	const applyGroupMessageSelection = (message, { toggle = true } = {}) => {
		if (!message?.id || message.optimistic) return false;
		setMediaSelectMode(false);
		setSelectedMediaIds(new Set());
		setTicketSelectMode(false);
		setGroupSelectMode(true);
		setActionMessageId(null);
		setActionMessageAnchor(null);
		setMultiMessageMenuAnchor(null);
		closeReactionPicker();
		setSelectedMessageIds(current => {
			const next = new Set(current);
			if (toggle && next.has(message.id)) {
				next.delete(message.id);
				return next;
			}
			next.add(message.id);
			return next;
		});
		return true;
	};

	const createAndAssignGroup = async () => {
		const ids = [...selectedMessageIds];
		if (!conversationId || !ids.length) {
			toast.error(t.selectMessagesFirst);
			return;
		}
		const name = newGroupName.trim();
		if (!name) {
			toast.error(t.newGroupName);
			return;
		}
		setMessageGroupsBusy(true);
		try {
			const group = await createChatMessageGroup(conversationId, name);
			await addMessagesToChatGroup(conversationId, group.id, ids);
			setNewGroupName('');
			setGroupPickerOpen(false);
			setGroupSelectMode(false);
			setSelectedMessageIds(new Set());
			await refreshMessageGroups(conversationId);
			toast.success(t.messagesAddedToGroup);
		} catch (error) {
			toast.error(error.response?.data?.message || (locale === 'ar' ? 'فشل حفظ المجموعة' : 'Could not save group'));
		} finally {
			setMessageGroupsBusy(false);
		}
	};

	const assignSelectedToGroup = async groupId => {
		const ids = [...selectedMessageIds];
		if (!conversationId || !ids.length || !groupId) {
			toast.error(t.selectMessagesFirst);
			return;
		}
		setMessageGroupsBusy(true);
		try {
			await addMessagesToChatGroup(conversationId, groupId, ids);
			setGroupPickerOpen(false);
			setGroupSelectMode(false);
			setSelectedMessageIds(new Set());
			await refreshMessageGroups(conversationId);
			if (activeMessageGroup) {
				await openMessageGroup(activeMessageGroup);
			}
			toast.success(t.messagesAddedToGroup);
		} catch (error) {
			toast.error(error.response?.data?.message || (locale === 'ar' ? 'فشل الإضافة للمجموعة' : 'Could not add to group'));
		} finally {
			setMessageGroupsBusy(false);
		}
	};

	const sendSelectedToBoard = async () => {
		const ids = [...selectedMessageIds];
		if (!accountId || !conversationId || !ids.length) {
			toast.error(t.selectMessagesFirst);
			return;
		}
		setMessageGroupsBusy(true);
		try {
			await createBoardCardFromMessages(accountId, {
				conversationId,
				messageIds: ids,
			});
			setTicketSelectMode(false);
			setGroupSelectMode(false);
			setSelectedMessageIds(new Set());
			toast.success(t.sentToBoard);
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
					(locale === 'ar' ? 'فشل الإضافة للوحة المهام' : 'Could not add to tasks board'),
			);
		} finally {
			setMessageGroupsBusy(false);
		}
	};

	const removeSelectedFromGroups = async () => {
		const ids = [...selectedMessageIds];
		if (!conversationId || !ids.length) {
			toast.error(t.selectMessagesFirst);
			return;
		}
		const byGroup = new Map();
		for (const id of ids) {
			const info = messageGroupMembership[id];
			if (!info?.groupId) continue;
			const list = byGroup.get(info.groupId) || [];
			list.push(id);
			byGroup.set(info.groupId, list);
		}
		if (!byGroup.size) {
			toast.error(locale === 'ar' ? 'الرسائل المحددة مش في مجموعة' : 'Selected messages are not in a group');
			return;
		}
		setMessageGroupsBusy(true);
		try {
			for (const [groupId, messageIds] of byGroup.entries()) {
				await removeMessagesFromChatGroup(conversationId, groupId, messageIds);
			}
			setGroupSelectMode(false);
			setSelectedMessageIds(new Set());
			await refreshMessageGroups(conversationId);
			if (activeMessageGroup) {
				await openMessageGroup(activeMessageGroup);
			}
			toast.success(t.messagesRemovedFromGroup);
		} catch (error) {
			toast.error(error.response?.data?.message || (locale === 'ar' ? 'فشل الإزالة من المجموعة' : 'Could not remove from group'));
		} finally {
			setMessageGroupsBusy(false);
		}
	};

	const deleteActiveOrListedGroup = async group => {
		if (!conversationId || !group?.id) return;
		setMessageGroupsBusy(true);
		try {
			await deleteChatMessageGroup(conversationId, group.id);
			if (activeMessageGroup?.id === group.id) clearActiveMessageGroup();
			await refreshMessageGroups(conversationId);
			toast.success(t.groupDeleted);
		} catch (error) {
			toast.error(error.response?.data?.message || (locale === 'ar' ? 'فشل حذف المجموعة' : 'Could not delete group'));
		} finally {
			setMessageGroupsBusy(false);
		}
	};

	useEffect(() => {
		if (!ticketSelectMode && !mediaSelectMode && !groupSelectMode) return undefined;
		const onKeyDown = event => {
			if (event.key !== 'Escape' || event.defaultPrevented) return;
			setTicketSelectMode(false);
			setSelectedMessageIds(new Set());
			setMediaSelectMode(false);
			setSelectedMediaIds(new Set());
			setGroupSelectMode(false);
			setGroupPickerOpen(false);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [mediaSelectMode, ticketSelectMode, groupSelectMode]);

	const openSelectedTranscriptBundle = () => {
		const selected = selectableTranscriptMessages.filter(item => selectedMessageIds.has(item.id));
		if (!selected.length) {
			toast.error(t.needVoiceOrTicket);
			return;
		}
		if (selected.length > MAX_TRANSCRIPT_BUNDLE_ITEMS) {
			toast.error(t.tooManySelected.replace('{count}', String(MAX_TRANSCRIPT_BUNDLE_ITEMS)));
			return;
		}
		setTranscriptionSources(selected.map(toTranscriptSource));
	};

	const closeReactionPicker = () => {
		skipReactionPickerCloseRef.current = false;
		reactionPickerMessageRef.current = null;
		setReactionPickerMessageId(null);
		setReactionPickerAnchor(null);
	};

	const toggleReactionPicker = (message, rect) => {
		skipReactionPickerCloseRef.current = true;
		window.setTimeout(() => {
			skipReactionPickerCloseRef.current = false;
		}, 0);
		setActionMessageId(null);
		setReactionPickerMessageId(current => {
			if (current === message.id) {
				reactionPickerMessageRef.current = null;
				setReactionPickerAnchor(null);
				return null;
			}
			reactionPickerMessageRef.current = message;
			setReactionPickerAnchor(rect || null);
			return message.id;
		});
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
		closeReactionPicker();
		setReactingMessageIds(current => {
			const next = new Set(current);
			next.add(message.id);
			return next;
		});
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

	const applyMessagesSelection = (messages, { toggle = true } = {}) => {
		const list = (Array.isArray(messages) ? messages : [messages]).filter(
			item => isSharableChatMessage(item),
		);
		if (!list.length) return false;
		setMediaSelectMode(false);
		setSelectedMediaIds(new Set());
		setTicketSelectMode(true);
		setActionMessageId(null);
		setActionMessageAnchor(null);
		setMultiMessageMenuAnchor(null);
		closeReactionPicker();
		setSelectedMessageIds(current => {
			const next = new Set(current);
			const allSelected = list.every(item => next.has(item.id));
			if (toggle && allSelected) {
				list.forEach(item => next.delete(item.id));
				return next;
			}
			for (const item of list) {
				if (next.has(item.id)) continue;
				if (next.size >= MAX_TRANSCRIPT_BUNDLE_ITEMS) {
					toast.error(
						t.tooManySelected.replace('{count}', String(MAX_TRANSCRIPT_BUNDLE_ITEMS)),
					);
					break;
				}
				next.add(item.id);
			}
			return next;
		});
		return true;
	};

	const applyMessageSelection = (message, { toggle = true } = {}) => {
		if (!message || !isSharableChatMessage(message)) return false;
		return applyMessagesSelection([message], { toggle });
	};

	const applyMediaSelection = downloadableAttachments => {
		if (!downloadableAttachments?.length) return false;
		setTicketSelectMode(false);
		setSelectedMessageIds(new Set());
		setMediaSelectMode(true);
		setActionMessageId(null);
		setActionMessageAnchor(null);
		closeReactionPicker();
		setSelectedMediaIds(current => {
			const next = new Set(current);
			const alreadyAll = downloadableAttachments.every(item => next.has(item.id));
			for (const item of downloadableAttachments) {
				if (alreadyAll) next.delete(item.id);
				else next.add(item.id);
			}
			return next;
		});
		return true;
	};

	const handleMessageAction = async (message, action) => {
		if (!message || message.optimistic) return;
		setActionMessageId(null);
		setMultiMessageMenuAnchor(null);
		if (action !== 'react') {
			setActionMessageAnchor(null);
		}
		if (action === 'reply') {
			setReplyingTo(buildReplySnapshot(message));
			return;
		}
		if (action === 'edit') {
			setEditingMessage(message);
			setEditDraft(String(message.text || ''));
			return;
		}
		if (action === 'react') {
			skipReactionPickerCloseRef.current = true;
			window.setTimeout(() => {
				skipReactionPickerCloseRef.current = false;
			}, 0);
			reactionPickerMessageRef.current = message;
			setReactionPickerAnchor(actionMessageAnchor);
			setReactionPickerMessageId(message.id);
			return;
		}
		if (action === 'forward') {
			setForwardingMessage(null);
			setSharingMessageIds([message.id]);
			return;
		}
		if (action === 'delete') {
			setDeleteMessageTarget(message);
			return;
		}
		if (action === 'transcribe') {
			setTranscriptionSources([toTranscriptSource(message)]);
			return;
		}
		if (action === 'select') {
			applyMessageSelection(message, { toggle: false });
			return;
		}
		if (action === 'selectMedia') {
			const downloadable = collectDownloadableAttachments([message]);
			if (downloadable.length) {
				applyMediaSelection(downloadable);
				return;
			}
			// Image envelope without persisted attachment — still allow Send-to selection.
			if (isSharableChatMessage(message)) {
				applyGroupMessageSelection(message, { toggle: false });
			} else {
				toast.error(t.noMediaToSelect);
			}
			return;
		}
		if (action === 'copy') {
			const text = String(message.text || '').trim();
			if (!text) {
				toast.error(locale === 'ar' ? 'لا يوجد نص للنسخ' : 'Nothing to copy');
				return false;
			}
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				toast.error(locale === 'ar' ? 'تعذر النسخ' : 'Could not copy');
				return false;
			}
		}
		if (action === 'addToGroup') {
			if (demo.settings.enabled || isDemoId(conversationId)) {
				toast.error(locale === 'ar' ? 'هذا الإجراء غير متاح في الوضع التجريبي' : 'This action is unavailable in demo mode');
				return;
			}
			applyGroupMessageSelection(message, { toggle: false });
			setGroupPickerOpen(true);
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
		const importantView =
			conversationFilterRef.current === 'important' ||
			conversationFilterRef.current === 'starred';
		markMessageActionPending(message.id, true);
		updateCachedMessage(conversationId, message.id, current => ({ ...current, [field]: enabled }));
		if (action === 'star' && importantView && !enabled) {
			writeConversationMessages(conversationId, current =>
				(current || []).filter(item => item?.id !== message.id),
			);
			const cacheKey = messagesCacheKey(conversationId, true);
			const cached = messagesCacheRef.current.get(cacheKey);
			if (cached) {
				messagesCacheRef.current.set(cacheKey, {
					...cached,
					items: (cached.items || []).filter(item => item?.id !== message.id),
					cachedAt: Date.now(),
				});
			}
		}
		try {
			const { data } = await api.put(
				`/whatsapp/conversations/${conversationId}/messages/${message.id}/${action}`,
				{ enabled },
			);
			updateCachedMessage(conversationId, message.id, current => ({
				...current,
				...(data.changes || { [field]: enabled }),
			}));
			if (action === 'star' && importantView && !enabled) {
				const remaining = (messagesCacheRef.current.get(messagesCacheKey(conversationId, true))?.items || [])
					.filter(item => item?.id !== message.id);
				if (!remaining.length) {
					setConversations(current =>
						current.map(item =>
							item.id === conversationId
								? { ...item, hasImportantMessages: false }
								: item,
						),
					);
				}
			}
			if (action === 'star' && enabled) {
				setConversations(current =>
					current.map(item =>
						item.id === conversationId
							? { ...item, hasImportantMessages: true }
							: item,
					),
				);
			}
			if (action === 'star' && importantView && enabled && accountId) {
				void loadConversations(accountId, 1, false, {
					background: true,
					mergeIntoInbox: true,
					filter: 'important',
				}).catch(() => {});
			}
		} catch (error) {
			updateCachedMessage(conversationId, message.id, current => ({ ...current, [field]: message[field] }));
			toast.error(error.response?.data?.message || `Could not ${action} message`);
		} finally {
			markMessageActionPending(message.id, false);
		}
	};

	const handleMultiMessageAction = action => {
		setMultiMessageMenuAnchor(null);
		if (action === 'shareAsSend') {
			if (demo.settings.enabled || isDemoId(conversationId)) {
				toast.error(locale === 'ar' ? 'هذا الإجراء غير متاح في الوضع التجريبي' : 'This action is unavailable in demo mode');
				return;
			}
			const ids = [...selectedMessageIds];
			if (!ids.length) {
				toast.error(locale === 'ar' ? 'حدد رسائل أولًا' : 'Select messages first');
				return;
			}
			setSharingMessageIds(ids);
			return;
		}
		if (action === 'transcribe') {
			openSelectedTranscriptBundle();
			return;
		}
		if (action === 'addToGroup') {
			if (demo.settings.enabled || isDemoId(conversationId)) {
				toast.error(locale === 'ar' ? 'هذا الإجراء غير متاح في الوضع التجريبي' : 'This action is unavailable in demo mode');
				return;
			}
			setTicketSelectMode(false);
			setGroupSelectMode(true);
			setGroupPickerOpen(true);
			return;
		}
		if (action === 'removeFromGroup') {
			void removeSelectedFromGroups();
			return;
		}
		if (action === 'selectAll') {
			if (groupSelectMode) {
				const ids = effectiveMessages
					.filter(item => item?.id && !item.optimistic)
					.map(item => item.id);
				setSelectedMessageIds(new Set(ids));
				return;
			}
			const ids = selectableTranscriptMessages
				.slice(0, MAX_TRANSCRIPT_BUNDLE_ITEMS)
				.map(item => item.id);
			setTicketSelectMode(true);
			setSelectedMessageIds(new Set(ids));
			if (selectableTranscriptMessages.length > MAX_TRANSCRIPT_BUNDLE_ITEMS) {
				toast.error(
					t.tooManySelected.replace('{count}', String(MAX_TRANSCRIPT_BUNDLE_ITEMS)),
				);
			}
			return;
		}
		if (action === 'clear') {
			setTicketSelectMode(false);
			setGroupSelectMode(false);
			setGroupPickerOpen(false);
			setSelectedMessageIds(new Set());
		}
	};

	const openMessageContextMenu = (event, message) => {
		if (!message || message.optimistic) return;
		event.preventDefault();
		event.stopPropagation();
		if (mediaSelectMode) return;
		closeReactionPicker();
		const point = {
			top: event.clientY,
			bottom: event.clientY,
			left: event.clientX,
			right: event.clientX,
			width: 0,
			height: 0,
		};
		const hasBulkSelection =
			selectedMessageIds.size > 0 || ticketSelectMode || groupSelectMode;
		if (hasBulkSelection) {
			if (!selectedMessageIds.has(message.id)) {
				if (groupSelectMode) applyGroupMessageSelection(message, { toggle: false });
				else if (isSelectableTranscriptMessage(message)) {
					applyMessageSelection(message, { toggle: false });
				} else if (messageHasSelectableMedia(message)) {
					const downloadable = collectDownloadableAttachments([message]);
					if (downloadable.length) applyMediaSelection(downloadable);
					else applyGroupMessageSelection(message, { toggle: false });
				} else if (isSharableChatMessage(message)) {
					applyGroupMessageSelection(message, { toggle: false });
				}
			}
			setActionMessageId(null);
			setActionMessageAnchor(null);
			setMultiMessageMenuAnchor(point);
			return;
		}
		setMultiMessageMenuAnchor(null);
		setActionMessageAnchor(point);
		setActionMessageId(message.id);
	};

	const shareMessagesAsOriginal = async targetConversationId => {
		const messageIds = Array.isArray(sharingMessageIds)
			? sharingMessageIds
			: forwardingMessage?.id
				? [forwardingMessage.id]
				: [];
		if (!messageIds.length || !targetConversationId || sharingBusy) return;
		setSharingBusy(true);
		try {
			// Warm media onto disk first — share fails when attachment is still pending.
			const selected = (effectiveMessages || []).filter(item => messageIds.includes(item.id));
			for (const message of selected) {
				for (const attachment of message.attachments || []) {
					const id = String(attachment?.id || '');
					if (!isPersistedAttachmentId(id)) continue;
					try {
						await requestAttachmentBlob(id, {
							timeout: 90_000,
							priority: true,
							kind: attachment.type,
						});
					} catch {
						/* backend share path will retry / report failure */
					}
				}
			}
			const { data } = await api.post(
				`/whatsapp/conversations/${conversationId}/messages/share-as-original`,
				{ targetConversationId, messageIds },
			);
			const sent = Number(data?.sent || 0);
			const failed = Number(data?.failed || 0);
			setSharingMessageIds(null);
			setForwardingMessage(null);
			setTicketSelectMode(false);
			setGroupSelectMode(false);
			setSelectedMessageIds(new Set());
			if (failed > 0 && sent > 0) {
				toast.success(
					locale === 'ar'
						? `تم إرسال ${sent} رسالة · فشل ${failed}`
						: `Sent ${sent} · ${failed} failed`,
				);
			} else {
				toast.success(
					locale === 'ar'
						? sent > 1
							? `تم إرسال ${sent} رسالة كأنها منك`
							: 'تم الإرسال كرسالة جديدة منك'
						: sent > 1
							? `Sent ${sent} messages as yours`
							: 'Sent as a new message from you',
				);
			}
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
					(locale === 'ar' ? 'تعذر إرسال الرسائل' : 'Could not send messages'),
			);
		} finally {
			setSharingBusy(false);
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

	const loadTranscriptionSourceFile = useCallback(async source => {
		const attachment = source?.attachment;
		if (!attachment?.id) throw new Error('Voice message is unavailable');
		const demoAttachment = Boolean(attachment.demoAttachment || isDemoId(attachment.id));
		const blob = demoAttachment
			? await demoApi.getMedia(rawDemoId(attachment.id))
			: await requestAttachmentBlob(attachment.id, { timeout: 90_000, priority: true });
		if (!blob || blob.size < 8) throw new Error('Voice message is unavailable');
		return createTranscriptionFile(
			blob,
			attachment.fileName,
			attachment.id,
			attachment.mimeType,
		);
	}, []);

	const buildCloneVoiceFetchers = useCallback(
		targetConversationId => ({
			fetchPage: async ({ before, limit }) => {
				const { data } = await api.get(
					`/whatsapp/conversations/${targetConversationId}/messages`,
					{
						params: {
							limit,
							before: before || undefined,
							live: 0,
						},
					},
				);
				return Array.isArray(data) ? data : [];
			},
			primeSync:
				canUseWhatsApp && !demo.settings.enabled
					? async ({ limit }) => {
							const synced = await api.post(
								`/whatsapp/conversations/${targetConversationId}/sync/latest`,
								null,
								{
									params: {
										limit: Math.min(limit || MESSAGE_PAGE_SIZE, 200),
									},
									timeout: 12_000,
								},
							);
							return synced?.data;
						}
					: undefined,
			syncOlderPage:
				canUseWhatsApp && !demo.settings.enabled
					? async ({ limit }) => {
							const synced = await api.post(
								`/whatsapp/conversations/${targetConversationId}/sync/older`,
								null,
								{ params: { limit: Math.min(limit || MESSAGE_PAGE_SIZE, 200) } },
							);
							return synced?.data;
						}
					: undefined,
			mergePage: (incoming, previous, conversationId) =>
				mergeMessages(incoming, previous, conversationId),
		}),
		[canUseWhatsApp, demo.settings.enabled],
	);

	const fetchInitialChatMessagesForClone = useCallback(
		async targetConversationId => {
			if (!targetConversationId) return { messages: [], hasMore: false };
			if (isDemoId(targetConversationId)) {
				const cached = messagesCacheRef.current.get(targetConversationId);
				const messages = cached?.items?.length
					? cached.items
					: await buildCloneVoiceFetchers(targetConversationId).fetchPage({
							limit: MESSAGE_PAGE_SIZE,
						});
				return {
					messages,
					hasMore: messages.length >= MESSAGE_PAGE_SIZE,
				};
			}

			const remembered = cloneVoiceHistoryRef.current.get(targetConversationId);
			if (remembered?.messages?.length) {
				return {
					messages: remembered.messages,
					hasMore: Boolean(remembered.hasMore || remembered.providerHasMore),
				};
			}

			const fetchers = buildCloneVoiceFetchers(targetConversationId);
			const inboxCached = messagesCacheRef.current.get(targetConversationId);
			let messages = inboxCached?.items || [];
			if (
				conversationIdRef.current === targetConversationId &&
				conversationMessagesRef.current?.length
			) {
				messages = mergeMessages(
					conversationMessagesRef.current,
					messages,
					targetConversationId,
				);
			}

			if (messages.length) {
				if (typeof fetchers.primeSync === 'function') {
					try {
						const synced = await fetchers.primeSync({ limit: MESSAGE_PAGE_SIZE });
						const syncedItems = Array.isArray(synced) ? synced : synced?.items || [];
						if (syncedItems.length) {
							messages = mergeMessages(syncedItems, messages, targetConversationId);
						}
					} catch {
						/* keep cached page */
					}
				}

				const shallow = messages.length < MESSAGE_PAGE_SIZE * 4;
				const deeper = await loadMoreConversationHistoryForClone({
					conversationId: targetConversationId,
					existingItems: messages,
					before: messages[0]?.id || null,
					providerHasMore: true,
					pageSize: MESSAGE_PAGE_SIZE,
					maxRounds: shallow ? 8 : 3,
					...fetchers,
				});
				messages = deeper.messages;
				const hasMore = Boolean(deeper.hasMore || deeper.providerHasMore);
				cloneVoiceHistoryRef.current.set(targetConversationId, {
					messages,
					before: deeper.before,
					hasMore,
					providerHasMore: deeper.providerHasMore,
				});
				return { messages, hasMore };
			}

			messages = await loadConversationHistoryForClone({
				conversationId: targetConversationId,
				pageSize: MESSAGE_PAGE_SIZE,
				maxPages: 8,
				...fetchers,
			});
			const hasMore = messages.length >= MESSAGE_PAGE_SIZE;
			cloneVoiceHistoryRef.current.set(targetConversationId, {
				messages,
				before: messages[0]?.id || null,
				hasMore,
				providerHasMore: true,
			});
			return { messages, hasMore };
		},
		[buildCloneVoiceFetchers],
	);

	const syncMoreChatMessagesForClone = useCallback(
		async targetConversationId => {
			if (!targetConversationId || isDemoId(targetConversationId)) {
				return { messages: [], hasMore: false, addedCount: 0, addedMessages: 0 };
			}

			const state = cloneVoiceHistoryRef.current.get(targetConversationId) || {
				messages: [],
				before: null,
				hasMore: true,
				providerHasMore: true,
			};
			const previousCount = state.messages.length;
			const fetchers = buildCloneVoiceFetchers(targetConversationId);
			const result = await loadMoreConversationHistoryForClone({
				conversationId: targetConversationId,
				existingItems: state.messages,
				before: state.before,
				providerHasMore: state.providerHasMore !== false,
				pageSize: MESSAGE_PAGE_SIZE,
				maxRounds: 12,
				...fetchers,
			});

			cloneVoiceHistoryRef.current.set(targetConversationId, {
				messages: result.messages,
				before: result.before,
				hasMore: result.hasMore,
				providerHasMore: result.providerHasMore,
			});

			const addedMessages = Math.max(
				0,
				Number(result.addedMessages) || result.messages.length - previousCount,
			);
			return {
				messages: result.messages,
				hasMore: result.hasMore,
				addedCount: addedMessages,
				addedMessages,
			};
		},
		[buildCloneVoiceFetchers],
	);

	const loadVoiceFromMessageForClone = useCallback(
		async message => loadTranscriptionSourceFile(toTranscriptSource(message)),
		[loadTranscriptionSourceFile],
	);

	const probeCloneVoiceMedia = useCallback(async message => {
		const source = toTranscriptSource(message);
		const attachment = source?.attachment;
		if (!attachment?.id) return false;
		if (String(attachment.downloadStatus || '').toLowerCase() === 'downloaded') return true;
		try {
			await api.post(`/whatsapp/attachments/${attachment.id}/download`, null, {
				timeout: 120_000,
			});
			return true;
		} catch {
			return false;
		}
	}, []);

	const startCloneVoicePick = useCallback(({ cloneName, sampleCount } = {}) => {
		setCloneVoicePickSampleBase(Math.max(0, Number(sampleCount) || 0));
		pendingCloneSamplesRef.current = [];
		setPendingCloneSampleTick(0);
		setCloneVoicePickMode(true);
		setVoiceChangerOpen(false);
		setConversationId(null);
		setChatListCollapsed(false);
		if (cloneName) {
			/* clone name stays in VoiceChangerDialog state until reopened */
		}
		toast(t.cloneVoicePickHint, { icon: '🎙️' });
	}, [t.cloneVoicePickHint]);

	const finishCloneVoicePick = useCallback(() => {
		setCloneVoicePickMode(false);
		setVoiceChangerOpen(true);
	}, []);

	const cancelCloneVoicePick = useCallback(() => {
		pendingCloneSamplesRef.current = [];
		cloneVoiceHistoryRef.current.clear();
		setPendingCloneSampleTick(0);
		setCloneVoicePickMode(false);
		setVoiceChangerOpen(true);
	}, []);

	const appendPendingCloneSamples = useCallback(files => {
		const room = Math.max(0, 10 - cloneVoicePickSampleBase);
		if (!room || !files?.length) return;
		pendingCloneSamplesRef.current = [...pendingCloneSamplesRef.current, ...files].slice(0, room);
		setPendingCloneSampleTick(tick => tick + 1);
	}, [cloneVoicePickSampleBase]);

	const pendingCloneSampleCount =
		cloneVoicePickSampleBase + (pendingCloneSamplesRef.current?.length || 0);
	void pendingCloneSampleTick;

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
		if (action === 'poll') {
			toast.error(locale === 'ar' ? 'الاستطلاعات غير متاحة بعد' : 'Polls are not available yet');
			return;
		}
		if (action === 'contact') {
			setShareContactOpen(true);
			return;
		}
	};

	const stopVoiceRecording = (send = true) => {
		clearVoicePreview();
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === 'inactive') return;
		discardRecordingRef.current = !send;
		setRecordingPaused(false);
		recorder.stop();
	};

	const pauseVoiceRecording = () => {
		clearVoicePreview();
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state !== 'recording') return;
		try {
			if (typeof recorder.requestData === 'function') recorder.requestData();
			recorder.pause();
			setRecordingPaused(true);
		} catch {
			toast.error(t.recordingFailed);
		}
	};

	const resumeVoiceRecording = () => {
		clearVoicePreview();
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state !== 'paused') return;
		try {
			recorder.resume();
			setRecordingPaused(false);
		} catch {
			toast.error(t.recordingFailed);
		}
	};

	const startVoiceRecording = async () => {
		if (!conversationId || sending || recordingVoice || voiceChanging) return;
		setAttachmentSheetOpen(false);
		setStickerPanelOpen(false);
		setAiImagePanelOpen(false);
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
		clearVoicePreview();
		try {
			stream = await getVoiceMediaStream();
			const recorder = createVoiceMediaRecorder(stream);
			recordingStreamRef.current = stream;
			mediaRecorderRef.current = recorder;
			recordingChunksRef.current = [];
			discardRecordingRef.current = false;
			recordingSecondsRef.current = 0;
			setRecordingSeconds(0);
			setRecordingPaused(false);
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
				setRecordingPaused(false);
				setRecordingSeconds(0);
				recordingSecondsRef.current = 0;

				const discard = discardRecordingRef.current;
				const chunks = recordingChunksRef.current;
				recordingChunksRef.current = [];
				if (discard || chunks.length === 0) return;

				const file = buildVoiceNoteFile(chunks, recorder, durationSec);
				if (!file) return;
				void sendRecordedVoice(file);
			};

			recorder.start(250);
			recordingTimerRef.current = setInterval(() => {
				if (mediaRecorderRef.current?.state !== 'recording') return;
				recordingSecondsRef.current += 1;
				const next = recordingSecondsRef.current;
				setRecordingSeconds(next);
				if (next >= VOICE_NOTE_MAX_SECONDS && recorder.state !== 'inactive') {
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
			setRecordingPaused(false);
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
		if (!recordingVoice) return undefined;
		const onKeyDown = event => {
			if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
			if (event.repeat || event.isComposing || event.keyCode === 229) return;
			const target = event.target;
			if (target instanceof HTMLElement) {
				const tag = target.tagName;
				if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
				if (target.closest('[role="dialog"]')) return;
			}
			event.preventDefault();
			stopVoiceRecording(true);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [recordingVoice]);

	useEffect(() => {
		const onKeyDown = event => {
			if (!(event.ctrlKey || event.metaKey) || String(event.key || '').toLowerCase() !== 'f') return;
			if (!conversationIdRef.current) return;
			event.preventDefault();
			setInChatSearchOpen(true);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	useEffect(() => {
		return () => {
			if (presenceTypingTimerRef.current) window.clearTimeout(presenceTypingTimerRef.current);
			if (presencePausedTimerRef.current) window.clearTimeout(presencePausedTimerRef.current);
		};
	}, []);

	useEffect(() => {
		return () => {
			clearVoicePreview();
			discardRecordingRef.current = true;
			if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
			if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
			recordingStreamRef.current?.getTracks().forEach(track => track.stop());
		};
	}, []);

	useEffect(() => {
		if (recordingVoice) stopVoiceRecording(false);
		setHighlightedMessageKey(null);
		if (highlightTimerRef.current) {
			clearTimeout(highlightTimerRef.current);
			highlightTimerRef.current = null;
		}
		// Stop and discard if the operator switches conversations.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId]);

	const loadOlder = async (options = {}) => {
		const preserveScroll = options.preserveScroll !== false;
		const ignoreThrottle = Boolean(options.ignoreThrottle);
		const forceProvider = Boolean(options.forceProvider);
		const oldest = conversationMessagesRef.current[0];
		const starredOnly =
			conversationFilterRef.current === 'important' ||
			conversationFilterRef.current === 'starred';
		const cacheKey = messagesCacheKey(conversationId, starredOnly);
		// Do not gate on loadingMessages — that flag can stay true during soft sync
		// and silently ignore the "Load older messages" button.
		if (
			!conversationId ||
			isDemoId(conversationId) ||
			loadingOlderRef.current ||
			!hasMoreMessagesRef.current ||
			!oldest?.id
		) {
			return false;
		}
		if (!ignoreThrottle && Date.now() - loadOlderAtRef.current < 700) return false;
		if (!ignoreThrottle && Date.now() < suppressOlderLoadUntilRef.current) return false;
		loadOlderAtRef.current = Date.now();
		const targetConversationId = conversationId;
		const requestId = ++olderRequestId.current;
		loadingOlderRef.current = true;
		pinThreadToBottomRef.current = false;
		setLoadingOlder(true);
		try {
			const { data } = await api.get(
				`/whatsapp/conversations/${targetConversationId}/messages`,
				{
					params: {
						before: oldest?.id,
						limit: MESSAGE_PAGE_SIZE,
						live: 0,
						starredOnly: starredOnly ? 1 : undefined,
					},
				},
			);
			if (
				requestId !== olderRequestId.current ||
				conversationIdRef.current !== targetConversationId
			) {
				return false;
			}
			let local = Array.isArray(data) ? data : [];
			if (starredOnly) local = local.filter(item => item?.isStarred);
			let provider = null;
			// Prefer Postgres. On explicit button click (forceProvider) always ask
			// WhatsApp Web when the DB page is short/empty so history can backfill.
			const shouldSyncProvider =
				!starredOnly &&
				canUseWhatsApp &&
				!demo.settings.enabled &&
				(forceProvider || local.length < MESSAGE_PAGE_SIZE);
			if (shouldSyncProvider) {
				try {
					const synced = await api.post(
						`/whatsapp/conversations/${targetConversationId}/sync/older`,
						null,
						{
							params: {
								limit: MESSAGE_PAGE_SIZE,
								force: forceProvider ? 1 : undefined,
							},
							timeout: 90_000,
						},
					);
					provider = synced?.data || null;
				} catch {
					/* keep DB page */
				}
			}
			if (
				requestId !== olderRequestId.current ||
				conversationIdRef.current !== targetConversationId
			) {
				return false;
			}
			const providerItems = Array.isArray(provider?.items) ? provider.items : [];
			if (!local.length && !providerItems.length) {
				setHasMoreMessages(false);
				hasMoreMessagesRef.current = false;
				return false;
			}
			const incoming = [...local, ...providerItems];
			const previousCache = messagesCacheRef.current.get(cacheKey);
			const previousItems = previousCache?.items || conversationMessagesRef.current;
			const previousCount = conversationMessagesRef.current.length;
			const next = mergeMessages(incoming, previousItems, targetConversationId);
			const added = Math.max(0, next.length - previousCount);
			const dbHasMore = local.length >= MESSAGE_PAGE_SIZE;
			const hasMore =
				typeof provider?.hasMore === 'boolean'
					? provider.hasMore || dbHasMore
					: dbHasMore || (forceProvider && added > 0);
			// Stop after repeated empty merges so we don't spin forever on duplicates.
			if (added === 0 && !dbHasMore) {
				setHasMoreMessages(
					typeof provider?.hasMore === 'boolean' ? Boolean(provider.hasMore) : false,
				);
				hasMoreMessagesRef.current =
					typeof provider?.hasMore === 'boolean' ? Boolean(provider.hasMore) : false;
			} else {
				setHasMoreMessages(hasMore);
				hasMoreMessagesRef.current = hasMore;
			}
			messagesCacheRef.current.set(cacheKey, {
				items: next,
				hasMore: hasMoreMessagesRef.current,
				cachedAt: Date.now(),
				providerHydratedAt: previousCache?.providerHydratedAt || 0,
			});

			// Capture scroll anchor immediately before React prepends rows.
			const box = messageBoxRef.current;
			if (preserveScroll && box) {
				const anchorEl =
					box.querySelector('.wa-message-line [data-wa-message-id]') ||
					box.querySelector('[data-wa-message-id]');
				olderScrollRestoreRef.current = {
					conversationId: targetConversationId,
					previousHeight: box.scrollHeight,
					previousScrollTop: box.scrollTop,
					anchorId: anchorEl?.getAttribute('data-wa-message-id') || '',
					anchorOffset: anchorEl ? anchorEl.getBoundingClientRect().top : 0,
				};
			} else {
				olderScrollRestoreRef.current = null;
			}

			writeConversationMessages(targetConversationId, next);
			return added > 0 || incoming.length > 0;
		} catch (error) {
			olderScrollRestoreRef.current = null;
			if (conversationIdRef.current === targetConversationId) {
				toast.error(error.response?.data?.message || 'Could not load older messages');
			}
			return false;
		} finally {
			if (requestId === olderRequestId.current) {
				loadingOlderRef.current = false;
				setLoadingOlder(false);
			}
		}
	};

	const scrollAndHighlightQuotedMessage = target => {
		const key = String(target?.id || target?.providerMessageId || '').trim();
		if (!key) return;
		setHighlightedMessageKey(null);
		const apply = () => {
			const box = messageBoxRef.current;
			if (!box) return;
			const selectors = [];
			if (target.id) {
				const id = CSS.escape(String(target.id));
				selectors.push(`[data-wa-message-id="${id}"]`, `[data-wa-message-ids~="${id}"]`);
			}
			if (target.providerMessageId) {
				const providerId = CSS.escape(String(target.providerMessageId));
				selectors.push(
					`[data-wa-provider-id="${providerId}"]`,
					`[data-wa-provider-ids~="${providerId}"]`,
				);
			}
			const el = selectors.map(selector => box.querySelector(selector)).find(Boolean);
			el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			setHighlightedMessageKey(key);
			if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
			highlightTimerRef.current = window.setTimeout(() => {
				setHighlightedMessageKey(current => (current === key ? null : current));
			}, 2200);
		};
		requestAnimationFrame(() => requestAnimationFrame(apply));
	};

	const jumpToQuotedMessage = async sourceMessage => {
		const target = quotedTargetFromMessage(sourceMessage);
		if (!target.id && !target.providerMessageId) {
			toast.error(
				locale === 'ar' ? 'الرسالة الأصلية غير متاحة' : 'Original message is not available',
			);
			return;
		}
		const inView = conversationMessagesRef.current.some(item =>
			messageMatchesQuotedTarget(item, target),
		);
		if (inView) {
			scrollAndHighlightQuotedMessage(target);
			return;
		}
		let pages = 0;
		while (pages < 12 && hasMoreMessagesRef.current && !isDemoId(conversationId)) {
			pages += 1;
			const loaded = await loadOlder({ preserveScroll: false, ignoreThrottle: true });
			if (conversationIdRef.current !== conversationId) return;
			const next =
				messagesCacheRef.current.get(conversationId)?.items ||
				conversationMessagesRef.current;
			if (next.some(item => messageMatchesQuotedTarget(item, target))) {
				window.setTimeout(() => scrollAndHighlightQuotedMessage(target), 60);
				return;
			}
			if (!loaded) break;
		}
		toast.error(
			locale === 'ar'
				? 'تعذر العثور على الرسالة الأصلية'
				: 'Could not find the original message',
		);
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
			sortConversationsByActivity(
				current.map(item =>
					item.id === conversation.id ? { ...item, isPinned: nextPinned } : item,
				),
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
					items: sortConversationsByActivity(
						cached.items.map(item =>
							item.id === conversation.id ? { ...item, isPinned: nextPinned } : item,
						),
					),
					cachedAt: Date.now(),
				});
			}
			toast.success(t.pinUpdated);
		} catch (error) {
			setConversations(current =>
				sortConversationsByActivity(
					current.map(item =>
						item.id === conversation.id ? { ...item, isPinned: previousPinned } : item,
					),
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

	const applyMuteDuration = async (conversation, durationMinutes) => {
		if (!conversation?.id) return;
		const actionKey = `mute:${conversation.id}`;
		if (pendingPreferenceActions.has(actionKey)) return;
		setPendingPreferenceActions(current => new Set(current).add(actionKey));
		const mutedUntil =
			durationMinutes != null
				? new Date(Date.now() + Number(durationMinutes) * 60_000).toISOString()
				: null;
		setConversations(current =>
			current.map(item =>
				item.id === conversation.id ? { ...item, isMuted: true, mutedUntil } : item,
			),
		);
		setMuteDurationOpen(false);
		setMuteTargetConversation(null);
		try {
			await api.put(`/whatsapp/conversations/${conversation.id}/mute`, {
				isMuted: true,
				durationMinutes: durationMinutes ?? undefined,
				mutedUntil: mutedUntil || undefined,
			});
			toast.success(t.muteUpdated);
		} catch (error) {
			setConversations(current =>
				current.map(item =>
					item.id === conversation.id
						? { ...item, isMuted: false, mutedUntil: null }
						: item,
				),
			);
			toast.error(error.response?.data?.message || 'Could not update mute');
		} finally {
			setPendingPreferenceActions(current => {
				const next = new Set(current);
				next.delete(actionKey);
				return next;
			});
		}
	};

	const toggleConversationMuted = async (conversation, event) => {
		event?.stopPropagation?.();
		if (demo.settings.enabled || !conversation?.id || isDemoId(conversation.id)) return;
		const actionKey = `mute:${conversation.id}`;
		if (pendingPreferenceActions.has(actionKey)) return;
		const previousMuted = Boolean(conversation.isMuted);
		if (previousMuted) {
			setPendingPreferenceActions(current => new Set(current).add(actionKey));
			setConversations(current =>
				current.map(item =>
					item.id === conversation.id
						? { ...item, isMuted: false, mutedUntil: null }
						: item,
				),
			);
			try {
				await api.put(`/whatsapp/conversations/${conversation.id}/mute`, {
					isMuted: false,
				});
				toast.success(t.muteUpdated);
			} catch (error) {
				setConversations(current =>
					current.map(item =>
						item.id === conversation.id ? { ...item, isMuted: previousMuted } : item,
					),
				);
				toast.error(error.response?.data?.message || 'Could not update mute');
			} finally {
				setPendingPreferenceActions(current => {
					const next = new Set(current);
					next.delete(actionKey);
					return next;
				});
			}
			return;
		}
		setMuteTargetConversation(conversation);
		setMuteDurationOpen(true);
	};

	const markConversationUnread = async () => {
		if (!conversationId || demo.settings.enabled || isDemoId(conversationId)) return;
		try {
			const { data } = await api.post(`/whatsapp/conversations/${conversationId}/unread`);
			const next = Number(data?.unreadCount) || 1;
			setConversations(current =>
				current.map(item =>
					item.id === conversationId ? { ...item, unreadCount: next } : item,
				),
			);
			notifyWhatsAppUnreadChanged();
			toast.success(locale === 'ar' ? 'تم تعليم المحادثة كغير مقروءة' : 'Marked as unread');
		} catch {
			toast.error(locale === 'ar' ? 'تعذر تعليم كغير مقروء' : 'Could not mark unread');
		}
	};

	const runInChatSearch = async query => {
		const q = String(query || '').trim();
		setInChatSearchQuery(q);
		if (!conversationId || !q) {
			setInChatSearchHits([]);
			return;
		}
		const localHits = (messages || []).filter(message =>
			String(message.text || '')
				.toLowerCase()
				.includes(q.toLowerCase()),
		);
		setInChatSearchHits(localHits);
		setInChatSearchBusy(true);
		try {
			const { data } = await api.get(`/whatsapp/conversations/${conversationId}/messages`, {
				params: { q, limit: 50, live: '0' },
			});
			const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
			if (items.length) setInChatSearchHits(items);
		} catch {
			/* keep local hits */
		} finally {
			setInChatSearchBusy(false);
		}
	};

	const shareContactFromConversation = async contactConversation => {
		if (!conversationId || !contactConversation) return;
		const phone =
			String(contactConversation.phoneNumber || '')
				.replace(/[^\d+]/g, '')
				.replace(/^\+/, '') ||
			String(contactConversation.providerChatId || '')
				.split('@')[0]
				.replace(/\D/g, '');
		if (!phone) {
			toast.error(locale === 'ar' ? 'لا يوجد رقم لهذه الجهة' : 'No phone number for this contact');
			return;
		}
		try {
			const { data } = await api.post(`/whatsapp/conversations/${conversationId}/messages`, {
				type: 'contact',
				contact: {
					displayName: conversationTitle(contactConversation) || phone,
					phoneNumber: phone,
					waId: phone,
				},
			});
			if (data?.message) {
				persistConversationMessages(conversationId, current =>
					mergeMessages(current, [data.message], conversationId),
				);
			}
			setShareContactOpen(false);
			toast.success(locale === 'ar' ? 'تم إرسال جهة الاتصال' : 'Contact sent');
		} catch {
			toast.error(locale === 'ar' ? 'تعذر إرسال جهة الاتصال' : 'Could not send contact');
		}
	};

	const submitEditMessage = async () => {
		if (!editingMessage?.id || !conversationId) return;
		const text = String(editDraft || '').trim();
		if (!text) return;
		try {
			const { data } = await api.put(
				`/whatsapp/conversations/${conversationId}/messages/${editingMessage.id}`,
				{ text },
			);
			if (data?.message) {
				persistConversationMessages(conversationId, current =>
					current.map(item =>
						item.id === editingMessage.id
							? {
									...item,
									...data.message,
									editedAt: data.message.editedAt || new Date().toISOString(),
								}
							: item,
					),
				);
			}
			setEditingMessage(null);
			setEditDraft('');
			toast.success(locale === 'ar' ? 'تم التعديل' : 'Message edited');
		} catch {
			toast.error(locale === 'ar' ? 'تعذر تعديل الرسالة' : 'Could not edit message');
		}
	};

	const chatToolbarActions = useMemo(() => {
		if (!selectedConversation) return [];
		const demoBlocked = demo.settings.enabled;
		const demoChat = isDemoId(conversationId);
		return [
			{
				id: 'media',
				label: mediaSelectMode ? t.cancelSelectMedia : t.selectMedia,
				icon: mediaSelectMode ? X : Images,
				active: mediaSelectMode,
				disabled: demoBlocked,
				onClick: toggleMediaSelectMode,
			},
			{
				id: 'messages',
				label: ticketSelectMode ? t.cancelSelectMessages : t.selectMessages,
				icon: ticketSelectMode ? X : ListChecks,
				active: ticketSelectMode,
				disabled: demoBlocked,
				onClick: toggleTicketSelectMode,
			},
			{
				id: 'pin',
				dividerBefore: true,
				label: selectedConversation.isPinned ? t.unpinChat : t.pinChat,
				icon: Pin,
				iconFill: selectedConversation.isPinned,
				active: selectedConversation.isPinned,
				disabled:
					demoBlocked ||
					pendingPreferenceActions.has(`pin:${selectedConversation.id}`),
				onClick: event => toggleConversationPinned(selectedConversation, event),
			},
			{
				id: 'mute',
				label: selectedConversation.isMuted ? t.unmuteChat : t.muteChat,
				icon: selectedConversation.isMuted ? Bell : BellOff,
				active: selectedConversation.isMuted,
				disabled:
					demoBlocked ||
					pendingPreferenceActions.has(`mute:${selectedConversation.id}`),
				onClick: event => toggleConversationMuted(selectedConversation, event),
			},
			{
				id: 'search',
				dividerBefore: true,
				label: locale === 'ar' ? 'بحث في الشات' : 'Search in chat',
				icon: Search,
				active: inChatSearchOpen,
				disabled: demoBlocked,
				onClick: () => {
					setInChatSearchOpen(current => !current);
					if (inChatSearchOpen) {
						setInChatSearchQuery('');
						setInChatSearchHits([]);
					}
				},
			},
			{
				id: 'unread',
				label: locale === 'ar' ? 'تعليمليم كغير مقروء' : 'Mark as unread',
				icon: EyeOff,
				disabled: demoBlocked || demoChat,
				onClick: () => void markConversationUnread(),
			},
			{
				id: 'favorite',
				dividerBefore: true,
				label: t.favoriteChats,
				icon: Star,
				iconFill: selectedConversation.isFavorite,
				active: selectedConversation.isFavorite,
				disabled:
					demoBlocked ||
					pendingPreferenceActions.has(`favorite:${selectedConversation.id}`),
				onClick: event => toggleConversationFavorite(selectedConversation, event),
			},
			{
				id: 'board',
				label: t.addToBoard,
				description: t.addToBoardHint,
				icon: LayoutGrid,
				disabled: demoBlocked || demoChat || !conversationId || !accountId,
				onClick: () => {
					if (selectedMessageIds.size > 0) {
						setTicketSelectMode(true);
						toast.success(
							locale === 'ar'
								? 'مرّر على «إضافة للوحة المهام» واختر العمود'
								: 'Hover “Add to tasks board” and pick a column',
						);
						return;
					}
					setTicketSelectMode(true);
					toast.success(
						locale === 'ar'
							? 'حدد الرسائل (نص/صوت) ثم مرّر على إضافة للوحة لاختيار العمود'
							: 'Select messages (text/voice), then hover Add to board to pick a column',
					);
				},
			},
			{
				id: 'groups',
				label: t.messageGroups,
				description: t.messageGroupsHint,
				icon: FolderKanban,
				active: messageGroupsOpen || Boolean(activeMessageGroup),
				disabled: demoBlocked || demoChat || !conversationId,
				onClick: toggleMessageGroupsPanel,
			},
			{
				id: 'schedule',
				label: t.scheduleMessage,
				description: t.scheduleMessageHint,
				icon: CalendarClock,
				disabled: demoBlocked || demoChat || !conversationId || !accountId,
				onClick: event => openSchedulePopover(event),
			},
			{
				id: 'group-select',
				label: groupSelectMode ? t.cancelGroupSelect : t.selectForGroup,
				icon: ListChecks,
				active: groupSelectMode,
				disabled: demoBlocked || demoChat || !conversationId,
				onClick: toggleGroupSelectMode,
			},
			{
				id: 'split',
				label: secondaryConversationId ? t.closeSplitChat : t.openSplitChat,
				description: t.splitChat,
				icon: Columns2,
				active: Boolean(secondaryConversationId || splitPickMode),
				disabled: demoBlocked,
				onClick: toggleSplitChat,
			},
		];
	}, [
		accountId,
		activeMessageGroup,
		conversationId,
		demo.settings.enabled,
		groupSelectMode,
		locale,
		mediaSelectMode,
		messageGroupsOpen,
		pendingPreferenceActions,
		secondaryConversationId,
		selectedConversation,
		selectedMessageIds,
		sendSelectedToBoard,
		splitPickMode,
		t,
		ticketSelectMode,
		toggleConversationFavorite,
		toggleConversationMuted,
		toggleConversationPinned,
		toggleGroupSelectMode,
		toggleMediaSelectMode,
		toggleMessageGroupsPanel,
		toggleSplitChat,
		toggleTicketSelectMode,
		inChatSearchOpen,
		markConversationUnread,
		openSchedulePopover,
	]);

	useEffect(() => {
		const leader = createWhatsAppTabLeader();
		tabLeaderRef.current = leader;
		return () => {
			leader.dispose();
			tabLeaderRef.current = null;
		};
	}, []);

	useEffect(() => {
		setInChatSearchOpen(false);
		setInChatSearchQuery('');
		setInChatSearchHits([]);
	}, [conversationId]);

	const assignStaffOptions = useMemo(
		() => [
			{ value: '', label: t.unassign, icon: UserCircle2 },
			...assignableStaff.map(user => {
				const sla = report?.staff?.find(item => item.userId === user.id);
				return {
					value: user.id,
					label: user.name,
					icon: Users,
					description: staffAssignHint(sla, locale) || undefined,
				};
			}),
		],
		[assignableStaff, locale, report?.staff, t.unassign],
	);

	const toggleConversationArchived = async (conversation, event) => {
		event?.stopPropagation?.();
		if (!conversation?.id) return;
		const actionKey = `archive:${conversation.id}`;
		if (pendingPreferenceActions.has(actionKey)) return;
		const previousArchived = Boolean(conversation.isArchived);
		const nextArchived = !conversation.isArchived;
		const isDemoConversation = demo.settings.enabled || isDemoId(conversation.id);
		setPendingPreferenceActions(current => new Set(current).add(actionKey));
		setConversations(current =>
			current.map(item =>
				item.id === conversation.id
					? { ...item, isArchived: nextArchived, isPinned: nextArchived ? false : item.isPinned }
					: item,
			),
		);
		setArchivedCount(current =>
			nextArchived ? current + (previousArchived ? 0 : 1) : Math.max(0, current - 1),
		);
		try {
			if (!isDemoConversation) {
				await api.put(`/whatsapp/conversations/${conversation.id}/archive`, {
					isArchived: nextArchived,
				});
			}
			const cached = accountId
				? conversationsCacheRef.current.get(accountId)
				: null;
			if (cached) {
				conversationsCacheRef.current.set(accountId, {
					...cached,
					items: cached.items.map(item =>
						item.id === conversation.id
							? { ...item, isArchived: nextArchived, isPinned: nextArchived ? false : item.isPinned }
							: item,
					),
					archivedCount: nextArchived
						? (cached.archivedCount || 0) + (previousArchived ? 0 : 1)
						: Math.max(0, (cached.archivedCount || 1) - 1),
					cachedAt: Date.now(),
				});
			}
			toast.success(t.archiveUpdated);
		} catch (error) {
			setConversations(current =>
				current.map(item =>
					item.id === conversation.id
						? { ...item, isArchived: previousArchived }
						: item,
				),
			);
			setArchivedCount(current =>
				previousArchived ? current + (nextArchived ? 0 : 1) : Math.max(0, current - 1),
			);
			toast.error(error.response?.data?.message || 'Could not update archived chat');
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
		if (action === 'openBeside') {
			if (!conversationId) {
				toast.error(
					locale === 'ar'
						? 'افتح شات أولاً ثم اختر شات ثاني بجانبه'
						: 'Open a chat first, then open another beside it',
				);
				return;
			}
			if (conversation.id === conversationId) {
				toast.error(
					locale === 'ar'
						? 'اختر شات مختلف عن الحالي'
						: 'Pick a different chat than the current one',
				);
				return;
			}
			setSecondaryConversationId(conversation.id);
			setSplitPickMode(false);
			toast.success(
				locale === 'ar' ? 'تم فتح الشات الجانبي' : 'Second chat opened',
			);
			return;
		}
		if (action === 'pin') {
			void toggleConversationPinned(conversation);
		} else if (action === 'mute') {
			void toggleConversationMuted(conversation);
		} else if (action === 'favorite') {
			void toggleConversationFavorite(conversation);
		} else if (action === 'archive') {
			void toggleConversationArchived(conversation);
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
		if (tab === 'notifications') {
			setActiveTab('chats');
			return;
		}
		setActiveTab(tab);
		setTabError('');
		if (tab === 'profile') return;
		if (tab === 'emails') return;
		if (!accountId) return;
		const targetAccountId = accountId;
		const requestId = ++tabRequestId.current;
		const isCurrentRequest = () =>
			accountIdRef.current === targetAccountId &&
			tabRequestId.current === requestId;
		if (tab === 'statuses') {
			if (!force) {
				void loadStatuses(targetAccountId, { silent: true });
				return;
			}
			setTabLoading(true);
			setTabError('');
			try {
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
		if (tab === 'channels') {
			if (!targetAccountId) return;
			try {
				const { data } = await api.get(`/whatsapp/accounts/${targetAccountId}/conversations`, {
					params: { page: 1, limit: 100, kind: 'channel' },
				});
				const items = Array.isArray(data?.items)
					? data.items
					: Array.isArray(data)
						? data
						: [];
				if (isCurrentRequest() && items.length) {
					setConversations(current => {
						const map = new Map(current.map(item => [item.id, item]));
						for (const item of items) {
							if (!item?.id) continue;
							map.set(item.id, { ...(map.get(item.id) || {}), ...item });
						}
						return sortConversationsByActivity([...map.values()]);
					});
				}
			} catch (error) {
				if (isCurrentRequest()) {
					setTabError(error.response?.data?.message || 'Could not load channels');
				}
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
			if (tab === 'calls') {
				const { data } = await api.get(`/whatsapp/accounts/${targetAccountId}/logs`);
				if (isCurrentRequest()) setLogs(data || []);
			}
			if (tab === 'reports') {
				const range = reportDateRange(reportPeriodDaysRef.current);
				const { data } = await api.get(
					`/whatsapp/accounts/${targetAccountId}/reports/summary`,
					{ params: range },
				);
				if (isCurrentRequest()) {
					setReport(data);
					setReportStaffDetail(null);
				}
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

	const fetchStaffReportDetail = async userId => {
		if (!accountId || !userId) return;
		setReportStaffDetailLoading(true);
		try {
			const { data } = await api.get(
				`/whatsapp/accounts/${accountId}/reports/staff/${userId}`,
				{ params: reportDateRange(reportPeriodDaysRef.current) },
			);
			setReportStaffDetail(data);
		} catch {
			setReportStaffDetail(null);
		} finally {
			setReportStaffDetailLoading(false);
		}
	};

	const openConversationFromReport = conversationId => {
		if (!conversationId) return;
		setConversationId(conversationId);
		void loadTabData('chats');
	};

	useEffect(() => {
		if (!accountId || (!canManageWhatsApp && !canAssignWhatsApp)) {
			setAssignableStaff([]);
			return undefined;
		}
		let cancelled = false;
		api
			.get(`/whatsapp/accounts/${accountId}/assignable-staff`)
			.then(({ data }) => {
				if (!cancelled) setAssignableStaff(Array.isArray(data) ? data : []);
			})
			.catch(() => {
				if (!cancelled) setAssignableStaff([]);
			});
		return () => {
			cancelled = true;
		};
	}, [accountId, canAssignWhatsApp, canManageWhatsApp]);

	useEffect(() => {
		if (!accountId || (!canManageWhatsApp && !canAssignWhatsApp)) return undefined;
		let cancelled = false;
		api
			.get(`/whatsapp/accounts/${accountId}/reports/summary`, {
				params: reportDateRange(7),
			})
			.then(({ data }) => {
				if (!cancelled) {
					setReport(current => current || data);
				}
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [accountId, canManageWhatsApp, canAssignWhatsApp]);

	useEffect(() => {
		if (!tabReady) return;
		if (window.matchMedia('(max-width: 768px)').matches) {
			const stored =
				readStoredWhatsAppActiveTab(currentUserId) ||
				readStoredWhatsAppActiveTab(null);
			// Mobile defaults to chats only when the user has no saved tab yet.
			if (!stored) void loadTabData('chats');
		}
		// The mobile workspace opens on the familiar WhatsApp chats screen.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tabReady]);

	useEffect(() => {
		if (
			!tabReady ||
			!accountId ||
			!activeTab ||
			!['groups', 'calls', 'reports', 'board', 'settings'].includes(activeTab)
		) {
			return;
		}
		void loadTabData(activeTab);
		// Reload account-scoped tab data whenever the selected account changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountId, tabReady]);

	const openStory = async (status, queue = null, index = 0) => {
		if (!status || !accountId) return;
		const targetAccountId = accountId;
		const requestId = ++storyRequestId.current;
		const playlist = Array.isArray(queue) && queue.length ? queue : [status];
		setStoryQueue(playlist);
		setStoryIndex(index);
		setSelectedStatus(status);
		setStoryReplyDraft('');
		markStatusesViewed(status.id);
		const statusType = String(status.type || '').toLowerCase();
		const isTextStory = statusType === 'text' || statusType === 'chat';
		const textLink = firstMessageLink(status.caption || '');
		const autoEmbed =
			isTextStory && textLink ? getStoryMediaEmbed(textLink.href) : null;
		setStoryViewerEmbed(autoEmbed);
		setLoadingStory(!isTextStory);
		setStoryPaused(Boolean(autoEmbed));
		storyElapsedRef.current = 0;
		setStoryProgress(0);
		setStoryReplayKey(key => key + 1);
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
		const loadMedia = async statusRef => {
			const ids = [statusRef?.id, statusRef?.providerStatusId].filter(Boolean);
			let lastError = null;
			for (const mediaId of ids) {
				try {
					return await fetchStatusMediaBlob(targetAccountId, mediaId);
				} catch (error) {
					lastError = error;
					const message =
						typeof error?.message === 'string' ? error.message : String(error || '');
					if (!/whatsapp status not found/i.test(message)) throw error;
				}
			}
			throw lastError || new Error(t.mediaUnavailable);
		};
		try {
			let data;
			try {
				data = await loadMedia(status);
			} catch (firstError) {
				const firstMessage =
					typeof firstError?.message === 'string'
						? firstError.message
						: String(firstError || '');
				// Stale UUID after refresh/delete races: resync and rematch by provider id.
				if (!/whatsapp status not found/i.test(firstMessage)) throw firstError;
				let refreshedItems =
					statusesCacheRef.current.get(targetAccountId)?.items || [];
				try {
					const { data: refreshed } = await api.get(
						`/whatsapp/accounts/${targetAccountId}/statuses`,
						{ params: { refresh: true }, timeout: 40000 },
					);
					applyStatuses(targetAccountId, refreshed);
					refreshedItems = Array.isArray(refreshed)
						? refreshed
						: refreshed?.items || [];
				} catch {
					/* keep cached list for rematch attempt */
				}
				if (
					requestId !== storyRequestId.current ||
					accountIdRef.current !== targetAccountId
				) {
					return;
				}
				const statusKey = value => {
					const text = String(value || '');
					const broadcast = text.match(/status@broadcast_([^_]+)/i)?.[1];
					if (broadcast) return broadcast.toLowerCase();
					const hex = text.match(/_([0-9A-Fa-f]{10,}|3A[0-9A-Fa-f]+)(?:_|$)/)?.[1];
					if (hex) return hex.toLowerCase();
					return text.toLowerCase();
				};
				const wanted = statusKey(status.providerStatusId || status.id);
				const rematched =
					refreshedItems.find(item => item.id === status.id) ||
					refreshedItems.find(
						item => statusKey(item.providerStatusId || item.id) === wanted,
					) ||
					null;
				if (!rematched) throw firstError;
				setSelectedStatus(rematched);
				data = await loadMedia(rematched);
			}
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
					current?.id === status.id ||
					current?.providerStatusId === status.providerStatusId
						? { ...current, type: 'video' }
						: current,
				);
			}
		} catch (error) {
			if (requestId === storyRequestId.current) {
				setStatusMediaUrl(null);
				const message =
					error.response?.data?.message ||
					(typeof error?.message === 'string' ? error.message : null) ||
					t.mediaUnavailable;
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
			if (storyLoopRef.current && storyQueue.length) {
				openStory(storyQueue[0], storyQueue, 0);
				return;
			}
			closeStory();
			return;
		}
		openStory(storyQueue[next], storyQueue, next);
	};

	const replayCurrentStory = useCallback(() => {
		storyElapsedRef.current = 0;
		setStoryProgress(0);
		if (storyProgressBarRef.current) {
			storyProgressBarRef.current.style.width = '0%';
		}
		const video = storyVideoRef.current;
		if (video) {
			try {
				video.currentTime = 0;
			} catch {
				/* ignore seek errors */
			}
			video.play().catch(() => undefined);
		}
		setStoryPaused(false);
		setStoryReplayKey(key => key + 1);
	}, []);

	const closeStory = () => {
		storyRequestId.current += 1;
		setSelectedStatus(null);
		setStoryQueue([]);
		setStoryIndex(0);
		setStoryReplyDraft('');
		setSendingStoryReply(false);
		setStoryViewerEmbed(null);
		setStatusMediaUrl(null);
		if (statusMediaUrlRef.current) {
			URL.revokeObjectURL(statusMediaUrlRef.current);
			statusMediaUrlRef.current = null;
		}
	};

	const openStoryLink = (href, { embedPreferred = true } = {}) => {
		const embed = embedPreferred ? getStoryMediaEmbed(href) : null;
		if (embed) {
			setStoryViewerEmbed(embed);
			setStoryPaused(true);
			return;
		}
		window.open(href, '_blank', 'noopener,noreferrer');
	};

	const renderStoryLinkedText = (text, className = '') => (
		<p className={className}>
			{messageTextSegments(text).map((segment, index) =>
				segment.type === 'link' ? (
					<button
						key={`${segment.href}-${index}`}
						type="button"
						dir="ltr"
						onClick={event => {
							event.preventDefault();
							event.stopPropagation();
							openStoryLink(segment.href);
						}}
						className="break-all font-semibold text-sky-200 underline decoration-sky-200/50 underline-offset-2 transition-colors hover:text-white hover:decoration-white"
					>
						{segment.text}
					</button>
				) : (
					<span key={`text-${index}`}>{segment.text}</span>
				),
			)}
		</p>
	);

	const replyToCurrentStory = async event => {
		event?.preventDefault?.();
		if (!accountId || !selectedStatus || sendingStoryReply) return;
		if (selectedStatus.isOwn) {
			toast.error(t.storyReplyUnavailable);
			return;
		}
		const text = storyReplyDraft.trim();
		if (!text) return;
		if (!canUseWhatsApp || demo.settings.enabled) {
			toast.error(t.storyReplyUnavailable);
			return;
		}
		const senderWaId = String(selectedStatus.senderWaId || '').trim();
		if (!senderWaId) {
			toast.error(t.storyReplyUnavailable);
			return;
		}
		setSendingStoryReply(true);
		setStoryPaused(true);
		try {
			let targetConversation =
				effectiveConversations.find(conversation => {
					const identities = [
						conversation?.providerChatId,
						conversation?.contact?.waId,
						conversation?.contact?.phoneNumber,
					];
					return identities.some(
						identity =>
							normalizeWhatsAppIdentity(identity) ===
							normalizeWhatsAppIdentity(senderWaId),
					);
				}) || null;
			if (!targetConversation) {
				const { data } = await api.post(
					`/whatsapp/accounts/${accountId}/conversations/open`,
					{
						chatId: senderWaId,
						title: selectedStatus.contactName || undefined,
					},
				);
				targetConversation = data;
				if (data?.id) {
					setConversations(current => {
						if (current.some(item => item.id === data.id)) return current;
						return [data, ...current];
					});
				}
			}
			if (!targetConversation?.id) throw new Error(t.storyReplyUnavailable);
			await api.post(`/whatsapp/conversations/${targetConversation.id}/messages`, {
				type: 'text',
				text,
			});
			setStoryReplyDraft('');
			toast.success(t.storyReplySent);
			setStoryPaused(false);
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
					error.message ||
					t.storyReplyUnavailable,
			);
		} finally {
			setSendingStoryReply(false);
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
		storyLoopRef.current = storyLoop;
	}, [storyLoop]);

	useEffect(() => {
		if (!selectedStatus || loadingStory) {
			storyElapsedRef.current = 0;
			setStoryProgress(0);
			if (storyProgressBarRef.current) {
				storyProgressBarRef.current.style.width = '0%';
			}
			return undefined;
		}
		if (storyPaused) return undefined;
		storyStartRef.current = Date.now() - storyElapsedRef.current;
		let frameId = 0;
		const tick = () => {
			const elapsed = Date.now() - storyStartRef.current;
			storyElapsedRef.current = elapsed;
			const pct = Math.min(100, (elapsed / storyDurationMs) * 100);
			if (storyProgressBarRef.current) {
				storyProgressBarRef.current.style.width = `${pct}%`;
			}
			if (pct >= 100) {
				if (storyLoopRef.current) {
					replayCurrentStory();
					return;
				}
				goStory(1);
				return;
			}
			frameId = window.requestAnimationFrame(tick);
		};
		frameId = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(frameId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedStatus?.id, loadingStory, storyDurationMs, storyPaused, storyReplayKey]);

	useLayoutEffect(() => {
		const el = storyProgressBarRef.current;
		if (!el) return;
		if (!selectedStatus || loadingStory) {
			el.style.width = '0%';
			return;
		}
		const pct = Math.min(
			100,
			(storyElapsedRef.current / Math.max(storyDurationMs, 1)) * 100,
		);
		el.style.width = `${pct}%`;
	}, [selectedStatus?.id, storyIndex, loadingStory, storyPaused, storyDurationMs]);

	useEffect(() => {
		const video = storyVideoRef.current;
		if (!video) return;
		if (storyPaused) {
			video.pause();
		} else {
			video.play().catch(() => undefined);
		}
	}, [storyPaused, selectedStatus?.id, statusMediaUrl]);

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
			try {
				const { data } = await api.get(
					`/whatsapp/accounts/${targetAccountId}/assignable-staff`,
				);
				setAssignableStaff(Array.isArray(data) ? data : []);
			} catch {
				/* keep previous assignable list */
			}
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
			setConversationUnreadCount(conversationId, 0);
			notifyWhatsAppUnreadChanged();
			if (data?.providerReceiptSent) toast.success(t.markedRead);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not send read receipt');
		}
	};

	const accStatus = selectedAccount ? statusMeta(selectedAccount.status, t, selectedAccount) : null;
	const draftPresentation = messageTextPresentation(draft);

	if (!tabReady || !activeTab) {
		return (
			<div
				className={`wa-mobile-shell wa-web-desktop relative mx-auto flex h-dvh w-full max-w-none flex-col overflow-hidden bg-white text-slate-900 min-[769px]:h-[calc(100vh-25px)] min-[769px]:bg-transparent dark:bg-slate-950 dark:text-slate-100 ${locale === 'ar' ? 'font-ar' : ''}`}
				lang={locale}
				dir={locale === 'ar' ? 'rtl' : 'ltr'}
			>
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6">
					<div className="wa-loading-mark">
						<Loader2 size={26} className="animate-spin" />
					</div>
					<p className="text-sm font-medium text-[#667781]">
						{t.loading || (locale === 'ar' ? 'جارِ التحميل…' : 'Loading…')}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`wa-mobile-shell wa-web-desktop relative mx-auto flex h-dvh w-full max-w-none flex-col overflow-hidden bg-[#0b141a] text-slate-900 min-[769px]:h-[calc(100vh-25px)] min-[769px]:gap-0 min-[769px]:overflow-hidden min-[769px]:bg-transparent dark:text-slate-100 ${locale === 'ar' ? 'font-ar' : ''}`}
			lang={locale}
			dir={locale === 'ar' ? 'rtl' : 'ltr'}
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
			{!(isConversationWorkspaceTab(activeTab) && conversationId) && (
				<MobileWhatsAppHeader
					title={
						activeTab === 'statuses'
							? t.updates
							: activeTab === 'groups'
								? t.groups
								: t[activeTab] || t.title
					}
					onSearch={() => {
						if (!isConversationWorkspaceTab(activeTab)) void loadTabData('chats');
						setSearchOpen(true);
					}}
					onCamera={() => void loadTabData('statuses')}
					onMore={() => setMobileMenuOpen(current => !current)}
					showTitle={!isConversationWorkspaceTab(activeTab)}
					scrolled={isConversationWorkspaceTab(activeTab) && mobileHeaderScrolled}
				/>
			)}
			<MobileOverflowMenu
				open={mobileMenuOpen}
				tabs={availableTabs.filter(([key]) => !['chats', 'channels', 'statuses', 'groups'].includes(key))}
				labels={t}
				onSelect={tab => void loadTabData(tab)}
				onProfile={() => void loadTabData('profile')}
				onClose={() => setMobileMenuOpen(false)}
			/>
			<MobileAttachmentSheet
				open={attachmentSheetOpen}
				onClose={() => setAttachmentSheetOpen(false)}
				onAction={handleAttachmentAction}
				locale={locale}
				anchorRef={attachButtonRef}
				aiEnabled={!demo.settings.enabled && canUseWhatsApp}
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
				settingsEnabled={Boolean(whatsappAi.settings?.enabled)}
				onEnableAi={() =>
					whatsappAi
						.saveSettings({
							enabled: true,
							provider: 'ai-free',
						})
						.catch(() => {
							toast.error(
								locale === 'ar'
									? 'تعذر تفعيل اقتراحات الذكاء الاصطناعي'
									: 'Could not enable AI suggestions',
							);
						})
				}
				onDisableAi={() =>
					whatsappAi
						.saveSettings({
							enabled: false,
						})
						.catch(() => {
							toast.error(
								locale === 'ar'
									? 'تعذر إيقاف اقتراحات الذكاء الاصطناعي'
									: 'Could not disable AI suggestions',
							);
						})
				}
			/>
			<StickersPanel
				open={stickerPanelOpen}
				onClose={() => setStickerPanelOpen(false)}
				onInsertEmoji={emoji => setDraft(current => `${current}${emoji}`)}
				onSendSticker={file => sendFile(file, 'sticker')}
				accountId={accountId}
				locale={locale}
				anchorRef={stickerButtonRef}
			/>
			<AiImageComposerPanel
				open={aiImagePanelOpen}
				onClose={() => setAiImagePanelOpen(false)}
				onSendImage={file => sendFile(file, 'image')}
				accountId={accountId}
				locale={locale}
				anchorRef={aiImageButtonRef}
				disabled={!canComposeInConversation || sending}
			/>
			<PhoneSyncGate
				open={syncPhoneClosed && conversations.length === 0}
				progress={syncProgress}
				stage={syncStage}
				phoneClosed={syncPhoneClosed}
				labels={t}
				locale={locale}
				onDismiss={() => {
					setSyncPhoneClosed(false);
					setSyncingInbox(false);
					setSyncProgress(0);
					setSyncStage('');
				}}
				onRetry={() => {
					setSyncPhoneClosed(false);
					void connectAccount(undefined)
						.then(() => syncAccount(false))
						.catch(() => {
							setSyncPhoneClosed(true);
							setSyncingInbox(true);
						});
				}}
			/>
			{muteDurationOpen && muteTargetConversation ? (
				<div className="wa-modal-backdrop" role="dialog" aria-modal="true">
					<div className="wa-modal-sheet">
						<p className="wa-modal-sheet__title">
							{locale === 'ar' ? 'كتم الإشعارات' : 'Mute notifications'}
						</p>
						<div className="wa-modal-sheet__actions">
							{[
								{ minutes: 60 * 8, label: locale === 'ar' ? '٨ ساعات' : '8 hours' },
								{ minutes: 60 * 24, label: locale === 'ar' ? 'يوم واحد' : '1 day' },
								{ minutes: 60 * 24 * 7, label: locale === 'ar' ? 'أسبوع' : '1 week' },
								{ minutes: null, label: locale === 'ar' ? 'دائماً' : 'Always' },
							].map(option => (
								<button
									key={String(option.minutes)}
									type="button"
									className="wa-modal-sheet__option"
									onClick={() => void applyMuteDuration(muteTargetConversation, option.minutes)}
								>
									{option.label}
								</button>
							))}
							<button
								type="button"
								className="wa-modal-sheet__cancel"
								onClick={() => {
									setMuteDurationOpen(false);
									setMuteTargetConversation(null);
								}}
							>
								{locale === 'ar' ? 'إلغاء' : 'Cancel'}
							</button>
						</div>
					</div>
				</div>
			) : null}
			{shareContactOpen ? (
				<div className="wa-modal-backdrop" role="dialog" aria-modal="true">
					<div className="wa-modal-sheet wa-modal-sheet--list">
						<div className="wa-modal-sheet__head">
							<p className="wa-modal-sheet__title">
								{locale === 'ar' ? 'إرسال جهة اتصال' : 'Send contact'}
							</p>
							<button
								type="button"
								onClick={() => setShareContactOpen(false)}
								className="wa-modal-sheet__icon-close"
								aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
							>
								<X size={16} />
							</button>
						</div>
						<div className="wa-modal-sheet__scroll">
							{conversations
								.filter(item => item.id !== conversationId && !String(item.providerChatId || '').endsWith('@g.us'))
								.slice(0, 40)
								.map(item => (
									<button
										key={item.id}
										type="button"
										className="wa-modal-sheet__list-item"
										onClick={() => void shareContactFromConversation(item)}
									>
										<span className="wa-modal-sheet__avatar">
											<User size={16} />
										</span>
										<span className="wa-modal-sheet__list-label">
											{conversationTitle(item)}
										</span>
									</button>
								))}
						</div>
					</div>
				</div>
			) : null}
			{editingMessage ? (
				<div className="wa-modal-backdrop" role="dialog" aria-modal="true">
					<div className="wa-modal-sheet">
						<p className="wa-modal-sheet__title">
							{locale === 'ar' ? 'تعديل الرسالة' : 'Edit message'}
						</p>
						<textarea
							value={editDraft}
							onChange={event => setEditDraft(event.target.value)}
							rows={4}
							className="wa-modal-sheet__textarea"
						/>
						<div className="wa-modal-sheet__footer">
							<button type="button" className="wa-modal-sheet__cancel" onClick={() => setEditingMessage(null)}>
								{locale === 'ar' ? 'إلغاء' : 'Cancel'}
							</button>
							<button
								type="button"
								className="wa-primary-btn"
								onClick={() => void submitEditMessage()}
							>
								{locale === 'ar' ? 'حفظ' : 'Save'}
							</button>
						</div>
					</div>
				</div>
			) : null}
			{/* Desktop nav lives in the left rail — no top PageHeader on web. */}
			<div className="wa-web-workspace min-h-0 flex-1 max-[768px]:contents min-[769px]:flex min-[769px]:overflow-hidden">
				<WhatsAppDesktopRail
					activeTab={activeTab}
					onSelect={tab => void loadTabData(tab)}
					labels={t}
					unreadCount={unreadConversationCount}
					channelUnreadCount={unreadChannelCount}
					locale={locale}
					connected={isAccountConnected}
					showSettings={canManageWhatsApp || isAdmin}
					showAccounts
					showReports
					showBoard={canManageWhatsApp || canAssignWhatsApp || isAdmin}
					onOpenSettings={() => void loadTabData('settings')}
					onOpenProfile={() => void loadTabData('profile')}
				/>
			<div className={`wa-web-main min-h-0 flex-1 max-[768px]:min-h-0 ${
				activeTab === 'board'
					? 'wa-board-workspace'
					: isConversationWorkspaceTab(activeTab)
						? 'overflow-y-auto nice-scroll wa-chat-workspace-scroll'
						: 'overflow-y-auto nice-scroll'
			}`}>
				{/* Compact account switcher for desktop utility tabs (replaces PageHeader actions). */}
				{['accounts', 'reports', 'settings', 'profile'].includes(activeTab) ? (
					<div className="mb-4 hidden items-center justify-between gap-3 min-[769px]:flex">
						<div>
							<h2 className="text-lg font-black text-slate-900 dark:text-white">
								{t[activeTab] || t.title}
							</h2>
							<p className="text-xs text-slate-500">{t.subtitle}</p>
						</div>
						<div className="flex flex-wrap items-center gap-2.5">
							{demo.settings.enabled && !demo.settings.featureFlags.hideDemoBadge && (
								<span className="rounded-[14px] border-2 border-amber-400 bg-amber-500 px-3.5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg ring-4 ring-amber-200/70 dark:ring-amber-900/40">
									{locale === 'ar' ? 'وضع تجريبي — ليس واتساب الحقيقي' : 'DEMO — not live WhatsApp'}
								</span>
							)}
							{accounts.length > 0 && (
								<AccountSwitcherDropdown
									accounts={accounts}
									value={accountId}
									onChange={selectWhatsAppAccount}
									labels={t}
									statusLabels={t}
								/>
							)}
						</div>
					</div>
				) : null}
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
								className="wa-primary-btn"
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
									const meta = statusMeta(account.status, t, account);
									const active = account.id === accountId;
									return (
										<button
											key={account.id}
											onClick={() => selectWhatsAppAccount(account.id)}
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
											<span
												className={`flex max-w-[42%] shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${meta.bg} ${meta.text}`}
												title={meta.hint || meta.label}
											>
												<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
												<span className="min-w-0 truncate">{meta.label}</span>
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
												{canUseWhatsApp && selectedAccount.status === 'connected' && (
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
														onClick={() =>
															connectAccount(undefined, {
																force: ['connecting', 'qr_pending', 'error'].includes(
																	selectedAccount.status,
																),
															})
														}
														disabled={accountBusy}
														className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-600 shadow-md transition-transform hover:-translate-y-px disabled:opacity-50"
													>
														{accountBusy ? (
															<Loader2 size={15} className="animate-spin" />
														) : (
															<Wifi size={15} />
														)}{' '}
														{['connecting', 'qr_pending', 'error'].includes(
															selectedAccount.status,
														)
															? t.restartConnection
															: t.connect}
													</button>
												))}
												{isAdmin && canManageWhatsApp && (
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
												)}
											</div>
										</div>
										{selectedAccount.status === 'error' && (
											<p className="mt-3 text-sm text-amber-100/95">
												{selectedAccount.lastError || t.restartConnectionHint}
											</p>
										)}
										{selectedAccount.status === 'connecting' && !qr && !pairingCode && (
											<p className="mt-3 text-sm text-white/80">
												{accStatus?.hint || t.syncingPhone}
											</p>
										)}
									</div>
									<div className="space-y-5 p-5">
										{canManageWhatsApp && selectedAccount.status !== 'connected' && (
											<WhatsAppAccountLinkPanel
												labels={t}
												account={selectedAccount}
												linkMode={linkMode}
												onSelectMode={mode => {
													setLinkMode(mode);
													if (mode === 'qr') {
														setPairingCode(null);
														connectAccount(undefined, { mode: 'qr', force: true });
													}
													if (mode == null) {
														setQr(null);
														setPairingCode(null);
													}
												}}
												linkPhoneNumber={linkPhoneNumber}
												onLinkPhoneNumberChange={setLinkPhoneNumber}
												phoneValid={linkPhoneValid}
												phoneTouched={linkPhoneTouched}
												accountBusy={accountBusy}
												qr={qr}
												pairingCode={pairingCode}
												canManage={canManageWhatsApp}
												onConnectQr={() =>
													connectAccount(undefined, { mode: 'qr', force: true })
												}
												onConnectPhone={() => {
													if (!parsedLinkPhone) {
														toast.error(t.phoneNumberInvalid);
														return;
													}
													setLinkMode('phone');
													connectAccount(parsedLinkPhone.number);
												}}
												onChangePhone={() => {
													setPairingCode(null);
													setLinkMode('phone');
												}}
												syncProgress={syncProgress}
												conversationCount={conversations.length}
											/>
										)}
										{selectedAccount.status === 'connected' && (
											<div className="space-y-4">
												{(selectedAccount.syncPhase === 'hydrating' ||
													(syncingInbox && conversations.length === 0)) && (
													<WhatsAppRestoreProgress
														labels={t}
														account={selectedAccount}
														syncProgress={syncProgress}
														conversationCount={conversations.length}
													/>
												)}
												<div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
													<p className="text-xs font-bold uppercase tracking-wide text-slate-400">
														{t.accounts}
													</p>
													<p className="mt-1 text-sm font-black text-emerald-600">{accStatus?.label}</p>
													{selectedAccount.phoneNumber ? (
														<p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200" dir="ltr">
															{selectedAccount.phoneNumber}
														</p>
													) : null}
													<p className="mt-3 text-xs text-slate-500">{t.connectionMethodLabel}</p>
													<p className="text-sm font-bold text-slate-900 dark:text-white">
														{selectedAccount.connectionMethod === 'pairing_code'
															? t.connectionMethodPhone
															: t.connectionMethodQr}
													</p>
													<div className="mt-4 flex flex-wrap gap-2">
														<button
															type="button"
															onClick={() => setActiveTab('chats')}
															className="rounded-xl bg-[var(--color-primary-500)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary-600)]"
														>
															{t.openWhatsAppInbox}
														</button>
														{canManageWhatsApp && (
															<button
																type="button"
																onClick={() => disconnectAccount(false)}
																className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
															>
																{t.disconnect}
															</button>
														)}
													</div>
												</div>
												<div className="grid gap-3 sm:grid-cols-3">
													<StatTile icon={ShieldCheck} label={t.provider} value={selectedAccount.providerName} bg="bg-[var(--color-primary-50)]" color="var(--color-primary-500)" />
													<StatTile icon={accStatus?.dot === 'bg-emerald-500' ? CheckCircle2 : AlertTriangle} label={t.status} value={accStatus?.label} bg={accStatus?.bg} color={accStatus?.dot === 'bg-emerald-500' ? '#10b981' : accStatus?.dot === 'bg-rose-500' ? '#f43f5e' : '#f59e0b'} />
													<StatTile icon={Clock} label={t.lastConnected} value={selectedAccount.lastConnectedAt ? new Date(selectedAccount.lastConnectedAt).toLocaleString() : '—'} bg="bg-[var(--color-secondary-50)]" color="var(--color-secondary-500)" />
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</Card>
					</div>
				)} 

				{isConversationWorkspaceTab(activeTab) && (
					<Card
						className={`wa-chat-card grid h-full min-h-[600px] overflow-hidden min-[769px]:overflow-visible max-[768px]:min-h-0 max-[768px]:rounded-none max-[768px]:border-0 ${
							chatListCollapsed ? 'is-list-collapsed' : ''
						} ${chatListResizing ? 'is-list-resizing' : ''} ${
							secondaryConversationId
								? chatListCollapsed
									? 'min-[769px]:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)]'
									: 'min-[769px]:grid-cols-[var(--wa-chat-list-width)_minmax(0,1fr)_minmax(0,1fr)]'
								: chatListCollapsed
									? 'min-[769px]:grid-cols-[72px_1fr]'
									: 'min-[769px]:grid-cols-[var(--wa-chat-list-width)_1fr]'
						}`}
						style={
							!chatListCollapsed
								? { ['--wa-chat-list-width']: `${chatListWidth}px` }
								: undefined
						}
					>
						<aside className={`wa-chat-list ${chatListCollapsed ? 'is-collapsed' : ''} ${conversationId ? 'hidden min-[769px]:flex' : 'flex'} min-h-0 flex-col border-e border-slate-200 dark:border-slate-700`}>
							{!chatListCollapsed ? (
								<div
									role="separator"
									aria-orientation="vertical"
									aria-label={t.resizeChatList}
									title={t.resizeChatList}
									onPointerDown={beginChatListResize}
									className="wa-chat-list-resize-handle hidden min-[769px]:block"
								/>
							) : null}
							<button
								type="button"
								onClick={() => {
									setChatListCollapsed(current => !current);
									if (!chatListCollapsed) {
										setSearchOpen(false);
										setChatSearch('');
									}
								}}
								aria-label={chatListCollapsed ? t.expandChatList : t.collapseChatList}
								title={chatListCollapsed ? t.expandChatList : t.collapseChatList}
								className={`wa-chat-list-collapse-float hidden min-[769px]:grid ${
									chatListCollapsed ? '' : 'is-docked-hidden'
								}`}
							>
								{chatListCollapsed
									? locale === 'ar'
										? <PanelRight size={17} strokeWidth={2.1} />
										: <PanelLeft size={17} strokeWidth={2.1} />
									: locale === 'ar'
										? <PanelRightClose size={17} strokeWidth={2.1} />
										: <PanelLeftClose size={17} strokeWidth={2.1} />}
							</button>
							<div
								className="wa-chat-list-scroll min-h-0 flex-1 min-[769px]:flex min-[769px]:flex-col min-[769px]:overflow-hidden"
								onScroll={event => setMobileHeaderScrolled(event.currentTarget.scrollTop > 0)}
							>
								<div className="wa-chat-list-header border-b border-slate-100 p-3 dark:border-slate-800">
									{splitPickMode && (
										<div className="mb-2 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 py-2 text-[11px] font-semibold text-[var(--color-primary-800)]">
											{t.splitPickHint}
											<button
												type="button"
												className="ms-2 underline"
												onClick={() => setSplitPickMode(false)}
											>
												{locale === 'ar' ? 'إلغاء' : 'Cancel'}
											</button>
										</div>
									)}
									{cloneVoicePickMode && (
										<div className="mb-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
											{t.cloneVoicePickHint}
											<div className="mt-1.5 flex flex-wrap gap-2">
												<button
													type="button"
													className="rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white"
													onClick={finishCloneVoicePick}
												>
													{t.cloneVoicePickDone}
													{pendingCloneSampleCount > 0
														? ` (${pendingCloneSampleCount})`
														: ''}
												</button>
												<button
													type="button"
													className="underline opacity-80"
													onClick={cancelCloneVoicePick}
												>
													{t.cloneVoicePickCancel}
												</button>
											</div>
										</div>
									)}
									{/* {pushPermission !== 'granted' &&
										pushPermission !== 'unsupported' &&
										pushPermission !== 'checking' && (
										<div
											className={`wa-push-nudge ${
												pushPermission === 'denied' ? 'is-denied' : ''
											}`}
										>
											<div className="wa-push-nudge__row">
												<span className="wa-push-nudge__icon" aria-hidden="true">
													<span className="wa-push-nudge__ping" />
													<Bell size={16} strokeWidth={2.3} />
												</span>
												<div className="wa-push-nudge__copy">
													<p className="wa-push-nudge__title">{t.pushNotifications}</p>
													<p className="wa-push-nudge__hint">
														{pushPermission === 'denied'
															? t.pushDenied
															: t.pushNotificationsHint}
													</p>
												</div>
											</div>
											{pushPermission !== 'denied' && (
												<button
													type="button"
													disabled={enablingPush}
													onClick={() => subscribeToWhatsAppPush(true)}
													className="wa-push-nudge__cta"
												>
													{enablingPush ? (
														<Loader2 size={13} className="animate-spin" />
													) : (
														<Sparkles size={13} />
													)}
													<span>{enablingPush ? t.loading : t.enablePush}</span>
												</button>
											)}
										</div>
									)} */}
									<div className={`wa-desktop-chat-list-tools ${searchOpen ? 'is-searching' : ''}`}>
										<div className="wa-desktop-chat-list-heading">
											<div className="wa-desktop-chat-list-title-wrap">
												<h2 className="wa-desktop-chat-list-title">
													{activeTab === 'channels' ? t.channels : t.chats}
												</h2>
												{(activeTab === 'channels'
													? unreadChannelCount
													: unreadConversationCount) > 0 ? (
													<span
														className="wa-unread-total"
														title={t.unreadMessagesLong.replace(
															'{count}',
															String(
																activeTab === 'channels'
																	? unreadChannelCount
																	: unreadConversationCount,
															),
														)}
													>
														{(activeTab === 'channels'
															? unreadChannelCount
															: unreadConversationCount) > 99
															? '99+'
															: activeTab === 'channels'
																? unreadChannelCount
																: unreadConversationCount}
													</span>
												) : null}
											</div>
										</div>
										<div className="wa-desktop-chat-list-actions">
											<WhatsAppPrivacyBlurControl
												value={privacyBlur}
												onChange={setPrivacyBlur}
												labels={{
													blurToggle: t.blurToggle,
													blurToggleHint: t.blurToggleHint,
													blurTitle: t.blurTitle,
													blurHint: t.blurHint,
													blurOptions: t.blurOptions,
													blurList: t.blurList,
													blurListHint: t.blurListHint,
													blurThread: t.blurThread,
													blurThreadHint: t.blurThreadHint,
													blurHover: t.blurHover,
													blurHoverHint: t.blurHoverHint,
													blurPersist: t.blurPersist,
													blurPersistHint: t.blurPersistHint,
												}}
											/>
											<button
												type="button"
												onClick={() => {
													setChatListCollapsed(true);
													setSearchOpen(false);
													setChatSearch('');
												}}
												aria-label={t.collapseChatList}
												title={t.collapseChatList}
												className="wa-header-icon-btn hidden min-[769px]:grid"
											>
												{locale === 'ar' ? (
													<PanelRightClose size={18} strokeWidth={2.1} />
												) : (
													<PanelLeftClose size={18} strokeWidth={2.1} />
												)}
											</button>
										</div>
									</div>
									<div className="wa-desktop-search-inline wa-desktop-search-always mb-2.5 hidden min-[769px]:flex">
										<Search size={19} className="wa-desktop-search-inline__icon" />
										<input
											ref={searchInputRef}
											className="outline-none"
											aria-label={t.search}
											value={chatSearch}
											onChange={event => setChatSearch(event.target.value)}
											placeholder={
												locale === 'ar'
													? 'ابحث أو ابدأ محادثة جديدة'
													: 'Search or start a new chat'
											}
										/>
										{searchingConversations ? (
											<Loader2 size={13} className="wa-desktop-search-inline__spin" />
										) : null}
										{chatSearch ? (
											<button
												type="button"
												className="wa-desktop-search-inline__close"
												aria-label={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
												onClick={() => setChatSearch('')}
											>
												<X size={12} strokeWidth={2.4} />
											</button>
										) : null}
									</div>
									<div className="mb-1.5 hidden min-[769px]:block">
										<ConversationFilterDropdown
											variant="pills"
											value={conversationFilter}
											onChange={setConversationFilter}
											labels={{
												all: t.allChats,
												unread: t.unreadChats,
												favorites: t.favoriteChats,
												important: t.importantChats,
											}}
										/>
									</div>
									<div className="wa-mobile-chat-tools hidden">
										<h1 className="mb-2 title-whatsapp flex items-center gap-2">
											<span>{activeTab === 'channels' ? t.channels : t.chats}</span>
											{(activeTab === 'channels'
												? unreadChannelCount
												: unreadConversationCount) > 0 ? (
												<span
													className="wa-unread-total"
													title={t.unreadMessagesLong.replace(
														'{count}',
														String(
															activeTab === 'channels'
																? unreadChannelCount
																: unreadConversationCount,
														),
													)}
												>
													{(activeTab === 'channels'
														? unreadChannelCount
														: unreadConversationCount) > 99
														? '99+'
														: activeTab === 'channels'
															? unreadChannelCount
															: unreadConversationCount}
												</span>
											) : null}
										</h1>
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
												['important', t.importantChats],
											].map(([value, label]) => (
												<button
													key={value}
													type="button"
													onClick={() => setConversationFilter(value)}
													className={`h-[28px] shrink-0 rounded-[19px] px-3 text-[11px] font-semibold ${conversationFilter === value
														? 'bg-[#D9FDD3] text-[#008069]'
														: 'bg-[#F0F2F5] text-[#54656F]'
														}`}
												>
													{label}
												</button>
											))}
											<button type="button" onClick={() => void loadTabData('groups')} className="h-[28px] shrink-0 rounded-[19px] bg-[#F0F2F5] px-3 text-[11px] font-semibold text-[#54656F]">
												{t.groups}
											</button>
											<button
												type="button"
												onClick={() => void loadTabData('channels')}
												className={`h-[28px] shrink-0 rounded-[19px] px-3 text-[11px] font-semibold ${
													activeTab === 'channels'
														? 'bg-[#D9FDD3] text-[#008069]'
														: 'bg-[#F0F2F5] text-[#54656F]'
												}`}
											>
												{t.channels}
											</button>
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
													className="absolute inset-y-0 start-0 h-full rounded-full transition-all duration-500"
													style={{
														width: `${Math.max(1, Math.min(100, Number(syncProgress) || 1))}%`,
														background: GRADIENT,
													}}
												/>
												<span
													className="wa-sync-progress-badge"
													style={{
														insetInlineStart: `${Math.max(6, Math.min(94, Number(syncProgress) || 1))}%`,
													}}
												>
													{Math.max(1, Math.min(100, Number(syncProgress) || 1))}%
												</span>
											</div>
										</div>
									)}
								</div>
								<div
									className="wa-conversation-list min-h-0 flex-1 overflow-y-auto p-2 nice-scroll"
									onScroll={event => {
										chatListWindow.onScroll(event);
										listScrollPrefetchBlockedUntilRef.current = Date.now() + 280;
										if (hoverPrefetchTimerRef.current) {
											window.clearTimeout(hoverPrefetchTimerRef.current);
											hoverPrefetchTimerRef.current = null;
										}
										if (collapsedChatTip) setCollapsedChatTip(null);
										const node = event.currentTarget;
										if (
											!accountId ||
											loadingMoreConversations ||
											conversations.length >= conversationTotal
										) {
											return;
										}
										const nearBottom =
											node.scrollHeight - node.scrollTop - node.clientHeight < 120;
										if (nearBottom) void loadMoreConversations();
									}}
								>
									{activeTab !== 'channels' && conversationFilter === 'archived' ? (
										<button
											type="button"
											className="wa-archived-row"
											onClick={() => {
												setConversationFilter('all');
												if (accountId) {
													void loadConversations(accountId, 1, false, {
														force: true,
														filter: 'all',
													});
												}
											}}
										>
											<ChevronLeft size={20} className="wa-archived-row__back" />
											<span className="wa-archived-row__title">{t.archived}</span>
										</button>
									) : activeTab !== 'channels' ? (
										<button
											type="button"
											className="wa-archived-row"
											onClick={() => setConversationFilter('archived')}
										>
											<span className="wa-archived-row__icon" aria-hidden="true">
												<Archive size={20} />
											</span>
											<span className="wa-archived-row__title">{t.archived}</span>
											{archivedChatsCount > 0 ? (
												<span className="wa-archived-row__count">{archivedChatsCount}</span>
											) : null}
											<ChevronRight size={18} className="wa-archived-row__chevron" />
										</button>
									) : null}
									{filteredConversations.length === 0 ? (
										!inboxReady ||
										syncingInbox ||
										(!demo.settings.enabled &&
											!isAccountConnected &&
											!sessionProbeDone &&
											!qr &&
											!qrExpired) ? (
											<div className="wa-inbox-bootstrap space-y-2 p-1" role="status" aria-live="polite">
												{Array.from({ length: 8 }).map((_, index) => (
													<div
														key={`wa-boot-skel-${index}`}
														className="flex animate-pulse items-center gap-3 rounded-xl p-3"
													>
														<div className="h-11 w-11 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
														<div className="min-w-0 flex-1 space-y-2">
															<div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
															<div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
														</div>
													</div>
												))}
												<p className="flex items-center justify-center gap-2 px-2 pt-2 text-center text-[11px] font-semibold text-slate-500">
													<Loader2 size={13} className="animate-spin" />
													{!inboxReady
														? t.loadingInbox
														: syncingInbox
															? syncStage === 'prefetch_history'
																? locale === 'ar'
																	? 'جاري تجهيز أحدث الرسائل…'
																	: 'Warming recent message history…'
																: syncStage === 'fetching_chats' ||
																	  (syncProgress >= 25 && syncProgress <= 45)
																	? t.syncingChatsFetching
																	: t.syncingChats
															: t.checkingSession}
												</p>
											</div>
										) : syncingInbox ? (
											<div className="space-y-2 p-1">
												{Array.from({ length: 8 }).map((_, index) => (
													<div
														key={`wa-sync-skel-${index}`}
														className="flex animate-pulse items-center gap-3 rounded-xl p-3"
													>
														<div className="h-11 w-11 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
														<div className="min-w-0 flex-1 space-y-2">
															<div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
															<div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
														</div>
													</div>
												))}
												<p className="px-2 pt-1 text-center text-[11px] font-semibold text-slate-500">
													{syncStage === 'prefetch_history'
														? locale === 'ar'
															? 'جاري تجهيز أحدث الرسائل…'
															: 'Warming recent message history…'
														: syncStage === 'fetching_chats' ||
															  (syncProgress >= 25 && syncProgress <= 45)
															? t.syncingChatsFetching
															: t.syncingChats}
												</p>
											</div>
										) : !isAccountConnected && !demo.settings.enabled ? (
										<div className="wa-chat-list-empty flex h-full min-h-[280px] flex-col items-center justify-center gap-4 px-4 py-8 text-center" title={t.connectToSeeChats}>
											{(accountBusy ||
												['connecting', 'qr_pending'].includes(
													selectedAccount?.status,
												)) &&
											!qr &&
											!qrExpired ? (
												<>
													<Loader2
														size={28}
														className="animate-spin text-[var(--color-primary-500)]"
													/>
													<p className="text-sm font-semibold text-slate-500">
														{t.autoConnecting}
													</p>
												</>
											) : qr ? (
												<>
													<p className="text-sm font-black text-slate-700">{t.scanQr}</p>
													<div className="rounded-2xl bg-white p-3 shadow-md dark:bg-slate-800">
														{qr.startsWith('data:image') ? (
															<img
																src={qr}
																alt="WhatsApp QR"
																className="aspect-square w-44 rounded-lg"
															/>
														) : (
															<p className="max-w-44 break-all text-xs">{qr}</p>
														)}
													</div>
													<p className="max-w-xs text-xs text-slate-500">{t.scanQrHint}</p>
												</>
											) : (
												<>
													{qrExpired ? (
														<p className="text-sm font-semibold text-slate-600">{t.qrExpired}</p>
													) : (
														<p className="text-sm font-semibold text-slate-500">
															{activeTab === 'channels'
																? t.connectToSeeChannels
																: t.connectToSeeChats}
														</p>
													)}
													{canManageWhatsApp && (
														<button
															type="button"
															onClick={() => {
																setQrExpired(false);
																setActiveTab(
																	qrExpired || filteredConversations.length === 0
																		? activeTab
																		: 'accounts',
																);
																void connectAccount(undefined, {
																	force: true,
																	mode: 'qr',
																});
															}}
															className="wa-primary-btn"
														>
															{qrExpired ? t.qrRefresh : t.reconnectAccount}
														</button>
													)}
												</>
											)}
										</div>
										) : (
										<Empty
											title={
												syncingInbox
													? syncStage === 'fetching_chats' ||
														(syncProgress >= 25 && syncProgress <= 45)
														? t.syncingChatsFetching
														: t.syncingChats
														: conversationFilter === 'archived'
															? t.noArchivedConversations
															: conversationFilter === 'important'
																? t.noImportantConversations
														: conversationScope === 'assigned'
															? t.noAssignedConversations
															: activeTab === 'channels'
																? t.noChannels
																: t.noConversations
											}
										/>
										)
									) : (
										<>
											<WaVirtualSpacer height={chatListWindow.topPad} />
											{visibleConversations.map(conversation => {
												const title = conversationTitle(conversation);
												const titlePresentation = messageTextPresentation(title);
												const previewText = conversationPreview(conversation);
												const typing = Boolean(
													conversation.isTyping ||
													conversation.typing ||
													conversation.presence?.typing,
												);
												const previewPresentation = messageTextPresentation(
													typing
														? locale === 'ar'
															? 'يكتب الآن…'
															: 'typing…'
														: previewText,
												);
												const active =
													conversation.id === conversationId ||
													conversation.id === secondaryConversationId;
												const isSplitSecondary =
													conversation.id === secondaryConversationId;
												const isGroup = conversation.type === 'group';
												const story = !isGroup ? storyForConversation(conversation) : null;
												const unreadCount = conversationUnreadCount(conversation);
												const unread = unreadCount > 0;
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
															if (splitPickMode) {
																if (conversation.id === conversationId) {
																	toast.error(
																		locale === 'ar'
																			? 'اختر شات مختلف عن الحالي'
																			: 'Pick a different chat than the current one',
																	);
																	return;
																}
																setSecondaryConversationId(conversation.id);
																setSplitPickMode(false);
																toast.success(
																	locale === 'ar'
																		? 'تم فتح الشات الجانبي'
																		: 'Second chat opened',
																);
																return;
															}
															if (cloneVoicePickMode) {
																cancelIdleMessagePrefetch(conversation.id);
																setConversationId(conversation.id);
																void loadMessagesRef.current?.(
																	conversation.id,
																	canUseWhatsApp && !demo.settings.enabled,
																)?.catch?.(() => {});
																return;
															}
															cancelIdleMessagePrefetch(conversation.id);
															setConversationId(conversation.id);
														}}
														onPointerEnter={event => {
															scheduleConversationPrefetch(conversation.id);
															if (!chatListCollapsed) return;
															const rect = event.currentTarget.getBoundingClientRect();
															const isRtl = locale === 'ar';
															setCollapsedChatTip({
																title,
																preview: typing
																	? locale === 'ar'
																		? 'يكتب الآن…'
																		: 'typing…'
																	: previewText,
																unread: unreadCount,
																top: rect.top + rect.height / 2,
																left: isRtl ? rect.left - 8 : rect.right + 8,
																align: isRtl ? 'end' : 'start',
																dir: titlePresentation.dir,
															});
														}}
														onPointerDown={event => startConversationLongPress(event, conversation)}
														onPointerMove={cancelConversationLongPress}
														onPointerUp={cancelConversationLongPress}
														onPointerCancel={cancelConversationLongPress}
														onPointerLeave={() => {
															cancelConversationLongPress();
															if (chatListCollapsed) setCollapsedChatTip(null);
														}}
														onContextMenu={event => {
															event.preventDefault();
															suppressConversationClickRef.current = true;
															setConversationActionAnchor({
																top: event.clientY,
																bottom: event.clientY,
																left: event.clientX,
																right: event.clientX,
																width: 0,
																height: 0,
															});
															setConversationActionTarget(conversation);
														}}
														onKeyDown={event => {
															if (event.key === 'Enter' || event.key === ' ') {
																event.preventDefault();
																if (splitPickMode) {
																	if (conversation.id === conversationId) {
																		toast.error(
																			locale === 'ar'
																				? 'اختر شات مختلف عن الحالي'
																				: 'Pick a different chat than the current one',
																		);
																		return;
																	}
																	setSecondaryConversationId(conversation.id);
																	setSplitPickMode(false);
																	return;
																}
																if (cloneVoicePickMode) {
																	setConversationId(conversation.id);
																	void loadMessagesRef.current?.(
																		conversation.id,
																		canUseWhatsApp && !demo.settings.enabled,
																	)?.catch?.(() => {});
																	return;
																}
																setConversationId(conversation.id);
															}
														}}
														className={`wa-conversation-row relative flex w-full cursor-pointer items-start gap-3 text-start transition-colors [content-visibility:auto] [contain-intrinsic-size:72px] ${
															active
																? isSplitSecondary
																	? 'is-active is-split-secondary'
																	: 'is-active'
																: ''
														}`}
														aria-current={active && !isSplitSecondary ? 'true' : undefined}
														data-selected={active ? 'true' : undefined}
													>
														<div className="wa-conversation-avatar relative grid h-11 w-11 shrink-0 place-items-center">
															{story ? (
																<>
																	<StoryRing
																		size={chatListCollapsed ? 44 : 48}
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
																		className="relative z-1 grid h-9 w-9 place-items-center rounded-full bg-white"
																	>
																		<Avatar
																			label={title}
																			size={9}
																			isGroup={isGroup}
																			src={conversationAvatarUrl(conversation)}
																			className="!ring-0"
																		/>
																	</button>
																</>
															) : (
																<Avatar
																	label={title}
																	size={11}
																	isGroup={isGroup}
																	src={conversationAvatarUrl(conversation)}
																/>
															)}
															{unread && (
																<span className="wa-unread-avatar-badge">
																	{unreadCount > 99 ? '99+' : unreadCount}
																</span>
															)}
														</div>
														<div className="min-w-0 flex-1">
															<div className="flex items-center justify-between gap-2">
																<p
																	className={`title-chat truncate ${unread ? '!font-black' : ''} ${titlePresentation.className}`}
																	dir={titlePresentation.dir}
																	lang={titlePresentation.lang}
																	title={title}
																>
																	{title}
																</p>
																<div className="flex shrink-0 items-center gap-1">
																	{conversation.isMuted ? (
																		<span
																			className="text-slate-400"
																			title={t.muteChat}
																			aria-label={t.muteChat}
																		>
																			<BellOff size={13} strokeWidth={2.2} />
																		</span>
																	) : null}
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
																		className={`wa-conversation-preference wa-conversation-pin rounded p-0.5 disabled:opacity-50 ${
																			conversation.isPinned ? 'is-on text-[var(--color-primary-500)]' : 'text-slate-400 hover:text-[var(--color-primary-500)]'
																		}`}
																	>
																		<Pin
																			size={15}
																			strokeWidth={2.2}
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
																		<span className={`time-chat text-[10px] ${unread ? 'is-unread' : ''}`}>
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
																		<span className="shrink-0">
																			<DeliveryTicks
																			message={conversation.lastMessage}
																			size={16}
																			selfChat={isSelfChatConversation(
																				conversation,
																				selectedAccount,
																			)}
																		/>
																		</span>
																	)}
																	{!typing && (
																		<ConversationPreviewIcon
																			type={conversation.lastMessage?.type}
																		/>
																	)}
																	<span
																		className={`truncate ${previewPresentation.className}`}
																		dir={previewPresentation.dir}
																		lang={previewPresentation.lang}
																	>
																		{typing
																			? locale === 'ar' ? 'يكتب الآن…' : 'typing…'
																			: previewText}
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
											<WaVirtualSpacer height={chatListWindow.bottomPad} />
											{conversations.length < conversationTotal && (
												<div className="flex items-center justify-center gap-2 py-3 text-[11px] font-semibold text-slate-400">
													{loadingMoreConversations ? (
														<>
															<Loader2 size={13} className="animate-spin" />
															{locale === 'ar' ? 'جاري تحميل محادثات أخرى…' : 'Loading more chats…'}
														</>
													) : (
														<span className="opacity-70">
															{locale === 'ar' ? 'مرّر لأسفل للمزيد' : 'Scroll for more'}
														</span>
													)}
												</div>
											)}
										</>
									)}
								</div>
							</div>
							{chatListCollapsed &&
								collapsedChatTip &&
								typeof document !== 'undefined' &&
								createPortal(
									<div
										className={`wa-collapsed-chat-tip ${collapsedChatTip.align === 'end' ? 'is-end' : ''}`}
										style={{
											top: collapsedChatTip.top,
											left: collapsedChatTip.left,
										}}
									>
										<p
											className="wa-collapsed-chat-tip-title"
											dir={collapsedChatTip.dir || undefined}
										>
											{collapsedChatTip.title}
										</p>
										{collapsedChatTip.preview ? (
											<p className="wa-collapsed-chat-tip-preview">
												{collapsedChatTip.preview}
											</p>
										) : null}
									</div>,
									document.body,
								)}
						</aside>
						<section className={`wa-chat-thread-pane relative ${!conversationId ? 'hidden min-[769px]:flex' : 'flex'} h-full min-h-0 min-w-0 flex-col overflow-hidden`}>
							{!selectedConversation ? (
								<ChatIdlePane
									title={
										cloneVoicePickMode
											? t.cloneVoicePickIdle
											: !isAccountConnected && !demo.settings.enabled
												? (accountBusy || qr ? t.autoConnecting : t.connectToSeeChats)
												: t.selectConversation
									}
									 
									unreadLabel={
										unreadConversationCount > 0
											? t.unreadMessagesLong.replace(
													'{count}',
													String(unreadConversationCount),
												)
											: null
									}
									 
								/>
							) : (
								<>
									<header className="wa-chat-toolbar flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
										<div className="wa-chat-toolbar__identity flex min-w-0 items-center gap-3">
											<button type="button" aria-label="Back to chats" onClick={() => setConversationId(null)} className="wa-header-icon-btn grid shrink-0 place-items-center min-[769px]:hidden">
												{locale === 'ar' ? <ChevronRight size={20} strokeWidth={2.2} /> : <ChevronLeft size={20} strokeWidth={2.2} />}
											</button>
											{unreadConversationCount > 0 ? (
												<span className="wa-chat-back-count min-[769px]:hidden">
													{unreadConversationCount > 99 ? '99+' : unreadConversationCount}
												</span>
											) : null}
											<div className="wa-chat-toolbar__profile flex min-w-0 items-center gap-3">
												<div className="wa-chat-avatar-ring shrink-0">
													{isEmailMemoAiConversation(selectedConversation) ? (
														<div className="grid h-10 w-10 place-items-center rounded-full bg-[#eff6ff] text-[#2563eb] ring-2 ring-white dark:bg-[#1e3a5f] dark:text-[#93c5fd] dark:ring-slate-900">
															<Mail size={18} />
														</div>
													) : (
														<Avatar
															label={conversationTitle(selectedConversation)}
															size={10}
															isGroup={selectedConversation.type === 'group'}
															src={conversationAvatarUrl(selectedConversation)}
														/>
													)}
												</div>
												<div className="wa-chat-contact min-w-0">
													<h3
														className={`truncate text-sm font-semibold tracking-tight ${selectedChatTitlePresentation.className}`}
														dir={selectedChatTitlePresentation.dir}
														lang={selectedChatTitlePresentation.lang}
														title={selectedChatTitle}
													>
														{selectedChatTitle}
													</h3>
													<p className="wa-chat-assignee mt-0.5 truncate text-[12px] leading-4 text-slate-500">
														{isEmailMemoAiConversation(selectedConversation)
															? locale === 'ar'
																? 'صندوق وارد الإيميلات · عرض فقط'
																: 'Email inbox thread · view only'
															: selectedConversation.isTyping ||
																  selectedConversation.typing ||
																  selectedConversation.presence?.typing
																? selectedConversation.presence?.recording
																	? locale === 'ar'
																		? 'يسجل صوت الآن…'
																		: 'recording…'
																	: locale === 'ar'
																		? 'يكتب الآن…'
																		: 'typing…'
																: selectedConversation.presence?.online
																	? (
																		<span className="wa-online-status inline-flex items-center gap-1.5">
																			<span className="wa-online-dot" aria-hidden="true" />
																			{locale === 'ar' ? 'متصل الآن' : 'Online'}
																		</span>
																	)
																	: (
																		<span className="wa-chat-assignee-pill inline-flex max-w-full items-center gap-1.5">
																			<UserRound size={12} strokeWidth={2.3} className="shrink-0 opacity-70" />
																			<span className="truncate">
																				{selectedConversation.assignedUser?.name || t.unassign}
																			</span>
																		</span>
																	)}
													</p>
													<p className="wa-chat-contact-hint hidden text-[11px] text-[#667781]">
														{selectedConversation.isTyping || selectedConversation.typing || selectedConversation.presence?.typing
															? locale === 'ar' ? 'يكتب الآن…' : 'typing…'
															: locale === 'ar' ? 'اضغط هنا لمعلومات جهة الاتصال' : 'tap here for contact info'}
													</p>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-1 min-[769px]:hidden">
											<WaActionMenu
												actions={chatToolbarActions}
												ariaLabel={t.chatActions}
												triggerLabel={t.chatActions}
												size="sm"
												iconOnly
												disabled={demo.settings.enabled}
												buttonClassName="wa-header-icon-btn shadow-none"
											/>
										</div>
										<div className="wa-chat-toolbar-actions hidden items-center gap-2 min-[769px]:flex">
											<div className="wa-chat-toolbar-actions__group">
												{!demo.settings.enabled && conversationId && accountId ? (
													<button
														type="button"
														title={t.scheduleMessage}
														aria-label={t.scheduleMessage}
														onClick={openSchedulePopover}
														className="wa-header-icon-btn relative"
													>
														<CalendarDays size={18} strokeWidth={2.05} />
														{messageSchedules.length > 0 ? (
															<span className="wa-toolbar-icon-btn__badge">
																{messageSchedules.length > 9 ? '9+' : messageSchedules.length}
															</span>
														) : null}
													</button>
												) : null}
												<WaActionMenu
													actions={chatToolbarActions}
													ariaLabel={t.chatActions}
													triggerLabel={t.chatActions}
													size="sm"
													iconOnly
													disabled={demo.settings.enabled}
													buttonClassName="wa-header-icon-btn"
												/>
												{!demo.settings.enabled && canUseWhatsApp &&
													selectedAccount?.privacySettings?.readReceiptMode === 'manual' && (
														<button
															type="button"
															onClick={markConversationReadManually}
															className="wa-toolbar-text-btn"
														>
															{t.markRead}
														</button>
													)}
											</div>
											{!demo.settings.enabled && canAssignWhatsApp && (
												<div className="wa-chat-assign-field relative inline-flex items-center">
													<span className="wa-chat-assign-field__label">
														{t.assignedTo}
													</span>
													<WaCustomSelect
														ariaLabel={t.assignedTo}
														value={selectedConversation.assignedUserId || ''}
														onChange={assignConversation}
														size="sm"
														fitContent
														className="w-auto"
														buttonClassName="wa-chat-assign-trigger"
														options={assignStaffOptions}
													/>
												</div>
											)}
											<span className="wa-chat-toolbar-actions__divider" aria-hidden="true" />
											<button
												type="button"
												aria-label="Close conversation"
												title={locale === 'ar' ? 'إغلاق المحادثة' : 'Close chat'}
												onClick={() => setConversationId(null)}
												className="wa-header-icon-btn wa-header-icon-btn--quiet"
											>
												<X size={18} strokeWidth={2.2} />
											</button>
										</div>
										<div className="wa-chat-mobile-actions flex shrink-0 items-center min-[769px]:hidden" aria-hidden="true" />
									</header>
									<ScheduledMessagesPanel
										ar={locale === 'ar'}
										schedules={messageSchedules}
										loading={messageSchedulesLoading}
										busyId={messageScheduleBusyId}
										onPause={pauseMessageSchedule}
										onResume={resumeMessageSchedule}
										onCancel={cancelMessageSchedule}
									/>
									{(conversationFilter === 'important' || conversationFilter === 'starred') && conversationId && !activeMessageGroup ? (
										<div className="flex shrink-0 items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
											<Star size={14} fill="currentColor" />
											<span>{t.importantOnlyBanner}</span>
										</div>
									) : null}
									{inChatSearchOpen ? (
										<div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
											<div className="flex items-center gap-2">
												<Search size={14} className="text-slate-400" />
												<input
													value={inChatSearchQuery}
													onChange={event => void runInChatSearch(event.target.value)}
													placeholder={locale === 'ar' ? 'ابحث داخل المحادثة…' : 'Search in chat…'}
													className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-slate-700"
													autoFocus
												/>
												{inChatSearchBusy ? <Loader2 size={14} className="animate-spin text-slate-400" /> : null}
												<button
													type="button"
													className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
													onClick={() => {
														setInChatSearchOpen(false);
														setInChatSearchQuery('');
														setInChatSearchHits([]);
													}}
												>
													<X size={14} />
												</button>
											</div>
											{inChatSearchQuery.trim() ? (
												<p className="text-[11px] text-slate-500">
													{locale === 'ar'
														? `${inChatSearchHits.length} نتيجة`
														: `${inChatSearchHits.length} result(s)`}
												</p>
											) : null}
										</div>
									) : null}
									{uploadProgress != null ? (
										<div className="flex shrink-0 items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
											<span>
												{uploadProgress >= 100
													? locale === 'ar'
														? 'جاري الإرسال'
														: 'Sending'
													: locale === 'ar'
														? 'رفع الملف'
														: 'Uploading'}
											</span>
											<div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-emerald-200/70">
												<div
													className="h-full rounded-full bg-[#00A884] transition-[width]"
													style={{ width: `${uploadProgress}%` }}
												/>
											</div>
											<span>{uploadProgress}%</span>
										</div>
									) : null}
									{activeMessageGroup ? (
										<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-sky-100 bg-sky-50 px-4 py-2 text-[12px] font-semibold text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200">
											<FolderKanban size={14} />
											<span>{t.viewingGroupBanner.replace('{name}', activeMessageGroup.name)}</span>
											<button
												type="button"
												onClick={clearActiveMessageGroup}
												className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-sky-700"
											>
												{t.backToChat}
											</button>
										</div>
									) : null}
									{messageGroupsOpen && conversationId && !demo.settings.enabled ? (
										<div className="shrink-0 border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
											<p className="mb-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">{t.messageGroups}</p>
											<p className="mb-2 text-[10px] text-slate-400">{t.messageGroupsHint}</p>
											{messageGroups.length ? (
												<div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
													{messageGroups.map(group => (
														<div key={group.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-700">
															<button
																type="button"
																disabled={messageGroupsBusy}
																onClick={() => void openMessageGroup(group)}
																className="min-w-0 flex-1 text-start"
															>
																<p className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{group.name}</p>
																<p className="text-[10px] text-slate-400">{group.messageCount || 0}</p>
															</button>
															<button
																type="button"
																disabled={messageGroupsBusy}
																onClick={() => void openMessageGroup(group)}
																className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700"
															>
																{t.openGroup}
															</button>
															<button
																type="button"
																disabled={messageGroupsBusy}
																onClick={() => void deleteActiveOrListedGroup(group)}
																className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700"
															>
																{t.deleteGroup}
															</button>
														</div>
													))}
												</div>
											) : (
												<p className="text-[11px] text-slate-400">{t.noMessageGroups}</p>
											)}
											<div className="mt-2 flex gap-2">
												<button
													type="button"
													onClick={toggleGroupSelectMode}
													className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700"
												>
													{t.selectForGroup}
												</button>
												<button
													type="button"
													onClick={() => setMessageGroupsOpen(false)}
													className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600"
												>
													{t.cancelGroupSelect}
												</button>
											</div>
										</div>
									) : null}
									{cloneVoicePickMode && conversationId ? (
										<CloneChatVoicePanel
											ar={locale === 'ar'}
											chatTitle={selectedChatTitle}
											conversationId={conversationId}
											fetchChatMessages={fetchInitialChatMessagesForClone}
											syncMoreChatMessages={syncMoreChatMessagesForClone}
											loadVoiceFile={loadVoiceFromMessageForClone}
											probeVoiceMedia={probeCloneVoiceMedia}
											whatsAppConnected={
												canUseWhatsApp &&
												!demo.settings.enabled &&
												selectedAccount?.status === 'connected'
											}
											maxSamples={10}
											currentSampleCount={pendingCloneSampleCount}
											onSamplesAdded={appendPendingCloneSamples}
										/>
									) : (
									<>
									<div className="wa-chat-wallpaper-host">
									<div className="wa-chat-wallpaper-layer" aria-hidden="true" />
									<div
										ref={messageBoxRef}
										onScroll={event => {
											messageListWindow.onScroll(event);
											const box = event.currentTarget;
											const distanceFromBottom =
												box.scrollHeight - box.clientHeight - box.scrollTop;
											if (distanceFromBottom > 180) {
												pinThreadToBottomRef.current = false;
												setShowJumpToBottom(distanceFromBottom > 220);
											} else if (!loadingOlderRef.current && !olderScrollRestoreRef.current) {
												pinThreadToBottomRef.current = true;
												setShowJumpToBottom(false);
											}
											if (
												!loadingMessages &&
												!loadingOlderRef.current &&
												!olderScrollRestoreRef.current &&
												Date.now() >= suppressOlderLoadUntilRef.current &&
												box.scrollHeight > box.clientHeight + 8 &&
												box.scrollTop < 40
											) {
												loadOlder();
											}
										}}
										onContextMenu={event => {
											// Keep native menu off the chat wallpaper; bubbles open app actions.
											if (!event.target?.closest?.('.wa-message-bubble, [data-message-action-menu]')) {
												event.preventDefault();
											}
										}}
										className={`wa-message-wallpaper min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 nice-scroll ${
											Boolean(conversationId) &&
											aiSuggestionsVisible &&
											!demo.settings.enabled &&
											canUseWhatsApp
												? 'wa-has-ai-suggestions'
												: ''
										}`}
									>
										{effectiveMessages.length === 0 ? (
											<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
												<div className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-slate-800/90">
													{loadingMessages || messagesSyncHint ? (
														<Loader2 size={28} className="animate-spin text-[var(--color-primary-500)]" />
													) : (
														<MessageCircle size={24} className="text-[var(--color-primary-400)]" />
													)}
												</div>
												<p className="text-sm font-semibold text-slate-500">
													{loadingMessages || messagesSyncHint
														? (messagesSyncHint ? t.messagesStillSyncing : t.loadingMessages)
														: activeMessageGroup
															? t.noMessagesYet
														: conversationFilter === 'important' || conversationFilter === 'starred'
															? t.noImportantMessages
															: t.noMessagesYet}
												</p>
											</div>
										) : (
											<div className="wa-message-thread">
												{loadingOlder && (
													<div className="sticky top-0 z-10 mx-auto mb-2 w-fit rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800/95">
														<span className="inline-flex items-center gap-1.5">
															<Loader2 size={12} className="animate-spin" />
															{t.older}
														</span>
													</div>
												)}
												{(messagesSyncHint || (loadingMessages && effectiveMessages.length === 0)) && (
													<div className="sticky top-0 z-10 mx-auto mb-2 w-fit rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800/95">
														<span className="inline-flex items-center gap-1.5">
															<Loader2 size={12} className="animate-spin" />
															{messagesSyncHint ? t.messagesStillSyncing : t.loadingMessages}
														</span>
													</div>
												)}
												{mediaSelectMode && (
													<div className="sticky top-0 z-20 mx-auto mb-2 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm dark:bg-slate-800/95">
														<button
															type="button"
															className="rounded-full px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
															onClick={() => {
																const catalog = collectDownloadableAttachments(effectiveMessages);
																setSelectedMediaIds(new Set(catalog.map(item => item.id)));
															}}
														>
															{t.selectAllMedia}
														</button>
														<span className="opacity-50">·</span>
														<span>{selectedMediaIds.size}</span>
														<button
															type="button"
															disabled={!selectedMediaIds.size || downloadingSelectedMedia}
															onClick={() => void downloadSelectedMedia()}
															className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-500)] px-2.5 py-0.5 text-white disabled:opacity-50"
														>
															{downloadingSelectedMedia ? (
																<Loader2 size={12} className="animate-spin" />
															) : (
																<Download size={12} />
															)}
															{t.downloadSelectedMedia}
														</button>
														<button
															type="button"
															onClick={() => {
																setMediaSelectMode(false);
																setSelectedMediaIds(new Set());
															}}
															className="rounded-full px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
														>
															{t.cancelSelectMedia}
														</button>
													</div>
												)}
												{ticketSelectMode && (
													<div className="wa-select-toolbar sticky top-0 z-20 mx-auto mb-2 flex w-fit max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-black/5 bg-white/98 px-2 py-1.5 shadow-[0_4px_18px_rgba(11,20,26,0.12)] dark:border-white/10 dark:bg-slate-900/95">
														<BoardColumnPicker
															accountId={accountId}
															conversationId={conversationId}
															messageIds={[...selectedMessageIds]}
															locale={locale}
															triggerLabel={t.addToBoard}
															triggerClassName="wa-select-toolbar__btn wa-select-toolbar__btn--board"
															onSuccess={() => {
																setTicketSelectMode(false);
																setGroupSelectMode(false);
																setSelectedMessageIds(new Set());
																toast.success(t.sentToBoard);
															}}
														/>
														<button
															type="button"
															disabled={!selectedMessageIds.size || demo.settings.enabled || isDemoId(conversationId)}
															onClick={() => setSharingMessageIds([...selectedMessageIds])}
															className="wa-select-toolbar__btn wa-select-toolbar__btn--send disabled:opacity-40"
														>
															<Send size={13} strokeWidth={2.25} />
															{locale === 'ar' ? 'إرسال إلى…' : 'Send to…'}
														</button>
														<button
															type="button"
															disabled={!selectedMessageIds.size}
															onClick={openSelectedTranscriptBundle}
															className="wa-select-toolbar__btn wa-select-toolbar__btn--transcribe disabled:opacity-40"
														>
															<AudioLines size={13} strokeWidth={2.25} />
															{t.transcribeSelected}
														</button>
														<span className="wa-select-toolbar__divider" aria-hidden="true" />
														<button
															type="button"
															onClick={() => {
																setTicketSelectMode(false);
																setSelectedMessageIds(new Set());
															}}
															className="wa-select-toolbar__cancel"
														>
															{t.cancelSelectMessages}
														</button>
													</div>
												)}
												{groupSelectMode && (
													<div className="sticky top-0 z-20 mx-auto mb-2 flex w-fit max-w-full flex-col items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm dark:bg-slate-800/95">
														<div className="flex flex-wrap items-center justify-center gap-2">
															<button
																type="button"
																className="rounded-full px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
																onClick={() => {
																	const ids = effectiveMessages
																		.filter(item => item?.id && !item.optimistic)
																		.map(item => item.id);
																	setSelectedMessageIds(new Set(ids));
																}}
															>
																{t.selectAllMessages}
															</button>
															<span className="opacity-50">·</span>
															<span>{t.selectedMessagesCount.replace('{count}', String(selectedMessageIds.size))}</span>
															<button
																type="button"
																disabled={!selectedMessageIds.size || messageGroupsBusy}
																onClick={() => setGroupPickerOpen(current => !current)}
																className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-white disabled:opacity-50"
															>
																<FolderKanban size={12} />
																{t.addToGroup}
															</button>
															<BoardColumnPicker
																accountId={accountId}
																conversationId={conversationId}
																messageIds={[...selectedMessageIds]}
																locale={locale}
																triggerLabel={t.addToBoard}
																onSuccess={() => {
																	setGroupSelectMode(false);
																	setSelectedMessageIds(new Set());
																	setGroupPickerOpen(false);
																	toast.success(t.sentToBoard);
																}}
															/>
															<button
																type="button"
																disabled={!selectedMessageIds.size || demo.settings.enabled || isDemoId(conversationId)}
																onClick={() => setSharingMessageIds([...selectedMessageIds])}
																className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-white disabled:opacity-50"
															>
																<Send size={12} />
																{locale === 'ar' ? 'إرسال إلى…' : 'Send to…'}
															</button>
															<button
																type="button"
																disabled={!selectedMessageIds.size || messageGroupsBusy}
																onClick={() => void removeSelectedFromGroups()}
																className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-rose-700 disabled:opacity-50"
															>
																{t.removeFromGroup}
															</button>
															<button
																type="button"
																onClick={() => {
																	setGroupSelectMode(false);
																	setSelectedMessageIds(new Set());
																	setGroupPickerOpen(false);
																}}
																className="rounded-full px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
															>
																{t.cancelGroupSelect}
															</button>
														</div>
														{groupPickerOpen ? (
															<div className="w-[min(320px,90vw)] rounded-xl border border-slate-200 bg-white p-2 text-start dark:border-slate-700 dark:bg-slate-900">
																<p className="mb-1 text-[10px] font-bold text-slate-500">{t.chooseOrCreateGroup}</p>
																{messageGroups.map(group => (
																	<button
																		key={group.id}
																		type="button"
																		disabled={messageGroupsBusy}
																		onClick={() => void assignSelectedToGroup(group.id)}
																		className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold hover:bg-sky-50 dark:hover:bg-slate-800"
																	>
																		<span className="truncate">{group.name}</span>
																		<span className="text-slate-400">{group.messageCount || 0}</span>
																	</button>
																))}
																<div className="mt-1 flex gap-1">
																	<input
																		value={newGroupName}
																		onChange={event => setNewGroupName(event.target.value)}
																		placeholder={t.newGroupName}
																		className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none dark:border-slate-700 dark:bg-slate-950"
																	/>
																	<button
																		type="button"
																		disabled={messageGroupsBusy || !newGroupName.trim()}
																		onClick={() => void createAndAssignGroup()}
																		className="rounded-lg bg-sky-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
																	>
																		{t.createGroup}
																	</button>
																</div>
															</div>
														) : null}
													</div>
												)}
												{hasMoreMessages && !loadingOlder && !activeMessageGroup && (
													<button
														type="button"
														onClick={() => void loadOlder({ forceProvider: true, ignoreThrottle: true })}
														disabled={loadingOlder}
														className="mx-auto flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow dark:bg-slate-800"
													>
														<ChevronUp size={13} />
														{t.older}
													</button>
												)}
												<WaVirtualSpacer height={messageListWindow.topPad} />
												{visibleMessageRows.map(({ row, rowIndex }) => {
													const groupedImages = row.kind === 'image-gallery';
													const message = groupedImages
														? row.messages[row.messages.length - 1]
														: row.message;
													const previousRow = messageRows[rowIndex - 1];
													const nextRow = messageRows[rowIndex + 1];
													const rowStartMessage = groupedImages
														? row.messages[0]
														: row.message;
													const rowEndMessage = groupedImages
														? row.messages[row.messages.length - 1]
														: row.message;
													const previousMessage = previousRow
														? previousRow.kind === 'image-gallery'
															? previousRow.messages[previousRow.messages.length - 1]
															: previousRow.message
														: null;
													const nextMessage = nextRow
														? nextRow.kind === 'image-gallery'
															? nextRow.messages[0]
															: nextRow.message
														: null;
													const messageDate = message.providerTimestamp || message.created_at;
													const previousMessageDate = previousMessage?.providerTimestamp || previousMessage?.created_at;
													const dayLabel = messageDayLabel(messageDate, locale);
													const previousDayLabel = messageDayLabel(previousMessageDate, locale);
													const attachments = groupedImages
														? row.attachments
														: message.attachments;
													const mine = message.direction === 'outbound';
													const visibleText = visibleMessageText(message.text);
													const isEmailMemoConv = isEmailMemoAiConversation(selectedConversation);
													const isEmailMemoMsg =
														isEmailMemoConv && isEmailMemoMessageText(visibleText);
													const captionText = isEmailMemoMsg
														? visibleText
														: firstMessageLink(visibleText)
															? textWithoutFirstLink(visibleText)
															: visibleText;
													const captionIsMarkdown = looksLikeMarkdown(captionText);
													const textPresentation = messageTextPresentation(captionText || visibleText);
													const isDeleted =
														message.deletedMode && message.deletedMode !== 'none';
													const attachmentTypes = (attachments || []).map(attachment => String(attachment.type || '').toLowerCase());
													const hasOnlyVisualAttachments =
														attachmentTypes.length > 0 &&
														attachmentTypes.every(type =>
															['image', 'sticker', 'video'].includes(type),
														);
													const isVisualMediaMessage =
														hasOnlyVisualAttachments ||
														(!(attachments || []).length &&
															['image', 'sticker', 'video'].includes(
																String(message.type || '').toLowerCase(),
															));
													const isStickerMessage =
														!String(captionText || '').trim() &&
														attachmentTypes.length > 0 &&
														attachmentTypes.every(type => type === 'sticker');
													const isDocumentMessage =
														!groupedImages &&
														attachmentTypes.some(
															type =>
																!['image', 'sticker', 'video', 'audio', 'ptt', 'voice'].includes(type),
														);
													const isVoiceMessage =
														!groupedImages &&
														(attachmentTypes.some(type => ['audio', 'ptt', 'voice'].includes(type)) ||
															['audio', 'ptt', 'voice'].includes(String(message.type || '').toLowerCase()));
													const isLocationMessage =
														!isDeleted && isWhatsAppLocationMessage(message);
													const downloadableAttachments = collectDownloadableAttachments([
														groupedImages
															? { ...message, attachments: attachments || [] }
															: message,
													]);
													const selectableInMediaMode =
														mediaSelectMode &&
														(downloadableAttachments.length > 0 ||
															messageHasSelectableMedia(message));
													const selectableInTicketMode =
														ticketSelectMode && isSharableChatMessage(message);
													const selectableInGroupMode =
														groupSelectMode && !groupedImages && message?.id && !message.optimistic;
													const allSelected =
														selectableInMediaMode &&
														(downloadableAttachments.length
															? downloadableAttachments.every(item =>
																	selectedMediaIds.has(item.id),
																)
															: selectedMessageIds.has(message.id));
													const messageSelected =
														(selectableInTicketMode || selectableInGroupMode) &&
														(groupedImages
															? (row.messages || []).some(item =>
																	selectedMessageIds.has(item.id),
																)
															: selectedMessageIds.has(message.id));
													const showSelectCheck =
														selectableInMediaMode || selectableInTicketMode || selectableInGroupMode;
													const isChecked = allSelected || messageSelected;
													const ticketSelectionTargets = groupedImages
														? row.messages || [message]
														: [message];
													const membership = messageGroupMembership[message.id];
													const isGroupChat =
														selectedConversation?.type === 'group' ||
														String(selectedConversation?.providerChatId || '').endsWith('@g.us');
													const followsSame = messagesFormBubbleCluster(
														previousMessage,
														rowStartMessage,
														{ isGroupChat },
													);
													const precedesSame = messagesFormBubbleCluster(
														rowEndMessage,
														nextMessage,
														{ isGroupChat },
													);
													const hasBubbleTail = !followsSame;
													const sender = groupSenderIdentity(message);
													const previousSender = previousMessage
														? groupSenderIdentity(previousMessage)
														: null;
													const sameSenderCluster =
														isGroupChat &&
														!mine &&
														followsSame &&
														previousSender?.key &&
														previousSender.key === sender.key;
													const showGroupSenderMeta =
														isGroupChat && !mine && !sameSenderCluster && Boolean(sender.name);
													const groupSenderAvatarSrc =
														sender.avatarUrl || inboxAvatarForWaId(conversations, sender.key);
													const quotePreview = quotedPreviewFromMessage(message);
													const quotedSource = message.replyTo
														? resolveQuotedReplySource(
																message.replyTo,
																conversationMessages,
															)
														: null;
													const quotedVoice = quotedSource
														? quotedVoicePresentation(quotedSource, locale)
														: null;
													const rowItems = groupedImages ? row.messages : [message];
													const rowMessageIds = rowItems
														.map(item => item?.id)
														.filter(Boolean)
														.join(' ');
													const rowProviderIds = rowItems
														.map(item => item?.providerMessageId)
														.filter(Boolean)
														.join(' ');
													const isQuotedHighlight = rowItems.some(
														item =>
															item?.id === highlightedMessageKey ||
															item?.providerMessageId === highlightedMessageKey,
													);
													const fallbackMediaPreview =
														!attachments?.length &&
														['image', 'sticker', 'video'].includes(
															String(message.type || '').toLowerCase(),
														)
															? mediaPreviewFromRaw(message.raw)
															: null;
													return (
														<div
															key={row.key}
															className={`wa-message-row min-w-0 max-w-full ${
																followsSame ? 'wa-follows-same' : ''
															} ${precedesSame ? 'wa-precedes-same' : ''} ${
																isQuotedHighlight
																	? 'wa-message-highlighted'
																	: '[content-visibility:auto] [contain-intrinsic-size:80px]'
															}`}
															data-wa-message-id={message.id || undefined}
															data-wa-message-ids={rowMessageIds || undefined}
															data-wa-provider-id={message.providerMessageId || undefined}
															data-wa-provider-ids={rowProviderIds || undefined}
														>
															{dayLabel && dayLabel !== previousDayLabel && (
																<div className="wa-date-separator mx-auto mb-3 mt-4 w-fit rounded-lg border border-black/5 bg-white/90 px-3.5 py-1 text-center text-xs font-semibold text-[#54656F] shadow-sm">
																	{dayLabel}
																</div>
															)}
																	<div className={`wa-message-line flex min-w-0 max-w-full ${mine ? 'justify-end' : 'justify-start'} ${message.optimistic ? 'opacity-70' : ''}`}>
																<div className={`group flex min-w-0 max-w-full ${mine ? 'flex-row-reverse items-start' : 'items-start'} gap-1.5`}>
																{showSelectCheck && (
																	<button
																		type="button"
																		aria-pressed={isChecked}
																		aria-label={
																			groupSelectMode
																				? t.selectForGroup
																				: ticketSelectMode
																					? t.selectMessages
																					: t.selectMedia
																		}
																		onClick={() => {
																			if (selectableInGroupMode) {
																				applyGroupMessageSelection(message);
																				return;
																			}
																			if (selectableInTicketMode) {
																				applyMessagesSelection(ticketSelectionTargets);
																				return;
																			}
																			if (downloadableAttachments.length) {
																				applyMediaSelection(downloadableAttachments);
																				return;
																			}
																			if (messageHasSelectableMedia(message) || isSharableChatMessage(message)) {
																				applyGroupMessageSelection(message);
																			}
																		}}
																		className={`mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
																			isChecked
																				? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
																				: 'border-slate-300 bg-white text-transparent'
																		}`}
																	>
																		<Check size={14} />
																	</button>
																)}
																{isGroupChat && !mine && (
																	showGroupSenderMeta ? (
																		<Avatar
																			label={sender.name}
																			src={groupSenderAvatarSrc}
																			size={7}
																			className="wa-group-sender-avatar ring-0"
																		/>
																	) : (
																		<span className="wa-group-sender-spacer" aria-hidden="true" />
																	)
																)}
																<div
																	onPointerDown={event => {
																		if (isMultiSelectClick(event)) {
																			event.preventDefault();
																			cancelMessageLongPress(event);
																			return;
																		}
																		if (mediaSelectMode || ticketSelectMode || groupSelectMode) return;
																		startMessageLongPress(event, message);
																	}}
																	onPointerMove={cancelMessageLongPress}
																	onPointerUp={cancelMessageLongPress}
																	onPointerCancel={cancelMessageLongPress}
																	onClickCapture={event => {
																		if (!isMultiSelectClick(event) || message.optimistic) return;
																		event.preventDefault();
																		event.stopPropagation();
																		if (groupSelectMode) {
																			applyGroupMessageSelection(message);
																			return;
																		}
																		if (mediaSelectMode) {
																			if (downloadableAttachments.length) {
																				applyMediaSelection(downloadableAttachments);
																			} else if (messageHasSelectableMedia(message)) {
																				applyGroupMessageSelection(message);
																			}
																			return;
																		}
																		if (
																			ticketSelectMode ||
																			isSharableChatMessage(message)
																		) {
																			applyMessagesSelection(
																				groupedImages ? row.messages || [message] : [message],
																			);
																			return;
																		}
																		if (downloadableAttachments.length) {
																			applyMediaSelection(downloadableAttachments);
																			return;
																		}
																		if (messageHasSelectableMedia(message) || isSharableChatMessage(message)) {
																			applyGroupMessageSelection(message);
																		}
																	}}
																		onClick={() => {
																			if (selectableInGroupMode) {
																				applyGroupMessageSelection(message);
																				return;
																			}
																			if (selectableInTicketMode) {
																				applyMessagesSelection(ticketSelectionTargets);
																				return;
																			}
																			if (!selectableInMediaMode) return;
																			if (downloadableAttachments.length) {
																				applyMediaSelection(downloadableAttachments);
																				return;
																			}
																			applyGroupMessageSelection(message);
																		}}
																		onContextMenu={event => {
																		openMessageContextMenu(event, message);
																	}}
															className={`wa-message-bubble relative w-fit ${mine ? 'wa-message-mine' : 'wa-message-other'} ${followsSame ? 'wa-follows-same' : ''} ${precedesSame ? 'wa-precedes-same' : ''} ${hasBubbleTail && !isStickerMessage ? 'wa-has-tail' : ''} ${isEmailMemoMsg ? 'wa-message-email' : ''} ${isStickerMessage ? 'wa-message-sticker' : ''} ${isVisualMediaMessage || groupedImages ? 'wa-message-media' : ''} ${captionText && (isVisualMediaMessage || groupedImages) ? 'wa-message-has-caption' : ''} ${isDocumentMessage ? 'wa-message-file' : ''} ${isVoiceMessage ? 'wa-message-voice' : ''} ${isLocationMessage ? 'wa-message-location' : ''} ${
																		isEmailMemoMsg
																			? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
																			: mine
																				? 'bg-[#d9fdd3] text-slate-900 dark:bg-[#005c4b] dark:text-white'
																				: 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white'
																		} ${isChecked ? 'ring-2 ring-[var(--color-primary-400)]' : ''}`}
																>
																	{membership?.groupName ? (
																		<button
																			type="button"
																			onClick={event => {
																				event.stopPropagation();
																				void openMessageGroup({
																					id: membership.groupId,
																					name: membership.groupName,
																				});
																			}}
																			className="mb-1 inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
																		>
																			<FolderKanban size={10} />
																			<span className="truncate">{membership.groupName}</span>
																		</button>
																	) : null}
																	{showGroupSenderMeta && (
																		<p
																			className="wa-group-sender-name"
																			style={{ color: sender.color }}
																		>
																			{sender.name}
																		</p>
																	)}
																	{(message.forwarded || message.isForwarded) && (
																		<p className="mb-1 text-[10px] italic opacity-60">
																			{locale === 'ar' ? 'مُعاد توجيهها' : 'Forwarded'}
																		</p>
																	)}
																	{message.replyTo && (
																		<button
																			type="button"
																			className="wa-reply-quote mb-2 flex overflow-hidden rounded-lg border-s-4 border-emerald-500 bg-black/5"
																			aria-label={locale === 'ar' ? 'الانتقال إلى الرسالة الأصلية' : 'Go to original message'}
																			onPointerDown={event => event.stopPropagation()}
																			onClick={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				if (mediaSelectMode || ticketSelectMode || groupSelectMode) return;
																				void jumpToQuotedMessage(message);
																			}}
																		>
																			<div className="min-w-0 flex-1 px-2 py-1 text-xs opacity-80">
																				{quotedVoice ? (
																					<>
																						{quotedVoice.senderName ? (
																							<p className="truncate font-semibold text-[#8752d9]">
																								{quotedVoice.senderName}
																							</p>
																						) : null}
																						<p className="mt-0.5 flex min-w-0 items-center gap-1.5">
																							<Mic size={12} className="shrink-0 text-emerald-600" />
																							<span className="truncate">
																								{[
																									quotedVoice.durationLabel ||
																										quotedVoice.fallbackLabel,
																									quotedVoice.timeLabel,
																								]
																									.filter(Boolean)
																									.join(' · ')}
																							</span>
																						</p>
																					</>
																				) : (
																					quotedMessageLabel(quotedSource || message.replyTo, locale)
																				)}
																			</div>
																			{quotePreview ? (
																				<img
																					src={quotePreview}
																					alt=""
																					className="wa-reply-quote-thumb h-12 w-12 shrink-0 object-cover"
																				/>
																			) : null}
																		</button>
																	)}
																	{!isDeleted && attachments?.length
																		? (
																			<MessageAttachments
																				attachments={attachments}
																				mine={mine}
																				labels={t}
																				onImageReady={registerChatImage}
																				onOpenImage={setActiveChatImageId}
																				onOpenDocument={setDocumentPreview}
																				sessionReady={isAccountConnected}
																				messageRaw={message.raw}
																				message={message}
																				avatarLabel={
																					mine
																						? selectedAccount?.label || selectedAccount?.phoneNumber || 'Me'
																						: conversationTitle(selectedConversation) || '?'
																				}
																				avatarSrc={
																					mine
																						? selectedAccount?.avatarUrl || ''
																						: conversationAvatarUrl(selectedConversation)
																				}
																				selectMode={Boolean(
																					mediaSelectMode ||
																						ticketSelectMode ||
																						groupSelectMode,
																				)}
																			/>
																		)
																		: !isDeleted && fallbackMediaPreview ? (
																			<div className="relative mb-2 max-w-[240px] overflow-hidden rounded-lg">
																				<ImageMessage
																					url={fallbackMediaPreview}
																					alt={quotedMessageLabel({ type: message.type }, locale)}
																					cover={false}
																				/>
																			</div>
																		)
																		: !isDeleted && ['image', 'audio', 'ptt', 'voice', 'video', 'document', 'sticker'].includes(
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
																				<span>{quotedMessageLabel({ type: message.type }, locale)}</span>
																			</div>
																		)}
																	{isDeleted ? (
																		<div className="wa-message-copy">
																			<p className="wa-message-text italic opacity-60">
																				{locale === 'ar' ? 'تم حذف هذه الرسالة' : 'This message was deleted'}
																			</p>
																			<div className={`wa-message-meta ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																				{message.isStarred && <Star size={11} fill="currentColor" />}
																				{message.isPinned && <Pin size={11} fill="currentColor" />}
																				{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																				{mine && message.showReadReceipt !== false && (
																					<DeliveryTicks
																						message={message}
																						selfChat={isSelfChatConversation(
																							selectedConversation,
																							selectedAccount,
																						)}
																					/>
																				)}
																			</div>
																		</div>
																	) : ['contact', 'contacts', 'contactsarray', 'vcard'].includes(
																			String(message.type || '').toLowerCase(),
																		) ? (
																		<>
																			<ContactMessageCard message={message} locale={locale} />
																			<div className={`wa-message-meta ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																				{message.isStarred && <Star size={11} fill="currentColor" />}
																				{message.isPinned && <Pin size={11} fill="currentColor" />}
																				{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																				{mine && message.showReadReceipt !== false && (
																					<DeliveryTicks
																						message={message}
																						selfChat={isSelfChatConversation(
																							selectedConversation,
																							selectedAccount,
																						)}
																					/>
																				)}
																			</div>
																		</>
																	) : isWhatsAppLocationMessage(message) ? (
																		<>
																			<LocationMessage
																				message={message}
																				location={whatsAppLocationFromMessage(message)}
																				type={message.type}
																				locale={locale}
																				conversationId={conversationId || selectedConversation?.id}
																			/>
																			<div className={`wa-message-meta ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																				{message.isStarred && <Star size={11} fill="currentColor" />}
																				{message.isPinned && <Pin size={11} fill="currentColor" />}
																				{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																				{mine && message.showReadReceipt !== false && (
																					<DeliveryTicks
																						message={message}
																						selfChat={isSelfChatConversation(
																							selectedConversation,
																							selectedAccount,
																						)}
																					/>
																				)}
																			</div>
																		</>
																	) : isEmailMemoMsg ? (
																		<div className="wa-message-copy wa-message-copy--email">
																			<EmailMemoMessageCard
																				text={visibleText}
																				timestamp={
																					message.providerTimestamp ||
																					message.timestamp ||
																					message.created_at
																				}
																				labels={t}
																				locale={locale}
																			/>
																		</div>
																	) : visibleText ? (
																		<div
																			className="wa-message-copy"
																			dir={textPresentation.dir}
																			lang={textPresentation.lang}
																		>
																			<MessageLinkPreview text={visibleText} labels={t} />
																			{captionText ? (
																				<ExpandableMessageText
																					text={captionText}
																					dir={textPresentation.dir}
																					lang={textPresentation.lang}
																					style={{
																						...textPresentation.style,
																						...(captionIsMarkdown
																							? { whiteSpace: 'normal' }
																							: null),
																					}}
																					className={`wa-message-text ${
																						captionIsMarkdown
																							? 'wa-message-text--md'
																							: 'whitespace-pre-wrap'
																					} ${textPresentation.className || ''}`}
																					readMoreLabel={t.readMore}
																					previewChars={captionIsMarkdown ? 3600 : undefined}
																					previewLines={captionIsMarkdown ? 64 : undefined}
																					readMoreStep={captionIsMarkdown ? 2400 : undefined}
																					readMoreLines={captionIsMarkdown ? 40 : undefined}
																					renderText={value => (
																						<WhatsAppFormattedText
																							text={value}
																							forceMarkdown={captionIsMarkdown}
																							mentionDirectory={mentionDirectory}
																							mentionLabels={message.mentionLabels}
																						/>
																					)}
																				/>
																			) : null}
																			<div className={`wa-message-meta ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																				{message.isStarred && <Star size={11} fill="currentColor" />}
																				{message.isPinned && <Pin size={11} fill="currentColor" />}
																				{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																				{mine && message.showReadReceipt !== false && (
																					<DeliveryTicks
																						message={message}
																						selfChat={isSelfChatConversation(
																							selectedConversation,
																							selectedAccount,
																						)}
																					/>
																				)}
																			</div>
																		</div>
																	) : (
																		<div className={`wa-message-meta ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																			{message.isStarred && <Star size={11} fill="currentColor" />}
																			{message.isPinned && <Pin size={11} fill="currentColor" />}
																			{message.editedAt ? (
																				<span className="me-1 text-[10px] opacity-80">
																					{locale === 'ar' ? 'تم التعديل' : 'Edited'}
																				</span>
																			) : null}
																			{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																			{mine && message.showReadReceipt !== false && (
																				<DeliveryTicks
																					message={message}
																					selfChat={isSelfChatConversation(
																						selectedConversation,
																						selectedAccount,
																					)}
																				/>
																			)}
																		</div>
																	)}
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
																{!message.optimistic &&
																	!mediaSelectMode &&
																	!ticketSelectMode &&
																	!groupSelectMode && (
																	<div className="wa-message-hover-wrap">
																		<MessageHoverActions
																			mine={mine}
																			locale={locale}
																			open={
																				actionMessageId === message.id ||
																				reactionPickerMessageId === message.id
																			}
																			emojiOpen={reactionPickerMessageId === message.id}
																			showTranscribe={isVoiceMessage}
																			showCopy={
																				!isDeleted &&
																				Boolean(String(captionText || '').trim())
																			}
																			onEmoji={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				const bar = event.currentTarget.closest('.wa-message-hover-actions');
																				toggleReactionPicker(
																					message,
																					(bar || event.currentTarget).getBoundingClientRect(),
																				);
																			}}
																			onReply={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				void handleMessageAction(message, 'reply');
																			}}
																			onTranscribe={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				void handleMessageAction(message, 'transcribe');
																			}}
																			onCopy={() => handleMessageAction(message, 'copy')}
																			onMore={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				closeReactionPicker();
																				const rect =
																					event.currentTarget.getBoundingClientRect();
																				setActionMessageAnchor(rect);
																				setActionMessageId(current =>
																					current === message.id ? null : message.id,
																				);
																			}}
																		/>
																		<MessageActionMenu
																			open={actionMessageId === message.id}
																			message={message}
																			locale={locale}
																			isVoice={isVoiceMessage}
																			anchorRect={actionMessageAnchor}
																			previewImageUrl={(attachments || [])
																				.map(attachment => registeredChatImages[attachment.id]?.url)
																				.find(Boolean)}
																			busy={pendingMessageActions.has(message.id)}
																			accountId={accountId}
																			conversationId={conversationId}
																			canUseBoard={
																				!demo.settings.enabled &&
																				!isDemoId(conversationId) &&
																				Boolean(accountId)
																			}
																			canUseGroups={
																				!demo.settings.enabled &&
																				!isDemoId(conversationId)
																			}
																			onBoardSuccess={() => {
																				toast.success(t.sentToBoard);
																			}}
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
																			mentionDirectory={mentionDirectory}
																		/>
																	</div>
																)}
																</div>
															</div>
														</div>
													);
												})}
												<WaVirtualSpacer height={messageListWindow.bottomPad} />
											</div>
										)}
									</div>
									</div>
									{showJumpToBottom && conversationId ? (
										<button
											type="button"
											className="wa-jump-bottom"
											aria-label={locale === 'ar' ? 'انتقل لأسفل' : 'Jump to latest'}
											title={locale === 'ar' ? 'انتقل لأسفل' : 'Jump to latest'}
											onClick={jumpMessagesToBottom}
										>
											<ChevronDown size={22} strokeWidth={2.4} />
										</button>
									) : null}
									<div
										className={`wa-composer-stack ${
											!demo.settings.enabled &&
											canUseWhatsApp &&
											aiSuggestionsVisible &&
											Boolean(conversationId)
												? 'wa-composer-stack--ai'
												: ''
										}`}
									>
									<AiReplySuggestions
										locale={locale}
										repliesOnly
										visible={
											Boolean(conversationId) &&
											!demo.settings.enabled &&
											canUseWhatsApp &&
											aiSuggestionsVisible &&
											Boolean(whatsappAi.settings?.enabled)
										}
										settingsEnabled={Boolean(whatsappAi.settings?.enabled)}
										messagesReady={!loadingMessages || effectiveMessages.length > 0}
										enabling={whatsappAi.settingsSaving}
										loading={whatsappAi.suggestionsLoading}
										error={whatsappAi.suggestionsError}
										suggestions={whatsappAi.suggestions}
										prompts={
											canManageWhatsApp || isAdmin
												? whatsappAi.settings?.promptPresets || []
												: []
										}
										activePromptId={whatsappAi.settings?.activePromptId}
										promptSaving={whatsappAi.settingsSaving}
										onPromptChange={whatsappAi.selectPrompt}
										onRegenerate={whatsappAi.regenerateSuggestions}
										onEnable={() =>
											whatsappAi.saveSettings({
												enabled: true,
												provider: 'ai-free',
											})
										}
										onSelect={suggestion => setDraft(suggestion)}
									/>
									{canComposeInConversation ? (
										<form
											onSubmit={sendMessage}
											onPaste={handleComposerPaste}
											onDragEnter={event => {
												event.preventDefault();
												setComposerDragOver(true);
											}}
											onDragOver={event => {
												event.preventDefault();
												setComposerDragOver(true);
											}}
											onDragLeave={event => {
												if (!event.currentTarget.contains(event.relatedTarget)) {
													setComposerDragOver(false);
												}
											}}
											onDrop={event => {
												event.preventDefault();
												setComposerDragOver(false);
												const file = event.dataTransfer?.files?.[0];
												if (file) void sendFile(file);
											}}
											className={`wa-composer flex gap-2 border-0 border-t border-[#e9edef] p-2 ${composerDragOver ? 'ring-2 ring-[#00A884]/40' : ''} ${recordingVoice ? 'is-recording flex-nowrap items-center' : 'flex-wrap items-end'}`}
										>
											<input
												ref={fileRef}
												type="file"
												accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/ogg,audio/mp4,audio/webm,application/pdf,.doc,.docx,.xls,.xlsx"
												className="hidden"
												onChange={event => sendFile(event.target.files?.[0])}
											/>
											{replyingTo && (
												<div className="wa-reply-preview">
													<Reply size={16} className="wa-reply-preview__icon" aria-hidden="true" />
													<div className="wa-reply-preview__copy">
														<p className="wa-reply-preview__title">
															{locale === 'ar' ? 'الرد على رسالة' : 'Replying to message'}
														</p>
														<p className="wa-reply-preview__snippet">
															{(() => {
																const voice = quotedVoicePresentation(replyingTo, locale);
																if (voice) {
																	return [
																		voice.durationLabel || voice.fallbackLabel,
																		voice.timeLabel,
																	]
																		.filter(Boolean)
																		.join(' · ');
																}
																return quotedMessageLabel(replyingTo, locale);
															})()}
														</p>
													</div>
													<button
														type="button"
														onClick={() => setReplyingTo(null)}
														aria-label={locale === 'ar' ? 'إلغاء الرد' : 'Cancel reply'}
														className="wa-reply-preview__close"
													>
														<X size={16} />
													</button>
												</div>
											)}
											{composerImages.length > 0 && (
												<div className="wa-composer-paste-preview flex min-w-0 basis-full gap-2 overflow-x-auto pb-1">
													{composerImages.map(item => (
														<div key={item.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5">
															<img
																src={item.previewUrl}
																alt=""
																className="h-full w-full object-cover"
															/>
															<button
																type="button"
																onClick={() => removeComposerImage(item.id)}
																aria-label={locale === 'ar' ? 'إزالة الصورة' : 'Remove image'}
																className="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/65 text-white hover:bg-black/80"
															>
																<X size={12} strokeWidth={2.4} />
															</button>
														</div>
													))}
												</div>
											)}
											{recordingVoice ? (
												<div dir="ltr" className="wa-input-pill wa-recording-pill flex min-h-10 min-w-0 flex-1 items-center gap-0.5 rounded-full px-1 py-1">
													<VoiceRecordingBar
														seconds={recordingSeconds}
														paused={recordingPaused}
														labels={t}
														onCancel={() => stopVoiceRecording(false)}
														onPause={pauseVoiceRecording}
														onResume={resumeVoiceRecording}
														onPreview={() => void toggleVoicePreview()}
														previewActive={voicePreviewActive}
														previewPlaying={voicePreviewPlaying}
														previewProgress={voicePreviewProgress}
														previewCurrentTime={voicePreviewCurrentTime}
														previewDuration={voicePreviewDuration}
														onPreviewSeek={seekVoicePreview}
														onSend={() => stopVoiceRecording(true)}
													/>
												</div>
											) : voiceChanging ? (
												<div className="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
													<Loader2 size={16} className="animate-spin text-emerald-600" />
													<span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
														{t.voiceChanging}
													</span>
												</div>
											) : (
												<div dir="ltr" className="wa-input-pill flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-[24px] px-1.5 py-1">
													<button
														ref={attachButtonRef}
														type="button"
														aria-label={locale === 'ar' ? 'المزيد من الخيارات' : 'More options'}
														disabled={sending}
														onClick={() => {
															setStickerPanelOpen(false);
															setAiImagePanelOpen(false);
															setAttachmentSheetOpen(true);
														}}
														title={locale === 'ar' ? 'المزيد من الخيارات' : 'More options'}
														className="wa-attach-button wa-input-action"
													>
														<Plus size={22} strokeWidth={2.1} />
													</button>
													<button
														type="button"
														ref={stickerButtonRef}
														aria-label="Stickers"
														title="Emoji, GIF and stickers"
														onClick={() => {
															setAttachmentSheetOpen(false);
															setAiImagePanelOpen(false);
															setStickerPanelOpen(current => !current);
														}}
														className="wa-sticker-button wa-input-action"
													>
														<Smile size={20} strokeWidth={2} />
													</button>
													<button
														type="button"
														ref={aiImageButtonRef}
														aria-label={locale === 'ar' ? 'توليد صورة بالذكاء الاصطناعي' : 'AI image'}
														title={locale === 'ar' ? 'توليد صورة بالذكاء الاصطناعي' : 'Generate an image with AI'}
														onClick={() => {
															setAttachmentSheetOpen(false);
															setStickerPanelOpen(false);
															setAiImagePanelOpen(current => !current);
														}}
														className="wa-sticker-button wa-input-action"
													>
														<Sparkles size={18} strokeWidth={2} />
													</button>
													<textarea
														aria-label={t.message}
														value={draft}
														onChange={event => {
															setDraft(event.target.value);
															notifyPeerTyping();
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
														dir={draftPresentation.dir}
														lang={draftPresentation.lang}
														style={draftPresentation.style}
														placeholder={t.message}
														className={`wa-composer-input max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 leading-5 outline-none ${draftPresentation.className || ''}`}
													/>
													<button
														type="button"
														aria-label="Camera"
														title="Camera or photo picker"
														onClick={() =>
															openComposerFilePicker({
																accept: 'image/*',
																capture: 'environment',
															})
														}
														className="wa-camera-button wa-input-action min-[769px]:hidden"
													>
														<Camera size={20} strokeWidth={2} />
													</button>
													{draft.trim() || composerImages.length ? (
														<>
															<button
																type="button"
																disabled={sending || demo.settings.enabled}
																title={t.scheduleMessage}
																aria-label={t.scheduleMessage}
																onClick={openSchedulePopover}
																className="wa-input-action"
															>
																<Clock size={18} strokeWidth={2} />
															</button>
															<button
																type="submit"
																aria-label={t.send}
																disabled={sending}
																className="wa-send-button"
																style={{ background: GRADIENT }}
															>
																{sending ? (
																	<Loader2 size={17} className="animate-spin" />
																) : (
																	<Send size={17} strokeWidth={2.1} />
																)}
															</button>
														</>
													) : (
														<div className="wa-composer-end-actions flex shrink-0 items-center gap-0.5">
															<button
																type="button"
																disabled={sending || demo.settings.enabled}
																title={t.scheduleMessage}
																aria-label={t.scheduleMessage}
																onClick={openSchedulePopover}
																className="wa-input-action"
															>
																<Clock size={18} strokeWidth={2} />
															</button>
															<button
																type="button"
																disabled={sending}
																title={t.voiceChanger}
																aria-label={t.voiceChanger}
																onClick={() => setVoiceChangerOpen(true)}
																className={`wa-voice-changer-button wa-input-action ${
																	voiceChangerSettings?.enabled ? 'is-active' : ''
																}`}
															>
																<AudioLines size={18} strokeWidth={2} />
															</button>
															<button
																type="button"
																disabled={sending}
																title={t.recordVoice}
																aria-label={t.recordVoice}
																onClick={startVoiceRecording}
																className="wa-mic-button wa-input-action"
															>
																<Mic size={20} strokeWidth={2} />
															</button>
														</div>
													)}
												</div>
											)}
										</form>
									) : (
										<div className="border-t border-slate-100 p-3 text-center text-sm font-bold text-slate-400 dark:border-slate-800">
											{isEmailMemoAiConversation(selectedConversation)
												? locale === 'ar'
													? 'محادثة AI Memo Emails — للعرض فقط'
													: 'AI Memo Emails inbox — view only'
												: t.readOnly}
										</div>
									)}
									</div>
								</>
									)}
								</>
							)}
						</section>
						{selectedSecondaryConversation ? (
							<WhatsAppSplitPane
								conversation={selectedSecondaryConversation}
								accountId={accountId}
								locale={locale}
								labels={t}
								canCompose={canUseWhatsApp && !demo.settings.enabled}
								onClose={() => {
									setSecondaryConversationId(null);
									setSplitPickMode(false);
								}}
							/>
						) : null}
					</Card>
				)}

				{activeTab === 'calls' && (
					<MobileCallsView logs={logs} labels={t} locale={locale} loading={tabLoading} />
				)}

				{activeTab === 'groups' && (
					tabLoading ? (
						<div className="wa-secondary-pane">
							<div className="wa-pane-loading">
								<Loader2 size={18} className="animate-spin" />
								{t.loading}
							</div>
						</div>
					) : (
						<div className="wa-groups-pane grid h-full min-h-0 gap-0 min-[769px]:grid-cols-[minmax(280px,360px)_1fr]">
							<aside className="wa-groups-list flex min-h-0 flex-col overflow-hidden border-e border-[var(--wa-border,#e9edef)] bg-white">
								<div className="wa-secondary-pane__header">
									<div className="wa-secondary-pane__heading">
										<Users size={18} strokeWidth={1.75} aria-hidden="true" />
										<div>
											<h2 className="wa-secondary-pane__title">{t.groups}</h2>
										</div>
									</div>
									<button
										type="button"
										aria-label={t.refresh}
										onClick={() => loadTabData('groups')}
										className="wa-toolbar-icon-btn"
										title={t.refresh}
									>
										<RefreshCw size={16} strokeWidth={1.85} />
									</button>
								</div>
								<div className="min-h-0 flex-1 overflow-y-auto nice-scroll">
									{groups.length === 0 ? (
										<div className="p-5">
											<Empty icon={Users} title={t.noGroups} />
										</div>
									) : (
										<div>
											{groups.map(group => (
												<button
													type="button"
													key={group.id}
													onClick={() => openGroupDetails(group)}
													className={`wa-conversation-row relative flex w-full items-center gap-3 text-start ${
														selectedGroup?.id === group.id ? 'is-active' : ''
													}`}
												>
													<Avatar label={group.subject} size={11} />
													<div className="min-w-0 flex-1">
														<p className="title-chat truncate">{group.subject}</p>
														<p className="desc-chat text-xs text-[#667781]">
															{group.participantCount || group.participants?.length || 0}{' '}
															{t.groupParticipants.toLowerCase()}
														</p>
													</div>
												</button>
											))}
										</div>
									)}
								</div>
							</aside>

							<section className="wa-groups-detail flex min-h-0 flex-col overflow-hidden bg-white">
								{!selectedGroup ? (
									<div className="flex flex-1 items-center justify-center p-5">
										<Empty icon={Users} title={t.groupDetails} hint={t.selectConversation} />
									</div>
								) : (
									<>
										<div className="wa-secondary-pane__header flex-wrap">
											<div className="flex min-w-0 flex-1 items-center gap-3">
												<Avatar label={selectedGroup.subject} size={12} />
												<div className="min-w-0 flex-1">
													<h2 className="wa-secondary-pane__title truncate">{selectedGroup.subject}</h2>
													<p className="wa-secondary-pane__subtitle">
														{selectedGroup.participantCount || selectedGroup.participants?.length || 0}{' '}
														{t.groupParticipants.toLowerCase()}
													</p>
												</div>
											</div>
											<button
												type="button"
												onClick={() => openGroupChat(selectedGroup)}
												disabled={!selectedGroup.conversationId}
												className="wa-primary-btn disabled:cursor-not-allowed disabled:opacity-40"
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
							</section>
						</div>
					)
				)}

				{activeTab === 'statuses' && (
					<div className="wa-secondary-pane wa-statuses-pane">
						<header className="wa-secondary-pane__header">
							<div className="wa-secondary-pane__heading">
								<Zap size={18} strokeWidth={1.75} aria-hidden="true" />
								<div>
									<h2 className="wa-secondary-pane__title">{t.statuses}</h2>
								</div>
							</div>
							<button
								type="button"
								onClick={() => loadTabData('statuses', true)}
								disabled={syncingStatuses}
								className="wa-toolbar-icon-btn disabled:opacity-50"
								title={t.refresh}
							>
								<RefreshCw size={16} className={syncingStatuses ? 'animate-spin' : undefined} />
							</button>
						</header>
						<div className="wa-statuses-body min-h-0 flex-1 overflow-y-auto p-4 nice-scroll">
							{canUseWhatsApp && (
								<form onSubmit={publishStory} className="mb-4 flex gap-2">
									<input
										aria-label={t.statusUpdate}
										value={statusDraft}
										onChange={event => setStatusDraft(event.target.value)}
										placeholder={t.statusUpdate}
										maxLength={700}
										className="wa-input-3d h-11 flex-1 rounded-full border border-[var(--wa-border,#e9edef)] bg-[var(--wa-input,#f0f2f5)] px-4 text-sm outline-none transition-colors focus:border-[var(--wa-accent,#00a884)]"
									/>
									<button
										type="submit"
										disabled={publishingStatus || !statusDraft.trim()}
										className="wa-primary-btn h-11 disabled:opacity-50"
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
								<div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-4 gap-y-5">
									{groupedStatuses.map((story, storyIndex) => {
										const name =
											story.latest.contactName ||
											(story.latest.isOwn
												? selectedAccount?.label || t.accounts
												: String(story.senderWaId).replace(/@.*$/, ''));
										const viewed = story.isViewed;
										const thumb = storyThumbs[story.latest.id];
										return (
											<button
												type="button"
												key={story.senderWaId}
												onClick={() => openStoryGroup(story)}
												className="group cursor-pointer text-center transition-transform hover:-translate-y-0.5"
											>
												<div className="relative mx-auto h-[96px] w-[96px] transition-transform duration-200 group-hover:scale-[1.03]">
													<StoryRing
														size={96}
														strokeWidth={3.25}
														segmentsViewed={story.items.map(item => viewedStatusIds.has(item.id))}
														idSuffix={String(story.senderWaId).replace(/[^a-zA-Z0-9_-]/g, '_')}
													/>
													<div className="absolute inset-[6px] overflow-hidden rounded-full border-[2.5px] border-white bg-white shadow-md dark:border-slate-900 dark:bg-slate-900">
														<StoryThumbnail
															label={name}
															size={20}
															viewed={viewed}
															priority={storyIndex < 12}
															thumbUrl={thumb?.url}
															thumbType={thumb?.type}
														/>
													</div>
												</div>
												<p className={`mt-2 truncate text-xs ${viewed ? 'font-semibold text-slate-500' : 'font-bold'}`}>
													{name}
												</p>
												<p className="text-[10px] text-slate-400">{relativeTime(story.latest.publishedAt, relativeTimeNow, locale)}</p>
											</button>
										);
									})}
								</div>
							)}
						</div>

						{selectedStatus && (
							<div
								role="dialog"
								aria-modal="true"
								aria-label={t.storyFrom}
								className="fixed inset-0 z-50 grid cursor-default place-items-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-5"
								onClick={closeStory}
								onKeyDown={event => {
									if (event.key === 'Escape') closeStory();
								}}
							>
								<div
									className="relative flex h-[min(920px,96vh)] w-full max-w-xl cursor-default flex-col overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl"
									onClick={event => event.stopPropagation()}
								>
									<div className="absolute inset-x-3 top-3 z-10 flex gap-1.5">
										{(storyQueue.length ? storyQueue : [selectedStatus]).map((item, index) => (
											<div key={item.id || index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
												<div
													ref={index === storyIndex ? storyProgressBarRef : undefined}
													className="h-full bg-white will-change-[width]"
													style={{
														width:
															index < storyIndex
																? '100%'
																: index > storyIndex
																	? '0%'
																	: undefined,
													}}
												/>
											</div>
										))}
									</div>
									<div className="absolute inset-x-0 top-5 z-40 flex items-center gap-2 px-4 py-3 pointer-events-none sm:gap-3">
										<div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2.5">
											<Avatar label={selectedStatus.contactName || selectedStatus.senderWaId} size={8} />
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
												setStoryLoop(current => !current);
											}}
											title={storyLoop ? t.loopStoryOn : t.loopStoryOff}
											className={`pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${
												storyLoop
													? 'bg-emerald-500 text-white hover:bg-emerald-400'
													: 'bg-black/40 hover:bg-black/60'
											}`}
											aria-label={t.loopStory}
											aria-pressed={storyLoop}
										>
											<Repeat size={17} />
										</button>
										<button
											type="button"
											onClick={event => {
												event.preventDefault();
												event.stopPropagation();
												setStoryPaused(current => !current);
											}}
											className="pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
											aria-label={
												storyPaused
													? locale === 'ar'
														? 'تشغيل القصة'
														: 'Play story'
													: locale === 'ar'
														? 'إيقاف القصة'
														: 'Pause story'
											}
										>
											{storyPaused ? (
												<Play size={18} className="ms-0.5" fill="currentColor" />
											) : (
												<Pause size={18} fill="currentColor" />
											)}
										</button>
										<button
											type="button"
											onClick={event => {
												event.preventDefault();
												event.stopPropagation();
												closeStory();
											}}
											className="pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
											aria-label={locale === 'ar' ? 'إغلاق القصة' : 'Close story'}
										>
											<X size={19} />
										</button>
									</div>
									{!storyViewerEmbed && (
										<>
											<button
												type="button"
												aria-label="Previous story"
												onClick={() => goStory(-1)}
												className="absolute bottom-24 start-0 top-24 z-20 flex w-1/3 cursor-default items-center justify-start bg-transparent p-3"
											>
												{storyQueue.length > 1 && storyIndex > 0 && (
													<span className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50">
														{locale === 'ar' ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
													</span>
												)}
											</button>
											<button
												type="button"
												aria-label="Next story"
												onClick={() => goStory(1)}
												className="absolute bottom-24 end-0 top-24 z-20 flex w-1/3 cursor-default items-center justify-end bg-transparent p-3"
											>
												{(storyLoop || storyIndex < storyQueue.length - 1) && storyQueue.length > 1 && (
													<span className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50">
														{locale === 'ar' ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
													</span>
												)}
											</button>
										</>
									)}
									<div className="relative z-10 flex min-h-0 flex-1 items-center justify-center pt-20">
										{loadingStory ? (
											<Loader2 size={32} className="animate-spin" />
										) : storyViewerEmbed ? (
											<div className="relative z-30 flex h-full w-full flex-col gap-2 px-3 pb-3 pt-2">
												<div className="flex items-center justify-between gap-2">
													<button
														type="button"
														onClick={() => {
															setStoryViewerEmbed(null);
															setStoryPaused(false);
														}}
														className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-white/20"
													>
														{locale === 'ar' ? 'رجوع للحالة' : 'Back to story'}
													</button>
													<a
														href={storyViewerEmbed.openUrl}
														target="_blank"
														rel="noreferrer"
														onClick={event => event.stopPropagation()}
														className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-white/20"
													>
														<ExternalLink size={13} />
														{t.openLinkExternally}
													</a>
												</div>
												<div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
													<iframe
														title={t.viewLinkInStory}
														src={storyViewerEmbed.embedUrl}
														className="absolute inset-0 h-full w-full border-0"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
														allowFullScreen
														referrerPolicy="strict-origin-when-cross-origin"
													/>
												</div>
											</div>
										) : String(selectedStatus.type).toLowerCase().includes('video') && statusMediaUrl ? (
											<video
												ref={storyVideoRef}
												src={statusMediaUrl}
												controls={false}
												autoPlay
												playsInline
												onLoadedMetadata={event => {
													if (event.target.duration) setStoryDurationMs(event.target.duration * 1000);
												}}
												onError={() => {
													setStatusMediaUrl(null);
													toast.error(t.mediaUnavailable);
												}}
												className="pointer-events-none max-h-full w-full object-contain"
											/>
										) : statusMediaUrl ? (
											<img
												src={statusMediaUrl}
												alt={selectedStatus.caption || 'WhatsApp story'}
												className="pointer-events-none max-h-full w-full object-contain"
												onError={() => {
													setStatusMediaUrl(null);
													toast.error(t.mediaUnavailable);
												}}
											/>
										) : (
											<div className={`grid h-full w-full place-items-center bg-gradient-to-br ${gradientFor(selectedStatus.providerStatusId)}`}>
												{selectedStatus.caption
													? renderStoryLinkedText(
															selectedStatus.caption,
															'max-w-md whitespace-pre-wrap px-8 text-center text-2xl font-black leading-relaxed sm:text-3xl',
														)
													: (
														<p className="max-w-md px-8 text-center text-3xl font-black leading-relaxed">
															{t.mediaUnavailable}
														</p>
													)}
												{firstMessageLink(selectedStatus.caption || '') &&
													getStoryMediaEmbed(
														firstMessageLink(selectedStatus.caption || '').href,
													) && (
														<button
															type="button"
															onClick={() =>
																openStoryLink(
																	firstMessageLink(selectedStatus.caption || '').href,
																)
															}
															className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-white/25"
														>
															<Play size={15} fill="currentColor" />
															{t.viewLinkInStory}
														</button>
													)}
											</div>
										)}
									</div>
									{selectedStatus.caption && statusMediaUrl && !storyViewerEmbed && (
										<div className="relative z-30 bg-black/35 px-5 py-3 text-center text-sm">
											{renderStoryLinkedText(selectedStatus.caption)}
										</div>
									)}
									{!selectedStatus.isOwn && canUseWhatsApp && !demo.settings.enabled && (
										<form
											onSubmit={replyToCurrentStory}
											className="relative z-40 flex items-center gap-2 border-t border-white/10 bg-black/45 px-3 py-3 backdrop-blur-md"
											onClick={event => event.stopPropagation()}
										>
											<Reply size={16} className="shrink-0 text-white/70" />
											<input
												type="text"
												value={storyReplyDraft}
												onChange={event => setStoryReplyDraft(event.target.value)}
												onFocus={() => setStoryPaused(true)}
												placeholder={t.replyToStoryPlaceholder}
												maxLength={1000}
												disabled={sendingStoryReply}
												className="h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/45 focus:border-emerald-400/70"
											/>
											<button
												type="submit"
												disabled={sendingStoryReply || !storyReplyDraft.trim()}
												className="inline-flex h-11 items-center gap-1.5 rounded-full bg-emerald-500 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-400 disabled:opacity-45"
											>
												{sendingStoryReply ? (
													<Loader2 size={15} className="animate-spin" />
												) : (
													<>
														<Send size={14} />
														{t.replyToStory}
													</>
												)}
											</button>
										</form>
									)}
								</div>
							</div>
						)}
					</div>
				)}

				{activeTab === 'profile' && (
					<Card className="wa-whatsapp-profile wa-secondary-pane mx-auto max-w-xl overflow-hidden border-0 shadow-none">
						{selectedAccount ? (
							<div>
								<div className="flex flex-col items-center gap-3 bg-[#f0f2f5] px-5 py-8 dark:bg-slate-800">
									<Avatar
										label={selectedAccount.label}
										size={24}
										className="ring-4 ring-white dark:ring-slate-900"
									/>
									<div className="text-center">
										<p className="text-lg font-bold text-slate-900 dark:text-white">
											{selectedAccount.label}
										</p>
										{selectedAccount.phoneNumber ? (
											<p className="mt-1 text-sm text-slate-500" dir="ltr">
												{selectedAccount.phoneNumber}
											</p>
										) : null}
									</div>
									{accStatus ? (
										<span className={`rounded-full px-3 py-1 text-xs font-semibold ${accStatus.bg} ${accStatus.text}`}>
											{accStatus.label}
										</span>
									) : null}
								</div>
								<div className="divide-y divide-slate-100 dark:divide-slate-800">
									<div className="flex items-start gap-3 px-5 py-4">
										<User size={18} className="mt-0.5 text-[#00a884]" />
										<div className="min-w-0">
											<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
												{t.profileName}
											</p>
											<p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
												{selectedAccount.label}
											</p>
										</div>
									</div>
									{selectedAccount.phoneNumber ? (
										<div className="flex items-start gap-3 px-5 py-4">
											<Phone size={18} className="mt-0.5 text-[#00a884]" />
											<div className="min-w-0">
												<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
													{t.profilePhone}
												</p>
												<p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white" dir="ltr">
													{selectedAccount.phoneNumber}
												</p>
											</div>
										</div>
									) : null}
									<div className="flex items-start gap-3 px-5 py-4">
										<ShieldCheck size={18} className="mt-0.5 text-[#00a884]" />
										<div className="min-w-0">
											<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
												{t.profileStatus}
											</p>
											<p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
												{accStatus?.label || selectedAccount.status}
											</p>
										</div>
									</div>
									{selectedAccount.lastConnectedAt ? (
										<div className="flex items-start gap-3 px-5 py-4">
											<Clock size={18} className="mt-0.5 text-[#00a884]" />
											<div className="min-w-0">
												<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
													{t.lastConnected}
												</p>
												<p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
													{new Date(selectedAccount.lastConnectedAt).toLocaleString()}
												</p>
											</div>
										</div>
									) : null}
								</div>
								<div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
									<button
										type="button"
										onClick={() => void loadTabData('accounts')}
										className="text-sm font-semibold text-[#00a884] hover:underline"
									>
										{t.manageWhatsAppAccount}
									</button>
								</div>
							</div>
						) : (
							<div className="px-5 py-10 text-center text-sm text-slate-500">
								<p>{t.noWhatsAppProfile}</p>
								<button
									type="button"
									onClick={() => void loadTabData('accounts')}
									className="mt-3 text-sm font-semibold text-[#00a884] hover:underline"
								>
									{t.manageWhatsAppAccount}
								</button>
							</div>
						)}
					</Card>
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

				{activeTab === 'board' && (
					<div
						className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
						onClick={event => event.stopPropagation()}
						onMouseDown={event => event.stopPropagation()}
					>
						<WhatsAppBoardTab
							accountId={accountId}
							locale={locale}
							onOpenConversation={conversationIdToOpen => {
								if (!conversationIdToOpen) return;
								openConversationFromReport(conversationIdToOpen);
							}}
						/>
					</div>
				)}

				{activeTab === 'emails' && (
					<div className="wa-secondary-pane wa-emails-pane">
						<Suspense
							fallback={
								<div className="wa-pane-loading">
									<Loader2 size={18} className="animate-spin" />
									{t.loading || 'Loading…'}
								</div>
							}
						>
							<EmailMemoWorkspace />
						</Suspense>
					</div>
				)}

				{activeTab === 'reports' && (
					<div className="wa-secondary-pane wa-reports-pane">
						<header className="wa-secondary-pane__header">
							<div className="wa-secondary-pane__heading">
								<TrendingUp size={18} strokeWidth={1.75} aria-hidden="true" />
								<div>
									<h2 className="wa-secondary-pane__title">{t.reports}</h2>
									<p className="wa-secondary-pane__subtitle">{t.reportsHint}</p>
								</div>
							</div>
						</header>
						<div className="min-h-0 flex-1 overflow-y-auto p-4 nice-scroll">
						<WhatsAppReportsTab
							locale={locale}
							t={t}
							report={report}
							loading={tabLoading}
							periodDays={reportPeriodDays}
							onPeriodChange={days => {
								setReportPeriodDays(days);
								reportPeriodDaysRef.current = days;
								void loadTabData('reports');
							}}
							staffDetail={reportStaffDetail}
							staffDetailLoading={reportStaffDetailLoading}
							onOpenStaff={fetchStaffReportDetail}
							onOpenConversation={openConversationFromReport}
						/>
						</div>
					</div>
				)}

				{activeTab === 'settings' && (
					tabLoading ? (
						<div className="wa-secondary-pane">
							<div className="wa-pane-loading">
								<Loader2 size={18} className="animate-spin" />
								{t.loading}
							</div>
						</div>
					) : (
						<div className="wa-settings-pane space-y-4">
							<div
								role="tablist"
								aria-label={t.settings}
								className="wa-settings-tablist nice-scroll"
							>
								{[
									{ id: 'ai', label: t.settingsAi, icon: Sparkles },
									{ id: 'demo', label: t.settingsDemo, icon: Zap },
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
											className={`wa-settings-tab ${selected ? 'is-active' : ''}`}
										>
											<Icon size={15} strokeWidth={1.85} />
											{item.label}
										</button>
									);
								})}
							</div>

							{settingsSection === 'ai' && accountId && (
								<>
									<WhatsAppWorkspaceAiParts
										onRepliesAssigned={({ provider, model }) =>
											whatsappAi.saveSettings({ provider, model })
										}
									/>
								<WhatsAppAiSettings
									locale={locale}
									settings={whatsappAi.settings}
									loading={whatsappAi.settingsLoading}
									saving={whatsappAi.settingsSaving}
									error={whatsappAi.settingsError}
									onSave={whatsappAi.saveSettings}
								/>
								</>
							)}
							{settingsSection === 'demo' && (
								<DemoModeSettings
									locale={locale}
									realAccountId={accountId}
									realConversations={conversations}
								/>
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
											className="wa-primary-btn"
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
										<WaCustomSelect
											ariaLabel={t.readReceiptMode}
											value={privacySettings.readReceiptMode}
											onChange={value =>
												setPrivacySettings(current => ({
													...current,
													readReceiptMode: value,
												}))
											}
											buttonClassName="h-11 text-sm"
											options={[
												{ value: 'on_open', label: t.readOnOpen },
												{ value: 'on_reply', label: t.readOnReply },
												{ value: 'manual', label: t.readManual },
												{ value: 'never', label: t.readNever },
											]}
										/>
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
											className="wa-input-3d h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-sm outline-none transition-colors focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-800"
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
			</div>
			{!(isConversationWorkspaceTab(activeTab) && conversationId) && (
				<MobileWhatsAppNav
					activeTab={activeTab}
					onSelect={tab => void loadTabData(tab)}
					labels={t}
					unreadCount={unreadConversationCount}
				/>
			)}
			<MessageReactionPicker
				open={Boolean(reactionPickerMessage)}
				locale={locale}
				mine={reactionPickerMessage?.direction === 'outbound'}
				busy={
					Boolean(reactionPickerMessage) &&
					reactingMessageIds.has(reactionPickerMessage.id)
				}
				anchorRect={reactionPickerAnchor}
				activeEmoji={ownReactionEmoji(reactionPickerMessage)}
				onReact={emoji => {
					if (reactionPickerMessage) void reactToMessage(reactionPickerMessage, emoji);
				}}
				onClose={closeReactionPicker}
			/>
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
			<MultiMessageActionMenu
				open={Boolean(multiMessageMenuAnchor)}
				anchorRect={multiMessageMenuAnchor}
				locale={locale}
				selectedCount={selectedMessageIds.size}
				messageIds={[...selectedMessageIds]}
				accountId={accountId}
				conversationId={conversationId}
				canTranscribe={selectedMessageIds.size > 0}
				canUseBoard={
					!demo.settings.enabled && !isDemoId(conversationId) && Boolean(accountId)
				}
				canUseGroups={!demo.settings.enabled && !isDemoId(conversationId)}
				busy={messageGroupsBusy}
				onClose={() => setMultiMessageMenuAnchor(null)}
				onAction={handleMultiMessageAction}
				onBoardSuccess={() => {
					setTicketSelectMode(false);
					setGroupSelectMode(false);
					setSelectedMessageIds(new Set());
					setGroupPickerOpen(false);
					toast.success(t.sentToBoard);
				}}
			/>
			{conversationAssignTarget && (
				<div className="fixed inset-0 z-[110] grid place-items-end bg-black/25 p-4 backdrop-blur-sm sm:place-items-center" onClick={() => setConversationAssignTarget(null)}>
					<div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div>
								<h3 className="text-lg font-bold">{locale === 'ar' ? 'تعيين المحادثة' : 'Assign conversation'}</h3>
								<p className="wa-privacy-identity text-sm text-[#667781]">{conversationTitle(conversationAssignTarget)}</p>
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
							{assignableStaff.map(user => (
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
										<p className="truncate text-xs text-[#667781]">
											{staffAssignHint(
												report?.staff?.find(item => item.userId === user.id),
												locale,
											) || user.email}
										</p>
									</div>
									{conversationAssignTarget.assignedUserId === user.id && <Check size={18} className="text-[#00a884]" />}
								</button>
							))}
							{assignableStaff.length === 0 ? (
								<p className="px-3 py-4 text-center text-sm text-[#667781]">
									{locale === 'ar'
										? 'لا يوجد موظفون بصلاحية عرض واستخدام لهذا الحساب. امنحهم الصلاحية من الإعدادات أولاً.'
										: 'No staff with view and use access on this account. Grant access in Settings first.'}
								</p>
							) : null}
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
							<Avatar label={conversationTitle(conversationInfoTarget)} size={20} src={conversationAvatarUrl(conversationInfoTarget)} isGroup={conversationInfoTarget.type === 'group'} />
							<h4 className="wa-privacy-identity mt-3 text-xl font-bold">{conversationTitle(conversationInfoTarget)}</h4>
							<p className="wa-privacy-identity text-sm text-[#667781]">
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
			{(sharingMessageIds?.length || forwardingMessage) && (
				<div
					className="fixed inset-0 z-[110] grid place-items-end bg-black/35 p-4 sm:place-items-center"
					onClick={() => {
						if (sharingBusy) return;
						setSharingMessageIds(null);
						setForwardingMessage(null);
					}}
				>
					<div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div className="min-w-0">
								<h3 className="text-lg font-bold">
									{locale === 'ar' ? 'إرسال إلى' : 'Send to'}
								</h3>
								<p className="mt-0.5 text-xs text-[#667781]">
									{locale === 'ar'
										? `${sharingMessageIds?.length || 1} رسالة · تظهر كأنها مرسلة منك · الردود تُحفظ مع الاقتباس فوقها`
										: `${sharingMessageIds?.length || 1} message(s) · sent as yours · replies keep the quote on top`}
								</p>
							</div>
							<button
								type="button"
								disabled={sharingBusy}
								onClick={() => {
									setSharingMessageIds(null);
									setForwardingMessage(null);
								}}
								className="rounded-full p-2 hover:bg-slate-100 disabled:opacity-50"
							>
								<X size={18} />
							</button>
						</div>
						<div className="max-h-[58vh] overflow-y-auto p-2">
							{conversations
								.filter(item => item.id !== conversationId && item.accountId === selectedConversation?.accountId)
								.map(item => (
									<button
										key={item.id}
										type="button"
										onClick={() => void shareMessagesAsOriginal(item.id)}
										disabled={sharingBusy}
										className="flex w-full items-center gap-3 rounded-xl p-3 text-start hover:bg-slate-100 disabled:opacity-50"
									>
										<Avatar label={conversationTitle(item)} size={10} src={conversationAvatarUrl(item)} isGroup={item.type === 'group'} />
										<span className="min-w-0 flex-1 truncate font-semibold">{conversationTitle(item)}</span>
										{sharingBusy ? (
											<Loader2 size={18} className="animate-spin text-[#00a884]" />
										) : (
											<Send size={18} className="text-[#00a884]" />
										)}
									</button>
								))}
							{!conversations.some(
								item => item.id !== conversationId && item.accountId === selectedConversation?.accountId,
							) && (
								<p className="px-3 py-8 text-center text-sm text-[#667781]">
									{locale === 'ar' ? 'لا توجد محادثات أخرى في هذا الحساب' : 'No other chats on this account'}
								</p>
							)}
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
									<p className="wa-privacy-identity font-semibold">{messageInfo.message?.text || messageInfo.type}</p>
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
			<ScheduleMessageDialog
				open={scheduleDialogOpen}
				onOpenChange={closeSchedulePopover}
				anchorEl={scheduleAnchorEl}
				ar={locale === 'ar'}
				accountId={accountId}
				conversations={scheduleConversationOptions}
				initialConversationId={conversationId}
				initialText={draft}
				onCreated={() => {
					if (conversationId) void loadMessageSchedules(conversationId);
				}}
			/>
			<VoiceChangerDialog
				open={voiceChangerOpen}
				onOpenChange={setVoiceChangerOpen}
				locale={locale}
				onChooseChat={startCloneVoicePick}
				pendingCloneSamplesRef={pendingCloneSamplesRef}
				onSaved={data => {
					voiceChangerSettingsRef.current = data;
					setVoiceChangerSettings(data);
				}}
			/>
			<TranscriptionDialog
				open={Boolean(transcriptionSources?.length)}
				onOpenChange={open => {
					if (!open) setTranscriptionSources(null);
				}}
				items={transcriptionSources}
				loadVoiceFile={loadTranscriptionSourceFile}
			/>
			<ChatImageViewer
				images={chatImages}
				activeId={activeChatImageId}
				onClose={() => setActiveChatImageId(null)}
				onChange={setActiveChatImageId}
			/>
			<ChatDocumentViewer
				open={Boolean(documentPreview?.blob)}
				file={documentPreview}
				locale={locale}
				onClose={() => setDocumentPreview(null)}
			/>
		</div>
	);
}

