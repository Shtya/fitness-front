'use client';
import { useEffect, useState } from 'react';
import {
	Crown, Dumbbell, Zap, BarChart3, MessageCircle, TrendingUp,
	Calendar, Utensils, Bell, Settings, FileText, CreditCard, BookOpen,
	Star, Shield, Target, LayoutDashboard, ClipboardList, UserPlus,
	Link, Key, Activity, Send, RotateCcw, Calculator, Wallet,
	Flame, Timer, Layers, Globe, Sparkles,
	ArrowRight, Play, Eye, Lightbulb, PieChart, LineChart,
	Repeat, ListChecks, Database, Users
} from 'lucide-react';
import AppScreensSlider from './Appscreensslider';
import DesktopScreensSlider from './Desktopscreensslider';


const GLOBAL_CSS = `
html{scroll-behavior:smooth;direction:rtl}
body{ sans-serif;background:#020817;overflow-x:hidden;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#020817}::-webkit-scrollbar-thumb{background:#2563eb;border-radius:4px}
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .75s cubic-bezier(.22,1,.36,1),transform .75s cubic-bezier(.22,1,.36,1)}
[data-reveal="left"]{transform:translateX(-28px)}[data-reveal="right"]{transform:translateX(28px)}
[data-reveal="scale"]{transform:scale(.9)}[data-reveal="fade"]{transform:none}
[data-reveal].visible{opacity:1!important;transform:none!important}
.d1{transition-delay:.05s!important}.d2{transition-delay:.13s!important}.d3{transition-delay:.21s!important}
.d4{transition-delay:.29s!important}.d5{transition-delay:.37s!important}
.grad-text{background:linear-gradient(270deg,#60a5fa,#38bdf8,#93c5fd,#3b82f6);background-size:300% 300%;animation:gradShift 5s ease infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.noise-bg::after{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.028'/%3E%3C/svg%3E");pointer-events:none;z-index:1}
.grid-dots{background-image:radial-gradient(rgba(59,130,246,.1) 1px,transparent 1px);background-size:30px 30px}
.grid-lines{background-image:linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px);background-size:56px 56px}
.shimmer-ring{position:relative;isolation:isolate}
.shimmer-ring::before{content:'';position:absolute;inset:-1.5px;border-radius:inherit;background:linear-gradient(90deg,transparent 20%,rgba(96,165,250,.55) 50%,transparent 80%);background-size:200% 100%;animation:shimmer 2.5s linear infinite;z-index:-1}
#pb{position:fixed;top:0;left:0;height:2px;z-index:9999;background:linear-gradient(90deg,#2563eb,#0ea5e9,#60a5fa);transition:width .15s ease;box-shadow:0 0 14px rgba(59,130,246,.9)}
.ndot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .3s ease;display:block}
.ndot:hover{background:rgba(59,130,246,.5);transform:scale(1.3)}
.ndot.on{background:#3b82f6;transform:scale(1.6);box-shadow:0 0 12px rgba(59,130,246,.8)}
.lift{transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s ease}
.lift:hover{transform:translateY(-5px)}
.orb{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none;z-index:0}
.sec-line::before{content:'';display:block;width:1px;height:28px;background:linear-gradient(180deg,rgba(96,165,250,.6),transparent);margin:0 auto 8px}
@keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 32px rgba(59,130,246,.22)}50%{box-shadow:0 0 72px rgba(59,130,246,.55)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.float-anim{animation:float 4s ease-in-out infinite}
.spin-slow{animation:spinSlow 22s linear infinite}
.spin-rev{animation:spinSlow 18s linear infinite reverse}
.glow-pulse{animation:glowPulse 3s ease-in-out infinite}
`;

