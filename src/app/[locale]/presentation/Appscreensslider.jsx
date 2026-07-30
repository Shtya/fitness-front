'use client';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
	ChevronLeft, ChevronRight, LayoutDashboard, LogIn, Dumbbell,
	Utensils, User, BookOpen, Calculator, CalendarDays
} from 'lucide-react';

function SliderHeader({ n, label, title, titleGrad, desc, dark = false }) {
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
		id: 3, src: '/screens/mobile/workouts.png', icon: Dumbbell, tag: 'Client',
		ar: { label: 'تماريني', labelEn: 'Workouts', desc: 'خطة يومية مع تسجيل أداء ومؤقت راحة' },
		en: { label: 'My Workouts', labelEn: 'Workouts', desc: 'Daily plan with logging and rest timer' },
	},
	{
		id: 1, src: '/screens/mobile/dashboard.png', icon: LayoutDashboard, tag: 'Client',
		ar: { label: 'إحصائياتي', labelEn: 'My Stats', desc: 'نظرة العميل على الالتزام والتقدم' },
		en: { label: 'My Stats', labelEn: 'Stats', desc: 'Client view of adherence and progress' },
	},
	{
		id: 4, src: '/screens/mobile/nutrition.png', icon: Utensils, tag: 'Client',
		ar: { label: 'تغذيتي', labelEn: 'Nutrition', desc: 'وجبات يومية وماكروز وتسجيل التزام' },
		en: { label: 'My Nutrition', labelEn: 'Nutrition', desc: 'Daily meals, macros, and adherence logging' },
	},
	{
		id: 5, src: '/screens/mobile/profile.png', icon: User, tag: 'Client',
		ar: { label: 'ملفي', labelEn: 'Profile', desc: 'بيانات وقياسات واشتراك المدرب' },
		en: { label: 'My Profile', labelEn: 'Profile', desc: 'Details, measurements, and coach subscription' },
	},
	{
		id: 6, src: '/screens/mobile/recipes.png', icon: BookOpen, tag: 'Client',
		ar: { label: 'الوصفات', labelEn: 'Recipes', desc: 'تصفح ووصفات مفضلة تناسب الخطة' },
		en: { label: 'Recipes', labelEn: 'Recipes', desc: 'Browse favorites that fit the plan' },
	},
	{
		id: 7, src: '/screens/mobile/calculator.png', icon: Calculator, tag: 'Tools',
		ar: { label: 'الحاسبة', labelEn: 'Calculator', desc: 'احتياج يومي وماكروز ووجبات' },
		en: { label: 'Calculator', labelEn: 'Calculator', desc: 'Daily needs, macros, and meals' },
	},
	{
		id: 8, src: '/screens/mobile/calendar.png', icon: CalendarDays, tag: 'Tools',
		ar: { label: 'التقويم', labelEn: 'Calendar', desc: 'عادات ومواعيد ومؤقت التزام' },
		en: { label: 'Calendar', labelEn: 'Calendar', desc: 'Habits, events, and commitment timer' },
	},
	{
		id: 2, src: '/screens/mobile/login.png', icon: LogIn, tag: 'Auth',
		ar: { label: 'تسجيل الدخول', labelEn: 'Login', desc: 'اكتشاف المؤسسة ثم الدخول بهويتها' },
		en: { label: 'Login', labelEn: 'Login', desc: 'Discover the org, then sign in with branding' },
	},
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&family=Tajawal:wght@700;800;900&display=swap');

