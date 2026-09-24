'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Bot, BookOpen, CheckSquare, FileUp, Import, Link2, Loader2, Square, User } from 'lucide-react';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { upsertBook, flushAiReadingStore } from '@/lib/ai-reading/storage';
import { extractBookFile } from '@/lib/ai-reading/extract-book-file';

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
	const router = useRouter();
	const fileRef = useRef(null);
	const [mode, setMode] = useState('paste'); // paste | link | file
	const [raw, setRaw] = useState('');
	const [url, setUrl] = useState('');
	const [title, setTitle] = useState('');
	const [fileName, setFileName] = useState('');
	const [fileMeta, setFileMeta] = useState(null); // { kind, pages }
	const [enhance, setEnhance] = useState(true);
	const [busy, setBusy] = useState(false);
	const [phase, setPhase] = useState('');
	const [error, setError] = useState('');
	const [preview, setPreview] = useState(null);
	const [includeRoles, setIncludeRoles] = useState(true);

	const selectedCount = useMemo(() => {
		if (!preview?.selected) return 0;
		return [...preview.selected].length;
	}, [preview]);

	const resetPreview = () => setPreview(null);

	const clearFile = () => {
		setFileName('');
		setFileMeta(null);
		setRaw('');
		if (fileRef.current) fileRef.current.value = '';
	};

	const onPickFile = async e => {
		const file = e.target.files?.[0];
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
		const link = url.trim();
		if (!looksLikeUrl(link)) throw new Error(t('import.invalidUrl'));
		setPhase(t('import.workingFetch'));
		const data = await aiReadingApi.importUrl({ url: link, action: 'preview' });
		if (data.kind === 'chatgpt-share') {
			const selected = new Set(
				(data.messages || []).filter(m => m.selectedDefault !== false).map(m => m.id),
			);
			setPreview({
				kind: 'chatgpt-share',
				title: data.title,
				messages: data.messages || [],
				selected,
			});
			if (!title.trim() && data.title) setTitle(data.title);
			return;
		}
		setPhase(t('import.working'));
		const imported = await aiReadingApi.importUrl({
			url: link,
			title: title || data.title || undefined,
			enhance,
			action: 'import',
		});
		upsertBook(imported.book);
		await flushAiReadingStore();
		router.push(`/ai-studio/read/${imported.book.id}`);
	};

	const importSelected = async () => {
		if (!preview || preview.kind !== 'chatgpt-share') return;
		const ids = [...preview.selected];
		if (!ids.length) throw new Error(t('import.selectOne'));
		setPhase(t('import.working'));
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
		router.push(`/ai-studio/read/${data.book.id}`);
	};

	const submit = async e => {
		e.preventDefault();
		setBusy(true);
		setError('');
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
		try {
			if (mode === 'link') {
				if (preview?.kind === 'chatgpt-share') {
					await importSelected();
				} else {
					await fetchShare();
				}
			} else {
				if (!raw.trim()) throw new Error(t('errors.import'));
				setPhase(t('import.working'));
				const data = await aiReadingApi.import(
					{ raw, title: title || undefined, enhance },
					{ signal: ctrl.signal },
				);
				upsertBook(data.book);
				await flushAiReadingStore();
				router.push(`/ai-studio/read/${data.book.id}`);
			}
		} catch (err) {
			if (err?.name === 'AbortError') {
				setError(t('import.timeout'));
			} else {
				setError(err.message || t('errors.import'));
			}
		} finally {
			clearTimeout(timer);
			setBusy(false);
			setPhase('');
		}
	};

	const toggleMsg = id => {
		setPreview(prev => {
			if (!prev) return prev;
			const selected = new Set(prev.selected);
			if (selected.has(id)) selected.delete(id);
			else selected.add(id);
			return { ...prev, selected };
		});
	};

	const selectAll = () => {
		setPreview(prev => {
			if (!prev) return prev;
			return { ...prev, selected: new Set(prev.messages.map(m => m.id)) };
		});
	};

	const selectAssistants = () => {
		setPreview(prev => {
			if (!prev) return prev;
			return {
				...prev,
				selected: new Set(prev.messages.filter(m => m.role === 'assistant').map(m => m.id)),
			};
		});
	};

	const clearSelection = () => {
		setPreview(prev => (prev ? { ...prev, selected: new Set() } : prev));
	};

	const ctaLabel = () => {
		if (busy) return phase || t('import.working');
		if (mode === 'link' && preview?.kind === 'chatgpt-share') {
			return t('import.importSelected', { count: selectedCount });
		}
		if (mode === 'link') return t('import.fetchMessages');
		if (mode === 'file') return t('import.ctaFile');
		return t('import.cta');
	};

	const submitDisabled =
		busy ||
		(mode === 'paste' && !raw.trim()) ||
		(mode === 'file' && !raw.trim()) ||
		(mode === 'link' && !url.trim()) ||
		(preview?.kind === 'chatgpt-share' && selectedCount === 0);

	return (
		<form onSubmit={submit} className="space-y-6">
			<div>
				<h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight text-[var(--ar-heading)]">
					{t('import.title')}
				</h1>
				<p className="mt-2 text-sm text-[var(--ar-muted)]">{t('import.subtitle')}</p>
			</div>

			<div className="flex flex-wrap gap-2">
				{[
					['paste', t('import.modePaste')],
					['link', t('import.modeLink')],
					['file', t('import.modeFile')],
				].map(([id, label]) => (
					<button
						key={id}
						type="button"
						onClick={() => {
							setMode(id);
							resetPreview();
							setError('');
							if (id !== 'file') clearFile();
						}}
						className={`rounded-full px-4 py-2 text-xs font-semibold ${
							mode === id ? 'bg-[var(--ar-accent)] text-white' : 'bg-white/70 text-[var(--ar-muted)]'
						}`}
					>
						{label}
					</button>
				))}
			</div>

			<label className="block">
				<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('import.optionalTitle')}</span>
				<input
					value={title}
					onChange={e => setTitle(e.target.value)}
					className="w-full rounded-xl border border-[color:var(--ar-border)]/15 bg-white/70 px-3 py-2.5 text-sm outline-none"
					placeholder={t('import.titlePlaceholder')}
				/>
			</label>

			{mode === 'link' ? (
				<div className="space-y-4">
					<label className="block">
						<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('import.linkLabel')}</span>
						<div className="relative">
							<Link2 size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--ar-muted)]" />
							<input
								value={url}
								onChange={e => {
									setUrl(e.target.value);
									resetPreview();
								}}
								required
								placeholder="https://chatgpt.com/share/..."
								className="w-full rounded-2xl border border-[color:var(--ar-border)]/15 bg-white py-3 ps-9 pe-4 text-sm outline-none ring-[var(--ar-accent)]/30 focus:ring-2"
							/>
						</div>
						<p className="mt-2 text-[11px] text-[var(--ar-muted)]">{t('import.linkHintChat')}</p>
					</label>

					{preview?.kind === 'chatgpt-share' && (
						<div className="overflow-hidden rounded-2xl border border-[color:var(--ar-border)]/12 bg-white/80 shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--ar-border)]/10 px-4 py-3">
								<div>
									<p className="text-sm font-bold text-[var(--ar-heading)]">{preview.title}</p>
									<p className="text-[11px] text-[var(--ar-muted)]">
										{t('import.messagesFound', { count: preview.messages.length })} · {t('import.selectedCount', { count: selectedCount })}
									</p>
								</div>
								<div className="flex flex-wrap gap-1.5">
									<button type="button" onClick={selectAll} className="rounded-full bg-[var(--ar-accent)]/[0.06] px-2.5 py-1 text-[10px] font-semibold text-[var(--ar-heading)]">
										{t('import.selectAll')}
									</button>
									<button type="button" onClick={selectAssistants} className="rounded-full bg-[var(--ar-accent)]/[0.06] px-2.5 py-1 text-[10px] font-semibold text-[var(--ar-heading)]">
										{t('import.selectAssistant')}
									</button>
									<button type="button" onClick={clearSelection} className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-[var(--ar-muted)]">
										{t('import.clearSelection')}
									</button>
								</div>
							</div>
							<ul className="max-h-[min(420px,50vh)] space-y-0 divide-y divide-[var(--color-primary-700)]/8 overflow-y-auto">
								{preview.messages.map(m => {
									const on = preview.selected.has(m.id);
									const isUser = m.role === 'user';
									return (
										<li key={m.id}>
											<button
												type="button"
												onClick={() => toggleMsg(m.id)}
												className={`flex w-full items-start gap-3 px-4 py-3 text-start transition ${
													on ? 'bg-[var(--ar-accent)]/[0.08]' : 'hover:bg-[var(--ar-accent)]/[0.03]'
												}`}
											>
												<span className="mt-0.5 text-[var(--ar-accent)]">
													{on ? <CheckSquare size={16} /> : <Square size={16} className="opacity-40" />}
												</span>
												<span
													className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
													style={{ background: isUser ? 'var(--ar-heading)14' : 'var(--ar-accent)18', color: 'var(--ar-heading)' }}
												>
													{isUser ? <User size={12} /> : <Bot size={12} />}
												</span>
												<span className="min-w-0 flex-1">
													<span className="flex items-center gap-2">
														<span className="text-[11px] font-bold uppercase tracking-wide text-[var(--ar-muted)]">
															{isUser ? t('import.roleUser') : t('import.roleAssistant')}
														</span>
														<span className="text-[10px] text-[var(--ar-muted)]">{m.chars} chars</span>
													</span>
													<span className="mt-1 block text-[13px] leading-relaxed text-[var(--ar-heading)] line-clamp-3">
														{m.preview}
													</span>
												</span>
											</button>
										</li>
									);
								})}
							</ul>
							<label className="flex items-center gap-2 border-t border-[color:var(--ar-border)]/10 px-4 py-3 text-xs text-[var(--ar-heading)]">
								<input type="checkbox" checked={includeRoles} onChange={e => setIncludeRoles(e.target.checked)} className="rounded" />
								{t('import.includeRoles')}
							</label>
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
						onChange={onPickFile}
					/>
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						disabled={busy}
						className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[color:var(--ar-border)]/25 bg-white/60 px-6 py-12 text-center transition hover:border-[color:var(--ar-border)]/40 hover:bg-white/80 disabled:opacity-60"
					>
						<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ar-accent)] text-white">
							{busy && phase === t('import.workingExtract') ? (
								<Loader2 size={20} className="animate-spin" />
							) : (
								<FileUp size={20} />
							)}
						</span>
						<span>
							<span className="block text-sm font-bold text-[var(--ar-heading)]">{t('import.fileDrop')}</span>
							<span className="mt-1 block text-xs text-[var(--ar-muted)]">{t('import.fileHint')}</span>
						</span>
					</button>

					{fileName && (
						<div className="flex items-start gap-3 rounded-2xl border border-[color:var(--ar-border)]/12 bg-white/80 px-4 py-3">
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ar-accent)]/15 text-[var(--ar-heading)]">
								<BookOpen size={16} />
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold text-[var(--ar-heading)]">{fileName}</p>
								<p className="mt-0.5 text-[11px] text-[var(--ar-muted)]">
									{fileMeta?.kind === 'pdf'
										? t('import.fileReadyPdf', { pages: fileMeta.pages || 0, chars: raw.length })
										: t('import.fileReadyDocx', { chars: raw.length })}
								</p>
							</div>
							<button type="button" onClick={clearFile} className="text-[11px] font-semibold text-rose-500">
								{t('import.fileClear')}
							</button>
						</div>
					)}

					{raw.trim() && (
						<label className="block">
							<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('import.previewExtract')}</span>
							<textarea
								value={raw}
								onChange={e => setRaw(e.target.value)}
								rows={10}
								className="w-full rounded-2xl border border-[color:var(--ar-border)]/15 bg-white px-4 py-3 font-mono text-[12px] leading-relaxed text-[var(--ar-heading)] outline-none"
							/>
						</label>
					)}
				</div>
			) : (
				<label className="block">
					<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('import.paste')}</span>
					<textarea
						value={raw}
						onChange={e => setRaw(e.target.value)}
						rows={14}
						required
						placeholder={t('import.pastePlaceholder')}
						className="w-full rounded-2xl border border-[color:var(--ar-border)]/15 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-[var(--ar-heading)] outline-none ring-[var(--ar-accent)]/30 focus:ring-2"
					/>
				</label>
			)}

			<div className="flex flex-wrap items-center gap-4">
				<label className="inline-flex items-center gap-2 text-sm text-[var(--ar-heading)]">
					<input type="checkbox" checked={enhance} onChange={e => setEnhance(e.target.checked)} className="rounded" />
					{t('import.enhance')}
				</label>
				{mode === 'paste' && (
					<button type="button" onClick={() => setRaw(SAMPLE)} className="text-xs font-semibold text-[var(--ar-accent)] underline-offset-2 hover:underline">
						{t('import.loadSample')}
					</button>
				)}
			</div>

			{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

			<motion.button
				type="submit"
				disabled={submitDisabled}
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.98 }}
				className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
				style={{ background: 'linear-gradient(135deg, var(--ar-heading), var(--ar-accent))' }}
			>
				{busy ? <Loader2 size={16} className="animate-spin" /> : <Import size={16} />}
				{ctaLabel()}
			</motion.button>
		</form>
	);
}