function useReveal() {
	useEffect(() => {
		const els = document.querySelectorAll('[data-reveal]');
		const io = new IntersectionObserver(
			entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
			{ threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
		);
		els.forEach(el => io.observe(el));
		return () => io.disconnect();
	}, []);
}



const Chip = ({ children, v = 'blue', cls = '' }) => {
	const s = {
		blue: 'bg-blue-500/10 border border-blue-500/25 text-blue-300',
		sky: 'bg-sky-500/[0.12] border border-sky-500/30 text-sky-300',
		white: 'bg-white/[0.08] border border-white/[0.12] text-blue-200',
		light: 'bg-blue-50 border border-blue-200/60 text-blue-700',
	};
	return <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold font-cairo tracking-wide ${s[v]} ${cls}`}>{children}</span>;
};

const SecLabel = ({ n, text }) => (
	<div className="flex flex-col items-center gap-1 sec-line">
		<span className="font-cairo text-[10px] font-bold tracking-[3.5px] uppercase text-blue-400/60">{n} — {text}</span>
	</div>
);

const IconWrap = ({ children, size = 48, dark = false }) => (
	<div style={{ width: size, height: size }}
		className={`rounded-2xl flex items-center justify-center flex-shrink-0 ${dark ? 'bg-gradient-to-br from-blue-600/25 to-sky-600/15 border border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50'}`}>
		{children}
	</div>
);

/* ── Section Wrappers ── */
const DarkSec = ({ id, children, bg = 'linear-gradient(160deg,#0c1445 0%,#0d1b4b 45%,#071b3e 100%)' }) => (
	<section id={id} className="relative min-h-screen flex items-center justify-center overflow-hidden noise-bg"
		style={{ background: bg }}>
		<div className="grid-lines absolute inset-0 z-0 pointer-events-none" />
		{children}
	</section>
);

const LightSec = ({ id, children }) => (
	<section id={id} className="relative min-h-screen flex items-center justify-center overflow-hidden"
		style={{ background: 'linear-gradient(160deg,#f0f7ff 0%,#dbeafe 55%,#e0f2fe 100%)' }}>
		<div className="orb w-96 h-96 -top-24 -left-20 opacity-40"
			style={{ background: 'radial-gradient(circle,rgba(59,130,246,.09),transparent 70%)' }} />
		{children}
	</section>
);

const DeepSec = ({ id, children }) => (
	<section id={id} className="relative min-h-screen flex items-center justify-center overflow-hidden noise-bg"
		style={{ background: 'linear-gradient(160deg,#050e2e 0%,#0a1638 60%,#040c28 100%)' }}>
		<div className="grid-dots absolute inset-0 z-0 pointer-events-none" />
		{children}
	</section>
);

const Wrap = ({ children, cls = '' }) => (
	<div className={`w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 py-16 sm:py-20 relative z-10 ${cls}`}>
		{children}
	</div>
);

/* ── Reusable section header ── */
export const SectionHeader = ({ n, label, title, titleGrad, desc, dark = false }) => (
	<div className="mb-10 sm:mb-12 text-center" data-reveal>
		<SecLabel n={n} text={label} />
		<h2 className={`mt-4 font-tajawal text-2xl font-black sm:text-3xl lg:text-[clamp(25px,4.5vw,40px)] ${dark ? 'text-white' : 'text-blue-950'}`}>
			{title}
			{titleGrad && (
				<span className={"text-center " + dark
					? 'grad-text'
					: 'bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent'}>
					{titleGrad}
				</span>
			)}
		</h2>
		{desc && (
			<p className={`mx-auto mt-4 max-w-2xl font-cairo text-sm md:leading-8 sm:text-base ${dark ? 'text-blue-100/70' : 'text-slate-600'}`}>
				{desc}
			</p>
		)}
		<div className={`mx-auto mt-4 h-0.5 w-10 rounded-full ${dark ? 'bg-gradient-to-r from-blue-500 to-sky-400' : 'bg-gradient-to-r from-blue-600 to-sky-500 opacity-60'}`} />
	</div>
);

/* ══════════════════ §1 HERO ══════════════════ */
function Hero() {
	const features = [
		{ icon: <Target size={11} />, t: "إدارة العملاء والخطط" },
		{ icon: <BarChart3 size={11} />, t: "متابعة تقدم واضحة" },
		{ icon: <MessageCircle size={11} />, t: "تواصل مباشر داخل المنصة" },
		{ icon: <TrendingUp size={11} />, t: "نتائج وتقارير قابلة للقياس" },
	];

	const stats = [
		{ n: "٣", label: "أدوار رئيسية", sub: "Admin / Coach / Client", icon: <Crown size={20} className="text-blue-300" />, accent: false },
		{ n: "٣٠+", label: "واجهة متخصصة", sub: "لتنظيم وإدارة العمل", icon: <Layers size={20} className="text-sky-300" />, accent: true },
		{ n: "١٠٠٪", label: "منصة متكاملة", sub: "للتدريب والتغذية والمتابعة", icon: <Shield size={20} className="text-blue-300" />, accent: false },
	];

	return (
		<section id="s1" dir="rtl" className="noise-bg relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
			<div className="float-anim orb pointer-events-none absolute -right-40 -top-32 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-3xl sm:h-[600px] sm:w-[600px]" />
			<div className="orb pointer-events-none absolute -bottom-20 -left-32 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl sm:h-[400px] sm:w-[400px]" />
			<div className="spin-slow pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/10 lg:h-[680px] lg:w-[680px]" />
			<div className="spin-rev pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-sky-400/10 lg:h-[500px] lg:w-[500px]" />
			<div className="grid-lines pointer-events-none absolute inset-0" />

			<Wrap>
				<div className="flex flex-col items-center gap-10 lg:flex-row   lg:gap-20">

					{/* Text Side */}
					<div className="  min-w-0 flex-1 text-right  ">
						<div data-reveal className="mb-5 flex justify-start">
							<Chip v="white">
								<Sparkles size={12} className="text-blue-400" />
								منصة SaaS لإدارة التدريب والتغذية
							</Chip>
						</div>

						<h1 data-reveal className="d1 mb-5 font-tajawal text-[clamp(32px,8vw,62px)] font-black md: leading-tight tracking-tight text-white">
							كل ما تحتاجه لإدارة
							<br />
							<span className="grad-text">أعمال التدريب واللياقة</span>
						</h1>

						<p data-reveal className="d2 mb-8 font-cairo text-sm md: leading-8 text-slate-300/80 sm:text-base lg:max-w-2xl">
							منصة متكاملة تجمع الإدارة والمدربين والعملاء في نظام واحد — من إعداد الخطط ومتابعة التقدم، إلى التقارير الأسبوعية وتنظيم التواصل اليومي.
						</p>

						<div data-reveal className="d3 mb-10 flex flex-wrap justify-start gap-2">
							{features.map(({ icon, t }) => (
								<Chip key={t} v="blue"><span className="text-blue-400">{icon}</span>{t}</Chip>
							))}
						</div>

					</div>

					{/* Stats Side */}
					<div data-reveal="right" className=" flex w-full flex-row justify-center gap-3 lg:w-auto lg:flex-col lg:gap-4">
						{stats.map((s, i) => (
							<div key={s.label} className={[
								"lift relative flex-1 overflow-hidden rounded-2xl px-4   py-5 text-center lg:min-w-44 lg:px-7 lg:py-6",
								i === 1 ? "shimmer-ring" : "",
								s.accent ? "border border-blue-200/15 bg-blue-700/20" : "border border-white/10 bg-white/5",
							].join(" ")}>
								<div className="mb-2 flex justify-center">{s.icon}</div>
								<div className="mb-1.5 text-white bg-gradient-to-r from-blue-300 to-sky-400 bg-clip-text font-tajawal text-4xl font-black md: leading-none text-transparent sm:text-5xl">
									{s.n}
								</div>
								<div className="font-cairo text-xs font-semibold text-blue-200">{s.label}</div>
								<div className="mt-1 font-cairo text-[10px] text-slate-400">{s.sub}</div>
							</div>
						))}
					</div>
				</div>
			</Wrap>
		</section>
	);
}

/* ══════════════════ §2 OVERVIEW ══════════════════ */
function Overview() {
	const cards = [
		{
			icon: <Target size={26} className="text-blue-600" />,
			title: "التحدي",
			desc: "إدارة العمل عبر واتساب وملفات متفرقة تجعل متابعة العملاء والخطط والدفعات والتقارير مرهقة وغير واضحة.",
			dark: false,
		},
		{
			icon: <Lightbulb size={26} className="text-white" />,
			title: "الحل",
			desc: "منصة واحدة تجمع الإدارة والمدربين والعملاء في نظام منظم يربط الخطط التدريبية والتغذية والتقارير والمحادثات والعمليات اليومية.",
			dark: true,
		},
		{
			icon: <TrendingUp size={26} className="text-blue-600" />,
			title: "القيمة",
			desc: "تنظيم أعلى، متابعة أدق، تجربة أكثر احترافية للعميل، وقدرة أفضل على التوسع بناءً على بيانات واضحة.",
			dark: false,
		},
	];

	const points = [
		{ label: "إدارة مركزية", icon: <LayoutDashboard size={13} /> },
		{ label: "تجربة عميل احترافية", icon: <Star size={13} /> },
		{ label: "متابعة قابلة للقياس", icon: <BarChart3 size={13} /> },
		{ label: "تواصل مباشر ومنظم", icon: <MessageCircle size={13} /> },
		{ label: "جاهز للنمو والتوسع", icon: <TrendingUp size={13} /> },
		{ label: "بيانات واضحة وموثوقة", icon: <Database size={13} /> },
	];

	return (
		<LightSec id="s2" dir="rtl">
			<Wrap>
				<SectionHeader
					n="02" label="نظرة عامة"
					title="لماذا هذه المنصة؟"
					titleGrad="وما القيمة التي تقدمها؟"
					desc="منصة تساعد على تنظيم دورة العمل كاملة — من جمع بيانات العميل وإنشاء الحساب، إلى إسناد الخطط ومتابعة التقدم والتقارير والمدفوعات داخل تجربة موحدة."
				/>

				<div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
					{cards.map((c, i) => (
						<div key={c.title} data-reveal className={`d${i + 1}`}>
							{c.dark ? (
								<div className="lift relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-700 to-sky-700 p-7 max-md:p-4 text-center shadow-2xl shadow-blue-800/30">
									<div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.15)_1px,transparent_1px)] [background-size:20px_20px]" />
									<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-300 to-sky-300" />
									<div className="max-md:flex max-md:items-start max-md:gap-3 relative z-10">
										<div className="flex-none mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
											{c.icon}
										</div>
										<div className='max-md:flex max-md:items-start  max-md:flex-col'>
											<div className="max-md:text-right max-md:text-sm  mb-2 font-cairo text-lg font-extrabold text-white">{c.title}</div>
											<div className="max-md:text-right max-md:text-sm  font-cairo text-sm md:leading-7 text-blue-100/85">{c.desc}</div>
										</div>
									</div>
								</div>
							) : (
								<div className="lift  max-md:flex max-md:items-start max-md:gap-3 relative h-full overflow-hidden rounded-2xl border border-blue-100/80 bg-white p-7 max-md:p-4 text-center shadow-lg shadow-blue-100">
									<div className="absolute right-0 top-0 h-14 w-1 rounded-t-full bg-gradient-to-b from-blue-500 to-sky-500" />
									<div className="flex-none mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100">
										{c.icon}
									</div>
									<div className='max-md:flex max-md:items-start  max-md:flex-col'>
										<div className="mb-2 max-md:text-right max-md:text-sm  font-cairo text-lg font-extrabold text-blue-950">{c.title}</div>
										<div className=" max-md:text-right max-md:text-sm font-cairo text-sm md:leading-7 text-slate-600">{c.desc}</div>

									</div>
								</div>
							)}
						</div>
					))}
				</div>

				<div data-reveal className="overflow-hidden rounded-2xl border border-blue-200/60 bg-white/80 p-5 backdrop-blur-sm sm:p-6">
					<p className="mb-4 text-center font-cairo text-sm font-extrabold text-blue-950 sm:text-base">
						ماذا يحصل عليه الفريق والعملاء؟
					</p>
					<div className="flex flex-wrap justify-center gap-2 sm:gap-3">
						{points.map((p) => (
							<div key={p.label} className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 shadow-sm sm:px-4">
								<span className="text-blue-600">{p.icon}</span>
								<span className="font-cairo text-xs font-bold text-blue-800">{p.label}</span>
							</div>
						))}
					</div>
				</div>
			</Wrap>
		</LightSec>
	);
}

/* ══════════════════ §3 ROLES ══════════════════ */
const ROLES_DATA = [
	{
		icon: <Crown size={32} className="text-blue-200" />,
		title: "المسؤول", sub: "Admin",
		description: "واجهة إدارية شاملة لإدارة المنصة ومتابعة جميع الجوانب التشغيلية والمالية من مكان واحد.",
		features: [
			{ icon: <Shield size={13} />, t: "إدارة المستخدمين والصلاحيات" },
			{ icon: <ListChecks size={13} />, t: "إنشاء الخطط وإسنادها للعملاء" },
			{ icon: <CreditCard size={13} />, t: "متابعة الاشتراكات والمدفوعات" },
			{ icon: <FileText size={13} />, t: "مراجعة التقارير والنماذج" },
		],
		badge: "صلاحيات كاملة",
		cardClass: "border border-blue-200/20 bg-gradient-to-br from-blue-950 via-blue-800 to-blue-700",
		barClass: "bg-gradient-to-r from-blue-500 to-blue-300",
		badgeClass: "border border-blue-300/30 bg-blue-500/15 text-blue-200",
		dotClass: "text-blue-300",
		iconBoxClass: "bg-blue-400/10 text-blue-300 border border-blue-300/20",
		orbClass: "bg-blue-500/10",
	},
	{
		icon: <Dumbbell size={32} className="text-sky-200" />,
		title: "المدرب", sub: "Coach",
		description: "واجهة عملية تساعد المدرب على إدارة عملائه ومتابعة تقدمهم وتقديم خطط وملاحظات واضحة.",
		features: [
			{ icon: <Dumbbell size={13} />, t: "إنشاء خطط التمارين والتغذية" },
			{ icon: <Activity size={13} />, t: "متابعة تقدم العملاء أسبوعيًا" },
			{ icon: <ClipboardList size={13} />, t: "مراجعة الحالات وإضافة الملاحظات" },
			{ icon: <MessageCircle size={13} />, t: "التواصل المباشر مع العملاء" },
		],
		badge: "إدارة العملاء",
		cardClass: "border border-sky-200/20 bg-gradient-to-br from-sky-950 via-sky-800 to-cyan-700",
		barClass: "bg-gradient-to-r from-sky-500 to-cyan-300",
		badgeClass: "border border-sky-300/30 bg-sky-500/15 text-sky-200",
		dotClass: "text-sky-300",
		iconBoxClass: "bg-sky-400/10 text-sky-300 border border-sky-300/20",
		orbClass: "bg-sky-500/10",
	},
	{
		icon: <Activity size={32} className="text-indigo-200" />,
		title: "العميل", sub: "Client",
		description: "تجربة مخصصة تساعد العميل على متابعة خطته اليومية وتسجيل التقدم والتواصل مع المدرب بسهولة.",
		features: [
			{ icon: <Flame size={13} />, t: "متابعة التمارين والتغذية اليومية" },
			{ icon: <Send size={13} />, t: "إرسال التقارير والقياسات الأسبوعية" },
			{ icon: <Bell size={13} />, t: "استقبال ملاحظات المدرب مباشرةً" },
			{ icon: <Settings size={13} />, t: "إدارة الملف الشخصي والتذكيرات" },
		],
		badge: "تجربة شخصية",
		cardClass: "border border-indigo-200/15 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900",
		barClass: "bg-gradient-to-r from-indigo-400 to-blue-200",
		badgeClass: "border border-indigo-300/25 bg-indigo-500/10 text-indigo-200",
		dotClass: "text-indigo-200",
		iconBoxClass: "bg-indigo-400/10 text-indigo-200 border border-indigo-300/20",
		orbClass: "bg-indigo-500/10",
	},
];

function Roles() {
	return (
		<DarkSec id="s3" dir="rtl">
			<div className="orb pointer-events-none absolute -bottom-20 -right-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl lg:h-[500px] lg:w-[500px]" />
			<Wrap>
				<SectionHeader
					n="05" label="أدوار المستخدمين"
					title="ثلاثة أدوار،"
					titleGrad="منصة واحدة"
					desc="كل دور يحصل على واجهة مخصصة وصلاحيات مناسبة، مع ترابط كامل بين الإدارة والمدرب والعميل داخل نفس المنصة."
					dark
				/>

				<div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
					{ROLES_DATA.map((r, i) => (
						<div key={r.title} data-reveal className={`d${i + 1} lift relative overflow-hidden rounded-3xl p-6 sm:p-8 ${r.cardClass}`}>
							<div className={`absolute inset-x-0 top-0 h-0.5 ${r.barClass}`} />
							<div className={`pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-2xl ${r.orbClass}`} />
							<div className="absolute left-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 font-tajawal text-xs font-black text-white/80">
								٠{i + 1}
							</div>
							<div className="relative mb-5 mt-2">{r.icon}</div>
							<div className="mb-1 font-tajawal text-2xl font-black text-white">{r.title}</div>
							<div className={`mb-4 font-cairo text-[10px] font-bold tracking-[0.25em] opacity-70 ${r.dotClass}`}>{r.sub}</div>
							<p className="mb-5 font-cairo text-sm md:leading-7 text-blue-100/75">{r.description}</p>
							<div className="mb-6 flex flex-col gap-2.5">
								{r.features.map((f) => (
									<div key={f.t} className="flex items-start gap-3">
										<div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${r.iconBoxClass}`}>
											{f.icon}
										</div>
										<span className="font-cairo text-[13px] md:leading-7 text-blue-100/85">{f.t}</span>
									</div>
								))}
							</div>
							<span className={`inline-flex items-center rounded-full px-4 py-1.5 font-cairo text-[11px] font-bold ${r.badgeClass}`}>
								{r.badge}
							</span>
						</div>
					))}
				</div>
			</Wrap>
		</DarkSec>
	);
}

