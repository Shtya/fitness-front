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
	FileDown,
	FilePlus2,
	History,
	Link2,
	Loader2,
	PanelLeftClose,
	PanelLeftOpen,
	Share2,
	Trash2,
	Users,
	X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocale } from 'next-intl';
import api from '@/utils/axios';
import { detectDominantDir } from '@/lib/smart-document/structure';
import MarkdownVisualEditor from './MarkdownVisualEditor';
import TypographyPanel from './TypographyPanel';
import WordLookup, { captureLookup } from './WordLookup';
import { downloadWordDocument } from './export-document';
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

function formatVisitTime(visit, locale) {
	const stamp = typeof visit?.stamp === 'string' ? visit.stamp : '';
	if (stamp && !/^\d{4}-\d{2}-\d{2}T/.test(stamp)) return stamp;
	const raw = visit?.at || stamp;
	if (!raw) return '—';
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return String(raw);
	try {
		return d.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
			timeZone: 'Africa/Cairo',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		});
	} catch {
		return d.toISOString();
	}
}

function visitLocationLabel(visit, labels) {
	const loc = String(visit?.location || '').trim();
	if (loc) {
		if (/local network/i.test(loc)) {
			return labels.shareVisitLocal || 'Local network (this device / LAN)';
		}
		return loc;
	}
	const ip = String(visit?.ip || '');
	if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
		return labels.shareVisitLocal || 'Local network (this device / LAN)';
	}
	return labels.shareVisitUnknownLocation || 'Unknown location';
}

function visitBrowserLine(visit, labels) {
	const parts = [visit?.browser, visit?.os, visit?.device].filter(Boolean);
	if (parts.length) return parts.join(' · ');
	return labels.shareVisitUnknownBrowser || 'Unknown browser';
}

function visitDeviceLine(visit) {
	return [visit?.platform, visit?.screen, visit?.timezone, visit?.language].filter(Boolean).join(' · ');
}

