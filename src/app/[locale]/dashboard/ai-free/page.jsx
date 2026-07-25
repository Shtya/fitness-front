'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Bot,
	Send,
	Sparkles,
	RefreshCw,
	Zap,
	Globe2,
	MonitorSmartphone,
	AlertCircle,
	Copy,
	Check,
	Settings2,
	ChevronDown,
	Dumbbell,
	Apple,
	MessageSquareHeart,
	Plus,
	StopCircle,
	User,
	Trash2,
	PanelLeft,
	PanelLeftClose,
	PanelLeftOpen,
	BookOpen,
	MessageSquare,
	Search,
	X,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { aiFreeApi } from './ai-free-api';
import MarkdownMessage, { isMostlyArabic } from './MarkdownMessage';
import {
	createEmptyChat,
	deleteChat,
	fallbackTitleFromMessages,
	loadChatStore,
	saveChatStore,
	upsertActiveChat,
} from './chat-history';

const COPY = {
	en: {
		brandEyebrow: 'FitCoach',
		greeting: 'How can I help you today?',
		subtitle: 'Ask about coaching, or about this So7baFit project when knowledge is on.',
		placeholder: 'Message FitCoach…',
		send: 'Send',
		stop: 'Stop',
		newChat: 'New chat',
		history: 'Chats',
		closeHistory: 'Close history',
		openHistory: 'Open history',
		searchHistory: 'Search chats',
		noHistory: 'No saved chats yet',
		deleteChat: 'Delete',
		provider: 'Provider',
		model: 'Model',
		modelHint: 'Default model',
		fallback: 'Auto-fallback',
		fallbackHint: 'Try another free provider if this one fails',
		knowledge: 'Project knowledge',
		knowledgeHint: 'Inject PROJECT_KNOWLEDGE.md so FitCoach understands this codebase',
		knowledgeReady: 'Knowledge file loaded',
		knowledgeMissing: 'Knowledge file missing',
		thinking: 'Thinking',
		emptyHint: 'Pick a starter, or type anything below.',
		error: 'Something went wrong',
		copied: 'Copied',
		copy: 'Copy',
		elapsed: 'ms',
		fallbackUsed: 'Fallback',
		knowledgeUsed: 'Project context',
		systemPrompt: 'Extra instructions',
		systemPlaceholder: 'Optional tone / coaching style…',
		settings: 'Settings',
		closeSettings: 'Done',
		composerHint: 'Enter to send · Shift+Enter for new line',
		you: 'You',
		assistant: 'FitCoach',
		suggestions: [
			{
				icon: 'dumbbell',
				title: 'Beginner plan',
				prompt: 'Build a 3-day beginner full-body workout with rest days.',
			},
			{
				icon: 'apple',
				title: 'Protein dinner',
				prompt: 'Suggest a high-protein dinner under 600 kcal.',
			},
			{
				icon: 'book',
				title: 'Explain project',
				prompt:
					'Using project knowledge, summarize how WhatsApp connect and FitCoach AI work in this repo.',
			},
		],
	},
	ar: {
		brandEyebrow: 'FitCoach',
		greeting: 'كيف أقدر أساعدك اليوم؟',
		subtitle: 'اسأل عن التدريب، أو عن مشروع So7baFit عند تفعيل معرفة المشروع.',
		placeholder: 'اكتب رسالتك لـ FitCoach…',
		send: 'إرسال',
		stop: 'إيقاف',
		newChat: 'محادثة جديدة',
		history: 'المحادثات',
		closeHistory: 'إغلاق السجل',
		openHistory: 'فتح السجل',
		searchHistory: 'بحث في المحادثات',
		noHistory: 'لا توجد محادثات محفوظة',
		deleteChat: 'حذف',
		provider: 'المزوّد',
		model: 'النموذج',
		modelHint: 'النموذج الافتراضي',
		fallback: 'تبديل تلقائي',
		fallbackHint: 'جرّب مزوداً مجانياً آخر عند الفشل',
		knowledge: 'معرفة المشروع',
		knowledgeHint: 'حقن PROJECT_KNOWLEDGE.md ليفهم FitCoach هذا المشروع',
		knowledgeReady: 'ملف المعرفة محمّل',
		knowledgeMissing: 'ملف المعرفة غير موجود',
		thinking: 'يفكر',
		emptyHint: 'اختر بداية سريعة، أو اكتب أي شيء بالأسفل.',
		error: 'حدث خطأ',
		copied: 'تم النسخ',
		copy: 'نسخ',
		elapsed: 'مللي',
		fallbackUsed: 'بديل',
		knowledgeUsed: 'سياق المشروع',
		systemPrompt: 'تعليمات إضافية',
		systemPlaceholder: 'اختياري: الأسلوب أو شخصية المدرب…',
		settings: 'الإعدادات',
		closeSettings: 'تم',
		composerHint: 'Enter للإرسال · Shift+Enter لسطر جديد',
		you: 'أنت',
		assistant: 'FitCoach',
		suggestions: [
			{
				icon: 'dumbbell',
				title: 'خطة مبتدئ',
				prompt: 'ابنِ تمرين جسم كامل للمبتدئين على 3 أيام مع أيام راحة.',
			},
			{
				icon: 'apple',
				title: 'عشاء بروتين',
				prompt: 'اقترح عشاء عالي البروتين بأقل من 600 سعرة.',
			},
			{
				icon: 'book',
				title: 'اشرح المشروع',
				prompt:
					'باستخدام معرفة المشروع، لخّص كيف يعمل اتصال واتساب وFitCoach AI في هذا الريبو.',
			},
		],
	},
};

