'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
	ArrowLeft,
	Bookmark,
	BookOpen,
	Brain,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	ExternalLink,
	Flame,
	GraduationCap,
	Loader2,
	RefreshCw,
	Sparkles,
	Target,
	Youtube,
} from 'lucide-react';
import { learningApi } from './learning-api';
import { LearningPathWorkspace } from './learning-workspace';
import { LearningSystemSwitcher } from './LearningSystemSwitcher';
import {
	LearningDailyOverview,
	LearningHeaderCard,
	LearningHeaderStat,
	LearningPathsTable,
	LearningRoadmapSearchPanel,
	LearningWelcome,
	NewLearningPathButton,
	useLearningWelcome,
} from './learning-ui';
import './learning-landing.css';
import {
	addManualDailyItem,
	createPath,
	createSection,
	createTopic,
	createTopicCard,
	createLayoutBlock,
	detectResourceType,
	DIFFICULTY_OPTIONS,
	emptyLearningState,
	ensureLayoutBlocksForScrape,
	ensurePathDailyItems,
	classifyPathDailyItems,
	findTopic,
	pathProgress,
	pushActivity,
	slimLearningStateForPersist,
	sanitizeRoadmapGraph,
	normalizeLearningText,
	STATUS_OPTIONS,
	todayKey,
	toggleDailyItemComplete,
	uid,
	updateTopicInPaths,
	youtubeIdFromUrl,
} from './learning-utils';
import {
	applyTranslateResults,
	collectTranslateJobs,
	isArabicLocale,
	pathNeedsArabic,
	pathShellArabicIsStale,
	stripPathShellArabic,
	stripTopicArabic,
	topicArabicIsStale,
	topicNeedsArabic,
} from './learning-localize';

