/**
 * Sales presentation copy — only features confirmed in the So7baFit codebase.
 * Audience: gym owners, coaches, online coaching businesses (WhatsApp / Email / LinkedIn campaigns).
 */

export const NAV_LINKS = [
	{ href: '#problems', ar: 'المشكلة', en: 'Problem' },
	{ href: '#features', ar: 'المميزات', en: 'Features' },
	{ href: '#whatsapp', ar: 'واتساب', en: 'WhatsApp' },
	{ href: '#platform', ar: 'المنصة', en: 'Platform' },
	{ href: '#faq', ar: 'أسئلة', en: 'FAQ' },
	{ href: '#demo', ar: 'احجز عرضًا', en: 'Book demo' },
];

export const HERO = {
	brand: 'So7baFit',
	eyebrowAr: 'منصة SaaS للصالات والمدربين',
	eyebrowEn: 'SaaS for gyms & coaches',
	titleAr: 'نظام تشغيل كامل لأعمال التدريب واللياقة',
	titleEn: 'The operating system for fitness coaching businesses',
	subAr:
		'بدل إدارة العملاء على واتساب وإكسل وملفات PDF — منصة واحدة للخطط والتغذية والتقارير والمحادثات والفوترة.',
	subEn:
		'Stop running clients on WhatsApp, Excel, and PDFs. One platform for plans, nutrition, reports, messaging, and billing.',
	ctaPrimaryAr: 'احجز عرضًا تجريبيًا',
	ctaPrimaryEn: 'Book a demo',
	ctaSecondaryAr: 'استكشف المميزات',
	ctaSecondaryEn: 'Explore features',
	pillsAr: ['إدارة العملاء', 'خطط تمارين وتغذية', 'واتساب CRM', 'تطبيق جوال'],
	pillsEn: ['Client CRM', 'Workout & nutrition', 'WhatsApp CRM', 'Mobile app'],
};

export const PROBLEMS = [
	{
		ar: { t: 'فوضى واتساب', d: 'محادثات العملاء والخطط والدفعات تختفي بين الشاتات والملفات.' },
		en: { t: 'WhatsApp chaos', d: 'Client chats, plans, and payments get lost across threads and files.' },
	},
	{
		ar: { t: 'إكسل وPDF', d: 'جداول يدوية لا تتحدث مع التغذية أو التقارير أو حالة الاشتراك.' },
		en: { t: 'Excel & PDFs', d: 'Manual sheets never sync with nutrition, reports, or subscription status.' },
	},
	{
		ar: { t: 'متابعة ضعيفة', d: 'صعب تعرف مين التزم، مين تأخر في التقرير، ومين يحتاج تعديل خطة.' },
		en: { t: 'Weak follow-up', d: 'Hard to see who adhered, who missed reports, and who needs a plan change.' },
	},
	{
		ar: { t: 'صعوبة التوسع', d: 'كل عميل جديد يزيد الضغط على المدرب بدل ما يزيد الإيراد بوضوح.' },
		en: { t: 'Hard to scale', d: 'Every new client adds chaos instead of clean, measurable revenue.' },
	},
];

export const BENEFITS = [
	{
		ar: { t: 'كل شيء في مكان واحد', d: 'عملاء، خطط، تغذية، تقارير، محادثات، فواتير.' },
		en: { t: 'Everything in one place', d: 'Clients, plans, nutrition, reports, chat, billing.' },
	},
	{
		ar: { t: 'واتساب داخل المنصة', d: 'صندوق وارد متعدد الحسابات مع إسناد وملاحظات واقتراحات ذكية.' },
		en: { t: 'WhatsApp inside the product', d: 'Multi-account inbox with assignment, notes, and AI suggestions.' },
	},
	{
		ar: { t: 'تجربة عميل احترافية', d: 'تطبيق ويب وجوال بخطط يومية وتذكيرات وتقارير أسبوعية.' },
		en: { t: 'Pro client experience', d: 'Web + mobile with daily plans, reminders, and weekly check-ins.' },
	},
	{
		ar: { t: 'هوية علامتك', d: 'علامة بيضاء: اسم، ألوان، شعار لكل مؤسسة (Tenant).' },
		en: { t: 'Your brand', d: 'White-label name, colors, and logo per organization (tenant).' },
	},
];