/* ══════════════════ §4 WORKFLOW ══════════════════ */
const STEPS = [
	{ n: 1, icon: <ClipboardList size={16} />, t: "نموذج جمع البيانات", d: "إرسال استبيان مخصص لجمع بيانات العميل قبل بدء الخدمة." },
	{ n: 2, icon: <FileText size={16} />, t: "مراجعة الردود", d: "مراجعة إجابات العميل والمرفقات للتأكد من اكتمال المعلومات." },
	{ n: 3, icon: <UserPlus size={16} />, t: "إنشاء الحساب", d: "إضافة العميل وربطه بالمدرب المسؤول داخل النظام." },
	{ n: 4, icon: <Calendar size={16} />, t: "إعداد خطة التمارين", d: "إنشاء خطة تدريبية حسب هدف العميل ومستواه وجدوله." },
	{ n: 5, icon: <Utensils size={16} />, t: "إعداد الخطة الغذائية", d: "بناء خطة غذائية بالوجبات والمكملات والبدائل المناسبة." },
	{ n: 6, icon: <Link size={16} />, t: "إسناد الخطط", d: "ربط الخطط بحساب العميل ليبدأ متابعة برنامجه مباشرة." },
	{ n: 7, icon: <Key size={16} />, t: "إرسال بيانات الدخول", d: "مشاركة بيانات الحساب مع العميل عبر واتساب أو البريد." },
	{ n: 8, icon: <Dumbbell size={16} />, t: "بدء المتابعة اليومية", d: "العميل يبدأ التمارين والتغذية ويسجل التزامه اليومي." },
	{ n: 9, icon: <BarChart3 size={16} />, t: "التقارير الأسبوعية", d: "إرسال القياسات وصور التقدم والملاحظات للمراجعة." },
	{ n: 10, icon: <RotateCcw size={16} />, t: "متابعة وتطوير مستمر", d: "تحديث الخطط والملاحظات بناءً على النتائج المحققة." },
];

