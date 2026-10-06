'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import io from 'socket.io-client';
import {
	ArrowLeft, ArrowRight, Bell, Camera, File as FileIcon, Image as ImageIcon, Inbox, Loader2,
	MessageCircle, Mic, Phone, Plus, Search, Send, Smile, User, Users, X,
} from 'lucide-react';

import api from '@/utils/axios';
import MultiLangText from '@/components/atoms/MultiLangText';
import { ErrorBox, RowSkeleton } from '@/components/atoms/GmStates';
import { Notification } from '@/config/Notification';
import { useUser } from '@/hooks/useUser';
import { useValues } from '@/context/GlobalContext';
import {
	AttachPreview, ChatAvatar, MessageList, MessageSkeleton, UnreadBadge,
} from '@/components/pages/dashboard/chat/ChatParts';
import {
	API_URL, cls, detectMessageType, formatDuration, getMessages, getOrCreateDirect,
	listConversations, peerOf, previewOf, searchUsersApi, timeHHMM, uploadChatFile,
} from '@/components/pages/dashboard/chat/chatUtils';

const QUICK_EMOJI = ['😀', '😂', '🥰', '👍', '🙏', '🔥', '💪', '🎉', '❤️', '👏', '😭', '🤔'];

const serverMessage = e => {
	const msg = e?.response?.data?.message;
	return Array.isArray(msg) ? msg.join(', ') : msg;
};

