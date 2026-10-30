/*
 * Pure helpers for the Learn tab: progress, filtering, ordering and the UI copy.
 */

export const COURSE_COLORS = ['green', 'blue', 'violet', 'amber', 'rose', 'teal', 'slate'];
export const SECTIONS = ['content', 'notes', 'keyPoints', 'summary', 'qa'];

/** Whole-number percentage of finished lectures (0 for an empty course). */
export function progressOf(course) {
	const total = Number(course?.lectures) || 0;
	if (!total) return 0;
	return Math.round((Math.min(Number(course.done) || 0, total) / total) * 100);
}

/** 'empty' (no lectures) · 'new' (none done) · 'progress' · 'done'. */
export function courseStatus(course) {
	const total = Number(course?.lectures) || 0;
	const done = Number(course?.done) || 0;
	if (!total) return 'empty';
	if (done >= total) return 'done';
	return done > 0 ? 'progress' : 'new';
}

/** Distinct categories, alphabetical (case-insensitive), empty ones left out. */
export function categoriesOf(courses) {
	const seen = new Map();
	for (const course of courses || []) {
		const name = String(course?.category || '').trim();
		if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
	}
	return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

const fold = value => String(value || '').toLocaleLowerCase();

/**
 * Courses matching the library filters: free text (title, description, category),
 * a category ('' = all) and a status ('all' | 'new' | 'progress' | 'done').
 * Pinned courses come first; otherwise your own order is kept.
 */
export function filterCourses(courses, { query = '', category = '', status = 'all' } = {}) {
	const q = fold(query).trim();
	return (courses || [])
		.filter(course => {
			if (category && fold(course.category) !== fold(category)) return false;
			if (status !== 'all') {
				const s = courseStatus(course);
				if (status === 'new' ? s !== 'new' && s !== 'empty' : s !== status) return false;
			}
			if (!q) return true;
			return [course.title, course.description, course.category].some(part => fold(part).includes(q));
		})
		.map((course, index) => [course, index])
		.sort(([a, i], [b, j]) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || i - j)
		.map(([course]) => course);
}

/** Lectures for a course filter: 'all' | 'todo' | 'done' | 'revision'. */
export function filterLectures(lectures, filter = 'all') {
	const list = lectures || [];
	if (filter === 'todo') return list.filter(l => !l.done);
	if (filter === 'done') return list.filter(l => l.done);
	if (filter === 'revision') return list.filter(l => l.needsRevision);
	return list;
}

/** Totals for the library header. */
export function libraryStats(courses) {
	let lectures = 0;
	let done = 0;
	let revision = 0;
	let completed = 0;
	for (const course of courses || []) {
		lectures += Number(course.lectures) || 0;
		done += Number(course.done) || 0;
		revision += Number(course.revision) || 0;
		if (courseStatus(course) === 'done') completed += 1;
	}
	return {
		courses: (courses || []).length,
		completed,
		lectures,
		done,
		revision,
		progress: lectures ? Math.round((done / lectures) * 100) : 0,
	};
}

/** The course you studied most recently that still has lectures left (else the latest one). */
export function continueCourse(courses) {
	const studied = (courses || []).filter(c => c.lastStudiedAt).sort((a, b) => b.lastStudiedAt - a.lastStudiedAt);
	return studied.find(c => courseStatus(c) !== 'done') || studied[0] || null;
}

/** Course stats recomputed from a loaded lecture list. */
export function statsFromLectures(lectures) {
	const list = lectures || [];
	return {
		lectures: list.length,
		done: list.filter(l => l.done).length,
		revision: list.filter(l => l.needsRevision).length,
	};
}

/** Swap `id` one step up (-1) or down (+1); null when it is already at that end. */
export function moveId(ids, id, delta) {
	const i = ids.indexOf(id);
	const j = i + delta;
	if (i < 0 || j < 0 || j >= ids.length) return null;
	const next = ids.slice();
	[next[i], next[j]] = [next[j], next[i]];
	return next;
}

/** Same order as `ids`, for a list of objects with `id`. */
export function orderBy(items, ids) {
	const byId = new Map((items || []).map(item => [item.id, item]));
	const ordered = ids.map(id => byId.get(id)).filter(Boolean);
	const rest = (items || []).filter(item => !ids.includes(item.id));
	return [...ordered, ...rest];
}

export function qaId() {
	return `qa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Fisher–Yates on a copy; `random` is injectable for tests. */
export function shuffled(items, random = Math.random) {
	const next = (items || []).slice();
	for (let i = next.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}

const arPlural = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`);

export const COPY = {
	en: {
		title: 'Learn',
		subtitle: 'Your personal library of courses, lectures and notes',
		back: 'Back',
		exit: 'Back to chats',
		library: 'Library',
		revision: 'Revision',
		courses: 'Courses',
		addCourse: 'Add course',
		addLecture: 'Add lecture',
		editCourse: 'Edit course',
		editLecture: 'Edit lecture',
		deleteCourse: 'Delete course',
		deleteLecture: 'Delete lecture',
		pin: 'Pin to top',
		unpin: 'Unpin',
		moveUp: 'Move up',
		moveDown: 'Move down',
		more: 'More actions',
		searchPlaceholder: 'Search courses, lectures and notes…',
		clearSearch: 'Clear search',
		searching: 'Searching…',
		noResults: 'Nothing matches your search.',
		searchHint: 'Type at least 2 characters to search inside lectures.',
		resultsCourses: 'Courses',
		resultsLectures: 'Lectures',
		allCategories: 'All',
		status: { all: 'All', new: 'Not started', progress: 'In progress', done: 'Completed' },
		lectureFilter: { all: 'All', todo: 'To study', done: 'Done', revision: 'Revision' },
		stats: { courses: 'Courses', lectures: 'Lectures done', progress: 'Overall progress', revision: 'To revise' },
		continue: 'Continue learning',
		continueCta: 'Resume',
		progress: p => `${p}% complete`,
		lecturesCount: n => (n === 1 ? '1 lecture' : `${n} lectures`),
		doneOf: (done, total) => `${done} of ${total} lectures done`,
		emptyLibraryTitle: 'Start your learning library',
		emptyLibraryText: 'Add a course for anything you are learning — then add its lectures, paste the material, and keep your notes, key points and Q&A in one place.',
		emptyFiltered: 'No courses match these filters.',
		emptyCourseTitle: 'No lectures yet',
		emptyCourseText: 'Add the first lecture, then paste or write its content.',
		emptyLectures: 'No lectures in this filter.',
		emptyRevisionTitle: 'Nothing to revise',
		emptyRevisionText: 'Mark a lecture “Needs revision” and it will be listed here.',
		uncategorized: 'General',
		fields: {
			title: 'Title',
			description: 'Description',
			category: 'Category',
			categoryHint: 'e.g. Programming, Networking',
			color: 'Color',
			courseTitleHint: 'e.g. Network Fundamentals',
			lectureTitleHint: 'e.g. Lecture 1 — The OSI model',
			descriptionHint: 'What is it about? (optional)',
		},
		save: 'Save',
		create: 'Create',
		cancel: 'Cancel',
		delete: 'Delete',
		close: 'Close',
		confirmDeleteCourse: title => `Delete “${title}” and all of its lectures?`,
		confirmDeleteLecture: title => `Delete the lecture “${title}”?`,
		confirmHint: 'This removes it from your library.',
		sections: { content: 'Content', notes: 'My notes', keyPoints: 'Key points', summary: 'Summary', qa: 'Q&A' },
		sectionHints: {
			notes: 'Your own thoughts, questions and reminders…',
			keyPoints: 'The most important points of this lecture…',
			summary: 'Summarize the lecture in your own words…',
		},
		markDone: 'Mark as done',
		markedDone: 'Done',
		needsRevision: 'Needs revision',
		markRevision: 'Mark for revision',
		prev: 'Previous lecture',
		next: 'Next lecture',
		lectureOf: (i, n) => `Lecture ${i} of ${n}`,
		focus: 'Focus mode',
		details: 'Lecture details',
		sectionsLabel: 'Lecture sections',
		readingTime: (words, mins) => `${words} words, ${mins} min read`,
		exitFocus: 'Exit focus',
		deskLine: (done, total) => (total ? `You've studied ${done} of ${total} lectures` : 'Your library is ready for its first lecture'),
		libraryLine: (courses, completed) => `${courses === 1 ? '1 course' : `${courses} courses`}, ${completed} completed`,
		toRevise: n => `${n} to revise`,
		saving: 'Saving…',
		saved: 'Saved',
		saveFailed: 'Not saved',
		retry: 'Retry',
		loadFailed: 'Could not load. Check your connection.',
		tryAgain: 'Try again',
		actionFailed: 'Something went wrong. Please try again.',
		qa: {
			question: 'Question',
			answer: 'Answer',
			add: 'Add question',
			empty: 'Write questions and answers to test yourself later.',
			practice: 'Practice',
			edit: 'Edit cards',
			reveal: 'Show answer',
			hide: 'Hide answer',
			shuffle: 'Shuffle',
			card: (i, n) => `${i} / ${n}`,
			prevCard: 'Previous',
			nextCard: 'Next',
			remove: 'Remove question',
			qHint: 'What do you want to remember?',
			aHint: 'The answer…',
		},
		qaCount: n => (n === 1 ? '1 question' : `${n} questions`),
		hasContent: 'Has content',
		dragHint: 'Drag to reorder',
		inCourse: course => `in ${course}`,
		field: { title: 'Title', description: 'Description', content: 'Content', notes: 'Notes', keyPoints: 'Key points', summary: 'Summary', qa: 'Q&A' },
	},
	ar: {
		title: 'تعلّم',
		subtitle: 'مكتبتك الشخصية للكورسات والمحاضرات والملاحظات',
		back: 'رجوع',
		exit: 'رجوع للشاتات',
		library: 'المكتبة',
		revision: 'المراجعة',
		courses: 'الكورسات',
		addCourse: 'إضافة كورس',
		addLecture: 'إضافة محاضرة',
		editCourse: 'تعديل الكورس',
		editLecture: 'تعديل المحاضرة',
		deleteCourse: 'حذف الكورس',
		deleteLecture: 'حذف المحاضرة',
		pin: 'تثبيت في الأعلى',
		unpin: 'إلغاء التثبيت',
		moveUp: 'تحريك لأعلى',
		moveDown: 'تحريك لأسفل',
		more: 'إجراءات أكثر',
		searchPlaceholder: 'دوّر في الكورسات والمحاضرات والملاحظات…',
		clearSearch: 'مسح البحث',
		searching: 'بندوّر…',
		noResults: 'مفيش نتائج للبحث ده.',
		searchHint: 'اكتب حرفين على الأقل عشان تدوّر جوه المحاضرات.',
		resultsCourses: 'الكورسات',
		resultsLectures: 'المحاضرات',
		allCategories: 'الكل',
		status: { all: 'الكل', new: 'لسه مبدأتش', progress: 'جاري', done: 'مكتمل' },
		lectureFilter: { all: 'الكل', todo: 'للمذاكرة', done: 'خلصت', revision: 'مراجعة' },
		stats: { courses: 'الكورسات', lectures: 'محاضرات خلصت', progress: 'التقدم الكلي', revision: 'للمراجعة' },
		continue: 'كمّل تعلّم',
		continueCta: 'كمّل',
		progress: p => `مكتمل ${p}%`,
		lecturesCount: n => (n === 0 ? 'مفيش محاضرات' : arPlural(n, 'محاضرة واحدة', 'محاضرتين', 'محاضرات', 'محاضرة')),
		doneOf: (done, total) => `خلصت ${done} من ${total} محاضرة`,
		emptyLibraryTitle: 'ابدأ مكتبتك التعليمية',
		emptyLibraryText: 'ضيف كورس لأي حاجة بتتعلمها — وبعدين ضيف محاضراته، والصق المحتوى، واحفظ ملاحظاتك وأهم النقاط والأسئلة في مكان واحد.',
		emptyFiltered: 'مفيش كورسات بالفلاتر دي.',
		emptyCourseTitle: 'لسه مفيش محاضرات',
		emptyCourseText: 'ضيف أول محاضرة، وبعدين الصق أو اكتب محتواها.',
		emptyLectures: 'مفيش محاضرات في الفلتر ده.',
		emptyRevisionTitle: 'مفيش حاجة للمراجعة',
		emptyRevisionText: 'علّم على أي محاضرة «تحتاج مراجعة» وهتظهر هنا.',
		uncategorized: 'عام',
		fields: {
			title: 'الاسم',
			description: 'الوصف',
			category: 'التصنيف',
			categoryHint: 'مثلاً: برمجة، شبكات',
			color: 'اللون',
			courseTitleHint: 'مثلاً: Network Fundamentals',
			lectureTitleHint: 'مثلاً: المحاضرة 1 — نموذج OSI',
			descriptionHint: 'بيتكلم عن إيه؟ (اختياري)',
		},
		save: 'حفظ',
		create: 'إنشاء',
		cancel: 'إلغاء',
		delete: 'حذف',
		close: 'إغلاق',
		confirmDeleteCourse: title => `حذف «${title}» وكل محاضراته؟`,
		confirmDeleteLecture: title => `حذف محاضرة «${title}»؟`,
		confirmHint: 'هيتشال من مكتبتك.',
		sections: { content: 'المحتوى', notes: 'ملاحظاتي', keyPoints: 'أهم النقاط', summary: 'الملخص', qa: 'أسئلة وأجوبة' },
		sectionHints: {
			notes: 'أفكارك وأسئلتك وتذكيراتك…',
			keyPoints: 'أهم النقاط في المحاضرة دي…',
			summary: 'لخّص المحاضرة بأسلوبك…',
		},
		markDone: 'علّم إنها خلصت',
		markedDone: 'خلصت',
		needsRevision: 'تحتاج مراجعة',
		markRevision: 'علّم للمراجعة',
		prev: 'المحاضرة السابقة',
		next: 'المحاضرة التالية',
		lectureOf: (i, n) => `المحاضرة ${i} من ${n}`,
		focus: 'وضع التركيز',
		details: 'تفاصيل المحاضرة',
		sectionsLabel: 'أقسام المحاضرة',
		readingTime: (words, mins) => `${words} كلمة، قراءة ${mins} دقيقة`,
		exitFocus: 'خروج من التركيز',
		deskLine: (done, total) => (total ? `ذاكرت ${done} من ${total} محاضرة` : 'مكتبتك جاهزة لأول محاضرة'),
		libraryLine: (courses, completed) => `${courses === 1 ? 'كورس واحد' : courses === 2 ? 'كورسين' : `${courses} كورسات`}، خلصت منهم ${completed}`,
		toRevise: n => `${n} للمراجعة`,
		saving: 'بيتحفظ…',
		saved: 'اتحفظ',
		saveFailed: 'متحفظش',
		retry: 'إعادة المحاولة',
		loadFailed: 'مقدرناش نحمّل. اتأكد من الاتصال.',
		tryAgain: 'حاول تاني',
		actionFailed: 'حصلت مشكلة. حاول تاني.',
		qa: {
			question: 'السؤال',
			answer: 'الإجابة',
			add: 'إضافة سؤال',
			empty: 'اكتب أسئلة وإجاباتها عشان تختبر نفسك بعدين.',
			practice: 'تدريب',
			edit: 'تعديل الكروت',
			reveal: 'اعرض الإجابة',
			hide: 'اخفي الإجابة',
			shuffle: 'لخبط الترتيب',
			card: (i, n) => `${i} / ${n}`,
			prevCard: 'السابق',
			nextCard: 'التالي',
			remove: 'حذف السؤال',
			qHint: 'عايز تفتكر إيه؟',
			aHint: 'الإجابة…',
		},
		qaCount: n => arPlural(n, 'سؤال واحد', 'سؤالين', 'أسئلة', 'سؤال'),
		hasContent: 'فيها محتوى',
		dragHint: 'اسحب لتغيير الترتيب',
		inCourse: course => `في ${course}`,
		field: { title: 'الاسم', description: 'الوصف', content: 'المحتوى', notes: 'الملاحظات', keyPoints: 'أهم النقاط', summary: 'الملخص', qa: 'الأسئلة' },
	},
};
