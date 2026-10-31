/*
 * Pure helpers for Learn → Roadmaps: progress per course / level / roadmap, and the copy.
 * A topic's progress key matches the server's: "<courseId>::<topic>".
 */

export const topicKey = (courseId, topic) => `${courseId}::${topic}`;

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

export function courseProgress(course, progress) {
	const total = course?.topics?.length || 0;
	const done = (course?.topics || []).filter(t => progress?.[topicKey(course.id, t)]).length;
	return { done, total, percent: pct(done, total) };
}

export function levelProgress(level, progress) {
	let done = 0;
	let total = 0;
	let coursesDone = 0;
	for (const course of level?.courses || []) {
		const p = courseProgress(course, progress);
		done += p.done;
		total += p.total;
		if (p.total && p.done === p.total) coursesDone += 1;
	}
	return { done, total, percent: pct(done, total), coursesDone, courses: level?.courses?.length || 0 };
}

export function roadmapProgress(data, progress) {
	let done = 0;
	let total = 0;
	for (const level of data?.levels || []) {
		const p = levelProgress(level, progress);
		done += p.done;
		total += p.total;
	}
	return { done, total, percent: pct(done, total) };
}

/** The first course that still has topics left — where to continue. */
export function nextCourse(data, progress) {
	for (const level of data?.levels || []) {
		for (const course of level.courses || []) {
			const p = courseProgress(course, progress);
			if (p.total && p.done < p.total) return { level, course };
		}
	}
	return null;
}

/** "~12 months" from timeline periods like "Months 10-12" (the largest month number mentioned). */
export function journeyMonths(timeline) {
	let max = 0;
	for (const item of timeline || []) {
		if (!/month|شهر|أشهر/i.test(String(item.period || ''))) continue;
		for (const n of String(item.period).match(/\d+/g) || []) max = Math.max(max, Number(n));
	}
	return max || null;
}

const isObj = v => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** The topics index in a parsed file ("roadmap_topics_index" or the bare index), else null. */
export function topicsIndexOf(parsed) {
	if (!isObj(parsed)) return null;
	if (isObj(parsed.roadmap_topics_index)) return parsed.roadmap_topics_index;
	const looks = Array.isArray(parsed.levels) && parsed.levels.some(l => isObj(l) && (l.level_id !== undefined || (Array.isArray(l.courses) && l.courses.some(c => isObj(c) && c.course_id !== undefined))));
	return looks && !isObj(parsed.roadmap) ? parsed : null;
}

/** Topics with an explanation, across the roadmap. */
export function explainedCount(data) {
	let n = 0;
	for (const level of data?.levels || []) for (const course of level.courses || []) n += Object.keys(course.topic_benefits || {}).filter(t => course.topics?.includes(t)).length;
	return n;
}

/**
 * Checks a topics index before importing it into `data`: how many courses and explanations it
 * has, and which courses the roadmap does not have yet (they will be added).
 */
export function precheckTopicsIndex(text, data) {
	let parsed;
	try {
		parsed = JSON.parse(String(text || ''));
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Invalid JSON' };
	}
	const index = topicsIndexOf(parsed);
	if (!index) return { ok: false, error: 'roadmap_topics_index: expected { "roadmap_topics_index": { "levels": [ … ] } }' };
	const known = new Set((data?.levels || []).flatMap(l => (l.courses || []).map(c => c.id)));
	let courses = 0;
	let benefits = 0;
	const added = [];
	for (const level of index.levels || []) {
		for (const course of level?.courses || []) {
			courses += 1;
			const topics = Array.isArray(course?.topics_detailed) ? course.topics_detailed : [];
			benefits += topics.filter(t => isObj(t) && String(t.benefit_ar || t.benefit || '').trim()).length;
			if (course?.course_id && !known.has(String(course.course_id))) added.push(course.title_ar || course.course_id);
		}
	}
	if (!courses) return { ok: false, error: 'roadmap_topics_index.levels: no courses' };
	return { ok: true, courses, benefits, added };
}

/** Quick client-side check before sending; the server validates again and has the last word. */
export function precheckRoadmapJson(text) {
	let parsed;
	try {
		parsed = JSON.parse(String(text || ''));
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Invalid JSON' };
	}
	if (topicsIndexOf(parsed) && !isObj(parsed?.roadmap)) return { ok: false, indexOnly: true, error: 'roadmap_topics_index' };
	const root = parsed && typeof parsed === 'object' && parsed.roadmap && typeof parsed.roadmap === 'object' ? parsed.roadmap : parsed;
	if (!root || typeof root !== 'object' || Array.isArray(root)) return { ok: false, error: 'roadmap: expected a JSON object' };
	if (!String(root.title || '').trim()) return { ok: false, error: 'roadmap.title is required' };
	if (!Array.isArray(root.levels) || !root.levels.length) return { ok: false, error: 'roadmap.levels needs at least one level' };
	const courses = root.levels.reduce((n, l) => n + (Array.isArray(l?.courses) ? l.courses.length : 0), 0);
	const topics = root.levels.reduce((n, l) => n + (Array.isArray(l?.courses) ? l.courses.reduce((m, c) => m + (Array.isArray(c?.topics) ? c.topics.length : 0), 0) : 0), 0);
	return { ok: true, title: String(root.title).trim(), levels: root.levels.length, courses, topics };
}