const StepCard = ({ s, sky = false, delay = 0 }) => (
	<div data-reveal className={`d${delay + 1} group`}>
		<div className={[
			"lift relative h-full  rounded-2xl border transition-all duration-300",
			"p-3 md:p-4",
			sky ? "border-sky-400/15 bg-sky-400/5" : "border-white/10 bg-white/5",
		].join(" ")}>

			{/* Hover top bar */}
			<div className={[
				"absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
				sky ? "bg-gradient-to-r from-sky-500 to-cyan-300" : "bg-gradient-to-r from-blue-500 to-sky-400",
			].join(" ")} />

			{/* ── Number badge — absolute corner ── */}
			<div className={[
				"absolute max-md:right-[-8px] max-md:top-[-8px] right-2.5 top-2.5 flex items-center justify-center rounded-full font-tajawal font-black text-white",
				"h-6 w-6 text-[9px]",
				sky
					? "bg-gradient-to-br from-sky-700 to-sky-500 ring-2 ring-sky-400/15"
					: "bg-gradient-to-br from-blue-600 to-sky-500 ring-2 ring-blue-400/15",
			].join(" ")}>
				{s.n}
			</div>

			{/* ── Mobile: icon + title inline / Desktop: stacked centered ── */}
			<div className="flex items-center gap-2 md:flex-col md:items-center md:text-center">

				{/* Icon box */}
				<div className={[
					"flex flex-shrink-0 items-center justify-center rounded-xl border",
					"h-7 w-7 md:mb-2.5 md:h-8 md:w-8",
					sky ? "border-sky-400/20 bg-sky-400/10 text-sky-400" : "border-blue-400/20 bg-blue-500/10 text-blue-400",
				].join(" ")}>
					<span className="[&>svg]:h-3.5 [&>svg]:w-3.5">
						{s.icon}
					</span>
				</div>

				{/* Title */}
				<div className="flex-1 text-right font-cairo text-[10px] font-bold md: leading-tight text-white md:flex-none md:text-center md:text-[11px]">
					{s.t}
				</div>
			</div>

			{/* Description — desktop only */}
			<div className={[
				"mt-2   font-cairo text-[10px] md: leading-5 md:block md:text-center",
				sky ? "text-sky-200/65" : "text-blue-100/65",
			].join(" ")}>
				{s.d}
			</div>

		</div>
	</div>
);

function Workflow() {
	return (
		<DeepSec id="s4" dir="rtl">
			<div className="orb pointer-events-none absolute -right-24 -top-20 h-64 w-96 rounded-full bg-blue-600/10 blur-3xl lg:h-[400px] lg:w-[600px]" />
			<div className="orb pointer-events-none absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl lg:h-[400px] lg:w-[400px]" />
			<Wrap>
				<SectionHeader
					n="06" label="رحلة العمل"
					title="من أول تسجيل"
					titleGrad="حتى المتابعة والنتائج"
					desc="عشر خطوات منظمة تغطي رحلة العميل كاملة — من جمع البيانات وإعداد الخطط، حتى التقارير الأسبوعية والتطوير المستمر."
					dark
				/>

				<div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{STEPS.slice(0, 5).map((s, i) => <StepCard key={s.n} s={s} delay={i} />)}
				</div>

				<div data-reveal className="mb-4 flex items-center gap-3">
					<div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-400/35" />
					<div className="flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 font-cairo text-[11px] font-bold text-blue-300">
						<RotateCcw size={11} />
						دورة عمل مستمرة ومتجددة
					</div>
					<div className="h-px flex-1 bg-gradient-to-r from-sky-400/35 to-transparent" />
				</div>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{STEPS.slice(5).map((s, i) => <StepCard key={s.n} s={s} sky delay={i} />)}
				</div>
			</Wrap>
		</DeepSec>
	);
}

