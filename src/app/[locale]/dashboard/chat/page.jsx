'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import io from 'socket.io-client';
import { Paperclip, Image as ImageIcon, Send, Search, Phone, UserCircle2, ChevronLeft, Loader2, Check, CheckCheck, Video, File as FileIcon, X, Inbox, Menu, ChevronRight, Bell, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { useUser } from '@/hooks/useUser';
import { useValues } from '@/context/GlobalContext';
import { useTheme } from '@/app/[locale]/theme';

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;
const cls = (...a) => a.filter(Boolean).join(' ');

/* --------- Design tokens with theme support --------- */
const ui = {
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-lg',
    lg: 'rounded-lg',
    xl: 'rounded-lg',
  },
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },
  glass: 'bg-white/80 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-md',
  ringFocus: 'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus-visible:ring-2 focus-visible:ring-primary-500/30',
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
    <span className='min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white text-[10px] font-bold grid place-items-center shadow-sm'>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function ReadTicks({ meId, msg }) {
  const mine = msg?.sender?.id === meId;
  if (!mine) return null;
  const isRead = msg?.readBy && Array.isArray(msg.readBy) && msg.readBy.length > 0;
  return (
    <span className='inline-flex items-center gap-0.5 text-[10px] opacity-90'>
      {isRead ? <CheckCheck size={13} className='text-white/90' /> : <Check size={13} className='text-white/70' />}
    </span>
  );
}

const getInitial = u => {
  const s = (u?.name || u?.email || '').trim();
  return s ? s[0].toUpperCase() : '?';
};

const pickAvatarGradient = (seed, colors) => {
  const gradients = [
    `from-[${colors.primary[100]}] to-[${colors.primary[200]}] text-[${colors.primary[700]}]`,
    `from-[${colors.secondary[100]}] to-[${colors.secondary[200]}] text-[${colors.secondary[700]}]`,
    `from-rose-100 to-pink-100 text-rose-700`,
    `from-emerald-100 to-teal-100 text-emerald-700`,
    `from-amber-100 to-yellow-100 text-amber-700`,
    `from-cyan-100 to-sky-100 text-cyan-700`,
  ];
  const str = String(seed || '');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
};

