'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
	AlertCircle,
	ArrowLeftRight,
	ArrowRight,
	Forward,
	Loader2,
	Plus,
	Search,
	Trash2,
	Users,
} from 'lucide-react';
import api from '@/utils/axios';
import {
	conversationAvatarUrl,
	conversationTitle,
	isChannelConversation,
	isEmailMemoAiConversation,
} from './whatsapp-utils';

const rulesKey = accountId => ['whatsapp', 'auto-forward-rules', accountId];

function apiError(error, fallback) {
	const message = error?.response?.data?.message;
	return (Array.isArray(message) ? message[0] : message) || error?.message || fallback;
}

function ChatAvatar({ conversation, size = 32 }) {
	const url = conversationAvatarUrl(conversation);
	const title = conversationTitle(conversation) || '?';
	return (
		<span
			className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
			style={{ width: size, height: size }}
		>
			{conversation?.type === 'group' ? <Users size={14} /> : title.slice(0, 1).toUpperCase()}
			{url ? (
				<img
					src={url}
					alt=""
					loading="lazy"
					referrerPolicy="no-referrer"
					onError={event => {
						event.currentTarget.style.display = 'none';
					}}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			) : null}
		</span>
	);
}

function ChatPicker({ label, conversations, value, onChange, excludeId, ar }) {
	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(false);
	const selected = conversations.find(item => item.id === value) || null;

	const options = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return conversations
			.filter(item => item.id !== excludeId)
			.filter(item => {
				if (!needle) return true;
				const title = String(conversationTitle(item) || '').toLowerCase();
				const phone = String(item?.contact?.phoneNumber || '');
				return title.includes(needle) || phone.includes(needle);
			})
			.slice(0, 40);
	}, [conversations, excludeId, query]);

	return (
		<div className="relative min-w-0 flex-1">
			<p className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
			<button
				type="button"
				onClick={() => setOpen(current => !current)}
				className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-start text-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
			>
				{selected ? (
					<>
						<ChatAvatar conversation={selected} size={28} />
						<span className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-white">
							{conversationTitle(selected)}
						</span>
					</>
				) : (
					<span className="flex-1 text-slate-400">{ar ? 'اختر شات…' : 'Choose a chat…'}</span>
				)}
			</button>
			{open ? (
				<button
					type="button"
					aria-hidden="true"
					tabIndex={-1}
					className="fixed inset-0 z-20 cursor-default"
					onClick={() => setOpen(false)}
				/>
			) : null}
			{open ? (
				<div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
					<div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
						<Search size={14} className="text-slate-400" />
						<input
							autoFocus
							value={query}
							onChange={event => setQuery(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Escape') setOpen(false);
							}}
							placeholder={ar ? 'ابحث بالاسم أو الرقم' : 'Search name or number'}
							className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-white"
						/>
					</div>
					<ul className="max-h-72 overflow-y-auto nice-scroll py-1">
						{options.length ? (
							options.map(item => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => {
											onChange(item.id);
											setOpen(false);
											setQuery('');
										}}
										className={`flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
											item.id === value ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
										}`}
									>
										<ChatAvatar conversation={item} size={28} />
										<span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">
											{conversationTitle(item)}
										</span>
									</button>
								</li>
							))
						) : (
							<li className="px-3 py-4 text-center text-xs text-slate-400">
								{ar ? 'مفيش نتايج' : 'No chats found'}
							</li>
						)}
					</ul>
				</div>
			) : null}
		</div>
	);
}

