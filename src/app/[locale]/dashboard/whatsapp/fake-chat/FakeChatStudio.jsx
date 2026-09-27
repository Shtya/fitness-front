'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	Braces,
	Bell,
	Camera,
	Download,
	ImagePlus,
	LayoutList,
	Loader2,
	Mic,
	Play,
	Plus,
	RefreshCw,
	RotateCcw,
	Square,
	Ticket,
	Trash2,
	Volume2,
} from 'lucide-react';
import api from '@/utils/axios';
import ChatThreadPreview from './ChatThreadPreview';
import ChatsListPreview from './ChatsListPreview';
import ClipboardTray from './ClipboardTray';
import ContactInfoPreview from './ContactInfoPreview';
import ShareScreenshotSheet from './ShareScreenshotSheet';
import './phone-font.css';
import {
	captureNodeAsPng,
	dataUrlToFile,
	formatChatBubbleTime,
	formatIosStatusTime,
	IPHONE_XR,
	IPHONE_LAYOUT,
	IPHONE_CONTENT_SCALE,
	IPHONE_DEVICE,
	nextId,
} from './capture';
import {
	applyChatPackToState,
	bumpChatToTop,
	CHAT_PACK_HELP,
	createDefaultStudioState,
	getActiveChat,
	INFO_JSON_HELP,
	listFieldsFromMessages,
	LIST_JSON_HELP,
	MESSAGES_JSON_HELP,
	normalizeInfoState,
	normalizeListState,
	normalizeMessages,
	resolveThreadView,
	studioChatPackToJson,
	studioInfoToJson,
	studioListToJson,
	studioMessagesToJson,
} from './defaults';
import { cn } from '@/utils/cn';
import { fileBtn, segBtn, tw } from './styles';
import { LIST_AVATARS } from './assets';
import {
	ensureIosWaFonts,
	mapLiveMessagesToFake,
	matchConversationToChat,
	repairListAvatarPaths,
	syncListAvatarsFromConversations,
} from './ios-font-and-match';
import {
	intervalToMs,
	playWhatsAppTone,
	setToneVolume,
	getToneVolume,
	WHATSAPP_MESSAGE_TONES,
} from './notification-tones';
import { fetchMessages } from '../hooks/useWhatsAppQueries';
import { absoluteMediaLink, shortMediaPath, uploadFakeChatImage } from './media-url';
import {
	clearFakeChatSnapshot,
	loadFakeChatSnapshot,
	saveFakeChatSnapshot,
} from './persist';

function clipboardImageFile(clipboardData) {
	if (!clipboardData) return null;
	const items = Array.from(clipboardData.items || []);
	for (const item of items) {
		if (item.type?.startsWith('image/')) {
			const file = item.getAsFile();
			if (file) return file;
		}
	}
	const files = Array.from(clipboardData.files || []);
	return files.find(file => file.type?.startsWith('image/')) || null;
}