/** Feature groups — confirmed modules only */
export const FEATURE_GROUPS = [
	{
		id: 'coaching',
		ar: { title: 'نظام التدريب', desc: 'من المكتبة إلى الخطة إلى تسجيل الأداء.' },
		en: { title: 'Training OS', desc: 'From library to plan to logged performance.' },
		items: [
			{ ar: 'مكتبة تمارين بصور وفيديو', en: 'Exercise library with media' },
			{ ar: 'بناء خطط أسبوعية وإسنادها', en: 'Build & assign weekly plans' },
			{ ar: 'تسجيل الأوزان والتكرارات وPRs', en: 'Log sets, reps, weights & PRs' },
			{ ar: 'مؤقت راحة وتتبع الجلسة', en: 'Rest timer & session tracking' },
		],
	},
	{
		id: 'nutrition',
		ar: { title: 'نظام التغذية', desc: 'خطط وجبات، وصفات، ومتابعة يومية.' },
		en: { title: 'Nutrition OS', desc: 'Meal plans, recipes, and daily adherence.' },
		items: [
			{ ar: 'خطط وجبات وماكروز ومكملات', en: 'Meals, macros & supplements' },
			{ ar: 'بدائل غذائية لكل وجبة', en: 'Meal alternatives' },
			{ ar: 'مكتبة وصفات مع قيم غذائية', en: 'Recipe library with macros' },
			{ ar: 'تسجيل الالتزام اليومي', en: 'Daily meal logging' },
		],
	},
	{
		id: 'clients',
		ar: { title: 'إدارة العملاء', desc: 'من الاستبيان حتى ملف العميل الشامل.' },
		en: { title: 'Client management', desc: 'From intake form to a full client dossier.' },
		items: [
			{ ar: 'نماذج استبيان عامة بروابط', en: 'Public intake forms & links' },
			{ ar: 'مستخدمون وأدوار وصلاحيات', en: 'Users, roles & permissions' },
			{ ar: 'ملف 360° للقياسات والصور', en: '360° measurements & photos' },
			{ ar: 'تقارير أسبوعية وملاحظات المدرب', en: 'Weekly reports & coach notes' },
		],
	},
	{
		id: 'ops',
		ar: { title: 'التشغيل اليومي', desc: 'تواصل، تذكيرات، إنتاجية، وإشعارات.' },
		en: { title: 'Daily operations', desc: 'Messaging, reminders, workspace, alerts.' },
		items: [
			{ ar: 'محادثات داخلية فورية', en: 'Real-time in-app chat' },
			{ ar: 'تذكيرات ودفع إشعارات', en: 'Reminders & push notifications' },
			{ ar: 'تقويم وعادات والتزام', en: 'Calendar, habits & commitment timer' },
			{ ar: 'حاسبة سعرات وماكروز', en: 'Calorie & macro calculator' },
		],
	},
	{
		id: 'billing',
		ar: { title: 'الاشتراكات والفوترة', desc: 'باقات، اشتراكات، فواتير، ومدفوعات يدوية.' },
		en: { title: 'Subscriptions & billing', desc: 'Packages, subscriptions, invoices, manual payments.' },
		items: [
			{ ar: 'باقات واشتراكات العملاء', en: 'Client packages & subscriptions' },
			{ ar: 'فواتير وسجل مدفوعات', en: 'Invoices & payment history' },
			{ ar: 'ملاحظات وتواصل تجاري', en: 'Client notes & commercial log' },
			{ ar: 'لوحة مؤشرات للإدارة', en: 'Admin KPI dashboard' },
		],
	},
	{
		id: 'platform',
		ar: { title: 'المنصة والهوية', desc: 'متعدد المؤسسات، ثنائي اللغة، وقابل للتثبيت كـ PWA.' },
		en: { title: 'Platform & branding', desc: 'Multi-tenant, bilingual, installable PWA.' },
		items: [
			{ ar: 'أدوار: Admin / Coach / Client', en: 'Roles: Admin / Coach / Client' },
			{ ar: 'علامة بيضاء لكل مؤسسة', en: 'White-label per tenant' },
			{ ar: 'عربي وإنجليزي', en: 'Arabic & English' },
			{ ar: 'تطبيق ويب تقدمي (PWA)', en: 'Progressive Web App (PWA)' },
		],
	},
];