/* ------------------------------- The Page ------------------------------ */
export default function ChatPage() {
  const t = useTranslations('chat');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const me = useAuthMe();
  const { theme, colors } = useTheme();

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
        return prev.map(c => (c.id === updatedConvo.id ? updatedConvo : c)).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
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
  const { setConversationId } = useValues();

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
      const index = convos?.find(c => c.id === conversationId);
      setConversationId(conversationId);
      if (index?.unreadCount > 0) {
      }
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
    searchTimerRef.current = setTimeout(async () => {
      try {
        const users = await searchUsers(search.trim());
        setResults(users);
      } finally {
        setSearching(false);
      }
    }, 400);
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
  async function contactAdmin() {
    if (!me?.adminId) {
      alert('No admin assigned to your account');
      return;
    }
    await openDirectWith(me.adminId);
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
        'md:border border-slate-200/60',
        ui.radius.xl,
        'overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100/50',
        'shadow-xl shadow-slate-200/50'
      )}
    >
      {/* Desktop App bar - Enhanced with gradient */}
      <div className={cls(
        'hidden md:flex items-center justify-between h-16 px-4',
        'border-b border-slate-200/60',
        'bg-gradient-to-r from-white/95 via-white/90 to-white/95 backdrop-blur-xl'
      )}>
        <div className='flex items-center gap-3'>
          <div className='inline-flex items-center gap-2 px-4 h-10 rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] text-white text-sm font-bold shadow-lg shadow-[var(--color-primary-500)]/20'>
            <Sparkles className='w-4 h-4' />
            <span>{t('appbar.title')}</span>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <div className='inline-flex items-center rounded-lg border border-slate-200 bg-white/80 p-1 shadow-sm'>
            <button 
              onClick={() => setFilterTab('all')} 
              className={cls(
                'px-4 h-9 rounded-lg text-sm font-medium transition-all duration-200',
                ui.ringFocus,
                filterTab === 'all' 
                  ? 'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] text-white shadow-md shadow-[var(--color-primary-500)]/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {t('tabs.all')}
            </button>
            <button 
              onClick={() => setFilterTab('unread')} 
              className={cls(
                'px-4 h-9 rounded-lg text-sm font-medium transition-all duration-200',
                ui.ringFocus,
                filterTab === 'unread' 
                  ? 'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] text-white shadow-md shadow-[var(--color-primary-500)]/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {t('tabs.unread')}
            </button>
          </div>

          {user.role === 'client' && (
            <div className='gap-2 flex items-center'>
              <button 
                type='button' 
                onClick={contactCoach} 
                className={cls(
                  'h-10 rounded-lg border border-slate-200/60 bg-white text-slate-700 text-sm font-medium',
                  'inline-flex items-center justify-center px-4 gap-2',
                  'hover:bg-gradient-to-r hover:from-[var(--color-primary-50)] hover:to-[var(--color-secondary-50)]',
                  'active:scale-[.98] transition-all duration-200',
                  'shadow-sm hover:shadow-md',
                  ui.ringFocus
                )}
              >
                <Phone size={16} />
                {t('quick.coach')}
              </button>
              {me?.adminId && (
                <button 
                  type='button' 
                  onClick={contactAdmin} 
                  className={cls(
                    'h-10 rounded-lg border border-slate-200/60 bg-white text-slate-700 text-sm font-medium',
                    'inline-flex items-center justify-center px-4 gap-2',
                    'hover:bg-gradient-to-r hover:from-[var(--color-primary-50)] hover:to-[var(--color-secondary-50)]',
                    'active:scale-[.98] transition-all duration-200',
                    'shadow-sm hover:shadow-md',
                    ui.ringFocus
                  )}
                >
                  <Phone size={16} />
                  {t('quick.admin')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content grid */}
      <div className='flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[380px_minmax(0,1fr)]'>
        {/* Desktop sidebar - Enhanced design */}
        <aside className={cls(
          'hidden md:flex min-h-0 rtl:border-l ltr:border-r border-slate-200/60',
          'bg-gradient-to-b from-white/80 to-slate-50/80 backdrop-blur-sm',
          'flex-col'
        )}>
          {/* Search (sticky) - Enhanced */}
          <div className='border-b border-slate-200/60 z-10 px-4 py-3 bg-white/60 backdrop-blur-sm'>
            <div className='relative group'>
              <Search className='absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-primary-500)] transition-all duration-200' />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder={t('search.placeholder')} 
                aria-label={t('search.placeholder')} 
                className={cls(
                  'h-12 w-full ltr:pl-12 rtl:pr-12 ltr:pr-12 rtl:pl-12',
                  'rounded-lg border-2 border-slate-200/60',
                  'bg-white/80 text-slate-900 placeholder:text-slate-400',
                  'transition-all duration-200',
                  'hover:border-slate-300',
                  'focus:border-[var(--color-primary-400)] focus:bg-white focus:shadow-lg focus:shadow-[var(--color-primary-500)]/10',
                  ui.ringFocus
                )}
              />
              {searching && <Loader2 className='absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[var(--color-primary-500)]' />}
              {!!search && !searching && (
                <button 
                  type='button' 
                  onClick={() => setSearch('')} 
                  aria-label={t('search.clear', { defaultValue: 'Clear search' })} 
                  className='absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 active:scale-95 transition-all duration-200'
                >
                  <X className='w-4 h-4 text-slate-400' />
                </button>
              )}
            </div>

            {/* Results - Enhanced */}
            {searching ? null : search && results.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className='mt-3 rounded-lg border border-slate-200/60 bg-white/90 backdrop-blur-sm p-8 text-center shadow-sm'
              >
                <div className='mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200/60'>
                  <Inbox className='w-7 h-7 text-slate-400' />
                </div>
                <div className='text-sm font-semibold text-slate-700'>{t('search.noResultsTitle', { defaultValue: 'No matches found' })}</div>
                <div className='text-xs text-slate-500 mt-2'>{t('search.noResultsHint', { defaultValue: 'Try a different name or email' })}</div>
              </motion.div>
            ) : (
              !!results.length && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='mt-3 rounded-lg border border-slate-200/60 overflow-hidden bg-white/95 backdrop-blur-sm shadow-sm'
                >
                  <div className='px-4 py-2.5 text-xs font-semibold text-slate-600 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60'>
                    {t('search.results')}
                  </div>
                  <ul className='max-h-72 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
                    {results.map(u => {
                      const initial = getInitial(u);
                      const avatarGradient = pickAvatarGradient(u.id || u.email, colors);
                      return (
                        <li key={u.id} className='border-t border-slate-100/60 first:border-t-0'>
                          <button 
                            onClick={() => openDirectWith(u.id)} 
                            className={cls(
                              'w-full px-4 py-3 text-left',
                              'hover:bg-gradient-to-r hover:from-[var(--color-primary-50)]/50 hover:to-white',
                              'active:bg-[var(--color-primary-50)]',
                              'flex items-center gap-3 transition-all duration-200 group',
                              ui.ringFocus
                            )}
                          >
                            <div className={cls(
                              'h-10 w-10 rounded-lg bg-gradient-to-br grid place-items-center overflow-hidden',
                              'ring-2 ring-slate-200/60 shadow-sm',
                              'group-hover:ring-[var(--color-primary-300)] group-hover:shadow-md group-hover:shadow-[var(--color-primary-500)]/10',
                              'transition-all duration-200',
                              avatarGradient
                            )}>
                              <span className='text-sm font-bold leading-none select-none'>{initial}</span>
                            </div>
                            <div className='min-w-0 flex-1 flex flex-col'>
                              <MultiLangText className='text-sm font-semibold text-slate-900 truncate group-hover:text-[var(--color-primary-700)]'>
                                {u.name || u.email}
                              </MultiLangText>
                              <MultiLangText className='text-xs text-slate-500 truncate'>{u.email}</MultiLangText>
                            </div>
                            <ChevronRight className='w-5 h-5 text-slate-300 rtl:rotate-180 group-hover:text-[var(--color-primary-500)] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all duration-200' />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )
            )}
          </div>

          {/* Conversation list - Enhanced */}
          <div ref={listRef} className='flex-1 overflow-auto p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
            {loadingConvos ? (
              <div className='space-y-3'>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className='h-20 rounded-lg bg-gradient-to-r from-slate-100/80 to-slate-200/40 animate-pulse' />
                ))}
              </div>
            ) : filteredConvos.length ? (
              <ul className='space-y-2'>
                {filteredConvos.map(c => {
                  const others = (c.chatParticipants || []).map(p => p.user).filter(u => me && u?.id !== me.id);
                  const title = c.isGroup ? c.name || t('list.group') : others[0]?.name || others[0]?.email || t('list.direct');
                  const last = c.lastMessage;
                  const preview = last?.messageType === 'text' ? last?.content : last?.messageType === 'image' ? t('list.photo') : last?.messageType === 'video' ? t('list.video') : last?.messageType === 'file' ? t('list.file') : '';

                  const isActive = activeId === c.id;
                  const hasUnread = Number(c.unreadCount) > 0;

                  return (
                    <motion.li 
                      key={c.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button 
                        onClick={() => onSelectConversation(c.id)} 
                        className={cls(
                          'w-full px-4 py-4 text-left rounded-lg transition-all duration-200',
                          ui.ringFocus,
                          isActive 
                            ? 'bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] shadow-md ring-2 ring-[var(--color-primary-200)] border border-[var(--color-primary-200)]' 
                            : 'bg-white/70 hover:bg-white hover:shadow-md border border-slate-200/60 hover:border-slate-300'
                        )}
                      >
                        <div className='flex items-center gap-3'>
                          <div className='relative group/avatar'>
                            <div className={cls(
                              'h-12 w-12 rounded-lg grid place-items-center overflow-hidden',
                              'transition-all duration-300 ease-out transform',
                              'shadow-sm',
                              hasUnread 
                                ? 'bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] ring-2 ring-[var(--color-primary-300)] shadow-lg shadow-[var(--color-primary-500)]/20 group-hover/avatar:shadow-xl group-hover/avatar:shadow-[var(--color-primary-500)]/30' 
                                : 'bg-gradient-to-br from-slate-200 to-slate-100 ring-2 ring-slate-200/60 group-hover/avatar:shadow-md',
                              'group-hover/avatar:-translate-y-0.5 group-hover/avatar:scale-105'
                            )}>
                              <UserCircle2 className={cls(
                                'w-7 h-7 drop-shadow-sm transition-colors duration-300',
                                hasUnread ? 'text-white' : 'text-slate-600'
                              )} />
                            </div>

                            {others?.[0]?.email && (
                              <div className='pointer-events-none absolute top-0 mt-2 px-3 py-2 rounded-lg bg-slate-900/95 text-white text-xs whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 transition-all duration-200 origin-top group-hover/avatar:opacity-100 group-hover/avatar:scale-100 group-hover/avatar:translate-y-0 ltr:left-[56px] rtl:right-[56px] z-10'>
                                {others[0].email}
                                <div className='absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900/95 rotate-45 ltr:-left-1 rtl:-right-1' />
                              </div>
                            )}
                          </div>

                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center justify-between gap-2 mb-1'>
                              <MultiLangText className={cls(
                                'rtl:text-right ltr:text-left text-sm font-bold truncate',
                                isActive ? 'text-[var(--color-primary-700)]' : 'text-slate-900'
                              )}>
                                {title}
                              </MultiLangText>
                              <UnreadBadge count={c.unreadCount} />
                            </div>

                            <div className='flex items-center justify-between gap-2'>
                              <MultiLangText className='text-xs text-slate-500 truncate flex-1 rtl:text-right'>
                                {preview}
                              </MultiLangText>
                              <div className='font-en text-[11px] text-slate-400 shrink-0 tabular-nums font-medium'>
                                {last?.created_at ? timeHHMM(last.created_at) : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            ) : (
              <div className='p-12 text-center text-slate-500'>
                <div className='mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200/60 shadow-sm'>
                  <Inbox className='w-8 h-8 text-slate-400' />
                </div>
                <div className='text-sm font-semibold text-slate-700'>{t('list.empty')}</div>
                <div className='text-xs mt-2 text-slate-500'>{t('list.startHint', { defaultValue: 'Use search to start a chat' })}</div>
              </div>
            )}
          </div>
        </aside>

        {/* Conversation area - Enhanced */}
        <section className='flex flex-col min-h-0'>
          {/* Mobile header */}
          <div className={cls(
            'md:hidden h-16 border-b border-slate-200/60 px-4 flex items-center justify-between',
            'bg-gradient-to-r from-white/95 via-white/90 to-white/95 backdrop-blur-xl'
          )}>
            <div className='flex items-center gap-3'>
              <button 
                onClick={() => setDrawerOpen(true)} 
                className={cls(
                  'flex-none inline-flex h-11 w-11 items-center justify-center',
                  'rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50',
                  'active:scale-95 transition-all duration-200 shadow-sm',
                  ui.ringFocus
                )} 
                title={t('actions.openList')} 
                aria-label={t('actions.openList')}
              >
                <Menu className='w-5 h-5 text-slate-600' />
              </button>
              <div className='text-sm font-bold bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] bg-clip-text text-transparent'>
                {t('appbar.title')}
              </div>
            </div>

            <button 
              onClick={() => setDrawerOpen(true)} 
              className={cls(
                'h-11 w-11 rounded-lg border border-slate-200/60 bg-white',
                'grid place-items-center shadow-sm hover:shadow-md',
                'transition-all duration-200',
                ui.ringFocus
              )} 
              aria-label={t('actions.openList')} 
              title={t('actions.openList')}
            >
              <Search className='w-5 h-5 text-slate-600' />
            </button>
          </div>

          {/* Chat header - Enhanced */}
          <div className={cls(
            'hidden md:flex h-16 border-b border-slate-200/60 px-5 items-center gap-4',
            'bg-gradient-to-r from-white/95 via-white/90 to-white/95 backdrop-blur-xl'
          )}>
            {otherUser ? (
              <>
                <div className='relative'>
                  <div className={cls(
                    'h-11 w-11 rounded-lg bg-gradient-to-br grid place-items-center overflow-hidden',
                    'ring-2 shadow-md transition-all duration-200',
                    pickAvatarGradient(otherUser.id || otherUser.email, colors)
                  )}>
                    <MultiLangText className='text-sm font-bold leading-none select-none'>
                      {getInitial(otherUser)}
                    </MultiLangText>
                  </div>
                  {otherUser?.online && (
                    <span className='absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm' />
                  )}
                </div>
                <div className='min-w-0'>
                  <MultiLangText className='text-base font-bold text-slate-900 truncate'>
                    {otherUser.name || otherUser.email}
                  </MultiLangText>
                  <div className='text-xs text-slate-500 font-medium'>
                    {typing ? (
                      <span className='text-[var(--color-primary-600)] flex items-center gap-1'>
                        <span className='inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] animate-bounce' style={{ animationDelay: '0ms' }} />
                        <span className='inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] animate-bounce' style={{ animationDelay: '150ms' }} />
                        <span className='inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] animate-bounce' style={{ animationDelay: '300ms' }} />
                        <span className='ml-1'>{t('header.typing')}</span>
                      </span>
                    ) : (
                      t('header.direct')
                    )}
                  </div>
                </div>
              </>
            ) : activeId ? (
              <div className='text-sm text-slate-500 font-medium'>{t('header.loading')}</div>
            ) : (
              <div className='text-sm text-slate-500 font-medium'>{t('header.noselect')}</div>
            )}
          </div>

          {/* Messages area - Enhanced with better background */}
          <div className='max-md:max-h-[calc(100%-120px)] space-y-3 flex-1 min-h-0 overflow-y-auto px-4 py-5 bg-gradient-to-b from-slate-50/80 via-white/50 to-slate-100/60 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
            {!activeId ? (
              <div className='h-full grid place-items-center text-slate-500'>
                <div className='text-center'>
                  <div className='mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200/60 shadow-lg'>
                    <Inbox className='w-10 h-10 text-slate-400' />
                  </div>
                  <div className='text-base font-semibold text-slate-700'>{t('empty.pick')}</div>
                  <div className='text-sm text-slate-400 mt-2'>{t('empty.hint', { defaultValue: 'Select a conversation from the list' })}</div>
                </div>
              </div>
            ) : loadingMsgs ? (
              <MessageSkeleton />
            ) : (
              <MessageList msgs={msgs} me={me} API_URL={API_URL} endRef={endRef} t={t} typing={typing} colors={colors} />
            )}
          </div>

          {/* Composer - Enhanced */}
          <div 
            className={cls(
              'border-t border-slate-200/60 p-4',
              'bg-gradient-to-r from-white/95 via-white/90 to-white/95 backdrop-blur-xl'
            )} 
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {!activeId ? (
              <div className='text-center text-sm text-slate-500 py-6 font-medium'>
                {t('composer.disabled')}
              </div>
            ) : (
              <>
                {!!attaches.length && (
                  <div className='px-1 pb-3 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
                    {attaches.map((a, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className='relative shrink-0 group'
                      >
                        {/^\s*image\//.test(a.type) ? (
                          <img 
                            src={a.url} 
                            alt={a.name} 
                            className='h-20 w-20 object-cover rounded-lg border-2 border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200' 
                          />
                        ) : /^\s*video\//.test(a.type) ? (
                          <div className='h-20 w-28 rounded-lg border-2 border-slate-200 grid place-items-center bg-slate-50 shadow-md hover:shadow-lg transition-shadow duration-200'>
                            <Video className='w-6 h-6 text-slate-600' />
                          </div>
                        ) : (
                          <div className='h-20 w-28 rounded-lg border-2 border-slate-200 grid place-items-center bg-slate-50 shadow-md hover:shadow-lg transition-shadow duration-200'>
                            <FileIcon className='w-6 h-6 text-slate-600' />
                          </div>
                        )}
                        <div className='absolute bottom-1 ltr:left-1 ltr:right-9 rtl:right-1 rtl:left-9 truncate text-[10px] px-1.5 py-0.5 rounded-lg bg-black/70 text-white font-medium'>
                          {a.name}
                        </div>
                        <button 
                          onClick={() => removeAttach(idx)} 
                          className={cls(
                            'absolute -top-2 ltr:-right-2 rtl:-left-2 h-7 w-7 rounded-full',
                            'bg-gradient-to-br from-red-500 to-red-600 text-white',
                            'grid place-items-center',
                            'hover:from-red-600 hover:to-red-700',
                            'shadow-lg hover:shadow-xl',
                            'transition-all duration-200',
                            'active:scale-95',
                            ui.ringFocus
                          )} 
                          title={t('composer.remove')} 
                          aria-label={t('composer.remove')}
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className='flex items-end gap-2'>
                  <div className='relative flex-1'>
                    <textarea
                      value={text}
                      onChange={e => {
                        setText(e.target.value);
                        handleTyping();
                        const el = e.target;
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
                        'h-auto min-h-[52px] max-h-[160px] w-full rounded-lg',
                        'bg-white text-slate-900 placeholder:text-slate-400',
                        'border-2 border-slate-200',
                        'hover:border-slate-300',
                        'focus:border-[var(--color-primary-400)] focus:shadow-lg focus:shadow-[var(--color-primary-500)]/10',
                        'transition-all duration-200',
                        'px-4 py-3 text-base resize-none',
                        'ltr:pr-[180px] rtl:pl-[180px]',
                        ui.ringFocus
                      )}
                    />

                    {/* Action buttons cluster */}
                    <div className='pointer-events-auto absolute inset-y-0 ltr:right-2 rtl:left-2 flex gap-1.5 items-center'>
                      <button 
                        onClick={send} 
                        disabled={sending || (!text.trim() && !hasAttaches)} 
                        className={cls(
                          'h-10 w-10 rounded-lg',
                          'bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]',
                          'text-white grid place-items-center',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          'hover:shadow-lg hover:shadow-[var(--color-primary-500)]/30',
                          'active:scale-95 transition-all duration-200',
                          ui.ringFocus
                        )} 
                        title={t('composer.send')} 
                        aria-label={t('composer.send')}
                      >
                        {sending ? <Loader2 className='animate-spin w-5 h-5' /> : <Send className='w-5 h-5' />}
                      </button>

                      <label className={cls(
                        'h-10 w-10 grid place-items-center rounded-lg',
                        'border-2 border-slate-200 bg-white cursor-pointer',
                        'hover:bg-slate-50 hover:border-slate-300',
                        'active:scale-95 transition-all duration-200',
                        ui.ringFocus
                      )}>
                        <ImageIcon className='w-5 h-5 text-slate-600' />
                        <input type='file' className='hidden' accept='image/*' multiple onChange={e => onPickFiles(e.target.files)} />
                      </label>

                      <label className={cls(
                        'h-10 w-10 grid place-items-center rounded-lg',
                        'border-2 border-slate-200 bg-white cursor-pointer',
                        'hover:bg-slate-50 hover:border-slate-300',
                        'active:scale-95 transition-all duration-200',
                        ui.ringFocus
                      )}>
                        <Video className='w-5 h-5 text-slate-600' />
                        <input type='file' className='hidden' accept='video/*' multiple onChange={e => onPickFiles(e.target.files)} />
                      </label>

                      <label className={cls(
                        'h-10 w-10 grid place-items-center rounded-lg',
                        'border-2 border-slate-200 bg-white cursor-pointer',
                        'hover:bg-slate-50 hover:border-slate-300',
                        'active:scale-95 transition-all duration-200',
                        ui.ringFocus
                      )}>
                        <Paperclip className='w-5 h-5 text-slate-600' />
                        <input type='file' className='hidden' multiple onChange={e => onPickFiles(e.target.files)} />
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Mobile conversations drawer - Enhanced */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside 
            initial={{ x: isRTL ? '100%' : '-100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: isRTL ? '100%' : '-100%' }} 
            transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
            className='fixed inset-0 z-50 md:hidden bg-white' 
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className={cls(
              'h-16 border-b border-slate-200/60 px-4 flex items-center justify-between',
              'bg-gradient-to-r from-white/95 via-white/90 to-white/95 backdrop-blur-xl'
            )}>
              <div className='text-base font-bold bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] bg-clip-text text-transparent'>
                {t('appbar.title')}
              </div>
              <button 
                onClick={() => setDrawerOpen(false)} 
                className={cls(
                  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg',
                  'border-2 border-slate-200',
                  'bg-white hover:bg-slate-50 active:bg-slate-100',
                  'transition-all duration-200',
                  'text-slate-700 font-semibold text-sm',
                  ui.ringFocus
                )}
              >
                <X className='w-4 h-4' />
                <span>{t('actions.close')}</span>
              </button>
            </div>

            <div className='p-4 border-b border-slate-200/60 bg-white/60 backdrop-blur-sm'>
              <div className='relative'>
                <Search className={cls(
                  'absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400',
                  isRTL ? 'right-4' : 'left-4'
                )} />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder={t('search.placeholder')} 
                  className={cls(
                    'w-full h-12 rounded-lg border-2 border-slate-200',
                    'bg-white/90 focus:bg-white',
                    'focus:border-[var(--color-primary-400)] focus:shadow-lg focus:shadow-[var(--color-primary-500)]/10',
                    'transition-all duration-200',
                    ui.ringFocus,
                    isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'
                  )} 
                />
                {searching && (
                  <Loader2 className={cls(
                    'absolute top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[var(--color-primary-500)]',
                    isRTL ? 'left-4' : 'right-4'
                  )} />
                )}
              </div>

              {user.role === 'client' && (
                <div className='gap-2 flex items-center mt-3'>
                  <button 
                    type='button' 
                    onClick={contactCoach} 
                    className={cls(
                      'flex-1 h-11 rounded-lg border-2 border-slate-200 bg-white text-slate-700 text-sm font-semibold',
                      'inline-flex items-center justify-center gap-2',
                      'hover:bg-slate-50 active:scale-[.98] transition-all duration-200',
                      'shadow-sm',
                      ui.ringFocus
                    )}
                  >
                    <Phone size={16} />
                    {t('quick.coach')}
                  </button>
                  {me?.adminId && (
                    <button 
                      type='button' 
                      onClick={contactAdmin} 
                      className={cls(
                        'flex-1 h-11 rounded-lg border-2 border-slate-200 bg-white text-slate-700 text-sm font-semibold',
                        'inline-flex items-center justify-center gap-2',
                        'hover:bg-slate-50 active:scale-[.98] transition-all duration-200',
                        'shadow-sm',
                        ui.ringFocus
                      )}
                    >
                      <Phone size={16} />
                      {t('quick.admin')}
                    </button>
                  )}
                </div>
              )}

              {!!results.length && (
                <div className='mt-3 rounded-lg border border-slate-200/60 overflow-hidden bg-white shadow-sm'>
                  <div className='px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-50'>
                    {t('search.results')}
                  </div>
                  <ul className='max-h-64 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
                    {results.map(u => (
                      <li key={u.id} className='border-t border-slate-100/60 first:border-t-0'>
                        <button 
                          onClick={() => openDirectWith(u.id)} 
                          className={cls(
                            'w-full px-4 py-3 hover:bg-slate-50 flex items-center gap-3',
                            'transition-all duration-200',
                            ui.ringFocus,
                            isRTL ? 'text-right justify-end' : 'text-left'
                          )}
                        >
                          {!isRTL && <UserCircle2 className='w-7 h-7 text-slate-500' />}
                          <div className='min-w-0 flex-1'>
                            <MultiLangText className='text-sm font-semibold text-slate-900 truncate'>
                              {u.name || u.email}
                            </MultiLangText>
                          </div>
                          {isRTL && <UserCircle2 className='w-7 h-7 text-slate-500' />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className='p-3 h-[calc(100%-180px)] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
              {filteredConvos.length ? (
                <ul className='space-y-2'>
                  {filteredConvos.map(c => {
                    const others = (c.chatParticipants || []).map(p => p.user).filter(u => me && u?.id !== me.id);
                    const title = c.isGroup ? c.name || t('list.group') : others[0]?.name || others[0]?.email || t('list.direct');
                    const last = c.lastMessage;
                    const preview = last?.messageType === 'text' ? last?.content : last?.messageType === 'image' ? t('list.photo') : last?.messageType === 'video' ? t('list.video') : last?.messageType === 'file' ? t('list.file') : '';

                    return (
                      <li key={c.id}>
                        <button 
                          onClick={() => onSelectConversation(c.id)} 
                          className={cls(
                            'w-full px-4 py-4 rounded-lg transition-all duration-200',
                            'border-2',
                            ui.ringFocus,
                            activeId === c.id 
                              ? 'bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] shadow-md border-[var(--color-primary-200)]' 
                              : 'border-slate-200 hover:bg-white/80 bg-white/60 hover:shadow-md'
                          )}
                        >
                          <div className={cls(
                            'flex items-center gap-3',
                            isRTL ? 'flex-row-reverse' : ''
                          )}>
                            <div className='min-w-0 flex-1'>
                              <div className={cls(
                                'flex items-center justify-between gap-2 mb-1',
                                isRTL ? 'flex-row-reverse' : ''
                              )}>
                                <div className='font-en text-xs text-slate-400 shrink-0 font-medium'>
                                  {last?.created_at ? timeHHMM(last.created_at) : ''}
                                </div>
                                <MultiLangText className='text-sm font-bold text-slate-900 truncate'>
                                  {title}
                                </MultiLangText>
                              </div>
                              <div className={cls(
                                'flex items-center justify-between gap-2',
                                isRTL ? 'flex-row-reverse' : ''
                              )}>
                                <UnreadBadge count={c.unreadCount} />
                                <MultiLangText className='text-xs text-slate-500 truncate flex-1 rtl:text-left ltr:text-right'>
                                  {preview}
                                </MultiLangText>
                              </div>
                            </div>
                            <div className={cls(
                              'h-12 w-12 rounded-lg bg-gradient-to-br grid place-items-center overflow-hidden shadow-sm',
                              'from-[var(--color-primary-100)] to-[var(--color-secondary-100)]'
                            )}>
                              <UserCircle2 className='w-7 h-7 text-[var(--color-primary-600)]' />
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className='p-10 text-center text-slate-500'>
                  <div className='mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200/60 shadow-lg'>
                    <Inbox className='w-8 h-8 text-slate-400' />
                  </div>
                  <div className='text-sm font-semibold text-slate-700'>{t('list.empty')}</div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- MessageList - Enhanced --------------------------- */
function MessageList({ msgs, me, API_URL, endRef, t, typing, colors }) {
  const groups = [];
  let lastDate = '';

  msgs.forEach(m => {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) {
      groups.push({ type: 'sep', label: dateLabel(m.created_at), id: `sep-${m.created_at}` });
      lastDate = d;
    }
    groups.push({ type: 'msg', data: m });
  });

  useEffect(() => {
    const id = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(id);
  }, [msgs, typing, endRef]);

  return (
    <>
      {groups.map((item, index) => {
        if (item.type === 'sep') {
          return (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className='sticky top-2 z-10'
            >
              <MultiLangText className='mx-auto block w-fit text-xs px-4 py-2 rounded-full bg-white/95 backdrop-blur-sm border-2 border-slate-200 text-slate-600 font-semibold shadow-sm'>
                {item.label}
              </MultiLangText>
            </motion.div>
          );
        }

        const m = item.data;
        const mine = (m?.sender?.id ?? m?.senderId) === me?.id;
        const other = m?.sender || m?.from || m?.user || {};
        const time = timeHHMM(m.created_at);

        const Content = () => {
          if (m.messageType === 'text' && !!m.content) {
            return (
              <MultiLangText className='whitespace-pre-wrap text-[15px] leading-relaxed break-words'>
                {m.content}
              </MultiLangText>
            );
          }
          if (m.messageType === 'image' && Array.isArray(m.attachments)) {
            return (
              <div className='grid grid-cols-2 gap-2'>
                {m.attachments.map((a, i) => (
                  <a 
                    key={i} 
                    href={`${API_URL}${a.url}`} 
                    target='_blank' 
                    rel='noreferrer' 
                    className='block overflow-hidden rounded-lg hover:opacity-90 transition-opacity duration-200 shadow-md hover:shadow-lg'
                  >
                    <Img 
                      src={`${a.url}`} 
                      alt={a.name} 
                      className='w-full h-40 object-cover' 
                      showBlur={false} 
                    />
                  </a>
                ))}
              </div>
            );
          }
          if (m.messageType === 'video' && Array.isArray(m.attachments)) {
            return (
              <div className='space-y-2'>
                {m.attachments.map((a, i) => (
                  <video 
                    key={i} 
                    src={`${API_URL}${a.url}`} 
                    controls 
                    className='w-full rounded-lg overflow-hidden max-h-64 border-2 border-slate-200 shadow-md' 
                  />
                ))}
              </div>
            );
          }
          if (m.messageType === 'file' && Array.isArray(m.attachments)) {
            return (
              <div className='space-y-2'>
                {m.attachments.map((a, i) => (
                  <a 
                    key={i} 
                    href={`${API_URL}${a.url}`} 
                    target='_blank' 
                    rel='noreferrer' 
                    className={cls(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border-2',
                      mine 
                        ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-md hover:shadow-lg' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm hover:shadow-md'
                    )}
                  >
                    <FileIcon className={cls('w-5 h-5', mine ? 'text-white' : 'text-slate-600')} />
                    <span className='text-sm truncate flex-1 font-medium'>{a.name}</span>
                    <span className={cls(
                      'text-xs tabular-nums font-medium',
                      mine ? 'text-white/90' : 'text-slate-500'
                    )}>
                      {a.size ? `(${Math.round(a.size / 1024)} KB)` : ''}
                    </span>
                  </a>
                ))}
              </div>
            );
          }
          return null;
        };

        return (
          <motion.div 
            key={m.id || m.tempId} 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
            className={cls('pt-2 flex items-end gap-2.5', mine ? 'justify-end' : 'justify-start')}
          >
            {!mine && (
              <div 
                className={cls(
                  'h-9 w-9 rounded-full bg-gradient-to-br grid place-items-center',
                  'ring-2 shadow-md shrink-0 select-none',
                  pickAvatarGradient(other?.id || other?.email, colors)
                )} 
                title={other?.name || other?.email}
              >
                <span className='text-xs font-bold font-en'>{getInitial(other)}</span>
              </div>
            )}

            <div className={cls(
              'relative max-w-[min(400px,75%)] rounded-lg px-4 py-3',
              'shadow-md hover:shadow-lg transition-shadow duration-200',
              mine 
                ? 'bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] text-white rtl:rounded-bl-sm ltr:rounded-br-sm' 
                : 'bg-white text-slate-800 rtl:rounded-br-sm ltr:rounded-bl-sm border-2 border-slate-200'
            )}>
              <Content />
              <div className={cls(
                'mt-2 text-xs flex items-center gap-1.5 tabular-nums font-medium',
                mine ? 'text-white/90 justify-end' : 'text-slate-500'
              )}>
                <MultiLangText>{time}</MultiLangText>
                <ReadTicks meId={me?.id} msg={m} />
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Typing indicator - Enhanced */}
      {typing && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex justify-start items-end gap-2.5'
        >
          <div className={cls(
            'h-9 w-9 rounded-full bg-gradient-to-br grid place-items-center',
            'ring-2 shadow-md select-none',
            'from-[var(--color-primary-100)] to-[var(--color-secondary-100)] ring-[var(--color-primary-200)]'
          )}>
            <span className='text-xs font-bold'>…</span>
          </div>
          <div className='relative max-w-[78%] rounded-lg px-5 py-4 shadow-md bg-white border-2 border-slate-200 rtl:rounded-br-sm ltr:rounded-bl-sm'>
            <div className='flex gap-1.5 items-center'>
              <div className='w-2 h-2 bg-[var(--color-primary-500)] rounded-full animate-bounce' style={{ animationDelay: '0ms' }} />
              <div className='w-2 h-2 bg-[var(--color-primary-500)] rounded-full animate-bounce' style={{ animationDelay: '150ms' }} />
              <div className='w-2 h-2 bg-[var(--color-primary-500)] rounded-full animate-bounce' style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </motion.div>
      )}

      <div ref={endRef} />
    </>
  );
}

const MessageSkeleton = () => (
  <div className='space-y-4'>
    {[...Array(6)].map((_, i) => {
      const mine = i % 2 === 1;
      return (
        <div key={i} className={cls('flex items-end gap-2.5', mine ? 'justify-end' : 'justify-start')}>
          {!mine && <div className='h-9 w-9 rounded-full bg-slate-200/80 shadow-sm' />}
          <div className={cls(
            'rounded-lg h-16 animate-pulse shadow-md',
            mine 
              ? 'bg-gradient-to-r from-slate-200/60 to-slate-300/40 w-52' 
              : 'bg-slate-200/80 w-60 border-2 border-slate-200'
          )} />
        </div>
      );
    })}
  </div>
);