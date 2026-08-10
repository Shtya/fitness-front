'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCenter,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	ArrowLeft,
	BookOpen,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Eye,
	FileText,
	Folder,
	FolderOpen,
	GripVertical,
	Link2,
	Loader2,
	Map,
	MoreHorizontal,
	PenLine,
	Plus,
	Sparkles,
	Star,
	Target,
	Trash2,
	Video,
	X,
	Youtube,
} from 'lucide-react';
import MarkdownMessage from '../ai-free/MarkdownMessage';
import { LearningDailyPlanner, LearningHeaderCard } from './learning-ui';
import { learningText } from './learning-localize';
import { LearningRoadmapExplorer } from './learning-roadmap-explorer';
import { LearningVideoPlayer } from './learning-video-transcript';
import {
	createLayoutBlock,
	createSection,
	createTopic,
	createTopicCard,
	isTopicDone,
	pathProgress,
	resolveTopicLayoutBlocks,
	youtubeIdFromUrl,
} from './learning-utils';
import './learning-landing.css';

const MODE_STORAGE_KEY = 'so7ba.learning.workspaceMode';

function defaultTopicMode(locale) {
	return String(locale || '').toLowerCase().startsWith('ar') ? 'study' : 'edit';
}

function readStoredTopicMode(locale, preferredMode) {
	if (typeof window !== 'undefined') {
		try {
			const saved = window.localStorage.getItem(MODE_STORAGE_KEY);
			if (saved === 'edit' || saved === 'study' || saved === 'roadmap') return saved;
		} catch {
			/* ignore */
		}
	}
	if (preferredMode === 'edit' || preferredMode === 'study' || preferredMode === 'roadmap') {
		return preferredMode;
	}
	return defaultTopicMode(locale);
}

function writeStoredTopicMode(mode) {
	if (typeof window === 'undefined') return;
	if (!['edit', 'study', 'roadmap'].includes(mode)) return;
	try {
		window.localStorage.setItem(MODE_STORAGE_KEY, mode);
	} catch {
		/* ignore */
	}
}

const cx = (...parts) => parts.filter(Boolean).join(' ');