export default function ChatPage() {
	const t = useTranslations('chat');
	const locale = useLocale();
	const searchParams = useSearchParams();
	const storedUser = useUser();
	const role = String(storedUser?.role || '').toLowerCase();
	const { setConversationId } = useValues();

	const [me, setMe] = useState(null);
	const [socket, setSocket] = useState(null);
	const [onlineIds, setOnlineIds] = useState(() => new Set());

	const [convos, setConvos] = useState([]);
	const [filterTab, setFilterTab] = useState('all');
	const [activeId, setActiveId] = useState(null);
	const [msgs, setMsgs] = useState([]);
	const [loadingMsgs, setLoadingMsgs] = useState(false);
	const [loadingConvos, setLoadingConvos] = useState(true);
	const [convoErr, setConvoErr] = useState(null);
	const [msgErr, setMsgErr] = useState(null);

	const [search, setSearch] = useState('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState([]);
	const [searchErr, setSearchErr] = useState(null);

	const [sending, setSending] = useState(false);
	const [text, setText] = useState('');
	const [attaches, setAttaches] = useState([]);
	const [recording, setRecording] = useState(false);
	const [recordSecs, setRecordSecs] = useState(0);
	const [emojiOpen, setEmojiOpen] = useState(false);
	const [attachOpen, setAttachOpen] = useState(false);
	const [toolsOpen, setToolsOpen] = useState(false);
	const [typing, setTyping] = useState(false);

	const endRef = useRef(null);
	const messagesScrollRef = useRef(null);
	const textAreaRef = useRef(null);
	const imageInputRef = useRef(null);
	const fileInputRef = useRef(null);
	const cameraInputRef = useRef(null);
	const shouldStickToBottomRef = useRef(true);
	const searchTimerRef = useRef(null);
	const typingTimerRef = useRef(null);
	const typingStopTimerRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const recordChunksRef = useRef([]);
	const recordTimerRef = useRef(null);
	const recordStreamRef = useRef(null);
	const recordSecsRef = useRef(0);
	const activeIdRef = useRef(null);
	const meIdRef = useRef(null);
	const convosReqRef = useRef(0);

	const hasAttaches = attaches.length > 0;
	const isRTL = locale === 'ar';
	activeIdRef.current = activeId;
	meIdRef.current = me?.id;

	const errorOf = useCallback((e, fallbackKey) => (
		e?.response ? serverMessage(e) || t(fallbackKey) : t('common.serverUnreachable')
	), [t]);

	useEffect(() => {
		document.documentElement.dataset.gmUsers = '1';
		return () => { delete document.documentElement.dataset.gmUsers; };
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		if (role === 'client' && activeId) root.dataset.chatThread = '1';
		else delete root.dataset.chatThread;
		return () => { delete root.dataset.chatThread; };
	}, [activeId, role]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const { data } = await api.get('/auth/me');
				if (!cancelled) setMe(data);
			} catch {
				if (!cancelled) setMe(null);
			}
		})();
		return () => { cancelled = true; };
	}, []);

	const scrollToBottom = useCallback((smooth = false) => {
		const el = messagesScrollRef.current;
		if (!el) {
			endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
			return;
		}
		if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
		else el.scrollTop = el.scrollHeight;
	}, []);

	const stickToBottomIfNeeded = useCallback(() => {
		if (shouldStickToBottomRef.current) scrollToBottom(false);
	}, [scrollToBottom]);

	const markActiveAsRead = useCallback((cid) => {
		const id = cid || activeIdRef.current;
		if (!id) return;
		socket?.emit('mark_as_read', id);
	}, [socket]);

	const onSelectConversation = useCallback(async (conversationId) => {
		setActiveId(conversationId);
		setLoadingMsgs(true);
		setTyping(false);
		setMsgs([]);
		setMsgErr(null);
		shouldStickToBottomRef.current = true;
		try {
			const data = await getMessages(api, conversationId, 1, 200);
			setMsgs(data);
			socket?.emit('join_conversation', conversationId);
			setConvos(prev => prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
			setConversationId(conversationId);
			markActiveAsRead(conversationId);
		} catch (e) {
			setMsgErr(errorOf(e, 'errors.loadMessages'));
		} finally {
			setLoadingMsgs(false);
			requestAnimationFrame(() => {
				scrollToBottom(false);
				requestAnimationFrame(() => scrollToBottom(false));
			});
		}
	}, [socket, setConversationId, markActiveAsRead, errorOf, scrollToBottom]);

	const refreshConvos = useCallback(async (focusId = null) => {
		const reqId = ++convosReqRef.current;
		setLoadingConvos(true);
		setConvoErr(null);
		try {
			const list = await listConversations(api, 1, 50);
			if (reqId !== convosReqRef.current) return;
			setConvos(list);
			if (focusId) await onSelectConversation(focusId);
		} catch (e) {
			if (reqId !== convosReqRef.current) return;
			setConvoErr(errorOf(e, 'errors.loadConversations'));
		} finally {
			if (reqId === convosReqRef.current) setLoadingConvos(false);
		}
	}, [onSelectConversation, errorOf]);

	useEffect(() => {
		const uid = searchParams?.get('userId');
		if (!uid) {
			refreshConvos();
			return;
		}
		(async () => {
			try {
				const conv = await getOrCreateDirect(api, uid);
				await refreshConvos(conv?.id);
			} catch (e) {
				Notification(errorOf(e, 'errors.openDirect'), 'error');
				refreshConvos();
			}
		})();
	}, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

	/* Socket */
	useEffect(() => {
		if (!me) return undefined;
		const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
		const s = io(API_URL, {
			transports: ['websocket'],
			autoConnect: true,
			withCredentials: true,
			auth: { token },
		});
		setSocket(s);
		return () => { s.disconnect(); setSocket(null); };
	}, [me]);

	useEffect(() => {
		if (!socket) return undefined;

		const onNewMessage = (message) => {
			const convId = message?.conversation?.id;
			const meId = meIdRef.current;
			const current = activeIdRef.current;

			if (convId === current) {
				setMsgs(prev => {
					const tempIdx = message.tempId ? prev.findIndex(m => m.tempId === message.tempId) : -1;
					if (tempIdx >= 0) {
						const next = [...prev];
						next[tempIdx] = { ...message, pending: false };
						return next;
					}
					if (prev.some(m => m.id === message.id)) return prev;
					return [...prev, { ...message, pending: false }];
				});
				if (shouldStickToBottomRef.current || message?.sender?.id === meId) scrollToBottom(false);
			}

			setConvos(prev => prev
				.map(c => {
					if (c.id !== convId) return c;
					const isMine = message.sender?.id === meId;
					const isActive = c.id === current;
					let unread = c.unreadCount || 0;
					if (!isMine && !isActive) unread = (c.unreadCount || 0) + 1;
					else if (isActive) unread = 0;
					return { ...c, lastMessage: message, lastMessageAt: message.created_at, unreadCount: unread };
				})
				.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));

			if (convId === current && message?.sender?.id !== meId) markActiveAsRead(convId);
		};

		const onMessagesRead = ({ conversationId }) => {
			if (conversationId !== activeIdRef.current) return;
			setMsgs(prev => prev.map(m => (
				m.sender?.id === meIdRef.current ? { ...m, readBy: m.readBy || new Date().toISOString() } : m
			)));
		};

		const onConversationUpdated = (updated) => {
			if (!updated?.id) return;
			setConvos(prev => {
				const exists = prev.some(c => c.id === updated.id);
				const next = exists
					? prev.map(c => (c.id === updated.id ? { ...c, ...updated } : c))
					: [updated, ...prev];
				return next.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
			});
		};

		const onUserTyping = ({ conversationId, typing: isTyping, userId }) => {
			if (conversationId !== activeIdRef.current || userId === meIdRef.current) return;
			setTyping(!!isTyping);
			if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
			if (isTyping) typingTimerRef.current = setTimeout(() => setTyping(false), 3000);
		};

		const onMessageError = ({ tempId }) => {
			setMsgs(prev => prev.filter(m => m.tempId !== tempId));
			setSending(false);
			Notification(t('errors.sendFailed'), 'error');
		};

		const onUserOnline = ({ userId, online }) => {
			setOnlineIds(prev => {
				const next = new Set(prev);
				if (online) next.add(userId);
				else next.delete(userId);
				return next;
			});
		};

		socket.on('new_message', onNewMessage);
		socket.on('messages_read', onMessagesRead);
		socket.on('conversation_updated', onConversationUpdated);
		socket.on('user_typing', onUserTyping);
		socket.on('message_error', onMessageError);
		socket.on('user_online', onUserOnline);

		return () => {
			socket.off('new_message', onNewMessage);
			socket.off('messages_read', onMessagesRead);
			socket.off('conversation_updated', onConversationUpdated);
			socket.off('user_typing', onUserTyping);
			socket.off('message_error', onMessageError);
			socket.off('user_online', onUserOnline);
			if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
		};
	}, [socket, scrollToBottom, markActiveAsRead, t]);

	/* Search */
	useEffect(() => {
		if (!search?.trim()) {
			setResults([]);
			setSearching(false);
			setSearchErr(null);
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
			return undefined;
		}
		setSearching(true);
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		searchTimerRef.current = setTimeout(async () => {
			try {
				const users = await searchUsersApi(api, search.trim());
				setResults(users);
				setSearchErr(null);
			} catch (e) {
				setResults([]);
				setSearchErr(errorOf(e, 'errors.searchFailed'));
			} finally {
				setSearching(false);
			}
		}, 400);
		return () => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		};
	}, [search, errorOf]);

	async function openDirectWith(userId) {
		try {
			const conv = await getOrCreateDirect(api, userId);
			await refreshConvos(conv?.id);
			setResults([]);
			setSearch('');
		} catch (e) {
			Notification(errorOf(e, 'errors.openDirect'), 'error');
		}
	}

	async function contactCoach() {
		if (!me?.coachId) {
			Notification(t('quick.noCoach'), 'error');
			return;
		}
		await openDirectWith(me.coachId);
	}

	async function contactAdmin() {
		if (!me?.adminId) {
			Notification(t('quick.noAdmin'), 'error');
			return;
		}
		await openDirectWith(me.adminId);
	}

	function onPickFiles(files) {
		const arr = Array.from(files || []).slice(0, 6);
		if (!arr.length) return;
		setAttaches(prev => [
			...prev,
			...arr.map(f => ({ file: f, url: URL.createObjectURL(f), type: f.type, name: f.name, size: f.size })),
		]);
	}

	function removeAttach(i) {
		setAttaches(prev => {
			const copy = [...prev];
			const it = copy[i];
			if (it?.url) URL.revokeObjectURL(it.url);
			copy.splice(i, 1);
			return copy;
		});
	}

	function handleTyping() {
		if (!activeId) return;
		socket?.emit('typing_start', activeId);
		if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
		typingStopTimerRef.current = setTimeout(() => socket?.emit('typing_stop', activeId), 2000);
	}

	async function send() {
		if (!activeId || sending) return;
		const trimmedText = (text || '').trim();
		const pendingAttaches = [...attaches];
		const hasAtt = pendingAttaches.length > 0;
		if (!trimmedText && !hasAtt) return;

		const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const localPreviews = hasAtt
			? pendingAttaches.map(a => ({
				name: a?.name || 'file',
				type: a?.type || 'application/octet-stream',
				size: a?.size ?? 0,
				url: a?.url || '',
				local: true,
			}))
			: [];

		let messageType = localPreviews.length ? detectMessageType(localPreviews[0].type || '') : 'text';
		const optimistic = {
			id: tempId,
			tempId,
			conversation: { id: activeId },
			sender: me,
			content: trimmedText || null,
			messageType,
			attachments: localPreviews.length ? localPreviews : null,
			created_at: new Date().toISOString(),
			readBy: null,
			pending: true,
		};

		setMsgs(prev => [...prev, optimistic]);
		setText('');
		setAttaches([]);
		shouldStickToBottomRef.current = true;
		scrollToBottom(false);
		socket?.emit('typing_stop', activeId);
		if (textAreaRef.current) textAreaRef.current.style.height = 'auto';

		if (hasAtt) setSending(true);
		try {
			let uploaded = [];
			if (hasAtt) {
				uploaded = (await Promise.all(pendingAttaches.map(async a => {
					try {
						const up = await uploadChatFile(api, a.file);
						return {
							name: up?.originalname || a?.name || 'file',
							type: up?.mimetype || a?.type || 'application/octet-stream',
							size: up?.size ?? a?.size ?? 0,
							url: up?.url || '',
						};
					} catch {
						return null;
					}
				}))).filter(Boolean);

				if (!uploaded.length && !trimmedText) {
					setMsgs(prev => prev.filter(m => m.tempId !== tempId));
					Notification(t('errors.uploadFailed'), 'error');
					return;
				}
				if (uploaded.length) {
					messageType = detectMessageType(uploaded[0].type || '');
					setMsgs(prev => prev.map(m => (m.tempId === tempId ? { ...m, messageType, attachments: uploaded } : m)));
				}
			}

			socket?.emit('send_message', {
				conversationId: activeId,
				content: trimmedText || null,
				messageType,
				attachments: uploaded,
				tempId,
			});
			pendingAttaches.forEach(a => a?.url && URL.revokeObjectURL(a.url));
		} catch {
			setMsgs(prev => prev.filter(m => m.tempId !== tempId));
			Notification(t('errors.sendFailed'), 'error');
		} finally {
			if (hasAtt) setSending(false);
		}
	}

	useEffect(() => () => {
		if (recordTimerRef.current) clearInterval(recordTimerRef.current);
		const recorder = mediaRecorderRef.current;
		if (recorder) {
			recorder.ondataavailable = null;
			recorder.onstop = null;
			try { if (recorder.state === 'recording') recorder.stop(); } catch { /* ignore */ }
		}
		recordStreamRef.current?.getTracks?.().forEach(tr => tr.stop());
		if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
	}, []);

	useEffect(() => {
		if (recording) cancelVoiceRecording();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeId]);

	async function startVoiceRecording() {
		if (!activeId || recording || sending) return;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			recordStreamRef.current = stream;
			recordChunksRef.current = [];
			const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
				? 'audio/webm;codecs=opus'
				: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
			const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
			mediaRecorderRef.current = recorder;
			recorder.ondataavailable = e => {
				if (e.data?.size > 0) recordChunksRef.current.push(e.data);
			};
			recorder.onstop = async () => {
				const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
				const secs = recordSecsRef.current;
				setRecording(false);
				setRecordSecs(0);
				recordSecsRef.current = 0;
				recordStreamRef.current?.getTracks?.().forEach(tr => tr.stop());
				recordStreamRef.current = null;
				if (blob.size > 0) await sendVoiceMessage(blob, secs);
			};
			recorder.start(200);
			setRecording(true);
			setRecordSecs(0);
			recordSecsRef.current = 0;
			if (recordTimerRef.current) clearInterval(recordTimerRef.current);
			recordTimerRef.current = setInterval(() => {
				recordSecsRef.current += 1;
				setRecordSecs(recordSecsRef.current);
			}, 1000);
		} catch {
			Notification(t('composer.micDenied'), 'error');
		}
	}

	function stopVoiceRecording() {
		if (recordTimerRef.current) {
			clearInterval(recordTimerRef.current);
			recordTimerRef.current = null;
		}
		try {
			if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
		} catch {
			setRecording(false);
		}
	}

	function cancelVoiceRecording() {
		if (recordTimerRef.current) {
			clearInterval(recordTimerRef.current);
			recordTimerRef.current = null;
		}
		const recorder = mediaRecorderRef.current;
		if (recorder) {
			recorder.ondataavailable = null;
			recorder.onstop = null;
			try { if (recorder.state === 'recording') recorder.stop(); } catch { /* ignore */ }
		}
		recordChunksRef.current = [];
		recordStreamRef.current?.getTracks?.().forEach(tr => tr.stop());
		recordStreamRef.current = null;
		setRecording(false);
		setRecordSecs(0);
		recordSecsRef.current = 0;
	}

	async function sendVoiceMessage(blob, durationSec = 0) {
		if (!activeId || !blob) return;
		const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const localUrl = URL.createObjectURL(blob);
		const ext = (blob.type || '').includes('ogg') ? 'ogg' : 'webm';
		const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
		const optimistic = {
			id: tempId,
			tempId,
			conversation: { id: activeId },
			sender: me,
			content: null,
			messageType: 'voice',
			attachments: [{ name: file.name, type: file.type, size: file.size, url: localUrl, duration: durationSec, local: true }],
			voiceUri: localUrl,
			voiceDuration: durationSec,
			created_at: new Date().toISOString(),
			readBy: null,
			pending: true,
		};
		setMsgs(prev => [...prev, optimistic]);
		shouldStickToBottomRef.current = true;
		scrollToBottom(false);
		setSending(true);
		try {
			const up = await uploadChatFile(api, file);
			const attachment = {
				name: up?.originalname || file.name,
				type: up?.mimetype || file.type,
				size: up?.size ?? file.size,
				url: up?.url || '',
				duration: durationSec,
			};
			setMsgs(prev => prev.map(m => (
				m.tempId === tempId
					? { ...m, attachments: [attachment], voiceUri: attachment.url, voiceDuration: durationSec }
					: m
			)));
			socket?.emit('send_message', {
				conversationId: activeId,
				content: null,
				messageType: 'voice',
				attachments: [attachment],
				tempId,
			});
		} catch {
			setMsgs(prev => prev.filter(m => m.tempId !== tempId));
			URL.revokeObjectURL(localUrl);
			Notification(t('errors.sendFailed'), 'error');
		} finally {
			setSending(false);
		}
	}

	const filteredConvos = useMemo(() => {
		if (filterTab === 'unread') return convos.filter(c => (c.unreadCount || 0) > 0);
		if (filterTab === 'groups') return convos.filter(c => c.isGroup);
		return convos;
	}, [convos, filterTab]);
	const activeConversation = useMemo(() => convos.find(c => c.id === activeId) || null, [convos, activeId]);
	const otherUser = useMemo(() => peerOf(activeConversation, me?.id), [activeConversation, me?.id]);
	const unreadTotal = useMemo(() => convos.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0), [convos]);

	const glassBtn = 'grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[1.3px] border-t-white/45 border-s-white/35 border-b-[rgba(15,48,120,0.35)] border-e-[rgba(15,48,120,0.25)] bg-white/15 text-white shadow-[2px_3px_6px_rgba(15,23,42,0.35)] transition active:scale-95';
	const neuBtn = 'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/80 bg-[#eef2f9] text-(--color-primary-600) shadow-[3px_3px_8px_rgba(100,116,139,0.28)] transition active:scale-95';
	const canSend = !!(text.trim() || hasAttaches);
	const filterTabs = [
		{ id: 'all', icon: Inbox },
		{ id: 'unread', icon: Bell },
		{ id: 'groups', icon: Users },
	];

	const renderConvoList = () => (
		<div className='min-h-0 flex-1 overflow-auto pb-3 pt-1'>
			{loadingConvos ? (
				<div className='space-y-3 px-3'><RowSkeleton rows={6} /></div>
			) : convoErr ? (
				<div className='p-3'><ErrorBox message={convoErr} onRetry={() => refreshConvos()} retryLabel={t('common.retry')} busy={loadingConvos} /></div>
			) : filteredConvos.length ? (
				<ul>
					{filteredConvos.map(c => {
						const peer = peerOf(c, me?.id);
						const title = c.isGroup ? c.name || t('list.group') : peer?.name || peer?.email || t('list.direct');
						const last = c.lastMessage;
						const hasUnread = Number(c.unreadCount) > 0;
						return (
							<li key={c.id}>
								<button
									type='button'
									onClick={() => onSelectConversation(c.id)}
									className='mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-3xl border border-white/85 bg-[#eef2f9] px-3.5 py-3 text-start shadow-[5px_5px_8px_rgba(100,116,139,0.4)] transition active:scale-[0.985]'
								>
									<ChatAvatar user={peer} size={46} raised />
									<span className='min-w-0 flex-1'>
										<span className='mb-1 flex items-center justify-between gap-1.5'>
											<MultiLangText className='min-w-0 flex-1 truncate text-[15.5px] font-bold text-slate-900'>{title}</MultiLangText>
											<span className={cls('shrink-0 text-[11px] tabular-nums', hasUnread ? 'font-semibold text-(--color-primary-600)' : 'text-slate-400')}>
												{last?.created_at ? timeHHMM(last.created_at, locale) : ''}
											</span>
										</span>
										<span className='flex items-center justify-between gap-1.5'>
											<MultiLangText className={cls('min-w-0 flex-1 truncate text-[13px]', hasUnread ? 'font-medium text-slate-600' : 'text-slate-400')}>
												{previewOf(last, t)}
											</MultiLangText>
											<UnreadBadge count={c.unreadCount} />
										</span>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			) : (
				<div className='flex flex-col items-center px-8 py-16 text-center'>
					<div className='mb-4 grid h-[72px] w-[72px] place-items-center rounded-full border border-white/80 bg-[#eef2f9] text-(--color-primary-500) shadow-[4px_5px_12px_rgba(100,116,139,0.28)]'>
						<MessageCircle size={30} strokeWidth={1.5} />
					</div>
					<p className='text-base font-bold text-slate-600'>{filterTab === 'unread' ? t('list.emptyUnread') : t('list.empty')}</p>
				</div>
			)}
		</div>
	);

	const listHeader = (
		<div className='shrink-0 p-1.5'>
			<div className='relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-b-[rgba(15,34,128,0.45)] pb-2 text-white shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]' style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), var(--color-gradient-via))' }}>
				<div className='pointer-events-none absolute -top-10 -start-20 h-[280px] w-[280px] rounded-full bg-white/[0.06]' />
				<div className='pointer-events-none absolute -bottom-10 -end-16 h-[200px] w-[200px] rounded-full bg-white/[0.04]' />
				<div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30' />
				<div className='relative flex items-center gap-3 px-4 pb-2 pt-4'>
					<div className={glassBtn}><MessageCircle size={20} strokeWidth={2} /></div>
					<div className='min-w-0 flex-1'>
						<h1 className='truncate text-xl font-black leading-6 tracking-[-0.3px]'>{t('appbar.screenTitle')}</h1>
						<p className='mt-0.5 truncate text-[10px] font-medium text-white/55'>
							{unreadTotal > 0 ? t('appbar.unreadCount', { count: unreadTotal }) : t('appbar.screenHint')}
						</p>
					</div>
					<button type='button' onClick={() => setToolsOpen(v => !v)} className={cls(glassBtn, 'relative')} aria-label={t('search.placeholder')}>
						<Bell size={18} strokeWidth={2} />
						{unreadTotal > 0 ? <span className='absolute top-2 end-2 size-2 rounded-full bg-white' /> : null}
					</button>
				</div>
				<div className='relative mx-4 mb-2 h-px bg-white/20' />
				<div className='relative flex gap-1.5 overflow-x-auto px-4 pb-3'>
					{filterTabs.map(tab => {
						const on = filterTab === tab.id;
						const Icon = tab.icon;
						return (
							<button
								key={tab.id}
								type='button'
								onClick={() => setFilterTab(tab.id)}
								className={cls(
									'inline-flex shrink-0 items-center justify-center gap-[5px] rounded-2xl border px-3 py-2 text-[11px] font-bold',
									on ? 'border-white/90 bg-white text-(--color-primary-700) shadow-[2px_4px_7px_rgba(15,23,42,0.4)]' : 'border-white/30 bg-white/10 text-white/65',
								)}
							>
								<Icon size={11} strokeWidth={on ? 2.5 : 2} />
								<span>{t(`tabs.${tab.id}`)}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);

	const searchBlock = toolsOpen ? (
		<div className='shrink-0 space-y-2 px-3 pb-2'>
			<label className='flex min-h-12 items-center gap-2 rounded-full border border-white/85 bg-[#eef2f9] px-3.5 shadow-[5px_5px_8px_rgba(100,116,139,0.35)]'>
				<Search size={16} className='shrink-0 text-slate-400' strokeWidth={2} />
				<input
					type='search'
					value={search}
					placeholder={t('search.placeholder')}
					aria-label={t('search.placeholder')}
					onChange={e => setSearch(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Escape') {
							e.preventDefault();
							setSearch('');
							setToolsOpen(false);
						}
					}}
					className='min-w-0 flex-1 bg-transparent py-2 text-[15px] text-slate-800 outline-none placeholder:text-slate-400'
				/>
				{searching ? <Loader2 size={14} className='animate-spin text-slate-400' /> : null}
				{search ? (
					<button type='button' aria-label={t('search.clear')} onClick={() => setSearch('')} className='grid size-6 place-items-center text-slate-400'>
						<X size={14} strokeWidth={2.2} />
					</button>
				) : null}
			</label>
			{role === 'client' ? (
				<div className='flex gap-2'>
					<button type='button' onClick={contactCoach} className='inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/85 bg-[#eef2f9] text-xs font-bold text-(--color-primary-700) shadow-[3px_3px_8px_rgba(100,116,139,0.28)]'>
						<Phone size={14} />
						{t('quick.coach')}
					</button>
					{me?.adminId ? (
						<button type='button' onClick={contactAdmin} className='inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/85 bg-[#eef2f9] text-xs font-bold text-(--color-primary-700) shadow-[3px_3px_8px_rgba(100,116,139,0.28)]'>
							<User size={14} />
							{t('quick.admin')}
						</button>
					) : null}
				</div>
			) : null}
			{searchErr && <ErrorBox message={searchErr} />}
			{!searching && search && !results.length && !searchErr && (
				<p className='px-2 text-xs font-medium text-slate-500'>{t('search.noResultsTitle')}</p>
			)}
			{!!results.length && (
				<ul className='overflow-hidden rounded-3xl border border-white/80 bg-[#eef2f9] shadow-[4px_5px_12px_rgba(100,116,139,0.2)]'>
					<li className='px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-(--color-primary-600)'>{t('search.results')}</li>
					{results.map(u => (
						<li key={u.id} className='border-t border-white/70'>
							<button type='button' onClick={() => openDirectWith(u.id)} className='flex w-full items-center gap-3 px-3.5 py-3 text-start'>
								<ChatAvatar user={u} size={44} />
								<span className='min-w-0 flex-1'>
									<MultiLangText className='block truncate text-[15px] font-bold text-slate-900'>{u.name || u.email}</MultiLangText>
									<MultiLangText className='block truncate text-xs text-slate-400'>{u.email}</MultiLangText>
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	) : null;

	const threadHeader = (
		<div className='shrink-0 p-1.5'>
			<div className='relative overflow-hidden rounded-3xl border-[1.5px] border-t-white/40 border-b-[rgba(15,34,128,0.45)] text-white shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-900)_45%,transparent)]' style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-primary-700), var(--color-gradient-via))' }}>
				<div className='pointer-events-none absolute -top-16 -start-12 h-[200px] w-[200px] rounded-full bg-white/[0.05]' />
				<div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30' />
				<div className='relative flex min-h-[60px] items-center gap-3 p-4'>
					{otherUser ? (
						<ChatAvatar user={otherUser} size={44} raised tone='onPrimary' online />
					) : (
						<div className={glassBtn}><MessageCircle size={20} strokeWidth={2} /></div>
					)}
					<div className='min-w-0 flex-1'>
						<p className='truncate text-lg font-bold tracking-[-0.3px]'>
							{otherUser ? (otherUser.name || otherUser.email) : t('appbar.screenTitle')}
						</p>
						<p className={cls('mt-0.5 truncate text-[11px]', typing ? 'text-white/90' : 'text-white/55')}>
							{otherUser ? (typing ? t('header.typing') : t('header.online')) : t('appbar.screenHint')}
						</p>
					</div>
					<button type='button' onClick={() => setActiveId(null)} aria-label={t('actions.openList')} className={glassBtn}>
						{isRTL ? <ArrowRight size={20} strokeWidth={2.5} /> : <ArrowLeft size={20} strokeWidth={2.5} />}
					</button>
				</div>
			</div>
		</div>
	);

	return (
		<div data-plain-page="1" className='report-phone mx-auto flex min-h-0 w-full max-w-[440px] flex-1 flex-col bg-white dark:bg-[#0b1220]'>
			<aside className={cls('min-h-0 w-full flex-col', activeId ? 'hidden' : 'flex', role === 'client' && 'pb-[var(--client-dock)]')}>
				{listHeader}
				{searchBlock}
				{renderConvoList()}
			</aside>

			<section className={cls('min-h-0 min-w-0 flex-1 flex-col', activeId ? 'flex' : 'hidden')}>
				{threadHeader}
				<div
					ref={messagesScrollRef}
					onScroll={e => {
						const el = e.currentTarget;
						shouldStickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
					}}
					className='min-h-0 flex-1 overflow-y-auto px-2 py-2'
				>
					{!activeId ? (
						<div className='grid h-full place-items-center px-6 text-center'>
							<div>
								<div className='mx-auto mb-5 grid h-[88px] w-[88px] place-items-center rounded-full border border-white/80 bg-[#eef2f9] text-(--color-primary-500) shadow-[4px_5px_12px_rgba(100,116,139,0.28)]'>
									<MessageCircle size={38} strokeWidth={1.5} />
								</div>
								<p className='text-lg font-bold text-slate-900'>{t('empty.pick')}</p>
								<p className='mx-auto mt-2 max-w-[240px] text-[13px] leading-5 text-slate-500'>{t('empty.hint')}</p>
							</div>
						</div>
					) : msgErr ? (
						<div className='p-4'><ErrorBox message={msgErr} onRetry={() => onSelectConversation(activeId)} retryLabel={t('common.retry')} busy={loadingMsgs} /></div>
					) : loadingMsgs ? (
						<MessageSkeleton />
					) : (
						<MessageList
							msgs={msgs}
							me={me}
							endRef={endRef}
							t={t}
							locale={locale}
							typing={typing}
							onContentReady={stickToBottomIfNeeded}
						/>
					)}
				</div>

				<div className='shrink-0 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2'>
					{!activeId ? (
						<p className='py-3 text-center text-sm font-medium text-slate-400'>{t('composer.disabled')}</p>
					) : recording ? (
						<div className='flex h-12 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2'>
							<button type='button' onClick={cancelVoiceRecording} aria-label={t('composer.cancel')} className='grid size-9 place-items-center rounded-full text-slate-500'>
								<X className='size-4' />
							</button>
							<div className='flex min-w-0 flex-1 items-center justify-center gap-2 font-semibold text-rose-600'>
								<span className='size-2 shrink-0 animate-pulse rounded-full bg-rose-500' />
								<span className='font-en text-sm tabular-nums'>{formatDuration(recordSecs)}</span>
								<span className='truncate text-xs opacity-80'>{t('composer.recording')}</span>
							</div>
							<button type='button' onClick={stopVoiceRecording} aria-label={t('composer.sendVoice')} className='grid size-9 place-items-center rounded-full bg-rose-500 text-white'>
								<Send className='size-4' />
							</button>
						</div>
					) : (
						<>
							{attachOpen ? (
								<div className='mb-2 flex items-start justify-around rounded-3xl border border-white/80 bg-[#eef2f9] px-4 py-4 shadow-[4px_5px_12px_rgba(100,116,139,0.22)]'>
									{[
										{ key: 'library', icon: ImageIcon, label: t('composer.image'), onClick: () => imageInputRef.current?.click() },
										{ key: 'camera', icon: Camera, label: t('composer.image'), onClick: () => cameraInputRef.current?.click() },
										{ key: 'file', icon: FileIcon, label: t('composer.attach'), onClick: () => fileInputRef.current?.click() },
									].map(item => {
										const Icon = item.icon;
										return (
										<button key={item.key} type='button' onClick={() => { setAttachOpen(false); item.onClick(); }} className='flex flex-col items-center gap-2.5'>
											<span className='grid h-16 w-16 place-items-center rounded-[20px] border border-(--color-primary-100) bg-(--color-primary-50) text-(--color-primary-600)'>
												<Icon size={26} strokeWidth={2} />
											</span>
											<span className='text-xs text-slate-500'>{item.label}</span>
										</button>
										);
									})}
								</div>
							) : null}
							{emojiOpen ? (
								<div className='mb-2 flex flex-wrap gap-1 rounded-3xl border border-white/80 bg-[#eef2f9] p-2 shadow-[3px_3px_8px_rgba(100,116,139,0.18)]'>
									{QUICK_EMOJI.map(emoji => (
										<button key={emoji} type='button' onClick={() => { setText(prev => prev + emoji); setEmojiOpen(false); }} className='grid size-9 place-items-center rounded-xl text-lg hover:bg-white'>
											{emoji}
										</button>
									))}
								</div>
							) : null}
							<AttachPreview attaches={attaches} onRemove={removeAttach} t={t} />
							<div className='flex items-center gap-2.5 rounded-3xl border border-white/80 bg-[#eef2f9] p-2.5 shadow-[5px_6px_14px_rgba(100,116,139,0.28)]'>
								<button type='button' onClick={() => { setAttachOpen(v => !v); setEmojiOpen(false); }} aria-label={t('composer.attach')} className={neuBtn}>
									<Plus size={18} strokeWidth={2.5} />
								</button>
								<div className='flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/85 bg-[#eef2f9] px-3.5 shadow-[5px_5px_8px_rgba(100,116,139,0.35)]'>
									<textarea
										ref={textAreaRef}
										value={text}
										onChange={e => {
											setText(e.target.value);
											handleTyping();
											const el = e.target;
											el.style.height = 'auto';
											el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
										}}
										onKeyDown={e => {
											if (e.key === 'Enter' && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
												e.preventDefault();
												send();
											}
										}}
										onBlur={() => {
											if (activeId) socket?.emit('typing_stop', activeId);
											if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
										}}
										rows={1}
										placeholder={t('composer.placeholder')}
										className='max-h-[110px] min-h-7 min-w-0 flex-1 resize-none border-0 bg-transparent py-1 text-[15px] leading-5 text-slate-800 outline-none placeholder:text-slate-400'
									/>
									<button type='button' onClick={() => { setEmojiOpen(v => !v); setAttachOpen(false); }} aria-label='emoji' className={cls('shrink-0', emojiOpen ? 'text-(--color-primary-600)' : 'text-slate-400')}>
										<Smile size={18} strokeWidth={2} />
									</button>
								</div>
								{canSend ? (
									<button type='button' onClick={send} disabled={sending} aria-label={t('composer.send')} className='grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.3px] border-t-white/40 border-b-[rgba(15,48,120,0.4)] text-white shadow-[3px_4px_8px_rgba(15,23,42,0.35)] disabled:opacity-45' style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}>
										{sending ? <Loader2 className='size-4 animate-spin' /> : <Send size={17} strokeWidth={2.5} />}
									</button>
								) : (
									<button type='button' onClick={startVoiceRecording} disabled={sending} aria-label={t('composer.voice')} className={neuBtn}>
										<Mic size={18} strokeWidth={2} />
									</button>
								)}
							</div>
							<input ref={imageInputRef} type='file' className='hidden' accept='image/*' multiple onChange={e => onPickFiles(e.target.files)} />
							<input ref={cameraInputRef} type='file' className='hidden' accept='image/*' capture='environment' onChange={e => onPickFiles(e.target.files)} />
							<input ref={fileInputRef} type='file' className='hidden' multiple onChange={e => onPickFiles(e.target.files)} />
						</>
					)}
				</div>
			</section>
		</div>
	);
}