export const ROADMAP_COPY = {
	en: {
		roadmaps: 'Roadmaps',
		subtitle: 'Learning paths you follow topic by topic',
		addRoadmap: 'Add roadmap',
		editJson: 'Edit JSON',
		deleteRoadmap: 'Delete roadmap',
		confirmDelete: title => `Delete the roadmap “${title}”?`,
		confirmHint: 'Its progress is removed with it.',
		jsonLabel: 'Roadmap JSON',
		jsonHint: 'Paste a roadmap JSON (with "roadmap" → title, levels → courses → topics), or load a .json file.',
		loadFile: 'Load .json file',
		usePreset: 'Use this',
		presetTitle: 'Ready to add',
		looksGood: (levels, courses, topics) => `Looks good: ${levels} levels, ${courses} courses, ${topics} topics`,
		saveChanges: 'Save changes',
		add: 'Add',
		empty: 'No roadmaps yet',
		emptyText: 'Add a roadmap from JSON and tick off its topics as you study them.',
		topicsDone: (done, total) => `${done} of ${total} topics`,
		levelsCount: n => (n === 1 ? '1 level' : `${n} levels`),
		coursesCount: n => (n === 1 ? '1 course' : `${n} courses`),
		continue: 'Continue with',
		allDone: 'Every topic is done. Well done.',
		brief: 'Brief',
		importIndex: 'Import topics index',
		indexLabel: 'Topics index JSON',
		indexHint: 'Paste a topics index (roadmap_topics_index → levels → courses → topics_detailed with benefit_ar). Each topic gets its explanation; courses the roadmap lacks are added. Your progress stays.',
		indexLooksGood: (courses, benefits, added) => `Looks good: ${courses} courses, ${benefits} explanations${added ? `, ${added} new courses` : ''}`,
		indexOnly: 'This is a topics index. Add the roadmap first, then open it and choose “Import topics index”.',
		importCta: 'Import',
		newCourses: 'New courses',
		indexNote: 'About the topics index',
		addedByIndex: 'Added in review',
		explained: 'Explained',
		why: 'Why it matters',
		legendAdded: 'Dashed stations are courses added by the topics index.',
		from: 'From',
		to: 'To',
		duration: 'Duration',
		monthsN: n => (n === 1 ? '1 month' : `${n} months`),
		perDay: 'Per day',
		lines: 'Lines',
		stations: 'Stations',
		topicsLabel: 'Topics',
		travelled: 'Travelled',
		destination: 'Destination',
		map: 'Roadmap map',
		mapHint: 'Every level is a line, every course a station, every dot a topic. Open a station to see everything in it.',
		yourDay: 'Your day',
		toEarn: 'Certifications to earn',
		practiceOn: 'Practice on',
		yourLab: 'Your lab',
		close: 'Close',
		path: 'Path',
		plan: 'Plan',
		resources: 'Resources',
		remainingOnly: 'Remaining only',
		watch: 'Open course',
		markAll: 'Mark all done',
		unmarkAll: 'Clear',
		expected: 'You will be able to',
		practical: 'Practice',
		schedule: 'Daily schedule',
		dailyHours: n => `${n} hours a day`,
		hoursShort: n => `${n} h`,
		timeline: 'Timeline',
		certifications: 'Certifications',
		labs: 'Practice labs',
		labEnv: 'Lab setup',
		ram: (rec, pref) => (pref ? `RAM ${rec} GB (${pref} GB preferred)` : `RAM ${rec} GB`),
		storage: n => `Storage ${n} GB`,
		roles: 'Prepares you for',
		policy: {
			practice_required: 'Practice is required',
			authorized_testing_only: 'Test only what you are authorized to test',
			lab_environment_recommended: 'Use a lab environment',
			course_completion_requires_practical_project: 'A course counts as done after its practical project',
		},
		priority: { critical: 'Critical', high: 'High', specialization: 'Specialization', advanced: 'Advanced' },
		level: {
			beginner: 'Beginner',
			beginner_intermediate: 'Beginner → Intermediate',
			intermediate: 'Intermediate',
			intermediate_advanced: 'Intermediate → Advanced',
			advanced: 'Advanced',
		},
		levelN: n => `Level ${n}`,
		failed: 'Not saved. Try again.',
		loadFailed: 'Could not load the roadmap.',
	},
	ar: {
		roadmaps: 'خرائط التعلّم',
		subtitle: 'مسارات تعلّم بتمشي فيها موضوع موضوع',
		addRoadmap: 'إضافة خريطة',
		editJson: 'تعديل الـJSON',
		deleteRoadmap: 'حذف الخريطة',
		confirmDelete: title => `حذف خريطة «${title}»؟`,
		confirmHint: 'التقدّم اللي فيها هيتمسح معاها.',
		jsonLabel: 'JSON الخريطة',
		jsonHint: 'الصق JSON الخريطة (فيه roadmap ← title و levels ← courses ← topics)، أو حمّل ملف .json.',
		loadFile: 'تحميل ملف .json',
		usePreset: 'استخدمها',
		presetTitle: 'جاهزة للإضافة',
		looksGood: (levels, courses, topics) => `تمام: ${levels} مستويات، ${courses} كورس، ${topics} موضوع`,
		saveChanges: 'حفظ التعديلات',
		add: 'إضافة',
		empty: 'لسه مفيش خرائط',
		emptyText: 'ضيف خريطة من JSON وعلّم على الموضوعات وانت بتذاكرها.',
		topicsDone: (done, total) => `${done} من ${total} موضوع`,
		levelsCount: n => (n === 1 ? 'مستوى واحد' : `${n} مستويات`),
		coursesCount: n => (n === 1 ? 'كورس واحد' : `${n} كورسات`),
		continue: 'كمّل بـ',
		allDone: 'خلصت كل الموضوعات. برافو.',
		brief: 'نظرة سريعة',
		importIndex: 'استيراد فهرس التوبكس',
		indexLabel: 'JSON فهرس التوبكس',
		indexHint: 'الصق فهرس التوبكس (roadmap_topics_index ← levels ← courses ← topics_detailed فيها benefit_ar). كل توبك هياخد شرحه، والكورسات اللي مش في الخريطة هتتضاف. تقدّمك مش هيتغير.',
		indexLooksGood: (courses, benefits, added) => `تمام: ${courses} كورس، ${benefits} شرح${added ? `، و${added} كورسات جديدة` : ''}`,
		indexOnly: 'ده فهرس توبكس. ضيف الخريطة الأول، وبعدين افتحها واختار «استيراد فهرس التوبكس».',
		importCta: 'استيراد',
		newCourses: 'كورسات جديدة',
		indexNote: 'عن فهرس التوبكس',
		addedByIndex: 'مضاف في المراجعة',
		explained: 'متشرحة',
		why: 'فايدته',
		legendAdded: 'المحطات المتقطعة كورسات اتضافت من فهرس التوبكس.',
		from: 'من',
		to: 'إلى',
		duration: 'المدة',
		monthsN: n => (n === 1 ? 'شهر' : n === 2 ? 'شهرين' : n <= 10 ? `${n} شهور` : `${n} شهر`),
		perDay: 'في اليوم',
		lines: 'الخطوط',
		stations: 'المحطات',
		topicsLabel: 'الموضوعات',
		travelled: 'قطعت',
		destination: 'الوجهة',
		map: 'خريطة الرحلة',
		mapHint: 'كل مستوى خط، وكل كورس محطة، وكل نقطة موضوع. افتح أي محطة تشوف كل اللي فيها.',
		yourDay: 'يومك',
		toEarn: 'شهادات تاخدها',
		practiceOn: 'اتدرّب على',
		yourLab: 'معملك',
		close: 'إغلاق',
		path: 'المسار',
		plan: 'الخطة',
		resources: 'المصادر',
		remainingOnly: 'الباقي بس',
		watch: 'افتح الكورس',
		markAll: 'علّم الكل',
		unmarkAll: 'امسح',
		expected: 'هتقدر',
		practical: 'التطبيق العملي',
		schedule: 'جدول اليوم',
		dailyHours: n => `${n} ساعات في اليوم`,
		hoursShort: n => `${n} س`,
		timeline: 'الجدول الزمني',
		certifications: 'الشهادات',
		labs: 'منصات التدريب',
		labEnv: 'تجهيز المعمل',
		ram: (rec, pref) => (pref ? `رام ${rec} جيجا (يُفضّل ${pref})` : `رام ${rec} جيجا`),
		storage: n => `مساحة ${n} جيجا`,
		roles: 'بتجهّزك لـ',
		policy: {
			practice_required: 'التطبيق العملي أساسي',
			authorized_testing_only: 'اختبر بس اللي عندك تصريح تختبره',
			lab_environment_recommended: 'استخدم بيئة معمل',
			course_completion_requires_practical_project: 'الكورس يخلص بعد مشروعه العملي',
		},
		priority: { critical: 'أساسي جدًا', high: 'مهم', specialization: 'تخصص', advanced: 'متقدم' },
		level: {
			beginner: 'مبتدئ',
			beginner_intermediate: 'مبتدئ ← متوسط',
			intermediate: 'متوسط',
			intermediate_advanced: 'متوسط ← متقدم',
			advanced: 'متقدم',
		},
		levelN: n => `المستوى ${n}`,
		failed: 'متحفظش. حاول تاني.',
		loadFailed: 'مقدرناش نحمّل الخريطة.',
	},
};
