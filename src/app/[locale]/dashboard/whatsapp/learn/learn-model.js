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
		courseKind: 'Course type',
		kinds: {
			general: ['General', 'Content, notes, key points, summary and Q&A.'],
			english: ['English', 'Each lecture is a day: video, transcript, words, questions and speaking.'],
		},
		englishBadge: 'English',
		dayTitleHint: 'e.g. Day 1 — Introduce yourself',
		wordsCount: n => (n === 1 ? '1 word' : `${n} words`),
		en: {
			tabs: { read: 'Watch & read', words: 'Words', questions: 'Questions', speak: 'Speaking', notes: 'Notes' },
			video: 'Video or channel link',
			videoHint: 'Paste a YouTube video or channel link…',
			changeVideo: 'Change link',
			loop: {
				open: 'Loop a part',
				title: 'Practice loop',
				hint: 'Pick a part and how many times to hear it',
				connecting: 'Connecting to the video…',
				failed: 'Couldn’t reach YouTube — check your connection',
				close: 'Close the loop',
				from: 'From',
				to: 'To',
				useNow: 'Use the video’s current time',
				repeat: 'Repeat',
				less: 'Fewer times',
				more: 'More times',
				start: 'Start',
				stop: 'Stop',
				fromHere: m => `${m} min from here`,
				next: r => (r ? `Next part · ${r}` : 'Next part'),
				round: (i, n) => `Round ${i} of ${n}`,
				roundOpen: i => `Round ${i} · no limit`,
				done: n => (n ? `Done — you heard it ${n === 1 ? 'once' : n + ' times'}` : 'Loop stopped'),
				mode: 'Mode',
				wholePart: 'The whole part',
				pieces: 'Piece by piece',
				pieceLen: 'Piece length',
				pieceHint: 'How long each piece is — e.g. 1s, 5s, 30s, 1m',
				piece: (i, n) => `Piece ${i} of ${n}`,
				piecesPlan: (len, reps, n) => `Each ${len} piece plays ${reps ? `${reps}×` : 'non-stop'}, then it moves to the next — ${n} piece${n === 1 ? '' : 's'}.`,
			},
			transcript: 'Transcript',
			transcriptHint: 'Paste the video transcript here. Then select any word or phrase you don’t know to save it with its meaning.',
			startReading: 'Start reading',
			uploadFile: 'Upload .md / .txt',
			fromVideo: 'From the video',
			translating: 'Translating…',
			translateFailed: 'Could not translate right now. You can still save the word.',
			saveWord: 'Save word',
			savedWord: 'Already saved',
			savedWordToast: w => `Saved “${w}”`,
			whatYouSaid: 'What you said',
			editText: 'Edit the text',
			saidHint: 'Type what you said (or fix the speech-to-text)…',
			checkEnglish: 'Check my English',
			checkAgain: 'Check again',
			noFixes: 'No mistakes found — great job!',
			correctedVersion: 'Corrected version',
			gotIt: 'Got it',
			listening: 'Listening… your words will appear here.',
			noSpeechApi: 'Live speech-to-text needs Chrome, Edge or Safari. You can still type what you said after recording.',
			liveLater: 'Your words will be written out when you finish.',
			showArabic: 'Show it in Arabic',
			sections: 'Sections',
			parts: 'Parts',
			mySentence: 'My sentence',
			myGrammarSentence: 'Your own sentence with this rule',
			mySentenceHint: w => `Use “${w}” in your own sentence…`,
			myGrammarHint: 'Write a sentence of your own using this rule…',
			checkSentence: 'Check it with AI',
			sentenceOk: 'Looks right!',
			useFix: 'Use this',
			useTheWord: w => `Try to use “${w}” in it`,
			original: 'Original',
			versionN: n => `Version ${n}`,
			deleteVersion: 'Delete this version',
			newVersion: 'New version',
			newVersionHint: 'Say it again, better — type or paste your new try. The original stays as it is.',
			saveVersion: 'Save version',
			startFromCorrected: 'Start from the corrected text',
			analyse: 'Analyse with AI',
			analyseAgain: 'Analyse again',
			analysing: 'Analysing…',
			aiLook: 'AI analysis',
			level: 'Level',
			levelHint: 'Your English level for this talk (CEFR: A1 → C2)',
			mistakes: n => (n === 0 ? 'No mistakes' : n === 1 ? '1 mistake' : `${n} mistakes`),
			todayWords: 'This day',
			favorites: 'Favorites',
			noFavs: 'No favorite words yet — tap the ☆ next to a word to keep it here, from any day of the course.',
			colWord: 'Word',
			colArabic: 'Arabic',
			colSentences: 'Meaning & sentences',
			fav: 'Add to favorites',
			unfav: 'Remove from favorites',
			showArabicCell: 'Show the Arabic',
			hideArabicCell: 'Hide the Arabic',
			showArabicAll: 'Show Arabic',
			hideArabicAll: 'Hide Arabic',
			learnedOf: 'learned',
			learned: 'Learned',
			markLearned: 'I know this word',
			notLearned: 'Not learned yet',
			hideLearned: 'Hide learned',
			showLearned: 'Show all',
			allLearned: 'You know every word here 🎉',
			deleteRow: 'Delete this row',
			rowDeleted: w => `“${w}” removed`,
			undo: 'Undo',
			hideArabic: 'Hide the Arabic',
			lineFailed: 'Couldn’t translate this sentence right now',
			recNow: 'Recording',
			recPaused: 'Paused',
			recPausedHint: 'Paused — take a breath, then carry on.',
			recLeft: t => `${t} left`,
			recPause: 'Pause',
			recResume: 'Resume',
			recDone: 'Done',
			recDiscard: 'Discard',
			recDiscarded: 'Recording thrown away',
			writingText: 'Writing out what you said…',
			writeForMe: 'Write it for me',
			heardNothing: 'No words were heard in this recording',
			transcribeFailed: 'Couldn’t write out the recording — you can type it',
			fileTooBig: 'That file is too big for a transcript.',
			doneEditing: 'Done',
			editTranscript: 'Edit transcript',
			selectHint: 'Select a word to save it · hover a coloured word for its meaning',
			word: 'Word or phrase',
			addWord: 'Add word',
			editWord: 'Edit word',
			meaning: 'Meaning (English)',
			meaningHint: 'A simple definition…',
			translation: 'Arabic',
			translationHint: 'المعنى بالعربي…',
			example: 'Example',
			exampleHint: 'A sentence that uses it…',
			aiFill: 'Fill with AI',
			aiFailed: 'AI could not answer right now. Try again.',
			listen: 'Listen',
			noMeaning: 'No meaning yet — edit it to add one.',
			fromDay: n => `Day ${n}`,
			wordsCount: n => (n === 1 ? '1 word today' : `${n} words today`),
			noWords: 'No words yet. Select a word in the transcript, or add one here.',
			oldWords: n => `Earlier days' words (${n})`,
			sayMeaning: 'Say the meaning out loud, then check.',
			endPractice: 'Done',
			generate: 'Generate questions',
			noQuestions: 'Write your own questions, or let AI suggest some about today’s topic.',
			questionHint: 'Your question…',
			answerHint: 'Write your answer in English…',
			answerAloud: 'Answer it out loud',
			talkAbout: 'Talk about',
			anotherQuestion: 'Another question',
			backToTopic: 'Back to the topic',
			tryWords: 'Try to use:',
			minutes: 'Minutes',
			min: m => `${m} min`,
			start: 'Start speaking',
			stop: 'Stop',
			recording: 'Recording… speak freely, don’t stop to correct yourself.',
			tapToStart: 'Tap the mic and talk about the topic until the time ends.',
			spokenToday: t => `You spoke ${t} in this lecture`,
			noSessions: 'No speaking sessions yet.',
			otherDevice: 'Recorded on another device.',
			saved: t => `Saved ${t} of speaking`,
			noMic: 'This browser cannot record audio.',
			micDenied: 'Microphone access was blocked. Allow it in the browser settings.',
		},
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
		courseKind: 'نوع الكورس',
		kinds: {
			general: ['عام', 'محتوى وملاحظات وأهم النقاط وملخص وأسئلة.'],
			english: ['إنجليزي', 'كل محاضرة يوم: فيديو وترانسكريبت وكلمات وأسئلة وكلام.'],
		},
		englishBadge: 'إنجليزي',
		dayTitleHint: 'مثلاً: Day 1 — Introduce yourself',
		wordsCount: n => arPlural(n, 'كلمة واحدة', 'كلمتين', 'كلمات', 'كلمة'),
		en: {
			tabs: { read: 'فيديو وقراءة', words: 'الكلمات', questions: 'الأسئلة', speak: 'اتكلم', notes: 'ملاحظات' },
			video: 'لينك الفيديو أو التشانل',
			videoHint: 'الصق لينك فيديو أو تشانل يوتيوب…',
			changeVideo: 'غيّر اللينك',
			loop: {
				open: 'كرّر جزء',
				title: 'تكرار جزء من الفيديو',
				hint: 'اختار الجزء وكام مرة تسمعه',
				connecting: 'بنوصل للفيديو…',
				failed: 'مش قادرين نوصل ليوتيوب — شوف النت',
				close: 'اقفل التكرار',
				from: 'من',
				to: 'لحد',
				useNow: 'خد الوقت الحالي من الفيديو',
				repeat: 'كرّر',
				less: 'أقل',
				more: 'أكتر',
				start: 'ابدأ',
				stop: 'وقّف',
				fromHere: m => `${m} دقايق من هنا`,
				next: r => (r ? `الجزء اللي بعده · ${r}` : 'الجزء اللي بعده'),
				round: (i, n) => `المرة ${i} من ${n}`,
				roundOpen: i => `المرة ${i} · من غير حد`,
				done: n => (n ? `خلصت — سمعته ${n === 1 ? 'مرة' : n === 2 ? 'مرتين' : n + ' مرات'}` : 'وقف التكرار'),
				mode: 'الطريقة',
				wholePart: 'الجزء كله',
				pieces: 'حتة حتة',
				pieceLen: 'طول الحتة',
				pieceHint: 'طول كل حتة — مثلاً 1s أو 5s أو 30s أو 1m',
				piece: (i, n) => `الحتة ${i} من ${n}`,
				piecesPlan: (len, reps, n) => `كل حتة ${len} هتتكرر ${reps ? `${reps} مرات` : 'من غير حد'}، وبعدين تنقل للي بعدها — ${n} حتة.`,
			},
			transcript: 'الترانسكريبت',
			transcriptHint: 'Paste the video transcript here… (الصق الترانسكريبت، وبعدين حدّد أي كلمة مش عارفها عشان تحفظها بمعناها)',
			startReading: 'ابدأ القراءة',
			uploadFile: 'ارفع ملف .md / .txt',
			fromVideo: 'من الفيديو',
			translating: 'بيترجم…',
			translateFailed: 'مقدرناش نترجم دلوقتي. تقدر تحفظ الكلمة برضه.',
			saveWord: 'احفظ الكلمة',
			savedWord: 'محفوظة قبل كده',
			savedWordToast: w => `اتحفظت «${w}»`,
			whatYouSaid: 'اللي قلته',
			editText: 'عدّل النص',
			saidHint: 'Type what you said… (اكتب اللي قلته أو صحّح النص)',
			checkEnglish: 'صحّحلي الإنجليزي',
			checkAgain: 'صحّح تاني',
			noFixes: 'مفيش غلطات — برافو!',
			correctedVersion: 'النسخة المصححة',
			gotIt: 'فهمتها',
			listening: 'بيسمعك… كلامك هيظهر هنا.',
			noSpeechApi: 'تحويل الكلام لنص مباشر محتاج Chrome أو Edge أو Safari. تقدر تكتب اللي قلته بعد التسجيل.',
			liveLater: 'كلامك هيتكتب نص بعد ما تخلّص التسجيل.',
			showArabic: 'ترجمها عربي',
			sections: 'أجزاء الدرس',
			parts: 'الأجزاء',
			mySentence: 'جملتي',
			myGrammarSentence: 'جملة من عندك بالقاعدة دي',
			mySentenceHint: w => `Use “${w}” in your own sentence… (اكتب جملة من عندك)`,
			myGrammarHint: 'Write your own sentence… (اكتب جملة من عندك بالقاعدة دي)',
			checkSentence: 'اتأكد منها بالـ AI',
			sentenceOk: 'مظبوطة!',
			useFix: 'استخدم التصحيح',
			useTheWord: w => `حاول تستخدم «${w}» فيها`,
			original: 'الأصلي',
			versionN: n => `نسخة ${n}`,
			deleteVersion: 'امسح النسخة دي',
			newVersion: 'نسخة جديدة',
			newVersionHint: 'Say it again, better… (قولها تاني أحسن — اكتب أو الصق محاولتك الجديدة، والأصلي هيفضل زي ما هو)',
			saveVersion: 'احفظ النسخة',
			startFromCorrected: 'ابدأ من النص المصحَّح',
			analyse: 'حلّل بالـ AI',
			analyseAgain: 'حلّل تاني',
			analysing: 'بيحلّل…',
			aiLook: 'تحليل الـ AI',
			level: 'المستوى',
			levelHint: 'مستواك في الكلام ده (CEFR من A1 لـ C2)',
			mistakes: n => (n === 0 ? 'مفيش غلطات' : n === 1 ? 'غلطة واحدة' : n === 2 ? 'غلطتين' : `${n} غلطات`),
			todayWords: 'كلمات اليوم',
			favorites: 'المفضلة',
			noFavs: 'مفيش كلمات مفضلة لسه — دوس ☆ جنب أي كلمة عشان تتحفظ هنا، من أي يوم في الكورس.',
			colWord: 'الكلمة',
			colArabic: 'بالعربي',
			colSentences: 'المعنى والجمل',
			fav: 'ضيفها للمفضلة',
			unfav: 'شيلها من المفضلة',
			showArabicCell: 'اظهر العربي',
			hideArabicCell: 'اخفي العربي',
			showArabicAll: 'اظهر العربي',
			hideArabicAll: 'اخفي العربي',
			learnedOf: 'اتحفظت',
			learned: 'حفظتها',
			markLearned: 'حفظت الكلمة دي',
			notLearned: 'لسه ما حفظتهاش',
			hideLearned: 'اخفي اللي حفظته',
			showLearned: 'اظهر الكل',
			allLearned: 'حفظت كل الكلمات هنا 🎉',
			deleteRow: 'امسح الصف ده',
			rowDeleted: w => `اتمسحت «${w}»`,
			undo: 'تراجع',
			hideArabic: 'اخفي الترجمة',
			lineFailed: 'مقدرناش نترجم الجملة دي دلوقتي',
			recNow: 'بيسجّل',
			recPaused: 'متوقّف مؤقتًا',
			recPausedHint: 'وقفة صغيرة — خد نفسك وكمّل.',
			recLeft: t => `فاضل ${t}`,
			recPause: 'إيقاف مؤقت',
			recResume: 'كمّل',
			recDone: 'خلصت',
			recDiscard: 'امسح',
			recDiscarded: 'التسجيل اتمسح',
			writingText: 'بنكتب اللي قلته…',
			writeForMe: 'اكتبه لي',
			heardNothing: 'مفيش كلام اتسمع في التسجيل ده',
			transcribeFailed: 'مقدرناش نكتب التسجيل — تقدر تكتبه بنفسك',
			fileTooBig: 'الملف ده كبير أوي على ترانسكريبت.',
			doneEditing: 'تمام',
			editTranscript: 'تعديل الترانسكريبت',
			selectHint: 'حدّد كلمة عشان تحفظها · قف على أي كلمة ملوّنة تشوف معناها',
			word: 'الكلمة أو الجملة',
			addWord: 'إضافة كلمة',
			editWord: 'تعديل الكلمة',
			meaning: 'المعنى (بالإنجليزي)',
			meaningHint: 'تعريف بسيط…',
			translation: 'بالعربي',
			translationHint: 'المعنى بالعربي…',
			example: 'مثال',
			exampleHint: 'جملة فيها الكلمة…',
			aiFill: 'املأ بالذكاء الاصطناعي',
			aiFailed: 'الذكاء الاصطناعي مش قادر يرد دلوقتي. حاول تاني.',
			listen: 'اسمع النطق',
			noMeaning: 'لسه مفيش معنى — عدّلها وضيفه.',
			fromDay: n => `اليوم ${n}`,
			wordsCount: n => (n === 0 ? 'مفيش كلمات النهارده' : `${arPlural(n, 'كلمة واحدة', 'كلمتين', 'كلمات', 'كلمة')} النهارده`),
			noWords: 'لسه مفيش كلمات. حدّد كلمة في الترانسكريبت، أو ضيفها من هنا.',
			oldWords: n => `كلمات الأيام اللي فاتت (${n})`,
			sayMeaning: 'قول المعنى بصوت عالي، وبعدين اتأكد.',
			endPractice: 'خلصت',
			generate: 'اعمل أسئلة',
			noQuestions: 'اكتب أسئلتك، أو خلّي الذكاء الاصطناعي يقترح أسئلة عن موضوع النهارده.',
			questionHint: 'Your question…',
			answerHint: 'Write your answer in English…',
			answerAloud: 'جاوب عليه بصوتك',
			talkAbout: 'اتكلم عن',
			anotherQuestion: 'سؤال تاني',
			backToTopic: 'رجوع للموضوع',
			tryWords: 'حاول تستخدم:',
			minutes: 'الدقايق',
			min: m => `${m} د`,
			start: 'ابدأ الكلام',
			stop: 'إيقاف',
			recording: 'بيسجّل… اتكلم براحتك ومتقفش عشان تصحح نفسك.',
			tapToStart: 'دوس على المايك واتكلم عن الموضوع لحد ما الوقت يخلص.',
			spokenToday: t => `اتكلمت ${t} في المحاضرة دي`,
			noSessions: 'لسه مفيش تسجيلات.',
			otherDevice: 'اتسجّل على جهاز تاني.',
			saved: t => `اتحفظ ${t} كلام`,
			noMic: 'المتصفح ده مش بيقدر يسجل صوت.',
			micDenied: 'المايك مقفول. اسمح بيه من إعدادات المتصفح.',
		},
	},
};