export const WHATSAPP = {
	ar: {
		title: 'واتساب كقناة تشغيل — داخل النظام',
		desc: 'لا تستبدل واتساب فقط — أدِره باحتراف: حسابات متعددة، إسناد للفريق، ملاحظات، قوالب، وتقارير.',
		points: [
			{ t: 'صندوق وارد متعدد الحسابات', d: 'ربط جلسات واتساب وإدارة المحادثات من لوحة واحدة.' },
			{ t: 'إسناد وملاحظات الفريق', d: 'وزّع المحادثات على المدربين واحتفظ بسياق العميل.' },
			{ t: 'Meta Cloud API', d: 'دعم واجهة واتساب الرسمية للقوالب والرسائل الجماعية.' },
			{ t: 'اقتراحات رد بالذكاء الاصطناعي', d: 'مساعد يرد باقتراحات سريعة داخل المحادثة.' },
			{ t: 'وضع تجريبي معزول', d: 'تدريب الفريق على بيانات وهمية دون لمس الحسابات الحقيقية.' },
		],
	},
	en: {
		title: 'WhatsApp as an ops channel — inside the product',
		desc: 'Don’t just “replace WhatsApp” — run it professionally: multi-account inbox, assignment, notes, templates, reports.',
		points: [
			{ t: 'Multi-account inbox', d: 'Connect WhatsApp sessions and manage chats in one workspace.' },
			{ t: 'Team assignment & notes', d: 'Route conversations to coaches with client context.' },
			{ t: 'Meta Cloud API', d: 'Official WhatsApp API for templates and bulk sends.' },
			{ t: 'AI reply suggestions', d: 'Fast suggested replies inside the conversation.' },
			{ t: 'Isolated demo mode', d: 'Train your team on fake data without touching live accounts.' },
		],
	},
};

export const AI_GROWTH = {
	ar: {
		title: 'ذكاء اصطناعي وأدوات نمو',
		desc: 'أدوات مساعدة حقيقية في الكود — ليست وعودًا عامة.',
		items: [
			{ t: 'FitCoach AI', d: 'مساعد محادثة للمدرب مع معرفة عن مشروعك.' },
			{ t: 'اقتراحات واتساب', d: 'ردود مقترحة لتسريع المتابعة.' },
			{ t: 'توليد خطط تغذية', d: 'مساعدة في بناء خطط وجبات عبر الـ API.' },
			{ t: 'Lead Scout', d: 'اكتشاف أنشطة أعمال حسب التخصص مع إثراء بيانات التواصل.' },
			{ t: 'فحص الرقم', d: 'ذكاء رقمي للتحقق من أرقام الهاتف ومؤشرات الظهور العام.' },
			{ t: 'تفريغ صوتي', d: 'تحويل الصوت إلى نص قابل للتحرير.' },
		],
	},
	en: {
		title: 'AI & growth tools',
		desc: 'Real helpers that exist in the product — not vague promises.',
		items: [
			{ t: 'FitCoach AI', d: 'Coach chat assistant with project knowledge.' },
			{ t: 'WhatsApp suggestions', d: 'Suggested replies to speed follow-up.' },
			{ t: 'Nutrition AI generate', d: 'API-assisted meal plan generation.' },
			{ t: 'Lead Scout', d: 'Discover niche businesses and enrich contact data.' },
			{ t: 'Phone Check', d: 'Phone intelligence and public-presence signals.' },
			{ t: 'Transcription', d: 'Audio to editable text.' },
		],
	},
};

export const ROLES = [
	{
		key: 'admin',
		ar: {
			title: 'المسؤول',
			sub: 'Admin',
			d: 'مركز التحكم: المستخدمون، الباقات، الفواتير، النماذج، والإعدادات.',
			features: ['إدارة المستخدمين والصلاحيات', 'الباقات والاشتراكات', 'نماذج الاستبيان', 'لوحة مؤشرات', 'الهوية البيضاء'],
		},
		en: {
			title: 'Admin',
			sub: 'Owner / Manager',
			d: 'Control center: users, packages, invoices, forms, and settings.',
			features: ['Users & permissions', 'Packages & subscriptions', 'Intake forms', 'KPI dashboard', 'White-label branding'],
		},
	},
	{
		key: 'coach',
		ar: {
			title: 'المدرب',
			sub: 'Coach',
			d: 'يبني الخطط ويتابع الالتزام ويتواصل مع عملائه يوميًا.',
			features: ['خطط تمارين وتغذية', 'مراجعة التقارير', 'ملف العميل 360°', 'محادثات وواتساب', 'ملاحظات ومتابعة'],
		},
		en: {
			title: 'Coach',
			sub: 'Trainer',
			d: 'Builds plans, reviews adherence, and stays close to clients.',
			features: ['Workout & nutrition plans', 'Weekly report review', 'Client 360°', 'Chat & WhatsApp', 'Notes & follow-up'],
		},
	},
	{
		key: 'client',
		ar: {
			title: 'العميل',
			sub: 'Client',
			d: 'تجربة يومية واضحة على الويب والجوال.',
			features: ['تماريني وتسجيل الأداء', 'تغذيتي والوصفات', 'تقرير أسبوعي', 'تذكيرات وإشعارات', 'محادثة مع المدرب'],
		},
		en: {
			title: 'Client',
			sub: 'Member',
			d: 'A clear daily experience on web and mobile.',
			features: ['Workouts & logging', 'Nutrition & recipes', 'Weekly report', 'Reminders & push', 'Chat with coach'],
		},
	},
];

