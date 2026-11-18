'use client';

import { cloneElement, Fragment, isValidElement, lazy, memo, Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTheme } from '@/app/[locale]/theme';
import {
	Activity,
	AlertCircle,
	AudioLines,
	AlertTriangle,
	Archive,
	BarChart3,
	Bell,
	BellOff,
	Bookmark,
	BookmarkPlus,
	BookOpen,
	BookUser,
	Bot,
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
	CircleDashed,
	Pencil,
	FileVideo,
	FolderKanban,
	Forward,
	Wallet,
	Globe2,
	Image as ImageIcon,
	ImageOff,
	Images,
	Info,
	LayoutGrid,
	ListChecks,
	ListFilter,
	Languages,
	Loader2,
	LogOut,
	Mail,
	MapPin,
	Navigation,
	Utensils,
	Coffee,
	Pill,
	Banknote,
	Fuel,
	Maximize2,
	Minimize2,
	Expand,
	MessageCircle,
	Mic,
	Moon,
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
	RefreshCw,
	Repeat,
	Repeat2,
	Reply,
	Search,
	Send,
	Settings,
	Share2,
	Smile,
	ShieldCheck,
	Smartphone,
	SmilePlus,
	Sparkles,
	Star,
	Sun,
	Trash2,
	TrendingUp,
	User,
	Volume2,
	VolumeX,
	ZoomIn,
	ZoomOut,
	UserPlus,
	UserCircle2,
	UserRound,
	Users,
	UsersRound,
	Video,
	Wifi,
	WifiOff,
	X,
	Zap,
	Flag,
	Radio,
	GraduationCap,
} from 'lucide-react';
import api, { whatsappLiveApi, whatsappLiveOrigin } from '@/utils/axios';
import { notifyWhatsAppUnreadChanged } from '@/lib/outreach-unread';
import { clearAppBadgeSource, syncAppBadge } from '@/lib/app-badge';
import { createVisiblePoller } from '@/lib/visible-poll';
import MessageSavedTranscript from './MessageSavedTranscript';
import {
	getMessageTranscriptsForIds,
	saveMessageTranscripts,
} from './whatsapp-message-transcripts';
import {
	buildSelectedMessagesCopyText,
	messageNeedsTranscription,
	resolveStoredTranscript,
	sortMessagesByTime,
	transcriptTextByIdFromTimeline,
} from './whatsapp-selected-copy';
import WhatsAppChatIdlePane from './WhatsAppChatIdlePane';
import SocialVideoActions from './social-download/SocialVideoActions';
import ScheduledMessagesPanel from './schedule-message/ScheduledMessagesPanel';
import { createNotifyStateCache, shouldNotifyForConversation } from './whatsapp-mute';
import DelayedSendPopover, { DelayedSendBanner, DelayedSendButton } from './schedule-message/DelayedSendControl';
import WaitingMessagesQueue, { waitingOnceSchedules } from './schedule-message/WaitingMessagesQueue';
import {
	DEFAULT_DELAYED_SEND_PREFS,
	browserTimeZone,
	computeDelayedSend,
	delayedSendTitle,
	isDelayedSendOnForChat,
	readDelayedSendPrefs,
	writeDelayedSendForChat,
	writeDelayedSendPrefs,
} from './schedule-message/delayed-send';
import PinnedMessagesPanel from './PinnedMessagesPanel';
import ChatSearchBar from './ChatSearchBar';
import {
	loadConversationHistoryForClone,
	loadMoreConversationHistoryForClone,
} from './voice-changer/voice-clone-chat-samples';
import {
	fetchVoiceChangerSettings,
	readVoiceChangerError,
	transformVoiceNote,
} from './voice-changer/voice-changer-client';
import {
	createTranscriptionFile,
	isMediaTranscriptKind,
	isSelectableTranscriptMessage,
	isVideoMessage as isTranscriptVideoMessage,
	MAX_TRANSCRIPT_BUNDLE_ITEMS,
	toTranscriptSource,
} from '../transcript/transcription-client';
import {
	conversationTitle,
	conversationAvatarUrl,
	inboxAvatarForWaId,
	buildWhatsAppMentionDirectory,
	buildComposerMentionCandidates,
	encodeComposerMentions,
	filterComposerMentionCandidates,
	findComposerMentionQuery,
	resolveWhatsAppMentionLabel,
	textWithMentionLabels,
	conversationUnreadCount,
	conversationMatchesInboxFilter,
	WHATSAPP_INBOX_CHIP_FILTERS,
	canShowFakeChat,
	isChannelsInboxFilter,
	isChannelConversation,
	firstMessageLink,
	firstSocialVideoLink,
	defaultLibraryItemTitle,
	textWithoutFirstLink,
	formatWhatsAppPhone,
	whatsAppIdDigits,
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
	isEnglishMessageText,
	messageTextPresentation,
	normalizeWhatsAppIdentity,
	looksLikeMarkdown,
	parseWhatsAppBold,
	compressImageForWhatsApp,
	withAsyncTimeout,
	quotedMessageLabel,
	quotedMessagePreview,
	quotedPreviewFromMessage,
	quotedTargetFromMessage,
	resolveQuotedReplySource,
	buildReplySnapshot,
	messageMatchesQuotedTarget,
	messageTextSegments,
	relativeTime,
	scopeMessagesToConversation,
	foldWhatsAppSearchText,
	seekRatio,
	sortConversationsByActivity,
	updateConversationPreview,
	conversationPreview,
	isViewOnceMessage,
	shouldAutoFocusTextEntry,
	viewOnceMessageHint,
	viewOnceMessageLabel,
	conversationPreviewShowsReaction,
	normalizeWhatsAppReactions,
	latestPeerReaction,
	visibleMessageText,
	clipboardImageFiles,
	isComposerImageFile,
	normalizeComposerImageFile,
	voiceDurationSecondsFromSource,
	isLocalMediaUrl,
	localMediaFileUrl,
	isPlayableVideoUrl,
	applyThreadScrollAnchor,
	captureThreadScrollAnchor,
	findThreadAnchorRow,
	shouldStickThreadToBottom,
	shouldShowJumpToBottom,
	shouldAutoLoadOlder,
	isThreadNearBottom,
	isThreadPinnedToBottom,
	threadDistanceFromBottom,
	THREAD_PIN_THRESHOLD_PX,
	THREAD_RESTORE_MAX_MS,
	mediaDimensionsForAttachment,
	rememberMediaDimensions,
	reservedMediaBoxStyle,
	isPortraitMediaDims,
	buildChatViewerImages,
	viewerNeighborIds,
	viewerThumbSrc,
	viewerFullSrc,
	isInlineImageDataUrl,
	isDeletedWhatsAppMessage,
	deletedWhatsAppMessageLabel,
	computeAnchoredMenuPosition,
	shouldCompensateRowResize,
} from './whatsapp-utils';
import {
	installWaScrollSpy,
	waScrollApply,
	waScrollLog,
	waScrollMark,
	waScrollTo,
} from './wa-scroll-debug';
import './wa-story-panel.css';
import './wa-ui.css';
import './wa-mobile.css';
import './wa-desktop-palette.css';
import './wa-desktop.css';
import './wa-desktop-chats.css';
import './wa-memo-docs.css';
import './wa-popups.css';
import './wa-settings.css';
import './wa-composer-premium.css';
import { buildCompletionModel, rememberSentText, suggestCompletion } from './wa-autocomplete';
import { useMenuKeyboard } from './wa-ui-menu';
import { markVoicePlayed, useVoicePlayed } from './voice-played-store';
import { installMobileViewport } from './mobile-viewport';
import {
	downloadContactVcard,
	extractRawVcardFromMessage,
	isContactMessage,
	parseContactFromMessage,
} from './whatsapp-contact';
import { WhatsAppFileTypeIcon, whatsappFileIconSrc } from './whatsapp-file-icons';
import { createWhatsAppTabLeader } from './whatsapp-tab-leader';
import { DemoModeProvider, useDemoMode } from './demo/DemoModeProvider';
import { demoApi } from './demo/demo-api';
import WhatsAppSplitPane from './WhatsAppSplitPane';
import WaErrorBoundary from './WaErrorBoundary';
import { VoiceRecordingBar } from './VoiceRecordingBar';
import { useVoiceRecordingPreview } from './use-voice-recording-preview';
import {
	VOICE_NOTE_MAX_SECONDS,
	VOICE_TICK_SECONDS,
	buildVoiceNoteFile,
	createVoiceMediaRecorder,
	getVoiceMediaStream,
	mediaUploadFailedMessage,
} from './whatsapp-voice-recorder';
import WhatsAppDesktopRail from './WhatsAppDesktopRail';
import { MyStoryBar, StoryAudienceDialog, storyAudienceSummary } from './story/StoryAudience';
import { useSidebarChrome } from '@/components/molecules/SidebarChromeContext';
import WhatsAppAccountLinkPanel from './WhatsAppAccountLinkPanel';

const EmailMemoWorkspace = lazy(() => import('../email-memo/EmailMemoWorkspace'));
const DocumentEditorWorkspace = lazy(() => import('@/components/smart-document/DocumentEditorWorkspace'));
// Transient viewers that most sessions never open. The document viewer alone
// pulls mammoth + xlsx, which dominated the route's first-load JS.
const TranscriptionDialog = lazy(() => import('../transcript/transcription-dialog'));
import WaVoiceDock from './workspace/WaVoiceDock';
import { setVoiceDockContext } from './workspace/wa-voice-dock';
const ChatDocumentViewer = lazy(() =>
	import('./document-viewer/chat-document-viewer').then(module => ({
		default: module.ChatDocumentViewer,
	})),
);
// Tabs, settings sections and dialogs that stay closed for most sessions.
const WhatsAppReportsTab = lazy(() =>
	import('./WhatsAppReportsTab').then(module => ({ default: module.WhatsAppReportsTab })),
);
const WhatsAppBoardTab = lazy(() =>
	import('./WhatsAppBoardTab').then(module => ({ default: module.WhatsAppBoardTab })),
);
const FakeChatStudio = lazy(() => import('./fake-chat/FakeChatStudio'));
const AutoForwardPanel = lazy(() => import('./AutoForwardPanel'));
const GroupMemberPanel = lazy(() => import('./GroupMemberPanel'));
const ConnectionCheckDialog = lazy(() => import('./ConnectionCheckDialog'));
const WhatsAppWalletTab = lazy(() => import('./WhatsAppWalletTab'));
const WhatsAppAdhkarTab = lazy(() => import('./WhatsAppAdhkarTab'));
const LearnWorkspace = lazy(() => import('./learn/LearnWorkspace'));
const WhatsAppTypingLogTab = lazy(() => import('./WhatsAppTypingLog'));
const WhatsAppReadingTab = lazy(() => import('./WhatsAppReadingTab'));
const WhatsAppPromptsTab = lazy(() => import('./WhatsAppPromptsTab'));
const ContactSocialFinder = lazy(() => import('./ContactSocialFinder'));
const WhatsAppOnlineTab = lazy(() => import('./WhatsAppOnlineTab'));
const TypingHistoryPanel = lazy(() =>
	import('./WhatsAppTypingLog').then(mod => ({ default: mod.TypingHistoryPanel })),
);
/** Safety net only; WhatsApp sends `paused` when the customer stops typing. */
const TYPING_INDICATOR_TTL_MS = 25_000;
const ContactsPanel = lazy(() => import('./ContactsPanel'));
const DemoModeSettings = lazy(() => import('./demo/components/DemoModeSettings'));
const WhatsAppAiSettings = lazy(() => import('./ai/WhatsAppAiSettings'));
const WhatsAppAiAgentPanel = lazy(() => import('./ai/WhatsAppAiAgentPanel'));
const AiAgentChatBar = lazy(() => import('./ai/AiAgentChatBar'));
const CloneChatVoicePanel = lazy(() => import('./voice-changer/CloneChatVoicePanel'));
const VoiceChangerDialog = lazy(() => import('./voice-changer/VoiceChangerDialog'));
const VideoToVoiceDialog = lazy(() => import('./video-to-voice/VideoToVoiceDialog'));
const SavedLibraryPanel = lazy(() => import('./library/SavedLibraryPanel'));
const SaveToLibraryDialog = lazy(() => import('./library/SaveToLibraryDialog'));
const AddToStoryDialog = lazy(() => import('./story/AddToStoryDialog'));
const ScheduleMessageDialog = lazy(() => import('./schedule-message/ScheduleMessageDialog'));
const StickersPanel = lazy(() => import('./stickers/StickersPanel'));
const AiImageComposerPanel = lazy(() => import('./stickers/AiImageComposerPanel'));

/** Mounts a lazy dialog the first time it opens, then keeps it mounted for its close animation and state. */
function MountWhenOpened({ open, children }) {
	const [mounted, setMounted] = useState(Boolean(open));
	if (open && !mounted) setMounted(true);
	if (!mounted) return null;
	return <Suspense fallback={null}>{children}</Suspense>;
}

function WaPaneLoading({ label }) {
	return (
		<div className="wa-pane-loading">
			<Loader2 size={18} className="animate-spin" />
			{label || 'Loading…'}
		</div>
	);
}
import { staffAssignHint } from './whatsapp-staff-pace';
import {
	conversationPresenceSubtitle,
	isSameConversationPresence,
	resolvePresenceLastSeen,
} from './wa-presence';
import { readEventClearsViewer, unreadPayloadForViewer } from './wa-unread-scope';
import { BoardColumnPicker, BoardColumnPickerMenu } from './BoardColumnPicker';
import { createBoardCardFromMessages } from './whatsapp-board-api';
import { WaCustomSelect } from './WaCustomSelect';
import { WaAssignMenu, StaffPermissionChips } from './WaAssignMenu';
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
	firstUnreadMessageId,
	isMessageThreadCacheComplete,
	openChatCatchUpPlan,
	openChatMessagesStaleTime,
	shouldProviderBackfill,
	shouldReloadOpenChatMessages,
	shouldSkipOpenChatNetwork,
	trimBackgroundThreadCache,
} from './whatsapp-message-sync';
import { usePullToRefresh } from './use-pull-to-refresh';
import { AI_AGENT_STATE_EVENT, agentRowBadge } from './ai/agent-events';
import { whatsappAiAgentApi } from './ai/whatsapp-ai-api';
import MessageQuickActions from './MessageQuickActions';
import WaSwipeRow from './WaSwipeRow';
import { SWIPE_REPLY_TRIGGER_PX, swipeReplyState } from './wa-message-gestures';
import {
	readCachedMessagePage,
	writeCachedMessagePage,
} from './whatsapp-idb-cache';
import { waPerfCountRender, waPerfMark } from './wa-perf';
import { shouldSaveViaShareSheet, toMediaFile } from './wa-save-file';
import { saveMediaFiles } from './wa-save-prompt';
import { StoryComposer, StoryViewersSheet, StoryViewsButton } from './WaStoryInteractions';
import {
	applyStoryInteractionUpdate,
	formatStoryViewTime,
	storyMessageKey,
} from './wa-story-interactions';
import { useWaVirtualRows, WaVirtualRowsHost, WaWindowedRows } from './wa-virtual-list';
import { createByteBoundedCache, setBounded } from './wa-bounded-cache';
import {
	autoRetryDelayMs,
	forgetFailedOutbound,
	isTransientSendError,
	rememberFailedOutbound,
	restoreFailedOutbound,
} from './wa-failed-outbox';
import { estimateMessageRowSize, estimateTextRowSize, messageRowKey, THREAD_ROW_EXTRAS } from './wa-thread-virtual.js';
import { readThreadLayout, threadDayKey } from './wa-thread-layout.js';
import { WaMeasuredThreadRow } from './wa-measured-thread-row';
import {
	getAttachmentStreamUrl,
	absoluteApiUrl,
	forgetAttachmentStreamUrl,
	voicePlaybackFormat,
	withPlaybackFormat,
} from './whatsapp-media-stream';
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
import ComposerWritingAssist from './ai/ComposerWritingAssist';
import WhatsAppWorkspaceAiParts from './ai/WhatsAppWorkspaceAiParts';
import { useWhatsAppAi } from './ai/use-whatsapp-ai';
import WhatsAppPrivacyBlurControl from './WhatsAppPrivacyBlurControl';
import {
	WhatsAppPageLockScreen,
	WhatsAppPageLockSettings,
	pageLockCopy,
	useWhatsAppPageLock,
} from './WhatsAppPageLock';
import { LockKeyhole as PageLockIcon, Keyboard as TypingLogIcon, Command as QuickSwitchIcon, Timer as DelayedSendIcon } from 'lucide-react';
import WhatsAppQuickSwitcher, { recordQuickSwitchUse } from './WhatsAppQuickSwitcher';
import TeamPresenceButton from './TeamPresenceButton';
import SearchContactsSection from './SearchContactsSection';

/** Extra words the quick switcher matches on (Franco / English spellings people type). */
const QUICK_SWITCH_KEYWORDS = {
	wallet: 'money mony فلوس موني مصاريف',
	typing: 'typing تايبينج بيكتب',
	hideNames: 'hide names blur هايد نيمز تغبيش',
	autoForward: 'auto forward اوتو فوروورد فوروارد',
	accounts: 'accounts اكاونت اكاونتس ارقام',
	reports: 'reports ريبورت ريبورتس',
	groups: 'groups جروب جروبات',
	statuses: 'stories status ستوري ستوريز',
	agent: 'ai agent بوت',
	settings: 'settings سيتنجز',
	prompts: 'prompts برومبت',
	board: 'tasks board تاسكات',
	contacts: 'contacts كونتاكت',
};
import ExpandableMessageText from './ExpandableMessageText';
import EmailMemoMessageCard from './EmailMemoMessageCard';
import DeletedMessageNotice from './DeletedMessageNotice';
import EditedMessageNotice from './EditedMessageNotice';
import { applyGroupTyperPresence, groupTypersLabel } from './whatsapp-group-typing';
import { isEmailMemoMessageText } from './email-memo-message';
import MarkdownMessage from '../ai-free/MarkdownMessage';
import {
	applyWhatsAppPrivacyBlurClasses,
	isWhatsAppChatPrivacyBlurred,
	markPrivacyBlurRevealed,
	readWhatsAppPrivacyBlur,
	writeWhatsAppPrivacyBlur,
} from './whatsapp-privacy-blur';
import { forgetAttachmentBlob, getCachedAttachmentBlob, isPersistedAttachmentId, isUsefulWaveform, prepareVoicePlaybackFromBlob, readBlobErrorMessage, requestAttachmentBlob } from './workspace/wa-attachment-blobs';
import { Avatar } from './workspace/WaAvatar';
import { KEEP_IN_TOUCH_FILTER } from './workspace/wa-keep-in-touch';
import { MediaOverflowMenu, VoiceMessage, formatClock, pauseAllVoicePlayers, useNearViewport } from './workspace/WaVoiceMessage';
import { ChatImageViewer, ProfilePhotoViewer } from './workspace/WaImageViewer';
import { LocationMessage } from './workspace/WaLocation';
import { ChatVideoPlayer } from './workspace/WaVideoPlayer';
import { ContactMessageCard, ImageMessage, MediaAttachment } from './workspace/WaMessageMedia';
import { WhatsAppFormattedText } from './workspace/WaFormattedText';
import { LONG_PRESS_MS, clearLongPressSelection, useFreshPressGuard, useLongPressBackdrop } from './workspace/wa-long-press';
import { MORE_REACTIONS, MessageActionMenu, MessageHoverActions, MultiMessageActionMenu, QUICK_REACTIONS, firstGalleryAttachmentId, firstPersistedAttachmentId, isSharableChatMessage, messageHasSelectableMedia } from './workspace/WaMessageMenus';
import { ConversationActionMenu } from './workspace/WaConversationMenu';
import { WaReactionSummary } from './workspace/WaReactionSummary';
import { translations } from './workspace/wa-translations';
import { Toggle } from './workspace/WaToggle';
import { IsolatedComposerTextarea } from './workspace/WaComposerTextarea';
import { DeliveryTicks, GRADIENT, TypingIndicator, WaConversationRow, conversationTimestamp } from './workspace/WaConversationRow';
import { WaGroupsBrowser, WaInfoMemberList } from './workspace/WaGroupsBrowser';
import { MobileAttachmentSheet } from './workspace/WaMobileAttachmentSheet';
import { AccountSwitcherDropdown, ConversationFilterDropdown, statusMeta } from './workspace/WaChatListControls';
import { MessageAttachments, MessageReactionPicker } from './workspace/WaMessageAttachments';
import { PhoneSyncGate } from './workspace/WaPhoneSyncGate';
import { GroupMessageReceiptsPanel } from './workspace/WaGroupReceiptsPanel';
import { MobileWhatsAppNav } from './workspace/WaMobileNav';
import { WaChatPicker } from './workspace/WaChatPicker';

const EMPTY_MESSAGES = [];
const WHATSAPP_SELECTED_ACCOUNT_KEY = 'wa-selected-account-id';
const WHATSAPP_PINNED_ONLINE_CONTACT_KEY = 'wa-pinned-online-contact-id';
const WHATSAPP_SHOW_ONLINE_BAR_KEY = 'wa-show-online-bar';
const WHATSAPP_ACTIVE_TAB_KEY = 'wa-active-tab';
const WHATSAPP_CHAT_LIST_COLLAPSED_KEY = 'wa-chat-list-collapsed';
const WHATSAPP_CHAT_LIST_WIDTH_KEY = 'wa-chat-list-width';
/** Slightly above axios default (120s) so uploads fail cleanly instead of hanging forever. */
const WHATSAPP_MEDIA_SEND_TIMEOUT_MS = 125_000;
/** Below ~280px the row can no longer fit name + time + pin/star without clipping the name. */
const CHAT_LIST_WIDTH_MIN = 280;
const CHAT_LIST_WIDTH_MAX = 520;
const CHAT_LIST_WIDTH_DEFAULT = 360;

function readStoredChatListWidth() {
	if (typeof window === 'undefined') return CHAT_LIST_WIDTH_DEFAULT;
	try {
		// `Number(null)` is 0 and finite, which used to clamp every first visit to the minimum.
		const stored = window.localStorage.getItem(WHATSAPP_CHAT_LIST_WIDTH_KEY);
		const raw = stored ? Number(stored) : NaN;
		if (Number.isFinite(raw) && raw > 0) {
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
	'reading',
	'prompts',
	'online',
	'channels',
	'calls',
	'groups',
	'contacts',
	'statuses',
	'emails',
	'reports',
	'typing',
	'board',
	'fakeChat',
	'wallet',
	'adhkar',
	'documents',
	'learn',
	'agent',
	'settings',
	'profile',
]);

function isConversationWorkspaceTab(tab) {
	return tab === 'chats';
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

// Notification links open `?accountId=…&conversationId=…`. They are used once and dropped from
// the URL: left there, every list refresh re-selected that account and reopened that chat, and
// a reopened PWA restored them over the account the user picked last.
const whatsAppDeepLink = { accountId: null, conversationId: null, tab: null };

function readWhatsAppDeepLink() {
	if (typeof window === 'undefined') return whatsAppDeepLink;
	try {
		const url = new URL(window.location.href);
		const accountId = url.searchParams.get('accountId');
		const conversationId = url.searchParams.get('conversationId');
		// Connection alerts link to the accounts tab, where the QR is.
		const tab = url.searchParams.get('tab');
		if (accountId || conversationId || tab) {
			whatsAppDeepLink.accountId = accountId || null;
			whatsAppDeepLink.conversationId = conversationId || null;
			whatsAppDeepLink.tab = tab === 'accounts' ? 'accounts' : null;
			url.searchParams.delete('accountId');
			url.searchParams.delete('conversationId');
			url.searchParams.delete('tab');
			window.history.replaceState(
				window.history.state,
				'',
				`${url.pathname}${url.search}${url.hash}`,
			);
		}
	} catch {
		// Ignore history failures.
	}
	return whatsAppDeepLink;
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

function readStoredPinnedOnlineContactId(userId) {
	if (typeof window === 'undefined') return null;
	try {
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		if (scopedUserId) {
			const scoped = window.localStorage.getItem(
				`${WHATSAPP_PINNED_ONLINE_CONTACT_KEY}:${scopedUserId}`,
			);
			if (scoped) return scoped;
		}
		return window.localStorage.getItem(WHATSAPP_PINNED_ONLINE_CONTACT_KEY) || null;
	} catch {
		return null;
	}
}

function writeStoredPinnedOnlineContactId(conversationId, userId) {
	if (typeof window === 'undefined' || !conversationId) return;
	try {
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		if (scopedUserId) {
			window.localStorage.setItem(
				`${WHATSAPP_PINNED_ONLINE_CONTACT_KEY}:${scopedUserId}`,
				conversationId,
			);
			window.localStorage.removeItem(WHATSAPP_PINNED_ONLINE_CONTACT_KEY);
			return;
		}
		window.localStorage.setItem(WHATSAPP_PINNED_ONLINE_CONTACT_KEY, conversationId);
	} catch {
		// Ignore quota / private-mode failures.
	}
}

function readStoredShowOnlineBar(userId) {
	if (typeof window === 'undefined') return false;
	try {
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		if (scopedUserId) {
			const scoped = window.localStorage.getItem(
				`${WHATSAPP_SHOW_ONLINE_BAR_KEY}:${scopedUserId}`,
			);
			if (scoped === '1') return true;
			if (scoped === '0') return false;
		}
		const legacy = window.localStorage.getItem(WHATSAPP_SHOW_ONLINE_BAR_KEY);
		return legacy === '1';
	} catch {
		return false;
	}
}

function writeStoredShowOnlineBar(show, userId) {
	if (typeof window === 'undefined') return;
	try {
		const value = show ? '1' : '0';
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		if (scopedUserId) {
			window.localStorage.setItem(
				`${WHATSAPP_SHOW_ONLINE_BAR_KEY}:${scopedUserId}`,
				value,
			);
			window.localStorage.removeItem(WHATSAPP_SHOW_ONLINE_BAR_KEY);
			return;
		}
		window.localStorage.setItem(WHATSAPP_SHOW_ONLINE_BAR_KEY, value);
	} catch {
		/* ignore */
	}
}

function clearStoredPinnedOnlineContactId(conversationId, userId) {
	if (typeof window === 'undefined') return;
	try {
		const scopedUserId = resolveWhatsAppStorageUserId(userId);
		const scopedKey = scopedUserId
			? `${WHATSAPP_PINNED_ONLINE_CONTACT_KEY}:${scopedUserId}`
			: WHATSAPP_PINNED_ONLINE_CONTACT_KEY;
		const current = window.localStorage.getItem(scopedKey);
		if (!conversationId || current === conversationId) {
			window.localStorage.removeItem(scopedKey);
		}
		if (!scopedUserId) {
			window.localStorage.removeItem(WHATSAPP_PINNED_ONLINE_CONTACT_KEY);
		}
	} catch {
		// Ignore storage failures.
	}
}

function formatAccountNumberLabel(account) {
	const phone = String(account?.phoneNumber || '').trim();
	if (phone) {
		return phone.startsWith('+') ? phone : `+${phone.replace(/^\++/, '')}`;
	}
	return String(account?.label || 'WhatsApp').trim() || 'WhatsApp';
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

function resolveStoredWhatsAppUserEmail() {
	if (typeof window === 'undefined') return '';
	try {
		const user = JSON.parse(window.localStorage.getItem('user') || 'null');
		return String(user?.email || '').trim();
	} catch {
		return '';
	}
}

function readPersistedWhatsAppTab() {
	if (typeof window === 'undefined') return null;
	const userId = resolveStoredWhatsAppUserId();
	return readStoredWhatsAppActiveTab(userId) || readStoredWhatsAppActiveTab(null);
}

function defaultWhatsAppActiveTab() {
	if (typeof window === 'undefined') return null;
	const stored = readPersistedWhatsAppTab();
	if (stored === 'notifications' || stored === 'channels' || stored === 'contacts') return 'chats';
	if (stored === 'fakeChat' && !canShowFakeChat(resolveStoredWhatsAppUserEmail())) return 'chats';
	if (stored && WHATSAPP_PERSISTED_TABS.has(stored)) return stored;
	return 'chats';
}

function defaultWhatsAppConversationFilter() {
	return readPersistedWhatsAppTab() === 'channels' ? 'channels' : 'all';
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

const tabs = [
	['accounts', Smartphone],
	['chats', MessageCircle],
	['reading', BookOpen],
	['prompts', Sparkles],
	['online', Radio],
	['statuses', Zap],
	['groups', Users],
	['agent', Bot],
	['reports', BarChart3],
	['typing', TypingLogIcon],
	['board', LayoutGrid],
	['fakeChat', Sparkles],
	['wallet', Wallet],
	['adhkar', BookOpen],
	['documents', FileText],
	['learn', GraduationCap],
	['settings', Settings],
];

// The only tabs that render the sample profile instead of the real account.
const SHOWCASE_TABS = new Set(['chats', 'reading', 'prompts', 'settings']);

/**
 * A reloaded chat list replaces the old one; keep the chat that is open on screen when the new
 * page does not include it (opened from search contacts, a group member, a notification…), or
 * the open chat vanished on the next reload.
 */
/**
 * The presence ping returns a fresh list every 10s even when nobody came or left; keeping the
 * previous array stops the whole workspace re-rendering on each ping. lastSeenAt is not shown.
 */
/** Tabs whose list comes from the server as-is instead of filtering the loaded All inbox. */
function serverListFilter(filter) {
	if (filter === 'archived' || filter === KEEP_IN_TOUCH_FILTER) return filter;
	return 'all';
}

function keepInTouchDueTime(conversation) {
	const kit = conversation?.keepInTouch;
	if (!kit?.lastContactAt) return 0;
	return kit.dueAt ? new Date(kit.dueAt).getTime() : 0;
}

function keepStaffListIfSame(prev, next) {
	const list = Array.isArray(next) ? next : [];
	if (!Array.isArray(prev) || prev.length !== list.length) return list;
	for (let index = 0; index < list.length; index += 1) {
		const a = prev[index];
		const b = list[index];
		if (a?.userId !== b?.userId || a?.name !== b?.name || a?.role !== b?.role) return list;
	}
	return prev;
}

/** Ids the client makes up for rows the server has not stored (yet). */
const CLIENT_MESSAGE_ID_PREFIXES = ['pending:', 'pending-', 'inbox-preview-', 'wa-resend-missing-', 'tmp-', 'optimistic'];
/**
 * Whether a thread row can be the "before" cursor for the messages API: a stored row or a phone
 * row ("live:<providerId>", which the server maps back). Rows made up on this device are not.
 */
export function isServerMessageCursor(message) {
	const value = String(message?.id || '');
	if (!value || value === 'live:') return false;
	if (message?.optimistic && !message?.providerMessageId) return false;
	return !CLIENT_MESSAGE_ID_PREFIXES.some(prefix => value.startsWith(prefix));
}

function keepOpenConversation(nextItems, currentItems, openId) {
	if (!openId || nextItems.some(item => item.id === openId)) return nextItems;
	const open = (currentItems || []).find(item => item.id === openId);
	return open ? [...nextItems, open] : nextItems;
}

/** Chat ⋮ menu items that are no longer shown (see chatToolbarActions). */
const CHAT_MENU_RETIRED_ITEMS = new Set(['media', 'messages', 'groups', 'group-select', 'schedule', 'split']);

const GLOW = '0 10px 24px -10px var(--color-primary-400)';
const BRAND_GRADIENT = 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-secondary-500) 100%)';
const CONVERSATIONS_CACHE_TTL = WHATSAPP_STALE_TIME;
// Memory paint TTL — WhatsApp Web keeps chats warm in-session; 30s forced
// revalidation felt like endless loading. DB is the durable store; sockets
// deliver live rows. Re-fetch DB quietly when TTL expires.
const MESSAGES_CACHE_TTL = MESSAGES_CACHE_TTL_MS;
const STATUSES_CACHE_TTL = 60_000;

/** Why a send failed, as the server said it (or the network error), for the Retry tooltip. */
function outboundFailureReason(error) {
	const fromServer = error?.response?.data?.message;
	const text = Array.isArray(fromServer) ? fromServer.join(', ') : fromServer;
	if (text) return String(text).slice(0, 240);
	if (error?.code === 'ECONNABORTED') return 'The request timed out';
	if (!error?.response) return 'No connection to the server';
	return error?.message ? String(error.message).slice(0, 240) : null;
}

/**
 * Chat-list search field that keeps its own text. Typing re-renders only this field; the
 * workspace (and with it the open thread) gets the value once typing pauses, then filters
 * and searches. Clearing is passed on at once, and a value the workspace sets itself
 * (for example clearing the search when the list collapses) is shown immediately.
 * `children(localValue, clear)` renders the field's extras (clear button, hints).
 */
function WaChatSearchInput({ value, onCommit, delay = 160, inputRef, children, ...inputProps }) {
	const [local, setLocal] = useState(value);
	const committedRef = useRef(value);
	const timerRef = useRef(0);
	useEffect(() => {
		if (value === committedRef.current) return;
		committedRef.current = value;
		window.clearTimeout(timerRef.current);
		setLocal(value);
	}, [value]);
	useEffect(() => () => window.clearTimeout(timerRef.current), []);
	const commit = next => {
		window.clearTimeout(timerRef.current);
		committedRef.current = next;
		onCommit(next);
	};
	const clear = () => {
		setLocal('');
		commit('');
	};
	return (
		<>
			<input
				ref={inputRef}
				{...inputProps}
				value={local}
				onChange={event => {
					const next = event.target.value;
					setLocal(next);
					window.clearTimeout(timerRef.current);
					if (!next) commit('');
					else timerRef.current = window.setTimeout(() => commit(next), delay);
				}}
			/>
			{typeof children === 'function' ? children(local, clear) : null}
		</>
	);
}

function newClientMessageId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function releaseBlobUrl(url) {
	if (!isLocalMediaUrl(url) || !String(url).startsWith('blob:')) return;
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
		releaseBlobUrl(attachment?.previewDataUrl);
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

/** "5 minutes ago" / "منذ ٥ دقائق" for a past date; the full date stays in a tooltip. */
function relativeTimeFrom(date, locale) {
	const diff = (date.getTime() - Date.now()) / 1000;
	const steps = [
		['year', 31536000],
		['month', 2592000],
		['week', 604800],
		['day', 86400],
		['hour', 3600],
		['minute', 60],
	];
	const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar-EG' : 'en', { numeric: 'auto' });
	for (const [unit, seconds] of steps) {
		if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
	}
	return rtf.format(0, 'minute');
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

export default function WhatsAppWorkspace() {
	// Phones: keyboard-aware app height and safe-area handling (see mobile-viewport.js).
	useEffect(() => installMobileViewport(), []);
	// Page-wide WhatsApp styles (thin scrollbars on menus and dialogs rendered on <body>) key
	// off this class. It replaced html:has(.wa-web-desktop), which re-checked styles for the whole
	// page on every DOM change and made scrolling the virtualised thread stutter.
	useEffect(() => {
		const root = document.documentElement;
		root.classList.add('wa-page-active');
		return () => root.classList.remove('wa-page-active');
	}, []);
	return (
		<DemoModeProvider>
			<WhatsAppWorkspaceContent />
		</DemoModeProvider>
	);
}

/** Failed media bubble id → original File + send options, so Retry can re-upload in this session. */
/** Older-history pages are smaller than the first page: each one renders and lays out in one go
 *  while the scroll position is restored, so 50 rows keep that step short. */
const OLDER_PAGE_SIZE = 50;

/** Failed media bubble id → original File + send options, so Retry can re-upload in this session. */
const failedMediaRetries = new Map();
const FAILED_MEDIA_RETRY_MAX = 20;

/**
 * Rebuild a File for Retry when the in-memory Map lost it (reload / earlier bug).
 * Prefers the live blob: preview still on the bubble, then a durable attachment id.
 */
async function recoverOutboundMediaFile(message) {
	const kind = String(message?.type || '').toLowerCase() || 'document';
	const attachment = Array.isArray(message?.attachments) ? message.attachments[0] : null;
	const fileName = attachment?.fileName || (kind === 'voice' || kind === 'ptt' ? 'voice.ogg' : 'file');
	const mimeType = attachment?.mimeType || '';

	const previewUrl = String(attachment?.url || attachment?.previewDataUrl || '').trim();
	if (/^(blob:|data:)/i.test(previewUrl)) {
		try {
			const response = await fetch(previewUrl);
			if (response.ok) {
				const blob = await response.blob();
				if (blob?.size) {
					return toMediaFile(blob, { fileName, mimeType: mimeType || blob.type, kind });
				}
			}
		} catch {
			/* preview revoked */
		}
	}

	const attachmentId = String(attachment?.id || '').trim();
	if (attachmentId && isPersistedAttachmentId(attachmentId)) {
		try {
			const blob = await requestAttachmentBlob(attachmentId, {
				timeout: 120_000,
				priority: true,
				kind,
			});
			if (blob?.size) {
				return toMediaFile(blob, { fileName, mimeType: mimeType || blob.type, kind });
			}
		} catch {
			/* still missing */
		}
	}
	return null;
}
function ownReactionEmoji(message) {
	return normalizeWhatsAppReactions(message?.reactions).find(
		reaction => reaction.actorKey === 'me',
	)?.emoji || '';
}

/** The socket sends the full list: replace it (so removals stick), keeping known names. */
function replaceReactionList(next = [], previous = []) {
	const known = new Map(normalizeWhatsAppReactions(previous).map(reaction => [reaction.actorKey, reaction]));
	return normalizeWhatsAppReactions(next).map(reaction => {
		const before = known.get(reaction.actorKey);
		return {
			...reaction,
			actorName: reaction.actorName || before?.actorName || null,
			actorPhone: reaction.actorPhone || before?.actorPhone || null,
			actorAvatarUrl: reaction.actorAvatarUrl || before?.actorAvatarUrl || null,
		};
	});
}

function mergeReactionLists(preferred = [], fallback = []) {
	const merged = new Map();
	for (const reaction of normalizeWhatsAppReactions(fallback)) {
		merged.set(reaction.actorKey, reaction);
	}
	for (const reaction of normalizeWhatsAppReactions(preferred)) {
		const previous = merged.get(reaction.actorKey);
		merged.set(reaction.actorKey, {
			...reaction,
			actorName: reaction.actorName || previous?.actorName || null,
			actorPhone: reaction.actorPhone || previous?.actorPhone || null,
			actorAvatarUrl: reaction.actorAvatarUrl || previous?.actorAvatarUrl || null,
		});
	}
	return [...merged.values()];
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

/** XHR "abort"/network failures, as opposed to the server answering with an error. */
function isStoryTransferFailure(error) {
	return (
		error?.code === 'ECONNABORTED' ||
		error?.code === 'ERR_NETWORK' ||
		/request aborted|network error/i.test(String(error?.message || ''))
	);
}

// Closing the story viewer revokes its object URL, so re-opening the same story (or going
// back to a person) downloaded the whole image again. Keep recent story blobs in memory.
const storyMediaBlobCache = createByteBoundedCache({
	maxEntries: 60,
	maxBytes: 80 * 1024 * 1024,
});

async function fetchStatusMediaBlob(accountId, statusId, options = {}) {
	const key = `${options.history ? 'h' : 'l'}:${accountId}:${statusId}`;
	if (!options.bypassCache) {
		const cached = storyMediaBlobCache.get(key);
		if (cached) return cached;
	}
	const blob = await downloadStatusMediaBlob(accountId, statusId, options);
	storyMediaBlobCache.set(key, blob);
	return blob;
}

function absoluteWhatsAppLiveUrl(pathOrUrl) {
	if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
	if (/^(https?:|blob:|data:)/i.test(pathOrUrl)) return pathOrUrl;
	const origin = String(whatsappLiveOrigin || '')
		.trim()
		.replace(/\/$/, '');
	const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
	if (!origin) return path;
	return `${origin}${path}`;
}

async function downloadStatusMediaBlob(accountId, statusId, { history = false, bypassCache = false } = {}) {
	const path = history
		? `/whatsapp/accounts/${accountId}/statuses/history/${encodeURIComponent(statusId)}/content`
		: `/whatsapp/accounts/${accountId}/statuses/${encodeURIComponent(statusId)}/content`;
	const request = {
		responseType: 'blob',
		validateStatus: () => true,
		// Story grid previews should fail fast and move on instead of blocking the queue.
		timeout: 45_000,
	};
	// Live Baileys owns story bytes — local API with sessions disabled cannot open them.
	let response;
	try {
		response = await whatsappLiveApi.get(
			path,
			bypassCache ? { ...request, params: { fresh: Date.now() } } : request,
		);
	} catch (error) {
		// A download cut off mid-way leaves a truncated entry in the browser cache; the
		// next request revalidates to 304 against it and Chrome aborts. A unique URL skips it.
		if (bypassCache || !isStoryTransferFailure(error)) throw error;
		response = await whatsappLiveApi.get(path, { ...request, params: { fresh: Date.now() } });
	}
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

function isBlobStoryUrl(url) {
	return typeof url === 'string' && url.startsWith('blob:');
}

function revokeStoryUrl(url) {
	if (!isBlobStoryUrl(url)) return;
	try {
		URL.revokeObjectURL(url);
	} catch {
		/* ignore */
	}
}

function isVideoStoryType(type) {
	return String(type || '').toLowerCase().includes('video');
}

function storyMediaIds(statusRef) {
	const ids = [
		...new Set(
			[statusRef?.id, statusRef?.providerStatusId]
				.map(value => String(value || '').trim())
				.filter(Boolean),
		),
	];
	ids.sort((a, b) => Number(isWhatsAppUuid(b)) - Number(isWhatsAppUuid(a)));
	return ids;
}

/**
 * Signed URL a `<video>` can stream with Range. Axios cannot do that — it pulls
 * the whole file, and a 19MB story is what Chrome was aborting.
 */
async function fetchStatusStreamUrl(accountId, statusId, { history = false } = {}) {
	const { data } = await whatsappLiveApi.get(
		`/whatsapp/accounts/${accountId}/statuses/${encodeURIComponent(statusId)}/stream-url`,
		{
			params: history ? { history: true } : undefined,
			timeout: 45_000,
		},
	);
	const url = absoluteWhatsAppLiveUrl(data?.url) || absoluteApiUrl(data?.url);
	if (!url) throw new Error('Media unavailable');
	return {
		url,
		type: String(data?.mimeType || 'video/mp4'),
		streamed: true,
	};
}

async function fetchStatusPlayback(accountId, statusRef, { history = false } = {}) {
	const ids = storyMediaIds(statusRef);
	if (isVideoStoryType(statusRef?.type)) {
		let lastError = null;
		for (const mediaId of ids) {
			try {
				return await fetchStatusStreamUrl(accountId, mediaId, { history });
			} catch (error) {
				lastError = error;
				const status = Number(error?.response?.status || 0);
				if (status && status !== 404) throw error;
			}
		}
		if (lastError && Number(lastError?.response?.status || 0) !== 404) throw lastError;
	}
	let lastError = null;
	for (const mediaId of ids) {
		try {
			return await fetchStatusMediaBlob(accountId, mediaId, { history });
		} catch (error) {
			lastError = error;
			const message = typeof error?.message === 'string' ? error.message : String(error || '');
			if (
				!/whatsapp status not found/i.test(message) &&
				!isRecoverableStoryMediaError(message)
			) {
				throw error;
			}
		}
	}
	throw lastError || new Error('Media unavailable');
}

function isPlayableStoryItem(item) {
	if (!item) return false;
	const type = String(item.type || '').toLowerCase();
	if (type === 'text' || type === 'chat') return true;
	if (item.mediaReady === false) return false;
	if (item.mediaReady === true) return true;
	return Boolean(String(item.mediaPath || '').trim());
}

function isRecoverableStoryMediaError(message) {
	const text = String(message || '');
	if (/archived story media|not saved before expiry/i.test(text)) return false;
	return /whatsapp status not found|session cache|unavailable from whatsapp|not found in whatsapp store|thumbnail only|invalid story id|unexpected database error|invalid input syntax for type uuid|account is not connected|not connected/i.test(
		text,
	);
}

function isUnrecoverableStoryMediaError(message) {
	return /archived story media|not saved before expiry|no longer in the live whatsapp session and was not saved/i.test(
		String(message || ''),
	);
}

function isWhatsAppUuid(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		String(value || '').trim(),
	);
}

/** Instagram-style person slide: next = exit left / enter from right. */
const STORY_PERSON_SLIDE_TRANSITION = {
	duration: 0.32,
	ease: [0.32, 0.72, 0, 1],
};
const STORY_PERSON_SLIDE_VARIANTS = {
	enter: direction =>
		direction === 0
			? { x: 0, opacity: 1 }
			: { x: direction > 0 ? '108%' : '-108%', opacity: 1 },
	center: { x: 0, opacity: 1 },
	exit: direction =>
		direction === 0
			? { x: 0, opacity: 0.96 }
			: { x: direction > 0 ? '-108%' : '108%', opacity: 1 },
};

function StoryThumbnail({
	label,
	size = 16,
	viewed = false,
	thumbUrl = '',
	thumbType = '',
	priority = false,
	avatarUrl = '',
	fillParent = true,
}) {
	// Thumbnails are fetched via the content endpoint only (never the /view
	// endpoint), so this never registers a WhatsApp "seen" receipt — that only
	// happens when a story is explicitly opened, see openStory().
	const isVideo = thumbType === 'video';
	const hasMediaThumb = Boolean(thumbUrl);
	const portraitSrc = !isVideo ? (hasMediaThumb ? thumbUrl : avatarUrl) : '';
	return (
		<div
			className={`${fillParent ? 'h-full w-full' : 'inline-block'} ${viewed ? 'opacity-80' : ''}`}
		>
			<Avatar
				label={label}
				size={size}
				src={portraitSrc}
				videoSrc={isVideo ? thumbUrl : ''}
				priority={priority}
				className={fillParent ? '!h-full !w-full !ring-0' : '!ring-0'}
			/>
		</div>
	);
}

async function prepareVoicePlayback(sourceUrl, mimeType) {
	const response = await fetch(sourceUrl, { mode: 'cors', credentials: 'omit' });
	if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
	const blob = await response.blob();
	return prepareVoicePlaybackFromBlob(blob, mimeType || blob.type);
}

/** Filled mic for the composer (WhatsApp-style). Lucide stroke icons break under .wa-mic-button fill CSS. */
function ComposerMicIcon({ size = 22 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
			className="wa-composer-mic-icon"
		>
			<path
				fill="currentColor"
				d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm4.89-3a4.89 4.89 0 0 1-9.78 0H5.5a6.5 6.5 0 0 0 5.75 6.21V21h1.5v-3.79A6.5 6.5 0 0 0 18.5 11h-1.61Z"
			/>
		</svg>
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

/**
 * Shared shell for the workspace's small dialogs: the wa-ui modal kit, an icon badge in
 * the header, Escape / backdrop to close (unless busy) and a bottom sheet on phones.
 */
function WaDialog({
	title,
	subtitle,
	icon,
	tone = 'accent',
	width = 440,
	height,
	zIndex = 110,
	onClose,
	closeDisabled = false,
	closeLabel = 'Close',
	className = '',
	footer,
	children,
}) {
	const titleId = useId();
	const onCloseRef = useRef(onClose);
	const blockedRef = useRef(closeDisabled);
	onCloseRef.current = onClose;
	blockedRef.current = closeDisabled;

	useEffect(() => {
		const onKeyDown = event => {
			if (event.key !== 'Escape' || event.defaultPrevented || blockedRef.current) return;
			event.preventDefault();
			onCloseRef.current?.();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	return (
		<div
			className="wa-ui-scrim is-sheet-on-phone wa-dx-scrim"
			style={{ zIndex }}
			role="presentation"
			onClick={() => {
				if (!blockedRef.current) onCloseRef.current?.();
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className={`wa-ui-modal wa-dx ${className}`}
				style={{
					'--wa-ui-modal-width': `${width}px`,
					...(height ? { '--wa-ui-modal-height': `${height}px` } : null),
				}}
				onClick={event => event.stopPropagation()}
			>
				<div className="wa-ui-modal__header wa-dx__header">
					{icon ? (
						<span className={`wa-dx__icon is-${tone}`} aria-hidden="true">
							{icon}
						</span>
					) : null}
					<div className="wa-ui-modal__heading">
						<h3 id={titleId} className="wa-ui-modal__title">
							{title}
						</h3>
						{subtitle ? <p className="wa-ui-modal__subtitle">{subtitle}</p> : null}
					</div>
					<button
						type="button"
						className="wa-ui-icon-btn"
						disabled={closeDisabled}
						aria-label={closeLabel}
						title={closeLabel}
						onClick={() => onClose?.()}
					>
						<X size={18} strokeWidth={2} />
					</button>
				</div>
				{children}
				{footer ? <div className="wa-ui-modal__footer">{footer}</div> : null}
			</div>
		</div>
	);
}

/** OS notification while the WhatsApp tab is open but not focused (PWA / browser). */
function showWhatsAppDesktopNotification({
	title,
	body,
	conversationId,
	accountId,
	locale,
	enabled = true,
}) {
	if (!enabled) return;
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

/** How long the new-message popup stays (paused while the pointer is on it). */
const WA_INCOMING_POPUP_MS = 9000;
/** Unread messages per chat shown in its popup, so a burst becomes one card with a count. */
const waIncomingCounts = new Map();
let waChimeContext = null;
let waLastChimeAt = 0;

/**
 * Soft two-note chime for a new message, made with Web Audio (no file to load).
 * At most one every 1.5 s so a burst of messages does not ring repeatedly.
 */
function playIncomingChime() {
	if (typeof window === 'undefined') return;
	const now = Date.now();
	if (now - waLastChimeAt < 1500) return;
	waLastChimeAt = now;
	try {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) return;
		waChimeContext = waChimeContext || new AudioContextClass();
		const context = waChimeContext;
		if (context.state === 'suspended') void context.resume();
		const start = context.currentTime + 0.02;
		const master = context.createGain();
		master.gain.value = 0.14;
		master.connect(context.destination);
		[
			[880, 0],
			[1318.5, 0.11],
		].forEach(([frequency, offset]) => {
			const oscillator = context.createOscillator();
			const envelope = context.createGain();
			oscillator.type = 'sine';
			oscillator.frequency.value = frequency;
			const at = start + offset;
			envelope.gain.setValueAtTime(0.0001, at);
			envelope.gain.exponentialRampToValueAtTime(1, at + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
			oscillator.connect(envelope);
			envelope.connect(master);
			oscillator.start(at);
			oscillator.stop(at + 0.55);
		});
	} catch {
		/* no audio (blocked autoplay, old browser): the popup still shows */
	}
}

/** Popup for a new message while another WhatsApp tab (Board, Reports, …) is open. */
function WaIncomingMessageToast({ toastItem, title, body, count, avatarSrc, isGroup, isArabic, onOpen, onDismiss }) {
	const more = Math.max(0, count - 1);
	return (
		<div
			dir={isArabic ? 'rtl' : 'ltr'}
			role="alert"
			aria-live="assertive"
			data-wa-incoming-toast
			className={`wa-inm${toastItem.visible ? ' is-in' : ' is-out'}`}
			style={{ '--wa-inm-ms': `${WA_INCOMING_POPUP_MS}ms` }}
		>
			<button type="button" className="wa-inm__main" onClick={onOpen}>
				<span className="wa-inm__avatar">
					<Avatar label={title} size={11} src={avatarSrc} isGroup={isGroup} />
					<span className="wa-inm__badge" aria-hidden="true">
						<MessageCircle className="h-3 w-3" />
					</span>
				</span>
				<span className="wa-inm__text">
					<span className="wa-inm__top">
						<bdi className="wa-inm__name wa-privacy-identity">{title}</bdi>
						<span className="wa-inm__when">{isArabic ? 'دلوقتي' : 'now'}</span>
					</span>
					<span className="wa-inm__body wa-privacy-text" dir="auto">
						{body}
					</span>
					{more ? (
						<span className="wa-inm__more">
							{isArabic ? `+${more} ${more === 1 ? 'رسالة تانية' : 'رسايل تانية'}` : `+${more} more ${more === 1 ? 'message' : 'messages'}`}
						</span>
					) : null}
				</span>
			</button>
			<div className="wa-inm__actions">
				<button type="button" className="wa-inm__btn is-primary" onClick={onOpen}>
					{isArabic ? 'افتح الشات' : 'Open chat'}
				</button>
				<button type="button" className="wa-inm__btn" onClick={onDismiss}>
					{isArabic ? 'بعدين' : 'Later'}
				</button>
			</div>
			<button
				type="button"
				onClick={onDismiss}
				aria-label={isArabic ? 'إغلاق' : 'Close'}
				className="wa-inm__close"
			>
				<X className="h-4 w-4" aria-hidden />
			</button>
			{/* keyed on the count: a new message restarts the timer */}
			<span key={count} className="wa-inm__timer" aria-hidden="true" />
		</div>
	);
}

function showWhatsAppIncomingToast({ conversationId, title, body, avatarSrc, isGroup, locale, sound = true, onOpen }) {
	if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
	const isArabic = locale === 'ar';
	const id = `wa-incoming-${conversationId}`;
	const count = (waIncomingCounts.get(id) || 0) + 1;
	waIncomingCounts.set(id, count);
	const dismiss = () => {
		waIncomingCounts.delete(id);
		toast.dismiss(id);
	};
	toast.custom(
		toastItem => (
			<WaIncomingMessageToast
				toastItem={toastItem}
				title={String(title || 'WhatsApp').slice(0, 80)}
				body={String(body || '').slice(0, 240)}
				count={count}
				avatarSrc={avatarSrc}
				isGroup={isGroup}
				isArabic={isArabic}
				onOpen={() => {
					dismiss();
					onOpen?.();
				}}
				onDismiss={dismiss}
			/>
		),
		{
			// One card per chat: the next message from the same chat updates it and restarts the timer.
			id,
			duration: WA_INCOMING_POPUP_MS,
			position: isArabic ? 'top-left' : 'top-right',
		},
	);
	// The card leaves on its own after the timer; forget its count then too.
	setTimeout(() => {
		if (waIncomingCounts.get(id) === count) waIncomingCounts.delete(id);
	}, WA_INCOMING_POPUP_MS + 1500);
	if (sound) playIncomingChime();
}


function ViewOnceIcon({ size = 22, className = 'wa-view-once__icon' }) {
	return (
		<svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<circle
				cx="12"
				cy="12"
				r="10"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeDasharray="3.2 2.4"
			/>
			<path d="M10.6 8.6 12.6 7.4V16.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function ViewOncePlaceholder({ message, locale, onOpen }) {
	const label = viewOnceMessageLabel(message, locale);
	const hint = viewOnceMessageHint(message, locale);
	const body = (
		<>
			<ViewOnceIcon />
			<span className="wa-view-once__text">
				<span className="wa-view-once__title">{label}</span>
				<span className="wa-view-once__hint">{hint}</span>
			</span>
		</>
	);
	// Select mode: the bubble tap toggles selection, so this stays inert.
	if (!onOpen) {
		return (
			<div className="wa-view-once" role="note">
				{body}
			</div>
		);
	}
	return (
		<button
			type="button"
			className="wa-view-once is-actionable"
			data-wa-press-surface
			aria-haspopup="dialog"
			aria-label={`${label}. ${hint}`}
			onClick={event => {
				event.stopPropagation();
				onOpen(message);
			}}
		>
			{body}
		</button>
	);
}

function ViewOnceInfoDialog({ message, locale, accountPhone, onClose }) {
	const ar = String(locale || '').toLowerCase().startsWith('ar');
	const outbound = message?.direction === 'outbound';
	const opened = outbound && ['read', 'played'].includes(message?.status);
	const phone = accountPhone ? formatWhatsAppPhone(accountPhone) : '';
	const lines = outbound
		? [
				ar
					? 'الوسائط المرسلة للعرض مرة واحدة يفتحها المستلم مرة واحدة فقط، ولا يمكنك أنت ولا هذه اللوحة عرضها بعد الإرسال.'
					: 'View once media you send can be opened only once by the recipient. Neither you nor this dashboard can view it after sending.',
				opened
					? ar
						? 'فتحها المستلم بالفعل.'
						: 'The recipient has already opened it.'
					: ar
						? 'لم يفتحها المستلم بعد.'
						: 'The recipient hasn’t opened it yet.',
			]
		: [
				ar
					? 'لحماية الخصوصية، واتساب لا يرسل محتوى رسائل «العرض مرة واحدة» إلى الأجهزة المرتبطة مثل واتساب ويب وهذه اللوحة، لذلك لا يمكن فتحها هنا.'
					: 'For privacy, WhatsApp doesn’t deliver view once content to linked devices such as WhatsApp Web or this dashboard, so it can’t be opened here.',
				phone ? (
					<>
						{ar
							? 'افتحها من تطبيق واتساب على الهاتف المسجَّل عليه الرقم '
							: 'Open it in the WhatsApp app on the phone registered to '}
						<bdi dir="ltr">{phone}</bdi>.
					</>
				) : ar
						? 'افتحها من تطبيق واتساب على الهاتف المسجَّل عليه هذا الحساب.'
						: 'Open it in the WhatsApp app on the phone this account is registered on.',
				ar
					? 'بعد فتحها على الهاتف تختفي ولا يمكن عرضها مرة أخرى في أي مكان.'
					: 'Once opened on the phone, it disappears and can’t be viewed again anywhere.',
			];
	return (
		<WaDialog
			zIndex={600}
			width={420}
			icon={<ViewOnceIcon size={18} className="" />}
			title={viewOnceMessageLabel(message, locale)}
			closeLabel={ar ? 'إغلاق' : 'Close'}
			onClose={onClose}
			footer={
				<button type="button" className="wa-ui-btn wa-ui-btn--primary" onClick={onClose}>
					{ar ? 'حسنًا' : 'OK'}
				</button>
			}
		>
			<div className="wa-dx__body wa-view-once-info">
				{lines.map((line, index) => (
					<p key={index} dir="auto">
						{line}
					</p>
				))}
			</div>
		</WaDialog>
	);
}

const PHONE_VIEWPORT_QUERY = '(max-width: 768px)';
function subscribePhoneViewport(onChange) {
	if (typeof window === 'undefined' || !window.matchMedia) return () => { };
	const query = window.matchMedia(PHONE_VIEWPORT_QUERY);
	query.addEventListener?.('change', onChange);
	return () => query.removeEventListener?.('change', onChange);
}
function readPhoneViewport() {
	return typeof window !== 'undefined' && Boolean(window.matchMedia?.(PHONE_VIEWPORT_QUERY).matches);
}
/** Matches `.wa-unread-divider` height + margins in wa-ui.css. */
const UNREAD_DIVIDER_HEIGHT = 48;

function MobileWhatsAppHeader({
	title,
	showTitle = true,
	scrolled = false,
	onSearch,
	onCamera,
	onMore,
	onReading,
	onOnline,
	locale = 'en',
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	return (
		<header className={`wa-mobile-header ${scrolled ? 'is-scrolled' : ''} hidden shrink-0 flex-col px-4 pb-2 min-[769px]:hidden`}>
			<div className="mt-2 flex h-11 items-center justify-between gap-3 pt-[env(safe-area-inset-top,0px)]">
				<button
					type="button"
					onClick={onMore}
					aria-label={ar ? 'المزيد' : 'More options'}
					className="grid h-7 w-7 place-items-center rounded-full bg-[#F0F2F5]"
				>
					<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect width="28" height="28" rx="14" fill="#0A0A0A" fillOpacity="0.03" />
						<path fillRule="evenodd" clipRule="evenodd" d="M10 14.0001C10 14.9114 9.26127 15.6501 8.35 15.6501C7.43873 15.6501 6.7 14.9114 6.7 14.0001C6.7 13.0888 7.43873 12.3501 8.35 12.3501C9.26127 12.3501 10 13.0888 10 14.0001ZM15.65 14.0001C15.65 14.9114 14.9112 15.6501 14 15.6501C13.0887 15.6501 12.35 14.9114 12.35 14.0001C12.35 13.0888 13.0887 12.3501 14 12.3501C14.9112 12.3501 15.65 13.0888 15.65 14.0001ZM19.65 15.6501C20.5613 15.6501 21.3 14.9114 21.3 14.0001C21.3 13.0888 20.5613 12.3501 19.65 12.3501C18.7387 12.3501 18 13.0888 18 14.0001C18 14.9114 18.7387 15.6501 19.65 15.6501Z" fill="#0A0A0A" />
					</svg>
				</button>
				<div className="flex items-center gap-2">
					{onOnline ? (
						<button
							type="button"
							onClick={onOnline}
							aria-label={ar ? 'المتصلون' : 'Online'}
							className="relative grid h-7 w-7 place-items-center rounded-full bg-[#F0F2F5] text-[#0A0A0A]"
						>
							<Radio size={15} strokeWidth={2.1} aria-hidden="true" />
							<span className="absolute -end-0.5 -top-0.5 size-2 rounded-full border border-white bg-[#25d366]" aria-hidden />
						</button>
					) : null}
					{onReading ? (
						<button
							type="button"
							onClick={onReading}
							aria-label={ar ? 'القراءة' : 'Reading'}
							className="grid h-7 w-7 place-items-center rounded-full bg-[#F0F2F5] text-[#0A0A0A]"
						>
							<BookOpen size={15} strokeWidth={2.1} aria-hidden="true" />
						</button>
					) : null}
					{onCamera ? (
					<button
						type="button"
						onClick={onCamera}
						aria-label={ar ? 'الكاميرا' : 'Camera'}
						className="grid h-7 w-7 place-items-center rounded-full bg-[#F0F2F5]"
					>
						<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect width="28" height="28" rx="14" fill="#0A0A0A" fillOpacity="0.03" />
							<path fillRule="evenodd" clipRule="evenodd" d="M11.8699 7C11.6312 7 11.4004 7.08539 11.2191 7.24074L9.45833 8.75H7C5.89543 8.75 5 9.64543 5 10.75V19.25C5 20.3546 5.89543 21.25 7 21.25H21C22.1046 21.25 23 20.3546 23 19.25V10.75C23 9.64543 22.1046 8.75 21 8.75H18.5417L16.7809 7.24074C16.5996 7.08539 16.3688 7 16.1301 7H11.8699ZM14 19C16.2091 19 18 17.2091 18 15C18 12.7909 16.2091 11 14 11C11.7909 11 10 12.7909 10 15C10 17.2091 11.7909 19 14 19ZM14 17.75C15.5188 17.75 16.75 16.5188 16.75 15C16.75 13.4812 15.5188 12.25 14 12.25C12.4812 12.25 11.25 13.4812 11.25 15C11.25 16.5188 12.4812 17.75 14 17.75ZM19.5 13.25C20.0523 13.25 20.5 12.8023 20.5 12.25C20.5 11.6977 20.0523 11.25 19.5 11.25C18.9477 11.25 18.5 11.6977 18.5 12.25C18.5 12.8023 18.9477 13.25 19.5 13.25Z" fill="#0A0A0A" />
						</svg>
					</button>
					) : null}
					<button
						type="button"
						onClick={onSearch}
						aria-label={ar ? 'محادثة جديدة' : 'New chat'}
						className="wa-new-chat grid h-7 w-7 place-items-center rounded-full bg-[#00A884] text-white"
					>
						<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect width="28" height="28" rx="14" fill="#1DAB61" />
							<path fillRule="evenodd" clipRule="evenodd" d="M14.9 8.7501C14.9 8.25304 14.4971 7.8501 14 7.8501C13.5029 7.8501 13.1 8.25304 13.1 8.7501V13.1001H8.75001C8.25295 13.1001 7.85001 13.503 7.85001 14.0001C7.85001 14.4972 8.25295 14.9001 8.75001 14.9001H13.1V19.2501C13.1 19.7472 13.5029 20.1501 14 20.1501C14.4971 20.1501 14.9 19.7472 14.9 19.2501V14.9001H19.25C19.7471 14.9001 20.15 14.4972 20.15 14.0001C20.15 13.503 19.7471 13.1001 19.25 13.1001H14.9V8.7501Z" fill="white" />
						</svg>
					</button>
				</div>
			</div>
			{showTitle && <h1 className="title-whatsapp mt-1 mb-1">{title}</h1>}
		</header>
	);
}

function MobileOverflowMenu({
	open,
	tabs: menuTabs,
	labels,
	onSelect,
	onProfile,
	onClose,
	locale = 'en',
	darkMode = false,
	onToggleDarkMode,
	onSwitchLocale,
}) {
	const { openSidebar } = useSidebarChrome();
	const ar = String(locale).toLowerCase().startsWith('ar');
	// Escape closes it like the other menus (it used to stay open under the next popup).
	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);
	if (!open) return null;
	return (
		<>
			<button
				type="button"
				aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
				onClick={onClose}
				className="fixed inset-0 z-190 bg-transparent min-[769px]:hidden"
			/>
			<div className="wa-mobile-menu absolute start-4 top-[calc(52px+env(safe-area-inset-top,0px))] z-200 max-h-[calc(100dvh-72px-env(safe-area-inset-top,0px))] min-w-52 overflow-y-auto overscroll-contain rounded-xl py-2 shadow-2xl min-[769px]:hidden">
				{typeof onToggleDarkMode === 'function' ? (
					<button
						type="button"
						onClick={() => {
							onToggleDarkMode();
							onClose();
						}}
						className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm active:bg-white/10"
					>
						{darkMode ? <Sun size={18} className="text-[#8696a0]" /> : <Moon size={18} className="text-[#8696a0]" />}
						<span>{darkMode ? labels.lightMode : labels.darkMode}</span>
					</button>
				) : null}
				{typeof onSwitchLocale === 'function' ? (
					<button
						type="button"
						onClick={() => {
							onSwitchLocale(ar ? 'en' : 'ar');
							onClose();
						}}
						className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm active:bg-white/10"
					>
						<Languages size={18} className="text-[#8696a0]" />
						<span>{ar ? labels.switchToEnglish : labels.switchToArabic}</span>
					</button>
				) : null}
				{(typeof onToggleDarkMode === 'function' || typeof onSwitchLocale === 'function') ? (
					<div className="my-1 h-px bg-[#8696a0]/20" aria-hidden="true" />
				) : null}
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
				<button type="button" onClick={() => { onClose(); openSidebar(); }} className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm active:bg-white/10">
					<PanelLeft size={18} className="text-[#8696a0] rtl:scale-x-[-1]" />
					<span>{labels.openSidebar}</span>
				</button>
			</div>
		</>
	);
}

function MobileCallsView({ logs, labels, locale, loading }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const calls = logs.filter(log =>
		/call|voice_call|video_call/i.test(
			`${log.type || ''} ${log.event || ''} ${log.action || ''} ${log.message || ''}`,
		),
	);
	return (
		<section className="wa-mobile-calls wa-m-calls min-h-full pb-28 min-[769px]:hidden">
			<header className="wa-m-section__head">
				<h2>{ar ? 'الأخيرة' : 'Recent'}</h2>
			</header>
			{loading ? (
				<TabLoading label={labels.loading} />
			) : calls.length === 0 ? (
				<div className="wa-m-empty">
					<span className="wa-m-empty__icon" aria-hidden="true">
						<Phone size={30} strokeWidth={1.8} />
					</span>
					<p className="wa-m-empty__title">{labels.noCalls}</p>
					<p className="wa-m-empty__hint">{labels.callsUnavailable}</p>
				</div>
			) : (
				<ul className="wa-m-call-list">
					{calls.map(call => {
						const outgoing = /outgoing|outbound/i.test(`${call.type || ''} ${call.event || ''}`);
						const missed = /missed|reject/i.test(`${call.type || ''} ${call.event || ''} ${call.status || ''}`);
						const video = /video/i.test(`${call.type || ''} ${call.event || ''}`);
						const label = call.contactName || call.name || call.phoneNumber || call.waId || labels.calls;
						const at = call.created_at || call.createdAt;
						return (
							<li key={call.id} className="wa-m-call">
								<Avatar label={label} size={10} src={call.avatarUrl} />
								<div className="wa-m-call__body">
									<div className="min-w-0 flex-1">
										<p className={`wa-m-call__name${missed ? ' is-missed' : ''}`} dir="auto">
											{label}
										</p>
										<p className="wa-m-call__kind">
											{video ? <Video size={14} aria-hidden="true" /> : <Phone size={13} aria-hidden="true" />}
											{outgoing
												? ar ? 'صادرة' : 'Outgoing'
												: missed
													? ar ? 'فائتة' : 'Missed'
													: ar ? 'واردة' : 'Incoming'}
										</p>
									</div>
									<span className="wa-m-call__time">
										{at ? conversationTimestamp(at, locale) : ''}
									</span>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

function reportDateRange(days = 7) {
	const to = new Date();
	// Today means since midnight, not the last 24 hours.
	const from =
		Number(days) === 1
			? new Date(to.getFullYear(), to.getMonth(), to.getDate())
			: new Date(Date.now() - Number(days || 7) * 24 * 60 * 60 * 1000);
	return { from: from.toISOString(), to: to.toISOString() };
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

/**
 * The video pulled from a social link, shown under the link preview it belongs to.
 *
 * Renders nothing until a download is actually requested, so an ordinary shared link
 * keeps looking exactly as it does today.
 */
function SocialVideoDownload({
	state,
	locale,
	onRetry,
	labels,
	conversationId,
	conversations,
	onAddToStory,
}) {
	if (!state) return null;
	const ar = locale === 'ar';

	if (state.status === 'pending') {
		return (
			<div className="mb-1 flex items-center gap-2.5 rounded-xl border border-black/5 bg-black/[0.045] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.07]">
				<Loader2 size={16} className="shrink-0 animate-spin text-[#027EB5] dark:text-[#53BDEB]" />
				<span className="min-w-0 flex-1 truncate text-[12px] opacity-75">
					{ar ? 'جارٍ تحميل الفيديو…' : 'Downloading video…'}
				</span>
			</div>
		);
	}

	if (state.status === 'failed') {
		return (
			<div className="mb-1 rounded-xl border border-red-500/25 bg-red-500/8 px-3 py-2.5">
				<div className="flex items-start gap-2.5">
					<AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
					<span className="min-w-0 flex-1 text-[12px] leading-snug text-red-700 dark:text-red-300">
						{state.errorMessage || (ar ? 'فشل تحميل الفيديو' : 'Could not download this video')}
					</span>
				</div>
				<button
					type="button"
					onPointerDown={event => event.stopPropagation()}
					onClick={event => {
						event.preventDefault();
						event.stopPropagation();
						onRetry();
					}}
					className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-600/10 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-600/20 dark:text-red-300"
				>
					<RefreshCw size={12} strokeWidth={2.4} />
					{ar ? 'إعادة المحاولة' : 'Retry'}
				</button>
			</div>
		);
	}

	if (state.status !== 'ready' || !state.url) return null;
	return (
		<div className="mb-1">
			<div className="overflow-hidden rounded-xl">
				<ChatVideoPlayer
					url={absoluteApiUrl(state.url)}
					cacheKey={state.id}
					durationHint={state.durationSeconds || 0}
					playLabel={labels.playVideo || labels.play || 'Play'}
					pauseLabel={labels.pauseVideo || 'Pause'}
					muteLabel={labels.muteVideo || 'Mute'}
					unmuteLabel={labels.unmuteVideo || 'Unmute'}
					expandLabel={labels.expandVideo || 'Expand video'}
					collapseLabel={labels.exitVideoFullscreen || 'Exit fullscreen'}
					closeLabel={labels.close || 'Close'}
					speedLabel={labels.playbackSpeed || 'Playback speed'}
					moreLabel={labels.moreActions || 'More'}
				/>
			</div>
			<SocialVideoActions
				downloadId={state.id}
				locale={locale}
				conversationId={conversationId}
				conversations={conversations}
				onAddToStory={onAddToStory}
			/>
		</div>
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

/**
 * Chat header line under the name (online / last seen / assignee). Owns its 30s clock so
 * "last seen 5 min ago" stays current without re-rendering the whole workspace.
 */
function ChatHeaderPresenceSubtitle({ presence, locale, assigneeName }) {
	const [, setTick] = useState(0);
	useEffect(() => {
		const timer = window.setInterval(() => setTick(value => value + 1), 30_000);
		return () => window.clearInterval(timer);
	}, []);
	const subtitle = conversationPresenceSubtitle(presence, locale, formatLastSeen);
	if (subtitle?.kind === 'online') {
		return (
			<span className="wa-online-status inline-flex items-center gap-1.5">
				<span className="wa-online-dot" aria-hidden="true" />
				{subtitle.text}
			</span>
		);
	}
	if (subtitle?.kind === 'lastSeen') {
		return <span className="wa-last-seen text-slate-400">{subtitle.text}</span>;
	}
	if (subtitle?.kind === 'offline') {
		return (
			<span className="wa-offline-status inline-flex items-center gap-1.5 text-slate-400">
				<span className="inline-block h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
				{subtitle.text}
			</span>
		);
	}
	return (
		<span className="wa-chat-assignee-pill inline-flex max-w-full items-center gap-1.5">
			<UserRound size={12} strokeWidth={2.3} className="shrink-0 opacity-70" />
			<span className="truncate">{assigneeName}</span>
		</span>
	);
}

function formatLastSeen(ts, locale = 'en') {
	if (!ts || ts <= 0) return '';
	const date = new Date(ts);
	const now = new Date();
	const diffMs = now - date;
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return locale === 'ar' ? 'آخر ظهور: الآن' : 'last seen: just now';
	if (diffMin < 60) {
		return locale === 'ar'
			? `آخر ظهور: منذ ${diffMin} د`
			: `last seen: ${diffMin}m ago`;
	}
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) {
		return locale === 'ar'
			? `آخر ظهور: منذ ${diffHr} س`
			: `last seen: ${diffHr}h ago`;
	}
	const dateStr = date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
		month: 'short', day: 'numeric',
	});
	const timeStr = date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
		hour: '2-digit', minute: '2-digit',
	});
	return locale === 'ar'
		? `آخر ظهور: ${dateStr} ${timeStr}`
		: `last seen: ${dateStr} at ${timeStr}`;
}

function Empty({ icon: Icon = MessageCircle, title, hint, action = null, className = '' }) {
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
			{action ? (
				<button type="button" onClick={action.onClick} className="wa-chat-list-empty__action">
					{action.label}
				</button>
			) : null}
		</div>
	);
}

const DESKTOP_LAYOUT_QUERY = '(min-width: 769px)';
function subscribeDesktopLayout(onChange) {
	const media = window.matchMedia(DESKTOP_LAYOUT_QUERY);
	media.addEventListener('change', onChange);
	return () => media.removeEventListener('change', onChange);
}

/** True when the chat pane sits beside the list (the CSS `min-[769px]` breakpoint). */
function useDesktopLayout() {
	return useSyncExternalStore(
		subscribeDesktopLayout,
		() => window.matchMedia(DESKTOP_LAYOUT_QUERY).matches,
		() => true,
	);
}

const ChatIdlePane = memo(function ChatIdlePane({ title, hint, unreadLabel, steps }) {
	return (
		<WhatsAppChatIdlePane
			title={title}
			hint={hint}
			unreadLabel={unreadLabel}
			steps={steps}
		/>
	);
});

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

/**
 * Same bubble content: rows are rebuilt as new objects whenever the message list changes,
 * but the message objects inside them keep their identity unless that message changed.
 */
function sameThreadRow(a, b) {
	if (a === b) return true;
	if (!a || !b || a.kind !== b.kind || a.key !== b.key) return false;
	if (a.kind !== 'image-gallery') return a.message === b.message;
	if (a.messages.length !== b.messages.length || a.attachments.length !== b.attachments.length) return false;
	for (let i = 0; i < a.messages.length; i += 1) if (a.messages[i] !== b.messages[i]) return false;
	return true;
}

/** A quoted reply is drawn from the conversation's messages, so it follows them. */
function threadRowQuotes(row) {
	if (row?.kind === 'image-gallery') return Boolean(row.messages[row.messages.length - 1]?.replyTo);
	return Boolean(row?.message?.replyTo);
}

/** Same names and phones for every id (mention directories are rebuilt on each list update). */
function sameMentionDirectory(a, b) {
	if (a === b) return true;
	if (!a || !b || a.size !== b.size) return false;
	for (const [id, entry] of a) {
		const other = b.get(id);
		if (!other || other.name !== entry.name || other.phone !== entry.phone) return false;
	}
	return true;
}

/** Same values in the same order (Object.is), for thread row reuse. */
function sameThreadRowDeps(a, b) {
	if (a === b) return true;
	if (!a || !b || a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) if (!Object.is(a[i], b[i])) return false;
	return true;
}

function WhatsAppWorkspaceContent() {
	waPerfCountRender('workspace');
	const locale = useLocale();
	const t = translations[locale] || translations.en;
	const pathname = usePathname();
	const router = useRouter();
	const { mode: themeMode, setMode: setThemeMode } = useTheme();
	const darkMode = themeMode === 'dark';
	const switchLocale = useCallback(
		nextLocale => {
			const next = nextLocale === 'en' ? 'en' : 'ar';
			if (next === locale) return;
			try {
				document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
				document.documentElement.lang = next;
				document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
			} catch {
				/* ignore cookie / DOM errors in restricted contexts */
			}
			// Hard assign so the client-only WhatsApp workspace remounts in the new
			// locale (soft next-intl replace was leaving mobile stuck on Arabic).
			const fullPath =
				typeof window !== 'undefined'
					? window.location.pathname
					: `/${locale}${pathname || '/dashboard/whatsapp'}`;
			const segs = fullPath.split('/').filter(Boolean);
			if (segs[0] === 'en' || segs[0] === 'ar') segs[0] = next;
			else segs.unshift(next);
			const search = typeof window !== 'undefined' ? window.location.search : '';
			if (typeof window !== 'undefined') {
				window.location.assign(`/${segs.join('/')}${search}`);
				return;
			}
			router.replace(pathname, { locale: next });
		},
		[locale, pathname, router],
	);
	const toggleDarkMode = useCallback(() => {
		setThemeMode(darkMode ? 'light' : 'dark');
	}, [darkMode, setThemeMode]);

	// Match WhatsApp light/dark status-bar colours while this page is open (PWA).
	useEffect(() => {
		if (typeof document === 'undefined') return undefined;
		const color = darkMode ? '#0b141a' : '#ffffff';
		const statusStyle = darkMode ? 'black' : 'default';

		const previousThemeNodes = Array.from(
			document.querySelectorAll('meta[name="theme-color"]'),
		).map(node => ({
			node,
			content: node.getAttribute('content'),
			media: node.getAttribute('media'),
		}));

		// Drop media-query variants so system dark mode cannot paint a dark bar
		// over a light WhatsApp chrome (same as native WA light mode).
		previousThemeNodes.forEach(({ node }) => {
			node.removeAttribute('media');
			node.setAttribute('content', color);
		});
		if (previousThemeNodes.length === 0) {
			const node = document.createElement('meta');
			node.setAttribute('name', 'theme-color');
			node.setAttribute('content', color);
			document.head.appendChild(node);
			previousThemeNodes.push({ node, content: null, media: null });
		}

		let statusNode = document.querySelector(
			'meta[name="apple-mobile-web-app-status-bar-style"]',
		);
		const previousStatus = statusNode?.getAttribute('content') ?? null;
		if (!statusNode) {
			statusNode = document.createElement('meta');
			statusNode.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
			document.head.appendChild(statusNode);
		}
		statusNode.setAttribute('content', statusStyle);

		return () => {
			previousThemeNodes.forEach(({ node, content, media }) => {
				if (!node.isConnected) return;
				if (content == null) {
					node.remove();
					return;
				}
				node.setAttribute('content', content);
				if (media) node.setAttribute('media', media);
				else node.removeAttribute('media');
			});
			if (statusNode?.isConnected) {
				if (previousStatus == null) statusNode.remove();
				else statusNode.setAttribute('content', previousStatus);
			}
		};
	}, [darkMode]);
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
	// Last list of each server-side filter (Archived, Keep in touch), painted at once when you
	// switch back to it while the fresh list loads. Kept apart from the All-inbox cache.
	const filterListCacheRef = useRef(new Map());
	const messagesCacheRef = useRef(messagesCacheAdapter);
	conversationsCacheRef.current = conversationsCacheAdapter;
	messagesCacheRef.current = messagesCacheAdapter;
	const hoverPrefetchTimerRef = useRef(null);
	const prefetchInFlightRef = useRef(0);
	const listScrollPrefetchBlockedUntilRef = useRef(0);
	const [activeTab, setActiveTab] = useState(null);
	/* Where the Reading room's back button returns to (it hides the mobile tab bar). */
	const readingReturnTabRef = useRef('chats');
	/* Handler for "followed contact came online" socket alerts (set after openConversationFromReport). */
	const presenceWatchAlertRef = useRef(null);
	const [tabReady, setTabReady] = useState(false);
	const restoredTabRef = useRef(false);
	const [settingsSection, setSettingsSection] = useState('ai');
	const [profileCopied, setProfileCopied] = useState(false);
	const [accounts, setAccounts] = useState([]);
	const [accountId, setAccountId] = useState(null);
	const [onlineContacts, setOnlineContacts] = useState([]);
	const [showOnlineBar, setShowOnlineBar] = useState(() => readStoredShowOnlineBar(null));
	const [pinnedOnlineContactId, setPinnedOnlineContactId] = useState(null);
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
	/** Tick so relative "last seen Xm ago" refreshes while the chat is open. */
	const [presenceClock, setPresenceClock] = useState(0);
	const [secondaryConversationId, setSecondaryConversationId] = useState(null);
	const [splitPickMode, setSplitPickMode] = useState(false);
	const [splitLiveMessage, setSplitLiveMessage] = useState(null);
	const [messages, setMessages] = useState([]);
	const [messageTranslations, setMessageTranslations] = useState({});
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
	const [statusHistory, setStatusHistory] = useState([]);
	const [storyPanelMode, setStoryPanelMode] = useState('active');
	const [storyFilter, setStoryFilter] = useState('all');
	const [storySearch, setStorySearch] = useState('');
	const [mobileStatusComposerOpen, setMobileStatusComposerOpen] = useState(false);
	const [loadingStatusHistory, setLoadingStatusHistory] = useState(false);
	const [statusFetchHint, setStatusFetchHint] = useState(null);
	const [selectedStatus, setSelectedStatus] = useState(null);
	const [storyQueue, setStoryQueue] = useState([]);
	const [storyIndex, setStoryIndex] = useState(0);
	const [storyPeopleQueue, setStoryPeopleQueue] = useState([]);
	const [storyPeopleIndex, setStoryPeopleIndex] = useState(0);
	const [storyLoop, setStoryLoop] = useState(false);
	const [storyReplayKey, setStoryReplayKey] = useState(0);
	const [storyReplyDraft, setStoryReplyDraft] = useState('');
	const [likingStory, setLikingStory] = useState(false);
	const [sendingStoryReply, setSendingStoryReply] = useState(false);
	const [storyShareOpen, setStoryShareOpen] = useState(false);
	const [storyShareSearch, setStoryShareSearch] = useState('');
	const [sendingStoryShareId, setSendingStoryShareId] = useState(null);
	const [storyRepostOpen, setStoryRepostOpen] = useState(false);
	const [storyRepostText, setStoryRepostText] = useState('');
	const [repostingStory, setRepostingStory] = useState(false);
	const [autoForwardOpen, setAutoForwardOpen] = useState(false);
	/** Group member whose details are open in the side panel ({ waId, name, avatarUrl, color }). */
	const [personCard, setPersonCard] = useState(null);
	/** Chat whose "Check connection" dialog is open (conversation id). */
	const [connectionCheckFor, setConnectionCheckFor] = useState(null);
	/** Team members with WhatsApp open right now ({ userId, name, role, lastSeenAt }); admins only. */
	const [staffOnline, setStaffOnline] = useState([]);
	const [privacyBlurMenuOpen, setPrivacyBlurMenuOpen] = useState(false);
	const storyDialogOpenRef = useRef(false);
	storyDialogOpenRef.current = storyRepostOpen || storyShareOpen;
	const [storyViewerEmbed, setStoryViewerEmbed] = useState(null);
	const [storyViewersOpen, setStoryViewersOpen] = useState(false);
	const [storyViewers, setStoryViewers] = useState({
		statusId: null,
		loading: false,
		error: '',
		data: null,
	});
	const [sendingStoryReaction, setSendingStoryReaction] = useState(null);
	const storyViewersOpenRef = useRef(false);
	const storyViewersRequestRef = useRef(0);
	// Last viewer list per story: the sheet opens on it at once and refreshes behind it.
	const storyViewersCacheRef = useRef(new Map());
	const storyInteractionEventRef = useRef(null);
	const storyLoopRef = useRef(false);
	const storyQueueRef = useRef([]);
	const storyIndexRef = useRef(0);
	const storyPeopleQueueRef = useRef([]);
	const storyPeopleIndexRef = useRef(0);
	const groupedStatusesRef = useRef([]);
	const groupedStatusHistoryRef = useRef([]);
	const openStoryGroupRef = useRef(null);
	const [statusMediaUrl, setStatusMediaUrl] = useState(null);
	const [loadingStory, setLoadingStory] = useState(false);
	const [storyMediaError, setStoryMediaError] = useState('');
	const [storyDurationMs, setStoryDurationMs] = useState(5000);
	const [storyPaused, setStoryPaused] = useState(false);
	const [storyMuted, setStoryMuted] = useState(false);
	const [storyExpanded, setStoryExpanded] = useState(false);
	const [storyPeekMedia, setStoryPeekMedia] = useState({});
	/** 1 = next person, -1 = previous, 0 = open from tray (no slide). */
	const [storyPersonSlideDir, setStoryPersonSlideDir] = useState(0);
	const storyPersonSlideDirRef = useRef(0);
	const storyPersonAnimatingRef = useRef(false);
	const storyPersonAnimUnlockTimerRef = useRef(null);
	const storyStartRef = useRef(0);
	const storyElapsedRef = useRef(0);
	const storyProgressBarRef = useRef(null);
	const storyProgressRef = useRef(0);
	// Progress ticks every animation frame; write the bar width directly so the
	// workspace does not re-render ~30×/s while a story plays.
	const setStoryProgress = useCallback(pct => {
		const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
		storyProgressRef.current = clamped;
		const bar = storyProgressBarRef.current;
		if (bar) bar.style.width = `${clamped}%`;
	}, []);
	const storyVideoRef = useRef(null);
	/*
	 * The person carousel keeps the outgoing card mounted while it slides out, so two
	 * story videos briefly share this ref. A plain object ref is nulled when the old one
	 * unmounts, which left the new video playing with nothing able to pause it.
	 */
	const bindStoryVideo = useCallback(node => {
		if (!node) return undefined;
		storyVideoRef.current = node;
		return () => {
			node.pause();
			if (storyVideoRef.current === node) storyVideoRef.current = null;
		};
	}, []);
	const silenceOtherStoryVideos = useCallback(() => {
		if (typeof document === 'undefined') return;
		for (const node of document.querySelectorAll('.wa-story-viewer__card video')) {
			if (node === storyVideoRef.current || node.paused) continue;
			node.muted = true;
			node.pause();
		}
	}, []);
	const storySegmentDoneRef = useRef(false);
	const storyPeekMediaRef = useRef({});
	const [logs, setLogs] = useState([]);
	const [report, setReport] = useState(null);
	const [reportPeriodDays, setReportPeriodDays] = useState(7);
	const [reportStaffDetail, setReportStaffDetail] = useState(null);
	const [reportStaffDetailLoading, setReportStaffDetailLoading] = useState(false);
	const reportPeriodDaysRef = useRef(7);
	reportPeriodDaysRef.current = reportPeriodDays;
	// Last report per account and period: switching back shows it at once while it refreshes.
	const reportCacheRef = useRef(new Map());
	const [reportRefreshing, setReportRefreshing] = useState(false);
	const [staff, setStaff] = useState([]);
	const [assignableStaff, setAssignableStaff] = useState([]);
	const [assignableStaffLoading, setAssignableStaffLoading] = useState(false);
	const [privacySettings, setPrivacySettings] = useState({
		hideStatusViewReceipts: true,
		readReceiptMode: 'on_reply',
		holdDeliveryReceipts: false,
		hideTypingIndicator: false,
	});
	const [notificationSettings, setNotificationSettings] = useState({
		notificationsEnabled: true,
	});
	const [notificationSettingsSaving, setNotificationSettingsSaving] = useState(false);
	const whatsappNotificationsEnabledRef = useRef(true);
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
	const sendingRef = useRef(false);
	/*
	 * Text messages go out in the background, one conversation queue at a time: the composer is
	 * free immediately and the next message can be typed and sent, while the server still
	 * receives them in the order they were written (parallel POSTs could reach WhatsApp swapped).
	 */
	const outboundTextQueueRef = useRef(new Map());
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [hasMoreMessages, setHasMoreMessages] = useState(true);
	const hasMoreMessagesRef = useRef(true);
	hasMoreMessagesRef.current = hasMoreMessages;
	const [loadingMessages, setLoadingMessages] = useState(false);
	/** Chat whose first stored page has been painted (the inbox preview row alone does not count). */
	const threadPageLandedRef = useRef(null);
	/** Conversation whose cached thread is painted while a provider catch-up runs. */
	const [threadSyncingId, setThreadSyncingId] = useState(null);
	/** Soft catch-up when inbox shows unread/new preview the warm thread does not have yet. */
	const [messageCatchUp, setMessageCatchUp] = useState(null);
	const messageCatchUpRef = useRef(null);
	messageCatchUpRef.current = messageCatchUp;
	const [threadSettled, setThreadSettled] = useState(true);
	const [showJumpToBottom, setShowJumpToBottom] = useState(false);
	const [messagesSyncHint, setMessagesSyncHint] = useState('');
	const [recordingVoice, setRecordingVoice] = useState(false);
	const [recordingStarting, setRecordingStarting] = useState(false);
	const [recordingPaused, setRecordingPaused] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	/** Kept after a failed send so the user can retry without re-recording. */
	const [pendingVoiceDraft, setPendingVoiceDraft] = useState(null);
	const [voiceChangerOpen, setVoiceChangerOpen] = useState(false);
	const [cloneVoicePickMode, setCloneVoicePickMode] = useState(false);
	const [cloneVoicePickSampleBase, setCloneVoicePickSampleBase] = useState(0);
	const [pendingCloneSampleTick, setPendingCloneSampleTick] = useState(0);
	const pendingCloneSamplesRef = useRef([]);
	const cloneVoiceHistoryRef = useRef(new Map());
	const [voiceChanging, setVoiceChanging] = useState(false);
	const [sendingVideoAsVoiceId, setSendingVideoAsVoiceId] = useState('');
	/** `{ messageId, attachmentId }` while the video → voice editor is open. */
	const [videoToVoiceTarget, setVideoToVoiceTarget] = useState(null);
	/**
	 * Downloaded social videos, keyed by message id.
	 *
	 * Held in the workspace rather than per bubble so a row can scroll out of the
	 * virtualized window and back without losing a download that is still running.
	 */
	const [socialDownloads, setSocialDownloads] = useState({});
	const socialPollTimersRef = useRef(new Map());
	/** `{ attachmentId, messageId, defaultTitle }` while picking a library folder. */
	const [librarySaveTarget, setLibrarySaveTarget] = useState(null);
	/**
	 * `{ previewUrl, durationSeconds, fileSizeBytes }` plus one source id — either
	 * `attachmentId` for a video message or `socialDownloadId` for a downloaded clip —
	 * while the story confirmation is open.
	 */
	const [storyTarget, setStoryTarget] = useState(null);
	const [libraryOpen, setLibraryOpen] = useState(false);
	const [voiceChangerSettings, setVoiceChangerSettings] = useState(null);
	const voiceChangerSettingsRef = useRef({ configured: true, enabled: false, provider: 'off' });
	const draftRef = useRef('');
	const composerApiRef = useRef(null);
	const [composerHasText, setComposerHasText] = useState(false);
	const [browserOnline, setBrowserOnline] = useState(
		() => typeof navigator === 'undefined' || navigator.onLine,
	);
	const [socketLive, setSocketLive] = useState(true);
	const notifyComposerHasText = useCallback(has => {
		setComposerHasText(current => (current === has ? current : has));
	}, []);
	const setDraft = useCallback(next => {
		composerApiRef.current?.setDraft(next);
	}, []);
	const getDraft = useCallback(() => String(draftRef.current || ''), []);
	const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
	const [scheduleAnchorEl, setScheduleAnchorEl] = useState(null);
	const [editingSchedule, setEditingSchedule] = useState(null);
	const [schedulesPanelOpen, setSchedulesPanelOpen] = useState(false);
	const [messageSchedules, setMessageSchedules] = useState([]);
	const [messageSchedulesLoading, setMessageSchedulesLoading] = useState(false);
	const [messageScheduleBusyId, setMessageScheduleBusyId] = useState('');
	// Delayed reply: while on, Enter in this chat schedules the text instead of sending it.
	const [delayedSendOn, setDelayedSendOn] = useState(false);
	const [delayedSendOpen, setDelayedSendOpen] = useState(false);
	const [delayedSendPrefs, setDelayedSendPrefsState] = useState(DEFAULT_DELAYED_SEND_PREFS);
	const [replyGapState, setReplyGapState] = useState({ conversationId: '', loading: false, data: null, error: false });
	const [delayedSendNow, setDelayedSendNow] = useState(() => Date.now());
	const delayedSendButtonRef = useRef(null);
	// Mute state of chats that are not in the loaded list, for in-page notifications.
	const notifyStateCacheRef = useRef(null);
	if (!notifyStateCacheRef.current) {
		notifyStateCacheRef.current = createNotifyStateCache(id =>
			api.get(`/whatsapp/conversations/${id}/notify-state`).then(response => response.data),
		);
	}
	const setDelayedSendPrefs = useCallback(next => {
		setDelayedSendPrefsState(next);
		writeDelayedSendPrefs(next);
	}, []);
	const [pinsPanelOpen, setPinsPanelOpen] = useState(false);
	const [typingHistoryOpen, setTypingHistoryOpen] = useState(false);
	const [typingAttemptEvent, setTypingAttemptEvent] = useState(null);
	const [pinnedMessages, setPinnedMessages] = useState([]);
	const [pinnedMessagesLoading, setPinnedMessagesLoading] = useState(false);
	const liveMessageSchedules = useMemo(
		() =>
			(Array.isArray(messageSchedules) ? messageSchedules : []).filter(item => {
				const status = String(item?.status || '').toLowerCase();
				return status === 'active' || status === 'paused' || status === 'processing' || status === 'failed';
			}),
		[messageSchedules],
	);
	const waitingSchedules = useMemo(() => waitingOnceSchedules(liveMessageSchedules), [liveMessageSchedules]);
	/** Documents / videos / audio picked for the open chat, waiting for Send (like WhatsApp). */
	const [composerFiles, setComposerFiles] = useState([]);
	const composerFilesRef = useRef([]);
	const setComposerFilesState = useCallback(next => {
		setComposerFiles(current => {
			const resolved = typeof next === 'function' ? next(current) : next;
			const items = Array.isArray(resolved) ? resolved : [];
			composerFilesRef.current = items;
			return items;
		});
	}, []);
	const [composerImages, setComposerImages] = useState([]);
	const composerImagesRef = useRef([]);
	const setComposerImagesState = useCallback(next => {
		setComposerImages(current => {
			const resolved = typeof next === 'function' ? next(current) : next;
			const items = Array.isArray(resolved) ? resolved : [];
			composerImagesRef.current = items;
			return items;
		});
	}, []);

	const openSchedulePopover = useCallback(event => {
		setEditingSchedule(null);
		setScheduleAnchorEl(event?.currentTarget || null);
		setScheduleDialogOpen(true);
	}, []);

	const closeSchedulePopover = useCallback(open => {
		setScheduleDialogOpen(open);
		if (!open) {
			setScheduleAnchorEl(null);
			setEditingSchedule(null);
		}
	}, []);

	const toggleSchedulesPanel = useCallback(event => {
		event?.stopPropagation?.();
		if (liveMessageSchedules.length > 0) {
			setPinsPanelOpen(false);
			setSchedulesPanelOpen(current => !current);
			return;
		}
		openSchedulePopover(event);
	}, [liveMessageSchedules.length, openSchedulePopover]);

	const togglePinsPanel = useCallback(event => {
		event?.stopPropagation?.();
		setSchedulesPanelOpen(false);
		setPinsPanelOpen(current => !current);
	}, []);

	const openEditSchedule = useCallback((schedule, event) => {
		if (!schedule?.id) return;
		setEditingSchedule(schedule);
		setScheduleAnchorEl(event?.currentTarget || null);
		setScheduleDialogOpen(true);
	}, []);

	useEffect(() => {
		composerImagesRef.current = composerImages;
	}, [composerImages]);

	const removeComposerImageById = useCallback(id => {
		setComposerImagesState(current => {
			const target = current.find(item => item.id === id);
			if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
			return current.filter(item => item.id !== id);
		});
	}, [setComposerImagesState]);

	const markComposerImageUploading = useCallback((id, uploading) => {
		setComposerImagesState(current =>
			current.map(item => (item.id === id ? { ...item, uploading } : item)),
		);
	}, [setComposerImagesState]);

	useEffect(() => {
		const sync = () => setBrowserOnline(typeof navigator === 'undefined' || navigator.onLine);
		window.addEventListener('online', sync);
		window.addEventListener('offline', sync);
		return () => {
			window.removeEventListener('online', sync);
			window.removeEventListener('offline', sync);
		};
	}, []);

	useEffect(() => () => {
		for (const item of composerImagesRef.current) {
			if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
		}
	}, []);
	const [replyingTo, setReplyingTo] = useState(null);
	const focusComposerForReplyRef = useRef(false);
	useEffect(() => {
		if (!replyingTo || !focusComposerForReplyRef.current) return undefined;
		focusComposerForReplyRef.current = false;
		// Two frames: the message menu returns focus to its trigger as it closes.
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => composerApiRef.current?.focus());
		});
		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
		};
	}, [replyingTo]);
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
	const [sharingTargetConversationId, setSharingTargetConversationId] = useState(null);
	const [highlightedMessageKey, setHighlightedMessageKey] = useState(null);
	const highlightTimerRef = useRef(null);
	const [messageInfo, setMessageInfo] = useState(null);
	const [loadingMessageInfo, setLoadingMessageInfo] = useState(false);
	const [deleteMessageTarget, setDeleteMessageTarget] = useState(null);
	const [viewOnceInfoMessage, setViewOnceInfoMessage] = useState(null);
	const [transcriptionSources, setTranscriptionSources] = useState(null);
	const [transcriptionIntent, setTranscriptionIntent] = useState(null);
	const transcriptionIntentRef = useRef(null);
	transcriptionIntentRef.current = transcriptionIntent;
	const pendingCopyMessagesRef = useRef([]);
	const [messageTranscripts, setMessageTranscripts] = useState(() => ({}));
	const [conversationActionTarget, setConversationActionTarget] = useState(null);
	const [conversationActionAnchor, setConversationActionAnchor] = useState(null);
	const [conversationAssignTarget, setConversationAssignTarget] = useState(null);
	const [conversationInfoTarget, setConversationInfoTarget] = useState(null);
	const [conversationInfoGroup, setConversationInfoGroup] = useState(null);
	const [loadingConversationInfoGroup, setLoadingConversationInfoGroup] = useState(false);
	const [conversationInfoAvatarPreview, setConversationInfoAvatarPreview] = useState(null);
	const conversationInfoRequestId = useRef(0);
	// Escape closes the info panel (the photo preview first), like WhatsApp Web. Open menus
	// handle their own Escape, so leave the key to them while one is showing.
	useEffect(() => {
		if (!conversationInfoTarget) return undefined;
		const onKeyDown = event => {
			if (event.key !== 'Escape' || event.defaultPrevented) return;
			if (document.querySelector('.wa-ui-menu.fixed, .wa-message-action-menu, .wa-conversation-action-menu')) return;
			if (conversationInfoAvatarPreview) {
				setConversationInfoAvatarPreview(null);
				return;
			}
			conversationInfoRequestId.current += 1;
			setConversationInfoTarget(null);
			setConversationInfoGroup(null);
			setLoadingConversationInfoGroup(false);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [conversationInfoTarget, conversationInfoAvatarPreview]);
	const [notes, setNotes] = useState([]);
	const [noteDraft, setNoteDraft] = useState('');
	const [showNotes, setShowNotes] = useState(false);
	const [loadingNotes, setLoadingNotes] = useState(false);
	const [savingNote, setSavingNote] = useState(false);
	const [statusDraft, setStatusDraft] = useState('');
	const [storyAudienceOpen, setStoryAudienceOpen] = useState(false);
	/* Saved audience per account until the accounts list is refetched. */
	const [storyAudienceSaved, setStoryAudienceSaved] = useState({});
	const [publishingStatus, setPublishingStatus] = useState(false);
	const [syncingStatuses, setSyncingStatuses] = useState(false);
	const [viewedStatusIds, setViewedStatusIds] = useState(() => new Set());
	const [newAccountName, setNewAccountName] = useState('');
	const [addingAccount, setAddingAccount] = useState(false);
	const [chatSearch, setChatSearch] = useState('');
	/** The search text the server last answered (its results are then shown as they are). */
	const [serverSearchQuery, setServerSearchQuery] = useState('');
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
	useEffect(() => {
		const onKey = event => {
			if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
			if (event.key !== 'k' && event.key !== 'K') return;
			const input = searchInputRef.current;
			if (!input || !input.offsetParent) return;
			event.preventDefault();
			input.focus();
			input.select();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);
	const [privacyBlur, setPrivacyBlur] = useState(() => readWhatsAppPrivacyBlur());
	const [conversationFilter, setConversationFilter] = useState(defaultWhatsAppConversationFilter);
	const [contactsPopupOpen, setContactsPopupOpen] = useState(false);
	const [archivedCount, setArchivedCount] = useState(0);
	/** People you are due to message (keep-in-touch tab badge). */
	const [keepInTouchDueCount, setKeepInTouchDueCount] = useState(0);
	const [archivedUnreadCount, setArchivedUnreadCount] = useState(0);
	const [pendingPreferenceActions, setPendingPreferenceActions] = useState(() => new Set());
	const [assignmentFilter, setAssignmentFilter] = useState('');
	const [searchingConversations, setSearchingConversations] = useState(false);
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
	const [inChatSearchActiveIndex, setInChatSearchActiveIndex] = useState(-1);
	const [inChatSearchBusy, setInChatSearchBusy] = useState(false);
	const inChatSearchReqRef = useRef(0);
	const inChatSearchTimerRef = useRef(0);
	const [editingMessage, setEditingMessage] = useState(null);
	const [editDraft, setEditDraft] = useState('');
	const [uploadProgress, setUploadProgress] = useState(null);
	const [composerDragOver, setComposerDragOver] = useState(false);
	const tabLeaderRef = useRef(null);
	const presenceTypingTimerRef = useRef(null);
	const presencePausedTimerRef = useRef(null);

	const notifyPeerTyping = useCallback(() => {
		if (!conversationId || demo.settings.enabled || isDemoId(conversationId)) return;
		if (privacySettings.hideTypingIndicator) return;
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
	}, [conversationId, demo.settings.enabled, privacySettings.hideTypingIndicator]);

	useEffect(
		() => () => {
			if (presenceTypingTimerRef.current) window.clearTimeout(presenceTypingTimerRef.current);
			if (presencePausedTimerRef.current) window.clearTimeout(presencePausedTimerRef.current);
		},
		[],
	);

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
	const composerStackObserverRef = useRef(null);
	/** Publishes the real composer height so the thread pads exactly that much on mobile,
	 * where the composer floats over the messages. */
	const measureComposerStack = useCallback(node => {
		composerStackObserverRef.current?.disconnect();
		composerStackObserverRef.current = null;
		if (!node || typeof ResizeObserver === 'undefined') return;
		const pane = node.closest('.wa-chat-thread-pane');
		if (!pane) return;
		const publish = () => {
			pane.style.setProperty('--wa-composer-stack-h', `${Math.ceil(node.offsetHeight)}px`);
		};
		publish();
		const observer = new ResizeObserver(publish);
		observer.observe(node);
		composerStackObserverRef.current = observer;
	}, []);
	const messageBoxRef = useRef(null);
	const longPressTimerRef = useRef(null);
	const longPressOpenedAtRef = useRef(0);
	const swipeReplyRef = useRef(null);
	const swipeConsumedAtRef = useRef(0);
	/** Phone tap quick-action bar: `{ messageId, rect, mine }`. */
	const [quickActions, setQuickActions] = useState(null);
	const [openSwipeRowId, setOpenSwipeRowId] = useState(null);
	const phoneViewport = useSyncExternalStore(subscribePhoneViewport, readPhoneViewport, () => false);
	const longPressOriginRef = useRef(null);
	const conversationLongPressTimerRef = useRef(null);
	const conversationLongPressOriginRef = useRef(null);
	const suppressConversationClickRef = useRef(false);
	const lastAutoScrolledMessageRef = useRef(null);
	// Opens at the newest message by default. Starting at `false` meant any mount
	// that already had a conversationId (restored chat, remounted split pane)
	// skipped every bottom-pin path and rendered mid-thread.
	const pinThreadToBottomRef = useRef(true);
	const jumpToBottomInFlightRef = useRef(false);
	const lastThreadScrollTopRef = useRef(0);
	const userScrollingThreadRef = useRef(false);
	/** Last real input gesture on the thread (wheel / touch / key), not a programmatic scroll. */
	const lastThreadGestureAtRef = useRef(0);
	const userScrollIdleTimerRef = useRef(null);
	const threadSettledRef = useRef(true);
	const loadingMessagesRef = useRef(false);
	loadingMessagesRef.current = loadingMessages;
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
	// The socket effect mounts once, so it must not close over `locale` directly.
	const localeRef = useRef(locale);
	const conversationsRef = useRef([]);
	/** AI Memo Emails chat: 'chat' (the memos) or 'settings' (Email Memo configuration). */
	const [emailMemoView, setEmailMemoView] = useState('chat');
	const [memoSettingsMounted, setMemoSettingsMounted] = useState(false);
	const emailMemoSettingsOnOpenRef = useRef(false);
	const patchArchivedUnread = useCallback(delta => {
		const amount = Number(delta) || 0;
		if (!amount) return;
		setArchivedUnreadCount(current => {
			const next = Math.max(0, current + amount);
			const cachedAccountId = accountIdRef.current;
			const cached = cachedAccountId
				? conversationsCacheRef.current.get(cachedAccountId)
				: null;
			if (cachedAccountId && cached) {
				conversationsCacheRef.current.set(cachedAccountId, {
					...cached,
					archivedUnreadCount: next,
					cachedAt: Date.now(),
				});
			}
			return next;
		});
	}, []);
	const chatListScrollRef = useRef(null);
	const chatListScrollPositionsRef = useRef(new Map());
	const syncingInboxRef = useRef(false);
	const previousAccountIdRef = useRef(null);
	const conversationIdRef = useRef(null);
	const secondaryConversationIdRef = useRef(null);
	const sharingSourceConversationIdRef = useRef(null);

	const openShareMessagesModal = useCallback(
		ids => {
			const list = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean))];
			if (!list.length) {
				toast.error(
					locale === 'ar' ? 'حدد رسائل أولًا' : 'Select messages first',
				);
				return;
			}
			sharingSourceConversationIdRef.current =
				conversationIdRef.current || conversationId || null;
			setForwardingMessage(null);
			setSharingMessageIds(list);
		},
		[conversationId, locale],
	);
	const activeTabRef = useRef(activeTab);
	activeTabRef.current = activeTab;
	// Which conversation the rendered `messages` array belongs to. Never read
	// conversationIdRef inside a setState updater for this — updaters run during
	// the next render, by which point the ref already points at the new chat.
	const messagesOwnerRef = useRef(null);
	const watchedConversationRef = useRef(null);
	const watchedSecondaryConversationRef = useRef(null);
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
	/**
	 * The restore effect owns the pending anchor, but its cleanup can cancel the
	 * expiry timer on a re-render that then early-returns, orphaning the lock and
	 * silently disabling both auto-scroll and the jump button. Treat anything past
	 * its deadline as released, whoever asks.
	 */
	const pendingOlderRestore = useCallback(() => {
		const pending = olderScrollRestoreRef.current;
		if (!pending) return null;
		// `lockedAt` is wall-clock; `startedAt` is a performance timestamp owned by
		// the restore effect and is not comparable to Date.now().
		const lockedAt = Number(pending.lockedAt || 0);
		if (lockedAt && Date.now() - lockedAt > THREAD_RESTORE_MAX_MS * 2) {
			olderScrollRestoreRef.current = null;
			return null;
		}
		return pending;
	}, []);
	const isThreadScrollLocked = useCallback(
		() => loadingOlderRef.current || Boolean(pendingOlderRestore()),
		[pendingOlderRestore],
	);
	const suppressOlderLoadUntilRef = useRef(0);
	const syncCooldownUntilRef = useRef(0);

	const scrollMessagesToBottom = useCallback((behavior = 'auto', { force = false } = {}) => {
		const applyOnce = () => {
			if (loadingOlderRef.current || pendingOlderRestore()) return false;
			const opening = !threadSettledRef.current || loadingMessagesRef.current;
			const forceScroll = force || opening;
			if (!pinThreadToBottomRef.current && !forceScroll) return false;
			const box = messageBoxRef.current;
			if (!box) return false;
			if (
				!forceScroll &&
				threadSettledRef.current &&
				!isThreadPinnedToBottom(box) &&
				!isThreadNearBottom(box)
			) {
				pinThreadToBottomRef.current = false;
				return false;
			}
			if (forceScroll) pinThreadToBottomRef.current = true;
			// Native scroll only: the virtualizer renders the rows it scrolls to.
			messageVirtualRef.current?.cancelScrollReconcile?.();
			const target = Math.max(
				Number(box.scrollHeight) || 0,
				Number(messageVirtualRef.current?.totalSize) || 0,
			);
			if (behavior === 'smooth') {
				waScrollTo(
					box,
					{ top: target, behavior: 'smooth' },
					'scrollMessagesToBottom',
					'scrollMessagesToBottom:smooth',
					{ pin: true, force: forceScroll },
				);
			} else {
				waScrollApply(
					box,
					target,
					'scrollMessagesToBottom',
					'scrollMessagesToBottom:auto',
					{ pin: true, force: forceScroll },
				);
			}
			setShowJumpToBottom(shouldShowJumpToBottom(box));
			return isThreadPinnedToBottom(box);
		};
		requestAnimationFrame(() => {
			if (applyOnce()) return;
			requestAnimationFrame(() => {
				if (applyOnce()) return;
				// Content height often lands after the first paint (media / virtualizer).
				window.setTimeout(() => {
					applyOnce();
				}, 50);
			});
		});
	}, [pendingOlderRestore]);

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
	const storyViewerHistoryRef = useRef(false);
	const statusRefreshInFlightRef = useRef(null);
	const groupRequestId = useRef(0);
	const conversationsRequestId = useRef(0);
	const conversationSearchRequestId = useRef(0);
	const tabRequestId = useRef(0);
	/** Tabs whose data is already on screen for an account: revisits refresh in the
	 *  background instead of swapping the pane for a spinner. */
	const loadedTabKeysRef = useRef(new Set());

	const selectedAccountForBanner = accounts.find(item => item.id === accountId) || null;
	// Only for an account that was linked before: a new one waiting for its first scan is normal.
	const connectionProblem = (() => {
		const account = selectedAccountForBanner;
		if (!account || !(account.lastConnectedAt || account.phoneNumber)) return null;
		if (account.status === 'error' || account.status === 'qr_pending') return 'relink';
		if (account.status === 'disconnected') return 'offline';
		return null;
	})();
	const selectedAccount = useMemo(
		() => accounts.find(item => item.id === accountId) || null,
		[accounts, accountId],
	);
	useEffect(() => {
		const fromAccount = selectedAccount?.privacySettings;
		if (!fromAccount || typeof fromAccount !== 'object') return;
		setPrivacySettings(current => ({
			hideStatusViewReceipts:
				typeof fromAccount.hideStatusViewReceipts === 'boolean'
					? fromAccount.hideStatusViewReceipts
					: current.hideStatusViewReceipts,
			readReceiptMode: fromAccount.readReceiptMode || current.readReceiptMode,
			holdDeliveryReceipts:
				typeof fromAccount.holdDeliveryReceipts === 'boolean'
					? fromAccount.holdDeliveryReceipts
					: current.holdDeliveryReceipts,
			hideTypingIndicator:
				typeof fromAccount.hideTypingIndicator === 'boolean'
					? fromAccount.hideTypingIndicator
					: current.hideTypingIndicator,
		}));
	}, [selectedAccount?.id, selectedAccount?.privacySettings]);
	const isAccountConnected = selectedAccount?.status === 'connected';
	// Presentation mode: only the generated sample profile may reach the screen.
	const showcaseOnly = Boolean(
		demo.settings.enabled && demo.settings.featureFlags?.showcaseOnly === true,
	);
	const pageLock = useWhatsAppPageLock({ active: !showcaseOnly });
	const pageLockText = pageLockCopy(locale);
	const railAvatarUrl = useMemo(() => {
		if (showcaseOnly) return '';
		const fromAccount = String(selectedAccount?.avatarUrl || '').trim();
		if (fromAccount) return fromAccount;
		try {
			const user = JSON.parse(localStorage.getItem('user') || 'null');
			return String(
				user?.avatar ||
					user?.avatarUrl ||
					user?.image ||
					user?.photo ||
					user?.profileImage ||
					user?.profilePicture ||
					'',
			).trim();
		} catch {
			return '';
		}
	}, [selectedAccount?.avatarUrl, currentUserId, showcaseOnly]);

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
	// The "now playing" bar names the chat a voice note came from.
	const selectedConversationTitle = selectedConversation ? conversationTitle(selectedConversation) : '';
	useEffect(() => {
		setVoiceDockContext({ conversationId, title: selectedConversationTitle });
	}, [conversationId, selectedConversationTitle]);
	const privacyBlurChatIds = useMemo(
		() =>
			privacyBlur.enabled && privacyBlur.selectedOnly
				? new Set(privacyBlur.chatIds)
				: null,
		[privacyBlur.enabled, privacyBlur.selectedOnly, privacyBlur.chatIds],
	);
	const privacyBlurPickerChats = useMemo(
		() =>
			privacyBlur.selectedOnly
				? effectiveConversations.map(item => ({
						id: item.id,
						title: conversationTitle(item),
						subtitle:
							item.type === 'group'
								? ''
								: String(item.contact?.phoneNumber || '').trim(),
					}))
				: [],
		[effectiveConversations, privacyBlur.selectedOnly],
	);
	const selectedChatPrivacyBlurred = isWhatsAppChatPrivacyBlurred(privacyBlur, conversationId);
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
				featureFlags: demo.settings.featureFlags,
			}),
		[
			conversationMessages,
			selectedConversation,
			demo.data,
			demo.runtime,
			demo.settings.enabled,
			demo.settings.featureFlags,
		],
	);
	const effectiveMessages = useMemo(() => {
		if (!showcaseOnly && activeMessageGroup && Array.isArray(groupViewMessages)) return groupViewMessages;
		return baseEffectiveMessages;
	}, [activeMessageGroup, groupViewMessages, baseEffectiveMessages, showcaseOnly]);
	const mentionDirectoryRef = useRef(null);
	const mentionDirectory = useMemo(() => {
		const next = buildWhatsAppMentionDirectory({
			conversations: effectiveConversations,
			messages: effectiveMessages,
			participants: selectedConversation?.group?.participants || [],
		});
		// Keep the previous map when nothing in it changed, so thread rows that draw
		// mentions are not rebuilt on every presence or unread update.
		if (sameMentionDirectory(mentionDirectoryRef.current, next)) return mentionDirectoryRef.current;
		mentionDirectoryRef.current = next;
		return next;
	}, [effectiveConversations, effectiveMessages, selectedConversation]);
	const selectedIsGroupChat =
		selectedConversation?.type === 'group' ||
		String(selectedConversation?.providerChatId || '').endsWith('@g.us');
	const composerMentionCandidates = useMemo(
		() =>
			selectedIsGroupChat && !demo.settings.enabled
				? buildComposerMentionCandidates({
						participants: selectedConversation?.group?.participants || [],
						directory: mentionDirectory,
						selfPhone: selectedAccount?.phoneNumber,
					})
				: null,
		[
			selectedIsGroupChat,
			demo.settings.enabled,
			selectedConversation?.group?.participants,
			mentionDirectory,
			selectedAccount?.phoneNumber,
		],
	);
	const messageInfoTargetRef = useRef(null);
	const messageInfoRefreshTimerRef = useRef(null);
	const refreshOpenMessageInfoRef = useRef(null);
	useEffect(() => {
		if (!messageInfo) messageInfoTargetRef.current = null;
	}, [messageInfo]);
	useEffect(
		() => () => {
			if (messageInfoRefreshTimerRef.current) window.clearTimeout(messageInfoRefreshTimerRef.current);
		},
		[],
	);
	const [mentionMembersLoading, setMentionMembersLoading] = useState(false);
	const ensureMentionMembersRef = useRef(null);
	const mentionMembersLoadedRef = useRef(new Set());
	const handleComposerMentionOpen = useCallback(() => {
		void ensureMentionMembersRef.current?.();
	}, []);
	const resolveReactor = useCallback(
		reaction => {
			const actorKey = typeof reaction === 'string' ? reaction : reaction?.actorKey;
			const ar = locale === 'ar';
			if (actorKey === 'me') {
				return {
					name: ar ? 'إنت' : 'You',
					sub: '',
					avatar: railAvatarUrl || '',
				};
			}
			const raw = String(actorKey || '');
			const isLid = /@lid$/i.test(raw);
			// Drop the device suffix (2010…:12@s.whatsapp.net) before matching.
			const digits = whatsAppIdDigits(raw.split('@')[0].split(':')[0]);
			const hit = mentionDirectory instanceof Map ? mentionDirectory.get(digits) : null;
			const isGroupChat =
				selectedConversation?.type === 'group' ||
				String(selectedConversation?.providerChatId || '').endsWith('@g.us');
			// In a one-to-one chat the only other person who can react is the contact.
			let name = String(reaction?.actorName || hit?.name || '').trim();
			if (!name && !isGroupChat && selectedConversation) name = conversationTitle(selectedConversation);
			const phoneDigits =
				String(reaction?.actorPhone || hit?.phone || '').replace(/\D/g, '') || (isLid ? '' : digits);
			const phone = phoneDigits ? formatWhatsAppPhone(phoneDigits) : '';
			const avatar =
				reaction?.actorAvatarUrl ||
				inboxAvatarForWaId(effectiveConversations, raw) ||
				(!isGroupChat && selectedConversation ? conversationAvatarUrl(selectedConversation) : '');
			return {
				name: name || phone || (ar ? 'جهة غير معروفة' : 'Unknown contact'),
				sub: name && phone && phone !== name ? phone : '',
				avatar,
			};
		},
		[effectiveConversations, locale, mentionDirectory, railAvatarUrl, selectedConversation],
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
	/** Lets task cards name the client they belong to instead of a bare conversation id. */
	const boardConversationLookup = useMemo(() => {
		const lookup = new Map();
		for (const item of conversations || []) {
			if (!item?.id) continue;
			lookup.set(String(item.id), {
				title: conversationTitle(item),
				avatarUrl: conversationAvatarUrl(item),
				isGroup: item.type === 'group',
			});
		}
		return lookup;
	}, [conversations]);
	const seesWholeAccountRef = useRef(false);
	// Who is looking: replies a teammate sent are labelled with their name, yours are not.
	const [viewerUserId] = useState(() => {
		if (typeof window === 'undefined') return '';
		try {
			return String(JSON.parse(window.localStorage.getItem('user') || 'null')?.id || '');
		} catch {
			return '';
		}
	});
	const currentAccess = selectedAccount?.currentAccess || {};
	const whatsappNotificationsEnabled = currentAccess.notificationsEnabled !== false;
	whatsappNotificationsEnabledRef.current = whatsappNotificationsEnabled && !showcaseOnly;
	const canUseWhatsApp = Boolean(currentAccess.canUse);
	// The chat narrows while the info panel is open (wa-desktop.css), without :has() on the shell.
	const groupInfoOverlayRef = useCallback(node => {
		document.querySelector('.wa-web-desktop')?.toggleAttribute('data-gi-open', Boolean(node));
	}, []);
	const isDesktopLayout = useDesktopLayout();
	const canManageWhatsApp = Boolean(currentAccess.canManage);
	const canAssignWhatsApp = Boolean(currentAccess.canAssign);
	// Same rule as the server: the owner (full access) and staff who manage or assign see the
	// whole account; everyone else only their assigned chats, so no stories for them.
	const seesWholeAccount = canManageWhatsApp || canAssignWhatsApp;
	seesWholeAccountRef.current = seesWholeAccount;
	const [agentRowStates, setAgentRowStates] = useState(() => new Map());
	const agentAccountId = !showcaseOnly && !demo.settings.enabled ? selectedAccount?.id || '' : '';
	useEffect(() => {
		setAgentRowStates(new Map());
		if (!agentAccountId) return undefined;
		const controller = new AbortController();
		whatsappAiAgentApi
			.listConversationStates(agentAccountId, controller.signal)
			.then(result => {
				if (!result?.settings?.enabled) return;
				setAgentRowStates(new Map((result.conversations || []).map(state => [state.conversationId, state])));
			})
			.catch(() => {
				/* badges are optional */
			});
		return () => controller.abort();
	}, [agentAccountId]);
	useEffect(() => {
		if (!agentAccountId) return undefined;
		const onState = event => {
			const next = event.detail;
			if (!next?.conversationId) return;
			setAgentRowStates(current => {
				const map = new Map(current);
				map.set(next.conversationId, { ...(current.get(next.conversationId) || {}), ...next });
				return map;
			});
		};
		window.addEventListener(AI_AGENT_STATE_EVENT, onState);
		return () => window.removeEventListener(AI_AGENT_STATE_EVENT, onState);
	}, [agentAccountId]);
	const canComposeInConversation =
		(canUseWhatsApp || demo.settings.enabled) &&
		canRouteDemoWrite(demo.settings.enabled, selectedConversation) &&
		(!demo.settings.enabled || demo.settings.featureFlags.useFakeMessages !== false) &&
		!isEmailMemoAiConversation(selectedConversation);
	const fakeChatAllowed = canShowFakeChat(resolveStoredWhatsAppUserEmail());
	const viewingChannels = isChannelsInboxFilter(conversationFilter);
	const availableTabs = useMemo(
		() =>
			tabs.filter(([key]) => {
				if (showcaseOnly && !SHOWCASE_TABS.has(key)) return false;
				if (key === 'online') return false;
				if (key === 'statuses') return seesWholeAccount;
				if (key === 'typing') return seesWholeAccount;
				if (key === 'settings') return canManageWhatsApp || isAdmin;
				if (key === 'agent') return canManageWhatsApp || isAdmin;
				// The server only serves reports to people who manage or assign the account.
				if (key === 'reports') return seesWholeAccount;
				if (key === 'board') return canManageWhatsApp || canAssignWhatsApp || isAdmin;
				if (key === 'fakeChat') return fakeChatAllowed;
				if (key === 'documents') return isAdmin;
				return true;
			}),
		[canAssignWhatsApp, canManageWhatsApp, canUseWhatsApp, fakeChatAllowed, isAdmin, showcaseOnly, seesWholeAccount],
	);
	const [quickSwitchOpen, setQuickSwitchOpen] = useState(false);
	useEffect(() => {
		// Ctrl + Space (and Win/Cmd + Space when the system lets it through), or Ctrl + Shift + K.
		// Physical keys, so they work on the Arabic layout too. Ctrl + K stays the chat search.
		const onKey = event => {
			if (event.altKey || event.repeat) return;
			const space = event.code === 'Space' && (event.ctrlKey || event.metaKey) && !event.shiftKey;
			const shiftK = event.code === 'KeyK' && (event.ctrlKey || event.metaKey) && event.shiftKey;
			if (!space && !shiftK) return;
			event.preventDefault();
			setQuickSwitchOpen(open => !open);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);
	// "I have WhatsApp open": ping the server every 10 s while this page is on screen. The server
	// counts a user online only within 15 s of a ping; nothing pinged before, so the team list
	// (and the staff session time in Reports) went stale. Admins also re-read who is online,
	// since the server only pushes the list when someone connects or leaves.
	useEffect(() => {
		const tick = () => {
			const socket = socketRef.current;
			if (!socket?.connected) return;
			if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
				socket.emit('whatsapp:presence:ping');
			}
			if (isAdmin) {
				socket.emit('whatsapp:presence:list', null, response => {
					if (Array.isArray(response?.items)) setStaffOnline(prev => keepStaffListIfSame(prev, response.items));
				});
			}
		};
		tick();
		const timer = window.setInterval(tick, 10_000);
		document.addEventListener('visibilitychange', tick);
		return () => {
			window.clearInterval(timer);
			document.removeEventListener('visibilitychange', tick);
		};
	}, [isAdmin]);
	// Remember what gets opened from anywhere (rail, menus, switcher) so the switcher lists the
	// most-used first. Chats is the home screen, so it is not counted as a choice.
	useEffect(() => {
		if (activeTab && activeTab !== 'chats') recordQuickSwitchUse(activeTab);
	}, [activeTab]);
	useEffect(() => {
		if (autoForwardOpen) recordQuickSwitchUse('autoForward');
	}, [autoForwardOpen]);
	useEffect(() => {
		if (privacyBlurMenuOpen) recordQuickSwitchUse('hideNames');
	}, [privacyBlurMenuOpen]);
	useEffect(() => {
		if (contactsPopupOpen) recordQuickSwitchUse('contacts');
	}, [contactsPopupOpen]);
	// A remembered tab may be the removed Online tab, or Stories for someone who no longer sees
	// them; wait for the account's access before deciding, so the owner is never bounced.
	useEffect(() => {
		if (activeTab === 'online') {
			setActiveTab('chats');
			return;
		}
		if ((activeTab === 'statuses' || activeTab === 'typing') && selectedAccount?.currentAccess && !seesWholeAccount) {
			setActiveTab('chats');
		}
	}, [activeTab, selectedAccount?.currentAccess, seesWholeAccount]);
	useEffect(() => {
		if (!showcaseOnly) return;
		if (activeTab && !SHOWCASE_TABS.has(activeTab)) setActiveTab('chats');
		if (conversationId && !isDemoId(conversationId)) setConversationId(null);
		if (secondaryConversationId && !isDemoId(secondaryConversationId)) setSecondaryConversationId(null);
		if (activeMessageGroup) setActiveMessageGroup(null);
	}, [showcaseOnly, activeTab, conversationId, secondaryConversationId, activeMessageGroup]);
	useEffect(() => {
		if (activeTab === 'channels') {
			setConversationFilter('channels');
			setActiveTab('chats');
			return;
		}
		if (activeTab === 'contacts') {
			setContactsPopupOpen(true);
			setActiveTab('chats');
			return;
		}
		if (activeTab === 'fakeChat' && !fakeChatAllowed) setActiveTab('chats');
	}, [activeTab, fakeChatAllowed]);
	const unreadConversationCount = useMemo(
		() =>
			effectiveConversations.reduce((total, conversation) => {
				if (isChannelConversation(conversation) || conversation.isArchived) return total;
				return total + conversationUnreadCount(conversation);
			}, 0),
		[effectiveConversations],
	);
	/* Tab title + favicon bubble follow the live inbox count (socket-driven), not a 2-min poll. */
	useEffect(() => {
		syncAppBadge(unreadConversationCount, 'whatsapp-workspace');
	}, [unreadConversationCount]);
	useEffect(() => () => clearAppBadgeSource('whatsapp-workspace'), []);
	const unreadChannelCount = useMemo(
		() =>
			effectiveConversations.reduce((total, conversation) => {
				if (!isChannelConversation(conversation)) return total;
				return total + conversationUnreadCount(conversation);
			}, 0),
		[effectiveConversations],
	);
	const chatImages = useMemo(
		() => buildChatViewerImages(effectiveMessages, registeredChatImages),
		[effectiveMessages, registeredChatImages],
	);
	const messageRows = useMemo(
		() => groupConsecutiveImageMessages(effectiveMessages.filter(isRenderableWhatsAppMessage)),
		[effectiveMessages],
	);
	const messageRowsRef = useRef(messageRows);
	messageRowsRef.current = messageRows;
	// Unread count captured when the chat opens (before mark-as-read clears it), so the
	// divider stays where the unread run started for as long as the chat is open.
	const [unreadAtOpen, setUnreadAtOpen] = useState(null);
	useLayoutEffect(() => {
		if (!conversationId) {
			setUnreadAtOpen(null);
			return;
		}
		const meta = conversationsRef.current.find(item => item.id === conversationId);
		const count = conversationUnreadCount(meta);
		setUnreadAtOpen(count > 0 ? { conversationId, count } : null);
	}, [conversationId]);
	const unreadDividerMessageId = useMemo(() => {
		if (!unreadAtOpen || unreadAtOpen.conversationId !== conversationId) return null;
		return firstUnreadMessageId(
			effectiveMessages.filter(isRenderableWhatsAppMessage),
			unreadAtOpen.count,
		);
	}, [conversationId, effectiveMessages, unreadAtOpen]);
	const unreadDividerIdRef = useRef(unreadDividerMessageId);
	unreadDividerIdRef.current = unreadDividerMessageId;
	const quickActionsMessage = useMemo(
		() =>
			quickActions?.messageId
				? effectiveMessages.find(item => item?.id === quickActions.messageId) || null
				: null,
		[effectiveMessages, quickActions],
	);
	const closeQuickActions = useCallback(() => setQuickActions(null), []);
	useEffect(() => {
		setQuickActions(null);
	}, [conversationId]);
	const threadVirtualLatchRef = useRef({ conversationId: null, enabled: false, opening: false });
	if (threadVirtualLatchRef.current.conversationId !== conversationId) {
		// `opening` lasts until the thread settles at the bottom (behind the loader).
		threadVirtualLatchRef.current = { conversationId, enabled: false, opening: Boolean(conversationId) };
	}
	if (messageRows.length >= 32) {
		threadVirtualLatchRef.current.enabled = true;
	}
	const virtualizeMessages = threadVirtualLatchRef.current.enabled;
	const latestThreadMessageId = effectiveMessages[effectiveMessages.length - 1]?.id || null;
	const shouldAdjustScrollOnRowResize = useCallback(
		(item, _delta, virtualizer) => {
			// An older-messages restore is mid-flight with its own absolute anchor;
			// a second adjustment here would double-count the same delta.
			if (isThreadScrollLocked()) return false;
			const box = messageBoxRef.current;
			if (!box) return false;
			// `scrollAdjustments` holds corrections already queued but not yet flushed to
			// the DOM, so the virtualizer's own offset is the only accurate reference.
			const scrollOffset =
				(typeof virtualizer?.getScrollOffset === 'function'
					? Number(virtualizer.getScrollOffset())
					: Number(box.scrollTop)) + (Number(virtualizer?.scrollAdjustments) || 0);
			return shouldCompensateRowResize({
				rowStart: item?.start,
				rowSize: item?.size,
				scrollOffset,
				// Estimates are only trustworthy after a row has been measured once.
				firstMeasure: !virtualizer?.itemSizeCache?.has?.(item?.key),
			});
		},
		[isThreadScrollLocked],
	);
	// Row estimates calibrated to the rendered thread (see wa-thread-layout.js). Rows above
	// the viewport that were never measured get corrected with a programmatic scrollTo the
	// first time they render; accurate estimates keep those corrections near zero, so
	// scrolling up no longer gets pulled back down.
	const threadLayoutRef = useRef(null);
	const rowEstimateCacheRef = useRef(new Map());
	const threadIsGroupChatRef = useRef(false);
	threadIsGroupChatRef.current =
		selectedConversation?.type === 'group' ||
		String(selectedConversation?.providerChatId || '').endsWith('@g.us');
	const estimateThreadRow = useCallback((rows, index) => {
		const row = rows?.[index];
		const layout = threadLayoutRef.current;
		if (!row || !layout) return estimateMessageRowSize(row);
		const edge = (item, fromEnd) =>
			item
				? item.kind === 'image-gallery'
					? item.messages?.[fromEnd ? item.messages.length - 1 : 0]
					: item.message
				: null;
		const first = edge(row, false);
		const last = edge(row, true);
		const previous = edge(rows[index - 1], true);
		const next = edge(rows[index + 1], false);
		const isGroupChat = threadIsGroupChatRef.current;
		const dayOf = message => threadDayKey(message?.providerTimestamp || message?.created_at);
		const startsNewDay = !previous || dayOf(first) !== dayOf(previous);
		const precedesSame =
			Boolean(next) && messagesFormBubbleCluster(last, next, { isGroupChat });
		const showsSenderName =
			isGroupChat &&
			first?.direction !== 'outbound' &&
			!(previous && messagesFormBubbleCluster(previous, first, { isGroupChat }));
		const dividerId = unreadDividerIdRef.current;
		const hasUnreadDivider = Boolean(
			dividerId &&
				(row.kind === 'image-gallery'
					? row.messages?.some(item => item?.id === dividerId)
					: row.message?.id === dividerId),
		);
		const signature = [
			layout.version,
			startsNewDay ? 1 : 0,
			precedesSame ? 1 : 0,
			showsSenderName ? 1 : 0,
			String(first?.text || '').length,
			(first?.reactions || []).length,
			first?.replyTo ? 1 : 0,
			hasUnreadDivider ? 1 : 0,
			row.kind === 'image-gallery' ? row.attachments?.length || 0 : 0,
		].join('|');
		const cache = rowEstimateCacheRef.current;
		const key = messageRowKey(row);
		const hit = cache.get(key);
		if (hit && hit.signature === signature) return hit.size;
		const size =
			(estimateTextRowSize(row, layout, { startsNewDay, precedesSame, showsSenderName }) ??
				estimateMessageRowSize(row) + (startsNewDay ? THREAD_ROW_EXTRAS.dateSeparator : 0)) +
			(hasUnreadDivider ? UNREAD_DIVIDER_HEIGHT : 0);
		if (cache.size > 6000) cache.clear();
		cache.set(key, { signature, size });
		return size;
	}, []);
	const showEmailMemoSettings =
		emailMemoView === 'settings' && isEmailMemoAiConversation(selectedConversation);
	const isMemoChat = isEmailMemoAiConversation(selectedConversation);
	// Each chat opens on its messages; the Emails tab asks for the settings view instead.
	useEffect(() => {
		const next = emailMemoSettingsOnOpenRef.current ? 'settings' : 'chat';
		emailMemoSettingsOnOpenRef.current = false;
		setEmailMemoView(next);
		setMemoSettingsMounted(next === 'settings');
	}, [conversationId]);
	useEffect(() => {
		if (!isMemoChat) return undefined;
		void import('../email-memo/EmailMemoWorkspace');
		return undefined;
	}, [isMemoChat]);
	const threadHasRows = messageRows.length > 0;
	useLayoutEffect(() => {
		const box = messageBoxRef.current;
		if (!box || !threadHasRows) return undefined;
		const update = () => {
			threadLayoutRef.current = readThreadLayout(box, threadLayoutRef.current);
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
		// Re-read once the thread settles: while it is still opening the rows can lay out
		// differently (fonts, settling styles), and an early read mis-sized every estimate.
	}, [conversationId, threadHasRows, threadSettled]);
	const messageVirtual = useWaVirtualRows({
		count: messageRows.length,
		scrollRef: messageBoxRef,
		estimateSize: index => estimateThreadRow(messageRowsRef.current, index),
		overscan: 10,
		enabled: virtualizeMessages,
		getItemKey: index => messageRowKey(messageRowsRef.current[index]),
		shouldAdjustScrollPositionOnItemSizeChange: shouldAdjustScrollOnRowResize,
		// While a chat opens, render the newest rows first instead of the top of the
		// thread (scrollTop is still 0 until the settle loop pins it to the bottom).
		anchorToEnd: () => threadVirtualLatchRef.current.opening && pinThreadToBottomRef.current,
		// Scrolling re-renders only the rows host. The workspace still re-renders on range and
		// size changes while a chat opens or an older-messages scroll anchor is being restored,
		// because those effects read totalSize during render.
		renderOwner: () =>
			Boolean(olderScrollRestoreRef.current) ||
			!threadSettledRef.current ||
			Boolean(threadVirtualLatchRef.current.opening),
	});
	const messageVirtualRef = useRef(messageVirtual);
	messageVirtualRef.current = messageVirtual;

	const jumpToBottomRunRef = useRef({ token: 0, frame: 0, timer: 0 });
	const cancelJumpToBottomRun = useCallback(() => {
		const run = jumpToBottomRunRef.current;
		run.token += 1;
		if (run.frame) cancelAnimationFrame(run.frame);
		if (run.timer) window.clearTimeout(run.timer);
		run.frame = 0;
		run.timer = 0;
	}, []);
	useEffect(() => cancelJumpToBottomRun, [cancelJumpToBottomRun]);

	const jumpMessagesToBottom = useCallback(() => {
		const box = messageBoxRef.current;
		if (!box) return;
		// Repeated clicks must not stack parallel rAF loops and late timers.
		cancelJumpToBottomRun();
		const run = jumpToBottomRunRef.current;
		const runToken = run.token;
		const isCurrentRun = () => jumpToBottomRunRef.current.token === runToken;
		// An explicit user request always wins. Bailing out while an older-messages
		// restore was pending is what made the button silently do nothing, because
		// the pending anchor could outlive the effect that was supposed to clear it.
		olderScrollRestoreRef.current = null;
		suppressOlderLoadUntilRef.current = Date.now() + 900;

		pinThreadToBottomRef.current = true;
		userScrollingThreadRef.current = false;
		if (userScrollIdleTimerRef.current) {
			window.clearTimeout(userScrollIdleTimerRef.current);
			userScrollIdleTimerRef.current = null;
		}
		jumpToBottomInFlightRef.current = true;
		setShowJumpToBottom(false);

		const applyJump = (behavior = 'auto') => {
			const el = messageBoxRef.current;
			if (!el) return false;
			const smooth = behavior === 'smooth';
			messageVirtualRef.current?.cancelScrollReconcile?.();
			const target = Math.max(
				Number(el.scrollHeight) || 0,
				Number(messageVirtualRef.current?.totalSize) || 0,
			);
			if (smooth) {
				waScrollTo(
					el,
					{ top: target, behavior: 'smooth' },
					'jumpMessagesToBottom',
					'user-jump-to-bottom:smooth',
					{ pin: true, force: true, target },
				);
			} else {
				waScrollApply(
					el,
					target,
					'jumpMessagesToBottom',
					'user-jump-to-bottom:snap',
					{ pin: true, force: true, target },
				);
			}
			return isThreadPinnedToBottom(el);
		};

		const startLateCorrections = () => {
			if (!isCurrentRun()) return;
			jumpToBottomInFlightRef.current = false;
			const el = messageBoxRef.current;
			if (!el) return;
			pinThreadToBottomRef.current = true;
			setShowJumpToBottom(shouldShowJumpToBottom(el));
			// After smooth scroll, virtualizer/media may still grow the thread —
			// snap corrections keep the pin without interrupting the animation.
			let latePasses = 0;
			const latePass = () => {
				run.timer = 0;
				if (!isCurrentRun()) return;
				const node = messageBoxRef.current;
				if (!node || !pinThreadToBottomRef.current) return;
				if (userScrollingThreadRef.current) return;
				latePasses += 1;
				if (threadDistanceFromBottom(node) > 8) {
					jumpToBottomInFlightRef.current = true;
					applyJump('auto');
					jumpToBottomInFlightRef.current = false;
				}
				setShowJumpToBottom(shouldShowJumpToBottom(node));
				if (latePasses < 4) run.timer = window.setTimeout(latePass, 140 * latePasses);
			};
			run.timer = window.setTimeout(latePass, 120);
		};

		const distance = threadDistanceFromBottom(box);
		// Already near bottom — snap is fine and avoids a tiny pointless animation.
		if (distance <= 48) {
			applyJump('auto');
			startLateCorrections();
			return;
		}

		applyJump('smooth');

		const el = messageBoxRef.current;
		let settled = false;
		const settle = () => {
			if (settled || !isCurrentRun()) return;
			settled = true;
			if (run.timer) {
				window.clearTimeout(run.timer);
				run.timer = 0;
			}
			if (el) el.removeEventListener('scrollend', onScrollEnd);
			startLateCorrections();
		};
		const onScrollEnd = () => settle();
		if (el && typeof el.addEventListener === 'function') {
			el.addEventListener('scrollend', onScrollEnd, { once: true });
		}
		// Fallback when scrollend is unsupported or the smooth scroll is cancelled.
		run.timer = window.setTimeout(settle, 520);
	}, [cancelJumpToBottomRun]);

	// Built row bodies are kept across workspace renders and reused while the row, its
	// neighbours and everything a row draws from (threadRowDeps, set before the return) are
	// unchanged. Presence, typing, unread counts and dialogs re-render the workspace often;
	// without this every visible bubble was rebuilt each time. Handlers inside a row read the
	// latest workspace values through threadLiveRef, and functions handed to child components
	// go through threadStableFns, so a reused row never acts on stale state.
	const threadRowCacheRef = useRef(null);
	if (!threadRowCacheRef.current || threadRowCacheRef.current.conversationId !== conversationId) {
		threadRowCacheRef.current = { conversationId, map: new Map() };
	}
	const threadRowCache = threadRowCacheRef.current.map;
	if (threadRowCache.size > 800) threadRowCache.clear();
	const threadLiveRef = useRef(null);
	const threadStableFnsRef = useRef(null);
	if (!threadStableFnsRef.current) {
		threadStableFnsRef.current = {
			openConversationFromContact: (...args) => threadLiveRef.current.openConversationFromContact(...args),
			registerChatImage: (...args) => threadLiveRef.current.registerChatImage(...args),
			resolveReactor: (...args) => threadLiveRef.current.resolveReactor(...args),
		};
	}
	const threadStableFns = threadStableFnsRef.current;
	/** Rows to draw for the virtualizer's current items (all rows when not virtualised). */
	const visibleRowsFor = items =>
		virtualizeMessages
			? items
					.map(item => ({
						row: messageRows[item.index],
						rowIndex: item.index,
						start: item.start,
					}))
					.filter(item => item.row)
			: messageRows.map((row, rowIndex) => ({ row, rowIndex, start: null }));
	const registerChatImage = useCallback(
		(id, image) => {
			setRegisteredChatImages(current => {
				if (!image) {
					if (!current[id]) return current;
					const next = { ...current };
					delete next[id];
					return next;
				}
				if (current[id]?.url === image.url && current[id]?.previewUrl === image.previewUrl) {
					return current;
				}
				return { ...current, [id]: image };
			});
			// Tall media expands after the first bottom-pin — re-stick while opening.
			if (
				image &&
				pinThreadToBottomRef.current &&
				!loadingOlderRef.current &&
				!pendingOlderRestore()
			) {
				const box = messageBoxRef.current;
				if (
					box &&
					(!threadSettledRef.current || isThreadPinnedToBottom(box))
				) {
					scrollMessagesToBottom('auto');
				}
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
		setSharingTargetConversationId(null);
		sharingSourceConversationIdRef.current = null;
		setDeleteMessageTarget(null);
		setMessageInfo(null);
		// A running transcription keeps going across chats (it can be minimized to a top bar and
		// carries its own media). Only "copy selected messages" belongs to this chat's selection.
		if (transcriptionIntentRef.current === 'copy') {
			setTranscriptionSources(null);
			setTranscriptionIntent(null);
			pendingCopyMessagesRef.current = [];
		}
		setMessageTranscripts({});
	}, [conversationId]);

	// A chat-list menu belongs to the screen it was opened on.
	useEffect(() => {
		suppressConversationClickRef.current = false;
		setConversationActionTarget(null);
		setConversationActionAnchor(null);
	}, [conversationId, activeTab]);

	useEffect(() => {
		const ids = (conversationMessages || [])
			.filter(
				item =>
					isTranscriptVideoMessage(item) ||
					['audio', 'ptt', 'voice'].includes(String(item?.type || '').toLowerCase()) ||
					(Array.isArray(item?.attachments) &&
						item.attachments.some(att =>
							['audio', 'ptt', 'voice', 'video'].includes(String(att?.type || '').toLowerCase()),
						)),
			)
			.map(item => item?.id)
			.filter(Boolean);
		if (!ids.length) return;
		const loaded = getMessageTranscriptsForIds(ids);
		setMessageTranscripts(current => {
			const next = { ...loaded };
			// Keep any in-memory entries that localStorage also has / freshly saved this session.
			for (const [id, entry] of Object.entries(current || {})) {
				if (ids.includes(id) && entry?.text && !next[id]) next[id] = entry;
			}
			return next;
		});
	}, [conversationId, conversationMessages]);

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
	}, []);

	useEffect(() => {
		if (activeTab !== 'statuses') return undefined;
		const tick = () => {
			if (document.visibilityState === 'visible') setRelativeTimeNow(Date.now());
		};
		tick();
		const id = window.setInterval(tick, 60_000);
		document.addEventListener('visibilitychange', tick);
		return () => {
			window.clearInterval(id);
			document.removeEventListener('visibilitychange', tick);
		};
	}, [activeTab]);

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

	// The image viewer is portaled outside the thread, so it follows the open chat via a root class.
	useEffect(() => {
		const open =
			selectedChatPrivacyBlurred ||
			isWhatsAppChatPrivacyBlurred(privacyBlur, secondaryConversationId);
		document.documentElement.classList.toggle('wa-privacy-open-chat', open);
		return () => document.documentElement.classList.remove('wa-privacy-open-chat');
	}, [privacyBlur, selectedChatPrivacyBlurred, secondaryConversationId]);

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
		for (const status of statuses) {
			if (!status?.isOwn && !status?.senderWaId) continue;
			// One card per person: WhatsApp can deliver the same sender as a LID and as a phone JID.
			const phone = String(status.senderPhone || '').replace(/\D/g, '');
			const key = status.isOwn
				? 'own'
				: phone
					? `p:${phone}`
					: normalizeWhatsAppIdentity(status.senderWaId) || status.id;
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(status);
		}
		return [...map.values()]
			.map(items => {
				const senderWaId =
					items.find(item => item.senderWaId && !/@lid$/i.test(item.senderWaId))?.senderWaId ||
					items.find(item => item.senderWaId)?.senderWaId ||
					(items.some(item => item.isOwn) ? 'own' : items[0]?.id);
				const deduped = [];
				const seen = new Set();
				for (const item of [...items].sort(
					(a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
				)) {
					const storyKey = String(item.id || item.providerStatusId || '').trim();
					if (!storyKey || seen.has(storyKey)) continue;
					seen.add(storyKey);
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

	const groupedStatusHistory = useMemo(() => {
		const map = new Map();
		for (const status of statusHistory) {
			if (!status?.isOwn && !status?.senderWaId) continue;
			if (!isPlayableStoryItem(status)) continue;
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
					const storyKey = String(item.id || item.providerStatusId || '').trim();
					if (!storyKey || seen.has(storyKey)) continue;
					seen.add(storyKey);
					deduped.push(item);
				}
				const ordered = deduped;
				return {
					senderWaId,
					items: ordered,
					latest: ordered[ordered.length - 1] || items[0],
					isOwn: ordered.some(item => item.isOwn),
					isViewed: true,
					unviewedCount: 0,
					startIndex: 0,
					historyCount: ordered.length,
				};
			})
			.sort((a, b) => {
				const aTime = a.latest?.publishedAt ? new Date(a.latest.publishedAt).getTime() : 0;
				const bTime = b.latest?.publishedAt ? new Date(b.latest.publishedAt).getTime() : 0;
				return bTime - aTime;
			});
	}, [statusHistory]);

	groupedStatusesRef.current = groupedStatuses;
	groupedStatusHistoryRef.current = groupedStatusHistory;
	storyQueueRef.current = storyQueue;
	storyIndexRef.current = storyIndex;
	storyPeopleQueueRef.current = storyPeopleQueue;
	storyPeopleIndexRef.current = storyPeopleIndex;

	useEffect(() => {
		if (activeTab !== 'statuses') return;
		const debug = statusesCacheRef.current.get(accountId)?.debug;
		if (debug && typeof console !== 'undefined') {
			console.info('[wa-stories] render', {
				accountId,
				apiCount: statuses.length,
				groupCount: groupedStatuses.length,
				...debug,
			});
		}
	}, [activeTab, accountId, statuses.length, groupedStatuses.length]);

	const storiesBySender = useMemo(() => {
		const map = new Map();
		for (const story of groupedStatuses) {
			if (story.isOwn) continue;
			for (const item of story.items) {
				const key = normalizeWhatsAppIdentity(item.senderWaId);
				if (key) map.set(key, story);
				const phone = String(item.senderPhone || '').replace(/\D/g, '');
				if (phone) map.set(phone, story);
			}
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
				const key = normalizeWhatsAppIdentity(identity);
				const story =
					storiesBySender.get(key) || storiesBySender.get(String(key).replace(/\D/g, ''));
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
				let url;
				let type;
				if (isVideoStoryType(item.type)) {
					const streamed = await fetchStatusStreamUrl(accountId, item.id);
					url = streamed.url;
					type = 'video';
				} else {
					const blob = await fetchStatusMediaBlob(accountId, item.id);
					url = URL.createObjectURL(blob);
					type = String(blob.type || '').startsWith('video/') ? 'video' : 'image';
				}
				if (cancelled || accountIdRef.current !== accountId) {
					revokeStoryUrl(url);
					return;
				}
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
				revokeStoryUrl(entry?.url);
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
		// Keep in touch: every tracked person (archived too), most overdue first, as the server sent it.
		if (conversationFilter === KEEP_IN_TOUCH_FILTER && !chatSearch.trim()) {
			return effectiveConversations
				.filter(conversation => conversation.keepInTouch)
				.sort((a, b) => keepInTouchDueTime(a) - keepInTouchDueTime(b));
		}
		const archivedView = conversationFilter === 'archived';
		const chipFilter = WHATSAPP_INBOX_CHIP_FILTERS.has(conversationFilter)
			? conversationFilter
			: 'all';
		const scoped = effectiveConversations.filter(conversation => {
			if (isChannelsInboxFilter(conversationFilter) ? !isChannelConversation(conversation) : isChannelConversation(conversation)) {
				return false;
			}
			// Searching the whole inbox also shows archived chats, like WhatsApp.
			const searchingAll = Boolean(chatSearch.trim()) && !archivedView;
			if (!searchingAll && (archivedView ? !conversation.isArchived : conversation.isArchived)) {
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
		const sorted = sortConversationsByActivity(scoped);
		if (!chatSearch.trim()) return sorted;
		// The server already answered this exact search (it also matches saved/phonebook names
		// and the same person's other contact): trust it. Re-filtering by the displayed title
		// dropped chats it found by a name that is not the one shown.
		if (serverSearchQuery && serverSearchQuery === chatSearch.trim()) return sorted;
		const q = foldWhatsAppSearchText(chatSearch);
		if (!q) return sorted;
		const qDigits = chatSearch.replace(/\D/g, '');
		return sorted.filter(conversation => {
			const names = foldWhatsAppSearchText(
				[
					conversationTitle(conversation),
					conversation.contact?.name,
					conversation.contact?.phonebookName,
					conversation.contact?.localName,
					conversation.contact?.pushName,
				]
					.filter(Boolean)
					.join(' '),
			);
			const phone = String(
				conversation.phoneNumber ||
					conversation.contactPhone ||
					conversation.contact?.phoneNumber ||
					conversation.providerChatId ||
					'',
			).replace(/\D/g, '');
			const preview = foldWhatsAppSearchText(
				conversation.lastMessage?.text || conversation.lastMessagePreview || '',
			);
			return (
				names.includes(q) ||
				(qDigits.length >= 3 && phone.includes(qDigits)) ||
				preview.includes(q)
			);
		});
	}, [effectiveConversations, chatSearch, conversationFilter, serverSearchQuery]);

	const chatListVisible = isConversationWorkspaceTab(activeTab);
	const chatListScrollScope = `${accountId || ''}:${conversationFilter}:${chatSearch.trim()}:${assignmentFilter || ''}`;
	// Mobile hides the inbox while a chat is open; the rows re-read scroll when it returns.
	const chatListRowsVisible = chatListVisible && (isDesktopLayout || !conversationId);
	/*
	 * Restore the inbox scroll only when the list (re)appears or its scope changes (filter,
	 * search, account). It used to re-run on every list update: each incoming message moved the
	 * anchor chat to the top and the list jumped after it while the user was scrolling.
	 */
	const filteredConversationsRef = useRef(filteredConversations);
	filteredConversationsRef.current = filteredConversations;
	const chatListRestoreKey =
		chatListVisible && (isDesktopLayout || !conversationId) ? chatListScrollScope : null;
	useLayoutEffect(() => {
		if (!chatListRestoreKey) return undefined;
		const snapshot = chatListScrollPositionsRef.current.get(chatListRestoreKey);
		if (!snapshot) return undefined;
		const frame = requestAnimationFrame(() => {
			const node = chatListScrollRef.current;
			if (!node) return;
			const list = filteredConversationsRef.current;
			const nextIndex = snapshot.anchorId
				? list.findIndex(item => String(item.id) === snapshot.anchorId)
				: -1;
			const nextScrollTop =
				nextIndex >= 0
					? Math.max(0, nextIndex * 88 - snapshot.rowOffset)
					: snapshot.scrollTop;
			// The rows listen to the container's scroll event, so setting scrollTop is enough.
			if (Math.abs(node.scrollTop - nextScrollTop) > 1) node.scrollTop = nextScrollTop;
		});
		return () => cancelAnimationFrame(frame);
	}, [chatListRestoreKey]);

	const archivedChatsCount = useMemo(() => {
		const local = effectiveConversations.filter(conversation => {
			if (!conversation.isArchived) return false;
			return isChannelsInboxFilter(conversationFilter)
				? isChannelConversation(conversation)
				: !isChannelConversation(conversation);
		}).length;
		return Math.max(local, archivedCount);
	}, [effectiveConversations, conversationFilter, archivedCount]);

	const archivedInboxUnreadCount = useMemo(() => {
		const local = effectiveConversations.reduce((total, conversation) => {
			if (!conversation.isArchived) return total;
			const inThisInbox = isChannelsInboxFilter(conversationFilter)
				? isChannelConversation(conversation)
				: !isChannelConversation(conversation);
			if (!inThisInbox) return total;
			return total + conversationUnreadCount(conversation);
		}, 0);
		if (conversationFilter === 'archived') return local;
		return Math.max(local, archivedUnreadCount);
	}, [effectiveConversations, conversationFilter, archivedUnreadCount]);

	const loadAccounts = useCallback(async () => {
		const { data } = await api.get('/whatsapp/accounts');
		const list = Array.isArray(data) ? data : [];
		const deepLink = readWhatsAppDeepLink();
		const requestedAccount = list.find(item => item.id === deepLink.accountId);
		deepLink.accountId = null;
		if (deepLink.tab === 'accounts') {
			deepLink.tab = null;
			setActiveTab('accounts');
		}
		const storedAccountId = readStoredWhatsAppAccountId(currentUserId);
		const storedAccount = list.find(item => item.id === storedAccountId);
		setAccounts(list);
		const nextAccountId =
			requestedAccount?.id ||
			list.find(item => item.id === accountIdRef.current)?.id ||
			storedAccount?.id ||
			list[0]?.id ||
			null;
		setAccountId(current => {
			const currentStillExists = list.some(item => item.id === current);
			const resolved =
				requestedAccount?.id ||
				(currentStillExists ? current : null) ||
				storedAccount?.id ||
				list[0]?.id ||
				null;
			if (resolved) {
				if (requestedAccount || !currentStillExists || !storedAccount) {
					writeStoredWhatsAppAccountId(resolved, currentUserId);
				}
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

	/** Ends a contact's typing / recording everywhere it shows (chat row, header, Online tab). */
	const clearConversationTyping = useCallback(targetId => {
		const clearKey = `presence-ttl:${targetId}`;
		if (presenceTtlTimersRef.current[clearKey]) {
			window.clearTimeout(presenceTtlTimersRef.current[clearKey]);
			delete presenceTtlTimersRef.current[clearKey];
		}
		setConversations(current => {
			let changed = false;
			const next = current.map(item => {
				if (item.id !== targetId) return item;
				if (!item.isTyping && !item.typing && !item.presence?.typing && !item.presence?.recording) {
					return item;
				}
				changed = true;
				return {
					...item,
					isTyping: false,
					typing: false,
					presence: {
						...(item.presence || {}),
						typing: false,
						recording: false,
						typers: [],
						senderName: '',
						online: Boolean(item.presence?.online),
						state: item.presence?.online ? 'available' : 'unavailable',
						t: Date.now(),
					},
				};
			});
			return changed ? next : current;
		});
		setOnlineContacts(current => {
			const idx = current.findIndex(item => item.conversationId === targetId);
			if (idx < 0 || !(current[idx].typing || current[idx].recording)) return current;
			const next = [...current];
			next[idx] = {
				...next[idx],
				typing: false,
				recording: false,
				status: next[idx].online ? 'online' : 'offline',
				state: next[idx].online ? 'available' : 'unavailable',
			};
			return next;
		});
	}, []);

	/**
	 * Safety net only: WhatsApp sends `paused` when the customer stops. Composing is not re-sent
	 * every few seconds, so a short TTL hid live typing. Armed for every source of a typing state
	 * (socket event or snapshot), otherwise a missed `paused` left it on for good.
	 */
	const armTypingTtl = useCallback(
		targetId => {
			const clearKey = `presence-ttl:${targetId}`;
			if (presenceTtlTimersRef.current[clearKey]) {
				window.clearTimeout(presenceTtlTimersRef.current[clearKey]);
			}
			presenceTtlTimersRef.current[clearKey] = window.setTimeout(() => {
				delete presenceTtlTimersRef.current[clearKey];
				clearConversationTyping(targetId);
			}, TYPING_INDICATOR_TTL_MS);
		},
		[clearConversationTyping],
	);

	useEffect(
		() => () => {
			for (const timer of Object.values(presenceTtlTimersRef.current)) window.clearTimeout(timer);
			presenceTtlTimersRef.current = {};
		},
		[],
	);

	const applyOnlineContactsSnapshot = useCallback(
		payload => {
			const items = Array.isArray(payload?.items)
				? payload.items
				: Array.isArray(payload)
					? payload
					: [];
			const normalized = items
				.map(item => ({
					conversationId: String(item?.conversationId || item?.id || '').trim(),
					name: String(item?.name || item?.phoneNumber || '').trim() || 'Contact',
					phoneNumber: item?.phoneNumber ? String(item.phoneNumber) : null,
					avatarUrl: item?.avatarUrl ? String(item.avatarUrl) : null,
					state: String(item?.state || (item?.online ? 'available' : 'unavailable')),
					status: String(item?.status || (item?.online ? 'online' : 'offline')),
					typing: Boolean(item?.typing),
					recording: Boolean(item?.recording),
					online: Boolean(item?.online ?? item?.status === 'online'),
					lastSeen: Number(item?.lastSeen) || 0,
					updatedAt: Number(item?.updatedAt) || Date.now(),
				}))
				.filter(item => item.conversationId);
			setOnlineContacts(current => {
				if (
					current.length === normalized.length &&
					current.every((item, index) => {
						const next = normalized[index];
						return (
							item.conversationId === next.conversationId &&
							item.name === next.name &&
							item.phoneNumber === next.phoneNumber &&
							item.avatarUrl === next.avatarUrl &&
							item.state === next.state &&
							item.status === next.status &&
							item.online === next.online &&
							item.typing === next.typing &&
							item.recording === next.recording &&
							item.lastSeen === next.lastSeen
						);
					})
				) {
					return current;
				}
				return normalized;
			});
			// Keep inbox/header dots in sync with the account-scoped snapshot.
			const byId = new Map(normalized.map(item => [item.conversationId, item]));
			setConversations(current => {
				let changed = false;
				const next = current.map(item => {
					const live = byId.get(item.id);
					if (!live) {
						if (!item.presence?.online && !item.presence?.typing && !item.presence?.recording) {
							return item;
						}
						// Snapshot no longer lists this chat as live — clear only unconfirmed online.
						if (item.presence?.confirmedOffline) return item;
						changed = true;
						const cleared = {
							online: false,
							typing: false,
							recording: false,
							state: 'unknown',
							t: Date.now(),
						};
						const stampedLastSeen =
							resolvePresenceLastSeen(item.presence, cleared) || undefined;
						return {
							...item,
							isTyping: false,
							typing: false,
							presence: {
								...(item.presence || {}),
								...cleared,
								lastSeen: stampedLastSeen,
								// Soft drop from live list — not a confirmed WA unavailable.
								confirmedOffline: false,
							},
						};
					}
					const presence = {
						online: Boolean(live.online),
						typing: Boolean(live.typing),
						recording: Boolean(live.recording),
						state: live.state,
						t: live.updatedAt || Date.now(),
						senderName: '',
						confirmedOffline: live.state === 'unavailable' && !live.online,
					};
					const resolvedLastSeen = resolvePresenceLastSeen(item.presence, {
						...presence,
						lastSeen: live.lastSeen,
					});
					presence.lastSeen = resolvedLastSeen || undefined;
					if (isSameConversationPresence(item, presence)) return item;
					changed = true;
					return {
						...item,
						isTyping: presence.typing,
						typing: presence.typing,
						presence,
					};
				});
				return changed ? next : current;
			});
			for (const item of normalized) {
				if (item.typing || item.recording) armTypingTtl(item.conversationId);
			}
			const pinnedStoredId = readStoredPinnedOnlineContactId(currentUserId);
			if (pinnedStoredId) {
				setPinnedOnlineContactId(current =>
					current === pinnedStoredId ? current : pinnedStoredId,
				);
			}
		},
		[currentUserId, armTypingTtl],
	);

	const refreshOnlineContacts = useCallback(
		async (options = {}) => {
			if (!accountId) {
				setOnlineContacts([]);
				return;
			}
			const includeOffline = Boolean(options.includeOffline);
			try {
				const { data } = await api.get('/whatsapp/presence/online', {
					params: {
						accountId,
						...(includeOffline ? { includeOffline: '1' } : {}),
					},
				});
				applyOnlineContactsSnapshot(data);
				return data;
			} catch {
				/* ignore transient presence refresh errors */
				return null;
			}
		},
		[accountId, applyOnlineContactsSnapshot],
	);

	/** Pull presence (incl. lastSeen) for an open chat so header/info stay accurate. */
	const hydrateConversationPresence = useCallback(
		async targetConversationId => {
			const id = String(targetConversationId || '').trim();
			if (!accountId || !id) return;
			let data = null;
			try {
				const response = await api.get('/whatsapp/presence/online', {
					params: { accountId, includeOffline: '1' },
				});
				data = response.data;
			} catch {
				return;
			}
			const items = Array.isArray(data?.items) ? data.items : [];
			// Same shape as the socket snapshot (live + recently offline); the bar filters to live.
			applyOnlineContactsSnapshot(data);

			const hit = items.find(item => String(item.conversationId) === id);
			if (!hit) return;
			setConversations(current => {
				const row = current.find(item => item.id === id);
				if (!row) return current;
				const presence = {
					online: Boolean(hit.online),
					typing: Boolean(hit.typing),
					recording: Boolean(hit.recording),
					state: hit.state || (hit.online ? 'available' : 'unavailable'),
					t: hit.updatedAt || Date.now(),
					senderName: '',
					confirmedOffline: !hit.online && hit.state === 'unavailable',
				};
				presence.lastSeen =
					resolvePresenceLastSeen(row.presence, {
						...presence,
						lastSeen: hit.lastSeen,
					}) || undefined;
				if (isSameConversationPresence(row, presence)) return current;
				return current.map(item =>
					item.id === id
						? {
								...item,
								isTyping: presence.typing,
								typing: presence.typing,
								presence,
							}
						: item,
				);
			});
			if (hit.typing || hit.recording) armTypingTtl(id);
		},
		[accountId, applyOnlineContactsSnapshot, armTypingTtl],
	);

	const selectWhatsAppAccount = useCallback(
		nextAccountId => {
			if (!nextAccountId) return;
			setAccountId(nextAccountId);
			writeStoredWhatsAppAccountId(nextAccountId, currentUserId);
		},
		[currentUserId],
	);

	/*
	 * Messages on the accounts you are NOT looking at. The server already sends every recipient a
	 * WHATSAPP_MESSAGE notification (muted chats and people with notifications off are skipped),
	 * tagged with its account. The open account shows its own messages, so only the others get a
	 * card here: account, sender, preview, a chime; clicking it switches account and opens the chat.
	 */
	const otherAccountAlertRef = useRef(null);
	otherAccountAlertRef.current = notification => {
		const data = notification?.data || {};
		const targetAccountId = String(data.accountId || '');
		const targetConversationId = String(data.conversationId || '');
		if (!targetAccountId || targetAccountId === accountIdRef.current) return;
		const account = (accountsRef.current || []).find(item => item.id === targetAccountId);
		if (!account) return; // not an account this page lists
		const ar = locale === 'ar';
		const accountLabel = account.label || account.providerName || account.phoneNumber || 'WhatsApp';
		setAccounts(current =>
			current.map(item =>
				item.id === targetAccountId
					? { ...item, stats: { ...(item.stats || {}), unread: (Number(item.stats?.unread) || 0) + 1 } }
					: item,
			),
		);
		try {
			playIncomingChime();
		} catch {
			/* autoplay blocked: the card still shows */
		}
		const open = toastId => {
			toast.dismiss(toastId);
			if (targetConversationId) whatsAppDeepLink.conversationId = targetConversationId;
			setActiveTab('chats');
			selectWhatsAppAccount(targetAccountId);
		};
		toast.custom(
			item => (
				<div
					dir={ar ? 'rtl' : 'ltr'}
					role="button"
					tabIndex={0}
					onClick={() => open(item.id)}
					onKeyDown={event => {
						if (event.key === 'Enter' || event.key === ' ') open(item.id);
					}}
					className={`pointer-events-auto flex w-[360px] max-w-[calc(100vw-24px)] cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.35)] transition-all duration-200 hover:border-[#1DAB61]/40 dark:border-slate-700 dark:bg-slate-900 ${
						item.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
					}`}
				>
					<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1DAB61] text-white">
						<MessageCircle size={19} strokeWidth={2.2} />
					</span>
					<span className="min-w-0 flex-1">
						<span className="mb-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-[#1DAB61]/10 px-2 py-0.5 text-[11px] font-bold text-[#0c6b3b]">
							<span className="truncate">
								{ar ? `على ${accountLabel}` : `On ${accountLabel}`}
							</span>
						</span>
						<span className="block truncate text-[14px] font-bold text-slate-900 dark:text-white" dir="auto">
							{notification.title || (ar ? 'رسالة جديدة' : 'New message')}
						</span>
						{notification.message ? (
							<span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-500 dark:text-slate-400" dir="auto">
								{notification.message}
							</span>
						) : null}
						<span className="mt-1.5 block text-[11.5px] font-semibold text-[#1DAB61]">
							{ar ? 'اضغط للتحويل للحساب وفتح الشات' : 'Click to switch account and open the chat'}
						</span>
					</span>
					<button
						type="button"
						onClick={event => {
							event.stopPropagation();
							toast.dismiss(item.id);
						}}
						aria-label={ar ? 'إغلاق' : 'Dismiss'}
						className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
					>
						<X size={14} />
					</button>
				</div>
			),
			{
				// One card per chat: a burst from the same person updates it instead of stacking.
				id: `other-account-${targetConversationId || targetAccountId}`,
				duration: 8000,
				position: ar ? 'top-left' : 'top-right',
			},
		);
	};

	useEffect(() => {
		const token = localStorage.getItem('accessToken');
		if (!token) return undefined;
		// Same server as the WhatsApp socket: that is where the sessions (and their notifications) live.
		const baseUrl = process.env.NEXT_PUBLIC_WHATSAPP_SOCKET_URL || process.env.NEXT_PUBLIC_BASE_URL;
		const socket = io(`${baseUrl}/notifications`, {
			auth: cb => cb({ token: localStorage.getItem('accessToken') || token }),
			transports: ['websocket', 'polling'],
		});
		socket.on('notification', notification => {
			if (String(notification?.type || '').toUpperCase() !== 'WHATSAPP_MESSAGE') return;
			otherAccountAlertRef.current?.(notification);
		});
		return () => {
			socket.disconnect();
		};
	}, []);

	const refreshOnlineContactsFull = useCallback(
		() => refreshOnlineContacts({ includeOffline: true }),
		[refreshOnlineContacts],
	);
	const enablePushFromOnlineTab = useCallback(
		() => subscribeToWhatsAppPush(true),
		[subscribeToWhatsAppPush],
	);

	/* Name / avatar for a presence row from the inbox copy of the chat (fresher than the snapshot). */
	const resolveOnlineIdentity = useCallback(id => {
		const conv = conversationsRef.current.find(item => item.id === id);
		if (!conv) return null;
		return {
			name: conversationTitle(conv) || '',
			avatarUrl: conversationAvatarUrl(conv) || conv.contact?.avatarUrl || null,
			phoneNumber: conv.contact?.phoneNumber || null,
		};
	}, []);

	const togglePinnedOnlineContact = useCallback(
		targetConversationId => {
			if (!targetConversationId) return;
			const currentlyPinned = pinnedOnlineContactId === targetConversationId;
			if (currentlyPinned) {
				clearStoredPinnedOnlineContactId(targetConversationId, currentUserId);
				setPinnedOnlineContactId(null);
				return;
			}
			writeStoredPinnedOnlineContactId(targetConversationId, currentUserId);
			setPinnedOnlineContactId(targetConversationId);
			toast.success(t.numberPinned);
		},
		[currentUserId, pinnedOnlineContactId, t.numberPinned],
	);

	useEffect(() => {
		if ((!isConversationWorkspaceTab(activeTab) && activeTab !== 'online') || !accountId) return undefined;
		let cancelled = false;
		const tick = () => {
			if (cancelled) return;
			if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
				return;
			}
			void refreshOnlineContacts({ includeOffline: true });
		};
		tick();
		// Event-driven via Socket.IO; light reconcile only (not 1s × contacts).
		const poll = window.setInterval(tick, 30000);
		const onVisible = () => {
			if (document.visibilityState === 'visible') tick();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			cancelled = true;
			window.clearInterval(poll);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [activeTab, accountId, refreshOnlineContacts]);

	useEffect(() => {
		const pinnedStoredId = readStoredPinnedOnlineContactId(currentUserId);
		setPinnedOnlineContactId(pinnedStoredId);
		setShowOnlineBar(readStoredShowOnlineBar(currentUserId));
	}, [currentUserId]);

	const toggleShowOnlineBar = useCallback(() => {
		setShowOnlineBar(current => {
			const next = !current;
			writeStoredShowOnlineBar(next, currentUserId);
			return next;
		});
	}, [currentUserId]);

	const presenceBarContacts = useMemo(() => {
		const byId = new Map(
			(Array.isArray(onlineContacts) ? onlineContacts : []).map(item => [
				item.conversationId,
				item,
			]),
		);
		if (pinnedOnlineContactId && !byId.has(pinnedOnlineContactId)) {
			const conv = (Array.isArray(conversations) ? conversations : []).find(
				item => item.id === pinnedOnlineContactId,
			);
			if (conv) {
				byId.set(pinnedOnlineContactId, {
					conversationId: pinnedOnlineContactId,
					name: conversationTitle(conv) || 'Contact',
					phoneNumber: conv.contact?.phoneNumber || null,
					avatarUrl: conv.contact?.avatarUrl || null,
					online: false,
					status: 'offline',
					state: 'unavailable',
					typing: false,
					recording: false,
					lastSeen: Number(conv.presence?.lastSeen) || 0,
					updatedAt: Date.now(),
				});
			}
		}
		return [...byId.values()].map(item => {
			const conv = (Array.isArray(conversations) ? conversations : []).find(
				row => row.id === item.conversationId,
			);
			if (!conv) return item;
			const resolvedAvatar =
				conversationAvatarUrl(conv) ||
				conv.contact?.avatarUrl ||
				item.avatarUrl ||
				null;
			return {
				...item,
				name: conversationTitle(conv) || item.name,
				avatarUrl: resolvedAvatar,
				phoneNumber: item.phoneNumber || conv.contact?.phoneNumber || null,
				online: Boolean(
					item.online ||
						conv.presence?.online ||
						conv.isTyping ||
						conv.typing,
				),
				typing: Boolean(item.typing || conv.isTyping || conv.typing || conv.presence?.typing),
				recording: Boolean(item.recording || conv.presence?.recording),
			};
		});
	}, [onlineContacts, pinnedOnlineContactId, conversations]);

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
		// Reconnect catch-up: fetch only rows changed since the realtime gap and merge
		// them into the painted inbox (same union path as chip backfills).
		const deltaSince =
			page === 1 && !append && !search && filter === 'all' && !assignedUserId
				? String(options.updatedSince || '')
				: '';
		const chipBackfill =
			Boolean(deltaSince) ||
			(Boolean(options.mergeIntoInbox) &&
				WHATSAPP_INBOX_CHIP_FILTERS.has(filter) &&
				!search &&
				!assignedUserId);
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
		const serverSnapshotIsFresh =
			cacheIsFresh && Date.now() - Number(cached.fetchedAt || 0) < CONVERSATIONS_CACHE_TTL;
		// Stale-while-revalidate: paint known rows immediately, then refresh once the
		// last full server read is older than the TTL (socket patches keep it live meanwhile).
		if (
			isFirstPage &&
			cacheHasRows &&
			!options.force &&
			!chipBackfill &&
			accountIdRef.current === id
		) {
			setConversations(sortConversationsByActivity(cachedItems));
			const requestedConversationId = readWhatsAppDeepLink().conversationId;
			if (requestedConversationId && cachedItems.some(item => item.id === requestedConversationId)) {
				whatsAppDeepLink.conversationId = null;
				const requested = cachedItems.find(item => item.id === requestedConversationId);
				openConversationRef.current?.(requestedConversationId, requested);
				// Never steal focus from Task Board / Emails / Reports / Settings.
				const tab = activeTabRef.current;
				if (isConversationWorkspaceTab(tab) || tab === 'accounts') {
					setActiveTab('chats');
					if (isChannelConversation(requested)) setConversationFilter('channels');
				}
			}
			setConversationPage(cached.page);
			setConversationTotal(cached.total);
			setConversationScope(cached.scope);
			if (typeof cached.archivedCount === 'number') {
				setArchivedCount(cached.archivedCount);
			}
			if (typeof cached.keepInTouchDueCount === 'number') {
				setKeepInTouchDueCount(cached.keepInTouchDueCount);
			}
			if (typeof cached.archivedUnreadCount === 'number') {
				setArchivedUnreadCount(cached.archivedUnreadCount);
			}
			if (cacheIsFresh && options.background !== true) {
				if (serverSnapshotIsFresh) return cached;
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
		const serverFilterKey =
			page === 1 && !append && !search && !assignedUserId && serverListFilter(filter) === filter && filter !== 'all'
				? `${id}:${filter}`
				: '';
		if (serverFilterKey && !options.background && accountIdRef.current === id) {
			const known = filterListCacheRef.current.get(serverFilterKey);
			if (known?.length) setConversations(current => keepOpenConversation(known, current, conversationIdRef.current));
		}
		if (options.force && !options.background && !chipBackfill) {
			await resetConversationsCache(id);
		}
		const queryKey = whatsappKeys.conversations(id, {
			page,
			search,
			filter,
			assignedUserId,
			...(deltaSince ? { updatedSince: deltaSince } : {}),
		});
		let data;
		try {
			data = await queryClient.fetchQuery({
				queryKey,
				queryFn: () =>
					fetchConversations(id, {
						page,
						limit: deltaSince ? 100 : 50,
						search,
						filter,
						assignedUserId,
						updatedSince: deltaSince || undefined,
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
			const liveInbox = accountIdRef.current === id ? conversationsRef.current : null;
			const inboxBase =
				(deltaSince && liveInbox?.length ? liveInbox : null) ||
				conversationsCacheRef.current.get(id)?.items ||
				liveInbox ||
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
					// Delta rows carry unread counts that changed while realtime was down.
					unreadCount:
						deltaSince || live.unreadCount == null
							? annotated.unreadCount
							: live.unreadCount,
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
			archivedUnreadCount:
				typeof data?.archivedUnreadCount === 'number' ? data.archivedUnreadCount : undefined,
			keepInTouchDueCount:
				typeof data?.keepInTouchDueCount === 'number' ? data.keepInTouchDueCount : undefined,
			cachedAt: Date.now(),
			// Socket patches bump cachedAt; fetchedAt only moves on a full first-page server read.
			fetchedAt:
				useCache && isFirstPage
					? Date.now()
					: conversationsCacheRef.current.get(id)?.fetchedAt,
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
		// Search/assignment responses must not land after the user cleared the query —
		// that left the inbox stuck on a stale subset when tapping X / All.
		if (!chipBackfill) {
			const liveSearch = String(chatSearchRef.current || '').trim();
			const liveAssignment = String(assignmentFilterRef.current || '');
			if (search !== liveSearch) {
				return next;
			}
			if (String(assignedUserId || '') !== liveAssignment) {
				return next;
			}
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
			setConversations(current => keepOpenConversation(merged, current, conversationIdRef.current));
		} else {
			if (serverFilterKey) filterListCacheRef.current.set(serverFilterKey, nextItems);
			setConversations(current => keepOpenConversation(nextItems, current, conversationIdRef.current));
		}
		const requestedConversationId = deltaSince ? null : readWhatsAppDeepLink().conversationId;
		// One try against the fresh list: a chat that is not on it must not pop open later.
		if (requestedConversationId) whatsAppDeepLink.conversationId = null;
		if (requestedConversationId && nextItems.some(item => item.id === requestedConversationId)) {
			const requested = nextItems.find(item => item.id === requestedConversationId);
			openConversationRef.current?.(requestedConversationId, requested);
			// Keep the user on Task Board (and other non-chat tabs) when a deep-link
			// conversationId is present — only switch when already in the chat workspace.
			const tab = activeTabRef.current;
			if (isConversationWorkspaceTab(tab) || tab === 'accounts') {
				setActiveTab('chats');
				if (isChannelConversation(requested)) setConversationFilter('channels');
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
		if (typeof next.archivedUnreadCount === 'number') {
			setArchivedUnreadCount(next.archivedUnreadCount);
		}
		if (typeof next.keepInTouchDueCount === 'number') {
			setKeepInTouchDueCount(next.keepInTouchDueCount);
		}
		return next;
	}, [queryClient, resetConversationsCache]);

	const handleChatListScroll = event => {
		listScrollPrefetchBlockedUntilRef.current = Date.now() + 280;
		if (hoverPrefetchTimerRef.current) {
			window.clearTimeout(hoverPrefetchTimerRef.current);
			hoverPrefetchTimerRef.current = null;
		}
		if (collapsedChatTip) setCollapsedChatTip(null);
		const node = event.currentTarget;
		// A rough row height is enough for this restore anchor, so the top row comes from scrollTop
		// alone. Measuring every row on each scroll event forced a layout per frame.
		const anchorIndex = Math.max(0, Math.floor((Number(node.scrollTop) || 0) / 88));
		const anchorId = String(filteredConversations[anchorIndex]?.id || '');
		const rowOffset = anchorIndex * 88 - (Number(node.scrollTop) || 0);
		chatListScrollPositionsRef.current.set(chatListScrollScope, {
			scrollTop: node.scrollTop,
			anchorId,
			rowOffset,
			anchorIndex,
		});
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
	};
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
			const stillCurrent = () =>
				accountIdRef.current === accountId &&
				conversationSearchRequestId.current === searchRequestId;

			// Account switching already reloads via the accountId effect. Forcing a
			// second cancel+refetch here races and surfaces "Could not search conversations".
			//
			// Leaving text/assignment search MUST rehydrate the All inbox. Search
			// responses replace `conversations` with a subset; without a restore,
			// clear-X and chip tabs (All / Unread / …) stay stuck on that subset.
			if (!needsServerSearch) {
				if (stillCurrent()) setSearchingConversations(false);
				try {
					const baseFilter = serverListFilter(conversationFilterRef.current);
					await loadConversations(accountId, 1, false, {
						force: false,
						search: '',
						filter: baseFilter,
						assignedUserId: '',
					});
				} catch {
					/* cache paint / network — ignore */
				}
				if (!stillCurrent()) return;
				if (needsChipBackfill) {
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
				}
				return;
			}

			setSearchingConversations(true);
			try {
				const answeredQuery = chatSearchRef.current;
				await loadConversations(accountId, 1, false, {
					force: true,
					search: answeredQuery,
					filter: conversationFilterRef.current,
					assignedUserId: assignmentFilterRef.current,
				});
				if (stillCurrent()) setServerSearchQuery(answeredQuery);
			} catch (error) {
				if (isRequestCancelled(error)) return;
				if (!stillCurrent()) return;
				toast.error(error.response?.data?.message || 'Could not search conversations');
			} finally {
				if (stillCurrent()) setSearchingConversations(false);
			}
		}, needsServerSearch ? 300 : 0);
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
		const existing = conversationsRef.current.find(item => item.id === id);
		if (existing?.isArchived) {
			patchArchivedUnread(normalizedCount - conversationUnreadCount(existing));
		}
		const withCount = list =>
			list.map(conversation =>
				conversation.id === id
					? { ...conversation, unreadCount: normalizedCount }
					: conversation,
			);
		// Patch the All-inbox cache on its own rows. The list on screen may be a server filter
		// (Keep in touch, Archived): copying it into the cache left All showing only those chats.
		const currentAccountId = accountIdRef.current;
		const cached = currentAccountId
			? conversationsCacheRef.current.get(currentAccountId)
			: null;
		if (currentAccountId && cached && Array.isArray(cached.items)) {
			conversationsCacheRef.current.set(currentAccountId, {
				...cached,
				items: withCount(cached.items),
				cachedAt: Date.now(),
			});
		}
		setConversations(current => withCount(current));
	}, [patchArchivedUnread]);

	// Patches a single conversation's preview/unread count in place instead of
	// refetching the whole list — avoids the flicker/scroll-jump of a full reload
	// for the common case of "a new message arrived somewhere in this account".
	const applyConversationPreview = useCallback(payload => {
		const viewingOpenChat =
			payload?.conversationId &&
			payload.conversationId === conversationIdRef.current &&
			isConversationWorkspaceTab(activeTabRef.current);
		const nextPayload = viewingOpenChat ? { ...payload, unreadCount: 0 } : payload;
		const existing = conversationsRef.current.find(item => item.id === payload?.conversationId);
		if (existing?.isArchived && nextPayload && 'unreadCount' in nextPayload) {
			patchArchivedUnread(
				Math.max(0, Number(nextPayload.unreadCount) || 0) - conversationUnreadCount(existing),
			);
		}
		// The All-inbox cache gets the preview on its own rows (see setConversationUnreadCount):
		// the list on screen may be a server filter with only a few chats.
		const currentAccountId = accountIdRef.current;
		const cached = currentAccountId ? conversationsCacheRef.current.get(currentAccountId) : null;
		if (currentAccountId && cached && Array.isArray(cached.items)) {
			const nextCached = updateConversationPreview(cached.items, nextPayload);
			if (nextCached !== cached.items) {
				conversationsCacheRef.current.set(currentAccountId, {
					...cached,
					items: nextCached,
					cachedAt: Date.now(),
				});
			}
		}
		setConversations(current => updateConversationPreview(current, nextPayload));
	}, [patchArchivedUnread]);

	const updateCachedMessage = useCallback((targetConversationId, messageId, updater) => {
		if (!targetConversationId || !messageId) return;
		const apply = items =>
			(items || []).map(message =>
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
		// The in-memory cache is keyed as `id` or `id:starred`. Updating only the bare
		// conversation id left the starred view (and a later reopen from that key)
		// without the reaction the user just added.
		for (const key of [
			messagesCacheKey(targetConversationId, false),
			messagesCacheKey(targetConversationId, true),
		]) {
			const cached = messagesCacheRef.current.get(key);
			if (!cached) continue;
			messagesCacheRef.current.set(key, {
				...cached,
				items: apply(cached.items),
				cachedAt: Date.now(),
			});
		}
	}, []);

	const applyStatuses = useCallback((targetAccountId, payload) => {
		const rawItems = Array.isArray(payload) ? payload : payload?.items || [];
		const now = Date.now();
		const items = rawItems.filter(item => {
			if (!item?.expiresAt) return true;
			const expires = new Date(item.expiresAt).getTime();
			return Number.isFinite(expires) && expires > now;
		});
		const hint = Array.isArray(payload) ? null : payload?.hint || null;
		const debug = Array.isArray(payload) ? null : payload?.debug || null;
		if (debug && typeof console !== 'undefined') {
			console.info('[wa-stories] sync', {
				accountId: targetAccountId,
				...debug,
				renderedGroups: 'pending',
			});
		}
		if (accountIdRef.current === targetAccountId) {
			setStatuses(items);
			setStatusFetchHint(hint);
		}
		statusesCacheRef.current.set(targetAccountId, {
			items,
			hint,
			debug,
			cachedAt: Date.now(),
		});
	}, []);

	const refreshStatusesFromProvider = useCallback(
		async (targetAccountId, { silent = true, force = false, fromPhone = false } = {}) => {
			if (!targetAccountId || !seesWholeAccountRef.current) return;
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
				// Every refresh lets the server ask the phone (spaced out); "Sync now" insists.
				// Must hit the host that owns the Baileys session (prod), not local sessions=off.
				const { data: refreshed } = await whatsappLiveApi.get(
					`/whatsapp/accounts/${targetAccountId}/statuses`,
					{ params: { refresh: true, debug: '1', ...(fromPhone ? { phone: '1' } : {}) }, timeout: 90_000 },
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
		async (targetAccountId, { force = false, silent = true, providerRefresh = true, fromPhone = false } = {}) => {
			if (!targetAccountId) return;
			// Staff limited to their assigned chats have no stories (the server refuses them).
			if (!seesWholeAccountRef.current) {
				if (accountIdRef.current === targetAccountId) setStatuses([]);
				return;
			}
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
			// A list from under a minute ago is current: the visible poller and the
			// "story posted" paths refresh it. Re-requesting here on every tab switch,
			// chat open or effect re-run is what kept re-fetching the Status tab.
			if (cacheFresh && !force) return;
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
				// Live provider refresh only when the session is connected and caller allows it.
				if (liveSession && providerRefresh && (force || !cacheFresh)) {
					const providerRefreshRequired =
						force || !Array.isArray(data?.items) || data.items.length === 0;
					void refreshStatusesFromProvider(targetAccountId, {
						silent: true,
						force: providerRefreshRequired || fromPhone,
						fromPhone,
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
				} else if (force && liveSession && providerRefresh) {
					void refreshStatusesFromProvider(targetAccountId, { silent: false, force: true, fromPhone });
				}
			}
		},
		[refreshStatusesFromProvider, applyStatuses],
	);

	const loadStatusHistory = useCallback(async targetAccountId => {
		if (!targetAccountId) return;
		setLoadingStatusHistory(true);
		try {
			const { data } = await api.get(
				`/whatsapp/accounts/${targetAccountId}/statuses/history`,
				{ timeout: 30000 },
			);
			if (accountIdRef.current === targetAccountId) {
				setStatusHistory(Array.isArray(data?.items) ? data.items : []);
			}
		} catch (error) {
			if (accountIdRef.current === targetAccountId) {
				toast.error(error.response?.data?.message || 'Could not load story history');
			}
		} finally {
			if (accountIdRef.current === targetAccountId) {
				setLoadingStatusHistory(false);
			}
		}
	}, []);

	useEffect(() => {
		if (activeTab !== 'statuses' || storyPanelMode !== 'history' || !accountId) return;
		void loadStatusHistory(accountId);
	}, [activeTab, storyPanelMode, accountId, loadStatusHistory]);

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
				const existing = messagesCacheRef.current.get(cacheKey);
				if (isMessageThreadCacheComplete(existing)) return;
				const idbCache = {
					items: mergeMessages([], page.items, id),
					hasMore:
						page.items.length >= MESSAGE_PAGE_SIZE
							? true
							: page.hasMore !== false,
					cachedAt: page.cachedAt || Date.now(),
				};
				// A lone IDB row is the same as inbox preview — never treat it as hydrated.
				if (!isMessageThreadCacheComplete(idbCache)) return;
				if ((existing?.items?.length || 0) >= page.items.length) return;
				messagesCacheRef.current.set(cacheKey, idbCache);
				writeConversationMessages(id, () => idbCache.items);
				setHasMoreMessages(Boolean(idbCache.hasMore));
				setLoadingMessages(false);
				setMessagesSyncHint('');
				scrollMessagesToBottom();
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
		const catchUp = openChatCatchUpPlan({
			cacheItems: cached?.items || [],
			unreadCount: conversationUnreadCount(conversationMeta),
			lastMessage: conversationMeta?.lastMessage || null,
		});
		const beginCatchUp = () => {
			if (starredOnly || !isCurrentRequest()) return;
			// Decide shimmer from what is actually painted, not only the RQ/cache
			// seed — inbox preview may already include the tip.
			const livePlan = openChatCatchUpPlan({
				cacheItems:
					messagesOwnerRef.current === id
						? conversationMessagesRef.current || []
						: cached?.items || [],
				unreadCount: conversationUnreadCount(conversationMeta),
				lastMessage: conversationMeta?.lastMessage || null,
			});
			if (!livePlan.showUi) return;
			setMessageCatchUp({
				conversationId: id,
				expected: livePlan.expected,
				received: 0,
			});
		};
		const finishCatchUp = (itemsAfter = []) => {
			if (!isCurrentRequest()) return;
			// Only clear the full-pane unread skeleton if it was actually shown.
			if (messageCatchUpRef.current?.conversationId !== id) return;
			setMessageCatchUp(null);
			setLoadingMessages(false);
			pinThreadToBottomRef.current = true;
			scrollMessagesToBottom('auto', { force: true });
			void itemsAfter;
		};
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
			const sortedCached = mergeMessages([], cached.items, id);
			writeConversationMessages(id, () => sortedCached);
			if (sortedCached !== cached.items) {
				messagesCacheRef.current.set(cacheKey, { ...cached, items: sortedCached });
			}
			setHasMoreMessages(cached.hasMore);
			const threadComplete = isMessageThreadCacheComplete(cached);
			// A partial cache (socket seed / incomplete prefetch) must keep the loading
			// overlay up. Flipping it off early let the settle loop declare victory on a
			// half-painted thread, which is what opened chats mid-conversation.
			if (threadComplete) {
				// Unread catch-up keeps the full-pane skeleton until the tip lands.
				setLoadingMessages(Boolean(catchUp.showUi));
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
						hasMore: cached.hasMore !== false,
						socketHealthy: Boolean(socketRef.current?.connected),
						needsCatchUp: catchUp.needed,
					})
				) {
					finishCatchUp(sortedCached);
					markReadIfNeeded();
					return;
				}
				if (catchUp.needed) beginCatchUp();
			} else {
				// Partial cache must keep loadingMessages true so the settle loop
				// keeps pinning to bottom until the first full page lands.
				setLoadingMessages(true);
				if (catchUp.needed) beginCatchUp();
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
			if (catchUp.needed) beginCatchUp();
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
			const queryKey = whatsappKeys.messages(id, { starredOnly });
			const threadComplete = isMessageThreadCacheComplete(cached);
			// Socket / inbox often seeds RQ with 1 fresh row. A long staleTime then
			// makes fetchQuery return that partial page and never hit Postgres.
			// Unread catch-up must always hit Postgres even when the warm page looks complete.
			if (!threadComplete || forceProvider || catchUp.needed) {
				await queryClient.cancelQueries({ queryKey });
				if (!threadComplete || catchUp.needed) {
					queryClient.removeQueries({ queryKey });
				}
			}
			const storedItems = await queryClient.fetchQuery({
				queryKey,
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
				staleTime: catchUp.needed
					? 0
					: openChatMessagesStaleTime({
							forceProvider,
							cache: cached,
							cacheIsFresh,
						}),
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
			} else {
				const restoredFailed = restoreFailedOutbound(items, id);
				if (restoredFailed.length) items = mergeMessages(items, restoredFailed, id);
			}
			const storedPageIsFull = pageItems.length >= MESSAGE_PAGE_SIZE;
			// First-page GET is authoritative — do not keep socket/preview hasMore=true
			// after Postgres returned a short page (that falsely shows “Load older”).
			const initialHasMore = storedPageIsFull;
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
			threadPageLandedRef.current = id;
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
			const afterPlan = openChatCatchUpPlan({
				cacheItems: items,
				unreadCount: conversationUnreadCount(conversationMeta),
				lastMessage: conversationMeta?.lastMessage || null,
			});
			if (isCurrentRequest()) {
				setLoadingMessages(Boolean(afterPlan.showUi));
				setMessagesSyncHint('');
				if (!afterPlan.showUi) finishCatchUp(items);
				else if (catchUp.needed) beginCatchUp();
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
				finishCatchUp(items);
				scrollMessagesToBottom();
			};

			const historySyncBlocked =
				Date.now() < providerHistorySyncBlockedUntilRef.current;
			const backfill = shouldProviderBackfill({
				canSync: allowProviderSync,
				starredOnly,
				forceProvider: forceProvider || (catchUp.needed && afterPlan.needed),
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
								finishCatchUp(items);
							}
						} else {
							providerHistorySyncBlockedUntilRef.current = 0;
							messageHistoryRetryRef.current.attempts = 0;
							setMessagesSyncHint('');
							applySynced(synced);
						}
					} catch (error) {
						providerHistorySyncBlockedUntilRef.current = Date.now() + 8_000;
						if (isCurrentRequest()) {
							finishCatchUp(items);
						}
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
					if (isCurrentRequest()) setThreadSyncingId(id);
					void finishProviderSync().finally(() => {
						setThreadSyncingId(current => (current === id ? null : current));
					});
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
				finishCatchUp(items);
				scrollMessagesToBottom();
			}
		} catch (error) {
			if (!isCurrentRequest()) return;
			const cancelled =
				error?.name === 'CancelledError' ||
				error?.code === 'ERR_CANCELED' ||
				error?.message === 'canceled';
			if (cancelled) return;
			if (messageCatchUpRef.current?.conversationId === id) {
				setMessageCatchUp(null);
			}
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

	// Pull-to-refresh: connection status (accounts), inbox page 1, the open thread, and a
	// socket reconnect if it dropped. Painted data stays on screen while this runs.
	const refreshFromPull = useCallback(async () => {
		const socket = socketRef.current;
		if (socket && !socket.connected) socket.connect();
		const activeAccountId = accountIdRef.current;
		const activeConversationId = conversationIdRef.current;
		const tasks = [loadAccounts()];
		if (activeAccountId) {
			tasks.push(
				loadConversations(activeAccountId, 1, false, {
					force: true,
					background: true,
					filter: serverListFilter(conversationFilterRef.current),
				}),
			);
		}
		if (activeConversationId && !isDemoId(activeConversationId)) {
			tasks.push(loadMessagesRef.current?.(activeConversationId, true, { forceProvider: false }));
		}
		const results = await Promise.allSettled(tasks);
		const failed = results.find(
			result => result.status === 'rejected' && !isRequestCancelled(result.reason),
		);
		if (failed) {
			toast.error(failed.reason?.response?.data?.message || t.refreshFailed);
		}
	}, [loadAccounts, loadConversations, t.refreshFailed]);
	const chatListPull = usePullToRefresh(chatListScrollRef, refreshFromPull, {
		enabled: isConversationWorkspaceTab(activeTab),
		attachKey: activeTab,
	});

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

	/** Paint cached / inbox-preview thread before React commits conversationId. */
	const openConversation = useCallback(
		(id, conversationMeta) => {
			if (!id) return;
			waPerfMark('chat:open');
			cancelIdleMessagePrefetch(id);
			const starredOnly =
				conversationFilterRef.current === 'important' ||
				conversationFilterRef.current === 'starred';
			const cacheKey = messagesCacheKey(id, starredOnly);
			const warmCache = messagesCacheRef.current.get(cacheKey);
			const conv =
				conversationMeta ||
				conversationsRef.current.find(item => item.id === id) ||
				null;

			let paintedForCatchUp = warmCache?.items || [];
			if (isMessageThreadCacheComplete(warmCache)) {
				const sorted = mergeMessages([], warmCache.items, id);
				writeConversationMessages(id, () => sorted);
				messagesCacheRef.current.set(cacheKey, { ...warmCache, items: sorted });
				setHasMoreMessages(Boolean(warmCache.hasMore));
				setLoadingMessages(false);
				paintedForCatchUp = sorted;
			} else if (!starredOnly) {
				const preview = conv?.lastMessage;
				if (preview && isRenderableWhatsAppMessage(preview)) {
					const previewRow = {
						...preview,
						id: preview.id || `inbox-preview-${id}`,
						conversationId: preview.conversationId || id,
					};
					writeConversationMessages(id, () => [previewRow]);
					setHasMoreMessages(true);
					// Keep loading true so settle pins to bottom (not mid/top thread).
					setLoadingMessages(true);
					paintedForCatchUp = [previewRow];
				} else {
					clearConversationMessages(id);
					setHasMoreMessages(true);
					setLoadingMessages(true);
					paintedForCatchUp = [];
				}
			} else {
				clearConversationMessages(id);
				setHasMoreMessages(true);
				setLoadingMessages(true);
				paintedForCatchUp = [];
			}
			const openCatchUp = openChatCatchUpPlan({
				cacheItems: paintedForCatchUp,
				unreadCount: conversationUnreadCount(conv),
				lastMessage: conv?.lastMessage || null,
			});
			// Unread + missing tip → full-pane skeleton until the page arrives.
			if (openCatchUp.showUi) {
				setMessageCatchUp({
					conversationId: id,
					expected: openCatchUp.expected,
					received: 0,
				});
				setLoadingMessages(true);
			} else {
				setMessageCatchUp(null);
			}

			lastAutoScrolledMessageRef.current = null;
			olderScrollRestoreRef.current = null;
			lastThreadScrollTopRef.current = 0;
			userScrollingThreadRef.current = false;
			pinThreadToBottomRef.current = true;
			lastThreadGestureAtRef.current = 0;
			setShowJumpToBottom(false);
			setThreadSettled(false);
			suppressOlderLoadUntilRef.current = Date.now() + 2000;
			// The scroll container is reused across chats, so leftover scrollTop from the
			// previous thread would otherwise paint the new one mid-conversation until
			// the settle loop caught up — and sometimes it never did.
			const box = messageBoxRef.current;
			if (box) {
				try {
					box.scrollTop = Number(box.scrollHeight) || 0;
				} catch {
					/* ignore */
				}
			}
			setConversationId(id);
			if (isChannelConversation(conv)) {
				setConversationFilter('channels');
			} else if (isChannelsInboxFilter(conversationFilterRef.current)) {
				setConversationFilter('all');
			}
		},
		[cancelIdleMessagePrefetch, clearConversationMessages, writeConversationMessages],
	);

	const openConversationRef = useRef(openConversation);
	openConversationRef.current = openConversation;

	const previousThreadIdRef = useRef(null);
	useEffect(() => {
		const previousId = previousThreadIdRef.current;
		previousThreadIdRef.current = conversationId;
		if (!previousId || previousId === conversationId) return;
		for (const starredOnly of [false, true]) {
			const key = messagesCacheKey(previousId, starredOnly);
			const cache = messagesCacheRef.current.get(key);
			const trimmed = trimBackgroundThreadCache(cache);
			if (trimmed !== cache) messagesCacheRef.current.set(key, trimmed);
		}
	}, [conversationId]);

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
			prefetchMessages(id, MESSAGE_PAGE_SIZE).finally(() => {
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

	const conversationRowHandlersRef = useRef(null);
	conversationRowHandlersRef.current = {
		click: conversation => {
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
				toast.success(locale === 'ar' ? 'تم فتح الشات الجانبي' : 'Second chat opened');
				return;
			}
			openConversation(conversation.id, conversation);
		},
		keyActivate: conversation => {
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
			openConversation(conversation.id, conversation);
		},
		prefetch: id => scheduleConversationPrefetch(id),
		showTip: tip => setCollapsedChatTip(tip),
		longPressStart: (event, conversation) => startConversationLongPress(event, conversation),
		longPressCancel: event => cancelConversationLongPress(event),
		contextMenu: (event, conversation) => {
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
		},
		openMenu: (event, conversation) => {
			const rect = event.currentTarget.getBoundingClientRect();
			setConversationActionAnchor({
				top: rect.top,
				bottom: rect.bottom,
				left: rect.left,
				right: rect.right,
				width: rect.width,
				height: rect.height,
			});
			setConversationActionTarget(conversation);
		},
		openStory: story => openStoryGroup(story),
		togglePinned: (conversation, event) => toggleConversationPinned(conversation, event),
		toggleFavorite: (conversation, event) => toggleConversationFavorite(conversation, event),
		applyAvatar: (conversationId, avatarUrl) => {
			const nextUrl = String(avatarUrl || '').trim();
			const targetId = String(conversationId || '').trim();
			if (!targetId || !nextUrl) return;
			const patchAvatar = item => {
				if (!item || item.id !== targetId) return item;
				if (item.contact) {
					return { ...item, contact: { ...item.contact, avatarUrl: nextUrl } };
				}
				if (item.group) {
					return { ...item, group: { ...item.group, avatarUrl: nextUrl } };
				}
				return item;
			};
			setConversations(current => current.map(patchAvatar));
		},
	};
	const conversationRowActions = useMemo(() => {
		const handlers = conversationRowHandlersRef;
		return Object.fromEntries(
			Object.keys(handlers.current).map(name => [
				name,
				(...args) => handlers.current[name](...args),
			]),
		);
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
		localeRef.current = locale;
	}, [locale]);

	useEffect(() => {
		accountsRef.current = accounts;
	}, [accounts]);

	useEffect(() => {
		conversationsRef.current = conversations;
	}, [conversations]);

	useEffect(() => {
		// The chat header has its own clock (ChatHeaderPresenceSubtitle); this one only keeps the
		// contact info panel's "last seen" fresh, so it runs only while that panel is open.
		const watchingPresence = Boolean(conversationInfoTarget?.id);
		if (!watchingPresence) return undefined;
		setPresenceClock(Date.now());
		const timer = window.setInterval(() => {
			setPresenceClock(Date.now());
		}, 30_000);
		return () => window.clearInterval(timer);
	}, [conversationInfoTarget?.id]);

	useEffect(() => {
		if (!conversationId) return undefined;
		const conv =
			conversationsRef.current.find(item => item.id === conversationId) || null;
		if (conv?.type === 'group') return undefined;
		void hydrateConversationPresence(conversationId);
		return undefined;
	}, [conversationId, hydrateConversationPresence]);

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
			setAssignableStaff([]);
			setPrivacySettings({
				hideStatusViewReceipts: true,
				readReceiptMode: 'on_reply',
				holdDeliveryReceipts: false,
				hideTypingIndicator: false,
			});
			setTabLoading(false);
			setTabError('');
			setSelectedStatus(null);
			setStatuses(statusesCacheRef.current.get(accountId)?.items || []);
			setInboxReady(false);
			setSessionProbeDone(false);
			setQrExpired(false);
			if (statusMediaUrlRef.current) {
				revokeStoryUrl(statusMediaUrlRef.current);
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
			if (statusMediaUrlRef.current) revokeStoryUrl(statusMediaUrlRef.current);
		},
		[],
	);

	const markRuntimeReadRef = useRef(demo.markRuntimeRead);
	markRuntimeReadRef.current = demo.markRuntimeRead;

	useLayoutEffect(() => {
		// Point the ref at the new chat before anything else runs, so in-flight
		// requests for the previous chat immediately fail their isCurrentRequest()
		// guard instead of writing into the pane the user is now looking at.
		const switchedConversation = conversationIdRef.current !== conversationId;
		conversationIdRef.current = conversationId;
		secondaryConversationIdRef.current = secondaryConversationId;
		const starredOnly =
			conversationFilter === 'important' || conversationFilter === 'starred';
		const cacheKey = conversationId ? messagesCacheKey(conversationId, starredOnly) : '';
		if (switchedConversation) {
			const warmCache = cacheKey ? messagesCacheRef.current.get(cacheKey) : null;
			threadPageLandedRef.current =
				warmCache && isMessageThreadCacheComplete(warmCache) ? conversationId : null;
			if (warmCache && isMessageThreadCacheComplete(warmCache)) {
				const sorted = mergeMessages([], warmCache.items, conversationId);
				writeConversationMessages(conversationId, () => sorted);
				messagesCacheRef.current.set(cacheKey, { ...warmCache, items: sorted });
				setHasMoreMessages(Boolean(warmCache.hasMore));
				setLoadingMessages(false);
			} else if (messagesOwnerRef.current === conversationId) {
				// openConversation already painted inbox preview or warm thread.
				setHasMoreMessages(true);
			} else {
				clearConversationMessages(conversationId);
				setHasMoreMessages(true);
				setLoadingMessages(Boolean(conversationId));
			}
			lastAutoScrolledMessageRef.current = null;
			olderScrollRestoreRef.current = null;
			lastThreadScrollTopRef.current = 0;
			userScrollingThreadRef.current = false;
			pinThreadToBottomRef.current = true;
			// A wheel gesture in the chat list must not count as a gesture in the thread
			// that just opened, or the top-of-thread check can auto-load older messages
			// before the first paint has settled.
			lastThreadGestureAtRef.current = 0;
			setShowJumpToBottom(false);
			setThreadSettled(false);
			suppressOlderLoadUntilRef.current = Date.now() + 2000;
		}
		if (switchedConversation) {
			messagesRequestId.current += 1;
			requestAnimationFrame(() => {
				scrollMessagesToBottom('auto', { force: true });
			});
		}
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
			setThreadSettled(true);
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
		const cachedPage = cacheKey ? messagesCacheRef.current.get(cacheKey) : null;
		const openMeta =
			conversationsRef.current.find(item => item.id === conversationId) || null;
		const openCatchUp = openChatCatchUpPlan({
			cacheItems: cachedPage?.items || [],
			unreadCount: conversationUnreadCount(openMeta),
			lastMessage: openMeta?.lastMessage || null,
		});
		const shouldReloadMessages = shouldReloadOpenChatMessages({
			switchedConversation,
			loadKey,
			lastOpenLoadKey: lastOpenMessagesLoadKeyRef.current,
			cache: cachedPage,
			needsCatchUp: openCatchUp.needed,
		});
		if (shouldReloadMessages) {
			lastOpenMessagesLoadKeyRef.current = loadKey;
			if (openCatchUp.showUi) {
				setMessageCatchUp({
					conversationId,
					expected: openCatchUp.expected,
					received: 0,
				});
				setLoadingMessages(true);
			} else if (messageCatchUpRef.current?.conversationId === conversationId) {
				setMessageCatchUp(null);
			}
			loadMessages(conversationId, canUseWhatsApp && !demo.settings.enabled).catch(() => { });
		} else if (messageCatchUpRef.current?.conversationId === conversationId) {
			setMessageCatchUp(null);
		}
		if (selectedConversationSource === 'real_overlay') {
			markRuntimeReadRef.current?.(selectedDemoRuntimeId);
			markRuntimeReadRef.current?.(conversationId);
		}
	}, [
		clearConversationMessages,
		conversationId,
		secondaryConversationId,
		conversationFilter,
		canUseWhatsApp,
		demo.settings.enabled,
		loadMessages,
		scrollMessagesToBottom,
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

	useEffect(() => {
		setSplitLiveMessage(null);
	}, [secondaryConversationId]);

	useEffect(() => {
		if (!conversationId || !loadingMessages) return undefined;
		const timer = window.setTimeout(() => {
			if (conversationIdRef.current !== conversationId) return;
			setLoadingMessages(false);
			setMessagesSyncHint('');
		}, 18_000);
		return () => window.clearTimeout(timer);
	}, [conversationId, loadingMessages]);

	useEffect(() => {
		if (!conversationId) {
			setMessageCatchUp(null);
		}
	}, [conversationId]);

	// Drop full-pane unread skeleton as soon as the inbox tip is painted, then
	// pin to the latest messages (never leave the thread stuck at the top).
	useEffect(() => {
		if (!messageCatchUp || messageCatchUp.conversationId !== conversationId) return;
		// The inbox tip is painted on open as a single row. Treating that as "caught up"
		// dropped the loader and showed one lonely message until the page arrived.
		if (threadPageLandedRef.current !== conversationId) return;
		const tipPlan = openChatCatchUpPlan({
			cacheItems: effectiveMessages,
			unreadCount: messageCatchUp.expected,
			lastMessage: selectedConversation?.lastMessage || null,
		});
		if (tipPlan.showUi) return;
		setMessageCatchUp(null);
		setLoadingMessages(false);
		pinThreadToBottomRef.current = true;
		requestAnimationFrame(() => {
			scrollMessagesToBottom('auto', { force: true });
		});
	}, [
		conversationId,
		effectiveMessages,
		messageCatchUp,
		scrollMessagesToBottom,
		selectedConversation?.lastMessage,
	]);

	useEffect(() => {
		const box = messageBoxRef.current;
		if (!box || !conversationId) return undefined;
		return installWaScrollSpy(box);
	}, [conversationId]);

	useEffect(() => {
		threadSettledRef.current = threadSettled;
		if (threadSettled) threadVirtualLatchRef.current.opening = false;
	}, [threadSettled]);

	// Chats open at the latest message. Jumping up to the first unread on its own landed
	// people deep in old messages (virtual rows are placed from estimated heights, and the
	// app's unread count can include messages already read on the phone). When the unread
	// run is taller than the screen, a chip offers the jump instead.
	const unreadRevealDoneRef = useRef(null);
	const [unreadJump, setUnreadJump] = useState(null);
	const revealUnreadDivider = useCallback(() => {
		const box = messageBoxRef.current;
		const dividerId = unreadDividerIdRef.current;
		if (!box || !dividerId) return;
		const place = () => {
			const divider = box.querySelector('[data-wa-unread-divider]');
			if (!divider) return false;
			const boxRect = box.getBoundingClientRect();
			const rect = divider.getBoundingClientRect();
			pinThreadToBottomRef.current = false;
			box.scrollTop += rect.top - boxRect.top - 12;
			setShowJumpToBottom(true);
			return Math.abs(divider.getBoundingClientRect().top - boxRect.top - 12) < 4;
		};
		if (place()) return;
		const index = messageRowsRef.current.findIndex(row =>
			row?.kind === 'image-gallery'
				? row.messages?.some(item => item?.id === dividerId)
				: row?.message?.id === dividerId,
		);
		if (index < 0) return;
		pinThreadToBottomRef.current = false;
		messageVirtualRef.current?.scrollToIndex?.(index, { align: 'start' });
		// Rows above get measured as they render; keep correcting until the divider sits still.
		let tries = 0;
		const settle = () => {
			if (place() || (tries += 1) > 12) return;
			requestAnimationFrame(settle);
		};
		requestAnimationFrame(settle);
	}, []);
	useEffect(() => {
		setUnreadJump(null);
	}, [conversationId]);
	useEffect(() => {
		if (!threadSettled || !conversationId || !unreadDividerMessageId) return;
		if (unreadRevealDoneRef.current === conversationId) return;
		unreadRevealDoneRef.current = conversationId;
		const box = messageBoxRef.current;
		if (!box) return;
		const divider = box.querySelector('[data-wa-unread-divider]');
		if (divider && divider.getBoundingClientRect().top >= box.getBoundingClientRect().top + 4) return;
		setUnreadJump({ conversationId, count: unreadAtOpen?.count || 0 });
	}, [threadSettled, conversationId, unreadDividerMessageId, unreadAtOpen]);
	useEffect(() => {
		if (unreadRevealDoneRef.current !== conversationId) unreadRevealDoneRef.current = null;
	}, [conversationId]);

	useEffect(() => {
		return () => {
			if (userScrollIdleTimerRef.current) {
				window.clearTimeout(userScrollIdleTimerRef.current);
			}
		};
	}, [conversationId]);

	useEffect(() => {
		// Hold "settling" until the viewport is actually pinned to the latest
		// messages. Marking settled too early freezes scrollTop mid-thread.
		if (threadSettled || !conversationId) return undefined;
		if (!effectiveMessages.length) {
			// Still waiting on the first page — keep the overlay, do not settle yet.
			if (loadingMessages) return undefined;
			const emptyTimer = window.setTimeout(() => setThreadSettled(true), 80);
			return () => window.clearTimeout(emptyTimer);
		}

		let attempts = 0;
		let rafId = 0;
		let cancelled = false;
		let stableFrames = 0;
		let lastHeight = -1;
		let lastMeasuredCount = -1;
		const maxAttempts = 72;
		const hardCapAttempts = 120;

		const pinBottom = () => {
			const box = messageBoxRef.current;
			if (!box || !pinThreadToBottomRef.current) return false;
			messageVirtualRef.current?.cancelScrollReconcile?.();
			const target = Math.max(
				Number(box.scrollHeight) || 0,
				Number(messageVirtualRef.current?.totalSize) || 0,
			);
			waScrollApply(
				box,
				target,
				'threadSettlePin',
				`settle-attempt-${attempts}`,
				{ pin: true, force: true },
			);
			return isThreadPinnedToBottom(box);
		};

		const tick = () => {
			if (cancelled) return;
			attempts += 1;
			const pinned = pinBottom();
			// Declaring victory on a single frame let the virtualizer swap estimated
			// row sizes for measured ones right after `opacity` flipped to 1, landing
			// the thread mid-scroll with no native anchoring to pull it back.
			//
			// `scrollHeight` alone is not enough evidence: while virtualized it is derived
			// from the virtualizer's total size, which is React state and sits flat for
			// several frames in the middle of a measurement pass. Requiring the measured
			// row count to stop changing as well keeps the loop alive until the rows the
			// thread actually renders have real heights.
			const height = Number(messageBoxRef.current?.scrollHeight) || 0;
			const measured = Number(messageVirtualRef.current?.items?.length) || 0;
			if (pinned && height === lastHeight && measured === lastMeasuredCount) stableFrames += 1;
			else stableFrames = 0;
			lastHeight = height;
			lastMeasuredCount = measured;

			// Never settle while the first page / unread catch-up is still in flight —
			// the message list is about to grow and any "pinned" frame here is temporary.
			const stillLoading =
				loadingMessagesRef.current ||
				messageCatchUpRef.current?.conversationId === conversationIdRef.current;
			if (pinned && stableFrames >= 3 && !stillLoading) {
				setThreadSettled(true);
				setShowJumpToBottom(false);
				let after = 0;
				const rePin = () => {
					if (cancelled || !pinThreadToBottomRef.current) return;
					if (userScrollingThreadRef.current) return;
					pinBottom();
					setShowJumpToBottom(shouldShowJumpToBottom(messageBoxRef.current));
					after += 1;
					if (after < 4) requestAnimationFrame(rePin);
				};
				requestAnimationFrame(rePin);
				return;
			}
			if (attempts >= maxAttempts && !stillLoading) {
				pinBottom();
				const box = messageBoxRef.current;
				if (box && isThreadPinnedToBottom(box)) {
					setThreadSettled(true);
					setShowJumpToBottom(false);
					return;
				}
				// Keep forcing the pin rather than settling mid-thread.
				if (attempts < hardCapAttempts) {
					rafId = requestAnimationFrame(tick);
					return;
				}
				pinBottom();
				setThreadSettled(true);
				setShowJumpToBottom(
					!isThreadPinnedToBottom(messageBoxRef.current) &&
						shouldShowJumpToBottom(messageBoxRef.current),
				);
				return;
			}
			// Never hard-cap settle while the first fetch is still loading — that
			// made bubbles is-ready under a still-visible skeleton for 1–2s.
			if (attempts >= hardCapAttempts && stillLoading) {
				rafId = requestAnimationFrame(tick);
				return;
			}
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => {
			cancelled = true;
			cancelAnimationFrame(rafId);
		};
	}, [threadSettled, conversationId, loadingMessages, effectiveMessages.length]);

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
			const rows = (Array.isArray(data) ? data : []).filter(item => {
				const status = String(item?.status || '').toLowerCase();
				return status === 'active' || status === 'paused' || status === 'processing' || status === 'failed';
			});
			setMessageSchedules(rows);
		} catch {
			setMessageSchedules([]);
		} finally {
			setMessageSchedulesLoading(false);
		}
	}, []);

	const loadPinnedMessages = useCallback(async targetConversationId => {
		if (!targetConversationId || isDemoId(targetConversationId)) {
			setPinnedMessages([]);
			return;
		}
		setPinnedMessagesLoading(true);
		try {
			const items = await fetchMessages(targetConversationId, {
				limit: 100,
				pinnedOnly: true,
				live: 0,
			});
			setPinnedMessages(
				(Array.isArray(items) ? items : [])
					.filter(item => item?.isPinned)
					.sort((a, b) => {
						const ta = new Date(a.providerTimestamp || a.createdAt || 0).getTime();
						const tb = new Date(b.providerTimestamp || b.createdAt || 0).getTime();
						return tb - ta;
					}),
			);
		} catch {
			setPinnedMessages([]);
		} finally {
			setPinnedMessagesLoading(false);
		}
	}, []);

	const secondaryThreadLoadRef = useRef(null);
	useEffect(() => {
		if (!conversationId || demo.settings.enabled) {
			secondaryThreadLoadRef.current = null;
			setMessageSchedules([]);
			setSchedulesPanelOpen(false);
			setPinnedMessages([]);
			setPinsPanelOpen(false);
			return undefined;
		}
		if (secondaryThreadLoadRef.current === conversationId) return undefined;
		// Pins and schedules are extra requests on every open; on a phone they slowed the
		// first page. They load once the thread is painted (or after 2.5s at the latest).
		const run = () => {
			if (secondaryThreadLoadRef.current === conversationId) return;
			secondaryThreadLoadRef.current = conversationId;
			void loadMessageSchedules(conversationId);
			void loadPinnedMessages(conversationId);
		};
		if (!loadingMessages) {
			run();
			return undefined;
		}
		const timer = window.setTimeout(run, 2500);
		return () => window.clearTimeout(timer);
	}, [conversationId, demo.settings.enabled, loadingMessages, loadMessageSchedules, loadPinnedMessages]);
	useEffect(() => {
		// Never show the previous chat's pins / schedules while the new ones wait.
		setMessageSchedules([]);
		setPinnedMessages([]);
	}, [conversationId]);

	useEffect(() => {
		if (!liveMessageSchedules.length) setSchedulesPanelOpen(false);
	}, [liveMessageSchedules.length]);

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
		const previous = messageSchedules;
		setMessageSchedules(current => current.filter(item => item.id !== schedule.id));
		try {
			await api.delete(`/whatsapp/message-schedules/${schedule.id}`);
			toast.success(locale === 'ar' ? 'تم حذف الجدولة' : 'Schedule deleted');
			if (conversationId) await loadMessageSchedules(conversationId);
		} catch (error) {
			setMessageSchedules(previous);
			toast.error(error?.response?.data?.message || 'Could not delete schedule');
		} finally {
			setMessageScheduleBusyId('');
		}
	}, [conversationId, loadMessageSchedules, locale, messageSchedules]);

	const sendMessageScheduleNow = useCallback(async schedule => {
		if (!schedule?.id) return;
		setMessageScheduleBusyId(schedule.id);
		setMessageSchedules(current =>
			current.map(item => (item.id === schedule.id ? { ...item, status: 'processing' } : item)),
		);
		try {
			await api.post(`/whatsapp/message-schedules/${schedule.id}/send-now`);
		} catch (error) {
			toast.error(
				error?.response?.data?.message ||
					(locale === 'ar' ? 'ماقدرناش نبعتها دلوقتي' : 'Could not send it now'),
			);
		} finally {
			setMessageScheduleBusyId('');
			if (conversationId) void loadMessageSchedules(conversationId);
		}
	}, [conversationId, loadMessageSchedules, locale]);

	const saveMessageScheduleText = useCallback(async (schedule, text) => {
		if (!schedule?.id) return false;
		setMessageScheduleBusyId(schedule.id);
		try {
			const { data } = await api.patch(`/whatsapp/message-schedules/${schedule.id}`, { text });
			setMessageSchedules(current =>
				current.map(item => (item.id === schedule.id ? { ...item, ...(data || {}), text } : item)),
			);
			return true;
		} catch (error) {
			toast.error(
				error?.response?.data?.message ||
					(locale === 'ar' ? 'ماقدرناش نعدّل الرسالة' : 'Could not edit the message'),
			);
			return false;
		} finally {
			setMessageScheduleBusyId('');
		}
	}, [locale]);

	const loadMessageSchedulesRef = useRef(loadMessageSchedules);
	loadMessageSchedulesRef.current = loadMessageSchedules;

	useEffect(() => {
		setDelayedSendPrefsState(readDelayedSendPrefs());
	}, []);

	// The delay is a per-chat choice, remembered for each chat.
	useEffect(() => {
		setDelayedSendOn(isDelayedSendOnForChat(conversationId));
		setDelayedSendOpen(false);
	}, [conversationId]);

	const changeDelayedSendOn = useCallback(
		on => {
			setDelayedSendOn(on);
			writeDelayedSendForChat(conversationId, on);
		},
		[conversationId],
	);

	const latestThreadMessageKey = useMemo(() => {
		const last = effectiveMessages[effectiveMessages.length - 1];
		return last ? `${last.id}:${last.status || ''}` : '';
	}, [effectiveMessages]);

	const loadReplyGap = useCallback(async targetConversationId => {
		if (!targetConversationId || isDemoId(targetConversationId)) return;
		setReplyGapState(current => ({
			conversationId: targetConversationId,
			loading: true,
			data: current.conversationId === targetConversationId ? current.data : null,
			error: false,
		}));
		try {
			const { data } = await api.get(`/whatsapp/conversations/${targetConversationId}/reply-gap`);
			setReplyGapState(current =>
				current.conversationId === targetConversationId
					? { conversationId: targetConversationId, loading: false, data, error: false }
					: current,
			);
		} catch {
			setReplyGapState(current =>
				current.conversationId === targetConversationId ? { ...current, loading: false, error: true } : current,
			);
		}
	}, []);

	const replyGapNeeded = (delayedSendOn || delayedSendOpen) && delayedSendPrefs.method === 'reply';
	useEffect(() => {
		// Re-measured when a message arrives or one of mine is confirmed, so the gap stays current.
		if (replyGapNeeded && conversationId) void loadReplyGap(conversationId);
	}, [replyGapNeeded, conversationId, latestThreadMessageKey, loadReplyGap]);

	useEffect(() => {
		if (!delayedSendOn && !delayedSendOpen) return undefined;
		setDelayedSendNow(Date.now());
		// Every tick re-renders the workspace. The open settings popover shows a live countdown;
		// with it closed the plan is only read at send time, so a slow tick is enough.
		const timer = window.setInterval(() => setDelayedSendNow(Date.now()), delayedSendOpen ? 20_000 : 60_000);
		return () => window.clearInterval(timer);
	}, [delayedSendOn, delayedSendOpen]);

	const replyGapForChat = replyGapState.conversationId === conversationId ? replyGapState.data : null;
	const delayedSendPlan = useMemo(
		() => computeDelayedSend(delayedSendPrefs, replyGapForChat, delayedSendNow),
		[delayedSendPrefs, replyGapForChat, delayedSendNow],
	);

	useLayoutEffect(() => {
		if (!conversationId || loadingOlderRef.current || pendingOlderRestore()) return;
		if (!pinThreadToBottomRef.current || threadSettledRef.current) return;
		if (!effectiveMessages.length) return;
		scrollMessagesToBottom('auto', { force: true });
	}, [
		conversationId,
		effectiveMessages.length,
		loadingMessages,
		virtualizeMessages,
		messageRows.length,
		threadSettled,
		scrollMessagesToBottom,
		pendingOlderRestore,
	]);

	useLayoutEffect(() => {
		if (!conversationId) {
			if (!threadSettled) setThreadSettled(true);
			return;
		}
		if (loadingOlderRef.current || pendingOlderRestore()) return;
		const box = messageBoxRef.current;
		const latest = effectiveMessages[effectiveMessages.length - 1];
		if (!latest?.id) {
			if (!loadingMessages && !threadSettled) setThreadSettled(true);
			return;
		}
		const nearBottom = box ? isThreadNearBottom(box) : false;
		const isNewLatest = latest.id !== lastAutoScrolledMessageRef.current;
		if (
			!shouldStickThreadToBottom({
				pinToBottom: pinThreadToBottomRef.current,
				loadingOlder: loadingOlderRef.current,
				restoringOlder: false,
				isNewLatest,
				nearBottom,
				threadSettling: !threadSettled,
				loadingMessages,
			})
		) {
			// Reading history further up: surface the jump control so the new message
			// is reachable instead of leaving the user with no way back to the bottom.
			if (isNewLatest && threadSettled && box) setShowJumpToBottom(true);
			return;
		}
		lastAutoScrolledMessageRef.current = latest.id;
		if (virtualizeMessages) messageVirtualRef.current?.cancelScrollReconcile?.();
		if (box) {
			const target = Math.max(
				Number(box.scrollHeight) || 0,
				Number(messageVirtualRef.current?.totalSize) || 0,
			);
			waScrollApply(
				box,
				target,
				'autoScrollLayoutEffect',
				`shouldStickThreadToBottom:latest=${latest.id}`,
				{
					isNewLatest,
					nearBottom,
					pin: pinThreadToBottomRef.current,
					force: !threadSettled || loadingMessages,
				},
			);
			setShowJumpToBottom(false);
		}
		// Do NOT mark settled here — settle effect waits until actually pinned to bottom.
	}, [
		latestThreadMessageId,
		loadingOlder,
		conversationId,
		loadingMessages,
		virtualizeMessages,
		messageRows.length,
		threadSettled,
		pendingOlderRestore,
	]);

	// Restore scroll after older messages are prepended (before paint).
	useLayoutEffect(() => {
		const pending = olderScrollRestoreRef.current;
		if (!pending || loadingOlder) return;
		if (pending.conversationId !== conversationIdRef.current) {
			olderScrollRestoreRef.current = null;
			return;
		}
		const box = messageBoxRef.current;
		if (!box) return;

		if (!pending.startedAt) {
			pending.startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
		}

		const restoreOptions = {
			totalSize: messageVirtual.totalSize,
			virtualized: virtualizeMessages,
		};
		const previousSize = pending.lastAppliedTotalSize;
		waScrollMark('olderRestoreLayoutEffect', 'applyThreadScrollAnchor', {
			conversationId: pending.conversationId,
		});
		applyThreadScrollAnchor(box, pending, restoreOptions);

		const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
		const elapsed = now - pending.startedAt;
		const sizeUnchanged =
			previousSize != null &&
			Math.abs(Number(pending.lastAppliedTotalSize) - Number(previousSize)) < 2;
		if (!sizeUnchanged) {
			pending.didAdjust = true;
			pending.stableFrames = 0;
		} else if (pending.didAdjust) {
			pending.stableFrames = (pending.stableFrames || 0) + 1;
		}
		const settled =
			pending.didAdjust &&
			pending.stableFrames >= 2 &&
			elapsed >= 120 &&
			(!pending.rowKey || findThreadAnchorRow(box, pending));
		if (settled || elapsed >= THREAD_RESTORE_MAX_MS) {
			olderScrollRestoreRef.current = null;
			suppressOlderLoadUntilRef.current = Date.now() + 900;
			return undefined;
		}

		const raf = requestAnimationFrame(() => {
			if (olderScrollRestoreRef.current !== pending) return;
			const current = messageBoxRef.current;
			if (current) {
				waScrollMark('olderRestoreLayoutEffect', 'applyThreadScrollAnchor:raf', {
					conversationId: pending.conversationId,
				});
				applyThreadScrollAnchor(current, pending, restoreOptions);
			}
		});
		const timer = window.setTimeout(() => {
			if (olderScrollRestoreRef.current === pending) {
				olderScrollRestoreRef.current = null;
				suppressOlderLoadUntilRef.current = Date.now() + 900;
			}
		}, Math.max(16, THREAD_RESTORE_MAX_MS - elapsed));

		return () => {
			cancelAnimationFrame(raf);
			// This cleanup also runs on re-renders whose next effect pass early-returns,
			// so the deadline can be cancelled without ever being rescheduled. The
			// `lockedAt` watchdog in pendingOlderRestore() is the backstop for that.
			window.clearTimeout(timer);
		};
	}, [
		loadingOlder,
		effectiveMessages.length,
		conversationId,
		messageVirtual.totalSize,
		virtualizeMessages,
	]);

	// Keep the thread glued to the bottom while media/layout grows on first open.
	useEffect(() => {
		const box = messageBoxRef.current;
		if (!box || !conversationId) return undefined;
		const keepBottom = () => {
			if (isThreadScrollLocked()) return;
			if (jumpToBottomInFlightRef.current) return;
			if (!pinThreadToBottomRef.current) return;
			// While opening, programmatic layout growth must not look like a user scroll-away.
			if (userScrollingThreadRef.current && threadSettledRef.current) return;
			const distance = threadDistanceFromBottom(box);
			const opening = !threadSettledRef.current;
			// A resize is layout, not intent. Dropping the pin here meant a single row
			// measuring taller than its estimate permanently unpinned the thread, so the
			// view stayed wherever the growth left it. Only a real user gesture (handled
			// in onScroll) may unpin; here we re-assert the bottom instead.
			if (!opening && distance > THREAD_PIN_THRESHOLD_PX && userScrollingThreadRef.current) {
				pinThreadToBottomRef.current = false;
				return;
			}
			messageVirtualRef.current?.cancelScrollReconcile?.();
			waScrollApply(
				box,
				Math.max(
					Number(box.scrollHeight) || 0,
					Number(messageVirtualRef.current?.totalSize) || 0,
				),
				'resizeObserverKeepBottom',
				opening ? 'open-chat:force-bottom' : 'media/layout-resize:pin-bottom',
				{ pin: true, distance, force: opening },
			);
			setShowJumpToBottom(shouldShowJumpToBottom(box));
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
	}, [conversationId]);

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
		const nextPrimary = isDemoId(conversationId) ? null : conversationId;
		const nextSecondary = isDemoId(secondaryConversationId)
			? null
			: secondaryConversationId;
		if (
			watchedConversationRef.current &&
			watchedConversationRef.current !== nextPrimary &&
			watchedConversationRef.current !== nextSecondary
		) {
			socket.emit('whatsapp:conversation:unwatch', watchedConversationRef.current);
		}
		if (
			watchedSecondaryConversationRef.current &&
			watchedSecondaryConversationRef.current !== nextPrimary &&
			watchedSecondaryConversationRef.current !== nextSecondary
		) {
			socket.emit(
				'whatsapp:conversation:unwatch',
				watchedSecondaryConversationRef.current,
			);
		}
		watchedConversationRef.current = nextPrimary;
		watchedSecondaryConversationRef.current = nextSecondary;
		if (nextPrimary) socket.emit('whatsapp:conversation:watch', nextPrimary);
		if (nextSecondary && nextSecondary !== nextPrimary) {
			socket.emit('whatsapp:conversation:watch', nextSecondary);
		}
	}, [conversationId, secondaryConversationId]);

	workspaceHandlersRef.current = {
		applyConversationPreview,
		applyOnlineContactsSnapshot,
		loadAccounts,
		loadConversations,
		loadMessages,
		patchArchivedUnread,
		queryClient,
		scheduleReloadConversations,
		setConversationUnreadCount,
		updateCachedMessage,
		writeConversationMessages,
	};

	useEffect(() => {
		const token = localStorage.getItem('accessToken');
		if (!token) return;
		// Live events come from whichever server owns the WhatsApp sessions. Locally the API
		// runs with WHATSAPP_SESSIONS_ENABLED=false, so point this at that server instead.
		const socketBaseUrl =
			process.env.NEXT_PUBLIC_WHATSAPP_SOCKET_URL || process.env.NEXT_PUBLIC_BASE_URL;
		const socket = io(`${socketBaseUrl}/whatsapp`, {
			// Read per handshake so reconnects use the token refreshed by the API client.
			auth: (cb) => cb({ token: localStorage.getItem('accessToken') || token }),
			transports: ['websocket', 'polling'],
		});
		socketRef.current = socket;
		let hasConnectedOnce = false;
		let serverDisconnectRetryTimer;
		let serverDisconnectRetries = 0;
		// Start of the current realtime gap (socket down or WhatsApp session offline).
		let realtimeGapStartedAt = 0;
		const markRealtimeGap = () => {
			if (!realtimeGapStartedAt) realtimeGapStartedAt = Date.now();
		};
		// No recorded gap → '' → loadConversations does a normal background refresh.
		const takeDeltaSince = () => {
			const startedAt = realtimeGapStartedAt;
			realtimeGapStartedAt = 0;
			// 2 min margin for client/server clock skew.
			return startedAt ? new Date(startedAt - 120_000).toISOString() : '';
		};
		const handlers = () => workspaceHandlersRef.current;
		const loadConversations = (...args) => handlers().loadConversations?.(...args);
		const loadMessages = (...args) => handlers().loadMessages?.(...args);
		const loadAccounts = (...args) => handlers().loadAccounts?.(...args);
		const applyConversationPreview = (...args) => handlers().applyConversationPreview?.(...args);
		const scheduleReloadConversations = (...args) =>
			handlers().scheduleReloadConversations?.(...args);
		const setConversationUnreadCount = (...args) =>
			handlers().setConversationUnreadCount?.(...args);
		const patchArchivedUnread = (...args) => handlers().patchArchivedUnread?.(...args);
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
			// Events missed while disconnected are not replayed by the socket, so a
			// reconnect fetches the inbox delta since the gap started (below).
			const isReconnect = hasConnectedOnce;
			hasConnectedOnce = true;
			if (accountIdRef.current) socket.emit('whatsapp:account:watch', accountIdRef.current);
			// Team online list right away (admins; others get an empty answer) and say we are here.
			socket.emit('whatsapp:presence:ping');
			socket.emit('whatsapp:presence:list', null, response => {
				if (Array.isArray(response?.items)) setStaffOnline(prev => keepStaffListIfSame(prev, response.items));
			});
			const activeConversationId = conversationIdRef.current;
			const secondaryId = secondaryConversationIdRef.current;
			if (activeConversationId && !isDemoId(activeConversationId)) {
				watchedConversationRef.current = activeConversationId;
				socket.emit('whatsapp:conversation:watch', activeConversationId);
			}
			if (secondaryId && !isDemoId(secondaryId) && secondaryId !== activeConversationId) {
				watchedSecondaryConversationRef.current = secondaryId;
				socket.emit('whatsapp:conversation:watch', secondaryId);
			}
			if (isReconnect) {
				if (accountIdRef.current) {
					// Delta catch-up: merge rows changed during the gap into the painted inbox.
					loadConversations(accountIdRef.current, 1, false, {
						background: true,
						updatedSince: takeDeltaSince(),
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
		let connectedAt = 0;
		socket.on('connect', () => {
			connectedAt = Date.now();
			setSocketLive(true);
			rewatchRooms();
		});
		socket.on('connect_error', error => {
			console.warn(`[whatsapp socket] ${socketBaseUrl}: ${error?.message || error}`);
		});
		socket.on('disconnect', (reason) => {
			setSocketLive(false);
			markRealtimeGap();
			// Socket.IO does not auto-reconnect after a server-side disconnect
			// (e.g. JWT expiry). Retry with backoff; the next handshake reads a fresh token.
			if (reason !== 'io server disconnect' || serverDisconnectRetryTimer) return;
			if (Date.now() - connectedAt > 30_000) serverDisconnectRetries = 0;
			const delay = Math.min(60_000, 2_000 * 2 ** serverDisconnectRetries);
			serverDisconnectRetries += 1;
			serverDisconnectRetryTimer = setTimeout(() => {
				serverDisconnectRetryTimer = null;
				if (socketRef.current === socket && localStorage.getItem('accessToken')) {
					socket.connect();
				}
			}, delay);
		});
		let reconnectReloadTimer = null;
		let reconnectReloadThread = false;
		const scheduleReconnectReload = ({ withThread = false } = {}) => {
			reconnectReloadThread = reconnectReloadThread || withThread;
			if (reconnectReloadTimer) clearTimeout(reconnectReloadTimer);
			reconnectReloadTimer = setTimeout(() => {
				reconnectReloadTimer = null;
				const reloadThread = reconnectReloadThread;
				reconnectReloadThread = false;
				const activeAccountId = accountIdRef.current;
				if (!activeAccountId) return;
				// Merge into what is shown (no wipe), so the list does not jump or empty out.
				loadConversations(activeAccountId, 1, false, {
					background: true,
					updatedSince: takeDeltaSince(),
				}).catch(() => { });
				const openId = conversationIdRef.current;
				if (reloadThread && openId && !isDemoId(openId)) {
					// DB catch-up only: keeps the warm message cache, no provider pull.
					loadMessagesRef.current?.(openId, true, { forceProvider: false })?.catch?.(() => { });
				}
			}, 1500);
		};
		let accountsRefreshTimer;
		const refreshAccountsSoon = () => {
			if (accountsRefreshTimer) return;
			accountsRefreshTimer = setTimeout(() => {
				accountsRefreshTimer = null;
				loadAccounts().catch(() => { });
			}, 800);
		};
		// Team presence (admins only; the server sends nothing to others).
		socket.on('whatsapp:presence', payload => {
			if (Array.isArray(payload?.items)) setStaffOnline(prev => keepStaffListIfSame(prev, payload.items));
		});
		socket.on('whatsapp:presence-watch', payload => {
			if (payload?.accountId && accountIdRef.current && payload.accountId !== accountIdRef.current) return;
			presenceWatchAlertRef.current?.(payload);
		});
		socket.on('whatsapp:event', event => {
			// Defense in depth: conversation events now carry accountId too.
			const watchedAccountId = accountIdRef.current;
			if (event.accountId && watchedAccountId && event.accountId !== watchedAccountId) return;
			const activeConversationId = conversationIdRef.current;
			const eventConversationId = event.conversationId || event.payload?.conversationId;
			// Staff limited to their chats keep their own unread, apart from the owner's.
			if (event.event === 'conversation_updated' && event.payload) {
				event = {
					...event,
					payload: unreadPayloadForViewer(event.payload, {
						seesWholeAccount: seesWholeAccountRef.current,
					}),
				};
			}
			if (event.event === 'ai_agent.state') {
				if (eventConversationId) {
					window.dispatchEvent(new CustomEvent(AI_AGENT_STATE_EVENT, { detail: event.payload }));
				}
				return;
			}
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
				const previousComplete = isMessageThreadCacheComplete(previous);
				const nextEntry = {
					items: nextCached,
					// Socket-only seeds must keep hasMore true so open-chat
					// treats them as incomplete and refetches Postgres.
					hasMore: previousComplete ? previous?.hasMore !== false : true,
					cachedAt: Date.now(),
					providerHydratedAt: previous?.providerHydratedAt || 0,
					lastProviderSyncAt: previous?.lastProviderSyncAt || null,
					lastSyncReason: previous?.lastSyncReason || null,
				};
				// Adapter writes RQ; incomplete pages are forced to refetch in loadMessages.
				messagesCacheRef.current.set(targetConversationId, nextEntry);
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
				if (
					secondaryConversationIdRef.current &&
					targetConversationId === secondaryConversationIdRef.current
				) {
					setSplitLiveMessage({
						...event.payload,
						conversationId: targetConversationId,
						_liveAt: Date.now(),
					});
				}
				const viewingLiveThread =
					(targetConversationId === activeConversationId ||
						targetConversationId === secondaryConversationIdRef.current) &&
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
				if (inbound && !alreadyKnown) {
					// Their message is in, so they stopped typing (WhatsApp does not always send `paused`).
					// Groups keep their other members' typing; the TTL covers the sender there.
					const row = conversationsRef.current.find(item => item.id === targetConversationId);
					if (row && row.type !== 'group' && !String(row.providerChatId || '').endsWith('@g.us')) {
						clearConversationTyping(targetConversationId);
					}
				}
				if (inbound && !alreadyKnown && !viewingLiveThread) {
					const peer = conversationsRef.current.find(
						item => item.id === targetConversationId,
					);
					const desktopAlert =
						tabLeaderRef.current?.isLeader !== false && whatsappNotificationsEnabledRef.current;
					// On Board / Reports / Settings … the chat list is hidden, so the message would go unseen.
					const inAppAlert = !isConversationWorkspaceTab(activeTabRef.current);
					if (desktopAlert || inAppAlert) {
						// A chat missing from the loaded list used to count as "not muted".
						void shouldNotifyForConversation(peer, targetConversationId, notifyStateCacheRef.current).then(allowed => {
							if (!allowed) return;
							const activeLocale = localeRef.current;
							const isArabic = activeLocale === 'ar';
							const title =
								conversationTitle(peer) ||
								event.payload?.contactName ||
								(isArabic ? 'رسالة واتساب' : 'WhatsApp');
							const body = isViewOnceMessage(event.payload)
								? viewOnceMessageLabel(event.payload, activeLocale)
								: String(event.payload?.text || '').trim() ||
								(event.payload?.type === 'image'
									? isArabic
										? 'صورة'
										: 'Photo'
									: event.payload?.type === 'video'
										? isArabic
											? 'فيديو'
											: 'Video'
										: event.payload?.type === 'ptt' || event.payload?.type === 'audio'
											? isArabic
												? 'رسالة صوتية'
												: 'Voice message'
											: isArabic
												? 'رسالة جديدة'
												: 'New message');
							if (inAppAlert && !isConversationWorkspaceTab(activeTabRef.current)) {
								showWhatsAppIncomingToast({
									conversationId: targetConversationId,
									title,
									body,
									avatarSrc: peer ? conversationAvatarUrl(peer) : '',
									isGroup:
										peer?.type === 'group' ||
										String(peer?.providerChatId || '').endsWith('@g.us'),
									locale: activeLocale,
									// The soft chime follows the account's notification switch.
									sound: whatsappNotificationsEnabledRef.current,
									onOpen: () => {
										setActiveTab('chats');
										openConversationRef.current?.(targetConversationId, peer);
									},
								});
							}
							if (desktopAlert && whatsappNotificationsEnabledRef.current) {
								showWhatsAppDesktopNotification({
									title,
									body,
									conversationId: targetConversationId,
									accountId: accountIdRef.current,
									locale: activeLocale,
									enabled: whatsappNotificationsEnabledRef.current,
								});
							}
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
			if (event.event === 'message_receipts') {
				refreshOpenMessageInfoRef.current?.(event.payload?.messageId);
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
			if (event.event === 'message_reactions' && eventConversationId) {
				const reactedMessageId =
					event.payload.messageId || event.payload.providerMessageId;
				updateCachedMessage(
					eventConversationId,
					reactedMessageId,
					message => ({
						...message,
						reactions: replaceReactionList(
							event.payload.reactions,
							message.reactions,
						),
					}),
				);
				// WhatsApp inbox: show peer reactions on the chat-list preview row.
				setConversations(current => {
					let touched = false;
					const next = current.map(item => {
						if (item.id !== eventConversationId) return item;
						const last = item.lastMessage;
						if (!last) return item;
						const sameLast =
							(event.payload.messageId && last.id === event.payload.messageId) ||
							(event.payload.providerMessageId &&
								last.providerMessageId === event.payload.providerMessageId);
						if (!sameLast) return item;
						touched = true;
						const reactions = replaceReactionList(
							event.payload.reactions,
							last.reactions,
						);
						const peerAt = latestPeerReaction({ reactions })?.reactedAt;
						const peerTime = new Date(peerAt || 0).getTime();
						const currentTime = new Date(
							item.lastMessageAt || last.providerTimestamp || 0,
						).getTime();
						const bump =
							Number.isFinite(peerTime) &&
							peerTime > 0 &&
							(!Number.isFinite(currentTime) || peerTime >= currentTime);
						return {
							...item,
							lastMessage: { ...last, reactions },
							...(bump && peerAt ? { lastMessageAt: peerAt } : {}),
						};
					});
					if (!touched) return current;
					return sortConversationsByActivity(next);
				});
			}
			if (event.event === 'attachment_ready' && event.payload?.attachmentId) {
				const attachmentId = String(event.payload.attachmentId);
				// Attachment bytes are immutable for a given id, and the blob cache only
				// holds successful fetches. Evicting a blob we already hold makes the
				// bubbles re-download media we have in memory, so only drop misses.
				const alreadyDownloaded = Boolean(getCachedAttachmentBlob(attachmentId));
				if (!alreadyDownloaded) forgetAttachmentBlob(attachmentId);
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
					if (Object.prototype.hasOwnProperty.call(changes, 'isPinned')) {
						void loadPinnedMessages(activeConversationId);
					}
				}
			}
			if (
				event.event === 'message_updated' &&
				eventConversationId &&
				(event.payload?.changes?.deletedMode || event.payload?.changes?.editHistory)
			) {
				const { messageId, changes } = event.payload;
				if (eventConversationId !== activeConversationId) {
					updateCachedMessage(eventConversationId, messageId, message => ({ ...message, ...changes }));
				}
				setConversations(current => {
					let touched = false;
					const next = current.map(item => {
						if (item.id !== eventConversationId || item.lastMessage?.id !== messageId) return item;
						touched = true;
						return { ...item, lastMessage: { ...item.lastMessage, ...changes } };
					});
					return touched ? next : current;
				});
			}
			if (event.event === 'conversation_deleted' && event.payload?.conversationId) {
				const deletedId = event.payload.conversationId;
				const deletedConversation = conversationsRef.current.find(
					item => item.id === deletedId,
				);
				const wasArchived = Boolean(deletedConversation?.isArchived);
				setConversations(current => current.filter(item => item.id !== deletedId));
				if (wasArchived) {
					setArchivedCount(current => Math.max(0, current - 1));
					patchArchivedUnread(-conversationUnreadCount(deletedConversation));
				}
				const cachedAccountId = accountIdRef.current;
				const cached = cachedAccountId
					? conversationsCacheRef.current.get(cachedAccountId)
					: null;
				if (cached) {
					conversationsCacheRef.current.set(cachedAccountId, {
						...cached,
						items: (cached.items || []).filter(item => item.id !== deletedId),
						archivedCount: wasArchived
							? Math.max(0, (cached.archivedCount || 1) - 1)
							: cached.archivedCount || 0,
						cachedAt: Date.now(),
					});
				}
				messagesCacheRef.current.delete(deletedId);
				if (conversationIdRef.current === deletedId) {
					setConversationId(null);
					clearConversationMessages(null);
				}
				if (secondaryConversationIdRef.current === deletedId) {
					setSecondaryConversationId(null);
				}
				notifyWhatsAppUnreadChanged();
			} else if (event.event === 'conversation_updated' && event.payload?.preview && accountIdRef.current) {
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
				event.event === 'conversation_updated' &&
				event.payload?.reason === 'avatar_hydrated' &&
				accountIdRef.current
			) {
				const targetId = event.payload.conversationId;
				const avatarUrl = String(event.payload.avatarUrl || '').trim();
				if (targetId && avatarUrl) {
					const patchAvatar = item => {
						if (!item || item.id !== targetId) return item;
						if (item.contact) {
							return { ...item, contact: { ...item.contact, avatarUrl } };
						}
						if (item.group) {
							return { ...item, group: { ...item.group, avatarUrl } };
						}
						return item;
					};
					setConversations(current => current.map(patchAvatar));
				} else {
					scheduleReloadConversations(accountIdRef.current);
				}
			} else if (
				['conversation_updated', 'conversation_assignment'].includes(event.event) &&
				accountIdRef.current
			) {
				// Structural change (assignment, reconciliation with no specific
				// preview) — fall back to a full reload.
				scheduleReloadConversations(accountIdRef.current);
				notifyWhatsAppUnreadChanged();
			}
			if (
				event.event === 'conversation_read' &&
				readEventClearsViewer(event.payload, {
					seesWholeAccount: seesWholeAccountRef.current,
					viewerUserId,
				})
			) {
				setConversationUnreadCount(
					eventConversationId || event.payload?.conversationId,
					0,
				);
				notifyWhatsAppUnreadChanged();
			}
			if (event.event === 'online_contacts') {
				handlers().applyOnlineContactsSnapshot?.(event.payload);
			}
			if (event.event === 'presence') {
				const targetId = eventConversationId || null;
				if (!targetId) return;
				const eventTyping = Boolean(
					event.payload?.typing ||
						event.payload?.state === 'composing' ||
						event.payload?.state === 'recording',
				);
				const eventRecording = Boolean(
					event.payload?.recording || event.payload?.state === 'recording',
				);
				const isOnline = Boolean(event.payload?.isOnline);
				const lastSeen = Number(event.payload?.lastSeen || 0);
				const state = String(event.payload?.state || 'unavailable');
				const existing = conversationsRef.current.find(item => item.id === targetId);
				// Groups: each event is one member; keep everyone currently typing.
				const groupTypers =
					event.payload?.isGroup && event.payload?.participantJid
						? applyGroupTyperPresence(
								existing?.presence?.typers,
								{
									participantJid: event.payload.participantJid,
									participantPhone: event.payload.participantPhone,
									senderName: event.payload.senderName,
									typing: eventTyping,
									recording: eventRecording,
								},
								Date.now(),
								TYPING_INDICATOR_TTL_MS,
							)
						: null;
				const typing = groupTypers ? groupTypers.length > 0 : eventTyping;
				const recording = groupTypers
					? groupTypers.length > 0 && groupTypers.every(item => item.recording)
					: eventRecording;
				const senderName = groupTypers
					? groupTypersLabel(groupTypers, locale)
					: String(event.payload?.senderName || '');
				const resolvedLastSeen = resolvePresenceLastSeen(existing?.presence, {
					online: isOnline,
					typing,
					recording,
					lastSeen,
					t: event.payload?.t || Date.now(),
				});
				const presence = {
					typing,
					recording,
					online: isOnline,
					state,
					t: event.payload?.t || Date.now(),
					senderName: typing ? senderName : '',
					...(groupTypers ? { typers: groupTypers } : {}),
					lastSeen: resolvedLastSeen || undefined,
					confirmedOffline: state === 'unavailable' && !isOnline,
					lastSeenRestricted: Boolean(event.payload?.lastSeenRestricted),
				};
				setConversations(current => {
					const row = current.find(item => item.id === targetId);
					if (!row || isSameConversationPresence(row, presence)) return current;
					return current.map(item =>
						item.id === targetId
							? { ...item, isTyping: typing, typing, presence }
							: item,
					);
				});
				setOnlineContacts(current => {
					const idx = current.findIndex(item => item.conversationId === targetId);
					const patch = {
						conversationId: targetId,
						online: isOnline || typing || recording,
						status: recording
							? 'recording'
							: typing
								? 'typing'
								: isOnline
									? 'online'
									: 'offline',
						state: presence.state,
						typing,
						recording,
						lastSeen: resolvedLastSeen || 0,
						updatedAt: Number(presence.t) || Date.now(),
					};
					if (idx < 0) {
						const conv = conversationsRef.current.find(item => item.id === targetId);
						if (!conv && !isOnline && !typing) return current;
						return [
							{
								...patch,
								name: conversationTitle(conv) || 'Contact',
								phoneNumber: conv?.contact?.phoneNumber || null,
								avatarUrl:
									conversationAvatarUrl(conv) || conv?.contact?.avatarUrl || null,
							},
							...current,
						];
					}
					const next = [...current];
					next[idx] = { ...next[idx], ...patch };
					return next;
				});
				if (typing) {
					armTypingTtl(targetId);
				} else {
					const clearKey = `presence-ttl:${targetId}`;
					window.clearTimeout(presenceTtlTimersRef.current[clearKey]);
					delete presenceTtlTimersRef.current[clearKey];
				}
			}
			if (event.event === 'typing_attempt' && event.payload?.attempt) {
				setTypingAttemptEvent({ ...event.payload, receivedAt: Date.now() });
			}
			if (event.event === 'statuses_updated' && accountIdRef.current) {
				const deletedId = event.payload?.reason === 'status_deleted'
					? String(event.payload?.statusMessageId || '')
					: '';
				if (deletedId) {
					// The poster deleted it: drop it from the live list and mark the history copy.
					const matches = item =>
						String(item?.providerStatusId || '') === deletedId ||
						String(item?.providerStatusId || '').includes(`status@broadcast_${deletedId}`);
					const revokedAt = new Date().toISOString();
					setStatuses(prev => prev.filter(item => !matches(item)));
					setStatusHistory(prev =>
						prev.map(item => (matches(item) ? { ...item, revokedAt: item.revokedAt || revokedAt } : item)),
					);
				}
				void refreshStatusesFromProviderRef.current?.(accountIdRef.current, {
					silent: true,
					force: true,
				});
			}
			if (
				event.event === 'status_interactions_updated' &&
				event.accountId === accountIdRef.current &&
				event.payload?.statusMessageId
			) {
				storyInteractionEventRef.current?.(event.payload);
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
					// A relink can finish several syncs in a row. Reloading for each one wiped and
					// reopened the list and the open chat again and again; one quiet merge after the
					// burst keeps what is on screen and still brings the new rows in.
					scheduleReconnectReload({ withThread: !backgroundHydrate });
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
				if (status !== 'connected') markRealtimeGap();
				if (status === 'connected' && accountIdRef.current) {
					// Reconnects come in bursts while a device relinks; catch up once after it settles.
					scheduleReconnectReload({ withThread: true });
				}
			}
		});
		return () => {
			if (reconnectReloadTimer) clearTimeout(reconnectReloadTimer);
			if (accountsRefreshTimer) clearTimeout(accountsRefreshTimer);
			if (serverDisconnectRetryTimer) clearTimeout(serverDisconnectRetryTimer);
			if (reloadConversationsTimer.current) clearTimeout(reloadConversationsTimer.current);
			socketRef.current = null;
			watchedConversationRef.current = null;
			watchedSecondaryConversationRef.current = null;
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
		// Nothing on offer (no QR / pairing code) means nobody is linking right now: a
		// disconnected account at once, a pending one after ~20s of empty answers. Then ask
		// every ~15s instead of every 2.5s (it was ~50 requests a minute, forever). A new QR
		// still shows at once: it is also pushed over the socket, and any status change
		// restarts this effect at full speed.
		const QUIET_EVERY = 6;
		const EMPTY_BEFORE_QUIET = 8;
		let quiet = false;
		let quietTicks = 0;
		let emptyAnswers = 0;
		const pollQr = async () => {
			if (quiet && ++quietTicks < QUIET_EVERY) return;
			quietTicks = 0;
			try {
				const { data } = await api.get(`/whatsapp/accounts/${id}/qr`);
				const offered = Boolean(data.qr || data.pairingCode);
				emptyAnswers = offered ? 0 : emptyAnswers + 1;
				quiet =
					!offered &&
					(['disconnected', 'error'].includes(status) || emptyAnswers >= EMPTY_BEFORE_QUIET);
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
		};
		const poller = createVisiblePoller({
			load: pollQr,
			intervalMs: 2500,
			debounceMs: 0,
			immediate: false,
		});
		poller.start();
		return () => poller.stop();
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
				if (linkModeRef.current === 'phone') return;
				const hadSession = Boolean(
					selectedAccount.lastConnectedAt ||
						selectedAccount.initialHydratedAt ||
						selectedAccount.phoneNumber,
				);
				setAccountBusy(true);
				const { data } = await api.post(
					`/whatsapp/accounts/${id}/connect`,
					hadSession ? {} : { mode: 'qr' },
				);
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
				if (accountIdRef.current === id) {
					setAccountBusy(false);
					setSessionProbeDone(true);
				}
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
				revokeStoryUrl(statusMediaUrlRef.current);
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

	// Story rings: DB-only refresh on Chats (fast); full provider sync on Stories tab.
	useEffect(() => {
		if (!['chats', 'statuses'].includes(activeTab) || !accountId || !isAccountConnected || !seesWholeAccount) {
			return undefined;
		}
		const poller = createVisiblePoller({
			intervalMs: STATUSES_CACHE_TTL,
			immediate: false,
			load: () =>
				activeTab === 'statuses'
					? refreshStatusesFromProviderRef.current?.(accountId, { silent: true })
					: loadStatuses(accountId, { silent: true, providerRefresh: false, force: true }),
		});
		poller.start();
		return () => poller.stop();
	}, [activeTab, accountId, isAccountConnected, loadStatuses, seesWholeAccount]);

	useEffect(() => {
		if (!['chats', 'statuses'].includes(activeTab) || !accountId || !seesWholeAccount) return;
		void loadStatuses(accountId, {
			silent: true,
			providerRefresh: activeTab === 'statuses',
		});
	}, [activeTab, accountId, loadStatuses, seesWholeAccount]);

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

	const sendMessage = async (event, options = {}) => {
		event?.preventDefault?.();
		if (recordingVoice) {
			pinThreadToBottomRef.current = true;
			stopVoiceRecording(true);
			return;
		}
		// Files picked for this chat go first, then any images and the typed text below.
		const stagedFiles = composerFilesRef.current;
		if (stagedFiles.length) {
			if (!conversationId) return;
			pinThreadToBottomRef.current = true;
			setComposerFilesState([]);
			sendComposerFilesNow(stagedFiles.map(item => item.file));
			const nothingElse =
				!composerImagesRef.current.some(item => item?.file && !item.uploading) && !getDraft().trim();
			if (nothingElse) return;
		}
		const stagedComposerImages = composerImagesRef.current.filter(
			item => item?.file && !item.uploading,
		);
		if (stagedComposerImages.length) {
			if (!conversationId) return;
			if (!accountId) {
				toast.error(
					locale === 'ar'
						? 'اربط حساب واتساب قبل إرسال الصور'
						: 'Link a WhatsApp account before sending images',
				);
				return;
			}
			pinThreadToBottomRef.current = true;
			const targetConversationId = conversationId;
			const uploadAccountId = accountId;
			const caption = getDraft().trim();
			const replySnapshot = replyingTo;
			const batch = stagedComposerImages.map(item => ({
				id: item.id,
				file: item.file,
				previewUrl: item.previewUrl,
			}));
			// Free the composer immediately; uploads continue in the background.
			setComposerImagesState([]);
			if (conversationIdRef.current === targetConversationId) {
				if (caption) setDraft('');
				setReplyingTo(null);
			}
			setUploadProgress(null);

			// Every bubble appears at once (one state update), all uploads start together (3 at a
			// time), and the messages are still posted in order. Images used to appear and send one
			// after another, each waiting for the previous upload and send to finish.
			const prepared = batch.map((item, index) => {
				const clientMessageId = newClientMessageId();
				// Separate blob URL for the bubble so clearing the stage strip is safe.
				const optimisticPreviewUrl = URL.createObjectURL(item.file);
				if (item.previewUrl) {
					try {
						URL.revokeObjectURL(item.previewUrl);
					} catch {
						/* ignore */
					}
				}
				return {
					item,
					index,
					clientMessageId,
					optimisticMessage: buildOptimisticMediaMessage({
						conversationId: targetConversationId,
						clientMessageId,
						type: 'image',
						file: item.file,
						previewUrl: optimisticPreviewUrl,
						caption: index === 0 ? caption : '',
						replySnapshot: index === 0 ? replySnapshot : null,
					}),
				};
			});
			persistConversationMessages(targetConversationId, current =>
				mergeMessages(
					current,
					prepared.map(entry => entry.optimisticMessage),
					targetConversationId,
				),
			);
			const uploadSlots = { active: 0, queue: [] };
			const runUpload = file =>
				new Promise((resolve, reject) => {
					const start = () => {
						uploadSlots.active += 1;
						uploadOutgoingMedia(file, 'image', uploadAccountId)
							.then(resolve, reject)
							.finally(() => {
								uploadSlots.active -= 1;
								uploadSlots.queue.shift()?.();
							});
					};
					if (uploadSlots.active < 3) start();
					else uploadSlots.queue.push(start);
				});
			const uploadTasks = prepared.map(entry => {
				const task = runUpload(entry.item.file);
				task.catch(() => {}); // awaited (and reported) in order below
				return task;
			});

			void (async () => {
				for (const entry of prepared) {
					const { item, index, clientMessageId, optimisticMessage } = entry;
					const imageCaption = index === 0 ? caption : '';
					const imageReply = index === 0 ? replySnapshot : null;

					let sent = false;
					try {
						sent = await withAsyncTimeout(
							sendFile(item.file, 'image', {
								conversationId: targetConversationId,
								accountId: uploadAccountId,
								clientMessageId,
								caption: imageCaption,
								replySnapshot: imageReply,
								optimisticMessage,
								clearUploadProgress: true,
								removeOnFailure: true,
								uploadTask: uploadTasks[index],
							}),
							WHATSAPP_MEDIA_SEND_TIMEOUT_MS,
							locale === 'ar' ? 'إرسال الصورة' : 'Image send',
						);
					} catch (error) {
						releaseOptimisticMediaPreview(optimisticMessage);
						persistConversationMessages(targetConversationId, current =>
							current.filter(message => message.id !== optimisticMessage.id),
						);
						toast.error(
							error?.message?.includes('timed out')
								? locale === 'ar'
									? 'انتهت مهلة إرسال الصورة. تحقق من الاتصال وحاول مرة أخرى.'
									: 'Image send timed out. Check your connection and try again.'
								: mediaUploadFailedMessage(error, locale),
						);
						continue;
					}

					if (!sent) {
						releaseOptimisticMediaPreview(optimisticMessage);
						persistConversationMessages(targetConversationId, current =>
							current.filter(message => message.id !== optimisticMessage.id),
						);
					}
				}
			})();
			return;
		}
		if (!conversationId || !getDraft().trim()) return;
		pinThreadToBottomRef.current = true;
		const targetConversationId = conversationId;
		const { text, mentions } = composerMentionCandidates
			? encodeComposerMentions(getDraft().trim(), composerApiRef.current?.getMentions?.() || [])
			: { text: getDraft().trim(), mentions: [] };
		const replySnapshot = replyingTo;
		if (delayedSendOn && !options.skipDelay && !demo.settings.enabled && !mentions.length) {
			const ar = locale === 'ar';
			const gapForTarget =
				replyGapState.conversationId === targetConversationId ? replyGapState.data : null;
			const plan = computeDelayedSend(delayedSendPrefs, gapForTarget, Date.now());
			if (!plan.ok) {
				toast.error(
					plan.reason === 'loading'
						? ar ? 'لسه بنحسب وقت الرد، استنى ثانية.' : 'Still measuring the reply time, try again in a moment.'
						: plan.reason === 'no_my_message'
							? ar ? 'مفيش رسالة منك قبل ردّه نحسب منها.' : 'No message of yours before their reply to measure from.'
							: ar ? 'لسه مارد، فمفيش وقت رد نحسب منه.' : 'They have not replied yet, so there is no reply time.',
				);
				setDelayedSendOpen(true);
				return;
			}
			if (!accountId) {
				toast.error(ar ? 'اربط حساب واتساب الأول' : 'Link a WhatsApp account first');
				return;
			}
			if (sendingRef.current) return;
			sendingRef.current = true;
			setSending(true);
			try {
				const { data: createdSchedule } = await api.post(`/whatsapp/accounts/${accountId}/message-schedules`, {
					type: 'text',
					text,
					conversationIds: [targetConversationId],
					scheduleKind: 'once',
					scheduledAt: new Date(plan.sendAt).toISOString(),
					timezone: browserTimeZone(),
					title: delayedSendTitle(delayedSendPrefs, plan, gapForTarget, ar).slice(0, 160),
					quotedProviderMessageId: replySnapshot?.providerMessageId || undefined,
					// One id per typed message: a double Enter or a retried request saves it once.
					clientMessageId: `delayed:${newClientMessageId()}`,
				});
				if (conversationIdRef.current === targetConversationId) {
					setDraft('');
					setReplyingTo(null);
					// Shows in the waiting queue right away; the reload below confirms it.
					if (createdSchedule?.id) {
						setMessageSchedules(current => [
							...current.filter(item => item.id !== createdSchedule.id),
							createdSchedule,
						]);
					}
				}
				void loadMessageSchedules(targetConversationId);
			} catch (error) {
				toast.error(
					error?.response?.data?.message ||
						(ar ? 'ماقدرناش نجدول الرسالة. الرسالة لسه في الخانة.' : 'Could not schedule the message. It is still in the box.'),
				);
			} finally {
				sendingRef.current = false;
				setSending(false);
			}
			return;
		}
		if (demo.settings.enabled) {
			if (sendingRef.current) return;
			sendingRef.current = true;
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
				sendingRef.current = false;
				setSending(false);
			}
			return;
		}
		const clientMessageId = newClientMessageId();
		const optimisticMessage = {
			id: `pending:${clientMessageId}`,
			conversationId: targetConversationId,
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
			...(mentions.length ? { mentions } : {}),
		};
		setDraft('');
		setReplyingTo(null);
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
		const queue = outboundTextQueueRef.current;
		const previousSend = queue.get(targetConversationId) || Promise.resolve();
		const thisSend = previousSend.catch(() => undefined).then(() => deliverQueuedText());
		queue.set(targetConversationId, thisSend);
		void thisSend.finally(() => {
			if (queue.get(targetConversationId) === thisSend) queue.delete(targetConversationId);
		});
		return;

		async function deliverQueuedText() {
		try {
			const { data } = await api.post(`/whatsapp/conversations/${targetConversationId}/messages`, {
				type: 'text',
				text,
				clientMessageId,
				quotedProviderMessageId: replySnapshot?.providerMessageId || undefined,
				...(mentions.length ? { mentions } : {}),
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
			const failedMessage = {
				...optimisticMessage,
				conversationId: targetConversationId,
				status: 'failed',
				optimistic: false,
				sendError: outboundFailureReason(error),
			};
			const applyFailed = items =>
				(items || []).map(item =>
					item.id === optimisticMessage.id || item.clientMessageId === clientMessageId
						? failedMessage
						: item,
				);
			const currentCache = messagesCacheRef.current.get(targetConversationId);
			if (currentCache) {
				messagesCacheRef.current.set(targetConversationId, {
					...currentCache,
					items: applyFailed(currentCache.items),
					cachedAt: Date.now(),
				});
			}
			if (conversationIdRef.current === targetConversationId) {
				writeConversationMessages(targetConversationId, applyFailed);
			}
			rememberFailedOutbound(failedMessage);
			if (!scheduleOutboundAutoRetry(failedMessage, error, 0)) {
				toast.error(error.response?.data?.message || 'Message failed');
			}
		}
		}
	};

	const persistConversationMessages = (targetConversationId, updater) => {
		const previous = messagesCacheRef.current.get(targetConversationId);
		// Start from what is on screen when this chat is open (plus anything only the cache has).
		// The cache alone could be gone: it lives in React Query without a subscriber, so it is
		// dropped after gcTime, and sending a voice note / photo / file then rebuilt the thread
		// from [] and left only the new message on screen.
		const onScreen =
			conversationIdRef.current === targetConversationId &&
			messagesOwnerRef.current === targetConversationId
				? conversationMessagesRef.current || []
				: [];
		const base = onScreen.length
			? mergeMessages(previous?.items || [], onScreen, targetConversationId)
			: previous?.items || [];
		const nextItems = updater(base);
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

	const sendFileRef = useRef(null);
	const outboundAutoRetryTimersRef = useRef(new Map());

	useEffect(() => {
		const timers = outboundAutoRetryTimersRef.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};
	}, []);

	const scheduleOutboundAutoRetry = (failedMessage, error, attempt) => {
		const clientMessageId = failedMessage?.clientMessageId;
		const conversationKey = failedMessage?.conversationId;
		const delay = autoRetryDelayMs(attempt);
		if (!clientMessageId || !conversationKey || delay == null || !isTransientSendError(error)) {
			return false;
		}
		const timers = outboundAutoRetryTimersRef.current;
		clearTimeout(timers.get(clientMessageId));
		timers.set(
			clientMessageId,
			setTimeout(() => {
				timers.delete(clientMessageId);
				const current = messagesCacheRef.current
					.get(conversationKey)
					?.items?.find(item => item?.clientMessageId === clientMessageId);
				if (current?.status !== 'failed') return;
				void retryOutboundMessage(
					{ ...current, conversationId: current.conversationId || conversationKey },
					{ autoRetryAttempt: attempt + 1 },
				);
			}, delay),
		);
		return true;
	};

	const retryOutboundMessage = useCallback(async (message, options = {}) => {
		if (!message || message.direction !== 'outbound' || message.status !== 'failed') return;
		const targetConversationId =
			message.conversationId || conversationIdRef.current;
		if (!targetConversationId || isDemoId(targetConversationId)) return;
		const clientMessageId = message.clientMessageId || newClientMessageId();
		const pendingMessage = {
			...message,
			conversationId: targetConversationId,
			clientMessageId,
			status: 'pending',
			optimistic: true,
		};
		const apply = items =>
			(items || []).map(item =>
				item.id === message.id || item.clientMessageId === message.clientMessageId
					? pendingMessage
					: item,
			);
		const isText = String(message.type || 'text').toLowerCase() === 'text';
		if (!isText) {
			if (!sendFileRef.current) return;
			let mediaRetry = failedMediaRetries.get(message.id);
			if (!mediaRetry?.file) {
				const recovered = await recoverOutboundMediaFile(message);
				if (recovered) {
					mediaRetry = {
						file: recovered,
						forcedType: String(message.type || '').toLowerCase() || undefined,
						options: {
							conversationId: targetConversationId,
							caption: message.text || '',
							replySnapshot: message.replyTo || null,
						},
					};
					setBounded(
						failedMediaRetries,
						message.id,
						mediaRetry,
						FAILED_MEDIA_RETRY_MAX,
					);
				}
			}
			if (!mediaRetry?.file) {
				if (String(message.id || '').startsWith('pending:')) {
					releaseOptimisticMediaPreview(message);
					persistConversationMessages(targetConversationId, items =>
						(items || []).filter(item => item.id !== message.id),
					);
				}
				toast.error(
					localeRef.current === 'ar'
						? 'أرفق الملف مرة أخرى لإعادة إرساله'
						: 'Attach the file again to resend it',
					{ id: `wa-resend-missing-${message.id}` },
				);
				return;
			}
			persistConversationMessages(targetConversationId, apply);
			const sent = await sendFileRef.current(mediaRetry.file, mediaRetry.forcedType, {
				...mediaRetry.options,
				clientMessageId,
				optimisticMessage: pendingMessage,
			});
			// Only drop the cached File after a successful send. A failed retry must
			// still be able to tap Retry again without re-attaching.
			if (sent) failedMediaRetries.delete(message.id);
			else if (!failedMediaRetries.has(message.id)) {
				setBounded(failedMediaRetries, message.id, mediaRetry, FAILED_MEDIA_RETRY_MAX);
			}
			return;
		}
		persistConversationMessages(targetConversationId, apply);
		try {
			const { data } = await api.post(`/whatsapp/conversations/${targetConversationId}/messages`, {
				type: message.type || 'text',
				text: message.text,
				clientMessageId,
				quotedProviderMessageId: message.quotedProviderMessageId || undefined,
				...(Array.isArray(message.mentions) && message.mentions.length
					? { mentions: message.mentions }
					: {}),
			});
			const confirmedMessage = {
				...data.message,
				clientMessageId,
				replyTo: data.message?.replyTo || message.replyTo || null,
			};
			persistConversationMessages(targetConversationId, items =>
				mergeMessages(items, [confirmedMessage], targetConversationId),
			);
			forgetFailedOutbound(targetConversationId, clientMessageId);
		} catch (error) {
			const failedMessage = {
				...pendingMessage,
				status: 'failed',
				optimistic: false,
				sendError: outboundFailureReason(error),
			};
			persistConversationMessages(targetConversationId, items =>
				(items || []).map(item =>
					item.id === pendingMessage.id || item.clientMessageId === clientMessageId
						? failedMessage
						: item,
				),
			);
			rememberFailedOutbound(failedMessage);
			if (!scheduleOutboundAutoRetry(failedMessage, error, options.autoRetryAttempt || 0)) {
				toast.error(error.response?.data?.message || 'Message failed');
			}
		}
	}, []);

	useEffect(() => {
		const onRetry = event => {
			const message = event.detail?.message;
			if (message) void retryOutboundMessage(message);
		};
		window.addEventListener('wa-retry-outbound', onRetry);
		return () => window.removeEventListener('wa-retry-outbound', onRetry);
	}, [retryOutboundMessage]);

	/** Compress (images) and upload one file; resolves to { uploaded, outgoingFile }. */
	const uploadOutgoingMedia = async (file, type, targetAccountId) => {
		let outgoingFile = file;
		if (type === 'image') {
			const normalizedFile = normalizeComposerImageFile(file) || file;
			try {
				outgoingFile = await withAsyncTimeout(
					compressImageForWhatsApp(normalizedFile),
					20_000,
					locale === 'ar' ? 'تحضير الصورة' : 'Image prepare',
				);
			} catch {
				outgoingFile = normalizedFile;
			}
		}
		const form = new FormData();
		form.append('file', outgoingFile);
		// Send the browser's UTF-8 name separately — Multer often mangles Arabic in originalname.
		if (outgoingFile?.name) {
			form.append('fileName', String(outgoingFile.name));
		}
		const { data: uploaded } = await api.post(
			`/whatsapp/accounts/${targetAccountId}/media`,
			form,
			{
				timeout: WHATSAPP_MEDIA_SEND_TIMEOUT_MS,
				maxBodyLength: Infinity,
				maxContentLength: Infinity,
			},
		);
		return { uploaded, outgoingFile };
	};

	const sendFile = async (file, forcedType, options = {}) => {
		const uploadAccountId =
			options.accountId || selectedConversation?.accountId || accountId;
		const targetConversationId = options.conversationId || conversationId;
		const replySnapshot =
			options.replySnapshot !== undefined ? options.replySnapshot : replyingTo;
		let optimisticMessage = options.optimisticMessage || null;

		const abortOptimistic = () => {
			if (!optimisticMessage) return;
			releaseOptimisticMediaPreview(optimisticMessage);
			if (targetConversationId) {
				persistConversationMessages(targetConversationId, current =>
					current.filter(message => message.id !== optimisticMessage.id),
				);
			}
			if (conversationIdRef.current === targetConversationId) {
				setReplyingTo(current => current || replySnapshot);
			}
		};

		if (!file || !uploadAccountId || !targetConversationId) {
			abortOptimistic();
			return false;
		}
		if (!Number(file.size)) {
			toast.error(
				locale === 'ar' ? 'ملف الصورة فارغ أو تالف' : 'Image file is empty or unreadable',
			);
			abortOptimistic();
			return false;
		}
		if (demo.settings.enabled) {
			toast.error(
				locale === 'ar'
					? 'الوسائط التجريبية مؤجلة حالياً. لم يتم إرسال أي شيء إلى واتساب.'
					: 'Demo media is deferred. Nothing was sent to WhatsApp.',
			);
			if (fileRef.current) fileRef.current.value = '';
			abortOptimistic();
			return false;
		}
		if (file.size > 25 * 1024 * 1024) {
			toast.error('File size must not exceed 25 MB');
			if (fileRef.current) fileRef.current.value = '';
			abortOptimistic();
			return false;
		}
		// Media uploads must not lock the composer — text already sends in the background.
		const ownsSendingLock = options.useSendingLock === true;
		if (ownsSendingLock) {
			if (sendingRef.current || sending) {
				abortOptimistic();
				return false;
			}
			sendingRef.current = true;
			setSending(true);
		}
		const targetAccountId = uploadAccountId;
		const type = outgoingMediaType(file, forcedType);
		const caption =
			type === 'sticker'
				? ''
				: options.caption !== undefined
					? options.caption
					: getDraft().trim();
		const clientMessageId = options.clientMessageId || newClientMessageId();
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

		// Never surface a top-of-thread upload bar — progress lives on the bubble status.
		if (options.clearUploadProgress !== false) {
			setUploadProgress(null);
		}
		try {
			// A batch starts every upload up front (options.uploadTask); the message itself is
			// still posted here, in order.
			const { uploaded, outgoingFile } = options.uploadTask
				? await options.uploadTask
				: await uploadOutgoingMedia(file, type, targetAccountId);
			uploadedFileId = uploaded.fileId;
			const displayFileName =
				String(outgoingFile?.name || '').trim() ||
				String(uploaded.fileName || '').trim() ||
				undefined;
			const { data } = await api.post(
				`/whatsapp/conversations/${targetConversationId}/messages`,
				{
					type,
					fileId: uploaded.fileId,
					fileName: displayFileName,
					caption: caption || undefined,
					clientMessageId,
					quotedProviderMessageId: replySnapshot?.providerMessageId || undefined,
				},
				{ timeout: WHATSAPP_MEDIA_SEND_TIMEOUT_MS },
			);
			uploadedFileId = null;
			const confirmedMessage = {
				...data.message,
				clientMessageId,
				replyTo: data.message?.replyTo || replySnapshot || null,
			};
			persistConversationMessages(targetConversationId, current =>
				mergeMessages(current, [confirmedMessage], targetConversationId),
			);
			// Keep blob preview alive — mergeAttachments still references it until
			// MediaAttachment swaps to the durable server copy.
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
			if (optimisticMessage && options.removeOnFailure) {
				releaseOptimisticMediaPreview(optimisticMessage);
				persistConversationMessages(targetConversationId, current =>
					current.filter(message => message.id !== optimisticMessage.id),
				);
				if (conversationIdRef.current === targetConversationId) {
					setReplyingTo(current => current || replySnapshot);
				}
			} else if (optimisticMessage) {
				const failedId = optimisticMessage.id;
				setBounded(
					failedMediaRetries,
					failedId,
					{
						file,
						forcedType,
						options: {
							accountId: targetAccountId,
							conversationId: targetConversationId,
							caption,
							replySnapshot,
							skipSendingState: options.skipSendingState,
						},
					},
					FAILED_MEDIA_RETRY_MAX,
				);
				persistConversationMessages(targetConversationId, current =>
					current.map(message =>
						message.id === failedId
							? { ...message, status: 'failed', optimistic: false }
							: message,
					),
				);
			}
			toast.error(mediaUploadFailedMessage(error, locale));
			return false;
		} finally {
			if (ownsSendingLock) {
				sendingRef.current = false;
				setSending(false);
			}
			if (!options.skipSendingState || options.clearUploadProgress !== false) {
				setUploadProgress(null);
			}
			if (fileRef.current) fileRef.current.value = '';
		}
	};
	sendFileRef.current = sendFile;

	// A picked document belongs to the chat it was picked in: never carry it to another chat.
	useEffect(() => {
		setComposerFilesState([]);
	}, [conversationId, setComposerFilesState]);

	/** Picked files wait above the composer; nothing is sent until Send. */
	const handleComposerFileInput = files => {
		if (recordingVoice || recordingStarting) return;
		const selected = Array.from(files || []).filter(Boolean);
		if (!selected.length) return;
		const normalized = selected.map(file => normalizeComposerImageFile(file) || file);
		const images = normalized.filter(isComposerImageFile);
		const others = normalized.filter(file => !isComposerImageFile(file));
		if (images.length) queueComposerImages(images);
		if (others.length) {
			setComposerFilesState(current => {
				const next = [...current];
				for (const file of others) {
					const fingerprint = `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
					if (next.some(item => item.fingerprint === fingerprint)) continue;
					if (next.length >= 10) {
						toast.error(locale === 'ar' ? 'يمكن إرفاق 10 ملفات كحد أقصى' : 'You can attach up to 10 files');
						break;
					}
					next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, fingerprint });
				}
				return next;
			});
		}
	};

	/** Send files right away (what the picker used to do; now runs from Send). */
	const sendComposerFilesNow = normalized => {
		if (!normalized.length) return;
		if (normalized.length === 1) {
			void sendFile(normalized[0]);
			return;
		}
		// Several files (videos, documents…): all bubbles at once, uploads in parallel (3 at a
		// time), messages posted in order — instead of one file after another.
		const targetConversationId = conversationId;
		const targetAccountId = selectedConversation?.accountId || accountId;
		if (!targetConversationId || !targetAccountId) return;
		const prepared = normalized.map(file => {
			const clientMessageId = newClientMessageId();
			const type = outgoingMediaType(file);
			return {
				file,
				clientMessageId,
				type,
				optimisticMessage: buildOptimisticMediaMessage({
					conversationId: targetConversationId,
					clientMessageId,
					type,
					file,
					previewUrl: URL.createObjectURL(file),
				}),
			};
		});
		persistConversationMessages(targetConversationId, current =>
			mergeMessages(current, prepared.map(entry => entry.optimisticMessage), targetConversationId),
		);
		let active = 0;
		const waiting = [];
		const runUpload = entry =>
			new Promise((resolve, reject) => {
				const start = () => {
					active += 1;
					uploadOutgoingMedia(entry.file, entry.type, targetAccountId)
						.then(resolve, reject)
						.finally(() => {
							active -= 1;
							waiting.shift()?.();
						});
				};
				if (active < 3) start();
				else waiting.push(start);
			});
		const uploads = prepared.map(entry => {
			const task = runUpload(entry);
			task.catch(() => {}); // reported by sendFile, in order
			return task;
		});
		void (async () => {
			for (let index = 0; index < prepared.length; index += 1) {
				const entry = prepared[index];
				await sendFile(entry.file, entry.type, {
					conversationId: targetConversationId,
					accountId: targetAccountId,
					clientMessageId: entry.clientMessageId,
					optimisticMessage: entry.optimisticMessage,
					uploadTask: uploads[index],
					caption: '',
				});
			}
		})();
	};

	const queueComposerImages = files => {
		if (recordingVoice || recordingStarting) return;
		const current = composerImagesRef.current;
		const next = [...current];
		for (const rawFile of files) {
			const file = normalizeComposerImageFile(rawFile) || rawFile;
			if (file.size > 25 * 1024 * 1024) {
				toast.error('File size must not exceed 25 MB');
				continue;
			}
			const fingerprint = `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
			if (next.some(item => item.fingerprint === fingerprint)) {
				continue;
			}
			if (next.length >= 10) {
				toast.error(locale === 'ar' ? 'يمكن إرفاق 10 صور كحد أقصى' : 'You can attach up to 10 images');
				break;
			}
			next.push({
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				file,
				fingerprint,
				previewUrl: URL.createObjectURL(file),
				uploading: false,
			});
		}
		if (next.length === current.length) return;
		setComposerImagesState(next);
	};

	const removeComposerImage = id => {
		removeComposerImageById(id);
	};

	const handleComposerPaste = event => {
		if (event.defaultPrevented || !conversationId || recordingVoice || !accountId) {
			return;
		}
		const files = clipboardImageFiles(event);
		if (!files.length) return;
		event.preventDefault();
		event.stopPropagation();
		queueComposerImages(files);
	};

	/** Opens the mini audio editor; the actual conversion happens on submit. */
	/** Prefills the save dialog from whichever attachment is being saved. */
	const libraryTitleForMessage = useCallback(
		(message, attachmentId) => {
			const attachment =
				(message?.attachments || []).find(item => String(item?.id) === String(attachmentId)) ||
				(message?.attachments || [])[0] ||
				null;
			return defaultLibraryItemTitle({
				fileName: attachment?.fileName || '',
				type: attachment?.type || message?.type || '',
				timestamp: message?.providerTimestamp || message?.timestamp || message?.created_at || null,
				locale,
			});
		},
		[locale],
	);

	const openVideoToVoiceEditor = (message, attachment) => {
		const attachmentId = String(attachment?.id || '');
		if (!attachmentId || !conversationId) return;
		if (!isPersistedAttachmentId(attachmentId)) {
			toast.error(t.sendAsVoiceFailed);
			return;
		}
		setVideoToVoiceTarget({ messageId: message?.id || attachmentId, attachmentId });
	};

	/**
	 * FFmpeg (plus ElevenLabs isolation when asked) does the work server-side, so
	 * the result arrives through the socket as a normal PTT message.
	 */
	const sendVideoAsVoice = async (attachmentId, editOptions) => {
		if (!attachmentId || !conversationId || sendingVideoAsVoiceId) return;
		setSendingVideoAsVoiceId(attachmentId);
		toast.loading(t.sendingAsVoice, { id: 'wa-video-as-voice' });
		try {
			await api.post(
				`/whatsapp/conversations/${conversationId}/attachments/${attachmentId}/send-as-voice`,
				{ ...(editOptions || {}), clientMessageId: newClientMessageId() },
			);
			toast.success(t.sendAsVoiceDone, { id: 'wa-video-as-voice' });
			setVideoToVoiceTarget(null);
		} catch (error) {
			// Keep the editor open on failure so the settings are not lost.
			toast.error(error?.response?.data?.message || t.sendAsVoiceFailed, {
				id: 'wa-video-as-voice',
			});
		} finally {
			setSendingVideoAsVoiceId('');
		}
	};

	/**
	 * Downloading the video behind a TikTok / Instagram / Facebook link.
	 *
	 * yt-dlp routinely runs longer than a request should stay open, so the server
	 * answers immediately with a `pending` row and we poll until it resolves. Calling
	 * this again on a failed row is the retry path — the server reuses the same row.
	 */
	const startSocialVideoDownload = useCallback(
		async (message, href) => {
			const messageId = String(message?.id || '');
			if (!messageId || !conversationId || !href) return;
			if (demo.settings.enabled) {
				toast.error(
					locale === 'ar'
						? 'تحميل الفيديو غير متاح في العرض التجريبي'
						: 'Video download is not available in demo mode',
				);
				return;
			}
			const targetConversationId = conversationId;
			setSocialDownloads(current => ({
				...current,
				[messageId]: { status: 'pending', sourceUrl: href, errorMessage: null },
			}));
			try {
				const { data } = await api.post(
					`/whatsapp/conversations/${targetConversationId}/messages/${messageId}/social-download`,
					{ url: href },
				);
				setSocialDownloads(current => ({ ...current, [messageId]: data }));
				if (data?.status === 'pending') pollSocialVideoDownloadRef.current(messageId, href);
			} catch (error) {
				setSocialDownloads(current => ({
					...current,
					[messageId]: {
						status: 'failed',
						sourceUrl: href,
						errorMessage:
							error?.response?.data?.message ||
							(locale === 'ar' ? 'فشل تحميل الفيديو' : 'Could not download this video'),
					},
				}));
			}
		},
		[conversationId, demo.settings.enabled, locale],
	);

	// Held in a ref so the poller and the starter can call each other without either
	// having to be declared first.
	const pollSocialVideoDownloadRef = useRef(() => {});
	pollSocialVideoDownloadRef.current = (messageId, href) => {
		const timers = socialPollTimersRef.current;
		if (timers.has(messageId)) return;
		const targetConversationId = conversationId;
		let attempts = 0;
		const stop = () => {
			const timer = timers.get(messageId);
			if (timer) window.clearTimeout(timer);
			timers.delete(messageId);
		};
		const poll = async () => {
			attempts += 1;
			try {
				const { data } = await api.get(
					`/whatsapp/conversations/${targetConversationId}/messages/${messageId}/social-download`,
				);
				const row =
					(data?.items || []).find(item => item.sourceUrl === href) || (data?.items || [])[0];
				if (row) setSocialDownloads(current => ({ ...current, [messageId]: row }));
				if (row && row.status !== 'pending') {
					stop();
					return;
				}
			} catch {
				// A transient poll failure is not a download failure; keep waiting.
			}
			// ~3 minutes, matching the server-side yt-dlp timeout.
			if (attempts >= 90) {
				stop();
				setSocialDownloads(current => {
					const existing = current[messageId];
					if (!existing || existing.status !== 'pending') return current;
					return {
						...current,
						[messageId]: {
							...existing,
							status: 'failed',
							errorMessage:
								locale === 'ar'
									? 'استغرق التحميل وقتًا طويلًا. حاول مرة أخرى.'
									: 'The download took too long. Please try again.',
						},
					};
				});
				return;
			}
			timers.set(messageId, window.setTimeout(poll, 2000));
		};
		timers.set(messageId, window.setTimeout(poll, 1500));
	};

	// Switching conversations must not leave pollers running against the old thread.
	useEffect(() => {
		setSocialDownloads({});
		const timers = socialPollTimersRef.current;
		return () => {
			timers.forEach(timer => window.clearTimeout(timer));
			timers.clear();
		};
	}, [conversationId]);

	/**
	 * Restores videos already downloaded in this thread.
	 *
	 * The rows live on the server, so without this a reload leaves a finished video
	 * invisible until it is downloaded a second time.
	 */
	useEffect(() => {
		if (!conversationId || demo.settings.enabled) return undefined;
		const targetConversationId = conversationId;
		let cancelled = false;
		(async () => {
			try {
				const { data } = await api.get(
					`/whatsapp/conversations/${targetConversationId}/social-downloads`,
				);
				if (cancelled || conversationIdRef.current !== targetConversationId) return;
				const byMessage = {};
				// Newest first from the server, so the first row per message wins.
				for (const row of data?.items || []) {
					if (row?.messageId && !byMessage[row.messageId]) byMessage[row.messageId] = row;
				}
				if (!Object.keys(byMessage).length) return;
				setSocialDownloads(current => ({ ...byMessage, ...current }));
				// A download that was still running when the tab closed keeps going server-side.
				for (const row of Object.values(byMessage)) {
					if (row.status === 'pending') {
						pollSocialVideoDownloadRef.current(row.messageId, row.sourceUrl);
					}
				}
			} catch {
				// Nothing to restore is the normal case; never block opening a thread.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [conversationId, demo.settings.enabled]);

	const clearPendingVoiceDraft = useCallback(() => {
		setPendingVoiceDraft(current => {
			if (current?.previewUrl) {
				try {
					URL.revokeObjectURL(current.previewUrl);
				} catch {
					/* ignore */
				}
			}
			return null;
		});
	}, []);

	const restorePendingVoiceDraft = useCallback((file, seconds = 1) => {
		if (!file) return;
		setPendingVoiceDraft(current => {
			if (current?.previewUrl && current.previewUrl !== file?.previewUrl) {
				try {
					URL.revokeObjectURL(current.previewUrl);
				} catch {
					/* ignore */
				}
			}
			return {
				file,
				seconds: Math.max(1, Number(seconds) || 1),
				previewUrl: URL.createObjectURL(file),
			};
		});
	}, []);

	const sendRecordedVoice = async (file, meta = {}) => {
		const durationSec = Math.max(1, Number(meta.seconds) || 1);
		if (!file || !conversationId || !accountId) {
			if (file) restorePendingVoiceDraft(file, durationSec);
			return false;
		}
		if (file.size > 25 * 1024 * 1024) {
			toast.error('File size must not exceed 25 MB');
			restorePendingVoiceDraft(file, durationSec);
			return false;
		}
		const targetConversationId = conversationId;
		const uploadAccountId = accountId;
		const replySnapshot = replyingTo;
		const clientMessageId = newClientMessageId();
		let optimisticMessage = buildOptimisticMediaMessage({
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
		// Free the composer right away — upload (and optional voice change) runs in the background.
		clearPendingVoiceDraft();
		if (conversationIdRef.current === targetConversationId) {
			setReplyingTo(null);
		}

		const restoreDraftAndBubble = () => {
			releaseOptimisticMediaPreview(optimisticMessage);
			persistConversationMessages(targetConversationId, current =>
				current.filter(message => message.id !== optimisticMessage.id),
			);
			if (conversationIdRef.current === targetConversationId) {
				setReplyingTo(current => current || replySnapshot);
			}
			restorePendingVoiceDraft(file, durationSec);
		};

		void (async () => {
			const settings = voiceChangerSettingsRef.current;
			const provider = String(settings?.provider || 'off');
			const useChanger = Boolean(settings?.enabled) && provider !== 'off';
			const catalogItem = settings?.catalog?.find(item => item.id === provider);
			if (useChanger && catalogItem?.needsKey && !settings?.credentials?.[provider]?.configured) {
				restoreDraftAndBubble();
				toast.error(
					locale === 'ar'
						? 'احفظ مفتاح الـ API أولاً من إعدادات تغيير الصوت.'
						: 'Save an API key first from voice changer settings.',
				);
				return;
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
					const changed = {
						...optimisticMessage,
						attachments: buildOptimisticMediaMessage({
							clientMessageId: `${clientMessageId}-changed`,
							type: 'voice',
							file: outgoing,
							previewUrl: URL.createObjectURL(outgoing),
						}).attachments,
					};
					releaseOptimisticMediaPreview(optimisticMessage);
					optimisticMessage = changed;
					persistConversationMessages(targetConversationId, current =>
						current.map(message => (message.id === changed.id ? changed : message)),
					);
				} catch (error) {
					restoreDraftAndBubble();
					toast.error((await readVoiceChangerError(error, locale)) || t.voiceChanging, {
						id: 'whatsapp-voice-changer',
					});
					return;
				} finally {
					setVoiceChanging(false);
				}
			}

			// Keep the bubble + original File so Retry can resend without re-recording.
			// removeOnFailure used to wipe both, which left "Attach the file again".
			await sendFile(outgoing, 'voice', {
				clientMessageId,
				optimisticMessage,
				conversationId: targetConversationId,
				accountId: uploadAccountId,
				replySnapshot,
				caption: '',
			});
		})();
		return true;
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
					fileName: attachment.fileName || '',
					mimeType: attachment.mimeType,
					type: attachment.type,
					url: attachment.url || '',
					demoAttachment,
					messageId: message.id,
					sentAt:
						message.sentAt ||
						message.providerTimestamp ||
						message.timestamp ||
						message.createdAt ||
						null,
				});
			}
		}
		return items;
	}, []);

	const downloadSelectedMedia = useCallback(async (options = {}) => {
		const fromSelectedMessages = Boolean(options?.fromSelectedMessages);
		if (downloadingSelectedMedia) return;

		const catalog = collectDownloadableAttachments(effectiveMessages);
		const byId = new Map(catalog.map(item => [item.id, item]));

		let selectedIds = [];
		/** @type {Map<string, Set<string>>} messageId → attachment ids included in this download */
		const includedByMessage = new Map();
		const isGroupChat =
			selectedConversation?.type === 'group' ||
			String(selectedConversation?.providerChatId || '').endsWith('@g.us');

		const exportSenderLabel = message => {
			if (!message) return locale === 'ar' ? 'مجهول' : 'Unknown';
			if (message.direction === 'outbound') {
				return (
					selectedAccount?.label ||
					selectedAccount?.phoneNumber ||
					(locale === 'ar' ? 'أنت' : 'You')
				);
			}
			const named = String(message.senderName || '').trim();
			if (named) return named;
			if (!isGroupChat && selectedChatTitle) return selectedChatTitle;
			return locale === 'ar' ? 'جهة اتصال' : 'Contact';
		};

		const exportTimeLabel = message => {
			const raw =
				message?.providerTimestamp ||
				message?.timestamp ||
				message?.sentAt ||
				message?.createdAt ||
				message?.created_at ||
				null;
			const date = raw ? new Date(raw) : null;
			if (!date || Number.isNaN(date.getTime())) return '';
			const loc = locale === 'ar' ? 'ar-EG' : undefined;
			const day = date.toLocaleDateString(loc, {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
			});
			const time = date.toLocaleTimeString(loc, {
				hour: '2-digit',
				minute: '2-digit',
			});
			return `${day} ${time}`;
		};

		if (fromSelectedMessages) {
			const selectedMsgs = sortMessagesByTime(
				(effectiveMessages || []).filter(message =>
					selectedMessageIds.has(String(message?.id || '')),
				),
			);
			for (const message of selectedMsgs) {
				const messageId = String(message?.id || '');
				if (!messageId) continue;
				const ids = new Set();
				for (const attachment of message?.attachments || []) {
					const id = String(attachment?.id || '');
					if (!id) continue;
					const demoAttachment = Boolean(attachment?.demoAttachment || isDemoId(id));
					if (!demoAttachment && !isPersistedAttachmentId(id)) continue;
					if (!byId.has(id)) {
						byId.set(id, {
							id,
							fileName: attachment.fileName || '',
							mimeType: attachment.mimeType,
							type: attachment.type,
							url: attachment.url || '',
							demoAttachment,
							messageId,
							sentAt:
								message.sentAt ||
								message.providerTimestamp ||
								message.timestamp ||
								message.createdAt ||
								null,
						});
					}
					ids.add(id);
					selectedIds.push(id);
				}
				if (ids.size || String(visibleMessageText(message?.text) || '').trim()) {
					includedByMessage.set(messageId, ids);
				}
			}
		} else {
			selectedIds = [...selectedMediaIds];
			for (const id of selectedIds) {
				const meta = byId.get(id);
				const messageId = String(meta?.messageId || '');
				if (!messageId) continue;
				if (!includedByMessage.has(messageId)) includedByMessage.set(messageId, new Set());
				includedByMessage.get(messageId).add(id);
			}
		}

		if (!selectedIds.length && !includedByMessage.size) return;

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

		const fetchBlobViaUrl = async url => {
			const href = absoluteApiUrl(url) || url;
			if (!href) throw new Error('no-url');
			const token =
				typeof window !== 'undefined' ? window.localStorage?.getItem('accessToken') : null;
			const response = await fetch(href, {
				mode: 'cors',
				credentials: 'omit',
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			});
			if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
			const blob = await response.blob();
			if (!blob?.size) throw new Error('empty');
			return blob;
		};

		const loadOneBlob = async id => {
			const meta = byId.get(id);
			if (meta?.demoAttachment) {
				const blob = await demoApi.getMedia(rawDemoId(id));
				if (!blob || blob.size < 8) throw new Error('empty');
				return blob;
			}
			const cached = getCachedAttachmentBlob(id);
			if (cached && cached.size >= 8) return cached;

			const kind = String(meta?.type || 'document').toLowerCase();
			try {
				const blob = await requestAttachmentBlob(id, {
					timeout: 120_000,
					priority: true,
					kind,
				});
				if (!blob || blob.size < 8) throw new Error('empty');
				return blob;
			} catch (firstError) {
				await new Promise(resolve => window.setTimeout(resolve, 600));
				forgetAttachmentBlob(id);
				try {
					const blob = await requestAttachmentBlob(id, {
						timeout: 120_000,
						priority: true,
						kind,
					});
					if (!blob || blob.size < 8) throw new Error('empty');
					return blob;
				} catch {
					if (meta?.url) return fetchBlobViaUrl(meta.url);
					throw firstError;
				}
			}
		};

		try {
			const entries = [];
			const savedNamesByAttachmentId = new Map();

			// Sequential + retry: parallel floods the WA media pull and everything fails.
			for (let index = 0; index < selectedIds.length; index += 1) {
				const id = selectedIds[index];
				const meta = byId.get(id);
				toast.loading(
					`${t.downloadingSelectedMedia} (${index + 1}/${selectedIds.length})`,
					{ id: loadingToast },
				);
				try {
					const blob = await loadOneBlob(id);
					const named = toMediaFile(blob, {
						fileName: meta?.fileName,
						mimeType: meta?.mimeType,
						kind: meta?.type,
						sentAt: meta?.sentAt,
					});
					const name = uniqueName(named.name);
					const file =
						name === named.name ? named : new File([named], name, { type: named.type });
					entries.push(file);
					savedNamesByAttachmentId.set(id, name);
					ok += 1;
				} catch {
					failed += 1;
				}
			}

			// One .txt in chat order: [time] sender — caption, then file names under it.
			const messageById = new Map(
				(effectiveMessages || []).map(message => [String(message?.id || ''), message]),
			);
			const orderedMessageIds = sortMessagesByTime(
				[...includedByMessage.keys()]
					.map(id => messageById.get(id))
					.filter(Boolean),
			).map(message => String(message.id));

			const textLines = [];
			for (const messageId of orderedMessageIds) {
				const message = messageById.get(messageId);
				const caption = String(visibleMessageText(message?.text) || '').trim();
				const timeLabel = exportTimeLabel(message);
				const senderLabel = exportSenderLabel(message);
				const header = [timeLabel ? `[${timeLabel}]` : '', senderLabel].filter(Boolean).join(' ');
				if (caption) {
					if (header) textLines.push(`${header}`);
					textLines.push(caption);
				} else if (header && includedByMessage.get(messageId)?.size) {
					textLines.push(header);
				}
				const attachmentIds = includedByMessage.get(messageId);
				if (!attachmentIds?.size) continue;
				for (const attachment of message?.attachments || []) {
					const id = String(attachment?.id || '');
					if (!attachmentIds.has(id)) continue;
					const label =
						savedNamesByAttachmentId.get(id) ||
						String(attachment?.fileName || byId.get(id)?.fileName || id).trim();
					if (label) textLines.push(label);
				}
				if (caption || attachmentIds.size) textLines.push('');
			}

			while (textLines.length && textLines[textLines.length - 1] === '') {
				textLines.pop();
			}

			if (textLines.length) {
				const stamp = new Date().toISOString().slice(0, 10).replace(/[^\d-]/g, '');
				const textFile = toMediaFile(
					new Blob([`${textLines.join('\n')}\n`], { type: 'text/plain;charset=utf-8' }),
					{
						fileName: stamp ? `selected-${stamp}.txt` : 'selected-messages.txt',
						mimeType: 'text/plain',
						kind: 'document',
						sentAt: null,
					},
				);
				const name = uniqueName(textFile.name);
				entries.push(
					name === textFile.name ? textFile : new File([textFile], name, { type: 'text/plain' }),
				);
			}

			// Selected media but every fetch failed — don't silently hand a lone txt.
			if (selectedIds.length > 0 && ok === 0) {
				toast.error(t.selectedMediaZipEmpty, { id: loadingToast });
				return;
			}

			if (!entries.length) {
				toast.error(t.selectedMediaZipEmpty, { id: loadingToast });
				return;
			}

			toast.loading(t.downloadingSelectedMedia, { id: loadingToast });

			const clearSelection = () => {
				if (fromSelectedMessages) {
					setTicketSelectMode(false);
					setGroupSelectMode(false);
					setSelectedMessageIds(new Set());
				} else {
					setMediaSelectMode(false);
					setSelectedMediaIds(new Set());
				}
			};

			let result;
			try {
				const preferShare = shouldSaveViaShareSheet(
					typeof navigator === 'undefined' ? null : navigator,
					entries,
				);
				// Always zip when we have media files so the caption .txt stays with them.
				const mustZip = ok > 0 && entries.length > 1;
				if (!mustZip && (entries.length === 1 || preferShare)) {
					result = await saveMediaFiles(entries, { locale });
				} else {
					const JSZip = (await import('jszip')).default;
					const zip = new JSZip();
					for (const entry of entries) {
						zip.file(entry.name, entry);
					}
					const zipBlob = await zip.generateAsync({
						type: 'blob',
						compression: 'STORE',
					});
					const stamp = new Date().toISOString().slice(0, 10);
					const chatLabel = String(selectedChatTitle || t.selectedMediaZipName)
						.replace(/[\\/:*?"<>|]+/g, ' ')
						.trim()
						.slice(0, 40);
					const zipName = `${chatLabel || t.selectedMediaZipName}-${stamp}.zip`;
					result = await saveMediaFiles(
						[new File([zipBlob], zipName, { type: 'application/zip' })],
						{ locale },
					);
				}
			} catch {
				toast.error(t.selectedMediaZipEmpty, { id: loadingToast });
				return;
			}

			if (result.status === 'cancelled' || result.status === 'needs-gesture') {
				toast.dismiss(loadingToast);
				return;
			}

			if (result.status !== 'downloaded' && result.status !== 'shared') {
				toast.error(t.selectedMediaZipEmpty, { id: loadingToast });
				return;
			}

			if (failed === 0) {
				toast.success(
					t.selectedMediaDownloaded.replace('{count}', String(ok || textLines.length || 1)),
					{ id: loadingToast },
				);
				clearSelection();
			} else {
				toast.error(
					t.selectedMediaPartialFail
						.replace('{ok}', String(ok))
						.replace('{failed}', String(failed)),
					{ id: loadingToast },
				);
				clearSelection();
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
		selectedAccount,
		selectedChatTitle,
		selectedConversation,
		selectedMediaIds,
		selectedMessageIds,
		t.downloadingSelectedMedia,
		t.selectedMediaDownloaded,
		t.selectedMediaPartialFail,
		t.selectedMediaZipEmpty,
		t.selectedMediaZipName,
		locale,
	]);

	useEffect(() => {
		setMediaSelectMode(false);
		setSelectedMediaIds(new Set());
		setDownloadingSelectedMedia(false);
		setTicketSelectMode(false);
		setSelectedMessageIds(new Set());
		setComposerImagesState(current => {
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
			pinThreadToBottomRef.current = true;
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
		setTranscriptionIntent(null);
		pendingCopyMessagesRef.current = [];
		setTranscriptionSources(selected.map(toTranscriptSource));
	};

	const getSelectedMessagesForCopy = useCallback(() => {
		const ids = new Set(selectedMessageIds);
		return sortMessagesByTime(
			(effectiveMessages || []).filter(
				item => item?.id && ids.has(item.id) && !item.optimistic,
			),
		);
	}, [effectiveMessages, selectedMessageIds]);

	// Who sent a message, for copied text: your own name for outgoing messages, the
	// group member in groups, and the chat's name in one-to-one chats.
	const copySenderName = useCallback(
		message => {
			if (message?.direction === 'outbound') {
				let own = '';
				try {
					const user = JSON.parse(window.localStorage.getItem('user') || 'null');
					own = String(user?.name || user?.fullName || user?.username || '').trim();
				} catch {
					own = '';
				}
				return String(message?.senderUser?.name || '').trim() || own || (locale === 'ar' ? 'أنا' : 'You');
			}
			const fromMessage = groupSenderIdentity(message).name;
			if (selectedIsGroupChat) return fromMessage;
			return conversationTitle(selectedConversation) || fromMessage;
		},
		[locale, selectedConversation, selectedIsGroupChat],
	);

	const finishCopySelectedMessages = useCallback(
		async (messages, textOverrideById = {}) => {
			const copyText = buildSelectedMessagesCopyText(messages, {
				locale,
				transcriptMap: messageTranscripts,
				textOverrideById,
				senderName: copySenderName,
			});
			if (!copyText.trim()) {
				toast.error(t.nothingToCopy);
				return false;
			}
			try {
				await navigator.clipboard.writeText(copyText);
				toast.success(
					t.copiedSelectedMessages.replace('{count}', String(messages.length)),
				);
				return true;
			} catch {
				toast.error(t.copyFailed);
				return false;
			}
		},
		[copySenderName, locale, messageTranscripts, t],
	);

	const copySelectedMessages = useCallback(() => {
		const messages = getSelectedMessagesForCopy();
		if (!messages.length) {
			toast.error(t.selectMessagesFirst);
			return;
		}
		if (messages.length > MAX_TRANSCRIPT_BUNDLE_ITEMS) {
			toast.error(t.tooManySelected.replace('{count}', String(MAX_TRANSCRIPT_BUNDLE_ITEMS)));
			return;
		}
		const needsTranscription = messages.filter(item =>
			messageNeedsTranscription(item, messageTranscripts),
		);
		if (!needsTranscription.length) {
			void finishCopySelectedMessages(messages);
			return;
		}
		const sources = sortMessagesByTime(messages).map(message => {
			const source = toTranscriptSource(message);
			const existing = resolveStoredTranscript(message, messageTranscripts);
			if (existing && (source.kind === 'voice' || source.kind === 'video')) {
				return { ...source, kind: 'text', text: existing };
			}
			return source;
		});
		pendingCopyMessagesRef.current = messages;
		setTranscriptionIntent('copy');
		setTranscriptionSources(sources);
	}, [
		finishCopySelectedMessages,
		getSelectedMessagesForCopy,
		messageTranscripts,
		t,
	]);

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
		const previousReactions = normalizeWhatsAppReactions(message.reactions);
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
			const serverReactions = normalizeWhatsAppReactions(data?.reactions);
			// A successful send that returns before the row is readable used to wipe the
			// optimistic chip with `[]`, so the phone showed the reaction and the web
			// did not. Prefer the server list, but keep our own emoji if it is missing.
			updateCachedMessage(targetConversationId, message.id, current => ({
				...current,
				reactions:
					nextEmoji && !serverReactions.some(reaction => reaction.actorKey === 'me')
						? mergeReactionLists(optimisticReactions, serverReactions)
						: serverReactions.length
							? mergeReactionLists(serverReactions, current.reactions)
							: nextEmoji
								? optimisticReactions
								: serverReactions,
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

	const toggleIncomingTranslation = async (message, text) => {
		const id = message?.id;
		const source = String(text || '').trim();
		if (!id || !source) return;
		const existing = messageTranslations[id];
		if (existing?.open && (existing.text || existing.loading)) {
			setMessageTranslations(prev => ({ ...prev, [id]: { ...prev[id], open: false } }));
			return;
		}
		if (existing?.text && !existing.error) {
			setMessageTranslations(prev => ({ ...prev, [id]: { ...prev[id], open: true, error: null } }));
			return;
		}
		setMessageTranslations(prev => ({
			...prev,
			[id]: { ...(prev[id] || {}), open: true, loading: true, error: null },
		}));
		try {
			const { data } = await api.post(
				'/meta-whatsapp/translate',
				{ text: source.slice(0, 4000), targetLang: 'ar' },
				{ timeout: 30000 },
			);
			setMessageTranslations(prev => ({
				...prev,
				[id]: {
					open: true,
					loading: false,
					text: String(data?.translatedText || '').trim(),
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
					error: typeof msg === 'string' ? msg : (locale === 'ar' ? 'تعذّرت الترجمة' : 'Could not translate'),
				},
			}));
		}
	};

	const handleMessageAction = async (message, action) => {
		if (!message || message.optimistic) return;
		setActionMessageId(null);
		setMultiMessageMenuAnchor(null);
		if (action !== 'react') {
			setActionMessageAnchor(null);
		}
		if (action === 'reply') {
			const snapshot = buildReplySnapshot(message);
			if (!snapshot?.providerMessageId) {
				toast.error(
					locale === 'ar'
						? 'لا يمكن الرد على هذه الرسالة (معرّف واتساب غير متوفر)'
						: 'Cannot reply to this message (WhatsApp id missing)',
				);
				return;
			}
			setReplyingTo(snapshot);
			// Like WhatsApp: Reply puts you straight in the message field (after the menu closes).
			focusComposerForReplyRef.current = true;
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
			openShareMessagesModal([message.id]);
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
		if (action === 'downloadSocialVideo') {
			const link = firstSocialVideoLink(message.text);
			if (!link) {
				toast.error(
					locale === 'ar' ? 'لا يوجد رابط فيديو مدعوم' : 'No supported video link in this message',
				);
				return;
			}
			void startSocialVideoDownload(message, link.href);
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
		if (action === 'viewGallery') {
			const attachmentId = firstGalleryAttachmentId(message);
			if (attachmentId) setActiveChatImageId(attachmentId);
			return;
		}
		if (action === 'copy') {
			const text = buildSelectedMessagesCopyText([message], {
				locale,
				transcriptMap: messageTranscripts,
				senderName: copySenderName,
			});
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
		if (action === 'sendAsVoice' || action === 'saveToLibrary' || action === 'addToStory') {
			if (demo.settings.enabled || isDemoId(conversationId)) {
				toast.error(locale === 'ar' ? 'هذا الإجراء غير متاح في الوضع التجريبي' : 'This action is unavailable in demo mode');
				return;
			}
			const attachmentId = firstPersistedAttachmentId(message);
			if (!attachmentId) {
				toast.error(t.sendAsVoiceFailed);
				return;
			}
			if (action === 'sendAsVoice') {
				openVideoToVoiceEditor(message, { id: attachmentId });
			} else if (action === 'addToStory') {
				const attachment = (message.attachments || []).find(item => item?.id === attachmentId);
				// Open at once; the signed preview URL (so the confirmation can play the video)
				// fills in when it arrives instead of holding the dialog back for a round trip.
				setStoryTarget({
					attachmentId,
					messageId: message.id,
					previewUrl: '',
					durationSeconds: Number(attachment?.durationSeconds) || 0,
					fileSizeBytes:
						Number(attachment?.sizeBytes ?? attachment?.size ?? attachment?.fileSizeBytes) ||
						0,
				});
				void getAttachmentStreamUrl(attachmentId)
					.then(previewUrl =>
						setStoryTarget(current =>
							current?.attachmentId === attachmentId ? { ...current, previewUrl } : current,
						),
					)
					.catch(() => {});
			} else {
				setLibrarySaveTarget({
					attachmentId,
					messageId: message.id,
					defaultTitle: libraryTitleForMessage(message, attachmentId),
				});
			}
			return;
		}
		if (demo.settings.enabled) {
			toast.error(locale === 'ar' ? 'هذا الإجراء غير متاح في الوضع التجريبي' : 'This action is unavailable in demo mode');
			return;
		}
		if (action === 'info') {
			messageInfoTargetRef.current = { conversationId, message };
			setMessageInfo({ loading: true, message });
			setLoadingMessageInfo(true);
			try {
				const { data } = await api.get(
					`/whatsapp/conversations/${conversationId}/messages/${message.id}/info`,
				);
				const liveStatus = preferWhatsAppAckStatus(
					message?.status,
					preferWhatsAppAckStatus(data?.status, data?.acknowledgements?.status),
				);
				setMessageInfo({
					...data,
					status: liveStatus,
					acknowledgements: {
						...(data?.acknowledgements || {}),
						status: liveStatus,
					},
					message: {
						...message,
						status: liveStatus,
					},
				});
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
		if (action === 'pin') {
			setPinnedMessages(current => {
				if (enabled) {
					const next = [
						{ ...message, isPinned: true },
						...(current || []).filter(item => item?.id !== message.id),
					];
					return next;
				}
				return (current || []).filter(item => item?.id !== message.id);
			});
			if (enabled) setPinsPanelOpen(true);
		}
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
			if (action === 'pin') {
				const changes = data.changes || { isPinned: enabled };
				setPinnedMessages(current => {
					if (!enabled) return (current || []).filter(item => item?.id !== message.id);
					const merged = { ...message, ...changes, isPinned: true };
					const without = (current || []).filter(item => item?.id !== message.id);
					return [merged, ...without];
				});
			}
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
			if (action === 'pin') {
				setPinnedMessages(current => {
					if (message.isPinned) {
						const without = (current || []).filter(item => item?.id !== message.id);
						return [{ ...message, isPinned: true }, ...without];
					}
					return (current || []).filter(item => item?.id !== message.id);
				});
			}
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
			openShareMessagesModal(ids);
			return;
		}
		if (action === 'transcribe') {
			openSelectedTranscriptBundle();
			return;
		}
		if (action === 'copy') {
			copySelectedMessages();
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

	useEffect(() => {
		if (sharingMessageIds?.length || forwardingMessage) {
			if (!sharingSourceConversationIdRef.current) {
				sharingSourceConversationIdRef.current =
					conversationIdRef.current || conversationId || null;
			}
		}
	}, [sharingMessageIds, forwardingMessage, conversationId]);

	const shareMessagesAsOriginal = async targetConversationId => {
		const messageIds = Array.isArray(sharingMessageIds)
			? sharingMessageIds
			: forwardingMessage?.id
				? [forwardingMessage.id]
				: [];
		const sourceConversationId =
			sharingSourceConversationIdRef.current ||
			conversationIdRef.current ||
			conversationId;
		if (!messageIds.length || !targetConversationId) {
			toast.error(
				locale === 'ar' ? 'لا توجد رسائل للإرسال' : 'No messages selected to send',
			);
			return;
		}
		if (!sourceConversationId) {
			toast.error(
				locale === 'ar' ? 'افتح المحادثة ثم أعد المحاولة' : 'Open the chat and try again',
			);
			return;
		}
		if (sharingTargetConversationId) return;
		setSharingTargetConversationId(targetConversationId);
		try {
			// Backend downloads media on send — do not block the share API on client prefetch
			// (that saturated the attachment queue and made Send-to feel random / need refresh).
			const selected = (effectiveMessages || []).filter(item => messageIds.includes(item.id));
			for (const message of selected) {
				for (const attachment of message.attachments || []) {
					const id = String(attachment?.id || '');
					if (!isPersistedAttachmentId(id)) continue;
					void requestAttachmentBlob(id, {
						timeout: 12_000,
						priority: false,
						kind: attachment.type,
					}).catch(() => {});
				}
			}
			const { data } = await api.post(
				`/whatsapp/conversations/${sourceConversationId}/messages/share-as-original`,
				{ targetConversationId, messageIds },
				{ timeout: 120_000 },
			);
			const sent = Number(data?.sent || 0);
			const failed = Number(data?.failed || 0);
			setSharingMessageIds(null);
			setForwardingMessage(null);
			sharingSourceConversationIdRef.current = null;
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
			setSharingTargetConversationId(null);
		}
	};

	const deleteSelectedMessage = async mode => {
		const message = deleteMessageTarget;
		if (!message || pendingMessageActions.has(message.id)) return;
		if (message.status === 'failed' && String(message.id || '').startsWith('pending:')) {
			const targetConversationId = message.conversationId || conversationId;
			failedMediaRetries.delete(message.id);
			forgetFailedOutbound(targetConversationId, message.clientMessageId);
			releaseOptimisticMediaPreview(message);
			persistConversationMessages(targetConversationId, current =>
				(current || []).filter(item => item.id !== message.id),
			);
			setDeleteMessageTarget(null);
			return;
		}
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
		if (!attachment?.id) throw new Error('Media is unavailable');
		const demoAttachment = Boolean(attachment.demoAttachment || isDemoId(attachment.id));
		const isVideoSource =
			source?.kind === 'video' ||
			String(attachment?.type || '').toLowerCase() === 'video' ||
			String(attachment?.mimeType || '').toLowerCase().startsWith('video/');
		let blob;
		if (demoAttachment) {
			blob = await demoApi.getMedia(rawDemoId(attachment.id));
		} else if (isVideoSource) {
			// Only the sound is transcribed: the server sends the video's audio track (~5 MB for
			// 10 minutes) instead of the whole video, which timed out or ran the browser out of
			// memory. It may first have to fetch a long video from WhatsApp, hence the long wait.
			const bytes = Number(attachment.fileSizeBytes ?? attachment.sizeBytes ?? attachment.size ?? 0) || 0;
			const timeout = Math.min(30 * 60_000, Math.max(5 * 60_000, Math.ceil(bytes / (256 * 1024)) * 1000));
			blob = await requestAttachmentBlob(attachment.id, { timeout, priority: true, format: 'audio' });
		} else {
			blob = await requestAttachmentBlob(attachment.id, { timeout: 90_000, priority: true });
		}
		if (!blob || blob.size < 8) throw new Error('Media is unavailable');
		const blobType = String(blob.type || '').toLowerCase();
		if (isVideoSource && blobType.startsWith('audio/')) {
			return createTranscriptionFile(
				blob,
				`${String(attachment.fileName || `whatsapp-video-${attachment.id}`).replace(/\.[^.]+$/, '')}.m4a`,
				attachment.id,
				blobType,
				{ kind: 'voice' },
			);
		}
		// Demo media, or a server without the audio-only option (it sends the video itself).
		const forceVideo = isVideoSource || String(attachment?.mimeType || blobType).toLowerCase().startsWith('video/');
		return createTranscriptionFile(
			blob,
			attachment.fileName,
			attachment.id,
			attachment.mimeType || blob.type,
			{ forceVideo, kind: forceVideo ? 'video' : source?.kind },
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
		// Media surfaces (photo, video play, voice waveform) are buttons only for their
		// tap action; holding them must still reach the message menu like WhatsApp.
		const control = event.target.closest('button, a, audio, input, textarea, [role="button"]');
		if (control && !control.hasAttribute('data-wa-press-surface')) return;
		clearTimeout(longPressTimerRef.current);
		const anchorRect = event.currentTarget.getBoundingClientRect();
		longPressOriginRef.current = { x: event.clientX, y: event.clientY };
		longPressTimerRef.current = setTimeout(() => {
			if (navigator.vibrate) navigator.vibrate(15);
			longPressOpenedAtRef.current = Date.now();
			setQuickActions(null);
			clearLongPressSelection();
			setReactionPickerMessageId(null);
			setActionMessageAnchor(anchorRect);
			setActionMessageId(message.id);
		}, LONG_PRESS_MS);
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

	// Swipe-to-reply (touch only). Moves the bubble line imperatively so a drag never
	// re-renders the thread; the bubble has `touch-action: pan-y` so vertical scroll wins.
	const beginSwipeReply = (event, message) => {
		if (event.pointerType !== 'touch' || typeof window === 'undefined') return;
		if (window.innerWidth > 768 || message?.optimistic || message?.isDeleted) return;
		const line = event.currentTarget.closest('.wa-message-line') || event.currentTarget;
		swipeReplyRef.current = {
			message,
			line,
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			axis: null,
			armed: false,
			icon: null,
		};
	};
	const moveSwipeReply = event => {
		const swipe = swipeReplyRef.current;
		if (!swipe || swipe.pointerId !== event.pointerId) return;
		const rtl = document.documentElement.dir === 'rtl';
		const next = swipeReplyState({
			dx: event.clientX - swipe.x,
			dy: event.clientY - swipe.y,
			rtl,
			locked: swipe.axis,
		});
		if (next.axis === 'y') {
			swipeReplyRef.current = null;
			return;
		}
		if (next.axis !== 'x') return;
		if (!swipe.axis) {
			swipe.axis = 'x';
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
			const host = swipe.line.parentElement;
			if (host) {
				if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
				const icon = document.createElement('span');
				icon.className = 'wa-swipe-reply-icon';
				icon.setAttribute('aria-hidden', 'true');
				icon.innerHTML =
					'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"' +
					(rtl ? ' style="transform:scaleX(-1)"' : '') +
					'><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>';
				host.appendChild(icon);
				swipe.icon = icon;
			}
			swipe.line.classList.add('is-swiping');
		}
		swipe.line.style.transform = next.offset ? `translateX(${next.offset}px)` : '';
		if (swipe.icon) {
			swipe.icon.style.opacity = String(Math.min(1, Math.abs(next.offset) / SWIPE_REPLY_TRIGGER_PX));
			swipe.icon.classList.toggle('is-armed', next.armed);
		}
		if (next.armed && !swipe.armed && navigator.vibrate) navigator.vibrate(10);
		swipe.armed = next.armed;
	};
	const endSwipeReply = event => {
		const swipe = swipeReplyRef.current;
		if (!swipe || (event && swipe.pointerId !== event.pointerId)) return;
		swipeReplyRef.current = null;
		if (swipe.axis !== 'x') return;
		swipeConsumedAtRef.current = Date.now();
		const { line, icon } = swipe;
		line.classList.remove('is-swiping');
		line.classList.add('is-swipe-settling');
		line.style.transform = '';
		if (icon) icon.style.opacity = '0';
		window.setTimeout(() => {
			line.classList.remove('is-swipe-settling');
			icon?.remove();
		}, 200);
		if (swipe.armed && event?.type === 'pointerup') {
			setQuickActions(null);
			void handleMessageAction(swipe.message, 'reply');
		}
	};

	/** Phone tap on a bubble: show the quick action bar (or toggle it off). */
	const openMessageQuickActions = (event, message, mine) => {
		if (typeof window === 'undefined' || window.innerWidth > 768) return;
		if (Date.now() - swipeConsumedAtRef.current < 450) return;
		if (Date.now() - longPressOpenedAtRef.current < 800) return;
		if (actionMessageId || message?.optimistic || selectedMessageIds.size) return;
		if (
			event.target.closest?.(
				'button, a, audio, video, input, textarea, [role="button"], [data-wa-press-surface]',
			)
		) {
			return;
		}
		if (String(window.getSelection?.() || '').trim()) return;
		const rect = event.currentTarget.getBoundingClientRect();
		setQuickActions(current =>
			current?.messageId === message.id
				? null
				: {
					messageId: message.id,
					rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
					mine,
				},
		);
	};

	const openComposerFilePicker = ({ accept, capture } = {}) => {
		const input = fileRef.current;
		if (!input) return;
		input.setAttribute(
			'accept',
			accept ||
				'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/bmp,video/mp4,video/webm,video/quicktime,video/3gpp,audio/mpeg,audio/ogg,audio/mp4,audio/webm,application/pdf,.doc,.docx,.xls,.xlsx,.mov,.heic,.heif',
		);
		input.multiple = !capture && (accept === 'image/*,video/*' || accept === 'image/*' || accept === '*/*');
		if (capture) input.setAttribute('capture', capture);
		else input.removeAttribute('capture');
		input.click();
	};

	const handleAttachmentAction = action => {
		setAttachmentSheetOpen(false);
		if (action === 'photos') return openComposerFilePicker({ accept: 'image/*,video/*' });
		if (action === 'camera') return openComposerFilePicker({ accept: 'image/*', capture: 'environment' });
		// Like WhatsApp: any file can go as a document (zip, rar, apk, txt…); the server refuses
		// only types a browser would run as a page.
		if (action === 'document') return openComposerFilePicker({ accept: '*/*' });
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
		if (action === 'aiImage') {
			setStickerPanelOpen(false);
			setAiImagePanelOpen(true);
			return;
		}
		if (action === 'schedule') {
			openSchedulePopover();
			return;
		}
		if (action === 'library') {
			setLibraryOpen(true);
			return;
		}
		if (action === 'voiceChanger') {
			setVoiceChangerOpen(true);
			return;
		}
		if (action === 'emoji') {
			setAiImagePanelOpen(false);
			setStickerPanelOpen(true);
			return;
		}
		if (action === 'delayedSend') {
			setDelayedSendOpen(true);
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

	const isVoiceRecordingMode =
		recordingVoice || recordingStarting || Boolean(pendingVoiceDraft?.file);

	const startVoiceRecording = async () => {
		if (!conversationId || recordingVoice || recordingStarting) return;
		// Recording needs silence: stop any voice note, video or the "now playing" bar.
		pauseAllVoicePlayers();
		if (pendingVoiceDraft?.file) clearPendingVoiceDraft();
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
		setRecordingStarting(true);
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
			setRecordingStarting(false);
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
				const durationSec = Math.max(1, Math.round(recordingSecondsRef.current || 1));
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
				void sendRecordedVoice(file, { seconds: durationSec });
			};

			// One complete blob on stop. A 250ms timeslice splits the WebM header
			// across chunks, and phones then refuse to play the converted note.
			recorder.start();
			// Quarter-second ticks: a whole-second interval kept running through pauses
			// and could gain or lose up to a second on every pause/resume.
			recordingTimerRef.current = setInterval(() => {
				if (mediaRecorderRef.current?.state !== 'recording') return;
				recordingSecondsRef.current += VOICE_TICK_SECONDS;
				const next = Math.floor(recordingSecondsRef.current);
				setRecordingSeconds(next);
				if (next >= VOICE_NOTE_MAX_SECONDS && recorder.state !== 'inactive') {
					discardRecordingRef.current = false;
					recorder.stop();
				}
			}, VOICE_TICK_SECONDS * 1000);
		} catch (error) {
			stream?.getTracks().forEach(track => track.stop());
			recordingStreamRef.current?.getTracks().forEach(track => track.stop());
			recordingStreamRef.current = null;
			mediaRecorderRef.current = null;
			recordingChunksRef.current = [];
			setRecordingStarting(false);
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
		// The first row can be one the client made up (inbox preview, pending send). Page from the
		// oldest row the server knows: a stored UUID, or a phone row ("live:<providerId>").
		const oldest =
			(conversationMessagesRef.current || []).find(item => isServerMessageCursor(item)) ||
			null;
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
		const scrollBox = messageBoxRef.current;
		const wasPinned = pinThreadToBottomRef.current;
		// Only drop the pin when the viewport really left the bottom. Clearing it
		// unconditionally meant one spurious prepend permanently stopped new
		// messages from auto-scrolling for the rest of the conversation.
		const stillAtBottom = scrollBox ? isThreadPinnedToBottom(scrollBox) : false;
		if (!stillAtBottom) pinThreadToBottomRef.current = false;
		if (wasPinned && !stillAtBottom && scrollBox) {
			waScrollLog('loadOlder', 'pin-disabled:start-loadOlder', scrollBox, scrollBox.scrollTop, scrollBox.scrollTop, {
				preserveScroll,
			});
		}
		if (preserveScroll && scrollBox) {
			const virt = messageVirtualRef.current;
			olderScrollRestoreRef.current = {
				conversationId: targetConversationId,
				lockedAt: Date.now(),
				...captureThreadScrollAnchor(scrollBox, {
					virtualItems: virt?.items || [],
					totalSize: virt?.totalSize || 0,
				}),
			};
		} else {
			olderScrollRestoreRef.current = null;
		}
		loadingOlderRef.current = true;
		flushSync(() => {
			setLoadingOlder(true);
		});
		try {
			const { data } = await api.get(
				`/whatsapp/conversations/${targetConversationId}/messages`,
				{
					params: {
						before: oldest?.id,
						limit: OLDER_PAGE_SIZE,
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
				(forceProvider || local.length < OLDER_PAGE_SIZE);
			if (shouldSyncProvider) {
				try {
					const synced = await api.post(
						`/whatsapp/conversations/${targetConversationId}/sync/older`,
						null,
						{
							params: {
								limit: OLDER_PAGE_SIZE,
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
				olderScrollRestoreRef.current = null;
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
			const dbHasMore = local.length >= OLDER_PAGE_SIZE;
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

			const nextRows = groupConsecutiveImageMessages(
				next.filter(isRenderableWhatsAppMessage),
			);
			const addedRows = Math.max(0, nextRows.length - messageRowsRef.current.length);
			let estimatedPrependedHeight = 0;
			for (let i = 0; i < Math.min(addedRows, nextRows.length); i += 1) {
				estimatedPrependedHeight += estimateThreadRow(nextRows, i);
			}
			const virtualizedThread = messageRowsRef.current.length >= 32;

			// Recapture immediately before React prepends older history.
			const box = messageBoxRef.current;
			if (preserveScroll && added > 0 && box) {
				const virt = messageVirtualRef.current;
				olderScrollRestoreRef.current = {
					conversationId: targetConversationId,
					lockedAt: Date.now(),
					...captureThreadScrollAnchor(box, {
						virtualItems: virt?.items || [],
						totalSize: virt?.totalSize || 0,
					}),
					estimatedPrependedHeight,
				};
			} else if (added === 0) {
				olderScrollRestoreRef.current = null;
			}

			flushSync(() => {
				writeConversationMessages(targetConversationId, next);
			});

			if (preserveScroll && added > 0 && box && olderScrollRestoreRef.current) {
				const pending = olderScrollRestoreRef.current;
				const nextTotalSize =
					Number(pending.previousTotalSize || 0) +
					(estimatedPrependedHeight || 0);
				waScrollMark('loadOlder', 'applyThreadScrollAnchor:post-prepend', {
					added,
					estimatedPrependedHeight,
				});
				// One writer only. This used to also call virt.scrollToOffset() with a
				// separately derived target, so two estimates fought each other across
				// frames and the thread visibly crept upward. The restore layout effect
				// refines this same anchor once real measurements land.
				applyThreadScrollAnchor(box, pending, {
					totalSize: virtualizedThread ? nextTotalSize : Number(box.scrollHeight) || 0,
					virtualized: virtualizedThread,
				});
			}

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
		let tries = 0;
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
			if (!el) {
				const rows = messageRowsRef.current || [];
				const index = rows.findIndex(row => {
					const items =
						row?.kind === 'image-gallery' ? row.messages || [] : [row?.message];
					return items.some(item => item && messageMatchesQuotedTarget(item, target));
				});
				if (index >= 0 && tries < 8) {
					tries += 1;
					waScrollMark('scrollAndHighlightQuotedMessage', 'virtualizer.scrollToIndex:quoted', {
						index,
						key,
					});
					messageVirtualRef.current?.scrollToIndex?.(index, { align: 'center' });
					window.setTimeout(apply, 80);
				}
				return;
			}
			waScrollMark('scrollAndHighlightQuotedMessage', 'scrollIntoView:quoted', { key });
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// Flash the quoted bubble itself, on the element: thread rows are memoized and read the
			// highlight from a ref, so the class set through React often never reached the row and
			// the jump happened without any flash (confusing when two messages share a minute).
			const bubble = el.querySelector('.wa-message-bubble') || el;
			bubble.classList.remove('wa-quote-flash');
			void bubble.offsetWidth; // restart the animation when the same message is jumped to again
			bubble.classList.add('wa-quote-flash');
			window.setTimeout(() => bubble.classList.remove('wa-quote-flash'), 2400);
			setHighlightedMessageKey(key);
			if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
			highlightTimerRef.current = window.setTimeout(() => {
				setHighlightedMessageKey(current => (current === key ? null : current));
			}, 2200);
		};
		requestAnimationFrame(() => requestAnimationFrame(apply));
	};

	const jumpToQuotedMessage = async sourceMessage => {
		if (sourceMessage?.replyTo?.isStatus) {
			const key = storyMessageKey(sourceMessage.replyTo.providerMessageId);
			const matches = item => storyMessageKey(item?.providerStatusId) === key;
			const group = key
				? (groupedStatusesRef.current || []).find(item => item?.items?.some(matches))
				: null;
			if (group) {
				openStoryGroup({ ...group, startIndex: group.items.findIndex(matches) });
			} else {
				toast.error(
					locale === 'ar' ? 'هذه الحالة لم تعد متاحة' : 'This story is no longer available',
				);
			}
			return;
		}
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

	const jumpToPinnedMessage = async message => {
		if (!message?.id && !message?.providerMessageId) return;
		const target = {
			id: message.id || null,
			providerMessageId: message.providerMessageId || null,
		};
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
				? 'تعذر العثور على الرسالة المثبّتة'
				: 'Could not find the pinned message',
		);
	};

	const assignConversationTarget = async (targetConversationId, userId) => {
		if (
			demo.settings.enabled ||
			!targetConversationId ||
			isDemoId(targetConversationId)
		) return;
		try {
			if (userId && (canManageWhatsApp || isAdmin)) {
				const person = assignableStaff.find(item => item.id === userId);
				if (person && !person.isOwner && (!person.canView || !person.canUse)) {
					const granted = assignableStaff.map(item => {
						if (item.id !== userId) return item;
						return {
							...item,
							canView: true,
							canUse: true,
							assignable: true,
						};
					});
					setAssignableStaff(granted);
					await persistStaffAccess(granted);
				}
			}
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
		const previousPinnedAt = conversation.pinnedAt || null;
		const nextPinned = !conversation.isPinned;
		const nextPinnedAt = nextPinned ? new Date().toISOString() : null;
		setPendingPreferenceActions(current => new Set(current).add(actionKey));
		setConversations(current =>
			sortConversationsByActivity(
				current.map(item =>
					item.id === conversation.id
						? { ...item, isPinned: nextPinned, pinnedAt: nextPinnedAt }
						: item,
				),
			),
		);
		try {
			const { data } = await api.put(`/whatsapp/conversations/${conversation.id}/pin`, {
				isPinned: nextPinned,
			});
			const confirmedPinnedAt =
				data?.pinnedAt != null ? data.pinnedAt : nextPinnedAt;
			setConversations(current =>
				sortConversationsByActivity(
					current.map(item =>
						item.id === conversation.id
							? {
									...item,
									isPinned: nextPinned,
									pinnedAt: nextPinned ? confirmedPinnedAt : null,
								}
							: item,
					),
				),
			);
			const cached = accountId
				? conversationsCacheRef.current.get(accountId)
				: null;
			if (cached) {
				conversationsCacheRef.current.set(accountId, {
					...cached,
					items: sortConversationsByActivity(
						cached.items.map(item =>
							item.id === conversation.id
								? {
										...item,
										isPinned: nextPinned,
										pinnedAt: nextPinned ? confirmedPinnedAt : null,
									}
								: item,
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
						item.id === conversation.id
							? {
									...item,
									isPinned: previousPinned,
									pinnedAt: previousPinnedAt,
								}
							: item,
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
			const { data } = await api.put(`/whatsapp/conversations/${conversation.id}/mute`, {
				isMuted: true,
				durationMinutes: durationMinutes ?? undefined,
				mutedUntil: mutedUntil || undefined,
			});
			notifyStateCacheRef.current?.clear();
			toast.success(t.muteUpdated);
			if (data?.syncedToWhatsApp === false) toast(t.muteNotSynced, { icon: 'ℹ️' });
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
				const { data } = await api.put(`/whatsapp/conversations/${conversation.id}/mute`, {
					isMuted: false,
				});
				notifyStateCacheRef.current?.clear();
				toast.success(t.muteUpdated);
				if (data?.syncedToWhatsApp === false) toast(t.muteNotSynced, { icon: 'ℹ️' });
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
		const targetId = conversationId;
		const previous = conversationsRef.current.find(item => item.id === targetId)?.unreadCount ?? 0;
		const applyUnread = value =>
			setConversations(current =>
				current.map(item => (item.id === targetId ? { ...item, unreadCount: value } : item)),
			);
		// Shown at once; the request runs behind it and undoes this if it fails.
		applyUnread(Math.max(1, Number(previous) || 0));
		toast.success(locale === 'ar' ? 'تم تعليم المحادثة كغير مقروءة' : 'Marked as unread');
		try {
			const { data } = await api.post(`/whatsapp/conversations/${targetId}/unread`);
			applyUnread(Number(data?.unreadCount) || 1);
			notifyWhatsAppUnreadChanged();
		} catch {
			applyUnread(previous);
			toast.error(locale === 'ar' ? 'تعذر تعليم كغير مقروء' : 'Could not mark unread');
		}
	};

	/** Inbox swipe action: flip read/unread for any row, not only the open chat. */
	const toggleConversationReadState = async conversation => {
		if (!conversation || demo.settings.enabled || isDemoId(conversation.id)) return;
		const previous = conversationUnreadCount(conversation);
		const wasUnread = previous > 0;
		const applyUnread = value =>
			setConversations(current =>
				current.map(item =>
					item.id === conversation.id ? { ...item, unreadCount: value } : item,
				),
			);
		// Flip the row at once; the request runs behind it and undoes this if it fails.
		applyUnread(wasUnread ? 0 : 1);
		try {
			if (wasUnread) {
				await api.post(`/whatsapp/conversations/${conversation.id}/read`, null, {
					params: { manual: true },
				});
				setConversationUnreadCount(conversation.id, 0);
			} else {
				const { data } = await api.post(`/whatsapp/conversations/${conversation.id}/unread`);
				applyUnread(Number(data?.unreadCount) || 1);
			}
			notifyWhatsAppUnreadChanged();
		} catch (error) {
			applyUnread(previous);
			toast.error(
				error.response?.data?.message ||
					(locale === 'ar'
						? wasUnread
							? 'تعذر تعليم المحادثة كمقروءة'
							: 'تعذر تعليم كغير مقروء'
						: wasUnread
							? 'Could not mark as read'
							: 'Could not mark unread'),
			);
		}
	};

	const sortInChatSearchHits = items => {
		const list = Array.isArray(items) ? [...items] : [];
		const stamp = message =>
			new Date(
				message?.providerTimestamp ||
					message?.timestamp ||
					message?.sentAt ||
					message?.createdAt ||
					message?.created_at ||
					0,
			).getTime();
		return list.sort((a, b) => stamp(b) - stamp(a));
	};

	const goToInChatSearchHit = (index, hits = inChatSearchHits) => {
		if (!hits.length) {
			setInChatSearchActiveIndex(-1);
			return;
		}
		const next = Math.min(Math.max(index, 0), hits.length - 1);
		setInChatSearchActiveIndex(next);
		const hit = hits[next];
		if (hit) void jumpToPinnedMessage(hit);
	};

	const stepInChatSearch = delta => {
		if (!inChatSearchHits.length) return;
		const base = inChatSearchActiveIndex < 0 ? 0 : inChatSearchActiveIndex;
		goToInChatSearchHit(base + delta);
	};

	const runInChatSearch = query => {
		const raw = String(query ?? '');
		const q = raw.trim();
		setInChatSearchQuery(raw);
		const reqId = ++inChatSearchReqRef.current;
		window.clearTimeout(inChatSearchTimerRef.current);
		if (!conversationId || !q) {
			setInChatSearchHits([]);
			setInChatSearchActiveIndex(-1);
			setInChatSearchBusy(false);
			return;
		}
		const localHits = sortInChatSearchHits(
			(messages || []).filter(message =>
				String(message.text || '')
					.toLowerCase()
					.includes(q.toLowerCase()),
			),
		);
		setInChatSearchHits(localHits);
		if (localHits.length) {
			setInChatSearchActiveIndex(0);
			void jumpToPinnedMessage(localHits[0]);
		} else {
			setInChatSearchActiveIndex(-1);
		}
		setInChatSearchBusy(true);
		inChatSearchTimerRef.current = window.setTimeout(async () => {
			try {
				const { data } = await api.get(`/whatsapp/conversations/${conversationId}/messages`, {
					params: { q, limit: 50, live: '0' },
				});
				if (reqId !== inChatSearchReqRef.current) return;
				const items = sortInChatSearchHits(
					Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
				);
				if (items.length) {
					setInChatSearchHits(items);
					setInChatSearchActiveIndex(0);
					void jumpToPinnedMessage(items[0]);
				}
			} catch {
				/* keep local hits */
			} finally {
				if (reqId === inChatSearchReqRef.current) setInChatSearchBusy(false);
			}
		}, 300);
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
		} catch (error) {
			const tooLate = /within \d+ minutes/i.test(String(error?.response?.data?.message || ''));
			toast.error(
				tooLate
					? locale === 'ar'
						? 'واتساب بيسمح بتعديل الرسالة خلال 15 دقيقة بس من إرسالها.'
						: 'WhatsApp only lets you edit a message within 15 minutes of sending it.'
					: error?.response?.data?.message || (locale === 'ar' ? 'تعذر تعديل الرسالة' : 'Could not edit message'),
			);
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
				description: locale === 'ar' ? 'صور وفيديو ومستندات والمزيد' : 'Photos, videos, docs and more',
				icon: mediaSelectMode ? X : Images,
				iconTone: 'green',
				opensSubmenu: !mediaSelectMode,
				active: mediaSelectMode,
				disabled: demoBlocked,
				onClick: toggleMediaSelectMode,
			},
			{
				id: 'messages',
				label: ticketSelectMode ? t.cancelSelectMessages : t.selectMessages,
				description: locale === 'ar' ? 'اختيار عدة رسائل' : 'Choose multiple messages',
				icon: ticketSelectMode ? X : ListChecks,
				iconTone: 'lime',
				opensSubmenu: !ticketSelectMode,
				active: ticketSelectMode,
				disabled: demoBlocked,
				onClick: toggleTicketSelectMode,
			},
			{
				id: 'pin',
				dividerBefore: true,
				label: selectedConversation.isPinned ? t.unpinChat : t.pinChat,
				description: locale === 'ar' ? 'أبقِ هذه المحادثة في الأعلى' : 'Keep this chat at the top',
				icon: Pin,
				iconTone: 'blue',
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
				description: locale === 'ar' ? 'كتم تنبيهات هذه المحادثة' : 'Silence alerts for this chat',
				icon: selectedConversation.isMuted ? Bell : BellOff,
				iconTone: 'orange',
				active: selectedConversation.isMuted,
				disabled:
					demoBlocked ||
					pendingPreferenceActions.has(`mute:${selectedConversation.id}`),
				onClick: event => toggleConversationMuted(selectedConversation, event),
			},
			{
				id: 'pinned-messages',
				dividerBefore: true,
				label: t.pinnedMessages,
				description:
					locale === 'ar'
						? 'عرض الرسائل المثبّتة والانتقال إليها'
						: 'View pinned messages and jump to them',
				icon: Pin,
				iconTone: 'blue',
				iconFill: pinsPanelOpen || pinnedMessages.length > 0,
				active: pinsPanelOpen,
				disabled: demoBlocked || demoChat || !conversationId,
				badge: pinnedMessages.length > 0 ? pinnedMessages.length : undefined,
				onClick: event => togglePinsPanel(event),
			},
			{
				id: 'typing-history',
				label: t.typingHistory,
				description:
					locale === 'ar'
						? 'متى كتب العميل وهل أرسل رسالة بعدها'
						: 'When the customer typed and whether a message followed',
				icon: TypingLogIcon,
				iconTone: 'green',
				active: typingHistoryOpen,
				disabled: demoBlocked || demoChat || !conversationId || selectedConversation.type === 'group',
				onClick: () => setTypingHistoryOpen(current => !current),
			},
			{
				id: 'search',
				label: locale === 'ar' ? 'بحث في الشات' : 'Search in chat',
				description: locale === 'ar' ? 'ابحث عن رسائل داخل هذه المحادثة' : 'Find messages in this chat',
				icon: Search,
				iconTone: 'purple',
				active: inChatSearchOpen,
				disabled: demoBlocked,
				onClick: () => {
					setInChatSearchOpen(current => !current);
					if (inChatSearchOpen) {
						setInChatSearchQuery('');
						setInChatSearchHits([]);
						setInChatSearchActiveIndex(-1);
					}
				},
			},
			{
				id: 'check-connection',
				label: locale === 'ar' ? 'اختبار الاتصال' : 'Check connection',
				description:
					locale === 'ar'
						? 'هل هو متصل دلوقتي ورسايلك بتوصله (علامة ولا علامتين)'
						: 'Is it online now and do your messages reach it (one tick or two)',
				icon: Wifi,
				iconTone: 'green',
				disabled: demoBlocked || demoChat || !conversationId || selectedConversation.type === 'group',
				onClick: () => setConnectionCheckFor(conversationId),
			},
			{
				id: 'unread',
				label: locale === 'ar' ? 'تعليم كغير مقروء' : 'Mark as unread',
				description: locale === 'ar' ? 'تعليم الكل كغير مقروء' : 'Mark all as unread',
				icon: EyeOff,
				iconTone: 'navy',
				disabled: demoBlocked || demoChat,
				onClick: () => void markConversationUnread(),
			},
			{
				id: 'favorite',
				dividerBefore: true,
				label: selectedConversation.isFavorite
					? locale === 'ar'
						? 'إزالة من المفضلة'
						: 'Remove from favorites'
					: locale === 'ar'
						? 'إضافة إلى المفضلة'
						: 'Add to favorites',
				description: locale === 'ar' ? 'أضف المحادثة إلى المفضلة' : 'Add chat to favorites',
				icon: Star,
				iconTone: 'pink',
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
				description: locale === 'ar' ? 'إنشاء مهام من الرسائل' : 'Create tasks from messages',
				icon: LayoutGrid,
				iconTone: 'green',
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
				description: locale === 'ar' ? 'عرض المجموعات في هذه المحادثة' : 'View groups in this chat',
				icon: Users,
				iconTone: 'purple',
				opensSubmenu: true,
				active: messageGroupsOpen || Boolean(activeMessageGroup),
				disabled: demoBlocked || demoChat || !conversationId,
				onClick: toggleMessageGroupsPanel,
			},
			{
				id: 'schedule',
				dividerBefore: true,
				label: t.scheduleMessage,
				description: t.scheduleMessageHint,
				icon: CalendarClock,
				iconTone: 'blue',
				opensSubmenu: true,
				disabled: demoBlocked || demoChat || !conversationId || !accountId,
				onClick: event => openSchedulePopover(event),
			},
			{
				id: 'group-select',
				label: groupSelectMode ? t.cancelGroupSelect : t.selectForGroup,
				description: locale === 'ar' ? 'اختيار رسائل لمجموعة' : 'Choose messages for a group',
				icon: ListChecks,
				iconTone: 'lime',
				opensSubmenu: !groupSelectMode,
				active: groupSelectMode,
				disabled: demoBlocked || demoChat || !conversationId,
				onClick: toggleGroupSelectMode,
			},
			// Split view needs a wide screen; phones only get the close action if one is open.
			...(typeof window !== 'undefined' && window.innerWidth <= 768 && !secondaryConversationId
				? []
				: [
						{
							id: 'split',
							label: secondaryConversationId ? t.closeSplitChat : t.openSplitChat,
							description: t.splitChat,
							icon: Columns2,
							iconTone: 'navy',
							active: Boolean(secondaryConversationId || splitPickMode),
							disabled: demoBlocked,
							onClick: toggleSplitChat,
						},
					]),
		// Assigned-only staff do not get the typing log.
		]
			.filter(item => item.id !== 'typing-history' || seesWholeAccount)
			// Not in this menu any more: selecting is Ctrl + click (or long-press on phones), the
			// second chat and scheduling have their own header icons, and Message groups is retired.
			.filter(item => !CHAT_MENU_RETIRED_ITEMS.has(item.id));
	}, [
		seesWholeAccount,
		accountId,
		activeMessageGroup,
		conversationId,
		demo.settings.enabled,
		groupSelectMode,
		locale,
		mediaSelectMode,
		messageGroupsOpen,
		pendingPreferenceActions,
		pinnedMessages.length,
		pinsPanelOpen,
		typingHistoryOpen,
		secondaryConversationId,
		selectedConversation,
		selectedMessageIds,
		sendSelectedToBoard,
		splitPickMode,
		t,
		ticketSelectMode,
		toggleConversationFavorite,
		toggleConversationMuted,
		togglePinsPanel,
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
		setInChatSearchActiveIndex(-1);
		inChatSearchReqRef.current += 1;
		clearPendingVoiceDraft();
	}, [conversationId, clearPendingVoiceDraft]);

	const removeConversationFromInbox = useCallback(
		(targetId, options = {}) => {
			if (!targetId) return;
			const wasArchived = Boolean(options.wasArchived);
			setConversations(current => current.filter(item => item.id !== targetId));
			if (wasArchived) {
				setArchivedCount(current => Math.max(0, current - 1));
				patchArchivedUnread(-(Math.max(0, Number(options.unreadCount) || 0)));
			}
			const cached = accountId ? conversationsCacheRef.current.get(accountId) : null;
			if (cached) {
				conversationsCacheRef.current.set(accountId, {
					...cached,
					items: (cached.items || []).filter(item => item.id !== targetId),
					archivedCount: wasArchived
						? Math.max(0, (cached.archivedCount || 1) - 1)
						: cached.archivedCount || 0,
					cachedAt: Date.now(),
				});
			}
			messagesCacheRef.current.delete(targetId);
			if (conversationIdRef.current === targetId) {
				setConversationId(null);
				clearConversationMessages(null);
			}
			if (secondaryConversationIdRef.current === targetId) {
				setSecondaryConversationId(null);
			}
		},
		[accountId, clearConversationMessages, patchArchivedUnread],
	);

	// Asks in an app dialog (was the browser's window.confirm), then removes at once and rolls back on failure.
	const [deleteChatTarget, setDeleteChatTarget] = useState(null);
	const deleteConversationChat = conversation => {
		if (!conversation?.id) return;
		if (isEmailMemoAiConversation(conversation)) {
			toast.error(
				locale === 'ar'
					? 'لا يمكن حذف محادثة النظام دي'
					: 'This system chat cannot be deleted',
			);
			return;
		}
		setDeleteChatTarget(conversation);
	};
	const confirmDeleteConversationChat = async () => {
		const conversation = deleteChatTarget;
		setDeleteChatTarget(null);
		if (!conversation?.id) return;
		const actionKey = `delete:${conversation.id}`;
		if (pendingPreferenceActions.has(actionKey)) return;
		const isDemoConversation = demo.settings.enabled || isDemoId(conversation.id);
		const previous = conversation;
		setPendingPreferenceActions(current => new Set(current).add(actionKey));
		removeConversationFromInbox(conversation.id, {
			wasArchived: Boolean(conversation.isArchived),
			unreadCount: conversationUnreadCount(conversation),
		});
		try {
			if (isDemoConversation) {
				if (typeof demo.deleteConversation === 'function') {
					await demo.deleteConversation(conversation.id);
				}
			} else {
				await api.delete(`/whatsapp/conversations/${conversation.id}`);
			}
			toast.success(t.chatDeleted);
		} catch (error) {
			setConversations(current => {
				if (current.some(item => item.id === previous.id)) return current;
				return sortConversationsByActivity([previous, ...current]);
			});
			if (previous.isArchived) {
				setArchivedCount(current => current + 1);
				patchArchivedUnread(conversationUnreadCount(previous));
			}
			toast.error(
				error.response?.data?.message ||
					(locale === 'ar' ? 'تعذر حذف المحادثة' : 'Could not delete chat'),
			);
		} finally {
			setPendingPreferenceActions(current => {
				const next = new Set(current);
				next.delete(actionKey);
				return next;
			});
		}
	};

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
		const unread = conversationUnreadCount(conversation);
		if (unread && nextArchived !== previousArchived) {
			patchArchivedUnread(nextArchived ? unread : -unread);
		}
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
			if (unread && nextArchived !== previousArchived) {
				patchArchivedUnread(nextArchived ? -unread : unread);
			}
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
			clearLongPressSelection();
			setConversationActionAnchor(anchorRect);
			setConversationActionTarget(conversation);
		}, LONG_PRESS_MS);
	};

	/** Long-press on the menu backdrop: reopen the menu for the row underneath. */
	const openConversationActionsAt = (x, y) => {
		const row =
			typeof document === 'undefined'
				? null
				: document
						.elementsFromPoint(x, y)
						.map(element => element.closest?.('[data-conversation-id]'))
						.find(Boolean);
		const id = row?.getAttribute('data-conversation-id');
		const next = id ? filteredConversations.find(item => item.id === id) : null;
		if (!row || !next) {
			closeConversationActions();
			return;
		}
		suppressConversationClickRef.current = true;
		if (navigator.vibrate) navigator.vibrate(15);
		setConversationActionAnchor(row.getBoundingClientRect());
		setConversationActionTarget(next);
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
		} else if (action === 'delete') {
			void deleteConversationChat(conversation);
		} else if (action === 'assign') {
			setConversationAssignTarget(conversation);
		} else if (action === 'info') {
			void openConversationInfo(conversation);
		} else if (String(action).startsWith('keepInTouch:')) {
			void setConversationKeepInTouch(conversation, Number(String(action).split(':')[1]) || 0);
		}
	};

	/** Keep in touch (صلة رحم): remind me to message this person every `days` days; 0 stops it. */
	const setConversationKeepInTouch = async (conversation, days) => {
		if (demo.settings.enabled || !conversation?.id || isDemoId(conversation.id)) return;
		const previous = conversation.keepInTouch || null;
		const lastOutboundAt =
			previous?.lastContactAt ||
			(conversation.lastMessage?.direction === 'outbound' ? conversation.lastMessage?.providerTimestamp : null) ||
			null;
		// Shown at once; the reload below brings the server's exact dates and the tab count.
		const optimistic =
			days > 0
				? (() => {
						const last = lastOutboundAt ? new Date(lastOutboundAt).getTime() : 0;
						const due = last ? last + days * 86_400_000 : 0;
						return {
							days,
							lastContactAt: last ? new Date(last).toISOString() : null,
							dueAt: due ? new Date(due).toISOString() : null,
							overdue: !due || due <= Date.now(),
						};
					})()
				: null;
		const patch = value => current =>
			current.map(item => (item.id === conversation.id ? { ...item, keepInTouch: value } : item));
		setConversations(patch(optimistic));
		try {
			await api.put(`/whatsapp/conversations/${conversation.id}/keep-in-touch`, { days: days > 0 ? days : null });
			toast.success(days > 0 ? t.keepInTouchSaved : t.keepInTouchRemoved);
			if (accountId) scheduleReloadConversations(accountId);
		} catch (error) {
			setConversations(patch(previous));
			toast.error(error.response?.data?.message || (locale === 'ar' ? 'تعذر الحفظ' : 'Could not save'));
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
		// The Online tab is gone, and stories are only for people who see the whole account
		// (a saved tab or an old link can still ask for either).
		const notAllowed = tab === 'online' || (tab === 'statuses' && !seesWholeAccountRef.current);
		if (tab === 'notifications' || notAllowed || (showcaseOnly && !SHOWCASE_TABS.has(tab))) {
			setActiveTab('chats');
			return;
		}
		if (tab === 'reading') {
			if (activeTab && activeTab !== 'reading') readingReturnTabRef.current = activeTab;
			setActiveTab('reading');
			setTabError('');
			return;
		}
		if (tab === 'prompts') {
			setActiveTab('prompts');
			setTabError('');
			return;
		}
		// The Facebook tab was removed; a saved or linked "facebook" tab lands on the chats.
		if (tab === 'facebook') {
			setActiveTab('chats');
			setTabError('');
			return;
		}
		if (tab === 'channels') {
			setConversationFilter('channels');
			setActiveTab('chats');
			return;
		}
		if (tab === 'autoForward') {
			setAutoForwardOpen(true);
			if (!isConversationWorkspaceTab(activeTab)) setActiveTab('chats');
			return;
		}
		if (tab === 'contacts') {
			setContactsPopupOpen(true);
			if (!isConversationWorkspaceTab(activeTab)) setActiveTab('chats');
			return;
		}
		if (tab === 'fakeChat' && !fakeChatAllowed) {
			setActiveTab('chats');
			return;
		}
		if (tab === 'documents' && !isAdmin) {
			setActiveTab('chats');
			return;
		}
		// Email Memo lives in its chat now: open "AI Memo Emails" on its Settings view.
		// Without that chat (not created yet) the standalone workspace below still opens.
		if (tab === 'emails') {
			const memoChat = (conversationsRef.current || []).find(item => isEmailMemoAiConversation(item));
			if (memoChat) {
				if (memoChat.id === conversationIdRef.current) setEmailMemoView('settings');
				else emailMemoSettingsOnOpenRef.current = true;
				setActiveTab('chats');
				openConversation(memoChat.id, memoChat);
				return;
			}
		}
		if (tab !== activeTab) waPerfMark(`tab:${tab}`);
		setActiveTab(tab);
		setTabError('');
		if (tab === 'profile') return;
		if (tab === 'emails') return;
		if (tab === 'documents') return;
		if (
			tab === 'board' ||
			tab === 'fakeChat' ||
			tab === 'wallet' ||
			tab === 'typing' ||
			tab === 'adhkar' ||
			tab === 'learn' ||
			tab === 'agent'
		)
			return;
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
			const beforeCount = statusesCacheRef.current.get(targetAccountId)?.items?.length || 0;
			try {
				// "Sync now": wait for the phone history pages, then refresh the list.
				await loadStatuses(targetAccountId, { force: true, silent: false, fromPhone: true });
				if (isCurrentRequest()) {
					const afterCount = statusesCacheRef.current.get(targetAccountId)?.items?.length || 0;
					if (afterCount > beforeCount) {
						toast.success(
							String(t.storiesSyncedCount || 'Synced stories from your phone ({count})').replace(
								'{count}',
								String(afterCount),
							),
						);
					} else {
						const hint = statusesCacheRef.current.get(targetAccountId)?.hint;
						const ar = locale === 'ar';
						if (hint === 'whatsapp_stories_full_sync_requested') {
							// The phone answers in the background; the list refreshes when stories land.
							toast(
								ar
									? 'طلبنا من التليفون يبعت كل الستوريز اللي شغالة دلوقتي. اللي هيوصل هيظهر هنا لوحده خلال دقيقة أو اتنين.'
									: 'Asked your phone to send every story that is live now. They show up here on their own within a minute or two.',
								{ duration: 7000 },
							);
						} else if (hint === 'whatsapp_stories_full_sync_wait') {
							toast(
								ar
									? 'طلبنا من التليفون من شوية. استنى دقايق قبل ما تطلب تاني، واللي وصل هيظهر لوحده.'
									: 'Your phone was asked a few minutes ago. Give it a little time before asking again; what arrives shows up on its own.',
								{ duration: 6000 },
							);
						} else if (hint === 'whatsapp_stories_waiting_for_live') {
							toast(t.storiesWaitingForLive);
						}
					}
				}
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
		const loadedKey =
			tab === 'reports'
				? `${targetAccountId}:reports:${reportPeriodDaysRef.current}`
				: `${targetAccountId}:${tab}`;
		const showSpinner = force || !loadedTabKeysRef.current.has(loadedKey);
		setTabLoading(showSpinner);
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
				const cacheKey = `${targetAccountId}:${reportPeriodDaysRef.current}`;
				setReportRefreshing(true);
				try {
					const range = reportDateRange(reportPeriodDaysRef.current);
					const { data } = await api.get(
						`/whatsapp/accounts/${targetAccountId}/reports/summary`,
						{ params: range },
					);
					reportCacheRef.current.set(cacheKey, data);
					if (isCurrentRequest()) setReport(data);
				} finally {
					setReportRefreshing(false);
				}
			}
			if (tab === 'settings') {
				const [privacyRes, notificationRes] = await Promise.all([
					api.get(`/whatsapp/accounts/${targetAccountId}/privacy`),
					api.get(`/whatsapp/accounts/${targetAccountId}/notification-preferences`),
				]);
				if (isCurrentRequest()) {
					setPrivacySettings(
						privacyRes.data || {
							hideStatusViewReceipts: true,
							readReceiptMode: 'on_reply',
							holdDeliveryReceipts: false,
							hideTypingIndicator: false,
						},
					);
					setNotificationSettings(
						notificationRes.data || {
							notificationsEnabled: true,
						},
					);
				}
			}
			if (isCurrentRequest()) loadedTabKeysRef.current.add(loadedKey);
		} catch (error) {
			if (isCurrentRequest()) {
				setTabError(error.response?.data?.message || 'Could not load section');
				if (showSpinner) {
					toast.error(error.response?.data?.message || 'Could not load section');
				}
			}
		} finally {
			if (isCurrentRequest()) setTabLoading(false);
		}
	};

	// Quiet refresh (the tab's one-minute timer and the refresh button): keeps data on screen.
	const loadReportsRef = useRef(null);
	loadReportsRef.current = () => loadTabData('reports');
	const refreshReport = useCallback(() => {
		if (activeTabRef.current !== 'reports') return;
		void loadReportsRef.current?.();
	}, []);

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
		openConversation(conversationId);
		void loadTabData('chats');
	};

	presenceWatchAlertRef.current = payload => {
		const id = String(payload?.conversationId || '');
		if (!id) return;
		const name = String(payload?.name || '').trim() || (locale === 'ar' ? 'جهة اتصال' : 'A contact');
		toast(
			toastItem => (
				<button
					type="button"
					className="flex items-center gap-2 text-start"
					onClick={() => {
						toast.dismiss(toastItem.id);
						openConversationFromReport(id);
					}}
				>
					<span className="size-2.5 shrink-0 rounded-full bg-[#25d366]" aria-hidden />
					<span>
						<b>{name}</b> {locale === 'ar' ? 'متصل الآن على واتساب' : 'is online on WhatsApp'}
					</span>
				</button>
			),
			{ id: `presence-${id}`, duration: 8000 },
		);
		// Background tab without a service worker (dev): the page itself raises the OS alert.
		showWhatsAppDesktopNotification({
			title: name,
			body: locale === 'ar' ? 'متصل الآن على واتساب' : 'Online now on WhatsApp',
			conversationId: id,
			accountId: payload?.accountId,
			locale,
		});
	};

	/** A contact picked under the search: open their chat (or start it) by their exact id. */
	const openContactFromSearch = async contact => {
		if (!accountId || !contact) return;
		try {
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/conversations/open`, {
				chatId: contact.waId || contact.phone?.digits,
				title: contact.displayName || contact.localName || null,
			});
			if (!data?.id) return;
			setChatSearch('');
			openConversationFromContact(data.id, data);
		} catch (error) {
			toast.error(
				error?.response?.data?.message || (locale === 'ar' ? 'تعذر فتح المحادثة' : 'Could not open the chat'),
			);
		}
	};

	const openConversationFromContact = (conversationId, conversation) => {
		if (!conversationId) return;
		if (conversation?.id) {
			setConversations(current => {
				if (current.some(item => item.id === conversation.id)) return current;
				return sortConversationsByActivity([conversation, ...current]);
			});
		}
		setContactsPopupOpen(false);
		openConversation(conversationId, conversation);
		void loadTabData('chats');
	};

	useEffect(() => {
		if (!accountId || (!canManageWhatsApp && !canAssignWhatsApp)) {
			setAssignableStaff([]);
			setAssignableStaffLoading(false);
			return undefined;
		}
		let cancelled = false;
		setAssignableStaffLoading(true);
		const ownerId = selectedAccount?.ownerAdminId || null;
		const mapStaffFallback = list =>
			(Array.isArray(list) ? list : []).map(item => {
				const isOwner = Boolean(ownerId && item.id === ownerId);
				return {
					id: item.id,
					name: item.name || item.email || 'Staff',
					email: item.email,
					role: item.role,
					avatarUrl: item.avatarUrl || null,
					isOwner,
					canView: isOwner || Boolean(item.canView),
					canUse: isOwner || Boolean(item.canUse),
					canManage: isOwner || Boolean(item.canManage),
					canAssign: isOwner || Boolean(item.canAssign),
					canTransfer: isOwner || Boolean(item.canTransfer),
					assignable: isOwner || Boolean(item.canView && item.canUse),
				};
			});
		Promise.all([
			api
				.get(`/whatsapp/accounts/${accountId}/assignable-staff`)
				.then(({ data }) => (Array.isArray(data) ? data : []))
				.catch(error => {
					console.warn('assignable-staff failed', error?.response?.status, error?.response?.data);
					return null;
				}),
			api
				.get('/whatsapp/accounts/staff')
				.then(({ data }) => (Array.isArray(data) ? data : []))
				.catch(() => []),
		]).then(([assignable, staffList]) => {
			if (cancelled) return;
			if (Array.isArray(staffList) && staffList.length) {
				setStaff(staffList);
			}
			if (Array.isArray(assignable) && assignable.length) {
				setAssignableStaff(assignable);
				return;
			}
			// API empty/failed — still show eligible staff so permissions can be granted.
			setAssignableStaff(mapStaffFallback(staffList));
		}).finally(() => {
			if (!cancelled) setAssignableStaffLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [accountId, canAssignWhatsApp, canManageWhatsApp, selectedAccount?.ownerAdminId]);

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
			!['groups', 'calls', 'reports', 'board', 'fakeChat', 'settings'].includes(activeTab)
		) {
			return;
		}
		void loadTabData(activeTab);
		// Reload account-scoped tab data whenever the selected account changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accountId, tabReady]);

	const revokeStoryPeekMedia = useCallback((keepIds = null) => {
		const keep = keepIds instanceof Set ? keepIds : null;
		const next = {};
		Object.entries(storyPeekMediaRef.current || {}).forEach(([id, entry]) => {
			if (keep?.has(String(id))) {
				next[id] = entry;
				return;
			}
			revokeStoryUrl(entry?.url);
		});
		storyPeekMediaRef.current = next;
		setStoryPeekMedia(next);
	}, []);

	const openStory = async (status, queue = null, index = 0) => {
		if (!status || !accountId) return;
		const targetAccountId = accountId;
		const requestId = ++storyRequestId.current;
		const playlist = Array.isArray(queue) && queue.length ? queue : [status];
		setStoryQueue(playlist);
		setStoryIndex(index);
		setSelectedStatus(status);
		setStoryReplyDraft('');
		setStoryMediaError('');
		setStoryPaused(false);
		setStoryShareOpen(false);
		setStoryViewerEmbed(null);
		resetStoryViewers();
		markStatusesViewed(status.id);
		const statusType = String(status.type || '').toLowerCase();
		const isTextStory = statusType === 'text' || statusType === 'chat';
		setLoadingStory(!isTextStory);
		storyElapsedRef.current = 0;
		storySegmentDoneRef.current = false;
		setStoryProgress(0);
		setStoryReplayKey(key => key + 1);
		setStoryDurationMs(statusType.includes('video') ? 15000 : 5000);
		const peekKeep = new Set(
			[playlist[index - 1]?.id, playlist[index + 1]?.id]
				.filter(Boolean)
				.map(id => String(id)),
		);
		revokeStoryPeekMedia(peekKeep);
		if (statusMediaUrlRef.current) {
			revokeStoryUrl(statusMediaUrlRef.current);
			statusMediaUrlRef.current = null;
		}
		setStatusMediaUrl(null);
		const hideStatusViewReceipts =
			selectedAccount?.privacySettings?.hideStatusViewReceipts ?? true;
		if (!hideStatusViewReceipts && !storyViewerHistoryRef.current) {
			whatsappLiveApi
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
			const history = storyViewerHistoryRef.current;
			const preview = storyThumbCacheRef.current.get(statusRef?.id);
			if (preview?.url && (preview.type === 'video' || !isBlobStoryUrl(preview.url))) {
				return { url: preview.url, type: preview.type || 'video', streamed: true };
			}
			if (preview?.url && isBlobStoryUrl(preview.url)) {
				try {
					const cached = await (await fetch(preview.url)).blob();
					if (cached?.size) return cached;
				} catch {
					/* preview revoked — download below */
				}
			}
			return fetchStatusPlayback(targetAccountId, statusRef, { history });
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
				// Stale UUID / missing provider payload: resync and rematch by story id.
				if (!isRecoverableStoryMediaError(firstMessage)) throw firstError;
				if (storyViewerHistoryRef.current) throw firstError;
				let refreshedItems =
					statusesCacheRef.current.get(targetAccountId)?.items || [];
				try {
					const { data: refreshed } = await whatsappLiveApi.get(
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
				const wantedId = status.id;
				const wantedProvider = String(status.providerStatusId || '').trim();
				const rematched =
					refreshedItems.find(item => item.id === wantedId) ||
					(wantedProvider
						? refreshedItems.find(
								item => String(item.providerStatusId || '').trim() === wantedProvider,
							)
						: null) ||
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
			const playbackUrl = data?.streamed
				? data.url
				: URL.createObjectURL(data);
			statusMediaUrlRef.current = playbackUrl;
			setStatusMediaUrl(playbackUrl);
			setStoryMediaError('');
			if (data?.streamed || String(data.type || '').includes('video')) {
				setSelectedStatus(current =>
					current?.id === status.id ||
					current?.providerStatusId === status.providerStatusId
						? { ...current, type: data?.streamed ? 'video' : current.type || 'video' }
						: current,
				);
			}
			const people = storyPeopleQueueRef.current;
			const peopleIndex = storyPeopleIndexRef.current;
			const neighborPeople = [
				people[peopleIndex - 1],
				people[peopleIndex + 1],
			].filter(Boolean);
			const neighbors = [];
			for (const person of neighborPeople) {
				const playable = (person.items || []).filter(isPlayableStoryItem);
				const peekItem =
					playable.find(item => !viewedStatusIds.has(item.id)) ||
					playable[0] ||
					person.latest ||
					null;
				if (peekItem) neighbors.push(peekItem);
			}
			// Also warm the next item inside this person's ring for smooth auto-advance.
			if (playlist[index + 1]) neighbors.push(playlist[index + 1]);
			for (const neighbor of neighbors) {
				const neighborType = String(neighbor?.type || '').toLowerCase();
				if (!['image', 'video', 'gif', 'sticker'].includes(neighborType)) continue;
				const neighborId = String(neighbor.id || '');
				if (!neighborId) continue;
				if (storyPeekMediaRef.current[neighborId]?.url) continue;
				void fetchStatusPlayback(targetAccountId, neighbor, {
					history: storyViewerHistoryRef.current,
				})
					.then(data => {
						if (
							requestId !== storyRequestId.current ||
							accountIdRef.current !== targetAccountId ||
							!data
						) {
							return;
						}
						const peekUrl = data.streamed ? data.url : URL.createObjectURL(data);
						const entry = {
							url: peekUrl,
							type: String(data.type || neighbor.type || ''),
						};
						const prevEntry = storyPeekMediaRef.current[neighborId];
						if (prevEntry?.url && prevEntry.url !== peekUrl) {
							revokeStoryUrl(prevEntry.url);
						}
						storyPeekMediaRef.current = {
							...storyPeekMediaRef.current,
							[neighborId]: entry,
						};
						setStoryPeekMedia(current => ({
							...current,
							[neighborId]: entry,
						}));
					})
					.catch(() => undefined);
			}
		} catch (error) {
			if (requestId === storyRequestId.current) {
				setStatusMediaUrl(null);
				const raw =
					error.response?.data?.message ||
					(typeof error?.message === 'string' ? error.message : null) ||
					t.mediaUnavailable;
				const message = /not connected|session_not_ready|qr_pending/i.test(String(raw))
					? locale === 'ar'
						? 'واتساب غير متصل. اربط الحساب ثم افتح الحالة مرة أخرى.'
						: 'WhatsApp is not connected. Link the account, then open this story again.'
					: /unexpected database|invalid story id|invalid input syntax/i.test(String(raw))
						? locale === 'ar'
							? 'تعذر تحميل وسائط الحالة. حدّث الحالات وحاول مرة أخرى.'
							: 'Could not load story media. Refresh stories and try again.'
						: isStoryTransferFailure(error)
							? locale === 'ar'
								? 'انقطع تحميل الحالة. اضغط تحديث للمحاولة مرة أخرى.'
								: 'The story download was interrupted. Tap Refresh to try again.'
							: raw;
				if (
					isUnrecoverableStoryMediaError(message) &&
					Array.isArray(queue) &&
					queue.length > index + 1
				) {
					const nextPlayable = queue
						.slice(index + 1)
						.findIndex(isPlayableStoryItem);
					if (nextPlayable >= 0) {
						const nextIndex = index + 1 + nextPlayable;
						void openStory(queue[nextIndex], queue, nextIndex);
						return;
					}
				}
				if (isUnrecoverableStoryMediaError(message)) {
					const people = storyPeopleQueueRef.current;
					const peopleIndex = storyPeopleIndexRef.current;
					if (people.length > peopleIndex + 1) {
						goStoryPerson(1);
						return;
					}
				}
				setStoryMediaError(message);
				toast.error(message);
			}
		} finally {
			if (requestId === storyRequestId.current) setLoadingStory(false);
		}
	};

	const openStoryGroup = (story, { history = false, preservePeopleQueue = false } = {}) => {
		if (!story?.items?.length) return;
		storyViewerHistoryRef.current = history;
		const playable = story.items.filter(isPlayableStoryItem);
		if (!playable.length) {
			toast.error(
				locale === 'ar'
					? 'وسائط هذه الحالات غير محفوظة ولم تعد متاحة.'
					: 'These stories were never saved and are no longer available.',
			);
			return;
		}
		if (!preservePeopleQueue) {
			// Fresh open from the tray — no person slide.
			storyPersonSlideDirRef.current = 0;
			setStoryPersonSlideDir(0);
			storyPersonAnimatingRef.current = false;
			const source = history
				? groupedStatusHistoryRef.current
				: groupedStatusesRef.current;
			const people = (Array.isArray(source) ? source : []).filter(group =>
				(group?.items || []).some(isPlayableStoryItem),
			);
			const peopleIndex = Math.max(
				0,
				people.findIndex(group => group.senderWaId === story.senderWaId),
			);
			setStoryPeopleQueue(people);
			setStoryPeopleIndex(peopleIndex >= 0 ? peopleIndex : 0);
			storyPeopleQueueRef.current = people;
			storyPeopleIndexRef.current = peopleIndex >= 0 ? peopleIndex : 0;
		} else {
			const people = storyPeopleQueueRef.current;
			const peopleIndex = Math.max(
				0,
				people.findIndex(group => group.senderWaId === story.senderWaId),
			);
			setStoryPeopleIndex(peopleIndex);
			storyPeopleIndexRef.current = peopleIndex;
		}
		const preferred = Number.isInteger(story.startIndex)
			? story.items[story.startIndex]
			: null;
		const startItem =
			(preferred && isPlayableStoryItem(preferred) ? preferred : null) || playable[0];
		const startIndex = Math.max(0, playable.findIndex(item => item.id === startItem.id));
		openStory(startItem, playable, startIndex);
	};
	openStoryGroupRef.current = openStoryGroup;

	const goStoryPerson = delta => {
		if (storyPersonAnimatingRef.current) return;
		const people = storyPeopleQueueRef.current;
		if (!people.length) {
			closeStory();
			return;
		}
		let next = storyPeopleIndexRef.current + delta;
		if (next < 0 || next >= people.length) {
			if (storyLoopRef.current && people.length) {
				next = ((next % people.length) + people.length) % people.length;
			} else {
				closeStory();
				return;
			}
		}
		const target = people[next];
		if (!target) {
			closeStory();
			return;
		}
		const direction = delta > 0 ? 1 : -1;
		storyPersonSlideDirRef.current = direction;
		setStoryPersonSlideDir(direction);
		storyPersonAnimatingRef.current = true;
		if (storyPersonAnimUnlockTimerRef.current) {
			window.clearTimeout(storyPersonAnimUnlockTimerRef.current);
		}
		storyPersonAnimUnlockTimerRef.current = window.setTimeout(() => {
			storyPersonAnimatingRef.current = false;
			storyPersonAnimUnlockTimerRef.current = null;
		}, 480);
		setStoryPeopleIndex(next);
		storyPeopleIndexRef.current = next;
		openStoryGroup(target, {
			history: storyViewerHistoryRef.current,
			preservePeopleQueue: true,
		});
	};

	/** Advance within the current person's items; overflow moves to the next/previous person. */
	const goStory = delta => {
		const queue = storyQueueRef.current.length
			? storyQueueRef.current
			: storyQueue;
		const index = storyQueueRef.current.length ? storyIndexRef.current : storyIndex;
		if (!queue.length) return;
		const next = index + delta;
		if (next >= 0 && next < queue.length) {
			openStory(queue[next], queue, next);
			return;
		}
		goStoryPerson(delta > 0 ? 1 : -1);
	};

	const goStoryTo = target => {
		const queue = storyQueueRef.current.length ? storyQueueRef.current : storyQueue;
		const index = storyQueueRef.current.length ? storyIndexRef.current : storyIndex;
		if (!queue[target]) return;
		if (target === index) {
			replayCurrentStory();
			return;
		}
		openStory(queue[target], queue, target);
	};

	const replayCurrentStory = useCallback(() => {
		storyElapsedRef.current = 0;
		storySegmentDoneRef.current = false;
		setStoryProgress(0);
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

	const finishStorySegmentRef = useRef(() => {});
	finishStorySegmentRef.current = () => {
		if (storySegmentDoneRef.current) return;
		storySegmentDoneRef.current = true;
		setStoryProgress(100);
		if (storyLoopRef.current) {
			replayCurrentStory();
			return;
		}
		goStory(1);
	};

	const closeStory = () => {
		storyRequestId.current += 1;
		storyViewerHistoryRef.current = false;
		storyPersonAnimatingRef.current = false;
		storyPersonSlideDirRef.current = 0;
		setStoryPersonSlideDir(0);
		if (storyPersonAnimUnlockTimerRef.current) {
			window.clearTimeout(storyPersonAnimUnlockTimerRef.current);
			storyPersonAnimUnlockTimerRef.current = null;
		}
		setSelectedStatus(null);
		setStoryQueue([]);
		setStoryIndex(0);
		setStoryPeopleQueue([]);
		setStoryPeopleIndex(0);
		storyPeopleQueueRef.current = [];
		storyPeopleIndexRef.current = 0;
		setStoryReplyDraft('');
		setSendingStoryReply(false);
		setStoryShareOpen(false);
		setStoryShareSearch('');
		setSendingStoryShareId(null);
		setStoryRepostOpen(false);
		setStoryRepostText('');
		setStoryViewerEmbed(null);
		setStoryMediaError('');
		setStoryPaused(false);
		setStoryExpanded(false);
		setStatusMediaUrl(null);
		resetStoryViewers();
		revokeStoryPeekMedia();
		if (statusMediaUrlRef.current) {
			revokeStoryUrl(statusMediaUrlRef.current);
			statusMediaUrlRef.current = null;
		}
	};

	function resetStoryViewers() {
		storyViewersRequestRef.current += 1;
		storyViewersOpenRef.current = false;
		setStoryViewersOpen(false);
		setStoryViewers({ statusId: null, loading: false, error: '', data: null });
		setSendingStoryReaction(null);
	}

	/** A viewer's full-size profile photo, for the enlarged view in the viewer list. */
	const fetchStoryViewerPhoto = useCallback(
		async viewer => {
			if (!accountId) return null;
			const phone = String(viewer?.phone || '').replace(/\D/g, '');
			const waId = phone ? `${phone}@s.whatsapp.net` : String(viewer?.id || '');
			if (!waId || /@(hosted\.)?lid$/i.test(waId)) return null;
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/statuses/audience/avatar`, {
				waId,
				quality: 'full',
			});
			return data?.avatarUrl || null;
		},
		[accountId],
	);

	/** A viewer's current small photo, for rows whose stored one is missing or expired. */
	const fetchStoryViewerThumb = useCallback(
		async viewer => {
			if (!accountId) return null;
			const phone = String(viewer?.phone || '').replace(/\D/g, '');
			if (!phone) return null;
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/statuses/audience/avatar`, {
				waId: `${phone}@s.whatsapp.net`,
				quality: 'preview',
			});
			return data?.avatarUrl || null;
		},
		[accountId],
	);

	const loadStoryViewers = async (status, { silent = false } = {}) => {
		if (!status?.id || !accountId || !status.isOwn) return;
		const requestId = ++storyViewersRequestRef.current;
		const cacheKey = `${accountId}:${status.id}`;
		const cached = storyViewersCacheRef.current.get(cacheKey) || null;
		setStoryViewers(current => ({
			statusId: status.id,
			loading: true,
			error: '',
			data: (silent && current.statusId === status.id ? current.data : null) || cached,
		}));
		try {
			const { data } = await api.get(
				`/whatsapp/accounts/${accountId}/statuses/${encodeURIComponent(status.id)}/viewers`,
			);
			storyViewersCacheRef.current.set(cacheKey, data);
			if (storyViewersCacheRef.current.size > 60) {
				storyViewersCacheRef.current.delete(storyViewersCacheRef.current.keys().next().value);
			}
			if (requestId !== storyViewersRequestRef.current) return;
			setStoryViewers({ statusId: status.id, loading: false, error: '', data });
			const patch = {
				statusMessageId: storyMessageKey(status.providerStatusId),
				viewerCount: Number(data?.viewerCount) || 0,
				reactionCount: Number(data?.reactionCount) || 0,
			};
			applyStoryInteractionPatch(patch);
		} catch (error) {
			if (requestId !== storyViewersRequestRef.current) return;
			setStoryViewers(current => ({
				...current,
				statusId: status.id,
				loading: false,
				error:
					error?.response?.data?.message ||
					error?.message ||
					(locale === 'ar' ? 'تعذر تحميل المشاهدات' : 'Could not load views'),
			}));
		}
	};

	const openStoryViewers = () => {
		if (!selectedStatus?.isOwn) return;
		storyViewersOpenRef.current = true;
		setStoryViewersOpen(true);
		setStoryPaused(true);
		// Usually already loaded while the story played (below): show it, refresh quietly.
		const ready = storyViewers.statusId === selectedStatus.id && storyViewers.data;
		void loadStoryViewers(selectedStatus, { silent: Boolean(ready) });
	};

	// Load the viewer list while your own story plays, so swiping up opens it ready.
	const ownStoryForViewers = selectedStatus?.isOwn ? selectedStatus : null;
	useEffect(() => {
		if (!ownStoryForViewers?.id || storyViewersOpenRef.current) return undefined;
		const timer = window.setTimeout(() => {
			if (!storyViewersOpenRef.current) void loadStoryViewers(ownStoryForViewers, { silent: true });
		}, 400);
		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once per story shown
	}, [ownStoryForViewers?.id, accountId]);

	const closeStoryViewers = () => {
		storyViewersOpenRef.current = false;
		setStoryViewersOpen(false);
		setStoryPaused(false);
	};

	/** Live counts/reaction from the socket (or a fresh viewer list) across every story list. */
	function applyStoryInteractionPatch(payload) {
		// The cached list too: going back to Stories repaints from it (and skips the fetch
		// while it is fresh), so a reaction applied only on screen vanished there.
		const cachedStatuses = statusesCacheRef.current.get(accountId);
		if (cachedStatuses?.items) {
			statusesCacheRef.current.set(accountId, {
				...cachedStatuses,
				items: applyStoryInteractionUpdate(cachedStatuses.items, payload),
			});
		}
		setStatuses(current => applyStoryInteractionUpdate(current, payload));
		setStatusHistory(current => applyStoryInteractionUpdate(current, payload));
		setStoryQueue(current => applyStoryInteractionUpdate(current, payload));
		setSelectedStatus(current =>
			current ? applyStoryInteractionUpdate([current], payload)[0] : current,
		);
	}

	storyInteractionEventRef.current = payload => {
		applyStoryInteractionPatch(payload);
		const shown = storyViewersOpenRef.current ? selectedStatus : null;
		if (
			shown?.isOwn &&
			!('myReaction' in payload) &&
			storyMessageKey(shown.providerStatusId) === payload.statusMessageId
		) {
			void loadStoryViewers(shown, { silent: true });
		}
	};

	const reactToCurrentStory = async emoji => {
		if (!accountId || !selectedStatus || selectedStatus.isOwn || sendingStoryReaction) return false;
		if (!canUseWhatsApp || demo.settings.enabled) {
			toast.error(t.storyReactUnavailable);
			return false;
		}
		const status = selectedStatus;
		const previous = status.myReaction || null;
		if (previous === emoji) {
			toast(t.storyReactionAlready, { icon: emoji });
			return false;
		}
		const statusMessageId = storyMessageKey(status.providerStatusId);
		setSendingStoryReaction(emoji);
		applyStoryInteractionPatch({ statusMessageId, myReaction: emoji });
		try {
			const { data } = await api.post(
				`/whatsapp/accounts/${accountId}/statuses/${encodeURIComponent(status.id)}/reactions`,
				{ emoji },
			);
			applyStoryInteractionPatch({
				statusMessageId,
				myReaction: data?.reaction?.emoji || emoji,
			});
			if (data?.conversation?.id) {
				setConversations(current =>
					current.some(item => item.id === data.conversation.id)
						? current
						: [data.conversation, ...current],
				);
			}
			if (data?.duplicate) {
				toast(t.storyReactionAlready, { icon: emoji });
				return false;
			}
			toast.success(t.storyReactionSent, { icon: emoji });
			return true;
		} catch (error) {
			applyStoryInteractionPatch({ statusMessageId, myReaction: previous });
			toast.error(
				error?.response?.data?.message || error?.message || t.storyReactUnavailable,
			);
			return false;
		} finally {
			setSendingStoryReaction(null);
		}
	};

	const likeCurrentStory = async liked => {
		if (!accountId || !selectedStatus || selectedStatus.isOwn || likingStory) return false;
		if (!canUseWhatsApp || demo.settings.enabled) {
			toast.error(t.storyReactUnavailable);
			return false;
		}
		const status = selectedStatus;
		const statusMessageId = storyMessageKey(status.providerStatusId);
		setLikingStory(true);
		applyStoryInteractionPatch({ statusMessageId, myLiked: liked });
		try {
			await api.put(
				`/whatsapp/accounts/${accountId}/statuses/${encodeURIComponent(status.id)}/like`,
				{ liked },
			);
			return true;
		} catch (error) {
			applyStoryInteractionPatch({ statusMessageId, myLiked: !liked });
			toast.error(error?.response?.data?.message || error?.message || t.storyReactUnavailable);
			return false;
		} finally {
			setLikingStory(false);
		}
	};

	const openStorySharePicker = () => {
		if (!selectedStatus || !canUseWhatsApp || demo.settings.enabled) {
			toast.error(t.storySendUnavailable);
			return;
		}
		const statusType = String(selectedStatus.type || '').toLowerCase();
		const isTextStory = statusType === 'text' || statusType === 'chat';
		if (!isTextStory && !statusMediaUrl && !loadingStory) {
			toast.error(t.storySendNoMedia);
			return;
		}
		if (loadingStory) {
			toast.error(t.loading);
			return;
		}
		setStoryPaused(true);
		setStoryShareSearch('');
		setStoryShareOpen(true);
	};

	const openStoryRepost = () => {
		if (!selectedStatus || !accountId || !canUseWhatsApp || demo.settings.enabled) {
			toast.error(t.storySendUnavailable);
			return;
		}
		if (loadingStory) {
			toast.error(t.loading);
			return;
		}
		setStoryPaused(true);
		setStoryRepostText(String(selectedStatus.caption || ''));
		setStoryRepostOpen(true);
	};

	const closeStoryRepost = () => {
		if (repostingStory) return;
		setStoryRepostOpen(false);
		setStoryPaused(false);
	};

	const submitStoryRepost = async event => {
		event?.preventDefault?.();
		if (!selectedStatus || !accountId || repostingStory) return;
		const statusType = String(selectedStatus.type || '').toLowerCase();
		const isTextStory = statusType === 'text' || statusType === 'chat';
		const text = storyRepostText.trim();
		if (isTextStory && !text) {
			toast.error(t.repostTextPlaceholder);
			return;
		}
		const targetAccountId = accountId;
		setRepostingStory(true);
		try {
			const { data } = await api.post(
				`/whatsapp/accounts/${targetAccountId}/statuses/${encodeURIComponent(selectedStatus.id)}/repost`,
				{ text },
			);
			if (Array.isArray(data?.items)) {
				applyStatuses(targetAccountId, data);
			} else {
				void loadStatuses(targetAccountId, { force: true, silent: true });
			}
			setStoryRepostOpen(false);
			setStoryRepostText('');
			setStoryPaused(false);
			toast.success(t.repostDone);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.repostFailed);
		} finally {
			setRepostingStory(false);
		}
	};

	const sendStoryAsMediaToChat = async targetConversation => {
		if (!targetConversation?.id || !accountId || !selectedStatus || sendingStoryShareId) {
			return;
		}
		if (!canUseWhatsApp || demo.settings.enabled) {
			toast.error(t.storySendUnavailable);
			return;
		}
		const statusType = String(selectedStatus.type || '').toLowerCase();
		const isTextStory = statusType === 'text' || statusType === 'chat';
		const caption = String(selectedStatus.caption || '').trim();
		setSendingStoryShareId(targetConversation.id);
		try {
			if (isTextStory) {
				const text = caption || selectedStatus.contactName || 'Story';
				await api.post(`/whatsapp/conversations/${targetConversation.id}/messages`, {
					type: 'text',
					text,
				});
			} else {
				let blob = null;
				if (isBlobStoryUrl(statusMediaUrl)) {
					try {
						const response = await fetch(statusMediaUrl);
						if (response.ok) blob = await response.blob();
					} catch {
						blob = null;
					}
				}
				if (!blob?.size) {
					const history = storyViewerHistoryRef.current;
					const ids = [selectedStatus.id, selectedStatus.providerStatusId].filter(Boolean);
					let lastError = null;
					for (const mediaId of ids) {
						try {
							blob = await fetchStatusMediaBlob(accountId, mediaId, { history });
							break;
						} catch (error) {
							lastError = error;
						}
					}
					if (!blob?.size) {
						throw lastError || new Error(t.storySendNoMedia);
					}
				}
				const mime = String(blob.type || '').toLowerCase() || 'application/octet-stream';
				const isVideo =
					statusType.includes('video') || mime.startsWith('video/');
				const extension = isVideo
					? 'mp4'
					: mime.includes('png')
						? 'png'
						: mime.includes('webp')
							? 'webp'
							: mime.includes('gif')
								? 'gif'
								: 'jpg';
				const file = new File(
					[blob],
					`whatsapp-story-${String(selectedStatus.id || Date.now()).slice(0, 12)}.${extension}`,
					{ type: mime.startsWith('image/') || mime.startsWith('video/') ? mime : isVideo ? 'video/mp4' : 'image/jpeg' },
				);
				const ok = await sendFile(file, isVideo ? 'video' : 'image', {
					accountId,
					conversationId: targetConversation.id,
					caption: caption || undefined,
					replySnapshot: null,
					skipSendingState: true,
					clearUploadProgress: true,
				});
				if (!ok) throw new Error(t.storySendUnavailable);
			}
			setStoryShareOpen(false);
			setStoryShareSearch('');
			toast.success(t.storySentAsMedia);
			setStoryPaused(false);
		} catch (error) {
			toast.error(
				error?.response?.data?.message ||
					error?.message ||
					t.storySendUnavailable,
			);
		} finally {
			setSendingStoryShareId(null);
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
		if (!String(selectedStatus.senderWaId || '').trim() || !selectedStatus.id) {
			toast.error(t.storyReplyUnavailable);
			return;
		}
		setSendingStoryReply(true);
		setStoryPaused(true);
		try {
			// The server sends it into the poster's chat quoting the story, so it shows
			// there (and on their phone) as a reply to this status.
			const { data } = await api.post(
				`/whatsapp/accounts/${accountId}/statuses/${encodeURIComponent(selectedStatus.id)}/reply`,
				{ text, clientMessageId: `story-reply-${selectedStatus.id}-${Date.now()}` },
			);
			if (data?.conversation?.id) {
				setConversations(current =>
					current.some(item => item.id === data.conversation.id)
						? current
						: [data.conversation, ...current],
				);
			}
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
			if (event.key !== 'Escape') return;
			if (storyDialogOpenRef.current) return;
			if (storyViewersOpenRef.current) {
				closeStoryViewers();
				return;
			}
			closeStory();
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
			storySegmentDoneRef.current = false;
			setStoryProgress(0);
			return undefined;
		}
		if (storyPaused) return undefined;

		const statusType = String(selectedStatus.type || '').toLowerCase();
		const isVideo = statusType.includes('video');
		storyStartRef.current = Date.now() - storyElapsedRef.current;

		let frameId = 0;
		let cancelled = false;
		let lastEmit = 0;

		const tick = now => {
			if (cancelled || storySegmentDoneRef.current) return;

			let pct = 0;
			let done = false;
			const video = storyVideoRef.current;

			if (isVideo) {
				if (
					video &&
					Number.isFinite(video.duration) &&
					video.duration > 0 &&
					!Number.isNaN(video.currentTime)
				) {
					pct = Math.min(
						100,
						(Math.max(0, video.currentTime) / video.duration) * 100,
					);
					storyElapsedRef.current = Math.max(0, video.currentTime) * 1000;
					done = Boolean(video.ended) || pct >= 99.5;
				} else {
					// Wait for metadata / first frame — do not fake-advance on wall clock.
					pct = 0;
				}
			} else {
				const elapsed = Date.now() - storyStartRef.current;
				storyElapsedRef.current = elapsed;
				pct = Math.min(100, (elapsed / Math.max(storyDurationMs, 1)) * 100);
				done = pct >= 100;
			}

			if (!lastEmit || now - lastEmit >= 32 || done || pct === 0) {
				lastEmit = now;
				setStoryProgress(pct);
			}

			if (done) {
				finishStorySegmentRef.current();
				return;
			}
			frameId = window.requestAnimationFrame(tick);
		};

		frameId = window.requestAnimationFrame(tick);
		return () => {
			cancelled = true;
			window.cancelAnimationFrame(frameId);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		selectedStatus?.id,
		selectedStatus?.type,
		loadingStory,
		storyDurationMs,
		storyPaused,
		storyReplayKey,
		statusMediaUrl,
	]);

	useLayoutEffect(() => {
		if (!selectedStatus || loadingStory) {
			setStoryProgress(0);
		}
	}, [selectedStatus?.id, storyIndex, loadingStory, storyReplayKey]);

	useEffect(() => {
		silenceOtherStoryVideos();
		const video = storyVideoRef.current;
		if (!video || !statusMediaUrl) return undefined;
		if (storyPaused) {
			video.pause();
			return undefined;
		}
		let cancelled = false;
		const tryPlay = () => {
			if (cancelled || !storyVideoRef.current) return;
			const playPromise = storyVideoRef.current.play();
			if (playPromise?.catch) {
				playPromise.catch(() => undefined);
			}
		};
		tryPlay();
		video.addEventListener('loadeddata', tryPlay);
		video.addEventListener('canplay', tryPlay);
		const retryId = window.setTimeout(tryPlay, 120);
		return () => {
			cancelled = true;
			video.removeEventListener('loadeddata', tryPlay);
			video.removeEventListener('canplay', tryPlay);
			window.clearTimeout(retryId);
		};
	}, [storyPaused, selectedStatus?.id, statusMediaUrl]);

	useEffect(() => {
		const video = storyVideoRef.current;
		if (!video) return;
		video.muted = storyMuted;
	}, [storyMuted, selectedStatus?.id, statusMediaUrl]);

	useEffect(() => {
		if (!selectedStatus) return undefined;
		const onVisibility = () => {
			if (document.hidden) setStoryPaused(true);
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => document.removeEventListener('visibilitychange', onVisibility);
	}, [selectedStatus?.id]);

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

	const resolveGroupIdForConversation = conversation => {
		if (!conversation || conversation.type !== 'group') return null;
		if (conversation.group?.id) return conversation.group.id;
		const byConversation = (groups || []).find(item => item.conversationId === conversation.id);
		if (byConversation?.id) return byConversation.id;
		const chatId = String(conversation.providerChatId || conversation.group?.waId || '');
		const byWaId = (groups || []).find(
			item => String(item.waId || '') === chatId || String(item.waId || '') === String(conversation.group?.waId || ''),
		);
		return byWaId?.id || null;
	};

	const openConversationInfo = async conversation => {
		if (!conversation) return;
		const live =
			conversationsRef.current.find(item => item.id === conversation.id) || conversation;
		setConversationInfoTarget(live);
		setConversationInfoGroup(
			live.type === 'group'
				? live.group || { subject: conversationTitle(live), participants: [] }
				: null,
		);
		if (live.type !== 'group') {
			setLoadingConversationInfoGroup(false);
			void hydrateConversationPresence(live.id);
			return;
		}
		if (!accountId) {
			setLoadingConversationInfoGroup(false);
			return;
		}
		const requestId = ++conversationInfoRequestId.current;
		setLoadingConversationInfoGroup(true);
		try {
			let groupId = resolveGroupIdForConversation(live);
			if (!groupId) {
				const { data: groupRows } = await api.get(`/whatsapp/accounts/${accountId}/groups`);
				if (requestId !== conversationInfoRequestId.current) return;
				if (Array.isArray(groupRows)) {
					setGroups(groupRows);
					const match = groupRows.find(
						item =>
							item.conversationId === live.id ||
							String(item.waId || '') === String(live.providerChatId || '') ||
							String(item.waId || '') === String(live.group?.waId || ''),
					);
					groupId = match?.id || null;
				}
			}
			if (!groupId) {
				if (requestId === conversationInfoRequestId.current) {
					setLoadingConversationInfoGroup(false);
				}
				return;
			}
			const { data } = await api.get(
				`/whatsapp/accounts/${accountId}/groups/${groupId}`,
				{ params: { refresh: true } },
			);
			if (requestId !== conversationInfoRequestId.current) return;
			setConversationInfoGroup(data);
			setGroups(current => {
				if (!current.some(item => item.id === data.id)) {
					return [...current, data];
				}
				return current.map(item => (item.id === data.id ? { ...item, ...data } : item));
			});
			setConversations(current =>
				current.map(item =>
					item.id === live.id
						? {
								...item,
								group: {
									...(item.group || {}),
									...data,
									participants: data.participants || item.group?.participants || [],
								},
							}
						: item,
				),
			);
		} catch (error) {
			if (requestId === conversationInfoRequestId.current) {
				toast.error(
					error.response?.data?.message ||
						(locale === 'ar' ? 'تعذر تحميل أعضاء الجروب' : 'Could not load group members'),
				);
			}
		} finally {
			if (requestId === conversationInfoRequestId.current) {
				setLoadingConversationInfoGroup(false);
			}
		}
	};

	refreshOpenMessageInfoRef.current = messageId => {
		const target = messageInfoTargetRef.current;
		if (!target || String(target.message?.id || '') !== String(messageId || '')) return;
		if (messageInfoRefreshTimerRef.current) return;
		messageInfoRefreshTimerRef.current = window.setTimeout(async () => {
			messageInfoRefreshTimerRef.current = null;
			if (messageInfoTargetRef.current !== target) return;
			try {
				const { data } = await api.get(
					`/whatsapp/conversations/${target.conversationId}/messages/${target.message.id}/info`,
				);
				if (messageInfoTargetRef.current !== target) return;
				setMessageInfo(current =>
					current && !current.loading
						? { ...current, groupReceipts: data?.groupReceipts ?? current.groupReceipts }
						: current,
				);
			} catch {
				/* keep the receipts already on screen */
			}
		}, 800);
	};

	ensureMentionMembersRef.current = async () => {
		const live = conversationsRef.current.find(item => item.id === conversationId);
		if (!live || live.type !== 'group' || !accountId) return;
		if (mentionMembersLoadedRef.current.has(live.id)) return;
		mentionMembersLoadedRef.current.add(live.id);
		const hasMembers = (live.group?.participants || []).length > 0;
		if (!hasMembers) setMentionMembersLoading(true);
		try {
			let groupId = resolveGroupIdForConversation(live);
			if (!groupId) {
				const { data: groupRows } = await api.get(`/whatsapp/accounts/${accountId}/groups`);
				if (Array.isArray(groupRows)) {
					setGroups(groupRows);
					groupId =
						groupRows.find(
							item =>
								item.conversationId === live.id ||
								String(item.waId || '') === String(live.providerChatId || ''),
						)?.id || null;
				}
			}
			if (!groupId) return;
			const { data } = await api.get(`/whatsapp/accounts/${accountId}/groups/${groupId}`, {
				params: { refresh: !hasMembers },
			});
			if (!Array.isArray(data?.participants)) return;
			setConversations(current =>
				current.map(item =>
					item.id === live.id
						? {
								...item,
								group: {
									...(item.group || {}),
									...data,
									participants: data.participants.length
										? data.participants
										: item.group?.participants || [],
								},
							}
						: item,
				),
			);
		} catch {
			mentionMembersLoadedRef.current.delete(live.id);
		} finally {
			setMentionMembersLoading(false);
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
		openConversation(group.conversationId, {
			id: group.conversationId,
			accountId,
			groupId: group.id,
			group,
			type: 'group',
			providerChatId: group.waId,
			unreadCount: 0,
		});
		setActiveTab('chats');
	};

	const persistStaffAccess = async list => {
		if (!accountId || (!canManageWhatsApp && !isAdmin)) return;
		const targetAccountId = accountId;
		await api.put(`/whatsapp/accounts/${targetAccountId}/access`, {
			access: (list || []).filter(
				item =>
					!item.isOwner &&
					(item.canView || item.canUse || item.canManage || item.canAssign || item.canTransfer),
			).map(item => ({
				userId: item.id || item.userId,
				canView: Boolean(item.canView),
				canUse: Boolean(item.canUse),
				canManage: Boolean(item.canManage),
				canAssign: Boolean(item.canAssign),
				canTransfer: Boolean(item.canTransfer),
			})),
		});
		const { data } = await api.get(`/whatsapp/accounts/${targetAccountId}/assignable-staff`);
		setAssignableStaff(Array.isArray(data) ? data : list);
	};

	const toggleStaffPermission = async (userId, flag, value) => {
		if (!userId) return;
		const next = assignableStaff.map(item => {
			if (item.id !== userId || item.isOwner) return item;
			const updated = { ...item, [flag]: value };
			if (flag === 'canUse' && value) updated.canView = true;
			if (flag === 'canView' && !value) updated.canUse = false;
			updated.assignable = Boolean(updated.canView && updated.canUse);
			return updated;
		});
		setAssignableStaff(next);
		try {
			await persistStaffAccess(next);
		} catch (error) {
			toast.error(error.response?.data?.message || 'Could not save access');
			try {
				const { data } = await api.get(`/whatsapp/accounts/${accountId}/assignable-staff`);
				setAssignableStaff(Array.isArray(data) ? data : []);
			} catch {
				/* keep optimistic list */
			}
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

	const saveNotificationSettings = async enabled => {
		if (!accountId) return;
		const targetAccountId = accountId;
		const nextValue = Boolean(enabled);
		setNotificationSettings({ notificationsEnabled: nextValue });
		setNotificationSettingsSaving(true);
		try {
			const { data } = await api.put(
				`/whatsapp/accounts/${targetAccountId}/notification-preferences`,
				{ notificationsEnabled: nextValue },
			);
			if (accountIdRef.current !== targetAccountId) return;
			const saved = data || { notificationsEnabled: nextValue };
			setNotificationSettings(saved);
			setAccounts(current =>
				current.map(account =>
					account.id === targetAccountId
						? {
								...account,
								currentAccess: {
									...(account.currentAccess || {}),
									notificationsEnabled: saved.notificationsEnabled !== false,
								},
							}
						: account,
				),
			);
			toast.success(t.notificationsSaved);
		} catch (error) {
			setNotificationSettings(current => ({
				notificationsEnabled: !nextValue,
			}));
			toast.error(
				error.response?.data?.message || 'Could not save WhatsApp notification settings',
			);
		} finally {
			setNotificationSettingsSaving(false);
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

	// Inbox swipe: inline-start side = read/unread + pin; inline-end side = archive + ⋯
	// (⋯ opens the conversation sheet, which is the bottom sheet on phones).
	const rowSwipeEnabled = phoneViewport && !chatListCollapsed && !demo.settings.enabled;
	const swipeStartActionsFor = conversation => {
		const ar = locale === 'ar';
		const unread = conversationUnreadCount(conversation) > 0;
		return [
			{
				id: 'read',
				label: unread ? (ar ? 'مقروءة' : 'Read') : ar ? 'غير مقروءة' : 'Unread',
				icon: unread ? CheckCheck : Mail,
				tone: 'info',
				onSelect: () => void toggleConversationReadState(conversation),
			},
			{
				id: 'pin',
				label: conversation.isPinned ? (ar ? 'إلغاء التثبيت' : 'Unpin') : ar ? 'تثبيت' : 'Pin',
				icon: Pin,
				tone: 'muted',
				onSelect: () => void toggleConversationPinned(conversation),
			},
		];
	};
	const swipeEndActionsFor = conversation => {
		const ar = locale === 'ar';
		return [
			{
				id: 'more',
				label: ar ? 'المزيد' : 'More',
				icon: MoreHorizontal,
				tone: 'neutral',
				onSelect: () => {
					const row =
						typeof document === 'undefined'
							? null
							: document.querySelector(`[data-conversation-id="${conversation.id}"]`);
					suppressConversationClickRef.current = true;
					setConversationActionAnchor(row?.getBoundingClientRect() || null);
					setConversationActionTarget(conversation);
				},
			},
			{
				id: 'archive',
				label: conversation.isArchived ? (ar ? 'إلغاء الأرشفة' : 'Unarchive') : ar ? 'أرشفة' : 'Archive',
				icon: Archive,
				tone: 'primary',
				onSelect: () => void toggleConversationArchived(conversation),
			},
		];
	};

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

	// Latest workspace values for thread row handlers (see threadRowCache).
	threadLiveRef.current = {
		openPersonCard: (sender, avatarUrl) => {
			const waId = String(sender?.key || '');
			// Only real WhatsApp ids; a name-only sender has nobody to look up.
			if (!waId || waId.startsWith('name:') || waId === 'unknown') return;
			setPersonCard({ waId, name: sender.name || '', avatarUrl: avatarUrl || '', color: sender.color });
		},
		applyGroupMessageSelection,
		applyMediaSelection,
		applyMessagesSelection,
		beginSwipeReply,
		cancelMessageLongPress,
		closeReactionPicker,
		endSwipeReply,
		groupSelectMode,
		handleMessageAction,
		highlightedMessageKey,
		jumpToQuotedMessage,
		libraryTitleForMessage,
		mediaSelectMode,
		mentionDirectory,
		moveSwipeReply,
		openConversationFromContact,
		openMessageContextMenu,
		openMessageGroup,
		openMessageQuickActions,
		openVideoToVoiceEditor,
		reactToMessage,
		registerChatImage,
		registeredChatImages,
		resolveReactor,
		selectedMediaIds,
		selectedMessageIds,
		setActionMessageAnchor,
		setActionMessageId,
		setLibrarySaveTarget,
		setMessageTranslations,
		setSelectedMediaIds,
		setStoryTarget,
		socialDownloads,
		startMessageLongPress,
		startSocialVideoDownload,
		t,
		ticketSelectMode,
		toggleIncomingTranslation,
		toggleReactionPicker,
		unreadDividerMessageId,
	};
	// Everything a thread row draws from; a cached row is rebuilt when any of these changes.
	const threadRowDeps = [
		accountId,
		actionMessageAnchor,
		actionMessageId,
		collectDownloadableAttachments,
		conversationId,
		conversations.length,
		demo.settings.enabled,
		downloadingSelectedMedia,
		effectiveConversations.length,
		groupSelectMode,
		isAccountConnected,
		locale,
		mediaSelectMode,
		mentionDirectory,
		messageGroupMembership,
		messageTranscripts,
		messageTranslations,
		pendingMessageActions,
		reactingMessageIds,
		reactionPickerMessageId,
		scheduleConversationOptions?.length || 0,
		selectedAccount ? [selectedAccount.id, selectedAccount.label, selectedAccount.phoneNumber, selectedAccount.wid, selectedAccount.avatarUrl].join('|') : '',
		selectedConversation ? [selectedConversation.id, selectedConversation.type, selectedConversation.providerChatId, selectedConversation.isEmailMemoAi, selectedConversation.contact?.phoneNumber, conversationTitle(selectedConversation), conversationAvatarUrl(selectedConversation)].join('|') : '',
		selectedMediaIds,
		selectedMessageIds,
		socialDownloads,
		t,
		ticketSelectMode,
		unreadAtOpen,
		unreadDividerMessageId,
		videoToVoiceTarget,
		virtualizeMessages,
	];

	return (
		<div
			className={`wa-mobile-shell wa-web-desktop relative mx-auto flex h-dvh w-full max-w-none flex-col overflow-hidden bg-white text-slate-900 min-[769px]:h-[calc(100vh-25px)] min-[769px]:gap-0 min-[769px]:overflow-hidden min-[769px]:bg-transparent dark:bg-[#0b141a] dark:text-slate-100 ${locale === 'ar' ? 'font-ar' : ''}`}
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
			{/* Wallet scrolls the header away with the page; other tabs keep it pinned. */}
			{!(isConversationWorkspaceTab(activeTab) && conversationId) &&
				activeTab !== 'wallet' &&
				activeTab !== 'adhkar' &&
				activeTab !== 'learn' &&
				activeTab !== 'reading' &&
				activeTab !== 'prompts' && (
				<MobileWhatsAppHeader
					locale={locale}
					title={
						activeTab === 'statuses'
							? t.updates
							: activeTab === 'reading'
								? t.reading
							: activeTab === 'prompts'
								? t.prompts
							: activeTab === 'online'
								? t.onlineTab
							: activeTab === 'groups'
								? t.groups
								: t[activeTab] || t.title
					}
					onSearch={() => {
						if (!isConversationWorkspaceTab(activeTab)) void loadTabData('chats');
						setSearchOpen(true);
						// Phones: put the cursor in the chat search so the user can find who to message.
						window.setTimeout(() => {
							document.querySelector('.wa-m-search input')?.focus();
						}, 60);
					}}
					onCamera={seesWholeAccount ? () => void loadTabData('statuses') : undefined}
					onMore={() => setMobileMenuOpen(current => !current)}
					onReading={() => void loadTabData('reading')}
					showTitle={!isConversationWorkspaceTab(activeTab)}
					scrolled={isConversationWorkspaceTab(activeTab) && mobileHeaderScrolled}
				/>
			)}
			<MobileOverflowMenu
				open={mobileMenuOpen}
				tabs={availableTabs.filter(([key]) => !['chats', 'channels', 'statuses', 'groups', 'contacts'].includes(key))}
				labels={t}
				locale={locale}
				darkMode={darkMode}
				onToggleDarkMode={toggleDarkMode}
				onSwitchLocale={switchLocale}
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
				mobileToolActions={[
					['emoji', Smile, locale === 'ar' ? 'إيموجي وستيكرز' : 'Emoji & stickers', '#EAB308'],
					...(demo.settings.enabled
						? []
						: [
								[
									'delayedSend',
									DelayedSendIcon,
									delayedSendOn
										? locale === 'ar'
											? 'تأجيل الإرسال (شغّال)'
											: 'Delay sending (on)'
										: locale === 'ar'
											? 'تأجيل الإرسال'
											: 'Delay sending',
									'#EF4444',
								],
							]),
					['aiImage', Sparkles, locale === 'ar' ? 'توليد صورة بالذكاء الاصطناعي' : 'AI image', '#8B5CF6'],
					...(demo.settings.enabled
						? []
						: [
								['schedule', Clock, t.scheduleMessage, '#0EA5E9'],
								['library', Bookmark, t.library, '#F59E0B'],
							]),
					['voiceChanger', AudioLines, t.voiceChanger, '#14B8A6'],
				]}
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
			<MountWhenOpened open={stickerPanelOpen}>
				<StickersPanel
					open={stickerPanelOpen}
					onClose={() => setStickerPanelOpen(false)}
					onInsertEmoji={emoji => setDraft(current => `${current}${emoji}`)}
					onSendSticker={file => sendFile(file, 'sticker')}
					accountId={accountId}
					locale={locale}
					anchorRef={stickerButtonRef}
				/>
			</MountWhenOpened>
			<MountWhenOpened open={aiImagePanelOpen}>
				<AiImageComposerPanel
					open={aiImagePanelOpen}
					onClose={() => setAiImagePanelOpen(false)}
					onSendImage={file => sendFile(file, 'image')}
					accountId={accountId}
					locale={locale}
					anchorRef={aiImageButtonRef}
					disabled={!canComposeInConversation}
				/>
			</MountWhenOpened>
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
				<WaDialog
					zIndex={600}
					width={400}
					icon={<BellOff size={18} strokeWidth={2.1} />}
					title={locale === 'ar' ? 'كتم الإشعارات' : 'Mute notifications'}
					subtitle={conversationTitle(muteTargetConversation)}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => {
						setMuteDurationOpen(false);
						setMuteTargetConversation(null);
					}}
				>
					<div className="wa-dx__body">
						<p className="wa-dx__lead">
							{locale === 'ar'
								? 'مش هتوصلك إشعارات من المحادثة دي طول المدة اللي تختارها.'
								: 'You won’t get notifications from this chat for the time you pick.'}
						</p>
						<div className="wa-dx__options">
							{[
								{ minutes: 60 * 8, label: locale === 'ar' ? '٨ ساعات' : '8 hours' },
								{ minutes: 60 * 24, label: locale === 'ar' ? 'يوم واحد' : '1 day' },
								{ minutes: 60 * 24 * 7, label: locale === 'ar' ? 'أسبوع' : '1 week' },
								{ minutes: null, label: locale === 'ar' ? 'دائماً' : 'Always' },
							].map(option => (
								<button
									key={String(option.minutes)}
									type="button"
									className="wa-dx__option"
									onClick={() => void applyMuteDuration(muteTargetConversation, option.minutes)}
								>
									<span className="wa-dx__option-icon" aria-hidden="true">
										{option.minutes ? <Clock size={16} strokeWidth={2.1} /> : <BellOff size={16} strokeWidth={2.1} />}
									</span>
									<span className="wa-dx__option-label">{option.label}</span>
									<ChevronRight size={16} className="wa-dx__option-chev rtl:rotate-180" aria-hidden="true" />
								</button>
							))}
						</div>
					</div>
				</WaDialog>
			) : null}
			{shareContactOpen ? (
				<WaDialog
					zIndex={600}
					width={440}
					height={620}
					icon={<UserRound size={18} strokeWidth={2.1} />}
					title={locale === 'ar' ? 'إرسال جهة اتصال' : 'Send contact'}
					subtitle={locale === 'ar' ? 'اختار جهة الاتصال اللي هتتبعت كـ vCard' : 'Pick a contact to share as a vCard'}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => setShareContactOpen(false)}
				>
					<WaChatPicker
						autoFocus
						locale={locale}
						items={conversations.filter(
							item => item.id !== conversationId && !String(item.providerChatId || '').endsWith('@g.us'),
						)}
						onPick={item => void shareContactFromConversation(item)}
						actionIcon={<UserPlus size={16} strokeWidth={2.2} />}
						emptyText={locale === 'ar' ? 'لا توجد جهات اتصال' : 'No contacts yet'}
					/>
				</WaDialog>
			) : null}
			{editingMessage ? (
				<WaDialog
					zIndex={600}
					width={480}
					icon={<Pencil size={17} strokeWidth={2.1} />}
					title={locale === 'ar' ? 'تعديل الرسالة' : 'Edit message'}
					subtitle={
						locale === 'ar'
							? 'التعديل بيظهر للطرف التاني مع علامة «معدّلة»'
							: 'The other side sees it marked as “Edited”'
					}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => setEditingMessage(null)}
					footer={
						<>
							<span className="wa-ui-modal__footer-note">
								<kbd className="wa-dx__kbd">Ctrl</kbd>+<kbd className="wa-dx__kbd">Enter</kbd>
								{locale === 'ar' ? 'للحفظ' : 'to save'}
							</span>
							<button type="button" className="wa-ui-btn wa-ui-btn--ghost" onClick={() => setEditingMessage(null)}>
								{locale === 'ar' ? 'إلغاء' : 'Cancel'}
							</button>
							<button
								type="button"
								className="wa-ui-btn wa-ui-btn--primary"
								disabled={!String(editDraft || '').trim()}
								onClick={() => void submitEditMessage()}
							>
								<Check size={16} strokeWidth={2.4} />
								{locale === 'ar' ? 'حفظ' : 'Save'}
							</button>
						</>
					}
				>
					<div className="wa-dx__body">
						{editingMessage.text ? (
							<div className="wa-dx__quote">
								<span className="wa-dx__quote-label">{locale === 'ar' ? 'الأصلية' : 'Original'}</span>
								<p className="wa-privacy-identity" dir="auto">
									{editingMessage.text}
								</p>
							</div>
						) : null}
						<textarea
							value={editDraft}
							autoFocus
							dir="auto"
							onChange={event => setEditDraft(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
									event.preventDefault();
									if (String(editDraft || '').trim()) void submitEditMessage();
								}
							}}
							onFocus={event => {
								const length = event.currentTarget.value.length;
								event.currentTarget.setSelectionRange(length, length);
							}}
							rows={4}
							className="wa-ui-input wa-dx__textarea"
						/>
					</div>
				</WaDialog>
			) : null}
			{/* Desktop nav lives in the left rail — no top PageHeader on web. */}
			<div className="wa-web-workspace min-h-0 flex-1 max-[769px]:contents min-[769px]:flex min-[769px]:overflow-hidden">
				<WhatsAppDesktopRail
					activeTab={activeTab}
					onSelect={tab => void loadTabData(tab)}
					labels={t}
					unreadCount={unreadConversationCount}
					locale={locale}
					connected={isAccountConnected}
					avatarUrl={railAvatarUrl}
					showcaseOnly={showcaseOnly}
					showSettings={canManageWhatsApp || isAdmin}
					showBoard={!showcaseOnly && (canManageWhatsApp || canAssignWhatsApp || isAdmin)}
					showFakeChat={!showcaseOnly && fakeChatAllowed}
					showWallet={!showcaseOnly}
					showAdhkar={!showcaseOnly}
					showDocuments={!showcaseOnly && isAdmin}
					showLearn={!showcaseOnly}
					showPrompts={!showcaseOnly}
					showUpdates={seesWholeAccount}
					showFacebook={false}
					onOpenSettings={() => void loadTabData('settings')}
					onOpenProfile={() => void loadTabData('profile')}
					darkMode={darkMode}
					onToggleDarkMode={toggleDarkMode}
					onSwitchLocale={switchLocale}
				/>
			<div className={`wa-web-main min-h-0 flex-1 max-[769px]:min-h-0 ${
				activeTab === 'board' || activeTab === 'fakeChat'
					? 'wa-board-workspace'
					: isConversationWorkspaceTab(activeTab)
						? 'overflow-y-auto nice-scroll wa-chat-workspace-scroll'
						: 'overflow-y-auto nice-scroll'
			}`}>
				{/* Compact account switcher for desktop utility tabs (replaces PageHeader actions). */}
				{['accounts', 'reports', 'settings', 'profile'].includes(activeTab) ? (
					<div className="p-4 mb-4 hidden items-center justify-between gap-3 min-[769px]:flex">
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
							{accounts.length > 0 && !showcaseOnly && (
								<AccountSwitcherDropdown
									accounts={accounts}
									value={accountId}
									onChange={selectWhatsAppAccount}
									labels={t}
									statusLabels={t}
									locale={locale}
									onManage={() => void loadTabData('accounts')}
								/>
							)}
						</div>
					</div>
				) : null}
				{tabError && activeTab !== 'accounts' && (
					<div
						role="alert"
						className=" !p-4 mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50  text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
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
				{connectionProblem && activeTab !== 'accounts' ? (
					<div
						role="alert"
						className="mx-2 mb-2 mt-1 flex items-center gap-2.5 rounded-xl border border-[#f5c2c7] bg-[#fde8ea] px-3 py-2 text-[13px] font-semibold text-[#8a1c24] dark:border-[#5c2a2f] dark:bg-[#3a1d21] dark:text-[#f5b5bb]"
					>
						<AlertTriangle size={17} strokeWidth={2.2} className="shrink-0" />
						<span className="min-w-0 flex-1" dir="auto">
							{connectionProblem === 'relink'
								? locale === 'ar'
									? `واتساب (${selectedAccount?.label || selectedAccount?.phoneNumber || ''}) اتفصل ومحتاج لينك جديد. الرسايل الجديدة مش بتوصل.`
									: `WhatsApp (${selectedAccount?.label || selectedAccount?.phoneNumber || ''}) was unlinked. New messages are not arriving.`
								: locale === 'ar'
									? 'واتساب مش متصل دلوقتي، وبيحاول يرجع لوحده. لو فضل كده افتح الاتصال.'
									: 'WhatsApp is offline and trying to reconnect. If it stays this way, open the connection.'}
						</span>
						<button
							type="button"
							onClick={() => setActiveTab('accounts')}
							className="shrink-0 cursor-pointer rounded-lg border-0 bg-[#b42318] px-3 py-1.5 text-[12px] font-bold text-white"
						>
							{connectionProblem === 'relink'
								? locale === 'ar'
									? 'اعمل لينك'
									: 'Relink'
								: locale === 'ar'
									? 'الاتصال'
									: 'Connection'}
						</button>
					</div>
				) : null}
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
				{activeTab === 'accounts' && bootStatus === 'success' && (() => {
					const accountTone = status =>
						status === 'connected'
							? 'ok'
							: ['connecting', 'qr_pending'].includes(status)
								? 'wait'
								: status === 'error'
									? 'err'
									: 'off';
					const ar = locale === 'ar';
					const phoneLabel = account =>
						account?.phoneNumber ? `+${String(account.phoneNumber).replace(/^\+/, '')}` : '';
					const online = accounts.filter(item => accountTone(item.status) === 'ok').length;
					const needAttention = accounts.length - online;
					const summary = !accounts.length
						? ar
							? 'لسه مفيش أرقام مربوطة.'
							: 'No numbers linked yet.'
						: !needAttention
							? ar
								? `${accounts.length === 1 ? 'رقم واحد' : `${accounts.length} أرقام`}، كلهم شغالين.`
								: `${accounts.length} ${accounts.length === 1 ? 'number' : 'numbers'}, all online.`
							: ar
								? `${accounts.length} ${accounts.length === 1 ? 'رقم' : 'أرقام'}، ${needAttention} محتاج تدخل منك.`
								: `${accounts.length} ${accounts.length === 1 ? 'number' : 'numbers'}, ${needAttention} ${needAttention === 1 ? 'needs' : 'need'} attention.`;
					const selectedTone = selectedAccount ? accountTone(selectedAccount.status) : 'off';
					const selectedMeta = selectedAccount ? statusMeta(selectedAccount.status, t, selectedAccount) : null;
					const lastConnected = selectedAccount?.lastConnectedAt ? new Date(selectedAccount.lastConnectedAt) : null;
					const stats = selectedAccount?.stats || null;
					// Bringing in chats after linking: only while it really happens, never a stuck 100%.
					const hydrating = selectedAccount?.status === 'connected' && selectedAccount?.syncPhase === 'hydrating';
					const hydratePct = Math.max(6, Math.min(99, Number(syncProgress) || 40));
					const statusSentence = !selectedAccount
						? ''
						: hydrating
							? ar
								? 'متصل، وبنجيب الشاتات من التليفون دلوقتي.'
								: 'Connected. Bringing your chats over from the phone.'
							: selectedTone === 'ok'
								? ar
									? 'متصل والرسايل بتوصل.'
									: 'Connected, messages are coming in.'
								: selectedTone === 'wait'
									? ar
										? 'مستني الربط من التليفون.'
										: 'Waiting for the phone to finish linking.'
									: selectedTone === 'err'
										? ar
											? 'الاتصال وقع. أعد الاتصال عشان الرسايل توصل تاني.'
											: 'The connection dropped. Reconnect to start receiving messages again.'
										: ar
											? 'مش متصل. الرسايل مش هتوصل لحد ما تربطه.'
											: 'Not connected. Messages will not arrive until you link it.';
					// "3 days ago", "2 minutes ago": full phrases read better here than the inbox's "3d".
					const agoText = value => {
						const time = new Date(value).getTime();
						if (!Number.isFinite(time)) return '—';
						const diff = time - Date.now();
						const abs = Math.abs(diff);
						if (abs < 60_000) return ar ? 'دلوقتي' : 'just now';
						const rtf = new Intl.RelativeTimeFormat(ar ? 'ar-EG' : 'en', { numeric: 'auto' });
						if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
						if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
						return rtf.format(Math.round(diff / 86_400_000), 'day');
					};
					const copyPhone = async () => {
						const value = phoneLabel(selectedAccount);
						if (!value) return;
						try {
							await navigator.clipboard.writeText(value);
							toast.success(ar ? 'اتنسخ الرقم' : 'Number copied');
						} catch {
							toast.error(ar ? 'مقدرناش ننسخ الرقم' : 'Could not copy the number');
						}
					};
					const confirmLogout = () => {
						const ok = window.confirm(
							ar
								? 'هتفك ربط الرقم ده من واتساب، وهتحتاج تمسح QR من جديد عشان ترجعه. تكمل؟'
								: 'This unlinks the number from WhatsApp, and you will need to scan a QR again to bring it back. Continue?',
						);
						if (ok) void disconnectAccount(true);
					};
					return (
					<div className="wa-acc !p-4">
						<aside className="wa-acc-side">
							<header className="wa-acc-side__head">
								<h2 className="wa-acc-side__title">{ar ? 'أرقام الواتساب' : 'WhatsApp numbers'}</h2>
								<p className="wa-acc-side__sub">{summary}</p>
							</header>
							<div className="wa-acc-list wa-ui-scroll nice-scroll" role="listbox" aria-label={t.accounts}>
								{accounts.map(account => {
									const meta = statusMeta(account.status, t, account);
									const tone = accountTone(account.status);
									const active = account.id === accountId;
									const unread = Number(account.stats?.unread) || 0;
									return (
										<button
											key={account.id}
											type="button"
											role="option"
											aria-selected={active}
											onClick={() => selectWhatsAppAccount(account.id)}
											className={`wa-acc-row is-${tone}${active ? ' is-active' : ''}`}
										>
											<span className="wa-acc-row__avatar">
												<Avatar label={account.label} size={10} />
												<span className="wa-acc-row__dot" aria-hidden="true" />
											</span>
											<span className="wa-acc-row__copy">
												<span className="wa-acc-row__name">{account.label}</span>
												<span className="wa-acc-row__sub">
													{tone === 'ok' ? (
														<bdi dir="ltr">{phoneLabel(account) || account.providerName}</bdi>
													) : (
														<span className={`wa-acc-row__state is-${tone}`}>{meta.label}</span>
													)}
												</span>
											</span>
											{unread ? (
												<span className="wa-acc-row__unread" title={ar ? 'رسايل مش مقروءة' : 'Unread messages'}>
													{unread > 99 ? '99+' : unread}
												</span>
											) : null}
										</button>
									);
								})}
							</div>
							{isAdmin &&
								(addingAccount ? (
									<form
										onSubmit={async event => {
											await createAccount(event);
											setAddingAccount(false);
										}}
										className="wa-acc-create"
									>
										<label className="wa-acc-create__label" htmlFor="whatsapp-account-name">
											{ar ? 'اسم الرقم الجديد' : 'Name for the new number'}
										</label>
										<input
											id="whatsapp-account-name"
											autoFocus
											value={newAccountName}
											onChange={event => setNewAccountName(event.target.value)}
											onKeyDown={event => {
												if (event.key === 'Escape') setAddingAccount(false);
											}}
											placeholder={ar ? 'مثلاً: خدمة العملاء' : 'For example: Front desk'}
										/>
										<div className="wa-acc-create__actions">
											<button type="button" className="wa-ui-btn wa-ui-btn--secondary" onClick={() => setAddingAccount(false)}>
												{ar ? 'إلغاء' : 'Cancel'}
											</button>
											<button
												type="submit"
												disabled={accountBusy || !String(newAccountName || '').trim()}
												className="wa-ui-btn wa-ui-btn--primary"
											>
												{accountBusy ? <Loader2 size={15} className="animate-spin" /> : null}
												{ar ? 'أضف الرقم' : 'Add number'}
											</button>
										</div>
									</form>
								) : (
									<button type="button" className="wa-acc-add" onClick={() => setAddingAccount(true)}>
										<Plus size={16} strokeWidth={2.2} aria-hidden="true" />
										{ar ? 'أضف رقم' : 'Add a number'}
									</button>
								))}
						</aside>

						<section className="wa-acc-main wa-ui-scroll nice-scroll">
							{!selectedAccount ? (
								<div className="wa-acc-card">
									<Empty icon={Smartphone} title={t.noAccounts} hint={t.noAccountsHint} />
								</div>
							) : (
								<>
									<header className={`wa-acc-head is-${selectedTone}`}>
										<span className="wa-acc-head__avatar">
											<Avatar label={selectedAccount.label} size={16} />
											<span className="wa-acc-head__dot" aria-hidden="true" />
										</span>
										<div className="wa-acc-head__id">
											<h2 className="wa-acc-head__name">{selectedAccount.label}</h2>
											{phoneLabel(selectedAccount) ? (
												<button type="button" className="wa-acc-head__phone" onClick={copyPhone} title={ar ? 'انسخ الرقم' : 'Copy number'}>
													<bdi dir="ltr">{phoneLabel(selectedAccount)}</bdi>
													<Copy size={13} strokeWidth={2.2} aria-hidden="true" />
												</button>
											) : (
												<p className="wa-acc-head__phone is-empty">{ar ? 'الرقم هيظهر بعد الربط' : 'The number shows after linking'}</p>
											)}
										</div>
										<div className="wa-acc-head__actions">
											{selectedAccount.status === 'connected' ? (
												<>
													<button type="button" onClick={() => setActiveTab('chats')} className="wa-ui-btn wa-ui-btn--primary">
														<MessageCircle size={16} strokeWidth={2.2} />
														{t.openWhatsAppInbox}
													</button>
													{canUseWhatsApp && (
														<button
															type="button"
															onClick={() => syncAccount()}
															disabled={syncingInbox}
															className="wa-ui-btn wa-ui-btn--secondary"
														>
															<RefreshCw size={15} strokeWidth={2.2} className={syncingInbox ? 'animate-spin' : undefined} />
															{syncingInbox ? (ar ? 'بيتزامن…' : 'Syncing…') : t.sync}
														</button>
													)}
												</>
											) : canManageWhatsApp ? (
												<button
													type="button"
													onClick={() =>
														connectAccount(undefined, {
															force: ['connecting', 'qr_pending', 'error'].includes(selectedAccount.status),
														})
													}
													disabled={accountBusy}
													className="wa-ui-btn wa-ui-btn--primary"
												>
													{accountBusy ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} strokeWidth={2.2} />}
													{['connecting', 'qr_pending', 'error'].includes(selectedAccount.status)
														? t.restartConnection
														: t.connect}
												</button>
											) : null}
										</div>
									</header>

									<div className={`wa-acc-pulse is-${selectedTone}`} role="status">
										<span className="wa-acc-pulse__light" aria-hidden="true" />
										<div className="wa-acc-pulse__text">
											<p className="wa-acc-pulse__line">{statusSentence}</p>
											{selectedTone === 'ok' && stats?.lastMessageAt ? (
												<p className="wa-acc-pulse__sub">
													{ar ? 'آخر رسالة وصلت ' : 'Last message '}
													{agoText(stats.lastMessageAt)}
												</p>
											) : null}
											{selectedTone === 'err' && selectedAccount.lastError ? (
												<p className="wa-acc-pulse__sub">{selectedAccount.lastError}</p>
											) : null}
											{selectedAccount.status === 'connecting' && !qr && !pairingCode ? (
												<p className="wa-acc-pulse__sub">{accStatus?.hint || t.syncingPhone}</p>
											) : null}
											{hydrating ? (
												<div className="wa-acc-pulse__bar" role="progressbar" aria-valuenow={hydratePct} aria-valuemin={0} aria-valuemax={100}>
													<span style={{ width: `${hydratePct}%` }} />
												</div>
											) : null}
										</div>
									</div>

									{canManageWhatsApp && selectedAccount.status !== 'connected' && (
										<div className="wa-acc-card">
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
												onConnectQr={() => connectAccount(undefined, { mode: 'qr', force: true })}
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
												conversationCount={stats?.chats ?? conversations.length}
											/>
										</div>
									)}

									<section className="wa-acc-section">
										<h3 className="wa-acc-section__title">{ar ? 'عن الرقم ده' : 'About this number'}</h3>
										<dl className="wa-acc-facts">
											{stats ? (
												<div>
													<dt>{ar ? 'المحادثات' : 'Chats'}</dt>
													<dd>
														{stats.chats.toLocaleString(ar ? 'ar-EG' : 'en')}
														{stats.unread ? (
															<span className="wa-acc-facts__note">
																{ar
																	? `${stats.unread.toLocaleString('ar-EG')} رسالة مش مقروءة`
																	: `${stats.unread.toLocaleString('en')} unread`}
															</span>
														) : null}
													</dd>
												</div>
											) : null}
											<div>
												<dt>{ar ? 'اتوصل' : 'Connected'}</dt>
												<dd title={lastConnected ? lastConnected.toLocaleString(ar ? 'ar-EG' : 'en') : undefined}>
													{lastConnected && selectedTone === 'ok'
														? agoText(lastConnected)
														: '—'}
												</dd>
											</div>
											<div>
												<dt>{t.connectionMethodLabel}</dt>
												<dd>
													{selectedAccount.connectionMethod === 'pairing_code'
														? t.connectionMethodPhone
														: selectedAccount.connectionMethod === 'qr'
															? t.connectionMethodQr
															: '—'}
												</dd>
											</div>
											<div>
												<dt>{ar ? 'الحالة' : 'Status'}</dt>
												<dd>{accStatus?.label || selectedMeta?.label}</dd>
											</div>
										</dl>
									</section>

									{canManageWhatsApp && (selectedAccount.status === 'connected' || isAdmin) && (
										<section className="wa-acc-section">
											<h3 className="wa-acc-section__title">
												{selectedAccount.status === 'connected'
													? ar
														? 'الجهاز المربوط'
														: 'Linked device'
													: ar
														? 'إدارة الرقم'
														: 'Manage number'}
											</h3>
											<ul className="wa-acc-actions">
												{selectedAccount.status === 'connected' && (
													<li>
														<div>
															<p className="wa-acc-actions__label">{ar ? 'وقّف الاتصال مؤقتاً' : 'Pause the connection'}</p>
															<p className="wa-acc-actions__hint">
																{ar
																	? 'الرسايل مش هتوصل هنا لحد ما توصله تاني. الربط بيفضل زي ما هو.'
																	: 'Messages stop arriving here until you reconnect. The link stays in place.'}
															</p>
														</div>
														<button type="button" onClick={() => disconnectAccount(false)} disabled={accountBusy} className="wa-ui-btn wa-ui-btn--secondary">
															<WifiOff size={15} strokeWidth={2.2} />
															{ar ? 'وقّف' : 'Pause'}
														</button>
													</li>
												)}
												{selectedAccount.status === 'connected' && (
													<li>
														<div>
															<p className="wa-acc-actions__label">{t.logout}</p>
															<p className="wa-acc-actions__hint">
																{ar
																	? 'يفك ربط الجهاز من واتساب. هتحتاج تمسح QR من جديد.'
																	: 'Unlinks this device from WhatsApp. You will need to scan a QR again.'}
															</p>
														</div>
														<button type="button" onClick={confirmLogout} disabled={accountBusy} className="wa-ui-btn wa-acc-btn-danger-outline">
															<LogOut size={15} strokeWidth={2.2} />
															{t.logout}
														</button>
													</li>
												)}
												{isAdmin && (
													<li>
														<div>
															<p className="wa-acc-actions__label">{t.deleteAccount}</p>
															<p className="wa-acc-actions__hint">
																{ar
																	? 'يحذف الرقم ومحادثاته من المساحة نهائياً.'
																	: 'Removes the number and its chats from this workspace for good.'}
															</p>
														</div>
														<button type="button" onClick={deleteAccount} disabled={accountBusy} className="wa-ui-btn wa-ui-btn--danger">
															<Trash2 size={15} strokeWidth={2.2} />
															{t.deleteAccount}
														</button>
													</li>
												)}
											</ul>
										</section>
									)}
								</>
							)}
						</section>
					</div>
					);
				})()}

				{isConversationWorkspaceTab(activeTab) && (
					<div className="wa-chat-workspace flex h-full min-h-0 flex-col">
					<Card
						className={`wa-chat-card min-h-0 flex-1 grid h-full min-h-[600px] overflow-hidden min-[769px]:overflow-visible max-[769px]:min-h-0 max-[769px]:rounded-none max-[769px]:border-0 ${
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
								onScroll={event => {
									setMobileHeaderScrolled(event.currentTarget.scrollTop > 0);
									// On phones this wrapper (header + rows) is the scroller, not the list.
									handleChatListScroll(event);
								}}
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
													{viewingChannels ? t.channels : t.chats}
												</h2>
												{(viewingChannels
													? unreadChannelCount
													: unreadConversationCount) > 0 ? (
													<span
														className="wa-unread-total"
														title={t.unreadMessagesLong.replace(
															'{count}',
															String(
																viewingChannels
																	? unreadChannelCount
																	: unreadConversationCount,
															),
														)}
													>
														{(viewingChannels
															? unreadChannelCount
															: unreadConversationCount) > 99
															? '99+'
															: viewingChannels
																? unreadChannelCount
																: unreadConversationCount}
													</span>
												) : null}
											</div>
										</div>
										<div className="wa-desktop-chat-list-actions">
											{/* Anchor only — opened from the ⋯ menu as “Hide names”. */}
											<WhatsAppPrivacyBlurControl
												hideTrigger
												open={privacyBlurMenuOpen}
												onOpenChange={setPrivacyBlurMenuOpen}
												value={privacyBlur}
												onChange={setPrivacyBlur}
												chats={privacyBlurPickerChats}
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
											{pageLock.status.enabled && !showcaseOnly ? (
												<button
													type="button"
													onClick={() => pageLock.lockNow()}
													aria-label={pageLockText.lockNow}
													title={`${pageLockText.lockNow} (Ctrl + Alt + L)`}
													className="wa-header-icon-btn"
												>
													<PageLockIcon size={18} strokeWidth={2.1} />
												</button>
											) : null}
											{isAdmin && !showcaseOnly ? (
												<TeamPresenceButton
													ar={locale === 'ar'}
													staff={staffOnline.filter(member => member.userId !== currentUserId)}
													assignedCounts={conversations.reduce((counts, item) => {
														const owner = item?.assignedUser?.id || item?.assignedUserId;
														if (owner) counts.set(owner, (counts.get(owner) || 0) + 1);
														return counts;
													}, new Map())}
												/>
											) : null}
											<button
												type="button"
												onClick={() => setQuickSwitchOpen(true)}
												aria-label={locale === 'ar' ? 'التنقل السريع' : 'Quick switcher'}
												title={`${locale === 'ar' ? 'التنقل السريع' : 'Quick switcher'} (Ctrl + Space)`}
												className="wa-header-icon-btn hidden min-[769px]:grid"
											>
												<QuickSwitchIcon size={18} strokeWidth={2.1} />
											</button>
											<WaActionMenu
												iconOnly
												ariaLabel={t.moreChatListTools}
												buttonClassName="wa-header-icon-btn hidden min-[769px]:grid"
												actions={[
													{
														id: 'autoForward',
														label: t.autoForward,
														icon: Forward,
														hidden:
															showcaseOnly ||
															!(canUseWhatsApp || canManageWhatsApp || isAdmin),
														onClick: () => setAutoForwardOpen(true),
													},
													{
														id: 'hideNames',
														label: t.hideNames,
														icon: EyeOff,
														active: Boolean(privacyBlur?.enabled),
														opensSubmenu: true,
														onClick: () => setPrivacyBlurMenuOpen(true),
													},
													{
														id: 'typing',
														label: t.typing,
														icon: TypingLogIcon,
														dividerBefore: true,
														hidden: showcaseOnly || !seesWholeAccount,
														onClick: () => void loadTabData('typing'),
													},
													{
														id: 'groups',
														label: t.groups || t.communities,
														icon: UsersRound,
														hidden: showcaseOnly,
														onClick: () => void loadTabData('groups'),
													},
													{
														id: 'agent',
														label: t.agent || (locale === 'ar' ? 'الذكاء الاصطناعي' : 'AI'),
														icon: Bot,
														hidden: showcaseOnly || !(canManageWhatsApp || isAdmin),
														onClick: () => void loadTabData('agent'),
													},
													{
														id: 'accounts',
														label: t.accounts,
														icon: Smartphone,
														dividerBefore: true,
														hidden: showcaseOnly,
														onClick: () => void loadTabData('accounts'),
													},
													{
														id: 'reports',
														label: t.reports,
														icon: BarChart3,
														hidden: showcaseOnly || !seesWholeAccount,
														onClick: () => void loadTabData('reports'),
													},
												]}
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
									<div className="mb-2.5 hidden items-center gap-2 min-[769px]:flex">
										<div className="wa-desktop-search-inline wa-desktop-search-always min-w-0 flex-1">
										<Search size={19} className="wa-desktop-search-inline__icon" />
										<WaChatSearchInput
											inputRef={searchInputRef}
											className="outline-none"
											aria-label={t.search}
											value={chatSearch}
											onCommit={setChatSearch}
											placeholder={
												locale === 'ar'
													? 'ابحث أو ابدأ محادثة جديدة'
													: 'Search or start a new chat'
											}
										>
											{(searchText, clearSearch) => (
												<>
													{searchingConversations ? (
														<Loader2 size={13} className="wa-desktop-search-inline__spin" />
													) : null}
													{!searchText && !searchingConversations ? (
														<kbd className="wa-search-kbd" aria-hidden="true">
															{typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ K' : 'Ctrl K'}
														</kbd>
													) : null}
													{searchText ? (
														<button
															type="button"
															className="wa-desktop-search-inline__close"
															aria-label={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
															onClick={clearSearch}
														>
															<X size={12} strokeWidth={2.4} />
														</button>
													) : null}
												</>
											)}
										</WaChatSearchInput>
										</div>
										<button
											type="button"
											className="wa-contacts-plus"
											aria-label={t.contacts}
											title={t.contacts}
											onClick={() => setContactsPopupOpen(true)}
										>
											<Plus size={18} strokeWidth={2.4} />
										</button>
									</div>
									<div className="mb-1.5 hidden min-[769px]:block">
										<ConversationFilterDropdown
											variant="pills"
											value={conversationFilter}
											onChange={setConversationFilter}
											counts={{
												all: unreadConversationCount,
												unread: unreadConversationCount,
												channels: unreadChannelCount,
												keep_in_touch: keepInTouchDueCount,
											}}
											labels={{
												all: t.allChats,
												unread: t.unreadChats,
												favorites: t.favoriteChats,
												keepInTouch: t.keepInTouch,
												channels: t.channels,
												important: t.importantChats,
											}}
										/>
									</div>
									<div className="wa-mobile-chat-tools hidden">
										<h1 className="mb-2 title-whatsapp flex items-center gap-2">
											<span>{viewingChannels ? t.channels : t.chats}</span>
											{(viewingChannels
												? unreadChannelCount
												: unreadConversationCount) > 0 ? (
												<span
													className="wa-unread-total"
													title={t.unreadMessagesLong.replace(
														'{count}',
														String(
															viewingChannels
																? unreadChannelCount
																: unreadConversationCount,
														),
													)}
												>
													{(viewingChannels
														? unreadChannelCount
														: unreadConversationCount) > 99
														? '99+'
														: viewingChannels
															? unreadChannelCount
															: unreadConversationCount}
												</span>
											) : null}
										</h1>
										<div className="wa-m-search-row">
										<label className="wa-m-search min-w-0 flex-1">
											<Search size={18} strokeWidth={2.2} aria-hidden="true" />
											<WaChatSearchInput
												type="search"
												aria-label={t.search}
												value={chatSearch}
												onCommit={setChatSearch}
												placeholder={locale === 'ar' ? 'بحث' : 'Search'}
												enterKeyHint="search"
											>
												{(searchText, clearSearch) =>
													searchText ? (
														<button
															type="button"
															className="wa-m-search__clear"
															aria-label={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
															onClick={clearSearch}
														>
															<X size={12} strokeWidth={3} />
														</button>
													) : null
												}
											</WaChatSearchInput>
										</label>
										<button
											type="button"
											className="wa-contacts-plus"
											aria-label={t.contacts}
											title={t.contacts}
											onClick={() => setContactsPopupOpen(true)}
										>
											<Plus size={18} strokeWidth={2.4} />
										</button>
										</div>

										<div className="wa-m-chips" role="tablist" aria-label={t.chats}>
											{[
												['all', t.allChats],
												['unread', t.unreadChats, unreadConversationCount],
												['favorites', t.favoriteChats],
												[KEEP_IN_TOUCH_FILTER, t.keepInTouch, keepInTouchDueCount],
												['channels', t.channels, unreadChannelCount],
												['important', t.importantChats],
											].map(([value, label, count]) => (
												<button
													key={value}
													type="button"
													role="tab"
													aria-selected={conversationFilter === value}
													onClick={() => setConversationFilter(value)}
													className={`wa-m-chip${conversationFilter === value ? ' is-active' : ''}`}
												>
													{label}
													{count ? <span className="wa-m-chip__count">{count > 99 ? '99+' : count}</span> : null}
												</button>
											))}
											<button type="button" onClick={() => void loadTabData('groups')} className="wa-m-chip">
												{t.groups}
											</button>
											{/* Saved media is not a conversation filter, but this row is the only
											    always-visible tab strip — the composer button needs an open chat. */}
											<button
												type="button"
												onClick={() => setLibraryOpen(true)}
												className={`inline-flex h-[28px] shrink-0 items-center gap-1 rounded-[19px] px-3 text-[11px] font-semibold ${
													libraryOpen
														? 'bg-[#D9FDD3] text-[#008069]'
														: 'bg-[#F0F2F5] text-[#54656F]'
												}`}
											>
												<Bookmark size={12} strokeWidth={2.4} />
												{t.library}
											</button>
										</div>
									</div>
								</div>
								<div
									ref={chatListScrollRef}
									className="wa-conversation-list min-h-0 flex-1 overflow-y-auto p-2 nice-scroll"
									onScroll={handleChatListScroll}
								>
									{chatListPull.pull > 0 || chatListPull.refreshing ? (
										<div
											className="wa-pull-indicator"
											data-wa-pull-indicator=""
											role="status"
											aria-live="polite"
											style={{ height: chatListPull.refreshing ? 44 : chatListPull.pull }}
										>
											<span className="wa-pull-indicator__chip">
												{chatListPull.refreshing ? (
													<Loader2 size={14} className="animate-spin" aria-hidden="true" />
												) : (
													<RefreshCw
														size={14}
														aria-hidden="true"
														style={{ transform: `rotate(${Math.round(chatListPull.pull * 3)}deg)` }}
													/>
												)}
												{chatListPull.refreshing
													? t.refreshing
													: chatListPull.armed
														? t.releaseToRefresh
														: t.pullToRefresh}
											</span>
										</div>
									) : null}
									{!viewingChannels && conversationFilter === 'archived' ? (
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
											{archivedInboxUnreadCount > 0 ? (
												<span
													className="wa-archived-row__unread"
													title={t.archivedUnread.replace(
														'{count}',
														String(archivedInboxUnreadCount),
													)}
												>
													{archivedInboxUnreadCount > 99 ? '99+' : archivedInboxUnreadCount}
												</span>
											) : archivedChatsCount > 0 ? (
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
															{viewingChannels
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
										<SearchContactsSection
											accountId={!syncingInbox && chatSearch.trim() ? accountId : null}
											query={chatSearch}
											ar={locale === 'ar'}
											excludeConversationIds={null}
											onOpen={openContactFromSearch}
											fallback={
												<Empty
													icon={!syncingInbox && chatSearch.trim() ? Search : MessageCircle}
													hint={
														!syncingInbox && chatSearch.trim()
															? locale === 'ar'
																? 'تحقق من الإملاء أو ابحث برقم الهاتف.'
																: 'Check the spelling or search by phone number.'
															: null
													}
													action={
														syncingInbox
															? null
															: chatSearch.trim()
																? {
																		label: locale === 'ar' ? 'مسح البحث' : 'Clear search',
																		onClick: () => setChatSearch(''),
																	}
																: ['unread', 'favorites', 'channels'].includes(conversationFilter)
																	? {
																			label: locale === 'ar' ? 'عرض كل المحادثات' : 'Show all chats',
																			onClick: () => setConversationFilter('all'),
																		}
																	: null
													}
													title={
														syncingInbox
															? syncStage === 'fetching_chats' ||
																(syncProgress >= 25 && syncProgress <= 45)
																? t.syncingChatsFetching
																: t.syncingChats
																: chatSearch.trim()
																	? locale === 'ar'
																		? `لا توجد محادثات تطابق «${chatSearch.trim()}»`
																		: `No chats match “${chatSearch.trim()}”`
																: conversationFilter === 'unread'
																	? locale === 'ar'
																		? 'لا توجد محادثات غير مقروءة'
																		: 'No unread chats'
																: conversationFilter === 'favorites'
																	? locale === 'ar'
																		? 'لا توجد محادثات في المفضلة'
																		: 'No favourite chats'
																: conversationFilter === 'channels'
																	? t.noChannels
																: conversationFilter === KEEP_IN_TOUCH_FILTER
																	? t.noKeepInTouch
																: conversationFilter === 'archived'
																	? t.noArchivedConversations
																	: conversationFilter === 'important'
																		? t.noImportantConversations
																	: conversationScope === 'assigned'
																	? t.noAssignedConversations
																	: t.noConversations
													}
												/>
											}
										/>
										)
									) : (
										<>
											<WaWindowedRows
												items={filteredConversations}
												scrollRef={chatListScrollRef}
												visible={chatListRowsVisible}
												renderRow={conversation => (
												<WaSwipeRow
													key={conversation.id}
													rowKey={conversation.id}
													openKey={openSwipeRowId}
													onOpenChange={setOpenSwipeRowId}
													enabled={rowSwipeEnabled}
													startActions={rowSwipeEnabled ? swipeStartActionsFor(conversation) : []}
													endActions={rowSwipeEnabled ? swipeEndActionsFor(conversation) : []}
												>
												<WaConversationRow
													conversation={conversation}
													keepInTouchView={conversationFilter === KEEP_IN_TOUCH_FILTER}
													active={conversation.id === conversationId || conversation.id === secondaryConversationId}
													isSplitSecondary={conversation.id === secondaryConversationId}
													story={conversation.type !== 'group' ? storyForConversation(conversation) : null}
													viewedStatusIds={viewedStatusIds}
													collapsed={chatListCollapsed}
													demoEnabled={demo.settings.enabled}
													pinPending={pendingPreferenceActions.has(`pin:${conversation.id}`)}
													favoritePending={pendingPreferenceActions.has(`favorite:${conversation.id}`)}
													selfChat={isSelfChatConversation(conversation, selectedAccount)}
													locale={locale}
													t={t}
													actions={conversationRowActions}
													agentBadge={agentRowBadge(agentRowStates.get(conversation.id))}
													privacyBlurred={Boolean(privacyBlurChatIds?.has(conversation.id))}
												/>
												</WaSwipeRow>
												)}
											/>
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
											{chatSearch.trim() ? (
												<SearchContactsSection
													accountId={accountId}
													query={chatSearch}
													ar={locale === 'ar'}
													excludeConversationIds={new Set(filteredConversations.map(item => item.id))}
													onOpen={openContactFromSearch}
												/>
											) : null}
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
										data-privacy-chat={collapsedChatTip.privacyBlurred ? 'on' : undefined}
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
						<WaErrorBoundary locale={locale}>
						<section
							className={`wa-chat-thread-pane relative ${!conversationId ? 'hidden min-[769px]:flex' : 'flex'} h-full min-h-0 min-w-0 flex-col overflow-hidden`}
							data-privacy-chat={selectedChatPrivacyBlurred ? 'on' : undefined}
						>
							{!selectedConversation ? (
								// Mobile hides this pane, so skip mounting its animated scene there.
								!isDesktopLayout ? null : <ChatIdlePane
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
											<button type="button" aria-label={locale === 'ar' ? 'رجوع إلى المحادثات' : 'Back to chats'} onClick={() => { waPerfMark('chat:back'); setConversationId(null); }} className="wa-header-icon-btn wa-chat-back-btn grid shrink-0 place-items-center min-[769px]:hidden">
												{locale === 'ar' ? <ChevronRight size={20} strokeWidth={2.2} /> : <ChevronLeft size={20} strokeWidth={2.2} />}
											</button>
											{unreadConversationCount > 0 ? (
												<span className="wa-chat-back-count min-[769px]:hidden">
													{unreadConversationCount > 99 ? '99+' : unreadConversationCount}
												</span>
											) : null}
											<button
												type="button"
												className="wa-chat-toolbar__profile flex min-w-0 items-center gap-3 text-start"
												onClick={() => {
													if (isEmailMemoAiConversation(selectedConversation)) return;
													void openConversationInfo(selectedConversation);
												}}
												aria-label={
													selectedConversation.type === 'group'
														? locale === 'ar'
															? 'معلومات الجروب والأعضاء'
															: 'Group info and members'
														: locale === 'ar'
															? 'معلومات جهة الاتصال'
															: 'Contact info'
												}
											>
												{isEmailMemoAiConversation(selectedConversation) ? null : (
													<div className="wa-chat-avatar-ring shrink-0">
														<Avatar
															label={conversationTitle(selectedConversation)}
															size={10}
															isGroup={selectedConversation.type === 'group'}
															src={conversationAvatarUrl(selectedConversation)}
															conversationId={selectedConversation.id}
															onAvatarRefreshed={url => {
																conversationRowHandlersRef.current?.applyAvatar?.(
																	selectedConversation.id,
																	url,
																);
															}}
														/>
													</div>
												)}
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
																? (
																	<TypingIndicator
																		locale={locale}
																		recording={Boolean(
																			selectedConversation.presence?.recording,
																		)}
																		senderName={selectedConversation.presence?.senderName || ''}
																		count={selectedConversation.presence?.typers?.length || 1}
																	/>
																)
																: (
																	<ChatHeaderPresenceSubtitle
																		presence={selectedConversation.presence}
																		locale={locale}
																		assigneeName={selectedConversation.assignedUser?.name || t.unassign}
																	/>
																)}
													</p>
													<p className="wa-chat-contact-hint hidden text-[11px] text-[#667781]">
														{selectedConversation.isTyping || selectedConversation.typing || selectedConversation.presence?.typing
															? (
																<TypingIndicator
																	locale={locale}
																	recording={Boolean(
																		selectedConversation.presence?.recording,
																	)}
																	senderName={selectedConversation.presence?.senderName || ''}
																	count={selectedConversation.presence?.typers?.length || 1}
																/>
															)
															: conversationPresenceSubtitle(
																	selectedConversation.presence,
																	locale,
																	formatLastSeen,
																)?.text ||
																(selectedConversation.type === 'group'
																	? locale === 'ar'
																		? 'اضغط هنا لمعلومات الجروب والأعضاء'
																		: 'tap here for group info and members'
																	: locale === 'ar'
																		? 'اضغط هنا لمعلومات جهة الاتصال'
																		: 'tap here for contact info')}
													</p>
												</div>
											</button>
										</div>
										<div className="flex items-center gap-1 min-[769px]:hidden">
											{!demo.settings.enabled && conversationId ? (
												<button
													type="button"
													title={
														pinsPanelOpen
															? t.hidePinnedMessages
															: pinnedMessages.length
																? t.showPinnedMessages
																: t.pinnedMessages
													}
													aria-label={t.pinnedMessages}
													aria-pressed={pinsPanelOpen || undefined}
													onClick={togglePinsPanel}
													className={`wa-header-icon-btn relative shadow-none ${pinsPanelOpen ? 'is-active' : ''}`}
												>
													<Pin
														size={18}
														strokeWidth={2.05}
														fill={pinnedMessages.length ? 'currentColor' : 'none'}
													/>
													{pinnedMessages.length > 0 ? (
														<span className="wa-toolbar-icon-btn__badge">
															{pinnedMessages.length > 9 ? '9+' : pinnedMessages.length}
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
												buttonClassName="wa-header-icon-btn shadow-none"
											/>
										</div>
										{isEmailMemoAiConversation(selectedConversation) ? (
											<div className="wa-memo-switch" role="tablist" aria-label={locale === 'ar' ? 'عرض' : 'View'}>
												<button
													type="button"
													role="tab"
													aria-selected={emailMemoView === 'chat'}
													className={emailMemoView === 'chat' ? 'is-on' : ''}
													onClick={() => setEmailMemoView('chat')}
												>
													<span>{locale === 'ar' ? 'الشات' : 'Chat'}</span>
												</button>
												<button
													type="button"
													role="tab"
													aria-selected={emailMemoView === 'settings'}
													className={emailMemoView === 'settings' ? 'is-on' : ''}
													onClick={() => {
														setMemoSettingsMounted(true);
														setEmailMemoView('settings');
													}}
												>
													<span>{locale === 'ar' ? 'الإعدادات' : 'Settings'}</span>
												</button>
											</div>
										) : null}
										<div className="wa-chat-toolbar-actions hidden items-center gap-2 min-[769px]:flex">
											<div className="wa-chat-toolbar-actions__group">
												{!demo.settings.enabled && conversationId && accountId ? (
													<button
														type="button"
														title={
															liveMessageSchedules.length
																? locale === 'ar'
																	? schedulesPanelOpen
																		? 'إخفاء المجدولة'
																		: 'إظهار المجدولة'
																	: schedulesPanelOpen
																		? 'Hide scheduled'
																		: 'Show scheduled'
																: t.scheduleMessage
														}
														aria-label={
															liveMessageSchedules.length
																? locale === 'ar'
																	? 'المجدولة'
																	: 'Scheduled messages'
																: t.scheduleMessage
														}
														aria-pressed={liveMessageSchedules.length ? schedulesPanelOpen : undefined}
														onClick={toggleSchedulesPanel}
														className={`wa-header-icon-btn relative ${schedulesPanelOpen && liveMessageSchedules.length ? 'is-active' : ''}`}
													>
														<CalendarDays size={18} strokeWidth={2.05} />
														{liveMessageSchedules.length > 0 ? (
															<span className="wa-toolbar-icon-btn__badge">
																{liveMessageSchedules.length > 9 ? '9+' : liveMessageSchedules.length}
															</span>
														) : null}
													</button>
												) : null}
												{!demo.settings.enabled && conversationId ? (
													<button
														type="button"
														title={
															pinsPanelOpen
																? t.hidePinnedMessages
																: pinnedMessages.length
																	? t.showPinnedMessages
																	: t.pinnedMessages
														}
														aria-label={t.pinnedMessages}
														aria-pressed={pinsPanelOpen || undefined}
														onClick={togglePinsPanel}
														className={`wa-header-icon-btn relative ${pinsPanelOpen ? 'is-active' : ''}`}
													>
														<Pin
															size={18}
															strokeWidth={2.05}
															fill={pinnedMessages.length ? 'currentColor' : 'none'}
														/>
														{pinnedMessages.length > 0 ? (
															<span className="wa-toolbar-icon-btn__badge">
																{pinnedMessages.length > 9 ? '9+' : pinnedMessages.length}
															</span>
														) : null}
													</button>
												) : null}
												{/* Second chat beside this one, one click away (it was buried in the ⋮ menu).
												    Wide screens only, like the split itself. */}
												{!demo.settings.enabled && conversationId ? (
													<button
														type="button"
														title={secondaryConversationId ? t.closeSplitChat : t.openSplitChat}
														aria-label={secondaryConversationId ? t.closeSplitChat : t.openSplitChat}
														aria-pressed={Boolean(secondaryConversationId || splitPickMode)}
														onClick={toggleSplitChat}
														className={`wa-header-icon-btn relative max-[768px]:!hidden ${
															secondaryConversationId || splitPickMode ? 'is-active' : ''
														}`}
													>
														<Columns2 size={18} strokeWidth={2.05} />
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
											{!demo.settings.enabled && (canAssignWhatsApp || canManageWhatsApp) && (
												<div className="wa-chat-assign-field relative inline-flex items-center">
													<span className="wa-chat-assign-field__label">
														{t.assignedTo}
													</span>
													<WaAssignMenu
														ariaLabel={t.assignedTo}
														value={selectedConversation.assignedUserId || ''}
														staff={assignableStaff}
														onAssign={assignConversation}
														onTogglePermission={toggleStaffPermission}
														canManageAccess={Boolean(canManageWhatsApp || isAdmin)}
														locale={locale}
														unassignLabel={t.unassign}
														loading={assignableStaffLoading}
														onlineIds={new Set(staffOnline.map(member => String(member.userId)))}
														className="wa-chat-assign-select w-auto max-w-[16rem]"
														buttonClassName="wa-chat-assign-trigger"
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
									{!browserOnline || !socketLive ? (
										<div
											role="status"
											className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-200 bg-[#fff5c4] px-3 py-1.5 text-[12px] font-semibold text-[#5c4b12] dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100"
										>
											<span
												className={`h-1.5 w-1.5 rounded-full ${browserOnline ? 'bg-amber-500' : 'bg-rose-500'}`}
											/>
											{browserOnline ? t.reconnectingSocket : t.computerOffline}
										</div>
									) : threadSyncingId && threadSyncingId === conversationId ? (
										<div className="pointer-events-none relative z-20 h-0 shrink-0">
											<div className="absolute inset-x-0 top-2 flex justify-center">
												<span
													role="status"
													data-wa-thread-syncing=""
													className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-emerald-700 shadow-sm ring-1 ring-black/5 dark:bg-[#202c33]/95 dark:text-emerald-300"
												>
													<Loader2 size={12} className="animate-spin" aria-hidden="true" />
													{t.syncingMessages}
												</span>
											</div>
										</div>
									) : null}
									{!demo.settings.enabled && !showcaseOnly && conversationId ? (
										<Suspense fallback={null}>
											<AiAgentChatBar
												conversationId={conversationId}
												locale={locale}
												canUse={Boolean(canUseWhatsApp || canManageWhatsApp || isAdmin)}
												onSent={message => {
													const targetId = message?.conversationId || conversationId;
													persistConversationMessages(targetId, current =>
														mergeMessages(current, [message], targetId),
													);
												}}
											/>
										</Suspense>
									) : null}
									<MessageQuickActions
										open={Boolean(quickActionsMessage)}
										anchorRect={quickActions?.rect || null}
										mine={Boolean(quickActions?.mine)}
										locale={locale}
										reactions={QUICK_REACTIONS.slice(0, 4)}
										canReact={Boolean(quickActionsMessage && !isViewOnceMessage(quickActionsMessage))}
										canCopy={Boolean(String(quickActionsMessage?.text || '').trim())}
										onClose={closeQuickActions}
										onReact={emoji => {
											const target = quickActionsMessage;
											closeQuickActions();
											if (target) void reactToMessage(target, emoji);
										}}
										onReply={() => {
											const target = quickActionsMessage;
											closeQuickActions();
											if (target) void handleMessageAction(target, 'reply');
										}}
										onCopy={() => {
											const target = quickActionsMessage;
											closeQuickActions();
											if (target) void handleMessageAction(target, 'copy');
										}}
										onMore={() => {
											const target = quickActionsMessage;
											const rect = quickActions?.rect;
											closeQuickActions();
											if (!target) return;
											setActionMessageAnchor(rect || null);
											setActionMessageId(target.id);
										}}
									/>
									<ScheduledMessagesPanel
										ar={locale === 'ar'}
										open={schedulesPanelOpen}
										schedules={liveMessageSchedules}
										loading={messageSchedulesLoading}
										busyId={messageScheduleBusyId}
										onHide={() => setSchedulesPanelOpen(false)}
										onAdd={openSchedulePopover}
										onPause={pauseMessageSchedule}
										onResume={resumeMessageSchedule}
										onEdit={schedule => openEditSchedule(schedule)}
										onCancel={cancelMessageSchedule}
									/>
									<PinnedMessagesPanel
										ar={locale === 'ar'}
										open={pinsPanelOpen}
										messages={pinnedMessages}
										loading={pinnedMessagesLoading}
										busyId={
											[...pendingMessageActions].find(id =>
												pinnedMessages.some(item => item.id === id),
											) || ''
										}
										senderName={copySenderName}
										onHide={() => setPinsPanelOpen(false)}
										onJump={message => void jumpToPinnedMessage(message)}
										onUnpin={message => void handleMessageAction(message, 'pin')}
									/>
									{typingHistoryOpen && conversationId && !isDemoId(conversationId) ? (
										<Suspense fallback={null}>
											<TypingHistoryPanel
												locale={locale}
												open
												conversationId={conversationId}
												liveEvent={typingAttemptEvent}
												onHide={() => setTypingHistoryOpen(false)}
											/>
										</Suspense>
									) : null}
									{(conversationFilter === 'important' || conversationFilter === 'starred') && conversationId && !activeMessageGroup ? (
										<div className="flex shrink-0 items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
											<Star size={14} fill="currentColor" />
											<span>{t.importantOnlyBanner}</span>
										</div>
									) : null}
									{inChatSearchOpen ? (
										<ChatSearchBar
											ar={locale === 'ar'}
											query={inChatSearchQuery}
											onQuery={value => runInChatSearch(value)}
											busy={inChatSearchBusy}
											hits={inChatSearchHits}
											activeIndex={inChatSearchActiveIndex}
											onStep={stepInChatSearch}
											onPick={index => goToInChatSearchHit(index)}
											peerName={selectedChatTitle}
											onClose={() => {
												inChatSearchReqRef.current += 1;
												window.clearTimeout(inChatSearchTimerRef.current);
												setInChatSearchOpen(false);
												setInChatSearchQuery('');
												setInChatSearchHits([]);
												setInChatSearchActiveIndex(-1);
												setInChatSearchBusy(false);
											}}
										/>
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
										<Suspense fallback={null}>
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
										</Suspense>
									) : (
									<>
									<div className={`wa-chat-wallpaper-host${showEmailMemoSettings ? ' is-memo-settings' : ''}`}>
									<div className="wa-chat-wallpaper-layer" aria-hidden="true" />
									{memoSettingsMounted && isMemoChat ? (
										<div
											className={`wa-memo-settings-pane${showEmailMemoSettings ? '' : ' is-off'}`}
											role="tabpanel"
											hidden={!showEmailMemoSettings}
											aria-hidden={!showEmailMemoSettings}
										>
											<Suspense fallback={<WaPaneLoading label={t.loading} />}>
												<EmailMemoWorkspace variant="panel" />
											</Suspense>
										</div>
									) : null}
									{/* Keep the pane busy while the first page loads, unread
									    catch-up runs, or settle still hides bubbles (opacity 0).
									    Lives outside the scroller so it covers the visible
									    viewport instead of riding the scrolled content. */}
									{Boolean(conversationId) &&
									(Boolean(
										messageCatchUp &&
											messageCatchUp.conversationId === conversationId,
									) ||
										loadingMessages ||
										!threadSettled) &&
									!(
										threadSettled &&
										!loadingMessages &&
										!(
											messageCatchUp &&
											messageCatchUp.conversationId === conversationId
										) &&
										effectiveMessages.length === 0
									) ? (
										<div
											className="wa-thread-loader"
											role="status"
											aria-live="polite"
											aria-busy="true"
											aria-label={
												messageCatchUp &&
												messageCatchUp.conversationId === conversationId
													? t.loadingNewMessages.replace(
															'{count}',
															String(messageCatchUp.expected),
														)
													: messagesSyncHint || t.loadingMessages
											}
										>
											<div className="wa-thread-loader__stack" aria-hidden="true">
												<span className="wa-thread-loader__bubble wa-thread-loader__bubble--in" />
												<span className="wa-thread-loader__bubble wa-thread-loader__bubble--in wa-thread-loader__bubble--short" />
												<span className="wa-thread-loader__bubble wa-thread-loader__bubble--out" />
												<span className="wa-thread-loader__bubble wa-thread-loader__bubble--out wa-thread-loader__bubble--mid" />
												<span className="wa-thread-loader__bubble wa-thread-loader__bubble--in wa-thread-loader__bubble--mid" />
											</div>
											<div className="wa-thread-loader__pill">
												<span className="wa-thread-loader__mark">
													<span
														className="wa-thread-loader__ring"
														aria-hidden="true"
													/>
												</span>
												<p className="wa-thread-loader__label">
													{messageCatchUp &&
													messageCatchUp.conversationId === conversationId
														? t.loadingNewMessages.replace(
																'{count}',
																String(messageCatchUp.expected),
															)
														: messagesSyncHint || t.loadingMessages}
												</p>
											</div>
										</div>
									) : null}
									<div
										ref={messageBoxRef}
										onWheel={() => {
											lastThreadGestureAtRef.current = Date.now();
										}}
										onTouchMove={() => {
											lastThreadGestureAtRef.current = Date.now();
										}}
										// Dragging the scrollbar emits neither wheel nor touchmove, so
										// without this the drag-to-top gesture could never page in history.
										onPointerDown={() => {
											lastThreadGestureAtRef.current = Date.now();
										}}
										onKeyDown={event => {
											if (
												[
													'PageUp',
													'PageDown',
													'ArrowUp',
													'ArrowDown',
													'Home',
													'End',
													' ',
												].includes(event.key)
											) {
												lastThreadGestureAtRef.current = Date.now();
											}
										}}
										onScroll={event => {
											const box = event.currentTarget;
											const scrollTop = Number(box.scrollTop) || 0;
											const prevTop = lastThreadScrollTopRef.current;
											const scrollingUp = scrollTop < prevTop - 2;
											lastThreadScrollTopRef.current = scrollTop;
											userScrollingThreadRef.current = true;
											if (userScrollIdleTimerRef.current) {
												window.clearTimeout(userScrollIdleTimerRef.current);
											}
											userScrollIdleTimerRef.current = window.setTimeout(() => {
												userScrollingThreadRef.current = false;
											}, 250);
											// An older-messages restore is moving scrollTop itself; none of the checks below may
											// act then, and reading scrollHeight here forced a layout of the freshly prepended rows.
											if (pendingOlderRestore()) return;
											const distanceFromBottom = threadDistanceFromBottom(box);

											const wasPinned = pinThreadToBottomRef.current;
											const openingThread =
												!threadSettledRef.current || loadingMessagesRef.current;
											if (
												!openingThread &&
												!jumpToBottomInFlightRef.current &&
												(scrollingUp ||
												distanceFromBottom > THREAD_PIN_THRESHOLD_PX)
											) {
												pinThreadToBottomRef.current = false;
												setShowJumpToBottom(shouldShowJumpToBottom(box));
												if (wasPinned) {
													waScrollLog(
														'onScroll',
														'pin-disabled:scrolled-up-or-away',
														box,
														scrollTop,
														scrollTop,
														{ distanceFromBottom, scrollingUp },
													);
												}
											} else if (
												!loadingOlderRef.current &&
												!pendingOlderRestore() &&
												distanceFromBottom <= THREAD_PIN_THRESHOLD_PX
											) {
												pinThreadToBottomRef.current = true;
												setShowJumpToBottom(false);
												if (!wasPinned) {
													waScrollLog(
														'onScroll',
														'pin-enabled:at-bottom',
														box,
														scrollTop,
														scrollTop,
														{ distanceFromBottom },
													);
												}
											}
											if (
												threadSettled &&
												!loadingMessages &&
												!loadingOlderRef.current &&
												!pendingOlderRestore() &&
												Date.now() >= suppressOlderLoadUntilRef.current &&
												shouldAutoLoadOlder({
													scrollTop,
													scrollHeight: box.scrollHeight,
													clientHeight: box.clientHeight,
													scrollingUp,
													lastUserGestureAt: lastThreadGestureAtRef.current,
												})
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
											!loadingMessages &&
											threadSettled &&
											!(
												messageCatchUp &&
												messageCatchUp.conversationId === conversationId
											) ? (
												<div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 text-center">
													<div className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-slate-800/90">
														<MessageCircle
															size={24}
															className="text-[var(--wa-accent,#00a884)]"
														/>
													</div>
													<p className="text-sm font-semibold text-slate-500">
														{activeMessageGroup
															? t.noMessagesYet
															: conversationFilter === 'important' ||
																  conversationFilter === 'starred'
																? t.noImportantMessages
																: t.noMessagesYet}
													</p>
												</div>
											) : null
										) : (
											<div
												className={`wa-message-thread${
													// Keep bubbles hidden until scroll is pinned bottom.
													// Revealing early is what left opens stuck at the top.
													threadSettled &&
													!(
														messageCatchUp &&
														messageCatchUp.conversationId === conversationId
													)
														? ' is-ready'
														: ' is-settling'
												}`}
											>
												{messagesSyncHint &&
												!loadingMessages &&
												threadSettled ? (
													<div className="sticky top-0 z-10 mx-auto mb-2 w-fit rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800/95">
														<span className="inline-flex items-center gap-1.5">
															<Loader2 size={12} className="animate-spin" />
															{messagesSyncHint}
														</span>
													</div>
												) : null}
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
															onClick={() => openShareMessagesModal([...selectedMessageIds])}
															className="wa-select-toolbar__btn wa-select-toolbar__btn--send disabled:opacity-40"
														>
															<Send size={13} strokeWidth={2.25} />
															{locale === 'ar' ? 'إرسال إلى…' : 'Send to…'}
														</button>
														<button
															type="button"
															disabled={!selectedMessageIds.size}
															onClick={copySelectedMessages}
															className="wa-select-toolbar__btn wa-select-toolbar__btn--copy disabled:opacity-40"
														>
															<Copy size={13} strokeWidth={2.25} />
															{t.copySelected}
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
														<button
															type="button"
															disabled={!selectedMessageIds.size || downloadingSelectedMedia}
															onClick={() =>
																void downloadSelectedMedia({ fromSelectedMessages: true })
															}
															className="wa-select-toolbar__btn wa-select-toolbar__btn--download disabled:opacity-40"
														>
															{downloadingSelectedMedia ? (
																<Loader2 size={13} strokeWidth={2.25} className="animate-spin" />
															) : (
																<Download size={13} strokeWidth={2.25} />
															)}
															{t.downloadSelectedMedia}
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
																onClick={() => openShareMessagesModal([...selectedMessageIds])}
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
												{(hasMoreMessages || loadingOlder) &&
												!activeMessageGroup ? (
													loadingOlder ? (
														<div
															className="wa-load-older is-loading"
															role="status"
															aria-live="polite"
															aria-busy="true"
															aria-label={t.older}
														>
															<span
																className="wa-load-older__spinner"
																aria-hidden="true"
															/>
														</div>
													) : (
														<button
															type="button"
															className="wa-load-older"
															onClick={() =>
																void loadOlder({
																	forceProvider: true,
																	ignoreThrottle: true,
																})
															}
														>
															<ChevronUp size={13} strokeWidth={2.4} />
															<span>{t.older}</span>
														</button>
													)
												) : !activeMessageGroup &&
												  canUseWhatsApp &&
												  !demo.settings.enabled &&
												  conversationMessages.length > 0 ? (
													// The server ran out of stored history; the phone may still have more.
													<button
														type="button"
														className="wa-load-older is-phone"
														onClick={() => {
															hasMoreMessagesRef.current = true;
															void loadOlder({ forceProvider: true, ignoreThrottle: true });
														}}
													>
														<ChevronUp size={13} strokeWidth={2.4} />
														<span>{t.olderFromPhone || t.older}</span>
													</button>
												) : null}
												<WaVirtualRowsHost virtual={messageVirtual}>
												{({ items: virtualItems, totalSize: virtualTotalSize }) => (
												<div
													className={virtualizeMessages ? 'wa-message-virtual-list' : undefined}
													style={
														virtualizeMessages
															? {
																	height: virtualTotalSize,
																	position: 'relative',
																	width: '100%',
																}
															: undefined
													}
												>
												{visibleRowsFor(virtualItems).map(({ row, rowIndex, start }) => {
													const rowCacheKey = row.key || messageRowKey(row);
													const cachedRow = threadRowCache.get(rowCacheKey);
													const rowBody =
														cachedRow &&
														cachedRow.rowIndex === rowIndex &&
														sameThreadRow(cachedRow.row, row) &&
														sameThreadRow(cachedRow.prev, messageRows[rowIndex - 1]) &&
														sameThreadRow(cachedRow.next, messageRows[rowIndex + 1]) &&
														(cachedRow.messages === conversationMessages || !threadRowQuotes(row)) &&
														sameThreadRowDeps(cachedRow.deps, threadRowDeps)
															? cachedRow.body
															: (() => {
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
													const textPresentation = messageTextPresentation(
														textWithMentionLabels(
															captionText || visibleText,
															threadLiveRef.current.mentionDirectory,
															message.mentionLabels,
														),
													);
													const isDeleted = isDeletedWhatsAppMessage(message);
													const keepsDeletedContent =
														isDeleted &&
														(Boolean(String(visibleText || '').trim()) ||
															Boolean(attachments?.length));
													const hideDeletedBody = isDeleted && !keepsDeletedContent;
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
													const isVideoTranscriptMessage =
														!groupedImages && isTranscriptVideoMessage(message);
													const canTranscribeMedia = isVoiceMessage || isVideoTranscriptMessage;
													// Same check the action menu makes, so the hover bar and the menu
													// never disagree about whether this link can be downloaded.
													const socialVideoLink = message.optimistic
														? null
														: firstSocialVideoLink(message.text);
													const isLocationMessage =
														!hideDeletedBody && isWhatsAppLocationMessage(message);
													const isContactMsg =
														!hideDeletedBody &&
														(isContactMessage(message) ||
															Boolean(
																message?.sharedContact?.displayName ||
																	message?.sharedContact?.phones?.length,
															) ||
															Boolean(parseContactFromMessage(message)));
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
																	threadLiveRef.current.selectedMediaIds.has(item.id),
																)
															: selectedMessageIds.has(message.id));
													const messageSelected =
														(selectableInTicketMode || selectableInGroupMode) &&
														(groupedImages
															? (row.messages || []).some(item =>
																	threadLiveRef.current.selectedMessageIds.has(item.id),
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
													const quotedPreview = quotedSource
														? quotedMessagePreview(quotedSource, locale, {
																isGroupChat,
															})
														: quotedMessagePreview(message.replyTo, locale, {
																isGroupChat,
															});
													// WhatsApp always names who is quoted: "You" for your own message,
													// the contact in a one-to-one chat. Groups already carry senderName.
													const quotedDirection = (quotedSource || message.replyTo)?.direction;
													const quotedMine = quotedDirection === 'outbound';
													const quotedAuthorName =
														quotedPreview?.senderName ||
														(quotedMine
															? locale === 'ar'
																? 'أنت'
																: 'You'
															: quotedDirection === 'inbound' && !isGroupChat
																? conversationTitle(selectedConversation)
																: null);
													const quotedAuthor = message.replyTo?.isStatus
														? [quotedAuthorName, t.storyStatusQuote]
																.filter(Boolean)
																.join(' · ')
														: quotedAuthorName;
													const quotedBodyPresentation =
														quotedPreview && !quotedPreview.isVoice
															? messageTextPresentation(quotedPreview.body)
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
															item?.id === threadLiveRef.current.highlightedMessageKey ||
															item?.providerMessageId === threadLiveRef.current.highlightedMessageKey,
													);
													const fallbackMediaPreview =
														!attachments?.length &&
														['image', 'sticker', 'video'].includes(
															String(message.type || '').toLowerCase(),
														)
															? mediaPreviewFromRaw(message.raw)
															: null;
													const rowBody = (
														<div
															className={`wa-message-row min-w-0 max-w-full ${
																followsSame ? 'wa-follows-same' : ''
															} ${precedesSame ? 'wa-precedes-same' : ''} ${
																isQuotedHighlight
																	? 'wa-message-highlighted'
																	: virtualizeMessages
																		? ''
																		: '[content-visibility:auto] [contain-intrinsic-size:auto_80px]'
															}`}
															data-wa-row-key={row.key || messageRowKey(row)}
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
															{unreadDividerMessageId &&
															rowItems.some(item => item?.id === threadLiveRef.current.unreadDividerMessageId) ? (
																<div className="wa-unread-divider" role="separator" data-wa-unread-divider="">
																	<span>
																		{unreadAtOpen?.count > 1
																			? t.unreadMessagesDividerCount.replace('{count}', String(unreadAtOpen.count))
																			: t.unreadMessagesDivider}
																	</span>
																</div>
															) : null}
																	<div className={`wa-message-line flex min-w-0 w-full max-w-full ${mine ? 'justify-end' : 'justify-start'} ${message.optimistic ? 'opacity-70' : ''}`}>
																<div className={`wa-message-cluster group flex min-w-0 w-full max-w-full ${mine ? 'flex-row-reverse items-start' : 'items-start'} gap-1.5`}>
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
																				threadLiveRef.current.applyGroupMessageSelection(message);
																				return;
																			}
																			if (selectableInTicketMode) {
																				threadLiveRef.current.applyMessagesSelection(ticketSelectionTargets);
																				return;
																			}
																			if (downloadableAttachments.length) {
																				threadLiveRef.current.applyMediaSelection(downloadableAttachments);
																				return;
																			}
																			if (messageHasSelectableMedia(message) || isSharableChatMessage(message)) {
																				threadLiveRef.current.applyGroupMessageSelection(message);
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
																		<button
																			type="button"
																			className="wa-group-sender-avatar-btn shrink-0 self-start rounded-full transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-[#00a884]"
																			onClick={() => threadLiveRef.current.openPersonCard?.(sender, groupSenderAvatarSrc)}
																			aria-label={locale === 'ar' ? `معلومات ${sender.name}` : `${sender.name} info`}
																			title={sender.name}
																		>
																			<Avatar
																				label={sender.name}
																				src={groupSenderAvatarSrc}
																				size={7}
																				className="wa-group-sender-avatar ring-0"
																			/>
																		</button>
																	) : (
																		<span className="wa-group-sender-spacer" aria-hidden="true" />
																	)
																)}
																<div
																	onPointerDown={event => {
																		if (isMultiSelectClick(event)) {
																			event.preventDefault();
																			threadLiveRef.current.cancelMessageLongPress(event);
																			return;
																		}
																		if (threadLiveRef.current.mediaSelectMode || threadLiveRef.current.ticketSelectMode || threadLiveRef.current.groupSelectMode) return;
																		threadLiveRef.current.startMessageLongPress(event, message);
																		threadLiveRef.current.beginSwipeReply(event, message);
																	}}
																	onPointerMove={event => {
																		threadLiveRef.current.cancelMessageLongPress(event);
																		threadLiveRef.current.moveSwipeReply(event);
																	}}
																	onPointerUp={event => {
																		threadLiveRef.current.cancelMessageLongPress(event);
																		threadLiveRef.current.endSwipeReply(event);
																	}}
																	onPointerCancel={event => {
																		threadLiveRef.current.cancelMessageLongPress(event);
																		threadLiveRef.current.endSwipeReply(event);
																	}}
																	onClickCapture={event => {
																		if (!isMultiSelectClick(event) || message.optimistic) return;
																		event.preventDefault();
																		event.stopPropagation();
																		if (threadLiveRef.current.groupSelectMode) {
																			threadLiveRef.current.applyGroupMessageSelection(message);
																			return;
																		}
																		if (threadLiveRef.current.mediaSelectMode) {
																			if (downloadableAttachments.length) {
																				threadLiveRef.current.applyMediaSelection(downloadableAttachments);
																			} else if (messageHasSelectableMedia(message)) {
																				threadLiveRef.current.applyGroupMessageSelection(message);
																			}
																			return;
																		}
																		if (
																			threadLiveRef.current.ticketSelectMode ||
																			isSharableChatMessage(message)
																		) {
																			threadLiveRef.current.applyMessagesSelection(
																				groupedImages ? row.messages || [message] : [message],
																			);
																			return;
																		}
																		if (downloadableAttachments.length) {
																			threadLiveRef.current.applyMediaSelection(downloadableAttachments);
																			return;
																		}
																		if (messageHasSelectableMedia(message) || isSharableChatMessage(message)) {
																			threadLiveRef.current.applyGroupMessageSelection(message);
																		}
																	}}
																		onClick={event => {
																			if (selectableInGroupMode) {
																				threadLiveRef.current.applyGroupMessageSelection(message);
																				return;
																			}
																			if (selectableInTicketMode) {
																				threadLiveRef.current.applyMessagesSelection(ticketSelectionTargets);
																				return;
																			}
																			if (!selectableInMediaMode) {
																				if (!threadLiveRef.current.mediaSelectMode && !threadLiveRef.current.ticketSelectMode && !threadLiveRef.current.groupSelectMode) {
																					threadLiveRef.current.openMessageQuickActions(event, message, mine);
																				}
																				return;
																			}
																			if (downloadableAttachments.length) {
																				threadLiveRef.current.applyMediaSelection(downloadableAttachments);
																				return;
																			}
																			threadLiveRef.current.applyGroupMessageSelection(message);
																		}}
																		onContextMenu={event => {
																		threadLiveRef.current.openMessageContextMenu(event, message);
																	}}
															className={`wa-message-bubble relative min-w-0 max-w-[65%] shrink ${mine ? 'wa-message-mine' : 'wa-message-other'} ${followsSame ? 'wa-follows-same' : ''} ${precedesSame ? 'wa-precedes-same' : ''} ${hasBubbleTail && !isStickerMessage ? 'wa-has-tail' : ''} ${isDeleted ? (keepsDeletedContent ? 'wa-message-deleted-kept' : 'wa-message-deleted') : ''} ${isEmailMemoMsg ? 'wa-message-email' : ''} ${isStickerMessage ? 'wa-message-sticker' : ''} ${isVisualMediaMessage || groupedImages ? 'wa-message-media' : ''} ${isVideoTranscriptMessage ? 'wa-message-video' : ''} ${captionText && (isVisualMediaMessage || groupedImages || isDocumentMessage) ? 'wa-message-has-caption' : ''} ${isDocumentMessage ? 'wa-message-file' : ''} ${isVoiceMessage ? 'wa-message-voice' : ''} ${isLocationMessage ? 'wa-message-location' : ''} ${isContactMsg ? 'wa-message-contact' : ''} ${
																					// Class, not :has(.wa-message-transcript) in CSS: :has() on every bubble restyled each
																					// message's meta line whenever a row was added while scrolling.
																					!hideDeletedBody && canTranscribeMedia && String(messageTranscripts[message.id]?.text || '').trim()
																						? 'wa-has-transcript'
																						: ''
																				} ${
																		hideDeletedBody
																			? ''
																			: isEmailMemoMsg
																			? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
																			: mine
																				? 'bg-[#d9fdd3] text-slate-900 dark:bg-[#005c4b] dark:text-white'
																				: 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white'
																		} ${isChecked ? 'ring-2 ring-[var(--color-primary-400)]' : ''}`}
																>
																	{/* Message groups are retired: no group chip on messages. */}
																	{showGroupSenderMeta && (
																		<p className="wa-group-sender-name" style={{ color: sender.color }}>
																			<button
																				type="button"
																				className="max-w-full cursor-pointer truncate text-start font-[inherit] hover:underline"
																				onPointerDown={event => event.stopPropagation()}
																				onClick={event => {
																					event.stopPropagation();
																					threadLiveRef.current.openPersonCard?.(sender, groupSenderAvatarSrc);
																				}}
																				title={locale === 'ar' ? 'عرض المعلومات' : 'View info'}
																			>
																				{sender.name}
																			</button>
																		</p>
																	)}
																	{/* Who on the team sent it, when it was not you: a reply from
																	    an assigned teammate is marked with their name. */}
																	{message.direction === 'outbound' &&
																	message.senderUser?.id &&
																	message.senderUser.id !== viewerUserId ? (
																		<p
																			className="wa-staff-sender mb-0.5 inline-flex max-w-full items-center gap-1 text-[11.5px] font-bold text-[#027eb5] dark:text-[#53bdeb]"
																			title={locale === 'ar' ? 'اللي ردّ من الفريق' : 'Sent by your teammate'}
																			data-testid="message-staff-sender"
																		>
																			<UserRound size={11} strokeWidth={2.6} aria-hidden="true" />
																			<span className="truncate" dir="auto">
																				{String(message.senderUser.name || '').trim() ||
																					(locale === 'ar' ? 'عضو في الفريق' : 'Teammate')}
																			</span>
																		</p>
																	) : null}
																	{(message.forwarded || message.isForwarded) && (
																		<p className="mb-1 text-[10px] italic opacity-60">
																			{locale === 'ar' ? 'مُعاد توجيهها' : 'Forwarded'}
																		</p>
																	)}
																	{keepsDeletedContent ? (
																		<DeletedMessageNotice locale={locale} kept />
																	) : null}
																	{message.editHistory?.length ? (
																		<EditedMessageNotice message={message} locale={locale} />
																	) : null}
																	{message.replyTo && quotedPreview ? (
																		<button
																			type="button"
																			className={`wa-reply-quote mb-2 ${quotedMine ? 'is-mine' : 'is-theirs'}`}
																			aria-label={locale === 'ar' ? 'الانتقال إلى الرسالة الأصلية' : 'Go to original message'}
																			onPointerDown={event => event.stopPropagation()}
																			onClick={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				if (threadLiveRef.current.mediaSelectMode || threadLiveRef.current.ticketSelectMode || threadLiveRef.current.groupSelectMode) return;
																				void threadLiveRef.current.jumpToQuotedMessage(message);
																			}}
																		>
																			<div className="wa-reply-quote__content">
																				{quotedAuthor ? (
																					<p className="wa-reply-quote__sender" dir="auto">
																						{quotedAuthor}
																					</p>
																				) : null}
																				<p
																					className={`wa-reply-quote__body ${quotedPreview.isDeleted ? 'wa-reply-quote__body--deleted' : ''} ${quotedBodyPresentation?.className || ''}`}
																					dir={quotedBodyPresentation?.dir}
																					lang={quotedBodyPresentation?.lang}
																					style={quotedBodyPresentation?.style}
																				>
																					{quotedPreview.isVoice ? (
																						<Mic
																							size={12}
																							className="wa-reply-quote__voice-icon shrink-0"
																							aria-hidden="true"
																						/>
																					) : null}
																					<span className="min-w-0">{quotedPreview.body}</span>
																				</p>
																			</div>
																			{quotePreview ? (
																				<img
																					src={quotePreview}
																					alt=""
																					loading="lazy"
																					className="wa-reply-quote-thumb"
																				/>
																			) : null}
																		</button>
																	) : null}
																	{!hideDeletedBody && isViewOnceMessage(message) ? (
																		<ViewOncePlaceholder
																			message={message}
																			locale={locale}
																			onOpen={
																				mediaSelectMode || ticketSelectMode || groupSelectMode
																					? undefined
																					: setViewOnceInfoMessage
																			}
																		/>
																	) : !hideDeletedBody && attachments?.length
																		? (
																			<MessageAttachments
																				attachments={attachments}
																				mine={mine}
																				labels={t}
																				onImageReady={threadStableFns.registerChatImage}
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
																				selectMode={Boolean(mediaSelectMode)}
																				selectedAttachmentIds={
																					mediaSelectMode ? selectedMediaIds : null
																				}
																				hideFileActions={Boolean(
																					ticketSelectMode ||
																						groupSelectMode ||
																						downloadingSelectedMedia,
																				)}
																				onToggleAttachmentSelect={
																					mediaSelectMode
																						? attachmentId => {
																								const id = String(attachmentId || '');
																								if (!id) return;
																								threadLiveRef.current.setSelectedMediaIds(current => {
																									const next = new Set(current);
																									if (next.has(id)) next.delete(id);
																									else next.add(id);
																									return next;
																								});
																							}
																						: null
																				}
																				onTranscribe={
																					isVideoTranscriptMessage
																						? event => {
																								event?.preventDefault?.();
																								event?.stopPropagation?.();
																								void threadLiveRef.current.handleMessageAction(message, 'transcribe');
																							}
																						: null
																				}
								onSendAsVoice={attachment => {
									threadLiveRef.current.openVideoToVoiceEditor(message, attachment);
								}}
								onSaveToLibrary={attachment => {
									const attachmentId = String(attachment?.id || '');
									if (!isPersistedAttachmentId(attachmentId)) {
										toast.error(threadLiveRef.current.t.sendAsVoiceFailed);
										return;
									}
									threadLiveRef.current.setLibrarySaveTarget({
										attachmentId,
										messageId: message.id,
										defaultTitle: threadLiveRef.current.libraryTitleForMessage(message, attachmentId),
									});
								}}
																				sendAsVoiceLabel={t.sendAsVoice}
																				// The target stays set while sending, so this covers both
																				// "editor open" and "conversion in flight".
																				sendingAsVoice={videoToVoiceTarget?.messageId === message.id}
																			/>
																		)
																		: !hideDeletedBody && fallbackMediaPreview ? (
																			<div className="relative mb-2 max-w-[240px] overflow-hidden rounded-lg">
																				<ImageMessage
																					url={fallbackMediaPreview}
																					alt={quotedMessageLabel({ type: message.type }, locale)}
																					cover={false}
																				/>
																			</div>
																		)
																		: !hideDeletedBody && ['image', 'audio', 'ptt', 'voice', 'video', 'document', 'sticker'].includes(
																			String(message.type || '').toLowerCase(),
																		) && (
																			<div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs bg-black/5`}>
																				{String(message.type).includes('audio') || message.type === 'ptt' ? (
																					<Mic size={14} />
																				) : String(message.type).includes('image') ? (
																					<ImageIcon size={14} />
																				) : String(message.type) === 'document' ? (
																					<WhatsAppFileTypeIcon extKey="file" className="h-3.5 w-3.5 object-contain" />
																				) : (
																					<FileText size={14} />
																				)}
																				<span>{quotedMessageLabel({ type: message.type }, locale)}</span>
																			</div>
																		)}
																	{!hideDeletedBody &&
																	canTranscribeMedia &&
																	messageTranscripts[message.id]?.text ? (
																		<MessageSavedTranscript
																			text={messageTranscripts[message.id].text}
																			locale={locale}
																			mine={mine}
																			defaultOpen={false}
																		/>
																	) : null}
																	{hideDeletedBody ? (
																		<div className="wa-message-copy wa-message-copy--deleted">
																			<DeletedMessageNotice locale={locale} />
																			<div className={`wa-message-meta ${mine ? 'text-rose-700/70 dark:text-rose-200/70' : 'text-rose-600/70 dark:text-rose-300/70'}`}>
																				{message.isStarred && <Star size={11} fill="currentColor" />}
																				{message.isPinned && <Pin size={11} fill="currentColor" />}
																				<time className="wa-message-time" dir="auto">{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
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
																	) : isContactMsg ? (
																		<>
																			<ContactMessageCard
																				message={message}
																				locale={locale}
																				accountId={accountId}
																				conversations={effectiveConversations}
																				onOpenConversation={threadStableFns.openConversationFromContact}
																			/>
																			<div className={`wa-message-meta ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																				{message.isStarred && <Star size={11} fill="currentColor" />}
																				{message.isPinned && <Pin size={11} fill="currentColor" />}
																				<time className="wa-message-time" dir="auto">{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
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
																				<time className="wa-message-time" dir="auto">{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
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
																			<SocialVideoDownload
																				state={socialDownloads[message.id]}
																				locale={locale}
																				labels={t}
																				conversationId={conversationId}
																				conversations={scheduleConversationOptions}
																				onRetry={() =>
																					threadLiveRef.current.startSocialVideoDownload(
																						message,
																						threadLiveRef.current.socialDownloads[message.id]?.sourceUrl ||
																							firstSocialVideoLink(message.text)?.href,
																					)
																				}
																				onAddToStory={() => {
																					const download = threadLiveRef.current.socialDownloads[message.id];
																					if (!download?.id) return;
																					threadLiveRef.current.setStoryTarget({
																						socialDownloadId: download.id,
																						messageId: message.id,
																						previewUrl: absoluteApiUrl(download.url) || '',
																						durationSeconds: download.durationSeconds || 0,
																						fileSizeBytes: download.fileSizeBytes || 0,
																					});
																				}}
																			/>
																			<div className="wa-message-copy-body">
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
																								mentionDirectory={threadLiveRef.current.mentionDirectory}
																								mentionLabels={message.mentionLabels}
																							/>
																						)}
																					/>
																				) : null}
																				{messageTranslations[message.id]?.open ? (
																					(() => {
																						const translation = messageTranslations[message.id] || {};
																						const ar = locale === 'ar';
																						return (
																							<div
																								className={`wa-tr${translation.loading ? ' is-loading' : ''}${translation.error ? ' is-error' : ''}`}
																								onClick={event => event.stopPropagation()}
																							>
																								<div className="wa-tr__head">
																									<span className="wa-tr__badge">
																										<Languages size={13} strokeWidth={2.2} aria-hidden="true" />
																										{ar ? 'مترجمة' : 'Translated'}
																										<span className="wa-tr__langs" dir="ltr">
																											EN <span aria-hidden="true">→</span> AR
																										</span>
																									</span>
																									<span className="wa-tr__actions">
																										{translation.text && !translation.loading ? (
																											<button
																												type="button"
																												className="wa-tr__btn"
																												title={ar ? 'نسخ الترجمة' : 'Copy translation'}
																												aria-label={ar ? 'نسخ الترجمة' : 'Copy translation'}
																												onClick={() => {
																													void navigator.clipboard
																														?.writeText(translation.text)
																														.then(() => toast.success(ar ? 'اتنسخت الترجمة' : 'Translation copied'))
																														.catch(() => {});
																												}}
																											>
																												<Copy size={13} strokeWidth={2.2} />
																											</button>
																										) : null}
																										<button
																											type="button"
																											className="wa-tr__btn"
																											title={ar ? 'إخفاء الترجمة' : 'Hide translation'}
																											aria-label={ar ? 'إخفاء الترجمة' : 'Hide translation'}
																											onClick={() =>
																												threadLiveRef.current.setMessageTranslations(prev => ({
																													...prev,
																													[message.id]: { ...prev[message.id], open: false },
																												}))
																											}
																										>
																											<X size={13} strokeWidth={2.4} />
																										</button>
																									</span>
																								</div>
																								{translation.loading ? (
																									<div className="wa-tr__skeleton" role="status" aria-label={ar ? 'جارٍ الترجمة' : 'Translating'}>
																										<i />
																										<i />
																									</div>
																								) : translation.error ? (
																									<div className="wa-tr__error" role="alert">
																										<span>{translation.error}</span>
																										<button
																											type="button"
																											className="wa-tr__retry"
																											onClick={() => void threadLiveRef.current.toggleIncomingTranslation(message, captionText)}
																										>
																											<RefreshCw size={12} strokeWidth={2.4} />
																											{ar ? 'حاول تاني' : 'Retry'}
																										</button>
																									</div>
																								) : (
																									<div className="wa-tr__text" dir="rtl" lang="ar">
																										<WhatsAppFormattedText
																											text={translation.text || ''}
																											mentionDirectory={mentionDirectory}
																										/>
																									</div>
																								)}
																							</div>
																						);
																					})()
																				) : null}
																				<div className={`wa-message-meta ${mine ? 'text-slate-500 dark:text-white/60' : 'text-slate-400'}`}>
																					{message.isStarred && <Star size={11} fill="currentColor" />}
																					{message.isPinned && <Pin size={11} fill="currentColor" />}
																					<time className="wa-message-time" dir="auto">{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
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
																			<time className="wa-message-time" dir="auto">{new Date(message.providerTimestamp || message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
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
																	{normalizeWhatsAppReactions(message.reactions).length > 0 && (
																		<WaReactionSummary
																			reactions={normalizeWhatsAppReactions(message.reactions)}
																			mine={mine}
																			locale={locale}
																			resolve={threadStableFns.resolveReactor}
																			disabled={reactingMessageIds.has(message.id)}
																			onRemoveMine={emoji => void threadLiveRef.current.reactToMessage(message, emoji)}
																		/>
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
																			showTranscribe={canTranscribeMedia}
																			showCopy={
																				!hideDeletedBody &&
																				Boolean(String(captionText || '').trim())
																			}
																			showTranslate={
																				!mine &&
																				!hideDeletedBody &&
																				isEnglishMessageText(captionText)
																			}
																			translating={Boolean(messageTranslations[message.id]?.loading)}
																			showDownloadVideo={Boolean(
																				socialVideoLink &&
																					!socialDownloads[message.id],
																			)}
																			onEmoji={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				threadLiveRef.current.setActionMessageId(null);
																				threadLiveRef.current.setActionMessageAnchor(null);
																				const bar = event.currentTarget.closest('.wa-message-hover-actions');
																				threadLiveRef.current.toggleReactionPicker(
																					message,
																					(bar || event.currentTarget).getBoundingClientRect(),
																				);
																			}}
																			onReply={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				void threadLiveRef.current.handleMessageAction(message, 'reply');
																			}}
																			onTranscribe={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				void threadLiveRef.current.handleMessageAction(message, 'transcribe');
																			}}
																			onDownloadVideo={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				void threadLiveRef.current.handleMessageAction(
																					message,
																					'downloadSocialVideo',
																				);
																			}}
																			onCopy={() => threadLiveRef.current.handleMessageAction(message, 'copy')}
																			onTranslate={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				void threadLiveRef.current.toggleIncomingTranslation(message, captionText);
																			}}
																			onMore={event => {
																				event.preventDefault();
																				event.stopPropagation();
																				threadLiveRef.current.closeReactionPicker();
																				const bar =
																					event.currentTarget.closest(
																						'.wa-message-hover-actions',
																					);
																				const rect = (
																					bar || event.currentTarget
																				).getBoundingClientRect();
																				threadLiveRef.current.setActionMessageAnchor(rect);
																				threadLiveRef.current.setActionMessageId(current =>
																					current === message.id ? null : message.id,
																				);
																			}}
																		/>
																		<MessageActionMenu
																			open={actionMessageId === message.id}
																			message={message}
																			locale={locale}
																			mine={mine}
																			isVoice={isVoiceMessage}
																			isVideo={isVideoTranscriptMessage}
																			anchorRect={actionMessageAnchor}
																			previewImageUrl={(attachments || [])
																				.map(attachment => threadLiveRef.current.registeredChatImages[attachment.id]?.url)
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
																				toast.success(threadLiveRef.current.t.sentToBoard);
																			}}
																			onClose={() => {
																				threadLiveRef.current.setActionMessageId(null);
																				threadLiveRef.current.setActionMessageAnchor(null);
																			}}
																			onAction={action => void threadLiveRef.current.handleMessageAction(message, action)}
																			onReact={emoji => {
																				threadLiveRef.current.setActionMessageId(null);
																				threadLiveRef.current.setActionMessageAnchor(null);
																				void threadLiveRef.current.reactToMessage(message, emoji);
																			}}
																			mentionDirectory={mentionDirectory}
																		/>
																	</div>
																)}
																</div>
															</div>
														</div>
													);
													threadRowCache.set(rowCacheKey, {
															row,
															rowIndex,
															prev: messageRows[rowIndex - 1],
															next: messageRows[rowIndex + 1],
															messages: conversationMessages,
															deps: threadRowDeps,
															body: rowBody,
														});
													return rowBody;
													})();
													return virtualizeMessages ? (
														<WaMeasuredThreadRow
															key={row.key || messageRowKey(row)}
															index={rowIndex}
															start={start}
															rowKey={row.key || messageRowKey(row)}
															measureElement={messageVirtual.measureElement}
														>
															{rowBody}
														</WaMeasuredThreadRow>
													) : (
														<div key={row.key || messageRowKey(row)}>{rowBody}</div>
													);
												})}
												</div>
												)}
												</WaVirtualRowsHost>
											</div>
										)}
									</div>
									{/* Unread catch-up uses the full-pane wa-thread-loader above. */}
									{unreadJump && unreadJump.conversationId === conversationId && unreadJump.count > 0 ? (
										<button
											type="button"
											className="wa-jump-unread"
											onClick={event => {
												event.preventDefault();
												event.stopPropagation();
												setUnreadJump(null);
												revealUnreadDivider();
											}}
										>
											<ChevronUp size={16} strokeWidth={2.4} aria-hidden="true" />
											{t.unreadMessagesDividerCount.replace('{count}', String(unreadJump.count))}
										</button>
									) : null}
									{showJumpToBottom && conversationId ? (
										<button
											type="button"
											className="wa-jump-bottom"
											aria-label={locale === 'ar' ? 'انتقل لأسفل' : 'Jump to latest'}
											title={locale === 'ar' ? 'انتقل لأسفل' : 'Jump to latest'}
											onClick={event => {
												event.preventDefault();
												event.stopPropagation();
												jumpMessagesToBottom();
											}}
										>
											<ChevronDown size={22} strokeWidth={2.4} />
										</button>
									) : null}
									</div>
									<div
										ref={measureComposerStack}
										className={`wa-composer-stack ${
											isVoiceRecordingMode ? 'is-voice-recording' : ''
										} ${
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
												const files = event.dataTransfer?.files;
												if (files?.length) handleComposerFileInput(files);
											}}
											className={`wa-composer flex gap-2 border-0 border-t border-[#e9edef] p-2 ${composerDragOver ? 'ring-2 ring-[#00A884]/40' : ''} ${isVoiceRecordingMode ? 'is-recording flex-wrap items-center' : 'flex-wrap items-end'}`}
										>
											{waitingSchedules.length > 0 && !isVoiceRecordingMode ? (
												<div className="basis-full">
													<WaitingMessagesQueue
														ar={locale === 'ar'}
														items={waitingSchedules}
														busyId={messageScheduleBusyId}
														onSendNow={sendMessageScheduleNow}
														onSaveText={saveMessageScheduleText}
														onCancel={cancelMessageSchedule}
													/>
												</div>
											) : null}
											{sending ? (
												<div className="flex basis-full items-center gap-2 px-1 text-xs font-medium text-emerald-700" role="status" aria-live="polite">
													<Loader2 size={14} className="animate-spin" aria-hidden="true" />
													{locale === 'ar' ? 'جارٍ إرسال الرسالة…' : 'Sending message…'}
												</div>
											) : null}
											{delayedSendOn && !isVoiceRecordingMode ? (
												<div className="basis-full">
													<DelayedSendBanner
														ar={locale === 'ar'}
														plan={delayedSendPlan}
														gapState={replyGapState.conversationId === conversationId ? replyGapState : null}
														prefs={delayedSendPrefs}
														now={delayedSendNow}
														onEdit={() => setDelayedSendOpen(true)}
														onTurnOff={() => changeDelayedSendOn(false)}
														canSendNow={composerHasText && !sending}
														onSendNow={() => sendMessage(null, { skipDelay: true })}
													/>
												</div>
											) : null}
											<input
												ref={fileRef}
												type="file"
												multiple
												accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/bmp,video/mp4,video/webm,video/quicktime,video/3gpp,audio/mpeg,audio/ogg,audio/mp4,audio/webm,application/pdf,.doc,.docx,.xls,.xlsx,.mov,.heic,.heif"
												className="hidden"
												onChange={event => {
													handleComposerFileInput(event.target.files);
													event.target.value = '';
												}}
											/>
											{replyingTo && (() => {
												const isGroupChat =
													selectedConversation?.type === 'group' ||
													String(
														selectedConversation?.providerChatId || '',
													).endsWith('@g.us');
												const preview = quotedMessagePreview(replyingTo, locale, {
													isGroupChat,
												});
												const snippet =
													preview?.body || quotedMessageLabel(replyingTo, locale);
												const snippetPresentation = messageTextPresentation(snippet);
												// Who is being quoted, the way WhatsApp labels it: "You" for your own
												// message, the sender in a group, the contact in a one-to-one chat.
												const replyAuthor =
													replyingTo.direction === 'outbound'
														? locale === 'ar'
															? 'أنت'
															: 'You'
														: preview?.senderName ||
															replyingTo.senderName ||
															conversationTitle(selectedConversation);
												const ReplyKindIcon = preview?.isVoice
													? Mic
													: preview?.isMediaOnly
														? ImageIcon
														: null;
												// Photo / video being answered: WhatsApp shows its thumbnail at the end.
												const quotedAttachment = (replyingTo.attachments || []).find(item =>
													/^(image|video|sticker)/i.test(String(item?.type || item?.mimeType || '')),
												);
												const quotedThumb = quotedAttachment
													? String(quotedAttachment.previewDataUrl || quotedAttachment.thumbnailDataUrl || quotedAttachment.url || '').trim()
													: '';
												// WhatsApp's reply bar: a tinted quote with a coloured edge (who + what),
												// a plain ✕ beside it, docked on the composer.
												return (
												<div
													className={`wa-rp ${replyingTo.direction === 'outbound' ? 'is-mine' : 'is-theirs'}`}
													role="status"
													aria-label={
														locale === 'ar'
															? `الرد على ${replyAuthor}`
															: `Replying to ${replyAuthor}`
													}
													dir={locale === 'ar' ? 'rtl' : 'ltr'}
												>
													<div className="wa-rp__quote">
														<div className="wa-rp__body">
															<p className="wa-rp__name wa-privacy-identity">
																<bdi>{replyAuthor}</bdi>
															</p>
															<p
																className={`wa-rp__snippet ${snippetPresentation.className || ''}`}
																dir={snippetPresentation.dir}
																lang={snippetPresentation.lang}
															>
																{ReplyKindIcon ? (
																	<ReplyKindIcon size={14} strokeWidth={2.2} aria-hidden="true" />
																) : null}
																<span>
																	{preview?.isVoice
																		? `${locale === 'ar' ? 'رسالة صوتية' : 'Voice message'}${snippet ? ` · ${snippet}` : ''}`
																		: snippet}
																</span>
															</p>
														</div>
														{quotedThumb ? (
															<img src={quotedThumb} alt="" className="wa-rp__thumb" draggable={false} />
														) : null}
													</div>
													<button
														type="button"
														onClick={() => setReplyingTo(null)}
														aria-label={locale === 'ar' ? 'إلغاء الرد' : 'Cancel reply'}
														title={locale === 'ar' ? 'إلغاء الرد' : 'Cancel reply'}
														className="wa-rp__close"
													>
														<X size={20} strokeWidth={2} />
													</button>
												</div>
												);
											})()}
											{composerImages.length > 0 && (
												<div className="wa-composer-paste-preview flex min-w-0 basis-full gap-2 overflow-x-auto pb-1">
													{composerImages.map(item => (
														<div
															key={item.id}
															className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5 ${item.uploading ? 'opacity-70' : ''}`}
														>
															<img
																src={item.previewUrl}
																alt=""
																className="h-full w-full object-cover"
															/>
															{item.uploading ? (
																<div className="absolute inset-0 grid place-items-center bg-black/35">
																	<Loader2 size={18} className="animate-spin text-white" />
																</div>
															) : null}
															<button
																type="button"
																onClick={() => removeComposerImage(item.id)}
																disabled={item.uploading}
																aria-label={locale === 'ar' ? 'إزالة الصورة' : 'Remove image'}
																className="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/65 text-white hover:bg-black/80 disabled:opacity-40"
															>
																<X size={12} strokeWidth={2.4} />
															</button>
														</div>
													))}
													<button
														type="button"
														onClick={() => openComposerFilePicker({ accept: 'image/*' })}
														aria-label={locale === 'ar' ? 'إضافة صور' : 'Add images'}
														title={locale === 'ar' ? 'إضافة صور' : 'Add images'}
														className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-[#aebac1] text-[#54656f] hover:bg-black/5"
													>
														<Plus size={20} aria-hidden="true" />
													</button>
												</div>
											)}
											{composerFiles.length > 0 && (
												<div className="flex min-w-0 basis-full flex-wrap gap-2 pb-1" aria-label={locale === 'ar' ? 'ملفات جاهزة للإرسال' : 'Files ready to send'}>
													{composerFiles.map(item => {
														const name = item.file?.name || (locale === 'ar' ? 'ملف' : 'File');
														const ext = (name.includes('.') ? name.split('.').pop() : '').slice(0, 4).toUpperCase();
														const bytes = Number(item.file?.size) || 0;
														const size =
															bytes >= 1024 * 1024
																? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
																: `${Math.max(1, Math.round(bytes / 1024))} KB`;
														return (
															<div
																key={item.id}
																className="flex min-w-0 max-w-[280px] items-center gap-2.5 rounded-xl border border-black/[0.08] bg-white py-2 pe-2 ps-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-slate-900"
															>
																<span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#1DAB61]/10 text-[#1DAB61]">
																	<FileText size={18} strokeWidth={2} aria-hidden="true" />
																</span>
																<span className="min-w-0 flex-1">
																	<span className="block truncate text-[13px] font-semibold text-[#111b21] dark:text-slate-100" dir="auto" title={name}>
																		{name}
																	</span>
																	<span className="block text-[11.5px] text-[#667781]">
																		{ext ? `${ext} · ` : ''}
																		{size}
																	</span>
																</span>
																<button
																	type="button"
																	onClick={() => setComposerFilesState(current => current.filter(entry => entry.id !== item.id))}
																	aria-label={locale === 'ar' ? `إزالة ${name}` : `Remove ${name}`}
																	className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#667781] hover:bg-black/5 hover:text-[#111b21]"
																>
																	<X size={14} strokeWidth={2.4} />
																</button>
															</div>
														);
													})}
												</div>
											)}
											{recordingVoice ? (
												<div dir="ltr" className="wa-vr-shell is-live">
													<VoiceRecordingBar
														stream={recordingStreamRef.current}
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
											) : pendingVoiceDraft?.file ? (
												<div dir="ltr" className="wa-vr-shell is-ready">
													<VoiceRecordingBar
														ready
														sending={false}
														seconds={pendingVoiceDraft.seconds}
														labels={t}
														onCancel={clearPendingVoiceDraft}
														onSend={() => {
															const draft = pendingVoiceDraft;
															if (!draft?.file) return;
															void sendRecordedVoice(draft.file, {
																seconds: draft.seconds,
															});
														}}
													/>
												</div>
											) : (
												<div dir="ltr" className="wa-input-pill flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-[24px] px-1.5 py-1">
													<button
														ref={attachButtonRef}
														type="button"
														aria-label={locale === 'ar' ? 'المزيد من الخيارات' : 'More options'}
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
													{/* The typing field itself. Desktop lays it out flat inside the pill (display:
													    contents); phones draw it as its own white field with attach, camera and
													    mic/send outside it, the way the WhatsApp app does. */}
													<div className="wa-input-field">
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
														className="wa-sticker-button wa-input-action wa-composer-tool--desktop"
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
														className="wa-sticker-button wa-input-action wa-composer-tool--desktop"
													>
														<Sparkles size={18} strokeWidth={2} />
													</button>
													{!demo.settings.enabled && canUseWhatsApp ? (
														<ComposerWritingAssist
															locale={locale}
															conversationId={conversationId}
															getDraft={getDraft}
															disabled={!conversationId}
															onApply={text => setDraft(text)}
														/>
													) : null}
													<IsolatedComposerTextarea
														apiRef={composerApiRef}
														draftRef={draftRef}
														draftKey={conversationId || ''}
														onHasTextChange={notifyComposerHasText}
														placeholder={t.message}
														ariaLabel={t.message}
														onTyping={notifyPeerTyping}
														onEnterSubmit={sendMessage}
														onPaste={handleComposerPaste}
														mentionCandidates={composerMentionCandidates}
														mentionLoading={mentionMembersLoading}
														onMentionOpen={handleComposerMentionOpen}
														locale={locale}
														completionMessages={effectiveMessages}
													/>
													</div>
													{!demo.settings.enabled ? (
														<DelayedSendButton
															ar={locale === 'ar'}
															enabled={delayedSendOn}
															disabled={false}
															buttonRef={delayedSendButtonRef}
															onClick={() => setDelayedSendOpen(current => !current)}
															className="wa-composer-tool--desktop"
														/>
													) : null}
													{composerHasText || composerImages.length || composerFiles.length ? (
														<>
															<button
																type="button"
																disabled={demo.settings.enabled}
																title={t.scheduleMessage}
																aria-label={t.scheduleMessage}
																onClick={openSchedulePopover}
																className="wa-input-action wa-composer-tool--desktop"
															>
																<Clock size={18} strokeWidth={2} />
															</button>
															<button
																type="submit"
																aria-label={delayedSendOn && !composerImages.length && !composerFiles.length ? t.scheduleMessage : t.send}
																title={delayedSendOn && !composerImages.length && !composerFiles.length ? t.scheduleMessage : undefined}
																className="wa-send-button"
																style={{ background: GRADIENT }}
															>
																{delayedSendOn && !composerImages.length && !composerFiles.length ? (
																	<Clock size={17} strokeWidth={2.1} />
																) : (
																	<Send size={17} strokeWidth={2.1} />
																)}
															</button>
														</>
													) : (
														<div className="wa-composer-end-actions flex shrink-0 items-center gap-0.5">
															<button
																type="button"
																disabled={demo.settings.enabled}
																title={t.scheduleMessage}
																aria-label={t.scheduleMessage}
																onClick={openSchedulePopover}
																className="wa-input-action wa-composer-tool--desktop"
															>
																<Clock size={18} strokeWidth={2} />
															</button>
															<button
																type="button"
																disabled={demo.settings.enabled}
																title={t.library}
																aria-label={t.library}
																onClick={() => setLibraryOpen(true)}
																className="wa-input-action wa-composer-tool--desktop"
															>
																<Bookmark size={18} strokeWidth={2} />
															</button>
															<button
																type="button"
																title={voiceChangerSettings?.enabled ? t.voiceChangerOn : t.voiceChanger}
																aria-label={voiceChangerSettings?.enabled ? t.voiceChangerOn : t.voiceChanger}
																aria-pressed={Boolean(voiceChangerSettings?.enabled)}
																onClick={() => setVoiceChangerOpen(true)}
																className={`wa-voice-changer-button wa-input-action wa-composer-tool--desktop ${
																	voiceChangerSettings?.enabled ? 'is-active' : ''
																}`}
															>
																<AudioLines size={18} strokeWidth={2} />
															</button>
															<button
																type="button"
																disabled={recordingStarting}
																title={t.recordVoice}
																aria-label={t.recordVoice}
																onClick={startVoiceRecording}
																className={`wa-mic-button wa-input-action ${
																	recordingStarting ? 'is-active is-armed' : ''
																}`}
															>
																<ComposerMicIcon size={22} />
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
						</WaErrorBoundary>
						{selectedSecondaryConversation ? (
							<WaErrorBoundary locale={locale}>
							<div
								className="contents"
								data-privacy-chat={
									privacyBlurChatIds?.has(selectedSecondaryConversation.id) ? 'on' : undefined
								}
							>
							<WhatsAppSplitPane
								conversation={selectedSecondaryConversation}
								accountId={accountId}
								locale={locale}
								labels={t}
								canCompose={canUseWhatsApp && !demo.settings.enabled}
								liveMessage={splitLiveMessage}
								onClose={() => {
									setSecondaryConversationId(null);
									setSplitPickMode(false);
									setSplitLiveMessage(null);
								}}
							/>
							</div>
							</WaErrorBoundary>
						) : null}
					</Card>
					</div>
				)}

				{activeTab === 'calls' && (
					<MobileCallsView logs={logs} labels={t} locale={locale} loading={tabLoading} />
				)}

				{activeTab === 'online' && (
					<div className="wa-secondary-pane min-h-0 overflow-hidden">
						<Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Loader2 size={20} className="animate-spin" /></div>}>
							<WhatsAppOnlineTab
								accountId={accountId}
								contacts={onlineContacts}
								resolveIdentity={resolveOnlineIdentity}
								onOpenChat={openConversationFromReport}
								onRefresh={refreshOnlineContactsFull}
								locale={locale}
								pushPermission={pushPermission}
								onEnablePush={enablePushFromOnlineTab}
							/>
						</Suspense>
					</div>
				)}

				{activeTab === 'reading' && (
					<div className="wa-secondary-pane wa-reading-pane min-h-0 overflow-hidden bg-[#f7f8fa] dark:bg-[#0b141a]">
						<Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Loader2 size={20} className="animate-spin" /></div>}>
							<WhatsAppReadingTab onExit={() => void loadTabData(readingReturnTabRef.current || 'chats')} />
						</Suspense>
					</div>
				)}

				{activeTab === 'prompts' && (
					<div className="wa-secondary-pane wa-prompts-pane min-h-0 overflow-hidden bg-[#f7f8fa] dark:bg-[#0b141a]">
						<Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Loader2 size={20} className="animate-spin" /></div>}>
							<WhatsAppPromptsTab />
						</Suspense>
					</div>
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
						<WaGroupsBrowser
							groups={groups}
							selectedGroup={selectedGroup}
							loadingGroup={loadingGroup}
							conversations={conversations}
							locale={locale}
							t={t}
							onSelect={openGroupDetails}
							onRefresh={() => loadTabData('groups')}
							onOpenChat={openGroupChat}
							onCloseDetails={() => {
								groupRequestId.current += 1;
								setLoadingGroup(false);
								setSelectedGroup(null);
							}}
						/>
					)
				)}

				{activeTab === 'statuses' && (
					<div className="wa-dk wa-secondary-pane wa-statuses-pane wa-stx">
						{/* Phone layout: WhatsApp iOS "Updates" (status cards + channels). Desktop keeps the stories board below. */}
						{storyPanelMode === 'active'
							? (() => {
									const ar = locale === 'ar';
									const canPublishStatus =
										canUseWhatsApp &&
										selectedAccount?.providerCapabilities?.statusPublish !== false &&
										String(selectedAccount?.providerName || '').toLowerCase() !== 'baileys';
									const nameOf = story => {
										const rawName =
											story.latest.contactName ||
											(story.latest.isOwn ? (ar ? 'حالتي' : 'My status') : '');
										const digits = String(rawName || story.senderWaId || '')
											.replace(/@.*$/, '')
											.replace(/\D/g, '');
										return rawName || formatWhatsAppPhone(digits) || String(story.senderWaId || '').replace(/@.*$/, '');
									};
									const toneOf = seed => {
										let hash = 0;
										for (const ch of String(seed || '')) hash = (hash * 31 + ch.codePointAt(0)) % 360;
										return { background: `linear-gradient(160deg, hsl(${hash} 45% 42%), hsl(${(hash + 40) % 360} 50% 24%))` };
									};
									const own = groupedStatuses.find(story => story.isOwn);
									const others = groupedStatuses.filter(story => !story.isOwn);
									const channels = effectiveConversations.filter(item => isChannelConversation(item));
									const addStatus = () => {
										if (canPublishStatus) {
											setMobileStatusComposerOpen(true);
											return;
										}
										toast(
											ar
												? 'نشر الحالة متاح من تطبيق واتساب على الموبايل للحساب ده.'
												: 'For this account, post statuses from the WhatsApp app on your phone.',
										);
									};
									const card = story => {
										const name = nameOf(story);
										const thumb = storyThumbs[story.latest.id];
										const type = String(story.latest.type || '').toLowerCase();
										const caption = String(story.latest.caption || '').trim();
										return (
											<button
												type="button"
												key={story.senderWaId}
												className={`wa-m-status-card${story.isViewed ? ' is-viewed' : ''}`}
												onClick={() => openStoryGroup(story)}
											>
												<span className="wa-m-status-card__media" style={toneOf(name)}>
													{thumb?.url ? (
														thumb.type === 'video' ? (
															<video src={`${thumb.url}#t=0.1`} muted playsInline preload="metadata" />
														) : (
															<img src={thumb.url} alt="" loading="lazy" />
														)
													) : type === 'text' || type === 'chat' ? (
														<span className="wa-m-status-card__text" dir="auto">
															{caption}
														</span>
													) : story.latest.contactAvatarUrl ? (
														<img src={story.latest.contactAvatarUrl} alt="" className="is-blurred" loading="lazy" />
													) : null}
												</span>
												<span className="wa-m-status-card__ring">
													<Avatar label={name} size={10} src={story.latest.contactAvatarUrl || ''} />
												</span>
												<span className="wa-m-status-card__name wa-privacy-identity" dir="auto">
													{name}
												</span>
											</button>
										);
									};
									return (
										<div className="wa-m-updates">
											<section className="wa-m-section">
												<header className="wa-m-section__head">
													<h2>{ar ? 'الحالة' : 'Status'}</h2>
													<span className="wa-m-section__tools">
														{canUseWhatsApp ? (
															<button
																type="button"
																className="wa-m-round"
																aria-label={ar ? 'مين يشوف حالتي' : 'Who can see my status'}
																onClick={() => setStoryAudienceOpen(true)}
															>
																<ShieldCheck size={17} strokeWidth={2.1} />
															</button>
														) : null}
														<button
															type="button"
															className="wa-m-round"
															aria-label={ar ? 'إضافة حالة بالكاميرا' : 'Add photo status'}
															onClick={addStatus}
														>
															<Camera size={18} strokeWidth={2} />
														</button>
														<button
															type="button"
															className="wa-m-round"
															aria-label={ar ? 'حالة مكتوبة' : 'Text status'}
															onClick={addStatus}
														>
															<Pencil size={16} strokeWidth={2.2} />
														</button>
													</span>
												</header>
												<div className="wa-m-status-strip">
													{own ? (
														card(own)
													) : (
														<button type="button" className="wa-m-status-card is-add" onClick={addStatus}>
															<span className="wa-m-status-card__me">
																<Avatar label={selectedAccount?.label || 'Me'} size={14} src={railAvatarUrl || ''} />
																<span className="wa-m-status-card__plus" aria-hidden="true">
																	<Plus size={16} strokeWidth={3} />
																</span>
															</span>
															<span className="wa-m-status-card__name">{ar ? 'إضافة حالة' : 'Add status'}</span>
														</button>
													)}
													{others.map(card)}
												</div>
												{tabLoading && !groupedStatuses.length ? (
													<p className="wa-m-note">{t.loading}</p>
												) : !others.length ? (
													<p className="wa-m-note">
														{!isAccountConnected
															? t.connectToSeeStories
															: ar
																? 'مفيش تحديثات حالة جديدة.'
																: 'No status updates right now.'}
													</p>
												) : null}
												<button type="button" className="wa-m-link-row" onClick={() => setStoryPanelMode('history')}>
													{t.storyHistory}
													<ChevronRight size={16} className="rtl:rotate-180" aria-hidden="true" />
												</button>
											</section>

											<section className="wa-m-section">
												<header className="wa-m-section__head">
													<h2>{t.channels}</h2>
													{channels.length ? (
														<button
															type="button"
															className="wa-m-pill"
															onClick={() => {
																setConversationFilter('channels');
																void loadTabData('chats');
															}}
														>
															{ar ? 'عرض الكل' : 'See all'}
														</button>
													) : null}
												</header>
												{channels.length ? (
													<ul className="wa-m-channel-list">
														{channels.slice(0, 12).map(item => {
															const unread = conversationUnreadCount(item);
															const title = conversationTitle(item);
															const preview = String(item.lastMessage?.text || '').replace(/\s+/g, ' ').trim();
															return (
																<li key={item.id}>
																	<button
																		type="button"
																		className="wa-m-channel"
																		onClick={() => {
																			setConversationFilter('channels');
																			void loadTabData('chats');
																			openConversation(item.id, item);
																		}}
																	>
																		<Avatar label={title} size={13} src={conversationAvatarUrl(item)} />
																		<span className="wa-m-channel__body">
																			<span className="wa-m-channel__top">
																				<span className="wa-m-channel__name wa-privacy-identity" dir="auto">
																					{title}
																				</span>
																				<span className={`wa-m-channel__time${unread ? ' is-unread' : ''}`}>
																					{item.lastMessageAt ? conversationTimestamp(item.lastMessage?.providerTimestamp || item.lastMessageAt, locale) : ''}
																				</span>
																			</span>
																			<span className="wa-m-channel__bottom">
																				<span className="wa-m-channel__preview" dir="auto">
																					{preview || (ar ? 'وسائط' : 'Media')}
																				</span>
																				{unread ? (
																					<span className="wa-m-channel__badge">{unread > 999 ? '999+' : unread}</span>
																				) : null}
																			</span>
																		</span>
																	</button>
																</li>
															);
														})}
													</ul>
												) : (
													<p className="wa-m-note">{ar ? 'مش متابع أي قنوات.' : 'You are not following any channels.'}</p>
												)}
											</section>

											{mobileStatusComposerOpen ? (
												<WaDialog
													zIndex={600}
													width={420}
													icon={<Pencil size={17} strokeWidth={2.1} />}
													title={ar ? 'حالة مكتوبة' : 'Text status'}
													closeLabel={ar ? 'إغلاق' : 'Close'}
													onClose={() => setMobileStatusComposerOpen(false)}
												>
													<form
														className="wa-dx__body"
														onSubmit={event => {
															void publishStory(event);
															setMobileStatusComposerOpen(false);
														}}
													>
														<textarea
															autoFocus
															dir="auto"
															rows={4}
															maxLength={700}
															value={statusDraft}
															onChange={event => setStatusDraft(event.target.value)}
															placeholder={t.statusUpdate}
															className="wa-ui-input wa-dx__textarea"
														/>
														<div className="mt-3 flex justify-end">
															<button
																type="submit"
																className="wa-ui-btn wa-ui-btn--primary"
																disabled={publishingStatus || !statusDraft.trim()}
															>
																{t.publishStatus}
															</button>
														</div>
													</form>
												</WaDialog>
											) : null}
										</div>
									);
								})()
							: null}
						<header className="wa-stx-head">
							<div className="wa-stx-head__id">
								<span className="wa-stx-head__icon" aria-hidden="true">
									<Zap size={20} strokeWidth={2} />
								</span>
								<div className="min-w-0">
									<h2 className="wa-stx-head__title">{t.statuses}</h2>
									<p className="wa-stx-head__stats">
										<span>
											<b>{groupedStatuses.length}</b> {locale === 'ar' ? 'شخص' : 'people'}
										</span>
										<span>
											<b>{statuses.length}</b> {locale === 'ar' ? 'ستوري' : 'stories'}
										</span>
										<span className="is-new">
											<b>{groupedStatuses.filter(story => !story.isViewed && !story.isOwn).length}</b>{' '}
											{locale === 'ar' ? 'جديد' : 'new'}
										</span>
									</p>
								</div>
							</div>
							<div className="wa-stx-head__tools">
								<label className="wa-dx__search wa-stx-search">
									<Search size={16} strokeWidth={2.2} aria-hidden="true" />
									<input
										type="search"
										value={storySearch}
										onChange={event => setStorySearch(event.target.value)}
										placeholder={locale === 'ar' ? 'ابحث باسم أو رقم' : 'Search name or number'}
										aria-label={locale === 'ar' ? 'ابحث باسم أو رقم' : 'Search name or number'}
									/>
								</label>
								<div className="wa-story-seg" role="tablist" aria-label={t.statuses}>
									<button
										type="button"
										role="tab"
										aria-selected={storyPanelMode === 'active'}
										onClick={() => setStoryPanelMode('active')}
										className={`wa-story-seg__btn${storyPanelMode === 'active' ? ' is-active' : ''}`}
									>
										{t.activeStories}
									</button>
									<button
										type="button"
										role="tab"
										aria-selected={storyPanelMode === 'history'}
										onClick={() => setStoryPanelMode('history')}
										className={`wa-story-seg__btn${storyPanelMode === 'history' ? ' is-active' : ''}`}
									>
										{t.storyHistory}
										{groupedStatusHistory.length > 0 ? (
											<span className="wa-story-seg__count">{groupedStatusHistory.length}</span>
										) : null}
									</button>
								</div>
								<button
									type="button"
									onClick={() => {
										if (storyPanelMode === 'history') void loadStatusHistory(accountId);
										else void loadTabData('statuses', true);
									}}
									disabled={syncingStatuses || loadingStatusHistory}
									className="wa-ui-icon-btn wa-grp-refresh"
									title={t.refresh}
									aria-label={t.refresh}
								>
									<RefreshCw
										size={16}
										strokeWidth={2}
										className={syncingStatuses || loadingStatusHistory ? 'animate-spin' : undefined}
									/>
								</button>
							</div>
						</header>
						<div className="wa-statuses-body min-h-0 flex-1 overflow-y-auto nice-scroll">
							{storyPanelMode === 'active' && canUseWhatsApp && isAccountConnected
								? (() => {
										const ownStory = groupedStatuses.find(story => story.isOwn);
										return (
											<MyStoryBar
												locale={locale}
												avatarUrl={railAvatarUrl || ''}
												label={selectedAccount?.label || ''}
												ownCount={ownStory?.items.length || 0}
												latestLabel={
													ownStory ? relativeTime(ownStory.latest.publishedAt, relativeTimeNow, locale) : ''
												}
												audienceSummary={storyAudienceSummary(selectedAccount, storyAudienceSaved[accountId])}
												syncing={syncingStatuses}
												onOpenOwn={() => ownStory && openStoryGroup(ownStory)}
												onAudience={() => setStoryAudienceOpen(true)}
												onSync={() => void loadTabData('statuses', true)}
											/>
										);
									})()
								: null}
							{storyPanelMode === 'active' && canUseWhatsApp && (
								selectedAccount?.providerCapabilities?.statusPublish === false ||
								String(selectedAccount?.providerName || '').toLowerCase() === 'baileys'
							) ? null : null}
							{storyPanelMode === 'active' && canUseWhatsApp &&
								selectedAccount?.providerCapabilities?.statusPublish !== false &&
								String(selectedAccount?.providerName || '').toLowerCase() !== 'baileys' && (
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
							{storyPanelMode === 'active' && syncingStatuses && !tabLoading && (
								<p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
									<Loader2 size={13} className="animate-spin" />
									{t.syncingStatuses}
								</p>
							)}
							{storyPanelMode === 'active' && tabLoading ? (
								<TabLoading label={t.loading} />
							) : storyPanelMode === 'active' && statuses.length === 0 ? (
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
														: statusFetchHint === 'whatsapp_stories_waiting_for_live'
															? t.storiesWaitingForLive
															: statusFetchHint === 'whatsapp_stories_empty'
																? t.storiesEmptyAfterSync
																: t.noStatuses
									}
								/>
							) : storyPanelMode === 'active' ? (
								(() => {
									const ar = locale === 'ar';
									const storyName = story => {
										const rawName =
											story.latest.contactName ||
											(story.latest.isOwn ? selectedAccount?.label || t.accounts : '');
										const digits = String(rawName || story.senderWaId || '')
											.replace(/@.*$/, '')
											.replace(/\D/g, '');
										return (
											rawName ||
											formatWhatsAppPhone(digits) ||
											String(story.senderWaId || '').replace(/@.*$/, '')
										);
									};
									const kindOf = story => {
										const type = String(story.latest.type || '').toLowerCase();
										if (type === 'video') return 'video';
										if (type === 'text' || type === 'chat') return 'text';
										return 'photo';
									};
									// Deep, per-person gradient behind text stories and cards still loading media.
									const storyTone = seed => {
										let hash = 0;
										for (const ch of String(seed || '')) hash = (hash * 31 + ch.codePointAt(0)) % 360;
										return {
											background: `linear-gradient(160deg, hsl(${hash} 52% 38%), hsl(${(hash + 48) % 360} 58% 20%))`,
										};
									};
									const term = foldWhatsAppSearchText(storySearch);
									const searched = term
										? groupedStatuses.filter(story => foldWhatsAppSearchText(storyName(story)).includes(term))
										: groupedStatuses;
									const filtered = searched.filter(story => {
										if (storyFilter === 'all') return true;
										if (storyFilter === 'new') return !story.isViewed;
										return kindOf(story) === storyFilter;
									});
									const counts = {
										all: searched.length,
										new: searched.filter(story => !story.isViewed).length,
										photo: searched.filter(story => kindOf(story) === 'photo').length,
										video: searched.filter(story => kindOf(story) === 'video').length,
										text: searched.filter(story => kindOf(story) === 'text').length,
									};
									const filters = [
										{ id: 'all', label: ar ? 'الكل' : 'All' },
										{ id: 'new', label: ar ? 'جديد' : 'New' },
										{ id: 'photo', label: ar ? 'صور' : 'Photos', icon: <ImageIcon size={14} strokeWidth={2.2} /> },
										{ id: 'video', label: ar ? 'فيديو' : 'Videos', icon: <Video size={14} strokeWidth={2.2} /> },
										{ id: 'text', label: ar ? 'نص' : 'Text', icon: <FileText size={14} strokeWidth={2.2} /> },
									];
									const own = filtered.filter(story => story.isOwn);
									const recent = filtered.filter(story => !story.isOwn && !story.isViewed);
									const seen = filtered.filter(story => !story.isOwn && story.isViewed);
									const sections = [
										{ id: 'own', title: ar ? 'حالتي' : 'My status', items: own },
										{ id: 'recent', title: ar ? 'تحديثات جديدة' : 'Recent updates', items: recent },
										{ id: 'seen', title: ar ? 'تمت مشاهدتها' : 'Viewed', items: seen },
									];
									let cardIndex = 0;
									const renderCard = (story, position, sectionId) => {
										const index = cardIndex++;
										const name = storyName(story);
										const viewed = story.isViewed;
										const thumb = storyThumbs[story.latest.id];
										const kind = kindOf(story);
										const caption = String(story.latest.caption || '').trim();
										const avatarUrl = story.latest.contactAvatarUrl || '';
										const total = story.items.length;
										const featured = sectionId === 'recent' && position === 0 && !term && storyFilter !== 'text';
										return (
											<button
												type="button"
												key={story.senderWaId}
												onClick={() => openStoryGroup(story)}
												className={`wa-st-card ${viewed ? 'is-viewed' : 'is-unseen'}${featured ? ' is-featured' : ''}`}
												aria-label={`${name}, ${relativeTime(story.latest.publishedAt, relativeTimeNow, locale)}`}
											>
												<span className="wa-st-card__media" style={storyTone(name)}>
													{thumb?.url ? (
														thumb.type === 'video' ? (
															<video src={`${thumb.url}#t=0.1`} muted playsInline preload="metadata" />
														) : (
															<img
																src={thumb.url}
																alt=""
																loading={index < 12 ? 'eager' : 'lazy'}
																decoding="async"
															/>
														)
													) : kind === 'text' ? (
														<span className="wa-st-card__text" dir="auto">
															{caption || name}
														</span>
													) : avatarUrl ? (
														<img src={avatarUrl} alt="" className="is-blurred" loading="lazy" referrerPolicy="no-referrer" />
													) : (
														<span className="wa-st-card__initials" aria-hidden="true">
															{String(name || '?').trim().charAt(0).toUpperCase()}
														</span>
													)}
												</span>
												<span className="wa-st-card__shade" aria-hidden="true" />
												<span className="wa-st-card__bars" aria-hidden="true">
													{story.items.slice(0, 12).map(item => (
														<i key={item.id} className={viewedStatusIds.has(item.id) ? 'is-seen' : ''} />
													))}
												</span>
												<span className="wa-st-card__top">
													<span className="wa-st-card__avatar">
														<Avatar label={name} size={featured ? 11 : 9} src={avatarUrl} />
													</span>
													{featured ? (
														<span className="wa-st-card__flag">
															<Sparkles size={12} strokeWidth={2.4} />
															{ar ? 'الأحدث' : 'Latest'}
														</span>
													) : null}
													{kind === 'video' ? (
														<span className="wa-st-card__kind" aria-hidden="true">
															<Play size={12} strokeWidth={2.6} fill="currentColor" />
														</span>
													) : null}
												</span>
												<span className="wa-st-card__foot">
													<b className="wa-privacy-identity" dir="auto">
														{name}
													</b>
													<small>
														{relativeTime(story.latest.publishedAt, relativeTimeNow, locale)}
														{total > 1 ? ` · ${total} ${ar ? 'ستوري' : 'stories'}` : ''}
													</small>
													{featured && caption && kind !== 'text' ? (
														<span className="wa-st-card__caption" dir="auto">
															{caption}
														</span>
													) : null}
												</span>
												{!viewed && story.unviewedCount ? (
													<span className="wa-st-card__new">{story.unviewedCount}</span>
												) : null}
											</button>
										);
									};
									return (
										<div className="wa-st">
											<div className="wa-st-chips" role="tablist" aria-label={ar ? 'تصفية' : 'Filter'}>
												{filters.map(filter => (
													<button
														key={filter.id}
														type="button"
														role="tab"
														aria-selected={storyFilter === filter.id}
														disabled={filter.id !== 'all' && !counts[filter.id]}
														onClick={() => setStoryFilter(filter.id)}
														className={`wa-st-chip${storyFilter === filter.id ? ' is-active' : ''}`}
													>
														{filter.icon || null}
														{filter.label}
														<span>{counts[filter.id]}</span>
													</button>
												))}
											</div>
											{filtered.length ? (
												sections.map(section =>
													section.items.length ? (
														<section key={section.id} className={`wa-st__section is-${section.id}`}>
															<h3 className="wa-st__title">
																{section.title}
																<span>{section.items.length}</span>
															</h3>
															<div className="wa-st__grid">
																{section.items.map((story, position) => renderCard(story, position, section.id))}
															</div>
														</section>
													) : null,
												)
											) : (
												<div className="wa-dx__empty">
													<Search size={22} strokeWidth={1.8} aria-hidden="true" />
													<p>{ar ? 'مفيش ستوريز بالفلتر ده' : 'No stories match this filter'}</p>
												</div>
											)}
										</div>
									);
								})()
							) : loadingStatusHistory ? (
								<TabLoading label={t.loading} />
							) : groupedStatusHistory.length === 0 ? (
								<Empty icon={Zap} title={t.storyHistoryEmpty} />
							) : (() => {
								const historyName = story => {
									const rawName =
										story.latest.contactName ||
										(story.latest.isOwn ? selectedAccount?.label || t.accounts : '');
									const digits = String(rawName || story.senderWaId || '')
										.replace(/@.*$/, '')
										.replace(/\D/g, '');
									return (
										rawName ||
										formatWhatsAppPhone(digits) ||
										String(story.senderWaId || '').replace(/@.*$/, '')
									);
								};
								const term = foldWhatsAppSearchText(storySearch);
								const termDigits = storySearch.replace(/\D/g, '');
								const visibleHistory = term
									? groupedStatusHistory.filter(story => {
											if (foldWhatsAppSearchText(historyName(story)).includes(term)) return true;
											if (termDigits.length < 3) return false;
											return String(story.senderWaId || '')
												.replace(/@.*$/, '')
												.replace(/\D/g, '')
												.includes(termDigits);
										})
									: groupedStatusHistory;
								return (
								<div className="wa-story-history">
									<p className="wa-story-history__hint">
										{term
											? locale === 'ar'
												? `${visibleHistory.length} من ${groupedStatusHistory.length} جهة مؤرشفة`
												: `${visibleHistory.length} of ${groupedStatusHistory.length} archived people`
											: locale === 'ar'
												? `${groupedStatusHistory.length} جهة مؤرشفة`
												: `${groupedStatusHistory.length} archived ${
														groupedStatusHistory.length === 1 ? 'person' : 'people'
													}`}
									</p>
									{!visibleHistory.length ? (
										<div className="wa-dx__empty">
											<Search size={22} strokeWidth={1.8} aria-hidden="true" />
											<p>{locale === 'ar' ? 'مفيش حد بالاسم ده في السجل' : 'No one in history matches this search'}</p>
										</div>
									) : null}
									<ul className="wa-story-history__list">
										{visibleHistory.map((story, storyIndex) => {
											const name = historyName(story);
											const archivedCount =
												story.historyCount || story.items.length || 0;
											const thumb = storyThumbs[story.latest.id];
											return (
												<li key={`history-${story.senderWaId}`}>
													<button
														type="button"
														onClick={() =>
															openStoryGroup(story, { history: true })
														}
														className="wa-story-history__row group"
													>
														<span className="wa-story-history__avatar-wrap">
															<span className="wa-story-history__avatar">
																<StoryThumbnail
																	label={name}
																	size={18}
																	viewed
																	fillParent
																	priority={storyIndex < 24}
																	thumbUrl={thumb?.url}
																	thumbType={thumb?.type}
																	avatarUrl={
																		story.latest.contactAvatarUrl || ''
																	}
																/>
															</span>
															<span className="wa-story-history__badge">
																{archivedCount}
															</span>
														</span>
														<span className="wa-story-history__meta">
															<span className="wa-story-history__name" title={name}>
																{name}
															</span>
															<span className="wa-story-history__sub">
																<span>
																	{relativeTime(
																		story.latest.publishedAt,
																		relativeTimeNow,
																		locale,
																	)}
																</span>
																{story.items.some(item => item.revokedAt) && (
																	<span
																		data-testid="story-history-revoked"
																		className="ms-1 text-red-500"
																	>
																		{locale === 'ar'
																			? `· ${story.items.filter(item => item.revokedAt).length} ممسوحة`
																			: `· ${story.items.filter(item => item.revokedAt).length} deleted`}
																	</span>
																)}
															</span>
														</span>
													</button>
												</li>
											);
										})}
									</ul>
								</div>
								);
							})()}
						</div>
					</div>
				)}

				{activeTab === 'profile' && (
					<div className="wa-secondary-pane wa-pf">
						{selectedAccount ? (
							(() => {
								const ar = locale === 'ar';
								const phone = formatWhatsAppPhone(selectedAccount.phoneNumber) || selectedAccount.phoneNumber || '';
								const lastConnected = selectedAccount.lastConnectedAt ? new Date(selectedAccount.lastConnectedAt) : null;
								const status = selectedAccount.status || 'disconnected';
								const copyNumber = async () => {
									try {
										await navigator.clipboard.writeText(selectedAccount.phoneNumber || phone);
										setProfileCopied(true);
										window.setTimeout(() => setProfileCopied(false), 1600);
									} catch {
										toast.error(ar ? 'تعذر النسخ' : 'Could not copy');
									}
								};
								return (
									<div className="wa-pf__inner">
										<section className="wa-pf__card wa-pf__hero">
											<div className="wa-pf__banner" aria-hidden="true" />
											<div className="wa-pf__identity">
												<span className={`wa-pf__avatar is-${status}`}>
													<Avatar label={selectedAccount.label || 'W'} size={22} src={railAvatarUrl || ''} />
													<i aria-hidden="true" />
												</span>
												<h2 dir="auto">{selectedAccount.label}</h2>
												{phone ? (
													<p className="wa-pf__phone" dir="ltr">
														{phone}
													</p>
												) : null}
												{accStatus ? (
													<span className={`wa-pf__status is-${status}`}>
														<i aria-hidden="true" />
														{accStatus.label}
													</span>
												) : null}
												{accStatus?.hint ? <p className="wa-pf__hint">{accStatus.hint}</p> : null}
											</div>
											<div className="wa-pf__actions">
												<button type="button" className="wa-pf__btn is-primary" onClick={() => void loadTabData('accounts')}>
													<Settings size={16} aria-hidden="true" />
													{t.manageWhatsAppAccount}
												</button>
												{phone ? (
													<button type="button" className="wa-pf__btn" onClick={() => void copyNumber()}>
														{profileCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
														{profileCopied ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ الرقم' : 'Copy number'}
													</button>
												) : null}
											</div>
										</section>

										<section className="wa-pf__card">
											<h3 className="wa-pf__title">{ar ? 'تفاصيل الحساب' : 'Account details'}</h3>
											<dl className="wa-pf__rows">
												<div className="wa-pf__row">
													<span className="wa-pf__row-icon" aria-hidden="true">
														<User size={17} />
													</span>
													<dt>{t.profileName}</dt>
													<dd>
														<span dir="auto">{selectedAccount.label}</span>
													</dd>
												</div>
												{phone ? (
													<div className="wa-pf__row">
														<span className="wa-pf__row-icon" aria-hidden="true">
															<Phone size={17} />
														</span>
														<dt>{t.profilePhone}</dt>
														<dd>
															<span dir="ltr">{phone}</span>
														</dd>
														<button
															type="button"
															className="wa-pf__icon-btn"
															onClick={() => void copyNumber()}
															aria-label={ar ? 'نسخ الرقم' : 'Copy number'}
															title={ar ? 'نسخ الرقم' : 'Copy number'}
														>
															{profileCopied ? <Check size={15} /> : <Copy size={15} />}
														</button>
													</div>
												) : null}
												<div className="wa-pf__row">
													<span className="wa-pf__row-icon" aria-hidden="true">
														<ShieldCheck size={17} />
													</span>
													<dt>{t.profileStatus}</dt>
													<dd>
														<span className={`wa-pf__status is-sm is-${status}`}>
															<i aria-hidden="true" />
															{accStatus?.label || selectedAccount.status}
														</span>
													</dd>
												</div>
												{lastConnected ? (
													<div className="wa-pf__row">
														<span className="wa-pf__row-icon" aria-hidden="true">
															<Clock size={17} />
														</span>
														<dt>{t.lastConnected}</dt>
														<dd title={lastConnected.toLocaleString(ar ? 'ar-EG' : undefined)}>
															{relativeTimeFrom(lastConnected, locale)}
															<small>
																{lastConnected.toLocaleString(ar ? 'ar-EG' : undefined, {
																	dateStyle: 'medium',
																	timeStyle: 'short',
																})}
															</small>
														</dd>
													</div>
												) : null}
											</dl>
										</section>
									</div>
								);
							})()
						) : (
							<div className="wa-pf__inner">
								<section className="wa-pf__card wa-pf__empty">
									<span className="wa-pf__empty-icon" aria-hidden="true">
										<Smartphone size={24} />
									</span>
									<p>{t.noWhatsAppProfile}</p>
									<button type="button" className="wa-pf__btn is-primary" onClick={() => void loadTabData('accounts')}>
										{t.manageWhatsAppAccount}
									</button>
								</section>
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

				{activeTab === 'board' && (
					<div
						className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
						onClick={event => event.stopPropagation()}
						onMouseDown={event => event.stopPropagation()}
					>
						<Suspense fallback={<WaPaneLoading label={t.loading} />}>
							<WhatsAppBoardTab
								accountId={accountId}
								locale={locale}
								conversationLookup={boardConversationLookup}
								onOpenConversation={conversationIdToOpen => {
									if (!conversationIdToOpen) return;
									openConversationFromReport(conversationIdToOpen);
								}}
							/>
						</Suspense>
					</div>
				)}

				{activeTab === 'fakeChat' && (
					<div
						className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
						onClick={event => event.stopPropagation()}
						onMouseDown={event => event.stopPropagation()}
					>
						<Suspense fallback={<WaPaneLoading label={t.loading} />}>
							<FakeChatStudio
								locale={locale}
								accountId={accountId}
								conversations={effectiveConversations}
								renderSendToPicker={({ previewUrl, busyId, onPick, onClose }) => (
									<WaDialog
										width={440}
										height={640}
										zIndex={130}
										icon={<Forward size={18} strokeWidth={2.1} />}
										title={locale === 'ar' ? 'إرسال إلى' : 'Send to'}
										subtitle={locale === 'ar' ? 'صورة الشاشة · تتبعت منك' : 'Screenshot · sent as you'}
										closeDisabled={Boolean(busyId)}
										closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
										onClose={onClose}
									>
										{previewUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={previewUrl} alt="" className="mx-auto mb-2 block h-28 w-auto rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
										) : null}
										<WaChatPicker
											autoFocus
											locale={locale}
											items={effectiveConversations.filter(item => item.accountId === accountId && !item.isArchived)}
											busyId={busyId}
											onPick={onPick}
										/>
									</WaDialog>
								)}
							/>
						</Suspense>
					</div>
				)}

				{activeTab === 'typing' && !showcaseOnly && (
					<Suspense fallback={<WaPaneLoading label={t.loading} />}>
						<WhatsAppTypingLogTab
							locale={locale}
							accountId={accountId}
							liveEvent={typingAttemptEvent}
							onOpenConversation={id => {
								const meta = (conversationsRef.current || []).find(item => item.id === id);
								setActiveTab('chats');
								openConversation(id, meta);
							}}
						/>
					</Suspense>
				)}

				{activeTab === 'wallet' && (
					<Suspense fallback={<WaPaneLoading label={t.loading} />}>
						{/* Phone: immersive wallet — no WA header/nav; back lives inside the tab. */}
						<WhatsAppWalletTab locale={locale} onExit={() => void loadTabData('chats')} />
					</Suspense>
				)}

				{activeTab === 'adhkar' && (
					<>
						<MobileWhatsAppHeader
							locale={locale}
							title={t.adhkar || t.title}
							onSearch={() => {
								void loadTabData('chats');
								setSearchOpen(true);
								window.setTimeout(() => {
									document.querySelector('.wa-m-search input')?.focus();
								}, 60);
							}}
							onCamera={seesWholeAccount ? () => void loadTabData('statuses') : undefined}
							onMore={() => setMobileMenuOpen(current => !current)}
							showTitle={false}
						/>
						<Suspense fallback={<WaPaneLoading label={t.loading} />}>
							<WhatsAppAdhkarTab locale={locale} onExit={() => void loadTabData('chats')} />
						</Suspense>
					</>
				)}

				{contactsPopupOpen ? (
					<WaDialog
						title={t.contacts}
						subtitle={locale === 'ar' ? 'ابحث عن رقم، اعرض بياناته، وابدأ شات.' : 'Look up a number, see their profile, and start a chat.'}
						icon={<BookUser size={18} />}
						width={540}
						zIndex={140}
						onClose={() => setContactsPopupOpen(false)}
						closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
						className="wa-contacts-dialog"
					>
						<div className="min-h-0 flex-1 overflow-y-auto nice-scroll px-1 pb-2">
							<Suspense fallback={<WaPaneLoading label={t.loading} />}>
								<ContactsPanel
									accountId={accountId}
									locale={locale}
									canUse={canUseWhatsApp || canManageWhatsApp}
									embedded
									onOpenConversation={openConversationFromContact}
								/>
							</Suspense>
						</div>
					</WaDialog>
				) : null}

				{activeTab === 'agent' && (
					<div className="wa-dk wa-secondary-pane wa-agent-pane min-h-0">
						{accountId ? (
							<Suspense fallback={<WaPaneLoading label={t.loading} />}>
								<WhatsAppAiAgentPanel key={accountId} locale={locale} accountId={accountId} />
							</Suspense>
						) : (
							<p className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
								{t.accounts}
							</p>
						)}
					</div>
				)}

				{activeTab === 'learn' && (
					<div className="wa-dk wa-secondary-pane wa-learn-pane">
						<Suspense fallback={<WaPaneLoading label={t.loading} />}>
							<LearnWorkspace locale={locale} onExit={() => void loadTabData('chats')} />
						</Suspense>
					</div>
				)}

				{activeTab === 'documents' && isAdmin && (
					<div className="wa-dk wa-secondary-pane wa-documents-pane">
						<Suspense fallback={<WaPaneLoading label={t.loading} />}>
							<DocumentEditorWorkspace className="wa-documents-editor" />
						</Suspense>
					</div>
				)}

				{activeTab === 'emails' && (
					<div className="wa-dk wa-secondary-pane wa-emails-pane">
						<div className="min-h-0 flex-1 overflow-y-auto nice-scroll">
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
					</div>
				)}

				{activeTab === 'reports' && (
					<div className="wa-dk wa-secondary-pane wa-reports-pane wa-rp-pane">
						<div className="wa-rp-scroll min-h-0 flex-1 overflow-y-auto nice-scroll">
						<Suspense fallback={<WaPaneLoading label={t.loading} />}>
							<WhatsAppReportsTab
								locale={locale}
								t={t}
								report={report}
								loading={tabLoading}
								refreshing={reportRefreshing}
								periodDays={reportPeriodDays}
								onPeriodChange={days => {
									setReportPeriodDays(days);
									reportPeriodDaysRef.current = days;
									setReportStaffDetail(null);
									setReport(reportCacheRef.current.get(`${accountId}:${days}`) || null);
									void loadTabData('reports');
								}}
								onRefresh={refreshReport}
								staffDetail={reportStaffDetail}
								staffDetailLoading={reportStaffDetailLoading}
								onOpenStaff={fetchStaffReportDetail}
								onOpenConversation={openConversationFromReport}
							/>
						</Suspense>
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
						<div className="wa-dk wa-settings-pane space-y-4">
							{/* Phone "You" tab: the account card on top, like WhatsApp. Opens the accounts manager. */}
							{selectedAccount && !showcaseOnly ? (
								<button
									type="button"
									className="wa-m-profile-cell"
									onClick={() => void loadTabData('accounts')}
								>
									<Avatar label={selectedAccount.label || 'Me'} size={14} src={railAvatarUrl || ''} />
									<span className="wa-m-profile-cell__copy">
										<span className="wa-m-profile-cell__name wa-privacy-identity" dir="auto">
											{selectedAccount.label || formatWhatsAppPhone(selectedAccount.phoneNumber) || t.accounts}
										</span>
										<span className="wa-m-profile-cell__sub wa-privacy-identity" dir="ltr">
											{formatWhatsAppPhone(selectedAccount.phoneNumber) || selectedAccount.status || ''}
										</span>
									</span>
									<ChevronRight size={18} className="wa-m-profile-cell__chev rtl:rotate-180" aria-hidden="true" />
								</button>
							) : null}
							<div
								role="tablist"
								aria-label={t.settings}
								className="wa-settings-tablist nice-scroll"
							>
								{[
									{ id: 'ai', label: t.settingsAi, icon: Sparkles },
									{ id: 'demo', label: t.settingsDemo, icon: Zap },
									{ id: 'notifications', label: t.settingsNotifications, icon: Bell },
									{ id: 'privacy', label: t.settingsPrivacy, icon: ShieldCheck },
									...(showcaseOnly ? [] : [{ id: 'lock', label: pageLockText.tab, icon: PageLockIcon }]),
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
								<Suspense fallback={<WaPaneLoading label={t.loading} />}>
									<WhatsAppAiSettings
										locale={locale}
										settings={whatsappAi.settings}
										loading={whatsappAi.settingsLoading}
										saving={whatsappAi.settingsSaving}
										error={whatsappAi.settingsError}
										onSave={whatsappAi.saveSettings}
									/>
								</Suspense>
								</>
							)}
							{settingsSection === 'demo' && (
								<Suspense fallback={<WaPaneLoading label={t.loading} />}>
									<DemoModeSettings
										locale={locale}
										realAccountId={accountId}
										realConversations={showcaseOnly ? [] : conversations}
									/>
								</Suspense>
							)}
							{settingsSection === 'notifications' && (
								<section className="wst-section">
									<header className="wst-head">
										<span className="wst-icon" aria-hidden="true">
											<Bell size={18} />
										</span>
										<div className="wst-head-text">
											<h3>{t.settingsNotifications}</h3>
										</div>
									</header>
									<div className="wst-rows">
										<div className="wst-row">
											<div className="wst-row-text">
												<p className="wst-row-title">{t.whatsappNotifications}</p>
												<p className="wst-row-hint">{t.whatsappNotificationsHint}</p>
											</div>
											<div className="wst-row-control">
												<span className={`wst-state${notificationSettings.notificationsEnabled ? ' is-on' : ''}`}>
													{notificationSettings.notificationsEnabled ? t.privacyOn : t.privacyOff}
												</span>
												<Toggle
													label={t.whatsappNotifications}
													checked={Boolean(notificationSettings.notificationsEnabled)}
													disabled={notificationSettingsSaving}
													onChange={value => void saveNotificationSettings(value)}
												/>
											</div>
										</div>
									</div>
								</section>
							)}
							{settingsSection === 'lock' && !showcaseOnly && (
								<WhatsAppPageLockSettings lock={pageLock} locale={locale} />
							)}
							{settingsSection === 'privacy' && (
								<section className="wst-section">
									<header className="wst-head">
										<span className="wst-icon" aria-hidden="true">
											<ShieldCheck size={18} />
										</span>
										<div className="wst-head-text">
											<h3>{t.privacySettings}</h3>
										</div>
										<button type="button" onClick={savePrivacySettings} className="wst-btn is-primary">
											{t.savePrivacy}
										</button>
									</header>
									<div className="wst-rows">
										<div className="wst-row">
											<div className="wst-row-text">
												<p className="wst-row-title">
													<EyeOff size={15} aria-hidden="true" />
													{t.hideStatusViews}
												</p>
												<p className="wst-row-hint">{t.hideStatusViewsHint}</p>
												<p className="wst-callout is-warn">
													<AlertTriangle size={14} aria-hidden="true" />
													<span>{t.hideStatusViewsWarning}</span>
												</p>
											</div>
											<div className="wst-row-control">
												<span className={`wst-state${privacySettings.hideStatusViewReceipts ? ' is-on' : ''}`}>
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
										<div className="wst-row">
											<div className="wst-row-text">
												<p className="wst-row-title">
													<CheckCheck size={15} aria-hidden="true" />
													{t.readReceiptMode}
												</p>
												<p className="wst-row-hint">{t.readReceiptModeHint}</p>
											</div>
											<div className="wst-row-control is-select">
												<WaCustomSelect
													ariaLabel={t.readReceiptMode}
													value={privacySettings.readReceiptMode}
													onChange={value =>
														setPrivacySettings(current => ({
															...current,
															readReceiptMode: value,
														}))
													}
													buttonClassName="h-10 text-sm"
													options={[
														{ value: 'on_open', label: t.readOnOpen },
														{ value: 'on_reply', label: t.readOnReply },
														{ value: 'manual', label: t.readManual },
														{ value: 'never', label: t.readNever },
													]}
												/>
											</div>
										</div>
										<div className="wst-row">
											<div className="wst-row-text">
												<p className="wst-row-title">
													<Check size={15} aria-hidden="true" />
													{t.holdDelivery}
												</p>
												<p className="wst-row-hint">{t.holdDeliveryHint}</p>
												<p className="wst-callout is-warn">
													<AlertTriangle size={14} aria-hidden="true" />
													<span>{t.holdDeliveryWarning}</span>
												</p>
											</div>
											<div className="wst-row-control">
												<span className={`wst-state${privacySettings.holdDeliveryReceipts ? ' is-on' : ''}`}>
													{privacySettings.holdDeliveryReceipts ? t.privacyOn : t.privacyOff}
												</span>
												<Toggle
													label={t.holdDelivery}
													checked={Boolean(privacySettings.holdDeliveryReceipts)}
													onChange={value =>
														setPrivacySettings(current => ({
															...current,
															holdDeliveryReceipts: value,
														}))
													}
												/>
											</div>
										</div>
										<div className="wst-row">
											<div className="wst-row-text">
												<p className="wst-row-title">
													<TypingLogIcon size={15} aria-hidden="true" />
													{t.hideTyping}
												</p>
												<p className="wst-row-hint">{t.hideTypingHint}</p>
											</div>
											<div className="wst-row-control">
												<span className={`wst-state${privacySettings.hideTypingIndicator ? ' is-on' : ''}`}>
													{privacySettings.hideTypingIndicator ? t.privacyOn : t.privacyOff}
												</span>
												<Toggle
													label={t.hideTyping}
													checked={Boolean(privacySettings.hideTypingIndicator)}
													onChange={value =>
														setPrivacySettings(current => ({
															...current,
															hideTypingIndicator: value,
														}))
													}
												/>
											</div>
										</div>
									</div>
								</section>
							)}
						</div>
					)
				)}
			</div>
			</div>
			{/* Adhkar / Wallet / Reading / Learn are focused spaces: no bottom tab bar (each has its own way back). */}
			{!(isConversationWorkspaceTab(activeTab) && conversationId) &&
				activeTab !== 'adhkar' &&
				activeTab !== 'learn' &&
				activeTab !== 'wallet' &&
				activeTab !== 'reading' &&
				activeTab !== 'facebook' && (
				<MobileWhatsAppNav
					activeTab={activeTab}
					onSelect={tab => void loadTabData(tab)}
					labels={t}
					unreadCount={unreadConversationCount}
					avatarUrl={railAvatarUrl}
					locale={locale}
					showUpdates={seesWholeAccount}
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
				onLongPressAt={openConversationActionsAt}
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
				<div
					className="wa-ui-scrim is-sheet-on-phone"
					style={{ zIndex: 110 }}
					onClick={() => setConversationAssignTarget(null)}
					onKeyDown={event => {
						if (event.key === 'Escape') setConversationAssignTarget(null);
					}}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="wa-assign-target-title"
						className="wa-ui-modal wa-ui-assign-modal"
						style={{ '--wa-ui-modal-width': '440px', '--wa-ui-modal-height': '640px' }}
						onClick={event => event.stopPropagation()}
					>
						<div className="wa-ui-modal__header">
							<div className="wa-ui-modal__heading">
								<h3 id="wa-assign-target-title" className="wa-ui-modal__title">
									{locale === 'ar' ? 'تعيين المحادثة' : 'Assign chat'}
								</h3>
								<p className="wa-ui-modal__subtitle wa-privacy-identity" dir="auto">
									{conversationTitle(conversationAssignTarget)}
								</p>
							</div>
							<button
								type="button"
								autoFocus
								aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
								title={locale === 'ar' ? 'إغلاق' : 'Close'}
								onClick={() => setConversationAssignTarget(null)}
								className="wa-ui-icon-btn"
							>
								<X size={18} strokeWidth={2} />
							</button>
						</div>
						<div className="wa-ui-assign__list wa-ui-scroll">
							<button
								type="button"
								aria-pressed={!conversationAssignTarget.assignedUserId}
								onClick={() => {
									void assignConversationTarget(conversationAssignTarget.id, '');
									setConversationAssignTarget(null);
								}}
								className={`wa-ui-assign__row is-standalone ${
									conversationAssignTarget.assignedUserId ? '' : 'is-selected'
								}`}
							>
								<span className="wa-ui-assign__avatar" aria-hidden="true">
									<X size={18} strokeWidth={1.9} />
								</span>
								<span className="wa-ui-assign__copy">
									<span className="wa-ui-assign__name">
										{locale === 'ar' ? 'بدون تعيين' : 'Unassigned'}
									</span>
									<span className="wa-ui-assign__sub">
										{locale === 'ar' ? 'لا أحد مسؤول عن المحادثة' : 'No one owns this chat'}
									</span>
								</span>
								<span className="wa-ui-assign__check" aria-hidden="true">
									{conversationAssignTarget.assignedUserId ? null : (
										<Check size={14} strokeWidth={2.8} />
									)}
								</span>
							</button>
							<p className="wa-ui-menu__section wa-ui-assign__section">
								<span>{locale === 'ar' ? 'الفريق' : 'Team'}</span>
							</p>
							{assignableStaff.map(user => {
								const assigned = conversationAssignTarget.assignedUserId === user.id;
								return (
									<div
										key={user.id}
										className={`wa-ui-assign__person ${assigned ? 'is-selected' : ''}`}
									>
										<div className="wa-ui-assign__person-head">
											<button
												type="button"
												aria-pressed={assigned}
												onClick={() => {
													void assignConversationTarget(conversationAssignTarget.id, user.id);
													setConversationAssignTarget(null);
												}}
												className="wa-ui-assign__row"
											>
												<Avatar label={user.name} size={10} src={user.avatarUrl} />
												<span className="wa-ui-assign__copy">
													<span className="wa-ui-assign__name">
														<span className="truncate">{user.name}</span>
													</span>
													<span
														className={`wa-ui-assign__sub ${user.assignable ? '' : 'is-warning'}`}
													>
														{user.assignable
															? staffAssignHint(
																	report?.staff?.find(item => item.userId === user.id),
																	locale,
																) || user.email
															: locale === 'ar'
																? 'يحتاج عرض + استخدام للتعيين'
																: 'Needs View + Use to be assigned'}
													</span>
												</span>
												<span className="wa-ui-assign__check" aria-hidden="true">
													{assigned ? <Check size={14} strokeWidth={2.8} /> : null}
												</span>
											</button>
										</div>
										{(canManageWhatsApp || isAdmin) && !user.isOwner ? (
											<div className="wa-ui-assign__perms">
												<StaffPermissionChips
													person={user}
													onToggle={toggleStaffPermission}
													locale={locale}
												/>
											</div>
										) : null}
									</div>
								);
							})}
							{assignableStaff.length === 0 ? (
								<div className="wa-ui-assign__empty">
									<UsersRound size={22} strokeWidth={1.6} aria-hidden="true" />
									<p>{locale === 'ar' ? 'لا يوجد موظفون' : 'No staff found'}</p>
								</div>
							) : null}
						</div>
						<div className="wa-ui-modal__footer">
							<p className="wa-ui-modal__footer-note">
								<Info size={14} strokeWidth={2} aria-hidden="true" />
								<span>
									{locale === 'ar'
										? 'العرض والاستخدام مطلوبان للتعيين. تُحفظ الصلاحيات فور تغييرها.'
										: 'View + Use are required to assign. Access changes save instantly.'}
								</span>
							</p>
						</div>
					</div>
				</div>
			)}
			{conversationInfoTarget && (() => {
				const liveInfoConversation =
					(conversations || []).find(item => item.id === conversationInfoTarget.id) ||
					(selectedConversation?.id === conversationInfoTarget.id
						? selectedConversation
						: null) ||
					conversationInfoTarget;
				const infoAvatarSrc =
					conversationAvatarUrl(liveInfoConversation) ||
					conversationInfoGroup?.avatarUrl ||
					'';
				void presenceClock;
				const barPresence = (onlineContacts || []).find(
					item => item.conversationId === liveInfoConversation.id,
				);
				const mergedPresence = {
					...(liveInfoConversation.presence || {}),
					...(barPresence
						? {
								online: Boolean(
									barPresence.online ||
										barPresence.typing ||
										barPresence.recording ||
										liveInfoConversation.presence?.online,
								),
								typing: Boolean(
									barPresence.typing || liveInfoConversation.presence?.typing,
								),
								recording: Boolean(
									barPresence.recording ||
										liveInfoConversation.presence?.recording,
								),
								lastSeen:
									resolvePresenceLastSeen(liveInfoConversation.presence, {
										online: Boolean(barPresence.online),
										typing: Boolean(barPresence.typing),
										recording: Boolean(barPresence.recording),
										lastSeen: barPresence.lastSeen,
										t: barPresence.updatedAt || Date.now(),
									}) || liveInfoConversation.presence?.lastSeen,
								state:
									barPresence.state ||
									liveInfoConversation.presence?.state ||
									'unknown',
								confirmedOffline:
									Boolean(liveInfoConversation.presence?.confirmedOffline) ||
									(barPresence.state === 'unavailable' && !barPresence.online),
							}
						: {}),
				};
				const presenceSubtitle =
					liveInfoConversation.type === 'group'
						? null
						: conversationPresenceSubtitle(mergedPresence, locale, formatLastSeen);
				const typingWho =
					liveInfoConversation.type === 'group'
						? String(liveInfoConversation.presence?.senderName || '').trim()
						: '';
				const presenceValue =
					(mergedPresence.typing || mergedPresence.recording) && typingWho
						? `${typingWho} · ${
								mergedPresence.recording
									? locale === 'ar' ? 'يسجل صوت الآن' : 'recording…'
									: locale === 'ar' ? 'يكتب الآن' : 'typing…'
							}`
						: mergedPresence.typing || mergedPresence.recording
						? mergedPresence.recording
							? locale === 'ar'
								? 'يسجل صوت الآن'
								: 'recording…'
							: locale === 'ar'
								? 'يكتب الآن'
								: 'typing…'
						: presenceSubtitle?.text || '—';
				const closeConversationInfo = () => {
					conversationInfoRequestId.current += 1;
					setConversationInfoTarget(null);
					setConversationInfoGroup(null);
					setLoadingConversationInfoGroup(false);
					setConversationInfoAvatarPreview(null);
				};
				const openProfilePhoto = () => {
					if (!infoAvatarSrc) return;
					const title =
						conversationInfoGroup?.subject ||
						conversationTitle(liveInfoConversation) ||
						'';
					setConversationInfoAvatarPreview({
						url: infoAvatarSrc,
						conversationId: liveInfoConversation.id,
						label: title,
					});
				};
				const isGroupInfo = conversationInfoTarget.type === 'group';
				const infoStory = isGroupInfo ? null : storyForConversation(liveInfoConversation);
				const infoStoryUnseen = Boolean(
					infoStory?.items.some(item => !viewedStatusIds.has(item.id)),
				);
				const openInfoStory = () => {
					if (!infoStory) return;
					closeConversationInfo();
					openStoryGroup(infoStory);
				};
				const infoTitle =
					conversationInfoGroup?.subject || conversationTitle(liveInfoConversation);
				const memberCount =
					conversationInfoGroup?.participantCount ||
					conversationInfoGroup?.participants?.length ||
					conversationInfoTarget.group?.participantCount ||
					0;
				const infoSubtitle = isGroupInfo
					? `${memberCount} ${locale === 'ar' ? 'عضو' : memberCount === 1 ? 'member' : 'members'}`
					: liveInfoConversation.contact?.phoneNumber ||
						liveInfoConversation.contact?.waId ||
						liveInfoConversation.providerChatId ||
						'—';
				const unreadCount = Number(liveInfoConversation.unreadCount) || 0;
				const lastMessageAt = liveInfoConversation.lastMessageAt
					? new Date(liveInfoConversation.lastMessageAt)
					: null;
				const infoTiles = [
					{
						key: 'account',
						icon: <MessageCircle size={16} strokeWidth={2} />,
						label: locale === 'ar' ? 'الحساب' : 'Account',
						value: selectedAccount?.label || '—',
					},
					{
						key: 'assigned',
						icon: <UserRound size={16} strokeWidth={2} />,
						label: locale === 'ar' ? 'مسند إلى' : 'Assigned to',
						value:
							liveInfoConversation.assignedUser?.name ||
							(locale === 'ar' ? 'غير مسند' : 'Unassigned'),
						muted: !liveInfoConversation.assignedUser?.name,
					},
					{
						key: 'unread',
						icon: <Bell size={16} strokeWidth={2} />,
						label: locale === 'ar' ? 'غير مقروءة' : 'Unread',
						value: unreadCount ? String(unreadCount) : locale === 'ar' ? 'لا شيء' : 'All read',
						accent: unreadCount > 0,
						muted: !unreadCount,
					},
					{
						key: 'last',
						icon: <Clock size={16} strokeWidth={2} />,
						label: isGroupInfo
							? locale === 'ar'
								? 'آخر رسالة'
								: 'Last message'
							: locale === 'ar'
								? 'آخر ظهور'
								: 'Last seen',
						value: isGroupInfo
							? lastMessageAt
								? relativeTime(lastMessageAt.toISOString(), Date.now(), locale)
								: '—'
							: presenceValue,
						title: lastMessageAt ? lastMessageAt.toLocaleString() : undefined,
					},
				];
				return (
				<div
					ref={groupInfoOverlayRef}
					className="wa-gi-overlay fixed inset-0 z-[110] grid place-items-end bg-black/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
					onClick={closeConversationInfo}
					role="presentation"
				>
					<div
						className="wa-gi"
						role="dialog"
						aria-modal="true"
						aria-labelledby="wa-gi-title"
						onClick={event => event.stopPropagation()}
					>
						{/* The close button lives in the header bar, which stays pinned while the panel
						    scrolls; on the panel itself it scrolled away with the content. */}
						<div className="wa-gi__cover">
							<span className="wa-gi__cover-label">
								{isGroupInfo
									? locale === 'ar'
										? 'معلومات الجروب'
										: 'Group info'
									: locale === 'ar'
										? 'معلومات المحادثة'
										: 'Contact info'}
							</span>
							<button
								type="button"
								onClick={closeConversationInfo}
								className="wa-gi__close"
								aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
							>
								<X size={18} strokeWidth={2.2} />
							</button>
						</div>

						<div className="wa-gi__identity">
							{infoStory ? (
								<button
									type="button"
									className={`wa-gi__avatar is-clickable has-story ${infoStoryUnseen ? 'is-unseen' : 'is-viewed'}`}
									aria-label={locale === 'ar' ? 'عرض الحالة' : 'View status'}
									title={locale === 'ar' ? 'عرض الحالة' : 'View status'}
									onClick={openInfoStory}
								>
									<Avatar label={conversationTitle(liveInfoConversation)} size={20} src={infoAvatarSrc || ''} isGroup={false} />
								</button>
							) : infoAvatarSrc ? (
								<button
									type="button"
									className="wa-gi__avatar is-clickable"
									aria-label={locale === 'ar' ? 'عرض الصورة بحجم كبير' : 'View profile photo'}
									onClick={openProfilePhoto}
								>
									<Avatar label={conversationTitle(liveInfoConversation)} size={20} src={infoAvatarSrc} isGroup={isGroupInfo} />
								</button>
							) : (
								<span className="wa-gi__avatar">
									<Avatar label={conversationTitle(liveInfoConversation)} size={20} src="" isGroup={isGroupInfo} />
								</span>
							)}
							<h3 id="wa-gi-title" className="wa-gi__name wa-privacy-identity" dir="auto">
								{infoTitle}
							</h3>
							<p className="wa-gi__sub wa-privacy-identity">
								<span className={`wa-gi__chip ${isGroupInfo ? 'is-group' : ''}`}>
									{isGroupInfo ? <Users size={13} strokeWidth={2.2} /> : <UserRound size={13} strokeWidth={2.2} />}
									{isGroupInfo
										? locale === 'ar'
											? 'جروب'
											: 'Group'
										: locale === 'ar'
											? 'محادثة'
											: 'Chat'}
								</span>
								<span dir={isGroupInfo ? 'auto' : 'ltr'}>{infoSubtitle}</span>
							</p>
							{infoStory ? (
								<div className="mt-3 flex flex-wrap items-center justify-center gap-2">
									<button
										type="button"
										onClick={openInfoStory}
										className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-3.5 py-1.5 text-[13px] font-medium text-[#008069] transition-colors hover:bg-[#25D366]/20 dark:text-[#25D366]"
									>
										<Zap size={14} strokeWidth={2.2} aria-hidden="true" />
										{locale === 'ar' ? 'عرض الحالة' : 'View status'}
										<span className="text-[12px] font-normal opacity-75">
											{infoStory.items.length > 1
												? `${infoStory.items.length} ${locale === 'ar' ? 'تحديثات' : 'updates'} · `
												: ''}
											{relativeTime(infoStory.latest.publishedAt, Date.now(), locale)}
										</span>
									</button>
									{infoAvatarSrc ? (
										<button
											type="button"
											onClick={openProfilePhoto}
											className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-[13px] text-[#54656F] transition-colors hover:bg-black/5 dark:border-white/15 dark:text-[#AEBAC1] dark:hover:bg-white/5"
										>
											<ImageIcon size={14} strokeWidth={2.2} aria-hidden="true" />
											{locale === 'ar' ? 'صورة البروفايل' : 'Profile photo'}
										</button>
									) : null}
								</div>
							) : null}
						</div>

						<div className="wa-gi__body nice-scroll">
							{isGroupInfo && conversationInfoGroup?.description ? (
								<p className="wa-gi__desc" dir="auto">
									{conversationInfoGroup.description}
								</p>
							) : null}

							<dl className="wa-gi__tiles">
								{infoTiles.map(tile => (
									<div
										key={tile.key}
										className={`wa-gi__tile${tile.accent ? ' is-accent' : ''}${tile.muted ? ' is-muted' : ''}`}
										title={tile.title}
									>
										<dt>
											<span className="wa-gi__tile-icon" aria-hidden="true">
												{tile.icon}
											</span>
											{tile.label}
										</dt>
										<dd dir="auto">{tile.value == null || tile.value === '' ? '—' : tile.value}</dd>
									</div>
								))}
							</dl>

							{!isGroupInfo ? (
								<Suspense
									fallback={
										<div className="wa-gi__loading">
											<Loader2 size={18} className="animate-spin" />
										</div>
									}
								>
									<ContactSocialFinder
										conversation={liveInfoConversation}
										displayName={infoTitle}
										avatarUrl={infoAvatarSrc || ''}
										locale={locale}
									/>
								</Suspense>
							) : null}

							{isGroupInfo ? (
								<section className="wa-gi__members" aria-labelledby="wa-gi-members">
									<header className="wa-gi__members-head">
										<h4 id="wa-gi-members">
											<Users size={16} strokeWidth={2.2} />
											{locale === 'ar' ? 'الأعضاء' : 'Members'}
										</h4>
										{memberCount ? <span className="wa-gi__count">{memberCount}</span> : null}
									</header>
									{loadingConversationInfoGroup ? (
										<div className="wa-gi__loading">
											<Loader2 size={22} className="animate-spin" />
										</div>
									) : (
										<WaInfoMemberList
											participants={conversationInfoGroup?.participants || []}
											locale={locale}
											resolve={participant => {
												const phoneHint = String(participant.waId || '')
													.replace(/@.*$/, '')
													.split(':')[0]
													.replace(/\D/g, '');
												const fromInbox = (conversations || []).find(item => {
													if (item?.type === 'group') return false;
													const contactId = String(item?.contact?.waId || item?.providerChatId || '');
													const digits = String(item?.contact?.phoneNumber || '').replace(/\D/g, '');
													return (
														contactId === participant.waId ||
														(phoneHint &&
															(digits === phoneHint ||
																contactId.replace(/@.*$/, '').replace(/\D/g, '') === phoneHint))
													);
												});
												const title =
													String(participant.displayName || '').trim() ||
													String(fromInbox?.contact?.name || '').trim() ||
													conversationTitle(fromInbox) ||
													(phoneHint ? `+${phoneHint}` : '') ||
													String(participant.waId || '—');
												const avatarSrc = fromInbox
													? conversationAvatarUrl(fromInbox)
													: inboxAvatarForWaId(conversations, participant.waId);
												return { title, phoneHint, avatarSrc };
											}}
										/>
									)}
								</section>
							) : null}
						</div>
					</div>
				</div>
				);
			})()}
			{conversationInfoAvatarPreview?.url ? (
				<ProfilePhotoViewer
					src={conversationInfoAvatarPreview.url}
					label={conversationInfoAvatarPreview.label || ''}
					onClose={() => setConversationInfoAvatarPreview(null)}
					onRequestFreshUrl={async () => {
						const id = conversationInfoAvatarPreview.conversationId;
						if (!id) return conversationInfoAvatarPreview.url;
						try {
							// Baileys profilePictureUrl(jid, 'image') — full CDN photo, not preview thumb.
							const { data } = await api.post(
								`/whatsapp/conversations/${id}/avatar/refresh`,
								{ quality: 'full' },
							);
							const next = String(data?.avatarUrl || '').trim();
							if (!next) return conversationInfoAvatarPreview.url;
							setConversations(current =>
								current.map(item => {
									if (item.id !== id) return item;
									if (item.contact) {
										return {
											...item,
											contact: { ...item.contact, avatarUrl: next },
										};
									}
									if (item.group) {
										return {
											...item,
											group: { ...item.group, avatarUrl: next },
										};
									}
									return item;
								}),
							);
							setConversationInfoAvatarPreview(current =>
								current ? { ...current, url: next } : current,
							);
							return next;
						} catch {
							return conversationInfoAvatarPreview.url;
						}
					}}
				/>
			) : null}
			{(sharingMessageIds?.length || forwardingMessage) && (
				<WaDialog
					width={440}
					height={640}
					icon={<Forward size={18} strokeWidth={2.1} />}
					title={locale === 'ar' ? 'إرسال إلى' : 'Send to'}
					subtitle={
						locale === 'ar'
							? `${sharingMessageIds?.length || 1} رسالة · تظهر كأنها مرسلة منك`
							: `${sharingMessageIds?.length || 1} message${(sharingMessageIds?.length || 1) === 1 ? '' : 's'} · sent as yours`
					}
					closeDisabled={Boolean(sharingTargetConversationId)}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => {
						setSharingMessageIds(null);
						setForwardingMessage(null);
						sharingSourceConversationIdRef.current = null;
					}}
					footer={
						<span className="wa-ui-modal__footer-note">
							<Info size={14} strokeWidth={2.2} aria-hidden="true" />
							{locale === 'ar'
								? 'الردود تتبعت ومعاها الاقتباس فوقها'
								: 'Replies keep their quote on top'}
						</span>
					}
				>
					<WaChatPicker
						autoFocus
						locale={locale}
						items={effectiveConversations.filter(
							item =>
								item.id !== (sharingSourceConversationIdRef.current || conversationId) &&
								item.accountId === selectedConversation?.accountId,
						)}
						busyId={sharingTargetConversationId}
						onPick={item => void shareMessagesAsOriginal(item.id)}
						emptyText={locale === 'ar' ? 'لا توجد محادثات أخرى في هذا الحساب' : 'No other chats on this account'}
					/>
				</WaDialog>
			)}
			{viewOnceInfoMessage && (
				<ViewOnceInfoDialog
					message={viewOnceInfoMessage}
					locale={locale}
					accountPhone={selectedAccount?.phoneNumber}
					onClose={() => setViewOnceInfoMessage(null)}
				/>
			)}
			{deleteMessageTarget && (
				<WaDialog
					width={420}
					tone="danger"
					icon={<Trash2 size={18} strokeWidth={2.1} />}
					title={locale === 'ar' ? 'حذف الرسالة؟' : 'Delete message?'}
					subtitle={locale === 'ar' ? 'اختر طريقة حذف هذه الرسالة.' : 'Choose how this message should be deleted.'}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => setDeleteMessageTarget(null)}
					footer={
						<button type="button" className="wa-ui-btn wa-ui-btn--ghost" onClick={() => setDeleteMessageTarget(null)}>
							{locale === 'ar' ? 'إلغاء' : 'Cancel'}
						</button>
					}
				>
					<div className="wa-dx__body">
						{String(deleteMessageTarget.text || '').trim() ? (
							<div className="wa-dx__quote">
								<p className="wa-privacy-identity" dir="auto">
									{deleteMessageTarget.text}
								</p>
							</div>
						) : null}
						<div className="wa-dx__choices">
							<button type="button" className="wa-dx__choice" onClick={() => void deleteSelectedMessage('local')}>
								<span className="wa-dx__choice-icon" aria-hidden="true">
									<Trash2 size={18} strokeWidth={2.1} />
								</span>
								<span className="wa-dx__choice-copy">
									<b>{locale === 'ar' ? 'حذف لدي' : 'Delete for me'}</b>
									<small>
										{locale === 'ar' ? 'تختفي من عندك بس، والطرف التاني لسه شايفها' : 'Removed on your side only'}
									</small>
								</span>
							</button>
							{deleteMessageTarget.direction === 'outbound' && (
								<button type="button" className="wa-dx__choice is-strong" onClick={() => void deleteSelectedMessage('everyone')}>
									<span className="wa-dx__choice-icon" aria-hidden="true">
										<Users size={18} strokeWidth={2.1} />
									</span>
									<span className="wa-dx__choice-copy">
										<b>{locale === 'ar' ? 'حذف لدى الجميع' : 'Delete for everyone'}</b>
										<small>
											{locale === 'ar'
												? 'تتشال من المحادثة عند كل الأطراف'
												: 'Removed from this chat for everyone'}
										</small>
									</span>
								</button>
							)}
						</div>
					</div>
				</WaDialog>
			)}
			{messageInfo && (
				<WaDialog
					width={460}
					height={720}
					icon={<Info size={18} strokeWidth={2.1} />}
					title={locale === 'ar' ? 'معلومات الرسالة' : 'Message info'}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => setMessageInfo(null)}
				>
					<div className="wa-dx__body wa-dx__body--scroll wa-ui-scroll nice-scroll">
						{loadingMessageInfo || messageInfo.loading ? (
							<div className="wa-dx__loading">
								<Loader2 size={22} className="animate-spin" />
							</div>
						) : (
							(() => {
								const targetId = String(
									messageInfo.message?.id || messageInfo.id || '',
								);
								const liveThreadMessage =
									(conversationMessages || []).find(
										item => String(item.id) === targetId,
									) || messageInfo.message;
								const ack =
									messageInfo.acknowledgements ||
									messageInfo.provider?.acknowledgements ||
									{};
								const direction = String(
									messageInfo.direction ||
										liveThreadMessage?.direction ||
										messageInfo.message?.direction ||
										'',
								).toLowerCase();
								const outbound =
									direction === 'outbound' ||
									direction === 'out' ||
									messageInfo.provider?.fromMe === true ||
									liveThreadMessage?.fromMe === true ||
									messageInfo.message?.fromMe === true;
								const senderView = messageInfo.senderReceiptView || null;
								const statusLabel = outbound
									? preferWhatsAppAckStatus(
											preferWhatsAppAckStatus(
												liveThreadMessage?.status,
												messageInfo.message?.status,
											),
											preferWhatsAppAckStatus(messageInfo.status, ack.status),
										)
									: 'sent';
								const formatInfoTime = value => {
									if (!value) return null;
									const date = new Date(value);
									if (Number.isNaN(date.getTime())) return null;
									return date.toLocaleString(locale === 'ar' ? 'ar-EG' : undefined);
								};
								const sentAt = formatInfoTime(
									outbound
										? messageInfo.sentAt ||
												liveThreadMessage?.sentAt ||
												liveThreadMessage?.createdAt
										: senderView?.sentAt ||
												ack.sentAt ||
												messageInfo.sentAt ||
												liveThreadMessage?.sentAt,
								);
								const deliveredAt = formatInfoTime(
									messageInfo.statusUpdatedAt || ack.statusUpdatedAt,
								);
								const readAt = formatInfoTime(
									outbound
										? messageInfo.statusUpdatedAt || ack.statusUpdatedAt
										: senderView?.readAt || ack.readAt,
								);
								const arrivedLocallyAt = formatInfoTime(
									senderView?.arrivedLocallyAt ||
										ack.arrivedLocallyAt ||
										liveThreadMessage?.createdAt,
								);
								const readLocally = Boolean(
									senderView?.readLocally ?? ack.readLocally,
								);
								const stillUnreadLocally = Boolean(
									senderView?.stillUnreadLocally ?? ack.stillUnreadLocally,
								);
								const isFailed = outbound && statusLabel === 'failed';
								const isPending = outbound && statusLabel === 'pending';
								const isSent = outbound
									? !isFailed &&
										!isPending &&
										['sent', 'delivered', 'read', 'played'].includes(statusLabel)
									: Boolean(senderView?.sent ?? true);
								// Inbound: never invent their ✓✓ from CRM presence.
								const isDelivered = outbound
									? Boolean(ack.delivered) ||
										ack.deliveryRemaining === 0 ||
										['delivered', 'read', 'played'].includes(statusLabel)
									: false;
								const isRead = outbound
									? Boolean(ack.read) ||
										ack.readRemaining === 0 ||
										['read', 'played'].includes(statusLabel)
									: false;
								const isPlayed =
									outbound &&
									(Boolean(ack.played) ||
										ack.playedRemaining === 0 ||
										statusLabel === 'played');
								const statusText = outbound
									? locale === 'ar'
										? {
												pending: 'لسه بتتبعت',
												sent: 'اتبعتت ✓',
												delivered: 'وصلتله ✓✓',
												read: 'قراها ✓✓',
												played: 'شغّلها',
												failed: 'فشل الإرسال',
											}[statusLabel] || statusLabel
										: {
												pending: 'Pending',
												sent: 'Sent ✓',
												delivered: 'Delivered ✓✓',
												read: 'Read ✓✓',
												played: 'Played',
												failed: 'Failed',
											}[statusLabel] || statusLabel
									: locale === 'ar'
										? 'علامات ✓✓ عندها مش معروفة من واتساب للمستلم'
										: "Their ✓✓ ticks aren't exposed by WhatsApp to recipients";
								const previewText =
									String(
										liveThreadMessage?.text ||
											messageInfo.message?.text ||
											'',
									)
										.trim()
										.replace(/@\d{8,32}\b/g, token =>
											resolveWhatsAppMentionLabel(
												token,
												mentionDirectory,
												liveThreadMessage?.mentionLabels || messageInfo.message?.mentionLabels,
											),
										) ||
									// A message without text: say what it is ("ptt" is WhatsApp's name for a voice note).
									(() => {
										const kind = String(liveThreadMessage?.type || messageInfo.type || '').toLowerCase();
										const ar = locale === 'ar';
										if (/ptt|voice|audio/.test(kind)) return ar ? '🎤 رسالة صوتية' : '🎤 Voice message';
										if (/image/.test(kind)) return ar ? '📷 صورة' : '📷 Photo';
										if (/video/.test(kind)) return ar ? '🎥 فيديو' : '🎥 Video';
										if (/sticker/.test(kind)) return ar ? 'ملصق' : 'Sticker';
										if (/document|file/.test(kind)) return ar ? '📄 مستند' : '📄 Document';
										if (/location/.test(kind)) return ar ? '📍 موقع' : '📍 Location';
										return ar ? 'رسالة' : 'Message';
									})();
								const receiptRows = outbound
									? [
											{
												id: 'sent',
												label: locale === 'ar' ? 'اتبعتت' : 'Sent',
												hint: locale === 'ar' ? 'علامة صح واحدة' : 'Single check',
												done: isSent || isDelivered || isRead,
												time: sentAt,
												icon: 'single',
												tone: 'sent',
											},
											{
												id: 'delivered',
												label: locale === 'ar' ? 'وصلت لجهازه' : 'Delivered',
												hint: locale === 'ar' ? 'علامتين صح رمادي' : 'Double grey checks',
												done: isDelivered || isRead,
												time: isDelivered || isRead ? deliveredAt || sentAt : null,
												icon: 'double',
												tone: 'delivered',
											},
											{
												id: 'read',
												label: locale === 'ar' ? 'فتحها / قراها' : 'Read',
												hint: locale === 'ar' ? 'علامتين صح زرقاء' : 'Double blue checks',
												done: isRead,
												time: isRead ? readAt : null,
												icon: 'double',
												tone: 'read',
											},
											...(String(liveThreadMessage?.type || messageInfo.type || '')
												.toLowerCase()
												.match(/audio|ptt|voice/)
												? [
														{
															id: 'played',
															label: locale === 'ar' ? 'شغّل الصوت' : 'Played',
															hint: locale === 'ar' ? 'استمع للرسالة' : 'Listened',
															done: isPlayed,
															time: isPlayed ? readAt : null,
															icon: 'single',
															tone: 'played',
														},
													]
												: []),
										]
									: [
											{
												id: 'sent',
												label: locale === 'ar' ? 'هي بعتها' : 'They sent it',
												hint:
													locale === 'ar'
														? 'مؤكد عندنا إنها اتبعتت (✓)'
														: 'Confirmed she sent it (✓)',
												done: isSent,
												time: sentAt,
												icon: 'single',
												tone: 'sent',
											},
											{
												id: 'their-delivered',
												label:
													locale === 'ar'
														? 'علامتين صح رمادي عندها'
														: 'Their ✓✓ grey (delivered)',
												hint:
													locale === 'ar'
														? 'واتساب مش بيدي للمستلم يشوف علامتهم'
														: 'WhatsApp does not expose this to recipients',
												done: false,
												time: null,
												icon: 'double',
												tone: 'delivered',
											},
											{
												id: 'their-read',
												label:
													locale === 'ar'
														? 'علامتين صح زرقاء عندها'
														: 'Their ✓✓ blue (read)',
												hint:
													locale === 'ar'
														? 'مش معروف من هنا — مفيش API للمستلم'
														: 'Unknown here — no recipient API',
												done: false,
												time: null,
												icon: 'double',
												tone: 'read',
											},
										];
								const localInboundRows = !outbound
									? [
											{
												id: 'arrived',
												label:
													locale === 'ar'
														? 'وصلت عندك في الـ CRM'
														: 'Arrived in your CRM',
												hint:
													locale === 'ar'
														? 'ده عندك محليًا — مش معناه ✓✓ عندها'
														: 'Local only — not their ✓✓',
												done: Boolean(arrivedLocallyAt || sentAt),
												time: arrivedLocallyAt || sentAt,
											},
											{
												id: 'local-read',
												label:
													locale === 'ar'
														? 'اتقرت / اتفتحت عندك'
														: 'Read / opened on your side',
												hint: stillUnreadLocally
													? locale === 'ar'
														? 'لسه ضمن غير المقروء'
														: 'Still in your unread window'
													: locale === 'ar'
														? 'مش ضمن غير المقروء دلوقتي'
														: 'Not in your unread window now',
												done: readLocally,
												time: readLocally ? readAt : null,
											},
										]
									: [];
								const StatusGlyph = ({ kind }) => {
									if (kind === 'failed') {
										return <AlertCircle size={22} className="text-rose-500" />;
									}
									if (kind === 'pending') {
										return <Clock size={22} className="text-slate-400" />;
									}
									if (kind === 'read') {
										return <CheckCheck size={22} className="text-[#53BDEB]" strokeWidth={2.5} />;
									}
									if (kind === 'delivered') {
										return <CheckCheck size={22} className="text-[#8696A0]" strokeWidth={2.5} />;
									}
									return <Check size={22} className="text-[#8696A0]" strokeWidth={2.5} />;
								};
								const currentKind = outbound
									? isFailed
										? 'failed'
										: isPending
											? 'pending'
											: isRead
												? 'read'
												: isDelivered
													? 'delivered'
													: 'sent'
									: 'sent';
								const groupReceipts =
									outbound && !isFailed && !isPending ? messageInfo.groupReceipts : null;
								if (groupReceipts) {
									return (
										<div className="wa-mi">
											<div className="wa-mi__bubble is-mine">
												<p className="wa-privacy-identity" dir="auto">
													{previewText}
												</p>
												<span className="wa-mi__bubble-time">{sentAt || '—'}</span>
											</div>
											<GroupMessageReceiptsPanel
												receipts={groupReceipts}
												locale={locale}
												formatTime={formatInfoTime}
												resolveMember={entry =>
													resolveReactor({
														actorKey: entry.key,
														actorName: entry.name,
														actorPhone: entry.phone,
														actorAvatarUrl: entry.avatarUrl,
													})
												}
											/>
										</div>
									);
								}
								return (
									<div className="wa-mi">
										<div className={`wa-mi__bubble ${outbound ? 'is-mine' : 'is-theirs'}`}>
											<p className="wa-privacy-identity" dir="auto">
												{previewText}
											</p>
											<span className="wa-mi__bubble-time">{sentAt || '—'}</span>
										</div>
										<div className={`wa-mi__status is-${currentKind}`}>
											<span className="wa-mi__status-glyph">
												<StatusGlyph kind={currentKind} />
											</span>
											<div className="min-w-0 flex-1">
												<p className="wa-mi__status-label">
													{outbound
														? locale === 'ar'
															? 'حالة رسالتك عنده دلوقتي'
															: 'Status of your message on their side'
														: locale === 'ar'
															? 'علامات الصح عندها'
															: 'Their check marks'}
												</p>
												<p className="wa-mi__status-value">{statusText}</p>
											</div>
										</div>
										<section className="wa-mi__card">
											<h4 className="wa-mi__card-title">
												{outbound
													? locale === 'ar'
														? 'إيصالات رسالتك (✓ / ✓✓)'
														: 'Your message receipts (✓ / ✓✓)'
													: locale === 'ar'
														? 'إيه اللي نقدر نؤكده عن علاماتها'
														: 'What we can confirm about their ticks'}
											</h4>
											<ol className="wa-mi__timeline">
												{receiptRows.map(row => (
													<li
														key={row.id}
														className={`wa-mi__step${row.done ? ' is-done' : ''} is-${row.tone}`}
													>
														<span className="wa-mi__step-dot" aria-hidden="true">
															{row.done ? (
																row.icon === 'double' ? (
																	<CheckCheck size={16} strokeWidth={2.6} />
																) : (
																	<Check size={16} strokeWidth={2.6} />
																)
															) : (
																<Clock size={14} strokeWidth={2.2} />
															)}
														</span>
														<div className="wa-mi__step-copy">
															<p className="wa-mi__step-label">{row.label}</p>
															<p className="wa-mi__step-hint">{row.hint}</p>
														</div>
														<span className="wa-mi__step-time">
															{row.done
																? row.time || (locale === 'ar' ? 'تم' : 'Done')
																: locale === 'ar'
																	? 'مش معروف'
																	: 'Unknown'}
														</span>
													</li>
												))}
											</ol>
										</section>
										{localInboundRows.length ? (
											<section className="wa-mi__card">
												<h4 className="wa-mi__card-title">
													{locale === 'ar'
														? 'عندك أنت (محلي — مش علاماتها)'
														: 'On your side (local — not their ticks)'}
												</h4>
												<ul className="wa-mi__rows">
													{localInboundRows.map(row => (
														<li key={row.id} className={`wa-mi__row${row.done ? ' is-done' : ''}`}>
															<div className="min-w-0">
																<p className="wa-mi__step-label">{row.label}</p>
																<p className="wa-mi__step-hint">{row.hint}</p>
															</div>
															<strong className="wa-mi__row-value">
																{row.done
																	? row.time || (locale === 'ar' ? 'نعم' : 'Yes')
																	: locale === 'ar'
																		? 'لسه'
																		: 'Not yet'}
															</strong>
														</li>
													))}
												</ul>
											</section>
										) : null}
									</div>
								);
							})()
						)}
					</div>
				</WaDialog>
			)}
			<DelayedSendPopover
				open={delayedSendOpen}
				anchorEl={delayedSendButtonRef.current}
				ar={locale === 'ar'}
				enabled={delayedSendOn}
				onEnabledChange={changeDelayedSendOn}
				prefs={delayedSendPrefs}
				onPrefsChange={setDelayedSendPrefs}
				gapState={replyGapState.conversationId === conversationId ? replyGapState : null}
				onRetryGap={() => conversationId && void loadReplyGap(conversationId)}
				plan={delayedSendPlan}
				now={delayedSendNow}
				onClose={() => setDelayedSendOpen(false)}
			/>
			<MountWhenOpened open={scheduleDialogOpen}>
				<ScheduleMessageDialog
					open={scheduleDialogOpen}
					onOpenChange={closeSchedulePopover}
					anchorEl={scheduleAnchorEl}
					ar={locale === 'ar'}
					accountId={accountId}
					conversations={scheduleConversationOptions}
					initialConversationId={conversationId}
					initialText={editingSchedule ? '' : getDraft()}
					editingSchedule={editingSchedule}
					onCreated={() => {
						if (conversationId) void loadMessageSchedules(conversationId);
						setSchedulesPanelOpen(true);
					}}
					onUpdated={() => {
						if (conversationId) void loadMessageSchedules(conversationId);
						setSchedulesPanelOpen(true);
					}}
				/>
			</MountWhenOpened>
			<MountWhenOpened open={voiceChangerOpen}>
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
			</MountWhenOpened>
			<MountWhenOpened open={Boolean(videoToVoiceTarget)}>
				<VideoToVoiceDialog
					open={Boolean(videoToVoiceTarget)}
					attachmentId={videoToVoiceTarget?.attachmentId || ''}
					locale={locale}
					sending={Boolean(sendingVideoAsVoiceId)}
					onClose={() => setVideoToVoiceTarget(null)}
					onSend={editOptions =>
						sendVideoAsVoice(videoToVoiceTarget?.attachmentId, editOptions)
					}
					onSaveToLibrary={editOptions =>
						setLibrarySaveTarget({
							attachmentId: videoToVoiceTarget?.attachmentId || '',
							voiceEdit: editOptions,
							// The editor output is a new voice note, not the source file.
							defaultTitle: defaultLibraryItemTitle({
								type: 'ptt',
								timestamp: Date.now(),
								locale,
							}),
						})
					}
				/>
			</MountWhenOpened>
			<MountWhenOpened open={Boolean(librarySaveTarget)}>
				<SaveToLibraryDialog
					open={Boolean(librarySaveTarget)}
					attachmentId={librarySaveTarget?.attachmentId || ''}
					voiceEdit={librarySaveTarget?.voiceEdit || null}
					defaultTitle={librarySaveTarget?.defaultTitle || ''}
					locale={locale}
					onClose={() => setLibrarySaveTarget(null)}
				/>
			</MountWhenOpened>
			{deleteChatTarget ? (
				<WaDialog
					zIndex={130}
					width={400}
					tone="danger"
					icon={<Trash2 size={17} strokeWidth={2.1} />}
					title={t.deleteChat}
					subtitle={conversationTitle(deleteChatTarget)}
					closeLabel={locale === 'ar' ? 'إلغاء' : 'Cancel'}
					onClose={() => setDeleteChatTarget(null)}
					footer={
						<>
							<button type="button" className="wa-ui-btn wa-ui-btn--secondary" onClick={() => setDeleteChatTarget(null)}>
								{locale === 'ar' ? 'إلغاء' : 'Cancel'}
							</button>
							<button
								type="button"
								className="wa-ui-btn wa-ui-btn--danger"
								onClick={() => void confirmDeleteConversationChat()}
							>
								{t.deleteChat}
							</button>
						</>
					}
				>
					<div className="wa-dx__body">
						<p dir="auto">{t.deleteChatConfirm}</p>
					</div>
				</WaDialog>
			) : null}
			<MountWhenOpened open={Boolean(storyTarget)}>
				<AddToStoryDialog
					open={Boolean(storyTarget)}
					accountId={accountId || ''}
					attachmentId={storyTarget?.attachmentId || ''}
					socialDownloadId={storyTarget?.socialDownloadId || ''}
					previewUrl={storyTarget?.previewUrl || ''}
					durationSeconds={storyTarget?.durationSeconds || 0}
					fileSizeBytes={storyTarget?.fileSizeBytes || 0}
					locale={locale}
					onClose={() => setStoryTarget(null)}
					onPublished={() => {
						setStoryTarget(null);
						// The story list is what the user will look at next, and the new story
						// only appears there after a provider refresh.
						if (accountId) void loadStatuses(accountId, { force: true, silent: true });
					}}
				/>
			</MountWhenOpened>
			<StoryAudienceDialog
				open={storyAudienceOpen && Boolean(accountId)}
				accountId={accountId || ''}
				locale={locale}
				onClose={() => setStoryAudienceOpen(false)}
				onSaved={settings => setStoryAudienceSaved(current => ({ ...current, [accountId]: settings }))}
			/>
			<MountWhenOpened open={libraryOpen}>
				<SavedLibraryPanel
					open={libraryOpen}
					locale={locale}
					conversations={scheduleConversationOptions}
					activeConversationId={conversationId || ''}
					onClose={() => setLibraryOpen(false)}
				/>
			</MountWhenOpened>
			<WaVoiceDock locale={locale} onOpenConversation={id => openConversation(id)} />
			{transcriptionSources?.length ? (
				<Suspense fallback={null}>
					<TranscriptionDialog
						open
						autoStart={transcriptionIntent === 'copy'}
						intent={transcriptionIntent || 'default'}
						onOpenChange={open => {
							if (!open) {
								setTranscriptionSources(null);
								setTranscriptionIntent(null);
								pendingCopyMessagesRef.current = [];
							}
						}}
						items={transcriptionSources}
						loadVoiceFile={loadTranscriptionSourceFile}
						onCompleted={(text, data, meta) => {
							const timeline = Array.isArray(meta?.timeline) ? meta.timeline : [];
							const textOverrideById = transcriptTextByIdFromTimeline(timeline);
							const mediaSources = (transcriptionSources || []).filter(item =>
								isMediaTranscriptKind(item?.kind),
							);
							if (mediaSources.length) {
								const entries = mediaSources
									.map(item => {
										const transcriptText = String(
											textOverrideById[item.id] || '',
										).trim();
										if (!transcriptText) return null;
										return {
											messageId: item.id,
											text: transcriptText,
											transcriptionId: data?.id || null,
										};
									})
									.filter(Boolean);
								if (entries.length) {
									const saved = saveMessageTranscripts(entries);
									if (Object.keys(saved).length) {
										setMessageTranscripts(current => ({ ...current, ...saved }));
									}
								}
							}
							if (transcriptionIntent === 'copy') {
								const messages = pendingCopyMessagesRef.current.length
									? pendingCopyMessagesRef.current
									: getSelectedMessagesForCopy();
								void finishCopySelectedMessages(messages, textOverrideById).finally(
									() => {
										setTranscriptionSources(null);
										setTranscriptionIntent(null);
										pendingCopyMessagesRef.current = [];
									},
								);
							}
						}}
					/>
				</Suspense>
			) : null}
			{selectedStatus && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label={t.storyFrom}
					className="wa-story-viewer fixed inset-0 z-50 flex cursor-default items-center justify-center bg-slate-950/85 p-2 backdrop-blur-sm sm:p-4"
					onClick={closeStory}
					onKeyDown={event => {
						if (event.key === 'Escape' && !storyViewersOpenRef.current) closeStory();
					}}
				>
					{(() => {
						const queue = storyQueue.length ? storyQueue : [selectedStatus];
						const people =
							storyPeopleQueue.length > 0
								? storyPeopleQueue
								: [];
						const peopleIdx =
							people.length > 0 ? storyPeopleIndex : -1;
						const prevPerson =
							peopleIdx > 0 ? people[peopleIdx - 1] : null;
						const nextPerson =
							peopleIdx >= 0 && peopleIdx < people.length - 1
								? people[peopleIdx + 1]
								: storyLoop && people.length > 1
									? people[0]
									: null;
						const personPeekStatus = person => {
							if (!person) return null;
							const playable = (person.items || []).filter(
								isPlayableStoryItem,
							);
							return (
								playable.find(item => !viewedStatusIds.has(item.id)) ||
								playable[0] ||
								person.latest ||
								null
							);
						};
						const prevPeekStatus = personPeekStatus(prevPerson);
						const nextPeekStatus = personPeekStatus(nextPerson);
						const peekFor = item => {
							if (!item?.id) return null;
							return (
								storyPeekMedia[item.id] ||
								storyThumbs[item.id] ||
								null
							);
						};
						const personLabel = person => {
							const item = person?.latest || personPeekStatus(person);
							return (
								item?.contactName ||
								(item?.isOwn || person?.isOwn
									? selectedAccount?.label
									: formatWhatsAppPhone(
											String(item?.senderWaId || person?.senderWaId || '')
												.replace(/@.*$/, '')
												.replace(/\D/g, ''),
										) ||
										String(
											item?.senderWaId || person?.senderWaId || '',
										).replace(/@.*$/, '')) ||
								''
							);
						};
						const renderPeek = (person, statusItem, side) => {
							if (!person || !statusItem || storyExpanded) return null;
							const peek = peekFor(statusItem);
							const peekType = String(
								peek?.type || statusItem.type || '',
							).toLowerCase();
							const isVideoPeek = peekType.includes('video');
							const label = personLabel(person);
							return (
								<button
									type="button"
									key={`${side}-${person.senderWaId}`}
									className={`wa-story-peek wa-story-peek--${side}`}
									onClick={event => {
										event.preventDefault();
										event.stopPropagation();
										goStoryPerson(side === 'prev' ? -1 : 1);
									}}
									aria-label={
										side === 'prev' ? t.previousStory : t.nextStory
									}
									title={
										side === 'prev' ? t.previousStory : t.nextStory
									}
								>
									<span className="wa-story-peek__frame">
										{peek?.url ? (
											isVideoPeek ? (
												<video
													src={peek.url}
													muted
													playsInline
													preload="metadata"
													className="wa-story-peek__media"
												/>
											) : (
												<img
													src={peek.url}
													alt=""
													className="wa-story-peek__media"
												/>
											)
										) : (
											<span
												className={`wa-story-peek__fallback bg-gradient-to-br ${gradientFor(statusItem.providerStatusId || statusItem.id || person.senderWaId)}`}
											/>
										)}
										<span className="wa-story-peek__scrim" />
										<span className="wa-story-peek__hint" aria-hidden="true">
											{side === 'prev'
												? locale === 'ar'
													? <ChevronRight size={16} />
													: <ChevronLeft size={16} />
												: locale === 'ar'
													? <ChevronLeft size={16} />
													: <ChevronRight size={16} />}
										</span>
										<span className="wa-story-peek__meta">
											<Avatar
												label={label}
												size={8}
												src={
													statusItem.contactAvatarUrl ||
													person.latest?.contactAvatarUrl ||
													''
												}
											/>
											<span className="wa-story-peek__name">
												{label}
											</span>
										</span>
									</span>
								</button>
							);
						};
						return (
							<div
								className={`wa-story-viewer__stage ${storyExpanded ? 'is-expanded' : ''}`}
								onClick={event => event.stopPropagation()}
							>
								{renderPeek(prevPerson, prevPeekStatus, 'prev')}
								<div
									className={`wa-story-viewer__carousel ${
										storyExpanded ? 'is-expanded' : ''
									}`}
								>
									<AnimatePresence
										initial={false}
										custom={storyPersonSlideDir}
										mode="sync"
									>
										<motion.div
											key={
												selectedStatus.senderWaId ||
												selectedStatus.id ||
												selectedStatus.providerStatusId
											}
											custom={storyPersonSlideDir}
											variants={STORY_PERSON_SLIDE_VARIANTS}
											initial="enter"
											animate="center"
											exit="exit"
											transition={STORY_PERSON_SLIDE_TRANSITION}
											className="wa-story-viewer__card relative flex h-full w-full cursor-default flex-col overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl"
											onAnimationComplete={definition => {
												if (definition === 'center') {
													storyPersonAnimatingRef.current = false;
													if (storyPersonAnimUnlockTimerRef.current) {
														window.clearTimeout(
															storyPersonAnimUnlockTimerRef.current,
														);
														storyPersonAnimUnlockTimerRef.current = null;
													}
												}
											}}
										>
						<div className="wa-story-viewer__scrim wa-story-viewer__scrim--top" aria-hidden="true" />
						<div className="wa-story-viewer__progress absolute inset-x-3 top-1.5 z-50 flex gap-1">
							{queue.map((item, index) => (
								<button
									key={item.id || index}
									type="button"
									onPointerDown={event => event.stopPropagation()}
									onClick={event => {
										event.preventDefault();
										event.stopPropagation();
										goStoryTo(index);
									}}
									aria-label={
										locale === 'ar'
											? `الستوري ${index + 1} من ${queue.length}`
											: `Story ${index + 1} of ${queue.length}`
									}
									aria-current={index === storyIndex ? 'step' : undefined}
									title={formatStoryViewTime(item.publishedAt, locale) || undefined}
									className="group flex-1 cursor-pointer py-1.5 outline-none"
								>
									<span className="block h-1 overflow-hidden rounded-full bg-white/30 transition-[height,background-color] group-hover:h-1.5 group-hover:bg-white/50 group-focus-visible:ring-2 group-focus-visible:ring-white/80">
										<span
											ref={index === storyIndex ? storyProgressBarRef : undefined}
											className="block h-full rounded-full bg-white"
											style={{
												width:
													index < storyIndex
														? '100%'
														: index > storyIndex
															? '0%'
															: `${storyProgressRef.current}%`,
												transition: 'none',
											}}
										/>
									</span>
								</button>
							))}
						</div>
						<div className="wa-story-viewer__header absolute inset-x-0 top-5 z-40 flex items-center gap-1.5 px-3 py-2 pointer-events-none sm:gap-2 sm:px-4 sm:py-3">
							<div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2.5">
								<Avatar
									label={selectedStatus.contactName || selectedStatus.senderWaId}
									src={selectedStatus.contactAvatarUrl || ''}
									size={8}
								/>
								<div className="min-w-0 flex-1 leading-tight">
									<p className="truncate text-sm font-black">
										{selectedStatus.contactName ||
											(selectedStatus.isOwn
												? selectedAccount?.label
												: formatWhatsAppPhone(
														String(selectedStatus.senderWaId || '')
															.replace(/@.*$/, '')
															.replace(/\D/g, ''),
													) ||
													String(selectedStatus.senderWaId || '').replace(
														/@.*$/,
														'',
													))}
									</p>
									<p className="truncate whitespace-nowrap text-[11px] text-white/70">
										<time dateTime={selectedStatus.publishedAt || undefined}>
											{formatStoryViewTime(selectedStatus.publishedAt, locale)}
										</time>
										{selectedStatus.revokedAt && (
											<span
												data-testid="story-revoked-badge"
												className="ms-2 rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-semibold text-white"
												title={new Date(selectedStatus.revokedAt).toLocaleString(locale)}
											>
												{locale === 'ar' ? 'صاحبها مسحها' : 'Deleted by poster'}
											</span>
										)}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									openStoryRepost();
								}}
								disabled={repostingStory || loadingStory || !canUseWhatsApp || demo.settings.enabled}
								title={t.repostStory}
								className="wa-story-ctl pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-black/40 transition-colors hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-40"
								aria-label={t.repostStory}
							>
								{repostingStory ? (
									<Loader2 size={17} className="animate-spin" />
								) : (
									<Repeat2 size={18} />
								)}
							</button>
							<button
								type="button"
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									openStorySharePicker();
								}}
								disabled={
									Boolean(sendingStoryShareId) ||
									loadingStory ||
									!canUseWhatsApp ||
									demo.settings.enabled
								}
								title={t.sendStoryAsMediaHint}
								className="wa-story-ctl pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-black/40 transition-colors hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-40"
								aria-label={t.sendStoryAsMedia}
							>
								{sendingStoryShareId ? (
									<Loader2 size={17} className="animate-spin" />
								) : (
									<Share2 size={17} />
								)}
							</button>
							<button
								type="button"
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									setStoryLoop(current => !current);
								}}
								title={storyLoop ? t.loopStoryOn : t.loopStoryOff}
								className={`wa-story-ctl pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${
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
									setStoryExpanded(current => !current);
								}}
								title={storyExpanded ? t.collapseStory : t.expandStory}
								className={`wa-story-ctl wa-story-ctl--expand pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${
									storyExpanded
										? 'bg-emerald-500 text-white hover:bg-emerald-400'
										: 'bg-black/40 hover:bg-black/60'
								}`}
								aria-label={storyExpanded ? t.collapseStory : t.expandStory}
								aria-pressed={storyExpanded}
							>
								{storyExpanded ? (
									<Minimize2 size={17} />
								) : (
									<Maximize2 size={17} />
								)}
							</button>
							{String(selectedStatus?.type || '')
								.toLowerCase()
								.includes('video') && (
							<button
								type="button"
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									setStoryMuted(current => !current);
								}}
								title={storyMuted ? t.unmuteStory : t.muteStory}
								className={`wa-story-ctl pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${
									storyMuted
										? 'bg-black/40 hover:bg-black/60'
										: 'bg-emerald-500 text-white hover:bg-emerald-400'
								}`}
								aria-label={storyMuted ? t.unmuteStory : t.muteStory}
								aria-pressed={!storyMuted}
							>
								{storyMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
							</button>
							)}
							<button
								type="button"
								onClick={event => {
									event.preventDefault();
									event.stopPropagation();
									setStoryPaused(current => !current);
								}}
								className="wa-story-ctl pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
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
								className="wa-story-ctl pointer-events-auto relative z-50 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
								aria-label={locale === 'ar' ? 'إغلاق القصة' : 'Close story'}
							>
								<X size={19} />
							</button>
						</div>
						{!storyViewerEmbed && (
							<>
								{/* In-story item prev/next (same person) — visible when multiple segments */}
								{queue.length > 1 && storyIndex > 0 && (
									<button
										type="button"
										aria-label={t.previousStoryItem}
										title={t.previousStoryItem}
										onClick={event => {
											event.preventDefault();
											event.stopPropagation();
											goStory(-1);
										}}
										className="wa-story-nav-btn wa-story-nav-btn--prev absolute start-2 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65"
									>
										{locale === 'ar' ? (
											<ChevronRight size={22} />
										) : (
											<ChevronLeft size={22} />
										)}
									</button>
								)}
								{queue.length > 1 && storyIndex < queue.length - 1 && (
									<button
										type="button"
										aria-label={t.nextStoryItem}
										title={t.nextStoryItem}
										onClick={event => {
											event.preventDefault();
											event.stopPropagation();
											goStory(1);
										}}
										className="wa-story-nav-btn wa-story-nav-btn--next absolute end-2 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65"
									>
										{locale === 'ar' ? (
											<ChevronLeft size={22} />
										) : (
											<ChevronRight size={22} />
										)}
									</button>
								)}
								{/* Tap zones: item first, then person */}
								<button
									type="button"
									aria-label={t.previousStoryItem}
									onClick={() => {
										if (storyIndex > 0) goStory(-1);
										else goStoryPerson(-1);
									}}
									className="absolute bottom-24 start-0 top-24 z-20 flex w-[28%] cursor-default items-center justify-start bg-transparent p-3 md:w-[18%]"
								/>
								<button
									type="button"
									aria-label={t.nextStoryItem}
									onClick={() => {
										if (storyIndex < queue.length - 1) goStory(1);
										else goStoryPerson(1);
									}}
									className="absolute bottom-24 end-0 top-24 z-20 flex w-[28%] cursor-default items-center justify-end bg-transparent p-3 md:w-[18%]"
								/>
							</>
						)}
						<div className="wa-story-viewer__media relative z-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
							{loadingStory ? (
								<Loader2 size={32} className="animate-spin" />
							) : storyViewerEmbed ? (
								<div className="wa-story-viewer__embed relative z-30 flex h-full w-full flex-col gap-2 px-3 pb-3 pt-20">
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
									ref={bindStoryVideo}
									src={statusMediaUrl}
									controls={false}
									playsInline
									muted={storyMuted}
									onLoadedMetadata={event => {
										const duration = Number(event.currentTarget.duration);
										if (Number.isFinite(duration) && duration > 0) {
											setStoryDurationMs(duration * 1000);
										}
										event.currentTarget.muted = storyMuted;
									}}
									onTimeUpdate={event => {
										const node = event.currentTarget;
										const duration = Number(node.duration);
										if (
											!Number.isFinite(duration) ||
											duration <= 0 ||
											storyPaused
										) {
											return;
										}
										const pct = Math.min(
											100,
											(Math.max(0, node.currentTime) / duration) * 100,
										);
										setStoryProgress(pct);
									}}
									onEnded={event => {
										if (event.currentTarget !== storyVideoRef.current) return;
										finishStorySegmentRef.current();
									}}
									onCanPlay={event => {
										const node = event.currentTarget;
										node.muted = storyMuted;
										if (!storyPaused && node === storyVideoRef.current) {
											node.play().catch(() => undefined);
										}
									}}
									onError={() => {
										setStatusMediaUrl(null);
										toast.error(t.mediaUnavailable);
									}}
									className="wa-story-viewer__asset pointer-events-none h-full w-full object-contain"
								/>
							) : statusMediaUrl ? (
								<img
									src={statusMediaUrl}
									alt={selectedStatus.caption || 'WhatsApp story'}
									className="wa-story-viewer__asset pointer-events-none h-full w-full object-contain"
									onError={() => {
										setStatusMediaUrl(null);
										toast.error(t.mediaUnavailable);
									}}
								/>
							) : (
								<div className={`grid h-full w-full place-items-center bg-gradient-to-br ${gradientFor(selectedStatus.providerStatusId)}`}>
									<div className="max-w-md px-8 text-center">
										{storyMediaError ? (
											<>
												<p className="text-lg font-bold leading-relaxed text-white/95">
													{t.mediaUnavailable}
												</p>
												<p className="mt-2 text-sm text-white/75">{storyMediaError}</p>
												{!isUnrecoverableStoryMediaError(storyMediaError) ? (
												<button
													type="button"
													onClick={event => {
														event.stopPropagation();
														const notConnected =
															/not connected|session_not_ready|qr_pending/i.test(
																String(storyMediaError || ''),
															) ||
															selectedAccount?.status !== 'connected';
														if (notConnected) {
															closeStory();
															void loadTabData('accounts');
															toast(
																locale === 'ar'
																	? 'اربط واتساب من صفحة الحسابات ثم افتح الحالة مرة أخرى'
																	: 'Link WhatsApp from Accounts, then open the story again',
															);
															return;
														}
														void openStory(
															selectedStatus,
															storyQueue,
															storyIndex,
														);
													}}
													className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-white/25"
												>
													<RefreshCw size={15} />
													{/not connected|qr_pending/i.test(
														String(storyMediaError || ''),
													) || selectedAccount?.status !== 'connected'
														? t.connect || (locale === 'ar' ? 'ربط الحساب' : 'Connect')
														: t.refresh}
												</button>
												) : (
													<button
														type="button"
														onClick={event => {
															event.stopPropagation();
															if (storyQueue.length > storyIndex + 1) {
																goStory(1);
																return;
															}
															closeStory();
														}}
														className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-white/25"
													>
														{storyQueue.length > storyIndex + 1
															? locale === 'ar'
																? 'التالي'
																: 'Next'
															: locale === 'ar'
																? 'إغلاق'
																: 'Close'}
													</button>
												)}
											</>
										) : selectedStatus.caption ? (
											renderStoryLinkedText(
												selectedStatus.caption,
												'whitespace-pre-wrap text-2xl font-black leading-relaxed sm:text-3xl',
											)
										) : (
											<p className="text-3xl font-black leading-relaxed">
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
															firstMessageLink(selectedStatus.caption || '')
																.href,
														)
													}
													className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-white/25"
												>
													<Play size={15} fill="currentColor" />
													{t.viewLinkInStory}
												</button>
											)}
									</div>
								</div>
							)}
						</div>
						{selectedStatus.caption && statusMediaUrl && !storyViewerEmbed && (
							<div className="relative z-30 bg-black/35 px-5 py-3 text-center text-sm">
								{renderStoryLinkedText(selectedStatus.caption)}
							</div>
						)}
						{selectedStatus.isOwn && !demo.settings.enabled && (
							<StoryViewsButton
								count={Number(selectedStatus.viewerCount) || 0}
								locale={locale}
								onOpen={openStoryViewers}
							/>
						)}
						{!selectedStatus.isOwn &&
							!selectedStatus.isHistory &&
							canUseWhatsApp &&
							!demo.settings.enabled && (
							<StoryComposer
								locale={locale}
								liked={Boolean(selectedStatus.myLiked)}
								liking={likingStory}
								onToggleLike={likeCurrentStory}
								reaction={selectedStatus.myReaction || null}
								sendingEmoji={sendingStoryReaction}
								onReact={reactToCurrentStory}
								draft={storyReplyDraft}
								onDraftChange={setStoryReplyDraft}
								sending={sendingStoryReply}
								onSubmit={() => void replyToCurrentStory()}
								onFocusChange={active => {
									if (active) setStoryPaused(true);
									else if (!storyReplyDraft.trim()) setStoryPaused(false);
								}}
							/>
						)}
						{selectedStatus.isOwn ? (
							<StoryViewersSheet
								open={storyViewersOpen}
								locale={locale}
								loading={storyViewers.loading}
								error={storyViewers.error}
								data={storyViewers.data}
								onRetry={() => loadStoryViewers(selectedStatus)}
								onClose={closeStoryViewers}
								renderAvatar={viewer => (
									<Avatar
										label={viewer.name || viewer.phone || '?'}
										src={viewer.avatarUrl || undefined}
										size={10}
									/>
								)}
								fetchFullAvatar={fetchStoryViewerPhoto}
								fetchAvatar={fetchStoryViewerThumb}
								onOpenReply={reply => {
									if (!reply?.conversationId) return;
									closeStoryViewers();
									closeStory();
									setActiveTab('chats');
									openConversation(reply.conversationId);
								}}
							/>
						) : null}
								</motion.div>
									</AnimatePresence>
								</div>
								{renderPeek(nextPerson, nextPeekStatus, 'next')}
							</div>
						);
					})()}
				</div>
			)}

			{storyShareOpen && selectedStatus ? (
				<WaDialog
					zIndex={120}
					width={440}
					height={640}
					icon={<Share2 size={17} strokeWidth={2.1} />}
					title={t.sendStoryAsMedia}
					subtitle={t.sendStoryAsMediaHint}
					closeDisabled={Boolean(sendingStoryShareId)}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => {
						setStoryShareOpen(false);
						setStoryPaused(false);
					}}
				>
					<WaChatPicker
						autoFocus
						locale={locale}
						items={effectiveConversations}
						busyId={sendingStoryShareId}
						onPick={item => void sendStoryAsMediaToChat(item)}
						emptyText={locale === 'ar' ? 'لا توجد محادثات' : 'No chats found'}
					/>
				</WaDialog>
			) : null}
			<WhatsAppPageLockScreen
				lock={pageLock}
				locale={locale}
				onLeave={() => router.push('/dashboard')}
			/>
			{connectionCheckFor ? (
				<Suspense fallback={null}>
					<ConnectionCheckDialog
						conversationId={connectionCheckFor}
						title={conversationTitle(conversationsRef.current.find(item => item.id === connectionCheckFor)) || ''}
						ar={locale === 'ar'}
						onClose={() => setConnectionCheckFor(null)}
					/>
				</Suspense>
			) : null}
			{personCard ? (
				<Suspense fallback={null}>
					<GroupMemberPanel
						person={personCard}
						accountId={accountId}
						ar={locale === 'ar'}
						onClose={() => setPersonCard(null)}
						// Adds the chat to the list first when it is not loaded, then opens it.
						onOpenConversation={(id, meta) => openConversationFromContact(id, meta)}
					/>
				</Suspense>
			) : null}
			{quickSwitchOpen ? (
				<Suspense fallback={null}>
					<WhatsAppQuickSwitcher
						open
						ar={locale === 'ar'}
						onClose={() => setQuickSwitchOpen(false)}
						onSelectAccount={id => {
							selectWhatsAppAccount(id);
							const picked = accounts.find(item => item.id === id);
							if (picked) toast.success(locale === 'ar' ? `اتحولت لـ ${picked.label}` : `Switched to ${picked.label}`);
						}}
						accounts={accounts.map(account => ({
							id: account.id,
							label: account.label || account.providerName || account.phoneNumber || '—',
							sub: account.phoneNumber ? `+${String(account.phoneNumber).replace(/^\+/, '')}` : account.providerName || '',
							tone:
								account.status === 'connected'
									? 'ok'
									: ['connecting', 'qr_pending'].includes(account.status)
										? 'warn'
										: 'off',
							unread: Number(account.stats?.unread) || 0,
							active: account.id === accountId,
						}))}
						items={(() => {
							const label = key => t[key] || translations.en[key] || key;
							const words = key =>
								[translations.en[key], translations.ar?.[key], QUICK_SWITCH_KEYWORDS[key]].filter(Boolean).join(' ');
							const iconOf = Object.fromEntries(tabs);
							const tabItems = availableTabs.map(([key]) => ({
								id: key,
								label: label(key),
								keywords: words(key),
								Icon: iconOf[key],
								active: activeTab === key,
								onSelect: () => void loadTabData(key),
							}));
							const tools = showcaseOnly
								? []
								: [
										canUseWhatsApp || canManageWhatsApp || isAdmin
											? {
													id: 'autoForward',
													label: t.autoForward,
													keywords: words('autoForward'),
													Icon: Forward,
													onSelect: () => setAutoForwardOpen(true),
												}
											: null,
										{
											id: 'hideNames',
											label: t.hideNames,
											keywords: words('hideNames'),
											Icon: EyeOff,
											active: Boolean(privacyBlur?.enabled),
											activeLabel: locale === 'ar' ? 'شغّال' : 'On',
											onSelect: () => {
												if (activeTab !== 'chats') void loadTabData('chats');
												window.setTimeout(() => setPrivacyBlurMenuOpen(true), 60);
											},
										},
										{
											id: 'contacts',
											label: t.contacts,
											keywords: words('contacts'),
											Icon: UsersRound,
											onSelect: () => void loadTabData('contacts'),
										},
									].filter(Boolean);
							return [...tabItems, ...tools];
						})()}
					/>
				</Suspense>
			) : null}
			{autoForwardOpen ? (
				<WaDialog
					zIndex={110}
					width={680}
					height={640}
					icon={<Forward size={17} strokeWidth={2.1} className="rtl:-scale-x-100" />}
					title={locale === 'ar' ? 'تحويل تلقائي للرسايل' : 'Auto-forward messages'}
					subtitle={
						locale === 'ar'
							? 'أي رسالة توصلك من الشات الأول تتبعت على طول للشات التاني.'
							: 'Every message you receive from the first chat is sent straight to the second chat.'
					}
					closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
					onClose={() => setAutoForwardOpen(false)}
				>
					<div className="nice-scroll min-h-0 flex-1 overflow-y-auto">
						<Suspense fallback={<WaPaneLoading label={t.loading} />}>
							<AutoForwardPanel
								embedded
								accountId={accountId}
								locale={locale}
								conversations={effectiveConversations}
								canUse={canUseWhatsApp || canManageWhatsApp || isAdmin}
							/>
						</Suspense>
					</div>
				</WaDialog>
			) : null}
			{storyRepostOpen && selectedStatus
				? (() => {
						const repostType = String(selectedStatus.type || '').toLowerCase();
						const repostIsText = repostType === 'text' || repostType === 'chat';
						const canSubmit = !repostingStory && (!repostIsText || storyRepostText.trim());
						return (
							<WaDialog
								zIndex={120}
								width={460}
								icon={<Repeat2 size={17} strokeWidth={2.1} />}
								title={t.repostStory}
								subtitle={t.repostStoryHint}
								closeDisabled={repostingStory}
								closeLabel={locale === 'ar' ? 'إغلاق' : 'Close'}
								onClose={closeStoryRepost}
								footer={
									<>
										<span className="wa-ui-modal__footer-note">
											<kbd className="wa-dx__kbd">Ctrl</kbd>+<kbd className="wa-dx__kbd">Enter</kbd>
											{locale === 'ar' ? 'للنشر' : 'to post'}
										</span>
										<button
											type="button"
											className="wa-ui-btn wa-ui-btn--ghost"
											disabled={repostingStory}
											onClick={closeStoryRepost}
										>
											{locale === 'ar' ? 'إلغاء' : 'Cancel'}
										</button>
										<button
											type="button"
											className="wa-ui-btn wa-ui-btn--primary"
											disabled={!canSubmit}
											onClick={() => void submitStoryRepost()}
										>
											{repostingStory ? (
												<Loader2 size={16} className="animate-spin" />
											) : (
												<Repeat2 size={16} strokeWidth={2.4} />
											)}
											{t.repostPublish}
										</button>
									</>
								}
							>
								<div className="wa-dx__body">
									{!repostIsText && statusMediaUrl ? (
										repostType.includes('video') ? (
											<video
												src={statusMediaUrl}
												muted
												playsInline
												className="mx-auto max-h-56 w-auto rounded-xl bg-black object-contain"
											/>
										) : (
											<img
												src={statusMediaUrl}
												alt=""
												className="mx-auto max-h-56 w-auto rounded-xl bg-black object-contain"
											/>
										)
									) : null}
									<label className="flex flex-col gap-1.5 text-[13px] font-semibold">
										{repostIsText ? t.repostTextLabel : t.repostCaptionLabel}
										<textarea
											value={storyRepostText}
											autoFocus
											dir="auto"
											maxLength={700}
											placeholder={repostIsText ? t.repostTextPlaceholder : t.repostCaptionPlaceholder}
											onChange={event => setStoryRepostText(event.target.value)}
											onKeyDown={event => {
												if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
													event.preventDefault();
													if (canSubmit) void submitStoryRepost();
												}
											}}
											onFocus={event => {
												const length = event.currentTarget.value.length;
												event.currentTarget.setSelectionRange(length, length);
											}}
											rows={repostIsText ? 5 : 3}
											className="wa-ui-input wa-dx__textarea"
										/>
									</label>
									<p className="text-[12px] opacity-70" dir="auto">
										{repostIsText ? `${storyRepostText.length}/700` : t.repostMediaNote}
									</p>
								</div>
							</WaDialog>
						);
					})()
				: null}
			<ChatImageViewer
				images={chatImages}
				activeId={activeChatImageId}
				onClose={() => setActiveChatImageId(null)}
				onChange={setActiveChatImageId}
				hasMoreOlder={hasMoreMessages}
				loadingOlder={loadingOlder}
				loadMoreLabel={t.loadMoreImages}
				onLoadMore={() =>
					void loadOlder({ preserveScroll: false, ignoreThrottle: true, forceProvider: true })
				}
			/>
			{documentPreview?.blob ? (
				<Suspense fallback={null}>
					<ChatDocumentViewer
						open
						file={documentPreview}
						locale={locale}
						onClose={() => setDocumentPreview(null)}
					/>
				</Suspense>
			) : null}
		</div>
	);
}

