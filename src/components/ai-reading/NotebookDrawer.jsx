'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CloudOff, Loader2, NotebookPen, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { THEME_STYLES } from '@/lib/ai-reading/themes';
import { uid } from '@/lib/ai-reading/schemas';
import {
	getNotebookNotes,
	getNotebookStatus,
	hydrateAiReadingStore,
	saveNotebookNotes,
} from '@/lib/ai-reading/storage';

function useNotebook() {
	const [notes, setNotes] = useState(getNotebookNotes);
	const [status, setStatus] = useState(getNotebookStatus);

	useEffect(() => {
		hydrateAiReadingStore();
		const sync = () => {
			setNotes(getNotebookNotes());
			setStatus(getNotebookStatus());
		};
		sync();
		window.addEventListener('ai-reading:notebook', sync);
		return () => window.removeEventListener('ai-reading:notebook', sync);
	}, []);

	return { notes, status };
}

function AutoTextarea({ value, onChange, onKeyDown, onBlur, placeholder, autoFocus, className, style, textareaRef }) {
	const innerRef = useRef(null);
	const ref = textareaRef || innerRef;

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}, [value, ref]);

	return (
		<textarea
			ref={ref}
			dir="auto"
			rows={1}
			value={value}
			autoFocus={autoFocus}
			placeholder={placeholder}
			onChange={onChange}
			onKeyDown={onKeyDown}
			onBlur={onBlur}
			className={`block w-full resize-none bg-transparent outline-none ${className || ''}`}
			style={style}
		/>
	);
}

function SaveBadge({ status, t, theme }) {
	if (status === 'saving' || status === 'pending') {
		return (
			<span className="inline-flex items-center gap-1 text-[11px]" style={{ color: theme.muted }}>
				<Loader2 size={11} className="animate-spin" />
				{t('notebook.saving')}
			</span>
		);
	}
	if (status === 'error') {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] text-red-500">
				<CloudOff size={11} />
				{t('notebook.saveError')}
			</span>
		);
	}
	if (status === 'saved') {
		return (
			<span className="inline-flex items-center gap-1 text-[11px]" style={{ color: theme.muted }}>
				<Check size={11} />
				{t('notebook.saved')}
			</span>
		);
	}
	return null;
}

/**
 * Side notebook for "topics to look up later". Autosaves to the DB on typing pause
 * and immediately on space / Enter. Usable inside the reader and from Studio.
 */
