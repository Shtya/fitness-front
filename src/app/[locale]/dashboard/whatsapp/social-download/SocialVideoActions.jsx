'use client';

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Forward, Loader2, Send, Sparkles, X } from 'lucide-react';
import api from '@/utils/axios';

const copy = {
	en: {
		sendHere: 'Send here',
		sendTo: 'Send to…',
		addToStory: 'Add to story',
		pickChat: 'Choose a chat',
		noChats: 'No chats available',
		sent: 'Video sent',
		sendFailed: 'Could not send this video',
	},
	ar: {
		sendHere: 'إرسال هنا',
		sendTo: 'إرسال إلى…',
		addToStory: 'إضافة إلى الحالة',
		pickChat: 'اختر محادثة',
		noChats: 'مافيش محادثات متاحة',
		sent: 'تم إرسال الفيديو',
		sendFailed: 'تعذّر إرسال الفيديو',
	},
};

/**
 * What to do with a video once it has been pulled out of a social link.
 *
 * The clip already lives on the server, so every one of these reuses that file:
 * sending forwards it from disk instead of downloading it again, and the story flow
 * cuts it in place. Nothing here re-fetches from the platform.
 */
export default function SocialVideoActions({
	downloadId,
	locale = 'en',
	conversationId = '',
	conversations = [],
	onAddToStory,
}) {
	const t = copy[locale === 'ar' ? 'ar' : 'en'];
	const ar = locale === 'ar';

	const [sending, setSending] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);

	const send = useCallback(
		async targetConversationId => {
			if (!downloadId || !targetConversationId || sending) return;
			setSending(true);
			setPickerOpen(false);
			try {
				await api.post(`/whatsapp/social-downloads/${downloadId}/send`, {
					conversationId: targetConversationId,
				});
				toast.success(t.sent);
			} catch (error) {
				toast.error(error?.response?.data?.message || t.sendFailed);
			} finally {
				setSending(false);
			}
		},
		[downloadId, sending, t.sendFailed, t.sent],
	);

	// Bubble clicks open the message menu, so every control here has to stop both.
	const contain = event => {
		event.preventDefault();
		event.stopPropagation();
	};

	return (
		<>
			<div
				className="mt-1 flex flex-wrap items-center gap-1.5"
				onPointerDown={event => event.stopPropagation()}
			>
				<button
					type="button"
					disabled={sending || !conversationId}
					onPointerDown={event => event.stopPropagation()}
					onClick={event => {
						contain(event);
						void send(conversationId);
					}}
					className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:hover:bg-white/[0.16]"
				>
					{sending ? (
						<Loader2 size={12} className="animate-spin" />
					) : (
						<Send size={12} strokeWidth={2.4} />
					)}
					{t.sendHere}
				</button>
				<button
					type="button"
					disabled={sending}
					onPointerDown={event => event.stopPropagation()}
					onClick={event => {
						contain(event);
						setPickerOpen(true);
					}}
					className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:hover:bg-white/[0.16]"
				>
					<Forward size={12} strokeWidth={2.4} />
					{t.sendTo}
				</button>
				{typeof onAddToStory === 'function' ? (
					<button
						type="button"
						disabled={sending}
						onPointerDown={event => event.stopPropagation()}
						onClick={event => {
							contain(event);
							onAddToStory();
						}}
						className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:hover:bg-white/[0.16]"
					>
						<Sparkles size={12} strokeWidth={2.4} />
						{t.addToStory}
					</button>
				) : null}
			</div>

			{pickerOpen && typeof document !== 'undefined'
				? createPortal(
						<div
							className="fixed inset-0 z-[126] grid place-items-center bg-black/40 p-4"
							onClick={() => setPickerOpen(false)}
						>
							<div
								role="dialog"
								aria-label={t.pickChat}
								dir={ar ? 'rtl' : 'ltr'}
								className="max-h-[70vh] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
								onClick={event => event.stopPropagation()}
							>
								<div className="flex items-center justify-between border-b px-4 py-3">
									<h4 className="text-sm font-bold text-slate-900">{t.pickChat}</h4>
									<button
										type="button"
										onClick={() => setPickerOpen(false)}
										className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
									>
										<X size={16} />
									</button>
								</div>
								<div className="max-h-[58vh] overflow-y-auto p-2">
									{!conversations.length ? (
										<p className="px-3 py-8 text-center text-sm text-slate-500">{t.noChats}</p>
									) : (
										conversations.map(conversation => (
											<button
												key={conversation.id}
												type="button"
												onClick={() => void send(conversation.id)}
												className={`flex w-full items-center gap-2 rounded-xl p-3 text-start text-sm hover:bg-slate-100 ${
													conversation.id === conversationId ? 'bg-slate-50' : ''
												}`}
											>
												<span className="truncate font-medium text-slate-800">
													{conversation.title}
												</span>
											</button>
										))
									)}
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