/* ══════════════════ §5 ADMIN ══════════════════ */
function AdminFeatures() {
	const dashboardItems = [
		{ icon: <PieChart size={13} />, t: "مؤشرات الأداء الرئيسية" },
		{ icon: <Bell size={13} />, t: "الحسابات والحالات المعلقة" },
		{ icon: <MessageCircle size={13} />, t: "المحادثات الأكثر نشاطًا" },
		{ icon: <LineChart size={13} />, t: "رسوم وتحليلات لحظية" },
	];

	const mainCards = [
		{
			icon: <Users size={20} className="text-blue-600" />,
			t: "إدارة المستخدمين",
			d: "إدارة جميع الحسابات من إضافة وتعديل ومراجعة، مع تخصيص المدربين والخطط لكل عميل.",
			b: "بحث + تصفية + إجراءات مباشرة",
		},
		{
			icon: <Eye size={20} className="text-blue-600" />,
			t: "ملف العميل",
			d: "عرض شامل للبيانات الأساسية، الاشتراك، القياسات، نسب الالتزام، الخطط، وسجل التقارير.",
			b: "رؤية متكاملة للعميل",
		},
		{
			icon: <ClipboardList size={20} className="text-blue-600" />,
			t: "نماذج الاستبيان",
			d: "إنشاء نماذج مخصصة لجمع بيانات العملاء مع مشاركة الروابط ومراجعة الردود والمرفقات.",
			b: "إنشاء + مشاركة + مراجعة",
		},
	];

	const supportCards = [
		{ icon: <Dumbbell size={18} className="text-blue-600" />, t: "مكتبة التمارين", d: "مكتبة مركزية بالصور والفيديوهات لتسهيل بناء الخطط وتوحيد المحتوى التدريبي." },
		{ icon: <Utensils size={18} className="text-blue-600" />, t: "مكتبة الوصفات", d: "وصفات غذائية مصنفة مع القيم الغذائية لدعم إعداد خطط تغذية متنوعة ودقيقة." },
		{ icon: <CreditCard size={18} className="text-blue-600" />, t: "الفواتير والمدفوعات", d: "إدارة الاشتراكات والباقات ومتابعة الحالة المالية للعملاء في واجهة موحدة." },
		{ icon: <BarChart3 size={18} className="text-blue-600" />, t: "التقارير الأسبوعية", d: "مراجعة تقارير العملاء وصور التقدم والقياسات مع إضافة ملاحظات المدرب." },
	];

	return (
		<LightSec id="s5" dir="rtl">
			<Wrap>
				<SectionHeader
					n="07" label="أدوات الإدارة"
					title="كل أدوات الإدارة"
					titleGrad="في مكان واحد"
					desc="واجهة الإدارة هي مركز التحكم الرئيسي — من تنظيم المستخدمين والخطط ومراجعة التقارير، إلى إدارة الجوانب المالية والتشغيلية."
				/>

				{/* Dashboard Card */}
				<div data-reveal className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-700 to-sky-700 p-6 shadow-2xl shadow-blue-800/30 sm:p-9">
					<div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.15)_1px,transparent_1px)] [background-size:22px_22px]" />
					<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-300 to-sky-300" />
					<div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />

					<div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center">
						<div className="min-w-0 flex-1">
							<div className="mb-1 font-cairo text-[10px] font-bold uppercase tracking-[3.5px] text-blue-300/60">Dashboard</div>
							<div className="mb-3 font-tajawal text-2xl font-black text-white sm:text-3xl">لوحة التحكم الرئيسية</div>
							<p className="max-w-xl font-cairo text-sm md:leading-7 text-blue-100/80">
								نظرة شاملة على أداء المنصة — عدد العملاء، النشاطات الأخيرة، التقارير التي تحتاج مراجعة، والحالات المعلقة — لمساعدة الإدارة على اتخاذ قرارات أسرع وأدق.
							</p>
						</div>
						<div className="flex flex-col gap-2 sm:min-w-52">
							{dashboardItems.map((item) => (
								<div key={item.t} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm transition-colors duration-200 hover:bg-white/15">
									<span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-blue-400/20 text-blue-300">{item.icon}</span>
									<span className="font-cairo text-[12px] font-semibold text-blue-100/90">{item.t}</span>
								</div>
							))}
						</div>
					</div>
				</div>
				{/* Main Cards */}
				<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
					{mainCards.map((c, i) => (
						<div
							key={c.t}
							data-reveal
							className={`d${i + 1} lift group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white p-5 shadow-lg shadow-blue-100 transition-shadow hover:shadow-xl hover:shadow-blue-200 sm:p-6`}
						>
							{/* Right accent bar */}
							<div className="absolute right-0 top-0 h-14 w-1 rounded-t-full bg-gradient-to-b from-blue-500 to-sky-500" />
							{/* Hover slide bar */}
							<div className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-r from-sky-400 to-blue-600 transition-transform duration-300 group-hover:scale-x-100" />


							{/* ── Mobile: icon + title inline / Desktop: stacked ── */}
							<div className="flex items-center gap-3 sm:block">
								<div className="mb-0 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100 transition-transform duration-200 group-hover:scale-105 sm:mb-4 sm:h-11 sm:w-11">
									{c.icon}
								</div>
								<div className="flex-1 font-cairo text-[13px] font-extrabold text-blue-900 sm:mb-2 sm:text-[14px]">
									{c.t}
								</div>
							</div>

							{/* Description */}
							<div className="mb-4 mt-2 font-cairo text-[12px] md:leading-7 text-slate-600 sm:mt-0">
								{c.d}
							</div>

							<Chip v="light">{c.b}</Chip>
						</div>
					))}
				</div>

				{/* Support Cards */}
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					{supportCards.map((c, i) => (
						<div
							key={c.t}
							data-reveal
							className={`d${i + 1} lift group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white p-4 shadow-md shadow-blue-100 transition-shadow hover:shadow-lg hover:shadow-blue-200 sm:p-5`}
						>
							{/* Right accent bar */}
							<div className="absolute right-0 top-0 h-10 w-1 rounded-t-full bg-gradient-to-b from-blue-500 to-sky-500" />
							{/* Hover slide bar */}
							<div className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-r from-sky-400 to-blue-600 transition-transform duration-300 group-hover:scale-x-100" />


							{/* ── Mobile: icon + title inline / Desktop: stacked ── */}
							<div className="flex items-center gap-2 sm:block">
								<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100 transition-transform duration-200 group-hover:scale-105 sm:mb-3 sm:h-10 sm:w-10">
									{c.icon}
								</div>
								<div className="flex-1 font-cairo text-[12px] font-extrabold text-blue-900 sm:mb-1.5 sm:text-[13px]">
									{c.t}
								</div>
							</div>

							{/* Description */}
							<div className="mt-1.5 font-cairo text-[10px] md: leading-6 text-slate-500 sm:mt-0 sm:text-[11px]">
								{c.d}
							</div>
						</div>
					))}
				</div>

			</Wrap>
		</LightSec>
	);
}

