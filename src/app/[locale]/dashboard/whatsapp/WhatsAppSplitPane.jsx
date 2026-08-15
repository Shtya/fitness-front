'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
	Check,
	CheckCheck,
	Clock,
	Columns2,
	FileText,
	Image as ImageIcon,
	Loader2,
	Mic,
	Send,
	Square,
	X,
} from 'lucide-react';
import api from '@/utils/axios';
import {
	conversationTitle,
	conversationAvatarUrl,
	mergeMessages,
	messageDeliveryState,
	messageTextPresentation,
} from './whatsapp-utils';

const MESSAGE_PAGE_SIZE = 100;

function newClientMessageId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatRecordingDuration(seconds) {
	const value = Math.max(0, Number(seconds) || 0);
	const minutes = Math.floor(value / 60);
	const remainingSeconds = value % 60;
	return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function DeliveryTicks({ message }) {
	const state = messageDeliveryState(message);
	if (state === 'hidden') return null;
	if (state === 'pending') return <Clock size={12} className="animate-pulse" />;
	if (state === 'read') return <CheckCheck size={12} className="text-[#53BDEB]" />;
	if (state === 'delivered') return <CheckCheck size={12} className="text-[#8696A0]" />;
	return <Check size={12} />;
}

function SplitAvatar({ label = '?', src = '', size = 36 }) {
	return (
		<div
			className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#dfe5e7] text-[#54656f] shadow-sm"
			style={{ width: size, height: size }}
			title={label}
		>
			<svg width="52%" height="52%" viewBox="0 0 24 24" aria-hidden="true">
				<path
					fill="currentColor"
					d="M19.652 19.405c.552-.115.882-.693.607-1.187c-.606-1.087-1.56-2.043-2.78-2.771C15.907 14.509 13.98 14 12 14s-3.907.508-5.479 1.447c-1.22.728-2.174 1.684-2.78 2.771c-.275.494.055 1.072.607 1.187a37.5 37.5 0 0 0 15.303 0"
				/>
				<circle cx="12" cy="8" r="5" fill="currentColor" />
			</svg>
			{src ? (
				<img
					src={src}
					alt=""
					className="absolute inset-0 h-full w-full object-cover"
					referrerPolicy="no-referrer"
					onError={event => {
						event.currentTarget.style.display = 'none';
					}}
				/>
			) : null}
		</div>
	);
}

function SplitAttachment({ attachment, labels, ar }) {
	const type = String(attachment?.type || '').toLowerCase();
	const [url, setUrl] = useState(null);
	const [loading, setLoading] = useState(false);
	const audioRef = useRef(null);
	const [playing, setPlaying] = useState(false);

	const load = useCallback(async () => {
		if (!attachment?.id || String(attachment.id).startsWith('live')) return;
		setLoading(true);
		try {
			const { data } = await api.get(`/whatsapp/attachments/${attachment.id}/content`, {
				responseType: 'blob',
				timeout: 20000,
			});
			const objectUrl = URL.createObjectURL(data);
			setUrl(objectUrl);
			return objectUrl;
		} catch {
			toast.error(ar ? 'تعذر تحميل المرفق' : 'Could not load attachment');
			return null;
		} finally {
			setLoading(false);
		}
	}, [ar, attachment?.id]);

	useEffect(
		() => () => {
			if (url) URL.revokeObjectURL(url);
		},
		[url],
	);

	if (['audio', 'ptt', 'voice'].includes(type)) {
		return (
			<div className="mb-1 flex min-w-[200px] items-center gap-2 rounded-xl bg-black/5 px-2 py-2">
				<audio
					ref={audioRef}
					src={url || undefined}
					className="hidden"
					onEnded={() => setPlaying(false)}
				/>
				<button
					type="button"
					disabled={loading}
					onClick={async () => {
						let ready = url;
						if (!ready) ready = await load();
						const audio = audioRef.current;
						if (!audio || !ready) return;
						if (playing) {
							audio.pause();
							setPlaying(false);
							return;
						}
						if (audio.src !== ready) audio.src = ready;
						await audio.play();
						setPlaying(true);
					}}
					className="grid h-9 w-9 place-items-center rounded-full bg-[#00a884] text-white"
					aria-label={playing ? 'Pause' : 'Play'}
				>
					{loading ? (
						<Loader2 size={14} className="animate-spin" />
					) : playing ? (
						<svg width="12" height="12" viewBox="0 0 24 24">
							<path fill="currentColor" d="M7 5h3v14H7zm7 0h3v14h-3z" />
						</svg>
					) : (
						<svg width="12" height="12" viewBox="0 0 24 24">
							<path fill="currentColor" d="M8 5v14l11-7z" />
						</svg>
					)}
				</button>
				<div className="min-w-0 flex-1">
					<p className="text-xs font-bold">{labels.ptt || (ar ? 'رسالة صوتية' : 'Voice message')}</p>
					<p className="text-[10px] text-slate-500">{attachment.fileName || type}</p>
				</div>
				<Mic size={14} className="text-[#00a884]" />
			</div>
		);
	}

	if (type === 'image' || type === 'sticker') {
		return (
			<button
				type="button"
				disabled={loading}
				onClick={async () => {
					const ready = url || (await load());
					if (ready) window.open(ready, '_blank', 'noopener,noreferrer');
				}}
				className="mb-1 flex items-center gap-2 rounded-xl bg-black/5 px-2 py-2 text-xs font-bold"
			>
				{loading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
				{ar ? 'صورة' : 'Photo'}
			</button>
		);
	}

	return (
		<div className="mb-1 flex items-center gap-2 rounded-xl bg-black/5 px-2 py-2 text-xs font-bold">
			<FileText size={14} />
			<span className="truncate">{attachment.fileName || type || (ar ? 'مرفق' : 'Attachment')}</span>
		</div>
	);
}

export default function WhatsAppSplitPane({
	conversation,
	accountId,
	locale = 'en',
	labels = {},
	canCompose = true,
	onClose,
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const conversationId = conversation?.id || null;
	const title = conversation ? conversationTitle(conversation) : '';
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [draft, setDraft] = useState('');
	const [sending, setSending] = useState(false);
	const [recordingVoice, setRecordingVoice] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const scrollRef = useRef(null);
	const loadingOlderRef = useRef(false);
	const mediaRecorderRef = useRef(null);
	const recordingStreamRef = useRef(null);
	const recordingChunksRef = useRef([]);
	const recordingTimerRef = useRef(null);
	const recordingSecondsRef = useRef(0);
	const discardRecordingRef = useRef(false);
	const stickToBottomRef = useRef(true);

	const loadMessages = useCallback(async () => {
		if (!conversationId) return;
		setLoading(true);
		setHasMore(true);
		try {
			const { data } = await api.get(`/whatsapp/conversations/${conversationId}/messages`, {
				params: { limit: MESSAGE_PAGE_SIZE, live: 0 },
			});
			const local = Array.isArray(data?.items)
				? data.items
				: Array.isArray(data)
					? data
					: [];
			let next = local;
			let providerHasMore;
			// Prefer Postgres page. Ask WhatsApp for older history when the local
			// page is still short, not only when it is completely empty.
			if (accountId && canCompose && local.length < MESSAGE_PAGE_SIZE) {
				try {
					const synced = await api.post(
						`/whatsapp/conversations/${conversationId}/sync/latest`,
						null,
						{
							params: { limit: MESSAGE_PAGE_SIZE },
							timeout: 90000,
						},
					);
					const syncedItems = Array.isArray(synced?.data?.items)
						? synced.data.items
						: [];
					next = mergeMessages(local, syncedItems);
					providerHasMore = synced?.data?.hasMore;
				} catch {
					/* keep DB/local result */
				}
			}
			setMessages(next);
			setHasMore(
				typeof providerHasMore === 'boolean'
					? providerHasMore
					: local.length >= MESSAGE_PAGE_SIZE,
			);
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
					(ar ? 'تعذر تحميل الرسائل' : 'Could not load messages'),
			);
			setMessages([]);
		} finally {
			setLoading(false);
		}
	}, [accountId, ar, canCompose, conversationId]);

	const loadOlder = useCallback(async () => {
		if (!conversationId || loadingOlderRef.current || !hasMore || !messages.length) return;
		loadingOlderRef.current = true;
		setLoadingOlder(true);
		const box = scrollRef.current;
		const previousHeight = box?.scrollHeight || 0;
		const oldest = messages[0];
		try {
			const { data } = await api.get(`/whatsapp/conversations/${conversationId}/messages`, {
				params: { before: oldest?.id, limit: MESSAGE_PAGE_SIZE, live: 0 },
			});
			let local = Array.isArray(data)
				? data
				: Array.isArray(data?.items)
					? data.items
					: [];
			let synced = [];
			let providerHasMore;
			if (accountId && canCompose && local.length < MESSAGE_PAGE_SIZE) {
				try {
					const response = await api.post(
						`/whatsapp/conversations/${conversationId}/sync/older`,
						null,
						{ params: { limit: MESSAGE_PAGE_SIZE } },
					);
					synced = Array.isArray(response?.data?.items) ? response.data.items : [];
					providerHasMore = response?.data?.hasMore;
				} catch {
					/* keep DB page */
				}
			}
			const incoming = [...local, ...synced];
			if (!incoming.length) {
				setHasMore(false);
				return;
			}
			setHasMore(
				typeof providerHasMore === 'boolean'
					? providerHasMore
					: local.length >= MESSAGE_PAGE_SIZE,
			);
			setMessages(current => mergeMessages(incoming, current));
			requestAnimationFrame(() => {
				const currentBox = scrollRef.current;
				if (currentBox) {
					currentBox.scrollTop += currentBox.scrollHeight - previousHeight;
				}
			});
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
					(ar ? 'تعذر تحميل رسائل أقدم' : 'Could not load older messages'),
			);
		} finally {
			loadingOlderRef.current = false;
			setLoadingOlder(false);
		}
	}, [accountId, ar, canCompose, conversationId, hasMore, messages]);

	useEffect(() => {
		setDraft('');
		setMessages([]);
		void loadMessages();
	}, [loadMessages]);

	useEffect(() => {
		const node = scrollRef.current;
		if (!node || !stickToBottomRef.current) return;
		node.scrollTop = node.scrollHeight;
	}, [messages.length, conversationId]);

	useEffect(
		() => () => {
			if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
			recordingStreamRef.current?.getTracks().forEach(track => track.stop());
			if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
				try {
					mediaRecorderRef.current.stop();
				} catch {
					/* ignore */
				}
			}
		},
		[],
	);

	const sendText = async event => {
		event?.preventDefault?.();
		if (!conversationId || !draft.trim() || sending) return;
		const text = draft.trim();
		const clientMessageId = newClientMessageId();
		const optimistic = {
			id: `pending:${clientMessageId}`,
			clientMessageId,
			type: 'text',
			text,
			direction: 'outbound',
			status: 'pending',
			providerTimestamp: new Date().toISOString(),
			created_at: new Date().toISOString(),
			optimistic: true,
		};
		setDraft('');
		setSending(true);
		stickToBottomRef.current = true;
		setMessages(current => mergeMessages(current, [optimistic]));
		try {
			const { data } = await api.post(`/whatsapp/conversations/${conversationId}/messages`, {
				type: 'text',
				text,
				clientMessageId,
			});
			setMessages(current =>
				mergeMessages(
					current.filter(item => item.id !== optimistic.id),
					[data.message],
				),
			);
		} catch (error) {
			setMessages(current => current.filter(item => item.id !== optimistic.id));
			setDraft(text);
			toast.error(
				error.response?.data?.message || (ar ? 'تعذر إرسال الرسالة' : 'Could not send message'),
			);
		} finally {
			setSending(false);
		}
	};

	const sendVoiceFile = async file => {
		if (!file || !conversationId || !accountId || sending) return;
		setSending(true);
		try {
			const form = new FormData();
			form.append('file', file);
			const { data: uploaded } = await api.post(`/whatsapp/accounts/${accountId}/media`, form);
			const { data } = await api.post(`/whatsapp/conversations/${conversationId}/messages`, {
				type: 'voice',
				fileId: uploaded.fileId,
				clientMessageId: newClientMessageId(),
			});
			stickToBottomRef.current = true;
			setMessages(current => mergeMessages(current, [data.message]));
		} catch (error) {
			toast.error(
				error.response?.data?.message ||
					(ar ? 'تعذر إرسال الرسالة الصوتية' : 'Could not send voice message'),
			);
		} finally {
			setSending(false);
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
			toast.error(ar ? 'التسجيل غير مدعوم' : 'Recording unsupported');
			return;
		}
		let stream = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const supportedTypes = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];
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
				if (discard || !chunks.length) return;
				const recordedType = recorder.mimeType || chunks[0]?.type || 'audio/webm';
				const extension = recordedType.includes('ogg') ? 'ogg' : 'webm';
				const blob = new Blob(chunks, { type: recordedType.split(';')[0] || recordedType });
				if (!blob.size) return;
				const file = new File([blob], `voice-${durationSec}s.${extension}`, {
					type: recordedType.split(';')[0] || recordedType,
				});
				void sendVoiceFile(file);
			};
			recorder.start(250);
			recordingTimerRef.current = setInterval(() => {
				recordingSecondsRef.current += 1;
				setRecordingSeconds(recordingSecondsRef.current);
				if (recordingSecondsRef.current >= 299 && recorder.state !== 'inactive') {
					discardRecordingRef.current = false;
					recorder.stop();
				}
			}, 1000);
		} catch {
			stream?.getTracks().forEach(track => track.stop());
			setRecordingVoice(false);
			toast.error(ar ? 'تعذر الوصول للميكروفون' : 'Microphone access failed');
		}
	};

	if (!conversation) return null;

	return (
		<section className="wa-split-pane flex min-h-0 min-w-0 flex-col overflow-hidden border-s border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
			<header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
						<Columns2 size={14} />
					</span>
					<SplitAvatar label={title} src={conversationAvatarUrl(conversation)} size={36} />
					<div className="min-w-0">
						<p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{title}</p>
						<p className="truncate text-[11px] text-slate-500">
							{ar ? 'شات جانبي' : 'Split chat'}
							{conversation.assignedUser?.name ? ` · ${conversation.assignedUser.name}` : ''}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label={ar ? 'إغلاق الشات الجانبي' : 'Close split chat'}
					className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
				>
					<X size={16} />
				</button>
			</header>

			<div
				ref={scrollRef}
				className="wa-message-wallpaper min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#0B141A] p-3 nice-scroll"
				style={{
					backgroundImage: "url('/bg-whatsapp.svg')",
					backgroundRepeat: 'repeat',
					backgroundSize: 'auto, 360px 360px',
				}}
				onScroll={event => {
					const node = event.currentTarget;
					stickToBottomRef.current =
						node.scrollHeight - node.scrollTop - node.clientHeight < 80;
					if (!loading && !loadingOlder && hasMore && node.scrollHeight > node.clientHeight + 8 && node.scrollTop < 50) {
						void loadOlder();
					}
				}}
			>
				{loadingOlder ? (
					<div className="flex justify-center py-2 text-slate-500">
						<Loader2 size={16} className="animate-spin" />
					</div>
				) : null}
				{loading && messages.length === 0 ? (
					<div className="flex h-40 items-center justify-center text-slate-500">
						<Loader2 size={22} className="animate-spin" />
					</div>
				) : messages.length === 0 ? (
					<p className="py-10 text-center text-sm text-slate-500">
						{ar ? 'لا توجد رسائل بعد' : 'No messages yet'}
					</p>
				) : (
					<div className="wa-message-thread">
					{messages.map(message => {
						const mine = message.direction === 'outbound';
						const presentation = messageTextPresentation(message.text);
						const attachments = message.attachments || [];
						return (
							<div
								key={message.id}
								className={`flex ${mine ? 'justify-end' : 'justify-start'} ${message.optimistic ? 'opacity-70' : ''}`}
							>
								<div
									className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
										mine
											? 'bg-[#d9fdd3] text-slate-900'
											: 'border border-black/5 bg-white text-slate-900'
									}`}
								>
									{attachments.map(attachment => (
										<SplitAttachment
											key={attachment.id || attachment.providerMediaId || attachment.fileName}
											attachment={attachment}
											labels={labels}
											ar={ar}
										/>
									))}
									{message.text ? (
										<p
											dir={presentation.dir}
											lang={presentation.lang}
											style={presentation.style}
											className={`wa-message-text whitespace-pre-wrap wrap-break-word ${presentation.className || ''}`}
										>
											{message.text}
										</p>
									) : null}
									<div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
										{new Date(message.providerTimestamp || message.created_at).toLocaleTimeString([], {
											hour: '2-digit',
											minute: '2-digit',
										})}
										{mine ? <DeliveryTicks message={message} /> : null}
									</div>
								</div>
							</div>
						);
					})}
					</div>
				)}
			</div>

			{canCompose ? (
				<form
					onSubmit={sendText}
					className="flex shrink-0 items-end gap-2 border-t border-slate-100 p-2.5 dark:border-slate-800"
				>
					{recordingVoice ? (
						<>
							<div className="flex min-h-10 flex-1 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-600">
								<span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
								{ar ? 'جاري التسجيل…' : 'Recording…'}
								<span className="ms-auto font-mono tabular-nums">
									{formatRecordingDuration(recordingSeconds)}
								</span>
							</div>
							<button
								type="button"
								onClick={() => stopVoiceRecording(false)}
								className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500"
								aria-label={ar ? 'إلغاء' : 'Cancel'}
							>
								<X size={16} />
							</button>
							<button
								type="button"
								onClick={() => stopVoiceRecording(true)}
								className="grid h-10 w-10 place-items-center rounded-full bg-rose-500 text-white"
								aria-label={ar ? 'إرسال التسجيل' : 'Send recording'}
							>
								<Square size={14} fill="currentColor" />
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
										void sendText(event);
									}
								}}
								rows={1}
								dir={messageTextPresentation(draft).dir}
								placeholder={labels.message || (ar ? 'اكتب رسالة' : 'Write a message')}
								className="max-h-28 min-h-10 min-w-0 flex-1 resize-none rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-900"
							/>
							{draft.trim() ? (
								<button
									type="submit"
									disabled={sending}
									className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#16B96B] text-white disabled:opacity-50"
									aria-label={ar ? 'إرسال' : 'Send'}
								>
									{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
								</button>
							) : (
								<button
									type="button"
									disabled={sending}
									onClick={() => void startVoiceRecording()}
									className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#16B96B] text-white disabled:opacity-50"
									aria-label={ar ? 'تسجيل صوت' : 'Record voice'}
								>
									<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
										<path
											fill="currentColor"
											d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
										/>
									</svg>
								</button>
							)}
						</>
					)}
				</form>
			) : (
				<p className="border-t border-slate-100 p-3 text-center text-xs text-slate-500">
					{ar ? 'لا يمكن الكتابة في هذا الشات' : 'You cannot compose in this chat'}
				</p>
			)}
		</section>
	);
}
