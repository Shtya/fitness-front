'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Bot, Check, ExternalLink, FileText, FileUp, Link2, Loader2, Type, User, X } from 'lucide-react';
import { useReadingNav } from '@/lib/ai-reading/reading-nav';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { upsertBook, flushAiReadingStore } from '@/lib/ai-reading/storage';
import { extractBookFile } from '@/lib/ai-reading/extract-book-file';
import { claudeShareId, claudeSnapshotUrl, extractClaudeSnapshot } from '@/lib/ai-reading/claude-share';
import { messagesToMarkdown } from '@/lib/ai-reading/chat-markdown';
import { DirArrow, PageHeader, Switch, useRoomLang } from '@/components/ai-reading/room/RoomUI';

const SAMPLE = `# The Psychology of Money

## Chapter 1 — No One's Crazy
Your personal experiences with money make up maybe 0.00000001% of what's happened in the world, but maybe 80% of how you think the world works.

**Key concept**
Luck and risk are siblings — every outcome is powered by forces other than individual effort.

## Chapter 2 — Compounding
Consistency beats intensity when time is on your side.

> Wealth is what you don't see.

**Action**
Automate a small weekly savings transfer before you can spend it.
`;

const CLIENT_TIMEOUT_MS = 120000;

function looksLikeUrl(value) {
	try {
		const u = new URL(value.trim());
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

export default function ImportPanel() {
	const t = useTranslations('aiReading');
	const { L } = useRoomLang();
	const { openBook } = useReadingNav();
	const fileRef = useRef(null);
	const [mode, setMode] = useState('paste'); // paste | link | file
	const [raw, setRaw] = useState('');
	const [url, setUrl] = useState('');
	const [title, setTitle] = useState('');
	const [fileName, setFileName] = useState('');
	const [fileMeta, setFileMeta] = useState(null); // { kind, pages }
	const [dragOver, setDragOver] = useState(false);
	const [enhance, setEnhance] = useState(true);
	const [busy, setBusy] = useState(false);
	const [phase, setPhase] = useState('');
	const [error, setError] = useState('');
	const [preview, setPreview] = useState(null);
	const [includeRoles, setIncludeRoles] = useState(true);
	const [claudeDataUrl, setClaudeDataUrl] = useState('');
	const [claudeData, setClaudeData] = useState('');

	const selectedCount = useMemo(() => (preview?.selected ? preview.selected.size : 0), [preview]);

	const resetPreview = () => {
		setPreview(null);
		setClaudeDataUrl('');
		setClaudeData('');
	};

	const readClaudeData = value => {
		setClaudeData(value);
		setPreview(null);
		if (!value.trim()) {
			setError('');
			return;
		}
		let json = null;
		try {
			json = JSON.parse(value);
		} catch {
			setError(L('ده مش بيانات المحادثة. انسخ كل الصفحة اللي اتفتحت (Ctrl+A ثم Ctrl+C) والصقها هنا.', 'That is not the conversation data. Copy the whole page that opened (Ctrl+A, Ctrl+C) and paste it here.'));
			return;
		}
		if (json?.error) {
			setError(L('Claude طلب تسجيل دخول. سجّل دخول على claude.ai بنفس المتصفح وافتح الرابط تاني.', 'Claude asked you to sign in. Log in to claude.ai in this browser, then open the link again.'));
			return;
		}
		const share = extractClaudeSnapshot(json);
		if (!share) {
			setError(L('مفيش رسائل مقروءة في البيانات دي.', 'No readable messages in that data.'));
			return;
		}
		setError('');
		setPreview({ kind: 'chat-share', provider: 'claude', local: true, title: share.title, messages: share.messages, selected: new Set(share.messages.map(m => m.id)) });
		if (!title.trim()) setTitle(share.title);
	};

	const clearFile = () => {
		setFileName('');
		setFileMeta(null);
		setRaw('');
		if (fileRef.current) fileRef.current.value = '';
	};

	const readFile = async file => {
		if (!file) return;
		setError('');
		setBusy(true);
		setPhase(t('import.workingExtract'));
		try {
			const extracted = await extractBookFile(file);
			setRaw(extracted.text);
			setFileName(file.name);
			setFileMeta({ kind: extracted.kind, pages: extracted.pages });
			if (!title.trim()) {
				const base = file.name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim();
				if (base) setTitle(base);
			}
		} catch (err) {
			clearFile();
			const code = err?.message;
			if (code === 'UNSUPPORTED_FILE') setError(t('import.unsupportedFile'));
			else if (code === 'PDF_EMPTY' || code === 'DOCX_EMPTY') setError(t('import.emptyFile'));
			else setError(err.message || t('errors.import'));
		} finally {
			setBusy(false);
			setPhase('');
		}
	};

	const fetchShare = async () => {
		let link = url.trim();
		let bookTitle = title;
		if (!looksLikeUrl(link) && looksLikeUrl(title)) {
			link = title.trim();
			bookTitle = '';
			setUrl(link);
			setTitle('');
		}
		if (!looksLikeUrl(link)) throw new Error(t('import.invalidUrl'));
		const claudeId = claudeShareId(link);
		if (claudeId) {
			setClaudeDataUrl(claudeSnapshotUrl(claudeId));
			return;
		}
		setPhase(t('import.workingFetch'));
		const data = await aiReadingApi.importUrl({ url: link, action: 'preview' });
		if (data.kind === 'chat-share') {
			const selected = new Set((data.messages || []).filter(m => m.selectedDefault !== false).map(m => m.id));
			setPreview({ kind: 'chat-share', provider: data.provider, title: data.title, messages: data.messages || [], selected });
			if (!bookTitle.trim() && data.title) setTitle(data.title);
			return;
		}
		setPhase(t('import.working'));
		const imported = await aiReadingApi.importUrl({ url: link, title: bookTitle || data.title || undefined, enhance, action: 'import' });
		upsertBook(imported.book);
		await flushAiReadingStore();
		openBook(imported.book.id);
	};

	const importSelected = async () => {
		if (!preview || preview.kind !== 'chat-share') return;
		const ids = [...preview.selected];
		if (!ids.length) throw new Error(t('import.selectOne'));
		setPhase(t('import.working'));
		if (preview.local) {
			const picked = preview.messages.filter(m => preview.selected.has(m.id));
			const raw = messagesToMarkdown(picked, { includeRoles, assistantLabel: 'Claude' });
			const local = await aiReadingApi.import({ raw, title: title || preview.title || undefined, enhance });
			upsertBook(local.book);
			await flushAiReadingStore();
			openBook(local.book.id);
			return;
		}
		const data = await aiReadingApi.importUrl({
			url: url.trim(),
			title: title || preview.title || undefined,
			enhance,
			action: 'import',
			messageIds: ids,
			includeRoles,
		});
		upsertBook(data.book);
		await flushAiReadingStore();
		openBook(data.book.id);
	};

	const submit = async e => {
		e.preventDefault();
		setBusy(true);
		setError('');
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
		try {
			if (mode === 'link') {
				if (preview?.kind === 'chat-share') await importSelected();
				else await fetchShare();
			} else {
				if (!raw.trim()) throw new Error(t('errors.import'));
				setPhase(t('import.working'));
				const data = await aiReadingApi.import({ raw, title: title || undefined, enhance }, { signal: ctrl.signal });
				upsertBook(data.book);
				await flushAiReadingStore();
				openBook(data.book.id);
			}
		} catch (err) {
			setError(err?.name === 'AbortError' ? t('import.timeout') : err.message || t('errors.import'));
		} finally {
			clearTimeout(timer);
			setBusy(false);
			setPhase('');
		}
	};

	const setSelected = pick => setPreview(prev => (prev ? { ...prev, selected: new Set(pick(prev)) } : prev));
	const toggleMsg = id =>
		setSelected(prev => {
			const next = new Set(prev.selected);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const ctaLabel = () => {
		if (busy) return phase || t('import.working');
		if (mode === 'link' && preview?.kind === 'chat-share') return t('import.importSelected', { count: selectedCount });
		if (mode === 'link') return t('import.fetchMessages');
		if (mode === 'file') return t('import.ctaFile');
		return t('import.cta');
	};

	const submitDisabled =
		busy ||
		(mode === 'paste' && !raw.trim()) ||
		(mode === 'file' && !raw.trim()) ||
		(mode === 'link' && !url.trim()) ||
		(mode === 'link' && claudeDataUrl && !preview) ||
		(preview?.kind === 'chat-share' && selectedCount === 0);

	const SOURCES = [
		{ id: 'paste', Icon: Type, label: L('نص', 'Text'), hint: L('الصق مقال أو محادثة', 'Paste an article or chat') },
		{ id: 'link', Icon: Link2, label: L('لينك', 'Link'), hint: L('مقال أو مشاركة ChatGPT / Claude', 'Article, ChatGPT or Claude share') },
		{ id: 'file', Icon: FileUp, label: L('ملف', 'File'), hint: L('PDF أو Word', 'PDF or Word') },
	];

	const pickMode = id => {
		setMode(id);
		resetPreview();
		setError('');
		if (id !== 'file') clearFile();
	};

	return (
		<form onSubmit={submit} className="mx-auto max-w-3xl space-y-8">
			<PageHeader
				title={L('أضف كتابًا', 'Add a book')}
				subtitle={L('أي نص أو لينك أو ملف يتحول لكتاب مرتب، تقدر تقراه وتظلّل فيه وتراجعه.', 'Turn any text, link or file into a clean book you can read, highlight and review.')}
			/>

			<div className="rr-card overflow-hidden">
				<div className="space-y-6 p-4 sm:p-7">
					<div role="radiogroup" aria-label={L('مصدر الكتاب', 'Source')} className="grid grid-cols-3 gap-2 sm:gap-3">
						{SOURCES.map(({ id, Icon, label, hint }) => (
							<button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => pickMode(id)} className="rr-choice">
								<span className="rr-choice-icon"><Icon size={17} /></span>
								<span className="min-w-0">
									<span className="block text-[14px] font-semibold">{label}</span>
									<span className="mt-0.5 hidden text-[12px] leading-snug rr-faint sm:block">{hint}</span>
								</span>
							</button>
						))}
					</div>

					<AnimatePresence mode="wait" initial={false}>
						<motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
							{mode === 'link' ? (
								<div className="space-y-4">
									<label className="block">
										<span className="rr-label">{L('اللينك', 'Link')}</span>
										<span className="relative block" dir="ltr">
											<Link2 size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 rr-faint" />
											<input
												value={url}
												onChange={e => {
													setUrl(e.target.value);
													resetPreview();
												}}
												required
												inputMode="url"
												dir="ltr"
												placeholder="https://chatgpt.com/share/… · https://claude.ai/share/…"
												className="rr-field ps-10"
											/>
										</span>
										<span className="mt-2 block text-[12.5px] leading-relaxed rr-faint">{t('import.linkHintChat')}</span>
									</label>

									{claudeDataUrl && !preview && (
										<div className="space-y-4 rounded-[14px] border p-4" style={{ borderColor: 'var(--rr-line-strong)', background: 'var(--rr-bg)' }}>
											<p className="text-[13px] leading-relaxed rr-muted">
												{L('Claude بيقفل المحادثة على حسابك، فهنقراها من متصفحك وانت مسجل دخول — خطوتين بس:', 'Claude keeps shares behind your login, so we read it from your signed-in browser — two quick steps:')}
											</p>
											<div className="flex items-start gap-3">
												<span className="grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold" style={{ background: 'var(--rr-accent-soft)', color: 'var(--rr-accent)' }}>1</span>
												<div className="min-w-0 flex-1 space-y-2">
													<p className="text-[13.5px] font-semibold">{L('افتح بيانات المحادثة، وبعدين Ctrl+A ثم Ctrl+C', 'Open the conversation data, then Ctrl+A and Ctrl+C')}</p>
													<a href={claudeDataUrl} target="_blank" rel="noopener noreferrer" className="rr-btn rr-btn-ghost rr-btn-sm">
														<ExternalLink size={14} /> {L('افتح بيانات المحادثة', 'Open conversation data')}
													</a>
												</div>
											</div>
											<div className="flex items-start gap-3">
												<span className="grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold" style={{ background: 'var(--rr-accent-soft)', color: 'var(--rr-accent)' }}>2</span>
												<label className="min-w-0 flex-1 space-y-2">
													<span className="block text-[13.5px] font-semibold">{L('الصق هنا، وهتظهر لك الرسائل تختار منها', 'Paste it here and pick the messages you want')}</span>
													<textarea
														value={claudeData}
														onChange={e => readClaudeData(e.target.value)}
														rows={4}
														dir="ltr"
														spellCheck={false}
														placeholder='{"chat_messages": [ … ] }'
														className="rr-field font-mono text-[12px]"
													/>
												</label>
											</div>
										</div>
									)}

									{preview?.kind === 'chat-share' && (
										<div className="overflow-hidden rounded-[14px] border" style={{ borderColor: 'var(--rr-line-strong)' }}>
											<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ background: 'var(--rr-bg)' }}>
												<div className="min-w-0">
													<p className="truncate text-[14px] font-semibold" dir="auto">{preview.title}</p>
													<p className="text-[12px] rr-faint">
														{t('import.messagesFound', { count: preview.messages.length })} · {t('import.selectedCount', { count: selectedCount })}
													</p>
												</div>
												<div className="flex flex-wrap gap-1">
													<button type="button" className="rr-btn rr-btn-ghost rr-btn-sm" onClick={() => setSelected(p => p.messages.map(m => m.id))}>{t('import.selectAll')}</button>
													<button type="button" className="rr-btn rr-btn-ghost rr-btn-sm" onClick={() => setSelected(p => p.messages.filter(m => m.role === 'assistant').map(m => m.id))}>{t('import.selectAssistant')}</button>
													<button type="button" className="rr-btn rr-btn-ghost rr-btn-sm" onClick={() => setSelected(() => [])}>{t('import.clearSelection')}</button>
												</div>
											</div>
											<ul className="max-h-[min(440px,55dvh)] overflow-y-auto" style={{ borderTop: '1px solid var(--rr-line)' }}>
												{preview.messages.map(m => {
													const on = preview.selected.has(m.id);
													const isUser = m.role === 'user';
													return (
														<li key={m.id} style={{ borderBottom: '1px solid var(--rr-line)' }}>
															<button
																type="button"
																role="checkbox"
																aria-checked={on}
																onClick={() => toggleMsg(m.id)}
																className="flex w-full items-start gap-3 px-4 py-3.5 text-start transition"
																style={{ background: on ? 'var(--rr-accent-soft)' : 'transparent' }}
															>
																<span
																	className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md transition"
																	style={on ? { background: 'var(--rr-accent)', color: 'var(--rr-accent-ink)' } : { boxShadow: 'inset 0 0 0 1.5px var(--rr-line-strong)' }}
																>
																	{on && <Check size={13} strokeWidth={3} />}
																</span>
																<span className="min-w-0 flex-1">
																	<span className="flex items-center gap-1.5 text-[12px] font-semibold rr-muted">
																		{isUser ? <User size={13} /> : <Bot size={13} />}
																		{isUser ? t('import.roleUser') : preview.provider === 'claude' ? 'Claude' : t('import.roleAssistant')}
																	</span>
																	<span className="mt-1 block text-[14px] leading-relaxed line-clamp-3" dir="auto">{m.preview}</span>
																</span>
															</button>
														</li>
													);
												})}
											</ul>
											<div className="px-4 py-3">
												<Switch checked={includeRoles} onChange={setIncludeRoles} label={t('import.includeRoles')} />
											</div>
										</div>
									)}
								</div>
							) : mode === 'file' ? (
								<div className="space-y-4">
									<input
										ref={fileRef}
										type="file"
										accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
										className="hidden"
										onChange={e => readFile(e.target.files?.[0])}
									/>
									{fileName ? (
										<div className="flex items-center gap-3 rounded-[14px] border p-3.5" style={{ borderColor: 'var(--rr-line-strong)' }}>
											<span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--rr-accent-soft)', color: 'var(--rr-accent)' }}>
												<FileText size={19} />
											</span>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[14px] font-semibold">{fileName}</p>
												<p className="mt-0.5 text-[12.5px] rr-faint">
													{fileMeta?.kind === 'pdf'
														? t('import.fileReadyPdf', { pages: fileMeta.pages || 0, chars: raw.length })
														: t('import.fileReadyDocx', { chars: raw.length })}
												</p>
											</div>
											<button type="button" onClick={clearFile} className="rr-icon-btn" aria-label={t('import.fileClear')}>
												<X size={16} />
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={() => fileRef.current?.click()}
											onDragOver={e => {
												e.preventDefault();
												setDragOver(true);
											}}
											onDragLeave={() => setDragOver(false)}
											onDrop={e => {
												e.preventDefault();
												setDragOver(false);
												readFile(e.dataTransfer.files?.[0]);
											}}
											disabled={busy}
											className={`rr-dropzone ${dragOver ? 'is-over' : ''}`}
										>
											<span className="grid size-12 place-items-center rounded-full" style={{ background: 'var(--rr-surface)', boxShadow: 'var(--rr-shadow)', color: 'var(--rr-accent)' }}>
												{busy ? <Loader2 size={20} className="animate-spin" /> : <FileUp size={20} />}
											</span>
											<span>
												<span className="block text-[15px] font-semibold">{L('اسحب الملف هنا أو اختاره', 'Drop a file here or browse')}</span>
												<span className="mt-1 block text-[13px] rr-faint">{L('PDF أو Word — هنطلّع النص كله', 'PDF or Word — we extract all the text')}</span>
											</span>
										</button>
									)}
									{raw.trim() && (
										<label className="block">
											<span className="rr-label">{t('import.previewExtract')}</span>
											<textarea value={raw} onChange={e => setRaw(e.target.value)} rows={8} dir="auto" className="rr-field resize-y text-[13.5px] leading-relaxed" />
										</label>
									)}
								</div>
							) : (
								<label className="block">
									<span className="flex items-baseline justify-between gap-3">
										<span className="rr-label">{L('المحتوى', 'Content')}</span>
										{!raw && (
											<button type="button" onClick={() => setRaw(SAMPLE)} className="text-[12.5px] font-semibold" style={{ color: 'var(--rr-accent)' }}>
												{t('import.loadSample')}
											</button>
										)}
									</span>
									<textarea
										value={raw}
										onChange={e => setRaw(e.target.value)}
										rows={9}
										required
										dir={raw.trim() ? 'auto' : undefined}
										placeholder={t('import.pastePlaceholder')}
										className="rr-field resize-y text-[15px] leading-relaxed"
									/>
									{raw.trim() ? (
										<span className="mt-1.5 block text-end text-[12px] tabular-nums rr-faint">
											{L(`${raw.trim().split(/\s+/).length} كلمة`, `${raw.trim().split(/\s+/).length} words`)}
										</span>
									) : null}
								</label>
							)}
						</motion.div>
					</AnimatePresence>

					<label className="block">
						<span className="rr-label">{L('اسم الكتاب', 'Title')} <span className="font-normal rr-faint">{L('(اختياري)', '(optional)')}</span></span>
						<input value={title} onChange={e => setTitle(e.target.value)} dir={title.trim() ? 'auto' : undefined} className="rr-field" placeholder={t('import.titlePlaceholder')} />
					</label>
				</div>

				<div className="space-y-4 px-4 py-4 sm:px-7 sm:py-5" style={{ background: 'var(--rr-bg)', borderTop: '1px solid var(--rr-line)' }}>
					<Switch
						checked={enhance}
						onChange={setEnhance}
						label={L('رتّب الكتاب بالذكاء الاصطناعي', 'Tidy it up with AI')}
						hint={L('عناوين وفصول وفقرات أوضح لما يكون متاح', 'Clearer headings, chapters and paragraphs when available')}
					/>

					<AnimatePresence>
						{error && (
							<motion.p
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								role="alert"
								className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13.5px] leading-relaxed"
								style={{ background: 'var(--rr-danger-soft)', color: 'var(--rr-danger)' }}
							>
								<AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
							</motion.p>
						)}
					</AnimatePresence>

					<button type="submit" disabled={submitDisabled} className="rr-btn rr-btn-primary rr-btn-lg w-full sm:w-auto">
						{busy ? <Loader2 size={17} className="animate-spin" /> : null}
						{ctaLabel()}
						{!busy ? <DirArrow size={16} /> : null}
					</button>
				</div>
			</div>
		</form>
	);
}