export default function SmartDocumentEditor({
	placeholder = 'Write Markdown…',
	storageKey = 'so7ba:smart-document',
	labels = {},
}) {
	const locale = useLocale();
	const draftKey = `${storageKey}:draft`;
	const historyKey = `${storageKey}:history`;
	const activeIdKey = `${storageKey}:activeId`;
	const typographyKey = `${storageKey}:typography`;
	const sharesKey = `${storageKey}:shares`;

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
	const [shareTokens, setShareTokens] = useState({});
	const [sharing, setSharing] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [shareCopied, setShareCopied] = useState(false);
	const [visitsOpen, setVisitsOpen] = useState(false);
	const [visitsLoading, setVisitsLoading] = useState(false);
	const [visitRows, setVisitRows] = useState([]);
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
	const readMins = wordCount === 0 ? 0 : Math.max(1, Math.round(wordCount / 180));
	const countFmt = useMemo(
		() => new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US'),
		[locale],
	);
	const activeDoc = useMemo(
		() => (activeId ? history.find((h) => h.id === activeId) || null : null),
		[activeId, history],
	);
	const chromeTitle =
		activeDoc?.title || titleFromSource(text) || labels.untitled || 'Untitled';
	const uiDir = locale === 'ar' ? 'rtl' : 'ltr';

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
		setShareTokens(readJson(sharesKey, {}) || {});
		setReady(true);
	}, [draftKey, historyKey, activeIdKey, typographyKey, sharesKey]);

	const activeShareToken = activeId ? shareTokens[activeId] || null : null;

	const rememberShareToken = useCallback(
		(docId, token) => {
			if (!docId || !token) return;
			setShareTokens((prev) => {
				const next = { ...(prev || {}), [docId]: token };
				writeJson(sharesKey, next);
				return next;
			});
		},
		[sharesKey],
	);

	const buildShareUrl = useCallback(
		(token) => {
			if (typeof window === 'undefined' || !token) return '';
			return `${window.location.origin}/${locale}/d/${token}`;
		},
		[locale],
	);

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

	const shareActiveDocument = useCallback(async () => {
		if (sharing) return;
		flushSave();
		const content = String(textRef.current || '');
		if (!content.trim()) {
			toast.error(labels.shareEmpty || 'Write something before sharing');
			return;
		}
		let docId = activeIdRef.current;
		if (!docId) {
			docId = upsertHistory(content, null) || uid();
			activeIdRef.current = docId;
			setActiveId(docId);
		}
		const title =
			history.find((h) => h.id === docId)?.title || titleFromSource(content) || labels.untitled || 'Untitled';
		setSharing(true);
		try {
			const { data } = await api.post('/smart-documents/shares', {
				localDocId: docId,
				title,
				content,
				typography,
				token: shareTokens[docId] || null,
			});
			const token = String(data?.token || '');
			if (!token) throw new Error('no-token');
			rememberShareToken(docId, token);
			const url = buildShareUrl(token);
			try {
				await navigator.clipboard.writeText(url);
				setShareCopied(true);
				window.setTimeout(() => setShareCopied(false), 1600);
				toast.success(labels.shareCopied || 'Share link copied');
			} catch {
				toast.success(labels.shareReady || 'Share link ready');
				window.prompt(labels.shareCopyHint || 'Copy this link', url);
			}
		} catch {
			toast.error(labels.shareFailed || 'Could not create share link');
		} finally {
			setSharing(false);
		}
	}, [
		sharing,
		flushSave,
		upsertHistory,
		history,
		labels,
		typography,
		shareTokens,
		rememberShareToken,
		buildShareUrl,
	]);

	const copyExistingShareLink = useCallback(async () => {
		if (!activeShareToken) {
			void shareActiveDocument();
			return;
		}
		const url = buildShareUrl(activeShareToken);
		try {
			await navigator.clipboard.writeText(url);
			setShareCopied(true);
			window.setTimeout(() => setShareCopied(false), 1600);
			toast.success(labels.shareCopied || 'Share link copied');
		} catch {
			window.prompt(labels.shareCopyHint || 'Copy this link', url);
		}
	}, [activeShareToken, buildShareUrl, labels, shareActiveDocument]);

	const loadVisits = useCallback(async () => {
		if (!activeShareToken) {
			toast.error(labels.shareVisitsNeedShare || 'Share the document first');
			return;
		}
		setVisitsOpen(true);
		setVisitsLoading(true);
		try {
			const { data } = await api.get(
				`/smart-documents/shares/${encodeURIComponent(activeShareToken)}/visits`,
			);
			setVisitRows(Array.isArray(data?.visits) ? data.visits : []);
		} catch {
			toast.error(labels.shareVisitsFailed || 'Could not load visitors');
			setVisitRows([]);
		} finally {
			setVisitsLoading(false);
		}
	}, [activeShareToken, labels]);

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

	const exportActiveDocument = useCallback(async () => {
		flushSave();
		const content = String(textRef.current || '');
		if (!content.trim()) {
			toast.error(labels.exportEmpty || 'Write something before exporting');
			return;
		}
		const title =
			history.find((h) => h.id === activeIdRef.current)?.title ||
			titleFromSource(content) ||
			labels.untitled ||
			'Untitled';
		setExporting(true);
		try {
			// Prefer the live preview DOM when open — keeps tables/formatting as seen.
			let bodyHtml = '';
			if (mode === 'preview' && typeof document !== 'undefined') {
				const preview = document.querySelector('.sd-markdown-preview .ProseMirror, .sd-markdown-preview .sd-md');
				if (preview?.innerHTML?.trim()) bodyHtml = preview.innerHTML;
			}
			await Promise.resolve(
				downloadWordDocument({
					title,
					source: content,
					bodyHtml: bodyHtml || undefined,
					dir: docDir,
					typography,
				}),
			);
			toast.success(labels.exportDone || 'Document downloaded');
		} catch (error) {
			if (error?.code === 'empty') {
				toast.error(labels.exportEmpty || 'Write something before exporting');
			} else {
				toast.error(labels.exportFailed || 'Could not export document');
			}
		} finally {
			setExporting(false);
		}
	}, [docDir, flushSave, history, labels, mode, typography]);

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
			if (!open) setOffer((prev) => (prev ? null : prev));
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

	const keepEditorFocus = (host, prior) => {
		if (!(prior instanceof HTMLElement) || !host?.contains(prior)) return;
		if (document.activeElement !== prior) prior.focus({ preventScroll: true });
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
				<header className="sd-chrome sd-chrome--editor" dir={uiDir}>
					<div className="sd-chrome-lead">
						<button
							type="button"
							className={`sd-tool-btn sd-chrome-history${historyOpen ? ' is-open' : ''}`}
							onClick={() => setHistoryOpen((v) => !v)}
							title={historyOpen ? labels.hideHistory || 'Hide history' : labels.showHistory || 'Show history'}
							aria-pressed={historyOpen}
						>
							{historyOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
						</button>
						<div className="sd-chrome-identity">
							<span className="sd-chrome-kicker">
								<CheckSquare size={11} strokeWidth={2.4} />
								{labels.badge || 'Document'}
								{savedFlash ? <span className="sd-saved">{labels.saved || 'Saved'}</span> : null}
							</span>
							{renamingId && renamingId === activeId ? (
								<input
									ref={renameRef}
									className="sd-chrome-title-input"
									value={renameDraft}
									onChange={(e) => setRenameDraft(e.target.value)}
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
									aria-label={labels.rename || 'Rename'}
								/>
							) : (
								<button
									type="button"
									className="sd-chrome-title"
									title={activeDoc ? labels.renameHint || 'Click to rename' : chromeTitle}
									onClick={(e) => {
										if (activeDoc) startRename(activeDoc, e);
									}}
								>
									{chromeTitle}
								</button>
							)}
						</div>
					</div>

					<div className="sd-chrome-meter">
						<div className="sd-seg" role="tablist" aria-label={labels.modeLabel || 'Mode'}>
							<button
								type="button"
								role="tab"
								aria-selected={mode === 'edit'}
								className={mode === 'edit' ? 'is-active' : ''}
								onClick={() => setMode('edit')}
							>
								<Code2 size={14} />
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
								<Eye size={14} />
								{labels.preview || 'Preview'}
							</button>
						</div>
						<div className="sd-stats" aria-live="polite">
							<span className="sd-stat">
								<b>{countFmt.format(wordCount)}</b>
								<small>{labels.words || 'words'}</small>
							</span>
							<span className="sd-stat">
								<b>{countFmt.format(charCount)}</b>
								<small>{labels.chars || 'chars'}</small>
							</span>
							<span className="sd-stat">
								<b>{countFmt.format(readMins)}</b>
								<small>{labels.readMins || 'min'}</small>
							</span>
						</div>
					</div>

					<div className="sd-chrome-actions">
						<div className="sd-tool-group" role="group" aria-label={labels.typography || 'Typography'}>
							<TypographyPanel
								settings={typography}
								onChange={updateTypography}
								labels={labels}
								triggerLabel={labels.typeShort || labels.typography || 'Type'}
							/>
							<button
								type="button"
								className={`sd-tool-btn sd-lookup-launch${shelfOpen ? ' is-open' : ''}`}
								title={labels.shelfButton || 'Review words'}
								onClick={() => setShelfOpen((v) => !v)}
							>
								<Bookmark size={15} />
								<span className="sd-tool-label">{labels.reviewShort || labels.shelfButton || 'Review'}</span>
							</button>
						</div>
						<div className="sd-tool-group" role="group">
							<button
								type="button"
								className={`sd-tool-btn sd-share-btn${activeShareToken ? ' is-live' : ''}${shareCopied ? ' is-copied' : ''}`}
								title={
									activeShareToken
										? labels.shareAgain || 'Copy share link (updates the live doc)'
										: labels.share || 'Share document'
								}
								disabled={sharing}
								onClick={() => void shareActiveDocument()}
								onContextMenu={(e) => {
									e.preventDefault();
									void copyExistingShareLink();
								}}
							>
								{sharing ? (
									<Loader2 size={15} className="animate-spin" />
								) : shareCopied ? (
									<Check size={15} />
								) : activeShareToken ? (
									<Link2 size={15} />
								) : (
									<Share2 size={15} />
								)}
								<span className="sd-tool-label">
									{activeShareToken
										? labels.shareLive || labels.shareShort || 'Live'
										: labels.shareShort || 'Share'}
								</span>
							</button>
							{activeShareToken ? (
								<button
									type="button"
									className={`sd-tool-btn${visitsOpen ? ' is-open' : ''}`}
									title={labels.shareVisitors || 'Who opened this link'}
									onClick={() => void loadVisits()}
								>
									<Users size={15} />
								</button>
							) : null}
						</div>
						<button
							type="button"
							className="sd-tool-btn sd-export-btn"
							title={labels.export || 'Export as Word document'}
							disabled={exporting}
							onClick={() => void exportActiveDocument()}
						>
							{exporting ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<FileDown size={15} />
							)}
							<span className="sd-export-label">{labels.exportShort || labels.export || 'Export'}</span>
						</button>
					</div>
				</header>

				<div
					className={`sd-canvas sd-canvas--bleed ${mode === 'edit' ? 'is-source' : 'is-preview'}`}
					onMouseUp={(e) => {
						if (e.detail >= 2) return;
						if (e.target.closest('button, a, input, label, .sd-lookup-pin')) return;
						const host = e.currentTarget;
						const point = { x: e.clientX, y: e.clientY };
						const prior = document.activeElement;
						window.setTimeout(() => {
							takeSelection(host, point, false);
							keepEditorFocus(host, prior);
						}, 0);
					}}
					onDoubleClick={(e) => {
						if (e.target.closest('button, a, input, label')) return;
						const host = e.currentTarget;
						const point = { x: e.clientX, y: e.clientY };
						const prior = document.activeElement;
						window.setTimeout(() => {
							takeSelection(host, point, true);
							keepEditorFocus(host, prior);
						}, 30);
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

			{visitsOpen ? (
				<div className="sd-visits-backdrop" role="presentation" onClick={() => setVisitsOpen(false)}>
					<aside
						className="sd-visits-panel"
						role="dialog"
						aria-label={labels.shareVisitors || 'Visitors'}
						onClick={(e) => e.stopPropagation()}
					>
						<header className="sd-visits-head">
							<div>
								<p className="sd-visits-kicker">{labels.shareVisitors || 'Visitors'}</p>
								<p className="sd-visits-sub">
									{labels.shareVisitorsHint || 'Every open of the share link is listed here.'}
								</p>
							</div>
							<button
								type="button"
								className="sd-icon-btn"
								onClick={() => setVisitsOpen(false)}
								title={labels.close || 'Close'}
							>
								<X size={15} />
							</button>
						</header>
						<div className="sd-visits-body">
							{visitsLoading ? (
								<div className="sd-visits-empty">
									<Loader2 size={16} className="animate-spin" />
									{labels.loading || 'Loading…'}
								</div>
							) : !visitRows.length ? (
								<div className="sd-visits-empty">
									{labels.shareVisitsEmpty || 'No one has opened the link yet.'}
								</div>
							) : (
								<ul className="sd-visits-list">
									{visitRows.map((visit, index) => {
										const deviceLine = visitDeviceLine(visit);
										const isp = visit?.isp ? String(visit.isp) : '';
										return (
											<li key={`${visit.at || index}-${visit.ip || index}`} className="sd-visits-item">
												<div className="sd-visits-item-time">{formatVisitTime(visit, locale)}</div>
												<div className="sd-visits-item-main">
													<div className="sd-visits-row">
														<span className="sd-visits-label">{labels.shareVisitLocation || 'Location'}</span>
														<span>{visitLocationLabel(visit, labels)}</span>
													</div>
													<div className="sd-visits-row">
														<span className="sd-visits-label">{labels.shareVisitBrowser || 'Browser'}</span>
														<span>{visitBrowserLine(visit, labels)}</span>
													</div>
													<div className="sd-visits-row">
														<span className="sd-visits-label">{labels.shareVisitIp || 'IP'}</span>
														<span className="sd-visits-mono">{visit.ip || '—'}</span>
													</div>
													{isp ? (
														<div className="sd-visits-row">
															<span className="sd-visits-label">{labels.shareVisitIsp || 'ISP'}</span>
															<span>{isp}</span>
														</div>
													) : null}
													{deviceLine ? (
														<div className="sd-visits-row">
															<span className="sd-visits-label">{labels.shareVisitDevice || 'Device'}</span>
															<span className="sd-visits-item-meta">{deviceLine}</span>
														</div>
													) : null}
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</div>
						<footer className="sd-visits-foot">
							<button type="button" className="sd-visits-refresh" onClick={() => void loadVisits()}>
								{labels.shareVisitsRefresh || 'Refresh'}
							</button>
						</footer>
					</aside>
				</div>
			) : null}
		</div>
	);
}