function LearningPathIndex({
	path,
	t,
	locale = 'en',
	topicId,
	onSelectTopic,
	onAddSection,
	onAddTopic,
	onRenameSection,
	onDeleteSection,
	onRenameTopic,
	onDeleteTopic,
	onToggleTopicDone,
	expandNonce = 0,
	collapseNonce = 0,
}) {
	const [pendingDelete, setPendingDelete] = useState(null);
	const [editing, setEditing] = useState(null);
	const [collapsedSections, setCollapsedSections] = useState(() => new Set());
	const activeTopicRef = useRef(null);
	const sectionsRef = useRef(path.sections);
	sectionsRef.current = path.sections;

	const clearPending = () => setPendingDelete(null);

	const expandAll = () => setCollapsedSections(new Set());
	const collapseAll = () =>
		setCollapsedSections(new Set((path.sections || []).map(section => section.id).filter(Boolean)));

	useEffect(() => {
		if (expandNonce > 0) expandAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [expandNonce]);

	useEffect(() => {
		if (collapseNonce > 0) collapseAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [collapseNonce]);

	// Only react to topic selection — not to checkbox/progress updates on path.sections,
	// otherwise the index jumps back to the active topic while you're scrolled elsewhere.
	useEffect(() => {
		if (!topicId) return;
		const section = (sectionsRef.current || []).find(item =>
			(item.topics || []).some(topic => topic.id === topicId),
		);
		if (section?.id) {
			setCollapsedSections(current => {
				if (!current.has(section.id)) return current;
				const next = new Set(current);
				next.delete(section.id);
				return next;
			});
		}
		const frame = window.requestAnimationFrame(() => {
			activeTopicRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
		return () => window.cancelAnimationFrame(frame);
	}, [topicId]);

	const toggleSection = sectionId => {
		setCollapsedSections(current => {
			const next = new Set(current);
			if (next.has(sectionId)) next.delete(sectionId);
			else next.add(sectionId);
			return next;
		});
	};

	const stopEditing = () => setEditing(null);

	const isEditingSection = (sectionIndex, sectionId) =>
		editing?.type === 'section' &&
		(editing.sectionIndex === sectionIndex || editing.id === sectionId);

	const isEditingTopic = (sectionIndex, topicIdValue) =>
		editing?.type === 'topic' &&
		editing.sectionIndex === sectionIndex &&
		editing.id === topicIdValue;

	return (
		<aside className="learning-path-sidebar learning-path-sidebar--tree">
			<div className="learning-path-sidebar__head">
				<p className="learning-path-sidebar__eyebrow">{t.indexTitle}</p>
				<button
					type="button"
					className="learning-path-sidebar__view-all"
					onClick={expandAll}
				>
					{t.viewAll}
				</button>
			</div>
			<div className="learning-path-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
				{(path.sections || []).length === 0 ? (
					<p className="learning-path-tree__empty">{t.indexEmpty}</p>
				) : (
					<div className="learning-path-tree" role="tree">
						{(path.sections || []).map((section, sectionIndex) => {
							const expanded = !collapsedSections.has(section.id);
							const topicCount = (section.topics || []).length;
							const sectionTitle =
								learningText(section, 'title', locale) ||
								`${t.section} ${sectionIndex + 1}`;
							const sectionPending =
								pendingDelete?.type === 'section' && pendingDelete.sectionIndex === sectionIndex;
							const sectionEditing = isEditingSection(sectionIndex, section.id);

							return (
								<div key={section.id} className="learning-path-tree__section" role="group">
									<div
										className={cx(
											'learning-path-tree__row',
											'learning-path-tree__row--section',
											sectionEditing && 'is-editing',
										)}
										title={sectionTitle}
									>
										<button
											type="button"
											onClick={() => toggleSection(section.id)}
											className="learning-path-tree__chevron"
											aria-expanded={expanded}
											aria-label={expanded ? 'Collapse section' : 'Expand section'}
										>
											{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
										</button>
										<span className="learning-path-tree__icon" aria-hidden>
											{expanded ? <FolderOpen size={15} /> : <Folder size={15} />}
										</span>
										{sectionEditing ? (
											<input
												type="text"
												autoFocus
												value={section.title || ''}
												onChange={event => onRenameSection?.(sectionIndex, event.target.value)}
												onBlur={stopEditing}
												onKeyDown={event => {
													if (event.key === 'Enter' || event.key === 'Escape') {
														event.preventDefault();
														stopEditing();
													}
												}}
												onClick={event => event.stopPropagation()}
												className="learning-path-tree__label is-editing"
												placeholder={`${t.section} ${sectionIndex + 1}`}
												aria-label={t.sectionNamePlaceholder}
											/>
										) : (
											<button
												type="button"
												className="learning-path-tree__label learning-path-tree__label--btn"
												onClick={() => toggleSection(section.id)}
												title={sectionTitle}
											>
												{sectionTitle}
											</button>
										)}
										<span
											className="learning-path-tree__count"
											aria-label={`${topicCount} ${t.topics}`}
											title={`${topicCount} ${t.topics}`}
										>
											{topicCount}
										</span>
										<div
											className="learning-path-tree__actions"
											onClick={event => event.stopPropagation()}
										>
											{sectionPending ? (
												<>
													<button
														type="button"
														onClick={() => {
															onDeleteSection?.(sectionIndex);
															clearPending();
														}}
														className="learning-path-index-confirm-btn learning-path-index-confirm-btn--yes"
													>
														{t.confirmDeleteYes}
													</button>
													<button
														type="button"
														onClick={clearPending}
														className="learning-path-index-confirm-btn learning-path-index-confirm-btn--no"
													>
														{t.confirmDeleteNo}
													</button>
												</>
											) : (
												<>
													<button
														type="button"
														onClick={() =>
															setEditing({
																type: 'section',
																sectionIndex,
																id: section.id,
															})
														}
														className="learning-path-tree__action-btn"
														aria-label={t.renameSection}
														title={t.renameSection}
													>
														<PenLine size={13} />
													</button>
													<button
														type="button"
														onClick={() =>
															setPendingDelete({ type: 'section', sectionIndex })
														}
														className="learning-path-tree__action-btn learning-path-tree__action-btn--danger"
														aria-label={t.deleteSection}
														title={t.delete}
													>
														<Trash2 size={13} />
													</button>
												</>
											)}
										</div>
									</div>

									{expanded ? (
										<div className="learning-path-tree__children">
											{(section.topics || []).length === 0 ? (
												<p className="learning-path-tree__empty-inline">
													{t.indexSectionEmpty}
												</p>
											) : (
												(section.topics || []).map(topic => {
													const active = topic.id === topicId;
													const done = isTopicDone(topic);
													const topicPending =
														pendingDelete?.type === 'topic' &&
														pendingDelete.id === topic.id;
													const topicEditing = isEditingTopic(sectionIndex, topic.id);
													const topicTitle =
														learningText(topic, 'title', locale) || t.topicNamePlaceholder;

													return (
														<div
															key={topic.id}
															ref={active ? activeTopicRef : null}
															data-topic-id={topic.id}
															className={cx(
																'learning-path-tree__row',
																'learning-path-tree__row--topic',
																active && 'is-active',
																done && 'is-done',
																topicEditing && 'is-editing',
															)}
															role="treeitem"
															title={topicTitle}
															onClick={() => {
																if (!topicEditing) onSelectTopic(topic);
															}}
														>
															<label
																className="learning-path-tree__check"
																onClick={event => event.stopPropagation()}
																title={t.markTopicDone}
															>
																<input
																	type="checkbox"
																	checked={done}
																	onChange={event =>
																		onToggleTopicDone?.(topic, event.target.checked)
																	}
																	aria-label={t.markTopicDone}
																/>
															</label>
															<span className="learning-path-tree__icon" aria-hidden>
																<FileText size={14} />
															</span>
															{topicEditing ? (
																<input
																	type="text"
																	autoFocus
																	value={topic.title || ''}
																	onChange={event =>
																		onRenameTopic?.(
																			sectionIndex,
																			topic.id,
																			event.target.value,
																		)
																	}
																	onBlur={stopEditing}
																	onKeyDown={event => {
																		if (event.key === 'Enter' || event.key === 'Escape') {
																			event.preventDefault();
																			stopEditing();
																		}
																	}}
																	onClick={event => event.stopPropagation()}
																	className="learning-path-tree__label is-editing"
																	placeholder={t.topicNamePlaceholder}
																	aria-label={t.topicNamePlaceholder}
																/>
															) : (
																<span className="learning-path-tree__label learning-path-tree__label--text">
																	{topicTitle}
																</span>
															)}
															<div
																className="learning-path-tree__actions"
																onClick={event => event.stopPropagation()}
															>
																{topicPending ? (
																	<>
																		<button
																			type="button"
																			onClick={() => {
																				onDeleteTopic?.(sectionIndex, topic.id);
																				clearPending();
																			}}
																			className="learning-path-index-confirm-btn learning-path-index-confirm-btn--yes"
																		>
																			{t.confirmDeleteYes}
																		</button>
																		<button
																			type="button"
																			onClick={clearPending}
																			className="learning-path-index-confirm-btn learning-path-index-confirm-btn--no"
																		>
																			{t.confirmDeleteNo}
																		</button>
																	</>
																) : (
																	<>
																		<button
																			type="button"
																			onClick={() =>
																				setEditing({
																					type: 'topic',
																					sectionIndex,
																					id: topic.id,
																				})
																			}
																			className="learning-path-tree__action-btn"
																			aria-label={t.renameTopic}
																			title={t.renameTopic}
																		>
																			<PenLine size={12} />
																		</button>
																		<button
																			type="button"
																			onClick={() =>
																				setPendingDelete({
																					type: 'topic',
																					sectionIndex,
																					id: topic.id,
																				})
																			}
																			className="learning-path-tree__action-btn learning-path-tree__action-btn--danger"
																			aria-label={t.deleteTopic}
																			title={t.delete}
																		>
																			<Trash2 size={12} />
																		</button>
																	</>
																)}
															</div>
														</div>
													);
												})
											)}
											<button
												type="button"
												onClick={() => onAddTopic(sectionIndex)}
												className="learning-path-tree__add"
											>
												<Plus size={12} />
												{t.addTopic}
											</button>
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				)}
			</div>
			<button type="button" onClick={onAddSection} className="learning-path-tree__add-section">
				<Plus size={13} />
				{t.addSection}
			</button>
		</aside>
	);
}

function TopicBlock({ title, icon: Icon, children, actions, embedded = false }) {
	if (embedded) {
		return (
			<div className="learning-topic-block-embedded">
				{children}
				{actions ? <div className="learning-topic-block-embedded__actions">{actions}</div> : null}
			</div>
		);
	}

	return (
		<section className="learning-neu space-y-3 p-5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-black text-[var(--learn-ink)]">
					{Icon ? <Icon size={16} className="text-[var(--learn-accent-1)]" /> : null}
					{title}
				</div>
				{actions}
			</div>
			{children}
		</section>
	);
}

function TopicVideoBlock({ topic, path, t, locale, onPatch, readOnly = false, embedded = false }) {
	const url = topic.primaryVideoUrl || '';
	const yt = youtubeIdFromUrl(url);

	if (readOnly) {
		if (!yt) return null;
		return (
			<LearningVideoPlayer
				topic={topic}
				path={path}
				t={t}
				locale={locale}
				onPatch={onPatch}
				readOnly
			/>
		);
	}

	return (
		<TopicBlock title={t.videoFirst} icon={Video} embedded={embedded}>
			{yt ? (
				<LearningVideoPlayer
					topic={topic}
					path={path}
					t={t}
					locale={locale}
					onPatch={onPatch}
					readOnly={false}
				/>
			) : (
				<>
					<div className="grid place-items-center rounded-xl border border-dashed border-[var(--learn-border-glass)] px-4 py-10 text-sm text-[var(--learn-ink-soft)]">
						<Youtube size={28} className="mb-2 opacity-50" />
						{t.noVideoYet}
					</div>
					<input
						value={url}
						onChange={event => onPatch({ primaryVideoUrl: event.target.value })}
						placeholder={t.videoUrlPlaceholder}
						className="learning-neu-inset h-10 w-full px-3 text-sm outline-none"
					/>
				</>
			)}
		</TopicBlock>
	);
}

function TopicCardsBlock({ topic, t, locale = 'en', onPatch, readOnly = false, embedded = false }) {
	const cards = [...(topic.cards || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

	if (readOnly) {
		if (!cards.length) return null;
		return (
			<div className="learning-topic-study-cards">
				{cards.map(card => {
					const title = learningText(card, 'title', locale);
					const body = learningText(card, 'body', locale);
					return (
					<article key={card.id} className="learning-topic-study-card">
						{card.source === 'roadmap-scrape' ? (
							<span className="learning-topic-study-card__badge">
								{t.roadmapScrapeResource || 'Scraped'}
							</span>
						) : null}
						{title ? (
							<h3 className="learning-topic-study-card__title">{title}</h3>
						) : null}
						{body ? (
							card.type === 'rich' ? (
								<div className="learning-topic-study-card__body prose-sm">
									<MarkdownMessage content={body} />
								</div>
							) : (
								<p className="learning-topic-study-card__body whitespace-pre-wrap">{body}</p>
							)
						) : null}
					</article>
					);
				})}
			</div>
		);
	}

	const patchCards = next => onPatch({ cards: next });
	const addCard = type => {
		patchCards([
			...cards,
			createTopicCard({
				type,
				title: type === 'rich' ? t.richTicket : t.ticket,
				order: cards.length,
			}),
		]);
	};
	const updateCard = (id, patch) => {
		patchCards(cards.map(card => (card.id === id ? { ...card, ...patch } : card)));
	};
	const removeCard = id => patchCards(cards.filter(card => card.id !== id));

	return (
		<TopicBlock
			title={t.ticketsTitle}
			icon={FileText}
			embedded={embedded}
			actions={
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => addCard('ticket')}
						className="rounded-lg border border-[var(--learn-border-glass)] px-2.5 py-1.5 text-xs font-bold"
					>
						+ {t.ticket}
					</button>
					<button
						type="button"
						onClick={() => addCard('rich')}
						className="learning-pill-btn !px-3 !py-1.5 text-xs"
					>
						+ {t.richTicket}
					</button>
				</div>
			}
		>
			{cards.length === 0 ? (
				<p className="text-sm text-[var(--learn-ink-soft)]">{t.ticketsEmpty}</p>
			) : (
				<div className="space-y-3">
					{cards.map(card => (
						<div key={card.id} className="learning-neu-inset space-y-2 p-3">
							<div className="flex items-center gap-2">
								<input
									value={card.title || ''}
									onChange={event => updateCard(card.id, { title: event.target.value })}
									className="min-w-0 flex-1 border-none bg-transparent text-sm font-bold outline-none"
								/>
								<button
									type="button"
									onClick={() => removeCard(card.id)}
									className="rounded-lg p-1 text-slate-400 hover:text-rose-500"
								>
									<Trash2 size={14} />
								</button>
							</div>
							<textarea
								value={card.body || ''}
								onChange={event => updateCard(card.id, { body: event.target.value })}
								rows={card.type === 'rich' ? 5 : 3}
								placeholder={t.ticketBodyPlaceholder}
								className="w-full rounded-lg border border-[var(--learn-border-glass)] bg-white p-2.5 text-sm outline-none"
							/>
						</div>
					))}
				</div>
			)}
		</TopicBlock>
	);
}

function TopicScraperBlock({ topic, t, onImport, busy, embedded = false }) {
	const [url, setUrl] = useState('');

	return (
		<TopicBlock title={t.scraperTitle} icon={Link2} embedded={embedded}>
			<p className="text-sm leading-relaxed text-[var(--learn-ink-soft)]">{t.scraperHint}</p>
			<div className="flex flex-col gap-2 sm:flex-row">
				<input
					value={url}
					onChange={event => setUrl(event.target.value)}
					placeholder={t.scraperPlaceholder}
					className="learning-neu-inset h-10 min-w-0 flex-1 px-3 text-sm outline-none"
				/>
				<button
					type="button"
					disabled={!url.trim() || busy}
					onClick={() => onImport(url.trim(), topic.title)}
					className="learning-pill-btn h-10 disabled:opacity-50"
				>
					{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
					{t.scraperRun}
				</button>
			</div>
		</TopicBlock>
	);
}

function TopicContentBlock({ topic, t, locale = 'en', onPatch, readOnly = false, embedded = false }) {
	if (readOnly) {
		const markdown = learningText(topic, 'contentMarkdown', locale);
		if (!markdown?.trim()) return null;
		return (
			<div className="learning-topic-study-prose">
				<MarkdownMessage content={markdown} />
			</div>
		);
	}

	return (
		<TopicBlock title={t.content} icon={BookOpen} embedded={embedded}>
			<textarea
				value={topic.contentMarkdown || ''}
				onChange={event =>
					onPatch({
						contentMarkdown: event.target.value,
						status: topic.status === 'not_started' ? 'learning' : topic.status,
						progress: Math.max(Number(topic.progress) || 0, 15),
					})
				}
				rows={12}
				placeholder={t.contentPlaceholder}
				className="learning-neu-inset w-full p-3 font-mono text-sm leading-relaxed outline-none"
			/>
		</TopicBlock>
	);
}

function TopicSummaryBlock({ topic, t, readOnly = false, embedded = false }) {
	const summary = topic.summary;
	if (!summary?.tldr) {
		if (readOnly) return null;
		return (
			<TopicBlock title={t.summary} icon={Sparkles} embedded={embedded}>
				<p className="text-sm text-[var(--learn-ink-soft)]">{t.emptyReview}</p>
			</TopicBlock>
		);
	}

	const body = (
		<>
			<p className={readOnly ? 'learning-topic-study-summary' : 'mt-2 text-sm font-semibold text-[var(--learn-ink)]'}>
				{summary.tldr}
			</p>
			{Array.isArray(summary.keyConcepts) && summary.keyConcepts.length ? (
				<ul className="learning-topic-summary-list">
					{summary.keyConcepts.slice(0, 8).map((item, index) => (
						<li key={`sum-concept-${index}`}>{item}</li>
					))}
				</ul>
			) : null}
			{Array.isArray(summary.takeaways) && summary.takeaways.length ? (
				<ul className="learning-topic-summary-list is-takeaways">
					{summary.takeaways.slice(0, 6).map((item, index) => (
						<li key={`sum-takeaway-${index}`}>{item}</li>
					))}
				</ul>
			) : null}
		</>
	);

	if (readOnly) {
		return <div className="learning-topic-study-summary-wrap">{body}</div>;
	}
	return (
		<div className="learning-neu-inset p-4">
			<p className="text-xs font-bold uppercase text-[var(--learn-ink-faint)]">{t.summary}</p>
			{body}
		</div>
	);
}

const BLOCK_CATALOG = [
	{ type: 'video', icon: Video, labelKey: 'videoFirst' },
	{ type: 'tickets', icon: FileText, labelKey: 'ticketsTitle' },
	{ type: 'scraper', icon: Link2, labelKey: 'scraperTitle' },
	{ type: 'content', icon: BookOpen, labelKey: 'content' },
	{ type: 'summary', icon: Sparkles, labelKey: 'summary' },
];

function InsertDropZone({ id, isActive, label, expanded = false }) {
	const { setNodeRef, isOver } = useDroppable({ id });
	const show = isOver || isActive;

	return (
		<div
			ref={setNodeRef}
			className={cx(
				'learning-topic-insert-zone',
				show && 'is-active',
				expanded && 'is-expanded',
			)}
		>
			<div className="learning-topic-insert-zone__line" />
			{show ? <span className="learning-topic-insert-zone__pill">{label}</span> : null}
		</div>
	);
}

function PaletteBlockItem({ type, icon: Icon, label, onAdd, disabled }) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `palette-${type}`,
		data: { source: 'palette', type },
		disabled,
	});

	return (
		<button
			ref={setNodeRef}
			type="button"
			{...listeners}
			{...attributes}
			onClick={() => onAdd(type)}
			disabled={disabled}
			className={cx('learning-topic-palette__item', isDragging && 'is-dragging')}
		>
			<GripVertical size={14} className="learning-topic-palette__grip" aria-hidden />
			<span className="learning-topic-palette__icon">
				<Icon size={16} />
			</span>
			<span className="learning-topic-palette__label">{label}</span>
		</button>
	);
}

function TopicCanvasDropzone({ children, isEmpty, t, isDragging }) {
	const { setNodeRef, isOver } = useDroppable({ id: 'topic-canvas' });

	return (
		<div
			ref={setNodeRef}
			className={cx(
				'learning-topic-canvas',
				(isOver || isDragging) && 'is-over',
				isEmpty && 'is-empty',
			)}
		>
			{isEmpty ? (
				<div className="learning-topic-canvas__empty">
					<div className="learning-topic-canvas__empty-icon" aria-hidden>
						<Video size={20} />
					</div>
					<p>{t.noVideoYet}</p>
				</div>
			) : null}
			{children}
		</div>
	);
}

function renderBlockContent(block, { topic, path, t, locale, onPatch, onImportTopic, importBusy, readOnly }) {
	const embedded = !readOnly;
	switch (block.type) {
		case 'video':
			return (
				<TopicVideoBlock
					topic={topic}
					path={path}
					t={t}
					locale={locale}
					onPatch={onPatch}
					readOnly={readOnly}
					embedded={embedded}
				/>
			);
		case 'tickets':
			return (
				<TopicCardsBlock
					topic={topic}
					t={t}
					locale={locale}
					onPatch={onPatch}
					readOnly={readOnly}
					embedded={embedded}
				/>
			);
		case 'scraper':
			if (readOnly) return null;
			return (
				<TopicScraperBlock
					topic={topic}
					t={t}
					onImport={onImportTopic}
					busy={importBusy}
					embedded={embedded}
				/>
			);
		case 'content':
			return (
				<TopicContentBlock
					topic={topic}
					t={t}
					locale={locale}
					onPatch={onPatch}
					readOnly={readOnly}
					embedded={embedded}
				/>
			);
		case 'summary':
			return (
				<TopicSummaryBlock topic={topic} t={t} readOnly={readOnly} embedded={embedded} />
			);
		default:
			return null;
	}
}

function SortableTopicBlock({
	block,
	topic,
	path,
	t,
	locale,
	onPatch,
	onImportTopic,
	importBusy,
	onRemove,
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: block.id,
		data: { source: 'canvas', blockId: block.id },
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const meta = BLOCK_CATALOG.find(item => item.type === block.type);
	const body = renderBlockContent(block, {
		topic,
		path,
		t,
		locale,
		onPatch,
		onImportTopic,
		importBusy,
		readOnly: false,
	});

	if (!body) return null;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cx('learning-topic-block-wrap', isDragging && 'is-dragging')}
		>
			<div className="learning-topic-block-wrap__actions">
				<button
					type="button"
					className="learning-topic-block-wrap__handle"
					{...attributes}
					{...listeners}
					aria-label="Reorder block"
				>
					<GripVertical size={14} />
				</button>
				<span className="learning-topic-block-wrap__type">
					{meta ? t[meta.labelKey] : block.type}
				</span>
				<button
					type="button"
					onClick={() => onRemove(block.id)}
					className="learning-topic-block-wrap__remove"
					aria-label={t.removeBlock}
				>
					<X size={13} />
				</button>
			</div>
			{body}
		</div>
	);
}

function StudyTopicBlock({ block, topic, path, t, locale, onPatch, onImportTopic, importBusy }) {
	const meta = BLOCK_CATALOG.find(item => item.type === block.type);
	const body = renderBlockContent(block, {
		topic,
		path,
		t,
		locale,
		onPatch,
		onImportTopic,
		importBusy,
		readOnly: true,
	});
	if (!body) return null;

	return (
		<article className="learning-topic-study-section">
			{meta ? (
				<header className="learning-topic-study-section__head">
					<span className="learning-topic-study-section__icon">
						<meta.icon size={15} />
					</span>
					<span>{t[meta.labelKey]}</span>
				</header>
			) : null}
			{body}
		</article>
	);
}

function LearningTopicPanel({
	topic,
	path,
	t,
	locale,
	mode,
	onPatch,
	onImportTopic,
	importBusy,
}) {
	const [activeDrag, setActiveDrag] = useState(null);
	const [overInsertId, setOverInsertId] = useState(null);
	const [descOpen, setDescOpen] = useState(() => Boolean(topic.description));
	const blocks = useMemo(() => resolveTopicLayoutBlocks(topic), [topic]);
	const isEdit = mode === 'edit';

	useEffect(() => {
		setDescOpen(Boolean(topic.description));
	}, [topic.id]);

	useEffect(() => {
		if (Array.isArray(topic.layoutBlocks)) return;
		const migrated = resolveTopicLayoutBlocks(topic);
		if (migrated.length) onPatch({ layoutBlocks: migrated });
	}, [topic.id, topic.layoutBlocks, onPatch]);

	const patchBlocks = nextBlocks => {
		onPatch({
			layoutBlocks: nextBlocks.map((block, index) => ({ ...block, order: index })),
		});
	};

	const insertBlockAt = (type, index) => {
		const next = createLayoutBlock(type, index);
		const copy = [...blocks];
		copy.splice(index, 0, next);
		patchBlocks(copy);
	};

	const removeBlock = blockId => {
		patchBlocks(blocks.filter(block => block.id !== blockId));
	};

	const resolveInsertIndex = overId => {
		if (!overId) return null;
		const value = String(overId);
		if (value === 'topic-canvas') return blocks.length;
		if (value.startsWith('insert-')) return Number(value.replace('insert-', ''));
		const blockIndex = blocks.findIndex(block => block.id === value);
		if (blockIndex >= 0) return blockIndex;
		return null;
	};

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const handleDragStart = event => {
		const id = String(event.active.id);
		if (id.startsWith('palette-')) {
			setActiveDrag({ type: id.replace('palette-', ''), source: 'palette' });
		} else {
			const block = blocks.find(item => item.id === id);
			if (block) setActiveDrag({ ...block, source: 'canvas' });
		}
	};

	const handleDragOver = event => {
		const overId = event.over?.id;
		if (!overId) {
			setOverInsertId(null);
			return;
		}
		const value = String(overId);
		if (value.startsWith('insert-') || value === 'topic-canvas') {
			setOverInsertId(value === 'topic-canvas' ? 'insert-0' : value);
			return;
		}
		const blockIndex = blocks.findIndex(block => block.id === value);
		if (blockIndex >= 0) setOverInsertId(`insert-${blockIndex}`);
		else setOverInsertId(null);
	};

	const handleDragEnd = event => {
		setActiveDrag(null);
		setOverInsertId(null);
		const { active, over } = event;
		if (!over) return;

		const activeId = String(active.id);
		const insertIndex = resolveInsertIndex(over.id);
		if (insertIndex === null || Number.isNaN(insertIndex)) return;

		if (activeId.startsWith('palette-')) {
			insertBlockAt(activeId.replace('palette-', ''), insertIndex);
			return;
		}

		const oldIndex = blocks.findIndex(block => block.id === active.id);
		if (oldIndex < 0) return;

		let newIndex = insertIndex;
		const copy = [...blocks];
		const [removed] = copy.splice(oldIndex, 1);
		if (newIndex > oldIndex) newIndex -= 1;
		copy.splice(newIndex, 0, removed);
		patchBlocks(copy);
	};

	const handleDragCancel = () => {
		setActiveDrag(null);
		setOverInsertId(null);
	};

	const activePaletteMeta = activeDrag?.source === 'palette'
		? BLOCK_CATALOG.find(item => item.type === activeDrag.type)
		: null;
	const ActiveOverlayIcon = activePaletteMeta?.icon;
	const isDragging = Boolean(activeDrag);

	const ensureTicketsThenAdd = type => {
		const hasTickets = blocks.some(block => block.type === 'tickets');
		const nextCards = [
			...(topic.cards || []),
			createTopicCard({
				type,
				title: type === 'rich' ? t.richTicket : t.ticket,
				order: (topic.cards || []).length,
			}),
		];
		if (!hasTickets) {
			const next = createLayoutBlock('tickets', blocks.length);
			onPatch({
				cards: nextCards,
				layoutBlocks: [...blocks, next].map((block, index) => ({ ...block, order: index })),
			});
			return;
		}
		onPatch({ cards: nextCards });
	};

	const panelBody = (
		<div className="learning-path-topic-panel learning-topic-workspace__main">
			<header className="learning-topic-workspace__header">
				<p className="learning-topic-workspace__crumb">
					{learningText(path, 'title', locale)}
				</p>
				{isEdit ? (
					<>
						<input
							value={topic.title || ''}
							onChange={event => onPatch({ title: event.target.value })}
							className="learning-topic-workspace__title-input"
							placeholder={t.titleLabel}
						/>
						{descOpen || topic.description ? (
							<input
								value={topic.description || ''}
								onChange={event => onPatch({ description: event.target.value })}
								placeholder={t.descLabel}
								className="learning-topic-workspace__desc-input"
								autoFocus={descOpen && !topic.description}
							/>
						) : (
							<button
								type="button"
								className="learning-topic-workspace__desc-link"
								onClick={() => setDescOpen(true)}
							>
								+ {t.descLabel}
							</button>
						)}
					</>
				) : (
					<>
						<h1 className="learning-topic-workspace__title">
							{learningText(topic, 'title', locale) || t.titleLabel}
						</h1>
						{learningText(topic, 'description', locale) ? (
							<p className="learning-topic-workspace__desc">
								{learningText(topic, 'description', locale)}
							</p>
						) : null}
					</>
				)}
			</header>

			{isEdit ? (
				<>
					<TopicCanvasDropzone isEmpty={blocks.length === 0} t={t} isDragging={isDragging}>
						{blocks.length > 0 ? (
							<SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
								<div className="learning-topic-canvas__blocks">
									<InsertDropZone
										id="insert-0"
										isActive={overInsertId === 'insert-0'}
										label={t.dropInsertHere}
									/>
									{blocks.map((block, index) => (
										<Fragment key={block.id}>
											<SortableTopicBlock
												block={block}
												topic={topic}
												path={path}
												t={t}
												locale={locale}
												onPatch={onPatch}
												onImportTopic={onImportTopic}
												importBusy={importBusy}
												onRemove={removeBlock}
											/>
											<InsertDropZone
												id={`insert-${index + 1}`}
												isActive={overInsertId === `insert-${index + 1}`}
												label={t.dropInsertHere}
											/>
										</Fragment>
									))}
								</div>
							</SortableContext>
						) : null}
					</TopicCanvasDropzone>

					{blocks.length === 0 ? (
						<>
							<input
								value={topic.primaryVideoUrl || ''}
								onChange={event => {
									const value = event.target.value;
									const hasVideo = blocks.some(block => block.type === 'video');
									if (value.trim() && !hasVideo) {
										const next = createLayoutBlock('video', 0);
										onPatch({
											primaryVideoUrl: value,
											layoutBlocks: [next, ...blocks].map((block, index) => ({
												...block,
												order: index,
											})),
										});
										return;
									}
									onPatch({ primaryVideoUrl: value });
								}}
								placeholder={t.videoUrlPlaceholder}
								className="learning-topic-url-input"
							/>
							<p className="learning-topic-helper-text">{t.ticketsEmpty}</p>
							<div className="learning-topic-action-row">
								<button
									type="button"
									className="learning-topic-btn learning-topic-btn--secondary"
									onClick={() => ensureTicketsThenAdd('ticket')}
								>
									<Plus size={14} />
									{t.ticket}
								</button>
								<button
									type="button"
									className="learning-topic-btn learning-topic-btn--primary"
									onClick={() => ensureTicketsThenAdd('rich')}
								>
									<Plus size={14} />
									{t.richTicket}
								</button>
							</div>
						</>
					) : null}
				</>
			) : blocks.length === 0 && !(topic.references || []).length ? (
				<div className="learning-topic-study-empty">{t.studyEmpty}</div>
			) : (
				<div className="learning-topic-study-flow">
					{blocks.map(block => (
						<StudyTopicBlock
							key={block.id}
							block={block}
							topic={topic}
							path={path}
							t={t}
							locale={locale}
							onPatch={onPatch}
							onImportTopic={onImportTopic}
							importBusy={importBusy}
						/>
					))}
					{(topic.references || []).length ? (
						<section className="learning-topic-study-refs">
							<h3>{t.roadmapReferences || 'Saved references'}</h3>
							<ul>
								{topic.references.map(reference => (
									<li key={reference.id || reference.url}>
										<a href={reference.url} target="_blank" rel="noreferrer">
											{learningText(reference, 'title', locale) || reference.title}
											<ExternalLink size={13} />
										</a>
										{learningText(reference, 'summary', locale) || reference.summary ? (
											<p>{learningText(reference, 'summary', locale) || reference.summary}</p>
										) : null}
									</li>
								))}
							</ul>
						</section>
					) : null}
				</div>
			)}
		</div>
	);

	const paletteDock = isEdit ? (
		<aside className="learning-topic-palette-dock">
			<p className="learning-topic-palette__title">{t.blocksPalette}</p>
			<div className="learning-topic-palette__list">
				{BLOCK_CATALOG.map(item => (
					<PaletteBlockItem
						key={item.type}
						type={item.type}
						icon={item.icon}
						label={t[item.labelKey]}
						onAdd={type => insertBlockAt(type, blocks.length)}
					/>
				))}
			</div>
		</aside>
	) : null;

	if (!isEdit) {
		return (
			<div className="learning-path-topic-shell learning-topic-stage">
				{panelBody}
			</div>
		);
	}

	return (
		<div className="learning-path-topic-shell learning-topic-stage">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				<div className="learning-topic-stage__row">
					{panelBody}
					{paletteDock}
				</div>
				<DragOverlay dropAnimation={null}>
					{activePaletteMeta && ActiveOverlayIcon ? (
						<div className="learning-topic-palette__item is-overlay">
							<ActiveOverlayIcon size={16} aria-hidden />
							<span>{t[activePaletteMeta.labelKey]}</span>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}

function LearningPathHome({
	path,
	t,
	today,
	workspaceTab,
	onTabChange,
	onToggleDaily,
	onOpenDailyItem,
	onAddDaily,
	roadmapUrl,
	setRoadmapUrl,
	onImportRoadmap,
	importBusy,
	roadmapDraft,
	setRoadmapDraft,
	onApplyRoadmap,
	labelDifficulty,
	onSelectTopic,
	onScrapeRoadmapResource,
	onScrapeRoadmapResources,
}) {
	const roadmapImportBusy = importBusy === 'roadmap';

	return (
		<div className="min-h-0 flex-1">
			<div className="learning-path-tabs">
				{[
					['today', t.tabToday, Target],
					['roadmap', t.tabRoadmap, Map],
				].map(([id, label, Icon]) => (
					<button
						key={id}
						type="button"
						onClick={() => onTabChange(id)}
						className={cx(
							'learning-path-tab',
							workspaceTab === id ? 'is-active' : 'is-inactive',
						)}
					>
						<Icon size={14} />
						{label}
					</button>
				))}
			</div>

			{workspaceTab === 'today' ? (
				<div className="learning-neu learning-path-list-card">
					<LearningDailyPlanner
						path={path}
						t={t}
						today={today}
						variant="path"
						onToggle={onToggleDaily}
						onOpenItem={onOpenDailyItem}
						onAdd={onAddDaily}
					/>
				</div>
			) : (
				<div className="space-y-4">
					{path.roadmapGraph?.nodes?.length ? (
						<div className="learning-neu learning-path-list-card !p-0 overflow-hidden">
							<LearningRoadmapExplorer
								path={path}
								t={t}
								locale={locale}
								onOpenTopic={topic => onSelectTopic?.(topic)}
								onScrapeResource={onScrapeRoadmapResource}
								onScrapeResources={onScrapeRoadmapResources}
								scrapeBusy={importBusy}
							/>
						</div>
					) : null}

					<section className="learning-neu learning-path-list-card">
						<div className="learning-path-list-head">
							<h2>{t.roadmapImportTitle}</h2>
							<p>{t.roadmapImportHint}</p>
						</div>
						<div className="learning-path-add-row !mt-5">
							<input
								className="learning-neu-inset"
								value={roadmapUrl}
								onChange={event => setRoadmapUrl(event.target.value)}
								placeholder={t.roadmapImportPlaceholder}
							/>
							<button
								type="button"
								disabled={!roadmapUrl.trim() || Boolean(importBusy)}
								onClick={() => onImportRoadmap(roadmapUrl.trim())}
								className="learning-pill-btn disabled:opacity-50"
							>
								{roadmapImportBusy ? (
									<Loader2 size={14} className="animate-spin" />
								) : (
									<Sparkles size={14} />
								)}
								{t.roadmapImportRun}
							</button>
						</div>
					</section>

					{roadmapDraft.length > 0 ? (
						<section className="learning-neu learning-path-list-card">
							<div className="learning-path-list-head">
								<h2>{t.editRoadmap}</h2>
							</div>
							<div className="mt-4 space-y-3">
								{roadmapDraft.map((section, sectionIndex) => (
									<div key={section.id} className="learning-neu-inset p-3">
										<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
											<input
												value={section.title}
												onChange={event =>
													setRoadmapDraft(current =>
														current.map((item, index) =>
															index === sectionIndex
																? { ...item, title: event.target.value }
																: item,
														),
													)
												}
												className="min-w-0 flex-1 border-none bg-transparent text-sm font-bold outline-none"
											/>
											{section.estimatedMinutes ? (
												<span className="text-xs font-semibold text-[var(--learn-ink-soft)]">
													~
													{section.estimatedHours ||
														Math.round((section.estimatedMinutes / 60) * 10) / 10}
													h
												</span>
											) : null}
										</div>
										<div className="space-y-2">
											{(section.topics || []).map((topic, topicIndex) => (
												<div key={topic.id} className="flex items-center gap-2">
													<input
														value={topic.title}
														onChange={event =>
															setRoadmapDraft(current =>
																current.map((item, index) =>
																	index === sectionIndex
																		? {
																				...item,
																				topics: item.topics.map((row, rowIndex) =>
																					rowIndex === topicIndex
																						? { ...row, title: event.target.value }
																						: row,
																				),
																			}
																		: item,
																),
															)
														}
														className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--learn-border-glass)] bg-white px-3 text-sm outline-none"
													/>
													<span className="shrink-0 text-xs text-[var(--learn-ink-faint)]">
														{topic.estimatedMinutes || 45}m
														{(topic.resources || []).length
															? ` · ${topic.resources.length}`
															: ''}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								<button type="button" onClick={onApplyRoadmap} className="learning-pill-btn">
									{t.applyRoadmap}
								</button>
								<button
									type="button"
									onClick={() => setRoadmapDraft([])}
									className="rounded-2xl border border-[var(--learn-border-glass)] px-4 py-2 text-sm font-bold"
								>
									{t.discardDraft}
								</button>
							</div>
						</section>
					) : null}

					{(path.sections || []).length > 0 ? (
						<section className="learning-neu learning-path-list-card">
							<div className="learning-path-list-head">
								<h2>{t.roadmap}</h2>
							</div>
							<div className="mt-4 space-y-4">
								{(path.sections || []).map(section => (
									<div key={section.id}>
										<p className="mb-2 flex items-center justify-between gap-2 font-bold text-[var(--learn-ink)]">
											<span>{section.title}</span>
											{section.estimatedMinutes ? (
												<span className="text-xs font-semibold text-[var(--learn-ink-soft)]">
													~
													{section.estimatedHours ||
														Math.round((section.estimatedMinutes / 60) * 10) / 10}
													h
												</span>
											) : null}
										</p>
										<ul className="space-y-1 text-sm text-[var(--learn-ink-soft)]">
											{(section.topics || []).map(topicItem => (
												<li key={topicItem.id} className="flex items-center gap-2">
													<ChevronRight
														size={14}
														className="shrink-0 text-[var(--learn-ink-faint)]"
													/>
													<button
														type="button"
														className="min-w-0 truncate text-start hover:underline"
														onClick={() => onSelectTopic?.(topicItem)}
													>
														{topicItem.title}
													</button>
													<span className="text-xs text-[var(--learn-ink-faint)]">
														· {labelDifficulty(topicItem.difficulty)}
														{topicItem.estimatedMinutes
															? ` · ${topicItem.estimatedMinutes}m`
															: ''}
														{(topicItem.resources || []).length
															? ` · ${topicItem.resources.length} links`
															: ''}
													</span>
												</li>
											))}
										</ul>
									</div>
								))}
							</div>
						</section>
					) : null}
				</div>
			)}
		</div>
	);
}

export function LearningPathWorkspace({
	path,
	topic,
	topicId,
	t,
	locale = 'en',
	labelStatus,
	labelDifficulty,
	today,
	workspaceTab,
	onWorkspaceTabChange,
	onBack,
	onTitleChange,
	onToggleFavorite,
	onSelectTopic,
	onClearTopic,
	onPatchPath,
	onPatchTopic,
	onToggleDaily,
	onOpenDailyItem,
	onAddDaily,
	onImportTopicUrl,
	onImportRoadmapUrl,
	onScrapeRoadmapResource,
	onScrapeRoadmapResources,
	importBusy,
	roadmapDraft,
	setRoadmapDraft,
	onApplyRoadmap,
	onDeletePath,
	onTopicModeChange,
	preferredTopicMode,
}) {
	const progress = useMemo(() => pathProgress(path), [path]);
	const [roadmapUrl, setRoadmapUrl] = useState('');
	const [topicMode, setTopicMode] = useState(() =>
		readStoredTopicMode(locale, preferredTopicMode),
	);
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });
	const [expandNonce, setExpandNonce] = useState(0);
	const [collapseNonce, setCollapseNonce] = useState(0);
	const menuButtonRef = useRef(null);
	const menuPanelRef = useRef(null);
	const showIndex = topicMode !== 'roadmap';
	const lastBuildStudyRef = useRef(
		topicMode === 'roadmap' ? defaultTopicMode(locale) : topicMode,
	);

	const changeTopicMode = nextMode => {
		if (nextMode === 'edit' || nextMode === 'study') {
			lastBuildStudyRef.current = nextMode;
		}
		setTopicMode(nextMode);
		writeStoredTopicMode(nextMode);
		onTopicModeChange?.(nextMode);
	};

	const updateMenuPosition = useCallback(() => {
		const button = menuButtonRef.current;
		if (!button) return;
		const rect = button.getBoundingClientRect();
		const panelWidth = menuPanelRef.current?.offsetWidth || 210;
		const isRtl =
			typeof document !== 'undefined' &&
			(document.documentElement.getAttribute('dir') === 'rtl' ||
				String(locale || '').toLowerCase().startsWith('ar'));
		const gap = 8;
		let left = isRtl ? rect.left : rect.right - panelWidth;
		left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
		setMenuCoords({
			top: Math.min(rect.bottom + gap, window.innerHeight - 8),
			left,
		});
	}, [locale]);

	useEffect(() => {
		if (!menuOpen) return undefined;
		updateMenuPosition();
		const frame = window.requestAnimationFrame(() => updateMenuPosition());
		const onDoc = event => {
			const target = event.target;
			if (menuButtonRef.current?.contains(target)) return;
			if (menuPanelRef.current?.contains(target)) return;
			setMenuOpen(false);
		};
		const onReposition = () => updateMenuPosition();
		document.addEventListener('mousedown', onDoc);
		window.addEventListener('resize', onReposition);
		window.addEventListener('scroll', onReposition, true);
		return () => {
			window.cancelAnimationFrame(frame);
			document.removeEventListener('mousedown', onDoc);
			window.removeEventListener('resize', onReposition);
			window.removeEventListener('scroll', onReposition, true);
		};
	}, [menuOpen, updateMenuPosition]);

	const closeMenu = () => setMenuOpen(false);

	const handleSelectTopic = nextTopic => {
		if (topicMode === 'roadmap') {
			changeTopicMode(lastBuildStudyRef.current || defaultTopicMode(locale));
		}
		onSelectTopic?.(nextTopic);
	};

	const handleToggleTopicDone = (topicItem, done) => {
		onPatchPath?.(pathItem => ({
			...pathItem,
			sections: (pathItem.sections || []).map(section => ({
				...section,
				topics: (section.topics || []).map(row => {
					if (row.id !== topicItem.id) return row;
					if (done) {
						return {
							...row,
							status: 'completed',
							progress: 100,
							mastery: Math.max(Number(row.mastery) || 0, 70),
							completedAt: new Date().toISOString(),
						};
					}
					return {
						...row,
						status: Number(row.progress) > 0 ? 'learning' : 'not_started',
						progress: Math.min(Number(row.progress) || 0, 90),
						completedAt: null,
					};
				}),
			})),
		}));
	};

	return (
		<div className="learning-landing learning-path-page flex min-h-0 flex-1 flex-col">
			<div className={cx('learning-landing__page', topic && 'learning-landing__page--topic-open')}>
				<LearningHeaderCard className="learning-header-card--path learning-path-header">
					<div className="learning-header-card__top learning-path-header__top">
						<button type="button" onClick={onBack} className="learning-path-back-btn">
							<ArrowLeft size={15} />
							{t.back}
						</button>
						<div className="learning-path-header__actions">
							<button
								type="button"
								onClick={onToggleFavorite}
								className="learning-path-icon-btn"
								aria-label={t.favorite}
							>
								<Star size={16} fill={path.favorite ? 'currentColor' : 'none'} />
							</button>
							<div className="learning-path-menu">
								<button
									ref={menuButtonRef}
									type="button"
									className="learning-path-icon-btn"
									aria-label={t.pathMenu}
									aria-expanded={menuOpen}
									aria-haspopup="menu"
									onClick={() => setMenuOpen(open => !open)}
								>
									<MoreHorizontal size={16} />
								</button>
								{menuOpen && typeof document !== 'undefined'
									? createPortal(
											<div
												ref={menuPanelRef}
												className="learning-path-menu__panel learning-path-menu__panel--portal"
												role="menu"
												style={{
													top: menuCoords.top,
													left: menuCoords.left,
												}}
											>
												<button
													type="button"
													role="menuitem"
													onClick={() => {
														setExpandNonce(value => value + 1);
														closeMenu();
													}}
												>
													{t.viewAll}
												</button>
												<button
													type="button"
													role="menuitem"
													onClick={() => {
														setCollapseNonce(value => value + 1);
														closeMenu();
													}}
												>
													{t.collapseAllSections}
												</button>
												<button
													type="button"
													role="menuitem"
													onClick={() => {
														changeTopicMode('roadmap');
														closeMenu();
													}}
												>
													{t.openFullRoadmap}
												</button>
												{topic ? (
													<button
														type="button"
														role="menuitem"
														onClick={() => {
															onClearTopic?.();
															changeTopicMode(
																lastBuildStudyRef.current || defaultTopicMode(locale),
															);
															closeMenu();
														}}
													>
														{t.closeTopic}
													</button>
												) : null}
												{onDeletePath ? (
													<button
														type="button"
														role="menuitem"
														className="is-danger"
														onClick={() => {
															closeMenu();
															onDeletePath(path);
														}}
													>
														{t.delete}
													</button>
												) : null}
											</div>,
											document.body,
										)
									: null}
							</div>
						</div>
					</div>
					<div className="learning-path-header__title-row">
						<div className="learning-path-header__title-block">
							<p className="learning-path-crumb">
								{path.category || 'General'} · {t[path.difficulty] || path.difficulty}
							</p>
							<input
								value={path.title || ''}
								onChange={event => onTitleChange?.(event.target.value)}
								className="learning-path-header__title-input"
								placeholder={t.titleLabel}
							/>
							<div className="learning-path-meta">
								<span className="learning-path-meta__count">
									{progress.done}/{progress.total} {t.topics}
								</span>
								<div className="learning-path-progress">
									<div
										className="learning-path-progress__fill"
										style={{ width: `${progress.percent}%` }}
									/>
								</div>
								<span className="learning-path-meta__pct">{progress.percent}%</span>
							</div>
						</div>
						<div
							className="learning-path-header__mode-toggle"
							data-mode={topicMode}
							data-count="3"
							role="tablist"
							aria-label="Topic mode"
						>
							<span className="learning-path-header__mode-thumb" aria-hidden />
							<button
								type="button"
								role="tab"
								aria-selected={topicMode === 'edit'}
								onClick={() => changeTopicMode('edit')}
								className={cx('learning-path-header__mode-btn', topicMode === 'edit' && 'is-active')}
							>
								<PenLine size={14} />
								{t.topicModeEdit}
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={topicMode === 'study'}
								onClick={() => changeTopicMode('study')}
								className={cx(
									'learning-path-header__mode-btn',
									topicMode === 'study' && 'is-active',
								)}
							>
								<Eye size={14} />
								{t.topicModeStudy}
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={topicMode === 'roadmap'}
								onClick={() => changeTopicMode('roadmap')}
								className={cx(
									'learning-path-header__mode-btn',
									topicMode === 'roadmap' && 'is-active',
								)}
							>
								<Map size={14} />
								{t.topicModeRoadmap}
							</button>
						</div>
					</div>
				</LearningHeaderCard>

				<div
					className={cx(
						'learning-path-layout',
						topic && showIndex && 'learning-path-layout--topic',
						!showIndex && 'learning-path-layout--roadmap',
					)}
				>
					{showIndex ? (
						<LearningPathIndex
							path={path}
							t={t}
							locale={locale}
							topicId={topicId}
							onSelectTopic={handleSelectTopic}
							expandNonce={expandNonce}
							collapseNonce={collapseNonce}
							onToggleTopicDone={handleToggleTopicDone}
							onAddSection={() =>
								onPatchPath(pathItem => ({
									...pathItem,
									sections: [
										...(pathItem.sections || []),
										createSection({
											title: `${t.section} ${(pathItem.sections || []).length + 1}`,
											order: (pathItem.sections || []).length,
											topics: [],
										}),
									],
								}))
							}
							onAddTopic={sectionIndex =>
								onPatchPath(pathItem => ({
									...pathItem,
									sections: pathItem.sections.map((item, index) =>
										index === sectionIndex
											? {
													...item,
													topics: [
														...(item.topics || []),
														createTopic({
															title: `${t.addTopic} ${(item.topics || []).length + 1}`,
														}),
													],
												}
											: item,
									),
								}))
							}
							onRenameSection={(sectionIndex, title) =>
								onPatchPath(pathItem => ({
									...pathItem,
									sections: pathItem.sections.map((item, index) =>
										index === sectionIndex ? { ...item, title } : item,
									),
								}))
							}
							onDeleteSection={sectionIndex => {
								const section = path.sections?.[sectionIndex];
								const removedTopicIds = new Set((section?.topics || []).map(item => item.id));
								onPatchPath(pathItem => ({
									...pathItem,
									sections: pathItem.sections.filter((_, index) => index !== sectionIndex),
								}));
								if (topicId && removedTopicIds.has(topicId)) onClearTopic?.();
							}}
							onRenameTopic={(sectionIndex, id, title) =>
								onPatchPath(pathItem => ({
									...pathItem,
									sections: pathItem.sections.map((item, index) =>
										index === sectionIndex
											? {
													...item,
													topics: (item.topics || []).map(topicItem =>
														topicItem.id === id ? { ...topicItem, title } : topicItem,
													),
												}
											: item,
									),
								}))
							}
							onDeleteTopic={(sectionIndex, id) => {
								onPatchPath(pathItem => ({
									...pathItem,
									sections: pathItem.sections.map((item, index) =>
										index === sectionIndex
											? {
													...item,
													topics: (item.topics || []).filter(topicItem => topicItem.id !== id),
												}
											: item,
									),
								}));
								if (topicId === id) onClearTopic?.();
							}}
						/>
					) : null}

					{topicMode === 'roadmap' ? (
						<div className="learning-path-main learning-path-main--roadmap">
							{path.roadmapGraph?.nodes?.length ? (
								<div className="learning-neu learning-path-list-card !p-0 overflow-hidden">
									<LearningRoadmapExplorer
										path={path}
										t={t}
										locale={locale}
										variant="full"
										onOpenTopic={nextTopic => handleSelectTopic(nextTopic)}
										onScrapeResource={onScrapeRoadmapResource}
										onScrapeResources={onScrapeRoadmapResources}
										scrapeBusy={importBusy}
									/>
								</div>
							) : (
								<section className="learning-neu learning-path-list-card">
									<div className="learning-path-list-head">
										<h2>{t.roadmapVisual}</h2>
										<p>{t.roadmapGraphEmpty}</p>
									</div>
									<div className="learning-path-add-row !mt-5">
										<input
											className="learning-neu-inset"
											value={roadmapUrl}
											onChange={event => setRoadmapUrl(event.target.value)}
											placeholder={t.roadmapImportPlaceholder}
										/>
										<button
											type="button"
											disabled={!roadmapUrl.trim() || Boolean(importBusy)}
											onClick={() => onImportRoadmapUrl?.(roadmapUrl.trim())}
											className="learning-pill-btn disabled:opacity-50"
										>
											{importBusy === 'roadmap' ? (
												<Loader2 size={14} className="animate-spin" />
											) : (
												<Sparkles size={14} />
											)}
											{t.roadmapImportRun}
										</button>
									</div>
								</section>
							)}
						</div>
					) : topic ? (
						<LearningTopicPanel
							topic={topic}
							path={path}
							t={t}
							locale={locale}
							mode={topicMode === 'study' ? 'study' : 'edit'}
							onPatch={onPatchTopic}
							onImportTopic={onImportTopicUrl}
							importBusy={importBusy === 'topic'}
						/>
					) : (
						<LearningPathHome
							path={path}
							t={t}
							today={today}
							workspaceTab={workspaceTab}
							onTabChange={onWorkspaceTabChange}
							onToggleDaily={onToggleDaily}
							onOpenDailyItem={onOpenDailyItem}
							onAddDaily={onAddDaily}
							roadmapUrl={roadmapUrl}
							setRoadmapUrl={setRoadmapUrl}
							onImportRoadmap={onImportRoadmapUrl}
							importBusy={importBusy}
							roadmapDraft={roadmapDraft}
							setRoadmapDraft={setRoadmapDraft}
							onApplyRoadmap={onApplyRoadmap}
							labelDifficulty={labelDifficulty}
							onSelectTopic={handleSelectTopic}
							onScrapeRoadmapResource={onScrapeRoadmapResource}
							onScrapeRoadmapResources={onScrapeRoadmapResources}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
