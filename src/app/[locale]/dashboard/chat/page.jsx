'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import io from 'socket.io-client';
import { Paperclip, Image as ImageIcon, Send, Search, Phone, ChevronLeft, Loader2, Check, CheckCheck, Video, File as FileIcon, X, Inbox, Menu, ChevronRight, Bell, Mic, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { useUser } from '@/hooks/useUser';
import { useValues } from '@/context/GlobalContext';
import { useTheme } from '@/app/[locale]/theme';

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;
const cls = (...a) => a.filter(Boolean).join(' ');

function detectMessageType(mime = '') {
  if (/^image\//.test(mime)) return 'image';
  if (/^video\//.test(mime)) return 'video';
  if (/^audio\//.test(mime)) return 'voice';
  return 'file';
}

function formatDuration(sec = 0) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

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

function VoiceBubble({ url, duration = 0, mine = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(duration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const d = audio.duration || dur || 0;
      setProgress(d ? audio.currentTime / d : 0);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDur(audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [dur, url]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch (e) {
      console.error('Voice playback failed:', e);
      setPlaying(false);
    }
  }

  return (
    <div className={cls('flex items-center gap-2.5 min-w-[180px] max-w-[260px]', mine ? 'text-white' : 'text-slate-700')}>
      <button
        type='button'
        onClick={toggle}
        className={cls(
          'h-9 w-9 rounded-full grid place-items-center shrink-0 transition-transform active:scale-95',
          mine ? 'bg-white/20 hover:bg-white/30' : 'bg-[var(--color-primary-500)] text-white hover:opacity-90',
        )}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className='w-4 h-4' /> : <Play className='w-4 h-4 ltr:ml-0.5' />}
      </button>
      <div className='flex-1 min-w-0'>
        <div className='flex items-end gap-[2px] h-5'>
          {Array.from({ length: 22 }).map((_, i) => {
            const barH = 4 + Math.abs(Math.sin(i * 0.75) * 10) + Math.abs(Math.cos(i * 1.2) * 4);
            const filled = i / 22 <= progress;
            return (
              <span
                key={i}
                className={cls('w-[3px] rounded-full', mine ? (filled ? 'bg-white' : 'bg-white/35') : filled ? 'bg-[var(--color-primary-500)]' : 'bg-slate-300')}
                style={{ height: `${Math.max(4, barH)}px` }}
              />
            );
          })}
        </div>
        <div className={cls('mt-1 text-[10px] tabular-nums font-medium', mine ? 'text-white/80' : 'text-slate-500')}>
          {formatDuration(playing ? progress * (dur || duration || 0) : dur || duration || 0)}
        </div>
      </div>
      <audio ref={audioRef} src={url} preload='metadata' />
    </div>
  );
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
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return s.slice(0, 2).toUpperCase();
};

const pickAvatarGradient = (seed, colors) => {
  const gradients = [
    'from-[var(--color-primary-400)] to-[var(--color-primary-600)] text-white',
    'from-[var(--color-secondary-400)] to-[var(--color-secondary-600)] text-white',
    'from-rose-400 to-pink-600 text-white',
    'from-emerald-400 to-teal-600 text-white',
    'from-amber-400 to-orange-600 text-white',
    'from-cyan-400 to-sky-600 text-white',
    'from-violet-400 to-indigo-600 text-white',
    'from-fuchsia-400 to-purple-600 text-white',
  ];
  const str = String(seed || '');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
};

function UserAvatar({ user, size = 40, hasUnread = false, online = false, className = '' }) {
  const avatarSrc = user?.avatar || user?.image || user?.profileImage || null;
  const initial = getInitial(user);
  const grad = pickAvatarGradient(user?.id || user?.email, null);
  const px = typeof size === 'number' ? size : 40;

  return (
    <div className={cls('relative shrink-0', className)} style={{ width: px, height: px }}>
      <div
        className={cls(
          'w-full h-full rounded-full overflow-hidden grid place-items-center font-bold select-none',
          'shadow-sm ring-2',
          hasUnread ? 'ring-[var(--color-primary-300)]' : 'ring-white',
          !avatarSrc && `bg-gradient-to-br ${grad}`,
          avatarSrc && 'bg-slate-200',
        )}
        style={{ fontSize: Math.max(11, Math.round(px * 0.34)) }}
      >
        {avatarSrc ? (
          <Img src={avatarSrc} alt={user?.name || user?.email || 'avatar'} className='w-full h-full object-cover' showBlur={false} />
        ) : (
          <span className='font-en leading-none tracking-wide'>{initial}</span>
        )}
      </div>
      {online && (
        <span className='absolute bottom-0 ltr:right-0 rtl:left-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white' />
      )}
    </div>
  );
}

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
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const listRef = useRef(null);
  const endRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const textAreaRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const searchTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordStreamRef = useRef(null);
  const recordSecsRef = useRef(0);

  const hasAttaches = Array.isArray(attaches) && attaches.length > 0;
  const isRTL = locale === 'ar';
  const user = useUser();

  const scrollToBottom = useCallback((smooth = false) => {
    const el = messagesScrollRef.current;
    if (!el) {
      if (!smooth) endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      return;
    }
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const stickToBottomIfNeeded = useCallback(() => {
    if (shouldStickToBottomRef.current) scrollToBottom(false);
  }, [scrollToBottom]);

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
      const convId = message?.conversation?.id;
      if (convId === activeId) {
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
        if (shouldStickToBottomRef.current || message?.sender?.id === me?.id) {
          scrollToBottom(false);
        }
      }

      setConvos(prev =>
        prev
          .map(c => {
            if (c.id !== convId) return c;
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

      if (convId === activeId && message?.sender?.id !== me?.id) {
        markActiveAsRead();
      }
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
    setMsgs([]);
    shouldStickToBottomRef.current = true;
    try {
      const data = await getMessages(conversationId, 1, 200);
      setMsgs(Array.isArray(data) ? data : []);
      socket?.emit('join_conversation', conversationId);
      setConvos(prev => prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
      setConversationId(conversationId);
      markActiveAsRead(conversationId);
    } finally {
      setLoadingMsgs(false);
      requestAnimationFrame(() => {
        scrollToBottom(false);
        requestAnimationFrame(() => scrollToBottom(false));
      });
    }
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
    const pendingAttaches = Array.isArray(attaches) ? [...attaches] : [];
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

    let messageType = 'text';
    if (localPreviews.length > 0) {
      messageType = detectMessageType(localPreviews[0].type || '');
    }

    const optimistic = {
      id: tempId,
      tempId,
      conversation: { id: activeId },
      sender: me,
      content: trimmedText || null,
      messageType,
      attachments: localPreviews.length ? localPreviews : null,
      isEdited: false,
      isDeleted: false,
      created_at: new Date().toISOString(),
      readBy: null,
      pending: true,
    };

    // Show instantly, clear composer immediately (don't wait for network)
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
        uploaded = await Promise.all(
          pendingAttaches.map(async a => {
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

        if (uploaded.length) {
          messageType = detectMessageType(uploaded[0].type || '');
          setMsgs(prev =>
            prev.map(m =>
              m.tempId === tempId
                ? { ...m, messageType, attachments: uploaded }
                : m,
            ),
          );
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
    } catch (err) {
      console.error('Error sending message:', err);
      setMsgs(prev => prev.filter(m => m.tempId !== tempId));
    } finally {
      if (hasAtt) setSending(false);
    }
  }

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try {
          if (recorder.state === 'recording') recorder.stop();
        } catch {}
      }
      recordStreamRef.current?.getTracks?.().forEach(t => t.stop());
    };
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
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const chunks = recordChunksRef.current;
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type });
        const secs = recordSecsRef.current;
        setRecording(false);
        setRecordSecs(0);
        recordSecsRef.current = 0;
        recordStreamRef.current?.getTracks?.().forEach(t => t.stop());
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
    } catch (e) {
      console.error('Mic permission / record failed:', e);
      alert('Microphone permission is required to send voice messages');
    }
  }

  function stopVoiceRecording() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    try {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    } catch (e) {
      console.error('Stop recording failed:', e);
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
      try {
        if (recorder.state === 'recording') recorder.stop();
      } catch {}
    }
    recordChunksRef.current = [];
    recordStreamRef.current?.getTracks?.().forEach(t => t.stop());
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
      const up = await uploadChatFile(file);
      const attachment = {
        name: up?.originalname || file.name,
        type: up?.mimetype || file.type,
        size: up?.size ?? file.size,
        url: up?.url || '',
        duration: durationSec,
      };
      setMsgs(prev =>
        prev.map(m =>
          m.tempId === tempId
            ? { ...m, attachments: [attachment], voiceUri: attachment.url, voiceDuration: durationSec }
            : m,
        ),
      );
      socket?.emit('send_message', {
        conversationId: activeId,
        content: null,
        messageType: 'voice',
        attachments: [attachment],
        tempId,
      });
    } catch (e) {
      console.error('Voice send failed:', e);
      setMsgs(prev => prev.filter(m => m.tempId !== tempId));
      URL.revokeObjectURL(localUrl);
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

  const unreadTotal = useMemo(
    () => convos.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0),
    [convos],
  );

  return (
    <div 
      className={cls(
        'w-full flex flex-col',
        'h-[calc(100dvh-4rem)] min-[1026px]:h-full',
        'md:border border-slate-200/60',
        'rounded-none lg:rounded-xl',
        'overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100/50',
        'shadow-none lg:shadow-xl lg:shadow-slate-200/50'
      )}
    >
      {/* Content grid */}
      <div className='flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]'>
        {/* Desktop sidebar */}
        <aside className={cls(
          'hidden md:flex min-h-0 rtl:border-l ltr:border-r border-slate-200/60',
          'bg-white/90 backdrop-blur-sm',
          'flex-col'
        )}>
          {/* Search + filters */}
          <div className='border-b border-slate-200/60 z-10 px-2.5 pt-2.5 pb-2 bg-white/90 shrink-0 space-y-2'>
            <div className='flex items-center gap-1.5'>
              <div className='relative group flex-1 min-w-0'>
                <Search className='absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[var(--color-primary-500)] transition-colors' />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder={t('search.placeholder')} 
                  aria-label={t('search.placeholder')} 
                  className={cls(
                    'h-9 w-full ltr:pl-9 rtl:pr-9 ltr:pr-8 rtl:pl-8',
                    'rounded-xl border border-slate-200/80',
                    'bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm',
                    'transition-all duration-150',
                    'hover:border-slate-300',
                    'focus:border-[var(--color-primary-400)] focus:bg-white focus:shadow-sm',
                    ui.ringFocus
                  )}
                />
                {searching && <Loader2 className='absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--color-primary-500)]' />}
                {!!search && !searching && (
                  <button 
                    type='button' 
                    onClick={() => setSearch('')} 
                    aria-label={t('search.clear', { defaultValue: 'Clear search' })} 
                    className='absolute ltr:right-1.5 rtl:left-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-slate-100 active:scale-95 transition-all'
                  >
                    <X className='w-3.5 h-3.5 text-slate-400' />
                  </button>
                )}
              </div>

              {user?.role === 'client' && (
                <div className='flex items-center gap-1 shrink-0'>
                  <button
                    type='button'
                    onClick={contactCoach}
                    title={t('quick.coach')}
                    aria-label={t('quick.coach')}
                    className={cls(
                      'h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600',
                      'grid place-items-center hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:border-[var(--color-primary-200)]',
                      'active:scale-95 transition-all',
                      ui.ringFocus,
                    )}
                  >
                    <Phone size={15} />
                  </button>
                  {me?.adminId && (
                    <button
                      type='button'
                      onClick={contactAdmin}
                      title={t('quick.admin')}
                      aria-label={t('quick.admin')}
                      className={cls(
                        'h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600',
                        'grid place-items-center hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:border-[var(--color-primary-200)]',
                        'active:scale-95 transition-all',
                        ui.ringFocus,
                      )}
                    >
                      <Bell size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* All / Unread segmented filter */}
            <div
              role='tablist'
              aria-label={t('tabs.all')}
              className='relative grid grid-cols-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70'
            >
              <button
                type='button'
                role='tab'
                aria-selected={filterTab === 'all'}
                onClick={() => setFilterTab('all')}
                className={cls(
                  'relative z-10 h-8 rounded-lg text-xs font-semibold transition-all duration-200',
                  ui.ringFocus,
                  filterTab === 'all'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t('tabs.all')}
              </button>
              <button
                type='button'
                role='tab'
                aria-selected={filterTab === 'unread'}
                onClick={() => setFilterTab('unread')}
                className={cls(
                  'relative z-10 h-8 rounded-lg text-xs font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5',
                  ui.ringFocus,
                  filterTab === 'unread'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t('tabs.unread')}
                {unreadTotal > 0 && (
                  <span
                    className={cls(
                      'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center',
                      filterTab === 'unread'
                        ? 'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] text-white'
                        : 'bg-slate-200 text-slate-600',
                    )}
                  >
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </span>
                )}
              </button>
            </div>

            {/* Results */}
            {searching ? null : search && results.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className='rounded-xl border border-slate-200/60 bg-white/90 p-6 text-center'
              >
                <div className='mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100'>
                  <Inbox className='w-5 h-5 text-slate-400' />
                </div>
                <div className='text-sm font-semibold text-slate-700'>{t('search.noResultsTitle', { defaultValue: 'No matches found' })}</div>
                <div className='text-xs text-slate-500 mt-1'>{t('search.noResultsHint', { defaultValue: 'Try a different name or email' })}</div>
              </motion.div>
            ) : (
              !!results.length && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='rounded-xl border border-slate-200/60 overflow-hidden bg-white shadow-sm'
                >
                  <div className='px-3 py-2 text-[11px] font-semibold text-slate-500 bg-slate-50 border-b border-slate-100'>
                    {t('search.results')}
                  </div>
                  <ul className='max-h-56 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
                    {results.map(u => (
                        <li key={u.id} className='border-t border-slate-100/60 first:border-t-0'>
                          <button 
                            onClick={() => openDirectWith(u.id)} 
                            className={cls(
                              'w-full px-2.5 py-2 text-left',
                              'hover:bg-slate-50',
                              'flex items-center gap-2.5 transition-all duration-150 group',
                              ui.ringFocus
                            )}
                          >
                            <UserAvatar user={u} size={36} />
                            <div className='min-w-0 flex-1 flex flex-col'>
                              <MultiLangText className='text-[13px] font-semibold text-slate-900 truncate group-hover:text-[var(--color-primary-700)]'>
                                {u.name || u.email}
                              </MultiLangText>
                              <MultiLangText className='text-[11px] text-slate-500 truncate'>{u.email}</MultiLangText>
                            </div>
                            <ChevronRight className='w-4 h-4 text-slate-300 rtl:rotate-180' />
                          </button>
                        </li>
                      ))}
                  </ul>
                </motion.div>
              )
            )}
          </div>

          {/* Conversation list */}
          <div ref={listRef} className='flex-1 overflow-auto px-1.5 py-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
            {loadingConvos ? (
              <div className='space-y-1'>
                {[...Array(10)].map((_, i) => (
                  <div key={i} className='h-14 rounded-lg bg-slate-100/80 animate-pulse' />
                ))}
              </div>
            ) : filteredConvos.length ? (
              <ul className='space-y-0.5'>
                {filteredConvos.map(c => {
                  const others = (c.chatParticipants || []).map(p => p.user).filter(u => me && u?.id !== me.id);
                  const peer = others[0] || null;
                  const title = c.isGroup ? c.name || t('list.group') : peer?.name || peer?.email || t('list.direct');
                  const last = c.lastMessage;
                  const preview = last?.messageType === 'text' ? last?.content : last?.messageType === 'image' ? t('list.photo') : last?.messageType === 'video' ? t('list.video') : last?.messageType === 'voice' ? t('list.voice') : last?.messageType === 'file' ? t('list.file') : '';

                  const isActive = activeId === c.id;
                  const hasUnread = Number(c.unreadCount) > 0;

                  return (
                    <li key={c.id}>
                      <button 
                        onClick={() => onSelectConversation(c.id)} 
                        className={cls(
                          'w-full px-2.5 py-2 text-left rounded-xl transition-all duration-150',
                          ui.ringFocus,
                          isActive 
                            ? 'bg-[var(--color-primary-50)] border border-[var(--color-primary-200)]' 
                            : 'hover:bg-slate-50 border border-transparent'
                        )}
                      >
                        <div className='flex items-center gap-2.5'>
                          <UserAvatar user={peer} size={42} hasUnread={hasUnread} online={!!peer?.online} />

                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center justify-between gap-2'>
                              <MultiLangText className={cls(
                                'rtl:text-right ltr:text-left text-[13px] truncate',
                                hasUnread || isActive ? 'font-bold text-slate-900' : 'font-semibold text-slate-800',
                                isActive && 'text-[var(--color-primary-700)]'
                              )}>
                                {title}
                              </MultiLangText>
                              <div className='font-en text-[10px] text-slate-400 shrink-0 tabular-nums'>
                                {last?.created_at ? timeHHMM(last.created_at) : ''}
                              </div>
                            </div>

                            <div className='flex items-center justify-between gap-2 mt-0.5'>
                              <MultiLangText className={cls(
                                'text-[12px] truncate flex-1 rtl:text-right',
                                hasUnread ? 'text-slate-700 font-medium' : 'text-slate-500'
                              )}>
                                {preview}
                              </MultiLangText>
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
            <div className='flex items-center gap-2.5 min-w-0'>
              <button 
                onClick={() => setDrawerOpen(true)} 
                className={cls(
                  'flex-none inline-flex h-10 w-10 items-center justify-center',
                  'rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50',
                  'active:scale-95 transition-all shadow-sm',
                  ui.ringFocus
                )} 
                title={t('actions.openList')} 
                aria-label={t('actions.openList')}
              >
                <Menu className='w-5 h-5 text-slate-600' />
              </button>
              {otherUser ? (
                <div className='flex items-center gap-2 min-w-0'>
                  <UserAvatar user={otherUser} size={34} online={!!otherUser?.online} />
                  <MultiLangText className='text-sm font-bold text-slate-900 truncate'>
                    {otherUser.name || otherUser.email}
                  </MultiLangText>
                </div>
              ) : (
                <div className='text-sm font-semibold text-slate-700 truncate'>
                  {t('list.title', { defaultValue: 'Conversations' })}
                </div>
              )}
            </div>

            <button 
              onClick={() => setDrawerOpen(true)} 
              className={cls(
                'h-10 w-10 rounded-xl border border-slate-200/60 bg-white',
                'grid place-items-center shadow-sm',
                'transition-all',
                ui.ringFocus
              )} 
              aria-label={t('actions.openList')} 
              title={t('actions.openList')}
            >
              <Search className='w-4 h-4 text-slate-600' />
            </button>
          </div>

          {/* Chat header */}
          <div className={cls(
            'hidden md:flex h-12 border-b border-slate-200/60 px-4 items-center gap-3 shrink-0',
            'bg-white/95 backdrop-blur-xl'
          )}>
            {otherUser ? (
              <>
                <UserAvatar user={otherUser} size={36} online={!!otherUser?.online} />
                <div className='min-w-0'>
                  <MultiLangText className='text-sm font-bold text-slate-900 truncate'>
                    {otherUser.name || otherUser.email}
                  </MultiLangText>
                  <div className='text-[11px] text-slate-500 font-medium'>
                    {typing ? (
                      <span className='text-[var(--color-primary-600)] flex items-center gap-1'>
                        <span className='inline-block w-1 h-1 rounded-full bg-[var(--color-primary-600)] animate-bounce' style={{ animationDelay: '0ms' }} />
                        <span className='inline-block w-1 h-1 rounded-full bg-[var(--color-primary-600)] animate-bounce' style={{ animationDelay: '150ms' }} />
                        <span className='inline-block w-1 h-1 rounded-full bg-[var(--color-primary-600)] animate-bounce' style={{ animationDelay: '300ms' }} />
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

          {/* Messages area */}
          <div
            ref={messagesScrollRef}
            onScroll={e => {
              const el = e.currentTarget;
              const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              shouldStickToBottomRef.current = distanceFromBottom < 80;
            }}
            className='flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 bg-slate-50/70 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'
          >
            {!activeId ? (
              <div className='h-full grid place-items-center text-slate-500'>
                <div className='text-center px-4'>
                  <div className='mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200/80 shadow-sm'>
                    <Inbox className='w-8 h-8 text-slate-400' />
                  </div>
                  <div className='text-base font-semibold text-slate-700'>{t('empty.pick')}</div>
                  <div className='text-sm text-slate-400 mt-1.5'>{t('empty.hint', { defaultValue: 'Select a conversation from the list' })}</div>
                </div>
              </div>
            ) : loadingMsgs ? (
              <MessageSkeleton />
            ) : (
              <MessageList
                msgs={msgs}
                me={me}
                API_URL={API_URL}
                endRef={endRef}
                t={t}
                typing={typing}
                colors={colors}
                onContentReady={stickToBottomIfNeeded}
              />
            )}
          </div>

          {/* Composer */}
          <div
            className={cls(
              'border-t border-slate-200/60 p-3 sm:px-4 sm:py-3',
              'bg-white/95 backdrop-blur-xl',
            )}
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {!activeId ? (
              <div className='text-center text-sm text-slate-500 py-3 font-medium'>
                {t('composer.disabled')}
              </div>
            ) : recording ? (
              <div className='relative flex items-center gap-2 h-12 rounded-[28px] bg-red-50 border border-red-200/80 px-2 shadow-sm'>
                <button
                  type='button'
                  onClick={cancelVoiceRecording}
                  className={cls(
                    'h-9 w-9 rounded-full grid place-items-center shrink-0',
                    'text-slate-500 hover:bg-white/80 hover:text-slate-700 transition-all',
                    ui.ringFocus,
                  )}
                  aria-label={t('composer.cancel', { defaultValue: 'Cancel' })}
                >
                  <X className='w-4 h-4' />
                </button>
                <div className='flex-1 flex items-center justify-center gap-2 text-red-600 font-semibold min-w-0'>
                  <span className='h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0' />
                  <span className='tabular-nums text-sm'>{formatDuration(recordSecs)}</span>
                  <span className='text-xs font-medium truncate opacity-80'>
                    {t('composer.recording', { defaultValue: 'Recording…' })}
                  </span>
                </div>
                <button
                  type='button'
                  onClick={stopVoiceRecording}
                  className={cls(
                    'h-9 w-9 rounded-full shrink-0 bg-red-500 text-white grid place-items-center',
                    'hover:bg-red-600 active:scale-95 transition-all shadow-md shadow-red-500/30',
                    ui.ringFocus,
                  )}
                  title={t('composer.sendVoice', { defaultValue: 'Send voice' })}
                  aria-label={t('composer.sendVoice', { defaultValue: 'Send voice' })}
                >
                  <Send className='w-4 h-4 ltr:translate-x-px' />
                </button>
              </div>
            ) : (
              <>
                {!!attaches.length && (
                  <div className='px-0.5 pb-3 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
                    {attaches.map((a, idx) => (
                      <div key={idx} className='relative shrink-0'>
                        {/^\s*image\//.test(a.type) ? (
                          <img
                            src={a.url}
                            alt={a.name}
                            className='h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm'
                          />
                        ) : /^\s*video\//.test(a.type) ? (
                          <div className='h-16 w-24 rounded-xl border border-slate-200 grid place-items-center bg-slate-50'>
                            <Video className='w-5 h-5 text-slate-600' />
                          </div>
                        ) : /^\s*audio\//.test(a.type) ? (
                          <div className='h-16 w-24 rounded-xl border border-slate-200 grid place-items-center bg-slate-50'>
                            <Mic className='w-5 h-5 text-slate-600' />
                          </div>
                        ) : (
                          <div className='h-16 w-24 rounded-xl border border-slate-200 grid place-items-center bg-slate-50'>
                            <FileIcon className='w-5 h-5 text-slate-600' />
                          </div>
                        )}
                        <button
                          onClick={() => removeAttach(idx)}
                          className={cls(
                            'absolute -top-1.5 ltr:-right-1.5 rtl:-left-1.5 h-6 w-6 rounded-full',
                            'bg-slate-900 text-white grid place-items-center',
                            'hover:bg-red-600 shadow-md active:scale-95 transition-colors',
                            ui.ringFocus,
                          )}
                          title={t('composer.remove')}
                          aria-label={t('composer.remove')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={cls(
                    'relative flex items-end gap-1 rounded-[28px]',
                    'bg-slate-100/90 border border-slate-200/80',
                    'focus-within:bg-white focus-within:border-[var(--color-primary-300)]',
                    'focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]',
                    'transition-all duration-200',
                    'pl-1.5 pr-1.5 py-1.5',
                    isRTL && 'flex-row-reverse',
                  )}
                >
                  <div className='flex items-center gap-0.5 shrink-0 pb-0.5'>
                    <label
                      className={cls(
                        'h-9 w-9 grid place-items-center rounded-full',
                        'text-slate-500 cursor-pointer',
                        'hover:bg-white hover:text-slate-700 hover:shadow-sm',
                        'active:scale-95 transition-all',
                        ui.ringFocus,
                      )}
                      title={t('composer.attach', { defaultValue: 'Attach' })}
                    >
                      <Paperclip className='w-4 h-4' />
                      <input type='file' className='hidden' multiple onChange={e => onPickFiles(e.target.files)} />
                    </label>
                    <label
                      className={cls(
                        'h-9 w-9 grid place-items-center rounded-full',
                        'text-slate-500 cursor-pointer',
                        'hover:bg-white hover:text-slate-700 hover:shadow-sm',
                        'active:scale-95 transition-all',
                        ui.ringFocus,
                      )}
                      title={t('composer.image', { defaultValue: 'Image' })}
                    >
                      <ImageIcon className='w-4 h-4' />
                      <input type='file' className='hidden' accept='image/*' multiple onChange={e => onPickFiles(e.target.files)} />
                    </label>
                  </div>

                  <textarea
                    ref={textAreaRef}
                    value={text}
                    onChange={e => {
                      setText(e.target.value);
                      handleTyping();
                      const el = e.target;
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
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
                      'flex-1 min-w-0 h-auto min-h-[36px] max-h-[120px]',
                      'bg-transparent text-slate-900 placeholder:text-slate-400',
                      'border-0 outline-none focus:outline-none focus:ring-0 shadow-none',
                      'px-1.5 py-2 text-[15px] leading-5 resize-none',
                    )}
                  />

                  <div className='shrink-0 pb-0.5'>
                    {text.trim() || hasAttaches ? (
                      <button
                        type='button'
                        onClick={send}
                        disabled={sending}
                        className={cls(
                          'h-9 w-9 rounded-full grid place-items-center',
                          'bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]',
                          'text-white shadow-md shadow-[var(--color-primary-500)]/25',
                          'hover:shadow-lg hover:shadow-[var(--color-primary-500)]/35 hover:scale-105',
                          'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100',
                          'active:scale-95 transition-all duration-150',
                          ui.ringFocus,
                        )}
                        title={t('composer.send')}
                        aria-label={t('composer.send')}
                      >
                        {sending ? <Loader2 className='animate-spin w-4 h-4' /> : <Send className='w-4 h-4 ltr:translate-x-px rtl:-translate-x-px' />}
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={startVoiceRecording}
                        disabled={sending}
                        className={cls(
                          'h-9 w-9 rounded-full grid place-items-center',
                          'bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]',
                          'text-white shadow-md shadow-[var(--color-primary-500)]/25',
                          'hover:shadow-lg hover:shadow-[var(--color-primary-500)]/35 hover:scale-105',
                          'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100',
                          'active:scale-95 transition-all duration-150',
                          ui.ringFocus,
                        )}
                        title={t('composer.voice', { defaultValue: 'Voice message' })}
                        aria-label={t('composer.voice', { defaultValue: 'Voice message' })}
                      >
                        <Mic className='w-4 h-4' />
                      </button>
                    )}
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
              'h-14 border-b border-slate-200/60 px-3 flex items-center justify-between',
              'bg-white'
            )}>
              <div className='text-sm font-semibold text-slate-800'>{t('list.title', { defaultValue: 'Conversations' })}</div>
              <button 
                onClick={() => setDrawerOpen(false)} 
                className={cls(
                  'inline-flex items-center justify-center h-9 w-9 rounded-xl',
                  'border border-slate-200 bg-white hover:bg-slate-50',
                  'transition-all text-slate-600',
                  ui.ringFocus
                )}
                aria-label={t('actions.close')}
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='p-3 border-b border-slate-200/60 bg-white space-y-2'>
              <div className='relative'>
                <Search className={cls(
                  'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400',
                  isRTL ? 'right-3' : 'left-3'
                )} />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder={t('search.placeholder')} 
                  className={cls(
                    'w-full h-10 rounded-xl border border-slate-200',
                    'bg-slate-50 focus:bg-white',
                    'focus:border-[var(--color-primary-400)] focus:shadow-sm',
                    'transition-all duration-150 text-sm',
                    ui.ringFocus,
                    isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'
                  )} 
                />
                {searching && (
                  <Loader2 className={cls(
                    'absolute top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--color-primary-500)]',
                    isRTL ? 'left-3' : 'right-3'
                  )} />
                )}
              </div>

              <div role='tablist' className='grid grid-cols-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70'>
                <button
                  type='button'
                  role='tab'
                  aria-selected={filterTab === 'all'}
                  onClick={() => setFilterTab('all')}
                  className={cls(
                    'h-8 rounded-lg text-xs font-semibold transition-all',
                    ui.ringFocus,
                    filterTab === 'all'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-500',
                  )}
                >
                  {t('tabs.all')}
                </button>
                <button
                  type='button'
                  role='tab'
                  aria-selected={filterTab === 'unread'}
                  onClick={() => setFilterTab('unread')}
                  className={cls(
                    'h-8 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5',
                    ui.ringFocus,
                    filterTab === 'unread'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-500',
                  )}
                >
                  {t('tabs.unread')}
                  {unreadTotal > 0 && (
                    <span className={cls(
                      'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center',
                      filterTab === 'unread'
                        ? 'bg-[var(--color-primary-500)] text-white'
                        : 'bg-slate-200 text-slate-600',
                    )}>
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                </button>
              </div>

              {user?.role === 'client' && (
                <div className='gap-2 flex items-center'>
                  <button 
                    type='button' 
                    onClick={contactCoach} 
                    className={cls(
                      'flex-1 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold',
                      'inline-flex items-center justify-center gap-2',
                      'hover:bg-slate-50 active:scale-[.98] transition-all',
                      ui.ringFocus
                    )}
                  >
                    <Phone size={15} />
                    {t('quick.coach')}
                  </button>
                  {me?.adminId && (
                    <button 
                      type='button' 
                      onClick={contactAdmin} 
                      className={cls(
                        'flex-1 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold',
                        'inline-flex items-center justify-center gap-2',
                        'hover:bg-slate-50 active:scale-[.98] transition-all',
                        ui.ringFocus
                      )}
                    >
                      <Phone size={15} />
                      {t('quick.admin')}
                    </button>
                  )}
                </div>
              )}

              {!!results.length && (
                <div className='rounded-xl border border-slate-200/60 overflow-hidden bg-white shadow-sm'>
                  <div className='px-3 py-2 text-[11px] font-semibold text-slate-500 bg-slate-50'>
                    {t('search.results')}
                  </div>
                  <ul className='max-h-48 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
                    {results.map(u => (
                      <li key={u.id} className='border-t border-slate-100/60 first:border-t-0'>
                        <button 
                          onClick={() => openDirectWith(u.id)} 
                          className={cls(
                            'w-full px-2.5 py-2 hover:bg-slate-50 flex items-center gap-2.5',
                            'transition-all',
                            ui.ringFocus,
                          )}
                        >
                          <UserAvatar user={u} size={34} />
                          <div className='min-w-0 flex-1'>
                            <MultiLangText className='text-[13px] font-semibold text-slate-900 truncate'>
                              {u.name || u.email}
                            </MultiLangText>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className='p-2 flex-1 min-h-0 h-[calc(100%-160px)] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300'>
              {filteredConvos.length ? (
                <ul className='space-y-0.5'>
                  {filteredConvos.map(c => {
                    const others = (c.chatParticipants || []).map(p => p.user).filter(u => me && u?.id !== me.id);
                    const peer = others[0] || null;
                    const title = c.isGroup ? c.name || t('list.group') : peer?.name || peer?.email || t('list.direct');
                    const last = c.lastMessage;
                    const preview = last?.messageType === 'text' ? last?.content : last?.messageType === 'image' ? t('list.photo') : last?.messageType === 'video' ? t('list.video') : last?.messageType === 'voice' ? t('list.voice') : last?.messageType === 'file' ? t('list.file') : '';
                    const hasUnread = Number(c.unreadCount) > 0;

                    return (
                      <li key={c.id}>
                        <button 
                          onClick={() => onSelectConversation(c.id)} 
                          className={cls(
                            'w-full px-2.5 py-2 rounded-xl transition-all duration-150',
                            ui.ringFocus,
                            activeId === c.id 
                              ? 'bg-[var(--color-primary-50)] border border-[var(--color-primary-200)]' 
                              : 'border border-transparent hover:bg-slate-50'
                          )}
                        >
                          <div className='flex items-center gap-2.5'>
                            <UserAvatar user={peer} size={42} hasUnread={hasUnread} online={!!peer?.online} />
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-center justify-between gap-2'>
                                <MultiLangText className={cls('text-[13px] truncate', hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800')}>
                                  {title}
                                </MultiLangText>
                                <div className='font-en text-[10px] text-slate-400 shrink-0'>
                                  {last?.created_at ? timeHHMM(last.created_at) : ''}
                                </div>
                              </div>
                              <div className='flex items-center justify-between gap-2 mt-0.5'>
                                <MultiLangText className='text-[12px] text-slate-500 truncate flex-1'>
                                  {preview}
                                </MultiLangText>
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
                <div className='p-10 text-center text-slate-500'>
                  <div className='mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200'>
                    <Inbox className='w-7 h-7 text-slate-400' />
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

/* --------------------------- MessageList --------------------------- */
function MessageList({ msgs, me, API_URL, endRef, t, typing, colors, onContentReady }) {
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

  useLayoutEffect(() => {
    onContentReady?.();
  }, [msgs.length, typing, onContentReady]);

  const resolveUrl = url => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const base = String(API_URL || '').replace(/\/+$/, '');
    const path = String(url).startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  };

  return (
    <div className='min-h-full flex flex-col justify-end gap-2.5'>
      {groups.map(item => {
        if (item.type === 'sep') {
          return (
            <div key={item.id} className='sticky top-1 z-10 py-1'>
              <MultiLangText className='mx-auto block w-fit text-[11px] px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200/80 text-slate-500 font-semibold shadow-sm'>
                {item.label}
              </MultiLangText>
            </div>
          );
        }

        const m = item.data;
        const mine = (m?.sender?.id ?? m?.senderId) === me?.id;
        const other = m?.sender || m?.from || m?.user || {};
        const time = timeHHMM(m.created_at);
        const pending = !!m.pending;

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
              <div className={cls('grid gap-1.5', m.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                {m.attachments.map((a, i) => {
                  const href = resolveUrl(a.url);
                  return (
                    <a
                      key={i}
                      href={href}
                      target='_blank'
                      rel='noreferrer'
                      className='block overflow-hidden rounded-xl hover:opacity-95 transition-opacity'
                    >
                      {a.local || String(a.url || '').startsWith('blob:') ? (
                        <img src={a.url} alt={a.name} className='w-full h-40 object-cover' />
                      ) : (
                        <Img src={a.url} alt={a.name} className='w-full h-40 object-cover' showBlur={false} />
                      )}
                    </a>
                  );
                })}
              </div>
            );
          }
          if (m.messageType === 'video' && Array.isArray(m.attachments)) {
            return (
              <div className='space-y-2'>
                {m.attachments.map((a, i) => (
                  <video
                    key={i}
                    src={resolveUrl(a.url)}
                    controls
                    className='w-full rounded-xl overflow-hidden max-h-64 border border-white/20'
                  />
                ))}
              </div>
            );
          }
          if (m.messageType === 'voice' || (m.messageType === 'file' && /^audio\//.test(m.attachments?.[0]?.type || m.attachments?.[0]?.mimeType || ''))) {
            const att = Array.isArray(m.attachments) ? m.attachments[0] : null;
            const voiceUrl = resolveUrl(m.voiceUri || att?.url || '');
            const voiceDur = m.voiceDuration || att?.duration || 0;
            if (!voiceUrl) return null;
            return <VoiceBubble url={voiceUrl} duration={voiceDur} mine={mine} />;
          }
          if (m.messageType === 'file' && Array.isArray(m.attachments)) {
            return (
              <div className='space-y-2'>
                {m.attachments.map((a, i) => (
                  <a
                    key={i}
                    href={resolveUrl(a.url)}
                    target='_blank'
                    rel='noreferrer'
                    className={cls(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors border',
                      mine
                        ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700',
                    )}
                  >
                    <FileIcon className={cls('w-4 h-4 shrink-0', mine ? 'text-white' : 'text-slate-600')} />
                    <span className='text-sm truncate flex-1 font-medium'>{a.name}</span>
                    <span className={cls('text-[10px] tabular-nums', mine ? 'text-white/80' : 'text-slate-500')}>
                      {a.size ? `${Math.round(a.size / 1024)} KB` : ''}
                    </span>
                  </a>
                ))}
              </div>
            );
          }
          return null;
        };

        return (
          <div
            key={m.id || m.tempId}
            className={cls(
              'flex items-end gap-2',
              mine ? 'justify-end' : 'justify-start',
              pending && 'opacity-70',
            )}
          >
            {!mine && <UserAvatar user={other} size={28} />}

            <div
              className={cls(
                'relative max-w-[min(420px,78%)] px-3.5 py-2.5',
                'shadow-sm',
                mine
                  ? 'bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] text-white rounded-2xl rtl:rounded-bl-md ltr:rounded-br-md'
                  : 'bg-white text-slate-800 rounded-2xl rtl:rounded-br-md ltr:rounded-bl-md border border-slate-200/80',
              )}
            >
              <Content />
              <div
                className={cls(
                  'mt-1.5 text-[10px] flex items-center gap-1 tabular-nums font-medium',
                  mine ? 'text-white/85 justify-end' : 'text-slate-400',
                )}
              >
                {pending && <Loader2 className='w-3 h-3 animate-spin opacity-80' />}
                <MultiLangText>{time}</MultiLangText>
                {!pending && <ReadTicks meId={me?.id} msg={m} />}
              </div>
            </div>
          </div>
        );
      })}

      {typing && (
        <div className='flex justify-start items-end gap-2'>
          <div className='h-7 w-7 rounded-full bg-slate-200 grid place-items-center text-slate-500 text-xs font-bold'>…</div>
          <div className='rounded-2xl px-4 py-3 shadow-sm bg-white border border-slate-200/80 rtl:rounded-br-md ltr:rounded-bl-md'>
            <div className='flex gap-1 items-center h-3'>
              <div className='w-1.5 h-1.5 bg-[var(--color-primary-500)] rounded-full animate-bounce' style={{ animationDelay: '0ms' }} />
              <div className='w-1.5 h-1.5 bg-[var(--color-primary-500)] rounded-full animate-bounce' style={{ animationDelay: '150ms' }} />
              <div className='w-1.5 h-1.5 bg-[var(--color-primary-500)] rounded-full animate-bounce' style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} className='h-px w-full shrink-0' />
    </div>
  );
}

const MessageSkeleton = () => (
  <div className='min-h-full flex flex-col justify-end gap-3'>
    {[...Array(6)].map((_, i) => {
      const mine = i % 2 === 1;
      return (
        <div key={i} className={cls('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
          {!mine && <div className='h-8 w-8 rounded-full bg-slate-200/80' />}
          <div
            className={cls(
              'rounded-2xl h-14 animate-pulse',
              mine ? 'bg-slate-200/70 w-48' : 'bg-slate-200/80 w-56 border border-slate-100',
            )}
          />
        </div>
      );
    })}
  </div>
);