const PROVIDER_META = {
	'llm7-free': { icon: Zap },
	'pollinations-free': { icon: Globe2 },
	'browser-chatgpt': { icon: MonitorSmartphone },
};

const SUGGESTION_ICONS = {
	dumbbell: Dumbbell,
	apple: Apple,
	heart: MessageSquareHeart,
	book: BookOpen,
};

function messageId() {
	if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
	return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function firstName(user, fallback) {
	const raw = String(user?.name || user?.fullName || '').trim();
	if (!raw) return fallback;
	return raw.split(/\s+/)[0];
}

function Composer({
	value,
	onChange,
	onSubmit,
	onStop,
	loading,
	placeholder,
	sendLabel,
	stopLabel,
	provider,
	providers,
	onProviderChange,
	hint,
}) {
	const textareaRef = useRef(null);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = '0px';
		el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
	}, [value]);

	return (
		<div className="mx-auto w-full max-w-3xl px-4 pb-4 md:px-6 md:pb-6">
			<form
				onSubmit={event => {
					event.preventDefault();
					if (loading) onStop?.();
					else onSubmit();
				}}
				className="relative rounded-[1.75rem] border border-slate-200/90 bg-white/95 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)] backdrop-blur transition focus-within:border-[var(--color-primary-300)] dark:border-slate-700 dark:bg-slate-950/90"
			>
				<textarea
					ref={textareaRef}
					value={value}
					onChange={event => onChange(event.target.value)}
					onKeyDown={event => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							if (!loading) onSubmit();
						}
					}}
					rows={1}
					dir={isMostlyArabic(value) ? 'rtl' : 'auto'}
					placeholder={placeholder}
					className={`block w-full resize-none bg-transparent px-5 pb-3 pt-4 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${
						isMostlyArabic(value) ? 'font-ar text-right' : 'font-en'
					}`}
					style={
						isMostlyArabic(value)
							? {
									fontFamily:
										'var(--font-arabic), Tajawal, Cairo, "Noto Sans Arabic", Tahoma, sans-serif',
								}
							: undefined
					}
				/>
				<div className="flex items-center gap-2 px-3 pb-3">
					<label className="relative inline-flex min-w-0 items-center">
						<select
							value={provider}
							onChange={event => onProviderChange(event.target.value)}
							disabled={loading}
							className="appearance-none rounded-full border border-slate-200 bg-slate-50 py-1.5 pe-8 ps-3 text-xs font-medium text-slate-600 outline-none transition hover:border-[var(--color-primary-300)] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
						>
							{providers.map(item => (
								<option key={item.name} value={item.name}>
									{item.label || item.name}
								</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute end-2.5 h-3.5 w-3.5 text-slate-400" />
					</label>
					<button
						type="submit"
						disabled={!loading && !value.trim()}
						className={`ms-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition disabled:opacity-40 ${
							loading
								? 'bg-slate-800 dark:bg-slate-200 dark:text-slate-900'
								: 'bg-[var(--color-primary-500)] shadow-[0_8px_20px_-8px_var(--color-primary-500)] hover:brightness-110'
						}`}
						aria-label={loading ? stopLabel : sendLabel}
					>
						{loading ? <StopCircle size={18} /> : <Send className="h-4 w-4" />}
					</button>
				</div>
			</form>
			{hint ? (
				<p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
					{hint}
				</p>
			) : null}
		</div>
	);
}

export default function AiFreePage() {
	const locale = useLocale();
	const t = COPY[locale] || COPY.en;
	const user = useUser();
	const userId = user?.id || 'guest';
	const name = firstName(user, locale === 'ar' ? 'مدرب' : 'Coach');

	const [providers, setProviders] = useState([]);
	const [knowledge, setKnowledge] = useState(null);
	const [provider, setProvider] = useState('llm7-free');
	const [model, setModel] = useState('');
	const [systemPrompt, setSystemPrompt] = useState('');
	const [allowFallback, setAllowFallback] = useState(true);
	const [useProjectKnowledge, setUseProjectKnowledge] = useState(true);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [historyQuery, setHistoryQuery] = useState('');
	const [chats, setChats] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [copiedId, setCopiedId] = useState('');
	const [hydrated, setHydrated] = useState(false);
	const bottomRef = useRef(null);
	const abortRef = useRef(null);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(min-width: 768px)');
		const sync = () => setHistoryOpen(mq.matches);
		sync();
		mq.addEventListener?.('change', sync);
		return () => mq.removeEventListener?.('change', sync);
	}, []);

	const activeChat = useMemo(
		() => chats.find(chat => chat.id === activeId) || null,
		[activeId, chats],
	);
	const messages = activeChat?.messages || [];
	const hasMessages = messages.length > 0;

	const filteredChats = useMemo(() => {
		const q = historyQuery.trim().toLowerCase();
		if (!q) return chats;
		return chats.filter(
			chat =>
				String(chat.title || '')
					.toLowerCase()
					.includes(q) ||
				(chat.messages || []).some(message =>
					String(message.content || '')
						.toLowerCase()
						.includes(q),
				),
		);
	}, [chats, historyQuery]);

	useEffect(() => {
		if (user === undefined) return;
		const store = loadChatStore(userId);
		if (store.chats.length) {
			setChats(store.chats);
			setActiveId(store.activeId || store.chats[0].id);
		} else {
			const fresh = createEmptyChat(locale);
			setChats([fresh]);
			setActiveId(fresh.id);
			saveChatStore(userId, { chats: [fresh], activeId: fresh.id });
		}
		setHydrated(true);
	}, [locale, user, userId]);

	useEffect(() => {
		if (!hydrated) return;
		saveChatStore(userId, { chats, activeId });
	}, [activeId, chats, hydrated, userId]);

	useEffect(() => {
		const controller = new AbortController();
		aiFreeApi
			.listProviders(controller.signal)
			.then(data => {
				setProviders(data?.providers || []);
				if (data?.defaultProvider) setProvider(data.defaultProvider);
				if (data?.knowledge) setKnowledge(data.knowledge);
			})
			.catch(() => {
				setProviders([
					{ name: 'llm7-free', label: 'LLM7 Free' },
					{ name: 'pollinations-free', label: 'Pollinations Free' },
					{ name: 'browser-chatgpt', label: 'Browser ChatGPT' },
				]);
			});
		aiFreeApi.knowledge(controller.signal).then(setKnowledge).catch(() => undefined);
		return () => controller.abort();
	}, []);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, loading]);

	const persistChat = useCallback(
		nextChat => {
			setChats(prev => {
				const next = upsertActiveChat({ chats: prev, activeId }, nextChat);
				setActiveId(next.activeId);
				return next.chats;
			});
		},
		[activeId],
	);

	const startNewChat = useCallback(() => {
		abortRef.current?.abort();
		const fresh = createEmptyChat(locale);
		setChats(prev => [fresh, ...prev]);
		setActiveId(fresh.id);
		setError('');
		setLoading(false);
		setInput('');
		setSettingsOpen(false);
	}, [locale]);

	const removeChat = useCallback(
		id => {
			setChats(prev => {
				const next = deleteChat({ chats: prev, activeId }, id);
				if (!next.chats.length) {
					const fresh = createEmptyChat(locale);
					setActiveId(fresh.id);
					return [fresh];
				}
				setActiveId(next.activeId);
				return next.chats;
			});
			setError('');
		},
		[activeId, locale],
	);

	const stopGeneration = useCallback(() => {
		abortRef.current?.abort();
		setLoading(false);
	}, []);

	const assignAiTitle = useCallback(
		async (chatSnapshot, firstUserText) => {
			if (!chatSnapshot?.id || !firstUserText) return;
			if (chatSnapshot.titleSource === 'ai') return;
			try {
				const result = await aiFreeApi.title({
					message: firstUserText,
					locale,
					provider,
				});
				const title = String(result?.title || '').trim();
				if (!title) return;
				setChats(prev => {
					const current = prev.find(chat => chat.id === chatSnapshot.id);
					if (!current || current.titleSource === 'ai') return prev;
					return upsertActiveChat(
						{ chats: prev, activeId },
						{ ...current, title, titleSource: 'ai' },
					).chats;
				});
			} catch {
				setChats(prev => {
					const current = prev.find(chat => chat.id === chatSnapshot.id);
					if (!current || current.titleSource === 'ai') return prev;
					return upsertActiveChat(
						{ chats: prev, activeId },
						{
							...current,
							title: fallbackTitleFromMessages(current.messages, current.title),
							titleSource: 'fallback',
						},
					).chats;
				});
			}
		},
		[activeId, locale, provider],
	);

	const sendMessage = useCallback(
		async textOverride => {
			const text = String(textOverride ?? input).trim();
			if (!text || loading || !activeChat) return;

			const isFirstUserMessage = !messages.some(message => message.role === 'user');
			const userMessage = { id: messageId(), role: 'user', content: text };
			const nextMessages = [...messages, userMessage];
			const chatAfterUser = { ...activeChat, messages: nextMessages };
			persistChat(chatAfterUser);
			setInput('');
			setError('');
			setLoading(true);
			setSettingsOpen(false);

			if (isFirstUserMessage) {
				void assignAiTitle(chatAfterUser, text);
			}

			const payloadMessages = [];
			if (systemPrompt.trim()) {
				payloadMessages.push({ role: 'system', content: systemPrompt.trim() });
			}
			for (const message of nextMessages) {
				payloadMessages.push({ role: message.role, content: message.content });
			}

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			try {
				const result = await aiFreeApi.chat(
					{
						messages: payloadMessages,
						provider,
						model: model.trim() || undefined,
						allowFallback,
						useProjectKnowledge,
					},
					controller.signal,
				);
				setChats(prev => {
					const current = prev.find(chat => chat.id === activeChat.id) || chatAfterUser;
					return upsertActiveChat(
						{ chats: prev, activeId: activeChat.id },
						{
							...current,
							messages: [
								...nextMessages,
								{
									id: messageId(),
									role: 'assistant',
									content: result.reply,
									meta: {
										provider: result.provider,
										actualModel: result.actualModel,
										elapsedMs: result.elapsedMs,
										usedFallback: result.usedFallback,
										usedKnowledge: result.usedKnowledge,
									},
								},
							],
						},
					).chats;
				});
			} catch (err) {
				if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
				const detail =
					err?.response?.data?.message ||
					err?.response?.data?.errors?.[0] ||
					err?.message ||
					t.error;
				setError(Array.isArray(detail) ? detail.join(', ') : String(detail));
			} finally {
				setLoading(false);
			}
		},
		[
			activeChat,
			allowFallback,
			assignAiTitle,
			input,
			loading,
			messages,
			model,
			persistChat,
			provider,
			systemPrompt,
			t.error,
			useProjectKnowledge,
		],
	);

	const copyText = async (id, content) => {
		try {
			await navigator.clipboard.writeText(content);
			setCopiedId(id);
			setTimeout(() => setCopiedId(''), 1600);
		} catch {
			/* ignore */
		}
	};

	if (!hydrated) {
		return (
			<div className="grid h-[calc(100dvh-4rem)] min-[1026px]:h-full place-items-center text-sm text-slate-500">
				<Sparkles className="mb-2 h-5 w-5 animate-pulse text-[var(--color-primary-500)]" />
				{t.thinking}…
			</div>
		);
	}

	return (
		<div className="relative flex h-[calc(100dvh-4rem)] min-[1026px]:h-full overflow-hidden rounded-none bg-[linear-gradient(180deg,#f4faf6_0%,#eef7f1_42%,#f8fafc_100%)] lg:rounded-xl dark:bg-[linear-gradient(180deg,#0b1220_0%,#0f172a_55%,#020617_100%)]">
			{/* History: expanded panel */}
			<aside
				className={`${
					historyOpen ? 'w-[17.5rem]' : 'w-0'
				} hidden shrink-0 flex-col overflow-hidden border-e border-slate-200/80 bg-white/70 backdrop-blur transition-[width] duration-300 md:flex dark:border-slate-800 dark:bg-slate-950/70`}
			>
				{historyOpen ? (
					<>
						<div className="flex items-center justify-between gap-2 px-3 py-3">
							<p className="text-xs font-bold uppercase tracking-wide text-slate-400">
								{t.history}
							</p>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={startNewChat}
									className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-500)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
									title={t.newChat}
								>
									<Plus className="h-3.5 w-3.5" />
									{t.newChat}
								</button>
								<button
									type="button"
									onClick={() => setHistoryOpen(false)}
									className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
									aria-label={t.closeHistory}
									title={t.closeHistory}
								>
									<PanelLeftClose className="h-4 w-4" />
								</button>
							</div>
						</div>
						<div className="px-3 pb-2">
							<label className="relative block">
								<Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
								<input
									value={historyQuery}
									onChange={event => setHistoryQuery(event.target.value)}
									placeholder={t.searchHistory}
									className="w-full rounded-xl border border-slate-200 bg-white py-2 pe-3 ps-8 text-xs outline-none focus:border-[var(--color-primary-400)] dark:border-slate-700 dark:bg-slate-900"
								/>
							</label>
						</div>
						<div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
							{filteredChats.length === 0 ? (
								<p className="px-2 py-6 text-center text-xs text-slate-400">
									{t.noHistory}
								</p>
							) : (
								filteredChats.map(chat => {
									const active = chat.id === activeId;
									return (
										<div
											key={chat.id}
											className={`group flex items-center gap-1 rounded-xl px-2 py-2 transition ${
												active
													? 'bg-[var(--color-primary-50)] text-[var(--color-primary-800)] dark:bg-[var(--color-primary-950)] dark:text-[var(--color-primary-100)]'
													: 'hover:bg-slate-100 dark:hover:bg-slate-900'
											}`}
										>
											<button
												type="button"
												onClick={() => setActiveId(chat.id)}
												className="min-w-0 flex-1 text-start"
											>
												<p className="flex items-center gap-1.5 truncate text-xs font-semibold">
													<MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
													{chat.title}
												</p>
												<p className="mt-0.5 truncate text-[10px] text-slate-400">
													{new Date(chat.updatedAt).toLocaleString(locale)}
												</p>
											</button>
											<button
												type="button"
												onClick={() => removeChat(chat.id)}
												className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/40"
												aria-label={t.deleteChat}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										</div>
									);
								})
							)}
						</div>
					</>
				) : null}
			</aside>

			{/* History: collapsed icon rail */}
			{!historyOpen ? (
				<aside className="hidden w-14 shrink-0 flex-col items-center gap-2 border-e border-slate-200/80 bg-white/70 py-3 backdrop-blur md:flex dark:border-slate-800 dark:bg-slate-950/70">
					<button
						type="button"
						onClick={() => setHistoryOpen(true)}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
						aria-label={t.openHistory}
						title={t.openHistory}
					>
						<PanelLeftOpen className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={startNewChat}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-500)] text-white shadow-sm transition hover:brightness-110"
						aria-label={t.newChat}
						title={t.newChat}
					>
						<Plus className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => setSettingsOpen(open => !open)}
						className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
							settingsOpen
								? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-950)]'
								: 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
						}`}
						aria-label={t.settings}
						title={t.settings}
					>
						<Settings2 className="h-4 w-4" />
					</button>
					<div className="mt-1 h-px w-8 bg-slate-200 dark:bg-slate-800" />
					<div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1">
						{chats.slice(0, 12).map(chat => {
							const active = chat.id === activeId;
							return (
								<button
									key={chat.id}
									type="button"
									onClick={() => setActiveId(chat.id)}
									className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
										active
											? 'bg-[var(--color-primary-500)] text-white'
											: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
									}`}
									title={chat.title}
									aria-label={chat.title}
								>
									<MessageSquare className="h-3.5 w-3.5" />
								</button>
							);
						})}
					</div>
				</aside>
			) : null}

			{/* Mobile history drawer */}
			{historyOpen ? (
				<div className="fixed inset-0 z-40 md:hidden">
					<button
						type="button"
						className="absolute inset-0 bg-slate-950/40"
						aria-label={t.closeHistory}
						onClick={() => setHistoryOpen(false)}
					/>
					<aside className="absolute inset-y-0 start-0 flex w-[17.5rem] flex-col border-e border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
						<div className="flex items-center justify-between gap-2 px-3 py-3">
							<p className="text-xs font-bold uppercase tracking-wide text-slate-400">
								{t.history}
							</p>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => {
										startNewChat();
										setHistoryOpen(false);
									}}
									className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-500)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
								>
									<Plus className="h-3.5 w-3.5" />
									{t.newChat}
								</button>
								<button
									type="button"
									onClick={() => setHistoryOpen(false)}
									className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
									aria-label={t.closeHistory}
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						</div>
						<div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
							{filteredChats.map(chat => {
								const active = chat.id === activeId;
								return (
									<button
										key={chat.id}
										type="button"
										onClick={() => {
											setActiveId(chat.id);
											setHistoryOpen(false);
										}}
										className={`flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-start text-xs font-semibold ${
											active
												? 'bg-[var(--color-primary-50)] text-[var(--color-primary-800)]'
												: 'hover:bg-slate-100 dark:hover:bg-slate-900'
										}`}
									>
										<MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
										<span className="truncate">{chat.title}</span>
									</button>
								);
							})}
						</div>
					</aside>
				</div>
			) : null}

			{/* Main column */}
			<div className="relative flex min-w-0 flex-1 flex-col">
				<div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
					<div className="absolute start-1/2 top-[-18%] h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-[var(--color-primary-400)]/12 blur-3xl" />
				</div>

				<header className="relative z-20 flex items-center justify-between gap-3 px-3 py-3 md:px-5">
					<div className="flex min-w-0 items-center gap-2">
						<button
							type="button"
							onClick={() => setHistoryOpen(open => !open)}
							className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
							aria-label={historyOpen ? t.closeHistory : t.openHistory}
						>
							{historyOpen ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
						</button>
						<div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-primary-500)] text-white shadow-[0_8px_18px_-8px_var(--color-primary-500)]">
							<Sparkles className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
								{t.brandEyebrow}
							</p>
							<p className="truncate text-[11px] text-slate-500">
								{activeChat?.title || t.newChat}
								{useProjectKnowledge ? ` · ${t.knowledge}` : ''}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={startNewChat}
							className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-900/80"
						>
							<Plus className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">{t.newChat}</span>
						</button>
						<button
							type="button"
							onClick={() => setSettingsOpen(open => !open)}
							className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition ${
								settingsOpen
									? 'bg-[var(--color-primary-500)] text-white'
									: 'text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-900/80'
							}`}
						>
							<Settings2 className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">{t.settings}</span>
						</button>
					</div>
				</header>

				<AnimatePresence>
					{settingsOpen ? (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							className="relative z-20 mx-3 mb-2 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur md:mx-5 dark:border-slate-700 dark:bg-slate-950/95"
						>
							<div className="grid gap-3 md:grid-cols-3">
								<label className="block space-y-1.5">
									<span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
										{t.provider}
									</span>
									<select
										value={provider}
										onChange={event => setProvider(event.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
									>
										{providers.map(item => (
											<option key={item.name} value={item.name}>
												{item.label || item.name}
											</option>
										))}
									</select>
								</label>
								<label className="block space-y-1.5">
									<span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
										{t.model}
									</span>
									<input
										value={model}
										onChange={event => setModel(event.target.value)}
										placeholder={t.modelHint}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
									/>
								</label>
								<label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
									<input
										type="checkbox"
										checked={allowFallback}
										onChange={event => setAllowFallback(event.target.checked)}
										className="h-4 w-4 accent-[var(--color-primary-500)]"
									/>
									<span className="text-xs font-medium text-slate-600 dark:text-slate-300">
										{t.fallback}
										<span className="mt-0.5 block font-normal text-slate-400">
											{t.fallbackHint}
										</span>
									</span>
								</label>
							</div>
							<label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-[var(--color-primary-50)]/60 px-3 py-3 dark:border-slate-700 dark:bg-[var(--color-primary-950)]/40">
								<input
									type="checkbox"
									checked={useProjectKnowledge}
									onChange={event => setUseProjectKnowledge(event.target.checked)}
									className="mt-0.5 h-4 w-4 accent-[var(--color-primary-500)]"
								/>
								<span className="text-xs font-medium text-slate-700 dark:text-slate-200">
									<span className="inline-flex items-center gap-1">
										<BookOpen className="h-3.5 w-3.5" />
										{t.knowledge}
									</span>
									<span className="mt-0.5 block font-normal text-slate-500 dark:text-slate-400">
										{t.knowledgeHint}
									</span>
									<span className="mt-1 block text-[11px] text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">
										{knowledge?.loaded ? t.knowledgeReady : t.knowledgeMissing}
										{knowledge?.characters
											? ` · ${knowledge.characters} chars`
											: ''}
									</span>
								</span>
							</label>
							<label className="mt-3 block space-y-1.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
									{t.systemPrompt}
								</span>
								<textarea
									value={systemPrompt}
									onChange={event => setSystemPrompt(event.target.value)}
									placeholder={t.systemPlaceholder}
									rows={2}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
								/>
							</label>
							<div className="mt-3 flex justify-end">
								<button
									type="button"
									onClick={() => setSettingsOpen(false)}
									className="rounded-full bg-[var(--color-primary-500)] px-4 py-2 text-xs font-semibold text-white"
								>
									{t.closeSettings}
								</button>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>

				<div className="relative z-10 flex min-h-0 flex-1 flex-col">
					{!hasMessages && !loading ? (
						<div className="flex flex-1 flex-col items-center justify-center px-4 pb-2">
							<motion.div
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								className="w-full max-w-3xl text-center"
							>
								<div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-secondary-500,var(--color-primary-600)))] text-white shadow-[0_16px_36px_-14px_var(--color-primary-500)]">
									<Bot className="h-7 w-7" />
								</div>
								<p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-600)] dark:text-[var(--color-primary-300)]">
									{t.brandEyebrow}
								</p>
								<h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">
									{locale === 'ar'
										? `${name}، ${t.greeting}`
										: `${name}, ${t.greeting.toLowerCase()}`}
								</h1>
								<p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400">
									{t.subtitle}
								</p>
								<div className="mt-8 grid gap-3 sm:grid-cols-3">
									{t.suggestions.map((item, index) => {
										const Icon = SUGGESTION_ICONS[item.icon] || Sparkles;
										return (
											<motion.button
												key={item.title}
												type="button"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: 0.08 * index }}
												onClick={() => sendMessage(item.prompt)}
												className="group rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-300)] dark:border-slate-700 dark:bg-slate-950/70"
											>
												<span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] transition group-hover:bg-[var(--color-primary-500)] group-hover:text-white dark:bg-[var(--color-primary-950)]">
													<Icon className="h-4 w-4" />
												</span>
												<p className="text-sm font-semibold text-slate-900 dark:text-white">
													{item.title}
												</p>
												<p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
													{item.prompt}
												</p>
											</motion.button>
										);
									})}
								</div>
								<p className="mt-6 text-xs text-slate-400">{t.emptyHint}</p>
							</motion.div>
						</div>
					) : (
						<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
							<div dir="ltr" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
								<AnimatePresence initial={false}>
									{messages.map(message => {
										const isUser = message.role === 'user';
										const arabic = isMostlyArabic(message.content);
										const MetaIcon =
											PROVIDER_META[message.meta?.provider]?.icon || Bot;
										return (
											<motion.div
												key={message.id}
												initial={{ opacity: 0, y: 8 }}
												animate={{ opacity: 1, y: 0 }}
												className={`flex w-full gap-2.5 ${
													isUser
														? 'items-end justify-end'
														: 'items-start justify-start'
												}`}
											>
												{!isUser ? (
													<div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-500)] text-white">
														<Bot className="h-4 w-4" />
													</div>
												) : null}
												<div
													className={`flex min-w-0 max-w-[min(100%,85%)] flex-col ${
														isUser ? 'items-end' : 'items-start'
													}`}
												>
													{!isUser ? (
														<div className="mb-1 flex flex-wrap items-center gap-2 justify-start">
															<span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
																{t.assistant}
															</span>
															{message.meta?.provider ? (
																<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-50)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-700)] dark:bg-[var(--color-primary-950)] dark:text-[var(--color-primary-200)]">
																	<MetaIcon className="h-3 w-3" />
																	{message.meta.provider}
																</span>
															) : null}
														</div>
													) : null}
													<div
														dir={arabic ? 'rtl' : 'ltr'}
														lang={arabic ? 'ar' : undefined}
														className={`text-[15px] leading-7 ${
															arabic
																? 'fitcoach-msg-ar font-ar text-right'
																: 'font-en text-left'
														} ${
															isUser
																? 'rounded-2xl rounded-br-md bg-[var(--color-primary-500)] px-4 py-3 text-white shadow-sm'
																: 'rounded-2xl rounded-bl-md bg-white px-4 py-3 text-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700'
														}`}
														style={
															arabic
																? {
																		direction: 'rtl',
																		textAlign: 'right',
																		fontFamily:
																			'var(--font-arabic), Tajawal, Cairo, "Noto Sans Arabic", Tahoma, sans-serif',
																	}
																: undefined
														}
													>
														{isUser ? (
															<div
																dir={arabic ? 'rtl' : 'ltr'}
																className={`whitespace-pre-wrap break-words ${
																	arabic ? 'text-right' : 'text-left'
																}`}
																style={
																	arabic
																		? { direction: 'rtl', textAlign: 'right' }
																		: undefined
																}
															>
																{message.content}
															</div>
														) : (
															<MarkdownMessage
																content={message.content}
																className={arabic ? 'fitcoach-msg-ar' : ''}
															/>
														)}
													</div>
													{!isUser ? (
														<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
															{message.meta?.actualModel ? (
																<span>{message.meta.actualModel}</span>
															) : null}
															{typeof message.meta?.elapsedMs === 'number' ? (
																<span>
																	{message.meta.elapsedMs}
																	{t.elapsed}
																</span>
															) : null}
															{message.meta?.usedFallback ? (
																<span className="inline-flex items-center gap-1 text-amber-600">
																	<RefreshCw className="h-3 w-3" />
																	{t.fallbackUsed}
																</span>
															) : null}
															{message.meta?.usedKnowledge ? (
																<span className="inline-flex items-center gap-1 text-[var(--color-primary-600)]">
																	<BookOpen className="h-3 w-3" />
																	{t.knowledgeUsed}
																</span>
															) : null}
															<button
																type="button"
																onClick={() =>
																	copyText(message.id, message.content)
																}
																className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
															>
																{copiedId === message.id ? (
																	<>
																		<Check className="h-3 w-3" />
																		{t.copied}
																	</>
																) : (
																	<>
																		<Copy className="h-3 w-3" />
																		{t.copy}
																	</>
																)}
															</button>
														</div>
													) : null}
												</div>
												{isUser ? (
													<div className="grid h-8 w-8 shrink-0 place-items-center self-end rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
														<User className="h-4 w-4" />
													</div>
												) : null}
											</motion.div>
										);
									})}
								</AnimatePresence>

								{loading ? (
									<div className="flex gap-3">
										<div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-500)] text-white">
											<Bot className="h-4 w-4" />
										</div>
										<div className="flex items-center gap-2 pt-1 text-sm text-slate-500">
											<span className="flex gap-1">
												<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-500)] [animation-delay:0ms]" />
												<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-500)] [animation-delay:150ms]" />
												<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-500)] [animation-delay:300ms]" />
											</span>
											{t.thinking}
										</div>
									</div>
								) : null}

								{error ? (
									<div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
										<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
										<span>{error}</span>
									</div>
								) : null}
								<div ref={bottomRef} />
							</div>
						</div>
					)}

					<Composer
						value={input}
						onChange={setInput}
						onSubmit={() => sendMessage()}
						onStop={stopGeneration}
						loading={loading}
						placeholder={t.placeholder}
						sendLabel={t.send}
						stopLabel={t.stop}
						provider={provider}
						providers={providers}
						onProviderChange={setProvider}
						hint={t.composerHint}
					/>
				</div>
			</div>
		</div>
	);
}