export const JOURNEY = [
	{ ar: { t: 'استبيان', d: 'رابط نموذج يجمع بيانات العميل.' }, en: { t: 'Intake', d: 'Share a form link to collect client data.' } },
	{ ar: { t: 'حساب', d: 'إنشاء العميل وربطه بالمدرب.' }, en: { t: 'Account', d: 'Create the client and assign a coach.' } },
	{ ar: { t: 'خطة تمارين', d: 'بناء وإسناد البرنامج.' }, en: { t: 'Workout plan', d: 'Build and assign the program.' } },
	{ ar: { t: 'خطة تغذية', d: 'وجبات وماكروز وبدائل.' }, en: { t: 'Nutrition', d: 'Meals, macros, and alternatives.' } },
	{ ar: { t: 'تشغيل يومي', d: 'تطبيق + تذكيرات + محادثات.' }, en: { t: 'Daily ops', d: 'App + reminders + messaging.' } },
	{ ar: { t: 'تقرير أسبوعي', d: 'قياسات وصور وملاحظات.' }, en: { t: 'Weekly report', d: 'Measurements, photos, coach notes.' } },
	{ ar: { t: 'فوترة', d: 'اشتراك ومدفوعات واضحة.' }, en: { t: 'Billing', d: 'Clear subscription and payments.' } },
	{ ar: { t: 'تحسين', d: 'تعديل الخطط بناءً على النتائج.' }, en: { t: 'Iterate', d: 'Adjust plans from real results.' } },
];

export const MOBILE = {
	ar: {
		title: 'تطبيق الجوال للعميل',
		desc: 'تجربة Expo جاهزة: تمارين، تغذية، محادثات، تقويم، تذكيرات، وصفات، حاسبة، إحصائيات، تقرير أسبوعي، ومحفظة شخصية.',
		note: 'واجهة الجوال مخصصة للعميل. أدوات الإدارة والمدرب تعمل أساسًا على الويب.',
		items: ['تماريني + مؤقت راحة', 'تغذيتي + تسجيل', 'شات مع المدرب', 'تقويم وعادات', 'تذكيرات بإشعارات', 'تقرير أسبوعي', 'وصفات وحاسبة', 'اكتشاف المؤسسة + هوية العلامة'],
	},
	en: {
		title: 'Client mobile app',
		desc: 'Expo app: workouts, nutrition, chat, calendar, reminders, recipes, calculator, stats, weekly report, and personal wallet.',
		note: 'Mobile is client-focused. Admin and coach tools live primarily on the web.',
		items: ['Workouts + rest timer', 'Nutrition + logging', 'Coach chat', 'Calendar & habits', 'Reminders with push', 'Weekly report', 'Recipes & calculator', 'Tenant discovery + branding'],
	},
};

export const SECURITY = {
	ar: {
		title: 'ثقة وصلاحيات',
		desc: 'أدوار واضحة، مؤسسات متعددة، وتراخيص — بدون ادعاءات أمنية مبالغ فيها.',
		items: [
			{ t: 'أدوار وصلاحيات', d: 'client · coach · admin · super_admin' },
			{ t: 'تعدد المؤسسات', d: 'كل مؤسسة ببياناتها وهويتها.' },
			{ t: 'تراخيص واكتشاف', d: 'دخول عبر البريد أو مفتاح الترخيص.' },
			{ t: 'جلسات JWT', d: 'مصادقة آمنة عبر الواجهة والجوال.' },
		],
	},
	en: {
		title: 'Trust & access',
		desc: 'Clear roles, multi-tenant orgs, and licenses — no overstated security theater.',
		items: [
			{ t: 'Roles & permissions', d: 'client · coach · admin · super_admin' },
			{ t: 'Multi-tenant', d: 'Each org keeps its own data and branding.' },
			{ t: 'Licenses & discovery', d: 'Sign in via email or license key.' },
			{ t: 'JWT sessions', d: 'Secure auth across web and mobile.' },
		],
	},
};