export default function NotebookDrawer({ open, onClose, theme: themeProp, isRTL = false, book = null, fontFamily }) {
	const t = useTranslations('aiReading');
	const theme = themeProp || THEME_STYLES.light;
	const { notes, status } = useNotebook();
	const [draft, setDraft] = useState('');
	const [draftId, setDraftId] = useState(null);
	const composerRef = useRef(null);

	useEffect(() => {
		if (!open) return;
		const onKey = e => {
			if (e.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	useEffect(() => {
		if (!open) {
			setDraft('');
			setDraftId(null);
		}
	}, [open]);

	const sorted = useMemo(
		() => notes.filter(n => n.id !== draftId).sort((a, b) => Number(a.done) - Number(b.done)),
		[notes, draftId],
	);
	const openCount = notes.filter(n => !n.done && n.text.trim()).length;

	const commit = (next, text) => {
		const lastChar = text?.slice(-1);
		saveNotebookNotes(next, { immediate: lastChar === ' ' || lastChar === '\n' });
	};

	const updateNote = (id, patch) => {
		const next = getNotebookNotes().map(n =>
			n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
		);
		commit(next, patch.text);
	};

	const removeNote = id => {
		saveNotebookNotes(
			getNotebookNotes().filter(n => n.id !== id),
			{ immediate: true },
		);
	};

	const onDraftChange = e => {
		const text = e.target.value;
		setDraft(text);
		const now = new Date().toISOString();
		if (!draftId) {
			if (!text.trim()) return;
			const id = uid();
			setDraftId(id);
			commit(
				[
					{
						id,
						text,
						done: false,
						bookId: book?.id || null,
						bookTitle: book?.title || null,
						createdAt: now,
						updatedAt: now,
					},
					...getNotebookNotes(),
				],
				text,
			);
			return;
		}
		updateNote(draftId, { text });
	};

	const finishDraft = () => {
		if (draftId) saveNotebookNotes(getNotebookNotes(), { immediate: true });
		setDraft('');
		setDraftId(null);
	};

	const onDraftKeyDown = e => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault();
			if (draft.trim()) finishDraft();
		}
	};

	const fmtDate = iso => {
		try {
			return new Date(iso).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
		} catch {
			return '';
		}
	};

	const softBorder = `color-mix(in srgb, ${theme.ink} 9%, transparent)`;

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.button
						key="notebook-backdrop"
						type="button"
						aria-label={t('notebook.close')}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[58] bg-black/30 backdrop-blur-[1px]"
						onClick={onClose}
					/>
					<motion.aside
						key="notebook-panel"
						role="dialog"
						aria-label={t('notebook.title')}
						dir={isRTL ? 'rtl' : 'ltr'}
						initial={{ opacity: 0, x: isRTL ? -28 : 28 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: isRTL ? -28 : 28 }}
						transition={{ type: 'spring', stiffness: 380, damping: 34 }}
						className="fixed inset-y-0 z-[60] flex w-full max-w-[min(100vw,26rem)] flex-col shadow-2xl"
						style={{
							[isRTL ? 'left' : 'right']: 0,
							background: theme.paper,
							color: theme.ink,
							borderInlineStart: `1px solid ${softBorder}`,
							fontFamily,
						}}
					>
						<header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
										style={{
											background: `color-mix(in srgb, ${theme.accent} 14%, transparent)`,
											color: theme.accent,
										}}
									>
										<NotebookPen size={16} />
									</span>
									<h2 className="text-base font-bold">{t('notebook.title')}</h2>
									{openCount > 0 && (
										<span
											className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
											style={{
												background: `color-mix(in srgb, ${theme.ink} 7%, transparent)`,
												color: theme.muted,
											}}
										>
											{openCount}
										</span>
									)}
								</div>
								<p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.muted }}>
									{t('notebook.subtitle')}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<SaveBadge status={status} t={t} theme={theme} />
								<button
									type="button"
									onClick={onClose}
									aria-label={t('notebook.close')}
									className="rounded-full p-1.5 transition-colors hover:bg-black/5"
								>
									<X size={16} />
								</button>
							</div>
						</header>

						<div className="px-5 pb-3">
							<div
								className="rounded-xl px-3.5 py-3 transition-shadow focus-within:shadow-[0_0_0_2px_var(--nb-ring)]"
								style={{
									'--nb-ring': `color-mix(in srgb, ${theme.accent} 35%, transparent)`,
									background: `color-mix(in srgb, ${theme.ink} 4%, ${theme.paper})`,
									border: `1px solid ${softBorder}`,
								}}
							>
								<AutoTextarea
									textareaRef={composerRef}
									value={draft}
									autoFocus
									onChange={onDraftChange}
									onKeyDown={onDraftKeyDown}
									onBlur={() => draft.trim() && finishDraft()}
									placeholder={t('notebook.placeholder')}
									className="max-h-48 text-sm leading-relaxed"
								/>
								<div className="mt-2 flex items-center justify-between gap-2 text-[11px]" style={{ color: theme.muted }}>
									<span className="truncate">
										{book?.title ? t('notebook.fromBook', { title: book.title }) : t('notebook.autosaveHint')}
									</span>
									<button
										type="button"
										disabled={!draft.trim()}
										onClick={() => {
											finishDraft();
											composerRef.current?.focus();
										}}
										className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-semibold transition-opacity disabled:opacity-40"
										style={{ color: theme.accent }}
									>
										<Plus size={12} />
										{t('notebook.newNote')}
									</button>
								</div>
							</div>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6" data-lenis-prevent>
							{sorted.length === 0 && !draftId ? (
								<div className="flex flex-col items-center px-6 py-12 text-center" style={{ color: theme.muted }}>
									<NotebookPen size={28} className="mb-3 opacity-40" />
									<p className="text-sm">{t('notebook.empty')}</p>
								</div>
							) : (
								<ul className="space-y-2">
									{sorted.map(note => (
										<li
											key={note.id}
											className="group rounded-xl px-3.5 py-2.5 transition-colors"
											style={{
												border: `1px solid ${softBorder}`,
												opacity: note.done ? 0.6 : 1,
											}}
										>
											<div className="flex items-start gap-2.5">
												<button
													type="button"
													onClick={() => updateNote(note.id, { done: !note.done })}
													aria-label={note.done ? t('notebook.reopen') : t('notebook.markDone')}
													title={note.done ? t('notebook.reopen') : t('notebook.markDone')}
													className="mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-colors"
													style={{
														borderColor: note.done ? theme.accent : `color-mix(in srgb, ${theme.ink} 25%, transparent)`,
														background: note.done ? theme.accent : 'transparent',
														color: theme.paper,
													}}
												>
													{note.done && <Check size={11} strokeWidth={3} />}
												</button>
												<div className="min-w-0 flex-1">
													<AutoTextarea
														value={note.text}
														onChange={e => updateNote(note.id, { text: e.target.value })}
														onBlur={() => !note.text.trim() && removeNote(note.id)}
														className={`text-sm leading-relaxed ${note.done ? 'line-through' : ''}`}
													/>
													<div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: theme.muted }}>
														{note.bookTitle && <span className="truncate">{note.bookTitle}</span>}
														{note.bookTitle && <span aria-hidden>·</span>}
														<span className="shrink-0">{fmtDate(note.createdAt)}</span>
													</div>
												</div>
												<div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
													{note.done && (
														<button
															type="button"
															onClick={() => updateNote(note.id, { done: false })}
															aria-label={t('notebook.reopen')}
															className="rounded-md p-1 hover:bg-black/5"
														>
															<RotateCcw size={13} />
														</button>
													)}
													<button
														type="button"
														onClick={() => removeNote(note.id)}
														aria-label={t('notebook.delete')}
														className="rounded-md p-1 text-red-500/80 hover:bg-red-500/10"
													>
														<Trash2 size={13} />
													</button>
												</div>
											</div>
										</li>
									))}
								</ul>
							)}
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
}
