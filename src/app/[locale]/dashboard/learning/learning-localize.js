/**
 * Free bilingual helpers for Learning content.
 * Source of truth stays in English fields; Arabic mirrors live in *Ar + i18nAr.sourceHash.
 */

export function isArabicLocale(locale) {
	return String(locale || '')
		.toLowerCase()
		.startsWith('ar');
}

/** Fast non-crypto hash for stale-detection (djb2). */
export function hashText(value) {
	const text = String(value || '');
	let hash = 5381;
	for (let i = 0; i < text.length; i += 1) {
		hash = (hash * 33) ^ text.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
}

export function learningText(entity, field, locale, fallback = '') {
	if (!entity || typeof entity !== 'object') return fallback;
	const source = entity[field];
	const sourceText =
		typeof source === 'string'
			? source
			: source && typeof source === 'object'
				? String(source.page || source.card || source.title || '')
				: String(source || '');
	if (!isArabicLocale(locale)) return sourceText || fallback;
	const ar = entity[`${field}Ar`];
	if (typeof ar === 'string' && ar.trim()) return ar;
	return sourceText || fallback;
}

function joinSourceParts(parts) {
	return parts
		.map(part => String(part || '').trim())
		.filter(Boolean)
		.join('\n§\n');
}

export function pathShellFingerprint(path) {
	if (!path) return '';
	const parts = [
		path.title,
		path.description,
		path.goal,
		path.outcome,
		...(path.dailyItems || []).map(item => item?.title),
		...(path.sections || []).flatMap(section => [
			section?.title,
			...(section?.topics || []).map(topic => topic?.title),
		]),
	];
	return joinSourceParts(parts);
}

export function pathSourceFingerprint(path) {
	if (!path) return '';
	const parts = [
		pathShellFingerprint(path),
		...(path.sections || []).flatMap(section =>
			(section?.topics || []).map(topic => topicSourceFingerprint(topic)),
		),
	];
	return joinSourceParts(parts);
}

export function topicSourceFingerprint(topic) {
	if (!topic) return '';
	const summary = topic.summary && typeof topic.summary === 'object' ? topic.summary : {};
	const parts = [
		topic.title,
		topic.description,
		topic.contentMarkdown,
		summary.tldr,
		...(summary.keyConcepts || []),
		...(summary.remember || []),
		...(summary.takeaways || topic.takeaways || []),
		...(summary.terms || []).map(term => `${term?.term || ''}:${term?.definition || ''}`),
		...(topic.examples || []),
		...(topic.cards || []).map(card => `${card?.title || ''}\n${card?.body || ''}`),
		...(topic.flashcards || []).map(card => `${card?.front || ''}\n${card?.back || ''}`),
		...(topic.resources || []).map(item => item?.title),
		...(topic.videoSuggestions || []).map(item => item?.title),
		...(topic.lessonPacks || []).map(item => `${item?.title || ''}\n${item?.description || ''}`),
		...(topic.studySuggestions || []).map(item => item?.title),
		...(topic.references || []).map(item => `${item?.title || ''}\n${item?.summary || ''}`),
	];
	return joinSourceParts(parts);
}

export function pathNeedsArabic(path) {
	if (!path) return false;
	const hash = hashText(pathShellFingerprint(path));
	return path.i18nAr?.shellHash !== hash || !path.titleAr;
}

export function topicNeedsArabic(topic) {
	if (!topic) return false;
	const hash = hashText(topicSourceFingerprint(topic));
	return topic.i18nAr?.sourceHash !== hash || !topic.titleAr;
}

export function stripPathShellArabic(path) {
	if (!path || typeof path !== 'object') return path;
	const next = { ...path };
	delete next.titleAr;
	delete next.descriptionAr;
	delete next.goalAr;
	delete next.outcomeAr;
	if (next.i18nAr) {
		const { shellHash, shellTranslatedAt, ...rest } = next.i18nAr;
		next.i18nAr = Object.keys(rest).length ? rest : undefined;
	}
	next.dailyItems = (next.dailyItems || []).map(item => {
		if (!item || typeof item !== 'object') return item;
		const copy = { ...item };
		delete copy.titleAr;
		return copy;
	});
	next.sections = (next.sections || []).map(section => {
		if (!section || typeof section !== 'object') return section;
		const copy = { ...section };
		delete copy.titleAr;
		copy.topics = (copy.topics || []).map(topic => {
			if (!topic || typeof topic !== 'object') return topic;
			const topicCopy = { ...topic };
			delete topicCopy.titleAr;
			return topicCopy;
		});
		return copy;
	});
	return next;
}

export function stripPathArabic(path) {
	if (!path || typeof path !== 'object') return path;
	const next = { ...path };
	delete next.titleAr;
	delete next.descriptionAr;
	delete next.goalAr;
	delete next.outcomeAr;
	delete next.i18nAr;
	next.dailyItems = (next.dailyItems || []).map(item => {
		if (!item || typeof item !== 'object') return item;
		const copy = { ...item };
		delete copy.titleAr;
		return copy;
	});
	next.sections = (next.sections || []).map(section => stripSectionArabic(section));
	return next;
}

export function stripSectionArabic(section) {
	if (!section || typeof section !== 'object') return section;
	const next = { ...section };
	delete next.titleAr;
	next.topics = (next.topics || []).map(topic => stripTopicArabic(topic));
	return next;
}

export function stripTopicArabic(topic) {
	if (!topic || typeof topic !== 'object') return topic;
	const next = { ...topic };
	delete next.titleAr;
	delete next.descriptionAr;
	delete next.contentMarkdownAr;
	delete next.i18nAr;
	if (next.summary && typeof next.summary === 'object') {
		const summary = { ...next.summary };
		delete summary.tldrAr;
		delete summary.keyConceptsAr;
		delete summary.rememberAr;
		delete summary.takeawaysAr;
		delete summary.termsAr;
		next.summary = summary;
	}
	next.takeaways = Array.isArray(next.takeaways) ? [...next.takeaways] : next.takeaways;
	delete next.takeawaysAr;
	delete next.examplesAr;
	next.cards = (next.cards || []).map(card => {
		if (!card || typeof card !== 'object') return card;
		const copy = { ...card };
		delete copy.titleAr;
		delete copy.bodyAr;
		return copy;
	});
	next.flashcards = (next.flashcards || []).map(card => {
		if (!card || typeof card !== 'object') return card;
		const copy = { ...card };
		delete copy.frontAr;
		delete copy.backAr;
		return copy;
	});
	next.resources = (next.resources || []).map(item => {
		if (!item || typeof item !== 'object') return item;
		const copy = { ...item };
		delete copy.titleAr;
		return copy;
	});
	next.videoSuggestions = (next.videoSuggestions || []).map(item => {
		if (!item || typeof item !== 'object') return item;
		const copy = { ...item };
		delete copy.titleAr;
		return copy;
	});
	next.lessonPacks = (next.lessonPacks || []).map(item => {
		if (!item || typeof item !== 'object') return item;
		const copy = { ...item };
		delete copy.titleAr;
		delete copy.descriptionAr;
		return copy;
	});
	next.studySuggestions = (next.studySuggestions || []).map(item => {
		if (!item || typeof item !== 'object') return item;
		const copy = { ...item };
		delete copy.titleAr;
		return copy;
	});
	next.references = (next.references || []).map(item => {
		if (!item || typeof item !== 'object') return item;
		const copy = { ...item };
		delete copy.titleAr;
		delete copy.summaryAr;
		return copy;
	});
	return next;
}

/**
 * Collect free-MT jobs for a path shell (titles used on landing cards + index).
 * When topicId is set, also collect that topic's body/cards.
 */
export function collectTranslateJobs(path, { topicId = null, pathShellOnly = false } = {}) {
	const jobs = [];
	if (!path) return jobs;

	const push = (id, text) => {
		const value = String(text || '').trim();
		if (!value) return;
		// Skip already-Arabic source (no need to translate)
		if (/[\u0600-\u06FF]/.test(value) && !/[A-Za-z]{3,}/.test(value)) return;
		jobs.push({ id, text: value.slice(0, 20000) });
	};

	push('path:title', path.title);
	push('path:description', path.description);
	push('path:goal', path.goal);
	push('path:outcome', path.outcome);

	(path.dailyItems || []).forEach((item, index) => {
		push(`daily:${item?.id || index}:title`, item?.title);
	});

	(path.sections || []).forEach((section, sIndex) => {
		push(`section:${section?.id || sIndex}:title`, section?.title);
		(section?.topics || []).forEach((topic, tIndex) => {
			push(`topic:${topic?.id || tIndex}:title`, topic?.title);
			if (pathShellOnly) return;
			if (topicId && topic?.id !== topicId) return;
			push(`topic:${topic?.id || tIndex}:description`, topic?.description);
			push(`topic:${topic?.id || tIndex}:contentMarkdown`, topic?.contentMarkdown);
			const summary = topic?.summary && typeof topic.summary === 'object' ? topic.summary : {};
			push(`topic:${topic?.id || tIndex}:summary.tldr`, summary.tldr);
			(summary.keyConcepts || []).forEach((item, i) =>
				push(`topic:${topic?.id || tIndex}:summary.keyConcepts.${i}`, item),
			);
			(summary.remember || []).forEach((item, i) =>
				push(`topic:${topic?.id || tIndex}:summary.remember.${i}`, item),
			);
			(summary.takeaways || topic?.takeaways || []).forEach((item, i) =>
				push(`topic:${topic?.id || tIndex}:summary.takeaways.${i}`, item),
			);
			(summary.terms || []).forEach((term, i) => {
				push(`topic:${topic?.id || tIndex}:summary.terms.${i}.term`, term?.term);
				push(`topic:${topic?.id || tIndex}:summary.terms.${i}.definition`, term?.definition);
			});
			(topic?.examples || []).forEach((item, i) =>
				push(`topic:${topic?.id || tIndex}:examples.${i}`, item),
			);
			(topic?.cards || []).forEach((card, i) => {
				const key = card?.id || i;
				push(`topic:${topic?.id || tIndex}:card:${key}:title`, card?.title);
				push(`topic:${topic?.id || tIndex}:card:${key}:body`, card?.body);
			});
			(topic?.flashcards || []).forEach((card, i) => {
				const key = card?.id || i;
				push(`topic:${topic?.id || tIndex}:flash:${key}:front`, card?.front);
				push(`topic:${topic?.id || tIndex}:flash:${key}:back`, card?.back);
			});
			(topic?.resources || []).forEach((item, i) =>
				push(`topic:${topic?.id || tIndex}:resource:${item?.id || i}:title`, item?.title),
			);
			(topic?.videoSuggestions || []).forEach((item, i) =>
				push(`topic:${topic?.id || tIndex}:video:${item?.id || i}:title`, item?.title),
			);
			(topic?.lessonPacks || []).forEach((item, i) => {
				const key = item?.id || i;
				push(`topic:${topic?.id || tIndex}:pack:${key}:title`, item?.title);
				push(`topic:${topic?.id || tIndex}:pack:${key}:description`, item?.description);
			});
			(topic?.studySuggestions || []).forEach((item, i) =>
				push(`topic:${topic?.id || tIndex}:study:${item?.id || i}:title`, item?.title),
			);
			(topic?.references || []).forEach((item, i) => {
				const key = item?.id || i;
				push(`topic:${topic?.id || tIndex}:ref:${key}:title`, item?.title);
				push(`topic:${topic?.id || tIndex}:ref:${key}:summary`, item?.summary);
			});
		});
	});

	return jobs;
}

function setByJobId(path, id, translatedText) {
	const value = String(translatedText || '').trim();
	if (!value || !path) return path;

	if (id === 'path:title') return { ...path, titleAr: value };
	if (id === 'path:description') return { ...path, descriptionAr: value };
	if (id === 'path:goal') return { ...path, goalAr: value };
	if (id === 'path:outcome') return { ...path, outcomeAr: value };

	const dailyMatch = /^daily:([^:]+):title$/.exec(id);
	if (dailyMatch) {
		const key = dailyMatch[1];
		return {
			...path,
			dailyItems: (path.dailyItems || []).map((item, index) =>
				String(item?.id || index) === key ? { ...item, titleAr: value } : item,
			),
		};
	}

	const sectionMatch = /^section:([^:]+):title$/.exec(id);
	if (sectionMatch) {
		const key = sectionMatch[1];
		return {
			...path,
			sections: (path.sections || []).map((section, index) =>
				String(section?.id || index) === key ? { ...section, titleAr: value } : section,
			),
		};
	}

	const topicField = /^topic:([^:]+):(title|description|contentMarkdown)$/.exec(id);
	if (topicField) {
		const [, topicKey, field] = topicField;
		return mapTopic(path, topicKey, topic => ({ ...topic, [`${field}Ar`]: value }));
	}

	const summaryScalar = /^topic:([^:]+):summary\.(tldr)$/.exec(id);
	if (summaryScalar) {
		const [, topicKey, field] = summaryScalar;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			summary: { ...(topic.summary || {}), [`${field}Ar`]: value },
		}));
	}

	const summaryList = /^topic:([^:]+):summary\.(keyConcepts|remember|takeaways)\.(\d+)$/.exec(id);
	if (summaryList) {
		const [, topicKey, field, indexRaw] = summaryList;
		const index = Number(indexRaw);
		return mapTopic(path, topicKey, topic => {
			const summary = { ...(topic.summary || {}) };
			const list = Array.isArray(summary[`${field}Ar`])
				? [...summary[`${field}Ar`]]
				: Array.isArray(summary[field])
					? summary[field].map(() => '')
					: [];
			while (list.length <= index) list.push('');
			list[index] = value;
			summary[`${field}Ar`] = list;
			if (field === 'takeaways') {
				return { ...topic, summary, takeawaysAr: list };
			}
			return { ...topic, summary };
		});
	}

	const summaryTerm = /^topic:([^:]+):summary\.terms\.(\d+)\.(term|definition)$/.exec(id);
	if (summaryTerm) {
		const [, topicKey, indexRaw, field] = summaryTerm;
		const index = Number(indexRaw);
		return mapTopic(path, topicKey, topic => {
			const summary = { ...(topic.summary || {}) };
			const source = Array.isArray(summary.terms) ? summary.terms : [];
			const list = Array.isArray(summary.termsAr)
				? summary.termsAr.map(item => ({ ...item }))
				: source.map(item => ({ term: '', definition: '', ...item, termAr: '', definitionAr: '' }));
			while (list.length <= index) list.push({ term: '', definition: '' });
			list[index] = {
				...list[index],
				[field === 'term' ? 'term' : 'definition']:
					list[index][field === 'term' ? 'term' : 'definition'] || source[index]?.[field] || '',
				[`${field}Ar`]: value,
			};
			summary.termsAr = list;
			return { ...topic, summary };
		});
	}

	const exampleMatch = /^topic:([^:]+):examples\.(\d+)$/.exec(id);
	if (exampleMatch) {
		const [, topicKey, indexRaw] = exampleMatch;
		const index = Number(indexRaw);
		return mapTopic(path, topicKey, topic => {
			const list = Array.isArray(topic.examplesAr)
				? [...topic.examplesAr]
				: (topic.examples || []).map(() => '');
			while (list.length <= index) list.push('');
			list[index] = value;
			return { ...topic, examplesAr: list };
		});
	}

	const cardMatch = /^topic:([^:]+):card:([^:]+):(title|body)$/.exec(id);
	if (cardMatch) {
		const [, topicKey, cardKey, field] = cardMatch;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			cards: (topic.cards || []).map((card, index) =>
				String(card?.id || index) === cardKey ? { ...card, [`${field}Ar`]: value } : card,
			),
		}));
	}

	const flashMatch = /^topic:([^:]+):flash:([^:]+):(front|back)$/.exec(id);
	if (flashMatch) {
		const [, topicKey, cardKey, field] = flashMatch;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			flashcards: (topic.flashcards || []).map((card, index) =>
				String(card?.id || index) === cardKey ? { ...card, [`${field}Ar`]: value } : card,
			),
		}));
	}

	const resourceMatch = /^topic:([^:]+):resource:([^:]+):title$/.exec(id);
	if (resourceMatch) {
		const [, topicKey, itemKey] = resourceMatch;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			resources: (topic.resources || []).map((item, index) =>
				String(item?.id || index) === itemKey ? { ...item, titleAr: value } : item,
			),
		}));
	}

	const videoMatch = /^topic:([^:]+):video:([^:]+):title$/.exec(id);
	if (videoMatch) {
		const [, topicKey, itemKey] = videoMatch;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			videoSuggestions: (topic.videoSuggestions || []).map((item, index) =>
				String(item?.id || index) === itemKey ? { ...item, titleAr: value } : item,
			),
		}));
	}

	const packMatch = /^topic:([^:]+):pack:([^:]+):(title|description)$/.exec(id);
	if (packMatch) {
		const [, topicKey, itemKey, field] = packMatch;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			lessonPacks: (topic.lessonPacks || []).map((item, index) =>
				String(item?.id || index) === itemKey ? { ...item, [`${field}Ar`]: value } : item,
			),
		}));
	}

	const studyMatch = /^topic:([^:]+):study:([^:]+):title$/.exec(id);
	if (studyMatch) {
		const [, topicKey, itemKey] = studyMatch;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			studySuggestions: (topic.studySuggestions || []).map((item, index) =>
				String(item?.id || index) === itemKey ? { ...item, titleAr: value } : item,
			),
		}));
	}

	const refMatch = /^topic:([^:]+):ref:([^:]+):(title|summary)$/.exec(id);
	if (refMatch) {
		const [, topicKey, itemKey, field] = refMatch;
		return mapTopic(path, topicKey, topic => ({
			...topic,
			references: (topic.references || []).map((item, index) =>
				String(item?.id || index) === itemKey ? { ...item, [`${field}Ar`]: value } : item,
			),
		}));
	}

	return path;
}

