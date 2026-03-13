'use client';
import { useState, useEffect, useCallback } from 'react';
import {
	ChevronLeft, ChevronRight, LayoutDashboard, LogIn, Dumbbell,
	Utensils, User, BookOpen, Calculator, CalendarDays,
	MessageCircle, Users, FileText, ClipboardList, BarChart3,
	RefreshCw, Lock, Star, Globe, ChevronDown, Sparkles
} from 'lucide-react';
import { SectionHeader } from './page';

const SCREENS = [
	{ id: 1, src: '/screens/web/dashboard.png', label: 'لوحة التحكم', labelEn: 'Dashboard', url: 'https://so7bafit.com/dashboard', desc: 'نظرة شاملة على جميع المؤشرات الرئيسية والإحصائيات اليومية', icon: LayoutDashboard, tag: 'Admin', features: ['مؤشرات الأداء', 'الحسابات المعلقة', 'المحادثات النشطة'] },
	{ id: 3, src: '/screens/web/workouts-plans.png', label: 'خطط التمارين', labelEn: 'Workout Plans', url: 'https://so7bafit.com/workouts-plans', desc: 'بناء وإدارة خطط التمارين التفصيلية مع مكتبة تمارين متكاملة', icon: Dumbbell, tag: 'Coach', features: ['مكتبة التمارين', 'بناء الخطط', 'تكرار خطة'] },
	{ id: 4, src: '/screens/web/nutrition-plans.png', label: 'خطط التغذية', labelEn: 'Nutrition Plans', url: 'https://so7bafit.com/nutrition-plans', desc: 'خطط وجبات مفصّلة بالسعرات الحرارية والقيم الغذائية الكاملة', icon: Utensils, tag: 'Coach', features: ['السعرات الحرارية', 'القيم الغذائية', 'البدائل الغذائية'] },
	{ id: 13, src: '/screens/web/exercies.png', label: 'مكتبة التمارين', labelEn: 'Exercises', url: 'https://so7bafit.com/exercises', desc: 'مكتبة مركزية من التمارين مع صور وفيديوهات توضيحية', icon: ClipboardList, tag: 'Admin', features: ['صور توضيحية', 'فيديوهات', 'تصنيف حسب العضلة'] },
	{ id: 7, src: '/screens/web/recipes.png', label: 'الوصفات', labelEn: 'Recipes', url: 'https://so7bafit.com/recipes', desc: 'مكتبة وصفات غذائية ضخمة مصنفة مع طريقة التحضير والقيم', icon: BookOpen, tag: 'Client', features: ['بحث ذكي', 'تصفية متقدمة', 'حفظ المفضلة'] },
	{ id: 5, src: '/screens/web/users.png', label: 'المستخدمين', labelEn: 'Users', url: 'https://so7bafit.com/users', desc: 'إدارة جميع المستخدمين مع البحث والتصفية والتصدير', icon: Users, tag: 'Admin', features: ['بحث + تصفية', 'تخصيص المدربين', 'إدارة الباقات'] },
	{ id: 6, src: '/screens/web/profile.png', label: 'الملف الشخصي', labelEn: 'Profile', url: 'https://so7bafit.com/profile', desc: 'بيانات المستخدم الشاملة والقياسات وتتبع التقدم عبر الزمن', icon: User, tag: 'Client', features: ['القياسات', 'سجل التقدم', 'الإحصائيات'] },
	{ id: 8, src: '/screens/web/calculator.png', label: 'الحاسبة', labelEn: 'Calculator', url: 'https://so7bafit.com/calculator', desc: 'حاسبة السعرات والاحتياج اليومي من البروتين والكربوهيدرات', icon: Calculator, tag: 'Tools', features: ['BMI', 'TDEE', 'الاحتياج اليومي'] },
	{ id: 9, src: '/screens/web/calendar.png', label: 'التقويم', labelEn: 'Calendar', url: 'https://so7bafit.com/calendar', desc: 'جدول المواعيد والمهام والتذكيرات اليومية المنظمة', icon: CalendarDays, tag: 'Tools', features: ['المواعيد', 'المهام', 'التذكيرات'] },
	{ id: 10, src: '/screens/web/chats.png', label: 'المحادثات', labelEn: 'Chats', url: 'https://so7bafit.com/chats', desc: 'تواصل فوري بين العملاء والمدربين والإدارة في واجهة واحدة', icon: MessageCircle, tag: 'All', features: ['رسائل فورية', 'مشاركة الملفات', 'محادثات جماعية'] },
	{ id: 11, src: '/screens/web/forms.png', label: 'نماذج الاستبيان', labelEn: 'Forms', url: 'https://so7bafit.com/forms', desc: 'إنشاء ومشاركة النماذج واستقبال الردود وتنظيم البيانات', icon: FileText, tag: 'Admin', features: ['إنشاء نماذج', 'مشاركة الرابط', 'مراجعة الردود'] },
	{ id: 12, src: '/screens/web/weekly-reports.png', label: 'التقارير الأسبوعية', labelEn: 'Weekly Reports', url: 'https://so7bafit.com/weekly-reports', desc: 'مراجعة تقارير العملاء الأسبوعية وإضافة ملاحظات المدرب', icon: BarChart3, tag: 'Coach', features: ['القياسات', 'صور التقدم', 'ملاحظات المدرب'] },
	{ id: 14, src: '/screens/web/billing.png', label: 'الفواتير', labelEn: 'Billing', url: 'https://so7bafit.com/billing', desc: 'إدارة الاشتراكات والفواتير والمدفوعات في مكان واحد', icon: FileText, tag: 'Admin', features: ['الاشتراكات', 'تتبع المدفوعات', 'الفواتير'] },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&family=Tajawal:wght@700;800;900&display=swap');

.dsl-root {
  direction:rtl; 
  background:linear-gradient(160deg,#f0f7ff 0%,#dbeafe 55%,#e0f2fe 100%);
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
	const [active, setActive] = useState(0);
	const [imgState, setImgState] = useState('visible');
	const [imgNatH, setImgNatH] = useState(0);
	const [touchStart, setTouchStart] = useState(null);
	const cur = SCREENS[active];
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
			<div className="dsl-root" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

				<div className="dsl-orb" style={{ width: 600, height: 600, top: -150, right: -100, background: 'radial-gradient(circle,rgba(59,130,246,.09),transparent 70%)' }} />
				<div className="dsl-orb" style={{ width: 500, height: 500, bottom: -100, left: -80, background: 'radial-gradient(circle,rgba(14,165,233,.07),transparent 70%)' }} />
				<div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 50% 50%,${cur.accent || '#2563eb'}08,transparent 70%)`, transition: 'background .8s ease', pointerEvents: 'none' }} />

				<div style={{ width: '100%', maxWidth: 1300, position: 'relative', zIndex: 10 }}>

					{/* ── Header ── */}
					<SectionHeader
						n="04"
						label="معاينة الشاشات"
						title="شاهد المنصة"
						titleGrad="بنفسك"
						desc="واجهات سطح المكتب المصممة بعناية لأفضل تجربة مستخدم"
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
										<span style={{ fontSize: 10, color: 'rgba(30,58,138,.4)', fontWeight: 600 }}>التقدم</span>
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
															<span style={{ fontSize: 10, fontWeight: 600, color: '#2563eb' }}>مرر للمعاينة</span>
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
								<button className="dsl-arrow" onClick={prev} aria-label="السابق"><ChevronRight size={20} /></button>
								<div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
									{SCREENS.map((s, i) => (
										<button key={s.id} className={`dsl-dot ${i === active ? 'on' : ''}`}
											style={i === active ? { background: '#2563eb', borderColor: 'rgba(37,99,235,.5)' } : {}}
											onClick={() => goTo(i)} aria-label={s.label} />
									))}
								</div>
								<button className="dsl-arrow" onClick={next} aria-label="التالي"><ChevronLeft size={20} /></button>
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
											<div style={{ fontSize: 10, fontWeight: 700, color: on ? '#1e3a8a' : '#64748b', transition: 'color .3s' }}>{s.label}</div>
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