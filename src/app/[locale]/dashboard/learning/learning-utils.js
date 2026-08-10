export function uid(prefix = 'id') {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyLearningState() {
	return {
		paths: [],
		inbox: [],
		activity: [],
		prefs: {
			topicMode: null,
		},
		stats: {
			streakDays: 0,
			lastLearnDate: null,
			minutesThisWeek: 0,
			totalSessions: 0,
		},
		continueLearning: null,
	};
}

export function createTopic(partial = {}) {
	return {
		id: uid('topic'),
		title: '',
		description: '',
		status: 'not_started',
		difficulty: 'beginner',
		estimatedMinutes: 45,
		mastery: 0,
		confidence: 0,
		progress: 0,
		tags: [],
		keywords: [],
		prerequisites: [],
		contentMarkdown: '',
		primaryVideoUrl: '',
		videoTranscript: null,
		layoutBlocks: [],
		cards: [],
		summary: null,
		takeaways: [],
		examples: [],
		resources: [],
		videoSuggestions: [],
		lessonPacks: [],
		studySuggestions: [],
		references: [],
		sourceNodeId: '',
		nodeType: 'topic',
		notes: [],
		questions: [],
		flashcards: [],
		practice: [],
		favorite: false,
		completedAt: null,
		lastReviewedAt: null,
		nextReviewAt: null,
		updatedAt: new Date().toISOString(),
		...partial,
	};
}

export function createSection(partial = {}) {
	return {
		id: uid('section'),
		title: '',
		order: 0,
		topics: [],
		sourceNodeId: '',
		estimatedMinutes: 0,
		estimatedHours: 0,
		groupLabels: [],
		...partial,
	};
}

export const TOPIC_LAYOUT_BLOCK_TYPES = ['video', 'tickets', 'scraper', 'content', 'summary'];

export function createLayoutBlock(type, order = 0) {
	return {
		id: uid('lblock'),
		type,
		order,
	};
}

export function sortLayoutBlocks(blocks = []) {
	return [...(blocks || [])].sort(
		(a, b) => Number(a.order || 0) - Number(b.order || 0),
	);
}

/** Migrate legacy topics that pre-date layoutBlocks. */
export function resolveTopicLayoutBlocks(topic) {
	if (Array.isArray(topic?.layoutBlocks)) {
		return sortLayoutBlocks(topic.layoutBlocks);
	}
	const blocks = [];
	let order = 0;
	if (topic?.primaryVideoUrl) blocks.push(createLayoutBlock('video', order++));
	if ((topic?.cards || []).length) blocks.push(createLayoutBlock('tickets', order++));
	if (topic?.contentMarkdown) blocks.push(createLayoutBlock('content', order++));
	if (topic?.summary?.tldr) blocks.push(createLayoutBlock('summary', order++));
	return blocks;
}

/** Ensure a layout block type exists on the topic (e.g. summary after video summarize). */
export function ensureLayoutBlockType(topic, type) {
	const base = Array.isArray(topic?.layoutBlocks)
		? sortLayoutBlocks(topic.layoutBlocks)
		: resolveTopicLayoutBlocks(topic);
	if (base.some(block => block.type === type)) {
		return base.map((block, index) => ({ ...block, order: index }));
	}
	return [...base, createLayoutBlock(type, base.length)].map((block, index) => ({
		...block,
		order: index,
	}));
}

/** Ensure study/build can show scraped notes inside the topic file. */
export function ensureLayoutBlocksForScrape(topic) {
	const base = Array.isArray(topic?.layoutBlocks)
		? sortLayoutBlocks(topic.layoutBlocks)
		: resolveTopicLayoutBlocks(topic);
	const next = [...base];
	if (!next.some(block => block.type === 'content')) {
		next.push(createLayoutBlock('content', next.length));
	}
	if (!next.some(block => block.type === 'tickets')) {
		next.push(createLayoutBlock('tickets', next.length));
	}
	return next.map((block, index) => ({ ...block, order: index }));
}

export function createTopicCard(partial = {}) {
	return {
		id: uid('tcard'),
		type: 'ticket',
		title: '',
		body: '',
		order: 0,
		createdAt: new Date().toISOString(),
		...partial,
	};
}

export function createPath(partial = {}) {
	const now = new Date().toISOString();
	return {
		id: uid('path'),
		title: '',
		description: '',
		category: 'General',
		difficulty: 'beginner',
		goal: '',
		outcome: '',
		estimatedHours: 20,
		coverIcon: 'graduation',
		tags: [],
		favorite: false,
		dailyItems: [],
		createdAt: now,
		updatedAt: now,
		lastActivityAt: now,
		sections: [],
		projects: [],
		...partial,
	};
}

export function todayKey(date = new Date()) {
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
	return d.toISOString().slice(0, 10);
}

export function createDailyItem(partial = {}) {
	return {
		id: uid('daily'),
		title: '',
		topicId: null,
		kind: 'new',
		scheduledDate: todayKey(),
		completedAt: null,
		order: 0,
		...partial,
	};
}

export function isDailyItemDone(item) {
	return Boolean(item?.completedAt);
}

export function isDailyItemOverdue(item, today = todayKey()) {
	if (isDailyItemDone(item)) return false;
	return String(item.scheduledDate || '') < today;
}

export function classifyPathDailyItems(path, today = todayKey()) {
	const items = [...(path?.dailyItems || [])].sort(
		(a, b) =>
			Number(a.order || 0) - Number(b.order || 0) ||
			String(a.scheduledDate).localeCompare(String(b.scheduledDate)),
	);
	const overdue = [];
	const todayNew = [];
	const todayReview = [];
	const doneToday = [];

	items.forEach(item => {
		const done = isDailyItemDone(item);
		const completedToday = done && String(item.completedAt || '').slice(0, 10) === today;
		// Keep today's completions visible in their original bucket; hide older done items.
		if (done && !completedToday) return;

		const scheduled = String(item.scheduledDate || '');
		if (scheduled < today) {
			overdue.push(item);
			if (completedToday) doneToday.push(item);
			return;
		}
		if (scheduled === today) {
			if (item.kind === 'review') todayReview.push(item);
			else todayNew.push(item);
			if (completedToday) doneToday.push(item);
		}
	});

	const sortBucket = (a, b) => {
		const aDone = isDailyItemDone(a) ? 1 : 0;
		const bDone = isDailyItemDone(b) ? 1 : 0;
		if (aDone !== bDone) return aDone - bDone;
		const byDate = String(a.scheduledDate || '').localeCompare(String(b.scheduledDate || ''));
		if (byDate) return byDate;
		return Number(a.order || 0) - Number(b.order || 0);
	};

	overdue.sort(sortBucket);
	todayNew.sort(sortBucket);
	todayReview.sort(sortBucket);

	let overduePriority = 0;
	const overdueRanked = overdue.map(item => {
		if (isDailyItemDone(item)) return { ...item, priority: null };
		overduePriority += 1;
		return { ...item, priority: overduePriority };
	});

	return {
		overdue: overdueRanked,
		todayNew,
		todayReview,
		doneToday,
		pending: [
			...overdueRanked.filter(item => !isDailyItemDone(item)),
			...todayNew.filter(item => !isDailyItemDone(item)),
			...todayReview.filter(item => !isDailyItemDone(item)),
		],
	};
}

export function ensurePathDailyItems(path, today = todayKey()) {
	const existing = dedupeDailyItems([...(path.dailyItems || [])]);
	const occupiedTopicIds = new Set(
		existing
			.filter(item => {
				if (!item?.topicId) return false;
				if (!isDailyItemDone(item)) return true;
				// Keep today's completions from regenerating a duplicate unchecked row.
				return String(item.completedAt || '').slice(0, 10) === today;
			})
			.map(item => item.topicId),
	);

	const topics = flattenTopics(path);

	topics.forEach(topic => {
		const reviewDue =
			topic.status === 'needs_review' ||
			(topic.nextReviewAt && String(topic.nextReviewAt).slice(0, 10) <= today);
		if (!reviewDue || occupiedTopicIds.has(topic.id)) return;

		const scheduledDate =
			topic.nextReviewAt && String(topic.nextReviewAt).slice(0, 10) < today
				? String(topic.nextReviewAt).slice(0, 10)
				: today;

		existing.push(
			createDailyItem({
				title: topic.title,
				topicId: topic.id,
				kind: 'review',
				scheduledDate,
				order: existing.length,
			}),
		);
		occupiedTopicIds.add(topic.id);
	});

	const progress = pathProgress(path);
	const newCandidate =
		progress.current ||
		topics.find(topic => String(topic.status || '') === 'not_started') ||
		null;

	if (newCandidate && !occupiedTopicIds.has(newCandidate.id)) {
		const hasNewToday = existing.some(
			item =>
				item.topicId === newCandidate.id &&
				item.kind === 'new' &&
				item.scheduledDate === today,
		);
		if (!hasNewToday) {
			existing.push(
				createDailyItem({
					title: newCandidate.title,
					topicId: newCandidate.id,
					kind: 'new',
					scheduledDate: today,
					order: existing.length,
				}),
			);
		}
	}

	return { ...path, dailyItems: existing };
}

function dedupeDailyItems(items) {
	const map = new Map();
	(items || []).forEach(item => {
		if (!item) return;
		const key = item.topicId
			? `${item.topicId}|${item.kind || 'new'}|${item.scheduledDate || ''}`
			: `id:${item.id}`;
		const prev = map.get(key);
		if (!prev) {
			map.set(key, item);
			return;
		}
		const prevDone = Boolean(prev.completedAt);
		const nextDone = Boolean(item.completedAt);
		if (nextDone && !prevDone) {
			map.set(key, item);
			return;
		}
		if (nextDone === prevDone && Number(item.order || 0) >= Number(prev.order || 0)) {
			map.set(key, item);
		}
	});
	return [...map.values()];
}

export function toggleDailyItemComplete(items, itemId) {
	return (items || []).map(item => {
		if (item.id !== itemId) return item;
		if (item.completedAt) return { ...item, completedAt: null };
		return { ...item, completedAt: new Date().toISOString() };
	});
}

export function addManualDailyItem(path, title, kind = 'new', today = todayKey()) {
	const trimmed = String(title || '').trim();
	if (!trimmed) return path;
	return {
		...path,
		dailyItems: [
			...(path.dailyItems || []),
			createDailyItem({
				title: trimmed,
				kind,
				scheduledDate: today,
				order: (path.dailyItems || []).length,
			}),
		],
	};
}

export function aggregateDailyPlan(paths, today = todayKey()) {
	const rows = [];
	(paths || []).forEach(path => {
		// Classify persisted items only — never invent ephemeral rows here
		// (ephemeral ids can't be toggled optimistically against state).
		const groups = classifyPathDailyItems(path, today);
		['overdue', 'todayNew', 'todayReview'].forEach(bucket => {
			groups[bucket].forEach(item => {
				rows.push({ path, item, bucket });
			});
		});
	});

	const overdue = rows
		.filter(row => row.bucket === 'overdue')
		.sort((a, b) => {
			const aDone = isDailyItemDone(a.item) ? 1 : 0;
			const bDone = isDailyItemDone(b.item) ? 1 : 0;
			if (aDone !== bDone) return aDone - bDone;
			return String(a.item.scheduledDate || '').localeCompare(String(b.item.scheduledDate || ''));
		});

	let priority = 0;
	const overdueRanked = overdue.map(row => {
		if (isDailyItemDone(row.item)) return { ...row, item: { ...row.item, priority: null } };
		priority += 1;
		return { ...row, item: { ...row.item, priority } };
	});

	return {
		overdue: overdueRanked,
		todayNew: rows.filter(row => row.bucket === 'todayNew'),
		todayReview: rows.filter(row => row.bucket === 'todayReview'),
		all: [...overdueRanked, ...rows.filter(row => row.bucket !== 'overdue')],
	};
}

export function daysOverdue(item, today = todayKey()) {
	if (!item?.scheduledDate || item.scheduledDate >= today) return 0;
	const start = new Date(`${item.scheduledDate}T00:00:00`);
	const end = new Date(`${today}T00:00:00`);
	return Math.max(1, Math.round((end - start) / 86400000));
}

export function flattenTopics(path) {
	const topics = [];
	(path?.sections || []).forEach((section, sectionIndex) => {
		(section.topics || []).forEach((topic, topicIndex) => {
			topics.push({
				...topic,
				sectionId: section.id,
				sectionTitle: section.title,
				sectionIndex,
				topicIndex,
			});
		});
	});
	return topics;
}

export function isTopicDone(topic) {
	if (!topic) return false;
	return (
		['mastered', 'completed'].includes(String(topic.status || '').toLowerCase()) ||
		Number(topic.mastery) >= 100 ||
		Number(topic.progress) >= 100
	);
}

export function pathProgress(path) {
	const topics = flattenTopics(path);
	if (!topics.length) return { percent: 0, done: 0, total: 0, current: null };
	const done = topics.filter(t => isTopicDone(t)).length;
	const current =
		topics.find(t => ['learning', 'in_progress', 'needs_review'].includes(String(t.status || '').toLowerCase())) ||
		topics.find(t => Number(t.progress) > 0 && Number(t.progress) < 100) ||
		topics.find(t => String(t.status || '') === 'not_started') ||
		null;
	return {
		percent: Math.round((done / topics.length) * 100),
		done,
		total: topics.length,
		current,
	};
}

export function youtubeIdFromUrl(url) {
	const value = String(url || '').trim();
	if (!value) return null;
	try {
		const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
		if (parsed.hostname.includes('youtu.be')) {
			return parsed.pathname.replace(/^\//, '').split('/')[0] || null;
		}
		if (parsed.hostname.includes('youtube.com')) {
			return parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/)?.[1] || null;
		}
	} catch {
		return null;
	}
	return null;
}

export function detectResourceType(url) {
	const value = String(url || '').toLowerCase();
	if (/youtube\.com|youtu\.be/.test(value)) return 'youtube';
	if (/github\.com/.test(value)) return 'github';
	if (/\.pdf(\?|$)/.test(value)) return 'pdf';
	if (/docs\.|documentation|readthedocs/.test(value)) return 'documentation';
	return 'article';
}

export function pushActivity(state, entry) {
	const item = {
		id: uid('act'),
		at: new Date().toISOString(),
		...entry,
	};
	return {
		...state,
		activity: [item, ...(state.activity || [])].slice(0, 80),
	};
}

export function touchPath(path) {
	return { ...path, updatedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() };
}

export function updateTopicInPaths(paths, pathId, topicId, updater) {
	return (paths || []).map(path => {
		if (path.id !== pathId) return path;
		const sections = (path.sections || []).map(section => ({
			...section,
			topics: (section.topics || []).map(topic =>
				topic.id === topicId ? updater(topic) : topic,
			),
		}));
		return touchPath({ ...path, sections });
	});
}

export function findTopic(paths, pathId, topicId) {
	const path = (paths || []).find(item => item.id === pathId);
	if (!path) return { path: null, topic: null, section: null };
	for (const section of path.sections || []) {
		const topic = (section.topics || []).find(item => item.id === topicId);
		if (topic) return { path, topic, section };
	}
	return { path, topic: null, section: null };
}

export function normalizeLearningText(value, fallback = '') {
	if (typeof value === 'string') {
		const text = value.replace(/@currentYear@/g, String(new Date().getFullYear())).trim();
		if (!text || text === '[object Object]') return fallback;
		return text;
	}
	if (value && typeof value === 'object') {
		return normalizeLearningText(value.page || value.card || value.title || '', fallback);
	}
	return fallback;
}

export function sanitizeRoadmapGraph(graph) {
	if (!graph || typeof graph !== 'object') return null;
	return {
		...graph,
		title: normalizeLearningText(graph.title, ''),
		description: normalizeLearningText(graph.description, ''),
		nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
		edges: Array.isArray(graph.edges) ? graph.edges : [],
	};
}

/** Shrink roadmap payloads so PUT /learning/state stays under body limits. */
export function slimLearningStateForPersist(state) {
	const root = state && typeof state === 'object' ? state : {};
	return {
		...root,
		paths: (root.paths || []).map(slimPathForPersist),
		inbox: (root.inbox || []).slice(0, 80),
		activity: (root.activity || []).slice(0, 80),
	};
}

function slimPathForPersist(path) {
	if (!path || typeof path !== 'object') return path;
	return {
		...path,
		description: String(path.description || '').slice(0, 2000),
		descriptionAr: path.descriptionAr ? String(path.descriptionAr).slice(0, 2000) : undefined,
		titleAr: path.titleAr || undefined,
		goalAr: path.goalAr || undefined,
		outcomeAr: path.outcomeAr || undefined,
		i18nAr: path.i18nAr || undefined,
		dailyItems: (path.dailyItems || []).map(item => ({
			...item,
			titleAr: item?.titleAr || undefined,
		})),
		roadmapGraph: slimRoadmapGraph(path.roadmapGraph),
		sections: (path.sections || []).map(section => ({
			...section,
			titleAr: section?.titleAr || undefined,
			topics: (section.topics || []).map(slimTopicForPersist),
		})),
	};
}

function slimRoadmapGraph(graph) {
	if (!graph || typeof graph !== 'object') return null;
	const clean = sanitizeRoadmapGraph(graph);
	return {
		slug: clean.slug || '',
		title: clean.title || '',
		description: String(clean.description || '').slice(0, 800),
		nodes: (clean.nodes || []).map(node => ({
			id: node.id,
			type: node.type,
			label: node.label,
			x: Number(node.x) || 0,
			y: Number(node.y) || 0,
			width: Number(node.width) || 160,
			height: Number(node.height) || 40,
		})),
		edges: (clean.edges || []).map(edge => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			edgeStyle: edge.edgeStyle || 'solid',
		})),
	};
}