function mapTopic(path, topicKey, mapper) {
	return {
		...path,
		sections: (path.sections || []).map(section => ({
			...section,
			topics: (section.topics || []).map((topic, index) =>
				String(topic?.id || index) === String(topicKey) ? mapper(topic) : topic,
			),
		})),
	};
}

export function applyTranslateResults(path, results = [], { mode = 'full', topicId = null } = {}) {
	let next = path;
	for (const item of results) {
		if (!item?.id || !item?.translatedText) continue;
		next = setByJobId(next, item.id, item.translatedText);
	}

	const stamp = new Date().toISOString();
	next = {
		...next,
		i18nAr: {
			...(next.i18nAr || {}),
			shellHash: hashText(pathShellFingerprint(next)),
			shellTranslatedAt: stamp,
			provider: 'free-mt',
		},
	};

	if (mode === 'shell') return next;

	next = {
		...next,
		sections: (next.sections || []).map(section => ({
			...section,
			topics: (section.topics || []).map(topic => {
				if (topicId && topic?.id !== topicId) return topic;
				return {
					...topic,
					i18nAr: {
						sourceHash: hashText(topicSourceFingerprint(topic)),
						translatedAt: stamp,
						provider: 'free-mt',
					},
				};
			}),
		})),
	};
	return next;
}

/** True if path shell titles changed (landing/index), not full topic bodies. */
export function pathShellArabicIsStale(prevPath, nextPath) {
	if (!prevPath || !nextPath) return true;
	return hashText(pathShellFingerprint(prevPath)) !== hashText(pathShellFingerprint(nextPath));
}

/** True if path text changed enough that Arabic mirrors are stale. */
export function pathArabicIsStale(prevPath, nextPath) {
	if (!prevPath || !nextPath) return true;
	return hashText(pathSourceFingerprint(prevPath)) !== hashText(pathSourceFingerprint(nextPath));
}

export function topicArabicIsStale(prevTopic, nextTopic) {
	if (!prevTopic || !nextTopic) return true;
	return hashText(topicSourceFingerprint(prevTopic)) !== hashText(topicSourceFingerprint(nextTopic));
}
