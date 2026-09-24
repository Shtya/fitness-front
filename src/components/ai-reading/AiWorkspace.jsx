'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
	BookOpen,
	Import,
	Lightbulb,
	Loader2,
	MessageSquareQuote,
	Send,
	Sparkles,
	Star,
	FileText,
	ListTodo,
} from 'lucide-react';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { interpolate } from '@/lib/ai-reading/prompts';
import { createChatMessage, uid } from '@/lib/ai-reading/schemas';
import {
	clearChatSession,
	getChatSession,
	listPrompts,
	listTopics,
	saveChatSession,
	upsertBook,
	upsertJourney,
	upsertTopic,
} from '@/lib/ai-reading/storage';
import { enqueueReviewItems } from '@/lib/ai-reading/spaced-review';

export default function AiWorkspace({ embedded = false }) {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const router = useRouter();
	const [prompts, setPrompts] = useState([]);
	const [topics, setTopics] = useState([]);
	const [session, setSession] = useState(null);
	const [composer, setComposer] = useState('');
	const [busy, setBusy] = useState(false);
	const [rightTab, setRightTab] = useState('content'); // content | notes | import
	const [draftBook, setDraftBook] = useState(null);
	const [draftRoadmap, setDraftRoadmap] = useState(null);
	const [sideNotes, setSideNotes] = useState('');
	const [importRaw, setImportRaw] = useState('');
	const [importBusy, setImportBusy] = useState(false);
	const [error, setError] = useState('');
	const endRef = useRef(null);

	const refreshLibs = () => {
		setPrompts(listPrompts());
		setTopics(listTopics());
	};

	useEffect(() => {
		refreshLibs();
		setSession(getChatSession());
	}, []);

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [session?.messages?.length, busy]);

	const favoritePrompts = useMemo(() => prompts.filter(p => p.favorite), [prompts]);
	const favoriteTopics = useMemo(() => topics.filter(tpc => tpc.favorite), [topics]);

	const insertPrompt = prompt => {
		const body = interpolate(prompt.body, {
			topic: '{{topic}}',
			style: 'narrative',
			depth: 'standard',
			language: locale === 'ar' ? 'ar' : 'en',
			readingTime: '10',
		});
		setComposer(body);
	};

	const insertTopic = topic => {
		setComposer(prev => {
			if (!prev.trim()) {
				const deep = prompts.find(p => /deep article/i.test(p.title)) || prompts[0];
				if (deep) {
					return interpolate(deep.body, {
						topic: topic.title,
						style: 'narrative',
						depth: 'standard',
						language: locale === 'ar' ? 'ar' : 'en',
						readingTime: '10',
					});
				}
				return `Explain ${topic.title} deeply but simply with examples and one practical action.`;
			}
			if (prev.includes('{{topic}}')) return prev.replace(/\{\{topic\}\}/g, topic.title);
			return `${prev.trim()}\n\nTopic: ${topic.title}`;
		});
	};

	const send = async () => {
		const text = composer.trim();
		if (!text || busy) return;
		setError('');
		setBusy(true);
		const userMsg = createChatMessage('user', text);
		const nextSession = {
			...session,
			messages: [...(session?.messages || []), userMsg],
		};
		setSession(nextSession);
		saveChatSession(nextSession);
		setComposer('');

		try {
			const data = await aiReadingApi.chat({ messages: nextSession.messages });
			const assistant = createChatMessage('assistant', data.reply || t('workspace.emptyReply'), {
				intent: data.intent,
				meta: {
					hasBook: Boolean(data.book),
					hasRoadmap: Boolean(data.roadmap),
					questions: data.questions,
					actions: data.actions,
					topics: data.topics,
				},
			});
			const saved = saveChatSession({
				...nextSession,
				messages: [...nextSession.messages, assistant],
			});
			setSession(saved);
			if (data.book) {
				setDraftBook(data.book);
				setRightTab('content');
			}
			if (data.roadmap) {
				setDraftRoadmap(data.roadmap);
				setRightTab('content');
			}
			if (data.topics?.length) {
				data.topics.forEach(title => {
					upsertTopic({
						id: uid('topic'),
						title: typeof title === 'string' ? title : title.title,
						folder: 'inbox',
						tags: ['suggested'],
						favorite: false,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					});
				});
				refreshLibs();
			}
		} catch (e) {
			setError(e.message || t('errors.chat'));
		} finally {
			setBusy(false);
		}
	};

	const saveDraftBook = () => {
		if (!draftBook) return;
		const book = enqueueReviewItems({ ...draftBook });
		upsertBook(book);
		router.push(`/ai-studio/read/${book.id}`);
	};

	const saveRoadmapAsJourney = () => {
		if (!draftRoadmap) return;
		const journey = upsertJourney({
			id: uid('journey'),
			title: draftRoadmap.title || draftRoadmap.theme,
			theme: draftRoadmap.theme || draftRoadmap.title,
			description: draftRoadmap.description || '',
			monthKey: new Date().toISOString().slice(0, 7),
			language: locale === 'ar' ? 'ar' : 'en',
			items: draftRoadmap.items || [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		router.push(`/ai-studio/journeys/${journey.id}`);
	};

	const runImport = async () => {
		if (!importRaw.trim()) return;
		setImportBusy(true);
		setError('');
		try {
			const { book } = await aiReadingApi.import({ raw: importRaw, enhance: true });
			setDraftBook(book);
			setRightTab('content');
			const assistant = createChatMessage('assistant', t('workspace.importReady', { title: book.title }));
			const saved = saveChatSession({
				...session,
				messages: [...(session?.messages || []), assistant],
			});
			setSession(saved);
		} catch (e) {
			setError(e.message || t('errors.import'));
		} finally {
			setImportBusy(false);
		}
	};

	const quickActions = [
		{ label: t('workspace.quick.article'), text: 'Write a deep but easy 10-minute article about {{topic}} with examples and one action.' },
		{ label: t('workspace.quick.outline'), text: 'Create a learning index / outline for a short book about {{topic}}.' },
		{ label: t('workspace.quick.explain'), text: 'Explain {{topic}} simply with an analogy and 3 key ideas.' },
		{ label: t('workspace.quick.actions'), text: 'Give me 5 practical actions I can try this week related to {{topic}}.' },
	];

	return (
		<div className={`flex min-h-[420px] flex-col gap-3 lg:flex-row ${embedded ? 'h-[min(720px,calc(100dvh-14rem))] sm:h-[min(720px,calc(100dvh-12rem))]' : 'h-[calc(100dvh-7.5rem)] min-h-[560px]'}`}>
			{/* LEFT */}
			<aside className="flex max-h-[40vh] w-full shrink-0 flex-col gap-3 overflow-hidden rounded-3xl bg-white/65 p-3 ring-1 ring-[color:var(--ar-ring)]/10 lg:max-h-none lg:w-72">
				<div className="flex items-center justify-between px-1">
					<p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ar-muted)]">{t('workspace.leftTitle')}</p>
					<button type="button" onClick={() => { clearChatSession(); setSession(getChatSession()); }} className="text-[10px] font-semibold text-[var(--ar-accent)]">
						{t('workspace.newChat')}
					</button>
				</div>

				<section className="min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
					<div>
						<p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-[var(--ar-heading)]">
							<MessageSquareQuote size={12} /> {t('workspace.savedPrompts')}
						</p>
						<div className="space-y-1.5">
							{(favoritePrompts.length ? favoritePrompts : prompts.slice(0, 6)).map(p => (
								<button
									key={p.id}
									type="button"
									onClick={() => insertPrompt(p)}
									className="w-full rounded-xl bg-[var(--ar-accent)]/[0.04] px-3 py-2 text-start transition hover:bg-[var(--ar-accent)]/10"
								>
									<p className="text-xs font-semibold text-[var(--ar-heading)]">{p.title}</p>
									<p className="mt-0.5 line-clamp-2 text-[10px] text-[var(--ar-muted)]">{p.body}</p>
								</button>
							))}
						</div>
					</div>

					<div>
						<p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-[var(--ar-heading)]">
							<Lightbulb size={12} /> {t('workspace.topics')}
						</p>
						<div className="space-y-1.5">
							{(favoriteTopics.length ? favoriteTopics : topics.slice(0, 8)).map(topic => (
								<button
									key={topic.id}
									type="button"
									onClick={() => insertTopic(topic)}
									className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-start hover:bg-[var(--ar-accent)]/[0.06]"
								>
									{topic.favorite ? <Star size={11} className="mt-0.5 fill-amber-400 text-amber-400" /> : <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--ar-accent)]" />}
									<span className="text-xs text-[var(--ar-heading)]">{topic.title}</span>
								</button>
							))}
						</div>
					</div>
				</section>
			</aside>

			{/* CENTER chat */}
			<section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white/90 ring-1 ring-[color:var(--ar-ring)]/10">
				<div className="border-b border-[color:var(--ar-border)]/10 px-4 py-3">
					<p className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-[var(--ar-heading)]">{t('workspace.chatTitle')}</p>
					<p className="text-[11px] text-[var(--ar-muted)]">{t('workspace.chatSub')}</p>
				</div>

				<div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
					{(session?.messages || []).map(msg => (
						<motion.div
							key={msg.id}
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
								msg.role === 'user'
									? 'ms-auto bg-[var(--ar-accent)] text-white'
									: 'bg-white text-[var(--ar-heading)] shadow-sm ring-1 ring-[color:var(--ar-ring)]/8'
							}`}
						>
							<p className="whitespace-pre-wrap">{msg.content}</p>
							{msg.meta?.hasBook && (
								<p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--ar-accent)]">{t('workspace.bookAttached')}</p>
							)}
						</motion.div>
					))}
					{busy && (
						<div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs text-[var(--ar-muted)] shadow-sm">
							<Loader2 size={14} className="animate-spin" /> {t('workspace.thinking')}
						</div>
					)}
					<div ref={endRef} />
				</div>

				<div className="border-t border-[color:var(--ar-border)]/10 p-3">
					<div className="mb-2 flex flex-wrap gap-1.5">
						{quickActions.map(q => (
							<button
								key={q.label}
								type="button"
								onClick={() => setComposer(q.text)}
								className="rounded-full bg-[var(--ar-accent)]/[0.06] px-2.5 py-1 text-[10px] font-semibold text-[var(--ar-heading)]"
							>
								{q.label}
							</button>
						))}
					</div>
					{error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
					<div className="flex gap-2">
						<textarea
							value={composer}
							onChange={e => setComposer(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									send();
								}
							}}
							rows={3}
							placeholder={t('workspace.composerPlaceholder')}
							className="flex-1 resize-none rounded-2xl border border-[color:var(--ar-border)]/15 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ar-accent)]/25"
						/>
						<button
							type="button"
							disabled={busy || !composer.trim()}
							onClick={send}
							className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-2xl text-white disabled:opacity-40"
							style={{ background: 'linear-gradient(135deg,var(--ar-heading),var(--ar-accent))' }}
						>
							{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
						</button>
					</div>
				</div>
			</section>

			{/* RIGHT */}
			<aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-3xl bg-white/65 ring-1 ring-[color:var(--ar-ring)]/10 lg:w-80">
				<div className="flex gap-1 border-b border-[color:var(--ar-border)]/10 p-2">
					{[
						['content', FileText, t('workspace.tabs.content')],
						['notes', ListTodo, t('workspace.tabs.notes')],
						['import', Import, t('workspace.tabs.import')],
					].map(([id, Icon, label]) => (
						<button
							key={id}
							type="button"
							onClick={() => setRightTab(id)}
							className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${
								rightTab === id ? 'bg-[var(--ar-accent)] text-white' : 'text-[var(--ar-muted)]'
							}`}
						>
							<Icon size={12} /> {label}
						</button>
					))}
				</div>

				<div className="flex-1 overflow-y-auto p-3">
					<AnimatePresence mode="wait">
						{rightTab === 'content' && (
							<motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
								{!draftBook && !draftRoadmap && (
									<div className="rounded-2xl border border-dashed border-[color:var(--ar-border)]/20 px-4 py-10 text-center text-xs text-[var(--ar-muted)]">
										{t('workspace.emptyRight')}
									</div>
								)}
								{draftBook && (
									<div className="rounded-2xl bg-white p-4 ring-1 ring-[color:var(--ar-ring)]/10">
										<p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ar-accent)]">{t('workspace.generatedBook')}</p>
										<h3 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[var(--ar-heading)]">{draftBook.title}</h3>
										<p className="mt-1 text-xs text-[var(--ar-muted)]">{draftBook.subtitle}</p>
										<p className="mt-3 text-[11px] text-[var(--ar-muted)]">
											{(draftBook.chapters || []).length} {t('workspace.chapters')} · {draftBook.readingTimeMinutes || 10} min
										</p>
										<ul className="mt-3 space-y-1">
											{(draftBook.chapters || []).slice(0, 5).map(ch => (
												<li key={ch.id} className="text-xs text-[var(--ar-heading)]">
													· {ch.title}
												</li>
											))}
										</ul>
										<button
											type="button"
											onClick={saveDraftBook}
											className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--ar-accent)] px-4 py-2 text-xs font-bold text-white"
										>
											<BookOpen size={13} /> {t('workspace.openReading')}
										</button>
									</div>
								)}
								{draftRoadmap && (
									<div className="rounded-2xl bg-white p-4 ring-1 ring-[color:var(--ar-ring)]/10">
										<p className="text-[10px] font-bold uppercase tracking-widest text-[#b45309]">{t('workspace.roadmap')}</p>
										<h3 className="mt-1 font-bold text-[var(--ar-heading)]">{draftRoadmap.title}</h3>
										<ol className="mt-3 space-y-2">
											{(draftRoadmap.items || []).map((it, i) => (
												<li key={it.id || i} className="flex gap-2 text-xs text-[var(--ar-heading)]">
													<span className="font-bold text-[var(--ar-muted)]">{String(it.order || i + 1).padStart(2, '0')}</span>
													<span>
														{it.title}
														<span className="ms-1 text-[var(--ar-muted)]">{it.subtitle || `${it.readingTimeMinutes} min`}</span>
													</span>
												</li>
											))}
										</ol>
										<button
											type="button"
											onClick={saveRoadmapAsJourney}
											className="mt-4 rounded-full bg-[#b45309] px-4 py-2 text-xs font-bold text-white"
										>
											{t('workspace.saveJourney')}
										</button>
									</div>
								)}
							</motion.div>
						)}

						{rightTab === 'notes' && (
							<motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
								<textarea
									value={sideNotes}
									onChange={e => setSideNotes(e.target.value)}
									rows={14}
									placeholder={t('workspace.notesPlaceholder')}
									className="w-full rounded-2xl border border-[color:var(--ar-border)]/15 bg-white px-3 py-3 text-sm outline-none"
								/>
								<p className="mt-2 text-[10px] text-[var(--ar-muted)]">{t('workspace.notesHint')}</p>
							</motion.div>
						)}

						{rightTab === 'import' && (
							<motion.div key="import" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
								<p className="text-xs text-[var(--ar-muted)]">{t('workspace.importHint')}</p>
								<textarea
									value={importRaw}
									onChange={e => setImportRaw(e.target.value)}
									rows={12}
									placeholder={t('import.pastePlaceholder')}
									className="w-full rounded-2xl border border-[color:var(--ar-border)]/15 bg-white px-3 py-3 font-mono text-[12px] outline-none"
								/>
								<button
									type="button"
									disabled={importBusy || !importRaw.trim()}
									onClick={runImport}
									className="inline-flex items-center gap-2 rounded-full bg-[var(--ar-accent)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
								>
									{importBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
									{t('import.cta')}
								</button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</aside>
		</div>
	);
}