const COPY = {
	en: {
		title: 'Learning',
		subtitle: 'Learn anything. Organize everything. Build real mastery.',
		heroTitleBefore: 'Keep',
		heroTitleEm: 'growing',
		heroSubtitle1: 'Learn anything',
		heroSubtitle2: 'Organize everything',
		heroSubtitle3: 'Build real mastery',
		mgmtHeroBefore: 'Build',
		mgmtHeroEm: 'structure',
		mgmtHeroSub1: 'Courses',
		mgmtHeroSub2: 'Modules & topics',
		mgmtHeroSub3: 'Organize learning',
		studyHeroBefore: 'Study',
		studyHeroEm: 'deeply',
		studyHeroSub1: 'Notes & prompts',
		studyHeroSub2: 'Daily review',
		studyHeroSub3: 'Personal knowledge',
		tabPaths: 'Learning paths',
		tabAchievements: 'Achievements',
		tabInsights: 'Insights',
		dayStreak: 'Day streak',
		search: 'Search paths, topics, notes…',
		filterAll: 'All',
		filterFavorites: 'Favorites',
		filterReview: 'Needs review',
		sortRecent: 'Recent',
		sortProgress: 'Progress',
		sortTitle: 'Title',
		searchRoadmaps: 'Search roadmaps',
		searchRoadmapsTitle: 'Find a roadmap to learn anything',
		searchRoadmapsHint:
			'Browse official roadmap.sh cards below, or type a topic — we refine your keyword with AI, then search the web if needed.',
		searchRoadmapsPlaceholder: 'e.g. AI Engineer, React, marketing…',
		searchRoadmapsRun: 'Search',
		searchRoadmapsEnhancing: 'Refining…',
		searchRoadmapsOfficial: 'Official matches',
		searchRoadmapsGenerated: 'Generated roadmap',
		searchRoadmapsWeb: 'Web references',
		searchRoadmapsEmpty: 'No roadmap found yet. Try a clearer topic name or pick a card below.',
		searchRoadmapsCatalog: 'Available roadmaps',
		searchRoadmapsCatalogHint: 'Pick any official roadmap card to import it as a learning path.',
		searchRoadmapsCatalogLoading: 'Loading official roadmaps…',
		searchRoadmapsCatalogEmpty: 'No catalog cards match this filter.',
		searchRoadmapsPopular: 'Popular',
		searchRoadmapsAll: 'All roadmaps',
		searchRoadmapsEnhancedLabel: 'AI refined keyword:',
		importRoadmapResult: 'Import path',
		createFromGenerated: 'Create learning path',
		openLink: 'Open',
		newPath: 'New Learning Path',
		quickAdd: 'Quick Add',
		continue: 'Continue Learning',
		continueShort: 'Continue',
		continueWhere: 'Continue where you left off',
		colPath: 'Path',
		colProgress: 'Progress',
		colCurrent: 'Current topic',
		colActivity: 'Activity',
		colActions: 'Actions',
		actions: 'Actions',
		today: "Today's Learning",
		reviewToday: 'Review Today',
		paths: 'Learning Paths',
		emptyTitle: 'No learning paths yet',
		emptyDesc: 'Start building your first learning roadmap.',
		generateAi: 'Generate Roadmap with AI',
		createManual: 'Create Learning Path',
		topics: 'topics',
		completed: 'completed',
		current: 'Current',
		lastActivity: 'Last activity',
		hours: 'hrs',
		difficulty: 'Difficulty',
		favorite: 'Favorite',
		roadmap: 'Roadmap',
		analytics: 'Analytics',
		overview: 'Overview',
		content: 'Content',
		resources: 'Resources',
		videos: 'Videos',
		notes: 'Notes',
		questions: 'Questions',
		flashcards: 'Flashcards',
		practice: 'Practice',
		aiAssistant: 'AI Assistant',
		summary: 'Quick Summary',
		takeaways: 'Key Takeaways',
		examples: 'Examples',
		markComplete: 'Mark Complete',
		addResource: 'Add Resource',
		askAi: 'Ask AI',
		generateQuestions: 'Generate Questions',
		generateSummary: 'Generate Summary',
		generateFlashcards: 'Generate Flashcards',
		addNote: 'Add Note',
		save: 'Save',
		cancel: 'Cancel',
		delete: 'Delete',
		back: 'Back',
		loading: 'Loading your learning OS…',
		saving: 'Saving…',
		aiWorking: 'AI is thinking…',
		goalPlaceholder: 'I want to become an AI Engineer…',
		titleLabel: 'Title',
		descLabel: 'Description',
		categoryLabel: 'Category',
		goalLabel: 'Goal',
		outcomeLabel: 'Target outcome',
		tagsLabel: 'Tags (comma separated)',
		estimatedLabel: 'Estimated hours',
		editRoadmap: 'Edit roadmap before saving',
		section: 'Section',
		addSection: 'Add section',
		addTopic: 'Add topic',
		resourceUrl: 'Paste YouTube, article, docs, or GitHub URL',
		resourceTitle: 'Resource title',
		watched: 'Mark watched',
		openLink: 'Open',
		notePlaceholder: 'Capture a thought, doubt, or insight…',
		askPlaceholder: 'Explain this like I am a beginner…',
		confidence: 'How confident are you?',
		mastery: 'Mastery',
		status: 'Status',
		streak: 'day streak',
		weekTime: 'learned this week',
		inbox: 'Resource Inbox',
		saved: 'Saved',
		noTopics: 'No topics in this path yet.',
		beginner: 'Beginner',
		intermediate: 'Intermediate',
		advanced: 'Advanced',
		not_started: 'Not started',
		learning: 'Learning',
		in_progress: 'In progress',
		needs_review: 'Needs review',
		mastered: 'Mastered',
		completed: 'Completed',
		aiGenerated: 'AI generated',
		accept: 'Accept',
		regenerate: 'Regenerate',
		tldr: 'TL;DR',
		keyConcepts: 'Key Concepts',
		importantTerms: 'Important Terms',
		remember: 'What you should remember',
		flip: 'Flip',
		again: 'Again',
		easy: 'Easy',
		medium: 'Medium',
		hard: 'Hard',
		correct: 'Correct',
		incorrect: 'Incorrect',
		explanation: 'Explanation',
		score: 'Score',
		startQuiz: 'Start Quiz',
		nextQuestion: 'Next',
		finishQuiz: 'Finish',
		weakAreas: 'Weak areas',
		strongAreas: 'Strong areas',
		related: 'Related topics',
		prerequisites: 'Prerequisites',
		focusMode: 'Focus reading',
		exitFocus: 'Exit focus',
		confirmDeletePath: 'Delete this learning path and all topics?',
		confirmDeleteTopic: 'Delete this topic?',
		savedToast: 'Learning state saved',
		createdToast: 'Learning path created',
		errorLoad: 'Could not load learning data',
		errorSave: 'Could not save learning data',
		errorAi: 'AI request failed. Try again.',
		welcomeBadge: 'Learning OS',
		welcomeTitle: 'Learn anything — one clear system',
		welcomeDesc:
			'Create a path, follow topics step by step, capture resources, and review what needs reinforcement. This first screen is your home base.',
		welcomeStep1Title: 'Create a path',
		welcomeStep1Desc: 'Start from a goal or generate a full roadmap with AI.',
		welcomeStep2Title: 'Open a topic',
		welcomeStep2Desc: 'Read content, add notes, videos, and practice inside one workspace.',
		welcomeStep3Title: 'Review & mastery',
		welcomeStep3Desc: 'Mark confidence, revisit weak topics, and track streak progress.',
		welcomeStep4Title: 'Save for later',
		welcomeStep4Desc: 'Drop links into the inbox until you attach them to a topic.',
		welcomeSkip: 'Explore on my own',
		emptyInbox: 'Paste a link to keep for later',
		emptyReview: 'Nothing waiting for review today',
		quickCreateHint: 'Name it — details come next inside the path.',
		quickCreatePlaceholder: 'e.g. Machine Learning Basics',
		startPath: 'Start path',
		pathSetup: 'Path setup',
		pathSetupHint: 'Goal, roadmap, topics, and AI tools live here.',
		emptyRoadmap: 'No topics yet. Add a section or generate a roadmap with AI.',
		applyRoadmap: 'Apply roadmap',
		discardDraft: 'Discard',
		dailyPlanner: "Today's list",
		dailyPlannerHint: 'Learn today, review today, and catch up overdue items by priority.',
		dailyTodayList: 'Today',
		dailyOverdue: 'Overdue',
		dailyNew: 'New',
		dailyReview: 'Review',
		dailyNewToday: 'Learn today',
		dailyReviewToday: 'Review today',
		dailyDoneToday: 'Done today',
		dailyDone: 'Done',
		dailyCheck: 'Mark done',
		dailyUncheck: 'Mark not done',
		dailyAdd: 'Add',
		dailyAddPlaceholder: 'Something to learn today…',
		dailyEmptyCard: 'No items planned yet — open the path to build your daily list.',
		dailyMore: 'more',
		dailyDaysShort: 'd',
		dailyOverviewEmpty: 'Nothing scheduled for today across your paths.',
		dailyOverdueHint: '{days}d late — finish this before starting a new module',
		dailyOverduePriorityHint: 'Oldest first — clear these before jumping to a new module',
		todayPlan: "Today's plan",
		sidePanelEmpty: 'Your other learning paths will appear here',
		pathWorldHint: 'Your learning world — daily plan, details, and roadmap.',
		tabToday: 'Today',
		tabDetails: 'Details',
		tabRoadmap: 'Roadmap',
		openPath: 'Open path',
		indexTitle: 'Index',
		indexHint: 'Sections group your topics. Click a topic to open it. Use the edit icon to rename.',
		indexEmpty: 'No topics yet — add a section or import a roadmap.',
		indexSectionEmpty: 'No topics in this section yet.',
		sectionNamePlaceholder: 'Section name',
		topicNamePlaceholder: 'Topic name',
		renameSection: 'Rename section',
		renameTopic: 'Rename topic',
		deleteSection: 'Delete section',
		deleteTopic: 'Delete topic',
		openTopic: 'Open topic',
		confirmDeleteSection: 'Delete this section and all its topics?',
		pathOverview: 'Path overview',
		closeTopic: 'Close topic',
		pathMenu: 'Path actions',
		viewAll: 'View all',
		expandAllSections: 'Expand all sections',
		collapseAllSections: 'Collapse all sections',
		openFullRoadmap: 'Full roadmap view',
		expandRoadmapFullscreen: 'Fullscreen',
		exitRoadmapFullscreen: 'Exit fullscreen',
		markTopicDone: 'Mark topic done',
		videoFirst: 'Video',
		noVideoYet: 'Paste a YouTube link above',
		videoUrlPlaceholder: 'YouTube or video URL',
		ticketsTitle: 'Tickets & notes',
		ticket: 'Ticket',
		richTicket: 'Rich ticket',
		ticketsEmpty: 'Add quick tickets or rich markdown cards for this topic.',
		ticketBodyPlaceholder: 'Write a note or markdown…',
		scraperTitle: 'Import from link',
		scraperHint: 'Paste an article, docs, or tutorial URL — AI will extract topic details.',
		scraperPlaceholder: 'https://…',
		scraperRun: 'Scrape & fill',
		contentPlaceholder: 'Notes in Markdown…',
		roadmapImportTitle: 'Import roadmap from link',
		roadmapImportHint: 'Paste an official roadmap.sh URL — we clone the full graph, modules, timing, and free resources.',
		roadmapImportPlaceholder: 'https://roadmap.sh/…',
		roadmapImportRun: 'Generate roadmap',
		importSuccess: 'Imported successfully',
		roadmapVisual: 'Interactive roadmap',
		roadmapGraphEmpty: 'Import an official roadmap.sh link to unlock the visual graph.',
		roadmapResources: 'Resources',
		roadmapTopicContent: 'Topic',
		roadmapFreeResources: 'Free resources',
		roadmapReferences: 'Saved references',
		roadmapNoResources: 'No free resources attached to this topic yet.',
		roadmapNoContent: 'No topic content yet.',
		roadmapKeywords: 'Keywords',
		roadmapVideos: 'Video suggestions',
		roadmapTakeaways: 'Key takeaways',
		roadmapStudySuggestions: 'Study suggestions',
		roadmapLessonPacks: 'Lesson packs',
		roadmapScrapeResource: 'Scrape & summarize',
		roadmapResourceSaved: 'Resource summarized into topic references.',
		roadmapResourceSavedDetailed:
			'Saved into topic "{topic}" → References, content notes, and a research card.',
		roadmapBulkScrapeSaved:
			'Scraped {count} resources into topic "{topic}" (references + compiled notes).',
		roadmapScrapeSavedTitle: 'Saved inside this topic',
		roadmapScrapeSavedBody:
			'{count} source(s) added to "{topic}" under Saved references, topic content, and tickets.',
		roadmapScrapeDestinationHint:
			'Scrape saves summaries into this topic: References + content notes + a research ticket. Open the topic to study them.',
		roadmapReferencesHint: 'These live inside the topic — open it anytime from Index or Open topic.',
		roadmapReferencesEmpty:
			'The scraped articles you keep for this topic will show up here for quick access while you study.',
		roadmapViewSavedReferences: 'Jump to saved',
		selectAllResources: 'Select all',
		deselectAllResources: 'Deselect all',
		scrapeSelectedResources: 'Scrape selected',
		selectResource: 'Select resource',
		minutes: 'min',
		close: 'Close',
		blocksPalette: 'Blocks',
		blocksPaletteHint: 'Drag into the topic body, or click to add.',
		blocksEmpty: 'Drop blocks here',
		blocksEmptyHint: 'Pull blocks from the panel on the right →',
		removeBlock: 'Remove block',
		topicModeEdit: 'Build',
		topicModeStudy: 'Study',
		topicModeRoadmap: 'Roadmap',
		topicModeEditHint: 'Add blocks, edit content, and arrange your topic.',
		topicModeStudyHint: 'Focus view — read and review without editing.',
		topicModeRoadmapHint: 'Full interactive roadmap without the index sidebar.',
		showTranscript: 'Show transcript',
		hideTranscript: 'Hide transcript',
		translateTranscriptAr: 'Translate to Arabic',
		showArabicTranscript: 'Show Arabic',
		showOriginalTranscript: 'Show original',
		transcriptHint: 'Follow along — the current sentence highlights as the video plays. Select a term to explain it.',
		transcriptLoaded: 'Transcript loaded',
		transcriptLoadFailed: 'Could not load transcript. The video may have no captions.',
		transcriptTranslated: 'Arabic transcript ready',
		transcriptTranslateFailed: 'Could not translate transcript',
		transcriptEmpty: 'No transcript cues yet.',
		summarizeTranscript: 'Summarize video',
		transcriptSummarized: 'Video summary ready — read it before watching',
		transcriptSummarizeFailed: 'Could not summarize this transcript',
		videoSummaryTitle: 'Before you watch',
		videoSummaryFromTranscript: 'From transcript',
		explainTerm: 'Explain',
		termExplainFailed: 'Could not explain this term',
		inThisDomain: 'In this domain',
		simpleExample: 'Example',
		dropInsertHere: 'Drop here',
		studyEmpty: 'Nothing to study yet — switch to Build mode and add blocks.',
		confirmDeleteYes: 'Yes, delete',
		confirmDeleteNo: 'No',
		roadmapUrlNormalized: 'Switched to the static roadmap page for better import.',
	},
	ar: {
		title: 'التعلم',
		subtitle: 'تعلّم أي شيء. نظّم كل شيء. ابنِ إتقاناً حقيقياً.',
		heroTitleBefore: 'واصل',
		heroTitleEm: 'النمو',
		heroSubtitle1: 'تعلّم أي شيء',
		heroSubtitle2: 'نظّم كل شيء',
		heroSubtitle3: 'ابنِ إتقاناً حقيقياً',
		mgmtHeroBefore: 'ابنِ',
		mgmtHeroEm: 'الهيكل',
		mgmtHeroSub1: 'كورسات',
		mgmtHeroSub2: 'موديولات وموضوعات',
		mgmtHeroSub3: 'تنظيم التعلم',
		studyHeroBefore: 'ذاكر',
		studyHeroEm: 'بعمق',
		studyHeroSub1: 'ملاحظات وPrompts',
		studyHeroSub2: 'مراجعة يومية',
		studyHeroSub3: 'معرفة شخصية',
		tabPaths: 'مسارات التعلم',
		tabAchievements: 'الإنجازات',
		tabInsights: 'الرؤى',
		dayStreak: 'سلسلة الأيام',
		search: 'ابحث في المسارات والموضوعات والملاحظات…',
		filterAll: 'الكل',
		filterFavorites: 'المفضلة',
		filterReview: 'يحتاج مراجعة',
		sortRecent: 'الأحدث',
		sortProgress: 'التقدم',
		sortTitle: 'العنوان',
		searchRoadmaps: 'بحث الخرائط',
		searchRoadmapsTitle: 'دور على خارطة لأي حاجة عايز تتعلمها',
		searchRoadmapsHint:
			'اختَر من كروت roadmap.sh الجاهزة، أو اكتب موضوع — هنحسّن الكلمة بالـ AI وبعدين ندور على النت لو محتاجين.',
		searchRoadmapsPlaceholder: 'مثال: AI Engineer، React، marketing…',
		searchRoadmapsRun: 'بحث',
		searchRoadmapsEnhancing: 'بيتحسّن…',
		searchRoadmapsOfficial: 'نتائج رسمية',
		searchRoadmapsGenerated: 'خارطة مولَّدة',
		searchRoadmapsWeb: 'مراجع من الويب',
		searchRoadmapsEmpty: 'مفيش خارطة لسه. جرّب اسم أوضح أو اختَر كارت من تحت.',
		searchRoadmapsCatalog: 'الخرائط المتاحة',
		searchRoadmapsCatalogHint: 'اختَر أي كارت رسمي واستورده كمسار تعلم.',
		searchRoadmapsCatalogLoading: 'بنحمّل الخرائط الرسمية…',
		searchRoadmapsCatalogEmpty: 'مفيش كروت مطابقة للفلتر ده.',
		searchRoadmapsPopular: 'الأشهر',
		searchRoadmapsAll: 'كل الخرائط',
		searchRoadmapsEnhancedLabel: 'الكلمة بعد تحسين الـ AI:',
		importRoadmapResult: 'استيراد المسار',
		createFromGenerated: 'إنشاء مسار تعلم',
		openLink: 'فتح',
		newPath: 'مسار تعلم جديد',
		quickAdd: 'إضافة سريعة',
		continue: 'متابعة التعلم',
		continueShort: 'متابعة',
		continueWhere: 'أكمل من حيث توقفت',
		colPath: 'المسار',
		colProgress: 'التقدم',
		colCurrent: 'الموضوع الحالي',
		colActivity: 'النشاط',
		colActions: 'إجراءات',
		actions: 'إجراءات',
		today: 'تعلم اليوم',
		reviewToday: 'مراجعة اليوم',
		paths: 'مسارات التعلم',
		emptyTitle: 'لا توجد مسارات بعد',
		emptyDesc: 'ابدأ ببناء أول خارطة طريق للتعلم.',
		generateAi: 'توليد خارطة طريق بالذكاء الاصطناعي',
		createManual: 'إنشاء مسار تعلم',
		topics: 'موضوعات',
		completed: 'مكتمل',
		current: 'الحالي',
		lastActivity: 'آخر نشاط',
		hours: 'ساعة',
		difficulty: 'الصعوبة',
		favorite: 'مفضلة',
		roadmap: 'خارطة الطريق',
		analytics: 'تحليلات',
		overview: 'نظرة عامة',
		content: 'المحتوى',
		resources: 'الموارد',
		videos: 'فيديوهات',
		notes: 'ملاحظات',
		questions: 'أسئلة',
		flashcards: 'بطاقات',
		practice: 'تدريب',
		aiAssistant: 'مساعد الذكاء',
		summary: 'ملخص سريع',
		takeaways: 'أهم النقاط',
		examples: 'أمثلة',
		markComplete: 'وضع كمكتمل',
		addResource: 'إضافة مورد',
		askAi: 'اسأل الذكاء',
		generateQuestions: 'توليد أسئلة',
		generateSummary: 'توليد ملخص',
		generateFlashcards: 'توليد بطاقات',
		addNote: 'إضافة ملاحظة',
		save: 'حفظ',
		cancel: 'إلغاء',
		delete: 'حذف',
		back: 'رجوع',
		loading: 'جارٍ تحميل نظام التعلم…',
		saving: 'جارٍ الحفظ…',
		aiWorking: 'الذكاء الاصطناعي يفكر…',
		goalPlaceholder: 'أريد أن أصبح مهندس ذكاء اصطناعي…',
		titleLabel: 'العنوان',
		descLabel: 'الوصف',
		categoryLabel: 'التصنيف',
		goalLabel: 'الهدف',
		outcomeLabel: 'النتيجة المستهدفة',
		tagsLabel: 'وسوم (مفصولة بفاصلة)',
		estimatedLabel: 'الساعات المقدرة',
		editRoadmap: 'عدّل الخارطة قبل الحفظ',
		section: 'قسم',
		addSection: 'إضافة قسم',
		addTopic: 'إضافة موضوع',
		resourceUrl: 'الصق رابط يوتيوب أو مقال أو وثائق أو GitHub',
		resourceTitle: 'عنوان المورد',
		watched: 'وضع كمشاهَد',
		openLink: 'فتح',
		notePlaceholder: 'سجّل فكرة أو شك أو ملاحظة…',
		askPlaceholder: 'اشرح لي هذا كمبتدئ…',
		confidence: 'ما مدى ثقتك؟',
		mastery: 'الإتقان',
		status: 'الحالة',
		streak: 'يوم متواصل',
		weekTime: 'تعلمت هذا الأسبوع',
		inbox: 'صندوق الموارد',
		saved: 'المحفوظات',
		noTopics: 'لا توجد موضوعات في هذا المسار بعد.',
		beginner: 'مبتدئ',
		intermediate: 'متوسط',
		advanced: 'متقدم',
		not_started: 'لم يبدأ',
		learning: 'قيد التعلم',
		in_progress: 'جارٍ',
		needs_review: 'يحتاج مراجعة',
		mastered: 'متقن',
		completed: 'مكتمل',
		aiGenerated: 'مولَّد بالذكاء',
		accept: 'قبول',
		regenerate: 'إعادة التوليد',
		tldr: 'باختصار',
		keyConcepts: 'المفاهيم الأساسية',
		importantTerms: 'مصطلحات مهمة',
		remember: 'ما يجب تذكره',
		flip: 'قلب',
		again: 'مرة أخرى',
		easy: 'سهل',
		medium: 'متوسط',
		hard: 'صعب',
		correct: 'صحيح',
		incorrect: 'خطأ',
		explanation: 'الشرح',
		score: 'النتيجة',
		startQuiz: 'بدء الاختبار',
		nextQuestion: 'التالي',
		finishQuiz: 'إنهاء',
		weakAreas: 'نقاط ضعف',
		strongAreas: 'نقاط قوة',
		related: 'موضوعات ذات صلة',
		prerequisites: 'متطلبات سابقة',
		focusMode: 'وضع القراءة',
		exitFocus: 'إنهاء التركيز',
		confirmDeletePath: 'حذف مسار التعلم وكل موضوعاته؟',
		confirmDeleteTopic: 'حذف هذا الموضوع؟',
		savedToast: 'تم حفظ حالة التعلم',
		createdToast: 'تم إنشاء مسار التعلم',
		errorLoad: 'تعذر تحميل بيانات التعلم',
		errorSave: 'تعذر حفظ بيانات التعلم',
		errorAi: 'فشل طلب الذكاء الاصطناعي. حاول مجدداً.',
		welcomeBadge: 'نظام التعلم',
		welcomeTitle: 'تعلّم أي شيء — بنظام واحد واضح',
		welcomeDesc:
			'أنشئ مساراً، تابع الموضوعات خطوة بخطوة، احفظ الموارد، وراجع ما يحتاج تثبيت. هذه الشاشة الأولى هي قاعدتك.',
		welcomeStep1Title: 'أنشئ مساراً',
		welcomeStep1Desc: 'ابدأ من هدف أو ولّد خارطة طريق كاملة بالذكاء الاصطناعي.',
		welcomeStep2Title: 'افتح موضوعاً',
		welcomeStep2Desc: 'اقرأ المحتوى، أضف ملاحظات وفيديوهات وتمارين في مساحة واحدة.',
		welcomeStep3Title: 'مراجعة وإتقان',
		welcomeStep3Desc: 'حدّد ثقتك، راجع نقاط الضعف، وتابع سلسلة الأيام.',
		welcomeStep4Title: 'احفظ لاحقاً',
		welcomeStep4Desc: 'أسقط الروابط في الصندوق إلى أن تربطها بموضوع.',
		welcomeSkip: 'استكشف بنفسي',
		emptyInbox: 'الصق رابطاً لتحفظه لاحقاً',
		emptyReview: 'لا يوجد شيء للمراجعة اليوم',
		quickCreateHint: 'سمِّ المسار — التفاصيل هتكون جواه بعد كده.',
		quickCreatePlaceholder: 'مثال: أساسيات تعلم الآلة',
		startPath: 'ابدأ المسار',
		pathSetup: 'إعداد المسار',
		pathSetupHint: 'الهدف، خارطة الطريق، الموضوعات، والذكاء الاصطناعي — كلها هنا.',
		emptyRoadmap: 'لا توجد موضوعات بعد. أضف قسماً أو ولّد خارطة بالذكاء الاصطناعي.',
		applyRoadmap: 'تطبيق الخارطة',
		discardDraft: 'تجاهل',
		dailyPlanner: 'قائمة اليوم',
		dailyPlannerHint: 'تعلّم النهاردة، راجع النهاردة، وخلّص المتأخر بالأولوية.',
		dailyTodayList: 'اليوم',
		dailyOverdue: 'متأخر',
		dailyNew: 'جديد',
		dailyReview: 'مراجعة',
		dailyNewToday: 'تعلّم اليوم',
		dailyReviewToday: 'راجع اليوم',
		dailyDoneToday: 'تم اليوم',
		dailyDone: 'تم',
		dailyCheck: 'وضع كمكتمل',
		dailyUncheck: 'إلغاء الإكمال',
		dailyAdd: 'إضافة',
		dailyAddPlaceholder: 'حاجة هتتعلمها النهاردة…',
		dailyEmptyCard: 'مفيش عناصر بعد — افتح المسار وابنِ قائمة يومك.',
		dailyMore: 'أخرى',
		dailyDaysShort: 'ي',
		dailyOverviewEmpty: 'مفيش حاجة مجدولة النهاردة في مساراتك.',
		dailyOverdueHint: 'متأخر {days} يوم — خلّص ده قبل ما تبدأ موديول جديد',
		dailyOverduePriorityHint: 'الأقدم أولاً — خلّص المتأخر قبل ما تقفز لموديول جديد',
		todayPlan: 'خطة اليوم',
		sidePanelEmpty: 'مسارات التعلم التانية هتظهر هنا',
		pathWorldHint: 'عالم التعلم بتاعك — خطة اليوم، التفاصيل، وخارطة الطريق.',
		tabToday: 'اليوم',
		tabDetails: 'التفاصيل',
		tabRoadmap: 'الخارطة',
		openPath: 'افتح المسار',
		indexTitle: 'الفهرس',
		indexHint: 'الأقسام بتجمّع الموضوعات. اضغط على موضوع لفتحه. استخدم أيقونة التعديل لإعادة التسمية.',
		indexEmpty: 'مفيش موضوعات بعد — أضف قسم أو استورد خارطة.',
		indexSectionEmpty: 'مفيش موضوعات في القسم ده بعد.',
		sectionNamePlaceholder: 'اسم القسم',
		topicNamePlaceholder: 'اسم الموضوع',
		renameSection: 'إعادة تسمية القسم',
		renameTopic: 'إعادة تسمية الموضوع',
		deleteSection: 'حذف القسم',
		deleteTopic: 'حذف الموضوع',
		openTopic: 'فتح الموضوع',
		confirmDeleteSection: 'حذف القسم ده وكل موضوعاته؟',
		pathOverview: 'نظرة المسار',
		closeTopic: 'إغلاق الموضوع',
		pathMenu: 'إجراءات المسار',
		viewAll: 'عرض الكل',
		expandAllSections: 'توسيع كل الأقسام',
		collapseAllSections: 'طي كل الأقسام',
		openFullRoadmap: 'عرض الخارطة كاملة',
		expandRoadmapFullscreen: 'ملء الشاشة',
		exitRoadmapFullscreen: 'إغلاق ملء الشاشة',
		markTopicDone: 'وضع الموضوع كمكتمل',
		videoFirst: 'الفيديو',
		noVideoYet: 'الصق رابط يوتيوب فوق',
		videoUrlPlaceholder: 'رابط يوتيوب أو فيديو',
		ticketsTitle: 'تذاكر وملاحظات',
		ticket: 'تذكرة',
		richTicket: 'تذكرة غنية',
		ticketsEmpty: 'أضف تذاكر سريعة أو بطاقات markdown للموضوع.',
		ticketBodyPlaceholder: 'اكتب ملاحظة أو markdown…',
		scraperTitle: 'استيراد من رابط',
		scraperHint: 'الصق مقال أو docs أو tutorial — الذكاء هيجمع تفاصيل الموضوع.',
		scraperPlaceholder: 'https://…',
		scraperRun: 'استخراج وملء',
		contentPlaceholder: 'ملاحظات بـ Markdown…',
		roadmapImportTitle: 'استيراد خارطة من رابط',
		roadmapImportHint: 'الصق رابط roadmap.sh رسمي — هنستنسخ الـ graph كامل مع الموديولات والوقت والموارد المجانية.',
		roadmapImportPlaceholder: 'https://roadmap.sh/…',
		roadmapImportRun: 'توليد الخارطة',
		importSuccess: 'تم الاستيراد بنجاح',
		roadmapVisual: 'خارطة تفاعلية',
		roadmapGraphEmpty: 'استورد رابط roadmap.sh رسمي عشان تفتح الـ graph البصري.',
		roadmapResources: 'الموارد',
		roadmapTopicContent: 'الموضوع',
		roadmapFreeResources: 'موارد مجانية',
		roadmapReferences: 'مراجع محفوظة',
		roadmapNoResources: 'مفيش موارد مجانية على الموضوع ده بعد.',
		roadmapNoContent: 'مفيش محتوى للموضوع بعد.',
		roadmapKeywords: 'كلمات مفتاحية',
		roadmapVideos: 'اقتراحات فيديو',
		roadmapTakeaways: 'أهم النقاط',
		roadmapStudySuggestions: 'اقتراحات للمذاكرة',
		roadmapLessonPacks: 'باقات دروس',
		roadmapScrapeResource: 'استخراج وتلخيص',
		roadmapResourceSaved: 'اتحفظ ملخص المورد داخل مراجع الموضوع.',
		roadmapResourceSavedDetailed:
			'اتحفظ جوا الموضوع "{topic}" → المراجع + ملاحظات المحتوى + كارت بحث.',
		roadmapBulkScrapeSaved:
			'اتعمل scrape لـ {count} مورد واتضافوا للموضوع "{topic}" (مراجع + ملاحظات مجمّعة).',
		roadmapScrapeSavedTitle: 'اتحفظ جوا الموضوع ده',
		roadmapScrapeSavedBody:
			'{count} مصدر اتضاف لـ "{topic}" في المراجع المحفوظة ومحتوى الموضوع والتذاكر.',
		roadmapScrapeDestinationHint:
			'الـ scrape بيحفظ الملخص جوا نفس الموضوع: مراجع + ملاحظات محتوى + تذكرة بحث. افتح الموضوع عشان تذاكرها.',
		roadmapReferencesHint: 'دول محفوظين جوا الموضوع — تقدر تفتحه من الفهرس أو Open topic.',
		roadmapReferencesEmpty:
			'المقالات اللي هتعملها scrape وتتسيبها للموضوع هتظهر هنا عشان ترجع لها بسرعة وأنت بتذاكر.',
		roadmapViewSavedReferences: 'روح للمحفوظ',
		selectAllResources: 'تحديد الكل',
		deselectAllResources: 'إلغاء التحديد',
		scrapeSelectedResources: 'استخراج المحدد',
		selectResource: 'تحديد المورد',
		minutes: 'د',
		close: 'إغلاق',
		blocksPalette: 'البلوكات',
		blocksPaletteHint: 'اسحب للجسم أو اضغط للإضافة.',
		blocksEmpty: 'أفلت البلوكات هنا',
		blocksEmptyHint: 'اسحب البلوكات من اللوحة على اليمين ←',
		removeBlock: 'إزالة البلوك',
		topicModeEdit: 'بناء',
		topicModeStudy: 'مذاكرة',
		topicModeRoadmap: 'الخارطة',
		topicModeEditHint: 'أضف بلوكات، عدّل المحتوى، ورتّب الموضوع.',
		topicModeStudyHint: 'وضع تركيز — اقرأ وراجع بدون تعديل.',
		topicModeRoadmapHint: 'خارطة تفاعلية كاملة بدون فهرس الجنب.',
		showTranscript: 'إظهار الترانسكربت',
		hideTranscript: 'إخفاء الترانسكربت',
		translateTranscriptAr: 'ترجمة للعربي',
		showArabicTranscript: 'عرض العربي',
		showOriginalTranscript: 'عرض الأصل',
		transcriptHint: 'تابع مع الفيديو — الجملة الحالية بتتظلل أوتوماتيك. حدّد مصطلح عشان نوضحه.',
		transcriptLoaded: 'تم تحميل الترانسكربت',
		transcriptLoadFailed: 'مقدرناش نجيب الترانسكربت. يمكن الفيديو من غير كابشنز.',
		transcriptTranslated: 'الترجمة العربي جاهزة',
		transcriptTranslateFailed: 'فشلت ترجمة الترانسكربت',
		transcriptEmpty: 'مفيش جمل في الترانسكربت بعد.',
		summarizeTranscript: 'لخّص الفيديو',
		transcriptSummarized: 'ملخص الفيديو جاهز — اقرأه قبل ما تتفرج',
		transcriptSummarizeFailed: 'مقدرناش نلخّص الترانسكربت ده',
		videoSummaryTitle: 'قبل ما تتفرج',
		videoSummaryFromTranscript: 'من الترانسكربت',
		explainTerm: 'اشرح',
		termExplainFailed: 'مقدرناش نشرح المصطلح ده',
		inThisDomain: 'في المجال ده',
		simpleExample: 'مثال',
		dropInsertHere: 'أفلت هنا',
		studyEmpty: 'مفيش حاجة للمذاكرة بعد — روح لوضع البناء وأضف بلوكات.',
		confirmDeleteYes: 'نعم، احذف',
		confirmDeleteNo: 'لا',
		roadmapUrlNormalized: 'اتحوّلنا لصفحة الخارطة الثابتة عشان الاستيراد يكون أحسن.',
	},
};