export default function FakeChatStudio({
	locale = 'en',
	accountId = '',
	conversations = [],
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const phoneRef = useRef(null);
	const screenRef = useRef(null);
	const stageRef = useRef(null);
	const studioRef = useRef(null);
	const pasteTargetRef = useRef('clipboard');
	const saveTimerRef = useRef(null);
	const snapshot = useMemo(() => loadFakeChatSnapshot(accountId), [accountId]);
	const initial = snapshot.state;
	const [state, setState] = useState(initial);
	const [persistReady, setPersistReady] = useState(false);
	const [capturing, setCapturing] = useState(false);
	const [phoneScale, setPhoneScale] = useState(1);
	const [editorMode, setEditorMode] = useState('ui'); // ui | pack | info | msgs | sound
	const [toneId, setToneId] = useState('popcorn');
	const [toneIntervalValue, setToneIntervalValue] = useState(5);
	const [toneIntervalUnit, setToneIntervalUnit] = useState('seconds'); // seconds | minutes
	const [toneRepeatCount, setToneRepeatCount] = useState(3);
	const [toneRunning, setToneRunning] = useState(false);
	const [tonePlayed, setTonePlayed] = useState(0);
	const [toneError, setToneError] = useState('');
	const [toneVolumePct, setToneVolumePct] = useState(() => Math.round(getToneVolume() * 100));
	const [bumpUnreadOnTone, setBumpUnreadOnTone] = useState(true);
	const toneTimerRef = useRef(null);
	const toneStopRef = useRef(false);
	const [infoJson, setInfoJson] = useState(() => studioInfoToJson(initial));
	const [packJson, setPackJson] = useState(() => studioChatPackToJson(initial));
	const [msgsJson, setMsgsJson] = useState(() => studioMessagesToJson(initial));
	const [listJson, setListJson] = useState(() => studioListToJson(initial));
	const [jsonError, setJsonError] = useState('');
	const [clipboardItems, setClipboardItems] = useState(() => snapshot.clipboardItems || []);
	const [packIntervalValue, setPackIntervalValue] = useState(5);
	const [packIntervalUnit, setPackIntervalUnit] = useState('seconds'); // seconds | minutes
	const [packTimeMode, setPackTimeMode] = useState('now'); // now | custom
	const [packCustomStart, setPackCustomStart] = useState('');
	const [packFirstContact, setPackFirstContact] = useState(false);
	const [packCountry, setPackCountry] = useState('Egypt');
	const [draftText, setDraftText] = useState('');
	const [draftSide, setDraftSide] = useState('in');
	const [draftTime, setDraftTime] = useState(() => formatChatBubbleTime());
	const [shareOpen, setShareOpen] = useState(false);
	const [sharePreview, setSharePreview] = useState('');
	const [shareBusyId, setShareBusyId] = useState('');
	const [pasteTarget, setPasteTarget] = useState('clipboard');
	const [listPasteChatId, setListPasteChatId] = useState('');
	const [syncingAvatars, setSyncingAvatars] = useState(false);
	const didAutoSyncRef = useRef(false);

	const liveChats = useMemo(
		() => (Array.isArray(conversations) ? conversations : []).filter(item => !item?.isArchived),
		[conversations],
	);

	useEffect(() => {
		pasteTargetRef.current = pasteTarget;
	}, [pasteTarget]);

	// Reload when WhatsApp account changes (separate saved studios).
	useEffect(() => {
		const next = loadFakeChatSnapshot(accountId);
		setPersistReady(false);
		setState(next.state);
		setClipboardItems(next.clipboardItems || []);
		setInfoJson(studioInfoToJson(next.state));
		setPackJson(studioChatPackToJson(next.state));
		setMsgsJson(studioMessagesToJson(next.state));
		setListJson(studioListToJson(next.state));
		didAutoSyncRef.current = false;
		const t = window.setTimeout(() => setPersistReady(true), 50);
		return () => window.clearTimeout(t);
	}, [accountId]);

	// Auto-save studio + paste tray (survives refresh).
	useEffect(() => {
		if (!persistReady) return undefined;
		if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
		saveTimerRef.current = window.setTimeout(() => {
			const ok = saveFakeChatSnapshot(accountId, { state, clipboardItems });
			if (!ok) {
				toast.error(
					ar
						? 'تعذر الحفظ المحلي (المساحة ممتلئة)'
						: 'Could not save locally (storage full)',
				);
			}
		}, 350);
		return () => {
			if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
		};
	}, [accountId, ar, clipboardItems, persistReady, state]);

	// Flush immediately on tab close / refresh so the last edit is not lost.
	useEffect(() => {
		const flush = () => {
			if (!persistReady) return;
			saveFakeChatSnapshot(accountId, { state, clipboardItems });
		};
		window.addEventListener('beforeunload', flush);
		window.addEventListener('pagehide', flush);
		return () => {
			window.removeEventListener('beforeunload', flush);
			window.removeEventListener('pagehide', flush);
			flush();
		};
	}, [accountId, clipboardItems, persistReady, state]);

	useEffect(() => {
		ensureIosWaFonts();
		setToneVolume(toneVolumePct / 100);
	}, [toneVolumePct]);

	// Keep live preview at the same 739×1600 mock as capture; CSS-scale when stage is smaller.
	useEffect(() => {
		const stage = stageRef.current;
		if (!stage || typeof ResizeObserver === 'undefined') return undefined;
		const updateScale = () => {
			const pad = 12;
			const availW = Math.max(0, stage.clientWidth - pad);
			const availH = Math.max(0, stage.clientHeight - pad);
			const next = Math.min(1, availW / IPHONE_DEVICE.width, availH / IPHONE_DEVICE.height);
			const safe = Number.isFinite(next) && next > 0.05 ? next : 1;
			setPhoneScale(prev => (Math.abs(prev - safe) < 0.002 ? prev : safe));
		};
		updateScale();
		const ro = new ResizeObserver(updateScale);
		ro.observe(stage);
		return () => ro.disconnect();
	}, []);

	const syncAvatarsFromInbox = useCallback(
		async ({ silent = false, force = false } = {}) => {
			if (!liveChats.length) {
				if (!silent) {
					toast.error(ar ? 'مفيش شاتات محمّلة في التاب' : 'No chats loaded in the Chats tab');
				}
				return;
			}
			setSyncingAvatars(true);
			try {
				const { patches, matched } = await syncListAvatarsFromConversations(
					state.list.chats,
					liveChats,
					{ force },
				);
				if (patches.length) {
					setState(current => ({
						...current,
						list: {
							...current.list,
							chats: current.list.chats.map(chat => {
								const patch = patches.find(item => item.id === chat.id);
								return patch ? { ...chat, ...patch } : chat;
							}),
						},
					}));
				}
				if (!silent) {
					toast.success(
						ar
							? `اتربط ${patches.length} صورة من ${matched} مطابقة`
							: `Linked ${patches.length} photos from ${matched} matches`,
					);
				}
			} catch (error) {
				if (!silent) {
					toast.error(error?.message || (ar ? 'تعذر جلب الصور' : 'Could not sync avatars'));
				}
			} finally {
				setSyncingAvatars(false);
			}
		},
		[ar, liveChats, state.list.chats],
	);

	// Repair broken remote avatars / pixelated stubs left by older sync.
	useEffect(() => {
		const defaultsById = Object.fromEntries(
			createDefaultStudioState().list.chats.map(chat => [chat.id, chat.avatar || '']),
		);
		setState(current => {
			const repaired = repairListAvatarPaths(current.list.chats, defaultsById);
			const selfOk =
				(String(current.list.selfAvatar || '').startsWith('/fake-chat/') ||
					String(current.list.selfAvatar || '').startsWith('data:image')) &&
				!String(current.list.selfAvatar || '').includes('avatar-user') &&
				!String(current.list.selfAvatar || '').includes('avatar-group');
			const nextSelf = selfOk ? current.list.selfAvatar : LIST_AVATARS.youTab;
			const same =
				repaired.every((chat, i) => chat.avatar === current.list.chats[i]?.avatar) &&
				nextSelf === current.list.selfAvatar;
			if (same) return current;
			return {
				...current,
				list: { ...current.list, chats: repaired, selfAvatar: nextSelf },
			};
		});
	}, []);

	// Auto-fill only empty avatars once (never overwrite extracts).
	useEffect(() => {
		if (didAutoSyncRef.current) return undefined;
		if (!liveChats.length) return undefined;
		didAutoSyncRef.current = true;
		void syncAvatarsFromInbox({ silent: true, force: false });
		return undefined;
	}, [liveChats.length, syncAvatarsFromInbox]);

	// Keep status-bar clock live in UI mode only.
	useEffect(() => {
		if (editorMode !== 'ui') return undefined;
		const tick = () => {
			setState(current => ({
				...current,
				status: { ...current.status, time: formatIosStatusTime() },
			}));
		};
		tick();
		const timer = window.setInterval(tick, 30_000);
		return () => window.clearInterval(timer);
	}, [editorMode]);

	useEffect(() => {
		if (editorMode === 'info') {
			setInfoJson(studioInfoToJson(state));
			setJsonError('');
		} else if (editorMode === 'pack') {
			setPackJson(studioChatPackToJson(state));
			setJsonError('');
		} else if (editorMode === 'msgs') {
			if (state.screen === 'list') {
				setListJson(studioListToJson(state));
			} else {
				setMsgsJson(studioMessagesToJson(state));
			}
			setJsonError('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editorMode, state.screen, state.activeChatId]);

	const update = useCallback(patch => {
		setState(current => ({ ...current, ...patch }));
	}, []);

	const updateStatus = useCallback(patch => {
		setState(current => ({ ...current, status: { ...current.status, ...patch } }));
	}, []);

	const updateThread = useCallback(patch => {
		setState(current => ({ ...current, thread: { ...current.thread, ...patch } }));
	}, []);

	const updateActiveChat = useCallback(patch => {
		setState(current => {
			const active = getActiveChat(current);
			if (!active) return current;
			const nextPatch = { ...patch };
			let info = active.info;
			if (patch.info && typeof patch.info === 'object') {
				info = { ...(active.info || {}), ...patch.info };
				delete nextPatch.info;
			}
			// Flat contact-info keys → chat.info
			const infoKeys = [
				'mediaCount',
				'storage',
				'keptMessages',
				'saveToPhotos',
				'disappearing',
				'transcriptLanguage',
				'advancedPrivacy',
				'lockChat',
				'groupsLabel',
			];
			const infoPatch = {};
			for (const key of infoKeys) {
				if (key in nextPatch) {
					infoPatch[key] = nextPatch[key];
					delete nextPatch[key];
				}
			}
			if (Object.keys(infoPatch).length) {
				info = { ...(info || {}), ...infoPatch };
			}
			return {
				...current,
				list: {
					...current.list,
					chats: current.list.chats.map(chat =>
						chat.id === active.id
							? { ...chat, ...nextPatch, ...(info ? { info } : {}) }
							: chat,
					),
				},
			};
		});
	}, []);

	const updateContactInfo = useCallback(patch => {
		updateActiveChat(patch);
	}, [updateActiveChat]);

	const openChat = useCallback(
		chatId => {
			setState(current => {
				const id = chatId || current.activeChatId;
				const chat = (current.list.chats || []).find(item => item.id === id);
				const seeded = Array.isArray(chat?.messages) ? chat.messages : current.thread.messages;
				return {
					...current,
					activeChatId: id,
					screen: 'thread',
					thread: { ...current.thread, messages: seeded },
				};
			});

			const chat = (state.list.chats || []).find(item => item.id === (chatId || state.activeChatId));
			// Never overwrite a crafted Fake Chat script with live WhatsApp history.
			const hasCrafted =
				Array.isArray(chat?.messages) &&
				chat.messages.length > 0 &&
				(Boolean(chat.firstContact) ||
					chat.messages.some(
						m =>
							m?.reply ||
							m?.type === 'voice' ||
							m?.type === 'image' ||
							m?.type === 'ticket' ||
							(typeof m?.text === 'string' && m.text.trim().length > 0),
					));
			if (hasCrafted) return;

			const conversation = matchConversationToChat(chat, liveChats);
			if (!conversation?.id) return;

			void (async () => {
				try {
					const items = await fetchMessages(conversation.id, { limit: 40 });
					const messages = mapLiveMessagesToFake(items, { limit: 40 });
					if (!messages.length) return;
					setState(current => {
						const targetId = chatId || current.activeChatId;
						const existing = (current.list.chats || []).find(item => item.id === targetId);
						// Race: user may have pasted a pack after open — still don't clobber.
						if (Array.isArray(existing?.messages) && existing.messages.length > 0) {
							return current;
						}
						return {
							...current,
							list: {
								...current.list,
								chats: current.list.chats.map(item =>
									item.id === targetId ? { ...item, messages } : item,
								),
							},
							thread:
								current.activeChatId === targetId
									? { ...current.thread, messages }
									: current.thread,
						};
					});
				} catch {
					/* keep seeded recent */
				}
			})();
		},
		[liveChats, state.activeChatId, state.list.chats],
	);

	const openContactInfo = useCallback(() => {
		setState(current => ({ ...current, screen: 'contact' }));
	}, []);

	const closeContactInfo = useCallback(() => {
		setState(current => ({ ...current, screen: 'thread' }));
	}, []);

	const addMessage = useCallback(message => {
		setState(current => {
			const active = getActiveChat(current);
			const nextMsg = { id: nextId('m'), ...message };
			const messages = [...(active?.messages || current.thread.messages || []), nextMsg];
			const listPatch = listFieldsFromMessages(messages);
			if (!active) {
				return {
					...current,
					screen: 'thread',
					thread: { ...current.thread, messages },
				};
			}
			return {
				...current,
				screen: 'thread',
				list: {
					...current.list,
					chats: bumpChatToTop(current.list.chats, active.id, {
						...listPatch,
						messages,
					}),
				},
				thread: { ...current.thread, messages },
			};
		});
	}, []);

	const removeMessage = useCallback(id => {
		setState(current => {
			const active = getActiveChat(current);
			const messages = (active?.messages || current.thread.messages || []).filter(
				item => item.id !== id,
			);
			const listPatch = listFieldsFromMessages(messages);
			if (!active) {
				return {
					...current,
					thread: { ...current.thread, messages },
				};
			}
			return {
				...current,
				list: {
					...current.list,
					chats: bumpChatToTop(current.list.chats, active.id, {
						...listPatch,
						messages,
					}),
				},
				thread: { ...current.thread, messages },
			};
		});
	}, []);

	const updateList = useCallback(patch => {
		setState(current => ({ ...current, list: { ...current.list, ...patch } }));
	}, []);

	const updateListChat = useCallback((id, patch) => {
		setState(current => ({
			...current,
			list: {
				...current.list,
				chats: current.list.chats.map(chat => (chat.id === id ? { ...chat, ...patch } : chat)),
			},
		}));
	}, []);

	const addListChat = useCallback(() => {
		const id = nextId('c');
		const row = {
			id,
			name: 'New chat',
			preview: '',
			time: formatChatBubbleTime(),
			ticks: '',
			avatar: '',
			unread: 0,
			storyRing: false,
			timeGreen: false,
			previewIcon: '',
			metaAi: false,
			whatsapp: false,
			messages: [],
		};
		setState(current => ({
			...current,
			screen: 'list',
			activeChatId: id,
			list: {
				...current.list,
				chats: bumpChatToTop(current.list.chats, id, row),
			},
		}));
	}, []);
	const removeListChat = useCallback(id => {
		setState(current => ({
			...current,
			list: {
				...current.list,
				chats: current.list.chats.filter(chat => chat.id !== id),
			},
		}));
	}, []);

	const applyInfoJson = () => {
		try {
			const next = normalizeInfoState(JSON.parse(infoJson), state);
			setState(next);
			setInfoJson(studioInfoToJson(next));
			setListJson(studioListToJson(next));
			setPackJson(studioChatPackToJson(next));
			setJsonError('');
			toast.success(ar ? 'تم تطبيق Info' : 'Info applied');
		} catch (error) {
			setJsonError(error?.message || 'Invalid JSON');
			toast.error(ar ? 'Info JSON غير صالح' : 'Invalid Info JSON');
		}
	};

	const buildPackTiming = useCallback(() => {
		const n = Math.max(0, Number(packIntervalValue) || 0);
		const interval =
			packIntervalUnit === 'minutes' ? `${n || 1}m` : `${n || 1}s`;
		const timing = {
			interval,
			mode: packTimeMode === 'custom' ? 'custom' : 'now',
			fromNow: packTimeMode !== 'custom',
		};
		if (packTimeMode === 'custom' && packCustomStart) {
			timing.startAt = packCustomStart;
		}
		return timing;
	}, [packCustomStart, packIntervalUnit, packIntervalValue, packTimeMode]);

	const clearPackAutoTimes = () => {
		try {
			const parsed = JSON.parse(packJson);
			const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
			let cleared = 0;
			parsed.messages = messages.map(message => {
				if (!message || !('autoTime' in message)) return message;
				cleared += 1;
				const { autoTime: _autoTime, ...rest } = message;
				return rest;
			});
			setPackJson(JSON.stringify(parsed, null, 2));
			setJsonError('');
			toast.success(
				ar
					? `اتمسح autoTime من ${cleared} رسالة — دوس Apply`
					: `Cleared autoTime on ${cleared} messages — press Apply`,
			);
		} catch (error) {
			setJsonError(error?.message || 'Invalid JSON');
			toast.error(ar ? 'Chat JSON غير صالح' : 'Invalid chat pack JSON');
		}
	};

	const applyChatPack = () => {
		try {
			const parsed = JSON.parse(packJson);
			const timing = buildPackTiming();
			const anchor =
				timing.mode === 'custom' && timing.startAt
					? new Date(timing.startAt)
					: new Date();
			if (timing.mode === 'custom' && Number.isNaN(anchor.getTime())) {
				throw new Error(ar ? 'وقت البداية غير صالح' : 'Invalid start time');
			}
			const { state: next, chatId } = applyChatPackToState(
				{
					...parsed,
					timing: { ...(parsed.timing || {}), ...timing },
					firstContact: packFirstContact,
					country: packFirstContact ? packCountry || parsed.country || 'Egypt' : parsed.country || '',
					showEncryptionNotice: packFirstContact,
					subtitle: packFirstContact
						? 'tap to add to contacts'
						: parsed.subtitle,
					online: packFirstContact ? false : parsed.online,
				},
				state,
				anchor,
			);
			setState(next);
			setPackJson(studioChatPackToJson(next, timing));
			setMsgsJson(studioMessagesToJson(next));
			setListJson(studioListToJson(next));
			setInfoJson(studioInfoToJson(next));
			setJsonError('');
			toast.success(
				ar
					? `اتطبّق الشات · ${chatId} · فاصل ${timing.interval}`
					: `Chat pack applied · ${chatId} · gap ${timing.interval}`,
			);
		} catch (error) {
			setJsonError(error?.message || 'Invalid JSON');
			toast.error(ar ? 'Chat JSON غير صالح' : 'Invalid chat pack JSON');
		}
	};

	const applyMsgsJson = () => {
		try {
			if (state.screen === 'list') {
				const list = normalizeListState(JSON.parse(listJson), state.list);
				setState(current => ({ ...current, list }));
				setListJson(JSON.stringify(list, null, 2));
				setJsonError('');
				toast.success(ar ? 'تم تطبيق قائمة الشاتات' : 'List applied');
				return;
			}
			const messages = normalizeMessages(JSON.parse(msgsJson));
			const listPatch = listFieldsFromMessages(messages);
			let nextSnapshot = null;
			setState(current => {
				const active = getActiveChat(current);
				if (!active) {
					nextSnapshot = { ...current, thread: { ...current.thread, messages } };
					return nextSnapshot;
				}
				nextSnapshot = {
					...current,
					list: {
						...current.list,
						chats: bumpChatToTop(current.list.chats, active.id, {
							...listPatch,
							messages,
						}),
					},
					thread: { ...current.thread, messages },
				};
				return nextSnapshot;
			});
			setMsgsJson(JSON.stringify(messages, null, 2));
			if (nextSnapshot) setPackJson(studioChatPackToJson(nextSnapshot));
			setJsonError('');
			toast.success(ar ? 'تم تطبيق الرسائل · الشات فوق' : 'Messages applied · chat on top');
		} catch (error) {
			setJsonError(error?.message || 'Invalid JSON');
			toast.error(ar ? 'JSON غير صالح' : 'Invalid JSON');
		}
	};

	const pushClipboardImage = useCallback(async file => {
		if (!file?.type?.startsWith('image/')) return '';
		const url = await uploadFakeChatImage(file);
		const path = shortMediaPath(url) || url;
		setClipboardItems(prev => {
			if (prev.some(item => (item.url || item.dataUrl) === path)) return prev;
			return [
				...prev,
				{
					id: nextId('img'),
					url: path,
					name: file.name || 'paste.png',
					createdAt: Date.now(),
				},
			];
		});
		return path;
	}, []);

	const onPickAvatar = async (field, event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setPasteTarget(field);
		try {
			const url = await uploadFakeChatImage(file);
			const path = shortMediaPath(url) || url;
			if (field === 'contactAvatar') {
				updateActiveChat({ avatar: path, metaAi: false, whatsapp: false });
				return;
			}
			if (field === 'selfAvatar') {
				updateList({ selfAvatar: path });
				return;
			}
			updateThread({ [field]: path });
		} catch (error) {
			toast.error(error?.message || (ar ? 'تعذر رفع الصورة' : 'Could not upload image'));
		}
	};

	const onPickListAvatar = async (chatId, event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file || !chatId) return;
		setPasteTarget(`listAvatar:${chatId}`);
		setListPasteChatId(chatId);
		try {
			const url = await uploadFakeChatImage(file);
			updateListChat(chatId, {
				avatar: shortMediaPath(url) || url,
				metaAi: false,
				whatsapp: false,
			});
		} catch (error) {
			toast.error(error?.message || (ar ? 'تعذر رفع الصورة' : 'Could not upload image'));
		}
	};

	const applyPastedImage = useCallback(
		async file => {
			if (!file) return;
			const target = pasteTargetRef.current || 'clipboard';
			try {
				const path = await pushClipboardImage(file);
				if (!path) return;
				const link = absoluteMediaLink(path) || path;
				try {
					await navigator.clipboard.writeText(path);
				} catch {
					/* ignore — toast still shows the path */
				}
				if (!target || target === 'clipboard') {
					toast.success(ar ? `اترفعت · ${path}` : `Uploaded · ${path}`);
					return;
				}
				if (target === 'message') {
					addMessage({
						side: draftSide,
						type: 'image',
						src: path,
						caption: '',
						time: draftTime || formatChatBubbleTime(),
						ticks: 'read',
					});
					toast.success(ar ? `صورة في الشات · ${path}` : `Image → chat · ${path}`);
					return;
				}
				if (String(target).startsWith('listAvatar:')) {
					const chatId = String(target).slice('listAvatar:'.length);
					updateListChat(chatId, { avatar: path, metaAi: false, whatsapp: false });
					toast.success(ar ? `أفاتار · ${path}` : `Avatar · ${path}`);
					return;
				}
				if (target === 'contactAvatar') {
					updateActiveChat({ avatar: path, metaAi: false, whatsapp: false });
					toast.success(ar ? `جهة · ${path}` : `Contact · ${path}`);
					return;
				}
				if (target === 'selfAvatar') {
					updateList({ selfAvatar: path });
					toast.success(ar ? `صورتي · ${path}` : `Me · ${path}`);
					return;
				}
				if (target === 'wallpaper') {
					updateThread({ wallpaper: path });
					toast.success(ar ? `خلفية · ${path}` : `Wallpaper · ${path}`);
					return;
				}
				toast.success(ar ? `اترفعت · ${link}` : `Uploaded · ${link}`);
			} catch (error) {
				toast.error(error?.message || (ar ? 'تعذر رفع الصورة' : 'Could not upload image'));
			}
		},
		[
			addMessage,
			ar,
			draftSide,
			draftTime,
			pushClipboardImage,
			updateActiveChat,
			updateList,
			updateListChat,
			updateThread,
		],
	);

	useEffect(() => {
		const onPaste = event => {
			const file = clipboardImageFile(event.clipboardData);
			if (!file) return;

			const active = document.activeElement;
			const typingText =
				active &&
				(active.tagName === 'TEXTAREA' ||
					(active.tagName === 'INPUT' &&
						!['file', 'checkbox', 'radio', 'button'].includes(active.type || '')));

			// Don't hijack JSON text editing.
			if (typingText && (editorMode === 'info' || editorMode === 'msgs' || editorMode === 'pack')) {
				return;
			}

			event.preventDefault();
			void applyPastedImage(file);
		};

		window.addEventListener('paste', onPaste);
		return () => window.removeEventListener('paste', onPaste);
	}, [applyPastedImage, editorMode]);

	const onAddTicketOrImage = async (type, event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setPasteTarget('message');
		try {
			const url = await uploadFakeChatImage(file);
			const path = shortMediaPath(url) || url;
			addMessage({
				side: draftSide,
				type,
				src: path,
				caption: '',
				time: draftTime || formatChatBubbleTime(),
				ticks: 'read',
			});
			toast.success(ar ? `اترفعت · ${path}` : `Uploaded · ${path}`);
		} catch (error) {
			toast.error(error?.message || (ar ? 'تعذر رفع الصورة' : 'Could not upload image'));
		}
	};

	const onAddText = () => {
		const text = draftText.trim();
		if (!text) {
			toast.error(ar ? 'اكتب رسالة أولاً' : 'Write a message first');
			return;
		}
		addMessage({
			side: draftSide,
			type: 'text',
			text,
			time: draftTime || formatChatBubbleTime(),
			ticks: 'read',
		});
		setDraftText('');
	};

	const onAddVoice = () => {
		addMessage({
			side: 'out',
			type: 'voice',
			duration: '0:03',
			time: draftTime || formatChatBubbleTime(),
			ticks: 'read',
		});
	};

	const openShareFromCapture = async ({ download = false } = {}) => {
		if (!screenRef.current && !phoneRef.current) return;
		setCapturing(true);
		const phoneShell = phoneRef.current;
		const prevTransform = phoneShell?.style?.transform;
		try {
			const stamp = formatIosStatusTime();
			setState(current => ({
				...current,
				status: { ...current.status, time: stamp },
			}));
			// Capture at full mock size (ignore stage fit-scale) — screen only, no chassis.
			if (phoneShell) phoneShell.style.transform = 'none';
			await new Promise(r => window.requestAnimationFrame(() => r()));
			await new Promise(r => window.setTimeout(r, 280));
			const screen = screenRef.current || phoneShell;
			if (!screen) throw new Error(ar ? 'مفيش فريم للتصوير' : 'Phone frame not found');
			// Preview uses rounded-[34px]; strip before paint so PNG is rectangular.
			screen.style.borderRadius = '0px';
			screen.style.overflow = 'hidden';
			await new Promise(r => window.requestAnimationFrame(() => r()));
			const fileName = `whatsapp-${state.screen}-${stamp.replace(':', '-')}.png`;
			const dataUrl = await captureNodeAsPng(screen, {
				fileName,
				download,
				width: IPHONE_XR.width,
				height: IPHONE_XR.height,
			});
			if (!dataUrl || dataUrl.length < 100) {
				throw new Error(ar ? 'الصورة طلعت فاضية' : 'Empty screenshot');
			}
			setSharePreview(dataUrl);
			setShareOpen(true);
			if (download) toast.success(ar ? 'تم التحميل' : 'Downloaded');
		} catch (error) {
			console.error('[fake-chat capture]', error);
			toast.error(error?.message || (ar ? 'فشل التصوير' : 'Capture failed'));
		} finally {
			const screen = screenRef.current;
			if (screen) {
				screen.style.borderRadius = '';
				screen.style.overflow = '';
			}
			if (phoneShell && prevTransform !== undefined) phoneShell.style.transform = prevTransform;
			setCapturing(false);
		}
	};

	const shareToChat = async conversation => {
		if (!accountId || !conversation?.id || !sharePreview) {
			toast.error(ar ? 'اختَر حساب واتساب متصل' : 'Connect a WhatsApp account first');
			return;
		}
		setShareBusyId(conversation.id);
		try {
			const file = dataUrlToFile(
				sharePreview,
				`fake-chat-${formatIosStatusTime().replace(':', '-')}.png`,
			);
			const form = new FormData();
			form.append('file', file);
			const { data: uploaded } = await api.post(`/whatsapp/accounts/${accountId}/media`, form, {
				maxBodyLength: Infinity,
				maxContentLength: Infinity,
			});
			await api.post(`/whatsapp/conversations/${conversation.id}/messages`, {
				type: 'image',
				fileId: uploaded.fileId,
				caption: undefined,
				clientMessageId: `fake-chat:${Date.now()}`,
			});
			toast.success(ar ? 'اتبعتت في الشات' : 'Sent to chat');
			setShareOpen(false);
		} catch (error) {
			toast.error(error?.response?.data?.message || (ar ? 'تعذر الإرسال' : 'Could not send'));
		} finally {
			setShareBusyId('');
		}
	};

	const resetStudio = () => {
		const next = createDefaultStudioState();
		didAutoSyncRef.current = false;
		toneStopRef.current = true;
		if (toneTimerRef.current) {
			window.clearTimeout(toneTimerRef.current);
			toneTimerRef.current = null;
		}
		setToneRunning(false);
		setTonePlayed(0);
		setToneError('');
		setState(next);
		setClipboardItems([]);
		setInfoJson(studioInfoToJson(next));
		setMsgsJson(studioMessagesToJson(next));
		setListJson(studioListToJson(next));
		setPackJson(studioChatPackToJson(next));
		setDraftTime(formatChatBubbleTime());
		setJsonError('');
		clearFakeChatSnapshot(accountId);
		saveFakeChatSnapshot(accountId, { state: next, clipboardItems: [] });
		toast.success(ar ? 'اتعمل Reset واتمسح الحفظ المحلي' : 'Reset · local save cleared');
	};

	const bumpUnreadForArrival = useCallback(() => {
		if (!bumpUnreadOnTone) return;
		setState(current => {
			const id = current.activeChatId;
			const chats = (current.list.chats || []).map(chat =>
				chat.id === id ? { ...chat, unread: Math.max(0, Number(chat.unread) || 0) + 1 } : chat,
			);
			const tabBadge = Math.max(0, Number(current.list.unreadBadge) || 0) + 1;
			return {
				...current,
				list: { ...current.list, chats, unreadBadge: tabBadge },
			};
		});
	}, [bumpUnreadOnTone]);

	const stopToneLoop = useCallback(() => {
		toneStopRef.current = true;
		if (toneTimerRef.current) {
			window.clearTimeout(toneTimerRef.current);
			toneTimerRef.current = null;
		}
		setToneRunning(false);
	}, []);

	const playOneTone = useCallback(async () => {
		setToneError('');
		try {
			await playWhatsAppTone(toneId, { volume: toneVolumePct / 100 });
			bumpUnreadForArrival();
			setTonePlayed(n => n + 1);
		} catch (error) {
			const msg = error?.message || (ar ? 'تعذر تشغيل النغمة' : 'Could not play tone');
			setToneError(msg);
			toast.error(msg);
			throw error;
		}
	}, [ar, bumpUnreadForArrival, toneId, toneVolumePct]);

	const previewToneOnce = useCallback(async () => {
		stopToneLoop();
		try {
			await playOneTone();
		} catch {
			/* toast already shown */
		}
	}, [playOneTone, stopToneLoop]);

	const startToneLoop = useCallback(async () => {
		stopToneLoop();
		toneStopRef.current = false;
		setTonePlayed(0);
		setToneRunning(true);
		setToneError('');

		const maxPlays = Math.max(0, Number(toneRepeatCount) || 0); // 0 = infinite
		const gapMs = intervalToMs(toneIntervalValue, toneIntervalUnit);
		let plays = 0;

		const tick = async () => {
			if (toneStopRef.current) return;
			try {
				await playWhatsAppTone(toneId, { volume: toneVolumePct / 100 });
				if (toneStopRef.current) return;
				bumpUnreadForArrival();
				plays += 1;
				setTonePlayed(plays);
				if (maxPlays > 0 && plays >= maxPlays) {
					setToneRunning(false);
					return;
				}
				toneTimerRef.current = window.setTimeout(() => {
					void tick();
				}, gapMs);
			} catch (error) {
				const msg = error?.message || (ar ? 'تعذر تشغيل النغمة' : 'Could not play tone');
				setToneError(msg);
				toast.error(msg);
				setToneRunning(false);
			}
		};

		void tick();
	}, [
		ar,
		bumpUnreadForArrival,
		stopToneLoop,
		toneId,
		toneIntervalUnit,
		toneIntervalValue,
		toneRepeatCount,
		toneVolumePct,
	]);

	useEffect(() => {
		return () => {
			toneStopRef.current = true;
			if (toneTimerRef.current) window.clearTimeout(toneTimerRef.current);
		};
	}, []);

	const activeChat = useMemo(() => getActiveChat(state), [state]);
	const threadView = useMemo(() => resolveThreadView(state), [state]);

	useEffect(() => {
		setPackFirstContact(Boolean(activeChat?.firstContact));
		if (activeChat?.country) setPackCountry(activeChat.country);
	}, [activeChat?.id, activeChat?.firstContact, activeChat?.country]);

	const t = {
		title: ar ? 'شات وهمي' : 'Fake chat',
		list: ar ? 'قائمة' : 'List',
		thread: ar ? 'شات' : 'Chat',
		contactScreen: ar ? 'معلومات' : 'Info',
		status: ar ? 'الحالة' : 'Status',
		time: ar ? 'الوقت' : 'Time',
		battery: ar ? 'بطارية' : 'Battery',
		charging: ar ? 'شحن' : 'Charging',
		contact: ar ? 'الجهة' : 'Contact',
		contactPhone: ar ? 'رقم الهاتف' : 'Phone',
		contactAbout: ar ? 'الاسم (~)' : 'About (~)',
		messages: ar ? 'رسائل' : 'Messages',
		infoJson: ar ? 'معلومات' : 'Info',
		packJson: ar ? 'شات' : 'Chat',
		msgsJson: state.screen === 'list' ? (ar ? 'قائمة' : 'List') : ar ? 'رسائل' : 'Msgs',
		listChats: ar ? 'شاتات القائمة' : 'List chats',
		ui: 'UI',
		apply: ar ? 'تطبيق' : 'Apply',
		screenshot: ar ? 'سكرين شوت' : 'Screenshot',
		reset: ar ? 'ريست' : 'Reset',
		incoming: ar ? 'وارد' : 'In',
		outgoing: ar ? 'صادر' : 'Out',
		backBadge: ar ? 'رقم الرجوع' : 'Back badge',
		subtitle: ar ? 'تحت الاسم' : 'Subtitle',
		unreadBadge: ar ? 'بادج التاب' : 'Tab badge',
		addChat: ar ? 'شات جديد' : 'Add chat',
		syncAvatars: ar ? 'صور من الشاتات' : 'Photos from Chats',
		openContact: ar ? 'افتح معلومات الجهة' : 'Open contact info',
		activeChat: ar ? 'الشات النشط (مصدر الاسم/الصورة)' : 'Active chat (name/avatar source)',
		sound: ar ? 'نغمة' : 'Sound',
		soundTitle: ar ? 'نغمة وصول الرسالة' : 'Message arrival tone',
		soundHint: ar
			? 'شغّل نغمة واتساب قدام حد عشان يبان إن رسالة وصلت. تقدر تكررها كل ثواني أو دقايق.'
			: 'Play a WhatsApp-style tone so it looks like a message just arrived. Repeat every few seconds or minutes.',
		tonePick: ar ? 'النغمة' : 'Tone',
		intervalEvery: ar ? 'كرر كل' : 'Repeat every',
		seconds: ar ? 'ثانية' : 'Seconds',
		minutes: ar ? 'دقيقة' : 'Minutes',
		repeatTimes: ar ? 'عدد المرات' : 'Times',
		repeatInfinite: ar ? '∞ مستمر' : '∞ Loop',
		previewTone: ar ? 'تجربة مرة' : 'Preview once',
		startTone: ar ? 'تشغيل' : 'Start',
		stopTone: ar ? 'إيقاف' : 'Stop',
		toneRunningLabel: ar ? 'شغّالة' : 'Running',
		toneVolume: ar ? 'مستوى الصوت' : 'Volume',
		bumpUnread: ar ? 'زود الـ unread مع كل نغمة' : 'Bump unread with each tone',
		openThisChat: ar ? 'افتح' : 'Open',
		pasteHint: ar
			? 'Ctrl+V يرفع الصورة على السيرفر ويعطيك لينك قصير /uploads/… للصق في الـ JSON'
			: 'Ctrl+V uploads to server and copies a short /uploads/… link for JSON',
	};

	return (
		<div className={tw.studio} ref={studioRef}>
			<aside className={tw.panel} data-no-capture="true">
				<div>
					<h2 className={tw.headTitle}>{t.title}</h2>
					<p className={tw.headSub}>{ar ? 'iPhone XR · صوّر وشارك' : 'iPhone XR · capture & share'}</p>
				</div>

				<div className={tw.seg3}>
					<button
						type="button"
						className={segBtn(state.screen === 'list')}
						onClick={() => update({ screen: 'list' })}
					>
						{t.list}
					</button>
					<button
						type="button"
						className={segBtn(state.screen === 'thread')}
						onClick={() => update({ screen: 'thread' })}
					>
						{t.thread}
					</button>
					<button
						type="button"
						className={segBtn(state.screen === 'contact')}
						onClick={() => update({ screen: 'contact' })}
					>
						{t.contactScreen}
					</button>
				</div>

				<div className={tw.seg5}>
					<button
						type="button"
						className={segBtn(editorMode === 'ui')}
						onClick={() => setEditorMode('ui')}
					>
						<LayoutList size={12} />
						{t.ui}
					</button>
					<button
						type="button"
						className={segBtn(editorMode === 'pack')}
						onClick={() => setEditorMode('pack')}
					>
						<Braces size={12} />
						{t.packJson}
					</button>
					<button
						type="button"
						className={segBtn(editorMode === 'info')}
						onClick={() => setEditorMode('info')}
					>
						<Braces size={12} />
						{t.infoJson}
					</button>
					<button
						type="button"
						className={segBtn(editorMode === 'msgs')}
						onClick={() => setEditorMode('msgs')}
					>
						<Braces size={12} />
						{t.msgsJson}
					</button>
					<button
						type="button"
						className={segBtn(editorMode === 'sound')}
						onClick={() => setEditorMode('sound')}
					>
						<Bell size={12} />
						{t.sound}
					</button>
				</div>

				<ClipboardTray
					ar={ar}
					items={clipboardItems}
					onChange={setClipboardItems}
					onUseAs={(dataUrl, kind) => {
						if (kind === 'contactAvatar') {
							updateActiveChat({ avatar: dataUrl, metaAi: false, whatsapp: false });
							toast.success(ar ? 'اتحطت صورة الجهة' : 'Set as contact avatar');
						}
					}}
				/>

				<div className={tw.panelScroll}>
					{editorMode === 'pack' ? (
						<section className={tw.card}>
							<h3 className={tw.cardH3}>
								{ar ? 'شات كامل (JSON واحد)' : 'Full chat pack (one JSON)'}
							</h3>
							<p className={tw.hint}>
								{ar
									? 'اسم · صورة · أونلاين · رسائل · توقيت ديناميك من اللوحة تحت'
									: 'Name · avatar · online · messages · timing from the panel below'}
							</p>

							<div className={tw.timingBox}>
								<label className={tw.timingCheck}>
									<input
										type="checkbox"
										checked={packFirstContact}
										onChange={e => setPackFirstContact(e.target.checked)}
									/>
									<span>
										{ar
											? 'أول مرة أتكلم معاه (مش محفوظ في جهات الاتصال)'
											: 'First time chat (not in contacts)'}
									</span>
								</label>
								{packFirstContact ? (
									<>
										<label className={tw.timingLabel}>
											<span>{ar ? 'الدولة (Phone number from …)' : 'Country (Phone number from …)'}</span>
											<input
												className={tw.input}
												value={packCountry}
												onChange={e => setPackCountry(e.target.value)}
												placeholder="Egypt"
											/>
										</label>
										<p className={tw.timingHint}>
											{ar
												? 'هيظهر كارت الرقم + Block / Add + رسالة التشفير، والهيدر: tap to add to contacts. استخدم phone و about (~Sama) في الـ JSON.'
												: 'Shows the number card + Block/Add + encryption notice. Header: tap to add to contacts. Use phone + about (~Sama) in JSON.'}
										</p>
									</>
								) : null}
							</div>

							<div className={tw.timingBox}>
								<p className={tw.timingHint}>
									{ar
										? '"time" = أنت، والنظام مش بيغيّره. رسالة جديدة من غير time ولا autoTime → النظام يحط "autoTime" مرة واحدة ومش بيرجع يعدّله. العرض = time أو autoTime.'
										: '"time" = yours, never changed. A new message with no time/autoTime gets "autoTime" once and it is never recalculated. Display = time || autoTime.'}
								</p>
								<button type="button" className={tw.fileBtn} onClick={clearPackAutoTimes}>
									{ar
										? 'امسح autoTime من الـ JSON (عشان يتحسب بالفاصل الجديد)'
										: 'Clear autoTime in JSON (recalculate with new gap)'}
								</button>

								<div className={tw.timingRow}>
									<label className={tw.timingLabel}>
										<span>{ar ? 'الفرق بين كل رسالة' : 'Gap between messages'}</span>
										<input
											className={tw.input}
											type="number"
											min={0}
											step={1}
											value={packIntervalValue}
											onChange={e => setPackIntervalValue(e.target.value)}
										/>
									</label>
									<label className={tw.timingLabel}>
										<span>{ar ? 'الوحدة' : 'Unit'}</span>
										<select
											className={tw.timingSelect}
											value={packIntervalUnit}
											onChange={e => setPackIntervalUnit(e.target.value)}
										>
											<option value="seconds">{ar ? 'ثواني' : 'Seconds'}</option>
											<option value="minutes">{ar ? 'دقايق' : 'Minutes'}</option>
										</select>
									</label>
								</div>

								<div className={tw.timingRow}>
									<label className={tw.timingLabel}>
										<span>{ar ? 'آخر رسالة تبدأ من' : 'Last message starts from'}</span>
										<select
											className={tw.timingSelect}
											value={packTimeMode}
											onChange={e => setPackTimeMode(e.target.value)}
										>
											<option value="now">{ar ? 'دلوقتي (الوقت الحالي)' : 'Now (current time)'}</option>
											<option value="custom">{ar ? 'وقت مخصص' : 'Custom date/time'}</option>
										</select>
									</label>
									{packTimeMode === 'custom' ? (
										<label className={tw.timingLabel}>
											<span>{ar ? 'وقت البداية' : 'Start at'}</span>
											<input
												className={tw.input}
												type="datetime-local"
												value={packCustomStart}
												onChange={e => setPackCustomStart(e.target.value)}
											/>
										</label>
									) : null}
								</div>

								<p className={tw.timingHint}>
									{ar
										? 'آخر رسالة = وقت البداية، واللي قبلها = ناقص الفرق. مثال: 5 ثواني → كل رسالة أقدم بـ 5 ثواني.'
										: 'Last message = start time; each earlier message subtracts the gap. Example: 5s → each prior message is 5 seconds earlier.'}
								</p>
							</div>

							<textarea
								className={tw.json}
								rows={16}
								value={packJson}
								onChange={e => setPackJson(e.target.value)}
								spellCheck={false}
							/>
							{jsonError ? <p className={tw.err}>{jsonError}</p> : null}
							<details className={tw.help}>
								<summary>{ar ? 'شكل الـ Chat pack' : 'Chat pack shape'}</summary>
								<pre className={tw.helpPre}>{CHAT_PACK_HELP}</pre>
							</details>
							<button
								type="button"
								className={cn(tw.fileBtn, tw.btnAccent)}
								onClick={applyChatPack}
							>
								{t.apply}
							</button>
						</section>
					) : null}

					{editorMode === 'info' ? (
						<section className={tw.card}>
							<h3 className={tw.cardH3}>{ar ? 'JSON المعلومات' : 'Info JSON'}</h3>
							<textarea
								className={tw.json}
								rows={18}
								value={infoJson}
								onChange={e => setInfoJson(e.target.value)}
								spellCheck={false}
							/>
							{jsonError ? <p className={tw.err}>{jsonError}</p> : null}
							<details className={tw.help}>
								<summary>{ar ? 'شكل Info' : 'Info shape'}</summary>
								<pre className={tw.helpPre}>{INFO_JSON_HELP}</pre>
							</details>
							<button
								type="button"
								className={cn(tw.fileBtn, tw.btnAccent)}
								onClick={applyInfoJson}
							>
								{t.apply}
							</button>
						</section>
					) : null}

					{editorMode === 'msgs' ? (
						<section className={tw.card}>
							<h3 className={tw.cardH3}>
								{state.screen === 'list'
									? ar
										? 'JSON قائمة الشاتات'
										: 'List chats JSON'
									: ar
										? 'JSON الرسائل'
										: 'Messages JSON'}
							</h3>
							<textarea
								className={tw.json}
								rows={18}
								value={state.screen === 'list' ? listJson : msgsJson}
								onChange={e =>
									state.screen === 'list'
										? setListJson(e.target.value)
										: setMsgsJson(e.target.value)
								}
								spellCheck={false}
							/>
							{jsonError ? <p className={tw.err}>{jsonError}</p> : null}
							<details className={tw.help}>
								<summary>
									{state.screen === 'list'
										? ar
											? 'شكل القائمة'
											: 'List shape'
										: ar
											? 'شكل الرسائل'
											: 'Messages shape'}
								</summary>
								<pre className={tw.helpPre}>{state.screen === 'list' ? LIST_JSON_HELP : MESSAGES_JSON_HELP}</pre>
							</details>
							<button
								type="button"
								className={cn(tw.fileBtn, tw.btnAccent)}
								onClick={applyMsgsJson}
							>
								{t.apply}
							</button>
						</section>
					) : null}

					{editorMode === 'sound' ? (
						<section className={tw.card}>
							<div className={tw.cardHead}>
								<h3 className={tw.cardH3}>{t.soundTitle}</h3>
								{toneRunning ? (
									<span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1dab61]">
										<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1dab61]" />
										{t.toneRunningLabel} · {tonePlayed}
										{Number(toneRepeatCount) > 0 ? `/${toneRepeatCount}` : ''}
									</span>
								) : null}
							</div>
							<p className={tw.hint}>{t.soundHint}</p>

							<label className={tw.label}>
								{t.tonePick}
								<select
									className={tw.input}
									value={toneId}
									disabled={toneRunning}
									onChange={e => setToneId(e.target.value)}
								>
									{WHATSAPP_MESSAGE_TONES.map(tone => (
										<option key={tone.id} value={tone.id}>
											{ar ? tone.labelAr : tone.label}
										</option>
									))}
								</select>
							</label>

							<div className={tw.grid2}>
								<label className={tw.label}>
									{t.intervalEvery}
									<input
										className={tw.input}
										type="number"
										min={1}
										max={999}
										value={toneIntervalValue}
										disabled={toneRunning}
										onChange={e =>
											setToneIntervalValue(Math.max(1, Number(e.target.value) || 1))
										}
									/>
								</label>
								<label className={tw.label}>
									{ar ? 'الوحدة' : 'Unit'}
									<select
										className={tw.input}
										value={toneIntervalUnit}
										disabled={toneRunning}
										onChange={e => setToneIntervalUnit(e.target.value)}
									>
										<option value="seconds">{t.seconds}</option>
										<option value="minutes">{t.minutes}</option>
									</select>
								</label>
							</div>

							<label className={tw.label}>
								{t.repeatTimes}
								<input
									className={tw.input}
									type="number"
									min={0}
									max={999}
									value={toneRepeatCount}
									disabled={toneRunning}
									onChange={e =>
										setToneRepeatCount(Math.max(0, Number(e.target.value) || 0))
									}
								/>
								<span className={tw.hint}>
									{Number(toneRepeatCount) === 0
										? t.repeatInfinite
										: ar
											? `${toneRepeatCount} مرة · كل ${toneIntervalValue} ${
													toneIntervalUnit === 'minutes' ? 'دقيقة' : 'ثانية'
												}`
											: `${toneRepeatCount}× every ${toneIntervalValue} ${toneIntervalUnit}`}
								</span>
							</label>

							<label className={tw.label}>
								{t.toneVolume}
								<div className="flex items-center gap-2">
									<input
										className="h-2 w-full accent-[#1dab61]"
										type="range"
										min={10}
										max={100}
										step={5}
										value={toneVolumePct}
										onChange={e => setToneVolumePct(Number(e.target.value) || 10)}
									/>
									<span className="w-9 shrink-0 text-end text-[11px] font-bold text-[#111b21]">
										{toneVolumePct}%
									</span>
								</div>
							</label>

							<label className={cn(tw.check, tw.label)}>
								<input
									type="checkbox"
									checked={bumpUnreadOnTone}
									disabled={toneRunning}
									onChange={e => setBumpUnreadOnTone(e.target.checked)}
								/>
								{t.bumpUnread}
							</label>

							{toneError ? <p className={tw.err}>{toneError}</p> : null}

							<div className={tw.rowBtns}>
								<button
									type="button"
									className={tw.fileBtn}
									disabled={toneRunning}
									onClick={() => void previewToneOnce()}
								>
									<Volume2 size={13} />
									{t.previewTone}
								</button>
								{toneRunning ? (
									<button
										type="button"
										className={cn(tw.fileBtn, 'border-[#f5c2c7] bg-[#fde8ea] text-[#b42318]')}
										onClick={stopToneLoop}
									>
										<Square size={12} />
										{t.stopTone}
									</button>
								) : (
									<button
										type="button"
										className={cn(tw.fileBtn, tw.btnAccent)}
										onClick={() => void startToneLoop()}
									>
										<Play size={13} />
										{t.startTone}
									</button>
								)}
							</div>
						</section>
					) : null}

					{editorMode === 'ui' ? (
						<>
							<section className={tw.card}>
								<h3 className={tw.cardH3}>{t.status}</h3>
								<div className={tw.grid2}>
									<label>
										<span>{t.time}</span>
										<input
											value={state.status.time}
											onChange={e => updateStatus({ time: e.target.value })}
										/>
									</label>
									<label>
										<span>{t.battery}</span>
										<input
											type="number"
											min={1}
											max={100}
											value={state.status.battery}
											onChange={e => updateStatus({ battery: Number(e.target.value) || 0 })}
										/>
									</label>
								</div>
								<label className={tw.check}>
									<input
										type="checkbox"
										checked={Boolean(state.status.charging)}
										onChange={e => updateStatus({ charging: e.target.checked })}
									/>
									<span>{t.charging}</span>
								</label>
							</section>

							{state.screen === 'list' ? (
								<section className={tw.card}>
									<div className={tw.cardHead}>
										<h3 className={tw.cardH3}>{t.listChats}</h3>
										<div className={tw.rowBtns}>
											<button
												type="button"
												className={cn(tw.fileBtn, tw.btnAccent)}
												disabled={syncingAvatars || !liveChats.length}
												onClick={() => void syncAvatarsFromInbox({ force: true })}
											>
												{syncingAvatars ? (
													<Loader2 size={12} className="animate-spin" />
												) : (
													<RefreshCw size={12} />
												)}
												{t.syncAvatars}
											</button>
											<button type="button" className={tw.fileBtn} onClick={addListChat}>
												<Plus size={12} />
												{t.addChat}
											</button>
										</div>
									</div>
									<p className={tw.hint}>
										{ar
											? 'بيطابق الأسامي/الأرقام مع تاب الشاتات ويجيب الصورة الحقيقية.'
											: 'Matches names/phones with the Chats tab and pulls real profile photos.'}
									</p>
									<div className={tw.stack}>
										<input
											className={tw.full}
											value={state.list.title}
											onChange={e => updateList({ title: e.target.value })}
											placeholder="Chats"
										/>
										<input
											className={tw.full}
											value={state.list.searchPlaceholder}
											onChange={e => updateList({ searchPlaceholder: e.target.value })}
											placeholder="Ask Meta AI or Search"
										/>
										<input
											className={tw.full}
											type="number"
											min={0}
											value={state.list.unreadBadge}
											onChange={e => updateList({ unreadBadge: Number(e.target.value) || 0 })}
											placeholder={t.unreadBadge}
										/>
										<input
											className={tw.full}
											type="number"
											min={0}
											value={state.list.callsBadge || 0}
											onChange={e => updateList({ callsBadge: Number(e.target.value) || 0 })}
											placeholder={ar ? 'بادج المكالمات' : 'Calls badge'}
										/>
										<label className={tw.check}>
											<input
												type="checkbox"
												checked={Boolean(state.list.showSearch)}
												onChange={e => updateList({ showSearch: e.target.checked })}
											/>
											<span>{ar ? 'شريط البحث' : 'Show search'}</span>
										</label>
										<label className={tw.check}>
											<input
												type="checkbox"
												checked={Boolean(state.list.showSuggestions)}
												onChange={e => updateList({ showSuggestions: e.target.checked })}
											/>
											<span>{ar ? 'اقتراحات Start chatting' : 'Show suggestions'}</span>
										</label>
										<label className={tw.check}>
											<input
												type="checkbox"
												checked={Boolean(state.list.hidePhoneNumbers)}
												onChange={e => updateList({ hidePhoneNumbers: e.target.checked })}
											/>
											<span>
												{ar
													? 'إخفاء الرقم → عرض الـ username (~)'
													: 'Hide phone → show username (~)'}
											</span>
										</label>
									</div>
									<p className={tw.hint}>{t.pasteHint}</p>
									<ul className={tw.listChats}>
										{state.list.chats.map(chat => (
											<li
												key={chat.id}
												className={cn(
													tw.listChatItem,
													state.activeChatId === chat.id && tw.listChatItemPaste,
													(listPasteChatId === chat.id ||
														pasteTarget === `listAvatar:${chat.id}`) &&
														tw.listChatItemPaste,
												)}
											>
												<div className={tw.listChatHead}>
													<label
														className={fileBtn(pasteTarget === `listAvatar:${chat.id}`)}
														onClick={() => {
															setPasteTarget(`listAvatar:${chat.id}`);
															setListPasteChatId(chat.id);
														}}
													>
														<input
															className={tw.fileInputHidden}
															type="file"
															accept="image/*"
															onChange={e => onPickListAvatar(chat.id, e)}
														/>
														<ImagePlus size={12} />
														{ar ? 'صورة' : 'Img'}
													</label>
													<button
														type="button"
														className={cn(tw.fileBtn, state.activeChatId === chat.id && tw.btnAccent)}
														onClick={() => openChat(chat.id)}
													>
														{t.openThisChat}
													</button>
													<button type="button" className={tw.listChatDelete} onClick={() => removeListChat(chat.id)}>
														<Trash2 size={12} />
													</button>
												</div>
												<input
													className={tw.full}
													value={chat.name}
													onChange={e => updateListChat(chat.id, { name: e.target.value })}
													placeholder="Name"
												/>
												<input
													className={tw.full}
													value={chat.phone || ''}
													onChange={e => updateListChat(chat.id, { phone: e.target.value })}
													placeholder={t.contactPhone}
												/>
												<input
													className={tw.full}
													value={chat.about || ''}
													onChange={e => updateListChat(chat.id, { about: e.target.value })}
													placeholder={t.contactAbout}
												/>
												<input
													className={tw.full}
													value={chat.preview}
													onChange={e => updateListChat(chat.id, { preview: e.target.value })}
													placeholder="Preview"
													dir="auto"
												/>
												<div className={tw.grid2}>
													<input
														className={tw.full}
														value={chat.time}
														onChange={e => updateListChat(chat.id, { time: e.target.value })}
														placeholder="Time"
													/>
													<input
														className={tw.full}
														type="number"
														min={0}
														value={chat.unread}
														onChange={e =>
															updateListChat(chat.id, { unread: Number(e.target.value) || 0 })
														}
														placeholder="Unread"
													/>
												</div>
												<select
													className={tw.full}
													value={chat.ticks || ''}
													onChange={e => updateListChat(chat.id, { ticks: e.target.value })}
												>
													<option value="">No ticks</option>
													<option value="sent">Sent</option>
													<option value="delivered">Delivered</option>
													<option value="read">Read</option>
												</select>
												<div className={tw.rowBtns}>
													<label className={tw.check}>
														<input
															type="checkbox"
															checked={Boolean(chat.pinned)}
															onChange={e => updateListChat(chat.id, { pinned: e.target.checked })}
														/>
														Pin
													</label>
													<label className={tw.check}>
														<input
															type="checkbox"
															checked={Boolean(chat.muted)}
															onChange={e => updateListChat(chat.id, { muted: e.target.checked })}
														/>
														Mute
													</label>
													<label className={tw.check}>
														<input
															type="checkbox"
															checked={Boolean(chat.timeGreen)}
															onChange={e => updateListChat(chat.id, { timeGreen: e.target.checked })}
														/>
														Green
													</label>
												</div>
											</li>
										))}
									</ul>
								</section>
							) : null}

							{state.screen === 'thread' || state.screen === 'contact' ? (
								<>
									<section className={tw.card}>
										<h3 className={tw.cardH3}>{t.activeChat}</h3>
										<p className={tw.hint}>
											{ar
												? 'الاسم والصورة والرقم من الليستة — تعديل واحد يكفي للشات وللإنفو.'
												: 'Name / avatar / phone come from the list chat — edit once for chat + info.'}
										</p>
										<div className={tw.stack}>
											<input
												className={tw.full}
												value={activeChat?.name || ''}
												onChange={e => updateActiveChat({ name: e.target.value })}
												placeholder={t.contact}
											/>
											<input
												className={tw.full}
												value={activeChat?.phone || ''}
												onChange={e => updateActiveChat({ phone: e.target.value })}
												placeholder={t.contactPhone}
											/>
											<input
												className={tw.full}
												value={activeChat?.about || ''}
												onChange={e => updateActiveChat({ about: e.target.value })}
												placeholder={t.contactAbout}
											/>
											<input
												className={tw.full}
												value={state.list.unreadBadge || ''}
												onChange={e => updateList({ unreadBadge: Number(e.target.value) || 0 })}
												placeholder={t.unreadBadge}
											/>
											<input
												className={tw.full}
												value={activeChat?.subtitle || ''}
												onChange={e => updateActiveChat({ subtitle: e.target.value })}
												placeholder={t.subtitle}
											/>
										</div>
										<div className={tw.rowBtns}>
											<button
												type="button"
												className={cn(tw.fileBtn, tw.btnAccent)}
												onClick={openContactInfo}
											>
												{t.openContact}
											</button>
										</div>
										<div className={tw.rowBtns}>
											<label
												className={fileBtn(pasteTarget === 'contactAvatar')}
												onClick={() => setPasteTarget('contactAvatar')}
											>
												<input
													className={tw.fileInputHidden}
													type="file"
													accept="image/*"
													onChange={e => onPickAvatar('contactAvatar', e)}
												/>
												<ImagePlus size={12} />
												{ar ? 'صورة الجهة' : 'Contact'}
											</label>
											<label
												className={fileBtn(pasteTarget === 'selfAvatar')}
												onClick={() => setPasteTarget('selfAvatar')}
											>
												<input
													className={tw.fileInputHidden}
													type="file"
													accept="image/*"
													onChange={e => onPickAvatar('selfAvatar', e)}
												/>
												<ImagePlus size={12} />
												{ar ? 'صورتي' : 'Me'}
											</label>
											<label
												className={fileBtn(pasteTarget === 'wallpaper')}
												onClick={() => setPasteTarget('wallpaper')}
											>
												<input
													className={tw.fileInputHidden}
													type="file"
													accept="image/*"
													onChange={e => onPickAvatar('wallpaper', e)}
												/>
												<ImagePlus size={12} />
												{ar ? 'خلفية' : 'Wallpaper'}
											</label>
										</div>
										<p className={tw.hint}>{t.pasteHint}</p>
									</section>

									{state.screen === 'contact' ? (
										<section className={tw.card}>
											<h3 className={tw.cardH3}>{ar ? 'تفاصيل الصفحة' : 'Info details'}</h3>
											<div className={tw.grid2}>
												<input
													className={tw.full}
													value={activeChat?.info?.mediaCount || ''}
													onChange={e => updateContactInfo({ mediaCount: e.target.value })}
													placeholder="Media count"
												/>
												<input
													className={tw.full}
													value={activeChat?.info?.storage || ''}
													onChange={e => updateContactInfo({ storage: e.target.value })}
													placeholder="Storage"
												/>
												<input
													className={tw.full}
													value={activeChat?.info?.keptMessages || ''}
													onChange={e => updateContactInfo({ keptMessages: e.target.value })}
													placeholder="Kept messages"
												/>
												<input
													className={tw.full}
													value={activeChat?.info?.disappearing || ''}
													onChange={e => updateContactInfo({ disappearing: e.target.value })}
													placeholder="Disappearing"
												/>
												<input
													className={tw.full}
													value={activeChat?.info?.saveToPhotos || ''}
													onChange={e => updateContactInfo({ saveToPhotos: e.target.value })}
													placeholder="Save to Photos"
												/>
												<input
													className={tw.full}
													value={activeChat?.info?.advancedPrivacy || ''}
													onChange={e => updateContactInfo({ advancedPrivacy: e.target.value })}
													placeholder="Advanced privacy"
												/>
											</div>
											<input
												className={cn(tw.full, 'mt-1.5')}
												value={activeChat?.info?.transcriptLanguage || ''}
												onChange={e => updateContactInfo({ transcriptLanguage: e.target.value })}
												placeholder="Transcript language"
											/>
											<label className={cn(tw.check, 'mt-1.5')}>
												<input
													type="checkbox"
													checked={Boolean(activeChat?.info?.lockChat)}
													onChange={e => updateContactInfo({ lockChat: e.target.checked })}
												/>
												Lock chat
											</label>
										</section>
									) : null}

									{state.screen === 'thread' ? (
									<section className={tw.card}>
										<h3 className={tw.cardH3}>{t.messages}</h3>
										<div className={tw.segSm}>
											<button
												type="button"
												className={segBtn(draftSide === "in")}
												onClick={() => setDraftSide('in')}
											>
												{t.incoming}
											</button>
											<button
												type="button"
												className={segBtn(draftSide === "out")}
												onClick={() => setDraftSide('out')}
											>
												{t.outgoing}
											</button>
										</div>
										<input
											className={tw.full}
											value={draftTime}
											onChange={e => setDraftTime(e.target.value)}
											placeholder="2:02 pm"
										/>
										<textarea
											rows={2}
											value={draftText}
											onChange={e => setDraftText(e.target.value)}
											placeholder={ar ? 'نص…' : 'Text…'}
											dir="auto"
										/>
										<div className={tw.rowBtns}>
											<button type="button" className={tw.fileBtn} onClick={onAddText}>
												<Plus size={12} />
												Text
											</button>
											<button type="button" className={tw.fileBtn} onClick={onAddVoice}>
												<Mic size={12} />
											</button>
											<label
												className={fileBtn(pasteTarget === "message")}
												onClick={() => setPasteTarget('message')}
											>
												<input
													className={tw.fileInputHidden}
													type="file"
													accept="image/*"
													onChange={e => onAddTicketOrImage('image', e)}
												/>
												<ImagePlus size={12} />
											</label>
											<label className={cn(tw.fileBtn, tw.btnAccent)}>
												<input
													className={tw.fileInputHidden}
													type="file"
													accept="image/*"
													onChange={e => onAddTicketOrImage('ticket', e)}
												/>
												<Ticket size={12} />
											</label>
										</div>
										<ul className={tw.msgList}>
										{state.thread.messages.map(item => (
											<li key={item.id} className={tw.msgItem}>
													<span className={tw.msgItemText} dir="auto">
														{item.side === 'out' ? '→ ' : '← '}
														{item.type === 'text'
															? item.text
															: item.type === 'voice'
																? `🎤 ${item.duration}`
																: item.type === 'ticket'
																	? '🎫'
																	: '🖼'}
													</span>
													<button type="button" className={tw.msgDelete} onClick={() => removeMessage(item.id)}>
														<Trash2 size={12} />
													</button>
												</li>
											))}
										</ul>
									</section>
									) : null}
								</>
							) : null}
						</>
					) : null}
				</div>

				<div className={tw.actions}>
					<button
						type="button"
						className={tw.shot}
						disabled={capturing}
						onClick={() => void openShareFromCapture()}
					>
						{capturing ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
						{t.screenshot}
					</button>
					<div className={tw.actionsRow}>
						<button
							type="button"
							className={tw.reset}
							onClick={() => void openShareFromCapture({ download: true })}
						>
							<Download size={13} />
							PNG
						</button>
						<button type="button" className={tw.reset} onClick={resetStudio}>
							<RotateCcw size={13} />
							{t.reset}
						</button>
					</div>
				</div>
			</aside>

			<div className={tw.stage} ref={stageRef}>
				<div
					className={tw.phoneWrap}
					style={{
						width: IPHONE_DEVICE.width * phoneScale,
						height: IPHONE_DEVICE.height * phoneScale,
					}}
				>
					<div
						ref={phoneRef}
						className={cn(tw.phoneDevice, tw.phoneScale)}
						style={{
							width: IPHONE_DEVICE.width,
							height: IPHONE_DEVICE.height,
							transform: phoneScale === 1 ? undefined : `scale(${phoneScale})`,
						}}
					>
						<div
							ref={screenRef}
							className={cn(tw.phoneDeviceScreen, capturing && tw.phoneCapturing)}
							style={{ width: IPHONE_XR.width, height: IPHONE_XR.height }}
						>
						<div
							style={{
								width: IPHONE_LAYOUT.width,
								height: IPHONE_LAYOUT.height,
								transform: `scale(${IPHONE_CONTENT_SCALE})`,
								transformOrigin: 'top left',
							}}
						>
							{state.screen === 'list' ? (
								<ChatsListPreview
									status={state.status}
									list={state.list}
									capturing={capturing}
									activeChatId={state.activeChatId}
									onOpenChat={openChat}
								/>
							) : state.screen === 'contact' ? (
								<ContactInfoPreview
									status={state.status}
									thread={threadView}
									capturing={capturing}
									onBack={closeContactInfo}
								/>
							) : (
								<ChatThreadPreview
									status={state.status}
									thread={threadView}
									capturing={capturing}
									onOpenContact={openContactInfo}
									onBackToList={() => update({ screen: 'list' })}
								/>
							)}
						</div>
						</div>
					</div>
				</div>
			</div>

			<ShareScreenshotSheet
				open={shareOpen}
				ar={ar}
				previewUrl={sharePreview}
				conversations={liveChats}
				busyId={shareBusyId}
				onClose={() => setShareOpen(false)}
				onShare={item => void shareToChat(item)}
				onDownload={() => {
					if (!sharePreview) return;
					const link = document.createElement('a');
					link.href = sharePreview;
					link.download = `whatsapp-${formatIosStatusTime().replace(':', '-')}.png`;
					link.click();
				}}
			/>
		</div>
	);
}