export const FAQ = [
	{
		ar: { q: 'لمن المنصة؟', a: 'لصالات الجيم، المدربين الشخصيين، وأعمال التدريب أونلاين التي تحتاج نظامًا بدل واتساب والإكسل.' },
		en: { q: 'Who is it for?', a: 'Gyms, personal trainers, and online coaching businesses that need a system beyond WhatsApp and spreadsheets.' },
	},
	{
		ar: { q: 'هل تستبدل واتساب؟', a: 'تجمع المنصة محادثات داخلية + إدارة واتساب داخل النظام. يمكنك الإبقاء على واتساب كقناة تشغيل منظمة.' },
		en: { q: 'Does it replace WhatsApp?', a: 'You get in-app chat plus WhatsApp operations inside the product — keep WhatsApp as a structured ops channel.' },
	},
	{
		ar: { q: 'هل يوجد تطبيق جوال؟', a: 'نعم — تطبيق Expo للعميل (تمارين، تغذية، شات، تقارير…). الإدارة والمدرب على لوحة الويب.' },
		en: { q: 'Is there a mobile app?', a: 'Yes — an Expo client app (workouts, nutrition, chat, reports…). Admin/coach tools are on the web dashboard.' },
	},
	{
		ar: { q: 'هل الدفعات مؤتمتة؟', a: 'الفوترة والاشتراكات والفواتير والمدفوعات مُدارة داخل النظام بشكل يدوي منظم. بوابات الدفع الحية تُضاف حسب الاتفاق.' },
		en: { q: 'Are payments automated?', a: 'Subscriptions, invoices, and payments are managed in-product (manual, structured). Live gateways can be added per agreement.' },
	},
	{
		ar: { q: 'هل تدعم أكثر من فرع؟', a: 'المنصة متعددة المؤسسات (Tenants) بهوية مستقلة — وليست نظام فروع داخل نفس الصالة حاليًا.' },
		en: { q: 'Multi-branch?', a: 'We support multi-tenant organizations with separate branding — not facility multi-branch check-in today.' },
	},
	{
		ar: { q: 'كيف أحجز عرضًا؟', a: 'املأ نموذج «احجز عرضًا» في أسفل الصفحة، وسنتواصل معك لترتيب جلسة قصيرة.' },
		en: { q: 'How do I book a demo?', a: 'Fill the “Book a demo” form at the bottom and we’ll schedule a short walkthrough.' },
	},
];

export const DEMO = {
	ar: {
		title: 'احجز عرضًا تجريبيًا',
		desc: 'املأ البيانات وسنفتح واتساب مباشرة لإرسال طلبك إلى فريق So7baFit.',
		submit: 'متابعة عبر واتساب',
		success: 'تم تجهيز الرسالة — أكمل الإرسال من واتساب.',
		fields: { name: 'الاسم', email: 'البريد', phone: 'الجوال', business: 'نوع النشاط', message: 'ملاحظات (اختياري)' },
		businessOptions: [
			{ id: 'gym', label: 'صالة جيم' },
			{ id: 'coach', label: 'مدرب شخصي' },
			{ id: 'online', label: 'تدريب أونلاين' },
			{ id: 'other', label: 'أخرى' },
		],
	},
	en: {
		title: 'Book a demo',
		desc: 'Fill in your details and we’ll open WhatsApp so your request goes straight to the So7baFit team.',
		submit: 'Continue on WhatsApp',
		success: 'Message ready — finish sending in WhatsApp.',
		fields: { name: 'Name', email: 'Email', phone: 'Phone', business: 'Business type', message: 'Notes (optional)' },
		businessOptions: [
			{ id: 'gym', label: 'Gym' },
			{ id: 'coach', label: 'Personal trainer' },
			{ id: 'online', label: 'Online coaching' },
			{ id: 'other', label: 'Other' },
		],
	},
};

export const CLOSING = {
	ar: {
		title: 'قدّم خدمة احترافية — بدون فوضى الأدوات',
		desc: 'So7baFit يجمع التدريب والتغذية والمتابعة وواتساب والفوترة في تجربة واحدة تقنع العميل وتوسّع عملك.',
		cta: 'احجز عرضًا الآن',
	},
	en: {
		title: 'Deliver a pro service — without tool chaos',
		desc: 'So7baFit unifies training, nutrition, follow-up, WhatsApp, and billing into one experience clients trust.',
		cta: 'Book a demo now',
	},
};