export default function AutoForwardPanel({ accountId, locale = 'en', conversations = [], canUse = true }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const queryClient = useQueryClient();
	const [sourceId, setSourceId] = useState('');
	const [targetId, setTargetId] = useState('');
	const [mode, setMode] = useState('forward');
	const [bidirectional, setBidirectional] = useState(false);

	const chats = useMemo(
		() =>
			conversations.filter(
				item => item?.id && !isChannelConversation(item) && !isEmailMemoAiConversation(item),
			),
		[conversations],
	);
	const chatById = useMemo(() => new Map(chats.map(item => [item.id, item])), [chats]);

	const rulesQuery = useQuery({
		queryKey: rulesKey(accountId),
		enabled: Boolean(accountId),
		queryFn: async () => {
			const { data } = await api.get(`/whatsapp/accounts/${accountId}/auto-forward-rules`);
			return Array.isArray(data) ? data : [];
		},
	});
	const refreshRules = () => queryClient.invalidateQueries({ queryKey: rulesKey(accountId) });

	const createRule = useMutation({
		mutationFn: payload => api.post(`/whatsapp/accounts/${accountId}/auto-forward-rules`, payload),
		onSuccess: () => {
			toast.success(ar ? 'تم تفعيل التحويل التلقائي' : 'Auto-forward enabled');
			setSourceId('');
			setTargetId('');
			setBidirectional(false);
			refreshRules();
		},
		onError: error => toast.error(apiError(error, ar ? 'تعذر إنشاء القاعدة' : 'Could not create rule')),
	});

	const updateRule = useMutation({
		mutationFn: ({ id, ...changes }) => api.patch(`/whatsapp/auto-forward-rules/${id}`, changes),
		onSuccess: refreshRules,
		onError: error => toast.error(apiError(error, ar ? 'تعذر التحديث' : 'Could not update rule')),
	});

	const deleteRule = useMutation({
		mutationFn: id => api.delete(`/whatsapp/auto-forward-rules/${id}`),
		onSuccess: refreshRules,
		onError: error => toast.error(apiError(error, ar ? 'تعذر الحذف' : 'Could not delete rule')),
	});

	const canSubmit = canUse && sourceId && targetId && sourceId !== targetId && !createRule.isPending;
	const rules = rulesQuery.data || [];
	const titleFor = (id, fallback) =>
		(chatById.get(id) && conversationTitle(chatById.get(id))) || fallback || (ar ? 'شات' : 'Chat');

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6" dir={ar ? 'rtl' : 'ltr'}>
			<header className="flex items-start gap-3">
				<span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1DAB61] text-white">
					<Forward size={20} />
				</span>
				<div className="min-w-0">
					<h2 className="text-lg font-black text-slate-900 dark:text-white">
						{ar ? 'تحويل تلقائي للرسايل' : 'Auto-forward messages'}
					</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						{ar
							? 'أي رسالة توصلك من الشات الأول تتبعت على طول للشات التاني.'
							: 'Every message you receive from the first chat is sent straight to the second chat.'}
					</p>
				</div>
			</header>

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
				<div className="flex flex-col items-stretch gap-3 md:flex-row md:items-end">
					<ChatPicker
						label={ar ? 'لما يبعت من' : 'When this chat sends'}
						conversations={chats}
						value={sourceId}
						onChange={setSourceId}
						excludeId={targetId}
						ar={ar}
					/>
					<button
						type="button"
						title={ar ? 'بدّل الاتجاه' : 'Swap direction'}
						onClick={() => {
							setSourceId(targetId);
							setTargetId(sourceId);
						}}
						className="mx-auto grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700"
					>
						<ArrowLeftRight size={18} />
					</button>
					<ChatPicker
						label={ar ? 'ابعت الرسايل لـ' : 'Forward messages to'}
						conversations={chats}
						value={targetId}
						onChange={setTargetId}
						excludeId={sourceId}
						ar={ar}
					/>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-3">
					<div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
						{[
							['forward', ar ? 'إعادة توجيه' : 'Forward'],
							['copy', ar ? 'كرسالة جديدة' : 'As new message'],
						].map(([key, label]) => (
							<button
								key={key}
								type="button"
								onClick={() => setMode(key)}
								className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
									mode === key
										? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
										: 'text-slate-500'
								}`}
							>
								{label}
							</button>
						))}
					</div>
					<label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
						<input
							type="checkbox"
							checked={bidirectional}
							onChange={event => setBidirectional(event.target.checked)}
							className="h-4 w-4 accent-[#1DAB61]"
						/>
						{ar ? 'في الاتجاهين (العكس كمان)' : 'Both directions'}
					</label>
					<button
						type="button"
						disabled={!canSubmit}
						onClick={() =>
							createRule.mutate({
								sourceConversationId: sourceId,
								targetConversationId: targetId,
								mode,
								bidirectional,
							})
						}
						className="ms-auto inline-flex h-10 items-center gap-2 rounded-xl bg-[#1DAB61] px-4 text-sm font-bold text-white transition hover:bg-[#179c57] disabled:cursor-not-allowed disabled:opacity-50"
					>
						{createRule.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
						{ar ? 'تفعيل' : 'Enable'}
					</button>
				</div>
				<p className="mt-3 text-xs text-slate-400">
					{mode === 'forward'
						? ar
							? 'الرسالة هتوصل بعلامة "مُعاد توجيهها" زي واتساب.'
							: 'Messages arrive with WhatsApp’s “Forwarded” label.'
						: ar
							? 'الرسالة هتتبعت كأنها رسالة جديدة منك من غير علامة التحويل.'
							: 'Messages are re-sent as new messages from you, without the Forwarded label.'}
				</p>
			</section>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
					{ar ? 'القواعد الحالية' : 'Active rules'}
				</h3>
				{rulesQuery.isLoading ? (
					<div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
						<Loader2 size={16} className="animate-spin" />
						{ar ? 'جاري التحميل…' : 'Loading…'}
					</div>
				) : rulesQuery.isError ? (
					<div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
						<span>{apiError(rulesQuery.error, ar ? 'تعذر تحميل القواعد' : 'Could not load rules')}</span>
						<button type="button" onClick={refreshRules} className="font-bold underline">
							{ar ? 'إعادة المحاولة' : 'Retry'}
						</button>
					</div>
				) : !rules.length ? (
					<div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
						{ar ? 'مفيش تحويل تلقائي لسه.' : 'No auto-forward rules yet.'}
					</div>
				) : (
					rules.map(rule => {
						const source = chatById.get(rule.sourceConversationId);
						const target = chatById.get(rule.targetConversationId);
						return (
							<div
								key={rule.id}
								className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white px-3 py-2.5 dark:bg-slate-900/60 ${
									rule.isActive
										? 'border-slate-200 dark:border-slate-800'
										: 'border-slate-200 opacity-60 dark:border-slate-800'
								}`}
							>
								<div className="flex min-w-0 flex-1 items-center gap-2">
									<ChatAvatar conversation={source} size={28} />
									<span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
										{titleFor(rule.sourceConversationId, rule.sourceTitle)}
									</span>
									<ArrowRight size={16} className="shrink-0 text-emerald-600 rtl:rotate-180" />
									<ChatAvatar conversation={target} size={28} />
									<span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
										{titleFor(rule.targetConversationId, rule.targetTitle)}
									</span>
								</div>
								<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
									{rule.mode === 'copy' ? (ar ? 'رسالة جديدة' : 'New message') : ar ? 'توجيه' : 'Forward'}
								</span>
								<span className="text-[11px] text-slate-400">
									{ar ? `${rule.forwardedCount} رسالة` : `${rule.forwardedCount} sent`}
								</span>
								<label className="relative inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										className="peer sr-only"
										checked={rule.isActive}
										disabled={!canUse || updateRule.isPending}
										onChange={event => updateRule.mutate({ id: rule.id, isActive: event.target.checked })}
										aria-label={ar ? 'تشغيل/إيقاف' : 'Enable/disable'}
									/>
									<span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-[#1DAB61] dark:bg-slate-700" />
									<span className="absolute start-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
								</label>
								<button
									type="button"
									disabled={!canUse || deleteRule.isPending}
									onClick={() => deleteRule.mutate(rule.id)}
									title={ar ? 'حذف' : 'Delete'}
									className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/30"
								>
									<Trash2 size={15} />
								</button>
								{rule.lastError ? (
									<p className="flex w-full items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
										<AlertCircle size={12} />
										{rule.lastError}
									</p>
								) : null}
							</div>
						);
					})
				)}
			</section>
		</div>
	);
}