.msl-root {
  direction:rtl;  
  background:color-mix(in srgb, var(--color-primary-50, #eff6ff) 70%, #ffffff); min-height:100vh;
  position:relative; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  padding:60px 20px;
}
.msl-root::before {
  content:''; position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(color-mix(in srgb, var(--color-primary-200, #bfdbfe) 40%, transparent) 1px,transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-primary-200, #bfdbfe) 40%, transparent) 1px,transparent 1px);
  background-size:56px 56px;
}
.msl-orb { position:absolute; border-radius:50%; filter:blur(70px); pointer-events:none; }
@keyframes mslFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
.msl-float { animation:mslFloat 6s ease-in-out infinite; }
@keyframes mslSpin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes mslSpinR { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
.msl-ring-a { animation:mslSpin  22s linear infinite; }
.msl-ring-b { animation:mslSpinR 18s linear infinite; }
@keyframes mslGrad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
.msl-grad {
  background:linear-gradient(270deg,var(--color-primary-500, var(--color-primary-500, #3b82f6)),#38bdf8,#93c5fd,var(--color-primary-500, #3b82f6));
  background-size:300% 300%; animation:mslGrad 5s ease infinite;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}
@keyframes mslShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.msl-sec-label::before {
  content:''; display:block; width:1px; height:28px;
  background:linear-gradient(180deg,rgba(96,165,250,.6),transparent);
  margin:0 auto 8px;
}

/* ── Phone shell ── */
.msl-phone {
  position:relative; border-radius:48px;
  background:linear-gradient(145deg,#0d1b3e,#091228);
  box-shadow:
    0 0 0 1px rgba(15,23,42,.08),
    0 0 0 7px #050e1e,
    0 0 0 8px rgba(255,255,255,.04),
    0 50px 120px rgba(0,0,0,.85),
    0 0 90px rgba(59,130,246,.22),
    inset 0 1px 0 rgba(255,255,255,.09),
    inset 0 -1px 0 rgba(0,0,0,.6);
  transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .5s ease;
}
.msl-phone:hover { transform:translateY(-5px) scale(1.012); }

/* Screen container — clips everything inside */
.msl-screen-wrap {
  border-radius:40px; overflow:hidden;
  background:#020817; position:relative;
  width:100%;
}

/* Dynamic Island */
.msl-island {
  position:absolute; top:0; left:50%; transform:translateX(-50%);
  z-index:40; display:flex; align-items:center; justify-content:center; gap:6px;
}
.msl-island-pill {
  background:#000; border-radius:20px;
  display:flex; align-items:center; justify-content:center; gap:6px;
  box-shadow:0 0 0 1px rgba(255,255,255,.05);
}
.di-cam { width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#1a3a5c,#050e1e);border:1px solid rgba(15,23,42,.08); }
.di-spk { width:36px;height:5px;background:#050e1e;border-radius:3px; }

/* Status bar overlay */
.msl-statusbar {
  position:absolute; left:0; right:0; z-index:30;
  display:flex; align-items:flex-end; justify-content:space-between;
  background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,transparent 100%);
}

/* Side buttons */
.msl-btn-r  { position:absolute;right:-3px;top:90px;width:4px;height:56px;background:linear-gradient(180deg,#1e2d48,#0f1a2e);border-radius:0 3px 3px 0;box-shadow:1px 0 4px rgba(0,0,0,.5); }
.msl-btn-l1 { position:absolute;left:-3px;top:80px;width:4px;height:34px;background:linear-gradient(180deg,#1e2d48,#0f1a2e);border-radius:3px 0 0 3px;box-shadow:-1px 0 4px rgba(0,0,0,.5); }
.msl-btn-l2 { position:absolute;left:-3px;top:124px;width:4px;height:60px;background:linear-gradient(180deg,#1e2d48,#0f1a2e);border-radius:3px 0 0 3px;box-shadow:-1px 0 4px rgba(0,0,0,.5); }

/* Home bar */
.msl-homebar {
  position:absolute; bottom:10px; left:50%; transform:translateX(-50%);
  width:120px; height:5px; background:rgba(255,255,255,.28); border-radius:4px; z-index:35;
}
/* Screen shine */
.msl-shine {
  position:absolute; inset:0; border-radius:40px;
  background:linear-gradient(135deg,rgba(255,255,255,.04) 0%,transparent 50%);
  pointer-events:none; z-index:28;
}

/* Image transition */
.msl-img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; transition:opacity .4s ease,transform .5s cubic-bezier(.22,1,.36,1); will-change:opacity,transform; }
.msl-img.entering { opacity:0; transform:scale(.96) translateY(8px); }
.msl-img.visible  { opacity:1; transform:scale(1) translateY(0); }
.msl-img.exiting  { opacity:0; transform:scale(1.02) translateY(-6px); }

/* Nav */
.msl-dot { width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.1);cursor:pointer;flex-shrink:0;transition:all .35s cubic-bezier(.22,1,.36,1); }
.msl-dot:hover { background:rgba(59,130,246,.5); transform:scale(1.3); }
.msl-dot.on { width:28px; border-radius:4px; transform:none; }
.msl-arrow { width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .3s;backdrop-filter:blur(8px);color:rgba(255,255,255,.55); }
.msl-arrow:hover { background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff;transform:scale(1.08); }
.msl-arrow:active { transform:scale(.95); }

/* Info */
@keyframes mslInfoUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
.msl-info-anim { animation:mslInfoUp .45s cubic-bezier(.22,1,.36,1) both; }
.msl-chip { display:inline-flex;align-items:center;gap:6px;border-radius:100px;padding:5px 14px; font-size:11px;font-weight:700; }
.msl-prog-track { height:2px;background:rgba(15,23,42,.08);border-radius:2px;overflow:hidden; }
.msl-prog-fill  { height:100%;border-radius:2px;transition:width .5s cubic-bezier(.22,1,.36,1); }

/* Right panel */
.msl-rthumb { display:flex;align-items:center;gap:11px;padding:9px 13px;border-radius:14px;cursor:pointer;transition:all .3s ease;position:relative;overflow:hidden;width:100%;border:none;background:transparent; }
.msl-rthumb:hover { transform:translateX(-3px); }

/* Bottom strip */
.msl-icon-btn { cursor:pointer;border-radius:14px;transition:all .3s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px 8px;flex-shrink:0;border:none;background:transparent; }
.msl-icon-btn:hover { transform:translateY(-3px) scale(1.05); }

@keyframes mslKbd { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.msl-kbd { animation:mslKbd .5s 1.2s both; }

@media(max-width:1100px){ .msl-lpanel,.msl-rpanel{display:none!important} }
@media(max-width:700px)  { .msl-strip{display:none!important} }
`;

export default function ScreensSlider() {
	const locale = useLocale();
	const isAr = locale !== 'en';
	const pick = (ar, en) => (isAr ? ar : en);
	const [active, setActive] = useState(0);
	const [imgState, setImgState] = useState('visible');
	const [touchStart, setTouchStart] = useState(null);
	const raw = SCREENS[active];
	const cur = { ...raw, ...(raw[isAr ? 'ar' : 'en'] || {}) };
	const IconComp = cur.icon;

	const goTo = useCallback((idx) => {
		if (idx === active) return;
		setImgState('exiting');
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

	// Phone dimensions
	const PHONE_W = 280;
	const PHONE_PAD = 10;   // shell padding
	const ISLAND_H = 44;   // island row total height (top:14 + pill 30)
	const STATUSBAR_H = 52;   // status bar overlay height
	const HOMEBAR_H = 24;   // home bar area at bottom
	const SCREEN_H = 560;  // total screen area height
	// Content starts after island (44px) and status bar overlap ends at 52px
	// So image top-padding = max(ISLAND_H, STATUSBAR_H) = 52px
	const IMG_TOP_PAD = 52;

	return (
		<>
			<style dangerouslySetInnerHTML={{ __html: CSS }} />
			<div className="msl-root" dir={isAr ? 'rtl' : 'ltr'} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

				{/* Hero-style orbs */}
				<div className="msl-orb msl-float" style={{ width: 700, height: 700, top: -128, right: -160, background: 'radial-gradient(circle,color-mix(in srgb, var(--color-primary-300, #93c5fd) 40%, transparent),transparent 60%)' }} />
				<div className="msl-orb" style={{ width: 500, height: 500, bottom: -80, left: -128, background: 'radial-gradient(circle,color-mix(in srgb, var(--color-secondary-300, #7dd3fc) 35%, transparent),transparent 65%)' }} />

				{/* Spinning rings */}
				<div className="msl-ring-a" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 780, height: 780, borderRadius: '50%', border: '1px solid rgba(59,130,246,.06)', pointerEvents: 'none' }} />
				<div className="msl-ring-b" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', border: '1px dashed rgba(14,165,233,.04)', pointerEvents: 'none' }} />

				<div style={{ width: '100%', maxWidth: 1300, position: 'relative', zIndex: 10 }}>


					<SliderHeader
						n="08"
						label={pick('تطبيق العميل', 'Client app')}
						title={pick('الجوال كما يراه', 'Mobile the way')}
						titleGrad={pick('عميلك', 'your client sees it')}
						desc={pick('تجربة Expo للتمارين والتغذية والمحادثات والتقويم — مخصصة للعميل', 'Expo experience for workouts, nutrition, chat, and calendar — built for clients')}
						dark
					/>

					{/* ── 3-col ── */}
					<div style={{ display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center' }}>

						{/* LEFT info */}
						<div className="msl-lpanel" style={{ width: 240, flexShrink: 0 }}>
							<div key={active} className="msl-info-anim">
								<div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start', marginBottom: 26 }}>
									<span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5 }}>
										{String(active + 1).padStart(2, '0')} / {String(SCREENS.length).padStart(2, '0')}
									</span>
									<div style={{ width: 64, height: 1, background: 'linear-gradient(90deg,transparent,var(--color-primary-500, #3b82f6))' }} />
								</div>
								<div style={{ width: 58, height: 58, borderRadius: 18, background: 'linear-gradient(135deg,rgba(59,130,246,.2),rgba(14,165,233,.1))', border: '1px solid rgba(59,130,246,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', marginBottom: 20, boxShadow: '0 0 28px rgba(59,130,246,.25)' }}>
									<IconComp size={26} color="var(--color-primary-500, var(--color-primary-500, #3b82f6))" />
								</div> 
								<h3 style={{ fontWeight: 900, fontSize: 28, color: '#0f172a', marginBottom: 5 }}>{cur.label}</h3>
 								<p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.85, marginBottom: 28 }}>{cur.desc}</p>
								<div>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
										<span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{pick('التقدم', 'Progress')}</span>
										<span style={{ fontSize: 10, color: 'var(--color-primary-500, var(--color-primary-500, #3b82f6))', fontWeight: 700 }}>{Math.round(((active + 1) / SCREENS.length) * 100)}%</span>
									</div>
									<div className="msl-prog-track">
										<div className="msl-prog-fill" style={{ width: `${((active + 1) / SCREENS.length) * 100}%`, background: 'linear-gradient(90deg,var(--color-primary-600, #2563eb),#0ea5e9)' }} />
									</div>
								</div>
							</div>
						</div>

						{/* CENTER — Phone */}
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
							<div style={{ position: 'relative' }}>
								{/* Glow halo */}
								<div style={{ position: 'absolute', inset: -24, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.2),transparent 65%)', filter: 'blur(20px)', zIndex: 0 }} />

								<div className="msl-phone" style={{ width: PHONE_W, padding: PHONE_PAD, position: 'relative', zIndex: 1 }}>
									<div className="msl-btn-r" /><div className="msl-btn-l1" /><div className="msl-btn-l2" />

									{/* Screen wrap */}
									<div className="msl-screen-wrap" style={{ height: SCREEN_H }}>

										{/* ── Dynamic Island — absolutely positioned at top ── */}
										<div className="msl-island" style={{ top: 14 }}>
											<div className="msl-island-pill" style={{ width: 110, height: 30 }}>
												<div className="di-spk" /><div className="di-cam" />
											</div>
										</div>

										{/* ── Status bar — sits on top of image ── */}
										<div className="msl-statusbar" style={{ top: 0, height: STATUSBAR_H, padding: `0 20px ${8}px` }}>
											<span style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', fontWeight: 700 }}>9:41</span>
											<div className=' !mb-[7px]' style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
												<div className='flex items-end flex-row-reverse gap-[2px]  ' >
													{[3, 5, 7, 9].map((h, i) => (
														<div key={i} style={{ width: 3, height: h, background: 'rgba(255,255,255,.7)', borderRadius: 1 }} />
													))}
												</div>
												<div style={{ width: 22, height: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', padding: '2px', marginRight: 2 }}>
													<div style={{ width: "80%", height: '100%', borderRadius: 1, background: 'rgba(255,255,255,.7)' }} />
												</div>
											</div>
										</div>

										{/* ── Screen image — padded so content clears the status bar ── */}
										<div style={{
											position: 'absolute',
											top: IMG_TOP_PAD,
											left: 0, right: 0,
											bottom: HOMEBAR_H,
											overflow: 'hidden',
										}}>
											<img
												key={active}
												src={cur.src}
												alt={cur.label}
												className={`msl-img ${imgState}`}
												style={{ height: '100%' }}
												onError={(e) => { e.target.style.display = 'none'; const fb = e.target.nextSibling; if (fb) fb.style.display = 'flex'; }}
											/>
											{/* Fallback */}
											<div style={{ display: 'none', position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#0d1b4b,rgba(37,99,235,.18))', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
												<div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(59,130,246,.2)', border: '1px solid rgba(59,130,246,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
													<IconComp size={30} color="var(--color-primary-500, var(--color-primary-500, #3b82f6))" />
												</div>
												<span style={{ fontSize: 13, color: 'rgba(147,197,253,.6)', textAlign: 'center' }}>{cur.label}</span>
											</div>
										</div>

										{/* ── Bottom fade — blends image into home bar ── */}
										<div style={{ position: 'absolute', bottom: HOMEBAR_H, left: 0, right: 0, height: 32, background: 'linear-gradient(180deg,transparent,rgba(2,8,23,.6))', pointerEvents: 'none', zIndex: 26 }} />

										<div className="msl-shine" />
										<div className="msl-homebar" />
									</div>
								</div>
							</div>

							{/* Dots + Arrows */}
							<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
								<button className="msl-arrow" onClick={prev} aria-label={pick('السابق', 'Previous')}><ChevronRight size={20} /></button>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									{SCREENS.map((s, i) => (
										<button key={s.id}
											className={`msl-dot ${i === active ? 'on' : ''}`}
											style={i === active ? { background: 'var(--color-primary-500, #3b82f6)', borderColor: 'rgba(59,130,246,.5)' } : {}}
											onClick={() => goTo(i)}
											aria-label={(s[isAr ? 'ar' : 'en'] || s).label}
										/>
									))}
								</div>
								<button className="msl-arrow" onClick={next} aria-label={pick('التالي', 'Next')}><ChevronLeft size={20} /></button>
							</div>

						</div>

						{/* RIGHT panel */}
						<div className="msl-rpanel" style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
							{SCREENS.map((s, i) => {
								const TI = s.icon; const on = i === active;
								return (
									<button key={s.id} className="msl-rthumb"
										style={{ background: on ? 'color-mix(in srgb, var(--color-primary-100, #dbeafe) 85%, #fff)' : '#ffffff', border: `1px solid ${on ? 'rgba(147,197,253,.15)' : 'rgba(15,23,42,.08)'}` }}
										onClick={() => goTo(i)}>
										{on && <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 3, background: 'linear-gradient(180deg,var(--color-primary-500, #3b82f6),#0ea5e9)', borderRadius: '0 3px 3px 0' }} />}
										<div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: on ? 'linear-gradient(135deg,rgba(59,130,246,.2),rgba(14,165,233,.1))' : 'rgba(255,255,255,.05)', border: `1px solid ${on ? 'rgba(59,130,246,.25)' : 'rgba(15,23,42,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
											<TI size={15} color={on ? 'var(--color-primary-500, var(--color-primary-500, #3b82f6))' : 'rgba(255,255,255,.3)'} />
										</div>
										<div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
											<div style={{ fontSize: 12, fontWeight: 700, color: on ? '#0f172a' : '#64748b', marginBottom: 2, transition: 'color .3s' }}>{(s[isAr ? 'ar' : 'en'] || s).label}</div>
											<div style={{ fontSize: 10, color: on ? 'var(--color-primary-600)' : '#94a3b8', fontWeight: 600, letterSpacing: .5, direction: 'ltr', textAlign: 'right', transition: 'color .3s' }}>{(s[isAr ? 'ar' : 'en'] || s).labelEn || ''}</div>
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