const cx = (...parts) => parts.filter(Boolean).join(' ');

function labelDifficulty(t, value) {
	return t[value] || value;
}

function labelStatus(t, value) {
	return t[value] || value;
}

function relativeTime(value, locale) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	const diff = Date.now() - date.getTime();
	const mins = Math.round(diff / 60000);
	if (mins < 1) return locale === 'ar' ? 'الآن' : 'just now';
	if (mins < 60) return locale === 'ar' ? `منذ ${mins} د` : `${mins}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return locale === 'ar' ? `منذ ${hours} س` : `${hours}h ago`;
	const days = Math.round(hours / 24);
	return locale === 'ar' ? `منذ ${days} ي` : `${days}d ago`;
}

function ProgressRing({ value = 0, size = 52 }) {
	const r = (size - 8) / 2;
	const c = 2 * Math.PI * r;
	const pct = Math.max(0, Math.min(100, Number(value) || 0));
	const gradId = `learnGrad-${size}-${Math.round(pct)}`;
	return (
		<svg width={size} height={size} className="-rotate-90">
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				stroke="currentColor"
				strokeWidth="6"
				className="text-slate-200 dark:text-slate-700"
				fill="none"
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				stroke={`url(#${gradId})`}
				strokeWidth="6"
				strokeLinecap="round"
				strokeDasharray={c}
				strokeDashoffset={c - (pct / 100) * c}
				fill="none"
			/>
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="var(--color-gradient-from, #6366f1)" />
					<stop offset="100%" stopColor="var(--color-gradient-to, #a855f7)" />
				</linearGradient>
			</defs>
		</svg>
	);
}

