'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	BookOpen,
	Clock,
	ExternalLink,
	Heart,
	Loader2,
	Maximize2,
	Minimize2,
	Sparkles,
	Star,
	X,
} from 'lucide-react';
import MarkdownMessage from '../ai-free/MarkdownMessage';
import { learningText } from './learning-localize';

const cx = (...parts) => parts.filter(Boolean).join(' ');

function displayText(value, fallback = '') {
	if (typeof value === 'string') {
		const text = value.replace(/@currentYear@/g, String(new Date().getFullYear())).trim();
		if (!text || text === '[object Object]') return fallback;
		return text;
	}
	if (value && typeof value === 'object') {
		return displayText(value.page || value.card || value.title || '', fallback);
	}
	return fallback;
}

function nodeClass(type) {
	if (type === 'topic') return 'is-topic';
	if (type === 'subtopic') return 'is-subtopic';
	if (type === 'label') return 'is-label';
	if (type === 'title') return 'is-title';
	if (type === 'paragraph') return 'is-paragraph';
	if (type === 'button') return 'is-button';
	return 'is-other';
}

function resourceKey(resource) {
	return String(resource?.id || resource?.url || resource?.title || '');
}

export function LearningRoadmapExplorer({
	path,
	t,
	locale = 'en',
	onOpenTopic,
	onScrapeResource,
	onScrapeResources,
	scrapeBusy = false,
	variant = 'default',
}) {
	const graph = path?.roadmapGraph;
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [panelTab, setPanelTab] = useState('resources');
	const [expanded, setExpanded] = useState(false);
	const [viewportWidth, setViewportWidth] = useState(920);
	const [selectedResourceKeys, setSelectedResourceKeys] = useState(() => new Set());
	const [saveNotice, setSaveNotice] = useState(null);
	const canvasWrapRef = useRef(null);

	const topicByNodeId = useMemo(() => {
		const map = new Map();
		for (const section of path?.sections || []) {
			for (const topic of section.topics || []) {
				if (topic.sourceNodeId) map.set(String(topic.sourceNodeId), { topic, section });
			}
		}
		return map;
	}, [path?.sections]);

	const bounds = useMemo(() => {
		const nodes = graph?.nodes || [];
		if (!nodes.length) return { minX: 0, minY: 0, width: 1000, height: 800 };
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const node of nodes) {
			minX = Math.min(minX, Number(node.x) || 0);
			minY = Math.min(minY, Number(node.y) || 0);
			maxX = Math.max(maxX, (Number(node.x) || 0) + (Number(node.width) || 160));
			maxY = Math.max(maxY, (Number(node.y) || 0) + (Number(node.height) || 40));
		}
		return {
			minX: minX - 40,
			minY: minY - 40,
			width: Math.max(640, maxX - minX + 80),
			height: Math.max(480, maxY - minY + 80),
		};
	}, [graph?.nodes]);

	const scaleBasis = Math.max(320, viewportWidth - (expanded ? 36 : 48));
	const scale = Math.min(1, Math.max(0.42, scaleBasis / bounds.width));
	const selected = selectedNodeId ? topicByNodeId.get(String(selectedNodeId)) : null;
	const selectedTopic = selected?.topic || null;
	const selectedNode = (graph?.nodes || []).find(node => node.id === selectedNodeId);
	const freeResources = selectedTopic?.resources || [];
	const allResourceKeys = useMemo(
		() => freeResources.map(resourceKey).filter(Boolean),
		[freeResources],
	);
	const allResourcesSelected =
		allResourceKeys.length > 0 && allResourceKeys.every(key => selectedResourceKeys.has(key));

	useEffect(() => {
		const node = canvasWrapRef.current;
		if (!node || typeof ResizeObserver === 'undefined') return undefined;
		const observer = new ResizeObserver(entries => {
			const width = entries[0]?.contentRect?.width;
			if (width) setViewportWidth(width);
		});
		observer.observe(node);
		setViewportWidth(node.clientWidth || 920);
		return () => observer.disconnect();
	}, [expanded, Boolean(selectedTopic || selectedNode)]);

	useEffect(() => {
		if (!expanded) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') setExpanded(false);
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', onKey);
		};
	}, [expanded]);

	useEffect(() => {
		setSelectedResourceKeys(new Set());
		setSaveNotice(null);
		setPanelTab('resources');
	}, [selectedNodeId]);

	useEffect(() => {
		if (!selectedNodeId) return undefined;
		const frame = window.requestAnimationFrame(() => {
			const nodes = canvasWrapRef.current?.querySelectorAll('[data-roadmap-node]');
			const target = nodes
				? [...nodes].find(item => item.getAttribute('data-roadmap-node') === String(selectedNodeId))
				: null;
			target?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
		});
		return () => window.cancelAnimationFrame(frame);
	}, [selectedNodeId, scale, expanded]);

	const toggleResource = key => {
		setSelectedResourceKeys(current => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const toggleSelectAllResources = () => {
		setSelectedResourceKeys(current => {
			if (allResourceKeys.length && allResourceKeys.every(key => current.has(key))) {
				return new Set();
			}
			return new Set(allResourceKeys);
		});
	};

	const showSavedNotice = (topic, count = 1) => {
		setSaveNotice({
			topicTitle: topic?.title || '',
			count,
			at: Date.now(),
		});
		setPanelTab('resources');
	};

	const handleScrapeOne = async resource => {
		if (!selectedTopic || !resource?.url) return;
		await onScrapeResource?.(selectedTopic, resource);
		showSavedNotice(selectedTopic, 1);
	};

	const handleScrapeSelected = async () => {
		if (!selectedTopic) return;
		const picked = freeResources.filter(resource => selectedResourceKeys.has(resourceKey(resource)));
		if (!picked.length) return;
		if (typeof onScrapeResources === 'function') {
			await onScrapeResources(selectedTopic, picked);
		} else {
			for (const resource of picked) {
				await onScrapeResource?.(selectedTopic, resource);
			}
		}
		showSavedNotice(selectedTopic, picked.length);
		setSelectedResourceKeys(new Set());
	};

	if (!graph?.nodes?.length) {
		return (
			<div className="learning-roadmap-empty">
				<p>{t.roadmapGraphEmpty}</p>
			</div>
		);
	}

	const explorer = (
		<div
			className={cx(
				'learning-roadmap-explorer',
				variant === 'full' && 'is-full',
				expanded && 'is-expanded',
				(selectedTopic || selectedNode) && 'has-panel',
			)}
		>
			<div className="learning-roadmap-explorer__canvas-wrap" ref={canvasWrapRef}>
				<div className="learning-roadmap-explorer__meta">
					<div>
						<p className="learning-roadmap-explorer__eyebrow">{t.roadmapVisual}</p>
						<h3>{displayText(graph.title, displayText(path.title, 'Roadmap'))}</h3>
						{displayText(graph.description) ? <p>{displayText(graph.description)}</p> : null}
					</div>
					<div className="learning-roadmap-explorer__stats">
						<span>
							<Clock size={14} />
							{Number(path.estimatedHours) || graph.estimatedHours || '—'}h
						</span>
						<span>
							<BookOpen size={14} />
							{(path.sections || []).reduce((sum, section) => sum + (section.topics?.length || 0), 0)}{' '}
							{t.topics}
						</span>
						<button
							type="button"
							className={cx('learning-roadmap-explorer__expand', expanded && 'is-active')}
							onClick={() => setExpanded(value => !value)}
							aria-label={expanded ? t.exitRoadmapFullscreen : t.expandRoadmapFullscreen}
							title={expanded ? t.exitRoadmapFullscreen : t.expandRoadmapFullscreen}
						>
							{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
							<span>{expanded ? t.exitRoadmapFullscreen : t.expandRoadmapFullscreen}</span>
						</button>
					</div>
				</div>

				<div className="learning-roadmap-canvas-scroll">
					<div
						className="learning-roadmap-canvas"
						style={{
							width: bounds.width * scale,
							height: bounds.height * scale,
						}}
					>
						<svg className="learning-roadmap-canvas__edges" width="100%" height="100%">
							{(graph.edges || []).map(edge => {
								const source = (graph.nodes || []).find(node => node.id === edge.source);
								const target = (graph.nodes || []).find(node => node.id === edge.target);
								if (!source || !target) return null;
								const x1 = (source.x + source.width / 2 - bounds.minX) * scale;
								const y1 = (source.y + source.height / 2 - bounds.minY) * scale;
								const x2 = (target.x + target.width / 2 - bounds.minX) * scale;
								const y2 = (target.y + target.height / 2 - bounds.minY) * scale;
								const dashed = edge.edgeStyle === 'dashed';
								return (
									<line
										key={edge.id}
										x1={x1}
										y1={y1}
										x2={x2}
										y2={y2}
										className={cx('learning-roadmap-edge', dashed && 'is-dashed')}
									/>
								);
							})}
						</svg>

						{(graph.nodes || [])
							.filter(node => ['topic', 'subtopic', 'label', 'title', 'button', 'paragraph'].includes(node.type))
							.map(node => {
								const linked = topicByNodeId.get(String(node.id));
								const clickable = Boolean(linked) || node.type === 'topic' || node.type === 'subtopic';
								const Tag = clickable ? 'button' : 'div';
								return (
									<Tag
										key={node.id}
										type={clickable ? 'button' : undefined}
										data-roadmap-node={node.id}
										className={cx(
											'learning-roadmap-node',
											nodeClass(node.type),
											selectedNodeId === node.id && 'is-selected',
											linked?.topic?.status === 'completed' && 'is-done',
										)}
										style={{
											left: (node.x - bounds.minX) * scale,
											top: (node.y - bounds.minY) * scale,
											width: Math.max(72, (node.width || 160) * scale),
											minHeight: Math.max(28, (node.height || 40) * scale),
										}}
										onClick={() => {
											if (!clickable) return;
											setSelectedNodeId(node.id);
											setPanelTab('resources');
										}}
									>
										<span>{node.label || linked?.topic?.title || node.type}</span>
										{linked?.topic?.estimatedMinutes ? (
											<em>{linked.topic.estimatedMinutes}m</em>
										) : null}
									</Tag>
								);
							})}
					</div>
				</div>
			</div>

			{selectedTopic || selectedNode ? (
				<aside className="learning-roadmap-panel">
					<div className="learning-roadmap-panel__top">
						<div className="learning-roadmap-panel__tabs" role="tablist">
							<button
								type="button"
								role="tab"
								aria-selected={panelTab === 'resources'}
								className={cx(panelTab === 'resources' && 'is-active')}
								onClick={() => setPanelTab('resources')}
							>
								{t.roadmapResources}
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={panelTab === 'content'}
								className={cx(panelTab === 'content' && 'is-active')}
								onClick={() => setPanelTab('content')}
							>
								{t.roadmapTopicContent}
							</button>
						</div>
						<button
							type="button"
							className="learning-roadmap-panel__close"
							onClick={() => setSelectedNodeId(null)}
							aria-label={t.close}
						>
							<X size={16} />
						</button>
					</div>

					<div className="learning-roadmap-panel__body">
						<p className="learning-roadmap-panel__eyebrow">
							{learningText(selected?.section, 'title', locale) ||
								learningText(graph, 'title', locale) ||
								graph.title}
							{selectedTopic?.estimatedMinutes
								? ` · ${selectedTopic.estimatedMinutes} ${t.minutes || 'min'}`
								: ''}
						</p>
						<h2 className="learning-roadmap-panel__title">
							{learningText(selectedTopic, 'title', locale) || selectedNode?.label}
						</h2>

						{selectedTopic ? (
							<button
								type="button"
								className="learning-roadmap-panel__open"
								onClick={() => {
									setExpanded(false);
									onOpenTopic?.(selectedTopic);
								}}
							>
								<Sparkles size={15} />
								{t.openTopic}
							</button>
						) : null}

						{panelTab === 'content' ? (
							<div className="learning-roadmap-panel__content">
								{(selectedTopic?.keywords || selectedTopic?.tags || []).length ? (
									<div className="learning-roadmap-keywords">
										{(selectedTopic.keywords || selectedTopic.tags).map(keyword => (
											<span key={keyword}>{keyword}</span>
										))}
									</div>
								) : null}

								{selectedTopic?.contentMarkdown || selectedTopic?.description ? (
									<div className="learning-roadmap-prose">
										<MarkdownMessage
											content={selectedTopic.contentMarkdown || selectedTopic.description}
										/>
									</div>
								) : (
									<p className="learning-roadmap-panel__empty">{t.roadmapNoContent}</p>
								)}

								{(selectedTopic?.takeaways || []).length ? (
									<div className="learning-roadmap-takeaways">
										<h3>{t.roadmapTakeaways}</h3>
										<ul>
											{selectedTopic.takeaways.map(item => (
												<li key={item}>{item}</li>
											))}
										</ul>
									</div>
								) : null}
							</div>
						) : (
							<div className="learning-roadmap-panel__resources">
								{saveNotice ? (
									<div className="learning-roadmap-save-banner">
										<p>
											<strong>{t.roadmapScrapeSavedTitle}</strong>
											{' — '}
											{t.roadmapScrapeSavedBody
												?.replace('{topic}', saveNotice.topicTitle || selectedTopic?.title || '')
												?.replace('{count}', String(saveNotice.count || 1))}
										</p>
										<div className="learning-roadmap-save-banner__actions">
											<button
												type="button"
												onClick={() => {
													const el = document.getElementById('roadmap-saved-references');
													el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
												}}
											>
												{t.roadmapViewSavedReferences}
											</button>
											<button
												type="button"
												onClick={() => {
													setExpanded(false);
													onOpenTopic?.(selectedTopic);
												}}
											>
												{t.openTopic}
											</button>
										</div>
									</div>
								) : null}

								{(selectedTopic?.videoSuggestions || []).length || selectedTopic?.primaryVideoUrl ? (
									<section className="learning-roadmap-section">
										<div className="learning-roadmap-section__head">
											<h3>
												<Sparkles size={16} className="is-gold" />
												{t.roadmapVideos}
											</h3>
										</div>
										{(selectedTopic.videoSuggestions?.length
											? selectedTopic.videoSuggestions
											: [
													{
														id: selectedTopic.primaryVideoUrl,
														title: selectedTopic.title,
														url: selectedTopic.primaryVideoUrl,
														type: 'video',
													},
												]
										).map(resource => (
											<article key={resource.id || resource.url} className="learning-roadmap-suggest-card">
												<span className="learning-roadmap-tag">{resource.type || 'video'}</span>
												<a
													href={resource.url}
													target="_blank"
													rel="noreferrer"
													className="learning-roadmap-suggest-link"
												>
													{learningText(resource, 'title', locale)}
													<ExternalLink size={13} />
												</a>
											</article>
										))}
									</section>
								) : null}

								{(selectedTopic?.studySuggestions || []).length ? (
									<section className="learning-roadmap-section">
										<div className="learning-roadmap-section__head">
											<h3>
												<Sparkles size={16} className="is-gold" />
												{t.roadmapStudySuggestions}
											</h3>
										</div>
										{selectedTopic.studySuggestions.map(item => (
											<article key={item.id || item.url} className="learning-roadmap-suggest-card">
												<span className="learning-roadmap-tag">{item.type || 'search'}</span>
												<a
													href={item.url}
													target="_blank"
													rel="noreferrer"
													className="learning-roadmap-suggest-link"
												>
													{learningText(item, 'title', locale)}
													<ExternalLink size={13} />
												</a>
											</article>
										))}
									</section>
								) : null}

								{(selectedTopic?.lessonPacks || []).length ? (
									<section className="learning-roadmap-section">
										<div className="learning-roadmap-section__head">
											<h3>
												<BookOpen size={16} className="is-teal" />
												{t.roadmapLessonPacks}
											</h3>
										</div>
										{selectedTopic.lessonPacks.map(pack => (
											<article
												key={pack.id || pack.slug || pack.title}
												className="learning-roadmap-suggest-card"
											>
												<span className="learning-roadmap-tag">course</span>
												{pack.url ? (
													<a
														href={pack.url}
														target="_blank"
														rel="noreferrer"
														className="learning-roadmap-suggest-link"
													>
														{pack.title}
														<ExternalLink size={13} />
													</a>
												) : (
													<span className="learning-roadmap-suggest-link">{pack.title}</span>
												)}
												{pack.description ? (
													<p className="learning-roadmap-suggest-desc">{pack.description}</p>
												) : null}
											</article>
										))}
									</section>
								) : null}

								<section className="learning-roadmap-section">
									<div className="learning-roadmap-section__head">
										<h3>
											<Heart size={16} className="is-pink" />
											{t.roadmapFreeResources}
										</h3>
										{freeResources.length ? (
											<button
												type="button"
												className="learning-roadmap-select-all"
												onClick={toggleSelectAllResources}
											>
												<input
													type="checkbox"
													readOnly
													checked={allResourcesSelected}
													tabIndex={-1}
													aria-hidden
												/>
												{allResourcesSelected ? t.deselectAllResources : t.selectAllResources}
											</button>
										) : null}
									</div>

									{freeResources.length ? (
										<button
											type="button"
											className="learning-roadmap-scrape-selected"
											disabled={!selectedResourceKeys.size || Boolean(scrapeBusy)}
											onClick={handleScrapeSelected}
										>
											{scrapeBusy === 'bulk' ? (
												<Loader2 size={13} className="animate-spin" />
											) : (
												<Sparkles size={13} />
											)}
											{t.scrapeSelectedResources}
											{selectedResourceKeys.size ? ` (${selectedResourceKeys.size})` : ''}
										</button>
									) : null}

									<p className="learning-roadmap-section__desc">{t.roadmapScrapeDestinationHint}</p>

									{freeResources.length ? (
										<div className="learning-roadmap-resource-cards">
											{freeResources.map(resource => {
												const key = resourceKey(resource);
												const checked = selectedResourceKeys.has(key);
												return (
													<article
														key={key}
														className={cx('learning-roadmap-resource-card', checked && 'is-checked')}
													>
														<div className="learning-roadmap-resource-card__top">
															<label className="learning-roadmap-resource-check">
																<input
																	type="checkbox"
																	checked={checked}
																	onChange={() => toggleResource(key)}
																	aria-label={t.selectResource}
																/>
															</label>
															<div className="learning-roadmap-resource-card__body">
																<span className="learning-roadmap-tag">
																	{resource.type || 'article'}
																</span>
																<a
																	href={resource.url}
																	target="_blank"
																	rel="noreferrer"
																	className="learning-roadmap-resource-link"
																>
																	{learningText(resource, 'title', locale)}
																	<ExternalLink size={13} />
																</a>
															</div>
														</div>
														<button
															type="button"
															disabled={Boolean(scrapeBusy)}
															onClick={() => handleScrapeOne(resource)}
															className="learning-roadmap-btn-scrape"
														>
															{scrapeBusy === resource.url ? (
																<Loader2 size={13} className="animate-spin" />
															) : (
																<Sparkles size={13} />
															)}
															{t.roadmapScrapeResource}
														</button>
													</article>
												);
											})}
										</div>
									) : (
										<p className="learning-roadmap-panel__empty">{t.roadmapNoResources}</p>
									)}
								</section>

								<section className="learning-roadmap-section" id="roadmap-saved-references">
									<div className="learning-roadmap-section__head">
										<h3>
											<Star size={16} className="is-gold" fill="currentColor" />
											{t.roadmapReferences}
										</h3>
									</div>
									<p className="learning-roadmap-section__desc is-muted">
										{(selectedTopic?.references || []).length
											? t.roadmapReferencesHint
											: t.roadmapReferencesEmpty || t.roadmapReferencesHint}
									</p>
									{(selectedTopic?.references || []).length ? (
										<ul className="learning-roadmap-reference-list">
											{selectedTopic.references.map(reference => (
												<li key={reference.id || reference.url}>
													<a href={reference.url} target="_blank" rel="noreferrer">
														{reference.title}
														<ExternalLink size={13} />
													</a>
													{reference.summary ? <p>{reference.summary}</p> : null}
												</li>
											))}
										</ul>
									) : null}
								</section>
							</div>
						)}
					</div>
				</aside>
			) : null}
		</div>
	);

	if (expanded && typeof document !== 'undefined') {
		return (
			<>
				<div className="learning-roadmap-explorer-spacer" aria-hidden />
				{createPortal(explorer, document.body)}
			</>
		);
	}

	return explorer;
}
