'use client';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
	ChevronLeft, ChevronRight, LayoutDashboard, Dumbbell,
	Utensils, User, BookOpen, Calculator, CalendarDays,
	MessageCircle, Users, FileText, ClipboardList, BarChart3,
	Star, Globe, ChevronDown
} from 'lucide-react';

function SliderHeader({ n, label, title, titleGrad, desc }) {
	return (
		<div className="mb-10 sm:mb-12 text-center" data-reveal>
			<p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--color-primary-700, #1d4ed8)' }}>
				{n} — {label}
			</p>
			<h2 className="mt-3 font-[family-name:var(--font-arabic)] text-2xl font-extrabold text-slate-900 sm:text-3xl">
				{title}{' '}
				<span
					style={{
						background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
						WebkitBackgroundClip: 'text',
						backgroundClip: 'text',
						color: 'transparent',
					}}
				>
					{titleGrad}
				</span>
			</h2>
			{desc && <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">{desc}</p>}
		</div>
	);
}

const SCREENS = [
	{
		id: 1, src: '/screens/web/dashboard.png', icon: LayoutDashboard, tag: 'Admin',
		url: { ar: 'so7bafit.com/ar/dashboard', en: 'so7bafit.com/en/dashboard' },
		ar: { label: 'لوحة التحكم', desc: 'مؤشرات الأداء والحالات المعلقة والمحادثات النشطة', features: ['مؤشرات الأداء', 'الحسابات المعلقة', 'المحادثات النشطة'] },
		en: { label: 'Dashboard', desc: 'KPIs, pending cases, and active conversations', features: ['KPIs', 'Pending accounts', 'Active chats'] },
	},
	{
		id: 3, src: '/screens/web/workouts-plans.png', icon: Dumbbell, tag: 'Coach',
		url: { ar: 'so7bafit.com/ar/dashboard/workouts/plans', en: 'so7bafit.com/en/dashboard/workouts/plans' },
		ar: { label: 'خطط التمارين', desc: 'بناء وإسناد خطط تمارين أسبوعية مع مكتبة متكاملة', features: ['مكتبة التمارين', 'بناء الخطط', 'إسناد للعميل'] },
		en: { label: 'Workout Plans', desc: 'Build and assign weekly workout plans with a full library', features: ['Exercise library', 'Plan builder', 'Client assign'] },
	},
	{
		id: 4, src: '/screens/web/nutrition-plans.png', icon: Utensils, tag: 'Coach',
		url: { ar: 'so7bafit.com/ar/dashboard/nutrition', en: 'so7bafit.com/en/dashboard/nutrition' },
		ar: { label: 'خطط التغذية', desc: 'وجبات وماكروز وبدائل ومكملات لكل عميل', features: ['السعرات', 'البدائل', 'المكملات'] },
		en: { label: 'Nutrition Plans', desc: 'Meals, macros, alternatives, and supplements per client', features: ['Calories', 'Alternatives', 'Supplements'] },
	},
	{
		id: 13, src: '/screens/web/exercies.png', icon: ClipboardList, tag: 'Admin',
		url: { ar: 'so7bafit.com/ar/dashboard/workouts', en: 'so7bafit.com/en/dashboard/workouts' },
		ar: { label: 'مكتبة التمارين', desc: 'تمارين بصور وفيديوهات وتصنيفات عضلية', features: ['صور', 'فيديوهات', 'تصنيف'] },
		en: { label: 'Exercises', desc: 'Exercises with images, videos, and muscle categories', features: ['Images', 'Videos', 'Categories'] },
	},
	{
		id: 7, src: '/screens/web/recipes.png', icon: BookOpen, tag: 'Client',
		url: { ar: 'so7bafit.com/ar/dashboard/recipes', en: 'so7bafit.com/en/dashboard/recipes' },
		ar: { label: 'الوصفات', desc: 'مكتبة وصفات مع القيم الغذائية والمفضلة', features: ['بحث', 'تصفية', 'مفضلة'] },
		en: { label: 'Recipes', desc: 'Recipe library with macros and favorites', features: ['Search', 'Filters', 'Favorites'] },
	},
	{
		id: 5, src: '/screens/web/users.png', icon: Users, tag: 'Admin',
		url: { ar: 'so7bafit.com/ar/dashboard/users', en: 'so7bafit.com/en/dashboard/users' },
		ar: { label: 'المستخدمين', desc: 'إدارة الحسابات والأدوار وربط المدربين', features: ['أدوار', 'تخصيص مدرب', 'بحث'] },
		en: { label: 'Users', desc: 'Manage accounts, roles, and coach assignment', features: ['Roles', 'Coach assign', 'Search'] },
	},
	{
		id: 6, src: '/screens/web/profile.png', icon: User, tag: 'Client',
		url: { ar: 'so7bafit.com/ar/dashboard/users', en: 'so7bafit.com/en/dashboard/users' },
		ar: { label: 'ملف العميل', desc: 'قياسات وتقدم وخطط مرتبطة بالعميل', features: ['قياسات', 'تقدم', 'خطط'] },
		en: { label: 'Client profile', desc: 'Measurements, progress, and linked plans', features: ['Measurements', 'Progress', 'Plans'] },
	},
	{
		id: 8, src: '/screens/web/calculator.png', icon: Calculator, tag: 'Tools',
		url: { ar: 'so7bafit.com/ar/dashboard/calculator', en: 'so7bafit.com/en/dashboard/calculator' },
		ar: { label: 'الحاسبة', desc: 'احتياج يومي وماكروز ووجبات', features: ['TDEE', 'ماكروز', 'وجبات'] },
		en: { label: 'Calculator', desc: 'Daily needs, macros, and meal builder', features: ['TDEE', 'Macros', 'Meals'] },
	},
	{
		id: 9, src: '/screens/web/calendar.png', icon: CalendarDays, tag: 'Tools',
		url: { ar: 'so7bafit.com/ar/workspace', en: 'so7bafit.com/en/workspace' },
		ar: { label: 'التقويم', desc: 'عادات ومواعيد ومؤقت التزام', features: ['عادات', 'مواعيد', 'التزام'] },
		en: { label: 'Calendar', desc: 'Habits, events, and commitment timer', features: ['Habits', 'Events', 'Commitment'] },
	},
	{
		id: 10, src: '/screens/web/chats.png', icon: MessageCircle, tag: 'All',
		url: { ar: 'so7bafit.com/ar/dashboard/chat', en: 'so7bafit.com/en/dashboard/chat' },
		ar: { label: 'المحادثات', desc: 'تواصل فوري داخل المنصة بين الأدوار', features: ['رسائل فورية', 'وسائط', 'محادثات جماعية'] },
		en: { label: 'Chats', desc: 'Real-time messaging across roles', features: ['Instant messages', 'Media', 'Group chats'] },
	},
	{
		id: 11, src: '/screens/web/forms.png', icon: FileText, tag: 'Admin',
		url: { ar: 'so7bafit.com/ar/dashboard/intake/forms', en: 'so7bafit.com/en/dashboard/intake/forms' },
		ar: { label: 'نماذج الاستبيان', desc: 'إنشاء نماذج ومشاركة الروابط ومراجعة الردود', features: ['إنشاء', 'مشاركة', 'ردود'] },
		en: { label: 'Intake forms', desc: 'Create forms, share links, and review replies', features: ['Create', 'Share', 'Responses'] },
	},
	{
		id: 12, src: '/screens/web/weekly-reports.png', icon: BarChart3, tag: 'Coach',
		url: { ar: 'so7bafit.com/ar/dashboard/reports', en: 'so7bafit.com/en/dashboard/reports' },
		ar: { label: 'التقارير الأسبوعية', desc: 'قياسات وصور تقدم وملاحظات المدرب', features: ['قياسات', 'صور', 'ملاحظات'] },
		en: { label: 'Weekly Reports', desc: 'Measurements, progress photos, and coach notes', features: ['Measurements', 'Photos', 'Notes'] },
	},
	{
		id: 14, src: '/screens/web/billing.png', icon: FileText, tag: 'Admin',
		url: { ar: 'so7bafit.com/ar/dashboard/billing', en: 'so7bafit.com/en/dashboard/billing' },
		ar: { label: 'الفواتير', desc: 'اشتراكات وفواتير ومدفوعات يدوية منظمة', features: ['اشتراكات', 'فواتير', 'مدفوعات'] },
		en: { label: 'Billing', desc: 'Subscriptions, invoices, and structured manual payments', features: ['Subscriptions', 'Invoices', 'Payments'] },
	},
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&family=Tajawal:wght@700;800;900&display=swap');

.dsl-root {
  direction:rtl; 
  background:color-mix(in srgb, var(--color-primary-50, #eff6ff) 80%, #ffffff);
  min-height:100vh; position:relative; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  padding:60px 20px;
}
.dsl-root::before {
  content:''; position:absolute; inset:0; pointer-events:none;
  background-image:radial-gradient(rgba(59,130,246,.06) 1px,transparent 1px);
  background-size:28px 28px;
}
.dsl-orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }

/* sec label */
.dsl-sec-label::before {
  content:''; display:block; width:1px; height:28px;
  background:linear-gradient(180deg,rgba(37,99,235,.5),transparent);
  margin:0 auto 8px;
}

/* ── Browser shell ── */
.dsl-browser {
  position:relative; border-radius:16px; overflow:hidden;
  box-shadow:
    0 0 0 1px rgba(59,130,246,.12),
    0 0 0 5px rgba(59,130,246,.04),
    0 24px 80px rgba(29,78,216,.18),
    0 8px 32px rgba(59,130,246,.10);
  transition:box-shadow .5s ease, transform .4s cubic-bezier(.22,1,.36,1);
}
.dsl-browser:hover {
  transform:translateY(-5px) scale(1.004);
  box-shadow:
    0 0 0 1px rgba(59,130,246,.18),
    0 0 0 5px rgba(59,130,246,.06),
    0 36px 100px rgba(29,78,216,.22),
    0 12px 40px rgba(59,130,246,.14);
}

/* Chrome bar */
.dsl-chrome {
  display:flex; align-items:center; gap:12px; padding:0 16px; height:44px;
  background:linear-gradient(180deg,#fff 0%,#f8faff 100%);
  border-bottom:1px solid rgba(59,130,246,.1); position:relative;
}
.dsl-chrome::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(37,99,235,.3) 50%,transparent);
}
.tl-wrap { display:flex; gap:7px; align-items:center; flex-shrink:0; }
.tl { width:12px;height:12px;border-radius:50%;cursor:pointer;transition:filter .2s; }
.tl:hover { filter:brightness(1.15); }
.tl-r { background:radial-gradient(circle at 35% 35%,#ff8080,#ff3b30);box-shadow:0 0 5px rgba(255,59,48,.35); }
.tl-y { background:radial-gradient(circle at 35% 35%,#ffe066,#ffcc00);box-shadow:0 0 5px rgba(255,204,0,.35); }
.tl-g { background:radial-gradient(circle at 35% 35%,#6effa0,#28cd41);box-shadow:0 0 5px rgba(40,205,65,.35); }

/* Address bar row */
.dsl-addrrow {
  display:flex; align-items:center; gap:8px; padding:0 14px; height:38px;
  background:#f8faff; border-bottom:1px solid rgba(59,130,246,.08);
}
.dsl-addrbar {
  flex:1; height:26px; border-radius:8px; background:#fff;
  border:1px solid rgba(59,130,246,.15);
  display:flex; align-items:center; gap:8px; padding:0 12px;
  box-shadow:0 1px 4px rgba(59,130,246,.06);
  transition:border-color .3s, box-shadow .3s;
}
.dsl-addrbar:hover { border-color:rgba(37,99,235,.3); box-shadow:0 1px 8px rgba(59,130,246,.12); }
.dsl-addrtext { font-size:11px;direction:ltr;color:#475569;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.dsl-baction { width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.1);cursor:pointer;flex-shrink:0;transition:all .2s;color:#64748b; }
.dsl-baction:hover { background:rgba(59,130,246,.12);color:#1e40af;border-color:rgba(59,130,246,.2); }

/* Screen area */
.dsl-screen { position:relative; overflow:hidden; background:#f1f5f9; }

/* Tall image hover-scroll */
.dsl-scroll-wrap { width:100%;height:100%;overflow:hidden;position:relative;cursor:ns-resize; }
.dsl-scroll-wrap .dsl-img { width:100%;height:auto;object-fit:unset;transform-origin:top center; }
.dsl-scroll-wrap:hover .dsl-img.visible { animation:dslScrollPrev 5s ease-in-out forwards; }
@keyframes dslScrollPrev {
  0%   { transform:translateY(0); }
  15%  { transform:translateY(0); }
  85%  { transform:translateY(var(--sd,-40%)); }
  100% { transform:translateY(var(--sd,-40%)); }
}
.dsl-scroll-hint {
  position:absolute;bottom:0;left:0;right:0;height:40px;
  background:linear-gradient(180deg,transparent,rgba(241,245,249,.75));
  display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;
  z-index:6;pointer-events:none;opacity:0;transition:opacity .3s;
}
.dsl-scroll-wrap:hover .dsl-scroll-hint { opacity:1; }

/* Normal image */
.dsl-img { width:100%;display:block;transition:opacity .4s ease,transform .5s cubic-bezier(.22,1,.36,1);will-change:transform,opacity; }
.dsl-img.entering { opacity:0;transform:scale(.97) translateY(6px); }
.dsl-img.visible  { opacity:1;transform:scale(1) translateY(0); }
.dsl-img.exiting  { opacity:0;transform:scale(1.02) translateY(-5px); }

.dsl-shine { position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.04) 0%,transparent 45%);pointer-events:none;z-index:5; }

/* Stand */
.dsl-stand-neck { width:80px;height:20px;background:linear-gradient(180deg,#cbd5e1,#94a3b8);border-radius:0 0 3px 3px; }
.dsl-stand-base { width:160px;height:8px;background:linear-gradient(180deg,#94a3b8,#64748b);border-radius:0 0 8px 8px;box-shadow:0 4px 16px rgba(0,0,0,.12); }

/* Nav */
.dsl-dot { width:7px;height:7px;border-radius:50%;background:rgba(59,130,246,.2);border:1px solid rgba(59,130,246,.15);cursor:pointer;flex-shrink:0;transition:all .35s cubic-bezier(.22,1,.36,1); }
.dsl-dot:hover { background:rgba(59,130,246,.45);transform:scale(1.3); }
.dsl-dot.on { width:28px;border-radius:4px;transform:none; }
.dsl-arrow { width:48px;height:48px;border-radius:50%;border:1px solid rgba(59,130,246,.2);background:rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .3s ease;backdrop-filter:blur(8px);color:#3b82f6;box-shadow:0 2px 12px rgba(59,130,246,.1); }
.dsl-arrow:hover { background:#fff;border-color:rgba(37,99,235,.35);color:#1d4ed8;transform:scale(1.08);box-shadow:0 4px 20px rgba(59,130,246,.18); }
.dsl-arrow:active { transform:scale(.95); }

/* Info */
@keyframes dslInfoUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
.dsl-info-anim { animation:dslInfoUp .45s cubic-bezier(.22,1,.36,1) both; }
.dsl-chip { display:inline-flex;align-items:center;gap:6px;border-radius:100px;padding:5px 14px;font-size:11px;font-weight:700; }
.dsl-feat-pill { display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:100px;font-size:11px;font-weight:600; }
.dsl-prog-track { height:3px;background:rgba(59,130,246,.12);border-radius:3px;overflow:hidden; }
.dsl-prog-fill  { height:100%;border-radius:3px;transition:width .5s cubic-bezier(.22,1,.36,1); }

/* Right panel */
.dsl-rthumb { display:flex;align-items:center;gap:11px;padding:9px 13px;border-radius:14px;cursor:pointer;transition:all .3s ease;position:relative;overflow:hidden;width:100%;border:none;background:transparent; }
.dsl-rthumb:hover { transform:translateX(-3px); }

/* Bottom icon strip — scrollable for 14 items */
.dsl-strip { display:flex;justify-content:center;gap:8px;margin-top:40px;flex-wrap:wrap; }
.dsl-icon-btn { cursor:pointer;border-radius:14px;transition:all .3s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px 8px;flex-shrink:0;border:none;background:transparent; }
.dsl-icon-btn:hover { transform:translateY(-3px) scale(1.05); }

@keyframes dslKbd { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.dsl-kbd { animation:dslKbd .5s 1.2s both; }

@media(max-width:1100px){ .dsl-lpanel,.dsl-rpanel{display:none!important} }
@media(max-width:700px)  { .dsl-strip{display:none!important} }
`;

const SCREEN_H = 420;

export default function DesktopScreensSlider() {
	const locale = useLocale();
	const isAr = locale !== 'en';
	const pick = (ar, en) => (isAr ? ar : en);
	const [active, setActive] = useState(0);
	const [imgState, setImgState] = useState('visible');
	const [imgNatH, setImgNatH] = useState(0);
	const [touchStart, setTouchStart] = useState(null);
	const raw = SCREENS[active];
	const cur = { ...raw, ...(raw[isAr ? 'ar' : 'en'] || {}), url: (raw.url && (raw.url[isAr ? 'ar' : 'en'])) || raw.url };
	const IconComp = cur.icon;

	const isTall = imgNatH > SCREEN_H * 1.4;
	const scrollDist = isTall ? `-${Math.min(58, Math.round((1 - SCREEN_H / imgNatH) * 100))}%` : '0%';

	const goTo = useCallback((idx) => {
		if (idx === active) return;
		setImgState('exiting');
		setImgNatH(0);
		setTimeout(() => {
			setActive(idx);
			setImgState('entering');
			requestAnimationFrame(() => setTimeout(() => setImgState('visible'), 30));
		}, 290);
	}, [active]);

	const prev = () => goTo((active - 1 + SCREENS.length) % SCREENS.length);
	const next = () => goTo((active + 1) % SCREENS.length);

	useEffect(() => {
		const fn = (e) => { if (e.key === 'ArrowLeft') next(); if (e.key === 'ArrowRight') prev(); };
		window.addEventListener('keydown', fn);
		return () => window.removeEventListener('keydown', fn);
	}, [active]);

	const onTouchStart = (e) => setTouchStart(e.touches[0].clientX);
	const onTouchEnd = (e) => {
		if (!touchStart) return;
		const d = touchStart - e.changedTouches[0].clientX;
		if (Math.abs(d) > 40) d > 0 ? next() : prev();
		setTouchStart(null);
	};

	const onImgLoad = (e) => setImgNatH(e.target.naturalHeight * (e.target.offsetWidth / e.target.naturalWidth));

	return (
		<>
			<style dangerouslySetInnerHTML={{ __html: CSS }} />
			<div className="dsl-root" dir={isAr ? 'rtl' : 'ltr'} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

				<div className="dsl-orb" style={{ width: 600, height: 600, top: -150, right: -100, background: 'radial-gradient(circle,rgba(59,130,246,.09),transparent 70%)' }} />
				<div className="dsl-orb" style={{ width: 500, height: 500, bottom: -100, left: -80, background: 'radial-gradient(circle,rgba(14,165,233,.07),transparent 70%)' }} />
				<div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 50% 50%,${cur.accent || '#2563eb'}08,transparent 70%)`, transition: 'background .8s ease', pointerEvents: 'none' }} />

				<div style={{ width: '100%', maxWidth: 1300, position: 'relative', zIndex: 10 }}>

					{/* ── Header ── */}
					<SliderHeader
						n="09"
						label={pick('لوحة الويب', 'Web dashboard')}
						title={pick('لوحة التحكم', 'The dashboard')}
						titleGrad={pick('كما يستخدمها فريقك', 'your team actually uses')}
						desc={pick('واجهات الويب للإدارة والمدرب — من الخطط والفواتير حتى التقارير والمحادثات', 'Admin and coach web screens — plans, billing, reports, and chat')}
					/>

					{/* ── 3-col ── */}
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, justifyContent: 'center' }}>

						{/* LEFT info panel */}
						<div className="dsl-lpanel" style={{ width: 250, flexShrink: 0, paddingTop: 8 }}>
							<div key={active} className="dsl-info-anim">
								<div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start', marginBottom: 24 }}>
									<span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(30,58,138,.3)', letterSpacing: 1.5 }}>
										{String(active + 1).padStart(2, '0')} / {String(SCREENS.length).padStart(2, '0')}
									</span>
									<div style={{ width: 64, height: 1, background: 'linear-gradient(90deg,transparent,#2563eb)' }} />
								</div>
								<div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid rgba(59,130,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', marginBottom: 18, boxShadow: '0 4px 18px rgba(37,99,235,.15)' }}>
									<IconComp size={26} color="#2563eb" />
								</div> 
								<h3 style={{ fontWeight: 900, fontSize: 28, color: '#1e3a8a', marginBottom: 5 }}>{cur.label}</h3>
 								<p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.85, marginBottom: 22 }}>{cur.desc}</p>
								{/* Feature pills */}
								<div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
									{cur.features.map((f, i) => (
										<div key={i} className="dsl-feat-pill" style={{ background: '#fff', border: '1px solid rgba(59,130,246,.12)', boxShadow: '0 1px 4px rgba(59,130,246,.06)', color: '#1e40af' }}>
											<div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />{f}
										</div>
									))}
								</div>
								{/* Progress */}
								<div>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
										<span style={{ fontSize: 10, color: 'rgba(30,58,138,.4)', fontWeight: 600 }}>{pick('التقدم', 'Progress')}</span>
										<span style={{ fontSize: 10, color: '#2563eb', fontWeight: 700 }}>{Math.round(((active + 1) / SCREENS.length) * 100)}%</span>
									</div>
									<div className="dsl-prog-track">
										<div className="dsl-prog-fill" style={{ width: `${((active + 1) / SCREENS.length) * 100}%`, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)' }} />
									</div>
								</div>
							</div>
						</div>

						{/* CENTER — Monitor */}
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flex: 1, minWidth: 0, maxWidth: 820 }}>
							<div style={{ position: 'relative', width: '100%' }}>
								<div style={{ position: 'absolute', inset: -30, background: 'radial-gradient(ellipse,rgba(37,99,235,.1),transparent 65%)', filter: 'blur(30px)', zIndex: 0 }} />
								<div style={{ position: 'relative', zIndex: 1 }}>

									<div className="dsl-browser">
										{/* Chrome */}
										<div className="dsl-chrome">
											<div className="tl-wrap"><div className="tl tl-r" /><div className="tl tl-y" /><div className="tl tl-g" /></div>
											<div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
												{/* Single active tab */}
												<div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 14px', borderRadius: '8px 8px 0 0', background: 'linear-gradient(180deg,#f0f7ff,#e8f1ff)', border: '1px solid rgba(59,130,246,.15)', borderBottom: '1px solid #f0f7ff', maxWidth: 200 }}>
													<div style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(37,99,235,.15)', border: '1px solid rgba(37,99,235,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
														<IconComp size={9} color="#2563eb" />
													</div>
													<span style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur.label}</span>
												</div>
												<button style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: 'rgba(37,99,235,.35)', cursor: 'pointer', fontSize: 14 }}>+</button>
											</div>
											<div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
												<div className="dsl-baction"><Star size={12} /></div>
												<div className="dsl-baction"><Globe size={12} /></div>
											</div>
										</div>
 

										{/* Screen */}
										<div className="dsl-screen max-md:!h-fit " style={{ height: SCREEN_H }}>
											{isTall ? (
												<div className="dsl-scroll-wrap" style={{ '--sd': scrollDist, height: SCREEN_H }}>
													<img key={active} src={cur.src} alt={cur.label}
														className={`dsl-img ${imgState}`}
														onLoad={onImgLoad}
														onError={(e) => { e.target.style.display = 'none'; const fb = e.target.nextSibling; if (fb) fb.style.display = 'flex'; }}
													/>
													<Fallback cur={cur} IconComp={IconComp} />
													<div className="dsl-scroll-hint">
														<div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.9)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 100, padding: '3px 12px', backdropFilter: 'blur(6px)' }}>
															<ChevronDown size={11} color="#3b82f6" />
															<span style={{ fontSize: 10, fontWeight: 600, color: '#2563eb' }}>{pick('مرر للمعاينة', 'Hover to preview')}</span>
														</div>
													</div>
													<div className="dsl-shine" />
												</div>
											) : (
												<>
													<img key={active} src={cur.src} alt={cur.label}
														className={`dsl-img ${imgState}`}
														style={{ height: '100%', objectFit: 'cover', objectPosition: 'top' }}
														onLoad={onImgLoad}
														onError={(e) => { e.target.style.display = 'none'; const fb = e.target.nextSibling; if (fb) fb.style.display = 'flex'; }}
													/>
													<Fallback cur={cur} IconComp={IconComp} />
													<div className="dsl-shine" />
												</>
											)}
										</div>
									</div>

									{/* Stand */}
									<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
										<div className="dsl-stand-neck" />
										<div className="dsl-stand-base" />
									</div>
								</div>
							</div>

							{/* Nav */}
							<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 }}>
								<button className="dsl-arrow" onClick={prev} aria-label={pick('السابق', 'Previous')}><ChevronRight size={20} /></button>
								<div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
									{SCREENS.map((s, i) => (
										<button key={s.id} className={`dsl-dot ${i === active ? 'on' : ''}`}
											style={i === active ? { background: '#2563eb', borderColor: 'rgba(37,99,235,.5)' } : {}}
											onClick={() => goTo(i)} aria-label={(s[isAr ? 'ar' : 'en'] || s).label} />
									))}
								</div>
								<button className="dsl-arrow" onClick={next} aria-label={pick('التالي', 'Next')}><ChevronLeft size={20} /></button>
							</div>


						</div>

						{/* RIGHT panel */}
						<div className="dsl-rpanel overflow-hidden grid grid-cols-2" style={{ width: 250, flexShrink: 0,   gap: 7, paddingTop: 8, maxHeight: 520, overflowY: 'auto' }}>
							{SCREENS.map((s, i) => {
								const TI = s.icon; const on = i === active;
								return (
									<button key={s.id} className="dsl-rthumb !px-2 !items-center"
										style={{ background: on ? 'rgba(37,99,235,.08)' : 'rgba(255,255,255,.6)', border: `1px solid ${on ? 'rgba(37,99,235,.25)' : 'rgba(59,130,246,.1)'}`, boxShadow: on ? '0 2px 16px rgba(37,99,235,.12)' : '0 1px 4px rgba(59,130,246,.05)' }}
										onClick={() => goTo(i)}>
										{on && <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 3, background: 'linear-gradient(180deg,#2563eb,#0ea5e9)', borderRadius: '0 3px 3px 0' }} />}
										<div style={{ width: 25, height: 25, borderRadius: 10, flexShrink: 0, background: on ? 'linear-gradient(135deg,#eff6ff,#dbeafe)' : 'linear-gradient(135deg,#f8faff,#f0f7ff)', border: `1px solid ${on ? 'rgba(37,99,235,.2)' : 'rgba(59,130,246,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
											<TI size={12} color={on ? '#2563eb' : '#93c5fd'} />
										</div>
										<div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
											<div style={{ fontSize: 10, fontWeight: 700, color: on ? '#1e3a8a' : '#64748b', transition: 'color .3s' }}>{(s[isAr ? 'ar' : 'en'] || s).label}</div>
 										</div>
									</button>
								);
							})}
						</div>
					</div>


				</div>
			</div>
		</>
	);
}

function Fallback({ cur, IconComp }) {
	return (
		<div style={{ display: 'none', position: 'absolute', inset: 0, background: `linear-gradient(160deg,#eff6ff,rgba(37,99,235,.08))`, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
			<div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid rgba(37,99,235,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<IconComp size={32} color="#2563eb" />
			</div>
			<div style={{ textAlign: 'center' }}>
				<div style={{ fontWeight: 900, fontSize: 20, color: '#1e3a8a', marginBottom: 5 }}>{cur.label}</div>
				<div style={{ fontSize: 12, color: '#64748b' }}>{cur.url}</div>
			</div>
		</div>
	);
}