export default function LearningStudio({ system = 'management' }) {
	const isStudySystem = system === 'study';
	const locale = useLocale();
	const t = COPY[locale?.startsWith('ar') ? 'ar' : 'en'];
	const router = useRouter();
	const searchParams = useSearchParams();
	const urlSyncedRef = useRef(false);
	const [boot, setBoot] = useState('loading');
	const [state, setState] = useState(emptyLearningState());
	const [saving, setSaving] = useState(false);
	const [view, setView] = useState('dashboard');
	const [pathId, setPathId] = useState(null);
	const [topicId, setTopicId] = useState(null);
	const [pathTab, setPathTab] = useState('today');
	const [workspaceTab, setWorkspaceTab] = useState(isStudySystem ? 'today' : 'roadmap');
	const [topicTab, setTopicTab] = useState('overview');
	const [dashboardMode, setDashboardMode] = useState(isStudySystem ? 'overview' : 'paths');
	const [roadmapSearchQuery, setRoadmapSearchQuery] = useState('');
	const [roadmapSearchResult, setRoadmapSearchResult] = useState(null);
	const [roadmapCatalog, setRoadmapCatalog] = useState([]);
	const [roadmapCatalogBusy, setRoadmapCatalogBusy] = useState(false);
	const [roadmapDraft, setRoadmapDraft] = useState([]);
	const [aiBusy, setAiBusy] = useState('');
	const [importBusy, setImportBusy] = useState('');
	const [focusMode, setFocusMode] = useState(false);
	const [resourceDraft, setResourceDraft] = useState({ url: '', title: '' });
	const [noteDraft, setNoteDraft] = useState('');
	const [askDraft, setAskDraft] = useState('');
	const [askReply, setAskReply] = useState('');
	const [quizIndex, setQuizIndex] = useState(0);
	const [quizAnswers, setQuizAnswers] = useState({});
	const [flashIndex, setFlashIndex] = useState(0);
	const [flashFlipped, setFlashFlipped] = useState(false);
	const [confidence, setConfidence] = useState(3);
	const [inboxUrl, setInboxUrl] = useState('');
	const saveTimer = useRef(null);
	const saveGenRef = useRef(0);
	const pendingRollbackRef = useRef(null);
	const skipFirstSave = useRef(true);
	const quickCreateRef = useRef(null);
	const translateLock = useRef(new Set());
	const stateRef = useRef(state);
	const { welcomeOpen, dismissWelcome } = useLearningWelcome(boot === 'ready');

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const persist = useCallback(async (next, meta = {}) => {
		const { rollbackTo = null, gen = 0 } = meta;
		setSaving(true);
		try {
			const saved = await learningApi.saveState(slimLearningStateForPersist(next));
			// Ignore stale responses when a newer local edit already queued another save.
			if (gen !== saveGenRef.current) return;
			setState(current => {
				const merged = { ...current, ...saved };
				stateRef.current = merged;
				return merged;
			});
		} catch (error) {
			if (rollbackTo && gen === saveGenRef.current) {
				stateRef.current = rollbackTo;
				setState(rollbackTo);
			}
			toast.error(error?.response?.data?.message || t.errorSave);
		} finally {
			setSaving(false);
		}
	}, [t.errorSave]);

	const queueSave = useCallback((next, options = {}) => {
		if (pendingRollbackRef.current == null) {
			pendingRollbackRef.current = options.rollbackTo ?? stateRef.current;
		}
		stateRef.current = next;
		setState(next);
		const gen = ++saveGenRef.current;
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => {
			const rollbackTo = pendingRollbackRef.current;
			pendingRollbackRef.current = null;
			void persist(next, { rollbackTo, gen });
		}, 400);
	}, [persist]);

	const runTranslateBatches = useCallback(async jobs => {
		const results = [];
		for (let i = 0; i < jobs.length; i += 40) {
			const chunk = jobs.slice(i, i + 40);
			const response = await learningApi.translate({
				items: chunk,
				targetLang: 'ar',
			});
			results.push(...(response?.items || []));
		}
		return results;
	}, []);

	const ensureArabicContent = useCallback(
		async (targetPathId, options = {}) => {
			if (!isArabicLocale(locale) || !targetPathId) return;
			const topicIdOpt = options.topicId || null;
			const pathShellOnly = Boolean(options.pathShellOnly);
			const lockKey = `${targetPathId}:${topicIdOpt || 'shell'}:${pathShellOnly ? 'shell' : 'full'}`;
			if (translateLock.current.has(lockKey)) return;
			translateLock.current.add(lockKey);
			try {
				const latest =
					(stateRef.current.paths || []).find(item => item.id === targetPathId) || null;
				if (!latest) return;

				const needsShell = pathNeedsArabic(latest);
				const topic =
					topicIdOpt && !pathShellOnly
						? findTopic([latest], targetPathId, topicIdOpt).topic
						: null;
				const needsTopic = topic ? topicNeedsArabic(topic) : false;
				if (pathShellOnly && !needsShell) return;
				if (!pathShellOnly && topicIdOpt && !needsTopic && !needsShell) return;
				if (!pathShellOnly && !topicIdOpt && !needsShell) return;

				const jobs = collectTranslateJobs(latest, {
					topicId: pathShellOnly ? null : topicIdOpt,
					pathShellOnly: pathShellOnly || !topicIdOpt,
				});
				if (!jobs.length) return;

				const results = await runTranslateBatches(jobs);
				const current = stateRef.current;
				const currentPath = (current.paths || []).find(item => item.id === targetPathId);
				if (!currentPath) return;
				const mode = pathShellOnly || !topicIdOpt ? 'shell' : 'full';
				const translated = applyTranslateResults(currentPath, results, {
					mode,
					topicId: topicIdOpt,
				});
				const next = {
					...current,
					paths: current.paths.map(item => (item.id === targetPathId ? translated : item)),
				};
				queueSave(next);
			} catch (error) {
				console.warn('Learning free translate failed', error);
			} finally {
				translateLock.current.delete(lockKey);
			}
		},
		[locale, queueSave, runTranslateBatches],
	);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const data = await learningApi.getState();
				if (cancelled) return;
				const today = todayKey();
				const base = emptyLearningState();
				const merged = {
					...base,
					...data,
					prefs: { ...base.prefs, ...(data?.prefs || {}) },
					promptTemplates:
						Array.isArray(data?.promptTemplates) && data.promptTemplates.length
							? data.promptTemplates
							: base.promptTemplates,
				};
				const rawPaths = merged.paths || [];
				const syncedPaths = rawPaths.map(path => ensurePathDailyItems(path, today));
				merged.paths = syncedPaths;
				setState(merged);
				setBoot('ready');
				const dailyChanged = syncedPaths.some(
					(path, index) =>
						JSON.stringify(path.dailyItems || []) !== JSON.stringify(rawPaths[index]?.dailyItems || []),
				);
				if (dailyChanged) {
					void learningApi.saveState(slimLearningStateForPersist(merged)).catch(() => {});
				}
			} catch (error) {
				if (cancelled) return;
				toast.error(error?.response?.data?.message || t.errorLoad);
				setBoot('ready');
			}
		})();
		return () => {
			cancelled = true;
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, [t.errorLoad]);

	useEffect(() => {
		if (boot !== 'ready') return;
		if (skipFirstSave.current) {
			skipFirstSave.current = false;
		}
	}, [boot]);

	useEffect(() => {
		if (boot !== 'ready' || !isArabicLocale(locale)) return undefined;
		if (view === 'workspace' && pathId) {
			void ensureArabicContent(pathId, {
				topicId: topicId || null,
				pathShellOnly: !topicId,
			});
			return undefined;
		}
		if (view === 'dashboard') {
			const paths = (stateRef.current.paths || []).slice(0, 12);
			let cancelled = false;
			(async () => {
				for (const path of paths) {
					if (cancelled) break;
					await ensureArabicContent(path.id, { pathShellOnly: true });
				}
			})();
			return () => {
				cancelled = true;
			};
		}
		return undefined;
	}, [boot, locale, view, pathId, topicId, ensureArabicContent]);

	const syncLearningUrl = useCallback(
		(nextPathId, nextTopicId) => {
			const params = new URLSearchParams();
			if (nextPathId) params.set('path', nextPathId);
			if (nextTopicId) params.set('topic', nextTopicId);
			const query = params.toString();
			router.replace(query ? `/dashboard/learning?${query}` : '/dashboard/learning', { scroll: false });
		},
		[router],
	);

	useEffect(() => {
		if (boot !== 'ready' || urlSyncedRef.current) return;
		urlSyncedRef.current = true;
		const urlPathId = searchParams.get('path');
		const urlTopicId = searchParams.get('topic');
		if (!urlPathId) return;
		const path = (state.paths || []).find(item => item.id === urlPathId);
		if (!path) return;
		setPathId(urlPathId);
		if (urlTopicId) {
			const found = findTopic(state.paths, urlPathId, urlTopicId);
			if (found.topic) {
				setTopicId(urlTopicId);
				setView('workspace');
				return;
			}
		}
		setTopicId(null);
		setWorkspaceTab('today');
		setView('workspace');
	}, [boot, searchParams, state.paths]);

	const selectedPath = useMemo(
		() => (state.paths || []).find(path => path.id === pathId) || null,
		[state.paths, pathId],
	);
	const selectedBundle = useMemo(
		() => findTopic(state.paths, pathId, topicId),
		[state.paths, pathId, topicId],
	);
	const selectedTopic = selectedBundle.topic;

	const filteredPaths = useMemo(() => {
		const list = [...(state.paths || [])];
		list.sort(
			(a, b) =>
				new Date(b.lastActivityAt || b.updatedAt || 0) -
				new Date(a.lastActivityAt || a.updatedAt || 0),
		);
		return list;
	}, [state.paths]);

	const openPath = (path, tab) => {
		const nextTab = tab || (isStudySystem ? 'today' : 'roadmap');
		setPathId(path.id);
		setWorkspaceTab(nextTab);
		setView('workspace');
		setRoadmapDraft([]);

		const resumeTopicId =
			nextTab === 'roadmap'
				? null
				: (state.continueLearning?.pathId === path.id && state.continueLearning?.topicId) ||
					path.lastOpenedTopicId ||
					null;
		const resumed = resumeTopicId ? findTopic([path], path.id, resumeTopicId).topic : null;

		if (resumed) {
			setTopicId(resumed.id);
			syncLearningUrl(path.id, resumed.id);
			void ensureArabicContent(path.id, { topicId: resumed.id });
		} else {
			setTopicId(null);
			syncLearningUrl(path.id, null);
			void ensureArabicContent(path.id, { pathShellOnly: true });
		}
	};

	const openTopic = (path, topic) => {
		setPathId(path.id);
		setTopicId(topic.id);
		setView('workspace');
		syncLearningUrl(path.id, topic.id);
		const paths = (state.paths || []).map(item =>
			item.id === path.id
				? {
						...item,
						lastOpenedTopicId: topic.id,
						updatedAt: new Date().toISOString(),
						lastActivityAt: new Date().toISOString(),
					}
				: item,
		);
		const next = pushActivity(
			{
				...state,
				paths,
				continueLearning: { pathId: path.id, topicId: topic.id },
			},
			{ type: 'open_topic', label: topic.title, pathId: path.id, topicId: topic.id },
		);
		queueSave(next);
		void ensureArabicContent(path.id, { topicId: topic.id });
	};

	const backToDashboard = () => {
		setView('dashboard');
		setPathId(null);
		setTopicId(null);
		syncLearningUrl(null, null);
	};

	const backToPath = () => {
		setTopicId(null);
		syncLearningUrl(pathId, null);
	};

	const patchPath = updater => {
		if (!pathId) return;
		patchPathById(pathId, updater);
	};

	const patchPathById = (targetPathId, updater) => {
		const prevPath = state.paths.find(path => path.id === targetPathId);
		const paths = state.paths.map(path =>
			path.id === targetPathId
				? {
						...updater(path),
						updatedAt: new Date().toISOString(),
						lastActivityAt: new Date().toISOString(),
					}
				: path,
		);
		let nextPaths = paths;
		const nextPath = paths.find(path => path.id === targetPathId);
		const shellStale =
			prevPath && nextPath && pathShellArabicIsStale(prevPath, nextPath);
		if (shellStale) {
			nextPaths = paths.map(path =>
				path.id === targetPathId ? stripPathShellArabic(path) : path,
			);
		}
		queueSave({ ...state, paths: nextPaths });
		if (isArabicLocale(locale) && shellStale) {
			window.setTimeout(() => {
				void ensureArabicContent(targetPathId, {
					topicId: topicId && targetPathId === pathId ? topicId : null,
					pathShellOnly: !(topicId && targetPathId === pathId),
				});
			}, 50);
		}
	};

	const learningToday = useMemo(() => todayKey(), [boot]);

	const toggleDailyItem = (targetPathId, itemId) => {
		const previous = stateRef.current;
		const path = (previous.paths || []).find(item => item.id === targetPathId);
		if (!path) return;
		const before = (path.dailyItems || []).find(item => item.id === itemId);
		if (!before) return;
		const wasDone = Boolean(before.completedAt);

		let paths = previous.paths.map(item =>
			item.id === targetPathId
				? {
						...item,
						dailyItems: toggleDailyItemComplete(item.dailyItems, itemId),
						updatedAt: new Date().toISOString(),
						lastActivityAt: new Date().toISOString(),
					}
				: item,
		);

		const after = paths
			.find(item => item.id === targetPathId)
			?.dailyItems?.find(item => item.id === itemId);

		if (after?.topicId && !wasDone && after.completedAt) {
			paths = updateTopicInPaths(paths, targetPathId, after.topicId, topic => ({
				...topic,
				status:
					after.kind === 'review' && topic.status === 'needs_review'
						? 'learning'
						: topic.status === 'not_started'
							? 'learning'
							: topic.status,
				progress: Math.max(Number(topic.progress) || 0, after.kind === 'new' ? 15 : Number(topic.progress) || 0),
				lastReviewedAt: new Date().toISOString(),
				nextReviewAt:
					after.kind === 'review'
						? new Date(Date.now() + 3 * 86400000).toISOString()
						: topic.nextReviewAt,
			}));
		}

		queueSave({ ...previous, paths }, { rollbackTo: previous });
	};

	const openDailyItem = (path, item) => {
		if (item?.topicId) {
			const found = findTopic(state.paths, path.id, item.topicId);
			if (found.topic) {
				openTopic(path, found.topic);
				return;
			}
		}
		openPath(path, 'today');
	};

	const addDailyItem = (targetPathId, title, kind) => {
		patchPathById(targetPathId, path => addManualDailyItem(path, title, kind, learningToday));
	};

	const patchTopic = updater => {
		if (!pathId || !topicId) return;
		const prevTopic = findTopic(state.paths, pathId, topicId).topic;
		const paths = updateTopicInPaths(state.paths, pathId, topicId, topic => {
			const nextTopic = updater(topic);
			const stale = prevTopic && topicArabicIsStale(prevTopic, nextTopic);
			const cleaned = stale ? stripTopicArabic(nextTopic) : nextTopic;
			return { ...cleaned, updatedAt: new Date().toISOString() };
		});
		queueSave({ ...state, paths, continueLearning: { pathId, topicId } });
		if (
			isArabicLocale(locale) &&
			prevTopic &&
			topicArabicIsStale(
				prevTopic,
				findTopic(paths, pathId, topicId).topic,
			)
		) {
			window.setTimeout(() => {
				void ensureArabicContent(pathId, { topicId });
			}, 50);
		}
	};

	const runAi = async (action, prompt, extra = {}) => {
		setAiBusy(action);
		try {
			const result = await learningApi.ai({
				action,
				prompt,
				locale,
				pathId,
				topicId,
				context: {
					pathTitle: selectedPath?.title,
					topicTitle: selectedTopic?.title,
					contentExcerpt: selectedTopic?.contentMarkdown || selectedTopic?.description || '',
					goal: selectedPath?.goal,
					...extra.context,
				},
			});
			return result;
		} catch (error) {
			toast.error(error?.response?.data?.message || t.errorAi);
			return null;
		} finally {
			setAiBusy('');
		}
	};

	const handleGenerateRoadmapForPath = async () => {
		if (!selectedPath) return;
		const goal = selectedPath.goal?.trim() || selectedPath.title?.trim();
		if (!goal) {
			toast.error(t.goalPlaceholder);
			return;
		}
		const result = await runAi('roadmap', goal);
		const parsed = result?.parsed;
		if (!parsed?.sections?.length) {
			toast.error(t.errorAi);
			return;
		}
		patchPath(path => ({
			...path,
			title: path.title || parsed.title || goal,
			description: path.description || parsed.description || '',
			category: path.category || parsed.category || 'General',
			difficulty: parsed.difficulty || path.difficulty,
			estimatedHours: Number(parsed.estimatedHours) || path.estimatedHours,
			tags: path.tags?.length ? path.tags : parsed.tags || [],
			goal: path.goal || goal,
		}));
		setRoadmapDraft(
			(parsed.sections || []).map((section, index) =>
				createSection({
					title: section.title || `${t.section} ${index + 1}`,
					order: index,
					topics: (section.topics || []).map(topic =>
						createTopic({
							title: topic.title,
							description: topic.description || '',
							difficulty: topic.difficulty || 'beginner',
							estimatedMinutes: Number(topic.estimatedMinutes) || 45,
						}),
					),
				}),
			),
		);
	};

	const applyRoadmapDraft = () => {
		if (!roadmapDraft.length) return;
		patchPath(path => ({ ...path, sections: roadmapDraft }));
		setRoadmapDraft([]);
		toast.success(t.savedToast);
	};

	const handleImportTopicUrl = async (url, topicTitle) => {
		if (!pathId || !topicId) return;
		setImportBusy('topic');
		try {
			const result = await learningApi.importUrl({
				url,
				mode: 'topic',
				topicTitle,
				locale,
			});
			const parsed = result?.parsed;
			if (!parsed) {
				toast.error(t.errorAi);
				return;
			}
			patchTopic(topic => {
				const importedCards = (parsed.cards || []).map((card, index) =>
					createTopicCard({
						type: card.type === 'rich' ? 'rich' : 'ticket',
						title: card.title || '',
						body: card.body || '',
						order: (topic.cards || []).length + index,
					}),
				);
				const resources = (parsed.suggestedResources || []).map(res => ({
					id: uid('res'),
					title: res.title || res.url,
					url: res.url,
					type: res.type || detectResourceType(res.url),
					status: 'saved',
					watched: false,
					createdAt: new Date().toISOString(),
				}));
				const videoResource = resources.find(
					item => item.type === 'youtube' || youtubeIdFromUrl(item.url),
				);
				return {
					...topic,
					title: parsed.title || topic.title,
					description: parsed.description || topic.description,
					contentMarkdown: parsed.contentMarkdown || topic.contentMarkdown,
					summary: parsed.summary || topic.summary,
					primaryVideoUrl: videoResource?.url || topic.primaryVideoUrl,
					cards: [...(topic.cards || []), ...importedCards],
					resources: [...resources, ...(topic.resources || [])],
					status: topic.status === 'not_started' ? 'learning' : topic.status,
					progress: Math.max(Number(topic.progress) || 0, 20),
				};
			});
			toast.success(t.importSuccess);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.errorAi);
		} finally {
			setImportBusy('');
		}
	};

	const handleImportRoadmapUrl = async url => {
		if (!selectedPath) return;
		setImportBusy('roadmap');
		try {
			const result = await learningApi.importUrl({
				url,
				mode: 'roadmap',
				goal: selectedPath.goal || selectedPath.title,
				locale,
			});
			const parsed = result?.parsed;
			if (!parsed?.sections?.length) {
				toast.error(result?.importHint || t.errorAi);
				return;
			}
			if (result?.page?.originalUrl && result.page.originalUrl !== result.page.url) {
				toast.success(t.roadmapUrlNormalized);
			} else if (result?.importHint) {
				toast.success(result.importHint);
			} else {
				toast.success(t.importSuccess);
			}
			const nextSections = (parsed.sections || []).map((section, index) =>
				createSection({
					title: section.title || `${t.section} ${index + 1}`,
					order: index,
					sourceNodeId: section.sourceNodeId || '',
					estimatedMinutes: Number(section.estimatedMinutes) || 0,
					estimatedHours: Number(section.estimatedHours) || 0,
					groupLabels: section.groupLabels || [],
					topics: (section.topics || []).map(topic =>
						createTopic({
							title: topic.title,
							description: topic.description || '',
							contentMarkdown: topic.contentMarkdown || topic.description || '',
							primaryVideoUrl:
								topic.primaryVideoUrl ||
								(topic.videoSuggestions || []).find(item => item?.url)?.url ||
								'',
							difficulty: topic.difficulty || 'beginner',
							estimatedMinutes: Number(topic.estimatedMinutes) || 45,
							sourceNodeId: topic.sourceNodeId || '',
							nodeType: topic.nodeType || 'topic',
							keywords: topic.keywords || topic.tags || [],
							tags: topic.tags || topic.keywords || [],
							takeaways: topic.takeaways || [],
							examples: topic.examples || [],
							resources: topic.resources || [],
							videoSuggestions: topic.videoSuggestions || [],
							lessonPacks: topic.lessonPacks || [],
							studySuggestions: topic.studySuggestions || [],
							references: topic.references || [],
							layoutBlocks: (() => {
								const blocks = [];
								let order = 0;
								const video =
									topic.primaryVideoUrl ||
									(topic.videoSuggestions || []).find(item => item?.url)?.url ||
									'';
								if (video) blocks.push(createLayoutBlock('video', order++));
								if ((topic.resources || []).length) blocks.push(createLayoutBlock('tickets', order++));
								if (topic.contentMarkdown || topic.description) {
									blocks.push(createLayoutBlock('content', order++));
								}
								if ((topic.takeaways || []).length) blocks.push(createLayoutBlock('summary', order++));
								return blocks;
							})(),
							summary: topic.takeaways?.length
								? { tldr: topic.takeaways.slice(0, 3).join(' · ') }
								: null,
						}),
					),
				}),
			);
			patchPath(path => ({
				...path,
				title: normalizeLearningText(path.title) || normalizeLearningText(parsed.title) || path.title,
				description:
					normalizeLearningText(path.description) ||
					normalizeLearningText(parsed.description) ||
					path.description,
				category: path.category || parsed.category,
				difficulty: parsed.difficulty || path.difficulty,
				estimatedHours: Number(parsed.estimatedHours) || path.estimatedHours,
				tags: path.tags?.length ? path.tags : parsed.tags || [],
				roadmapGraph: sanitizeRoadmapGraph(result?.graph || parsed.graph || path.roadmapGraph || null),
				roadmapSourceUrl: result?.page?.url || url,
				sections: nextSections,
			}));
			setRoadmapDraft(nextSections);
			setWorkspaceTab('roadmap');
		} catch (error) {
			toast.error(error?.response?.data?.message || t.errorAi);
		} finally {
			setImportBusy('');
		}
	};

	const handleScrapeRoadmapResource = async (topic, resource) => {
		if (!selectedPath?.id || !topic?.id || !resource?.url) return;
		setImportBusy(resource.url);
		try {
			const result = await learningApi.importUrl({
				url: resource.url,
				mode: 'topic',
				topicTitle: resource.title || topic.title,
				locale,
			});
			const parsed = result?.parsed || {};
			const summaryText =
				parsed?.summary?.tldr ||
				parsed?.description ||
				String(parsed?.contentMarkdown || '').slice(0, 520);
			const takeaways = [
				...(parsed?.summary?.takeaways || []),
				...(parsed?.summary?.keyConcepts || []),
			]
				.map(item => String(item || '').trim())
				.filter(Boolean)
				.slice(0, 8);

			const noteBlock = [
				`### ${resource.title || parsed.title || 'Resource'}`,
				resource.url ? `- Source: ${resource.url}` : '',
				summaryText || '',
				takeaways.length ? takeaways.map(item => `- ${item}`).join('\n') : '',
			]
				.filter(Boolean)
				.join('\n');

			const paths = updateTopicInPaths(state.paths, selectedPath.id, topic.id, current => {
				const existingCards = current.cards || [];
				const researchCard = {
					id: uid('card'),
					type: 'rich',
					title: locale?.startsWith?.('ar')
						? `بحث: ${resource.title || parsed.title || 'مقالة'}`
						: `Research: ${resource.title || parsed.title || 'Article'}`,
					body: noteBlock,
					order: 0,
					source: 'roadmap-scrape',
					sourceUrl: resource.url || '',
					createdAt: new Date().toISOString(),
				};
				const contentMarkdown = current.contentMarkdown
					? `${current.contentMarkdown}\n\n---\n\n${noteBlock}`
					: parsed.contentMarkdown || noteBlock;
				const nextTopic = {
					...current,
					contentMarkdown,
					description: current.description || parsed.description || current.description,
					summary: current.summary || parsed.summary || current.summary,
					takeaways: [...new Set([...(current.takeaways || []), ...takeaways])].slice(0, 16),
					references: [
						{
							id: uid('ref'),
							title: resource.title || parsed.title || current.title,
							url: resource.url,
							type: resource.type || 'article',
							summary: summaryText,
							scrapedAt: new Date().toISOString(),
						},
						...(current.references || []).filter(item => item.url !== resource.url),
					],
					cards: [researchCard, ...existingCards].slice(0, 40),
					resources: (() => {
						const list = current.resources || [];
						if (list.some(item => item.url === resource.url)) return list;
						return [{ ...resource, id: resource.id || resource.url }, ...list].slice(0, 40);
					})(),
					updatedAt: new Date().toISOString(),
				};
				return {
					...nextTopic,
					layoutBlocks: ensureLayoutBlocksForScrape(nextTopic),
				};
			});
			queueSave({ ...state, paths });
			toast.success(
				(t.roadmapResourceSavedDetailed || t.roadmapResourceSaved)
					.replace('{topic}', topic.title || '')
					.replace('{section}', t.roadmapReferences),
			);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.errorAi);
		} finally {
			setImportBusy('');
		}
	};

	const handleScrapeRoadmapResources = async (topic, resources = []) => {
		const list = (resources || []).filter(item => item?.url);
		if (!selectedPath?.id || !topic?.id || !list.length) return;
		setImportBusy('bulk');
		const collected = [];
		try {
			for (const resource of list) {
				setImportBusy(resource.url);
				try {
					const result = await learningApi.importUrl({
						url: resource.url,
						mode: 'topic',
						topicTitle: resource.title || topic.title,
						locale,
					});
					const parsed = result?.parsed || {};
					const summaryText =
						parsed?.summary?.tldr ||
						parsed?.description ||
						String(parsed?.contentMarkdown || '').slice(0, 520);
					const takeaways = [
						...(parsed?.summary?.takeaways || []),
						...(parsed?.summary?.keyConcepts || []),
					]
						.map(item => String(item || '').trim())
						.filter(Boolean)
						.slice(0, 6);
					collected.push({
						resource,
						parsed,
						summaryText,
						takeaways,
					});
				} catch {
					collected.push({
						resource,
						parsed: null,
						summaryText: '',
						takeaways: [],
						failed: true,
					});
				}
			}

			const okItems = collected.filter(item => !item.failed);
			const researchBody = [
				locale?.startsWith?.('ar') ? '## ملاحظات بحث مجمّعة' : '## Compiled research notes',
				...okItems.map(item =>
					[
						`### ${item.resource.title || item.parsed?.title || 'Resource'}`,
						item.resource.url ? `- Source: ${item.resource.url}` : '',
						item.summaryText || '',
						item.takeaways.length ? item.takeaways.map(row => `- ${row}`).join('\n') : '',
					]
						.filter(Boolean)
						.join('\n'),
				),
			].join('\n\n');

			const paths = updateTopicInPaths(state.paths, selectedPath.id, topic.id, current => {
				const nextReferences = [
					...okItems.map(item => ({
						id: uid('ref'),
						title: item.resource.title || item.parsed?.title || current.title,
						url: item.resource.url,
						type: item.resource.type || 'article',
						summary: item.summaryText,
						scrapedAt: new Date().toISOString(),
					})),
					...(current.references || []).filter(
						item => !okItems.some(row => row.resource.url === item.url),
					),
				].slice(0, 40);
				const mergedTakeaways = [
					...new Set([
						...(current.takeaways || []),
						...okItems.flatMap(item => item.takeaways),
					]),
				].slice(0, 20);
				const researchCard = {
					id: uid('card'),
					type: 'rich',
					title: locale?.startsWith?.('ar') ? 'بحث مجمّع من الموارد' : 'Compiled resource research',
					body: researchBody,
					order: 0,
					source: 'roadmap-scrape',
					createdAt: new Date().toISOString(),
				};
				const nextTopic = {
					...current,
					contentMarkdown: current.contentMarkdown
						? `${current.contentMarkdown}\n\n---\n\n${researchBody}`
						: researchBody,
					takeaways: mergedTakeaways,
					references: nextReferences,
					cards: [researchCard, ...(current.cards || [])].slice(0, 40),
					updatedAt: new Date().toISOString(),
				};
				return {
					...nextTopic,
					layoutBlocks: ensureLayoutBlocksForScrape(nextTopic),
				};
			});
			queueSave({ ...state, paths });
			toast.success(
				(t.roadmapBulkScrapeSaved || t.roadmapResourceSaved)
					.replace('{count}', String(okItems.length))
					.replace('{topic}', topic.title || ''),
			);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.errorAi);
		} finally {
			setImportBusy('');
		}
	};

	const handleQuickCreate = title => {
		const path = createPath({
			title: title.trim(),
			sections: [
				createSection({
					title: t.section + ' 1',
					order: 0,
					topics: [],
				}),
			],
		});
		const next = pushActivity(
			{ ...state, paths: [path, ...(state.paths || [])] },
			{ type: 'create_path', label: path.title, pathId: path.id },
		);
		queueSave(next);
		toast.success(t.createdToast);
		openPath(path);
	};

	const mapParsedSections = (sections = []) =>
		(sections || []).map((section, index) =>
			createSection({
				title: section.title || `${t.section} ${index + 1}`,
				order: index,
				sourceNodeId: section.sourceNodeId || '',
				estimatedMinutes: Number(section.estimatedMinutes) || 0,
				estimatedHours: Number(section.estimatedHours) || 0,
				groupLabels: section.groupLabels || [],
				topics: (section.topics || []).map(topic => {
					const contentMarkdown = topic.contentMarkdown || topic.description || '';
					const primaryVideoUrl =
						topic.primaryVideoUrl ||
						(topic.videoSuggestions || []).find(item => item?.url)?.url ||
						(topic.resources || []).find(item =>
							['video', 'youtube', 'course'].includes(String(item?.type || '').toLowerCase()),
						)?.url ||
						'';
					const layoutBlocks = [];
					let order = 0;
					if (primaryVideoUrl) layoutBlocks.push(createLayoutBlock('video', order++));
					if ((topic.resources || []).length) layoutBlocks.push(createLayoutBlock('tickets', order++));
					if (contentMarkdown) layoutBlocks.push(createLayoutBlock('content', order++));
					if ((topic.takeaways || []).length) layoutBlocks.push(createLayoutBlock('summary', order++));

					return createTopic({
						title: topic.title,
						description: topic.description || '',
						contentMarkdown,
						primaryVideoUrl,
						difficulty: topic.difficulty || 'beginner',
						estimatedMinutes: Number(topic.estimatedMinutes) || 45,
						sourceNodeId: topic.sourceNodeId || '',
						nodeType: topic.nodeType || 'topic',
						keywords: topic.keywords || topic.tags || [],
						tags: topic.tags || topic.keywords || [],
						takeaways: topic.takeaways || [],
						examples: topic.examples || [],
						resources: topic.resources || [],
						videoSuggestions: topic.videoSuggestions || [],
						lessonPacks: topic.lessonPacks || [],
						studySuggestions: topic.studySuggestions || [],
						references: topic.references || [],
						layoutBlocks,
						summary: topic.takeaways?.length
							? { tldr: topic.takeaways.slice(0, 3).join(' · ') }
							: null,
					});
				}),
			}),
		);

	const handleSearchRoadmaps = async () => {
		const query = roadmapSearchQuery.trim();
		if (!query) return;
		setImportBusy('search');
		try {
			const result = await learningApi.searchRoadmaps({ query, locale });
			setRoadmapSearchResult(result);
			if (result?.enhancedQuery && result.enhancedQuery !== query) {
				setRoadmapSearchQuery(result.enhancedQuery);
			}
			if (result?.hint) toast.success(result.hint);
		} catch (error) {
			toast.error(error?.response?.data?.message || t.errorAi);
		} finally {
			setImportBusy('');
		}
	};

	useEffect(() => {
		if (dashboardMode !== 'search' || roadmapCatalog.length) return undefined;
		let cancelled = false;
		setRoadmapCatalogBusy(true);
		(async () => {
			try {
				const data = await learningApi.officialRoadmaps();
				if (cancelled) return;
				setRoadmapCatalog(Array.isArray(data?.items) ? data.items : []);
			} catch {
				if (!cancelled) setRoadmapCatalog([]);
			} finally {
				if (!cancelled) setRoadmapCatalogBusy(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [dashboardMode, roadmapCatalog.length]);

	const handleUseOfficialSearchResult = async match => {
		if (!match?.url) return;
		setImportBusy(match.url || match.slug);
		try {
			const path = createPath({
				title: match.title || match.slug || t.searchRoadmaps,
				description: match.description || '',
				category: 'Roadmap',
				tags: [match.slug].filter(Boolean),
				roadmapSourceUrl: match.url,
			});
			const seeded = pushActivity(
				{ ...state, paths: [path, ...(state.paths || [])] },
				{ type: 'create_path', label: path.title, pathId: path.id },
			);
			queueSave(seeded);
			const result = await learningApi.importUrl({
				url: match.url,
				mode: 'roadmap',
				goal: match.title || match.slug,
				locale,
			});
			const parsed = result?.parsed;
			if (!parsed?.sections?.length) {
				toast.error(result?.importHint || t.errorAi);
				openPath(path, 'roadmap');
				return;
			}
			const nextSections = mapParsedSections(parsed.sections);
			const enriched = {
				...path,
				title: normalizeLearningText(path.title) || normalizeLearningText(parsed.title) || path.title,
				description:
					normalizeLearningText(path.description) ||
					normalizeLearningText(parsed.description) ||
					path.description,
				category: path.category || parsed.category,
				difficulty: parsed.difficulty || path.difficulty,
				estimatedHours: Number(parsed.estimatedHours) || path.estimatedHours,
				tags: path.tags?.length ? path.tags : parsed.tags || [],
				roadmapGraph: sanitizeRoadmapGraph(result?.graph || parsed.graph || null),
				roadmapSourceUrl: result?.page?.url || match.url,
				sections: nextSections,
				updatedAt: new Date().toISOString(),
				lastActivityAt: new Date().toISOString(),
			};
			queueSave({
				...seeded,
				paths: seeded.paths.map(item => (item.id === path.id ? enriched : item)),
			});
			toast.success(t.importSuccess);
			setDashboardMode('overview');
			openPath(enriched, 'roadmap');
		} catch (error) {
			toast.error(error?.response?.data?.message || t.errorAi);
		} finally {
			setImportBusy('');
		}
	};

	const handleUseGeneratedSearchResult = parsed => {
		if (!parsed?.sections?.length) return;
		setImportBusy('generated');
		const path = createPath({
			title:
				normalizeLearningText(parsed.title) ||
				roadmapSearchQuery.trim() ||
				t.searchRoadmaps,
			description: normalizeLearningText(parsed.description),
			category: parsed.category || 'Roadmap',
			difficulty: parsed.difficulty || 'intermediate',
			estimatedHours: Number(parsed.estimatedHours) || 20,
			tags: parsed.tags || [],
			sections: mapParsedSections(parsed.sections),
			roadmapGraph: sanitizeRoadmapGraph(parsed.graph || null),
		});
		const next = pushActivity(
			{ ...state, paths: [path, ...(state.paths || [])] },
			{ type: 'create_path', label: path.title, pathId: path.id },
		);
		queueSave(next);
		toast.success(t.createdToast);
		setImportBusy('');
		setDashboardMode('overview');
		openPath(path, 'roadmap');
	};

	const handleUseWebSearchHit = async hit => {
		if (!hit?.url) return;
		await handleUseOfficialSearchResult({
			url: hit.url,
			title: hit.title,
			description: '',
			slug: '',
		});
	};

	const handleDeletePath = path => {
		if (!window.confirm(t.confirmDeletePath)) return;
		const next = {
			...state,
			paths: (state.paths || []).filter(item => item.id !== path.id),
			continueLearning:
				state.continueLearning?.pathId === path.id ? null : state.continueLearning,
		};
		queueSave(next);
		if (pathId === path.id) {
			backToDashboard();
		}
	};

	const handleCompleteTopic = () => {
		if (!selectedTopic) return;
		const mastery = Math.max(Number(selectedTopic.mastery) || 0, 70 + confidence * 6);
		patchTopic(topic => ({
			...topic,
			status: mastery >= 95 ? 'mastered' : 'completed',
			progress: 100,
			mastery: Math.min(100, mastery),
			confidence,
			completedAt: new Date().toISOString(),
			nextReviewAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
		}));
		toast.success(t.completed);
	};

	const handleAddResource = () => {
		const url = resourceDraft.url.trim();
		if (!url) return;
		const type = detectResourceType(url);
		const resource = {
			id: uid('res'),
			title: resourceDraft.title.trim() || url,
			url,
			type,
			status: 'saved',
			notes: '',
			priority: 'medium',
			watched: false,
			createdAt: new Date().toISOString(),
		};
		patchTopic(topic => ({
			...topic,
			resources: [resource, ...(topic.resources || [])],
			status: topic.status === 'not_started' ? 'learning' : topic.status,
			progress: Math.max(Number(topic.progress) || 0, 10),
		}));
		setResourceDraft({ url: '', title: '' });
	};

	const handleAddNote = () => {
		const text = noteDraft.trim();
		if (!text) return;
		patchTopic(topic => ({
			...topic,
			notes: [
				{ id: uid('note'), text, createdAt: new Date().toISOString(), tags: [] },
				...(topic.notes || []),
			],
		}));
		setNoteDraft('');
	};

	const handleGenerateSummary = async () => {
		const source =
			selectedTopic?.contentMarkdown ||
			selectedTopic?.description ||
			selectedTopic?.title ||
			'';
		const result = await runAi('summary', source);
		if (!result?.parsed) return;
		patchTopic(topic => ({
			...topic,
			summary: { ...result.parsed, aiGenerated: true },
			takeaways: result.parsed.takeaways || topic.takeaways || [],
		}));
		setTopicTab('overview');
	};

	const handleGenerateQuestions = async () => {
		const source =
			selectedTopic?.contentMarkdown ||
			selectedTopic?.description ||
			selectedTopic?.title ||
			'';
		const result = await runAi('questions', source);
		const questions = result?.parsed?.questions;
		if (!Array.isArray(questions) || !questions.length) return;
		patchTopic(topic => ({
			...topic,
			questions: questions.map(item => ({
				id: uid('q'),
				...item,
				aiGenerated: true,
			})),
		}));
		setTopicTab('questions');
		setQuizIndex(0);
		setQuizAnswers({});
	};

	const handleGenerateFlashcards = async () => {
		const source =
			selectedTopic?.contentMarkdown ||
			selectedTopic?.description ||
			selectedTopic?.title ||
			'';
		const result = await runAi('flashcards', source);
		const cards = result?.parsed?.cards;
		if (!Array.isArray(cards) || !cards.length) return;
		patchTopic(topic => ({
			...topic,
			flashcards: cards.map(item => ({
				id: uid('card'),
				...item,
				mastery: 0,
				aiGenerated: true,
			})),
		}));
		setTopicTab('flashcards');
		setFlashIndex(0);
		setFlashFlipped(false);
	};

	const handleAskAi = async () => {
		const prompt = askDraft.trim();
		if (!prompt) return;
		const result = await runAi('assist', prompt);
		if (result?.reply) setAskReply(result.reply);
	};

	const handleInboxSave = () => {
		const url = inboxUrl.trim();
		if (!url) return;
		const item = {
			id: uid('inbox'),
			url,
			title: url,
			type: detectResourceType(url),
			createdAt: new Date().toISOString(),
		};
		queueSave({
			...state,
			inbox: [item, ...(state.inbox || [])],
		});
		setInboxUrl('');
		toast.success(t.savedToast);
	};

	if (boot === 'loading') {
		return (
			<div className="grid min-h-[60vh] place-items-center text-slate-500">
				<div className="flex items-center gap-3 text-sm font-semibold">
					<Loader2 className="animate-spin" size={18} />
					{t.loading}
				</div>
			</div>
		);
	}

	return (
		<div className={cx('flex min-h-0 flex-1 flex-col', view === 'dashboard' && 'gap-0')}>
			<div className="px-0 pb-1">
				<LearningSystemSwitcher active={isStudySystem ? 'study' : 'management'} />
			</div>
			{view === 'dashboard' && (
				<div className="learning-landing space-y-6 pb-2">
					<div className="learning-landing__page">
						{/* Hero */}
						<LearningHeaderCard>
							<div className="learning-header-card__top">
								<div className="learning-header-card__title-row">
									<div className="learning-header-card__title-icon">
										<GraduationCap size={22} strokeWidth={1.6} />
									</div>
									<div className="learning-header-card__title-block">
										<h1 className="learning-header-card__title">
											{isStudySystem ? t.studyHeroBefore : t.mgmtHeroBefore}{' '}
											<em>{isStudySystem ? t.studyHeroEm : t.mgmtHeroEm}</em>.
										</h1>
										<p className="learning-header-card__subtitle">
											<span className="is-hl">
												{isStudySystem ? t.studyHeroSub1 : t.mgmtHeroSub1}
											</span>
											<span className="learning-header-card__subtitle-dot" aria-hidden />
											<span>{isStudySystem ? t.studyHeroSub2 : t.mgmtHeroSub2}</span>
											<span className="learning-header-card__subtitle-dot" aria-hidden />
											<span>{isStudySystem ? t.studyHeroSub3 : t.mgmtHeroSub3}</span>
										</p>
									</div>
								</div>
								<div className="learning-header-card__actions">
									{saving ? (
										<span className="learning-header-saving">{t.saving}</span>
									) : null}
									{!isStudySystem ? (
										<NewLearningPathButton
											ref={quickCreateRef}
											t={t}
											variant="header-light"
											onSubmit={handleQuickCreate}
										/>
									) : null}
								</div>
							</div>

							<div className="learning-header-stats">
								<LearningHeaderStat
									label={t.dayStreak}
									value={Number(state.stats?.streakDays) || 0}
									ring={
										<svg className="learning-header-stat__ring learning-header-stat__ring--streak" viewBox="0 0 46 46" aria-hidden>
											<circle cx="23" cy="23" r="21" fill="none" strokeWidth="2" className="learning-header-stat__ring-track" />
											<circle
												cx="23"
												cy="23"
												r="21"
												fill="none"
												strokeWidth="2"
												strokeLinecap="round"
												strokeDasharray="132"
												className="learning-header-stat__ring-fill"
												strokeDashoffset={
													132 -
													Math.min(
														100,
														Number(state.stats?.streakDays) || 0,
													) *
														1.32
												}
											/>
										</svg>
									}
									icon={<Flame size={16} style={{ color: 'var(--learn-h-gold)' }} />}
								/>
								<LearningHeaderStat
									label={t.weekTime}
									value={
										<>
											{Math.floor((Number(state.stats?.minutesThisWeek) || 0) / 60)}
											<span className="learning-header-stat__unit">h</span>{' '}
											{(Number(state.stats?.minutesThisWeek) || 0) % 60}
											<span className="learning-header-stat__unit">m</span>
										</>
									}
									icon={<Clock size={16} style={{ color: 'var(--learn-h-teal)' }} />}
								/>
								<LearningHeaderStat
									label={t.paths}
									value={(state.paths || []).length}
									icon={<BookOpen size={16} style={{ color: 'var(--learn-h-pink)' }} />}
								/>
							</div>

							<div className="learning-header-tabs" role="tablist" aria-label={t.overview}>
								<button
									type="button"
									role="tab"
									aria-selected={dashboardMode === 'overview'}
									className={cx('learning-header-tab', dashboardMode === 'overview' && 'is-active')}
									onClick={() => setDashboardMode('overview')}
								>
									{t.overview}
								</button>
								{!isStudySystem ? (
									<button
										type="button"
										role="tab"
										aria-selected={dashboardMode === 'search'}
										className={cx('learning-header-tab', dashboardMode === 'search' && 'is-active')}
										onClick={() => setDashboardMode('search')}
									>
										{t.searchRoadmaps}
									</button>
								) : null}
								<button type="button" role="tab" disabled className="learning-header-tab">
									{t.tabAchievements}
								</button>
								<button type="button" role="tab" disabled className="learning-header-tab">
									{t.tabInsights}
								</button>
							</div>
						</LearningHeaderCard>

						{!isStudySystem && dashboardMode === 'search' ? (
							<LearningRoadmapSearchPanel
								t={t}
								query={roadmapSearchQuery}
								onQueryChange={setRoadmapSearchQuery}
								onSearch={handleSearchRoadmaps}
								busy={importBusy}
								result={roadmapSearchResult}
								catalog={roadmapCatalog}
								catalogBusy={roadmapCatalogBusy}
								onUseOfficial={handleUseOfficialSearchResult}
								onUseGenerated={handleUseGeneratedSearchResult}
								onUseWebHit={handleUseWebSearchHit}
							/>
						) : (
							<>
								{filteredPaths.length === 0 ? (
									<section className="learning-neu learning-side-panel learning-paths-empty">
										<div className="learning-side-panel__empty">
											<div>
												<GraduationCap
													size={40}
													className="mx-auto mb-4 text-[var(--color-primary-500)]"
												/>
												<h3 className="text-lg font-black text-[var(--learn-ink)]">{t.emptyTitle}</h3>
												<p className="mt-2 max-w-md text-sm">{t.emptyDesc}</p>
												<div className="mt-5 flex justify-center gap-2">
													<button
														type="button"
														className="learning-pill-btn"
														onClick={() => setDashboardMode('search')}
													>
														{t.searchRoadmaps}
													</button>
													<NewLearningPathButton t={t} onSubmit={handleQuickCreate} variant="pill" />
												</div>
											</div>
										</div>
									</section>
								) : (
									<LearningPathsTable
										paths={filteredPaths}
										t={t}
										locale={locale}
										relativeTime={relativeTime}
										onOpen={path => openPath(path)}
										onContinue={path => {
											const synced = ensurePathDailyItems(path, learningToday);
											const groups = classifyPathDailyItems(synced, learningToday);
											const firstPending = groups.pending[0];
											if (firstPending?.topicId) {
												const found = findTopic([path], path.id, firstPending.topicId);
												if (found.topic) {
													openTopic(path, found.topic);
													return;
												}
											}
											const progress = pathProgress(path);
											if (progress.current) openTopic(path, progress.current);
											else openPath(path);
										}}
										onToggleFavorite={path =>
											queueSave({
												...state,
												paths: state.paths.map(item =>
													item.id === path.id
														? { ...item, favorite: !item.favorite }
														: item,
												),
											})
										}
										onDelete={path => handleDeletePath(path)}
									/>
								)}

								<div className="learning-bottom-row">
									<section className="learning-neu learning-panel">
										<div className="learning-panel-head">
											<span className="learning-panel-head__dot learning-panel-head__dot--primary">
												<Target size={16} />
											</span>
											{t.todayPlan}
										</div>
										<div className="learning-panel-body">
											<LearningDailyOverview
												paths={state.paths}
												t={t}
												locale={locale}
												today={learningToday}
												onToggle={toggleDailyItem}
												onOpenItem={openDailyItem}
											/>
										</div>
									</section>

									<section className="learning-neu learning-panel">
										<div className="learning-panel-head">
											<span className="learning-panel-head__dot learning-panel-head__dot--dark">
												<Bookmark size={16} />
											</span>
											{t.inbox}
										</div>
										<div className="learning-inbox-row">
											<input
												className="learning-neu-inset"
												value={inboxUrl}
												onChange={event => setInboxUrl(event.target.value)}
												placeholder={t.resourceUrl}
												onKeyDown={event => {
													if (event.key === 'Enter') handleInboxSave();
												}}
											/>
											<button type="button" className="learning-quick-add" onClick={handleInboxSave}>
												{t.quickAdd}
											</button>
										</div>
										{(state.inbox || []).length > 0 ? (
											<div className="mt-4 space-y-2">
												{(state.inbox || []).slice(0, 5).map(item => (
													<a
														key={item.id}
														href={item.url}
														target="_blank"
														rel="noreferrer"
														className="flex items-center gap-2 truncate rounded-xl bg-[color-mix(in_srgb,var(--color-primary-50)_60%,transparent)] px-3 py-2.5 text-xs font-semibold text-[var(--learn-ink-soft)] transition hover:bg-[color-mix(in_srgb,var(--color-primary-100)_50%,transparent)]"
													>
														{item.type === 'youtube' ? <Youtube size={14} /> : <ExternalLink size={14} />}
														{item.title}
													</a>
												))}
											</div>
										) : (
											<p className="learning-inbox-hint">{t.emptyInbox}</p>
										)}
									</section>
								</div>
							</>
						)}
					</div>
				</div>
			)}

			{view === 'workspace' && selectedPath && (
				<LearningPathWorkspace
					system={system}
					path={selectedPath}
					topic={selectedTopic}
					topicId={topicId}
					t={t}
					locale={locale}
					labelStatus={value => labelStatus(t, value)}
					labelDifficulty={value => labelDifficulty(t, value)}
					today={learningToday}
					workspaceTab={workspaceTab}
					onWorkspaceTabChange={setWorkspaceTab}
					onBack={backToDashboard}
					onTitleChange={value => patchPath(path => ({ ...path, title: value }))}
					onToggleFavorite={() =>
						queueSave({
							...state,
							paths: state.paths.map(item =>
								item.id === selectedPath.id ? { ...item, favorite: !item.favorite } : item,
							),
						})
					}
					onSelectTopic={topic => openTopic(selectedPath, topic)}
					onClearTopic={backToPath}
					onDeletePath={handleDeletePath}
					onTopicModeChange={mode => {
						queueSave({
							...state,
							prefs: { ...(state.prefs || {}), topicMode: mode },
						});
					}}
					preferredTopicMode={
						isStudySystem
							? 'study'
							: state.prefs?.topicMode === 'study'
								? 'edit'
								: state.prefs?.topicMode || 'edit'
					}
					onPatchPath={updater => patchPath(updater)}
					onPatchTopic={patch => patchTopic(topic => ({ ...topic, ...patch }))}
					onToggleDaily={itemId => toggleDailyItem(selectedPath.id, itemId)}
					onOpenDailyItem={item => openDailyItem(selectedPath, item)}
					onAddDaily={(title, kind) => addDailyItem(selectedPath.id, title, kind)}
					onImportTopicUrl={handleImportTopicUrl}
					onImportRoadmapUrl={handleImportRoadmapUrl}
					onScrapeRoadmapResource={handleScrapeRoadmapResource}
					onScrapeRoadmapResources={handleScrapeRoadmapResources}
					importBusy={importBusy}
					roadmapDraft={roadmapDraft}
					setRoadmapDraft={setRoadmapDraft}
					onApplyRoadmap={applyRoadmapDraft}
				/>
			)}


			<LearningWelcome
				open={welcomeOpen}
				t={t}
				onClose={dismissWelcome}
				onStart={() => {
					dismissWelcome();
					window.setTimeout(() => quickCreateRef.current?.open(), 120);
				}}
			/>

			{(aiBusy || importBusy) && (
				<div className="pointer-events-none fixed bottom-5 end-5 z-[80] rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg">
					<span className="inline-flex items-center gap-2">
						<Loader2 size={14} className="animate-spin" />
						{importBusy ? t.aiWorking : t.aiWorking}
					</span>
				</div>
			)}
		</div>
	);
}