/* ══════════════════ §6 PLANS ══════════════════ */
function Plans() {
	const plansCards = [
		{
			icon: <Calendar size={32} className="text-blue-200" />,
			t: "خطط التمارين",
			d: "إنشاء برامج تدريبية متكاملة بطريقة منظمة — تحديد الأيام، تقسيم التمارين، المجموعات، التكرارات، والملاحظات الخاصة. مع إمكانية إعادة استخدام الخطط الجاهزة وتعديلها بسرعة.",
			tags: [
				{ icon: <Calendar size={11} />, t: "إنشاء وتنظيم الخطة" },
				{ icon: <Repeat size={11} />, t: "تكرار وتعديل سريع" },
				{ icon: <Link size={11} />, t: "إسناد مباشر للعميل" },
				{ icon: <Eye size={11} />, t: "معاينة تفصيلية" },
			],
			cardClass: "border border-blue-300/20 bg-blue-600/20",
			barClass: "bg-gradient-to-r from-blue-500 to-blue-300",
			tagClass: "border border-blue-300/30 bg-blue-500/10 text-blue-200",
			glowClass: "bg-blue-500/10",
			iconRingClass: "ring-blue-400/10",
		},
		{
			icon: <Utensils size={32} className="text-sky-200" />,
			t: "خطط التغذية",
			d: "بناء خطط غذائية مرنة تشمل الوجبات، السعرات، القيم الغذائية، المكملات، والبدائل لكل عميل — مع سهولة الإسناد والمتابعة من داخل النظام.",
			tags: [
				{ icon: <Utensils size={11} />, t: "وجبات ومكملات" },
				{ icon: <Repeat size={11} />, t: "بدائل غذائية" },
				{ icon: <Link size={11} />, t: "إسناد مباشر للعميل" },
				{ icon: <Target size={11} />, t: "احتياج وسعرات دقيقة" },
			],
			cardClass: "border border-sky-300/20 bg-sky-700/20",
			barClass: "bg-gradient-to-r from-sky-500 to-cyan-300",
			tagClass: "border border-sky-300/30 bg-sky-500/15 text-sky-200",
			glowClass: "bg-sky-500/10",
			iconRingClass: "ring-sky-400/10",
		},
	];

	return (
		<DarkSec id="s6" dir="rtl">
			<div className="orb pointer-events-none absolute -right-16 -top-16 h-56 w-96 rounded-full bg-blue-600/10 blur-3xl lg:h-[300px] lg:w-[500px]" />
			<Wrap>
				<SectionHeader
					n="08" label="البرامج والخطط"
					title="أدوات قوية"
					titleGrad="لبناء البرامج والخطط"
					desc="إعداد الخطط التدريبية والغذائية بشكل أكثر تنظيمًا ومرونة، مع تخصيص لكل عميل وإسناد ومتابعة من داخل نفس النظام."
					dark
				/>

				<div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
					{plansCards.map((c, i) => (
						<div key={c.t} data-reveal className={`d${i + 1} lift group relative overflow-hidden rounded-3xl p-6 sm:p-8 ${c.cardClass}`}>
							<div className={`absolute inset-x-0 top-0 h-0.5 ${c.barClass}`} />
							<div className={`pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-2xl ${c.glowClass}`} />
							<div className={`relative mb-5 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3 ring-4 transition-transform duration-200 group-hover:scale-105 ${c.iconRingClass}`}>
								{c.icon}
							</div>
							<div className="mb-3 font-tajawal text-2xl font-black text-white">{c.t}</div>
							<div className="mb-5 font-cairo text-sm md: leading-8 text-blue-100/75">{c.d}</div>
							<div className="flex flex-wrap gap-2">
								{c.tags.map((tag) => (
									<span key={tag.t} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-cairo text-[11px] font-bold transition-opacity hover:opacity-80 ${c.tagClass}`}>
										{tag.icon}{tag.t}
									</span>
								))}
							</div>
						</div>
					))}
				</div>

				{/* Coach note */}
				<div data-reveal className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/[0.07]">
					<div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
						<IconWrap size={48} dark><Dumbbell size={22} className="text-blue-300" /></IconWrap>
					</div>
					<div className="min-w-0">
						<div className="mb-1 font-cairo text-sm font-extrabold text-white">المدرب يصل إلى نفس أدوات الخطط حسب الصلاحيات</div>
						<div className="font-cairo text-xs md:leading-7 text-blue-100/65">
							يستطيع المدرب إنشاء الخطط وتعديلها وإسنادها لعملائه ضمن صلاحيات مناسبة، ليبقى تركيزه على جودة البرنامج والمتابعة دون تعقيد إداري.
						</div>
					</div>
				</div>
			</Wrap>
		</DarkSec>
	);
}

/* ══════════════════ §7 CLIENT EXPERIENCE ══════════════════ */
function ClientExperience() {
	const workoutTags = [
		{ icon: <Activity size={11} />, t: "تسجيل الأداء" },
		{ icon: <Timer size={11} />, t: "مؤقت ذكي" },
		{ icon: <Play size={11} />, t: "فيديوهات توضيحية" },
		{ icon: <Bell size={11} />, t: "تنبيهات مساعدة" },
	];

	const clientCards = [
		{
			icon: <Utensils size={18} className="text-blue-600" />,
			t: "تغذيتي",
			d: "عرض يومي واضح للخطة الغذائية — الوجبات، السعرات، القيم الغذائية، البدائل والمكملات.",
			b: "عرض يومي منظم",
		},
		{
			icon: <BarChart3 size={18} className="text-blue-600" />,
			t: "التقرير الأسبوعي",
			d: "إرسال القياسات وصور التقدم والملاحظات، مع إمكانية الرجوع لملاحظات المدرب.",
			b: "موثق ومنظم",
		},
		{
			icon: <Bell size={18} className="text-blue-600" />,
			t: "التذكيرات",
			d: "تذكيرات يومية ومتكررة للوجبات والتمارين والعادات المهمة للحفاظ على الالتزام.",
			b: "تلقائية + مخصصة",
		},
		{
			icon: <Settings size={18} className="text-blue-600" />,
			t: "الملف الشخصي",
			d: "إدارة البيانات الشخصية والقياسات وتفضيلات الإشعارات بسهولة من مكان واحد.",
			b: "سهل التعديل",
		},
	];

	return (
		<LightSec id="s7" dir="rtl">
			<Wrap>
				<SectionHeader
					n="09" label="تجربة العميل"
					title="تجربة شخصية"
					titleGrad="مصممة للالتزام والنتائج"
					desc="واجهة واحدة تجمع التمارين، التغذية، التقارير، التذكيرات، والتواصل مع المدرب — لمساعدة العميل على الالتزام ومتابعة تقدمه يوميًا."
				/>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
					{/* Hero dark card */}
					<div data-reveal className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-700 to-sky-700 p-6 shadow-2xl shadow-blue-800/30 sm:col-span-2 md:col-span-1 md:row-span-2 sm:p-8">
						<div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.15)_1px,transparent_1px)] [background-size:18px_18px]" />
						<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-300 to-sky-300" />
						<div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
						<div className="relative z-10 flex flex-1 flex-col">
							<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 ring-4 ring-blue-400/10 transition-transform duration-200 group-hover:scale-105">
								<Dumbbell size={28} className="text-blue-200" />
							</div>
							<div className="mb-3 font-tajawal text-2xl font-black text-white">تماريني</div>
							<div className="mb-6 flex-1 font-cairo text-sm md: leading-8 text-blue-100/80">
								خطة التمارين اليومية بشكل واضح — فيديوهات توضيحية، تسجيل الأوزان والتكرارات والمجموعات، ومؤقت لمتابعة الأداء أثناء التمرين.
							</div>
							<div className="flex flex-wrap gap-2">
								{workoutTags.map((tag) => (
									<span key={tag.t} className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 font-cairo text-[11px] font-bold text-blue-200 transition-opacity hover:opacity-80">
										{tag.icon}{tag.t}
									</span>
								))}
							</div>
						</div>
					</div>

					{clientCards.map((c, i) => (
						<div
							key={c.t}
							data-reveal
							className={`d${i + 1} lift group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-white p-5 shadow-md shadow-blue-100 transition-shadow hover:shadow-lg hover:shadow-blue-200`}
						>
							{/* Right accent bar */}
							<div className="absolute right-0 top-0 h-12 w-1 rounded-t-full bg-gradient-to-b from-blue-500 to-sky-500" />
							{/* Hover slide bar */}
							<div className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-r from-sky-400 to-blue-600 transition-transform duration-300 group-hover:scale-x-100" />


							{/* Mobile: icon + title inline / Desktop: stacked */}
							<div className="flex items-center gap-2 sm:block">
								<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100 transition-transform duration-200 group-hover:scale-105 sm:mb-3 sm:h-10 sm:w-10">
									{c.icon}
								</div>
								<div className="flex-1 font-cairo text-[12px] font-extrabold text-blue-900 sm:mb-1.5 sm:text-[13px]">
									{c.t}
								</div>
							</div>

							{/* Description */}
							<div className="mb-3 mt-1.5 font-cairo text-[12px] md:leading-7 text-slate-600 sm:mt-0">
								{c.d}
							</div>

							<Chip v="light">{c.b}</Chip>
						</div>
					))}
				</div>

				{/* Recipe Library */}
				<div
					data-reveal
					className="lift group relative mt-4 overflow-hidden rounded-2xl border border-blue-100/80 bg-white p-5 shadow-md shadow-blue-100 transition-shadow hover:shadow-lg hover:shadow-blue-200"
				>
					{/* Hover slide bar */}
					<div className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-r from-sky-400 to-blue-600 transition-transform duration-300 group-hover:scale-x-100" />
					{/* Right accent bar */}
					<div className="absolute right-0 top-0 h-12 w-1 rounded-t-full bg-gradient-to-b from-blue-500 to-sky-500" />

					{/* Number badge — top-left corner */}
					<div className="absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 font-tajawal text-[8px] font-black text-white ring-2 ring-blue-400/15">
						✦
					</div>

					<div className="flex flex-wrap items-center gap-4">
						{/* Icon */}
						<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100 transition-transform duration-200 group-hover:scale-105">
							<BookOpen size={20} className="text-blue-600" />
						</div>

						{/* Text */}
						<div className="min-w-0 flex-1">
							<div className="mb-1 font-cairo text-[14px] font-extrabold text-blue-900">
								مكتبة الوصفات
							</div>
							<div className="font-cairo text-[12px] md:leading-7 text-slate-600">
								وصفات غذائية منظمة تساعد العميل على اكتشاف خيارات تناسب خطته، مع عرض المكونات، طريقة التحضير، والقيم الغذائية.
							</div>
						</div>

						{/* Chip */}
						<Chip v="light" cls="flex-shrink-0 max-md:hidden  ">بحث + تصفية + تصنيف</Chip>
					</div>
				</div>
			</Wrap>
		</LightSec>
	);
}

/* ══════════════════ §8 SHARED TOOLS ══════════════════ */
function SharedTools() {
	const tools = [
		{
			icon: <MessageCircle size={22} className="text-white" />,
			t: "المحادثات المباشرة",
			d: "قناة تواصل داخلية تجمع العميل والمدرب والإدارة — رسائل نصية وصور وملفات لتسريع المتابعة دون أدوات خارجية.",
			roles: "Admin · Coach · Client",
			dark: true,
			cardClass: "border border-blue-200/20 bg-gradient-to-br from-blue-950 via-blue-800 to-blue-700",
			barClass: "bg-gradient-to-r from-blue-500 to-blue-300",
			tagClass: "border border-blue-300/30 bg-blue-500/10 text-blue-200",
			glowClass: "bg-blue-500/10",
			ringClass: "ring-blue-400/10",
		},
		{
			icon: <Calendar size={22} className="text-white" />,
			t: "لوحة الإنتاجية",
			d: "واجهة موحدة للتقويم والمهام ولوحات العمل — لتنظيم المواعيد والأعمال اليومية بشكل أوضح وأكثر كفاءة.",
			roles: "Admin · Coach · Client",
			dark: true,
			cardClass: "border border-sky-200/20 bg-gradient-to-br from-sky-950 via-sky-800 to-cyan-700",
			barClass: "bg-gradient-to-r from-sky-500 to-cyan-300",
			tagClass: "border border-sky-300/30 bg-sky-500/15 text-sky-200",
			glowClass: "bg-sky-500/10",
			ringClass: "ring-sky-400/10",
		},
		{
			icon: <Calculator size={22} className="text-blue-300" />,
			t: "حاسبة السعرات",
			d: "حساب الاحتياج اليومي من السعرات والعناصر الغذائية، مع دعم حساب قيم الوجبات لاختيارات أكثر دقة.",
			roles: "Admin · Coach · Client",
			dark: false,
		},
		{
			icon: <Wallet size={22} className="text-blue-300" />,
			t: "إدارة الميزانية",
			d: "متابعة الإيرادات والمصروفات والالتزامات المالية بعرض واضح لمساعدة المستخدم على اتخاذ قرارات أفضل.",
			roles: "Admin · Client",
			dark: false,
		},
	];

	return (
		<DarkSec id="s8" dir="rtl">
			<div className="orb pointer-events-none absolute -bottom-20 -left-20 h-64 w-80 rounded-full bg-blue-600/10 blur-3xl lg:h-[400px] lg:w-[500px]" />
			<Wrap>
				<SectionHeader
					n="10" label="أدوات مشتركة"
					title="أدوات قوية"
					titleGrad="تخدم أكثر من دور"
					desc="أدوات متاحة لأكثر من دور حسب الصلاحيات — تمثل جزءًا أساسيًا من تجربة العمل اليومية وتساعد على ربط التواصل والتنظيم داخل نفس النظام."
					dark
				/>

				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
					{tools.map((c, i) =>
						c.dark ? (
							<div key={c.t} data-reveal className={`d${i + 1} lift group relative overflow-hidden rounded-2xl p-5 sm:p-6 ${c.cardClass}`}>
								<div className={`absolute inset-x-0 top-0 h-0.5 ${c.barClass}`} />
								<div className={`pointer-events-none absolute -left-8 -top-8 h-36 w-36 rounded-full blur-2xl ${c.glowClass}`} />
								<div className="relative z-10 flex items-start gap-4">
									<div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 ring-4 transition-transform duration-200 group-hover:scale-105 ${c.ringClass}`}>
										{c.icon}
									</div>
									<div className="min-w-0 flex-1">
										<div className="mb-1.5 font-tajawal text-lg font-black text-white">{c.t}</div>
										<div className="mb-3 font-cairo text-[12px] md:leading-7 text-blue-100/75">{c.d}</div>
										<span className={`inline-flex items-center rounded-full px-3.5 py-1.5 font-cairo text-[11px] font-bold transition-opacity hover:opacity-80 ${c.tagClass}`}>
											{c.roles}
										</span>
									</div>
								</div>
							</div>
						) : (
							<div key={c.t} data-reveal className={`d${i + 1} lift group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/[0.08] sm:p-6`}>
								<div className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-r from-sky-400 to-blue-500 transition-transform duration-300 group-hover:scale-x-100" />
								<div className="flex items-start gap-4">
									<div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
										<IconWrap size={44} dark>{c.icon}</IconWrap>
									</div>
									<div className="min-w-0 flex-1">
										<div className="mb-1.5 font-tajawal text-lg font-black text-white">{c.t}</div>
										<div className="mb-3 font-cairo text-[12px] md:leading-7 text-blue-100/70">{c.d}</div>
										<Chip v="blue">{c.roles}</Chip>
									</div>
								</div>
							</div>
						)
					)}
				</div>
			</Wrap>
		</DarkSec>
	);
}

/* ══════════════════ §10 BENEFITS ══════════════════ */
function Benefits() {
	const benefitCards = [
		{
			icon: <Target size={22} className="text-blue-700" />,
			t: "دقة أعلى في تقديم الخدمة",
			d: "كل عميل يحصل على متابعة منظمة وخطط واضحة، مع قرارات مبنية على بيانات وتقارير موثقة.",
		},
		{
			icon: <Star size={22} className="text-blue-700" />,
			t: "تجربة عميل احترافية",
			d: "واجهة واضحة وسهلة تعكس جودة الخدمة وتمنح العميل تجربة منظمة من أول تسجيل حتى المتابعة.",
		},
		{
			icon: <MessageCircle size={22} className="text-blue-700" />,
			t: "تواصل أسرع وأوضح",
			d: "المحادثات والتقارير والملاحظات داخل النظام نفسه — يحسّن سرعة الرد ويقلل ضياع المعلومات.",
		},
		{
			icon: <Globe size={22} className="text-blue-700" />,
			t: "جاهز للنمو والتوسع",
			d: "كلما زاد عدد العملاء، يبقى العمل منظمًا داخل نفس المنصة دون تعقيد إضافي.",
			light: true,
		},
	];

	return (
		<LightSec id="s10" dir="rtl">
			<Wrap>
				<SectionHeader
					n="11" label="لماذا هذه المنصة؟"
					title="فوائد حقيقية،"
					titleGrad="ونتائج ملموسة"
					desc="قيمة المنصة تظهر في تنظيم العمل، رفع جودة الخدمة، تحسين تجربة العميل، وتسهيل المتابعة اليومية داخل نظام واحد متكامل."
				/>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
					{/* Hero card */}
					<div data-reveal className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-700 to-sky-700 p-7 shadow-2xl shadow-blue-800/30 sm:col-span-2 md:col-span-1 md:row-span-2 sm:p-9">
						<div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.15)_1px,transparent_1px)] [background-size:20px_20px]" />
						<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-300 to-sky-300" />
						<div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
						<div className="relative z-10 flex flex-1 flex-col">
							<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 ring-4 ring-blue-400/10 transition-transform duration-200 group-hover:scale-105">
								<Zap size={30} className="text-blue-200" />
							</div>
							<div className="mb-4 font-tajawal text-2xl font-black text-white">توفير الوقت والجهد</div>
							<div className="mb-7 flex-1 font-cairo text-sm md: leading-8 text-blue-100/80">
								بدلاً من إدارة العملاء والخطط عبر واتساب وملفات متفرقة، تجمع المنصة كل خطوات العمل في مكان واحد — لاختصار الوقت وتقليل الأخطاء وإنجاز المزيد بكفاءة أعلى.
							</div>
							<div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-5 py-2.5 transition-colors hover:bg-white/20">
								<TrendingUp size={13} className="text-blue-300" />
								<span className="font-cairo text-sm font-bold text-blue-200">إنتاجية أعلى وتنظيم أفضل</span>
							</div>
						</div>
					</div>

					{benefitCards.map((c, i) => (
						<div key={c.t} data-reveal className={[
							`d${i + 1} lift group relative overflow-hidden rounded-2xl border p-5 transition-shadow sm:p-6`,
							c.light
								? "border-sky-300/20 bg-gradient-to-br from-sky-50 to-blue-100 shadow-md shadow-sky-200/60 hover:shadow-lg hover:shadow-sky-300/50"
								: "border-blue-100 bg-white shadow-md shadow-blue-100 hover:shadow-lg hover:shadow-blue-200",
						].join(" ")}>
							<div className="absolute right-0 top-0 h-12 w-1 rounded-t-full bg-gradient-to-b from-blue-500 to-sky-500" />
							<div className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-gradient-to-r from-sky-400 to-blue-600 transition-transform duration-300 group-hover:scale-x-100" />
							<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100 transition-transform duration-200 group-hover:scale-105">{c.icon}</div>
							<div className="mb-2 font-cairo text-[14px] font-extrabold text-blue-900">{c.t}</div>
							<div className={["font-cairo text-sm md: leading-7", c.light ? "text-sky-700" : "text-slate-500"].join(" ")}>{c.d}</div>
						</div>
					))}
				</div>
			</Wrap>
		</LightSec>
	);
}

