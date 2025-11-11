
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import io from 'socket.io-client';
import {
	Paperclip, Image as ImageIcon, Send, Search, Phone, UserCircle2, ChevronLeft, Loader2,
	Check, CheckCheck, Video, File as FileIcon, X, Inbox, Menu, ChevronRight, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { useUser } from '@/hooks/useUser';

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;
const cls = (...a) => a.filter(Boolean).join(' ');

/* --------- Design tokens (tweak freely) --------- */
const ui = {
	radius: {
		sm: 'rounded-md',
		md: 'rounded-lg',
		lg: 'rounded-xl',
		xl: 'rounded-2xl',
	},
	shadow: {
		sm: 'shadow-[0_2px_10px_-6px_rgba(2,6,23,0.15)]',
		md: 'shadow-[0_12px_32px_-16px_rgba(99,102,241,0.25)]',
	},
	glass: 'bg-white/75 backdrop-blur supports-[backdrop-filter]:backdrop-blur',
	gradientSoft: 'bg-gradient-to-br from-indigo-50 via-white to-blue-50',
	ringFocus: 'focus:outline-none focus:ring-4 focus:ring-indigo-200/50',
};

/* ---------------------------- Auth (me) ---------------------------- */
function useAuthMe() {
	const [me, setMe] = useState(null);
	useEffect(() => {
		(async () => {
			try {
				const { data } = await api.get('/auth/me');
				setMe(data);
			} catch {
				setMe(null);
			}
		})();
	}, []);
	return me;
}

/* ----------------------------- API helpers ----------------------------- */
async function listConversations(page = 1, limit = 50) {
	const { data } = await api.get(`/chat/conversations`, { params: { page, limit } });
	return data ?? [];
}
async function getMessages(conversationId, page = 1, limit = 200) {
	const { data } = await api.get(`/chat/conversations/${conversationId}/messages`, { params: { page, limit } });
	return data ?? [];
}
async function searchUsers(q, role) {
	const { data } = await api.get(`/chat/users/search`, { params: { q, role } });
	return Array.isArray(data) ? data : [];
}
async function getOrCreateDirect(userId) {
	const { data } = await api.post(`/chat/conversations/direct/${userId}`);
	return data;
}
async function uploadChatFile(file) {
	const isImg = /^image\//.test(file.type);
	const isVideo = /^video\//.test(file.type);
	const url = isImg ? '/chat/upload/image' : isVideo ? '/chat/upload/video' : '/chat/upload/file';
	const fd = new FormData();
	fd.append('file', file);
	const { data } = await api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
	return data;
}

/* --------------------------- Small UI helpers -------------------------- */
function timeHHMM(dateStr) {
	try {
		const d = new Date(dateStr);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	} catch {
		return '';
	}
}
function dateLabel(dateStr) {
	const d = new Date(dateStr);
	const today = new Date();
	const yday = new Date();
	yday.setDate(today.getDate() - 1);
	const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
	if (sameDay(d, today)) return 'Today';
	if (sameDay(d, yday)) return 'Yesterday';
	return d.toLocaleDateString();
}
function UnreadBadge({ count }) {
	if (!count || count <= 0) return null;
	return (
		<span className="min-w-[20px] px-1 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-semibold grid place-items-center">
			{count > 99 ? '99+' : count}
		</span>
	);
}
function ReadTicks({ meId, msg }) {
	const mine = msg?.sender?.id === meId;
	if (!mine) return null;
	const isRead = msg?.readBy && Array.isArray(msg.readBy) && msg.readBy.length > 0;
	return (
		<span className="inline-flex items-center gap-1 text-[11px] opacity-80">
			{isRead ? <CheckCheck size={14} className="text-blue-500" /> : <Check size={14} />}
		</span>
	);
}
const getInitial = u => {
	const s = (u?.name || u?.email || '').trim();
	return s ? s[0].toUpperCase() : '?';
};
const pickAvatarClass = seed => {
	const palette = [
		'from-indigo-100 to-blue-100 text-indigo-700 ring-indigo-200/70',
		'from-rose-100 to-pink-100 text-rose-700 ring-rose-200/70',
		'from-emerald-100 to-teal-100 text-emerald-700 ring-emerald-200/70',
		'from-amber-100 to-yellow-100 text-amber-700 ring-amber-200/70',
		'from-violet-100 to-purple-100 text-violet-700 ring-violet-200/70',
		'from-cyan-100 to-sky-100 text-cyan-700 ring-cyan-200/70',
	];
	const str = String(seed || '');
	let h = 0;
	for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
	return palette[h % palette.length];
};

/* ------------------------------- The Page ------------------------------ */
export default function ChatPage() {
	const t = useTranslations('chat');
	const locale = useLocale();
	const router = useRouter();
	const searchParams = useSearchParams();
	const me = useAuthMe();

	const [socket, setSocket] = useState(null);

	const [convos, setConvos] = useState([]);
	const [filterTab, setFilterTab] = useState('all');
	const [activeId, setActiveId] = useState(null);

	const [msgs, setMsgs] = useState([]);
	const [loadingMsgs, setLoadingMsgs] = useState(false);
	const [loadingConvos, setLoadingConvos] = useState(true);

	const [search, setSearch] = useState('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState([]);

	const [sending, setSending] = useState(false);
	const [text, setText] = useState('');
	const [attaches, setAttaches] = useState([]);

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [typing, setTyping] = useState(false);
	const [typingTimeout, setTypingTimeout] = useState(null);

	const listRef = useRef(null);
	const endRef = useRef(null);
	const searchTimerRef = useRef(null);
	const typingTimerRef = useRef(null);

	const hasAttaches = Array.isArray(attaches) && attaches.length > 0;
	const isRTL = locale === 'ar';
	const user = useUser();

	/* -------------------------- Bootstrap data -------------------------- */
	useEffect(() => {
		const uid = searchParams?.get('userId');
		if (uid) {
			(async () => {
				const conv = await getOrCreateDirect(uid);
				await refreshConvos(conv?.id);
			})();
		} else {
			refreshConvos();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	async function refreshConvos(focusId = null) {
		setLoadingConvos(true);
		try {
			const list = await listConversations(1, 50);
			setConvos(list);
			if (focusId) {
				onSelectConversation(focusId);
			} else if (list.length > 0 && !activeId) {
				onSelectConversation(list[0].id);
			}
		} finally {
			setLoadingConvos(false);
		}
	}

	/* ---------------------------- Socket init --------------------------- */
	useEffect(() => {
		if (!me) return;
		const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
		const s = io(API_URL, {
			transports: ['websocket'],
			autoConnect: true,
			withCredentials: true,
			auth: { token },
		});
		setSocket(s);
		return () => s.disconnect();
	}, [me]);

	/* ------------------------- Socket event handlers -------------------- */
	useEffect(() => {
		if (!socket) return;

		function onNewMessage(message) {
			setMsgs(prev => {
				if (message?.conversation?.id !== activeId) return prev;
				const exists = prev.some(m => m.id === message.id || (message.tempId && m.tempId === message.tempId));
				if (exists) return prev;
				return [...prev, message];
			});

			setConvos(prev =>
				prev
					.map(c => {
						if (c.id !== message.conversation.id) return c;
						const isMine = message.sender?.id === me?.id;
						const isActive = c.id === activeId;
						let newUnreadCount = c.unreadCount || 0;
						if (!isMine && !isActive) newUnreadCount = (c.unreadCount || 0) + 1;
						else if (isActive) newUnreadCount = 0;
						return {
							...c,
							lastMessage: message,
							lastMessageAt: message.created_at,
							unreadCount: newUnreadCount,
						};
					})
					.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)),
			);

			if (message?.conversation?.id === activeId && message?.sender?.id !== me?.id) {
				markActiveAsRead();
			}
			scrollToBottom();
		}

		function onMessagesRead({ conversationId, userId }) {
			if (conversationId !== activeId) return;
			setMsgs(prev =>
				prev.map(m => {
					if (m.sender?.id === me?.id) {
						return { ...m, readBy: m.readBy ? [...m.readBy, userId] : [userId] };
					}
					return m;
				}),
			);
		}

		function onConversationUpdated(updatedConvo) {
			setConvos(prev => {
				const exists = prev.find(c => c.id === updatedConvo.id);
				if (!exists) {
					return [updatedConvo, ...prev].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
				}
				return prev
					.map(c => (c.id === updatedConvo.id ? updatedConvo : c))
					.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
			});
		}

		function onUserTyping({ conversationId, typing: isTyping, userId }) {
			if (conversationId !== activeId || userId === me?.id) return;
			setTyping(!!isTyping);
			if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
			if (isTyping) {
				typingTimerRef.current = setTimeout(() => setTyping(false), 3000);
			}
		}

		function onMessageError({ tempId, error }) {
			console.error('Message failed to send:', error);
			setMsgs(prev => prev.filter(m => m.tempId !== tempId));
			setSending(false);
		}

		socket.on('new_message', onNewMessage);
		socket.on('messages_read', onMessagesRead);
		socket.on('conversation_updated', onConversationUpdated);
		socket.on('user_typing', onUserTyping);
		socket.on('message_error', onMessageError);

		return () => {
			socket.off('new_message', onNewMessage);
			socket.off('messages_read', onMessagesRead);
			socket.off('conversation_updated', onConversationUpdated);
			socket.off('user_typing', onUserTyping);
			socket.off('message_error', onMessageError);
			if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
		};
	}, [socket, activeId, me?.id]);

	/* --------------------------- Conversation open ---------------------- */
	async function onSelectConversation(conversationId) {
		setActiveId(conversationId);
		setDrawerOpen(false);
		setLoadingMsgs(true);
		setTyping(false);
		try {
			const data = await getMessages(conversationId, 1, 200);
			setMsgs(data);
			socket?.emit('join_conversation', conversationId);
			setConvos(prev => prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
			markActiveAsRead(conversationId);
			setTimeout(scrollToBottom, 80);
		} finally {
			setLoadingMsgs(false);
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
		}, 60);
	}

	function markActiveAsRead(cid = activeId) {
		if (!cid) return;
		socket?.emit('mark_as_read', cid);
	}

	/* ---------------------------- Searching ----------------------------- */
	useEffect(() => {
		if (!search?.trim()) {
			setResults([]);
			setSearching(false);
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
			return;
		}
		setSearching(true);
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		// faster debounce for phone feel
		searchTimerRef.current = setTimeout(async () => {
			try {
				const users = await searchUsers(search.trim());
				setResults(users);
			} finally {
				setSearching(false);
			}
		}, 500);
		return () => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		};
	}, [search]);

	async function openDirectWith(userId) {
		const conv = await getOrCreateDirect(userId);
		await refreshConvos(conv?.id);
		setResults([]);
		setSearch('');
	}

	async function contactCoach() {
		if (!me?.coachId) {
			alert('No coach assigned to your account');
			return;
		}
		await openDirectWith(me.coachId);
	}

	/* ------------------------- Attachments handling --------------------- */
	function onPickFiles(files) {
		const arr = Array.from(files || []);
		if (!arr.length) return;
		const safe = arr.slice(0, 6);
		const withPreview = safe.map(f => ({
			file: f,
			url: URL.createObjectURL(f),
			type: f.type,
			name: f.name,
			size: f.size,
		}));
		setAttaches(prev => [...prev, ...withPreview]);
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

	/* ------------------------------- Send -------------------------------- */
	async function send() {
		if (!activeId || sending) return;
		const trimmedText = (text || '').trim();
		const hasAtt = Array.isArray(attaches) && attaches.length > 0;
		if (!trimmedText && !hasAtt) return;

		setSending(true);
		try {
			let uploaded = [];
			if (hasAtt) {
				uploaded = await Promise.all(
					attaches.map(async a => {
						try {
							const up = await uploadChatFile(a.file);
							return {
								name: up?.originalname || a?.name || 'file',
								type: up?.mimetype || a?.type || 'application/octet-stream',
								size: up?.size ?? a?.size ?? 0,
								url: up?.url || '',
							};
						} catch (e) {
							console.error('Upload failed:', a?.name, e);
							return null;
						}
					}),
				);
				uploaded = uploaded.filter(Boolean);
			}

			let messageType = 'text';
			if (uploaded.length > 0) {
				const t = uploaded[0].type || '';
				messageType = /^image\//.test(t) ? 'image' : /^video\//.test(t) ? 'video' : 'file';
			}

			const tempId = `tmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const optimistic = {
				id: tempId,
				tempId,
				conversation: { id: activeId },
				sender: me,
				content: trimmedText || null,
				messageType,
				attachments: uploaded.length ? uploaded : null,
				isEdited: false,
				isDeleted: false,
				created_at: new Date().toISOString(),
				readBy: null,
			};

			setMsgs(prev => [...prev, optimistic]);
			scrollToBottom();
			socket?.emit('typing_stop', activeId);

			socket?.emit('send_message', {
				conversationId: activeId,
				content: trimmedText || null,
				messageType,
				attachments: uploaded,
				tempId,
			});

			setText('');
			if (hasAtt) {
				setAttaches(prev => {
					(prev || []).forEach(a => a?.url && URL.revokeObjectURL(a.url));
					return [];
				});
			}
		} catch (err) {
			console.error('Error sending message:', err);
		} finally {
			setSending(false);
		}
	}

	/* --------------------------- Typing indicators ----------------------- */
	function handleTyping() {
		if (!activeId) return;
		socket?.emit('typing_start', activeId);
		if (typingTimeout) clearTimeout(typingTimeout);
		const newTimeout = setTimeout(() => socket?.emit('typing_stop', activeId), 2000);
		setTypingTimeout(newTimeout);
	}

	/* --------------------------- Derived helpers ------------------------- */
	const filteredConvos = useMemo(() => {
		if (filterTab === 'unread') return convos.filter(c => (c.unreadCount || 0) > 0);
		return convos;
	}, [convos, filterTab]);

	const activeConversation = useMemo(() => convos.find(c => c.id === activeId) || null, [convos, activeId]);

	const otherUser = useMemo(() => {
		if (!activeConversation || !me) return null;
		const others = (activeConversation.chatParticipants || []).map(p => p.user).filter(u => u && u.id !== me.id);
		return others[0] || null;
	}, [activeConversation, me]);

	return (
		<div
			className={cls(
				'max-md:w-[calc(100%+20px)] max-md:ltr:ml-[-10px] max-md:rtl:mr-[-10px]',
				'h-[calc(100vh-95px)] md:h-[calc(100vh-150px)] flex flex-col',
				'md:border md:border-slate-200', ui.radius.lg, 'overflow-hidden', ui.gradientSoft
			)}
		>
			{/* Desktop App bar */}
			<div className={cls('hidden md:flex items-center justify-between h-14 px-5 border-b border-slate-200', ui.glass)}>
				<div className="flex items-center gap-2">
					<div className="inline-flex items-center gap-2 px-2.5 h-8 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
						<Bell className="w-4 h-4" /> {t('appbar.title')}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
						<button
							onClick={() => setFilterTab('all')}
							className={cls('px-3 h-8 rounded-full text-xs font-medium transition-colors', ui.ringFocus, filterTab === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900')}
						>
							{t('tabs.all')}
						</button>
						<button
							onClick={() => setFilterTab('unread')}
							className={cls('px-3 h-8 rounded-full text-xs font-medium transition-colors', ui.ringFocus, filterTab === 'unread' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900')}
						>
							{t('tabs.unread')}
						</button>
					</div>

					{user.role === 'client' && (
						<button
							type="button"
							onClick={contactCoach}
							className={cls('h-10 rounded-lg border border-slate-200 bg-white/90 text-slate-800 text-sm inline-flex items-center justify-center px-3 gap-2 hover:bg-slate-50 active:scale-[.99] transition', ui.shadow.sm)}
						>
							<Phone size={16} />
							{t('quick.coach')}
						</button>
					)}
				</div>
			</div>

			{/* Content grid */}
			<div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)]">
				{/* Desktop sidebar */}
				<aside className={cls('hidden md:flex min-h-0 rtl:border-l ltr:border-r border-slate-200/70', ui.glass, 'flex-col')}>
					{/* Search (sticky) */}
					<div className={cls('border-b border-slate-200/70 z-10 px-3 py-2', ui.glass)}>
						<div className="relative group">
							<Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
							<input
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder={t('search.placeholder')}
								aria-label={t('search.placeholder')}
								className={cls('h-11 w-full ltr:pl-10 rtl:pr-10 ltr:pr-12 rtl:pl-12 rounded-lg border border-slate-200 bg-slate-50/90 text-slate-900 transition', ui.ringFocus)}
							/>
							{searching && <Loader2 className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400 pointer-events-none" />}
							{!!search && !searching && (
								<button
									type="button"
									onClick={() => setSearch('')}
									aria-label={t('search.clear', { defaultValue: 'Clear search' })}
									className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-100 active:scale-95 transition"
								>
									<X className="w-4 h-4 text-slate-400" />
								</button>
							)}
						</div>

						{/* Results */}
						{searching ? null : search && results.length === 0 ? (
							<div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-6 text-center">
								<div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
									<Inbox className="w-6 h-6 text-slate-400" />
								</div>
								<div className="text-sm font-medium text-slate-700">{t('search.noResultsTitle', { defaultValue: 'No matches found' })}</div>
								<div className="text-xs text-slate-500 mt-1">{t('search.noResultsHint', { defaultValue: 'Try a different name or email' })}</div>
							</div>
						) : (
							!!results.length && (
								<div className="mt-3 rounded-lg border border-slate-200 overflow-hidden bg-white/80">
									<div className="px-3 py-2 text-xs text-slate-500 bg-slate-50">{t('search.results')}</div>
									<ul className="max-h-64 overflow-auto">
										{results.map(u => {
											const initial = getInitial(u);
											const avatarTone = pickAvatarClass(u.id || u.email);
											return (
												<li key={u.id} className="border-t border-slate-100">
													<button
														onClick={() => openDirectWith(u.id)}
														className={cls('w-full px-3 py-2 text-left hover:bg-slate-50 active:bg-slate-100/60 flex items-center gap-3 transition group', ui.ringFocus)}
													>
														<div className={cls('h-8 w-8 rounded-lg bg-gradient-to-br grid place-items-center overflow-hidden ring-1 ring-inset', avatarTone)}>
															<span className="text-[11px] font-bold leading-none select-none">{initial}</span>
														</div>
														<div className="min-w-0 flex-1 flex flex-col">
															<MultiLangText className="text-sm font-medium text-slate-900 truncate group-hover:text-slate-950">{u.name || u.email}</MultiLangText>
															<MultiLangText className="text-xs text-slate-500 truncate">{u.email}</MultiLangText>
														</div>
														<ChevronRight className="w-4 h-4 text-slate-300 rtl:rotate-180 group-hover:text-slate-400" />
													</button>
												</li>
											);
										})}
									</ul>
								</div>
							)
						)}
					</div>

					{/* Conversation list */}
					<div ref={listRef} className="flex-1 overflow-auto p-2">
						{loadingConvos ? (
							<div className="p-4 space-y-3">
								{[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-slate-100/80 animate-pulse" />)}
							</div>
						) : filteredConvos.length ? (
							<ul className="space-y-2">
								{filteredConvos.map(c => {
									const others = (c.chatParticipants || []).map(p => p.user).filter(u => me && u?.id !== me.id);
									const title = c.isGroup ? c.name || t('list.group') : others[0]?.name || others[0]?.email || t('list.direct');
									const last = c.lastMessage;
									const preview =
										last?.messageType === 'text' ? last?.content :
											last?.messageType === 'image' ? t('list.photo') :
												last?.messageType === 'video' ? t('list.video') :
													last?.messageType === 'file' ? t('list.file') : '';

									const isActive = activeId === c.id;
									const hasUnread = Number(c.unreadCount) > 0;

									return (
										<li key={c.id}>
											<button
												onClick={() => onSelectConversation(c.id)}
												className={cls(
													'w-full px-3 py-3 text-left rounded-lg transition-all duration-200 group',
													ui.ringFocus,
													isActive ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'bg-white/70 hover:bg-white active:bg-white/80 border border-transparent'
												)}
											>
												<div className="flex items-center gap-3">
													<div className={cls('h-11 w-11 rounded-lg grid place-items-center overflow-hidden ring-1 ring-inset',
														hasUnread ? 'bg-gradient-to-br from-indigo-100 to-blue-100 ring-indigo-200' : 'bg-slate-100 ring-slate-200')}>
														<UserCircle2 className={cls('w-6 h-6', hasUnread ? 'text-indigo-600' : 'text-slate-500')} />
													</div>

													<div className="min-w-0 flex-1">
														<div className="flex items-center justify-between gap-2">
															<MultiLangText className="text-sm font-semibold text-slate-900 truncate">{title}</MultiLangText>
															<div className="font-en text-[11px] text-slate-500 shrink-0 tabular-nums">{last?.created_at ? timeHHMM(last.created_at) : ''}</div>
														</div>

														<div className="flex items-center justify-between gap-2 mt-1">
															<MultiLangText className="text-xs text-slate-500 truncate flex-1 rtl:text-right">{preview}</MultiLangText>
															<UnreadBadge count={c.unreadCount} />
														</div>
													</div>
												</div>
											</button>
										</li>
									);
								})}
							</ul>
						) : (
							<div className="p-10 text-center text-slate-500">
								<div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
									<Inbox className="w-6 h-6 opacity-70" />
								</div>
								<div className="text-sm font-medium">{t('list.empty')}</div>
								<div className="text-xs mt-1 opacity-80">{t('list.startHint', { defaultValue: 'Use search to start a chat' })}</div>
							</div>
						)}
					</div>
				</aside>

				{/* Conversation area */}
				<section className="flex flex-col min-h-0">
					<div className={cls('md:hidden h-14 border-b border-slate-200/70 px-3 flex items-center justify-between', ui.glass)}>

						<div className='flex items-center gap-2' >
							<button
								onClick={() => setDrawerOpen(true)}
								className={cls('flex-none inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition', ui.ringFocus)}
								title={t('actions.openList')} aria-label={t('actions.openList')}
							>
								<Menu className="w-5 h-5" />
							</button>
							<div className="text-sm w-full px-2 font-semibold">{t('appbar.title')}</div>
						</div>

						<button
							onClick={() => setDrawerOpen(true)}
							className={cls('h-10 w-10 rounded-xl border border-slate-200 bg-white grid place-items-center', ui.ringFocus)}
							aria-label={t('actions.openList')}
							title={t('actions.openList')}
						>
							<Search className="w-5 h-5" />
						</button>
					</div>

					<div className={cls('hidden md:flex h-14 border-b border-slate-200/70 px-3 items-center gap-3', ui.glass)}>
						{otherUser ? (
							<>
								<div className="relative">
									<div className={cls('h-9 w-9 rounded-lg bg-gradient-to-br grid place-items-center overflow-hidden ring-1 ring-inset', pickAvatarClass(otherUser.id || otherUser.email))}>
										<MultiLangText className="text-[11px] font-bold leading-none select-none">{getInitial(otherUser)}</MultiLangText>
									</div>
									{otherUser?.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
								</div>
								<div className="min-w-0">
									<MultiLangText className="text-sm font-semibold text-slate-900 truncate">{otherUser.name || otherUser.email}</MultiLangText>
									<div className="text-[11px] text-slate-500">{typing ? t('header.typing') : t('header.direct')}</div>
								</div>
							</>
						) : activeId ? (
							<div className="text-sm text-slate-500">{t('header.loading')}</div>
						) : (
							<div className="text-sm text-slate-500">{t('header.noselect')}</div>
						)}
					</div>

					<div className=" max-md:max-h-[calc(100%-120px)] space-y-2  flex-1 min-h-0 overflow-y-auto px-3 py-4 bg-gradient-to-b from-slate-50/60 to-slate-100/40">
						{!activeId ? (
							<div className="h-full grid place-items-center text-slate-500 text-sm">
								<div className="text-center">
									<div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200">
										<Inbox className="w-6 h-6 text-slate-400" />
									</div>
									<div>{t('empty.pick')}</div>
									<div className="text-xs text-slate-400 mt-1">{t('empty.hint', { defaultValue: 'Select a conversation from the list' })}</div>
								</div>
							</div>
						) : loadingMsgs ? (
							<MessageSkeleton />
						) : (
							<MessageList msgs={msgs} me={me} API_URL={API_URL} endRef={endRef} t={t} typing={typing} />
						)}
					</div>

					{/* Composer (safe-area for phone) */}
					<div className={cls('border-t border-slate-200/70 p-2', ui.glass)} style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
						{!activeId ? (
							<div className="text-center text-xs text-slate-500 py-4">{t('composer.disabled')}</div>
						) : (
							<>
								{!!attaches.length && (
									<div className="px-1 pb-2 flex gap-2 overflow-x-auto">
										{attaches.map((a, idx) => (
											<div key={idx} className="relative shrink-0 group">
												{/^\s*image\//.test(a.type) ? (
													<img src={a.url} alt={a.name} className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
												) : /^\s*video\//.test(a.type) ? (
													<div className="h-16 w-24 rounded-lg border border-slate-200 grid place-items-center bg-slate-50 shadow-sm">
														<Video className="w-5 h-5 text-slate-600" />
													</div>
												) : (
													<div className="h-16 w-24 rounded-lg border border-slate-200 grid place-items-center bg-slate-50 shadow-sm">
														<FileIcon className="w-5 h-5 text-slate-600" />
													</div>
												)}
												<div className="absolute bottom-1 ltr:left-1 ltr:right-7 rtl:right-1 rtl:left-7 truncate text-[10px] px-1 py-0.5 rounded-md bg-black/60 text-white">{a.name}</div>
												<button
													onClick={() => removeAttach(idx)}
													className={cls('absolute top-1 ltr:right-1 rtl:left-1 h-6 w-6 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black/90 transition-colors shadow', ui.ringFocus)}
													title={t('composer.remove')}
													aria-label={t('composer.remove')}
												>
													<X size={14} />
												</button>
											</div>
										))}
									</div>
								)}

								<div className="flex items-end gap-2">
									{/* Composer shell */}
									<div className="relative flex-1">
										<input
											value={text}
											onChange={e => {
												setText(e.target.value);
												handleTyping();
												const el = e.target;
												el.style.height = 'auto';
												el.style.height = Math.min(el.scrollHeight, 160) + 'px';
											}}
											onInput={e => {
												const el = e.currentTarget;
												el.style.height = 'auto';
												el.style.height = Math.min(el.scrollHeight, 160) + 'px';
											}}
											onKeyDown={e => {
												const isSend = (e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey));
												if (isSend) {
													e.preventDefault();
													send();
												}
											}}
											onBlur={() => {
												if (activeId) socket?.emit('typing_stop', activeId);
												if (typingTimeout) clearTimeout(typingTimeout);
											}}
											rows={1}
											placeholder={t('composer.placeholder')}
											className={cls(
												'h-auto min-h-[48px] max-h-[160px] w-full rounded-lg  bg-white/90 text-slate-900',
												'border border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100  transition px-3 py-2 text-base resize-none',
												ui.ringFocus,
												'ltr:pr-[160px] rtl:pl-[160px]'
											)}
										/>

										{/* End cluster – send & pickers */}
										<div className="pointer-events-auto absolute inset-y-0 ltr:right-[5px] rtl:left-[5px] flex gap-1 items-center top-0">
											<button
												onClick={send}
												disabled={sending || (!text.trim() && !hasAttaches)}
												className={cls('h-9 w-9 rounded-lg bg-indigo-600 text-white grid place-items-center disabled:opacity-60 hover:bg-indigo-700 active:scale-95 transition-all duration-200', ui.shadow.sm, ui.ringFocus)}
												title={t('composer.send')}
												aria-label={t('composer.send')}
											>
												{sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
											</button>

											<label className={cls('h-9 w-9 grid place-items-center rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 active:scale-95 transition ', ui.ringFocus)}>
												<ImageIcon className="w-5 h-5 text-slate-600" />
												<input type="file" className="hidden" accept="image/*" multiple onChange={e => onPickFiles(e.target.files)} />
											</label>

											<label className={cls('h-9 w-9 grid place-items-center rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 active:scale-95 transition ', ui.ringFocus)}>
												<Video className="w-5 h-5 text-slate-600" />
												<input type="file" className="hidden" accept="video/*" multiple onChange={e => onPickFiles(e.target.files)} />
											</label>

											<label className={cls('h-9 w-9 grid place-items-center rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 active:scale-95 transition ', ui.ringFocus)}>
												<Paperclip className="w-5 h-5 text-slate-600" />
												<input type="file" className="hidden" multiple onChange={e => onPickFiles(e.target.files)} />
											</label>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				</section>
			</div>


			{/* Mobile conversations drawer */}
			<AnimatePresence>
				{drawerOpen && (
					<motion.aside
						initial={{ x: isRTL ? '100%' : '-100%' }}
						animate={{ x: 0 }}
						exit={{ x: isRTL ? '100%' : '-100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className="fixed inset-0 z-50 md:hidden bg-white"
						dir={isRTL ? 'rtl' : 'ltr'}
					>
						<div className={cls('h-14 border-b border-slate-200/70 px-3 flex items-center justify-between', ui.glass)}>
							<div className="text-sm font-semibold">{t('appbar.title')}</div>
							<button
								onClick={() => setDrawerOpen(false)}
								className={cls(
									'inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-slate-200',
									'bg-white hover:bg-slate-100 active:bg-slate-200 transition-all duration-200',
									'text-slate-700 font-medium  ',
									'focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none',
									ui.ringFocus
								)}
							>
								<span className="text-sm font-semibold tracking-wide">{t('actions.close')}</span>
							</button>

						</div>

						<div className="p-3 border-b border-slate-200/70">
							<div className="relative">
								<Search className={cls('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400', isRTL ? 'right-3' : 'left-3')} />
								<input
									value={search}
									onChange={e => setSearch(e.target.value)}
									placeholder={t('search.placeholder')}
									className={cls('w-full h-11 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white', ui.ringFocus, isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3')}
								/>
								{searching && <Loader2 className={cls('absolute top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400', isRTL ? 'left-3' : 'right-3')} />}
							</div>

							{user.role === 'client' && (
								<button
									type="button"
									onClick={contactCoach}
									className={cls('mt-3 w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm inline-flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors', ui.ringFocus)}
								>
									<Phone size={16} /> {t('quick.coach')}
								</button>
							)}

							{!!results.length && (
								<div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
									<div className="px-3 py-2 text-xs text-slate-500 bg-slate-50">{t('search.results')}</div>
									<ul className="max-h-64 overflow-auto">
										{results.map(u => (
											<li key={u.id} className="border-t border-slate-100">
												<button
													onClick={() => openDirectWith(u.id)}
													className={cls('w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-3', ui.ringFocus, isRTL ? 'text-right justify-end' : 'text-left')}
												>
													{!isRTL && <UserCircle2 className="w-6 h-6 text-slate-500" />}
													<div className="min-w-0 flex-1">
														<MultiLangText className="text-sm font-medium text-slate-900 truncate">{u.name || u.email}</MultiLangText>
													</div>
													{isRTL && <UserCircle2 className="w-6 h-6 text-slate-500" />}
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>

						<div className="p-2 h-[calc(100%-140px)] overflow-auto">
							{filteredConvos.length ? (
								<ul className="space-y-2">
									{filteredConvos.map(c => {
										const others = (c.chatParticipants || []).map(p => p.user).filter(u => me && u?.id !== me.id);
										const title = c.isGroup ? c.name || t('list.group') : others[0]?.name || others[0]?.email || t('list.direct');
										const last = c.lastMessage;
										const preview =
											last?.messageType === 'text' ? last?.content :
												last?.messageType === 'image' ? t('list.photo') :
													last?.messageType === 'video' ? t('list.video') :
														last?.messageType === 'file' ? t('list.file') : '';

										return (
											<li key={c.id}>
												<button
													onClick={() => onSelectConversation(c.id)}
													className={cls('w-full px-3 py-3 rounded-xl transition-all duration-200 border', ui.ringFocus, activeId === c.id ? 'bg-white shadow-sm border-slate-200' : 'border-transparent hover:bg-white/80 bg-white/60')}
												>
													<div className={cls('flex items-center gap-3', isRTL ? 'flex-row-reverse' : '')}>
														<div className="min-w-0 flex-1">
															<div className={cls('flex items-center justify-between gap-2', isRTL ? 'flex-row-reverse' : '')}>
																<div className="font-en text-[11px] text-slate-500 shrink-0">{last?.created_at ? timeHHMM(last.created_at) : ''}</div>
																<MultiLangText className="text-sm font-semibold text-slate-900 truncate">{title}</MultiLangText>
															</div>
															<div className={cls('flex items-center justify-between gap-2 mt-1', isRTL ? 'flex-row-reverse' : '')}>
																<UnreadBadge count={c.unreadCount} />
																<MultiLangText className="text-xs text-slate-500 truncate flex-1 rtl:text-left ltr:text-right">{preview}</MultiLangText>
															</div>
														</div>
														<div className="h-11 w-11 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 grid place-items-center overflow-hidden">
															<UserCircle2 className="w-6 h-6 text-indigo-500" />
														</div>
													</div>
												</button>
											</li>
										);
									})}
								</ul>
							) : (
								<div className="p-8 text-center text-slate-500">
									<Inbox className="mx-auto mb-2 w-6 h-6 opacity-60" />
									<div className="text-sm">{t('list.empty')}</div>
								</div>
							)}
						</div>
					</motion.aside>
				)}
			</AnimatePresence>
		</div>
	);
}

/* --------------------------- MessageList --------------------------- */
function MessageList({ msgs, me, API_URL, endRef, t, typing }) {
	const groups = [];
	let lastDate = '';

	// Group messages by date
	msgs.forEach(m => {
		const d = new Date(m.created_at).toDateString();
		if (d !== lastDate) {
			groups.push({ type: 'sep', label: dateLabel(m.created_at), id: `sep-${m.created_at}` });
			lastDate = d;
		}
		groups.push({ type: 'msg', data: m });
	});

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		const id = setTimeout(() => {
			endRef.current?.scrollIntoView({ behavior: 'smooth' });
		}, 80);
		return () => clearTimeout(id);
	}, [msgs, typing, endRef]);

	return (
		<>
			{groups.map(item => {
				if (item.type === 'sep') {
					return (
						<div key={item.id} className="sticky  top-2 z-10">
							<MultiLangText className="mx-auto block w-fit text-[11px] px-2 py-1 rounded-full bg-white/85 border border-slate-200 text-slate-600 shadow-sm">
								{item.label}
							</MultiLangText>
						</div>
					);
				}

				const m = item.data;
				const mine = (m?.sender?.id ?? m?.senderId) === me?.id;
				const other = m?.sender || m?.from || m?.user || {}; // flexible
				const time = timeHHMM(m.created_at);

				const Content = () => {
					if (m.messageType === 'text' && !!m.content) {
						return <MultiLangText className="whitespace-pre-wrap text-[15px] leading-6 break-words">{m.content}</MultiLangText>;
					}
					if (m.messageType === 'image' && Array.isArray(m.attachments)) {
						return (
							<div className="grid grid-cols-2 gap-2">
								{m.attachments.map((a, i) => (
									<a key={i} href={`${API_URL}${a.url}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 hover:opacity-90 transition">
										<Img src={`${a.url}`} alt={a.name} className="w-full h-40 object-cover" />
									</a>
								))}
							</div>
						);
					}
					if (m.messageType === 'video' && Array.isArray(m.attachments)) {
						return (
							<div className="space-y-2">
								{m.attachments.map((a, i) => (
									<video key={i} src={`${API_URL}${a.url}`} controls className="w-full rounded-lg overflow-hidden max-h-64 border border-slate-200" />
								))}
							</div>
						);
					}
					if (m.messageType === 'file' && Array.isArray(m.attachments)) {
						return (
							<div className="space-y-2">
								{m.attachments.map((a, i) => (
									<a
										key={i}
										href={`${API_URL}${a.url}`}
										target="_blank"
										rel="noreferrer"
										className={cls('flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border', mine ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700')}
									>
										<FileIcon className={cls('w-4 h-4', mine ? 'text-white' : 'text-slate-600')} />
										<span className="text-xs truncate flex-1">{a.name}</span>
										<span className={cls('text-[11px] tabular-nums', mine ? 'opacity-90' : 'text-slate-500')}>{a.size ? `(${Math.round(a.size / 1024)} KB)` : ''}</span>
									</a>
								))}
							</div>
						);
					}
					return null;
				};

				return (
					<div key={m.id || m.tempId} className={cls(' pt-2 flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
						{!mine && (
							<div
								className={cls('  h-8 w-8 rounded-full bg-gradient-to-br grid place-items-center ring-1 ring-inset shrink-0 select-none', pickAvatarClass(other?.id || other?.email))}
								title={other?.name || other?.email}
							>
								<span className="text-[11px] font-bold font-en">{getInitial(other)}</span>
							</div>
						)}

						<motion.div
							initial={{ opacity: 0, y: 8, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							className={cls('relative max-w-[400px] rounded-2xl px-3 py-2 shadow-sm',
								mine ? 'bg-indigo-600 text-white rtl:rounded-bl-sm ltr:rounded-br-sm' : 'bg-white text-slate-800 rtl:rounded-br-sm ltr:rounded-bl-sm border border-slate-200')}
						>
							<Content />
							<div className={cls('mt-1 text-[11px] flex items-center gap-1 tabular-nums', mine ? 'text-white/80' : 'text-slate-500')}>
								<MultiLangText>{time}</MultiLangText>
								<ReadTicks meId={me?.id} msg={m} />
							</div>
						</motion.div>
					</div>
				);
			})}

			{/* Typing indicator */}
			{typing && (
				<div className="flex justify-start items-end gap-2">
					<div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 ring-1 ring-inset ring-indigo-200/70 grid place-items-center select-none">
						<span className="text-[11px] font-bold">…</span>
					</div>
					<div className="relative max-w-[78%] rounded-2xl px-3 py-3 shadow-sm bg-white border border-slate-200 rtl:rounded-br-sm ltr:rounded-bl-sm">
						<div className="flex gap-1 items-center">
							<div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
							<div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
							<div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
						</div>
					</div>
				</div>
			)}

			<div ref={endRef} />
		</>
	);
}

const MessageSkeleton = () => (
	<div className="p-4 space-y-3">
		{[...Array(6)].map((_, i) => {
			const mine = i % 2 === 1;
			return (
				<div key={i} className={cls('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
					{!mine && <div className="h-8 w-8 rounded-full bg-slate-200/70" />}
					<div className={cls('rounded-2xl h-14 animate-pulse', mine ? 'bg-indigo-200/40 w-48' : 'bg-slate-200/70 w-56 border border-slate-200')} />
				</div>
			);
		})}
	</div>
);
