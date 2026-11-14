'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { BadgeCheck, Check, Copy, Loader2, MessageCircle, MessagesSquare, X } from 'lucide-react';
import api from '@/utils/axios';

function formatPhone(digits) {
	const value = String(digits || '').replace(/\D/g, '');
	return value ? `+${value}` : '';
}

/**
 * Side panel for a group member (click their name or picture in a group): picture, name,
 * number, and a button to message them. It shows what the message already knows at once and
 * fills in the rest (real number for @lid ids, their chat) from the server.
 */
export default function GroupMemberPanel({ person, accountId, ar, onClose, onOpenConversation }) {
	const [card, setCard] = useState(null);
	const [loading, setLoading] = useState(false);
	const [opening, setOpening] = useState(false);
	const [copied, setCopied] = useState(false);
	const waId = person?.waId || '';

	useEffect(() => {
		if (!waId || !accountId) return undefined;
		let alive = true;
		setCard(null);
		setLoading(true);
		api
			.get(`/whatsapp/accounts/${accountId}/people/${encodeURIComponent(waId)}`)
			.then(({ data }) => alive && setCard(data || null))
			.catch(() => alive && setCard(null))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [accountId, waId]);

	useEffect(() => {
		if (!person) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [person, onClose]);

	useEffect(() => {
		if (!copied) return undefined;
		const timer = window.setTimeout(() => setCopied(false), 1500);
		return () => window.clearTimeout(timer);
	}, [copied]);

	if (!person || typeof document === 'undefined') return null;

	const name = card?.name || person.name || formatPhone(card?.phone) || (ar ? 'عضو في الجروب' : 'Group member');
	const avatarUrl = card?.avatarUrl || person.avatarUrl || '';
	const phone = formatPhone(card?.phone);
	const initial = String(name).trim().slice(0, 1).toUpperCase() || '?';
	const canMessage = card ? card.canMessage !== false : true;

	const message = async () => {
		if (opening) return;
		if (card?.conversationId) {
			onOpenConversation(card.conversationId);
			onClose();
			return;
		}
		setOpening(true);
		try {
			const { data } = await api.post(`/whatsapp/accounts/${accountId}/conversations/open`, {
				chatId: card?.phone || waId,
				title: card?.name || person.name || null,
			});
			if (data?.id) {
				onOpenConversation(data.id, data);
				onClose();
			}
		} catch (error) {
			toast.error(error?.response?.data?.message || (ar ? 'تعذر فتح المحادثة' : 'Could not open the chat'));
		} finally {
			setOpening(false);
		}
	};

	const copyNumber = async () => {
		if (!phone) return;
		try {
			await navigator.clipboard.writeText(phone);
			setCopied(true);
		} catch {
			toast.error(ar ? 'تعذر النسخ' : 'Could not copy');
		}
	};

	return createPortal(
		<div className="fixed inset-0 z-[115] flex justify-end bg-black/20" dir={ar ? 'rtl' : 'ltr'} onMouseDown={event => event.target === event.currentTarget && onClose()}>
			<aside
				role="dialog"
				aria-modal="true"
				aria-labelledby="wa-member-title"
				className="flex h-full w-full max-w-[400px] flex-col overflow-hidden bg-[#f0f2f5] shadow-[-8px_0_30px_-12px_rgba(0,0,0,0.25)] dark:bg-[#0b141a]"
			>
				{/* Pinned header: the close button never scrolls away. */}
				<header className="flex h-16 shrink-0 items-center gap-4 bg-white px-4 dark:bg-[#202c33]">
					<button
						type="button"
						onClick={onClose}
						aria-label={ar ? 'إغلاق' : 'Close'}
						className="grid h-10 w-10 place-items-center rounded-full text-[#54656f] hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/10"
					>
						<X size={20} />
					</button>
					<h2 id="wa-member-title" className="text-[16px] font-medium text-[#111b21] dark:text-[#e9edef]">
						{ar ? 'معلومات جهة الاتصال' : 'Contact info'}
					</h2>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<section className="flex flex-col items-center bg-white px-6 pb-6 pt-7 text-center dark:bg-[#111b21]">
						<span
							className="grid h-[120px] w-[120px] place-items-center overflow-hidden rounded-full text-[44px] font-semibold text-white"
							style={{ background: person.color || '#00a884' }}
						>
							{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
						</span>
						<p className="mt-4 flex max-w-full items-center gap-1.5 text-[22px] text-[#111b21] dark:text-[#e9edef]" dir="auto">
							<span className="truncate">{name}</span>
							{card?.isBusiness ? <BadgeCheck size={18} className="shrink-0 text-[#00a884]" aria-label={ar ? 'حساب بيزنس' : 'Business account'} /> : null}
						</p>
						<p className="mt-1 min-h-[22px] text-[15px] text-[#667781] dark:text-[#8696a0]">
							{phone ? (
								<bdi dir="ltr">{phone}</bdi>
							) : loading ? (
								<span className="inline-flex items-center gap-1.5">
									<Loader2 size={13} className="animate-spin" /> {ar ? 'بنجيب الرقم…' : 'Getting the number…'}
								</span>
							) : (
								<span>{ar ? 'الرقم مش ظاهر للجروب ده' : 'Number hidden in this group'}</span>
							)}
						</p>

						<div className="mt-5 grid w-full grid-cols-2 gap-2.5">
							<button
								type="button"
								onClick={message}
								disabled={!canMessage || opening || loading}
								className="flex flex-col items-center gap-1.5 rounded-xl border border-black/[0.08] py-3 text-[13px] font-medium text-[#00a884] transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								{opening ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20} />}
								{card?.conversationId ? (ar ? 'افتح الشات' : 'Open chat') : ar ? 'رسالة' : 'Message'}
							</button>
							<button
								type="button"
								onClick={copyNumber}
								disabled={!phone}
								className="flex flex-col items-center gap-1.5 rounded-xl border border-black/[0.08] py-3 text-[13px] font-medium text-[#00a884] transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								{copied ? <Check size={20} /> : <Copy size={20} />}
								{copied ? (ar ? 'اتنسخ' : 'Copied') : ar ? 'انسخ الرقم' : 'Copy number'}
							</button>
						</div>
					</section>

					<section className="mt-2 bg-white px-6 py-4 dark:bg-[#111b21]">
						<p className="text-[13px] text-[#667781] dark:text-[#8696a0]">{ar ? 'الشات معاه' : 'Your chat'}</p>
						<p className="mt-1 flex items-center gap-2 text-[15px] text-[#111b21] dark:text-[#e9edef]">
							<MessagesSquare size={16} className="text-[#8696a0]" />
							{loading
								? '…'
								: card?.conversationId
									? ar
										? 'عندك شات معاه'
										: 'You have a chat with them'
									: ar
										? 'لسه مفيش شات بينكم'
										: 'No chat with them yet'}
						</p>
						{card?.isSaved ? (
							<p className="mt-3 text-[13px] text-[#667781] dark:text-[#8696a0]">
								{ar ? 'محفوظ في جهات الاتصال' : 'Saved in your contacts'}
							</p>
						) : null}
					</section>
				</div>
			</aside>
		</div>,
		document.body,
	);
}