function slimVideoTranscript(transcript) {
	if (!transcript || typeof transcript !== 'object') return null;
	return {
		videoId: transcript.videoId || '',
		language: transcript.language || '',
		languageName: transcript.languageName || '',
		isAutoGenerated: Boolean(transcript.isAutoGenerated),
		fetchedAt: transcript.fetchedAt || null,
		translatedAt: transcript.translatedAt || null,
		cues: (transcript.cues || []).slice(0, 1500).map((cue, index) => ({
			id: cue.id || `cue_${index}`,
			start: Number(cue.start) || 0,
			end: Number(cue.end) || 0,
			text: String(cue.text || '').slice(0, 400),
			...(cue.textAr ? { textAr: String(cue.textAr).slice(0, 400) } : {}),
		})),
	};
}

function slimTopicForPersist(topic) {
	if (!topic || typeof topic !== 'object') return topic;
	const description = String(topic.description || '').slice(0, 1200);
	const contentRaw = String(topic.contentMarkdown || '');
	const contentMarkdown =
		contentRaw && contentRaw !== description ? contentRaw.slice(0, 20000) : description;
	return {
		...topic,
		description,
		contentMarkdown,
		primaryVideoUrl: String(topic.primaryVideoUrl || '').slice(0, 500),
		videoTranscript: slimVideoTranscript(topic.videoTranscript),
		keywords: (topic.keywords || topic.tags || []).slice(0, 16),
		tags: (topic.tags || topic.keywords || []).slice(0, 16),
		takeaways: (topic.takeaways || []).slice(0, 10),
		examples: (topic.examples || []).slice(0, 8),
		resources: (topic.resources || []).slice(0, 40).map(resource => ({
			id: resource.id || resource.url,
			title: resource.title,
			titleAr: resource.titleAr || undefined,
			url: resource.url,
			type: resource.type || 'article',
			source: resource.source || '',
		})),
		videoSuggestions: (topic.videoSuggestions || []).slice(0, 12).map(resource => ({
			id: resource.id || resource.url,
			title: resource.title,
			titleAr: resource.titleAr || undefined,
			url: resource.url,
			type: resource.type || 'video',
			source: resource.source || '',
		})),
		lessonPacks: (topic.lessonPacks || []).slice(0, 8).map(pack => ({
			id: pack.id || pack.slug || pack.title,
			title: pack.title,
			titleAr: pack.titleAr || undefined,
			slug: pack.slug || '',
			description: String(pack.description || '').slice(0, 400),
			descriptionAr: pack.descriptionAr ? String(pack.descriptionAr).slice(0, 400) : undefined,
			readingTime: Number(pack.readingTime) || 0,
			lessonCount: Number(pack.lessonCount) || 0,
			quizCount: Number(pack.quizCount) || 0,
			projectCount: Number(pack.projectCount) || 0,
			url: pack.url || '',
		})),
		studySuggestions: (topic.studySuggestions || []).slice(0, 10).map(item => ({
			id: item.id || item.url,
			type: item.type || 'search',
			title: item.title,
			titleAr: item.titleAr || undefined,
			url: item.url,
		})),
		references: (topic.references || []).slice(0, 20).map(reference => ({
			id: reference.id || reference.url,
			title: reference.title,
			titleAr: reference.titleAr || undefined,
			url: reference.url,
			type: reference.type || 'article',
			summary: String(reference.summary || '').slice(0, 600),
			summaryAr: reference.summaryAr ? String(reference.summaryAr).slice(0, 600) : undefined,
			scrapedAt: reference.scrapedAt || null,
		})),
		cards: (topic.cards || []).map(card => ({
			...card,
			titleAr: card.titleAr || undefined,
			bodyAr: card.bodyAr || undefined,
		})),
		flashcards: (topic.flashcards || []).map(card => ({
			...card,
			frontAr: card.frontAr || undefined,
			backAr: card.backAr || undefined,
		})),
		contentMarkdownAr: topic.contentMarkdownAr
			? String(topic.contentMarkdownAr).slice(0, 20000)
			: undefined,
		descriptionAr: topic.descriptionAr ? String(topic.descriptionAr).slice(0, 1200) : undefined,
		titleAr: topic.titleAr || undefined,
		i18nAr: topic.i18nAr || undefined,
		takeawaysAr: topic.takeawaysAr || undefined,
		examplesAr: topic.examplesAr || undefined,
		summary: topic.summary || undefined,
	};
}

export const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'];
export const STATUS_OPTIONS = [
	'not_started',
	'learning',
	'in_progress',
	'needs_review',
	'mastered',
	'completed',
];
