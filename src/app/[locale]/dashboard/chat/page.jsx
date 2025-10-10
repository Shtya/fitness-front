// src/app/[locale]/dashboard/chat/page.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, ToolbarButton, EmptyState, SearchInput } from '@/components/dashboard/ui/UI';
import { MessageSquare, Plus, Paperclip, Send, Image as ImageIcon, Phone, Video, Info, Pin, PinOff, Trash2, MoreVertical, ArrowLeft, CheckCheck, Check, Clock, Users, UserPlus, Search, X, User, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';
import api, { baseImg } from '@/utils/axios';
import { useUser } from '@/hooks/useUser';
import { FaSpinner } from 'react-icons/fa';

export default function MessagesPage() {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinned, setShowPinned] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const sentTempIds = useRef(new Set()); // Track sent temporary IDs

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_BASE_URL, {
      auth: { token },
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
      // Re-join active conversation if exists
      if (activeConversation) {
        socketRef.current.emit('join_conversation', activeConversation.id);
      }
    });

    socketRef.current.on('new_message', message => {
      console.log('New message received:', message);

      // FIXED: Safe conversation ID access and duplicate prevention
      const conversationId = message.conversation?.id || message.conversationId;

      // Prevent duplicate messages by checking tempId
      if (message.tempId && sentTempIds.current.has(message.tempId)) {
        sentTempIds.current.delete(message.tempId);
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg => (msg.id === message.tempId ? message : msg)));
      } else if (conversationId === activeConversation?.id) {
        // Only add if not a duplicate
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === message.id);
          return exists ? prev : [...prev, message];
        });
      }

      // Update conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessage: message,
                lastMessageAt: message.created_at,
              }
            : conv,
        ),
      );
    });

    socketRef.current.on('user_typing', data => {
      setTypingUsers(prev => ({
        ...prev,
        [data.conversationId]: data.typing ? data : null,
      }));
    });

    socketRef.current.on('user_online', data => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.online) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    socketRef.current.on('messages_read', data => {
      if (data.conversationId === activeConversation?.id) {
        // Update message read status if needed
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [activeConversation]);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
      joinConversation(activeConversation.id);
      markAsRead(activeConversation.id);
    }
  }, [activeConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Search users when query changes
  useEffect(() => {
    if (userSearchQuery.trim()) {
      searchUsers(userSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [userSearchQuery]);

  const loadConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      console.log('Conversations loaded:', response.data);
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async conversationId => {
    try {
      // FIXED: Ensure proper pagination parameters
      const response = await api.get(`/chat/conversations/${conversationId}/messages?page=1&limit=100`);
      console.log('Messages loaded:', response.data);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const searchUsers = async query => {
    setUserSearchLoading(true);
    try {
      const response = await api.get(`/chat/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const startConversationWithUser = async targetUser => {
    try {
      const response = await api.post(`/chat/conversations/direct/${targetUser.id}`);
      const conversation = response.data;

      setConversations(prev => [conversation, ...prev]);
      setActiveConversation(conversation);
      setShowUserSearch(false);
      setUserSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const joinConversation = conversationId => {
    if (socketRef.current) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  };

  const markAsRead = conversationId => {
    if (socketRef.current) {
      socketRef.current.emit('mark_as_read', conversationId);
    }
  };

  // UPLOAD FILE FUNCTION
  const uploadFile = async file => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      let endpoint = '/chat/upload/file';
      if (file.type.startsWith('image/')) {
        endpoint = '/chat/upload/image';
      } else if (file.type.startsWith('video/')) {
        endpoint = '/chat/upload/video';
      }

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // FIXED SEND MESSAGE FUNCTION
  const sendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) return;

    setSending(true);

    try {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sentTempIds.current.add(tempId);

      let uploadedAttachments = [];

      // Upload files if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const uploadResult = await uploadFile(file);
          uploadedAttachments.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: uploadResult.url || `/uploads/chat/${file.type.startsWith('image/') ? 'images' : file.type.startsWith('video/') ? 'videos' : 'files'}/${uploadResult.filename}`,
          });
        }
      }

      const messageData = {
        conversationId: activeConversation.id,
        content: messageText.trim(),
        messageType: attachments.length > 0 ? 'file' : 'text',
        attachments: uploadedAttachments,
        tempId: tempId, // Include tempId to prevent duplicates
      };

      console.log('Sending message:', messageData);

      // Optimistically add message to UI
      const optimisticMessage = {
        id: tempId,
        content: messageData.content,
        messageType: messageData.messageType,
        attachments: messageData.attachments,
        created_at: new Date().toISOString(),
        sender: user,
        conversation: { id: activeConversation.id },
        isOptimistic: true, // Mark as optimistic
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setMessageText('');
      setAttachments([]);

      // Send via socket
      if (socketRef.current) {
        socketRef.current.emit('send_message', messageData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      sentTempIds.current.delete(tempId);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socketRef.current && activeConversation) {
      socketRef.current.emit('typing_start', activeConversation.id);

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('typing_stop', activeConversation.id);
      }, 3000);
    }
  };

  // Safe rendering for other participants
  const getOtherParticipants = conversation => {
    const currentUserId = user?.id;
    if (!conversation?.chatParticipants) return [];
    return conversation.chatParticipants
      .filter(p => p?.user?.id !== currentUserId)
      .map(p => p.user)
      .filter(user => user != null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAttachFiles = e => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = index => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const filteredConversations = useMemo(() => {
    let filtered = conversations.filter(conv => conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) || getOtherParticipants(conv).some(p => p?.name?.toLowerCase().includes(searchQuery.toLowerCase())));

    if (showPinned) {
      filtered.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    }

    return filtered.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  }, [conversations, searchQuery, showPinned]);

  const formatTime = dateString => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = dateString => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Safe rendering for conversation names
  const getConversationName = conversation => {
    if (!conversation) return 'Unknown Conversation';
    if (conversation.name) return conversation.name;
    const others = getOtherParticipants(conversation);
    if (others.length === 0) return 'Unknown User';
    return others.map(p => p?.name || 'Unknown User').join(', ');
  };

  const TypingDots = () => (
    <div className='flex space-x-1'>
      <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '0ms' }} />
      <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '150ms' }} />
      <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '300ms' }} />
    </div>
  );

  const bodyRef = useRef(null);

  const scrollBodyToBottom = (behavior = 'smooth') => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior });
  };

  useEffect(() => {
    scrollBodyToBottom('smooth');
  }, [messages.length]);

  return (
    <div className='space-y-6'>
      <PageHeader
        icon={MessageSquare}
        title='Messages'
        subtitle='Chat with clients and your coaching team.'
        actions={
          <ToolbarButton icon={Plus} onClick={() => setShowUserSearch(true)}>
            New message
          </ToolbarButton>
        }
      />

      {/* User Search Modal */}
      <AnimatePresence>
        {showUserSearch && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className='bg-white rounded-lg w-full max-w-md p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold'>Start New Conversation</h3>
                <button
                  onClick={() => {
                    setShowUserSearch(false);
                    setUserSearchQuery('');
                    setSearchResults([]);
                  }}
                  className='p-1 hover:bg-gray-100 rounded-lg'>
                  <X className='w-5 h-5' />
                </button>
              </div>

              <SearchInput value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} placeholder='Search users by name or email...' autoFocus />

              <div className='mt-4 max-h-64 overflow-y-auto'>
                {userSearchLoading ? (
                  <div className='flex justify-center py-4'>
                    <TypingDots />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <button key={user.id} onClick={() => startConversationWithUser(user)} className='w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3'>
                      <Avatar name={user.name} size={40} />
                      <div className='flex-1'>
                        <div className='font-medium text-gray-900'>{user.name}</div>
                        <div className='text-sm text-gray-500'>{user.email}</div>
                        <div className='text-xs text-gray-400 capitalize'>{user.role}</div>
                      </div>
                    </button>
                  ))
                ) : userSearchQuery ? (
                  <div className='text-center py-4 text-gray-500'>No users found</div>
                ) : (
                  <div className='text-center py-4 text-gray-500'>Start typing to search users</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        {/* Conversations List */}
        <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className='lg:col-span-4 rounded-lg border border-gray-200 bg-white p-4 h-[70vh] flex flex-col shadow-sm'>
          <div className='flex items-center gap-2 mb-4'>
            <SearchInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder='Search conversations...' className='flex-1' />
            <button className={`p-2 rounded-lg border transition-colors ${showPinned ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`} onClick={() => setShowPinned(v => !v)} title={showPinned ? 'Show all' : 'Show pinned first'}>
              {showPinned ? <Pin className='w-4 h-4' /> : <PinOff className='w-4 h-4' />}
            </button>
          </div>

          <div className='flex-1 overflow-y-auto space-y-1'>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='animate-pulse p-3 flex items-center gap-3'>
                  <div className='w-12 h-12 rounded-full bg-gray-200' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 bg-gray-200 rounded w-3/4' />
                    <div className='h-3 bg-gray-200 rounded w-1/2' />
                  </div>
                </div>
              ))
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map(conversation => (
                <button key={conversation.id} onClick={() => setActiveConversation(conversation)} className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${activeConversation?.id === conversation.id ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}>
                  <div className='flex items-center gap-3'>
                    <Avatar name={getConversationName(conversation)} online={getOtherParticipants(conversation).some(p => onlineUsers.has(p.id))} isGroup={conversation.isGroup} size={48} />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between gap-2 mb-1'>
                        <div className='font-semibold text-gray-900 truncate text-sm'>{getConversationName(conversation)}</div>
                        <div className='flex items-center gap-1'>
                          {conversation.unreadCount > 0 && <span className='px-2 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium min-w-[20px] text-center'>{conversation.unreadCount}</span>}
                          <span className='text-xs text-gray-500 whitespace-nowrap'>{conversation.lastMessageAt && formatTime(conversation.lastMessageAt)}</span>
                        </div>
                      </div>
                      <div className='text-xs text-gray-600 truncate'>{conversation.lastMessage?.content || 'No messages yet'}</div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState title='No conversations' subtitle='Start a new conversation to begin messaging.' icon={MessageSquare} />
            )}
          </div>
        </motion.aside>

        {/* Chat Thread */}
        <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className='lg:col-span-8 rounded-lg border border-gray-200 bg-white h-[70vh] flex flex-col shadow-sm'>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className='px-6 py-4 border-b border-gray-200 flex items-center gap-4 bg-white rounded-t-2xl'>
                <button className='lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors' onClick={() => setActiveConversation(null)}>
                  <ArrowLeft className='w-5 h-5 text-gray-600' />
                </button>

                <Avatar name={getConversationName(activeConversation)} online={getOtherParticipants(activeConversation).some(p => onlineUsers.has(p.id))} isGroup={activeConversation.isGroup} size={48} />
                <div className='flex-1 min-w-0'>
                  <h3 className='font-semibold text-gray-900 text-lg'>{getConversationName(activeConversation)}</h3>
                  <p className='text-sm text-gray-600'>{activeConversation.isGroup ? `${activeConversation.chatParticipants?.length} participants` : getOtherParticipants(activeConversation).some(p => onlineUsers.has(p.id)) ? 'Online • Active now' : 'Offline'}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <button className='p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900'>
                    <Phone className='w-5 h-5' />
                  </button>
                  <button className='p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900'>
                    <Video className='w-5 h-5' />
                  </button>
                  <button className='p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900'>
                    <Info className='w-5 h-5' />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={bodyRef} className='flex-1 overflow-y-auto px-6 py-4 bg-gray-50'>
                <div className='space-y-4'>
                  {messages.map((message, index) => {
                    const isCurrentUser = message.sender?.id === user?.id;
                    const showDate = index === 0 || new Date(message.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();
                    const isOptimistic = message.isOptimistic;

                    return (
                      <div key={message.id}>
                        {showDate && <div className='text-center text-sm text-gray-500 my-6'>{formatDate(message.created_at)}</div>}
                        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} gap-3`}>
                          {!isCurrentUser && <Avatar name={message.sender?.name} online={onlineUsers.has(message.sender?.id)} size={36} />}
                          <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isCurrentUser ? 'bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-900 shadow-sm'} ${isOptimistic ? 'opacity-70' : ''}`}>
                            {!isCurrentUser && activeConversation.isGroup && <div className='text-xs font-semibold mb-1 text-gray-700'>{message.sender?.name}</div>}
                            {message.content && <div className='whitespace-pre-wrap break-words text-sm leading-relaxed'>{message.content}</div>}
                            {message.attachments?.map((attachment, i) => (
                              <div key={i} className='my-1 bg-white/80 p-1 rounded-lg '>
                                {attachment.type?.startsWith('image/') ? (
                                  <img src={baseImg + attachment.url} alt={attachment.name} className='  max-w-[200px]   object-contain' />
                                ) : attachment.type?.startsWith('video/') ? (
                                  <video src={baseImg + attachment.url} controls className='max-w-[200px]   object-contain' />
                                ) : (
                                  <a href={baseImg + attachment.url} className='flex items-center gap-2 p-3 border  bg-white hover:bg-gray-50 transition-colors' target='_blank' rel='noopener noreferrer'>
                                    <Paperclip className='w-4 h-4 text-gray-400' />
                                    <span className='text-sm text-gray-700'>{attachment.name.length > 15 ? attachment.name.slice(0, 15) + '...' : attachment.name}</span>
                                  </a>
                                )}
                              </div>
                            ))}

                            <div className={`mt-0 flex items-center gap-1 text-xs ${isCurrentUser ? 'text-white/80' : 'text-gray-500'}`}>
                              <span className='text-[12px]' >{formatTime(message.created_at)}</span>
                              {isCurrentUser && !isOptimistic && <CheckCheck size={16} />}
                              {isOptimistic && <Clock className='w-3 h-3' />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {typingUsers[activeConversation.id] && (
                    <div className='flex items-end gap-3'>
                      <Avatar name={typingUsers[activeConversation.id].userName} size={36} />
                      <div className='px-4 py-3 rounded-lg bg-white border border-gray-200 shadow-sm'>
                        <TypingDots />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Composer */}
              <div className='px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl'>
                <div className=' '>
                  {attachments.length > 0 && (
                    <div className='mb-3 flex flex-wrap gap-2'>
                      {attachments.map((file, index) => (
                        <div key={index} className='group relative w-20 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50'>
                          <AttachmentPreview file={file} />
                          <button onClick={() => removeAttachment(index)} className='absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm' title='Remove'>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className='flex items-center gap-2'>
                    <input ref={fileInputRef} type='file' multiple className='hidden' onChange={handleAttachFiles} accept='image/*,video/*,.pdf,.doc,.docx,.txt' />

                    <input
                      placeholder='Type your message...'
                      value={messageText}
                      onChange={e => {
                        setMessageText(e.target.value);
                        handleTyping();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className='flex-1 h-9 px-2  rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm placeholder-gray-400'
                    />

                    <button className='w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900' title='Attach files' onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className='w-5 h-5' />
                    </button>

                    <SendButton loading={loading} text={'send msg'} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className='flex-1 flex flex-col items-center justify-center text-center p-8'>
              <div className='w-24 h-24 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mb-6'>
                <MessageSquare className='w-10 h-10 text-indigo-600' />
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>Welcome to Messages</h3>
              <p className='text-gray-600 max-w-sm mb-6'>Select a conversation from the list or start a new one to begin messaging.</p>
              <button onClick={() => setShowUserSearch(true)} className='px-6 py-3 bg-gradient-to-br from-indigo-600 to-blue-500 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2'>
                <Plus className='w-5 h-5' />
                Start New Conversation
              </button>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}

// Avatar Component
function Avatar({ name, online = false, size = 40, isGroup = false }) {
  const initials = name
    ? name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <div className='relative h-fit'>
      <div
        className={`rounded-full flex items-center justify-center text-white font-semibold shadow-sm ${isGroup ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.35,
        }}>
        {isGroup ? <Users className='w-1/2 h-1/2' /> : initials}
      </div>
      {online && !isGroup && <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm' />}
    </div>
  );
}

function SendButton({ loading, text }) {
  return (
    <button type='submit' disabled={loading} aria-label={text} title={text} className={['relative inline-flex items-center rounded-lg', 'text-[13px] font-medium bg-gradient-to-br from-indigo-600', loading ? '  to-indigo-400' : ' to-blue-500 text-white  ', 'shadow-sm transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed'].join(' ')}>
      <span className='grid place-items-center rounded-lg h-9 w-9 bg-white/10'>{loading ? <FaSpinner className='h-3.5 w-3.5 animate-spin' /> : <Send size={14} />}</span>

      {/* subtle progress overlay when loading */}
      {loading && <span className='absolute inset-0 rounded-lg ring-1 ring-white/10' />}
    </button>
  );
}

function truncateKeepExt(name, max = 10) {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return name.length > max ? name.slice(0, max) + '...' : name;
  const base = name.slice(0, dot);
  const ext = name.slice(dot); // includes "."
  if (base.length <= max) return base + ext;
  return base.slice(0, max) + '...' + ext;
}

function useObjectUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

function AttachmentPreview({ file }) {
  const url = useObjectUrl(file);
  const name = truncateKeepExt(file.name, 10);

  if (file.type?.startsWith('image/')) {
    return <img src={url} alt={file.name} className='w-full h-full object-contain' loading='lazy' />;
  }

  if (file.type?.startsWith('video/')) {
    return <video src={url} className='w-full h-full object-contain' muted controls playsInline />;
  }

  return (
    <div className='w-full h-full flex flex-col items-center justify-center p-1'>
      <Paperclip className='w-6 h-6 text-gray-400 mb-1' />
      <span className='text-[10px] text-gray-600 text-center break-words leading-tight'>{name}</span>
    </div>
  );
}