/* ══════════════════ §11 CLOSING ══════════════════ */
function Closing() {
	const stats = [
		{ n: "٣", l: "أدوار رئيسية", sub: "Admin / Coach / Client", icon: <Crown size={18} className="text-blue-400" /> },
		{ n: "٣٠+", l: "واجهة متخصصة", sub: "لتنظيم وإدارة العمل", icon: <Layers size={18} className="text-sky-400" /> },
		{ n: "١٠٠٪", l: "منصة متكاملة", sub: "للتدريب والتغذية والمتابعة", icon: <Shield size={18} className="text-blue-400" /> },
	];

	return (
		<section id="s11" dir="rtl" className="noise-bg relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,#0d2068_0%,#050e2e_55%,#020817_100%)]" />
			<div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(59,130,246,.08)_1px,transparent_1px)] [background-size:40px_40px]" />
			<div className="float-anim orb pointer-events-none absolute -right-36 -top-24 h-72 w-96 rounded-full bg-blue-600/15 blur-3xl opacity-70 lg:h-[500px] lg:w-[700px]" />
			<div className="orb pointer-events-none absolute -bottom-20 -left-20 h-64 w-80 rounded-full bg-sky-500/10 blur-3xl opacity-60 lg:h-[400px] lg:w-[500px]" />
			<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

			<Wrap>
				<div className="relative z-10 text-center">
					<div data-reveal className="mb-6 flex justify-center">
						<Chip v="white"><Sparkles size={12} className="text-blue-400" />الخلاصة</Chip>
					</div>

					<h2 data-reveal className="mb-5 font-tajawal text-[clamp(34px,7vw,76px)] font-black md: leading-tight tracking-tight text-white">
						منصة واحدة
						<br />
						<span className="grad-text">لتنظيم العمل وتقديم خدمة احترافية</span>
					</h2>

					<p data-reveal className="mx-auto mb-10 max-w-2xl font-cairo text-sm md: leading-8 text-slate-300/80 sm:text-base">
						نظام متكامل يساعدك على إدارة العملاء، إعداد الخطط، متابعة التقدم، مراجعة التقارير، وتنظيم التواصل والجوانب المالية داخل تجربة واحدة واضحة وسهلة الاستخدام.
					</p>

					{/* Stats */}
					<div data-reveal className="mb-10 flex flex-wrap items-stretch justify-center gap-6 md:gap-0">
						{stats.map((s, i) => (
							<div key={s.l} className="flex items-center">
								{i > 0 && <div className="mx-6 my-2 hidden w-px self-stretch bg-blue-200/15 md:block xl:mx-10" />}
								<div className="group min-w-32 rounded-2xl px-4 py-3 text-center transition-colors hover:bg-white/5">
									<div className="mb-2 flex justify-center transition-transform duration-200 group-hover:scale-110">{s.icon}</div>
									<div className="mb-1.5 bg-gradient-to-r from-blue-300 to-sky-400 bg-clip-text font-tajawal text-5xl font-black md: leading-none text-transparent sm:text-6xl">
										{s.n}
									</div>
									<div className="font-cairo text-[12px] font-semibold text-blue-200/75">{s.l}</div>
									<div className="mt-1 font-cairo text-[11px] text-blue-100/45">{s.sub}</div>
								</div>
							</div>
						))}
					</div>
 
				</div>
			</Wrap>
		</section>
	);
}

/* ══════════════════ ROOT ══════════════════ */
export default function PresentationPage() {
	useReveal();
	return (
		<div dir='rtl' className='presentation'>
			<style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
			<Hero />
			<Overview />
			<AppScreensSlider />
			<DesktopScreensSlider />
			<Roles />
			<Workflow />
			<AdminFeatures />
			<Plans  />
			<ClientExperience />
			<SharedTools />
			<Benefits />
			<Closing />
		</div>
	);
}