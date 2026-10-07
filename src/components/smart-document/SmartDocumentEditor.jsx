'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Bookmark,
	Check,
	CheckSquare,
	Clock3,
	Code2,
	Copy,
	Eye,
	FilePlus2,
	History,
	PanelLeftClose,
	PanelLeftOpen,
	Trash2,
} from 'lucide-react';
import { detectDominantDir } from '@/lib/smart-document/structure';
import MarkdownVisualEditor from './MarkdownVisualEditor';
import TypographyPanel from './TypographyPanel';
import WordLookup, { captureLookup } from './WordLookup';
import { htmlToPlainText, isHtmlSource } from './source-format';
import { FONT_VARIABLE_CLASSES, TYPOGRAPHY_DEFAULTS, normalizeTypography, typographyStyle } from './typography';
import './smart-document.css';

const HISTORY_CAP = 40;
const AUTOSAVE_MS = 900;
const SNAPSHOT_IDLE_MS = 4500;

function uid() {
	return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function titleFromSource(raw) {
	const source = isHtmlSource(raw) ? htmlToPlainText(raw) : String(raw || '');
	const lines = source
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	for (const line of lines) {
		const h = line.match(/^#{1,6}\s+(.+)$/);
		if (h) return h[1].slice(0, 72);
		if (line.length >= 3) return line.replace(/^[*_`>#\-\d.\s]+/, '').slice(0, 72) || line.slice(0, 72);
	}
	return 'Untitled';
}

function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* quota */
	}
}

function formatWhen(ts, labels) {
	if (!ts) return '';
	const d = new Date(ts);
	const now = Date.now();
	const diff = now - d.getTime();
	if (diff < 60_000) return labels.justNow || 'Just now';
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}${labels.minAgo || 'm'}`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}${labels.hourAgo || 'h'}`;
	return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SmartDocumentEditor({
	placeholder = 'Write Markdown…',
	storageKey = 'so7ba:smart-document',
	labels = {},
}) {
	const draftKey = `${storageKey}:draft`;
	const historyKey = `${storageKey}:history`;
	const activeIdKey = `${storageKey}:activeId`;
	const typographyKey = `${storageKey}:typography`;

	const [mode, setMode] = useState('edit'); // edit | preview
	const [text, setText] = useState('');
	const [activeId, setActiveId] = useState(null);
	const [history, setHistory] = useState([]);
	const [historyOpen, setHistoryOpen] = useState(true);
	const [ready, setReady] = useState(false);
	const [savedFlash, setSavedFlash] = useState(false);
	const [docDir, setDocDir] = useState('ltr');
	const [typography, setTypography] = useState(TYPOGRAPHY_DEFAULTS);
	const [docVersion, setDocVersion] = useState(0);
	const [renamingId, setRenamingId] = useState(null);
	const [copiedId, setCopiedId] = useState(null);
	const [renameDraft, setRenameDraft] = useState('');
	const [peek, setPeek] = useState(null);
	const [offer, setOffer] = useState(null);
	const [shelfOpen, setShelfOpen] = useState(false);
	const renameRef = useRef(null);

	const textRef = useRef('');
	const activeIdRef = useRef(null);
	const dirtyRef = useRef(false);
	const lastSnapHashRef = useRef('');
	const saveTimer = useRef(null);
	const snapTimer = useRef(null);
	const taRef = useRef(null);

	const countable = useMemo(() => (isHtmlSource(text) ? htmlToPlainText(text) : text), [text]);
	const wordCount = useMemo(() => {
		const t = countable.trim();
		return t ? t.split(/\s+/).length : 0;
	}, [countable]);
	const charCount = countable.replace(/\s+/g, ' ').trim().length;

	const persistDraft = useCallback(
		(nextText, nextId) => {
			writeJson(draftKey, { content: nextText, updatedAt: Date.now(), id: nextId || null });
			if (nextId) localStorage.setItem(activeIdKey, nextId);
		},
		[draftKey, activeIdKey],
	);

	const upsertHistory = useCallback(
		(content, idHint) => {
			const trimmed = String(content || '');
			if (!trimmed.trim()) return null;
			const hash = trimmed;
			if (hash === lastSnapHashRef.current && idHint && idHint === activeIdRef.current) {
				return idHint;
			}

			const now = Date.now();
			let nextId = idHint || activeIdRef.current || uid();

			setHistory((prev) => {
				const list = Array.isArray(prev) ? [...prev] : [];
				const existing = list.find((h) => h.id === nextId);
				const title = existing?.titleLocked && existing.title ? existing.title : titleFromSource(trimmed);
				const entry = {
					id: nextId,
					title,
					titleLocked: Boolean(existing?.titleLocked),
					content: trimmed,
					updatedAt: now,
				};
				const without = list.filter((h) => h.id !== nextId);
				without.unshift(entry);
				const capped = without.slice(0, HISTORY_CAP);
				writeJson(historyKey, capped);
				return capped;
			});

			lastSnapHashRef.current = hash;
			activeIdRef.current = nextId;
			setActiveId(nextId);
			localStorage.setItem(activeIdKey, nextId);
			persistDraft(trimmed, nextId);

			setSavedFlash(true);
			window.setTimeout(() => setSavedFlash(false), 1200);
			return nextId;
		},
		[historyKey, activeIdKey, persistDraft],
	);

	/* Load once */
	useEffect(() => {
		const draft = readJson(draftKey, null);
		const hist = readJson(historyKey, []);
		const savedId = localStorage.getItem(activeIdKey);
		const list = Array.isArray(hist) ? hist : [];
		setHistory(list);

		let initial = '';
		let id = null;
		if (draft?.content != null) {
			initial = String(draft.content);
			id = draft.id || savedId || null;
		} else if (savedId && list.length) {
			const found = list.find((h) => h.id === savedId);
			if (found) {
				initial = found.content;
				id = found.id;
			}
		} else if (list[0]) {
			initial = list[0].content;
			id = list[0].id;
		}

		textRef.current = initial;
		activeIdRef.current = id;
		lastSnapHashRef.current = initial.trim() ? initial : '';
		setText(initial);
		setActiveId(id);
		setDocDir(detectDominantDir(initial));
		setTypography(normalizeTypography(readJson(typographyKey, null)));
		setReady(true);
	}, [draftKey, historyKey, activeIdKey, typographyKey]);

	const updateTypography = useCallback(
		(next) => {
			const normalized = normalizeTypography(next);
			setTypography(normalized);
			writeJson(typographyKey, normalized);
		},
		[typographyKey],
	);

	const shellStyle = useMemo(() => typographyStyle(typography), [typography]);

	const scheduleAutosave = useCallback(
		(next) => {
			dirtyRef.current = true;
			if (saveTimer.current) clearTimeout(saveTimer.current);
			saveTimer.current = setTimeout(() => {
				persistDraft(next, activeIdRef.current);
			}, AUTOSAVE_MS);

			if (snapTimer.current) clearTimeout(snapTimer.current);
			snapTimer.current = setTimeout(() => {
				if (!dirtyRef.current) return;
				upsertHistory(next, activeIdRef.current);
				dirtyRef.current = false;
			}, SNAPSHOT_IDLE_MS);
		},
		[persistDraft, upsertHistory],
	);

	const applyText = useCallback(
		(next) => {
			textRef.current = next;
			setText(next);
			setDocDir(detectDominantDir(next));
			scheduleAutosave(next);
		},
		[scheduleAutosave],
	);

	const onChange = (e) => applyText(e.target.value);

	const flushSave = useCallback(() => {
		const current = textRef.current;
		persistDraft(current, activeIdRef.current);
		if (current.trim()) {
			upsertHistory(current, activeIdRef.current);
			dirtyRef.current = false;
		}
	}, [persistDraft, upsertHistory]);

	useEffect(() => {
		const onHide = () => {
			if (document.visibilityState === 'hidden') flushSave();
		};
		const onUnload = () => flushSave();
		document.addEventListener('visibilitychange', onHide);
		window.addEventListener('beforeunload', onUnload);
		window.addEventListener('pagehide', onUnload);
		return () => {
			document.removeEventListener('visibilitychange', onHide);
			window.removeEventListener('beforeunload', onUnload);
			window.removeEventListener('pagehide', onUnload);
			if (saveTimer.current) clearTimeout(saveTimer.current);
			if (snapTimer.current) clearTimeout(snapTimer.current);
			flushSave();
		};
	}, [flushSave]);

	const openHistoryItem = (item) => {
		flushSave();
		textRef.current = item.content;
		activeIdRef.current = item.id;
		lastSnapHashRef.current = item.content;
		setText(item.content);
		setActiveId(item.id);
		setDocDir(detectDominantDir(item.content));
		persistDraft(item.content, item.id);
		setDocVersion((v) => v + 1);
		if (mode === 'edit') requestAnimationFrame(() => taRef.current?.focus());
	};

	const newDocument = () => {
		flushSave();
		const id = uid();
		textRef.current = '';
		activeIdRef.current = id;
		lastSnapHashRef.current = '';
		dirtyRef.current = false;
		setText('');
		setActiveId(id);
		persistDraft('', id);
		setDocVersion((v) => v + 1);
		if (mode === 'edit') requestAnimationFrame(() => taRef.current?.focus());
	};

	const copyHistoryItem = async (item, e) => {
		e?.preventDefault?.();
		e?.stopPropagation?.();
		const raw = String(item?.content || '');
		const plain = isHtmlSource(raw) ? htmlToPlainText(raw) : raw;
		try {
			await navigator.clipboard.writeText(plain);
			setCopiedId(item.id);
			window.setTimeout(() => setCopiedId(current => (current === item.id ? null : current)), 1200);
		} catch {
			/* clipboard blocked */
		}
	};

	const deleteHistoryItem = (id, e) => {
		e?.stopPropagation?.();
		setHistory((prev) => {
			const next = (prev || []).filter((h) => h.id !== id);
			writeJson(historyKey, next);
			return next;
		});
		if (renamingId === id) {
			setRenamingId(null);
			setRenameDraft('');
		}
		if (activeIdRef.current === id) newDocument();
	};

	const startRename = (item, e) => {
		e?.preventDefault?.();
		e?.stopPropagation?.();
		setRenamingId(item.id);
		setRenameDraft(item.title || '');
		requestAnimationFrame(() => {
			renameRef.current?.focus();
			renameRef.current?.select();
		});
	};

	const commitRename = () => {
		const id = renamingId;
		if (!id) return;
		const nextTitle = renameDraft.trim().slice(0, 72);
		setRenamingId(null);
		setRenameDraft('');
		if (!nextTitle) return;
		setHistory((prev) => {
			const next = (prev || []).map((h) =>
				h.id === id ? { ...h, title: nextTitle, titleLocked: true, updatedAt: Date.now() } : h,
			);
			writeJson(historyKey, next);
			return next;
		});
	};

	const cancelRename = () => {
		setRenamingId(null);
		setRenameDraft('');
	};

	const takeSelection = (host, point, open) => {
		const hit = captureLookup(host);
		if (!hit?.word) {
			if (!open) setOffer(null);
			return;
		}
		const rect = hit.rect;
		const anchor = rect && (rect.width || rect.height)
			? { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom }
			: { x: point.x, top: point.y, bottom: point.y };
		const payload = { word: hit.word, sentence: hit.sentence || '', ...anchor, at: Date.now() };
		if (open) {
			setOffer(null);
			setPeek(payload);
			return;
		}
		setOffer(payload);
	};

	if (!ready) {
		return (
			<div className={`sd-shell sd-shell--md ${FONT_VARIABLE_CLASSES}`}>
				<div className="sd-loading">{labels.loading || 'Loading editor…'}</div>
			</div>
		);
	}

	return (
		<div
			className={`sd-shell sd-shell--md is-ready ${FONT_VARIABLE_CLASSES} ${historyOpen ? 'has-history' : ''}`}
			dir={docDir}
			style={shellStyle}
		>
			<aside className={`sd-history ${historyOpen ? 'is-open' : ''}`} aria-label={labels.history || 'History'}>
				<div className="sd-history-head">
					<span className="sd-history-title">
						<History size={14} strokeWidth={2.2} />
						{labels.history || 'History'}
					</span>
					<button type="button" className="sd-icon-btn" onClick={newDocument} title={labels.newDoc || 'New document'}>
						<FilePlus2 size={14} />
					</button>
				</div>
				<ul className="sd-history-list">
					{!history.length && (
						<li className="sd-history-empty">{labels.historyEmpty || 'Autosaved drafts appear here.'}</li>
					)}
					{history.map((item) => (
						<li key={item.id}>
							<div className={`sd-history-item ${item.id === activeId ? 'is-active' : ''}`}>
								<div className="sd-history-item-main">
									{renamingId === item.id ? (
										<input
											ref={renameRef}
											className="sd-history-rename"
											value={renameDraft}
											maxLength={72}
											aria-label={labels.rename || 'Rename'}
											onChange={(e) => setRenameDraft(e.target.value)}
											onClick={(e) => e.stopPropagation()}
											onBlur={commitRename}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													commitRename();
												} else if (e.key === 'Escape') {
													e.preventDefault();
													cancelRename();
												}
											}}
										/>
									) : (
										<button
											type="button"
											className="sd-history-item-title"
											title={labels.renameHint || 'Click to rename'}
											onClick={(e) => startRename(item, e)}
										>
											{item.title || labels.untitled || 'Untitled'}
										</button>
									)}
									<button
										type="button"
										className="sd-history-item-open"
										onClick={() => openHistoryItem(item)}
									>
										<span className="sd-history-item-meta">
											<Clock3 size={11} />
											{formatWhen(item.updatedAt, labels)}
										</span>
									</button>
								</div>
								<div className="sd-history-actions">
									<button
										type="button"
										className="sd-history-del"
										title={labels.delete || 'Delete'}
										onClick={(e) => deleteHistoryItem(item.id, e)}
									>
										<Trash2 size={12} />
									</button>
									<button
										type="button"
										className="sd-history-copy"
										title={labels.copy || 'Copy text'}
										onClick={(e) => copyHistoryItem(item, e)}
									>
										{copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
									</button>
								</div>
							</div>
						</li>
					))}
				</ul>
			</aside>

			<div className="sd-main">
				<header className="sd-chrome">
					<div className="sd-chrome-lead">
						<button
							type="button"
							className="sd-icon-btn"
							onClick={() => setHistoryOpen((v) => !v)}
							title={historyOpen ? labels.hideHistory || 'Hide history' : labels.showHistory || 'Show history'}
						>
							{historyOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
						</button>
						<span className="sd-badge">
							<CheckSquare size={12} strokeWidth={2.2} />
							{labels.badge || 'Document'}
						</span>
					</div>

					<div className="sd-chrome-actions">
						<button
							type="button"
							className={`sd-icon-btn sd-lookup-launch${shelfOpen ? ' is-open' : ''}`}
							title={labels.shelfButton || 'Review words'}
							onClick={() => setShelfOpen((v) => !v)}
						>
							<Bookmark size={15} />
						</button>
						<TypographyPanel settings={typography} onChange={updateTypography} labels={labels} />
						<div className="sd-seg" role="tablist" aria-label={labels.modeLabel || 'Mode'}>
							<button
								type="button"
								role="tab"
								aria-selected={mode === 'edit'}
								className={mode === 'edit' ? 'is-active' : ''}
								onClick={() => setMode('edit')}
							>
								<Code2 size={13} />
								{labels.edit || 'Edit'}
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={mode === 'preview'}
								className={mode === 'preview' ? 'is-active' : ''}
								onClick={() => {
									flushSave();
									setDocVersion((v) => v + 1);
									setMode('preview');
								}}
							>
								<Eye size={13} />
								{labels.preview || 'Preview'}
							</button>
						</div>

						<div className="sd-stats" aria-live="polite">
							{savedFlash ? <span className="sd-saved">{labels.saved || 'Saved'}</span> : null}
							<span>
								{wordCount} {labels.words || 'words'}
							</span>
							<span className="sd-dot" />
							<span>
								{charCount} {labels.chars || 'chars'}
							</span>
						</div>
					</div>
				</header>

				<div
					className={`sd-canvas sd-canvas--bleed ${mode === 'edit' ? 'is-source' : 'is-preview'}`}
					onMouseUp={(e) => {
						if (e.detail >= 2) return;
						if (e.target.closest('button, a, input, label, .sd-lookup-pin')) return;
						const host = e.currentTarget;
						const point = { x: e.clientX, y: e.clientY };
						window.setTimeout(() => takeSelection(host, point, false), 0);
					}}
					onDoubleClick={(e) => {
						if (e.target.closest('button, a, input, label')) return;
						const host = e.currentTarget;
						const point = { x: e.clientX, y: e.clientY };
						window.setTimeout(() => takeSelection(host, point, true), 30);
					}}
				>
					{mode === 'edit' ? (
						<textarea
							ref={taRef}
							className="sd-markdown-source"
							value={text}
							onChange={onChange}
							onBlur={flushSave}
							placeholder={placeholder}
							spellCheck
							dir={docDir}
						/>
					) : (
						<MarkdownVisualEditor
							key={docVersion}
							markdown={text}
							onChange={applyText}
							onBlur={flushSave}
							placeholder={labels.previewEmpty || 'Start writing here…'}
							dir={docDir}
							autoFocus={!text.trim()}
						/>
					)}
				</div>
			</div>
			<WordLookup
				labels={labels}
				peek={peek}
				onClosePeek={() => setPeek(null)}
				offer={offer}
				onOpenOffer={(payload) => {
					setOffer(null);
					setPeek(payload);
				}}
				onClearOffer={() => setOffer(null)}
				shelfOpen={shelfOpen}
				onShelfOpen={setShelfOpen}
			/>
		</div>
	);
}
